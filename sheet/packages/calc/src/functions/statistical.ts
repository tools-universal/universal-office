/**
 * Estatísticas (AVERAGE*, COUNT*, MAX/MIN*, MEDIAN, MODE*, STDEV*, VAR*, PERCENTILE*, QUARTILE*, RANK*, LARGE/SMALL, CORREL, FORECAST*, LINEST/LOGEST/TREND/GROWTH, distribuições e inversas, *IF/*IFS, SUBTOTAL, AGGREGATE…).
 * Dono: agente FN-STAT.
 *
 * Regras medidas no Excel 365 (oráculo pt-BR):
 * - referência: só números contam (texto, booleano e vazio são ignorados); erro propaga;
 * - matriz: idem (AVERAGEA é a exceção: texto em matriz conta 0, booleano é ignorado);
 * - argumento direto: texto-número e booleano convertem; texto não numérico → #VALUE!;
 * - versões *A: em referência texto = 0 e booleano = 1/0;
 * - o 1º erro é o da esquerda para a direita, e numa área linha a linha.
 */
import { register, type FnContext, type FnDef } from '../fn.js';
import { ArrayValue, CalcError, ERR, RefValue, type Scalar, type Value } from '../values.js';
import {
  argInt, argNumber, collectNumbers, devsq, kurt, mean, num, skew, skewP, sorted, variance, xlAdd, xlSum,
  type CollectOptions,
} from '../stats.js';

const X = '_xlfn.';

/** Agregação sobre números já coletados. */
type Agg = (xs: number[]) => Value;

/** Opções de coleta das funções comuns (AVERAGE, MAX, STDEV…). */
const PLAIN: CollectOptions = {};
/** Versões *A (AVERAGEA, MAXA, STDEVA…): texto 0 e booleano 1/0 em referência; matriz só números. */
const A_OPTS: CollectOptions = { refText: 'zero', refBool: 'num' };

/** Máximo de argumentos do Excel: 255 nas antigas, 254 nas de 2010+ (_xlfn., catálogo medido). */
const maxArgsOf = (prefix?: string): number => (prefix ? 254 : 255);

function aggregate(name: string, agg: Agg, opts: CollectOptions = PLAIN, prefix?: string): FnDef {
  return {
    name, prefix, minArgs: 1, maxArgs: maxArgsOf(prefix), args: 'any',
    call: (args, ctx) => {
      const xs = collectNumbers(args, ctx, opts);
      return xs instanceof CalcError ? xs : agg(xs);
    },
  };
}

// --- agregações básicas (reutilizadas por SUBTOTAL/AGGREGATE e D-funções) ------

export const aggAverage: Agg = (xs) => (xs.length ? num(xlSum(xs) / xs.length) : ERR.DIV0);
export const aggMax: Agg = (xs) => { let m = -Infinity; for (const x of xs) if (x > m) m = x; return xs.length ? m : 0; };
export const aggMin: Agg = (xs) => { let m = Infinity; for (const x of xs) if (x < m) m = x; return xs.length ? m : 0; };
export const aggSum: Agg = (xs) => num(xlSum(xs));
export const aggProduct: Agg = (xs) => { if (!xs.length) return 0; let p = 1; for (const x of xs) p *= x; return num(p); };
export const aggCount: Agg = (xs) => xs.length;
export const aggVarS: Agg = (xs) => (xs.length < 2 ? ERR.DIV0 : num(variance(xs, true)));
export const aggVarP: Agg = (xs) => (xs.length < 1 ? ERR.DIV0 : num(variance(xs, false)));
export const aggStdevS: Agg = (xs) => (xs.length < 2 ? ERR.DIV0 : num(Math.sqrt(variance(xs, true))));
export const aggStdevP: Agg = (xs) => (xs.length < 1 ? ERR.DIV0 : num(Math.sqrt(variance(xs, false))));
export const aggMedian: Agg = (xs) => {
  if (!xs.length) return ERR.NUM;
  const s = sorted(xs), n = s.length;
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
};

