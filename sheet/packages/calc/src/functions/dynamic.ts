/**
 * Matrizes dinâmicas (FILTER, SORT, SORTBY, UNIQUE, SEQUENCE, RANDARRAY, TAKE, DROP, EXPAND, VSTACK, HSTACK, TOCOL, TOROW, WRAPROWS, WRAPCOLS, CHOOSEROWS, CHOOSECOLS, TRIMRANGE, GROUPBY, PIVOTBY, PERCENTOF).
 * Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR (dyn.cases.json; lab calc/tdl): ver os comentários
 * de cada função. Ordem de SORT/SORTBY e igualdade de UNIQUE pela colação do
 * Excel (collation.ts: "ß" = "ss", "a" ≠ "á").
 */
import { register, type FnContext } from '../fn.js';
import { compareText } from '../collation.js';
import { toBool, toNumber } from '../coerce.js';
import { ArrayValue, CalcError, ERR, LambdaValue, MAX_COL, MAX_ROW, RefValue, type Area, type Scalar, type Value } from '../values.js';
import { asArray } from './tdl-util.js';

// ───────────────────────────── apoio ─────────────────────────────

/** Matriz de um argumento (erro escalar → erro). */
function A(v: Value, ctx: FnContext): ArrayValue | CalcError {
  if (v instanceof CalcError) return v;
  return asArray(v, ctx);
}

/** Inteiro de um argumento escalar (vazio/omitido → def). */
function intOr(v: Value | undefined, def: number, ctx: FnContext): number | CalcError {
  if (v === undefined || v === null) return def;
  if (v instanceof ArrayValue) v = v.get(0, 0);
  if (v instanceof RefValue) { const a = v.areas[0]!; v = ctx.cell(a.sheet, a.r1, a.c1); }
  if (v instanceof LambdaValue) return ERR.VALUE;
  const n = toNumber(v as Scalar, ctx.locale, ctx.date1904);
  return n instanceof CalcError ? n : Math.trunc(n);
}

/** Booleano de um argumento escalar (vazio/omitido → def). */
function boolOr(v: Value | undefined, def: boolean, ctx: FnContext): boolean | CalcError {
  if (v === undefined || v === null) return def;
  if (v instanceof ArrayValue) v = v.get(0, 0);
  if (v instanceof RefValue) { const a = v.areas[0]!; v = ctx.cell(a.sheet, a.r1, a.c1); }
  if (v instanceof LambdaValue) return ERR.VALUE;
  return toBool(v as Scalar, ctx.locale);
}

/** Escalar de preenchimento (pad_with / if_empty). */
function scalarOf(v: Value, ctx: FnContext): Scalar {
  if (v instanceof ArrayValue) return v.get(0, 0);
  if (v instanceof RefValue) { const a = v.areas[0]!; return ctx.cell(a.sheet, a.r1, a.c1); }
  if (v instanceof LambdaValue) return ERR.CALC;
  return v;
}

const rowsOf = (a: ArrayValue): Scalar[][] => Array.from({ length: a.rows }, (_, r) => Array.from({ length: a.cols }, (_, c) => a.get(r, c)));
const fromRows = (rows: Scalar[][], cols: number): ArrayValue | CalcError => (rows.length && cols ? ArrayValue.fill(rows.length, cols, (r, c) => (c < rows[r]!.length ? rows[r]![c]! : ERR.NA)) : ERR.CALC);
const transpose = (a: ArrayValue): ArrayValue => ArrayValue.fill(a.cols, a.rows, (r, c) => a.get(c, r));

/** Ordem do SORT: número < texto < booleano < erro < vazio (texto pela colação). */
const srank = (v: Scalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : v === null ? 4 : 3);
function sortCmp(a: Scalar, b: Scalar): number {
  const ra = srank(a), rb = srank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (ra === 0) return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
  if (ra === 1) return compareText(a as string, b as string);
  if (ra === 2) return a === b ? 0 : a ? 1 : -1;
  return 0;
}

/** Aplica a direção: vazio fica por último também no descendente (medido no SORT). */
function sortDir(a: Scalar, b: Scalar, c: number, order: number): number {
  if (order > 0 || a === null || b === null) return c;
  return -c;
}

/** Igualdade de UNIQUE (colação para texto; número exato). */
function sameCell(a: Scalar, b: Scalar): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'string') return compareText(a, b as string) === 0;
  if (a instanceof CalcError) return b instanceof CalcError && a.code === b.code;
  return a === b;
}

