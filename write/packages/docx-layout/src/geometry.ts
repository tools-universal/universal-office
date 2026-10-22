import type { CustPath, DrawingGroup, Run, ShapeStyle, Theme } from '@universal-office/docx-core';
import type { PathCmdTw, GradFill, ShapeItem } from './tree.js';
import { resolveDrawingColor } from './resolve.js';
import { patternRows } from '@universal-office/drawingml';

/**
 * Geometrias predefinidas do DrawingML (presetShapeDefinitions.xml) usadas nos
 * documentos do Word: caminho no quadro local (0..w × 0..h, twips), com os
 * ajustes (a:avLst, "val N") do arquivo ou os padrões da especificação. Depois
 * vêm espelho (flipH/flipV, dentro do quadro) e rotação (em torno do centro) —
 * a ordem do Word. Geometrias desconhecidas: retângulo.
 */

const K = 0.5522847498;

/** Arco elíptico (ângulos em graus, sentido horário na tela) a partir do ponto atual. */
function arcTo(out: PathCmdTw[], cur: [number, number], wR: number, hR: number, stDeg: number, swDeg: number): [number, number] {
  const st = (stDeg * Math.PI) / 180, sw = (swDeg * Math.PI) / 180;
  const cx = cur[0] - wR * Math.cos(st), cy = cur[1] - hR * Math.sin(st);
  const n = Math.max(1, Math.ceil(Math.abs(swDeg) / 90 - 1e-9));
  const d = sw / n, k = (4 / 3) * Math.tan(d / 4);
  let a = st, x = cur[0], y = cur[1];
  for (let i = 0; i < n; i++) {
    const b = a + d;
    const x2 = cx + wR * Math.cos(b), y2 = cy + hR * Math.sin(b);
    out.push({
      op: 'C',
      x1: x - k * wR * Math.sin(a), y1: y + k * hR * Math.cos(a),
      x2: x2 + k * wR * Math.sin(b), y2: y2 - k * hR * Math.cos(b),
      x: x2, y: y2,
    });
    a = b; x = x2; y = y2;
  }
  return [x, y];
}

const poly = (pts: [number, number][], close = true): PathCmdTw[] => {
  const out: PathCmdTw[] = pts.map(([x, y], i) => ({ op: i ? 'L' : 'M', x, y }));
  if (close) out.push({ op: 'Z' });
  return out;
};

