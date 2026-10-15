/**
 * Funções especiais para as distribuições do Excel: normal (Cody), inversa da
 * normal (Wichura AS241), gama e log-gama (Lanczos), gama incompleta, beta
 * incompleta e densidades com o método de Loader (desvio de Stirling e bd0).
 * Precisão alvo: a do Excel 2010+ (≈ 1e-15 relativo); conferida no oráculo.
 * Dono: agente FN-STAT.
 */

const SQRT_32 = 5.656854249492380195206754896838;
const M_1_SQRT_2PI = 0.398942280401432677939946059934;
export const LN_SQRT_2PI = 0.918938533204672741780329736406;
const DBL_EPS = 2.220446049250313e-16;

/** Φ(x) e 1 − Φ(x) da normal padrão (algoritmo de Cody, como o pnorm do R). */
export function pnormBoth(x: number): { cum: number; ccum: number } {
  const a = [2.2352520354606839287, 161.02823106855587881, 1067.6894854603709582, 18154.981253343561249, 0.065682337918207449113];
  const b = [47.20258190468824187, 976.09855173777669322, 10260.932208618978205, 45507.789335026729956];
  const c = [0.39894151208813466764, 8.8831497943883759412, 93.506656132177855979, 597.27027639480026226,
    2494.5375852903726711, 6848.1904505362823326, 11602.651437647350124, 9842.7148383839780218, 1.0765576773720192317e-8];
  const d = [22.266688044328115691, 235.38790178262499861, 1519.377599407554805, 6485.558298266760755,
    18615.571640885098091, 34900.952721145977266, 38912.003286093271411, 19685.429676859990727];
  const p = [0.21589853405795699, 0.1274011611602473639, 0.022235277870649807, 0.001421619193227893466, 2.9112874951168792e-5, 0.02307344176494017303];
  const q = [1.28426009614491121, 0.468238212480865118, 0.0659881378689285515, 0.00378239633202758244, 7.29751555083966205e-5];
  if (Number.isNaN(x)) return { cum: NaN, ccum: NaN };
  const y = Math.abs(x);
  let cum: number, ccum: number;
  if (y <= 0.67448975) {
    let xnum = 0, xden = 0;
    if (y > DBL_EPS * 0.5) {
      const xsq = x * x;
      xnum = a[4]! * xsq; xden = xsq;
      for (let i = 0; i < 3; i++) { xnum = (xnum + a[i]!) * xsq; xden = (xden + b[i]!) * xsq; }
    }
    const temp = x * (xnum + a[3]!) / (xden + b[3]!);
    return { cum: 0.5 + temp, ccum: 0.5 - temp };
  }
  const del = (X: number, temp: number): void => {
    const xsq = Math.trunc(X * 16) / 16;
    const dl = (X - xsq) * (X + xsq);
    cum = Math.exp(-xsq * xsq * 0.5) * Math.exp(-dl * 0.5) * temp;
    ccum = 1 - cum;
  };
  if (y <= SQRT_32) {
    let xnum = c[8]! * y, xden = y;
    for (let i = 0; i < 7; i++) { xnum = (xnum + c[i]!) * y; xden = (xden + d[i]!) * y; }
    const temp = (xnum + c[7]!) / (xden + d[7]!);
    del(y, temp);
  } else if (y < 50) {
    const xsq = 1 / (x * x);
    let xnum = p[5]! * xsq, xden = xsq;
    for (let i = 0; i < 4; i++) { xnum = (xnum + p[i]!) * xsq; xden = (xden + q[i]!) * xsq; }
    let temp = xsq * (xnum + p[4]!) / (xden + q[4]!);
    temp = (M_1_SQRT_2PI - temp) / y;
    del(x, temp);
  } else {
    cum = 0; ccum = 1;
  }
  if (x > 0) { const t = cum!; cum = ccum!; ccum = t; }
  return { cum: cum!, ccum: ccum! };
}

/** Φ(x). */
export function pnorm(x: number): number {
  return pnormBoth(x).cum;
}

