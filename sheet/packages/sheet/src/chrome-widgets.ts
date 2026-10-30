// Controles livres das barras do Sheet: título da pasta, botão Salvar, fonte,
// tamanho, formato de número, zoom e os menus de cor, bordas, mesclar, tema.
import { FontResolver } from '@universal-office/fonts';
import {
  OFFICE_COLORS, colorGrid, ripple, symbol, toggleMenu,
  type BarContext, type BarItem, type MenuEntry, type MenuItem,
} from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import type { SheetApp } from './chrome-app.js';
import { FONT_SIZES, ZOOMS, type ChromeCtl } from './chrome-commands.js';
import { ACCENTS } from './chrome-theme.js';

export interface WidgetEnv {
  el: UniversalSheetElement;
  app: SheetApp;
  ctl: ChromeCtl;
  root: ShadowRoot;
  /** destaque/modo mudaram */
  applyTheme(): void;
}

/** Ícone (SVG) num span próprio + o texto num span: o botão sem depender de parser de HTML para os filhos. */
function iconSpan(name: string): HTMLSpanElement {
  const i = document.createElement('span');
  i.style.display = 'contents';
  i.innerHTML = symbol(name);
  return i;
}

/** Caixa de combinação (texto + ▾) montada por elementos. */
function comboParts(b: HTMLButtonElement): HTMLSpanElement {
  const text = document.createElement('span');
  text.className = 'uo-drop-text';
  const chev = document.createElement('span');
  chev.className = 'uo-chev';
  chev.innerHTML = symbol('arrow_drop_down');
  b.append(text, chev);
  return text;
}

function btn(cls: string, id: string, title: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.dataset['a'] = id;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('mousedown', (e) => e.preventDefault());
  ripple(b);
  return b;
}

const t = (ctx: BarContext, l: { en: string; pt: string }): string => ctx.registry.text(l);
const loaded = (env: WidgetEnv): boolean => env.el.getSheetNames().length > 0;

/** Título editável da pasta (nome sugerido ao salvar). */
export const titleWidget = (env: WidgetEnv): BarItem => ({
  id: 'title',
  widget: (ctx) => {
    const input = document.createElement('input');
    input.className = 'uo-title';
    input.dataset['a'] = 'title';
    input.spellcheck = false;
    input.title = env.app.ui!.L.docTitle;
    input.setAttribute('aria-label', input.title);
    input.addEventListener('change', () => { env.app.setTitle(input.value.trim()); ctx.after(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); ctx.after(); } });
    return {
      el: input,
      sync: () => {
        const v = env.app.title || env.app.ui!.L.untitled;
        if (env.root.activeElement !== input && input.value !== v) input.value = v;
      },
    };
  },
});

/** Botão "Salvar .xlsx" (destaque à direita). */
export const saveWidget = (env: WidgetEnv): BarItem => ({
  id: 'save',
  widget: (ctx) => {
    const b = btn('uo-pill uo-pill-primary', 'save', ctx.registry.tooltip('save'));
    const span = document.createElement('span');
    b.prepend(iconSpan('save'), span);
    b.addEventListener('click', () => { void ctx.registry.run('save'); });
    return {
      el: b,
      sync: () => {
        span.textContent = `${ctx.registry.label('save')} .xlsx`;
        b.disabled = !loaded(env);
      },
    };
  },
});

/** Famílias para o seletor: as conhecidas + a fonte Normal da pasta + a da célula. */
async function families(): Promise<string[]> {
  try { return await FontResolver.shared().listFamilies(); } catch { return []; }
}