const pin = (lo: number, v: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Caminho local (sem espelho/rotação). adj: valores "val" do a:avLst. */
export function presetPathLocal(prst: string, w: number, h: number, adj: Record<string, number> = {}): PathCmdTw[] {
  const ss = Math.min(w, h), hc = w / 2, vc = h / 2;
  const av = (name: string, def: number): number => adj[name] ?? (name === 'adj1' && adj['adj'] !== undefined ? adj['adj'] : def);
  switch (prst) {
    case 'triangle': {
      const a = pin(0, av('adj', 50000), 100000);
      return poly([[0, h], [(w * a) / 100000, 0], [w, h]]);
    }
    case 'rtTriangle': return poly([[0, 0], [w, h], [0, h]]);
    case 'diamond': return poly([[0, vc], [hc, 0], [w, vc], [hc, h]]);
    case 'parallelogram': {
      const a = pin(0, av('adj', 25000), (100000 * w) / ss), x2 = (ss * a) / 100000;
      return poly([[0, h], [x2, 0], [w, 0], [w - x2, h]]);
    }
    case 'trapezoid': {
      const a = pin(0, av('adj', 25000), (50000 * w) / ss), x2 = (ss * a) / 100000;
      return poly([[0, h], [x2, 0], [w - x2, 0], [w, h]]);
    }
    case 'homePlate': {
      const a = pin(0, av('adj', 50000), (100000 * w) / ss), x1 = w - (ss * a) / 100000;
      return poly([[0, 0], [x1, 0], [w, vc], [x1, h], [0, h]]);
    }
    case 'chevron': {
      const a = pin(0, av('adj', 50000), (100000 * w) / ss), x1 = (ss * a) / 100000;
      return poly([[0, 0], [w - x1, 0], [w, vc], [w - x1, h], [0, h], [x1, vc]]);
    }
    case 'hexagon': {
      const a = pin(0, av('adj', 25000), (50000 * w) / ss), x1 = (ss * a) / 100000;
      const dy1 = ((h / 2) * (av('vf', 115470) / 100000)) * Math.sin(Math.PI / 3);
      return poly([[0, vc], [x1, vc - dy1], [w - x1, vc - dy1], [w, vc], [w - x1, vc + dy1], [x1, vc + dy1]]);
    }
    case 'octagon': {
      const x1 = (ss * pin(0, av('adj', 29289), 50000)) / 100000;
      return poly([[0, x1], [x1, 0], [w - x1, 0], [w, x1], [w, h - x1], [w - x1, h], [x1, h], [0, h - x1]]);
    }
    case 'rightArrow': case 'leftArrow': {
      const a1 = pin(0, av('adj1', 50000), 100000), a2 = pin(0, av('adj2', 50000), (100000 * w) / ss);
      const dx = (ss * a2) / 100000, dy1 = (h * a1) / 200000, y1 = vc - dy1, y2 = vc + dy1;
      if (prst === 'rightArrow') { const x1 = w - dx; return poly([[0, y1], [x1, y1], [x1, 0], [w, vc], [x1, h], [x1, y2], [0, y2]]); }
      return poly([[0, vc], [dx, 0], [dx, y1], [w, y1], [w, y2], [dx, y2], [dx, h]]);
    }
    case 'upArrow': case 'downArrow': {
      const a1 = pin(0, av('adj1', 50000), 100000), a2 = pin(0, av('adj2', 50000), (100000 * h) / ss);
      const dy = (ss * a2) / 100000, dx1 = (w * a1) / 200000, x1 = hc - dx1, x2 = hc + dx1;
      if (prst === 'downArrow') { const y1 = h - dy; return poly([[0, y1], [x1, y1], [x1, 0], [x2, 0], [x2, y1], [w, y1], [hc, h]]); }
      return poly([[0, dy], [hc, 0], [w, dy], [x2, dy], [x2, h], [x1, h], [x1, dy]]);
    }
    // setas duplas (presetShapeDefinitions; corpus t15: forma 70 de .doc)
    case 'upDownArrow': {
      const a1 = pin(0, av('adj1', 50000), 100000), a2 = pin(0, av('adj2', 50000), (50000 * h) / ss);
      const y2 = (ss * a2) / 100000, y3 = h - y2, dx1 = (w * a1) / 200000, x1 = hc - dx1, x2 = hc + dx1;
      return poly([[0, y2], [hc, 0], [w, y2], [x2, y2], [x2, y3], [w, y3], [hc, h], [0, y3], [x1, y3], [x1, y2]]);
    }
    case 'leftRightArrow': {
      const a1 = pin(0, av('adj1', 50000), 100000), a2 = pin(0, av('adj2', 50000), (50000 * w) / ss);
      const x2 = (ss * a2) / 100000, x3 = w - x2, dy = (h * a1) / 200000, y1 = vc - dy, y2 = vc + dy;
      return poly([[0, vc], [x2, 0], [x2, y1], [x3, y1], [x3, 0], [w, vc], [x3, h], [x3, y2], [x2, y2], [x2, h]]);
    }
    case 'ellipse': {
      const rx = w / 2, ry = h / 2;
      return [
        { op: 'M', x: w, y: vc },
        { op: 'C', x1: w, y1: vc + ry * K, x2: hc + rx * K, y2: h, x: hc, y: h },
        { op: 'C', x1: hc - rx * K, y1: h, x2: 0, y2: vc + ry * K, x: 0, y: vc },
        { op: 'C', x1: 0, y1: vc - ry * K, x2: hc - rx * K, y2: 0, x: hc, y: 0 },
        { op: 'C', x1: hc + rx * K, y1: 0, x2: w, y2: vc - ry * K, x: w, y: vc },
        { op: 'Z' },
      ];
    }
    case 'roundRect': {
      const r = (ss * pin(0, av('adj', 16667), 50000)) / 100000;
      const out: PathCmdTw[] = [{ op: 'M', x: 0, y: r }];
      let c: [number, number] = arcTo(out, [0, r], r, r, 180, 90);
      out.push({ op: 'L', x: w - r, y: 0 }); c = arcTo(out, [w - r, 0], r, r, 270, 90);
      out.push({ op: 'L', x: w, y: h - r }); c = arcTo(out, [w, h - r], r, r, 0, 90);
      out.push({ op: 'L', x: r, y: h }); arcTo(out, [r, h], r, r, 90, 90);
      void c;
      out.push({ op: 'Z' });
      return out;
    }
    case 'round2SameRect': {
      const t = (ss * pin(0, av('adj1', 16667), 50000)) / 100000, b = (ss * pin(0, av('adj2', 0), 50000)) / 100000;
      const out: PathCmdTw[] = [{ op: 'M', x: t, y: 0 }, { op: 'L', x: w - t, y: 0 }];
      arcTo(out, [w - t, 0], t, t, 270, 90);
      out.push({ op: 'L', x: w, y: h - b }); arcTo(out, [w, h - b], b, b, 0, 90);
      out.push({ op: 'L', x: b, y: h }); arcTo(out, [b, h], b, b, 90, 90);
      out.push({ op: 'L', x: 0, y: t }); arcTo(out, [0, t], t, t, 180, 90);
      out.push({ op: 'Z' });
      return out;
    }
    case 'frame': {
      const x1 = (ss * pin(0, av('adj1', 12500), 50000)) / 100000;
      // contorno interno no sentido oposto: furo com a regra do número de voltas
      return [...poly([[0, 0], [w, 0], [w, h], [0, h]]), ...poly([[x1, x1], [x1, h - x1], [w - x1, h - x1], [w - x1, x1]])];
    }
    case 'bentConnector3': {
      const x1 = (w * av('adj1', 50000)) / 100000;
      return poly([[0, 0], [x1, 0], [x1, h], [w, h]], false);
    }
    case 'line': case 'straightConnector1':
      return poly([[0, 0], [w, h]], false);
    default:
      return poly([[0, 0], [w, 0], [w, h], [0, h]]);
  }
}

/** Geometrias abertas (só contorno, sem preenchimento). */
export const OPEN_PRESETS = new Set(['line', 'straightConnector1', 'bentConnector3', 'bentConnector2', 'curvedConnector3']);

/** Aplica ponto a ponto uma transformação a um caminho. */
export function mapPath(cmds: PathCmdTw[], f: (x: number, y: number) => [number, number]): PathCmdTw[] {
  return cmds.map((c) => {
    if (c.op === 'Z') return c;
    if (c.op === 'C') {
      const [x1, y1] = f(c.x1, c.y1), [x2, y2] = f(c.x2, c.y2), [x, y] = f(c.x, c.y);
      return { op: 'C', x1, y1, x2, y2, x, y };
    }
    const [x, y] = f(c.x, c.y);
    return { op: c.op, x, y };
  });
}

/**
 * Caminho final da forma no retângulo (x, y, w, h) da página: geometria local,
 * espelho dentro do quadro e rotação (graus, horário) em torno do centro.
 */
export function presetPath(
  prst: string, x: number, y: number, w: number, h: number,
  opts: { adj?: Record<string, number>; flipH?: boolean; flipV?: boolean; rot?: number } = {},
): PathCmdTw[] {
  const local = presetPathLocal(prst, w, h, opts.adj);
  const r = ((opts.rot ?? 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  return mapPath(local, (px, py) => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  });
}

/** Caixa envolvente (pontos de controle incluídos — basta para gradiente/sombra). */
export function pathBounds(cmds: PathCmdTw[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const c of cmds) {
    if (c.op === 'Z') continue;
    if (c.op === 'C') { add(c.x1, c.y1); add(c.x2, c.y2); }
    add(c.x, c.y);
  }
  return { x0, y0, x1, y1 };
}

// ───────────────────────── degradê (a:gradFill) ─────────────────────────

/** Φ (distribuição normal acumulada), aproximação de Abramowitz-Stegun 7.1.26. */
function phi(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/**
 * Cores do degradê em n amostras de t ∈ [0, 1] (RGB 8 bits), como o Word grava
 * no PDF (oráculo de gradientes):
 *  - DUAS paradas, em 0 e 100%: curva em S (normal acumulada, σ = 0,25) com a
 *    mistura em gama 2,2;
 *  - qualquer outro caso: interpolação linear em sRGB entre paradas vizinhas,
 *    cor constante antes da 1ª e depois da última.
 */
export function gradientSamples(stops: { pos: number; color: string }[], n = 512): Uint8Array {
  const out = new Uint8Array(n * 3);
  if (!stops.length) return out;
  const st = stops.map((s) => ({ pos: s.pos, c: hexRgb(s.color) }));
  const two = st.length === 2 && st[0]!.pos <= 0 && st[1]!.pos >= 1;
  const sig = 0.25, p0 = phi(-0.5 / sig), p1 = phi(0.5 / sig);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let c: number[];
    if (two) {
      const g = (phi((t - 0.5) / sig) - p0) / (p1 - p0);
      c = [0, 1, 2].map((k) => 255 * ((st[0]!.c[k]! / 255) ** 2.2 * (1 - g) + (st[1]!.c[k]! / 255) ** 2.2 * g) ** (1 / 2.2));
    } else {
      let j = 0;
      while (j < st.length - 1 && st[j + 1]!.pos < t) j++;
      const a = st[j]!, b = st[Math.min(j + 1, st.length - 1)]!;
      const f = t <= a.pos ? 0 : t >= b.pos || b.pos === a.pos ? 1 : (t - a.pos) / (b.pos - a.pos);
      c = [0, 1, 2].map((k) => a.c[k]! + (b.c[k]! - a.c[k]!) * f);
    }
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.max(0, Math.min(255, Math.round(c[k]!)));
  }
  return out;
}

export type GradGeom = { kind: 'axial'; x0: number; y0: number; x1: number; y1: number } | { kind: 'radial'; x0: number; y0: number; r: number };

/**
 * Onde o degradê começa e termina (mesmas unidades do quadro, y para baixo):
 *  - a:lin: reta pelo centro na direção do ângulo (scaled: direção "covariante"
 *    (cos·h, sen·w)); t = 0/1 nas projeções extremas dos cantos da caixa;
 *  - rotWithShape: caixa = quadro da forma, e o eixo gira com ela; senão caixa =
 *    envoltória do caminho já girado e o eixo fica na página;
 *  - a:path (circle…): centro no fillToRect, raio até o canto mais distante.
 */
export function gradientGeometry(g: GradFill, box: { x: number; y: number; w: number; h: number; rot?: number }, pathBox: { x0: number; y0: number; x1: number; y1: number }): GradGeom {
  const withShape = g.rotWithShape !== false;
  const b = withShape ? box : { x: pathBox.x0, y: pathBox.y0, w: pathBox.x1 - pathBox.x0, h: pathBox.y1 - pathBox.y0 };
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rotPt = (px: number, py: number): [number, number] => {
    if (!withShape || !box.rot) return [px, py];
    const r = (box.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
  };
  if (g.path) {
    const f = g.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
    const fx = b.x + b.w * (f.l + (1 - f.l - f.r) / 2), fy = b.y + b.h * (f.t + (1 - f.t - f.b) / 2);
    const r = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([px, py]) => Math.hypot(px! - fx, py! - fy)));
    const [x0, y0] = rotPt(fx, fy);
    return { kind: 'radial', x0, y0, r };
  }
  const a = (g.angleDeg * Math.PI) / 180;
  let dx = Math.cos(a), dy = Math.sin(a);
  if (g.scaled) { dx *= b.h; dy *= b.w; }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const proj = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [-b.w / 2, b.h / 2], [b.w / 2, b.h / 2]].map(([px, py]) => px! * dx + py! * dy);
  const t0 = Math.min(...proj), t1 = Math.max(...proj);
  const [x0, y0] = rotPt(cx + dx * t0, cy + dy * t0);
  const [x1, y1] = rotPt(cx + dx * t1, cy + dy * t1);
  return { kind: 'axial', x0, y0, x1, y1 };
}

