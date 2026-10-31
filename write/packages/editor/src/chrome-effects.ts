// EFEITOS DE TEXTO E TIPOGRAFIA da guia Página Inicial: o botão com a galeria de modelos e
// os submenus Contorno, Sombra, Reflexo, Brilho, Estilos de Número, Ligaduras e Conjuntos
// Estilísticos; o painel Formatar Efeitos de Texto; e o submenu Gradiente da Cor da Fonte.
// Só DECLARA sobre a API pública do <universal-write> (setTextEffects, setOpenType,
// applyTextEffectPreset, setTextGradient).
import {
  colorGrid, openPane, paneOpen, pickLabels, themePaletteColors, parseThemePick, STANDARD_COLORS, tileGrid,
  type BarContext, type CommandRegistry, type Command, type MenuEntry, type UiLang,
} from '@universal-office/ui';
import type { FxColor, FxFill, TextEffects } from '@universal-office/docx-core';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import {
  TEXT_EFFECT_GALLERY, TEXT_SHADOW_PRESETS, TEXT_REFLECTION_PRESETS, TEXT_GLOW_SIZES, textGlow, OUTLINE_WEIGHTS,
  OUTLINE_DASHES, outline, GRADIENT_DIRECTIONS, NUMBER_STYLES_OT, LIGATURE_OPTIONS,
} from './text-effects-presets.js';

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });
const tr = (lang: UiLang, en: string, pt: string, es: string): string => pickLabels(lang, { en, pt, es });
type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};

