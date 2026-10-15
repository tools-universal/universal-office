/**
 * Aplicação de uma função aos argumentos já avaliados: modos de argumento,
 * interseção implícita, "levantamento" elemento a elemento e propagação de erro.
 * O avaliador (CORE) chama `applyFn`; os testes das bibliotecas também, via
 * `testing.ts`. Primeira versão do contrato — o CORE é o dono e refina.
 */
import { argMode, type FnContext, type FnDef, type Thunk } from './fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from './values.js';

export interface ApplyOptions {
  /**
   * Fórmula de matriz dinâmica (Excel 365, `cm` com XLDAPR) ou CSE: referência
   * de várias células num argumento `value` vira matriz e a função é levantada.
   * Falso = fórmula "legada": interseção implícita com a linha/coluna da célula.
   */
  readonly arrayContext: boolean;
}

/** Argumento cru vindo do avaliador: valor ou, nos modos `lazy`, um thunk. */
export type RawArg = Value | Thunk;

/** Interseção implícita de uma referência com a célula da fórmula (#VALUE! se não cruzar). */
export function implicitIntersection(ref: RefValue, ctx: FnContext): Scalar {
  const a = ref.single;
  if (!a) return ERR.VALUE;
  if (a.r1 === a.r2 && a.c1 === a.c2) return ctx.cell(a.sheet, a.r1, a.c1);
  if (a.c1 === a.c2 && ctx.row >= a.r1 && ctx.row <= a.r2) return ctx.cell(a.sheet, ctx.row, a.c1);
  if (a.r1 === a.r2 && ctx.col >= a.c1 && ctx.col <= a.c2) return ctx.cell(a.sheet, a.r1, ctx.col);
  return ERR.VALUE;
}

/** Valor de uma matriz difundida para (r, c): dimensão 1 repete; fora do tamanho → #N/A. */
function broadcastAt(a: ArrayValue, r: number, c: number): Scalar {
  const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
  if (rr >= a.rows || cc >= a.cols) return ERR.NA;
  return a.get(rr, cc);
}

/** Primeiro escalar de um valor (canto superior esquerdo). */
export function topLeft(v: Value, ctx: FnContext): Scalar {
  if (v instanceof ArrayValue) return v.rows && v.cols ? v.get(0, 0) : ERR.VALUE;
  if (v instanceof RefValue) return implicitIntersection(v, ctx);
  if (v instanceof LambdaValue) return ERR.CALC;
  return v;
}

/** Chama `def` com os argumentos crus, aplicando modos, levantamento e erros. */
export function applyFn(def: FnDef, raw: readonly RawArg[], ctx: FnContext, opts: ApplyOptions = { arrayContext: true }): Value {
  if (raw.length < def.minArgs || raw.length > def.maxArgs) return ERR.VALUE;
  const args: unknown[] = new Array(raw.length);
  const liftIdx: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const mode = argMode(def, i);
    const a = raw[i]!;
    if (mode === 'lazy') { args[i] = a; continue; }
    const v: Value = typeof a === 'function' ? (a as Thunk)() : a;
    switch (mode) {
      case 'any': case 'ref': args[i] = v; break;
      case 'array':
        if (v instanceof RefValue) args[i] = v.single ? ctx.values(v) : ERR.VALUE;
        else args[i] = v;
        break;
      case 'value': {
        let x: Value = v;
        if (x instanceof RefValue) {
          const s = x.single;
          if (s && s.r1 === s.r2 && s.c1 === s.c2) x = ctx.cell(s.sheet, s.r1, s.c1);
          else if (opts.arrayContext && def.lift && s) x = ctx.values(x);
          else x = implicitIntersection(x, ctx);
        }
        if (x instanceof LambdaValue) x = ERR.CALC;
        if (x instanceof ArrayValue) {
          if (def.lift) liftIdx.push(i);
          else x = x.rows && x.cols ? x.get(0, 0) : ERR.VALUE;
        }
        args[i] = x;
        break;
      }
    }
  }
  const call = (xs: readonly unknown[]): Value => {
    if (!def.acceptsErrors) {
      for (let i = 0; i < xs.length; i++) {
        if (argMode(def, i) === 'value' && xs[i] instanceof CalcError) return xs[i] as CalcError;
      }
    }
    return def.call(xs, ctx);
  };
  if (!liftIdx.length) return call(args);
  // levantamento: tamanho = maior linha × maior coluna entre as matrizes
  let rows = 1, cols = 1;
  for (const i of liftIdx) {
    const a = args[i] as ArrayValue;
    rows = Math.max(rows, a.rows);
    cols = Math.max(cols, a.cols);
  }
  return ArrayValue.fill(rows, cols, (r, c) => {
    const xs = args.slice();
    for (const i of liftIdx) xs[i] = broadcastAt(args[i] as ArrayValue, r, c);
    const out = call(xs);
    return topLeft(out, ctx);
  });
}
