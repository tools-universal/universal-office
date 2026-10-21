/**
 * Operações de TABELA sobre o modelo (sem DOM): o que os comandos de tabela do
 * editor fazem com o TableBlock, seguindo o que o Word grava (medido em
 * write/tools/table-lab; fatos na memória do projeto). As props TIPADAS
 * (tblPr/trPr/tcPr) são a verdade; os campos simples antigos (borders,
 * shadingHex, widthTwips, gridSpan) são espelhados por `syncLegacy` para os
 * leitores antigos (layout legado, exportações, comparação).
 *
 * Coordenadas: linha `r` (índice em rows) e COLUNA DA GRADE `c` (como o motor
 * de layout e as referências "b3/r0/c1"). Um retângulo `CellRect` é inclusivo.
 */
import type { Paragraph, Run, BorderEdge } from './document.js';
import { normalizeParagraph } from './model-ops.js';
import type { TableBlock, TableRow, TableCell, Block, TableBorders } from './fulldoc.js';
import type { TblPr, TrPr, TcPr, BorderSpec, ShadingSpec, TblLook, TcBorders, WidthSpec } from './ooxml/props.js';

export interface CellRect { r1: number; c1: number; r2: number; c2: number }

/** Célula posicionada na grade. */
export interface GridCell {
  ri: number;
  /** índice em row.cells */
  ci: number;
  cell: TableCell;
  /** 1ª coluna da grade */
  col: number;
  /** colunas da grade cobertas */
  span: number;
}

export interface TableMap {
  rows: GridCell[][];
  nCols: number;
}

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)) as T);

export const spanOf = (c: TableCell): number => Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1);
export const vMergeOf = (c: TableCell): 'restart' | 'continue' | undefined => c.tcPr?.vMerge;

/** Mapa da grade: coluna inicial e largura (em colunas) de cada célula. */
export function mapTable(t: TableBlock): TableMap {
  let nCols = t.gridColsTwips.length;
  const rows = t.rows.map((row, ri) => {
    let col = row.trPr?.gridBefore ?? 0;
    return row.cells.map((cell, ci) => {
      const g: GridCell = { ri, ci, cell, col, span: spanOf(cell) };
      col += g.span;
      nCols = Math.max(nCols, col);
      return g;
    });
  });
  return { rows, nCols };
}

/** Célula que cobre a coluna `c` da linha `r`. */
export function cellAt(m: TableMap, r: number, c: number): GridCell | undefined {
  return m.rows[r]?.find((g) => g.col <= c && c < g.col + g.span);
}

/** Linhas cobertas pela mesclagem vertical que passa por (r, c): [início, fim]. */
export function vExtent(m: TableMap, r: number, c: number): [number, number] {
  const g = cellAt(m, r, c);
  if (!g) return [r, r];
  let r1 = r;
  if (vMergeOf(g.cell) === 'continue') {
    while (r1 > 0) {
      const up = cellAt(m, r1 - 1, g.col);
      if (!up || up.col !== g.col || !vMergeOf(up.cell)) break;
      r1--;
      if (vMergeOf(up.cell) === 'restart') break;
    }
  }
  let r2 = r;
  if (vMergeOf(g.cell)) {
    while (r2 + 1 < m.rows.length) {
      const dn = cellAt(m, r2 + 1, g.col);
      if (!dn || dn.col !== g.col || vMergeOf(dn.cell) !== 'continue') break;
      r2++;
    }
  }
  return [r1, r2];
}

/** Retângulo ampliado para cobrir as células mescladas inteiras (como a seleção do Word). */
export function normRect(m: TableMap, rect: CellRect): CellRect {
  let { r1, c1, r2, c2 } = rect;
  r1 = Math.max(0, Math.min(r1, r2)); r2 = Math.min(m.rows.length - 1, Math.max(rect.r1, r2));
  c1 = Math.max(0, Math.min(c1, c2)); c2 = Math.max(rect.c1, c2);
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;
    for (let r = r1; r <= r2; r++) {
      for (const g of m.rows[r] ?? []) {
        if (g.col + g.span - 1 < c1 || g.col > c2) continue;
        if (g.col < c1) { c1 = g.col; changed = true; }
        if (g.col + g.span - 1 > c2) { c2 = g.col + g.span - 1; changed = true; }
        const [a, b] = vExtent(m, r, g.col);
        if (a < r1) { r1 = a; changed = true; }
        if (b > r2) { r2 = b; changed = true; }
      }
    }
    if (!changed) break;
  }
  return { r1, c1, r2, c2 };
}

/** Células que tocam o retângulo (inclui continuações de mescla vertical). */
export function cellsIn(m: TableMap, rect: CellRect): GridCell[] {
  const out: GridCell[] = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (const g of m.rows[r] ?? []) if (g.col <= rect.c2 && g.col + g.span - 1 >= rect.c1) out.push(g);
  }
  return out;
}

/** Retângulo da tabela inteira. */
export const wholeRect = (t: TableBlock): CellRect => ({ r1: 0, c1: 0, r2: t.rows.length - 1, c2: Math.max(0, mapTable(t).nCols - 1) });

// ───────────────────────── campos antigos ─────────────────────────

const edgeOf = (b: BorderSpec | undefined): BorderEdge | undefined => (b && b.val !== 'nil' && b.val !== 'none'
  ? { style: b.val, sizeEighthPt: b.sz ?? 0, ...(b.color && b.color !== 'auto' ? { color: b.color } : {}), spacePt: b.space ?? 0 }
  : undefined);

function legacyBorders(b: TcBorders | undefined, sides: readonly (keyof TableBorders)[]): TableBorders | undefined {
  if (!b) return undefined;
  const out: TableBorders = {};
  let any = false;
  for (const s of sides) {
    const e = edgeOf(b[s]);
    if (e) { out[s] = e; any = true; }
  }
  return any ? out : undefined;
}

/** Espelha as props tipadas nos campos simples antigos de uma célula. */
export function syncLegacyCell(cell: TableCell): void {
  const p = cell.tcPr;
  cell.gridSpan = Math.max(1, p?.gridSpan ?? 1);
  cell.widthTwips = p?.tcW?.type === 'dxa' ? p.tcW.w : undefined;
  const fill = p?.shd?.fill;
  cell.shadingHex = fill && fill !== 'auto' ? fill : undefined;
  cell.borders = legacyBorders(p?.tcBorders, ['top', 'left', 'bottom', 'right']);
  if (cell.widthTwips === undefined) delete cell.widthTwips;
  if (cell.shadingHex === undefined) delete cell.shadingHex;
  if (cell.borders === undefined) delete cell.borders;
}

