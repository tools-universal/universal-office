/**
 * Financeiras (PV, FV, PMT, IPMT, PPMT, NPER, RATE, NPV, XNPV, IRR, XIRR, MIRR, SLN, SYD, DB, DDB, VDB, títulos: PRICE, YIELD, ACCRINT, COUP*, DURATION…).
 * Dono: agente FN-MATH. Contagem de dias e datas de cupom em daycount.ts.
 *
 * Regras medidas no Excel 365 (oráculo pt-BR) estão junto de cada função. As
 * herdadas do Analysis ToolPak seguem as regras ATP de math-util.ts.
 */
import { register, type FnContext, type FnDef } from '../fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';
import { asMatrix, atpFn, atpNum, atpRaw, decimalRound, def, eachNumber, excelPower, fin, liftScalars, num, numFn, RoundMode, type Num } from './math-util.js';
import { CDate, coupDayBs, coupDays, coupDaysNc, coupNcd, coupNum, coupPcd, couppcdDate, daysInYear, diffDate, yearFrac, yearFracParts, type Bond } from './daycount.js';

const X = '_xlfn.';
const pw = (x: number, y: number): number => { const r = excelPower(x, y); return r instanceof CalcError ? NaN : r; };

// ---------------------------------------------------------------------------
// Valor do dinheiro no tempo

/**
 * Fórmulas medidas bit a bit (o Excel não usa a mesma forma em todas):
 * FV = −(pv·q + pmt·(1+r·t)·((q−1)/r)), PV = (−fv − pmt·(1+r·t)·((q−1)/r))/q, com
 * q = POWER(1+r; n) do Excel; PMT usa o fator de desconto v = e^(−n·ln(1+r)) e
 * 1−v = −expm1(−n·ln(1+r)) (preciso com taxa minúscula: PMT(1E-10;10;1000) =
 * −100,000000055; PMT(5%;1E6;−100) = 5).
 */
export function fvOf(r: number, n: number, pmt: number, pv: number, t: number): number {
  if (r === 0) return -(pv + pmt * n);
  const q = pw(1 + r, n);
  return -(pv * q + pmt * (1 + r * t) * ((q - 1) / r));
}
export function pvOf(r: number, n: number, pmt: number, fv: number, t: number): number {
  if (r === 0) return -(fv + pmt * n);
  const q = pw(1 + r, n);
  if (q === 0) return NaN;
  if (!Number.isFinite(q)) return Infinity;
  return (-fv - pmt * (1 + r * t) * ((q - 1) / r)) / q;
}
export function pmtOf(r: number, n: number, pv: number, fv: number, t: number): number {
  if (r === 0) return -(pv + fv) / n;
  const l = Math.log1p(r);
  const v = Math.exp(-n * l);
  return -((pv + fv * v) * r) / ((1 + r * t) * -Math.expm1(-n * l));
}
function ipmtOf(r: number, per: number, n: number, pv: number, fv: number, t: number): number {
  const pmt = pmtOf(r, n, pv, fv, t);
  let ip: number;
  if (per === 1) ip = t ? 0 : -pv;
  else if (t) ip = fvOf(r, per - 2, pmt, pv, 1) - pmt;
  else ip = fvOf(r, per - 1, pmt, pv, 0);
  return ip * r;
}

const typeArg = (t: number): number => (t !== 0 ? 1 : 0);

const fv = numFn('FV', 3, 5, ([r, n, pmt, pv, t]) => fvOf(r!, n!, pmt!, pv!, typeArg(t!)), { defaults: [0, 0] });
const pv = numFn('PV', 3, 5, ([r, n, pmt, f, t]) => {
  const v = pvOf(r!, n!, pmt!, f!, typeArg(t!));
  return Number.isNaN(v) ? ERR.DIV0 : v; // medido: PV(−1;10;−100) = #DIV/0!
}, { defaults: [0, 0] });
const pmt = numFn('PMT', 3, 5, ([r, n, p, f, t]) => (n === 0 ? ERR.NUM : pmtOf(r!, n!, p!, f!, typeArg(t!))), { defaults: [0, 0] });
// medido: período fracionário vale (IPMT(5%;10,5;10;…) calcula); per ≥ n+1 = #NUM!
const ipmt = numFn('IPMT', 4, 6, ([r, per, n, p, f, t]) => {
  if (per! < 1 || per! >= n! + 1) return ERR.NUM;
  return ipmtOf(r!, per!, n!, p!, f!, typeArg(t!));
}, { defaults: [0, 0] });
const ppmt = numFn('PPMT', 4, 6, ([r, per, n, p, f, t]) => {
  if (per! < 1 || per! >= n! + 1) return ERR.NUM;
  const tt = typeArg(t!);
  return pmtOf(r!, n!, p!, f!, tt) - ipmtOf(r!, per!, n!, p!, f!, tt);
}, { defaults: [0, 0] });
const nper = numFn('NPER', 3, 5, ([r, p, v, f, t]) => {
  const tt = typeArg(t!);
  if (r === 0) return p === 0 ? ERR.DIV0 : -(v! + f!) / p!;
  const a = p! * (1 + r! * tt) - f! * r!, b = p! * (1 + r! * tt) + v! * r!;
  if (b === 0) return ERR.NUM;
  const q = a / b;
  if (!(q > 0) || r! <= -1) return ERR.NUM;
  return Math.log(q) / Math.log(1 + r!);
}, { defaults: [0, 0] });

/** RATE: Newton com derivada analítica a partir do palpite; 20 iterações, |Δ| < 1E-7. */
function rateOf(n: number, p: number, v: number, f: number, t: number, guess: number): Num {
  const F = (r: number): number => {
    if (Math.abs(r) < 1e-12) return v + p * n + f;
    const q = pw(1 + r, n);
    return v * q + (p * (1 + r * t) * (q - 1)) / r + f;
  };
  const D = (r: number): number => {
    if (Math.abs(r) < 1e-12) return v * n + p * (n * (n - 1) / 2 + t * n);
    const q = pw(1 + r, n), q1 = pw(1 + r, n - 1);
    return v * n * q1 + (p * t * (q - 1)) / r + (p * (1 + r * t) * (n * q1 * r - (q - 1))) / (r * r);
  };
  let r = guess;
  for (let i = 0; i < 20; i++) {
    const d = D(r);
    if (!Number.isFinite(d) || d === 0) return ERR.NUM;
    const rn = r - F(r) / d;
    if (!Number.isFinite(rn) || rn <= -1) return ERR.NUM;
    if (Math.abs(rn - r) < 1e-7) {
      // Newton converge quadraticamente: mais um passo deixa o resultado na precisão de máquina
      const d2 = D(rn);
      return d2 && Number.isFinite(d2) ? rn - F(rn) / d2 : rn;
    }
    r = rn;
  }
  return ERR.NUM;
}
const rate = numFn('RATE', 3, 6, ([n, p, v, f, t, g]) => rateOf(n!, p!, v!, f!, typeArg(t!), g!), { defaults: [0, 0, 0.1] });

