// Barras do <universal-sheet> (atributos `topbar`, `bottombar` e
// `toolbar="compact|ribbon"`): carregadas sob demanda (import dinâmico), então
// o componente sem barras não puxa nada disto. A barra superior é declarada
// sobre o framework de @universal-office/ui (comandos + layout), o mesmo do
// <universal-write>: COMPACTA, no estilo Google Planilhas (padrão, título acima
// dos menus), ou RIBBON, no estilo Excel. Junto vêm a barra de fórmulas, as
// guias das planilhas, a barra de status com soma/média/contagem, os atalhos
// do Excel, o menu de contexto, abrir/salvar/exportar/imprimir, tema e
// arrastar e soltar. O que depende do app hospedeiro (Electron) entra pela
// interface opcional `element.host` (chrome-host.ts), com o caminho web como recuo.
import {
  CommandRegistry, createCompactBar, createRibbon, ensureBarStyles, isMenuOpen, closeMenus, closePopover, closeDialogs, openMenu,
  pickLabels, showToast, extendCompact, extendRibbon, hideInCompact, hideInRibbon,
  type BarContext, type BarContribution, type BarHandle, type BarNoticeTone, type MenuEntry, type UiLang,
} from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import { appFor, looksLikeWorkbook, type SheetApp } from './chrome-app.js';
import { registerSheetCommands, type ChromeCtl } from './chrome-commands.js';
import { compactLayout, ribbonLayout } from './chrome-layout.js';
import { FormulaBar, SheetTabs, StatusBar } from './chrome-panels.js';
import { LABELS, type ChromeLabels } from './chrome-labels.js';
import { applyTheme } from './chrome-theme.js';
import { bindHostFonts, hostOf } from './chrome-host.js';
import {
  aboutDialog, columnWidthDialog, confirmMerge, customNumberFormatDialog, findDialog, formatCellsDialog, goToDialog,
  insertFunctionDialog, propertiesDialog, rowHeightDialog, shortcutsDialog, type DialogEnv,
} from './chrome-dialogs.js';
import type { WidgetEnv } from './chrome-widgets.js';

export type { UniversalSheetHost, UniversalSheetHostFile, UniversalSheetExportKind } from './chrome-host.js';

/** Kit dos widgets do hospedeiro (vai no contexto de `plugin.toolbar`), carregado com as barras. */
export { barKit } from './bar-kit.js';

/** Montagem das barras (o elemento chama setupChrome a cada mudança de atributo/idioma/plugins). */
export interface ChromeOptions {
  topbar: boolean;
  bottombar: boolean;
  lang: UiLang;
  /** contribuições dos plugins (`plugin.toolbar`), já colhidas pelo elemento */
  contributions?: readonly BarContribution[];
}

export interface ChromeHandle {
  sync: () => void;
  /** faixa de aviso do hospedeiro (UniversalSheetElement.setNotice) */
  setNotice: (notice: { el: HTMLElement; tone: BarNoticeTone } | null) => void;
}

// u-ripple (@universal-material/web): o hospedeiro que já usa a biblioteca o
// registrou (talvez noutra versão) — registrar de novo lançaria e a barra não
// montaria. Botões e menus só põem o ripple quando ele está definido.
if (!customElements.get('u-ripple')) await import('@universal-material/web/ripple/ripple.js').catch(() => undefined);

