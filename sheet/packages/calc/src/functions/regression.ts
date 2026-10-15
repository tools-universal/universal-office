/**
 * Correlação e regressão: CORREL, PEARSON, RSQ, SLOPE, INTERCEPT, STEYX, COVAR,
 * COVARIANCE.P/.S, FORECAST(.LINEAR), LINEST, LOGEST, TREND, GROWTH.
 * Dono: agente FN-STAT.
 *
 * Medido (Excel 365): as funções de pares usam só as posições em que os dois
 * valores são números; tamanhos diferentes → #N/A; somas em duas passadas
 * (médias, depois Σ(x−x̄)(y−ȳ)) — SLOPE/INTERCEPT/STEYX/COVAR batem em 100%.
 * LINEST/LOGEST: mínimos quadrados por QR (Householder) sobre os dados
 * centrados quando há constante; coluna colinear → coeficiente 0 e erro 0.
 */
import { register, type FnContext } from '../fn.js';
import { argNumber, num, xlAdd } from '../stats.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

const X = '_xlfn.';

/** Matriz de valores de um argumento (referência de uma área, matriz ou escalar). */
function gridOf(v: Value, ctx: FnContext): ArrayValue | CalcError {
  if (v instanceof RefValue) {
    if (v.areas.length !== 1) return ERR.VALUE;
    return ctx.values(v);
  }
  if (v instanceof ArrayValue) return v;
  if (v instanceof LambdaValue) return ERR.VALUE;
  return new ArrayValue(1, 1, [v]);
}

/** Pares numéricos (x, y) na mesma posição; tamanhos diferentes → #N/A; erro propaga. */
function pairs(xv: Value, yv: Value, ctx: FnContext): [number[], number[]] | CalcError {
  // duas referências grandes (colunas inteiras): só as células existentes, na ordem
  if (xv instanceof RefValue && yv instanceof RefValue && xv.single && yv.single) {
    const ax = xv.single, ay = yv.single;
    const size = (r: typeof ax): number => (r.r2 - r.r1 + 1) * (r.c2 - r.c1 + 1);
    if (size(ax) > 65536 && size(ay) > 65536) {
      if (size(ax) !== size(ay)) return ERR.NA;
      const w = ax.c2 - ax.c1 + 1, wy = ay.c2 - ay.c1 + 1;
      const xm = new Map<number, Scalar>();
      let err: CalcError | undefined;
      ctx.forEachCell(ax, (v, r, c) => { if (v !== null) xm.set((r - ax.r1) * w + (c - ax.c1), v); });
      const ym = new Map<number, Scalar>();
      ctx.forEachCell(ay, (v, r, c) => { if (v !== null) ym.set((r - ay.r1) * wy + (c - ay.c1), v); });
      const keys = [...new Set([...xm.keys(), ...ym.keys()])].sort((p, q) => p - q);
      const xs: number[] = [], ys: number[] = [];
      for (const k of keys) {
        const a2 = xm.get(k) ?? null, b2 = ym.get(k) ?? null;
        if (a2 instanceof CalcError) { err = a2; break; }
        if (b2 instanceof CalcError) { err = b2; break; }
        if (typeof a2 === 'number' && typeof b2 === 'number') { xs.push(a2); ys.push(b2); }
      }
      return err ?? [xs, ys];
    }
  }
  const gx = gridOf(xv, ctx), gy = gridOf(yv, ctx);
  if (gx instanceof CalcError) return gx;
  if (gy instanceof CalcError) return gy;
  if (gx.data.length !== gy.data.length) return ERR.NA;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < gx.data.length; i++) {
    const a = gx.data[i]!, b = gy.data[i]!;
    if (a instanceof CalcError) return a;
    if (b instanceof CalcError) return b;
    if (typeof a === 'number' && typeof b === 'number') { xs.push(a); ys.push(b); }
  }
  return [xs, ys];
}

interface Moments { n: number; mx: number; my: number; sxx: number; syy: number; sxy: number }

