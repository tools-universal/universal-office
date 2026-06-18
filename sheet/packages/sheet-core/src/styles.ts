import { parseXml, childElements, firstChild } from './xml.js';
import type { XlsxPackage } from './package.js';

/**
 * Leitura de xl/styles.xml. Modelamos o essencial para renderização:
 * cellXfs (registro referenciado pelo atributo `s` da célula), numFmts
 * (códigos de formato customizados), fonts (negrito/itálico/tamanho/cor/nome)
 * e fills (cor de fundo sólida). borders ficam só indexados por enquanto
 * (sem perdas: a parte inteira é preservada pelo container independente do parser).
 */

export interface Font {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  size?: number; // pontos
  color?: string; // #RRGGBB (theme/rgb resolvido a rgb quando possível)
  name?: string;
}

export interface Fill {
  /** Cor de fundo sólida #RRGGBB (fgColor de patternFill solid). */
  fgColor?: string;
  pattern?: string; // none | solid | ...
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

export function readStyles(pkg: XlsxPackage): Styles {
  const xml = pkg.getPartText('xl/styles.xml');
  if (xml === undefined) return { numFmts: new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
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
      font.color = readColor(f);
      const name = firstChild(f, 'name');
      if (name?.attrs['val'] !== undefined) font.name = name.attrs['val'];
      fonts.push(font);
    }
  }

  const fills: Fill[] = [];
  const fillsEl = firstChild(root, 'fills');
  if (fillsEl) {
    for (const fl of childElements(fillsEl, 'fill')) {
      const fill: Fill = {};
      const pf = firstChild(fl, 'patternFill');
      if (pf) {
        fill.pattern = pf.attrs['patternType'];
        if (pf.attrs['patternType'] === 'solid') {
          const fg = firstChild(pf, 'fgColor');
          fill.fgColor = fg ? colorFromEl(fg) : undefined;
        }
      }
      fills.push(fill);
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
            color: colEl ? colorFromEl(colEl) : '#000000',
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
      if (bg && bg.attrs['rgb']) dxf.fillColor = '#' + bg.attrs['rgb'].slice(-6);
      const font = firstChild(d, 'font');
      if (font) {
        if (firstChild(font, 'b')) dxf.bold = true;
        if (firstChild(font, 'i')) dxf.italic = true;
        const colEl = firstChild(font, 'color');
        if (colEl && colEl.attrs['rgb']) dxf.fontColor = '#' + colEl.attrs['rgb'].slice(-6);
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

/** Lê uma cor (rgb/tint) do primeiro <color> dentro de um elemento. */
function readColor(el: import('./xml.js').XmlElement): string | undefined {
  const c = firstChild(el, 'color');
  return c ? colorFromEl(c) : undefined;
}

/**
 * Resolve um elemento <color> para #RRGGBB. theme/indexed resolvidos contra a
 * paleta padrão do Office (parsear theme1.xml é trabalho futuro).
 */
const THEME_COLORS = ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31',
  '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#0563C1', '#954F72'];
const INDEXED_COLORS: string[] = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
INDEXED_COLORS[64] = '#000000'; INDEXED_COLORS[65] = '#FFFFFF'; INDEXED_COLORS[81] = '#FFFFFF';
function colorFromEl(c: import('./xml.js').XmlElement): string | undefined {
  const rgb = c.attrs['rgb'];
  if (rgb !== undefined) return '#' + rgb.slice(-6);
  const theme = c.attrs['theme'];
  if (theme !== undefined) return THEME_COLORS[parseInt(theme, 10)] ?? '#000000';
  const indexed = c.attrs['indexed'];
  if (indexed !== undefined) return INDEXED_COLORS[parseInt(indexed, 10)] ?? '#000000';
  return undefined;
}
