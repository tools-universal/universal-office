/**
 * Matemática e trigonometria (SUM, SUMPRODUCT, ROUND*, MOD, POWER, LOG*, trig, MROUND, CEILING*, FLOOR*, GCD/LCM, FACT*, COMBIN*, BASE/DECIMAL, ROMAN/ARABIC, MMULT/MINVERSE/MDETERM/MUNIT, RAND*…).
 * Dono: agente FN-MATH.
 *
 * Regras medidas no Excel 365 (oráculo pt-BR) — ver também math-util.ts:
 * - SUM: texto/booleano/vazio de referência ou matriz são ignorados; argumento
 *   direto converte; omitido é ignorado (PRODUCT(2;) = 2). A última adição tem o
 *   cancelamento do Excel (SUM(0,1;0,2;−0,3) = 0).
 * - MOD = resto exato (fmod) com o sinal do divisor; |n/d| ≥ 1,1259E12 = #NUM!;
 *   resto que, somado ao divisor, arredonda para o próprio divisor vira 0.
 * - INT/TRUNC/ROUND…/FLOOR/CEILING… usam o número com 15 dígitos significativos;
 *   EVEN/ODD/QUOTIENT não. MROUND: q = x/m; sobe se a parte fracionária ≥ 0,5 − 5E-15.
 * - POWER de base negativa só com expoente 1/ímpar (POWER(−8;1/3) = −2).
 * - SIN/COS/TAN: redução pelo π de 64 bits do x87; |x| ≥ 2^27 = #NUM!.
 */
import { register, type FnContext, type FnDef } from '../fn.js';
import { toText } from '../coerce.js';
import { ArrayValue, CalcError, ERR, RefValue, type Scalar, type Value } from '../values.js';
import {
  approx15, asMatrix, atpFn, atpList, atpNum, atpRaw, cosExt, decimalRound, def, eachNumber, excelPower, fin, num, numFn,
  RoundMode, sinExt, snapAdd, tanExt, TRIG_LIMIT, type Num,
} from './math-util.js';

const X = '_xlfn.';
const MAX_SAFE = 9007199254740992; // 2^53

// ---------------------------------------------------------------------------
// Agregações

const sum: FnDef = def('SUM', 1, 255, 'ref', (args, ctx) => {
  let s = 0, prev = 0, last = 0;
  const err = eachNumber(args, ctx, (n) => { prev = s; last = n; s += n; });
  if (err) return err;
  return fin(snapAdd(prev, last));
});

const product: FnDef = def('PRODUCT', 1, 255, 'ref', (args, ctx) => {
  let p = 1, any = false;
  const err = eachNumber(args, ctx, (n) => { p *= n; any = true; });
  if (err) return err;
  return any ? fin(p) : 0;
});

const sumsq: FnDef = def('SUMSQ', 1, 255, 'ref', (args, ctx) => {
  let s = 0;
  const err = eachNumber(args, ctx, (n) => { s += n * n; });
  if (err) return err;
  return fin(s);
});

/** Matrizes de mesmo tamanho para SUMPRODUCT (escalar = 1×1). */
function sameShape(args: readonly Value[], ctx: FnContext): ArrayValue[] | CalcError {
  const ms: ArrayValue[] = [];
  for (const a of args) {
    const m = asMatrix(a, ctx);
    if (m instanceof CalcError) return m;
    ms.push(m);
  }
  const r = ms[0]!.rows, c = ms[0]!.cols;
  for (const m of ms) if (m.rows !== r || m.cols !== c) return ERR.VALUE;
  return ms;
}

const sumproduct: FnDef = def('SUMPRODUCT', 1, 255, 'array', (args, ctx) => {
  // erro em qualquer matriz propaga antes da checagem de tamanho (matriz a matriz)
  for (const a of args) {
    if (a instanceof CalcError) return a;
    const m = asMatrix(a, ctx);
    if (m instanceof CalcError) return m;
    for (const v of m.data) if (v instanceof CalcError) return v;
  }
  const ms = sameShape(args, ctx);
  if (ms instanceof CalcError) return ms;
  const n = ms[0]!.data.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    let p = 1;
    for (const m of ms) {
      const v = m.data[i];
      if (typeof v !== 'number') { p = 0; break; }
      p *= v;
    }
    s += p;
  }
  return fin(s);
});

