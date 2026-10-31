import { FontResolver, variantOf } from '@universal-office/fonts';
import {
  ColorSchemeWatcher, PluginRegistry, forceColorScheme, onBrowserLangChange, pickLabels, themeMode, uiLang,
  type BarContribution, type BarNoticeTone, type ColorScheme, type UiLang,
} from '@universal-office/ui';
import {
  XlsxPackage, openSpreadsheet, readWorkbook, readSharedStrings, readWorksheet, readStyles, colorContext,
  refToRowCol, rowColToRef, formatValue, builtinFormatCode, updateWorksheetXml, blankXlsx,
  chartModelFor, paintChart, excelMdw, excelRowPx, colWidthToPx, defaultColPx, rowPtToPx, ppemOf, measuredFamily,
  type ChartModel, type Theme,
  type Workbook, type Worksheet, type Cell, type SharedString, type Styles, type Font, type Fill,
  type Border, type BorderEdge, type PaneInfo, type CondFormat, type ColDef, type FormatResult,
  type Comment, type DrawingChart, type DrawingObject, type Hyperlink, type RichRun, type RunProps,
  themePath,
} from '@universal-office/sheet-core';
import { SheetDrawings, anchorRect, type Rect } from './drawings.js';
import {
  bisectLE, pxToIndex, indexScreenPos, boundaryAt, pxToColWidthChars, pxToRowHeightPt,
  layoutRichLines, MergeIndex, type MergeRect,
} from './grid-layout.js';
import { defaultXfMaps, xfIndexAt } from './cell-format.js';
import { adjustDecimals, numberFormatFor, type NumberFormatKind } from './number-formats.js';
import type { UniversalSheetPlugin, UniversalSheetBarKit } from './plugins.js';
import { paintCellFill, hasFill } from './fills.js';
import { buildTableLayer, applyTableLayer, paintTableHandle, type TableCellFormat } from './table-styles.js';
import { CfEngine, cellCfValue, todaySerial, paintDataBar, type CfResult, type CfSheetAccess } from './cond-format.js';
import { paintCfIcon } from './cf-icons.js';
import { saveCalc } from './calc-io.js';
import { winningEdge, edgeExtent, paintHEdge, paintVEdge, paintDiagonals, NO_CORNER, type CornerInfo } from './borders.js';
import {
  layoutCellText, isoToSerial, cellMarginPx, MAX_CELL_CHARS, autofitWrapWidthPx, looksLikeNumberPtBR,
  type CellText, type CellTextInput,
} from './cell-text.js';
import { CellFonts, rowDescentPx, type CellFont } from './text-metrics.js';
import { paintCellText, paintRichText, paintErrorMark, wrapLines, type RichRunStyle } from './cell-paint.js';
import { SheetCalc, type BarText, type EditResult, type StyleChange, type FontChange, type AlignChange } from './sheet-calc.js';
import { formulaLocale } from './formula-locale.js';
import { FormulaAutocomplete } from './formula-autocomplete.js';
import { paintSpillBorder } from './spill-border.js';
import { functionNames, localFunctionName } from '@universal-office/sheet-calc';

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

/** Textos da interface (idioma: `lang` do elemento ou do navegador). */
const UI_TEXT = {
  en: { empty: 'No .xlsx loaded' },
  pt: { empty: 'Nenhum .xlsx carregado' },
  es: { empty: 'No se ha cargado ningún .xlsx' },
};

/**
 * CSS do shadow root: a grade ocupa o elemento inteiro; com `topbar`/`bottombar`
 * as barras (chrome.ts) entram acima e abaixo dela. Barra vazia some.
 */
const FRAME_CSS = `
.us-frame { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; }
.us-grid { position: relative; flex: 1 1 auto; width: 100%; min-height: 0; overflow: hidden; }
.us-topbar, .us-bottombar { flex: none; position: relative; z-index: 3; }
.us-topbar:empty, .us-bottombar:empty { display: none; }
`;

const HEADER_W = 46;
const HEADER_H = 22;
const DEFAULT_COL_W = 64;
const DEFAULT_ROW_H = 20;
const MAX_ROW_DEFAULT = 200;
const MAX_COL_DEFAULT = 52;

const COL_HEADER_BG = '#f6f6f6';
const ROW_HEADER_BG = '#f6f6f6';
const CORNER_BG = '#ececec';
/** Linha de grade do Excel 365 (medida na imagem vinculada: #E0E0E0). */
const GRID_LINE = '#e0e0e0';
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
  /** Níveis de recuo (alignment indent). */
  indent: number;
  /** Rotação do texto (0 = horizontal; 1–90 anti-horário, 91–180 horário, 255 empilhado). */
  rotation: number;
  /** Formato numérico vindo da formatação condicional (vence o do xf). */
  numFmtCode?: string;
  /** Camada da formatação condicional (barra/ícone/ocultar valor). */
  cf?: CfResult;
}

export interface SheetView {
  worksheet: Worksheet;
  /** Caminho da parte no pacote (xl/worksheets/sheetN.xml) — p/ persistir edições. */
  path: string;
  /** Mapa col(1-based) → largura em px (chars→px já convertidos). */
  colWidths: Map<number, number>;
  /** Mapa row(1-based) → altura em px. */
  rowHeights: Map<number, number>;
  /** Mapa row → maior descent (px a 100%) das fontes da linha: base compartilhada. */
  rowDesc: Map<number, number>;
  hiddenCols: Set<number>;
  hiddenRows: Set<number>;
  merges: Map<string, string>; // top-left ref → range
  pane?: PaneInfo;
  condFormats: CondFormat[];
  showGridLines: boolean;
  /** `showZeros="0"`: valores numéricos zero são exibidos em branco. */
  showZeros: boolean;
  maxRow: number;
  maxCol: number;
  /** "col,row" -> comment (lookup O(1) por celula no paint). */
  commentAt: Map<string, Comment>;
  /** Charts ancorados via drawings1.xml — pintados por cima do grid. */
  charts: DrawingChart[];
  /** Imagens/formas/grupos do mesmo desenho (z-order intercalado com os charts). */
  drawings: DrawingObject[];
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
   * Camada de estilo de TABELA (ListObject) e de tabela dinâmica por célula
   * ("col,row"), abaixo da formatação direta — ver table-styles.ts.
   */
  tableFmt: Map<string, TableCellFormat>;
  /** Botões de autofiltro ("col,row" → filtro ativo?) de tabelas e da planilha. */
  filterAt: Map<string, boolean>;
  /** Última célula de cada tabela ("col,row"): alça de redimensionar. */
  tableEnds: Set<string>;
  /** Ranges (1-based, inclusivos) com validação de LISTA — dropdown na seleção. */
  listValRanges: { c1: number; r1: number; c2: number; r2: number }[];
  /** Índice espacial das mesclas (lazy, ver mergeAt). */
  mergeIndex?: MergeIndex;
  /**
   * Estilos-padrão das células AUSENTES do XML (medido no Excel): o da linha
   * (`<row s customFormat="1">`) vence o da coluna (`<col style>`); célula
   * presente sem `s` usa o estilo 0.
   */
  rowXf: Map<number, number>;
  colXf: Map<number, number>;
}



/**
 * Substituto do Excel para família que não existe (nem no SO, nem embarcada):
 * a ARIAL — medido (lab e31: "Statis Sans", "Helvetica Neue" e um nome
 * inventado têm as mesmas larguras da Arial no `@*.`; a altura da linha também,
 * grid-metrics). Sem a Arial, o resolvedor cai na Liberation Sans (métrica igual).
 */
const SHEET_FALLBACKS = ['Arial'];
/** Texto de FORMA com família ausente: o motor de texto do Office (o mesmo do PowerPoint) cai na Calibri. */
const SHAPE_FALLBACKS = ['Calibri', 'Aptos'];

/** Fallbacks da fonte da célula: o nome gravado de uma fonte do TEMA (ex.: 宋体
 *  numa pasta chinesa) vem antes, para a escrita que a fonte latina não cobre. */
function fallbacksOf(font: Font | undefined): string[] {
  return font?.altName ? [font.altName, ...SHEET_FALLBACKS] : SHEET_FALLBACKS;
}

/** Sobrescrito/subscrito da célula inteira: o Excel desenha a fonte a ~2/3 do tamanho. */
function scriptFont(font: Font | undefined): Font | undefined {
  return font?.vertAlign ? { ...font, size: Math.max(1, Math.round((font.size ?? 11) * 2 / 3 * 2) / 2) } : font;
}

/** Deslocamento da linha de base (px, + = para baixo) do sobrescrito/subscrito da célula. */
function scriptShift(font: Font | undefined, zoom: number): number {
  if (!font?.vertAlign) return 0;
  const ppem = (font.size ?? 11) * 96 / 72 * zoom;
  return Math.round(font.vertAlign === 'superscript' ? -ppem * 0.33 : ppem * 0.14);
}

export class UniversalSheetElement extends HTMLElement {
  private shadow = this.attachShadow({ mode: 'open' });
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
  /** Coluna do shadow root: barra superior, grade e barra inferior (as barras vazias somem). */
  private frame = document.createElement('div');
  private topbarEl = document.createElement('div');
  private bottombarEl = document.createElement('div');

  private workbook: Workbook | null = null;
  private pkg: XlsxPackage | null = null;
  private shared: SharedString[] = [];
  private styles: Styles = { numFmts: new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  private views: SheetView[] = [];
  private sheetIndex = 0;

  private zoom = 1;
  private scrollX = 0;
  private scrollY = 0;
  /** Célula ATIVA (onde a digitação entra; a origem da mescla). */
  private sel = { col: 1, row: 1 };
  /** Canto oposto da seleção (Shift+setas, Shift+clique, arrastar): o intervalo vai de `sel` a `corner`. */
  private corner = { col: 1, row: 1 };
  /** Intervalo selecionado (1-based, inclusivo), expandido para conter as mesclas inteiras. */
  private range = { c1: 1, r1: 1, c2: 1, r2: 1 };

  /** Posição x acumulada por borda de coluna (0..maxCol+1), coords locais. */
  private xs: Float64Array = new Float64Array(0);
  private ys: Float64Array = new Float64Array(0);
  /**
   * Motor de formatação condicional por aba (regras + estatísticas das
   * células existentes, cacheadas; invalidado em load/edição) — cond-format.ts.
   */
  private cfEngines = new Map<number, CfEngine | null>();
  /** Cache do índice célula-por-ref por aba (invalidado em load/edição). */
  private rowMapCache = new Map<number, Map<number, Map<number, Cell>>>();
  /** Tooltip de comentário (nota amarela) exibido no hover. */
  private commentTip: HTMLDivElement | null = null;
  private commentTipKey = '';
  /** Modo captura: suprime seleção/overlays para pixel-compare com o app de referência. */
  capture = false;
  /**
   * Motor de cálculo (sheet-calc.ts): edição → recálculo → valores no modelo;
   * idioma das fórmulas pelo atributo `formula-locale` (padrão: navegador).
   */
  private readonly calc = new SheetCalc(this.calcHost(), formulaLocale(this.getAttribute('formula-locale')));
  /** Autocompletar de funções do editor da célula. */
  private readonly autocomplete = new FormulaAutocomplete(this.wrap, () => this.calc.locale);

  /**
   * `lang`: idioma da INTERFACE (textos do componente); sem ele, o do navegador
   * — inglês por padrão (@universal-office/ui). Independe de `formula-locale`
   * (idioma das fórmulas e região dos números).
   */
  static get observedAttributes(): string[] {
    return ['formula-locale', 'lang', 'topbar', 'bottombar', 'toolbar', 'hidden-commands', 'theme'];
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'formula-locale') { this.formulaLocale = value; }
    else if (name === 'lang') { this.paint(); if (this.isConnected) void this.updateChrome(); }
    // theme="light|dark" força o color-scheme; auto/ausente herda o do contexto
    else if (name === 'theme') this.applyColorScheme();
    // topbar/bottombar ligam as barras; toolbar="compact|ribbon" escolhe a superior
    else if (this.isConnected) void this.updateChrome();
  }

  // ─────────────────────── barras (chrome) e plugins ───────────────────────

  /** Barra superior (menus e ferramentas, como o Excel): atributo `topbar`. */
  get topbar(): boolean { return this.hasAttribute('topbar'); }
  set topbar(v: boolean) { if (v) this.setAttribute('topbar', ''); else this.removeAttribute('topbar'); }

  /** Barra inferior (abas das planilhas e barra de status): atributo `bottombar`. */
  get bottombar(): boolean { return this.hasAttribute('bottombar'); }
  set bottombar(v: boolean) { if (v) this.setAttribute('bottombar', ''); else this.removeAttribute('bottombar'); }

  /** Integração opcional com o app hospedeiro (Electron: diálogos nativos, tema da janela…) — ver UniversalSheetHost. */
  host: import('./chrome-host.js').UniversalSheetHost | null = null;

  private chromeSync: (() => void) | null = null;
  private chromeNotice: ((notice: { el: HTMLElement; tone: BarNoticeTone } | null) => void) | null = null;
  private chromeReq = 0;
  private noticeState: { el: HTMLElement; tone: BarNoticeTone } | null = null;
  private hiddenCommandList: readonly string[] | null = null;

  /**
   * (Re)monta as barras conforme `topbar`/`bottombar`/`toolbar`/`lang`/plugins.
   * O módulo das barras é importado sob demanda: sem os atributos o elemento não
   * carrega nada dele (a grade fica como sempre foi).
   */
  private async updateChrome(): Promise<void> {
    const topbar = this.topbar, bottombar = this.bottombar;
    const req = ++this.chromeReq;
    if (!topbar && !bottombar) {
      if (this.chromeSync) {
        this.chromeSync = null;
        this.chromeNotice = null;
        const { teardownChrome } = await import('./chrome.js');
        if (req === this.chromeReq) teardownChrome(this);
      }
      return;
    }
    const { setupChrome, barKit } = await import('./chrome.js');
    if (req !== this.chromeReq || !this.isConnected) return; // superado por outra mudança
    const lang = uiLang(this);
    const handle = setupChrome(this, this.topbarEl, this.bottombarEl, { topbar, bottombar, lang, contributions: this.toolbarContributions(lang, barKit) });
    this.chromeSync = handle.sync;
    this.chromeNotice = handle.setNotice;
    handle.setNotice(this.noticeState);
  }

  /** As barras sincronizam (estado dos botões) — um por quadro. */
  private syncChrome(): void { this.chromeSync?.(); }

  /**
   * Ids ocultos nas barras, menus, menu de contexto e atalhos — comandos
   * (`new`, `open`, `print`…), menus (`file`), grupos e guias. Atributo
   * `hidden-commands` (vírgula ou espaço) ou esta propriedade — como no Write.
   */
  get hiddenCommands(): readonly string[] {
    return this.hiddenCommandList ?? (this.getAttribute('hidden-commands') ?? '').split(/[\s,]+/).filter(Boolean);
  }
  set hiddenCommands(ids: readonly string[]) {
    this.hiddenCommandList = [...ids];
    if (this.isConnected) void this.updateChrome();
  }

  /**
   * Faixa de aviso do hospedeiro ENTRE a linha de título/menus e as ferramentas
   * (como o Write). Só aparece com `topbar`; sobrevive à troca de barra e de
   * idioma. `null` tira o aviso.
   */
  setNotice(el: HTMLElement | null, options: { tone?: BarNoticeTone } = {}): void {
    this.noticeState = el ? { el, tone: options.tone ?? 'info' } : null;
    this.chromeNotice?.(this.noticeState);
  }

  /** Elemento do aviso atual ({@link setNotice}), ou null. */
  get notice(): HTMLElement | null { return this.noticeState?.el ?? null; }

  // ── claro/escuro: color-scheme do contexto (theme="light|dark" força) ──
  private readonly colorScheme = new ColorSchemeWatcher(this.shadow, this, (scheme) => {
    this.dispatchEvent(new CustomEvent('us-theme-change', { detail: { theme: scheme } }));
  });

  /** Tema efetivo da interface ('light' | 'dark'): o `color-scheme` do contexto ou o atributo `theme`. */
  get effectiveTheme(): ColorScheme { return this.colorScheme.scheme; }

  private applyColorScheme(): void {
    const m = themeMode(this.getAttribute('theme'));
    forceColorScheme(this.shadow, m === 'auto' ? null : m);
    if (this.colorScheme.connected) this.colorScheme.refresh();
  }

  // ── plugins (o mesmo modelo do <universal-write>) ──
  private readonly plugins = new Map<string, UniversalSheetPlugin>();
  private readonly pluginCleanups = new Map<string, () => void>();

  /** Registro GLOBAL (o `Quill.register`): vale para todas as instâncias, as de agora e as próximas. */
  static readonly registry = new PluginRegistry<UniversalSheetPlugin, UniversalSheetElement>({
    name: 'universal-sheet',
    install: (el, p) => { if (el.plugins.has(p.id)) return false; el.use(p); return true; },
    uninstall: (el, p) => { if (el.plugins.get(p.id) === p) el.unuse(p.id); },
  });

  static register(plugin: UniversalSheetPlugin): void { UniversalSheetElement.registry.register(plugin); }
  static unregister(id: string): boolean { return UniversalSheetElement.registry.unregister(id); }

