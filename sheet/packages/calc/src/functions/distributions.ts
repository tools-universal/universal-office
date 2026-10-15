/**
 * Distribuições de probabilidade e testes (NORM.., LOGNORM.., EXPON.., WEIBULL.., GAMMA..,
 * CHISQ.. e CHI.., BETA.., T.., F.., BINOM.., NEGBINOM.., HYPGEOM.., POISSON.., CONFIDENCE..,
 * Z.TEST, T.TEST, F.TEST, CHISQ.TEST, GAUSS, PHI), com os nomes legados.
 * Dono: agente FN-STAT. Funções especiais em special-functions.ts.
 *
 * Regras medidas no Excel 365 (oráculo): Φ = ½·erfc(−x/√2) de Cody sem o truque do
 * y² (cauda com o mesmo erro do Excel); cumulativa em texto ("1") → #VALUE!; densidades
 * em x = 0 (WEIBULL 0; GAMMA/BETA com forma ≤ 1 → #NUM!); inversas resolvidas na cauda
 * menor até a precisão do double; CHISQ.INV.RT(p) = CHISQ.INV(1 − p) (o Excel perde os
 * dígitos de p pequeno); CONFIDENCE.NORM usa NORM.S.INV(1 − α/2).
 */
import { register, type FnContext, type FnDef } from '../fn.js';
import { argNumber, collectNumbers, mean, num, numericPairs, variance, zipCells } from '../stats.js';
import {
  bd0, betaInc, dbinomRaw, dnorm, dpoisRaw, gamma, lbeta, lgamma, normCdfXl, pgamma, qnorm, stirlerr,
} from '../special-functions.js';
import { ArrayValue, CalcError, ERR, RefValue, type Scalar, type Value } from '../values.js';

const X = '_xlfn.';

// ---------------------------------------------------------------------------
// Apoio

/** Converte os argumentos (já sem erro) em números; o 1º que falhar devolve o erro. */
function nums(args: readonly unknown[], ctx: FnContext, n: number): number[] | CalcError {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = argNumber((args[i] ?? null) as Scalar, ctx);
    if (v instanceof CalcError) return v;
    out.push(v);
  }
  return out;
}

/**
 * Argumento lógico (cumulativo): número ≠ 0, booleano, vazio = FALSO; texto só se for o
 * nome do booleano — "1" em texto dá #VALUE! (medido).
 */
function logical(v: Scalar | undefined, ctx: FnContext): boolean | CalcError {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof CalcError) return v;
  const u = v.trim().toUpperCase();
  if (u === ctx.locale.trueText.toUpperCase() || u === 'TRUE') return true;
  if (u === ctx.locale.falseText.toUpperCase() || u === 'FALSE') return false;
  return ERR.VALUE;
}

/** Argumento opcional numérico (omitido = padrão). */
function optNum(v: Scalar | undefined, ctx: FnContext, dflt: number): number | CalcError {
  return v === undefined || v === null ? dflt : argNumber(v, ctx);
}

/** FnDef de função escalar levantada (todos os argumentos `value`). */
function scalarFn(name: string, min: number, max: number, f: (a: readonly Scalar[], ctx: FnContext) => Value, prefix?: string): FnDef {
  return { name, prefix, minArgs: min, maxArgs: max, args: 'value', lift: true, call: (args, ctx) => f(args as Scalar[], ctx) };
}

/**
 * Raiz de f(x) = alvo para f monótona em [lo, hi] (Brent), até a precisão do double.
 */
export function solve(f: (x: number) => number, target: number, lo: number, hi: number): number {
  let a = lo, b = hi;
  let fa = f(a) - target, fb = f(b) - target;
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) return NaN;
  let c = a, fc = fa, d = b - a, e = d;
  for (let it = 0; it < 500; it++) {
    if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol = 2 * Number.EPSILON * Math.abs(b) + 1e-300;
    const m = 0.5 * (c - b);
    if (Math.abs(m) <= tol || fb === 0) return b;
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      let p: number, q: number;
      const s = fb / fa;
      if (a === c) { p = 2 * m * s; q = 1 - s; }
      else {
        const qq = fa / fc, r = fb / fc;
        p = s * (2 * m * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) { e = d; d = p / q; }
      else { d = m; e = d; }
    } else { d = m; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
    fb = f(b) - target;
  }
  return b;
}

/**
 * Quantil de uma distribuição em [0, ∞) com cdf(x, cauda de baixo?): resolve na cauda
 * menor (p ≤ ½ → P(X ≤ x) = p; senão P(X > x) = 1 − p).
 */
function quantilePos(cdf: (x: number, lower: boolean) => number, p: number, x0: number, upperP?: number): number {
  const lower = p <= 0.5 && upperP === undefined;
  const t = lower ? p : upperP ?? 1 - p;
  // f crescente em x
  const f = lower ? (x: number) => cdf(x, true) : (x: number) => -cdf(x, false);
  const target = lower ? t : -t;
  let hi = Math.max(x0, 1e-300);
  for (let i = 0; i < 3000 && f(hi) < target; i++) hi *= 2;
  let lo = Math.min(x0, hi);
  for (let i = 0; i < 3000 && lo > 0 && f(lo) > target; i++) lo /= 2;
  if (f(lo) > target) lo = 0;
  return solve(f, target, lo, hi);
}