/** Espelha toda a tabela (tblBorders e as células). */
export function syncLegacy(t: TableBlock): void {
  t.borders = legacyBorders(t.tblPr?.tblBorders, ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']);
  if (t.borders === undefined) delete t.borders;
  for (const row of t.rows) for (const cell of row.cells) syncLegacyCell(cell);
}

// ───────────────────────── conteúdo de célula ─────────────────────────

export const emptyPara = (): Paragraph => ({ runs: [], props: {} });

/** Blocos da célula na ordem (parágrafos e tabelas aninhadas). */
export function cellContent(cell: TableCell): Block[] {
  if (cell.blocks?.length) return cell.blocks;
  return [
    ...cell.paragraphs.map((paragraph): Block => ({ type: 'paragraph', paragraph })),
    ...cell.tables,
  ];
}

/** Troca o conteúdo da célula (mantém paragraphs/tables/blocks coerentes). */
export function setCellContent(cell: TableCell, blocks: Block[]): void {
  if (!blocks.some((b) => b.type === 'paragraph')) blocks = [...blocks, { type: 'paragraph', paragraph: emptyPara() }];
  // a célula termina num parágrafo (o Word exige)
  if (blocks[blocks.length - 1]!.type !== 'paragraph') blocks = [...blocks, { type: 'paragraph', paragraph: emptyPara() }];
  cell.blocks = blocks;
  cell.paragraphs = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
  cell.tables = blocks.filter((b): b is TableBlock => b.type === 'table');
}

const runHasContent = (r: Run): boolean => r.text.length > 0 || !!(r.image || r.textbox || r.shape || r.group || r.noteRef || r.field || r.custom || r.math);
export const paraEmpty = (p: Paragraph): boolean => !p.runs.some(runHasContent);
/** Célula sem texto nem objetos (um parágrafo vazio). */
export const cellEmpty = (cell: TableCell): boolean => cellContent(cell).every((b) => b.type === 'paragraph' && paraEmpty(b.paragraph));

/** Parágrafo vazio com a formatação de `p` (pPr e marca), como as células que o Word copia. */
export function formatLike(p: Paragraph | undefined): Paragraph {
  if (!p) return emptyPara();
  const props = clone(p.props);
  const fmt = props.src ?? props.fmtSrc;
  delete props.src;
  delete props.tocEntry;
  delete props.tocInstr;
  delete props.sectionBreak;
  if (fmt !== undefined) props.fmtSrc = fmt; else delete props.fmtSrc;
  const out: Paragraph = { runs: [], props };
  if (p.ppr) out.ppr = clone(p.ppr);
  return out;
}

const lastPara = (cell: TableCell): Paragraph | undefined => cell.paragraphs[cell.paragraphs.length - 1];

/** Célula nova com a formatação de `src` (tcPr opcional) e um parágrafo vazio. */
function cellLike(src: TableCell | undefined, keepTcPr: boolean, widthTw: number): TableCell {
  const tcPr: TcPr = keepTcPr && src?.tcPr ? clone(src.tcPr) : {};
  delete tcPr.vMerge;
  delete tcPr.hMerge;
  delete tcPr.cnfStyle;
  delete tcPr.gridSpan;
  tcPr.tcW = src?.tcPr?.tcW && src.tcPr.tcW.type !== 'dxa' && keepTcPr ? clone(src.tcPr.tcW) : { w: widthTw, type: 'dxa' };
  const paragraph = formatLike(src ? lastPara(src) : undefined);
  const cell: TableCell = { paragraphs: [paragraph], tables: [], gridSpan: 1, tcPr, blocks: [{ type: 'paragraph', paragraph }] };
  syncLegacyCell(cell);
  return cell;
}

// ───────────────────────── larguras e grade ─────────────────────────

const sum = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0);

/** Largura (twips) das colunas da grade [c, c+span). */
export function gridWidth(t: TableBlock, c: number, span: number): number {
  let w = 0;
  for (let i = c; i < c + span; i++) w += t.gridColsTwips[i] ?? 0;
  return w;
}

/** Larguras atuais de cada célula de cada linha (twips) + o espaço antes/depois. */
interface RowWidths { before: number; cells: { cell: TableCell; w: number }[]; after: number }

function currentWidths(t: TableBlock): RowWidths[] {
  const m = mapTable(t);
  return t.rows.map((row, ri) => {
    const before = row.trPr?.gridBefore ? gridWidth(t, 0, row.trPr.gridBefore) : 0;
    // a largura da célula (tcW) é a do Word; sem ela (auto/pct), a da grade
    const cells = m.rows[ri]!.map((g) => ({ cell: g.cell, w: dxaW(g.cell) || gridWidth(t, g.col, g.span) || 0 }));
    const end = (m.rows[ri]!.at(-1)?.col ?? 0) + (m.rows[ri]!.at(-1)?.span ?? 0);
    const after = row.trPr?.gridAfter ? gridWidth(t, end, row.trPr.gridAfter) : 0;
    return { before, cells, after };
  });
}

const dxaW = (c: TableCell): number | undefined => (c.tcPr?.tcW?.type === 'dxa' ? c.tcPr.tcW.w : c.widthTwips);

/**
 * Refaz a grade a partir das larguras de cada linha (união das divisas, com
 * tolerância de poucos twips como o Word) e reatribui gridSpan,
 * gridBefore/gridAfter e tcW de cada célula.
 */
function rebuildGrid(t: TableBlock, rows: RowWidths[], tol = 3): void {
  const edges: number[] = [0];
  for (const r of rows) {
    let x = r.before;
    if (r.before > 0) edges.push(x);
    for (const c of r.cells) { x += c.w; edges.push(x); }
    if (r.after > 0) edges.push(x + r.after);
  }
  edges.sort((a, b) => a - b);
  // divisas a poucos twips uma da outra são a mesma (fica a maior, como o Word)
  const uniq: number[] = [0];
  let first = 0;
  for (const e of edges) {
    if (e - first > tol) { uniq.push(e); first = e; } else if (uniq.length > 1) uniq[uniq.length - 1] = e;
  }
  const snap = (x: number): number => {
    let best = 0;
    for (let i = 0; i < uniq.length; i++) if (Math.abs(uniq[i]! - x) < Math.abs(uniq[best]! - x)) best = i;
    return best;
  };
  t.gridColsTwips = uniq.slice(1).map((e, i) => e - uniq[i]!);
  rows.forEach((r, ri) => {
    const row = t.rows[ri]!;
    let x = r.before;
    const b = snap(x);
    if (b > 0) {
      row.trPr = { ...(row.trPr ?? {}), gridBefore: b, wBefore: { w: r.before, type: 'dxa' } };
    } else if (row.trPr) { delete row.trPr.gridBefore; delete row.trPr.wBefore; }
    let ci = b;
    for (const c of r.cells) {
      x += c.w;
      const e = Math.max(ci + 1, snap(x));
      const span = e - ci;
      const tcPr = (c.cell.tcPr ??= {});
      if (span > 1) tcPr.gridSpan = span; else delete tcPr.gridSpan;
      if (!tcPr.tcW || tcPr.tcW.type === 'dxa' || tcPr.tcW.type === 'nil') tcPr.tcW = { w: Math.round(c.w), type: 'dxa' };
      syncLegacyCell(c.cell);
      ci = e;
    }
    const total = uniq.length - 1;
    if (r.after > 0 && ci < total) {
      row.trPr = { ...(row.trPr ?? {}), gridAfter: total - ci, wAfter: { w: r.after, type: 'dxa' } };
    } else if (row.trPr) { delete row.trPr.gridAfter; delete row.trPr.wAfter; }
    if (row.trPr && !Object.keys(row.trPr).length) delete row.trPr;
  });
}

/** A tabela ficou mais larga/estreita: tblW em dxa acompanha (auto vira dxa, como o Word). */
function widenTblW(t: TableBlock, rows: RowWidths[]): void {
  const w = Math.max(...rows.map((r) => r.before + sum(r.cells.map((c) => c.w)) + r.after));
  const tw = t.tblPr?.tblW;
  if (tw?.type === 'pct') return;
  (t.tblPr ??= {}).tblW = { w: Math.round(w), type: 'dxa' };
}