/** Médias e somas de quadrados/produtos em duas passadas (soma do Excel). */
function moments(xs: readonly number[], ys: readonly number[]): Moments {
  const n = xs.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx = xlAdd(sx, xs[i]!); sy = xlAdd(sy, ys[i]!); }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx, dy = ys[i]! - my;
    sxx = xlAdd(sxx, dx * dx); syy = xlAdd(syy, dy * dy); sxy = xlAdd(sxy, dx * dy);
  }
  return { n, mx, my, sxx, syy, sxy };
}

type PairFn = (m: Moments) => Value;

/** Função de pares (x, y) com a ordem de argumentos do Excel. */
function pairFn(name: string, f: PairFn, yFirst: boolean, minN: number, prefix?: string) {
  return {
    name, prefix, minArgs: 2, maxArgs: 2, args: 'any' as const,
    call: (args: readonly unknown[], ctx: FnContext): Value => {
      const [a, b] = args as [Value, Value];
      const p = yFirst ? pairs(b, a, ctx) : pairs(a, b, ctx);
      if (p instanceof CalcError) return p;
      if (p[0].length < minN) return ERR.DIV0;
      return f(moments(p[0], p[1]));
    },
  };
}

/** CORREL/PEARSON = cov.P / (σx·σy) com as raízes separadas (medido: 36/36 bit a bit). */
const correl: PairFn = (m) => (m.sxx === 0 || m.syy === 0 ? ERR.DIV0 : num((m.sxy / m.n) / (Math.sqrt(m.sxx / m.n) * Math.sqrt(m.syy / m.n))));
/** RSQ = (cov.S / (sx·sy))² — com os divisores n − 1 (medido: 36/36 bit a bit). */
const rsq: PairFn = (m) => {
  if (m.sxx === 0 || m.syy === 0) return ERR.DIV0;
  const d = m.n - 1;
  const r = (m.sxy / d) / (Math.sqrt(m.sxx / d) * Math.sqrt(m.syy / d));
  return num(r * r);
};

register(
  pairFn('CORREL', correl, false, 1),
  pairFn('PEARSON', correl, false, 1),
  pairFn('RSQ', rsq, true, 1),
  pairFn('SLOPE', (m) => (m.sxx === 0 ? ERR.DIV0 : num(m.sxy / m.sxx)), true, 1),
  pairFn('INTERCEPT', (m) => (m.sxx === 0 ? ERR.DIV0 : num(m.my - m.sxy / m.sxx * m.mx)), true, 1),
  pairFn('STEYX', (m) => (m.n < 3 || m.sxx === 0 ? ERR.DIV0 : num(Math.sqrt((m.syy - m.sxy * m.sxy / m.sxx) / (m.n - 2)))), true, 1),
  pairFn('COVAR', (m) => num(m.sxy / m.n), false, 1),
  pairFn('COVARIANCE.P', (m) => num(m.sxy / m.n), false, 1, X),
  pairFn('COVARIANCE.S', (m) => (m.n < 2 ? ERR.DIV0 : num(m.sxy / (m.n - 1))), false, 1, X),
  ...(['FORECAST', 'FORECAST.LINEAR'] as const).map((name) => ({
    name, prefix: name === 'FORECAST' ? undefined : X, minArgs: 3, maxArgs: 3, args: (i: number) => (i === 0 ? 'value' as const : 'any' as const), lift: true,
    call: (args: readonly unknown[], ctx: FnContext): Value => {
      const x0 = argNumber(args[0] as Scalar, ctx);
      if (x0 instanceof CalcError) return x0;
      const p = pairs(args[2] as Value, args[1] as Value, ctx);
      if (p instanceof CalcError) return p;
      if (!p[0].length) return ERR.DIV0;
      const m = moments(p[0], p[1]);
      if (m.sxx === 0) return ERR.DIV0;
      const b = m.sxy / m.sxx;
      return num(m.my - b * m.mx + b * x0);
    },
  })),
);

// ---------------------------------------------------------------------------
// LINEST / LOGEST / TREND / GROWTH

/** Dados numéricos de uma matriz (texto/vazio/booleano e também erro → #VALUE!, medido). */
function numericGrid(v: Value, ctx: FnContext): { rows: number; cols: number; data: number[] } | CalcError {
  const g = gridOf(v, ctx);
  if (g instanceof CalcError) return g;
  const data: number[] = [];
  for (const x of g.data) {
    if (typeof x !== 'number') return ERR.VALUE;
    data.push(x);
  }
  return { rows: g.rows, cols: g.cols, data };
}

