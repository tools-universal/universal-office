/**
 * Banco de dados (DSUM, DAVERAGE, DCOUNT, DCOUNTA, DGET, DMAX, DMIN, DPRODUCT, DSTDEV*, DVAR*).
 * Dono: agente FN-STAT.
 *
 * Base: 1ª linha = rótulos dos campos; registros abaixo. Campo: rótulo (sem
 * diferenciar maiúsculas) ou número 1-based. Intervalo de critérios: 1ª linha =
 * rótulos; cada linha abaixo é uma alternativa (OU); as células preenchidas da linha
 * precisam casar todas (E). Critério calculado (rótulo que não é campo + fórmula
 * VERDADEIRO/FALSO relativa ao 1º registro) depende do avaliador: gancho em
 * `computedCriterion`.
 */
import { parseCriterion, type Criterion } from '../criteria.js';
import { textEquals } from '../collate.js';
import { register, type FnContext, type FnDef } from '../fn.js';
import { argNumber } from '../stats.js';
import { ArrayValue, CalcError, ERR, RefValue, type Area, type Scalar, type Value } from '../values.js';
import {
  aggMax, aggMin, aggProduct, aggStdevP, aggStdevS, aggVarP, aggVarS,
} from './statistical.js';

/**
 * Gancho do avaliador para critério calculado: avalia a fórmula da célula de critério
 * (aba, linha, coluna) como se estivesse no registro `recordRow` (deslocamento
 * relativo ao 1º registro). Sem avaliador: undefined (a condição é ignorada).
 */
export let computedCriterion: ((ctx: FnContext, sheet: number, row: number, col: number, recordOffset: number) => boolean | undefined) | undefined;
export function setComputedCriterion(f: typeof computedCriterion): void { computedCriterion = f; }

/** Condição: coluna da base (ou −1 = critério calculado/rótulo desconhecido) e predicado. */
interface Cond { readonly col: number; readonly crit: Criterion }

/** Índice (0-based na base) do campo, ou erro. */
function fieldIndex(field: Scalar, db: Area, ctx: FnContext): number | CalcError {
  const ncols = db.c2 - db.c1 + 1;
  if (field instanceof CalcError) return field;
  if (typeof field === 'string') {
    for (let c = 0; c < ncols; c++) {
      const h = ctx.cell(db.sheet, db.r1, db.c1 + c);
      if (h !== null && typeof h !== 'object' && textEquals(String(h), field)) return c;
    }
    return ERR.VALUE;
  }
  const n = argNumber(field, ctx);
  if (n instanceof CalcError) return n;
  const i = Math.trunc(n);
  return i >= 1 && i <= ncols ? i - 1 : ERR.VALUE;
}

/** Alternativas (linhas do critério), cada uma uma lista de condições. */
function parseCriteria(cr: Area, db: Area, ctx: FnContext): Cond[][] | CalcError {
  const ncols = db.c2 - db.c1 + 1;
  const headers: (number | undefined)[] = [];
  for (let c = cr.c1; c <= cr.c2; c++) {
    const h = ctx.cell(cr.sheet, cr.r1, c);
    let idx: number | undefined;
    if (typeof h === 'string' || typeof h === 'number') {
      for (let k = 0; k < ncols; k++) {
        const dh = ctx.cell(db.sheet, db.r1, db.c1 + k);
        if (dh !== null && typeof dh !== 'object' && textEquals(String(dh), String(h))) { idx = k; break; }
      }
    }
    headers.push(idx);
  }
  // linhas do critério: só as existentes contam; uma linha toda vazia casa tudo
  const rows = new Map<number, Cond[]>();
  let lastRow = cr.r1;
  ctx.forEachCell({ ...cr, r1: cr.r1 + 1 }, (v, r, c) => {
    if (r > lastRow) lastRow = r;
    if (v === null) return;
    const idx = headers[c - cr.c1];
    let list = rows.get(r);
    if (!list) { list = []; rows.set(r, list); }
    if (idx === undefined) {
      // rótulo vazio ou que não é campo: critério calculado (fórmula VERDADEIRO/FALSO
      // relativa ao 1º registro). Constante: só VERDADEIRO casa (medido: "Apple" → nada).
      const sheet = cr.sheet;
      const hook = computedCriterion;
      list.push({
        col: -1,
        crit: Object.assign((_v: Scalar, rec?: number): boolean => {
          if (hook && rec !== undefined) { const b = hook(ctx, sheet, r, c, rec); if (b !== undefined) return b; }
          return v === true;
        }, { blank: false }) as Criterion,
      });
      return;
    }
    list.push({ col: idx, crit: parseCriterion(v, ctx.locale, { prefix: true }) });
  });
  const alts: Cond[][] = [];
  const totalRows = cr.r2 - cr.r1;
  if (totalRows <= 0) return ERR.VALUE;
  // linhas vazias (sem condição) casam qualquer registro
  if (rows.size < totalRows) alts.push([]);
  for (const r of [...rows.keys()].sort((a, b) => a - b)) alts.push(rows.get(r)!);
  return alts;
}

