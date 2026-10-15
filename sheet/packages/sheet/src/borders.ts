import type { Border, BorderEdge } from '@universal/sheet-core';

/**
 * Bordas de célula como o Excel as pinta na tela (medido no oráculo com as
 * pastas sintéticas t-borders / t-prec, 100% de zoom):
 *
 * - Posição: a linha fina ocupa o pixel da linha de grade (fronteira); as
 *   médias (medium, mediumDashed, mediumDashDot, mediumDashDotDot,
 *   slantDashDot) ocupam o pixel anterior + o da fronteira; thick é centrada
 *   (−1..+1); double são 2 linhas de 1 px em −1 e +1 (vão na fronteira).
 * - Tracejados ancorados nas coordenadas ABSOLUTAS da planilha (A1 = 0):
 *   hair 1/1, dotted 2/2, dashed 3/1, dashDot 9-3-3-3, dashDotDot
 *   9-3-3-3-3-3, mediumDashed 9/3, slantDashDot 10-2-4-2 em 2 linhas
 *   deslocadas 1 px (o "inclinado"). Os vãos apagam a linha de grade (branco).
 * - Conflito entre vizinhas (borda de baixo da de cima × de cima da de baixo;
 *   direita × esquerda): vence a de MAIOR peso — hair < dashDotDot < dashDot <
 *   dotted < dashed < thin < mediumDashDotDot < slantDashDot < mediumDashDot <
 *   mediumDashed < medium < thick < double; empate: a de baixo / da direita.
 * - Cantos: a linha horizontal se estende sobre a largura das verticais que
 *   chegam ao canto (caixa medium/thick fecha sem falha); duplas formam
 *   moldura (externa encontra externa, interna encontra interna).
 */

export const BORDER_RANK: Record<string, number> = {
  hair: 1, dashDotDot: 2, dashDot: 3, dotted: 4, dashed: 5, thin: 6,
  mediumDashDotDot: 7, slantDashDot: 8, mediumDashDot: 9, mediumDashed: 10,
  medium: 11, thick: 12, double: 13,
};

/** Vencedora entre a borda de `a` (cima/esquerda) e a de `b` (baixo/direita). */
export function winningEdge(a: BorderEdge | undefined, b: BorderEdge | undefined): BorderEdge | undefined {
  const ra = a?.style ? BORDER_RANK[a.style] ?? 6 : 0;
  const rb = b?.style ? BORDER_RANK[b.style] ?? 6 : 0;
  if (!ra && !rb) return undefined;
  return rb >= ra ? b : a;
}

const MEDIUMS = new Set(['medium', 'mediumDashed', 'mediumDashDot', 'mediumDashDotDot', 'slantDashDot']);

/** Pixels ocupados em relação à fronteira: [antes, depois] (thin = [0,0]). */
export function edgeExtent(style: string | undefined): [number, number] {
  if (!style) return [0, 0];
  if (style === 'thick' || style === 'double') return [1, 1];
  if (MEDIUMS.has(style)) return [1, 0];
  return [0, 0];
}

/** Liga/desliga do tracejado na coordenada absoluta `p` (H = horizontal). */
function dashOn(style: string, p: number, horizontal: boolean): boolean {
  const m = (n: number): number => ((p % n) + n) % n;
  switch (style) {
    case 'hair': return horizontal ? m(2) === 0 : m(2) === 1;
    case 'dotted': { const q = m(4); return horizontal ? q === 3 || q === 0 : q === 1 || q === 2; }
    case 'dashed': return horizontal ? m(4) !== 0 : m(4) !== 2;
    case 'dashDot': case 'mediumDashDot': { const q = m(18); return q < 9 || (q >= 12 && q < 15); }
    case 'dashDotDot': case 'mediumDashDotDot': { const q = m(24); return q < 9 || (q >= 12 && q < 15) || (q >= 18 && q < 21); }
    case 'mediumDashed': return m(12) < 9;
    case 'slantDashDot': { const q = m(18); return q < 10 || (q >= 12 && q < 16); }
    default: return true;
  }
}

const SOLID = new Set(['thin', 'medium', 'thick', 'double']);

/**
 * Uma linha de 1 px ao longo do eixo: de `a` a `b` (inclusive), na coordenada
 * fixa `c`. `anchor` converte a posição na tela em coordenada da planilha.
 */
function run(
  ctx: CanvasRenderingContext2D, style: string, horizontal: boolean,
  a: number, b: number, c: number, anchor: number, erase: string | null, shift = 0,
): void {
  if (b < a) return;
  if (SOLID.has(style)) {
    if (horizontal) ctx.fillRect(a, c, b - a + 1, 1); else ctx.fillRect(c, a, 1, b - a + 1);
    return;
  }
  const color = ctx.fillStyle;
  if (erase) {
    ctx.fillStyle = erase;
    if (horizontal) ctx.fillRect(a, c, b - a + 1, 1); else ctx.fillRect(c, a, 1, b - a + 1);
    ctx.fillStyle = color;
  }
  let start = -1;
  for (let p = a; p <= b + 1; p++) {
    const on = p <= b && dashOn(style, p + anchor - shift, horizontal);
    if (on && start < 0) start = p;
    else if (!on && start >= 0) {
      if (horizontal) ctx.fillRect(start, c, p - start, 1); else ctx.fillRect(c, start, 1, p - start);
      start = -1;
    }
  }
}