// ───────────────────────── criar ─────────────────────────

export interface NewTableOptions {
  /** largura disponível (coluna de texto menos recuo), twips — a grade */
  availTwips: number;
  /** largura PREFERIDA das células (tcW): o Word usa a coluna de texto sem
   *  descontar o recuo (padrão: availTwips + indTwips) */
  prefTwips?: number;
  /** comportamento de AutoAjuste do diálogo Inserir Tabela (padrão: fixa) */
  autofit?: 'fixed' | 'content' | 'window';
  /** largura fixa de coluna pedida no diálogo (padrão: automática) */
  colTwips?: number;
  /** recuo do parágrafo onde a tabela entra (vira tblInd) */
  indTwips?: number;
  /** id do estilo de tabela (Word pt-BR: "Tabelacomgrade"); null = sem estilo */
  styleId?: string | null;
  /** parágrafo de cada célula (padrão: vazio) */
  para?: () => Paragraph;
}

export const DEFAULT_LOOK: TblLook = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };

/** Larguras iguais como o Word: (disponível − 10) / n, o resto nas ÚLTIMAS colunas. */
export function equalWidths(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - rem ? 1 : 0));
}

/** Tabela nova como o botão Inserir Tabela grava (wdWord9TableBehavior). */
export function newTable(rows: number, cols: number, o: NewTableOptions): TableBlock {
  rows = Math.max(1, Math.floor(rows));
  cols = Math.max(1, Math.floor(cols));
  const widths = o.colTwips ? Array(cols).fill(Math.round(o.colTwips)) as number[] : equalWidths(Math.max(cols, Math.round(o.availTwips) - 10), cols);
  const pref = o.colTwips ? widths
    : equalWidths(Math.max(cols, Math.round(o.prefTwips ?? o.availTwips + (o.indTwips ?? 0)) - 10), cols);
  const total = sum(pref);
  const pct = pref.map((w) => Math.round((w / total) * 5000));
  const tblPr: TblPr = {};
  if (o.styleId !== null) tblPr.tblStyle = o.styleId ?? 'Tabelacomgrade';
  tblPr.tblW = o.autofit === 'window' ? { w: 5000, type: 'pct' } : { w: 0, type: 'auto' };
  if (o.indTwips) tblPr.tblInd = { w: Math.round(o.indTwips), type: 'dxa' };
  tblPr.tblLook = { ...DEFAULT_LOOK };
  const mk = (): TableRow => ({
    cells: widths.map((w, i) => {
      const paragraph = o.para?.() ?? emptyPara();
      const tcW: WidthSpec = o.autofit === 'content' ? { w: 0, type: 'auto' } : o.autofit === 'window' ? { w: pct[i]!, type: 'pct' } : { w: pref[i] ?? w, type: 'dxa' };
      const cell: TableCell = { paragraphs: [paragraph], tables: [], gridSpan: 1, tcPr: { tcW }, blocks: [{ type: 'paragraph', paragraph }] };
      syncLegacyCell(cell);
      return cell;
    }),
  });
  const t: TableBlock = { type: 'table', rows: Array.from({ length: rows }, mk), gridColsTwips: widths, tblPr };
  syncLegacy(t);
  return t;
}

// ───────────────────────── linhas ─────────────────────────

/** Linha nova com a formatação da linha `src` (trPr, tcPr e pPr; células vazias). */
function rowLike(src: TableRow): TableRow {
  const row: TableRow = { cells: src.cells.map((c) => cellLike(c, true, dxaW(c) ?? 0)) };
  src.cells.forEach((c, i) => {
    const n = row.cells[i]!;
    if (c.tcPr?.gridSpan) n.tcPr!.gridSpan = c.tcPr.gridSpan;
    if (c.tcPr?.tcW) n.tcPr!.tcW = clone(c.tcPr.tcW);
    if (c.tcPr?.vMerge) n.tcPr!.vMerge = c.tcPr.vMerge;
    syncLegacyCell(n);
  });
  if (src.trPr) row.trPr = clone(src.trPr);
  if (src.tblPrEx) row.tblPrEx = clone(src.tblPrEx);
  return row;
}

/**
 * Insere `count` linhas acima/abaixo das linhas r1..r2 (padrão: tantas quantas
 * selecionadas), copiando a formatação da linha de referência. Devolve o
 * retângulo das linhas novas (o Word as deixa selecionadas).
 */
export function insertRows(t: TableBlock, rect: CellRect, where: 'above' | 'below', count = rect.r2 - rect.r1 + 1): CellRect {
  const ref = where === 'above' ? rect.r1 : rect.r2;
  const at = where === 'above' ? rect.r1 : rect.r2 + 1;
  const src = t.rows[ref]!;
  const news = Array.from({ length: count }, () => rowLike(src));
  t.rows.splice(at, 0, ...news);
  // mescla vertical: a célula nova continua a mescla só se ficar ENTRE células dela
  const m = mapTable(t);
  for (let r = at; r < at + count; r++) {
    for (const g of m.rows[r]!) {
      if (!g.cell.tcPr?.vMerge) continue;
      const up = r > 0 ? cellAt(m, r - 1, g.col) : undefined;
      const dn = cellAt(m, at + count, g.col);
      const inside = up && up.col === g.col && vMergeOf(up.cell) && dn && dn.col === g.col && vMergeOf(dn.cell) === 'continue';
      if (inside) g.cell.tcPr.vMerge = 'continue'; else delete g.cell.tcPr.vMerge;
    }
  }
  return { r1: at, c1: 0, r2: at + count - 1, c2: Math.max(0, m.nCols - 1) };
}

/** Exclui as linhas r1..r2 (devolve false se a tabela ficou vazia — o chamador a remove). */
export function deleteRows(t: TableBlock, r1: number, r2: number): boolean {
  const m = mapTable(t);
  // mescla que começa nas linhas excluídas e continua depois: a 1ª linha restante vira o início
  if (r2 + 1 < t.rows.length) {
    for (const g of m.rows[r2 + 1]!) {
      if (vMergeOf(g.cell) !== 'continue') continue;
      const [a] = vExtent(m, r2 + 1, g.col);
      if (a >= r1) g.cell.tcPr!.vMerge = 'restart';
    }
  }
  t.rows.splice(r1, r2 - r1 + 1);
  return t.rows.length > 0;
}

// ───────────────────────── colunas ─────────────────────────

/**
 * Insere colunas à esquerda/direita do retângulo (tantas quantas colunas da
 * grade ele cobre). Regras medidas: largura e pPr da vizinha à DIREITA da
 * posição (sem ela, a da esquerda); o tcPr só é copiado na borda da tabela;
 * a tabela alarga (tblW vira dxa). Devolve o retângulo das colunas novas.
 */
export function insertColumns(t: TableBlock, rect: CellRect, where: 'left' | 'right', count = rect.c2 - rect.c1 + 1): CellRect {
  const m = mapTable(t);
  const widths = currentWidths(t);
  const created = new Set<TableCell>();
  t.rows.forEach((row, ri) => {
    const cells = m.rows[ri]!;
    if (!cells.length) return;
    // posição de inserção nesta linha (índice em row.cells)
    let idx: number;
    if (where === 'left') {
      const g = cells.find((x) => x.col + x.span - 1 >= rect.c1) ?? cells[cells.length - 1]!;
      idx = g.ci;
    } else {
      const g = [...cells].reverse().find((x) => x.col <= rect.c2) ?? cells[0]!;
      idx = g.ci + 1;
    }
    const right = row.cells[idx];
    const left = row.cells[idx - 1];
    const model = right ?? left!;
    const edge = !right || !left;
    const w = widths[ri]!.cells.find((c) => c.cell === model)?.w ?? 0;
    const news = Array.from({ length: count }, () => cellLike(model, edge, w));
    news.forEach((c) => created.add(c));
    row.cells.splice(idx, 0, ...news);
    widths[ri]!.cells.splice(idx, 0, ...news.map((cell) => ({ cell, w })));
  });
  rebuildGrid(t, widths);
  widenTblW(t, widths);
  return rectOf(t, created);
}

