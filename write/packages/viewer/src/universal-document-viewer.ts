import {
  DocxPackage, readFullDocument, readEmbeddedFonts, isWordBinary, convertDocToDocx,
  type FullDocument, type InlineImage, type Paragraph,
} from '@universal-office/docx-core';
import { FontResolver } from '@universal-office/fonts';
import { SfntFont, loadHyphenation } from '@universal-office/docx-layout';
import {
  layoutDocument, renderPdf, withEmbeddedFonts, documentHyphenationLanguages, paintItems, paragraphAtPath,
  type LayoutOptions, type LayoutResult, type EnginePaintEnv,
} from '@universal-office/docx-layout';
import { LiveRegion, type ProgressStep } from '@universal-office/ui';
import { onBrowserLangChange, uiLang, type UiLang } from '@universal-office/ui';
import { ViewerFonts } from './fonts.js';
import { collectAnnotations, levelResolver, type Annotations } from './annotations.js';
import { fillTextLayer, TEXT_LAYER_CSS } from './text-layer.js';
import { webDocument, webPageHeight, readPagesPerView, VIEW_MODES, type ViewMode } from './views.js';
import {
  DocumentControls, CONTROL_ITEMS, CONTROLS_CSS, PROGRESS_COLOR, labelsFor,
  type ControlsHost, type ControlItem, type ZoomSpec, type Labels,
} from './controls.js';

/** Mesmas opções de layout do editor (ENGINE_LAYOUT_OPTS em universal-write.ts). */
const LAYOUT_OPTS: LayoutOptions = { hyphenationLanguages: ['pt-BR', 'en', 'es'] };
const hyphenationLangs = (full: FullDocument): string[] =>
  documentHyphenationLanguages(full).filter((l) => {
    const x = l.toLowerCase();
    return LAYOUT_OPTS.hyphenationLanguages!.some((y) => { const z = y.toLowerCase(); return x === z || x.startsWith(`${z}-`); });
  });

/** px CSS por twip (96 dpi). */
const PX_PER_TWIP = 96 / 1440;
/** Altura máxima (px CSS) de cada faixa de pintura: o canvas tem limite de tamanho
 *  e a folha do Layout da Web pode ter dezenas de milhares de px. */
const TILE_PX = 2048;
/** Larguras dos painéis: navegação (índice/páginas) à esquerda, comentários à direita. */
const NAV_W = 232;
const COMMENTS_W = 300;
/** Largura mínima que sobra para as páginas com os painéis ao lado; abaixo disso eles flutuam sobre elas. */
const MIN_PAGES_W = 360;
/** Espaço entre as páginas lado a lado no Modo de Leitura (px). */
const READ_GAP = 24;
const PANEL_BG = 'var(--udv-panel-bg, rgba(20,20,20,.94))';
const HIGHLIGHT = 'rgba(255, 187, 0, 0.28)';
const HIGHLIGHT_ACTIVE = 'rgba(255, 170, 0, 0.55)';

const CSS = `
:host { display: block; position: relative; contain: content; }
.udv-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--udv-background, var(--uo-background, #2b2b2b)); }
.udv-wrap.udv-web { background: var(--udv-web-background, #fff); }
.udv-scroll {
  position: absolute; inset: 0; overflow: auto; outline: none; scrollbar-width: thin;
  padding: var(--udv-page-gap, 16px) 0 calc(var(--uoc-s) * 3.9);
  box-sizing: border-box;
}
.udv-page {
  position: relative; margin: 0 auto var(--udv-page-gap, 16px); background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.45);
}
.udv-tile { position: absolute; left: 0; right: 0; overflow: hidden; }
.udv-tile canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
.udv-web .udv-scroll { padding: 0 0 calc(var(--uoc-s) * 3.9); }
.udv-web .udv-page { margin: 0 auto; box-shadow: none; }
.udv-read .udv-scroll { display: flex; align-items: center; justify-content: center; gap: ${READ_GAP}px; overflow: hidden; padding: 12px; }
.udv-read .udv-page { margin: 0; flex: none; }
.udv-page[data-off] { display: none; }
.udv-nav, .udv-comments {
  position: absolute; top: 0; bottom: 0; box-sizing: border-box; background: ${PANEL_BG};
  color: #e6e6e6; font: 13px/1.4 system-ui, "Segoe UI", sans-serif;
}
.udv-nav { left: 0; width: ${NAV_W}px; display: flex; flex-direction: column; }
.udv-nav[hidden], .udv-comments[hidden], .udv-nav [hidden] { display: none; }
.udv-tabs { display: flex; gap: 2px; padding: 8px 8px 0; border-bottom: 1px solid rgba(255,255,255,.12); flex: none; }
.udv-tab { all: unset; cursor: pointer; padding: 6px 10px; color: #b5b5b5; border-bottom: 2px solid transparent; }
.udv-tab:hover { color: #fff; }
.udv-tab[aria-selected="true"] { color: #fff; border-bottom-color: ${PROGRESS_COLOR}; }
.udv-tab:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: -2px; }
.udv-thumbs, .udv-outline { position: relative; flex: 1; overflow: auto; padding: 12px 0 calc(var(--uoc-s) * 3.9); scrollbar-width: thin; }
.udv-outline button {
  all: unset; box-sizing: border-box; display: block; width: calc(100% - 12px); margin: 0 6px; cursor: pointer;
  padding: 5px 10px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #d6d6d6;
}
.udv-outline button[data-level="1"] { font-weight: 600; color: #f2f2f2; }
.udv-outline button:hover { background: rgba(255,255,255,.08); }
.udv-outline button[aria-current="true"] { background: rgba(255,255,255,.16); color: #fff; }
.udv-outline button:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: -2px; }
.udv-empty { color: #9a9a9a; padding: 8px 14px; }
.udv-comments { right: 0; width: ${COMMENTS_W}px; overflow: auto; padding: 12px 12px calc(var(--uoc-s) * 3.9); scrollbar-width: thin; }
.udv-comments h2 { font: 600 13px/1.4 system-ui, "Segoe UI", sans-serif; margin: 0 2px 10px; color: #fff; }
.udv-comment {
  all: unset; display: block; box-sizing: border-box; width: 100%; cursor: pointer; margin: 0 0 8px;
  padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,.06);
  border-left: 3px solid var(--udv-comment-highlight, #f5b400);
}
.udv-comment:hover { background: rgba(255,255,255,.1); }
.udv-comment[aria-current="true"] { background: rgba(255,255,255,.17); }
.udv-comment:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: 1px; }
.udv-comment strong { display: block; font-weight: 600; margin-bottom: 3px; color: #fff; }
.udv-comment span { display: block; white-space: pre-wrap; overflow-wrap: anywhere; }
.udv-comment small { display: block; margin-top: 6px; color: #9a9a9a; }
.udv-thumb {
  all: unset; display: block; position: relative; margin: 0 auto 4px; cursor: pointer; background: #fff;
  outline: 2px solid transparent; outline-offset: 2px;
}
.udv-thumb canvas { display: block; width: 100%; height: 100%; }
.udv-thumb[aria-current="true"] { outline-color: ${PROGRESS_COLOR}; }
.udv-thumb:focus-visible { outline-color: var(--uoc-c); }
.udv-thumb + span { display: block; text-align: center; color: #ddd; font: 11px/1.4 system-ui, sans-serif; margin: 0 0 10px; }
.udv-scroll:focus-visible { outline: 2px solid var(--udv-focus-color, var(--uo-focus-color, #4ea1ff)); outline-offset: -3px; }
.udv-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #bbb; font: 14px system-ui, sans-serif; pointer-events: none; }
` + TEXT_LAYER_CSS + CONTROLS_CSS;