/** Modas na ordem da 1ª ocorrência (só valores repetidos). */
function modes(xs: readonly number[]): number[] {
  const cnt = new Map<number, number>();
  for (const x of xs) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  let best = 1;
  for (const c of cnt.values()) if (c > best) best = c;
  if (best < 2) return [];
  const out: number[] = [];
  for (const [v, c] of cnt) if (c === best) out.push(v);
  return out;
}
export const aggModeSngl: Agg = (xs) => { const m = modes(xs); return m.length ? m[0]! : ERR.NA; };
const aggModeMult: Agg = (xs) => { const m = modes(xs); return m.length ? ArrayValue.of(m.map((v) => [v])) : ERR.NA; };

const aggDevsq: Agg = (xs) => (xs.length ? num(devsq(xs)) : ERR.NUM);
const aggAvedev: Agg = (xs) => {
  if (!xs.length) return ERR.NUM;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s = xlAdd(s, Math.abs(x - m));
  return num(s / xs.length);
};

/** frexp: x = m·2^e, m em [0,5; 1). */
function frexp(x: number): [number, number] {
  if (x === 0 || !Number.isFinite(x)) return [x, 0];
  let e = Math.ceil(Math.log2(Math.abs(x)));
  let m = x / 2 ** e;
  if (Math.abs(m) >= 1) { m /= 2; e++; }
  if (Math.abs(m) < 0.5) { m *= 2; e--; }
  return [m, e];
}

/** GEOMEAN: produto das mantissas e soma dos expoentes (sem estouro), raiz n-ésima de cada parte. */
const aggGeomean: Agg = (xs) => {
  if (!xs.length) return ERR.NUM;
  let m = 1, e = 0;
  for (const x of xs) {
    if (x <= 0) return ERR.NUM;
    const [mm, ee] = frexp(x);
    m *= mm; e += ee;
    const [m2, e2] = frexp(m);
    m = m2; e += e2;
  }
  const n = xs.length;
  return num(m ** (1 / n) * 2 ** (e / n));
};
const aggHarmean: Agg = (xs) => {
  if (!xs.length) return ERR.NA;
  let s = 0;
  for (const x of xs) { if (x <= 0) return ERR.NUM; s = xlAdd(s, 1 / x); }
  return num(1 / (s / xs.length));
};

/**
 * MODE*: texto direto não numérico é ignorado (=MODE("a";4;4) = 4); argumento
 * omitido e referência de várias áreas dão #VALUE! (medido).
 */
function modeFn(name: string, agg: Agg, prefix?: string): FnDef {
  return {
    name, prefix, minArgs: 1, maxArgs: maxArgsOf(prefix), args: 'any',
    call: (args, ctx) => {
      for (const a of args as Value[]) if (a === null || (a instanceof RefValue && a.areas.length > 1)) return ERR.VALUE;
      const xs = collectNumbers(args, ctx, { directText: 'skip' });
      return xs instanceof CalcError ? xs : agg(xs);
    },
  };
}

register(
  aggregate('AVERAGE', aggAverage),
  aggregate('AVERAGEA', aggAverage, { ...A_OPTS, arrText: 'zero' }),
  aggregate('MAX', aggMax),
  aggregate('MAXA', aggMax, A_OPTS),
  aggregate('MIN', aggMin),
  aggregate('MINA', aggMin, A_OPTS),
  aggregate('MEDIAN', aggMedian),
  modeFn('MODE', aggModeSngl),
  modeFn('MODE.SNGL', aggModeSngl, X),
  modeFn('MODE.MULT', aggModeMult, X),
  aggregate('STDEV', aggStdevS),
  aggregate('STDEV.S', aggStdevS, PLAIN, X),
  aggregate('STDEVA', aggStdevS, A_OPTS),
  aggregate('STDEVP', aggStdevP),
  aggregate('STDEV.P', aggStdevP, PLAIN, X),
  aggregate('STDEVPA', aggStdevP, A_OPTS),
  aggregate('VAR', aggVarS),
  aggregate('VAR.S', aggVarS, PLAIN, X),
  aggregate('VARA', aggVarS, A_OPTS),
  aggregate('VARP', aggVarP),
  aggregate('VAR.P', aggVarP, PLAIN, X),
  aggregate('VARPA', aggVarP, A_OPTS),
  aggregate('DEVSQ', aggDevsq),
  aggregate('AVEDEV', aggAvedev),
  aggregate('KURT', (xs) => kurt(xs)),
  aggregate('SKEW', (xs) => skew(xs)),
  aggregate('SKEW.P', (xs) => skewP(xs), PLAIN, X),
  aggregate('GEOMEAN', aggGeomean),
  aggregate('HARMEAN', aggHarmean),
  // COUNT: conta números (e, diretos, texto-número e booleano); ignora erros
  aggregate('COUNT', aggCount, { errors: 'skip', directText: 'skip' }),
  {
    name: 'COUNTA', minArgs: 1, maxArgs: 255, args: 'any',
    call: (args, ctx) => {
      let n = 0;
      for (const a of args as Value[]) {
        if (a instanceof RefValue) for (const area of a.areas) ctx.forEachCell(area, (v) => { if (v !== null) n++; });
        else if (a instanceof ArrayValue) n += a.data.length;
        else n++;
      }
      return n;
    },
  },
  {
    name: 'COUNTBLANK', minArgs: 1, maxArgs: 1, args: 'ref',
    call: ([r], ctx) => {
      if (!(r instanceof RefValue)) return ERR.VALUE;
      let n = 0;
      for (const area of r.areas) {
        let filled = 0;
        ctx.forEachCell(area, (v) => { if (v !== null && v !== '') filled++; });
        n += (area.r2 - area.r1 + 1) * (area.c2 - area.c1 + 1) - filled;
      }
      return n;
    },
  },
);

