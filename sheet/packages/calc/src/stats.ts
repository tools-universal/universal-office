/**
 * Base das funções estatísticas e de banco de dados: coleta de números dos
 * argumentos (regras do Excel para referência × matriz × argumento direto),
 * soma com o "arredondamento para zero" do Excel e os algoritmos medidos no
 * oráculo (variância, momentos, quantis).
 * Dono: agente FN-STAT.
 */
import type { FnContext } from './fn.js';
import { parseNumberText } from './coerce.js';
import { snapAdd } from './functions/math-util.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Area, type Scalar, type Value } from './values.js';

// ---------------------------------------------------------------------------
// Soma do Excel

/** Expoente binário (floor(log2|x|)) de um double finito ≠ 0. */
function exponentOf(x: number): number {
  return Math.floor(Math.log2(Math.abs(x)));
}

/**
 * a + b como o Excel soma (operador + e SUM/AVERAGE, medido): se os sinais são
 * opostos e o resultado perdeu 50 bits ou mais em relação ao 1º operando (o
 * acumulador), vira 0 — =SUM(0,1;0,2;-0,3) = 0 e =SUM(-1;1-8*2^-53) = 0, mas
 * =SUM(1-8*2^-53;-1) ≠ 0. O limite é pelo EXPOENTE do acumulador, não pelo valor.
 */
export function xlAdd(a: number, b: number): number {
  const r = a + b;
  if (r !== 0 && a !== 0 && (a > 0) !== (b > 0) && Number.isFinite(r) && exponentOf(r) <= exponentOf(a) - 50) return 0;
  return r;
}

/**
 * Soma como o SUM do Excel: da esquerda para a direita, com o cancelamento só na
 * ÚLTIMA adição (snapAdd). Medido: AVERAGE, AVERAGEA, SUBTOTAL(1/9) e AGGREGATE(9)
 * somam assim (AVERAGE(0,1;0,2;−0,3;1E-20) = 1,388E-17, não 2,5E-21; SUM(1E15;0,3;
 * −1E15) = 0); SUMPRODUCT, SUMIF(S), AVERAGEIF, MMULT, SERIESSUM e TRIMMEAN somam sem
 * cancelamento nenhum.
 */
export function xlSum(xs: readonly number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n - 1; i++) s += xs[i]!;
  return snapAdd(s, xs[n - 1]!);
}

/**
 * Resultado numérico final: infinito/NaN viram #NUM!; subnormal (|x| < 2,2E−308) vira 0
 * — o Excel não guarda subnormais (medido: CHISQ.DIST.RT(1500;10) = 0).
 */
export function num(x: number): number | CalcError {
  if (!Number.isFinite(x)) return ERR.NUM;
  return Math.abs(x) < 2.2250738585072014e-308 ? 0 : x;
}

// ---------------------------------------------------------------------------
// Coleta de números

/**
 * Como tratar cada tipo de valor na coleta. "Direto" = argumento escalar escrito
 * na fórmula (ou resultado escalar de expressão); "ref" = célula de referência;
 * "arr" = elemento de matriz (constante ou resultado de expressão).
 */
export interface CollectOptions {
  /** Texto em referência: ignora (padrão) ou conta como 0 (versões *A). */
  readonly refText?: 'skip' | 'zero';
  /** Booleano em referência: ignora (padrão) ou conta 1/0 (versões *A). */
  readonly refBool?: 'skip' | 'num';
  /** Texto em matriz: ignora (padrão) ou conta como 0 (AVERAGEA). */
  readonly arrText?: 'skip' | 'zero';
  /** Booleano em matriz: ignora (padrão) ou conta 1/0. */
  readonly arrBool?: 'skip' | 'num';
  /**
   * Texto direto: converte (padrão; não numérico → #VALUE!), ignora o não numérico
   * (COUNT) ou ignora qualquer texto, mesmo o que parece número (MODE).
   */
  readonly directText?: 'convert' | 'skip' | 'ignore';
  /** Booleano direto: conta 1/0 (padrão) ou ignora. */
  readonly directBool?: 'num' | 'skip';
  /** Erros: propaga o 1º (padrão) ou ignora (COUNT, AGGREGATE com opção 2/3/6/7). */
  readonly errors?: 'propagate' | 'skip';
  /** Pula células de referência (SUBTOTAL/AGGREGATE: linhas ocultas, subtotais aninhados). */
  readonly skipCell?: (sheet: number, row: number, col: number) => boolean;
}