export const CHROME_CSS = /* css */ `
/* isolation: os z-index internos ficam contidos no componente (não cobrem a página) */
:host { isolation: isolate; --uo-font: var(--us-font, "Segoe UI", system-ui, -apple-system, sans-serif); }
/* UMA cor de fundo para barras, fórmulas, guias e status (como o Write e o Google
   Planilhas): --us-background (padrão --u-color-surface-container-low); a grade
   continua branca, como no Excel. Claro/escuro: tokens/light-dark(), pelo color-scheme. */
.us-topbar, .us-bottombar {
  --us-bg: var(--us-background, var(--u-color-surface-container-low, light-dark(#f4f3f7, #1b1b1f)));
  background: var(--uo-bar-bg, var(--us-bg)); color: var(--u-color-on-surface, light-dark(#1b1b1f, #e3e2e6));
}
.us-topbar > .uo-bar, .us-bottombar > .uo-bar { background: transparent; }
.us-topbar .uo-toolbar, .us-topbar .uo-ribbon-body {
  background: var(--uo-bar-container, light-dark(var(--u-color-surface-container, #efedf1), var(--u-color-surface-container-high, #292a2d)));
}
.us-topbar { border-bottom: 1px solid var(--u-color-outline-variant, light-dark(#c4c6d0, #44474f)); }
.us-bottombar { border-top: 1px solid var(--u-color-outline-variant, light-dark(#c4c6d0, #44474f)); }

/* camada flutuante (menus, popovers, diálogos, avisos) */
.us-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* barra de fórmulas */
.us-formula {
  display: flex; align-items: center; gap: 6px; padding: 4px 12px 6px; font-family: var(--uo-font); font-size: 13px;
}
.us-formula[hidden] { display: none; }
.us-namebox, .us-fx {
  height: 28px; border: 1px solid var(--u-color-outline-variant, light-dark(#c4c6d0, #44474f)); border-radius: 8px;
  background: var(--u-color-surface-container-lowest, light-dark(#fff, #121316)); color: inherit; font: inherit; font-size: 13px;
  padding: 0 8px; outline: none; min-width: 0;
}
.us-namebox { width: 96px; flex: none; text-align: center; }
.us-fx { flex: 1 1 auto; font-family: var(--us-formula-font, Consolas, "Cascadia Mono", ui-monospace, monospace); }
.us-namebox:focus, .us-fx:focus { border-color: var(--u-color-primary, #2e8b4e); }
.us-fx.us-ghost { color: light-dark(#8a8a8a, #8f9099); }
.us-formula-sep { width: 1px; height: 20px; background: var(--u-color-outline-variant, light-dark(#c4c6d0, #44474f)); flex: none; }
.us-fx-btn { height: 28px; min-width: 28px; flex: none; }

/* guias das planilhas */
.us-tabs-row { display: flex; align-items: center; gap: 2px; padding: 2px 8px; min-height: 32px; font-family: var(--uo-font); font-size: 13px; }
.us-tabs-row[hidden] { display: none; }
.us-tabs { display: flex; align-items: stretch; gap: 2px; overflow-x: auto; scrollbar-width: none; min-width: 0; flex: 0 1 auto; }
.us-tabs::-webkit-scrollbar { display: none; }
.us-tab {
  position: relative; border: 0; background: transparent; color: var(--u-color-on-surface-variant, light-dark(#44474f, #c4c6d0));
  font: inherit; font-size: 13px; padding: 5px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; flex: none;
}
.us-tab:hover { background: var(--u-color-surface-container-highest, light-dark(#e3e2e6, #343538)); }
.us-tab.uo-on {
  color: var(--u-color-primary, #2e8b4e); font-weight: 600;
  background: color-mix(in srgb, var(--u-color-primary, #2e8b4e) 12%, transparent);
}
.us-tabs-row .uo-btn { height: 28px; min-width: 28px; }
.us-tabs-row .uo-ic { width: 18px; height: 18px; }

/* barra de status */
.us-status-bar {
  display: flex; align-items: center; gap: 4px; padding: 2px 12px; min-height: 28px;
  font-family: var(--uo-font); font-size: 12.5px; color: var(--u-color-on-surface-variant, light-dark(#44474f, #c4c6d0));
  border-top: 1px solid color-mix(in srgb, var(--u-color-outline-variant, #c4c6d0) 60%, transparent);
}
.us-status, .us-stats { font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.us-stats { margin-right: 12px; white-space: pre; }
.us-status-bar .uo-btn { height: 24px; min-width: 24px; }
.us-status-bar .uo-ic { width: 18px; height: 18px; }
.us-zoom-slider { width: 120px; accent-color: var(--u-color-primary, #2e8b4e); }
.us-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 560px) { .us-zoom-slider, .us-stats { display: none; } }

/* diálogos */
.us-find, .us-fn, .us-fmt-pane { display: flex; flex-direction: column; gap: 10px; }
.us-find-opts, .us-fmt-checks { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.us-find-opts .uo-field { flex: 1 1 0; }
.us-find-msg { min-height: 18px; font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f); }
.us-check { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.us-fn-list {
  width: 100%; border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; padding: 4px;
  background: var(--u-color-surface-container-lowest, light-dark(#fff, #121316)); color: inherit; font: inherit; font-size: 13px;
}
.us-fmt-pane input[type=color] { width: 56px; height: 32px; padding: 2px; border-radius: 8px; border: 1px solid var(--u-color-outline-variant, #c4c6d0); background: transparent; }
.us-props { border-collapse: collapse; width: 100%; font-size: 13px; }
.us-props th { text-align: left; font-weight: 500; color: var(--u-color-on-surface-variant, #44474f); padding: 4px 16px 4px 0; vertical-align: top; white-space: nowrap; }
.us-props td { padding: 4px 0; overflow-wrap: anywhere; }
.us-keys td { font-family: Consolas, ui-monospace, monospace; font-size: 12px; white-space: nowrap; text-align: right; }
.us-keys-box { max-height: min(60vh, 520px); overflow: auto; }
.us-about p { margin: 8px 0 0; line-height: 1.5; font-size: 13px; }

/* arrastar e soltar */
.us-drop {
  position: fixed; inset: 12px; z-index: 900; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #2e8b4e); border-radius: 16px; font: 500 20px var(--uo-font);
  color: var(--u-color-primary, #2e8b4e); background: color-mix(in srgb, var(--u-color-primary, #2e8b4e) 10%, transparent);
}
.us-drop[hidden] { display: none; }
`;

