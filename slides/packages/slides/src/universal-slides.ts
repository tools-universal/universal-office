import { UniversalPresentationViewerElement } from '@universal-office/presentation-viewer';
import { PptxPackage, collectDeckTypefaces, EMU_PER_PX, type Paragraph, type Run, type Shape } from '@universal-office/slides-core';
import {
  DEFAULT_EMBEDDING, planFontEmbedding, readPptxEmbedding, writePptxEmbedding,
  type EmbeddingPlan, type FontEmbeddingSettings, type FontUsage,
} from '@universal-office/fonts';
import {
  ColorSchemeWatcher, PluginRegistry, forceColorScheme, onBrowserLangChange, pickLabels, themeMode, uiLang,
  type BarContribution, type ColorScheme, type UiLang,
} from '@universal-office/ui';
import * as deck from './deck-edit.js';
import { EditHistory, changedSince, restore, snapshot, type EditState } from './history.js';
import {
  HANDLE_CURSOR, drawPrompts, drawSelection, hitHandle, hitShape, resizeFrame, selectable, shapeRect, type Handle,
} from './edit-surface.js';
import { blankDeck } from './blank-deck.js';
import type { UniversalSlidesBarKit, UniversalSlidesHost, UniversalSlidesPlugin } from './plugins.js';

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescXml = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : XML_ENTITIES[e.toLowerCase()]!);

/** Textos da superfície de edição (avisos dos placeholders vazios, como no app). */
const PROMPTS = {
  en: { title: 'Click to add title', subtitle: 'Click to add subtitle', text: 'Click to add text', picture: 'Picture', object: 'Content' },
  pt: { title: 'Clique para adicionar um título', subtitle: 'Clique para adicionar um subtítulo', text: 'Clique para adicionar texto', picture: 'Imagem', object: 'Conteúdo' },
};

/** Atributos das barras (o resto é do viewer). */
const CHROME_ATTRS = new Set(['topbar', 'bottombar', 'toolbar', 'hidden-commands']);

/** Formatação do texto da forma selecionada (estado dos botões da barra). */
export interface TextFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** pontos */
  size?: number;
  font?: string;
  color?: string;
  align: 'l' | 'ctr' | 'r' | 'just';
  bullet: 'bullet' | 'number' | 'none';
}

/** O que a forma é e o que dá para fazer com ela. */
export interface ShapeInfo {
  index: number;
  id: string;
  name: string;
  kind: 'text' | 'shape' | 'picture' | 'table' | 'chart' | 'media' | 'line' | 'other';
  placeholder?: string;
  /** EMU */
  frame?: deck.Frame;
  /** dá para editar o texto (duplo clique / F2) */
  text: boolean;
  /** dá para mover/redimensionar (não está num grupo) */
  movable: boolean;
}

/** Resultado de Localizar. */
export interface FindHit { slide: number; shape: number }

/** Uma animação da sequência principal do slide (leitura). */
export interface SlideAnimationInfo {
  /** passo (clique) — 0 é o primeiro */
  step: number;
  /** começa ao clicar, com o anterior ou após o anterior */
  trigger: 'click' | 'with' | 'after';
  /** entr | exit | emph | path | verb | mediacall */
  presetClass: string;
  presetId: number;
  shapeId?: string;
  shapeName?: string;
  /** duração (ms; -1 = repete até o fim do slide) */
  durMs: number;
  /** atraso a partir do início do passo (ms) */
  delayMs: number;
}

/**
 * <universal-slides> — webcomponent EDITOR de apresentações. Herda toda a
 * visualização do `<universal-presentation-viewer>` (paint, navegação,
 * miniaturas, animações, transições, hyperlinks) e acrescenta a EDIÇÃO: texto
 * no lugar (duplo clique), slides (novo, duplicar, excluir, mover, ocultar,
 * layout, fundo, transição), formas (inserir caixa de texto, forma, imagem;
 * mover, redimensionar, preencher, contorno, ordem, excluir, hiperlink),
 * formatação do texto da forma, anotações, propriedades e desfazer/refazer.
 * Toda edição vai para o PACOTE (só o trecho editado de cada parte) e o
 * modelo é relido dele: o que se desenha é o que `savePptx()` grava.
 *
 * Interface embutida OPCIONAL, como a do <universal-write>: `topbar`
 * (barra compacta estilo Google Slides ou `toolbar="ribbon"` estilo
 * PowerPoint, painel de miniaturas, anotações), `bottombar` (barra de status),
 * `lang`, `theme`, `hidden-commands` e as contribuições dos plugins. Sem esses
 * atributos o elemento é só a área do slide, como antes.
 */
export class UniversalSlidesElement extends UniversalPresentationViewerElement {
  /** Editor inline da shape de texto (criado em `beginEditShape`). */
  private editor: HTMLDivElement | null = null;
  private editingShape: { slide: number; shapeIdx: number } | null = null;

  /** Opção "incorporar fontes no arquivo" desta apresentação (lida do
   *  presentation.xml ao abrir; padrões do PowerPoint num deck sem a opção). */
  private fontEmbedding: FontEmbeddingSettings = { ...DEFAULT_EMBEDDING.slides };
  private fontEmbeddingTouched = false;

  /** Desfazer/refazer por instantâneo do pacote. */
  private history = new EditHistory(100);
  /** Forma selecionada (índice no slide atual) — só com a interface embutida. */
  private selected: number | null = null;
  /** Interface embutida ligada: seleção por clique, arrastar, alças, teclas. */
  private interactive = false;
  /** Zoom (1 = tamanho real a 96 dpi); null = ajustar à janela. */
  private zoomLevel: number | null = null;
  private pan = { x: 0, y: 0 };
  private deskCss = '#3c3c3c';
  /** Nome do documento (sem extensão) e onde o host o guarda. */
  private docName = '';
  /** @internal onde o host guarda o arquivo (Electron: caminho) — volta no saveFile. */
  documentPath: string | null = null;
  /** Integração opcional com o app hospedeiro (Electron/PWA) — ver UniversalSlidesHost. */
  appHost: UniversalSlidesHost | null = null;

  private readonly colorScheme: ColorSchemeWatcher;

  constructor() {
    super();
    // Double-click sobre uma shape de texto entra em modo edição. Single click
    // só dá foco (NUNCA avança o slide — o usuário tem teclado/chrome p/ isso).
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.badge.classList.add('us-badge');
    this.colorScheme = new ColorSchemeWatcher(this.host, this, (theme) => {
      this.readDesk();
      this.paint();
      this.dispatchEvent(new CustomEvent('us-theme-change', { detail: { theme } }));
    });
    // superfície de edição (só com a interface embutida): captura antes do viewer
    this.wrap.addEventListener('pointerdown', this.onSurfaceDown, true);
    this.wrap.addEventListener('mousemove', this.onSurfaceHover, true);
    this.wrap.addEventListener('click', this.onSurfaceClick, true);
    this.wrap.addEventListener('dblclick', this.onSurfaceDblClick, true);
    this.wrap.addEventListener('keydown', this.onSurfaceKey, true);
    this.wrap.addEventListener('wheel', this.onSurfaceWheel, { capture: true, passive: false });
  }

