/** Aritmética de cor das cores AUTOMÁTICAS do gráfico (o resto vem resolvido do hospedeiro). */

export function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Luminância HSL ajustada: f < 0 escurece (fração), f > 0 clareia em direção ao branco. */
export function adjustLum(hex: string, f: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const l2 = f < 0 ? l * (1 + f) : l + (1 - l) * f;
  return rgbToHex(...hslToRgb(h, s, l2));
}

/** Mistura linear com o branco (t=1 → branco). */
export function mixWhite(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** `a:tint` DrawingML (RGB linear, gama 2,2): `keep` = fração da cor que fica. */
export function tintLinear(hex: string, keep: number): string {
  const [r, g, b] = hexToRgb(hex);
  // curva sRGB exata (medido: tx1 tint 75% → #898989)
  const f = (v: number) => toSrgb(toLin(v) * keep + (1 - keep));
  return rgbToHex(f(r), f(g), f(b));
}

export function rgba(hex: string, alpha = 1): string {
  if (alpha >= 1) return hex;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const toLin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toSrgb = (v: number) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/**
 * Variação automática do Office (séries além da paleta, estilos monocromáticos):
 * f < 0 escurece, f > 0 clareia — em RGB LINEAR, peso ≈ 1,41·|f| (medido: f=±1/6
 * e ±1/4 batem com o app em todos os canais).
 */
export function chartShadeTint(hex: string, f: number): string {
  if (f === 0) return hex;
  const k = Math.min(1, Math.abs(f) * 1.41);
  const [r, g, b] = hexToRgb(hex).map(toLin) as [number, number, number];
  const m = (v: number) => (f < 0 ? v * (1 - k) : v + (1 - v) * k);
  return rgbToHex(toSrgb(m(r)), toSrgb(m(g)), toSrgb(m(b)));
}