/** Retângulo que cobre as células dadas. */
function rectOf(t: TableBlock, cells: Set<TableCell>): CellRect {
  let r1 = Infinity, r2 = -1, c1 = Infinity, c2 = -1;
  for (const gs of mapTable(t).rows) for (const g of gs) {
    if (!cells.has(g.cell)) continue;
    r1 = Math.min(r1, g.ri); r2 = Math.max(r2, g.ri);
    c1 = Math.min(c1, g.col); c2 = Math.max(c2, g.col + g.span - 1);
  }
  return r2 < 0 ? { r1: 0, c1: 0, r2: 0, c2: 0 } : { r1, c1, r2, c2 };
}

/** Exclui as colunas da grade c1..c2 (devolve false se a tabela ficou vazia). */
export function deleteColumns(t: TableBlock, c1: number, c2: number): boolean {
  const m = mapTable(t);
  const widths = currentWidths(t);
  t.rows.forEach((row, ri) => {
    const keep: { cell: TableCell; w: number }[] = [];
    for (const g of m.rows[ri]!) {
      const a = g.col, b = g.col + g.span - 1;
      const w = widths[ri]!.cells.find((c) => c.cell === g.cell)!.w;
      if (a >= c1 && b <= c2) continue; // inteira dentro: sai
      const overlap = Math.max(0, Math.min(b, c2) - Math.max(a, c1) + 1);
      keep.push({ cell: g.cell, w: overlap ? w - gridWidth(t, Math.max(a, c1), overlap) : w });
    }
    row.cells = keep.map((k) => k.cell);
    widths[ri]!.cells = keep;
  });
  // linhas que ficaram sem células saem
  for (let ri = t.rows.length - 1; ri >= 0; ri--) {
    if (!t.rows[ri]!.cells.length) { t.rows.splice(ri, 1); widths.splice(ri, 1); }
  }
  if (!t.rows.length) return false;
  rebuildGrid(t, widths);
  if (t.tblPr?.tblW?.type === 'dxa') widenTblW(t, widths);
  return true;
}

// ───────────────────────── células ─────────────────────────

/** Excluir células deslocando à esquerda (gridAfter) ou para cima (o conteúdo sobe). */
export function deleteCells(t: TableBlock, rect: CellRect, shift: 'left' | 'up'): void {
  const m = mapTable(t);
  if (shift === 'left') {
    const widths = currentWidths(t);
    for (let r = rect.r1; r <= rect.r2; r++) {
      const gone = m.rows[r]!.filter((g) => g.col >= rect.c1 && g.col + g.span - 1 <= rect.c2);
      const goneW = sum(gone.map((g) => widths[r]!.cells.find((c) => c.cell === g.cell)!.w));
      t.rows[r]!.cells = t.rows[r]!.cells.filter((c) => !gone.some((g) => g.cell === c));
      widths[r]!.cells = widths[r]!.cells.filter((c) => !gone.some((g) => g.cell === c.cell));
      widths[r]!.after += goneW;
    }
    rebuildGrid(t, widths);
    return;
  }
  // para cima: em cada coluna do retângulo o conteúdo de baixo sobe; as de baixo ficam vazias
  const h = rect.r2 - rect.r1 + 1;
  for (let c = rect.c1; c <= rect.c2; c++) {
    const col: TableCell[] = [];
    for (let r = rect.r1; r < t.rows.length; r++) {
      const g = cellAt(m, r, c);
      if (g && g.col === c) col.push(g.cell);
    }
    for (let i = 0; i < col.length; i++) {
      const from = col[i + h];
      setCellContent(col[i]!, from ? cellContent(from) : [{ type: 'paragraph', paragraph: formatLike(lastPara(col[i]!)) }]);
    }
  }
}

/** Inserir células deslocando à direita (as outras linhas ganham gridAfter) ou para baixo. */
export function insertCells(t: TableBlock, rect: CellRect, shift: 'right' | 'down'): CellRect {
  const m = mapTable(t);
  if (shift === 'right') {
    const widths = currentWidths(t);
    let addW = 0;
    for (let r = rect.r1; r <= rect.r2; r++) {
      const gs = m.rows[r]!.filter((g) => g.col >= rect.c1 && g.col + g.span - 1 <= rect.c2);
      if (!gs.length) continue;
      const idx = gs[0]!.ci;
      const news = gs.map((g) => {
        const w = widths[r]!.cells.find((c) => c.cell === g.cell)!.w;
        return { cell: cellLike(g.cell, false, w), w };
      });
      addW = Math.max(addW, sum(news.map((n) => n.w)));
      t.rows[r]!.cells.splice(idx, 0, ...news.map((n) => n.cell));
      widths[r]!.cells.splice(idx, 0, ...news);
    }
    for (let r = 0; r < t.rows.length; r++) if (r < rect.r1 || r > rect.r2) widths[r]!.after += addW;
    rebuildGrid(t, widths);
    widenTblW(t, widths);
    return rect;
  }
  // para baixo: o conteúdo desce na coluna; linhas novas no fim recebem o excedente
  const h = rect.r2 - rect.r1 + 1;
  const last = t.rows[t.rows.length - 1]!;
  for (let i = 0; i < h; i++) t.rows.push(rowLike(last));
  const m2 = mapTable(t);
  for (let c = rect.c1; c <= rect.c2; c++) {
    const col: TableCell[] = [];
    for (let r = rect.r1; r < t.rows.length; r++) {
      const g = cellAt(m2, r, c);
      if (g && g.col === c) col.push(g.cell);
    }
    for (let i = col.length - 1; i >= 0; i--) {
      const from = col[i - h];
      setCellContent(col[i]!, from ? cellContent(from) : [{ type: 'paragraph', paragraph: formatLike(lastPara(col[i]!)) }]);
    }
  }
  return rect;
}

// ───────────────────────── mesclar / dividir ─────────────────────────

export interface MergeOptions {
  /** espaçamento do Normal (sem o do estilo de tabela): o Word o grava no
   *  último parágrafo movido e nas continuações de mescla vertical */
  normalSpacing?: { after?: number; line?: number };
}

/** Pode mesclar? (retângulo com mais de uma célula) */
export function canMerge(t: TableBlock, rect: CellRect): boolean {
  const m = mapTable(t);
  const r = normRect(m, rect);
  return cellsIn(m, r).filter((g) => vMergeOf(g.cell) !== 'continue').length > 1;
}