/** Densidade da normal padrão. */
export function dnorm(x: number): number {
  return M_1_SQRT_2PI * Math.exp(-0.5 * x * x);
}

/** Φ⁻¹(p) — Wichura AS241 (PPND16). p em (0, 1). */
export function qnorm(p: number): number {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
  const q = p - 0.5;
  let r: number, val: number;
  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q;
    val = q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r +
      45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r +
      3.387132872796366608) /
      (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r +
        21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1);
    return val;
  }
  r = q < 0 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));
  if (r <= 5) {
    r -= 1.6;
    val = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
      1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r + 4.6303378461565452959) * r +
      1.42343711074968357734) /
      (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
        0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r + 2.05319162663775882187) * r + 1);
  } else {
    r -= 5;
    val = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
      0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r +
      6.6579046435011037772) /
      (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
        7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r +
        0.59983220655588793769) * r + 1);
  }
  return q < 0 ? -val : val;
}

// ---------------------------------------------------------------------------
// Gama

/**
 * Coeficientes da série ln Γ(2+z) = (1−γ)z + Σ c_k z^k, c_k = (−1)^k (ζ(k)−1)/k
 * (k = 2…46; calculados em alta precisão). Converge em |z| < 2; usada em |z| ≤ 0,5.
 */
const LG2_COEF = [
  0.3224670334241132, -0.067352301053198102, 0.020580808427784546, -0.0073855510286739857,
  0.0028905103307415234, -0.001192753911703261, 0.00050966952474304245, -0.00022315475845357939,
  0.000099457512781808531, -0.000044926236738133142, 0.000020507212775670691, -0.0000094394882752683967,
  0.0000043748667899074882, -0.0000020392157538013662, 9.5514121304074194e-7, -4.4924691987645662e-7,
  2.1207184805554665e-7, -1.0043224823968099e-7, 4.7698101693639804e-8, -2.2711094608943164e-8,
  1.0838659214896955e-8, -5.1834750419700466e-9, 2.4836745438024785e-9, -1.1921401405860912e-9,
  5.7313672416788623e-10, -2.7595228851242334e-10, 1.3304764374244489e-10, -6.4229645638380996e-11,
  3.1044247747322276e-11, -1.5021384080754142e-11, 7.2759744802390792e-12, -3.5277424765759151e-12,
  1.711991790559618e-12, -8.315385841420285e-13, 4.0422005252894402e-13, -1.9664756310966165e-13,
  9.5736303878385556e-14, -4.6640760264283744e-14, 2.2737369600659724e-14, -1.1091399470834522e-14,
  5.4136591567253633e-15, -2.6438800178609949e-15, 1.2918959062789966e-15, -6.3159355041984482e-16,
  3.089316266963393e-16,
];
const EULER_GAMMA = 0.57721566490153286061;

/** ln Γ(2+z), |z| ≤ 0,5. */
function lgamma2p(z: number): number {
  let s = 0;
  for (let k = LG2_COEF.length - 1; k >= 0; k--) s = (s + LG2_COEF[k]!) * z;
  return (s + (1 - EULER_GAMMA)) * z;
}

/** Correção de Stirling ln Γ(x) − ((x − ½)ln x − x + ln √(2π)), x ≥ 10. */
export function lgammacor(x: number): number {
  const x2 = 1 / (x * x);
  return (1 / 12 - x2 * (1 / 360 - x2 * (1 / 1260 - x2 * (1 / 1680 - x2 * (1 / 1188 - x2 * (691 / 360360 - x2 / 156)))))) / x;
}

