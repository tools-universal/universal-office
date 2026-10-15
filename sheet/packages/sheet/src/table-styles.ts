import { applyTint, refToRowCol, type Styles, type Fill, type Font, type Border, type BorderEdge, type ColorContext, type Dxf, type Worksheet, type AutoFilterInfo } from '@universal/sheet-core';
import { BUILTIN_TABLE_STYLES } from './table-styles-data.js';
import { pivotCellFormats } from './pivot-styles.js';

/**
 * Estilos de TABELA (ListObject) e de tabela dinâmica: definição por elemento
 * (built-in medido no Excel — table-styles-data.ts — ou customizado em
 * styles.xml <tableStyles> + dxfs) e a formatação que cada célula recebe.
 *
 * Regras (medidas no oráculo, pastas t-tblA/B/over):
 *  - elementos se sobrepõem nesta ordem (o posterior vence por propriedade):
 *    wholeTable, faixas de coluna, faixas de linha, lastColumn, firstColumn,
 *    headerRow, totalRow, células de canto (first/lastHeaderCell,
 *    first/lastTotalCell);
 *  - bordas de um elemento valem no CONTORNO da sua região (left/right/top/
 *    bottom) e entre as células dela (vertical/horizontal);
 *  - a formatação DIRETA da célula vence a da tabela: preenchimento próprio,
 *    borda própria por lado; cor da fonte própria só quando DIFERE da cor da
 *    fonte Normal (preto explícito no cabeçalho continua branco no Medium2);
 *    negrito/itálico somam.
 */

/** Formatação de um elemento do estilo (já com cores resolvidas no tema da pasta). */
export interface ElementFormat {
  fill?: Fill;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  border?: Border;
  /** Tamanho da faixa (elementos de faixa). */
  size?: number;
}

export type StyleSpec = Map<string, ElementFormat>;

/** Formatação que a tabela dá a UMA célula (camada abaixo da formatação direta). */
export interface TableCellFormat {
  fill?: Fill;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  border?: Border;
}

const cache = new WeakMap<Styles, Map<string, StyleSpec | null>>();

/** Definição do estilo `name` (customizado da pasta ou built-in), ou undefined. */
export function resolveTableStyle(name: string | undefined, styles: Styles, cx: ColorContext): StyleSpec | undefined {
  if (!name) return undefined;
  let per = cache.get(styles);
  if (!per) { per = new Map(); cache.set(styles, per); }
  const hit = per.get(name);
  if (hit !== undefined) return hit ?? undefined;
  let spec: StyleSpec | null = null;
  const custom = styles.tableStyles?.find((t) => t.name === name);
  if (custom) {
    spec = new Map();
    for (const el of custom.elements) {
      const dxf = el.dxfId !== undefined ? styles.dxfs[el.dxfId] : undefined;
      const f = dxf ? fromDxf(dxf) : {};
      if (el.size !== undefined && el.size > 1) f.size = el.size;
      spec.set(el.type, f);
    }
  } else {
    const def = BUILTIN_TABLE_STYLES[name];
    if (def !== undefined) spec = parseBuiltin(def, cx);
  }
  per.set(name, spec);
  return spec ?? undefined;
}

function fromDxf(d: Dxf): ElementFormat {
  const f: ElementFormat = {};
  if (d.fill && d.fill.pattern !== 'none') f.fill = d.fill;
  if (d.fontColor !== undefined) f.fontColor = d.fontColor;
  if (d.bold !== undefined) f.bold = d.bold;
  if (d.italic !== undefined) f.italic = d.italic;
  if (d.underline !== undefined) f.underline = d.underline;
  if (d.strike !== undefined) f.strike = d.strike;
  if (d.border) f.border = d.border;
  return f;
}

