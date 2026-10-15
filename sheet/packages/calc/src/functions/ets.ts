/**
 * FORECAST.ETS, FORECAST.ETS.CONFINT, FORECAST.ETS.SEASONALITY, FORECAST.ETS.STAT —
 * suavização exponencial tripla aditiva (ETS AAA, Holt-Winters aditivo).
 * Dono: agente FN-STAT.
 *
 * O Excel não documenta a inicialização nem o otimizador; aqui: linha do tempo
 * ordenada com passo constante (o menor passo positivo; pontos que faltam até 30%
 * completados por interpolação ou zero), duplicatas agregadas, sazonalidade
 * detectada pela autocorrelação, estados iniciais pela 1ª temporada e α, β, γ em
 * [0,001; 0,999] minimizando a soma dos quadrados dos erros de um passo. Medido:
 * séries exatas (linha reta, sazonal perfeita) dão a previsão exata e erros 0 como
 * no Excel; parâmetros e erros de séries ruidosas diferem (ver stat-ets.known.json).
 */
import { register, type FnContext } from '../fn.js';
import { argNumber, num, zipCells } from '../stats.js';
import { qnorm } from '../special-functions.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

const X = '_xlfn.';

interface Series { y: number[]; t0: number; step: number }

const AGG: Record<number, (xs: number[]) => number> = {
  1: (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
  2: (xs) => xs.length, 3: (xs) => xs.length,
  4: (xs) => Math.max(...xs),
  5: (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2; },
  6: (xs) => Math.min(...xs),
  7: (xs) => xs.reduce((a, b) => a + b, 0),
};

/** Série regular (passo constante) a partir de valores e linha do tempo. */
function buildSeries(valuesV: Value, timelineV: Value, completion: number, aggregation: number, ctx: FnContext): Series | CalcError {
  const pts = new Map<number, number[]>();
  const err = zipCells(timelineV, valuesV, ctx, (t, v) => {
    if (t instanceof CalcError) return t;
    if (v instanceof CalcError) return v;
    // medido: texto/vazio na linha do tempo ou nos valores = ponto que falta
    if (typeof t !== 'number' || typeof v !== 'number') return;
    const list = pts.get(t);
    if (list) list.push(v); else pts.set(t, [v]);
  });
  if (err) return err;
  const keys = [...pts.keys()].sort((a, b) => a - b);
  if (keys.length < 3) return ERR.NUM;
  // passo = a diferença mais frequente (medido: um ponto fora do passo não dá #NUM!)
  const freq = new Map<number, number>();
  for (let i = 1; i < keys.length; i++) { const d = keys[i]! - keys[i - 1]!; freq.set(d, (freq.get(d) ?? 0) + 1); }
  let step = 0, bestF = 0;
  for (const [d, f] of freq) if (f > bestF || (f === bestF && d < step)) { bestF = f; step = d; }
  if (!(step > 0)) return ERR.NUM;
  const agg = AGG[aggregation]!;
  const t0 = keys[0]!;
  const n = Math.round((keys[keys.length - 1]! - t0) / step) + 1;
  const y: (number | undefined)[] = new Array(n).fill(undefined);
  const byIdx = new Map<number, number[]>();
  for (const k of keys) {
    const idx = Math.round((k - t0) / step);
    const list = byIdx.get(idx);
    if (list) list.push(...pts.get(k)!); else byIdx.set(idx, [...pts.get(k)!]);
  }
  for (const [idx, list] of byIdx) y[idx] = agg(list);
  const missing = y.filter((v) => v === undefined).length;
  if (missing > 0.3 * n) return ERR.NUM;
  for (let i = 0; i < n; i++) {
    if (y[i] !== undefined) continue;
    if (!completion) { y[i] = 0; continue; }
    let a = i - 1; while (a >= 0 && y[a] === undefined) a--;
    let b = i + 1; while (b < n && y[b] === undefined) b++;
    const ya = a >= 0 ? y[a]! : y[b]!, yb = b < n ? y[b]! : ya;
    y[i] = a >= 0 && b < n ? ya + (yb - ya) * (i - a) / (b - a) : ya;
  }
  return { y: y as number[], t0, step };
}

/** Sazonalidade pela autocorrelação da série sem tendência (0 = nenhuma). */
function detectSeason(y: readonly number[]): number {
  const n = y.length;
  // tira a tendência linear
  const tm = (n - 1) / 2, ym = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (i - tm) * (y[i]! - ym); sxx += (i - tm) ** 2; }
  const b = sxx ? sxy / sxx : 0;
  const r = y.map((v, i) => v - ym - b * (i - tm));
  const var0 = r.reduce((s, v) => s + v * v, 0);
  if (var0 <= 1e-12 * (ym * ym * n + 1e-300)) return 0;
  let best = 0, bestAcf = 0.5;
  for (let m = 2; m <= Math.floor(n / 2); m++) {
    let c = 0;
    for (let i = m; i < n; i++) c += r[i]! * r[i - m]!;
    const acf = c / var0;
    if (acf > bestAcf + 1e-12) { bestAcf = acf; best = m; }
  }
  return best;
}