/** ln Γ(x) para x > 0 (≈ 1 ulp, inclusive perto dos zeros em 1 e 2 — como o GAMMALN do Excel). */
export function lgamma(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) return NaN;
  // Γ(x) = Γ(1+x)/x; ln Γ(1+z) = ln Γ(2+z) − ln(1+z)
  if (x < 0.5) return lgamma2p(x) - Math.log1p(x) - Math.log(x);
  if (x < 1.5) return lgamma2p(x - 1) - Math.log1p(x - 1);
  if (x <= 2.5) return lgamma2p(x - 2);
  if (x < 12) {
    // recorrência até [1,5; 2,5]
    let y = x, prod = 1;
    while (y > 2.5) { y -= 1; prod *= y; }
    return lgamma2p(y - 2) + Math.log(prod);
  }
  return (x - 0.5) * Math.log(x) - x + LN_SQRT_2PI + lgammacor(x);
}

/** Γ(x) (x real, polos → NaN). */
export function gamma(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  if (x === Math.floor(x)) {
    if (x <= 0) return NaN;
    if (x <= 171) { let f = 1; for (let i = 2; i < x; i++) f *= i; return f; }
    return Infinity;
  }
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  if (x > 171.7) return Infinity;
  return Math.exp(lgamma(x));
}

// ---------------------------------------------------------------------------
// erf/erfc de W. J. Cody (CALERF), como o Excel: SEM o truque de dividir y² (o
// Excel calcula exp(−y·y) direto — medido: o erro relativo de NORM.S.DIST na cauda
// segue o arredondamento de y·y, com y = −x·(1/√2))

const ERF_A = [3.16112374387056560e00, 1.13864154151050156e02, 3.77485237685302021e02, 3.20937758913846947e03, 1.85777706184603153e-1];
const ERF_B = [2.36012909523441209e01, 2.44024637934444173e02, 1.28261652607737228e03, 2.84423683343917062e03];
const ERF_C = [5.64188496988670089e-1, 8.88314979438837594e00, 6.61191906371416295e01, 2.98635138197400131e02,
  8.81952221241769090e02, 1.71204761263407058e03, 2.05107837782607147e03, 1.23033935479799725e03, 2.15311535474403846e-8];
const ERF_D = [1.57449261107098347e01, 1.17693950891312499e02, 5.37181101862009858e02, 1.62138957456669019e03,
  3.29079923573345963e03, 4.36261909014324716e03, 3.43936767414372164e03, 1.23033935480374942e03];
const ERF_P = [3.05326634961232344e-1, 3.60344899949804439e-1, 1.25781726111229246e-1, 1.60837851487422766e-2,
  6.58749161529837803e-4, 1.63153871373020978e-2];
const ERF_Q = [2.56852019228982242e00, 1.87295284992346725e00, 5.27905102951428412e-1, 6.05183413124413191e-2, 2.33520497626869185e-3];
const SQRPI = 5.6418958354775628695e-1;

/** CALERF: jint 0 = erf, 1 = erfc. */
function calerf(arg: number, jint: 0 | 1): number {
  const x = arg, y = Math.abs(x);
  let result: number;
  if (y <= 0.46875) {
    const ysq = y > 1.11e-16 ? y * y : 0;
    let xnum = ERF_A[4]! * ysq, xden = ysq;
    for (let i = 0; i < 3; i++) { xnum = (xnum + ERF_A[i]!) * ysq; xden = (xden + ERF_B[i]!) * ysq; }
    result = x * (xnum + ERF_A[3]!) / (xden + ERF_B[3]!);
    return jint ? 1 - result : result;
  }
  if (y <= 4) {
    let xnum = ERF_C[8]! * y, xden = y;
    for (let i = 0; i < 7; i++) { xnum = (xnum + ERF_C[i]!) * y; xden = (xden + ERF_D[i]!) * y; }
    result = (xnum + ERF_C[7]!) / (xden + ERF_D[7]!);
    result = Math.exp(-y * y) * result;
  } else if (y >= 26.543) {
    result = 0;
  } else {
    const ysq = 1 / (y * y);
    let xnum = ERF_P[5]! * ysq, xden = ysq;
    for (let i = 0; i < 4; i++) { xnum = (xnum + ERF_P[i]!) * ysq; xden = (xden + ERF_Q[i]!) * ysq; }
    result = ysq * (xnum + ERF_P[4]!) / (xden + ERF_Q[4]!);
    result = (SQRPI - result) / y;
    result = Math.exp(-y * y) * result;
  }
  if (jint === 0) { result = (0.5 - result) + 0.5; return x < 0 ? -result : result; }
  return x < 0 ? 2 - result : result;
}