/** Mescla o retângulo numa célula (gridSpan + vMerge). Devolve o retângulo dela. */
export function mergeCells(t: TableBlock, rect: CellRect, o: MergeOptions = {}): CellRect {
  const m = mapTable(t);
  const rr = normRect(m, rect);
  const widths = currentWidths(t);
  const span = rr.c2 - rr.c1 + 1;
  const top = cellAt(m, rr.r1, rr.c1)!;
  // largura: soma das células da linha de cima (tcW, como o Word)
  const W = sum(widths[rr.r1]!.cells.filter((c) => m.rows[rr.r1]!.some((g) => g.cell === c.cell && g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2)).map((c) => c.w))
    || gridWidth(t, rr.c1, span);
  // conteúdo: parágrafos das células não vazias, em ordem de leitura
  const moved: Block[] = [];
  const own = cellEmpty(top.cell) ? [] : cellContent(top.cell);
  let lastMoved: Paragraph | undefined;
  for (let r = rr.r1; r <= rr.r2; r++) {
    for (const g of m.rows[r]!) {
      if (g.col < rr.c1 || g.col > rr.c2 || g.cell === top.cell || vMergeOf(g.cell) === 'continue') continue;
      if (cellEmpty(g.cell)) continue;
      const bl = cellContent(g.cell);
      moved.push(...bl);
      if (r > rr.r1) {
        const lp = [...bl].reverse().find((b) => b.type === 'paragraph');
        if (lp?.type === 'paragraph') lastMoved = lp.paragraph;
      } else lastMoved = undefined;
    }
  }
  // parágrafo das continuações: a formatação da célula ANTES de mover o conteúdo
  const contPara = new Map<number, Paragraph>();
  for (let r = rr.r1 + 1; r <= rr.r2; r++) {
    const g = m.rows[r]!.find((x) => x.col >= rr.c1 && x.col + x.span - 1 <= rr.c2);
    if (g) contPara.set(r, formatLike(lastPara(g.cell)));
  }
  const content = [...own, ...moved];
  setCellContent(top.cell, content.length ? content : [{ type: 'paragraph', paragraph: formatLike(lastPara(top.cell)) }]);
  const normal = o.normalSpacing;
  if (normal && rr.r2 > rr.r1 && lastMoved) applySpacing(lastMoved, normal);
  for (let r = rr.r1; r <= rr.r2; r++) {
    const row = t.rows[r]!;
    const gs = m.rows[r]!.filter((g) => g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2);
    if (!gs.length) continue;
    const keep = r === rr.r1 ? top.cell : gs[0]!.cell;
    const tcPr = (keep.tcPr ??= {});
    if (span > 1) tcPr.gridSpan = span; else delete tcPr.gridSpan;
    tcPr.tcW = { w: W, type: tcPr.tcW?.type === 'pct' ? 'dxa' : 'dxa' };
    if (rr.r2 > rr.r1) tcPr.vMerge = r === rr.r1 ? 'restart' : 'continue';
    if (r > rr.r1) {
      const p = contPara.get(r) ?? formatLike(lastPara(keep));
      if (normal && r < rr.r2) applySpacing(p, normal);
      setCellContent(keep, [{ type: 'paragraph', paragraph: p }]);
    }
    row.cells = row.cells.filter((c) => c === keep || !gs.some((g) => g.cell === c));
    const wr = widths[r]!;
    const at = wr.cells.findIndex((c) => gs.some((g) => g.cell === c.cell));
    wr.cells = wr.cells.filter((c) => !gs.some((g) => g.cell === c.cell));
    wr.cells.splice(at, 0, { cell: keep, w: W });
    syncLegacyCell(keep);
  }
  rebuildGrid(t, widths);
  return { r1: rr.r1, c1: rr.c1, r2: rr.r2, c2: rr.c2 };
}

function applySpacing(p: Paragraph, s: { after?: number; line?: number }): void {
  if (s.after !== undefined) p.props.spaceAfterTwips = s.after;
  if (s.line !== undefined) p.props.lineTwentieths = s.line;
}

/** Distribui os blocos de uma célula em `n` células (regra do Word: a 1ª leva os excedentes). */
function distribute(blocks: Block[], n: number): Block[][] {
  const out: Block[][] = Array.from({ length: n }, () => []);
  if (blocks.length <= n) blocks.forEach((b, i) => out[i]!.push(b));
  else {
    const extra = blocks.length - n + 1;
    out[0]!.push(...blocks.slice(0, extra));
    blocks.slice(extra).forEach((b, i) => out[i + 1]!.push(b));
  }
  return out;
}

export interface SplitOptions {
  /** mesclar antes de dividir (padrão do diálogo) */
  mergeFirst?: boolean;
  /** altura exibida de cada linha do retângulo (twips): as linhas novas ganham trHeight = altura ÷ n */
  rowHeights?: number[];
  normalSpacing?: MergeOptions['normalSpacing'];
}

/** Divide as células do retângulo em `cols` × `rows`. Devolve o retângulo das células resultantes. */
export function splitCells(t: TableBlock, rect: CellRect, cols: number, rows: number, o: SplitOptions = {}): CellRect {
  cols = Math.max(1, Math.floor(cols));
  rows = Math.max(1, Math.floor(rows));
  let rr = normRect(mapTable(t), rect);
  if ((o.mergeFirst ?? true) && canMerge(t, rr)) rr = mergeCells(t, rr, { normalSpacing: o.normalSpacing });
  const m = mapTable(t);
  const widths = currentWidths(t);
  const created: TableCell[] = [];
  // linha a linha (de baixo para cima, por causa das linhas novas)
  for (let r = rr.r2; r >= rr.r1; r--) {
    const gs = m.rows[r]!.filter((g) => g.col >= rr.c1 && g.col + g.span - 1 <= rr.c2 && vMergeOf(g.cell) !== 'continue');
    if (!gs.length) continue;
    const row = t.rows[r]!;
    const wr = widths[r]!;
    const pieces = new Map<TableCell, TableCell[]>();
    for (const g of gs) {
      const W = wr.cells.find((c) => c.cell === g.cell)!.w;
      const ws = equalWidths(W, cols);
      const parts = distribute(cellContent(g.cell), cols);
      const cells = ws.map((w, i) => {
        const c: TableCell = i === 0 ? g.cell : cellLike(g.cell, true, w);
        const tcPr = (c.tcPr ??= {});
        delete tcPr.gridSpan;
        delete tcPr.vMerge;
        tcPr.tcW = { w, type: 'dxa' };
        if (i === 0 || parts[i]!.length) setCellContent(c, parts[i]!.length ? parts[i]! : [{ type: 'paragraph', paragraph: formatLike(lastPara(g.cell)) }]);
        syncLegacyCell(c);
        return c;
      });
      pieces.set(g.cell, cells);
      created.push(...cells);
      const at = row.cells.indexOf(g.cell);
      row.cells.splice(at, 1, ...cells);
      const wi = wr.cells.findIndex((c) => c.cell === g.cell);
      wr.cells.splice(wi, 1, ...cells.map((cell, i) => ({ cell, w: ws[i]! })));
    }
    if (rows > 1) {
      // as outras células da linha passam a mesclas verticais sobre as linhas novas
      for (const c of row.cells) {
        if (created.includes(c)) continue;
        const tcPr = (c.tcPr ??= {});
        if (!tcPr.vMerge) tcPr.vMerge = 'restart';
      }
      const h = o.rowHeights?.[r - rr.r1];
      const each = h ? Math.floor(h / rows) : undefined;
      if (each) row.trPr = { ...(row.trPr ?? {}), trHeight: { val: each, hRule: 'atLeast' } };
      const extra: TableRow[] = [];
      const extraW: RowWidths[] = [];
      for (let k = 1; k < rows; k++) {
        const nr: TableRow = { cells: [] };
        const nw: RowWidths = { before: wr.before, cells: [], after: wr.after };
        for (const c of row.cells) {
          const w = wr.cells.find((x) => x.cell === c)!.w;
          let n: TableCell;
          if (created.includes(c)) {
            n = cellLike(c, true, w);
            created.push(n);
          } else {
            n = cellLike(c, true, w);
            n.tcPr!.vMerge = 'continue';
            if (c.tcPr?.gridSpan) n.tcPr!.gridSpan = c.tcPr.gridSpan;
            syncLegacyCell(n);
          }
          nr.cells.push(n);
          nw.cells.push({ cell: n, w });
        }
        if (row.trPr) nr.trPr = clone(row.trPr);
        if (row.tblPrEx) nr.tblPrEx = clone(row.tblPrEx);
        extra.push(nr);
        extraW.push(nw);
      }
      t.rows.splice(r + 1, 0, ...extra);
      widths.splice(r + 1, 0, ...extraW);
    }
  }
  rebuildGrid(t, widths);
  return created.length ? rectOf(t, new Set(created)) : rr;
}

