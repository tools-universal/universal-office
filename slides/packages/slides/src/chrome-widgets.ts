// Controles livres das barras do Slides: título, logo, seletores de fonte e
// tamanho, botão Apresentação de Slides, zoom e os menus de cor, layout,
// formas, transições, direção, velocidade e tema.
import {
  OFFICE_COLORS, colorGrid, ripple, symbol, toggleMenu,
  type BarContext, type BarItem, type GalleryConfig, type MenuEntry, type MenuItem,
} from '@universal-office/ui';
import { FontResolver } from '@universal-office/fonts';
import { evalPreset } from '@universal-office/slides-core';
import type { UniversalSlidesElement } from './universal-slides.js';
import type { SlidesApp } from './chrome-app.js';
import { INSERTABLE_SHAPES, TRANSITION_TYPES } from './deck-edit.js';
import { L, SHAPE_LABELS, TRANSITION_LABELS, ZOOMS, defaultDir, ic, type ChromeCtl } from './chrome-commands.js';

export interface WidgetEnv { el: UniversalSlidesElement; app: SlidesApp; ctl: ChromeCtl; root: ShadowRoot }

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

/** Nome da apresentação, editável (vira o nome sugerido ao salvar). */
export const titleWidget = (env: WidgetEnv): BarItem => ({
  id: 'title',
  widget: (ctx) => {
    const input = document.createElement('input');
    input.className = 'uo-title';
    input.dataset['a'] = 'title';
    input.spellcheck = false;
    input.title = env.app.L.docTitle;
    input.setAttribute('aria-label', input.title);
    input.addEventListener('change', () => { env.el.documentName = input.value.trim(); ctx.after(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); ctx.after(); }
      if (e.key === 'Escape') { e.preventDefault(); input.value = env.app.title; input.blur(); ctx.after(); }
    });
    input.addEventListener('focus', () => input.select());
    return {
      el: input,
      sync: () => {
        const v = env.app.title;
        if (env.root.activeElement !== input && input.value !== v) input.value = v;
      },
    };
  },
});

/** Logo à esquerda (a altura das duas linhas na compacta, como o Google Slides). */
export const leadingWidget = (): BarItem => ({
  id: 'logo',
  widget: (ctx) => {
    const box = document.createElement('span');
    box.className = 'us-logo';
    box.title = 'Universal Slides';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Universal Slides');
    box.innerHTML = symbol(ic('slideshow'));
    void ctx;
    return { el: box };
  },
});

/** Seletor de fonte (o que o resolvedor único enxerga + a do texto selecionado). */
export const fontWidget = (env: WidgetEnv, width = 130): BarItem => ({
  id: 'font:family',
  widget: (ctx) => {
    const b = btn('uo-btn uo-drop uo-combo', 'font', t(ctx, L('Font', 'Fonte', 'Fuente')));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    const text = b.querySelector<HTMLElement>('.uo-drop-text');
    let families: string[] = [];
    const refresh = (): void => { void FontResolver.shared().listFamilies().then((f) => { families = f; }, () => {}); };
    refresh();
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      // Chromium: o 1º gesto no seletor pede a Local Font Access (lista completa)
      void FontResolver.shared().requestLocalAccess().then((ok) => { if (ok) refresh(); });
      const cur = env.el.getTextFormat()?.font ?? '';
      const list = cur && !families.includes(cur) ? [cur, ...families] : families;
      toggleMenu(b, () => list.map((f): MenuItem => ({
        id: `font:${f}`, label: f, checked: f === cur,
        onClick: () => { env.el.formatText({ font: f }); ctx.after(); },
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const f = env.el.getTextFormat();
        if (text) text.textContent = f?.font ?? '';
        b.disabled = !f;
      },
    };
  },
});

const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];

/** Tamanho da fonte: − [18] + (compacta) ou [18 ▾] (ribbon). */
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
    input.title = t(ctx, L('Font size', 'Tamanho da fonte', 'Tamaño de fuente'));
    input.setAttribute('aria-label', input.title);
    const dec = ctx.registry.text({ en: '.', pt: ',', es: ',' });
    const fmt = (n: number): string => String(Math.round(n * 10) / 10).replace('.', dec);
    const apply = (): void => {
      const v = parseFloat(input.value.replace(',', '.'));
      if (!isNaN(v) && v > 0) env.el.formatText({ size: v });
      ctx.after();
    };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
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
        toggleMenu(drop, () => SIZES.map((s): MenuItem => ({
          label: fmt(s), checked: input.value === fmt(s),
          onClick: () => { env.el.formatText({ size: s }); ctx.after(); },
        })), ctx);
      });
      wrap.append(input, drop);
    }
    return {
      el: wrap,
      sync: () => {
        const f = env.el.getTextFormat();
        if (env.root.activeElement !== input) input.value = f?.size ? fmt(f.size) : '';
        for (const x of wrap.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button')) x.disabled = !f;
      },
    };
  },
});