  // ───────────────────────── atributos e ciclo de vida ─────────────────────────

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHROME_ATTRS, 'theme'];
  }

  override attributeChangedCallback(name: string, oldV: string | null, newV: string | null): void {
    if (name === 'theme') { this.applyColorScheme(); return; }
    if (CHROME_ATTRS.has(name)) { if (this.isConnected) void this.updateChrome(); return; }
    super.attributeChangedCallback(name, oldV, newV);
    if (name === 'lang' && this.isConnected && this.chromeActive()) void this.updateChrome();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    UniversalSlidesElement.registry.connect(this);
    this.applyColorScheme();
    this.unsubscribeChromeLang ??= onBrowserLangChange(() => { if (!this.hasAttribute('lang') && this.chromeActive()) void this.updateChrome(); });
    if (this.chromeActive()) void this.updateChrome();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    UniversalSlidesElement.registry.disconnect(this);
    this.unsubscribeChromeLang?.();
    this.unsubscribeChromeLang = null;
    if (this.chromeLoaded) void import('./chrome.js').then((m) => { if (!this.isConnected) m.teardownChrome(this); });
  }

  private unsubscribeChromeLang: (() => void) | null = null;

  /** Barra superior (menus/ferramentas, painel de miniaturas e anotações). */
  get topbar(): boolean { return this.hasAttribute('topbar'); }
  set topbar(v: boolean) { this.toggleAttribute('topbar', v); }
  /** Barra de status (slide n de N, anotações, modos de exibição, zoom). */
  get bottombar(): boolean { return this.hasAttribute('bottombar'); }
  set bottombar(v: boolean) { this.toggleAttribute('bottombar', v); }

  private chromeActive(): boolean { return this.topbar || this.bottombar; }

  private chromeReq = 0;
  private chromeLoaded = false;
  private chromeSync: (() => void) | null = null;

  /** (Re)monta as barras conforme os atributos (carregadas sob demanda). */
  private async updateChrome(): Promise<void> {
    const req = ++this.chromeReq;
    if (!this.chromeActive()) {
      if (!this.chromeLoaded) return;
      const m = await import('./chrome.js');
      if (req === this.chromeReq) m.teardownChrome(this);
      return;
    }
    const m = await import('./chrome.js');
    if (req !== this.chromeReq || !this.isConnected) return;
    this.chromeLoaded = true;
    const lang = uiLang(this);
    const handle = m.setupChrome(this, {
      topbar: this.topbar, bottombar: this.bottombar, lang,
      contributions: this.toolbarContributions(lang, m.barKit),
    });
    this.chromeSync = handle.sync;
    this.chromeNotice = handle.setNotice;
    if (this.noticeState) handle.setNotice(this.noticeState.el, this.noticeState.tone);
  }

  private chromeNotice: ((el: HTMLElement | null, tone?: 'info' | 'warning' | 'error') => void) | null = null;
  private noticeState: { el: HTMLElement; tone: 'info' | 'warning' | 'error' } | null = null;

  /**
   * Faixa de aviso do hospedeiro, entre a linha de título/menus e as
   * ferramentas (como o <universal-write>). Sobrevive à troca de barra e de
   * idioma; só aparece com `topbar`. `null` tira o aviso.
   */
  setNotice(el: HTMLElement | null, options: { tone?: 'info' | 'warning' | 'error' } = {}): void {
    this.noticeState = el ? { el, tone: options.tone ?? 'info' } : null;
    this.chromeNotice?.(el, options.tone);
  }

  /** Elemento do aviso atual (setNotice), ou null. */
  get notice(): HTMLElement | null { return this.noticeState?.el ?? null; }

  /** @internal as barras montaram/desmontaram: superfície de edição e tema. */
  setChromeMounted(on: boolean): void {
    this.interactive = on;
    if (on) { this.colorScheme.connect(); this.readDesk(); } else {
      this.colorScheme.disconnect();
      this.deskCss = '#3c3c3c';
      this.selected = null;
      this.chromeSync = null;
      this.chromeNotice = null;
      this.zoomLevel = null;
    }
    this.resize();
    this.paint();
  }

  /** @internal partes do shadow DOM que as barras rearranjam. */
  chromeParts(): { root: ShadowRoot; wrap: HTMLDivElement; canvas: HTMLCanvasElement } {
    return { root: this.host, wrap: this.wrap, canvas: this.canvas };
  }

  /** Lê a cor da mesa (fundo do palco, `--us-desk`) para o canvas. */
  private readDesk(): void {
    if (!this.interactive || typeof getComputedStyle !== 'function') return;
    const v = getComputedStyle(this.wrap).backgroundColor;
    if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') this.deskCss = v;
  }

  protected override deskColor(): string { return this.interactive ? this.deskCss : super.deskColor(); }

  // ───────────────────────── claro/escuro ─────────────────────────

  /** Tema efetivo da interface ('light' | 'dark'), pelo `color-scheme` do contexto ou `theme`. */
  get effectiveTheme(): ColorScheme {
    return this.colorScheme.connected ? this.colorScheme.scheme : this.colorScheme.refresh();
  }

  private uiColorMode: string | null = null;

  /** @internal barras: a escolha do menu Exibir › Tema (null = herdar o contexto). */
  setUiColorMode(mode: string | null): void {
    this.uiColorMode = mode;
    this.applyColorScheme();
  }

  /** `theme` (ou a escolha do menu) → `color-scheme` no host; `auto`/ausente herda. */
  private applyColorScheme(): void {
    const attr = this.getAttribute('theme');
    const m = attr !== null ? attr : this.uiColorMode;
    const t = themeMode(m);
    forceColorScheme(this.host, t === 'auto' ? null : t);
    if (this.colorScheme.connected) this.colorScheme.refresh();
  }

  // ───────────────────────── plugins ─────────────────────────

  private static readonly registry = new PluginRegistry<UniversalSlidesPlugin, UniversalSlidesElement>({
    name: 'universal-slides',
    install: (el, plugin) => {
      if (el.plugins.has(plugin.id)) return false;
      el.use(plugin);
      return true;
    },
    uninstall: (el, plugin) => { if (el.plugins.get(plugin.id) === plugin) el.unuse(plugin.id); },
  });

  /** Registra um plugin para TODAS as instâncias (como o `Quill.register`). */
  static register(plugin: UniversalSlidesPlugin): void { UniversalSlidesElement.registry.register(plugin); }

  /** Tira um plugin do registro global e das instâncias que o receberam por ele. */
  static unregister(id: string): boolean { return UniversalSlidesElement.registry.unregister(id); }

  private plugins = new Map<string, UniversalSlidesPlugin>();
  private pluginCleanups = new Map<string, () => void>();

  /** Instala um plugin nesta instância. */
  use(plugin: UniversalSlidesPlugin): void {
    if (!plugin.id.trim()) throw new Error('plugin.id is required');
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    this.plugins.set(plugin.id, plugin);
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      throw error;
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    this.dispatchEvent(new CustomEvent('us-plugin-added', { detail: { id: plugin.id } }));
  }

  /** Remove o plugin (e os itens dele nas barras). */
  unuse(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    try { this.pluginCleanups.get(id)?.(); } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    this.dispatchEvent(new CustomEvent('us-plugin-removed', { detail: { id } }));
    return true;
  }

  pluginIds(): string[] { return [...this.plugins.keys()]; }

  private toolbarContributions(lang: UiLang, ui: UniversalSlidesBarKit): BarContribution[] {
    const out: BarContribution[] = [];
    const kit: UniversalSlidesBarKit = { ...ui, createBarButton: (o) => ui.createBarButton({ lang, ...o }) };
    for (const plugin of this.plugins.values()) {
      if (!plugin.toolbar) continue;
      try { out.push(plugin.toolbar({ editor: this, lang, theme: this.effectiveTheme, ui: kit })); } catch (e) {
        console.warn(`[universal-slides] plugin "${plugin.id}": toolbar falhou`, e);
      }
    }
    return out;
  }

  private hiddenCommandList: readonly string[] | null = null;

  /**
   * Ids ocultos nas barras, menus e atalhos — comandos (`new`, `open`,
   * `print`…), menus (`file`), grupos e guias. Atributo `hidden-commands`
   * (vírgula ou espaço) ou esta propriedade.
   */
  get hiddenCommands(): readonly string[] {
    return this.hiddenCommandList ?? (this.getAttribute('hidden-commands') ?? '').split(/[\s,]+/).filter(Boolean);
  }

  set hiddenCommands(ids: readonly string[]) {
    this.hiddenCommandList = [...ids];
    if (this.chromeActive() && this.isConnected) void this.updateChrome();
  }

  // ───────────────────────── documento ─────────────────────────

  override loadPptx(bytes: Uint8Array): void {
    if (this.editor) this.cancelEditShape();
    super.loadPptx(bytes);
    if (this.pkg) this.fontEmbedding = { ...DEFAULT_EMBEDDING.slides, ...readPptxEmbedding(this.pkg).settings };
    this.fontEmbeddingTouched = false;
    this.history.clear();
    this.selected = null;
    this.pan = { x: 0, y: 0 };
    this.notifyDirty();
  }

  /**
   * Abre uma apresentação como o Arquivo › Abrir das barras: carrega, dá o
   * nome (título) e guarda onde o host a mantém (`path`, para "Salvar").
   * .ppt é convertido para .pptx. Lança se os bytes não são uma apresentação.
   */
  openPresentation(bytes: Uint8Array, opts: { name?: string; path?: string | null } = {}): void {
    this.loadPptx(bytes);
    this.documentPath = opts.path ?? null;
    this.documentName = (opts.name ?? '').replace(/\.(pptx|pptm|ppsx|ppsm|potx|ppt|pps)$/i, '');
  }

  /** Apresentação nova em branco (um slide de título vazio). */
  newPresentation(opts: { aspect?: '16:9' | '4:3' } = {}): void {
    this.loadPptx(blankDeck({ aspect: opts.aspect, lang: this.textLang() }));
    this.documentPath = null;
    this.documentName = '';
  }

  /** Nome da apresentação (sem extensão) — o título das barras e o nome sugerido ao salvar. */
  get documentName(): string { return this.docName; }
  set documentName(v: string) {
    if (v === this.docName) return;
    this.docName = v;
    this.dispatchEvent(new CustomEvent('us-title-change', { detail: { name: v } }));
  }

  /** Há alterações não salvas (desde a abertura ou o último `markClean()`). */
  isDirty(): boolean { return this.history.dirty || this.fontEmbeddingTouched; }

  /** O documento foi salvo pelo hospedeiro: o estado atual passa a ser o "limpo". */
  markClean(): void {
    this.history.markSaved();
    this.fontEmbeddingTouched = false;
    this.notifyDirty();
  }

  private lastDirty = false;
  private notifyDirty(): void {
    const d = this.isDirty();
    if (d === this.lastDirty) return;
    this.lastDirty = d;
    this.dispatchEvent(new CustomEvent('us-dirty', { detail: { dirty: d } }));
  }

  /** Idioma gravado no texto novo (`lang` dos runs): o da interface. */
  private textLang(): string { return uiLang(this) === 'pt' ? 'pt-BR' : 'en-US'; }

  // ───────────────────────── fontes no arquivo ─────────────────────────

  /** Opção "incorporar fontes no arquivo" desta apresentação. */
  getFontEmbedding(): FontEmbeddingSettings {
    return { ...this.fontEmbedding };
  }

  /** Muda a opção (vale no próximo `savePptx`). */
  setFontEmbedding(settings: Partial<FontEmbeddingSettings>): void {
    this.fontEmbedding = { ...this.fontEmbedding, ...settings };
    this.fontEmbeddingTouched = true;
    this.notifyDirty();
  }

  /**
   * Bytes do .pptx com a opção de fontes aplicada (resolvedor único + gravação
   * em shared/fonts), sobre uma CÓPIA do pacote — o resto segue byte a byte.
   * Ligada: acrescenta as famílias usadas que ainda não estão no arquivo (as 4
   * variantes, como o PowerPoint); desligada: tira as incorporadas. O que
   * ficou de fora vai no evento `us-font-embedding`.
   */
  async savePptx(): Promise<Uint8Array> {
    if (!this.pkg) throw new Error('No presentation loaded');
    if (this.editor) this.commitEditShape();
    const pkg = PptxPackage.load(this.pkg.save());
    const settings = this.fontEmbedding;
    let plan: EmbeddingPlan = { faces: [], skipped: [] };
    if (settings.embed) {
      plan = await planFontEmbedding(this.fontResolver, deckFontUsage(pkg), settings, 'slides', {
        alreadyEmbedded: readPptxEmbedding(pkg).embedded,
      });
    }
    writePptxEmbedding(pkg, plan, settings);
    this.dispatchEvent(new CustomEvent('us-font-embedding', {
      detail: {
        embedded: [...new Set(plan.faces.map((f) => f.family))],
        skipped: plan.skipped.filter((s) => s.reason !== 'already-embedded'),
      },
    }));
    return pkg.save();
  }

  /** O editor tem a própria interface: sem a barra de controles do viewer. */
  protected override controlsBuiltIn(): boolean { return false; }

  protected override isEditing(): boolean { return this.editingShape !== null; }

  protected override suppressTextIdx(): number | undefined {
    return this.editingShape && this.editingShape.slide === this.index
      ? this.editingShape.shapeIdx
      : undefined;
  }

  override selectSlide(i: number): void {
    if (this.editingShape) this.commitEditShape();
    if (i !== this.index) this.selected = null;
    super.selectSlide(i);
  }

  // ───────────────────────── edição: passo de desfazer ─────────────────────────

  private editState(): EditState {
    const sh = this.selected !== null ? this.slides[this.index]?.shapes[this.selected] : undefined;
    return { index: this.index, shapeId: sh && !sh.inherited ? sh.id : null };
  }

  /** Seleciona pelo id da forma no slide atual (depois de reler o modelo). */
  private selectById(id: string | null): void {
    if (id === null) { this.selected = null; return; }
    const i = this.slides[this.index]?.shapes.findIndex((s) => !s.inherited && s.id === id) ?? -1;
    this.selected = i >= 0 ? i : null;
  }

  /**
   * Executa uma edição do pacote como UM passo de desfazer e relê o modelo:
   * só o slide atual (`reread: 'slide'`), um slide (`number`) ou a
   * apresentação inteira (`'deck'`). `then` = slide atual e forma selecionada depois.
   */
  private edit<T>(label: string, fn: (pkg: PptxPackage) => T, reread: 'slide' | 'deck' | number = 'slide', then: { index?: number; select?: string | null } = {}): T | undefined {
    const pkg = this.pkg;
    if (!pkg) return undefined;
    if (this.editor && label !== 'typing') this.commitEditShape();
    const before = snapshot(pkg);
    const stateBefore = this.editState();
    const result = fn(pkg);
    if (!changedSince(pkg, before)) return result;
    const keep = then.select !== undefined ? then.select : stateBefore.shapeId;
    if (reread === 'deck') this.rereadDeck(then.index ?? this.index);
    else this.rereadSlide(typeof reread === 'number' ? reread : this.index);
    if (then.index !== undefined && reread !== 'deck') this.index = then.index;
    this.selectById(keep);
    this.history.push(label, before, snapshot(pkg), stateBefore, this.editState());
    this.afterEdit(label);
    return result;
  }

  private afterEdit(kind: string): void {
    this.paint();
    this.dispatchEvent(new CustomEvent('us-change', { detail: { kind, index: this.index } }));
    this.notifyDirty();
  }

  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }

  /** Desfaz a última edição. */
  undo(): void {
    if (this.editor) { this.commitEditShape(); }
    const u = this.history.undo();
    if (!u || !this.pkg) return;
    restore(this.pkg, u.snap);
    this.rereadDeck(u.state.index);
    this.selectById(u.state.shapeId);
    this.afterEdit('undo');
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
  }

  /** Refaz a edição desfeita. */
  redo(): void {
    if (this.editor) this.commitEditShape();
    const r = this.history.redo();
    if (!r || !this.pkg) return;
    restore(this.pkg, r.snap);
    this.rereadDeck(r.state.index);
    this.selectById(r.state.shapeId);
    this.afterEdit('redo');
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
  }

  /** Caminho do slide `i` (lança se não existe). */
  private slidePath(i = this.index): string {
    const p = this.slidePartPath(i);
    if (!p) throw new Error(`slide ${i} inexistente`);
    return p;
  }

  // ───────────────────────── slides ─────────────────────────

  /** Layouts da apresentação (de todos os masters). */
  getLayouts(): deck.LayoutInfo[] { return this.pkg ? deck.listLayouts(this.pkg) : []; }

  /** Layout (caminho da parte) do slide `i`. */
  getSlideLayout(i = this.index): string | undefined {
    const p = this.slidePartPath(i);
    return this.pkg && p ? deck.layoutOf(this.pkg, p) : undefined;
  }

  /**
   * Slide novo DEPOIS do atual, a partir de `layout` (caminho; padrão: o
   * layout do slide atual — depois de um Slide de Título, o "Título e
   * Conteúdo", como o app). Vira o slide atual; devolve o índice.
   */
  addSlide(layout?: string): number {
    if (!this.pkg) this.newPresentation();
    const at = this.slides.length ? this.index + 1 : 0;
    const path = layout ?? this.defaultNewLayout();
    if (!path) return -1;
    this.edit('newSlide', (pkg) => deck.addSlide(pkg, at, path, this.textLang()), 'deck', { index: at, select: null });
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
    return at;
  }

  private defaultNewLayout(): string | undefined {
    const layouts = this.getLayouts();
    const cur = this.getSlideLayout();
    const info = layouts.find((l) => l.path === cur);
    if (info?.type === 'title') {
      const next = layouts.find((l) => l.master === info.master && l.type === 'obj') ?? layouts.find((l) => l.master === info.master && l.type === 'tx');
      if (next) return next.path;
    }
    return cur ?? layouts.find((l) => l.type === 'obj')?.path ?? layouts[0]?.path;
  }

  /** Duplica o slide `i` (com as anotações) logo depois dele. Devolve o índice da cópia. */
  duplicateSlide(i = this.index): number {
    if (!this.slidePartPath(i)) return -1;
    this.edit('duplicateSlide', (pkg) => deck.duplicateSlide(pkg, i), 'deck', { index: i + 1, select: null });
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
    return i + 1;
  }

  /** Exclui o slide `i`. */
  deleteSlide(i = this.index): void {
    if (!this.slidePartPath(i)) return;
    const next = Math.max(0, Math.min(i, this.slides.length - 2));
    this.edit('deleteSlide', (pkg) => deck.deleteSlide(pkg, i), 'deck', { index: next, select: null });
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
  }

  /** Move o slide de `from` para `to`. */
  moveSlide(from: number, to: number): void {
    if (from === to || !this.slidePartPath(from) || to < 0 || to >= this.slides.length) return;
    const index = this.index === from ? to : this.index;
    this.edit('moveSlide', (pkg) => deck.moveSlide(pkg, from, to), 'deck', { index });
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: this.index } }));
  }

  /** Slide oculto na apresentação? */
  isSlideHidden(i = this.index): boolean { return !!this.slides[i]?.timing?.hidden; }

  /** Oculta/mostra o slide na apresentação. */
  setSlideHidden(hidden: boolean, i = this.index): void {
    if (!this.slidePartPath(i)) return;
    this.edit('hideSlide', (pkg) => deck.setSlideHidden(pkg, this.slidePath(i), hidden), i);
  }

  /** Troca o layout do slide. */
  setSlideLayout(layout: string, i = this.index): void {
    if (!this.slidePartPath(i)) return;
    this.edit('layout', (pkg) => deck.setSlideLayout(pkg, this.slidePath(i), layout), i);
  }

  /** Fundo sólido do slide (`null` volta a herdar). `'all'` aplica a todos. */
  setSlideBackground(color: string | null, i: number | 'all' = this.index): void {
    const targets = i === 'all' ? this.slides.map((_, k) => k) : [i];
    this.edit('background', (pkg) => { for (const k of targets) deck.setSlideBackground(pkg, this.slidePath(k), color); }, i === 'all' ? 'deck' : i);
  }

  /** Transição de entrada do slide `i` (null se não houver). */
  getSlideTransition(i = this.index): deck.TransitionSpec | null {
    const t = this.slides[i]?.timing?.transition;
    if (!t || t.type === 'none' && t.advTmMs === undefined && t.advClick) return null;
    const spec: deck.TransitionSpec = { type: t.type, advanceOnClick: t.advClick };
    const dir = t.attrs['dir'];
    if (dir) spec.dir = dir;
    if (t.advTmMs !== undefined) spec.advanceAfterMs = t.advTmMs;
    spec.speed = t.durMs >= 1000 ? 'slow' : t.durMs >= 700 ? 'med' : 'fast';
    return spec;
  }

  /** Grava a transição (`null` tira) no slide `i` ou em todos (`'all'`). */
  setSlideTransition(t: deck.TransitionSpec | null, i: number | 'all' = this.index): void {
    const targets = i === 'all' ? this.slides.map((_, k) => k) : [i];
    this.edit('transition', (pkg) => { for (const k of targets) deck.setSlideTransition(pkg, this.slidePath(k), t); }, i === 'all' ? 'deck' : i);
  }

  /** Tamanho do slide em EMU (16:9 padrão sem apresentação). */
  getSlideSize(): { width: number; height: number } {
    return { width: this.pres?.slideW ?? 12192000, height: this.pres?.slideH ?? 6858000 };
  }

  /** Largura ÷ altura do slide. */
  getSlideAspect(): number {
    const s = this.getSlideSize();
    return s.width / s.height;
  }

  /** Cor de fundo própria do slide (`null` = herda do layout/master ou não é cor sólida). */
  getSlideBackgroundColor(i = this.index): string | null {
    const bg = this.slides[i]?.bg;
    return bg?.type === 'solid' && bg.color ? bg.color : null;
  }

  /**
   * Animações do slide (sequência principal, em ordem), só para LEITURA: o
   * editor reproduz e visualiza as animações do arquivo, mas não as cria nem edita.
   */
  getSlideAnimations(i = this.index): SlideAnimationInfo[] {
    const timing = this.slides[i]?.timing;
    const shapes = this.slides[i]?.shapes ?? [];
    const out: SlideAnimationInfo[] = [];
    timing?.steps.forEach((st, k) => st.effects.forEach((e, j) => {
      const sh = e.target ? shapes.find((s) => !s.inherited && s.id === e.target!.spid) : undefined;
      const trigger: SlideAnimationInfo['trigger'] = e.nodeType === 'withEffect' ? 'with' : e.nodeType === 'afterEffect' ? 'after'
        : e.nodeType === 'clickEffect' ? 'click' : j === 0 ? (st.auto ? 'after' : 'click') : 'with';
      out.push({
        step: k, trigger, presetClass: e.presetClass, presetId: e.presetId,
        durMs: Number.isFinite(e.durMs) ? e.durMs : -1, delayMs: e.startMs,
        ...(e.target ? { shapeId: e.target.spid } : {}), ...(sh ? { shapeName: sh.name } : {}),
      });
    }));
    return out;
  }

  /** "Configurar apresentação" gravado no arquivo. */
  getShowSettings(): Required<deck.ShowSettingsSpec> {
    const s = this.pres?.show ?? {};
    return { loop: !!s.loop, useTimings: s.useTimings ?? true, showAnimation: s.showAnimation ?? true, kiosk: !!s.kiosk };
  }

  setShowSettings(s: deck.ShowSettingsSpec): void {
    this.edit('showSettings', (pkg) => deck.writeShowSettings(pkg, s), 'deck');
  }

  // ───────────────────────── seleção ─────────────────────────

  /** Forma selecionada (índice no slide atual) ou null. */
  getSelectedShape(): number | null { return this.selected; }

  /** Seleciona uma forma do slide atual (null tira a seleção). */
  selectShape(i: number | null): void {
    if (this.editor) this.commitEditShape();
    const sh = i !== null ? this.slides[this.index]?.shapes[i] : undefined;
    const next = sh && selectable(sh) ? i : null;
    if (next === this.selected) return;
    this.selected = next;
    this.paint();
    this.dispatchEvent(new CustomEvent('us-selection', { detail: { index: this.index, shape: next } }));
  }

  /** Forma alvo das ações: a que está sendo editada ou a selecionada. */
  private target(i?: number): { shape: Shape; index: number } | null {
    const idx = i ?? this.editingShape?.shapeIdx ?? this.selected;
    if (idx === null || idx === undefined) return null;
    const shape = this.slides[this.index]?.shapes[idx];
    return shape && !shape.inherited ? { shape, index: idx } : null;
  }

  /** O que a forma `i` (padrão: a selecionada) é e o que dá para fazer com ela. */
  getShapeInfo(i?: number): ShapeInfo | null {
    const t = this.target(i);
    if (!t) return null;
    const sh = t.shape;
    const kind: ShapeInfo['kind'] = sh.media ? 'media' : sh.image && !sh.txBody ? 'picture' : sh.table ? 'table' : sh.chartXml ? 'chart'
      : sh.geom === 'line' || sh.geom?.startsWith('straightConnector') ? 'line' : sh.txBody && (sh.isTextBox || sh.phType !== undefined || sh.phIdx !== undefined) ? 'text'
        : sh.dgmId ? 'other' : 'shape';
    const info: ShapeInfo = {
      index: t.index, id: sh.id, name: sh.name, kind,
      text: kind === 'text' || kind === 'shape',
      movable: !sh.groupIds?.length && !!sh.xfrm,
    };
    if (sh.phType !== undefined || sh.phIdx !== undefined) info.placeholder = sh.phType ?? 'obj';
    if (sh.xfrm) info.frame = { x: sh.xfrm.x, y: sh.xfrm.y, cx: sh.xfrm.cx, cy: sh.xfrm.cy };
    return info;
  }

  /** Formatação do texto da forma (o 1º run com texto e o 1º parágrafo). */
  getTextFormat(i?: number): TextFormatState | null {
    const t = this.target(i);
    const body = t?.shape.txBody;
    if (!body) return null;
    const para: Paragraph | undefined = body.paragraphs.find((p) => p.runs.some((r) => r.text)) ?? body.paragraphs[0];
    const run: Run | undefined = para?.runs.find((r) => r.text && r.text !== '\n');
    return {
      bold: !!run?.bold, italic: !!run?.italic, underline: !!run?.underline, strike: !!run?.strike,
      size: run?.sz ?? para?.endSz, font: run?.font, color: run?.color,
      align: (para?.align as TextFormatState['align']) ?? 'l',
      bullet: para?.bulletAutoNum ? 'number' : para?.bullet ? 'bullet' : 'none',
    };
  }

  // ───────────────────────── texto e formatação ─────────────────────────

  /** Troca o texto da forma (uma linha por parágrafo; parágrafos iguais ficam como estavam). */
  setShapeText(text: string, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('text', (pkg) => deck.setShapeText(pkg, this.slidePath(), t.shape.id, text, this.textLang()));
  }

  /** Formatação de caractere em TODO o texto da forma (negrito, itálico, tamanho, fonte, cor…). */
  formatText(f: deck.RunFormat, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('format', (pkg) => deck.formatShapeText(pkg, this.slidePath(), t.shape.id, f, this.textLang()));
  }

  /** Alterna negrito/itálico/sublinhado/tachado (pelo estado do 1º run, como o app). */
  toggleTextFormat(k: 'bold' | 'italic' | 'underline' | 'strike', i?: number): void {
    const cur = this.getTextFormat(i);
    if (!cur) return;
    this.formatText({ [k]: !cur[k] }, i);
  }

  private static readonly FONT_STEPS = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];

  /** Aumentar/Diminuir Tamanho da Fonte (os degraus do app), em cada run. */
  growFont(dir: 1 | -1 = 1, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    const steps = UniversalSlidesElement.FONT_STEPS;
    const base = this.getTextFormat(i)?.size ?? 18;
    const step = (pt: number | undefined): number => {
      const v = pt ?? base;
      if (dir > 0) return steps.find((s) => s > v + 0.01) ?? Math.round(v + 10);
      return [...steps].reverse().find((s) => s < v - 0.01) ?? Math.max(1, v - 1);
    };
    this.edit('fontSize', (pkg) => deck.scaleShapeText(pkg, this.slidePath(), t.shape.id, step, this.textLang()));
  }

  /** Alinhamento dos parágrafos da forma. */
  alignText(algn: 'l' | 'ctr' | 'r' | 'just', i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('align', (pkg) => deck.alignShapeText(pkg, this.slidePath(), t.shape.id, algn));
  }

  /** Marcadores/numeração dos parágrafos da forma. */
  setBullets(kind: 'bullet' | 'number' | 'none', i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('bullets', (pkg) => deck.setShapeBullets(pkg, this.slidePath(), t.shape.id, kind));
  }

  /** Limpar toda a formatação de caractere do texto da forma. */
  clearFormatting(i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('clearFormat', (pkg) => deck.clearShapeFormatting(pkg, this.slidePath(), t.shape.id, this.textLang()));
  }

  /** Hiperlink em todo o texto da forma (`null` tira). */
  setLink(url: string | null, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('link', (pkg) => deck.setShapeLink(pkg, this.slidePath(), t.shape.id, url, this.textLang()));
  }

  /** Hiperlink do texto da forma (o 1º run com link), ou null. */
  getLink(i?: number): string | null {
    const t = this.target(i);
    for (const p of t?.shape.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.hyperlink) return r.hyperlink;
    return null;
  }

  // ───────────────────────── formas ─────────────────────────

  /** Retângulo padrão de uma forma nova: centralizado, `w`×`h` EMU (limitados ao slide). */
  private centered(w: number, h: number): deck.Frame {
    const W = this.pres?.slideW ?? 12192000, H = this.pres?.slideH ?? 6858000;
    const cx = Math.min(w, W * 0.9), cy = Math.min(h, H * 0.9);
    return { x: (W - cx) / 2, y: (H - cy) / 2, cx, cy };
  }

  private insertWith(label: string, fn: (pkg: PptxPackage, path: string) => string): number {
    if (!this.slides.length) this.addSlide();
    const id = this.edit(label, (pkg) => fn(pkg, this.slidePath()), 'slide', { select: null });
    if (id === undefined) return -1;
    this.selectById(id);
    this.paint();
    this.dispatchEvent(new CustomEvent('us-selection', { detail: { index: this.index, shape: this.selected } }));
    return this.selected ?? -1;
  }

  /** Caixa de texto nova (selecionada). Devolve o índice da forma. */
  insertTextBox(text = '', frame?: deck.Frame): number {
    const W = this.pres?.slideW ?? 12192000;
    const f = frame ?? this.centered(W * 0.4, 12700 * 40);
    return this.insertWith('textBox', (pkg, path) => deck.insertTextBox(pkg, path, f, text, this.textLang()));
  }

  /** Forma predefinida nova (geometria do Office, ex. 'rect', 'ellipse', 'rightArrow'). */
  insertShape(prst: string, frame?: deck.Frame): number {
    const side = Math.round((this.pres?.slideH ?? 6858000) * 0.3);
    const f = frame ?? (prst === 'line' ? { ...this.centered(side * 1.5, 0), cy: 0 } : this.centered(prst === 'rect' || prst === 'roundRect' ? side * 1.5 : side, side));
    return this.insertWith('shape', (pkg, path) => deck.insertShape(pkg, path, prst, f, this.textLang()));
  }

  /** Imagem nova (PNG/JPEG/GIF/BMP/WebP/SVG), no tamanho natural limitado ao slide. */
  async insertImage(bytes: Uint8Array, mime: string, frame?: deck.Frame): Promise<number> {
    let f = frame;
    if (!f) {
      const size = await imageSize(bytes, mime);
      const W = this.pres?.slideW ?? 12192000, H = this.pres?.slideH ?? 6858000;
      let w = (size?.w ?? 640) * EMU_PER_PX, h = (size?.h ?? 480) * EMU_PER_PX;
      const k = Math.min(1, (W * 0.8) / w, (H * 0.8) / h);
      w *= k; h *= k;
      f = { x: (W - w) / 2, y: (H - h) / 2, cx: w, cy: h };
    }
    const target = f;
    return this.insertWith('image', (pkg, path) => {
      const r = deck.insertImage(pkg, path, bytes, mime, target);
      this.imageCache.delete(r.part); // parte nova com um nome que já pode ter sido usado (desfazer)
      return r.id;
    });
  }

  /** Posição/tamanho da forma (EMU). */
  setShapeFrame(frame: deck.Frame, i?: number): void {
    const t = this.target(i);
    if (!t || t.shape.groupIds?.length) return;
    this.edit('frame', (pkg) => deck.setShapeFrame(pkg, this.slidePath(), t.shape.id, frame));
  }

  /** Preenchimento da forma (`null` = sem preenchimento). */
  setShapeFill(color: string | null, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('fill', (pkg) => deck.setShapeFill(pkg, this.slidePath(), t.shape.id, color));
  }

  /** Contorno da forma (`null` = sem contorno). */
  setShapeOutline(color: string | null, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('outline', (pkg) => deck.setShapeOutline(pkg, this.slidePath(), t.shape.id, color));
  }

  /** Trazer para a frente / Enviar para trás (um nível ou tudo). */
  arrangeShape(mode: deck.ArrangeMode, i?: number): void {
    const t = this.target(i);
    if (!t) return;
    this.edit('arrange', (pkg) => deck.arrangeShape(pkg, this.slidePath(), t.shape.id, mode));
  }

  /** Exclui a forma (e as animações dela). */
  deleteShape(i?: number): void {
    const t = this.target(i);
    if (!t) return;
    if (this.editor) this.cancelEditShape();
    this.edit('deleteShape', (pkg) => deck.deleteShape(pkg, this.slidePath(), t.shape.id), 'slide', { select: null });
    this.dispatchEvent(new CustomEvent('us-selection', { detail: { index: this.index, shape: null } }));
  }

  /**
   * Copia a forma (XML + relações; imagens com os bytes): o que `pasteShape`
   * cola neste ou em outro `<universal-slides>`. null = não dá para copiar
   * (forma dentro de grupo, decoração do layout).
   */
  copyShape(i?: number): deck.ShapeClip | null {
    const t = this.target(i);
    if (!t || !this.pkg || t.shape.groupIds?.length) return null;
    return deck.extractShape(this.pkg, this.slidePath(), t.shape.id);
  }

  /**
   * Cola uma forma copiada no slide atual (selecionada). Colada no MESMO
   * slide de onde veio, desloca um pouco (não fica por cima da original).
   * Devolve o índice, ou -1 (forma que depende de partes que não dá para levar).
   */
  pasteShape(clip: deck.ShapeClip): number {
    if (!this.slides.length) this.addSlide();
    const sameSlide = clip.source === this.pkg && clip.slidePath === this.slidePartPath(this.index);
    const d = sameSlide ? 12700 * 12 : 0;
    const id = this.edit('paste', (pkg) => deck.pasteShape(pkg, this.slidePath(), clip, d, d) ?? '', 'slide', { select: null });
    if (!id) return -1;
    this.selectById(id);
    this.paint();
    this.dispatchEvent(new CustomEvent('us-selection', { detail: { index: this.index, shape: this.selected } }));
    return this.selected ?? -1;
  }

  /** Duplica a forma no mesmo slide (Ctrl+D). Devolve o índice da cópia. */
  duplicateShape(i?: number): number {
    const clip = this.copyShape(i);
    return clip ? this.pasteShape(clip) : -1;
  }

  // ───────────────────────── anotações ─────────────────────────

  /** Dá para escrever anotações no slide (sem master de anotações, o primeiro registro cria um). */
  canEditNotes(i = this.index): boolean {
    return !!this.pkg && !!this.slidePartPath(i);
  }

  /** Grava as anotações do orador do slide `i`. false = nada mudou (ou não há slide). */
  setSlideNotes(text: string, i = this.index): boolean {
    if (!this.canEditNotes(i) || this.getSlideNotes(i) === text) return false;
    return !!this.edit('notes', (pkg) => deck.setSlideNotes(pkg, this.slidePath(i), text, this.textLang()), i);
  }

  // ───────────────────────── propriedades ─────────────────────────

  getProperties(): deck.DocProperties { return this.pkg ? deck.readProperties(this.pkg) : {}; }

  setProperties(p: deck.DocProperties): void {
    this.edit('properties', (pkg) => deck.writeProperties(pkg, p), 'deck');
  }

  // ───────────────────────── localizar e substituir ─────────────────────────

  /** Formas cujo texto contém `query` (slides em ordem, formas em ordem). */
  findText(query: string, opts: { matchCase?: boolean } = {}): FindHit[] {
    if (!query) return [];
    const q = opts.matchCase ? query : query.toLowerCase();
    const out: FindHit[] = [];
    this.slides.forEach((s, si) => s.shapes.forEach((sh, i) => {
      if (sh.inherited || !sh.txBody) return;
      const text = sh.txBody.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n');
      if ((opts.matchCase ? text : text.toLowerCase()).includes(q)) out.push({ slide: si, shape: i });
    }));
    return out;
  }

  /**
   * Substitui no texto das formas (dentro de cada trecho de mesma formatação):
   * em `hit` (uma forma) ou em toda a apresentação. Devolve quantas trocas.
   */
  replaceText(query: string, replacement: string, opts: { matchCase?: boolean; hit?: FindHit } = {}): number {
    const hits = opts.hit ? [opts.hit] : this.findText(query, opts);
    if (!hits.length) return 0;
    let count = 0;
    this.edit('replace', (pkg) => {
      for (const h of hits) {
        const sh = this.slides[h.slide]?.shapes[h.shape];
        if (sh) count += deck.replaceInShape(pkg, this.slidePath(h.slide), sh.id, query, replacement, opts.matchCase);
      }
    }, 'deck');
    return count;
  }

  // ───────────────────────── visualizar ─────────────────────────

  /**
   * Visualizar a transição (`'transition'`) ou as animações (`'animations'`)
   * do slide atual, no próprio palco do editor; para sozinho no fim.
   */
  previewSlide(kind: 'transition' | 'animations'): void {
    const i = this.index;
    if (!this.slides[i]) return;
    if (this.editor) this.commitEditShape();
    const tl = this.play({ from: i, defaultSlideMs: 600000 });
    const ps = tl.slides.find((s) => s.index === i);
    if (!ps) { this.stopPlayback(); return; }
    let end = ps.animStartMs;
    if (kind === 'animations') {
      for (const e of ps.effects) {
        if (e.step < 0) continue;
        const dur = Number.isFinite(e.durMs) ? e.durMs : e.blockMs;
        end = Math.max(end, ps.animStartMs + e.t0 + dur);
      }
    }
    const ms = Math.max(0, end - ps.startMs) + 400;
    const run = this.auto;
    window.setTimeout(() => { if (this.auto === run) { this.stopPlayback(); this.selectSlide(i); } }, ms);
  }

  // ───────────────────────── zoom ─────────────────────────

  /** Zoom em uso (1 = 100%, tamanho real a 96 dpi), também com "ajustar à janela". */
  getZoom(): number {
    const f = this.fit();
    if (f) this.lastZoom = f.scale * EMU_PER_PX;
    return this.lastZoom;
  }

  private lastZoom = 1;

  /** Zoom (1 = 100%) ou `'fit'` (ajustar à janela). */
  setZoom(z: number | 'fit'): void {
    this.zoomLevel = z === 'fit' ? null : Math.max(0.1, Math.min(4, z));
    this.pan = { x: 0, y: 0 };
    this.paint();
    this.dispatchEvent(new CustomEvent('us-zoom', { detail: { zoom: this.getZoom(), fit: this.zoomLevel === null } }));
  }

  /** Está em "ajustar à janela"? */
  isZoomFit(): boolean { return this.zoomLevel === null; }

  protected override fit(): { ox: number; oy: number; scale: number; sw: number; sh: number } | null {
    const base = super.fit();
    if (!base || this.zoomLevel === null || this.auto || this.show || !this.pres) return base;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const scale = this.zoomLevel / EMU_PER_PX;
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    const m = 16;
    const maxX = Math.max(0, sw + 2 * m - W), maxY = Math.max(0, sh + 2 * m - H);
    this.pan.x = Math.max(0, Math.min(this.pan.x, maxX));
    this.pan.y = Math.max(0, Math.min(this.pan.y, maxY));
    const ox = maxX > 0 ? m - this.pan.x : (W - sw) / 2;
    const oy = maxY > 0 ? m - this.pan.y : (H - sh) / 2;
    return { ox, oy, scale, sw, sh };
  }

  // ───────────────────────── pintura da superfície ─────────────────────────

  protected override paint(): void {
    super.paint();
    if (!this.interactive || this.auto || this.show) return;
    const slide = this.slides[this.index];
    const fit = this.fit();
    const ctx = this.canvas.getContext('2d');
    if (!slide || !fit || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPrompts(ctx, slide, fit, pickLabels(this, PROMPTS), this.fontStackFor('Calibri'), this.editingShape?.shapeIdx);
    const sel = this.selected !== null ? slide.shapes[this.selected] : undefined;
    if (sel && !this.editor) {
      const r = shapeRect(sel, fit);
      if (r) drawSelection(ctx, r, '#2b7cd3', !sel.groupIds?.length);
    }
  }

  // ───────────────────────── superfície: mouse e teclado ─────────────────────────

  private drag: {
    kind: 'move' | Handle; id: number; startX: number; startY: number; orig: deck.Frame; moved: boolean; pointer: number;
  } | null = null;

  private surfaceActive(e: Event): boolean {
    return this.interactive && !this.auto && !this.show && e.composedPath()[0] === this.canvas;
  }

  private canvasPoint(e: MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private onSurfaceDown = (e: PointerEvent): void => {
    if (!this.surfaceActive(e) || e.button !== 0) return;
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    if (this.editor) this.commitEditShape();
    const [x, y] = this.canvasPoint(e);
    // alça da forma selecionada
    const cur = this.selected !== null ? slide.shapes[this.selected] : undefined;
    if (cur?.xfrm && !cur.groupIds?.length) {
      const h = hitHandle(shapeRect(cur, fit)!, x, y);
      if (h) { this.startDrag(e, h, this.selected!, cur); return; }
    }
    const hit = hitShape(slide, x, y, fit);
    if (hit < 0) { this.selectShape(null); return; }
    if (hit !== this.selected) this.selectShape(hit);
    const sh = slide.shapes[hit]!;
    if (sh.xfrm && !sh.groupIds?.length) this.startDrag(e, 'move', hit, sh);
    this.canvas.focus();
  };

  private startDrag(e: PointerEvent, kind: 'move' | Handle, id: number, sh: Shape): void {
    const x = sh.xfrm!;
    this.drag = { kind, id, startX: e.clientX, startY: e.clientY, orig: { x: x.x, y: x.y, cx: x.cx, cy: x.cy }, moved: false, pointer: e.pointerId };
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* sem captura (teste) */ }
    this.canvas.addEventListener('pointermove', this.onDragMove);
    this.canvas.addEventListener('pointerup', this.onDragEnd);
    this.canvas.addEventListener('pointercancel', this.onDragEnd);
    e.preventDefault();
  }

  private onDragMove = (e: PointerEvent): void => {
    const d = this.drag;
    const fit = this.fit();
    const sh = d ? this.slides[this.index]?.shapes[d.id] : undefined;
    if (!d || !fit || !sh?.xfrm) return;
    const dx = (e.clientX - d.startX) / fit.scale, dy = (e.clientY - d.startY) / fit.scale;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3) return;
    d.moved = true;
    const f = d.kind === 'move'
      ? { ...d.orig, x: d.orig.x + (e.shiftKey && Math.abs(dy) > Math.abs(dx) ? 0 : dx), y: d.orig.y + (e.shiftKey && Math.abs(dx) >= Math.abs(dy) ? 0 : dy) }
      : resizeFrame(d.orig, d.kind, dx, dy, e.shiftKey || !!sh.image);
    // prévia: o modelo em memória anda junto (gravado no pacote ao soltar)
    sh.xfrm = { ...sh.xfrm, x: f.x, y: f.y, cx: f.cx, cy: f.cy };
    this.paint();
  };

  private onDragEnd = (e: PointerEvent): void => {
    const d = this.drag;
    this.drag = null;
    this.canvas.removeEventListener('pointermove', this.onDragMove);
    this.canvas.removeEventListener('pointerup', this.onDragEnd);
    this.canvas.removeEventListener('pointercancel', this.onDragEnd);
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* idem */ }
    if (!d?.moved) return;
    const sh = this.slides[this.index]?.shapes[d.id];
    if (!sh?.xfrm) return;
    const f = { x: sh.xfrm.x, y: sh.xfrm.y, cx: sh.xfrm.cx, cy: sh.xfrm.cy };
    sh.xfrm = { ...sh.xfrm, ...d.orig };
    if (e.type === 'pointercancel') { this.paint(); return; }
    this.setShapeFrame(f, d.id);
  };

  private onSurfaceHover = (e: MouseEvent): void => {
    if (!this.surfaceActive(e) || this.drag) return;
    e.stopPropagation(); // o cursor de hiperlink do viewer não vale na edição
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const [x, y] = this.canvasPoint(e);
    const cur = this.selected !== null ? slide.shapes[this.selected] : undefined;
    const h = cur?.xfrm && !cur.groupIds?.length ? hitHandle(shapeRect(cur, fit)!, x, y) : null;
    const hit = h ? -1 : hitShape(slide, x, y, fit);
    const over = hit >= 0 ? slide.shapes[hit] : undefined;
    this.canvas.style.cursor = h ? HANDLE_CURSOR[h] : over ? (over.groupIds?.length ? 'default' : hit === this.selected ? 'move' : 'pointer') : 'default';
  };

  private onSurfaceClick = (e: MouseEvent): void => {
    if (!this.surfaceActive(e)) return;
    // na edição o clique seleciona; Ctrl+clique segue o hiperlink (como o app)
    if (e.ctrlKey || e.metaKey) return;
    e.stopPropagation();
  };

  private onSurfaceDblClick = (e: MouseEvent): void => {
    if (!this.surfaceActive(e)) return;
    e.stopPropagation();
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const [x, y] = this.canvasPoint(e);
    const hit = hitShape(slide, x, y, fit);
    if (hit < 0) return;
    if (this.getShapeInfo(hit)?.text) { this.beginEditShape(hit); e.preventDefault(); }
  };

  private onSurfaceKey = (e: KeyboardEvent): void => {
    if (!this.surfaceActive(e) || e.defaultPrevented || this.editor) return;
    const k = e.key;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    // no modo de edição a tecla F não vira tela cheia (só no viewer)
    if (this.selected === null) { if ((k === 'f' || k === 'F') && plain) e.stopPropagation(); return; }
    const info = this.getShapeInfo();
    if (!info) return;
    const done = (): void => { e.preventDefault(); e.stopPropagation(); };
    // digitar com a forma selecionada começa a editar o texto (substituindo, como o app)
    if (k.length === 1 && plain && info.text) { e.stopPropagation(); this.beginEditShape(info.index); return; }
    if (k === 'Escape') { this.selectShape(null); done(); return; }
    if ((k === 'Delete' || k === 'Backspace') && !e.ctrlKey && !e.metaKey) { this.deleteShape(); done(); return; }
    if ((k === 'Enter' || k === 'F2') && info.text) { this.beginEditShape(info.index); done(); return; }
    if (k === 'Tab') {
      const slide = this.slides[this.index]!;
      const ids = slide.shapes.map((s, i) => (selectable(s) ? i : -1)).filter((i) => i >= 0);
      const pos = ids.indexOf(info.index);
      const next = ids[(pos + (e.shiftKey ? -1 : 1) + ids.length) % ids.length];
      if (next !== undefined) this.selectShape(next);
      done();
      return;
    }
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[k];
    if (a && info.movable && info.frame && !e.altKey) {
      const step = e.ctrlKey || e.metaKey ? 12700 : 91440;
      this.setShapeFrame({ ...info.frame, x: info.frame.x + a[0] * step, y: info.frame.y + a[1] * step });
      done();
    }
  };

  private wheelAt = 0;
  private onSurfaceWheel = (e: WheelEvent): void => {
    if (!this.interactive || this.auto || this.show || e.composedPath()[0] !== this.canvas) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      this.setZoom(Math.round(this.getZoom() * (e.deltaY < 0 ? 1.1 : 1 / 1.1) * 100) / 100);
      return;
    }
    const f = this.fit();
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const overflows = !!f && this.zoomLevel !== null && (f.sw + 32 > W || f.sh + 32 > H);
    if (overflows) {
      this.pan.x += e.shiftKey ? e.deltaY : e.deltaX;
      this.pan.y += e.shiftKey ? 0 : e.deltaY;
      this.paint();
      return;
    }
    // ajustado à janela: a roda troca de slide (como o modo Normal do app)
    const now = (window.performance ?? Date).now();
    if (now - this.wheelAt < 220 || Math.abs(e.deltaY) < 1) return;
    this.wheelAt = now;
    if (e.deltaY > 0) this.next(); else this.prev();
  };

  private onDblClick = (e: MouseEvent): void => {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // hit-test: ULTIMA shape com txBody que contem o ponto (z-order: a mais ao topo).
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i]!;
      if (!sh.txBody || !sh.xfrm || sh.inherited || sh.dgmId || sh.dgmTextOf) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh2) {
        this.beginEditShape(i);
        e.preventDefault();
        return;
      }
    }
  };

  // ───────────────────────── EDIÇÃO DE TEXTO ─────────────────────────

  /**
   * Entra em modo edição numa shape de texto. Cria um `<div contenteditable>`
   * sobre o `xfrm` da shape. Sem as barras: Enter (sem Shift) e Esc
   * commitam/cancelam; com as barras (como o app): Enter quebra o parágrafo e
   * Esc sai gravando. O commit grava no pacote: parágrafo que não mudou fica
   * como estava; o que mudou mantém o parágrafo (nível, marcador,
   * alinhamento) e a formatação do 1º run dele.
   */
  beginEditShape(shapeIdx: number): void {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const sh = slide.shapes[shapeIdx];
    if (!sh || !sh.xfrm || sh.inherited || (!sh.txBody && !(this.interactive && this.getShapeInfo(shapeIdx)?.text))) return;
    if (this.editor) this.commitEditShape();
    this.editingShape = { slide: this.index, shapeIdx };
    this.selected = this.interactive ? shapeIdx : this.selected;

    // texto inicial: concat de runs (\n entre paragrafos)
    const paragraphs = sh.txBody?.paragraphs ?? [];
    const initialText = paragraphs
      .map((p) => p.runs.map((r) => r.text).join(''))
      .join('\n');

    const left = fit.ox + sh.xfrm.x * fit.scale;
    const top = fit.oy + sh.xfrm.y * fit.scale;
    const w = sh.xfrm.cx * fit.scale;
    const h = sh.xfrm.cy * fit.scale;
    // estimativa de tamanho de fonte = sz do primeiro run (default 18pt)
    const firstRun = paragraphs.find((p) => p.runs.length)?.runs[0];
    const pt = firstRun?.sz ?? paragraphs[0]?.endSz ?? (sh.phType === 'title' || sh.phType === 'ctrTitle' ? 40 : 18);
    const px = pt * 12700 * fit.scale; // pt -> px (12700 EMU/pt, escala EMU->px)
    const color = firstRun?.color ?? '#000000';
    const font = firstRun?.font ?? 'Calibri';
    const align = paragraphs[0]?.align;

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.spellcheck = false;
    div.textContent = initialText;
    div.style.cssText =
      `position:absolute;left:${left}px;top:${top}px;width:${w}px;min-height:${h}px;` +
      `padding:4px;border:2px dashed #ff7043;outline:none;background:rgba(255,255,255,.92);` +
      `color:${color};font:${firstRun?.italic ? 'italic ' : ''}${firstRun?.bold ? '700 ' : ''}${px}px ${this.fontStackFor(font, !!firstRun?.bold, !!firstRun?.italic)};` +
      `text-align:${align === 'ctr' ? 'center' : align === 'r' ? 'right' : 'left'};` +
      `white-space:pre-wrap;z-index:5;box-sizing:border-box;`;
    this.wrap.appendChild(div);
    this.editor = div;
    div.focus();
    // seleciona todo o texto (Excel/PowerPoint convention: F2/dbl-click selects)
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }

    const pptKeys = this.interactive;
    let suppressBlur = false;
    div.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey && !pptKeys) {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEditShape();
        this.canvas.focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        suppressBlur = true;
        if (pptKeys) this.commitEditShape(); else this.cancelEditShape();
        this.canvas.focus();
      }
    });
    div.addEventListener('blur', () => {
      if (suppressBlur || !this.editingShape) return;
      this.commitEditShape();
    });
    this.paint();
    this.dispatchEvent(new CustomEvent('us-selection', { detail: { index: this.index, shape: this.selected } }));
  }

  /** Commita a edição: grava o texto no pacote e relê o slide. */
  commitEditShape(): void {
    if (!this.editor || !this.editingShape) return;
    const text = this.editor.innerText.replace(/\r\n/g, '\n').replace(/\n$/, '');
    const { slide: slideIdx, shapeIdx } = this.editingShape;
    const sh = this.slides[slideIdx]?.shapes[shapeIdx];
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    const before = sh ? (sh.txBody?.paragraphs ?? []).map((p) => p.runs.map((r) => r.text).join('')).join('\n') : '';
    const path = this.slidePartPath(slideIdx);
    if (!sh || !path || !this.pkg || text === before) { this.paint(); return; }
    const prevIndex = this.index;
    this.index = slideIdx;
    this.edit('typing', (pkg) => deck.setShapeText(pkg, path, sh.id, text, this.textLang()), slideIdx);
    this.index = prevIndex;
    this.dispatchEvent(new CustomEvent('us-shape-edit', {
      detail: { slide: slideIdx, shapeIdx, text },
    }));
    this.paint();
  }

  /** Descarta a edição em curso (texto original mantido). */
  cancelEditShape(): void {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    this.paint();
  }

  /** Forma em edição de texto (índice no slide atual) ou null. */
  getEditingShape(): number | null {
    return this.editingShape && this.editingShape.slide === this.index ? this.editingShape.shapeIdx : null;
  }
}

