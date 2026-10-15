/**
 * Linhas de tendência (`c:trendline`): ajuste por mínimos quadrados como o
 * Excel — linear (intercepto fixo opcional), polinomial (ordem 2–6),
 * exponencial e potência (no espaço log), logarítmica — e a média móvel; o
 * R² dos tipos log-linearizados é o do ajuste transformado (como o Excel).
 * O texto da equação usa 4 casas, vírgula decimal (pt-BR) e expoentes
 * sobrescritos (medido, syn trend1: "y = 2,1067x - 0,1543", "R² = 0,9979").
 */

export interface TrendFit {
  /** y(x) da curva (undefined fora do domínio, ex.: log de x ≤ 0). */
  f(x: number): number | undefined;
  /** Média móvel: os pontos (não é uma função contínua). */
  points?: { x: number; y: number }[];
  r2?: number;
  /** Equação em pedaços (`sup` = sobrescrito). */
  eq?: { text: string; sup?: boolean }[];
}

/** Resolve A·c = b (Gauss com pivô parcial). */
function solve(A: number[][], b: number[]): number[] | undefined {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-12) return undefined;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r]![c]! / M[c]![c]!;
      for (let j = c; j <= n; j++) M[r]![j]! -= k * M[c]![j]!;
    }
  }
  return M.map((r, i) => r[n]! / r[i]!);
}

/** Polinômio de grau `deg` (coeficientes do termo constante ao maior), com intercepto fixo opcional. */
function polyFit(xs: number[], ys: number[], deg: number, b0?: number): number[] | undefined {
  const start = b0 !== undefined ? 1 : 0;
  const m = deg + 1 - start;
  const A = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const b = new Array<number>(m).fill(0);
  xs.forEach((x, i) => {
    const y = ys[i]! - (b0 ?? 0);
    for (let r = 0; r < m; r++) {
      b[r]! += y * x ** (r + start);
      for (let c = 0; c < m; c++) A[r]![c]! += x ** (r + start + c + start);
    }
  });
  const c = solve(A, b);
  return c ? (b0 !== undefined ? [b0, ...c] : c) : undefined;
}

function r2(ys: number[], fit: number[]): number {
  const mean = ys.reduce((a, y) => a + y, 0) / ys.length;
  let ssr = 0, sst = 0;
  ys.forEach((y, i) => { ssr += (y - fit[i]!) ** 2; sst += (y - mean) ** 2; });
  return sst > 0 ? 1 - ssr / sst : 1;
}

/** Número do rótulo: 4 casas, sem zeros à direita, vírgula decimal. */
export function trendNum(v: number): string {
  const s = (Math.round(v * 1e4) / 1e4).toFixed(4).replace(/\.?0+$/, '');
  return (s === '-0' ? '0' : s).replace('.', ',');
}

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];
const signed = (v: number, first: boolean): string => (first ? (v < 0 ? '-' : '') : v < 0 ? ' - ' : ' + ') + trendNum(Math.abs(v));

export function fitTrend(kind: string, xs0: number[], ys0: number[], o: { order?: number; period?: number; intercept?: number }): TrendFit | undefined {
  const pts = xs0.map((x, i) => [x, ys0[i]!] as const).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pts.length < 2) return undefined;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  if (kind === 'movingAvg') {
    const p = Math.max(2, Math.round(o.period ?? 2));
    const out: { x: number; y: number }[] = [];
    for (let i = p - 1; i < ys.length; i++) out.push({ x: xs[i]!, y: ys.slice(i - p + 1, i + 1).reduce((a, y) => a + y, 0) / p });
    return { f: () => undefined, points: out };
  }
  if (kind === 'exp' || kind === 'power') {
    const sel = pts.filter(([x, y]) => y > 0 && (kind === 'exp' || x > 0));
    if (sel.length < 2) return undefined;
    const lx = sel.map(([x]) => (kind === 'exp' ? x : Math.log(x))), ly = sel.map(([, y]) => Math.log(y));
    const c = polyFit(lx, ly, 1, o.intercept !== undefined && o.intercept > 0 ? Math.log(o.intercept) : undefined);
    if (!c) return undefined;
    const a = Math.exp(c[0]!), b = c[1]!;
    const f = (x: number) => (kind === 'exp' ? a * Math.exp(b * x) : x > 0 ? a * x ** b : undefined);
    const fitL = lx.map((x) => c[0]! + b * x);
    return {
      f, r2: r2(ly, fitL),
      eq: kind === 'exp'
        ? [{ text: `y = ${trendNum(a)}e` }, { text: `${trendNum(b)}x`, sup: true }]
        : [{ text: `y = ${trendNum(a)}x` }, { text: trendNum(b), sup: true }],
    };
  }
  if (kind === 'log') {
    const sel = pts.filter(([x]) => x > 0);
    if (sel.length < 2) return undefined;
    const c = polyFit(sel.map(([x]) => Math.log(x)), sel.map(([, y]) => y), 1);
    if (!c) return undefined;
    const f = (x: number) => (x > 0 ? c[0]! + c[1]! * Math.log(x) : undefined);
    return { f, r2: r2(sel.map(([, y]) => y), sel.map(([x]) => f(x)!)), eq: [{ text: `y = ${signed(c[1]!, true)}ln(x)${signed(c[0]!, false)}` }] };
  }
  const deg = kind === 'poly' ? Math.max(2, Math.min(6, Math.round(o.order ?? 2))) : 1;
  const c = polyFit(xs, ys, deg, o.intercept);
  if (!c) return undefined;
  const f = (x: number) => c.reduce((a, k, i) => a + k * x ** i, 0);
  // equação do maior grau ao termo constante; termos nulos somem
  const eq: { text: string; sup?: boolean }[] = [{ text: 'y = ' }];
  let first = true;
  for (let i = deg; i >= 0; i--) {
    const k = c[i]!;
    if (Math.abs(k) < 5e-5 && i !== deg) continue;
    const tail = i === 0 ? '' : i === 1 ? 'x' : `x${SUP[i] ?? `^${i}`}`;
    eq.push({ text: signed(k, first) + tail });
    first = false;
  }
  return { f, r2: r2(ys, xs.map(f)), eq: [{ text: eq.map((p) => p.text).join('') }] };
}