/** Percorre as células de uma área (só as existentes), linha a linha. */
export function forEachInArea(ctx: FnContext, a: Area, fn: (v: Scalar, row: number, col: number) => void): void {
  ctx.forEachCell(a, fn);
}

/**
 * Números dos argumentos de uma agregação (AVERAGE, MAX, STDEV…), na ordem do
 * Excel (argumentos da esquerda para a direita; referência linha a linha), ou o
 * 1º erro.
 */
export function collectNumbers(args: readonly Value[], ctx: FnContext, o: CollectOptions = {}): number[] | CalcError {
  const out: number[] = [];
  for (const a of args) {
    const e = collectInto(out, a, ctx, o);
    if (e) return e;
  }
  return out;
}

/** Acrescenta os números de um argumento a `out`; devolve o erro, se houver. */
export function collectInto(out: number[], a: Value, ctx: FnContext, o: CollectOptions = {}): CalcError | undefined {
  if (a instanceof RefValue) {
    let err: CalcError | undefined;
    for (const area of a.areas) {
      ctx.forEachCell(area, (v, r, c) => {
        if (err) return;
        if (o.skipCell?.(area.sheet, r, c)) return;
        if (typeof v === 'number') out.push(v);
        else if (v instanceof CalcError) { if (o.errors !== 'skip') err = v; }
        else if (typeof v === 'string') { if (o.refText === 'zero') out.push(0); }
        else if (typeof v === 'boolean') { if (o.refBool === 'num') out.push(v ? 1 : 0); }
      });
      if (err) return err;
    }
    return undefined;
  }
  if (a instanceof ArrayValue) {
    for (const v of a.data) {
      if (typeof v === 'number') out.push(v);
      else if (v instanceof CalcError) { if (o.errors !== 'skip') return v; }
      else if (typeof v === 'string') { if (o.arrText === 'zero') out.push(0); }
      else if (typeof v === 'boolean') { if (o.arrBool === 'num') out.push(v ? 1 : 0); }
    }
    return undefined;
  }
  if (a instanceof LambdaValue) return ERR.VALUE;
  // argumento direto
  if (a === null) { out.push(0); return undefined; }
  if (typeof a === 'number') { out.push(a); return undefined; }
  if (typeof a === 'boolean') { if (o.directBool !== 'skip') out.push(a ? 1 : 0); return undefined; }
  if (a instanceof CalcError) return o.errors === 'skip' ? undefined : a;
  if (o.directText === 'ignore') return undefined;
  const n = parseNumberText(a, ctx.locale);
  if (n !== undefined) out.push(n);
  else if (o.directText !== 'skip') return ERR.VALUE;
  return undefined;
}

/** Todos os valores (escalares) de um argumento, na ordem; referência → células da área (vazias incluídas). */
export function scalarsOf(a: Value, ctx: FnContext): Scalar[] {
  if (a instanceof RefValue) {
    const out: Scalar[] = [];
    for (let i = 0; i < a.areas.length; i++) out.push(...ctx.values(a, i).data);
    return out;
  }
  if (a instanceof ArrayValue) return [...a.data];
  if (a instanceof LambdaValue) return [ERR.VALUE];
  return [a];
}

/** Número de células de uma área. */
export function areaSize(a: Area): number {
  return (a.r2 - a.r1 + 1) * (a.c2 - a.c1 + 1);
}

/**
 * Número escalar de um argumento `value` já sem erro (o avaliador propaga erros):
 * texto convertido no idioma, booleano 1/0, vazio 0.
 */
export function argNumber(v: Scalar, ctx: FnContext): number | CalcError {
  if (typeof v === 'number') return Number.isFinite(v) ? v : ERR.NUM;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof CalcError) return v;
  const n = parseNumberText(v, ctx.locale);
  return n === undefined ? ERR.VALUE : n;
}

