/**
 * Informação (ISBLANK, ISERR, ISERROR, ISNA, ISTEXT, ISNONTEXT, ISNUMBER, ISLOGICAL, ISEVEN, ISODD, N, NA, TYPE, ERROR.TYPE).
 * Dono: agente FN-TEXT-DATE-LOOKUP. (ISREF, ISFORMULA, CELL, INFO, SHEET(S) são do CORE.)
 *
 * Medido no Excel 365 pt-BR (info.cases.json):
 * - N e T com referência de várias células leem a 1ª célula da 1ª área (não há
 *   interseção implícita nem derramamento: N(A1:A3) = N(A1) em qualquer modo);
 *   com matriz, derramam elemento a elemento;
 * - TYPE: referência de várias células = 64 na fórmula dinâmica, interseção
 *   implícita na legada; união de áreas = 16; LAMBDA/nome de função = 128;
 * - ISEVEN/ISODD truncam, aceitam texto-número, mas booleano → #VALUE!; como as
 *   demais do Analysis ToolPak, referência de várias células → #VALUE! (sem
 *   interseção implícita), matriz → elemento a elemento.
 */
import { register, type FnContext } from '../fn.js';
import { implicitIntersection } from '../apply.js';
import { toNumber } from '../coerce.js';
import { liftAtp } from './tdl-util.js';
import { ArrayValue, CalcError, ERR, ERROR_TYPE, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

const is = (name: string, f: (v: Scalar) => boolean) => ({
  name, minArgs: 1, maxArgs: 1, args: 'value' as const, lift: true, acceptsErrors: true,
  call: ([v]: readonly any[]) => f(v as Scalar),
});

/** Paridade (ISEVEN/ISODD): trunca; booleano → #VALUE!. */
function parity(v: Scalar, ctx: FnContext): number | CalcError {
  if (typeof v === 'boolean') return ERR.VALUE;
  const n = toNumber(v, ctx.locale, ctx.date1904);
  if (n instanceof CalcError) return n;
  return Math.abs(Math.trunc(n)) % 2;
}

/** 1ª célula de uma referência (N, T). */
function firstCell(r: RefValue, ctx: FnContext): Scalar {
  const a = r.areas[0];
  return a ? ctx.cell(a.sheet, a.r1, a.c1) : ERR.REF;
}

/** Aplica `f` a um valor `any`: referência → 1ª célula; matriz → elemento a elemento. */
function firstOrEach(v: Value, ctx: FnContext, f: (x: Scalar) => Scalar): Value {
  if (v instanceof RefValue) return f(firstCell(v, ctx));
  if (v instanceof ArrayValue) return ArrayValue.fill(v.rows, v.cols, (r, c) => f(v.get(r, c)));
  if (v instanceof LambdaValue) return ERR.CALC;
  return f(v);
}

register(
  is('ISBLANK', (v) => v === null),
  is('ISERR', (v) => v instanceof CalcError && v !== ERR.NA),
  is('ISERROR', (v) => v instanceof CalcError),
  is('ISNA', (v) => v === ERR.NA),
  is('ISTEXT', (v) => typeof v === 'string'),
  is('ISNONTEXT', (v) => typeof v !== 'string'),
  is('ISNUMBER', (v) => typeof v === 'number'),
  is('ISLOGICAL', (v) => typeof v === 'boolean'),
  {
    name: 'ISEVEN', minArgs: 1, maxArgs: 1, args: 'any',
    call: (args, ctx) => liftAtp(args, ctx, ([v]) => { const p = parity(v as Scalar, ctx); return p instanceof CalcError ? p : p === 0; }),
  },
  {
    name: 'ISODD', minArgs: 1, maxArgs: 1, args: 'any',
    call: (args, ctx) => liftAtp(args, ctx, ([v]) => { const p = parity(v as Scalar, ctx); return p instanceof CalcError ? p : p === 1; }),
  },
  {
    name: 'N', minArgs: 1, maxArgs: 1, args: 'any',
    call: ([v], ctx) => firstOrEach(v, ctx, (x) => (typeof x === 'number' || x instanceof CalcError ? x : x === true ? 1 : 0)),
  },
  {
    name: 'T', minArgs: 1, maxArgs: 1, args: 'any',
    call: ([v], ctx) => firstOrEach(v, ctx, (x) => (typeof x === 'string' || x instanceof CalcError ? x : '')),
  },
  { name: 'NA', minArgs: 0, maxArgs: 0, args: 'value', call: () => ERR.NA },
  {
    name: 'TYPE', minArgs: 1, maxArgs: 1, args: 'any',
    call: ([v], ctx) => {
      let x: Value = v;
      if (x instanceof RefValue) {
        const a = x.single;
        if (!a) return 16;
        if (a.r1 === a.r2 && a.c1 === a.c2) x = ctx.cell(a.sheet, a.r1, a.c1);
        else if (ctx.arrayContext === false) x = implicitIntersection(x, ctx);
        else return 64;
      }
      if (x instanceof ArrayValue) return 64;
      if (x instanceof LambdaValue) return 128;
      if (x instanceof CalcError) return 16;
      if (typeof x === 'string') return 2;
      if (typeof x === 'boolean') return 4;
      return 1;
    },
  },
  {
    name: 'ERROR.TYPE', minArgs: 1, maxArgs: 1, args: 'value', lift: true, acceptsErrors: true,
    call: ([v]) => (v instanceof CalcError ? ERROR_TYPE[v.code] : ERR.NA),
  },
);
