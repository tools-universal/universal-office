/**
 * Cor DrawingML (`a:srgbClr`/`a:schemeClr`/`a:sysClr`/`a:prstClr` + modificadores)
 * para hospedeiros que não têm resolvedor próprio (o Sheet: o tema do .xlsx é
 * indexado, sem DrawingML). Mesma matemática do Slides, medida no app:
 * shade/tint em RGB LINEAR (curva sRGB exata; val = fração da cor que fica), lumMod/lumOff na
 * luminância HSL (matiz/saturação preservados), sat/hue em HSL (S sem teto).
 */
import { childElements, type XmlNode } from './xml.js';

/** Aliases do clrMap padrão. */
const STD_MAP: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };

const PRESET: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF',
  yellow: '#FFFF00', gray: '#808080', grey: '#808080', darkGray: '#A9A9A9', lightGray: '#D3D3D3',
};

/** `scheme`: cores por nome do clrScheme (dk1, lt1, accent1…; tx1/bg1 caem no clrMap padrão). */
export function dmlColor(el: XmlNode | undefined, scheme: Record<string, string>): string | undefined {
  if (!el) return undefined;
  let base: string | undefined;
  if (el.name === 'a:srgbClr') base = '#' + (el.attrs['val'] ?? '000000').slice(-6);
  else if (el.name === 'a:sysClr') base = '#' + (el.attrs['lastClr'] ?? (el.attrs['val'] === 'window' ? 'FFFFFF' : '000000'));
  else if (el.name === 'a:prstClr') base = PRESET[el.attrs['val'] ?? 'black'] ?? '#000000';
  else if (el.name === 'a:schemeClr') {
    const v = el.attrs['val'] ?? '';
    base = scheme[v] ?? scheme[STD_MAP[v] ?? v] ?? '#000000';
  }
  if (base === undefined) return undefined;
  // em ponto flutuante, na ordem do documento; <a:gamma/> … <a:invGamma/>: shade/tint no sRGB
  let c = rgbF(base);
  let srgbMode = false, touched = false;
  for (const mod of childElements(el)) {
    if (mod.name === 'a:gamma') { srgbMode = true; continue; }
    if (mod.name === 'a:invGamma') { srgbMode = false; continue; }
    if (mod.name !== 'a:alpha' && mod.name !== 'a:alphaMod' && mod.name !== 'a:alphaOff') touched = true;
    if (mod.name === 'a:comp') { c = hsl(c, (h, s, l) => [h + 0.5, s, l]); continue; }
    if (mod.name === 'a:inv') { c = [1 - c[0], 1 - c[1], 1 - c[2]]; continue; }
    if (mod.name === 'a:gray') { const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; c = [y, y, y]; continue; } // Rec. 709 (medido)
    const raw = mod.attrs['val'];
    if (raw === undefined) continue;
    const val = parseInt(raw, 10) / 100000;
    switch (mod.name) {
      // shade/tint em RGB linear com a curva sRGB exata (medido: 04617B shade 15% → 012430)
      case 'a:shade': c = c.map((v) => (srgbMode ? v * val : linToSrgb(srgbToLin(v) * val))) as Rgb; break;
      case 'a:tint': c = c.map((v) => (srgbMode ? v * val + (1 - val) : linToSrgb(srgbToLin(v) * val + (1 - val)))) as Rgb; break;
      case 'a:lumMod': c = hsl(c, (h, s, l) => [h, s, clamp01(l * val)]); break;
      case 'a:lumOff': c = hsl(c, (h, s, l) => [h, s, clamp01(l + val)]); break;
      case 'a:lum': c = hsl(c, (h, s) => [h, s, clamp01(val)]); break;
      // saturação sem teto: S > 1 vai ao RGB e só os canais são cortados (medido: satMod 320% → 00ABFE)
      case 'a:satMod': c = hsl(c, (h, s, l) => [h, Math.max(0, s * val), l]); break;
      case 'a:satOff': c = hsl(c, (h, s, l) => [h, Math.max(0, s + val), l]); break;
      case 'a:sat': c = hsl(c, (h, _s, l) => [h, Math.max(0, val), l]); break;
      case 'a:hueMod': c = hsl(c, (h, s, l) => [h * val, s, l]); break;
      case 'a:hueOff': c = hsl(c, (h, s, l) => [h + (val * 100000) / 21600000, s, l]); break;
      case 'a:hue': c = hsl(c, (_h, s, l) => [(val * 100000) / 21600000, s, l]); break;
      default: break;
    }
  }
  return (touched ? hex(c[0] * 255, c[1] * 255, c[2] * 255) : base).toUpperCase();
}

type Rgb = [number, number, number];
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
function srgbToLin(v: number): number { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function linToSrgb(v: number): number { v = clamp01(v); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }

function rgbF(h: string): Rgb {
  const m = /#?([0-9a-fA-F]{6})/.exec(h);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function hex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

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
