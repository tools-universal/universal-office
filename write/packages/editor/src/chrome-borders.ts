// Bordas das barras do Write: estilos de linha com amostra desenhada (caneta,
// Estilos de Borda e o diálogo), o diálogo Bordas e Sombreamento (guias
// Bordas, Borda da Página e Sombreamento) e os padrões de sombreamento.
// Textos { en, pt } (inglês por padrão); medidas em pt, como o Word.
import { colorGrid, dialogTabs, openDialog, openMenu, pickLabels, symbol, themePaletteColors, parseThemePick, STANDARD_COLORS, type UiLang } from '@universal-office/ui';
import type { BorderSpec, PageBorders } from '@universal-office/docx-core';
import type { DialogEnv } from './chrome-dialogs.js';

const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

/** Estilos de linha de borda (w:val) na ordem da lista do Word. */
export const BORDER_STYLES: [string, string, string][] = [
  ['single', 'Single', 'Simples'], ['dotted', 'Dotted', 'Pontilhada'], ['dashSmallGap', 'Dashed (small gap)', 'Tracejada (intervalo curto)'],
  ['dashed', 'Dashed', 'Tracejada'], ['dotDash', 'Dash dot', 'Traço e ponto'], ['dotDotDash', 'Dash dot dot', 'Traço e dois pontos'],
  ['double', 'Double', 'Dupla'], ['triple', 'Triple', 'Tripla'],
  ['thinThickSmallGap', 'Thin-thick (small gap)', 'Fina-grossa (intervalo pequeno)'], ['thickThinSmallGap', 'Thick-thin (small gap)', 'Grossa-fina (intervalo pequeno)'],
  ['thinThickThinSmallGap', 'Thin-thick-thin (small gap)', 'Fina-grossa-fina (intervalo pequeno)'],
  ['thinThickMediumGap', 'Thin-thick (medium gap)', 'Fina-grossa (intervalo médio)'], ['thickThinMediumGap', 'Thick-thin (medium gap)', 'Grossa-fina (intervalo médio)'],
  ['thinThickThinMediumGap', 'Thin-thick-thin (medium gap)', 'Fina-grossa-fina (intervalo médio)'],
  ['thinThickLargeGap', 'Thin-thick (large gap)', 'Fina-grossa (intervalo grande)'], ['thickThinLargeGap', 'Thick-thin (large gap)', 'Grossa-fina (intervalo grande)'],
  ['thinThickThinLargeGap', 'Thin-thick-thin (large gap)', 'Fina-grossa-fina (intervalo grande)'],
  ['wave', 'Wave', 'Ondulada'], ['doubleWave', 'Double wave', 'Ondulada dupla'], ['dashDotStroked', 'Dash dot stroked', 'Traço e ponto inclinado'],
  ['threeDEmboss', '3-D emboss', 'Relevo 3D'], ['threeDEngrave', '3-D engrave', 'Baixo relevo 3D'], ['outset', 'Outset', 'Alto relevo'], ['inset', 'Inset', 'Baixo relevo'],
];

/** Espessuras (w:sz em oitavos de pt) e o rótulo em pt. */
export const BORDER_WIDTHS: [number, string][] = [[2, '¼'], [4, '½'], [6, '¾'], [8, '1'], [12, '1½'], [18, '2¼'], [24, '3'], [36, '4½'], [48, '6']];

/**
 * Amostra de um estilo de borda em SVG (faixas como o motor as pinta: fina,
 * vão e grossa; tracejados em múltiplos da espessura; ondas).
 */