/** SUMX2MY2/SUMX2PY2/SUMXMY2: pares em que os dois são números. */
function pairSum(name: string, f: (x: number, y: number) => number): FnDef {
  return def(name, 2, 2, 'array', ([a, b], ctx) => {
    if (a instanceof CalcError) return a;
    if (b instanceof CalcError) return b;
    const ma = asMatrix(a, ctx), mb = asMatrix(b, ctx);
    if (ma instanceof CalcError) return ma;
    if (mb instanceof CalcError) return mb;
    if (ma.data.length !== mb.data.length) return ERR.NA;
    for (const v of ma.data) if (v instanceof CalcError) return v;
    for (const v of mb.data) if (v instanceof CalcError) return v;
    let s = 0, n = 0;
    for (let i = 0; i < ma.data.length; i++) {
      const x = ma.data[i], y = mb.data[i];
      if (typeof x === 'number' && typeof y === 'number') { s += f(x, y); n++; }
    }
    return n ? fin(s) : ERR.DIV0; // medido: nenhum par numérico = #DIV/0!
  });
}

// ---------------------------------------------------------------------------
// Arredondamentos

function roundFn(name: string, mode: RoundMode): FnDef {
  return numFn(name, mode === RoundMode.Down && name === 'TRUNC' ? 1 : 2, 2, ([x, d]) => {
    const dd = Math.trunc(d!);
    if (mode === RoundMode.Half && dd >= 2147483647) return 0; // medido: ROUND(1,5;2^31−1) = 0
    return fin(decimalRound(x!, Math.max(-400, Math.min(400, dd)), mode));
  }, name === 'TRUNC' ? { defaults: [0] } : {});
}

/** INT: ⌊x⌋ do número com 15 dígitos (até 1E15; acima, o próprio ⌊x⌋). */
export function excelInt(x: number): number {
  return Math.floor(Math.abs(x) < 1e15 ? approx15(x) : x);
}

/** Múltiplo de `sig` por ⌈q⌉ ou ⌊q⌋ do quociente com 15 dígitos. */
function stepRound(x: number, sig: number, up: boolean): Num {
  const q = x / sig;
  if (!Number.isFinite(q)) return ERR.NUM;
  const a = approx15(q);
  return fin((up ? Math.ceil(a) : Math.floor(a)) * sig);
}

const ceiling = numFn('CEILING', 2, 2, ([x, s]) => {
  if (s === 0 || x === 0) return 0;
  if (x! > 0 && s! < 0) return ERR.NUM;
  return stepRound(x!, s!, true);
});
const floor = numFn('FLOOR', 2, 2, ([x, s]) => {
  if (x === 0) return 0;
  if (s === 0) return ERR.DIV0;
  if (x! > 0 && s! < 0) return ERR.NUM;
  return stepRound(x!, s!, false);
});
const ceilingMath = numFn('CEILING.MATH', 1, 3, ([x, s, mode]) => {
  const sig = Math.abs(s!);
  if (sig === 0 || x === 0) return 0;
  return stepRound(x!, sig, !(x! < 0 && mode !== 0));
}, { prefix: X, defaults: [1, 0], emptyIsDefault: true });
const floorMath = numFn('FLOOR.MATH', 1, 3, ([x, s, mode]) => {
  const sig = Math.abs(s!);
  if (sig === 0 || x === 0) return 0;
  return stepRound(x!, sig, x! < 0 && mode !== 0);
}, { prefix: X, defaults: [1, 0], emptyIsDefault: true });
const precise = (name: string, up: boolean, prefix?: string): FnDef => numFn(name, 1, 2, ([x, s]) => {
  const sig = Math.abs(s!);
  if (sig === 0 || x === 0) return 0;
  return stepRound(x!, sig, up);
}, { prefix, defaults: [1], emptyIsDefault: true });

