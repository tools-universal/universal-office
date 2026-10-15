import { FontResolver, variantOf } from '@universal-office/fonts';
import {
  XlsxPackage, readWorkbook, readSharedStrings, readWorksheet, readStyles, colorContext, applyTint,
  refToRowCol, rowColToRef, formatValue, builtinFormatCode, updateWorksheetXml,
  parseChart, paintChart, excelMdw, excelRowPx, colWidthToPx, defaultColPx, rowPtToPx, ppemOf,
  type ChartModel, type Theme,
  type Workbook, type Worksheet, type Cell, type SharedString, type Styles, type Font, type Fill,
  type Border, type PaneInfo, type CondFormat, type ColDef, type ColorStop, type FormatResult,
  type Comment, type DrawingChart, type Hyperlink, type RichRun, type RunProps,
} from '@universal/sheet-core';
import {
  bisectLE, pxToIndex, indexScreenPos, boundaryAt, pxToColWidthChars, pxToRowHeightPt,
  layoutRichLines, PATTERN_MASKS, type RichSeg,
} from './grid-layout.js';

/**
 * <universal-sheet> — webcomponent que renderiza uma pasta de trabalho .xlsx
 * como uma grade (grid) em canvas, fiél à planilha de referência.
 *
 * Unidades (APROXIMAÇÕES iniciais — a calibrar contra o oráculo numérico
 * Range.ColumnWidth/RowHeight na Camada B, vide ARCHITECTURE.md):
 *   - largura de coluna default: 64px (~8.43 chars da fonte Normal)
 *   - altura de linha default: 20px (15pt × 96/72)
 *   - fonte Normal: "Aptos Narrow 11" (extração real é trabalho futuro,
 *     como no Write; por ora cai no fallback do sistema).
 */

const HEADER_W = 46;
const HEADER_H = 22;
const DEFAULT_COL_W = 64;
const DEFAULT_ROW_H = 20;
const MAX_ROW_DEFAULT = 200;
const MAX_COL_DEFAULT = 52;

const COL_HEADER_BG = '#f6f6f6';
const ROW_HEADER_BG = '#f6f6f6';
const CORNER_BG = '#ececec';
const GRID_LINE = '#e2e2e2';
const HEADER_LINE = '#d3d3d3';
const TEXT = '#1f1f1f';
/** Cor de acento padrão (verde Office) usada como fallback quando o tema não
 *  define `--u-color-primary`. A cor real vem do tema escolhido (M3 tonal). */
const DEFAULT_ACCENT = '#006d35';

/** Estilo resolvido de uma célula (já indexando fonts/fills/borders). */
interface ResolvedStyle {
  font: Font | undefined;
  fill: Fill | undefined;
  border: Border | undefined;
  numFmtId: number;
  align: string | undefined;
  valign: string | undefined;
  wrap: boolean;
}

/** Fonte efetiva de um run rico (props do run resolvidas sobre a da célula). */
interface EffRunFont {
  css: string;
  sizePx: number;
  color: string;
  underline: boolean;
  strike: boolean;
}

export interface SheetView {
  worksheet: Worksheet;
  /** Caminho da parte no pacote (xl/worksheets/sheetN.xml) — p/ persistir edições. */
  path: string;
  /** Mapa col(1-based) → largura em px (chars→px já convertidos). */
  colWidths: Map<number, number>;
  /** Mapa row(1-based) → altura em px. */
  rowHeights: Map<number, number>;
  hiddenCols: Set<number>;
  hiddenRows: Set<number>;
  merges: Map<string, string>; // top-left ref → range
  pane?: PaneInfo;
  condFormats: CondFormat[];
  showGridLines: boolean;
  maxRow: number;
  maxCol: number;
  /** "col,row" -> comment (lookup O(1) por celula no paint). */
  commentAt: Map<string, Comment>;
  /** Charts ancorados via drawings1.xml — pintados por cima do grid. */
  charts: DrawingChart[];
  /** "col,row" -> hyperlink (cursor pointer + clique navega). */
  hyperlinkAt: Map<string, Hyperlink>;
  /** Colunas congeladas à esquerda (pane state=frozen). 0 = sem freeze. */
  frozenCols: number;
  /** Linhas congeladas no topo. 0 = sem freeze. */
  frozenRows: number;
  /** Largura default de coluna em px (sheetFormatPr ou constante). */
  defaultColW: number;
  /** Altura default de linha em px (sheetFormatPr ou constante). */
  defaultRowH: number;
  /**
   * Decoração de TABELA (ListObject) por célula ("col,row"): fill de header/
   * banda, cor/negrito do texto do header e seta de autofiltro. Os estilos
   * built-in não vêm no pacote — replicamos a família Medium por accent.
   */
  tableDeco: Map<string, TableDeco>;
  /** Ranges (1-based, inclusivos) com validação de LISTA — dropdown na seleção. */
  listValRanges: { c1: number; r1: number; c2: number; r2: number }[];
}

/** Decoração derivada do estilo da tabela para UMA célula. */
interface TableDeco {
  fill?: string;
  fontColor?: string;
  bold?: boolean;
  /** Desenha a seta de autofiltro (célula de header). */
  arrow?: boolean;
}

/**
 * Accent do estilo built-in `TableStyle{Light,Medium,Dark}N`: N=1 → cinza,
 * N=2..7 → accent1..6 (ciclo). O app de referência não grava os estilos
 * built-in no pacote — só o nome.
 */
function tableStyleAccent(name: string | undefined, accents: string[]): string {
  const fallback = accents[0] ?? '#4472C4';
  const m = /(\d+)$/.exec(name ?? '');
  if (!m) return fallback;
  const n = parseInt(m[1]!, 10);
  if (n <= 1) return '#808080';
  return accents[(n - 2) % 6] ?? fallback;
}


/**
 * Substituto do Excel para família que não existe (nem no SO, nem embarcada):
 * a fonte padrão do Excel atual (Normal = Aptos Narrow) — a mesma ordem da
 * pilha fixa de antes do resolvedor único.
 */
const SHEET_FALLBACKS = ['Aptos Narrow'];

/** Fallbacks da fonte da célula: o nome gravado de uma fonte do TEMA (ex.: 宋体
 *  numa pasta chinesa) vem antes, para a escrita que a fonte latina não cobre. */
function fallbacksOf(font: Font | undefined): string[] {
  return font?.altName ? [font.altName, ...SHEET_FALLBACKS] : SHEET_FALLBACKS;
}

export class UniversalSheetElement extends HTMLElement {
  private host = this.attachShadow({ mode: 'open' });
  private canvas = document.createElement('canvas');
  private status = document.createElement('div');
  /**
   * Editor inline da célula. Um `<input>` flutuante sobre a célula ativa que
   * substitui o desenho do texto enquanto a edição está em curso. É CRIADO sob
   * demanda em `beginEdit()` e REMOVIDO em `commitEdit()`/`cancelEdit()`.
   */
  private editor: HTMLInputElement | null = null;
  private editing: { col: number; row: number } | null = null;
  /** Wrapper que hospeda canvas + status + editor inline. */
  private wrap = document.createElement('div');

