/**
 * ln, log10, log1p, exp e expm1 CORRETAMENTE ARREDONDADOS (aritmética double-double,
 * ~106 bits). Dono: agente CALC-FIX.
 *
 * Medido no Excel 365 (entradas com os bits exatos, 300 valores por função): LN e
 * LOG10 do Excel são o valor corretamente arredondado em 300/300 (o Math.log do V8
 * erra 1 ulp em 5/300 e o Math.log10 em 44/300); EXP bate em 290/300 (V8: 267/300 —
 * os que sobram são ±1 ulp com |x| > 270). POWER com expoente não inteiro é
 * exp(y·ln x) em double sobre essas funções. O seno/cosseno do Excel NÃO são os
 * corretamente arredondados (SIN(2,5) erra 1 ulp) — ficam com o Math do V8.
 */

// --- aritmética double-double (sem FMA: divisão de Dekker) -------------------

const SPLIT = 134217729; // 2^27 + 1
let H = 0, L = 0; // resultado das operações (evita alocar)

function twoSum(a: number, b: number): void {
  const s = a + b, bb = s - a;
  H = s; L = (a - (s - bb)) + (b - bb);
}
function quickTwoSum(a: number, b: number): void {
  const s = a + b;
  H = s; L = b - (s - a);
}
function twoProd(a: number, b: number): void {
  const p = a * b;
  let t = SPLIT * a; const ah = t - (t - a), al = a - ah;
  t = SPLIT * b; const bh = t - (t - b), bl = b - bh;
  H = p; L = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
}
/** (ah, al) + (bh, bl). */
function ddAdd(ah: number, al: number, bh: number, bl: number): void {
  twoSum(ah, bh);
  const sh = H, sl = L;
  twoSum(al, bl);
  const th = H, tl = L;
  quickTwoSum(sh, sl + th);
  quickTwoSum(H, L + tl);
}
/** (ah, al) · (bh, bl). */
function ddMul(ah: number, al: number, bh: number, bl: number): void {
  twoProd(ah, bh);
  const ph = H, pl = L + (ah * bl + al * bh);
  quickTwoSum(ph, pl);
}
/** (ah, al) / (bh, bl). */
function ddDiv(ah: number, al: number, bh: number, bl: number): void {
  const q1 = ah / bh;
  ddMul(q1, 0, bh, bl);
  ddAdd(ah, al, -H, -L);
  const rh = H, rl = L;
  const q2 = rh / bh;
  ddMul(q2, 0, bh, bl);
  ddAdd(rh, rl, -H, -L);
  const q3 = H / bh;
  quickTwoSum(q1, q2);
  ddAdd(H, L, q3, 0);
}

const LN2_H = 0.6931471805599453, LN2_L = 2.3190468138462996e-17;
const INV_LN10_H = 0.4342944819032518, INV_LN10_L = 1.098319650216765e-17;

/** Coeficientes 1/(2j+1) em double-double (série de atanh). */
const ATANH_C: [number, number][] = [];
for (let j = 0; j <= 22; j++) { ddDiv(1, 0, 2 * j + 1, 0); ATANH_C.push([H, L]); }
/** Coeficientes 1/n! (n = 1..12) em double-double (série de expm1). */
const FACT_C: [number, number][] = [];
{
  let fh = 1, fl = 0;
  for (let n = 1; n <= 12; n++) {
    ddDiv(fh, fl, n, 0); fh = H; fl = L; // 1/n! = (1/(n−1)!)/n
    FACT_C.push([fh, fl]);
  }
}

const view = new DataView(new ArrayBuffer(8));