/** erf(x) (Cody). */
export function erf(x: number): number { return calerf(x, 0); }
/** erfc(x) (Cody). */
export function erfc(x: number): number { return calerf(x, 1); }

/** Φ(x) como o NORM.S.DIST do Excel: ½·erfc(−x/√2), com x·(1/√2). */
export function normCdfXl(x: number): number {
  return 0.5 * erfc(-x * Math.SQRT1_2);
}

// ---------------------------------------------------------------------------
// Densidades de Loader (binomial/Poisson) — dbinom_raw e dpois_raw do R

/** Desvio de Stirling: ln(n!) − ln(√(2π n)(n/e)^n). */
export function stirlerr(n: number): number {
  const S0 = 1 / 12, S1 = 1 / 360, S2 = 1 / 1260, S3 = 1 / 1680, S4 = 1 / 1188;
  const sferr_halves = [
    0.0, 0.1534264097200273452913848, 0.0810614667953272582196702, 0.0548141210519176538961390,
    0.0413406959554092940938221, 0.03316287351993628748511048, 0.02767792568499833914878929, 0.02374616365629749597132920,
    0.02079067210376509311152277, 0.01848845053267318523077934, 0.01664469118982119216319487, 0.01513497322191737887351255,
    0.01387612882307074799874573, 0.01281046524292022692424986, 0.01189670994589177009505572, 0.01110455975820691732662991,
    0.010411265261972096497478567, 0.009799416126158803298389475, 0.009255462182712732917728637, 0.008768700134139385462952823,
    0.008330563433362871256469318, 0.007934114564314020547248100, 0.007573675487951840794972024, 0.007244554301320383179543912,
    0.006942840107209529865664152, 0.006665247032707682442354394, 0.006408994188004207068439631, 0.006171712263039457647532867,
    0.005951370112758847735624416, 0.005746216513010115682023589, 0.005554733551962801371038690,
  ];
  if (n <= 15) {
    const nn = n + n;
    if (nn === Math.floor(nn)) return sferr_halves[nn]!;
    return lgamma(n + 1) - (n + 0.5) * Math.log(n) + n - LN_SQRT_2PI;
  }
  const nn = n * n;
  if (n > 500) return (S0 - S1 / nn) / n;
  if (n > 80) return (S0 - (S1 - S2 / nn) / nn) / n;
  if (n > 35) return (S0 - (S1 - (S2 - S3 / nn) / nn) / nn) / n;
  return (S0 - (S1 - (S2 - (S3 - S4 / nn) / nn) / nn) / nn) / n;
}

/** bd0(x, np) = x ln(x/np) + np − x, sem cancelamento. */
export function bd0(x: number, np: number): number {
  if (Math.abs(x - np) < 0.1 * (x + np)) {
    let v = (x - np) / (x + np);
    let s = (x - np) * v;
    if (Math.abs(s) < Number.MIN_VALUE) return s;
    let ej = 2 * x * v;
    v = v * v;
    for (let j = 1; j < 1000; j++) {
      ej *= v;
      const s1 = s + ej / ((j << 1) + 1);
      if (s1 === s) return s1;
      s = s1;
    }
  }
  return x * Math.log(x / np) + np - x;
}