const mround = atpFn('MROUND', 2, 2, ([x, m]) => {
  if (m === 0 || x === 0) return 0;
  if ((x! > 0) !== (m! > 0)) return ERR.NUM;
  const q = x! / m!;
  if (!Number.isFinite(q)) return ERR.NUM;
  let n = Math.floor(q);
  if (q - n >= 0.5 - 5e-15) n += 1;
  return fin(n * m!);
});

/** EVEN/ODD: ⌈|x|⌉ até o par/ímpar seguinte, longe do zero (sem os 15 dígitos). */
const even = numFn('EVEN', 1, 1, ([x]) => {
  let n = Math.ceil(Math.abs(x!));
  if (n % 2) n += 1;
  return x! < 0 ? -n : n;
});
const odd = numFn('ODD', 1, 1, ([x]) => {
  let n = Math.ceil(Math.abs(x!));
  if (n % 2 === 0) n += 1;
  return x! < 0 ? -n : n;
});

// ---------------------------------------------------------------------------
// Aritmética

const mod = numFn('MOD', 2, 2, ([n, d]) => {
  if (d === 0) return ERR.DIV0;
  if (Math.abs(n! / d!) >= 1.1259e12) return ERR.NUM;
  let r = n! % d!;
  if (r !== 0 && (r < 0) !== (d! < 0)) {
    r += d!;
    if (r === d) r = 0;
  }
  return r;
});

const power = numFn('POWER', 2, 2, ([x, y]) => excelPower(x!, y!));

const quotient = atpFn('QUOTIENT', 2, 2, ([n, d]) => {
  if (d === 0) return ERR.DIV0;
  return fin(Math.trunc(n! / d!));
});

const sqrt = numFn('SQRT', 1, 1, ([x]) => (x! < 0 ? ERR.NUM : Math.sqrt(x!)));
const sqrtpi = atpFn('SQRTPI', 1, 1, ([x]) => (x! < 0 ? ERR.NUM : Math.sqrt(x! * Math.PI)));
const exp = numFn('EXP', 1, 1, ([x]) => fin(Math.exp(x!)));
const ln = numFn('LN', 1, 1, ([x]) => (x! <= 0 ? ERR.NUM : Math.log(x!)));
const log10 = numFn('LOG10', 1, 1, ([x]) => (x! <= 0 ? ERR.NUM : Math.log10(x!)));
const log: FnDef = numFn('LOG', 1, 2, ([x, b]) => {
  if (x! <= 0) return ERR.NUM;
  if (b === undefined) return Math.log10(x!);
  if (b <= 0) return ERR.NUM;
  if (b === 1) return ERR.DIV0;
  return Math.log(x!) / Math.log(b);
});

const abs = numFn('ABS', 1, 1, ([x]) => Math.abs(x!));
const sign = numFn('SIGN', 1, 1, ([x]) => (x! > 0 ? 1 : x! < 0 ? -1 : 0));
const int = numFn('INT', 1, 1, ([x]) => excelInt(x!));

// ---------------------------------------------------------------------------
// Fatoriais e combinações

/** n! por produto decrescente (bate bit a bit com o Excel); > 170 = #NUM!. */
export function factorial(n: number): Num {
  if (n < 0) return ERR.NUM;
  n = Math.trunc(n);
  if (n > 170) return ERR.NUM;
  let p = 1;
  for (let i = n; i > 1; i--) p *= i;
  return p;
}

const fact = numFn('FACT', 1, 1, ([x]) => factorial(x!));
const factdouble = atpFn('FACTDOUBLE', 1, 1, ([x]) => {
  if (x! < -1) return ERR.NUM;
  const n = Math.trunc(x!);
  if (n > 400) return ERR.NUM; // estoura bem antes (300!! ≈ 8,2E307)
  let p = 1;
  for (let i = n; i > 1; i -= 2) p *= i;
  return fin(p);
});

/**
 * C(n,k) com n,k já inteiros válidos. O Excel não arredonda o resultado
 * (COMBIN(40;20) = 137846528819,99997); este produto é o que mais se aproxima
 * dele (24 de 25 casos medidos iguais em 15 dígitos; o algoritmo exato não foi achado).
 */
export function binomial(n: number, k: number): number {
  if (k > n - k) k = n - k;
  let r = 1;
  for (let i = 1; i <= k; i++) r *= (n - k + i) / i;
  return r;
}

