import type {
  TableBlock, TableCell, TblPr, TcPr, BorderSpec, WidthSpec, PPr, RPr, TblStyleType, TblLook,
} from '@universal-office/docx-core';
import { mergeTblPr, mergeTcPr, mergePPr, mergeRPr, resolveColor, COND_ORDER } from './resolve.js';
import type { DocContext } from './context.js';
import type { PageItem, LaidOutLine } from './tree.js';
import { paintBorder, borderWidth } from './paint.js';
import { isDark, paraVisibility, prepareParagraph, type PreparedPara } from './para.js';

/**
 * Tabela: grade de colunas, margens de célula, cascata do estilo de tabela
 * (incl. formatação condicional por posição), bordas, sombreamento, altura
 * de linha (trHeight), mesclas horizontais/verticais e alinhamento vertical.
 * O conteúdo das células é laid out pelo `layoutCell` injetado (fluxo
 * estático do motor), que devolve itens relativos ao topo da célula.
 */

export interface CellContent {
  items: PageItem[];
  lines: LaidOutLine[];
  height: number;
  /** algum parágrafo do conteúdo tem "manter com o próximo" */
  keepNext?: boolean;
  /** parágrafos do conteúdo (ref da linha → total de linhas, viúvas/órfãs, espaço
   *  depois) — onde a linha de tabela pode ser partida entre páginas */
  paras?: Map<string, ParaSplitInfo>;
  /** linhas de tabela ANINHADA no conteúdo: topo, a linha e os itens/linhas dela (os
   *  mesmos objetos de items/lines) — partem como linha de tabela (oráculo nestsplit) */
  nest?: NestRow[];
}

export interface NestRow { top: number; row: RowLayout; items: PageItem[]; lines: LaidOutLine[] }

export interface ParaSplitInfo { lines: number; widow: boolean; after: number }

export type CellLayouter = (
  cell: TableCell, x: number, width: number, env: { tablePPr?: PPr; tableRPr?: RPr; darkBackground?: boolean }, ref: string,
) => CellContent;

export interface RowLayout {
  /** altura da linha (twips) */
  height: number;
  /** itens relativos ao TOPO da linha (y=0) */
  items: PageItem[];
  lines: LaidOutLine[];
  cantSplit: boolean;
  header: boolean;
  /** a linha fica com a seguinte (parágrafo keepNext em alguma célula) */
  keepNext?: boolean;
  /** altura só do conteúdo (sem a altura mínima trHeight): se couber e só a
   *  mínima não couber, o Word leva a linha inteira (não divide) */
  natural?: number;
  /** itens de bordas desenhados por cima */
  borderItems: PageItem[];
  /** borda inferior desenhada só se a página quebrar logo após esta linha */
  breakBorderItems?: PageItem[];
  /** mescla vertical que COMEÇA nesta linha: posição (em items) do texto dela na
   *  ordem das colunas e a linha em que ela termina (oráculo vmorder) */
  mergeAt?: { col: number; at: number; endRow: number }[];
  /** texto de mescla vertical pintado nesta (última) linha da mescla e o deslocamento
   *  para as coordenadas da linha inicial */
  mergeText?: { col: number; items: PageItem[]; lines: LaidOutLine[]; dy: number; start?: number; content?: CellContent; marT?: number; band?: number; vAlign?: string }[];
  /** espessura dessa borda: com a página quebrando depois desta linha, ela também
   *  tem de caber (oráculo rowfitbdr) */
  breakW?: number;
  /** divide a linha para caber em `avail` (twips): [parte que cabe, resto]
   *  — null se nenhuma linha de texto cabe (a linha inteira desce). */
  split?: (avail: number) => [RowLayout, RowLayout] | null;
  /** linha inteira que abre a página (a anterior ficou na outra): a faixa de cima é só
   *  a borda de cima DELA — `topCut` a menos — e as bordas de cima trocam (oráculo contband) */
  topCut?: number;
  topBorders?: PageItem[];
  ownTopBorders?: PageItem[];
  /** convertida por atPageTop: quanto subiu */
  cut?: number;
}

/** Parte um conteúdo de célula num corte vertical (fim da última linha que cabe). */
export function splitContent(c: CellContent, availContent: number): [CellContent, CellContent] | null {
  // linha de tabela aninhada cruzada pelo pé: parte como linha de tabela — cada célula no
  // seu corte, viúvas/órfãs por célula, a continuação no topo com a borda de cima (oráculo
  // nestsplit; corpus t191); se ela não pode partir, desce inteira
  const nr = c.nest?.find((n) => n.top < availContent - 0.5 && n.top + n.row.height > availContent + 0.05);
  if (nr) {
    const parts = nr.row.split?.(availContent - nr.top) ?? null;
    if (parts && parts[0].height > 0) return splitAtNest(c, nr, parts);
    if (nr.top > 0.5) return splitContent(c, nr.top);
  }
  const paras = c.paras;
  // última linha de cada parágrafo: cabe só junto com o espaço depois dele (oráculo rowwidow, *-after*)
  const lastOf = new Map<string, LaidOutLine>();
  if (paras) for (const l of c.lines) if (paras.has(l.ref)) lastOf.set(l.ref, l);
  let cut = 0;
  for (const l of c.lines) {
    const bottom = l.y + l.height;
    const after = lastOf.get(l.ref) === l ? paras!.get(l.ref)!.after : 0;
    // (sem folga: o Word compara exato — oráculo bodyfit, bf-cf-*)
    if (bottom + after <= availContent + 0.05 && bottom > cut) cut = bottom;
  }
  if (cut > 0 && paras) cut = widowCut(c, paras, cut);
  if (cut > 0) cut = nestedRowCut(c, cut);
  if (cut <= 0) return null;
  // corte no fim de um parágrafo: o "depois" dele fica em cima; a continuação começa
  // só com o resto do espaço até o seguinte (oráculo rowwidow, gapcut)
  let cutB = cut;
  if (paras) {
    let last: LaidOutLine | undefined, next = Infinity;
    for (const l of c.lines) {
      if (l.y + l.height <= cut + 0.5) { if (!last || l.y + l.height > last.y + last.height) last = l; } else next = Math.min(next, l.y);
    }
    if (last && lastOf.get(last.ref) === last) cutB = Math.min(cut + paras.get(last.ref)!.after, next);
  }
  const w = paras ? { paras } : {};
  const a: CellContent = { items: [], lines: [], height: cut, ...w };
  const b: CellContent = { items: [], lines: [], height: Math.max(0, c.height - cutB), ...w };
  const keyY = (it: PageItem): number => it.t === 'line' ? Math.min(it.y1, it.y2) : it.t === 'clip' ? (it.y ?? 0) : it.t === 'xform' ? (it.m?.[5] ?? 0) : it.t === 'path' ? Math.min(...it.cmds.map((c) => (c.op === 'Z' ? Infinity : c.y))) : it.y;
  for (const it of c.items) {
    const y = it.t === 'glyphs' ? it.y : keyY(it);
    if (y < cut) a.items.push(it);
    else b.items.push(shiftItem(it, -cutB));
  }
  for (const l of c.lines) {
    if (l.y < cut) a.lines.push(l);
    else b.lines.push({ ...l, y: l.y - cutB, baseline: l.baseline - cutB });
  }
  return [a, b];
}

/** Topo de um item para decidir de que lado do corte ele fica. */
function itemTop(it: PageItem): number {
  return it.t === 'glyphs' ? it.y : it.t === 'line' ? Math.min(it.y1, it.y2) : it.t === 'clip' ? (it.y ?? 0) : it.t === 'xform' ? (it.m?.[5] ?? 0) : it.t === 'path' ? Math.min(...it.cmds.map((c) => (c.op === 'Z' ? Infinity : c.y))) : it.y;
}

/** Conteúdo partido numa linha aninhada: em cima, o que vem antes dela e a 1ª parte; em
 *  baixo, a continuação dela no topo e o que vem depois. */
function splitAtNest(c: CellContent, nr: NestRow, [p0, p1]: [RowLayout, RowLayout]): [CellContent, CellContent] {
  const own = new Set<object>([...nr.items, ...nr.lines]);
  const end = nr.top + nr.row.height;
  const dy = p1.height - end;
  const w = c.paras ? { paras: c.paras } : {};
  const aItems: PageItem[] = [], aLines: LaidOutLine[] = [], bItems: PageItem[] = [], bLines: LaidOutLine[] = [];
  const moved = new Map<object, object>();
  for (const it of c.items) {
    if (own.has(it)) continue;
    if (itemTop(it) < nr.top + 0.5) aItems.push(it);
    else { const s = shiftItem(it, dy); moved.set(it, s); bItems.push(s); }
  }
  for (const l of c.lines) {
    if (own.has(l)) continue;
    if (l.y < nr.top + 0.5) aLines.push(l);
    else { const s = { ...l, y: l.y + dy, baseline: l.baseline + dy }; moved.set(l, s); bLines.push(s); }
  }
  const p0Items = [...p0.items, ...p0.borderItems].map((it) => shiftItem(it, nr.top));
  aItems.push(...p0Items);
  aLines.push(...p0.lines.map((l) => ({ ...l, y: l.y + nr.top, baseline: l.baseline + nr.top })));
  const p1Items = [...p1.items, ...p1.borderItems];
  const p1Lines = p1.lines.map((l) => ({ ...l }));
  bItems.unshift(...p1Items);
  bLines.unshift(...p1Lines);
  const before = (c.nest ?? []).filter((n) => n.top + n.row.height <= nr.top + 0.5);
  const after = (c.nest ?? []).filter((n) => n.top >= end - 0.5).map((n) => ({
    top: n.top + dy, row: n.row,
    items: n.items.map((it) => (moved.get(it) ?? it) as PageItem), lines: n.lines.map((l) => (moved.get(l) ?? l) as LaidOutLine),
  }));
  const a: CellContent = { items: aItems, lines: aLines, height: nr.top + p0.height, ...w, ...(before.length ? { nest: before } : {}) };
  const b: CellContent = { items: bItems, lines: bLines, height: Math.max(0, c.height - end) + p1.height, ...w, nest: [{ top: 0, row: p1, items: p1Items, lines: p1Lines }, ...after] };
  return [a, b];
}