// ---------------------------------------------------------------------------
// Normal e lognormal

function normDist(a: readonly Scalar[], ctx: FnContext, std: boolean): Value {
  const v = nums(a, ctx, std ? 1 : 3);
  if (v instanceof CalcError) return v;
  const cum = logical(a[std ? 1 : 3], ctx);
  if (cum instanceof CalcError) return cum;
  const [x, m, s] = std ? [v[0]!, 0, 1] : v as [number, number, number];
  if (s <= 0) return ERR.NUM;
  const z = (x - m) / s;
  return num(cum ? normCdfXl(z) : dnorm(z) / s);
}

function normInv(a: readonly Scalar[], ctx: FnContext, std: boolean): Value {
  const v = nums(a, ctx, std ? 1 : 3);
  if (v instanceof CalcError) return v;
  const [p, m, s] = std ? [v[0]!, 0, 1] : v as [number, number, number];
  if (p <= 0 || p >= 1 || s <= 0) return ERR.NUM;
  return num(m + s * qnorm(p));
}

function lognormDist(a: readonly Scalar[], ctx: FnContext, legacy: boolean): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const [x, m, s] = v as [number, number, number];
  let cum = true;
  if (!legacy) { const c = logical(a[3], ctx); if (c instanceof CalcError) return c; cum = c; }
  if (x <= 0 || s <= 0) return ERR.NUM;
  const z = (Math.log(x) - m) / s;
  return num(cum ? normCdfXl(z) : dnorm(z) / (x * s));
}

function lognormInv(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const [p, m, s] = v as [number, number, number];
  if (p <= 0 || p >= 1 || s <= 0) return ERR.NUM;
  return num(Math.exp(m + s * qnorm(p)));
}

register(
  scalarFn('NORM.DIST', 4, 4, (a, c) => normDist(a, c, false), X),
  scalarFn('NORMDIST', 4, 4, (a, c) => normDist(a, c, false)),
  scalarFn('NORM.S.DIST', 2, 2, (a, c) => normDist(a, c, true), X),
  scalarFn('NORMSDIST', 1, 1, (a, c) => normDist([a[0] ?? null, true], c, true)),
  scalarFn('NORM.INV', 3, 3, (a, c) => normInv(a, c, false), X),
  scalarFn('NORMINV', 3, 3, (a, c) => normInv(a, c, false)),
  scalarFn('NORM.S.INV', 1, 1, (a, c) => normInv(a, c, true), X),
  scalarFn('NORMSINV', 1, 1, (a, c) => normInv(a, c, true)),
  scalarFn('LOGNORM.DIST', 4, 4, (a, c) => lognormDist(a, c, false), X),
  scalarFn('LOGNORMDIST', 3, 3, (a, c) => lognormDist(a, c, true)),
  scalarFn('LOGNORM.INV', 3, 3, lognormInv, X),
  scalarFn('LOGINV', 3, 3, lognormInv),
  scalarFn('GAUSS', 1, 1, (a, c) => { const v = nums(a, c, 1); return v instanceof CalcError ? v : num(normCdfXl(v[0]!) - 0.5); }, X),
  scalarFn('PHI', 1, 1, (a, c) => { const v = nums(a, c, 1); return v instanceof CalcError ? v : num(dnorm(v[0]!)); }, X),
);

// ---------------------------------------------------------------------------
// Exponencial e Weibull (cumulativas com expm1: EXPON.DIST(1E−10;1;1) = 9,9999999995E−11)

function exponDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 2);
  if (v instanceof CalcError) return v;
  const cum = logical(a[2], ctx);
  if (cum instanceof CalcError) return cum;
  const [x, l] = v as [number, number];
  if (x < 0 || l <= 0) return ERR.NUM;
  return num(cum ? -Math.expm1(-l * x) : l * Math.exp(-l * x));
}

function weibullDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const cum = logical(a[3], ctx);
  if (cum instanceof CalcError) return cum;
  const [x, al, be] = v as [number, number, number];
  if (x < 0 || al <= 0 || be <= 0) return ERR.NUM;
  const t = Math.pow(x / be, al);
  if (cum) return num(-Math.expm1(-t));
  if (x === 0) return 0; // medido: densidade 0 em x = 0 para qualquer forma
  return num((al / Math.pow(be, al)) * Math.pow(x, al - 1) * Math.exp(-t));
}

register(
  scalarFn('EXPON.DIST', 3, 3, exponDist, X),
  scalarFn('EXPONDIST', 3, 3, exponDist),
  scalarFn('WEIBULL.DIST', 4, 4, weibullDist, X),
  scalarFn('WEIBULL', 4, 4, weibullDist),
);

// ---------------------------------------------------------------------------
// Gama e qui-quadrado