interface Fit {
  /** Coeficientes por variável (na ordem das colunas de X) e constante. */
  coef: number[];
  b: number;
  /** Variável removida por colinearidade. */
  dropped: boolean[];
  se: number[];
  seB: number;
  r2: number;
  sey: number;
  F: number;
  df: number;
  ssreg: number;
  ssresid: number;
}

/**
 * Mínimos quadrados y ≈ Xβ (+ b) por Householder; com constante, X e y centrados.
 * Coluna cuja norma residual some (≤ 1e−12 da original) é colinear → β = 0.
 */
function leastSquares(y: number[], Xcols: number[][], withConst: boolean): Fit | CalcError {
  const n = y.length, k = Xcols.length;
  const means = Xcols.map((c) => (withConst ? c.reduce((s, v) => s + v, 0) / n : 0));
  const ym = withConst ? y.reduce((s, v) => s + v, 0) / n : 0;
  const A = Xcols.map((c, j) => c.map((v) => v - means[j]!));
  const r = y.map((v) => v - ym);
  const R: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const dropped = new Array<boolean>(k).fill(false);
  const order: number[] = [];
  const origNorm = A.map((c) => Math.sqrt(c.reduce((t, v) => t + v * v, 0)));
  const left = new Set<number>(Array.from({ length: k }, (_, j) => j));
  let row = 0;
  // Householder com pivotamento de colunas (maior norma residual primeiro) — medido:
  // de G e H = 2G+1 o Excel fica com H; coluna colinear (norma residual ~0) sai com β = 0
  while (left.size && row < n) {
    let best = -1, bestNorm = -1;
    for (const j of left) {
      let t = 0;
      for (let i = row; i < n; i++) t += A[j]![i]! * A[j]![i]!;
      // empate (dentro do arredondamento): fica a coluna mais à direita (medido: de I e
      // J = G + I, com H já escolhida, o Excel fica com J)
      if (t > bestNorm * (1 + 1e-9) || (best >= 0 && t >= bestNorm * (1 - 1e-9) && j > best)) { bestNorm = Math.max(t, bestNorm); best = j; }
    }
    const norm = Math.sqrt(bestNorm);
    if (!(norm > 1e-12 * origNorm[best]!) || norm === 0) break;
    left.delete(best);
    const col = A[best]!;
    const alpha = col[row]! > 0 ? -norm : norm;
    const v = new Array<number>(n).fill(0);
    for (let i = row; i < n; i++) v[i] = col[i]!;
    v[row]! -= alpha;
    let vv = 0;
    for (let i = row; i < n; i++) vv += v[i]! * v[i]!;
    const apply = (c: number[]): void => {
      if (vv === 0) return;
      let d = 0;
      for (let i = row; i < n; i++) d += v[i]! * c[i]!;
      const f = 2 * d / vv;
      for (let i = row; i < n; i++) c[i]! -= f * v[i]!;
    };
    apply(col);
    for (const j of left) apply(A[j]!);
    apply(r);
    order.push(best);
    for (let jj = 0; jj < k; jj++) R[order.length - 1]![jj] = A[jj]![row]!;
    row++;
  }
  for (const j of left) dropped[j] = true;
  const p = order.length;
  // resolve R β = Qᵀy (triangular, só colunas mantidas)
  const coef = new Array<number>(k).fill(0);
  for (let ii = p - 1; ii >= 0; ii--) {
    const j = order[ii]!;
    let s = r[ii]!;
    for (let t = ii + 1; t < p; t++) s -= R[ii]![order[t]!]! * coef[order[t]!]!;
    coef[j] = s / R[ii]![j]!;
  }
  // soma dos quadrados total (centrada com constante) e dos resíduos (cauda de Qᵀy);
  // medido: ssreg = sstot − ssresid; ajuste perfeito → ssresid 0, erros 0, F #NUM!
  let sstot = 0;
  for (const v of y) sstot += (v - ym) * (v - ym);
  let ssresid = 0;
  for (let i = p; i < n; i++) ssresid += r[i]! * r[i]!;
  if (ssresid <= sstot * 1e-30) ssresid = 0;
  const ssreg = sstot - ssresid;
  const b = withConst ? ym - coef.reduce((s, c, j) => s + c * means[j]!, 0) : 0;
  const df = n - p - (withConst ? 1 : 0);
  const sey = df > 0 ? Math.sqrt(ssresid / df) : 0;
  const r2 = sstot === 0 ? NaN : ssreg / sstot;
  const F = df > 0 && p > 0 && ssresid > 0 ? (ssreg / p) / (ssresid / df) : NaN;
  // (RᵀR)⁻¹ das colunas mantidas: inversa de R (triangular)
  const Rinv: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = p - 1; i >= 0; i--) {
    Rinv[i]![i] = 1 / R[i]![order[i]!]!;
    for (let j2 = i + 1; j2 < p; j2++) {
      let s = 0;
      for (let t = i + 1; t <= j2; t++) s += R[i]![order[t]!]! * Rinv[t]![j2]!;
      Rinv[i]![j2] = -s / R[i]![order[i]!]!;
    }
  }
  const cov = (a: number, c: number): number => { let s = 0; for (let t = 0; t < p; t++) s += Rinv[a]![t]! * Rinv[c]![t]!; return s; };
  const se = new Array<number>(k).fill(0);
  for (let ii = 0; ii < p; ii++) se[order[ii]!] = sey * Math.sqrt(cov(ii, ii));
  let seB = 0;
  if (withConst) {
    let q = 1 / n;
    for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) q += means[order[a]!]! * means[order[c]!]! * cov(a, c);
    seB = sey * Math.sqrt(q);
  }
  return { coef, b, dropped, se, seB, r2, sey, F, df, ssreg, ssresid };
}

