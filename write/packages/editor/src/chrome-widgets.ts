// Controles livres das barras do Write: título do documento, seletores de
// estilo e fonte, caixa de tamanho, zoom, botão Salvar e os menus de cor,
// espaçamento, página e símbolos.
import {
  OFFICE_COLORS, HIGHLIGHT_COLORS, colorGrid, ripple, symbol, toggleMenu,
  type BarContext, type BarItem, type MenuEntry, type MenuItem,
} from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import { ZOOMS, type ChromeCtl } from './chrome-commands.js';
import { ACCENTS, type ColorMode } from './chrome-theme.js';

export interface WidgetEnv { ed: UniversalWriteElement; app: WriteApp; ctl: ChromeCtl; root: ShadowRoot; styles?: import('./chrome-styles.js').StylesUI }

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

const t = (ctx: BarContext, l: { en: string; pt: string; es: string }): string => ctx.registry.text(l);
const canEdit = (env: WidgetEnv): boolean => !env.app.comparing && !env.ed.isProtected();

/** Título editável do documento (nome sugerido ao salvar). */
export const titleWidget = (env: WidgetEnv): BarItem => ({
  id: 'title',
  widget: (ctx) => {
    const input = document.createElement('input');
    // o visual de campo (.uo-title) é só deste título embutido; o do hospedeiro ganha .uo-title-slot
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
        if (document.activeElement !== input && env.root.activeElement !== input && input.value !== v) input.value = v;
      },
    };
  },
});

/** Botão "Salvar .docx" (destaque à direita da barra de menus). */
export const saveWidget = (env: WidgetEnv): BarItem => ({
  id: 'save',
  widget: (ctx) => {
    const b = btn('uo-pill uo-pill-primary', 'save', ctx.registry.tooltip('save'));
    b.innerHTML = `${symbol('save')}<span></span>`;
    const span = b.querySelector('span')!;
    b.addEventListener('click', () => { void ctx.registry.run('save'); });
    return {
      el: b,
      sync: () => {
        span.textContent = `${ctx.registry.label('save')} .${env.app.format}`;
        b.disabled = env.app.comparing;
      },
    };
  },
});