/**
 * Densidade gama (forma a, escala b): x^(a−1)·e^(−x/b) / (b^a·Γ(a)) direto — é o que
 * mais bate com o Excel (medido); se estourar, a forma de Loader (dgamma do R).
 */
function gammaPdf(x: number, a: number, b: number): number {
  if (x === 0) return a <= 1 ? NaN : 0; // medido: forma ≤ 1 em x = 0 → #NUM!
  const direct = Math.pow(x, a - 1) * Math.exp(-x / b) / (Math.pow(b, a) * Math.exp(lgamma(a)));
  if (Number.isFinite(direct) && direct > 1e-300) return direct;
  const y = x / b;
  if (a >= 1) return dpoisRaw(a - 1, y) / b;
  return dpoisRaw(a, y) * a / x;
}

const gammaCdf = (x: number, a: number, b: number, lower: boolean): number => pgamma(x / b, a, lower);
const gammaQuantile = (p: number, a: number, b: number): number => quantilePos((x, lo) => gammaCdf(x, a, b, lo), p, a * b);

function gammaDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const cum = logical(a[3], ctx);
  if (cum instanceof CalcError) return cum;
  const [x, al, be] = v as [number, number, number];
  if (x < 0 || al <= 0 || be <= 0) return ERR.NUM;
  return num(cum ? gammaCdf(x, al, be, true) : gammaPdf(x, al, be));
}

function gammaInv(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const [p, al, be] = v as [number, number, number];
  if (p < 0 || p >= 1 || al <= 0 || be <= 0) return ERR.NUM;
  if (p === 0) return 0;
  return num(gammaQuantile(p, al, be));
}

/** Graus de liberdade truncados; fora de [1, 10^10] → #NUM!. */
function dfOf(x: number): number | CalcError {
  const d = Math.trunc(x);
  return d < 1 || d > 1e10 ? ERR.NUM : d;
}

function chisqDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 2);
  if (v instanceof CalcError) return v;
  const cum = logical(a[2], ctx);
  if (cum instanceof CalcError) return cum;
  const df = dfOf(v[1]!);
  if (df instanceof CalcError) return df;
  const x = v[0]!;
  if (x < 0) return ERR.NUM;
  // medido: CHISQ.DIST(0;2;FALSO) = 0,5 (GAMMA.DIST(0;1;2;FALSO) é #NUM!)
  if (!cum && x === 0) return df === 2 ? 0.5 : df === 1 ? ERR.NUM : 0;
  return num(cum ? gammaCdf(x, df / 2, 2, true) : gammaPdf(x, df / 2, 2));
}

function chisqRt(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 2);
  if (v instanceof CalcError) return v;
  const df = dfOf(v[1]!);
  if (df instanceof CalcError) return df;
  if (v[0]! < 0) return ERR.NUM;
  return num(gammaCdf(v[0]!, df / 2, 2, false));
}

function chisqInv(a: readonly Scalar[], ctx: FnContext, rt: boolean): Value {
  const v = nums(a, ctx, 2);
  if (v instanceof CalcError) return v;
  const df = dfOf(v[1]!);
  if (df instanceof CalcError) return df;
  const p = v[0]!;
  if (p < 0 || p > 1) return ERR.NUM;
  if (rt) {
    if (p === 0) return ERR.NUM;
    if (p === 1) return 0;
    // medido: com 1 grau de liberdade o Excel passa por 1 − p (perde os dígitos de p
    // pequeno); com 2 ou mais resolve a cauda direita direto
    if (df === 1) return num(gammaQuantile(1 - p, 0.5, 2));
    return num(p > 0.5 ? gammaQuantile(1 - p, df / 2, 2) : quantilePos((x, lo) => gammaCdf(x, df / 2, 2, lo), 1 - p, df, p));
  }
  if (p === 1) return ERR.NUM;
  if (p === 0) return 0;
  return num(gammaQuantile(p, df / 2, 2));
}

register(
  scalarFn('GAMMA.DIST', 4, 4, gammaDist, X),
  scalarFn('GAMMADIST', 4, 4, gammaDist),
  scalarFn('GAMMA.INV', 3, 3, gammaInv, X),
  scalarFn('GAMMAINV', 3, 3, gammaInv),
  scalarFn('GAMMALN', 1, 1, (a, c) => { const v = nums(a, c, 1); if (v instanceof CalcError) return v; return v[0]! <= 0 ? ERR.NUM : num(lgamma(v[0]!)); }),
  scalarFn('GAMMALN.PRECISE', 1, 1, (a, c) => { const v = nums(a, c, 1); if (v instanceof CalcError) return v; return v[0]! <= 0 ? ERR.NUM : num(lgamma(v[0]!)); }, X),
  scalarFn('GAMMA', 1, 1, (a, c) => {
    const v = nums(a, c, 1);
    if (v instanceof CalcError) return v;
    const x = v[0]!;
    if (x <= 0 && x === Math.floor(x)) return ERR.NUM;
    return num(gamma(x));
  }, X),
  scalarFn('CHISQ.DIST', 3, 3, chisqDist, X),
  scalarFn('CHISQ.DIST.RT', 2, 2, chisqRt, X),
  scalarFn('CHIDIST', 2, 2, chisqRt),
  scalarFn('CHISQ.INV', 2, 2, (a, c) => chisqInv(a, c, false), X),
  scalarFn('CHISQ.INV.RT', 2, 2, (a, c) => chisqInv(a, c, true), X),
  scalarFn('CHIINV', 2, 2, (a, c) => chisqInv(a, c, true)),
);

