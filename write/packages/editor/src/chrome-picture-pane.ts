// Painel FORMATAR IMAGEM: quatro guias — Preenchimento e Linha, Efeitos, Layout e
// Propriedades, Imagem — com os valores exatos (pt, °, %, cm), como o painel do
// Word. Só lê o estado da imagem selecionada e chama a API pública do
// <universal-write> (setImageFormat, setImageAdjust, setImageTransparency,
// setImageCrop, setImageAltText…).
import { colorGrid, openMenu, openPane, paneOpen, pickLabels, symbol, themePaletteColors, STANDARD_COLORS, type UiLang } from '@universal-office/ui';
import type { DmlColor, PicLine, PicShadow, PicReflection, Pic3D, PictureFormat } from '@universal-office/docx-core';
import type { UniversalWriteElement } from './universal-write.js';
import { dmlFromPick } from './chrome-picture.js';
import { SHADOW_PRESETS, REFLECTION_PRESETS, BEVEL_PRESETS, ROTATION_PRESETS, LINE_DASHES, glowPreset, GLOW_SIZES } from './picture-ops.js';

export type FormatTab = 'line' | 'effects' | 'layout' | 'picture';
export interface FormatPaneEnv { ed: UniversalWriteElement; lang: UiLang; layer: HTMLElement; frame: () => DOMRect; after: () => void }

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};

const EMU_PT = 12700;
const ANG = 60000;
const alphaOf = (c: DmlColor | undefined): number => (c?.mods?.find((m) => m[0] === 'alpha')?.[1] ?? 100000) / 1000;
const withAlpha = (c: DmlColor, pct: number): DmlColor => ({ ...c, mods: [...(c.mods ?? []).filter((m) => m[0] !== 'alpha'), ...(pct < 100 ? [['alpha', Math.round(pct * 1000)] as [string, number]] : [])] });
const noAlpha = (c: DmlColor): DmlColor => ({ ...c, mods: (c.mods ?? []).filter((m) => m[0] !== 'alpha') });