/** Densidade binomial P(X = x), x inteiro, 0 ≤ p ≤ 1 (q = 1 − p). */
export function dbinomRaw(x: number, n: number, p: number, q: number): number {
  if (p === 0) return x === 0 ? 1 : 0;
  if (q === 0) return x === n ? 1 : 0;
  if (x === 0) {
    if (n === 0) return 1;
    const lc = p < 0.1 ? -bd0(n, n * q) - n * p : n * Math.log(q);
    return Math.exp(lc);
  }
  if (x === n) {
    const lc = q < 0.1 ? -bd0(n, n * p) - n * q : n * Math.log(p);
    return Math.exp(lc);
  }
  if (x < 0 || x > n) return 0;
  const lc = stirlerr(n) - stirlerr(x) - stirlerr(n - x) - bd0(x, n * p) - bd0(n - x, n * q);
  // forma original de Loader (exp(lc)/√f) — bate mais com o BINOM.DIST do Excel que a do R atual
  return Math.exp(lc) / Math.sqrt(2 * Math.PI * x * (n - x) / n);
}

/** Densidade de Poisson P(X = x) com média λ. */
export function dpoisRaw(x: number, lambda: number): number {
  if (lambda === 0) return x === 0 ? 1 : 0;
  if (!Number.isFinite(lambda) || x < 0) return 0;
  if (x <= lambda * Number.MIN_VALUE) return Math.exp(-lambda);
  if (lambda < x * Number.MIN_VALUE) {
    return Math.exp(-lambda + x * Math.log(lambda) - lgamma(x + 1));
  }
  return Math.exp(-stirlerr(x) - bd0(x, lambda)) / Math.sqrt(2 * Math.PI * x);
}

// ---------------------------------------------------------------------------
// Gama incompleta regularizada — pgamma do R (Morten Welinder): série para x < 1,
// série/fração contínua com o fator de Poisson de Loader e expansão assintótica
// perto de x ≈ a. Precisão ≈ 1e−15 relativa em P e em Q (caudas).

const DBL_MIN = 2.2250738585072014e-308;
const SCALEFACTOR = 1.157920892373162e77; // 2^256
const M_CUTOFF = Math.LN2 * 1024 / DBL_EPS;

/** Σ x^k/(i + k·d), fração contínua (auxiliar de log1pmx e lgamma1p). */
function logcf(x: number, i: number, d: number, eps: number): number {
  let c1 = 2 * d, c2 = i + d, c4 = c2 + d, a1 = c2, b1 = i * (c2 - i * x), b2 = d * d * x;
  let a2 = c4 * c2 - b2;
  b2 = c4 * b1 - i * b2;
  while (Math.abs(a2 * b1 - a1 * b2) > Math.abs(eps * b1 * b2)) {
    let c3 = c2 * c2 * x; c2 += d; c4 += d;
    a1 = c4 * a2 - c3 * a1; b1 = c4 * b2 - c3 * b1;
    c3 = c1 * c1 * x; c1 += d; c4 += d;
    a2 = c4 * a1 - c3 * a2; b2 = c4 * b1 - c3 * b2;
    if (Math.abs(b2) > SCALEFACTOR) { a1 /= SCALEFACTOR; b1 /= SCALEFACTOR; a2 /= SCALEFACTOR; b2 /= SCALEFACTOR; }
    else if (Math.abs(b2) < 1 / SCALEFACTOR) { a1 *= SCALEFACTOR; b1 *= SCALEFACTOR; a2 *= SCALEFACTOR; b2 *= SCALEFACTOR; }
  }
  return a2 / b2;
}

/** ln(1+x) − x sem cancelamento. */
export function log1pmx(x: number): number {
  if (x > 1 || x < -0.79149064) return Math.log1p(x) - x;
  const r = x / (2 + x), y = r * r;
  if (Math.abs(x) < 1e-2) return r * ((((2 / 9 * y + 2 / 7) * y + 2 / 5) * y + 2 / 3) * y - x);
  return r * (2 * y * logcf(y, 3, 2, 1e-14) - x);
}

/** ln Γ(1+a), preciso também para |a| < 0,5. */
export function lgamma1p(a: number): number {
  if (Math.abs(a) >= 0.5) return lgamma(a + 1);
  const c = 0.2273736845824652515226821577978691e-12; // ζ(42) − 1
  let lgam = c * logcf(-a / 2, 42, 1, 1e-14);
  for (let i = 39; i >= 0; i--) lgam = Math.abs(LG2_COEF[i]!) - a * lgam;
  return (a * lgam - EULER_GAMMA) * a - log1pmx(a);
}