/** Índices de uma lista (CHOOSEROWS/CHOOSECOLS): negativos contam do fim; 0 ou fora → #VALUE!. */
function pickIndexes(args: readonly Value[], n: number, ctx: FnContext): number[] | CalcError {
  const out: number[] = [];
  for (const v of args) {
    const a = A(v, ctx);
    if (a instanceof CalcError) return a;
    for (const x of a.data) {
      if (x instanceof CalcError) return x;
      const k = toNumber(x, ctx.locale, ctx.date1904);
      if (k instanceof CalcError) return k;
      const i = Math.trunc(k);
      if (i === 0 || Math.abs(i) > n) return ERR.VALUE;
      out.push(i > 0 ? i - 1 : n + i);
    }
  }
  return out;
}

/** Soma dos números de um valor (PERCENTOF: texto/booleano de referência ignorados). */
function sumOf(v: Value, ctx: FnContext): number | CalcError {
  if (v instanceof CalcError) return v;
  if (v instanceof LambdaValue) return ERR.CALC;
  if (!(v instanceof ArrayValue || v instanceof RefValue)) {
    const n = toNumber(v, ctx.locale, ctx.date1904);
    return n;
  }
  let s = 0;
  const xs = v instanceof RefValue ? v.areas.flatMap((_, k) => ctx.values(v, k).data) : v.data;
  for (const x of xs) {
    if (x instanceof CalcError) return ERR.NUM; // medido: PERCENTOF(C1:C7 com #N/D; …) = #NUM!
    if (typeof x === 'number') s += x;
  }
  return s;
}

// ───────────────────────────── GROUPBY / PIVOTBY ─────────────────────────────

/** Nome do total no idioma (pt-BR/en-US: "Total"). */
const totalText = (): string => 'Total';

interface Group { key: Scalar[]; rows: number[] }

/** Chama a função de agregação com a coluna de valores do grupo (e o total, para PERCENTOF). */
function aggregate(fn: LambdaValue, vals: ArrayValue, rows: number[], col: number, all: number[], ctx: FnContext): Scalar {
  const sub = ArrayValue.fill(rows.length, 1, (r) => vals.get(rows[r]!, col));
  const args: Value[] = [sub];
  // função de 2 parâmetros obrigatórios (PERCENTOF, LAMBDA(x;y;…)) recebe também o total
  if (fn.params.length >= 2) args.push(ArrayValue.fill(all.length, 1, (r) => vals.get(all[r]!, col)));
  const out = ctx.callLambda(fn, args);
  if (out instanceof ArrayValue) return out.rows === 1 && out.cols === 1 ? out.get(0, 0) : ERR.CALC;
  if (out instanceof RefValue) { const a = out.single; return a && a.r1 === a.r2 && a.c1 === a.c2 ? ctx.cell(a.sheet, a.r1, a.c1) : ERR.CALC; }
  if (out instanceof LambdaValue) return ERR.CALC;
  return out;
}

/** Agrupa linhas pela chave (ordem de primeira aparição). */
function groupRows(keys: ArrayValue, rows: number[]): Group[] {
  const out: Group[] = [];
  for (const r of rows) {
    const key = Array.from({ length: keys.cols }, (_, c) => keys.get(r, c));
    const g = out.find((x) => x.key.every((k, i) => sameCell(k, key[i]!)));
    if (g) g.rows.push(r); else out.push({ key, rows: [r] });
  }
  return out;
}

/** Cabeçalhos: 0 não, 1 sim (oculto), 2 não (gerar), 3 sim (mostrar); omitido = detecta (1ª linha texto com números abaixo). */
function headerMode(v: Value | undefined, vals: ArrayValue, ctx: FnContext): number | CalcError {
  if (v === undefined || v === null) {
    const first = vals.rows > 1 && vals.data.slice(0, vals.cols).every((x) => typeof x === 'string');
    const rest = vals.rows > 1 && typeof vals.get(1, 0) === 'number';
    return first && rest ? 1 : 0; // detectado: usa como cabeçalho mas não mostra (medido)
  }
  const n = intOr(v, 0, ctx);
  if (n instanceof CalcError) return n;
  return n >= 0 && n <= 3 ? n : ERR.VALUE;
}

/** Nomes gerados de cabeçalho (field_headers = 2) no idioma. */
function genHeader(kind: 'row' | 'col' | 'val', i: number, ctx: FnContext): string {
  const pt = ctx.locale.id.startsWith('pt');
  if (kind === 'row') return pt ? `Campo de linha ${i}` : `Row Field ${i}`;
  if (kind === 'col') return pt ? `Campo de coluna ${i}` : `Col Field ${i}`;
  return pt ? `Valor ${i}` : `Value ${i}`;
}