  private workbook: Workbook | null = null;
  private pkg: XlsxPackage | null = null;
  private shared: SharedString[] = [];
  private styles: Styles = { numFmts: new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  private views: SheetView[] = [];
  private sheetIndex = 0;

  private zoom = 1;
  private scrollX = 0;
  private scrollY = 0;
  private sel = { col: 1, row: 1 };

  /** Posição x acumulada por borda de coluna (0..maxCol+1), coords locais. */
  private xs: Float64Array = new Float64Array(0);
  private ys: Float64Array = new Float64Array(0);
  /** Cache de valores numéricos por "col,row" para formatação condicional. */
  private condNumMap = new Map<string, number>();
  /** condNumMap já construído para a aba ativa (invalidado em troca/edição). */
  private condNumReady = false;
  /** Cache do índice célula-por-ref por aba (invalidado em load/edição). */
  private rowMapCache = new Map<number, Map<number, Map<number, Cell>>>();
  /** Tooltip de comentário (nota amarela) exibido no hover. */
  private commentTip: HTMLDivElement | null = null;
  private commentTipKey = '';
  /** Modo captura: suprime seleção/overlays para pixel-compare com o app de referência. */
  capture = false;

  constructor() {
    super();
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'cell';
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    this.status.style.cssText =
      'position:absolute;left:0;top:0;background:#fff;border-bottom:1px solid #d3d3d3;' +
      'border-right:1px solid #d3d3d3;height:' + HEADER_H + 'px;width:' + HEADER_W + 'px;' +
      'display:flex;align-items:center;justify-content:center;font:600 11px/1 Segoe UI,Arial;' +
      'color:#1f1f1f;z-index:2;pointer-events:none;';
    this.wrap.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
    this.wrap.appendChild(this.status);
    this.wrap.appendChild(this.canvas);
    this.host.appendChild(this.wrap);

    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  connectedCallback(): void {
    this.unsubscribeFonts ??= this.fontResolver.onChange(() => this.paint());
    new ResizeObserver(() => { this.resize(); this.paint(); }).observe(this.canvas);
    this.resize();
    this.paint();
    // repinta quando as @font-face (Aptos Narrow) terminarem de carregar
    (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      .then(() => this.paint()).catch(() => {});
  }

  private get view(): SheetView | null {
    return this.views[this.sheetIndex] ?? null;
  }

  /** Carrega bytes .xlsx e monta as views de planilha. */
  loadXlsx(bytes: Uint8Array): void {
    const pkg = XlsxPackage.load(bytes);
    this.pkg = pkg;
    this.workbook = readWorkbook(pkg);
    // contexto de cores compartilhado: theme1.xml + indexedColors (1 leitura)
    const cx = colorContext(pkg);
    this.shared = readSharedStrings(pkg, cx);
    this.styles = readStyles(pkg, cx);
    // paleta default de charts = accents 1..6 do tema (índices 4..9)
    this.chartPalette = cx.theme.colors.slice(4, 10);
    this.chartTheme = cx.theme;
    // fontes do SO usadas pelos estilos, sob demanda (lógica do Universal Write)
    void this.ensureSheetFonts();

    // geometria do grid pela fonte Normal (estilo 0), com as tabelas MEDIDAS no
    // Excel (sheet-core/grid-metrics): largura do dígito máximo e linha padrão
    const normal = this.styles.fonts[0];
    this.normalFont = { name: normal?.name ?? 'Calibri', size: normal?.size ?? 11, bold: !!normal?.bold };
    this.mdw = excelMdw(this.normalFont.name, this.normalFont.size) ?? this.canvasMdw(this.normalFont);
    this.normalRowPx = excelRowPx(this.normalFont.name, this.normalFont.size, this.normalFont.bold);

    this.views = [];
    for (const ref of this.workbook.sheets) {
      if (!ref.target) continue;
      const ws = readWorksheet(pkg, ref.target, cx);
      const colWidths = new Map<number, number>();
      const rowHeights = new Map<number, number>();
      const hiddenCols = new Set<number>();
      const hiddenRows = new Set<number>();
      let maxRow = 0;
      let maxCol = 0;
      // larguras de coluna: <cols> → px pela MDW da fonte Normal. O app de
      // referência aplica `width` mesmo SEM customWidth (customWidth só marca
      // "ajuste manual" p/ o autofit); só ignoramos <col> que não traz width algum.
      for (const cd of ws.cols ?? []) {
        for (let c = cd.min; c <= cd.max; c++) {
          if (cd.hidden) hiddenCols.add(c);
          if (cd.width !== undefined) colWidths.set(c, colWidthToPx(cd.width, this.mdw));
        }
      }
      for (const row of ws.rows) {
        if (row.hidden) hiddenRows.add(row.r);
        if (row.r > maxRow) maxRow = row.r;
        for (const c of row.cells) {
          const { col } = refToRowCol(c.ref);
          if (col > maxCol) maxCol = col;
        }
      }
      const merges = ws.mergedAreas ?? new Map<string, string>();
      const commentAt = new Map<string, Comment>();
      for (const c of ws.comments ?? []) {
        const { col, row } = refToRowCol(c.ref);
        commentAt.set(`${col},${row}`, c);
      }
      // hyperlinks: expande ref (célula ou range) → lookup O(1) por célula
      const hyperlinkAt = new Map<string, Hyperlink>();
      for (const hl of ws.hyperlinks ?? []) {
        try {
          const [a, b] = hl.ref.split(':');
          const s = refToRowCol(a!);
          const e = b ? refToRowCol(b) : s;
          for (let rr = s.row; rr <= e.row; rr++) {
            for (let cc = s.col; cc <= e.col; cc++) hyperlinkAt.set(`${cc},${rr}`, hl);
          }
        } catch { /* ref inválida: ignora o link */ }
      }
      // panes congelados: xSplit/ySplit em CONTAGEM de colunas/linhas quando
      // state=frozen|frozenSplit (em split "solto" são vigésimos de ponto — ignorado)
      const frozen = ws.pane && (ws.pane.state === 'frozen' || ws.pane.state === 'frozenSplit');
      const frozenCols = frozen ? Math.max(0, Math.floor(ws.pane!.xSplit)) : 0;
      const frozenRows = frozen ? Math.max(0, Math.floor(ws.pane!.ySplit)) : 0;
      // defaults do grid (<sheetFormatPr>), como o Excel (medido): sem o
      // elemento a linha padrão é 15 pt; com customHeight vale defaultRowHeight;
      // senão a linha da fonte Normal (defaultRowHeight é ignorado)
      const sfp = ws.sheetFormatPr;
      const defaultColW = defaultColPx(this.mdw, sfp?.defaultColWidth, sfp?.baseColWidth);
      const sheetCustomH = !!sfp?.customHeight && sfp.defaultRowHeight !== undefined;
      const defaultRowH = sfp?.zeroHeight
        ? 0
        : !sfp
          ? DEFAULT_ROW_H
          : sheetCustomH ? rowPtToPx(sfp.defaultRowHeight!) : this.normalRowPx;
      // expande maxRow/maxCol p/ caber CHARTS ancorados ate to.col/to.row
      let extMaxRow = Math.max(maxRow, 30);
      let extMaxCol = Math.max(maxCol, 26);
      for (const ch of ws.charts ?? []) {
        if (ch.anchor.to.col + 1 > extMaxCol) extMaxCol = ch.anchor.to.col + 1;
        if (ch.anchor.to.row + 1 > extMaxRow) extMaxRow = ch.anchor.to.row + 1;
      }
      // decoração de tabelas (ListObjects): header + bandas + setas de filtro
      const tableDeco = new Map<string, TableDeco>();
      for (const t of ws.tables ?? []) {
        const [tlRef, brRef] = t.ref.split(':');
        if (!tlRef || !brRef) continue;
        const tl = refToRowCol(tlRef);
        const br = refToRowCol(brRef);
        // banda = accent com tint HSL 0.8 do app de referência (L' = L·0.2 + 0.8)
        // — medido no oráculo: accent1 #156082 → banda #C0E6F5
        const accent = tableStyleAccent(t.styleName, this.chartPalette);
        const stripe = applyTint(accent, 0.8);
        for (let row = tl.row; row <= br.row; row++) {
          const isHeader = t.headerRow && row === tl.row;
          const dataIdx = row - tl.row - (t.headerRow ? 1 : 0);
          for (let col = tl.col; col <= br.col; col++) {
            const deco: TableDeco = {};
            if (isHeader) {
              deco.fill = accent;
              deco.fontColor = '#FFFFFF';
              deco.bold = true;
              if (t.autoFilter) deco.arrow = true;
            } else if (t.stripes && dataIdx >= 0 && dataIdx % 2 === 0) {
              deco.fill = stripe;
            }
            if (deco.fill || deco.arrow) tableDeco.set(`${col},${row}`, deco);
          }
        }
      }
      // ranges de validação de lista (dropdown ao selecionar)
      const listValRanges: { c1: number; r1: number; c2: number; r2: number }[] = [];
      for (const sq of ws.listValidations ?? []) {
        const [a, b] = sq.split(':');
        if (!a) continue;
        const tl = refToRowCol(a);
        const br = b ? refToRowCol(b) : tl;
        listValRanges.push({ c1: tl.col, r1: tl.row, c2: br.col, r2: br.row });
      }
      this.views.push({
        worksheet: ws, path: ref.target, colWidths, rowHeights, hiddenCols, hiddenRows, merges,
        pane: ws.pane, condFormats: ws.condFormats ?? [],
        showGridLines: ws.showGridLines !== false,
        maxRow: extMaxRow,
        maxCol: extMaxCol,
        commentAt,
        charts: ws.charts ?? [],
        hyperlinkAt,
        frozenCols,
        frozenRows,
        defaultColW,
        defaultRowH,
        tableDeco,
        listValRanges,
      });
      this.fitRowHeights(this.views[this.views.length - 1]!);
    }
    // caches de paint pertencem ao workbook anterior
    this.rowMapCache.clear();
    this.condNumReady = false;
    this.condNumMap.clear();
    // abre na aba ativa (activeTab); o `Math.min(0, …)` anterior fixava sempre 0
    this.sheetIndex = Math.max(0, Math.min(this.workbook.activeTab ?? 0, this.views.length - 1));
    this.scrollX = 0;
    this.scrollY = 0;
    this.sel = { col: 1, row: 1 };
    this.recalcGrid();
    this.emitSelection();
    this.paint();
  }

  /** Fonte Normal da pasta (estilo 0) — base das larguras e da linha padrão. */
  private normalFont: { name: string; size: number; bold: boolean } = { name: 'Calibri', size: 11, bold: false };
  /** Largura do dígito máximo (px) da fonte Normal, como o Excel a mede. */
  private mdw = 7;
  /** Altura (px) da linha auto-ajustada só com a fonte Normal. */
  private normalRowPx = 20;
  /** Contexto 2D só para medir texto (auto-ajuste de linhas com quebra). */
  private measureCtx: CanvasRenderingContext2D | null = null;

  /** MDW estimada pelo canvas para fonte Normal não medida no Excel. */
  private canvasMdw(f: { name: string; size: number; bold: boolean }): number {
    const ctx = this.measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!ctx) return 7;
    ctx.font = `${f.bold ? '700 ' : '400 '}${ppemOf(f.size)}px ${this.fontResolver.cssStack(f.name, SHEET_FALLBACKS, variantOf(f.bold, false))}`;
    let w = 0;
    for (const d of '0123456789') w = Math.max(w, ctx.measureText(d).width);
    return Math.max(1, Math.round(w));
  }

  /**
   * Alturas das linhas presentes no XML, como o Excel as calcula AO ABRIR
   * (medido): customHeight → ht; senão o Excel refaz o auto-ajuste e ignora o
   * `ht` gravado — a maior linha entre a fonte Normal e a fonte de cada célula
   * (vazia com estilo também conta; runs de texto rico; texto com quebra =
   * linhas × altura da fonte). Com <sheetFormatPr customHeight> e nenhuma linha
   * com `ht` solto, as linhas sem `ht` ficam na altura padrão.
   */
  private fitRowHeights(v: SheetView): void {
    const ws = v.worksheet;
    const sfp = ws.sheetFormatPr;
    const sheetCustom = !!sfp?.customHeight && sfp.defaultRowHeight !== undefined;
    const looseHt = sheetCustom && ws.rows.some((r) => r.height !== undefined && !r.customHeight);
    const fonts = this.styles.fonts;
    const xfs = this.styles.cellXfs;
    const nf = this.normalFont;
    // células cobertas por mescla não entram no auto-ajuste de quebra
    const mergedCells = new Set<string>();
    for (const [tl, range] of v.merges) {
      const [a, b] = range.split(':');
      if (!a || !b) continue;
      const s = refToRowCol(a), e = refToRowCol(b);
      if (s.row === e.row && s.col === e.col) continue;
      for (let r = s.row; r <= e.row; r++) for (let c = s.col; c <= e.col; c++) mergedCells.add(`${c},${r}`);
      void tl;
    }
    // sobrescrito/subscrito somam ao auto-ajuste (medido: Arial 10 +2/+4,
    // Calibri 11 +3/+4, Arial 20 +4/+6 px) — aproximação pelo ppem
    const pxOf = (name: string | undefined, size: number | undefined, bold: boolean | undefined, va?: string): number => {
      const sz = size ?? nf.size;
      const base = excelRowPx(name ?? nf.name, sz, !!bold);
      if (va === 'superscript') return base + Math.round(ppemOf(sz) * 0.17);
      if (va === 'subscript') return base + Math.round(ppemOf(sz) * 0.25);
      return base;
    };
    // células VAZIAS da linha também entram (medido): a de coluna com estilo
    // usa a fonte do estilo da coluna; as demais, a fonte Normal
    const colStyled: { min: number; max: number; px: number }[] = [];
    let normalCols = false;
    let next = 1;
    for (const cd of [...(ws.cols ?? [])].sort((a, b) => a.min - b.min)) {
      if (cd.min > next) normalCols = true;
      if (cd.style === undefined) normalCols = true;
      else {
        const f = fonts[xfs[cd.style]?.fontId ?? 0];
        colStyled.push({ min: cd.min, max: cd.max, px: pxOf(f?.name, f?.size, f?.bold, f?.vertAlign) });
      }
      next = Math.max(next, cd.max + 1);
    }
    if (next <= 16384) normalCols = true;
    for (const row of ws.rows) {
      if (row.customHeight && row.height !== undefined) { v.rowHeights.set(row.r, rowPtToPx(row.height)); continue; }
      if (sheetCustom && !looseHt && row.height === undefined) { v.rowHeights.set(row.r, v.defaultRowH); continue; }
      let h = 0;
      if (row.style !== undefined) {
        // estilo de linha: vale para todas as células vazias da linha
        const f = fonts[xfs[row.style]?.fontId ?? 0];
        h = pxOf(f?.name, f?.size, f?.bold, f?.vertAlign);
      } else {
        if (normalCols) h = this.normalRowPx;
        if (colStyled.length) {
          const filled = new Set(row.cells.map((c) => refToRowCol(c.ref).col));
          for (const cs of colStyled) {
            // faixa inteira preenchida por células próprias não conta
            if (cs.max - cs.min < 64) {
              let all = true;
              for (let c = cs.min; c <= cs.max && all; c++) if (!filled.has(c)) all = false;
              if (all) continue;
            }
            h = Math.max(h, cs.px);
          }
        }
      }
      for (const c of row.cells) {
        const xf = xfs[c.style ?? row.style ?? 0];
        const f = fonts[xf?.fontId ?? 0];
        const lineH = pxOf(f?.name, f?.size, f?.bold, f?.vertAlign);
        h = Math.max(h, lineH);
        const runs = this.cellRuns(c);
        if (runs) for (const r of runs) h = Math.max(h, pxOf(r.props?.font ?? f?.name, r.props?.size ?? f?.size, r.props?.bold ?? f?.bold, r.props?.vertAlign ?? f?.vertAlign));
        if (xf?.wrapText) {
          const { col } = refToRowCol(c.ref);
          if (mergedCells.has(`${col},${row.r}`)) continue;
          const text = this.displayText(c);
          if (!text) continue;
          const lines = this.countWrapLines(text, f, (v.colWidths.get(col) ?? v.defaultColW) - 6);
          h = Math.max(h, lines * lineH);
        }
      }
      // bordas grossas sinalizadas na linha: +1 px cada (medido)
      if (row.thickTop) h++;
      if (row.thickBot) h++;
      v.rowHeights.set(row.r, h);
    }
  }

  /** Linhas de um texto com quebra na largura útil (px), na fonte da célula. */
  private countWrapLines(text: string, font: Font | undefined, maxW: number): number {
    const ctx = this.measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!ctx) return text.split('\n').length;
    const sizePx = (font?.size ?? this.normalFont.size) * 96 / 72;
    ctx.font = `${font?.italic ? 'italic ' : ''}${font?.bold ? '700 ' : '400 '}${sizePx}px ${this.fontResolver.cssStack(font?.name ?? this.normalFont.name, fallbacksOf(font), variantOf(!!font?.bold, !!font?.italic))}`;
    return Math.max(1, this.wrapText(ctx, text, Math.max(1, maxW)).length);
  }

  /** Views com edições pendentes (célula/resize) a persistir no save. */
  private dirtySheets = new Set<number>();

  /**
   * Reemite o pacote como bytes .xlsx. Round-trip lossless nas partes não
   * tocadas; worksheets com edições têm SÓ <sheetData>/<cols> regenerados
   * (cirurgia no XML original — ver sheet-core/serialize.ts).
   */
  saveXlsx(): Uint8Array {
    if (!this.pkg) throw new Error('Nenhuma pasta de trabalho carregada');
    if (this.editing) this.commitEdit();
    for (const i of this.dirtySheets) {
      const view = this.views[i];
      if (!view) continue;
      const original = this.pkg.getPartText(view.path);
      if (original === undefined) continue;
      this.pkg.setPartText(view.path, updateWorksheetXml(original, view.worksheet));
    }
    return this.pkg.save();
  }

  /** Retângulo (CSS px, zoom 1) da área de dados do range usado — para captura. */
  getUsedRangeRect(): { x: number; y: number; w: number; h: number } | null {
    const v = this.view;
    if (!v) return null;
    let lr = 0, lc = 0;
    for (const r of v.worksheet.rows) {
      if (r.r > lr) lr = r.r;
      for (const c of r.cells) { const col = refToRowCol(c.ref).col; if (col > lc) lc = col; }
    }
    if (lr === 0) return null;
    return { x: HEADER_W, y: HEADER_H, w: this.xs[lc] ?? 0, h: this.ys[lr] ?? 0 };
  }

  /** DEBUG: texto exibido por célula da aba atual (para auditoria de paridade). */
  debugCellDisplays(): { ref: string; display: string }[] {
    const v = this.view;
    if (!v) return [];
    const out: { ref: string; display: string }[] = [];
    for (const r of v.worksheet.rows) for (const c of r.cells) out.push({ ref: c.ref, display: this.displayText(c) });
    return out;
  }

  /** DEBUG: bordas (px a 100%) das colunas 0..nCols e linhas 0..nRows da aba
   *  `index` — para comparar a geometria com as larguras/alturas do Excel. */
  debugGridEdges(index: number, nCols: number, nRows: number): { xs: number[]; ys: number[] } {
    const v = this.views[index];
    if (!v) return { xs: [], ys: [] };
    const keep = { sheet: this.sheetIndex, zoom: this.zoom };
    this.sheetIndex = index;
    this.zoom = 1;
    v.maxCol = Math.max(v.maxCol, nCols);
    v.maxRow = Math.max(v.maxRow, nRows);
    this.recalcGrid();
    const out = { xs: Array.from(this.xs.subarray(0, nCols + 1)), ys: Array.from(this.ys.subarray(0, nRows + 1)) };
    this.sheetIndex = keep.sheet;
    this.zoom = keep.zoom;
    this.recalcGrid();
    return out;
  }

  /** Nomes das planilhas (abas). */
  getSheetNames(): string[] {
    return this.workbook?.sheets.map((s) => s.name) ?? [];
  }

  /** Seleciona a aba pelo índice. */
  selectSheet(i: number): void {
    if (i < 0 || i >= this.views.length || i === this.sheetIndex) return;
    // commita edição em curso ANTES de trocar de aba (Excel persiste)
    if (this.editing) this.commitEdit();
    this.hideCommentTip();
    this.sheetIndex = i;
    this.condNumReady = false;
    this.condNumMap.clear();
    this.scrollX = 0;
    this.scrollY = 0;
    this.sel = { col: 1, row: 1 };
    this.recalcGrid();
    this.emitSelection();
    this.paint();
  }

  /** Define o zoom (0.4–3) e re_renderiza. */
  setZoom(z: number): void {
    this.zoom = Math.min(3, Math.max(0.4, z));
    this.recalcGrid();
    this.paint();
    this.dispatchEvent(new CustomEvent('us-zoom', { detail: { zoom: this.zoom } }));
  }

  /** Move a seleção para uma referência A1 (usada pela barra de fórmulas).
   *  Se o alvo cair dentro de uma mescla, snap para a origem (active = origem). */
  goToRef(ref: string): void {
    const rc = refToRowCol(ref);
    this.sel = this.snapToMergeOrigin(rc.col, rc.row);
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  }

  /** Evento disparado quando a seleção muda: { ref, display, formula }. */
  onSelectionChange: ((ref: string, display: string, formula: string) => void) | null = null;

  private emitSelection(): void {
    const ref = rowColToRef(this.sel.col, this.sel.row);
    const cell = this.findCell(this.sel.col, this.sel.row);
    this.onSelectionChange?.(ref, this.displayText(cell), cell?.formula ?? '');
    this.dispatchEvent(new CustomEvent('us-selection', {
      detail: { ref, display: this.displayText(cell), formula: cell?.formula ?? '' },
    }));
  }

  private findCell(col: number, row: number): Cell | undefined {
    const v = this.view;
    if (!v) return undefined;
    const r = v.worksheet.rows.find((rr) => rr.r === row);
    return r?.cells.find((c) => refToRowCol(c.ref).col === col);
  }

  // ---- Cor de acento (vem do tema) ----

  /**
   * Resolve a cor de acento atual lendo a CSS var `--u-color-primary`
   * (definida pelo tema gerado em demo/theme.ts). Trata `light-dark(a,b)`
   * escolhendo conforme o `color-scheme` resolvido. Fallback ao verde Office.
   */
  private accent(): string {
    try {
      const cs = getComputedStyle(this);
      const raw = cs.getPropertyValue('--u-color-primary').trim();
      if (!raw) return DEFAULT_ACCENT;
      const ld = raw.match(/^light-dark\(\s*([^,]+),\s*([^)]+)\)$/i);
      if (ld) {
        const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
        return (isDark ? ld[2] : ld[1])!.trim();
      }
      return raw;
    } catch { return DEFAULT_ACCENT; }
  }