/**
 * Linha de tabela ANINHADA cruzada pelo corte: se alguma célula dela (com texto)
 * não fica com nenhuma linha em cima, ela desce inteira, como no corpo (oráculo
 * nestwidow). Os refs das linhas aninhadas são "<célula>/bN/rM/cK/…".
 */
function nestedRowCut(c: CellContent, cut: number): number {
  if (!c.lines.length) return cut;
  const segs = (r: string) => r.split('/');
  const base = Math.min(...c.lines.map((l) => segs(l.ref).length)) - 1;
  const rows = new Map<string, LaidOutLine[]>();
  for (const l of c.lines) {
    const s = segs(l.ref);
    if (s.length < base + 4) continue;
    const k = s.slice(0, base + 2).join('/');
    (rows.get(k) ?? rows.set(k, []).get(k)!).push(l);
  }
  for (const ls of rows.values()) {
    const above = ls.filter((l) => l.y < cut);
    if (!above.length || above.length === ls.length) continue;
    const cells = new Set(ls.map((l) => segs(l.ref).slice(0, base + 3).join('/')));
    if (![...cells].some((ck) => !above.some((l) => l.ref.startsWith(ck + '/')))) continue;
    const top = Math.min(...ls.map((l) => l.y));
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= top + 0.5) prev = Math.max(prev, l.y + l.height);
    cut = Math.min(cut, prev, top);
  }
  return cut;
}

/**
 * Viúvas/órfãs no parágrafo da célula partido pelo corte, como no corpo — só
 * no modo 15 (oráculo rowwidow): a 1ª linha não fica sozinha no pé; a última
 * não vai sozinha (e se sobrar só a 1ª, o parágrafo inteiro desce).
 */
function widowCut(c: CellContent, paras: Map<string, ParaSplitInfo>, cut: number): number {
  // todo parágrafo partido pelo corte (numa tabela aninhada pode haver vários lado a lado)
  const byRef = new Map<string, LaidOutLine[]>();
  for (const l of c.lines) (byRef.get(l.ref) ?? byRef.set(l.ref, []).get(l.ref)!).push(l);
  let out = cut;
  for (const [ref, mine] of byRef) {
    const info = paras.get(ref);
    if (!info?.widow) continue;
    const n1 = mine.filter((l) => l.y + l.height <= cut + 0.5).length;
    if (n1 === 0 || n1 === mine.length) continue;
    // a 1ª linha do parágrafo está nesta parte (não é continuação de outra página)
    const hasFirst = mine.length === info.lines;
    let keep = n1;
    if (keep === 1 && hasFirst) keep = 0;
    else if (mine.length - n1 === 1 && n1 >= 2) { keep--; if (keep === 1 && hasFirst) keep = 0; }
    if (keep === n1) continue;
    if (keep > 0) { out = Math.min(out, mine[keep - 1]!.y + mine[keep - 1]!.height); continue; }
    // o parágrafo inteiro desce: corta no fim do conteúdo antes dele
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= mine[0]!.y + 0.5) prev = Math.max(prev, l.y + l.height);
    out = Math.min(out, prev, mine[0]!.y);
  }
  return out;
}

export interface TableLayout {
  x: number;
  width: number;
  rows: RowLayout[];
  /** espessura da borda esquerda da 1ª célula (twips) */
  borderLeft?: number;
  /** propriedades de fluxo */
  tblpPr?: TblPr['tblpPr'];
}

const DEFAULT_LOOK: TblLook = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };

function widthTw(w: WidthSpec | undefined, base: number): number | undefined {
  if (!w) return undefined;
  if (w.type === 'dxa') return w.w;
  if (w.type === 'pct') return (base * w.w) / 5000;
  return undefined;
}

/** Célula para a geometria: coluna inicial, colunas cobertas, largura preferida e conteúdo (sob demanda). */
interface GeoCell {
  col: number;
  span: number;
  tcW?: WidthSpec;
  /** larguras mínima (maior palavra) e máxima (sem quebrar) do conteúdo + margens */
  measure: () => { min: number; max: number };
  /** noWrap com tcW dxa: a mínima é pelo menos o tcW (piso) */
  floor?: boolean;
  /** margens laterais (e espaçamento/bordas) incluídas nas larguras */
  pad?: number;
}

/**
 * Largura de cada coluna por fronteiras (oráculo tblw d5/d6): a fronteira k é a
 * maior entre (fronteira anterior + coluna) e (início + largura) das células que
 * terminam em k — o excesso de uma célula mesclada vai para a ÚLTIMA coluna dela.
 * Células mescladas com `spread` (larguras de conteúdo) entram depois e repartem o
 * que faltar proporcionalmente às colunas que cobrem.
 */
function boundaryWidths(cells: GeoCell[][], nCols: number, v: (c: GeoCell) => number, spread?: (c: GeoCell) => boolean): number[] {
  const byEnd: { start: number; v: number }[][] = Array.from({ length: nCols + 1 }, () => []);
  const late: GeoCell[] = [];
  for (const row of cells) {
    for (const c of row) {
      const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
      if (e <= s) continue;
      if (e - s > 1 && spread?.(c)) late.push(c);
      else byEnd[e]!.push({ start: s, v: v(c) });
    }
  }
  const b = [0];
  for (let k = 1; k <= nCols; k++) {
    let m = b[k - 1]!;
    for (const c of byEnd[k]!) m = Math.max(m, b[c.start]! + c.v);
    b.push(m);
  }
  const w = b.slice(1).map((x, k) => x - b[k]!);
  late.sort((a, z) => a.span - z.span);
  for (const c of late) {
    const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
    const have = w.slice(s, e).reduce((a, x) => a + x, 0), need = v(c) - have;
    if (need <= 0) continue;
    for (let k = s; k < e; k++) w[k] = w[k]! + (have > 0 ? (need * w[k]!) / have : need / (e - s));
  }
  return w;
}

const prefOf = (w: WidthSpec | undefined): 'dxa' | 'pct' | 'auto' => (w && w.w > 0 && (w.type === 'dxa' || w.type === 'pct') ? w.type : 'auto');

/**
 * Célula cujo conteúdo não cabe nas colunas em pct que cobre: elas crescem até o mínimo
 * e as demais colunas em pct (acima do mínimo próprio) perdem por igual (tblw f1/f3/f8).
 */
function fitPctMins(p: number[], cells: GeoCell[], minOf: (c: GeoCell) => number, colMin: number[], pct: (k: number) => boolean): void {
  for (let it = 0; it < 2 * p.length + 2; it++) {
    let worst: GeoCell | undefined, need = 1e-6;
    for (const c of cells) {
      if (!pct(c.col)) continue;
      const d = minOf(c) - p.slice(c.col, c.col + c.span).reduce((a, x) => a + x, 0);
      if (d > need) { need = d; worst = c; }
    }
    if (!worst) break;
    const s = worst.col, e = Math.min(p.length, worst.col + worst.span);
    const others = p.map((_, k) => k).filter((k) => (k < s || k >= e) && pct(k) && p[k]! > colMin[k]! + 1e-6);
    const have = p.slice(s, e).reduce((a, x) => a + x, 0);
    for (let k = s; k < e; k++) p[k] = p[k]! + (have > 0 ? (need * p[k]!) / have : need / (e - s));
    // nenhuma outra coluna em pct para ceder: a tabela passa da largura pedida (oráculo tblpctmin)
    if (!others.length) continue;
    for (const k of others) p[k] = p[k]! - need / others.length;
  }
}

/**
 * Larguras das colunas (oráculos tblpct/tblw). `base` = 100% de uma tabela em pct;
 * `avail` = largura máxima de uma tabela automática (base − recuo: f7).
 *  - Layout fixo: tcW (pct da largura da tabela); célula sem tcW usa a grade gravada
 *    (d2/d3); com tblW, as colunas escalam proporcionalmente até ele (b7/b8).
 *  - Autoajuste (a grade gravada é ignorada — b2/b10): largura da tabela = tblW, ou, se
 *    automática, a soma do que as colunas querem limitada a `avail` (c5), ou a menor em
 *    que as colunas em pct cabem na sua fração (tblpct auto, d11).
 *    Colunas em pct: fração da largura, da esquerda para a direita, a última fica com o
 *    que sobra (f2); se o conteúdo não cabe, a coluna vai ao mínimo e as outras em pct
 *    perdem por igual (f1/f3/f8).
 *    As demais repartem o resto por "palpites" (como no CSS): todas no mínimo (G1); tcW
 *    dxa na largura pedida (G3, nunca abaixo do mínimo — c2); sem tcW, no máximo do
 *    conteúdo (G4). Entre dois palpites, interpola: faltando largura, encolhem primeiro
 *    as automáticas (f4/f5/f9), depois as dxa, proporcionais a (largura − mínimo)
 *    (tblpct, b3, b13, d7, d8). Sobrando, crescem as automáticas, proporcionais ao
 *    conteúdo (d1/d4/d10); sem elas, as demais, proporcionais à largura (b4). Abaixo da
 *    soma dos mínimos: com tblW a tabela cresce (f6); automática, espreme (d9).
 */
function columnWidths(cells: GeoCell[][], nCols: number, docGrid: number[], tblW: WidthSpec | undefined, fixed: boolean, base: number, avail: number): number[] {
  // o Word guarda cada coluna em twips inteiros (arredonda): é essa a largura que decide a quebra (tblround)
  return columnWidthsExact(cells, nCols, docGrid, tblW, fixed, base, avail).map((x) => Math.round(x));
}