/** Largura × altura (px) de uma imagem, sem DOM quando dá (PNG/JPEG/GIF/BMP pelo cabeçalho). */
async function imageSize(bytes: Uint8Array, mime: string): Promise<{ w: number; h: number } | null> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) return { w: dv.getInt32(18, true), h: Math.abs(dv.getInt32(22, true)) };
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let p = 2;
      while (p < bytes.length - 8) {
        if (bytes[p] !== 0xff) { p++; continue; }
        const m = bytes[p + 1]!;
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: dv.getUint16(p + 5), w: dv.getUint16(p + 7) };
        p += 2 + dv.getUint16(p + 2);
      }
    }
  } catch { /* cabeçalho curto */ }
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mime }));
      const s = { w: bmp.width, h: bmp.height };
      bmp.close();
      return s;
    } catch { /* formato que o navegador não abre */ }
  }
  return null;
}

/**
 * Fontes que o deck usa: as nomeadas nos slides/layouts/masters e as do tema
 * (texto `+mn-lt`/`+mj-lt` usa a fonte do tema). O PowerPoint recorta cada
 * família com o texto do deck — aqui, o texto de todos os slides/layouts/
 * masters vale para todas (um pouco maior, nunca falta caractere).
 */
function deckFontUsage(pkg: PptxPackage): FontUsage[] {
  const families = new Set(collectDeckTypefaces(pkg));
  let text = '';
  for (const part of pkg.partNames()) {
    const xml = /^ppt\/(slides|slideLayouts|slideMasters|theme)\/[^/]+\.xml$/.test(part) ? pkg.getPartText(part) : undefined;
    if (!xml) continue;
    if (part.startsWith('ppt/theme/')) {
      for (const m of xml.matchAll(/<a:(?:major|minor)Font>\s*<a:latin\b[^>]*typeface="([^"]+)"/g)) families.add(unescXml(m[1]!));
      continue;
    }
    for (const m of xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) text += unescXml(m[1]!);
  }
  return [...families].filter((f) => f && !f.startsWith('+')).map((family) => ({ family, variants: ['regular'], text }));
}

customElements.define('universal-slides', UniversalSlidesElement);