interface Fit { alpha: number; beta: number; gamma: number; sse: number; errs: number[]; fitted: number[]; l: number; b: number; s: number[] }

/** Holt-Winters aditivo (ETS AAA) com estados iniciais pela 1ª temporada. */
function run(y: readonly number[], m: number, alpha: number, beta: number, gamma: number): Fit {
  const n = y.length;
  let l: number, b: number;
  const s: number[] = [];
  if (m >= 2 && n >= 2 * m) {
    const mean = (a: number, c: number): number => { let t = 0; for (let i = a; i < c; i++) t += y[i]!; return t / (c - a); };
    const m1 = mean(0, m), m2 = mean(m, 2 * m);
    b = (m2 - m1) / m;
    l = m1 - b * (m - 1) / 2;
    for (let i = 0; i < m; i++) s.push(y[i]! - (l + b * i));
    l = l - b; // nível "antes" do 1º ponto
  } else {
    l = y[0]!; b = n > 1 ? y[1]! - y[0]! : 0; l -= b;
  }
  const errs: number[] = [], fitted: number[] = [];
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const si = m >= 2 && s.length ? s[i % m]! : 0;
    const f = l + b + si;
    const e = y[i]! - f;
    fitted.push(f); errs.push(e); sse += e * e;
    const ln = l + b + alpha * e;
    b = b + alpha * beta * e;
    if (m >= 2 && s.length) s[i % m] = si + gamma * e;
    l = ln;
  }
  // devolve as sazonalidades na ordem do próximo índice
  return { alpha, beta, gamma, sse, errs, fitted, l, b, s: s.length ? s.map((_, k) => s[(n + k) % m]!) : [] };
}

/** α, β, γ que minimizam a soma dos quadrados (busca em grade com refino). */
function fit(y: readonly number[], m: number): Fit {
  const lo = 0.001, hi = 0.999;
  const seasonal = m >= 2;
  let best = run(y, m, 0.5, 0.1, seasonal ? 0.1 : 0);
  const tryP = (a: number, b: number, g: number): void => {
    const f = run(y, m, a, b, g);
    if (f.sse < best.sse - 1e-12 * best.sse) best = f;
  };
  const grid = (c: number, w: number, k: number): number[] => {
    const out: number[] = [];
    for (let i = -k; i <= k; i++) out.push(Math.min(hi, Math.max(lo, c + i * w)));
    return [...new Set(out)];
  };
  let w = 0.1;
  for (let round = 0; round < 4; round++) {
    const as = grid(best.alpha, w, 5), bs = grid(best.beta, w, 5), gs = seasonal ? grid(best.gamma, w, 5) : [0];
    for (const a of as) for (const b of bs) for (const g of gs) tryP(a, b, g);
    w /= 10;
  }
  return best;
}

interface Prepared { series: Series; m: number; model: Fit }

function prepare(args: readonly unknown[], valuesIdx: number, seasonIdx: number, ctx: FnContext): Prepared | CalcError {
  const opt = (i: number, d: number): number | CalcError => {
    const v = args[i] as Scalar | undefined;
    if (v === undefined || v === null) return d;
    const n = argNumber(v, ctx);
    return n instanceof CalcError ? n : Math.trunc(n);
  };
  const season = opt(seasonIdx, 1);
  if (season instanceof CalcError) return season;
  const completion = opt(seasonIdx + 1, 1);
  if (completion instanceof CalcError) return completion;
  const aggregation = opt(seasonIdx + 2, 1);
  if (aggregation instanceof CalcError) return aggregation;
  if (season < 0 || season > 8760 || (completion !== 0 && completion !== 1) || aggregation < 1 || aggregation > 7) return ERR.NUM;
  const series = buildSeries(args[valuesIdx] as Value, args[valuesIdx + 1] as Value, completion, aggregation, ctx);
  if (series instanceof CalcError) return series;
  const m = season === 1 ? detectSeason(series.y) : season;
  if (m >= series.y.length) return ERR.NUM;
  return { series, m, model: fit(series.y, m) };
}