/** Botão "Apresentação de Slides" (do slide atual) com o menu de opções (destaque à direita). */
export const slideshowWidget = (env: WidgetEnv): BarItem => ({
  id: 'slideshow',
  widget: (ctx) => {
    const wrap = document.createElement('span');
    wrap.className = 'us-show';
    const main = btn('uo-pill uo-pill-primary us-show-main', 'show:current', ctx.registry.tooltip('show:current'));
    main.innerHTML = `${symbol(ic('slideshow'))}<span class="uo-lbl">${t(ctx, L('Slideshow', 'Apresentar', 'Presentar'))}</span>`;
    main.addEventListener('click', () => { void ctx.registry.run('show:current'); });
    const arrow = btn('uo-pill uo-pill-primary us-show-arrow', 'slideshow:menu', t(ctx, L('Slideshow options', 'Opções de apresentação', 'Opciones de presentación')));
    arrow.innerHTML = symbol('arrow_drop_down');
    arrow.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(wrap, ['show:start', 'show:current', '-', 'show:auto', '-', 'show:setup', 'slide:hide'], ctx); });
    wrap.append(main, arrow);
    return {
      el: wrap,
      sync: () => {
        const ok = env.el.getSlideCount() > 0;
        main.disabled = !ok;
        arrow.disabled = !ok;
      },
    };
  },
});

/** Zoom (texto "75%" ▾) da barra compacta. */
export const zoomItem = (env: WidgetEnv): BarItem => ({
  menu: () => zoomMenu(env),
  id: 'zoom', label: L('Zoom', 'Zoom', 'Zoom'), icon: 'zoom_in',
  text: () => `${Math.round(env.el.getZoom() * 100)}%`,
});

export const zoomMenu = (env: WidgetEnv): MenuEntry[] => [
  'zoomfit', '-',
  ...ZOOMS.map((z): MenuItem => ({
    id: `zoom:${z}`, label: `${z}%`, checked: !env.el.isZoomFit() && Math.round(env.el.getZoom() * 100) === z,
    onClick: () => env.el.setZoom(z / 100),
  })),
  '-', 'zoomin', 'zoomout',
];

/** Grade de cores do Office + "sem" (preenchimento/contorno) ou "automático". */
function colorMenu(ctx: BarContext, current: () => string | undefined, pick: (c: string) => void, extra: MenuEntry[]): MenuEntry[] {
  return [
    ...extra,
    ...(extra.length ? ['-'] as MenuEntry[] : []),
    {
      content: (close) => colorGrid({
        colors: OFFICE_COLORS.map((c) => ({ value: c, css: `#${c}` })),
        selected: current()?.replace('#', ''), close,
        onPick: (c) => { pick(`#${c}`); ctx.after(); },
      }),
    },
  ];
}

export const fontColorMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] =>
  colorMenu(ctx, () => env.el.getTextFormat()?.color, (c) => env.el.formatText({ color: c }), []);

export const fillMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] =>
  colorMenu(ctx, () => undefined, (c) => env.el.setShapeFill(c), ['shape:noFill']);

export const outlineMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] =>
  colorMenu(ctx, () => undefined, (c) => env.el.setShapeOutline(c), ['shape:noOutline']);

export const backgroundMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [
  ...colorMenu(ctx, () => undefined, (c) => env.el.setSlideBackground(c), ['slide:resetBackground']),
  '-',
  {
    id: 'background:all', label: L('Apply current background to all', 'Aplicar este plano de fundo a todos', 'Aplicar este fondo a todas'), icon: 'done_all',
    onClick: () => {
      const bg = env.el.getSlideBackgroundColor();
      env.el.setSlideBackground(bg, 'all');
      ctx.after();
    },
  },
];

/** Layouts da apresentação: `new` = Novo slide com o layout; senão troca o layout do slide atual. */
export const layoutMenu = (env: WidgetEnv, ctx: BarContext, kind: 'new' | 'change'): MenuEntry[] => {
  const cur = env.el.getSlideLayout();
  const layouts = env.el.getLayouts();
  const masters = new Set(layouts.map((l) => l.master));
  return layouts.map((l): MenuItem => ({
    id: `layout:${kind}:${l.path}`,
    label: masters.size > 1 ? `${l.name} (${l.master.split('/').pop()!.replace(/\.xml$/, '')})` : l.name,
    icon: ic('dashboard'),
    checked: kind === 'change' && l.path === cur,
    onClick: () => { if (kind === 'new') env.el.addSlide(l.path); else env.el.setSlideLayout(l.path); ctx.after(); },
  }));
};