function columnWidthsExact(cells: GeoCell[][], nCols: number, docGrid: number[], tblW: WidthSpec | undefined, fixed: boolean, base: number, avail: number): number[] {
  const tw = prefOf(tblW);
  const T0 = tw === 'dxa' ? tblW!.w : tw === 'pct' ? (base * tblW!.w) / 5000 : undefined;
  const all = cells.flat();
  if (fixed) {
    const gridSum = (c: GeoCell) => docGrid.slice(c.col, c.col + c.span).reduce((a, b) => a + b, 0);
    const tRef = T0 ?? base;
    const w = boundaryWidths(cells, nCols, (c) => {
      const k = prefOf(c.tcW);
      return k === 'dxa' ? c.tcW!.w : k === 'pct' ? (tRef * c.tcW!.w) / 5000 : gridSum(c);
    });
    const sum = w.reduce((a, b) => a + b, 0);
    return T0 !== undefined && sum > 0 ? w.map((x) => (x * T0) / sum) : w;
  }
  const m = new Map<GeoCell, { min: number; max: number }>();
  for (const c of all) m.set(c, c.measure());
  const g1 = boundaryWidths(cells, nCols, (c) => m.get(c)!.min, () => true);
  const minOf = (c: GeoCell) => m.get(c)!.min;
  if (all.length && all.every((c) => prefOf(c.tcW) === 'pct')) {
    // só pct (como o Word grava o .doc convertido): frações por fronteira, mescladas inclusive
    const T = T0 ?? Math.min(Math.max(...all.map((c) => (m.get(c)!.max * 5000) / c.tcW!.w)), avail);
    const p = boundaryWidths(cells, nCols, (c) => (T * c.tcW!.w) / 5000);
    // passou de 100%: a última fica com o que sobra (f2)
    let room = T;
    for (let j = 0; j < nCols; j++) { p[j] = Math.max(0, Math.min(p[j]!, room)); room -= p[j]!; }
    fitPctMins(p, all, minOf, g1, () => true);
    const sp = p.reduce((a, b) => a + b, 0);
    // a palavra mais longa alarga a tabela além do pedido: até a área de texto se o pedido
    // é ≤ 100%; acima de 100%, sem limite (oráculo tblpctmin)
    const cap = T0 !== undefined && T0 > base + 0.5 ? Infinity : Math.max(T, base);
    if (sp > cap + 0.5) return p.map((x) => (x * cap) / sp);
    return sp > 0 && T > sp + 0.5 ? p.map((x) => (x * T) / sp) : p;
  }
  // coluna em pct: célula sem mescla em pct e nenhuma em dxa; a fração é a maior
  const frac = Array.from({ length: nCols }, (_, j) => {
    const own = all.filter((c) => c.span === 1 && c.col === j);
    if (!own.some((c) => prefOf(c.tcW) === 'pct') || own.some((c) => prefOf(c.tcW) === 'dxa')) return 0;
    return Math.max(...own.filter((c) => prefOf(c.tcW) === 'pct').map((c) => c.tcW!.w / 5000));
  });
  const isPct = frac.map((f) => f > 0);
  // tipo de cada célula para os palpites: pct só a de coluna pct; pct mesclada vale como dxa
  const kind = (c: GeoCell, T: number): { k: 'dxa' | 'pct' | 'auto'; w: number } => {
    const k = prefOf(c.tcW);
    if (k === 'pct') return c.span === 1 && isPct[c.col] ? { k: 'pct', w: 0 } : { k: 'dxa', w: (T * c.tcW!.w) / 5000 };
    return { k, w: k === 'dxa' ? c.tcW!.w : 0 };
  };
  const sumOf = (v: number[], pick: (j: number) => boolean) => v.reduce((a, x, j) => a + (pick(j) ? x : 0), 0);
  const gMax = boundaryWidths(cells, nCols, (c) => m.get(c)!.max, () => true);
  // larguras pedidas (dxa) por fronteira; as de conteúdo das mescladas, repartidas
  const g3of = (T: number) => boundaryWidths(cells, nCols, (c) => { const q = kind(c, T); return q.k === 'dxa' ? Math.max(q.w, m.get(c)!.min) : m.get(c)!.min; }, (c) => kind(c, T).k !== 'dxa');
  const g4of = (T: number) => boundaryWidths(cells, nCols, (c) => { const q = kind(c, T), mm = m.get(c)!; return q.k === 'dxa' ? Math.max(q.w, mm.min) : q.k === 'auto' ? mm.max : mm.min; }, (c) => kind(c, T).k !== 'dxa');
  let T = T0;
  if (T === undefined) {
    const g4 = g4of(0);
    const rest = sumOf(g4, (j) => !isPct[j]);
    const fr = Math.min(1, frac.reduce((a, b) => a + b, 0));
    let t = rest;
    if (fr > 0) {
      // a menor largura em que cada coluna pct cabe na sua fração, e as demais no resto
      for (let j = 0; j < nCols; j++) if (isPct[j]) t = Math.max(t, gMax[j]! / frac[j]!);
      if (fr < 1) t = Math.max(t, rest / (1 - fr));
    }
    T = Math.min(t, avail);
  }
  const explicit = T0 !== undefined;
  // colunas em pct
  const p = new Array<number>(nCols).fill(0);
  if (isPct.some(Boolean)) {
    let room = T - sumOf(g1, (j) => !isPct[j]);
    for (let j = 0; j < nCols; j++) if (isPct[j]) { p[j] = Math.max(0, Math.min(frac[j]! * T, room)); room -= p[j]!; }
    fitPctMins(p, all.filter((c) => c.span === 1), minOf, g1, (k) => isPct[k]!);
  }
  const np = (j: number) => !isPct[j];
  if (!isPct.some((x) => !x)) {
    const sp = sumOf(p, () => true);
    return sp > 0 && T > sp + 0.5 ? p.map((x) => (x * T!) / sp) : p;
  }
  const R = T - sumOf(p, () => true);
  const g3 = g3of(T), g4 = g4of(T);
  const S1 = sumOf(g1, np), S3 = sumOf(g3, np), S4 = sumOf(g4, np);
  const lerp = (a: number[], b: number[], t: number) => a.map((x, j) => (isPct[j] ? p[j]! : x + (b[j]! - x) * t));
  if (R >= S4 - 0.5) {
    // sobra: cresce a automática (proporcional ao conteúdo); sem ela, as dxa — coluna sem
    // célula nenhuma (gridBefore/gridAfter sem largura) fica com zero (tblw h3)
    const covered = (j: number) => all.some((c) => c.col <= j && c.col + c.span > j);
    const auto = Array.from({ length: nCols }, (_, j) => np(j) && covered(j) && !all.some((c) => c.col <= j && c.col + c.span > j && kind(c, T!).k !== 'auto'));
    let grow = auto;
    if (!grow.some(Boolean)) grow = isPct.map((x, j) => !x && covered(j));
    const wsum = sumOf(g4, (j) => grow[j]!);
    const n = grow.filter(Boolean).length;
    return g4.map((x, j) => (isPct[j] ? p[j]! : grow[j] ? x + ((R - S4) * (wsum > 0 ? x / wsum : 1 / n)) : x));
  }
  if (R >= S3) return lerp(g3, g4, (R - S3) / (S4 - S3));
  if (R >= S1) return lerp(g1, g3, S3 > S1 ? (R - S1) / (S3 - S1) : 0);
  // pisos de noWrap (tcW dxa) que não cabem: a tabela passa do tblW até a largura
  // disponível (se o tblW já passa dela, fica na soma dos pisos); acima disso os pisos
  // encolhem em proporção à área de texto, largura − margens (oráculo nowrap, nw-piso)
  if (all.some((c) => c.floor) && !isPct.some(Boolean) && !(explicit && T > avail) && S1 > avail + 0.5) {
    const pad = Array.from({ length: nCols }, (_, j) => Math.max(0, ...all.filter((c) => c.span === 1 && c.col === j).map((c) => c.pad ?? 0)));
    const inner = g1.map((x, j) => Math.max(0, x - pad[j]!));
    const si = inner.reduce((a, b) => a + b, 0), cut = S1 - avail;
    return g1.map((x, j) => x - (si > 0 ? (cut * inner[j]!) / si : cut / nCols));
  }
  // nem os mínimos cabem: com tblW a tabela cresce; automática, espreme (d9) — se a
  // grade gravada já tem essa largura, ela é o aperto que o próprio Word calculou
  if (explicit) return g3.map((x, j) => (isPct[j] ? p[j]! : x));
  const sg = docGrid.reduce((a, b) => a + b, 0);
  if (!isPct.some(Boolean) && Math.abs(sg - T) <= Math.max(20, 0.005 * T)) return docGrid.map((x) => (x * T!) / sg);
  return g1.map((x, j) => (isPct[j] ? p[j]! : S1 > 0 ? (x * R) / S1 : x));
}

/**
 * Larguras do conteúdo de uma célula para o autoajuste: mínima = maior trecho sem
 * oportunidade de quebra; máxima = maior linha sem quebrar (tabs nas paradas).
 * Recuos do parágrafo e margens da célula somados. Tabela aninhada: a largura dela.
 */
function measureCell(ctx: DocContext, cell: TableCell, r: { pPr: PPr; rPr: RPr }, mar: number): { min: number; max: number } {
  const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
  const env = { tablePPr: r.pPr, tableRPr: r.rPr };
  let min = 0, max = 0;
  ctx.pure(() => {
    for (const b of blocks) {
      if (b.type !== 'paragraph') {
        const w = prefOf(b.tblPr?.tblW) === 'dxa' ? b.tblPr!.tblW!.w : prefOf(b.tblPr?.tblW) === 'pct' ? 0 : b.gridColsTwips.reduce((a, g) => a + g, 0);
        // a mínima de uma tabela aninhada é a do CONTEÚDO dela (palavra mais longa
        // de cada coluna), não a grade — a grade só pesa na máxima (oráculo tblover, tov-in-*)
        let nMin = 0;
        for (const row of b.rows) {
          let sum = 0;
          for (const c of row.cells) sum += measureCell(ctx, c, { pPr: {}, rPr: {} }, 216).min;
          nMin = Math.max(nMin, sum);
        }
        min = Math.max(min, prefOf(b.tblPr?.tblW) === 'dxa' ? w : nMin);
        max = Math.max(max, w);
        continue;
      }
      const w = paraContentWidths(prepareParagraph(ctx, b.paragraph, env), ctx.fmt.settings.defaultTabStop);
      min = Math.max(min, w.min);
      max = Math.max(max, w.max);
    }
  });
  // o Word arredonda a largura do conteúdo para cima, em twips inteiros; vazio (ou só
  // espaços) mede 6 twips em qualquer tamanho de fonte (tblw e1 + sondas de largura)
  return { min: Math.max(6, Math.ceil(min - 1e-6)) + mar, max: Math.max(6, Math.ceil(max - 1e-6)) + mar };
}