const ispmt = numFn('ISPMT', 4, 4, ([r, per, n, v]) => (n === 0 ? ERR.DIV0 : v! * r! * (per! / n! - 1)));
const rri = numFn('RRI', 3, 3, ([n, v, f]) => {
  if (n! <= 0) return ERR.NUM;
  if (v === 0) return ERR.NUM;
  return pw(f! / v!, 1 / n!) - 1;
}, { prefix: X });
const pduration = numFn('PDURATION', 3, 3, ([r, v, f]) => {
  if (r! <= 0 || v! <= 0 || f! <= 0) return ERR.NUM;
  return (Math.log(f!) - Math.log(v!)) / Math.log(1 + r!);
}, { prefix: X });

// ---------------------------------------------------------------------------
// Fluxos de caixa

/** Números de uma lista de fluxos (referência/matriz: só números; erro propaga). */
function flows(args: readonly Value[], ctx: FnContext): number[] | CalcError {
  const out: number[] = [];
  const err = eachNumber(args, ctx, (n) => out.push(n));
  return err ?? out;
}

const npv: FnDef = def('NPV', 2, 255, (i) => (i === 0 ? 'value' : 'ref'), (args, ctx) => {
  const r = num(args[0] as Scalar, ctx);
  if (r instanceof CalcError) return r;
  if (r === -1) return ERR.DIV0;
  // medido: NPV(10%;;2) = 2/1,1² — argumento omitido conta como um período de valor 0
  const vs = flows((args.slice(1) as Value[]).map((a) => (a === null ? 0 : a)), ctx);
  if (vs instanceof CalcError) return vs;
  let s = 0;
  for (let i = 0; i < vs.length; i++) s += vs[i]! / pw(1 + r, i + 1);
  return fin(s);
}, { acceptsErrors: true });

/** Valores de uma matriz/referência só com números (IRR: texto e vazio ignorados). */
function arrayFlows(v: Value, ctx: FnContext): number[] | CalcError {
  if (v instanceof CalcError) return v;
  const r = flows([v], ctx);
  // medido: erro dentro da matriz de fluxos = #VALUE!
  return r instanceof CalcError && (v instanceof ArrayValue || v instanceof RefValue) ? ERR.VALUE : r;
}

function irrOf(vs: number[], guess: number): Num {
  if (!vs.some((x) => x > 0) || !vs.some((x) => x < 0)) return ERR.NUM;
  let r = guess;
  for (let it = 0; it < 20; it++) {
    let f = 0, d = 0;
    for (let i = 0; i < vs.length; i++) {
      const q = pw(1 + r, i);
      f += vs[i]! / q;
      d -= (i * vs[i]!) / (q * (1 + r));
    }
    if (d === 0 || !Number.isFinite(d)) return ERR.NUM;
    let rn = r - f / d;
    if (!Number.isFinite(rn)) return ERR.NUM;
    if (rn <= -1) rn = (r - 1) / 2; // não cruza −100%: meio caminho
    if (Math.abs(rn - r) < 1e-10) return rn;
    r = rn;
  }
  return ERR.NUM;
}
const irr: FnDef = def('IRR', 1, 2, (i) => (i === 0 ? 'ref' : 'value'), (args, ctx) => {
  const vs = arrayFlows(args[0] as Value, ctx);
  if (vs instanceof CalcError) return vs;
  let g = 0.1;
  if (args.length > 1 && args[1] !== null) {
    const n = num(args[1] as Scalar, ctx);
    if (n instanceof CalcError) return n;
    g = n;
  }
  return irrOf(vs, g);
}, { acceptsErrors: true });

const mirr: FnDef = def('MIRR', 3, 3, (i) => (i === 0 ? 'ref' : 'value'), (args, ctx) => {
  const vs = arrayFlows(args[0] as Value, ctx);
  if (vs instanceof CalcError) return vs;
  const fr = num(args[1] as Scalar, ctx), rr = num(args[2] as Scalar, ctx);
  if (fr instanceof CalcError) return fr;
  if (rr instanceof CalcError) return rr;
  const n = vs.length;
  let pos = 0, neg = 0;
  for (let i = 0; i < n; i++) {
    const v = vs[i]!;
    if (v > 0) pos += v * Math.pow(1 + rr, n - 1 - i);
    else if (v < 0) neg += v / Math.pow(1 + fr, i);
  }
  // medido: sem fluxo positivo = −100%; sem negativo = #DIV/0!
  if (neg === 0 || n < 2) return ERR.DIV0;
  return fin(Math.pow(-pos / neg, 1 / (n - 1)) - 1);
}, { acceptsErrors: true });

/** Matriz numérica de argumento ATP (datas/valores de XNPV/XIRR). */
/** Valores/datas de XNPV/XIRR: medido — texto, booleano ou vazio dentro da lista = #NUM!. */
function atpArray(v: Value, ctx: FnContext): number[] | CalcError {
  if (v === null) return ERR.NA;
  const m = v instanceof RefValue || v instanceof ArrayValue ? asMatrix(v, ctx) : new ArrayValue(1, 1, [v as Scalar]);
  if (m instanceof CalcError) return m;
  const out: number[] = [];
  const multi = m.data.length > 1;
  for (const x of m.data) {
    if (x instanceof CalcError) return x;
    if (typeof x !== 'number') {
      if (multi) return ERR.NUM;
      if (x === null || typeof x === 'boolean') return ERR.VALUE;
      const n = atpNum(x, ctx);
      if (n instanceof CalcError) return n;
      out.push(n);
    } else out.push(x);
  }
  return out;
}