/** ln(x) em double-double (x > 0 finito) → (H, L). */
function lnDD(x: number): void {
  // x = m·2^k com m em [√½; √2)
  let k = 0;
  if (x < 2.2250738585072014e-308) { x *= 18014398509481984; k = -54; } // subnormal: ×2^54
  view.setFloat64(0, x);
  const hi = view.getUint32(0);
  k += ((hi >>> 20) & 0x7ff) - 1023;
  view.setUint32(0, (hi & 0x800fffff) | 0x3ff00000);
  let m = view.getFloat64(0);
  if (m > Math.SQRT2) { m /= 2; k++; }
  // ln m = 2·atanh(s), s = (m−1)/(m+1)
  const f = m - 1; // exato (Sterbenz)
  twoSum(m, 1);
  ddDiv(f, 0, H, L);
  const sh = H, sl = L;
  ddMul(sh, sl, sh, sl);
  const s2h = H, s2l = L;
  let ph = ATANH_C[22]![0], pl = ATANH_C[22]![1];
  for (let j = 21; j >= 0; j--) {
    ddMul(ph, pl, s2h, s2l);
    ddAdd(H, L, ATANH_C[j]![0], ATANH_C[j]![1]);
    ph = H; pl = L;
  }
  ddMul(ph, pl, sh, sl);
  const lmh = 2 * H, lml = 2 * L;
  if (k === 0) { H = lmh; L = lml; return; }
  twoProd(k, LN2_H);
  const kh = H, kl = L + k * LN2_L;
  ddAdd(kh, kl, lmh, lml);
}

/** ln(x) corretamente arredondado. */
export function crLog(x: number): number {
  if (!(x > 0) || x === Infinity) return x === 0 ? -Infinity : x === Infinity ? Infinity : NaN;
  if (x === 1) return 0;
  lnDD(x);
  return H + L;
}

/** log10(x) corretamente arredondado (potências de 10 exatas). */
export function crLog10(x: number): number {
  if (!(x > 0) || x === Infinity) return x === 0 ? -Infinity : x === Infinity ? Infinity : NaN;
  if (x === 1) return 0;
  lnDD(x);
  ddMul(H, L, INV_LN10_H, INV_LN10_L);
  return H + L;
}

/** ln(1+x) corretamente arredondado. */
export function crLog1p(x: number): number {
  if (!(x > -1)) return x === -1 ? -Infinity : NaN;
  if (x === Infinity) return Infinity;
  if (x === 0) return x;
  twoSum(1, x);
  const h = H, l = L;
  if (h === 1) return l === 0 ? 0 : crRound(l); // 1+x arredonda para 1: ln(1+x) = x − x²/2… ≈ x
  lnDD(h);
  // ln(h + l) = ln h + l/h (o termo seguinte é < 2^−106 relativo)
  ddAdd(H, L, l / h, 0);
  return H + L;
}
const crRound = (x: number): number => x - (x * x) / 2;

/** expm1(r) em double-double para |r| ≤ ~0,35 → (H, L). */
function expm1Small(rh: number, rl: number): void {
  // r' = r/512; série de Taylor; volta elevando ao quadrado: e^(2a)−1 = u·(u+2)
  const ah = rh / 512, al = rl / 512;
  let ph = FACT_C[11]![0], pl = FACT_C[11]![1];
  for (let n = 10; n >= 0; n--) {
    ddMul(ph, pl, ah, al);
    ddAdd(H, L, FACT_C[n]![0], FACT_C[n]![1]);
    ph = H; pl = L;
  }
  ddMul(ph, pl, ah, al);
  let uh = H, ul = L;
  for (let i = 0; i < 9; i++) {
    ddAdd(uh, ul, 2, 0);
    ddMul(uh, ul, H, L);
    uh = H; ul = L;
  }
  H = uh; L = ul;
}

/** e^x corretamente arredondado (até o subnormal). */
export function crExp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019412) return 0;
  if (x === 0) return 1;
  const k = Math.round(x / LN2_H);
  twoProd(k, LN2_H);
  const th = H, tl = L + k * LN2_L;
  ddAdd(x, 0, -th, -tl);
  expm1Small(H, L);
  ddAdd(H, L, 1, 0);
  const v = H + L;
  // 2^k em duas etapas (k pode passar de 1023/−1022)
  const k1 = k >> 1, k2 = k - k1;
  return v * Math.pow(2, k1) * Math.pow(2, k2);
}