function paraContentWidths(p: PreparedPara, defaultTab: number): { min: number; max: number } {
  const tabs = p.tabs.filter((t) => t.val !== 'bar').map((t) => t.pos).sort((a, b) => a - b);
  const dts = defaultTab > 0 ? defaultTab : 720;
  const nextTab = (x: number): number => {
    const t = tabs.find((pos) => pos > x + 0.5);
    if (p.firstLine < 0 && p.indLeft > x + 0.5 && (t === undefined || p.indLeft < t)) return p.indLeft;
    if (t !== undefined) return t;
    return (Math.floor(Math.max(x, tabs.length ? tabs[tabs.length - 1]! : x) / dts + 1e-6) + 1) * dts;
  };
  let x = p.indLeft + p.firstLine;
  if (p.marker) {
    x += p.marker.width;
    if (p.marker.suff === 'tab') x = nextTab(x);
    else if (p.marker.suff === 'space') x += p.markStyle.sizePt * 5;
  }
  let end = x, max = 0, min = 0, seg = 0, first = true;
  // a 1ª palavra começa no recuo da 1ª linha (com deslocamento, antes do recuo esquerdo)
  // — com número de lista, depois dele e da sua tabulação: não há quebra entre o número
  // e a 1ª palavra (oráculo tblnum)
  const x0 = x;
  const flush = () => {
    if (seg > 0) min = Math.max(min, seg + Math.max(0, first ? x0 : p.indLeft) + p.indRight);
    if (seg > 0) first = false;
    seg = 0;
  };
  for (const g of p.glyphs) {
    if (g.kind === 'pb' || g.kind === 'cb') continue;
    if (g.kind === 'lb') { flush(); max = Math.max(max, end + p.indRight); x = p.indLeft; end = x; continue; }
    if (g.kind === 'tab') { flush(); x = nextTab(x); continue; }
    x += g.adv;
    if (g.kind === 'space') { flush(); continue; }
    end = x;
    seg += g.adv;
    if (g.breakAfter) flush();
  }
  flush();
  max = Math.max(max, end + p.indRight);
  return { min, max };
}

interface CellSlot {
  cell: TableCell;
  col: number;
  span: number;
  row: number;
  tcPr: TcPr;
  /** vMerge: quantas linhas a célula cobre (1 = sem mescla) */
  rowSpan: number;
  /** é continuação de mescla vertical (não pinta conteúdo) */
  merged: boolean;
  pPr?: PPr;
  rPr?: RPr;
}

/**
 * Linha oculta (oráculo hidden): trPr/w:hidden E todo o conteúdo oculto (marcas
 * e texto) — o Word a remove inteira, bordas incluídas. Com conteúdo visível
 * (ou sem trPr/hidden) a linha fica.
 */
export function isHiddenRow(ctx: DocContext, row: TableBlock['rows'][number]): boolean {
  if (!row.trPr?.hidden) return false;
  return row.cells.every((c) => (c.blocks ?? c.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }))).every((b) => {
    if (b.type !== 'paragraph') return false;
    const v = paraVisibility(ctx, b.paragraph, {});
    return v.markHidden && !v.visible;
  }));
}