  // ---- Mistura de cores (para tints derivados do acento) ----

  /** Mistura `a` com `b` por fator t (0..1): t=0 → a, t=1 → b. */
  private mix(a: string, b: string, t: number): string {
    const pa = hexRGB(a), pb = hexRGB(b);
    return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
  }
  /** Cor rgba a partir de hex/rgb + alfa. */
  private rgba(c: string, a: number): string { const p = hexRGB(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }

  // ---- Mescla: span da seleção (uma mescla = um span; senão 1×1) ----

  /** Range efetivo da seleção: se a célula ativa cai numa mescla, devolve a
   *  mescla inteira; senão a célula sozinha. (Range de múltiplas células ainda
   *  não é suportado — listado nas pendências.) */
  private selectionSpan(): { firstCol: number; lastCol: number; firstRow: number; lastRow: number } {
    const { col, row } = this.sel;
    const m = this.mergeAt(col, row);
    if (m) return { firstCol: m.firstCol, lastCol: m.lastCol, firstRow: m.firstRow, lastRow: m.lastRow };
    return { firstCol: col, lastCol: col, firstRow: row, lastRow: row };
  }

  /** Origem da mescla que cobre (col,row), se houver — senão (col,row). */
  private snapToMergeOrigin(col: number, row: number): { col: number; row: number } {
    const m = this.mergeAt(col, row);
    if (!m) return { col, row };
    return { col: m.firstCol, row: m.firstRow };
  }

  // ---- Layout helpers ----

  private colWidth(col: number): number {
    if (this.view?.hiddenCols.has(col)) return 0;
    return (this.view?.colWidths.get(col) ?? this.view?.defaultColW ?? DEFAULT_COL_W) * this.zoom;
  }
  private rowHeight(row: number): number {
    if (this.view?.hiddenRows.has(row)) return 0;
    return (this.view?.rowHeights.get(row) ?? this.view?.defaultRowH ?? DEFAULT_ROW_H) * this.zoom;
  }

  // ---- Panes congelados: geometria ----

  /** Largura (px, zoom aplicado) da faixa de colunas congeladas. */
  private frozenW(): number {
    const v = this.view;
    return v && v.frozenCols > 0 ? (this.xs[v.frozenCols] ?? 0) : 0;
  }
  /** Altura (px) da faixa de linhas congeladas. */
  private frozenH(): number {
    const v = this.view;
    return v && v.frozenRows > 0 ? (this.ys[v.frozenRows] ?? 0) : 0;
  }
  /** X na tela (coords de conteúdo) da borda esquerda da coluna. */
  private colX(col: number): number {
    return indexScreenPos(this.xs, col, this.view?.frozenCols ?? 0, this.scrollX);
  }
  /** Y na tela (coords de conteúdo) da borda superior da linha. */
  private rowY(row: number): number {
    return indexScreenPos(this.ys, row, this.view?.frozenRows ?? 0, this.scrollY);
  }

  private recalcGrid(): void {
    const v = this.view;
    const maxCol = v?.maxCol ?? MAX_COL_DEFAULT;
    const maxRow = v?.maxRow ?? MAX_ROW_DEFAULT;
    this.xs = new Float64Array(maxCol + 2);
    let acc = 0;
    for (let i = 0; i <= maxCol; i++) { this.xs[i] = acc; acc += this.colWidth(i + 1); }
    this.xs[maxCol + 1] = acc;
    this.ys = new Float64Array(maxRow + 2);
    acc = 0;
    for (let j = 0; j <= maxRow; j++) { this.ys[j] = acc; acc += this.rowHeight(j + 1); }
    this.ys[maxRow + 1] = acc;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  private maxScrollX(): number {
    const total = this.xs[this.xs.length - 1] ?? 0;
    return Math.max(0, total - (this.canvas.clientWidth - HEADER_W));
  }
  private maxScrollY(): number {
    const total = this.ys[this.ys.length - 1] ?? 0;
    return Math.max(0, total - (this.canvas.clientHeight - HEADER_H));
  }

  /**
   * Hit-test px→célula em COORDS DE CONTEÚDO (px após o cabeçalho, sem scroll
   * aplicado pelo chamador) — considera os quadrantes congelados: a faixa
   * congelada mapeia direto; o resto soma o scroll (ver grid-layout.pxToIndex).
   */
  private cellAt(contentX: number, contentY: number): { col: number; row: number } | null {
    const v = this.view;
    if (!v) return null;
    const col = pxToIndex(this.xs, contentX, v.frozenCols, this.scrollX, v.maxCol);
    const row = pxToIndex(this.ys, contentY, v.frozenRows, this.scrollY, v.maxRow);
    if (col === null || row === null) return null;
    return { col, row };
  }

  // ---- Eventos ----

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.shiftKey || e.ctrlKey) {
      this.scrollX = Math.min(this.maxScrollX(), Math.max(0, this.scrollX + e.deltaY));
    } else if (e.deltaX) {
      this.scrollX = Math.min(this.maxScrollX(), Math.max(0, this.scrollX + e.deltaX));
      this.scrollY = Math.min(this.maxScrollY(), Math.max(0, this.scrollY + e.deltaY));
    } else {
      this.scrollY = Math.min(this.maxScrollY(), Math.max(0, this.scrollY + e.deltaY));
    }
    this.repositionEditor();
    this.paint();
  };

  // ---- Redimensionamento de coluna/linha pelo cabeçalho ----

  private resizing: {
    kind: 'col' | 'row'; index: number; startClient: number; origPx: number;
  } | null = null;

  /** Borda de cabeçalho sob (px,py)? Zona de ±3px na borda final. */
  private resizeHitAt(px: number, py: number): { kind: 'col' | 'row'; index: number } | null {
    const v = this.view;
    if (!v) return null;
    const tol = 3;
    if (py < HEADER_H && px >= HEADER_W) {
      const col = boundaryAt(this.xs, px - HEADER_W, v.frozenCols, this.scrollX, v.maxCol, tol);
      if (col !== null) return { kind: 'col', index: col };
    } else if (px < HEADER_W && py >= HEADER_H) {
      const row = boundaryAt(this.ys, py - HEADER_H, v.frozenRows, this.scrollY, v.maxRow, tol);
      if (row !== null) return { kind: 'row', index: row };
    }
    return null;
  }

  /** Aplica o tamanho (px de tela sem zoom) na VIEW; modelo é commitado no mouseup. */
  private applyResizePreview(kind: 'col' | 'row', index: number, sizePx: number): void {
    const v = this.view!;
    const px = Math.max(0, Math.round(sizePx));
    if (kind === 'col') {
      v.colWidths.set(index, px);
      if (px > 0 && v.hiddenCols.has(index)) v.hiddenCols.delete(index);
    } else {
      v.rowHeights.set(index, px);
      if (px > 0 && v.hiddenRows.has(index)) v.hiddenRows.delete(index);
    }
    this.recalcGrid();
    this.repositionEditor();
    this.paint();
  }

  /** Persiste o resize no MODELO (ws.cols/Row.height) e marca a sheet suja. */
  private commitResize(kind: 'col' | 'row', index: number): void {
    const v = this.view!;
    const ws = v.worksheet;
    if (kind === 'col') {
      const px = v.colWidths.get(index) ?? v.defaultColW;
      const width = pxToColWidthChars(px, this.mdw);
      const cols = ws.cols ?? (ws.cols = []);
      // recorta qualquer <col> que cubra o índice e insere a definição pontual
      for (let i = cols.length - 1; i >= 0; i--) {
        const cd = cols[i]!;
        if (cd.max < index || cd.min > index) continue;
        const parts: ColDef[] = [];
        if (cd.min < index) parts.push({ ...cd, max: index - 1 });
        if (cd.max > index) parts.push({ ...cd, min: index + 1 });
        cols.splice(i, 1, ...parts);
      }
      cols.push({ min: index, max: index, width, customWidth: true, hidden: px === 0 || undefined });
      cols.sort((a, b) => a.min - b.min);
    } else {
      const px = v.rowHeights.get(index) ?? v.defaultRowH;
      let r = ws.rows.find((rr) => rr.r === index);
      if (!r) {
        r = { r: index, cells: [] };
        let i = ws.rows.findIndex((rr) => rr.r > index);
        if (i < 0) i = ws.rows.length;
        ws.rows.splice(i, 0, r);
      }
      r.height = pxToRowHeightPt(px);
      r.customHeight = true;
      r.hidden = px === 0 || undefined;
    }
    this.dirtySheets.add(this.sheetIndex);
  }

  /** Autofit de coluna (duplo clique na borda): maior texto formatado + folga. */
  private autofitCol(index: number): void {
    const v = this.view!;
    const ctx = this.canvas.getContext('2d')!;
    let best = 0;
    let n = 0;
    for (const row of v.worksheet.rows) {
      if (n++ > 2000) break; // limite de varredura (planilhas enormes)
      for (const c of row.cells) {
        if (refToRowCol(c.ref).col !== index) continue;
        const txt = this.displayText(c);
        if (!txt) continue;
        const font = this.resolveStyle(c).font;
        const size = (font?.size ?? 11) * 96 / 72; // px sem zoom
        ctx.font = `${font?.italic ? 'italic ' : ''}${font?.bold ? '700 ' : '400 '}${size}px ${this.fontResolver.cssStack(font?.name ?? 'Aptos Narrow', fallbacksOf(font), variantOf(!!font?.bold, !!font?.italic))}`;
        best = Math.max(best, ctx.measureText(txt).width);
      }
    }
    if (best <= 0) return;
    this.applyResizePreview('col', index, best + 6); // padding ~3px de cada lado
    this.commitResize('col', index);
  }

  private onResizeDragMove = (e: MouseEvent): void => {
    const rs = this.resizing;
    if (!rs) return;
    const cur = rs.kind === 'col' ? e.clientX : e.clientY;
    const delta = (cur - rs.startClient) / this.zoom;
    this.applyResizePreview(rs.kind, rs.index, rs.origPx + delta);
  };

  private onResizeDragEnd = (): void => {
    const rs = this.resizing;
    if (!rs) return;
    this.resizing = null;
    window.removeEventListener('mousemove', this.onResizeDragMove);
    window.removeEventListener('mouseup', this.onResizeDragEnd);
    this.commitResize(rs.kind, rs.index);
  };

