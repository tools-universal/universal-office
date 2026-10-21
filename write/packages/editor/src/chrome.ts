// Barras do <universal-write> (atributos `topbar`, `bottombar` e
// `toolbar="compact|ribbon"`): carregadas sob demanda (import dinâmico), então
// o componente sem barras não puxa nada disto. A barra superior é declarada
// sobre o framework de @universal-office/ui (comandos + layout): COMPACTA, no
// estilo Google Docs (padrão), ou RIBBON, no estilo Word. Junto vêm os
// recursos de aplicativo que antes moravam no demo: abrir/salvar, recentes,
// salvamento automático, Modo Protegido, comparar, localizar, comentários ao
// lado da página, tema, arrastar e soltar, foco/leitura e menu de contexto.
// O que depende do app hospedeiro (Electron) entra pela interface opcional
// `element.host` (chrome-host.ts), com o caminho web como recuo.
import '@universal-material/web/ripple/ripple.js';
import {
  CommandRegistry, createCompactBar, createRibbon, ensureBarStyles, isMenuOpen, closeMenus, closePopover, closeDialogs, openMenu,
  pickLabels, showToast, type BarContext, type BarHandle, type MenuEntry, type UiLang,
} from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import { appFor, type WriteApp } from './chrome-app.js';
import { registerWriteCommands, type ChromeCtl } from './chrome-commands.js';
import { aboutDialog, columnsDialog, commentDialog, fontDialog, linkDialog, pageDialog, paragraphDialog, shortcutsDialog, spellingDialog, wordCountDialog, type DialogEnv } from './chrome-dialogs.js';
import { bindHostFonts, hostOf } from './chrome-host.js';
import { tableDialog } from './chrome-table-dialogs.js';
import { tableContextItems } from './chrome-table.js';
import { LABELS } from './chrome-labels.js';
import { compactLayout, ribbonLayout } from './chrome-layout.js';
import { CommentCards, FindPanel, StatusBar } from './chrome-panels.js';
import { applyTheme, isDark } from './chrome-theme.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { StylesUI } from './chrome-styles.js';

export type { UniversalWriteHost, UniversalWriteHostFile } from './chrome-host.js';