/** Seletor de fonte da célula. */
export const fontWidget = (env: WidgetEnv, width = 130): BarItem => ({
  id: 'font:family',
  widget: (ctx) => {
    const b = btn('uo-btn uo-drop uo-combo', 'font', t(ctx, { en: 'Font', pt: 'Fonte' }));
    b.style.width = `${width}px`;
    const text = comboParts(b);
    let list: string[] = [];
    void families().then((f) => { list = f; });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = env.el.getCellFormat().fontName;
      const base = env.el.defaultFontName;
      const names = [...new Set([base, cur, ...list])];
      toggleMenu(b, () => names.map((f): MenuItem => ({
        id: `font:${f}`, label: f, checked: f === cur,
        onClick: () => { env.el.setFont({ name: f }); ctx.after(); },
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        text.textContent = loaded(env) ? env.el.getCellFormat().fontName : '';
        b.disabled = !loaded(env);
      },
    };
  },
});

/** Tamanho da fonte: − [11] + (compacta) ou [11 ▾] (ribbon). */
export const sizeWidget = (env: WidgetEnv, variant: 'steppers' | 'dropdown'): BarItem => ({
  id: 'font:size',
  widget: (ctx) => {
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:1px';
    const input = document.createElement('input');
    input.className = 'uo-num';
    input.dataset['a'] = 'size';
    input.inputMode = 'decimal';
    input.maxLength = 5;
    input.title = t(ctx, { en: 'Font size', pt: 'Tamanho da fonte' });
    input.setAttribute('aria-label', input.title);
    const apply = (): void => {
      const v = parseFloat(input.value.replace(',', '.'));
      if (!isNaN(v) && v >= 1 && v <= 409) env.el.setFont({ size: Math.round(v * 2) / 2 });
      ctx.after();
    };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); env.el.focus(); } });
    input.addEventListener('focus', () => input.select());
    if (variant === 'steppers') {
      const minus = btn('uo-btn', 'shrink', ctx.registry.tooltip('shrink'));
      minus.innerHTML = symbol('remove');
      minus.addEventListener('click', () => { void ctx.registry.run('shrink'); });
      const plus = btn('uo-btn', 'grow', ctx.registry.tooltip('grow'));
      plus.innerHTML = symbol('add');
      plus.addEventListener('click', () => { void ctx.registry.run('grow'); });
      wrap.append(minus, input, plus);
    } else {
      input.style.width = '44px';
      const drop = btn('uo-btn uo-split-arrow', 'size:menu', input.title);
      drop.innerHTML = symbol('arrow_drop_down');
      drop.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(drop, () => FONT_SIZES.map((s): MenuItem => ({
          label: String(s), checked: input.value === String(s),
          onClick: () => { env.el.setFont({ size: s }); ctx.after(); },
        })), ctx);
      });
      wrap.append(input, drop);
    }
    return {
      el: wrap,
      sync: () => {
        const ok = loaded(env);
        if (ok && env.root.activeElement !== input) input.value = String(env.el.getCellFormat().fontSize).replace('.', t(ctx, { en: '.', pt: ',' }));
        for (const x of wrap.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button')) x.disabled = !ok;
      },
    };
  },
});

/** Categoria do formato da célula ativa (o texto da caixa Formato de Número do Excel). */
const CATEGORY: Record<string, { en: string; pt: string }> = {
  general: { en: 'General', pt: 'Geral' }, number: { en: 'Number', pt: 'Número' }, currency: { en: 'Currency', pt: 'Moeda' },
  accounting: { en: 'Accounting', pt: 'Contábil' }, date: { en: 'Date', pt: 'Data' }, time: { en: 'Time', pt: 'Hora' },
  percent: { en: 'Percentage', pt: 'Porcentagem' }, fraction: { en: 'Fraction', pt: 'Fração' }, scientific: { en: 'Scientific', pt: 'Científico' },
  text: { en: 'Text', pt: 'Texto' }, custom: { en: 'Custom', pt: 'Personalizado' },
};