const combin = numFn('COMBIN', 2, 2, ([nn, kk]) => {
  const n = Math.trunc(nn!), k = Math.trunc(kk!);
  if (n < 0 || k < 0 || k > n) return ERR.NUM;
  if (n >= 2147483647) return ERR.NUM; // medido: COMBIN(1E9;3) ok, COMBIN(2147483647;1) = #NUM!
  return fin(binomial(n, k));
});
const combina = numFn('COMBINA', 2, 2, ([nn, kk]) => {
  const n = Math.trunc(nn!), k = Math.trunc(kk!);
  if (n < 0 || k < 0) return ERR.NUM;
  if (n === 0 && k === 0) return 1;
  if (k > n + k - 1) return ERR.NUM;
  return fin(binomial(n + k - 1, k));
}, { prefix: X });

function gcd2(a: number, b: number): number {
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

const gcd: FnDef = def('GCD', 1, 255, 'any', (args, ctx) => {
  const xs = atpList(args, ctx);
  if (xs instanceof CalcError) return xs;
  let g = 0;
  for (const x of xs) {
    if (x < 0 || x > MAX_SAFE) return ERR.NUM;
    g = gcd2(g, Math.trunc(x));
  }
  return g;
});
const lcm: FnDef = def('LCM', 1, 255, 'any', (args, ctx) => {
  const xs = atpList(args, ctx);
  if (xs instanceof CalcError) return xs;
  let l = 1;
  for (const x of xs) {
    if (x < 0 || x > MAX_SAFE) return ERR.NUM;
    const n = Math.trunc(x);
    if (n === 0) return 0;
    l = (l / gcd2(l, n)) * n;
    if (l > MAX_SAFE) return ERR.NUM;
  }
  return l;
});

const multinomial: FnDef = def('MULTINOMIAL', 1, 255, 'any', (args, ctx) => {
  const xs = atpList(args, ctx);
  if (xs instanceof CalcError) return xs;
  let s = 0, r = 1;
  for (const x of xs) {
    if (x < 0) return ERR.NUM;
    const n = Math.trunc(x);
    if (s + n > 170) return ERR.NUM;
    for (let i = 1; i <= n; i++) { s += 1; r = (r * s) / i; }
  }
  if (s > 170) return ERR.NUM;
  return fin(r);
});

/**
 * SERIESSUM (ATP). Coeficientes: direto converte texto-número; matriz só números;
 * intervalo pula células vazias (o coeficiente seguinte usa a potência seguinte) e
 * texto = #VALUE!. Termo com potência indefinida (base negativa, expoente não
 * inteiro) conta 0; 0 elevado a expoente <= 0 = #NUM!.
 */
const seriessum: FnDef = def('SERIESSUM', 4, 4, 'any', (args, ctx) => {
  const xs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const r = atpRaw(args[i], ctx);
    if (r instanceof ArrayValue) return ERR.VALUE;
    const n = atpNum(r, ctx);
    if (n instanceof CalcError) return n;
    xs.push(n);
  }
  const cs: number[] = [];
  const a = args[3] as Value;
  if (a === null) return ERR.NA;
  if (a instanceof RefValue) {
    for (const area of a.areas) {
      let err: CalcError | undefined;
      ctx.forEachCell(area, (v) => {
        if (err || v === null) return;
        if (typeof v === 'number') cs.push(v);
        else err = v instanceof CalcError ? v : ERR.VALUE;
      });
      if (err) return err;
    }
  } else if (a instanceof ArrayValue) {
    for (const v of a.data) {
      if (v instanceof CalcError) return v;
      if (typeof v !== 'number') return ERR.VALUE;
      cs.push(v);
    }
  } else {
    const n = atpNum(a as Scalar, ctx);
    if (n instanceof CalcError) return n;
    cs.push(n);
  }
  const [x, n, step] = xs as [number, number, number];
  let s = 0;
  for (let i = 0; i < cs.length; i++) {
    const e = n + i * step;
    if (x === 0 && e <= 0) return ERR.NUM;
    const p = Math.pow(x, e);
    if (Number.isNaN(p)) continue;
    s += cs[i]! * p;
  }
  return fin(s);
}, { acceptsErrors: true });