export function layoutTable(
  ctx: DocContext, table0: TableBlock, frameX: number, frameWidth: number, layoutCell: CellLayouter, ref: string,
): TableLayout {
  const table = table0.rows.some((r) => r.trPr?.hidden) ? { ...table0, rows: table0.rows.filter((r) => !isHiddenRow(ctx, r)) } : table0;
  const theme = ctx.fmt.theme;
  const direct = table.tblPr ?? {};
  const style = ctx.resolver.tableStyle(direct.tblStyle);
  const tblPr = mergeTblPr(style.tblPr, direct);
  const look = { ...DEFAULT_LOOK, ...(direct.tblLook ?? style.tblPr.tblLook ?? {}) };
  /** margem lateral de célula sem definição: 108 twips só sem estilo de tabela algum */
  const defMar = style.hasStyle ? 0 : 108;
  const nRows = table.rows.length;

  // ── nº de colunas da grade (a grade gravada só vale como largura no layout fixo
  //    para células sem tcW — oráculo tblw d2/d3; no autoajuste o Word a recalcula) ──
  const usedCols = Math.max(1, ...table.rows.map((r) => r.cells.reduce((s, c) => s + Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1), 0) + (r.trPr?.gridBefore ?? 0) + (r.trPr?.gridAfter ?? 0)));
  let docGrid = table.gridColsTwips.slice();
  if (!docGrid.length || docGrid.every((g) => g <= 0)) {
    const total = widthTw(tblPr.tblW, frameWidth) || frameWidth;
    docGrid = Array.from({ length: usedCols }, () => total / usedCols);
  } else if (docGrid.length < usedCols) {
    // linhas com mais colunas que a grade: completa com a largura média
    const avg = docGrid.reduce((a, b) => a + b, 0) / docGrid.length;
    while (docGrid.length < usedCols) docGrid.push(avg);
  }
  const nCols = docGrid.length;

  // ── células (vMerge) ──
  const slots: CellSlot[][] = [];
  table.rows.forEach((row, ri) => {
    const rowSlots: CellSlot[] = [];
    let col = row.trPr?.gridBefore ?? 0;
    for (const cell of row.cells) {
      const tc = cell.tcPr ?? {};
      const span = Math.max(1, tc.gridSpan ?? cell.gridSpan ?? 1);
      rowSlots.push({ cell, col, span, row: ri, tcPr: tc, rowSpan: 1, merged: tc.vMerge === 'continue' });
      col += span;
    }
    slots.push(rowSlots);
  });
  // amarra continuações à célula inicial
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]!) {
      if (s.tcPr.vMerge !== 'restart') continue;
      let k = ri + 1;
      while (k < slots.length && slots[k]!.some((o) => o.col === s.col && o.merged)) k++;
      s.rowSpan = k - ri;
    }
  }

  // ── formatação condicional ──
  const rowBand = Math.max(1, tblPr.tblStyleRowBandSize ?? 1);
  const colBand = Math.max(1, tblPr.tblStyleColBandSize ?? 1);
  const condFor = (ri: number, s: CellSlot): TblStyleType[] => {
    const out: TblStyleType[] = ['wholeTable'];
    const firstRow = look.firstRow && ri === 0 || !!table.rows[ri]?.trPr?.tblHeader && look.firstRow;
    const lastRow = look.lastRow && ri === nRows - 1;
    const firstCol = look.firstColumn && s.col === 0;
    const lastCol = look.lastColumn && s.col + s.span >= nCols;
    if (!look.noVBand) {
      const c0 = s.col - (look.firstColumn ? 1 : 0);
      if (c0 >= 0 && !(lastCol && look.lastColumn)) out.push(Math.floor(c0 / colBand) % 2 === 0 ? 'band1Vert' : 'band2Vert');
    }
    if (!look.noHBand) {
      const r0 = ri - (look.firstRow ? 1 : 0);
      if (r0 >= 0 && !lastRow) out.push(Math.floor(r0 / rowBand) % 2 === 0 ? 'band1Horz' : 'band2Horz');
    }
    if (firstCol) out.push('firstCol');
    if (lastCol) out.push('lastCol');
    if (firstRow) out.push('firstRow');
    if (lastRow) out.push('lastRow');
    if (firstRow && firstCol) out.push('nwCell');
    if (firstRow && lastCol) out.push('neCell');
    if (lastRow && firstCol) out.push('swCell');
    if (lastRow && lastCol) out.push('seCell');
    return COND_ORDER.filter((t) => out.includes(t));
  };

  // ── propriedades resolvidas por célula (estilo + condicional + direto) ──
  const resolved = new Map<CellSlot, { tcPr: TcPr; pPr: PPr; rPr: RPr }>();
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]!) {
      let tcPr: TcPr = style.tcPr;
      let pPr: PPr = style.pPr;
      let rPr: RPr = style.rPr;
      for (const c of condFor(ri, s)) {
        const part = style.cond[c];
        if (!part) continue;
        tcPr = mergeTcPr(tcPr, part.tcPr);
        pPr = mergePPr(pPr, part.pPr);
        rPr = mergeRPr(rPr, part.rPr);
      }
      resolved.set(s, { tcPr: mergeTcPr(tcPr, s.tcPr), pPr, rPr });
    }
  }

  // ── bordas ──
  const tblBorders = tblPr.tblBorders ?? {};
  const edge = (s: CellSlot, side: 'top' | 'bottom' | 'left' | 'right'): BorderSpec | undefined => {
    const own = resolved.get(s)?.tcPr.tcBorders?.[side];
    if (own) return own;
    const ex = table.rows[s.row]?.tblPrEx;
    const tb = ex?.tblBorders ? { ...tblBorders, ...ex.tblBorders } : tblBorders;
    const isOuter = side === 'top' ? s.row === 0 : side === 'bottom' ? s.row + s.rowSpan >= nRows
      : side === 'left' ? s.col === 0 : s.col + s.span >= nCols;
    return isOuter ? tb[side] : (side === 'top' || side === 'bottom' ? tb.insideH : tb.insideV);
  };
  /** conflito entre bordas vizinhas: a mais grossa vence (empate: a de cima) */
  const heavier = (a: BorderSpec | undefined, b: BorderSpec | undefined) => (borderWidth(b) > borderWidth(a) ? b : a);
  const covering = (ri: number, c0: number, c1: number) => (slots[ri] ?? []).filter((o) => o.col < c1 && o.col + o.span > c0);
  /** borda vencedora no topo da célula (divisa com a linha de cima) */
  const topWinner = (s: CellSlot): BorderSpec | undefined => {
    let w: BorderSpec | undefined;
    if (s.row > 0) for (const u of covering(s.row - 1, s.col, s.col + s.span)) w = heavier(w, edge(u, 'bottom'));
    return heavier(w, edge(s, 'top'));
  };
  /**
   * Faixas horizontais de borda (medido no Word, oráculo tables): cada divisa
   * entre linhas ocupa a espessura da borda mais grossa dela — o conteúdo da
   * linha começa abaixo; a última linha ganha a faixa da borda inferior.
   */
  const band: number[] = [];
  for (let k = 0; k <= nRows; k++) {
    let m = 0;
    if (k === nRows) for (const s of slots[nRows - 1] ?? []) m = Math.max(m, borderWidth(edge(s, 'bottom')));
    else for (const s of slots[k] ?? []) {
      if (!s.merged) m = Math.max(m, borderWidth(topWinner(s)));
      // dentro de mescla vertical a borda inferior PRÓPRIA da célula de cima também
      // ocupa a divisa (não é desenhada ali) — oráculo vmdouble
      else for (const u of covering(k - 1, s.col, s.col + s.span)) m = Math.max(m, borderWidth(edge(u, 'bottom')));
    }
    band.push(m);
  }

  // ── geometria: largura da tabela, das colunas e posição (oráculos tblpct/tblw) ──
  // Modo < 15 (tabela do topo; a aninhada segue o modo 15 — tblw d13): o TEXTO da 1ª/última
  // célula fica no quadro e a tabela sai pelas margens da célula (ou meia borda, se maior):
  // 100% = quadro + margens. Modo 15: as bordas EXTERNAS ficam no quadro — a grade
  // (centro das bordas) vai de meia borda a meia borda: 100% = quadro − bordas/2.
  const legacy = ctx.fmt.settings.compatibilityMode < 15 && !/\/r\d+\/c\d+/.test(ref);
  const row0 = slots[0] ?? [];
  const sFirst = row0[0], sLast = row0[row0.length - 1];
  const marOf = (s: CellSlot, side: 'left' | 'right'): number => {
    const ex = table.rows[s.row]?.tblPrEx;
    const m = resolved.get(s)?.tcPr.tcMar?.[side] ?? ex?.tblCellMar?.[side] ?? tblPr.tblCellMar?.[side];
    return widthTw(m, frameWidth) ?? defMar;
  };
  const bL = sFirst ? borderWidth(edge(sFirst, 'left')) : 0;
  const bR = sLast ? borderWidth(edge(sLast, 'right')) : 0;
  const effL = sFirst ? Math.max(marOf(sFirst, 'left'), bL / 2) : 108;
  const effR = sLast ? Math.max(marOf(sLast, 'right'), bR / 2) : 108;
  /** largura de 100% (pct) e máximo do autoajuste */
  const base = legacy ? frameWidth + effL + effR : frameWidth - (bL + bR) / 2;
  // espaçamento entre células (bordas separadas): no autoajuste cada célula ocupa também
  // 2× o espaçamento (a 1ª e a última coluna, mais um: a borda da tabela) — somado à
  // largura pedida e ao conteúdo; as bordas laterais da célula, inteiras, só ao conteúdo
  // (oráculo tblsp)
  const spacingOf = (ri: number) => widthTw(table.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, frameWidth) ?? 0;
  const rawMeasure = new Map<CellSlot, { min: number; max: number }>();
  const rawOf = (s: CellSlot) => {
    let mm = rawMeasure.get(s);
    if (!mm) rawMeasure.set(s, (mm = measureCell(ctx, s.cell, resolved.get(s)!, marOf(s, 'left') + marOf(s, 'right'))));
    return mm;
  };
  const geoCells: GeoCell[][] = slots.map((rs, ri) => {
    const sp = spacingOf(ri);
    const out: GeoCell[] = rs.map((s) => {
      const tcW0 = resolved.get(s)?.tcPr.tcW;
      const exSp = sp > 0 ? 2 * sp + (s.col === 0 ? sp : 0) + (s.col + s.span >= nCols ? sp : 0) : 0;
      const ex = sp > 0 ? exSp + borderWidth(edge(s, 'left')) + borderWidth(edge(s, 'right')) : 0;
      const tcW = tcW0 && exSp && prefOf(tcW0) === 'dxa' ? { ...tcW0, w: tcW0.w + exSp } : tcW0;
      // w:noWrap (oráculo nowrap): sem largura pedida em twips (automática ou pct), a célula
      // não quebra — a mínima é a largura sem quebrar (se nem assim a linha cabe na largura
      // disponível, fica a mínima comum); com tcW dxa, a célula não encolhe abaixo do tcW
      // (o texto ainda quebra nele)
      const nw = !!resolved.get(s)?.tcPr.noWrap;
      const noWrap = nw && prefOf(tcW0) !== 'dxa';
      const floorW = nw && prefOf(tcW0) === 'dxa' ? tcW0!.w : 0;
      const tdir = resolved.get(s)?.tcPr.textDirection;
      const vertical = tdir === 'btLr' || tdir === 'tbRl' || tdir === 'tbRlV';
      const measure = () => {
        if (vertical) {
          // texto vertical: a largura é a "altura" do conteúdo sem quebrar (oráculo tblvert)
          const rr = resolved.get(s)!;
          const c = ctx.pure(() => layoutCell(s.cell, 0, 31680, { tablePPr: rr.pPr, tableRPr: rr.rPr }, `${ref}/r${s.row}/c${s.col}`));
          // cada linha ocupa 37/36 da sua altura, em twips inteiros; espaçamentos como estão
          const linesH = c.lines.reduce((a, l) => a + l.height, 0);
          const vh = c.lines.reduce((a, l) => a + Math.round((l.height * 37) / 36), 0) + Math.max(0, c.height - linesH);
          const w = vh + 6 + marOf(s, 'left') + marOf(s, 'right');
          return { min: w + ex, max: w + ex };
        }
        const mm = rawOf(s);
        const fits = () => mm.max + rs.reduce((a, o) => a + (o === s ? 0 : rawOf(o).min), 0) <= base;
        const min = noWrap && fits() ? mm.max : Math.max(mm.min, floorW);
        return { min: min + ex, max: Math.max(mm.max, min) + ex };
      };
      return { col: s.col, span: s.span, ...(tcW ? { tcW } : {}), measure, ...(floorW ? { floor: true } : {}), pad: marOf(s, 'left') + marOf(s, 'right') + ex };
    });
    const tr = table.rows[ri]?.trPr;
    // gridBefore/gridAfter com wBefore/wAfter: células "vazias" de largura dada
    if (tr?.gridBefore && tr.wBefore?.type === 'dxa' && tr.wBefore.w > 0) out.unshift({ col: 0, span: tr.gridBefore, tcW: tr.wBefore, measure: () => ({ min: 0, max: 0 }) });
    const end = rs.length ? rs[rs.length - 1]!.col + rs[rs.length - 1]!.span : 0;
    if (tr?.gridAfter && tr.wAfter?.type === 'dxa' && tr.wAfter.w > 0) out.push({ col: end, span: tr.gridAfter, tcW: tr.wAfter, measure: () => ({ min: 0, max: 0 }) });
    return out;
  });
  // tabela flutuante: posicionada pelo chamador (âncoras do tblpPr) — sem recuo/alinhamento
  const floating = !!tblPr.tblpPr && tblPr.tblpPr.tblpYSpec !== 'inline';
  const jc = floating ? undefined : tblPr.jc;
  const indent = floating || jc === 'center' || jc === 'right' || jc === 'end' ? 0 : widthTw(tblPr.tblInd, frameWidth) ?? 0;
  // a tabela automática vai do recuo até a margem direita (tblw f7); centralizada, nos
  // modos ≤ 14 o tblInd não posiciona mas ainda entra na largura máxima — negativo alarga,
  // positivo estreita (oráculo tblindctr)
  const maxInd = legacy && jc === 'center' && !floating ? widthTw(tblPr.tblInd, frameWidth) ?? 0 : indent;
  const grid = columnWidths(geoCells, nCols, docGrid, tblPr.tblW, tblPr.tblLayout === 'fixed', base, base - maxInd);
  const width = grid.reduce((a, b) => a + b, 0);
  const colX = [0];
  for (const g of grid) colX.push(colX[colX.length - 1]! + g);
  let x = frameX + indent + (legacy ? -effL : bL / 2);
  // centralizada: no meio do quadro; à direita: o espelho da esquerda (tblw a5/a9)
  if (jc === 'center') x = frameX + (frameWidth - width) / 2;
  else if (jc === 'right' || jc === 'end') x = frameX + frameWidth - width + (legacy ? effR : -bR / 2);

  // ── bordas SEPARADAS (oráculos cellsp/cellsp2) ──
  // tblCellSpacing presente (mesmo 0), na tabela ou em alguma linha: cada célula desenha
  // as PRÓPRIAS bordas dentro da sua caixa e a borda externa da tabela contorna tudo.
  // Entre células, entre linhas e entre a borda externa e as células: 2× o espaçamento.
  // Caixa da célula: [B_i + s, B_(i+1) − s], com B_0 = grade_0 + s, B_n = grade_n − s e
  // as divisas internas na própria grade (oráculo tblsp).
  // O texto começa na borda da célula + margem (com s = 0 o Word põe meia borda antes).
  const separated = !!tblPr.tblCellSpacing || table.rows.some((r) => !!r.trPr?.tblCellSpacing);
  const spRow = (ri: number) => widthTw(table.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, width) ?? 0;
  const spTbl = widthTw(tblPr.tblCellSpacing ?? table.rows.find((r) => r.trPr?.tblCellSpacing)?.trPr?.tblCellSpacing, width) ?? 0;
  const outerB = (ri: number, side: 'top' | 'bottom' | 'left' | 'right'): BorderSpec | undefined => table.rows[ri]?.tblPrEx?.tblBorders?.[side] ?? tblBorders[side];
  /** por linha: do topo da linha ao conteúdo / do conteúdo ao fim; espessuras das bordas das células */
  const sepTop: number[] = [], sepBottom: number[] = [], sepWT: number[] = [], sepWB: number[] = [];
  if (separated) {
    for (let ri = 0; ri < nRows; ri++) {
      const sp = spRow(ri);
      let wT = 0, wB = 0;
      for (const sl of slots[ri] ?? []) { wT = Math.max(wT, borderWidth(edge(sl, 'top'))); wB = Math.max(wB, borderWidth(edge(sl, 'bottom'))); }
      sepWT.push(wT);
      sepWB.push(wB);
      sepTop.push((ri === 0 ? borderWidth(outerB(0, 'top')) + sp : 0) + sp + wT);
      sepBottom.push(wB + sp + (ri === nRows - 1 ? sp + borderWidth(outerB(ri, 'bottom')) : 0));
    }
  }
  const bandTopOf = (ri: number) => (separated ? sepTop[ri]! : band[ri]!);
  const bandBottomOf = (ri: number) => (separated ? sepBottom[ri]! : ri === nRows - 1 ? band[nRows]! : 0);
  const g0 = colX[0]!, gn = colX[nCols]!;
  // divisas: as internas na própria grade; as externas um espaçamento para dentro (oráculo tblsp)
  const sepB = (i: number) => (i <= 0 ? g0 + spTbl : i >= nCols ? gn - spTbl : colX[i]!);

  const rows: RowLayout[] = [];
  const pendingMerges: { slot: CellSlot; content: CellContent | null; tcPr: TcPr; x0: number; x1: number; startRow: number; vertical?: string; marL: number; marR: number; env: { tablePPr?: PPr; tableRPr?: RPr } }[] = [];
  /** maior largura de linha do conteúdo (comprimento do texto vertical) */
  const maxLineW = (c: CellContent) => c.lines.reduce((m, l) => Math.max(m, l.x + l.width), 0);
  /**
   * Texto vertical (textDirection btLr/tbRl): diagrama o conteúdo no
   * comprimento disponível (altura da linha) — sem quebrar se couber; senão
   * quebra, mas nunca abaixo da maior palavra.
   */
  const layoutVertical = (s: CellSlot, avail: number, env: { tablePPr?: PPr; tableRPr?: RPr }, cref: string): CellContent => {
    // medições puras: só a diagramação final avança listas/SEQ/notas
    const natural = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 31680, env, cref)));
    if (natural <= avail + 0.5) return layoutCell(s.cell, 0, Math.max(1, avail), env, cref);
    const longest = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 1, env, cref)));
    return layoutCell(s.cell, 0, Math.max(1, avail, longest), env, cref);
  };
  const rowHeights: number[] = [];

  table.rows.forEach((row, ri) => {
    const ex = row.tblPrEx;
    // propriedades da linha com as do estilo da tabela (trPr do estilo e da 1ª linha
    // condicional: cantSplit, tblHeader — oráculo tblstyletr)
    const trp: NonNullable<typeof row.trPr> = { ...style.trPr, ...(look.firstRow && ri === 0 ? style.cond.firstRow?.trPr : undefined), ...row.trPr };
    let contentH = 0;
    const cellInfos: { slot: CellSlot; tcPr: TcPr; content?: CellContent; x0: number; x1: number; bx0: number; bx1: number; marT: number; marB: number; marL: number; marR: number; vertical?: string; env: { tablePPr?: PPr; tableRPr?: RPr } }[] = [];
    for (const s of slots[ri]!) {
      const { tcPr, pPr, rPr } = resolved.get(s)!;
      // bordas separadas: caixa da célula (bx) e área do conteúdo (x) dentro das bordas dela
      const bx0 = separated ? sepB(Math.min(s.col, nCols)) + spTbl : colX[Math.min(s.col, nCols)]!;
      const bx1 = separated ? sepB(Math.min(s.col + s.span, nCols)) - spTbl : colX[Math.min(s.col + s.span, nCols)]!;
      const x0r = bx0, x1r = bx1;
      const mar = { ...(tblPr.tblCellMar ?? {}), ...(ex?.tblCellMar ?? {}), ...(tcPr.tcMar ?? {}) };
      // bordas colapsadas: o texto fica pelo menos meia borda depois da linha da grade (tblw a11)
      const marL = Math.max(widthTw(mar.left, width) ?? defMar, separated ? 0 : borderWidth(edge(s, 'left')) / 2);
      const marR = Math.max(widthTw(mar.right, width) ?? defMar, separated ? 0 : borderWidth(edge(s, 'right')) / 2);
      const marT = widthTw(mar.top, width) ?? 0;
      const marB = widthTw(mar.bottom, width) ?? 0;
      // texto: borda da célula + margem; com espaçamento 0 o Word conta só meia borda
      // (como no modelo colapsado), mas nunca menos que a borda inteira
      const wl = separated ? borderWidth(edge(s, 'left')) : 0, wr = separated ? borderWidth(edge(s, 'right')) : 0;
      const x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.max(wl - marL, wl / 2);
      const x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.max(wr - marR, wr / 2);
      // fundo escuro na célula: texto de cor automática vira branco
      const env = { tablePPr: pPr, tableRPr: rPr, ...(isDark(cellFill(ctx, tcPr, tblPr, theme)) ? { darkBackground: true } : {}) };
      const vertical = tcPr.textDirection === 'btLr' || tcPr.textDirection === 'tbRl' || tcPr.textDirection === 'tbRlV' ? tcPr.textDirection : undefined;
      const info: (typeof cellInfos)[number] = { slot: s, tcPr, x0, x1, bx0, bx1, marT, marB, marL, marR, env, ...(vertical ? { vertical } : {}) };
      if (!s.merged) {
        if (vertical) {
          // texto vertical: diagramado depois que a altura das outras células é conhecida
          if (s.rowSpan !== 1) pendingMerges.push({ slot: s, content: null, tcPr, x0, x1, startRow: ri, vertical, marL, marR, env });
        } else {
          const content = layoutCell(s.cell, x + x0 + marL, Math.max(1, x1 - x0 - marL - marR), env, `${ref}/r${ri}/c${s.col}`);
          info.content = content;
          if (s.rowSpan === 1) contentH = Math.max(contentH, content.height + marT + marB);
          else pendingMerges.push({ slot: s, content, tcPr, x0, x1, startRow: ri, marL, marR, env });
        }
      }
      cellInfos.push(info);
    }
    // margens de cima/baixo: a MAIOR da linha vale para todas as células dela — mesmo com
    // tcMar 0 explícito ou a da tabela (oráculo rowmar)
    const rowMarT = Math.max(0, ...cellInfos.map((ci) => ci.marT)), rowMarB = Math.max(0, ...cellInfos.map((ci) => ci.marB));
    for (const ci of cellInfos) {
      if (ci.marT === rowMarT && ci.marB === rowMarB) continue;
      ci.marT = rowMarT;
      ci.marB = rowMarB;
      if (ci.content && !ci.slot.merged && ci.slot.rowSpan === 1 && !ci.vertical) contentH = Math.max(contentH, ci.content.height + rowMarT + rowMarB);
    }
    const th = row.trPr?.trHeight;
    // altura mínima × margens da célula (oráculo tcell): a mínima vale para o TEXTO
    // e as margens de cima/baixo somam por fora — max(trHeight, texto) + mT + mB; na
    // exata só a margem de BAIXO soma (a de cima fica dentro da altura)
    let maxMar = 0, maxMarB = 0;
    for (const ci of cellInfos) { maxMar = Math.max(maxMar, ci.marT + ci.marB); maxMarB = Math.max(maxMarB, ci.marB); }
    // células de texto vertical (não mescladas): comprimento = altura da linha
    for (const ci of cellInfos) {
      if (!ci.vertical || ci.slot.merged || ci.slot.rowSpan !== 1) continue;
      const rowMin = th ? th.val + (th.hRule === 'exact' ? maxMarB : maxMar) : 0;
      const avail = Math.max(contentH, rowMin) - ci.marT - ci.marB;
      const c = layoutVertical(ci.slot, avail, ci.env, `${ref}/r${ri}/c${ci.slot.col}`);
      ci.content = c;
      if (th?.hRule !== 'exact') contentH = Math.max(contentH, maxLineW(c) + ci.marT + ci.marB);
    }
    // keepNext em qualquer parágrafo de qualquer célula (oráculo keeptbl)
    const rowKeepNext = cellInfos.some((ci) => ci.content?.keepNext);
    // altura da linha (sem as faixas de borda)
    let h = contentH;
    if (th) {
      if (th.hRule === 'exact') h = th.val;
      else h = Math.max(h, th.val + maxMar);
    }
    // divisa cuja borda é só a de BAIXO da célula de cima (as de baixo sem borda
    // de cima própria): ela fica dentro da margem superior da célula de baixo — o
    // texto começa em máx(borda, margem). Com borda de cima própria (ou na 1ª
    // linha) a faixa soma — oráculos marborder, tcell
    let minMarT = Infinity, ownTop = 0;
    for (const ci of cellInfos) {
      if (ci.slot.merged) continue;
      minMarT = Math.min(minMarT, ci.marT);
      ownTop = Math.max(ownTop, borderWidth(edge(ci.slot, 'top')));
    }
    const absorb = !separated && ri > 0 && ownTop === 0 && Number.isFinite(minMarT);
    const bandTop = absorb ? Math.max(0, bandTopOf(ri) - minMarT) : bandTopOf(ri);
    // altura exata inclui a faixa de borda de cima (oráculo tables/tb-cellmar)
    if (th?.hRule === 'exact') h = Math.max(0, th.val - bandTop) + maxMarB;
    if (h <= 0) h = 0;
    const bandBottom = bandBottomOf(ri);
    // mesclas verticais que TERMINAM nesta linha: a última linha cresce se faltar altura
    // — menos com altura exata: a célula mesclada é recortada (oráculo vmexact)
    for (const m of pendingMerges) {
      if (th?.hRule === 'exact') break;
      if (m.startRow + m.slot.rowSpan - 1 !== ri || !m.content) continue;
      const spanned = rowHeights.slice(m.startRow).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) + bandTop + h;
      const need = m.content.height + (widthTw(m.tcPr.tcMar?.top, width) ?? 0) + (widthTw(m.tcPr.tcMar?.bottom, width) ?? 0);
      if (need > spanned) h += need - spanned;
    }
    rowHeights.push(bandTop + h + bandBottom);
    const paintRow = (ch: number, contents: Map<CellSlot, CellContent | undefined>, vTop: boolean, drawTop: boolean, bTop: number, bBottom: number): RowLayout => {
      const its: PageItem[] = [];
      const lns: LaidOutLine[] = [];
      const brd: PageItem[] = [];
      const brk: PageItem[] = [];
      const rh = bTop + ch + bBottom;
      const mergeAt: { col: number; at: number; endRow: number }[] = [];
      if (separated) {
        // cada célula: fundo e as próprias bordas dentro da caixa; depois a borda externa
        const cy0 = bTop - sepWT[ri]!, cy1 = bTop + ch + (bBottom > 0 ? sepWB[ri]! : 0);
        for (const ci of cellInfos) {
          const s = ci.slot;
          if (s.merged) continue;
          const fill = cellFill(ctx, ci.tcPr, tblPr, theme);
          const content = contents.get(s);
          if (fill) its.push({ t: 'rect', x: x + ci.bx0, y: cy0, w: ci.bx1 - ci.bx0, h: cy1 - cy0, fill });
          if (s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
          if (s.rowSpan === 1) {
            if (content && ci.vertical) paintVertical(its, content, ci.vertical, ci.tcPr.vAlign, x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
            else if (content) placeContent(its, lns, content, vTop ? 'top' : ci.tcPr.vAlign, ch, ci.marT, ci.marB, bTop);
          }
          const bT = edge(s, 'top'), bB = edge(s, 'bottom'), bL = edge(s, 'left'), bR = edge(s, 'right');
          if (drawTop && bT) paintBorder(ctx, brd, bT, x + ci.bx0, cy0 + borderWidth(bT) / 2, x + ci.bx1, cy0 + borderWidth(bT) / 2);
          if (bBottom > 0 && bB) paintBorder(ctx, brd, bB, x + ci.bx0, cy1 - borderWidth(bB) / 2, x + ci.bx1, cy1 - borderWidth(bB) / 2);
          if (bL) paintBorder(ctx, brd, bL, x + ci.bx0 + borderWidth(bL) / 2, cy0, x + ci.bx0 + borderWidth(bL) / 2, cy1);
          if (bR) paintBorder(ctx, brd, bR, x + ci.bx1 - borderWidth(bR) / 2, cy0, x + ci.bx1 - borderWidth(bR) / 2, cy1);
        }
        const oL = outerB(ri, 'left'), oR = outerB(ri, 'right'), oT = outerB(ri, 'top'), oB = outerB(ri, 'bottom');
        const xl = x + g0, xr = x + gn;
        paintBorder(ctx, brd, oL, xl, 0, xl, rh);
        paintBorder(ctx, brd, oR, xr, 0, xr, rh);
        if (ri === 0 && drawTop) paintBorder(ctx, brd, oT, xl - borderWidth(oL) / 2, borderWidth(oT) / 2, xr + borderWidth(oR) / 2, borderWidth(oT) / 2);
        if (ri === nRows - 1 && bBottom > 0) paintBorder(ctx, brd, oB, xl - borderWidth(oL) / 2, rh - borderWidth(oB) / 2, xr + borderWidth(oR) / 2, rh - borderWidth(oB) / 2);
        return {
          height: rh, items: its, lines: lns, borderItems: brd, breakBorderItems: brk, cantSplit: !!trp.cantSplit, header: !!trp.tblHeader,
          ...(mergeAt.length ? { mergeAt } : {}),
          ...(rowKeepNext ? { keepNext: true } : {}), natural: bTop + Math.min(ch, contentH) + bBottom,
        };
      }
      /** bordas de cima pintadas (divisa com a linha anterior) e as próprias da linha */
      const topBrd: PageItem[] = [], ownBrd: PageItem[] = [];
      let ownBand = 0;
      for (const ci of cellInfos) {
        const s = ci.slot;
        const fill = cellFill(ctx, ci.tcPr, tblPr, theme);
        const content = contents.get(s);
        if (!s.merged && s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
        if (!s.merged && s.rowSpan === 1) {
          if (fill) its.push({ t: 'rect', x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
          if (content && ci.vertical) paintVertical(its, content, ci.vertical, ci.tcPr.vAlign, x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
          else if (content) placeContent(its, lns, content, vTop ? 'top' : ci.tcPr.vAlign, ch, ci.marT, ci.marB, bTop);
        } else if (s.merged && fill) {
          its.push({ t: 'rect', x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
        }
        const tcb = ci.tcPr.tcBorders;
        // topo: na faixa de cima (continuação de linha partida: a borda de cima da célula)
        const top = drawTop ? (s.merged ? undefined : topWinner(s)) : (edge(s, 'top') ?? edge(s, 'bottom'));
        const nb = brd.length;
        if (top) paintBorder(ctx, brd, top, x + ci.x0, borderWidth(top) / 2, x + ci.x1, borderWidth(top) / 2);
        if (drawTop && ri > 0) {
          topBrd.push(...brd.slice(nb));
          const own = edge(s, 'top');
          ownBand = Math.max(ownBand, borderWidth(own));
          if (own && !s.merged) paintBorder(ctx, ownBrd, own, x + ci.x0, borderWidth(own) / 2, x + ci.x1, borderWidth(own) / 2);
        }
        const bottom = edge(s, 'bottom');
        const lastOfMerge = !slots[ri + 1]?.some((o) => o.col === s.col && o.merged);
        if (bBottom > 0) {
          const b = bottom ?? edge(s, 'top');
          paintBorder(ctx, brd, b, x + ci.x0, rh - bBottom + borderWidth(b) / 2, x + ci.x1, rh - bBottom + borderWidth(b) / 2);
        } else if (lastOfMerge) {
          // fim de página entre esta linha e a próxima: o Word fecha a linha com a borda da divisa
          let w = bottom;
          for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, 'top'));
          if (w) paintBorder(ctx, brk, w, x + ci.x0, rh + borderWidth(w) / 2, x + ci.x1, rh + borderWidth(w) / 2);
        }
        const left = edge(s, 'left'), right = edge(s, 'right');
        paintBorder(ctx, brd, left, x + ci.x0, 0, x + ci.x0, rh);
        paintBorder(ctx, brd, right, x + ci.x1, 0, x + ci.x1, rh);
        if (tcb?.tl2br) paintBorder(ctx, brd, tcb.tl2br, x + ci.x0, bTop, x + ci.x1, rh - bBottom);
        if (tcb?.tr2bl) paintBorder(ctx, brd, tcb.tr2bl, x + ci.x1, bTop, x + ci.x0, rh - bBottom);
      }
      return {
        height: rh, items: its, lines: lns, borderItems: brd, breakBorderItems: brk, cantSplit: !!trp.cantSplit, header: !!trp.tblHeader,
        ...(mergeAt.length ? { mergeAt } : {}),
        ...(rowKeepNext ? { keepNext: true } : {}), natural: bTop + Math.min(ch, contentH) + bBottom,
        ...(drawTop && ri > 0 && bTop - ownBand > 0.5 ? { topCut: bTop - ownBand, topBorders: topBrd, ownTopBorders: ownBrd } : {}),
      };
    };
    const full = new Map<CellSlot, CellContent | undefined>(cellInfos.map((ci) => [ci.slot, ci.content]));
    const canSplit = !trp.cantSplit && row.trPr?.trHeight?.hRule !== 'exact';
    // linha partida: a borda que fecha a parte de cima (a mais grossa da divisa) fica
    // abaixo do texto e também tem de caber na página (oráculo rowsplit)
    let brkW = 0;
    if (!separated) {
      for (const ci of cellInfos) {
        const s = ci.slot;
        if (slots[ri + 1]?.some((o) => o.col === s.col && o.merged)) continue;
        let w = edge(s, 'bottom');
        for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, 'top'));
        brkW = Math.max(brkW, borderWidth(w));
      }
    }
    // altura mínima (trHeight "atLeast") que não cabe no espaço livre: a linha não
    // parte, desce inteira — mesmo com conteúdo maior que ela (oráculo rowmin, modos 14/15)
    const minRow = th && th.hRule !== 'exact' ? bandTop + th.val + maxMar + bandBottom : 0;
    // linha (ou resto de linha) com divisão sob demanda entre páginas
    const build = (ch: number, contents: Map<CellSlot, CellContent | undefined>, vTop: boolean, drawTop: boolean): RowLayout => {
      const r = paintRow(ch, contents, vTop, drawTop, bandTop, bandBottom);
      if (brkW > 0 && ri < nRows - 1) r.breakW = brkW;
      if (!canSplit) return r;
      r.split = (avail: number) => {
        if (drawTop && minRow > avail + 0.5) return null;
        const a = new Map<CellSlot, CellContent | undefined>();
        const rest = new Map<CellSlot, CellContent | undefined>();
        let h1 = 0, h2 = 0, any = false;
        const availContent = avail - bandTop;
        for (const ci of cellInfos) {
          const c = contents.get(ci.slot);
          if (!c || ci.slot.merged || ci.slot.rowSpan !== 1) { a.set(ci.slot, c); continue; }
          const sp = splitContent(c, availContent - ci.marT - ci.marB - brkW);
          if (!sp) {
            // célula com texto que não põe nem a 1ª linha (ou só a órfã) nesta
            // página: a linha da tabela desce inteira (oráculo rowwidow)
            if (c.lines.length) return null;
            rest.set(ci.slot, c);
            h2 = Math.max(h2, c.height + ci.marT + ci.marB);
            continue;
          }
          any = true;
          a.set(ci.slot, sp[0]);
          rest.set(ci.slot, sp[1]);
          h1 = Math.max(h1, sp[0].height + ci.marT + ci.marB);
          h2 = Math.max(h2, sp[1].height + ci.marT + ci.marB);
        }
        if (!any) return null;
        // o alinhamento vertical da célula vale dentro de CADA parte (oráculo splitvalign)
        const first = paintRow(h1, a, false, drawTop, bandTop, 0);
        // a parte de cima fecha com a borda inferior da célula (no pé da página)
        first.borderItems.push(...(first.breakBorderItems ?? []));
        first.breakBorderItems = [];
        // o resto na página seguinte também tem a altura mínima (oráculo rowmin, rm3-cont-*)
        return [first, build(Math.max(h2, 1, th && th.hRule !== 'exact' ? th.val + maxMar : 0), rest, false, false)];
      };
      return r;
    };
    rows.push(build(h, full, false, true));
  });

  // conteúdo das células mescladas verticalmente: o fundo vai na linha inicial
  // (altura somada); o texto, na ÚLTIMA linha da mescla (coordenadas negativas)
  // para ficar por cima dos fundos das linhas de continuação
  for (const m of pendingMerges) {
    const endRow = m.startRow + m.slot.rowSpan - 1;
    const h = rowHeights.slice(m.startRow, endRow + 1).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) - bandBottomOf(endRow);
    const first = rows[m.startRow]!;
    const target = rows[endRow] ?? first;
    const fill = cellFill(ctx, m.tcPr, tblPr, theme);
    if (fill) {
      first.items.unshift({ t: 'rect', x: x + m.x0, y: 0, w: m.x1 - m.x0, h, fill });
      for (const a of first.mergeAt ?? []) a.at++;
    }
    const marT = widthTw(m.tcPr.tcMar?.top, width) ?? 0;
    const marB = widthTw(m.tcPr.tcMar?.bottom, width) ?? 0;
    // topo da célula mesclada no sistema de coordenadas da linha-alvo
    const top = bandTopOf(m.startRow) - rowHeights.slice(m.startRow, Math.min(endRow, rows.length - 1)).reduce((a, b) => a + b, 0);
    if (m.vertical) {
      const c = layoutVertical(m.slot, h - marT - marB, m.env, `${ref}/r${m.startRow}/c${m.slot.col}`);
      paintVertical(target.items, c, m.vertical, m.tcPr.vAlign, x + m.x0 + m.marL, x + m.x1 - m.marR, top + marT, top + h - marB);
    } else if (m.content) {
      const i0 = target.items.length, l0 = target.lines.length;
      placeContent(target.items, target.lines, m.content, m.tcPr.vAlign, h, marT, marB, top);
      if (target !== first) (target.mergeText ??= []).push({ col: m.slot.col, items: target.items.slice(i0), lines: target.lines.slice(l0), dy: rowHeights.slice(m.startRow, endRow).reduce((a, b) => a + b, 0), start: m.startRow, content: m.content, marT, band: bandTopOf(m.startRow), ...(m.tcPr.vAlign ? { vAlign: m.tcPr.vAlign } : {}) });
    }
  }

  const borderLeft = slots[0]?.[0] ? borderWidth(edge(slots[0][0], 'left')) : 0;
  return { x, width, rows, borderLeft, ...(tblPr.tblpPr ? { tblpPr: tblPr.tblpPr } : {}) };
}

function cellFill(ctx: DocContext, tcPr: TcPr, tblPr: TblPr, theme: DocContext['fmt']['theme']): string | undefined {
  const shd = tcPr.shd ?? tblPr.shd;
  if (!shd) return undefined;
  if (shd.val === 'solid') return resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? '000000';
  const fill = shd.themeFill
    ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, theme)
    : shd.fill && shd.fill !== 'auto' ? shd.fill.toUpperCase() : undefined;
  void ctx;
  if (shd.val && /^pct(\d+)$/.test(shd.val)) {
    // padrão percentual: mistura a cor do padrão sobre o preenchimento
    const pct = parseInt(shd.val.slice(3), 10) / 100;
    const fg = resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? '000000';
    const bg = fill ?? 'FFFFFF';
    const mix = (i: number) => Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - pct) + parseInt(fg.slice(i, i + 2), 16) * pct);
    return [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return fill;
}