/** Prepara y, colunas de X e a orientação a partir dos argumentos do LINEST/TREND. */
function design(yArg: Value, xArg: Value | null, ctx: FnContext, logY: boolean):
  { y: number[]; cols: number[][]; byRow: boolean } | CalcError {
  const yg = numericGrid(yArg, ctx);
  if (yg instanceof CalcError) return yg;
  let y = yg.data;
  if (logY) {
    if (y.some((v) => v <= 0)) return ERR.NUM;
    y = y.map(Math.log);
  }
  const n = y.length;
  const byRow = yg.rows === 1 && yg.cols > 1;
  if (xArg === null || xArg === undefined) return { y, cols: [y.map((_, i) => i + 1)], byRow };
  const xg = numericGrid(xArg, ctx);
  if (xg instanceof CalcError) return xg;
  const cols: number[][] = [];
  if (yg.rows === 1 || yg.cols === 1) {
    // y vetor: X tem as variáveis nas colunas (y coluna) ou nas linhas (y linha)
    if (xg.data.length === n) cols.push(xg.data);
    else if (!byRow && xg.rows === n) for (let c = 0; c < xg.cols; c++) cols.push(Array.from({ length: n }, (_, r) => xg.data[r * xg.cols + c]!));
    else if (byRow && xg.cols === n) for (let r = 0; r < xg.rows; r++) cols.push(xg.data.slice(r * xg.cols, (r + 1) * xg.cols));
    else return ERR.REF;
  } else {
    if (xg.data.length !== n) return ERR.REF;
    cols.push(xg.data);
  }
  return { y, cols, byRow };
}

function constArg(v: unknown, ctx: FnContext): boolean | CalcError {
  if (v === undefined || v === null) return true;
  if (typeof v === 'boolean') return v;
  const n = argNumber(v as Scalar, ctx);
  return n instanceof CalcError ? n : n !== 0;
}

