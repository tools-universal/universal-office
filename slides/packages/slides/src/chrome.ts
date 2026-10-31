// Barras do <universal-slides> (atributos `topbar`, `bottombar` e
// `toolbar="compact|ribbon"`): carregadas sob demanda (import dinâmico), então
// o componente sem barras não puxa nada disto. Declaradas sobre o framework
// de @universal-office/ui, como as do <universal-write>: COMPACTA (estilo
// Google Slides, título acima dos menus — padrão) ou RIBBON (estilo
// PowerPoint). Junto vêm o painel de MINIATURAS, as ANOTAÇÕES, a
// CLASSIFICAÇÃO DE SLIDES, o modo de LEITURA, a barra de STATUS, os atalhos
// do PowerPoint, arrastar e soltar, área de transferência das formas, tema e
// a integração opcional com o app hospedeiro (`element.appHost`).
import {
  CommandRegistry, closeDialogs, closeMenus, closePanes, closePopover, createCompactBar, createRibbon, ensureBarStyles,
  extendCompact, extendRibbon, hideInCompact, hideInRibbon, isMenuOpen, openFontEmbeddingDialog, openMenu, pickLabels, showToast,
  type BarContext, type BarContribution, type BarHandle, type UiLang,
} from '@universal-office/ui';
import { FontResolver } from '@universal-office/fonts';
import type { UniversalSlidesElement } from './universal-slides.js';
import type { ShapeClip } from './deck-edit.js';
import { appFor, type SlidesApp } from './chrome-app.js';
import { registerSlidesCommands, type ChromeCtl, type ViewMode } from './chrome-commands.js';
import { compactLayout, ribbonLayout } from './chrome-layout.js';
import { AnimationPane, NotesPane, SlideList, StatusBar } from './chrome-panels.js';
import { FindDialog, aboutDialog, advanceDialog, linkDialog, propertiesDialog, shortcutsDialog, showSetupDialog, sizeDialog, type DialogEnv } from './chrome-dialogs.js';
import { LABELS, type ChromeLabels } from './chrome-labels.js';
import type { WidgetEnv } from './chrome-widgets.js';

export { barKit } from './bar-kit.js';

/** Montagem das barras (o elemento chama setupChrome a cada mudança de atributo/idioma/plugins). */
export interface ChromeOptions {
  topbar: boolean;
  bottombar: boolean;
  lang: UiLang;
  /** contribuições dos plugins (`plugin.toolbar`), já colhidas pelo elemento */
  contributions?: readonly BarContribution[];
}

/**
 * Paleta das barras quando a página não define os tokens do
 * @universal-material: tons de um destaque laranja-avermelhado (o do Slides)
 * sobre superfícies neutras, em `light-dark()` — o claro/escuro vem só do
 * `color-scheme` (do contexto ou do atributo `theme`).
 */
const PALETTE = /* css */ `:host {
  --u-color-primary: light-dark(#a8401e, #ffb59c);
  --u-color-on-primary: light-dark(#ffffff, #5c1900);
  --u-color-surface: light-dark(#fcfbfb, #141313);
  --u-color-surface-container-lowest: light-dark(#ffffff, #0e0e0e);
  --u-color-surface-container-low: light-dark(#f6f5f5, #1c1b1b);
  --u-color-surface-container: light-dark(#efeded, #201f1f);
  --u-color-surface-container-high: light-dark(#e9e7e7, #2b2a2a);
  --u-color-surface-container-highest: light-dark(#e3e1e1, #363434);
  --u-color-on-surface: light-dark(#1c1b1b, #e6e1e1);
  --u-color-on-surface-variant: light-dark(#4b4646, #cdc5c4);
  --u-color-outline: light-dark(#7c7575, #968f8e);
  --u-color-outline-variant: light-dark(#cdc5c4, #4b4646);
  --u-color-secondary-container: light-dark(#ffdbd0, #5d4037);
  --u-color-on-secondary-container: light-dark(#3a0b00, #ffdbd0);
  --u-color-tertiary: light-dark(#715b2e, #e0c38c);
  --u-color-error: light-dark(#ba1a1a, #ffb4ab);
  --u-color-error-container: light-dark(#ffdad6, #93000a);
  --u-color-on-error-container: light-dark(#410002, #ffdad6);
  --u-color-inverse-surface: light-dark(#313030, #e6e1e1);
  --u-color-inverse-on-surface: light-dark(#f4f0ef, #313030);
  --u-color-warning-container: light-dark(#ffdea8, #5c4200);
  --u-color-on-warning-container: light-dark(#271900, #ffdea8);
}`;