export const CHROME_CSS = /* css */ `
:host { --uo-font: var(--uw-font, "Segoe UI", system-ui, -apple-system, sans-serif); }
/* "mesa" atrás das páginas no tom do tema (claro/escuro) */
:host { background: var(--uw-desk, var(--u-color-surface-container-high, #e8e8e8)); }
.uw-topbar { background: var(--uo-bar-bg, var(--u-color-surface, #fdfbff)) !important; border-bottom: 0 !important; }
.uw-bottombar { background: var(--uo-bar-bg, var(--u-color-surface-container, #eef0f4)) !important; }
:host(.view-read) .uo-toolrow, :host(.view-read) .uo-ribbon-body, :host(.view-read) .uw-protbar { display: none !important; }
:host(.uw-focus) .uw-topbar, :host(.uw-focus) .uw-bottombar { display: none !important; }
:host(.uw-comparing) .pages { display: none !important; }
:host(.uw-has-comments) .pages { padding-right: 300px; }

/* estilos: miniaturas da galeria, painel de estilos, inspetor, diálogo */
:host(.uw-has-pane) .pages { padding-right: 304px; }
:host(.uw-has-pane.uw-has-comments) .pages { padding-right: 604px; }
.uo-gal-tile { display: flex; flex-direction: column; align-items: stretch; }
.uw-style-sample { display: block; margin: 2px 2px 0; border-radius: 4px; flex: none; }
.uw-style-cap {
  display: block; padding: 2px 5px 0; font-size: 11px; line-height: 15px; color: var(--u-color-on-surface-variant, #44474f);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
}
.uw-styles { display: flex; flex-direction: column; gap: 6px; }
.uw-styles-opts { display: flex; gap: 6px; }
.uw-styles-opts select, .uw-style-dlg select, .uw-style-dlg input[type="text"], .uw-style-dlg input[type="number"], .uw-style-sub input[type="number"] {
  height: 30px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 6px;
  background: transparent; color: inherit; font: inherit; font-size: 13px; min-width: 0;
}
.uw-styles-opts select { flex: 1 1 0; }
.uw-styles-list { display: flex; flex-direction: column; gap: 1px; }
.uw-style-row {
  display: flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 2px 0 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
}
.uw-style-row:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-style-row.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-style-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uw-style-name canvas { display: block; }
.uw-style-kind { flex: none; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); min-width: 18px; text-align: center; }
.uw-style-more { height: 26px; min-width: 22px; padding: 0; visibility: hidden; }
.uw-style-row:hover .uw-style-more, .uw-style-row.uo-on .uw-style-more { visibility: visible; }
.uw-styles-prev { margin-top: 4px; font-size: 13px; }
.uw-insp { display: flex; flex-direction: column; gap: 4px; }
.uw-insp-h { font-size: 12px; font-weight: 600; color: var(--u-color-on-surface-variant, #44474f); margin-top: 6px; }
.uw-insp-row { display: flex; align-items: center; gap: 4px; }
.uw-insp-val {
  flex: 1 1 auto; min-width: 0; min-height: 30px; padding: 5px 8px; border: 1px solid var(--u-color-outline-variant, #c4c6d0);
  border-radius: 8px; font-size: 12.5px; line-height: 1.35; overflow-wrap: anywhere;
}
.uw-insp-pane { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px; }
.uw-style-dlg { display: flex; flex-direction: column; gap: 10px; }
.uw-style-dlg .uo-dialog-grid select, .uw-style-dlg .uo-dialog-grid input { width: 100%; }
.uw-style-fmt { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; }
.uw-style-fmt select[name="font"] { width: 180px; }
.uw-style-prev { display: block; border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; max-width: 100%; }
.uw-style-desc { font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); line-height: 1.4; }
.uw-style-checks { display: flex; gap: 18px; flex-wrap: wrap; }
.uw-style-msg { color: var(--u-color-error, #ba1a1a); font-size: 12.5px; min-height: 16px; }
.uw-style-quick { display: flex; flex-direction: column; gap: 10px; }
.uw-style-quick canvas { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; }
.uw-style-sub { display: flex; flex-direction: column; gap: 12px; }
.uw-style-fx { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }

/* camada flutuante (menus, popovers, diálogos, localizar, avisos) */
.uw-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* barra de Modo Protegido (Word: faixa amarela sob a faixa de opções) */
.uw-protbar {
  display: flex; align-items: center; gap: 12px; padding: 6px 16px; font-size: 13px;
  font-family: var(--uo-font);
  background: var(--u-color-warning-container, #ffdea8); color: var(--u-color-on-warning-container, #271900);
}
.uw-protbar[hidden] { display: none; }
.uw-protbar .uo-ic { width: 20px; height: 20px; flex: none; }
.uw-protbar span { flex: 1 1 auto; min-width: 0; }
.uw-protbar .uo-pill { flex: none; height: 30px; background: var(--u-color-warning, #7c5800); color: var(--u-color-on-warning, #fff); border: 0; }
@keyframes uwPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,181,0,0); } 30% { box-shadow: 0 0 0 5px rgba(232,181,0,.9); } }
.uw-pulse { animation: uwPulse .5s ease-out 2; }

/* barra de status */
.uw-status-bar {
  display: flex; align-items: center; gap: 4px; padding: 2px 12px; min-height: 30px;
  font-family: var(--uo-font); font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f);
}
.uw-status { font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uw-views { display: inline-flex; gap: 1px; margin-right: 6px; }
.uw-status-bar .uo-btn { height: 26px; min-width: 26px; }
.uw-status-bar .uo-ic { width: 18px; height: 18px; }
.uw-zoom-slider { width: 120px; accent-color: var(--u-color-primary, #005bc0); }
.uw-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 560px) { .uw-zoom-slider { display: none; } }

/* localizar e substituir (flutuante, não modal) */
.uw-find {
  position: fixed; right: 20px; z-index: 950; width: 340px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 14px;
  background: var(--u-color-surface-container-high, #e9e7ec); color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px;
  box-shadow: 0 12px 32px light-dark(rgba(0,0,0,.16), rgba(0,0,0,.5)); font-family: var(--uo-font); font-size: 14px;
}
.uw-find[hidden] { display: none; }
.uw-find-head { display: flex; align-items: center; justify-content: space-between; }
.uw-find input {
  height: 36px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 10px;
  background: var(--u-color-surface-container-lowest, #fff); color: inherit; font: inherit;
}
.uw-find input:focus { outline: 2px solid var(--u-color-primary, #005bc0); outline-offset: -1px; }
.uw-find input.uw-miss { outline: 2px solid var(--u-color-error, #ba1a1a); outline-offset: -1px; }
.uw-find-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.uw-find-actions .uo-pill { height: 32px; padding: 0 12px; font-size: 13px; }
.uw-find-msg { flex: 1 1 auto; font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f); }

/* comentários ao lado da página */
.uw-comments { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 5; }
.uw-card {
  position: absolute; width: 240px; padding: 8px 10px; border-radius: 10px; cursor: pointer;
  background: var(--u-color-surface-container-low, #f6f4f8); color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); box-shadow: 0 1px 3px rgba(0,0,0,.08);
  font-family: var(--uo-font); font-size: 13px; line-height: 1.4; transition: top 120ms ease-out;
}
.uw-card::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: rgba(255,187,0,.6); }
.uw-card.anchored::after {
  content: ""; position: absolute; right: 100%; top: 18px; width: 24px; margin-right: 12px;
  border-top: 1px dotted rgba(255,187,0,.7); pointer-events: none;
}
.uw-card.active { border-color: var(--u-color-primary, #005bc0); box-shadow: 0 0 0 2px var(--u-color-primary, #005bc0); }
.uw-card-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin: -2px -4px 2px 0; }
.uw-card .who { font-weight: 600; font-size: 12px; }
.uw-card .uo-btn { height: 24px; min-width: 24px; }
.uw-card .uo-ic { width: 16px; height: 16px; }
.uw-card .txt { white-space: pre-wrap; word-break: break-word; }

/* comparar */
.uw-compare { display: none; }
:host(.uw-comparing) .uw-compare { display: flex; flex-direction: column; }

/* arrastar e soltar */
.uw-drop {
  position: fixed; inset: 12px; z-index: 1200; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #005bc0); border-radius: 14px;
  background: color-mix(in srgb, var(--u-color-primary, #005bc0) 12%, transparent);
  color: var(--u-color-primary, #005bc0); font-family: var(--uo-font); font-size: 22px;
}
.uw-drop[hidden] { display: none; }
`;