function xnpvOf(r: number, vs: number[], ds: number[]): Num {
  let s = 0;
  for (let i = 0; i < vs.length; i++) s += vs[i]! / pw(1 + r, (ds[i]! - ds[0]!) / 365);
  return fin(s);
}
function xArgs(args: readonly Value[], ctx: FnContext, vi: number): { vs: number[]; ds: number[] } | CalcError {
  const vs = atpArray(args[vi]!, ctx);
  if (vs instanceof CalcError) return vs;
  const ds = atpArray(args[vi + 1]!, ctx);
  if (ds instanceof CalcError) return ds;
  if (vs.length !== ds.length) return ERR.NUM;
  const d0 = Math.trunc(ds[0]!);
  const dd = ds.map(Math.trunc);
  for (const d of dd) if (d < d0 || d < 0) return ERR.NUM;
  return { vs, ds: dd };
}
const xnpv: FnDef = def('XNPV', 3, 3, (i) => (i === 0 ? 'value' : 'any'), (args, ctx) => {
  const r = atpNum(atpRaw(args[0] as Value, ctx) as Scalar, ctx);
  if (r instanceof CalcError) return r;
  const x = xArgs(args, ctx, 1);
  if (x instanceof CalcError) return x;
  if (r <= 0) return ERR.NUM; // medido: XNPV(0;…) e taxa negativa = #NUM!
  return xnpvOf(r, x.vs, x.ds);
}, { acceptsErrors: true });

function xirrOf(vs: number[], ds: number[], guess: number): Num {
  if (!vs.some((x) => x > 0) || !vs.some((x) => x < 0)) return ERR.NUM;
  let r = guess;
  for (let it = 0; it < 100; it++) {
    let f = 0, d = 0;
    for (let i = 0; i < vs.length; i++) {
      const e = (ds[i]! - ds[0]!) / 365;
      const q = pw(1 + r, e);
      f += vs[i]! / q;
      d -= (e * vs[i]!) / (q * (1 + r));
    }
    if (d === 0 || !Number.isFinite(d)) return ERR.NUM;
    const rn = r - f / d;
    if (!Number.isFinite(rn)) return ERR.NUM;
    if (Math.abs(rn - r) < 1e-10) return rn;
    r = rn <= -1 ? (r - 1) / 2 : rn;
  }
  return ERR.NUM;
}
const xirr: FnDef = def('XIRR', 2, 3, 'any', (args, ctx) => {
  const x = xArgs(args, ctx, 0);
  if (x instanceof CalcError) return x;
  let g = 0.1;
  if (args.length > 2 && args[2] !== null) {
    const n = atpNum(atpRaw(args[2] as Value, ctx) as Scalar, ctx);
    if (n instanceof CalcError) return n;
    g = n;
  }
  return xirrOf(x.vs, x.ds, g);
}, { acceptsErrors: true });

const fvschedule: FnDef = def('FVSCHEDULE', 2, 2, 'any', (args, ctx) => {
  const p = atpNum(atpRaw(args[0] as Value, ctx) as Scalar, ctx);
  if (p instanceof CalcError) return p;
  const s = args[1] as Value;
  let rates: number[] = [];
  if (s instanceof RefValue || s instanceof ArrayValue) {
    const m = asMatrix(s, ctx);
    if (m instanceof CalcError) return m;
    for (const x of m.data) {
      if (x instanceof CalcError) return x;
      if (x === null) { rates.push(0); continue; }
      if (typeof x !== 'number') return ERR.VALUE;
      rates.push(x);
    }
  } else if (s instanceof LambdaValue) return ERR.VALUE;
  else {
    const n = atpNum(atpRaw(s, ctx) as Scalar, ctx);
    if (n instanceof CalcError) return n;
    rates = [n];
  }
  let v = p;
  for (const r of rates) v *= 1 + r;
  return fin(v);
}, { acceptsErrors: true });

function cumArgs(a: number[]): CalcError | undefined {
  const [r, n, v, s, e, t] = a as [number, number, number, number, number, number];
  if (r <= 0 || n <= 0 || v <= 0 || s < 1 || e < 1 || s > e || e > n || (t !== 0 && t !== 1)) return ERR.NUM;
  return undefined;
}
const cumipmt = atpFn('CUMIPMT', 6, 6, (a) => {
  const err = cumArgs(a);
  if (err) return err;
  const [r, n, v, s0, e0, t] = a as [number, number, number, number, number, number];
  let s = Math.ceil(s0); // medido: CUMIPMT(…;1,5;3,7;…) = períodos 2 e 3
  const e = Math.trunc(e0);
  const p = pmtOf(r, n, v, 0, t);
  let z = 0;
  if (s === 1) { if (t <= 0) z = -v; s++; }
  for (let i = s; i <= e; i++) z += t > 0 ? fvOf(r, i - 2, p, v, 1) - p : fvOf(r, i - 1, p, v, 0);
  return z * r;
});
const cumprinc = atpFn('CUMPRINC', 6, 6, (a) => {
  const err = cumArgs(a);
  if (err) return err;
  const [r, n, v, s0, e0, t] = a as [number, number, number, number, number, number];
  let s = Math.ceil(s0);
  const e = Math.trunc(e0);
  const p = pmtOf(r, n, v, 0, t);
  let k = 0;
  if (s === 1) { k = t <= 0 ? p + v * r : p; s++; }
  for (let i = s; i <= e; i++) k += t > 0 ? p - (fvOf(r, i - 2, p, v, 1) - p) * r : p - fvOf(r, i - 1, p, v, 0) * r;
  return k;
});

const effect = atpFn('EFFECT', 2, 2, ([nom, np]) => {
  const n = Math.trunc(np!);
  if (nom! <= 0 || n < 1) return ERR.NUM;
  return pw(1 + nom! / n, n) - 1;
});
const nominal = atpFn('NOMINAL', 2, 2, ([eff, np]) => {
  const n = Math.trunc(np!);
  if (eff! <= 0 || n < 1) return ERR.NUM;
  return (pw(1 + eff!, 1 / n) - 1) * n;
});

// ---------------------------------------------------------------------------
// Depreciação