// ---------------------------------------------------------------------------
// Beta

function betaPdf(x: number, a: number, b: number): number {
  if (x === 0) return a <= 1 ? NaN : 0; // medido: α ≤ 1 em x = 0 → #NUM!
  if (x === 1) return b < 1 ? NaN : b === 1 ? a : 0;
  if (a <= 2 || b <= 2) return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b));
  return (a + b - 1) * dbinomRaw(a - 1, a + b - 2, x, 1 - x);
}

/** Limites A e B (opcionais) da beta. */
function betaBounds(a: readonly Scalar[], i: number, ctx: FnContext): [number, number] | CalcError {
  const lo = optNum(a[i], ctx, 0);
  if (lo instanceof CalcError) return lo;
  const hi = optNum(a[i + 1], ctx, 1);
  if (hi instanceof CalcError) return hi;
  return [lo, hi];
}

function betaDistFn(a: readonly Scalar[], ctx: FnContext, legacy: boolean): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const [x, al, be] = v as [number, number, number];
  let cum = true;
  if (!legacy) { const c = logical(a[3], ctx); if (c instanceof CalcError) return c; cum = c; }
  const ab = betaBounds(a, legacy ? 3 : 4, ctx);
  if (ab instanceof CalcError) return ab;
  const [lo, hi] = ab;
  if (al <= 0 || be <= 0 || x < lo || x > hi || lo === hi) return ERR.NUM;
  const y = (x - lo) / (hi - lo);
  return num(cum ? betaInc(y, al, be).p : betaPdf(y, al, be) / (hi - lo));
}

function betaInvFn(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const [p, al, be] = v as [number, number, number];
  const ab = betaBounds(a, 3, ctx);
  if (ab instanceof CalcError) return ab;
  const [lo, hi] = ab;
  if (p <= 0 || p >= 1 || al <= 0 || be <= 0 || lo >= hi) return ERR.NUM;
  const y = p <= 0.5
    ? solve((t) => betaInc(t, al, be).p, p, 0, 1)
    : solve((t) => -betaInc(t, al, be).q, -(1 - p), 0, 1);
  return num(lo + y * (hi - lo));
}

register(
  scalarFn('BETA.DIST', 4, 6, (a, c) => betaDistFn(a, c, false), X),
  scalarFn('BETADIST', 3, 5, (a, c) => betaDistFn(a, c, true)),
  scalarFn('BETA.INV', 3, 5, betaInvFn, X),
  scalarFn('BETAINV', 3, 5, betaInvFn),
);

// ---------------------------------------------------------------------------
// t de Student

/** P(T > t) para t ≥ 0, precisa nas duas pontas. */
function tUpper(t: number, df: number): number {
  if (t === 0) return 0.5;
  if (!Number.isFinite(t)) return 0;
  const t2 = t * t;
  if (t2 > df) return 0.5 * betaInc(df / (df + t2), df / 2, 0.5).p;
  return 0.5 * betaInc(t2 / (df + t2), 0.5, df / 2).q;
}
/** P(T ≤ t) (lower) ou P(T > t). */
function tCdf(t: number, df: number, lower: boolean): number {
  const u = tUpper(Math.abs(t), df);
  return (t >= 0) === lower ? 1 - u : u;
}
/** Densidade t pelo método de Loader (dt antigo do R — o que mais bate com o Excel). */
function tPdf(t: number, n: number): number {
  const tt = -bd0(n / 2, (n + 1) / 2) + stirlerr((n + 1) / 2) - stirlerr(n / 2);
  const x2n = t * t / n;
  const u = t * t > 0.2 * n ? Math.log(1 + x2n) * n / 2 : -bd0(n / 2, (n + t * t) / 2) + t * t / 2;
  return Math.exp(tt - u) / Math.sqrt(2 * Math.PI * (1 + x2n));
}
/** t ≥ 0 com P(T > t) = q (q ≤ ½). */
function tUpperQuantile(q: number, df: number): number {
  if (q >= 0.5) return 0;
  const f = (t: number): number => -tUpper(t, df);
  let hi = 1;
  for (let i = 0; i < 3000 && f(hi) < -q; i++) hi *= 2;
  return solve(f, -q, 0, hi);
}
/** Quantil de baixo: P(T ≤ t) = p. */
function tQuantile(p: number, df: number): number {
  return p < 0.5 ? -tUpperQuantile(p, df) : tUpperQuantile(1 - p, df);
}

function tDf(x: number): number | CalcError {
  const df = Math.trunc(x);
  return df < 1 ? ERR.NUM : df;
}