interface ChromeHandle { sync: () => void }

type Mode = 'compact' | 'ribbon';

/** Atalhos que o próprio editor já trata (não roubar). */
const EDITOR_KEYS = new Set(['Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Ctrl+Shift+V', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+A', 'Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E', 'Ctrl+L', 'Ctrl+R', 'Ctrl+J', 'Ctrl+Enter']);

/** Atalhos de APLICATIVO (valem até com o foco fora do documento). */
const APP_SHORTCUTS = new Set(['open', 'save', 'saveAs', 'print', 'find', 'replace']);

/** Último <universal-write> com foco (atalhos de app com o foco no corpo da página). */
let lastFocused: WeakRef<UniversalWriteElement> | null = null;

function isField(t: EventTarget | undefined): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  // a textarea "proxy" é a entrada do próprio editor — não conta como campo
  return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.classList.contains('proxy');
}

function comboOf(e: KeyboardEvent): string {
  const code = e.code;
  let k = code.startsWith('Key') ? code.slice(3)
    : code.startsWith('Digit') ? code.slice(5)
      : ({ Equal: '=', Minus: '-', BracketLeft: '[', BracketRight: ']', Slash: '/', Space: 'Space', Enter: 'Enter', IntlRo: '/' } as Record<string, string>)[code] ?? e.key;
  if (/^F\d+$/.test(e.key)) k = e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${k}`;
}

class WriteChrome {
  private readonly ac = new AbortController();
  private readonly root: ShadowRoot;
  private readonly app: WriteApp;
  private readonly reg: CommandRegistry;
  private readonly ctx: BarContext;
  private readonly layer: HTMLElement;
  private readonly L: typeof LABELS.en;
  private readonly lang: UiLang;
  private bar: BarHandle | null = null;
  private status: StatusBar | null = null;
  private cards: CommentCards | null = null;
  private find: FindPanel | null = null;
  private styles: StylesUI | null = null;
  private protbar: HTMLElement | null = null;
  private stateCache: ReturnType<UniversalWriteElement['getSelectionState']> | null = null;
  private families: string[] = [];
  private fontAsked = false;

  constructor(
    private readonly ed: UniversalWriteElement,
    private readonly topEl: HTMLElement,
    private readonly bottomEl: HTMLElement,
    opts: { topbar: boolean; bottombar: boolean; lang: UiLang },
  ) {
    this.root = topEl.getRootNode() as ShadowRoot;
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS);
    ensureBarStyles(this.root);
    if (!this.root.querySelector('style[data-uw-chrome]')) {
      const s = document.createElement('style');
      s.dataset['uwChrome'] = '';
      s.textContent = CHROME_CSS;
      this.root.appendChild(s);
    }
    this.layer = this.root.querySelector<HTMLElement>('.uw-layer') ?? this.makeLayer();
    this.layer.replaceChildren();

    const app = this.app = appFor(ed);
    app.ui = {
      L: this.L, layer: this.layer,
      flash: (m) => this.flash(m),
      sync: () => this.sync(),
      protectedChanged: () => this.sync(),
      pulseEnable: () => {
        const b = this.protbar?.querySelector<HTMLElement>('.uo-pill');
        if (!b) return;
        b.classList.remove('uw-pulse');
        void b.offsetWidth;
        b.classList.add('uw-pulse');
      },
    };
    if (!app.title) app.title = this.L.untitled;
    app.attach();
    app.bindHost();
    bindHostFonts(hostOf(ed));
    this.applyTheme();

    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    this.styles = new StylesUI({ ed, app, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
    registerWriteCommands(this.reg, ed, app, this.ctl());

    const env: WidgetEnv = { ed, app, ctl: this.ctl(), root: this.root, styles: this.styles };
    topEl.replaceChildren();
    bottomEl.replaceChildren();
    if (opts.topbar) {
      this.bar = this.mode() === 'ribbon'
        ? createRibbon(topEl, ribbonLayout(env, this.ctx), this.ctx)
        : createCompactBar(topEl, compactLayout(env, this.ctx), this.ctx);
      this.protbar = this.makeProtectedBar();
      topEl.appendChild(this.protbar);
      this.cards = new CommentCards(ed, app, this.root, () => this.after());
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) this.status = new StatusBar(ed, app, bottomEl, this.ctx);
    this.bindEvents();
    // tirar topbar e bottombar não reimporta este módulo: desmonta sozinho;
    // `theme`/`accent` mudados pelo hospedeiro reaplicam o tema
    const mo = new MutationObserver((recs) => {
      if (!ed.hasAttribute('topbar') && !ed.hasAttribute('bottombar')) { teardownChrome(ed); return; }
      if (recs.some((r) => r.attributeName === 'theme' || r.attributeName === 'accent')) { this.applyTheme(); this.sync(); }
    });
    mo.observe(ed, { attributes: true, attributeFilter: ['topbar', 'bottombar', 'theme', 'accent'] });
    // "Automático": a troca claro/escuro do SO chega aos controles da janela (Electron)
    if (typeof matchMedia !== 'undefined') {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const m = this.app.mode;
        if (m === 'auto' || m === null) hostOf(ed)?.setTitleTheme?.(isDark(m));
      }, { signal: this.ac.signal });
    }
    this.ac.signal.addEventListener('abort', () => mo.disconnect());
    void ed.listAvailableFonts().then((f) => { this.families = f; });
    this.sync();
    this.cards?.schedule();
  }

  private makeLayer(): HTMLElement {
    const l = document.createElement('div');
    l.className = 'uw-layer';
    // o editor escuta mousedown/teclas no host: o que acontece na camada é da barra
    for (const t of ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'keydown', 'keyup', 'keypress', 'wheel', 'input', 'paste', 'copy', 'cut'] as const) {
      l.addEventListener(t, (e) => e.stopPropagation(), { passive: t === 'wheel' });
    }
    this.root.appendChild(l);
    return l;
  }

  private mode(): Mode {
    const a = this.ed.getAttribute('toolbar');
    if (a === 'ribbon' || a === 'compact') return a;
    // escolha no menu Ver gravada só POR INSTÂNCIA (storage-key/id); o atributo sempre manda
    return this.app.prefs.get('toolbar') === 'ribbon' ? 'ribbon' : 'compact';
  }

  private ctl(): ChromeCtl {
    const d = (): DialogEnv => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
    return {
      state: () => this.state(),
      find: (replace) => this.openFind(replace),
      comment: () => { void commentDialog(d()).then(() => this.after()); },
      link: () => { void linkDialog(d()).then(() => this.after()); },
      image: () => this.pickImage(),
      fontDialog: () => { void fontDialog(d(), this.families).then(() => this.after()); },
      paragraphDialog: () => { void paragraphDialog(d()).then(() => this.after()); },
      pageDialog: () => { void pageDialog(d()).then(() => this.after()); },
      columnsDialog: () => { void columnsDialog(d()).then(() => this.after()); },
      wordCount: () => wordCountDialog(d()),
      spelling: () => { void spellingDialog(d()).then(() => this.after()); },
      shortcuts: () => shortcutsDialog(d()),
      about: () => aboutDialog(d()),
      compare: () => { void this.compare(); },
      focusMode: () => this.toggleFocus(),
      inFocusMode: () => this.ed.classList.contains('uw-focus'),
      toolbarMode: () => this.mode(),
      setToolbarMode: (m) => {
        this.app.prefs.set('toolbar', m);
        this.ed.setAttribute('toolbar', m);
      },
      toggleComments: () => {
        this.app.commentsVisible = !this.app.commentsVisible;
        this.app.prefs.set('comments', this.app.commentsVisible ? '1' : '0');
        this.cards?.render();
      },
      requestFonts: () => this.requestFonts(),
      flash: (m) => this.flash(m),
      applyTheme: () => this.applyTheme(),
      stylesPane: () => this.styles?.togglePane(),
      stylesPaneOpen: () => !!this.styles?.paneOpen,
      styleInspector: () => this.styles?.toggleInspector(),
      inspectorOpen: () => !!this.styles?.inspectorOpen,
      newStyle: () => { void this.styles?.styleDialog('new'); },
      modifyStyle: () => { const c = this.ed.currentStyles(); void this.styles?.styleDialog('modify', c.character ?? c.paragraph); },
      tableDialog: (kind) => { void tableDialog(d(), kind).then(() => this.after()); },
    };
  }

  state(): ReturnType<UniversalWriteElement['getSelectionState']> {
    return (this.stateCache ??= this.ed.getSelectionState());
  }

  /** Tema só quando pedido (atributo `theme` ou escolha no menu); senão herda a página. */
  private applyTheme(): void {
    const mode = this.app.mode;
    applyTheme(this.ed, this.root, this.app.accent, mode);
    hostOf(this.ed)?.setTitleTheme?.(isDark(mode));
  }

  /** Depois de qualquer ação: foco de volta ao documento (se não abriu painel) e sincroniza. */
  private after(): void {
    if (this.ac.signal.aborted) return;
    const a = this.root.activeElement;
    const inLayer = !!a && this.layer.contains(a);
    const inBar = !!a && this.topEl.contains(a) && (a.tagName === 'INPUT');
    if (!isMenuOpen()) closePopover(); // grupo recolhido: fecha depois da ação, como no Word
    if (!inLayer && !inBar && !isMenuOpen()) this.ed.focusEditor();
    this.sync();
  }

  /** Um sync por quadro, venha de onde vier (seleção, eventos, ações). */
  sync(): void {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.syncNow(); });
  }

  private raf = 0;

  private syncNow(): void {
    this.stateCache = null;
    this.app.bindHost();
    this.topEl.classList.toggle('uo-wco', !!hostOf(this.ed)?.windowControlsOverlay);
    if (this.protbar) this.protbar.hidden = !this.ed.isProtected();
    this.bar?.sync();
    this.status?.sync();
    this.styles?.sync();
  }

  /** Área do documento entre as barras (o painel lateral acopla à direita, sem cobrir a rolagem). */
  private docFrame(): DOMRect {
    const r = this.ed.getBoundingClientRect();
    const top = this.topEl.getBoundingClientRect(), bot = this.bottomEl.getBoundingClientRect();
    const t = top.height ? top.bottom : r.top;
    const b = bot.height ? bot.top : r.bottom;
    const right = r.left + this.ed.clientLeft + this.ed.clientWidth;
    return new DOMRect(r.left, t, right - r.left, b - t);
  }

  flash(msg: string): void {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }

  destroy(): void {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    // diálogos abertos resolvem como cancelados ANTES de a camada sumir
    closeDialogs(this.layer);
    this.styles?.close();
    this.bar?.destroy();
    this.cards?.destroy();
    this.layer.replaceChildren();
    this.root.querySelector('.uw-compare')?.remove();
    this.topEl.classList.remove('uo-wco');
    this.topEl.replaceChildren();
    this.bottomEl.replaceChildren();
    this.ed.classList.remove('uw-comparing', 'uw-focus');
    if (this.app.ui?.layer === this.layer) this.app.detach();
  }

  // ───── Modo Protegido ─────
  private makeProtectedBar(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'uw-protbar';
    el.setAttribute('part', 'protected-bar');
    el.setAttribute('role', 'alert');
    el.innerHTML = `<svg class="uo-ic" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-81q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 143-80 264.5T505-85q-6 2-12 3t-13 1Z"/></svg>
      <span><b></b> — </span><button type="button" class="uo-pill" data-a="enableEditing"></button>`;
    el.querySelector('b')!.textContent = this.L.protectedTitle;
    el.querySelector('span')!.append(this.L.protectedText);
    const b = el.querySelector('button')!;
    b.textContent = this.L.enableEditing;
    b.addEventListener('click', () => { this.app.enableEditing(); this.after(); });
    el.hidden = true;
    return el;
  }

  // ───── localizar ─────
  private openFind(replace: boolean): void {
    this.find ??= new FindPanel(this.ed, this.app, this.layer);
    if (!this.find.el.isConnected) this.layer.appendChild(this.find.el);
    const r = this.topEl.getBoundingClientRect();
    this.find.open(replace, Math.max(r.bottom, this.ed.getBoundingClientRect().top) + 8);
  }

  // ───── imagem ─────
  private pickImage(): void {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      const ext = ({ 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp' } as Record<string, string>)[f.type] ?? 'png';
      await this.ed.insertImage(new Uint8Array(await f.arrayBuffer()), ext);
      this.after();
    });
    input.click();
  }

  // ───── fontes instaladas (Local Font Access, Chromium) ─────
  private requestFonts(): void {
    if (this.fontAsked || this.ed.hasHostSystemFonts()) return;
    this.fontAsked = true;
    void this.ed.requestSystemFonts().then(async (ok) => {
      this.families = await this.ed.listAvailableFonts();
      if (!ok) return;
      this.flash(this.L.fontAccessOk(this.families.length));
    });
  }

  // ───── foco ─────
  private toggleFocus(): void {
    const ed = this.ed;
    if (ed.classList.contains('uw-focus')) {
      ed.classList.remove('uw-focus');
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    } else {
      ed.classList.add('uw-focus');
      void ed.requestFullscreen?.().catch(() => { /* bloqueado (iframe) — fica só sem as barras */ });
    }
    this.after();
  }

  // ───── comparar ─────
  private closeCompare: (() => void) | null = null;

  private async compare(): Promise<void> {
    const other = await this.app.pickForCompare();
    if (!other) return;
    let current: Uint8Array;
    try { current = this.ed.saveDocx(); } catch { this.flash(`⚠ ${this.L.stillLoading}`); return; }
    await import('@universal-office/compare');
    let box = this.root.querySelector<HTMLElement>('.uw-compare');
    if (!box) {
      box = document.createElement('div');
      box.className = 'uw-compare';
      box.setAttribute('part', 'compare');
      for (const t of ['mousedown', 'dblclick', 'contextmenu', 'keydown', 'wheel'] as const) {
        box.addEventListener(t, (e) => e.stopPropagation(), { passive: t === 'wheel' });
      }
      // Esc fecha a comparação também com o foco dentro do diff
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !e.defaultPrevented && !isMenuOpen()) { e.preventDefault(); this.closeCompare?.(); }
      });
      const wd = document.createElement('universal-write-diff');
      wd.setAttribute('lang', this.lang);
      wd.style.cssText = 'flex:1;min-height:0;display:flex';
      box.appendChild(wd);
      // logo depois das páginas: ocupa o lugar delas entre as barras
      this.root.querySelector('.pages')?.after(box);
    }
    const wd = box.firstElementChild as HTMLElement & {
      loadPair(a: Uint8Array, b: Uint8Array, o: { leftLabel: string; rightLabel: string }): void;
    };
    const fit = (): void => {
      const h = this.ed.clientHeight - this.topEl.offsetHeight - this.bottomEl.offsetHeight;
      box!.style.height = `${Math.max(200, h)}px`;
    };
    const close = (): void => {
      this.closeCompare = null;
      this.app.comparing = false;
      this.ed.classList.remove('uw-comparing');
      ro.disconnect();
      this.after();
    };
    this.closeCompare = close;
    const ro = new ResizeObserver(fit);
    this.ac.signal.addEventListener('abort', () => ro.disconnect());
    try {
      wd.loadPair(current, other.bytes, { leftLabel: this.L.compareCurrent(this.app.docName), rightLabel: other.name });
    } catch {
      this.flash(`⚠ ${this.L.notValidDocx(other.name)}`);
      return;
    }
    wd.addEventListener('close-request', close, { once: true, signal: this.ac.signal });
    wd.addEventListener('ready', (e) => {
      this.flash(this.L.compareStats((e as CustomEvent<{ stats: { inserted: number; deleted: number; changed: number; formatOnly: number } }>).detail.stats));
    }, { once: true, signal: this.ac.signal });
    this.app.comparing = true;
    this.ed.classList.add('uw-comparing');
    this.ed.scrollTop = 0;
    ro.observe(this.ed);
    fit();
    this.sync();
  }

  // ───── eventos ─────
  private bindEvents(): void {
    const { ed } = this;
    const signal = this.ac.signal;
    const resync = (): void => this.sync();
    // uw-zoom e uw-change o próprio elemento já repassa (chromeSync)
    for (const t of ['uw-hfmode', 'uw-cellmode', 'uw-tbmode', 'uw-protected', 'uw-ready', 'uw-styles-change']) {
      ed.addEventListener(t, resync, { signal });
    }
    // página atual enquanto rola
    let tick = false;
    ed.addEventListener('scroll', () => {
      if (tick || !this.status) return;
      tick = true;
      setTimeout(() => { tick = false; this.status?.sync(); }, 150);
    }, { signal, passive: true });
    if (this.cards) {
      const cards = this.cards;
      // uw-protected sai a cada carga de documento
      for (const t of ['uw-comments-changed', 'uw-change', 'uw-zoom', 'uw-ready', 'uw-protected']) ed.addEventListener(t, () => cards.schedule(), { signal });
      const cro = new ResizeObserver(() => cards.schedule());
      cro.observe(ed);
      signal.addEventListener('abort', () => cro.disconnect());
      ed.addEventListener('uw-comment-click', ((e: CustomEvent<{ ids: number[] }>) => {
        this.app.activeCommentIds = e.detail.ids;
        cards.render();
        this.sync();
      }) as EventListener, { signal });
    }
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && ed.classList.contains('uw-focus')) { ed.classList.remove('uw-focus'); this.sync(); }
    }, { signal });
  }

  /** Recursos de documento só com a barra superior: atalhos, contexto, arrastar e soltar. */
  private bindDocumentFeatures(): void {
    const { ed } = this;
    const signal = this.ac.signal;
    const byShortcut = new Map<string, string>();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id)!.shortcut;
      if (sc && !EDITOR_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    const run = (e: KeyboardEvent, id: string): void => {
      e.preventDefault();
      e.stopPropagation();
      void this.reg.run(id);
    };
    ed.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && this.app.comparing) { e.preventDefault(); this.closeCompare?.(); return; }
      const id = byShortcut.get(comboOf(e));
      if (!id || !this.reg.supported(id)) return;
      // num campo da própria barra (título, tamanho da fonte) só os atalhos de app
      if (isField(e.composedPath()[0]) && !APP_SHORTCUTS.has(id)) return;
      run(e, id);
    }, { signal });
    ed.addEventListener('focusin', () => { lastFocused = new WeakRef(ed); }, { signal });
    // atalhos de APP com o foco fora do elemento (corpo da página): só se este é
    // o último <universal-write> focado (ou o único com topbar), e nunca em
    // campos de outros elementos
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.some((n) => n instanceof HTMLElement && n.localName === 'universal-write')) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === ed : document.querySelectorAll('universal-write[topbar]').length === 1;
      if (mine) run(e, id);
    }, { signal });

    // menu de contexto
    ed.addEventListener('contextmenu', (e) => {
      if (e.composedPath().some((n) => n === this.topEl || n === this.bottomEl || n === this.layer)) return;
      if (this.app.comparing) return;
      e.preventDefault();
      const at = { x: e.clientX, y: e.clientY };
      const items: MenuEntry[] = ['cut', 'copy', 'paste', 'pastePlain', '-', ...(ed.getTableState() ? tableContextItems() : []), 'bold', 'italic', 'underline', '-',
        'link', 'comment', '-', 'list:bullet', 'list:decimal', '-', 'find', 'selectAll'];
      const open = (pre: MenuEntry[]): void => {
        openMenu([...pre, ...items], at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
      };
      // palavra errada sob o clique: sugestões no topo, como o Word
      const m = ed.spellingAtCaret();
      if (!m) { open([]); return; }
      void ed.spellingSuggestions(m).then((sug) => {
        const pre: MenuEntry[] = sug.length
          ? sug.map((s): MenuEntry => ({ label: s, onClick: () => { ed.replaceSpelling(m, s); this.after(); } }))
          : [{ label: { en: '(no suggestions)', pt: '(sem sugestões)' }, disabled: true }];
        open([...pre, '-',
          { icon: 'visibility_off', label: { en: 'Ignore All', pt: 'Ignorar tudo' }, onClick: () => ed.ignoreSpelling(m.word) },
          { icon: 'library_add', label: { en: 'Add to Dictionary', pt: 'Adicionar ao dicionário' }, onClick: () => { void ed.addToDictionary(m.word); } },
          '-']);
      }, () => open([]));
    }, { signal });

    // arrastar e soltar um .docx/.odt para abrir
    const overlay = document.createElement('div');
    overlay.className = 'uw-drop';
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer?.types?.includes('Files');
    ed.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; overlay.hidden = false; }, { signal });
    ed.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--depth <= 0) { depth = 0; overlay.hidden = true; } }, { signal });
    ed.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); }, { signal });
    ed.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      void (async () => {
        const bytes = new Uint8Array(await f.arrayBuffer());
        // .docx/.odt/.doc pela extensão ou pelo conteúdo (ZIP "PK" / OLE)
        const ok = /\.(docx|odt|doc)$/i.test(f.name) || (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
        if (!ok) { this.flash(`⚠ ${this.L.notDoc(f.name)}`); return; }
        await this.app.openFile(f);
        this.sync();
      })();
    }, { signal });
  }
}

const chromes = new WeakMap<UniversalWriteElement, WriteChrome>();

export function setupChrome(
  editor: UniversalWriteElement,
  topbarEl: HTMLElement,
  bottombarEl: HTMLElement,
  opts: { topbar: boolean; bottombar: boolean; lang: UiLang },
): ChromeHandle {
  chromes.get(editor)?.destroy();
  const c = new WriteChrome(editor, topbarEl, bottombarEl, opts);
  chromes.set(editor, c);
  return { sync: () => c.sync() };
}

/** Desmonta as barras (usado quando topbar e bottombar saem). */
export function teardownChrome(editor: UniversalWriteElement): void {
  chromes.get(editor)?.destroy();
  chromes.delete(editor);
}