export function borderSampleSvg(val: string, color = 'currentColor', w = 120, h = 14): string {
  const y = h / 2;
  const line = (yy: number, sw: number, dash = '', stroke = color): string =>
    `<line x1="2" y1="${yy}" x2="${w - 2}" y2="${yy}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const bands = (spec: [number, number][]): string => {
    // [espessura, vão depois] de cima para baixo, centrado
    const total = spec.reduce((a, [t, g]) => a + t + g, 0);
    let yy = y - total / 2;
    return spec.map(([t, g]) => { const s = line(yy + t / 2, t); yy += t + g; return s; }).join('');
  };
  let body: string;
  switch (val) {
    case 'dotted': body = line(y, 1.5, '1.5 1.5'); break;
    case 'dashSmallGap': body = line(y, 1.5, '5 1.5'); break;
    case 'dashed': body = line(y, 1.5, '6 3'); break;
    case 'dotDash': body = line(y, 1.5, '6 2 1.5 2'); break;
    case 'dotDotDash': body = line(y, 1.5, '6 2 1.5 2 1.5 2'); break;
    case 'dashDotStroked': body = line(y, 2, '7 2 2 2'); break;
    case 'double': body = bands([[1, 2], [1, 0]]); break;
    case 'triple': body = bands([[1, 1.5], [1, 1.5], [1, 0]]); break;
    case 'thinThickSmallGap': body = bands([[1, 1], [2.5, 0]]); break;
    case 'thickThinSmallGap': body = bands([[2.5, 1], [1, 0]]); break;
    case 'thinThickThinSmallGap': body = bands([[1, 1], [2.5, 1], [1, 0]]); break;
    case 'thinThickMediumGap': body = bands([[1, 2], [2.5, 0]]); break;
    case 'thickThinMediumGap': body = bands([[2.5, 2], [1, 0]]); break;
    case 'thinThickThinMediumGap': body = bands([[1, 2], [2.5, 2], [1, 0]]); break;
    case 'thinThickLargeGap': body = bands([[1, 3.5], [2.5, 0]]); break;
    case 'thickThinLargeGap': body = bands([[2.5, 3.5], [1, 0]]); break;
    case 'thinThickThinLargeGap': body = bands([[1, 3], [2.5, 3], [1, 0]]); break;
    case 'wave': case 'doubleWave': {
      const wave = (yy: number): string => {
        let d = `M2 ${yy}`;
        for (let x = 2; x < w - 2; x += 6) d += ` q1.5 -2.5 3 0 q1.5 2.5 3 0`;
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>`;
      };
      body = val === 'wave' ? wave(y) : wave(y - 2) + wave(y + 2);
      break;
    }
    case 'threeDEmboss': body = line(y - 1.5, 1.5, '', '#c0c0c0') + line(y, 1.5, '', '#606060') + line(y + 1.5, 1.5); break;
    case 'threeDEngrave': body = line(y - 1.5, 1.5) + line(y, 1.5, '', '#606060') + line(y + 1.5, 1.5, '', '#c0c0c0'); break;
    case 'outset': body = line(y - 1, 1, '', '#c0c0c0') + line(y + 0.5, 2); break;
    case 'inset': body = line(y - 1, 2) + line(y + 1, 1, '', '#c0c0c0'); break;
    case 'thick': body = line(y, 3); break;
    default: body = line(y, 1);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

/** Padrões de sombreamento (w:shd w:val) na ordem do Word. */
export const SHADING_PATTERNS: [string, string, string][] = [
  ['clear', 'Clear', 'Limpar'], ['solid', 'Solid (100%)', 'Sólido (100%)'],
  ...[5, 10, 12.5, 15, 20, 25, 30, 35, 37.5, 40, 45, 50, 55, 60, 62.5, 65, 70, 75, 80, 85, 87.5, 90, 95].map((n): [string, string, string] =>
    [`pct${Math.floor(n)}`, `${n}%`, `${String(n).replace('.', ',')}%`]),
  ['horzStripe', 'Dark Horizontal', 'Horizontal escuro'], ['vertStripe', 'Dark Vertical', 'Vertical escuro'],
  ['reverseDiagStripe', 'Dark Down Diagonal', 'Diagonal para baixo escura'], ['diagStripe', 'Dark Up Diagonal', 'Diagonal para cima escura'],
  ['horzCross', 'Dark Grid', 'Grade escura'], ['diagCross', 'Dark Trellis', 'Treliça escura'],
  ['thinHorzStripe', 'Light Horizontal', 'Horizontal claro'], ['thinVertStripe', 'Light Vertical', 'Vertical claro'],
  ['thinReverseDiagStripe', 'Light Down Diagonal', 'Diagonal para baixo clara'], ['thinDiagStripe', 'Light Up Diagonal', 'Diagonal para cima clara'],
  ['thinHorzCross', 'Light Grid', 'Grade clara'], ['thinDiagCross', 'Light Trellis', 'Treliça clara'],
];

