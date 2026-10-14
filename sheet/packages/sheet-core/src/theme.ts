import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import type { XlsxPackage } from './package.js';

/**
 * Tema do workbook (xl/theme/theme1.xml) + paleta indexada legada.
 *
 * O atributo `theme="N"` de um <color> NÃO segue a ordem do <a:clrScheme>
 * (dk1, lt1, dk2, lt2, accent1..6, hlink, folHlink): o app de referência troca
 * os pares claro/escuro — índice 0 = lt1 (background1), 1 = dk1 (text1),
 * 2 = lt2, 3 = dk2, 4..9 = accent1..6, 10 = hlink, 11 = folHlink.
 */

export interface Theme {
  /** Paleta indexável pelo atributo theme="N" (ordem trocada, ver acima). */
  colors: string[];
  /** Cores por nome do slot do clrScheme (dk1, lt1, accent1, …). */
  byName: Record<string, string>;
  /** Fontes do fontScheme (`+mj-lt`/`+mn-lt` dos gráficos). */
  fonts?: { major?: string; minor?: string };
  /** `a:fmtScheme/a:fillStyleLst` (preenchimentos com phClr — estilos de gráfico 17–32/41–48). */
  fillStyles?: XmlElement[];
}

/** Paleta Office padrão — fallback quando o pacote não traz theme1.xml. */
export const DEFAULT_THEME_COLORS: readonly string[] = [
  '#FFFFFF', // 0 lt1 (background1)
  '#000000', // 1 dk1 (text1)
  '#E7E6E6', // 2 lt2
  '#44546A', // 3 dk2
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', // 4-9 accent1-6
  '#0563C1', // 10 hyperlink
  '#954F72', // 11 followedHyperlink
];

/** Ordem dos slots no <a:clrScheme> → índice do atributo theme="N". */
const SLOT_TO_INDEX: Record<string, number> = {
  lt1: 0, dk1: 1, lt2: 2, dk2: 3,
  accent1: 4, accent2: 5, accent3: 6, accent4: 7, accent5: 8, accent6: 9,
  hlink: 10, folHlink: 11,
};

function defaultTheme(): Theme {
  const colors = [...DEFAULT_THEME_COLORS];
  const byName: Record<string, string> = {};
  for (const [slot, idx] of Object.entries(SLOT_TO_INDEX)) byName[slot] = colors[idx]!;
  return { colors, byName };
}

/** Resolve um filho de slot do clrScheme (srgbClr/sysClr) → #RRGGBB. */
function schemeSlotColor(slot: XmlElement): string | undefined {
  for (const c of childElements(slot)) {
    if (c.name === 'a:srgbClr') return '#' + (c.attrs['val'] ?? '000000').slice(-6).toUpperCase();
    if (c.name === 'a:sysClr') {
      const last = c.attrs['lastClr'];
      if (last !== undefined) return '#' + last.slice(-6).toUpperCase();
      // sem lastClr: assume os padrões do sistema
      return c.attrs['val'] === 'window' ? '#FFFFFF' : '#000000';
    }
  }
  return undefined;
}

/**
 * Lê xl/theme/theme1.xml → paleta do tema. Localiza o theme pelo rels do
 * workbook quando não está no caminho canônico. Fallback: paleta Office.
 */
export function readTheme(pkg: XlsxPackage): Theme {
  const xml = pkg.getPartText(themePath(pkg));
  if (xml === undefined) return defaultTheme();
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return defaultTheme(); }
  const themeEls = firstChild(root, 'a:themeElements');
  const scheme = themeEls ? firstChild(themeEls, 'a:clrScheme') : undefined;
  if (!scheme) return defaultTheme();
  const theme = defaultTheme(); // começa do fallback: slots ausentes mantêm o Office
  for (const slot of childElements(scheme)) {
    const name = slot.name.replace(/^a:/, '');
    const idx = SLOT_TO_INDEX[name];
    const color = schemeSlotColor(slot);
    if (color === undefined) continue;
    theme.byName[name] = color;
    if (idx !== undefined) theme.colors[idx] = color;
  }
  const fs = themeEls ? firstChild(themeEls, 'a:fontScheme') : undefined;
  const face = (k: string) => { const f = fs ? firstChild(fs, k) : undefined; return f ? firstChild(f, 'a:latin')?.attrs['typeface'] : undefined; };
  const major = face('a:majorFont'), minor = face('a:minorFont');
  if (major || minor) theme.fonts = { ...(major ? { major } : {}), ...(minor ? { minor } : {}) };
  const fmt = themeEls ? firstChild(themeEls, 'a:fmtScheme') : undefined;
  const fills = fmt ? firstChild(fmt, 'a:fillStyleLst') : undefined;
  if (fills) theme.fillStyles = childElements(fills);
  return theme;
}

/** Caminho da parte de tema (canônico ou via rels do workbook). */
function themePath(pkg: XlsxPackage): string {
  if (pkg.getPart('xl/theme/theme1.xml')) return 'xl/theme/theme1.xml';
  const rels = pkg.getPartText('xl/_rels/workbook.xml.rels');
  if (rels !== undefined) {
    try {
      const root = parseXml(rels);
      for (const rel of childElements(root, 'Relationship')) {
        if ((rel.attrs['Type'] ?? '').endsWith('/theme') && rel.attrs['Target'] !== undefined) {
          return pkg.resolveRelTarget('xl/workbook.xml', rel.attrs['Target']);
        }
      }
    } catch { /* rels inválido: cai no canônico */ }
  }
  return 'xl/theme/theme1.xml';
}