const sln = numFn('SLN', 3, 3, ([c, s, l]) => (l === 0 ? ERR.DIV0 : (c! - s!) / l!));
const syd = numFn('SYD', 4, 4, ([c, s, l, p]) => {
  if (l! <= 0 || p! <= 0 || p! > l!) return ERR.NUM;
  return ((c! - s!) * (l! - p! + 1) * 2) / (l! * (l! + 1));
});
/**
 * DB: taxa arredondada em 3 casas e saldo contábil atualizado a cada período
 * (bate bit a bit). Medido: valor residual maior que o custo vale (deprecia
 * negativo), custo 0 dá 0, mês truncado.
 */
const db = numFn('DB', 4, 5, ([c, s, l, p, m]) => {
  const months = Math.trunc(m!);
  if (months < 1 || months > 12 || s! < 0 || c! < 0 || l! < 1 || p! <= 0) return ERR.NUM;
  const per = Math.trunc(p!);
  if (per > l! + (months < 12 ? 1 : 0) || p! > l! + 1) return ERR.NUM;
  if (c === 0) return 0;
  let rateD = 1 - pw(s! / c!, 1 / l!);
  rateD = Math.round(rateD * 1000) / 1000;
  const first = (c! * rateD * months) / 12;
  if (per === 1) return first;
  let book = c! - first, d = 0;
  const imax = Math.trunc(Math.min(l!, per));
  for (let i = 2; i <= imax; i++) { d = book * rateD; book -= d; }
  if (per > l!) d = (book * rateD * (12 - months)) / 12;
  return d;
}, { defaults: [12] });

/**
 * DDB: min(saldo·taxa; saldo − residual), saldo = custo·(1−taxa)^(período−1)
 * (expoente nunca negativo; taxa limitada a 1). Medido: DDB(2400;300;10;0,5) = 480.
 */
function ddbOf(c: number, s: number, l: number, p: number, f: number): number {
  const rr = Math.min(f / l, 1);
  const book = p <= 1 ? c : c * pw(1 - rr, p - 1);
  return Math.max(0, Math.min(book * rr, book - s));
}
const ddb = numFn('DDB', 4, 5, ([c, s, l, p, f]) => {
  if (c! < 0 || s! < 0 || f! <= 0 || l! <= 0 || p! <= 0 || p! > l!) return ERR.NUM;
  return ddbOf(c!, s!, l!, p!, f!);
}, { defaults: [2] });

function interVdb(c: number, s: number, l: number, l1: number, per: number, f: number): number {
  let vdb = 0, sln = 0, now = false;
  const intEnd = Math.ceil(per);
  let rest = c - s;
  for (let i = 1; i <= intEnd; i++) {
    let term: number;
    if (!now) {
      const d = ddbOf(c, s, l, i, f);
      sln = rest / (l1 - (i - 1));
      if (sln > d) { term = sln; now = true; } else { term = d; rest -= d; }
    } else term = sln;
    if (i === intEnd) term *= per + 1 - intEnd;
    vdb += term;
  }
  return vdb;
}
/**
 * VDB como o Excel (o algoritmo que o Gnumeric reproduz, inclusive o ajuste de
 * início fracionário depois da metade da vida útil). Medido: fator 0 e fator
 * vazio valem (só linear); no_switch em texto = #VALUE!.
 */
const vdb: FnDef = {
  name: 'VDB', minArgs: 5, maxArgs: 7, args: 'value', lift: true, acceptsErrors: true,
  call: (args: readonly Scalar[], ctx: FnContext) => {
    const xs: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (i >= args.length) { xs.push(i === 5 ? 2 : 0); continue; }
      const a = args[i]!;
      if (i === 6 && typeof a === 'string') return ERR.VALUE;
      const n = num(a, ctx);
      if (n instanceof CalcError) return n;
      xs.push(n);
    }
    let [c, s, l, st, en, f, ns] = xs as [number, number, number, number, number, number, number];
    if (st < 0 || en < st || en > l || c < 0 || s < 0 || f < 0 || l <= 0) return ERR.NUM;
    const intStart = Math.floor(st), intEnd = Math.ceil(en);
    let res = 0;
    if (ns) {
      for (let i = intStart + 1; i <= intEnd; i++) {
        let term = ddbOf(c, s, l, i, f);
        if (i === intStart + 1) term *= Math.min(en, intStart + 1) - st;
        else if (i === intEnd) term *= en + 1 - intEnd;
        res += term;
      }
      return fin(res);
    }
    let l1 = l;
    if (st !== Math.floor(st) && f > 1 && st >= l / 2) {
      const part = st - l / 2;
      st = l / 2; en -= part; l1 += 1;
    }
    c -= interVdb(c, s, l, l1, st, f);
    return fin(interVdb(c, s, l, l - st, en - st, f));
  },
};

function basisArg(b: number): number | CalcError {
  const x = Math.trunc(b);
  return x < 0 || x > 4 ? ERR.NUM : x;
}
/** ROUND(x;0) do Excel (com os 15 dígitos: 327,49999999999994 → 328). */
const roundHalf = (x: number): number => decimalRound(x, 0, RoundMode.Half);

const amordegrc = atpFn('AMORDEGRC', 6, 7, ([cost, date, first, salv, per, r, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError || basis === 2) return ERR.NUM;
  if (r! <= 0 || per! < 0 || salv! < 0 || cost! < 0 || salv! > cost!) return ERR.NUM;
  const usePer = 1 / r!;
  const coeff = usePer < 3 ? 1 : usePer < 5 ? 1.5 : usePer <= 6 ? 2 : 2.5;
  const rr = r! * coeff;
  // medido: no penúltimo período da vida útil (⌈1/taxa⌉) a taxa vira 50%; no último, o resto
  const life = Math.ceil(usePer);
  // medido: o saldo usa o arredondamento comum (327,49999999999994 → 327); o valor do
  // período 0 devolvido usa o ROUND do Excel (15 dígitos: → 328)
  const rnd = (x: number): number => Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
  let c = cost!;
  const nr0 = yearFrac(Math.trunc(date!), Math.trunc(first!), basis, ctx.date1904) * rr * c;
  const n = Math.trunc(per!);
  if (n === 0) return roundHalf(nr0);
  let nr = rnd(nr0);
  c -= nr;
  let rest = c - salv!;
  for (let i = 0; i < n; i++) {
    const p = i + 1;
    if (p === life - 2) nr = rnd(c * 0.5);
    else if (p === life - 1) nr = c;
    else if (p >= life) nr = 0;
    else nr = rnd(rr * c);
    rest -= nr;
    if (rest < 0) return n - i <= 1 ? rnd(c * 0.5) : 0;
    c -= nr;
  }
  return nr;
}, { defaults: [0] });
const amorlinc = atpFn('AMORLINC', 6, 7, ([cost, date, first, salv, per, r, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError || basis === 2) return ERR.NUM;
  if (r! <= 0 || per! < 0 || salv! < 0 || cost! < 0 || salv! > cost!) return ERR.NUM;
  const n = Math.trunc(per!);
  const one = cost! * r!;
  const delta = cost! - salv!;
  const r0 = yearFrac(Math.trunc(date!), Math.trunc(first!), basis, ctx.date1904) * r! * cost!;
  const full = Math.trunc((cost! - salv! - r0) / one);
  let res = 0;
  if (n === 0) res = r0;
  else if (n <= full) res = one;
  else if (n === full + 1) res = delta - one * full - r0;
  return res > 0 ? res : 0;
}, { defaults: [0] });