/**
 * Padrão (a:pattFill) num quadro: raster RGBA com 1 pixel do padrão por célula da grade
 * (`px` unidades — 0,75 pt / 15 twips: 1/96 pol, medido no PDF do Word), a grade alinhada
 * à origem da página. Devolve o canto (na unidade do quadro) e o tamanho em células.
 */
export function patternRaster(p: { prst: string; fg: string; bg: string }, x: number, y: number, w: number, h: number, px: number, k = 1): { data: Uint8Array; w: number; h: number; x: number; y: number; cells: { w: number; h: number } } | null {
  const rows = patternRows(p.prst);
  if (!rows || w <= 0 || h <= 0) return null;
  const i0 = Math.floor(x / px), j0 = Math.floor(y / px);
  const W = Math.max(1, Math.ceil((x + w) / px) - i0), H = Math.max(1, Math.ceil((y + h) / px) - j0);
  const fg = hexRgb(p.fg), bg = hexRgb(p.bg);
  // k pixels por célula: sem a interpolação do visualizador borrando o padrão
  const RW = W * k, RH = H * k;
  const data = new Uint8Array(RW * RH * 4);
  for (let y2 = 0; y2 < RH; y2++) {
    const j = Math.floor(y2 / k);
    const row = rows[(((j0 + j) % 8) + 8) % 8]!;
    for (let x2 = 0; x2 < RW; x2++) {
      const i = Math.floor(x2 / k);
      const on = (row >> (7 - ((((i0 + i) % 8) + 8) % 8))) & 1;
      const c = on ? fg : bg, q = (y2 * RW + x2) * 4;
      data[q] = c[0]!; data[q + 1] = c[1]!; data[q + 2] = c[2]!; data[q + 3] = 255;
    }
  }
  return { data, w: RW, h: RH, x: i0 * px, y: j0 * px, cells: { w: W, h: H } };
}