  /** Instala um plugin nesta instância (`setup` e, com barras, a contribuição `toolbar`). */
  use(plugin: UniversalSheetPlugin): this {
    if (!plugin?.id) throw new Error('plugin sem id');
    if (this.plugins.has(plugin.id)) throw new Error(`plugin "${plugin.id}" já instalado`);
    this.plugins.set(plugin.id, plugin);
    try {
      const cleanup = plugin.setup?.({ sheet: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (e) {
      this.plugins.delete(plugin.id);
      throw e;
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    return this;
  }

  /** Tira o plugin (chama a limpeza do `setup`). */
  unuse(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    try { this.pluginCleanups.get(id)?.(); } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    return true;
  }

  pluginIds(): string[] { return [...this.plugins.keys()]; }

  /** Contribuições dos plugins para as barras; o que falha fica de fora (com aviso). */
  private toolbarContributions(lang: UiLang, ui: UniversalSheetBarKit): BarContribution[] {
    const out: BarContribution[] = [];
    const kit: UniversalSheetBarKit = { ...ui, createBarButton: (o) => ui.createBarButton({ lang, ...o }) };
    for (const plugin of this.plugins.values()) {
      if (!plugin.toolbar) continue;
      try { out.push(plugin.toolbar({ sheet: this, lang, theme: this.effectiveTheme, ui: kit })); } catch (e) {
        console.warn(`[universal-sheet] plugin "${plugin.id}": toolbar falhou`, e);
      }
    }
    return out;
  }

  /** Textos da interface no idioma atual. */
  private get uiText(): typeof UI_TEXT.en { return pickLabels(this, UI_TEXT); }
  private unsubscribeLang: (() => void) | null = null;

  /** Idioma/região das fórmulas ("pt-BR", "en-US", …; null = do navegador). */
  get formulaLocale(): string { return this.calc.locale.region; }
  set formulaLocale(tag: string | null) {
    this.calc.locale = formulaLocale(tag);
    if (this.views.length) { this.emitSelection(); this.paint(); }
  }

  /**
   * Gancho do carregamento (CALC-IO): recalcular a pasta inteira ao abrir?
   * Sem ele os valores exibidos são os gravados no arquivo.
   */
  get shouldRecalcOnOpen(): ((wb: Workbook) => boolean) | null { return this.calc.recalcOnOpen; }
  set shouldRecalcOnOpen(fn: ((wb: Workbook) => boolean) | null) { this.calc.recalcOnOpen = fn; }

  /** Caminho/nome do arquivo (o hospedeiro informa antes de carregar): CELL("filename"), INFO("directory"). */
  get fileName(): string | undefined { return this.calc.fileName; }
  set fileName(name: string | undefined) { this.calc.fileName = name; }

  private calcHost(): ConstructorParameters<typeof SheetCalc>[0] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get workbook() { return self.workbook; },
      get views() { return self.views; },
      get shared() { return self.shared; },
      get styles() { return self.styles; },
      cellIndex: (view) => self.cellIndex(self.views[view]!, view),
      touched: (view) => { self.cfEngines.delete(view); self.dirtySheets.add(view); },
    };
  }

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
    this.wrap.className = 'us-grid';
    this.wrap.appendChild(this.status);
    this.wrap.appendChild(this.canvas);
    // barras opcionais (topbar/bottombar): vazias sem os atributos — a grade ocupa tudo
    const style = document.createElement('style');
    style.textContent = FRAME_CSS;
    this.frame.className = 'us-frame';
    this.topbarEl.className = 'us-topbar';
    this.topbarEl.setAttribute('part', 'topbar');
    this.bottombarEl.className = 'us-bottombar';
    this.bottombarEl.setAttribute('part', 'bottombar');
    this.frame.append(this.topbarEl, this.wrap, this.bottombarEl);
    this.shadow.append(style, this.frame);

    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    // área de transferência do sistema (Ctrl+C/X/V com o foco na grade)
    this.canvas.addEventListener('copy', this.onCopyEvent);
    this.canvas.addEventListener('cut', this.onCopyEvent);
    this.canvas.addEventListener('paste', this.onPasteEvent);
  }

  connectedCallback(): void {
    UniversalSheetElement.registry.connect(this);
    this.applyColorScheme();
    this.colorScheme.connect();
    this.unsubscribeFonts ??= this.fontResolver.onChange(() => this.onFontsChanged());
    this.unsubscribeLang ??= onBrowserLangChange(() => { this.paint(); if (!this.hasAttribute('lang')) void this.updateChrome(); });
    if (this.topbar || this.bottombar) void this.updateChrome();
    new ResizeObserver(() => { this.resize(); this.paint(); }).observe(this.canvas);
    this.resize();
    this.paint();
    // repinta quando as @font-face (Aptos Narrow) terminarem de carregar
    const fontSet = (document as unknown as { fonts?: { ready: Promise<unknown>; addEventListener?: (t: string, cb: () => void) => void } }).fonts;
    fontSet?.ready.then(() => this.onFontsChanged()).catch(() => {});
    fontSet?.addEventListener?.('loadingdone', () => this.onFontsChanged());
  }

  /**
   * Fonte que chega depois (a @font-face só carrega no 1º uso) muda as larguras
   * medidas: esquece o cache, refaz a altura automática das linhas com quebra —
   * contadas, na carga, com a substituta — e repinta.
   */
  private onFontsChanged(): void {
    this.cellFonts.clear();
    let refit = false;
    // MDW medida no canvas antes da fonte Normal carregar (ex.: Lucida Sans
    // Unicode 10: 7 com a substituta, 8 de fato — lo-tdf66668): refaz as larguras
    const nr = this.mdwFromCanvas ? this.fontResolver.get(this.normalFont.name) : undefined;
    if (nr && this.views.length) {
      const m = nr.source === 'default'
        ? excelMdw(this.normalFont.name, this.normalFont.size) ?? this.canvasMdw(this.normalFont)
        : this.canvasMdw(this.normalFont);
      if (m !== this.mdw) {
        this.mdw = m;
        for (const v of this.views) {
          const ws = v.worksheet;
          for (const cd of ws.cols ?? []) {
            if (cd.width === undefined) continue;
            for (let c = cd.min; c <= cd.max; c++) v.colWidths.set(c, colWidthToPx(cd.width, m));
          }
          v.defaultColW = defaultColPx(m, ws.sheetFormatPr?.defaultColWidth, ws.sheetFormatPr?.baseColWidth);
          if (this.wrapFitViews.has(v)) this.fitRowHeights(v);
        }
        this.recalcGrid();
        this.repositionEditor();
        this.paint();
        return;
      }
    }
    for (const v of this.views) if (this.wrapFitViews.has(v)) { this.fitRowHeights(v); refit = true; }
    if (refit) { this.recalcGrid(); this.repositionEditor(); }
    this.paint();
  }

  private get view(): SheetView | null {
    return this.views[this.sheetIndex] ?? null;
  }

  /**
   * Carrega bytes .xlsx — ou .xls (BIFF5/8, detectado pela assinatura do
   * Compound File e convertido em memória para o pacote OOXML equivalente) —
   * e monta as views de planilha.
   */
  loadXlsx(bytes: Uint8Array): void {
    const pkg = openSpreadsheet(bytes);
    this.pkg = pkg;
    this.workbook = readWorkbook(pkg);
    // contexto de cores compartilhado: theme1.xml + indexedColors (1 leitura)
    const cx = colorContext(pkg);
    this.shared = readSharedStrings(pkg, cx);
    this.styles = readStyles(pkg, cx);
    // paleta default de charts = accents 1..6 do tema (índices 4..9)
    this.chartPalette = cx.theme.colors.slice(4, 10);
    this.chartTheme = cx.theme;
    // imagens/formas dos desenhos: leitor e pintor DrawingML do Slides (drawings.ts)
    this.drawingLayer = new SheetDrawings(pkg, themePath(pkg), cx.theme, () => this.paint());
    // fontes do SO usadas pelos estilos, sob demanda (lógica do Universal Write);
    // drawingsReady espera (a altura automática se refaz quando resolvem)
    this.sheetFonts = this.ensureSheetFonts().catch(() => {});
    // geometria do grid pela fonte Normal (estilo 0), com as tabelas MEDIDAS no
    // Excel (sheet-core/grid-metrics): largura do dígito máximo e linha padrão
    const normal = this.styles.fonts[0];
    this.normalFont = { name: normal?.name ?? 'Calibri', size: normal?.size ?? 11, bold: !!normal?.bold };
    const tableMdw = excelMdw(this.normalFont.name, this.normalFont.size);
    // família fora da tabela medida: a tabela dá a da Arial (o Excel usa a Arial
    // se a fonte FALTA); se o navegador tem a fonte (fonte do Windows não
    // medida, ex.: Lucida Sans Unicode), mede no canvas quando ela chegar
    this.mdwFromCanvas = tableMdw === undefined || measuredFamily(this.normalFont.name) === null;
    this.mdw = tableMdw ?? this.canvasMdw(this.normalFont);
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
        // customFormat sem `s` = estilo 0: a linha formatada vence o estilo da coluna
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
      for (const d of [...(ws.charts ?? []), ...(ws.drawings ?? [])]) {
        if (d.anchor.kind === 'absolute') continue;
        if (d.anchor.to.col + 1 > extMaxCol) extMaxCol = d.anchor.to.col + 1;
        if (d.anchor.to.row + 1 > extMaxRow) extMaxRow = d.anchor.to.row + 1;
      }
      // tabelas (ListObjects): camada do estilo + botões de autofiltro
      const { tableFmt, filterAt, tableEnds } = buildTableLayer(ws, this.styles, cx);
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
        worksheet: ws, path: ref.target, colWidths, rowHeights, rowDesc: new Map(), hiddenCols, hiddenRows, merges,
        pane: ws.pane, condFormats: ws.condFormats ?? [],
        showGridLines: ws.showGridLines !== false,
        showZeros: ws.showZeros !== false,
        maxRow: extMaxRow,
        maxCol: extMaxCol,
        commentAt,
        charts: ws.charts ?? [],
        drawings: ws.drawings ?? [],
        hyperlinkAt,
        frozenCols,
        frozenRows,
        defaultColW,
        defaultRowH,
        tableFmt,
        filterAt,
        tableEnds,
        listValRanges,
        ...defaultXfMaps(ws),
      });
      this.fitRowHeights(this.views[this.views.length - 1]!);
    }
    // caches de paint pertencem ao workbook anterior
    this.rowMapCache.clear();
    this.cfEngines.clear();
    this.dirtySheets.clear();
    this.mergeDirty.clear();
    this.viewDirty.clear();
    // desfazer, cópia interna e "alterado" são da pasta anterior
    this.undoStack = [];
    this.redoStack = [];
    this.clip = null;
    this.dirty = false;
    // motor de cálculo da pasta nova (sob demanda; recalcula aqui se o gancho pedir)
    this.calc.reset();
    // abre na aba ativa (activeTab); o `Math.min(0, …)` anterior fixava sempre 0
    this.sheetIndex = Math.max(0, Math.min(this.workbook.activeTab ?? 0, this.views.length - 1));
    this.scrollX = 0;
    this.scrollY = 0;
    this.activate(1, 1);
    this.recalcGrid();
    this.emitSelection();
    this.paint();
    // pasta nova no elemento (as barras renomeiam o título quando não foram elas que abriram)
    this.dispatchEvent(new CustomEvent('us-load', { detail: { reload: this.reloading } }));
  }

  /** loadXlsx de dentro (addSheet): a mesma pasta, regravada e reaberta. */
  private reloading = false;

  /** Fonte Normal da pasta (estilo 0) — base das larguras e da linha padrão. */
  private normalFont: { name: string; size: number; bold: boolean } = { name: 'Calibri', size: 11, bold: false };
  /** Largura do dígito máximo (px) da fonte Normal, como o Excel a mede. */
  private mdw = 7;
  /** A MDW veio do canvas (família fora da tabela medida): refeita quando a fonte chega. */
  private mdwFromCanvas = false;
  /** Altura (px) da linha auto-ajustada só com a fonte Normal. */
  private normalRowPx = 20;
  /** Abas cuja altura automática mediu texto com quebra (refeita quando chega fonte). */
  private wrapFitViews = new WeakSet<SheetView>();
  /** Retângulos [c0, r0, c1, r1] de ignoredErrors numberStoredAsText por aba. */
  private ignoreRects = new WeakMap<SheetView, [number, number, number, number][]>();
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
      return excelRowPx(name ?? nf.name, size ?? nf.size, !!bold) + vaExtra(size, va);
    };
    const vaExtra = (size: number | undefined, va?: string): number => {
      const sz = size ?? nf.size;
      return va === 'superscript' ? Math.round(ppemOf(sz) * 0.17) : va === 'subscript' ? Math.round(ppemOf(sz) * 0.25) : 0;
    };
    // células VAZIAS da linha também entram (medido): a de coluna com estilo
    // usa a fonte do estilo da coluna; as demais, a fonte Normal
    // descent da fonte p/ a base compartilhada da linha (rowDescentPx, medido);
    // o acréscimo de sobrescrito/subscrito conta abaixo da base (Arial 11
    // sobrescrito + Normal Aptos Narrow 11 = 22 px, não 23 — corpus ibge)
    const descOf = (name: string | undefined, size: number | undefined, bold: boolean | undefined, va?: string): number | undefined => {
      const d = rowDescentPx(name ?? nf.name, size ?? nf.size, !!bold);
      return d === undefined ? undefined : d + vaExtra(size, va);
    };
    const colStyled: { min: number; max: number; px: number; desc: number | undefined }[] = [];
    let normalCols = false;
    let next = 1;
    for (const cd of [...(ws.cols ?? [])].sort((a, b) => a.min - b.min)) {
      if (cd.min > next) normalCols = true;
      if (cd.style === undefined) normalCols = true;
      else {
        const f = fonts[xfs[cd.style]?.fontId ?? 0];
        colStyled.push({ min: cd.min, max: cd.max, px: pxOf(f?.name, f?.size, f?.bold, f?.vertAlign), desc: descOf(f?.name, f?.size, f?.bold, f?.vertAlign) });
      }
      next = Math.max(next, cd.max + 1);
    }
    if (next <= 16384) normalCols = true;
    // base compartilhada p/ a PINTURA: maior descent das fontes da linha (sem o
    // acréscimo de sobrescrito), também nas linhas de altura fixa
    const baseDesc = row0Desc(this.normalFont);
    function row0Desc(f: { name?: string; size?: number; bold?: boolean } | undefined): number {
      return rowDescentPx(f?.name ?? nf.name, f?.size ?? nf.size, !!f?.bold) ?? 0;
    }
    const fontDesc = new Map<number, number>();
    const cellDesc = new Map<number, number | undefined>();
    const paintDesc = (row: (typeof ws.rows)[number]): number => {
      let d = row.style !== undefined ? row0Desc(fonts[xfs[row.style]?.fontId ?? 0]) : baseDesc;
      for (const c of row.cells) {
        const fid = xfs[c.style ?? row.style ?? 0]?.fontId ?? 0;
        let fd = fontDesc.get(fid);
        if (fd === undefined) { fd = row0Desc(fonts[fid]); fontDesc.set(fid, fd); }
        if (fd > d) d = fd;
      }
      return d;
    };
    v.rowDesc.clear();
    for (const row of ws.rows) {
      v.rowDesc.set(row.r, paintDesc(row));
      if (row.customHeight && row.height !== undefined) { v.rowHeights.set(row.r, rowPtToPx(row.height)); continue; }
      // zeroHeight: a altura padrão (0) é só das linhas AUSENTES; as listadas se auto-ajustam (medido)
      if (sheetCustom && !looseHt && row.height === undefined && !sfp?.zeroHeight) { v.rowHeights.set(row.r, v.defaultRowH); continue; }
      // as fontes da linha sentam numa base COMPARTILHADA: altura = maior parte
      // acima da base (R − descent; texto de n linhas: n·R − descent) + maior
      // descent (medido, lab e21/e27: Normal Calibri 11 + Arial 12 = 21 px;
      // + Arial 10 com 2 linhas = 2·17 + 1)
      // (fonte sem descent conhecido — CJK sem a fonte aqui — volta ao máximo das alturas)
      let above = 0, below = 0, maxPx = 0, known = true;
      const add = (px: number, desc: number | undefined): void => {
        maxPx = Math.max(maxPx, px);
        if (desc === undefined) { known = false; return; }
        above = Math.max(above, px - desc); below = Math.max(below, desc);
      };
      if (row.style !== undefined) {
        // estilo de linha: vale para todas as células vazias da linha
        const f = fonts[xfs[row.style]?.fontId ?? 0];
        add(pxOf(f?.name, f?.size, f?.bold, f?.vertAlign), descOf(f?.name, f?.size, f?.bold, f?.vertAlign));
      } else {
        if (normalCols) add(this.normalRowPx, descOf(nf.name, nf.size, nf.bold));
        if (colStyled.length) {
          const filled = new Set(row.cells.map((c) => refToRowCol(c.ref).col));
          for (const cs of colStyled) {
            // faixa inteira preenchida por células próprias não conta
            if (cs.max - cs.min < 64) {
              let all = true;
              for (let c = cs.min; c <= cs.max && all; c++) if (!filled.has(c)) all = false;
              if (all) continue;
            }
            add(cs.px, cs.desc);
          }
        }
      }
      for (const c of row.cells) {
        const xf = xfs[c.style ?? row.style ?? 0];
        const f = fonts[xf?.fontId ?? 0];
        const lineH = pxOf(f?.name, f?.size, f?.bold, f?.vertAlign);
        const fid = xf?.fontId ?? 0;
        if (!cellDesc.has(fid)) cellDesc.set(fid, descOf(f?.name, f?.size, f?.bold, f?.vertAlign));
        const desc = cellDesc.get(fid);
        add(lineH, desc);
        const runs = this.cellRuns(c);
        if (runs) {
          for (const r of runs) {
            const rn = r.props?.font ?? f?.name, rs = r.props?.size ?? f?.size, rb = r.props?.bold ?? f?.bold;
            add(pxOf(rn, rs, rb, r.props?.vertAlign ?? f?.vertAlign), descOf(rn, rs, rb, r.props?.vertAlign ?? f?.vertAlign));
          }
        }
        if (xf?.wrapText) {
          const { col } = refToRowCol(c.ref);
          if (mergedCells.has(`${col},${row.r}`)) continue;
          const text = this.displayText(c);
          if (!text) continue;
          // "centralizar na seleção": a largura útil vai até o fim da seleção (vizinhas
          // vazias com o mesmo alinhamento), como a pintura — títulos .xls de 1 linha
          let wrapW = v.colWidths.get(col) ?? v.defaultColW;
          if (xf.horizontal === 'centerContinuous') {
            const byCol = new Map(row.cells.map((rc) => [refToRowCol(rc.ref).col, rc]));
            for (let cc = col + 1, guard = 0; cc <= 16384 && guard < 200; cc++, guard++) {
              const nc = byCol.get(cc);
              if (!nc || nc.value !== undefined || xfs[nc.style ?? 0]?.horizontal !== 'centerContinuous') break;
              wrapW += v.colWidths.get(cc) ?? v.defaultColW;
            }
          }
          this.wrapFitViews.add(v);
          add(this.countWrapLines(text, f, wrapW) * lineH, desc);
        }
      }
      let h = known ? above + below : maxPx;
      // bordas grossas sinalizadas na linha: +1 px cada (medido)
      if (row.thickTop) h++;
      if (row.thickBot) h++;
      v.rowHeights.set(row.r, h);
    }
  }

  /** Linhas de um texto com quebra numa coluna de `colPx` px, na fonte da célula,
   *  para a ALTURA automática: mesmas larguras do desenho (cell-paint), caixa
   *  mais estreita que a da pintura (autofitWrapWidthPx, medido). */
  private countWrapLines(text: string, font: Font | undefined, colPx: number): number {
    const f = this.cellFont(font, 1);
    return Math.max(1, wrapLines(f, text, Math.max(1, autofitWrapWidthPx(colPx, f.ppem, this.mdw))).length);
  }

  /** Views com edições pendentes (célula/resize) a persistir no save. */
  private dirtySheets = new Set<number>();

  /**
   * Reemite o pacote como bytes .xlsx. Round-trip lossless nas partes não
   * tocadas; worksheets com edições têm SÓ <sheetData>/<cols> regenerados
   * (cirurgia no XML original — ver sheet-core/serialize.ts).
   */
  saveXlsx(): Uint8Array {
    if (!this.pkg) throw new Error('No workbook loaded');
    if (this.editing) this.commitEdit();
    // atributos/partes de cálculo (calc-io.ts) + abas que o cálculo mudou
    const edited = new Set([...this.dirtySheets].map((i) => this.views[i]?.worksheet).filter((w): w is Worksheet => !!w));
    const calcDirty = this.workbook ? saveCalc(this.pkg, this.workbook, this.calc.engine, this.views, edited) : new Set<Worksheet>();
    for (const [i, view] of this.views.entries()) {
      if (!this.dirtySheets.has(i) && !calcDirty.has(view.worksheet)) continue;
      const original = this.pkg.getPartText(view.path);
      if (original === undefined) continue;
      this.pkg.setPartText(view.path, updateWorksheetXml(original, view.worksheet, { merges: this.mergeDirty.has(i), sheetView: this.viewDirty.has(i) }));
    }
    // formatos aplicados pelas entradas (datas, %, moeda…): xfs novos no styles.xml
    const styles = this.pkg.getPartText('xl/styles.xml');
    if (styles !== undefined) {
      const patched = this.calc.patchStyles(styles);
      if (patched !== styles) this.pkg.setPartText('xl/styles.xml', patched);
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

  /**
   * DEBUG: texto exibido por célula da aba atual PARA A LARGURA da coluna (ou
   * da mescla) a 100% — o mesmo que o Range.Text do Excel ("####", Geral
   * reduzido, `*x` expandido; coluna oculta conta como largura 0). `maxCol`/
   * `maxRow`: só a região A1..(maxCol,maxRow) — abas enormes (2 milhões de
   * células) estouram o tempo do lab sem ela.
   */
  debugCellDisplays(maxCol = Infinity, maxRow = Infinity): { ref: string; display: string }[] {
    const v = this.view;
    if (!v) return [];
    const out: { ref: string; display: string }[] = [];
    for (const r of v.worksheet.rows) for (const c of r.cells) {
      if (r.r > maxRow) break;
      let col: number;
      try { col = refToRowCol(c.ref).col; } catch { continue; }
      if (col > maxCol) continue;
      // origem de mescla: largura da mescla; célula coberta com valor: o Range.Text
      // é o dela, na largura da própria coluna (medido)
      const mm = this.mergeAt(col, r.r);
      const m = mm?.isOrigin ? mm : null;
      let w = 0;
      for (let k = m ? m.firstCol : col; k <= (m ? m.lastCol : col); k++) {
        if (!v.hiddenCols.has(k)) w += v.colWidths.get(k) ?? v.defaultColW;
      }
      // como o Range.Text: com o formato da formatação condicional; showValue=0 esconde
      const st = v.condFormats.length > 0 ? this.styleAt(c, col, r.r) : this.resolveStyle(c, col, r.r);
      if (st.cf?.hideValue) { out.push({ ref: c.ref, display: '' }); continue; }
      // coluna oculta = largura 0: texto inteiro, Geral de 1 dígito ou "#", formatado ""
      // (espaços/quebras das pontas: quem apara é a leitura do <t> sem xml:space)
      const lay = this.cellLayout(c, st, w, 1);
      out.push({ ref: c.ref, display: lay?.ct.text ?? '' });
    }
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
    this.scrollX = 0;
    this.scrollY = 0;
    this.activate(1, 1);
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
    this.syncChrome();
  }

  /** Move a seleção para uma referência A1 (usada pela barra de fórmulas).
   *  Se o alvo cair dentro de uma mescla, snap para a origem (active = origem). */
  goToRef(ref: string): void {
    const rc = refToRowCol(ref);
    this.activate(rc.col, rc.row);
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  }

  /** Evento disparado quando a seleção muda: { ref, display, formula }. */
  onSelectionChange: ((ref: string, display: string, formula: string) => void) | null = null;

  /**
   * Seleção mudou: `us-selection` com { ref, display (texto exibido), formula
   * (fórmula no idioma, "=…", ou ''), edit (o que a barra de fórmulas mostra:
   * a fórmula ou o texto de edição da constante), ghost (célula derramada: a
   * fórmula é a da âncora, em cinza) }.
   */
  private emitSelection(): void {
    const ref = rowColToRef(this.sel.col, this.sel.row);
    const cell = this.findCell(this.sel.col, this.sel.row);
    const bar = this.barText(this.sel.col, this.sel.row);
    this.onSelectionChange?.(ref, this.displayText(cell), bar.formula);
    this.dispatchEvent(new CustomEvent('us-selection', {
      detail: { ref, range: this.rangeRef(), display: this.displayText(cell), formula: bar.formula, edit: bar.edit, ghost: bar.ghost },
    }));
    this.syncChrome();
  }

  /** Texto da barra de fórmulas da célula (fórmula no idioma ou texto de edição). */
  private barText(col: number, row: number): BarText {
    if (!this.view || this.view.worksheet.chartsheet) return { formula: '', edit: '', ghost: false };
    try {
      return this.calc.barText(this.sheetIndex, col, row);
    } catch (e) {
      // fórmula que o motor não entende não pode derrubar a seleção
      console.warn('universal-sheet: barra de fórmulas', e);
      const cell = this.findCell(col, row);
      return { formula: cell?.formula ? '=' + cell.formula : '', edit: cell?.formula ? '=' + cell.formula : this.displayText(cell), ghost: false };
    }
  }

  /** Texto da barra de fórmulas da célula ativa (para a barra externa). */
  get activeCellEditText(): string { return this.barText(this.sel.col, this.sel.row).edit; }

  /** Barra de fórmulas da célula ativa: a fórmula no idioma, o texto de edição e se é derramada (fórmula da âncora, em cinza). */
  activeCellBarText(): { formula: string; edit: string; ghost: boolean } {
    const b = this.barText(this.sel.col, this.sel.row);
    return { formula: b.formula, edit: b.edit, ghost: b.ghost };
  }

  /** Liga o autocompletar de funções a uma barra de fórmulas externa; devolve o desligar. */
  attachFormulaBar(input: HTMLInputElement): () => void {
    const ac = new FormulaAutocomplete(document.body, () => this.calc.locale);
    ac.attach(input, true);
    return () => ac.detach();
  }

  private findCell(col: number, row: number): Cell | undefined {
    const v = this.view;
    if (!v) return undefined;
    // o índice célula-por-ref da pintura (a busca linear pesava a cada seleção nas abas enormes)
    return this.cellIndex(v, this.sheetIndex).get(row)?.get(col);
  }

  // ---- Cor de acento (vem do tema) ----

  /**
   * Resolve a cor de acento atual lendo a CSS var `--u-color-primary` (da
   * página ou da paleta das barras, chrome-theme.ts). De `light-dark(a,b)` fica
   * o tom claro (a grade é sempre clara). Fallback ao verde Office.
   */
  private accent(): string {
    try {
      const cs = getComputedStyle(this);
      const raw = cs.getPropertyValue('--u-color-primary').trim();
      if (!raw) return DEFAULT_ACCENT;
      const ld = raw.match(/^light-dark\(\s*([^,]+),\s*([^)]+)\)$/i);
      // a grade é sempre clara (como a do Excel, também no tema escuro): o tom
      // CLARO do acento, que contrasta com o branco das células
      if (ld) return ld[1]!.trim();
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
  private applyResizePreview(kind: 'col' | 'row', index: number, sizePx: number, repaint = true): void {
    const v = this.view!;
    const px = Math.max(0, Math.round(sizePx));
    if (kind === 'col') {
      v.colWidths.set(index, px);
      if (px > 0 && v.hiddenCols.has(index)) v.hiddenCols.delete(index);
    } else {
      v.rowHeights.set(index, px);
      if (px > 0 && v.hiddenRows.has(index)) v.hiddenRows.delete(index);
    }
    if (px === 0) (kind === 'col' ? v.hiddenCols : v.hiddenRows).add(index);
    this.recalcGrid();
    if (!repaint) return;
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
    const before = this.resizeBefore;
    this.resizeBefore = null;
    if (before) this.pushUndo(rs.kind === 'col' ? 'columnWidth' : 'rowHeight', [{ sheet: this.sheetIndex, struct: before }], [{ sheet: this.sheetIndex, struct: this.structSnap() }]);
    this.changed('resize');
  };

  /** Estado das colunas/linhas antes do arrasto de redimensionamento (para o Desfazer). */
  private resizeBefore: StructSnap | null = null;

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
      this.resizeBefore = this.structSnap();
      window.addEventListener('mousemove', this.onResizeDragMove);
      window.addEventListener('mouseup', this.onResizeDragEnd);
      return;
    }
    const v = this.view;
    if (!v) return;
    if (e.button > 0) {
      // botão direito fora da seleção: seleciona a célula (o menu de contexto age nela, como no Excel)
      if (e.button === 2 && px >= HEADER_W && py >= HEADER_H) {
        const h = this.cellAt(px - HEADER_W, py - HEADER_H);
        const r = this.range;
        if (h && (h.col < r.c1 || h.col > r.c2 || h.row < r.r1 || h.row > r.r2)) {
          if (this.editing) this.commitEdit();
          this.activate(h.col, h.row);
          this.emitSelection();
          this.paint();
        }
      }
      return;
    }
    if (this.editing) this.commitEdit();
    // cabeçalhos: canto = tudo; letra = colunas; número = linhas (Shift estende, arrastar também)
    if (px < HEADER_W && py < HEADER_H) { this.selectAll(); return; }
    if (py < HEADER_H || px < HEADER_W) {
      const isCol = py < HEADER_H;
      const hit = this.cellAt(Math.max(0, px - HEADER_W), Math.max(0, py - HEADER_H));
      if (!hit) return;
      const at = (h: { col: number; row: number }): void => {
        if (isCol) this.selectLines('cols', e.shiftKey ? this.sel.col : h.col, h.col);
        else this.selectLines('rows', e.shiftKey ? this.sel.row : h.row, h.row);
      };
      const first = { ...hit };
      at(first);
      this.dragSelect((h) => {
        if (isCol) this.selectLines('cols', e.shiftKey ? this.sel.col : first.col, h.col);
        else this.selectLines('rows', e.shiftKey ? this.sel.row : first.row, h.row);
      });
      return;
    }
    const hit = this.cellAt(px - HEADER_W, py - HEADER_H);
    if (!hit) return;
    // clique dentro de uma mescla → célula ativa = origem da mescla; Shift+clique estende
    if (e.shiftKey) this.extendTo(hit.col, hit.row);
    else this.activate(hit.col, hit.row);
    this.emitSelection();
    this.paint();
    this.dragSelect((h) => this.extendTo(h.col, h.row));
  };

  /** Arrastar com o botão apertado estende a seleção (rola junto nas bordas). */
  private dragSelect(onCell: (h: { col: number; row: number }) => void): void {
    const move = (ev: MouseEvent): void => {
      const r = this.canvas.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      // fora da área de dados: rola um passo na direção
      const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
      if (x > W - 8) this.scrollX = Math.min(this.maxScrollX(), this.scrollX + 20);
      else if (x < HEADER_W && this.scrollX > 0) this.scrollX = Math.max(0, this.scrollX - 20);
      if (y > H - 8) this.scrollY = Math.min(this.maxScrollY(), this.scrollY + 20);
      else if (y < HEADER_H && this.scrollY > 0) this.scrollY = Math.max(0, this.scrollY - 20);
      const h = this.cellAt(Math.min(Math.max(0, x - HEADER_W), W - HEADER_W - 1), Math.min(Math.max(0, y - HEADER_H), H - HEADER_H - 1));
      if (!h) return;
      onCell(h);
      this.emitSelection();
      this.paint();
    };
    const up = (): void => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

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
  /** Fontes de célula medidas como o Excel (px inteiros por glifo, ppem inteiro). */
  private readonly cellFonts = new CellFonts();
  /** Largura da região espelhada (aba RTL na captura) para posicionar desenhos; 0 = sem espelho. */
  private mirrorW = 0;

  disconnectedCallback(): void {
    UniversalSheetElement.registry.disconnect(this);
    this.colorScheme.disconnect();
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    this.unsubscribeLang?.();
    this.unsubscribeLang = null;
    // barras: tira ouvintes em document/window (o elemento pode ser coletado)
    if (this.chromeSync) {
      this.chromeSync = null;
      this.chromeNotice = null;
      void import('./chrome.js').then((m) => { if (!this.isConnected) m.teardownChrome(this); });
    }
  }

  /** Resolução das fontes dos estilos do workbook carregado (ensureSheetFonts). */
  private sheetFonts: Promise<void> = Promise.resolve();

  /** Resolve já as fontes usadas pelos estilos do workbook (o aviso de
   *  onChange repinta quando chegarem). */
  private async ensureSheetFonts(): Promise<void> {
    const names = (this.styles?.fonts ?? []).map((f) => f?.name).filter((n): n is string => !!n);
    await this.fontResolver.resolve(['Aptos Narrow', 'Arial', ...names]);
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
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;

    // ── atalhos de edição do Excel que são da grade (as barras cuidam dos de formatação/arquivo) ──
    if (ctrl && !e.altKey) {
      const key = k.length === 1 ? k.toLowerCase() : k;
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
      if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); this.redo(); return; }
      if (key === 'a' && !e.shiftKey) { e.preventDefault(); this.selectAll(); return; }
      if (key === ' ' || e.code === 'Space') { e.preventDefault(); this.selectLines('cols', this.range.c1, this.range.c2); this.emitSelection(); this.paint(); return; }
      if (key === 'PageDown' || key === 'PageUp') {
        e.preventDefault();
        const n = this.views.length;
        if (n > 1) this.selectSheet((this.sheetIndex + (key === 'PageDown' ? 1 : n - 1)) % n);
        return;
      }
      if (key === 'Home' || key === 'End') {
        e.preventDefault();
        const end = key === 'End' ? this.lastUsedCell() : { col: 1, row: 1 };
        if (e.shiftKey) this.extendTo(end.col, end.row); else this.activate(end.col, end.row);
        this.ensureVisible(e.shiftKey ? this.corner : this.sel);
        this.emitSelection(); this.paint();
        return;
      }
    }
    if (e.shiftKey && !ctrl && (k === ' ' || e.code === 'Space') && !e.altKey) {
      e.preventDefault();
      this.selectLines('rows', this.range.r1, this.range.r2);
      this.emitSelection(); this.paint();
      return;
    }

    // ── teclas de edição (somente quando NÃO estamos em modo edit) ──
    if (k === 'F2') {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, undefined, true);
      return;
    }
    if (k === 'Enter') {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, undefined, true);
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      if (this.isRange()) { this.clear('contents'); return; }
      const r = this.recordCells('clearContents', [{ col: this.sel.col, row: this.sel.row }], () => this.setCellValue(this.sel.col, this.sel.row, ''));
      // parte de matriz CSE: o Excel recusa com aviso
      if (!r.ok && r.message) this.dispatchEvent(new CustomEvent('us-entry-error', { detail: { message: r.message } }));
      this.emitSelection();
      this.paint();
      return;
    }
    // tipagem direta (1 char imprimível): inicia edição substituindo o conteúdo
    // sem modificadores Ctrl/Alt/Meta.
    if (k.length === 1 && !ctrl && !e.altKey) {
      e.preventDefault();
      this.beginEdit(this.sel.col, this.sel.row, k, false);
      return;
    }
    // Tab / Shift+Tab fora da edição: anda na linha (como o Excel)
    if (k === 'Tab' && !ctrl && !e.altKey) {
      e.preventDefault();
      const span = this.selectionSpan();
      const col = e.shiftKey ? Math.max(1, span.firstCol - 1) : Math.min(v.maxCol, span.lastCol + 1);
      this.activate(col, span.firstRow);
      this.ensureVisible();
      this.emitSelection(); this.paint();
      return;
    }

    // Shift: estende pelo canto oposto; Ctrl: vai até a borda dos dados (Ctrl+setas)
    if (e.shiftKey && /^(Arrow|Page|Home$|End$)/.test(k)) {
      let { col, row } = this.corner;
      switch (k) {
        case 'ArrowLeft': col = ctrl ? this.dataEdge(col, row, -1, 0).col : Math.max(1, col - 1); break;
        case 'ArrowRight': col = ctrl ? this.dataEdge(col, row, 1, 0).col : Math.min(v.maxCol, col + 1); break;
        case 'ArrowUp': row = ctrl ? this.dataEdge(col, row, 0, -1).row : Math.max(1, row - 1); break;
        case 'ArrowDown': row = ctrl ? this.dataEdge(col, row, 0, 1).row : Math.min(v.maxRow, row + 1); break;
        case 'Home': col = 1; break;
        case 'End': col = v.maxCol; break;
        case 'PageDown': row = Math.min(v.maxRow, row + 10); break;
        case 'PageUp': row = Math.max(1, row - 10); break;
        default: return;
      }
      e.preventDefault();
      this.extendTo(col, row);
      this.ensureVisible(this.corner);
      this.emitSelection();
      this.paint();
      return;
    }

    // ponto de partida: como uma mescla, navegamos a partir da BORDA da mescla
    // (saímos para a vizinha real, sem reentrar em célula coberta).
    const span = this.selectionSpan();
    let col = this.sel.col, row = this.sel.row;
    switch (k) {
      case 'ArrowLeft':  if (ctrl) ({ col, row } = this.dataEdge(span.firstCol, span.firstRow, -1, 0)); else { col = Math.max(1, span.firstCol - 1); row = span.firstRow; } break;
      case 'ArrowRight': if (ctrl) ({ col, row } = this.dataEdge(span.lastCol, span.firstRow, 1, 0)); else { col = Math.min(v.maxCol, span.lastCol + 1); row = span.firstRow; } break;
      case 'ArrowUp':    if (ctrl) ({ col, row } = this.dataEdge(span.firstCol, span.firstRow, 0, -1)); else { row = Math.max(1, span.firstRow - 1); col = span.firstCol; } break;
      case 'ArrowDown':  if (ctrl) ({ col, row } = this.dataEdge(span.firstCol, span.lastRow, 0, 1)); else { row = Math.min(v.maxRow, span.lastRow + 1); col = span.firstCol; } break;
      case 'Home':       col = 1; break;
      case 'End':        col = v.maxCol; break;
      case 'PageDown':   row = Math.min(v.maxRow, row + 10); break;
      case 'PageUp':     row = Math.max(1, row - 10); break;
      default: return;
    }
    e.preventDefault();
    // se aterrissamos dentro de outra mescla, snap p/ origem (active = origem)
    this.activate(col, row);
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  };

  // ───────────────────────── SELEÇÃO DE INTERVALO ─────────────────────────

  /** Torna (col,row) a célula ativa — origem da mescla — e a seleção só ela. */
  private activate(col: number, row: number): void {
    this.sel = this.snapToMergeOrigin(col, row);
    this.corner = { ...this.sel };
    this.range = this.expandMerges({ c1: this.sel.col, r1: this.sel.row, c2: this.sel.col, r2: this.sel.row });
  }

  /** Estende a seleção da célula ativa até (col,row) — Shift+clique, Shift+setas, arrastar. */
  private extendTo(col: number, row: number): void {
    this.corner = { col, row };
    const s = this.sel;
    this.range = this.expandMerges({ c1: Math.min(s.col, col), r1: Math.min(s.row, row), c2: Math.max(s.col, col), r2: Math.max(s.row, row) });
  }

  /** Cresce o retângulo até conter inteiras as mesclas que ele toca (como o Excel). */
  private expandMerges(r: { c1: number; r1: number; c2: number; r2: number }): { c1: number; r1: number; c2: number; r2: number } {
    const v = this.view;
    if (!v || v.merges.size === 0 || r.r2 >= MAX_ROWS || r.c2 >= MAX_COLS) return r;
    const out = { ...r };
    for (let grew = true, guard = 0; grew && guard < 50; guard++) {
      grew = false;
      for (const range of v.merges.values()) {
        const m = parseRange(range);
        if (!m || m.c2 < out.c1 || m.c1 > out.c2 || m.r2 < out.r1 || m.r1 > out.r2) continue;
        if (m.c1 < out.c1) { out.c1 = m.c1; grew = true; }
        if (m.r1 < out.r1) { out.r1 = m.r1; grew = true; }
        if (m.c2 > out.c2) { out.c2 = m.c2; grew = true; }
        if (m.r2 > out.r2) { out.r2 = m.r2; grew = true; }
      }
    }
    return out;
  }

  /** Colunas (ou linhas) inteiras de `a` a `b` — clique no cabeçalho, Ctrl/Shift+Espaço. */
  private selectLines(kind: 'cols' | 'rows', a: number, b: number): void {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (kind === 'cols') {
      if (this.sel.col < lo || this.sel.col > hi) this.sel = { col: a, row: this.sel.row };
      this.corner = { col: b, row: MAX_ROWS };
      this.range = { c1: lo, r1: 1, c2: hi, r2: MAX_ROWS };
    } else {
      if (this.sel.row < lo || this.sel.row > hi) this.sel = { col: this.sel.col, row: a };
      this.corner = { col: MAX_COLS, row: b };
      this.range = { c1: 1, r1: lo, c2: MAX_COLS, r2: hi };
    }
  }

  /** Selecionar Tudo (Ctrl+A, canto dos cabeçalhos). A célula ativa fica. */
  selectAll(): void {
    if (!this.view) return;
    if (this.editing) this.commitEdit();
    this.range = { c1: 1, r1: 1, c2: MAX_COLS, r2: MAX_ROWS };
    this.corner = { col: MAX_COLS, row: MAX_ROWS };
    this.emitSelection();
    this.paint();
  }

  /** A seleção tem mais de uma célula (fora uma mescla sozinha)? */
  private isRange(): boolean {
    const r = this.range, m = this.selectionSpan();
    return !(r.c1 === m.firstCol && r.c2 === m.lastCol && r.r1 === m.firstRow && r.r2 === m.lastRow);
  }

  /** Intervalo da seleção em A1 ("B2", "A1:C5", "C:C", "3:4"). */
  private rangeRef(r = this.range): string {
    const wholeCols = r.r1 === 1 && r.r2 >= MAX_ROWS, wholeRows = r.c1 === 1 && r.c2 >= MAX_COLS;
    if (wholeCols && wholeRows) return `A1:${colLetters(MAX_COLS)}${MAX_ROWS}`;
    if (wholeCols) return `${colLetters(r.c1)}:${colLetters(r.c2)}`;
    if (wholeRows) return `${r.r1}:${r.r2}`;
    const a = rowColToRef(r.c1, r.r1), b = rowColToRef(r.c2, r.r2);
    return a === b ? a : `${a}:${b}`;
  }

  /**
   * Seleção atual: aba, célula ativa e o intervalo (1-based, inclusivo; colunas
   * inteiras vão até a linha 1048576, linhas inteiras até a coluna XFD).
   */
  getSelection(): { sheet: number; ref: string; range: string; col: number; row: number; c1: number; r1: number; c2: number; r2: number } {
    const r = this.range;
    return { sheet: this.sheetIndex, ref: rowColToRef(this.sel.col, this.sel.row), range: this.rangeRef(), col: this.sel.col, row: this.sel.row, ...r };
  }

  /** Seleciona um intervalo em A1 ("B2:D8", "C:C", "3:5", "Plan2!A1"); a célula ativa é a 1ª. */
  selectRange(ref: string): void {
    const m = /^(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/.exec(ref.trim());
    if (m) {
      const name = (m[1] ?? m[2] ?? '').replace(/''/g, "'");
      const idx = this.workbook?.sheets.findIndex((s) => s.name.toLowerCase() === name.toLowerCase()) ?? -1;
      if (idx < 0) throw new Error(`Planilha inexistente: ${name}`);
      this.selectSheet(idx);
      ref = m[3]!;
    }
    const rg = parseRange(ref.replace(/\$/g, '').toUpperCase());
    if (!rg) throw new Error(`Referência inválida: ${ref}`);
    if (this.editing) this.commitEdit();
    this.activate(rg.c1 === 0 ? 1 : rg.c1, rg.r1 === 0 ? 1 : rg.r1);
    if (rg.r1 === 0) this.selectLines('cols', rg.c1, rg.c2);
    else if (rg.c1 === 0) this.selectLines('rows', rg.r1, rg.r2);
    else if (rg.c2 !== rg.c1 || rg.r2 !== rg.r1) this.extendTo(rg.c2, rg.r2);
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  }

  /** Célula com conteúdo (valor ou fórmula)? */
  private filled(col: number, row: number): boolean {
    const c = this.view ? this.cellIndex(this.view, this.sheetIndex).get(row)?.get(col) : undefined;
    return !!c && (c.value !== undefined || c.formula !== undefined || c.inlineString !== undefined);
  }

  /** Ctrl+seta: até a borda da região de dados na direção (ou o fim da grade). */
  private dataEdge(col: number, row: number, dc: number, dr: number): { col: number; row: number } {
    const v = this.view!;
    const inside = (c: number, r: number): boolean => c >= 1 && r >= 1 && c <= v.maxCol && r <= v.maxRow;
    let c = col, r = row;
    const next = (): boolean => inside(c + dc, r + dr);
    if (!next()) return { col: c, row: r };
    if (this.filled(c, r) && this.filled(c + dc, r + dr)) {
      while (next() && this.filled(c + dc, r + dr)) { c += dc; r += dr; }
    } else {
      c += dc; r += dr;
      while (!this.filled(c, r) && next()) { c += dc; r += dr; }
    }
    return { col: c, row: r };
  }

  /** Última célula usada da aba (Ctrl+End). */
  private lastUsedCell(): { col: number; row: number } {
    const v = this.view;
    let lc = 1, lr = 1;
    for (const r of v?.worksheet.rows ?? []) {
      if (!r.cells.length) continue;
      if (r.r > lr) lr = r.r;
      for (const c of r.cells) { const col = refToRowCol(c.ref).col; if (col > lc) lc = col; }
    }
    return { col: lc, row: lr };
  }

  /** O intervalo recortado ao que existe na grade (colunas/linhas inteiras viram a área usada). */
  private clampedRange(r = this.range): { c1: number; r1: number; c2: number; r2: number } {
    const used = this.lastUsedCell();
    return {
      c1: r.c1, r1: r.r1,
      c2: r.c2 >= MAX_COLS ? Math.max(r.c1, used.col) : r.c2,
      r2: r.r2 >= MAX_ROWS ? Math.max(r.r1, used.row) : r.r2,
    };
  }

  /** Células EXISTENTES do modelo dentro do intervalo. */
  private cellsIn(r: { c1: number; r1: number; c2: number; r2: number }, sort = true): { col: number; row: number; cell: Cell }[] {
    const v = this.view;
    if (!v) return [];
    const out: { col: number; row: number; cell: Cell }[] = [];
    const map = this.cellIndex(v, this.sheetIndex);
    const take = (row: number, cells: Map<number, Cell>): void => {
      if (r.c2 - r.c1 < cells.size) {
        for (let col = r.c1; col <= r.c2; col++) { const cell = cells.get(col); if (cell) out.push({ col, row, cell }); }
      } else for (const [col, cell] of cells) if (col >= r.c1 && col <= r.c2) out.push({ col, row, cell });
    };
    // poucas linhas no intervalo: só elas (a seleção comum numa aba de 1 milhão de células)
    if (r.r2 - r.r1 < map.size) {
      for (let row = r.r1; row <= r.r2; row++) { const cells = map.get(row); if (cells) take(row, cells); }
    } else for (const [row, cells] of map) if (row >= r.r1 && row <= r.r2) take(row, cells);
    return sort ? out.sort((a, b) => a.row - b.row || a.col - b.col) : out;
  }

  /**
   * Estatísticas da seleção para a barra de status (como o Excel): `count` =
   * células não vazias, `numericCount` = com número, e soma/média/mínimo/máximo
   * dos números (undefined sem números).
   */
  selectionStats(): { cells: number; count: number; numericCount: number; sum?: number; average?: number; min?: number; max?: number } {
    const r = this.range;
    const cells = (Math.min(r.c2, MAX_COLS) - r.c1 + 1) * (Math.min(r.r2, MAX_ROWS) - r.r1 + 1);
    let count = 0, n = 0, sum = 0, min = Infinity, max = -Infinity;
    for (const { cell } of this.cellsIn(r, false)) {
      if (cell.value === undefined && cell.inlineString === undefined) continue;
      count++;
      if (cell.type === 's' || cell.type === 'inlineStr' || cell.type === 'str' || cell.type === 'b' || cell.type === 'e') continue;
      const x = cell.type === 'd' ? isoToSerial(cell.value, !!this.workbook?.date1904) : Number(cell.value);
      if (x === undefined || !Number.isFinite(x)) continue;
      n++; sum += x; if (x < min) min = x; if (x > max) max = x;
    }
    return n ? { cells, count, numericCount: n, sum, average: sum / n, min, max } : { cells, count, numericCount: 0 };
  }

  /** Texto de um número para a barra de status, no formato da célula ativa (como o Excel). */
  formatStat(n: number): string {
    const cell = this.findCell(this.sel.col, this.sel.row);
    const code = cell ? this.cellFormatCode(cell) : 'General';
    return formatValue(n, /^general$/i.test(code) || /@/.test(code) ? 'General' : code, { date1904: this.workbook?.date1904 }).text;
  }

  // ───────────────────────── DESFAZER / REFAZER ─────────────────────────

  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];

  /** Rótulo da próxima ação de Desfazer/Refazer (para o tooltip), ou null. */
  get undoLabel(): string | null { return this.undoStack[this.undoStack.length - 1]?.label ?? null; }
  get redoLabel(): string | null { return this.redoStack[this.redoStack.length - 1]?.label ?? null; }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  private pushUndo(label: string, before: SheetSnap[], after: SheetSnap[]): void {
    this.undoStack.push({ label, before, after, sel: { sheet: this.sheetIndex, sel: { ...this.sel }, range: { ...this.range } } });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Desfaz a última alteração (Ctrl+Z): conteúdo, formatação, tamanhos, mesclas, painéis… */
  undo(): boolean {
    if (this.editing) { this.cancelEdit(); return true; }
    const e = this.undoStack.pop();
    if (!e) return false;
    this.restoreSnaps(e.before);
    this.redoStack.push(e);
    this.restoreSelection(e);
    this.changed('undo');
    return true;
  }

  /** Refaz o que foi desfeito (Ctrl+Y). */
  redo(): boolean {
    const e = this.redoStack.pop();
    if (!e) return false;
    if (this.editing) this.commitEdit();
    this.restoreSnaps(e.after);
    this.undoStack.push(e);
    this.restoreSelection(e);
    this.changed('redo');
    return true;
  }

  private restoreSelection(e: UndoEntry): void {
    if (e.sel.sheet !== this.sheetIndex && e.sel.sheet < this.views.length) this.selectSheet(e.sel.sheet);
    this.sel = { ...e.sel.sel };
    this.corner = { col: e.sel.range.c2, row: e.sel.range.r2 };
    this.range = { ...e.sel.range };
    this.ensureVisible();
    this.emitSelection();
    this.paint();
  }

  /** Antes/depois de células (texto de edição + estilo). */
  private snapCells(sheet: number, at: readonly { col: number; row: number }[]): CellSnap[] {
    const v = this.views[sheet];
    if (!v) return [];
    const idx = this.cellIndex(v, sheet);
    return at.map(({ col, row }) => {
      const cell = idx.get(row)?.get(col);
      let edit = '';
      if (cell) {
        try { edit = this.calc.barText(sheet, col, row).edit; } catch { edit = this.displayText(cell); }
      }
      return { col, row, edit, style: cell?.style, exists: !!cell };
    });
  }

  /** Antes/depois da estrutura da aba: colunas, linhas (altura, oculta, estilo), mesclas, painéis, grade. */
  private structSnap(sheet = this.sheetIndex): StructSnap {
    const v = this.views[sheet]!;
    const ws = v.worksheet;
    const rows = new Map<number, RowMeta>();
    for (const r of ws.rows) {
      if (r.height === undefined && !r.hidden && r.style === undefined && !r.customFormat && !r.customHeight) continue;
      rows.set(r.r, { height: r.height, customHeight: r.customHeight, hidden: r.hidden, style: r.style, customFormat: r.customFormat });
    }
    return {
      cols: (ws.cols ?? []).map((c) => ({ ...c })), rows, merges: [...(ws.merges ?? [])],
      pane: ws.pane ? { ...ws.pane } : undefined, showGridLines: v.showGridLines,
      colWidths: new Map(v.colWidths), rowHeights: new Map(v.rowHeights),
      hiddenCols: new Set(v.hiddenCols), hiddenRows: new Set(v.hiddenRows),
      frozenCols: v.frozenCols, frozenRows: v.frozenRows,
    };
  }

  private restoreSnaps(snaps: readonly SheetSnap[]): void {
    for (const s of snaps) {
      const v = this.views[s.sheet];
      if (!v) continue;
      if (s.struct) this.restoreStruct(s.sheet, s.struct);
      if (s.cells) {
        const idx = this.cellIndex(v, s.sheet);
        for (const c of s.cells) {
          let cur = '';
          const cell = idx.get(c.row)?.get(c.col);
          if (cell) { try { cur = this.calc.barText(s.sheet, c.col, c.row).edit; } catch { cur = ''; } }
          if (cur !== c.edit) this.calc.edit(s.sheet, c.col, c.row, c.edit);
          const after = idx.get(c.row)?.get(c.col);
          if (c.style === undefined) {
            if (after) delete after.style;
            if (!c.exists) this.calc.dropIfEmpty(s.sheet, c.col, c.row);
          } else (after ?? this.calc.ensureCell(s.sheet, c.col, c.row)).style = c.style;
        }
        this.cfEngines.delete(s.sheet);
        this.dirtySheets.add(s.sheet);
      }
      v.rowXf = defaultXfMaps(v.worksheet).rowXf;
      v.colXf = defaultXfMaps(v.worksheet).colXf;
      this.fitRowHeights(v);
    }
    this.recalcGrid();
    this.repositionEditor();
  }

  private restoreStruct(sheet: number, st: StructSnap): void {
    const v = this.views[sheet]!;
    const ws = v.worksheet;
    ws.cols = st.cols.map((c) => ({ ...c }));
    for (const r of ws.rows) {
      const m = st.rows.get(r.r);
      r.height = m?.height; r.customHeight = m?.customHeight; r.hidden = m?.hidden; r.style = m?.style; r.customFormat = m?.customFormat;
      if (r.height === undefined) delete r.height;
      if (!r.customHeight) delete r.customHeight;
      if (!r.hidden) delete r.hidden;
      if (r.style === undefined) delete r.style;
      if (!r.customFormat) delete r.customFormat;
    }
    for (const [r, m] of st.rows) {
      if (ws.rows.some((x) => x.r === r)) continue;
      const row = { r, cells: [] as Cell[] };
      for (const [k, val] of Object.entries(m)) if (val !== undefined) (row as Record<string, unknown>)[k] = val;
      ws.rows.splice(ws.rows.findIndex((x) => x.r > r) < 0 ? ws.rows.length : ws.rows.findIndex((x) => x.r > r), 0, row);
      this.rowMapCache.delete(sheet);
    }
    this.setMerges(sheet, st.merges);
    if (st.pane) ws.pane = { ...st.pane }; else delete ws.pane;
    if (st.showGridLines) delete ws.showGridLines; else ws.showGridLines = false;
    v.showGridLines = st.showGridLines;
    v.colWidths = new Map(st.colWidths);
    v.rowHeights = new Map(st.rowHeights);
    v.hiddenCols = new Set(st.hiddenCols);
    v.hiddenRows = new Set(st.hiddenRows);
    v.frozenCols = st.frozenCols;
    v.frozenRows = st.frozenRows;
    this.dirtySheets.add(sheet);
    this.mergeDirty.add(sheet);
    this.viewDirty.add(sheet);
  }

  /**
   * Executa `op` guardando o antes/depois das células `at` (e da estrutura,
   * se pedido) como UMA ação de Desfazer.
   */
  private record<T>(label: string, at: readonly { col: number; row: number }[], op: () => T, struct = false): T {
    const sheet = this.sheetIndex;
    const before: SheetSnap = { sheet, cells: this.snapCells(sheet, at), ...(struct ? { struct: this.structSnap(sheet) } : {}) };
    const res = op();
    const after: SheetSnap = { sheet, cells: this.snapCells(sheet, at), ...(struct ? { struct: this.structSnap(sheet) } : {}) };
    const same = !struct && before.cells!.every((b, i) => b.edit === after.cells![i]!.edit && b.style === after.cells![i]!.style);
    if (!same) this.pushUndo(label, [before], [after]);
    return res;
  }

  /** `record` para escrita em células (resultado da última escrita). */
  private recordCells(label: string, at: readonly { col: number; row: number }[], op: () => EditResult): EditResult {
    return this.record(label, at, op);
  }

  // ───────────────────────── ESTADO "ALTERADO" ─────────────────────────

  private dirty = false;
  private changePending: string | null = null;

  /** Há alterações desde a última carga (ou desde `setDirty(false)`, que o hospedeiro chama ao salvar)? */
  isDirty(): boolean { return this.dirty; }
  setDirty(v: boolean): void { this.dirty = v; this.syncChrome(); }

  /** Algo mudou no modelo: marca alterado e avisa (`us-change`, um por tarefa) as barras e o hospedeiro. */
  private changed(kind: string): void {
    this.dirty = true;
    if (this.changePending !== null) return;
    this.changePending = kind;
    queueMicrotask(() => {
      const k = this.changePending ?? kind;
      this.changePending = null;
      this.dispatchEvent(new CustomEvent('us-change', { detail: { kind: k } }));
      this.syncChrome();
    });
  }

  // ───────────────────────── ARQUIVO ─────────────────────────

  /** Pasta de trabalho em branco (Arquivo › Novo): uma aba, fonte Normal Aptos Narrow 11. */
  newWorkbook(): void {
    const pt = this.calc.locale.lang === 'pt-BR';
    this.fileName = undefined;
    this.loadXlsx(blankXlsx({ sheetName: pt ? 'Planilha1' : 'Sheet1' }));
  }

  /** Índice da aba ativa. */
  get activeSheet(): number { return this.sheetIndex; }

  /** Fonte Normal da pasta (estilo 0) — a das larguras de coluna e a do PDF exportado. */
  get defaultFontName(): string { return this.normalFont.name; }

  /** Redesenha a grade (ex.: a cor de destaque da página mudou). */
  repaint(): void { this.paint(); }

  /** Foco na grade (a digitação vai para a célula ativa). */
  override focus(options?: FocusOptions): void { this.canvas.focus(options); }

  /** Zoom atual (0.4–3). */
  getZoom(): number { return this.zoom; }

  /**
   * Insere uma aba nova (vazia) no fim e a seleciona — Inserir › Planilha.
   * O pacote é regravado e reaberto (os dados não salvos vão junto); o
   * Desfazer recomeça. Devolve o nome dado.
   */
  addSheet(name?: string): string {
    if (!this.pkg || !this.workbook) throw new Error('No workbook loaded');
    const zoom = this.zoom;
    const pkg = XlsxPackage.load(this.saveXlsx());
    const names = this.workbook.sheets.map((s) => s.name.toLowerCase());
    const base = this.calc.locale.lang === 'pt-BR' ? 'Planilha' : 'Sheet';
    let n = this.workbook.sheets.length + 1;
    let nm = name?.trim().slice(0, 31) || `${base}${n}`;
    while (names.includes(nm.toLowerCase())) nm = `${base}${++n}`;
    addSheetPart(pkg, nm);
    const dirty = this.dirty;
    this.reloading = true;
    try { this.loadXlsx(pkg.save()); } finally { this.reloading = false; }
    this.dirty = dirty;
    this.selectSheet(this.views.length - 1);
    this.setZoom(zoom);
    this.changed('sheet');
    return nm;
  }

  /** Recalcula a pasta inteira (Fórmulas › Calcular Agora, F9). */
  recalculate(): void {
    if (!this.workbook) return;
    try { this.calc.recalcAll(); } catch (e) { console.warn('universal-sheet: recálculo', e); }
    this.cfEngines.clear();
    this.emitSelection();
    this.paint();
  }

  /** Nomes das funções no idioma das fórmulas (Inserir Função). */
  getFunctionNames(): string[] {
    return functionNames(this.calc.locale.lang).map((f) => f.name);
  }

  /** Começa a editar a célula ativa com `=FUNÇÃO(` (Inserir Função). */
  insertFunction(name: string): void {
    if (!this.view) return;
    this.beginEdit(this.sel.col, this.sel.row, `=${name}(`, false);
  }

  /**
   * AutoSoma (Σ, Alt+=) com SOMA/MÉDIA/CONT.NÚM/MÁXIMO/MÍNIMO: célula única → a
   * fórmula sobre os números logo acima (ou à esquerda), em edição, como o Excel;
   * intervalo → o resultado de cada coluna na célula abaixo dele.
   */
  autoSum(fn: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN' = 'SUM'): void {
    const v = this.view;
    if (!v) return;
    const local = (ref: string): string => this.calc.toLocalFormula(`=${fn}(${ref})`);
    const num = (c: number, r: number): boolean => {
      const cell = this.cellIndex(v, this.sheetIndex).get(r)?.get(c);
      return !!cell && (cell.formula !== undefined || (cell.value !== undefined && cell.type !== 's' && cell.type !== 'inlineStr' && cell.type !== 'str' && cell.type !== 'e'));
    };
    if (!this.isRange()) {
      const { col, row } = this.sel;
      // o bloco de números mais próximo acima (pulando as vazias logo acima); senão à esquerda
      const block = (dc: number, dr: number): string => {
        let c = col + dc, r = row + dr;
        while (c >= 1 && r >= 1 && !num(c, r) && !this.filled(c, r)) { c += dc; r += dr; }
        if (c < 1 || r < 1 || !num(c, r)) return '';
        const end = { c, r };
        while (c + dc >= 1 && r + dr >= 1 && num(c + dc, r + dr)) { c += dc; r += dr; }
        return `${rowColToRef(c, r)}:${rowColToRef(end.c, end.r)}`;
      };
      const ref = block(0, -1) || block(-1, 0);
      this.beginEdit(col, row, ref ? local(ref) : `=${localFunctionName(fn, this.calc.locale.lang)}(`, false);
      return;
    }
    const r = this.clampedRange();
    const at: { col: number; row: number }[] = [];
    for (let c = r.c1; c <= r.c2; c++) at.push({ col: c, row: r.r2 + 1 });
    this.record('autoSum', at, () => {
      for (let c = r.c1; c <= r.c2; c++) this.setCellValue(c, r.r2 + 1, local(`${rowColToRef(c, r.r1)}:${rowColToRef(c, r.r2)}`));
      return true;
    });
    this.afterCells('edit');
  }

  /** Depois de escrever células: repinta, reemite a seleção e avisa a mudança. */
  private afterCells(kind: string): void {
    const v = this.view;
    if (v) { v.rowXf = defaultXfMaps(v.worksheet).rowXf; v.colXf = defaultXfMaps(v.worksheet).colXf; }
    this.cfEngines.delete(this.sheetIndex);
    this.recalcGrid();
    this.emitSelection();
    this.paint();
    this.changed(kind);
  }

  // ───────────────────────── LIMPAR / PREENCHER / COPIAR ─────────────────────────

  /** Limpar (Página Inicial › Edição): conteúdo, formatos ou tudo da seleção. */
  clear(what: 'contents' | 'formats' | 'all' = 'contents'): void {
    const v = this.view;
    if (!v) return;
    const r = this.clampedRange();
    const cells = this.cellsIn(r);
    const whole = this.range.r2 >= MAX_ROWS || this.range.c2 >= MAX_COLS;
    const label = what === 'contents' ? 'clearContents' : what === 'formats' ? 'clearFormats' : 'clearAll';
    let refused: string | null = null;
    this.record(label, cells, () => {
      for (const { col, row } of cells) {
        if (what !== 'formats') {
          const res = this.setCellValue(col, row, '');
          if (!res.ok && res.message) refused = res.message;
        }
        if (what !== 'contents') {
          const cell = this.cellIndex(v, this.sheetIndex).get(row)?.get(col);
          if (cell) { delete cell.style; this.calc.dropIfEmpty(this.sheetIndex, col, row); }
        }
      }
      if (what !== 'contents' && whole) this.setLineStyles(() => 0);
      return true;
    }, what !== 'contents' && whole);
    if (refused) this.dispatchEvent(new CustomEvent('us-entry-error', { detail: { message: refused } }));
    if (what !== 'contents') { this.dirtySheets.add(this.sheetIndex); this.fitRowHeights(v); }
    this.afterCells(label);
  }

  /** Preencher para Baixo (Ctrl+D) / à Direita (Ctrl+R): copia a 1ª linha/coluna (ou a vizinha, numa só) ajustando as fórmulas. */
  fill(dir: 'down' | 'right'): void {
    const v = this.view;
    if (!v) return;
    const r = this.clampedRange();
    const down = dir === 'down';
    const single = down ? r.r1 === r.r2 : r.c1 === r.c2;
    if (single && (down ? r.r1 === 1 : r.c1 === 1)) return;
    const at: { col: number; row: number }[] = [];
    for (let row = r.r1; row <= r.r2; row++) for (let col = r.c1; col <= r.c2; col++) {
      if (!single && (down ? row === r.r1 : col === r.c1)) continue;
      at.push({ col, row });
    }
    const src = (col: number, row: number): { col: number; row: number } =>
      down ? { col, row: single ? r.r1 - 1 : r.r1 } : { col: single ? r.c1 - 1 : r.c1, row };
    this.record(down ? 'fillDown' : 'fillRight', at, () => {
      for (const t of at) {
        const s = src(t.col, t.row);
        this.writeCopy(s.col, s.row, t.col, t.row, true, false);
      }
      return true;
    });
    this.afterCells('fill');
  }

  /** Copia (col,row) → (dcol,drow) na aba ativa: texto (fórmula deslocada) e estilo. */
  private writeCopy(col: number, row: number, dcol: number, drow: number, shift: boolean, valuesOnly: boolean, from?: { sheet: number; edit: string; style: number | undefined }): void {
    const v = this.view!;
    const sheet = from?.sheet ?? this.sheetIndex;
    const text = from ? from.edit : valuesOnly ? this.calc.valueText(sheet, col, row) : this.calc.copyText(sheet, col, row, dcol, drow, shift);
    this.setCellValue(dcol, drow, text);
    if (valuesOnly) return;
    const style = from ? from.style : this.cellIndex(this.views[sheet]!, sheet).get(row)?.get(col)?.style;
    const cell = this.cellIndex(v, this.sheetIndex).get(drow)?.get(dcol);
    if (style === undefined) { if (cell) { delete cell.style; this.calc.dropIfEmpty(this.sheetIndex, dcol, drow); } }
    else (cell ?? this.calc.ensureCell(this.sheetIndex, dcol, drow)).style = style;
  }

  /** Área de transferência interna (copiar/colar dentro do elemento ajusta as fórmulas, como o Excel). */
  private clip: InternalClip | null = null;

  /**
   * Copiar (Ctrl+C): o texto da seleção (valores exibidos, separados por
   * tabulação, como o Excel põe na área de transferência) e a cópia interna,
   * que ao colar aqui leva fórmulas (ajustadas) e formatos.
   */
  copy(cut = false): string {
    const v = this.view;
    if (!v) return '';
    if (this.editing) this.commitEdit();
    const r = this.clampedRange();
    const cells: InternalClip['cells'] = [];
    const lines: string[] = [];
    for (let row = r.r1; row <= r.r2; row++) {
      const vals: string[] = [];
      for (let col = r.c1; col <= r.c2; col++) {
        const cell = this.cellIndex(v, this.sheetIndex).get(row)?.get(col);
        vals.push(tsvField(cell ? this.formatCell(cell).text : ''));
        if (cell) cells.push({ dc: col - r.c1, dr: row - r.r1, col, row, style: cell.style });
      }
      lines.push(vals.join('\t'));
    }
    const text = lines.join('\r\n') + '\r\n';
    this.clip = { sheet: this.sheetIndex, rect: r, cells, text, cut };
    return text;
  }

  /** Recortar (Ctrl+X): como copiar; ao colar, o conteúdo SAI da origem (fórmulas não se ajustam). */
  cut(): string { return this.copy(true); }

  /**
   * Colar (Ctrl+V) na célula ativa. Sem `text` (ou o mesmo texto da última
   * cópia daqui): a cópia interna, com fórmulas ajustadas e formatos;
   * `valuesOnly` cola só os valores (Colar Valores). Texto de fora: linhas e
   * tabulações viram células, cada uma como se digitada.
   */
  paste(text?: string, opts: { valuesOnly?: boolean } = {}): void {
    const v = this.view;
    if (!v) return;
    if (this.editing) this.commitEdit();
    const clip = this.clip;
    const internal = clip && (text === undefined || normalizeNl(text) === normalizeNl(clip.text));
    const { col: c0, row: r0 } = this.sel;
    if (internal) {
      const rows = clip.rect.r2 - clip.rect.r1 + 1, cols = clip.rect.c2 - clip.rect.c1 + 1;
      const at: { col: number; row: number }[] = [];
      for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) at.push({ col: c0 + dc, row: r0 + dr });
      const sameSheet = clip.sheet === this.sheetIndex;
      // origem lida ANTES de escrever (colar por cima da própria origem)
      const src = new Map<string, { sheet: number; edit: string; style: number | undefined }>();
      for (const c of clip.cells) {
        const edit = opts.valuesOnly ? this.calc.valueText(clip.sheet, c.col, c.row)
          : this.calc.copyText(clip.sheet, c.col, c.row, c0 + c.dc, r0 + c.dr, !clip.cut);
        src.set(`${c.dc},${c.dr}`, { sheet: clip.sheet, edit, style: c.style });
      }
      const cutSrc = clip.cut ? clip.cells.map((c) => ({ col: c.col, row: c.row })) : [];
      const record = sameSheet ? [...at, ...cutSrc.filter((s) => !at.some((a) => a.col === s.col && a.row === s.row))] : at;
      this.record(clip.cut ? 'cutPaste' : 'paste', record, () => {
        if (clip.cut && sameSheet) for (const s of cutSrc) if (!at.some((a) => a.col === s.col && a.row === s.row)) { this.setCellValue(s.col, s.row, ''); const cl = this.cellIndex(v, this.sheetIndex).get(s.row)?.get(s.col); if (cl) { delete cl.style; this.calc.dropIfEmpty(this.sheetIndex, s.col, s.row); } }
        for (const a of at) {
          const s = src.get(`${a.col - c0},${a.row - r0}`);
          if (s) this.writeCopy(0, 0, a.col, a.row, false, false, opts.valuesOnly ? { ...s, style: this.cellIndex(v, this.sheetIndex).get(a.row)?.get(a.col)?.style } : s);
          else if (!opts.valuesOnly) this.writeCopy(0, 0, a.col, a.row, false, false, { sheet: clip.sheet, edit: '', style: undefined });
        }
        return true;
      });
      if (clip.cut) this.clip = null;
      this.activate(c0, r0);
      this.extendTo(c0 + cols - 1, r0 + rows - 1);
      this.afterCells('paste');
      return;
    }
    const grid = parseTsv(text ?? '');
    if (!grid.length) return;
    const at: { col: number; row: number }[] = [];
    grid.forEach((line, dr) => line.forEach((_, dc) => at.push({ col: c0 + dc, row: r0 + dr })));
    let refused: string | null = null;
    this.record('paste', at, () => {
      grid.forEach((line, dr) => line.forEach((val, dc) => {
        const res = this.setCellValue(c0 + dc, r0 + dr, val);
        if (!res.ok && res.message) refused = res.message;
      }));
      return true;
    });
    if (refused) this.dispatchEvent(new CustomEvent('us-entry-error', { detail: { message: refused } }));
    const w = Math.max(...grid.map((l) => l.length));
    this.activate(c0, r0);
    this.extendTo(c0 + w - 1, r0 + grid.length - 1);
    this.afterCells('paste');
  }

  /** Há o que colar da cópia interna? */
  get hasClipboard(): boolean { return !!this.clip; }

  private onCopyEvent = (e: ClipboardEvent): void => {
    if (this.editing || !this.view) return;
    e.preventDefault();
    e.clipboardData?.setData('text/plain', this.copy(e.type === 'cut'));
    if (e.type === 'cut') this.paint();
  };

  private onPasteEvent = (e: ClipboardEvent): void => {
    if (this.editing || !this.view) return;
    e.preventDefault();
    this.paste(e.clipboardData?.getData('text/plain') ?? '');
  };

  // ───────────────────────── FORMATAR ─────────────────────────

  /**
   * Formatação da célula ativa (para os botões marcados das barras): fonte,
   * preenchimento, alinhamento, quebra, formato numérico e se está numa mescla.
   */
  getCellFormat(): {
    bold: boolean; italic: boolean; underline: boolean; strike: boolean; fontName: string; fontSize: number; color?: string;
    fill?: string; horizontal?: string; vertical?: string; wrap: boolean; indent: number; numFmtCode: string; merged: boolean;
  } {
    const cell = this.findCell(this.sel.col, this.sel.row);
    const st = this.resolveStyle(cell, this.sel.col, this.sel.row);
    const f = st.font;
    const code = this.styles.numFmts.get(st.numFmtId) ?? builtinFormatCode(st.numFmtId) ?? 'General';
    return {
      bold: !!f?.bold, italic: !!f?.italic, underline: !!f?.underline, strike: !!f?.strike,
      fontName: f?.name ?? this.normalFont.name, fontSize: f?.size ?? this.normalFont.size,
      ...(f?.color ? { color: f.color } : {}),
      ...(st.fill?.pattern === 'solid' && st.fill.fgColor ? { fill: st.fill.fgColor } : {}),
      ...(st.align ? { horizontal: st.align } : {}), ...(st.valign ? { vertical: st.valign } : {}),
      wrap: st.wrap, indent: st.indent, numFmtCode: code, merged: !!this.mergeAt(this.sel.col, this.sel.row),
    };
  }

  /**
   * Aplica a formatação à seleção, de uma vez (uma ação de Desfazer): fonte,
   * preenchimento (`#RRGGBB`; null = sem), bordas, alinhamento e formato de
   * número (um item da lista, `{ code }` ou `{ id, code }`).
   */
  setFormat(change: SheetFormatChange): void {
    const c: StyleChange = {};
    if (change.font) c.font = change.font;
    if (change.fill !== undefined) c.fill = change.fill;
    if (change.border !== undefined) c.border = change.border;
    if (change.align) c.align = change.align;
    if (change.numFmt !== undefined) c.numFmt = this.resolveNumFmt(change.numFmt);
    this.applyStyle('format', (xf) => this.calc.styleFor(xf, c), !!(c.font?.size || c.font?.name || c.align?.wrapText !== undefined || c.font?.bold !== undefined));
  }

  /** Item da lista / código → id (interno ou novo) e código do formato. */
  private resolveNumFmt(f: NumberFormatKind | { code: string } | { id: number; code?: string }): { id: number; code?: string } {
    if (typeof f === 'object' && 'id' in f) return f.code ? { id: f.id, code: f.code } : { id: f.id };
    const spec = typeof f === 'string' ? numberFormatFor(f, this.calc.locale.lang === 'pt-BR' ? 'pt-BR' : 'en-US') : { code: f.code };
    if (spec.id !== undefined) return { id: spec.id };
    return { id: this.calc.formatId(spec.code), code: spec.code };
  }

  /** Propriedades da pasta (docProps/core.xml e app.xml) e os nomes das abas. */
  getProperties(): { title?: string; subject?: string; creator?: string; lastModifiedBy?: string; created?: string; modified?: string; application?: string; sheets: string[] } {
    const core = this.pkg?.getPartText('docProps/core.xml') ?? '';
    const app = this.pkg?.getPartText('docProps/app.xml') ?? '';
    const tag = (xml: string, name: string): string | undefined => {
      const m = new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml);
      const v = m?.[1]?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
      return v || undefined;
    };
    const out: ReturnType<UniversalSheetElement['getProperties']> = { sheets: this.getSheetNames() };
    const set = (k: 'title' | 'subject' | 'creator' | 'lastModifiedBy' | 'created' | 'modified' | 'application', v: string | undefined): void => { if (v) out[k] = v; };
    set('title', tag(core, 'title'));
    set('subject', tag(core, 'subject'));
    set('creator', tag(core, 'creator'));
    set('lastModifiedBy', tag(core, 'lastModifiedBy'));
    set('created', tag(core, 'created'));
    set('modified', tag(core, 'modified'));
    set('application', tag(app, 'Application'));
    return out;
  }

  /** Fonte da seleção (negrito, itálico, tamanho, cor…). */
  setFont(font: FontChange): void { this.setFormat({ font }); }

  /** Alinhamento da seleção (horizontal, vertical, quebrar texto, recuo). */
  setAlignment(align: AlignChange): void { this.setFormat({ align }); }

  /** Formato de número da seleção: um item da lista do Excel ou um código (Mais Formatos). */
  setNumberFormat(fmt: NumberFormatKind | { code: string }): void {
    this.setFormat({ numFmt: fmt });
  }

  /** Aumentar (+1) / Diminuir (−1) Casas Decimais, a partir do formato de cada célula. */
  adjustDecimals(delta: 1 | -1): void {
    const memo = new Map<number, number>();
    this.applyStyle('format', (xf) => {
      let out = memo.get(xf);
      if (out !== undefined) return out;
      const id = this.styles.cellXfs[xf]?.numFmtId ?? 0;
      const code = this.styles.numFmts.get(id) ?? builtinFormatCode(id) ?? 'General';
      const next = adjustDecimals(code, delta);
      out = next === code ? xf : this.calc.styleFor(xf, { numFmt: { id: this.calc.formatId(next), code: next } });
      memo.set(xf, out);
      return out;
    });
  }

  /**
   * Bordas da seleção, como o botão Bordas do Excel: `all` (todas), `outside`
   * (contorno), `thickOutside` (contorno espesso), `top`/`bottom`/`left`/`right`
   * (só aquela borda do intervalo), `none` (sem bordas). `color` #RRGGBB.
   */
  setBorders(kind: 'all' | 'outside' | 'thickOutside' | 'top' | 'bottom' | 'left' | 'right' | 'none', color = '#000000'): void {
    const r = this.clampedRange();
    const thin = { style: 'thin', color }, thick = { style: 'medium', color };
    this.applyStyle('borders', (xf, col, row) => {
      if (kind === 'none') return this.calc.styleFor(xf, { border: null });
      const cur = this.styles.borders[this.styles.cellXfs[xf]?.borderId ?? 0] ?? {};
      const b: Border = {};
      for (const k of ['left', 'right', 'top', 'bottom', 'diagonal'] as const) if (cur[k]) b[k] = { ...cur[k]! };
      if (cur.diagonalUp) b.diagonalUp = true;
      if (cur.diagonalDown) b.diagonalDown = true;
      const edge = kind === 'thickOutside' ? thick : thin;
      if (kind === 'all') { b.left = thin; b.right = thin; b.top = thin; b.bottom = thin; }
      if ((kind === 'outside' || kind === 'thickOutside' || kind === 'left') && col === r.c1) b.left = edge;
      if ((kind === 'outside' || kind === 'thickOutside' || kind === 'right') && col === r.c2) b.right = edge;
      if ((kind === 'outside' || kind === 'thickOutside' || kind === 'top') && row === r.r1) b.top = edge;
      if ((kind === 'outside' || kind === 'thickOutside' || kind === 'bottom') && row === r.r2) b.bottom = edge;
      return this.calc.styleFor(xf, { border: b });
    }, false, r);
  }

  /**
   * Aplica `fn` (xf → xf novo) às células da seleção: as existentes e, num
   * intervalo comum, as vazias (criadas com o estilo); colunas/linhas inteiras
   * mudam o estilo da coluna/linha (como o Excel) e o das células existentes.
   */
  private applyStyle(label: string, fn: (xf: number, col: number, row: number) => number, refit = false, rect?: { c1: number; r1: number; c2: number; r2: number }): void {
    const v = this.view;
    if (!v || v.worksheet.chartsheet) return;
    if (this.editing) this.commitEdit();
    const whole = !rect && (this.range.r2 >= MAX_ROWS || this.range.c2 >= MAX_COLS);
    const r = rect ?? this.clampedRange();
    const area = (r.c2 - r.c1 + 1) * (r.r2 - r.r1 + 1);
    let at: { col: number; row: number }[];
    if (whole || area > MAX_FORMAT_CELLS) at = this.cellsIn(r).map(({ col, row }) => ({ col, row }));
    else {
      at = [];
      for (let row = r.r1; row <= r.r2; row++) for (let col = r.c1; col <= r.c2; col++) at.push({ col, row });
    }
    this.record(label, at, () => {
      const idx = this.cellIndex(v, this.sheetIndex);
      for (const { col, row } of at) {
        const cell = idx.get(row)?.get(col);
        const xf = xfIndexAt(v, cell, col, row);
        const nx = fn(xf, col, row);
        if (nx === xf && cell) continue;
        if (nx === xf && !cell) continue;
        const target = cell ?? this.calc.ensureCell(this.sheetIndex, col, row);
        if (nx === 0) { delete target.style; this.calc.dropIfEmpty(this.sheetIndex, col, row); } else target.style = nx;
      }
      if (whole) this.setLineStyles((xf, col, row) => fn(xf, col, row));
      return true;
    }, whole);
    this.dirtySheets.add(this.sheetIndex);
    v.rowXf = defaultXfMaps(v.worksheet).rowXf;
    v.colXf = defaultXfMaps(v.worksheet).colXf;
    if (refit) this.fitRowHeights(v);
    this.afterCells(label);
  }

  /** Estilo das colunas inteiras (`<col style>`) ou linhas inteiras (`<row s customFormat>`) da seleção. */
  private setLineStyles(fn: (xf: number, col: number, row: number) => number): void {
    const v = this.view!;
    const ws = v.worksheet;
    const r = this.range;
    if (r.c1 === 1 && r.c2 >= MAX_COLS && r.r2 < MAX_ROWS) {
      for (let row = r.r1; row <= r.r2; row++) {
        const rr = this.rowOf(ws, row, true)!;
        const nx = fn(rr.customFormat ? rr.style ?? 0 : 0, 0, row);
        if (nx === 0) { delete rr.style; delete rr.customFormat; } else { rr.style = nx; rr.customFormat = true; }
      }
      return;
    }
    // colunas: por trechos de <col> iguais (Selecionar Tudo vira um <col min=1 max=16384>)
    const c1 = r.c1, c2 = Math.min(r.c2, MAX_COLS);
    const width = pxToColWidthChars(v.defaultColW, this.mdw);
    const cols = (ws.cols ?? []).map((c) => ({ ...c })).sort((a, b) => a.min - b.min);
    const out: ColDef[] = [];
    let pos = c1;
    const restyle = (seg: ColDef): ColDef => {
      const nx = fn(seg.style ?? 0, seg.min, 0);
      const d: ColDef = { ...seg };
      if (nx === 0) delete d.style; else d.style = nx;
      if (d.width === undefined) d.width = width;
      return d;
    };
    for (const cd of cols) {
      if (cd.max < c1 || cd.min > c2) { out.push(cd); continue; }
      if (cd.min < c1) out.push({ ...cd, max: c1 - 1 });
      if (cd.min > pos) out.push(restyle({ min: pos, max: cd.min - 1 }));
      out.push(restyle({ ...cd, min: Math.max(cd.min, c1), max: Math.min(cd.max, c2) }));
      if (cd.max > c2) out.push({ ...cd, min: c2 + 1 });
      pos = Math.min(cd.max, c2) + 1;
    }
    if (pos <= c2) out.push(restyle({ min: pos, max: c2 }));
    ws.cols = out.filter((c) => c.style !== undefined || c.width !== undefined && (c.customWidth || c.hidden || c.width !== width)).sort((a, b) => a.min - b.min);
    for (const cd of ws.cols) if (cd.width !== undefined) for (let k = cd.min; k <= Math.min(cd.max, v.maxCol + 64); k++) if (!v.colWidths.has(k)) v.colWidths.set(k, colWidthToPx(cd.width, this.mdw));
  }

  /** A <row> do modelo (criada vazia, na ordem, se `create`). */
  private rowOf(ws: Worksheet, row: number, create: boolean): Worksheet['rows'][number] | undefined {
    let lo = 0, hi = ws.rows.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ws.rows[m]!.r < row) lo = m + 1; else hi = m; }
    if (ws.rows[lo]?.r === row) return ws.rows[lo];
    const found = ws.rows.find((x) => x.r === row);
    if (found || !create) return found;
    const r = { r: row, cells: [] };
    ws.rows.splice(lo, 0, r);
    this.rowMapCache.get(this.sheetIndex)?.set(row, new Map());
    return r;
  }

  // ───────────────────────── MESCLAR ─────────────────────────

  /** Mesclas que mudaram por aba (a gravação regrava <mergeCells>). */
  private mergeDirty = new Set<number>();
  /** Vistas que mudaram (linhas de grade, painéis congelados): a gravação regrava o <sheetView>. */
  private viewDirty = new Set<number>();

  private setMerges(sheet: number, merges: readonly string[]): void {
    const v = this.views[sheet]!;
    const ws = v.worksheet;
    ws.merges = [...merges];
    if (!ws.merges.length) delete ws.merges;
    const map = new Map<string, string>();
    for (const m of merges) map.set(m.split(':')[0]!, m);
    ws.mergedAreas = map;
    v.merges = map;
    v.mergeIndex = undefined;
    this.mergeDirty.add(sheet);
  }

  /** As outras células da seleção têm conteúdo (mesclar só fica com o da superior esquerda)? */
  mergeLosesData(): boolean {
    const r = this.clampedRange();
    return this.cellsIn(r).some(({ col, row, cell }) => (col !== r.c1 || row !== r.r1) && (cell.value !== undefined || cell.formula !== undefined || cell.inlineString !== undefined));
  }

  /**
   * Mesclar (Página Inicial › Alinhamento): `center` = Mesclar e Centralizar,
   * `across` = Mesclar Através (uma mescla por linha), `cells` = Mesclar Células.
   * Como o Excel, só o conteúdo da célula superior esquerda fica.
   */
  merge(kind: 'center' | 'across' | 'cells' = 'center'): void {
    const v = this.view;
    if (!v) return;
    const r = this.clampedRange();
    if (r.c1 === r.c2 && r.r1 === r.r2) return;
    const blocks = kind === 'across'
      ? Array.from({ length: r.r2 - r.r1 + 1 }, (_, i) => ({ c1: r.c1, r1: r.r1 + i, c2: r.c2, r2: r.r1 + i })).filter((b) => b.c1 !== b.c2)
      : [r];
    const at = this.cellsIn(r).map(({ col, row }) => ({ col, row }));
    if (kind === 'center' && !at.some((a) => a.col === r.c1 && a.row === r.r1)) at.push({ col: r.c1, row: r.r1 });
    this.record('merge', at, () => {
      const keep = (v.worksheet.merges ?? []).filter((m) => { const g = parseRange(m); return !g || g.c2 < r.c1 || g.c1 > r.c2 || g.r2 < r.r1 || g.r1 > r.r2; });
      for (const b of blocks) {
        for (const { col, row } of this.cellsIn(b)) if (col !== b.c1 || row !== b.r1) this.setCellValue(col, row, '');
        keep.push(`${rowColToRef(b.c1, b.r1)}:${rowColToRef(b.c2, b.r2)}`);
      }
      this.setMerges(this.sheetIndex, keep);
      if (kind === 'center') {
        const cell = this.calc.ensureCell(this.sheetIndex, r.c1, r.r1);
        const nx = this.calc.styleFor(xfIndexAt(v, cell, r.c1, r.r1), { align: { horizontal: 'center' } });
        if (nx) cell.style = nx; else delete cell.style;
      }
      return true;
    }, true);
    this.activate(r.c1, r.r1);
    this.range = this.expandMerges(r);
    this.dirtySheets.add(this.sheetIndex);
    this.fitRowHeights(v);
    this.afterCells('merge');
  }

  /** Desfazer Mesclagem das mesclas que a seleção toca. */
  unmerge(): void {
    const v = this.view;
    if (!v || !v.worksheet.merges?.length) return;
    const r = this.clampedRange();
    const keep = v.worksheet.merges.filter((m) => { const g = parseRange(m); return !g || g.c2 < r.c1 || g.c1 > r.c2 || g.r2 < r.r1 || g.r1 > r.r2; });
    if (keep.length === v.worksheet.merges.length) return;
    this.record('unmerge', [], () => { this.setMerges(this.sheetIndex, keep); return true; }, true);
    this.dirtySheets.add(this.sheetIndex);
    this.fitRowHeights(v);
    this.afterCells('merge');
  }

  // ───────────────────────── EXIBIR: PAINÉIS E GRADE ─────────────────────────

  /** Painéis congelados da aba ativa (0 = nenhum). */
  get frozenPanes(): { cols: number; rows: number } {
    const v = this.view;
    return { cols: v?.frozenCols ?? 0, rows: v?.frozenRows ?? 0 };
  }

  /**
   * Congelar Painéis: `cols` colunas à esquerda e `rows` linhas no topo (0, 0
   * descongela). Sem argumentos: na célula ativa (o que está acima e à esquerda
   * dela), como o Excel.
   */
  freezePanes(cols?: number, rows?: number): void {
    const v = this.view;
    if (!v || v.worksheet.chartsheet) return;
    const c = Math.max(0, Math.floor(cols ?? this.sel.col - 1));
    const r = Math.max(0, Math.floor(rows ?? this.sel.row - 1));
    if (c === v.frozenCols && r === v.frozenRows) return;
    this.record('freeze', [], () => {
      v.frozenCols = c;
      v.frozenRows = r;
      if (c || r) v.worksheet.pane = { xSplit: c, ySplit: r, topLeftCell: rowColToRef(c + 1, r + 1), state: 'frozen' };
      else delete v.worksheet.pane;
      v.pane = v.worksheet.pane;
      this.viewDirty.add(this.sheetIndex);
      this.dirtySheets.add(this.sheetIndex);
      return true;
    }, true);
    this.scrollX = 0;
    this.scrollY = 0;
    this.afterCells('view');
  }

  /** Linhas de grade visíveis na aba ativa (Exibir › Linhas de Grade); gravado no arquivo. */
  get showGridlines(): boolean { return this.view?.showGridLines !== false; }
  set showGridlines(on: boolean) {
    const v = this.view;
    if (!v || v.showGridLines === on) return;
    this.record('gridlines', [], () => {
      v.showGridLines = on;
      if (on) delete v.worksheet.showGridLines; else v.worksheet.showGridLines = false;
      this.viewDirty.add(this.sheetIndex);
      this.dirtySheets.add(this.sheetIndex);
      return true;
    }, true);
    this.afterCells('view');
  }

  // ───────────────────────── LARGURA, ALTURA, OCULTAR ─────────────────────────

  /** Colunas (ou linhas) da seleção, recortadas à grade. */
  private selectedLines(kind: 'cols' | 'rows'): number[] {
    const v = this.view!;
    const r = this.range;
    const out: number[] = [];
    if (kind === 'cols') for (let c = r.c1; c <= Math.min(r.c2, Math.max(v.maxCol, r.c1)); c++) out.push(c);
    else for (let k = r.r1; k <= Math.min(r.r2, Math.max(v.maxRow, r.r1)); k++) out.push(k);
    return out;
  }

  /**
   * Largura da coluna como o Excel a mostra (Largura da Coluna, `ColumnWidth`):
   * caracteres do dígito máximo da fonte Normal, sem a folga de 5 px — 8,43 na
   * coluna padrão de 64 px com MDW 7. (O `<col width>` gravado inclui a folga.)
   */
  columnWidth(col = this.sel.col): number {
    const v = this.view;
    if (!v) return 0;
    if (v.hiddenCols.has(col)) return 0;
    const px = v.colWidths.get(col) ?? v.defaultColW;
    const m = this.mdw;
    return px <= m + 5 ? Math.round((px / (m + 5)) * 100) / 100 : Math.trunc(((px - 5) / m) * 100 + 0.5) / 100;
  }

  /** Altura (pontos) da linha. */
  rowHeightPt(row = this.sel.row): number {
    const v = this.view;
    if (!v) return 0;
    if (v.hiddenRows.has(row)) return 0;
    return pxToRowHeightPt(v.rowHeights.get(row) ?? v.defaultRowH);
  }

  /** Largura da Coluna (Formatar): em caracteres como o Excel mostra (ver columnWidth), nas colunas da seleção (0 oculta). */
  setColumnWidth(width: number, cols = this.selectedLines('cols')): void {
    const v = this.view;
    if (!v || !(width >= 0)) return;
    const w = Math.min(255, width), m = this.mdw;
    const px = w < 1 ? Math.round(w * (m + 5)) : Math.round(w * m) + 5;
    this.record('columnWidth', [], () => {
      for (const c of cols) { this.applyResizePreview('col', c, px, false); this.commitResize('col', c); }
      return true;
    }, true);
    this.afterCells('resize');
  }

  /** Altura da Linha (Formatar): em pontos, nas linhas da seleção (0 oculta). */
  setRowHeight(pt: number, rows = this.selectedLines('rows')): void {
    const v = this.view;
    if (!v || !(pt >= 0)) return;
    const px = Math.round(rowPtToPx(Math.min(409, pt)));
    this.record('rowHeight', [], () => {
      for (const r of rows) { this.applyResizePreview('row', r, px, false); this.commitResize('row', r); }
      return true;
    }, true);
    this.afterCells('resize');
  }

  /** AutoAjuste da Largura da Coluna nas colunas da seleção. */
  autofitColumns(cols = this.selectedLines('cols')): void {
    if (!this.view) return;
    this.record('columnWidth', [], () => { for (const c of cols) this.autofitCol(c); return true; }, true);
    this.afterCells('resize');
  }

  /** AutoAjuste da Altura da Linha: a linha volta à altura automática. */
  autofitRows(rows = this.selectedLines('rows')): void {
    const v = this.view;
    if (!v) return;
    this.record('rowHeight', [], () => {
      for (const k of rows) {
        const r = this.rowOf(v.worksheet, k, false);
        if (r) { delete r.height; delete r.customHeight; delete r.hidden; }
        v.rowHeights.delete(k);
        v.hiddenRows.delete(k);
      }
      this.fitRowHeights(v);
      this.dirtySheets.add(this.sheetIndex);
      return true;
    }, true);
    this.afterCells('resize');
  }

  /** Ocultar/Reexibir as colunas ou linhas da seleção (Reexibir: as ocultas DENTRO dela e as vizinhas). */
  setHidden(kind: 'cols' | 'rows', hidden: boolean): void {
    const v = this.view;
    if (!v) return;
    let lines = this.selectedLines(kind);
    if (!hidden) {
      // reexibir: as ocultas entre as selecionadas e logo antes/depois (como selecionar B:D para ver C)
      const set = kind === 'cols' ? v.hiddenCols : v.hiddenRows;
      const lo = lines[0]!, hi = lines[lines.length - 1]!;
      const extra: number[] = [];
      for (let k = lo - 1; k >= 1 && set.has(k); k--) extra.push(k);
      for (let k = hi + 1; set.has(k); k++) extra.push(k);
      lines = [...lines, ...extra].filter((k) => set.has(k));
      if (!lines.length) return;
    }
    this.record(hidden ? 'hide' : 'unhide', [], () => {
      for (const k of lines) {
        if (kind === 'cols') {
          if (hidden) v.hiddenCols.add(k); else v.hiddenCols.delete(k);
          const ws = v.worksheet;
          const cols = ws.cols ?? (ws.cols = []);
          const cur = cols.find((c) => c.min <= k && c.max >= k);
          const base: ColDef = cur ? { ...cur } : { min: k, max: k, width: pxToColWidthChars(v.colWidths.get(k) ?? v.defaultColW, this.mdw) };
          for (let i = cols.length - 1; i >= 0; i--) {
            const cd = cols[i]!;
            if (cd.max < k || cd.min > k) continue;
            const parts: ColDef[] = [];
            if (cd.min < k) parts.push({ ...cd, max: k - 1 });
            if (cd.max > k) parts.push({ ...cd, min: k + 1 });
            cols.splice(i, 1, ...parts);
          }
          const d: ColDef = { ...base, min: k, max: k };
          if (hidden) d.hidden = true; else delete d.hidden;
          if (d.width === undefined) d.width = pxToColWidthChars(v.defaultColW, this.mdw);
          cols.push(d);
          cols.sort((a, b) => a.min - b.min);
        } else {
          if (hidden) v.hiddenRows.add(k); else v.hiddenRows.delete(k);
          const r = this.rowOf(v.worksheet, k, true)!;
          if (hidden) r.hidden = true; else delete r.hidden;
          if (!hidden && (v.rowHeights.get(k) ?? 1) === 0) { v.rowHeights.delete(k); delete r.height; delete r.customHeight; }
        }
      }
      if (!hidden && kind === 'cols') for (const k of lines) if ((v.colWidths.get(k) ?? 1) === 0) v.colWidths.delete(k);
      if (!hidden && kind === 'rows') this.fitRowHeights(v);
      this.dirtySheets.add(this.sheetIndex);
      return true;
    }, true);
    this.afterCells('resize');
  }

  // ───────────────────────── LOCALIZAR E SUBSTITUIR ─────────────────────────

  /** Texto em que a busca procura: o valor exibido ou a fórmula (como "Examinar: Fórmulas/Valores"). */
  private searchText(sheet: number, col: number, row: number, cell: Cell, lookIn: 'values' | 'formulas'): string {
    if (lookIn === 'values') {
      const keep = this.sheetIndex;
      this.sheetIndex = sheet;
      try { return this.formatCell(cell).text; } finally { this.sheetIndex = keep; }
    }
    try { return this.calc.barText(sheet, col, row).edit; } catch { return ''; }
  }

  private matcher(query: string, o: FindOptions): (s: string) => boolean {
    if (o.wholeCell) return o.matchCase ? (s) => s === query : (s) => s.toLocaleLowerCase() === query.toLocaleLowerCase();
    const q = o.matchCase ? query : query.toLocaleLowerCase();
    return o.matchCase ? (s) => s.includes(q) : (s) => s.toLocaleLowerCase().includes(q);
  }

  /**
   * Localizar (Ctrl+F): a próxima célula (ou a anterior, `backwards`) cujo texto
   * contém `query`, a partir da ativa, por linhas; com `allSheets` passa pelas
   * outras abas. Seleciona a célula achada e a devolve (null = nada).
   */
  find(query: string, opts: FindOptions = {}): { sheet: number; ref: string } | null {
    if (!query || !this.views.length) return null;
    const match = this.matcher(query, opts);
    const lookIn = opts.lookIn ?? 'formulas';
    const order: number[] = [];
    const n = this.views.length;
    for (let i = 0; i <= (opts.allSheets ? n : 0); i++) order.push((this.sheetIndex + (opts.backwards ? n - i : i)) % n);
    const cur = { sheet: this.sheetIndex, row: this.sel.row, col: this.sel.col };
    const after = (row: number, col: number): boolean => (opts.backwards ? row < cur.row || (row === cur.row && col < cur.col) : row > cur.row || (row === cur.row && col > cur.col));
    for (let pass = 0; pass < order.length; pass++) {
      const sheet = order[pass]!;
      const v = this.views[sheet]!;
      if (v.worksheet.chartsheet) continue;
      const list: { col: number; row: number; cell: Cell }[] = [];
      for (const [row, cells] of this.cellIndex(v, sheet)) for (const [col, cell] of cells) list.push({ col, row, cell });
      list.sort((a, b) => a.row - b.row || a.col - b.col);
      if (opts.backwards) list.reverse();
      const first = pass === 0, last = pass === order.length - 1 && order.length > 1;
      for (const it of list) {
        if (first && sheet === cur.sheet && !after(it.row, it.col)) continue;
        if (last && sheet === cur.sheet && after(it.row, it.col)) continue;
        if (!match(this.searchText(sheet, it.col, it.row, it.cell, lookIn))) continue;
        if (sheet !== this.sheetIndex) this.selectSheet(sheet);
        this.activate(it.col, it.row);
        this.ensureVisible();
        this.emitSelection();
        this.paint();
        return { sheet, ref: rowColToRef(it.col, it.row) };
      }
      // aba única: dá a volta nela mesma (o que vem antes da ativa)
      if (order.length === 1) {
        for (const it of list) {
          if (after(it.row, it.col)) continue;
          if (!match(this.searchText(sheet, it.col, it.row, it.cell, lookIn))) continue;
          this.activate(it.col, it.row);
          this.ensureVisible();
          this.emitSelection();
          this.paint();
          return { sheet, ref: rowColToRef(it.col, it.row) };
        }
      }
    }
    return null;
  }

  /** Troca `query` por `replacement` no texto de edição de UMA célula (fórmula ou constante); false se não casou. */
  private replaceIn(sheet: number, col: number, row: number, query: string, replacement: string, o: FindOptions): boolean {
    let edit: string;
    try { edit = this.calc.barText(sheet, col, row).edit; } catch { return false; }
    let next: string;
    if (o.wholeCell) {
      if (!(o.matchCase ? edit === query : edit.toLocaleLowerCase() === query.toLocaleLowerCase())) return false;
      next = replacement;
    } else {
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), o.matchCase ? 'g' : 'gi');
      if (!re.test(edit)) return false;
      next = edit.replace(re, () => replacement);
    }
    if (next === edit) return false;
    const keep = this.sheetIndex;
    this.sheetIndex = sheet;
    try { return this.setCellValue(col, row, next).ok; } finally { this.sheetIndex = keep; }
  }

  /** Substituir: troca na célula ativa (se casar) e vai para a próxima ocorrência. */
  replace(query: string, replacement: string, opts: FindOptions = {}): { sheet: number; ref: string } | null {
    if (!query) return null;
    const { col, row } = this.sel;
    const cell = this.findCell(col, row);
    if (cell && this.matcher(query, opts)(this.searchText(this.sheetIndex, col, row, cell, 'formulas'))) {
      this.record('replace', [{ col, row }], () => this.replaceIn(this.sheetIndex, col, row, query, replacement, opts));
      this.afterCells('edit');
    }
    return this.find(query, { ...opts, lookIn: 'formulas' });
  }

  /** Substituir Tudo: na aba ativa (ou em todas, `allSheets`); devolve quantas células mudaram. */
  replaceAll(query: string, replacement: string, opts: FindOptions = {}): number {
    if (!query) return 0;
    const sheets = opts.allSheets ? this.views.map((_, i) => i) : [this.sheetIndex];
    const match = this.matcher(query, opts);
    const before: SheetSnap[] = [], after: SheetSnap[] = [];
    let count = 0;
    for (const sheet of sheets) {
      const v = this.views[sheet]!;
      if (v.worksheet.chartsheet) continue;
      const hits: { col: number; row: number }[] = [];
      for (const [row, cells] of this.cellIndex(v, sheet)) for (const [col, cell] of cells) {
        if (match(this.searchText(sheet, col, row, cell, 'formulas'))) hits.push({ col, row });
      }
      if (!hits.length) continue;
      before.push({ sheet, cells: this.snapCells(sheet, hits) });
      for (const h of hits) if (this.replaceIn(sheet, h.col, h.row, query, replacement, opts)) count++;
      after.push({ sheet, cells: this.snapCells(sheet, hits) });
      this.cfEngines.delete(sheet);
    }
    if (count) { this.pushUndo('replaceAll', before, after); this.afterCells('edit'); }
    return count;
  }

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
    this.activate(origin.col, origin.row);
    this.ensureVisible();
    this.paint();
    this.editing = origin;

    // texto inicial
    let text: string;
    if (initialText !== undefined) text = initialText;
    else if (keepCurrent) {
      // fórmula no idioma ou o texto de edição da constante (data, %, 15 algarismos)
      text = this.barText(origin.col, origin.row).edit;
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
    // autocompletar de funções no idioma (lista sob o editor; Tab completa com "(")
    this.autocomplete.attach(input);

    let suppressBlur = false;
    input.addEventListener('keydown', (ev) => {
      if (this.autocomplete.handleKey(ev)) return;
      if ((ev.key === 'Enter' || ev.key === 'Tab') && !this.commitEdit()) {
        // entrada recusada (fórmula inválida): o Excel avisa e continua editando
        ev.preventDefault();
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        suppressBlur = true;
        // Enter no Excel desce uma linha
        if (this.view && this.sel.row < this.view.maxRow) {
          this.activate(this.sel.col, this.sel.row + 1);
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
        // Tab avança coluna
        const dir = ev.shiftKey ? -1 : 1;
        const next = Math.max(1, Math.min(this.view!.maxCol, this.sel.col + dir));
        this.activate(next, this.sel.row);
        this.ensureVisible(); this.emitSelection(); this.paint();
        this.canvas.focus();
      }
    });
    input.addEventListener('blur', () => {
      if (suppressBlur || !this.editing || this.autocomplete.holdsFocus()) return;
      this.commitEdit();
    });
  }

  /**
   * Commita o conteúdo do editor (entrada → motor → modelo). Entrada recusada
   * (fórmula inválida, parte de matriz): avisa, continua editando e devolve false.
   */
  commitEdit(): boolean {
    if (!this.editor || !this.editing) return true;
    const text = this.editor.value;
    const { col, row } = this.editing;
    const res = this.recordCells('typing', [{ col, row }], () => this.setCellValue(col, row, text));
    if (!res.ok) {
      this.showEntryError(res.message);
      this.editor?.focus();
      return false;
    }
    // solta o editor ANTES de removê-lo: a remoção dispara o blur (que commitaria de novo)
    const ed = this.editor;
    this.editor = null;
    this.editing = null;
    this.autocomplete.detach();
    ed?.remove();
    this.emitSelection();
    this.paint();
    return true;
  }

  /** Descarta a edição em andamento sem alterar o modelo. */
  cancelEdit(): void {
    if (!this.editor) return;
    const ed = this.editor;
    this.editor = null;
    this.editing = null;
    this.autocomplete.detach();
    this.hideEntryError();
    ed.remove();
    this.paint();
  }

  /**
   * Escreve `text` — como digitado, no idioma das fórmulas — na célula
   * `(col,row)` da aba ativa: "" apaga; "=…" fórmula; o resto vira constante
   * tipada como o Excel (número, data, %, moeda, booleano, erro, texto) com o
   * formato que a entrada aplica. O motor recalcula os dependentes (todas as
   * abas) e os valores mudados vão para o modelo (sheet-calc.ts). Fórmula
   * inválida é recusada (`ok: false` com a mensagem), como o Excel.
   */
  setCellValue(col: number, row: number, text: string): EditResult {
    const v = this.view;
    if (!v) return { ok: false, message: '' };
    const max = { c: v.maxCol, r: v.maxRow };
    let res: EditResult;
    try {
      res = this.calc.edit(this.sheetIndex, col, row, text);
    } catch (e) {
      console.error('universal-sheet: edição', e);
      return { ok: false, message: String(e) };
    }
    if (!res.ok) return res;
    this.hideEntryError();
    if (col > v.maxCol) v.maxCol = col;
    if (row > v.maxRow) v.maxRow = row;
    if (res.grew || v.maxCol !== max.c || v.maxRow !== max.r) this.recalcGrid();
    this.dispatchEvent(new CustomEvent('us-edit', { detail: { ref: rowColToRef(col, row), text } }));
    this.changed('edit');
    return res;
  }

  /** Disponível externamente (barra de fórmulas): commita o input externo. */
  setActiveCellText(text: string): EditResult {
    const { col, row } = this.sel;
    const res = this.recordCells('typing', [{ col, row }], () => this.setCellValue(col, row, text));
    if (!res.ok) {
      this.dispatchEvent(new CustomEvent('us-entry-error', { detail: { message: res.message } }));
      return res;
    }
    this.emitSelection();
    this.paint();
    return res;
  }

  /** Aviso de entrada recusada (o Excel abre uma caixa; aqui, uma etiqueta sob o editor + evento). */
  private entryError: HTMLDivElement | null = null;
  private showEntryError(message: string): void {
    this.dispatchEvent(new CustomEvent('us-entry-error', { detail: { message } }));
    if (!message || !this.editor) return;
    const tip = this.entryError ??= document.createElement('div');
    tip.textContent = message;
    tip.setAttribute('role', 'alert');
    tip.style.cssText =
      `position:absolute;left:${this.editor.offsetLeft}px;top:${this.editor.offsetTop + this.editor.offsetHeight + 2}px;` +
      'z-index:7;background:#fdecea;color:#8a1c1c;border:1px solid #e0a3a3;border-radius:3px;' +
      'padding:3px 8px;font:12px Segoe UI,Arial,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.15);';
    if (!tip.isConnected) this.wrap.appendChild(tip);
    this.editor.addEventListener('input', () => this.hideEntryError(), { once: true });
  }
  private hideEntryError(): void {
    this.entryError?.remove();
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

  private ensureVisible(target: { col: number; row: number } = this.sel): void {
    const v = this.view;
    if (!v) return;
    const col = Math.min(target.col, v.maxCol), row = Math.min(target.row, v.maxRow);
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
      ctx.fillText(this.uiText.empty, 20, 30);
      return;
    }

    if (v.worksheet.chartsheet) { this.paintChartsheet(ctx, v, W, H); return; }
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

    // desenhos (gráficos, imagens, formas) por quadrante, cada um com o próprio
    // scroll: a parte de um objeto sob o painel congelado não rola (como no Excel)
    const quads: [number, number, number, number, number, number][] = [[fw, fh, vw - fw, vh - fh, this.scrollX, this.scrollY]];
    if (fr > 0) quads.push([fw, 0, vw - fw, fh, this.scrollX, 0]);
    if (fc > 0) quads.push([0, fh, fw, vh - fh, 0, this.scrollY]);
    if (fc > 0 && fr > 0) quads.push([0, 0, fw, fh, 0, 0]);
    for (const [qx, qy, qw, qh, sx, sy] of quads) {
      if (qw <= 0 || qh <= 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(qx, qy, qw, qh);
      ctx.clip();
      this.paintDrawings(ctx, sx, sy, { x: qx, y: qy, w: qw, h: qh });
      ctx.restore();
    }

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
    return this.cellIndex(v, this.sheetIndex);
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
      // aba da direita para a esquerda (sheetView rightToLeft): a coluna A fica à
      // direita — a grade é pintada espelhada (o texto se desespelha em
      // drawCellText); imagens/gráficos vão para a caixa espelhada sem inverter
      const rtl = !!v.worksheet.rightToLeft;
      ctx.setTransform(rtl ? -1 : 1, 0, 0, 1, rtl ? w : 0, 0);
      const rowMap = this.paintCaches(v);
      this.paintRegion(ctx, rowMap, 0, 0, w, h, 1, nCols, 1, nRows, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      this.mirrorW = rtl ? w : 0;
      this.paintDrawings(ctx, 0, 0, { x: 0, y: 0, w, h });
      this.mirrorW = 0;
      ctx.restore();
    }
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

    // 3 passadas, como o Excel: fundos de TODAS as células, depois os textos
    // (o transbordo passa por cima do preenchimento da vizinha vazia), por fim
    // bordas e marcadores
    for (let phase = 0; phase < 3; phase++) {
    // bordas: por FRONTEIRA (conflito entre vizinhas e cantos como o Excel),
    // depois dos textos e antes dos marcadores
    if (phase === 2) this.paintGridBorders(ctx, rowMap, firstCol, lastCol, firstRow, lastRow, sx, sy);
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
        // estilo efetivo: formatação direta sobre a camada da tabela (e CF)
        const st = this.styleAt(cell, dcol, drow);
        const isEditingThis = this.editing && this.editing.col === dcol && this.editing.row === drow;

        if (phase === 0) {
          // área mesclada COBRE as linhas de grade INTERNAS (as do contorno
          // continuam) — fundo branco antes do fill/texto
          if (m) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(left + 1, top + 1, drawW - 1, drawH - 1);
          }
          // preenchimento (sólido, padrão, degradê, CF) cobre a célula E as 4
          // linhas de grade em volta; entre duas preenchidas a fronteira fica
          // com a de baixo/direita (pinta depois). Medido em t-fillgrid (célula
          // isolada no meio do range). A moldura EXTERNA da imagem da câmera
          // sai sempre sem cor — artefato do oráculo (lo-condFormat_cellis)
          paintCellFill(ctx, st.fill, left, top, drawW + 1, drawH + 1, -sx, -sy);
          // formatação condicional: barra de dados e ícone (o fundo já veio no estilo)
          if (st.cf?.bar) paintDataBar(ctx, st.cf.bar, left, top, drawW, drawH);
          if (st.cf?.icon) paintCfIcon(ctx, st.cf.icon.set, st.cf.icon.index, Math.round(left) + 2 * this.zoom, Math.round(top + drawH) - 17 * this.zoom, 16 * this.zoom);
          continue;
        }
        if (phase === 1) {
          // texto (com transbordo p/ vizinhas vazias e #### quando não cabe).
          // Suprime o texto da célula em edição — o input flutuante já o exibe.
          if (!isEditingThis) {
            this.paintCell(ctx, cell, st, left, top, drawW, drawH, dcol, drow, cells, !!m);
          } else {
            // pinta um fundo branco para sobrepor preenchimento/cond format atrás do input
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(left, top, drawW, drawH);
          }
          continue;
        }
        // diagonais (as bordas laterais vão na passada de grade, abaixo)
        if (st.border && (st.border.diagonalUp || st.border.diagonalDown)) paintDiagonals(ctx, st.border, left, top, drawW, drawH);
        // indicador de comentario: triangulo vermelho no canto superior direito
        // (5px de lado @zoom=1) — IDENTICO a representacao do app de referencia.
        if (v.commentAt.size > 0 && v.commentAt.has(`${dcol},${drow}`)) {
          this.paintCommentIndicator(ctx, left, top, drawW);
        }
        // botão de autofiltro (cabeçalho de tabela / autofiltro da planilha)
        {
          // + botão de campo de tabela dinâmica marcado no xf (pivotButton="1")
          const fa = v.filterAt.size > 0 ? v.filterAt.get(`${dcol},${drow}`) : undefined;
          if (fa !== undefined) this.paintFilterArrow(ctx, left, top, drawW, drawH, fa);
          else if (cell?.style !== undefined && this.styles.cellXfs[cell.style]?.pivotButton) this.paintFilterArrow(ctx, left, top, drawW, drawH, false);
        }
        if (v.tableEnds.size > 0 && v.tableEnds.has(`${dcol},${drow}`)) paintTableHandle(ctx, left + drawW, top + drawH);
      }
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

  /** Imagens/formas dos desenhos do workbook (leitor e pintor DrawingML do Slides). */
  private drawingLayer: SheetDrawings | null = null;

  /** Borda esquerda (px, zoom, sem scroll) da coluna 0-based `i` — além da grade, colunas padrão. */
  private readonly edgeX = (i: number): number => {
    const n = this.xs.length - 1;
    if (i <= n) return this.xs[Math.max(0, i)] ?? 0;
    return (this.xs[n] ?? 0) + (i - n) * (this.view?.defaultColW ?? DEFAULT_COL_W) * this.zoom;
  };
  /** Borda superior (px, zoom, sem scroll) da linha 0-based `i`. */
  private readonly edgeY = (i: number): number => {
    const n = this.ys.length - 1;
    if (i <= n) return this.ys[Math.max(0, i)] ?? 0;
    return (this.ys[n] ?? 0) + (i - n) * (this.view?.defaultRowH ?? DEFAULT_ROW_H) * this.zoom;
  };

  /** Pilha CSS do texto das formas (resolvedor único; família ausente → Calibri, como no Office). */
  private readonly shapeFontStack = (family: string, bold = false, italic = false): string =>
    this.fontResolver.cssStack(family, SHAPE_FALLBACKS, variantOf(bold, italic));

  /** Abas já lidas (nome → Worksheet): fonte dos dados dos gráficos (o Excel relê as células). */
  private chartSheetMap(): Map<string, Worksheet> {
    const m = new Map<string, Worksheet>();
    for (const v of this.views) {
      const ref = this.workbook?.sheets.find((s) => s.target === v.path);
      if (ref) m.set(ref.name, v.worksheet);
    }
    return m;
  }

  /**
   * Pinta os desenhos do sheet ativo — gráficos, imagens, formas — na ordem
   * do arquivo (z-order), por cima da grade. (sx, sy) = scroll efetivo do
   * quadrante; `view` = área visível (px) para pular o que está fora.
   */
  private paintDrawings(ctx: CanvasRenderingContext2D, sx: number, sy: number, view: Rect): void {
    const v = this.view;
    if (!v || (v.charts.length === 0 && v.drawings.length === 0)) return;
    const layer = this.drawingLayer;
    if (layer && v.drawings.length) this.prepareDrawings(layer, v.drawings);
    const items: (DrawingChart | DrawingObject)[] = [...v.charts, ...v.drawings].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const it of items) {
      const r = anchorRect(it.anchor, this.edgeX, this.edgeY, this.zoom);
      const x = r.x - sx, y = r.y - sy;
      // fora da área (folga p/ giro/sombra: a maior dimensão)
      const m = Math.max(r.w, r.h) + 40;
      if (x > view.x + view.w + m || y > view.y + view.h + m || x + r.w < view.x - m || y + r.h < view.y - m) continue;
      // aba da direita para a esquerda (captura): o objeto vai para a caixa
      // espelhada, sem inverter o conteúdo
      const dx = this.mirrorW ? this.mirrorW - 2 * x - r.w : 0;
      if (dx) { ctx.save(); ctx.translate(dx, 0); }
      if ('chartXml' in it) this.paintAnchoredChart(ctx, it, { x, y, w: r.w, h: r.h });
      else layer?.paint(ctx, it, r, sx, sy, this.zoom, this.shapeFontStack, (xml, cr, part) => this.paintAnchoredChart(ctx, { chartXml: xml, ...(part ? { part } : {}) }, cr));
      if (dx) ctx.restore();
    }
  }

  /** Lê os objetos (uma vez) e pede as fontes do texto deles ao resolvedor. */
  private prepareDrawings(layer: SheetDrawings, objs: DrawingObject[]): void {
    const before = layer.typefaces().length;
    layer.prepare(objs);
    const fams = layer.typefaces();
    if (fams.length > before) void this.fontResolver.resolve(fams);
  }

  /**
   * Resolve quando os desenhos de TODAS as abas foram lidos, as imagens
   * decodificadas e as fontes do texto resolvidas (captura/export/harness).
   */
  async drawingsReady(): Promise<void> {
    // fontes das células resolvidas (larguras, quebra e altura automática finais)
    await this.sheetFonts;
    const layer = this.drawingLayer;
    if (!layer) return;
    for (const v of this.views) if (v.drawings.length) this.prepareDrawings(layer, v.drawings);
    await this.fontResolver.resolve(layer.typefaces());
    await layer.settled();
  }

  /**
   * Um gráfico (`chartN.xml`, ou `chartExN.xml`) no retângulo da âncora (px no
   * canvas), com os dados das células e o desenho do gráfico (`part`).
   */
  private paintAnchoredChart(ctx: CanvasRenderingContext2D, ch: { chartXml: string; part?: string }, r: Rect): void {
    const chartXml = ch.chartXml;
    const { x, y, w, h } = r;
    if (w <= 0 || h <= 0) return;
    let model = this.chartCache.get(chartXml);
    if (!model) { model = chartModelFor(this.pkg!, ch, this.chartTheme, this.chartSheetMap()); this.chartCache.set(chartXml, model); }
    // px por pt: 96/72 na base, escalado pelo zoom (tipografia do chart).
    // Moldura: a cor das linhas default do gráfico (o Excel desenha; medido #898989).
    paintChart(ctx, model, x, y, w, h, this.zoom * 96 / 72);
  }

  /**
   * Aba de GRÁFICO (`<chartsheet>`): sem grade nem cabeçalhos, o gráfico da
   * âncora absoluta na escala da vista — `zoomScale` (o Chart.Export do Excel
   * sai nessa escala, medido: 84% → 0,84 × pt × 96/72) ou ajustado à janela.
   */
  private paintChartsheet(ctx: CanvasRenderingContext2D, v: SheetView, W: number, H: number): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    const cs = v.worksheet.chartsheet!;
    for (const ch of v.charts) {
      const ext = ch.anchor.ext;
      if (!ext || ext.cx <= 0 || ext.cy <= 0) continue;
      const px = (ch.anchor.pos?.x ?? 0) / 9525, py = (ch.anchor.pos?.y ?? 0) / 9525;
      const pw = ext.cx / 9525, ph = ext.cy / 9525;
      const k = cs.zoomToFit ? Math.min(W / (pw + 2 * px), H / (ph + 2 * py)) : cs.zoom / 100 * this.zoom;
      let model = this.chartCache.get(ch.chartXml);
      if (!model) { model = chartModelFor(this.pkg!, ch, this.chartTheme, this.chartSheetMap()); this.chartCache.set(ch.chartXml, model); }
      paintChart(ctx, model, px * k, py * k, pw * k, ph * k, k * 96 / 72);
    }
  }

  /**
   * Botão de autofiltro como o Excel o desenha (medido no oráculo a 100%):
   * 17×17 px no canto inferior direito da célula (encostado na direita, 1 px
   * acima da base), laterais #A6ACB3, fundo em degradê #FEFEFE→#EFF2F7, base
   * com "lábio" #A6ACB3/#91969D/#DDE1E7 e triângulo cinza de 7·5·3·1 px.
   * Filtro ativo: funil no lugar do triângulo.
   */
  private paintFilterArrow(ctx: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, active = false): void {
    const z = this.zoom;
    const S = Math.max(9, Math.round(17 * z));
    if (h < 8 || w < 8) return;
    const size = Math.min(S, Math.round(h) - 2, Math.round(w));
    const x0 = Math.round(left + w) - size, y0 = Math.round(top + h) - 1 - size;
    ctx.save();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + size - 3);
    g.addColorStop(0, '#FEFEFE');
    g.addColorStop(1, '#EFF2F7');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, size, size - 2);
    ctx.fillStyle = '#A6ACB3';
    ctx.fillRect(x0, y0, 1, size - 2);
    ctx.fillRect(x0 + size - 1, y0, 1, size - 2);
    ctx.fillRect(x0, y0 + size - 3, size, 1);
    ctx.fillStyle = '#91969D';
    ctx.fillRect(x0, y0 + size - 2, size, 1);
    ctx.fillRect(x0, y0 + size - 1, 1, 1);
    ctx.fillRect(x0 + size - 1, y0 + size - 1, 1, 1);
    ctx.fillStyle = '#DDE1E7';
    ctx.fillRect(x0 + 1, y0 + size - 1, size - 2, 1);
    const cx = x0 + Math.floor(size / 2);
    const ty = y0 + Math.round(5 * size / 17);
    ctx.fillStyle = '#6F7174';
    if (!active) {
      for (let k = 0; k < 4; k++) ctx.fillRect(cx - 3 + k, ty + k, 7 - 2 * k, 1);
    } else {
      // filtro aplicado (medido em lo-dateAutofilter): funil 9·7·5 px + haste
      // de 3 px à direita e setinha 3·1 px à esquerda
      const s = size / 17;
      const fx = x0 + Math.round(7 * s), fy = y0 + Math.round(2 * s);
      ctx.fillRect(fx, fy, 9, 1);
      ctx.fillRect(fx + 1, fy + 1, 7, 1);
      ctx.fillRect(fx + 2, fy + 2, 5, 1);
      ctx.fillRect(fx + 3, fy + 3, 3, 5);
      ctx.fillRect(x0 + Math.round(4 * s), y0 + Math.round(8 * s), 3, 1);
      ctx.fillRect(x0 + Math.round(5 * s), y0 + Math.round(9 * s), 1, 1);
    }
    ctx.restore();
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

  /**
   * "Centralizar na seleção" (centerContinuous): largura das células à direita
   * VAZIAS e com o mesmo alinhamento — o texto centra sobre o conjunto.
   */
  private centerAcrossExtent(col: number, row: number, cells: Map<number, Cell> | undefined): number {
    const v = this.view;
    const maxCol = v?.maxCol ?? col;
    let ext = 0;
    for (let c = col + 1, guard = 0; c <= maxCol && guard < 200; c++, guard++) {
      const cell = cells?.get(c);
      if (!cell || this.cellHasContent(cells, c, row)) break;
      if (this.resolveStyle(cell).align !== 'centerContinuous') break;
      if (!v?.hiddenCols.has(c)) ext += this.colWidth(c);
    }
    return ext;
  }

  /** Localiza a mescla que cobre (col,row), se houver. */
  private mergeAt(col: number, row: number): { firstCol: number; lastCol: number; firstRow: number; lastRow: number; isOrigin: boolean } | null {
    const v = this.view;
    if (!v || v.merges.size === 0) return null;
    // índice espacial construído na 1ª consulta (a busca linear travava com milhares de mesclas)
    if (!v.mergeIndex) {
      const rects: MergeRect[] = [];
      for (const [, range] of v.merges) {
        const [a, b] = range.split(':');
        if (!a || !b) continue;
        try {
          const s = refToRowCol(a), e = refToRowCol(b);
          rects.push({ c1: s.col, r1: s.row, c2: e.col, r2: e.row });
        } catch { /* ref inválida: ignora a mescla */ }
      }
      v.mergeIndex = new MergeIndex(rects);
    }
    const m = v.mergeIndex.at(col, row);
    if (!m) return null;
    return { firstCol: m.c1, lastCol: m.c2, firstRow: m.r1, lastRow: m.r2, isOrigin: col === m.c1 && row === m.r1 };
  }

  /**
   * Bordas da região por FRONTEIRA, como o Excel (ver borders.ts): em cada
   * segmento vence a borda mais forte entre as duas células vizinhas; cantos
   * estendidos pelas perpendiculares; fronteiras internas de mescla ficam sem
   * borda. Vãos de tracejado apagam a linha de grade quando ela aparece ali.
   */
  private paintGridBorders(
    ctx: CanvasRenderingContext2D, rowMap: Map<number, Map<number, Cell>>,
    firstCol: number, lastCol: number, firstRow: number, lastRow: number, sx: number, sy: number,
  ): void {
    const v = this.view!;
    const c0 = Math.max(1, firstCol - 1), c1 = lastCol + 1;
    const r0 = Math.max(1, firstRow - 1), r1 = lastRow + 1;
    const nc = c1 - c0 + 1, nr = r1 - r0 + 1;
    if (nc <= 0 || nr <= 0 || nc * nr > 4_000_000) return;
    const bd: (Border | undefined)[] = new Array(nc * nr);
    const tb: (Border | undefined)[] = new Array(nc * nr);
    const filled: boolean[] = new Array(nc * nr);
    let any = false;
    const has = (b: Border | undefined): boolean => !!b && !!(b.left || b.right || b.top || b.bottom);
    for (let r = r0; r <= r1; r++) {
      const cells = rowMap.get(r);
      for (let c = c0; c <= c1; c++) {
        const st = this.styleAt(cells?.get(c), c, r);
        const k = (r - r0) * nc + (c - c0);
        bd[k] = st.border;
        tb[k] = st.tableBorder;
        filled[k] = st.filled;
        if (has(st.border) || has(st.tableBorder)) any = true;
      }
    }
    if (!any) return;
    const at = (arr: (Border | undefined)[], c: number, r: number): Border | undefined => (c < c0 || c > c1 || r < r0 || r > r1 ? undefined : arr[(r - r0) * nc + (c - c0)]);
    const B = (c: number, r: number): Border | undefined => at(bd, c, r);
    const T = (c: number, r: number): Border | undefined => at(tb, c, r);
    const F = (c: number, r: number): boolean => (c < c0 || c > c1 || r < r0 || r > r1 ? false : !!filled[(r - r0) * nc + (c - c0)]);
    const sameMerge = (ca: number, ra: number, cb: number, rb: number): boolean => {
      if (v.merges.size === 0) return false;
      const m = this.mergeAt(ca, ra);
      return !!m && cb >= m.firstCol && cb <= m.lastCol && rb >= m.firstRow && rb <= m.lastRow;
    };
    // fronteira horizontal no topo da linha r, coluna c; vertical à esquerda da coluna c, linha r
    // borda explícita (célula/CF) de qualquer lado vence a do estilo de tabela
    const hEdge = (c: number, r: number): BorderEdge | undefined =>
      sameMerge(c, r - 1, c, r) ? undefined
        : winningEdge(B(c, r - 1)?.bottom, B(c, r)?.top) ?? winningEdge(T(c, r - 1)?.bottom, T(c, r)?.top);
    const vEdge = (c: number, r: number): BorderEdge | undefined =>
      sameMerge(c - 1, r, c, r) ? undefined
        : winningEdge(B(c - 1, r)?.right, B(c, r)?.left) ?? winningEdge(T(c - 1, r)?.right, T(c, r)?.left);
    const corner = (e1: BorderEdge | undefined, e2: BorderEdge | undefined): CornerInfo => {
      if (!e1 && !e2) return NO_CORNER;
      const a = edgeExtent(e1?.style), b = edgeExtent(e2?.style);
      return { before: Math.max(a[0], b[0]), after: Math.max(a[1], b[1]), doubleBefore: e1?.style === 'double', doubleAfter: e2?.style === 'double' };
    };
    const px = (c: number): number => Math.round((this.xs[c - 1] ?? 0) - sx);
    const py = (r: number): number => Math.round((this.ys[r - 1] ?? 0) - sy);
    const grid = v.showGridLines !== false;
    // verticais primeiro: nos cantos a horizontal passa por cima (caixa medida)
    for (let r = firstRow; r <= lastRow; r++) {
      const y0 = py(r), y1 = py(r + 1);
      if (y1 <= y0) continue;
      for (let c = firstCol; c <= lastCol + 1; c++) {
        const e = vEdge(c, r);
        if (!e) continue;
        const x = px(c);
        const top = corner(hEdge(c - 1, r), hEdge(c, r));
        const bot = corner(hEdge(c - 1, r + 1), hEdge(c, r + 1));
        const erase = grid && !F(c - 1, r) && !F(c, r) ? '#ffffff' : null;
        paintVEdge(ctx, e, y0, y1, x, top, bot, Math.round(sy), erase);
      }
    }
    for (let r = firstRow; r <= lastRow + 1; r++) {
      const y = py(r);
      for (let c = firstCol; c <= lastCol; c++) {
        const e = hEdge(c, r);
        if (!e) continue;
        const x0 = px(c), x1 = px(c + 1);
        if (x1 <= x0) continue;
        const left = corner(vEdge(c, r - 1), vEdge(c, r));
        const right = corner(vEdge(c + 1, r - 1), vEdge(c + 1, r));
        const erase = grid && !F(c, r - 1) && !F(c, r) ? '#ffffff' : null;
        paintHEdge(ctx, e, x0, x1, y, left, right, Math.round(sx), erase);
      }
    }
  }
  private paintCell(
    ctx: CanvasRenderingContext2D, cell: Cell | undefined,
    st: ResolvedStyle, left: number, top: number, w: number, h: number,
    col = 0, row = 0, cells?: Map<number, Cell>, merged = false,
  ): void {
    // indicador "número armazenado como texto" (por cima do texto; também com showValue=0)
    this.paintCellContent(ctx, cell, st, left, top, w, h, col, row, cells, merged);
    if (this.numberAsTextMark(cell, col, row)) paintErrorMark(ctx, left, top, this.zoom);
  }

  /** Célula de TEXTO que o Excel marca como número armazenado como texto (fora de ignoredErrors). */
  private numberAsTextMark(cell: Cell | undefined, col: number, row: number): boolean {
    if (!cell || (cell.type !== 's' && cell.type !== 'inlineStr') || cell.formula !== undefined) return false;
    const t = cell.type === 's' ? this.shared[parseInt(cell.value ?? '', 10)]?.text : cell.inlineString?.text ?? cell.value;
    if (!t || !looksLikeNumberPtBR(t)) return false;
    const v = this.view;
    const ign = v?.worksheet.ignoreNumberAsText;
    if (!v || !ign) return true;
    let rects = this.ignoreRects.get(v);
    if (!rects) {
      rects = [];
      for (const s of ign) {
        try {
          const [a, b] = s.split(':');
          const p = refToRowCol(a!), q = b ? refToRowCol(b) : p;
          rects.push([Math.min(p.col, q.col), Math.min(p.row, q.row), Math.max(p.col, q.col), Math.max(p.row, q.row)]);
        } catch { /* faixa de coluna/linha inteira: ignora */ }
      }
      this.ignoreRects.set(v, rects);
    }
    return !rects.some(([c0, r0, c1, r1]) => col >= c0 && col <= c1 && row >= r0 && row <= r1);
  }

  /** Texto da célula (normal ou rico) — sem os indicadores. */
  private paintCellContent(
    ctx: CanvasRenderingContext2D, cell: Cell | undefined,
    st: ResolvedStyle, left: number, top: number, w: number, h: number,
    col: number, row: number, cells: Map<number, Cell> | undefined, merged: boolean,
  ): void {
    // formatação condicional com showValue=0: só a barra/ícone, sem o valor
    if (st.cf?.hideValue) return;
    // texto rico (runs): mede e desenha run a run (fonte/cor/sublinhado por run)
    const runs = this.cellRuns(cell);
    if (runs && runs.length > 0) {
      if (this.formatCell(cell, st.numFmtCode).text === '') return;
      this.paintRichCell(ctx, runs, st, left, top, w, h, col, row, cells, merged);
      return;
    }
    // "centralizar na seleção": a célula + vizinhas vazias à direita com o mesmo
    // alinhamento formam a largura onde o texto centra (títulos de tabelas .xls)
    const cw = st.align === 'centerContinuous' && !merged ? w + this.centerAcrossExtent(col, row, cells) : w;
    const lay = this.cellLayout(cell, st, cw);
    if (!lay || (lay.ct.pieces.length === 0 && !lay.ct.text)) return;
    const font = st.font;
    let { f, ct } = lay;
    // "reduzir para caber": o conteúdo inteiro (sem ####/menos casas) numa fonte menor
    if (this.styles.cellXfs[cell?.style ?? 0]?.shrinkToFit && !st.wrap && !st.rotation) {
      const wide = layoutCellText(lay.inp, f, 1e6);
      const W = wide.width >= 0 ? wide.width : f.width(wide.text);
      const boxW = cw - cellMarginPx(f.ppem);
      if (W > boxW && W > 0 && boxW > 0) {
        const base = scriptFont(font);
        f = this.cellFont({ ...(base ?? {}), size: Math.max(1, (base?.size ?? 11) * boxW / W) });
        ct = layoutCellText(lay.inp, f, cw);
      }
    }
    paintCellText({
      ctx, f, ct, kind: lay.inp.kind, baselineShift: scriptShift(font, this.zoom),
      left, top, w: cw, h,
      halign: st.align, valign: st.valign, wrap: st.wrap,
      indent: st.indent, indentPx: this.indentUnitPx() * this.zoom,
      rotation: st.rotation,
      // cor do numFmt (ex.: [Red] em negativos) tem prioridade sobre a da fonte
      color: ct.color ?? font?.color ?? TEXT,
      underline: font?.underline ? font.underlineStyle ?? 'single' : undefined,
      strike: !!font?.strike,
      lineH: excelRowPx(font?.name ?? this.normalFont.name, font?.size ?? this.normalFont.size, !!font?.bold) * this.zoom,
      merged,
      overflow: (dir, need) => this.overflowExtent(col, row, cells, dir, need),
      rowDesc: this.rowDescPx(row),
    });
  }

  /** Base compartilhada da linha (maior descent das fontes, px no zoom). */
  private rowDescPx(row: number): number {
    const d = this.view?.rowDesc.get(row) ?? rowDescentPx(this.normalFont.name, this.normalFont.size, this.normalFont.bold) ?? 0;
    return Math.round(d * this.zoom);
  }

  /** Runs ricos da célula, se houver (shared string ou string inline). */
  private cellRuns(cell: Cell | undefined): RichRun[] | undefined {
    if (!cell) return undefined;
    if (cell.type === 's' && cell.value !== undefined) return this.shared[parseInt(cell.value, 10)]?.runs;
    if (cell.type === 'inlineStr') return cell.inlineString?.runs;
    return undefined;
  }

  /** Estilo efetivo de um run rico: props do run sobrepõem a fonte da célula. */
  private richRunStyle(base: Font | undefined, p: RunProps | undefined): RichRunStyle {
    const font: Font = {
      name: p?.font ?? base?.name ?? this.normalFont.name,
      // rFont explícito do run usa o fallback do app; senão o da célula (altName)
      ...(p?.font ? {} : base?.altName ? { altName: base.altName } : {}),
      bold: p?.bold ?? base?.bold ?? false,
      italic: p?.italic ?? base?.italic ?? false,
      size: p?.size ?? base?.size ?? 11,
      vertAlign: p?.vertAlign ?? base?.vertAlign,
    };
    const underline = p?.underline ?? base?.underline ?? false;
    return {
      f: this.cellFont(scriptFont(font)),
      color: p?.color ?? base?.color ?? TEXT,
      underline: underline ? base?.underlineStyle ?? 'single' : undefined,
      strike: p?.strike ?? base?.strike ?? false,
      shift: scriptShift(font, this.zoom),
      lineH: excelRowPx(font.name, font.size ?? 11, !!font.bold) * this.zoom,
    };
  }

  /**
   * Pinta uma célula de texto RICO (cell-paint.paintRichText): run a run com a
   * fonte, a cor, o sublinhado/tachado e o sobrescrito/subscrito de cada um.
   */
  private paintRichCell(
    ctx: CanvasRenderingContext2D, runs: RichRun[], st: ResolvedStyle,
    left: number, top: number, w: number, h: number,
    col: number, row: number, cells?: Map<number, Cell>, merged = false,
  ): void {
    paintRichText({
      ctx, texts: runs.map((r) => r.text), styles: runs.map((r) => this.richRunStyle(st.font, r.props)),
      left, top, w, h, halign: st.align, valign: st.valign, wrap: st.wrap,
      indent: st.indent, indentPx: this.indentUnitPx() * this.zoom, merged,
      overflow: (dir, need) => this.overflowExtent(col, row, cells, dir, need),
      rowDesc: this.rowDescPx(row),
    }, layoutRichLines);
  }

  /** Derramamento que contém a célula (só com o motor ativo ou aba com matrizes). */
  private spillRangeAt(col: number, row: number): { c1: number; r1: number; c2: number; r2: number } | null {
    try { return this.calc.spillRange(this.sheetIndex, col, row); } catch { return null; }
  }

  private paintSelection(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    if (this.capture) return; // modo captura: o app de referência não inclui seleção
    const v = this.view!;
    const span = this.selectionSpan();
    // intervalo (colunas/linhas inteiras recortadas à grade desenhada)
    const rg = { c1: this.range.c1, r1: this.range.r1, c2: Math.min(this.range.c2, v.maxCol), r2: Math.min(this.range.r2, v.maxRow) };
    const sx = (c: number): number => (this.xs[c] ?? 0) - (c <= v.frozenCols ? 0 : this.scrollX);
    const sy = (r: number): number => (this.ys[r] ?? 0) - (r <= v.frozenRows ? 0 : this.scrollY);
    const accent = this.accent();
    ctx.save();
    // recorta ao quadrante do início do intervalo: seleção rolada não invade a faixa congelada
    const clipX = rg.c1 > v.frozenCols ? this.frozenW() : 0;
    const clipY = rg.r1 > v.frozenRows ? this.frozenH() : 0;
    ctx.beginPath();
    ctx.rect(clipX, clipY, vw - clipX, vh - clipY);
    ctx.clip();
    // intervalo derramado da fórmula dinâmica que contém a seleção: borda azul fina
    const spill = this.spillRangeAt(span.firstCol, span.firstRow);
    if (spill) paintSpillBorder(ctx, sx(spill.c1 - 1), sy(spill.r1 - 1), sx(spill.c2), sy(spill.r2));
    const left = this.colX(rg.c1), top = this.rowY(rg.r1);
    const w = sx(rg.c2) - left, h = sy(rg.r2) - top;
    const multi = this.isRange();
    if (multi) {
      // intervalo: véu translúcido do acento, sem cobrir a célula ativa (como o Excel)
      const al = this.colX(span.firstCol), at = this.rowY(span.firstRow);
      const aw = sx(span.lastCol) - al, ah = sy(span.lastRow) - at;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, w, h);
      ctx.rect(al + aw, at, -aw, ah);
      ctx.fillStyle = this.rgba(accent, 0.12);
      ctx.fill('evenodd');
      ctx.restore();
    }
    // Célula única / mescla isolada: só borda, sem fill (como o app de referência).
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, w - 2, h - 2);
    if (multi) {
      // célula ativa dentro do intervalo: contorno fino
      const al = this.colX(span.firstCol), at = this.rowY(span.firstRow);
      ctx.lineWidth = 1;
      ctx.strokeRect(al + 2.5, at + 2.5, sx(span.lastCol) - al - 5, sy(span.lastRow) - at - 5);
    }
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
    const sp0 = this.selectionSpan();
    const activeCol = sp0.firstCol;   // origem da seleção/mescla
    const activeRow = sp0.firstRow;
    // faixa destacada nos cabeçalhos = o intervalo selecionado
    const span = { firstCol: this.range.c1, lastCol: this.range.c2, firstRow: this.range.r1, lastRow: this.range.r2 };

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

  /**
   * Estilo EFETIVO de (col,row) para a pintura: o xf da célula (ou o padrão da
   * linha/coluna) + `filled` (tem fundo que cobre a linha de grade).
   */
  private styleAt(cell: Cell | undefined, col: number, row: number): ResolvedStyle & { filled: boolean; tableBorder?: Border } {
    const st = this.resolveStyle(cell, col, row);
    const v = this.view;
    const tf = v && v.tableFmt.size > 0 ? v.tableFmt.get(`${col},${row}`) : undefined;
    let out = tf ? applyTableLayer(st, tf, this.styles.fonts[0]?.color) : st;
    const cf = v && v.condFormats.length > 0 ? this.cfEngine()?.at(col, row) : undefined;
    if (cf) out = applyCfLayer(out, cf, this.styles.numFmts);
    // borda da tabela à parte: só vale onde nenhuma das vizinhas tem borda explícita
    return { ...out, filled: hasFill(out.fill), tableBorder: tf?.border };
  }

  /** Motor de formatação condicional da aba ativa (lazy; ver cond-format.ts). */
  private cfEngine(): CfEngine | null {
    const idx = this.sheetIndex;
    const hit = this.cfEngines.get(idx);
    if (hit !== undefined) return hit;
    const v = this.views[idx];
    if (!v || v.condFormats.length === 0) { this.cfEngines.set(idx, null); return null; }
    const sortedRows = new WeakMap<Map<number, Map<number, Cell>>, number[]>();
    const access = (view: SheetView, sheetIdx: number): Pick<CfSheetAccess, 'value' | 'each'> => {
      const map = (): Map<number, Map<number, Cell>> => this.cellIndex(view, sheetIdx);
      const shared = (i: number): string => this.shared[i]?.text ?? '';
      return {
        value: (c, r) => cellCfValue(map().get(r)?.get(c), shared),
        each: (c1, r1, c2, r2, fn) => {
          // só as linhas EXISTENTES do intervalo (números ordenados: busca binária do início)
          const m = map();
          let nums = sortedRows.get(m);
          if (!nums) { nums = [...m.keys()].sort((a, b) => a - b); sortedRows.set(m, nums); }
          let lo = 0, hi = nums.length;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (nums[mid]! < r1) lo = mid + 1; else hi = mid; }
          for (let i = lo; i < nums.length && nums[i]! <= r2; i++) {
            const r = nums[i]!;
            const cells = m.get(r)!;
            if (c2 - c1 < cells.size) {
              for (let c = c1; c <= c2; c++) { const cell = cells.get(c); if (cell) fn(cellCfValue(cell, shared), c, r); }
            } else for (const [c, cell] of cells) if (c >= c1 && c <= c2) fn(cellCfValue(cell, shared), c, r);
          }
        },
      };
    };
    const names = this.workbook?.sheets.filter((r) => r.target).map((r) => r.name) ?? [];
    const eng = new CfEngine(v.condFormats, {
      ...access(v, idx),
      other: (name) => { const k = names.findIndex((n) => n.toLowerCase() === name.toLowerCase()); const ov = this.views[k]; return ov ? access(ov, k) : undefined; },
      dxfs: this.styles.dxfs,
      today: todaySerial(this.workbook?.date1904),
      date1904: this.workbook?.date1904,
    });
    this.cfEngines.set(idx, eng);
    return eng;
  }

  /** Índice célula-por-(linha,coluna) de uma aba (o mesmo cache da pintura). */
  private cellIndex(view: SheetView, idx: number): Map<number, Map<number, Cell>> {
    let rowMap = this.rowMapCache.get(idx);
    if (!rowMap) {
      rowMap = new Map<number, Map<number, Cell>>();
      for (const r of view.worksheet.rows) {
        const cm = new Map<number, Cell>();
        for (const c of r.cells) cm.set(refToRowCol(c.ref).col, c);
        rowMap.set(r.r, cm);
      }
      this.rowMapCache.set(idx, rowMap);
    }
    return rowMap;
  }

  private resolveStyle(cell: Cell | undefined, col?: number, row?: number): ResolvedStyle {
    const s = this.styles;
    const v = this.view;
    const xfIdx = col !== undefined && row !== undefined && v ? xfIndexAt(v, cell, col, row) : cell?.style ?? 0;
    const xf = s.cellXfs[xfIdx];
    if (!xf) return { font: undefined, fill: undefined, border: undefined, numFmtId: 0, align: undefined, valign: undefined, wrap: false, indent: 0, rotation: 0 };
    return {
      font: s.fonts[xf.fontId],
      fill: s.fills[xf.fillId],
      border: s.borders[xf.borderId],
      numFmtId: xf.numFmtId,
      align: xf.horizontal,
      valign: xf.vertical,
      wrap: !!xf.wrapText,
      indent: xf.indent ?? 0,
      rotation: xf.textRotation ?? 0,
    };
  }

  /** Texto a exibir na célula. */
  private displayText(cell: Cell | undefined): string {
    return this.formatCell(cell).text;
  }

  /**
   * Texto + cor numa coluna "larga" (sem `####`, `*x` 1 vez) — o que a célula
   * contém para edição, transbordo e seleção. O texto da LARGURA real é o do
   * cellLayout (= Range.Text). `codeOverride`: formato da formatação condicional.
   */
  private formatCell(cell: Cell | undefined, codeOverride?: string): FormatResult {
    const inp = this.cellTextInput(cell, codeOverride);
    if (!inp) return { text: '' };
    if (inp.kind === 'number') return formatValue(inp.num!, inp.code, { date1904: inp.date1904, showZeros: inp.showZeros });
    if (inp.kind === 'text') return inp.code ? formatValue(inp.str!, inp.code) : { text: inp.str! };
    return { text: inp.str! };
  }

  /** formatCode da célula (numFmt do estilo resolvido; builtins pelo locale). */
  private cellFormatCode(cell: Cell): string {
    const id = this.resolveStyle(cell).numFmtId;
    return this.styles.numFmts.get(id) ?? builtinFormatCode(id) ?? 'General';
  }

  /**
   * Valor da célula classificado como o Excel exibe (tipo, valor, formato);
   * null = vazia. `numCode`: formato da formatação condicional (só números).
   */
  private cellTextInput(cell: Cell | undefined, numCode?: string): CellTextInput | null {
    if (!cell) return null;
    const cap = (s: string): string => (s.length > MAX_CELL_CHARS ? s.slice(0, MAX_CELL_CHARS) : s);
    const num = (n: number): CellTextInput => ({
      kind: 'number', num: n, code: numCode ?? this.cellFormatCode(cell),
      date1904: this.workbook?.date1904, showZeros: this.view?.worksheet.showZeros !== false,
    });
    switch (cell.type) {
      case 's': {
        // texto rico também passa pela seção de texto do formato no Range.Text
        // ("_ @_ " → " texto "; lo-tdf66668) — a pintura desenha os runs
        const ss = cell.value !== undefined ? this.shared[parseInt(cell.value, 10)] : undefined;
        const t = ss?.text;
        return t ? { kind: 'text', str: cap(t), code: this.cellFormatCode(cell) } : null;
      }
      case 'inlineStr': {
        const t = cell.inlineString?.text ?? cell.value;
        return t ? { kind: 'text', str: cap(t), code: this.cellFormatCode(cell) } : null;
      }
      case 'str': return cell.value ? { kind: 'text', str: cap(cell.value), code: this.cellFormatCode(cell) } : null;
      // booleano/erro no idioma das fórmulas (o mesmo da barra e da entrada)
      case 'b': return cell.value === undefined ? null : { kind: 'bool', str: this.calc.boolText(cell.value === '1' || cell.value === 'true') };
      case 'e': return cell.value ? { kind: 'error', str: this.calc.errorText(cell.value) } : null;
      case 'd': {
        const n = isoToSerial(cell.value, !!this.workbook?.date1904);
        return n === undefined ? (cell.value ? { kind: 'text', str: cell.value } : null) : num(n);
      }
      default: {
        const v = cell.value?.trim();
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) ? num(n) : { kind: 'text', str: cap(v) };
      }
    }
  }

  /** Fonte da célula medida/desenhada como o Excel (ppem inteiro, larguras GDI). */
  private cellFont(font: Font | undefined, zoom = this.zoom): CellFont {
    const name = font?.name ?? this.normalFont.name;
    const bold = !!font?.bold, italic = !!font?.italic;
    const stack = this.fontResolver.cssStack(name, fallbacksOf(font), variantOf(bold, italic));
    // família ausente no navegador (substituta padrão = Liberation Sans): o Excel
    // também mede a ausente como Arial
    const r = this.fontResolver.get(name);
    const metric = r && r.source === 'default' ? 'arial' : name;
    return this.cellFonts.get(stack, metric, font?.size ?? 11, bold, italic, zoom);
  }

  /** Texto exibido + layout para `colPx` (largura da coluna/mescla, px no zoom). */
  private cellLayout(cell: Cell | undefined, st: ResolvedStyle, colPx: number, zoom = this.zoom): { ct: CellText; f: CellFont; inp: CellTextInput } | null {
    const inp = this.cellTextInput(cell, st.numFmtCode);
    if (!inp) return null;
    // recuo (só esquerda/direita/distribuído) tira largura útil do caber/preencher,
    // não da contagem de "#"; o alinhamento em si não muda a largura (medido, e13)
    const level = st.indent;
    if (level > 0 && (st.align === 'left' || st.align === 'right' || st.align === 'distributed')) {
      inp.indentPx = level * this.indentUnitPx() * zoom;
    }
    const f = this.cellFont(scriptFont(st.font), zoom);
    return { ct: layoutCellText(inp, f, colPx), f, inp };
  }

  /**
   * px de um nível de recuo a 100%: 3 espaços da fonte Normal (medido, e10:
   * 9 px com a Normal Calibri 11, 12 px com a Normal Arial 10 — ambas MDW 7).
   */
  private indentUnitPx(): number {
    const f = this.cellFont({ name: this.normalFont.name, size: this.normalFont.size, bold: this.normalFont.bold }, 1);
    return 3 * f.adv(' ');
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

/**
 * Formatação condicional SOBRE o estilo da célula/tabela: o que a regra define
 * vence (fundo, cor/negrito/itálico/sublinhado/tachado, cada lado da borda,
 * formato numérico).
 */
function applyCfLayer<T extends ResolvedStyle>(st: T, cf: CfResult, numFmts: Map<number, string>): T {
  const out: T = { ...st, cf };
  if (cf.fill) out.fill = cf.fill;
  if (cf.fontColor !== undefined || cf.bold !== undefined || cf.italic !== undefined || cf.underline !== undefined || cf.strike !== undefined) {
    const f: Font = { ...(st.font ?? {}) };
    if (cf.fontColor !== undefined) f.color = cf.fontColor;
    if (cf.bold !== undefined) f.bold = cf.bold;
    if (cf.italic !== undefined) f.italic = cf.italic;
    if (cf.underline !== undefined) f.underline = cf.underline;
    if (cf.strike !== undefined) f.strike = cf.strike;
    out.font = f;
  }
  if (cf.border) {
    const b: Border = { ...(st.border ?? {}) };
    for (const side of ['left', 'right', 'top', 'bottom'] as const) if (cf.border[side]) b[side] = cf.border[side];
    out.border = b;
  }
  if (cf.numFmtCode !== undefined) out.numFmtCode = cf.numFmtCode;
  else if (cf.numFmtId !== undefined) out.numFmtCode = numFmts.get(cf.numFmtId) ?? builtinFormatCode(cf.numFmtId) ?? undefined;
  return out;
}

// ───────────────────────── edição: tipos e apoio ─────────────────────────

/** Limites da grade do Excel (linha 1048576, coluna XFD). */
const MAX_ROWS = 1048576;
const MAX_COLS = 16384;
/** Ações guardadas para o Desfazer (o Excel guarda 100). */
const UNDO_LIMIT = 100;
/** Acima disto, formatar um intervalo só mexe nas células que já existem (não cria as vazias). */
const MAX_FORMAT_CELLS = 100_000;

/** Célula antes/depois de uma ação: o texto de edição (fórmula ou constante) e o estilo. */
interface CellSnap { col: number; row: number; edit: string; style: number | undefined; exists: boolean }
interface RowMeta { height?: number; customHeight?: boolean; hidden?: boolean; style?: number; customFormat?: boolean }
/** Estrutura da aba antes/depois: colunas, linhas, mesclas, painéis e grade. */
interface StructSnap {
  cols: ColDef[];
  rows: Map<number, RowMeta>;
  merges: string[];
  pane?: PaneInfo;
  showGridLines: boolean;
  colWidths: Map<number, number>;
  rowHeights: Map<number, number>;
  hiddenCols: Set<number>;
  hiddenRows: Set<number>;
  frozenCols: number;
  frozenRows: number;
}
interface SheetSnap { sheet: number; cells?: CellSnap[]; struct?: StructSnap }
interface UndoEntry {
  label: string;
  before: SheetSnap[];
  after: SheetSnap[];
  sel: { sheet: number; sel: { col: number; row: number }; range: { c1: number; r1: number; c2: number; r2: number } };
}

/** Cópia interna (Ctrl+C dentro do elemento): de onde veio, o texto que foi para a área de transferência. */
interface InternalClip {
  sheet: number;
  rect: { c1: number; r1: number; c2: number; r2: number };
  cells: { dc: number; dr: number; col: number; row: number; style: number | undefined }[];
  text: string;
  cut: boolean;
}

/** Formatação aplicada pelas barras (setFormat): fonte, preenchimento, bordas, alinhamento e formato de número. */
export interface SheetFormatChange {
  font?: FontChange;
  /** preenchimento sólido #RRGGBB; null = sem preenchimento */
  fill?: string | null;
  /** bordas completas (substituem as da célula); null = sem bordas */
  border?: Border | null;
  align?: AlignChange;
  /** item da lista do Excel, código personalizado ou id interno */
  numFmt?: NumberFormatKind | { code: string } | { id: number; code?: string };
}

/** Opções de Localizar/Substituir (como a caixa do Excel). */
export interface FindOptions {
  /** Diferenciar maiúsculas de minúsculas */
  matchCase?: boolean;
  /** Coincidir conteúdo da célula inteira */
  wholeCell?: boolean;
  /** Examinar: fórmulas (padrão) ou valores exibidos */
  lookIn?: 'formulas' | 'values';
  /** Pesquisar: em todas as abas (padrão: só na ativa) */
  allSheets?: boolean;
  /** Localizar anterior */
  backwards?: boolean;
}

/** "B2", "A1:C3", "C:E" (colunas: linhas 0) ou "3:5" (linhas: colunas 0) → retângulo 1-based. */
function parseRange(ref: string): { c1: number; r1: number; c2: number; r2: number } | null {
  const cols = /^([A-Z]{1,3}):([A-Z]{1,3})$/.exec(ref);
  if (cols) {
    const a = refToRowCol(`${cols[1]}1`).col, b = refToRowCol(`${cols[2]}1`).col;
    return { c1: Math.min(a, b), r1: 0, c2: Math.max(a, b), r2: 0 };
  }
  const rows = /^(\d+):(\d+)$/.exec(ref);
  if (rows) {
    const a = Number(rows[1]), b = Number(rows[2]);
    return a >= 1 && b >= 1 ? { c1: 0, r1: Math.min(a, b), c2: 0, r2: Math.max(a, b) } : null;
  }
  const m = /^([A-Z]{1,3}[0-9]+)(?::([A-Z]{1,3}[0-9]+))?$/.exec(ref);
  if (!m) return null;
  try {
    const s = refToRowCol(m[1]!), e = m[2] ? refToRowCol(m[2]) : s;
    if (s.row < 1 || e.row < 1) return null;
    return { c1: Math.min(s.col, e.col), r1: Math.min(s.row, e.row), c2: Math.max(s.col, e.col), r2: Math.max(s.row, e.row) };
  } catch { return null; }
}

/** Campo de texto separado por tabulação, como o Excel o põe na área de transferência. */
function tsvField(s: string): string {
  return /[\t\r\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const normalizeNl = (s: string): string => s.replace(/\r\n?/g, '\n').replace(/\n+$/, '');

/** Texto colado → linhas × células (tabulação e quebra de linha; campos entre aspas como o Excel). */
function parseTsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const t = text.replace(/\r\n?/g, '\n');
  while (i < t.length) {
    let field = '';
    if (t[i] === '"') {
      i++;
      for (;;) {
        const j = t.indexOf('"', i);
        if (j < 0) { field += t.slice(i); i = t.length; break; }
        field += t.slice(i, j);
        if (t[j + 1] === '"') { field += '"'; i = j + 2; continue; }
        i = j + 1;
        break;
      }
      // texto depois da aspa de fechamento (aspas soltas): segue até o separador
      while (i < t.length && t[i] !== '\t' && t[i] !== '\n') field += t[i++];
    } else {
      while (i < t.length && t[i] !== '\t' && t[i] !== '\n') field += t[i++];
    }
    row.push(field);
    if (t[i] === '\t') { i++; if (i === t.length) row.push(''); continue; }
    out.push(row);
    row = [];
    i++;
  }
  if (row.length) out.push(row);
  return out;
}

const escXmlAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Acrescenta ao pacote uma aba vazia no fim (workbook.xml, rels, content types e a parte da planilha). */
function addSheetPart(pkg: XlsxPackage, name: string): void {
  const wb = pkg.workbookXml();
  const relsPath = 'xl/_rels/workbook.xml.rels';
  const rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  let k = 1;
  while (pkg.getPart(`xl/worksheets/sheet${k}.xml`)) k++;
  const ids = [...rels.matchAll(/\bId="rId(\d+)"/g)].map((m) => Number(m[1]));
  const rid = `rId${Math.max(0, ...ids) + 1}`;
  const sheetIds = [...wb.matchAll(/<(?:\w+:)?sheet\b[^>]*\bsheetId="(\d+)"/g)].map((m) => Number(m[1]));
  const sheetId = Math.max(0, ...sheetIds) + 1;
  const sheetEl = /<((?:\w+:)?)sheet\b[^>]*\s(\w+):id="/.exec(wb);
  const p = sheetEl?.[1] ?? '';
  const rp = sheetEl?.[2] ?? 'r';
  const close = wb.indexOf(`</${p}sheets>`);
  if (close < 0) throw new Error('workbook.xml sem <sheets>');
  pkg.setPartText('xl/workbook.xml', wb.slice(0, close) + `<${p}sheet name="${escXmlAttr(name)}" sheetId="${sheetId}" ${rp}:id="${rid}"/>` + wb.slice(close));
  const relsClose = rels.lastIndexOf('</Relationships>');
  pkg.setPartText(relsPath, rels.slice(0, relsClose)
    + `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k}.xml"/>`
    + rels.slice(relsClose));
  const ct = pkg.getPartText('[Content_Types].xml');
  if (ct && !ct.includes(`/xl/worksheets/sheet${k}.xml"`)) {
    const at = ct.lastIndexOf('</Types>');
    pkg.setPartText('[Content_Types].xml', ct.slice(0, at)
      + `<Override PartName="/xl/worksheets/sheet${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      + ct.slice(at));
  }
  pkg.setPartText(`xl/worksheets/sheet${k}.xml`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/>'
    + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>');
}

customElements.define('universal-sheet', UniversalSheetElement);