/** Cor da paleta ("RRGGBB" ou "theme|slot|tint|shade") → cor w14 (tema com lumMod/lumOff). */
export function fxColorOf(value: string, colors: Record<string, string>): FxColor {
  const p = parseThemePick(value, colors);
  if (!p) return { rgb: value.replace(/^#/, '').toUpperCase() };
  const slot: Record<string, string> = { text1: 'tx1', background1: 'bg1', text2: 'tx2', background2: 'bg2', dark1: 'tx1', light1: 'bg1', dark2: 'tx2', light2: 'bg2' };
  const mods: [string, number][] = [];
  const frac = (h?: string): number | undefined => (h ? 1 - parseInt(h, 16) / 255 : undefined);
  const tint = frac(p.tint), shade = frac(p.shade);
  // (as variações do tema do Word: mais clara = lumMod + lumOff; mais escura = lumMod)
  if (tint !== undefined) { mods.push(['lumMod', Math.round((1 - tint) * 100000)], ['lumOff', Math.round(tint * 100000)]); }
  if (shade !== undefined) mods.push(['lumMod', Math.round((1 - shade) * 100000)]);
  return { scheme: slot[p.themeColor] ?? p.themeColor, ...(mods.length ? { mods } : {}) };
}

/** CSS de uma prévia do efeito (galeria e menus): cor/degradê, contorno, sombra, brilho. */
function fxCss(fx: TextEffects, colors: Record<string, string>): string {
  const hex = (c: FxColor): string => {
    const base = c.rgb ?? colors[{ tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' }[c.scheme ?? ''] ?? c.scheme ?? ''] ?? '000000';
    return `#${base}`;
  };
  const alpha = (c: FxColor): number => { const a = c.mods?.find(([k]) => k === 'alpha')?.[1]; return a !== undefined ? 1 - a / 100000 : 1; };
  const rgba = (c: FxColor): string => {
    const h = hex(c).slice(1);
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha(c)})`;
  };
  let css = '';
  const f = fx.fill;
  if (f?.type === 'solid') css += `color:${rgba(f.color)};`;
  else if (f?.type === 'grad') css += `background:linear-gradient(${(f.lin?.ang ?? 5400000) / 60000 + 90}deg,${f.stops.map((s) => `${rgba(s.color)} ${s.pos / 1000}%`).join(',')});-webkit-background-clip:text;background-clip:text;color:transparent;`;
  else if (f?.type === 'none') css += 'color:transparent;';
  if (fx.outline?.fill?.type === 'solid') css += `-webkit-text-stroke:${Math.max(0.5, (fx.outline.w ?? 9525) / 12700)}px ${rgba(fx.outline.fill.color)};`;
  const shadows: string[] = [];
  if (fx.shadow) {
    const a = (fx.shadow.dir / 60000) * (Math.PI / 180), d = (fx.shadow.dist / 12700) * 1.3;
    shadows.push(`${(Math.cos(a) * d).toFixed(1)}px ${(Math.sin(a) * d).toFixed(1)}px ${(fx.shadow.blurRad / 12700).toFixed(1)}px ${rgba(fx.shadow.color)}`);
  }
  if (fx.glow) shadows.push(`0 0 ${(fx.glow.rad / 12700).toFixed(1)}px ${rgba(fx.glow.color)}`, `0 0 ${(fx.glow.rad / 25400).toFixed(1)}px ${rgba(fx.glow.color)}`);
  if (shadows.length) css += `text-shadow:${shadows.join(',')};`;
  return css;
}

/** Botão Efeitos de Texto e Tipografia: a galeria e os submenus do Word. */
export function textEffectsMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const colors = ed.documentThemeColors();
  const after = (): void => ctx.after();
  return [
    {
      content: (close) => tileGrid({
        sections: [{ items: TEXT_EFFECT_GALLERY.map((p, i) => ({ id: String(i), label: p.label })) }],
        tile: { w: 44, h: 44 }, cols: 5, close, text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          const p = TEXT_EFFECT_GALLERY[Number(it.id)]!;
          b.replaceChildren(el('span', { textContent: 'A', style: `font:700 30px/1 Georgia, 'Times New Roman', serif;${fxCss(p.fx, colors)}` }));
        },
        onPick: (id) => { ed.applyTextEffectPreset(Number(id)); after(); },
      }),
    },
    '-',
    { id: 'fx:outlineMenu', label: L('Outline', 'Contorno', 'Contorno'), icon: 'border_color', submenu: () => outlineMenu(env, ctx) },
    { id: 'fx:shadowMenu', label: L('Shadow', 'Sombra', 'Sombra'), icon: 'opacity', submenu: () => shadowMenu(env, ctx) },
    { id: 'fx:reflectionMenu', label: L('Reflection', 'Reflexo', 'Reflejo'), icon: 'flip', submenu: () => reflectionMenu(env, ctx) },
    { id: 'fx:glowMenu', label: L('Glow', 'Brilho', 'Iluminado'), icon: 'auto_awesome', submenu: () => glowMenu(env, ctx) },
    { id: 'fx:numberMenu', label: L('Number Styles', 'Estilos de Número', 'Estilos de número'), icon: 'numbers', submenu: () => numberStylesMenu(env, ctx) },
    { id: 'fx:ligatureMenu', label: L('Ligatures', 'Ligaduras', 'Ligaduras'), icon: 'text_fields', submenu: () => ligaturesMenu(env, ctx) },
    { id: 'fx:setsMenu', label: L('Stylistic Sets', 'Conjuntos Estilísticos', 'Conjuntos estilísticos'), icon: 'format_shapes', submenu: () => stylisticSetsMenu(env, ctx) },
  ];
}

function paletteGrid(env: WidgetEnv, ctx: BarContext, onPick: (c: FxColor) => void): MenuEntry {
  const colors = env.ed.documentThemeColors();
  return {
    content: (close) => {
      const box = el('div', { className: 'uw-palette' });
      const h = (t: string): HTMLElement => el('div', { className: 'uo-tiles-h', textContent: t });
      box.append(
        h(ctx.registry.text(L('Theme Colors', 'Cores do Tema', 'Colores del tema'))),
        colorGrid({ colors: themePaletteColors(colors), columns: 10, close, onPick: (v) => { onPick(fxColorOf(v, colors)); ctx.after(); } }),
        h(ctx.registry.text(L('Standard Colors', 'Cores Padrão', 'Colores estándar'))),
        colorGrid({ colors: STANDARD_COLORS.map((x) => ({ value: x, css: `#${x}` })), columns: 10, close, onPick: (v) => { onPick(fxColorOf(v, colors)); ctx.after(); } }),
      );
      return box;
    },
  };
}

function outlineMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = (): TextEffects['outline'] => ed.textEffects().fx?.outline;
  const color = (): FxColor => (cur()?.fill?.type === 'solid' ? (cur()!.fill as Extract<FxFill, { type: 'solid' }>).color : { scheme: 'accent1' });
  return [
    paletteGrid(env, ctx, (c) => ed.setTextEffects({ outline: outline(c, (cur()?.w ?? 9525) / 12700, cur()?.dash ?? 'solid') })),
    { id: 'fx:noOutline', label: L('No Outline', 'Sem Contorno', 'Sin contorno'), icon: 'format_color_reset', onClick: () => { ed.setTextEffects({ outline: null }); ctx.after(); } },
    { id: 'fx:weight', label: L('Weight', 'Espessura', 'Grosor'), icon: 'line_weight', submenu: () => OUTLINE_WEIGHTS.map((w) => ({
      id: `fx:w:${w}`, label: `${String(w).replace('.', ctx.registry.text(L('.', ',', ',')))} pt`, checked: Math.abs((cur()?.w ?? -1) / 12700 - w) < 0.01,
      onClick: () => { ed.setTextEffects({ outline: outline(color(), w, cur()?.dash ?? 'solid') }); ctx.after(); },
    })) },
    { id: 'fx:dashes', label: L('Dashes', 'Traços', 'Guiones'), icon: 'line_style', submenu: () => OUTLINE_DASHES.map(([d, lbl]) => ({
      id: `fx:d:${d}`, label: lbl, checked: (cur()?.dash ?? '') === d,
      onClick: () => { ed.setTextEffects({ outline: outline(color(), (cur()?.w ?? 9525) / 12700, d) }); ctx.after(); },
    })) },
  ];
}

function shadowMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.shadow ?? null);
  const grid = (group: 'outer' | 'persp', label: { en: string; pt: string; es: string }): { label: { en: string; pt: string; es: string }; items: { id: string; label: { en: string; pt: string; es: string } }[] } =>
    ({ label, items: TEXT_SHADOW_PRESETS.filter((p) => p.group === group).map((p) => ({ id: p.id, label: p.label })) });
  return [
    { id: 'fx:noShadow', label: L('No Shadow', 'Sem Sombra', 'Sin sombra'), icon: 'cancel', checked: cur === 'null', onClick: () => { ed.setTextEffects({ shadow: null }); ctx.after(); } },
    {
      content: (close) => tileGrid({
        sections: [grid('outer', L('Outer', 'Externa', 'Exterior')), grid('persp', L('Perspective', 'Perspectiva', 'Perspectiva'))],
        tile: { w: 44, h: 44 }, cols: 3, close, text: (l) => ctx.registry.text(l),
        selected: TEXT_SHADOW_PRESETS.find((p) => JSON.stringify(p.shadow) === cur)?.id,
        render: (b, it) => {
          const p = TEXT_SHADOW_PRESETS.find((x) => x.id === it.id)!;
          b.replaceChildren(el('span', { textContent: 'A', style: `font:700 28px/1 Georgia, serif;${fxCss({ shadow: p.shadow }, ed.documentThemeColors())}` }));
        },
        onPick: (id) => { ed.setTextEffects({ shadow: TEXT_SHADOW_PRESETS.find((p) => p.id === id)!.shadow }); ctx.after(); },
      }),
    },
    '-', 'fx:pane',
  ];
}

function reflectionMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.reflection ?? null);
  return [
    { id: 'fx:noReflection', label: L('No Reflection', 'Sem Reflexo', 'Sin reflejo'), icon: 'cancel', checked: cur === 'null', onClick: () => { ed.setTextEffects({ reflection: null }); ctx.after(); } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L('Reflection Variations', 'Variações de Reflexo', 'Variaciones de reflejo'), items: TEXT_REFLECTION_PRESETS.map((p) => ({ id: p.id, label: p.label })) }],
        tile: { w: 52, h: 52 }, cols: 3, close, text: (l) => ctx.registry.text(l),
        selected: TEXT_REFLECTION_PRESETS.find((p) => JSON.stringify(p.reflection) === cur)?.id,
        render: (b, it) => {
          const p = TEXT_REFLECTION_PRESETS.find((x) => x.id === it.id)!;
          const gap = (p.reflection.dist / 12700) * 0.6;
          const size = Math.round((p.reflection.endPos / 100000) * 100);
          b.replaceChildren(el('span', { textContent: 'A', style: `font:700 24px/1 Georgia, serif;-webkit-box-reflect:below ${gap.toFixed(1)}px linear-gradient(transparent ${100 - size}%, rgba(0,0,0,.45))` }));
        },
        onPick: (id) => { ed.setTextEffects({ reflection: TEXT_REFLECTION_PRESETS.find((p) => p.id === id)!.reflection }); ctx.after(); },
      }),
    },
    '-', 'fx:pane',
  ];
}

function glowMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.glow ?? null);
  const items = TEXT_GLOW_SIZES.flatMap((rad) => [1, 2, 3, 4, 5, 6].map((a) => ({ id: `${rad}:${a}`, label: L(`Glow: ${rad / 12700} pt; Accent color ${a}`, `Brilho: ${String(rad / 12700).replace('.', ',')} pt; Cor de destaque ${a}`, `Iluminado: ${String(rad / 12700).replace('.', ',')} pt; color de énfasis ${a}`) })));
  const glowOf = (id: string): ReturnType<typeof textGlow> => { const [rad, a] = id.split(':').map(Number); return textGlow(rad!, { scheme: `accent${a}` }); };
  return [
    { id: 'fx:noGlow', label: L('No Glow', 'Sem Brilho', 'Sin iluminado'), icon: 'cancel', checked: cur === 'null', onClick: () => { ed.setTextEffects({ glow: null }); ctx.after(); } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L('Glow Variations', 'Variações de Brilho', 'Variaciones de iluminado'), items }],
        tile: { w: 40, h: 40 }, cols: 6, close, text: (l) => ctx.registry.text(l),
        selected: items.find((x) => JSON.stringify(glowOf(x.id)) === cur)?.id,
        render: (b, it) => { b.replaceChildren(el('span', { textContent: 'A', style: `font:700 22px/1 Georgia, serif;${fxCss({ glow: glowOf(it.id) }, ed.documentThemeColors())}` })); },
        onPick: (id) => { ed.setTextEffects({ glow: glowOf(id) }); ctx.after(); },
      }),
    },
    { id: 'fx:glowColors', label: L('More Glow Colors', 'Mais Cores de Brilho', 'Más colores de iluminado'), icon: 'palette', submenu: () => [paletteGrid(env, ctx, (c) => ed.setTextEffects({ glow: textGlow(ed.textEffects().fx?.glow?.rad ?? 101600, c) }))] },
    '-', 'fx:pane',
  ];
}

function numberStylesMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const ot = ed.textEffects().ot ?? {};
  return NUMBER_STYLES_OT.map((n) => ({
    id: `fx:num:${n.id}`, label: n.label, checked: (ot.numForm ?? 'default') === n.numForm && (ot.numSpacing ?? 'default') === n.numSpacing,
    onClick: () => { ed.setOpenType({ numForm: n.numForm === 'default' ? null : n.numForm, numSpacing: n.numSpacing === 'default' ? null : n.numSpacing }); ctx.after(); },
  }));
}

function ligaturesMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = ed.textEffects().ot?.ligatures ?? 'none';
  return LIGATURE_OPTIONS.map((o) => ({
    id: `fx:lig:${o.val}`, label: o.label, checked: cur === o.val,
    onClick: () => { ed.setOpenType({ ligatures: o.val === 'none' ? null : o.val }); ctx.after(); },
  }));
}

function stylisticSetsMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const cur = ed.textEffects().ot?.stylisticSets ?? [];
  return [
    { id: 'fx:ss:0', label: L('Default', 'Padrão', 'Predeterminado'), checked: !cur.length, onClick: () => { ed.setOpenType({ stylisticSets: null }); ctx.after(); } },
    { content: (close) => tileGrid({
      sections: [{ label: L('Individual', 'Individual', 'Individual'), items: Array.from({ length: 20 }, (_v, i) => ({ id: String(i + 1), label: L(`Set ${i + 1}`, `Conjunto ${i + 1}`, `Conjunto ${i + 1}`) })) }],
      tile: { w: 40, h: 28 }, cols: 5, close, text: (l) => ctx.registry.text(l), selected: cur.length === 1 ? String(cur[0]) : undefined,
      render: (b, it) => { b.replaceChildren(el('span', { textContent: it.id, style: 'font-size:12px' })); },
      onPick: (id) => { ed.setOpenType({ stylisticSets: [Number(id)] }); ctx.after(); },
    }) },
  ];
}

/** Cor da Fonte › Gradiente: Nenhum, Variações Claras/Escuras (4 direções) e o painel. */
export function fontGradientMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const items = (light: boolean): { id: string; label: { en: string; pt: string; es: string } }[] => GRADIENT_DIRECTIONS.map(([ang, l]) => ({ id: `${light ? 'l' : 'd'}:${ang}`, label: l }));
  const color = env.ctl.state().run.color as string | undefined;
  return [
    { id: 'fx:noGradient', label: L('No Gradient', 'Nenhum Gradiente', 'Sin degradado'), icon: 'cancel', onClick: () => { ed.setTextGradient(null); ctx.after(); } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L('Light Variations', 'Variações Claras', 'Variaciones claras'), items: items(true) }, { label: L('Dark Variations', 'Variações Escuras', 'Variaciones oscuras'), items: items(false) }],
        tile: { w: 44, h: 44 }, cols: 4, close, text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          const [k, ang] = it.id.split(':');
          const c = `#${color && /^[0-9A-Fa-f]{6}$/.test(color) ? color : '1F4E79'}`;
          const other = k === 'l' ? `color-mix(in srgb, ${c} 20%, white)` : `color-mix(in srgb, ${c} 50%, black)`;
          b.replaceChildren(el('span', { style: `display:block;width:30px;height:30px;border-radius:3px;background:linear-gradient(${Number(ang) + 90}deg, ${c}, ${other})` }));
        },
        onPick: (id) => { const [k, ang] = id.split(':'); ed.setTextGradient({ angleDeg: Number(ang), light: k === 'l' }); ctx.after(); },
      }),
    },
    '-', 'fx:pane',
  ];
}

export function registerEffectsCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const has = (m: string) => (): boolean => typeof (ed as unknown as Record<string, unknown>)[m] === 'function';
  const cmds: Command[] = [
    { id: 'fx:pane', label: L('Text Effects Options…', 'Opções de Efeitos de Texto...', 'Opciones de efectos de texto…'), icon: 'auto_awesome', supports: has('setTextEffects'), isEnabled: canEdit, isChecked: () => !!paneOpen('uw-texteffects'), run: () => ctl.textEffectsPane() },
  ];
  reg.add(...cmds);
}

/**
 * Painel Formatar Efeitos de Texto: Preenchimento e Contorno do Texto (nenhum, sólido,
 * degradê de 2 cores; cor e transparência; espessura e traço) e Efeitos (sombra, reflexo,
 * brilho com as medidas; 3D preservado). Aplica na hora (cada mudança é um passo).
 */