// ---------------------------------------------------------------------------
// Constantes e aleatórios

const pi = def('PI', 0, 0, 'value', () => Math.PI);
const rand = def('RAND', 0, 0, 'value', (_a, ctx) => ctx.random(), { volatile: true });
const randbetween = atpFn('RANDBETWEEN', 2, 2, ([a, b], ctx) => {
  const lo = Math.ceil(a!), hi = Math.ceil(b!);
  if (lo > hi) return ERR.NUM;
  return lo + Math.floor(ctx.random() * (hi - lo + 1));
}, { volatile: true });

// ---------------------------------------------------------------------------
// Trigonometria

const trig = (name: string, f: (x: number) => Num, prefix?: string): FnDef => numFn(name, 1, 1, ([x]) => {
  if (Math.abs(x!) >= TRIG_LIMIT) return ERR.NUM;
  return f(x!);
}, prefix ? { prefix } : {});

const sin = trig('SIN', sinExt);
const cos = trig('COS', cosExt);
const tan = trig('TAN', tanExt);
const cot = trig('COT', (x) => (x === 0 ? ERR.DIV0 : fin(1 / tanExt(x))), X);
const sec = trig('SEC', (x) => fin(1 / cosExt(x)), X);
const csc = trig('CSC', (x) => (x === 0 ? ERR.DIV0 : fin(1 / sinExt(x))), X);

const asin = numFn('ASIN', 1, 1, ([x]) => (Math.abs(x!) > 1 ? ERR.NUM : Math.asin(x!)));
const acos = numFn('ACOS', 1, 1, ([x]) => (Math.abs(x!) > 1 ? ERR.NUM : Math.PI / 2 - Math.asin(x!))); // medido: π/2 − asin
const atan = numFn('ATAN', 1, 1, ([x]) => Math.atan(x!));
const atan2 = numFn('ATAN2', 2, 2, ([x, y]) => {
  if (x === 0) return y === 0 ? ERR.DIV0 : Math.atan2(y!, 0);
  if (!Number.isFinite(y! / x!)) return ERR.NUM; // medido: ATAN2(1E-200;1E200) = #NUM!
  return Math.atan2(y!, x!);
});
const acot = numFn('ACOT', 1, 1, ([x]) => (x === 0 ? Math.PI / 2 : x! > 0 ? Math.atan(1 / x!) : Math.PI + Math.atan(1 / x!)), { prefix: X });
// Hiperbólicas (medido bit a bit contra o Excel): SINH = seno hiperbólico preciso
// (#NUM! quando e^|x| estoura); COSH = (e^x + e^−x)/2; TANH = SINH/COSH; COTH =
// 1/TANH; CSCH = 1/SINH; SECH = 1/COSH. ASINH/ACOSH/ATANH pelas fórmulas com ln.
const EXP_MAX = 709.782712893384;
function coshX(x: number): number { return (Math.exp(x) + Math.exp(-x)) / 2; }
function tanhX(x: number): number {
  if (Math.abs(x) > EXP_MAX) return x > 0 ? 1 : -1;
  return Math.sinh(x) / coshX(x);
}
const sinh = numFn('SINH', 1, 1, ([x]) => (Math.abs(x!) > EXP_MAX ? ERR.NUM : Math.sinh(x!)));
const cosh = numFn('COSH', 1, 1, ([x]) => (Math.abs(x!) > EXP_MAX ? ERR.NUM : fin(coshX(x!))));
const tanh = numFn('TANH', 1, 1, ([x]) => tanhX(x!));
const coth = numFn('COTH', 1, 1, ([x]) => (x === 0 ? ERR.DIV0 : fin(1 / tanhX(x!))), { prefix: X });
const sech = numFn('SECH', 1, 1, ([x]) => (Math.abs(x!) > EXP_MAX ? 0 : fin(1 / coshX(x!))), { prefix: X });
const csch = numFn('CSCH', 1, 1, ([x]) => (x === 0 ? ERR.DIV0 : Math.abs(x!) > EXP_MAX ? 0 : fin(1 / Math.sinh(x!))), { prefix: X });
const asinh = numFn('ASINH', 1, 1, ([x]) => { const ax = Math.abs(x!); const v = Math.log(ax + Math.sqrt(ax * ax + 1)); return fin(x! < 0 ? -v : v); });
const acosh = numFn('ACOSH', 1, 1, ([x]) => (x! < 1 ? ERR.NUM : fin(Math.log(x! + Math.sqrt(x! * x! - 1)))));
const atanh = numFn('ATANH', 1, 1, ([x]) => {
  const a = Math.abs(x!);
  if (a >= 1) return ERR.NUM;
  // medido: perto de 0 o Excel é preciso (ATANH(1E-10) = 1E-10); a partir de ~1E-3, ln((1+x)/(1−x))
  return a <= 1e-4 ? Math.atanh(x!) : 0.5 * Math.log((1 + x!) / (1 - x!));
});
const acoth = numFn('ACOTH', 1, 1, ([x]) => {
  const ax = Math.abs(x!);
  if (ax <= 1) return ERR.NUM;
  const v = 0.5 * Math.log1p(2 / (ax - 1));
  return x! < 0 ? -v : v;
}, { prefix: X });
// medido: x·(π/180) — SIN(RADIANS(178)) = 0,03489949670250114 e RADIANS(1E10) = 174532925,19943297
// (com (x·π)/180 o último bit difere e o seno perto de π herda o erro no 14º dígito)
const radians = numFn('RADIANS', 1, 1, ([x]) => fin(x! * (Math.PI / 180)));
const degrees = numFn('DEGREES', 1, 1, ([x]) => fin(x! * (180 / Math.PI)));