// ───────────────────────── peças do diálogo ─────────────────────────

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const section = (title: string, ...kids: Node[]): HTMLElement =>
  el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, title), ...kids);
const sel = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { name });
  for (const [v, t] of opts) s.append(el('option', { value: v, selected: v === value }, t));
  return s;
};

/** Cor escolhida: hex ("auto" = automática) e, se do tema, a referência. */
export interface Pick { hex: string; themeColor?: string; tint?: string; shade?: string }

/** Botão de cor que abre a paleta do tema + padrão (+ Automática/Sem Cor). */
export function colorButton(env: DialogEnv, value: Pick, autoLabel: string): { el: HTMLElement; value: () => Pick; onChange: (f: () => void) => void } {
  let cur = value;
  let changed = (): void => {};
  const swatch = el('span', { style: 'display:inline-block;width:28px;height:14px;border:1px solid currentColor;border-radius:2px' });
  const text = el('span', {});
  const btn = el('button', { type: 'button', className: 'uo-pill', style: 'display:inline-flex;align-items:center;gap:8px;min-width:150px' }, swatch, text, '▾');
  const paint = (): void => {
    const auto = cur.hex === 'auto';
    swatch.style.background = auto ? 'transparent' : `#${cur.hex}`;
    text.textContent = auto ? autoLabel : `#${cur.hex}`;
  };
  paint();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const r = btn.getBoundingClientRect();
    const colors = env.ed.documentThemeColors();
    openMenu([
      { id: 'clr:auto', label: autoLabel, icon: 'format_color_reset', onClick: () => { cur = { hex: 'auto' }; paint(); changed(); } },
      '-',
      {
        content: (close) => colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => {
            const p = parseThemePick(v, colors);
            cur = p ? { hex: p.hex, themeColor: p.themeColor, tint: p.tint, shade: p.shade } : { hex: v.replace(/^#/, '').toUpperCase() };
            paint(); changed();
          },
        }),
      },
    ], { x: r.left, y: r.bottom + 2 }, { lang: env.lang, layer: env.layer });
  });
  return { el: btn, value: () => cur, onChange: (f) => { changed = f; } };
}

/** Lista de estilos de linha com as amostras (listbox). */
function styleList(lang: UiLang, value: string): { el: HTMLElement; value: () => string; onChange: (f: () => void) => void } {
  let cur = value;
  let changed = (): void => {};
  const box = el('div', { style: 'display:flex;flex-direction:column;max-height:180px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px', tabIndex: 0 });
  box.setAttribute('role', 'listbox');
  const items: HTMLElement[] = [];
  const all: [string, string][] = [['none', tr(lang, '(none)', '(nenhuma)')], ...BORDER_STYLES.map(([v, en, pt]): [string, string] => [v, tr(lang, en, pt)])];
  for (const [v, label] of all) {
    const it = el('div', { title: label, style: 'padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;align-items:center;min-height:18px' });
    it.setAttribute('role', 'option');
    it.dataset['v'] = v;
    if (v === 'none') it.textContent = label; else it.innerHTML = borderSampleSvg(v);
    it.addEventListener('click', () => { cur = v; sync(); changed(); });
    items.push(it);
    box.append(it);
  }
  const sync = (): void => {
    for (const it of items) {
      const on = it.dataset['v'] === cur;
      it.style.background = on ? 'color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)' : '';
      it.setAttribute('aria-selected', String(on));
    }
  };
  box.addEventListener('keydown', (e) => {
    const i = all.findIndex(([v]) => v === cur);
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    cur = all[Math.max(0, Math.min(all.length - 1, i + d))]![0];
    sync(); changed();
    items[all.findIndex(([v]) => v === cur)]!.scrollIntoView({ block: 'nearest' });
  });
  sync();
  queueMicrotask(() => items[all.findIndex(([v]) => v === cur)]?.scrollIntoView({ block: 'nearest' }));
  return { el: box, value: () => cur, onChange: (f) => { changed = f; } };
}

type Side = 'top' | 'left' | 'bottom' | 'right' | 'insideH' | 'insideV';

/**
 * Visualização clicável: um quadro com os lados (e as linhas internas, na
 * tabela); clicar num lado põe/tira a linha atual (como no Word).
 */
