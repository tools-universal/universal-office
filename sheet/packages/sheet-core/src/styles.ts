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
  /**
   * Degradê (<gradientFill>): linear (`degree`) ou `path` (retângulo interno
   * left/right/top/bottom em frações da célula → borda da célula) + stops.
   */
  gradient?: { degree: number; stops: GradientStop[]; type?: 'linear' | 'path'; left?: number; right?: number; top?: number; bottom?: number };
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
  /** Diagonal ascendente (canto inf-esq → sup-dir) / descendente. */
  diagonalUp?: boolean;
  diagonalDown?: boolean;
  /** Linhas INTERNAS (só em dxf de estilo de tabela: entre colunas/linhas da região). */
  vertical?: BorderEdge;
  horizontal?: BorderEdge;
}

/** Elemento de um estilo de tabela/dinâmica (<tableStyleElement type dxfId size>). */
export interface TableStyleElementDef {
  type: string;
  dxfId?: number;
  /** Tamanho da faixa (só firstRowStripe/secondRowStripe/…ColumnStripe). */
  size?: number;
}
/** Estilo de tabela/dinâmica CUSTOMIZADO de styles.xml (<tableStyles><tableStyle>). */
export interface TableStyleDef {
  name: string;
  pivot: boolean;
  table: boolean;
  elements: TableStyleElementDef[];
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
  /** pivotButton="1": o Excel desenha o botão de campo da tabela dinâmica na célula. */
  pivotButton?: boolean;
  horizontal?: string;
  vertical?: string;
  wrapText?: boolean;
  indent?: number;
  /** Rotação do texto: 1–90 anti-horário, 91–180 horário (−1…−90), 255 empilhado. */
  textRotation?: number;
}

export interface Styles {
  numFmts: Map<number, string>;
  cellXfs: CellXf[];
  fonts: Font[];
  fills: Fill[];
  borders: Border[];
  /** Formatos diferenciais (formatação condicional, estilos de tabela customizados). */
  dxfs: Dxf[];
  /** Estilos de tabela/dinâmica customizados (<tableStyles>). */
  tableStyles?: TableStyleDef[];
  /** Estilo default de tabela/dinâmica (<tableStyles defaultTableStyle defaultPivotStyle>). */
  defaultTableStyle?: string;
  defaultPivotStyle?: string;
}

/**
 * Formato diferencial (<dxf>): só as propriedades PRESENTES (o resto herda da
 * célula). `fill` segue a semântica do fill de célula (solid ⇒ fgColor),
 * já convertida do dxf — onde o sólido usa bgColor.
 */
export interface Dxf {
  fillColor?: string;   // cor do sólido (bgColor do patternFill do dxf)
  fill?: Fill;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  border?: Border;
  /** Formato numérico (<numFmt numFmtId formatCode>). */
  numFmtId?: number;
  numFmtCode?: string;
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
      if (boolEl(f, 'b')) font.bold = true;
      if (boolEl(f, 'i')) font.italic = true;
      const u = firstChild(f, 'u');
      if (u && u.attrs['val'] !== 'none') font.underline = true;
      if (boolEl(f, 'strike')) font.strike = true;
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
    for (const bd of childElements(bordersEl, 'border')) borders.push(readBorder(bd, ctx));
  }

  // dxfs (formatação condicional, estilos de tabela customizados)
  const dxfs: Dxf[] = [];
  const dxfsEl = firstChild(root, 'dxfs');
  if (dxfsEl) {
    for (const d of childElements(dxfsEl, 'dxf')) dxfs.push(readDxf(d, ctx));
  }

  // estilos de tabela/dinâmica customizados
  let tableStyles: TableStyleDef[] | undefined;
  let defaultTableStyle: string | undefined, defaultPivotStyle: string | undefined;
  const tsEl = firstChild(root, 'tableStyles');
  if (tsEl) {
    defaultTableStyle = tsEl.attrs['defaultTableStyle'];
    defaultPivotStyle = tsEl.attrs['defaultPivotStyle'];
    for (const t of childElements(tsEl, 'tableStyle')) {
      const name = t.attrs['name'];
      if (!name) continue;
      const elements: TableStyleElementDef[] = [];
      for (const e of childElements(t, 'tableStyleElement')) {
        const type = e.attrs['type'];
        if (!type) continue;
        const el: TableStyleElementDef = { type };
        if (e.attrs['dxfId'] !== undefined) el.dxfId = parseInt(e.attrs['dxfId'], 10);
        if (e.attrs['size'] !== undefined) el.size = parseInt(e.attrs['size'], 10);
        elements.push(el);
      }
      (tableStyles ??= []).push({ name, pivot: t.attrs['pivot'] !== '0', table: t.attrs['table'] !== '0', elements });
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
      if (a['pivotButton'] === '1' || a['pivotButton'] === 'true') rec.pivotButton = true;
      const al = firstChild(xf, 'alignment');
      if (al) {
        if (al.attrs['horizontal'] !== undefined) rec.horizontal = al.attrs['horizontal'];
        if (al.attrs['vertical'] !== undefined) rec.vertical = al.attrs['vertical'];
        if (al.attrs['wrapText'] === '1') rec.wrapText = true;
        if (al.attrs['indent'] !== undefined) rec.indent = parseInt(al.attrs['indent'], 10);
        const rot = al.attrs['textRotation'] !== undefined ? parseInt(al.attrs['textRotation'], 10) : 0;
        if (rot > 0 && (rot <= 180 || rot === 255)) rec.textRotation = rot;
      }
      cellXfs.push(rec);
    }
  }

  const out: Styles = { numFmts, cellXfs, fonts, fills, borders, dxfs };
  if (tableStyles) out.tableStyles = tableStyles;
  if (defaultTableStyle) out.defaultTableStyle = defaultTableStyle;
  if (defaultPivotStyle) out.defaultPivotStyle = defaultPivotStyle;
  return out;
}

