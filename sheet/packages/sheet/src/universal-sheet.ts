import {
  XlsxPackage, readWorkbook, readSharedStrings, readWorksheet, readStyles,
  refToRowCol, rowColToRef,
  type Workbook, type Worksheet, type Cell, type SharedString, type Styles, type Font, type Fill,
  type Border, type PaneInfo, type CondFormat, type ColDef, type ColorStop,
} from '@universal/sheet-core';

/**
 * <universal-sheet> — webcomponent que renderiza uma pasta de trabalho .xlsx
 * como uma grade (grid) em canvas, fiél ao Excel.
 *
 * Unidades (APROXIMAÇÕES iniciais — a calibrar contra o oráculo numérico
 * Range.ColumnWidth/RowHeight na Camada B, vide ARCHITECTURE.md):
 *   - largura de coluna default: 64px (~8.43 chars da fonte Normal)
 *   - altura de linha default: 20px (15pt × 96/72)
 *   - fonte Normal: "Aptos Narrow 11" (extração real é trabalho futuro,
 *     como no WordNext; por ora cai no fallback do sistema).
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
const SELECTION_BORDER = '#1f6feb';
const SELECTION_FILL = 'rgba(31,111,235,0.10)';
const HEADER_SEL = '#d8e6fb';

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

export interface SheetView {
  worksheet: Worksheet;
  /** Mapa col(1-based) → largura em px (chars→px já convertidos). */
  colWidths: Map<number, number>;
  /** Mapa row(1-based) → altura em px. */
  rowHeights: Map<number, number>;
  hiddenCols: Set<number>;
  hiddenRows: Set<number>;
  merges: Map<string, string>; // top-left ref → range
  pane?: PaneInfo;
  condFormats: CondFormat[];
  maxRow: number;
  maxCol: number;
}