/** Faixa de uma página: canvas + camada de texto, de [top, top+h) px CSS. */
interface Tile { div: HTMLDivElement; canvas: HTMLCanvasElement; text: HTMLDivElement; top: number; h: number }

/**
 * <universal-document-viewer> — visualização pura de .docx (e .doc), com a
 * MESMA paginação e pintura do editor e do PDF: o motor @universal-office/docx-layout
 * diagrama, `paintItems` pinta cada página em faixas de canvas (só as visíveis).
 *
 * Modos de exibição (atributo `view`, como no Word): `print` (Layout de
 * Impressão, padrão), `read` (Modo de Leitura: páginas lado a lado, ← →) e
 * `web` (Layout da Web: o texto refeito na largura do viewer, sem folhas).
 *
 * Texto selecionável por padrão (camada de texto invisível sobre o canvas:
 * selecionar, copiar, Ctrl+F); `noselect` desliga.
 *
 * Controles no mesmo modelo do <universal-presentation-viewer>: visíveis por
 * padrão, `nocontrols` desliga todos, `no<item>` tira um a um (nav, counter,
 * outline, thumbnails, comments, zoom, view, download, print, fullscreen,
 * progress).
 *
 * Painéis: navegação à esquerda (abas Índice — os títulos do documento, pelo
 * nível de estrutura — e Páginas) e Comentários à direita (o trecho comentado
 * fica destacado na página enquanto o painel está aberto; clicar nele ou no
 * cartão seleciona o comentário).
 *
 * API: atributos `src`, `fonts` (base dos arquivos de fonte), `view`, `zoom`
 * (`page-width` | `page-fit` | percentual), `noselect`, `nocontrols`, `no<item>`;
 * `loadDocx(bytes)`, `getPageCount()`, `getPageIndex()`, `goToPage(i)`,
 * `getView()`, `setView(v)`, `setZoom(z)`, `getZoom()`, `print()`, `download()`,
 * `toggleFullscreen()`, `exportPdf()`, `getHeadings()` (índice: nível, texto,
 * página), `goToHeading(i)`, `getHeadingIndex()`, `getComments()`,
 * `selectComment(id)`.
 * Eventos: `udv-loaded`, `udv-page`, `udv-view`, `udv-heading` (título atual),
 * `udv-zoom`, `udv-comment`, `udv-error`, `udv-download` e `udv-print`
 * (canceláveis: o host trata).
 */
export class UniversalDocumentViewerElement extends HTMLElement {
  private readonly root = this.attachShadow({ mode: 'open' });
  private readonly wrap = document.createElement('div');
  private readonly scroller = document.createElement('div');
  private readonly nav = document.createElement('div');
  private readonly tabOutline = document.createElement('button');
  private readonly tabPages = document.createElement('button');
  private readonly outlineEl = document.createElement('div');
  private readonly thumbs = document.createElement('div');
  private readonly commentsEl = document.createElement('div');
  private readonly msg = document.createElement('div');
  private readonly controls: DocumentControls;
  /** anúncios para leitores de tela (página, modo, zoom, título) */
  private readonly live = new LiveRegion();
  private levelOf: (p: Paragraph) => number | undefined = () => undefined;
  private readonly fonts = new ViewerFonts(FontResolver.shared(), () => this.repaintAll());

  private fileBytes: Uint8Array | null = null;
  private full: FullDocument | null = null;
  private pkg: DocxPackage | null = null;
  private embedded: ReturnType<typeof readEmbeddedFonts> = [];
  /** layout em exibição (o do modo atual) e o de impressão (PDF/impressão em qualquer modo) */
  private layout: LayoutResult | null = null;
  private printLayoutCache: LayoutResult | null = null;
  private layoutVersion = 0;
  private pageEls: HTMLDivElement[] = [];
  private tiles: Tile[][] = [];
  private thumbEls: HTMLButtonElement[] = [];
  /** chave do que cada faixa ("página:faixa") tem pintado / com texto */
  private painted = new Map<string, string>();
  private texted = new Map<string, string>();
  private thumbPainted = new Map<number, string>();
  private paraCache = new Map<string, Paragraph | null>();
  private view: ViewMode = 'print';
  private zoomSpec: ZoomSpec = 'page-width';
  private zoomFactor = 1;
  private index = 0;
  /** Modo de Leitura: 1ª página do bloco em cena */
  private readFirst = 0;
  /** Layout da Web: largura (twips) com que o layout atual foi feito */
  private webWidthTw = 0;
  private navTab: 'outline' | 'pages' | null = null;
  private commentsOpen = false;
  private activeComment: number | null = null;
  private notes: Annotations = { comments: [], headings: [] };
  private outlineEls: HTMLButtonElement[] = [];
  private currentHeading = -1;
  /** Último título anunciado em `udv-heading`. */
  private headingIndex = -1;
  private loadSeq = 0;
  private srcUrl: string | null = null;
  private rafId = 0;
  private bitmaps = new WeakMap<object, ImageBitmap | HTMLCanvasElement | 'loading' | null>();
  private resizeObs: ResizeObserver | null = null;
  private unsubscribeFonts: (() => void) | null = null;
  private unsubscribeLang: (() => void) | null = null;
  private relayoutTimer = 0;
  private wheelLock = 0;