/** Desenha a geometria predefinida numa miniatura. */
function drawPreset(c: HTMLCanvasElement, prst: string, size: number): void {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = c.style.height = `${size}px`;
  const g = c.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.strokeStyle = 'currentColor';
  g.lineWidth = 1.4;
  const pad = 3, w = size - pad * 2, h = size - pad * 2;
  if (prst === 'line') { g.beginPath(); g.moveTo(pad, size - pad); g.lineTo(size - pad, pad); g.stroke(); return; }
  const geo = evalPreset(prst, w, h);
  g.beginPath();
  for (const sub of geo?.subs ?? []) {
    for (const s of sub) {
      if (s.c === 'M') g.moveTo(pad + s.x, pad + s.y);
      else if (s.c === 'L') g.lineTo(pad + s.x, pad + s.y);
      else if (s.c === 'C') g.bezierCurveTo(pad + s.x1, pad + s.y1, pad + s.x2, pad + s.y2, pad + s.x, pad + s.y);
      else if (s.c === 'Q') g.quadraticCurveTo(pad + s.x1, pad + s.y1, pad + s.x, pad + s.y);
      else if (s.c === 'E') g.ellipse(pad + s.cx, pad + s.cy, s.rx, s.ry, 0, s.a0, s.a1, !!s.ccw);
      else if (s.c === 'Z') g.closePath();
    }
  }
  g.stroke();
}

/** Inserir › Formas: a grade das geometrias (como a galeria Formas do app). */
export const shapesMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const grid = document.createElement('div');
    grid.className = 'us-shapes';
    for (const prst of INSERTABLE_SHAPES) {
      const label = t(ctx, SHAPE_LABELS[prst] ?? L(prst, prst, prst));
      const b = btn('uo-btn us-shape-tile', `shape:${prst}`, label);
      const c = document.createElement('canvas');
      drawPreset(c, prst, 24);
      b.appendChild(c);
      b.addEventListener('click', () => { close(); env.el.insertShape(prst); ctx.after(); });
      grid.appendChild(b);
    }
    return grid;
  },
}];

/** Galeria de transições (guia Transições / menu Slide › Transição). */
export const transitionGallery = (env: WidgetEnv, ctx: BarContext): GalleryConfig => ({
  id: 'transition:gallery',
  label: L('Transition to This Slide', 'Transição para Este Slide', 'Transición a esta diapositiva'),
  icon: ic('transition_fade'),
  items: () => TRANSITION_TYPES.map((tp) => ({ id: tp, label: TRANSITION_LABELS[tp]! })),
  render: (tile, item) => {
    tile.classList.add('us-tr-tile');
    tile.innerHTML = `${symbol(item.id === 'none' ? ic('block') : ic('transition_fade'), 'uo-ic us-tr-ic')}<span class="us-tr-lbl"></span>`;
    const lbl = tile.querySelector('.us-tr-lbl');
    if (lbl) lbl.textContent = ctx.registry.text(item.label);
  },
  selected: () => env.el.getSlideTransition()?.type ?? 'none',
  onPick: (id) => {
    const cur = env.el.getSlideTransition();
    if (id === 'none' && !cur?.advanceAfterMs && cur?.advanceOnClick !== false) env.el.setSlideTransition(null);
    else env.el.setSlideTransition({ ...(cur ?? {}), type: id, dir: defaultDir(id) });
  },
  isEnabled: () => env.el.getSlideCount() > 0,
  tile: { w: 74, h: 58 },
  maxCols: 8,
  minCols: 3,
  expandCols: 6,
});

/** Opções de efeito (direção) da transição atual. */
export const directionMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const cur = env.el.getSlideTransition();
  const type = cur?.type ?? 'none';
  const set = (dir: string): void => { env.el.setSlideTransition({ ...(cur ?? { type }), dir }); ctx.after(); };
  const dirs: [string, { en: string; pt: string; es: string }][] = type === 'split'
    ? [['out', L('Vertical Out', 'Vertical para Fora', 'Vertical hacia fuera')], ['in', L('Vertical In', 'Vertical para Dentro', 'Vertical hacia dentro')]]
    : [['u', L('From Bottom', 'De Baixo', 'Desde abajo')], ['l', L('From Right', 'Da Direita', 'Desde la derecha')], ['d', L('From Top', 'De Cima', 'Desde arriba')], ['r', L('From Left', 'Da Esquerda', 'Desde la izquierda')]];
  if (!['push', 'wipe', 'cover', 'pull', 'split'].includes(type)) return [{ label: L('No effect options for this transition', 'Esta transição não tem opções de efeito', 'Esta transición no tiene opciones de efectos'), disabled: true }];
  return dirs.map(([d, label]): MenuItem => ({ id: `transition:dir:${d}`, label, checked: (cur?.dir ?? defaultDir(type)) === d, onClick: () => set(d) }));
};