/** Categoria aproximada de um código de formato (para o texto do seletor). */
export function categoryOf(code: string): keyof typeof CATEGORY {
  const c = code.split(';')[0]!.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, (m) => (/^\[\$[^-\]]/.test(m) ? '$' : ''));
  if (/^general$/i.test(code.trim())) return 'general';
  if (c.trim() === '@') return 'text';
  if (/_\(|_-|\*/.test(code) && /[$€£¥]|R\\?\$/.test(code)) return 'accounting';
  if (/[$€£¥]|R\$/.test(code)) return 'currency';
  if (/%/.test(c)) return 'percent';
  if (/E[+-]/i.test(c)) return 'scientific';
  if (/[?#0]\s*\/\s*[?#0]/.test(c)) return 'fraction';
  if (/[dy]/i.test(c) || (/m/i.test(c) && !/[hs]/i.test(c))) return 'date';
  if (/[hs]/i.test(c)) return 'time';
  if (/[0#]/.test(c)) return 'number';
  return 'custom';
}

export const numberFormatMenu = (): MenuEntry[] => [
  'numfmt:general', 'numfmt:number', 'numfmt:currency', 'numfmt:accounting', 'numfmt:shortDate', 'numfmt:longDate',
  'numfmt:time', 'numfmt:percent', 'numfmt:fraction', 'numfmt:scientific', 'numfmt:text', '-', 'numfmt:custom',
];

/** Caixa Formato de Número: o nome da categoria da célula e a lista do Excel. */
export const numberFormatWidget = (env: WidgetEnv, width = 120): BarItem => ({
  id: 'numfmt:combo',
  widget: (ctx) => {
    const b = btn('uo-btn uo-drop uo-combo', 'numfmt', t(ctx, { en: 'Number format', pt: 'Formato de número' }));
    b.style.width = `${width}px`;
    const text = comboParts(b);
    b.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(b, numberFormatMenu, ctx); });
    return {
      el: b,
      sync: () => {
        const ok = loaded(env);
        text.textContent = ok ? t(ctx, CATEGORY[categoryOf(env.el.getCellFormat().numFmtCode)]!) : '';
        b.disabled = !ok;
      },
    };
  },
});

/** Zoom: botão com a porcentagem e as predefinições. */
export const zoomItem = (env: WidgetEnv): BarItem => ({
  menu: () => zoomMenu(env),
  id: 'zoom', label: { en: 'Zoom', pt: 'Zoom' },
  text: () => `${Math.round(env.el.getZoom() * 100)}%`,
  isEnabled: () => loaded(env),
});

export const zoomMenu = (env: WidgetEnv): MenuEntry[] => [
  ...ZOOMS.map((z): MenuItem => ({
    id: `zoom:${z}`, label: `${z}%`, checked: Math.round(env.el.getZoom() * 100) === z,
    onClick: () => { env.el.setZoom(z / 100); env.el.focus(); },
  })),
  '-', 'zoomin', 'zoomout',
];

// ── cores ──
const moreColors = (ctx: BarContext, label: string, onPick: (hex: string) => void): MenuItem => ({
  icon: 'palette', label,
  onClick: () => {
    const input = document.createElement('input');
    input.type = 'color';
    input.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
    ctx.layer.appendChild(input);
    input.addEventListener('change', () => { onPick(input.value.toUpperCase()); input.remove(); ctx.after(); });
    input.addEventListener('blur', () => setTimeout(() => input.remove(), 1000));
    input.click();
  },
});

export const fontColorMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const pick = (hex: string): void => { env.app.lastFontColor = hex; env.el.setFont({ color: hex }); ctx.after(); };
  return [
    { id: 'color:auto', label: { en: 'Automatic', pt: 'Automático' }, swatch: '#000000', onClick: () => { env.el.setFont({ color: null }); ctx.after(); } },
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h) => ({ value: `#${h}`, css: `#${h}` })), selected: env.el.getCellFormat().color, onPick: pick, close }) },
    moreColors(ctx, t(ctx, { en: 'More colors…', pt: 'Mais cores…' }), pick),
  ];
};