/** Valores do campo nos registros que casam (ordem das linhas), com o 1º erro dos critérios. */
function matched(args: readonly unknown[], ctx: FnContext, fieldRequired: boolean): { vals: Scalar[] } | CalcError {
  const [dbRef, field, crRef] = args as [Value, Scalar, Value];
  if (!(dbRef instanceof RefValue) || dbRef.areas.length !== 1) return ERR.VALUE;
  if (!(crRef instanceof RefValue) || crRef.areas.length !== 1) return ERR.VALUE;
  const db = dbRef.areas[0]!, cr = crRef.areas[0]!;
  // base só com a linha de rótulos → #VALUE! (medido)
  if (db.r2 <= db.r1) return ERR.VALUE;
  let fi: number | undefined;
  if (field !== null || fieldRequired) {
    const f = fieldIndex(field, db, ctx);
    if (f instanceof CalcError) return f;
    fi = f;
  }
  const alts = parseCriteria(cr, db, ctx);
  if (alts instanceof CalcError) return alts;
  const vals: Scalar[] = [];
  // registros: linhas da base que têm alguma célula
  const recRows = new Set<number>();
  ctx.forEachCell({ ...db, r1: db.r1 + 1 }, (_v, r) => recRows.add(r));
  for (const r of [...recRows].sort((a, b) => a - b)) {
    const rec = r - db.r1 - 1;
    const ok = alts.some((conds) => conds.every(({ col, crit }) =>
      col < 0 ? (crit as unknown as (v: Scalar, rec: number) => boolean)(null, rec) : crit(ctx.cell(db.sheet, r, db.c1 + col))));
    if (!ok) continue;
    vals.push(fi === undefined ? true : ctx.cell(db.sheet, r, db.c1 + fi));
  }
  return { vals };
}

type NumAgg = (xs: number[]) => Value;

function plainSum(xs: readonly number[]): number | CalcError {
  let t = 0;
  for (const x of xs) t += x;
  return Number.isFinite(t) ? t : ERR.NUM;
}

/** Critério que é matriz (não referência): #VALUE! em cada elemento (medido: derrama). */
function withCritArray(f: (args: readonly unknown[], ctx: FnContext) => Value): (args: readonly unknown[], ctx: FnContext) => Value {
  return (args, ctx) => {
    const cr = args[2];
    if (cr instanceof ArrayValue) return ArrayValue.fill(cr.rows, cr.cols, () => ERR.VALUE);
    return f(args, ctx);
  };
}

function dbNumeric(name: string, agg: NumAgg): FnDef {
  return {
    name, minArgs: 3, maxArgs: 3, args: (i) => (i === 1 ? 'value' : 'ref'), acceptsErrors: true,
    call: withCritArray((args, ctx) => {
      const m = matched(args, ctx, true);
      if (m instanceof CalcError) return m;
      const xs: number[] = [];
      for (const v of m.vals) {
        if (v instanceof CalcError) return v;
        if (typeof v === 'number') xs.push(v);
      }
      return agg(xs);
    }),
  };
}

register(
  // medido: DSUM/DAVERAGE somam SEM o zero do Excel (0,1+0,2−0,3 = 5,55E−17), como SUMIF
  dbNumeric('DSUM', (xs) => plainSum(xs)),
  dbNumeric('DAVERAGE', (xs) => { if (!xs.length) return ERR.DIV0; const t = plainSum(xs); return t instanceof CalcError ? t : t / xs.length; }),
  dbNumeric('DMAX', aggMax),
  dbNumeric('DMIN', aggMin),
  dbNumeric('DPRODUCT', aggProduct),
  dbNumeric('DSTDEV', aggStdevS),
  dbNumeric('DSTDEVP', aggStdevP),
  dbNumeric('DVAR', aggVarS),
  dbNumeric('DVARP', aggVarP),
  {
    name: 'DCOUNT', minArgs: 3, maxArgs: 3, args: (i) => (i === 1 ? 'value' : 'ref'), acceptsErrors: true,
    // sem campo: conta os registros que casam (medido)
    call: withCritArray((args, ctx) => {
      const m = matched(args, ctx, false);
      if (m instanceof CalcError) return m;
      return args[1] === null ? m.vals.length : m.vals.filter((v) => typeof v === 'number').length;
    }),
  },
  {
    name: 'DCOUNTA', minArgs: 3, maxArgs: 3, args: (i) => (i === 1 ? 'value' : 'ref'), acceptsErrors: true,
    call: withCritArray((args, ctx) => {
      const m = matched(args, ctx, false);
      if (m instanceof CalcError) return m;
      return args[1] === null ? m.vals.length : m.vals.filter((v) => v !== null).length;
    }),
  },
  {
    name: 'DGET', minArgs: 3, maxArgs: 3, args: (i) => (i === 1 ? 'value' : 'ref'), acceptsErrors: true,
    call: withCritArray((args, ctx) => {
      const m = matched(args, ctx, true);
      if (m instanceof CalcError) return m;
      if (!m.vals.length) return ERR.VALUE;
      if (m.vals.length > 1) return ERR.NUM;
      // medido: o registro achado com o campo vazio dá #VALUE!
      return m.vals[0] === null ? ERR.VALUE : m.vals[0]!;
    }),
  },
);