/** Velocidade da transição atual (rápida/média/lenta, a `spd` do arquivo). */
export const speedMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => {
  const cur = env.el.getSlideTransition();
  return ([['fast', L('Fast', 'Rápida', 'Rápida')], ['med', L('Medium', 'Média', 'Media')], ['slow', L('Slow', 'Lenta', 'Lenta')]] as const).map(([s, label]): MenuItem => ({
    id: `transition:speed:${s}`, label, checked: (cur?.speed ?? 'fast') === s,
    disabled: !cur || cur.type === 'none',
    onClick: () => { if (cur) env.el.setSlideTransition({ ...cur, speed: s }); ctx.after(); },
  }));
};

/** Menu Slide › Transição (compacta): galeria em lista + opções. */
export const transitionMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [
  ...TRANSITION_TYPES.map((tp) => `transition:${tp}`),
  '-',
  { id: 'transition:dirMenu', label: L('Effect options', 'Opções de efeito', 'Opciones de efectos'), icon: 'tune', submenu: () => directionMenu(env, ctx) },
  { id: 'transition:speedMenu', label: L('Speed', 'Velocidade', 'Velocidad'), icon: ic('timer'), submenu: () => speedMenu(env, ctx) },
  'transition:onClick', 'transition:after', '-', 'transition:applyAll', 'transition:preview',
];

/** "Após" N segundos (guia Transições › Intervalo): caixa numérica. */
export const advanceWidget = (env: WidgetEnv): BarItem => ({
  id: 'transition:afterField',
  widget: (ctx) => {
    const wrap = document.createElement('label');
    wrap.className = 'uo-spin us-after';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.dataset['a'] = 'transition:afterCheck';
    const span = document.createElement('span');
    span.textContent = t(ctx, L('After:', 'Após:', 'Después de:'));
    const box = document.createElement('span');
    box.className = 'uo-spin-box';
    const input = document.createElement('input');
    input.className = 'uo-spin-in';
    input.inputMode = 'decimal';
    input.style.width = '56px';
    input.dataset['a'] = 'transition:afterSeconds';
    input.title = t(ctx, L('Advance the slide after this many seconds', 'Avançar o slide após estes segundos', 'Avanzar la diapositiva después de estos segundos'));
    box.appendChild(input);
    const dec = ctx.registry.text({ en: '.', pt: ',', es: ',' });
    const apply = (on: boolean, secs: number): void => {
      const cur = env.el.getSlideTransition() ?? { type: 'none' };
      const next = { ...cur };
      if (on) next.advanceAfterMs = Math.max(0, Math.round(secs * 1000)); else delete next.advanceAfterMs;
      env.el.setSlideTransition(next);
      ctx.after();
    };
    chk.addEventListener('change', () => apply(chk.checked, parseFloat(input.value.replace(',', '.')) || 0));
    input.addEventListener('change', () => { const v = parseFloat(input.value.replace(',', '.')); if (!isNaN(v)) apply(true, v); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.dispatchEvent(new Event('change')); } });
    wrap.append(chk, span, box);
    return {
      el: wrap,
      sync: () => {
        const cur = env.el.getSlideTransition();
        const ms = cur?.advanceAfterMs;
        chk.checked = ms !== undefined;
        if (env.root.activeElement !== input) input.value = ms !== undefined ? String(Math.round(ms / 10) / 100).replace('.', dec) : '';
        const ok = env.el.getSlideCount() > 0;
        chk.disabled = !ok;
        input.disabled = !ok;
      },
    };
  },
});

/** Exibir › Tema: seguir a página, automático (SO), claro, escuro. */
export const themeMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [
  {
    id: 'theme:page', label: L('Follow the page', 'Seguir a página', 'Seguir la página'), icon: 'web_asset',
    checked: env.ctl.themeMode() === null, onClick: () => { env.ctl.setThemeMode(null); ctx.after(); },
  },
  '-',
  ...([['auto', 'Automatic', 'Automático', 'Automático', 'brightness_auto'], ['light', 'Light', 'Claro', 'Claro', 'light_mode'], ['dark', 'Dark', 'Escuro', 'Oscuro', 'dark_mode']] as const)
    .map(([m, en, pt, es, icon]): MenuItem => ({
      id: `theme:${m}`, label: { en, pt, es }, icon, checked: env.ctl.themeMode() === m,
      onClick: () => { env.ctl.setThemeMode(m); ctx.after(); },
    })),
];