/**
 * Pinta o conteúdo de uma célula de texto vertical: o conteúdo foi diagramado
 * num quadro local (x ao longo do texto, y entre linhas) e entra girado —
 * btLr: de baixo para cima (topo das letras à esquerda); tbRl: de cima para baixo.
 * O alinhamento vertical da célula vale entre as linhas (na horizontal da página).
 */
function paintVertical(items: PageItem[], c: CellContent, dir: string, vAlign: string | undefined, left: number, right: number, top: number, bottom: number): void {
  const free = right - left - c.height;
  const off = vAlign === 'center' ? free / 2 : vAlign === 'bottom' ? free : 0;
  const m: [number, number, number, number, number, number] = dir === 'btLr'
    ? [0, -1, 1, 0, left, bottom]
    : [0, 1, -1, 0, right, top];
  items.push({ t: 'xform', op: 'push', m });
  for (const it of c.items) items.push(shiftItem(it, Math.max(0, off)));
  items.push({ t: 'xform', op: 'pop' });
}

function placeContent(items: PageItem[], lines: LaidOutLine[], c: CellContent, vAlign: string | undefined, rowH: number, marT: number, marB: number, y0 = 0): void {
  if (!c) return;
  let dy = y0 + marT;
  const free = rowH - marT - marB - c.height;
  if (vAlign === 'center' && free > 0) dy += free / 2;
  else if (vAlign === 'bottom' && free > 0) dy += free;
  for (const it of c.items) items.push(shiftItem(it, dy));
  for (const l of c.lines) lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
}

