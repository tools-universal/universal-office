/**
 * Apoio das bibliotecas de texto, datas, informação, pesquisa e matrizes
 * dinâmicas (dono: agente FN-TEXT-DATE-LOOKUP).
 */
import type { FnContext } from '../fn.js';
import { toNumber, toText } from '../coerce.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

/**
 * Levantamento das funções herdadas do Analysis ToolPak (ISEVEN, EDATE,
 * EOMONTH, WORKDAY, NETWORKDAYS, WEEKNUM, YEARFRAC…), medido: referência de
 * VÁRIAS células → #VALUE! (sem interseção implícita, nem na fórmula
 * dinâmica); matriz → elemento a elemento (difusão 1×N com M×1; sobras #N/A);
 * 1º erro da esquerda para a direita. `pass` = posições que chegam cruas (não
 * levantadas: feriados de WORKDAY…).
 */
export function liftAtp(args: readonly Value[], ctx: FnContext, f: (xs: Scalar[]) => Value, pass: (i: number) => boolean = () => false): Value {
  const xs: (Scalar | ArrayValue)[] = [];
  const arrs: number[] = [];
  for (let i = 0; i < args.length; i++) {
    let v = args[i]!;
    if (pass(i)) { xs.push(v as Scalar); continue; }
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
  const call = (ys: (Scalar | ArrayValue)[]): Value => {
    for (let i = 0; i < ys.length; i++) if (!pass(i) && ys[i] instanceof CalcError) return ys[i] as CalcError;
    return f(ys as Scalar[]);
  };
  if (!arrs.length) return call(xs);
  let rows = 1, cols = 1;
  for (const i of arrs) { const a = xs[i] as ArrayValue; rows = Math.max(rows, a.rows); cols = Math.max(cols, a.cols); }
  return ArrayValue.fill(rows, cols, (r, c) => {
    const ys = xs.slice();
    for (const i of arrs) {
      const a = xs[i] as ArrayValue;
      const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
      ys[i] = rr >= a.rows || cc >= a.cols ? ERR.NA : a.get(rr, cc);
    }
    const out = call(ys);
    return out instanceof ArrayValue ? out.get(0, 0) : out instanceof RefValue || out instanceof LambdaValue ? ERR.VALUE : out;
  });
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