/** Linhas que passam no filtro (filter_array booleano do tamanho dos dados). */
function filterRows(rows: number[], flt: Value | undefined, n: number, ctx: FnContext): number[] | CalcError {
  if (flt === undefined || flt === null) return rows;
  const f = A(flt, ctx); if (f instanceof CalcError) return f;
  if (f.data.length !== n) return ERR.VALUE;
  const keep: number[] = [];
  for (const r of rows) {
    const x = f.data[r]!;
    if (x instanceof CalcError) return x;
    const b = toBool(x, ctx.locale);
    if (b instanceof CalcError) return b;
    if (b) keep.push(r);
  }
  return keep;
}

/** Ordem (sort_order): lista de colunas 1-based, negativa = descendente; padrão = todas as chaves. */
function sortSpec(v: Value | undefined, nkeys: number, width: number, ctx: FnContext): number[] | CalcError {
  if (v === undefined || v === null) return Array.from({ length: nkeys }, (_, i) => i + 1);
  const so = A(v, ctx); if (so instanceof CalcError) return so;
  const out: number[] = [];
  for (const x of so.data) {
    if (x instanceof CalcError) return x;
    const n = toNumber(x, ctx.locale, ctx.date1904); if (n instanceof CalcError) return n;
    const k = Math.trunc(n);
    if (k === 0 || Math.abs(k) > width) return ERR.VALUE;
    out.push(k);
  }
  return out;
}

function groupBy(args: readonly Value[], ctx: FnContext): Value {
  const [rf, vf, fv, hv, tv, sv, flt, relv] = args;
  const keys = A(rf!, ctx); if (keys instanceof CalcError) return keys;
  const vals = A(vf!, ctx); if (vals instanceof CalcError) return vals;
  if (!(fv instanceof LambdaValue)) return fv instanceof CalcError ? fv : ERR.VALUE;
  if (keys.rows !== vals.rows) return ERR.VALUE;
  const hm = headerMode(hv, vals, ctx); if (hm instanceof CalcError) return hm;
  const depth = intOr(tv, 1, ctx); if (depth instanceof CalcError) return depth;
  if (Math.abs(depth) > keys.cols) return ERR.VALUE; // medido: 2 níveis com 1 chave → #VALUE!
  const rel = intOr(relv, 0, ctx); if (rel instanceof CalcError) return rel;
  if (rel !== 0 && rel !== 1) return ERR.VALUE;
  const hasHdr = hm === 1 || hm === 3;
  const rows = filterRows(Array.from({ length: keys.rows }, (_, i) => i).slice(hasHdr ? 1 : 0), flt, keys.rows, ctx);
  if (rows instanceof CalcError) return rows;
  if (!rows.length) return ERR.CALC;
  const width = keys.cols + vals.cols;
  const order = sortSpec(sv, keys.cols, width, ctx); if (order instanceof CalcError) return order;
  const groups = groupRows(keys, rows);
  const lines = groups.map((g) => ({ key: g.key, rows: g.rows, vals: Array.from({ length: vals.cols }, (_, c) => aggregate(fv, vals, g.rows, c, rows, ctx)) }));
  lines.sort((a, b) => {
    for (const o of order) {
      const i = Math.abs(o) - 1;
      const x = i < keys.cols ? a.key[i]! : a.vals[i - keys.cols]!, y = i < keys.cols ? b.key[i]! : b.vals[i - keys.cols]!;
      const c = sortCmp(x, y);
      if (c) return sortDir(x, y, c, o);
    }
    return 0;
  });
  const out: Scalar[][] = [];
  if (hm === 2 || hm === 3) {
    const hdr: Scalar[] = [];
    for (let c = 0; c < keys.cols; c++) hdr.push(hm === 3 ? keys.get(0, c) : genHeader('row', c + 1, ctx));
    for (let c = 0; c < vals.cols; c++) hdr.push(hm === 3 ? vals.get(0, c) : genHeader('val', c + 1, ctx));
    out.push(hdr);
  }
  const blanks = (n: number): Scalar[] => Array.from({ length: n }, () => '' as Scalar);
  const totalLine = (rr: number[], label: Scalar[], fill: number): Scalar[] =>
    [...label, ...blanks(fill), ...Array.from({ length: vals.cols }, (_, c) => aggregate(fv, vals, rr, c, rows, ctx))];
  const grand = (): Scalar[] => totalLine(rows, [totalText()], keys.cols - 1);
  if (depth < 0) out.push(grand());
  // subtotais (|depth| ≥ 2): por grupo do 1º nível, depois (ou antes) das suas linhas
  const sub = Math.abs(depth) >= 2 && keys.cols >= 2;
  let i = 0;
  while (i < lines.length) {
    if (!sub) { out.push([...lines[i]!.key, ...lines[i]!.vals]); i++; continue; }
    const k0 = lines[i]!.key[0]!;
    let j = i;
    const rr: number[] = [];
    while (j < lines.length && sameCell(lines[j]!.key[0]!, k0)) { rr.push(...lines[j]!.rows); j++; }
    const st = totalLine(rr, [k0], keys.cols - 1);
    if (depth < 0) out.push(st);
    for (let q = i; q < j; q++) out.push([...lines[q]!.key, ...lines[q]!.vals]);
    if (depth > 0) out.push(st);
    i = j;
  }
  if (depth > 0) out.push(grand());
  return fromRows(out, width);
}