export const CHROME_CSS = /* css */ `
/* isolation: os z-index internos ficam contidos no componente (não cobrem a página) */
:host { display: block; min-height: 320px; isolation: isolate; --uo-font: var(--us-font, "Segoe UI", system-ui, -apple-system, sans-serif);
  --us-bg: var(--us-background, var(--u-color-surface-container-low, light-dark(#f6f5f5, #1c1b1b))); }
/* UMA cor de fundo (como o Google Slides/Docs): barras, miniaturas, mesa e status
   são --us-background; o slide e o que flutua (menus, diálogos) têm outra cor */
.us-shell {
  display: flex; flex-direction: column; width: 100%; height: 100%; min-height: inherit; box-sizing: border-box;
  background: var(--us-bg); color: var(--u-color-on-surface, light-dark(#1c1b1b, #e6e1e1)); font-family: var(--uo-font);
}
.us-top, .us-bottom { flex: none; background: var(--uo-bar-bg, var(--us-bg)); }
.us-top > .uo-bar, .us-bottom > .uo-bar { background: transparent; }
.us-top .uo-toolbar, .us-top .uo-ribbon-body {
  background: var(--uo-bar-container, light-dark(var(--u-color-surface-container, #efeded), var(--u-color-surface-container-high, #2b2a2a)));
}
.us-top:empty, .us-bottom:empty { display: none; }
.us-body { flex: 1 1 auto; min-height: 0; display: flex; }
.us-center { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.us-stage { flex: 1 1 auto; min-height: 0; position: relative; }
.us-wrap { background: var(--us-desk, var(--us-bg)); }
.us-wrap canvas:focus-visible { outline: 2px solid var(--u-color-primary, #a8401e); outline-offset: -2px; }
.us-badge { display: none !important; }

/* miniaturas (modo Normal) e classificação de slides */
.us-thumbs {
  flex: none; width: var(--us-thumbnails-width, 200px); overflow-y: auto; overflow-x: hidden; box-sizing: border-box;
  padding: 6px 10px 12px 2px; outline: none; scrollbar-width: thin;
}
.us-sorter {
  flex: 1 1 auto; min-height: 0; overflow: auto; outline: none; box-sizing: border-box; padding: 18px 22px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--us-sorter-size, 210px), 1fr)); gap: 18px 16px; align-content: start;
}
.us-sorter[hidden], .us-thumbs[hidden] { display: none; }
.us-slide { display: flex; gap: 4px; align-items: flex-start; padding: 4px 2px; margin-bottom: 4px; border-radius: 10px; cursor: pointer; user-select: none; }
.us-sorter .us-slide { flex-direction: column-reverse; gap: 4px; margin: 0; padding: 4px; }
.us-num { flex: none; width: 22px; text-align: right; padding-top: 1px; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); font-variant-numeric: tabular-nums; }
.us-sorter .us-num { width: auto; text-align: left; padding: 0 2px; }
.us-frame {
  position: relative; flex: 1 1 auto; min-width: 0; border-radius: 6px; overflow: hidden; background: #fff;
  outline: 1px solid var(--u-color-outline-variant, #cdc5c4); outline-offset: 0; aspect-ratio: 16 / 9;
}
.us-sorter .us-frame { width: 100%; }
.us-slide:hover .us-frame { outline-color: var(--u-color-outline, #7c7575); }
.us-slide.uo-on .us-frame { outline: 3px solid var(--u-color-primary, #a8401e); }
.us-slide.uo-on .us-num { color: var(--u-color-primary, #a8401e); font-weight: 600; }
.us-thumbs:focus-visible .us-slide.uo-on .us-frame, .us-sorter:focus-visible .us-slide.uo-on .us-frame { outline-offset: 2px; }
.us-frame canvas { display: block; width: 100%; height: 100%; }
.us-hidden-mark { display: none; position: absolute; inset: 0; place-items: center; background: color-mix(in srgb, var(--us-bg) 55%, transparent); color: var(--u-color-on-surface-variant, #4b4646); }
.us-hidden-mark .uo-ic { width: 28px; height: 28px; }
.us-is-hidden .us-hidden-mark { display: grid; }
.us-is-hidden .us-num { text-decoration: line-through; }
.us-dragging { opacity: .45; }
.us-thumbs .us-drop-before { box-shadow: inset 0 3px 0 var(--u-color-primary, #a8401e); }
.us-thumbs .us-drop-after { box-shadow: inset 0 -3px 0 var(--u-color-primary, #a8401e); }
.us-sorter .us-drop-before { box-shadow: inset 3px 0 0 var(--u-color-primary, #a8401e); }
.us-sorter .us-drop-after { box-shadow: inset -3px 0 0 var(--u-color-primary, #a8401e); }
.us-thumbs-empty { padding: 12px; font-size: 13px; color: var(--u-color-on-surface-variant, #4b4646); }

/* anotações do orador */
.us-notes { flex: none; height: var(--us-notes-height, 112px); display: flex; flex-direction: column; border-top: 1px solid var(--u-color-outline-variant, #cdc5c4); }
.us-notes[hidden] { display: none; }
.us-notes-grip { flex: none; height: 6px; margin-top: -3px; cursor: ns-resize; }
.us-notes-text {
  flex: 1 1 auto; resize: none; border: 0; outline: none; background: transparent; color: inherit; box-sizing: border-box;
  font: 14px/1.5 var(--uo-font); padding: 4px 18px 10px;
}
.us-notes-text::placeholder { color: var(--u-color-on-surface-variant, #4b4646); opacity: .8; }

/* modos de exibição */
.us-shell.us-view-sorter .us-stage, .us-shell.us-view-sorter .us-notes, .us-shell.us-view-sorter .us-thumbs { display: none; }
.us-shell.us-reading .us-top, .us-shell.us-reading .us-thumbs, .us-shell.us-reading .us-notes { display: none; }
/* painel lateral (Painel de Animação): o palco encolhe em vez de ficar por baixo */
.us-shell.us-has-pane .us-center { padding-right: 280px; }

/* barra de status */
.us-status-bar { display: flex; align-items: center; gap: 2px; padding: 2px 10px; min-height: 30px; font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-status { font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12.5px !important; color: inherit !important; padding: 0 8px !important; }
.us-views { display: inline-flex; gap: 1px; margin: 0 6px; }
.us-status-bar .uo-btn { height: 26px; min-width: 26px; }
.us-status-bar .uo-ic { width: 18px; height: 18px; }
.us-zoom-slider { width: 110px; accent-color: var(--u-color-primary, #a8401e); }
.us-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 640px) { .us-zoom-slider, .us-views { display: none; } }

/* logo, Apresentação de Slides, formas, transições */
.us-logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--u-color-primary, #a8401e); color: var(--u-color-on-primary, #fff); }
.us-logo .uo-ic { width: 24px; height: 24px; }
.us-show { display: inline-flex; align-items: stretch; flex: none; }
.us-show-main { border-radius: 19px 0 0 19px; padding: 0 14px 0 12px; }
.us-show-arrow { border-radius: 0 19px 19px 0; padding: 0 6px; margin-left: 1px; }
.us-shapes { display: grid; grid-template-columns: repeat(7, 34px); gap: 2px; padding: 2px; }
.us-shape-tile { width: 34px; height: 34px; padding: 0; color: var(--u-color-on-surface, #1c1b1b); }
.us-shape-tile canvas { display: block; }
.uo-gal-tile.us-tr-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; }
.us-tr-ic { width: 26px !important; height: 26px !important; color: var(--u-color-primary, #a8401e); }
.us-tr-lbl { display: block; max-width: 100%; padding: 0 3px; font-size: 11px; line-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.us-after { gap: 6px; }
.us-after .uo-spin-box { margin-left: 0; }
.us-after input[type=checkbox] { margin: 0; accent-color: var(--u-color-primary, #a8401e); }

/* camada flutuante (menus, popovers, diálogos, painéis, avisos) */
.us-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* arrastar e soltar */
.us-drop {
  position: fixed; inset: 12px; z-index: 1200; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #a8401e); border-radius: 14px;
  background: color-mix(in srgb, var(--u-color-primary, #a8401e) 12%, transparent);
  color: var(--u-color-primary, #a8401e); font-family: var(--uo-font); font-size: 22px;
}
.us-drop[hidden] { display: none; }

/* diálogos e painéis */
.us-find { display: flex; flex-direction: column; gap: 10px; }
.us-find-msg { min-height: 18px; font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-setup { display: flex; flex-direction: column; gap: 10px; }
.us-props .us-props-k { font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-props .us-props-v { font-size: 13px; }
.us-keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; align-items: center; font-size: 13px; }
.us-keys kbd { font: 12px/1.6 ui-monospace, Consolas, monospace; padding: 1px 6px; border-radius: 6px; border: 1px solid var(--u-color-outline-variant, #cdc5c4); white-space: nowrap; justify-self: start; }
.us-about p { margin: 0; }
.us-anim { display: flex; flex-direction: column; gap: 10px; }
.us-anim-play { align-self: flex-start; height: 32px; padding: 0 14px 0 10px; }
.us-anim-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.us-anim-item { display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 6px; border-radius: 6px; font-size: 13px; }
.us-anim-item:hover { background: var(--u-color-surface-container-highest, #e3e1e1); }
.us-anim-step { width: 16px; text-align: right; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-anim-kind .uo-ic { width: 16px; height: 16px; }
.us-anim-entr .us-anim-kind { color: #2e7d32; }
.us-anim-exit .us-anim-kind { color: #c62828; }
.us-anim-emph .us-anim-kind { color: #f9a825; }
.us-anim-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.us-anim-empty { padding: 6px; color: var(--u-color-on-surface-variant, #4b4646); font-size: 13px; }
.us-anim-note { margin: 4px 2px 0; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); line-height: 1.4; }
`;