/** Seletor de estilo de parágrafo — os estilos REAIS do documento. */
export const styleWidget = (env: WidgetEnv, width = 120): BarItem => ({
  id: 'style:combo',
  widget: (ctx) => {
    const b = btn('uo-btn uo-drop uo-combo', 'style', t(ctx, { en: 'Paragraph style', pt: 'Estilo de parágrafo', es: 'Estilo de párrafo' }));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    const text = b.querySelector<HTMLElement>('.uo-drop-text')!;
    const styles = (): { id: string; name: string }[] => {
      const ds = env.ed.paragraphStyles();
      if (ds.length) return ds;
      // documento novo sem styles.xml
      return [{ id: 'Normal', name: 'Normal' }, { id: 'Title', name: t(ctx, { en: 'Title', pt: 'Título', es: 'Título' }) },
        ...[1, 2, 3].map((n) => ({ id: `Heading${n}`, name: t(ctx, { en: `Heading ${n}`, pt: `Título ${n}`, es: `Título ${n}` }) }))];
    };
    const cur = (): string => (env.ctl.state().para.styleId as string | undefined) || 'Normal';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = cur();
      toggleMenu(b, () => styles().map((s): MenuItem => ({
        id: `style:${s.id}`, label: s.name, checked: s.id === c,
        onClick: () => { env.ed.applyStyle(s.id === 'Normal' ? undefined : s.id); ctx.after(); },
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const c = cur();
        text.textContent = styles().find((s) => s.id === c)?.name ?? c;
        b.disabled = !canEdit(env);
      },
    };
  },
});

/** Seletor de fonte: o que o resolvedor ÚNICO enxerga (+ as do documento). */
export const fontWidget = (env: WidgetEnv, width = 130): BarItem => ({
  id: 'font:family',
  widget: (ctx) => {
    const b = btn('uo-btn uo-drop uo-combo', 'font', t(ctx, { en: 'Font', pt: 'Fonte', es: 'Fuente' }));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    const text = b.querySelector<HTMLElement>('.uo-drop-text')!;
    let families: string[] = env.ed.knownFontFamilies();
    let lastKnown = families.length;
    const refresh = (): void => { void env.ed.listAvailableFonts().then((f) => { families = f; }); };
    refresh();
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      // Chromium: o 1º gesto no seletor pede a Local Font Access (lista completa)
      env.ctl.requestFonts();
      const cur = (env.ctl.state().run.fontAscii as string | undefined) ?? '';
      const list = cur && !families.includes(cur) ? [cur, ...families] : families;
      toggleMenu(b, () => list.map((f): MenuItem => ({
        id: `font:${f}`, label: f, checked: f === cur,
        onClick: () => { env.ed.setFontFamily(f); ctx.after(); },
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const known = env.ed.knownFontFamilies().length;
        if (known !== lastKnown) { lastKnown = known; refresh(); }
        text.textContent = (env.ctl.state().run.fontAscii as string | undefined) ?? '';
        b.disabled = !canEdit(env);
      },
    };
  },
});

export function refreshFontsOf(env: WidgetEnv): Promise<string[]> { return env.ed.listAvailableFonts(); }

const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

/** Tamanho da fonte: − [11] + (compacta) ou [11 ▾] (ribbon). */
export const sizeWidget = (env: WidgetEnv, variant: 'steppers' | 'dropdown'): BarItem => ({
  id: 'font:size',
  widget: (ctx) => {
    const wrap = document.createElement('span');
    wrap.className = 'uo-g-inline';
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:1px';
    const input = document.createElement('input');
    input.className = 'uo-num';
    input.dataset['a'] = 'size';
    input.inputMode = 'decimal';
    input.maxLength = 5;
    input.title = t(ctx, { en: 'Font size', pt: 'Tamanho da fonte', es: 'Tamaño de fuente' });
    input.setAttribute('aria-label', input.title);
    const apply = (): void => {
      const v = parseFloat(input.value.replace(',', '.'));
      if (!isNaN(v) && v > 0) env.ed.setFontSize(v);
      ctx.after();
    };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    input.addEventListener('focus', () => input.select());
    const dec = ctx.registry.text({ en: '.', pt: ',', es: ',' });
    const fmt = (n: number): string => String(n).replace('.', dec);
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
        toggleMenu(drop, () => SIZES.map((s): MenuItem => ({
          label: fmt(s), checked: input.value === fmt(s),
          onClick: () => { env.ed.setFontSize(s); ctx.after(); },
        })), ctx);
      });
      wrap.append(input, drop);
    }
    return {
      el: wrap,
      sync: () => {
        const half = env.ctl.state().run.szHalfPt as number | undefined;
        if (half && env.root.activeElement !== input) input.value = fmt(half / 2);
        const ok = canEdit(env);
        for (const el of wrap.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button')) el.disabled = !ok;
      },
    };
  },
});

/** Zoom: botão com a porcentagem e menu de predefinições. */
export const zoomItem = (env: WidgetEnv): BarItem => ({
  menu: () => [
    ...ZOOMS.map((z): MenuItem => ({
      label: `${z}%`, checked: Math.round(env.ed.getZoom() * 100) === z,
      onClick: () => { env.ed.setZoom(z / 100); env.ed.focusEditor(); },
    })),
  ],
  id: 'zoom', label: { en: 'Zoom', pt: 'Zoom', es: 'Zoom' },
  text: () => `${Math.round(env.ed.getZoom() * 100)}%`,
});

// ── menus de cor ──
const moreColors = (ctx: BarContext, label: string, onPick: (hex: string) => void): MenuItem => ({
  icon: 'palette', label,
  onClick: () => {
    const input = document.createElement('input');
    input.type = 'color';
    input.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
    ctx.layer.appendChild(input);
    input.addEventListener('change', () => { onPick(input.value.slice(1).toUpperCase()); input.remove(); ctx.after(); });
    input.addEventListener('blur', () => setTimeout(() => input.remove(), 1000));
    input.click();
  },
});


export const highlightMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const L = env.app.ui!.L;
  return [
    { content: (close) => colorGrid({
      colors: HIGHLIGHT_COLORS.map((h) => ({ value: h.value, css: h.css, title: ctx.registry.text(h.label) })), columns: 5,
      selected: env.ctl.state().run.highlight as string | undefined,
      onPick: (v) => { env.app.lastHighlight = v; env.ed.setHighlight(v); ctx.after(); }, close,
    }) },
    { id: 'highlight:none', label: L.noColor, swatch: '', onClick: () => { env.ed.setHighlight(undefined); ctx.after(); } },
  ];
};

export const shadingMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const L = env.app.ui!.L;
  const pick = (hex: string): void => { env.app.lastShading = hex; env.ed.setShading(hex); ctx.after(); };
  return [
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h) => ({ value: h, css: `#${h}` })), selected: env.ctl.state().para.shadingHex as string | undefined, onPick: pick, close }) },
    { id: 'shading:none', label: L.noColor, swatch: '', onClick: () => { env.ed.setShading(undefined); ctx.after(); } },
    moreColors(ctx, L.moreColors, pick),
  ];
};