  static get observedAttributes(): string[] {
    return ['src', 'zoom', 'view', 'noselect', 'nocontrols', ...CONTROL_ITEMS.map((it) => `no${it}`), 'lang'];
  }

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = CSS;
    this.wrap.className = 'udv-wrap';
    this.wrap.setAttribute('part', 'viewer');
    this.scroller.className = 'udv-scroll';
    this.scroller.setAttribute('part', 'pages');
    this.scroller.tabIndex = 0;
    this.nav.className = 'udv-nav';
    this.nav.setAttribute('part', 'nav-panel');
    this.nav.hidden = true;
    const tabs = document.createElement('div');
    tabs.className = 'udv-tabs';
    tabs.setAttribute('role', 'tablist');
    for (const [t, tab] of [[this.tabOutline, 'outline'], [this.tabPages, 'pages']] as const) {
      t.type = 'button';
      t.className = 'udv-tab';
      t.setAttribute('role', 'tab');
      t.setAttribute('part', 'nav-tab');
      t.addEventListener('click', () => { this.setNav(tab); this.controls.sync(); });
      tabs.appendChild(t);
    }
    // abas (padrão ARIA): ← → trocam de aba; cada aba aponta o seu painel
    tabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      const all = [this.tabOutline, this.tabPages].filter((t) => !t.hidden);
      const at = all.indexOf(this.root.activeElement as HTMLButtonElement);
      const next = e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1]
        : all[(at + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();
    });
    this.tabOutline.id = 'udv-tab-outline';
    this.tabPages.id = 'udv-tab-pages';
    this.tabOutline.setAttribute('aria-controls', 'udv-panel-outline');
    this.tabPages.setAttribute('aria-controls', 'udv-panel-pages');
    this.outlineEl.className = 'udv-outline';
    this.outlineEl.id = 'udv-panel-outline';
    this.outlineEl.setAttribute('part', 'outline');
    this.outlineEl.setAttribute('role', 'tabpanel');
    this.outlineEl.setAttribute('aria-labelledby', 'udv-tab-outline');
    this.thumbs.className = 'udv-thumbs';
    this.thumbs.id = 'udv-panel-pages';
    this.thumbs.setAttribute('part', 'thumbnails');
    this.thumbs.setAttribute('role', 'tabpanel');
    this.thumbs.setAttribute('aria-labelledby', 'udv-tab-pages');
    this.nav.append(tabs, this.outlineEl, this.thumbs);
    this.commentsEl.className = 'udv-comments';
    this.commentsEl.setAttribute('part', 'comments');
    this.commentsEl.setAttribute('role', 'complementary');
    this.commentsEl.hidden = true;
    this.msg.className = 'udv-msg';
    this.wrap.setAttribute('role', 'region');
    this.wrap.append(this.scroller, this.nav, this.commentsEl, this.msg, this.live.el);
    this.root.append(style, this.wrap);
    this.controls = new DocumentControls(this.controlsHost(), this.root, this.wrap);

    this.scroller.addEventListener('scroll', () => { this.schedule(); this.controls.wake(); }, { passive: true });
    this.thumbs.addEventListener('scroll', () => this.schedule(), { passive: true });
    this.thumbs.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.udv-thumb');
      if (b) this.stepTo(Number(b.dataset['i']));
    });
    this.outlineEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button[data-h]');
      if (b) this.goToHeading(Number(b.dataset['h']));
    });
    this.commentsEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.udv-comment');
      if (b) this.selectComment(Number(b.dataset['id']), true);
    });
    this.scroller.addEventListener('click', this.onPageClick);
    this.wrap.addEventListener('pointermove', () => this.controls.wake());
    this.wrap.addEventListener('pointerdown', () => this.controls.wake());
    this.wrap.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.controls.leave(); });
    this.scroller.addEventListener('keydown', this.onKeyDown);
    this.wrap.addEventListener('wheel', this.onWheel, { passive: false });
  }

  connectedCallback(): void {
    this.resizeObs ??= new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(this.wrap);
    this.unsubscribeFonts ??= this.fonts.resolver.onChange(() => this.queueRelayout());
    this.unsubscribeLang ??= onBrowserLangChange(() => this.configureControls());
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.readZoomAttr();
    this.readViewAttr();
    this.wrap.classList.toggle('udv-noselect', this.hasAttribute('noselect'));
    this.configureControls();
    const src = this.getAttribute('src');
    if (src && src !== this.srcUrl) void this.loadSrc(src);
    else if (!this.layout) this.msg.textContent = '';
  }

  disconnectedCallback(): void {
    this.resizeObs?.disconnect();
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    this.unsubscribeLang?.();
    this.unsubscribeLang = null;
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    clearTimeout(this.relayoutTimer);
    this.controls.dispose();
  }

  attributeChangedCallback(name: string, oldV: string | null, newV: string | null): void {
    if (!this.isConnected) return;
    if (name === 'src') { if (newV && newV !== oldV && newV !== this.srcUrl) void this.loadSrc(newV); }
    else if (name === 'zoom') { this.readZoomAttr(); this.applyZoom(); }
    else if (name === 'view') this.readViewAttr();
    else if (name === 'noselect') {
      this.wrap.classList.toggle('udv-noselect', newV !== null);
      this.texted.clear();
      this.schedule();
    } else this.configureControls();
  }

  private configureControls(): void {
    const lang = uiLang(this);
    this.controls.configure(!this.hasAttribute('nocontrols'), CONTROL_ITEMS.filter((it) => this.hasAttribute(`no${it}`)), lang);
    const off = (it: string): boolean => this.hasAttribute('nocontrols') || this.hasAttribute(`no${it}`);
    if (this.navTab && off(this.navTab === 'pages' ? 'thumbnails' : 'outline')) {
      const other = this.navTab === 'pages' ? 'outline' : 'pages';
      this.setNav(!off(other === 'pages' ? 'thumbnails' : 'outline') && (other === 'pages' || this.notes.headings.length) ? other : null);
    }
    if (off('comments')) this.setComments(false);
    this.labelPanels(lang);
    this.nameRegion();
  }

  /** Nome da região do viewer (o arquivo) e de cada página, para o leitor de tela. */
  private nameRegion(): void {
    const L = this.labels();
    const file = this.fileName();
    this.wrap.setAttribute('aria-label', file ? `${L.document}: ${file}` : L.document);
    this.scroller.setAttribute('role', 'region');
    this.scroller.setAttribute('aria-label', L.pagesArea);
    const n = this.pageEls.length;
    this.pageEls.forEach((el, i) => {
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', this.view === 'web' ? L.document : L.pageOf(i + 1, n));
    });
  }

  private fileName(): string | null {
    const src = this.getAttribute('src');
    try { return src ? decodeURIComponent(src.split(/[?#]/)[0]!.split('/').pop() ?? '') || null : null; } catch { return null; }
  }

  private announce(text: string): void { this.live.announce(text); }

  /** "Página 3 de 12" / "Páginas 1–2 de 12" / "40%" — a posição para o leitor de tela. */
  private positionText(): string {
    const L = this.labels(), total = this.getPageCount();
    if (!total) return '';
    if (this.view === 'web') return `${Math.round(this.scrollFraction() * 100)}%`;
    if (this.view === 'read') return this.positionTextAt(this.readFirst);
    return L.pageOf(this.index + 1, total);
  }

  private positionTextAt(page: number): string {
    const L = this.labels(), total = this.getPageCount(), per = this.readN();
    const first = Math.floor(page / per) * per, last = Math.min(total, first + per);
    return last > first + 1 ? L.pagesOf(first + 1, last, total) : L.pageOf(first + 1, total);
  }

  private readZoomAttr(): void {
    const z = (this.getAttribute('zoom') ?? '').trim().toLowerCase();
    if (z === 'page-fit' || z === 'page-width') this.zoomSpec = z;
    else if (/^\d+(\.\d+)?%?$/.test(z)) this.zoomSpec = Math.max(0.1, Math.min(8, parseFloat(z) / 100));
  }

  private readViewAttr(): void {
    const v = (this.getAttribute('view') ?? '').trim().toLowerCase();
    this.setView((VIEW_MODES as readonly string[]).includes(v) ? v as ViewMode : 'print');
  }

  // ───────────────────────── carga e layout ─────────────────────────

  private async loadSrc(url: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.srcUrl = url;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (seq !== this.loadSeq) return;
      await this.loadDocx(bytes);
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.dispatchEvent(new CustomEvent('udv-error', { detail: { src: url, error } }));
    }
  }

  /** Carrega um .docx (ou .doc). Arquivo inválido LANÇA e o documento atual fica. */
  async loadDocx(bytes: Uint8Array): Promise<void> {
    const docx = isWordBinary(bytes) ? convertDocToDocx(bytes) : bytes;
    const pkg = DocxPackage.load(docx);
    const full = readFullDocument(pkg);
    const seq = ++this.loadSeq;
    this.srcUrl = this.getAttribute('src');
    this.fileBytes = bytes;
    this.pkg = pkg;
    this.full = full;
    this.embedded = [];
    try { this.embedded = readEmbeddedFonts(pkg); } catch { /* fontes embutidas ilegíveis */ }
    this.printLayoutCache = null;
    this.layout = null;
    this.index = 0;
    this.readFirst = 0;
    this.scroller.scrollTop = 0;
    await this.relayout(seq);
    if (seq !== this.loadSeq) return;
    this.dispatchEvent(new CustomEvent('udv-loaded', { detail: { pages: this.getPageCount() } }));
  }

  /** O documento que o motor diagrama no modo atual. */
  private docForView(): FullDocument {
    if (this.view !== 'web') return this.full!;
    this.webWidthTw = this.webTargetTw();
    return webDocument(this.full!, this.webWidthTw);
  }

  /** Layout da Web: a largura do texto acompanha a do viewer (no zoom atual). */
  private webTargetTw(): number {
    const z = typeof this.zoomSpec === 'number' ? this.zoomSpec : 1;
    return this.availWidth() / (PX_PER_TWIP * z);
  }

  /** Diagrama o documento atual; repete enquanto o motor pede fontes que chegam. */
  private async relayout(seq = this.loadSeq): Promise<void> {
    const full = this.full;
    if (!full) return;
    await this.fonts.loadAssets(this.getAttribute('fonts'));
    try { await loadHyphenation(hyphenationLangs(full)); } catch { /* sem padrões: sem hifenização */ }
    for (let pass = 0; pass < 4; pass++) {
      if (seq !== this.loadSeq || this.full !== full) return;
      const res = layoutDocument(this.docForView(), this.provider(), LAYOUT_OPTS);
      if (this.view !== 'web') this.printLayoutCache = res;
      this.setLayout(res);
      if (!(await this.fonts.loadMissing())) break;
      this.printLayoutCache = null; // chegaram fontes: o de impressão também muda
    }
  }

  private provider(): ReturnType<typeof withEmbeddedFonts> {
    return withEmbeddedFonts(this.fonts.provider(), this.embedded, (b) => new SfntFont(b));
  }

  private queueRelayout(delay = 50): void {
    clearTimeout(this.relayoutTimer);
    this.relayoutTimer = window.setTimeout(() => { void this.relayout(); }, delay);
  }

  /** Layout de impressão (PDF/impressão em qualquer modo de exibição). */
  private printLayout(): LayoutResult | null {
    if (!this.full) return null;
    if (this.view !== 'web' && this.layout) return this.layout;
    return (this.printLayoutCache ??= layoutDocument(this.full, this.provider(), LAYOUT_OPTS));
  }

  private setLayout(res: LayoutResult): void {
    const keepFrac = this.layout && this.view !== 'read' ? this.scrollFraction() : 0;
    this.layout = res;
    this.layoutVersion++;
    this.painted.clear();
    this.texted.clear();
    this.thumbPainted.clear();
    this.paraCache.clear();
    this.msg.textContent = '';
    const n = res.pages.length;
    while (this.pageEls.length > n) { this.pageEls.pop()!.remove(); this.tiles.pop(); }
    while (this.pageEls.length < n) {
      const d = document.createElement('div');
      d.className = 'udv-page';
      d.setAttribute('part', 'page');
      this.scroller.appendChild(d);
      this.pageEls.push(d);
      this.tiles.push([]);
    }
    this.headingIndex = -2; // anuncia de novo o título atual no documento novo
    this.notes = this.full ? collectAnnotations(this.full, res) : { comments: [], headings: [] };
    this.levelOf = this.full ? levelResolver(this.full) : () => undefined;
    this.nameRegion();
    if (this.activeComment !== null && !this.notes.comments.some((c) => c.id === this.activeComment)) this.activeComment = null;
    this.buildThumbs();
    this.buildOutline();
    this.buildComments();
    if (this.navTab === 'outline' && !this.notes.headings.length) this.setNav(null);
    if (this.navTab === 'pages' && this.view === 'web') this.setNav(null);
    if (this.commentsOpen && !this.notes.comments.length) this.setComments(false);
    this.applyZoom(false);
    if (keepFrac) this.scrollToFraction(keepFrac);
  }

  // ───────────────────────── modos de exibição ─────────────────────────

  getView(): ViewMode { return this.view; }

  /** Layout de Impressão, Modo de Leitura ou Layout da Web (mantém a página atual). */
  setView(v: ViewMode): void {
    if (v === this.view) return;
    const prev = this.view;
    const page = this.index;
    this.view = v;
    this.wrap.classList.toggle('udv-read', v === 'read');
    this.wrap.classList.toggle('udv-web', v === 'web');
    if (v === 'web' && this.navTab === 'pages') this.setNav(null);
    this.dispatchEvent(new CustomEvent('udv-view', { detail: { view: v } }));
    this.announce(this.labels()[v]);
    if (!this.full) return;
    if (v === 'web' || prev === 'web') {
      // outro layout: o de impressão volta do cache; o da Web é refeito na largura atual
      if (v !== 'web' && this.printLayoutCache) {
        this.setLayout(this.printLayoutCache);
        this.goToPage(page, false, false);
      } else {
        this.layout = null;
        void this.relayout();
      }
    } else {
      this.readFirst = page;
      this.applyZoom(false);
      if (v === 'print') this.goToPage(page, false, false);
    }
    this.controls.sync();
  }

  // ───────────────────────── zoom e geometria ─────────────────────────

  /** Altura EXIBIDA da página (twips): no Layout da Web, até o fim do texto. */
  private pageHeightTw(i: number): number {
    const p = this.layout!.pages[i]!;
    return this.view === 'web' ? webPageHeight(p) : p.heightTw;
  }

  private maxPageWidthTw(): number {
    return Math.max(1, ...(this.layout?.pages.map((p) => p.widthTw) ?? [12240]));
  }

  /** Largura (px) disponível para as páginas, sem os painéis ao lado e as margens. */
  private availWidth(): number {
    const { left, right } = this.reserved();
    const pad = this.view === 'web' ? 0 : this.view === 'read' ? 24 : 32;
    return Math.max(200, this.scroller.clientWidth - left - right - pad);
  }

  /** Páginas por bloco no Modo de Leitura. */
  private readN(): number { return readPagesPerView(this.availWidth()); }

  private computeZoom(): number {
    if (this.view === 'web') return typeof this.zoomSpec === 'number' ? this.zoomSpec : 1;
    const avail = this.availWidth();
    if (this.view === 'read') {
      // o bloco inteiro cabe na tela (como o modo Leitura do editor)
      const n = this.readN();
      const pw = this.maxPageWidthTw() * PX_PER_TWIP;
      const ph = Math.max(1, ...(this.layout?.pages.map((p) => p.heightTw) ?? [15840])) * PX_PER_TWIP;
      return Math.max(0.1, Math.min((avail - READ_GAP * (n - 1)) / (n * pw), (this.scroller.clientHeight - 24) / ph));
    }
    if (typeof this.zoomSpec === 'number') return this.zoomSpec;
    const wFit = avail / (this.maxPageWidthTw() * PX_PER_TWIP);
    if (this.zoomSpec === 'page-width') return Math.max(0.1, wFit);
    const p = this.layout?.pages[this.index] ?? this.layout?.pages[0];
    const hFit = p ? (this.scroller.clientHeight - 32) / (p.heightTw * PX_PER_TWIP) : wFit;
    return Math.max(0.1, Math.min(wFit, hFit));
  }

  /** Painéis ao lado das páginas (reservam largura) ou, sem espaço, flutuando sobre elas. */
  private reserved(): { left: number; right: number } {
    const left = this.navTab ? NAV_W : 0, right = this.commentsOpen ? COMMENTS_W : 0;
    return this.wrap.clientWidth - left - right >= MIN_PAGES_W ? { left, right } : { left: 0, right: 0 };
  }

  /** Viewer estreito: só cabe um painel por vez (abrir um fecha o outro). */
  private narrow(): boolean { return this.wrap.clientWidth < NAV_W + COMMENTS_W + MIN_PAGES_W; }

  /** Recalcula o fator e o tamanho das páginas (e o bloco do Modo de Leitura), mantendo a posição. */
  private applyZoom(keep = true): void {
    if (!this.layout) return;
    const anchor = keep && this.view !== 'read' ? this.anchor() : null;
    const { left, right } = this.reserved();
    this.scroller.style.paddingLeft = left ? `${left}px` : '';
    this.scroller.style.paddingRight = right ? `${right}px` : '';
    // Layout da Web: largura mudou (painéis, janela, zoom) → refaz o texto nela
    if (this.view === 'web' && Math.abs(this.webTargetTw() - this.webWidthTw) > 60) this.queueRelayout(120);
    const z = this.computeZoom();
    const changed = Math.abs(z - this.zoomFactor) > 1e-4;
    this.zoomFactor = z;
    const n = this.readN(), total = this.layout.pages.length;
    if (this.view === 'read') this.readFirst = Math.max(0, Math.min(this.readFirst, total - 1));
    this.layout.pages.forEach((p, i) => {
      const el = this.pageEls[i]!;
      const w = Math.round(p.widthTw * PX_PER_TWIP * z), h = Math.round(this.pageHeightTw(i) * PX_PER_TWIP * z);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.background = p.background ? `#${p.background}` : '';
      const off = this.view === 'read' && (i < this.readFirst || i >= this.readFirst + n);
      if (off) el.setAttribute('data-off', ''); else el.removeAttribute('data-off');
      this.layoutTiles(i, h);
    });
    if (anchor) this.restoreAnchor(anchor);
    if (changed) this.dispatchEvent(new CustomEvent('udv-zoom', { detail: { zoom: this.zoomSpec, factor: z } }));
    this.schedule();
  }

  /** Faixas da página `i` para a altura `h` (px CSS). */
  private layoutTiles(i: number, h: number): void {
    const el = this.pageEls[i]!, list = this.tiles[i]!;
    const count = Math.max(1, Math.ceil(h / TILE_PX));
    while (list.length > count) list.pop()!.div.remove();
    while (list.length < count) {
      const div = document.createElement('div');
      div.className = 'udv-tile';
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true'); // o desenho; o conteúdo vem da camada de texto
      const text = document.createElement('div');
      text.className = 'udv-text';
      div.append(canvas, text);
      el.appendChild(div);
      list.push({ div, canvas, text, top: 0, h: 0 });
    }
    list.forEach((t, k) => {
      t.top = k * TILE_PX;
      t.h = Math.min(TILE_PX, h - t.top);
      t.div.style.top = `${t.top}px`;
      t.div.style.height = `${t.h}px`;
    });
  }

  /** Página + posição relativa nela (para o zoom não "pular"). */
  private anchor(): { i: number; f: number } | null {
    const el = this.pageEls[this.index];
    if (!el) return null;
    return { i: this.index, f: (this.scroller.scrollTop - el.offsetTop) / Math.max(1, el.offsetHeight) };
  }

  private restoreAnchor(a: { i: number; f: number }): void {
    const el = this.pageEls[a.i];
    if (el) this.scroller.scrollTop = el.offsetTop + a.f * el.offsetHeight;
  }

  /** Redimensionou: painéis, bloco de leitura e a largura do Layout da Web se reajustam. */
  private onResize(): void { this.applyZoom(); }

  // ───────────────────────── pintura (só o visível) ─────────────────────────

  private schedule(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => { this.rafId = 0; this.update(); });
  }

  private repaintAll(): void {
    this.painted.clear();
    this.thumbPainted.clear();
    this.schedule();
  }

  private paintEnv(): EnginePaintEnv {
    return {
      fontOf: (face) => this.fonts.cssOf(face),
      image: (img) => this.bitmapFor(img),
      color: (hex) => `#${hex}`,
    };
  }

  private para = (ref: string): Paragraph | null => {
    let p = this.paraCache.get(ref);
    if (p === undefined) {
      p = this.full && /^b\d/.test(ref) ? paragraphAtPath(this.full.blocks, ref.split('/')) : null;
      this.paraCache.set(ref, p);
    }
    return p;
  };

  private update(): void {
    const res = this.layout;
    if (!res) return;
    const s = this.scroller;
    const top = s.scrollTop, bottom = top + s.clientHeight;
    // página atual: no Modo de Leitura, a 1ª do bloco; senão a última cujo topo passou do 1º terço
    let cur = 0;
    if (this.view === 'read') cur = this.readFirst;
    else {
      for (let i = 0; i < this.pageEls.length; i++) {
        if (this.pageEls[i]!.offsetTop <= top + s.clientHeight / 3) cur = i; else break;
      }
    }
    if (cur !== this.index) {
      this.index = cur;
      this.dispatchEvent(new CustomEvent('udv-page', { detail: { index: cur } }));
    }
    const dpr = window.devicePixelRatio || 1;
    const key = `${this.layoutVersion}|${this.zoomFactor.toFixed(4)}|${dpr}|${this.commentsOpen ? this.activeComment ?? 'c' : ''}`;
    const textKey = `${this.layoutVersion}|${this.zoomFactor.toFixed(4)}`;
    const selectable = !this.hasAttribute('noselect');
    const margin = s.clientHeight;
    for (let i = 0; i < this.pageEls.length; i++) {
      const el = this.pageEls[i]!;
      const shown = !el.hasAttribute('data-off');
      for (let k = 0; k < this.tiles[i]!.length; k++) {
        const t = this.tiles[i]![k]!;
        const id = `${i}:${k}`;
        const y0 = el.offsetTop + t.top;
        const visible = shown && (this.view === 'read' || (y0 + t.h >= top - margin && y0 <= bottom + margin));
        const simple = `${textKey}|s`, detailed = `${textKey}|${selectable ? 'd' : 's'}`;
        if (!visible) {
          if (this.painted.has(id)) { t.canvas.width = t.canvas.height = 0; this.painted.delete(id); }
          // fora de cena: o texto continua (simples) para o leitor de tela ler o documento todo
          if (shown && this.texted.get(id) !== simple) { this.fillText(i, t, false); this.texted.set(id, simple); }
          continue;
        }
        if (this.painted.get(id) !== key) { this.paintTile(i, t, dpr); this.painted.set(id, key); }
        if (this.texted.get(id) !== detailed) { this.fillText(i, t, selectable); this.texted.set(id, detailed); }
      }
    }
    if (this.navTab === 'pages') this.updateThumbs();
    this.syncThumbCurrent();
    this.syncHeadingCurrent();
    this.controls.sync();
  }

  /** px CSS por twip da página `i` no zoom atual. */
  private pxPerTw(i: number): number {
    const p = this.layout!.pages[i]!;
    return Math.round(p.widthTw * PX_PER_TWIP * this.zoomFactor) / p.widthTw;
  }

  /** Pinta uma faixa da página (fundo + itens do motor + trechos comentados). */
  private paintTile(i: number, t: Tile, dpr: number): void {
    const p = this.layout!.pages[i]!;
    const k = this.pxPerTw(i);
    const w = Math.max(1, Math.round(p.widthTw * k * dpr)), h = Math.max(1, Math.round(t.h * dpr));
    this.drawPage(i, t.canvas, w, h, (w / p.widthTw), t.top / k, true);
  }

  /**
   * Desenha a página `i` num canvas `w×h` (px do dispositivo), escala `sc`
   * (px/twip) e começando em `topTw` (a faixa).
   */
  private drawPage(i: number, cv: HTMLCanvasElement, w: number, h: number, sc: number, topTw: number, highlights: boolean): void {
    const p = this.layout!.pages[i]!;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = p.background ? `#${p.background}` : '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(sc, 0, 0, sc, 0, -topTw * sc);
    try { paintItems(ctx, p.items, this.paintEnv()); } catch { /* item que o pintor não conhece: o resto fica */ }
    // trechos comentados (só com o painel de comentários aberto — a página impressa não os tem)
    if (highlights && this.commentsOpen) {
      for (const c of this.notes.comments) {
        ctx.fillStyle = c.id === this.activeComment ? HIGHLIGHT_ACTIVE : HIGHLIGHT;
        for (const r of c.rects) if (r.page === i) ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    }
  }

  /** Camada de texto selecionável da faixa: as linhas que começam nela. */
  private fillText(i: number, t: Tile, detailed: boolean): void {
    const p = this.layout!.pages[i]!;
    const k = this.pxPerTw(i);
    const top = t.top / k, bottom = (t.top + t.h) / k;
    fillTextLayer(t.text, p.lines.filter((l) => l.y >= top && l.y < bottom), this.para, this.levelOf, k, top, detailed);
  }

  /** Imagem decodificada (o vetor SVG, como o Word, quando houver). */
  private bitmapFor(img: InlineImage): CanvasImageSource | null {
    const c = this.bitmaps.get(img);
    if (c === 'loading' || c === null) return null;
    if (c) return c;
    this.bitmaps.set(img, 'loading');
    const done = (b: ImageBitmap | HTMLCanvasElement | null): void => { this.bitmaps.set(img, b); if (b) this.repaintAll(); };
    const svg = (img as { svg?: Uint8Array }).svg;
    if (svg) {
      const url = URL.createObjectURL(new Blob([new Uint8Array(svg)], { type: 'image/svg+xml' }));
      const el = new Image();
      el.onload = () => {
        try {
          const SS = 3;
          const wt = (img as { widthTwips?: number }).widthTwips, ht = (img as { heightTwips?: number }).heightTwips;
          const oc = document.createElement('canvas');
          oc.width = Math.min(4096, Math.max(1, Math.round((wt ?? el.width / PX_PER_TWIP) * PX_PER_TWIP * SS)));
          oc.height = Math.min(4096, Math.max(1, Math.round((ht ?? el.height / PX_PER_TWIP) * PX_PER_TWIP * SS)));
          oc.getContext('2d')!.drawImage(el, 0, 0, oc.width, oc.height);
          done(oc);
        } catch { done(null); }
        URL.revokeObjectURL(url);
      };
      el.onerror = () => { URL.revokeObjectURL(url); done(null); };
      el.src = url;
      return null;
    }
    const ext = img.ext === 'jpg' ? 'jpeg' : img.ext;
    void createImageBitmap(new Blob([new Uint8Array(img.data)], { type: `image/${ext}` })).then(done, () => done(null));
    return null;
  }

  // ───────────────────────── miniaturas ─────────────────────────

  private buildThumbs(): void {
    const n = this.view === 'web' ? 0 : this.layout?.pages.length ?? 0;
    this.thumbs.textContent = '';
    this.thumbEls = [];
    for (let i = 0; i < n; i++) {
      const p = this.layout!.pages[i]!;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'udv-thumb';
      b.setAttribute('part', 'thumbnail');
      b.dataset['i'] = String(i);
      const w = 84, h = Math.round(w * p.heightTw / p.widthTw);
      b.style.width = `${w}px`; b.style.height = `${h}px`;
      b.appendChild(document.createElement('canvas'));
      const num = document.createElement('span');
      num.textContent = String(i + 1);
      this.thumbs.append(b, num);
      this.thumbEls.push(b);
    }
    this.labelPanels();
  }

  private labels(lang?: UiLang): Labels { return labelsFor(lang ?? uiLang(this)); }

  /** Rótulos dos painéis no idioma atual (abas, miniaturas, vazios). */
  private labelPanels(lang?: UiLang): void {
    const L = this.labels(lang);
    this.tabOutline.textContent = L.outline;
    this.tabPages.textContent = L.pages;
    this.thumbEls.forEach((b, i) => b.setAttribute('aria-label', `${L.page} ${i + 1}`));
    this.buildOutline();
    this.buildComments();
  }

  private updateThumbs(): void {
    const s = this.thumbs, top = s.scrollTop, bottom = top + s.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const key = `${this.layoutVersion}|${dpr}`;
    for (let i = 0; i < this.thumbEls.length; i++) {
      const el = this.thumbEls[i]!;
      if (el.offsetTop + el.offsetHeight < top - 200 || el.offsetTop > bottom + 200) continue;
      if (this.thumbPainted.get(i) === key) continue;
      const p = this.layout!.pages[i]!;
      const w = Math.max(1, Math.round(el.offsetWidth * dpr)), h = Math.max(1, Math.round(el.offsetHeight * dpr));
      this.drawPage(i, el.firstElementChild as HTMLCanvasElement, w, h, w / p.widthTw, 0, false);
      this.thumbPainted.set(i, key);
    }
  }

  private syncThumbCurrent(): void {
    const n = this.view === 'read' ? this.readN() : 1;
    this.thumbEls.forEach((t, i) => {
      const cur = i >= this.index && i < this.index + n;
      if ((t.getAttribute('aria-current') === 'true') === cur) return;
      t.setAttribute('aria-current', String(cur));
      if (cur && i === this.index && this.navTab === 'pages') {
        const s = this.thumbs;
        if (t.offsetTop < s.scrollTop) s.scrollTop = t.offsetTop - 12;
        else if (t.offsetTop + t.offsetHeight > s.scrollTop + s.clientHeight) s.scrollTop = t.offsetTop + t.offsetHeight - s.clientHeight + 40;
      }
    });
  }

  /** Abre o painel de navegação numa aba (índice ou páginas) ou fecha (null). */
  private setNav(tab: 'outline' | 'pages' | null): void {
    if (tab === this.navTab) return;
    const widthChanged = !tab !== !this.navTab;
    if (tab && !this.navTab && this.commentsOpen && this.narrow()) this.setComments(false);
    this.navTab = tab;
    this.nav.hidden = !tab;
    this.wrap.classList.toggle('udv-nav-open', !!tab);
    this.tabOutline.hidden = this.hasAttribute('nooutline') || !this.notes.headings.length;
    this.tabPages.hidden = this.hasAttribute('nothumbnails') || this.view === 'web';
    this.tabOutline.setAttribute('aria-selected', String(tab === 'outline'));
    this.tabPages.setAttribute('aria-selected', String(tab === 'pages'));
    // só a aba selecionada entra no Tab; as setas andam entre elas
    this.tabOutline.tabIndex = tab === 'outline' ? 0 : -1;
    this.tabPages.tabIndex = tab === 'pages' ? 0 : -1;
    this.outlineEl.hidden = tab !== 'outline';
    this.thumbs.hidden = tab !== 'pages';
    for (const t of this.thumbEls) t.removeAttribute('aria-current');
    this.currentHeading = -1;
    if (widthChanged) this.applyZoom(); else this.schedule();
  }

  private setComments(open: boolean): void {
    if (open === this.commentsOpen) return;
    if (open && this.navTab && this.narrow()) this.setNav(null);
    this.commentsOpen = open;
    this.commentsEl.hidden = !open;
    this.wrap.classList.toggle('udv-comments-open', open);
    this.applyZoom();
    this.repaintAll();
  }

  // ───────────────────────── índice (títulos) ─────────────────────────

  private buildOutline(): void {
    const L = this.labels();
    this.outlineEl.textContent = '';
    this.outlineEls = [];
    this.currentHeading = -1;
    if (!this.notes.headings.length) {
      const p = document.createElement('div');
      p.className = 'udv-empty';
      p.textContent = L.noHeadings;
      this.outlineEl.appendChild(p);
      return;
    }
    const minLevel = Math.min(...this.notes.headings.map((h) => h.level));
    this.notes.headings.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('part', 'outline-item');
      b.dataset['h'] = String(i);
      b.dataset['level'] = String(h.level - minLevel + 1);
      b.style.paddingLeft = `${10 + (h.level - minLevel) * 14}px`;
      b.textContent = h.text;
      b.title = h.text;
      this.outlineEl.appendChild(b);
      this.outlineEls.push(b);
    });
  }

  /** Posição (px no rolador) de um ponto da página. */
  private pageY(page: number, yTw: number): number {
    const el = this.pageEls[page];
    if (!el || !this.layout?.pages[page]) return 0;
    return el.offsetTop + yTw * (el.offsetHeight / this.pageHeightTw(page));
  }

  /** Leva um ponto da página à vista (no Modo de Leitura, o bloco que contém a página). */
  private reveal(page: number, yTw: number, offsetPx: number): void {
    if (this.view === 'read') { this.goToPage(page, true, false); return; }
    this.scroller.scrollTo({ top: Math.max(0, this.pageY(page, yTw) - offsetPx), behavior: 'smooth' });
  }

  /** Vai ao título `i` do índice (posição em `getHeadings()`). */
  goToHeading(i: number): void {
    const h = this.notes.headings[i];
    if (!h) return;
    this.reveal(h.page, h.y, 24);
    this.announce(this.view === 'web' ? h.text : `${h.text} — ${this.labels().pageOf(h.page + 1, this.getPageCount())}`);
  }

  /** Índice do título atual (o último que passou do 1º terço da janela); −1 = antes do 1º / sem títulos. */
  getHeadingIndex(): number {
    let cur = -1;
    if (this.view === 'read') {
      const last = this.readFirst + this.readN() - 1;
      this.notes.headings.forEach((h, i) => { if (h.page <= last && (h.page <= this.readFirst || cur < 0)) cur = i; });
      return cur;
    }
    const mark = this.scroller.scrollTop + this.scroller.clientHeight / 3;
    this.notes.headings.forEach((h, i) => { if (this.pageY(h.page, h.y) <= mark) cur = i; });
    return cur;
  }

  /** Título atual: evento `udv-heading` (com ou sem painel) e destaque no índice. */
  private syncHeadingCurrent(): void {
    const cur = this.getHeadingIndex();
    if (cur !== this.headingIndex) {
      this.headingIndex = cur;
      const h = this.notes.headings[cur];
      this.dispatchEvent(new CustomEvent('udv-heading', { detail: { index: cur, ...(h ? { level: h.level, text: h.text, page: h.page } : {}) } }));
    }
    if (this.navTab !== 'outline' || !this.outlineEls.length) return;
    const shown = Math.max(0, cur);
    if (shown === this.currentHeading) return;
    this.outlineEls[this.currentHeading]?.removeAttribute('aria-current');
    this.currentHeading = shown;
    const b = this.outlineEls[shown]!;
    b.setAttribute('aria-current', 'true');
    const s = this.outlineEl;
    if (b.offsetTop < s.scrollTop) s.scrollTop = b.offsetTop - 12;
    else if (b.offsetTop + b.offsetHeight > s.scrollTop + s.clientHeight) s.scrollTop = b.offsetTop + b.offsetHeight - s.clientHeight + 40;
  }

  // ───────────────────────── comentários ─────────────────────────

  private buildComments(): void {
    const L = this.labels();
    this.commentsEl.textContent = '';
    const h = document.createElement('h2');
    h.textContent = L.comments;
    this.commentsEl.appendChild(h);
    if (!this.notes.comments.length) {
      const p = document.createElement('div');
      p.className = 'udv-empty';
      p.textContent = L.noComments;
      this.commentsEl.appendChild(p);
      return;
    }
    for (const c of this.notes.comments) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'udv-comment';
      b.setAttribute('part', 'comment');
      b.dataset['id'] = String(c.id);
      if (c.author) { const a = document.createElement('strong'); a.textContent = c.author; b.appendChild(a); }
      const t = document.createElement('span');
      t.textContent = c.text;
      b.appendChild(t);
      if (c.rects[0] && this.view !== 'web') { const sm = document.createElement('small'); sm.textContent = `${L.page} ${c.rects[0].page + 1}`; b.appendChild(sm); }
      if (c.id === this.activeComment) b.setAttribute('aria-current', 'true');
      this.commentsEl.appendChild(b);
    }
  }

  /** Destaca o comentário (no painel e na página); `scroll` = leva a página até o trecho. */
  selectComment(id: number, scroll = false): void {
    const c = this.notes.comments.find((x) => x.id === id);
    if (!c) return;
    if (!this.commentsOpen) this.setComments(true);
    this.activeComment = id;
    for (const el of this.commentsEl.querySelectorAll<HTMLElement>('.udv-comment')) {
      const cur = Number(el.dataset['id']) === id;
      if (cur) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
      if (cur && !scroll) {
        const s = this.commentsEl;
        if (el.offsetTop < s.scrollTop || el.offsetTop + el.offsetHeight > s.scrollTop + s.clientHeight) s.scrollTop = el.offsetTop - 40;
      }
    }
    const r = c.rects[0];
    if (scroll && r) this.reveal(r.page, r.y, this.scroller.clientHeight / 3);
    this.dispatchEvent(new CustomEvent('udv-comment', { detail: { id, author: c.author, text: c.text } }));
    this.repaintAll();
  }

  /** Clique no trecho comentado (painel aberto): seleciona o comentário. */
  private onPageClick = (e: MouseEvent): void => {
    if (!this.commentsOpen) return;
    const sel = (this.root as unknown as { getSelection?: () => Selection | null }).getSelection?.() ?? document.getSelection();
    if (sel && !sel.isCollapsed) return; // terminou uma seleção de texto: não é clique
    const el = (e.target as HTMLElement).closest<HTMLElement>('.udv-page');
    const page = el ? this.pageEls.indexOf(el as HTMLDivElement) : -1;
    const p = this.layout?.pages[page];
    if (!el || !p) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * p.widthTw, y = (e.clientY - rect.top) / rect.height * this.pageHeightTw(page);
    for (const c of this.notes.comments) {
      if (c.rects.some((r) => r.page === page && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) { this.selectComment(c.id); return; }
    }
  };

  // ───────────────────────── API ─────────────────────────

  getPageCount(): number { return this.layout?.pages.length ?? 0; }
  getPageIndex(): number { return this.index; }

  /** Títulos do documento (nível 1–9, texto, página no modo atual); a posição é o `i` de goToHeading. */
  getHeadings(): { level: number; text: string; page: number }[] {
    return this.notes.headings.map((h) => ({ level: h.level, text: h.text, page: h.page }));
  }

  /** Comentários na ordem de leitura (autor, texto, página do trecho; null = sem âncora visível). */
  getComments(): { id: number; author?: string; text: string; page: number | null }[] {
    return this.notes.comments.map((c) => ({ id: c.id, ...(c.author ? { author: c.author } : {}), text: c.text, page: c.rects[0]?.page ?? null }));
  }

  /** Vai à página `i` (no Modo de Leitura, ao bloco que a contém) e anuncia o destino. */
  goToPage(i: number, smooth = true, announce = true): void {
    const n = this.getPageCount();
    if (!n) return;
    const page = Math.max(0, Math.min(n - 1, i));
    if (announce && this.view !== 'web') this.announce(this.view === 'read' ? this.positionTextAt(page) : this.labels().pageOf(page + 1, n));
    if (this.view === 'read') {
      const per = this.readN();
      const first = Math.floor(page / per) * per;
      if (first !== this.readFirst) { this.readFirst = first; this.applyZoom(false); }
      return;
    }
    const el = this.pageEls[page];
    if (el) this.scroller.scrollTo({ top: el.offsetTop - 16, behavior: smooth ? 'smooth' : 'auto' });
  }

  /** `page-width`, `page-fit` ou fator (1 = 100%). No Modo de Leitura o ajuste é sempre à tela. */
  setZoom(z: ZoomSpec): void {
    this.zoomSpec = typeof z === 'number' ? Math.max(0.1, Math.min(8, z)) : z;
    this.applyZoom();
    this.controls.sync();
  }

  getZoom(): { spec: ZoomSpec; factor: number } { return { spec: this.zoomSpec, factor: this.zoomFactor }; }

  /** PDF do layout de IMPRESSÃO (o pintor de referência do motor), em qualquer modo de exibição. */
  exportPdf(): Uint8Array {
    const lay = this.printLayout();
    if (!lay) throw new Error('document not loaded');
    return renderPdf(lay);
  }

  /** Imprime pelo PDF do motor (não pelo que está na tela): `udv-print` cancelável. */
  print(): void {
    if (!this.full) return;
    const pdf = this.exportPdf();
    if (!this.dispatchEvent(new CustomEvent('udv-print', { cancelable: true, detail: { pdf } }))) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }));
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden';
    frame.onload = () => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
      catch { window.open(url, '_blank', 'noopener'); }
      setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60_000);
    };
    frame.src = url;
    document.body.appendChild(frame);
  }

  /** Baixa o arquivo ORIGINAL: `udv-download` cancelável (bytes + nome). */
  download(): void {
    const bytes = this.fileBytes;
    if (!bytes) return;
    const doc = isWordBinary(bytes);
    const src = this.getAttribute('src');
    let name = '';
    try { name = src ? decodeURIComponent(src.split(/[?#]/)[0]!.split('/').pop() ?? '') : ''; } catch { /* nome ilegível */ }
    if (!/\.(docx|docm|dotx|doc|dot)$/i.test(name)) name = `documento.${doc ? 'doc' : 'docx'}`;
    if (!this.dispatchEvent(new CustomEvent('udv-download', { cancelable: true, detail: { bytes, filename: name } }))) return;
    const type = doc ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  toggleFullscreen(): void {
    if (this.root.fullscreenElement === this.wrap) document.exitFullscreen().catch(() => {});
    else if (document.fullscreenEnabled && this.wrap.requestFullscreen) this.wrap.requestFullscreen().catch(() => {});
  }

  private onFullscreenChange = (): void => { this.controls.wake(); this.controls.sync(); };

  private scrollFraction(): number {
    const s = this.scroller, max = s.scrollHeight - s.clientHeight;
    return max > 0 ? Math.max(0, Math.min(1, s.scrollTop / max)) : 0;
  }

  private scrollToFraction(f: number): void {
    const s = this.scroller;
    s.scrollTop = f * (s.scrollHeight - s.clientHeight);
  }

  /** Modo de Leitura: bloco anterior/seguinte. */
  private nudgeRead(dir: 1 | -1): void {
    const n = this.readN(), total = this.getPageCount();
    const next = this.readFirst + dir * n;
    if (next >= total || next + n <= 0) return;
    this.readFirst = Math.max(0, next);
    this.applyZoom(false);
    this.announce(this.positionTextAt(this.readFirst));
  }

  /** Navegação pela barra/teclado: anda e anuncia a página de destino. */
  private stepTo(page: number): void {
    const total = this.getPageCount();
    if (!total) return;
    this.goToPage(Math.max(0, Math.min(total - 1, page)));
  }

  /** Teclado no slider de progresso. */
  private progressStep(st: ProgressStep): void {
    if (this.view === 'web') {
      const d = st === 'next' ? 0.05 : st === 'prev' ? -0.05 : st === 'pagenext' ? 0.2 : st === 'pageprev' ? -0.2 : 0;
      this.scrollToFraction(st === 'home' ? 0 : st === 'end' ? 1 : Math.max(0, Math.min(1, this.scrollFraction() + d)));
      this.announce(`${Math.round(this.scrollFraction() * 100)}%`);
      return;
    }
    if (this.view === 'read' && (st === 'next' || st === 'prev')) { this.nudgeRead(st === 'next' ? 1 : -1); return; }
    const i = this.index, total = this.getPageCount();
    this.stepTo(st === 'home' ? 0 : st === 'end' ? total - 1 : st === 'next' ? i + 1 : st === 'prev' ? i - 1 : st === 'pagenext' ? i + 5 : i - 5);
  }

  private controlsHost(): ControlsHost {
    return {
      available: (it: ControlItem) => {
        if (it === 'nav' || it === 'counter' || it === 'thumbnails') return this.view !== 'web';
        if (it === 'zoom') return this.view !== 'read';
        if (it === 'outline') return this.notes.headings.length > 0;
        if (it === 'comments') return this.notes.comments.length > 0;
        return true;
      },
      count: () => this.getPageCount(),
      counter: () => {
        const total = this.getPageCount();
        if (!total || this.view === 'web') return '';
        if (this.view !== 'read') return `${this.index + 1} / ${total}`;
        const last = Math.min(total, this.readFirst + this.readN());
        return last > this.readFirst + 1 ? `${this.readFirst + 1}–${last} / ${total}` : `${this.readFirst + 1} / ${total}`;
      },
      prev: () => (this.view === 'read' ? this.nudgeRead(-1) : this.stepTo(this.index - 1)),
      next: () => (this.view === 'read' ? this.nudgeRead(1) : this.stepTo(this.index + 1)),
      step: (st) => this.progressStep(st),
      positionText: () => this.positionText(),
      announce: (text) => this.announce(text),
      progress: () => {
        if (this.view !== 'read') return this.scrollFraction();
        const total = this.getPageCount();
        return total ? Math.min(1, (this.readFirst + this.readN()) / total) : 0;
      },
      seek: (f) => (this.view === 'read' ? this.goToPage(Math.floor(f * this.getPageCount())) : this.scrollToFraction(f)),
      zoom: () => this.getZoom(),
      setZoom: (z) => this.setZoom(z),
      view: () => this.view,
      setView: (v) => this.setView(v),
      navTab: () => this.navTab,
      toggleNav: (tab) => this.setNav(this.navTab === tab ? null : tab),
      commentsOpen: () => this.commentsOpen,
      toggleComments: () => this.setComments(!this.commentsOpen),
      download: () => this.download(),
      print: () => this.print(),
      isFullscreen: () => this.root.fullscreenElement === this.wrap,
      toggleFullscreen: () => this.toggleFullscreen(),
    };
  }

  /** Ctrl +/−/0: zoom do viewer (não o do navegador); no Modo de Leitura, ← → e companhia. */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.view === 'read' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown') this.nudgeRead(1);
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') this.nudgeRead(-1);
      else if (k === 'Home') this.goToPage(0);
      else if (k === 'End') this.goToPage(this.getPageCount() - 1);
      else return;
      e.preventDefault();
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || this.hasAttribute('nozoom') || this.view === 'read') return;
    if (e.key === '+' || e.key === '=') { this.setZoom(this.zoomFactor * 1.25); e.preventDefault(); }
    else if (e.key === '-') { this.setZoom(this.zoomFactor / 1.25); e.preventDefault(); }
    else if (e.key === '0') { this.setZoom(this.view === 'web' ? 1 : 'page-width'); e.preventDefault(); }
  };

  /** Ctrl + roda: zoom do viewer; no Modo de Leitura a roda vira o bloco. */
  private onWheel = (e: WheelEvent): void => {
    if (!this.layout) return;
    if (this.view === 'read' && !e.ctrlKey && !e.metaKey) {
      if ((e.target as HTMLElement).closest('.udv-nav, .udv-comments, .uoc-bar')) return; // painéis rolam
      e.preventDefault();
      const now = performance.now();
      if (now < this.wheelLock || Math.abs(e.deltaY) < 4) return;
      this.wheelLock = now + 350;
      this.nudgeRead(e.deltaY > 0 ? 1 : -1);
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || this.hasAttribute('nozoom') || this.view === 'read') return;
    e.preventDefault();
    this.setZoom(this.zoomFactor * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  };
}

customElements.define('universal-document-viewer', UniversalDocumentViewerElement);