/** `<b/>`, `<b val="1"/>` → true; `<b val="0"/>`/ausente → false. */
function boolEl(el: XmlElement, name: string): boolean {
  const e = firstChild(el, name);
  if (!e) return false;
  const v = e.attrs['val'];
  return v !== '0' && v !== 'false';
}

/** Lê um <border> (de célula ou de dxf — este pode trazer vertical/horizontal). */
export function readBorder(bd: XmlElement, ctx: ColorContext): Border {
  const border: Border = {};
  for (const side of ['left', 'right', 'top', 'bottom', 'diagonal', 'vertical', 'horizontal'] as const) {
    // `start`/`end` são os nomes do schema estrito/ISO para left/right
    const e = firstChild(bd, side) ?? (side === 'left' ? firstChild(bd, 'start') : side === 'right' ? firstChild(bd, 'end') : undefined);
    if (e && e.attrs['style'] && e.attrs['style'] !== 'none') {
      const colEl = firstChild(e, 'color');
      border[side] = { style: e.attrs['style'], color: (colEl ? resolveColorEl(colEl, ctx) : undefined) ?? '#000000' };
    }
  }
  if (bd.attrs['diagonalUp'] === '1' || bd.attrs['diagonalUp'] === 'true') border.diagonalUp = true;
  if (bd.attrs['diagonalDown'] === '1' || bd.attrs['diagonalDown'] === 'true') border.diagonalDown = true;
  return border;
}

/**
 * Lê um <dxf> (formatação condicional / elementos de estilo de tabela). Só o
 * que está presente entra. Fill do dxf: sem patternType (ou solid) é SÓLIDO e
 * a cor vem do bgColor (fgColor como reserva); padrões guardam fg/bg.
 */
export function readDxf(d: XmlElement, ctx: ColorContext): Dxf {
  const dxf: Dxf = {};
  const fill = firstChild(d, 'fill');
  const pf = fill ? firstChild(fill, 'patternFill') : undefined;
  if (pf) {
    const pt = pf.attrs['patternType'];
    const fgEl = firstChild(pf, 'fgColor'), bgEl = firstChild(pf, 'bgColor');
    const fg = fgEl ? resolveColorEl(fgEl, ctx) : undefined;
    const bg = bgEl ? resolveColorEl(bgEl, ctx) : undefined;
    if (pt === 'none') dxf.fill = { pattern: 'none' };
    else if (pt === undefined || pt === 'solid') {
      const c = bg ?? fg;
      if (c !== undefined) { dxf.fillColor = c; dxf.fill = { pattern: 'solid', fgColor: c }; }
    } else {
      dxf.fill = { pattern: pt, ...(fg ? { fgColor: fg } : {}), ...(bg ? { bgColor: bg } : {}) };
    }
  } else if (fill && firstChild(fill, 'gradientFill')) {
    dxf.fill = readFill(fill, ctx);
  }
  const font = firstChild(d, 'font');
  if (font) {
    for (const [tag, key] of [['b', 'bold'], ['i', 'italic'], ['strike', 'strike']] as const) {
      if (firstChild(font, tag)) dxf[key] = boolEl(font, tag);
    }
    const u = firstChild(font, 'u');
    if (u) dxf.underline = u.attrs['val'] !== 'none';
    const colEl = firstChild(font, 'color');
    if (colEl) dxf.fontColor = resolveColorEl(colEl, ctx);
  }
  const bd = firstChild(d, 'border');
  if (bd) {
    const b = readBorder(bd, ctx);
    if (Object.keys(b).length) dxf.border = b;
  }
  const nf = firstChild(d, 'numFmt');
  if (nf) {
    if (nf.attrs['numFmtId'] !== undefined) dxf.numFmtId = parseInt(nf.attrs['numFmtId'], 10);
    if (nf.attrs['formatCode'] !== undefined) dxf.numFmtCode = nf.attrs['formatCode'];
  }
  return dxf;
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
    // sem cor o Excel pinta o padrão em PRETO sobre BRANCO (automático; medido
    // em t-fills: solid sem fgColor = preto, mediumGray sem cores = xadrez p/b)
    if (pf.attrs['patternType'] === 'solid') {
      fill.fgColor = (fg ? resolveColorEl(fg, ctx) : undefined) ?? '#000000';
    } else if (pf.attrs['patternType'] !== undefined && pf.attrs['patternType'] !== 'none') {
      fill.fgColor = (fg ? resolveColorEl(fg, ctx) : undefined) ?? '#000000';
      fill.bgColor = (bg ? resolveColorEl(bg, ctx) : undefined) ?? '#FFFFFF';
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
    const num = (k: string): number => { const v = parseFloat(gf.attrs[k] ?? '0'); return Number.isFinite(v) ? v : 0; };
    fill.gradient = { degree: num('degree'), stops };
    if (gf.attrs['type'] === 'path') {
      fill.gradient.type = 'path';
      fill.gradient.left = num('left'); fill.gradient.right = num('right');
      fill.gradient.top = num('top'); fill.gradient.bottom = num('bottom');
    }
  }
  return fill;
}

/** Lê uma cor (rgb/theme/indexed/tint) do primeiro <color> dentro de um elemento. */
function readColor(el: XmlElement, ctx: ColorContext): string | undefined {
  const c = firstChild(el, 'color');
  return c ? resolveColorEl(c, ctx) : undefined;
}