function linestFn(args: readonly unknown[], ctx: FnContext, logY: boolean): Value {
  const withConst = constArg(args[2], ctx);
  if (withConst instanceof CalcError) return withConst;
  const stats = args[3] === undefined || args[3] === null ? false : constArg(args[3], ctx);
  if (stats instanceof CalcError) return stats;
  const d = design(args[0] as Value, (args[1] ?? null) as Value | null, ctx, logY);
  if (d instanceof CalcError) return d;
  const fit = leastSquares(d.y, d.cols, withConst);
  if (fit instanceof CalcError) return fit;
  const k = d.cols.length;
  const tr = (x: number): number => (logY ? Math.exp(x) : x);
  const first: Scalar[] = [];
  for (let j = k - 1; j >= 0; j--) first.push(tr(fit.coef[j]!));
  first.push(withConst ? tr(fit.b) : logY ? 1 : 0);
  if (!stats) return new ArrayValue(1, k + 1, first.map((v) => (typeof v === 'number' ? num(v) : v)));
  const w = k + 1;
  const rows: Scalar[][] = [first];
  const seRow: Scalar[] = [];
  for (let j = k - 1; j >= 0; j--) seRow.push(fit.se[j]!);
  seRow.push(withConst ? fit.seB : ERR.NA);
  rows.push(seRow);
  const fill = (a: Scalar, b: Scalar): Scalar[] => [a, b, ...new Array<Scalar>(w - 2).fill(ERR.NA)];
  rows.push(fill(fit.r2, fit.sey));
  rows.push(fill(fit.F, fit.df));
  rows.push(fill(fit.ssreg, fit.ssresid));
  return ArrayValue.fill(5, w, (r, c) => {
    const v = rows[r]![c] ?? ERR.NA;
    return typeof v === 'number' ? num(v) : v;
  });
}

function trendFn(args: readonly unknown[], ctx: FnContext, logY: boolean): Value {
  const withConst = constArg(args[3], ctx);
  if (withConst instanceof CalcError) return withConst;
  const d = design(args[0] as Value, (args[1] ?? null) as Value | null, ctx, logY);
  if (d instanceof CalcError) return d;
  const fit = leastSquares(d.y, d.cols, withConst);
  if (fit instanceof CalcError) return fit;
  const k = d.cols.length;
  // novos x: padrão = os conhecidos
  let newCols: number[][], outRows: number, outCols: number;
  const newArg = args[2] as Value | undefined;
  if (newArg === undefined || newArg === null) {
    newCols = d.cols;
    const yg = gridOf(args[0] as Value, ctx) as ArrayValue;
    outRows = yg.rows; outCols = yg.cols;
  } else {
    const ng = numericGrid(newArg, ctx);
    if (ng instanceof CalcError) return ng;
    if (k === 1) { newCols = [ng.data]; outRows = ng.rows; outCols = ng.cols; }
    else if (!d.byRow) {
      if (ng.cols !== k) return ERR.REF;
      newCols = Array.from({ length: k }, (_, c) => Array.from({ length: ng.rows }, (_, r) => ng.data[r * ng.cols + c]!));
      outRows = ng.rows; outCols = 1;
    } else {
      if (ng.rows !== k) return ERR.REF;
      newCols = Array.from({ length: k }, (_, r) => ng.data.slice(r * ng.cols, (r + 1) * ng.cols));
      outRows = 1; outCols = ng.cols;
    }
  }
  const m = newCols[0]!.length;
  const pred: number[] = [];
  for (let i = 0; i < m; i++) {
    let s = withConst ? fit.b : 0;
    for (let j = 0; j < k; j++) s += fit.coef[j]! * newCols[j]![i]!;
    pred.push(logY ? Math.exp(s) : s);
  }
  return ArrayValue.fill(outRows, outCols, (r, c) => num(pred[r * outCols + c]!));
}

register(
  { name: 'LINEST', minArgs: 1, maxArgs: 4, args: (i) => (i < 2 ? 'any' : 'value'), call: (a, c) => linestFn(a, c, false) },
  { name: 'LOGEST', minArgs: 1, maxArgs: 4, args: (i) => (i < 2 ? 'any' : 'value'), call: (a, c) => linestFn(a, c, true) },
  { name: 'TREND', minArgs: 1, maxArgs: 4, args: (i) => (i < 3 ? 'any' : 'value'), call: (a, c) => trendFn(a, c, false) },
  { name: 'GROWTH', minArgs: 1, maxArgs: 4, args: (i) => (i < 3 ? 'any' : 'value'), call: (a, c) => trendFn(a, c, true) },
);