register(
  scalarFn('T.DIST', 3, 3, (a, c) => {
    const v = nums(a, c, 2); if (v instanceof CalcError) return v;
    const cum = logical(a[2], c); if (cum instanceof CalcError) return cum;
    const df = tDf(v[1]!); if (df instanceof CalcError) return df;
    return num(cum ? tCdf(v[0]!, df, true) : tPdf(v[0]!, df));
  }, X),
  scalarFn('T.DIST.RT', 2, 2, (a, c) => {
    const v = nums(a, c, 2); if (v instanceof CalcError) return v;
    const df = tDf(v[1]!); if (df instanceof CalcError) return df;
    return num(tCdf(v[0]!, df, false));
  }, X),
  scalarFn('T.DIST.2T', 2, 2, (a, c) => {
    const v = nums(a, c, 2); if (v instanceof CalcError) return v;
    const df = tDf(v[1]!); if (df instanceof CalcError) return df;
    if (v[0]! < 0) return ERR.NUM;
    return num(2 * tUpper(v[0]!, df));
  }, X),
  scalarFn('TDIST', 3, 3, (a, c) => {
    const v = nums(a, c, 3); if (v instanceof CalcError) return v;
    const df = tDf(v[1]!), tails = Math.trunc(v[2]!);
    if (df instanceof CalcError) return df;
    if (v[0]! < 0 || (tails !== 1 && tails !== 2)) return ERR.NUM;
    return num(tails * tUpper(v[0]!, df));
  }),
  scalarFn('T.INV', 2, 2, (a, c) => {
    const v = nums(a, c, 2); if (v instanceof CalcError) return v;
    const p = v[0]!; const df = tDf(v[1]!);
    if (df instanceof CalcError) return df;
    if (p === 0 && df === 1) return ERR.DIV0; // medido: só com 1 grau de liberdade
    if (p <= 0 || p >= 1) return ERR.NUM;
    return num(tQuantile(p, df));
  }, X),
  ...(['T.INV.2T', 'TINV'] as const).map((name) => scalarFn(name, 2, 2, (a, c) => {
    const v = nums(a, c, 2); if (v instanceof CalcError) return v;
    const p = v[0]!; const df = tDf(v[1]!);
    if (df instanceof CalcError) return df;
    if (p === 0 && df === 1) return ERR.DIV0;
    if (p <= 0 || p > 1) return ERR.NUM;
    return num(tUpperQuantile(p / 2, df));
  }, name === 'TINV' ? undefined : X)),
);

// ---------------------------------------------------------------------------
// F de Snedecor

function fCdf(x: number, d1: number, d2: number, lower: boolean): number {
  if (x <= 0) return lower ? 0 : 1;
  if (!Number.isFinite(x)) return lower ? 1 : 0;
  // lower: I_{d1x/(d1x+d2)}(d1/2, d2/2); upper: I_{d2/(d2+d1x)}(d2/2, d1/2)
  return lower ? betaInc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2).p : betaInc(d2 / (d2 + d1 * x), d2 / 2, d1 / 2).p;
}
function fPdf(x: number, d1: number, d2: number): number {
  if (x === 0) return d1 < 2 ? NaN : d1 === 2 ? 1 : 0;
  return Math.exp(0.5 * d1 * Math.log(d1 * x) + 0.5 * d2 * Math.log(d2) - 0.5 * (d1 + d2) * Math.log(d1 * x + d2) - Math.log(x) - lbeta(d1 / 2, d2 / 2));
}

function fArgs(a: readonly Scalar[], ctx: FnContext): [number, number, number] | CalcError {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const d1 = Math.trunc(v[1]!), d2 = Math.trunc(v[2]!);
  if (d1 < 1 || d2 < 1 || d1 >= 1e10 || d2 >= 1e10) return ERR.NUM;
  return [v[0]!, d1, d2];
}

function fInv(a: readonly Scalar[], ctx: FnContext, rt: boolean): Value {
  const v = fArgs(a, ctx); if (v instanceof CalcError) return v;
  const p = v[0];
  if (p < 0 || p > 1) return ERR.NUM;
  const cdf = (x: number, lo: boolean): number => fCdf(x, v[1], v[2], lo);
  if (rt) {
    // medido: F.INV.RT resolve a cauda direita direto (sem 1 − p)
    if (p === 0) return ERR.NUM;
    if (p === 1) return 0;
    return num(p >= 0.5 ? quantilePos(cdf, 1 - p, 1) : quantilePos(cdf, 1 - p, 1, p));
  }
  if (p === 1) return ERR.NUM;
  if (p === 0) return 0;
  return num(quantilePos(cdf, p, 1));
}