// ---------------------------------------------------------------------------
// Bases e romanos

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const base = numFn('BASE', 2, 3, ([n, r, len]) => {
  const radix = Math.trunc(r!), minLen = Math.trunc(len!);
  if (n! < 0 || n! >= MAX_SAFE || radix < 2 || radix > 36 || minLen < 0 || minLen > 255) return ERR.NUM;
  let v = Math.trunc(n!);
  let s = '';
  do { s = DIGITS[v % radix] + s; v = Math.floor(v / radix); } while (v > 0);
  return s.padStart(minLen, '0');
}, { prefix: X, defaults: [0] });

const decimal: FnDef = def('DECIMAL', 2, 2, 'value', ([t, r], ctx) => {
  const text = toText(t as Scalar, ctx.locale);
  if (text instanceof CalcError) return text;
  const rn = num(r as Scalar, ctx);
  if (rn instanceof CalcError) return rn;
  const radix = Math.trunc(rn);
  if (radix < 2 || radix > 36 || text.length > 255) return ERR.NUM;
  // medido: espaços à esquerda são ignorados (à direita não); base 16 aceita prefixo "0x"/"x"
  let body = text.replace(/^ +/, '').toUpperCase();
  if (radix === 16) body = body.replace(/^0?X/, '');
  let v = 0;
  for (const ch of body) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= radix) return ERR.NUM;
    v = v * radix + d;
  }
  return v;
}, { prefix: X, lift: true, acceptsErrors: true });

const RCH = ['M', 'D', 'C', 'L', 'X', 'V', 'I'];
const RVAL = [1000, 500, 100, 50, 10, 5, 1];

/** Romano nas formas 0 (clássica) a 4 (simplificada), como o Excel. */
export function toRoman(value: number, mode: number): string {
  let val = value, out = '';
  const maxIndex = RVAL.length - 1;
  for (let i = 0; i <= maxIndex / 2; i++) {
    let index = 2 * i;
    const digit = Math.floor(val / RVAL[index]!);
    if (digit % 5 === 4) {
      const index2 = digit === 4 ? index - 1 : index - 2;
      let steps = 0;
      while (steps < mode && index < maxIndex) {
        steps++;
        if (RVAL[index2]! - RVAL[index + 1]! <= val) index++;
        else steps = mode;
      }
      out += RCH[index]! + RCH[index2]!;
      val = val + RVAL[index]! - RVAL[index2]!;
    } else {
      if (digit > 4) out += RCH[index - 1]!;
      out += RCH[index]!.repeat(digit % 5);
      val %= RVAL[index]!;
    }
  }
  return out;
}