/** e^(zh + zl) arredondado a double (|z| ≤ ~745). */
function expOfDD(zh: number, zl: number): number {
  if (zh > 709.782712893384) return Infinity;
  if (zh < -745.1332191019412) return 0;
  const k = Math.round(zh / LN2_H);
  twoProd(k, LN2_H);
  const th = H, tl = L + k * LN2_L;
  ddAdd(zh, zl, -th, -tl);
  expm1Small(H, L);
  ddAdd(H, L, 1, 0);
  const v = H + L;
  const k1 = k >> 1, k2 = k - k1;
  return v * Math.pow(2, k1) * Math.pow(2, k2);
}

/**
 * x^y corretamente arredondado (x > 0): o pow() da biblioteca C, que as funções do
 * antigo Analysis ToolPak (PRICE, YIELD…) usam.
 */
export function crPow(x: number, y: number): number {
  if (y === 0 || x === 1) return 1;
  if (!(x > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return Math.pow(x, y);
  lnDD(x);
  ddMul(H, L, y, 0);
  return expOfDD(H, L);
}

/** log2(e) arredondado a 64 bits de mantissa (a constante do x87), em double-double exato. */
const L2E64_H = 1.4426950408889634, L2E64_L = 2.0383000842727483e-17;

/** Arredonda o double-double (h, l) a 64 bits de mantissa (meio para o par) → (H, L). */
function round64(h: number, l: number): void {
  if (h === 0) { H = 0; L = 0; return; }
  let e = Math.floor(Math.log2(Math.abs(h)));
  if (Math.pow(2, e) > Math.abs(h)) e--; // log2 pode arredondar para cima
  else if (Math.pow(2, e + 1) <= Math.abs(h)) e++;
  if (Math.abs(h) === Math.pow(2, e) && l !== 0 && (l < 0) !== (h < 0)) e--; // logo abaixo de 2^e
  const q = Math.pow(2, e - 63);
  // h/q é inteiro (múltiplo de 2^10); o arredondamento fica em l/q
  const nl = l / q;
  let k = Math.round(nl);
  if (Math.abs(nl - Math.trunc(nl)) === 0.5) k = 2 * Math.round(nl / 2); // empate: par (h/q é par)
  quickTwoSum(h, k * q);
}

/**
 * EXP do Excel (x87): t = x·log2(e) arredondado a 64 bits, resultado = 2^t arredondado
 * a double. Medido: bate com o Excel em 300/300 valores (o e^x corretamente
 * arredondado erra ±1 ulp em 10/300 com |x| > 270).
 */
export function xlExp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019412) return 0;
  if (x === 0) return 1;
  twoProd(x, L2E64_H);
  quickTwoSum(H, L + x * L2E64_L);
  round64(H, L);
  const th = H, tl = L;
  const n = Math.round(th);
  ddAdd(th, tl, -n, 0); // f = t − n, |f| ≤ ½
  ddMul(H, L, LN2_H, LN2_L); // f·ln 2
  expm1Small(H, L);
  ddAdd(H, L, 1, 0);
  const v = H + L;
  const k1 = n >> 1, k2 = n - k1;
  return v * Math.pow(2, k1) * Math.pow(2, k2);
}

// --- trigonométricas do Excel -----------------------------------------------
// Medido (bits exatos): SIN/COS/TAN = valor exato de sen/cos/tg do argumento reduzido
// com π arredondado a 64 bits (o π do x87), arredondado a double — 200/200 cada, inclusive
// |x| até 1000 e SIN(2,5) = 0,5984721441039565 (o seno correto é …564).

/** (π com 64 bits)/2 em double-double exato. */
const P2_H = 1.5707963267948966, P2_L = 6.1257422745431e-17;
/** π/2 em double-double (para ATAN). */
const PIO2_H = 1.5707963267948966, PIO2_L = 6.123233995736766e-17;
/** 1/n! (n = 0..27) em double-double, para as séries de sen/cos. */
const INV_FACT: [number, number][] = [[1, 0]];
{
  let fh = 1, fl = 0;
  for (let n = 1; n <= 27; n++) { ddDiv(fh, fl, n, 0); fh = H; fl = L; INV_FACT.push([fh, fl]); }
}