const dollarde = atpFn('DOLLARDE', 2, 2, ([d, f]) => {
  const fr = Math.trunc(f!);
  if (fr < 0) return ERR.NUM;
  if (fr === 0) return ERR.DIV0;
  const i = Math.trunc(d!), frac = d! - i;
  return i + (frac * pw(10, Math.ceil(Math.log10(fr)))) / fr;
});
const dollarfr = atpFn('DOLLARFR', 2, 2, ([d, f]) => {
  const fr = Math.trunc(f!);
  if (fr < 0) return ERR.NUM;
  if (fr === 0) return ERR.DIV0;
  const i = Math.trunc(d!), frac = d! - i;
  return i + (frac * fr) / pw(10, Math.ceil(Math.log10(fr)));
});

// ---------------------------------------------------------------------------
// Títulos

/** Validação comum: liquidação < vencimento, frequência 1/2/4, base 0–4. */
function bondOf(settle: number, mat: number, freq: number, basis: number, ctx: FnContext): Bond | CalcError {
  const b = basisArg(basis);
  if (b instanceof CalcError) return b;
  const f = Math.trunc(freq);
  const s = Math.trunc(settle), m = Math.trunc(mat);
  if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
  if (s < 0 || m < 0) return ERR.NUM;
  if (s >= m) return ERR.NUM;
  return { settle: s, mat: m, freq: f, basis: b, d1904: ctx.date1904 };
}
/** PRICE/YIELD/DURATION: liquidação na série 0 = #NUM! (as COUP* aceitam). */
function bondOf1(settle: number, mat: number, freq: number, basis: number, ctx: FnContext): Bond | CalcError {
  if (Math.trunc(settle) <= 0) return ERR.NUM;
  return bondOf(settle, mat, freq, basis, ctx);
}
function coupFn(name: string, f: (b: Bond) => number): FnDef {
  return atpFn(name, 3, 4, ([s, m, fr, b], ctx) => {
    const bond = bondOf(s!, m!, fr!, b!, ctx);
    return bond instanceof CalcError ? bond : f(bond);
  }, { defaults: [0] });
}

/** PRICE (ajuda do Excel). Medido: DSC = E − A (não os dias reais até o cupom). */
function priceOf(b: Bond, rate: number, yld: number, red: number): number {
  const f = b.freq;
  const E = coupDays(b), N = coupNum(b), A = coupDayBs(b), DSC = E - A;
  const T1 = (100 * rate) / f;
  if (N === 1) {
    return (red + T1) / (1 + (DSC / E) * yld / f) - (T1 * A) / E;
  }
  const T2 = 1 + yld / f;
  let p = red / pw(T2, N - 1 + DSC / E);
  for (let k = 1; k <= N; k++) p += T1 / pw(T2, k - 1 + DSC / E);
  return p - (T1 * A) / E;
}
function yieldOf(b: Bond, rate: number, pr: number, red: number): Num {
  const f = b.freq;
  const N = coupNum(b);
  if (N <= 1) {
    const E = coupDays(b), A = coupDayBs(b), DSR = E - A;
    const t = (rate / f) * (A / E);
    return ((red / 100 + rate / f - (pr / 100 + t)) / (pr / 100 + t)) * ((f * E) / DSR);
  }
  // secante/bisseção do ATP (a que o LibreOffice reproduz): para quando o preço
  // calculado iguala o pedido com precisão relativa de 2^-48
  const P = (y: number): number => priceOf(b, rate, y, red);
  const eq = (a: number, c: number): boolean => a === c || Math.abs(a - c) < Math.abs(a) * 3.552713678800501e-15;
  let y1 = 0, y2 = 1, p1 = P(y1), p2 = P(y2), pN = 0, yN = (y2 - y1) * 0.5;
  for (let it = 0; it < 100 && !eq(pN, pr); it++) {
    pN = P(yN);
    if (eq(pr, p1)) return y1;
    if (eq(pr, p2)) return y2;
    if (eq(pr, pN)) return yN;
    if (pr < p2) { y2 *= 2; p2 = P(y2); yN = (y2 - y1) * 0.5; }
    else {
      if (pr < pN) { y1 = yN; p1 = pN; } else { y2 = yN; p2 = pN; }
      yN = y2 - (y2 - y1) * ((pr - p2) / (p1 - p2));
    }
  }
  if (Math.abs(pr - pN) > pr / 100) return ERR.NUM;
  return yN;
}

const price = atpFn('PRICE', 6, 7, ([s, m, r, y, red, fr, b], ctx) => {
  const bond = bondOf1(s!, m!, fr!, b!, ctx);
  if (bond instanceof CalcError) return bond;
  if (r! < 0 || y! < 0 || red! <= 0) return ERR.NUM;
  return priceOf(bond, r!, y!, red!);
}, { defaults: [0] });
const yieldFn = atpFn('YIELD', 6, 7, ([s, m, r, pr, red, fr, b], ctx) => {
  const bond = bondOf1(s!, m!, fr!, b!, ctx);
  if (bond instanceof CalcError) return bond;
  if (r! < 0 || pr! <= 0 || red! <= 0) return ERR.NUM;
  return yieldOf(bond, r!, pr!, red!);
}, { defaults: [0] });