const roman: FnDef = def('ROMAN', 1, 2, 'value', (args, ctx) => {
  const n = num(args[0] as Scalar, ctx);
  if (n instanceof CalcError) return n;
  let mode = 0;
  if (args.length > 1) {
    const f = args[1] as Scalar;
    if (typeof f === 'boolean') mode = f ? 0 : 4;
    else if (f !== null) {
      const m = num(f, ctx);
      if (m instanceof CalcError) return m;
      mode = Math.trunc(m);
    }
  }
  const v = Math.trunc(n);
  if (v < 0 || v > 3999 || mode < 0 || mode > 4) return ERR.VALUE;
  return toRoman(v, mode);
}, { lift: true, acceptsErrors: true });

const ARV: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const arabic: FnDef = def('ARABIC', 1, 1, 'value', ([t], ctx) => {
  const s0 = toText(t as Scalar, ctx.locale);
  if (s0 instanceof CalcError) return s0;
  let s = s0.trim().toUpperCase();
  if (s.length > 255) return ERR.VALUE;
  let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  // medido: da direita para a esquerda, subtrai o que for menor que o maior já visto (IIV = 3)
  let total = 0, max = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const v = ARV[s[i]!];
    if (v === undefined) return ERR.VALUE;
    if (v < max) total -= v; else { total += v; max = v; }
  }
  return neg ? -total : total;
}, { prefix: X, lift: true, acceptsErrors: true });

// ---------------------------------------------------------------------------
// Matrizes

/** Matriz numérica (qualquer não número = #VALUE!; erro propaga). */
function numericMatrix(v: Value, ctx: FnContext): { r: number; c: number; a: number[] } | CalcError {
  const m = asMatrix(v, ctx);
  if (m instanceof CalcError) return m;
  const a: number[] = new Array(m.data.length);
  for (let i = 0; i < m.data.length; i++) {
    const x = m.data[i];
    if (x instanceof CalcError) return x;
    if (typeof x !== 'number') return ERR.VALUE;
    a[i] = x;
  }
  return { r: m.rows, c: m.cols, a };
}

const mmult: FnDef = def('MMULT', 2, 2, 'array', ([x, y], ctx) => {
  if (x instanceof CalcError) return x;
  if (y instanceof CalcError) return y;
  const a = numericMatrix(x, ctx), b = numericMatrix(y, ctx);
  if (a instanceof CalcError) return a;
  if (b instanceof CalcError) return b;
  if (a.c !== b.r) return ERR.VALUE;
  return ArrayValue.fill(a.r, b.c, (i, j) => {
    let s = 0;
    for (let k = 0; k < a.c; k++) s += a.a[i * a.c + k]! * b.a[k * b.c + j]!;
    return fin(s);
  });
});

/** Decomposição LU com pivotamento parcial (in place). Devolve o sinal da permutação ou 0 se singular. */
function luDecompose(a: number[], n: number, perm: number[]): number {
  let sgn = 1;
  for (let i = 0; i < n; i++) perm[i] = i;
  for (let k = 0; k < n; k++) {
    let p = k, best = Math.abs(a[k * n + k]!);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(a[i * n + k]!);
      if (v > best) { best = v; p = i; }
    }
    if (best === 0) return 0;
    if (p !== k) {
      for (let j = 0; j < n; j++) { const t = a[k * n + j]!; a[k * n + j] = a[p * n + j]!; a[p * n + j] = t; }
      const t = perm[k]!; perm[k] = perm[p]!; perm[p] = t;
      sgn = -sgn;
    }
    const piv = a[k * n + k]!;
    for (let i = k + 1; i < n; i++) {
      const f = a[i * n + k]! / piv;
      a[i * n + k] = f;
      if (f !== 0) for (let j = k + 1; j < n; j++) a[i * n + j] = a[i * n + j]! - f * a[k * n + j]!;
    }
  }
  return sgn;
}