/** dpois(x_mais_1 − 1, λ) com os casos de x pequeno. */
function dpoisWrap(xPlus1: number, lambda: number): number {
  if (!Number.isFinite(lambda)) return 0;
  if (xPlus1 > 1) return dpoisRaw(xPlus1 - 1, lambda);
  if (lambda > Math.abs(xPlus1 - 1) * M_CUTOFF) return Math.exp(-lambda - lgamma(xPlus1));
  return dpoisRaw(xPlus1, lambda) * (xPlus1 / lambda);
}

function pgammaSmallx(x: number, alph: number, lower: boolean): number {
  let sum = 0, c = alph, n = 0, term: number;
  do { n++; c *= -x / n; term = c / (alph + n); sum += term; } while (Math.abs(term) > DBL_EPS * Math.abs(sum));
  if (lower) {
    const f2 = alph > 1 ? dpoisRaw(alph, x) * Math.exp(x) : Math.exp(alph * Math.log(x) - lgamma1p(alph));
    return (1 + sum) * f2;
  }
  const lf2 = alph * Math.log(x) - lgamma1p(alph);
  const f2m1 = Math.expm1(lf2);
  return -(sum + f2m1 + sum * f2m1);
}

function pdUpperSeries(x: number, y: number): number {
  let term = x / y, sum = term;
  do { y++; term *= x / y; sum += term; } while (term > sum * DBL_EPS);
  return sum;
}

function pdLowerCf(y: number, d: number): number {
  if (y === 0) return 0;
  let f0 = y / d;
  if (Math.abs(y - 1) < Math.abs(d) * DBL_EPS) return f0;
  if (f0 > 1) f0 = 1;
  let c2 = y, c4 = d, a1 = 0, b1 = 1, a2 = y, b2 = d, f = 0, of = -1, i = 0;
  while (b2 > SCALEFACTOR) { a1 /= SCALEFACTOR; b1 /= SCALEFACTOR; a2 /= SCALEFACTOR; b2 /= SCALEFACTOR; }
  while (i < 200000) {
    i++; c2--; let c3 = i * c2; c4 += 2;
    a1 = c4 * a2 + c3 * a1; b1 = c4 * b2 + c3 * b1;
    i++; c2--; c3 = i * c2; c4 += 2;
    a2 = c4 * a1 + c3 * a2; b2 = c4 * b1 + c3 * b2;
    if (b2 > SCALEFACTOR) { a1 /= SCALEFACTOR; b1 /= SCALEFACTOR; a2 /= SCALEFACTOR; b2 /= SCALEFACTOR; }
    if (b2 !== 0) {
      f = a2 / b2;
      if (Math.abs(f - of) <= DBL_EPS * Math.max(f0, Math.abs(f))) return f;
      of = f;
    }
  }
  return f;
}

function pdLowerSeries(lambda: number, y: number): number {
  let term = 1, sum = 0;
  while (y >= 1 && term > sum * DBL_EPS) { term *= y / lambda; sum += term; y--; }
  if (y !== Math.floor(y)) sum += term * pdLowerCf(y, lambda + 1 - y);
  return sum;
}