  private onMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    this.canvas.focus();
    // borda de cabeçalho → inicia drag de redimensionamento
    const rh = this.resizeHitAt(px, py);
    if (rh) {
      e.preventDefault();
      const origPx = (rh.kind === 'col' ? this.colWidth(rh.index) : this.rowHeight(rh.index)) / this.zoom;
      this.resizing = {
        kind: rh.kind, index: rh.index,
        startClient: rh.kind === 'col' ? e.clientX : e.clientY,
        origPx,
      };
      window.addEventListener('mousemove', this.onResizeDragMove);
      window.addEventListener('mouseup', this.onResizeDragEnd);
      return;
    }
    if (px < HEADER_W || py < HEADER_H) return;
    const hit = this.cellAt(px - HEADER_W, py - HEADER_H);
    if (hit) {
      // clique dentro de uma mescla → célula ativa = origem da mescla
      this.sel = this.snapToMergeOrigin(hit.col, hit.row);
      this.emitSelection();
      this.paint();
    }
  };

  /** Clique simples segue hyperlink (como o app de referência). */
  private onClick = (e: MouseEvent): void => {
    if (e.detail > 1) return; // 2º clique de um duplo → deixa o dblclick agir
    const v = this.view;
    if (!v || v.hyperlinkAt.size === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px < HEADER_W || py < HEADER_H) return;
    const hit = this.cellAt(px - HEADER_W, py - HEADER_H);
    if (!hit) return;
    // hyperlink cobre toda a área da mescla, não só a célula-âncora
    const o = this.snapToMergeOrigin(hit.col, hit.row);
    const hl = v.hyperlinkAt.get(`${o.col},${o.row}`);
    if (hl) this.followHyperlink(hl);
  };

  /** Cursor: resize nas bordas de cabeçalho, pointer sobre hyperlink, cell no resto. */
  private onMouseMove = (e: MouseEvent): void => {
    if (this.resizing) return; // durante o drag o cursor fica a cargo do SO
    const v = this.view;
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let cursor = 'cell';
    let overComment: string | null = null;
    const rh = v ? this.resizeHitAt(px, py) : null;
    if (rh) {
      cursor = rh.kind === 'col' ? 'col-resize' : 'row-resize';
    } else if (v && px >= HEADER_W && py >= HEADER_H) {
      const hit = this.cellAt(px - HEADER_W, py - HEADER_H);
      if (hit) {
        const o = this.snapToMergeOrigin(hit.col, hit.row);
        if (v.hyperlinkAt.size > 0 && v.hyperlinkAt.has(`${o.col},${o.row}`)) cursor = 'pointer';
        if (v.commentAt.size > 0 && v.commentAt.has(`${o.col},${o.row}`)) overComment = `${o.col},${o.row}`;
      }
    }
    if (this.canvas.style.cursor !== cursor) this.canvas.style.cursor = cursor;
    // tooltip de comentário (nota amarela do app de referência) no hover
    if (overComment) this.showCommentTip(overComment, px, py);
    else this.hideCommentTip();
  };

  /** Resolvedor de fontes ÚNICO dos apps (shared/fonts): host, Local Font
   *  Access, instaladas pelo nome, substitutas abertas, padrão. */
  private readonly fontResolver = FontResolver.shared();
  private unsubscribeFonts: (() => void) | null = null;

  disconnectedCallback(): void {
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
  }

  /** Resolve já as fontes usadas pelos estilos do workbook (o aviso de
   *  onChange repinta quando chegarem). */
  private async ensureSheetFonts(): Promise<void> {
    const names = (this.styles?.fonts ?? []).map((f) => f?.name).filter((n): n is string => !!n);
    await this.fontResolver.resolve(['Aptos Narrow', ...names]);
  }

  /** Nota flutuante do comentário: autor em negrito + texto, junto ao cursor. */
  private showCommentTip(key: string, px: number, py: number): void {
    const c = this.view?.commentAt.get(key);
    if (!c) { this.hideCommentTip(); return; }
    if (!this.commentTip) {
      this.commentTip = document.createElement('div');
      this.commentTip.style.cssText =
        'position:absolute;z-index:30;max-width:280px;padding:6px 8px;' +
        'background:#FFFFE1;border:1px solid #A0A0A0;box-shadow:2px 2px 5px rgba(0,0,0,.3);' +
        "font:12px 'Segoe UI', Tahoma, sans-serif;color:#1f1f1f;pointer-events:none;white-space:pre-wrap;";
      this.wrap.appendChild(this.commentTip);
    }
    if (this.commentTipKey !== key) {
      this.commentTip.replaceChildren();
      if (c.author) {
        const b = document.createElement('b');
        b.textContent = c.author + ':';
        this.commentTip.appendChild(b);
        this.commentTip.appendChild(document.createElement('br'));
      }
      this.commentTip.appendChild(document.createTextNode(c.text));
      this.commentTipKey = key;
    }
    this.commentTip.style.left = `${px + 14}px`;
    this.commentTip.style.top = `${py + 16}px`;
    this.commentTip.style.display = 'block';
  }

  private hideCommentTip(): void {
    if (this.commentTip) { this.commentTip.style.display = 'none'; this.commentTipKey = ''; }
  }

  /**
   * Segue um hyperlink: externo → window.open; interno → navega para
   * "Aba!Ref" (location), trocando de planilha quando necessário.
   */
  private followHyperlink(hl: Hyperlink): void {
    if (hl.target) {
      window.open(hl.target, '_blank', 'noopener');
      return;
    }
    if (!hl.location) return;
    const m = /^(?:'([^']+)'|([^!]+))!(.+)$/.exec(hl.location);
    const sheetName = m ? (m[1] ?? m[2] ?? '') : '';
    const refPart = m ? (m[3] ?? 'A1') : hl.location;
    const ref = (refPart.split(':')[0] ?? 'A1').replace(/\$/g, '');
    if (sheetName) {
      const idx = this.workbook?.sheets.findIndex((s) => s.name === sheetName) ?? -1;
      if (idx >= 0) this.selectSheet(idx);
    }
    try { this.goToRef(ref); } catch { /* ref inválida no location */ }
  }

  private onDblClick = (e: MouseEvent): void => {
    // duplo clique na borda do cabeçalho de coluna = autofit (como o Excel)
    const rect = this.canvas.getBoundingClientRect();
    const rh = this.resizeHitAt(e.clientX - rect.left, e.clientY - rect.top);
    if (rh) {
      if (rh.kind === 'col') this.autofitCol(rh.index);
      return;
    }
    // Excel-style: duplo clique sobre a célula ativa entra em modo edição com
    // o conteúdo atual carregado no input (cursor no fim, sem seleção).
    this.beginEdit(this.sel.col, this.sel.row, undefined, true);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const v = this.view;
    if (!v) return;

    // ── teclas de edição (somente quando NÃO estamos em modo edit) ──
    if (e.key === 'F2') {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, undefined, true);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, undefined, true);
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.setCellValue(this.sel.col, this.sel.row, '');
      this.emitSelection();
      this.paint();
      return;
    }
    // tipagem direta (1 char imprimível): inicia edição substituindo o conteúdo
    // sem modificadores Ctrl/Alt/Meta.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, e.key, false);
      return;
    }

    // ponto de partida: como uma mescla, navegamos a partir da BORDA da mescla
    // (saímos para a vizinha real, sem reentrar em célula coberta).
    const span = this.selectionSpan();
    let col = this.sel.col, row = this.sel.row;
    switch (e.key) {
      case 'ArrowLeft':  col = Math.max(1, span.firstCol - 1); row = span.firstRow; break;
      case 'ArrowRight': col = Math.min(v.maxCol, span.lastCol + 1); row = span.firstRow; break;
      case 'ArrowUp':    row = Math.max(1, span.firstRow - 1); col = span.firstCol; break;
      case 'ArrowDown':  row = Math.min(v.maxRow, span.lastRow + 1); col = span.firstCol; break;
      case 'Home':       col = 1; break;
      case 'End':        col = v.maxCol; break;
      case 'PageDown':   row = Math.min(v.maxRow, row + 10); break;
      case 'PageUp':     row = Math.max(1, row - 10); break;
      default: return;
    }
    e.preventDefault();
    // se aterrissamos dentro de outra mescla, snap p/ origem (active = origem)
    this.sel = this.snapToMergeOrigin(col, row);
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  };

  // ───────────────────────── EDIÇÃO DE CÉLULA ─────────────────────────

  /**
   * Entra em modo edição numa célula. Cria um `<input>` overlay posicionado
   * sobre a célula com a fonte/altura corretas. Comportamentos:
   *   - `initialText` definido → input começa COM esse texto (typing-into-cell).
   *   - `initialText` undefined + `keepCurrent` → carrega o texto atual.
   *   - `initialText` undefined + `!keepCurrent` → input vazio.
   * Enter/Tab commita, Escape cancela, Blur commita.
   */
  beginEdit(col: number, row: number, initialText?: string, keepCurrent = false): void {
    if (!this.view) return;
    // se já estava editando outra célula, commita a anterior
    if (this.editing) this.commitEdit();
    const origin = this.snapToMergeOrigin(col, row);
    this.sel = origin;
    this.ensureVisible();
    this.paint();
    this.editing = origin;

    // texto inicial
    let text: string;
    if (initialText !== undefined) text = initialText;
    else if (keepCurrent) {
      const cell = this.findCell(origin.col, origin.row);
      // se for fórmula, edita a fórmula; senão o display
      text = cell?.formula ? '=' + cell.formula : this.displayText(cell);
    } else text = '';

    // posição em coords do canvas (CSS px relativas ao wrap)
    const merge = this.mergeAt(origin.col, origin.row);
    const firstCol = merge ? merge.firstCol : origin.col;
    const lastCol = merge ? merge.lastCol : origin.col;
    const firstRow = merge ? merge.firstRow : origin.row;
    const lastRow = merge ? merge.lastRow : origin.row;
    const left = HEADER_W + this.colX(firstCol);
    const top = HEADER_H + this.rowY(firstRow);
    const w = (this.xs[lastCol] ?? 0) - (this.xs[firstCol - 1] ?? 0);
    const h = (this.ys[lastRow] ?? 0) - (this.ys[firstRow - 1] ?? 0);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = text;
    input.style.cssText =
      `position:absolute;left:${left}px;top:${top}px;` +
      `width:${Math.max(w, 60)}px;height:${Math.max(h, 18)}px;` +
      `padding:0 3px;margin:0;border:2px solid #1f6f4f;outline:none;` +
      `background:#ffffff;color:#1f1f1f;` +
      `font:${11 * this.zoom}px 'Aptos Narrow', Segoe UI, Arial, sans-serif;` +
      `box-shadow:0 1px 4px rgba(0,0,0,.15);z-index:5;`;
    this.wrap.appendChild(input);
    this.editor = input;
    input.focus();
    if (keepCurrent && initialText === undefined) {
      // F2/double-click: cursor no fim, sem seleção (Excel-style)
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (initialText !== undefined && initialText.length > 0) {
      // typing-into-cell: cursor no fim (texto já foi substituído)
      input.setSelectionRange(input.value.length, input.value.length);
    } else input.select();

    let suppressBlur = false;
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEdit();
        // Enter no Excel desce uma linha
        if (this.view && this.sel.row < this.view.maxRow) {
          this.sel = this.snapToMergeOrigin(this.sel.col, this.sel.row + 1);
          this.ensureVisible(); this.emitSelection(); this.paint();
        }
        this.canvas.focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        suppressBlur = true;
        this.cancelEdit();
        this.canvas.focus();
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEdit();
        // Tab avança coluna
        const dir = ev.shiftKey ? -1 : 1;
        const next = Math.max(1, Math.min(this.view!.maxCol, this.sel.col + dir));
        this.sel = this.snapToMergeOrigin(next, this.sel.row);
        this.ensureVisible(); this.emitSelection(); this.paint();
        this.canvas.focus();
      }
    });
    input.addEventListener('blur', () => {
      if (suppressBlur || !this.editing) return;
      this.commitEdit();
    });
  }

  /** Commita o conteúdo do editor para o modelo (worksheet.rows). */
  commitEdit(): void {
    if (!this.editor || !this.editing) return;
    const text = this.editor.value;
    const { col, row } = this.editing;
    this.editor.remove();
    this.editor = null;
    this.editing = null;
    this.setCellValue(col, row, text);
    this.emitSelection();
    this.paint();
  }

  /** Descarta a edição em andamento sem alterar o modelo. */
  cancelEdit(): void {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editing = null;
    this.paint();
  }

  /**
   * Escreve `text` na célula `(col,row)` do modelo. Detecta automaticamente:
   *   - `""` → remove a célula (mesma semântica do Delete do Excel).
   *   - `"=…"` → fórmula (Cell.formula = …, value = '' temporariamente).
   *   - número puro → tipo "n" com `value` numérico.
   *   - resto → `inlineString` (mais simples para round-trip futuro do que
   *     mutar `sharedStrings.xml` — o app de referência aceita inlineStr).
   * Reflete no `maxRow/maxCol` da view para o paint cobrir novas células.
   */
  setCellValue(col: number, row: number, text: string): void {
    const v = this.view;
    if (!v) return;
    const ws = v.worksheet;
    const ref = rowColToRef(col, row);

    // encontra/cria linha
    let r = ws.rows.find((rr) => rr.r === row);
    if (!r) {
      r = { r: row, cells: [] };
      // mantém ordem por número de linha (binary insertion poderia, mas N pequeno)
      let i = ws.rows.findIndex((rr) => rr.r > row);
      if (i < 0) i = ws.rows.length;
      ws.rows.splice(i, 0, r);
    }

    // encontra/remove/cria célula
    const ci = r.cells.findIndex((c) => refToRowCol(c.ref).col === col);
    if (text === '') {
      if (ci >= 0) {
        r.cells.splice(ci, 1);
        this.dirtySheets.add(this.sheetIndex);
        this.rowMapCache.delete(this.sheetIndex);
        this.condNumReady = false;
      }
      this.dispatchEvent(new CustomEvent('us-edit', { detail: { ref, text: '' } }));
      return;
    }
    this.dirtySheets.add(this.sheetIndex);
    // invalida caches de paint da aba (índice de células + cond. format)
    this.rowMapCache.delete(this.sheetIndex);
    this.condNumReady = false;

    const cell: Cell = ci >= 0 ? r.cells[ci]! : { ref };
    // limpa campos antes de re-aplicar
    cell.formula = undefined;
    cell.inlineString = undefined;
    cell.value = undefined;
    cell.type = undefined;

    if (text.startsWith('=')) {
      cell.formula = text.slice(1);
      cell.type = 'str';
      cell.value = ''; // até que uma engine de fórmula compute
    } else {
      // tenta número (respeitando vírgula como decimal no pt-BR)
      const normalized = text.replace(',', '.');
      const n = Number(normalized);
      if (text.trim() !== '' && !Number.isNaN(n) && /^-?\d+([.,]\d+)?$/.test(text.trim())) {
        cell.type = 'n';
        cell.value = String(n);
      } else {
        cell.type = 'inlineStr';
        cell.inlineString = { text };
      }
    }

    if (ci < 0) {
      // ordena por coluna
      let i = r.cells.findIndex((c) => refToRowCol(c.ref).col > col);
      if (i < 0) i = r.cells.length;
      r.cells.splice(i, 0, cell);
    }

    // expande maxRow/maxCol se necessário
    if (col > v.maxCol) { v.maxCol = col; this.recalcGrid(); }
    if (row > v.maxRow) { v.maxRow = row; this.recalcGrid(); }
    this.dispatchEvent(new CustomEvent('us-edit', { detail: { ref, text } }));
  }

  /** Disponível externamente (barra de fórmulas): commita o input externo. */
  setActiveCellText(text: string): void {
    this.setCellValue(this.sel.col, this.sel.row, text);
    this.emitSelection();
    this.paint();
  }

  /** Reposiciona o editor (chamado em scroll/zoom). Sem editor em curso: noop. */
  private repositionEditor(): void {
    if (!this.editor || !this.editing) return;
    const merge = this.mergeAt(this.editing.col, this.editing.row);
    const firstCol = merge ? merge.firstCol : this.editing.col;
    const lastCol = merge ? merge.lastCol : this.editing.col;
    const firstRow = merge ? merge.firstRow : this.editing.row;
    const lastRow = merge ? merge.lastRow : this.editing.row;
    const left = HEADER_W + this.colX(firstCol);
    const top = HEADER_H + this.rowY(firstRow);
    const w = (this.xs[lastCol] ?? 0) - (this.xs[firstCol - 1] ?? 0);
    const h = (this.ys[lastRow] ?? 0) - (this.ys[firstRow - 1] ?? 0);
    this.editor.style.left = `${left}px`;
    this.editor.style.top = `${top}px`;
    this.editor.style.width = `${Math.max(w, 60)}px`;
    this.editor.style.height = `${Math.max(h, 18)}px`;
  }

  private ensureVisible(): void {
    const v = this.view;
    if (!v) return;
    const { col, row } = this.sel;
    const vw = this.canvas.clientWidth - HEADER_W;
    const vh = this.canvas.clientHeight - HEADER_H;
    const fw = this.frozenW();
    const fh = this.frozenH();
    // células congeladas estão sempre visíveis; as demais rolam a janela
    // [frozen..viewport] do quadrante principal
    if (col > v.frozenCols) {
      const left = this.xs[col - 1] ?? 0;
      const right = this.xs[col] ?? 0;
      if (left - this.scrollX < fw) this.scrollX = left - fw;
      else if (right - this.scrollX > vw) this.scrollX = right - vw;
    }
    if (row > v.frozenRows) {
      const top = this.ys[row - 1] ?? 0;
      const bottom = this.ys[row] ?? 0;
      if (top - this.scrollY < fh) this.scrollY = top - fh;
      else if (bottom - this.scrollY > vh) this.scrollY = bottom - vh;
    }
    this.scrollX = Math.max(0, this.scrollX);
    this.scrollY = Math.max(0, this.scrollY);
  }

  // ---- Renderização ----

  private paint(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const v = this.view;
    if (!v) {
      ctx.fillStyle = '#888';
      ctx.font = '14px Segoe UI, Arial';
      ctx.fillText('Nenhum .xlsx carregado', 20, 30);
      return;
    }

    this.status.textContent = rowColToRef(this.sel.col, this.sel.row);

    const vw = W - HEADER_W;
    const vh = H - HEADER_H;
    const fc = v.frozenCols;
    const fr = v.frozenRows;
    const fw = this.frozenW();
    const fh = this.frozenH();

    const rowMap = this.paintCaches(v);

    ctx.save();
    // área de dados transladada para baixo do/direita do cabeçalho
    ctx.translate(HEADER_W, HEADER_H);

    // 4 quadrantes: principal (scroll XY), topo (só X), esquerda (só Y), canto (fixo).
    // O principal vem primeiro; os congelados por cima (cobrem transbordos).
    this.paintRegion(ctx, rowMap, fw, fh, vw - fw, vh - fh, fc + 1, v.maxCol, fr + 1, v.maxRow, this.scrollX, this.scrollY);
    if (fr > 0) this.paintRegion(ctx, rowMap, fw, 0, vw - fw, fh, fc + 1, v.maxCol, 1, fr, this.scrollX, 0);
    if (fc > 0) this.paintRegion(ctx, rowMap, 0, fh, fw, vh - fh, 1, fc, fr + 1, v.maxRow, 0, this.scrollY);
    if (fc > 0 && fr > 0) this.paintRegion(ctx, rowMap, 0, 0, fw, fh, 1, fc, 1, fr, 0, 0);

    // charts rolam com o quadrante principal (clip ao quadrante quando há freeze)
    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fh, vw - fw, vh - fh);
    ctx.clip();
    this.paintCharts(ctx);
    ctx.restore();

    this.paintSelection(ctx, vw, vh);
    // dropdown de validação de LISTA: botão à direita da célula SELECIONADA
    // (o app de referência só mostra a seta na seleção)
    if (v.listValRanges.length > 0 && !this.editing) {
      const { col, row } = this.sel;
      const inVal = v.listValRanges.some((rg) => col >= rg.c1 && col <= rg.c2 && row >= rg.r1 && row <= rg.r2);
      if (inVal) {
        const cw = this.colWidth(col), rh = this.rowHeight(row);
        if (cw > 0 && rh > 0) {
          const bx = this.colX(col) + cw;
          const by = this.rowY(row);
          const size = rh;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx, by, size, size);
          ctx.strokeStyle = '#ACACAC';
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, size - 1, size - 1);
          ctx.fillStyle = '#444444';
          const cx2 = bx + size / 2, cy2 = by + size / 2, tw = size * 0.4;
          ctx.beginPath();
          ctx.moveTo(cx2 - tw / 2, cy2 - tw * 0.25);
          ctx.lineTo(cx2 + tw / 2, cy2 - tw * 0.25);
          ctx.lineTo(cx2, cy2 + tw * 0.35);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();

    this.paintHeaders(ctx, W, H);

    // linhas de separação dos panes (sólida #999, atravessa cabeçalhos como no Excel)
    if (fc > 0 || fr > 0) {
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (fc > 0) { const x = Math.round(HEADER_W + fw) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      if (fr > 0) { const y = Math.round(HEADER_H + fh) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }

    this.paintScrollbars(ctx, W, H);
  }

  /**
   * Índice de células por ref da aba ativa — CACHEADO por aba (reconstruir 1M
   * de entradas a cada frame custava ~75ms de paint na planilha gigante;
   * invalidado em loadXlsx/selectSheet/setCellValue) — e o cache numérico da
   * formatação condicional (idem, só quando a aba tem regras).
   */
  private paintCaches(v: SheetView): Map<number, Map<number, Cell>> {
    let rowMap = this.rowMapCache.get(this.sheetIndex);
    if (!rowMap) {
      rowMap = new Map<number, Map<number, Cell>>();
      for (const r of v.worksheet.rows) {
        const cm = new Map<number, Cell>();
        for (const c of r.cells) cm.set(refToRowCol(c.ref).col, c);
        rowMap.set(r.r, cm);
      }
      this.rowMapCache.set(this.sheetIndex, rowMap);
    }
    if (v.condFormats.length > 0 && !this.condNumReady) {
      this.condNumMap.clear();
      for (const r of v.worksheet.rows) {
        for (const c of r.cells) {
          if (c.type === 's') continue;
          const n = parseFloat(c.value ?? 'NaN');
          if (!Number.isNaN(n)) this.condNumMap.set(`${refToRowCol(c.ref).col},${r.r}`, n);
        }
      }
      this.condNumReady = true;
    }
    return rowMap;
  }

  /**
   * Pinta as colunas 1..nCols × linhas 1..nRows da aba `index` a 100%, sem
   * cabeçalhos, seleção nem panes congelados, num canvas do tamanho EXATO da
   * região — o que o Excel desenha numa imagem vinculada (câmera) do mesmo
   * intervalo. Usado pelo lab de fidelidade e por exportações. Devolve o
   * tamanho em px.
   */
  renderRegionToCanvas(index: number, canvas: HTMLCanvasElement, nCols: number, nRows: number): { w: number; h: number } {
    const v = this.views[index];
    if (!v) return { w: 0, h: 0 };
    const keep = { sheet: this.sheetIndex, zoom: this.zoom, sx: this.scrollX, sy: this.scrollY, capture: this.capture };
    if (index !== this.sheetIndex) { this.condNumReady = false; this.condNumMap.clear(); }
    this.sheetIndex = index;
    this.zoom = 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.capture = true;
    v.maxCol = Math.max(v.maxCol, nCols);
    v.maxRow = Math.max(v.maxRow, nRows);
    this.recalcGrid();
    const w = Math.max(1, Math.round(this.xs[nCols] ?? 0));
    const h = Math.max(1, Math.round(this.ys[nRows] ?? 0));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const rowMap = this.paintCaches(v);
      this.paintRegion(ctx, rowMap, 0, 0, w, h, 1, nCols, 1, nRows, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      this.paintCharts(ctx);
      ctx.restore();
    }
    if (keep.sheet !== index) { this.condNumReady = false; this.condNumMap.clear(); }
    this.sheetIndex = keep.sheet;
    this.zoom = keep.zoom;
    this.scrollX = keep.sx;
    this.scrollY = keep.sy;
    this.capture = keep.capture;
    this.recalcGrid();
    return { w, h };
  }

  /**
   * Pinta um quadrante do grid: recorte (x,y,w,h) em coords de conteúdo,
   * intervalo de colunas/linhas [colMin..colMax]×[rowMin..rowMax] e scroll
   * efetivo (sx,sy) — 0 nos eixos congelados. A posição na tela de uma célula
   * é sempre xs[col-1]−sx / ys[row-1]−sy.
   */
  private paintRegion(
    ctx: CanvasRenderingContext2D, rowMap: Map<number, Map<number, Cell>>,
    x: number, y: number, w: number, h: number,
    colMin: number, colMax: number, rowMin: number, rowMax: number,
    sx: number, sy: number,
  ): void {
    if (w <= 0 || h <= 0 || colMin > colMax || rowMin > rowMax) return;
    const v = this.view!;
    const firstCol = Math.max(colMin, bisectLE(this.xs, sx + x) + 1);
    const lastCol = Math.min(colMax, bisectLE(this.xs, sx + x + w) + 1);
    const firstRow = Math.max(rowMin, bisectLE(this.ys, sy + y) + 1);
    const lastRow = Math.min(rowMax, bisectLE(this.ys, sy + y + h) + 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);

    // Grid lines PRIMEIRO (como o app de referência): fills cobrem as linhas sob a célula,
    // texto que transborda passa por cima das linhas das vizinhas vazias.
    if (v.showGridLines !== false) {
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let col = firstCol; col <= lastCol + 1; col++) {
        const gx = Math.round((this.xs[col - 1] ?? 0) - sx) + 0.5;
        ctx.moveTo(gx, y); ctx.lineTo(gx, y + h);
      }
      for (let row = firstRow; row <= lastRow + 1; row++) {
        const gy = Math.round((this.ys[row - 1] ?? 0) - sy) + 0.5;
        ctx.moveTo(x, gy); ctx.lineTo(x + w, gy);
      }
      ctx.stroke();
    }

    // origens de mescla fora deste quadrante já desenhadas aqui (1× por região)
    const crossMergeDrawn = new Set<string>();
    for (let row = firstRow; row <= lastRow; row++) {
      if (v.hiddenRows.has(row)) continue;
      const rh = this.rowHeight(row);
      if (rh <= 0) continue;
      for (let col = firstCol; col <= lastCol; col++) {
        if (v.hiddenCols.has(col)) continue;
        const cw = this.colWidth(col);
        if (cw <= 0) continue;

        // célula mesclada? origem desenha o span todo; cobertas são puladas —
        // EXCETO quando a origem está fora deste quadrante (mescla cruzando o
        // split congelado): a primeira coberta visível desenha o span aqui.
        const m = this.mergeAt(col, row);
        let dcol = col, drow = row;
        if (m && !m.isOrigin) {
          const originInRegion =
            m.firstCol >= colMin && m.firstCol <= colMax &&
            m.firstRow >= rowMin && m.firstRow <= rowMax;
          const key = `${m.firstCol},${m.firstRow}`;
          if (originInRegion || crossMergeDrawn.has(key)) continue;
          crossMergeDrawn.add(key);
          dcol = m.firstCol;
          drow = m.firstRow;
        }
        const left = (this.xs[dcol - 1] ?? 0) - sx;
        const top = (this.ys[drow - 1] ?? 0) - sy;
        let drawW = this.colWidth(dcol), drawH = this.rowHeight(drow);
        if (m) {
          drawW = (this.xs[m.lastCol] ?? 0) - (this.xs[m.firstCol - 1] ?? 0);
          drawH = (this.ys[m.lastRow] ?? 0) - (this.ys[m.firstRow - 1] ?? 0);
        }

        const cells = rowMap.get(drow);
        const cell = cells?.get(dcol);
        let st = this.resolveStyle(cell);
        const isEditingThis = this.editing && this.editing.col === dcol && this.editing.row === drow;

        // decoração de TABELA (ListObject): fill de header/banda como default
        // (formatação explícita da célula vence a camada do estilo da tabela)
        const deco = v.tableDeco.size > 0 ? v.tableDeco.get(`${dcol},${drow}`) : undefined;
        if (deco) {
          const ownFill = !!st.fill &&
            (st.fill.gradient !== undefined || (st.fill.pattern !== undefined && st.fill.pattern !== 'none'));
          if (deco.fill && !ownFill) {
            ctx.fillStyle = deco.fill;
            ctx.fillRect(left, top, drawW, drawH);
          }
          // fonte: a camada da tabela vale quando a célula usa a fonte DEFAULT
          const ownFont = (this.styles?.cellXfs[cell?.style ?? 0]?.fontId ?? 0) !== 0;
          if (!ownFont && (deco.fontColor !== undefined || deco.bold)) {
            const f = { ...(st.font ?? {}) };
            if (deco.fontColor !== undefined) f.color = deco.fontColor;
            if (deco.bold) f.bold = true;
            st = { ...st, font: f };
          }
        }

        // área mesclada COBRE as linhas de grade internas (como o app de
        // referência) — fundo branco antes do fill/texto
        if (m) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(left, top, drawW, drawH);
        }
        // preenchimento: sólido, padrão legado ou gradiente
        this.paintFill(ctx, st.fill, left, top, drawW, drawH);
        // formatação condicional (cor/barras/destaque)
        this.paintCondFormat(ctx, cell, dcol, drow, left, top, drawW, drawH);
        // texto (com transbordo p/ vizinhas vazias e #### quando não cabe).
        // Suprime o texto da célula em edição — o input flutuante já o exibe.
        if (!isEditingThis) {
          this.paintCell(ctx, cell, st, left, top, drawW, drawH, dcol, drow, cells, !!m);
        } else {
          // pinta um fundo branco para sobrepor preenchimento/cond format atrás do input
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(left, top, drawW, drawH);
        }
        // bordas
        if (st.border) this.paintBorder(ctx, st.border, left, top, drawW, drawH);
        // indicador de comentario: triangulo vermelho no canto superior direito
        // (5px de lado @zoom=1) — IDENTICO a representacao do app de referencia.
        if (v.commentAt.size > 0 && v.commentAt.has(`${dcol},${drow}`)) {
          this.paintCommentIndicator(ctx, left, top, drawW);
        }
        // seta de autofiltro (header de tabela)
        if (deco?.arrow) this.paintFilterArrow(ctx, left, top, drawW, drawH);
      }
    }
    ctx.restore();
  }

  /**
   * Cache de ChartModel parseado por XML cru. Evita re-parsear no scroll/zoom.
   */
  private chartCache = new Map<string, ChartModel>();
  /** Accents 1..6 do tema do workbook — paleta default das séries de chart. */
  private chartPalette: string[] = [];
  /** Tema do workbook: cores DrawingML e fontes dos gráficos. */
  private chartTheme: Theme | undefined;

  /**
   * Pinta todos os charts ancorados do sheet ativo. Converte cada
   * `DrawingAnchor` (col/row + colOff/rowOff em EMU) para pixels usando o
   * `xs[]/ys[]` da grade + 9525 EMU/px (default @96dpi).
   */
  private paintCharts(ctx: CanvasRenderingContext2D): void {
    const v = this.view;
    if (!v || v.charts.length === 0) return;
    const EMU_PER_PX = 9525;
    for (const ch of v.charts) {
      // localiza pixels de from/to. xs[i]/ys[i] = borda esq/sup da coluna/linha i+1.
      const fl = (this.xs[ch.anchor.from.col] ?? 0) + ch.anchor.from.colOff / EMU_PER_PX * this.zoom - this.scrollX;
      const ft = (this.ys[ch.anchor.from.row] ?? 0) + ch.anchor.from.rowOff / EMU_PER_PX * this.zoom - this.scrollY;
      const tr = (this.xs[ch.anchor.to.col] ?? 0) + ch.anchor.to.colOff / EMU_PER_PX * this.zoom - this.scrollX;
      const tb = (this.ys[ch.anchor.to.row] ?? 0) + ch.anchor.to.rowOff / EMU_PER_PX * this.zoom - this.scrollY;
      const x = fl, y = ft, w = tr - fl, h = tb - ft;
      if (w <= 0 || h <= 0) continue;
      let model = this.chartCache.get(ch.chartXml);
      if (!model) { model = parseChart(ch.chartXml, this.chartTheme); this.chartCache.set(ch.chartXml, model); }
      // px por pt: 96/72 na base, escalado pelo zoom (tipografia do chart).
      // Moldura: a cor das linhas default do gráfico (o Excel desenha; medido #898989).
      paintChart(ctx, model, x, y, w, h, this.zoom * 96 / 72);
    }
  }

  /**
   * Botão de autofiltro no canto direito da célula de header: quadrado com
   * borda cinza e triângulo ▼ — como o app de referência desenha na tabela.
   */
  private paintFilterArrow(ctx: CanvasRenderingContext2D, left: number, top: number, w: number, h: number): void {
    const size = Math.min(h - 4, Math.round(13 * this.zoom));
    if (size < 7) return;
    const bx = left + w - size - 2;
    const by = top + (h - size) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx, by, size, size);
    ctx.strokeStyle = '#ACACAC';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, size - 1, size - 1);
    ctx.fillStyle = '#444444';
    const cx = bx + size / 2;
    const cy = by + size / 2;
    const tw = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, cy - tw * 0.28);
    ctx.lineTo(cx + tw / 2, cy - tw * 0.28);
    ctx.lineTo(cx, cy + tw * 0.36);
    ctx.closePath();
    ctx.fill();
  }

  /** Pequeno triangulo (lado ~5px) vermelho no canto superior direito da celula. */
  private paintCommentIndicator(ctx: CanvasRenderingContext2D, left: number, top: number, w: number): void {
    const side = 5 * this.zoom;
    const x1 = left + w;        // canto sup-dir
    const y1 = top;
    ctx.save();
    ctx.fillStyle = '#D7373F'; // vermelho do app de referencia
    ctx.beginPath();
    ctx.moveTo(x1 - side, y1);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 + side);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---- Fills: sólido, padrões legados e gradiente ----

  /** Cache de CanvasPattern por "nome|fg" (tiles 8×8 são caros de recriar). */
  private patternCache = new Map<string, CanvasPattern | null>();

  /**
   * Pinta o fundo da célula: sólido (fgColor), padrão legado (gray125,
   * darkTrellis, …) via ctx.createPattern de um tile 8×8, ou gradiente linear
   * de 2+ stops via createLinearGradient.
   */
  private paintFill(ctx: CanvasRenderingContext2D, fill: Fill | undefined, left: number, top: number, w: number, h: number): void {
    if (!fill) return;
    if (fill.gradient && fill.gradient.stops.length >= 2) {
      const g = fill.gradient;
      const rad = (g.degree % 360) * Math.PI / 180;
      const cx = left + w / 2, cy = top + h / 2;
      const dx = Math.cos(rad), dy = Math.sin(rad);
      const half = Math.abs(dx) * w / 2 + Math.abs(dy) * h / 2;
      const gr = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
      for (const s of g.stops) gr.addColorStop(Math.min(1, Math.max(0, s.position)), s.color);
      ctx.fillStyle = gr;
      ctx.fillRect(left, top, w, h);
      return;
    }
    const p = fill.pattern;
    if (!p || p === 'none') return;
    if (p === 'solid') {
      if (fill.fgColor) { ctx.fillStyle = fill.fgColor; ctx.fillRect(left, top, w, h); }
      return;
    }
    // padrão legado: bgColor atrás, tile do padrão (fgColor) por cima
    if (fill.bgColor) { ctx.fillStyle = fill.bgColor; ctx.fillRect(left, top, w, h); }
    const pat = this.patternFor(ctx, p, fill.fgColor ?? '#000000');
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(left, top, w, h); }
  }

  /** Constrói (com cache) o CanvasPattern de um padrão legado na cor dada. */
  private patternFor(ctx: CanvasRenderingContext2D, name: string, fg: string): CanvasPattern | null {
    const key = `${name}|${fg}`;
    const cached = this.patternCache.get(key);
    if (cached !== undefined) return cached;
    const mask = PATTERN_MASKS[name];
    if (!mask) { this.patternCache.set(key, null); return null; }
    const tile = document.createElement('canvas');
    tile.width = 8;
    tile.height = mask.length;
    const tctx = tile.getContext('2d');
    if (!tctx) return null;
    tctx.fillStyle = fg;
    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < 8; x++) {
        if (mask[y]! & (1 << (7 - x))) tctx.fillRect(x, y, 1, 1);
      }
    }
    const pat = ctx.createPattern(tile, 'repeat');
    this.patternCache.set(key, pat);
    return pat;
  }

  /** Há conteúdo exibível em (col,row)? (bloqueia transbordo de texto). */
  private cellHasContent(cells: Map<number, Cell> | undefined, col: number, row: number): boolean {
    if (this.mergeAt(col, row)) return true;
    const c = cells?.get(col);
    return !!c && this.formatCell(c).text !== '';
  }

  /** Largura (px) de células vazias contíguas a partir de col±1, até `need` ou bloqueio. */
  private overflowExtent(col: number, row: number, cells: Map<number, Cell> | undefined, dir: 1 | -1, need: number): number {
    const v = this.view;
    const maxCol = v?.maxCol ?? col;
    let ext = 0;
    let c = col + dir;
    let guard = 0;
    while (c >= 1 && c <= maxCol && ext < need && guard++ < 200) {
      if (v?.hiddenCols.has(c)) { c += dir; continue; }
      if (this.cellHasContent(cells, c, row)) break;
      ext += this.colWidth(c);
      c += dir;
    }
    return ext;
  }

  /** Localiza a mescla que cobre (col,row), se houver. */
  private mergeAt(col: number, row: number): { firstCol: number; lastCol: number; firstRow: number; lastRow: number; isOrigin: boolean } | null {
    const v = this.view;
    if (!v || v.merges.size === 0) return null;
    for (const [, range] of v.merges) {
      const [a, b] = range.split(':');
      if (!a || !b) continue;
      const s = refToRowCol(a);
      const e = refToRowCol(b);
      if (col >= s.col && col <= e.col && row >= s.row && row <= e.row) {
        return { firstCol: s.col, lastCol: e.col, firstRow: s.row, lastRow: e.row, isOrigin: col === s.col && row === s.row };
      }
    }
    return null;
  }

  private paintBorder(ctx: CanvasRenderingContext2D, border: Border, left: number, top: number, w: number, h: number): void {
    const edge = (e: Border['left'] | undefined, x1: number, y1: number, x2: number, y2: number, dash: number[]): void => {
      if (!e || !e.style) return;
      ctx.strokeStyle = e.color ?? '#000000';
      const widths: Record<string, number> = { thin: 1, medium: 2, thick: 3 };
      ctx.lineWidth = (widths[e.style] ?? 1) * this.zoom;
      ctx.setLineDash(e.style === 'dashed' ? [4 * this.zoom, 2 * this.zoom] : e.style === 'dotted' ? [1, 2 * this.zoom] : dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const noDash: number[] = [];
    edge(border.left, Math.round(left) + 0.5, top, Math.round(left) + 0.5, top + h, noDash);
    edge(border.right, Math.round(left + w) + 0.5, top, Math.round(left + w) + 0.5, top + h, noDash);
    edge(border.top, left, Math.round(top) + 0.5, left + w, Math.round(top) + 0.5, noDash);
    edge(border.bottom, left, Math.round(top + h) + 0.5, left + w, Math.round(top + h) + 0.5, noDash);
    ctx.setLineDash([]);
  }

  /** Aplica formatação condicional (color scale / data bar / highlight). */
  private paintCondFormat(ctx: CanvasRenderingContext2D, cell: Cell | undefined, col: number, row: number, left: number, top: number, w: number, h: number): void {
    const v = this.view;
    if (!v || v.condFormats.length === 0 || !cell) return;
    const value = cell.type === 's' ? NaN : parseFloat(cell.value ?? 'NaN');
    const vals = this.condNumMap;
    for (const cf of v.condFormats) {
      if (!sqrefContains(cf.sqref, col, row)) continue;
      for (const rule of cf.rules) {
        if (rule.type === 'colorScale' && rule.stops && !Number.isNaN(value)) {
          const color = colorScaleColor(rule.stops, value, cf.sqref, vals);
          if (color) { ctx.fillStyle = color; ctx.fillRect(left, top, w, h); }
        } else if (rule.type === 'dataBar' && !Number.isNaN(value)) {
          const { min, max } = rangeMinMax(cf.sqref, vals);
          if (max > min) {
            // comprimento: x14 (minLength/maxLength reais, ex. 0..100) quando
            // presente; sem x14, defaults clássicos 10..90. Altura quase total,
            // DEGRADÊ horizontal cor→branco; borda só se x14 border="1"
            const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
            const lo = (rule.barMinLen ?? 10) / 100;
            const hi = (rule.barMaxLen ?? 90) / 100;
            const frac = lo + (hi - lo) * t;
            const color = rule.barColor ?? '#638EC6';
            const bx = left + 1;
            const by = top + 1.5 * this.zoom;
            const bw2 = (w - 3) * frac;
            const bh2 = h - 3 * this.zoom;
            if (bw2 > 1) {
              const g = ctx.createLinearGradient(bx, 0, bx + bw2, 0);
              g.addColorStop(0, color);
              g.addColorStop(1, lerpColor(color, '#FFFFFF', 0.85));
              ctx.fillStyle = g;
              ctx.fillRect(bx, by, bw2, bh2);
              if (rule.barBorder) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw2) - 1, Math.round(bh2) - 1);
              }
            }
          }
        } else if (rule.type === 'cellIs' && rule.dxfId !== undefined && !Number.isNaN(value)) {
          const thr = parseFloat(rule.formula?.[0] ?? 'NaN');
          const dxf = this.styles.dxfs[rule.dxfId];
          if (dxf && !Number.isNaN(thr) && evalCellIs(rule.operator, value, thr)) {
            if (dxf.fillColor) { ctx.fillStyle = dxf.fillColor; ctx.fillRect(left, top, w, h); }
          }
        }
      }
    }
  }

  private paintCell(
    ctx: CanvasRenderingContext2D, cell: Cell | undefined,
    st: ResolvedStyle, left: number, top: number, w: number, h: number,
    col = 0, row = 0, cells?: Map<number, Cell>, merged = false,
  ): void {
    const fr = this.formatCell(cell);
    const display = fr.text;
    if (display === '') return;
    // texto rico (runs): mede e desenha run a run (fonte/cor/sublinhado por run)
    const runs = this.cellRuns(cell);
    if (runs && runs.length > 0) {
      this.paintRichCell(ctx, runs, st, left, top, w, h, col, row, cells, merged);
      return;
    }
    const font = st.font;
    // sz do xlsx é em PONTOS → px@96dpi (11pt = 14.67px, NÃO 11px)
    const size = (font?.size ?? 11) * 96 / 72 * this.zoom;
    const style = font?.italic ? 'italic ' : '';
    const weight = font?.bold ? '700 ' : '400 ';
    ctx.font = `${style}${weight}${size}px ${this.fontResolver.cssStack(font?.name ?? 'Aptos Narrow', fallbacksOf(font), variantOf(!!font?.bold, !!font?.italic))}`;
    // cor do numFmt (ex.: [Red] em negativos) tem prioridade sobre a cor da fonte
    ctx.fillStyle = fr.color ?? font?.color ?? TEXT;

    const pad = 3 * this.zoom;          // margem horizontal interna do app de referência (~3px)
    const numeric = this.isNumericCell(cell);
    let ta: CanvasTextAlign = 'left';
    if (st.align && st.align !== 'general') ta = st.align === 'center' ? 'center' : st.align === 'right' || st.align === 'fill' ? (st.align === 'fill' ? 'left' : 'right') : 'left';
    else if (numeric) ta = 'right';    // General: números/datas à direita
    ctx.textAlign = ta;
    ctx.textBaseline = 'alphabetic';

    const innerW = w - pad * 2;
    const textW = ctx.measureText(display).width;

    // ── #### : número/data que não cabe na coluna (o app de referência nunca transborda número)
    if (numeric && !merged && !st.wrap && textW > innerW) {
      const hashW = ctx.measureText('#').width || pad;
      const count = Math.max(1, Math.floor(innerW / hashW));
      ctx.save();
      ctx.beginPath(); ctx.rect(left + 0.5, top + 0.5, w - 1, h - 1); ctx.clip();
      const y = this.baselineY(st, top, h, size, '#'.repeat(count), ctx);
      ctx.fillText('#'.repeat(count), ta === 'right' ? left + w - pad : ta === 'center' ? left + w / 2 : left + pad, y);
      ctx.restore();
      return;
    }

    // ── transbordo de TEXTO p/ células vizinhas vazias (app de referência) ──
    let clipLeft = left, clipW = w;
    if (!merged && !st.wrap && textW > innerW) {
      const overflow = textW - innerW;
      if (ta === 'left') clipW = w + this.overflowExtent(col, row, cells, 1, overflow);
      else if (ta === 'right') { const e = this.overflowExtent(col, row, cells, -1, overflow); clipLeft = left - e; clipW = w + e; }
      else if (ta === 'center') {
        const half = overflow / 2;
        const er = this.overflowExtent(col, row, cells, 1, half);
        const el = this.overflowExtent(col, row, cells, -1, half);
        clipLeft = left - el; clipW = w + el + er;
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipLeft + 0.5, top + 0.5, clipW - 1, h - 1);
    ctx.clip();

    if (st.wrap) {
      const lines = this.wrapText(ctx, display, innerW);
      // entrelinha = altura de linha da fonte no Excel (a linha auto-ajustada tem linhas × isso)
      const lineH = excelRowPx(font?.name ?? this.normalFont.name, font?.size ?? this.normalFont.size, !!font?.bold) * this.zoom;
      const totalH = lines.length * lineH;
      let startY: number;
      const va = st.valign ?? 'bottom';
      if (va === 'top') startY = top + pad + size * 0.85;
      else if (va === 'center') startY = top + (h - totalH) / 2 + size * 0.85;
      else startY = top + h - pad - totalH + size * 0.85;
      const x = ta === 'right' ? left + w - pad : ta === 'center' ? left + w / 2 : left + pad;
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i]!, x, startY + i * lineH);
    } else {
      const y = this.baselineY(st, top, h, size, display, ctx);
      const x = ta === 'right' ? left + w - pad : ta === 'center' ? left + w / 2 : left + pad;
      ctx.fillText(display, x, y);
      // sublinhado / tachado (modelados mas não desenhados antes)
      if (font?.underline || font?.strike) {
        const x0 = ta === 'right' ? left + w - pad - textW : ta === 'center' ? left + w / 2 - textW / 2 : left + pad;
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = Math.max(1, size / 14);
        if (font.underline) { const uy = Math.round(y + size * 0.12) + 0.5; ctx.beginPath(); ctx.moveTo(x0, uy); ctx.lineTo(x0 + textW, uy); ctx.stroke(); }
        if (font.strike) { const sy = Math.round(y - size * 0.28) + 0.5; ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + textW, sy); ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  /** Runs ricos da célula, se houver (shared string ou string inline). */
  private cellRuns(cell: Cell | undefined): RichRun[] | undefined {
    if (!cell) return undefined;
    if (cell.type === 's' && cell.value !== undefined) return this.shared[parseInt(cell.value, 10)]?.runs;
    if (cell.type === 'inlineStr') return cell.inlineString?.runs;
    return undefined;
  }

  /** Fonte efetiva de um run: props do run sobrepõem a fonte da célula. */
  private effRunFont(base: Font | undefined, p: RunProps | undefined): EffRunFont {
    const bold = p?.bold ?? base?.bold ?? false;
    const italic = p?.italic ?? base?.italic ?? false;
    const underline = p?.underline ?? base?.underline ?? false;
    const strike = p?.strike ?? base?.strike ?? false;
    const sizePt = p?.size ?? base?.size ?? 11;
    const sizePx = sizePt * 96 / 72 * this.zoom;
    // rFont explícito do run tem prioridade; senão a convenção da célula
    const family = this.fontResolver.cssStack(p?.font ?? base?.name ?? 'Aptos Narrow', p?.font ? SHEET_FALLBACKS : fallbacksOf(base), variantOf(bold, italic));
    return {
      css: `${italic ? 'italic ' : ''}${bold ? '700 ' : '400 '}${sizePx}px ${family}`,
      sizePx,
      color: p?.color ?? base?.color ?? TEXT,
      underline,
      strike,
    };
  }

  /**
   * Pinta uma célula de texto RICO: mede e desenha run a run (fonte, cor,
   * sublinhado/tachado por run), respeitando alinhamento, wrap por segmentos
   * e transbordo para vizinhas vazias.
   */
  private paintRichCell(
    ctx: CanvasRenderingContext2D, runs: RichRun[], st: ResolvedStyle,
    left: number, top: number, w: number, h: number,
    col: number, row: number, cells?: Map<number, Cell>, merged = false,
  ): void {
    const pad = 3 * this.zoom;
    const innerW = w - pad * 2;
    const eff = runs.map((r) => this.effRunFont(st.font, r.props));
    const measure = (text: string, run: number): number => {
      ctx.font = eff[run]!.css;
      return ctx.measureText(text).width;
    };
    let ta: CanvasTextAlign = 'left'; // strings em General alinham à esquerda
    if (st.align === 'center') ta = 'center';
    else if (st.align === 'right') ta = 'right';
    ctx.textAlign = 'left'; // segmentos são desenhados manualmente esq→dir
    ctx.textBaseline = 'alphabetic';

    if (st.wrap) {
      const lines = layoutRichLines(runs.map((r) => r.text), innerW, measure);
      // altura por linha: maior fonte presente na linha (fallback: fonte da célula)
      const cellSizePx = (st.font?.size ?? 11) * 96 / 72 * this.zoom;
      const lineHs = lines.map((line) => {
        let maxSz = 0;
        for (const s of line) maxSz = Math.max(maxSz, eff[s.run]!.sizePx);
        return (maxSz || cellSizePx) * 1.2;
      });
      const totalH = lineHs.reduce((a, b) => a + b, 0);
      const va = st.valign ?? 'bottom';
      let yTop: number;
      if (va === 'top') yTop = top + pad;
      else if (va === 'center' || va === 'middle') yTop = top + (h - totalH) / 2;
      else yTop = top + h - pad - totalH;
      ctx.save();
      ctx.beginPath(); ctx.rect(left + 0.5, top + 0.5, w - 1, h - 1); ctx.clip();
      let yy = yTop;
      for (let i = 0; i < lines.length; i++) {
        const lh = lineHs[i]!;
        this.drawRichSegs(ctx, lines[i]!, eff, left, w, pad, ta, yy + (lh / 1.2) * 0.85, measure);
        yy += lh;
      }
      ctx.restore();
      return;
    }

    // linha única: mesmo transbordo p/ vizinhas vazias do texto simples
    const segs: RichSeg[] = [];
    runs.forEach((r, i) => { if (r.text !== '') segs.push({ text: r.text, run: i }); });
    if (segs.length === 0) return;
    let totalW = 0;
    for (const s of segs) totalW += measure(s.text, s.run);
    let clipLeft = left, clipW = w;
    if (!merged && totalW > innerW) {
      const overflow = totalW - innerW;
      if (ta === 'left') clipW = w + this.overflowExtent(col, row, cells, 1, overflow);
      else if (ta === 'right') {
        const e = this.overflowExtent(col, row, cells, -1, overflow);
        clipLeft = left - e; clipW = w + e;
      } else {
        const half = overflow / 2;
        const er = this.overflowExtent(col, row, cells, 1, half);
        const el = this.overflowExtent(col, row, cells, -1, half);
        clipLeft = left - el; clipW = w + el + er;
      }
    }
    // baseline: maior ascent/descent entre os runs (bottom default, ~2px)
    let maxAsc = 0, maxDesc = 0;
    for (const s of segs) {
      ctx.font = eff[s.run]!.css;
      const m = ctx.measureText(s.text);
      maxAsc = Math.max(maxAsc, m.actualBoundingBoxAscent || eff[s.run]!.sizePx * 0.8);
      maxDesc = Math.max(maxDesc, m.actualBoundingBoxDescent || eff[s.run]!.sizePx * 0.2);
    }
    const va = st.valign ?? 'bottom';
    let baseline: number;
    if (va === 'top') baseline = top + 2 * this.zoom + maxAsc;
    else if (va === 'center' || va === 'middle') baseline = top + (h + maxAsc - maxDesc) / 2;
    else baseline = top + h - 2 * this.zoom - maxDesc;

    ctx.save();
    ctx.beginPath(); ctx.rect(clipLeft + 0.5, top + 0.5, clipW - 1, h - 1); ctx.clip();
    this.drawRichSegs(ctx, segs, eff, left, w, pad, ta, baseline, measure);
    ctx.restore();
  }

  /** Desenha os segmentos de UMA linha rica com sublinhado/tachado por run. */
  private drawRichSegs(
    ctx: CanvasRenderingContext2D, segs: RichSeg[], eff: EffRunFont[],
    left: number, w: number, pad: number, ta: CanvasTextAlign, baseline: number,
    measure: (text: string, run: number) => number,
  ): void {
    let lineW = 0;
    for (const s of segs) lineW += measure(s.text, s.run);
    let x = ta === 'right' ? left + w - pad - lineW : ta === 'center' ? left + (w - lineW) / 2 : left + pad;
    for (const s of segs) {
      const f = eff[s.run]!;
      ctx.font = f.css;
      ctx.fillStyle = f.color;
      const segW = ctx.measureText(s.text).width;
      ctx.fillText(s.text, x, baseline);
      if (f.underline || f.strike) {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = Math.max(1, f.sizePx / 14);
        if (f.underline) {
          const uy = Math.round(baseline + f.sizePx * 0.12) + 0.5;
          ctx.beginPath(); ctx.moveTo(x, uy); ctx.lineTo(x + segW, uy); ctx.stroke();
        }
        if (f.strike) {
          const sy = Math.round(baseline - f.sizePx * 0.28) + 0.5;
          ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + segW, sy); ctx.stroke();
        }
      }
      x += segW;
    }
  }

  /** Baseline y respeitando alinhamento vertical (app de referência default = bottom, ~2px). */
  private baselineY(st: ResolvedStyle, top: number, h: number, size: number, text: string, ctx: CanvasRenderingContext2D): number {
    const m = ctx.measureText(text);
    const asc = m.actualBoundingBoxAscent || size * 0.8;
    const desc = m.actualBoundingBoxDescent || size * 0.2;
    const va = st.valign ?? 'bottom';
    if (va === 'top') return top + 2 * this.zoom + asc;
    if (va === 'center' || va === 'middle') return top + (h + asc - desc) / 2;
    return top + h - 2 * this.zoom - desc;
  }

  /** Quebra texto em linhas que cabem na largura disponível (word + char wrap). */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    if (text.includes('\n')) return text.split('\n').flatMap((l) => this.wrapText(ctx, l, maxW));
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) { lines.push(line); line = ''; }
      // palavra maior que a linha: quebra por caractere
      let chunk = '';
      for (const ch of word) {
        if (ctx.measureText(chunk + ch).width <= maxW) chunk += ch;
        else { if (chunk) lines.push(chunk); chunk = ch; }
      }
      line = chunk;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  private paintSelection(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    if (this.capture) return; // modo captura: o app de referência não inclui seleção
    const v = this.view!;
    const span = this.selectionSpan();
    // coordenadas pane-aware: célula congelada não sofre scroll
    const left = this.colX(span.firstCol);
    const top = this.rowY(span.firstRow);
    const right = (this.xs[span.lastCol] ?? 0) - (span.lastCol <= v.frozenCols ? 0 : this.scrollX);
    const bottom = (this.ys[span.lastRow] ?? 0) - (span.lastRow <= v.frozenRows ? 0 : this.scrollY);
    const w = right - left, h = bottom - top;
    const accent = this.accent();
    ctx.save();
    // recorta ao quadrante da célula ativa: seleção rolada não invade a faixa congelada
    const clipX = span.firstCol > v.frozenCols ? this.frozenW() : 0;
    const clipY = span.firstRow > v.frozenRows ? this.frozenH() : 0;
    ctx.beginPath();
    ctx.rect(clipX, clipY, vw - clipX, vh - clipY);
    ctx.clip();
    // Célula única / mescla isolada: só borda, sem fill (como o app de referência).
    // O fill translúcido só faria sentido em range multi-célula (futuro).
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, w - 2, h - 2);
    ctx.restore();
  }

  private paintHeaders(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const v = this.view!;
    // Cabeçalhos pintam BG (não texto): coluna/linha do range = tint do acento;
    // coluna/linha do active (origem da mescla, quando aplicável) = mais saturado.
    const accent = this.accent();
    const bgRange = this.mix(COL_HEADER_BG, accent, 0.14);   // tint suave: range
    const bgActive = this.mix(COL_HEADER_BG, accent, 0.26);  // mais forte: active
    // texto do cabeçalho selecionado: acento ESCURECIDO — acento puro sobre
    // fundo tintado do próprio acento tinha contraste ruim (feedback usuário)
    const fgSel = this.mix(accent, '#000000', 0.35);
    const span = this.selectionSpan();
    const activeCol = span.firstCol;   // origem da seleção/mescla
    const activeRow = span.firstRow;

    // corner
    ctx.fillStyle = CORNER_BG;
    ctx.fillRect(0, 0, HEADER_W, HEADER_H);

    // faixas de fundo (todo o strip primeiro)
    ctx.fillStyle = COL_HEADER_BG;
    ctx.fillRect(HEADER_W, 0, W - HEADER_W, HEADER_H);
    ctx.fillStyle = ROW_HEADER_BG;
    ctx.fillRect(0, HEADER_H, HEADER_W, H - HEADER_H);

    ctx.font = `600 ${11 * this.zoom}px 'Aptos Narrow', Segoe UI, Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const fc = v.frozenCols, fr = v.frozenRows;
    const fw = this.frozenW(), fh = this.frozenH();

    // Cabeçalhos de coluna em dois segmentos: congelados (fixos) + roláveis
    // (clip a partir do fim da faixa congelada).
    const drawColHeaders = (colMin: number, colMax: number, sx: number, clipX: number, clipW: number): void => {
      if (colMin > colMax || clipW <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(clipX, 0, clipW, HEADER_H); ctx.clip();
      const first = Math.max(colMin, bisectLE(this.xs, sx + (clipX - HEADER_W)) + 1);
      const last = Math.min(colMax, bisectLE(this.xs, sx + (clipX - HEADER_W) + clipW) + 1);
      for (let col = first; col <= last; col++) {
        const left = HEADER_W + (this.xs[col - 1] ?? 0) - sx;
        const w = this.colWidth(col);
        const inRange = col >= span.firstCol && col <= span.lastCol;
        if (inRange) {
          ctx.fillStyle = col === activeCol ? bgActive : bgRange;
          ctx.fillRect(left, 0, w, HEADER_H);
          // linha de acento na borda inferior do cabeçalho da coluna no range
          ctx.fillStyle = accent;
          ctx.fillRect(left, HEADER_H - 2, w, 2);
        }
        ctx.fillStyle = inRange ? fgSel : '#5a5a5a';
        ctx.fillText(colLetters(col), left + w / 2, HEADER_H / 2);
      }
      ctx.restore();
    };
    drawColHeaders(fc + 1, v.maxCol, this.scrollX, HEADER_W + fw, W - HEADER_W - fw);
    if (fc > 0) drawColHeaders(1, fc, 0, HEADER_W, fw);

    // Cabeçalhos de linha: mesmo esquema (congeladas fixas + roláveis)
    const drawRowHeaders = (rowMin: number, rowMax: number, sy: number, clipY: number, clipH: number): void => {
      if (rowMin > rowMax || clipH <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, clipY, HEADER_W, clipH); ctx.clip();
      const first = Math.max(rowMin, bisectLE(this.ys, sy + (clipY - HEADER_H)) + 1);
      const last = Math.min(rowMax, bisectLE(this.ys, sy + (clipY - HEADER_H) + clipH) + 1);
      for (let row = first; row <= last; row++) {
        const top = HEADER_H + (this.ys[row - 1] ?? 0) - sy;
        const h = this.rowHeight(row);
        const inRange = row >= span.firstRow && row <= span.lastRow;
        if (inRange) {
          ctx.fillStyle = row === activeRow ? bgActive : bgRange;
          ctx.fillRect(0, top, HEADER_W, h);
          // linha de acento na borda direita do cabeçalho da linha no range
          ctx.fillStyle = accent;
          ctx.fillRect(HEADER_W - 2, top, 2, h);
        }
        ctx.fillStyle = inRange ? fgSel : '#5a5a5a';
        ctx.fillText(String(row), HEADER_W / 2, top + h / 2);
      }
      ctx.restore();
    };
    drawRowHeaders(fr + 1, v.maxRow, this.scrollY, HEADER_H + fh, H - HEADER_H - fh);
    if (fr > 0) drawRowHeaders(1, fr, 0, HEADER_H, fh);

    // borda inferior/direita dos cabeçalhos (linha base)
    ctx.strokeStyle = HEADER_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H + 0.5); ctx.lineTo(W, HEADER_H + 0.5);
    ctx.moveTo(HEADER_W + 0.5, 0); ctx.lineTo(HEADER_W + 0.5, H);
    ctx.stroke();
  }

  private paintScrollbars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const mx = this.maxScrollX();
    const my = this.maxScrollY();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    if (my > 0) {
      const track = H - HEADER_H;
      const thumb = Math.max(24, (track * (this.canvas.clientHeight - HEADER_H)) / (this.ys[this.ys.length - 1] ?? 1));
      const top = HEADER_H + (track - thumb) * (this.scrollY / my);
      ctx.fillRect(W - 10, top, 8, thumb);
    }
    if (mx > 0) {
      const track = W - HEADER_W;
      const thumb = Math.max(24, (track * (this.canvas.clientWidth - HEADER_W)) / (this.xs[this.xs.length - 1] ?? 1));
      const left = HEADER_W + (track - thumb) * (this.scrollX / mx);
      ctx.fillRect(left, H - 10, thumb, 8);
    }
  }

  // ---- Resolução de valor/estilo ----

  private resolveStyle(cell: Cell | undefined): ResolvedStyle {
    const s = this.styles;
    const xfIdx = cell?.style ?? 0;
    const xf = s.cellXfs[xfIdx];
    if (!xf) return { font: undefined, fill: undefined, border: undefined, numFmtId: 0, align: undefined, valign: undefined, wrap: false };
    return {
      font: s.fonts[xf.fontId],
      fill: s.fills[xf.fillId],
      border: s.borders[xf.borderId],
      numFmtId: xf.numFmtId,
      align: xf.horizontal,
      valign: xf.vertical,
      wrap: !!xf.wrapText,
    };
  }

  /** Texto a exibir na célula. */
  private displayText(cell: Cell | undefined): string {
    return this.formatCell(cell).text;
  }

  /** Texto + cor (numFmt pode pedir cor, ex.: `[Red]` em negativos). */
  private formatCell(cell: Cell | undefined): FormatResult {
    if (!cell) return { text: '' };
    if (cell.type === 's' && cell.value !== undefined) {
      return { text: this.shared[parseInt(cell.value, 10)]?.text ?? '' };
    }
    if (cell.type === 'inlineStr') return { text: cell.inlineString?.text ?? '' };
    // booleano exibido localizado, como o app de referência pt-BR
    if (cell.type === 'b') return { text: cell.value === '1' ? 'VERDADEIRO' : 'FALSO' };
    if (cell.type === 'e') return { text: cell.value ?? '' };
    if (cell.value === undefined) return { text: '' };
    if (cell.type === 'str') return { text: cell.value }; // string de fórmula = texto cru
    const n = parseFloat(cell.value);
    if (Number.isNaN(n)) return { text: cell.value };
    // numérico/data: aplica o formatCode via motor fiel ao oráculo (sheet-core)
    const { numFmtId } = this.resolveStyle(cell);
    const code = this.styles.numFmts.get(numFmtId) ?? builtinFormatCode(numFmtId) ?? 'General';
    return formatValue(n, code, { date1904: this.workbook?.date1904 });
  }

  /** General: tipo numérico (n/date/currency/percent) → alinha à direita. */
  private isNumericCell(cell: Cell | undefined): boolean {
    if (!cell) return false;
    if (cell.type === 's' || cell.type === 'inlineStr' || cell.type === 'b' || cell.type === 'e') return false;
    return cell.value !== undefined && !Number.isNaN(parseFloat(cell.value));
  }

  private isNumericDisplay(cell: Cell | undefined, display: string): boolean {
    if (!cell) return false;
    if (cell.type === 's' || cell.type === 'inlineStr') return false;
    return display !== '' && !Number.isNaN(Number(display.replace(/[^\d.,-]/g, '').replace(/,/g, '')));
  }
}

/** Converte índice de coluna (1-based) em letras (1→A, 27→AA). */
function colLetters(col: number): string {
  let s = '';
  let c = col;
  while (c > 0) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

/**
 * Compat: API pública histórica. Delega ao motor fiel do sheet-core
 * (`formatValue`), que cobre seções, locale pt-BR, científico, frações, datas.
 */
export function formatNumeric(value: number, code: string): string {
  return formatValue(value, code).text;
}

// ---- helpers de formatação condicional ----

/** "A1:B3 C2" → a célula (col,row) está em algum dos ranges? */
function sqrefContains(sqref: string, col: number, row: number): boolean {
  for (const part of sqref.split(/\s+/)) {
    if (!part) continue;
    const [a, b] = part.split(':');
    const s = refToRowCol(a!);
    const e = b ? refToRowCol(b) : s;
    if (col >= s.col && col <= e.col && row >= s.row && row <= e.row) return true;
  }
  return false;
}

/** Min/max dos valores numéricos de um sqref (para data bars e color scales). */
function rangeMinMax(sqref: string, vals: Map<string, number>): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (const part of sqref.split(/\s+/)) {
    if (!part) continue;
    const [a, b] = part.split(':');
    const s = refToRowCol(a!);
    const e = b ? refToRowCol(b) : s;
    for (let r = s.row; r <= e.row; r++) {
      for (let c = s.col; c <= e.col; c++) {
        const n = vals.get(`${c},${r}`);
        if (n !== undefined && !Number.isNaN(n)) { if (n < min) min = n; if (n > max) max = n; }
      }
    }
  }
  if (min === Infinity) { min = 0; max = 0; }
  return { min, max };
}

/** Interpola cor de uma colorScale (2-3 stops) para o valor dado. */
/**
 * Cor da escala: cada cfvo resolve para um VALOR (min/max/num/formula/percent/
 * percentile) e a interpolação é por segmentos ENTRE esses valores. O app de
 * referência CLAMPA pontos intermediários ao [min,max] do range — um mid
 * `formula 50` num range 1..10 vira 10, e o 3º segmento nunca aparece
 * (verificado no oráculo: escala fica vermelho→amarelo, sem verde).
 */
function colorScaleColor(stops: ColorStop[], value: number, sqref: string, vals: Map<string, number>): string | undefined {
  if (stops.length < 2) return stops[0]?.color;
  const { min, max } = rangeMinMax(sqref, vals);
  if (max <= min) return stops[0]!.color;
  const resolve = (s: ColorStop): number => {
    switch (s.type) {
      case 'min': return min;
      case 'max': return max;
      case 'num':
      case 'formula': return s.value ?? min;
      case 'percent': return min + ((s.value ?? 50) / 100) * (max - min);
      case 'percentile': return min + ((s.value ?? 50) / 100) * (max - min); // aprox.
      default: return min;
    }
  };
  const pts = stops.map((s) => ({
    v: Math.max(min, Math.min(max, resolve(s))),
    color: s.color,
  }));
  if (value <= pts[0]!.v) return pts[0]!.color;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    if (value <= b.v) {
      const span = b.v - a.v;
      return span <= 0 ? b.color : lerpColor(a.color, b.color, (value - a.v) / span);
    }
  }
  return pts[pts.length - 1]!.color;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexRGB(a), pb = hexRGB(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexRGB(c: string): [number, number, number] {
  if (!c) return [128, 128, 128];
  // rgb(r,g,b) / rgba(r,g,b,a)
  const r = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c);
  if (r) return [parseInt(r[1]!, 10), parseInt(r[2]!, 10), parseInt(r[3]!, 10)];
  // #RRGGBB ou #RGB
  const m6 = /#?([0-9a-f]{6})/i.exec(c);
  if (m6) { const n = parseInt(m6[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m3 = /#?([0-9a-f]{3})\b/i.exec(c);
  if (m3) { const s = m3[1]!; return [parseInt(s[0]! + s[0]!, 16), parseInt(s[1]! + s[1]!, 16), parseInt(s[2]! + s[2]!, 16)]; }
  return [128, 128, 128];
}

function evalCellIs(op: string | undefined, v: number, t: number): boolean {
  switch (op) {
    case 'greaterThan': return v > t;
    case 'lessThan': return v < t;
    case 'equal': return v === t;
    case 'notEqual': return v !== t;
    case 'greaterThanOrEqual': return v >= t;
    case 'lessThanOrEqual': return v <= t;
    default: return false;
  }
}

customElements.define('universal-sheet', UniversalSheetElement);