function preview(sides: Side[], state: Map<Side, BorderSpec | null>, onToggle: (s: Side) => void): { el: HTMLElement; paint: () => void } {
  const W = 180, H = 140, P = 22;
  const host = el('div', { style: `position:relative;width:${W}px;height:${H}px;background:#fff;border-radius:6px;color:#000` });
  const svgBox = el('div', { style: 'position:absolute;inset:0' });
  host.append(svgBox);
  const hit = (s: Side, css: string): void => {
    const b = el('button', { type: 'button', title: s, style: `position:absolute;${css};background:transparent;border:0;cursor:pointer;padding:0` });
    b.addEventListener('click', () => onToggle(s));
    host.append(b);
  };
  hit('top', `left:${P}px;top:${P - 8}px;width:${W - 2 * P}px;height:16px`);
  hit('bottom', `left:${P}px;top:${H - P - 8}px;width:${W - 2 * P}px;height:16px`);
  hit('left', `left:${P - 8}px;top:${P}px;width:16px;height:${H - 2 * P}px`);
  hit('right', `left:${W - P - 8}px;top:${P}px;width:16px;height:${H - 2 * P}px`);
  if (sides.includes('insideH')) hit('insideH', `left:${P + 10}px;top:${H / 2 - 8}px;width:${W - 2 * P - 20}px;height:16px`);
  if (sides.includes('insideV')) hit('insideV', `left:${W / 2 - 8}px;top:${P + 10}px;width:16px;height:${H - 2 * P - 20}px`);
  const paint = (): void => {
    const ln = (s: Side, x1: number, y1: number, x2: number, y2: number): string => {
      const b = state.get(s);
      if (!b || b.val === 'nil' || b.val === 'none') return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#bbb" stroke-dasharray="2 3"/>`;
      const c = b.color && b.color !== 'auto' ? `#${b.color}` : '#000';
      const sw = Math.max(1, (b.sz ?? 4) / 8 * 1.333);
      const dash = /dot|dash/i.test(b.val) ? ` stroke-dasharray="${sw * 2} ${sw * 1.5}"` : '';
      const dbl = /double|thin|thick|triple/i.test(b.val) && b.val !== 'thick';
      if (!dbl) return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"${dash}/>`;
      const dx = y1 === y2 ? 0 : 2, dy = y1 === y2 ? 2 : 0;
      return `<line x1="${x1 - dx}" y1="${y1 - dy}" x2="${x2 - dx}" y2="${y2 - dy}" stroke="${c}"/><line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y2 + dy}" stroke="${c}"/>`;
    };
    // texto de amostra (linhas cinza) dentro do quadro
    let txt = '';
    for (let yy = P + 12; yy < H - P - 6; yy += 8) txt += `<line x1="${P + 10}" y1="${yy}" x2="${W - P - 10}" y2="${yy}" stroke="#d8d8d8" stroke-width="3"/>`;
    svgBox.innerHTML = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${txt}`
      + ln('top', P, P, W - P, P) + ln('bottom', P, H - P, W - P, H - P) + ln('left', P, P, P, H - P) + ln('right', W - P, P, W - P, H - P)
      + (sides.includes('insideH') ? ln('insideH', P, H / 2, W - P, H / 2) : '')
      + (sides.includes('insideV') ? ln('insideV', W / 2, P, W / 2, H - P) : '')
      + '</svg>';
  };
  paint();
  return { el: host, paint };
}

/** Configurações (Nenhuma, Caixa, Todas, Grade, Sombra, 3D, Personalizado) como botões com ícone. */
function settings(lang: UiLang, opts: [string, string, string, string][], value: string): { el: HTMLElement; value: () => string; set: (v: string) => void; onChange: (f: (v: string) => void) => void } {
  let cur = value;
  let changed = (_v: string): void => {};
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:4px' });
  const btns = opts.map(([v, en, pt, icon]) => {
    const b = el('button', { type: 'button', className: 'uo-btn uo-btn-lbl', style: 'justify-content:flex-start;gap:8px;width:100%' });
    b.innerHTML = symbol(icon);
    b.append(tr(lang, en, pt));
    b.addEventListener('click', () => { cur = v; sync(); changed(v); });
    box.append(b);
    return [v, b] as const;
  });
  const sync = (): void => { for (const [v, b] of btns) b.classList.toggle('uo-on', v === cur); };
  sync();
  return { el: box, value: () => cur, set: (v) => { cur = v; sync(); }, onChange: (f) => { changed = f; } };
}

const BOX_ICON = 'border_outer', ALL_ICON = 'border_all', GRID_ICON = 'border_inner', NONE_ICON = 'border_clear', SHADOW_ICON = 'filter_none', THREE_D_ICON = 'view_in_ar', CUSTOM_ICON = 'edit';

// ───────────────────────── o diálogo ─────────────────────────

/** Bordas e Sombreamento (guias Bordas, Borda da Página e Sombreamento). */
export async function bordersShadingDialog(env: DialogEnv, tab: 'borders' | 'page' | 'shading' = 'borders'): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const ts = ed.getTableState();
  const inTable = !!ts;
  const autoLbl = tr(lang, 'Automatic', 'Automático');
  const pen0 = ed.getBorderPen();

  // ── Bordas (tabela/célula/parágrafo) ──
  const applyOpts: [string, string][] = [
    ...(inTable ? [['cell', tr(lang, 'Cell', 'Célula')], ['table', tr(lang, 'Table', 'Tabela')]] as [string, string][] : []),
    ['paragraph', tr(lang, 'Paragraph', 'Parágrafo')],
  ];
  const applyTo = sel('b-apply', applyOpts, inTable ? (ts!.cells ? 'cell' : 'table') : 'paragraph');
  const bState = new Map<Side, BorderSpec | null>();
  const bStyle = styleList(lang, pen0.val ?? 'single');
  const bColor = colorButton(env, { hex: pen0.color ?? 'auto', themeColor: pen0.themeColor, tint: pen0.themeTint, shade: pen0.themeShade }, autoLbl);
  const bWidth = sel('b-width', BORDER_WIDTHS.map(([sz, t]) => [String(sz), `${t} pt`]), String(pen0.sz ?? 4));
  const pen = (): BorderSpec | null => {
    const v = bStyle.value();
    if (v === 'none') return null;
    const c = bColor.value();
    return { val: v, sz: +bWidth.value, space: 0, color: c.hex, ...(c.themeColor ? { themeColor: c.themeColor } : {}), ...(c.tint ? { themeTint: c.tint } : {}), ...(c.shade ? { themeShade: c.shade } : {}) };
  };
  const sidesFor = (): Side[] => (applyTo.value === 'paragraph' ? ['top', 'left', 'bottom', 'right'] : ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']);
  const touched = new Set<Side>();
  const bPrev = (): ReturnType<typeof preview> => preview(sidesFor(), bState, (s) => {
    const cur = bState.get(s);
    bState.set(s, cur && cur.val !== 'nil' ? null : pen());
    touched.add(s);
    bSet.set('custom');
    bPv.paint();
  });
  let bPv = bPrev();
  const pvHost = el('div', {}, bPv.el);
  const tableSettings: [string, string, string, string][] = [['none', 'None', 'Nenhuma', NONE_ICON], ['box', 'Box', 'Caixa', BOX_ICON], ['all', 'All', 'Todas', ALL_ICON], ['grid', 'Grid', 'Grade', GRID_ICON], ['custom', 'Custom', 'Personalizado', CUSTOM_ICON]];
  const paraSettings: [string, string, string, string][] = [['none', 'None', 'Nenhuma', NONE_ICON], ['box', 'Box', 'Caixa', BOX_ICON], ['shadow', 'Shadow', 'Sombra', SHADOW_ICON], ['custom', 'Custom', 'Personalizado', CUSTOM_ICON]];
  const setHost = el('div', {});
  let bSet = settings(lang, inTable ? tableSettings : paraSettings, 'custom');
  setHost.append(bSet.el);
  const applySetting = (v: string): void => {
    const p = pen();
    const all = sidesFor();
    for (const s of all) touched.add(s);
    const thick = p ? { ...p, sz: Math.max(p.sz ?? 4, 12) } : null;
    for (const s of all) {
      const inner = s === 'insideH' || s === 'insideV';
      bState.set(s, v === 'none' ? null : v === 'box' || v === 'shadow' ? (inner ? null : p && v === 'shadow' ? { ...p, shadow: true } : p)
        : v === 'all' ? p : v === 'grid' ? (inner ? p : thick) : bState.get(s) ?? null);
    }
    bPv.paint();
  };
  bSet.onChange(applySetting);
  const loadCurrent = (): void => {
    bState.clear();
    touched.clear();
    if (applyTo.value === 'paragraph') {
      const pb = ed.getParagraphBorders();
      for (const s of ['top', 'left', 'bottom', 'right'] as const) bState.set(s, pb[s] ?? null);
    } else {
      // as bordas efetivas: as do estilo, as diretas da tabela e (na célula) as da célula
      const tb = { ...(ts!.styleBorders ?? {}), ...(ts!.tblPr.tblBorders ?? {}) };
      const b = applyTo.value === 'table' ? tb : { ...tb, ...(ts!.tcPr.tcBorders ?? {}) };
      for (const s of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const) bState.set(s, (b as Record<string, BorderSpec | undefined>)[s] ?? null);
    }
  };
  loadCurrent();
  applyTo.addEventListener('change', () => {
    loadCurrent();
    const ns = settings(lang, applyTo.value === 'paragraph' ? paraSettings : tableSettings, 'custom');
    ns.onChange(applySetting);
    setHost.replaceChildren(ns.el);
    bSet = ns;
    bPv = bPrev();
    pvHost.replaceChildren(bPv.el);
  });
  const bordersTab = el('div', { style: 'display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start' },
    section(tr(lang, 'Setting:', 'Definição:'), setHost),
    section(tr(lang, 'Style:', 'Estilo:'), bStyle.el,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Color:', 'Cor:'), bColor.el),
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Width:', 'Largura:'), bWidth)),
    section(tr(lang, 'Preview', 'Visualização'), el('div', { style: 'font-size:12px;opacity:.8;max-width:180px' },
      tr(lang, 'Click on the diagram to apply borders', 'Clique no diagrama para aplicar bordas')), pvHost,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Apply to:', 'Aplicar a:'), applyTo)));

  // ── Borda da Página ──
  const pb0 = ed.getPageBorders();
  const pgState = new Map<Side, BorderSpec | null>();
  for (const s of ['top', 'left', 'bottom', 'right'] as const) pgState.set(s, pb0?.[s] ?? null);
  const firstSide = pb0 ? (['top', 'left', 'bottom', 'right'] as const).map((s) => pb0[s]).find(Boolean) : undefined;
  const pStyle = styleList(lang, firstSide?.val ?? 'single');
  const pColor = colorButton(env, { hex: firstSide?.color ?? 'auto', themeColor: firstSide?.themeColor }, autoLbl);
  const pWidth = sel('p-width', BORDER_WIDTHS.map(([sz, t]) => [String(sz), `${t} pt`]), String(firstSide?.sz ?? 4));
  const pPen = (shadow = false): BorderSpec | null => {
    const v = pStyle.value();
    if (v === 'none') return null;
    const c = pColor.value();
    return { val: v, sz: +pWidth.value, space: 24, color: c.hex, ...(c.themeColor ? { themeColor: c.themeColor } : {}), ...(shadow ? { shadow: true } : {}) };
  };
  const pPv = preview(['top', 'left', 'bottom', 'right'], pgState, (s) => {
    const cur = pgState.get(s);
    pgState.set(s, cur ? null : pPen());
    pSet.set('custom');
    pPv.paint();
  });
  const pSet = settings(lang, [['none', 'None', 'Nenhuma', NONE_ICON], ['box', 'Box', 'Caixa', BOX_ICON], ['shadow', 'Shadow', 'Sombra', SHADOW_ICON],
    ['3d', '3-D', '3D', THREE_D_ICON], ['custom', 'Custom', 'Personalizado', CUSTOM_ICON]], pb0 ? (firstSide?.shadow ? 'shadow' : 'box') : 'none');
  pSet.onChange((v) => {
    for (const s of ['top', 'left', 'bottom', 'right'] as const) {
      const p = v === 'none' ? null : v === '3d' ? { ...(pPen() ?? { val: 'single', sz: 4 }), val: 'threeDEmboss', sz: Math.max(+pWidth.value, 6), space: 24 } : pPen(v === 'shadow');
      pgState.set(s, p);
    }
    pPv.paint();
  });
  const pApply = sel('p-apply', [['document', tr(lang, 'Whole document', 'Documento inteiro')], ['section', tr(lang, 'This section', 'Esta seção')]], 'document');
  const pDisplay = sel('p-display', [['allPages', tr(lang, 'All pages', 'Todas as páginas')], ['firstPage', tr(lang, 'First page only', 'Somente a primeira página')], ['notFirstPage', tr(lang, 'All except first page', 'Todas exceto a primeira página')]], pb0?.display ?? 'allPages');
  const pFrom = sel('p-from', [['page', tr(lang, 'Edge of page', 'Borda da página')], ['text', tr(lang, 'Text', 'Texto')]], pb0?.offsetFrom ?? 'page');
  const pTop = el('input', { type: 'number', name: 'p-top', min: '0', max: '31', value: String(pb0?.top?.space ?? 24), style: 'width:64px' });
  const pBottom = el('input', { type: 'number', name: 'p-bottom', min: '0', max: '31', value: String(pb0?.bottom?.space ?? 24), style: 'width:64px' });
  const pLeft = el('input', { type: 'number', name: 'p-left', min: '0', max: '31', value: String(pb0?.left?.space ?? 24), style: 'width:64px' });
  const pRight = el('input', { type: 'number', name: 'p-right', min: '0', max: '31', value: String(pb0?.right?.space ?? 24), style: 'width:64px' });
  // medindo do texto, o Word propõe 1 pt em cima/embaixo e 4 pt dos lados
  pFrom.addEventListener('change', () => {
    const [tb, lr] = pFrom.value === 'text' ? ['1', '4'] : ['24', '24'];
    pTop.value = pBottom.value = tb; pLeft.value = pRight.value = lr;
  });
  const pFront = el('input', { type: 'checkbox', name: 'p-front', checked: pb0?.zOrder !== 'back' });
  const pageTab = el('div', { style: 'display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start' },
    section(tr(lang, 'Setting:', 'Definição:'), pSet.el),
    section(tr(lang, 'Style:', 'Estilo:'), pStyle.el,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Color:', 'Cor:'), pColor.el),
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Width:', 'Largura:'), pWidth)),
    section(tr(lang, 'Preview', 'Visualização'), pPv.el,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Apply to:', 'Aplicar a:'), pApply, pDisplay),
      section(tr(lang, 'Margin (pt) measured from', 'Margem (pt) medida a partir de'), pFrom,
        el('div', { className: 'uo-dialog-grid' },
          el('span', {}, tr(lang, 'Top:', 'Superior:')), pTop, el('span', {}, tr(lang, 'Bottom:', 'Inferior:')), pBottom,
          el('span', {}, tr(lang, 'Left:', 'Esquerda:')), pLeft, el('span', {}, tr(lang, 'Right:', 'Direita:')), pRight),
        el('label', { className: 'uo-check' }, pFront, tr(lang, 'Always display in front', 'Sempre exibir na frente')))));

  // ── Sombreamento ──
  const shdState = ts?.tcPr.shd;
  const fill = colorButton(env, { hex: shdState?.fill && shdState.fill !== 'auto' ? shdState.fill : 'auto', themeColor: shdState?.themeFill }, tr(lang, 'No Color', 'Sem Cor'));
  const patStyle = sel('s-pattern', SHADING_PATTERNS.map(([v, en, pt]): [string, string] => [v, tr(lang, en, pt)]), shdState?.val && shdState.val !== 'nil' ? shdState.val : 'clear');
  const patColor = colorButton(env, { hex: shdState?.color && shdState.color !== 'auto' ? shdState.color : 'auto' }, autoLbl);
  const sApply = sel('s-apply', applyOpts, inTable ? (ts!.cells ? 'cell' : 'table') : 'paragraph');
  const swatch = el('div', { style: 'width:180px;height:70px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 30%, transparent)' });
  const syncShd = (): void => {
    const para = sApply.value === 'paragraph';
    patStyle.disabled = para;
    patColor.el.toggleAttribute('disabled', para);
    const f = fill.value().hex, pc = patColor.value().hex;
    const bg = f === 'auto' ? '#ffffff' : `#${f}`;
    const fg = pc === 'auto' ? '#000000' : `#${pc}`;
    const v = para ? 'clear' : patStyle.value;
    const pct = v === 'solid' ? 100 : /^pct(\d+)/.test(v) ? +v.slice(3) + (v === 'pct12' || v === 'pct37' || v === 'pct62' || v === 'pct87' ? 0.5 : 0) : 0;
    swatch.style.background = pct ? `color-mix(in srgb, ${fg} ${pct}%, ${bg})` : v === 'clear' ? bg
      : `repeating-linear-gradient(${/vert/i.test(v) ? 90 : /diag/i.test(v) ? 45 : 0}deg, ${fg} 0 ${/thin/.test(v) ? 1 : 2}px, ${bg} ${/thin/.test(v) ? 1 : 2}px 4px)`;
  };
  for (const c of [fill, patColor]) c.onChange(syncShd);
  patStyle.addEventListener('change', syncShd);
  sApply.addEventListener('change', syncShd);
  syncShd();
  const shadingTab = el('div', { style: 'display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start' },
    el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Fill', 'Preenchimento'), fill.el),
      section(tr(lang, 'Patterns', 'Padrões'),
        el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Style:', 'Estilo:'), patStyle),
        el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Color:', 'Cor:'), patColor.el))),
    section(tr(lang, 'Preview', 'Visualização'), swatch,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Apply to:', 'Aplicar a:'), sApply)));

  const tabs = dialogTabs([
    { id: 'borders', label: tr(lang, 'Borders', 'Bordas'), body: bordersTab },
    { id: 'page', label: tr(lang, 'Page Border', 'Borda da Página'), body: pageTab },
    { id: 'shading', label: tr(lang, 'Shading', 'Sombreamento'), body: shadingTab },
  ], tab);
  const h = openDialog({
    title: tr(lang, 'Borders and Shading', 'Bordas e Sombreamento'), body: tabs.el, layer: env.layer, lang, width: 680,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }],
  });
  if ((await h.result) !== 'ok') return;

  // aplica o que mudou em cada guia (cada uma é um passo de desfazer, como no Word)
  if (touched.size) {
    const sides: Partial<Record<Side, BorderSpec | null>> = {};
    for (const s of touched) sides[s] = bState.get(s) ?? null;
    if (applyTo.value === 'paragraph') {
      const { insideH: _h, insideV: _v, ...ps } = sides;
      ed.setParagraphBorders(ps);
    } else ed.setTableBorderSides(sides, applyTo.value as 'cell' | 'table');
  }
  const pgSides = (['top', 'left', 'bottom', 'right'] as const).map((s) => [s, pgState.get(s)] as const).filter(([, b]) => !!b);
  const space = { top: +pTop.value, bottom: +pBottom.value, left: +pLeft.value, right: +pRight.value };
  const newPb: PageBorders | null = pgSides.length ? {
    ...(pFront.checked ? {} : { zOrder: 'back' as const }),
    ...(pDisplay.value !== 'allPages' ? { display: pDisplay.value as PageBorders['display'] } : {}),
    ...(pFrom.value === 'page' ? { offsetFrom: 'page' as const } : {}),
    ...Object.fromEntries(pgSides.map(([s, b]) => [s, { ...b!, space: space[s] }])),
  } : null;
  if (JSON.stringify(newPb) !== JSON.stringify(pb0 ?? null)) ed.setPageBorders(newPb, pApply.value as 'document' | 'section');
  const f = fill.value(), pv = patStyle.value, pc = patColor.value();
  const shdChanged = f.hex !== (shdState?.fill && shdState.fill !== 'auto' ? shdState.fill : 'auto') || pv !== (shdState?.val ?? 'clear') || pc.hex !== (shdState?.color && shdState.color !== 'auto' ? shdState.color : 'auto');
  if (shdChanged) {
    if (sApply.value === 'paragraph') ed.setShading(f.hex === 'auto' ? undefined : f.hex);
    else {
      const color = f.hex === 'auto' ? null : f.themeColor ? { themeColor: f.themeColor, tint: f.tint, shade: f.shade } : f.hex;
      ed.setCellShading(color, pv === 'clear' ? null : { val: pv, color: pc.hex }, sApply.value as 'cell' | 'table');
    }
  }
}
