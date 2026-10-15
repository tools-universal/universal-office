import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import { colorContext, resolveColorEl, applyTint, type ColorContext } from './theme.js';
import type { XlsxPackage } from './package.js';

// re-export para compatibilidade (a fórmula vive em theme.ts agora)
export { applyTint };

/**
 * Leitura de xl/styles.xml. Modelamos o essencial para renderização:
 * cellXfs (registro referenciado pelo atributo `s` da célula), numFmts
 * (códigos de formato customizados), fonts (negrito/itálico/tamanho/cor/nome),
 * fills (sólido, padrões legados e gradiente 2 stops) e borders.
 * Cores theme/indexed são resolvidas contra o ColorContext (theme1.xml +
 * indexedColors) — fallback para as paletas padrão quando ausentes.
 */

export interface Font {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  size?: number; // pontos
  color?: string; // #RRGGBB (theme/rgb resolvido a rgb quando possível)
  name?: string;
  /**
   * Nome gravado quando a fonte segue o TEMA (`<scheme val="minor|major">`):
   * o Excel desenha e mede com a fonte do tema (`name` vira a latina do tema,
   * medido) — o nome gravado (ex.: 宋体) fica como fallback para escrita CJK.
   */
  altName?: string;
  /** Sobrescrito/subscrito da fonte inteira (<vertAlign val>). */
  vertAlign?: 'superscript' | 'subscript';
}

/** Stop de gradiente (position 0..1 + cor resolvida). */
export interface GradientStop {
  position: number;
  color: string;
}

export interface Fill {
  /**
   * Cor principal #RRGGBB: em `solid` é a cor de fundo (fgColor do
   * patternFill); nos padrões legados (gray125, darkTrellis…) é a cor do
   * PADRÃO (pixels "ligados").
   */
  fgColor?: string;
  /** Cor de fundo atrás do padrão (bgColor do patternFill não-sólido). */
  bgColor?: string;
  pattern?: string; // none | solid | gray125 | darkGray | ...
  /** Gradiente linear (<gradientFill>): ângulo em graus + stops. */
  gradient?: { degree: number; stops: GradientStop[] };
}

export interface BorderEdge {
  style?: string; // thin | medium | thick | dashed | dotted | double | ...
  color?: string; // #RRGGBB
}
export interface Border {
  left?: BorderEdge;
  right?: BorderEdge;
  top?: BorderEdge;
  bottom?: BorderEdge;
  diagonal?: BorderEdge;
}

export interface CellXf {
  numFmtId: number;
  fontId: number;
  fillId: number;
  borderId: number;
  xfId: number;
  applyNumberFormat?: boolean;
  applyFont?: boolean;
  applyFill?: boolean;
  applyBorder?: boolean;
  applyAlignment?: boolean;
  horizontal?: string;
  vertical?: string;
  wrapText?: boolean;
  indent?: number;
}

export interface Styles {
  numFmts: Map<number, string>;
  cellXfs: CellXf[];
  fonts: Font[];
  fills: Fill[];
  borders: Border[];
  /** Formatos diferenciais (formatação condicional tipo cellIs/expression). */
  dxfs: Dxf[];
}