/** Atalhos que vão para os eventos nativos (área de transferência) ou para a superfície do slide. */
const NATIVE_KEYS = new Set(['Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Del']);
/** Atalhos de APLICATIVO: valem num campo da barra e com o foco fora do elemento. */
const APP_SHORTCUTS = new Set(['open', 'save', 'saveAs', 'print', 'find', 'replace', 'show:start', 'show:current']);

/** Último <universal-slides> com foco (atalhos de app com o foco no corpo da página). */
let lastFocused: WeakRef<UniversalSlidesElement> | null = null;
/** Forma copiada (vale entre instâncias da página). */
let shapeClipboard: ShapeClip | null = null;

function isField(t: EventTarget | undefined): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

function comboOf(e: KeyboardEvent): string {
  const code = e.code ?? '';
  let k = code.startsWith('Key') ? code.slice(3)
    : code.startsWith('Digit') ? code.slice(5)
      : ({ Equal: '=', Minus: '-', BracketLeft: '[', BracketRight: ']', Slash: '/', Space: 'Space', Enter: 'Enter', Delete: 'Del', NumpadAdd: '=', NumpadSubtract: '-' } as Record<string, string>)[code] ?? e.key;
  if (/^F\d+$/.test(e.key)) k = e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${k}`;
}

/** A página define os tokens do @universal-material (herdados pelo host)? */
function pageDefinesTokens(host: HTMLElement): boolean {
  const parent = host.parentElement ?? ((host.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
  if (!parent || typeof getComputedStyle !== 'function') return false;
  return getComputedStyle(parent).getPropertyValue('--u-color-surface').trim() !== '';
}

class SlidesChrome {
  private readonly ac = new AbortController();
  private readonly root: ShadowRoot;
  private readonly app: SlidesApp;
  private readonly reg: CommandRegistry;
  private readonly ctx: BarContext;
  private readonly layer: HTMLElement;
  private readonly L: ChromeLabels;
  private readonly lang: UiLang;
  private readonly shell: HTMLElement;
  private readonly topEl: HTMLElement;
  private readonly bottomEl: HTMLElement;
  private readonly center: HTMLElement;
  private bar: BarHandle | null = null;
  private status: StatusBar | null = null;
  private thumbs: SlideList | null = null;
  private sorter: SlideList | null = null;
  private notes: NotesPane | null = null;
  private anim: AnimationPane | null = null;
  private find: FindDialog | null = null;
  private viewMode: ViewMode = 'normal';
  private raf = 0;
  private readonly chromeStyle: HTMLStyleElement;
  private paletteStyle: HTMLStyleElement | null = null;

  constructor(private readonly el: UniversalSlidesElement, opts: ChromeOptions) {
    const parts = el.chromeParts();
    this.root = parts.root;
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS);
    ensureBarStyles(this.root);
    this.chromeStyle = document.createElement('style');
    this.chromeStyle.dataset['usChrome'] = '';
    this.chromeStyle.textContent = CHROME_CSS;
    this.root.appendChild(this.chromeStyle);
    // paleta própria só quando a página não traz os tokens do @universal-material
    if (!pageDefinesTokens(el)) {
      this.paletteStyle = document.createElement('style');
      this.paletteStyle.dataset['usPalette'] = '';
      this.paletteStyle.textContent = PALETTE;
      this.root.prepend(this.paletteStyle);
    }

    // estrutura: barra superior, [miniaturas | palco + classificação + anotações], barra de status
    this.shell = document.createElement('div');
    this.shell.className = 'us-shell';
    this.topEl = document.createElement('div');
    this.topEl.className = 'us-top';
    this.topEl.setAttribute('part', 'topbar');
    this.bottomEl = document.createElement('div');
    this.bottomEl.className = 'us-bottom';
    this.bottomEl.setAttribute('part', 'bottombar');
    const body = document.createElement('div');
    body.className = 'us-body';
    this.center = document.createElement('div');
    this.center.className = 'us-center';
    const stage = document.createElement('div');
    stage.className = 'us-stage';
    parts.wrap.classList.add('us-wrap');
    stage.appendChild(parts.wrap);
    this.center.appendChild(stage);
    body.appendChild(this.center);
    this.shell.append(this.topEl, body, this.bottomEl);
    this.root.appendChild(this.shell);
    this.layer = this.makeLayer();

    const app = this.app = appFor(el);
    app.ui = { layer: this.layer, flash: (m) => this.flash(m), sync: () => this.sync(), flush: () => this.notes?.commit() };
    app.attach();
    app.bindHost();
    const host = el.appHost;
    if (host?.listFonts && host.resolveFonts && !FontResolver.shared().hasHost) {
      FontResolver.shared().configure({ host: { list: host.listFonts.bind(host), resolve: host.resolveFonts.bind(host) } });
    }
    const mode = app.prefs.get('mode');
    if (mode === 'auto' || mode === 'light' || mode === 'dark') el.setUiColorMode(mode);

    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    const ctl = this.ctl();
    registerSlidesCommands(this.reg, el, ctl);
    const contributions = opts.contributions ?? [];
    for (const c of contributions) if (c.commands?.length) this.reg.add(...c.commands);
    const hidden = new Set(el.hiddenCommands);
    this.reg.hide(hidden);

    const env: WidgetEnv = { el, app, ctl, root: this.root };
    if (opts.topbar) {
      this.bar = this.mode() === 'ribbon'
        ? createRibbon(this.topEl, hideInRibbon(extendRibbon(ribbonLayout(env, this.ctx), contributions), hidden), this.ctx)
        : createCompactBar(this.topEl, hideInCompact(extendCompact(compactLayout(env, this.ctx), contributions), hidden), this.ctx);
      this.thumbs = new SlideList(env, this.ctx, 'pane', this.L);
      body.insertBefore(this.thumbs.el, this.center);
      this.sorter = new SlideList(env, this.ctx, 'grid', this.L);
      this.sorter.el.hidden = true;
      this.center.appendChild(this.sorter.el);
      this.notes = new NotesPane(env, this.L);
      this.notes.onPendingChange = (pending) => app.setPending(pending);
      this.center.appendChild(this.notes.el);
      this.anim = new AnimationPane(env, this.ctx, () => this.center.getBoundingClientRect());
      if (app.prefs.get('thumbs') === '0' || hidden.has('view:thumbnails')) this.thumbs.el.hidden = true;
      if (app.prefs.get('notes') === '0' || hidden.has('view:notes')) this.notes.el.hidden = true;
      this.thumbs.render();
      this.sorter.render();
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) this.status = new StatusBar(env, this.bottomEl, this.ctx, this.L);
    el.setChromeMounted(true);
    this.bindEvents();
    this.sync();
  }

  private makeLayer(): HTMLElement {
    const l = document.createElement('div');
    l.className = 'us-layer';
    // o que acontece na camada é das barras (o slide não reage)
    for (const t of ['mousedown', 'pointerdown', 'click', 'dblclick', 'contextmenu', 'keydown', 'keyup', 'wheel', 'copy', 'cut', 'paste'] as const) {
      l.addEventListener(t, (e) => e.stopPropagation(), { passive: t === 'wheel' });
    }
    this.root.appendChild(l);
    return l;
  }

  private mode(): 'compact' | 'ribbon' {
    const a = this.el.getAttribute('toolbar');
    if (a === 'ribbon' || a === 'compact') return a;
    return this.app.prefs.get('toolbar') === 'ribbon' ? 'ribbon' : 'compact';
  }

  private dialogEnv(): DialogEnv {
    return { el: this.el, layer: this.layer, lang: this.lang, after: () => this.after() };
  }

  private ctl(): ChromeCtl {
    const el = this.el;
    return {
      app: this.app,
      flash: (m) => this.flash(m),
      view: () => this.viewMode,
      setView: (v) => this.setView(v),
      thumbsOpen: () => !!this.thumbs && !this.thumbs.el.hidden,
      toggleThumbs: () => {
        if (!this.thumbs) return;
        this.thumbs.el.hidden = !this.thumbs.el.hidden;
        this.app.prefs.set('thumbs', this.thumbs.el.hidden ? '0' : '1');
        if (!this.thumbs.el.hidden) this.thumbs.invalidate();
      },
      notesOpen: () => !!this.notes && !this.notes.el.hidden,
      toggleNotes: () => {
        if (!this.notes) return;
        this.notes.el.hidden = !this.notes.el.hidden;
        this.app.prefs.set('notes', this.notes.el.hidden ? '0' : '1');
      },
      toolbarMode: () => this.mode(),
      setToolbarMode: (m) => { this.app.prefs.set('toolbar', m); el.setAttribute('toolbar', m); },
      themeMode: () => {
        const a = el.getAttribute('theme');
        return a === 'auto' || a === 'light' || a === 'dark' ? a : (this.app.prefs.get('mode') || null);
      },
      setThemeMode: (m) => {
        this.app.prefs.set('mode', m ?? '');
        if (m === null) el.removeAttribute('theme');
        else if (el.hasAttribute('theme')) el.setAttribute('theme', m);
        el.setUiColorMode(m);
      },
      findDialog: (replace) => { (this.find ??= new FindDialog(this.dialogEnv())).open(replace); },
      propertiesDialog: () => { void propertiesDialog(this.dialogEnv()); },
      showSetupDialog: () => { void showSetupDialog(this.dialogEnv()); },
      sizeDialog: () => { void sizeDialog(this.dialogEnv()); },
      linkDialog: () => { void linkDialog(this.dialogEnv()); },
      shortcutsDialog: () => shortcutsDialog(this.dialogEnv()),
      aboutDialog: () => aboutDialog(this.dialogEnv()),
      advanceDialog: () => { void advanceDialog(this.dialogEnv()); },
      fontEmbeddingDialog: () => {
        void openFontEmbeddingDialog({ app: 'slides', settings: el.getFontEmbedding(), lang: el }).then((s) => {
          if (s) { el.setFontEmbedding(s); this.after(); }
        });
      },
      pickImage: () => this.pickImage(),
      clipboard: (kind) => { void this.clipboard(kind); },
      present: (from) => this.present(from),
      animationPane: () => { this.anim?.toggle(); this.after(); },
      animationPaneOpen: () => !!this.anim?.isOpen,
    };
  }

  // ───── modos de exibição ─────

  private setView(v: ViewMode): void {
    if (v === this.viewMode) return;
    const prev = this.viewMode;
    this.viewMode = v;
    this.shell.classList.toggle('us-view-sorter', v === 'sorter');
    this.shell.classList.toggle('us-reading', v === 'reading');
    if (this.sorter) this.sorter.el.hidden = v !== 'sorter';
    if (v === 'sorter') { this.el.selectShape(null); this.sorter?.invalidate(); requestAnimationFrame(() => { this.sorter?.reveal(); this.sorter?.el.focus(); }); }
    if (prev === 'reading' && this.el.isPresenting()) this.el.stopPresentation();
    if (v === 'reading') {
      if (!this.el.getSlideCount()) { this.viewMode = prev; this.shell.classList.remove('us-reading'); return; }
      // Leitura: a apresentação dentro da janela (sem tela cheia), como o app
      requestAnimationFrame(() => { if (this.viewMode === 'reading') this.el.present(this.el.getSlideIndex(), { fullscreen: false }); });
    }
    if (v === 'normal') requestAnimationFrame(() => this.thumbs?.reveal());
    this.sync();
  }

  private present(from: number | 'start'): void {
    if (!this.el.getSlideCount()) { this.flash(this.L.nothingToPresent); return; }
    if (this.viewMode !== 'normal') this.setView('normal');
    this.el.selectShape(null);
    this.el.present(from);
  }

  // ───── imagem e área de transferência ─────

  private pickImage(): void {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      await this.el.insertImage(new Uint8Array(await f.arrayBuffer()), f.type || 'image/png');
      this.after();
    });
    input.click();
  }

  private async clipboard(kind: 'cut' | 'copy' | 'paste'): Promise<void> {
    const el = this.el;
    if (kind === 'paste') {
      if (shapeClipboard) { el.pasteShape(shapeClipboard); this.after(); return; }
      try {
        const text = await navigator.clipboard?.readText?.();
        if (text) { el.insertTextBox(text); this.after(); }
      } catch { /* sem permissão: Ctrl+V continua valendo */ }
      return;
    }
    const clip = el.copyShape();
    if (!clip) return;
    shapeClipboard = clip;
    try { await navigator.clipboard?.writeText?.(clip.text); } catch { /* sem permissão */ }
    if (kind === 'cut') el.deleteShape();
    this.after();
  }

  // ───── sincronia ─────

  /** Depois de qualquer ação: o foco volta ao slide (se não abriu painel) e sincroniza. */
  private after(): void {
    if (this.ac.signal.aborted) return;
    const a = this.root.activeElement;
    const keep = !!a && (this.layer.contains(a) || (this.topEl.contains(a) && a.tagName === 'INPUT') || a.classList.contains('us-notes-text')
      || (this.thumbs?.el.contains(a) ?? false) || (this.sorter?.el.contains(a) ?? false));
    if (!isMenuOpen()) closePopover();
    if (!keep && !isMenuOpen() && this.viewMode === 'normal' && this.el.getEditingShape() === null) this.el.chromeParts().canvas.focus();
    this.sync();
  }

  sync(): void {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.syncNow(); });
  }

  private syncNow(): void {
    this.app.bindHost();
    this.topEl.classList.toggle('uo-wco', !!this.el.appHost?.windowControlsOverlay);
    this.bar?.sync();
    this.status?.sync();
    this.thumbs?.syncState();
    this.sorter?.syncState();
    this.notes?.sync();
    this.shell.classList.toggle('us-has-pane', !!this.anim?.isOpen && this.viewMode !== 'reading');
    this.anim?.sync();
    this.anim?.place();
  }

  flash(msg: string): void {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }

  /** Faixa de aviso na barra atual (sem `topbar` não há onde mostrar). */
  setNotice(el: HTMLElement | null, tone?: 'info' | 'warning' | 'error'): void { this.bar?.setNotice(el, tone); }

  destroy(): void {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    closeDialogs(this.layer);
    closePanes(this.layer);
    this.find?.close();
    this.notes?.destroy();
    this.anim?.destroy();
    this.thumbs?.destroy();
    this.sorter?.destroy();
    this.bar?.destroy();
    if (this.el.isPresenting() && this.viewMode === 'reading') this.el.stopPresentation();
    // o palco volta para a raiz, como era antes das barras
    const { wrap } = this.el.chromeParts();
    wrap.classList.remove('us-wrap');
    this.root.appendChild(wrap);
    this.shell.remove();
    this.layer.remove();
    this.chromeStyle.remove();
    this.paletteStyle?.remove();
    this.el.setUiColorMode(null);
    this.el.setChromeMounted(false);
    if (this.app.ui?.layer === this.layer) { this.app.ui = null; this.app.detach(); }
  }

  // ───── eventos ─────

  private bindEvents(): void {
    const { el } = this;
    const signal = this.ac.signal;
    const resync = (): void => this.sync();
    el.addEventListener('us-loaded', () => {
      this.thumbs?.render(); this.sorter?.render();
      if (this.viewMode !== 'normal') this.setView('normal');
      this.sync();
    }, { signal });
    el.addEventListener('us-change', ((e: CustomEvent<{ kind: string }>) => {
      const deckWide = ['newSlide', 'duplicateSlide', 'deleteSlide', 'moveSlide', 'undo', 'redo', 'replace', 'transition', 'background', 'properties', 'showSettings'].includes(e.detail.kind);
      if (deckWide) { this.thumbs?.render(); this.sorter?.render(); } else { this.thumbs?.invalidate(el.getSlideIndex()); this.sorter?.invalidate(el.getSlideIndex()); }
      this.sync();
    }) as EventListener, { signal });
    el.addEventListener('us-slide', () => { this.sync(); requestAnimationFrame(() => { this.thumbs?.reveal(); this.sorter?.reveal(); }); }, { signal });
    el.addEventListener('us-image', () => { this.thumbs?.invalidate(); this.sorter?.invalidate(); }, { signal });
    for (const t of ['us-selection', 'us-zoom', 'us-dirty', 'us-title-change', 'us-step', 'us-playback-end']) el.addEventListener(t, resync, { signal });
    el.addEventListener('us-present-end', () => { if (this.viewMode === 'reading') this.setView('normal'); this.sync(); }, { signal });
    el.addEventListener('us-theme-change', () => {
      this.el.appHost?.setTitleTheme?.(this.el.effectiveTheme === 'dark');
      this.thumbs?.invalidate();
      this.sync();
    }, { signal });
    this.el.appHost?.setTitleTheme?.(this.el.effectiveTheme === 'dark');
    // fontes chegando mudam as miniaturas
    const off = FontResolver.shared().onChange(() => { this.thumbs?.invalidate(); this.sorter?.invalidate(); });
    signal.addEventListener('abort', off);
    const ro = new ResizeObserver(() => { this.anim?.place(); this.thumbs?.invalidate(); });
    ro.observe(this.center);
    signal.addEventListener('abort', () => ro.disconnect());
  }

  /** Atalhos, área de transferência e arrastar e soltar (só com a barra superior). */
  private bindDocumentFeatures(): void {
    const { el } = this;
    const signal = this.ac.signal;
    const byShortcut = new Map<string, string>();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id)!.shortcut;
      if (sc && !NATIVE_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    const run = (e: KeyboardEvent, id: string): void => {
      e.preventDefault();
      e.stopPropagation();
      void this.reg.run(id);
    };
    el.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || el.isPresenting() || el.isPlaying()) return;
      const combo = comboOf(e);
      const field = isField(e.composedPath()[0]);
      // Ctrl+D: duplica a forma selecionada (ou o slide), como o app
      if (combo === 'Ctrl+D' && !field) {
        e.preventDefault();
        if (el.getShapeInfo()) el.duplicateShape(); else void this.reg.run('slide:duplicate');
        this.after();
        return;
      }
      if (combo === 'Escape' && this.viewMode === 'sorter') { e.preventDefault(); this.setView('normal'); return; }
      const id = byShortcut.get(combo);
      if (!id || !this.reg.supported(id)) return;
      if (field && !APP_SHORTCUTS.has(id)) return;
      run(e, id);
    }, { signal });
    el.addEventListener('focusin', () => { lastFocused = new WeakRef(el); }, { signal });
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.some((n) => n instanceof HTMLElement && n.localName === 'universal-slides')) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === el : document.querySelectorAll('universal-slides[topbar]').length === 1;
      if (mine) run(e, id);
    }, { signal });

    // área de transferência: Ctrl+C/X/V chegam como eventos nativos
    const inField = (e: Event): boolean => isField(e.composedPath()[0]);
    el.addEventListener('copy', (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const clip = el.copyShape();
      if (!clip) return;
      shapeClipboard = clip;
      e.clipboardData?.setData('text/plain', clip.text);
      e.preventDefault();
    }, { signal });
    el.addEventListener('cut', (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const clip = el.copyShape();
      if (!clip) return;
      shapeClipboard = clip;
      e.clipboardData?.setData('text/plain', clip.text);
      e.preventDefault();
      el.deleteShape();
      this.after();
    }, { signal });
    el.addEventListener('paste', (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const data = e.clipboardData;
      const text = data?.getData('text/plain') ?? '';
      const img = Array.from(data?.files ?? []).find((f) => /^image\//.test(f.type));
      e.preventDefault();
      if (img) { void img.arrayBuffer().then((b) => el.insertImage(new Uint8Array(b), img.type)).then(() => this.after()); return; }
      if (shapeClipboard && text === shapeClipboard.text) { el.pasteShape(shapeClipboard); this.after(); return; }
      if (text.trim()) { el.insertTextBox(text.replace(/\r\n?/g, '\n')); this.after(); }
    }, { signal });

    // menu de contexto do slide
    el.addEventListener('contextmenu', (e) => {
      const path = e.composedPath();
      if (path.some((n) => n === this.topEl || n === this.bottomEl || n === this.layer || n === this.thumbs?.el || n === this.sorter?.el || n === this.notes?.el)) return;
      if (path[0] !== el.chromeParts().canvas || el.isPresenting() || el.isPlaying()) return;
      e.preventDefault();
      const shape = el.getShapeInfo();
      const items = shape
        ? ['cut', 'copy', 'paste', 'delete', '-', 'link', '-', 'arrange:front', 'arrange:back', 'shape:size']
        : ['paste', '-', 'slide:new', 'slide:duplicate', 'slide:delete', 'slide:hide', '-', 'textbox', 'image'];
      openMenu(items, { x: e.clientX, y: e.clientY }, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
    }, { signal });

    // arrastar e soltar: apresentação abre; imagem entra no slide
    const overlay = document.createElement('div');
    overlay.className = 'us-drop';
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer?.types?.includes('Files');
    const onlyImages = (e: DragEvent): boolean => {
      const items = Array.from(e.dataTransfer?.items ?? []);
      return items.length > 0 && items.every((it) => it.kind === 'file' && it.type.startsWith('image/'));
    };
    el.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; overlay.hidden = onlyImages(e); }, { signal });
    el.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--depth <= 0) { depth = 0; overlay.hidden = true; } }, { signal });
    el.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); }, { signal });
    el.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      // o hospedeiro pode cuidar (cancelando `us-file-drop`)
      const ev = new CustomEvent('us-file-drop', { detail: { files }, cancelable: true });
      if (!el.dispatchEvent(ev)) return;
      void (async () => {
        const images = files.filter((f) => f.type.startsWith('image/'));
        if (images.length === files.length) {
          for (const f of images) await el.insertImage(new Uint8Array(await f.arrayBuffer()), f.type);
          this.after();
          return;
        }
        await this.app.openFile(files[0]!);
        this.sync();
      })();
    }, { signal });
  }
}

const chromes = new WeakMap<UniversalSlidesElement, SlidesChrome>();

export interface ChromeHandle {
  sync: () => void;
  setNotice: (el: HTMLElement | null, tone?: 'info' | 'warning' | 'error') => void;
}

export function setupChrome(el: UniversalSlidesElement, opts: ChromeOptions): ChromeHandle {
  chromes.get(el)?.destroy();
  const c = new SlidesChrome(el, opts);
  chromes.set(el, c);
  return { sync: () => c.sync(), setNotice: (n, tone) => c.setNotice(n, tone) };
}

/** Desmonta as barras (topbar e bottombar saíram, ou o elemento saiu do documento). */
export function teardownChrome(el: UniversalSlidesElement): void {
  chromes.get(el)?.destroy();
  chromes.delete(el);
}