export class UniversalSheetElement extends HTMLElement {
  private host = this.attachShadow({ mode: 'open' });
  private canvas = document.createElement('canvas');
  private status = document.createElement('div');

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
  /** Modo captura: suprime seleção/overlays para pixel-compare com o Excel. */
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
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
    wrap.appendChild(this.status);
    wrap.appendChild(this.canvas);
    this.host.appendChild(wrap);

    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('dblclick', this.onDblClick);
  }

  connectedCallback(): void {
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
    this.shared = readSharedStrings(pkg);
    this.styles = readStyles(pkg);

    this.views = [];
    for (const ref of this.workbook.sheets) {
      if (!ref.target) continue;
      const ws = readWorksheet(pkg, ref.target);
      const colWidths = new Map<number, number>();
      const rowHeights = new Map<number, number>();
      const hiddenCols = new Set<number>();
      const hiddenRows = new Set<number>();
      let maxRow = 0;
      let maxCol = 0;
      // larguras de coluna: <cols> → chars convertido a px (aprox MaxDigitWidth=7)
      for (const cd of ws.cols ?? []) {
        for (let c = cd.min; c <= cd.max; c++) {
          if (cd.hidden) hiddenCols.add(c);
          if (cd.width !== undefined && cd.customWidth) colWidths.set(c, colWidthPx(cd.width));
        }
      }
      for (const row of ws.rows) {
        if (row.hidden) hiddenRows.add(row.r);
        // ht é a altura real usada pelo Excel (presente tb em auto-fit, sem customHeight)
        if (row.height !== undefined) rowHeights.set(row.r, Math.round(row.height * 96 / 72));
        if (row.r > maxRow) maxRow = row.r;
        for (const c of row.cells) {
          const { col } = refToRowCol(c.ref);
          if (col > maxCol) maxCol = col;
        }
      }
      const merges = ws.mergedAreas ?? new Map<string, string>();
      this.views.push({
        worksheet: ws, colWidths, rowHeights, hiddenCols, hiddenRows, merges,
        pane: ws.pane, condFormats: ws.condFormats ?? [],
        maxRow: Math.max(maxRow, 30),
        maxCol: Math.max(maxCol, 26),
      });
    }
    this.sheetIndex = Math.min(0, this.views.length - 1);
    this.scrollX = 0;
    this.scrollY = 0;
    this.sel = { col: 1, row: 1 };
    this.recalcGrid();
    this.emitSelection();
    this.paint();
  }

  /** Reemite o pacote como bytes .xlsx (round-trip lossless). */
  saveXlsx(): Uint8Array {
    if (!this.pkg) throw new Error('Nenhuma pasta de trabalho carregada');
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

  /** Nomes das planilhas (abas). */
  getSheetNames(): string[] {
    return this.workbook?.sheets.map((s) => s.name) ?? [];
  }

  /** Seleciona a aba pelo índice. */
  selectSheet(i: number): void {
    if (i < 0 || i >= this.views.length || i === this.sheetIndex) return;
    this.sheetIndex = i;
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

  /** Move a seleção para uma referência A1 (usada pela barra de fórmulas). */
  goToRef(ref: string): void {
    const rc = refToRowCol(ref);
    this.sel = { col: rc.col, row: rc.row };
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

  // ---- Layout helpers ----

  private colWidth(col: number): number {
    if (this.view?.hiddenCols.has(col)) return 0;
    return (this.view?.colWidths.get(col) ?? DEFAULT_COL_W) * this.zoom;
  }
  private rowHeight(row: number): number {
    if (this.view?.hiddenRows.has(row)) return 0;
    return (this.view?.rowHeights.get(row) ?? DEFAULT_ROW_H) * this.zoom;
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

  /** Busca binária: maior índice i tal que arr[i] <= x. */
  private bisectLE(arr: Float64Array, x: number): number {
    let lo = 0, hi = arr.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((arr[mid] ?? 0) <= x) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }

  private cellAt(mx: number, my: number): { col: number; row: number } | null {
    // xs[i]/ys[i] = borda esquerda/superior da coluna/linha (i+1); bisectLE
    // devolve o ÍNDICE, então a célula é index+1.
    const col = this.bisectLE(this.xs, mx) + 1;
    const row = this.bisectLE(this.ys, my) + 1;
    if (col < 1 || row < 1 || col > (this.view?.maxCol ?? 0) || row > (this.view?.maxRow ?? 0)) return null;
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
    this.paint();
  };

  private onMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    this.canvas.focus();
    if (px < HEADER_W || py < HEADER_H) return;
    const hit = this.cellAt(px - HEADER_W + this.scrollX, py - HEADER_H + this.scrollY);
    if (hit) { this.sel = hit; this.emitSelection(); this.paint(); }
  };

  private onDblClick = (_e: MouseEvent): void => {
    // placeholder edição de célula (fase futura)
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const v = this.view;
    if (!v) return;
    let { col, row } = this.sel;
    switch (e.key) {
      case 'ArrowLeft': col = Math.max(1, col - 1); break;
      case 'ArrowRight': col = Math.min(v.maxCol, col + 1); break;
      case 'ArrowUp': row = Math.max(1, row - 1); break;
      case 'ArrowDown': row = Math.min(v.maxRow, row + 1); break;
      case 'Home': col = 1; break;
      case 'End': col = v.maxCol; break;
      case 'PageDown': row = Math.min(v.maxRow, row + 10); break;
      case 'PageUp': row = Math.max(1, row - 10); break;
      default: return;
    }
    e.preventDefault();
    this.sel = { col, row };
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  };

  private ensureVisible(): void {
    const { col, row } = this.sel;
    const left = this.xs[col - 1] ?? 0;
    const right = this.xs[col] ?? 0;
    const top = this.ys[row - 1] ?? 0;
    const bottom = this.ys[row] ?? 0;
    const vw = this.canvas.clientWidth - HEADER_W;
    const vh = this.canvas.clientHeight - HEADER_H;
    if (left < this.scrollX) this.scrollX = left;
    else if (right > this.scrollX + vw) this.scrollX = right - vw;
    if (top < this.scrollY) this.scrollY = top;
    else if (bottom > this.scrollY + vh) this.scrollY = bottom - vh;
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

    if (!this.view) {
      ctx.fillStyle = '#888';
      ctx.font = '14px Segoe UI, Arial';
      ctx.fillText('Nenhum .xlsx carregado', 20, 30);
      return;
    }

    this.status.textContent = rowColToRef(this.sel.col, this.sel.row);

    ctx.save();
    // área de dados transladada para baixo do/direita do cabeçalho
    ctx.translate(HEADER_W, HEADER_H);
    this.paintGrid(ctx, W - HEADER_W, H - HEADER_H);
    ctx.restore();

    this.paintHeaders(ctx, W, H);
    this.paintScrollbars(ctx, W, H);
  }

  private paintGrid(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    const v = this.view!;
    const firstCol = Math.max(1, this.bisectLE(this.xs, this.scrollX) + 1);
    const lastCol = Math.min(v.maxCol, this.bisectLE(this.xs, this.scrollX + vw) + 1);
    const firstRow = Math.max(1, this.bisectLE(this.ys, this.scrollY) + 1);
    const lastRow = Math.min(v.maxRow, this.bisectLE(this.ys, this.scrollY + vh) + 1);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, vw, vh);

    // índice de células por ref para acesso rápido
    const rowMap = new Map<number, Map<number, Cell>>();
    for (const r of v.worksheet.rows) {
      const cm = new Map<number, Cell>();
      for (const c of r.cells) cm.set(refToRowCol(c.ref).col, c);
      rowMap.set(r.r, cm);
    }
    // cache numérico para cond. format (rebuild por paint)
    this.condNumMap.clear();
    if (v.condFormats.length > 0) {
      for (const r of v.worksheet.rows) {
        for (const c of r.cells) {
          if (c.type === 's') continue;
          const n = parseFloat(c.value ?? 'NaN');
          if (!Number.isNaN(n)) this.condNumMap.set(`${refToRowCol(c.ref).col},${r.r}`, n);
        }
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, vw, vh);
    ctx.clip();

    for (let row = firstRow; row <= lastRow; row++) {
      if (v.hiddenRows.has(row)) continue;
      const top = (this.ys[row - 1] ?? 0) - this.scrollY;
      const h = this.rowHeight(row);
      if (h <= 0) continue;
      const cells = rowMap.get(row);
      for (let col = firstCol; col <= lastCol; col++) {
        if (v.hiddenCols.has(col)) continue;
        const left = (this.xs[col - 1] ?? 0) - this.scrollX;
        const w = this.colWidth(col);
        if (w <= 0) continue;

        // célula mesclada? origem desenha o span todo; cobertas são puladas
        const m = this.mergeAt(col, row);
        if (m && !m.isOrigin) continue;
        let drawW = w, drawH = h;
        if (m) {
          drawW = (this.xs[m.lastCol] ?? 0) - (this.xs[m.firstCol - 1] ?? 0);
          drawH = (this.ys[m.lastRow] ?? 0) - (this.ys[m.firstRow - 1] ?? 0);
        }

        const cell = cells?.get(col);
        const st = this.resolveStyle(cell);

        // preenchimento (fill sólido do estilo)
        if (st.fill?.fgColor) { ctx.fillStyle = st.fill.fgColor; ctx.fillRect(left, top, drawW, drawH); }
        // formatação condicional (cor/barras/destaque)
        this.paintCondFormat(ctx, cell, col, row, left, top, drawW, drawH);
        // texto
        this.paintCell(ctx, cell, st, left, top, drawW, drawH);
        // bordas
        if (st.border) this.paintBorder(ctx, st.border, left, top, drawW, drawH);
      }
    }

    // grid lines (após células)
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = firstCol; col <= lastCol + 1; col++) {
      const x = Math.round((this.xs[col - 1] ?? 0) - this.scrollX) + 0.5;
      ctx.moveTo(x, 0); ctx.lineTo(x, vh);
    }
    for (let row = firstRow; row <= lastRow + 1; row++) {
      const y = Math.round((this.ys[row - 1] ?? 0) - this.scrollY) + 0.5;
      ctx.moveTo(0, y); ctx.lineTo(vw, y);
    }
    ctx.stroke();

    this.paintSelection(ctx);
    ctx.restore();
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
            const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
            ctx.fillStyle = rule.barColor ?? '#638EC6';
            ctx.fillRect(left + 2 * this.zoom, top + h * 0.25, (w - 4 * this.zoom) * frac, h * 0.5);
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
  ): void {
    const display = this.displayText(cell);
    if (display === '') return;
    const font = st.font;
    // sz do xlsx é em PONTOS → px@96dpi (11pt = 14.67px, NÃO 11px)
    const size = (font?.size ?? 11) * 96 / 72 * this.zoom;
    const style = font?.italic ? 'italic ' : '';
    const weight = font?.bold ? '700 ' : '400 ';
    ctx.font = `${style}${weight}${size}px 'Aptos Narrow', ${font?.name ?? 'Segoe UI'}, Arial, sans-serif`;
    ctx.fillStyle = font?.color ?? TEXT;

    const pad = 3 * this.zoom;          // margem horizontal interna do Excel (~3px)
    let ta: CanvasTextAlign = 'left';
    if (st.align) ta = st.align === 'center' ? 'center' : st.align === 'right' ? 'right' : 'left';
    else if (this.isNumericCell(cell)) ta = 'right';   // General: números/datas à direita
    ctx.textAlign = ta;
    ctx.textBaseline = 'alphabetic';

    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 0.5, top + 0.5, w - 1, h - 1);
    ctx.clip();

    if (st.wrap) {
      const lines = this.wrapText(ctx, display, w - pad * 2);
      const lineH = size * 1.2;
      const totalH = lines.length * lineH;
      let startY: number;
      const va = st.valign ?? 'bottom';
      if (va === 'top') startY = top + pad + size * 0.85;
      else if (va === 'center') startY = top + (h - totalH) / 2 + size * 0.85;
      else startY = top + h - pad - totalH + size * 0.85;
      const x = ta === 'right' ? left + w - pad : ta === 'center' ? left + w / 2 : left + pad;
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i]!, x, startY + i * lineH);
    } else {
      // posicionamento vertical pelas MéTRICAS REAIS da fonte (measureText).
      // Excel default = bottom: a caixa do texto (baseline+descent) fica a ~2px do fundo.
      const m = ctx.measureText(display);
      const asc = m.actualBoundingBoxAscent || size * 0.8;
      const desc = m.actualBoundingBoxDescent || size * 0.2;
      const va = st.valign ?? 'bottom';
      let y: number;
      if (va === 'top') y = top + 2 * this.zoom + asc;
      else if (va === 'center') y = top + (h + asc - desc) / 2;
      else y = top + h - 2 * this.zoom - desc;
      const x = ta === 'right' ? left + w - pad : ta === 'center' ? left + w / 2 : left + pad;
      ctx.fillText(display, x, y);
    }
    ctx.restore();
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

  private paintSelection(ctx: CanvasRenderingContext2D): void {
    if (this.capture) return; // modo captura: Excel CopyPicture não inclui seleção
    const { col, row } = this.sel;
    const left = (this.xs[col - 1] ?? 0) - this.scrollX;
    const top = (this.ys[row - 1] ?? 0) - this.scrollY;
    const w = this.colWidth(col);
    const h = this.rowHeight(row);
    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(left, top, w, h);
    ctx.strokeStyle = SELECTION_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, w - 2, h - 2);
  }

  private paintHeaders(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const v = this.view!;
    // corner
    ctx.fillStyle = CORNER_BG;
    ctx.fillRect(0, 0, HEADER_W, HEADER_H);

    // colunas
    ctx.fillStyle = COL_HEADER_BG;
    ctx.fillRect(HEADER_W, 0, W - HEADER_W, HEADER_H);
    ctx.fillStyle = ROW_HEADER_BG;
    ctx.fillRect(0, HEADER_H, HEADER_W, H - HEADER_H);

    ctx.font = `600 ${11 * this.zoom}px 'Aptos Narrow', Segoe UI, Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const firstCol = Math.max(1, this.bisectLE(this.xs, this.scrollX) + 1);
    const lastCol = Math.min(v.maxCol, this.bisectLE(this.xs, this.scrollX + (W - HEADER_W)) + 1);
    for (let col = firstCol; col <= lastCol; col++) {
      const left = HEADER_W + (this.xs[col - 1] ?? 0) - this.scrollX;
      const w = this.colWidth(col);
      ctx.fillStyle = col === this.sel.col ? HEADER_SEL : '#5a5a5a';
      const letters = colLetters(col);
      ctx.fillText(letters, left + w / 2, HEADER_H / 2);
    }

    const firstRow = Math.max(1, this.bisectLE(this.ys, this.scrollY) + 1);
    const lastRow = Math.min(v.maxRow, this.bisectLE(this.ys, this.scrollY + (H - HEADER_H)) + 1);
    for (let row = firstRow; row <= lastRow; row++) {
      const top = HEADER_H + (this.ys[row - 1] ?? 0) - this.scrollY;
      const h = this.rowHeight(row);
      ctx.fillStyle = row === this.sel.row ? HEADER_SEL : '#5a5a5a';
      ctx.fillText(String(row), HEADER_W / 2, top + h / 2);
    }

    // borda inferior/direita dos cabeçalhos
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
    if (!cell) return '';
    if (cell.type === 's' && cell.value !== undefined) {
      return this.shared[parseInt(cell.value, 10)]?.text ?? '';
    }
    if (cell.type === 'inlineStr') return cell.inlineString?.text ?? '';
    if (cell.type === 'b') return cell.value === '1' ? 'TRUE' : 'FALSE';
    if (cell.type === 'e') return cell.value ?? '';
    if (cell.value === undefined) return '';
    // numérico/data (default 'n', 'str', 'd'): aplica formato
    const { numFmtId } = this.resolveStyle(cell);
    const code = this.styles.numFmts.get(numFmtId) ?? BUILTIN_FMTS[numFmtId];
    if (code && code !== 'General') {
      const n = parseFloat(cell.value);
      if (!Number.isNaN(n)) {
        if (isDateCode(code)) return formatDate(n, code);
        return formatNumeric(n, code);
      }
    }
    return cell.value;
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

/** Formatos built-in mais comuns (numFmtId → código). */
const BUILTIN_FMTS: Record<number, string> = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00',
  9: '0%', 10: '0.00%',
  // datas/horas (built-in 14-22)
  14: 'm/d/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy',
  18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss',
  22: 'm/d/yyyy h:mm',
  37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)',
  45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 48: '##0.0E+0', 49: '@',
};

/**
 * Converte largura de coluna (unidades de caractere, atributo width do <col>)
 * → pixels @96dpi. Fórmula do OOXML com MaxDigitWidth=7 (Aptos Narrow 11):
 *   px = floor( ((256*w + floor(128/MDW)) / 256) * MDW )
 * (não é w*7+5 — aquela superestima em ~5px por coluna).
 */
function colWidthPx(width: number): number {
  const MDW = 7;
  return Math.floor(((256 * width + Math.floor(128 / MDW)) / 256) * MDW);
}

/** Remove literais ("..." e \x) — para detectar se é formato de data/hora. */
function stripLiterals(code: string): string {
  let out = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') { const end = code.indexOf('"', i + 1); if (end > i) { i = end; continue; } }
    if (ch === '\\') { i++; continue; }
    out += ch;
  }
  return out;
}

/** True se o formatCode descreve data/hora (possui tokens y/m/d/h/s ou AM/PM). */
function isDateCode(code: string): boolean {
  const s = stripLiterals(code);
  return /[ymdhs]/i.test(s) || /A\/P/i.test(s) || /AM\/PM/i.test(s);
}

/**
 * Formata um número segundo um formatCode Excel (escapes \x, literais "...")
 * — agrupamento de milhar, casas decimais, porcentagem, prefixos/sufixos.
 */
export function formatNumeric(value: number, code: string): string {
  const neg = value < 0;
  let v = Math.abs(value);

  // spec numérico = primeira sequência de [0#?.,%]
  const specMatch = code.match(/[0#?][0#?.,%]*/);
  const numSpec = specMatch ? specMatch[0] : '';
  const hasPercent = numSpec.includes('%');
  if (hasPercent) v = v * 100;

  let decimals = 0;
  const dotIdx = numSpec.lastIndexOf('.');
  if (dotIdx >= 0) decimals = (numSpec.slice(dotIdx + 1).match(/[0#?]/g) ?? []).length;
  const group = numSpec.includes(',');
  const formatted = v.toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: group,
  }) + (hasPercent ? '%' : '');

  // monta saída substituindo o spec pelo número; o resto é literal (quotes/escapes)
  let out = '';
  let i = 0;
  let specEmitted = false;
  const negSign = neg ? '-' : '';
  while (i < code.length) {
    const ch = code[i]!;
    if (!specEmitted && numSpec && code.startsWith(numSpec, i)) {
      out += negSign + formatted; i += numSpec.length; specEmitted = true; continue;
    }
    if (ch === '"') { const end = code.indexOf('"', i + 1); if (end > i) { out += code.slice(i + 1, end); i = end + 1; continue; } }
    if (ch === '\\') { out += code[i + 1] ?? ''; i += 2; continue; }
    if ('0#?.,%'.includes(ch)) { i++; continue; } // partes do spec já tratadas
    out += ch; i++;
  }
  if (!specEmitted) out = negSign + formatted + out; // spec implícito (ex.: só literals? raro)
  if (neg && (specEmitted)) { /* sinal já incluído */ }
  return out;
}

const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MONTHS_SHORT_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DAYS_PT = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const DAYS_SHORT_PT = ['dom','seg','ter','qua','qui','sex','sáb'];

/** Serial OLE (dias desde 1899-12-30) → Date (em UTC para evitar tz). */
function serialToDate(serial: number): Date {
  const ms = Math.round(serial * 86400000);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}

/**
 * Formata uma data/hora segundo um formatCode Excel. Escapes \x tratam letras
 * de data como tokens (comportamento do Excel em formatos portáteis).
 * Locale pt-BR para nomes de mês/dia (calibrar depois).
 */
export function formatDate(serial: number, code: string): string {
  const d = serialToDate(serial);
  const yr = d.getUTCFullYear();
  const mo = d.getUTCMonth();        // 0-11
  const day = d.getUTCDate();
  const wd = d.getUTCDay();          // 0-6 (dom..sáb)
  const h24 = d.getUTCHours();
  const min = d.getUTCMinutes();
  const sec = d.getUTCSeconds();
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  let out = '';
  let i = 0;
  let prevTime = false; // disambiguar m (mês) vs minuto: minuto após h
  while (i < code.length) {
    const ch = code[i]!;
    if (ch === '"') { const end = code.indexOf('"', i + 1); if (end > i) { out += code.slice(i + 1, end); i = end + 1; continue; } }
    if (ch === '\\') { out += code[i + 1] ?? ''; i += 2; continue; } // \x = literal (Excel tb)
    if (/AM\/PM/i.test(code.slice(i, i + 5))) { out += ampm; i += 5; prevTime = false; continue; }
    if (/A\/P/i.test(code.slice(i, i + 3))) { out += ampm.slice(0, 1); i += 3; continue; }
    if (/[ymdhs]/i.test(ch)) {
      // conta run da mesma letra
      let run = '';
      while (i < code.length && code[i]!.toLowerCase() === ch.toLowerCase()) { run += code[i]; i++; }
      const L = run.length;
      const lower = ch.toLowerCase();
      if (lower === 'y') out += (L >= 3 ? String(yr) : String(yr).slice(-2).padStart(2, '0'));
      else if (lower === 'd') {
        if (L >= 4) out += DAYS_PT[wd] ?? '';
        else if (L === 3) out += DAYS_SHORT_PT[wd] ?? '';
        else out += (L === 2 ? String(day).padStart(2, '0') : String(day));
      } else if (lower === 'h') {
        const hh = code.includes('AM/PM') || code.includes('a/p') ? h12 : h24;
        out += (L === 2 ? String(hh).padStart(2, '0') : String(hh));
        prevTime = true;
      } else if (lower === 'm') {
        if (prevTime) out += (L === 2 ? String(min).padStart(2, '0') : String(min));
        else if (L >= 4) out += MONTHS_PT[mo] ?? '';
        else if (L === 3) out += MONTHS_SHORT_PT[mo] ?? '';
        else out += (L === 2 ? String(mo + 1).padStart(2, '0') : String(mo + 1));
      } else if (lower === 's') {
        out += (L === 2 ? String(sec).padStart(2, '0') : String(sec));
      }
      continue;
    }
    out += ch; i++;
  }
  return out;
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
function colorScaleColor(stops: ColorStop[], value: number, sqref: string, vals: Map<string, number>): string | undefined {
  if (stops.length < 2) return stops[0]?.color;
  const { min, max } = rangeMinMax(sqref, vals);
  if (max <= min) return stops[0]!.color;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const c0 = stops[0]!.color, c1 = stops[1]!.color;
  if (stops.length === 2) return lerpColor(c0, c1, t);
  const mid = 0.5;
  return t <= mid ? lerpColor(c0, c1, t / mid) : lerpColor(c1, stops[2]!.color, (t - mid) / mid);
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexRGB(a), pb = hexRGB(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexRGB(c: string): [number, number, number] {
  const m = /#?([0-9a-f]{6})/i.exec(c);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
