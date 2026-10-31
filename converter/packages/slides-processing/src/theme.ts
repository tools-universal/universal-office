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
  // aplica aliases (tx1=dk1, bg1=lt1, …) p/ schemeClr val que use bg/tx
  for (const [alias, src] of Object.entries(STD_MAP)) if (colors[src]) colors[alias] = colors[src]!;
  const theme: Theme = { colors };
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
    if (mod.name === 'a:shade') base = scaleLum(base, val);             // -> preto
    else if (mod.name === 'a:tint') base = mixWhite(base, val);          // -> branco
    else if (mod.name === 'a:lumMod') base = scaleLum(base, val);
    else if (mod.name === 'a:lumOff') base = offsetLum(base, val);
  }
  return base;
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
/** Multiplica cada canal (shade<1 escurece; lumMod). */
function scaleLum(h: string, f: number): string { const [r, g, b] = rgb(h); return hex(r * f, g * f, b * f); }
/** Soma luminosidade (lumOff): empurra em direcao ao branco proporcionalmente. */
function offsetLum(h: string, f: number): string { const [r, g, b] = rgb(h); return hex(r + 255 * f, g + 255 * f, b + 255 * f); }
/** Mistura com branco por fator (tint). */
function mixWhite(h: string, f: number): string { const [r, g, b] = rgb(h); return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); }

const PRESET: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF',
  yellow: '#FFFF00', gray: '#808080', grey: '#808080',
};
