import type { Fill } from '@universal-office/sheet-core';
import { PATTERN_MASKS } from './grid-layout.js';

/**
 * Preenchimento de célula como o Excel o pinta (medido no oráculo, pastas
 * sintéticas t-fills):
 *   - o fundo cobre a célula INTEIRA incluindo as linhas de grade das 4 bordas
 *     (na fronteira entre duas células preenchidas vence a de baixo/direita —
 *     quem pinta por último);
 *   - padrões: tile 8×8 ancorado na ORIGEM da planilha (A1 = 0,0 — o mesmo
 *     padrão em colunas vizinhas continua em fase), fg = pixels "ligados",
 *     bg atrás; sem cores, preto sobre BRANCO (não transparente);
 *   - degradê linear: o ângulo vale no quadrado unitário e estica com a célula
 *     (45° vai de canto a canto); interpolação em sRGB (bate ±3 níveis);
 *   - degradê `path`: retângulos concêntricos do retângulo interno
 *     (left/right/top/bottom) à borda da célula.
 */

/** Tem fundo visível? (padrão ≠ none ou degradê). */
export function hasFill(fill: Fill | undefined): boolean {
  if (!fill) return false;
  if (fill.gradient && fill.gradient.stops.length > 0) return true;
  return !!fill.pattern && fill.pattern !== 'none';
}

const tileCache = new Map<string, HTMLCanvasElement | null>();

function patternTile(name: string, fg: string, bg: string): HTMLCanvasElement | null {
  const key = `${name}|${fg}|${bg}`;
  const hit = tileCache.get(key);
  if (hit !== undefined) return hit;
  const mask = PATTERN_MASKS[name];
  if (!mask || typeof document === 'undefined') { tileCache.set(key, null); return null; }
  const tile = document.createElement('canvas');
  tile.width = 8; tile.height = 8;
  const t = tile.getContext('2d');
  if (!t) { tileCache.set(key, null); return null; }
  t.fillStyle = bg; t.fillRect(0, 0, 8, 8);
  t.fillStyle = fg;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (mask[y]! & (1 << (7 - x))) t.fillRect(x, y, 1, 1);
  tileCache.set(key, tile);
  return tile;
}

/**
 * Pinta o fundo `fill` no retângulo (x,y,w,h) — já estendido pelo chamador
 * para cobrir as linhas de grade. `ox,oy` = posição na tela da origem da
 * planilha (A1), âncora dos padrões.
 */
export function paintCellFill(
  ctx: CanvasRenderingContext2D, fill: Fill | undefined,
  x: number, y: number, w: number, h: number, ox = 0, oy = 0,
): void {
  if (!fill || w <= 0 || h <= 0) return;
  const g = fill.gradient;
  if (g && g.stops.length > 0) {
    if (g.stops.length === 1) { ctx.fillStyle = g.stops[0]!.color; ctx.fillRect(x, y, w, h); return; }
    if (g.type === 'path') { paintPathGradient(ctx, fill, x, y, w, h); return; }
    // ângulo no quadrado unitário esticado para a célula (45° = canto a canto)
    const rad = ((g.degree % 360) * Math.PI) / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const half = (Math.abs(dx) + Math.abs(dy)) / 2;
    const gr = ctx.createLinearGradient(
      x + (0.5 - dx * half) * w, y + (0.5 - dy * half) * h,
      x + (0.5 + dx * half) * w, y + (0.5 + dy * half) * h,
    );
    for (const s of g.stops) gr.addColorStop(Math.min(1, Math.max(0, s.position)), s.color);
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const p = fill.pattern;
  if (!p || p === 'none') return;
  const fg = fill.fgColor ?? '#000000';
  if (p === 'solid') { ctx.fillStyle = fg; ctx.fillRect(x, y, w, h); return; }
  const tile = patternTile(p, fg, fill.bgColor ?? '#FFFFFF');
  if (!tile) { ctx.fillStyle = fill.bgColor ?? '#FFFFFF'; ctx.fillRect(x, y, w, h); return; }
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return;
  // âncora: origem da planilha (o canvas de padrão começa no (0,0) do espaço atual)
  const mx = ((ox % 8) + 8) % 8, my = ((oy % 8) + 8) % 8;
  if (mx || my) pat.setTransform?.(new DOMMatrix([1, 0, 0, 1, mx, my]));
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
}

/** Degradê `path`: t = distância normalizada do retângulo interno até a borda. */
function paintPathGradient(ctx: CanvasRenderingContext2D, fill: Fill, x: number, y: number, w: number, h: number): void {
  const g = fill.gradient!;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (W * H > 4_000_000 || typeof document === 'undefined') { ctx.fillStyle = g.stops[0]!.color; ctx.fillRect(x, y, w, h); return; }
  const stops = [...g.stops].sort((a, b) => a.position - b.position).map((s) => ({ p: s.position, c: hexRgb(s.color) }));
  const L = (g.left ?? 0) * W, R = (g.right ?? 0) * W, T = (g.top ?? 0) * H, B = (g.bottom ?? 0) * H;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const oc = off.getContext('2d');
  if (!oc) return;
  const img = oc.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    const py = j + 0.5;
    const ty = py < T ? (T - py) / Math.max(T, 1e-9) : py > B ? (py - B) / Math.max(H - B, 1e-9) : 0;
    for (let i = 0; i < W; i++) {
      const px = i + 0.5;
      const tx = px < L ? (L - px) / Math.max(L, 1e-9) : px > R ? (px - R) / Math.max(W - R, 1e-9) : 0;
      const t = Math.min(1, Math.max(tx, ty));
      let k = 0;
      while (k < stops.length - 1 && stops[k + 1]!.p < t) k++;
      const a = stops[k]!, b = stops[Math.min(k + 1, stops.length - 1)]!;
      const f = b.p > a.p ? Math.min(1, Math.max(0, (t - a.p) / (b.p - a.p))) : 0;
      const o = (j * W + i) * 4;
      img.data[o] = Math.round(a.c[0] + (b.c[0] - a.c[0]) * f);
      img.data[o + 1] = Math.round(a.c[1] + (b.c[1] - a.c[1]) * f);
      img.data[o + 2] = Math.round(a.c[2] + (b.c[2] - a.c[2]) * f);
      img.data[o + 3] = 255;
    }
  }
  oc.putImageData(img, 0, 0);
  ctx.drawImage(off, x, y, w, h);
}

export function hexRgb(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})/i.exec(c);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