function pivotBy(args: readonly Value[], ctx: FnContext): Value {
  const [rf, cf, vf, fv, hv, rtv, rsv, ctv, csv, flt, relv] = args;
  const rk = A(rf!, ctx); if (rk instanceof CalcError) return rk;
  const ck = A(cf!, ctx); if (ck instanceof CalcError) return ck;
  const vals = A(vf!, ctx); if (vals instanceof CalcError) return vals;
  if (!(fv instanceof LambdaValue)) return fv instanceof CalcError ? fv : ERR.VALUE;
  if (rk.rows !== vals.rows || ck.rows !== vals.rows) return ERR.VALUE;
  const hm = headerMode(hv, vals, ctx); if (hm instanceof CalcError) return hm;
  const rdepth = intOr(rtv, 1, ctx); if (rdepth instanceof CalcError) return rdepth;
  const cdepth = intOr(ctv, 1, ctx); if (cdepth instanceof CalcError) return cdepth;
  if (Math.abs(rdepth) > rk.cols || Math.abs(cdepth) > ck.cols) return ERR.VALUE;
  const rso = sortSpec(rsv, rk.cols, rk.cols, ctx); if (rso instanceof CalcError) return rso;
  const cso = sortSpec(csv, ck.cols, ck.cols, ctx); if (cso instanceof CalcError) return cso;
  const rel = intOr(relv, 0, ctx); if (rel instanceof CalcError) return rel;
  if (rel < 0 || rel > 4) return ERR.VALUE;
  const hasHdr = hm === 1 || hm === 3;
  const rows = filterRows(Array.from({ length: vals.rows }, (_, i) => i).slice(hasHdr ? 1 : 0), flt, vals.rows, ctx);
  if (rows instanceof CalcError) return rows;
  if (!rows.length) return ERR.CALC;
  const rg = groupRows(rk, rows), cg = groupRows(ck, rows);
  const keyCmp = (spec: number[]) => (a: Group, b: Group): number => {
    for (const o of spec) { const i = Math.abs(o) - 1; const c = sortCmp(a.key[i]!, b.key[i]!); if (c) return sortDir(a.key[i]!, b.key[i]!, c, o); }
    return 0;
  };
  rg.sort(keyCmp(rso));
  cg.sort(keyCmp(cso));
  const nv = vals.cols;
  const width = rk.cols + (cg.length + (cdepth !== 0 ? 1 : 0)) * nv;
  const out: Scalar[][] = [];
  const blanks = (n: number): Scalar[] => Array.from({ length: n }, () => '' as Scalar);
  // cabeçalhos: nomes dos campos de coluna (modos 2/3), chaves de coluna, nomes de linha + valor (modos 2/3)
  const showHdr = hm === 2 || hm === 3;
  if (showHdr) for (let lvl = 0; lvl < ck.cols; lvl++) {
    const name = hm === 3 ? ck.get(0, lvl) : genHeader('col', lvl + 1, ctx);
    out.push([...blanks(rk.cols), name, ...blanks(width - rk.cols - 1)]);
  }
  for (let lvl = 0; lvl < ck.cols; lvl++) {
    const line: Scalar[] = blanks(rk.cols);
    for (const g of cg) for (let v = 0; v < nv; v++) line.push(g.key[lvl]!);
    if (cdepth !== 0) for (let v = 0; v < nv; v++) line.push(lvl === 0 ? totalText() : '');
    out.push(line);
  }
  if (showHdr) {
    const line: Scalar[] = [];
    for (let c = 0; c < rk.cols; c++) line.push(hm === 3 ? rk.get(0, c) : genHeader('row', c + 1, ctx));
    for (let k = 0; k < cg.length + (cdepth !== 0 ? 1 : 0); k++) for (let v = 0; v < nv; v++) line.push(hm === 3 ? vals.get(0, v) : genHeader('val', v + 1, ctx));
    out.push(line);
  }
  // relative_to (PERCENTOF): 0 total da coluna, 1 total da linha, 2 total geral
  const denom = (rr: number[], cc: number[] | null): number[] => (rel === 1 ? rr : rel === 2 || !cc ? rows : cc);
  const cell = (rr: number[], cc: number[], v: number): Scalar => {
    const both = rr.filter((r) => cc.includes(r));
    return both.length ? aggregate(fv, vals, both, v, denom(rr, cc), ctx) : '';
  };
  const body = (g: Group | null): Scalar[] => {
    const rr = g ? g.rows : rows;
    const line: Scalar[] = g ? [...g.key] : [totalText(), ...blanks(rk.cols - 1)];
    for (const c of cg) for (let v = 0; v < nv; v++) line.push(cell(rr, c.rows, v));
    if (cdepth !== 0) for (let v = 0; v < nv; v++) line.push(aggregate(fv, vals, rr, v, denom(rr, null), ctx));
    return line;
  };
  if (rdepth < 0) out.push(body(null));
  for (const g of rg) out.push(body(g));
  if (rdepth > 0) out.push(body(null));
  return fromRows(out, width);
}

