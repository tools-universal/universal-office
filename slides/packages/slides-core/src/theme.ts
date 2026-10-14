import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import type { PptxPackage } from './package.js';
import type { Theme } from './model.js';

/** clrMap padrao (master): aliases tx/bg -> dk/lt. */
const STD_MAP: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };

/** Le ppt/theme/themeN.xml -> mapa de cores do tema. */
export function readTheme(pkg: PptxPackage, themePath: string): Theme {
  const colors: Record<string, string> = {};
  const xml = pkg.getPartText(themePath);
  if (xml === undefined) return { colors };
  const root = parseXml(xml);
  const themeEls = firstChild(root, 'a:themeElements');
  const scheme = themeEls ? firstChild(themeEls, 'a:clrScheme') : undefined;
  if (scheme) {
    for (const el of childElements(scheme)) {
      const key = el.name.replace(/^a:/, '');
      const c = colorFromDml(childElements(el)[0], { colors });
      if (c) colors[key] = c;
    }
  }
  const raw = { ...colors };
  // aplica aliases (tx1=dk1, bg1=lt1, …) p/ schemeClr val que use bg/tx;
  // o clrMap REAL do master/slide entra depois (applyClrMap)
  for (const [alias, src] of Object.entries(STD_MAP)) if (colors[src]) colors[alias] = colors[src]!;
  const theme: Theme = { colors, scheme: raw, part: themePath };
  // fmtScheme > lnStyleLst: larguras que o <a:lnRef idx> referencia
  const fmtScheme = themeEls ? firstChild(themeEls, 'a:fmtScheme') : undefined;
  const lnList = fmtScheme ? firstChild(fmtScheme, 'a:lnStyleLst') : undefined;
  if (lnList) {
    const widths: number[] = [];
    for (const ln of childElements(lnList, 'a:ln')) {
      widths.push(ln.attrs['w'] !== undefined ? parseInt(ln.attrs['w'], 10) : 9525);
    }
    if (widths.length) theme.lineWidths = widths;
  }
  const fills = fmtScheme ? firstChild(fmtScheme, 'a:fillStyleLst') : undefined;
  if (fills) theme.fillStyles = childElements(fills);
  const bgFills = fmtScheme ? firstChild(fmtScheme, 'a:bgFillStyleLst') : undefined;
  if (bgFills) theme.bgFillStyles = childElements(bgFills);
  // fontScheme: tipografia major/minor p/ resolver "+mj-lt" / "+mn-lt"
  const fontScheme = themeEls ? firstChild(themeEls, 'a:fontScheme') : undefined;
  if (fontScheme) {
    const majLatin = firstChild(fontScheme, 'a:majorFont');
    const minLatin = firstChild(fontScheme, 'a:minorFont');
    const major = majLatin ? firstChild(majLatin, 'a:latin')?.attrs['typeface'] : undefined;
    const minor = minLatin ? firstChild(minLatin, 'a:latin')?.attrs['typeface'] : undefined;
    if (major || minor) {
      theme.fonts = {};
      if (major) theme.fonts.major = major;
      if (minor) theme.fonts.minor = minor;
    }
  }
  return theme;
}

/**
 * Aplica um `<p:clrMap>` (atributos bg1/tx1/bg2/tx2/accent1…/hlink/folHlink →
 * nome do clrScheme). Tema escuro = `bg1="dk1" tx1="lt1"`: sem isso o fundo e
 * o texto saem trocados. Devolve um tema NOVO (o do master fica intacto).
 */
export function applyClrMap(theme: Theme, map: Record<string, string> | undefined): Theme {
  if (!map || !theme.scheme) return theme;
  const colors = { ...theme.colors };
  for (const [alias, src] of Object.entries(map)) {
    const c = theme.scheme[src];
    if (c) colors[alias] = c;
  }
  return { ...theme, colors };
}