// ── menus de parágrafo / página ──
export const lineSpacingMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const p = env.ctl.state().para;
  const dec = ctx.registry.text({ en: '.', pt: ',', es: ',' });
  const line = p.lineTwentieths as number | undefined;
  const sb = p.spaceBeforeTwips as number | undefined, sa = p.spaceAfterTwips as number | undefined;
  const ok = canEdit(env);
  return [
    ...([[240, '1.0'], [259, '1.08'], [276, '1.15'], [360, '1.5'], [480, '2.0']] as const).map(([v, txt]): MenuItem => ({
      id: `spacing:${v}`, label: txt.replace('.', dec), checked: line === v, disabled: !ok,
      onClick: () => { env.ed.setLineSpacing(v); ctx.after(); },
    })),
    '-',
    sb ? { id: 'spaceBefore:remove', label: t(ctx, { en: 'Remove space before paragraph', pt: 'Remover espaço antes do parágrafo', es: 'Quitar espacio antes del párrafo' }), disabled: !ok, onClick: () => { env.ed.setSpaceBefore(0); ctx.after(); } }
      : { id: 'spaceBefore:add', label: t(ctx, { en: 'Add space before paragraph', pt: 'Adicionar espaço antes do parágrafo', es: 'Agregar espacio antes del párrafo' }), disabled: !ok, onClick: () => { env.ed.setSpaceBefore(240); ctx.after(); } },
    sa ? { id: 'spaceAfter:remove', label: t(ctx, { en: 'Remove space after paragraph', pt: 'Remover espaço depois do parágrafo', es: 'Quitar espacio después del párrafo' }), disabled: !ok, onClick: () => { env.ed.setSpaceAfter(0); ctx.after(); } }
      : { id: 'spaceAfter:add', label: t(ctx, { en: 'Add space after paragraph', pt: 'Adicionar espaço depois do parágrafo', es: 'Agregar espacio después del párrafo' }), disabled: !ok, onClick: () => { env.ed.setSpaceAfter(160); ctx.after(); } },
    '-',
    'dlg:paragraph',
  ];
};