/** Painel Formatar Imagem (abre na guia pedida; de novo na mesma guia fecha). */
export function toggleFormatPane(env: FormatPaneEnv, tab: FormatTab, onClose: () => void): { sync(): void; show(tab: FormatTab): void } | null {
  const { ed, lang } = env;
  const tr = (en: string, pt: string): string => pickLabels(lang, { en, pt });
  const cur = paneOpen('pic-format');
  if (cur) { cur.close(); return null; }
  const fmt = (): PictureFormat | null => ed.selectedImage()?.format ?? null;
  const off = (): boolean => !ed.selectedImage() || ed.isProtected();
  const syncers: (() => void)[] = [];
  const dec = tr('.', ',');

  // ── controles ──
  /** campo numérico com unidade e setas; `get` undefined = vazio */
  const num = (label: string, unit: string, get: () => number | undefined, set: (v: number) => void, o: { min?: number; max?: number; step?: number; digits?: number } = {}): HTMLElement => {
    const input = el('input', { type: 'text', inputMode: 'decimal', style: 'width:76px' });
    input.setAttribute('aria-label', label);
    const digits = o.digits ?? 1;
    const show = (): void => {
      const v = get();
      if (document.activeElement !== input && ed.shadowRoot?.activeElement !== input) input.value = v === undefined ? '' : `${(Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, '').replace('.', dec)} ${unit}`.trim();
      input.disabled = off();
      up.disabled = dn.disabled = off();
    };
    const clamp = (v: number): number => Math.max(o.min ?? -Infinity, Math.min(o.max ?? Infinity, v));
    const apply = (): void => {
      const n = parseFloat(input.value.replace(',', '.').replace(/[^0-9.\-]/g, ''));
      if (Number.isFinite(n)) { set(clamp(n)); env.after(); }
      sync();
    };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const step = (d: number): void => { set(clamp((get() ?? 0) + d * (o.step ?? 1))); env.after(); sync(); };
    const up = el('button', { type: 'button', className: 'uo-btn', style: 'width:18px;height:13px;min-width:0;padding:0' });
    const dn = el('button', { type: 'button', className: 'uo-btn', style: 'width:18px;height:13px;min-width:0;padding:0' });
    up.innerHTML = symbol('keyboard_arrow_up');
    dn.innerHTML = symbol('keyboard_arrow_down');
    for (const [b, d] of [[up, 1], [dn, -1]] as const) { b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', () => step(d)); }
    syncers.push(show);
    return row(label, el('span', { style: 'display:inline-flex;align-items:center;gap:2px' }, input, el('span', { style: 'display:inline-flex;flex-direction:column' }, up, dn)));
  };
  const choice = (label: string, opts: readonly (readonly [string, string])[], get: () => string | undefined, set: (v: string) => void): HTMLElement => {
    const s = el('select', { style: 'max-width:150px' });
    s.setAttribute('aria-label', label);
    for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
    s.addEventListener('change', () => { set(s.value); env.after(); sync(); });
    syncers.push(() => { const v = get(); s.value = v ?? ''; s.disabled = off(); });
    return row(label, s);
  };
  const color = (label: string, get: () => DmlColor | undefined, set: (c: DmlColor) => void): HTMLElement => {
    const b = el('button', { type: 'button', className: 'uo-btn', style: 'min-width:0;padding:2px 6px;display:inline-flex;align-items:center;gap:4px' });
    b.setAttribute('aria-label', label);
    const chip = el('span', { style: 'width:18px;height:14px;border:1px solid var(--uo-outline,#888);border-radius:3px;display:inline-block' });
    b.append(chip);
    b.insertAdjacentHTML('beforeend', symbol('arrow_drop_down'));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      const theme = ed.documentThemeColors();
      openMenu([{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
          onPick: (v) => { set(dmlFromPick(v, theme)); env.after(); sync(); },
        }),
      }], { anchor: b }, { layer: env.layer, lang });
    });
    syncers.push(() => {
      const c = get();
      const hex = c ? ed.resolveDmlColor(c) : undefined;
      chip.style.background = hex ? `#${hex}` : 'transparent';
      b.disabled = off();
    });
    return row(label, b);
  };
  const row = (label: string, ctl: HTMLElement): HTMLElement => el('label', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px' }, el('span', { textContent: label }), ctl);
  const section = (title: string, open: boolean, ...kids: HTMLElement[]): HTMLElement => {
    const d = el('details', { open, style: 'border-bottom:1px solid var(--uo-outline-variant,#ddd);padding:4px 0' }, el('summary', { textContent: title, style: 'font-weight:600;font-size:13px;cursor:pointer;padding:4px 0' }));
    d.append(el('div', { style: 'display:flex;flex-direction:column;gap:6px;padding:4px 0 6px 12px' }, ...kids));
    return d;
  };
  const presetRow = (label: string, items: { id: string; label: string }[], set: (id: string | null) => void, noneLabel: string): HTMLElement =>
    choice(label, [['', tr('(choose)', '(escolher)')], ['none', noneLabel], ...items.map((i): [string, string] => [i.id, i.label])], () => '', (v) => { if (v) set(v === 'none' ? null : v); });

  // ── Preenchimento e Linha ──
  const line = (): PicLine | undefined => fmt()?.line ?? undefined;
  const setLine = (ch: Partial<PicLine>): void => {
    const base: PicLine = line()?.fill ? { ...line()! } : { w: 9525, fill: { kind: 'schemeClr', val: 'tx1' } };
    ed.setImageFormat({ line: { ...base, ...ch } });
  };
  const lineTab = el('div', {},
    section(tr('Line', 'Linha'), true,
      choice(tr('Line', 'Linha'), [['none', tr('No line', 'Sem linha')], ['solid', tr('Solid line', 'Linha sólida')]], () => (line()?.fill ? 'solid' : 'none'), (v) => (v === 'none' ? ed.setImageFormat({ line: { ...(line() ?? {}), fill: null } }) : setLine({}))),
      color(tr('Color', 'Cor'), () => line()?.fill ?? undefined, (c) => setLine({ fill: withAlpha(c, alphaOf(line()?.fill ?? undefined)) })),
      num(tr('Transparency', 'Transparência'), '%', () => (line()?.fill ? 100 - alphaOf(line()!.fill!) : undefined), (v) => line()?.fill && setLine({ fill: withAlpha(line()!.fill!, 100 - v) }), { min: 0, max: 100 }),
      num(tr('Width', 'Largura'), 'pt', () => (line()?.fill ? (line()!.w ?? 9525) / EMU_PT : undefined), (v) => setLine({ w: Math.round(v * EMU_PT) }), { min: 0, max: 1584, step: 0.25, digits: 2 }),
      choice(tr('Compound type', 'Tipo composto'), [['sng', tr('Single', 'Simples')], ['dbl', tr('Double', 'Duplo')], ['thickThin', tr('Thick Thin', 'Grosso Fino')], ['thinThick', tr('Thin Thick', 'Fino Grosso')], ['tri', tr('Triple', 'Triplo')]], () => line()?.cmpd ?? 'sng', (v) => setLine({ cmpd: v as PicLine['cmpd'] })),
      choice(tr('Dash type', 'Tipo de traço'), LINE_DASHES.map((d): [string, string] => [d.val, pickLabels(lang, d.label as { en: string; pt: string })]), () => line()?.dash ?? 'solid', (v) => setLine({ dash: v === 'solid' ? undefined : v })),
      choice(tr('Cap type', 'Tipo de extremidade'), [['sq', tr('Square', 'Quadrado')], ['rnd', tr('Round', 'Arredondado')], ['flat', tr('Flat', 'Plano')]], () => line()?.cap ?? 'flat', (v) => setLine({ cap: v as PicLine['cap'] })),
      choice(tr('Join type', 'Tipo de junção'), [['round', tr('Round', 'Arredondada')], ['bevel', tr('Bevel', 'Chanfrada')], ['miter', tr('Miter', 'Malhete')]], () => line()?.join ?? 'round', (v) => setLine({ join: v as PicLine['join'] })),
    ));

  // ── Efeitos ──
  const fx = () => fmt()?.effects;
  const sh = (): PicShadow | undefined => fx()?.shadow;
  const setSh = (ch: Partial<PicShadow>): void => {
    const base: PicShadow = sh() ?? { kind: 'outer', blurRad: 50800, dist: 38100, dir: 2700000, algn: 'tl', rotWithShape: false, color: { kind: 'prstClr', val: 'black', mods: [['alpha', 40000]] } };
    ed.setImageFormat({ shadow: { ...base, ...ch } });
  };
  const rf = (): PicReflection | undefined => fx()?.reflection;
  const setRf = (ch: Partial<PicReflection>): void => {
    const base: PicReflection = rf() ?? { blurRad: 6350, stA: 50000, endA: 300, endPos: 55000, dir: 5400000, sy: -100000, algn: 'bl', rotWithShape: false };
    ed.setImageFormat({ reflection: { ...base, ...ch } });
  };
  const gl = () => fx()?.glow;
  const setGl = (ch: Partial<{ rad: number; color: DmlColor }>): void => {
    const base = gl() ?? glowPreset(GLOW_SIZES[0]!, 1);
    ed.setImageFormat({ glow: { ...base, ...ch } });
  };
  const td = (): Pic3D | undefined => fmt()?.threeD;
  const setTd = (ch: Partial<Pic3D>): void => {
    const base: Pic3D = td() ?? { camera: { prst: 'orthographicFront' }, lightRig: { rig: 'threePt', dir: 't' } };
    ed.setImageFormat({ threeD: { ...base, ...ch } });
  };
  const bevelOpts: [string, string][] = [['', tr('No Bevel', 'Sem Bisel')], ...BEVEL_PRESETS.map((b): [string, string] => [b.prst, pickLabels(lang, b.label as { en: string; pt: string })])];
  const bevel = (which: 'bevelT' | 'bevelB', title: string): HTMLElement[] => [
    choice(title, bevelOpts, () => (td()?.[which] ? td()![which]!.prst ?? 'circle' : ''), (v) => setTd({ [which]: v ? { ...(td()?.[which] ?? {}), prst: v === 'circle' ? undefined : v } : undefined })),
    num(tr('Width', 'Largura'), 'pt', () => (td()?.[which] ? (td()![which]!.w ?? 76200) / EMU_PT : undefined), (v) => setTd({ [which]: { ...(td()?.[which] ?? {}), w: Math.round(v * EMU_PT) } }), { min: 0, max: 1584, step: 1 }),
    num(tr('Height', 'Altura'), 'pt', () => (td()?.[which] ? (td()![which]!.h ?? 76200) / EMU_PT : undefined), (v) => setTd({ [which]: { ...(td()?.[which] ?? {}), h: Math.round(v * EMU_PT) } }), { min: 0, max: 1584, step: 1 }),
  ];
  const rot = () => td()?.camera?.rot ?? { lat: 0, lon: 0, rev: 0 };
  const setRot = (k: 'lat' | 'lon' | 'rev', deg: number): void => {
    const cam = td()?.camera ?? { prst: 'orthographicFront' };
    setTd({ camera: { ...cam, rot: { ...rot(), [k]: Math.round((((deg % 360) + 360) % 360) * ANG) } } });
  };
  const effectsTab = el('div', {},
    section(tr('Shadow', 'Sombra'), true,
      presetRow(tr('Presets', 'Predefinições'), SHADOW_PRESETS.map((p) => ({ id: p.id, label: pickLabels(lang, p.label as { en: string; pt: string }) })), (id) => ed.setImageEffect('shadow', id), tr('No Shadow', 'Sem Sombra')),
      color(tr('Color', 'Cor'), () => sh()?.color, (c) => setSh({ color: withAlpha(c, alphaOf(sh()?.color)) })),
      num(tr('Transparency', 'Transparência'), '%', () => (sh() ? 100 - alphaOf(sh()!.color) : undefined), (v) => sh() && setSh({ color: withAlpha(noAlpha(sh()!.color), 100 - v) }), { min: 0, max: 100 }),
      num(tr('Size', 'Tamanho'), '%', () => (sh() ? (sh()!.sx ?? 100000) / 1000 : undefined), (v) => setSh({ sx: Math.round(v * 1000), sy: Math.round(v * 1000) }), { min: 1, max: 200 }),
      num(tr('Blur', 'Desfoque'), 'pt', () => (sh() ? (sh()!.blurRad ?? 0) / EMU_PT : undefined), (v) => setSh({ blurRad: Math.round(v * EMU_PT) }), { min: 0, max: 100 }),
      num(tr('Angle', 'Ângulo'), '°', () => (sh() ? (sh()!.dir ?? 0) / ANG : undefined), (v) => setSh({ dir: Math.round((((v % 360) + 360) % 360) * ANG) }), { min: 0, max: 359.9 }),
      num(tr('Distance', 'Distância'), 'pt', () => (sh() ? (sh()!.dist ?? 0) / EMU_PT : undefined), (v) => setSh({ dist: Math.round(v * EMU_PT) }), { min: 0, max: 200 }),
    ),
    section(tr('Reflection', 'Reflexo'), false,
      presetRow(tr('Presets', 'Predefinições'), REFLECTION_PRESETS.map((p) => ({ id: p.id, label: pickLabels(lang, p.label as { en: string; pt: string }) })), (id) => ed.setImageEffect('reflection', id), tr('No Reflection', 'Sem Reflexo')),
      num(tr('Transparency', 'Transparência'), '%', () => (rf() ? 100 - (rf()!.stA ?? 100000) / 1000 : undefined), (v) => setRf({ stA: Math.round((100 - v) * 1000) }), { min: 0, max: 100 }),
      num(tr('Size', 'Tamanho'), '%', () => (rf() ? (rf()!.endPos ?? 100000) / 1000 : undefined), (v) => setRf({ endPos: Math.round(v * 1000) }), { min: 1, max: 100 }),
      num(tr('Blur', 'Desfoque'), 'pt', () => (rf() ? (rf()!.blurRad ?? 0) / EMU_PT : undefined), (v) => setRf({ blurRad: Math.round(v * EMU_PT) }), { min: 0, max: 100 }),
      num(tr('Distance', 'Distância'), 'pt', () => (rf() ? (rf()!.dist ?? 0) / EMU_PT : undefined), (v) => setRf({ dist: Math.round(v * EMU_PT) }), { min: 0, max: 100 }),
    ),
    section(tr('Glow', 'Brilho'), false,
      presetRow(tr('Presets', 'Predefinições'), GLOW_SIZES.flatMap((r, si) => [1, 2, 3, 4, 5, 6].map((a) => ({ id: `glow-${si}-${a}`, label: `${r / EMU_PT} pt, ${tr('Accent color', 'Cor de ênfase')} ${a}` }))), (id) => ed.setImageEffect('glow', id), tr('No Glow', 'Sem Brilho')),
      color(tr('Color', 'Cor'), () => gl()?.color, (c) => setGl({ color: withAlpha(c, alphaOf(gl()?.color)) })),
      num(tr('Size', 'Tamanho'), 'pt', () => (gl() ? gl()!.rad / EMU_PT : undefined), (v) => setGl({ rad: Math.round(v * EMU_PT) }), { min: 0, max: 150 }),
      num(tr('Transparency', 'Transparência'), '%', () => (gl() ? 100 - alphaOf(gl()!.color) : undefined), (v) => gl() && setGl({ color: withAlpha(noAlpha(gl()!.color), 100 - v) }), { min: 0, max: 100 }),
    ),
    section(tr('Soft Edges', 'Bordas Suaves'), false,
      num(tr('Size', 'Tamanho'), 'pt', () => (fx()?.softEdge !== undefined ? fx()!.softEdge! / EMU_PT : 0), (v) => ed.setImageFormat({ softEdge: v > 0 ? Math.round(v * EMU_PT) : null }), { min: 0, max: 100 }),
    ),
    section(tr('3-D Format', 'Formato 3D'), false,
      ...bevel('bevelT', tr('Top bevel', 'Bisel superior')),
      ...bevel('bevelB', tr('Bottom bevel', 'Bisel inferior')),
      color(tr('Depth color', 'Cor da profundidade'), () => td()?.extrusionClr, (c) => setTd({ extrusionClr: c })),
      num(tr('Depth size', 'Tamanho da profundidade'), 'pt', () => (td()?.extrusionH ?? 0) / EMU_PT, (v) => setTd({ extrusionH: Math.round(v * EMU_PT) }), { min: 0, max: 1584 }),
      color(tr('Contour color', 'Cor do contorno'), () => td()?.contourClr, (c) => setTd({ contourClr: c })),
      num(tr('Contour size', 'Tamanho do contorno'), 'pt', () => (td()?.contourW ?? 0) / EMU_PT, (v) => setTd({ contourW: Math.round(v * EMU_PT) }), { min: 0, max: 1584 }),
      choice(tr('Material', 'Material'), ([['warmMatte', tr('Warm Matte', 'Fosco Quente')], ['matte', tr('Matte', 'Fosco')], ['plastic', tr('Plastic', 'Plástico')], ['metal', tr('Metal', 'Metal')], ['dkEdge', tr('Dark Edge', 'Borda Escura')], ['softEdge', tr('Soft Edge', 'Borda Suave')], ['flat', tr('Flat', 'Plano')], ['legacyWireframe', tr('Wire Frame', 'Estrutura de Arame')], ['powder', tr('Powder', 'Pó')], ['translucentPowder', tr('Translucent Powder', 'Pó Translúcido')], ['clear', tr('Clear', 'Transparente')], ['softmetal', tr('Soft Metal', 'Metal Suave')]] as const), () => td()?.prstMaterial ?? 'warmMatte', (v) => setTd({ prstMaterial: v })),
      choice(tr('Lighting', 'Iluminação'), ([['threePt', tr('Three Point', 'Três Pontos')], ['balanced', tr('Balanced', 'Balanceado')], ['soft', tr('Soft', 'Suave')], ['harsh', tr('Harsh', 'Forte')], ['flood', tr('Flood', 'Inundação')], ['contrasting', tr('Contrasting', 'Contrastante')], ['morning', tr('Morning', 'Manhã')], ['sunrise', tr('Sunrise', 'Nascer do Sol')], ['sunset', tr('Sunset', 'Pôr do Sol')], ['chilly', tr('Chilly', 'Frio')], ['freezing', tr('Freezing', 'Congelante')], ['flat', tr('Flat', 'Plano')], ['twoPt', tr('Two Point', 'Dois Pontos')], ['glow', tr('Glow', 'Brilho')], ['brightRoom', tr('Bright Room', 'Sala Iluminada')]] as const), () => td()?.lightRig?.rig ?? 'threePt', (v) => setTd({ lightRig: { ...(td()?.lightRig ?? { dir: 't' }), rig: v } })),
    ),
    section(tr('3-D Rotation', 'Rotação 3D'), false,
      presetRow(tr('Presets', 'Predefinições'), ROTATION_PRESETS.map((p) => ({ id: p.prst, label: pickLabels(lang, p.label as { en: string; pt: string }) })), (id) => ed.setImageEffect('rotation', id), tr('No Rotation', 'Sem Rotação')),
      num(tr('X Rotation', 'Rotação X'), '°', () => rot().lon / ANG, (v) => setRot('lon', v), { min: 0, max: 359.9 }),
      num(tr('Y Rotation', 'Rotação Y'), '°', () => rot().lat / ANG, (v) => setRot('lat', v), { min: 0, max: 359.9 }),
      num(tr('Z Rotation', 'Rotação Z'), '°', () => rot().rev / ANG, (v) => setRot('rev', v), { min: 0, max: 359.9 }),
      num(tr('Perspective', 'Perspectiva'), '°', () => (td()?.camera?.fov ?? 0) / ANG, (v) => setTd({ camera: { ...(td()?.camera ?? { prst: 'perspectiveFront' }), fov: Math.round(v * ANG) } }), { min: 0, max: 120 }),
    ));

  // ── Layout e Propriedades ──
  const title = el('input', { type: 'text', style: 'width:100%;box-sizing:border-box' });
  const descr = el('textarea', { rows: 4, style: 'width:100%;box-sizing:border-box;resize:vertical' });
  title.addEventListener('change', () => { ed.setImageAltText({ title: title.value }); env.after(); });
  descr.addEventListener('change', () => { ed.setImageAltText({ text: descr.value }); env.after(); });
  for (const i of [title, descr]) i.addEventListener('keydown', (e) => e.stopPropagation());
  syncers.push(() => {
    const st = ed.selectedImage();
    const focused = [title, descr].some((i) => document.activeElement === i || ed.shadowRoot?.activeElement === i);
    if (!focused) { title.value = st?.format.docPr.title ?? ''; descr.value = st?.altText ?? ''; }
    title.disabled = descr.disabled = off();
  });
  const layoutTab = el('div', {},
    section(tr('Alt Text', 'Texto Alt'), true,
      el('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:13px' }, tr('Title', 'Título'), title),
      el('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:13px' }, tr('Description', 'Descrição'), descr),
    ));

  // ── Imagem ──
  const a14 = () => fmt()?.blip.a14;
  const cropRect = () => fmt()?.srcRect ?? { l: 0, t: 0, r: 0, b: 0 };
  const cm = (pt: number): number => (pt / 72) * 2.54;
  const pt = (c: number): number => (c / 2.54) * 72;
  /** Posição da imagem dentro do corte (cm): largura/altura da imagem inteira e o
   *  deslocamento do centro dela em relação ao centro do quadro. */
  const geo = () => {
    const st = ed.selectedImage();
    if (!st) return null;
    const s = cropRect();
    const vw = 1 - (s.l + s.r) / 100000, vh = 1 - (s.t + s.b) / 100000;
    const fw = st.widthPt / vw, fh = st.heightPt / vh;
    return { fw, fh, ox: ((s.r - s.l) / 200000) * fw, oy: ((s.b - s.t) / 200000) * fh, w: st.widthPt, h: st.heightPt, left: (s.l / 100000) * fw, top: (s.t / 100000) * fh };
  };
  const setCropFrom = (o: { fw: number; fh: number; ox: number; oy: number; w: number; h: number }): void => {
    // frações do corte a partir do quadro (w×h) centrado com a imagem (fw×fh) deslocada
    const l = (o.fw / 2 - o.ox - o.w / 2) / o.fw, r = (o.fw / 2 + o.ox - o.w / 2) / o.fw;
    const t = (o.fh / 2 - o.oy - o.h / 2) / o.fh, b = (o.fh / 2 + o.oy - o.h / 2) / o.fh;
    ed.setImageCrop({ l, t, r, b });
  };
  const pictureTab = el('div', {},
    section(tr('Picture Corrections', 'Correções de Imagem'), true,
      num(tr('Sharpness', 'Nitidez'), '%', () => (a14()?.sharpen ?? 0) / 1000, (v) => void ed.setImageAdjust({ sharpen: v / 100 }).then(() => { env.after(); sync(); }), { min: -100, max: 100 }),
      num(tr('Brightness', 'Brilho'), '%', () => (a14()?.bright ?? 0) / 1000, (v) => void ed.setImageAdjust({ bright: v / 100 }).then(() => { env.after(); sync(); }), { min: -100, max: 100 }),
      num(tr('Contrast', 'Contraste'), '%', () => (a14()?.contrast ?? 0) / 1000, (v) => void ed.setImageAdjust({ contrast: v / 100 }).then(() => { env.after(); sync(); }), { min: -100, max: 100 }),
    ),
    section(tr('Picture Color', 'Cor da Imagem'), false,
      num(tr('Saturation', 'Saturação'), '%', () => (a14()?.saturation ?? 100000) / 1000, (v) => void ed.setImageAdjust({ saturation: v / 100 }).then(() => { env.after(); sync(); }), { min: 0, max: 400 }),
      num(tr('Temperature', 'Temperatura'), 'K', () => a14()?.colorTemp ?? 6500, (v) => void ed.setImageAdjust({ temperature: v }).then(() => { env.after(); sync(); }), { min: 1500, max: 11500, step: 100, digits: 0 }),
    ),
    section(tr('Picture Transparency', 'Transparência da Imagem'), false,
      num(tr('Transparency', 'Transparência'), '%', () => 100 - (fmt()?.blip.alphaModFix ?? 100000) / 1000, (v) => ed.setImageTransparency(v), { min: 0, max: 100 }),
    ),
    section(tr('Crop', 'Cortar'), false,
      el('div', { textContent: tr('Picture position', 'Posição da imagem'), style: 'font-size:12px;opacity:.75' }),
      num(tr('Width', 'Largura'), 'cm', () => { const g = geo(); return g ? cm(g.fw) : undefined; }, (v) => { const g = geo(); if (g) setCropFrom({ ...g, fw: pt(v), fh: g.fh * (pt(v) / g.fw) }); }, { min: 0.01, step: 0.1, digits: 2 }),
      num(tr('Height', 'Altura'), 'cm', () => { const g = geo(); return g ? cm(g.fh) : undefined; }, (v) => { const g = geo(); if (g) setCropFrom({ ...g, fh: pt(v), fw: g.fw * (pt(v) / g.fh) }); }, { min: 0.01, step: 0.1, digits: 2 }),
      num(tr('Offset X', 'Deslocamento X'), 'cm', () => { const g = geo(); return g ? cm(g.ox) : undefined; }, (v) => { const g = geo(); if (g) setCropFrom({ ...g, ox: pt(v) }); }, { step: 0.1, digits: 2 }),
      num(tr('Offset Y', 'Deslocamento Y'), 'cm', () => { const g = geo(); return g ? cm(g.oy) : undefined; }, (v) => { const g = geo(); if (g) setCropFrom({ ...g, oy: pt(v) }); }, { step: 0.1, digits: 2 }),
      el('div', { textContent: tr('Crop position', 'Posição do corte'), style: 'font-size:12px;opacity:.75' }),
      num(tr('Width', 'Largura'), 'cm', () => { const g = geo(); return g ? cm(g.w) : undefined; }, (v) => ed.setImageSize({ widthPt: pt(v), heightPt: ed.selectedImage()!.heightPt }), { min: 0.01, step: 0.1, digits: 2 }),
      num(tr('Height', 'Altura'), 'cm', () => { const g = geo(); return g ? cm(g.h) : undefined; }, (v) => ed.setImageSize({ heightPt: pt(v), widthPt: ed.selectedImage()!.widthPt }), { min: 0.01, step: 0.1, digits: 2 }),
    ));

  // ── guias ──
  const tabs: [FormatTab, string, string, HTMLElement][] = [
    ['line', tr('Fill & Line', 'Preenchimento e Linha'), 'format_color_fill', lineTab],
    ['effects', tr('Effects', 'Efeitos'), 'auto_awesome', effectsTab],
    ['layout', tr('Layout & Properties', 'Layout e Propriedades'), 'aspect_ratio', layoutTab],
    ['picture', tr('Picture', 'Imagem'), 'image', pictureTab],
  ];
  const head = el('div', { style: 'display:flex;gap:4px;border-bottom:1px solid var(--uo-outline-variant,#ddd);padding-bottom:6px' });
  head.setAttribute('role', 'tablist');
  const btns = tabs.map(([id, label, icon, panel]) => {
    const b = el('button', { type: 'button', className: 'uo-btn', title: label, style: 'min-width:0;padding:4px 8px' });
    b.innerHTML = symbol(icon);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', label);
    b.dataset['a'] = `pic:format:${id}`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => show(id));
    panel.setAttribute('role', 'tabpanel');
    return b;
  });
  const empty = el('p', { textContent: tr('Select a picture to format it.', 'Selecione uma imagem para formatá-la.'), style: 'margin:0;font-size:13px;opacity:.75' });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;padding:4px' }, head, empty, ...tabs.map((t) => t[3]));
  head.append(...btns);
  const show = (id: FormatTab): void => {
    tabs.forEach(([tid, , , panel], i) => { panel.hidden = tid !== id; btns[i]!.classList.toggle('uo-on', tid === id); btns[i]!.setAttribute('aria-selected', String(tid === id)); });
  };
  const sync = (): void => {
    empty.hidden = !!ed.selectedImage();
    for (const s of syncers) s();
  };
  show(tab);
  openPane({ id: 'pic-format', title: { en: 'Format Picture', pt: 'Formatar Imagem' }, lang, layer: env.layer, frame: env.frame, width: 320, body, onClose });
  ed.classList.add('uw-has-pane');
  sync();
  return { sync, show };
}
