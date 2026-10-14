/** Escala automática de eixo de valores como o Office (≈ regra de Excel/PowerPoint). */

export interface Scale {
  lo: number;
  hi: number;
  /** Unidade principal (0 no logarítmico). */
  major: number;
  minor: number;
  log?: number;
}

const MAX_TICKS = 1000;

/** Passo {1,2,5}·10^k que deixa ≤ maxDiv divisões em `span`. */
export function niceStep(span: number, maxDiv: number): number {
  if (!(span > 0)) return 1;
  let mag = Math.pow(10, Math.floor(Math.log10(span / maxDiv)));
  for (let k = 0; k < 8; k++, mag *= 10) for (const f of [1, 2, 5]) if (span / (f * mag) <= maxDiv + 1e-9) return f * mag;
  return span / maxDiv;
}

/**
 * Escala automática: zero entra quando os dados não estão "longe" dele (o
 * Office só tira o zero se min > 5/6·max), 5% de folga no extremo, e o MENOR
 * passo {1,2,5}·10^k com até `maxDiv` divisões.
 */
export function autoScale(dataMin: number, dataMax: number, maxDiv: number, fixed: { min?: number; max?: number; major?: number; minor?: number; log?: number }, pad = 0.05): Scale {
  if (fixed.log) {
    const b = fixed.log;
    const pmin = dataMin > 0 ? dataMin : 1, pmax = dataMax > 0 ? dataMax : b;
    const lo = fixed.min !== undefined && fixed.min > 0 ? fixed.min : b ** Math.floor(Math.log(pmin) / Math.log(b) + 1e-9);
    let hi = fixed.max !== undefined && fixed.max > lo ? fixed.max : b ** Math.ceil(Math.log(pmax) / Math.log(b) - 1e-9);
    if (!(hi > lo)) hi = lo * b;
    return { lo, hi, major: 0, minor: 0, log: b };
  }
  let min = Math.min(dataMin, dataMax), max = Math.max(dataMin, dataMax);
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (fixed.min !== undefined) min = Math.min(min, fixed.min);
  if (fixed.max !== undefined) max = Math.max(max, fixed.max);
  // zero no eixo, salvo dados todos do mesmo lado e longe dele
  let lo0 = min, hi0 = max;
  // (valores todos iguais não contam como "faixa estreita": o eixo vai do zero — medido, 5,5,5 → 0..6)
  if (min >= 0 && fixed.min === undefined) lo0 = max > min && (max - min) / max < 1 / 6 ? min - (max - min) / 2 : 0;
  if (max <= 0 && fixed.max === undefined) hi0 = min < max && (min - max) / min < 1 / 6 ? max + (max - min) / 2 : 0;
  if (hi0 === lo0) { hi0 = lo0 === 0 ? 1 : lo0 + Math.abs(lo0) * 0.1; }
  const span0 = hi0 - lo0;
  const loAdj = fixed.min ?? (lo0 < 0 ? lo0 - span0 * pad : lo0);
  const hiAdj = fixed.max ?? (hi0 > 0 ? hi0 + span0 * pad : hi0);
  let major = fixed.major ?? 0;
  if (!(major > 0) || (hiAdj - loAdj) / major > MAX_TICKS) {
    major = niceStep(hiAdj - loAdj, maxDiv);
    // arredondar os extremos ao passo pode passar de maxDiv: aumenta o passo
    for (let k = 0; k < 6; k++) {
      const lo = fixed.min ?? Math.floor(loAdj / major + 1e-9) * major;
      const hi = fixed.max ?? Math.ceil(hiAdj / major - 1e-9) * major;
      if ((hi - lo) / major <= maxDiv + 1e-9) break;
      major = niceStep((hi - lo) * 1.0001, maxDiv);
    }
  }
  let lo = fixed.min ?? Math.floor(loAdj / major + 1e-9) * major;
  let hi = fixed.max ?? Math.ceil(hiAdj / major - 1e-9) * major;
  if (fixed.min === undefined && min >= 0 && lo < 0) lo = 0;
  if (!(hi > lo)) hi = lo + major;
  // sem resíduo binário (6·0,1 = 0,6000000000000001)
  lo = +lo.toPrecision(12); hi = +hi.toPrecision(12);
  const minor = fixed.minor ?? major / 5;
  return { lo, hi, major, minor };
}

export function tickValues(s: Scale, unit: number = s.major): number[] {
  const out: number[] = [];
  if (s.log) {
    const step = unit > 1 ? unit : s.log;
    for (let v = s.lo; v <= s.hi * (1 + 1e-9) && out.length < MAX_TICKS; v *= step) out.push(v);
    return out;
  }
  if (!(unit > 0)) return out;
  const n = Math.min(MAX_TICKS, Math.floor((s.hi - s.lo) / unit + 1e-9));
  for (let i = 0; i <= n; i++) {
    const v = +(s.lo + i * unit).toPrecision(12);
    out.push(Math.abs(v) < unit * 1e-9 ? 0 : v);
  }
  return out;
}

/** Fração 0..1 do valor na escala (log: ≤ 0 vai à base). */
export function frac(s: Scale, v: number): number {
  if (s.log) {
    if (!(v > 0)) return 0;
    return (Math.log(v) - Math.log(s.lo)) / (Math.log(s.hi) - Math.log(s.lo));
  }
  return (v - s.lo) / (s.hi - s.lo);
}
