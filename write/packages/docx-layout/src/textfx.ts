/**
 * EFEITOS DE TEXTO (w14) no desenho: as cores do tema resolvidas e as medidas em pontos,
 * a caixa do run e a SILHUETA dele (contornos dos glifos) — base dos efeitos em raster de
 * @universal-office/drawingml (sombra, brilho, reflexo), os mesmos das imagens e formas.
 * Medido no PDF do Word (write/tools/home-lab exp-effects.ps1): o brilho, a sombra e o
 * reflexo saem numa imagem com alfa (~200 dpi) ATRÁS do texto, que continua texto; o
 * contorno sai em curvas.
 */
import type { TextEffects, FxColor, FxFill, Theme } from '@universal-office/docx-core';
import { flattenPath, fillPolygons, newMask, outerShadowMask, glowMask, reflectionAlpha, gaussianBlur, type Mask, type PathSeg } from '@universal-office/drawingml';
import { resolveDrawingColor } from './resolve.js';
import type { GlyphRunItem, GradFill } from './tree.js';

export type ResolvedFill =
  | { kind: 'none' }
  | { kind: 'solid'; hex: string; alpha: number }
  | { kind: 'grad'; stops: { pos: number; hex: string; alpha: number }[]; angleDeg: number; scaled: boolean; path?: string; fillTo?: { l: number; t: number; r: number; b: number } };

export interface ResolvedTextFx {
  /** preenchimento que não é a cor sólida opaca do texto (gradiente, nenhum) */
  fill?: ResolvedFill;
  outline?: { widthPt: number; fill: ResolvedFill; dash?: string; cap: CanvasLineCap; join: CanvasLineJoin };
  shadow?: { blurPt: number; distPt: number; dirDeg: number; sx: number; sy: number; kxDeg: number; kyDeg: number; algn: string; hex: string; alpha: number };
  glow?: { radPt: number; hex: string; alpha: number };
  reflection?: { blurPt: number; stA: number; stPos: number; endA: number; endPos: number; distPt: number; dirDeg: number; algn: string };
}

const EMU_PT = 12700;
const ANG = 60000;

/** Cor w14 → hex + opacidade (modificadores do DrawingML; alpha à parte). No w14 o
 *  w14:alpha é a TRANSPARÊNCIA (medido: Transparência 60% → alpha 60000), ao contrário do
 *  a:alpha do DrawingML. */
export function fxColor(c: FxColor, theme: Theme, fallback = '000000'): { hex: string; alpha: number } {
  const mods = (c.mods ?? []).filter(([k]) => k !== 'alpha');
  const a = c.mods?.find(([k]) => k === 'alpha')?.[1];
  const spec = (c.scheme ? `@${c.scheme}` : c.rgb ?? fallback) + (mods.length ? `|${mods.map(([k, v]) => `${k}=${v}`).join(',')}` : '');
  return { hex: resolveDrawingColor(spec, theme) ?? fallback, alpha: a !== undefined ? Math.max(0, Math.min(1, 1 - a / 100000)) : 1 };
}

function fillOf(f: FxFill, theme: Theme, text: string): ResolvedFill {
  if (f.type === 'none') return { kind: 'none' };
  if (f.type === 'solid') { const c = fxColor(f.color, theme, text); return { kind: 'solid', hex: c.hex, alpha: c.alpha }; }
  const stops = f.stops.map((s) => { const c = fxColor(s.color, theme, text); return { pos: s.pos / 100000, hex: c.hex, alpha: c.alpha }; }).sort((a, b) => a.pos - b.pos);
  return {
    kind: 'grad', stops, angleDeg: (f.lin?.ang ?? 5400000) / ANG, scaled: !!f.lin?.scaled,
    ...(f.path ? { path: f.path.kind, fillTo: { l: f.path.l / 100000, t: f.path.t / 100000, r: f.path.r / 100000, b: f.path.b / 100000 } } : {}),
  };
}

const CAP: Record<string, CanvasLineCap> = { rnd: 'round', sq: 'square', flat: 'butt' };

