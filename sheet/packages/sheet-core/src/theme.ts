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

/**
 * Paleta padrão — fallback quando o pacote não traz theme1.xml. O Excel atual
 * usa o tema Office 2023+ nesse caso (medido: degradê até theme=4 de uma pasta
 * sem tema termina em #156082, não no #4472C4 do tema 2013).
 */
export const DEFAULT_THEME_COLORS: readonly string[] = [
  '#FFFFFF', // 0 lt1 (background1)
  '#000000', // 1 dk1 (text1)
  '#E8E8E8', // 2 lt2
  '#0E2841', // 3 dk2
  '#156082', '#E97132', '#196B24', '#0F9ED5', '#A02B93', '#4EA72E', // 4-9 accent1-6
  '#467886', // 10 hyperlink
  '#96607D', // 11 followedHyperlink
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
export function themePath(pkg: XlsxPackage): string {
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
 * escurece (<0) a LUMINOSIDADE em HLS. tint<0 → L·(1+tint); tint>0 →
 * L·(1−tint) + HLSMAX·tint.
 *
 * Medido no Excel (COM: as ~2.900 cores resolvidas dos 144 estilos de
 * tabela/dinâmica built-in, 40 pares cor×tint distintos — 40/40 exatos): a
 * conversão é a RGB↔HLS INTEIRA do Windows (KB Q29240, HLSMAX = 240 — a
 * fórmula HSL em ponto flutuante erra até 3 níveis); o tint vale com 4 casas
 * (o gravado 0.79998168889431442 age como 0.8); L' truncado; cinza (S = 0)
 * volta arredondado: (L·255 + 120)/240. Ex.: accent1 #156082 + 0.8 ⇒ #C0E6F5.
 */
export function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const m = /#?([0-9a-fA-F]{6})/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const [h, l, s] = rgbToHls((n >> 16) & 255, (n >> 8) & 255, n & 255);
  const t = Math.round(tint * 1e4) / 1e4;
  const l2 = Math.floor(t < 0 ? l * (1 + t) : l * (1 - t) + (HLSMAX - HLSMAX * (1 - t)));
  const [r, g, b] = hlsToRgb(h, Math.max(0, Math.min(HLSMAX, l2)), s);
  const to = (x: number): string => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

const HLSMAX = 240;
const RGBMAX = 255;
const idiv = (a: number, b: number): number => Math.trunc(a / b);

/** RGB → HLS inteiro (0..240) do Windows (KB Q29240). */
function rgbToHls(R: number, G: number, B: number): [number, number, number] {
  const cMax = Math.max(R, G, B), cMin = Math.min(R, G, B);
  const L = idiv((cMax + cMin) * HLSMAX + RGBMAX, 2 * RGBMAX);
  if (cMax === cMin) return [idiv(HLSMAX * 2, 3), L, 0];
  const S = L <= HLSMAX / 2
    ? idiv((cMax - cMin) * HLSMAX + idiv(cMax + cMin, 2), cMax + cMin)
    : idiv((cMax - cMin) * HLSMAX + idiv(2 * RGBMAX - cMax - cMin, 2), 2 * RGBMAX - cMax - cMin);
  const d = (X: number): number => idiv((cMax - X) * (HLSMAX / 6) + idiv(cMax - cMin, 2), cMax - cMin);
  let H = R === cMax ? d(B) - d(G) : G === cMax ? HLSMAX / 3 + d(R) - d(B) : (2 * HLSMAX) / 3 + d(G) - d(R);
  if (H < 0) H += HLSMAX;
  if (H > HLSMAX) H -= HLSMAX;
  return [H, L, S];
}

function hueToRgb(n1: number, n2: number, h: number): number {
  if (h < 0) h += HLSMAX;
  if (h > HLSMAX) h -= HLSMAX;
  if (h < HLSMAX / 6) return n1 + idiv((n2 - n1) * h + HLSMAX / 12, HLSMAX / 6);
  if (h < HLSMAX / 2) return n2;
  if (h < (HLSMAX * 2) / 3) return n1 + idiv((n2 - n1) * ((HLSMAX * 2) / 3 - h) + HLSMAX / 12, HLSMAX / 6);
  return n1;
}

/** HLS inteiro → RGB (KB Q29240; o cinza arredonda, como o Excel). */
function hlsToRgb(H: number, L: number, S: number): [number, number, number] {
  if (S === 0) { const v = idiv(L * RGBMAX + HLSMAX / 2, HLSMAX); return [v, v, v]; }
  const m2 = L <= HLSMAX / 2 ? idiv(L * (HLSMAX + S) + HLSMAX / 2, HLSMAX) : L + S - idiv(L * S + HLSMAX / 2, HLSMAX);
  const m1 = 2 * L - m2;
  const ch = (h: number): number => idiv(hueToRgb(m1, m2, h) * RGBMAX + HLSMAX / 2, HLSMAX);
  return [ch(H + HLSMAX / 3), ch(H), ch(H - HLSMAX / 3)];
}