/** Atributos de um `<p:clrMap>`/`<a:overrideClrMapping>` → mapa alias → cor do esquema. */
export function clrMapAttrs(el: XmlElement | undefined): Record<string, string> | undefined {
  if (!el) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(el.attrs)) if (!k.includes(':') && v) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}

/** Resolve um elemento de cor DrawingML (srgbClr/schemeClr/sysClr/prstClr) -> #RRGGBB. */
export function colorFromDml(el: XmlElement | undefined, theme: Theme): string | undefined {
  if (!el) return undefined;
  let base: string | undefined;
  if (el.name === 'a:srgbClr') base = '#' + (el.attrs['val'] ?? '000000');
  else if (el.name === 'a:sysClr') base = '#' + (el.attrs['lastClr'] ?? '000000');
  else if (el.name === 'a:prstClr') base = PRESET[el.attrs['val'] ?? 'black'] ?? '#000000';
  else if (el.name === 'a:schemeClr') {
    const v = el.attrs['val'] ?? '';
    base = theme.colors[v] ?? theme.colors[STD_MAP[v] ?? v] ?? '#000000';
  }
  if (base === undefined) return undefined;
  // modificadores de luminancia/saturacao (subconjunto comum)
  for (const mod of childElements(el)) {
    const val = mod.attrs['val'] !== undefined ? parseInt(mod.attrs['val'], 10) / 100000 : undefined;
    if (val === undefined) continue;
    // shade/tint operam em RGB LINEAR (gamma ~2.2) no app de referência —
    // verificado no estilo de tabela (accent1 tint 40% => #CAD1D7, não #A1BFCD).
    if (mod.name === 'a:shade') base = mixLinear(base, 0, val);          // -> preto
    // tint: `val` é a fração da COR que permanece (val=20% => 20% cor + 80% branco)
    else if (mod.name === 'a:tint') base = mixLinear(base, 1, val);
    // lumMod/lumOff operam na LUMINÂNCIA HSL (mantêm matiz/saturação — o
    // "claro" do tema fica azul vívido, não cinza; verificado no deck de formas)
    else if (mod.name === 'a:lumMod') base = lumHsl(base, val, 0);
    else if (mod.name === 'a:lumOff') base = lumHsl(base, 1, val);
    else if (mod.name === 'a:lum') base = lumHsl(base, 0, val);
    // saturação/matiz em HSL (temas 2007–2013: degradês com satMod 150–350%)
    else if (mod.name === 'a:satMod') base = hslAdjust(base, (h, s, l) => [h, s * val, l]);
    else if (mod.name === 'a:satOff') base = hslAdjust(base, (h, s, l) => [h, s + val, l]);
    else if (mod.name === 'a:sat') base = hslAdjust(base, (h, _s, l) => [h, val, l]);
    else if (mod.name === 'a:hueMod') base = hslAdjust(base, (h, s, l) => [h * val, s, l]);
    else if (mod.name === 'a:hueOff') base = hslAdjust(base, (h, s, l) => [h + (val * 100000) / 21600000, s, l]);
    else if (mod.name === 'a:hue') base = hslAdjust(base, (_h, s, l) => [(val * 100000) / 21600000, s, l]);
  }
  // modificadores SEM val
  for (const mod of childElements(el)) {
    if (mod.name === 'a:comp') base = hslAdjust(base, (h, s, l) => [h + 0.5, s, l]);
    else if (mod.name === 'a:inv') { const [r, g, b] = rgb(base); base = hex(255 - r, 255 - g, 255 - b); }
    else if (mod.name === 'a:gray') { const [r, g, b] = rgb(base); const y = 0.299 * r + 0.587 * g + 0.114 * b; base = hex(y, y, y); }
  }
  return base;
}