/** Divide a tabela antes da linha `r`: devolve a parte de baixo (tabela nova). */
export function splitTable(t: TableBlock, r: number): TableBlock | null {
  if (r <= 0 || r >= t.rows.length) return null;
  const rows = t.rows.splice(r);
  const t2: TableBlock = { type: 'table', rows, gridColsTwips: [...t.gridColsTwips] };
  if (t.tblPr) t2.tblPr = clone(t.tblPr);
  if (t.borders) t2.borders = clone(t.borders);
  // a mescla vertical que atravessava o corte recomeça na parte de baixo
  const m = mapTable(t2);
  for (const g of m.rows[0] ?? []) if (vMergeOf(g.cell) === 'continue') g.cell.tcPr!.vMerge = 'restart';
  const m1 = mapTable(t);
  for (const g of m1.rows[m1.rows.length - 1] ?? []) {
    if (vMergeOf(g.cell) === 'restart') delete g.cell.tcPr!.vMerge;
  }
  return t2;
}

// ───────────────────────── tamanho ─────────────────────────

/** Altura das linhas (twips); `rule` exact/atLeast; 0 = automática (sem trHeight). */
export function setRowHeight(t: TableBlock, r1: number, r2: number, twips: number, rule: 'exact' | 'atLeast' = 'atLeast'): void {
  for (let r = r1; r <= r2; r++) {
    const row = t.rows[r]!;
    if (twips > 0) row.trPr = { ...(row.trPr ?? {}), trHeight: { val: Math.round(twips), hRule: rule } };
    else if (row.trPr) { delete row.trPr.trHeight; if (!Object.keys(row.trPr).length) delete row.trPr; }
  }
}

/** Distribuir linhas: todas com a média das alturas exibidas (pelo menos). */
export function distributeRows(t: TableBlock, r1: number, r2: number, heights: number[]): void {
  const n = r2 - r1 + 1;
  const avg = Math.round(sum(heights.slice(0, n)) / n);
  setRowHeight(t, r1, r2, avg, 'atLeast');
}

/** Largura das colunas da grade c1..c2 (twips): a tabela alarga/encolhe (o Word não redistribui). */
export function setColumnWidth(t: TableBlock, c1: number, c2: number, twips: number): void {
  const m = mapTable(t);
  const widths = currentWidths(t);
  const old = t.gridColsTwips.slice();
  const nw = old.map((w, i) => (i >= c1 && i <= c2 ? Math.round(twips) : w));
  t.rows.forEach((_, ri) => {
    for (const g of m.rows[ri]!) {
      const c = widths[ri]!.cells.find((x) => x.cell === g.cell)!;
      let w = 0;
      for (let i = g.col; i < g.col + g.span; i++) w += nw[i] ?? 0;
      c.w = w;
    }
  });
  rebuildGrid(t, widths);
  if (t.tblPr?.tblW?.type === 'dxa') widenTblW(t, widths);
}

/** Distribuir colunas: as colunas da grade c1..c2 com a média das larguras. */
export function distributeColumns(t: TableBlock, c1: number, c2: number): void {
  const n = c2 - c1 + 1;
  const avg = Math.round(gridWidth(t, c1, n) / n);
  setColumnWidth(t, c1, c2, avg);
}

/**
 * AutoAjuste: conteúdo (tcW auto, tblW auto), janela (tblW 5000 pct, tcW pct
 * proporcional, grade escalada para a largura disponível − 10) ou largura fixa
 * (tblLayout fixed, tcW dxa das larguras atuais).
 */
export function autoFit(t: TableBlock, mode: 'content' | 'window' | 'fixed', availTwips?: number): void {
  const tblPr = (t.tblPr ??= {});
  const m = mapTable(t);
  const total = sum(t.gridColsTwips) || 1;
  if (mode === 'content') {
    delete tblPr.tblLayout;
    tblPr.tblW = { w: 0, type: 'auto' };
    for (const row of t.rows) for (const c of row.cells) { (c.tcPr ??= {}).tcW = { w: 0, type: 'auto' }; syncLegacyCell(c); }
    return;
  }
  if (mode === 'window') {
    delete tblPr.tblLayout;
    tblPr.tblW = { w: 5000, type: 'pct' };
    for (const gs of m.rows) for (const g of gs) {
      (g.cell.tcPr ??= {}).tcW = { w: Math.round((gridWidth(t, g.col, g.span) / total) * 5000), type: 'pct' };
      syncLegacyCell(g.cell);
    }
    if (availTwips) {
      const W = Math.max(1, availTwips - 10);
      t.gridColsTwips = t.gridColsTwips.map((w) => Math.round((w / total) * W));
    }
    return;
  }
  tblPr.tblLayout = 'fixed';
  for (const gs of m.rows) for (const g of gs) {
    (g.cell.tcPr ??= {}).tcW = { w: gridWidth(t, g.col, g.span), type: 'dxa' };
    syncLegacyCell(g.cell);
  }
}

// ───────────────────────── propriedades ─────────────────────────

/** Aplica um patch ao tcPr das células do retângulo (undefined apaga o campo). */
export function setCellProps(t: TableBlock, rect: CellRect, patch: Partial<TcPr>): void {
  const m = mapTable(t);
  for (const g of cellsIn(m, normRect(m, rect))) {
    const tcPr = (g.cell.tcPr ??= {});
    for (const [k, v] of Object.entries(patch) as [keyof TcPr, unknown][]) {
      if (v === undefined) delete tcPr[k];
      else (tcPr as Record<string, unknown>)[k] = clone(v);
    }
    syncLegacyCell(g.cell);
  }
}

/** Patch no trPr das linhas r1..r2. */
export function setRowProps(t: TableBlock, r1: number, r2: number, patch: Partial<TrPr>): void {
  for (let r = r1; r <= r2; r++) {
    const row = t.rows[r]!;
    const trPr: TrPr = (row.trPr ??= {});
    for (const [k, v] of Object.entries(patch) as [keyof TrPr, unknown][]) {
      if (v === undefined) delete trPr[k];
      else (trPr as Record<string, unknown>)[k] = clone(v);
    }
    if (!Object.keys(trPr).length) delete row.trPr;
  }
}

