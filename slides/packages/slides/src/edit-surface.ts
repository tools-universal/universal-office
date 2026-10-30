// Superfície de edição do <universal-slides> (só com a interface embutida):
// o que se desenha POR CIMA do slide no modo de edição — a caixa da forma
// selecionada com as alças e o texto de aviso dos placeholders vazios
// ("Clique para adicionar um título", só na tela: nunca na apresentação, nas
// miniaturas ou no arquivo) — e os testes de clique (forma, alça).
import type { Shape, Slide } from '@universal-office/slides-core';

export interface Fit { ox: number; oy: number; scale: number }

/** Retângulo de uma forma em px (CSS) do canvas, com o giro em graus. */
export interface ShapeRect { x: number; y: number; w: number; h: number; rot: number }

export function shapeRect(sh: Shape, fit: Fit): ShapeRect | null {
  const x = sh.xfrm;
  if (!x) return null;
  return { x: fit.ox + x.x * fit.scale, y: fit.oy + x.y * fit.scale, w: x.cx * fit.scale, h: x.cy * fit.scale, rot: (x.rot ?? 0) / 60000 };
}

/** Ponto no sistema da forma (sem o giro, em volta do centro). */
function unrotate(r: ShapeRect, px: number, py: number): [number, number] {
  if (!r.rot) return [px, py];
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const a = -r.rot * Math.PI / 180;
  const dx = px - cx, dy = py - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** A forma pode ser selecionada? (decoração do layout/master e partes de SmartArt, não) */
export function selectable(sh: Shape): boolean {
  return !sh.inherited && !sh.dgmId && !sh.dgmTextOf && !!sh.xfrm;
}

/** Forma (índice) sob o ponto — a mais ao topo; -1 nenhuma. Linhas finas ganham 4 px de folga. */
export function hitShape(slide: Slide, px: number, py: number, fit: Fit): number {
  for (let i = slide.shapes.length - 1; i >= 0; i--) {
    const sh = slide.shapes[i]!;
    if (!selectable(sh)) continue;
    const r = shapeRect(sh, fit)!;
    const [x, y] = unrotate(r, px, py);
    const pad = 4;
    if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return i;
  }
  return -1;
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: [Handle, number, number][] = [['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5], ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5]];
export const HANDLE_CURSOR: Record<Handle, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

/** Alça sob o ponto (só formas sem giro têm alças). */
export function hitHandle(r: ShapeRect, px: number, py: number): Handle | null {
  if (r.rot) return null;
  for (const [h, fx, fy] of HANDLES) {
    if (Math.abs(px - (r.x + r.w * fx)) <= 6 && Math.abs(py - (r.y + r.h * fy)) <= 6) return h;
  }
  return null;
}

/** Novo retângulo (EMU) ao arrastar a alça `h` por (dx, dy) EMU; Shift mantém a proporção. */
export function resizeFrame(f: { x: number; y: number; cx: number; cy: number }, h: Handle, dx: number, dy: number, keepRatio: boolean): { x: number; y: number; cx: number; cy: number } {
  let { x, y, cx, cy } = f;
  const min = 12700 * 4;
  if (h.includes('w')) { x += dx; cx -= dx; }
  if (h.includes('e')) cx += dx;
  if (h.includes('n')) { y += dy; cy -= dy; }
  if (h.includes('s')) cy += dy;
  if (keepRatio && f.cx > 0 && f.cy > 0 && h.length === 2) {
    const k = Math.max(cx / f.cx, cy / f.cy);
    const ncx = f.cx * k, ncy = f.cy * k;
    if (h.includes('w')) x = f.x + f.cx - ncx;
    if (h.includes('n')) y = f.y + f.cy - ncy;
    cx = ncx; cy = ncy;
  }
  if (cx < min) { if (h.includes('w')) x -= min - cx; cx = min; }
  if (cy < min) { if (h.includes('n')) y -= min - cy; cy = min; }
  return { x, y, cx, cy };
}

/** Caixa da forma selecionada (girada como a forma) e as alças. */
export function drawSelection(ctx: CanvasRenderingContext2D, r: ShapeRect, color: string, handles: boolean): void {
  ctx.save();
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(r.rot * Math.PI / 180);
  ctx.translate(-cx, -cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
  if (handles && !r.rot) {
    for (const [, fx, fy] of HANDLES) {
      const hx = r.x + r.w * fx, hy = r.y + r.h * fy;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

export interface PromptLabels { title: string; subtitle: string; text: string; picture: string; object: string }

const TEXT_TYPES = new Set([undefined, 'title', 'ctrTitle', 'subTitle', 'body', 'obj']);
const FOOTER_TYPES = new Set(['dt', 'ftr', 'sldNum', 'hdr']);

/** Placeholder sem texto (o aviso aparece só nele). */
export function isEmptyPlaceholder(sh: Shape): boolean {
  if (sh.inherited || (sh.phType === undefined && sh.phIdx === undefined) || FOOTER_TYPES.has(sh.phType ?? '')) return false;
  if (sh.image || sh.table || sh.chartXml) return false;
  return !(sh.txBody?.paragraphs ?? []).some((p) => p.runs.some((r) => r.text.trim() !== ''));
}

/** Contorno tracejado e texto de aviso dos placeholders vazios (como o app no modo Normal). */
export function drawPrompts(ctx: CanvasRenderingContext2D, slide: Slide, fit: Fit, L: PromptLabels, fontStack: string, skip?: number): void {
  slide.shapes.forEach((sh, i) => {
    if (i === skip || !isEmptyPlaceholder(sh)) return;
    const r = shapeRect(sh, fit);
    if (!r || r.w < 4 || r.h < 4) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
    const t = sh.phType;
    const text = t === 'title' || t === 'ctrTitle' ? L.title : t === 'subTitle' ? L.subtitle
      : TEXT_TYPES.has(t) ? (t === undefined && !sh.txBody ? L.object : L.text) : t === 'pic' ? L.picture : L.object;
    const p = sh.txBody?.paragraphs[0];
    const pt = p?.endSz ?? (t === 'title' || t === 'ctrTitle' ? 44 : 24);
    const px = Math.max(6, Math.min(r.h * 0.8, pt * 12700 * fit.scale * (sh.txBody?.fontScale ?? 1)));
    ctx.font = `${px}px ${fontStack}`;
    ctx.fillStyle = 'rgba(110,110,110,.95)';
    const algn = p?.align ?? (t === 'ctrTitle' || t === 'subTitle' ? 'ctr' : 'l');
    ctx.textAlign = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left';
    const anchor = sh.txBody?.anchor ?? (t === 'ctrTitle' ? 'b' : t === 'title' ? 'ctr' : 't');
    ctx.textBaseline = anchor === 'b' ? 'bottom' : anchor === 'ctr' ? 'middle' : 'top';
    const pad = 0.1 * 914400 * fit.scale;
    const tx = algn === 'ctr' ? r.x + r.w / 2 : algn === 'r' ? r.x + r.w - pad : r.x + pad;
    const ty = anchor === 'b' ? r.y + r.h - pad / 2 : anchor === 'ctr' ? r.y + r.h / 2 : r.y + pad / 2;
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.fillText(text, tx, ty, Math.max(10, r.w - pad * 2));
    ctx.restore();
  });
}