export const paragraphSpacingMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const ok = canEdit(env);
  const preset = (id: string, en: string, pt: string, es: string, before: number, after: number, line: number): MenuItem => ({
    id: `pspacing:${id}`, label: { en, pt, es }, disabled: !ok,
    onClick: () => { env.ed.setSpaceBefore(before); env.ed.setSpaceAfter(after); env.ed.setLineSpacing(line); ctx.after(); },
  });
  return [
    preset('none', 'No paragraph space', 'Sem espaço entre parágrafos', 'Sin espacio entre párrafos', 0, 0, 240),
    preset('compact', 'Compact', 'Compacto', 'Compacto', 0, 80, 240),
    preset('tight', 'Tight', 'Apertado', 'Estrecho', 0, 120, 259),
    preset('open', 'Open', 'Aberto', 'Abierto', 0, 200, 276),
    preset('relaxed', 'Relaxed', 'Relaxado', 'Relajado', 0, 120, 300),
    preset('double', 'Double', 'Duplo', 'Doble', 0, 160, 480),
  ];
};

export const charSpacingMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const cur = env.ctl.state().run.charSpacingTwips as number | undefined;
  const ok = canEdit(env);
  return ([[undefined, 'Normal', 'Normal', 'Normal'], [20, 'Expanded 1 pt', 'Expandido 1 pt', 'Expandido 1 pt'], [40, 'Expanded 2 pt', 'Expandido 2 pt', 'Expandido 2 pt'],
    [-10, 'Condensed 0.5 pt', 'Condensado 0,5 pt', 'Comprimido 0,5 pt'], [-20, 'Condensed 1 pt', 'Condensado 1 pt', 'Comprimido 1 pt']] as const).map(([v, en, pt, es]): MenuItem => ({
    id: `charSpacing:${v ?? 0}`, label: { en, pt, es }, checked: (cur ?? undefined) === v, disabled: !ok,
    onClick: () => { env.ed.setCharSpacing(v); ctx.after(); },
  }));
};

export const specialIndentMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const first = env.ctl.state().para.indentFirstLineTwips as number | undefined;
  const cur = !first ? 'none' : first > 0 ? 'firstLine' : 'hanging';
  const ok = canEdit(env);
  return ([['none', 'None', 'Nenhum', 'Ninguno'], ['firstLine', 'First line', 'Primeira linha', 'Primera línea'], ['hanging', 'Hanging', 'Deslocamento', 'Francesa']] as const)
    .map(([v, en, pt, es]): MenuItem => ({
      id: `specialIndent:${v}`, label: { en, pt, es }, checked: cur === v, disabled: !ok,
      onClick: () => { env.ed.setSpecialIndent(v); ctx.after(); },
    }));
};

const pageItems = <T extends string>(env: WidgetEnv, ctx: BarContext, key: 'orientation' | 'size' | 'margins', opts: readonly (readonly [T, string, string, string, string?])[]): MenuItem[] =>
  opts.map(([v, en, pt, es, icon]) => ({
    id: `${key}:${v}`, label: { en, pt, es }, icon, disabled: !canEdit(env),
    onClick: () => { env.ed.setPageSetup({ [key]: v }); ctx.after(); },
  }));
export const orientationMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] =>
  pageItems(env, ctx, 'orientation', [['portrait', 'Portrait', 'Retrato', 'Vertical', 'crop_portrait'], ['landscape', 'Landscape', 'Paisagem', 'Horizontal', 'crop_landscape']] as const);
export const sizeMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] =>
  pageItems(env, ctx, 'size', [['A4', 'A4 (21 × 29.7 cm)', 'A4 (21 × 29,7 cm)', 'A4 (21 × 29,7 cm)'], ['Letter', 'Letter (21.59 × 27.94 cm)', 'Carta (21,59 × 27,94 cm)', 'Carta (21,59 × 27,94 cm)']] as const);
export const marginsMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [
  ...pageItems(env, ctx, 'margins', [['normal', 'Normal (2.5 cm)', 'Normal (2,5 cm)', 'Normal (2,5 cm)'], ['narrow', 'Narrow (1.27 cm)', 'Estreita (1,27 cm)', 'Estrecho (1,27 cm)'], ['wide', 'Wide (5.08 cm)', 'Larga (5,08 cm)', 'Ancho (5,08 cm)']] as const),
  '-', 'dlg:page',
];