/**
 * O Word grava o texto da célula mesclada na vertical na 1ª linha da mescla, na ordem
 * das colunas (oráculo vmorder). Aqui ele vai para a linha `ri` quando `fits` garante
 * que a mescla inteira fica na mesma página; `moved` recebe os itens tirados da última.
 */
export function mergeTextFirst(rows: RowLayout[], ri: number, row: RowLayout, moved: Set<object>, fits: (h: number) => boolean): RowLayout {
  if (!row.mergeAt?.length) return row;
  let items = row.items, lines = row.lines;
  for (const m of [...row.mergeAt].sort((a, b) => b.at - a.at || b.col - a.col)) {
    const mt = rows[m.endRow]?.mergeText?.find((x) => x.col === m.col);
    if (!mt || !fits(rows.slice(ri, m.endRow + 1).reduce((a, r) => a + r.height, 0))) continue;
    if (items === row.items) { items = [...items]; lines = [...lines]; }
    const dy = mt.dy - (row.cut ?? 0);
    items.splice(m.at, 0, ...mt.items.map((it) => shiftItem(it, dy)));
    lines.push(...mt.lines.map((l) => ({ ...l, y: l.y + dy, baseline: l.baseline + dy })));
    for (const o of [...mt.items, ...mt.lines]) moved.add(o);
  }
  return items === row.items ? row : { ...row, items, lines };
}