export function openTextEffectsPane(o: { ed: UniversalWriteElement; lang: UiLang; layer: HTMLElement; frame: () => DOMRect; after: () => void }): { sync: () => void } | null {
  const { ed, lang } = o;
  const cur = paneOpen('uw-texteffects');
  if (cur) { cur.close(); return null; }
  const num = (v: number, step = 0.5, min = 0, max = 200): HTMLInputElement => el('input', { type: 'number', value: String(Math.round(v * 100) / 100), step: String(step), min: String(min), max: String(max), style: 'width:70px' });
  const colorIn = (hex: string): HTMLInputElement => el('input', { type: 'color', value: `#${hex}`, style: 'width:44px;height:24px;padding:0' });
  const sel = (opts: [string, string][], v: string): HTMLSelectElement => { const s = el('select', { style: 'min-width:120px' }); for (const [k, t] of opts) s.append(el('option', { value: k, textContent: t })); s.value = v; return s; };
  const row = (label: string, ...kids: Node[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' }, el('span', { textContent: label, style: 'font-size:12px' }), el('span', { style: 'display:flex;gap:6px;align-items:center' }, ...kids));
  const section = (title: string, ...kids: Node[]): HTMLElement => el('details', { open: true, style: 'border-bottom:1px solid color-mix(in srgb, currentColor 15%, transparent);padding:4px 0' }, el('summary', { textContent: title, style: 'font-weight:600;cursor:pointer' }), el('div', { style: 'display:flex;flex-direction:column;gap:6px;padding:6px 2px' }, ...kids));
  const hexOf = (c?: FxColor): string => (c?.rgb ?? '000000');
  const transOf = (c?: FxColor): number => (c?.mods?.find(([k]) => k === 'alpha')?.[1] ?? 0) / 1000;
  const withT = (hex: string, t: number): FxColor => ({ rgb: hex.replace('#', '').toUpperCase(), ...(t > 0 ? { mods: [['alpha', Math.round(t * 1000)]] as [string, number][] } : {}) });

  const fx = (): TextEffects => ed.textEffects().fx ?? {};
  // ── preenchimento ──
  const fillKind = sel([['auto', tr(lang, 'Automatic', 'Automático', 'Automático')], ['none', tr(lang, 'No fill', 'Sem preenchimento', 'Sin relleno')], ['solid', tr(lang, 'Solid fill', 'Preenchimento sólido', 'Relleno sólido')], ['grad', tr(lang, 'Gradient fill', 'Preenchimento gradiente', 'Relleno degradado')]], 'auto');
  const fillColor = colorIn('000000'), fillColor2 = colorIn('FFFFFF');
  const fillT = num(0, 1, 0, 100), gradAngle = num(90, 15, 0, 359);
  // ── contorno ──
  const lineKind = sel([['none', tr(lang, 'No line', 'Sem linha', 'Sin línea')], ['solid', tr(lang, 'Solid line', 'Linha sólida', 'Línea sólida')]], 'none');
  const lineColor = colorIn('000000'), lineT = num(0, 1, 0, 100), lineW = num(0.75, 0.25, 0.25, 20);
  const lineDash = sel(OUTLINE_DASHES.map(([d, l]) => [d, pickLabels(lang, l)]), 'solid');
  // ── sombra ──
  const shOn = el('input', { type: 'checkbox' });
  const shColor = colorIn('000000'), shT = num(60, 1, 0, 100), shBlur = num(4, 0.5, 0, 100), shAng = num(45, 1, 0, 359), shDist = num(3, 0.5, 0, 200);
  // ── reflexo ──
  const rfOn = el('input', { type: 'checkbox' });
  const rfT = num(45, 1, 0, 100), rfSize = num(45, 1, 1, 100), rfBlur = num(0.5, 0.5, 0, 100), rfDist = num(0, 0.5, 0, 100);
  // ── brilho ──
  const glOn = el('input', { type: 'checkbox' });
  const glColor = colorIn('4472C4'), glSize = num(8, 1, 0, 150), glT = num(60, 1, 0, 100);
  const threeD = el('div', { style: 'font-size:12px;opacity:.75' });

  const load = (): void => {
    const f = fx();
    fillKind.value = f.fill?.type === 'grad' ? 'grad' : f.fill?.type === 'solid' ? 'solid' : f.fill?.type === 'none' ? 'none' : 'auto';
    if (f.fill?.type === 'solid') { fillColor.value = `#${hexOf(f.fill.color)}`; fillT.value = String(transOf(f.fill.color)); }
    if (f.fill?.type === 'grad') { fillColor.value = `#${hexOf(f.fill.stops[0]?.color)}`; fillColor2.value = `#${hexOf(f.fill.stops[f.fill.stops.length - 1]?.color)}`; gradAngle.value = String((f.fill.lin?.ang ?? 5400000) / 60000); }
    const ol = f.outline;
    lineKind.value = ol?.fill?.type === 'solid' ? 'solid' : 'none';
    if (ol?.fill?.type === 'solid') { lineColor.value = `#${hexOf(ol.fill.color)}`; lineT.value = String(transOf(ol.fill.color)); }
    if (ol?.w !== undefined) lineW.value = String(ol.w / 12700);
    lineDash.value = ol?.dash ?? 'solid';
    shOn.checked = !!f.shadow;
    if (f.shadow) { shColor.value = `#${hexOf(f.shadow.color)}`; shT.value = String(transOf(f.shadow.color)); shBlur.value = String(f.shadow.blurRad / 12700); shAng.value = String(f.shadow.dir / 60000); shDist.value = String(f.shadow.dist / 12700); }
    rfOn.checked = !!f.reflection;
    if (f.reflection) { rfT.value = String(Math.round(100 - f.reflection.stA / 1000)); rfSize.value = String(Math.round(f.reflection.endPos / 1000)); rfBlur.value = String(f.reflection.blurRad / 12700); rfDist.value = String(f.reflection.dist / 12700); }
    glOn.checked = !!f.glow;
    if (f.glow) { glColor.value = `#${hexOf(f.glow.color)}`; glSize.value = String(f.glow.rad / 12700); glT.value = String(transOf(f.glow.color)); }
    threeD.textContent = f.props3d || f.scene3d ? tr(lang, '3-D format kept (drawn flat).', 'Formato 3D preservado (desenhado plano).', 'Formato 3D conservado (se dibuja plano).') : '';
  };
  const n = (i: HTMLInputElement): number => Number(i.value) || 0;
  const apply = (part: 'fill' | 'outline' | 'shadow' | 'reflection' | 'glow'): void => {
    if (part === 'fill') {
      const k = fillKind.value;
      ed.setTextEffects({ fill: k === 'auto' ? null : k === 'none' ? { type: 'none' } : k === 'solid' ? { type: 'solid', color: withT(fillColor.value, n(fillT)) }
        : { type: 'grad', stops: [{ pos: 0, color: withT(fillColor.value, n(fillT)) }, { pos: 100000, color: withT(fillColor2.value, n(fillT)) }], lin: { ang: Math.round(n(gradAngle) * 60000), scaled: false } } });
    } else if (part === 'outline') {
      ed.setTextEffects({ outline: lineKind.value === 'none' ? null : { ...outline(withT(lineColor.value, n(lineT)), n(lineW), lineDash.value) } });
    } else if (part === 'shadow') {
      ed.setTextEffects({ shadow: !shOn.checked ? null : { blurRad: Math.round(n(shBlur) * 12700), dist: Math.round(n(shDist) * 12700), dir: Math.round(n(shAng) * 60000), sx: 100000, sy: 100000, kx: 0, ky: 0, algn: 'tl', color: withT(shColor.value, n(shT)) } });
    } else if (part === 'reflection') {
      ed.setTextEffects({ reflection: !rfOn.checked ? null : { blurRad: Math.round(n(rfBlur) * 12700), stA: Math.round((100 - n(rfT)) * 1000), stPos: 0, endA: 300, endPos: Math.round(n(rfSize) * 1000), dist: Math.round(n(rfDist) * 12700), dir: 5400000, fadeDir: 5400000, sx: 100000, sy: -100000, kx: 0, ky: 0, algn: 'bl' } });
    } else {
      ed.setTextEffects({ glow: !glOn.checked ? null : { rad: Math.round(n(glSize) * 12700), color: withT(glColor.value, n(glT)) } });
    }
    o.after();
  };
  for (const x of [fillKind, fillColor, fillColor2, fillT, gradAngle]) x.addEventListener('change', () => apply('fill'));
  for (const x of [lineKind, lineColor, lineT, lineW, lineDash]) x.addEventListener('change', () => apply('outline'));
  for (const x of [shOn, shColor, shT, shBlur, shAng, shDist]) x.addEventListener('change', () => apply('shadow'));
  for (const x of [rfOn, rfT, rfSize, rfBlur, rfDist]) x.addEventListener('change', () => apply('reflection'));
  for (const x of [glOn, glColor, glSize, glT]) x.addEventListener('change', () => apply('glow'));
  const t = (en: string, pt: string, es: string): string => tr(lang, en, pt, es);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:4px;padding:4px;font-size:13px' },
    section(t('Text Fill', 'Preenchimento do Texto', 'Relleno de texto'), row(t('Fill', 'Preenchimento', 'Relleno'), fillKind), row(t('Color', 'Cor', 'Color'), fillColor, fillColor2), row(t('Transparency (%)', 'Transparência (%)', 'Transparencia (%)'), fillT), row(t('Gradient angle (°)', 'Ângulo do gradiente (°)', 'Ángulo del degradado (°)'), gradAngle)),
    section(t('Text Outline', 'Contorno do Texto', 'Contorno de texto'), row(t('Line', 'Linha', 'Línea'), lineKind), row(t('Color', 'Cor', 'Color'), lineColor), row(t('Transparency (%)', 'Transparência (%)', 'Transparencia (%)'), lineT), row(t('Width (pt)', 'Largura (pt)', 'Ancho (pt)'), lineW), row(t('Dash type', 'Tipo de traço', 'Tipo de guion'), lineDash)),
    section(t('Shadow', 'Sombra', 'Sombra'), row(t('Shadow', 'Sombra', 'Sombra'), shOn), row(t('Color', 'Cor', 'Color'), shColor), row(t('Transparency (%)', 'Transparência (%)', 'Transparencia (%)'), shT), row(t('Blur (pt)', 'Desfoque (pt)', 'Desenfoque (pt)'), shBlur), row(t('Angle (°)', 'Ângulo (°)', 'Ángulo (°)'), shAng), row(t('Distance (pt)', 'Distância (pt)', 'Distancia (pt)'), shDist)),
    section(t('Reflection', 'Reflexo', 'Reflejo'), row(t('Reflection', 'Reflexo', 'Reflejo'), rfOn), row(t('Transparency (%)', 'Transparência (%)', 'Transparencia (%)'), rfT), row(t('Size (%)', 'Tamanho (%)', 'Tamaño (%)'), rfSize), row(t('Blur (pt)', 'Desfoque (pt)', 'Desenfoque (pt)'), rfBlur), row(t('Distance (pt)', 'Distância (pt)', 'Distancia (pt)'), rfDist)),
    section(t('Glow', 'Brilho', 'Iluminado'), row(t('Glow', 'Brilho', 'Iluminado'), glOn), row(t('Color', 'Cor', 'Color'), glColor), row(t('Size (pt)', 'Tamanho (pt)', 'Tamaño (pt)'), glSize), row(t('Transparency (%)', 'Transparência (%)', 'Transparencia (%)'), glT)),
    section(t('3-D Format', 'Formato 3D', 'Formato 3D'), threeD));
  load();
  openPane({ id: 'uw-texteffects', title: L('Format Text Effects', 'Formatar Efeitos de Texto', 'Formato de efectos de texto'), lang, layer: o.layer, frame: o.frame, width: 300, body, onClose: () => { ed.classList.remove('uw-has-pane'); o.after(); } });
  ed.classList.add('uw-has-pane');
  return { sync: () => { const a = document.activeElement; if (!a || !body.contains(a)) load(); } };
}