// --- ordem: LARGE/SMALL, percentis, quartis, ranking ---------------------------

/** Números (só números) de um argumento matriz/referência; erro propaga. */
function dataOf(a: Value, ctx: FnContext): number[] | CalcError {
  return collectNumbers([a], ctx, PLAIN);
}

/**
 * k-ésimo (1-based) de uma lista ordenada. SMALL trunca k; LARGE(k) = SMALL(n + 1 − k)
 * truncado — LARGE(…;2,2) é o 3º maior de 5 (medido).
 */
function kth(xs: number[] | CalcError, kRaw: Scalar, ctx: FnContext, largest: boolean): Value {
  if (xs instanceof CalcError) return xs;
  const kn = argNumber(kRaw, ctx);
  if (kn instanceof CalcError) return kn;
  const n = xs.length;
  if (!n || kn < 1 || kn > n) return ERR.NUM;
  const k = Math.floor(largest ? n + 1 - kn : kn);
  if (k < 1 || k > n) return ERR.NUM;
  return sorted(xs)[k - 1]!;
}

/** Percentil inclusivo (posição 1-based (n−1)p + 1, interpolação linear — medido). */
export function percentileInc(s: readonly number[], p: number): number {
  const n = s.length;
  const pos = (n - 1) * p + 1;
  const i = Math.floor(pos), f = pos - i;
  return i < n ? s[i - 1]! + f * (s[i]! - s[i - 1]!) : s[n - 1]!;
}

/** Percentil exclusivo (posição (n+1)p); fora de [1, n] → #NUM!. */
export function percentileExc(s: readonly number[], p: number): number | CalcError {
  const n = s.length;
  const pos = p * (n + 1);
  if (pos < 1 || pos > n) return ERR.NUM;
  const i = Math.floor(pos), f = pos - i;
  return i < n ? s[i - 1]! + f * (s[i]! - s[i - 1]!) : s[i - 1]!;
}

function percentileFn(xs: number[] | CalcError, pRaw: Scalar, ctx: FnContext, exc: boolean): Value {
  if (xs instanceof CalcError) return xs;
  const p = argNumber(pRaw, ctx);
  if (p instanceof CalcError) return p;
  if (!xs.length) return ERR.NUM;
  if (exc ? p <= 0 || p >= 1 : p < 0 || p > 1) return ERR.NUM;
  const s = sorted(xs);
  return exc ? percentileExc(s, p) : percentileInc(s, p);
}

function quartileFn(xs: number[] | CalcError, qRaw: Scalar, ctx: FnContext, exc: boolean): Value {
  if (xs instanceof CalcError) return xs;
  const qn = argNumber(qRaw, ctx);
  if (qn instanceof CalcError) return qn;
  const q = Math.trunc(qn);
  if (!xs.length) return ERR.NUM;
  if (exc ? q <= 0 || q >= 4 : q < 0 || q > 4) return ERR.NUM;
  const s = sorted(xs);
  return exc ? percentileExc(s, q / 4) : percentileInc(s, q / 4);
}

