import {
  DocxPackage,
  readDocument,
  writeDocument,
  insertText,
  insertRun,
  deleteRange,
  splitParagraph,
  mergeWithPrevious,
  applyRunProps,
  applyParaProps,
  propsAt,
  paraLength,
  paraText,
  comparePos,
  normalizeRange,
  DEFAULT_RUN_PROPS,
  type DocumentModel,
  type DocPosition,
  type DocRange,
  type RunProps,
  type ParaProps,
  type Paragraph,
  type SectPr,
  readFullDocument,
  readEmbeddedFonts,
  type FullDocument,
  type TableBlock,
  type Section,
  type Run,
  type InlineImage,
  type DrawingTextbox,
  type HfPartInfo,
  type Block,
} from '@universal-office/docx-core';
import {
  SfntFont,
  breakRich,
  lineHeightPt,
  deviceEmPt,
  TWIPS_PER_PT,
  type StyledSpan,
  type RichLine,
  type FontRegistry,
  type FontVariant,
} from '@universal-office/layout';
import {
  PdfDocument,
  hexColor,
  type PdfPage,
  type PdfColor,
  type PdfImage,
  type EmbeddedFont,
  type PlacedGlyph,
} from '@universal-office/pdf';
import { toHtml, toMarkdown, type ExportDoc } from '@universal-office/export';
import { readOdt, writeOdt } from '@universal-office/odf';
import { buildXps, type XpsPage, type XpsGlyphRun } from './xps.js';
import type {
  UniversalWriteDocumentSource,
  UniversalWriteFontAsset,
  UniversalWriteInitializeOptions,
  UniversalWriteInlineDrawContext,
  UniversalWriteInlineRenderer,
  UniversalWritePlugin,
} from './plugins.js';

/**
 * <universal-write> v2 — editor de docx em canvas com layout próprio.
 * Visões: print | web | draft | read | outline.
 * API de formatação chamada pela toolbar (demo/main.ts).
 */

const PX_PER_TWIP = 96 / 72 / TWIPS_PER_PT;
/** Opacidade da região "desabilitada" (o Word esmaece o que não está em foco:
 *  header/footer ao editar o corpo; corpo + outro HF ao editar um HF). */
const HF_DIM_ALPHA = 0.5;

/** Família de fonte PADRÃO/fallback do editor. Liberation Sans é open (OFL,
 *  métrica-compatível com Arial), então pode ser versionada e distribuída no
 *  app/site — ao contrário de Aptos/Calibri (proprietárias da Microsoft). */
const DEFAULT_FONT = 'Liberation Sans';
/** Mesmo nome já entre aspas p/ uso em ctx.font (família com espaço). */
const DEFAULT_FONT_CSS = `"${DEFAULT_FONT}"`;

export type ViewMode = 'print' | 'web' | 'draft' | 'read' | 'outline';

/** Formato de arquivo para load()/save(). 'auto' detecta na carga e, ao salvar,
 *  usa o formato originalmente carregado. */
export type FileFormat = 'auto' | 'docx' | 'odt' | 'pdf' | 'html' | 'markdown' | 'xps';