register(
  scalarFn('F.DIST', 4, 4, (a, c) => {
    const v = fArgs(a, c); if (v instanceof CalcError) return v;
    const cum = logical(a[3], c); if (cum instanceof CalcError) return cum;
    if (v[0] < 0) return ERR.NUM;
    return num(cum ? fCdf(v[0], v[1], v[2], true) : fPdf(...v));
  }, X),
  ...(['F.DIST.RT', 'FDIST'] as const).map((name) => scalarFn(name, 3, 3, (a, c) => {
    const v = fArgs(a, c); if (v instanceof CalcError) return v;
    if (v[0] < 0) return ERR.NUM;
    return num(fCdf(v[0], v[1], v[2], false));
  }, name === 'FDIST' ? undefined : X)),
  scalarFn('F.INV', 3, 3, (a, c) => fInv(a, c, false), X),
  ...(['F.INV.RT', 'FINV'] as const).map((name) => scalarFn(name, 3, 3, (a, c) => fInv(a, c, true), name === 'FINV' ? undefined : X)),
);

// ---------------------------------------------------------------------------
// Discretas: binomial, binomial negativa, hipergeométrica, Poisson

const binomPmf = (k: number, n: number, p: number): number => dbinomRaw(k, n, p, 1 - p);
/** Medido: BINOM.*, HYPGEOM com n (ou população) ≥ 2^31 − 1 → #NUM!. */
const MAX_N = 2147483647;

/** Termos somados até aqui; acima disso, a beta incompleta (n enorme não trava). */
const MAX_TERMS = 5000;

function binomCdf(k: number, n: number, p: number): number {
  if (k >= n) return 1;
  if (k > MAX_TERMS) return betaInc(1 - p, n - k, k + 1).p;
  let s = 0;
  for (let i = 0; i <= k; i++) s += binomPmf(i, n, p);
  return Math.min(s, 1);
}

function binomDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const cum = logical(a[3], ctx);
  if (cum instanceof CalcError) return cum;
  const k = Math.trunc(v[0]!), n = Math.trunc(v[1]!), p = v[2]!;
  if (k < 0 || k > n || p < 0 || p > 1 || n >= MAX_N) return ERR.NUM;
  if (!cum && k === 0 && p === 1 && n > 0) return ERR.NUM; // medido: n·ln(1−p) com p = 1
  return num(cum ? binomCdf(k, n, p) : binomPmf(k, n, p));
}

/** Menor k com P(X ≤ k) > α (medido: BINOM.INV(1;0,5;0,5) = 1). */
function binomInv(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  const n = Math.trunc(v[0]!), p = v[1]!, al = v[2]!;
  if (n < 0 || p <= 0 || p >= 1 || al <= 0 || al >= 1 || n >= MAX_N) return ERR.NUM;
  if (n > MAX_TERMS) {
    // busca binária na cumulativa (beta incompleta)
    let lo = 0, hi = n;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (binomCdf(mid, n, p) > al) hi = mid; else lo = mid + 1; }
    return lo;
  }
  let s = 0;
  for (let k = 0; k <= n; k++) { s += binomPmf(k, n, p); if (s > al) return k; }
  return n;
}

function negbinomPmf(f: number, s: number, p: number): number {
  // C(f+s−1, f) p^s (1−p)^f = p · dbinom(s−1; f+s−1, p) (medido: a forma que mais bate)
  return p * dbinomRaw(s - 1, f + s - 1, p, 1 - p);
}

function negbinomDist(a: readonly Scalar[], ctx: FnContext, legacy: boolean): Value {
  const v = nums(a, ctx, 3);
  if (v instanceof CalcError) return v;
  let cum = false;
  if (!legacy) { const c = logical(a[3], ctx); if (c instanceof CalcError) return c; cum = c; }
  const f = Math.trunc(v[0]!), s = Math.trunc(v[1]!), p = v[2]!;
  if (f < 0 || s < 1 || p <= 0 || p >= 1) return ERR.NUM;
  if (!cum) return num(negbinomPmf(f, s, p));
  let t = 0;
  if (f > MAX_TERMS) return num(betaInc(p, s, f + 1).p);
  for (let i = 0; i <= f; i++) t += negbinomPmf(i, s, p);
  return num(Math.min(t, 1));
}

function hypgeomPmf(x: number, n: number, M: number, N: number): number {
  if (x < Math.max(0, n - N + M) || x > Math.min(n, M)) return 0;
  if (n === 0 || n === N) return 1;
  // C(M, x) C(N−M, n−x) / C(N, n) com Loader: dbinom(x, M, p)·dbinom(n−x, N−M, p)/dbinom(n, N, p), p = n/N
  const p = n / N, q = (N - n) / N;
  return dbinomRaw(x, M, p, q) * dbinomRaw(n - x, N - M, p, q) / dbinomRaw(n, N, p, q);
}

function hypgeomDist(a: readonly Scalar[], ctx: FnContext, legacy: boolean): Value {
  const v = nums(a, ctx, 4);
  if (v instanceof CalcError) return v;
  let cum = false;
  if (!legacy) { const c = logical(a[4], ctx); if (c instanceof CalcError) return c; cum = c; }
  const x = Math.trunc(v[0]!), n = Math.trunc(v[1]!), M = Math.trunc(v[2]!), N = Math.trunc(v[3]!);
  // medido: amostra/sucessos zerados e x fora do possível não são erro (densidade 0)
  if (x < 0 || n < 0 || M < 0 || N <= 0 || n > N || M > N || N >= MAX_N) return ERR.NUM;
  if (!cum) return num(hypgeomPmf(x, n, M, N));
  let t = 0;
  const lo = Math.max(0, n - N + M), hi = Math.min(x, n, M);
  if (hi - lo > 1e6) return ERR.NUM;
  for (let i = lo; i <= hi; i++) t += hypgeomPmf(i, n, M, N);
  return num(Math.min(t, 1));
}