/** Trunca x (já nos 15 dígitos do Excel) em `digits` casas decimais (PERCENTRANK arredonda para baixo). */
function truncDigits(x: number, digits: number): number {
  const t = Number(x.toPrecision(15));
  const f = 10 ** digits;
  let y = Math.floor(t * f);
  // t·f pode ficar um ulp abaixo do inteiro (0,57·100 = 56,999…)
  if ((y + 1) / f <= t) y++;
  return y / f;
}

function percentRankFn(xs: number[] | CalcError, xRaw: Scalar, sigRaw: Scalar, ctx: FnContext, exc: boolean): Value {
  if (xs instanceof CalcError) return xs;
  const x = argNumber(xRaw, ctx);
  if (x instanceof CalcError) return x;
  let sig = 3;
  if (sigRaw !== null && sigRaw !== undefined) {
    const s = argNumber(sigRaw, ctx);
    if (s instanceof CalcError) return s;
    sig = Math.trunc(s);
  }
  if (sig < 1) return ERR.NUM;
  if (!xs.length) return ERR.NUM;
  const s = sorted(xs), n = s.length;
  if (x < s[0]! || x > s[n - 1]!) return ERR.NA;
  // posição: quantos são menores; se x não está na lista, interpola entre os vizinhos
  let lo = 0;
  while (lo < n && s[lo]! < x) lo++;
  let rank: number;
  if (lo < n && s[lo] === x) rank = lo;
  else {
    const a = s[lo - 1]!, b = s[lo]!;
    rank = lo - 1 + (x - a) / (b - a);
  }
  let r: number;
  if (exc) r = n === 1 ? 1 : (rank + 1) / (n + 1);
  else r = n === 1 ? 1 : rank / (n - 1);
  return truncDigits(r, sig);
}

function rankFn(xRaw: Scalar, ref: Value, orderRaw: Scalar, ctx: FnContext, avg: boolean): Value {
  const x = argNumber(xRaw, ctx);
  if (x instanceof CalcError) return x;
  if (!(ref instanceof RefValue)) return ERR.VALUE;
  const xs = collectNumbers([ref], ctx, PLAIN);
  if (xs instanceof CalcError) return xs;
  let desc = true;
  if (orderRaw !== null && orderRaw !== undefined) {
    const o = argNumber(orderRaw, ctx);
    if (o instanceof CalcError) return o;
    desc = o === 0;
  }
  let better = 0, same = 0;
  for (const v of xs) {
    if (v === x) same++;
    else if (desc ? v > x : v < x) better++;
  }
  if (!same) return ERR.NA;
  return avg ? better + (same + 1) / 2 : better + 1;
}

/** TRIMMEAN: tira ⌊n·p/2⌋ de cada ponta; soma os que ficam na ordem ORIGINAL (medido). */
function trimmean(xs: number[] | CalcError, pRaw: Scalar, ctx: FnContext): Value {
  if (xs instanceof CalcError) return xs;
  const p = argNumber(pRaw, ctx);
  if (p instanceof CalcError) return p;
  if (p < 0 || p >= 1 || !xs.length) return ERR.NUM;
  const n = xs.length, k = Math.floor(n * p / 2);
  if (!k) return num(xlSum(xs) / n);
  const s = sorted(xs);
  // quantas cópias de cada valor saem (as k menores e as k maiores)
  const drop = new Map<number, number>();
  for (let i = 0; i < k; i++) { drop.set(s[i]!, (drop.get(s[i]!) ?? 0) + 1); drop.set(s[n - 1 - i]!, (drop.get(s[n - 1 - i]!) ?? 0) + 1); }
  let sum = 0;
  for (const x of xs) {
    const d = drop.get(x);
    if (d) { drop.set(x, d - 1); continue; }
    sum = xlAdd(sum, x);
  }
  return num(sum / (n - 2 * k));
}

