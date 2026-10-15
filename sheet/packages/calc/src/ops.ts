/**
 * Operadores das fórmulas sobre escalares (aritmética, comparação, `&`, `%`,
 * negação) com as regras do Excel, e a difusão elemento a elemento sobre
 * matrizes. As referências chegam já convertidas pelo avaliador.
 * Dono: agente CORE.
 */
import { toNumber, toText } from './coerce.js';
import { compareNumbers, compareText } from './collate.js';
import { excelPower, snapAdd } from './functions/math-util.js';
import type { ValueLocale } from './fn.js';
import { ArrayValue, CalcError, ERR, type Scalar } from './values.js';

/** Menor double normal: o Excel zera os subnormais (=2^-1074 → 0; medido). */
const MIN_NORMAL = Math.pow(2, -1022);

/** Resultado numérico final: ±0 e subnormais → 0; infinito/NaN → #NUM!. */
export function numResult(x: number): number | CalcError {
  if (!Number.isFinite(x)) return ERR.NUM;
  return Math.abs(x) < MIN_NORMAL ? 0 : x;
}

/** Soma/subtração comum (sem ajuste). */
export function addSub(a: number, b: number, sub: boolean): number | CalcError {
  return numResult(sub ? a - b : a + b);
}

/**
 * "Ajuste perto de zero" do Excel: só na ÚLTIMA operação da fórmula (raiz da
 * árvore, sem parênteses) quando é + ou −: se |resultado| < 2^-49 × o menor
 * operando, vira 0 (=0,1+0,2-0,3 → 0, mas =(0,1+0,2-0,3) e =1*(…) → 5,55E-17;
 * =1+7*2^-52-1 → 0 e =1+8*2^-52-1 → 1,78E-15; medido).
 */
export function addSubTop(a: number, b: number, sub: boolean): number | CalcError {
  // snapAdd (FN-MATH, medido): |r| < 2^(e−49), e = expoente do maior operando
  return numResult(snapAdd(a, sub ? -b : b));
}

export type ArithOp = '+' | '-' | '*' | '/' | '^';
export type CmpOp = '=' | '<>' | '<' | '<=' | '>' | '>=';

/** Potência = POWER do Excel (excelPower do FN-MATH: quadrados repetidos, base 10 exata, raiz ímpar de negativo a 15 dígitos, subnormal → 0). */
export function power(a: number, b: number): number | CalcError {
  const r = excelPower(a, b);
  return r instanceof CalcError ? r : numResult(r);
}

export function arith(op: ArithOp, x: Scalar, y: Scalar, locale: ValueLocale, top = false): Scalar {
  if (x instanceof CalcError) return x;
  const a = toNumber(x, locale);
  if (a instanceof CalcError) return a;
  if (y instanceof CalcError) return y;
  const b = toNumber(y, locale);
  if (b instanceof CalcError) return b;
  switch (op) {
    case '+': return top ? addSubTop(a, b, false) : addSub(a, b, false);
    case '-': return top ? addSubTop(a, b, true) : addSub(a, b, true);
    case '*': return numResult(a * b);
    case '/': return b === 0 ? ERR.DIV0 : numResult(a / b);
    case '^': return power(a, b);
  }
}

/**
 * Ordem dos operadores de comparação do Excel: números < textos < booleanos;
 * vazio vale 0 / "" / FALSO conforme o outro lado; números com 15 algarismos
 * significativos e textos na ordem linguística (collate.ts). Erros: o chamador.
 */
export function compareValues(a: Scalar, b: Scalar): number {
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const rank = (v: Scalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') return compareNumbers(a, b);
  if (typeof a === 'string' && typeof b === 'string') return compareText(a, b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return 0;
}

export function compare(op: CmpOp, x: Scalar, y: Scalar): Scalar {
  if (x instanceof CalcError) return x;
  if (y instanceof CalcError) return y;
  const c = compareValues(x, y);
  switch (op) {
    case '=': return c === 0;
    case '<>': return c !== 0;
    case '<': return c < 0;
    case '<=': return c <= 0;
    case '>': return c > 0;
    case '>=': return c >= 0;
  }
}

export function concat(x: Scalar, y: Scalar, locale: ValueLocale): Scalar {
  const a = toText(x, locale);
  if (a instanceof CalcError) return a;
  const b = toText(y, locale);
  if (b instanceof CalcError) return b;
  const s = a + b;
  // texto de célula tem no máximo 32.767 caracteres
  return s.length > 32767 ? ERR.VALUE : s;
}

export function negate(x: Scalar, locale: ValueLocale): Scalar {
  if (x instanceof CalcError) return x;
  const a = toNumber(x, locale);
  if (a instanceof CalcError) return a;
  return a === 0 ? 0 : -a;
}

export function percent(x: Scalar, locale: ValueLocale): Scalar {
  if (x instanceof CalcError) return x;
  const a = toNumber(x, locale);
  if (a instanceof CalcError) return a;
  return numResult(a / 100);
}

/** Valor da matriz difundida em (r, c): dimensão 1 repete; fora do tamanho → #N/A. */
function at(a: ArrayValue, r: number, c: number): Scalar {
  const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
  if (rr >= a.rows || cc >= a.cols) return ERR.NA;
  return a.get(rr, cc);
}

/** Aplica uma operação binária escalar com difusão de matrizes (como o Excel). */
export function broadcast2(x: Scalar | ArrayValue, y: Scalar | ArrayValue, f: (a: Scalar, b: Scalar) => Scalar): Scalar | ArrayValue {
  if (!(x instanceof ArrayValue) && !(y instanceof ArrayValue)) return f(x, y);
  const rows = Math.max(x instanceof ArrayValue ? x.rows : 1, y instanceof ArrayValue ? y.rows : 1);
  const cols = Math.max(x instanceof ArrayValue ? x.cols : 1, y instanceof ArrayValue ? y.cols : 1);
  return ArrayValue.fill(rows, cols, (r, c) => f(
    x instanceof ArrayValue ? at(x, r, c) : x,
    y instanceof ArrayValue ? at(y, r, c) : y,
  ));
}

export function map1(x: Scalar | ArrayValue, f: (a: Scalar) => Scalar): Scalar | ArrayValue {
  if (!(x instanceof ArrayValue)) return f(x);
  return new ArrayValue(x.rows, x.cols, x.data.map((v) => f(v ?? null)));
}