export const fillColorMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const pick = (hex: string): void => { env.app.lastFill = hex; env.el.setFormat({ fill: hex }); ctx.after(); };
  return [
    { id: 'fill:none', label: { en: 'No fill', pt: 'Sem preenchimento' }, swatch: '', onClick: () => { env.el.setFormat({ fill: null }); ctx.after(); } },
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h) => ({ value: `#${h}`, css: `#${h}` })), selected: env.el.getCellFormat().fill, onPick: pick, close }) },
    moreColors(ctx, t(ctx, { en: 'More colors…', pt: 'Mais cores…' }), pick),
  ];
};

export const bordersMenu = (): MenuEntry[] => [
  'borders:bottom', 'borders:top', 'borders:left', 'borders:right', '-', 'borders:none', 'borders:all', 'borders:outside', 'borders:thickOutside',
];
export const mergeMenu = (): MenuEntry[] => ['merge:center', 'merge:across', 'merge:cells', 'merge:off'];
export const autosumMenu = (): MenuEntry[] => ['autosum:sum', 'autosum:average', 'autosum:count', 'autosum:max', 'autosum:min', '-', 'function'];
export const clearMenu = (): MenuEntry[] => ['clear:all', 'clear:formats', 'clear:contents'];
export const fillMenu = (): MenuEntry[] => ['fill:down', 'fill:right'];
export const freezeMenu = (): MenuEntry[] => ['freeze:panes', 'freeze:topRow', 'freeze:firstCol', '-', 'freeze:off'];
export const findMenu = (): MenuEntry[] => ['find', 'replace', 'goto'];
export const pasteMenu = (): MenuEntry[] => ['paste', 'paste:values'];
export const alignMenu = (): MenuEntry[] => ['align:left', 'align:center', 'align:right', '-', 'valign:top', 'valign:center', 'valign:bottom', '-', 'indent', 'outdent', '-', 'wrap'];
/** Formatar (grupo Células do Excel): tamanho, visibilidade e Formatar Células. */
export const formatCellsMenu = (): MenuEntry[] => [
  'row:height', 'row:autofit', '-', 'col:width', 'col:autofit', '-',
  { id: 'hideUnhide', label: { en: 'Hide & unhide', pt: 'Ocultar e reexibir' }, icon: 'visibility_off', submenu: ['row:hide', 'col:hide', '-', 'row:unhide', 'col:unhide'] },
  '-', 'dlg:formatCells',
];

// ── tema ── sem `theme`, o componente segue a página (color-scheme do contexto);
// Claro/Escuro forçam (atributo `theme` no elemento)
export const themeMenu = (env: WidgetEnv): MenuEntry[] => {
  const cur = env.el.getAttribute('theme');
  const set = (m: string | null): void => {
    if (m === null) env.el.removeAttribute('theme'); else env.el.setAttribute('theme', m);
    env.app.prefs.set('theme', m ?? '');
    env.applyTheme();
  };
  return [
    { id: 'theme:page', label: { en: 'Follow the page', pt: 'Seguir a página' }, icon: 'web_asset', checked: !cur, onClick: () => set(null) },
    '-',
    ...([['auto', 'Automatic (system)', 'Automático (sistema)', 'brightness_auto'], ['light', 'Light', 'Claro', 'light_mode'], ['dark', 'Dark', 'Escuro', 'dark_mode']] as const)
      .map(([m, en, pt, icon]): MenuItem => ({ id: `theme:${m}`, label: { en, pt }, icon, checked: cur === m, onClick: () => set(m) })),
  ];
};

export const accentMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => colorGrid({
    colors: ACCENTS.map((a) => ({ value: a.id, css: a.id === 'neutral' ? 'linear-gradient(135deg,#111 0 50%,#fff 50% 100%)' : a.seed, title: ctx.registry.text(a.label) })),
    columns: 7, selected: env.app.accent, close,
    onPick: (id) => {
      env.app.chosenAccent = id;
      env.app.prefs.set('accent', id);
      if (env.el.hasAttribute('accent')) env.el.setAttribute('accent', id);
      env.applyTheme();
      ctx.after();
    },
  }),
}];