/** Decodifica a definição compacta (ver table-styles-data.ts). */
function parseBuiltin(def: string, cx: ColorContext): StyleSpec {
  const spec: StyleSpec = new Map();
  const color = (s: string): string => {
    const [k, t] = s.split('/');
    const base = cx.theme.colors[parseInt(k!, 10)] ?? '#000000';
    return t ? applyTint(base, parseFloat(t)) : base;
  };
  const SIDES: Record<string, keyof Border> = { l: 'left', r: 'right', t: 'top', b: 'bottom', v: 'vertical', h: 'horizontal' };
  for (const part of def.split(';')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const name = part.slice(0, eq);
    const f: ElementFormat = {};
    for (const p of part.slice(eq + 1).split(',')) {
      if (p === 'B') { f.bold = true; continue; }
      if (p === 'I') { f.italic = true; continue; }
      const [k, a, b] = p.split(':');
      if (k === 'f') f.fill = { pattern: 'solid', fgColor: color(a!) };
      else if (k === 'c') f.fontColor = color(a!);
      else if (k === 's') f.size = parseInt(a!, 10);
      else if (k && SIDES[k]) (f.border ??= {})[SIDES[k] as 'left'] = { style: a!, color: color(b!) };
    }
    spec.set(name, f);
  }
  return spec;
}

/** Opções da tabela (`<tableStyleInfo>` + contagens de cabeçalho/total). */
export interface TableLayout {
  c1: number; r1: number; c2: number; r2: number;
  headerRows: number;
  totalsRows: number;
  rowStripes: boolean;
  colStripes: boolean;
  firstColumn: boolean;
  lastColumn: boolean;
}

/** Aplica um elemento numa célula da sua região [ca..cb]×[ra..rb]. */
export function applyElement(
  out: TableCellFormat, el: ElementFormat | undefined, c: number, r: number,
  ca: number, cb: number, ra: number, rb: number,
): void {
  if (!el) return;
  if (el.fill) out.fill = el.fill;
  if (el.fontColor !== undefined) out.fontColor = el.fontColor;
  if (el.bold !== undefined) out.bold = el.bold;
  if (el.italic !== undefined) out.italic = el.italic;
  if (el.underline !== undefined) out.underline = el.underline;
  if (el.strike !== undefined) out.strike = el.strike;
  const b = el.border;
  if (b) {
    const set = (side: 'left' | 'right' | 'top' | 'bottom', e: BorderEdge | undefined): void => {
      if (e) (out.border ??= {})[side] = e;
    };
    set('left', c === ca ? b.left : b.vertical);
    set('right', c === cb ? b.right : b.vertical);
    set('top', r === ra ? b.top : b.horizontal);
    set('bottom', r === rb ? b.bottom : b.horizontal);
  }
}

/**
 * Formatação de cada célula da tabela (chave `col,row`) segundo o estilo.
 * Ordem de aplicação dos elementos: ver cabeçalho do módulo.
 */