/** Patch no tblPr. */
export function setTableProps(t: TableBlock, patch: Partial<TblPr>): void {
  const tblPr: TblPr = (t.tblPr ??= {});
  for (const [k, v] of Object.entries(patch) as [keyof TblPr, unknown][]) {
    if (v === undefined) delete tblPr[k];
    else (tblPr as Record<string, unknown>)[k] = clone(v);
  }
  syncLegacy(t);
}

/** Alinhamento da tabela (Propriedades): o Word grava jc em tblPr E em cada linha. */
export function setTableAlign(t: TableBlock, jc: 'left' | 'center' | 'right' | undefined): void {
  setTableProps(t, { jc: jc === 'left' ? undefined : jc });
  setRowProps(t, 0, t.rows.length - 1, { jc: jc === 'left' ? undefined : jc });
}

/** Espaçamento entre células (pt na interface = metade em tblCellSpacing, em tblPr e em cada trPr). */
export function setCellSpacing(t: TableBlock, twips: number | undefined): void {
  const v = twips && twips > 0 ? { w: Math.round(twips / 2), type: 'dxa' as const } : undefined;
  setTableProps(t, { tblCellSpacing: v });
  setRowProps(t, 0, t.rows.length - 1, { tblCellSpacing: v });
}

/**
 * Direção do texto: vertical acrescenta cantSplit e altura mínima de 2 cm
 * (1134 tw) na linha; o recuo de 0,2 cm nos parágrafos fica com o chamador.
 */
export function setTextDirection(t: TableBlock, rect: CellRect, dir: string | undefined): void {
  setCellProps(t, rect, { textDirection: dir && dir !== 'lrTb' ? dir : undefined });
  if (!dir || dir === 'lrTb' || dir === 'lrTbV') return;
  const rr = normRect(mapTable(t), rect);
  for (let r = rr.r1; r <= rr.r2; r++) {
    const row = t.rows[r]!;
    const trPr: TrPr = (row.trPr ??= {});
    trPr.cantSplit = true;
    if (!trPr.trHeight || (trPr.trHeight.hRule !== 'exact' && trPr.trHeight.val < 1134)) trPr.trHeight = { val: 1134, hRule: 'atLeast' };
  }
}

// ───────────────────────── bordas e sombreamento ─────────────────────────

export type BorderKind =
  | 'bottom' | 'top' | 'left' | 'right' | 'none' | 'all' | 'outside' | 'inside' | 'insideH' | 'insideV' | 'tl2br' | 'tr2bl';

export const NO_BORDER: BorderSpec = { val: 'nil' };

/**
 * Bordas: na tabela inteira, w:tblBorders como DIFERENÇA do estilo (igual ao
 * estilo = some, como o Word); em células, w:tcBorders nas DUAS células de cada
 * aresta. `spec` null = remover (sem borda).
 */
export function setBorders(
  t: TableBlock, rect: CellRect, kind: BorderKind, spec: BorderSpec | null,
  o: { wholeTable?: boolean; styleBorders?: TcBorders } = {},
): void {
  const m = mapTable(t);
  const rr = normRect(m, rect);
  const sides = sidesOf(kind);
  const on = (s: string): boolean => kind === 'none' || sides.includes(s);
  if (o.wholeTable) {
    const tb: TcBorders = { ...(t.tblPr?.tblBorders ?? {}) };
    const want = kind === 'none' ? { val: 'none', sz: 0, space: 0, color: 'auto' } : (spec ?? { val: 'none', sz: 0, space: 0, color: 'auto' });
    for (const s of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const) {
      if (!on(s)) continue;
      const st = o.styleBorders?.[s];
      const same = st && st.val === want.val && (st.sz ?? 0) === (want.sz ?? 0) && (st.color ?? 'auto') === (want.color ?? 'auto');
      const styleNone = !st || st.val === 'none' || st.val === 'nil';
      if (same || (styleNone && (want.val === 'none' || want.val === 'nil'))) delete tb[s];
      else tb[s] = clone(want);
    }
    setTableProps(t, { tblBorders: Object.keys(tb).length ? tb : undefined });
    // as bordas de célula dessas arestas deixam de valer
    for (const gs of m.rows) for (const g of gs) {
      const cb = g.cell.tcPr?.tcBorders;
      if (!cb) continue;
      for (const s of ['top', 'left', 'bottom', 'right'] as const) if (on(s) || on('inside' + (s === 'top' || s === 'bottom' ? 'H' : 'V'))) delete cb[s];
      if (!Object.keys(cb).length) delete g.cell.tcPr!.tcBorders;
      syncLegacyCell(g.cell);
    }
    return;
  }
  const val = kind === 'none' || !spec ? NO_BORDER : spec;
  const setSide = (cell: TableCell, s: keyof TcBorders, b: BorderSpec): void => {
    const tcPr = (cell.tcPr ??= {});
    (tcPr.tcBorders ??= {})[s] = clone(b);
    syncLegacyCell(cell);
  };
  for (const g of cellsIn(m, rr)) {
    const top = g.ri === rr.r1, bottom = g.ri === rr.r2 || vExtent(m, g.ri, g.col)[1] >= rr.r2;
    const left = g.col === rr.c1, right = g.col + g.span - 1 === rr.c2;
    const want: [keyof TcBorders, boolean][] = [
      ['top', top ? on('top') : on('insideH')],
      ['bottom', bottom ? on('bottom') : on('insideH')],
      ['left', left ? on('left') : on('insideV')],
      ['right', right ? on('right') : on('insideV')],
      ['tl2br', on('tl2br')], ['tr2bl', on('tr2bl')],
    ];
    for (const [s, yes] of want) {
      if (!yes) continue;
      if ((s === 'tl2br' || s === 'tr2bl') && kind === 'none') { setSide(g.cell, s, NO_BORDER); continue; }
      if ((s === 'tl2br' || s === 'tr2bl') && !sides.includes(s)) continue;
      setSide(g.cell, s, val);
      // a célula do outro lado da aresta recebe o lado oposto
      const nb = s === 'top' ? cellAt(m, g.ri - 1, g.col) : s === 'bottom' ? cellAt(m, vExtent(m, g.ri, g.col)[1] + 1, g.col)
        : s === 'left' ? cellAt(m, g.ri, g.col - 1) : s === 'right' ? cellAt(m, g.ri, g.col + g.span) : undefined;
      const opp = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as Record<string, keyof TcBorders>)[s];
      if (nb && opp && !cellsIn(m, rr).includes(nb)) setSide(nb.cell, opp, val);
    }
  }
}

function sidesOf(kind: BorderKind): string[] {
  switch (kind) {
    case 'all': return ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    case 'outside': return ['top', 'left', 'bottom', 'right'];
    case 'inside': return ['insideH', 'insideV'];
    case 'none': return ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    default: return [kind];
  }
}

/** Sombreamento das células (tabela inteira: também o tblPr, como o Word). null = sem cor. */
export function setShading(t: TableBlock, rect: CellRect, shd: ShadingSpec | null, wholeTable = false): void {
  setCellProps(t, rect, { shd: shd ?? undefined });
  if (wholeTable) setTableProps(t, { shd: shd ?? undefined });
}

/** Opções de estilo (tblLook). */
export function setLook(t: TableBlock, patch: Partial<TblLook>): void {
  const look: TblLook = { ...DEFAULT_LOOK, ...(t.tblPr?.tblLook ?? {}), ...patch };
  setTableProps(t, { tblLook: look });
}

// ───────────────────────── converter ─────────────────────────

export type TextSeparator = 'paragraph' | 'tab' | 'semicolon' | 'comma' | { char: string };