// ───────────────────────── Cores indexadas legadas ─────────────────────────

/**
 * Paleta indexada padrão completa (índices 0..65). 0-7 duplicam 8-15 (paleta
 * EGA); 64/65 são "system foreground/background". Pode ser sobrescrita por
 * <colors><indexedColors> em xl/styles.xml.
 */
export const INDEXED_COLORS_DEFAULT: readonly string[] = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', // 0-7
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', // 8-15
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080', // 16-23
  '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF', // 24-31
  '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080', '#800000', '#008080', '#0000FF', // 32-39
  '#00CCFF', '#CCFFFF', '#CCFFCC', '#FFFF99', '#99CCFF', '#FF99CC', '#CC99FF', '#FFCC99', // 40-47
  '#3366FF', '#33CCCC', '#99CC00', '#FFCC00', '#FF9900', '#FF6600', '#666699', '#969696', // 48-55
  '#003366', '#339966', '#003300', '#333300', '#993300', '#993366', '#333399', '#333333', // 56-63
  '#000000', // 64 system foreground (preto "auto")
  '#FFFFFF', // 65 system background
];

/**
 * Paleta indexada efetiva: padrão + override `<colors><indexedColors>` de
 * xl/styles.xml quando presente (arquivos legados redefinem a tabela inteira).
 */
export function readIndexedColors(pkg: XlsxPackage): string[] {
  const out = [...INDEXED_COLORS_DEFAULT];
  const xml = pkg.getPartText('xl/styles.xml');
  if (xml === undefined) return out;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return out; }
  const colorsEl = firstChild(root, 'colors');
  const idxEl = colorsEl ? firstChild(colorsEl, 'indexedColors') : undefined;
  if (!idxEl) return out;
  let i = 0;
  for (const rc of childElements(idxEl, 'rgbColor')) {
    const rgb = rc.attrs['rgb'];
    if (rgb !== undefined) out[i] = '#' + rgb.slice(-6).toUpperCase();
    i++;
  }
  return out;
}

// ───────────────────────── Resolução de cor ─────────────────────────

/** Contexto de resolução de cor: paleta do tema + tabela indexada efetiva. */
export interface ColorContext {
  theme: Theme;
  indexed: string[];
}

/** Monta o ColorContext do pacote (theme1.xml + indexedColors do styles.xml). */
export function colorContext(pkg: XlsxPackage): ColorContext {
  return { theme: readTheme(pkg), indexed: readIndexedColors(pkg) };
}

/** ColorContext padrão (sem pacote): paleta Office + indexadas padrão. */
export function defaultColorContext(): ColorContext {
  return { theme: defaultTheme(), indexed: [...INDEXED_COLORS_DEFAULT] };
}

/**
 * Resolve um elemento <color>/<fgColor>/<bgColor> (rgb/theme/indexed/auto)
 * para #RRGGBB, aplicando tint quando presente. Undefined = sem cor declarada.
 */
export function resolveColorEl(c: XmlElement, cx?: ColorContext): string | undefined {
  const ctx = cx ?? defaultColorContext();
  let base: string | undefined;
  const rgb = c.attrs['rgb'];
  const theme = c.attrs['theme'];
  const indexed = c.attrs['indexed'];
  if (rgb !== undefined) base = '#' + rgb.slice(-6);
  else if (theme !== undefined) base = ctx.theme.colors[parseInt(theme, 10)] ?? '#000000';
  else if (indexed !== undefined) base = ctx.indexed[parseInt(indexed, 10)] ?? '#000000';
  else if (c.attrs['auto'] === '1' || c.attrs['auto'] === 'true') base = '#000000';
  if (base === undefined) return undefined;
  const tint = c.attrs['tint'];
  return tint !== undefined ? applyTint(base, parseFloat(tint)) : base;
}

/**
 * Aplica `tint` (de -1 a 1) a uma cor, como o app de referência: clareia (>0) ou
 * escurece (<0) a LUMINOSIDADE em HSL. tint<0 → L·(1+tint); tint>0 →
 * L·(1−tint)+tint. (Fórmula validada no excel-lab, FINDINGS.md.)
 */
export function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const m = /#?([0-9a-fA-F]{6})/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const rf = ((n >> 16) & 255) / 255, gf = ((n >> 8) & 255) / 255, bf = (n & 255) / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
  let hh = 0, s = 0; let l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rf) hh = ((gf - bf) / d) % 6;
    else if (max === gf) hh = (bf - rf) / d + 2;
    else hh = (rf - gf) / d + 4;
    hh /= 6; if (hh < 0) hh += 1;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let R: number, G: number, B: number;
  if (s === 0) { R = G = B = l; }
  else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; R = hue2rgb(p, q, hh + 1 / 3); G = hue2rgb(p, q, hh); B = hue2rgb(p, q, hh - 1 / 3); }
  const to = (x: number): string => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0');
  return '#' + to(R) + to(G) + to(B);
}