/**
 * Linha inteira no topo da página com a anterior na outra (oráculo contband): o Word
 * tira a divisa com a anterior — a faixa de cima fica só com a borda de cima da linha.
 * Sobe o conteúdo `topCut`, encurta fundos e bordas laterais e troca as bordas de cima.
 * (Os itens de mescla vertical ficam como estão: a mescla começou na outra página.)
 */
export function atPageTop(row: RowLayout): RowLayout {
  const d = row.topCut ?? 0;
  if (d <= 0) return row;
  const h = row.height;
  const top = new Set<PageItem>(row.topBorders ?? []);
  const keep = new Set<object>((row.mergeText ?? []).flatMap((m) => [...m.items, ...m.lines]));
  const cut = (it: PageItem): PageItem => keep.has(it) ? it
    : it.t === 'rect' && it.y === 0 ? { ...it, h: it.h - d }
      : it.t === 'line' && it.y1 === 0 && it.y2 === h ? { ...it, y2: h - d }
        : shiftItem(it, -d);
  const { split: _s, topCut: _t, topBorders: _b, ownTopBorders: _o, ...rest } = row;
  return {
    ...rest, height: h - d, cut: d,
    items: row.items.map(cut),
    lines: row.lines.map((l) => keep.has(l) ? l : { ...l, y: l.y - d, baseline: l.baseline - d }),
    borderItems: [...row.borderItems.filter((it) => !top.has(it)).map(cut), ...(row.ownTopBorders ?? [])],
    ...(row.breakBorderItems ? { breakBorderItems: row.breakBorderItems.map((it) => shiftItem(it, -d)) } : {}),
    ...(row.natural !== undefined ? { natural: row.natural - d } : {}),
  };
}

/** a linha sem os itens de mescla que já foram gravados na linha inicial */
export function dropMoved(row: RowLayout, moved: Set<object>): RowLayout {
  if (!moved.size || !row.mergeText) return row;
  return { ...row, items: row.items.filter((it) => !moved.has(it)), lines: row.lines.filter((l) => !moved.has(l)) };
}

export function shiftItem(it: PageItem, dy: number, dx = 0): PageItem {
  switch (it.t) {
    case 'glyphs': return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ ...g, x: g.x + dx })) : it.glyphs };
    case 'rect': case 'image': case 'shape': return { ...it, x: it.x + dx, y: it.y + dy };
    case 'line': return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case 'clip': return it.y === undefined ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    case 'xform': {
      if (!it.m) return it;
      // mantém M'(p + d) = M(p) + d (o conteúdo de dentro também é deslocado)
      const [a, b, c, d, e, f] = it.m;
      return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] };
    }
    case 'path': return { ...it, cmds: it.cmds.map((c) => c.op === 'Z' ? c : c.op === 'C' ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy }) };
  }
}