/**
 * Imagem do a:blipFill no quadro: esticada (um retângulo) ou em mosaico (a:tile: escala
 * sx/sy em 1/1000 %, deslocamento tx/ty em EMU, alinhamento do 1º ladrilho; tamanho
 * natural a 96 ppp). `emu` = unidades do quadro por EMU; `natural` em pixels.
 */
export function blipTiles(b: { tile?: { tx: number; ty: number; sx: number; sy: number; algn: string } }, x: number, y: number, w: number, h: number, emu: number, natural: { width: number; height: number } | null): { x: number; y: number; w: number; h: number }[] {
  const t = b.tile;
  if (!t || !natural) return [{ x, y, w, h }];
  const tw = natural.width * 9525 * emu * (t.sx / 100000), th = natural.height * 9525 * emu * (t.sy / 100000);
  if (!(tw > 0) || !(th > 0)) return [{ x, y, w, h }];
  const a = t.algn ?? 'tl';
  const ax = a === 'tr' || a === 'r' || a === 'br' ? x + w - tw : a === 't' || a === 'ctr' || a === 'b' ? x + (w - tw) / 2 : x;
  const ay = a.startsWith('b') ? y + h - th : a === 'l' || a === 'ctr' || a === 'r' ? y + (h - th) / 2 : y;
  const ox = ax + t.tx * emu, oy = ay + t.ty * emu;
  const sx0 = ox - Math.ceil((ox - x) / tw) * tw, sy0 = oy - Math.ceil((oy - y) / th) * th;
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let ty = sy0; ty < y + h && out.length < 4000; ty += th) for (let tx = sx0; tx < x + w; tx += tw) out.push({ x: tx, y: ty, w: tw, h: th });
  return out;
}