export function tableCellFormats(t: TableLayout, spec: StyleSpec, out: Map<string, TableCellFormat>): void {
  const hr = t.headerRows > 0 ? t.r1 : -1;
  const tr = t.totalsRows > 0 ? t.r2 : -1;
  const d1 = t.r1 + Math.max(0, t.headerRows), d2 = t.r2 - Math.max(0, t.totalsRows);
  const el = (n: string): ElementFormat | undefined => spec.get(n);
  const whole = el('wholeTable');
  const cs1 = el('firstColumnStripe'), cs2 = el('secondColumnStripe');
  const rs1 = el('firstRowStripe'), rs2 = el('secondRowStripe');
  const cw1 = cs1?.size ?? 1, cw2 = cs2?.size ?? 1;
  const rw1 = rs1?.size ?? 1, rw2 = rs2?.size ?? 1;
  const lastCol = el('lastColumn'), firstCol = el('firstColumn');
  const header = el('headerRow'), total = el('totalRow');
  const fhc = el('firstHeaderCell'), lhc = el('lastHeaderCell'), ftc = el('firstTotalCell'), ltc = el('lastTotalCell');
  for (let r = t.r1; r <= t.r2; r++) {
    const isData = r >= d1 && r <= d2;
    for (let c = t.c1; c <= t.c2; c++) {
      const f: TableCellFormat = {};
      applyElement(f, whole, c, r, t.c1, t.c2, t.r1, t.r2);
      if (t.colStripes && isData) {
        const i = c - t.c1, per = cw1 + cw2, k = i % per;
        const first = k < cw1;
        const a = t.c1 + i - k + (first ? 0 : cw1);
        const b = Math.min(t.c2, first ? a + cw1 - 1 : a + cw2 - 1);
        applyElement(f, first ? cs1 : cs2, c, r, a, b, d1, d2);
      }
      if (t.rowStripes && isData) {
        const i = r - d1, per = rw1 + rw2, k = i % per;
        const first = k < rw1;
        const a = d1 + i - k + (first ? 0 : rw1);
        const b = Math.min(d2, first ? a + rw1 - 1 : a + rw2 - 1);
        applyElement(f, first ? rs1 : rs2, c, r, t.c1, t.c2, a, b);
      }
      if (t.lastColumn && c === t.c2) applyElement(f, lastCol, c, r, c, c, t.r1, t.r2);
      if (t.firstColumn && c === t.c1) applyElement(f, firstCol, c, r, c, c, t.r1, t.r2);
      if (r === hr) applyElement(f, header, c, r, t.c1, t.c2, r, r);
      if (r === tr) applyElement(f, total, c, r, t.c1, t.c2, r, r);
      if (r === hr && c === t.c1 && t.firstColumn) applyElement(f, fhc, c, r, c, c, r, r);
      if (r === hr && c === t.c2 && t.lastColumn) applyElement(f, lhc, c, r, c, c, r, r);
      if (r === tr && c === t.c1 && t.firstColumn) applyElement(f, ftc, c, r, c, c, r, r);
      if (r === tr && c === t.c2 && t.lastColumn) applyElement(f, ltc, c, r, c, c, r, r);
      if (f.fill || f.fontColor !== undefined || f.bold !== undefined || f.italic !== undefined || f.underline !== undefined || f.strike !== undefined || f.border) {
        out.set(`${c},${r}`, f);
      }
    }
  }
}

/** "A1:C5" → retângulo 1-based, ou undefined. */
export function parseRange(ref: string): { c1: number; r1: number; c2: number; r2: number } | undefined {
  const [a, b] = ref.split(':');
  if (!a) return undefined;
  try {
    const s = refToRowCol(a.replace(/$/g, '')), e = b ? refToRowCol(b.replace(/$/g, '')) : s;
    return { c1: Math.min(s.col, e.col), r1: Math.min(s.row, e.row), c2: Math.max(s.col, e.col), r2: Math.max(s.row, e.row) };
  } catch { return undefined; }
}

/** Botões de autofiltro na 1ª linha do range (menos os ocultos). */
function addFilterButtons(af: AutoFilterInfo, out: Map<string, boolean>): void {
  const rg = parseRange(af.ref);
  if (!rg) return;
  const hidden = new Set(af.hidden ?? []), active = new Set(af.active ?? []);
  for (let c = rg.c1; c <= rg.c2; c++) {
    const k = c - rg.c1;
    if (!hidden.has(k)) out.set(`${c},${rg.r1}`, active.has(k));
  }
}

/**
 * Camada das tabelas da planilha: formatação por célula segundo o estilo de
 * cada ListObject (+ botões de autofiltro das tabelas e da planilha).
 */