/** Inteiro truncado (argumentos inteiros do Excel: k, número de casas…). */
export function argInt(v: Scalar, ctx: FnContext): number | CalcError {
  const n = argNumber(v, ctx);
  return n instanceof CalcError ? n : Math.trunc(n);
}

/** Booleano de argumento (cumulativo…): número ≠ 0, booleano, texto VERDADEIRO/FALSO. */
export function argBool(v: Scalar, ctx: FnContext): boolean | CalcError {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  if (v instanceof CalcError) return v;
  const u = v.trim().toUpperCase();
  if (u === 'TRUE' || u === ctx.locale.trueText.toUpperCase()) return true;
  if (u === 'FALSE' || u === ctx.locale.falseText.toUpperCase()) return false;
  const n = parseNumberText(v, ctx.locale);
  return n === undefined ? ERR.VALUE : n !== 0;
}

// ---------------------------------------------------------------------------
// Algoritmos medidos

/** Média (soma do Excel / n). */
export function mean(xs: readonly number[]): number {
  return xlSum(xs) / xs.length;
}

/** Soma dos quadrados dos desvios em duas passadas (DEVSQ; medido: bate em 100%). */
export function devsq(xs: readonly number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) { const d = x - m; s = xlAdd(s, d * d); }
  return s;
}

/**
 * Variância como o Excel (VAR.S/VAR.P e família, medido em ~900 conjuntos): fórmula
 * de "livro" — VAR.S = (Σx² − (Σx)²/n)/(n−1), VAR.P = (nΣx² − (Σx)²)/n² — salvo
 * quando ela perde precisão: se (Σx² − (Σx)²/n)/Σx² ≤ 1% ou variância/média < 0,001,
 * duas passadas Σ(x − média)²/(n − ddof).
 */
export function variance(xs: readonly number[], sample: boolean): number {
  const n = xs.length;
  let s1 = 0, s2 = 0;
  for (const x of xs) { s1 = xlAdd(s1, x); s2 = xlAdd(s2, x * x); }
  const m = s1 / n;
  const numer = s2 - s1 * s1 / n;
  const tb = sample ? numer / (n - 1) : (n * s2 - s1 * s1) / (n * n);
  if (numer / s2 > 0.01 && tb / m >= 1e-3) return tb;
  let ss = 0;
  for (const x of xs) ss = xlAdd(ss, (x - m) ** 2);
  return ss / (sample ? n - 1 : n);
}

/** Desvio padrão de duas passadas (base de SKEW/KURT, medido). */
function sdTwoPass(xs: readonly number[], m: number, ddof: number): number {
  let ss = 0;
  for (const x of xs) ss = xlAdd(ss, (x - m) ** 2);
  return Math.sqrt(ss / (xs.length - ddof));
}

/** SKEW (amostral): n/((n−1)(n−2)) · Σz³, z = (x − média)/s (medido: z·z·z). */
export function skew(xs: readonly number[]): number | CalcError {
  const n = xs.length;
  if (n < 3) return ERR.DIV0;
  const m = mean(xs), s = sdTwoPass(xs, m, 1);
  if (s === 0) return ERR.DIV0;
  let t = 0;
  for (const x of xs) { const z = (x - m) / s; t = xlAdd(t, z * z * z); }
  return num(n / ((n - 1) * (n - 2)) * t);
}

/** SKEW.P: Σz³/n, z com o desvio populacional. */
export function skewP(xs: readonly number[]): number | CalcError {
  const n = xs.length;
  if (n < 3) return ERR.DIV0;
  const m = mean(xs), s = sdTwoPass(xs, m, 0);
  if (s === 0) return ERR.DIV0;
  let t = 0;
  for (const x of xs) { const z = (x - m) / s; t = xlAdd(t, z * z * z); }
  return num(t / n);
}