/** FREQUENCY: contagem por faixa (≤ limite); limites na ordem dada; última = acima do maior. */
function frequency(data: Value, bins: Value, ctx: FnContext): Value {
  const xs = collectNumbers([data], ctx, PLAIN);
  if (xs instanceof CalcError) return xs;
  const bsRaw = collectNumbers([bins], ctx, { errors: 'skip' });
  if (bsRaw instanceof CalcError) return bsRaw;
  // limites: erros e textos ignorados; nenhum número → um limite 0 (medido)
  const bs = bsRaw.length ? bsRaw : [0];
  const order = bs.map((b, i) => [b, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const counts = new Array<number>(bs.length + 1).fill(0);
  for (const x of xs) {
    let j = 0;
    while (j < order.length && x > order[j]![0]) j++;
    counts[j < order.length ? order[j]![1] : bs.length]!++;
  }
  return ArrayValue.of(counts.map((c) => [c]));
}

register(
  { name: 'LARGE', minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'), lift: true, call: ([a, k], ctx) => kth(dataOf(a, ctx), k, ctx, true) },
  { name: 'SMALL', minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'), lift: true, call: ([a, k], ctx) => kth(dataOf(a, ctx), k, ctx, false) },
  ...(['PERCENTILE', 'PERCENTILE.INC', 'PERCENTILE.EXC'] as const).map((name): FnDef => ({
    name, prefix: name === 'PERCENTILE' ? undefined : X, minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'), lift: true,
    call: ([a, p], ctx) => percentileFn(dataOf(a, ctx), p, ctx, name === 'PERCENTILE.EXC'),
  })),
  ...(['QUARTILE', 'QUARTILE.INC', 'QUARTILE.EXC'] as const).map((name): FnDef => ({
    name, prefix: name === 'QUARTILE' ? undefined : X, minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'), lift: true,
    call: ([a, q], ctx) => quartileFn(dataOf(a, ctx), q, ctx, name === 'QUARTILE.EXC'),
  })),
  ...(['PERCENTRANK', 'PERCENTRANK.INC', 'PERCENTRANK.EXC'] as const).map((name): FnDef => ({
    name, prefix: name === 'PERCENTRANK' ? undefined : X, minArgs: 2, maxArgs: 3, args: (i) => (i === 0 ? 'any' : 'value'), lift: true,
    call: ([a, x, sig], ctx) => percentRankFn(dataOf(a, ctx), x, sig ?? null, ctx, name === 'PERCENTRANK.EXC'),
  })),
  ...(['RANK', 'RANK.EQ', 'RANK.AVG'] as const).map((name): FnDef => ({
    name, prefix: name === 'RANK' ? undefined : X, minArgs: 2, maxArgs: 3, args: (i) => (i === 1 ? 'ref' : 'value'), lift: true,
    call: ([x, ref, o], ctx) => rankFn(x, ref, o ?? null, ctx, name === 'RANK.AVG'),
  })),
  { name: 'TRIMMEAN', minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'), lift: true, call: ([a, p], ctx) => trimmean(dataOf(a, ctx), p, ctx) },
  { name: 'FREQUENCY', minArgs: 2, maxArgs: 2, args: 'any', call: ([d, b], ctx) => frequency(d, b, ctx) },
  {
    name: 'STANDARDIZE', minArgs: 3, maxArgs: 3, args: 'value', lift: true,
    call: ([x, m, s], ctx) => {
      const a = argNumber(x, ctx), b = argNumber(m, ctx), c = argNumber(s, ctx);
      if (a instanceof CalcError) return a;
      if (b instanceof CalcError) return b;
      if (c instanceof CalcError) return c;
      if (c <= 0) return ERR.NUM;
      return num((a - b) / c);
    },
  },
  {
    name: 'FISHER', minArgs: 1, maxArgs: 1, args: 'value', lift: true,
    call: ([x], ctx) => {
      const a = argNumber(x, ctx);
      if (a instanceof CalcError) return a;
      if (a <= -1 || a >= 1) return ERR.NUM;
      return num(0.5 * Math.log((1 + a) / (1 - a)));
    },
  },
  {
    name: 'FISHERINV', minArgs: 1, maxArgs: 1, args: 'value', lift: true,
    call: ([y], ctx) => {
      const a = argNumber(y, ctx);
      if (a instanceof CalcError) return a;
      const e = Math.exp(2 * a);
      if (!Number.isFinite(e)) return 1;
      return num((e - 1) / (e + 1));
    },
  },
  {
    name: 'PERMUT', minArgs: 2, maxArgs: 2, args: 'value', lift: true,
    call: ([n, k], ctx) => {
      const a = argInt(n, ctx), b = argInt(k, ctx);
      if (a instanceof CalcError) return a;
      if (b instanceof CalcError) return b;
      if (a < 0 || b < 0 || a < b) return ERR.NUM;
      // produto crescente (n−k+1)·…·n — PERMUT(170;170) bate até o último dígito (medido)
      let p = 1;
      for (let i = a - b + 1; i <= a; i++) p *= i;
      return num(p);
    },
  },
  {
    name: 'PERMUTATIONA', prefix: X, minArgs: 2, maxArgs: 2, args: 'value', lift: true,
    call: ([n, k], ctx) => {
      const a = argInt(n, ctx), b = argInt(k, ctx);
      if (a instanceof CalcError) return a;
      if (b instanceof CalcError) return b;
      if (a < 0 || b < 0) return ERR.NUM;
      return num(a ** b);
    },
  },
  {
    name: 'PROB', minArgs: 3, maxArgs: 4, args: (i) => (i < 2 ? 'any' : 'value'), lift: true,
    call: ([xr, pr, lo, hi], ctx) => {
      const xs = scalarsNumOrErr(xr, ctx), ps = scalarsNumOrErr(pr, ctx);
      if (xs instanceof CalcError) return xs;
      if (ps instanceof CalcError) return ps;
      if (xs.length !== ps.length) return ERR.NA;
      const l = argNumber(lo, ctx);
      if (l instanceof CalcError) return l;
      let h = l;
      if (hi !== null && hi !== undefined) { const t = argNumber(hi, ctx); if (t instanceof CalcError) return t; h = t; }
      // só os pares em que x e p são números; a soma desses p tem de ser 1 (medido:
      // x texto tira o p da soma; p negativo ou > 1 é aceito)
      let total = 0, s = 0;
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i], p = ps[i];
        if (typeof p !== 'number' || typeof x !== 'number') continue;
        total = xlAdd(total, p);
        if (x >= l && x <= h) s = xlAdd(s, p);
      }
      // a soma tem de ser 1 nos 15 dígitos (0,5 + 0,50000001 → #NUM!, medido)
      if (Number(total.toPrecision(15)) !== 1) return ERR.NUM;
      return s;
    },
  },
);

/** Valores de um argumento como números ou null (texto/booleano/vazio), erro propaga. */
function scalarsNumOrErr(a: Value, ctx: FnContext): (number | null)[] | CalcError {
  const out: (number | null)[] = [];
  const vals: Scalar[] = a instanceof RefValue ? ctx.values(a).data as Scalar[] : a instanceof ArrayValue ? a.data as Scalar[] : [a as Scalar];
  for (const v of vals) {
    if (v instanceof CalcError) return v;
    out.push(typeof v === 'number' ? v : null);
  }
  return out;
}

// --- SUBTOTAL e AGGREGATE ----------------------------------------------------

/** Funções 1–11 de SUBTOTAL (e 1–13 de AGGREGATE). */
const SUBTOTAL_FNS: Record<number, Agg> = {
  1: aggAverage, 2: aggCount, 4: aggMax, 5: aggMin, 6: aggProduct, 7: aggStdevS, 8: aggStdevP,
  9: aggSum, 10: aggVarS, 11: aggVarP, 12: aggMedian, 13: aggModeSngl,
};

/** COUNTA sobre referências com filtro de células. */
function countaRefs(refs: readonly RefValue[], ctx: FnContext, skip: (s: number, r: number, c: number) => boolean, skipErrors: boolean): number {
  let n = 0;
  for (const ref of refs) for (const area of ref.areas) ctx.forEachCell(area, (v, r, c) => {
    if (v === null || skip(area.sheet, r, c)) return;
    if (skipErrors && v instanceof CalcError) return;
    n++;
  });
  return n;
}

register(
  {
    name: 'SUBTOTAL', minArgs: 2, maxArgs: 255, args: (i) => (i === 0 ? 'value' : 'ref'), lift: true,
    call: (args, ctx) => {
      const fnum = argNumber(args[0] as Scalar, ctx);
      if (fnum instanceof CalcError) return fnum;
      const f = Math.trunc(fnum);
      const base = f > 100 ? f - 100 : f;
      if (base < 1 || base > 11 || (f > 11 && f < 101) || f > 111) return ERR.VALUE;
      const refs = args.slice(1) as Value[];
      for (const r of refs) if (!(r instanceof RefValue)) return ERR.VALUE;
      const hideManual = f > 100;
      const skip = (s: number, r: number, c: number): boolean =>
        ctx.rowFiltered(s, r) || (hideManual && ctx.rowHidden(s, r)) || ctx.isSubtotalCell(s, r, c);
      if (base === 3) return countaRefs(refs as RefValue[], ctx, skip, false);
      const opts: CollectOptions = { skipCell: skip, ...(base === 2 ? { errors: 'skip' } : {}) };
      const xs = collectNumbers(refs, ctx, opts);
      if (xs instanceof CalcError) return xs;
      return SUBTOTAL_FNS[base]!(xs);
    },
  },
  {
    name: 'AGGREGATE', prefix: X, minArgs: 3, maxArgs: 254, args: (i) => (i < 2 ? 'value' : 'any'), lift: true,
    call: (args, ctx) => {
      const fnum = argNumber(args[0] as Scalar, ctx);
      if (fnum instanceof CalcError) return fnum;
      const opt = argNumber(args[1] as Scalar, ctx);
      if (opt instanceof CalcError) return opt;
      const f = Math.trunc(fnum), o = Math.trunc(opt);
      if (f < 1 || f > 19 || o < 0 || o > 7) return ERR.VALUE;
      const ignoreNested = o <= 3;
      const ignoreHidden = o === 1 || o === 3 || o === 5 || o === 7;
      const ignoreErrors = o === 2 || o === 3 || o === 6 || o === 7;
      const skip = (s: number, r: number, c: number): boolean =>
        (ignoreHidden && (ctx.rowHidden(s, r) || ctx.rowFiltered(s, r))) || (ignoreNested && ctx.isSubtotalCell(s, r, c));
      const opts: CollectOptions = { skipCell: skip, errors: ignoreErrors || f === 2 ? 'skip' : 'propagate' };
      if (f <= 13) {
        const refs = args.slice(2) as Value[];
        // forma de referência: matriz (constante ou calculada) → #VALUE! (medido)
        for (const r of refs) if (r instanceof ArrayValue) return ERR.VALUE;
        if (f === 3) {
          let n = 0;
          for (const r of refs) {
            if (r instanceof RefValue) n += countaRefs([r], ctx, skip, ignoreErrors);
            else if (r instanceof ArrayValue) n += r.data.filter((v) => !(ignoreErrors && v instanceof CalcError)).length;
            else if (!(ignoreErrors && r instanceof CalcError)) n++;
          }
          return n;
        }
        const xs = collectNumbers(refs, ctx, opts);
        if (xs instanceof CalcError) return xs;
        return SUBTOTAL_FNS[f]!(xs);
      }
      // 14–19: forma de matriz AGGREGATE(f; opção; matriz; k)
      if (args.length < 4) return ERR.VALUE;
      if (args.length > 4) return ERR.VALUE;
      const xs = collectNumbers([args[2] as Value], ctx, opts);
      if (xs instanceof CalcError) return xs;
      const one = (k: Scalar): Scalar => {
        if (k instanceof CalcError) return k;
        let r: Value;
        switch (f) {
          case 14: r = kth(xs, k, ctx, true); break;
          case 15: r = kth(xs, k, ctx, false); break;
          case 16: r = percentileFn(xs, k, ctx, false); break;
          case 17: r = quartileFn(xs, k, ctx, false); break;
          case 18: r = percentileFn(xs, k, ctx, true); break;
          default: r = quartileFn(xs, k, ctx, true);
        }
        return r as Scalar;
      };
      // k matriz (ou intervalo) → resultado elemento a elemento (medido: derrama)
      let kv = args[3] as Value;
      if (kv instanceof RefValue) kv = kv.single ? ctx.values(kv) : ERR.VALUE;
      if (kv instanceof ArrayValue) {
        const ka = kv;
        if (ka.rows === 1 && ka.cols === 1) return one(ka.get(0, 0));
        return ArrayValue.fill(ka.rows, ka.cols, (r, c) => one(ka.get(r, c)));
      }
      return one(kv as Scalar);
    },
  },
);
