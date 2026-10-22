/**
 * Rasterização e morfologia sem DOM para os efeitos DrawingML (canal único de
 * cobertura/alfa em Float32, 0..1). Usado no canvas (editor, viewer) e no PDF —
 * e portado para o .NET com os mesmos números.
 */
import type { PathSeg } from './geometry.js';

/** Máscara de cobertura w×h (linhas de cima para baixo). */
export interface Mask { w: number; h: number; a: Float32Array }

export function newMask(w: number, h: number): Mask {
  return { w, h, a: new Float32Array(Math.max(0, w * h)) };
}

/** Transformação afim (a b c d e f): x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Affine = [number, number, number, number, number, number];
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

export function mulAffine(m: Affine, n: Affine): Affine {
  // m ∘ n (aplica n primeiro)
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

const apply = (m: Affine, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Achata os subcaminhos (curvas e arcos em segmentos) já transformados por `m`:
 *  cada polígono é [x0, y0, x1, y1, …]. `tol` = passo máximo (unidades de saída). */
export function flattenPath(subs: PathSeg[][], m: Affine = IDENTITY, tol = 0.35): number[][] {
  const out: number[][] = [];
  const scale = Math.max(1e-9, Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  for (const sub of subs) {
    const poly: number[] = [];
    let cx = 0, cy = 0, sx = 0, sy = 0;
    const push = (x: number, y: number): void => { const p = apply(m, x, y); poly.push(p[0], p[1]); };
    for (const s of sub) {
      switch (s.c) {
        case 'M':
          if (poly.length >= 6) { out.push(poly.splice(0)); } else poly.length = 0;
          cx = sx = s.x; cy = sy = s.y; push(s.x, s.y); break;
        case 'L': cx = s.x; cy = s.y; push(s.x, s.y); break;
        case 'C': {
          const len = (Math.hypot(s.x1 - cx, s.y1 - cy) + Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + Math.hypot(s.x - s.x2, s.y - s.y2)) * scale;
          const n = Math.max(2, Math.min(256, Math.ceil(len / tol / 4)));
          for (let i = 1; i <= n; i++) {
            const t = i / n, u = 1 - t;
            push(u * u * u * cx + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x, u * u * u * cy + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y);
          }
          cx = s.x; cy = s.y; break;
        }
        case 'Q': {
          const len = (Math.hypot(s.x1 - cx, s.y1 - cy) + Math.hypot(s.x - s.x1, s.y - s.y1)) * scale;
          const n = Math.max(2, Math.min(256, Math.ceil(len / tol / 4)));
          for (let i = 1; i <= n; i++) {
            const t = i / n, u = 1 - t;
            push(u * u * cx + 2 * u * t * s.x1 + t * t * s.x, u * u * cy + 2 * u * t * s.y1 + t * t * s.y);
          }
          cx = s.x; cy = s.y; break;
        }
        case 'E': {
          let a0 = s.a0, a1 = s.a1;
          if (s.ccw) { if (a1 > a0) a1 -= Math.PI * 2; } else if (a1 < a0) a1 += Math.PI * 2;
          const len = Math.abs(a1 - a0) * Math.max(s.rx, s.ry) * scale;
          const n = Math.max(2, Math.min(512, Math.ceil(len / tol / 2)));
          for (let i = 0; i <= n; i++) {
            const t = a0 + ((a1 - a0) * i) / n;
            push(s.cx + s.rx * Math.cos(t), s.cy + s.ry * Math.sin(t));
          }
          cx = s.cx + s.rx * Math.cos(a1); cy = s.cy + s.ry * Math.sin(a1); break;
        }
        case 'Z': cx = sx; cy = sy; break;
      }
    }
    if (poly.length >= 6) out.push(poly);
  }
  return out;
}

/** Preenche polígonos numa máscara (cobertura com anti-serrilhado: 4 sublinhas por
 *  pixel, extremos horizontais fracionários). `evenOdd` = regra par-ímpar. */
export function fillPolygons(mask: Mask, polys: number[][], evenOdd = false): Mask {
  const { w, h, a } = mask;
  const SUB = 4;
  const edges: { x0: number; y0: number; x1: number; y1: number; dir: number }[] = [];
  for (const p of polys) {
    const n = p.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = p[2 * i]!, y0 = p[2 * i + 1]!, x1 = p[(2 * ((i + 1) % n))]!, y1 = p[(2 * ((i + 1) % n)) + 1]!;
      if (y0 === y1) continue;
      edges.push(y0 < y1 ? { x0, y0, x1, y1, dir: 1 } : { x0: x1, y0: y1, x1: x0, y1: y0, dir: -1 });
    }
  }
  if (!edges.length) return mask;
  const row = new Float32Array(w + 1);
  const xs: { x: number; d: number }[] = [];
  let ymin = h, ymax = 0;
  for (const e of edges) { ymin = Math.min(ymin, e.y0); ymax = Math.max(ymax, e.y1); }
  const r0 = Math.max(0, Math.floor(ymin)), r1 = Math.min(h - 1, Math.ceil(ymax));
  for (let py = r0; py <= r1; py++) {
    row.fill(0);
    for (let s = 0; s < SUB; s++) {
      const y = py + (s + 0.5) / SUB;
      xs.length = 0;
      for (const e of edges) {
        if (y < e.y0 || y >= e.y1) continue;
        xs.push({ x: e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), d: e.dir });
      }
      if (!xs.length) continue;
      xs.sort((p, q) => p.x - q.x);
      let wind = 0;
      for (let k = 0; k < xs.length - 1; k++) {
        wind += evenOdd ? 1 : xs[k]!.d;
        const inside = evenOdd ? wind % 2 !== 0 : wind !== 0;
        if (!inside) continue;
        const xa = Math.max(0, xs[k]!.x), xb = Math.min(w, xs[k + 1]!.x);
        if (xb <= xa) continue;
        const ia = Math.floor(xa), ib = Math.floor(xb);
        if (ia === ib) { row[ia]! += (xb - xa) / SUB; continue; }
        row[ia]! += (ia + 1 - xa) / SUB;
        for (let ix = ia + 1; ix < ib; ix++) row[ix]! += 1 / SUB;
        if (ib < w) row[ib]! += (xb - ib) / SUB;
      }
    }
    const o = py * w;
    for (let x = 0; x < w; x++) a[o + x] = Math.min(1, a[o + x]! + row[x]!);
  }
  return mask;
}