/** Previsão h passos à frente (h ≥ 1; fracionário interpola entre os passos). */
function forecastAt(p: Prepared, h: number): number {
  const at = (k: number): number => {
    const { l, b, s } = p.model;
    return l + k * b + (s.length ? s[(k - 1) % p.m]! : 0);
  };
  const k = Math.floor(h);
  if (k === h || k < 1) return at(Math.max(1, Math.ceil(h)));
  return at(k) + (at(k + 1) - at(k)) * (h - k);
}

/** Passos à frente do último ponto (≤ 0: dentro do histórico). */
function stepsAhead(p: Prepared, target: number): number {
  const last = p.series.t0 + (p.series.y.length - 1) * p.series.step;
  return (target - last) / p.series.step;
}

/** Valor no alvo: à frente, a previsão; dentro do histórico, o ajuste de um passo (medido). */
function valueAt(p: Prepared, h: number): number | CalcError {
  if (h > 0) return forecastAt(p, h);
  const idx = Math.round(p.series.y.length - 1 + h);
  if (idx < 0) return ERR.NUM;
  return p.model.fitted[idx]!;
}

register(
  {
    name: 'FORECAST.ETS', prefix: X, minArgs: 3, maxArgs: 6, args: (i) => (i === 1 || i === 2 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => {
      const t = argNumber(args[0] as Scalar, ctx);
      if (t instanceof CalcError) return t;
      const p = prepare(args, 1, 3, ctx);
      if (p instanceof CalcError) return p;
      const v = valueAt(p, stepsAhead(p, t));
      return v instanceof CalcError ? v : num(v);
    },
  },
  {
    name: 'FORECAST.ETS.CONFINT', prefix: X, minArgs: 3, maxArgs: 7, args: (i) => (i === 1 || i === 2 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => {
      const t = argNumber(args[0] as Scalar, ctx);
      if (t instanceof CalcError) return t;
      let conf = 0.95;
      if (args[3] !== undefined && args[3] !== null) {
        const c = argNumber(args[3] as Scalar, ctx);
        if (c instanceof CalcError) return c;
        if (c <= 0 || c >= 1) return ERR.NUM;
        conf = c;
      }
      const p = prepare(args, 1, 4, ctx);
      if (p instanceof CalcError) return p;
      const h = Math.max(1, stepsAhead(p, t));
      const n = p.series.y.length;
      const sigma2 = p.model.sse / n;
      const { alpha, beta, gamma } = p.model;
      let v = 1;
      for (let j = 1; j < Math.ceil(h); j++) {
        const c = alpha * (1 + j * beta) + (p.m >= 2 && j % p.m === 0 ? gamma : 0);
        v += c * c;
      }
      return num(qnorm(0.5 + conf / 2) * Math.sqrt(sigma2 * v));
    },
  },
  {
    name: 'FORECAST.ETS.SEASONALITY', prefix: X, minArgs: 2, maxArgs: 4, args: (i) => (i < 2 ? 'any' : 'value'),
    call: (args, ctx) => {
      const p = prepare([args[0], args[1], null, args[2], args[3]], 0, 2, ctx);
      return p instanceof CalcError ? p : p.m;
    },
  },
  {
    name: 'FORECAST.ETS.STAT', prefix: X, minArgs: 3, maxArgs: 6, args: (i) => (i < 2 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => {
      const st = argNumber(args[2] as Scalar, ctx);
      if (st instanceof CalcError) return st;
      const k = Math.trunc(st);
      if (k < 1 || k > 8) return ERR.NUM;
      const p = prepare([args[0], args[1], null, args[3], args[4], args[5]], 0, 3, ctx);
      if (p instanceof CalcError) return p;
      const { errs, fitted } = p.model;
      const y = p.series.y, n = y.length;
      switch (k) {
        case 1: return p.model.alpha;
        case 2: return p.model.beta;
        case 3: return p.m >= 2 ? p.model.gamma : Number.EPSILON;
        case 4: {
          const m = p.m >= 2 ? p.m : 1;
          let d = 0;
          for (let i = m; i < n; i++) d += Math.abs(y[i]! - y[i - m]!);
          d /= n - m;
          const mae = errs.reduce((s, e) => s + Math.abs(e), 0) / n;
          return d ? num(mae / d) : 0;
        }
        case 5: return num(errs.reduce((s, e, i) => { const den = (Math.abs(y[i]!) + Math.abs(fitted[i]!)) / 2; return s + (den ? Math.abs(e) / den : 0); }, 0) / n);
        case 6: return num(errs.reduce((s, e) => s + Math.abs(e), 0) / n);
        case 7: return num(Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / n));
        default: return p.series.step;
      }
    },
  },
);
