/**
 * Contorno de quebra (wp:wrapPolygon, unidades 0..21600) de uma imagem com
 * transparência — o que o Word grava ao escolher Justo/Através. Medido
 * (write/tools/image-lab, alpha-tight e shape-tight-*): grade de 96 células no
 * lado maior (480×360 → 96×72), vértices nas células (o retângulo cheio vai de 0
 * a 95/96·21600), a figura engordada ~2 células, os vãos que abrem para cima ou
 * para baixo preenchidos (o contorno segue o extremo esquerdo e o direito de cada
 * linha da grade; o furo de um anel some) e o resultado simplificado (o círculo
 * sai com 18 vértices). A simplificação do Word não é reproduzida ponto a ponto:
 * aqui é Douglas–Peucker com 1 célula.
 */

/** null = sem transparência útil (fica o retângulo padrão). */
export function wrapContour(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number): [number, number][] | null {
  if (w < 1 || h < 1) return null;
  const N = 96;
  const gw = w >= h ? N : Math.max(1, Math.round((N * w) / h));
  const gh = h >= w ? N : Math.max(1, Math.round((N * h) / w));
  const occ = new Uint8Array(gw * gh);
  let filled = 0;
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, Math.floor((y * gh) / h));
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3]! === 0) continue;
      const k = gy * gw + Math.min(gw - 1, Math.floor((x * gw) / w));
      if (!occ[k]) { occ[k] = 1; filled++; }
    }
  }
  if (!filled || filled === gw * gh) return null;
  // engorda 2 células (quadrado: os cantos do L ficam retos, como no Word)
  const R = 2;
  const dil = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!occ[y * gw + x]) continue;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) dil[yy * gw + xx] = 1;
        }
      }
    }
  }
  if (dil.every((v) => v === 1)) return null;
  // extremos de cada linha da grade
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let y = 0; y < gh; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < gw; x++) if (dil[y * gw + x]) { if (l < 0) l = x; r = x; }
    if (l < 0) continue;
    left.push([l, y]);
    right.push([r, y]);
  }
  if (!left.length) return null;
  const ring = [...left, ...right.reverse()];
  const simple = douglasPeucker(ring, 1);
  const pts = simple.map(([x, y]): [number, number] => [Math.round((x * 21600) / gw), Math.round((y * 21600) / gh)]);
  pts.push([pts[0]![0], pts[0]![1]]);
  return pts;
}

function douglasPeucker(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a]!, [bx, by] = pts[b]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]!;
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > best) { best = d; bi = i; }
    }
    if (best > eps && bi > 0) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