/** Degradê em retângulos (a:path path="rect" | "shape"): o "Do Centro" do Word — anéis
 *  retangulares do retângulo de foco (fillToRect) até as bordas do quadro. */
export function isRectGradient(g: GradFill | undefined): boolean {
  return !!g && (g.path === 'rect' || g.path === 'shape');
}

/** Raster RGBA do degradê retangular no quadro (w × h unidades, `ppu` pixels por unidade). */
export function rectGradientRaster(g: GradFill, w: number, h: number, ppu: number): { data: Uint8Array; w: number; h: number } {
  const W = Math.max(1, Math.min(2000, Math.round(w * ppu))), H = Math.max(1, Math.min(2000, Math.round(h * ppu)));
  const f = g.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
  const fx0 = f.l * W, fx1 = (1 - f.r) * W, fy0 = f.t * H, fy1 = (1 - f.b) * H;
  const smp = gradientSamples(g.stops, 256);
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const py = y + 0.5;
    const ty = py < fy0 ? (fy0 - py) / Math.max(1e-6, fy0) : py > fy1 ? (py - fy1) / Math.max(1e-6, H - fy1) : 0;
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const tx = px < fx0 ? (fx0 - px) / Math.max(1e-6, fx0) : px > fx1 ? (px - fx1) / Math.max(1e-6, W - fx1) : 0;
      const t = Math.min(1, Math.max(tx, ty));
      const i = Math.round(t * 255) * 3, k = (y * W + x) * 4;
      data[k] = smp[i]!; data[k + 1] = smp[i + 1]!; data[k + 2] = smp[i + 2]!; data[k + 3] = 255;
    }
  }
  return { data, w: W, h: H };
}