type Mode = 'compact' | 'ribbon';

/** Atalhos que a própria grade trata (área de transferência, desfazer, seleção…): a barra não rouba. */
const GRID_KEYS = new Set(['Ctrl+Z', 'Ctrl+Y', 'Ctrl+A', 'Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Delete', 'Ctrl+PageUp', 'Ctrl+PageDown']);
/** Atalhos de APLICATIVO (valem com o foco num campo e fora do elemento). */
const APP_SHORTCUTS = new Set(['open', 'save', 'saveAs', 'print', 'find', 'replace', 'goto']);
/** Atalhos extras do Excel para o mesmo comando. */
const ALIASES: Record<string, string> = { F5: 'goto', 'Ctrl+Shift+F': 'dlg:formatCells', 'Ctrl+Shift+P': 'dlg:formatCells' };

let lastFocused: WeakRef<UniversalSheetElement> | null = null;

function isField(t: EventTarget | undefined): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

/** Combinação pela tecla FÍSICA (independe do layout): "Ctrl+Shift+4", "Alt+=", "F9". */
export function comboOf(e: KeyboardEvent): string {
  const code = e.code ?? '';
  let k = code.startsWith('Key') ? code.slice(3)
    : code.startsWith('Digit') ? code.slice(5)
      : ({ Equal: '=', Minus: '-', Backquote: '`', BracketLeft: '[', BracketRight: ']', Slash: '/', Space: 'Space', Enter: 'Enter', Delete: 'Delete', PageUp: 'PageUp', PageDown: 'PageDown' } as Record<string, string>)[code] ?? e.key;
  if (/^F\d+$/.test(e.key)) k = e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${k}`;
}

class SheetChrome {
  private readonly ac = new AbortController();
  private readonly root: ShadowRoot;
  private readonly app: SheetApp;
  private readonly reg: CommandRegistry;
  private readonly ctx: BarContext;
  private readonly layer: HTMLElement;
  private readonly L: ChromeLabels;
  private readonly lang: UiLang;
  private bar: BarHandle | null = null;
  private formula: FormulaBar | null = null;
  private tabs: SheetTabs | null = null;
  private status: StatusBar | null = null;
  private raf = 0;

  constructor(
    private readonly el: UniversalSheetElement,
    private readonly topEl: HTMLElement,
    private readonly bottomEl: HTMLElement,
    opts: ChromeOptions,
  ) {
    this.root = topEl.getRootNode() as ShadowRoot;
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS);
    ensureBarStyles(this.root);
    if (!this.root.querySelector('style[data-us-chrome]')) {
      const s = document.createElement('style');
      s.dataset['usChrome'] = '';
      s.textContent = CHROME_CSS;
      this.root.appendChild(s);
    }
    this.layer = this.root.querySelector<HTMLElement>('.us-layer') ?? this.makeLayer();
    this.layer.replaceChildren();

    const app = this.app = appFor(el);
    app.ui = { L: this.L, layer: this.layer, flash: (m) => this.flash(m), sync: () => this.sync() };
    // pasta sem nome: o "Pasta1"/"Book1" acompanha o idioma da interface
    if (!app.title || app.title === LABELS.en.untitled || app.title === LABELS.pt.untitled || app.title === LABELS.es.untitled) app.title = this.L.untitled;
    app.attach();
    app.bindHost();
    bindHostFonts(hostOf(el));
    // tema escolhido no menu (só com storage-key/id): o atributo `theme` manda
    const savedTheme = app.prefs.get('theme');
    if (savedTheme && !el.hasAttribute('theme')) el.setAttribute('theme', savedTheme);
    this.applyTheme();

    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    registerSheetCommands(this.reg, el, app, this.ctl());
    // extensões do hospedeiro: comandos dos plugins e ids ocultos (hidden-commands)
    const contributions = opts.contributions ?? [];
    for (const c of contributions) if (c.commands?.length) this.reg.add(...c.commands);
    const hidden = new Set(el.hiddenCommands);
    this.reg.hide(hidden);

    const env: WidgetEnv = { el, app, ctl: this.ctl(), root: this.root, applyTheme: () => { this.applyTheme(); this.sync(); } };
    topEl.replaceChildren();
    bottomEl.replaceChildren();
    if (opts.topbar) {
      this.bar = this.mode() === 'ribbon'
        ? createRibbon(topEl, hideInRibbon(extendRibbon(ribbonLayout(env, this.ctx), contributions), hidden), this.ctx)
        : createCompactBar(topEl, hideInCompact(extendCompact(compactLayout(env, this.ctx), contributions), hidden), this.ctx);
      if (!hidden.has('view:formulaBar') && !hidden.has('formulaBar')) {
        this.formula = new FormulaBar(el, this.ctx, (m) => this.flash(m), (r) => this.L.invalidRef(r));
        this.formula.el.hidden = app.prefs.get('formulaBar') === '0';
        topEl.appendChild(this.formula.el);
      }
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) {
      if (!hidden.has('view:sheetTabs') && !hidden.has('sheetTabs')) {
        this.tabs = new SheetTabs(el, this.ctx);
        this.tabs.el.hidden = app.prefs.get('sheetTabs') === '0';
        bottomEl.appendChild(this.tabs.el);
      }
      this.status = new StatusBar(el, app, this.ctx);
      bottomEl.appendChild(this.status.el);
    }
    this.bindEvents();
    // `accent` mudado pelo hospedeiro reaplica a paleta; tirar topbar e bottombar desmonta
    const mo = new MutationObserver((recs) => {
      if (recs.some((r) => r.attributeName === 'accent')) { this.applyTheme(); this.sync(); }
    });
    mo.observe(el, { attributes: true, attributeFilter: ['accent'] });
    this.ac.signal.addEventListener('abort', () => mo.disconnect());
    this.syncNow();
  }

  private makeLayer(): HTMLElement {
    const l = document.createElement('div');
    l.className = 'us-layer';
    // a grade escuta teclas/mouse no canvas: o que acontece na camada é da barra
    for (const t of ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'keydown', 'keyup', 'keypress', 'wheel', 'paste', 'copy', 'cut'] as const) {
      l.addEventListener(t, (e) => e.stopPropagation(), { passive: t === 'wheel' });
    }
    this.root.appendChild(l);
    return l;
  }

  private mode(): Mode {
    const a = this.el.getAttribute('toolbar');
    if (a === 'ribbon' || a === 'compact') return a;
    return this.app.prefs.get('toolbar') === 'ribbon' ? 'ribbon' : 'compact';
  }

  private dialogEnv(): DialogEnv {
    return { el: this.el, layer: this.layer, lang: this.lang, L: this.L, reg: this.reg, flash: (m) => this.flash(m), after: () => this.after() };
  }

  private ctl(): ChromeCtl {
    const d = (): DialogEnv => this.dialogEnv();
    return {
      flash: (m) => this.flash(m),
      find: (replace) => findDialog(d(), replace),
      goTo: () => { void goToDialog(d()); },
      formatCells: (tab) => { void formatCellsDialog(d(), tab); },
      customNumberFormat: () => { void customNumberFormatDialog(d()); },
      columnWidth: () => { void columnWidthDialog(d()); },
      rowHeight: () => { void rowHeightDialog(d()); },
      insertFunction: () => { void insertFunctionDialog(d()); },
      properties: () => propertiesDialog(d(), this.app.docName),
      shortcuts: () => shortcutsDialog(d()),
      about: () => aboutDialog(d()),
      merge: (kind) => {
        void (async () => {
          if (this.el.mergeLosesData() && !(await confirmMerge(d()))) return;
          this.el.merge(kind);
          this.after();
        })();
      },
      copy: (cut) => {
        const text = cut ? this.el.cut() : this.el.copy();
        void navigator.clipboard?.writeText(text).catch(() => { /* sem permissão: a cópia interna basta */ });
      },
      paste: (valuesOnly) => {
        const opts = { valuesOnly };
        const internal = (): void => { if (this.el.hasClipboard) this.el.paste(undefined, opts); else this.flash(this.L.clipboardBlocked); this.after(); };
        if (valuesOnly || !navigator.clipboard?.readText) { internal(); return; }
        void navigator.clipboard.readText().then((t) => { if (t) { this.el.paste(t, opts); this.after(); } else internal(); }, internal);
      },
      insertSheet: () => {
        try { this.flash(this.L.sheetAdded(this.el.addSheet())); } catch (e) { this.flash(this.L.failed(String(e))); }
        this.after();
      },
      toolbarMode: () => this.mode(),
      setToolbarMode: (m) => {
        this.app.prefs.set('toolbar', m);
        this.el.setAttribute('toolbar', m);
      },
      formulaBarOn: () => !!this.formula && !this.formula.el.hidden,
      toggleFormulaBar: () => {
        if (!this.formula) return;
        this.formula.el.hidden = !this.formula.el.hidden;
        this.app.prefs.set('formulaBar', this.formula.el.hidden ? '0' : '1');
      },
      sheetTabsOn: () => !!this.tabs && !this.tabs.el.hidden,
      toggleSheetTabs: () => {
        if (!this.tabs) return;
        this.tabs.el.hidden = !this.tabs.el.hidden;
        this.app.prefs.set('sheetTabs', this.tabs.el.hidden ? '0' : '1');
      },
    };
  }

  /** Paleta do destaque e a cor dos controles da janela (Electron). */
  private applyTheme(): void {
    applyTheme(this.el, this.root, this.app.accent, this.app.explicitAccent);
    this.titleTheme();
    // a seleção e os cabeçalhos da grade usam a cor de destaque
    this.el.repaint();
  }

  /** Cor dos controles da janela (Electron): o tema e o fundo da linha de título. */
  private titleTheme(): void {
    const host = hostOf(this.el);
    if (!host?.setTitleTheme) return;
    const bg = typeof getComputedStyle === 'function' ? cssHex(getComputedStyle(this.topEl).backgroundColor) : undefined;
    host.setTitleTheme(this.el.effectiveTheme === 'dark', bg);
  }

  /** Depois de qualquer ação: foco de volta à grade (se não abriu painel/diálogo) e sincroniza. */
  private after(): void {
    if (this.ac.signal.aborted) return;
    const a = this.root.activeElement;
    const inLayer = !!a && this.layer.contains(a);
    const inField = !!a && (this.topEl.contains(a) || this.bottomEl.contains(a)) && isField(a);
    if (!isMenuOpen()) closePopover();
    if (!inLayer && !inField && !isMenuOpen() && !this.root.querySelector('dialog[open]')) this.el.focus();
    this.sync();
  }

  /** Um sync por quadro, venha de onde vier (seleção, edição, ações). */
  sync(): void {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.syncNow(); });
  }

  private syncNow(): void {
    this.app.bindHost();
    this.topEl.classList.toggle('uo-wco', !!hostOf(this.el)?.windowControlsOverlay);
    this.bar?.sync();
    this.formula?.sync();
    this.tabs?.sync();
    this.status?.sync();
  }

  flash(msg: string): void {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }

  setNotice(notice: { el: HTMLElement; tone: BarNoticeTone } | null): void {
    this.bar?.setNotice(notice?.el ?? null, notice?.tone);
  }

  destroy(): void {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    // diálogos abertos resolvem como cancelados ANTES de a camada sumir
    closeDialogs(this.layer);
    this.bar?.destroy();
    this.formula?.destroy();
    this.layer.replaceChildren();
    this.topEl.classList.remove('uo-wco');
    this.topEl.replaceChildren();
    this.bottomEl.replaceChildren();
    if (this.app.ui?.layer === this.layer) this.app.detach();
  }

  // ───── eventos ─────
  private bindEvents(): void {
    const { el } = this;
    const signal = this.ac.signal;
    const resync = (): void => this.sync();
    for (const t of ['us-selection', 'us-change', 'us-zoom', 'us-edit']) el.addEventListener(t, resync, { signal });
    el.addEventListener('us-entry-error', ((e: CustomEvent<{ message: string }>) => { if (e.detail.message) this.flash(`⚠ ${e.detail.message}`); }) as EventListener, { signal });
    el.addEventListener('us-theme-change', () => { this.titleTheme(); this.sync(); }, { signal });
    el.addEventListener('focusin', () => { lastFocused = new WeakRef(el); }, { signal });
  }

  /** Recursos de documento só com a barra superior: atalhos, menu de contexto, arrastar e soltar. */
  private bindDocumentFeatures(): void {
    const { el } = this;
    const signal = this.ac.signal;
    const byShortcut = new Map<string, string>();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id)!.shortcut;
      if (sc && !GRID_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    for (const [k, id] of Object.entries(ALIASES)) if (!byShortcut.has(k)) byShortcut.set(k, id);
    const run = (e: KeyboardEvent, id: string): void => {
      e.preventDefault();
      e.stopPropagation();
      void this.reg.run(id);
    };
    el.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.includes(this.layer)) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !this.reg.supported(id)) return;
      // num campo (editor da célula, barra de fórmulas, título) só os atalhos de app
      if (isField(path[0]) && !APP_SHORTCUTS.has(id)) return;
      run(e, id);
    }, { signal });
    // atalhos de APP com o foco fora do elemento: só o último <universal-sheet> focado (ou o único com topbar)
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.some((n) => n instanceof HTMLElement && n.localName === 'universal-sheet')) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === el : document.querySelectorAll('universal-sheet[topbar]').length === 1;
      if (mine) run(e, id);
    }, { signal });

    // menu de contexto da grade (como o do Excel)
    el.addEventListener('contextmenu', (e) => {
      const path = e.composedPath();
      if (path.some((n) => n === this.topEl || n === this.bottomEl || n === this.layer)) return;
      if (isField(path[0])) return;
      e.preventDefault();
      const items: MenuEntry[] = [
        'cut', 'copy', 'paste', 'paste:values', '-', 'function', '-', 'clear:contents', 'clear:formats', '-',
        { id: 'ctx:merge', label: { en: 'Merge', pt: 'Mesclar', es: 'Combinar' }, icon: 'cell_merge', submenu: ['merge:center', 'merge:across', 'merge:cells', 'merge:off'] },
        { id: 'ctx:rows', label: { en: 'Rows', pt: 'Linhas', es: 'Filas' }, icon: 'table_rows', submenu: ['row:height', 'row:autofit', '-', 'row:hide', 'row:unhide'] },
        { id: 'ctx:cols', label: { en: 'Columns', pt: 'Colunas', es: 'Columnas' }, icon: 'view_column', submenu: ['col:width', 'col:autofit', '-', 'col:hide', 'col:unhide'] },
        '-', 'dlg:formatCells',
      ];
      openMenu(items, { x: e.clientX, y: e.clientY }, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
    }, { signal });

    // arrastar e soltar uma planilha para abrir (us-file-drop cancelável: o hospedeiro decide)
    const overlay = document.createElement('div');
    overlay.className = 'us-drop';
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer?.types?.includes('Files');
    const opens = (): boolean => !el.hasAttribute('nofiledrop');
    el.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; overlay.hidden = !opens(); }, { signal });
    el.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--depth <= 0) { depth = 0; overlay.hidden = true; } }, { signal });
    el.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); }, { signal });
    el.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const files = [...(e.dataTransfer?.files ?? [])];
      const ev = new CustomEvent('us-file-drop', { detail: { files }, cancelable: true, bubbles: true, composed: true });
      el.dispatchEvent(ev);
      if (ev.defaultPrevented || !opens() || !files[0]) return;
      const f = files[0];
      void (async () => {
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (!looksLikeWorkbook(f.name, bytes)) { this.flash(this.L.notWorkbook(f.name)); return; }
        this.app.openBytes(bytes, f.name);
        this.sync();
      })();
    }, { signal });
  }
}

/** "rgb(r, g, b)" → "#RRGGBB" (cor opaca); undefined para o resto. */
function cssHex(color: string | undefined): string | undefined {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(color ?? '');
  if (!m || (m[4] !== undefined && Number(m[4]) < 1)) return undefined;
  return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const chromes = new WeakMap<UniversalSheetElement, SheetChrome>();

export function setupChrome(el: UniversalSheetElement, topbarEl: HTMLElement, bottombarEl: HTMLElement, opts: ChromeOptions): ChromeHandle {
  chromes.get(el)?.destroy();
  const c = new SheetChrome(el, topbarEl, bottombarEl, opts);
  chromes.set(el, c);
  return { sync: () => c.sync(), setNotice: (n) => c.setNotice(n) };
}

/** Desmonta as barras (topbar e bottombar saíram, ou o elemento saiu do documento). */
export function teardownChrome(el: UniversalSheetElement): void {
  chromes.get(el)?.destroy();
  chromes.delete(el);
}
