// CSS das barras, menus, popovers, diálogos e avisos. Cores pelos tokens do
// Material 3 (--u-color-*, gerados pelo ThemeBuilder do @universal-material),
// com recuo fixo; o host personaliza com --uo-* (ver README do produto).

const c = (name: string, uo: string, def: string): string => `var(--uo-${uo}, var(--u-color-${name}, ${def}))`;

const SURFACE = c('surface', 'bar-bg', '#fdfbff');
const CONTAINER = c('surface-container', 'bar-container', '#eef0f4');
const HIGH = c('surface-container-high', 'menu-bg', '#e9e7ec');
const HIGHEST = c('surface-container-highest', 'hover-bg', '#e3e2e6');
const LOWEST = 'var(--u-color-surface-container-lowest, #ffffff)';
const ON = c('on-surface', 'bar-color', '#1b1b1f');
const ON_VAR = c('on-surface-variant', 'bar-color-2', '#44474f');
const OUTLINE = 'var(--u-color-outline, #74777f)';
const OUTLINE_VAR = c('outline-variant', 'bar-divider', '#c4c6d0');
const PRIMARY = c('primary', 'accent', '#005bc0');
const ON_PRIMARY = 'var(--u-color-on-primary, #ffffff)';
const ACTIVE = `color-mix(in srgb, ${PRIMARY} 14%, transparent)`;
const SHADOW = 'light-dark(rgba(0,0,0,.16), rgba(0,0,0,.5))';