/** Contexto de um canto para as pontas de uma linha: extensões e duplas dos lados. */
export interface CornerInfo {
  /** Quanto as perpendiculares avançam para trás/para frente da fronteira (px). */
  before: number;
  after: number;
  /** Perpendicular DUPLA do lado "antes" (acima/esquerda) e "depois" (abaixo/direita). */
  doubleBefore: boolean;
  doubleAfter: boolean;
}

export const NO_CORNER: CornerInfo = { before: 0, after: 0, doubleBefore: false, doubleAfter: false };

/**
 * Linha horizontal na fronteira `y` (pixel da grade), das quinas `x0` a `x1`.
 * `c0`/`c1`: perpendiculares nas quinas esquerda/direita. `ax`: coordenada da
 * planilha de x = 0 (âncora dos tracejados). `erase`: cor que apaga a linha
 * de grade nos vãos (null = sem grade sob a linha).
 */
export function paintHEdge(
  ctx: CanvasRenderingContext2D, e: BorderEdge, x0: number, x1: number, y: number,
  c0: CornerInfo, c1: CornerInfo, ax: number, erase: string | null,
): void {
  const st = e.style ?? 'thin';
  ctx.fillStyle = e.color ?? '#000000';
  const a = x0 - c0.before, b = x1 + c1.after;
  if (st === 'double') {
    // externa (y−1) e interna (y+1): param na perpendicular dupla do mesmo lado
    run(ctx, st, true, c0.doubleBefore ? x0 + 1 : a, c1.doubleBefore ? x1 - 1 : b, y - 1, ax, erase);
    run(ctx, st, true, c0.doubleAfter ? x0 + 1 : a, c1.doubleAfter ? x1 - 1 : b, y + 1, ax, erase);
    return;
  }
  const [lo, hi] = edgeExtent(st);
  for (let k = -lo; k <= hi; k++) {
    // slantDashDot: a linha de cima é a de baixo deslocada 1 px para a direita
    run(ctx, st, true, a, b, y + k, ax, erase, st === 'slantDashDot' && k < 0 ? 1 : 0);
  }
}

/** Linha vertical na fronteira `x`, das quinas `y0` a `y1` (ver paintHEdge). */
export function paintVEdge(
  ctx: CanvasRenderingContext2D, e: BorderEdge, y0: number, y1: number, x: number,
  c0: CornerInfo, c1: CornerInfo, ay: number, erase: string | null,
): void {
  const st = e.style ?? 'thin';
  ctx.fillStyle = e.color ?? '#000000';
  const a = y0 - c0.before, b = y1 + c1.after;
  if (st === 'double') {
    run(ctx, st, false, c0.doubleBefore ? y0 + 1 : a, c1.doubleBefore ? y1 - 1 : b, x - 1, ay, erase);
    run(ctx, st, false, c0.doubleAfter ? y0 + 1 : a, c1.doubleAfter ? y1 - 1 : b, x + 1, ay, erase);
    return;
  }
  const [lo, hi] = edgeExtent(st);
  for (let k = -lo; k <= hi; k++) {
    // slantDashDot: a coluna da esquerda desce 1 px
    run(ctx, st, false, a, b, x + k, ay, erase, st === 'slantDashDot' && k < 0 ? 1 : 0);
  }
}

/** Diagonais da célula (diagonalUp: inf-esq → sup-dir; diagonalDown: sup-esq → inf-dir). */
export function paintDiagonals(ctx: CanvasRenderingContext2D, border: Border, x: number, y: number, w: number, h: number): void {
  const e = border.diagonal;
  if (!e?.style || (!border.diagonalUp && !border.diagonalDown)) return;
  const st = e.style;
  // o Excel traça a diagonal com caneta serrilhada: a média sai ~3 px na vertical
  const lw = st === 'thick' ? 3.5 : MEDIUMS.has(st) ? 2.5 : 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = e.color ?? '#000000';
  ctx.lineWidth = lw;
  const dash: Record<string, number[]> = {
    hair: [1, 1], dotted: [2, 2], dashed: [3, 1], dashDot: [9, 3, 3, 3], mediumDashDot: [9, 3, 3, 3],
    dashDotDot: [9, 3, 3, 3, 3, 3], mediumDashDotDot: [9, 3, 3, 3, 3, 3], mediumDashed: [9, 3], slantDashDot: [10, 2, 4, 2],
  };
  ctx.setLineDash(dash[st] ?? []);
  // dupla: duas linhas finas deslocadas na perpendicular (±1,5 px)
  const line = (ax: number, ay: number, bx: number, by: number, off: number): void => {
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * off, ny = ((bx - ax) / len) * off;
    ctx.beginPath(); ctx.moveTo(ax + nx, ay + ny); ctx.lineTo(bx + nx, by + ny); ctx.stroke();
  };
  const offs = st === 'double' ? [-1.5, 1.5] : [0];
  for (const o of offs) {
    if (border.diagonalDown) line(x, y, x + w, y + h, o);
    if (border.diagonalUp) line(x, y + h, x + w, y, o);
  }
  ctx.restore();
}
