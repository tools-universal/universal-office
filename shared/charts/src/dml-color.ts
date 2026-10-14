/**
 * Cor DrawingML (`a:srgbClr`/`a:schemeClr`/`a:sysClr`/`a:prstClr` + modificadores)
 * para hospedeiros que não têm resolvedor próprio (o Sheet: o tema do .xlsx é
 * indexado, sem DrawingML). Mesma matemática do Slides, medida no app:
 * shade/tint em RGB LINEAR (val = fração da cor que fica), lumMod/lumOff na
 * luminância HSL (matiz/saturação preservados), sat/hue em HSL.
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
  // <a:gamma/> … <a:invGamma/>: shade/tint entre eles no sRGB
  let srgbMode = false;
  for (const mod of childElements(el)) {
    if (mod.name === 'a:gamma') { srgbMode = true; continue; }
    if (mod.name === 'a:invGamma') { srgbMode = false; continue; }
    const raw = mod.attrs['val'];
    if (raw === undefined) continue;
    const val = parseInt(raw, 10) / 100000;
    switch (mod.name) {
      case 'a:shade': base = srgbMode ? mixSrgb(base, 0, val) : mixLinear(base, 0, val); break;
      case 'a:tint': base = srgbMode ? mixSrgb(base, 1, val) : mixLinear(base, 1, val); break;
      case 'a:lumMod': base = hsl(base, (h, s, l) => [h, s, l * val]); break;
      case 'a:lumOff': base = hsl(base, (h, s, l) => [h, s, l + val]); break;
      case 'a:lum': base = hsl(base, (h, s) => [h, s, val]); break;
      case 'a:satMod': base = hsl(base, (h, s, l) => [h, s * val, l]); break;
      case 'a:satOff': base = hsl(base, (h, s, l) => [h, s + val, l]); break;
      case 'a:sat': base = hsl(base, (h, _s, l) => [h, val, l]); break;
      case 'a:hueMod': base = hsl(base, (h, s, l) => [h * val, s, l]); break;
      case 'a:hueOff': base = hsl(base, (h, s, l) => [h + (val * 100000) / 21600000, s, l]); break;
      case 'a:hue': base = hsl(base, (_h, s, l) => [(val * 100000) / 21600000, s, l]); break;
      default: break;
    }
  }
  for (const mod of childElements(el)) {
    if (mod.name === 'a:comp') base = hsl(base, (h, s, l) => [h + 0.5, s, l]);
    else if (mod.name === 'a:inv') { const [r, g, b] = rgb(base); base = hex(255 - r, 255 - g, 255 - b); }
    else if (mod.name === 'a:gray') { const [r, g, b] = rgb(base); const y = 0.299 * r + 0.587 * g + 0.114 * b; base = hex(y, y, y); }
  }
  return base.toUpperCase();
}

function rgb(h: string): [number, number, number] {
  const m = /#?([0-9a-fA-F]{6})/.exec(h);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

function mixLinear(h: string, target: 0 | 1, f: number): string {
  const [r, g, b] = rgb(h);
  const lin = (v: number) => Math.pow(v / 255, 2.2);
  const srgb = (v: number) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
  const mix = (v: number) => srgb(lin(v) * f + target * (1 - f));
  return hex(mix(r), mix(g), mix(b));
}

function mixSrgb(h: string, target: 0 | 1, f: number): string {
  const [r, g, b] = rgb(h);
  const mix = (v: number) => v * f + target * 255 * (1 - f);
  return hex(mix(r), mix(g), mix(b));
}

function hsl(hexIn: string, f: (h: number, s: number, l: number) => [number, number, number]): string {
  const [r, g, b] = rgb(hexIn);
  const rf = r / 255, gf = g / 255, bf = b / 255;
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
  s2 = Math.max(0, Math.min(1, s2));
  l2 = Math.max(0, Math.min(1, l2));
  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h2 * 6) % 2) - 1));
  const m = l2 - c / 2;
  const seg = Math.floor(h2 * 6) % 6;
  const [r2, g2, b2] = seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x] : seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x];
  return hex((r2 + m) * 255, (g2 + m) * 255, (b2 + m) * 255);
}
