/**
 * Apoio das bibliotecas de texto, datas, informação, pesquisa e matrizes
 * dinâmicas (dono: agente FN-TEXT-DATE-LOOKUP).
 */
import type { FnContext } from '../fn.js';
import { toNumber, toText } from '../coerce.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

/** Argumento omitido (=EDATE(A1;)) nas funções do Analysis ToolPak (≠ célula vazia). */
export const OMITTED: unique symbol = Symbol('omitido');
export type AtpArg = Scalar | typeof OMITTED;

/**
 * Levantamento das funções herdadas do Analysis ToolPak (ISEVEN, EDATE,
 * EOMONTH, WORKDAY, NETWORKDAYS, WEEKNUM, YEARFRAC…), medido: referência de
 * VÁRIAS células → #VALUE! (sem interseção implícita, nem na fórmula
 * dinâmica); matriz → elemento a elemento (difusão 1×N com M×1; sobras #N/A).
 * Os argumentos chegam crus a `f` (erros inclusive: a função valida em ordem,
 * EDATE(-1;#DIV/0!) = #NUM!); omitido → OMITTED, célula vazia → null. `pass` =
 * posições que chegam sem levantar (feriados de WORKDAY…).
 */
export function liftAtp(args: readonly Value[], ctx: FnContext, f: (xs: AtpArg[]) => Value, pass: (i: number) => boolean = () => false): Value {
  const xs: (AtpArg | ArrayValue)[] = [];
  const arrs: number[] = [];
  for (let i = 0; i < args.length; i++) {
    let v: Value = args[i]!;
    if (pass(i)) { xs.push(v as Scalar); continue; }
    if (v === null) { xs.push(OMITTED); continue; }
    if (v instanceof RefValue) {
      const a = v.single;
      if (!a) return ERR.VALUE;
      if (a.r1 === a.r2 && a.c1 === a.c2) v = ctx.cell(a.sheet, a.r1, a.c1);
      else return ERR.VALUE;
    }
    if (v instanceof LambdaValue) v = ERR.CALC;
    if (v instanceof ArrayValue) arrs.push(i);
    xs.push(v as Scalar | ArrayValue);
  }
  if (!arrs.length) return f(xs as AtpArg[]);
  let rows = 1, cols = 1;
  for (const i of arrs) { const a = xs[i] as ArrayValue; rows = Math.max(rows, a.rows); cols = Math.max(cols, a.cols); }
  return ArrayValue.fill(rows, cols, (r, c) => {
    const ys = xs.slice();
    for (const i of arrs) {
      const a = xs[i] as ArrayValue;
      const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
      ys[i] = rr >= a.rows || cc >= a.cols ? ERR.NA : a.get(rr, cc);
    }
    const out = f(ys as AtpArg[]);
    return out instanceof ArrayValue ? out.get(0, 0) : out instanceof RefValue || out instanceof LambdaValue ? ERR.VALUE : out;
  });
}

/**
 * Número de um argumento do Analysis ToolPak: booleano → #VALUE!, omitido →
 * `def` (sem padrão → #N/A, medido: EDATE(x;) = #N/A), vazio = 0.
 */
export function atpNum(v: AtpArg | undefined, ctx: FnContext, def?: number): number | CalcError {
  if (v === undefined || v === OMITTED) return def ?? ERR.NA;
  if (typeof v === 'boolean') return ERR.VALUE;
  return toNumber(v, ctx.locale, ctx.date1904);
}

/** Número do argumento (erro do Excel se não for). */
export function num(v: Scalar, ctx: FnContext): number | CalcError {
  return toNumber(v, ctx.locale, ctx.date1904);
}

/** Texto do argumento (erro do Excel se for erro). */
export function txt(v: Scalar, ctx: FnContext): string | CalcError {
  return toText(v, ctx.locale);
}

/** Todos os escalares de um valor (matriz, referência de uma área, escalar), linha a linha. */
export function scalarsOf(v: Value, ctx: FnContext): Scalar[] | CalcError {
  if (v instanceof RefValue) {
    const out: Scalar[] = [];
    for (let k = 0; k < v.areas.length; k++) out.push(...ctx.values(v, k).data);
    return out;
  }
  if (v instanceof ArrayValue) return v.data.slice();
  if (v instanceof LambdaValue) return ERR.CALC;
  return [v];
}

/** Valor → matriz (referência de UMA área → valores; escalar → 1×1). */
export function asArray(v: Value, ctx: FnContext): ArrayValue | CalcError {
  if (v instanceof ArrayValue) return v;
  if (v instanceof RefValue) return v.single ? ctx.values(v) : ERR.VALUE;
  if (v instanceof LambdaValue) return ERR.CALC;
  return new ArrayValue(1, 1, [v]);
}

/** Inteiro truncado de um argumento numérico (ou o erro). */
export function int(v: Scalar, ctx: FnContext): number | CalcError {
  const n = num(v, ctx);
  return n instanceof CalcError ? n : Math.trunc(n);
}