/** Efeitos resolvidos de um run (undefined: só a cor sólida opaca, o caminho comum). */
export function resolveTextFx(fx: TextEffects | undefined, theme: Theme, text: string): ResolvedTextFx | undefined {
  if (!fx) return undefined;
  const out: ResolvedTextFx = {};
  if (fx.fill && (fx.fill.type !== 'solid')) out.fill = fillOf(fx.fill, theme, text);
  const o = fx.outline;
  if (o && o.fill && o.fill.type !== 'none') {
    // w="0": o traço mais fino do dispositivo (o Word grava 0 nos modelos "sem contorno" com cor)
    out.outline = { widthPt: (o.w ?? 9525) / EMU_PT, fill: fillOf(o.fill, theme, text), ...(o.dash && o.dash !== 'solid' ? { dash: o.dash } : {}), cap: CAP[o.cap ?? 'flat'] ?? 'butt', join: o.join === 'round' ? 'round' : o.join === 'bevel' ? 'bevel' : 'miter' };
    if (out.outline.widthPt <= 0) delete out.outline;
  }
  if (fx.shadow) {
    const s = fx.shadow, c = fxColor(s.color, theme);
    if (s.sx !== 0 && s.sy !== 0) out.shadow = { blurPt: s.blurRad / EMU_PT, distPt: s.dist / EMU_PT, dirDeg: s.dir / ANG, sx: s.sx / 100000, sy: s.sy / 100000, kxDeg: s.kx / ANG, kyDeg: s.ky / ANG, algn: s.algn, hex: c.hex, alpha: c.alpha };
  }
  if (fx.glow && fx.glow.rad > 0) { const c = fxColor(fx.glow.color, theme); out.glow = { radPt: fx.glow.rad / EMU_PT, hex: c.hex, alpha: c.alpha }; }
  if (fx.reflection) {
    const r = fx.reflection;
    out.reflection = { blurPt: r.blurRad / EMU_PT, stA: r.stA / 100000, stPos: r.stPos / 100000, endA: r.endA / 100000, endPos: r.endPos / 100000, distPt: r.dist / EMU_PT, dirDeg: r.dir / ANG, algn: r.algn };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Degradê do texto como o das formas (caixa = a do run). */
export function gradOf(f: Extract<ResolvedFill, { kind: 'grad' }>): GradFill {
  return { stops: f.stops.map((s) => ({ pos: s.pos, color: s.hex })), angleDeg: f.angleDeg, scaled: f.scaled, ...(f.path ? { path: f.path } : {}), ...(f.fillTo ? { fillTo: f.fillTo } : {}) };
}

/** Quanto os efeitos passam da caixa do texto (pt), para o tamanho da camada. */
export function fxMarginPt(fx: ResolvedTextFx, textHPt: number): { l: number; t: number; r: number; b: number } {
  let m = (fx.outline?.widthPt ?? 0) / 2 + 1;
  if (fx.glow) m = Math.max(m, fx.glow.radPt * 1.2);
  let b = m;
  if (fx.shadow) {
    const a = (fx.shadow.dirDeg * Math.PI) / 180;
    m = Math.max(m, fx.shadow.blurPt + Math.abs(fx.shadow.distPt * Math.cos(a)) + textHPt * Math.abs(fx.shadow.sx - 1));
    b = Math.max(b, fx.shadow.blurPt + Math.abs(fx.shadow.distPt * Math.sin(a)) + textHPt * Math.abs(fx.shadow.sy - 1), m);
  }
  if (fx.reflection) b = Math.max(b, textHPt + fx.reflection.distPt + fx.reflection.blurPt + 2);
  return { l: m, t: m, r: m, b };
}

/** Caixa do run (twips, y para baixo): do 1º ao fim do último glifo, da ascendente à descendente. */
export function runBox(it: GlyphRunItem): { x: number; y: number; w: number; h: number } {
  const f = it.face.font;
  const upem = f.metrics.unitsPerEm || 1000;
  const k = (it.sizePt * 20) / upem;
  const last = it.glyphs[it.glyphs.length - 1]!;
  const lastAdv = f.advanceWidth(last.gid ?? f.glyphId(last.cp)) * k * (it.scaleX ?? 1);
  const asc = (f.metrics.ascender ?? upem * 0.8) * k, desc = Math.abs(f.metrics.descender ?? -upem * 0.2) * k;
  const x = it.glyphs[0]!.x;
  return { x, y: it.y - asc, w: Math.max(1, last.x + lastAdv - x), h: asc + desc };
}

/** Contornos dos glifos do run (twips) como segmentos de caminho; null sem contornos (CFF). */
export function runOutlineSegs(it: GlyphRunItem): PathSeg[][] | null {
  const f = it.face.font;
  if (!f.glyphOutline) return null;
  const upem = f.metrics.unitsPerEm || 1000;
  const s = (it.sizePt * 20) / upem, sx = s * (it.scaleX ?? 1);
  const skew = it.synthItalic ? 0.21 : 0;
  const subs: PathSeg[][] = [];
  for (const g of it.glyphs) {
    const ol = f.glyphOutline(g.gid ?? f.glyphId(g.cp));
    if (!ol) continue;
    const X = (x: number, y: number): number => g.x + x * sx + skew * y * s;
    const Y = (y: number): number => it.y - y * s;
    let cur: PathSeg[] = [];
    for (const c of ol) {
      if (c.op === 'M') { if (cur.length) subs.push(cur); cur = [{ c: 'M', x: X(c.x, c.y), y: Y(c.y) }]; }
      else if (c.op === 'L') cur.push({ c: 'L', x: X(c.x, c.y), y: Y(c.y) });
      else if (c.op === 'Q') cur.push({ c: 'Q', x1: X(c.cx, c.cy), y1: Y(c.cy), x: X(c.x, c.y), y: Y(c.y) });
      // (Z: os subcaminhos fecham sozinhos no preenchimento)
    }
    if (cur.length) subs.push(cur);
  }
  return subs;
}

/**
 * As camadas dos efeitos (atrás do texto) numa grade de `ppt` pixels por ponto: a sombra
 * externa, o brilho e o reflexo, a partir da silhueta do run (preenchida + contorno).
 * `x0`/`y0` = canto da grade em twips. RGBA pré-multiplicado não: alfa direto.
 */
export function fxLayers(it: GlyphRunItem, fx: ResolvedTextFx, ppt: number, textHex: string): { data: Uint8ClampedArray; w: number; h: number; x0: number; y0: number } | null {
  if (!fx.shadow && !fx.glow && !fx.reflection) return null;
  const subs = runOutlineSegs(it);
  if (!subs) return null;
  const box = runBox(it);
  const mg = fxMarginPt(fx, box.h / 20);
  const x0 = box.x - mg.l * 20, y0 = box.y - mg.t * 20;
  const W = Math.max(1, Math.ceil((box.w / 20 + mg.l + mg.r) * ppt)), H = Math.max(1, Math.ceil((box.h / 20 + mg.t + mg.b) * ppt));
  if (W * H > 2.4e7) return null;
  const tw = ppt / 20;
  let sil = fillPolygons(newMask(W, H), flattenPath(subs, [tw, 0, 0, tw, -x0 * tw, -y0 * tw], 0.35));
  // contorno: a silhueta cresce meia espessura (o brilho e a sombra seguem a linha)
  if (fx.outline) {
    const r = (fx.outline.widthPt / 2) * ppt;
    if (r >= 0.5) sil = dilate(sil, r);
  }
  const bx = { x: (box.x - x0) * tw, y: (box.y - y0) * tw, w: box.w * tw, h: box.h * tw };
  const rgba = new Float32Array(W * H * 4);
  const over = (m: Mask, hex: string, alpha: number): void => {
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    for (let i = 0; i < m.a.length; i++) {
      const a = Math.max(0, Math.min(1, m.a[i]! * alpha));
      if (a <= 0) continue;
      const k = i * 4, da = rgba[k + 3]!, oa = a + da * (1 - a);
      rgba[k] = (r * a + rgba[k]! * da * (1 - a)) / oa;
      rgba[k + 1] = (g * a + rgba[k + 1]! * da * (1 - a)) / oa;
      rgba[k + 2] = (b * a + rgba[k + 2]! * da * (1 - a)) / oa;
      rgba[k + 3] = oa;
    }
  };
  if (fx.reflection) {
    // o texto espelhado em volta da borda de baixo, com o degradê de alfa (a cor do texto)
    const r = fx.reflection;
    const a = (r.dirDeg * Math.PI) / 180;
    const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
    let m = newMask(W, H);
    const bottom = bx.y + bx.h;
    for (let y = 0; y < H; y++) {
      const sy = Math.round(2 * bottom + dy - y - 1);
      const t = (y + 0.5 - (bottom + dy)) / bx.h;
      const al = t < 0 ? 0 : reflectionAlpha(t, r);
      if (sy < 0 || sy >= H || al <= 0) continue;
      for (let x = 0; x < W; x++) {
        const sx = Math.round(x - dx);
        if (sx >= 0 && sx < W) m.a[y * W + x] = sil.a[sy * W + sx]! * al;
      }
    }
    if (r.blurPt > 0) m = gaussianBlur(m, (r.blurPt / 3) * ppt);
    over(m, textHex, 1);
  }
  if (fx.shadow) {
    const s = fx.shadow;
    over(outerShadowMask(sil, bx, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt), s.hex, s.alpha);
  }
  if (fx.glow) over(glowMask(sil, fx.glow.radPt, ppt), fx.glow.hex, fx.glow.alpha);
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < rgba.length; i++) data[i] = i % 4 === 3 ? Math.round(rgba[i]! * 255) : Math.round(rgba[i]!);
  return { data, w: W, h: H, x0, y0 };
}

/** Dilatação simples (máximo num disco de raio r px). */
function dilate(m: Mask, r: number): Mask {
  const R = Math.ceil(r);
  const out = newMask(m.w, m.h);
  const offs: [number, number][] = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    let v = 0;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
      const a = m.a[yy * m.w + xx]!;
      if (a > v) { v = a; if (v >= 1) break; }
    }
    out.a[y * m.w + x] = v;
  }
  return out;
}

/** Tracejado DrawingML (w14:prstDash) em múltiplos da espessura. */
export function dashPattern(dash: string | undefined): number[] {
  switch (dash) {
    case 'dot': return [1, 1];
    case 'sysDot': return [1, 1];
    case 'sysDash': return [3, 1];
    case 'dash': return [4, 3];
    case 'dashDot': return [4, 3, 1, 3];
    case 'lgDash': return [8, 3];
    case 'lgDashDot': return [8, 3, 1, 3];
    case 'lgDashDotDot': return [8, 3, 1, 3, 1, 3];
    case 'sysDashDot': return [3, 1, 1, 1];
    case 'sysDashDotDot': return [3, 1, 1, 1, 1, 1];
    default: return [];
  }
}