function poissonDist(a: readonly Scalar[], ctx: FnContext): Value {
  const v = nums(a, ctx, 2);
  if (v instanceof CalcError) return v;
  const cum = logical(a[2], ctx);
  if (cum instanceof CalcError) return cum;
  const x = Math.trunc(v[0]!), l = v[1]!;
  if (x < 0 || l < 0) return ERR.NUM;
  if (!cum) return num(dpoisRaw(x, l));
  // P(X ≤ x) = Q(x + 1, λ)
  return num(l === 0 ? 1 : pgamma(l, x + 1, false));
}

register(
  scalarFn('BINOM.DIST', 4, 4, binomDist, X),
  scalarFn('BINOMDIST', 4, 4, binomDist),
  scalarFn('BINOM.DIST.RANGE', 3, 4, (a, c) => {
    const v = nums(a, c, 3); if (v instanceof CalcError) return v;
    const n = Math.trunc(v[0]!), p = v[1]!, s = Math.trunc(v[2]!);
    const s2r = optNum(a[3], c, s); if (s2r instanceof CalcError) return s2r;
    const s2 = Math.trunc(s2r);
    if (n < 0 || p < 0 || p > 1 || s < 0 || s > n || s2 < s || s2 > n || n >= MAX_N) return ERR.NUM;
    let t = 0;
    if (s2 - s > MAX_TERMS) return num(binomCdf(s2, n, p) - (s > 0 ? binomCdf(s - 1, n, p) : 0));
    for (let k = s; k <= s2; k++) t += binomPmf(k, n, p);
    return num(t);
  }, X),
  scalarFn('BINOM.INV', 3, 3, binomInv, X),
  scalarFn('CRITBINOM', 3, 3, binomInv),
  scalarFn('NEGBINOM.DIST', 4, 4, (a, c) => negbinomDist(a, c, false), X),
  scalarFn('NEGBINOMDIST', 3, 3, (a, c) => negbinomDist(a, c, true)),
  scalarFn('HYPGEOM.DIST', 5, 5, (a, c) => hypgeomDist(a, c, false), X),
  scalarFn('HYPGEOMDIST', 4, 4, (a, c) => hypgeomDist(a, c, true)),
  scalarFn('POISSON.DIST', 3, 3, poissonDist, X),
  scalarFn('POISSON', 3, 3, poissonDist),
);

// ---------------------------------------------------------------------------
// Intervalos de confiança

register(
  ...(['CONFIDENCE.NORM', 'CONFIDENCE'] as const).map((name) => scalarFn(name, 3, 3, (a, c) => {
    const v = nums(a, c, 3); if (v instanceof CalcError) return v;
    const [al, s] = v as [number, number]; const n = Math.trunc(v[2]!);
    if (al <= 0 || al >= 1 || s <= 0 || n < 1) return ERR.NUM;
    return num(qnorm(1 - al / 2) * s / Math.sqrt(n));
  }, name === 'CONFIDENCE' ? undefined : X)),
  scalarFn('CONFIDENCE.T', 3, 3, (a, c) => {
    const v = nums(a, c, 3); if (v instanceof CalcError) return v;
    const [al, s] = v as [number, number]; const n = Math.trunc(v[2]!);
    if (al <= 0 || al >= 1 || s <= 0 || n < 1) return ERR.NUM;
    if (n === 1) return ERR.DIV0;
    return num(tUpperQuantile(al / 2, n - 1) * s / Math.sqrt(n));
  }, X),
);

// ---------------------------------------------------------------------------
// Testes de hipótese

function dataNums(v: Value, ctx: FnContext): number[] | CalcError {
  return collectNumbers([v], ctx);
}

function zTest(args: readonly unknown[], ctx: FnContext): Value {
  const xs = dataNums(args[0] as Value, ctx);
  if (xs instanceof CalcError) return xs;
  const x = argNumber(args[1] as Scalar, ctx);
  if (x instanceof CalcError) return x;
  if (!xs.length) return ERR.NA;
  let s: number;
  if (args[2] !== undefined && args[2] !== null) {
    const t = argNumber(args[2] as Scalar, ctx);
    if (t instanceof CalcError) return t;
    if (t <= 0) return ERR.NUM;
    s = t;
  } else {
    if (xs.length < 2) return ERR.DIV0;
    s = Math.sqrt(variance(xs, true));
    if (s === 0) return ERR.DIV0;
  }
  // 1 − Φ(z) calculado como Φ(−z): a cauda pequena não vira 0 (medido)
  return num(normCdfXl(-(mean(xs) - x) / (s / Math.sqrt(xs.length))));
}