/** Cor do estilo do tema com a do marcador phClr trocada pela da referência (a do
 *  fillRef/effectRef): os modificadores da referência e depois os do estilo. */
export function substPhClr(spec: string, color: string): string {
  if (!spec.startsWith('@phClr')) return spec;
  const mods = spec.split('|')[1];
  if (!mods) return color;
  const [base, cm] = color.split('|');
  return `${base}|${[cm, mods].filter(Boolean).join(',')}`;
}

/** O ShapeStyle com o preenchimento e a sombra dos estilos do tema (fillRef idx 2/3 e
 *  1001…, effectRef) já postos — Estilos de Forma (oráculo textbox-lab style-*). */
export function withThemeStyles(s: ShapeStyle, theme: Theme): ShapeStyle {
  let out = s;
  if (s.fillRef) {
    const list = s.fillRef.idx >= 1000 ? theme.bgFillStyles : theme.fillStyles;
    const ts = list?.[(s.fillRef.idx % 1000) - 1];
    if (ts) {
      const c = s.fillRef.color;
      out = {
        ...out,
        ...(ts.fill ? { fill: substPhClr(ts.fill, c) } : {}),
        ...(ts.gradient ? { gradient: { ...ts.gradient, from: substPhClr(ts.gradient.from, c), to: substPhClr(ts.gradient.to, c), ...(ts.gradient.stops ? { stops: ts.gradient.stops.map((x) => ({ ...x, color: substPhClr(x.color, c) })) } : {}) } } : {}),
        ...(ts.pattern ? { pattern: { ...ts.pattern, fg: substPhClr(ts.pattern.fg, c), bg: substPhClr(ts.pattern.bg, c) } } : {}),
      };
    }
  }
  if (s.effectRef && !s.shadow) {
    const sh = theme.effectStyles?.[s.effectRef.idx - 1];
    if (sh) out = { ...out, shadow: { ...sh, color: substPhClr(sh.color, s.effectRef.color) } };
  }
  return out;
}