/** Desfoque gaussiano separável (σ em pixels; kernel até 3σ). */
export function gaussianBlur(m: Mask, sigma: number): Mask {
  if (sigma < 0.05) return { w: m.w, h: m.h, a: new Float32Array(m.a) };
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; sum += v; }
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  const { w, h } = m;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) {
      let s = 0;
      const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
      for (let i = lo; i <= hi; i++) s += m.a[o + x + i]! * k[i + r]!;
      tmp[o + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = lo; i <= hi; i++) s += tmp[(y + i) * w + x]! * k[i + r]!;
      out[y * w + x] = s;
    }
  }
  return { w, h, a: out };
}

/** Distância euclidiana (pixels) de cada pixel ao conjunto {cobertura ≥ ½}
 *  (`inside` = true) ou ao seu complemento — Felzenszwalb & Huttenlocher. */
export function distanceTo(m: Mask, inside: boolean): Float32Array {
  const { w, h } = m;
  const INF = 1e20;
  const f = new Float64Array(Math.max(w, h));
  const d = new Float64Array(Math.max(w, h));
  const v = new Int32Array(Math.max(w, h));
  const z = new Float64Array(Math.max(w, h) + 1);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (m.a[i]! >= 0.5) === inside ? 0 : INF;
  const pass = (n: number): void => {
    let k = 0;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) { k--; s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1]! < q) k++;
      d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x]!;
    pass(h);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y]!;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x]!;
    pass(w);
    for (let x = 0; x < w; x++) g[y * w + x] = d[x]!;
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i]!);
  return out;
}

/** Dilata (r > 0) ou erode (r < 0) a máscara por um disco de raio |r| px, com
 *  meia unidade de transição (anti-serrilhado). */
export function morph(m: Mask, r: number): Mask {
  const out = newMask(m.w, m.h);
  if (Math.abs(r) < 0.01) { out.a.set(m.a); return out; }
  // fora da máscara = fundo: a distância mede-se numa cópia com moldura vazia
  const p = Math.ceil(Math.abs(r)) + 2;
  const pw = m.w + 2 * p, ph = m.h + 2 * p;
  const pad = newMask(pw, ph);
  for (let y = 0; y < m.h; y++) pad.a.set(m.a.subarray(y * m.w, (y + 1) * m.w), (y + p) * pw + p);
  const d = distanceTo(pad, r > 0);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, dd = d[(y + p) * pw + x + p]!;
      out.a[i] = r > 0
        ? Math.max(m.a[i]!, Math.min(1, Math.max(0, r - dd + 0.5)))
        : Math.min(m.a[i]!, Math.min(1, Math.max(0, dd + r + 0.5)));
    }
  }
  return out;
}

/** Copia `m` deslocada (dx, dy px; frações por interpolação bilinear) para uma
 *  máscara w×h. */
export function shiftMask(m: Mask, dx: number, dy: number, w = m.w, h = m.h): Mask {
  const out = newMask(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    const y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      const x0 = Math.floor(sx), fx = sx - x0;
      const at = (xx: number, yy: number): number => (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h ? 0 : m.a[yy * m.w + xx]!);
      out.a[y * w + x] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
  }
  return out;
}

/** Amostra `m` por uma afim inversa `inv` (destino → origem), bilinear. */
export function warpMask(m: Mask, inv: Affine, w: number, h: number): Mask {
  const out = newMask(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx0, sy0] = apply(inv, x + 0.5, y + 0.5);
      const sx = sx0 - 0.5, sy = sy0 - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      const at = (xx: number, yy: number): number => (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h ? 0 : m.a[yy * m.w + xx]!);
      out.a[y * w + x] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
  }
  return out;
}

export function invertAffine(m: Affine): Affine {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}