/** KURT: n(n+1)/((n−1)(n−2)(n−3)) · Σz⁴ − 3(n−1)²/((n−2)(n−3)), z⁴ = (z·z)·(z·z) (medido). */
export function kurt(xs: readonly number[]): number | CalcError {
  const n = xs.length;
  if (n < 4) return ERR.DIV0;
  const m = mean(xs), s = sdTwoPass(xs, m, 1);
  if (s === 0) return ERR.DIV0;
  let t = 0;
  for (const x of xs) { const z = (x - m) / s; const z2 = z * z; t = xlAdd(t, z2 * z2); }
  return num(n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * t - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)));
}

/** Cópia ordenada (crescente). */
export function sorted(xs: readonly number[]): number[] {
  return Array.from(Float64Array.from(xs).sort());
}

// ---------------------------------------------------------------------------
// Pares de posições (CORREL, T.TEST pareado, PROB, CHISQ.TEST, FORECAST.ETS…)

/** Área grande (coluna/linha inteira): percorrer só as células existentes. */
export const BIG_AREA = 65536;

/** Matriz de valores de um argumento (referência de uma área, matriz ou escalar). */
export function gridOf(v: Value, ctx: FnContext): ArrayValue | CalcError {
  if (v instanceof RefValue) {
    if (v.areas.length !== 1) return ERR.VALUE;
    return ctx.values(v);
  }
  if (v instanceof ArrayValue) return v;
  if (v instanceof LambdaValue) return ERR.VALUE;
  return new ArrayValue(1, 1, [v]);
}

/**
 * Valores dos dois argumentos posição a posição (mesmo número de células, senão
 * #N/A); referências grandes são percorridas só nas células existentes (as posições
 * vazias nos dois lados não aparecem). `visit` recebe (a, b) na ordem linha a linha
 * e pode devolver um erro para parar.
 */
export function zipCells(xv: Value, yv: Value, ctx: FnContext, visit: (a: Scalar, b: Scalar) => CalcError | void): CalcError | undefined {
  if (xv instanceof RefValue && yv instanceof RefValue && xv.single && yv.single) {
    const ax = xv.single, ay = yv.single;
    const size = (r: Area): number => (r.r2 - r.r1 + 1) * (r.c2 - r.c1 + 1);
    if (size(ax) > BIG_AREA && size(ay) > BIG_AREA) {
      if (size(ax) !== size(ay)) return ERR.NA;
      const wx = ax.c2 - ax.c1 + 1, wy = ay.c2 - ay.c1 + 1;
      const xm = new Map<number, Scalar>(), ym = new Map<number, Scalar>();
      ctx.forEachCell(ax, (v, r, c) => { if (v !== null) xm.set((r - ax.r1) * wx + (c - ax.c1), v); });
      ctx.forEachCell(ay, (v, r, c) => { if (v !== null) ym.set((r - ay.r1) * wy + (c - ay.c1), v); });
      const keys = [...new Set([...xm.keys(), ...ym.keys()])].sort((a, b) => a - b);
      for (const k of keys) {
        const e = visit(xm.get(k) ?? null, ym.get(k) ?? null);
        if (e) return e;
      }
      return undefined;
    }
  }
  const gx = gridOf(xv, ctx), gy = gridOf(yv, ctx);
  if (gx instanceof CalcError) return gx;
  if (gy instanceof CalcError) return gy;
  if (gx.data.length !== gy.data.length) return ERR.NA;
  for (let i = 0; i < gx.data.length; i++) {
    const e = visit(gx.data[i]!, gy.data[i]!);
    if (e) return e;
  }
  return undefined;
}

/** Pares numéricos (x, y) na mesma posição; tamanhos diferentes → #N/A; erro propaga. */
export function numericPairs(xv: Value, yv: Value, ctx: FnContext): [number[], number[]] | CalcError {
  const xs: number[] = [], ys: number[] = [];
  const e = zipCells(xv, yv, ctx, (a, b) => {
    if (a instanceof CalcError) return a;
    if (b instanceof CalcError) return b;
    if (typeof a === 'number' && typeof b === 'number') { xs.push(a); ys.push(b); }
  });
  return e ?? [xs, ys];
}