function tTest(args: readonly unknown[], ctx: FnContext): Value {
  const tailsN = argNumber(args[2] as Scalar, ctx);
  if (tailsN instanceof CalcError) return tailsN;
  const typeN = argNumber(args[3] as Scalar, ctx);
  if (typeN instanceof CalcError) return typeN;
  const tails = Math.trunc(tailsN), type = Math.trunc(typeN);
  if ((tails !== 1 && tails !== 2) || type < 1 || type > 3) return ERR.NUM;
  let t: number, df: number;
  if (type === 1) {
    const pr = numericPairs(args[0] as Value, args[1] as Value, ctx);
    if (pr instanceof CalcError) return pr;
    const d = pr[0].map((x, i) => x - pr[1][i]!);
    const n = d.length;
    if (n < 2) return ERR.DIV0;
    const sd = Math.sqrt(variance(d, true));
    if (sd === 0) return ERR.DIV0;
    t = mean(d) / (sd / Math.sqrt(n));
    df = n - 1;
  } else {
    const xs = dataNums(args[0] as Value, ctx), ys = dataNums(args[1] as Value, ctx);
    if (xs instanceof CalcError) return xs;
    if (ys instanceof CalcError) return ys;
    const n1 = xs.length, n2 = ys.length;
    if (n1 < 2 || n2 < 2) return ERR.DIV0;
    const v1 = variance(xs, true), v2 = variance(ys, true);
    const m1 = mean(xs), m2 = mean(ys);
    if (type === 2) {
      df = n1 + n2 - 2;
      const sp = ((n1 - 1) * v1 + (n2 - 1) * v2) / df;
      const se = Math.sqrt(sp * (1 / n1 + 1 / n2));
      if (se === 0) return ERR.DIV0;
      t = (m1 - m2) / se;
    } else {
      const a = v1 / n1, b = v2 / n2;
      if (a + b === 0) return ERR.DIV0;
      t = (m1 - m2) / Math.sqrt(a + b);
      df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
    }
  }
  return num(tails * tUpper(Math.abs(t), df));
}

function fTest(args: readonly unknown[], ctx: FnContext): Value {
  const xs = dataNums(args[0] as Value, ctx), ys = dataNums(args[1] as Value, ctx);
  if (xs instanceof CalcError) return xs;
  if (ys instanceof CalcError) return ys;
  if (xs.length < 2 || ys.length < 2) return ERR.DIV0;
  const v1 = variance(xs, true), v2 = variance(ys, true);
  if (v1 === 0 || v2 === 0) return ERR.DIV0;
  const f = v1 / v2, d1 = xs.length - 1, d2 = ys.length - 1;
  const p = fCdf(f, d1, d2, f <= 1);
  return num(Math.min(2 * p, 1));
}

function chisqTest(args: readonly unknown[], ctx: FnContext): Value {
  const a = args[0] as Value, e = args[1] as Value;
  const dims = (v: Value): [number, number] => v instanceof RefValue && v.single ? [v.single.r2 - v.single.r1 + 1, v.single.c2 - v.single.c1 + 1] : v instanceof ArrayValue ? [v.rows, v.cols] : [1, 1];
  if ((a instanceof RefValue && a.areas.length !== 1) || (e instanceof RefValue && e.areas.length !== 1)) return ERR.VALUE;
  const [r, c] = dims(a), [r2, c2] = dims(e);
  if (r !== r2 || c !== c2) return ERR.NA;
  let chi = 0;
  const err = zipCells(a, e, ctx, (x, y) => {
    if (x instanceof CalcError) return x;
    if (y instanceof CalcError) return y;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    if (y === 0) return ERR.DIV0;
    chi += (x - y) ** 2 / y;
  });
  if (err) return err;
  const df = r > 1 && c > 1 ? (r - 1) * (c - 1) : r * c - 1;
  if (df < 1) return ERR.NA;
  return num(pgamma(chi / 2, df / 2, false));
}

register(
  ...(['Z.TEST', 'ZTEST'] as const).map((name): FnDef => ({
    name, prefix: name === 'ZTEST' ? undefined : X, minArgs: 2, maxArgs: 3, args: (i) => (i === 0 ? 'any' : 'value'), lift: true, call: zTest,
  })),
  ...(['T.TEST', 'TTEST'] as const).map((name): FnDef => ({
    name, prefix: name === 'TTEST' ? undefined : X, minArgs: 4, maxArgs: 4, args: (i) => (i < 2 ? 'any' : 'value'), lift: true, call: tTest,
  })),
  ...(['F.TEST', 'FTEST'] as const).map((name): FnDef => ({
    name, prefix: name === 'FTEST' ? undefined : X, minArgs: 2, maxArgs: 2, args: 'any', call: fTest,
  })),
  ...(['CHISQ.TEST', 'CHITEST'] as const).map((name): FnDef => ({
    name, prefix: name === 'CHITEST' ? undefined : X, minArgs: 2, maxArgs: 2, args: 'any', call: chisqTest,
  })),
);