/** Degradê, padrão, imagem e sombra de um ShapeStyle com as cores do tema resolvidas (itens 'shape'). */
export function shapeExtras(s0: ShapeStyle, theme: Theme): Pick<ShapeItem, 'grad' | 'shadow' | 'pattern' | 'blip' | 'fx'> {
  const s = withThemeStyles(s0, theme);
  const out: Pick<ShapeItem, 'grad' | 'shadow' | 'pattern' | 'blip' | 'fx'> = {};
  if (s.fx) {
    const f = s.fx, c = (x: string): string => resolveDrawingColor(x, theme) ?? '000000';
    const fx: NonNullable<ShapeItem['fx']> = {};
    if (f.inner) fx.shadow = { kind: 'inner', color: c(f.inner.color), alpha: f.inner.alpha, blurPt: f.inner.blurPt, distPt: f.inner.distPt, dirDeg: f.inner.dirDeg };
    else if (f.outer) {
      const o = f.outer;
      fx.shadow = {
        kind: 'outer', color: c(o.color), alpha: o.alpha, blurPt: o.blurPt, distPt: o.distPt, dirDeg: o.dirDeg,
        ...(o.sx !== undefined ? { sx: o.sx } : {}), ...(o.sy !== undefined ? { sy: o.sy } : {}), ...(o.kxDeg ? { kxDeg: o.kxDeg } : {}), ...(o.kyDeg ? { kyDeg: o.kyDeg } : {}),
        ...(o.algn ? { algn: o.algn } : {}), ...(o.rotWithShape !== undefined ? { rotWithShape: o.rotWithShape } : {}),
      };
    }
    if (f.glow) fx.glow = { color: c(f.glow.color), alpha: f.glow.alpha, radPt: f.glow.radPt };
    if (f.softEdgePt) fx.softEdgePt = f.softEdgePt;
    if (f.reflection) fx.reflection = { ...f.reflection };
    if (Object.keys(fx).length) out.fx = fx;
  }
  if (s.pattern) {
    out.pattern = { prst: s.pattern.prst, fg: resolveDrawingColor(s.pattern.fg, theme) ?? '000000', bg: resolveDrawingColor(s.pattern.bg, theme) ?? 'FFFFFF' };
  }
  if (s.blip) out.blip = s.blip;
  const g = s.gradient;
  if (g?.stops && g.stops.length) {
    out.grad = {
      stops: g.stops.map((st) => ({ pos: st.pos, color: resolveDrawingColor(st.color, theme) ?? '000000' })),
      angleDeg: g.angleDeg,
      ...(g.scaled !== undefined ? { scaled: g.scaled } : {}),
      ...(g.rotWithShape !== undefined ? { rotWithShape: g.rotWithShape } : {}),
      ...(g.path ? { path: g.path } : {}),
      ...(g.fillTo ? { fillTo: g.fillTo } : {}),
    };
  }
  if (s.shadow) {
    const c = resolveDrawingColor(s.shadow.color, theme);
    if (c) out.shadow = { ...s.shadow, color: c };
  }
  return out;
}

// ───────────────────────── grupos girados/espelhados ─────────────────────────

/**
 * Filho de um grupo no retângulo da página, com a rotação/espelho do GRUPO
 * aplicados: o centro do filho gira (espelha) em torno do centro do grupo e a
 * rotação/espelho do filho somam os do grupo (a:grpSpPr/a:xfrm).
 */