/** Maiúsculas e Minúsculas (os 5 itens do Word, na ordem dele). */
export const caseMenu = (): MenuEntry[] => ['case:sentence', 'case:lower', 'case:upper', 'case:title', 'case:toggle'];

export const fieldsMenu = (): MenuEntry[] => ['field:page', 'field:numpages', 'field:date', '-', 'fields:update'];

const SYMBOL_CHARS = '©®™§¶€£¥¢°±×÷≠≤≥≈∞µ–—…“”‘’«»•·†‡→←↑↓✓✗½¼¾αβπΩΣ';
export const symbolMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const g = document.createElement('div');
    g.className = 'uo-colors';
    g.style.gridTemplateColumns = 'repeat(8, 28px)';
    for (const ch of SYMBOL_CHARS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch;
      b.dataset['symbol'] = ch;
      b.style.cssText = 'width:28px;height:28px;border-radius:6px;background:transparent;font:inherit;font-size:16px;color:inherit;border:1px solid transparent';
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.disabled = !canEdit(env);
      b.addEventListener('click', () => { close(); env.ed.pasteText(ch); ctx.after(); });
      g.appendChild(b);
    }
    return g;
  },
}];

// ── tema ── sem atributo `theme` nem escolha, o componente segue a página: o
// claro/escuro pelo color-scheme do contexto e as cores pelos --u-color-* dela
// (se não houver, a paleta do destaque). "Automático" = o mesmo claro/escuro, mas
// com a paleta do destaque; Claro/Escuro forçam; Escuro total escurece a folha.
export const themeMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [
  {
    id: 'theme:page', label: { en: 'Follow the page', pt: 'Seguir a página', es: 'Seguir la página' }, icon: 'web_asset',
    checked: env.app.mode === null, onClick: () => { setMode(env, null); ctx.after(); },
  },
  '-',
  ...([['auto', 'Automatic', 'Automático', 'Automático', 'brightness_auto'], ['light', 'Light', 'Claro', 'Claro', 'light_mode'],
    ['dark', 'Dark', 'Escuro', 'Oscuro', 'dark_mode'], ['black', 'Black (dark page)', 'Escuro total (página escura)', 'Negro (página oscura)', 'bedtime']] as const)
    .map(([m, en, pt, es, icon]): MenuItem => ({
      id: `theme:${m}`, label: { en, pt, es }, icon, checked: env.app.mode === m,
      onClick: () => { setMode(env, m); ctx.after(); },
    })),
];

/** Escolha EXPLÍCITA no menu: vale para esta instância; o atributo `theme`, se houver, acompanha. */
export function setMode(env: WidgetEnv, m: ColorMode | null): void {
  env.app.chosenMode = m;
  env.app.prefs.set('mode', m ?? '');
  if (m === null) env.ed.removeAttribute('theme');
  else if (env.ed.hasAttribute('theme')) env.ed.setAttribute('theme', m);
  env.ctl.applyTheme();
}

export const accentMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => colorGrid({
    colors: ACCENTS.map((a) => ({ value: a.id, css: a.id === 'neutral' ? 'linear-gradient(135deg,#111 0 50%,#fff 50% 100%)' : a.seed, title: ctx.registry.text(a.label) })),
    columns: 7, selected: env.app.accent, close,
    onPick: (id) => {
      // escolher um destaque é pedir o tema do componente (modo automático, se nenhum)
      env.app.chosenAccent = id;
      env.app.prefs.set('accent', id);
      if (env.ed.hasAttribute('accent')) env.ed.setAttribute('accent', id);
      if (env.app.mode === null) setMode(env, 'auto'); else env.ctl.applyTheme();
      ctx.after();
    },
  }),
}];