const mdeterm: FnDef = def('MDETERM', 1, 1, 'array', ([x], ctx) => {
  if (x instanceof CalcError) return x;
  const m = numericMatrix(x, ctx);
  if (m instanceof CalcError) return m;
  if (m.r !== m.c) return ERR.VALUE;
  const n = m.r, a = m.a.slice(), perm: number[] = [];
  const sgn = luDecompose(a, n, perm);
  if (sgn === 0) return 0;
  let d = sgn;
  for (let i = 0; i < n; i++) d *= a[i * n + i]!;
  return fin(d);
});

/** MINVERSE: LU com pivotamento parcial e substituições por coluna (13 de 14 casos medidos iguais em 15 dígitos). */
const minverse: FnDef = def('MINVERSE', 1, 1, 'array', ([x], ctx) => {
  if (x instanceof CalcError) return x;
  const m = numericMatrix(x, ctx);
  if (m instanceof CalcError) return m;
  if (m.r !== m.c) return ERR.VALUE;
  const n = m.r, a = m.a.slice(), perm: number[] = [];
  if (luDecompose(a, n, perm) === 0) return ERR.NUM;
  const inv: number[] = new Array(n * n).fill(0);
  for (let col = 0; col < n; col++) {
    // resolve L·U·x = P·e_col
    const y: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = perm[i] === col ? 1 : 0;
      for (let k = 0; k < i; k++) s -= a[i * n + k]! * y[k]!;
      y[i] = s;
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i]!;
      for (let k = i + 1; k < n; k++) s -= a[i * n + k]! * inv[k * n + col]!;
      inv[i * n + col] = s / a[i * n + i]!;
    }
  }
  for (const v of inv) if (!Number.isFinite(v)) return ERR.NUM;
  return ArrayValue.fill(n, n, (i, j) => (inv[i * n + j] === 0 ? 0 : inv[i * n + j]!));
});

const munit = numFn('MUNIT', 1, 1, ([x]) => {
  const n = Math.trunc(x!);
  if (n < 1) return ERR.VALUE;
  if (n > 1048576) return ERR.VALUE;
  return ArrayValue.fill(n, n, (i, j) => (i === j ? 1 : 0));
}, { prefix: X });
// MUNIT devolve matriz: não é levantada elemento a elemento
const munitDef: FnDef = { ...munit, lift: false };

/**
 * ROUNDBAHTDOWN/ROUNDBAHTUP (arredondamento do baht tailandês). Medido: no Excel do
 * oráculo (sem o recurso de idioma tailandês) dão sempre #VALUE! — erros dos
 * argumentos propagam e matrizes são levantadas.
 */
const bahtFn = (name: string): FnDef => ({ name, minArgs: 1, maxArgs: 1, args: 'value', lift: true, call: () => ERR.VALUE });

register(
  bahtFn('ROUNDBAHTDOWN'), bahtFn('ROUNDBAHTUP'),
  sum, product, sumsq, sumproduct,
  pairSum('SUMX2MY2', (x, y) => x * x - y * y),
  pairSum('SUMX2PY2', (x, y) => x * x + y * y),
  pairSum('SUMXMY2', (x, y) => (x - y) * (x - y)),
  roundFn('ROUND', RoundMode.Half), roundFn('ROUNDUP', RoundMode.Up), roundFn('ROUNDDOWN', RoundMode.Down), roundFn('TRUNC', RoundMode.Down),
  // medido: ECMA.CEILING é o CEILING antigo (sinais, 0, texto, 1E300 c/ 3 → 9,99999999999999E+299)
  int, ceiling, { ...ceiling, name: 'ECMA.CEILING' }, floor, ceilingMath, floorMath,
  precise('CEILING.PRECISE', true, X), precise('ISO.CEILING', true), precise('FLOOR.PRECISE', false, X),
  mround, even, odd, mod, power, quotient, sqrt, sqrtpi, exp, ln, log10, log, abs, sign,
  fact, factdouble, combin, combina, gcd, lcm, multinomial, seriessum,
  pi, rand, randbetween,
  sin, cos, tan, cot, sec, csc, asin, acos, atan, atan2, acot,
  sinh, cosh, tanh, coth, sech, csch, asinh, acosh, atanh, acoth, radians, degrees,
  base, decimal, roman, arabic,
  mmult, mdeterm, minverse, munitDef,
);