// ───────────────────────────── registro ─────────────────────────────

const any = 'any' as const;

register(
  {
    // include: coluna com tantas linhas quanto o array (filtra linhas) ou linha com tantas colunas
    name: 'FILTER', prefix: '_xlfn._xlws.', minArgs: 2, maxArgs: 3, args: any,
    call: ([av, iv, ev], ctx) => {
      const a = A(av, ctx); if (a instanceof CalcError) return a;
      const inc = A(iv, ctx); if (inc instanceof CalcError) return inc;
      const byRow = inc.cols === 1 && inc.rows === a.rows;
      const byCol = !byRow && inc.rows === 1 && inc.cols === a.cols;
      if (!byRow && !byCol) return ERR.VALUE;
      const keep: number[] = [];
      for (let i = 0; i < inc.data.length; i++) {
        const x = inc.data[i]!;
        if (x instanceof CalcError) return x;
        if (typeof x === 'string') return ERR.VALUE;
        if (x === true || (typeof x === 'number' && x !== 0)) keep.push(i);
      }
      if (!keep.length) return ev === undefined || ev === null ? ERR.CALC : ev instanceof RefValue ? A(ev, ctx) : ev;
      return byRow ? ArrayValue.fill(keep.length, a.cols, (r, c) => a.get(keep[r]!, c)) : ArrayValue.fill(a.rows, keep.length, (r, c) => a.get(r, keep[c]!));
    },
  },
  {
    name: 'SORT', prefix: '_xlfn._xlws.', minArgs: 1, maxArgs: 4, args: any,
    call: ([av, iv, ov, bv], ctx) => {
      const a0 = A(av, ctx); if (a0 instanceof CalcError) return a0;
      const byCol = boolOr(bv, false, ctx); if (byCol instanceof CalcError) return byCol;
      const a = byCol ? transpose(a0) : a0;
      const idxA = iv === undefined || iv === null ? new ArrayValue(1, 1, [1]) : A(iv, ctx); if (idxA instanceof CalcError) return idxA;
      const ordA = ov === undefined || ov === null ? new ArrayValue(1, 1, [1]) : A(ov, ctx); if (ordA instanceof CalcError) return ordA;
      const idx: number[] = [], ord: number[] = [];
      for (const x of idxA.data) { if (x instanceof CalcError) return x; const n = toNumber(x, ctx.locale, ctx.date1904); if (n instanceof CalcError) return n; const k = Math.trunc(n); if (k < 1 || k > a.cols) return ERR.VALUE; idx.push(k - 1); }
      for (const x of ordA.data) { if (x instanceof CalcError) return x; const n = toNumber(x, ctx.locale, ctx.date1904); if (n instanceof CalcError) return n; const k = Math.trunc(n); if (k !== 1 && k !== -1) return ERR.VALUE; ord.push(k); }
      if (ord.length !== 1 && ord.length !== idx.length) return ERR.VALUE;
      const rows = rowsOf(a).map((r, i) => ({ r, i }));
      rows.sort((x, y) => {
        for (let k = 0; k < idx.length; k++) {
          const c = sortCmp(x.r[idx[k]!]!, y.r[idx[k]!]!);
          if (c) return sortDir(x.r[idx[k]!]!, y.r[idx[k]!]!, c, ord[ord.length === 1 ? 0 : k]!);
        }
        return x.i - y.i;
      });
      const out = ArrayValue.fill(a.rows, a.cols, (r, c) => rows[r]!.r[c]!);
      return byCol ? transpose(out) : out;
    },
  },
  {
    name: 'SORTBY', prefix: '_xlfn.', minArgs: 2, maxArgs: 253, args: any,
    call: (args, ctx) => {
      const a = A(args[0]!, ctx); if (a instanceof CalcError) return a;
      const keys: { k: ArrayValue; o: number }[] = [];
      let byCol: boolean | undefined;
      for (let i = 1; i < args.length; i += 2) {
        const k = A(args[i]!, ctx); if (k instanceof CalcError) return k;
        const o = intOr(args[i + 1], 1, ctx); if (o instanceof CalcError) return o;
        if (o !== 1 && o !== -1) return ERR.VALUE;
        const rowWise = k.cols === 1 && k.rows === a.rows;
        const colWise = !rowWise && k.rows === 1 && k.cols === a.cols;
        if (!rowWise && !colWise) return ERR.VALUE;
        if (byCol !== undefined && byCol !== colWise) return ERR.VALUE;
        byCol = colWise;
        keys.push({ k, o });
      }
      const n = byCol ? a.cols : a.rows;
      const order = Array.from({ length: n }, (_, i) => i);
      order.sort((x, y) => {
        for (const { k, o } of keys) { const c = sortCmp(k.data[x]!, k.data[y]!); if (c) return sortDir(k.data[x]!, k.data[y]!, c, o); }
        return x - y;
      });
      return byCol ? ArrayValue.fill(a.rows, a.cols, (r, c) => a.get(r, order[c]!)) : ArrayValue.fill(a.rows, a.cols, (r, c) => a.get(order[r]!, c));
    },
  },
  {
    name: 'UNIQUE', prefix: '_xlfn.', minArgs: 1, maxArgs: 3, args: any,
    call: ([av, bv, ev], ctx) => {
      const a0 = A(av, ctx); if (a0 instanceof CalcError) return a0;
      const byCol = boolOr(bv, false, ctx); if (byCol instanceof CalcError) return byCol;
      const once = boolOr(ev, false, ctx); if (once instanceof CalcError) return once;
      const a = byCol ? transpose(a0) : a0;
      const rows = rowsOf(a);
      const groups: { row: Scalar[]; n: number }[] = [];
      for (const r of rows) {
        const g = groups.find((x) => x.row.every((v, i) => sameCell(v, r[i]!)));
        if (g) g.n++; else groups.push({ row: r, n: 1 });
      }
      const keep = once ? groups.filter((g) => g.n === 1) : groups;
      if (!keep.length) return ERR.CALC;
      const out = fromRows(keep.map((g) => g.row), a.cols);
      return out instanceof CalcError ? out : byCol ? transpose(out) : out;
    },
  },
  {
    name: 'SEQUENCE', prefix: '_xlfn.', minArgs: 1, maxArgs: 4, args: 'value',
    call: ([rv, cv, sv, stv], ctx) => {
      const r = intOr(rv, 1, ctx); if (r instanceof CalcError) return r;
      const c = intOr(cv, 1, ctx); if (c instanceof CalcError) return c;
      const s0 = sv === undefined || sv === null ? 1 : toNumber(sv, ctx.locale, ctx.date1904); if (s0 instanceof CalcError) return s0;
      const st = stv === undefined || stv === null ? 1 : toNumber(stv, ctx.locale, ctx.date1904); if (st instanceof CalcError) return st;
      if (r < 0 || c < 0) return ERR.VALUE;
      if (r === 0 || c === 0) return ERR.CALC;
      // medido: 1048577 linhas → #VALUE!; mais colunas que a planilha → #SPILL!
      if (r > MAX_ROW + 1) return ERR.VALUE;
      if (c > MAX_COL + 1) return ERR.SPILL;
      return ArrayValue.fill(r, c, (i, j) => s0 + (i * c + j) * st);
    },
  },
  {
    name: 'RANDARRAY', prefix: '_xlfn.', minArgs: 0, maxArgs: 5, args: 'value', volatile: true,
    call: ([rv, cv, lo, hi, iv], ctx) => {
      const r = intOr(rv, 1, ctx); if (r instanceof CalcError) return r;
      const c = intOr(cv, 1, ctx); if (c instanceof CalcError) return c;
      const a = lo === undefined || lo === null ? 0 : toNumber(lo, ctx.locale, ctx.date1904); if (a instanceof CalcError) return a;
      const b = hi === undefined || hi === null ? 1 : toNumber(hi, ctx.locale, ctx.date1904); if (b instanceof CalcError) return b;
      const int = boolOr(iv, false, ctx); if (int instanceof CalcError) return int;
      if (r < 0 || c < 0) return ERR.VALUE;
      if (r === 0 || c === 0) return ERR.CALC;
      if (a > b) return ERR.VALUE;
      if (int && (a !== Math.trunc(a) || b !== Math.trunc(b))) return ERR.VALUE;
      return ArrayValue.fill(r, c, () => (int ? a + Math.floor(ctx.random() * (b - a + 1)) : a + ctx.random() * (b - a)));
    },
  },
  ...(['TAKE', 'DROP'] as const).map((name) => ({
    name, prefix: '_xlfn.', minArgs: 2, maxArgs: 3, args: any,
    call: ([av, rv, cv]: readonly Value[], ctx: FnContext): Value => {
      const a = A(av!, ctx); if (a instanceof CalcError) return a;
      const r = rv === null || rv === undefined ? undefined : intOr(rv, 0, ctx); if (r instanceof CalcError) return r;
      const c = cv === null || cv === undefined ? undefined : intOr(cv, 0, ctx); if (c instanceof CalcError) return c;
      const span = (n: number, k: number | undefined): [number, number] => {
        if (k === undefined) return [0, n];
        if (name === 'TAKE') return k >= 0 ? [0, Math.min(k, n)] : [Math.max(0, n + k), n];
        return k >= 0 ? [Math.min(k, n), n] : [0, Math.max(0, n + k)];
      };
      if (name === 'TAKE' && (r === 0 || c === 0)) return ERR.CALC;
      const [r1, r2] = span(a.rows, r), [c1, c2] = span(a.cols, c);
      if (r2 <= r1 || c2 <= c1) return ERR.CALC;
      return ArrayValue.fill(r2 - r1, c2 - c1, (i, j) => a.get(r1 + i, c1 + j));
    },
  })),
  {
    name: 'EXPAND', prefix: '_xlfn.', minArgs: 2, maxArgs: 4, args: any,
    call: ([av, rv, cv, pv], ctx) => {
      const a = A(av!, ctx); if (a instanceof CalcError) return a;
      const r = intOr(rv, a.rows, ctx); if (r instanceof CalcError) return r;
      const c = intOr(cv, a.cols, ctx); if (c instanceof CalcError) return c;
      if (r < a.rows || c < a.cols) return ERR.VALUE;
      if (r > MAX_ROW + 1 || c > MAX_COL + 1) return ERR.NUM;
      if (pv instanceof ArrayValue && (pv.rows > 1 || pv.cols > 1)) return ERR.VALUE; // medido
      const pad = pv === undefined ? ERR.NA : scalarOf(pv, ctx);
      return ArrayValue.fill(r, c, (i, j) => (i < a.rows && j < a.cols ? a.get(i, j) : pad));
    },
  },
  ...(['VSTACK', 'HSTACK'] as const).map((name) => ({
    name, prefix: '_xlfn.', minArgs: 1, maxArgs: 254, args: any,
    call: (args: readonly Value[], ctx: FnContext): Value => {
      const parts: ArrayValue[] = [];
      for (const v of args) { if (v === null) return ERR.VALUE; const a = A(v, ctx); if (a instanceof CalcError) return a; parts.push(a); }
      if (name === 'VSTACK') {
        const w = Math.max(...parts.map((p) => p.cols));
        const rows: Scalar[][] = [];
        for (const p of parts) for (let r = 0; r < p.rows; r++) rows.push(Array.from({ length: w }, (_, c) => (c < p.cols ? p.get(r, c) : ERR.NA)));
        return fromRows(rows, w);
      }
      const h = Math.max(...parts.map((p) => p.rows));
      const w = parts.reduce((s, p) => s + p.cols, 0);
      return ArrayValue.fill(h, w, (r, c) => {
        let off = 0;
        for (const p of parts) { if (c < off + p.cols) return r < p.rows ? p.get(r, c - off) : ERR.NA; off += p.cols; }
        return ERR.NA;
      });
    },
  })),
  ...(['TOCOL', 'TOROW'] as const).map((name) => ({
    name, prefix: '_xlfn.', minArgs: 1, maxArgs: 3, args: any,
    call: ([av, iv, sv]: readonly Value[], ctx: FnContext): Value => {
      const a = A(av!, ctx); if (a instanceof CalcError) return a;
      const ig = intOr(iv, 0, ctx); if (ig instanceof CalcError) return ig;
      const byCol = boolOr(sv, false, ctx); if (byCol instanceof CalcError) return byCol;
      if (ig < 0 || ig > 3) return ERR.VALUE;
      const xs: Scalar[] = [];
      const push = (x: Scalar): void => {
        if ((ig === 1 || ig === 3) && x === null) return;
        if ((ig === 2 || ig === 3) && x instanceof CalcError) return;
        xs.push(x);
      };
      if (byCol) { for (let c = 0; c < a.cols; c++) for (let r = 0; r < a.rows; r++) push(a.get(r, c)); }
      else for (const x of a.data) push(x);
      if (!xs.length) return ERR.CALC;
      return name === 'TOCOL' ? new ArrayValue(xs.length, 1, xs) : new ArrayValue(1, xs.length, xs);
    },
  })),
  ...(['WRAPROWS', 'WRAPCOLS'] as const).map((name) => ({
    name, prefix: '_xlfn.', minArgs: 2, maxArgs: 3, args: any,
    call: ([av, nv, pv]: readonly Value[], ctx: FnContext): Value => {
      const a = A(av!, ctx); if (a instanceof CalcError) return a;
      if (a.rows > 1 && a.cols > 1) return ERR.VALUE;
      const k = intOr(nv, 0, ctx); if (k instanceof CalcError) return k;
      if (k < 1) return ERR.NUM;
      const xs = a.data;
      // pad_with matriz: o Excel levanta a função sobre ele (medido: cada resultado mostra o 1º elemento)
      if (pv instanceof ArrayValue && (pv.rows > 1 || pv.cols > 1)) return ArrayValue.fill(pv.rows, pv.cols, () => xs[0]!);
      const pad = pv === undefined ? ERR.NA : scalarOf(pv, ctx);
      const w = Math.min(k, xs.length); // vetor menor que a quebra: sem preenchimento (medido)
      const lines = Math.ceil(xs.length / w);
      return name === 'WRAPROWS'
        ? ArrayValue.fill(lines, w, (r, c) => { const i = r * w + c; return i < xs.length ? xs[i]! : pad; })
        : ArrayValue.fill(w, lines, (r, c) => { const i = c * w + r; return i < xs.length ? xs[i]! : pad; });
    },
  })),
  ...(['CHOOSEROWS', 'CHOOSECOLS'] as const).map((name) => ({
    name, prefix: '_xlfn.', minArgs: 2, maxArgs: 254, args: any,
    call: (args: readonly Value[], ctx: FnContext): Value => {
      const a = A(args[0]!, ctx); if (a instanceof CalcError) return a;
      const rows = name === 'CHOOSEROWS';
      const ix = pickIndexes(args.slice(1), rows ? a.rows : a.cols, ctx);
      if (ix instanceof CalcError) return ix;
      return rows ? ArrayValue.fill(ix.length, a.cols, (r, c) => a.get(ix[r]!, c)) : ArrayValue.fill(a.rows, ix.length, (r, c) => a.get(r, ix[c]!));
    },
  })),
  {
    // corta linhas/colunas vazias das bordas (0 nada, 1 começo, 2 fim, 3 ambos); devolve referência
    name: 'TRIMRANGE', prefix: '_xlfn.', minArgs: 1, maxArgs: 3, args: any, returnsRef: true,
    call: ([rv, tr, tc], ctx) => {
      const r = intOr(tr, 3, ctx); if (r instanceof CalcError) return r;
      const c = intOr(tc, 3, ctx); if (c instanceof CalcError) return c;
      if (r < 0 || r > 3 || c < 0 || c > 3) return ERR.VALUE;
      if (rv instanceof RefValue) {
        const a = rv.single;
        if (!a) return ERR.VALUE;
        let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
        ctx.forEachCell(a, (v, row, col) => {
          if (v === null) return;
          minR = Math.min(minR, row); maxR = Math.max(maxR, row); minC = Math.min(minC, col); maxC = Math.max(maxC, col);
        });
        if (maxR < 0) return ERR.REF; // tudo vazio (medido)
        const out: Area = {
          sheet: a.sheet,
          r1: r & 1 ? minR : a.r1, r2: r & 2 ? maxR : a.r2,
          c1: c & 1 ? minC : a.c1, c2: c & 2 ? maxC : a.c2,
        };
        return new RefValue([out]);
      }
      const a = A(rv!, ctx); if (a instanceof CalcError) return a;
      const blankRow = (i: number): boolean => Array.from({ length: a.cols }, (_, j) => a.get(i, j)).every((x) => x === null);
      const blankCol = (j: number): boolean => Array.from({ length: a.rows }, (_, i) => a.get(i, j)).every((x) => x === null);
      let r1 = 0, r2 = a.rows - 1, c1 = 0, c2 = a.cols - 1;
      if (r & 1) while (r1 < r2 && blankRow(r1)) r1++;
      if (r & 2) while (r2 > r1 && blankRow(r2)) r2--;
      if (c & 1) while (c1 < c2 && blankCol(c1)) c1++;
      if (c & 2) while (c2 > c1 && blankCol(c2)) c2--;
      return ArrayValue.fill(r2 - r1 + 1, c2 - c1 + 1, (i, j) => a.get(r1 + i, c1 + j));
    },
  },
  {
    name: 'PERCENTOF', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: any,
    call: ([sv, av], ctx) => {
      const s = sumOf(sv!, ctx); if (s instanceof CalcError) return s;
      const t = sumOf(av!, ctx); if (t instanceof CalcError) return t;
      return t === 0 ? ERR.DIV0 : s / t;
    },
  },
  { name: 'GROUPBY', prefix: '_xlfn.', minArgs: 3, maxArgs: 8, args: any, call: (args, ctx) => groupBy(args, ctx) },
  { name: 'PIVOTBY', prefix: '_xlfn.', minArgs: 4, maxArgs: 11, args: any, call: (args, ctx) => pivotBy(args, ctx) },
);