let RQ = 0, RH = 0, RL = 0; // quadrante e argumento reduzido
function reduce(x: number): void {
  const k = Math.round(x / P2_H);
  if (k === 0) { RQ = 0; RH = x; RL = 0; return; }
  twoProd(k, P2_H);
  const ph = H, pl = L;
  ddAdd(x, 0, -ph, -pl);
  ddAdd(H, L, -k * P2_L, 0); // k·P2_L é exato (P2_L tem 11 bits)
  RQ = ((k % 4) + 4) % 4; RH = H; RL = L;
}
/** sen(y) em double-double, |y| ≲ π/4 → (H, L). */
function sinDD(yh: number, yl: number): void {
  ddMul(yh, yl, yh, yl);
  const y2h = -H, y2l = -L; // −y²
  let ph = INV_FACT[27]![0], pl = INV_FACT[27]![1];
  for (let n = 25; n >= 1; n -= 2) {
    ddMul(ph, pl, y2h, y2l);
    ddAdd(H, L, INV_FACT[n]![0], INV_FACT[n]![1]);
    ph = H; pl = L;
  }
  ddMul(ph, pl, yh, yl);
}
/** cos(y) em double-double, |y| ≲ π/4 → (H, L). */
function cosDD(yh: number, yl: number): void {
  ddMul(yh, yl, yh, yl);
  const y2h = -H, y2l = -L;
  let ph = INV_FACT[26]![0], pl = INV_FACT[26]![1];
  for (let n = 24; n >= 0; n -= 2) {
    ddMul(ph, pl, y2h, y2l);
    ddAdd(H, L, INV_FACT[n]![0], INV_FACT[n]![1]);
    ph = H; pl = L;
  }
}
/** SIN do Excel. */
export function xlSin(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  if (x === 0) return x;
  reduce(x);
  const q = RQ, yh = RH, yl = RL;
  if (q === 0 || q === 2) sinDD(yh, yl); else cosDD(yh, yl);
  const v = H + L;
  return q >= 2 ? -v : v;
}
/** COS do Excel. */
export function xlCos(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  reduce(x);
  const q = RQ, yh = RH, yl = RL;
  if (q === 0 || q === 2) cosDD(yh, yl); else sinDD(yh, yl);
  const v = H + L;
  return q === 1 || q === 2 ? -v : v;
}
/** TAN do Excel. */
export function xlTan(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  if (x === 0) return x;
  reduce(x);
  const q = RQ, yh = RH, yl = RL;
  sinDD(yh, yl); const sh = H, sl = L;
  cosDD(yh, yl); const ch = H, cl = L;
  // tg = sen/cos (quadrantes ímpares: −cos/sen)
  if (q === 0 || q === 2) ddDiv(sh, sl, ch, cl); else ddDiv(-ch, -cl, sh, sl);
  return H + L;
}

/** √(h + l) em double-double → (H, L). */
function sqrtDD(h: number, l: number): void {
  const s = Math.sqrt(h);
  if (s === 0) { H = 0; L = 0; return; }
  twoProd(s, s);
  ddAdd(h, l, -H, -L); // resto a − s²
  const c = H / (2 * s);
  quickTwoSum(s, c);
}
/** atan(x) em double-double → (H, L). */
function atanDD(xh: number, xl: number): void {
  let neg = false, inv = false;
  if (xh < 0) { neg = true; xh = -xh; xl = -xl; }
  if (xh > 1) { ddDiv(1, 0, xh, xl); xh = H; xl = L; inv = true; }
  // atan(x) = 2·atan(x/(1+√(1+x²))): 3 vezes → |x| ≤ tg(π/32)
  let halvings = 0;
  for (; halvings < 3 && xh > 0.1; halvings++) {
    ddMul(xh, xl, xh, xl);
    ddAdd(H, L, 1, 0);
    sqrtDD(H, L);
    ddAdd(H, L, 1, 0);
    ddDiv(xh, xl, H, L);
    xh = H; xl = L;
  }
  ddMul(xh, xl, xh, xl);
  const x2h = -H, x2l = -L;
  let ph = ATANH_C[22]![0], pl = ATANH_C[22]![1];
  for (let j = 21; j >= 0; j--) {
    ddMul(ph, pl, x2h, x2l);
    ddAdd(H, L, ATANH_C[j]![0], ATANH_C[j]![1]);
    ph = H; pl = L;
  }
  ddMul(ph, pl, xh, xl);
  let rh = H * (1 << halvings), rl = L * (1 << halvings);
  if (inv) { ddAdd(PIO2_H, PIO2_L, -rh, -rl); rh = H; rl = L; }
  H = neg ? -rh : rh; L = neg ? -rl : rl;
}
/** atan(x) corretamente arredondado. */
export function crAtan(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return x;
  if (!Number.isFinite(x)) return x > 0 ? PIO2_H : -PIO2_H;
  atanDD(x, 0);
  return H + L;
}