/** Ajuste em HSL (h 0..1 cíclico, s e l 0..1 com clamp). */
function hslAdjust(hexIn: string, f: (h: number, s: number, l: number) => [number, number, number]): string {
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
    h /= 6; if (h < 0) h += 1;
  }
  let [h2, s2, l2] = f(h, s, l);
  h2 = ((h2 % 1) + 1) % 1; s2 = Math.max(0, Math.min(1, s2)); l2 = Math.max(0, Math.min(1, l2));
  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h2 * 6) % 2) - 1));
  const m = l2 - c / 2;
  const seg = Math.floor(h2 * 6) % 6;
  const [r2, g2, b2] = seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x] : seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x];
  return hex((r2 + m) * 255, (g2 + m) * 255, (b2 + m) * 255);
}

/**
 * Cor de TEXTO de um rPr/defRPr: `<a:solidFill>`; com `<a:gradFill>` (títulos de
 * temas 2007–2013), a cor do stop do meio — aproximação até o texto em degradê.
 */
export function textFillColor(parent: XmlElement, theme: Theme): string | undefined {
  const sc = solidFillColor(parent, theme);
  if (sc) return sc;
  const gf = firstChild(parent, 'a:gradFill');
  const gs = gf ? firstChild(gf, 'a:gsLst') : undefined;
  const stops = gs ? childElements(gs, 'a:gs') : [];
  const mid = stops[Math.floor(stops.length / 2)];
  return mid ? colorFromDml(childElements(mid)[0], theme) : undefined;
}

/** Acha <a:solidFill> dentro de `parent` e resolve a cor. */
export function solidFillColor(parent: XmlElement, theme: Theme): string | undefined {
  const sf = firstChild(parent, 'a:solidFill');
  if (!sf) return undefined;
  return colorFromDml(childElements(sf)[0], theme);
}

function rgb(hex: string): [number, number, number] {
  const m = /#?([0-9a-fA-F]{6})/.exec(hex); if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
/**
 * Transforma a luminância HSL: L' = L·mod + off (matiz/saturação preservados).
 * É a semântica de `a:lumMod`/`a:lumOff` do app de referência. Exportada para
 * o sombreado de faces 3D (can/cube) no renderer.
 */
export function lumHsl(hexIn: string, mod: number, off: number): string {
  const [r, g, b] = rgb(hexIn);
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
  let hh = 0, s = 0;
  let l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rf) hh = ((gf - bf) / d) % 6;
    else if (max === gf) hh = (bf - rf) / d + 2;
    else hh = (rf - gf) / d + 4;
    hh /= 6; if (hh < 0) hh += 1;
  }
  l = Math.max(0, Math.min(1, l * mod + off));
  // HSL -> RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh * 6) % 2) - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  const seg = Math.floor(hh * 6) % 6;
  if (seg === 0) { r2 = c; g2 = x; }
  else if (seg === 1) { r2 = x; g2 = c; }
  else if (seg === 2) { g2 = c; b2 = x; }
  else if (seg === 3) { g2 = x; b2 = c; }
  else if (seg === 4) { r2 = x; b2 = c; }
  else { r2 = c; b2 = x; }
  return hex((r2 + m) * 255, (g2 + m) * 255, (b2 + m) * 255);
}
/**
 * Mistura em RGB LINEAR: canal' = srgb⁻¹(lin(canal)·f + alvo·(1-f)).
 * `target` 0 = preto (shade), 1 = branco (tint); `f` = fração da COR original.
 */
function mixLinear(h: string, target: 0 | 1, f: number): string {
  const [r, g, b] = rgb(h);
  const lin = (v: number): number => Math.pow(v / 255, 2.2);
  const srgb = (v: number): number => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
  const mix = (v: number): number => srgb(lin(v) * f + target * (1 - f));
  return hex(mix(r), mix(g), mix(b));
}
/** Soma luminosidade (lumOff): empurra em direcao ao branco proporcionalmente. */
function offsetLum(h: string, f: number): string { const [r, g, b] = rgb(h); return hex(r + 255 * f, g + 255 * f, b + 255 * f); }
/** Mistura com branco por fator (tint). */
function mixWhite(h: string, f: number): string { const [r, g, b] = rgb(h); return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); }

const PRESET: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF',
  yellow: '#FFFF00', gray: '#808080', grey: '#808080',
};