export const BAR_CSS = /* css */ `
.uo-bar, .uo-menu, .uo-pop, .uo-dialog, .uo-toast {
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif);
  font-size: 14px; color: ${ON}; box-sizing: border-box;
}
.uo-bar *, .uo-menu *, .uo-pop *, .uo-dialog * { box-sizing: border-box; }
.uo-bar [hidden], .uo-pop [hidden], .uo-menu [hidden], .uo-dialog [hidden] { display: none !important; }
.uo-ic { width: 20px; height: 20px; flex: none; display: block; fill: currentColor; pointer-events: none; }
.uo-spacer { flex: 1 1 auto; min-width: 8px; }
.uo-btn, .uo-mbtn, .uo-tab, .uo-trig, .uo-menu-item, .uo-pill { position: relative; }

/* ── linha de título ── */
.uo-bar { background: ${SURFACE}; width: 100%; }
.uo-titlebar { display: flex; align-items: center; gap: 4px; min-height: 46px; padding: 4px 12px 2px; }
/* janela sem moldura com os controles do SO sobrepostos (Electron titleBarOverlay,
   PWA window-controls-overlay): o host liga .uo-wco num ancestral — reserva a
   área dos controles e arrasta a janela pela linha de título */
.uo-wco .uo-titlebar {
  min-height: max(46px, env(titlebar-area-height, 46px));
  padding-right: calc(12px + 100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
  -webkit-app-region: drag;
}
.uo-wco .uo-titlebar > :not(.uo-spacer) { -webkit-app-region: no-drag; }
.uo-title {
  font: inherit; font-size: 17px; color: ${ON}; background: transparent;
  border: 1px solid transparent; border-radius: 6px; padding: 2px 8px;
  min-width: 60px; width: 22ch; max-width: 40vw; text-overflow: ellipsis; outline: none;
}
.uo-title:hover { border-color: ${OUTLINE_VAR}; }
.uo-title:focus { border-color: ${PRIMARY}; }
/* título do HOSPEDEIRO (contribuição compact.title / ribbon.title): o lugar, sem o visual do campo */
.uo-title-slot { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 auto; color: ${ON}; }
.uo-menubar { display: flex; gap: 0; min-width: 0; overflow: hidden; flex: 0 1 auto; }
.uo-mbtn {
  border: 0; background: transparent; color: ${ON}; font: inherit; font-size: 14px;
  padding: 4px 9px; border-radius: 6px; cursor: pointer; white-space: nowrap; flex: none;
}
.uo-mbtn:hover, .uo-mbtn.uo-open { background: ${HIGHEST}; }
/* ícone/logo antes do título (compact.leading) */
.uo-leading { display: flex; align-items: center; justify-content: center; flex: none; min-width: 0; color: ${PRIMARY}; }
/* título ACIMA dos menus (titlePlacement: 'above-menus', estilo Google Docs): leading e
   trailing ocupam as duas linhas, centralizados; os menus alinham o texto com o título */
.uo-titlebar.uo-stacked { gap: 8px; min-height: 64px; padding: 6px 12px 2px 12px; }
.uo-stacked > .uo-leading { align-self: center; padding: 0 4px; }
.uo-titlebar-main { display: flex; flex-direction: column; justify-content: center; flex: 1 1 auto; min-width: 0; }
.uo-title-row { display: flex; align-items: center; gap: 4px; min-height: 30px; min-width: 0; }
.uo-title-row > .uo-title-slot { padding-inline-start: 9px; white-space: nowrap; }
.uo-menu-row { display: flex; align-items: center; min-height: 28px; min-width: 0; }
.uo-stacked .uo-mbtn { padding: 3px 9px; }
.uo-trailing { display: flex; align-items: center; gap: 4px; flex: none; align-self: center; }
/* empilhada com os controles do SO sobrepostos: a regra acima zeraria a reserva da
   área dos controles; o vazio das duas linhas continua arrastando a janela */
.uo-wco .uo-titlebar.uo-stacked {
  min-height: max(64px, env(titlebar-area-height, 64px));
  padding-right: calc(12px + 100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
}
.uo-wco .uo-stacked > .uo-titlebar-main { -webkit-app-region: drag; }
.uo-wco .uo-title-row > *, .uo-wco .uo-menu-row > * { -webkit-app-region: no-drag; }

/* ── faixa de aviso (BarHandle.setNotice): entre o título/menus e as ferramentas ── */
.uo-notice {
  display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 6px 16px;
  font-size: 13px; line-height: 1.4; border-block: 1px solid ${OUTLINE_VAR};
  background: var(--uo-notice-bg, color-mix(in srgb, ${PRIMARY} 10%, ${SURFACE}));
  color: var(--uo-notice-color, ${ON});
}
.uo-notice[data-tone="warning"] {
  background: var(--uo-notice-warning-bg, var(--u-color-warning-container, #ffdea8));
  color: var(--uo-notice-warning-color, var(--u-color-on-warning-container, #271900));
}
.uo-notice[data-tone="error"] {
  background: var(--uo-notice-error-bg, var(--u-color-error-container, #ffdad6));
  color: var(--uo-notice-error-color, var(--u-color-on-error-container, #410002));
}
.uo-notice > * { min-width: 0; }
.uo-notice a { color: inherit; font-weight: 600; }
.uo-ribbon .uo-notice { border-top: 0; }

/* ── botões ── */
.uo-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 2px;
  height: 32px; min-width: 32px; padding: 0 5px; border: 0; border-radius: 8px;
  background: transparent; color: ${ON_VAR}; cursor: pointer; font: inherit; font-size: 13px;
  flex: none; white-space: nowrap; vertical-align: middle;
}
.uo-btn:hover:not(:disabled), .uo-btn.uo-open { background: ${HIGHEST}; }
.uo-btn.uo-on { background: ${ACTIVE}; color: ${PRIMARY}; }
.uo-btn:disabled { opacity: .38; cursor: default; }
.uo-btn:focus-visible, .uo-mbtn:focus-visible, .uo-tab:focus-visible, .uo-menu-item:focus-visible, .uo-pill:focus-visible {
  outline: 2px solid ${PRIMARY}; outline-offset: -2px;
}
.uo-btn-lbl { padding: 0 8px; gap: 5px; }
.uo-lbl { pointer-events: none; }
.uo-chev { display: inline-flex; margin: 0 -4px 0 -3px; opacity: .7; }
.uo-chev .uo-ic { width: 18px; height: 18px; }
.uo-drop-text { font-size: 13px; font-weight: 500; min-width: 26px; text-align: center; pointer-events: none; }
.uo-swbar {
  position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%);
  width: 18px; height: 3px; border-radius: 2px; pointer-events: none;
}
.uo-split { display: inline-flex; align-items: stretch; flex: none; }
.uo-split > .uo-btn:first-child { border-radius: 8px 0 0 8px; }
.uo-split-arrow { min-width: 14px !important; width: 16px; padding: 0 !important; border-radius: 0 8px 8px 0 !important; }
.uo-split-arrow .uo-ic { width: 18px; height: 18px; }
.uo-pill {
  height: 38px; padding: 0 18px; border-radius: 19px; border: 1px solid ${OUTLINE_VAR};
  background: transparent; color: ${PRIMARY}; font: inherit; font-size: 14px; font-weight: 500;
  cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;
}
.uo-pill:hover { background: color-mix(in srgb, ${PRIMARY} 8%, transparent); }
.uo-pill-primary { background: ${PRIMARY}; color: ${ON_PRIMARY}; border-color: ${PRIMARY}; }
.uo-pill-primary:hover { background: color-mix(in srgb, ${PRIMARY} 88%, ${ON_PRIMARY}); }
.uo-pill .uo-ic { width: 18px; height: 18px; }
.uo-pill:disabled { opacity: .38; cursor: default; pointer-events: none; }
/* variantes dos botões do hospedeiro (createBarButton) */
.uo-pill-tonal { background: var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))); color: var(--uo-tonal-color, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); border-color: transparent; }
.uo-pill-tonal:hover { background: color-mix(in srgb, var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))) 88%, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
.uo-pill-text { border-color: transparent; padding: 0 12px; }
.uo-btn-icon { width: 40px; height: 40px; border-radius: 20px; padding: 0; }
.uo-btn-icon .uo-ic { width: 22px; height: 22px; }
/* ícone com destaque: fundo de destaque ou tonal (createBarButton icon-filled / icon-tonal) */
.uo-btn-icon-filled { background: ${PRIMARY}; color: ${ON_PRIMARY}; }
.uo-btn-icon-filled:hover:not(:disabled) { background: color-mix(in srgb, ${PRIMARY} 88%, ${ON_PRIMARY}); }
.uo-btn-icon-tonal { background: var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))); color: var(--uo-tonal-color, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
.uo-btn-icon-tonal:hover:not(:disabled) { background: color-mix(in srgb, var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))) 88%, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
/* ícone + rótulo: o espaço entre os dois é só o gap; padding do M3 (16px antes do ícone, 24px depois do rótulo) */
.uo-pill > .uo-lbl { margin: 0; line-height: normal; }
.uo-pill.uo-pill-ic { padding: 0 24px 0 16px; }
.uo-pill-text.uo-pill-ic { padding: 0 16px 0 12px; }
/* tamanho pequeno (size: 'small'): pílula de 24px para chips de status; ícone redondo de 28px */
.uo-pill.uo-btn-sm { height: 24px; padding: 0 10px; border-radius: 12px; gap: 4px; font-size: 12px; }
.uo-pill.uo-btn-sm.uo-pill-ic { padding: 0 10px 0 6px; }
.uo-pill.uo-btn-sm .uo-ic { width: 16px; height: 16px; }
.uo-btn-icon.uo-btn-sm { width: 28px; height: 28px; min-width: 28px; border-radius: 14px; }
.uo-btn-icon.uo-btn-sm .uo-ic { width: 18px; height: 18px; }
/* linha mínima do hospedeiro fora do editor (createBarRow) */
.uo-host-row .uo-titlebar { gap: 8px; }
.uo-host-row .uo-trailing { gap: 8px; }
.uo-ic-box { display: inline-flex; flex: none; color: inherit; }
.uo-ic-box > .uo-ic { width: var(--uo-ic-size, 20px); height: var(--uo-ic-size, 20px); }

/* ── campos (seletores de texto, tamanho, título) ── */
.uo-combo { justify-content: space-between; padding: 0 2px 0 8px; color: ${ON}; }
.uo-combo .uo-drop-text { text-align: left; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; font-weight: 400; }
.uo-num {
  height: 28px; width: 40px; padding: 0; text-align: center; font: inherit; font-size: 13px;
  border: 1px solid ${OUTLINE_VAR}; border-radius: 6px; background: ${LOWEST}; color: ${ON}; flex: none;
}
.uo-num:focus { outline: none; border-color: ${PRIMARY}; }
/* caixa numérica com setas (spin.ts): rótulo, caixa e as duas setas empilhadas */
.uo-spin { display: inline-flex; align-items: center; gap: 6px; height: 28px; font-size: 13px; color: ${ON}; white-space: nowrap; }
.uo-spin-lbl { display: inline-flex; align-items: center; gap: 4px; min-width: 0; color: ${ON}; cursor: default; }
.uo-spin-lbl .uo-ic { width: 18px; height: 18px; color: ${ON_VAR}; }
.uo-spin-box {
  display: inline-flex; align-items: stretch; height: 24px; border: 1px solid ${OUTLINE_VAR}; border-radius: 6px;
  background: ${LOWEST}; overflow: hidden; margin-left: auto;
}
.uo-spin-box:focus-within { border-color: ${PRIMARY}; }
.uo-spin-in { width: 64px; min-width: 0; border: 0; padding: 0 4px 0 8px; font: inherit; font-size: 13px; background: transparent; color: ${ON}; outline: none; }
.uo-spin-in[aria-invalid=true] { color: var(--u-color-error, #ba1a1a); }
.uo-spin-arrows { display: flex; flex-direction: column; border-left: 1px solid ${OUTLINE_VAR}; }
.uo-spin-arrow {
  flex: 1 1 0; width: 18px; display: flex; align-items: center; justify-content: center; padding: 0;
  border: 0; background: transparent; color: ${ON_VAR}; cursor: pointer; overflow: hidden;
}
.uo-spin-arrow .uo-ic { width: 18px; height: 18px; margin: -4px 0; }
.uo-spin-arrow:hover { background: ${HIGHEST}; color: ${ON}; }
.uo-spin-arrow:disabled, .uo-spin.uo-off .uo-spin-in { opacity: .38; cursor: default; }
.uo-caption { display: inline-flex; align-items: center; height: 24px; font-size: 12px; color: ${ON_VAR}; padding: 0 2px; }
/* na coluna da ribbon as caixas se alinham à direita (rótulos de larguras diferentes) */
.uo-rrow > .uo-spin { flex: 1 1 auto; padding: 0 4px; }
.uo-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: ${ON_VAR}; }
.uo-field input, .uo-field textarea, .uo-field select, .uo-dialog input[type=text], .uo-dialog input[type=number], .uo-dialog select {
  height: 38px; border: 1px solid ${OUTLINE}; border-radius: 8px; padding: 0 12px;
  background: ${LOWEST}; color: ${ON}; font: inherit; font-size: 14px;
}
.uo-field textarea { height: 90px; padding: 8px 12px; resize: vertical; }
.uo-field input:focus, .uo-field textarea:focus, .uo-field select:focus,
.uo-dialog input:focus, .uo-dialog select:focus { outline: 2px solid ${PRIMARY}; outline-offset: -1px; border-color: ${PRIMARY}; }
.uo-check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${ON}; cursor: pointer; }
.uo-check input { width: 18px; height: 18px; accent-color: ${PRIMARY}; margin: 0; }

/* ── barra compacta (Google Docs) ── */
.uo-toolrow { padding: 2px 12px 8px; }
.uo-toolbar {
  display: flex; align-items: center; gap: 2px; min-width: 0; overflow: hidden;
  background: ${CONTAINER}; border-radius: 20px; padding: 4px 8px; min-height: 40px;
}
.uo-g { display: inline-flex; align-items: center; gap: 2px; flex: none; }
.uo-g::before { content: ""; width: 1px; height: 22px; background: ${OUTLINE_VAR}; margin: 0 6px 0 5px; }
.uo-trig {
  display: inline-flex; align-items: center; gap: 1px; height: 32px; padding: 0 4px 0 6px; margin-left: 13px;
  border: 0; border-radius: 8px; background: transparent; color: ${ON_VAR}; cursor: pointer; flex: none;
}
.uo-trig::before {
  content: ""; position: absolute; left: -7px; top: 50%; transform: translateY(-50%);
  width: 1px; height: 22px; background: ${OUTLINE_VAR};
}
.uo-trig:hover, .uo-trig.uo-open { background: ${HIGHEST}; }
.uo-more { padding: 0 6px; }
.uo-toolbar > .uo-first { margin-left: 0; }
.uo-toolbar > .uo-first::before { display: none; }
.uo-burger { margin-right: 2px; }
/* celular (uo-narrow): ícone, título, ações e "⋮" (os menus) numa linha só, como os
   apps do Google; as pílulas com ícone viram só o ícone; as ferramentas descem (uo-docked) */
.uo-narrow .uo-titlebar, .uo-narrow .uo-titlebar.uo-stacked { min-height: 56px; padding: 4px; gap: 4px; }
.uo-narrow .uo-titlebar-main { display: contents; }
.uo-narrow .uo-trailing { order: 1; }
.uo-narrow .uo-menu-row { order: 2; min-height: 0; flex: none; }
.uo-narrow .uo-titlebar:not(.uo-stacked) > .uo-burger { order: 2; }
.uo-narrow .uo-burger { margin: 0; }
.uo-narrow .uo-title-row { flex: 1 1 auto; min-height: 0; }
.uo-narrow .uo-title { flex: 1 1 auto; width: auto; max-width: none; min-width: 0; font-size: 16px; }
.uo-narrow .uo-trailing .uo-pill:has(.uo-ic) { width: 40px; height: 40px; padding: 0; justify-content: center; }
.uo-narrow .uo-trailing .uo-pill:has(.uo-ic) > :not(.uo-ic, u-ripple, :has(.uo-ic)) { display: none; }
.uo-toolrow.uo-docked { padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px)); }

/* ── ribbon (Word) ── */
.uo-qat { display: inline-flex; align-items: center; gap: 0; }
.uo-ribbon .uo-titlebar { min-height: 40px; }
.uo-tabs { display: flex; align-items: flex-end; padding: 0 10px; gap: 4px; }
.uo-tabs-scroll { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; flex: 1 1 auto; min-width: 0; }
.uo-tabs-scroll::-webkit-scrollbar { display: none; }
.uo-tab {
  height: 34px; padding: 0 12px; border: 0; border-radius: 8px 8px 0 0; background: transparent;
  color: ${ON_VAR}; font: inherit; font-size: 13.5px; cursor: pointer; white-space: nowrap; flex: none;
}
.uo-tab:hover { background: ${HIGHEST}; }
.uo-tab.uo-on { color: ${PRIMARY}; font-weight: 600; }
.uo-tab.uo-on::after {
  content: ""; position: absolute; left: 12px; right: 12px; bottom: 0; height: 3px;
  border-radius: 3px 3px 0 0; background: ${PRIMARY};
}
.uo-tab-file { color: ${PRIMARY}; font-weight: 600; }
.uo-tab-ctx { color: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-tab-ctx.uo-on { color: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-tab-ctx.uo-on::after { background: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-ribbon-toggle { margin-bottom: 1px; }
.uo-ribbon-body { margin: 0 10px 8px; background: ${CONTAINER}; border-radius: 12px; padding: 4px 4px 2px; }
.uo-collapsed .uo-ribbon-body { display: none; }
.uo-collapsed .uo-tabs { padding-bottom: 6px; }
.uo-rpanel { display: flex; align-items: stretch; min-height: 98px; overflow: hidden; width: 100%; }
.uo-rgroup {
  display: flex; flex-direction: column; flex: none; padding: 2px 4px 0;
  border-right: 1px solid ${OUTLINE_VAR}; margin: 2px 0;
}
.uo-rgroup:last-child { border-right: 0; }
.uo-rgroup-body { display: flex; align-items: flex-start; gap: 2px; flex: 1 1 auto; }
.uo-rcol { display: flex; flex-direction: column; justify-content: flex-start; gap: 1px; align-self: stretch; }
.uo-rrow { display: flex; align-items: center; gap: 1px; min-height: 32px; }
.uo-rgroup-foot { display: flex; align-items: center; justify-content: center; gap: 2px; height: 20px; position: relative; }
.uo-rgroup-lbl { font-size: 11.5px; color: ${ON_VAR}; white-space: nowrap; padding: 0 16px; }
.uo-launcher { position: absolute; right: -2px; bottom: 1px; height: 18px; min-width: 18px; padding: 0; border-radius: 4px; }
.uo-launcher .uo-ic { width: 14px; height: 14px; }
.uo-btn-lg {
  flex-direction: column; height: auto; min-height: 74px; min-width: 50px; max-width: 86px;
  padding: 4px 6px; gap: 3px; justify-content: flex-start; white-space: normal;
}
.uo-btn-lg > .uo-ic { width: 30px; height: 30px; margin-top: 2px; }
.uo-btn-lg .uo-lbl { font-size: 12px; line-height: 1.2; text-align: center; color: ${ON}; }
.uo-btn-lg .uo-chev { margin: -4px 0 0; }
.uo-btn-lg .uo-swbar { bottom: auto; top: 34px; width: 26px; }
.uo-split-lg { flex-direction: column; }
.uo-split-lg > .uo-btn:first-child { border-radius: 8px 8px 0 0; min-height: 56px; }
.uo-split-lg > .uo-split-arrow { width: auto; height: 18px; border-radius: 0 0 8px 8px !important; }
.uo-rtrig { align-self: stretch; margin: 2px 2px; }

/* ── menus ── */
.uo-menu {
  position: fixed; z-index: 1000; min-width: 210px; max-width: min(420px, calc(100vw - 16px));
  max-height: min(72vh, 560px); overflow: auto; padding: 5px;
  background: ${HIGH}; border: 1px solid ${OUTLINE_VAR}; border-radius: 12px;
  box-shadow: 0 12px 32px ${SHADOW};
}
.uo-menu-item {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 34px;
  padding: 0 12px 0 10px; border: 0; border-radius: 8px; background: transparent;
  color: ${ON}; cursor: pointer; font: inherit; font-size: 13.5px; text-align: left;
}
.uo-menu-item:hover, .uo-menu-item:focus { background: ${HIGHEST}; outline: none; }
.uo-menu-item[disabled] { opacity: .38; pointer-events: none; }
.uo-menu-item.checked { background: ${ACTIVE}; }
.uo-menu-item.checked .lead { color: ${PRIMARY}; }
.uo-menu-item .lead { width: 22px; flex: none; color: ${ON_VAR}; display: inline-flex; align-items: center; justify-content: center; }
.uo-menu-item .lead .sw { width: 16px; height: 16px; border-radius: 4px; border: 1px solid ${OUTLINE_VAR}; }
.uo-menu-item .lb { flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uo-menu-item .sc { margin-left: 20px; font-size: 11.5px; color: ${ON_VAR}; opacity: .85; display: inline-flex; }
.uo-menu-item .sc .uo-ic { width: 18px; height: 18px; }
.uo-menu-sep { height: 1px; background: ${OUTLINE_VAR}; margin: 5px 8px; }
.uo-menu-content { padding: 6px 8px; }
/* submenu no lugar do pai (tela estreita): a linha de voltar */
.uo-menu-back { font-weight: 500; }
.uo-menu-back + * { margin-top: 4px; }
/* dedo: itens de 44px; atalho de teclado não serve no toque */
@media (pointer: coarse) {
  .uo-menu-item { min-height: 44px; font-size: 14.5px; }
  .uo-menu-item .sc:not(:has(.uo-ic)) { display: none; }
}

/* ── grade de cores ── */
.uo-colors { display: grid; grid-template-columns: repeat(10, 20px); gap: 4px; }
.uo-colors button {
  width: 20px; height: 20px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 1px solid color-mix(in srgb, ${ON} 18%, transparent);
}
.uo-colors button:hover { transform: scale(1.15); }
.uo-colors button.sel { outline: 2px solid ${PRIMARY}; outline-offset: 1px; }
.uo-colors-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; }

/* ── popover dos grupos recolhidos ── */
.uo-pop {
  position: fixed; z-index: 990; padding: 6px 8px 8px; max-width: calc(100vw - 16px);
  background: ${HIGH}; border: 1px solid ${OUTLINE_VAR}; border-radius: 14px;
  box-shadow: 0 12px 32px ${SHADOW};
}
.uo-pop-lbl {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: ${ON_VAR}; padding: 6px 6px 4px;
}
.uo-pop-sec + .uo-pop-sec { border-top: 1px solid ${OUTLINE_VAR}; margin-top: 4px; }
.uo-pop .uo-g { flex-wrap: wrap; }
.uo-pop .uo-g::before { display: none; }
.uo-pop .uo-rgroup { border-right: 0; }

/* ── diálogo ── */
.uo-dialog {
  border: 0; border-radius: 24px; padding: 20px 24px 18px; min-width: 300px; max-width: calc(100vw - 32px);
  background: ${HIGH}; color: ${ON}; box-shadow: 0 16px 48px ${SHADOW};
}
.uo-dialog::backdrop { background: rgba(0,0,0,.32); }
.uo-dialog:not([open]) { display: none; }
.uo-dialog-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.uo-dialog-icon { color: ${PRIMARY}; }
.uo-dialog-icon .uo-ic { width: 24px; height: 24px; }
.uo-dialog-title { font-size: 18px; font-weight: 500; flex: 1 1 auto; }
.uo-dialog-x { margin: -6px -10px -6px 0; border-radius: 50%; }
.uo-dialog-body { display: flex; flex-direction: column; gap: 12px; line-height: 1.45; }
.uo-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
.uo-dialog-grid { display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; align-items: center; }
.uo-dtabs { display: flex; flex-direction: column; gap: 14px; }
.uo-dtabs-strip { display: flex; gap: 2px; border-bottom: 1px solid ${OUTLINE_VAR}; overflow-x: auto; scrollbar-width: none; }
.uo-dtab { border: 0; background: transparent; color: inherit; font: inherit; padding: 8px 12px; cursor: pointer; border-bottom: 3px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
.uo-dtab:hover { background: ${HIGHEST}; }
.uo-dtab.uo-on { border-bottom-color: ${PRIMARY}; color: ${PRIMARY}; font-weight: 500; }
.uo-dtab:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }
.uo-dtabs-panes { display: grid; }
.uo-dtab-pane { grid-area: 1 / 1; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.uo-dtab-pane.uo-off { visibility: hidden; }

/* ── galeria (estilos, temas…) ── */
.uo-gal {
  display: inline-flex; align-items: stretch; flex: none; margin: 2px 2px 0;
  border: 1px solid ${OUTLINE_VAR}; border-radius: 10px; background: ${LOWEST}; overflow: hidden;
}
.uo-gal.uo-disabled { opacity: .5; }
.uo-gal-view { overflow: hidden; padding: 3px; flex: none; }
.uo-gal-grid { display: grid; gap: 2px; transition: transform .12s ease-out; }
.uo-gal-tile {
  position: relative; display: block; padding: 0; margin: 0; overflow: hidden; cursor: pointer;
  border: 1px solid transparent; border-radius: 7px; background: transparent; color: ${ON}; font: inherit; text-align: left;
}
.uo-gal-tile:hover:not(:disabled) { background: ${HIGHEST}; border-color: ${OUTLINE_VAR}; }
.uo-gal-tile.uo-on { border-color: ${PRIMARY}; background: ${ACTIVE}; }
.uo-gal-tile:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }
.uo-gal-tile:disabled { cursor: default; }
.uo-gal-nav { display: flex; flex-direction: column; border-left: 1px solid ${OUTLINE_VAR}; flex: none; }
.uo-gal-nav-btn { flex: 1 1 0; height: auto; min-height: 0; width: 22px; min-width: 22px; padding: 0; border-radius: 0; }
.uo-gal-nav-btn .uo-ic { width: 16px; height: 16px; }
.uo-gal-pop { padding: 8px; max-height: min(80vh, 640px); overflow: auto; }
.uo-gal-pop .uo-gal-grid { margin: 0 0 6px; }
.uo-gal-foot { border-top: 1px solid ${OUTLINE_VAR}; padding-top: 4px; }
.uo-gal-trigger { min-width: 120px; }
.uo-tiles { display: flex; flex-direction: column; gap: 4px; padding: 4px 8px 8px; max-height: min(70vh, 560px); overflow: auto; }
.uo-menu:has(> .uo-tiles), .uo-menu:has(> * > .uo-tiles) { max-width: calc(100vw - 16px); }
.uo-tiles-h { font-size: 12px; font-weight: 600; opacity: .8; padding: 4px 2px 0; }

/* ── painel lateral ── */
.uo-pane {
  position: fixed; z-index: 940; display: flex; flex-direction: column;
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif); font-size: 13.5px; color: ${ON};
  background: ${SURFACE}; border-left: 1px solid ${OUTLINE_VAR}; box-shadow: -4px 0 16px ${SHADOW}; box-sizing: border-box;
}
.uo-pane[data-dock="left"] { border-left: 0; border-right: 1px solid ${OUTLINE_VAR}; box-shadow: 4px 0 16px ${SHADOW}; }
.uo-pane[data-dock="bottom"] { border-left: 0; border-top: 1px solid ${OUTLINE_VAR}; box-shadow: 0 -4px 16px ${SHADOW}; }
.uo-pane * { box-sizing: border-box; }
.uo-pane [hidden] { display: none !important; }
.uo-pane-head { display: flex; align-items: center; gap: 8px; padding: 10px 6px 6px 16px; flex: none; }
.uo-pane-title { flex: 1 1 auto; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uo-pane-body { flex: 1 1 auto; overflow: auto; padding: 2px 8px 8px; min-height: 0; }
.uo-pane-foot { flex: none; display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 10px; border-top: 1px solid ${OUTLINE_VAR}; }

/* ── régua ── */
.uo-ruler {
  --uo-ruler-track: ${LOWEST}; --uo-ruler-shade: ${OUTLINE_VAR}; --uo-ruler-ink: ${ON_VAR};
  --uo-ruler-mark: ${ON}; --uo-ruler-accent: ${PRIMARY}; --uo-ruler-fill: ${LOWEST};
  display: flex; box-sizing: border-box; user-select: none; -webkit-user-select: none; touch-action: none;
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif);
}
.uo-ruler[hidden] { display: none !important; }
.uo-ruler-h { height: 24px; width: 100%; flex-direction: row; align-items: stretch; }
.uo-ruler-v { width: 22px; height: 100%; flex-direction: column; }
.uo-ruler-canvas { display: block; flex: 1 1 auto; min-width: 0; min-height: 0; width: 100%; height: 100%; }
.uo-ruler-sel {
  flex: none; width: 22px; height: 24px; padding: 0; margin: 0; border: 0; border-right: 1px solid ${OUTLINE_VAR};
  background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.uo-ruler-sel:hover { background: ${HIGHEST}; }
.uo-ruler-sel:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }

/* ── aviso (snackbar) ── */
.uo-toast {
  position: fixed; z-index: 1100; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(560px, calc(100vw - 32px)); padding: 12px 18px; border-radius: 8px;
  background: var(--u-color-inverse-surface, #303034); color: var(--u-color-on-inverse-surface, #f2f0f4);
  box-shadow: 0 6px 18px ${SHADOW}; font-size: 13.5px;
}
`;

/** Injeta o CSS das barras num shadow root (ou no documento) uma vez. */
export function ensureBarStyles(root: ShadowRoot | Document = document): void {
  const host = root instanceof Document ? root.head : root;
  if (host.querySelector('style[data-uo-bar]')) return;
  const s = document.createElement('style');
  s.dataset['uoBar'] = '';
  s.textContent = BAR_CSS;
  host.appendChild(s);
}