const sepChar = (s: TextSeparator): string | null =>
  s === 'tab' ? '\t' : s === 'semicolon' ? ';' : s === 'comma' ? ',' : s === 'paragraph' ? null : s.char;

/** Corta os runs de um parágrafo no caractere separador. */
function splitRuns(p: Paragraph, ch: string): Run[][] {
  const out: Run[][] = [[]];
  for (const r of p.runs) {
    if (r.image || r.textbox || r.shape || r.group || r.field || r.custom || r.math || r.noteRef || !r.text.includes(ch)) {
      out[out.length - 1]!.push(r);
      continue;
    }
    const parts = r.text.split(ch);
    parts.forEach((txt, i) => {
      if (i > 0) out.push([]);
      if (txt) out[out.length - 1]!.push({ ...r, text: txt, props: { ...r.props } });
    });
  }
  return out;
}

/** Detecta o separador como o diálogo do Word: tabulações, senão ponto e vírgula, senão parágrafos. */
export function guessSeparator(paras: readonly Paragraph[]): TextSeparator {
  const txt = paras.map((p) => p.runs.map((r) => r.text).join(''));
  if (txt.some((s) => s.includes('\t'))) return 'tab';
  if (txt.some((s) => s.includes(';'))) return 'semicolon';
  return 'paragraph';
}

/** Número de colunas que o texto dá com o separador. */
export function columnsFor(paras: readonly Paragraph[], sep: TextSeparator): number {
  const ch = sepChar(sep);
  if (ch === null) return 1;
  return Math.max(1, ...paras.map((p) => p.runs.map((r) => r.text).join('').split(ch).length));
}

/**
 * Converter texto em tabela: cada parágrafo vira uma linha (cortada no
 * separador) — ou, com separador de parágrafo, os parágrafos preenchem as
 * células em ordem, `cols` por linha. Mesma tabela do botão Inserir.
 */
export function textToTable(paras: Paragraph[], sep: TextSeparator, o: NewTableOptions & { cols?: number }): TableBlock {
  const ch = sepChar(sep);
  let rowsContent: Paragraph[][];
  if (ch === null) {
    const cols = Math.max(1, o.cols ?? 1);
    rowsContent = [];
    for (let i = 0; i < paras.length; i += cols) rowsContent.push(paras.slice(i, i + cols));
  } else {
    rowsContent = paras.map((p) => splitRuns(p, ch).map((runs) => ({ runs, props: cleanProps(p), ...(p.ppr ? { ppr: clone(p.ppr) } : {}) })));
  }
  const cols = Math.max(o.cols ?? 1, ...rowsContent.map((r) => r.length));
  const t = newTable(rowsContent.length, cols, o);
  rowsContent.forEach((cells, ri) => {
    cells.forEach((p, ci) => {
      const cell = t.rows[ri]!.cells[ci]!;
      setCellContent(cell, [{ type: 'paragraph', paragraph: p }]);
    });
  });
  return t;
}

const cleanProps = (p: Paragraph): Paragraph['props'] => {
  const props = { ...p.props };
  delete props.src;
  delete props.sectionBreak;
  return props;
};

/**
 * Converter tabela em texto. Tabulação: um parágrafo por linha, células
 * separadas por tab, com paradas de tabulação nas divisas das colunas e recuo
 * de 113 tw (medido); parágrafos: um parágrafo por parágrafo de célula; outro:
 * células unidas pelo caractere. Tabelas aninhadas viram texto também.
 */
export function tableToText(t: TableBlock, sep: TextSeparator): Paragraph[] {
  const ch = sepChar(sep);
  const out: Paragraph[] = [];
  const m = mapTable(t);
  const flat = (cell: TableCell): Paragraph[] => cellContent(cell).flatMap((b) => (b.type === 'paragraph' ? [b.paragraph] : tableToText(b, sep)));
  t.rows.forEach((_, ri) => {
    const cells = m.rows[ri]!.filter((g) => vMergeOf(g.cell) !== 'continue');
    if (ch === null) {
      for (const g of cells) for (const p of flat(g.cell)) out.push({ ...p, props: { ...p.props } });
      return;
    }
    const first = flat(cells[0]?.cell ?? { paragraphs: [emptyPara()], tables: [], gridSpan: 1 })[0] ?? emptyPara();
    const runs: Run[] = [];
    cells.forEach((g, i) => {
      const ps = flat(g.cell);
      ps.forEach((p, k) => {
        if (k > 0) runs.push({ text: ' ', props: { ...(p.runs[0]?.props ?? {}) } } as Run);
        runs.push(...p.runs.map((r) => ({ ...r, props: { ...r.props } })));
      });
      if (i < cells.length - 1) runs.push({ text: ch, props: { ...(ps.at(-1)?.runs.at(-1)?.props ?? first.runs[0]?.props ?? {}) } } as Run);
    });
    const props = { ...first.props };
    if (ch === '\t') {
      let x = 0;
      const stops: { posTwips: number; align: 'left' }[] = [];
      for (const g of cells.slice(0, -1)) {
        x += gridWidth(t, g.col, g.span);
        stops.push({ posTwips: x + 113, align: 'left' });
      }
      props.tabStops = stops;
      props.indentLeftTwips = 113;
    }
    const p: Paragraph = { runs: runs.filter((r) => r.text !== '' || runHasContent(r)), props };
    if (first.ppr) p.ppr = clone(first.ppr);
    normalizeParagraph(p);
    out.push(p);
  });
  return out;
}

// ───────────────────────── utilidades para o editor ─────────────────────────

/**
 * Depois de JSON (desfazer): `paragraphs`/`tables` de cada célula voltam a ser
 * os MESMOS objetos dos `blocks` (o JSON duplica as referências). Os blocos
 * precisam estar alinhados aos parágrafos quando o estado foi tirado.
 */
export function relink(t: TableBlock): TableBlock {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      if (!cell.blocks?.length) { cell.tables.forEach(relink); continue; }
      let k = 0;
      cell.blocks = cell.blocks.map((b): Block => {
        if (b.type === 'table') return relink(b);
        const p = cell.paragraphs[k++];
        return p ? { type: 'paragraph', paragraph: p } : b;
      });
      if (k < cell.paragraphs.length) for (const p of cell.paragraphs.slice(k)) cell.blocks.push({ type: 'paragraph', paragraph: p });
      cell.tables = cell.blocks.filter((b): b is TableBlock => b.type === 'table');
    }
  }
  return t;
}

/** Cópia profunda (estrutura e props) de uma tabela, sem os ids de origem. */
export function cloneTable(t: TableBlock): TableBlock {
  const c = clone(t);
  delete c.src;
  for (const r of c.rows) { delete r.src; for (const cell of r.cells) delete cell.src; }
  return c;
}

/** Larguras de borda das células vizinhas — para testes e diagnósticos. */
export function describe(t: TableBlock): string {
  const m = mapTable(t);
  return m.rows.map((gs) => gs.map((g) => {
    const txt = cellContent(g.cell).map((b) => (b.type === 'paragraph' ? b.paragraph.runs.map((r) => r.text).join('') : '[T]')).join('/');
    return `${g.col}${g.span > 1 ? `+${g.span}` : ''}${g.cell.tcPr?.vMerge ? (g.cell.tcPr.vMerge === 'restart' ? 'V' : 'v') : ''}:${txt}`;
  }).join(' | ')).join('\n');
}