/** Duração de Macaulay com t_k = k − 1 + DSC/E, DSC = E − A (medido). */
function durationOf(b: Bond, coup: number, yld: number): number {
  const E = coupDays(b), A = coupDayBs(b), N = coupNum(b);
  const x = (E - A) / E;
  const cf = (coup * 100) / b.freq, y = 1 + yld / b.freq;
  let num = 0, den = 0;
  for (let k = 1; k <= N; k++) {
    const t = k - 1 + x;
    const v = (k === N ? cf + 100 : cf) / Math.pow(y, t);
    num += t * v;
    den += v;
  }
  return num / den / b.freq;
}
const duration = atpFn('DURATION', 5, 6, ([s, m, c, y, fr, b], ctx) => {
  const bond = bondOf1(s!, m!, fr!, b!, ctx);
  if (bond instanceof CalcError) return bond;
  if (c! < 0 || y! < 0) return ERR.NUM;
  return durationOf(bond, c!, y!);
}, { defaults: [0] });
const mduration = atpFn('MDURATION', 5, 6, ([s, m, c, y, fr, b], ctx) => {
  const bond = bondOf1(s!, m!, fr!, b!, ctx);
  if (bond instanceof CalcError) return bond;
  if (c! < 0 || y! < 0) return ERR.NUM;
  return durationOf(bond, c!, y!) / (1 + y! / bond.freq);
}, { defaults: [0] });