function ppoisAsymp(x: number, lambda: number, lower: boolean): number {
  const ca = [0, 2 / 3, -4 / 135, 8 / 2835, 16 / 8505, -8992 / 12629925, -334144 / 492567075, 698752 / 1477701225];
  const cb = [0, 1 / 12, 1 / 288, -139 / 51840, -571 / 2488320, 163879 / 209018880, 5246819 / 75246796800, -534703531 / 902961561600];
  const dfm = lambda - x;
  const pt = -log1pmx(dfm / x);
  let s2pt = Math.sqrt(2 * x * pt);
  if (dfm < 0) s2pt = -s2pt;
  let res12 = 0, res1Term = Math.sqrt(x), res1Ig = res1Term, res2Term = s2pt, res2Ig = s2pt;
  for (let i = 1; i < 8; i++) {
    res12 += res1Ig * ca[i]! + res2Ig * cb[i]!;
    res1Term *= pt / i; res2Term *= 2 * pt / (2 * i + 1);
    res1Ig = res1Ig / x + res1Term; res2Ig = res2Ig / x + res2Term;
  }
  let elfb = x, elfbTerm = 1;
  for (let i = 1; i < 8; i++) { elfb += elfbTerm * cb[i]!; elfbTerm /= x; }
  if (!lower) elfb = -elfb;
  const f = res12 / elfb;
  // pnorm(s2pt, cauda = !lower) como no R
  const b = pnormBoth(s2pt);
  return (lower ? b.ccum : b.cum) + f * dnorm(s2pt);
}

/** P(a, x) (lower) ou Q(a, x) da gama regularizada. */
export function pgamma(x: number, alph: number, lower: boolean): number {
  if (x <= 0) return lower ? 0 : 1;
  if (!Number.isFinite(x)) return lower ? 1 : 0;
  if (x < 1) return pgammaSmallx(x, alph, lower);
  if (x <= alph - 1 && x < 0.8 * (alph + 50)) {
    const sum = pdUpperSeries(x, alph), d = dpoisWrap(alph, x);
    return lower ? sum * d : 1 - d * sum;
  }
  if (alph - 1 < x && alph < 0.8 * (x + 50)) {
    const d = dpoisWrap(alph, x);
    let sum: number;
    if (alph < 1) sum = x * DBL_EPS > 1 - alph ? 1 : pdLowerCf(alph, x - (alph - 1)) * x / alph;
    else sum = 1 + pdLowerSeries(x, alph - 1);
    return lower ? 1 - d * sum : sum * d;
  }
  return ppoisAsymp(alph - 1, x, !lower);
}

/** P(a, x) e Q(a, x). */
export function gammaInc(a: number, x: number): { p: number; q: number } {
  return { p: pgamma(x, a, true), q: pgamma(x, a, false) };
}

void DBL_MIN;

// ---------------------------------------------------------------------------
// Beta

/** ln B(a, b). */
export function lbeta(a: number, b: number): number {
  const p = Math.min(a, b), q = Math.max(a, b);
  if (p >= 10) {
    // ambos grandes: correções de Stirling
    const corr = lgammacor(p) + lgammacor(q) - lgammacor(p + q);
    return Math.log(q) * -0.5 + LN_SQRT_2PI + corr + (p - 0.5) * Math.log(p / (p + q)) + q * Math.log1p(-p / (p + q));
  }
  if (q >= 10) {
    const corr = lgammacor(q) - lgammacor(p + q);
    return lgamma(p) + corr + p - p * Math.log(p + q) + (q - 0.5) * Math.log1p(-p / (p + q));
  }
  return lgamma(p) + lgamma(q) - lgamma(p + q);
}


/**
 * Beta incompleta regularizada I_x(a, b) e 1 − I: fração contínua (Lentz) com
 * simetria; o fator x^a (1−x)^b / (a·B(a,b)) vem da densidade binomial de Loader
 * (b/(a+b) · dbinom(a; a+b, x)) — sem o cancelamento de exp(a ln x + b ln(1−x) − ln B).
 */
export function betaInc(x: number, a: number, b: number): { p: number; q: number } {
  if (x <= 0) return { p: 0, q: 1 };
  if (x >= 1) return { p: 1, q: 0 };
  const y = 1 - x;
  if (x < (a + 1) / (a + b + 2)) {
    const p = b / (a + b) * dbinomRaw(a, a + b, x, y) * betacf(x, a, b);
    return { p, q: 1 - p };
  }
  const q = a / (a + b) * dbinomRaw(b, a + b, y, x) * betacf(y, b, a);
  return { p: 1 - q, q };
}

/** Fração contínua da beta incompleta (Lentz). */
function betacf(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 100000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}
