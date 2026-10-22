/**
 * Imagem com Formato da Imagem no CANVAS (editor e viewer): forma (Cortar para
 * Forma), ajustes de cor, bordas suaves, sombra interna, contorno (todo do lado
 * de fora), brilho, sombra externa e reflexo — compostos numa camada no
 * referencial da imagem (antes do giro) com as máscaras de
 * @universal-office/drawingml, e a camada desenhada girada. Camadas em cache por
 * imagem + aparência + resolução.
 */
import {
  presetOutline, flattenPath, fillPolygons, newMask, outerShadowMask, innerShadowMask, glowMask, softEdgeMask, reflectionAlpha,
  gaussianBlur, shadeBevel, type Mask, type PathSeg,
} from '@universal-office/drawingml';
import type { ImageItem, PictureLook } from './tree.js';
import { applyImageEffects, applyPictureAdjust } from './images.js';

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function canvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const ctx2d = (c: AnyCanvas): Ctx2D => c.getContext('2d') as Ctx2D;

interface Layer {
  c: AnyCanvas;
  /** canto da camada relativo ao canto da caixa da imagem (pt) */
  x0: number; y0: number;
  /** pixels por ponto */
  ppt: number;
}

const cache = new WeakMap<object, Map<string, Layer>>();

/** Precisa do pintor da imagem formatada? (senão o caminho rápido de sempre) */
export function needsPicturePainter(it: ImageItem): boolean {
  // (recorte com giro/espelho também: o quadro visível gira junto com a imagem)
  return !!it.pic || !!it.image.effects || !!(it.crop && (it.crop.l || it.crop.t || it.crop.r || it.crop.b) && (it.rot || it.flipH || it.flipV));
}

const DASH: Record<string, number[]> = {
  sysDot: [1, 1], sysDash: [3, 1], dash: [4, 3], dashDot: [4, 3, 1, 3], lgDash: [8, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1],
};

/** Caixa (pt, relativa ao canto da imagem) que os efeitos ocupam. */
function bounds(look: PictureLook | undefined, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  const grow = (a: number, b: number, c: number, d: number): void => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  if (!look) return { x0, y0, x1, y1 };
  if (look.line) { const lw = look.line.widthPt; grow(-lw, -lw, w + lw, h + lw); }
  if (look.glow) { const r = look.glow.radPt; grow(-r, -r, w + r, h + r); }
  const s = look.shadow;
  if (s?.kind === 'outer') {
    const a = (s.dirDeg * Math.PI) / 180, dx = s.distPt * Math.cos(a), dy = s.distPt * Math.sin(a);
    const sx = Math.abs(s.sx ?? 1), sy = Math.abs(s.sy ?? 1);
    const k = Math.abs(Math.tan(((s.kxDeg ?? 0) * Math.PI) / 180)) * h + Math.abs(Math.tan(((s.kyDeg ?? 0) * Math.PI) / 180)) * w;
    const m = s.blurPt + k + Math.max(w, h) * Math.max(0, Math.max(sx, sy) - 1) + (sy < 0 || (s.sy ?? 1) < 0 ? h : 0);
    grow(dx - m, dy - m - (s.sy !== undefined && s.sy < 0 ? h : 0), w + dx + m, h + dy + m + (s.sy !== undefined && s.sy < 0 ? h : 0));
  }
  const r = look.reflection;
  if (r) {
    const a = (r.dirDeg * Math.PI) / 180;
    const dx = r.distPt * Math.cos(a), dy = r.distPt * Math.sin(a);
    const lw = look.line?.widthPt ?? 0;
    grow(dx - r.blurPt - lw, h + dy - r.blurPt, w + dx + r.blurPt + lw, 2 * h + dy + r.blurPt + lw);
  }
  return { x0, y0, x1, y1 };
}

/** Subcaminhos da forma (pt, no canto da caixa), com o espelho da imagem. */
function shapeSubs(look: PictureLook | undefined, w: number, h: number, flipH: boolean, flipV: boolean): PathSeg[][] {
  const o = presetOutline(look?.geom?.prst, w, h, look?.geom?.adj);
  const subs = o.subs.filter((_, i) => o.fill[i] !== false);
  if (!flipH && !flipV) return subs;
  const fx = (x: number): number => (flipH ? w - x : x), fy = (y: number): number => (flipV ? h - y : y);
  return subs.map((sub) => sub.map((s): PathSeg => {
    switch (s.c) {
      case 'M': case 'L': return { ...s, x: fx(s.x), y: fy(s.y) };
      case 'C': return { ...s, x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2), x: fx(s.x), y: fy(s.y) };
      case 'Q': return { ...s, x1: fx(s.x1), y1: fy(s.y1), x: fx(s.x), y: fy(s.y) };
      case 'E': {
        // arco espelhado: ângulos refletidos e sentido invertido
        const a0 = flipH ? Math.PI - s.a0 : s.a0, a1 = flipH ? Math.PI - s.a1 : s.a1;
        const b0 = flipV ? -a0 : a0, b1 = flipV ? -a1 : a1;
        return { ...s, cx: fx(s.cx), cy: fy(s.cy), a0: b0, a1: b1, ccw: flipH !== flipV ? !s.ccw : !!s.ccw };
      }
      default: return s;
    }
  }));
}