export interface Dxf {
  fillColor?: string;   // bgColor do patternFill
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Lê xl/styles.xml. `cx` (opcional) fornece a paleta do tema + indexadas;
 * quando omitido é construído do próprio pacote (lê theme1.xml automaticamente).
 */
export function readStyles(pkg: XlsxPackage, cx?: ColorContext): Styles {
  const xml = pkg.getPartText('xl/styles.xml');
  if (xml === undefined) return { numFmts: new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml(xml);

  const fonts: Font[] = [];
  const fontsEl = firstChild(root, 'fonts');
  if (fontsEl) {
    for (const f of childElements(fontsEl, 'font')) {
      const font: Font = {};
      if (firstChild(f, 'b')) font.bold = true;
      if (firstChild(f, 'i')) font.italic = true;
      if (firstChild(f, 'u')) font.underline = true;
      if (firstChild(f, 'strike')) font.strike = true;
      const sz = firstChild(f, 'sz');
      if (sz?.attrs['val'] !== undefined) font.size = parseFloat(sz.attrs['val']);
      font.color = readColor(f, ctx);
      const name = firstChild(f, 'name');
      if (name?.attrs['val'] !== undefined) font.name = name.attrs['val'];
      const va = firstChild(f, 'vertAlign')?.attrs['val'];
      if (va === 'superscript' || va === 'subscript') font.vertAlign = va;
      const scheme = firstChild(f, 'scheme')?.attrs['val'];
      const themed = scheme === 'minor' || scheme === 'major' ? ctx.theme.fonts?.[scheme] : undefined;
      if (themed) {
        if (font.name && font.name !== themed) font.altName = font.name;
        font.name = themed;
      }
      fonts.push(font);
    }
  }

  const fills: Fill[] = [];
  const fillsEl = firstChild(root, 'fills');
  if (fillsEl) {
    for (const fl of childElements(fillsEl, 'fill')) {
      fills.push(readFill(fl, ctx));
    }
  }

  const borders: Border[] = [];
  const bordersEl = firstChild(root, 'borders');
  if (bordersEl) {
    for (const bd of childElements(bordersEl, 'border')) {
      const border: Border = {};
      for (const side of ['left', 'right', 'top', 'bottom', 'diagonal'] as const) {
        const e = firstChild(bd, side);
        if (e && e.attrs['style'] && e.attrs['style'] !== 'none') {
          const colEl = firstChild(e, 'color');
          (border[side] as BorderEdge | undefined) = {
            style: e.attrs['style'],
            color: colEl ? resolveColorEl(colEl, ctx) : '#000000',
          };
        }
      }
      borders.push(border);
    }
  }

  // dxfs (formatação condicional)
  const dxfs: Dxf[] = [];
  const dxfsEl = firstChild(root, 'dxfs');
  if (dxfsEl) {
    for (const d of childElements(dxfsEl, 'dxf')) {
      const dxf: Dxf = {};
      const fill = firstChild(d, 'fill');
      const pf = fill ? firstChild(fill, 'patternFill') : undefined;
      const bg = pf ? firstChild(pf, 'bgColor') : undefined;
      if (bg) dxf.fillColor = resolveColorEl(bg, ctx);
      const font = firstChild(d, 'font');
      if (font) {
        if (firstChild(font, 'b')) dxf.bold = true;
        if (firstChild(font, 'i')) dxf.italic = true;
        const colEl = firstChild(font, 'color');
        if (colEl) dxf.fontColor = resolveColorEl(colEl, ctx);
      }
      dxfs.push(dxf);
    }
  }

  const numFmts = new Map<number, string>();
  const numFmtsEl = firstChild(root, 'numFmts');
  if (numFmtsEl) {
    for (const nf of childElements(numFmtsEl, 'numFmt')) {
      const id = nf.attrs['numFmtId'];
      const code = nf.attrs['formatCode'];
      if (id !== undefined && code !== undefined) numFmts.set(parseInt(id, 10), code);
    }
  }

  const cellXfs: CellXf[] = [];
  const cellXfsEl = firstChild(root, 'cellXfs');
  if (cellXfsEl) {
    for (const xf of childElements(cellXfsEl, 'xf')) {
      const a = xf.attrs;
      const rec: CellXf = {
        numFmtId: parseInt(a['numFmtId'] ?? '0', 10),
        fontId: parseInt(a['fontId'] ?? '0', 10),
        fillId: parseInt(a['fillId'] ?? '0', 10),
        borderId: parseInt(a['borderId'] ?? '0', 10),
        xfId: parseInt(a['xfId'] ?? '0', 10),
      };
      if (a['applyNumberFormat'] === '1') rec.applyNumberFormat = true;
      if (a['applyFont'] === '1') rec.applyFont = true;
      if (a['applyFill'] === '1') rec.applyFill = true;
      if (a['applyBorder'] === '1') rec.applyBorder = true;
      if (a['applyAlignment'] === '1') rec.applyAlignment = true;
      const al = firstChild(xf, 'alignment');
      if (al) {
        if (al.attrs['horizontal'] !== undefined) rec.horizontal = al.attrs['horizontal'];
        if (al.attrs['vertical'] !== undefined) rec.vertical = al.attrs['vertical'];
        if (al.attrs['wrapText'] === '1') rec.wrapText = true;
        if (al.attrs['indent'] !== undefined) rec.indent = parseInt(al.attrs['indent'], 10);
      }
      cellXfs.push(rec);
    }
  }

  return { numFmts, cellXfs, fonts, fills, borders, dxfs };
}

/**
 * Lê um <fill> (patternFill sólido/padrão legado ou gradientFill).
 *   - solid: fgColor → Fill.fgColor (semântica histórica preservada).
 *   - padrão legado (gray125, darkTrellis, …): fgColor = cor do padrão,
 *     bgColor = fundo atrás do padrão.
 *   - gradientFill: degree + stops (position 0..1 + cor).
 */
function readFill(fl: XmlElement, ctx: ColorContext): Fill {
  const fill: Fill = {};
  const pf = firstChild(fl, 'patternFill');
  if (pf) {
    fill.pattern = pf.attrs['patternType'];
    const fg = firstChild(pf, 'fgColor');
    const bg = firstChild(pf, 'bgColor');
    if (pf.attrs['patternType'] === 'solid') {
      fill.fgColor = fg ? resolveColorEl(fg, ctx) : undefined;
    } else if (pf.attrs['patternType'] !== undefined && pf.attrs['patternType'] !== 'none') {
      if (fg) fill.fgColor = resolveColorEl(fg, ctx);
      if (bg) fill.bgColor = resolveColorEl(bg, ctx);
    }
    return fill;
  }
  const gf = firstChild(fl, 'gradientFill');
  if (gf) {
    const stops: GradientStop[] = [];
    for (const stop of childElements(gf, 'stop')) {
      const colEl = firstChild(stop, 'color');
      stops.push({
        position: parseFloat(stop.attrs['position'] ?? '0'),
        color: (colEl ? resolveColorEl(colEl, ctx) : undefined) ?? '#FFFFFF',
      });
    }
    fill.gradient = { degree: parseFloat(gf.attrs['degree'] ?? '0'), stops };
  }
  return fill;
}

/** Lê uma cor (rgb/theme/indexed/tint) do primeiro <color> dentro de um elemento. */
function readColor(el: XmlElement, ctx: ColorContext): string | undefined {
  const c = firstChild(el, 'color');
  return c ? resolveColorEl(c, ctx) : undefined;
}