export function groupChild(gr: DrawingGroup, item: DrawingGroup['items'][number], x: number, y: number, w: number, h: number): { run: Run; x: number; y: number; w: number; h: number } {
  const sx = gr.widthTwips ? w / gr.widthTwips : 1, sy = gr.heightTwips ? h / gr.heightTwips : 1;
  const iw = item.w * sx, ih = item.h * sy;
  let ix = x + item.x * sx, iy = y + item.y * sy;
  if (!gr.rot && !gr.flipH && !gr.flipV) return { run: item.run, x: ix, y: iy, w: iw, h: ih };
  const gcx = x + w / 2, gcy = y + h / 2;
  let cx = ix + iw / 2, cy = iy + ih / 2;
  if (gr.flipH) cx = 2 * gcx - cx;
  if (gr.flipV) cy = 2 * gcy - cy;
  const a = ((gr.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  [cx, cy] = [gcx + (cx - gcx) * c - (cy - gcy) * s, gcy + (cx - gcx) * s + (cy - gcy) * c];
  ix = cx - iw / 2; iy = cy - ih / 2;
  // espelho ímpar inverte o sentido da rotação do filho
  const mirror = !!gr.flipH !== !!gr.flipV;
  const xf = <T extends ShapeStyle | undefined>(st: T): T => {
    if (!st) return st;
    const r = ((mirror ? -(st.rot ?? 0) : (st.rot ?? 0)) + (gr.rot ?? 0)) % 360;
    return { ...st, rot: r, flipH: !!st.flipH !== !!gr.flipH, flipV: !!st.flipV !== !!gr.flipV };
  };
  const r0 = item.run;
  const run: Run = { ...r0 };
  if (r0.shape) run.shape = { ...r0.shape, style: xf(r0.shape.style) };
  if (r0.image) run.image = { ...r0.image, style: xf(r0.image.style ?? { geom: 'rect' }) };
  if (r0.textbox) {
    const tb = { ...r0.textbox };
    if (tb.shape) tb.shape = xf(tb.shape);
    const tr = ((mirror ? -(tb.rot ?? 0) : (tb.rot ?? 0)) + (gr.rot ?? 0)) % 360;
    if (tr) tb.rot = tr;
    run.textbox = tb;
  }
  if (r0.group) run.group = { ...r0.group, rot: ((r0.group.rot ?? 0) + (gr.rot ?? 0)) % 360, flipH: !!r0.group.flipH !== !!gr.flipH, flipV: !!r0.group.flipV !== !!gr.flipV };
  return { run, x: ix, y: iy, w: iw, h: ih };
}

// ───────────────────────── a:custGeom ─────────────────────────

/**
 * Caminhos de a:custGeom no retângulo (x, y, w, h) da página, com espelho e
 * rotação como as predefinidas. Cada caminho do arquivo é preenchido à parte,
 * com a regra par-ímpar (oráculo cust: subcaminhos sobrepostos fazem furo; dois
 * caminhos se somam); fill="none" só contorna.
 */
export function custPaths(
  cust: CustPath[], x: number, y: number, w: number, h: number,
  opts: { flipH?: boolean; flipV?: boolean; rot?: number } = {},
): { cmds: PathCmdTw[]; fill: boolean; stroke: boolean }[] {
  const r = ((opts.rot ?? 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  const place = (px: number, py: number): [number, number] => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  };
  return cust.map((p) => {
    const sx = w / (p.w || 1), sy = h / (p.h || 1);
    const local: PathCmdTw[] = [];
    let cur: [number, number] = [0, 0];
    let start: [number, number] = [0, 0];
    for (const k of p.cmds) {
      if (k.op === 'M' || k.op === 'L') {
        cur = [k.x * sx, k.y * sy];
        if (k.op === 'M') start = cur;
        local.push({ op: k.op, x: cur[0], y: cur[1] });
      } else if (k.op === 'C' && k.pts.length >= 3) {
        const [a, b, d] = k.pts.map(([px, py]) => [px * sx, py * sy] as [number, number]);
        local.push({ op: 'C', x1: a![0], y1: a![1], x2: b![0], y2: b![1], x: d![0], y: d![1] });
        cur = d!;
      } else if (k.op === 'Q' && k.pts.length >= 2) {
        // quadrática → cúbica (pontos de controle a 2/3)
        const [q, d] = k.pts.map(([px, py]) => [px * sx, py * sy] as [number, number]);
        local.push({ op: 'C', x1: cur[0] + (2 / 3) * (q![0] - cur[0]), y1: cur[1] + (2 / 3) * (q![1] - cur[1]), x2: d![0] + (2 / 3) * (q![0] - d![0]), y2: d![1] + (2 / 3) * (q![1] - d![1]), x: d![0], y: d![1] });
        cur = d!;
      } else if (k.op === 'A') {
        cur = arcTo(local, cur, k.wR * sx, k.hR * sy, k.st, k.sw);
      } else if (k.op === 'Z') {
        local.push({ op: 'Z' });
        cur = start;
      }
    }
    return { cmds: mapPath(local, place), fill: p.fill, stroke: p.stroke };
  });
}