function tracePath(c: Ctx2D, polys: number[][]): void {
  c.beginPath();
  for (const p of polys) {
    c.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i]!, p[i + 1]!);
    c.closePath();
  }
}

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];

/** Pinta uma máscara colorida numa camada. */
function maskToCanvas(m: Mask, hex: string, alpha: number): AnyCanvas {
  const c = canvas(m.w, m.h);
  const x = ctx2d(c);
  const img = x.createImageData(m.w, m.h);
  const [r, g, b] = rgb(hex);
  for (let i = 0; i < m.a.length; i++) {
    const k = i * 4;
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b;
    img.data[k + 3] = Math.round(Math.max(0, Math.min(1, m.a[i]! * alpha)) * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Bitmap com os ajustes de cor do a:blip aplicados (em cache por imagem). */
const adjusted = new WeakMap<object, Map<string, AnyCanvas>>();
function adjustedBitmap(it: ImageItem, bmp: CanvasImageSource & { width: number; height: number }): CanvasImageSource {
  const look = it.pic, fx = it.image.effects;
  if (!fx && look?.alpha === undefined && !look?.duotone && !look?.clrChange) return bmp;
  const key = JSON.stringify([fx, look?.alpha, look?.duotone, look?.clrChange]);
  let m = adjusted.get(it.image);
  if (!m) { m = new Map(); adjusted.set(it.image, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const c = canvas(Math.max(1, bmp.width), Math.max(1, bmp.height));
  const x = ctx2d(c);
  x.drawImage(bmp, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data as unknown as Uint8Array;
  if (fx) applyImageEffects(d, fx);
  if (look) applyPictureAdjust(d, look);
  x.putImageData(img, 0, 0);
  m.set(key, c);
  return c;
}

function buildLayer(it: ImageItem, bmp: CanvasImageSource & { width: number; height: number }, ppt0: number): Layer {
  const look = it.pic;
  const w = it.w / 20, h = it.h / 20;
  const bb = bounds(look, w, h);
  let ppt = ppt0;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 12e6) ppt *= Math.sqrt(12e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const subs = shapeSubs(look, w, h, !!it.flipH, !!it.flipV);
  const polys = flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35);

  // a imagem (recorte, espelho, ajustes) recortada pela forma
  const pic = canvas(W, H);
  const pc = ctx2d(pic);
  pc.save();
  tracePath(pc, polys);
  pc.clip();
  const crop = it.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  const fw = w / Math.max(0.01, 1 - crop.l - crop.r), fh = h / Math.max(0.01, 1 - crop.t - crop.b);
  pc.translate(ox + (w / 2) * ppt, oy + (h / 2) * ppt);
  pc.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
  const src = adjustedBitmap(it, bmp);
  pc.imageSmoothingEnabled = true;
  pc.imageSmoothingQuality = 'high';
  pc.drawImage(src, (-w / 2 - crop.l * fw) * ppt, (-h / 2 - crop.t * fh) * ppt, fw * ppt, fh * ppt);
  pc.restore();
  // chanfro: a luz 3D sobre a imagem dentro da forma
  if (look?.bevel) {
    const img = pc.getImageData(0, 0, W, H);
    const shapeM = fillPolygons(newMask(W, H), polys);
    shadeBevel(img.data, shapeM, { w: look.bevel.wPt * ppt, h: look.bevel.hPt * ppt, prst: look.bevel.prst, rig: look.bevel.rig, dir: look.bevel.dir, material: look.bevel.material, word: true });
    pc.putImageData(img, 0, 0);
  }

  // silhueta: a forma (e a transparência da imagem)
  const sil = fillPolygons(newMask(W, H), polys);
  if (look?.softEdgePt || look?.shadow || look?.glow) {
    const a = pc.getImageData(0, 0, W, H).data;
    for (let i = 0; i < sil.a.length; i++) sil.a[i] = Math.min(sil.a[i]!, a[i * 4 + 3]! / 255 / (look?.alpha ?? 1));
  }
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };

  // bordas suaves: o alfa da forma inteira (imagem + contorno)
  const shape = canvas(W, H);
  const sc = ctx2d(shape);
  sc.drawImage(pic, 0, 0);
  if (look?.shadow?.kind === 'inner') {
    const s = look.shadow;
    const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
    sc.drawImage(maskToCanvas(m, s.color, s.alpha), 0, 0);
  }
  if (look?.line && look.line.widthPt > 0) {
    // contorno todo do lado de fora: traço de 2w no contorno e a parte de dentro apagada
    const ln = look.line;
    const lc = canvas(W, H), lx = ctx2d(lc);
    tracePath(lx, polys);
    lx.lineWidth = 2 * ln.widthPt * ppt;
    lx.lineJoin = ln.join === 'round' ? 'round' : ln.join === 'bevel' ? 'bevel' : 'miter';
    lx.lineCap = ln.cap === 'rnd' ? 'round' : ln.cap === 'sq' ? 'square' : 'butt';
    const dash = ln.dash ? DASH[ln.dash] : undefined;
    if (dash) lx.setLineDash(dash.map((v) => v * ln.widthPt * ppt));
    lx.strokeStyle = `#${ln.color}`;
    lx.globalAlpha = ln.alpha;
    lx.stroke();
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'destination-out';
    tracePath(lx, polys);
    lx.fill();
    sc.drawImage(lc, 0, 0);
  }
  if (look?.softEdgePt) {
    const m = softEdgeMask(sil, look.softEdgePt, ppt);
    const img = sc.getImageData(0, 0, W, H);
    for (let i = 0; i < m.a.length; i++) img.data[i * 4 + 3] = Math.round(img.data[i * 4 + 3]! * m.a[i]!);
    sc.putImageData(img, 0, 0);
  }

  // camada final: sombra, brilho, reflexo e a forma
  const out = canvas(W, H);
  const o = ctx2d(out);
  const s = look?.shadow;
  if (s?.kind === 'outer') {
    // sem rotWithShape, o deslocamento é na página: volta ao referencial da imagem
    const dir = s.rotWithShape === false || s.rotWithShape === undefined ? s.dirDeg - (it.rot ?? 0) : s.dirDeg;
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    o.drawImage(maskToCanvas(m, s.color, s.alpha), 0, 0);
  }
  if (look?.glow) o.drawImage(maskToCanvas(glowMask(sil, look.glow.radPt, ppt), look.glow.color, look.glow.alpha), 0, 0);
  const r = look?.reflection;
  if (r) {
    // cópia espelhada da forma, alfa em degradê, desfocada, a `dist` na direção `dir`
    const rc = canvas(W, H), rx = ctx2d(rc);
    const a = (r.dirDeg * Math.PI) / 180;
    const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
    rx.translate(dx, 2 * (oy + h * ppt) + dy);
    rx.scale(1, -1);
    rx.drawImage(shape, 0, 0);
    const img = rx.getImageData(0, 0, W, H);
    const top = oy + h * ppt + dy;
    for (let y = 0; y < H; y++) {
      const t = (y + 0.5 - top) / (h * ppt);
      const al = t < 0 ? 0 : reflectionAlpha(t, r);
      for (let x = 0; x < W; x++) img.data[(y * W + x) * 4 + 3] = Math.round(img.data[(y * W + x) * 4 + 3]! * al);
    }
    if (r.blurPt > 0) {
      // desfoque das 4 componentes (pré-multiplicadas) com o mesmo σ = blurRad/3
      const ch = [0, 1, 2, 3].map((k) => {
        const m = newMask(W, H);
        for (let i = 0; i < m.a.length; i++) m.a[i] = (k === 3 ? img.data[i * 4 + 3]! : img.data[i * 4 + k]! * img.data[i * 4 + 3]! / 255) / 255;
        return gaussianBlur(m, (r.blurPt / 3) * ppt).a;
      });
      for (let i = 0; i < W * H; i++) {
        const al = ch[3]![i]!;
        img.data[i * 4 + 3] = Math.round(al * 255);
        for (let k = 0; k < 3; k++) img.data[i * 4 + k] = al > 0 ? Math.round((ch[k]![i]! / al) * 255) : 0;
      }
    }
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.putImageData(img, 0, 0);
    o.drawImage(rc, 0, 0);
  }
  o.drawImage(shape, 0, 0);
  return { c: out, x0: bb.x0, y0: bb.y0, ppt };
}

/** Desenha a imagem formatada no contexto (espaço de TWIPS, como paintItems). */
export function paintPicture(ctx: CanvasRenderingContext2D, it: ImageItem, bmp: CanvasImageSource): void {
  const b = bmp as CanvasImageSource & { width: number; height: number };
  const m = ctx.getTransform();
  // pixels por ponto no dispositivo (20 twips/pt)
  const ppt = Math.max(0.5, Math.min(12, Math.hypot(m.a, m.b) * 20));
  const key = JSON.stringify([it.pic, it.crop, it.flipH, it.flipV, it.w, it.h, it.rot ?? 0, Math.round(ppt * 50)]);
  let byImg = cache.get(it.image);
  if (!byImg) { byImg = new Map(); cache.set(it.image, byImg); }
  let layer = byImg.get(key);
  if (!layer) {
    if (byImg.size > 8) byImg.clear();
    layer = buildLayer(it, b, ppt);
    byImg.set(key, layer);
  }
  ctx.save();
  // giro em volta do centro da caixa
  ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
  if (it.rot) ctx.rotate((it.rot * Math.PI) / 180);
  const s = 20 / layer.ppt;
  ctx.drawImage(layer.c as CanvasImageSource, layer.x0 * 20 - it.w / 2, layer.y0 * 20 - it.h / 2, layer.c.width * s, layer.c.height * s);
  ctx.restore();
}
