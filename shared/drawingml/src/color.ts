/**
 * Modificadores de cor do DrawingML (a:shade, a:tint, a:lumMod, a:satMod…) sobre
 * uma cor sRGB 0..1, na ordem do documento e em ponto flutuante. Medido no
 * PowerPoint (2026-10-14) e conferido no Word (recolorir, write/tools/image-lab
 * recolor-probe: o contorno padrão das formas, accent1 shade 50%, é #2F528F):
 * - shade/tint em RGB LINEAR com a curva sRGB exata (val = fração da cor que fica);
 *   entre a:gamma e a:invGamma, no sRGB;
 * - lumMod/lumOff/lum na luminância HSL (matiz e saturação preservados);
 * - sat/hue em HSL, saturação SEM teto (S > 1 vai ao RGB e só os canais são cortados);
 * - gray = luma Rec. 709; comp = matiz +180°; inv = 1 − c.
 * Os alfas (a:alpha, alphaMod, alphaOff) ficam com quem chama.
 */
export type Rgb = [number, number, number];

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export function srgbToLin(v: number): number { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
export function linToSrgb(v: number): number { v = clamp01(v); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }

/** Ajuste em HSL (h cíclico; s sem teto — o RGB resultante é cortado em 0..1). */
function hsl(c: Rgb, f: (h: number, s: number, l: number) => [number, number, number]): Rgb {
  const [rf, gf, bf] = c;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  let [h2, s2, l2] = f(h, s, l);
  h2 = ((h2 % 1) + 1) % 1;
  l2 = clamp01(l2);
  const k = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = k * (1 - Math.abs(((h2 * 6) % 2) - 1));
  const m = l2 - k / 2;
  const seg = Math.floor(h2 * 6) % 6;
  const [r2, g2, b2] = seg === 0 ? [k, x, 0] : seg === 1 ? [x, k, 0] : seg === 2 ? [0, k, x] : seg === 3 ? [0, x, k] : seg === 4 ? [x, 0, k] : [k, 0, x];
  return [clamp01(r2 + m), clamp01(g2 + m), clamp01(b2 + m)];
}

/** Aplica os modificadores (`[nome sem prefixo, val em 1/100000]`) em ordem. */
export function applyColorMods(c: Rgb, mods: readonly (readonly [string, number | undefined])[]): Rgb {
  let srgbMode = false;
  for (const [name, raw] of mods) {
    if (name === 'gamma') { srgbMode = true; continue; }
    if (name === 'invGamma') { srgbMode = false; continue; }
    if (name === 'comp') { c = hsl(c, (h, s, l) => [h + 0.5, s, l]); continue; }
    if (name === 'inv') { c = [1 - c[0], 1 - c[1], 1 - c[2]]; continue; }
    if (name === 'gray') { const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; c = [y, y, y]; continue; }
    if (raw === undefined || !Number.isFinite(raw)) continue;
    const val = raw / 100000;
    switch (name) {
      case 'shade': c = c.map((v) => (srgbMode ? v * val : linToSrgb(srgbToLin(v) * val))) as Rgb; break;
      case 'tint': c = c.map((v) => (srgbMode ? v * val + (1 - val) : linToSrgb(srgbToLin(v) * val + (1 - val)))) as Rgb; break;
      case 'lumMod': c = hsl(c, (h, s, l) => [h, s, clamp01(l * val)]); break;
      case 'lumOff': c = hsl(c, (h, s, l) => [h, s, clamp01(l + val)]); break;
      case 'lum': c = hsl(c, (h, s) => [h, s, clamp01(val)]); break;
      case 'satMod': c = hsl(c, (h, s, l) => [h, Math.max(0, s * val), l]); break;
      case 'satOff': c = hsl(c, (h, s, l) => [h, Math.max(0, s + val), l]); break;
      case 'sat': c = hsl(c, (h, _s, l) => [h, Math.max(0, val), l]); break;
      case 'hueMod': c = hsl(c, (h, s, l) => [h * val, s, l]); break;
      case 'hueOff': c = hsl(c, (h, s, l) => [h + raw / 21600000, s, l]); break;
      case 'hue': c = hsl(c, (_h, s, l) => [raw / 21600000, s, l]); break;
      default: break; // red/green/blue(Mod/Off): não medidos
    }
  }
  return c;
}