interface StyleDef {
  sizePt: number;
  bold: boolean;
  color?: string;
  spaceBeforeTwips: number;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'both';
  spaceAfterTwips?: number;
  lineTwentieths?: number;
  fontAscii?: string;
  underline?: boolean;
  strike?: boolean;
  allCaps?: boolean;
  smallCaps?: boolean;
  borders?: import('@universal-office/docx-core').ParagraphBorders;
  shadingHex?: string;
  indentLeftTwips?: number;
  indentRightTwips?: number;
}
/** Estilos built-in (espelha styles.xml do template atual; pt-BR + en ids). */
const STYLES: Record<string, StyleDef> = {
  'Ttulo1': { sizePt: 20, bold: false, color: '0F4761', spaceBeforeTwips: 360 },
  'Heading1': { sizePt: 20, bold: false, color: '0F4761', spaceBeforeTwips: 360 },
  'Ttulo2': { sizePt: 16, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Heading2': { sizePt: 16, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Ttulo3': { sizePt: 14, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Heading3': { sizePt: 14, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Ttulo': { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
  'Title': { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
};
const HIGHLIGHTS: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkYellow: '#808000', lightGray: '#c0c0c0',
};

interface LaidLine {
  para: number;
  rich: RichLine;
  page: number;
  xTwips: number; // início do texto (após indent/alinhamento)
  yTwips: number; // topo da linha
  heightTwips: number;
  baselineTwips: number;
  marker?: { text: string; xTwips: number; sizePt: number };
  justifyExtraPerSpace: number;
}

interface ParaLayout {
  spans: StyledSpan[];
  charAdvances: number[];
  lines: LaidLine[];
  spanCharStart: number[]; // início de cada span no texto concatenado
  tabLeaders?: Map<number, 'dot'>;
}

class Registry implements FontRegistry {
  constructor(private sets: Record<string, Record<FontVariant, SfntFont>>) {}
  /** Registra uma variante de fonte (ex.: fontes EMBEDADAS do .docx). */
  register(family: string, variant: FontVariant, font: SfntFont): void {
    (this.sets[family] ??= {} as Record<FontVariant, SfntFont>)[variant] = font;
  }
  has(family: string): boolean {
    return this.sets[family] !== undefined || this.sets[family.split(' ')[0]!] !== undefined;
  }
  resolve(family: string | undefined, variant: FontVariant): SfntFont {
    // tenta o nome COMPLETO ("Lato Black"), depois a base ("Lato"), depois o padrão.
    const requested = family
      ? (this.sets[family] ?? this.sets[family.split(' ')[0]!])
      : undefined;
    const def = this.sets[DEFAULT_FONT] ?? this.sets['Aptos']!;
    return requested?.[variant] ?? requested?.regular ?? def[variant] ?? def.regular;
  }
}

interface CellEdgeSpec {
  x0: number; y0: number; x1: number; y1: number; // rel. à tabela, twips
  edges: {
    top?: import('@universal-office/docx-core').BorderEdge;
    bottom?: import('@universal-office/docx-core').BorderEdge;
    left?: import('@universal-office/docx-core').BorderEdge;
    right?: import('@universal-office/docx-core').BorderEdge;
  };
}

interface TableLayout {
  table: TableBlock;
  page: number;
  xTwips: number;
  yTwips: number;
  heightTwips: number;
  colXs: number[]; // bordas das colunas (acumulado), relativo a xTwips
  rowYs: number[]; // alturas acumuladas das linhas
  cellLines: {
    row: number; col: number;
    xTwips: number; yTwips: number;
    text: string; sizePt: number; bold: boolean; italic: boolean;
    color?: string; family?: string; underline?: boolean; strike?: boolean;
  }[];
  cellShades: { xTwips: number; yTwips: number; wTwips: number; hTwips: number; hex: string }[];
  cellRects: CellEdgeSpec[];
}

interface FloatImage {
  para: number;
  run: Run;
}

/** Objeto flutuante (imagem OU caixa de texto) com seu retângulo pintado, para
 *  seleção/mover/redimensionar. rect em twips de página. */
interface FloatHandle {
  run: Run;
  obj: InlineImage | DrawingTextbox;
  kind: 'image' | 'textbox';
  page: number;
  rect: { x: number; y: number; w: number; h: number };
}

interface FootnoteHit {
  page: number;
  id: number;
}

/** Uma face de fonte da Local Font Access API (window.queryLocalFonts). */
interface LocalFontData {
  family: string;
  fullName?: string;
  postscriptName?: string;
  style?: string;
  blob(): Promise<Blob>;
}

/** Uma face de fonte do SO entregue pelo HOST (ex.: shell Electron). */
export interface SystemFontFace {
  family: string;
  weight: string;
  style: string;
  /** Negrito "RIBBI" dentro da família (ausente: deduz do peso). */
  bold?: boolean;
  /** A licença (fsType) permite embutir em documento/PDF (ausente: permite). */
  embeddable?: boolean;
  bytes: ArrayBuffer;
}

/** Fontes do SO fornecidas pelo HOST — ex.: o Electron lê Windows\Fonts + o
 *  cache CloudFonts do Office (onde moram as Aptos), invisível ao
 *  `queryLocalFonts`. */
export interface SystemFontProvider {
  /** Nomes das famílias instaladas, em ordem alfabética. */
  list(): Promise<string[]>;
  /** Faces das famílias pedidas (todas as variantes encontradas). */
  resolve(families: string[]): Promise<SystemFontFace[]>;
}

/** Mapeia o "style" da FontData (ex.: "Bold Italic") para a variante interna. */
function variantOfStyle(style: string | undefined): FontVariant {
  const s = (style ?? '').toLowerCase();
  const bold = /bold/.test(s) || /black|heavy|semibold|extrabold/.test(s);
  const italic = /italic|oblique/.test(s);
  return bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
}

export class UniversalWriteElement extends HTMLElement {
  /** Fontes do SO fornecidas pelo HOST (ver SystemFontProvider). Com ele, o
   *  seletor lista as fontes instaladas sem gesto/permissão e o documento
   *  carrega sozinho as famílias que usa. Ausente: `queryLocalFonts`. */
  static systemFonts: SystemFontProvider | null = null;

  private model: DocumentModel | null = null;
  private pkg: DocxPackage | null = null;
  private fullDoc: FullDocument | null = null;
  /** Tabelas ancoradas antes do parágrafo de índice beforePara. */
  private tableAnchors: { beforePara: number; table: TableBlock }[] = [];
  /** Seções: a partir de qual parágrafo cada uma vale. */
  private sectionStarts: { startPara: number; section: Section }[] = [];
  private floatImages: FloatImage[] = [];
  private tableLayouts: TableLayout[] = [];
  private footnoteHits: FootnoteHit[] = [];
  private pageDark = false;
  private pageSections: number[] = []; // página → índice de seção
  private fonts: Registry | null = null;
  /** bytes crus de cada fonte (família→variante) para embutir no PDF exportado. */
  private fontBytes: Record<string, Partial<Record<FontVariant, Uint8Array>>> = {};
  /** variantes de fonte com FontFace já carregado ("Família variante"). */
  private loadedFamilies = new Set<string>();
  /** nomes de família com QUALQUER FontFace carregado (p/ escolher a família CSS). */
  private loadedFamilyNames = new Set<string>();
  /** cache das famílias do SO (Local Font Access API); null = ainda não consultado. */
  private sysFontsCache: string[] | null = null;
  /** FontData do SO por família (todas as faces) p/ carregar bytes sob demanda. */
  private sysFontData = new Map<string, LocalFontData[]>();
  /** Famílias (lc) já pedidas ao host — achadas ou não, não se pede de novo. */
  private hostFontsAsked = new Set<string>();
  /** Famílias usadas pelo documento sem FontFace, à espera do próximo lote. */
  private hostFontQueue = new Set<string>();
  private hostFontTimer: ReturnType<typeof setTimeout> | null = null;
  private container: HTMLDivElement;
  private input: HTMLTextAreaElement;
  private topbarEl!: HTMLDivElement;
  private bottombarEl!: HTMLDivElement;
  private chromeSync: (() => void) | null = null;
  private selection: { anchor: DocPosition; focus: DocPosition } = {
    anchor: { para: 0, offset: 0 },
    focus: { para: 0, offset: 0 },
  };
  private view: ViewMode = 'print';
  private readFirstPage = 0;       // 1ª página do bloco visível no modo Leitura
  private zoomBeforeRead = 1;      // zoom a restaurar ao sair da Leitura
  private readWheelLock = false;   // 1 bloco por gesto de scroll
  private zoom = 1;
  private showMarks = false;
  private layoutCache: ParaLayout[] = [];
  private pageCount = 1;
  private canvases: HTMLCanvasElement[] = [];
  private caretVisible = true;
  private caretTimer = 0;
  private readResizeQueued = false;
  private readonly handleWindowResize = (): void => {
    if (this.view !== 'read' || this.readResizeQueued) return;
    this.readResizeQueued = true;
    requestAnimationFrame(() => {
      this.readResizeQueued = false;
      if (!this.isConnected) return;
      this.fitReadZoom();
      this.refresh();
    });
  };
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private pendingProps: RunProps | null = null; // formatação aplicada antes de digitar
  private plainPasteNext = false; // próximo paste (Ctrl+Shift+V) cola sem formatação
  // clipboard RICO interno (o sistema só guarda texto): casado por texto, usado
  // pelo "Colar" para preservar a formatação dos runs da ORIGEM.
  private richClip: { text: string; paras: { runs: { text: string; props: RunProps }[] }[] } | null = null;

  onSelectionChange: (() => void) | null = null;

  /** Fontes em memória usadas pela inicialização automática, sem fetch/backend. */
  fontAssets: readonly UniversalWriteFontAsset[] | undefined;
  /** Documento inicial em memória usado pela inicialização automática. */
  documentSource: UniversalWriteDocumentSource | undefined;

  private initialization: Promise<void> | null = null;
  private initialized = false;
  private plugins = new Map<string, UniversalWritePlugin>();
  private pluginCleanups = new Map<string, () => void>();
  private inlineRenderers = new Map<string, {
    owner: string;
    renderer: UniversalWriteInlineRenderer;
  }>();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display:block; background:#e8e8e8; overflow:auto; position:relative; outline:none; }
      /* páginas lado a lado quando o zoom abre espaço (como no app de referência) */
      .pages {
        padding: 24px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-content: flex-start;
        gap: 24px;
      }
      :host(.view-web) .pages, :host(.view-draft) .pages { padding: 0; display: block; }
      /* borda sutil em vez de sombra (outline não afeta o tamanho do canvas) */
      .page { background:white; outline:1px solid var(--md-outline-variant, rgba(0,0,0,.18)); outline-offset:-1px; display:block; cursor:text; flex: none; }
      :host(.view-web) .page, :host(.view-draft) .page { margin: 0 auto; }
      :host(.view-web) .page, :host(.view-draft) .page { outline:none; }
      /* Web/Rascunho são CONTÍNUOS: sem "desk" cinza em volta — o fundo é a
         própria cor da página (a folha preenche a largura). */
      :host(.view-web), :host(.view-draft) { background: #ffffff; }
      :host(.view-web.page-dark), :host(.view-draft.page-dark) { background: #1e1e1e; }
      /* Leitura: fundo da COR DA PÁGINA; páginas em RAIAS lado a lado, sem
         espaço entre elas — a borda sutil de cada página vira o divisor da raia.
         As páginas fora do bloco visível ficam display:none. */
      :host(.view-read) { background:#ffffff; }
      :host(.view-read) .pages { flex-wrap: nowrap; align-items: center; justify-content: center; align-content: center; min-height: 100%; gap: 0; padding: 0; }
      /* sem moldura ao redor; o divisor aparece SÓ entre páginas (borda esq.) */
      :host(.view-read) .page { cursor:default; outline: none; }
      :host(.view-read) .page.read-divider { border-left: 1px solid var(--md-outline-variant, rgba(0,0,0,.18)); }
      :host(.view-outline) .page { outline:none; }
      textarea.proxy { position:absolute; opacity:0; width:1px; height:1em; padding:0; border:0; resize:none; }
      /* barras opcionais (topbar/bottombar) — sticky para preservar o scroll do host */
      /* sticky nos DOIS eixos (left:0) — senão a barra rola junto quando o
         documento gera scroll horizontal (ex.: zoom alto). A largura é a do
         viewport (o host de scroll), então cobre a faixa visível em qualquer
         posição de scroll. */
      .uw-topbar, .uw-bottombar { position: sticky; left: 0; z-index: 30; flex: none;
        width: 100%; box-sizing: border-box;
        background: var(--u-color-surface-container, #eef0f2); color: var(--u-color-on-surface, #1b1b1f); }
      .uw-topbar { top: 0; border-bottom: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-bottombar { bottom: 0; border-top: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-topbar:empty, .uw-bottombar:empty { display: none; }
    `;
    this.container = document.createElement('div');
    this.container.className = 'pages';
    this.topbarEl = document.createElement('div');
    this.topbarEl.className = 'uw-topbar';
    this.bottombarEl = document.createElement('div');
    this.bottombarEl.className = 'uw-bottombar';
    this.input = document.createElement('textarea');
    this.input.className = 'proxy';
    this.input.setAttribute('aria-hidden', 'true');
    root.append(style, this.topbarEl, this.container, this.bottombarEl, this.input);
    this.bindEvents();
  }

  // ─────────────────────── chrome (barras) ───────────────────────

  static get observedAttributes(): string[] {
    return ['topbar', 'bottombar'];
  }

  attributeChangedCallback(name: string): void {
    if ((name === 'topbar' || name === 'bottombar') && this.initialized) void this.updateChrome();
  }

  /** Barra de ferramentas superior (única). */
  get topbar(): boolean { return this.hasAttribute('topbar'); }
  set topbar(v: boolean) {
    if (v) this.setAttribute('topbar', ''); else this.removeAttribute('topbar');
  }

  /** Visibilidade da barra inferior (status). */
  get bottombar(): boolean { return this.hasAttribute('bottombar'); }
  set bottombar(v: boolean) {
    if (v) this.setAttribute('bottombar', ''); else this.removeAttribute('bottombar');
  }

  private chromeReq = 0;
  private chromeListenersBound = false;
  /** (Re)constrói as barras conforme os atributos topbar/bottombar. */
  private async updateChrome(): Promise<void> {
    const topbar = this.topbar;
    const bottombar = this.bottombar;
    if (!topbar && !bottombar) {
      this.topbarEl.replaceChildren();
      this.bottombarEl.replaceChildren();
      this.chromeSync = null;
      return;
    }
    const req = ++this.chromeReq;
    const { setupChrome } = await import('./chrome.js');
    if (req !== this.chromeReq) return; // superado por outra mudança
    const handle = setupChrome(this, this.topbarEl, this.bottombarEl, { topbar, bottombar });
    this.chromeSync = handle.sync;
    if (!this.chromeListenersBound) {
      const relay = (): void => this.chromeSync?.();
      this.addEventListener('uw-zoom', relay);
      this.addEventListener('uw-change', relay);
      this.chromeListenersBound = true;
    }
  }

  // ───────────────────────── carga ─────────────────────────

  async connectedCallback(): Promise<void> {
    window.addEventListener('resize', this.handleWindowResize);
    if (this.initialized) this.startCaret();
    if (!this.hasAttribute('manual-init')) await this.initialize();
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.handleWindowResize);
    window.clearInterval(this.caretTimer);
    this.caretTimer = 0;
  }

  /**
   * Inicializa o componente. Com fonts + document em memória, não executa
   * nenhum fetch e funciona em apps estáticos, Electron e WebViews offline.
   */
  async initialize(options: UniversalWriteInitializeOptions = {}): Promise<void> {
    if (this.initialized) return;
    if (!this.initialization) {
      this.initialization = this.initializeInternal(options).catch((error: unknown) => {
        this.initialization = null;
        throw error;
      });
    }
    await this.initialization;
  }

  private async initializeInternal(options: UniversalWriteInitializeOptions): Promise<void> {
    const suppliedFonts = options.fonts ?? this.fontAssets;
    const assets = suppliedFonts ?? await this.fetchDefaultFontAssets();
    await this.installFontAssets(assets);

    const source = options.document ?? this.documentSource;
    if (source) this.loadDocumentSource(source);
    else {
      const src = this.getAttribute('src');
      if (src) {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        this.loadDocx(bytes);
      } else this.newDocument();
    }

    this.initialized = true;
    if (this.isConnected) this.startCaret();
    if (this.topbar || this.bottombar) void this.updateChrome();
    this.dispatchEvent(new CustomEvent('uw-ready', {
      detail: { offline: suppliedFonts !== undefined, plugins: this.pluginIds() },
    }));
  }

  private loadDocumentSource(source: UniversalWriteDocumentSource): void {
    if ((source.format ?? 'docx') === 'odt') {
      this.loadOdt(source.bytes, { protected: source.protected });
    } else {
      this.loadDocx(source.bytes, { protected: source.protected });
    }
  }

  private async installFontAssets(assets: readonly UniversalWriteFontAsset[]): Promise<void> {
    const sets: Record<string, Record<FontVariant, SfntFont>> = {};
    this.fontBytes = {};
    for (const asset of assets) {
      const bytes = asset.data instanceof Uint8Array
        ? asset.data
        : new Uint8Array(asset.data);
      const weight = asset.weight ?? (asset.variant === 'bold' || asset.variant === 'boldItalic' ? '700' : '400');
      const style = asset.style ?? (asset.variant === 'italic' || asset.variant === 'boldItalic' ? 'italic' : 'normal');
      const faceBytes = bytes.slice().buffer;
      const face = new FontFace(asset.family, faceBytes, { weight, style });
      document.fonts.add(await face.load());
      this.loadedFamilyNames.add(asset.family);
      sets[asset.family] ??= {} as Record<FontVariant, SfntFont>;
      const font = new SfntFont(bytes);
      if (asset.advances) font.setAdvanceTable(asset.advances);
      sets[asset.family]![asset.variant] = font;
      (this.fontBytes[asset.family] ??= {})[asset.variant] = bytes;
    }
    const def = sets[DEFAULT_FONT];
    if (!def?.regular || !def.bold || !def.italic || !def.boldItalic) {
      throw new Error(`initialize(): provide the four ${DEFAULT_FONT} font variants`);
    }
    this.fonts = new Registry(sets);
  }

  private async fetchDefaultFontAssets(): Promise<UniversalWriteFontAsset[]> {
    const fontsBase = this.getAttribute('fonts') ?? '';
    const files: [string, string, FontVariant][] = [
      // PADRÃO (open, sempre versionada) — Liberation Sans
      [DEFAULT_FONT, 'liberationsans-regular.ttf', 'regular'],
      [DEFAULT_FONT, 'liberationsans-bold.ttf', 'bold'],
      [DEFAULT_FONT, 'liberationsans-italic.ttf', 'italic'],
      [DEFAULT_FONT, 'liberationsans-bolditalic.ttf', 'boldItalic'],
      // Proprietárias — OPCIONAIS: presentes só no dev local; puladas (404) na
      // build/CI e em produção, onde tudo cai no fallback Liberation Sans.
      ['Aptos', 'aptos-regular.ttf', 'regular'],
      ['Aptos', 'aptos-bold.ttf', 'bold'],
      ['Aptos', 'aptos-italic.ttf', 'italic'],
      ['Aptos', 'aptos-bolditalic.ttf', 'boldItalic'],
      ['Calibri', 'calibri.ttf', 'regular'],
      ['Calibri', 'calibrib.ttf', 'bold'],
      ['Calibri', 'calibrii.ttf', 'italic'],
      ['Calibri', 'calibriz.ttf', 'boldItalic'],
    ];
    const tableName = (family: string, variant: FontVariant): string => {
      const prefix = family.toLowerCase().replace(/\s+/g, '');
      const suffix = variant === 'regular' ? '' : variant === 'boldItalic' ? '-bolditalic' : `-${variant}`;
      return `${prefix}${suffix}-advances.json`;
    };
    const assets = await Promise.all(files.map(async ([family, file, variant]) => {
      const resp = await fetch(`${fontsBase}/${file}`).catch(() => null);
      if (!resp?.ok) return null; // fonte ausente (ex.: proprietária no CI): pula
      const data = new Uint8Array(await resp.arrayBuffer());
      let advances: Record<string, Record<string, number>> | undefined;
      try {
        const r = await fetch(`${fontsBase}/${tableName(family, variant)}`);
        if (r.ok) advances = await r.json() as Record<string, Record<string, number>>;
      } catch { /* tabela opcional: SfntFont usa métricas lineares */ }
      return { family, variant, data, advances };
    }));
    return assets.filter((a) => a !== null) as UniversalWriteFontAsset[];
  }

  /** Instala um plugin na instância (sem registro global e sem backend). */
  use(plugin: UniversalWritePlugin): void {
    if (!plugin.id.trim()) throw new Error('plugin.id is required');
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    for (const renderer of plugin.inlineRenderers ?? []) {
      if (!/^[a-zA-Z0-9._-]+$/.test(renderer.type)) {
        throw new Error(`invalid inline type: ${renderer.type}`);
      }
      const current = this.inlineRenderers.get(renderer.type);
      if (current) {
        throw new Error(`inline "${renderer.type}" already registered by ${current.owner}`);
      }
    }
    this.plugins.set(plugin.id, plugin);
    for (const renderer of plugin.inlineRenderers ?? []) {
      this.inlineRenderers.set(renderer.type, { owner: plugin.id, renderer });
    }
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === plugin.id) this.inlineRenderers.delete(type);
      }
      throw error;
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent('uw-plugin-added', { detail: { id: plugin.id } }));
  }

  /** Remove o plugin e seus renderers; o conteúdo permanece com fallback textual. */
  unuse(id: string): boolean {
    if (!this.plugins.has(id)) return false;
    try {
      this.pluginCleanups.get(id)?.();
    } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === id) this.inlineRenderers.delete(type);
      }
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent('uw-plugin-removed', { detail: { id } }));
    return true;
  }

  pluginIds(): string[] { return [...this.plugins.keys()]; }

  /** Insere um inline atômico na seleção atual. */
  insertCustomInline<T>(
    type: string,
    data: T,
    options: { fallbackText?: string } = {},
  ): void {
    if (!this.model || this.locked()) return;
    const renderer = this.inlineRenderers.get(type)?.renderer as UniversalWriteInlineRenderer<T> | undefined;
    const fallbackText = options.fallbackText ?? renderer?.toText?.(data) ?? String(data ?? '');
    this.snapshot();
    if (this.hasSelection()) {
      const deleted = this.deleteSelection();
      this.selection = { anchor: deleted, focus: deleted };
    }
    const props = { ...(this.pendingProps ?? this.currentProps()) };
    const pos = insertRun(this.model, this.selection.focus, {
      text: '\uFFFC',
      props,
      custom: { type, data, fallbackText },
    });
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent('uw-custom-inline-inserted', {
      detail: { type, data, fallbackText },
    }));
  }

  // ───────── Modo de Exibição Protegido (mecânica do app de referência) ─────────
  /** Arquivos abertos entram protegidos: leitura até "Habilitar Edição". */
  private protectedMode = false;

  isProtected(): boolean { return this.protectedMode; }

  enableEditing(): void {
    if (!this.protectedMode) return;
    this.protectedMode = false;
    this.dispatchEvent(new CustomEvent('uw-protected', {
      detail: { active: false, hasFields: this.hasExternalFields() },
    }));
    this.refresh();
    this.focusEditor();
  }

  /** Campos que podem referenciar outros componentes (TOC/PAGE/DATE...). */
  hasExternalFields(): boolean {
    if (!this.model) return false;
    return this.model.paragraphs.some(
      (p) => p.props.tocInstr || p.props.tocEntry || p.runs.some((r) => r.field),
    );
  }

  /** Edição bloqueada? (modo protegido ou visão de leitura) */
  private locked(): boolean {
    return this.protectedMode || this.view === 'read';
  }

  /** Carrega um .docx (bytes). opts.protected = decisão pelo critério do
   *  app de referência: Mark-of-the-Web (Electron lê o Zone.Identifier real; browser usa
   *  Trusted Documents). Default: protegido (conservador). */
  /** Formato do documento carregado (usado por save('auto')). */
  private loadedFormat: 'docx' | 'odt' = 'docx';

  /**
   * Carrega um documento. Com format='auto' (padrão) detecta docx vs odt pelos
   * bytes. É a API única de carga (loadDocx/loadOdt são internos).
   */
  load(bytes: Uint8Array, format: FileFormat = 'auto', opts: { protected?: boolean } = {}): void {
    const fmt = format === 'auto' ? this.detectFormat(bytes) : format;
    if (fmt === 'odt') this.loadOdt(bytes, opts);
    else this.loadDocx(bytes, opts); // docx (e fallback p/ formatos não-importáveis)
  }

  /** Detecta o formato pelos bytes: docx e odt são ZIP; o odt guarda o mimetype
   *  "…opendocument.text" logo no início. */
  private detectFormat(bytes: Uint8Array): 'docx' | 'odt' {
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 2000)));
    return head.includes('opendocument.text') ? 'odt' : 'docx';
  }

  loadDocx(bytes: Uint8Array, opts: { protected?: boolean } = {}): void {
    this.protectedMode = opts.protected ?? true;
    this.pkg = DocxPackage.load(bytes);
    this.fullDoc = readFullDocument(this.pkg);
    this.loadedFormat = 'docx';
    this.installFullDoc();
    void this.registerEmbeddedFonts(this.pkg); // fontes embedadas → FontFace + métricas
  }

  /** Carrega as fontes EMBEDADAS do .docx (word/fonts/*.odttf desofuscadas): cria
   *  o FontFace (render) e o SfntFont (métricas/layout), e repinta ao terminar.
   *  Sem isto o render cairia no Aptos/Calibri em vez da fonte real (ex.: Lato). */
  private async registerEmbeddedFonts(pkg: DocxPackage): Promise<void> {
    let fonts;
    try { fonts = readEmbeddedFonts(pkg); } catch { return; }
    if (!fonts.length || !this.fonts) return;
    let added = false;
    for (const f of fonts) {
      if (this.loadedFamilies.has(`${f.family} ${f.variant}`)) continue;
      const weight = f.variant === 'bold' || f.variant === 'boldItalic' ? '700' : '400';
      const style = f.variant === 'italic' || f.variant === 'boldItalic' ? 'italic' : 'normal';
      try {
        const face = new FontFace(f.family, f.data.slice().buffer, { weight, style });
        await face.load();
        document.fonts.add(face);
      } catch { continue; } // fonte inválida: ignora (mantém fallback)
      this.loadedFamilies.add(`${f.family} ${f.variant}`);
      this.loadedFamilyNames.add(f.family);
      try { this.fonts.register(f.family, f.variant, new SfntFont(f.data)); } catch { /* métrica opcional */ }
      (this.fontBytes[f.family] ??= {})[f.variant] = f.data;
      added = true;
    }
    if (added && this.model) this.refresh();
  }

  /**
   * Carrega um .odt (OpenDocument Text). Não há pacote OOXML original — ao
   * salvar como .docx o pkg é criado do zero (DocxPackage.empty()).
   */
  loadOdt(bytes: Uint8Array, opts: { protected?: boolean } = {}): void {
    this.protectedMode = opts.protected ?? false; // .odt não tem MOTW: confiança padrão
    this.pkg = null;
    this.fullDoc = readOdt(bytes);
    this.loadedFormat = 'odt';
    this.installFullDoc();
  }

  /**
   * Salva/exporta o documento no formato pedido. Com format='auto' (padrão)
   * usa o formato originalmente carregado (docx ou odt). API única de saída —
   * retorna Uint8Array (docx/odt/pdf/xps) ou string (html/markdown).
   */
  async save(
    format: FileFormat = 'auto',
    opts: { images?: boolean; title?: string } = {},
  ): Promise<Uint8Array | string> {
    const embed = opts.images !== false; // por padrão embute as imagens
    const fmt = format === 'auto' ? this.loadedFormat : format;
    switch (fmt) {
      case 'odt': return this.exportOdt({ images: embed ? 'embed' : 'omit' });
      case 'pdf': return this.exportPdf();
      case 'html': return this.exportHtml(opts.title, { images: embed ? 'data' : 'omit' });
      case 'markdown': return this.exportMarkdown(opts.title, { images: embed ? 'data' : 'omit' });
      case 'xps': return this.exportXps();
      case 'docx':
      default: return this.saveDocx();
    }
  }

  /** Comum entre loadDocx e loadOdt — popula model/sections/floatImages a
   *  partir de this.fullDoc e dispara uw-protected. */
  private installFullDoc(): void {
    if (!this.fullDoc) throw new Error('installFullDoc without fullDoc');
    // achatamento p/ edição: parágrafos top-level na ordem dos blocos;
    // tabelas viram âncoras "antes do parágrafo N"
    const paragraphs: Paragraph[] = [];
    this.tableAnchors = [];
    for (const block of this.fullDoc.blocks) {
      if (block.type === 'paragraph') paragraphs.push(block.paragraph);
      else this.tableAnchors.push({ beforePara: paragraphs.length, table: block });
    }
    if (paragraphs.length === 0) paragraphs.push({ runs: [], props: {} });

    // seções → startPara (bloco inicial mapeado p/ índice de parágrafo)
    this.sectionStarts = this.fullDoc.sections.map((section) => {
      let startPara = 0;
      for (let b = 0; b < section.blockStart; b++) {
        if (this.fullDoc!.blocks[b]!.type === 'paragraph') startPara++;
      }
      return { startPara, section };
    });

    // marca o ÚLTIMO parágrafo de cada seção (exceto a final) com sectionBreak,
    // para que o salvar preserve as 3 seções + orientação + refs de header/footer
    const blockToPara = (blockIdx: number): number => {
      let n = -1;
      for (let b = 0; b <= blockIdx && b < this.fullDoc!.blocks.length; b++) {
        if (this.fullDoc!.blocks[b]!.type === 'paragraph') n++;
      }
      return n;
    };
    const refMap = (refs: typeof this.fullDoc.sections[0]['headerRefs'], kind: 'header' | 'footer') =>
      refs.map((r) => ({ kind, type: r.type, rid: r.rid }));
    for (let si = 0; si < this.fullDoc.sections.length - 1; si++) {
      const section = this.fullDoc.sections[si]!;
      const lastPara = blockToPara(section.blockEnd);
      const p = paragraphs[lastPara];
      if (p) {
        p.props.sectionBreak = {
          sectPr: section.sectPr,
          headerRefs: refMap(section.headerRefs, 'header') as never,
          footerRefs: refMap(section.footerRefs, 'footer') as never,
        };
      }
    }

    // pré-processa runs: campos DATE viram texto; noteRef ganha o número;
    // imagens flutuantes saem do fluxo
    this.floatImages = [];
    paragraphs.forEach((p, pi) => {
      for (const run of p.runs) {
        if (run.field && run.text === '') {
          if (/DATE/i.test(run.field)) {
            run.text = new Date().toLocaleDateString('pt-BR');
          } else if (/PAGE/i.test(run.field)) {
            run.text = '1';
          }
        }
        if (run.noteRef && run.text === '') run.text = String(run.noteRef.id);
        if (run.image?.floating) this.floatImages.push({ para: pi, run });
      }
    });

    this.model = {
      paragraphs,
      sectPr: this.fullDoc.sections[0]?.sectPr ?? {
        pageWidthTwips: 11906, pageHeightTwips: 16838,
        marginLeftTwips: 1701, marginRightTwips: 1701,
        marginTopTwips: 1417, marginBottomTwips: 1417,
      },
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-protected', {
      detail: { active: this.protectedMode, hasFields: this.hasExternalFields() },
    }));
  }

  newDocument(): void {
    this.protectedMode = false; // documento novo nasce editável
    this.loadedFormat = 'docx';
    this.pkg = null;
    this.fullDoc = null;
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.model = {
      paragraphs: [{ runs: [], props: {} }],
      sectPr: {
        pageWidthTwips: 11906, pageHeightTwips: 16838,
        marginLeftTwips: 1701, marginRightTwips: 1701,
        marginTopTwips: 1417, marginBottomTwips: 1417,
      },
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
  }

  setDarkPage(dark: boolean): void {
    this.pageDark = dark;
    this.classList.toggle('page-dark', dark); // fundo do desk (web/draft) segue a página
    this.refresh();
    // refresh só repinta páginas RECÉM-alocadas. Trocar de tema afeta TODAS
    // as canvases já pintadas (texto, sombreado, bordas), então força repaint.
    this.paint();
  }

  /**
   * Cor "efetiva" para o canvas no tema escuro total: inverte a LUMINOSIDADE
   * (HSL: L = 100-L) preservando matiz e saturação. Preto vira branco, branco
   * vira preto, cinza claro vira cinza escuro, azul claro vira azul escuro etc.
   *
   * Não toca PDF/XPS/HTML/Markdown/ODT — esses são SAÍDA do documento e devem
   * manter as cores originais; o tema escuro é só renderização local no canvas.
   *
   * Aceita "RRGGBB" (sem #) ou "#RRGGBB". Retorna sempre "#RRGGBB" pronto p/
   * `ctx.fillStyle`/`strokeStyle`.
   */
  private inkColor(hex: string | undefined, fallbackLight = '#000', fallbackDark = '#e8eaed'): string {
    if (!hex) return this.pageDark ? fallbackDark : fallbackLight;
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    if (!this.pageDark) return `#${h}`;
    if (h.length !== 6) return `#${h}`;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let hh = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: hh = ((b - r) / d + 2) / 6; break;
        case b: hh = ((r - g) / d + 4) / 6; break;
      }
    }
    const lInv = 1 - l;
    const c = (1 - Math.abs(2 * lInv - 1)) * s;
    const x = c * (1 - Math.abs(((hh * 6) % 2) - 1));
    const m = lInv - c / 2;
    let rr = 0, gg = 0, bb = 0;
    const seg = Math.floor(hh * 6);
    if (seg === 0) { rr = c; gg = x; }
    else if (seg === 1) { rr = x; gg = c; }
    else if (seg === 2) { gg = c; bb = x; }
    else if (seg === 3) { gg = x; bb = c; }
    else if (seg === 4) { rr = x; bb = c; }
    else { rr = c; bb = x; }
    const toHex = (v: number): string => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
  }

  // ───────────────── edição de cabeçalho/rodapé ─────────────────
  private hfEdit: { kind: 'header' | 'footer'; path: string } | null = null;
  private dirtyHf = new Set<string>();
  private savedBody: {
    model: DocumentModel;
    tableAnchors: { beforePara: number; table: TableBlock }[];
    sectionStarts: { startPara: number; section: Section }[];
    floatImages: FloatImage[];
    selection: { anchor: DocPosition; focus: DocPosition };
    undoStack: string[];
    redoStack: string[];
    pageCount: number;
    pageSections: number[];
  } | null = null;
  /** Página onde o HF está sendo editado (preserva a paginação do corpo). */
  private hfActivePage = 0;

  // ─────────────── edição de caixa de texto flutuante ───────────────
  // Foco numa caixa de texto (wps:txbx): troca this.model para os parágrafos
  // INTERNOS da caixa, posicionados no retângulo ancorado. Pode empilhar sobre
  // a edição de HF (a caixa mora no header/footer) ou sair direto do corpo.
  private tbEdit: {
    hostRun: Run;
    rectTwips: { x: number; y: number; w: number; h: number };
    pageIdx: number;
  } | null = null;
  private savedForTb: {
    model: DocumentModel;
    tableAnchors: { beforePara: number; table: TableBlock }[];
    sectionStarts: { startPara: number; section: Section }[];
    floatImages: FloatImage[];
    selection: { anchor: DocPosition; focus: DocPosition };
    undoStack: string[];
    redoStack: string[];
    pageCount: number;
    pageSections: number[];
  } | null = null;
  private tbBgSnapshots: HTMLCanvasElement[] = [];
  /** Ao capturar o snapshot de fundo da edição de caixa: run cujo textbox NÃO é
   *  pintado (será desenhado ao vivo em foco), evitando texto "fantasma". */
  private tbSnapshotSuppress: Run | null = null;

  // ─────────── seleção/manipulação de objeto flutuante (imagem/caixa) ───────────
  /** Run que carrega o objeto flutuante SELECIONADO (mostra handles). */
  private floatSel: Run | null = null;
  /** Estado do arrasto de mover/redimensionar em andamento. */
  private floatDrag: {
    mode: 'move' | 'resize';
    handle: string;                 // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w' (move: '')
    startClientX: number; startClientY: number;
    startW: number; startH: number; // twips
    startOX: number; startOY: number; // twips
    aspect: number;                 // w/h (imagem: trava aspecto no canto)
    page: number;
    moved: boolean;
  } | null = null;

  editingHeaderFooter(): 'header' | 'footer' | null {
    return this.hfEdit?.kind ?? null;
  }
  /** true quando o foco está DENTRO de uma caixa de texto. */
  editingTextbox(): boolean { return this.tbEdit !== null; }

  enterHeaderFooter(kind: 'header' | 'footer', activePage = 0): void {
    if (!this.model || this.hfEdit || this.locked()) return;
    this.floatSel = null;
    this.hfActivePage = Math.max(0, Math.min(activePage, this.pageCount - 1));
    // garante fullDoc mínimo em documentos novos
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [], sections: [{
          sectPr: this.model.sectPr, blockStart: 0, blockEnd: 0,
          headers: {}, footers: {}, headerRefs: [], footerRefs: [],
        }],
        footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(),
        bookmarks: new Map(),
      };
    }
    // seção da PÁGINA ATIVA (não sempre a 1ª) — espelha o paint
    const sIdx = this.pageSections[this.hfActivePage] ?? 0;
    const fd = this.fullDoc;
    const sec = this.sectionStarts[sIdx]?.section ?? fd.sections[0]!;
    const set = kind === 'header' ? sec.headers : sec.footers;
    const refs = kind === 'header' ? sec.headerRefs : sec.footerRefs;
    // PARTE exibida nesta página (espelha o paint): a 1ª página usa a 'first'
    // (se existir); as demais usam a 'default'. Editar a parte correta evita que
    // a edição do cabeçalho da capa altere o cabeçalho do resto do documento.
    const partType: 'first' | 'default' = this.hfActivePage === 0 && set.first ? 'first' : 'default';
    if (!set[partType]) set[partType] = [{ runs: [], props: {} }];
    const part = set[partType]!;
    // materializa o texto dos campos (PAGE/NUMPAGES/DATE) sem cache p/ que
    // fiquem visíveis e editáveis; o .field é preservado para o salvar
    for (const p of part) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor())
            : /PAGE/i.test(run.field) ? String(this.pageNumberFor(this.hfActivePage))
            : /DATE/i.test(run.field) ? new Date().toLocaleDateString('pt-BR')
            : run.field.trim();
        }
      }
    }
    let ref = refs.find((r) => r.type === partType);
    if (!ref) {
      ref = { type: partType, rid: `rIdWn${kind}${partType}`, path: `word/uw-${kind}-${partType}.xml` };
      refs.push(ref);
      this.dirtyHf.add(ref.path); // parte nova: sempre gravar
    }
    // Fundo esmaecido = SÓ o CORPO (ambos HF suprimidos; header e footer são
    // repintados na composição da edição). Fundo TRANSPARENTE p/ compor sobre a
    // imagem behindDoc (capa) sem véu branco. Ver paintHfEditCompose.
    this.hfCapturing = true;
    this.paint();
    this.hfBodySnapshots = this.canvases.map((c) => {
      const snap = document.createElement('canvas');
      snap.width = c.width; snap.height = c.height;
      if (c.width > 1) snap.getContext('2d')!.drawImage(c, 0, 0);
      return snap;
    });
    this.hfCapturing = false;
    this.savedBody = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections],
    };
    // o array de parágrafos do cabeçalho É o modelo agora (mesmas referências
    // — edições refletem no fullDoc e na pintura do corpo ao sair).
    // A PAGINAÇÃO do corpo é preservada: o nº de páginas/panes não muda.
    this.model = { paragraphs: part, sectPr: this.savedBody.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.hfEdit = { kind, path: ref.path };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-hfmode', { detail: { active: true, kind } }));
  }

  exitHeaderFooter(): void {
    if (this.tbEdit) this.exitTextbox(); // caixa aninhada no HF: sai dela antes
    if (!this.hfEdit || !this.savedBody) return;
    this.floatSel = null;
    this.hfBodySnapshots = [];
    this.model = this.savedBody.model;
    this.tableAnchors = this.savedBody.tableAnchors;
    this.sectionStarts = this.savedBody.sectionStarts;
    this.floatImages = this.savedBody.floatImages;
    this.selection = this.savedBody.selection;
    this.undoStack = this.savedBody.undoStack;
    this.redoStack = this.savedBody.redoStack;
    this.savedBody = null;
    this.hfEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-hfmode', { detail: { active: false } }));
  }

  /** Entra na edição do conteúdo de uma caixa de texto flutuante. hostRun é o
   *  run que carrega `.textbox`; rectTwips é o retângulo ancorado (coords de
   *  página, twips); caret opcional posiciona o cursor no ponto do clique. */
  private enterTextbox(
    hostRun: Run,
    rectTwips: { x: number; y: number; w: number; h: number },
    pageIdx: number,
    caret?: DocPosition,
  ): void {
    if (!this.model || !hostRun.textbox || this.tbEdit || this.locked()) return;
    this.floatSel = null;
    const tb = hostRun.textbox;
    // materializa campos (PAGE/NUMPAGES/DATE) p/ ficarem visíveis e editáveis;
    // o .field é preservado para o salvar (ver serialização de campo).
    for (const p of tb.paras) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor())
            : /PAGE/i.test(run.field) ? String(this.pageNumberFor(pageIdx))
            : /DATE/i.test(run.field) ? new Date().toLocaleDateString('pt-BR')
            : run.field.trim();
        }
      }
    }
    // fundo = render ATUAL (corpo, ou HF em edição) capturado cheio, MAS sem o
    // texto DESTA caixa (senão o texto antigo "fantasma" apareceria por baixo do
    // texto ao vivo). Na pintura fica esmaecido; a caixa ativa é reposta em foco.
    this.tbSnapshotSuppress = hostRun;
    this.paint();
    this.tbSnapshotSuppress = null;
    this.tbBgSnapshots = this.canvases.map((c) => {
      const snap = document.createElement('canvas');
      snap.width = c.width; snap.height = c.height;
      if (c.width > 1) snap.getContext('2d')!.drawImage(c, 0, 0);
      return snap;
    });
    this.savedForTb = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections],
    };
    // os parágrafos da caixa VIRAM o modelo (mesmas referências → edições
    // refletem no textbox e, ao sair, no render normal). Paginação preservada.
    this.model = { paragraphs: tb.paras, sectPr: this.savedForTb.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.tbEdit = { hostRun, rectTwips, pageIdx };
    const start = caret ?? { para: 0, offset: 0 };
    this.selection = { anchor: start, focus: start };
    this.undoStack = [];
    this.redoStack = [];
    // caixa dentro de HF: garante que a parte do HF será regravada no save
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.focusEditor();
    this.dispatchEvent(new CustomEvent('uw-tbmode', { detail: { active: true } }));
  }

  exitTextbox(): void {
    if (!this.tbEdit || !this.savedForTb) return;
    this.tbBgSnapshots = [];
    this.model = this.savedForTb.model;
    this.tableAnchors = this.savedForTb.tableAnchors;
    this.sectionStarts = this.savedForTb.sectionStarts;
    this.floatImages = this.savedForTb.floatImages;
    this.selection = this.savedForTb.selection;
    this.undoStack = this.savedForTb.undoStack;
    this.redoStack = this.savedForTb.redoStack;
    this.savedForTb = null;
    this.tbEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-tbmode', { detail: { active: false } }));
  }

  /** Desloca âncoras de tabela/seção quando parágrafos entram/saem. */
  private shiftAnchors(fromPara: number, delta: number): void {
    for (const a of this.tableAnchors) if (a.beforePara > fromPara) a.beforePara += delta;
    for (const s of this.sectionStarts) if (s.startPara > fromPara) s.startPara += delta;
    for (const f of this.floatImages) if (f.para > fromPara) f.para += delta;
  }

  // ───────────────────────── API pública ─────────────────────────

  setView(v: ViewMode): void {
    const prev = this.view;
    const z0 = this.zoom;
    if (v === 'read' && prev !== 'read') this.zoomBeforeRead = this.zoom;
    this.view = v;
    this.classList.remove('view-print', 'view-web', 'view-draft', 'view-read', 'view-outline');
    this.classList.add(`view-${v}`);
    if (v === 'read') { this.readFirstPage = 0; this.fitReadZoom(); }   // ajusta p/ caber páginas em raias
    else if (prev === 'read') this.zoom = this.zoomBeforeRead;          // restaura ao sair
    this.refresh();
    this.scrollTop = 0;
    if (this.zoom !== z0) this.dispatchEvent(new CustomEvent('uw-zoom', { detail: { zoom: this.zoom } }));
  }
  getView(): ViewMode { return this.view; }

  // ── Modo Leitura: páginas em RAIAS (N por largura), navegadas em blocos ───
  /** Zoom: N páginas cabem na LARGURA e cada uma na ALTURA (o menor dos dois). */
  private fitReadZoom(): void {
    if (!this.model) return;
    const s = this.sect();
    const pageW1 = s.pageWidthTwips * PX_PER_TWIP;
    const pageH1 = s.pageHeightTwips * PX_PER_TWIP;
    const n = this.readPagesPerView();
    const availW = (this.clientWidth || 1200) - 8;
    const availH = (this.clientHeight || 800) - 8;
    this.zoom = Math.max(0.1, Math.min(5, availW / (n * pageW1), availH / pageH1));
  }
  /** Nº de raias (páginas lado a lado) — escala com a largura: ~2 em 1440p,
   *  3 em 2560px, 4 em 4K. (largura-alvo por página ≈ 880px) */
  private readPagesPerView(): number {
    return Math.max(1, Math.round((this.clientWidth || 1200) / 880));
  }
  /** Exibe só o bloco de N páginas a partir de readFirstPage; oculta as demais. */
  private applyReadSpread(): void {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    this.readFirstPage = Math.max(0, Math.min(this.readFirstPage, Math.max(0, total - 1)));
    const a = this.readFirstPage, b = a + n;
    this.canvases.forEach((c, i) => {
      const shown = i >= a && i < b;
      c.style.display = shown ? '' : 'none';
      c.classList.toggle('read-divider', shown && i > a); // divisor só ENTRE páginas (não na 1ª)
    });
  }
  /** Navega ±1 bloco (N páginas) no modo Leitura. */
  private nudgeRead(dir: 1 | -1): void {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    let next = this.readFirstPage + dir * n;
    if (next >= total) return;            // já no fim
    next = Math.max(0, next);
    if (next === this.readFirstPage) return;
    this.readFirstPage = next;
    this.scrollTop = 0;
    this.applyReadSpread();
    this.ensureVisiblePainted();
  }

  /** Zoom 10%–500%. anchorY (px do viewport): ponto que deve ficar parado. */
  setZoom(z: number, anchorY?: number): void {
    const clamped = Math.min(5, Math.max(0.1, z));
    if (clamped === this.zoom) return;
    const old = this.zoom;
    const anchor = anchorY ?? this.clientHeight / 2;
    const docY = this.scrollTop + anchor; // ponto do documento sob a âncora
    this.zoom = clamped;
    this.refresh();
    this.scrollTop = (docY * clamped) / old - anchor;
    this.dispatchEvent(new CustomEvent('uw-zoom', { detail: { zoom: clamped } }));
  }
  getZoom(): number { return this.zoom; }
  toggleMarks(): boolean { this.showMarks = !this.showMarks; this.refresh(); return this.showMarks; }

  getSelectionState(): { run: RunProps; para: ParaProps; view: ViewMode; marks: boolean } {
    const run: RunProps = { ...(this.pendingProps ?? this.currentProps()) };
    const p = this.model?.paragraphs[this.selection.focus.para];
    const st = p ? this.styleOf(p) : undefined;
    const dd = this.docDefaults();
    // props EFETIVAS: o que não está direto no run/parágrafo é herdado do
    // estilo/docDefaults, exatamente como o layout resolve. Sem isso a toolbar
    // mostra "esquerda" em parágrafos alinhados via estilo, ou fonte/tamanho em
    // BRANCO em texto sem formatação direta (o comum).
    const para: ParaProps = { ...(p?.props ?? {}) };
    if (para.alignment === undefined) para.alignment = st?.alignment;
    if (run.fontAscii === undefined) run.fontAscii = st?.fontAscii ?? dd.run.fontAscii ?? DEFAULT_FONT;
    if (run.szHalfPt === undefined) {
      run.szHalfPt = st?.sizePt !== undefined ? Math.round(st.sizePt * 2) : dd.run.szHalfPt ?? 22;
    }
    return { run, para, view: this.view, marks: this.showMarks };
  }

  toggleRunProp(key: 'bold' | 'italic' | 'underline' | 'strike' | 'allCaps' | 'smallCaps'): void {
    const cur = this.pendingProps ?? this.currentProps();
    this.formatRuns({ [key]: !cur[key] } as Partial<RunProps>);
  }
  toggleVertAlign(kind: 'superscript' | 'subscript'): void {
    const cur = (this.pendingProps ?? this.currentProps()).vertAlign;
    this.formatRuns({ vertAlign: cur === kind ? undefined : kind });
  }
  setFontSize(pt: number): void { this.formatRuns({ szHalfPt: Math.round(pt * 2) }); }
  growFont(delta: number): void {
    const cur = (this.pendingProps ?? this.currentProps()).szHalfPt ?? 22;
    this.formatRuns({ szHalfPt: Math.max(2, cur + delta * 2) });
  }
  setFontFamily(name: string): void {
    void this.ensureFontLoaded(name); // carrega métricas/FontFace da fonte do SO
    this.formatRuns({ fontAscii: name });
  }

  /** Famílias de fonte JÁ carregadas (bundled + embedadas do doc), em ordem. */
  knownFontFamilies(): string[] {
    return [...this.loadedFamilyNames].sort((a, b) => a.localeCompare(b));
  }

  /** True quando a lista de fontes do SO vem do host (sem gesto/permissão). */
  hasHostSystemFonts(): boolean {
    return !!UniversalWriteElement.systemFonts;
  }

  /** Fontes instaladas no SO: do HOST (systemFonts) se houver; senão via Local
   *  Font Access API (queryLocalFonts), que requer gesto do usuário +
   *  permissão. Cacheia o resultado. Vazio se nada disso existir ou for negado.
   *  Guarda os FontData p/ carregar sob demanda. */
  async systemFontFamilies(): Promise<string[]> {
    if (this.sysFontsCache) return this.sysFontsCache;
    const host = UniversalWriteElement.systemFonts;
    if (host) {
      try { this.sysFontsCache = [...await host.list()]; } catch { this.sysFontsCache = []; }
      return this.sysFontsCache;
    }
    const q = (window as unknown as { queryLocalFonts?: () => Promise<LocalFontData[]> }).queryLocalFonts;
    if (typeof q !== 'function') { this.sysFontsCache = []; return []; }
    try {
      const fonts = await q();
      const fams = new Set<string>();
      for (const f of fonts) {
        if (!f.family) continue;
        fams.add(f.family);
        const list = this.sysFontData.get(f.family) ?? [];
        list.push(f);
        this.sysFontData.set(f.family, list);
      }
      this.sysFontsCache = [...fams].sort((a, b) => a.localeCompare(b));
      return this.sysFontsCache;
    } catch { this.sysFontsCache = []; return []; }
  }

  /** Lista para o seletor: bundled + embedadas + SO (dedup, ordenado). */
  async listAvailableFonts(): Promise<string[]> {
    const sys = await this.systemFontFamilies();
    const all = new Set<string>([...this.loadedFamilyNames, ...sys]);
    return [...all].sort((a, b) => a.localeCompare(b));
  }

  /** Carrega sob demanda uma fonte do SO (métricas + FontFace) quando ela é
   *  selecionada/usada, para render E layout usarem a fonte real. */
  async ensureFontLoaded(family: string): Promise<void> {
    if (!family || this.loadedFamilyNames.has(family) || !this.fonts) return;
    const faces = this.sysFontData.get(family);
    if (!faces?.length) {
      if (await this.loadHostFonts([family]) && this.model) this.refresh();
      return;
    }
    let added = false;
    for (const fd of faces) {
      const variant = variantOfStyle(fd.style);
      if (this.loadedFamilies.has(`${family} ${variant}`)) continue;
      try {
        const bytes = new Uint8Array(await (await fd.blob()).arrayBuffer());
        const weight = variant === 'bold' || variant === 'boldItalic' ? '700' : '400';
        const style = variant === 'italic' || variant === 'boldItalic' ? 'italic' : 'normal';
        const face = new FontFace(family, bytes.slice().buffer, { weight, style });
        await face.load();
        document.fonts.add(face);
        this.loadedFamilies.add(`${family} ${variant}`);
        this.loadedFamilyNames.add(family);
        try { this.fonts.register(family, variant, new SfntFont(bytes)); } catch { /* métrica opcional */ }
        (this.fontBytes[family] ??= {})[variant] = bytes;
        added = true;
      } catch { /* face inacessível: ignora */ }
    }
    if (added && this.model) this.refresh();
  }

  /** Pede ao HOST as faces das famílias (uma vez por família) e registra
   *  FontFace (render) + SfntFont (layout) + bytes (PDF/XPS). Só entra a face
   *  cujas métricas o SfntFont lê e cuja licença permite embutir — senão o
   *  canvas, o layout e o PDF divergiriam; a família fica no fallback.
   *  Retorna true se alguma face foi adicionada. */
  private async loadHostFonts(families: string[]): Promise<boolean> {
    const host = UniversalWriteElement.systemFonts;
    if (!host || !this.fonts) return false;
    const todo = families.filter((f) =>
      f && !this.loadedFamilyNames.has(f) && !this.hostFontsAsked.has(f.toLowerCase()));
    if (!todo.length) return false;
    for (const f of todo) this.hostFontsAsked.add(f.toLowerCase());
    let faces: SystemFontFace[];
    try { faces = await host.resolve(todo); } catch { return false; }
    let added = false;
    for (const f of faces) {
      if (f.embeddable === false) continue;
      const italic = f.style === 'italic';
      const bold = f.bold ?? Number(f.weight) >= 600;
      const variant: FontVariant = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
      if (this.loadedFamilies.has(`${f.family} ${variant}`)) continue;
      try {
        const bytes = new Uint8Array(f.bytes);
        const metrics = new SfntFont(bytes);
        const face = new FontFace(f.family, bytes.slice().buffer, {
          weight: bold ? '700' : '400', style: italic ? 'italic' : 'normal',
        });
        await face.load();
        document.fonts.add(face);
        this.loadedFamilies.add(`${f.family} ${variant}`);
        this.loadedFamilyNames.add(f.family);
        this.fonts.register(f.family, variant, metrics);
        (this.fontBytes[f.family] ??= {})[variant] = bytes;
        added = true;
      } catch { /* face ilegível: fica no fallback */ }
    }
    return added;
  }

  /** Família usada pelo documento sem FontFace: entra no próximo lote pedido
   *  ao host; ao chegar, refaz layout + pintura com a fonte real. */
  private queueHostFont(family: string): void {
    if (!UniversalWriteElement.systemFonts || this.hostFontsAsked.has(family.toLowerCase())) return;
    this.hostFontQueue.add(family);
    this.hostFontTimer ??= setTimeout(() => {
      this.hostFontTimer = null;
      const fams = [...this.hostFontQueue];
      this.hostFontQueue.clear();
      void this.loadHostFonts(fams).then((added) => { if (added && this.model) this.refresh(); });
    }, 0);
  }
  setColor(hex: string | undefined): void { this.formatRuns({ color: hex }); }
  setHighlight(name: string | undefined): void { this.formatRuns({ highlight: name }); }
  clearFormatting(): void {
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps(this.model!, this.range(), { ...DEFAULT_RUN_PROPS, szHalfPt: undefined, color: undefined, highlight: undefined, fontAscii: undefined, vertAlign: undefined });
      applyParaProps(this.model!, this.range(), { styleId: undefined, alignment: undefined });
    }
    this.refresh();
  }
  changeCase(mode: 'upper' | 'lower'): void {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    this.snapshot();
    const { start, end } = normalizeRange(this.range());
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi]!;
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc; const re = acc + run.text.length; acc = re;
        const from = pi === start.para ? Math.max(start.offset, rs) : rs;
        const to = pi === end.para ? Math.min(end.offset, re) : re;
        if (to <= from) continue;
        const seg = run.text.slice(from - rs, to - rs);
        const tx = mode === 'upper' ? seg.toUpperCase() : seg.toLowerCase();
        run.text = run.text.slice(0, from - rs) + tx + run.text.slice(to - rs);
      }
    }
    this.refresh();
  }

  setAlignment(a: 'left' | 'center' | 'right' | 'both'): void { this.formatPara({ alignment: a }); }
  /** Aplica hyperlink à seleção; sem seleção e com url, insere a url já linkada. */
  setLink(url: string | undefined): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps(this.model, this.range(), { link: url || undefined });
    } else if (url) {
      const start = this.selection.focus;
      const pos = insertText(this.model, start, url);
      applyRunProps(this.model, { start, end: pos }, { link: url });
      this.selection = { anchor: pos, focus: pos };
    }
    this.refresh();
  }
  toggleList(kind: 'bullet' | 'decimal'): void {
    const cur = this.model?.paragraphs[this.selection.focus.para]?.props.numbering;
    this.formatPara({
      numbering: cur?.kind === kind ? undefined : { kind, ilvl: 0 },
      indentLeftTwips: cur?.kind === kind ? undefined : 720,
    });
  }
  indent(delta: 1 | -1): void {
    const p = this.model?.paragraphs[this.selection.focus.para];
    const cur = p?.props.indentLeftTwips ?? 0;
    this.formatPara({ indentLeftTwips: Math.max(0, cur + delta * 720) || undefined });
  }
  setLineSpacing(line: number): void { this.formatPara({ lineTwentieths: line }); }
  /** Aplica um estilo de parágrafo replicando o Word: além de setar o styleId,
   *  LIMPA a formatação direta que impediria o estilo de aparecer — props de
   *  parágrafo (numeração/bullet, alinhamento, espaçamento, recuos, bordas) e
   *  props de run UNIFORMES no parágrafo (tamanho/fonte/cor/negrito iguais em
   *  todos os runs). Formatação de run PARCIAL (ex.: uma palavra em negrito) é
   *  preservada — exatamente como o Word faz. */
  applyStyle(styleId: string | undefined): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    const r = this.range();
    const lo = Math.min(r.start.para, r.end.para);
    const hi = Math.max(r.start.para, r.end.para);
    const RUN_KEYS: (keyof RunProps)[] = [
      'szHalfPt', 'fontAscii', 'color', 'bold', 'italic', 'underline',
      'underlineStyle', 'underlineColor', 'strike', 'doubleStrike',
      'allCaps', 'smallCaps', 'vertAlign', 'highlight', 'charSpacingTwips',
    ];
    for (let pi = lo; pi <= hi; pi++) {
      const p = this.model.paragraphs[pi];
      if (!p) continue;
      p.props.styleId = styleId;
      // formatação direta de PARÁGRAFO cede ao estilo
      p.props.numbering = undefined;
      p.props.alignment = undefined;
      p.props.spaceBeforeTwips = undefined;
      p.props.spaceAfterTwips = undefined;
      p.props.lineTwentieths = undefined;
      p.props.indentLeftTwips = undefined;
      p.props.indentRightTwips = undefined;
      p.props.indentFirstLineTwips = undefined;
      p.props.borders = undefined;
      p.props.shadingHex = undefined;
      // props de run UNIFORMES no parágrafo cedem ao estilo; as que VARIAM ficam
      const runs = p.runs;
      if (runs.length) {
        for (const key of RUN_KEYS) {
          const first = runs[0]!.props[key];
          if (first === undefined) continue;
          if (runs.every((rn) => rn.props[key] === first)) {
            for (const rn of runs) delete (rn.props as unknown as Record<string, unknown>)[key];
          }
        }
      }
    }
    this.pendingProps = null;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }
  setShading(hex: string | undefined): void { this.formatPara({ shadingHex: hex }); }
  setCharSpacing(twips: number | undefined): void { this.formatRuns({ charSpacingTwips: twips }); }
  setSpecialIndent(kind: 'none' | 'firstLine' | 'hanging'): void {
    this.formatPara({
      indentFirstLineTwips: kind === 'none' ? undefined : kind === 'firstLine' ? 708 : -708,
    });
  }
  setIndentRight(twips: number | undefined): void { this.formatPara({ indentRightTwips: twips }); }

  // pincel de formatação
  private painterProps: { run: RunProps; para: ParaProps } | null = null;
  copyFormat(): void {
    if (!this.model) return;
    this.painterProps = {
      run: this.currentProps(),
      para: { ...this.model.paragraphs[this.selection.focus.para]!.props },
    };
  }
  painterActive(): boolean { return this.painterProps !== null; }
  private applyPainter(): void {
    if (!this.painterProps || !this.model) return;
    const { run, para } = this.painterProps;
    this.painterProps = null;
    this.snapshot();
    if (this.hasSelection()) applyRunProps(this.model, this.range(), run);
    applyParaProps(this.model, this.range(), para);
    this.refresh();
  }

  // localizar / substituir
  findNext(needle: string): boolean {
    if (!this.model || !needle) return false;
    const lower = needle.toLowerCase();
    const startP = this.selection.focus.para;
    const startO = this.selection.focus.offset;
    const n = this.model.paragraphs.length;
    for (let k = 0; k <= n; k++) {
      const pi = (startP + k) % n;
      const text = paraText(this.model.paragraphs[pi]!).toLowerCase();
      const from = k === 0 ? startO : 0;
      const idx = text.indexOf(lower, from);
      if (idx >= 0) {
        this.selection = {
          anchor: { para: pi, offset: idx },
          focus: { para: pi, offset: idx + needle.length },
        };
        this.refresh();
        this.scrollCaretIntoView();
        return true;
      }
    }
    return false;
  }
  replaceAll(needle: string, replacement: string): number {
    if (!this.model || !needle) return 0;
    this.snapshot();
    let count = 0;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let from = 0; // avança além da substituição p/ não re-casar com ela
      for (;;) {
        const text = paraText(this.model.paragraphs[pi]!).toLowerCase();
        const idx = text.indexOf(needle.toLowerCase(), from);
        if (idx < 0) break;
        const pos = deleteRange(this.model, {
          start: { para: pi, offset: idx },
          end: { para: pi, offset: idx + needle.length },
        });
        insertText(this.model, pos, replacement);
        from = idx + replacement.length;
        count++;
      }
    }
    this.refresh();
    return count;
  }

  /** Texto plano da seleção (parágrafos separados por \n). */
  selectedText(): string {
    if (!this.model || !this.hasSelection()) return '';
    const { start, end } = normalizeRange(this.range());
    const parts: string[] = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const paragraph = this.model.paragraphs[pi]!;
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(paragraph);
      parts.push(this.plainTextSlice(paragraph, from, to));
    }
    return parts.join('\n');
  }

  private plainTextSlice(paragraph: Paragraph, from: number, to: number): string {
    let out = '';
    let acc = 0;
    for (const run of paragraph.runs) {
      const start = acc;
      const end = acc + run.text.length;
      acc = end;
      const sliceStart = Math.max(from, start);
      const sliceEnd = Math.min(to, end);
      if (sliceEnd <= sliceStart) continue;
      out += run.custom
        ? run.custom.fallbackText
        : run.text.slice(sliceStart - start, sliceEnd - start);
    }
    return out;
  }

  /** pos está dentro da seleção atual (range normalizado)? */
  private posInSelection(pos: DocPosition): boolean {
    if (!this.hasSelection()) return false;
    const { start, end } = normalizeRange(this.range());
    const after = pos.para > start.para || (pos.para === start.para && pos.offset >= start.offset);
    const before = pos.para < end.para || (pos.para === end.para && pos.offset <= end.offset);
    return after && before;
  }

  /** Extrai a seleção como parágrafos de runs (com props) — base do clipboard rico. */
  private extractSelection(): { text: string; paras: { runs: { text: string; props: RunProps }[] }[] } | null {
    if (!this.model || !this.hasSelection()) return null;
    const { start, end } = normalizeRange(this.range());
    const paras: { runs: { text: string; props: RunProps }[] }[] = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi]!;
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(p);
      const runs: { text: string; props: RunProps }[] = [];
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc, re = acc + run.text.length; acc = re;
        const s = Math.max(from, rs), e = Math.min(to, re);
        if (e > s) runs.push({
          text: run.custom ? run.custom.fallbackText : run.text.slice(s - rs, e - rs),
          props: { ...run.props },
        });
      }
      paras.push({ runs });
    }
    const text = paras.map((pp) => pp.runs.map((r) => r.text).join('')).join('\n');
    return { text, paras };
  }

  /** Copia a seleção: texto p/ o sistema + cópia RICA interna (preserva origem). */
  async copy(): Promise<void> {
    const t = this.selectedText();
    if (!t) return;
    this.richClip = this.extractSelection();
    try { await navigator.clipboard?.writeText(t); } catch { /* sem permissão */ }
  }
  /** Recorta a seleção. */
  async cut(): Promise<void> {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    await this.copy();
    this.snapshot();
    const pos = this.deleteSelection();
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }
  /** Colar (Ctrl+V): respeita a formatação da ORIGEM (rico) quando o texto do
   * sistema ainda casa com a cópia interna; senão cola texto externo herdando o destino. */
  async paste(): Promise<void> {
    if (this.locked()) return;
    try {
      const t = await navigator.clipboard?.readText();
      if (!t) return;
      // o clipboard do SO normaliza p/ \r\n no Windows — comparar normalizado
      if (this.richClip && this.richClip.text === t.replace(/\r\n?/g, '\n')) this.insertRich(this.richClip);
      else this.pasteText(t);
      this.onSelectionChange?.(); this.chromeSync?.();
    } catch { /* sem permissão de leitura */ }
  }
  /** Colar sem formatação (Ctrl+Shift+V): sempre texto plano, herdando o DESTINO. */
  async pastePlain(): Promise<void> {
    if (this.locked()) return;
    try { const t = await navigator.clipboard?.readText(); if (t) { this.pasteText(t); this.onSelectionChange?.(); this.chromeSync?.(); } }
    catch { /* sem permissão de leitura */ }
  }

  /** Insere os parágrafos/runs ricos preservando os props de cada run (origem). */
  private insertRich(clip: { paras: { runs: { text: string; props: RunProps }[] }[] }): void {
    if (!this.model || this.view === 'read') return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    let pos = this.selection.focus;
    clip.paras.forEach((cp, i) => {
      if (i > 0) pos = splitParagraph(this.model!, pos);
      for (const run of cp.runs) if (run.text) pos = insertText(this.model!, pos, run.text, { ...run.props });
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }

  /** Cola texto plano (\n divide parágrafos) HERDANDO a formatação do destino (props do caret). */
  pasteText(text: string): void {
    if (!this.model || this.view === 'read' || !text) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const paras = text.replace(/\r\n?/g, '\n').split('\n');
    let pos = this.selection.focus;
    paras.forEach((part, i) => {
      if (i > 0) pos = splitParagraph(this.model!, pos);
      if (part) pos = insertText(this.model!, pos, part); // sem props ⇒ herda o destino
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  toggleBorder(): void {
    const p = this.model?.paragraphs[this.selection.focus.para]?.props;
    const has = !!(p?.boxBorder || p?.borders);
    const edge = { style: 'single', sizeEighthPt: 4, spacePt: 1 };
    this.formatPara({
      boxBorder: undefined,
      borders: has ? undefined : { top: { ...edge }, left: { ...edge }, bottom: { ...edge }, right: { ...edge } },
    });
  }
  setSpaceAfter(twips: number | undefined): void { this.formatPara({ spaceAfterTwips: twips }); }
  setSpaceBefore(twips: number | undefined): void { this.formatPara({ spaceBeforeTwips: twips }); }

  setPageSetup(opts: {
    orientation?: 'portrait' | 'landscape';
    size?: 'A4' | 'Letter';
    margins?: 'normal' | 'narrow' | 'wide';
    /** margens personalizadas em twips (sobrepõe o preset). */
    customMargins?: { top: number; right: number; bottom: number; left: number };
  }): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    // aplica também a TODAS as seções (docs multi-seção como o catálogo
    // usam a geometria das seções, não a do model.sectPr)
    const targets = [this.model.sectPr, ...this.sectionStarts.map((ss) => ss.section.sectPr)];
    for (const s of targets) {
      if (opts.size) {
        const [w, h] = opts.size === 'A4' ? [11906, 16838] : [12240, 15840];
        const landscape = s.pageWidthTwips > s.pageHeightTwips;
        s.pageWidthTwips = landscape ? h : w;
        s.pageHeightTwips = landscape ? w : h;
      }
      if (opts.orientation) {
        const [a, b] = [s.pageWidthTwips, s.pageHeightTwips];
        const isLandscape = a > b;
        if ((opts.orientation === 'landscape') !== isLandscape) {
          s.pageWidthTwips = b; s.pageHeightTwips = a;
        }
      }
      if (opts.margins) {
        const m = { normal: [1417, 1701], narrow: [720, 720], wide: [1417, 2880] }[opts.margins]!;
        s.marginTopTwips = s.marginBottomTwips = m[0]!;
        s.marginLeftTwips = s.marginRightTwips = m[1]!;
      }
      if (opts.customMargins) {
        s.marginTopTwips = opts.customMargins.top;
        s.marginRightTwips = opts.customMargins.right;
        s.marginBottomTwips = opts.customMargins.bottom;
        s.marginLeftTwips = opts.customMargins.left;
      }
    }
    this.refresh();
  }

  undo(): void { this.popHistory(this.undoStack, this.redoStack); }
  redo(): void { this.popHistory(this.redoStack, this.undoStack); }

  /** Insere quebra de página no caret (Ctrl+Enter). */
  insertPageBreak(): void {
    this.type('\f');
  }

  /** Insere um CAMPO no caret (variáveis de cabeçalho/rodapé do app de referência).
   *  O texto é o token que o paint substitui por página; ao salvar vira
   *  fldSimple e o próprio app de referência passa a atualizá-lo. */
  insertField(kind: 'PAGE' | 'NUMPAGES' | 'DATE'): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const display = kind === 'DATE' ? new Date().toLocaleDateString('pt-BR') : kind;
    const instr = kind === 'DATE' ? ' DATE \\@ "dd/MM/yyyy" ' : ` ${kind} `;
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para]!;
    // insere como run separado com field (não funde com vizinhos)
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const fieldRun: Run = {
          text: display,
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          field: instr,
        };
        if (!run) p.runs.push(fieldRun);
        else {
          const cut = offset - acc;
          const parts: Run[] = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props }, ...(run.field ? { field: run.field } : {}) });
          parts.push(fieldRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props }, ...(run.field ? { field: run.field } : {}) });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    const np = { para, offset: offset + display.length };
    this.selection = { anchor: np, focus: np };
    this.refresh();
  }

  // ───────────────── sumário (TOC) ─────────────────

  /** Gera/atualiza o sumário a partir dos títulos, com páginas do NOSSO
   *  layout e leader pontilhado — o equivalente do F9 do app de referência. */
  updateToc(): boolean {
    if (!this.model || this.locked()) return false;
    const tocIdx = this.model.paragraphs.findIndex((p) => p.props.tocInstr);
    if (tocIdx < 0) return false;
    // atualização de campo ≠ edição (não dispara autosave)
    this.quietChange = true;
    this.snapshot();
    this.quietChange = false;

    // remove entradas antigas (e o resíduo vazio do campo logo após)
    let end = tocIdx + 1;
    while (
      end < this.model.paragraphs.length &&
      (this.model.paragraphs[end]!.props.tocEntry ||
        (end === tocIdx + 1 && paraLength(this.model.paragraphs[end]!) === 0 && !this.model.paragraphs[end]!.props.styleId))
    ) end++;
    const removed = end - (tocIdx + 1);
    this.model.paragraphs.splice(tocIdx + 1, removed);
    this.shiftAnchors(tocIdx, -removed);

    // níveis do instr: TOC \o "1-3"
    const instr = this.model.paragraphs[tocIdx]!.props.tocInstr!;
    const range = instr.match(/\\o\s+"(\d)-(\d)"/);
    const minLvl = range ? parseInt(range[1]!, 10) : 1;
    const maxLvl = range ? parseInt(range[2]!, 10) : 3;

    const s = this.sect();
    const contentW = s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
    const entries: Paragraph[] = [];
    this.model.paragraphs.forEach((p, pi) => {
      const m = p.props.styleId?.match(/^(?:Heading|Ttulo)(\d)$/);
      if (!m) return;
      const lvl = parseInt(m[1]!, 10);
      if (lvl < minLvl || lvl > maxLvl) return;
      const page = (this.layoutCache[pi]?.lines[0]?.page ?? 0) + 1;
      const text = paraText(p).replace(/[\f\n]/g, '').trim();
      if (!text) return;
      entries.push({
        runs: [{
          text: `${text}\t${page}`,
          props: { ...DEFAULT_RUN_PROPS, link: `#para:${pi}`, color: lvl === 1 ? undefined : '444444' },
        }],
        props: {
          tocEntry: true,
          indentLeftTwips: (lvl - 1) * 220 || undefined,
          spaceAfterTwips: 40,
          tabStops: [{ posTwips: contentW, align: 'right', leader: 'dot' }],
        },
      });
    });
    this.model.paragraphs.splice(tocIdx + 1, 0, ...entries);
    this.shiftAnchors(tocIdx, entries.length);
    this.refresh();
    return true;
  }

  /** Navega para um destino interno: "#para:N" ou "#bookmark". */
  navigateTo(link: string): boolean {
    if (!link.startsWith('#')) return false;
    let paraIdx = -1;
    const pm = link.match(/^#para:(\d+)$/);
    if (pm) paraIdx = parseInt(pm[1]!, 10);
    else {
      const blockIdx = this.fullDoc?.bookmarks.get(link.slice(1));
      if (blockIdx !== undefined && this.fullDoc) {
        let count = 0;
        for (let b = 0; b < blockIdx && b < this.fullDoc.blocks.length; b++) {
          if (this.fullDoc.blocks[b]!.type === 'paragraph') count++;
        }
        paraIdx = count;
      }
    }
    const line = this.layoutCache[paraIdx]?.lines[0];
    if (!line) return false;
    const canvas = this.canvases[line.page];
    if (!canvas) return false;
    this.animateScrollTo(Math.max(0, canvas.offsetTop + line.yTwips * PX_PER_TWIP * this.zoom - 60));
    return true;
  }

  // ───────────────── comentários (anotações) ─────────────────

  getComments(): { id: number; author?: string; text: string }[] {
    return this.fullDoc?.comments ?? [];
  }

  /**
   * Posição CSS-pixel (top-left + altura) da PRIMEIRA linha que carrega este
   * comentário, no espaço de scroll do editor (somando canvas.offsetTop ao
   * y da linha). Permite à camada DOM posicionar cards "inline" alinhados ao
   * trecho anotado (gap do app de referência: comentários na margem como o Google Docs).
   */
  commentAnchorPx(id: number): { topPx: number; heightPx: number; page: number } | null {
    if (!this.model) return null;
    const scale = PX_PER_TWIP * this.zoom;
    // 1) procura no corpo (parágrafos top-level)
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      const para = this.model.paragraphs[pi]!;
      const has = para.runs.some((r) => r.props.commentIds?.includes(id));
      if (!has) continue;
      const line = this.layoutCache[pi]?.lines[0];
      if (!line) return null;
      const canvas = this.canvases[line.page];
      if (!canvas) return null;
      return {
        topPx: canvas.offsetTop + line.yTwips * scale,
        heightPx: line.heightTwips * scale,
        page: line.page,
      };
    }
    // 2) procura em tabelas (cells.paragraphs e tables aninhadas)
    for (const tl of this.tableLayouts) {
      const hit = this.findCommentRowInTable(tl.table, id);
      if (!hit) continue;
      const canvas = this.canvases[tl.page];
      if (!canvas) return null;
      const cellTopRel = tl.rowYs[hit.row] ?? 0;
      const cellHeightTwips = (tl.rowYs[hit.row + 1] ?? tl.heightTwips) - cellTopRel;
      const cellTopAbs = tl.yTwips + cellTopRel;
      return {
        topPx: canvas.offsetTop + cellTopAbs * scale,
        heightPx: cellHeightTwips * scale,
        page: tl.page,
      };
    }
    return null;
  }

  /** Acha a 1ª linha (e coluna, p/ debug) de uma tabela onde algum run carrega o commentId. */
  private findCommentRowInTable(table: TableBlock, id: number): { row: number; col: number } | null {
    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri]!;
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci]!;
        if (cell.paragraphs.some((p) => p.runs.some((r) => r.props.commentIds?.includes(id)))) {
          return { row: ri, col: ci };
        }
        for (const nt of cell.tables) {
          const nested = this.findCommentRowInTable(nt, id);
          if (nested) return { row: ri, col: ci }; // pai cobre a linha da nested
        }
      }
    }
    return null;
  }


  /** Comenta a seleção atual. Retorna o id (ou null sem seleção). */
  addComment(text: string, author = 'You'): number | null {
    if (!this.model || !this.hasSelection() || !text.trim() || this.locked()) return null;
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [], sections: [], footnotes: new Map(), endnotes: new Map(),
        comments: [], styles: new Map(), bookmarks: new Map(),
      };
    }
    this.snapshot();
    const id = this.fullDoc.comments.reduce((m, c) => Math.max(m, c.id), -1) + 1;
    applyRunProps(this.model, this.range(), { commentIds: [id] });
    this.fullDoc.comments.push({ id, author, text: text.trim() });
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-comments-changed'));
    return id;
  }

  removeComment(id: number): void {
    if (!this.fullDoc || !this.model) return;
    this.snapshot();
    this.fullDoc.comments = this.fullDoc.comments.filter((c) => c.id !== id);
    for (const p of this.model.paragraphs) {
      for (const run of p.runs) {
        if (run.props.commentIds) {
          run.props.commentIds = run.props.commentIds.filter((i) => i !== id);
          if (run.props.commentIds.length === 0) delete run.props.commentIds;
        }
      }
    }
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-comments-changed'));
  }

  /** Seleciona e rola até o intervalo do comentário. */
  goToComment(id: number): void {
    if (!this.model) return;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let acc = 0;
      for (const run of this.model.paragraphs[pi]!.runs) {
        if (run.props.commentIds?.includes(id)) {
          this.selection = {
            anchor: { para: pi, offset: acc },
            focus: { para: pi, offset: acc + run.text.length },
          };
          this.refresh();
          this.navigateTo(`#para:${pi}`);
          return;
        }
        acc += run.text.length;
      }
    }
  }

  selectAll(): void {
    if (!this.model) return;
    const lastP = this.model.paragraphs.length - 1;
    this.selection = {
      anchor: { para: 0, offset: 0 },
      focus: { para: lastP, offset: paraLength(this.model.paragraphs[lastP]!) },
    };
    this.refresh();
  }

  // imagens
  private bitmaps = new WeakMap<object, ImageBitmap | 'loading'>();
  private bitmapFor(
    img: { data: Uint8Array; ext: string; svg?: Uint8Array; widthTwips?: number; heightTwips?: number },
  ): ImageBitmap | null {
    const cached = this.bitmaps.get(img);
    if (cached === 'loading') return null;
    if (cached) return cached;
    this.bitmaps.set(img, 'loading');
    // Preferir a versão VETORIAL (asvg:svgBlip), como o Word: rasteriza o SVG
    // em alta resolução em vez de esticar o PNG de fallback (que pixeliza).
    if (img.svg) { this.rasterizeSvg(img); return null; }
    const copy = new Uint8Array(img.data);
    void createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === 'jpg' ? 'jpeg' : img.ext}` }))
      .then((bmp) => { this.bitmaps.set(img, bmp); this.paint(); })
      .catch(() => this.bitmaps.set(img, undefined as never));
    return null;
  }

  /** Rasteriza um SVG (asvg:svgBlip) num bitmap com supersampling, para o
   *  desenho ficar nítido no zoom/DPI do editor — como o vetor do Word. */
  private rasterizeSvg(img: { svg?: Uint8Array; widthTwips?: number; heightTwips?: number }): void {
    const text = new TextDecoder().decode(img.svg!);
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    const el = new Image();
    el.onload = () => {
      try {
        const SS = 3; // supersample
        const wPx = Math.min(4096, Math.max(1, Math.round((img.widthTwips ?? el.width) * PX_PER_TWIP * SS)));
        const hPx = Math.min(4096, Math.max(1, Math.round((img.heightTwips ?? el.height) * PX_PER_TWIP * SS)));
        const oc = document.createElement('canvas');
        oc.width = wPx; oc.height = hPx;
        const octx = oc.getContext('2d')!;
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(el, 0, 0, wPx, hPx);
        void createImageBitmap(oc)
          .then((bmp) => { this.bitmaps.set(img as object, bmp); this.paint(); })
          .catch(() => this.bitmaps.set(img as object, undefined as never));
      } catch { this.bitmaps.set(img as object, undefined as never); }
      URL.revokeObjectURL(url);
    };
    el.onerror = () => { this.bitmaps.set(img as object, undefined as never); URL.revokeObjectURL(url); };
    el.src = url;
  }

  /** Insere imagem no caret. Dimensões naturais a 96dpi, limitada à coluna. */
  async insertImage(data: Uint8Array, ext: string): Promise<void> {
    if (!this.model || this.locked()) return;
    const copy = new Uint8Array(data);
    const bmp = await createImageBitmap(
      new Blob([copy.buffer], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }),
    );
    let w = bmp.width * 15;  // px@96dpi → twips
    let h = bmp.height * 15;
    const maxW = this.contentWidthTwips();
    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para]!;
    // localiza o run no offset e divide manualmente para inserir o run de imagem
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const rs = acc;
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const imageRun = {
          text: '￼',
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          image: { data: copy, ext, widthTwips: w, heightTwips: h },
        };
        if (!run) {
          p.runs.push(imageRun);
        } else {
          const cut = offset - rs;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props } });
          parts.push(imageRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props } });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    this.selection = { anchor: { para, offset: offset + 1 }, focus: { para, offset: offset + 1 } };
    this.refresh();
  }

  /** Abre o seletor de arquivo para TROCAR a imagem flutuante selecionada
   *  (ex.: o logo do rodapé), mantendo posição/tamanho. */
  private promptReplaceImage(): void {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.display = 'none';
    inp.addEventListener('change', async () => {
      const file = inp.files?.[0];
      inp.remove();
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      await this.replaceSelectedImage(buf, ext);
    });
    document.body.appendChild(inp);
    inp.click();
  }

  /** Substitui os bytes da imagem selecionada, mantendo âncora/posição/tamanho.
   *  Sobrescreve a mídia referenciada no pacote e remove a versão vetorial
   *  (asvg:svgBlip) do XML cru, para o Word passar a exibir a nova imagem. */
  private async replaceSelectedImage(data: Uint8Array, ext: string): Promise<void> {
    const h = this.selectedFloat();
    if (!h || h.kind !== 'image') return;
    const img = h.obj as InlineImage;
    this.snapshot();
    const copy = new Uint8Array(data);
    const rid = /<a:blip[^>]*r:embed="([^"]+)"/.exec(img.rawDrawingXml ?? '')?.[1];
    if (rid && this.pkg) {
      const relsPath = this.hfEdit
        ? `word/_rels/${this.hfEdit.path.split('/').pop()}.rels`
        : 'word/_rels/document.xml.rels';
      const mediaPath = this.resolveMediaPath(rid, relsPath);
      if (mediaPath) this.pkg.setPart(mediaPath, copy);
    }
    if (img.rawDrawingXml) {
      // remove o svgBlip (senão o Word continua mostrando o vetor antigo)
      img.rawDrawingXml = img.rawDrawingXml.replace(
        /<a:extLst>[\s\S]*?<\/a:extLst>/g, (m) => (m.includes('svgBlip') ? '' : m));
    }
    img.data = copy;
    img.ext = ext;
    img.svg = undefined;
    this.bitmaps.delete(img as object);
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-change'));
  }

  /** Resolve rId → caminho da parte de mídia no pacote (via a parte .rels). */
  private resolveMediaPath(rid: string, relsPath: string): string | null {
    const rels = this.pkg?.getPartText(relsPath);
    if (!rels) return null;
    const m = new RegExp(`Id="${rid}"[^>]*?Target="([^"]+)"`).exec(rels);
    if (!m) return null;
    let target = m[1]!;
    if (/^https?:/i.test(target)) return null;
    target = target.replace(/^\.\//, '');
    if (!target.startsWith('word/')) target = `word/${target.replace(/^\/+/, '')}`;
    return target;
  }

  saveDocx(): Uint8Array {
    if (!this.model) throw new Error('no document');
    if (this.hfEdit) this.exitHeaderFooter(); // salva sempre a partir do corpo
    const pkg = this.pkg ?? DocxPackage.empty();
    // cabeçalhos/rodapés de TODAS as seções (refs únicas por path); a última
    // seção referencia no sectPr do body, as demais no pPr/sectPr (sectionBreak)
    const hfParts: HfPartInfo[] = [];
    const seenPath = new Set<string>();
    for (const section of this.fullDoc?.sections ?? []) {
      for (const [kind, refs, set] of [
        ['header', section.headerRefs, section.headers],
        ['footer', section.footerRefs, section.footers],
      ] as const) {
        for (const ref of refs) {
          if (seenPath.has(ref.path)) continue;
          const paragraphs = set[ref.type];
          if (!paragraphs) continue;
          seenPath.add(ref.path);
          hfParts.push({
            kind, type: ref.type, rid: ref.rid, path: ref.path,
            paragraphs, dirty: this.dirtyHf.has(ref.path),
          });
        }
      }
    }
    // refs do body = última seção (as outras vão nos sectionBreak dos parágrafos)
    const lastSec = this.fullDoc?.sections[this.fullDoc.sections.length - 1];
    const bodyParts = lastSec
      ? hfParts.filter((h) =>
          [...lastSec.headerRefs, ...lastSec.footerRefs].some((r) => r.path === h.path))
      : hfParts;

    // reconstrói o fluxo de blocos: parágrafos + tabelas ancoradas, na ordem
    const blocks: Block[] = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: 'paragraph', paragraph });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= this.model!.paragraphs.length) blocks.push(a.table);
    }

    // body sectPr = ÚLTIMA seção (paisagem do catálogo mora aqui)
    const saveModel: DocumentModel = lastSec
      ? { paragraphs: this.model.paragraphs, sectPr: lastSec.sectPr }
      : this.model;

    writeDocument(pkg, saveModel, hfParts, {
      comments: this.fullDoc?.comments?.length ? this.fullDoc.comments : undefined,
      bodySectRefs: bodyParts.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
      blocks: this.tableAnchors.length ? blocks : undefined,
    });
    return pkg.save();
  }

  /** Monta o documento de exportação a partir do estado VIVO do editor. */
  private buildExportDoc(title?: string, imageDataUris?: WeakMap<{ data: Uint8Array; ext: string }, string>): ExportDoc {
    return {
      title,
      paragraphs: this.model?.paragraphs.map((paragraph) => this.withPluginFallback(paragraph)) ?? [],
      tableAnchors: this.tableAnchors,
      comments: this.fullDoc?.comments ?? [],
      footnotes: this.fullDoc?.footnotes,
      endnotes: this.fullDoc?.endnotes,
      sectPr: this.model?.sectPr,
      imageDataUris,
    };
  }

  private withPluginFallback(paragraph: Paragraph): Paragraph {
    return {
      props: paragraph.props,
      runs: paragraph.runs.map((run) => run.custom ? {
        text: run.custom.fallbackText,
        props: run.props,
      } : run),
    };
  }

  /**
   * Pré-comprime as imagens do documento para inclusão em HTML/Markdown:
   * decode → downsample (lado max ~1200px) → JPEG quality 0.78 → data URI.
   * Imagens muito pequenas (≤ MAX_DIMENSION CSS px) ficam só re-encodadas
   * sem resize; PNGs minúsculos (< 32KB) ficam intactos. O resultado é um
   * WeakMap consumido pelos exportadores via `resolveImageUri`.
   *
   * Sem isso, fotos do .docx (PNGs grandes) gerariam data URIs gigantescos
   * (catálogo: 72MB) que muitos viewers de Markdown não renderizam.
   */
  private async compressImagesForExport(): Promise<WeakMap<{ data: Uint8Array; ext: string }, string>> {
    const MAX_DIM = 1200;
    const QUALITY = 0.78;
    const PASSTHROUGH_KB = 32;
    const cache = new WeakMap<{ data: Uint8Array; ext: string }, string>();
    const imgs = this.collectImages();
    const seen = new Set<{ data: Uint8Array; ext: string }>();
    const tasks = imgs.map(async (img) => {
      if (seen.has(img)) return;
      seen.add(img);
      // PNG muito pequeno: deixa como está (já é eficiente)
      if (img.data.byteLength <= PASSTHROUGH_KB * 1024) {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
        return;
      }
      try {
        const mime = this.mimeFor(img.ext);
        const blob = new Blob([img.data.slice().buffer as ArrayBuffer], { type: mime });
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // achata alpha em branco
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close?.();
        const dataUri: string = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (!b) { reject(new Error('toBlob retornou null')); return; }
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(b);
          }, 'image/jpeg', QUALITY);
        });
        cache.set(img, dataUri);
      } catch {
        // fallback: data URI sem compressão
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
      }
    });
    await Promise.all(tasks);
    return cache;
  }

  private mimeFor(ext: string): string {
    const e = ext.toLowerCase();
    if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
    if (e === 'png') return 'image/png';
    if (e === 'gif') return 'image/gif';
    if (e === 'bmp') return 'image/bmp';
    if (e === 'webp') return 'image/webp';
    return `image/${e}`;
  }

  private toBase64(bytes: Uint8Array): string {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /** Exporta HTML semântico e fluido (web-first; reflui, não pagina). */
  async exportHtml(title?: string, opts: { images?: 'data' | 'omit' } = {}): Promise<string> {
    const cache = opts.images === 'omit' ? undefined : await this.compressImagesForExport();
    return toHtml(this.buildExportDoc(title, cache), { title, images: opts.images });
  }

  /** Exporta Markdown (GitHub Flavored). */
  async exportMarkdown(title?: string, opts: { images?: 'data' | 'omit' } = {}): Promise<string> {
    const cache = opts.images === 'omit' ? undefined : await this.compressImagesForExport();
    return toMarkdown(this.buildExportDoc(title, cache), { title, images: opts.images });
  }

  /**
   * Exporta ODT (OpenDocument Text) p/ LibreOffice/OpenOffice. Reconstrói um
   * FullDocument leve a partir do estado VIVO do editor (model + tableAnchors)
   * — passa pelo writeOdt do @universal-office/odf.
   */
  exportOdt(opts: { images?: 'embed' | 'omit' } = {}): Uint8Array {
    if (!this.model) throw new Error('document not loaded');
    // remonta blocks na ordem (parágrafo / tabela), igual ao saveDocx
    const blocks: Block[] = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: 'paragraph', paragraph: this.withPluginFallback(paragraph) });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= this.model!.paragraphs.length) blocks.push(a.table);
    }
    const fd: FullDocument = {
      blocks,
      sections: [{
        sectPr: this.model.sectPr,
        blockStart: 0,
        blockEnd: blocks.length,
        headers: {}, footers: {}, headerRefs: [], footerRefs: [],
      }],
      footnotes: this.fullDoc?.footnotes ?? new Map(),
      endnotes: this.fullDoc?.endnotes ?? new Map(),
      comments: this.fullDoc?.comments ?? [],
      styles: this.fullDoc?.styles ?? new Map(),
      bookmarks: this.fullDoc?.bookmarks ?? new Map(),
    };
    return writeOdt(fd, { images: opts.images });
  }

  focusEditor(): void { this.input.focus({ preventScroll: true }); }

  /** True when a pointer event originated in the built-in top/bottom bars.
   *  They live inside the host shadow, so their events bubble up to the
   *  document-level pointer handlers — without this guard a click on a
   *  toolbar control would hit-test the canvas behind the (sticky) bar,
   *  collapse the selection, and steal focus (closing native dropdowns).
   *  composedPath() is required because the event target is retargeted to
   *  the host by the time it reaches these listeners. */
  private eventInChrome(e: Event): boolean {
    const path = e.composedPath();
    return path.includes(this.topbarEl) || path.includes(this.bottombarEl);
  }

  /** Página atualmente visível (centro do viewport), 1-based. */
  currentPage(): number {
    const center = this.scrollTop + (this.clientHeight || 900) / 2;
    let best = 0;
    let bestDist = Infinity;
    this.canvases.forEach((c, i) => {
      const mid = c.offsetTop + c.offsetHeight / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return Math.min(best + 1, this.pageCount); // no contínuo há tiles, mas 1 página lógica
  }

  /** Estatísticas para a barra de status (como a do app de referência). */
  stats(): { pages: number; words: number; chars: number; paragraph: number; page: number } {
    let words = 0, chars = 0;
    if (this.model) {
      for (const p of this.model.paragraphs) {
        const t = this.plainTextSlice(p, 0, paraLength(p));
        chars += t.length;
        words += (t.match(/\S+/g) ?? []).length;
      }
    }
    return {
      pages: this.pageCount,
      page: this.currentPage(),
      words,
      chars,
      paragraph: this.selection.focus.para + 1,
    };
  }

  /** Imprime: abre janela com as páginas como imagens (visão de impressão). */
  print(): void {
    const wasView = this.view;
    if (wasView !== 'print') this.setView('print');
    const imgs = this.canvases.map((c) => `<img src="${c.toDataURL('image/png')}" style="width:100%;page-break-after:always"/>`);
    if (wasView !== 'print') this.setView(wasView);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><title>Write — imprimir</title><body style="margin:0">${imgs.join('')}</body>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
  }

  // ───────────────────────── edição ─────────────────────────

  private currentProps(): RunProps {
    if (!this.model) return { ...DEFAULT_RUN_PROPS };
    return propsAt(this.model, this.selection.focus);
  }
  private hasSelection(): boolean {
    return comparePos(this.selection.anchor, this.selection.focus) !== 0;
  }
  private range(): DocRange {
    return { start: this.selection.anchor, end: this.selection.focus };
  }
  private formatRuns(patch: Partial<RunProps>): void {
    if (!this.model || this.locked()) return;
    if (this.hasSelection()) {
      this.snapshot();
      applyRunProps(this.model, this.range(), patch);
      this.refresh();
    } else {
      this.pendingProps = { ...(this.pendingProps ?? this.currentProps()), ...patch };
      this.onSelectionChange?.(); this.chromeSync?.();
    }
  }
  private formatPara(patch: Partial<ParaProps>): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    applyParaProps(this.model, this.range(), patch);
    this.refresh();
  }

  // imagens são imutáveis: o snapshot guarda só um índice no pool em vez
  // dos bytes (senão JSON.stringify estoura com docs de 50MB de mídia)
  private imgPool: Uint8Array[] = [];
  private imgPoolIdx = new WeakMap<Uint8Array, number>();

  private stringifyState(): string {
    return JSON.stringify({
      m: this.model,
      s: this.selection,
      // sectPrs das seções (margens/orientação) — fora do model, mas undoáveis
      sect: this.sectionStarts.map((ss) => ({ ...ss.section.sectPr })),
    }, (key, value) => {
      if (value instanceof Uint8Array) {
        let idx = this.imgPoolIdx.get(value);
        if (idx === undefined) {
          idx = this.imgPool.length;
          this.imgPool.push(value);
          this.imgPoolIdx.set(value, idx);
        }
        return { __imgPool: idx };
      }
      return value;
    });
  }
  private parseState(json: string): {
    m: DocumentModel;
    s: { anchor: DocPosition; focus: DocPosition };
    sect?: DocumentModel['sectPr'][];
  } {
    return JSON.parse(json, (key, value) =>
      value && typeof value === 'object' && '__imgPool' in value
        ? this.imgPool[(value as { __imgPool: number }).__imgPool]
        : value,
    );
  }

  /** Mudanças de campo (Atualizar Campos) não contam como edição p/ autosave. */
  private quietChange = false;

  private snapshot(): void {
    if (!this.model) return;
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.undoStack.push(this.stringifyState());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    if (!this.quietChange) {
      this.dispatchEvent(new CustomEvent('uw-change'));
    }
  }
  private popHistory(from: string[], to: string[]): void {
    if (!this.model || from.length === 0) return;
    this.floatSel = null; // o modelo é recriado → referência de run fica obsoleta
    to.push(this.stringifyState());
    const state = this.parseState(from.pop()!);
    this.model = state.m;
    this.selection = state.s;
    if (state.sect) {
      state.sect.forEach((sp, i) => {
        const target = this.sectionStarts[i]?.section.sectPr;
        if (target) Object.assign(target, sp);
      });
    }
    this.refresh();
  }

  /** deleteRange com ajuste de âncoras de tabela/seção. */
  private deleteSelection(): DocPosition {
    const { start, end } = normalizeRange(this.range());
    const delta = end.para - start.para;
    const pos = deleteRange(this.model!, this.range());
    if (delta > 0) this.shiftAnchors(start.para, -delta);
    return pos;
  }

  private type(text: string): void {
    if (!this.model || this.locked()) return;
    const before = new CustomEvent('uw-before-input', {
      cancelable: true,
      detail: { text },
    });
    if (!this.dispatchEvent(before)) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const props = this.pendingProps ?? undefined;
    const pos = insertText(this.model, this.selection.focus, text, props);
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent('uw-input', { detail: { text } }));
  }

  private pressEnter(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const at = this.selection.focus.para;
    const pos = splitParagraph(this.model, this.selection.focus);
    this.shiftAnchors(at, 1);
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }

  private pressBackspace(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      if (offset > 0) {
        const pos = deleteRange(this.model, {
          start: { para, offset: offset - 1 }, end: { para, offset },
        });
        this.selection = { anchor: pos, focus: pos };
      } else if (para > 0) {
        const pos = mergeWithPrevious(this.model, para);
        this.shiftAnchors(para - 1, -1);
        this.selection = { anchor: pos, focus: pos };
      } else { this.undoStack.pop(); return; }
    }
    this.refresh();
    this.scrollCaretIntoView();
  }

  private pressDelete(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      const len = paraLength(this.model.paragraphs[para]!);
      if (offset < len) {
        deleteRange(this.model, { start: { para, offset }, end: { para, offset: offset + 1 } });
      } else if (para < this.model.paragraphs.length - 1) {
        mergeWithPrevious(this.model, para + 1);
      } else { this.undoStack.pop(); return; }
    }
    this.refresh();
  }

  /** Próxima fronteira de palavra a partir do caret. */
  private moveWord(dir: 1 | -1, extend: boolean): void {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const text = paraText(this.model.paragraphs[para]!);
    if (dir === 1) {
      if (offset >= text.length) {
        if (para < this.model.paragraphs.length - 1) { para++; offset = 0; }
      } else {
        while (offset < text.length && /\S/.test(text[offset]!)) offset++;
        while (offset < text.length && /\s/.test(text[offset]!)) offset++;
      }
    } else {
      if (offset === 0) {
        if (para > 0) { para--; offset = paraLength(this.model.paragraphs[para]!); }
      } else {
        while (offset > 0 && /\s/.test(text[offset - 1]!)) offset--;
        while (offset > 0 && /\S/.test(text[offset - 1]!)) offset--;
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.refresh();
    this.scrollCaretIntoView();
  }

  private deleteWord(dir: 1 | -1): void {
    if (!this.model || this.locked()) return;
    if (!this.hasSelection()) {
      const before = { ...this.selection.focus };
      this.moveWord(dir, false);
      const after = { ...this.selection.focus };
      if (comparePos(before, after) === 0) return;
      this.selection = { anchor: before, focus: after };
    }
    this.snapshot();
    const pos = deleteRange(this.model, this.range());
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
  }

  private moveCaret(dir: 'left' | 'right' | 'up' | 'down' | 'home' | 'end', extend: boolean): void {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const len = (i: number) => paraLength(this.model!.paragraphs[i]!);
    if (dir === 'left') {
      if (offset > 0) offset--;
      else if (para > 0) { para--; offset = len(para); }
    } else if (dir === 'right') {
      if (offset < len(para)) offset++;
      else if (para < this.model.paragraphs.length - 1) { para++; offset = 0; }
    } else if (dir === 'home' || dir === 'end') {
      const line = this.lineOf({ para, offset });
      if (line) offset = dir === 'home' ? line.rich.start : line.rich.end;
    } else {
      const line = this.lineOf({ para, offset });
      if (line) {
        const x = this.caretX({ para, offset }, line);
        const all = this.allLines();
        const idx = all.indexOf(line);
        const target = all[idx + (dir === 'down' ? 1 : -1)];
        if (target) {
          const hit = this.hitLineX(target, x);
          para = target.para; offset = hit;
        }
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.pendingProps = null;
    this.refresh();
    this.scrollCaretIntoView();
  }

  // ───────────────────────── eventos ─────────────────────────

  private bindEvents(): void {
    // Ctrl+scroll = zoom (10%–500%), ancorado no ponto sob o mouse
    this.addEventListener('wheel', (e) => {
      // Modo Leitura: scroll avança/volta um BLOCO de páginas (1 por gesto)
      if (this.view === 'read' && !e.ctrlKey) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < 4 || this.readWheelLock) return;
        this.readWheelLock = true;
        setTimeout(() => { this.readWheelLock = false; }, 450);
        this.nudgeRead(e.deltaY > 0 ? 1 : -1);
        return;
      }
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.round(this.zoom * factor * 100) / 100;
      this.setZoom(next, e.clientY - this.getBoundingClientRect().top);
    }, { passive: false });

    // Modo Leitura: swipe (toque) e teclas navegam por par
    let touchY0 = 0, touchX0 = 0;
    this.addEventListener('touchstart', (e) => {
      if (this.view !== 'read') return;
      touchY0 = e.touches[0]!.clientY; touchX0 = e.touches[0]!.clientX;
    }, { passive: true });
    this.addEventListener('touchend', (e) => {
      if (this.view !== 'read') return;
      const dy = e.changedTouches[0]!.clientY - touchY0;
      const dx = e.changedTouches[0]!.clientX - touchX0;
      const horiz = Math.abs(dx) > Math.abs(dy);
      const d = horiz ? dx : dy;
      if (Math.abs(d) < 40) return;
      this.nudgeRead(d < 0 ? 1 : -1); // swipe ↑/← = próximo bloco
    }, { passive: true });
    this.addEventListener('keydown', (e) => {
      if (this.view !== 'read') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); this.nudgeRead(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); this.nudgeRead(-1);
      }
    });

    // virtualização: repinta páginas que entram no viewport
    this.addEventListener('scroll', () => {
      if (this.scrollPaintQueued) return;
      this.scrollPaintQueued = true;
      requestAnimationFrame(() => {
        this.scrollPaintQueued = false;
        this.ensureVisiblePainted();
      });
    });

    this.addEventListener('mousedown', (e) => {
      if (this.eventInChrome(e)) return;
      // objetos flutuantes + entrada em caixa de texto (CLIQUE ÚNICO):
      if (e.button === 0 && !this.protectedMode) {
        // 1) alça de redimensionamento do float ATIVO (imagem selecionada OU
        //    caixa em edição) — precede a saída da caixa, senão pegar a alça sairia.
        const hn = this.handleAt(e);
        if (hn) { this.focusEditor(); this.startFloatDrag(e, 'resize', hn); return; }
        // 2) clique DENTRO da caixa em edição → só reposiciona o caret (abaixo).
        if (!(this.tbEdit && this.pointInTbRect(e))) {
          if (this.tbEdit) this.exitTextbox(); // saiu da caixa atual
          // 3) clique numa caixa de texto → ENTRA na edição direto (1 clique). Não
          //    retorna: cai no hitTest p/ caret no ponto + seleção por arrasto.
          const tbHit = this.hitTextbox(e);
          if (tbHit) {
            this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          } else {
            // 4) clique numa IMAGEM → seleciona p/ mover/redimensionar.
            const fh = this.hitFloat(e);
            if (fh && fh.kind === 'image') {
              if (this.floatSel !== fh.run) { this.floatSel = fh.run; this.refresh(); }
              this.focusEditor();
              this.startFloatDrag(e, 'move', '');
              this.onSelectionChange?.(); this.chromeSync?.();
              return;
            }
            // 5) clique fora → desseleciona imagem.
            if (this.floatSel) { this.floatSel = null; this.refresh(); }
          }
        }
      }
      // modo HF: clicar na OUTRA região (header↔footer) troca o foco (ambos
      // ativos, como no Word), depois posiciona o caret no ponto clicado.
      if (e.button === 0 && this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
          const pos = this.hitTest(e);
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.focusEditor();
          this.refresh();
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
      }
      const hit = this.hitTest(e);
      if (!hit) return;
      // botão direito: posiciona o caret só se clicar FORA da seleção (como o
      // app de referência) e não inicia arrasto — o evento 'contextmenu' abre o menu depois.
      if (e.button !== 0) {
        if (!this.posInSelection(hit)) {
          this.selection = { anchor: hit, focus: hit };
          this.pendingProps = null;
          this.refresh();
        }
        this.focusEditor();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // Ctrl+click: hyperlink externo OU navegação interna (sumário/bookmark)
      if (e.ctrlKey && this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset <= end && run.props.link) {
            if (/^https?:/.test(run.props.link)) {
              window.open(run.props.link, '_blank', 'noopener');
              return;
            }
            if (this.navigateTo(run.props.link)) return;
          }
          acc = end;
        }
      }
      // clique em trecho comentado: avisa o painel de anotações
      if (this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset < end && run.props.commentIds?.length) {
            this.dispatchEvent(new CustomEvent('uw-comment-click', {
              detail: { ids: run.props.commentIds },
            }));
            break;
          }
          acc = end;
        }
      }
      this.focusEditor();
      e.preventDefault();
      const extend = e.shiftKey;
      this.selection = extend
        ? { anchor: this.selection.anchor, focus: hit }
        : { anchor: hit, focus: hit };
      this.pendingProps = null;
      this.refresh();
      const move = (ev: MouseEvent) => {
        const h = this.hitTest(ev);
        if (h) { this.selection.focus = h; this.refresh(); }
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        if (this.painterProps) this.applyPainter();
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);

      // triple-click: seleciona o parágrafo
      if (e.detail === 3 && this.model) {
        const len = paraLength(this.model.paragraphs[hit.para]!);
        this.selection = {
          anchor: { para: hit.para, offset: 0 },
          focus: { para: hit.para, offset: len },
        };
        this.refresh();
      }
    });

    this.input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const plain = this.plainPasteNext;
      this.plainPasteNext = false;
      if (!plain && this.richClip && this.richClip.text === text.replace(/\r\n?/g, '\n')) this.insertRich(this.richClip);
      else if (text) this.pasteText(text);
      this.onSelectionChange?.(); this.chromeSync?.();
    });

    // dica de descoberta: ao passar na margem (editável), muda cursor + avisa UI
    this.addEventListener('mousemove', (e) => {
      if (this.view !== 'print' || this.hfEdit || !this.model) return;
      const zone = this.hfZoneAt(e);
      const kind = zone?.kind ?? null;
      const wantHint = kind !== null && !this.protectedMode;
      this.style.cursor = wantHint ? 'pointer' : '';
      if (kind !== this.lastHoverHf) {
        this.lastHoverHf = kind;
        this.dispatchEvent(new CustomEvent('uw-hfhover', {
          detail: { kind: wantHint ? kind : null, x: e.clientX, y: e.clientY },
        }));
      }
    });
    this.addEventListener('mouseleave', () => {
      if (this.lastHoverHf !== null) {
        this.lastHoverHf = null;
        this.dispatchEvent(new CustomEvent('uw-hfhover', { detail: { kind: null } }));
      }
    });

    // cursor de manipulação de objeto flutuante (registrado DEPOIS do hover de HF
    // para vencer a definição de cursor quando há um objeto selecionado/sob o mouse).
    this.addEventListener('mousemove', (e) => {
      if (this.floatDrag || !this.model) return;
      // alça de redimensionamento (funciona também com a caixa em edição)
      const hn = this.handleAt(e);
      if (hn) { this.style.cursor = this.cursorForHandle(hn); return; }
      // corpo de uma imagem flutuante → mover (durante edição de texto não)
      const fh = this.tbEdit ? null : this.hitFloat(e);
      if (fh) { this.style.cursor = 'move'; return; }
      // sem objeto sob o mouse: se o cursor estava em modo objeto, limpa
      if (this.style.cursor === 'move' || this.style.cursor.endsWith('-resize')) this.style.cursor = '';
    });

    this.addEventListener('dblclick', (e) => {
      if (this.eventInChrome(e)) return;
      // modo HF: duplo-clique na OUTRA região troca o foco ANTES de tudo, p/ o
      // hitFloat/hitTextbox enxergarem a região recém-focada (ambos ativos).
      if (this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
        }
      }
      // duplo-clique numa IMAGEM flutuante (logo) → trocar a imagem, mantendo
      // posição/tamanho (como o Word: "Alterar Imagem").
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const fh = this.hitFloat(e);
        if (fh && fh.kind === 'image') {
          this.floatSel = fh.run;
          this.refresh();
          this.promptReplaceImage();
          return;
        }
      }
      // duplo-clique numa caixa de texto flutuante → edita seu conteúdo. Precede
      // a entrada de HF: uma caixa da capa na zona de margem edita a caixa (não
      // o cabeçalho). Caixas do HF só existem quando já estamos em hfEdit.
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const tbHit = this.hitTextbox(e);
        if (tbHit) {
          this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          const pos = this.hitTest(e); // layoutCache agora é o da caixa
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.refresh();
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
      }
      // editando uma caixa: duplo-clique FORA dela sai da caixa
      if (this.tbEdit && !this.pointInTbRect(e)) {
        this.exitTextbox();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // duplo-clique na zona de margem superior/inferior (modo print) entra
      // na edição de cabeçalho/rodapé, como no app de referência
      if (this.view === 'print' && !this.hfEdit && !this.tbEdit && this.model) {
        const zone = this.hfZoneAt(e);
        if (zone) {
          if (this.protectedMode) {
            // sem silêncio: avisa a UI p/ chamar atenção à barra amarela
            this.dispatchEvent(new CustomEvent('uw-blocked', { detail: { reason: 'protected' } }));
            return;
          }
          this.enterHeaderFooter(zone.kind, zone.page);
          return;
        }
      }
      // já editando HF: duplo-clique no CORPO (fora das regiões header/footer)
      // volta ao documento. Header E footer permanecem ativos; só o corpo sai.
      if (this.hfEdit && !this.hfRegionAtClick(e)) {
        this.exitHeaderFooter();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      const hit = this.hitTest(e);
      if (!hit || !this.model) return;
      const text = this.model.paragraphs[hit.para]!.runs.map((r) => r.text).join('');
      let a = hit.offset, b = hit.offset;
      while (a > 0 && !/[\s]/.test(text[a - 1]!)) a--;
      while (b < text.length && !/[\s]/.test(text[b]!)) b++;
      this.selection = { anchor: { para: hit.para, offset: a }, focus: { para: hit.para, offset: b } };
      this.refresh();
    });

    // IME: durante a composição não insere; no fim, insere o resultado.
    let composing = false;
    this.input.addEventListener('compositionstart', () => { composing = true; });
    this.input.addEventListener('compositionend', (e) => {
      composing = false;
      this.input.value = '';
      if (e.data) this.type(e.data);
    });
    this.input.addEventListener('input', () => {
      if (composing) return;
      const v = this.input.value;
      if (v) { this.type(v); this.input.value = ''; }
    });

    this.input.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (ctrl) {
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          e.preventDefault();
          this.moveWord(k === 'ArrowRight' ? 1 : -1, e.shiftKey);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
        if (k === 'Backspace' || k === 'Delete') {
          e.preventDefault();
          this.deleteWord(k === 'Delete' ? 1 : -1);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
        if (k.toLowerCase() === 'c') { e.preventDefault(); void this.copy(); return; }
        if (k.toLowerCase() === 'x') { e.preventDefault(); void this.cut(); return; }
        if (k.toLowerCase() === 'v') { this.plainPasteNext = e.shiftKey; return; } // Shift = colar sem formatação; evento paste cuida
        const map: Record<string, () => void> = {
          b: () => this.toggleRunProp('bold'),
          i: () => this.toggleRunProp('italic'),
          u: () => this.toggleRunProp('underline'),
          z: () => this.undo(),
          y: () => this.redo(),
          a: () => this.selectAll(),
          e: () => this.setAlignment('center'),
          l: () => this.setAlignment('left'),
          r: () => this.setAlignment('right'),
          j: () => this.setAlignment('both'),
        };
        const fn = map[k.toLowerCase()];
        if (fn) { e.preventDefault(); fn(); this.onSelectionChange?.(); this.chromeSync?.(); return; }
      }
      if (k === 'PageDown' || k === 'PageUp') {
        e.preventDefault();
        const step = this.clientHeight * 0.9 * (k === 'PageDown' ? 1 : -1);
        this.scrollTop += step;
        // move o caret ~uma tela de linhas
        for (let n = 0; n < 20; n++) this.moveCaret(k === 'PageDown' ? 'down' : 'up', e.shiftKey);
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (ctrl && (k === 'Home' || k === 'End')) {
        e.preventDefault();
        if (!this.model) return;
        const lastP = this.model.paragraphs.length - 1;
        const focus = k === 'Home'
          ? { para: 0, offset: 0 }
          : { para: lastP, offset: paraLength(this.model.paragraphs[lastP]!) };
        this.selection = e.shiftKey
          ? { anchor: this.selection.anchor, focus }
          : { anchor: focus, focus };
        this.refresh();
        this.scrollCaretIntoView();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (k === 'Tab') {
        e.preventDefault();
        const para = this.model?.paragraphs[this.selection.focus.para];
        // Tab no início de item de lista muda o nível (comportamento do app de referência)
        if (para?.props.numbering && this.selection.focus.offset === 0) {
          const lvl = Math.max(0, Math.min(2, para.props.numbering.ilvl + (e.shiftKey ? -1 : 1)));
          this.formatPara({
            numbering: { ...para.props.numbering, ilvl: lvl },
            indentLeftTwips: 720 * (lvl + 1),
          });
        } else if (!e.shiftKey) this.type('\t');
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // objeto flutuante selecionado: Esc desseleciona, Del remove, setas nudge
      if (this.floatSel && !this.tbEdit) {
        if (k === 'Escape') { e.preventDefault(); this.floatSel = null; this.refresh(); return; }
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.deleteSelectedFloat(); return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
          e.preventDefault();
          const h = this.selectedFloat();
          if (h) {
            this.snapshot();
            const step = e.shiftKey ? 15 : 90; // twips (~0.75pt / 4.5pt)
            const obj = h.obj;
            const ox = obj.offsetXTwips ?? 0, oy = obj.offsetYTwips ?? 0;
            if (k === 'ArrowLeft') obj.offsetXTwips = ox - step;
            else if (k === 'ArrowRight') obj.offsetXTwips = ox + step;
            else if (k === 'ArrowUp') obj.offsetYTwips = oy - step;
            else obj.offsetYTwips = oy + step;
            this.refresh();
            this.dispatchEvent(new CustomEvent('uw-change'));
          }
          return;
        }
      }
      if (k === 'Escape' && this.tbEdit) {
        e.preventDefault();
        this.exitTextbox(); // sai só da caixa; permanece no HF/corpo
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (k === 'Escape' && this.hfEdit) {
        e.preventDefault();
        this.exitHeaderFooter();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      const nav: Record<string, () => void> = {
        ArrowLeft: () => this.moveCaret('left', e.shiftKey),
        ArrowRight: () => this.moveCaret('right', e.shiftKey),
        ArrowUp: () => this.moveCaret('up', e.shiftKey),
        ArrowDown: () => this.moveCaret('down', e.shiftKey),
        Home: () => this.moveCaret('home', e.shiftKey),
        End: () => this.moveCaret('end', e.shiftKey),
        // Ctrl+Enter = quebra de página (como no app de referência)
        Enter: () => (ctrl ? this.type('\f') : this.pressEnter()),
        Backspace: () => this.pressBackspace(),
        Delete: () => this.pressDelete(),
      };
      const fn = nav[k];
      if (fn) { e.preventDefault(); fn(); this.onSelectionChange?.(); this.chromeSync?.(); }
    });
  }

  private startCaret(): void {
    window.clearInterval(this.caretTimer);
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.paint();
    }, 530);
  }

  // ───────────────────────── layout ─────────────────────────

  private sect() { return this.model!.sectPr; }

  private contentWidthTwips(): number {
    const s = this.sect();
    if (this.view === 'web') {
      // desconta as margens (600+600) p/ a PÁGINA inteira caber no viewport —
      // senão a margem direita (e os dividers) ficam fora da tela.
      return Math.max(2000, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }

  /** docDefaults do DOCUMENTO (fonte/tamanho/espaçamentos de quem não tem
   *  estilo). Sem documento carregado: defaults do nosso template. */
  private docDefaults(): { para: Partial<ParaProps>; run: Partial<RunProps> } {
    return this.fullDoc?.styles.get('docDefaults') ?? { para: {}, run: {} };
  }
  /** Há styles.xml? Então os defaults do WORD valem (after=0, line=240). */
  private hasDocStyles(): boolean {
    return (this.fullDoc?.styles.size ?? 0) > 0;
  }

  /** Estilos de PARÁGRAFO do documento (id + nome de exibição), para a lista
   *  de estilos da barra. Vazio se não há styles.xml (documento novo). */
  paragraphStyles(): { id: string; name: string }[] {
    const styles = this.fullDoc?.styles;
    if (!styles) return [];
    const out: { id: string; name: string }[] = [];
    styles.forEach((v, id) => {
      if (id === 'docDefaults') return;
      if (v.type && v.type !== 'paragraph') return;
      out.push({ id, name: v.name ?? id });
    });
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  private styleOf(p: Paragraph): StyleDef | undefined {
    if (!p.props.styleId) return undefined;
    // estilos REAIS do documento (styles.xml resolvido) têm prioridade;
    // a tabela embutida só vale para documentos novos
    const docStyle = this.fullDoc?.styles.get(p.props.styleId);
    if (docStyle) {
      return {
        sizePt: docStyle.run.szHalfPt !== undefined ? docStyle.run.szHalfPt / 2 : 11,
        bold: docStyle.run.bold ?? false,
        color: docStyle.run.color,
        spaceBeforeTwips: docStyle.para.spaceBeforeTwips ?? 0,
        italic: docStyle.run.italic ?? false,
        alignment: docStyle.para.alignment,
        spaceAfterTwips: docStyle.para.spaceAfterTwips,
        lineTwentieths: docStyle.para.lineTwentieths,
        fontAscii: docStyle.run.fontAscii,
        underline: docStyle.run.underline,
        strike: docStyle.run.strike,
        allCaps: docStyle.run.allCaps,
        smallCaps: docStyle.run.smallCaps,
        borders: docStyle.para.borders,
        shadingHex: docStyle.para.shadingHex,
        indentLeftTwips: docStyle.para.indentLeftTwips,
        indentRightTwips: docStyle.para.indentRightTwips,
      };
    }
    return STYLES[p.props.styleId];
  }

  /** Escala das minúsculas em small caps (versaletes). ~0.8 do tamanho, como o
   *  Word: a maiúscula reduzida fica um pouco menor que a maiúscula cheia. */
  private static readonly SMALL_CAPS_SCALE = 0.8;
  /** Quebra o texto de um run com small caps em spans por caixa: maiúsculas/
   *  símbolos em tamanho cheio; minúsculas → MAIÚSCULAS em ~0.8 do tamanho.
   *  Preserva o nº de caracteres (offset do caret) — se maiúscula mudar o
   *  comprimento (ex.: ß→SS), mantém o char original. */
  private smallCapsSpans(
    text: string, family: string | undefined, variant: FontVariant,
    size: number, ls: number | undefined, runIndex: number,
  ): StyledSpan[] {
    const isLower = (c: string): boolean => c.toLowerCase() === c && c.toUpperCase() !== c;
    const out: StyledSpan[] = [];
    let i = 0;
    while (i < text.length) {
      const lower = isLower(text[i]!);
      let j = i;
      while (j < text.length && isLower(text[j]!) === lower) j++;
      const seg = text.slice(i, j);
      let t = seg;
      let sz = size;
      if (lower) {
        const up = seg.toUpperCase();
        t = up.length === seg.length ? up : seg; // preserva offsets
        sz = size * UniversalWriteElement.SMALL_CAPS_SCALE;
      }
      out.push({ text: t, family, variant, sizePt: sz, letterSpacingTwips: ls, runIndex });
      i = j;
    }
    return out.length ? out : [{ text: '', family, variant, sizePt: size, runIndex }];
  }

  private buildSpans(p: Paragraph, opts?: { skipFloating?: boolean }): StyledSpan[] {
    const st = this.styleOf(p);
    const spans: StyledSpan[] = p.runs.flatMap((r, ri) => {
      const dd = this.docDefaults();
      const base = r.props.szHalfPt !== undefined
        ? r.props.szHalfPt / 2
        : st?.sizePt ?? (dd.run.szHalfPt !== undefined ? dd.run.szHalfPt / 2 : 11);
      const size = r.props.vertAlign ? base * 0.65 : base;
      const bold = r.props.bold || (st?.bold ?? false);
      const italic = r.props.italic || (st?.italic ?? false);
      const variant: FontVariant =
        bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
      const family = r.props.fontAscii ?? st?.fontAscii ?? dd.run.fontAscii;
      // caixas de texto ancoradas são pintadas à parte (paintHf), nunca no fluxo
      if (r.textbox) {
        return { text: '', family, variant, sizePt: size, runIndex: ri };
      }
      if (r.image) {
        // imagens flutuantes (âncoradas) não ocupam espaço no fluxo — são
        // desenhadas à parte (corpo: floatImages; HF: paintHf). Sem isto, um
        // timbrado de página inteira no cabeçalho inflaria a linha.
        if (opts?.skipFloating && r.image.floating) {
          return { text: '', family, variant, sizePt: size, runIndex: ri };
        }
        return {
          text: r.text || '￼',
          family,
          variant,
          sizePt: size,
          imageWidthTwips: r.image.widthTwips,
          imageHeightTwips: r.image.heightTwips,
          runIndex: ri,
        };
      }
      if (r.custom) {
        const font = this.fonts!.resolve(family, variant);
        const measureText = (text: string): number => {
          const chars = Array.from(text);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i]!.codePointAt(0)!;
            width += font.advanceTwips(cp, size);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== undefined) width += font.kernTwips(cp, next, size);
          }
          return width;
        };
        const renderer = this.inlineRenderers.get(r.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(r.custom.data) ?? r.custom.fallbackText;
        const measured = renderer?.measure?.({
          data: r.custom.data,
          fallbackText,
          props: r.props,
          sizePt: size,
          measureText,
        });
        return {
          text: '\uFFFC',
          family,
          variant,
          sizePt: size,
          imageWidthTwips: Math.max(1, measured?.widthTwips ?? measureText(fallbackText)),
          imageHeightTwips: measured?.heightTwips ?? size * TWIPS_PER_PT,
          runIndex: ri,
        };
      }
      const ls = r.props.charSpacingTwips;
      const allCaps = r.props.allCaps || st?.allCaps;
      const smallCaps = r.props.smallCaps || st?.smallCaps;
      // small caps: min\u00FAsculas viram VERSALETES (mai\u00FAsculas menores). Como um span
      // tem UM tamanho, quebramos o run em spans por caixa (min\u00FAsc. reduzidas).
      if (smallCaps && !allCaps) {
        return this.smallCapsSpans(r.text, family, variant, size, ls, ri);
      }
      const text = (allCaps || smallCaps) ? r.text.toUpperCase() : r.text;
      return { text, family, variant, sizePt: size, letterSpacingTwips: ls, runIndex: ri };
    });
    if (spans.length === 0) spans.push({ text: '', variant: 'regular', sizePt: st?.sizePt ?? 11 });
    return spans;
  }

  /** Seção vigente para o parágrafo pi. */
  private sectionIndexForPara(pi: number): number {
    let idx = 0;
    for (let i = 0; i < this.sectionStarts.length; i++) {
      if (pi >= this.sectionStarts[i]!.startPara) idx = i;
    }
    return idx;
  }
  sectPrAt(sectionIdx: number) {
    const s = this.sectionStarts[sectionIdx]?.section.sectPr;
    return s ?? this.model!.sectPr;
  }

  /** Layout do modo de edição de HF: PRESERVA a paginação do corpo (mesmo
   *  nº de páginas/panes) e posiciona o HF apenas na banda da página ativa. */
  private layoutHfEdit(): void {
    const sb = this.savedBody!;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const marginL = sp.marginLeftTwips;
    const contentW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
    // posiciona o HF ativo IGUAL ao render normal: cabeçalho a headerDistance do
    // topo; rodapé ancorado pela BASE (a footerDistance da borda inferior).
    const topY = this.hfEdit!.kind === 'header'
      ? (sp.headerDistanceTwips ?? 720)
      : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720)
          - this.measureHfHeight(this.model!.paragraphs, contentW);
    this.hfRegionTopTwips = topY;
    const font = this.fonts!.resolve(undefined, 'regular');
    let y = topY;
    this.model!.paragraphs.forEach((p, pi) => {
      // skipFloating: imagens flutuantes NÃO viram span inline aqui (senão o
      // paintLine as desenha inline ALÉM do drawHfFloats → logo duplicado).
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: contentW,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: contentW / 2, align: 'center' as const },
          { posTwips: contentW, align: 'right' as const },
        ],
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const span of spans) { spanCharStart.push(acc); acc += span.text.length; }
      const laid: LaidLine[] = [];
      lines.forEach((rich) => {
        // MESMA matemática de linha/baseline do paintHf (visão normal), senão o
        // conteúdo do HF "pula" ao entrar/sair da edição.
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        let x = marginL;
        let justifyExtra = 0;
        const align = p.props.alignment;
        if (align === 'center') x += (contentW - rich.widthTwips) / 2;
        else if (align === 'right') x += contentW - rich.widthTwips;
        laid.push({
          para: pi, rich, page: this.hfActivePage, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + lh * 0.8, justifyExtraPerSpace: justifyExtra,
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
    this.hfRegionHeightTwips = Math.max(y - topY, 240);
  }

  /** Layout do conteúdo INTERNO de uma caixa de texto em edição: posiciona os
   *  parágrafos no retângulo ancorado da caixa, preservando a paginação salva.
   *  Espelha a matemática de linha do paintHf p/ o conteúdo não "pular". */
  private layoutTextboxEdit(): void {
    const tb = this.tbEdit!;
    const sb = this.savedForTb!;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    // margens internas: o texto recua (lIns/tIns) como no render, p/ a edição
    // bater com o que se vê fora dela.
    const box = tb.hostRun.textbox;
    const ins = box ? this.tbInsets(box) : { l: 0, t: 0, r: 0, b: 0 };
    const originX = tb.rectTwips.x + ins.l;
    const width = Math.max(tb.rectTwips.w - ins.l - ins.r, 240);
    const font = this.fonts!.resolve(undefined, 'regular');
    let y = tb.rectTwips.y + ins.t;
    this.model!.paragraphs.forEach((p, pi) => {
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: width,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: width / 2, align: 'center' as const },
          { posTwips: width, align: 'right' as const },
        ],
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const span of spans) { spanCharStart.push(acc); acc += span.text.length; }
      const laid: LaidLine[] = [];
      lines.forEach((rich) => {
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        let x = originX;
        const align = p.props.alignment;
        if (align === 'center') x += (width - rich.widthTwips) / 2;
        else if (align === 'right') x += width - rich.widthTwips;
        laid.push({
          para: pi, rich, page: tb.pageIdx, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + lh * 0.8, justifyExtraPerSpace: 0,
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
  }

  /** start da numeração do documento (1ª seção). Padrão 1 (Word). */
  private docPgNumStart(): number {
    return this.fullDoc?.sections[0]?.sectPr.pgNumStart
      ?? this.sectionStarts[0]?.section.sectPr.pgNumStart
      ?? this.savedBody?.sectionStarts[0]?.section.sectPr.pgNumStart
      ?? 1;
  }
  /** Valor do campo NUMPAGES respeitando o start: total = número da ÚLTIMA
   *  página = start + (páginas − 1). Para docs normais (start=1) = pageCount;
   *  com capa start=0, a capa não conta (ex.: 2 folhas → "1"). */
  private numPagesFor(): number {
    return Math.max(1, this.pageCount + this.docPgNumStart() - 1);
  }
  /** Número de página do campo PAGE em Word: pgNumType/@start (padrão 1) +
   *  deslocamento da página DENTRO da sua seção. Respeita start=0 (capa = 0). */
  private pageNumberFor(pageIdx: number): number {
    const ps = this.pageSections;
    const sIdx = ps[pageIdx] ?? 0;
    let firstPage = pageIdx;
    for (let i = 0; i <= pageIdx; i++) { if ((ps[i] ?? 0) === sIdx) { firstPage = i; break; } }
    const sp = this.savedBody
      ? (this.savedBody.sectionStarts[sIdx]?.section.sectPr ?? this.sect())
      : (this.sectionStarts.length ? this.sectPrAt(sIdx) : this.sect());
    const start = sp.pgNumStart ?? 1;
    return start + (pageIdx - firstPage);
  }

  /** Parágrafos do header/footer que valem na página pg (first se capa+titlePg,
   *  senão default). Vindos do fullDoc — a parte FOCADA é o mesmo array de
   *  this.model, então reflete edições ao vivo. */
  private hfPartParas(kind: 'header' | 'footer', pg: number): Paragraph[] | undefined {
    const fd = this.fullDoc;
    if (!fd) return undefined;
    const ps = this.savedBody?.pageSections ?? this.pageSections;
    const sIdx = ps[pg] ?? 0;
    const section = this.savedBody?.sectionStarts[sIdx]?.section ?? fd.sections[sIdx] ?? fd.sections[0];
    if (!section) return undefined;
    const sp = this.sectPrForSavedPage(pg);
    const set = kind === 'header' ? section.headers : section.footers;
    // titlePg: a 1ª página usa SÓ a parte 'first' (vazia se ausente → sem HF na
    // capa, como o Word). Sem titlePg, a 1ª página usa a default.
    const part = (pg === 0 && sp.titlePg) ? set.first : set.default;
    return part?.length ? part : undefined;
  }

  /** topo (twips) da região do HF: header a headerDistance; footer ancorado pela
   *  base (footerDistance + altura do conteúdo). */
  private hfTopY(kind: 'header' | 'footer', paras: Paragraph[], sp: SectPr, colW: number): number {
    return kind === 'header'
      ? (sp.headerDistanceTwips ?? 720)
      : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(paras, colW);
  }

  /** Composição da edição de HF: imagem behindDoc ATRÁS, corpo esmaecido, header
   *  E footer em foco (o ativo destacado), como o modo "Header & Footer" do Word.
   *  Corrige (a) conteúdo sumindo sob a capa e (b) header/footer ativos juntos. */
  private paintHfEditCompose(
    ctxs: (CanvasRenderingContext2D | null)[], scales: number[], dpr: number,
  ): void {
    if (!this.hfEdit || this.tbEdit) return;
    const inkBright = this.pageDark ? '#1f1f1f' : '#1f1f1f';
    const inkDim = this.pageDark ? '#9aa0a6' : '#666';
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg]!;
      const sp = this.sectPrForSavedPage(pg);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      const isActivePage = pg === this.hfActivePage;
      const headerParas = this.hfPartParas('header', pg);
      const footerParas = this.hfPartParas('footer', pg);
      const kinds: ('header' | 'footer')[] = ['header', 'footer'];

      // 1) camada behindDoc (capa full-bleed) de AMBOS os HF — em foco, ao fundo.
      for (const kind of kinds) {
        const paras = kind === 'header' ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, inkBright, sp, 'behind');
      }
      // 2) corpo esmaecido por cima do behindDoc (snapshot transparente).
      const snap = this.hfBodySnapshots[pg];
      if ((snap?.width ?? 0) > 1) {
        ctx.save(); ctx.globalAlpha = HF_DIM_ALPHA; ctx.drawImage(snap!, 0, 0); ctx.restore();
      }
      // 3) conteúdo FRONT dos HF: página ativa em foco; demais esmaecidas.
      for (const kind of kinds) {
        const paras = kind === 'header' ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        const isFocused = isActivePage && kind === this.hfEdit.kind;
        // a região FOCADA tem o texto pintado pelo laço principal (layoutCache);
        // aqui só os flutuantes FRONT dela, p/ não duplicar o texto.
        if (isFocused) {
          this.model!.paragraphs.forEach((p, pi) => {
            const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? topY;
            this.drawHfFloats(ctx, scale, p.runs, sp.marginLeftTwips, paraTop, colW, pg, inkBright, sp, 'front');
          });
        } else {
          ctx.save();
          if (!isActivePage) ctx.globalAlpha = HF_DIM_ALPHA;
          this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, isActivePage ? inkBright : inkDim, sp, 'front');
          ctx.restore();
        }
      }
      // 4) bandas + linhas separadoras (a região ATIVA destacada).
      if (isActivePage) this.paintHfBands(ctx, scale, sp, dpr);
    }
  }

  /** Bandas realçadas de header e footer na página ativa + linhas separadoras no
   *  limite com o corpo (base da margem sup. / topo da margem inf.), como o Word. */
  private paintHfBands(
    ctx: CanvasRenderingContext2D, scale: number, sp: SectPr, dpr: number,
  ): void {
    const activeKind = this.hfEdit!.kind;
    const drawBand = (kind: 'header' | 'footer') => {
      const lineY = kind === 'header' ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
      const bandTop = kind === 'header' ? 0 : lineY;
      const bandBot = kind === 'header' ? lineY : sp.pageHeightTwips;
      const active = kind === activeKind;
      ctx.save();
      ctx.fillStyle = active
        ? (this.pageDark ? 'rgba(80,130,200,0.16)' : 'rgba(43,87,154,0.09)')
        : (this.pageDark ? 'rgba(120,120,120,0.10)' : 'rgba(120,120,120,0.06)');
      ctx.fillRect(0, bandTop * scale, (sp.pageWidthTwips) * scale, (bandBot - bandTop) * scale);
      ctx.strokeStyle = active ? (this.pageDark ? '#5b8def' : '#2b579a') : (this.pageDark ? '#777' : '#9aa0a6');
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(sp.marginLeftTwips * scale, lineY * scale);
      ctx.lineTo((sp.pageWidthTwips - sp.marginRightTwips) * scale, lineY * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `600 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = active ? (this.pageDark ? '#9bc0ff' : '#2b579a') : (this.pageDark ? '#9aa0a6' : '#9aa0a6');
      const label = kind === 'header' ? 'Header' : 'Footer';
      const ly = (kind === 'header' ? lineY - 60 : lineY + 190) * scale;
      ctx.fillText(label, sp.marginLeftTwips * scale, ly);
      ctx.restore();
    };
    drawBand('header');
    drawBand('footer');
  }

  /** sectPr da página i segundo a estrutura SALVA do corpo (modo HF edit). */
  private sectPrForSavedPage(pageIdx: number) {
    const sb = this.savedBody;
    const sIdx = sb?.pageSections[pageIdx] ?? 0;
    return sb?.sectionStarts[sIdx]?.section.sectPr ?? this.sect();
  }

  private layout(): void {
    if (!this.model || !this.fonts) return;
    // edição de caixa de texto: precede o HF (a caixa pode morar no HF)
    if (this.tbEdit && this.view === 'print' && this.savedForTb) {
      this.layoutTextboxEdit();
      return;
    }
    // edição de HF: caminho dedicado que mantém a paginação do corpo
    if (this.hfEdit && this.view === 'print' && this.savedBody) {
      this.layoutHfEdit();
      return;
    }
    // Leitura também é PAGINADA (páginas reais), só que exibida em "spread" 2-up.
    const isPaged = this.view === 'print' || this.view === 'read';

    // geometria mutável: muda quando a seção muda (modo paginado)
    let sectIdx = 0;
    let s = isPaged && this.sectionStarts.length ? this.sectPrAt(0) : this.sect();
    let contentW = this.contentWidthForSect(s);
    let marginL = isPaged ? s.marginLeftTwips : 600;
    let marginT = isPaged ? s.marginTopTwips : 600;
    let contentBottom = s.pageHeightTwips - s.marginBottomTwips;
    // colunas (w:cols): largura/índice da coluna corrente. O texto preenche a
    // coluna até contentBottom e então passa para a próxima coluna da MESMA
    // página; esgotadas as colunas, vai para a próxima página.
    let nCols = 1, colSpace = 0, colW = contentW;
    let col = 0;
    const applyColGeom = () => {
      nCols = isPaged && s.cols ? Math.max(1, s.cols.count) : 1;
      colSpace = s.cols?.spaceTwips ?? 0;
      colW = nCols > 1 ? (contentW - colSpace * (nCols - 1)) / nCols : contentW;
    };
    applyColGeom();
    const colX = () => marginL + col * (colW + colSpace);
    // O app de referência, em seção de colunas terminada por quebra nextPage (caso do
    // catálogo), NÃO balanceia: enche a coluna 1 até o fim da página e só então
    // passa para a 2. (Balanceamento só ocorre em quebra contínua.)

    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.pageSections = [0];
    let pendingDropCap: {
      text: string; sizePt: number; bold: boolean; italic: boolean;
      color?: string; widthTwips: number;
    } | null = null;
    let page = 0;
    let y = marginT;
    // Modo contínuo (Web/Rascunho): o documento inteiro num ÚNICO canvas estoura
    // o limite de ~16k px do browser → o buffer é reduzido (upscale) → borrado.
    // Quebramos em "tiles" de altura limitada, em limites de linha, reusando a
    // máquina de múltiplas páginas (page = tile, yTwips relativo ao tile).
    const CONT_TILE_PX = 4000;
    const tileTwips = isPaged ? Infinity : CONT_TILE_PX / (PX_PER_TWIP * this.zoom);
    const tileBottoms: number[] = [];
    const contTileBreak = (need: number): void => {
      if (!isPaged && y > (page === 0 ? marginT : 0) && y + need > tileTwips) {
        page++;
        y = 0;
      }
    };
    const listCounters: number[] = [0, 0, 0];
    let prevWasList = false;
    const ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
    // altura reservada na base da página para notas de rodapé cujas referências
    // caem nesta página (como no app de referência, a nota empurra o corpo para cima/próxima
    // página). Espelha o cálculo de paint()/exportPdf: hits*260 + 120 (separador).
    const FN_LINE = 260, FN_SEP = 120;
    let fnReserved = 0;
    let pageHadNotes = false;

    const newPage = () => {
      page++;
      y = marginT;
      col = 0;
      this.pageSections[page] = sectIdx;
      fnReserved = 0;
      pageHadNotes = false;
    };
    // fim da coluna: avança p/ a próxima coluna da mesma página, ou nova página
    const breakColumn = () => {
      if (col < nCols - 1) { col++; y = marginT; }
      else newPage();
    };

    this.model.paragraphs.forEach((p, pi) => {
      // troca de seção (modo print): nova página com nova geometria
      if (isPaged && this.sectionStarts.length > 0) {
        const si = this.sectionIndexForPara(pi);
        if (si !== sectIdx) {
          sectIdx = si;
          s = this.sectPrAt(si);
          contentW = this.contentWidthForSect(s);
          marginL = s.marginLeftTwips;
          marginT = s.marginTopTwips;
          contentBottom = s.pageHeightTwips - s.marginBottomTwips;
          applyColGeom();
          newPage();
        }
      }

      // tabelas ancoradas antes deste parágrafo
      for (const anchor of this.tableAnchors) {
        if (anchor.beforePara !== pi) continue;
        const tl = this.layoutTable(anchor.table, marginL, contentW);
        if (isPaged && y + tl.heightTwips > contentBottom && tl.heightTwips < contentBottom - marginT) {
          newPage();
        }
        contTileBreak(tl.heightTwips);
        tl.page = page;
        tl.yTwips = y;
        this.tableLayouts.push(tl);
        y += tl.heightTwips + 160;
        tileBottoms[page] = y;
      }

      const st = this.styleOf(p);
      const outlineIndent = this.view === 'outline' ? (st ? 0 : 720) : 0;
      const indent = (p.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0) + outlineIndent;
      const indentRight = p.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
      const firstDelta = p.props.indentFirstLineTwips ?? 0; // >0 firstLine, <0 hanging
      const avail = Math.max(500, colW - indent - indentRight);
      const availFirst = Math.max(500, avail - firstDelta);
      // parágrafo de campo TOC vazio: invisível (o sumário gerado vem depois)
      if (p.props.tocInstr && p.runs.every((r) => r.text.trim() === '')) {
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      // drop cap: NÃO entra no fluxo — vira float sobre o próximo parágrafo
      if (p.props.dropCap && p.runs.length > 0) {
        const run = p.runs[0]!;
        const sizePt = (run.props.szHalfPt ?? 22) / 2;
        const letterFont = this.fonts!.resolve(run.props.fontAscii, run.props.bold ? 'bold' : 'regular');
        pendingDropCap = {
          text: run.text,
          sizePt,
          bold: run.props.bold,
          italic: run.props.italic,
          color: run.props.color,
          widthTwips: [...run.text].reduce((w, ch) => w + letterFont.advanceTwips(ch.codePointAt(0)!, sizePt), 0),
        };
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      const dropCap = pendingDropCap;
      pendingDropCap = null;
      const dropIndent = dropCap ? dropCap.widthTwips + 120 : 0;

      // skipFloating: imagens flutuantes do corpo NÃO entram no fluxo (são
      // desenhadas pelo loop floatImages); senão viram span inline TAMBÉM e o
      // objeto aparece DUPLICADO (ex.: logo da capa).
      const spans = this.buildSpans(p, { skipFloating: true });
      const lineRulePre = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? 259,
        lineRule: 'auto' as const,
      };
      const pitchPre = Math.round(
        lineHeightPt(this.fonts!.resolve(undefined, 'regular'), spans[0]?.sizePt ?? 11, lineRulePre) * TWIPS_PER_PT / 2.4,
      ) * 2.4;
      const dropK = dropCap
        ? Math.max(2, Math.round((deviceEmPt(dropCap.sizePt) * TWIPS_PER_PT) / pitchPre))
        : 0;

      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: avail,
        firstLineAvailableTwips: availFirst,
        tabOriginOffsetTwips: indent,
        firstLineTabOriginOffsetTwips: indent + firstDelta,
        tabStops: p.props.tabStops,
        indentFirstKLines: dropCap ? { k: dropK, indentTwips: dropIndent } : undefined,
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const sp of spans) { spanCharStart.push(acc); acc += sp.text.length; }

      // numeração (multinível: contadores por ilvl, níveis fundos resetam)
      let marker: string | undefined;
      if (p.props.numbering) {
        const lvl = Math.min(p.props.numbering.ilvl, 2);
        if (!prevWasList) listCounters.fill(0);
        if (p.props.numbering.kind === 'decimal') {
          listCounters[lvl] = (listCounters[lvl] ?? 0) + 1;
          for (let d = lvl + 1; d < 3; d++) listCounters[d] = 0;
          const n = listCounters[lvl]!;
          marker = lvl === 0 ? `${n}.` : lvl === 1 ? `${ALPHA[(n - 1) % 26]}.` : `${ROMANS[(n - 1) % 10]}.`;
        } else {
          marker = ['•', 'o', '▪'][lvl];
        }
        prevWasList = true;
      } else { prevWasList = false; listCounters.fill(0); }

      // fallbacks: props diretas → estilo → docDefaults do DOCUMENTO →
      // (com styles.xml: defaults do app de referência after=0/line=240; sem: nosso template)
      const dd = this.docDefaults();
      const hasStyles = this.hasDocStyles();
      const lineRule = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? dd.para.lineTwentieths ?? (hasStyles ? 240 : 259),
        lineRule: 'auto' as const,
      };
      // o app de referência posiciona linhas na grade de 1/600" (2.4tw) — quantizamos
      // pitch e espaçamentos para não acumular fração (visto no style-oracle)
      const qDev = (tw: number) => Math.round(tw / 2.4) * 2.4;
      const spaceBefore = qDev(p.props.spaceBeforeTwips ?? st?.spaceBeforeTwips ?? dd.para.spaceBeforeTwips ?? 0);
      const spaceAfter = qDev(p.props.spaceAfterTwips ?? st?.spaceAfterTwips ?? dd.para.spaceAfterTwips ?? (hasStyles ? 0 : 160));
      // w:pageBreakBefore: força página nova antes do parágrafo
      if (isPaged && p.props.pageBreakBefore && y > marginT) newPage();
      y += spaceBefore;

      // notas de rodapé referenciadas neste parágrafo (reservam área na base)
      let noteCount = 0;
      if (this.fullDoc) for (const r of p.runs) if (r.noteRef?.kind === 'footnote') noteCount++;

      const laid: LaidLine[] = [];
      lines.forEach((rich, li) => {
        const font = this.fonts!.resolve(undefined, 'regular');
        const sizeForHeight = Math.max(rich.maxSizePt, 1);
        const descTwips = (Math.abs(font.metrics.descender) / font.metrics.unitsPerEm) *
          deviceEmPt(sizeForHeight) * TWIPS_PER_PT;
        // linha cresce para conter imagens (ascent efetivo = maxAscTwips);
        // pitch e ascent na grade de 1/600" como o app de referência — medindo os Tm do PDF
        // do app de referência, o pitch do corpo Calibri 11 é 13,44pt = qDev(269,53tw)=268,8tw,
        // exatamente o que este snap produz (validado contra o PDF do app de referência).
        const lh = qDev(Math.max(
          lineHeightPt(font, sizeForHeight, lineRule) * TWIPS_PER_PT,
          rich.maxAscTwips + descTwips,
        ));
        const asc = qDev(Math.max(
          (font.metrics.ascender / font.metrics.unitsPerEm) *
            deviceEmPt(sizeForHeight) * TWIPS_PER_PT,
          rich.maxAscTwips,
        ));
        // reserva a área das notas deste parágrafo na página onde sua 1ª linha cai
        if (li === 0 && noteCount > 0) {
          fnReserved += noteCount * FN_LINE + (pageHadNotes ? 0 : FN_SEP);
          pageHadNotes = true;
        }
        contTileBreak(lh);
        if (isPaged && y + lh > contentBottom - fnReserved) {
          breakColumn(); // avança coluna OU nova página (reseta col/y)
          const onNewPage = col === 0;
          // o parágrafo (e suas notas) migra inteiro: re-reserva só em página nova
          if (onNewPage && li === 0 && noteCount > 0) {
            fnReserved = noteCount * FN_LINE + FN_SEP;
            pageHadNotes = true;
          }
          // órfãs/viúvas só em coluna única (mover linhas entre colunas exigiria
          // recomputar o x de cada uma — ganho não compensa a complexidade)
          if (nCols === 1) {
            // controle de órfãs (padrão do app de referência): não deixar a 1ª linha sozinha
            if (li === 1 && laid.length === 1) {
              const first = laid[0]!;
              const delta = y - first.yTwips;
              first.page = page;
              first.yTwips += delta;
              first.baselineTwips += delta;
              y += first.heightTwips;
            }
            // controle de viúvas: última linha não fica sozinha
            else if (li === lines.length - 1 && laid.length >= 2) {
              const prev = laid[laid.length - 1]!;
              if (prev.page !== page) {
                const delta = y - prev.yTwips;
                prev.page = page;
                prev.yTwips += delta;
                prev.baselineTwips += delta;
                y += prev.heightTwips;
              }
            }
          }
        }

        const inDropZone = dropCap !== null && li < dropK;
        const lineIndentX = indent + (li === 0 ? firstDelta : 0) + (inDropZone ? dropIndent : 0);
        const lineAvail = (li === 0 ? availFirst : avail) - (inDropZone ? dropIndent : 0);
        let x = colX() + lineIndentX;
        // registra o float da capitular na 1ª linha do parágrafo
        if (dropCap && li === 0) {
          this.dropCapFloats.push({
            ...dropCap,
            page,
            xTwips: colX() + indent,
            yTopTwips: y,
            kPitch: pitchPre * dropK,
          });
        }
        let justifyExtra = 0;
        const align = p.props.alignment ?? st?.alignment;
        if (align === 'center') x += (lineAvail - rich.widthTwips) / 2;
        else if (align === 'right') x += lineAvail - rich.widthTwips;
        else if (align === 'both' && li < lines.length - 1) {
          const text = spans.map((sp) => sp.text).join('').slice(rich.start, rich.end).trimEnd();
          const spaces = (text.match(/ /g) ?? []).length;
          if (spaces > 0) justifyExtra = (lineAvail - rich.widthTwips) / spaces;
        }
        laid.push({
          para: pi, rich, page, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + asc,
          marker: li === 0 && marker !== undefined
            ? { text: marker, xTwips: colX() + indent - 360, sizePt: 11 }
            : undefined,
          justifyExtraPerSpace: justifyExtra,
        });
        y += lh;
        if (!isPaged) tileBottoms[page] = y;
        // quebra de página manual (w:br type="page" → \f) encerra a página
        const fullText = spans.map((sp) => sp.text).join('');
        if (isPaged && rich.end > 0 && fullText[rich.end - 1] === '\f') {
          newPage();
        }
      });
      y += spaceAfter;
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });

    // tabelas ancoradas após o último parágrafo
    for (const anchor of this.tableAnchors) {
      if (anchor.beforePara < this.model.paragraphs.length) continue;
      const tl = this.layoutTable(anchor.table, marginL, contentW);
      if (isPaged && y + tl.heightTwips > contentBottom) newPage();
      tl.page = page;
      tl.yTwips = y;
      this.tableLayouts.push(tl);
      y += tl.heightTwips + 160;
    }

    // notas de rodapé: em quais páginas caem as referências
    this.footnoteHits = [];
    if (this.fullDoc) {
      this.layoutCache.forEach((pl, pi) => {
        const para = this.model!.paragraphs[pi]!;
        for (const run of para.runs) {
          if (run.noteRef?.kind === 'footnote') {
            const pg = pl.lines[0]?.page ?? 0;
            this.footnoteHits.push({ page: pg, id: run.noteRef.id });
          }
        }
      });
    }

    this.pageCount = isPaged ? page + 1 : 1; // contínuo = 1 página lógica (tiles à parte)
    if (!isPaged) {
      this.continuousHeight = y + 600;
      tileBottoms[page] = y; // garante o último tile
      // último tile ganha um respiro embaixo (como o padding do modo contínuo)
      this.tileHeights = tileBottoms.map((b, i) => (b ?? 0) + (i === page ? 600 : 0));
    } else {
      this.tileHeights = [];
    }
  }

  /** Substitui PAGE/NUMPAGES no texto de header/footer. */
  private substField(text: string, pageIdx: number): string {
    return text
      .replace(/\bNUMPAGES\b/g, String(this.numPagesFor()))
      .replace(/\bPAGE\b/g, String(this.pageNumberFor(pageIdx)));
  }

  /** Renderiza cabeçalho/rodapé com layout real: runs formatados, alinhamento
   *  do parágrafo, tabs centro/direita (default do app de referência) e campos por página. */
  /** Altura total (twips) do conteúdo fluído de um cabeçalho/rodapé — usada
   *  para ancorar o rodapé pela BASE (o Word coloca o rodapé com a base a
   *  footerDistance da borda inferior, não o topo). */
  /** margens internas (twips) da caixa; padrão do Word se ausentes. */
  private tbInsets(tb: DrawingTextbox): { l: number; t: number; r: number; b: number } {
    return tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  }
  /** Origem/largura do TEXTO dentro da caixa: recuado pelas margens internas
   *  (lIns/tIns/rIns) como o Word — o texto começa em (x+lIns, y+tIns) e quebra
   *  em (w−lIns−rIns). Usado em todo lugar que pinta os parágrafos da caixa. */
  private tbInner(tb: DrawingTextbox, x: number, y: number, w: number): { x: number; y: number; w: number } {
    const ins = this.tbInsets(tb);
    return { x: x + ins.l, y: y + ins.t, w: Math.max(w - ins.l - ins.r, 120) };
  }
  /** Altura EFETIVA da caixa de texto: se spAutoFit, ajusta ao conteúdo (o cy
   *  declarado é ignorado pelo Word); senão usa a altura declarada. Assim o alvo
   *  de seleção/edição respeita o tamanho real da caixa. */
  private effectiveTbHeight(tb: DrawingTextbox): number {
    if (!tb.autoFit) return tb.heightTwips || 240;
    const ins = this.tbInsets(tb);
    // mede na MESMA largura em que o texto é renderizado (drawHfFloats usa a
    // largura declarada da caixa) + as margens verticais internas.
    const cw = Math.max(tb.widthTwips || 240, 240);
    return Math.max(this.measureHfHeight(tb.paras, cw) + ins.t + ins.b, 240);
  }
  private measureHfHeight(paras: Paragraph[], widthTwips: number): number {
    if (!this.fonts) return 0;
    const font = this.fonts.resolve(undefined, 'regular');
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    let h = 0;
    for (const p of paras) {
      const spans = this.buildSpans({ runs: p.runs, props: p.props }, { skipFloating: true });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        h += lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
      }
    }
    return h;
  }

  /** Posição page-absolute (twips) de um objeto flutuante âncorado, respeitando
   *  wp:positionH/V relativeFrom. originX = margem esquerda; paraTop = topo do
   *  parágrafo âncora (banda do HF); sp = geometria da seção. */
  private anchoredPos(
    a: { relH?: string; relV?: string; offsetXTwips?: number; offsetYTwips?: number },
    originXTwips: number, paraTopTwips: number,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number },
  ): { x: number; y: number } {
    const ox = a.offsetXTwips ?? 0;
    const oy = a.offsetYTwips ?? 0;
    const x = a.relH === 'page' ? ox : originXTwips + ox;
    let y: number;
    if (a.relV === 'page') y = oy;
    else if (a.relV === 'margin' || a.relV === 'topMargin') y = sp.marginTopTwips + oy;
    else if (a.relV === 'bottomMargin') y = sp.pageHeightTwips - sp.marginBottomTwips + oy;
    else y = paraTopTwips + oy; // paragraph | line | text | (default)
    return { x, y };
  }

  /** Desenha os objetos FLUTUANTES (caixas de texto / imagens ancoradas) dos
   *  runs de um parágrafo de HF, na posição ancorada. Usado tanto no render
   *  normal (paintHf) quanto na EDIÇÃO de HF (senão os flutuantes somem). */
  private drawHfFloats(
    ctx: CanvasRenderingContext2D, scale: number, runs: Run[],
    originXTwips: number, paraTopTwips: number, widthTwips: number,
    pageIdx: number, color: string,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number; pageWidthTwips: number },
    floatMode: 'all' | 'behind' | 'front' = 'all',
  ): void {
    // "fundo" = behindDoc OU flutuante full-bleed (capa) — que se sobrepõe ao
    // corpo e por isso deve ficar ATRÁS dele mesmo na edição (comportamento do
    // Word: o conteúdo da página não some sob a imagem).
    const pageArea = sp.pageWidthTwips * sp.pageHeightTwips;
    const isBg = (o: { behindDoc?: boolean; widthTwips: number; heightTwips: number }): boolean =>
      !!o.behindDoc || (pageArea > 0 && o.widthTwips * o.heightTwips >= 0.4 * pageArea);
    for (const r of runs) {
      const obj = r.textbox ?? r.image;
      if (!obj) continue;
      if (r === this.tbSnapshotSuppress) continue; // suprime a caixa em edição no snapshot
      if (floatMode === 'behind' && !isBg(obj)) continue;
      if (floatMode === 'front' && isBg(obj)) continue;
      if (r.textbox) {
        const tb = r.textbox;
        const { x: tx, y: ty } = tb.floating
          ? this.anchoredPos(tb, originXTwips, paraTopTwips, sp)
          : { x: originXTwips, y: paraTopTwips };
        { const iw = this.tbInner(tb, tx, ty, tb.widthTwips || widthTwips);
          this.paintHf(ctx, scale, tb.paras, iw.x, iw.y, iw.w, pageIdx, color, sp); }
        continue;
      }
      const bmp = this.bitmapFor(r.image!);
      if (!bmp) continue;
      const img = r.image!;
      const { x: ix, y: iy } = img.floating
        ? this.anchoredPos(img, originXTwips, paraTopTwips, sp)
        : { x: originXTwips, y: paraTopTwips };
      ctx.drawImage(bmp, ix * scale, iy * scale, img.widthTwips * scale, img.heightTwips * scale);
    }
  }

  /** Família CSS a usar no canvas: a fonte EMBEDADA/instalada real (ex.: "Lato",
   *  "Lato Black") se houver FontFace; senão cai no padrão (bundled) e, havendo
   *  host com fontes do SO, pede a família para a próxima pintura. */
  private familyFor(family: string | undefined): string {
    if (family) {
      if (this.loadedFamilyNames.has(family)) return family;
      this.queueHostFont(family); // ex.: "Aptos Display" mesmo com "Aptos" carregada
      const base = family.split(' ')[0]!;
      if (this.loadedFamilyNames.has(base)) return base;
    }
    return DEFAULT_FONT; // fallback (open, sempre carregada)
  }

  private paintHf(
    ctx: CanvasRenderingContext2D,
    scale: number,
    paras: Paragraph[],
    originXTwips: number,
    topYTwips: number,
    widthTwips: number,
    pageIdx: number,
    color: string,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number; pageWidthTwips: number },
    floatMode: 'all' | 'behind' | 'front' = 'all',
  ): void {
    if (!this.fonts) return;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    // traço de borda (espelha paintLine) — cabeçalhos/rodapés também têm pBdr
    const stroke = (
      e: { sizeEighthPt: number; color?: string; style: string; spacePt: number } | undefined,
      ax: number, ay: number, bx: number, by: number,
    ): void => {
      if (!e) return;
      ctx.strokeStyle = this.inkColor(e.color);
      ctx.lineWidth = Math.max(1, (e.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
      if (e.style === 'dashed') ctx.setLineDash([8, 5]);
      else if (e.style === 'dotted') ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    let y = topYTwips;
    for (const p of paras) {
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r,
      );
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      // cor herdada do ESTILO do parágrafo (ex.: "Título" = branco na capa) —
      // usada quando o run não tem cor direta, antes do default passado.
      const stColor = this.styleOf(p)?.color;
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      // imagens e caixas de texto flutuantes do HF (timbrado), no offset ancorado
      this.drawHfFloats(ctx, scale, runs, originXTwips, y, widthTwips, pageIdx, color, sp, floatMode);
      const font = this.fonts.resolve(undefined, 'regular');
      const fallback = p.props.boxBorder && !p.props.borders
        ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
        : undefined;
      const bd = p.props.borders ?? (fallback
        ? { top: fallback, bottom: fallback, left: fallback, right: fallback }
        : undefined);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!;
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        // sombreado do parágrafo (atrás do texto)
        if (p.props.shadingHex) {
          ctx.fillStyle = this.inkColor(p.props.shadingHex);
          ctx.fillRect(originXTwips * scale, y * scale, widthTwips * scale, lh * scale);
        }
        let x = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') x += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') x += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex]!;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom
            ? this.inlineRenderers.get(run.custom.type)?.renderer
            : undefined;
          const txt = run?.custom
            ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
            : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          const fam = this.familyFor(span.family);
          const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
          const v = span.variant;
          ctx.font = `${v === 'italic' || v === 'boldItalic' ? 'italic ' : ''}` +
            `${v === 'bold' || v === 'boldItalic' ? '700' : '400'} ${fontPx}px ${fam}`;
          const runColor = run?.props.color ?? stColor;
          ctx.fillStyle = runColor ? this.inkColor(runColor) : color;
          ctx.fillText(txt, (x + seg.xTwips) * scale, baseline * scale);
        }
        // bordas do parágrafo (topo na 1ª linha, base na última; laterais sempre)
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * TWIPS_PER_PT;
          const spR = (bd.right?.spacePt ?? 0) * TWIPS_PER_PT;
          const spT = (bd.top?.spacePt ?? 0) * TWIPS_PER_PT;
          const spB = (bd.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
          const x0 = (originXTwips - spL) * scale;
          const x1 = (originXTwips + widthTwips + spR) * scale;
          const y0 = (y - (isFirst ? spT : 0)) * scale;
          const y1 = (y + lh + (isLast ? spB : 0)) * scale;
          stroke(bd.left, x0, y0, x0, y1);
          stroke(bd.right, x1, y0, x1, y1);
          if (isFirst) stroke(bd.top, x0, y0, x1, y0);
          if (isLast) stroke(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }

  private contentWidthForSect(s: { pageWidthTwips: number; marginLeftTwips: number; marginRightTwips: number }): number {
    if (this.view === 'web') {
      return Math.max(2000, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }

  /** Layout de tabela: colunas do tblGrid, linhas com altura do conteúdo. */
  private layoutTable(table: TableBlock, xTwips: number, availW: number): TableLayout {
    const PAD = 108; // margem interna padrão da célula (w:tblCellMar)
    const font = this.fonts!.resolve(undefined, 'regular');
    let cols = table.gridColsTwips.length ? [...table.gridColsTwips] : [availW];
    const total = cols.reduce((a, b) => a + b, 0);
    if (total > availW) cols = cols.map((c) => (c * availW) / total);
    const colXs = [0];
    for (const c of cols) colXs.push(colXs[colXs.length - 1]! + c);

    const tl: TableLayout = {
      table, page: 0, xTwips, yTwips: 0, heightTwips: 0,
      colXs, rowYs: [0], cellLines: [], cellShades: [], cellRects: [],
    };

    let yAcc = 0;
    const nRows = table.rows.length;
    table.rows.forEach((row, ri) => {
      let rowH = 240; // mínimo
      let col = 0;
      const pending: typeof tl.cellLines = [];
      for (const cell of row.cells) {
        const x0 = colXs[Math.min(col, colXs.length - 1)]!;
        const x1 = colXs[Math.min(col + cell.gridSpan, colXs.length - 1)]!;
        const cellW = Math.max(300, x1 - x0 - PAD * 2);
        let cy = PAD;
        const paras = [
          ...cell.paragraphs,
          ...cell.tables.flatMap((nt) => nt.rows.flatMap((r) => r.cells.flatMap((c) => c.paragraphs))),
        ];
        for (const p of paras) {
          const st = this.styleOf(p);
          const spans = this.buildSpans(p);
          const spanCharStart: number[] = [];
          let accSp = 0;
          for (const sp of spans) { spanCharStart.push(accSp); accSp += sp.text.length; }
          const { lines } = breakRich(spans, this.fonts!, { availableTwips: cellW });
          const align = p.props.alignment ?? st?.alignment;
          for (const line of lines) {
            const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
            const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
            // alinhamento horizontal dentro da célula
            let startX = x0 + PAD;
            if (align === 'center') startX += (cellW - line.widthTwips) / 2;
            else if (align === 'right') startX += cellW - line.widthTwips;
            const baseY = cy + lh * 0.8;
            // um cellLine por SEGMENTO (run) — formatação rica por run
            for (const seg of line.segments) {
              const span = spans[seg.spanIndex]!;
              const run = p.runs[span.runIndex ?? seg.spanIndex];
              const renderer = run?.custom
                ? this.inlineRenderers.get(run.custom.type)?.renderer
                : undefined;
              const txt = run?.custom
                ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
                : span.text.slice(seg.start, seg.end);
              if (!txt) continue;
              pending.push({
                row: ri, col,
                xTwips: startX + seg.xTwips,
                yTwips: baseY,
                text: txt,
                sizePt: span.sizePt,
                bold: span.variant === 'bold' || span.variant === 'boldItalic',
                italic: span.variant === 'italic' || span.variant === 'boldItalic',
                color: run?.props.color ?? st?.color,
                family: this.familyFor(span.family),
                underline: run?.props.underline,
                strike: run?.props.strike,
              });
            }
            cy += lh;
          }
        }
        rowH = Math.max(rowH, cy + PAD);
        if (cell.shadingHex) {
          tl.cellShades.push({ xTwips: x0, yTwips: yAcc, wTwips: x1 - x0, hTwips: 0, hex: cell.shadingHex });
        }
        // bordas resolvidas: tcBorders > tblBorders (outer nas pontas, inside no meio)
        const tb = table.borders;
        const isFirstRow = ri === 0;
        const isLastRow = ri === nRows - 1;
        const isFirstCol = col === 0;
        const isLastCol = col + cell.gridSpan >= cols.length;
        tl.cellRects.push({
          x0, y0: yAcc, x1, y1: -1,
          edges: {
            top: cell.borders?.top ?? (isFirstRow ? tb?.top : tb?.insideH),
            bottom: cell.borders?.bottom ?? (isLastRow ? tb?.bottom : tb?.insideH),
            left: cell.borders?.left ?? (isFirstCol ? tb?.left : tb?.insideV),
            right: cell.borders?.right ?? (isLastCol ? tb?.right : tb?.insideV),
          },
        });
        col += cell.gridSpan;
      }
      for (const sh of tl.cellShades) if (sh.yTwips === yAcc && sh.hTwips === 0) sh.hTwips = rowH;
      for (const cr of tl.cellRects) if (cr.y1 === -1) cr.y1 = yAcc + rowH;
      for (const cl of pending) tl.cellLines.push({ ...cl, yTwips: cl.yTwips + yAcc });
      yAcc += rowH;
      tl.rowYs.push(yAcc);
    });
    tl.heightTwips = yAcc;
    return tl;
  }
  private continuousHeight = 0;
  /** Altura (twips) de cada tile no modo contínuo (Web/Rascunho). */
  private tileHeights: number[] = [];
  private dropCapFloats: {
    text: string; sizePt: number; bold: boolean; italic: boolean; color?: string;
    widthTwips: number; page: number; xTwips: number; yTopTwips: number; kPitch: number;
  }[] = [];
  /** topo (twips) da banda do HF em edição — usado p/ desenhar o rótulo/borda. */
  private hfRegionTopTwips = 0;
  /** altura (twips) do conteúdo do HF em edição — p/ dimensionar a banda. */
  private hfRegionHeightTwips = 0;
  /** Ao capturar o snapshot de fundo (entrar em edição de HF): renderiza os HF
   *  CHEIOS, mas suprime o HF ATIVO (que será pintado por cima, em foco). Assim
   *  o fundo esmaecido contém corpo + o OUTRO HF (como o Word). Null fora disso. */
  private hfSnapshotActive: 'header' | 'footer' | null = null;
  /** Capturando o snapshot de CORPO da edição HF: suprime AMBOS header e footer
   *  (eles são repintados na composição) e usa fundo TRANSPARENTE, para o corpo
   *  compor por cima da imagem behindDoc (capa) sem veladura branca. */
  private hfCapturing = false;
  /** última zona de HF sob o mouse (p/ não repetir o evento de hover). */
  private lastHoverHf: 'header' | 'footer' | null = null;

  /** Em qual zona de HF (margem sup/inf) e PÁGINA o mouse caiu, se alguma. */
  private hfZoneAt(e: MouseEvent): { kind: 'header' | 'footer'; page: number } | null {
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg]!.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const yT = (e.clientY - rect.top) / scale;
      const sp = this.sectionStarts.length
        ? this.sectPrAt(this.pageSections[pg] ?? 0)
        : this.sect();
      if (yT < sp.marginTopTwips) return { kind: 'header', page: pg };
      if (yT > sp.pageHeightTwips - sp.marginBottomTwips) return { kind: 'footer', page: pg };
      return null;
    }
    return null;
  }
  /** true se o ponteiro está dentro da faixa ativa (header/footer) da página em edição. */
  private hfClickInActiveBand(e: MouseEvent): boolean {
    if (!this.hfEdit) return false;
    const cv = this.canvases[Math.min(this.hfActivePage, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    if (e.clientX < rect.left || e.clientX > rect.right) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const yT = (e.clientY - rect.top) / scale;
    // mesma geometria da banda pintada (ver paint): header = margem superior;
    // footer = margem inferior; limite no corpo.
    const isHeader = this.hfEdit.kind === 'header';
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const lineY = isHeader ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
    const bandTop = isHeader ? 0 : lineY;
    const bandBot = isHeader ? lineY : sp.pageHeightTwips;
    return yT >= bandTop && yT <= bandBot;
  }
  /** Região de HF (header/footer) sob o clique, ou null (corpo). Usado no modo
   *  HF p/ trocar o foco entre header e footer (ambos ativos, como no Word). */
  private hfRegionAtClick(e: MouseEvent): { kind: 'header' | 'footer'; page: number } | null {
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const cv = this.canvases[pg];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const yT = (e.clientY - rect.top) / scale;
      const sp = this.sectPrForSavedPage(pg);
      if (yT <= sp.marginTopTwips) return { kind: 'header', page: pg };
      if (yT >= sp.pageHeightTwips - sp.marginBottomTwips) return { kind: 'footer', page: pg };
      return null;
    }
    return null;
  }
  /** Troca o foco de edição entre header e footer (ou de página) sem sair do
   *  modo HF. As edições da parte anterior persistem (mesmas refs no fullDoc). */
  private switchHfFocus(kind: 'header' | 'footer', page: number): void {
    if (!this.hfEdit) return;
    if (this.hfEdit.kind === kind && this.hfActivePage === page) return;
    this.exitHeaderFooter();
    this.enterHeaderFooter(kind, page);
  }
  /** Geometria das colunas numa página + quais têm conteúdo (p/ o separador). */
  private colContentOnPage(pg: number, sp: SectPr): {
    n: number; gap: number; origin: (c: number) => number; hasContent: boolean[]; maxBottom: number;
  } | null {
    if (!sp.cols || sp.cols.count < 2) return null;
    const n = sp.cols.count, gap = sp.cols.spaceTwips;
    const cw = (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips - gap * (n - 1)) / n;
    const origin = (c: number): number => sp.marginLeftTwips + c * (cw + gap);
    const hasContent = new Array(n).fill(false);
    let maxBottom = sp.marginTopTwips;
    for (const pl of this.layoutCache) for (const ln of pl.lines) {
      if (ln.page !== pg) continue;
      maxBottom = Math.max(maxBottom, ln.yTwips + ln.heightTwips);
      let best = 0;
      for (let c = 1; c < n; c++) {
        if (Math.abs(ln.xTwips - origin(c)) < Math.abs(ln.xTwips - origin(best))) best = c;
      }
      hasContent[best] = true;
    }
    maxBottom = Math.min(maxBottom, sp.pageHeightTwips - sp.marginBottomTwips);
    return { n, gap, origin, hasContent, maxBottom };
  }

  /** snapshot do corpo (por página) p/ mostrar esmaecido durante a edição de HF. */
  private hfBodySnapshots: HTMLCanvasElement[] = [];

  private allLines(): LaidLine[] {
    return this.layoutCache.flatMap((p) => p.lines);
  }
  private lineOf(pos: DocPosition): LaidLine | null {
    const pl = this.layoutCache[pos.para];
    if (!pl) return null;
    for (const l of pl.lines) {
      if (pos.offset >= l.rich.start && pos.offset <= l.rich.end) {
        if (pos.offset === l.rich.end && l !== pl.lines[pl.lines.length - 1]) continue;
        return l;
      }
    }
    return pl.lines[pl.lines.length - 1] ?? null;
  }
  private caretX(pos: DocPosition, line: LaidLine): number {
    const pl = this.layoutCache[pos.para]!;
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join('');
    for (let i = line.rich.start; i < pos.offset && i < pl.charAdvances.length; i++) {
      x += pl.charAdvances[i]!;
      if (line.justifyExtraPerSpace && text[i] === ' ') x += line.justifyExtraPerSpace;
    }
    return x;
  }
  private hitLineX(line: LaidLine, xTwips: number): number {
    const pl = this.layoutCache[line.para]!;
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join('');
    for (let i = line.rich.start; i < line.rich.end; i++) {
      let a = pl.charAdvances[i]!;
      if (line.justifyExtraPerSpace && text[i] === ' ') a += line.justifyExtraPerSpace;
      if (xTwips < x + a / 2) return i;
      x += a;
    }
    return line.rich.end;
  }

  /** Localiza uma caixa de texto flutuante sob o ponteiro (corpo OU HF ativo).
   *  Retorna o run que a carrega, seu retângulo ancorado (twips) e a página. */
  private hitTextbox(
    e: MouseEvent,
  ): { hostRun: Run; rect: { x: number; y: number; w: number; h: number }; page: number } | null {
    if (!this.model) return null;
    const inHf = !!this.hfEdit;
    const scale = PX_PER_TWIP * this.zoom;
    const paras = this.model.paragraphs;
    for (let pi = 0; pi < paras.length; pi++) {
      for (const r of paras[pi]!.runs) {
        if (!r.textbox) continue;
        const tb = r.textbox;
        let page: number, sp: SectPr, originX: number, paraTop: number;
        if (inHf) {
          page = this.hfActivePage;
          sp = this.sectPrForSavedPage(page);
          originX = sp.marginLeftTwips;
          paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        } else {
          const first = this.layoutCache[pi]?.lines[0];
          if (!first) continue;
          page = first.page;
          sp = this.sectPrAt(this.pageSections[page] ?? 0);
          originX = sp.marginLeftTwips;
          paraTop = first.yTwips;
        }
        const { x, y } = tb.floating
          ? this.anchoredPos(tb, originX, paraTop, sp)
          : { x: originX, y: paraTop };
        const w = tb.widthTwips || (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips);
        const h = this.effectiveTbHeight(tb);
        const cv = this.canvases[page];
        if (!cv) continue;
        const rect = cv.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        if (e.clientX < rect.left || e.clientX > rect.right) continue;
        const xT = (e.clientX - rect.left) / scale;
        const yT = (e.clientY - rect.top) / scale;
        if (xT >= x && xT <= x + w && yT >= y && yT <= y + h) {
          return { hostRun: r, rect: { x, y, w, h }, page };
        }
      }
    }
    return null;
  }
  /** true se o ponteiro está dentro da caixa em edição (com pequena tolerância). */
  private pointInTbRect(e: MouseEvent): boolean {
    if (!this.tbEdit) return false;
    const cv = this.canvases[Math.min(this.tbEdit.pageIdx, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const xT = (e.clientX - rect.left) / scale;
    const yT = (e.clientY - rect.top) / scale;
    const r = this.tbEdit.rectTwips;
    const tol = 30; // twips
    return xT >= r.x - tol && xT <= r.x + r.w + tol && yT >= r.y - tol && yT <= r.y + r.h + tol;
  }

  // ─────────── objetos flutuantes: enumeração / hit-test / handles ───────────
  private static readonly FLOAT_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

  /** Todos os objetos flutuantes visíveis no contexto atual (corpo OU HF ativo),
   *  com o retângulo EXATAMENTE como são pintados. Vazio durante edição de texto
   *  de caixa (tbEdit). */
  private enumFloats(): FloatHandle[] {
    if (this.tbEdit || !this.model) return [];
    const out: FloatHandle[] = [];
    if (this.hfEdit) {
      const sp = this.sectPrForSavedPage(this.hfActivePage);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      this.model.paragraphs.forEach((p, pi) => {
        const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        for (const r of p.runs) {
          const obj = (r.textbox ?? r.image) as InlineImage | DrawingTextbox | undefined;
          if (!obj) continue;
          const { x, y } = obj.floating
            ? this.anchoredPos(obj, sp.marginLeftTwips, paraTop, sp)
            : { x: sp.marginLeftTwips, y: paraTop };
          out.push({
            run: r, obj, kind: r.textbox ? 'textbox' : 'image', page: this.hfActivePage,
            rect: { x, y, w: obj.widthTwips || colW, h: r.textbox ? this.effectiveTbHeight(r.textbox) : (obj.heightTwips || 240) },
          });
        }
      });
      return out;
    }
    // corpo: imagens flutuantes (floatImages) + caixas de texto dos parágrafos
    for (const f of this.floatImages) {
      const first = this.layoutCache[f.para]?.lines[0];
      if (!first || !f.run.image) continue;
      const img = f.run.image;
      out.push({
        run: f.run, obj: img, kind: 'image', page: first.page,
        rect: {
          x: first.xTwips + (img.offsetXTwips ?? 0),
          y: first.yTwips + (img.offsetYTwips ?? 0),
          w: img.widthTwips, h: img.heightTwips,
        },
      });
    }
    this.model.paragraphs.forEach((p, pi) => {
      const first = this.layoutCache[pi]?.lines[0];
      if (!first) return;
      const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      for (const r of p.runs) {
        if (!r.textbox) continue;
        const { x, y } = r.textbox.floating
          ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
          : { x: sp.marginLeftTwips, y: first.yTwips };
        out.push({
          run: r, obj: r.textbox, kind: 'textbox', page: first.page,
          rect: { x, y, w: r.textbox.widthTwips || colW, h: this.effectiveTbHeight(r.textbox) },
        });
      }
    });
    return out;
  }

  /** Handle atual do objeto selecionado (retângulo vivo, recomputado). */
  private selectedFloat(): FloatHandle | null {
    if (!this.floatSel) return null;
    return this.enumFloats().find((h) => h.run === this.floatSel) ?? null;
  }
  /** Float ATIVO para handles/resize: a caixa em EDIÇÃO (tbEdit) OU a imagem
   *  selecionada (floatSel). Assim o redimensionamento coexiste com a edição. */
  private activeFloat(): FloatHandle | null {
    if (this.tbEdit) {
      const tb = this.tbEdit.hostRun.textbox;
      if (!tb) return null;
      return {
        run: this.tbEdit.hostRun, obj: tb, kind: 'textbox',
        page: this.tbEdit.pageIdx, rect: { ...this.tbEdit.rectTwips },
      };
    }
    return this.selectedFloat();
  }

  /** Objeto flutuante sob o ponteiro (o de cima = último pintado = mais à frente). */
  private hitFloat(e: MouseEvent): FloatHandle | null {
    const scale = PX_PER_TWIP * this.zoom;
    let best: FloatHandle | null = null;
    for (const h of this.enumFloats()) {
      const cv = this.canvases[h.page];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      // fundos full-bleed / capa (área ≥ 55% da página) são click-through, como
      // o comportamento behindDoc do Word — não os agarra para seleção.
      const pageW = rect.width / scale, pageH = rect.height / scale;
      if (h.rect.w * h.rect.h >= 0.55 * pageW * pageH) continue;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      if (xT >= h.rect.x && xT <= h.rect.x + h.rect.w && yT >= h.rect.y && yT <= h.rect.y + h.rect.h) {
        best = h; // continua p/ pegar o ÚLTIMO (mais à frente)
      }
    }
    return best;
  }

  /** Centro (client px) de cada handle do objeto selecionado. */
  private handleCenters(h: FloatHandle): Record<string, { cx: number; cy: number }> | null {
    const cv = this.canvases[h.page];
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const scale = PX_PER_TWIP * this.zoom;
    const left = rect.left + h.rect.x * scale;
    const top = rect.top + h.rect.y * scale;
    const right = left + h.rect.w * scale;
    const bottom = top + h.rect.h * scale;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return {
      nw: { cx: left, cy: top }, n: { cx: midX, cy: top }, ne: { cx: right, cy: top },
      e: { cx: right, cy: midY }, se: { cx: right, cy: bottom }, s: { cx: midX, cy: bottom },
      sw: { cx: left, cy: bottom }, w: { cx: left, cy: midY },
    };
  }

  /** Nome do handle sob o ponteiro (ou null). */
  private handleAt(e: MouseEvent): string | null {
    const h = this.activeFloat();
    if (!h) return null;
    const centers = this.handleCenters(h);
    if (!centers) return null;
    const R = 7 * (window.devicePixelRatio || 1);
    for (const name of UniversalWriteElement.FLOAT_HANDLES) {
      const c = centers[name]!;
      if (Math.abs(e.clientX - c.cx) <= R && Math.abs(e.clientY - c.cy) <= R) return name;
    }
    return null;
  }

  private cursorForHandle(hn: string): string {
    if (hn === 'nw' || hn === 'se') return 'nwse-resize';
    if (hn === 'ne' || hn === 'sw') return 'nesw-resize';
    if (hn === 'n' || hn === 's') return 'ns-resize';
    return 'ew-resize';
  }

  /** Inicia arrasto de mover (handle='') ou redimensionar. Snapshot p/ undo. */
  private startFloatDrag(e: MouseEvent, mode: 'move' | 'resize', handle: string): void {
    const h = this.activeFloat();
    if (!h) return;
    e.preventDefault();
    const scale = PX_PER_TWIP * this.zoom;
    this.snapshot(); // undo + marca HF sujo
    const obj = h.obj;
    // caixa em edição: o retângulo na tela (tbEdit.rectTwips) é a referência.
    const editingTb = this.tbEdit && obj === this.tbEdit.hostRun.textbox ? this.tbEdit : null;
    const startRect = editingTb ? { ...editingTb.rectTwips } : null;
    if (mode === 'resize' && editingTb) (obj as DrawingTextbox).autoFit = false; // sizing manual
    // caixa em edição: parte do retângulo EXIBIDO (autofit), não do cy declarado.
    const startW = editingTb ? editingTb.rectTwips.w : obj.widthTwips;
    const startH = editingTb ? editingTb.rectTwips.h : obj.heightTwips;
    const d = {
      mode, handle,
      startClientX: e.clientX, startClientY: e.clientY,
      startW, startH,
      startOX: obj.offsetXTwips ?? 0, startOY: obj.offsetYTwips ?? 0,
      aspect: startH ? startW / startH : 1,
      page: h.page, moved: false,
    };
    this.floatDrag = d;
    const move = (ev: MouseEvent) => {
      if (!this.floatDrag) return;
      const dxT = (ev.clientX - d.startClientX) / scale;
      const dyT = (ev.clientY - d.startClientY) / scale;
      if (Math.abs(ev.clientX - d.startClientX) + Math.abs(ev.clientY - d.startClientY) > 2) d.moved = true;
      if (d.mode === 'move') {
        obj.offsetXTwips = Math.round(d.startOX + dxT);
        obj.offsetYTwips = Math.round(d.startOY + dyT);
      } else {
        this.applyResize(obj, d, dxT, dyT, h.kind === 'image');
      }
      // caixa em edição: espelha a nova geometria no retângulo de edição p/ o
      // layout/handles seguirem o arrasto.
      if (editingTb && startRect) {
        editingTb.rectTwips = {
          x: startRect.x + ((obj.offsetXTwips ?? 0) - d.startOX),
          y: startRect.y + ((obj.offsetYTwips ?? 0) - d.startOY),
          w: obj.widthTwips, h: obj.heightTwips,
        };
      }
      this.refresh();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const moved = this.floatDrag?.moved;
      this.floatDrag = null;
      if (!moved) this.undoStack.pop(); // clique sem arrasto: descarta snapshot
      else { this.dispatchEvent(new CustomEvent('uw-change')); }
      this.onSelectionChange?.(); this.chromeSync?.();
      this.refresh();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  private applyResize(
    obj: InlineImage | DrawingTextbox,
    d: { handle: string; startW: number; startH: number; startOX: number; startOY: number; aspect: number },
    dxT: number, dyT: number, lockAspect: boolean,
  ): void {
    const MIN = 120; // twips (~6pt)
    const hn = d.handle;
    let w = d.startW, h = d.startH, ox = d.startOX, oy = d.startOY;
    if (hn.includes('e')) w = d.startW + dxT;
    if (hn.includes('w')) { w = d.startW - dxT; ox = d.startOX + dxT; }
    if (hn.includes('s')) h = d.startH + dyT;
    if (hn.includes('n')) { h = d.startH - dyT; oy = d.startOY + dyT; }
    // trava de aspecto em cantos p/ imagem (padrão do Word)
    if (lockAspect && hn.length === 2 && d.startW > 0 && d.startH > 0) {
      const rw = w / d.startW, rh = h / d.startH;
      const r = Math.abs(rw - 1) >= Math.abs(rh - 1) ? rw : rh;
      const nw = d.startW * r, nh = d.startH * r;
      if (hn.includes('w')) ox = d.startOX + (d.startW - nw);
      if (hn.includes('n')) oy = d.startOY + (d.startH - nh);
      w = nw; h = nh;
    }
    obj.widthTwips = Math.max(MIN, Math.round(w));
    obj.heightTwips = Math.max(MIN, Math.round(h));
    obj.offsetXTwips = Math.round(ox);
    obj.offsetYTwips = Math.round(oy);
  }

  private deleteSelectedFloat(): void {
    const run = this.floatSel;
    if (!run || !this.model) return;
    this.snapshot();
    for (const p of this.model.paragraphs) {
      const idx = p.runs.indexOf(run);
      if (idx >= 0) { p.runs.splice(idx, 1); break; }
    }
    this.floatImages = this.floatImages.filter((f) => f.run !== run);
    this.floatSel = null;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  private hitTest(e: MouseEvent): DocPosition | null {
    if (!this.model) return null;
    // com páginas lado a lado, escolhe a página pelo X E pelo Y;
    // clique no vão entre páginas vai para a mais próxima na horizontal
    let order = [...this.canvases.keys()];
    order.sort((a, b) => {
      const ra = this.canvases[a]!.getBoundingClientRect();
      const rb = this.canvases[b]!.getBoundingClientRect();
      const da = Math.max(0, ra.left - e.clientX, e.clientX - ra.right);
      const db = Math.max(0, rb.left - e.clientX, e.clientX - rb.right);
      return da - db;
    });
    for (const pg of order) {
      const canvas = this.canvases[pg]!;
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      let best: LaidLine | null = null;
      for (const line of this.allLines()) {
        if (line.page !== pg) continue;
        if (yT >= line.yTwips && yT <= line.yTwips + line.heightTwips) { best = line; break; }
        if (!best || Math.abs(line.yTwips + line.heightTwips / 2 - yT) <
            Math.abs(best.yTwips + best.heightTwips / 2 - yT)) best = line;
      }
      if (!best) return { para: 0, offset: 0 };
      return { para: best.para, offset: this.hitLineX(best, xT) };
    }
    return null;
  }

  /** Rola até o caret APENAS se ele estiver fora da tela ou cortado.
   *  Animação suave, exceto se o SO pedir movimento reduzido. */
  private scrollCaretIntoView(): void {
    const line = this.lineOf(this.selection.focus);
    if (!line) return;
    const canvas = this.canvases[line.page];
    if (!canvas) return;
    const scale = PX_PER_TWIP * this.zoom;
    const caretTop = canvas.offsetTop + line.yTwips * scale;
    const caretBottom = caretTop + line.heightTwips * scale;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop;
    const viewBottom = viewTop + viewH;
    const MARGIN = 8;

    // totalmente visível (sem corte)? não rola.
    if (caretTop >= viewTop + MARGIN && caretBottom <= viewBottom - MARGIN) return;

    const target = caretTop < viewTop + MARGIN
      ? caretTop - MARGIN - 32
      : caretBottom - viewH + MARGIN + 32;
    this.animateScrollTo(Math.max(0, target));
  }

  /** Scroll animado próprio (rAF + easeOutCubic) — 'smooth' nativo é no-op em
   *  alguns Chromium; instantâneo quando o SO pede movimento reduzido. */
  private scrollAnim = 0;
  private animateScrollTo(target: number): void {
    cancelAnimationFrame(this.scrollAnim);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.scrollTop = target;
      return;
    }
    const start = this.scrollTop;
    const dist = target - start;
    if (Math.abs(dist) < 2) { this.scrollTop = target; return; }
    const DURATION = 220;
    const t0 = performance.now();
    let started = false;
    const step = (now: number) => {
      started = true;
      const t = Math.min(1, (now - t0) / DURATION);
      const ease = 1 - Math.pow(1 - t, 3);
      this.scrollTop = start + dist * ease;
      if (t < 1) this.scrollAnim = requestAnimationFrame(step);
    };
    this.scrollAnim = requestAnimationFrame(step);
    // aba oculta/throttled: rAF não roda — completa instantâneo
    window.setTimeout(() => {
      if (!started) {
        cancelAnimationFrame(this.scrollAnim);
        this.scrollTop = target;
      }
    }, 80);
  }

  // ───────────────────────── pintura ─────────────────────────

  refresh(): void {
    this.layout();
    this.rebuildCanvases();
    if (this.view === 'read') this.applyReadSpread(); // só mostra o par atual
    else for (const c of this.canvases) if (c.style.display === 'none') c.style.display = ''; // limpa ocultação da Leitura
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  /** Mantém a textarea-proxy JUNTO AO CARET: o browser rola o elemento
   *  focado para a vista ao digitar — se a proxy ficasse no fim do
   *  documento, digitar saltava a rolagem para o final. De quebra, o
   *  popup de IME aparece na posição certa. */
  private positionProxy(): void {
    const line = this.lineOf(this.selection.focus);
    const canvas = line ? this.canvases[line.page] : undefined;
    if (!line || !canvas) {
      this.input.style.top = '0px';
      this.input.style.left = '0px';
      return;
    }
    const scale = PX_PER_TWIP * this.zoom;
    const x = canvas.offsetLeft + this.caretX(this.selection.focus, line) * scale;
    const y = canvas.offsetTop + line.yTwips * scale;
    this.input.style.left = `${Math.round(x)}px`;
    this.input.style.top = `${Math.round(y)}px`;
    this.input.style.height = `${Math.max(8, Math.round(line.heightTwips * scale))}px`;
  }

  private rebuildCanvases(): void {
    if (!this.model) return;
    const s = this.sect();
    const dpr = window.devicePixelRatio || 1;
    const cssScale = PX_PER_TWIP * this.zoom;
    const isPaged = this.view === 'print' || this.view === 'read';
    const widthT = this.view === 'web'
      ? this.contentWidthTwips() + 1200
      : s.pageWidthTwips;
    const heightT = isPaged ? s.pageHeightTwips : Math.max(this.continuousHeight, 3000);
    const count = isPaged ? this.pageCount : this.tileHeights.length;

    // dimensões CSS desejadas por página (ou tile, no modo contínuo)
    const cssOf = (i: number) => {
      let w = widthT, h = heightT;
      if (!isPaged) {
        h = this.tileHeights[i] ?? heightT;
      } else if (isPaged && this.hfEdit && this.savedBody) {
        // edição de HF: usa a geometria SALVA do corpo (preserva paisagem etc.)
        const sp = this.sectPrForSavedPage(i);
        w = sp.pageWidthTwips; h = sp.pageHeightTwips;
      } else if (isPaged && this.sectionStarts.length > 0) {
        const sp = this.sectPrAt(this.pageSections[i] ?? 0);
        w = sp.pageWidthTwips; h = sp.pageHeightTwips;
      }
      return { wPx: `${Math.round(w * cssScale)}px`, hPx: `${Math.round(h * cssScale)}px` };
    };

    // REUSA os elementos <canvas> existentes quando a estrutura não mudou.
    // Recriar canvas a cada refresh destruía o alvo do dblclick entre os dois
    // cliques → o browser nunca disparava dblclick (entrada no HF falhava).
    const sameCount = this.canvases.length === count;
    const sameSizes = sameCount && this.canvases.every((c, i) => {
      const { wPx, hPx } = cssOf(i);
      return c.style.width === wPx && c.style.height === hPx;
    });
    if (sameCount && sameSizes) {
      // só limpa os buffers p/ repintura sob demanda (mantém identidade do DOM)
      this.allocatedPages.clear();
      for (const c of this.canvases) { c.width = 1; c.height = 1; }
      void dpr;
      return;
    }

    this.container.replaceChildren();
    this.canvases = [];
    this.allocatedPages.clear();
    for (let i = 0; i < count; i++) {
      const { wPx, hPx } = cssOf(i);
      const c = document.createElement('canvas');
      c.className = 'page';
      // o buffer real é alocado sob demanda (virtualização) — só o CSS aqui
      c.width = 1;
      c.height = 1;
      c.style.width = wPx;
      c.style.height = hPx;
      this.container.append(c);
      this.canvases.push(c);
    }
    void dpr;
  }

  /** Páginas com buffer alocado e pintado (virtualização para zoom alto). */
  private allocatedPages = new Set<number>();
  private scrollPaintQueued = false;

  /** Fator de buffer: dpr, limitado para o canvas não passar de 4096px. */
  private bufferScaleFor(canvas: HTMLCanvasElement): number {
    const dpr = window.devicePixelRatio || 1;
    const cssW = parseFloat(canvas.style.width) || 794;
    const cssH = parseFloat(canvas.style.height) || 1123;
    // limites REAIS do Chromium: ~16384px por dimensão e área máx 16384².
    // O cap antigo de 4096 derrubava a resolução das visões CONTÍNUAS (Web/
    // Leitura usam UMA tela com a altura do doc inteiro) → upscale → embaçado.
    const MAX_DIM = 16384, MAX_AREA = 16384 * 16384;
    return Math.min(dpr, MAX_DIM / cssW, MAX_DIM / cssH, Math.sqrt(MAX_AREA / (cssW * cssH)));
  }

  /** Pinta a CAMADA de header/footer/notas — chamada ANTES do corpo, para que
   *  conteúdo behindDoc (capa full-bleed, barras) fique ATRÁS do texto e os
   *  campos do corpo por cima. O HF que não está em foco fica esmaecido. */
  private paintHfLayer(
    ctxs: (CanvasRenderingContext2D | null)[], scales: number[], dpr: number,
  ): void {
    const fullDoc = this.fullDoc;
    if (!(this.view === 'print' && fullDoc && !this.hfEdit)) return;
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg]!;
      const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
      const section = this.sectionStarts[sIdx]?.section ?? fullDoc.sections[0];
      const sp = this.sectPrAt(sIdx);
      const grey = this.pageDark ? '#9aa0a6' : '#555';
      if (section) {
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        // Word esmaece o HF que NÃO está em foco. Na visão normal ambos ficam
        // esmaecidos; ao capturar o snapshot da edição, o HF ativo é suprimido
        // (pintado por cima em foco) e o resto sai CHEIO.
        // ao capturar o snapshot do corpo (edição HF), suprime AMBOS os HF.
        const header2 = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
        if (header2?.length && !this.hfCapturing) {
          ctx.save(); ctx.globalAlpha = HF_DIM_ALPHA;
          this.paintHf(ctx, scale, header2, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, grey, sp);
          ctx.restore();
        }
        const footer2 = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
        if (footer2?.length && !this.hfCapturing) {
          const fTop = sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(footer2, colW);
          ctx.save(); ctx.globalAlpha = HF_DIM_ALPHA;
          this.paintHf(ctx, scale, footer2, sp.marginLeftTwips, fTop, colW, pg, grey, sp);
          ctx.restore();
        }
      }
      if (sp.cols?.sep && sp.cols.count > 1) {
        const cc = this.colContentOnPage(pg, sp);
        if (cc) {
          ctx.strokeStyle = this.pageDark ? '#5f6368' : '#bdbdbd';
          ctx.lineWidth = Math.max(1, dpr * 0.75);
          for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(xs, sp.marginTopTwips * scale);
            ctx.lineTo(xs, cc.maxBottom * scale);
            ctx.stroke();
          }
        }
      }
      const hits = this.footnoteHits.filter((h) => h.page === pg);
      if (hits.length && fullDoc.footnotes.size) {
        let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
        ctx.strokeStyle = grey;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.beginPath();
        ctx.moveTo(sp.marginLeftTwips * scale, fy * scale);
        ctx.lineTo((sp.marginLeftTwips + 2880) * scale, fy * scale);
        ctx.stroke();
        fy += 220;
        ctx.font = `400 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
        ctx.fillStyle = this.pageDark ? '#c0c4c9' : '#333';
        for (const h of hits) {
          const paras = fullDoc.footnotes.get(h.id);
          const text = paras?.map((p) => p.runs.map((r) => r.text).join('')).join(' ').trim() ?? '';
          ctx.fillText(`${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips * scale, fy * scale);
          fy += 240;
        }
      }
    }
  }

  /** Garante buffer+pintura das páginas visíveis (e vizinhas); libera longe. */
  private ensureVisiblePainted(): void {
    if (this.canvases.length === 0) return;
    // fallback p/ contexto sem altura (preview/headless): trata como 1 tela
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop - viewH;        // 1 tela antes
    const viewBottom = this.scrollTop + viewH * 2; // 1 tela depois
    const need = new Set<number>();
    this.canvases.forEach((c, i) => {
      if (c.style.display === 'none') return; // páginas ocultas (fora do spread em Leitura)
      const top = c.offsetTop;
      const bottom = top + c.offsetHeight;
      if (bottom >= viewTop && top <= viewBottom) need.add(i);
    });
    let dirty = false;
    for (const i of need) {
      if (!this.allocatedPages.has(i)) {
        const c = this.canvases[i]!;
        const bs = this.bufferScaleFor(c);
        c.width = Math.round(parseFloat(c.style.width) * bs);
        c.height = Math.round(parseFloat(c.style.height) * bs);
        this.allocatedPages.add(i);
        dirty = true;
      }
    }
    // libera buffers de páginas muito longe (memória em zoom alto)
    for (const i of [...this.allocatedPages]) {
      if (!need.has(i)) {
        const c = this.canvases[i]!;
        const top = c.offsetTop;
        if (top > viewBottom + viewH * 3 || top + c.offsetHeight < viewTop - viewH * 3) {
          c.width = 1;
          c.height = 1;
          this.allocatedPages.delete(i);
        }
      }
    }
    if (dirty) this.paint(need);
  }

  private paint(filter?: Set<number>): void {
    if (!this.model || this.canvases.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const active = filter ?? this.allocatedPages;
    if (active.size === 0) return;
    const sel = normalizeRange(this.range());
    const hasSel = this.hasSelection();

    const pageBg = this.pageDark ? '#1e1e1e' : '#ffffff';
    // escala por página: o buffer pode ter dpr limitado (virtualização)
    const scales: number[] = [];
    const ctxs: (CanvasRenderingContext2D | null)[] = this.canvases.map((c, i) => {
      if (!active.has(i) || c.width <= 1) { scales.push(0); return null; }
      const bs = c.width / (parseFloat(c.style.width) || c.width);
      scales.push(PX_PER_TWIP * this.zoom * bs);
      const ctx = c.getContext('2d')!;
      // reamostragem de alta qualidade — imagens raster reduzidas (ex.: logos
      // 1800px exibidos a ~380px) serrilham com o 'low' padrão do canvas.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, c.width, c.height);
      // durante a captura do snapshot da edição HF o fundo fica TRANSPARENTE
      // (só o corpo), p/ compor sobre a imagem behindDoc sem véu branco.
      if (!this.hfCapturing) {
        ctx.fillStyle = pageBg;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      // edição de caixa de texto: TODO o render anterior (corpo ou HF) esmaecido
      // ao fundo; a caixa ativa é desenhada em foco por cima.
      if (this.tbEdit && (this.tbBgSnapshots[i]?.width ?? 0) > 1) {
        ctx.save();
        ctx.globalAlpha = HF_DIM_ALPHA;
        ctx.drawImage(this.tbBgSnapshots[i]!, 0, 0);
        ctx.restore();
      }
      // (o snapshot do corpo da edição HF é composto em paintHfEditCompose, DEPOIS
      //  do behindDoc — ver abaixo — para a ordem-z ficar correta como no Word.)
      return ctx;
    });
    const pgOf = (p: number) => Math.min(p, ctxs.length - 1);

    // edição de caixa de texto: repõe a REGIÃO da caixa em BRILHO TOTAL (o fundo
    // real, sem o texto antigo — suprimido no snapshot), para o texto ao vivo (na
    // COR REAL, ex.: branco na capa) ficar legível sobre o próprio fundo. O
    // texto/caret são pintados pelo laço de linhas normal (this.model = internos).
    if (this.tbEdit) {
      const tp = pgOf(this.tbEdit.pageIdx);
      const ctxT = ctxs[tp];
      const snap = this.tbBgSnapshots[tp];
      if (ctxT) {
        const scale = scales[tp]!;
        const r = this.tbEdit.rectTwips;
        const pad = 3 * dpr;
        const bx = r.x * scale - pad, by = r.y * scale - pad;
        const bw = r.w * scale + 2 * pad, bh = Math.max(r.h, 1) * scale + 2 * pad;
        ctxT.save();
        ctxT.beginPath(); ctxT.rect(bx, by, bw, bh); ctxT.clip();
        ctxT.fillStyle = pageBg; ctxT.fillRect(bx, by, bw, bh);
        if ((snap?.width ?? 0) > 1) ctxT.drawImage(snap!, 0, 0); // fundo real, cheio
        ctxT.restore();
        // a borda + alças são desenhadas pela seleção (activeFloat) mais abaixo.
      }
    }

    // edição de HF: composição com ordem-z correta (behindDoc atrás do corpo,
    // header E footer em foco). Substitui o realce de banda antigo.
    if (this.hfEdit && !this.tbEdit) this.paintHfEditCompose(ctxs, scales, dpr);

    // HF (capa/barras behindDoc) ANTES do corpo → o corpo/campos fica POR CIMA.
    // Em edição de HF/caixa a composição/snapshot já cuidam disso.
    if (!this.tbEdit && !this.hfEdit) this.paintHfLayer(ctxs, scales, dpr);

    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const pg = pgOf(line.page);
        const ctx = ctxs[pg];
        if (ctx) this.paintLine(ctx, pl, line, scales[pg]!, sel, hasSel);
      }
    }

    // tabelas
    const ink = this.pageDark ? '#e8eaed' : '#000';
    const gridColor = this.pageDark ? '#5f6368' : '#666';
    for (const tl of this.tableLayouts) {
      const tpg = pgOf(tl.page);
      const ctx = ctxs[tpg];
      if (!ctx) continue;
      const scale = scales[tpg]!;
      for (const sh of tl.cellShades) {
        ctx.fillStyle = this.inkColor(sh.hex);
        ctx.fillRect((tl.xTwips + sh.xTwips) * scale, (tl.yTwips + sh.yTwips) * scale, sh.wTwips * scale, sh.hTwips * scale);
      }
      // bordas reais por célula (tcBorders > tblBorders; sz em 1/8 pt; cor)
      const strokeEdge = (
        edge: { sizeEighthPt: number; color?: string; style: string } | undefined,
        ax: number, ay: number, bx: number, by: number,
      ) => {
        if (!edge) return;
        ctx.strokeStyle = edge.color ? this.inkColor(edge.color) : ink;
        ctx.lineWidth = Math.max(dpr * 0.75, (edge.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
        if (edge.style === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
        else if (edge.style === 'dotted') ctx.setLineDash([2 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo((tl.xTwips + ax) * scale, (tl.yTwips + ay) * scale);
        ctx.lineTo((tl.xTwips + bx) * scale, (tl.yTwips + by) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (const cr of tl.cellRects) {
        strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
        strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
        strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
        strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
      }
      void gridColor;
      for (const cl of tl.cellLines) {
        const fontPx = deviceEmPt(cl.sizePt) * TWIPS_PER_PT * scale;
        ctx.font = `${cl.italic ? 'italic ' : ''}${cl.bold ? '700' : '400'} ${fontPx}px ${cl.family ?? DEFAULT_FONT}`;
        ctx.fillStyle = cl.color ? this.inkColor(cl.color) : ink;
        const bx = (tl.xTwips + cl.xTwips) * scale;
        const by = (tl.yTwips + cl.yTwips) * scale;
        ctx.fillText(cl.text, bx, by);
        if (cl.underline || cl.strike) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(1, fontPx / 16);
          const w = ctx.measureText(cl.text).width;
          const yo = cl.underline ? fontPx * 0.12 : -fontPx * 0.28;
          ctx.beginPath(); ctx.moveTo(bx, by + yo); ctx.lineTo(bx + w, by + yo); ctx.stroke();
        }
      }
    }

    // letras capitulares (drop caps) — desenhadas como float
    for (const dc of this.dropCapFloats) {
      const dpg = pgOf(dc.page);
      const ctx = ctxs[dpg];
      if (!ctx) continue;
      const scale = scales[dpg]!;
      ctx.font = `${dc.italic ? 'italic ' : ''}${dc.bold ? '700' : '400'} ` +
        `${deviceEmPt(dc.sizePt) * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.inkColor(dc.color);
      // baseline: base da zona de K linhas (a letra "desce" pelas linhas)
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * TWIPS_PER_PT;
      ctx.fillText(dc.text, dc.xTwips * scale, baseline * scale);
    }

    // imagens flutuantes (ancoradas ao parágrafo)
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const fpg = pgOf(first.page);
      const ctx = ctxs[fpg];
      if (!ctx) continue;
      const scale = scales[fpg]!;
      const img = f.run.image;
      const bmp = this.bitmapFor(img);
      const x = (first.xTwips + (img.offsetXTwips ?? 0)) * scale;
      const yPx = (first.yTwips + (img.offsetYTwips ?? 0)) * scale;
      if (bmp) ctx.drawImage(bmp, x, yPx, img.widthTwips * scale, img.heightTwips * scale);
    }

    // caixas de texto flutuantes do CORPO (ex.: título/campos da CAPA). As
    // imagens já vão acima; aqui só as caixas de texto — senão a capa fica sem
    // conteúdo. Em edição de HF/caixa o corpo vem do snapshot, então não repete.
    if (!this.hfEdit && !this.tbEdit && this.model) {
      const inkTb = this.pageDark ? '#e3e3e3' : '#1f1f1f';
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const fpg = pgOf(first.page);
        const ctx = ctxs[fpg];
        if (!ctx) return;
        const scale = scales[fpg]!;
        const sp = this.sectPrAt(this.pageSections[fpg] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          if (r === this.tbSnapshotSuppress) continue; // caixa em edição: fora do snapshot
          const { x, y } = r.textbox.floating
            ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
            : { x: sp.marginLeftTwips, y: first.yTwips };
          { const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.paintHf(ctx, scale, r.textbox.paras, iw.x, iw.y, iw.w, fpg, inkTb, sp); }
        }
      });
    }

    // (a camada de header/footer/notas é pintada por paintHfLayer ANTES do
    //  corpo — ver a chamada acima; behindDoc precisa ficar atrás do texto.)

    // seleção de objeto flutuante: contorno + 8 alças. Aparece p/ a imagem
    // selecionada E p/ a caixa em EDIÇÃO (redimensionamento coexiste com edição).
    if (this.floatSel || this.tbEdit) {
      const h = this.activeFloat();
      if (h) {
        const pg = pgOf(h.page);
        const ctx = ctxs[pg];
        if (ctx) {
          const scale = scales[pg]!;
          const x = h.rect.x * scale, y = h.rect.y * scale;
          const w = h.rect.w * scale, hh = h.rect.h * scale;
          ctx.save();
          ctx.strokeStyle = '#2b579a';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = Math.max(1, dpr);
          ctx.strokeRect(x, y, w, hh);
          ctx.setLineDash([]);
          const hs = 6 * dpr;
          const pts: [number, number][] = [
            [x, y], [x + w / 2, y], [x + w, y], [x + w, y + hh / 2],
            [x + w, y + hh], [x + w / 2, y + hh], [x, y + hh], [x, y + hh / 2],
          ];
          ctx.fillStyle = '#ffffff';
          for (const [px, py] of pts) {
            ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
            ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
          }
          ctx.restore();
        }
      }
    }

    // caret
    if (this.caretVisible && this.view !== 'read' && !hasSel) {
      const line = this.lineOf(this.selection.focus);
      if (line) {
        const cpg = pgOf(line.page);
        const ctx = ctxs[cpg];
        if (ctx) {
          const scale = scales[cpg]!;
          const x = this.caretX(this.selection.focus, line) * scale;
          ctx.fillStyle = this.pageDark ? '#e8eaed' : '#000';
          ctx.fillRect(x, line.yTwips * scale, Math.max(1, dpr), line.heightTwips * scale);
        }
      }
    }
  }

  private paintLine(
    ctx: CanvasRenderingContext2D,
    pl: ParaLayout,
    line: LaidLine,
    scale: number,
    sel: DocRange,
    hasSel: boolean,
  ): void {
    const para = this.model!.paragraphs[line.para]!;
    const st = this.styleOf(para);

    // sombreamento e borda do parágrafo (direto OU herdado do estilo —
    // dividers de títulos, barra da citação, caixa do código)
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const marginL = (this.view === 'print' || this.view === 'read') ? s.marginLeftTwips : 600;
      const colX = marginL + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      if (effShading) {
        // o app de referência preenche o fundo ATÉ as bordas — inclui a zona w:space
        const bd = effBorders;
        const isFirstL = line.rich.start === 0;
        const isLastL = line.rich.end === pl.charAdvances.length;
        const exL = (bd?.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const exR = (bd?.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const exT = isFirstL ? (bd?.top?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        const exB = isLastL ? (bd?.bottom?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        ctx.fillStyle = this.inkColor(effShading);
        ctx.fillRect(
          (colX - exL) * scale,
          (line.yTwips - exT) * scale,
          (colW + exL + exR) * scale,
          (line.heightTwips + exT + exB) * scale,
        );
      }
      if (effBorders || para.props.boxBorder) {
        const isFirst = line.rich.start === 0;
        const isLast = line.rich.end === pl.charAdvances.length;
        const fallback = para.props.boxBorder && !effBorders
          ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
          : undefined;
        const b = effBorders ?? {
          top: fallback, bottom: fallback, left: fallback, right: fallback,
        };
        const stroke = (
          e: { sizeEighthPt: number; color?: string; style: string; spacePt: number } | undefined,
          ax: number, ay: number, bx: number, by: number,
        ) => {
          if (!e) return;
          ctx.strokeStyle = e.color ? `#${e.color}` : this.pageDark ? '#e8eaed' : '#000';
          ctx.lineWidth = Math.max(1, (e.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
          if (e.style === 'dashed') ctx.setLineDash([8, 5]);
          else if (e.style === 'dotted') ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        // w:space afasta a borda do texto (em pontos)
        const spL = (b.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const spR = (b.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const spT = (b.top?.spacePt ?? 0) * TWIPS_PER_PT;
        const spB = (b.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
        const x0 = (colX - spL) * scale;
        const x1 = (colX + colW + spR) * scale;
        const y0 = (line.yTwips - (isFirst ? spT : 0)) * scale;
        const y1 = (line.yTwips + line.heightTwips + (isLast ? spB : 0)) * scale;
        stroke(b.left, x0, y0, x0, y1);
        stroke(b.right, x1, y0, x1, y1);
        if (isFirst) stroke(b.top, x0, y0, x1, y0);
        if (isLast) stroke(b.bottom, x0, y1, x1, y1);
      }
    }

    // seleção (fundo azul)
    if (hasSel && line.para >= sel.start.para && line.para <= sel.end.para) {
      const from = Math.max(line.rich.start, line.para === sel.start.para ? sel.start.offset : 0);
      const to = Math.min(line.rich.end, line.para === sel.end.para ? sel.end.offset : line.rich.end);
      if (to > from) {
        const x1 = this.caretX({ para: line.para, offset: from }, line);
        const x2 = this.caretX({ para: line.para, offset: to }, line);
        ctx.fillStyle = 'rgba(58,114,196,0.35)';
        ctx.fillRect(x1 * scale, line.yTwips * scale, (x2 - x1) * scale, line.heightTwips * scale);
      }
    }

    // marcador de lista
    if (line.marker) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.pageDark ? '#e8eaed' : '#000';
      ctx.fillText(line.marker.text, line.marker.xTwips * scale, line.baselineTwips * scale);
    }

    // texto, caractere a caractere (posições NOSSAS, não do canvas)
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex]!;
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;

      // inline customizado: ocupa um único U+FFFC no modelo/layout e delega
      // a pintura ao plugin. Sem plugin, desenha fallback textual legível.
      if (run?.custom) {
        const family = this.familyFor(span.family);
        const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
        const variant = span.variant;
        ctx.font = `${variant === 'italic' || variant === 'boldItalic' ? 'italic ' : ''}` +
          `${variant === 'bold' || variant === 'boldItalic' ? '700' : '400'} ${fontPx}px ${family}`;
        const ink = this.inkColor(props?.color ?? st?.color);
        ctx.fillStyle = ink;
        const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart + i]!;
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const font = this.fonts!.resolve(span.family, variant);
        const measureText = (text: string): number => {
          const chars = Array.from(text);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i]!.codePointAt(0)!;
            width += font.advanceTwips(cp, span.sizePt);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== undefined) width += font.kernTwips(cp, next, span.sizePt);
          }
          return width;
        };
        if (renderer?.draw) {
          const drawContext: UniversalWriteInlineDrawContext = {
            data: run.custom.data,
            fallbackText,
            props: run.props,
            sizePt: span.sizePt,
            measureText,
            ctx,
            xTwips: x,
            yTwips: line.yTwips,
            baselineTwips: line.baselineTwips,
            widthTwips,
            heightTwips: line.heightTwips,
            scale,
            dark: this.pageDark,
            color: ink,
          };
          renderer.draw(drawContext);
        } else {
          ctx.fillText(fallbackText, x * scale, line.baselineTwips * scale);
        }
        x += widthTwips;
        continue;
      }

      // run de imagem inline
      if (run?.image) {
        const img = run.image;
        const bmp = this.bitmapFor(img);
        const wPx = img.widthTwips * scale;
        const hPx = img.heightTwips * scale;
        const yPx = (line.baselineTwips - img.heightTwips) * scale;
        if (bmp) ctx.drawImage(bmp, x * scale, yPx, wPx, hPx);
        else {
          ctx.strokeStyle = '#bbb';
          ctx.strokeRect(x * scale, yPx, wPx, hPx);
        }
        x += img.widthTwips;
        continue;
      }
      const family = this.familyFor(span.family);
      // desenha no MESMO em de dispositivo usado na medição (11 → 11.04pt)
      const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
      const variant = span.variant;
      ctx.font = `${variant === 'italic' || variant === 'boldItalic' ? 'italic ' : ''}` +
        `${variant === 'bold' || variant === 'boldItalic' ? '700' : '400'} ${fontPx}px ${family}`;
      const color = props?.color ?? st?.color;
      ctx.fillStyle = this.inkColor(color);

      const baseShift =
        props?.vertAlign === 'superscript' ? -span.sizePt * 0.35 * TWIPS_PER_PT :
        props?.vertAlign === 'subscript' ? span.sizePt * 0.14 * TWIPS_PER_PT : 0;

      const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
      const segX0 = x;
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i]!;
        let a = pl.charAdvances[gi]!;
        if (line.justifyExtraPerSpace && ch === ' ') a += line.justifyExtraPerSpace;
        if (props?.highlight) {
          ctx.save();
          const hl = HIGHLIGHTS[props.highlight] ?? '#ffff00';
          ctx.fillStyle = this.inkColor(hl.slice(1));
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // sombreado cinza de CAMPO (como o app de referência mostra campos)
        if (run?.field) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // anotação (comentário): destaque âmbar translúcido, como no app de referência
        if (props?.commentIds?.length) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 187, 0, 0.28)';
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // leader pontilhado do tab (sumário)
        if (ch === '\t' && pl.tabLeaders?.get(gi)) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? '#9aa0a6' : '#666';
          const dotFont = `400 ${span.sizePt * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
          ctx.font = dotFont;
          const step = 90; // twips por ponto
          for (let dx = 60; dx < a - 40; dx += step) {
            ctx.fillText('.', (x + dx) * scale, (line.baselineTwips + baseShift) * scale);
          }
          ctx.restore();
        }
        if (ch !== ' ' || this.showMarks) {
          const shown = this.showMarks && ch === ' ' ? '·' : ch;
          // posição encaixada na grade de 1/600" relativa ao início da linha,
          // como o app de referência faz (cumulativo arredondado a unidades de 2.4 twips)
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          ctx.fillText(shown, xSnap * scale, (line.baselineTwips + baseShift) * scale);
        }
        x += a;
      }
      // sublinhado/tachado por segmento (estilos do app de referência).
      // underline/strike podem vir do ESTILO do parágrafo, não só do run direto.
      const effUnderline = props?.underline || st?.underline;
      const effStrike = props?.strike || st?.strike;
      if (effUnderline || effStrike || props?.doubleStrike) {
        ctx.strokeStyle = ctx.fillStyle as string;
        const w = x - segX0;
        const baseW = Math.max(1, fontPx / 16);
        const drawLine = (yOff: number, lw: number, dash: number[] = []) => {
          ctx.lineWidth = lw;
          ctx.setLineDash(dash);
          ctx.beginPath();
          ctx.moveTo(segX0 * scale, (line.baselineTwips + yOff) * scale);
          ctx.lineTo((segX0 + w) * scale, (line.baselineTwips + yOff) * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const drawWave = (yOff: number, lw: number) => {
          ctx.lineWidth = lw;
          ctx.beginPath();
          const amp = 0.6 * baseW;
          const period = Math.max(4, fontPx / 6);
          for (let px = 0; px <= w * scale; px += 1) {
            const yy = (line.baselineTwips + yOff) * scale + Math.sin((px / period) * Math.PI * 2) * amp;
            if (px === 0) ctx.moveTo(segX0 * scale, yy);
            else ctx.lineTo(segX0 * scale + px, yy);
          }
          ctx.stroke();
        };
        if (effUnderline) {
          ctx.strokeStyle = props?.underlineColor ? this.inkColor(props.underlineColor) : (ctx.fillStyle as string);
          const yU = 40;
          switch (props?.underlineStyle) {
            case 'double': drawLine(yU, baseW); drawLine(yU + baseW * 2.4, baseW); break;
            case 'thick': drawLine(yU + baseW, baseW * 2.2); break;
            case 'dotted': drawLine(yU, baseW, [baseW, baseW * 1.6]); break;
            case 'dash': drawLine(yU, baseW, [baseW * 4, baseW * 2.5]); break;
            case 'wave': drawWave(yU, baseW); break;
            default: drawLine(yU, baseW);
          }
          ctx.strokeStyle = ctx.fillStyle as string;
        }
        if (effStrike) drawLine(-span.sizePt * 0.25 * TWIPS_PER_PT, baseW);
        if (props?.doubleStrike) {
          const yS = -span.sizePt * 0.25 * TWIPS_PER_PT;
          drawLine(yS - baseW * 1.3, baseW);
          drawLine(yS + baseW * 1.3, baseW);
        }
      }
    }

    // marca de parágrafo ¶
    if (this.showMarks && line.rich.end === pl.charAdvances.length) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = '#888';
      ctx.fillText('¶', (x + 20) * scale, line.baselineTwips * scale);
    }
  }

  // ───────────────────────── exportação para PDF ─────────────────────────
  private pdfImgCache = new WeakMap<object, PdfImage | null>();

  private pdfColor(hex?: string): PdfColor {
    return hex ? hexColor(hex) : [0, 0, 0];
  }

  /**
   * Gera um PDF do documento reaproveitando o MESMO layout do canvas
   * (layoutCache, tabelas, imagens). Cada glifo é posicionado exatamente onde o
   * editor o desenha — inclusive o snap de 1/600" e a baseline do app de referência — de modo
   * que o PDF reproduz a página glifo a glifo.
   */
  async exportPdf(): Promise<Uint8Array> {
    if (!this.model || !this.fonts) throw new Error('document not loaded');
    // imagens em páginas nunca pintadas (virtualização) não estão decodificadas;
    // decodifica todas antes para não exportar placeholders.
    await this.ensureImagesDecoded();
    const T = TWIPS_PER_PT;
    const doc = new PdfDocument({ compress: true });
    this.pdfImgCache = new WeakMap();
    const cache = new Map<SfntFont, EmbeddedFont>();
    const emb = (family: string | undefined, variant: FontVariant): EmbeddedFont => {
      const sf = this.fonts!.resolve(family, variant);
      let e = cache.get(sf);
      if (!e) {
        const fam = this.familyFor(family);
        const bytes = this.fontBytes[fam]?.[variant] ?? this.fontBytes[DEFAULT_FONT]?.['regular'];
        if (!bytes) throw new Error('font has no bytes to embed in the PDF');
        e = doc.embedFont(`${fam}-${variant}`, bytes, {
          unitsPerEm: sf.metrics.unitsPerEm,
          ascender: sf.metrics.ascender,
          descender: sf.metrics.descender,
          glyphId: (cp) => sf.glyphId(cp),
          advanceWidth: (g) => sf.advanceWidth(g),
        });
        cache.set(sf, e);
      }
      return e;
    };

    // páginas com a geometria de cada seção
    const pages: PdfPage[] = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push(doc.addPage(sp.pageWidthTwips / T, sp.pageHeightTwips / T));
    }

    // cabeçalhos/rodapés (+ timbrado/capa behindDoc) ANTES do corpo → a imagem
    // full-bleed do header fica ATRÁS dos campos, como no canvas (paintHfLayer).
    if (this.view === 'print' && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg]!;
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (section) {
          const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
          const header = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
          if (header?.length) this.pdfPaintHf(doc, page, emb, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, sp);
          const footer = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
          if (footer?.length) this.pdfPaintHf(doc, page, emb, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg, sp);
        }
        // separador entre colunas (w:sep) — só onde a coluna direita tem conteúdo
        if (sp.cols?.sep && sp.cols.count > 1) {
          const cc = this.colContentOnPage(pg, sp);
          if (cc) for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) / T;
            page.line(xs, sp.marginTopTwips / T, xs, cc.maxBottom / T, [0.74, 0.74, 0.74], 0.6);
          }
        }
        const hits = this.footnoteHits.filter((h) => h.page === pg);
        if (hits.length && this.fullDoc.footnotes.size) {
          let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
          page.line(sp.marginLeftTwips / T, fy / T, (sp.marginLeftTwips + 2880) / T, fy / T, [0.33, 0.33, 0.33], 0.75);
          fy += 220;
          for (const h of hits) {
            const paras = this.fullDoc.footnotes.get(h.id);
            const text = paras?.map((p) => p.runs.map((r) => r.text).join('')).join(' ').trim() ?? '';
            this.pdfGlyphsAt(page, emb, DEFAULT_FONT, 'regular', 9, [0.2, 0.2, 0.2], `${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips, fy);
            fy += 240;
          }
        }
      }
    }
    // corpo: linha a linha (mesma matemática do paintLine)
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const page = pages[line.page];
        if (page) this.pdfPaintLine(doc, page, emb, pl, line);
      }
    }
    // tabelas
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (page) this.pdfPaintTable(doc, page, emb, tl);
    }
    // letras capitulares
    for (const dc of this.dropCapFloats) {
      const page = pages[dc.page];
      if (!page) continue;
      const variant: FontVariant = dc.bold && dc.italic ? 'boldItalic' : dc.bold ? 'bold' : dc.italic ? 'italic' : 'regular';
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * T;
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, variant, dc.sizePt, this.pdfColor(dc.color), dc.text, dc.xTwips, baseline);
    }
    // imagens flutuantes do corpo
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const page = pages[first.page];
      if (!page) continue;
      const img = f.run.image;
      this.pdfImage(doc, page, img,
        (first.xTwips + (img.offsetXTwips ?? 0)) / T, (first.yTwips + (img.offsetYTwips ?? 0)) / T,
        img.widthTwips / T, img.heightTwips / T);
    }
    // caixas de texto flutuantes do CORPO (ex.: campos da capa) — POR CIMA da
    // imagem behindDoc, como no canvas. Sem isto a capa saía sem os campos.
    if (this.model) {
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const page = pages[first.page];
        if (!page) return;
        const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          const { x, y } = r.textbox.floating
            ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
            : { x: sp.marginLeftTwips, y: first.yTwips };
          { const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, first.page, sp); }
        }
      });
    }
    return doc.build();
  }

  /**
   * Exporta XPS reaproveitando o layout. Texto vai como <Glyphs UnicodeString>
   * (o leitor shape via CMap da fonte). Bordas/sombreado de tabela e imagens
   * ficam para uma versão futura — o foco aqui é texto + paginação corretos.
   */
  exportXps(): Uint8Array {
    if (!this.model || !this.fonts) throw new Error('document not loaded');
    const T = TWIPS_PER_PT;
    const pages: XpsPage[] = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push({
        widthPt: sp.pageWidthTwips / T,
        heightPt: sp.pageHeightTwips / T,
        fills: [], lines: [], glyphs: [],
      });
    }
    const famOf = (family: string | undefined): string => this.familyFor(family);
    const colorOf = (hex: string | undefined): [number, number, number] => {
      if (!hex) return [0.13, 0.13, 0.13];
      const n = parseInt(hex, 16);
      return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
    };
    const emitParaLine = (
      page: XpsPage, pl: ParaLayout, line: LaidLine, runs: Run[],
    ): void => {
      const baselinePt = line.baselineTwips / T;
      for (const seg of line.rich.segments) {
        const span = pl.spans[seg.spanIndex];
        const run = runs[span?.runIndex ?? seg.spanIndex];
        if (!span) continue;
        const renderer = run?.custom
          ? this.inlineRenderers.get(run.custom.type)?.renderer
          : undefined;
        const txt = run?.custom
          ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
          : span.text.slice(seg.start, seg.end);
        if (!txt.trim()) continue;
        page.glyphs.push({
          text: txt,
          xPt: (line.xTwips + seg.xTwips) / T,
          baselinePt,
          fontFamily: famOf(span.family),
          variant: span.variant === 'boldItalic' ? 'boldItalic'
            : span.variant === 'bold' ? 'bold'
            : span.variant === 'italic' ? 'italic' : 'regular',
          sizePt: span.sizePt,
          colorRgb: colorOf(run?.props.color),
        });
        // sublinhado simples (best-effort)
        if (run?.props.underline) {
          const w = Math.max(0.3, span.sizePt * 0.07);
          page.lines.push({
            ax: (line.xTwips + seg.xTwips) / T,
            ay: baselinePt + span.sizePt * 0.13,
            bx: (line.xTwips + seg.xTwips + seg.widthTwips) / T,
            by: baselinePt + span.sizePt * 0.13,
            widthPt: w,
            colorRgb: colorOf(run.props.color),
          });
        }
      }
    };
    // corpo
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const para = this.model.paragraphs[line.para];
        if (!para) continue;
        const page = pages[line.page];
        if (page) emitParaLine(page, pl, line, para.runs);
      }
    }
    // tabelas — sombreado + texto das células + bordas das células (best-effort)
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (!page) continue;
      for (const sh of tl.cellShades) {
        page.fills.push({
          xPt: (tl.xTwips + sh.xTwips) / T,
          yPt: (tl.yTwips + sh.yTwips) / T,
          wPt: sh.wTwips / T,
          hPt: sh.hTwips / T,
          colorRgb: colorOf(sh.hex),
        });
      }
      for (const cr of tl.cellRects) {
        const x0 = (tl.xTwips + cr.x0) / T;
        const y0 = (tl.yTwips + cr.y0) / T;
        const x1 = (tl.xTwips + cr.x1) / T;
        const y1 = (tl.yTwips + cr.y1) / T;
        const e = (edge: { sizeEighthPt: number; color?: string; style: string } | undefined,
                   ax: number, ay: number, bx: number, by: number): void => {
          if (!edge) return;
          page.lines.push({
            ax, ay, bx, by,
            widthPt: Math.max(0.25, edge.sizeEighthPt / 8),
            colorRgb: colorOf(edge.color),
          });
        };
        e(cr.edges.top, x0, y0, x1, y0);
        e(cr.edges.bottom, x0, y1, x1, y1);
        e(cr.edges.left, x0, y0, x0, y1);
        e(cr.edges.right, x1, y0, x1, y1);
      }
      for (const cl of tl.cellLines) {
        const variant: XpsGlyphRun['variant'] = cl.bold && cl.italic ? 'boldItalic'
          : cl.bold ? 'bold' : cl.italic ? 'italic' : 'regular';
        page.glyphs.push({
          text: cl.text,
          xPt: (tl.xTwips + cl.xTwips) / T,
          baselinePt: (tl.yTwips + cl.yTwips) / T,
          fontFamily: famOf(cl.family),
          variant,
          sizePt: cl.sizePt,
          colorRgb: colorOf(cl.color),
        });
        if (cl.underline) {
          const wEm = Math.max(0.3, cl.sizePt * 0.07);
          page.lines.push({
            ax: (tl.xTwips + cl.xTwips) / T,
            ay: (tl.yTwips + cl.yTwips) / T + cl.sizePt * 0.13,
            bx: (tl.xTwips + cl.xTwips + cl.text.length * cl.sizePt * 0.5) / T,
            by: (tl.yTwips + cl.yTwips) / T + cl.sizePt * 0.13,
            widthPt: wEm,
            colorRgb: colorOf(cl.color),
          });
        }
      }
    }
    // cabeçalhos/rodapés (modo print) — laia o texto com a mesma matemática do paintHf
    if (this.view === 'print' && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg]!;
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (!section) continue;
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        const header = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
        if (header?.length) this.xpsPaintHf(page, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg);
        const footer = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
        if (footer?.length) this.xpsPaintHf(page, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg);
      }
    }
    return buildXps({ pages, fontBytes: this.fontBytes });
  }

  private xpsPaintHf(
    page: XpsPage, paras: Paragraph[],
    originXTwips: number, topYTwips: number, widthTwips: number, pageIdx: number,
  ): void {
    if (!this.fonts) return;
    const T = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    const famOf = (family: string | undefined): string => this.familyFor(family);
    let y = topYTwips;
    for (const p of paras) {
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r);
      const spans = this.buildSpans({ runs, props: p.props });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: (p.props.tabStops?.length ? p.props.tabStops : defaultTabs) as never,
      });
      const font = this.fonts.resolve(undefined, 'regular');
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * T;
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') lx += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') lx += widthTwips - line.widthTwips;
        const baselinePt = (y + lh * 0.8) / T;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          if (!span) continue;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom
            ? this.inlineRenderers.get(run.custom.type)?.renderer
            : undefined;
          const txt = run?.custom
            ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
            : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          page.glyphs.push({
            text: txt,
            xPt: (lx + seg.xTwips) / T,
            baselinePt,
            fontFamily: famOf(span.family),
            variant: span.variant === 'boldItalic' ? 'boldItalic'
              : span.variant === 'bold' ? 'bold'
              : span.variant === 'italic' ? 'italic' : 'regular',
            sizePt: span.sizePt,
            colorRgb: [0.33, 0.33, 0.33],
          });
        }
        y += lh;
      }
    }
  }

  /** Coleta todas as imagens do documento (corpo, tabelas, cabeçalhos/rodapés). */
  private collectImages(): { data: Uint8Array; ext: string }[] {
    const out: { data: Uint8Array; ext: string }[] = [];
    const fromParas = (paras: Paragraph[]): void => {
      for (const p of paras) for (const r of p.runs) if (r.image) out.push(r.image);
    };
    const fromTable = (t: TableBlock): void => {
      for (const row of t.rows) for (const c of row.cells) {
        fromParas(c.paragraphs);
        for (const nt of c.tables) fromTable(nt);
      }
    };
    if (this.model) fromParas(this.model.paragraphs);
    for (const a of this.tableAnchors) fromTable(a.table);
    if (this.fullDoc) for (const sec of this.fullDoc.sections) {
      for (const set of [sec.headers, sec.footers]) {
        for (const paras of Object.values(set)) if (Array.isArray(paras)) fromParas(paras);
      }
    }
    return out;
  }

  /** Garante que todas as imagens estejam decodificadas (createImageBitmap é async). */
  private async ensureImagesDecoded(): Promise<void> {
    await Promise.all(this.collectImages().map(async (img) => {
      const cached = this.bitmaps.get(img);
      if (cached && cached !== 'loading') return;
      try {
        const copy = new Uint8Array(img.data);
        const bmp = await createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === 'jpg' ? 'jpeg' : img.ext}` }));
        this.bitmaps.set(img, bmp);
      } catch { /* imagem inválida: vira placeholder no PDF */ }
    }));
  }

  /** Coloca os glifos de `text` em sequência usando NOSSOS advances (snap-free). */
  private pdfGlyphsAt(
    page: PdfPage, emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    family: string | undefined, variant: FontVariant, sizePt: number, color: PdfColor,
    text: string, xTwips: number, baselineTwips: number,
  ): void {
    const T = TWIPS_PER_PT;
    const sf = this.fonts!.resolve(family, variant);
    const font = emb(family, variant);
    let x = xTwips;
    const placed: PlacedGlyph[] = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const a = sf.advanceTwips(cp, sizePt);
      if (ch !== ' ' && ch !== '\t') {
        const { gid } = font.encode(cp);
        placed.push({ gid, codePoint: cp, xPt: x / T, baselineFromTopPt: baselineTwips / T });
      }
      x += a;
    }
    page.glyphs(font, deviceEmPt(sizePt), color, placed);
  }

  /** Versão PDF do paintLine: texto + decorações de parágrafo/run. */
  private pdfPaintLine(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    pl: ParaLayout, line: LaidLine,
  ): void {
    const T = TWIPS_PER_PT;
    const para = this.model!.paragraphs[line.para]!;
    const st = this.styleOf(para);

    // sombreado e bordas do parágrafo
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const colX = s.marginLeftTwips + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      const isFirst = line.rich.start === 0;
      const isLast = line.rich.end === pl.charAdvances.length;
      if (effShading) {
        const bd = effBorders;
        const exL = (bd?.left?.spacePt ?? 0) * T;
        const exR = (bd?.right?.spacePt ?? 0) * T;
        const exT = isFirst ? (bd?.top?.spacePt ?? 0) * T : 0;
        const exB = isLast ? (bd?.bottom?.spacePt ?? 0) * T : 0;
        page.fillRect((colX - exL) / T, (line.yTwips - exT) / T,
          (colW + exL + exR) / T, (line.heightTwips + exT + exB) / T, hexColor(effShading));
      }
      if (effBorders || para.props.boxBorder) {
        const fallback = para.props.boxBorder && !effBorders ? { style: 'single', sizeEighthPt: 4, spacePt: 1 } : undefined;
        const b = effBorders ?? { top: fallback, bottom: fallback, left: fallback, right: fallback };
        const spL = (b.left?.spacePt ?? 0) * T, spR = (b.right?.spacePt ?? 0) * T;
        const spT = (b.top?.spacePt ?? 0) * T, spB = (b.bottom?.spacePt ?? 0) * T;
        const x0 = colX - spL, x1 = colX + colW + spR;
        const y0 = line.yTwips - (isFirst ? spT : 0), y1 = line.yTwips + line.heightTwips + (isLast ? spB : 0);
        const edge = (
          e: { sizeEighthPt: number; color?: string; style: string } | undefined,
          ax: number, ay: number, bx: number, by: number,
        ): void => {
          if (!e) return;
          const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
          page.line(ax / T, ay / T, bx / T, by / T, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
        };
        edge(b.left, x0, y0, x0, y1);
        edge(b.right, x1, y0, x1, y1);
        if (isFirst) edge(b.top, x0, y0, x1, y0);
        if (isLast) edge(b.bottom, x0, y1, x1, y1);
      }
    }

    // marcador de lista
    if (line.marker) {
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, 'regular', 11, [0, 0, 0], line.marker.text, line.marker.xTwips, line.baselineTwips);
    }

    // texto, caractere a caractere — posições idênticas ao canvas
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex]!;
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart + i]!;
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        this.pdfGlyphsAt(
          page,
          emb,
          span.family,
          span.variant,
          span.sizePt,
          this.pdfColor(props?.color ?? st?.color),
          fallbackText,
          x,
          line.baselineTwips,
        );
        x += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        this.pdfImage(doc, page, img, x / T, (line.baselineTwips - img.heightTwips) / T, img.widthTwips / T, img.heightTwips / T);
        x += img.widthTwips;
        continue;
      }
      const sf = this.fonts!.resolve(span.family, span.variant);
      const font = emb(span.family, span.variant);
      const col = this.pdfColor(props?.color ?? st?.color);
      const baseShift =
        props?.vertAlign === 'superscript' ? -span.sizePt * 0.35 * T :
        props?.vertAlign === 'subscript' ? span.sizePt * 0.14 * T : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
      const segX0 = x;
      const placed: PlacedGlyph[] = [];
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i]!;
        let a = pl.charAdvances[gi]!;
        if (line.justifyExtraPerSpace && ch === ' ') a += line.justifyExtraPerSpace;
        // realces de fundo (como no app de referência)
        if (props?.highlight) {
          page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, hexColor((HIGHLIGHTS[props.highlight] ?? '#ffff00').replace('#', '')));
        }
        if (run?.field) page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, [0.9, 0.9, 0.9]);
        if (props?.commentIds?.length) page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, [1, 0.925, 0.72]);
        // leader pontilhado do tab (sumário)
        if (ch === '\t' && pl.tabLeaders?.get(gi)) {
          for (let dx = 60; dx < a - 40; dx += 90) {
            const cp = '.'.codePointAt(0)!;
            const { gid } = font.encode(cp);
            placed.push({ gid, codePoint: cp, xPt: (x + dx) / T, baselineFromTopPt: (line.baselineTwips + baseShift) / T });
          }
        }
        if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\f') {
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          const cp = ch.codePointAt(0)!;
          const { gid } = font.encode(cp);
          placed.push({ gid, codePoint: cp, xPt: xSnap / T, baselineFromTopPt: (line.baselineTwips + baseShift) / T });
        }
        x += a;
      }
      page.glyphs(font, deviceEmPt(span.sizePt), col, placed);

      // sublinhado / tachado
      if (props?.underline || props?.strike || props?.doubleStrike) {
        const w = x - segX0;
        const baseW = Math.max(0.5, deviceEmPt(span.sizePt) / 16);
        const drawU = (yOffTwips: number, lwPt: number, c: PdfColor, dash?: number[]): void =>
          page.line(segX0 / T, (line.baselineTwips + yOffTwips) / T, (segX0 + w) / T, (line.baselineTwips + yOffTwips) / T, c, lwPt, dash);
        if (props.underline) {
          const uc = props.underlineColor ? hexColor(props.underlineColor) : col;
          const yU = 40;
          switch (props.underlineStyle) {
            case 'double': drawU(yU, baseW, uc); drawU(yU + 12, baseW, uc); break;
            case 'thick': drawU(yU + 12, baseW * 2.2, uc); break;
            case 'dotted': drawU(yU, baseW, uc, [baseW, baseW * 1.6]); break;
            case 'dash': drawU(yU, baseW, uc, [baseW * 4, baseW * 2.5]); break;
            default: drawU(yU, baseW, uc);
          }
        }
        if (props.strike) drawU(-span.sizePt * 0.25 * T, baseW, col);
        if (props.doubleStrike) {
          const yS = -span.sizePt * 0.25 * T;
          drawU(yS - 8, baseW, col);
          drawU(yS + 8, baseW, col);
        }
      }
    }
  }

  /** Versão PDF do desenho de tabela (sombreado + bordas + texto das células). */
  private pdfPaintTable(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    tl: TableLayout,
  ): void {
    const T = TWIPS_PER_PT;
    for (const sh of tl.cellShades) {
      page.fillRect((tl.xTwips + sh.xTwips) / T, (tl.yTwips + sh.yTwips) / T, sh.wTwips / T, sh.hTwips / T, hexColor(sh.hex));
    }
    const strokeEdge = (
      e: { sizeEighthPt: number; color?: string; style: string } | undefined,
      ax: number, ay: number, bx: number, by: number,
    ): void => {
      if (!e) return;
      const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
      page.line((tl.xTwips + ax) / T, (tl.yTwips + ay) / T, (tl.xTwips + bx) / T, (tl.yTwips + by) / T,
        this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
    };
    for (const cr of tl.cellRects) {
      strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
      strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
      strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
      strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
    }
    for (const cl of tl.cellLines) {
      const variant: FontVariant = cl.bold && cl.italic ? 'boldItalic' : cl.bold ? 'bold' : cl.italic ? 'italic' : 'regular';
      this.pdfGlyphsAt(page, emb, cl.family, variant, cl.sizePt, this.pdfColor(cl.color), cl.text, tl.xTwips + cl.xTwips, tl.yTwips + cl.yTwips);
    }
  }

  /** Versão PDF do paintHf (cabeçalho/rodapé) com glifos posicionados. */
  private pdfPaintHf(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    paras: Paragraph[], originXTwips: number, topYTwips: number, widthTwips: number, pageIdx: number, sp: SectPr,
  ): void {
    if (!this.fonts) return;
    const T = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    let y = topYTwips;
    for (const p of paras) {
      const stColor = this.styleOf(p)?.color; // cor herdada do estilo (ex.: Título branco)
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r);
      // FLUTUANTES do HF (timbrado/logo/nº de página em caixa): imagem via pdfImage,
      // caixa de texto recursivamente. Sem isto o PDF sai sem a capa/rodapé.
      for (const r of runs) {
        const obj = r.textbox ?? r.image;
        if (!obj) continue;
        const { x: fx, y: fy } = obj.floating
          ? this.anchoredPos(obj, originXTwips, y, sp)
          : { x: originXTwips, y };
        if (r.textbox) {
          { const iw = this.tbInner(r.textbox, fx, fy, r.textbox.widthTwips || widthTwips);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, pageIdx, sp); }
        } else if (r.image) {
          this.pdfImage(doc, page, r.image, fx / T, fy / T, r.image.widthTwips / T, r.image.heightTwips / T);
        }
      }
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      const { lines, charAdvances } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      const spanStart: number[] = [];
      let acc = 0;
      for (const s of spans) { spanStart.push(acc); acc += s.text.length; }
      const font0 = this.fonts.resolve(undefined, 'regular');
      const fallback = p.props.boxBorder && !p.props.borders
        ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
        : undefined;
      const bd = p.props.borders ?? (fallback
        ? { top: fallback, bottom: fallback, left: fallback, right: fallback }
        : undefined);
      const strokeEdge = (
        e: { sizeEighthPt: number; color?: string; style: string } | undefined,
        ax: number, ay: number, bx: number, by: number,
      ): void => {
        if (!e) return;
        const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
        page.line(ax / T, ay / T, bx / T, by / T, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
      };
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!;
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font0, lineSize, { line: 240, lineRule: 'auto' }) * T;
        if (p.props.shadingHex) {
          page.fillRect(originXTwips / T, y / T, widthTwips / T, lh / T, hexColor(p.props.shadingHex));
        }
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') lx += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') lx += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex]!;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const font = emb(span.family, span.variant);
          const cHex = run?.props.color ?? stColor;
          const col: PdfColor = cHex ? hexColor(cHex) : [0.33, 0.33, 0.33];
          const gs = spanStart[seg.spanIndex]! + seg.start;
          let cx = lx + seg.xTwips;
          const placed: PlacedGlyph[] = [];
          for (let i = 0; i < seg.end - seg.start; i++) {
            const ch = span.text[seg.start + i]!;
            const a = charAdvances[gs + i]!;
            if (ch !== ' ' && ch !== '\t') {
              const cp = ch.codePointAt(0)!;
              const { gid } = font.encode(cp);
              placed.push({ gid, codePoint: cp, xPt: cx / T, baselineFromTopPt: baseline / T });
            }
            cx += a;
          }
          page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * T;
          const spR = (bd.right?.spacePt ?? 0) * T;
          const spT = (bd.top?.spacePt ?? 0) * T;
          const spB = (bd.bottom?.spacePt ?? 0) * T;
          const x0 = originXTwips - spL;
          const x1 = originXTwips + widthTwips + spR;
          const y0 = y - (isFirst ? spT : 0);
          const y1 = y + lh + (isLast ? spB : 0);
          strokeEdge(bd.left, x0, y0, x0, y1);
          strokeEdge(bd.right, x1, y0, x1, y1);
          if (isFirst) strokeEdge(bd.top, x0, y0, x1, y0);
          if (isLast) strokeEdge(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }

  /**
   * Embute (cacheado) e desenha uma imagem. Reencoda como JPEG e reamostra ao
   * tamanho EXIBIDO (~150 DPI), como o app de referência faz — evita PDFs gigantes (RGBA cru
   * de fotos em 4K explodia para dezenas de MB). Alpha é achatado em branco.
   */
  private pdfImage(
    doc: PdfDocument, page: PdfPage,
    img: { data: Uint8Array; ext: string }, xPt: number, yTopPt: number, wPt: number, hPt: number,
  ): void {
    const DPI = 150;
    let handle = this.pdfImgCache.get(img);
    if (handle === undefined) {
      const bmp = this.bitmapFor(img);
      if (!bmp) {
        handle = null;
      } else {
        // alvo = tamanho exibido em px na resolução-alvo, sem ampliar além do natural
        const sw = Math.max(1, Math.min(Math.round((wPt * DPI) / 72), bmp.width));
        const sh = Math.max(1, Math.min(Math.round((hPt * DPI) / 72), bmp.height));
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const cx = c.getContext('2d')!;
        cx.drawImage(bmp, 0, 0, sw, sh); // SEM fundo branco: preserva o alpha
        const rgba = cx.getImageData(0, 0, sw, sh).data;
        let hasAlpha = false;
        for (let i = 3; i < rgba.length; i += 4) { if (rgba[i] !== 255) { hasAlpha = true; break; } }
        if (hasAlpha) {
          // transparência (ex.: logo/placeholder): RGBA + SMask preserva o recorte
          handle = doc.embedRgba(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.length), sw, sh);
        } else {
          // opaco (foto): JPEG achata em branco e fica bem menor
          cx.globalCompositeOperation = 'destination-over';
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, sw, sh);
          handle = doc.embedJpeg(dataUrlToBytes(c.toDataURL('image/jpeg', 0.82)), sw, sh);
        }
      }
      this.pdfImgCache.set(img, handle);
    }
    if (handle) page.drawImage(handle, xPt, yTopPt, wPt, hPt);
    else page.fillRect(xPt, yTopPt, wPt, hPt, [0.93, 0.93, 0.93]);
  }
}

/** Converte um dataURL base64 (ex.: image/jpeg) em bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

customElements.define('universal-write', UniversalWriteElement);