/** asin(x) em double-double (|x| ≤ 1) → (H, L): atan(x/√(1−x²)). */
function asinDD(x: number): void {
  if (Math.abs(x) === 1) { H = x * PIO2_H; L = x * PIO2_L; return; }
  twoProd(x, x);
  ddAdd(1, 0, -H, -L);
  sqrtDD(H, L);
  ddDiv(x, 0, H, L);
  atanDD(H, L);
}
/** asin(x) corretamente arredondado. */
export function crAsin(x: number): number {
  if (!(Math.abs(x) <= 1)) return NaN;
  if (x === 0) return x;
  asinDD(x);
  return H + L;
}
/** acos(x) = π/2 − asin(x) em double-double, arredondado uma vez. */
export function crAcos(x: number): number {
  if (!(Math.abs(x) <= 1)) return NaN;
  asinDD(x);
  ddAdd(PIO2_H, PIO2_L, -H, -L);
  return H + L;
}
/** atan2(y, x) corretamente arredondado. */
export function crAtan2(y: number, x: number): number {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === 0) return y > 0 ? PIO2_H : y < 0 ? -PIO2_H : 0;
  ddDiv(y, 0, x, 0);
  atanDD(H, L);
  if (x < 0) {
    // ± π
    const pih = 2 * PIO2_H, pil = 2 * PIO2_L;
    if (y >= 0) ddAdd(H, L, pih, pil); else ddAdd(H, L, -pih, -pil);
  }
  return H + L;
}
/** senh, cosh, tgh corretamente arredondados (via expm1 em double-double). */
export function crSinh(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return x;
  if (a > 710.5) return x > 0 ? Infinity : -Infinity;
  // senh a = (u + u/(u+1))/2, u = e^a − 1
  let uh: number, ul: number;
  if (a <= 0.34) { expm1Small(a, 0); uh = H; ul = L; }
  else { const e = expOfDDfull(a); ddAdd(e[0], e[1], -1, 0); uh = H; ul = L; }
  ddAdd(uh, ul, 1, 0);
  ddDiv(uh, ul, H, L);
  ddAdd(uh, ul, H, L);
  const v = (H + L) / 2;
  return x < 0 ? -v : v;
}
/** e^a em double-double (sem arredondar) → [h, l]. */
function expOfDDfull(a: number): [number, number] {
  const k = Math.round(a / LN2_H);
  twoProd(k, LN2_H);
  const th = H, tl = L + k * LN2_L;
  ddAdd(a, 0, -th, -tl);
  expm1Small(H, L);
  ddAdd(H, L, 1, 0);
  const p = Math.pow(2, k);
  return [H * p, L * p];
}
export function crCosh(x: number): number {
  const a = Math.abs(x);
  if (a > 710.5) return Infinity;
  const [eh, el] = expOfDDfull(a);
  ddDiv(1, 0, eh, el);
  ddAdd(eh, el, H, L);
  return (H + L) / 2;
}

/** e^x − 1 corretamente arredondado. */
export function crExpm1(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return x;
  if (Math.abs(x) <= 0.34) { expm1Small(x, 0); return H + L; }
  if (x > 709.782712893384) return Infinity;
  if (x < -40) return -1;
  const k = Math.round(x / LN2_H);
  twoProd(k, LN2_H);
  const th = H, tl = L + k * LN2_L;
  ddAdd(x, 0, -th, -tl);
  expm1Small(H, L);
  ddAdd(H, L, 1, 0); // e^r
  const p = Math.pow(2, k);
  ddAdd(H * p, L * p, -1, 0);
  return H + L;
}