export function buildTableLayer(ws: Worksheet, styles: Styles, cx: ColorContext): { tableFmt: Map<string, TableCellFormat>; filterAt: Map<string, boolean>; tableEnds: Set<string> } {
  const tableFmt = new Map<string, TableCellFormat>();
  const filterAt = new Map<string, boolean>();
  const tableEnds = new Set<string>();
  for (const t of ws.tables ?? []) {
    const rg = parseRange(t.ref);
    if (!rg) continue;
    // alça de redimensionar (o Excel a desenha sempre, na última célula)
    tableEnds.add(`${rg.c2},${rg.r2}`);
    const spec = resolveTableStyle(t.styleName, styles, cx);
    if (spec) {
      tableCellFormats({
        ...rg, headerRows: t.headerRow ? 1 : 0, totalsRows: t.totalsRow ? 1 : 0,
        rowStripes: t.stripes, colStripes: !!t.colStripes, firstColumn: !!t.firstColumn, lastColumn: !!t.lastColumn,
      }, spec, tableFmt);
    }
    // contorno da tabela (tableBorderDxfId) — por cima do estilo; medido em t-tbldxf
    const ob = t.borderDxfId !== undefined ? styles.dxfs[t.borderDxfId]?.border : undefined;
    if (ob) {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) {
        const sides: ['left' | 'right' | 'top' | 'bottom', boolean][] = [['left', c === rg.c1], ['right', c === rg.c2], ['top', r === rg.r1], ['bottom', r === rg.r2]];
        for (const [side, edge] of sides) {
          const e = ob[side];
          if (!edge || !e) continue;
          const key = `${c},${r}`;
          const f = tableFmt.get(key) ?? {};
          (f.border ??= {})[side] = e;
          tableFmt.set(key, f);
        }
      }
    }
    if (t.filter && t.headerRow) addFilterButtons(t.filter, filterAt);
  }
  if (ws.autoFilter) addFilterButtons(ws.autoFilter, filterAt);
  // tabelas dinâmicas: estilo de dinâmica sobre o range calculado + botões
  for (const p of ws.pivots ?? []) {
    const rg = parseRange(p.ref);
    if (!rg) continue;
    pivotCellFormats(p, rg, resolveTableStyle(p.styleName, styles, cx), tableFmt, filterAt, applyElement);
  }
  return { tableFmt, filterAt, tableEnds };
}

const sameColor = (a: string | undefined, b: string | undefined): boolean =>
  (a ?? '#000000').toLowerCase() === (b ?? '#000000').toLowerCase();

/**
 * Formatação direta da célula SOBRE a camada da tabela: fundo próprio vence;
 * borda própria vence por lado; cor da fonte própria só se diferente da cor
 * da fonte Normal (`normalColor`); negrito/itálico/sublinhado somam.
 */
export function applyTableLayer<T extends { font: Font | undefined; fill: Fill | undefined; border: Border | undefined }>(
  st: T, tf: TableCellFormat, normalColor: string | undefined,
): T {
  const out = { ...st };
  const own = st.fill && ((st.fill.pattern && st.fill.pattern !== 'none') || (st.fill.gradient && st.fill.gradient.stops.length));
  if (!own && tf.fill) out.fill = tf.fill;
  if (tf.fontColor !== undefined || tf.bold || tf.italic || tf.underline || tf.strike) {
    const f: Font = { ...(st.font ?? {}) };
    if (tf.fontColor !== undefined && (f.color === undefined || sameColor(f.color, normalColor))) f.color = tf.fontColor;
    if (tf.bold) f.bold = true;
    if (tf.italic) f.italic = true;
    if (tf.underline) f.underline = true;
    if (tf.strike) f.strike = true;
    out.font = f;
  }
  if (tf.border) {
    const b: Border = { ...(st.border ?? {}) };
    for (const side of ['left', 'right', 'top', 'bottom'] as const) if (!b[side]?.style && tf.border[side]) b[side] = tf.border[side];
    out.border = b;
  }
  return out;
}

/**
 * Alça de redimensionar da tabela no canto inferior direito (medida: degrau
 * #485DB1 de 4×4 px — 2×2 no alto à direita + 4×2 embaixo).
 */
export function paintTableHandle(ctx: CanvasRenderingContext2D, right: number, bottom: number): void {
  const R = Math.round(right), B = Math.round(bottom);
  ctx.fillStyle = '#485DB1';
  ctx.fillRect(R - 2, B - 4, 2, 2);
  ctx.fillRect(R - 4, B - 2, 4, 2);
}