/** Datas de desconto (DISC, INTRATE…): liquidação < vencimento, base válida. */
function discArgs(s: number, m: number, b: number): { s: number; m: number; b: number } | CalcError {
  const basis = basisArg(b);
  if (basis instanceof CalcError) return basis;
  const ss = Math.trunc(s), mm = Math.trunc(m);
  if (ss < 0 || mm < 0 || ss >= mm) return ERR.NUM;
  return { s: ss, m: mm, b: basis };
}
const disc = atpFn('DISC', 4, 5, ([s, m, pr, red, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  if (pr! <= 0 || red! <= 0) return ERR.NUM;
  const { days, year } = yearFracParts(a.s, a.m, a.b, ctx.date1904);
  return (1 - pr! / red!) * (year / days);
}, { defaults: [0] });
const intrate = atpFn('INTRATE', 4, 5, ([s, m, inv, red, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  if (inv! <= 0 || red! <= 0) return ERR.NUM;
  const { days, year } = yearFracParts(a.s, a.m, a.b, ctx.date1904);
  return ((red! - inv!) / inv!) * (year / days);
}, { defaults: [0] });
const received = atpFn('RECEIVED', 4, 5, ([s, m, inv, d, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  if (inv! <= 0 || d! <= 0) return ERR.NUM;
  const den = 1 - d! * yearFrac(a.s, a.m, a.b, ctx.date1904);
  return den <= 0 ? ERR.NUM : inv! / den;
}, { defaults: [0] });
const pricedisc = atpFn('PRICEDISC', 4, 5, ([s, m, d, red, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  if (d! <= 0 || red! <= 0) return ERR.NUM;
  return red! * (1 - d! * yearFrac(a.s, a.m, a.b, ctx.date1904));
}, { defaults: [0] });
const yielddisc = atpFn('YIELDDISC', 4, 5, ([s, m, pr, red, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  if (pr! <= 0 || red! <= 0) return ERR.NUM;
  const { days, year } = yearFracParts(a.s, a.m, a.b, ctx.date1904);
  return ((red! - pr!) / pr!) * (year / days);
}, { defaults: [0] });
const pricemat = atpFn('PRICEMAT', 5, 6, ([s, m, iss, r, y, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  const is = Math.trunc(iss!);
  if (r! < 0 || y! < 0 || is > a.s) return ERR.NUM;
  // ajuda do Excel: B = dias no ano (base 1: ano civil da liquidação)
  const B = daysInYear(a.s, a.b, ctx.date1904);
  const dc = (x: number, z: number): number => yearFracParts(x, z, a.b, ctx.date1904).days;
  const DIM = dc(is, a.m), DSM = dc(a.s, a.m), A = dc(is, a.s);
  return (100 + (DIM / B) * r! * 100) / (1 + (DSM / B) * y!) - (A / B) * r! * 100;
}, { defaults: [0] });
const yieldmat = atpFn('YIELDMAT', 5, 6, ([s, m, iss, r, pr, b], ctx) => {
  const a = discArgs(s!, m!, b!);
  if (a instanceof CalcError) return a;
  const is = Math.trunc(iss!);
  if (r! < 0 || pr! <= 0 || is > a.s) return ERR.NUM;
  const B = daysInYear(a.s, a.b, ctx.date1904);
  const dc = (x: number, z: number): number => yearFracParts(x, z, a.b, ctx.date1904).days;
  const DIM = dc(is, a.m), DSM = dc(a.s, a.m), A = dc(is, a.s);
  const t = pr! / 100 + (A / B) * r!;
  return ((1 + (DIM / B) * r! - t) / t) * (B / DSM);
}, { defaults: [0] });

/** Argumentos de ACCRINT/ACCRINTM: regras ATP, mas par omitido = 1000 e calc_method aceita booleano. */
function accrArgs(args: readonly Value[], ctx: FnContext, n: number, parIdx: number, boolIdx: number): (Scalar | ArrayValue)[] {
  const raw: (Scalar | ArrayValue)[] = [];
  for (let i = 0; i < n; i++) {
    const a = i < args.length ? args[i]! : undefined;
    if ((a === undefined || a === null) && i === parIdx) raw.push(1000);
    else if ((a === undefined || a === null) && i > parIdx + (boolIdx > 0 ? 1 : 0)) raw.push(i === boolIdx ? true : 0);
    else raw.push(atpRaw(a, ctx));
  }
  return raw;
}
function accrNums(s: Scalar[], ctx: FnContext, boolIdx: number): number[] | CalcError {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const v = s[i]!;
    if (i === boolIdx && typeof v === 'boolean') { out.push(v ? 1 : 0); continue; }
    const n = atpNum(v, ctx);
    if (n instanceof CalcError) return n;
    out.push(n);
  }
  return out;
}

const accrintm: FnDef = {
  name: 'ACCRINTM', minArgs: 4, maxArgs: 5, args: 'any', acceptsErrors: true,
  call: (args: readonly Value[], ctx: FnContext) => liftScalars(accrArgs(args, ctx, 5, 3, -1), (sc) => {
    const a = accrNums(sc, ctx, -1);
    if (a instanceof CalcError) return a;
    const [iss, s, r, par, b] = a as [number, number, number, number, number];
    const basis = basisArg(b);
    if (basis instanceof CalcError) return basis;
    const is = Math.trunc(iss), ss = Math.trunc(s);
    if (r <= 0 || par <= 0 || is >= ss) return ERR.NUM;
    const { days, year } = diffDate(is, ss, basis, ctx.date1904);
    return fin(par * r * (days / year));
  }),
};

/**
 * ACCRINT (ajuda do Excel): par·taxa/f·Σ Aᵢ/NLᵢ sobre os períodos de quase-cupom
 * ancorados no 1º cupom, da emissão até a liquidação (bate com o Excel com
 * calc_method VERDADEIRO; o FALSO do Excel não segue a ajuda — pendente).
 */
const accrint: FnDef = {
  name: 'ACCRINT', minArgs: 6, maxArgs: 8, args: 'any', acceptsErrors: true,
  call: (args: readonly Value[], ctx: FnContext) => liftScalars(accrArgs(args, ctx, 8, 4, 7), (sc) => {
    const a = accrNums(sc, ctx, 7);
    if (a instanceof CalcError) return a;
    const [iss, first, s, r, par, fr, b] = a as [number, number, number, number, number, number, number];
    const basis = basisArg(b);
    if (basis instanceof CalcError) return basis;
    const f = Math.trunc(fr);
    if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
    const is = Math.trunc(iss), fi = Math.trunc(first), ss = Math.trunc(s);
    if (r <= 0 || par <= 0 || is >= ss || is <= 0 || fi <= 0) return ERR.NUM;
    const d1904 = ctx.date1904;
    const months = 12 / f;
    // medido: dias 30/360 com a regra do DAYS360 (31 → 30): ACCRINT(31/01/2008;31/07/2008;15/03/2009;…;0) = 56,25
    const dc = (x: number, z: number): number => (basis === 0 || basis === 4 ? CDate.diff(CDate.of(x, basis, d1904), CDate.of(z, basis, d1904)) : z - x);
    // quase-cupons: datas ancoradas no 1º cupom (com a regra de fim de mês)
    const anchor = CDate.of(fi, basis, d1904);
    const at = (k: number): number => { const c = anchor.clone(); c.addMonths(k * months); return c.serial(d1904); };
    let k = 0;
    while (at(k) > is) k--;
    let sum = 0;
    for (; at(k) < ss; k++) {
      const st = at(k), en = at(k + 1);
      const nl = basis === 1 ? en - st : (basis === 3 ? 365 : 360) / f;
      const from = Math.max(st, is), to = Math.min(en, ss);
      if (to > from) sum += dc(from, to) / nl;
    }
    return fin(((par * r) / f) * sum);
  }),
};

// T-bills (dias reais; mais de 1 ano = #NUM!)
function tbillDays(s: number, m: number): number | CalcError {
  const ss = Math.trunc(s), mm = Math.trunc(m);
  if (ss >= mm || mm - ss > 365) return ERR.NUM;
  return mm - ss;
}
const tbillprice = atpFn('TBILLPRICE', 3, 3, ([s, m, d]) => {
  const dsm = tbillDays(s!, m!);
  if (dsm instanceof CalcError) return dsm;
  if (d! <= 0) return ERR.NUM;
  const p = 100 * (1 - (d! * dsm) / 360);
  return p <= 0 ? ERR.NUM : p;
});
const tbillyield = atpFn('TBILLYIELD', 3, 3, ([s, m, pr]) => {
  const dsm = tbillDays(s!, m!);
  if (dsm instanceof CalcError) return dsm;
  if (pr! <= 0) return ERR.NUM;
  return ((100 - pr!) / pr!) * (360 / dsm);
});
const tbilleq = atpFn('TBILLEQ', 3, 3, ([s, m, d]) => {
  const dsm = tbillDays(s!, m!);
  if (dsm instanceof CalcError) return dsm;
  if (d! <= 0) return ERR.NUM;
  if (dsm <= 182) return (365 * d!) / (360 - d! * dsm);
  // mais de meio ano: rendimento equivalente com capitalização semestral
  const p = 100 * (1 - (d! * dsm) / 360);
  if (p <= 0) return ERR.NUM;
  const a = dsm / 365 / 2 - 0.25, bq = dsm / 365, c = (p - 100) / p;
  void a;
  return (-2 * bq + 2 * Math.sqrt(bq * bq - (2 * bq - 1) * c)) / (2 * bq - 1);
});

// ODDF*/ODDL*: primeiro/último período irregular (fórmulas da ajuda do Excel com
// períodos de quase-cupom; dias 30/360 pela regra da ScaDate nas bases 0 e 4)
function dayCounter(basis: number, d1904: boolean): (a: number, b: number) => number {
  return basis === 0 || basis === 4 ? (a, b) => CDate.diff(CDate.of(a, basis, d1904), CDate.of(b, basis, d1904)) : (a, b) => b - a;
}
interface Quasi { nl: number; dc: number; a: number; dsc: number }
/** Quase-cupons do último período irregular: de `last` até o vencimento. */
function oddlQuasi(s: number, m: number, last: number, f: number, basis: number, d1904: boolean): Quasi[] {
  const dc = dayCounter(basis, d1904);
  const anchor = CDate.of(last, basis, d1904);
  const at = (k: number): number => { const c = anchor.clone(); c.addMonths((k * 12) / f); return c.serial(d1904); };
  const out: Quasi[] = [];
  for (let k = 0; at(k) < m; k++) {
    const st = at(k), en = at(k + 1);
    const nl = basis === 1 || basis === 3 ? en - st : 360 / f;
    const endIn = Math.min(en, m);
    out.push({
      nl, dc: dc(st, endIn),
      a: s > st ? dc(st, Math.min(en, s)) : 0,
      dsc: s < endIn ? dc(Math.max(s, st), endIn) : 0,
    });
  }
  return out;
}
const oddlprice = atpFn('ODDLPRICE', 7, 8, ([s, m, last, r, y, red, fr, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError) return basis;
  const f = Math.trunc(fr!);
  if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
  const ss = Math.trunc(s!), mm = Math.trunc(m!), ll = Math.trunc(last!);
  if (r! < 0 || y! < 0 || red! <= 0 || !(ll < ss && ss < mm)) return ERR.NUM;
  const q = oddlQuasi(ss, mm, ll, f, basis, ctx.date1904);
  const T = (100 * r!) / f;
  let sdc = 0, sdsc = 0, sa = 0;
  for (const x of q) { sdc += x.dc / x.nl; sdsc += x.dsc / x.nl; sa += x.a / x.nl; }
  return (red! + sdc * T) / (1 + sdsc * (y! / f)) - sa * T;
}, { defaults: [0] });
const oddlyield = atpFn('ODDLYIELD', 7, 8, ([s, m, last, r, pr, red, fr, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError) return basis;
  const f = Math.trunc(fr!);
  if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
  const ss = Math.trunc(s!), mm = Math.trunc(m!), ll = Math.trunc(last!);
  if (r! < 0 || pr! <= 0 || red! <= 0 || !(ll < ss && ss < mm)) return ERR.NUM;
  const q = oddlQuasi(ss, mm, ll, f, basis, ctx.date1904);
  const T = (100 * r!) / f;
  let sdc = 0, sdsc = 0, sa = 0;
  for (const x of q) { sdc += x.dc / x.nl; sdsc += x.dsc / x.nl; sa += x.a / x.nl; }
  const base = pr! + sa * T;
  return ((red! + sdc * T - base) / base) * (f / sdsc);
}, { defaults: [0] });

/**
 * ODDFPRICE pela ajuda do Excel (primeiro cupom curto ou longo): fluxos a partir do
 * 1º cupom real, descontados por Nq + DSC/NL + (k−1) períodos; o cupom irregular é
 * 100·taxa/f·Σ DCᵢ/NLᵢ e o juro corrido 100·taxa/f·Σ Aᵢ/NLᵢ nos quase-cupons.
 */
function oddfPrice(s: number, m: number, iss: number, first: number, rate: number, yld: number, red: number, f: number, basis: number, d1904: boolean): number {
  const dc = dayCounter(basis, d1904);
  const anchor = CDate.of(first, basis, d1904);
  const at = (k: number): number => { const c = anchor.clone(); c.addMonths((k * 12) / f); return c.serial(d1904); };
  const nlOf = (st: number, en: number): number => (basis === 1 || basis === 3 ? en - st : 360 / f);
  const T = (100 * rate) / f, q = 1 + yld / f;
  // quase-cupons do período irregular (de trás para frente a partir do 1º cupom)
  let sdc = 0, sa = 0, nq = 0, dsc = 0, nl = 0;
  for (let k = 0; ; k--) {
    const st = at(k - 1), en = at(k);
    const len = nlOf(st, en);
    if (en <= iss) break;
    const from = Math.max(st, iss);
    sdc += dc(from, en) / len;
    if (s > from) sa += dc(from, Math.min(en, s)) / len;
    if (s >= st && s < en) { dsc = dc(s, en); nl = len; nq = -k; }
    if (st <= iss) break;
  }
  // cupons do 1º real até o vencimento
  let n = 0;
  while (at(n) < m) n++;
  const x = nq + dsc / nl;
  let p = (T * sdc) / pw(q, x);
  for (let k = 1; k <= n; k++) p += (k === n ? red + T : T) / pw(q, x + k);
  if (n === 0) p += red / pw(q, x);
  return p - T * sa;
}
const oddfprice = atpFn('ODDFPRICE', 8, 9, ([s, m, iss, first, r, y, red, fr, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError) return basis;
  const f = Math.trunc(fr!);
  if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
  const ss = Math.trunc(s!), mm = Math.trunc(m!), is = Math.trunc(iss!), fc = Math.trunc(first!);
  if (r! < 0 || y! < 0 || red! <= 0 || !(is < ss && ss < fc && fc < mm)) return ERR.NUM;
  return oddfPrice(ss, mm, is, fc, r!, y!, red!, f, basis, ctx.date1904);
}, { defaults: [0] });
const oddfyield = atpFn('ODDFYIELD', 8, 9, ([s, m, iss, first, r, pr, red, fr, b], ctx) => {
  const basis = basisArg(b!);
  if (basis instanceof CalcError) return basis;
  const f = Math.trunc(fr!);
  if (f !== 1 && f !== 2 && f !== 4) return ERR.NUM;
  const ss = Math.trunc(s!), mm = Math.trunc(m!), is = Math.trunc(iss!), fc = Math.trunc(first!);
  if (r! < 0 || pr! <= 0 || red! <= 0 || !(is < ss && ss < fc && fc < mm)) return ERR.NUM;
  let y = r! || 0.1;
  for (let it = 0; it < 100; it++) {
    const p = oddfPrice(ss, mm, is, fc, r!, y, red!, f, basis, ctx.date1904) - pr!;
    const h = 1e-7;
    const d = (oddfPrice(ss, mm, is, fc, r!, y + h, red!, f, basis, ctx.date1904) - (p + pr!)) / h;
    if (!d || !Number.isFinite(d)) return ERR.NUM;
    const yn = y - p / d;
    if (Math.abs(yn - y) < 1e-12) return yn;
    y = yn;
  }
  return ERR.NUM;
}, { defaults: [0] });

register(
  fv, pv, pmt, ipmt, ppmt, nper, rate, ispmt, rri, pduration,
  npv, irr, mirr, xnpv, xirr, fvschedule, cumipmt, cumprinc, effect, nominal,
  sln, syd, db, ddb, vdb, amordegrc, amorlinc, dollarde, dollarfr,
  coupFn('COUPDAYBS', coupDayBs), coupFn('COUPDAYS', coupDays), coupFn('COUPDAYSNC', coupDaysNc),
  coupFn('COUPNCD', coupNcd), coupFn('COUPNUM', coupNum), coupFn('COUPPCD', coupPcd),
  price, yieldFn, duration, mduration, disc, intrate, received, pricedisc, yielddisc, pricemat, yieldmat,
  accrintm, accrint, tbillprice, tbillyield, tbilleq, oddlprice, oddlyield, oddfprice, oddfyield,
);


