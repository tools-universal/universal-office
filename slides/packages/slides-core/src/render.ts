/**
 * Pintura de um slide em um contexto canvas 2D como FUNÇÃO PURA (spec 05).
 *
 * Extraída do webcomponent `<universal-slides>` para ser compartilhada entre o
 * componente (browser), miniaturas e o export de imagens (`pptxToImages`, que
 * roda também em node com um canvas injetado). A função NUNCA decodifica
 * imagens: recebe um `Map<part, imagem decodificada>` via `PaintResources` —
 * quem chama decide como decodificar (HTMLImageElement no componente,
 * createImageBitmap no export browser, factory injetada no node).
 *
 * Coordenadas: geometria do slide em EMU; `scale` converte EMU → px do canvas.
 */
import { parseChart, paintChart, chartPartBounds, setChartFontStack, type ChartModel, type ChartSel, type ChartImage } from './chart-engine.js';
import { imageDpi, tilePattern } from '@universal-office/charts';
import { layoutTextBody, type LayoutFont, type MeasureText, type PlacedRun, type PlacedLine } from './text-layout.js';
import { presetPath } from './geometry.js';
import { presetTextRect } from './preset-engine.js';
import { EMU_PER_POINT, type Slide, type Shape, type TextBody, type Fill, type Table, type TableCell, type TableLine, type Run, type ImageRef, type ImageFx } from './model.js';
import type { ShapeAnimHooks, PartState, AnimBase, UnitRef } from './anim-engine.js';
import { applyReveal, applySoftReveal, softRevealFilter } from './reveal.js';
import { patternRows } from './patterns.js';
import { paintWarpedText, type WarpLine } from './text-warp.js';
import { lightTable, lightAt, lightFace, bevelPhi } from './light3d.js';

/** Tamanhos default (pt) quando a cascata não resolveu sz. */
export const DEFAULT_TITLE_PT = 40;
export const DEFAULT_BODY_PT = 18;
/**
 * `shadowBlur` do canvas por px de `blurRad` da sombra EXTERNA: o app desfoca a
 * da FORMA com σ ≈ blurRad/3,1 (borda de uma forma cheia, syn-b-e10: blurRad 12 pt →
 * σ 3,8 pt) e a do TEXTO com σ ≈ blurRad/2,5 (haste de um "I" a 96 pt, 4–24 pt de
 * desfoque); o canvas usa σ = shadowBlur/2.
 */
const SHADOW_BLUR_K = 0.64;
const TEXT_SHADOW_BLUR_K = 0.8;

/**
 * Imagem já decodificada, pronta para `ctx.drawImage`. Estruturalmente cobre
 * HTMLImageElement, ImageBitmap e as imagens de canvases node (@napi-rs/canvas).
 */
export type PaintImage = CanvasImageSource & {
  naturalWidth?: number;
  naturalHeight?: number;
  width?: unknown;
  height?: unknown;
};

/** Recursos externos do paint: dimensões do slide + imagens/charts decodificados. */
export interface PaintResources {
  /** Largura/altura do slide em EMU (de `Presentation.slideW/H`). */
  slideW: number;
  slideH: number;
  /** Imagens decodificadas por `ImageRef.part`. Ausente no mapa = pula (não desenha). */
  images?: Map<string, PaintImage>;
  /** Cache de ChartModel por XML cru (opcional — memoiza entre repaints). */
  charts?: Map<string, ChartModel>;
}

export interface PaintSlideOptions {
  /** Offset do canto sup. esq. do slide no canvas, em px (default 0,0). */
  ox?: number;
  oy?: number;
  /** Opacidade por shape (animações do componente). Default: 1. Retorno ≤0 pula a shape. */
  shapeOpacity?: (shape: Shape, index: number) => number;
  /** Índice de shape cujo TEXTO não deve ser pintado (edição inline no componente). */
  suppressTextShapeIdx?: number;
  /**
   * Animação da forma (motor SMIL, `anim-engine.ts`): ganchos por camada —
   * forma inteira, fundo, parágrafo, letra/palavra. null = forma estática.
   */
  shapeAnim?: (shape: Shape, index: number) => ShapeAnimHooks | null;
  /**
   * Quadro de MÍDIA da forma (vídeo tocando, quadro atual de GIF animado) —
   * pintado no lugar da imagem do `<p:pic>`. null/undefined = imagem normal.
   */
  mediaFrame?: (shape: Shape, index: number) => PaintImage | MediaFramePaint | null | undefined;
  /**
   * Família pedida pelo texto → pilha CSS de `ctx.font` (o componente injeta o
   * resolvedor de fontes dos apps; negrito/itálico avisam a variante que vai
   * ser desenhada). Default: a família + fallbacks fixos.
   */
  fontStack?: (family: string, bold?: boolean, italic?: boolean) => string;
}

/** Pilha CSS padrão (sem resolvedor: Node, testes, hosts sem componente). */
const DEFAULT_FONT_STACK = (family: string): string =>
  `'${family}', 'Aptos', Calibri, 'Liberation Sans', Arial, sans-serif`;
/** Pilha em vigor DURANTE um paintSlideTo (a pintura é síncrona). */
let fontStack: (family: string, bold?: boolean, italic?: boolean) => string = DEFAULT_FONT_STACK;

/** Quadro de mídia com opacidade: pintado SOBRE a capa (esmaecer de vídeo). */
export interface MediaFramePaint { image: PaintImage; alpha: number }

interface Fit { ox: number; oy: number; scale: number }

/** Retângulo do slide no canvas (px) — converte fração do slide ↔ px. */
interface SlidePx { ox: number; oy: number; sw: number; sh: number }

/** Animação de uma forma durante a pintura (estado da camada `all` já avaliado). */
interface ShapeAnimPaint { hooks: ShapeAnimHooks; all: PartState; base: AnimBase; m: SlidePx }

/** Caixa em px → geometria-base (centro/tamanho em fração do slide). */
function boxBase(x: number, y: number, w: number, h: number, m: SlidePx, extra?: Partial<AnimBase>): AnimBase {
  return { x: (x + w / 2 - m.ox) / m.sw, y: (y + h / 2 - m.oy) / m.sh, w: w / m.sw, h: h / m.sh, ...extra };
}

/**
 * Aplica o estado animado de uma parte ao contexto: opacidade, deslocamento /
 * escala / rotação em torno do centro da caixa (escala no referencial da
 * forma quando ela tem rotação própria) e as máscaras de revelação dos
 * filtros. Devolve false quando a parte está invisível (nada a pintar).
 */
function applyPart(ctx: CanvasRenderingContext2D, st: PartState, base: AnimBase,
  x: number, y: number, w: number, h: number, m: SlidePx, baseRotRad = 0, soft?: SoftReveal[]): boolean {
  if (!st.visible || st.opacity <= 0) return false;
  const kx = (base.w > 0 ? st.w / base.w : 1) * st.sx;
  const ky = (base.h > 0 ? st.h / base.h : 1) * st.sy;
  if (!Number.isFinite(kx) || !Number.isFinite(ky) || Math.abs(kx) < 1e-4 || Math.abs(ky) < 1e-4) return false;
  ctx.globalAlpha = ctx.globalAlpha * st.opacity;
  const bcx = x + w / 2, bcy = y + h / 2;
  const ncx = m.ox + (st.x + st.mx) * m.sw, ncy = m.oy + (st.y + st.my) * m.sh;
  if (Math.abs(ncx - bcx) > 1e-3 || Math.abs(ncy - bcy) > 1e-3 || st.rot || Math.abs(kx - 1) > 1e-6 || Math.abs(ky - 1) > 1e-6) {
    ctx.translate(ncx, ncy);
    if (st.rot) ctx.rotate((st.rot * Math.PI) / 180);
    if (baseRotRad && (kx !== 1 || ky !== 1)) { ctx.rotate(baseRotRad); ctx.scale(kx, ky); ctx.rotate(-baseRotRad); }
    else ctx.scale(kx, ky);
    ctx.translate(-bcx, -bcy);
  }
  for (const f of st.filters) {
    const q = f.transition === 'out' ? 1 - f.p : f.p;
    // borda esfumada: quem chama pinta numa camada e aplica a máscara
    if (soft && q > 0 && q < 1 && softRevealFilter(f.filter)) { soft.push({ filter: f.filter, q }); continue; }
    ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, f.filter, q, x, y, w, h);
    if (ctx.globalAlpha <= 0) return false;
  }
  return true;
}

/** Revelação com borda esfumada pendente (aplicada como máscara numa camada). */
interface SoftReveal { filter: string; q: number }

type LayerCtx = CanvasRenderingContext2D & { canvas: { width: number; height: number } };
const layerPool = new WeakMap<object, LayerCtx[]>();
const layerBusy = new WeakSet<object>();

/**
 * Camada do tamanho do canvas de `ctx`, limpa e com a MESMA transformação
 * (as coordenadas de pintura valem nas duas). null sem canvas/OffscreenCanvas
 * (ex.: testes) — quem chama cai no recorte seco.
 */
function acquireLayer(ctx: CanvasRenderingContext2D): LayerCtx | null {
  const c = (ctx as { canvas?: { width: number; height: number } }).canvas;
  if (!c || !c.width || !c.height || typeof ctx.getTransform !== 'function') return null;
  let pool = layerPool.get(c);
  if (!pool) layerPool.set(c, pool = []);
  let lc = pool.find((l) => !layerBusy.has(l) && l.canvas.width === c.width && l.canvas.height === c.height);
  if (!lc) {
    // camadas livres de OUTRO tamanho são de antes de um redimensionamento:
    // saem do pool (cada uma é um canvas do tamanho da tela — 8–33 MB)
    for (let k = pool.length - 1; k >= 0; k--) {
      const l = pool[k]!;
      if (!layerBusy.has(l) && (l.canvas.width !== c.width || l.canvas.height !== c.height)) pool.splice(k, 1);
    }
    let cv: { getContext(k: '2d'): unknown } | undefined;
    if (typeof OffscreenCanvas !== 'undefined') cv = new OffscreenCanvas(c.width, c.height);
    else if (typeof document !== 'undefined') { const e = document.createElement('canvas'); e.width = c.width; e.height = c.height; cv = e; }
    const got = cv?.getContext('2d') as LayerCtx | null | undefined;
    if (!got) return null;
    lc = got;
    pool.push(lc);
  }
  layerBusy.add(lc);
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, c.width, c.height);
  lc.setTransform(ctx.getTransform());
  return lc;
}

/** Camada que falhou no meio da pintura (pilha save/restore desequilibrada): sai do pool. */
function discardLayer(ctx: CanvasRenderingContext2D, lc: LayerCtx): void {
  const c = (ctx as { canvas?: object }).canvas;
  const pool = c ? layerPool.get(c) : undefined;
  if (pool) { const k = pool.indexOf(lc); if (k >= 0) pool.splice(k, 1); }
  layerBusy.delete(lc);
}

/** Aplica as máscaras esfumadas na camada, compõe em `ctx` (alfa e recorte de `ctx` valem) e a devolve ao pool. */
function compositeLayer(ctx: CanvasRenderingContext2D, lc: LayerCtx, soft: SoftReveal[], x: number, y: number, w: number, h: number): void {
  for (const s of soft) applySoftReveal(lc, s.filter, s.q, x, y, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lc.canvas as unknown as CanvasImageSource, 0, 0);
  ctx.restore();
  layerBusy.delete(lc);
}

/** Cor do 1º run (ponto de partida de animações de cor do texto). */
function firstRunColor(sh: Shape): string | undefined {
  for (const p of sh.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.color) return r.color;
  return undefined;
}

/**
 * Pinta o slide inteiro (fundo + shapes em z-order) no contexto. O conteúdo é
 * recortado ao retângulo do slide; estado do contexto é preservado
 * (save/restore). Não desenha chrome (borda/sombra/badge — responsabilidade de
 * quem chama).
 */
export function paintSlideTo(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  resources: PaintResources,
  scale: number,
  opts: PaintSlideOptions = {},
): void {
  const prev = fontStack, prevImgs = paintImages;
  fontStack = opts.fontStack ?? DEFAULT_FONT_STACK;
  paintImages = resources.images;
  advCache.clear();
  try {
    paintSlide(ctx, slide, resources, scale, opts);
  } finally {
    fontStack = prev;
    paintImages = prevImgs;
  }
}

/** Imagens decodificadas do paint em curso (marcadores de imagem no texto). */
let paintImages: PaintResources['images'] | undefined;

function paintSlide(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  resources: PaintResources,
  scale: number,
  opts: PaintSlideOptions,
): void {
  const ox = opts.ox ?? 0;
  const oy = opts.oy ?? 0;
  const sw = resources.slideW * scale;
  const sh = resources.slideH * scale;
  const fit: Fit = { ox, oy, scale };

  // fundo do slide: cor sólida ou gradiente (fallback branco) + opcional imagem
  const bgPat = slide.bg?.pattern ? presetPattern(ctx, slide.bg.pattern, ox, oy, scale) : null;
  if (bgPat) {
    ctx.fillStyle = bgPat;
  } else if (slide.bg?.type === 'gradient' && slide.bg.stops && slide.bg.stops.length >= 2) {
    ctx.fillStyle = makeLinearGradient(ctx, slide.bg, ox, oy, sw, sh);
  } else {
    ctx.fillStyle = slide.bg?.color ?? '#ffffff';
  }
  ctx.fillRect(ox, oy, sw, sh);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, sw, sh); ctx.clip();
  if (slide.bgImage) {
    const raw = resources.images?.get(slide.bgImage.part);
    const bg = raw ? fxImage(raw, slide.bgImage.fx) : undefined;
    // blipFill default = stretch p/ a área inteira do slide; <a:tile> = ladrilho
    // no tamanho natural (px @96 dpi → EMU → canvas) × escala, ancorado no canto
    ctx.save();
    if (slide.bgImage.fx?.alpha !== undefined) ctx.globalAlpha *= slide.bgImage.fx.alpha;
    const pat = bg && slide.bgTile ? imageTile(ctx, bg, slide.bgImage, ox, oy, scale, sw, sh) : null;
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(ox, oy, sw, sh);
    } else if (bg) { const r = insetRect(slide.bgImage.fillRect, ox, oy, sw, sh); ctx.drawImage(bg, r.x, r.y, r.w, r.h); }
    ctx.restore();
  }
  const m: SlidePx = { ox, oy, sw, sh };
  for (let i = 0; i < slide.shapes.length; i++) {
    const shp = slide.shapes[i]!;
    // uma forma com dados inválidos (raio negativo, NaN…) não derruba o slide:
    // pula ELA e a pilha save/restore volta ao nível de antes (sem vazar recorte)
    guarded(ctx, () => {
      const op = opts.shapeOpacity ? opts.shapeOpacity(shp, i) : 1;
      if (op <= 0) return; // invisível: pula
      const hooks = opts.shapeAnim && shp.xfrm ? opts.shapeAnim(shp, i) : null;
      ctx.save();
      if (op < 1) ctx.globalAlpha = ctx.globalAlpha * op;
      const mf = opts.mediaFrame?.(shp, i) ?? undefined;
      const frame = mf && 'image' in mf && 'alpha' in mf ? mf : mf ? { image: mf as PaintImage, alpha: 1 } : undefined;
      let anim: ShapeAnimPaint | undefined;
      if (hooks && shp.xfrm) {
        // camada "forma inteira": transforma fundo + texto em volta do centro
        const x = ox + shp.xfrm.x * scale, y = oy + shp.xfrm.y * scale;
        const w = shp.xfrm.cx * scale, h = shp.xfrm.cy * scale;
        const rotDeg = (shp.xfrm.rot ?? 0) / 60000;
        const base = boxBase(x, y, w, h, m, { rot: rotDeg, fill: shp.fill?.color, line: shp.lineColor, text: firstRunColor(shp) });
        const all = hooks.all(base);
        const soft: SoftReveal[] = [];
        if (!applyPart(ctx, all, base, x, y, w, h, m, (rotDeg * Math.PI) / 180, soft)) { ctx.restore(); return; }
        anim = { hooks, all, base, m };
        if (soft.length) {
          // revelar com borda esfumada: a forma vai para uma camada mascarada
          const lc = acquireLayer(ctx);
          if (lc) {
            try {
              paintShape(lc, shp, fit, resources, opts.suppressTextShapeIdx === i, anim, frame);
              compositeLayer(ctx, lc, soft, x, y, w, h);
            } catch (e) {
              discardLayer(ctx, lc); // pilha da camada desequilibrada: sai do pool
              throw e;
            }
            ctx.restore();
            return;
          }
          for (const s of soft) ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, s.filter, s.q, x, y, w, h);
        }
      }
      paintShape(ctx, shp, fit, resources, opts.suppressTextShapeIdx === i, anim, frame);
      ctx.restore();
    });
  }
  ctx.restore();
}

/**
 * Roda `fn` contando os save/restore do contexto; se `fn` lançar, desfaz os
 * saves que ficaram pendentes (o canvas não expõe a profundidade da pilha) —
 * o recorte/transformação de uma forma que falhou não vaza para as seguintes
 * nem para o próximo quadro. Devolve false quando `fn` falhou.
 */
function guarded(ctx: CanvasRenderingContext2D, fn: () => void): boolean {
  let depth = 0;
  const own = Object.prototype.hasOwnProperty.call(ctx, 'save');
  const save = ctx.save, restore = ctx.restore;
  ctx.save = function (this: CanvasRenderingContext2D): void { depth++; save.call(this); };
  ctx.restore = function (this: CanvasRenderingContext2D): void { depth--; restore.call(this); };
  try {
    fn();
    return true;
  } catch {
    for (; depth > 0; depth--) restore.call(ctx);
    return false;
  } finally {
    if (own) { ctx.save = save; ctx.restore = restore; } else {
      delete (ctx as { save?: unknown }).save;
      delete (ctx as { restore?: unknown }).restore;
    }
  }
}

/** Largura natural de uma PaintImage (HTMLImageElement usa naturalWidth; vídeo, videoWidth; ImageBitmap, width). */
function imgW(img: PaintImage): number {
  const vw = (img as { videoWidth?: unknown }).videoWidth;
  if (typeof vw === 'number' && vw > 0) return vw;
  return typeof img.naturalWidth === 'number' && img.naturalWidth > 0
    ? img.naturalWidth
    : typeof img.width === 'number' ? img.width : 0;
}
function imgH(img: PaintImage): number {
  const vh = (img as { videoHeight?: unknown }).videoHeight;
  if (typeof vh === 'number' && vh > 0) return vh;
  return typeof img.naturalHeight === 'number' && img.naturalHeight > 0
    ? img.naturalHeight
    : typeof img.height === 'number' ? img.height : 0;
}

const dpiCache = new WeakMap<Uint8Array, { x: number; y: number } | null>();

/**
 * Imagens dos preenchimentos `a:blipFill` de um gráfico: parte → decodificada
 * (do mapa do paint) com o tamanho natural em pt pela resolução do arquivo.
 */
function chartImageResolver(refs: Record<string, ImageRef>, res: PaintResources): (part: string) => ChartImage | undefined {
  return (part) => {
    const img = res.images?.get(part);
    if (!img) return undefined;
    const w = imgW(img), h = imgH(img);
    if (!(w > 0 && h > 0)) return undefined;
    const ref = Object.values(refs).find((r) => r.part === part);
    const dpi = ref ? refDpi(ref) : null;
    return { src: img as CanvasImageSource, w, h, ...(dpi ? { wPt: w * 72 / dpi.x, hPt: h * 72 / dpi.y } : {}) };
  };
}

/** Canvas auxiliar (OffscreenCanvas ou <canvas>); sem nenhum (Node sem fábrica) = undefined. */
function scratchCanvas(w: number, h: number): (HTMLCanvasElement | OffscreenCanvas) | undefined {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return undefined;
  const c = doc.createElement('canvas'); c.width = w; c.height = h; return c;
}

const fxCache = new WeakMap<object, Map<string, PaintImage>>();
const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * Imagem com os efeitos de cor do `<a:blip>` (duotone, escala de cinza,
 * brilho/contraste, preto-e-branco, troca de cor) — processada uma vez por
 * (imagem, efeito) e guardada. `alpha` NÃO entra aqui (vira globalAlpha).
 */
function fxImage(img: PaintImage, fx: ImageFx | undefined): PaintImage {
  if (!fx || !(fx.duotone || fx.gray || fx.biLevel !== undefined || fx.bright || fx.contrast || fx.clrChange)) return img;
  const key = JSON.stringify([fx.duotone, fx.gray, fx.biLevel, fx.bright, fx.contrast, fx.clrChange]);
  let m = fxCache.get(img as object);
  if (!m) { m = new Map(); fxCache.set(img as object, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const w = imgW(img), h = imgH(img);
  const cv = w > 0 && h > 0 ? scratchCanvas(w, h) : undefined;
  const c2 = cv?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!cv || !c2) return img;
  try {
    c2.drawImage(img, 0, 0, w, h);
    const id = c2.getImageData(0, 0, w, h);
    const d = id.data;
    const from = fx.clrChange ? hexRgb(fx.clrChange.from) : undefined;
    const to = fx.clrChange ? hexRgb(fx.clrChange.to) : undefined;
    const d0 = fx.duotone ? hexRgb(fx.duotone[0]) : undefined, d1 = fx.duotone ? hexRgb(fx.duotone[1]) : undefined;
    const b = fx.bright ?? 0, c = fx.contrast ?? 0;
    const k = c >= 0 ? 1 / Math.max(0.0001, 1 - c) : 1 + c;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i]!, g = d[i + 1]!, bl = d[i + 2]!;
      if (from && to && Math.abs(r - from[0]) <= 2 && Math.abs(g - from[1]) <= 2 && Math.abs(bl - from[2]) <= 2) {
        d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; d[i + 3] = Math.round(d[i + 3]! * fx.clrChange!.toAlpha);
        continue;
      }
      if (b || c) {
        // contraste em volta do meio-tom e o brilho escalado por (1+k)/2 (medido, syn-lum:
        // o pivô do contraste anda b/2 com o brilho; k = 1/(1−c) se c ≥ 0, senão 1+c)
        const adj = (v: number): number => ((v / 255 - 0.5) * k + 0.5 + b * (1 + k) / 2) * 255;
        r = adj(r); g = adj(g); bl = adj(bl);
      }
      // luminância Rec. 709 sobre o sRGB (sem linearizar) — medido no oráculo com
      // grayscl/biLevel/duotone: vermelho 54, verde 182, azul 18
      const y = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
      if (fx.biLevel !== undefined) { r = g = bl = y >= fx.biLevel ? 255 : 0; }
      else if (d0 && d1) { r = d0[0] + (d1[0] - d0[0]) * y; g = d0[1] + (d1[1] - d0[1]) * y; bl = d0[2] + (d1[2] - d0[2]) * y; }
      else if (fx.gray) { r = g = bl = y * 255; }
      d[i] = r; d[i + 1] = g; d[i + 2] = bl;
    }
    c2.putImageData(id, 0, 0);
  } catch { return img; } // origem cruzada / canvas sem getImageData
  const out = cv as unknown as PaintImage;
  m.set(key, out);
  return out;
}

/** Retângulo recuado pelo `<a:fillRect>` (frações dos lados). */
function insetRect(fr: { l: number; t: number; r: number; b: number } | undefined, x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  if (!fr) return { x, y, w, h };
  return { x: x + fr.l * w, y: y + fr.t * h, w: w * (1 - fr.l - fr.r), h: h * (1 - fr.t - fr.b) };
}

/** Resolução gravada no arquivo da imagem (memoizada pelos bytes); null = sem (96 dpi). */
function refDpi(ref: ImageRef): { x: number; y: number } | null {
  let dpi = dpiCache.get(ref.bytes);
  if (dpi === undefined) { dpi = imageDpi(ref.bytes) ?? null; dpiCache.set(ref.bytes, dpi); }
  return dpi;
}

/**
 * Ladrilho de imagem (`<a:tile>`) na caixa (x0, y0, w, h): o mesmo do motor de
 * gráficos — tamanho natural pela RESOLUÇÃO do arquivo (medido, syn-a-shtile:
 * PNG 144 dpi e JPEG 75 dpi; sem ela, 96 dpi), reduzido em pixels inteiros,
 * alinhamento e espelho.
 */
function imageTile(ctx: CanvasRenderingContext2D, img: PaintImage, ref: ImageRef, x0: number, y0: number, scale: number, w = 0, h = 0): CanvasPattern | null {
  const iw = imgW(img), ih = imgH(img);
  const dpi = refDpi(ref);
  const t = ref.tile;
  // px da imagem → EMU (914400/dpi; 96 dpi = 9525) → px do canvas
  return tilePattern(ctx, img as CanvasImageSource, iw, ih, iw * (dpi ? 914400 / dpi.x : 9525) * scale, ih * (dpi ? 914400 / dpi.y : 9525) * scale,
    { sx: t?.sx ?? 1, sy: t?.sy ?? 1, tx: (t?.tx ?? 0) * scale, ty: (t?.ty ?? 0) * scale, ...(t?.algn ? { algn: t.algn } : {}), ...(t?.flip ? { flip: t.flip } : {}) },
    { x: x0, y: y0, w, h });
}

function paintShape(
  ctx: CanvasRenderingContext2D, sh: Shape, fit: Fit, res: PaintResources, suppressText: boolean,
  anim?: ShapeAnimPaint, frame?: MediaFramePaint,
): void {
  if (!sh.xfrm) {
    // caixa de texto sem xfrm (raro) — desenha no canto sup. esq. do slide
    if (sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, fit.ox + 40, fit.oy + 40, 400, 200, fit.scale);
    return;
  }
  const x = fit.ox + sh.xfrm.x * fit.scale;
  const y = fit.oy + sh.xfrm.y * fit.scale;
  const w = sh.xfrm.cx * fit.scale;
  const h = sh.xfrm.cy * fit.scale;

  // ── transformação de instância: rot (1/60000 grau) + flipH/flipV em torno
  //    do CENTRO geométrico. Pintada DENTRO de save/restore para não vazar.
  // transformação ANTES da da forma (useBgFill pinta o fundo no referencial do slide)
  const baseM = ctx.getTransform();
  // câmera girada: <a:rot> explícito ou a rotação medida do preset
  const camR = sh.camRot ?? (sh.camPrst ? CAM_ROT[sh.camPrst] : undefined);
  const cam = camR ? cameraMatrix(camR) : undefined;
  const hasXform = sh.xfrm.rot || sh.xfrm.flipH || sh.xfrm.flipV || cam;
  const hasAlpha = sh.alpha !== undefined && sh.alpha < 1;
  if (hasXform || hasAlpha) {
    ctx.save();
    if (hasAlpha) ctx.globalAlpha = ctx.globalAlpha * sh.alpha!;
    if (hasXform) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.translate(cx, cy);
      if (cam) ctx.transform(cam[0], cam[1], cam[2], cam[3], 0, 0);
      if (sh.xfrm.rot) ctx.rotate(sh.xfrm.rot / 60000 * Math.PI / 180);
      if (sh.xfrm.flipH) ctx.scale(-1, 1);
      if (sh.xfrm.flipV) ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }
  }

  // camada de FUNDO animada (efeito por letra/palavra com animBg, ou <p:bg/>)
  const bgSt = anim?.hooks.bg ? anim.hooks.bg(anim.base) : undefined;
  const ov: BodyOverrides = {};
  const fillOv = bgSt?.fillColor ?? anim?.all.fillColor;
  const lineOv = bgSt?.lineColor ?? anim?.all.lineColor;
  if (fillOv) ov.fill = fillOv;
  if (lineOv) ov.line = lineOv;
  // useBgFill: desfaz a transformação da PRÓPRIA forma (vale também na camada de efeitos)
  if (sh.useBgFill && hasXform) ov.unshape = ctx.getTransform().inverse().multiply(baseM);
  if (frame) ov.frame = frame;
  if (anim?.hooks.chartParts && sh.chartXml) {
    ov.chartParts = anim.hooks.chartParts;
    ov.chartBase = { base: anim.base, m: anim.m };
  }
  // brilho: halo da silhueta, ATRÁS da forma
  // (só com corpo visível: forma sem preenchimento nem contorno não brilha — medido)
  // (o halo segue a opacidade do corpo: preenchimento transparente sem contorno não brilha — medido)
  const bodyAlpha = sh.image || sh.fillImage || sh.lineColor ? 1 : sh.fill && sh.fill.type !== 'none' ? sh.fillAlpha ?? 1 : 0;
  if (sh.glow && bodyAlpha > 0) paintGlow(ctx, sh, x, y, w, h, fit.scale, bodyAlpha);
  // reflexo/bordas suaves precisam da forma inteira (corpo + texto) numa camada
  const fxLayer = sh.reflection || sh.softEdge ? acquireLayer(ctx) : null;
  const target: CanvasRenderingContext2D = fxLayer ?? ctx;
  try {
    target.save();
    const bodyOn = !bgSt || applyPart(target, bgSt, anim!.base, x, y, w, h, anim!.m);
    // extrusão 3D: laterais atrás da frente
    if (bodyOn && sh.extrusion && !sh.image) paintExtrusion(target, sh, x, y, w, h, fit.scale, baseM, camR);
    const hostsText = bodyOn ? paintBody(target, sh, x, y, w, h, fit, res, ov) : !(sh.chartXml || sh.table || sh.image);
    target.restore();
    // texto (suprimido quando a shape está em edição — overlay HTML cobre)
    if (hostsText && sh.txBody && !suppressText) paintText(target, sh, sh.txBody, x, y, w, h, fit.scale, anim);
    if (fxLayer) {
      if (sh.softEdge) applySoftEdge(fxLayer, sh, x, y, w, h, fit.scale);
      if (sh.reflection) paintReflection(ctx, fxLayer, sh.reflection, x, y, w, h, fit.scale);
      compositeLayer(ctx, fxLayer, [], x, y, w, h);
    }
  } catch (e) {
    if (fxLayer) discardLayer(ctx, fxLayer);
    throw e;
  }
  if (hasXform || hasAlpha) ctx.restore();
}

/**
 * Projeção ortográfica da forma vista pela câmera girada (lat/lon/rev em graus):
 * o objeto aparece com a rotação INVERSA da câmera, R = Rz(−rev)·Rx(−lat)·Ry(−lon)
 * (ordem e sinais casados com o PowerPoint numa seta longa do corpus); devolve
 * a parte 2×2 (a, b, c, d) para `ctx.transform`.
 */
function cameraMatrix3(r: { lat: number; lon: number; rev: number }): number[][] {
  const d = Math.PI / 180;
  const la = -r.lat * d, lo = -r.lon * d, re = -r.rev * d;
  const rx = [[1, 0, 0], [0, Math.cos(la), -Math.sin(la)], [0, Math.sin(la), Math.cos(la)]];
  const ry = [[Math.cos(lo), 0, Math.sin(lo)], [0, 1, 0], [-Math.sin(lo), 0, Math.cos(lo)]];
  const rz = [[Math.cos(re), -Math.sin(re), 0], [Math.sin(re), Math.cos(re), 0], [0, 0, 1]];
  const mul = (A: number[][], B: number[][]) => A.map((row, i) => B[0]!.map((_, j) => row.reduce((s, _v, k) => s + A[i]![k]! * B[k]![j]!, 0)));
  return mul(mul(rz, rx), ry);
}
function cameraMatrix(r: { lat: number; lon: number; rev: number }): [number, number, number, number] {
  const M = cameraMatrix3(r);
  // imagem dos eixos x e y da forma no plano da tela
  return [M[0]![0]!, M[1]![0]!, M[0]![1]!, M[1]![1]!];
}

/**
 * Face sombreada de geometria (`<a:path fill="darken|lighten…">`): v < 0 multiplica o
 * RGB por 1+v (darken ×0,6, darkenLess ×0,8); v > 0 leva v rumo ao branco (lighten
 * 40%, lightenLess 20%) — medido no app (lo-cshapes), direto no sRGB.
 */
function shadeRgb(hex: string, v: number): string {
  const n = parseInt(hex.replace('#', ''), 16) || 0;
  const f = (c: number): number => Math.round(v < 0 ? c * (1 + v) : c + (255 - c) * v);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** `rgba()` de uma cor #RRGGBB com alpha. */
function rgbaOf(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Brilho (`<a:glow rad>`): silhueta dilatada em rad/2 e desfocada em rad,
 * pintada SÓ como sombra (a forma desenhada fora da tela, trazida pelo
 * deslocamento em px do dispositivo) — o halo fica atrás da forma.
 */
function paintGlow(ctx: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number, scale: number, k = 1): void {
  const g = sh.glow!;
  const r = g.rad * scale;
  if (!(r > 0.3)) return;
  ctx.save();
  const K = 20000;
  const m = ctx.getTransform();
  ctx.shadowColor = rgbaOf(g.color, g.alpha);
  ctx.shadowBlur = r;
  ctx.shadowOffsetX = m.a * K;
  ctx.shadowOffsetY = m.b * K;
  ctx.translate(-K, 0);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = r;
  ctx.lineJoin = 'round';
  const rule = shapePath(ctx, sh.geom ?? 'rect', x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
  if (rule) ctx.fill(rule); else ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Bordas suaves (`<a:softEdge rad>`): máscara = silhueta corroída em rad/2 e
 * desfocada (rad/4), aplicada com destination-in na camada da forma.
 */
function applySoftEdge(lc: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number, scale: number): void {
  const r = sh.softEdge! * scale;
  if (!(r > 0.5)) return;
  const mk = acquireLayer(lc);
  if (!mk) return;
  try {
    mk.fillStyle = '#000';
    const rule = shapePath(mk, sh.geom ?? 'rect', x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    if (rule) mk.fill(rule); else mk.fill();
    mk.globalCompositeOperation = 'destination-out';
    mk.lineWidth = r;
    mk.stroke();
    lc.save();
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'destination-in';
    lc.filter = `blur(${(r / 4).toFixed(2)}px)`;
    lc.drawImage(mk.canvas as unknown as CanvasImageSource, 0, 0);
    lc.restore();
  } finally {
    layerBusy.delete(mk);
  }
}

/**
 * Reflexo (`<a:reflection>`): a camada da forma espelhada sob a borda de baixo
 * (+dist, escala vertical sy), desfocada em blurRad, com alpha stA→endA entre
 * stPos..endPos da altura refletida.
 */
function paintReflection(ctx: CanvasRenderingContext2D, lc: LayerCtx, rf: NonNullable<Shape['reflection']>, x: number, y: number, w: number, h: number, scale: number): void {
  const rl = acquireLayer(ctx);
  if (!rl) return;
  try {
    const T = ctx.getTransform();
    const inv = T.inverse();
    const base = y + h + rf.dist * scale;
    const sy = Math.abs(rf.sy) || 1;
    rl.save();
    rl.translate(0, base);
    rl.scale(1, -sy);
    rl.translate(0, -(y + h));
    rl.transform(inv.a, inv.b, inv.c, inv.d, inv.e, inv.f);
    if (rf.blurRad > 0) rl.filter = `blur(${(rf.blurRad * scale / 2).toFixed(2)}px)`;
    rl.drawImage(lc.canvas as unknown as CanvasImageSource, 0, 0);
    rl.restore();
    // alpha ao longo da altura refletida (local)
    const hh = h * sy;
    const grad = rl.createLinearGradient(0, base, 0, base + hh);
    const st = Math.max(0, Math.min(1, rf.stPos)), en = Math.max(st, Math.min(1, rf.endPos));
    grad.addColorStop(0, `rgba(0,0,0,${rf.stA})`);
    grad.addColorStop(st, `rgba(0,0,0,${rf.stA})`);
    grad.addColorStop(en, `rgba(0,0,0,${rf.endA})`);
    grad.addColorStop(1, `rgba(0,0,0,${rf.endA})`);
    rl.save();
    rl.globalCompositeOperation = 'destination-in';
    rl.fillStyle = grad;
    rl.fillRect(x - w, base - 1, w * 3, hh + 2);
    rl.restore();
    compositeLayer(ctx, rl, [], x, y, w, h);
  } catch {
    discardLayer(ctx, rl);
  }
}

/** Cores animadas do corpo da forma (animClr/set em fillcolor/stroke.color). */
interface BodyOverrides {
  fill?: string; line?: string; frame?: MediaFramePaint;
  /** Matriz que volta do referencial da forma (rot/espelho/câmera) ao do slide. */
  unshape?: DOMMatrix;
  /** Gráfico animado por partes: camadas (seleção + estado; null = estática) e a geometria-base da forma. */
  chartParts?: { sel: ChartSel; state: ((base: AnimBase) => PartState | null) | null }[];
  chartBase?: { base: AnimBase; m: SlidePx };
}

/**
 * Corpo da forma (gráfico, tabela, imagem ou preenchimento/sombra/contorno),
 * já dentro da transformação de instância. Devolve false para corpos que não
 * hospedam texto (gráfico/tabela/imagem).
 */
function paintBody(
  ctx: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number,
  fit: Fit, res: PaintResources, ov: BodyOverrides,
): boolean {
  // <p:graphicFrame> com chart: pinta a engine de chart no xfrm.
  if (sh.chartXml) {
    // XML igual com imagens de outras partes (rIdN relativo à parte) = outro modelo
    const key = sh.chartImages ? `${sh.chartXml}\u0000${Object.values(sh.chartImages).map((r) => r.part).join('|')}` : sh.chartXml;
    let model = res.charts?.get(key);
    if (!model) { model = parseChart(sh.chartXml, sh.chartTheme, sh.chartImages, sh.chartFormat); res.charts?.set(key, model); }
    setChartFontStack(fontStack);
    const ppt = EMU_PER_POINT * fit.scale;
    const image = sh.chartImages ? chartImageResolver(sh.chartImages, res) : undefined;
    if (ov.chartParts && ov.chartBase) {
      // por partes: cada camada (fundo / série / categoria / ponto) com o próprio
      // estado, na PRÓPRIA caixa — a das marcas que desenha (medido: o "revelar"
      // de uma série vai da base à coluna mais alta dela, não do quadro todo);
      // o fundo (grade/legenda) usa o quadro do gráfico
      const { base, m } = ov.chartBase;
      for (const p of ov.chartParts) {
        ctx.save();
        let on = true;
        if (p.state) {
          const box = p.sel.bg ? { x, y, w, h } : chartPartBounds(ctx, model, x, y, w, h, ppt, p.sel);
          const pb = p.sel.bg || !box ? base : boxBase(box.x, box.y, box.w, box.h, m);
          const st = box ? p.state(pb) : null;
          const soft: SoftReveal[] = [];
          on = !!box && (!st || applyPart(ctx, st, pb, box.x, box.y, box.w, box.h, m, 0, soft));
          if (on && box && soft.length) {
            const lc = acquireLayer(ctx);
            if (lc) {
              paintChart(lc, model, x, y, w, h, ppt, undefined, true, p.sel, image);
              compositeLayer(ctx, lc, soft, box.x, box.y, box.w, box.h);
              on = false;
            } else for (const s of soft) ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, s.filter, s.q, box.x, box.y, box.w, box.h);
          }
        }
        if (on) paintChart(ctx, model, x, y, w, h, ppt, undefined, true, p.sel, image);
        ctx.restore();
      }
    } else paintChart(ctx, model, x, y, w, h, ppt, undefined, true, undefined, image);
    return false;
  }
  // <p:graphicFrame> com tabela. PowerPoint frequentemente seta xfrm.cy como
  // PLACEHOLDER pequeno (~1in) e o tamanho REAL da tabela vem da soma das row
  // heights + col widths em EMU. Quando as somas naturais existem, usamos elas.
  if (sh.table) {
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    const tw = natW > 0 ? natW * fit.scale : w;
    const th = natH > 0 ? natH * fit.scale : h;
    paintTable(ctx, sh.table, x, y, tw, th, fit.scale, { x: fit.ox, y: fit.oy });
    return false;
  }

  // <p:pic>: prioridade absoluta sobre fill — a imagem ocupa o xfrm.
  if (sh.image) {
    // quadro de mídia: opaco substitui a capa; com esmaecer, a capa fica por baixo
    const rawPoster = res.images?.get(sh.image.part);
    const poster = rawPoster ? fxImage(rawPoster, sh.image.fx) : undefined;
    const img = ov.frame && ov.frame.alpha >= 1 ? ov.frame.image : poster;
    // preenchimento do spPr do pic: atrás da imagem, na geometria
    if (sh.fill && sh.fill.type !== 'none' && (sh.fill.color || sh.fill.stops)) {
      ctx.save();
      if (sh.fillAlpha !== undefined && sh.fillAlpha < 1) ctx.globalAlpha *= sh.fillAlpha;
      const rule = shapePath(ctx, sh.geom ?? 'rect', x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
      ctx.fillStyle = sh.fill.type === 'gradient' && sh.fill.stops && sh.fill.stops.length >= 2 ? makeLinearGradient(ctx, sh.fill, x, y, w, h) : sh.fill.color ?? '#ffffff';
      if (rule) ctx.fill(rule); else ctx.fill();
      ctx.restore();
    }
    if (img) {
      // sombra da shape aplicada à imagem (cards de foto de template)
      if (sh.shadow) {
        const sc = sh.shadow;
        const n = parseInt(sc.color.replace('#', ''), 16);
        ctx.save();
        ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${sc.alpha})`;
        ctx.shadowBlur = sc.blurRad * fit.scale * SHADOW_BLUR_K;
        ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * fit.scale;
        ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * fit.scale;
      }
      // geometria do pic != rect (ex.: crop circular via prstGeom ellipse):
      // recorta a imagem pelo path da geometria, como o app de referência.
      // (custGeom também — placeholder de imagem do layout em triângulo, web-intl-ilo)
      const clipGeom = !!sh.custGeom || (sh.geom !== undefined && sh.geom !== 'rect');
      if (clipGeom) {
        ctx.save();
        const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
        if (rule) ctx.clip(rule); else ctx.clip();
      }
      // srcRect (crop em 0..1 dos quatro lados) aplica-se em coordenadas da imagem natural.
      const drawPic = (im: PaintImage): void => {
        if (sh.srcRect) {
          const iw = imgW(im), ih = imgH(im);
          const sx = sh.srcRect.l * iw;
          const sy = sh.srcRect.t * ih;
          const sw = iw - (sh.srcRect.l + sh.srcRect.r) * iw;
          const sh2 = ih - (sh.srcRect.t + sh.srcRect.b) * ih;
          ctx.drawImage(im, sx, sy, sw, sh2, x, y, w, h);
        } else {
          ctx.drawImage(im, x, y, w, h);
        }
      };
      drawPic(img);
      // vídeo esmaecendo: quadro com opacidade por cima da capa
      if (ov.frame && ov.frame.alpha > 0 && ov.frame.alpha < 1) {
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * ov.frame.alpha;
        drawPic(ov.frame.image);
        ctx.restore();
      }
      if (clipGeom) ctx.restore();
      if (sh.shadow) ctx.restore();
    }
    // contorno (raro em pic mas válido) — segue a geometria do pic
    if (sh.lineColor) {
      ctx.strokeStyle = sh.lineColor;
      ctx.lineWidth = Math.max(1, (sh.lineWidth ?? 9525) * fit.scale);
      shapePath(ctx, sh.geom ?? 'rect', x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'stroke');
      ctx.stroke();
    }
    return false;
  }

  // sombra externa (outerShdw) — aplicada no fill path. Shape SEM fill não
  // pinta proxy (a sombra vai no texto/imagem herdada — nunca um rect branco).
  // imagem própria: a sombra sai do ALFA da imagem (no próprio desenho, abaixo); a janela
  // do fundo (useBgFill) é opaca — sombra da silhueta
  const hasVisibleFill = (sh.fill !== undefined && sh.fill.type !== 'none' && !(sh.fillImage && !sh.useBgFill)) || (!!sh.fillImage && !!sh.useBgFill);
  if (sh.shadow && hasVisibleFill) {
    // fit.scale já é px por EMU (dividir por 9525 zerava a sombra)
    const sx = sh.shadow.dist * Math.cos(sh.shadow.dirDeg * Math.PI / 180) * fit.scale;
    const sy = sh.shadow.dist * Math.sin(sh.shadow.dirDeg * Math.PI / 180) * fit.scale;
    ctx.save();
    const hex = sh.shadow.color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    ctx.shadowColor = `rgba(${r},${g},${b},${sh.shadow.alpha})`;
    ctx.shadowBlur = sh.shadow.blurRad * fit.scale * SHADOW_BLUR_K;
    // a "cópia" que projeta a sombra tem o ALFA do preenchimento (forma translúcida:
    // sombra mais fraca e visível através dela) e fica FORA da tela — só a sombra volta
    ctx.fillStyle = ov.fill ?? (sh.fill?.type === 'solid' && sh.fill.color ? sh.fill.color
      : sh.fill?.type === 'gradient' && sh.fill.stops && sh.fill.stops.length >= 2 ? makeLinearGradient(ctx, sh.fill, x, y, w, h) : '#ffffff');
    if (!ov.fill && sh.fillAlpha !== undefined && sh.fillAlpha < 1) ctx.globalAlpha *= sh.fillAlpha;
    if (sh.fillImage && sh.useBgFill && sh.shadow.sx === undefined && sh.shadow.sy === undefined) {
      // preenchimento de imagem (pode ter transparência): só a SOMBRA da silhueta — a
      // forma vai para fora da tela e o deslocamento traz a sombra de volta
      const K = 20000;
      const m = ctx.getTransform();
      ctx.shadowOffsetX = sx + m.a * K;
      ctx.shadowOffsetY = sy + m.b * K;
      ctx.translate(-K, 0);
      ctx.fillStyle = '#000';
    } else if (sh.shadow.sx !== undefined || sh.shadow.sy !== undefined) {
      // sombra ESCALADA em volta da âncora (algn): desenha a cópia escalada FORA da
      // tela e traz só a sombra pelo deslocamento (que é em px do dispositivo)
      const a = sh.shadow.algn ?? 'b';
      const ax = x + (a === 'tl' || a === 'l' || a === 'bl' ? 0 : a === 'tr' || a === 'r' || a === 'br' ? w : w / 2);
      const ay = y + (/^t/.test(a) ? 0 : /^b/.test(a) ? h : h / 2);
      const K = 20000;
      const m = ctx.getTransform();
      ctx.shadowOffsetX = sx + m.a * K;
      ctx.shadowOffsetY = sy + m.b * K;
      ctx.translate(-K, 0);
      ctx.translate(ax, ay);
      ctx.scale(sh.shadow.sx ?? 1, sh.shadow.sy ?? 1);
      ctx.translate(-ax, -ay);
    } else {
      const K = 20000;
      const m = ctx.getTransform();
      ctx.shadowOffsetX = sx + m.a * K;
      ctx.shadowOffsetY = sy + m.b * K;
      ctx.translate(-K, 0);
    }
    const shRule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    if (shRule) ctx.fill(shRule); else ctx.fill();
    ctx.restore();
  }
  // preenchimento (solid com alpha opcional, gradiente linear ou blipFill).
  // Geometrias "linha pura" (line/conectores) não têm área p/ fill; o arco
  // preenchido vira a FATIA da definição oficial (como no app)
  const isLineGeom = sh.geom === 'line' ||
    /^(straight|bent|curved)Connector\d?$/.test(sh.geom ?? '');
  // 3D "aramado" (prstMaterial="wireframe"): só as arestas, a frente não preenche
  const wire = /^(legacy)?[wW]ireframe$/.test(sh.extrusion?.mat ?? '');
  if (!isLineGeom && !wire && (ov.fill || sh.fillImage || (sh.fill && sh.fill.type !== 'none'))) {
    ctx.save();
    if (sh.fillAlpha !== undefined && sh.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * sh.fillAlpha;
    const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    // <a:fillOverlay blend≠over>: a sobreposição (opaca) é a BASE e o preenchimento se
    // mistura nela — textura com alphaModFix 50% não deixa o fundo do slide aparecer
    // (poi-…GeomLec1: faixa azul com listras, sem o pergaminho por baixo)
    const ovl = sh.fillOverlay && sh.fillOverlay.blend !== 'over' && !ov.fill ? sh.fillOverlay : undefined;
    if (ovl) {
      ctx.fillStyle = ovl.fill.type === 'gradient' && ovl.fill.stops && ovl.fill.stops.length >= 2 ? makeLinearGradient(ctx, ovl.fill, x, y, w, h) : ovl.fill.color ?? '#000000';
      if (rule) ctx.fill(rule); else ctx.fill();
      ctx.globalCompositeOperation = ovl.blend === 'mult' ? 'multiply' : ovl.blend === 'screen' ? 'screen' : ovl.blend === 'darken' ? 'darken' : 'lighten';
    }
    let facesShaded = false;
    // rotWithShape="0": o caminho já está girado; o preenchimento volta ao
    // referencial da página (desfaz só a rotação — com um espelho o sentido inverte)
    // e ocupa a caixa ALINHADA da forma girada (ladrilho ancorado nela, imagem
    // esticada nela — medido, syn-tilerot)
    let fx = x, fy = y, fw = w, fh = h;
    if (sh.fillNoRot && sh.xfrm?.rot) {
      const flips = (sh.xfrm.flipH ? 1 : 0) + (sh.xfrm.flipV ? 1 : 0);
      const cx = x + w / 2, cy = y + h / 2, th = sh.xfrm.rot / 60000 * Math.PI / 180;
      ctx.translate(cx, cy);
      ctx.rotate((flips === 1 ? 1 : -1) * th);
      ctx.translate(-cx, -cy);
      const co = Math.abs(Math.cos(th)), si = Math.abs(Math.sin(th));
      fw = w * co + h * si; fh = w * si + h * co; fx = cx - fw / 2; fy = cy - fh / 2;
    }
    if (!ov.fill && sh.useBgFill && (sh.fillImage || sh.fill)) {
      // useBgFill: uma JANELA para o fundo do slide — imagem/degradê no
      // retângulo do SLIDE (não esticado na forma), recortado pela forma
      if (rule) ctx.clip(rule); else ctx.clip();
      if (ov.unshape) ctx.transform(ov.unshape.a, ov.unshape.b, ov.unshape.c, ov.unshape.d, ov.unshape.e, ov.unshape.f);
      const sw = res.slideW * fit.scale, shh = res.slideH * fit.scale;
      if (sh.fillImage) {
        const raw = res.images?.get(sh.fillImage.part);
        const img = raw ? fxImage(raw, sh.fillImage.fx) : undefined;
        if (img && sh.fillImage.fx?.alpha !== undefined) ctx.globalAlpha *= sh.fillImage.fx.alpha;
        const pat = img && sh.fillTile ? imageTile(ctx, img, sh.fillImage, fit.ox, fit.oy, fit.scale, sw, shh) : null;
        if (pat) { ctx.fillStyle = pat; ctx.fillRect(fit.ox, fit.oy, sw, shh); } else if (img) { const r = insetRect(sh.fillImage.fillRect, fit.ox, fit.oy, sw, shh); ctx.drawImage(img, r.x, r.y, r.w, r.h); }
      } else if (sh.fill!.type === 'gradient' && sh.fill!.stops && sh.fill!.stops.length >= 2) {
        ctx.fillStyle = makeLinearGradient(ctx, sh.fill!, fit.ox, fit.oy, sw, shh);
        ctx.fillRect(fit.ox, fit.oy, sw, shh);
      } else if (sh.fill!.pattern && presetPattern(ctx, sh.fill!.pattern, fit.ox, fit.oy, fit.scale)) {
        ctx.fillStyle = presetPattern(ctx, sh.fill!.pattern, fit.ox, fit.oy, fit.scale)!;
        ctx.fillRect(fit.ox, fit.oy, sw, shh);
      } else if (sh.fill!.color) { ctx.fillStyle = sh.fill!.color; ctx.fillRect(fit.ox, fit.oy, sw, shh); }
    } else if (ov.fill) {
      // cor de preenchimento animada (o app troca fill.type p/ sólido)
      ctx.fillStyle = ov.fill;
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fillImage) {
      // blipFill de shape: esticada OU em LADRILHO (a:tile, tamanho natural
      // @96dpi convertido a EMU), sempre recortada pelo path da geometria
      const rawImg = res.images?.get(sh.fillImage.part);
      const img = rawImg ? fxImage(rawImg, sh.fillImage.fx) : undefined;
      if (img && sh.fillImage.fx?.alpha !== undefined) ctx.globalAlpha *= sh.fillImage.fx.alpha;
      // sombra externa pelo alfa da imagem: desenha COM a sombra do canvas (o padrão
      // preenche o caminho sem recorte, então a sombra não é cortada)
      if (img && sh.shadow && sh.shadow.sx === undefined && sh.shadow.sy === undefined) {
        const sd = sh.shadow;
        ctx.shadowColor = rgbaOf(sd.color, sd.alpha);
        ctx.shadowBlur = sd.blurRad * fit.scale * SHADOW_BLUR_K;
        const a = sd.dirDeg * Math.PI / 180;
        // deslocamento da sombra é no espaço do dispositivo (ignora a rotação da forma)
        ctx.shadowOffsetX = sd.dist * Math.cos(a) * fit.scale;
        ctx.shadowOffsetY = sd.dist * Math.sin(a) * fit.scale;
      }
      if (img && sh.fillTile) {
        const pat = imageTile(ctx, img, sh.fillImage, fx, fy, fit.scale, fw, fh);
        if (pat) {
          ctx.fillStyle = pat;
          if (rule) ctx.fill(rule); else ctx.fill();
        }
      } else if (img) {
        // esticada: padrão sem repetição transformado para a caixa (sem clip, mantém a sombra)
        const pat = ctx.createPattern(img as CanvasImageSource, 'no-repeat');
        if (pat && typeof (pat as { setTransform?: unknown }).setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
          const r = insetRect(sh.fillImage.fillRect, fx, fy, fw, fh);
          pat.setTransform(new DOMMatrix([r.w / (imgW(img) || 1), 0, 0, r.h / (imgH(img) || 1), r.x, r.y]));
          ctx.fillStyle = pat;
          if (rule) ctx.fill(rule); else ctx.fill();
        } else { ctx.clip(); const r = insetRect(sh.fillImage.fillRect, fx, fy, fw, fh); ctx.drawImage(img, r.x, r.y, r.w, r.h); }
      }
    } else if (sh.fill!.pattern && presetPattern(ctx, sh.fill!.pattern, fit.ox, fit.oy, fit.scale)) {
      ctx.fillStyle = presetPattern(ctx, sh.fill!.pattern, fit.ox, fit.oy, fit.scale)!;
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fill!.type === 'gradient' && sh.fill!.stops && sh.fill!.stops.length >= 2) {
      ctx.fillStyle = makeLinearGradient(ctx, sh.fill!, fx, fy, fw, fh);
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fill!.type === 'solid' && sh.fill!.color) {
      // sombreado por face (can/cube): cada subpath preenche com a luminância
      // deslocada; demais geometrias preenchem o path combinado de uma vez.
      const cg = sh.custGeom;
      const desc = cg ? null : presetPath(sh.geom, w, h, sh.adj, sh.adjNames);
      if (cg?.lum) {
        // geometria personalizada com faces sombreadas (<a:path fill="darken">…)
        for (let i = 0; i < cg.subs.length; i++) {
          if (cg.noFill?.[i]) continue;
          const lum = cg.lum[i] ?? 0;
          ctx.beginPath();
          drawSegs(ctx, [cg.subs[i]!], x, y, w / cg.w, h / cg.h);
          ctx.fillStyle = lum === 0 ? sh.fill!.color! : shadeRgb(sh.fill!.color!, lum);
          ctx.fill();
        }
      } else if (desc && desc.kind === 'path' && desc.subLum) {
        for (let i = 0; i < desc.subs.length; i++) {
          const lum = desc.subLum[i];
          if (lum === null || lum === undefined) continue;
          ctx.beginPath();
          drawSegs(ctx, [desc.subs[i]!], x, y, 1, 1);
          ctx.fillStyle = lum === 0 ? sh.fill!.color! : shadeRgb(sh.fill!.color!, lum);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = sh.fill!.color;
        if (rule) ctx.fill(rule); else ctx.fill();
      }
      facesShaded = true;
    }
    // faces sombreadas sobre preenchimento NÃO sólido (degradê, imagem, padrão): a regra
    // medida (RGB×(1+v) / v rumo ao branco) é preto/branco por cima com alfa |v|
    // (poi-53446: moldura chanfrada com degradê)
    if (!facesShaded) {
      const cg = sh.custGeom;
      const subs = cg ? cg.subs : undefined;
      const lums: (number | null | undefined)[] | undefined = cg ? cg.lum : (() => { const d = presetPath(sh.geom, w, h, sh.adj, sh.adjNames); return d.kind === 'path' ? d.subLum : undefined; })();
      const segs = subs ?? (() => { const d = presetPath(sh.geom, w, h, sh.adj, sh.adjNames); return d.kind === 'path' ? d.subs : undefined; })();
      if (lums && segs) {
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < segs.length; i++) {
          const v = lums[i];
          if (!v || cg?.noFill?.[i]) continue;
          ctx.save();
          ctx.globalAlpha *= Math.min(1, Math.abs(v));
          ctx.fillStyle = v < 0 ? '#000000' : '#ffffff';
          ctx.beginPath();
          drawSegs(ctx, [segs[i]!], x, y, cg ? w / cg.w : 1, cg ? h / cg.h : 1);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
  // <a:fillOverlay>: preenchimento misturado por cima (multiplicar etc.), recortado na forma
  if (sh.fillOverlay && (sh.fillOverlay.blend === 'over' || ov.fill) && !isLineGeom && (sh.fill?.type !== 'none' || sh.fillImage)) {
    const o = sh.fillOverlay;
    ctx.save();
    const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    ctx.globalCompositeOperation = o.blend === 'mult' ? 'multiply' : o.blend === 'screen' ? 'screen' : o.blend === 'darken' ? 'darken' : o.blend === 'lighten' ? 'lighten' : 'source-over';
    ctx.fillStyle = o.fill.type === 'gradient' && o.fill.stops && o.fill.stops.length >= 2 ? makeLinearGradient(ctx, o.fill, x, y, w, h) : o.fill.color ?? '#000000';
    if (rule) ctx.fill(rule); else ctx.fill();
    ctx.restore();
  }
  // chanfro 3D: a luz medida do PowerPoint sobre o preenchimento (light3d.ts)
  if (sh.bevel && !isLineGeom && ((sh.fill && sh.fill.type !== 'none') || sh.fillImage || ov.fill)) {
    try { applyBevel(ctx, sh, x, y, w, h, fit.scale); } catch { /* canvas sem leitura de pixels */ }
  }
  // sombra interna: moldura em volta da forma, recortada nela, só a sombra entra;
  // a sombra fica do LADO de dir (225° = escura em cima à esquerda — medido): a moldura anda ao contrário
  if (sh.innerShadow && !isLineGeom) {
    const s = sh.innerShadow;
    ctx.save();
    const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    if (rule) ctx.clip(rule); else ctx.clip();
    // a sombra sai do ALFA da forma, não da geometria: com preenchimento
    // translúcido (a) o "buraco" vaza para dentro todo — sombra a·(1 − a·B),
    // B = máscara borrada (medido: 808080 a 65% sobre branco → 858585). Fica
    // um véu uniforme a·(1−a) + a moldura com a².
    const a = sh.fill && sh.fill.type !== 'none' && !sh.fillImage ? sh.fillAlpha ?? 1 : 1;
    if (a < 1) {
      ctx.fillStyle = rgbaOf(s.color, s.alpha * a * (1 - a));
      if (rule) ctx.fill(rule); else ctx.fill();
    }
    const K = 20000;
    const m = ctx.getTransform();
    const dx = s.dist * Math.cos(s.dirDeg * Math.PI / 180) * fit.scale, dy = s.dist * Math.sin(s.dirDeg * Math.PI / 180) * fit.scale;
    ctx.shadowColor = rgbaOf(s.color, s.alpha * a * a);
    ctx.shadowBlur = s.blurRad * fit.scale;
    ctx.shadowOffsetX = m.a * K - dx;
    ctx.shadowOffsetY = m.b * K - dy;
    ctx.translate(-K, 0);
    ctx.beginPath();
    const B = Math.max(w, h);
    ctx.rect(x - B, y - B, w + 2 * B, h + 2 * B);
    shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill', true);
    ctx.fillStyle = '#000';
    ctx.fill('evenodd');
    ctx.restore();
  }
  // contorno (com prstDash opcional)
  const lineColor = ov.line ?? sh.lineColor;
  if (lineColor) {
    // alfa do contorno (<a:ln><a:solidFill><a:alpha>): anéis translúcidos (gdx-218979)
    const prevAlpha = ctx.globalAlpha;
    if (sh.lineAlpha !== undefined && sh.lineAlpha < 1) ctx.globalAlpha = prevAlpha * sh.lineAlpha;
    ctx.strokeStyle = lineColor;
    // largura em EMU × (px por EMU) — antes dividia por 9525 e todo contorno saía com 1 px
    const lw = Math.max(1, (sh.lineWidth ?? 9525) * fit.scale);
    ctx.lineWidth = lw;
    if (sh.lineDash) ctx.setLineDash(dashPattern(sh.lineDash, lw));
    shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'stroke');
    ctx.stroke();
    if (sh.lineDash) ctx.setLineDash([]);
    // setas nos extremos (headEnd/tailEnd) das geometrias de linha
    if (isLineGeom && (sh.headArrow || sh.tailArrow)) {
      const ends = lineEndpoints(sh.geom, x, y, w, h);
      if (ends) {
        ctx.fillStyle = lineColor;
        if (sh.headArrow) paintArrowhead(ctx, sh.headArrow, ends.hx, ends.hy, ends.hAng, lw);
        if (sh.tailArrow) paintArrowhead(ctx, sh.tailArrow, ends.tx, ends.ty, ends.tAng, lw);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }
  return true;
}

/**
 * Rotação (lat, lon, rev) equivalente dos presets de câmera sem `<a:rot>`, AJUSTADA
 * no app (syn-b-e15: retângulo vermelho extrudado em azul — função de suporte em 16
 * direções; as perspectivas viram ortográficas aproximadas).
 */
const CAM_ROT: Record<string, { lat: number; lon: number; rev: number }> = {
  isometricRightUp: { lat: 35, lon: 314.75, rev: 0.25 },
  perspectiveRight: { lat: 359.75, lon: 157.75, rev: 180.25 },
  perspectiveAbove: { lat: 160.5, lon: 0.75, rev: 179.75 },
  perspectiveContrastingRightFacing: { lat: 170.75, lon: 135, rev: 176 },
};
/**
 * Câmeras OBLÍQUAS: a frente fica intacta e o fundo da extrusão desloca na
 * direção do preset — 0,3·profundidade (oblique*), 0,5 (legacyOblique*) e 0,18 nas
 * perspectivas legadas (medido, syn-b-e15).
 */
function obliqueOffset(prst: string | undefined): [number, number] | undefined {
  if (!prst) return undefined;
  const m = /^(legacyOblique|oblique|legacyPerspective)(Top|Bottom)?(Left|Right)?$/.exec(prst);
  if (!m) return undefined;
  const k = m[1] === 'oblique' ? 0.3 : m[1] === 'legacyOblique' ? 0.505 : 0.18;
  const dx = m[3] === 'Left' ? -1 : m[3] === 'Right' ? 1 : 0, dy = m[2] === 'Top' ? -1 : m[2] === 'Bottom' ? 1 : 0;
  if (!dx && !dy) return [0, 0];
  const l = Math.hypot(dx, dy);
  return [(k * dx) / l, (k * dy) / l];
}

/** Contorno da geometria achatado em polígonos (coordenadas da caixa x,y,w,h). */
function outlinePolys(sh: Shape, x: number, y: number, w: number, h: number): [number, number][][] {
  const out: [number, number][][] = [];
  const segsTo = (subs: import('./geometry.js').PathSeg[][], ox: number, oy: number, sx: number, sy: number): void => {
    for (const sub of subs) {
      let cur: [number, number][] = [], px = 0, py = 0;
      const push = (X: number, Y: number): void => { cur.push([ox + X * sx, oy + Y * sy]); px = X; py = Y; };
      for (const s of sub) {
        if (s.c === 'M') { if (cur.length > 2) out.push(cur); cur = []; push(s.x, s.y); }
        else if (s.c === 'L') push(s.x, s.y);
        else if (s.c === 'C') { const x0 = px, y0 = py; for (let i = 1; i <= 12; i++) { const t = i / 12, m = 1 - t; push(m * m * m * x0 + 3 * t * m * m * s.x1 + 3 * t * t * m * s.x2 + t * t * t * s.x, m * m * m * y0 + 3 * t * m * m * s.y1 + 3 * t * t * m * s.y2 + t * t * t * s.y); } }
        else if (s.c === 'Q') { const x0 = px, y0 = py; for (let i = 1; i <= 8; i++) { const t = i / 8, m = 1 - t; push(m * m * x0 + 2 * t * m * s.x1 + t * t * s.x, m * m * y0 + 2 * t * m * s.y1 + t * t * s.y); } }
        else if (s.c === 'E') { let a1 = s.a1; if (s.ccw && a1 > s.a0) a1 -= 2 * Math.PI; if (!s.ccw && a1 < s.a0) a1 += 2 * Math.PI; const n = Math.max(8, Math.ceil(Math.abs(a1 - s.a0) / 0.1)); for (let i = 0; i <= n; i++) { const a = s.a0 + ((a1 - s.a0) * i) / n; push(s.cx + s.rx * Math.cos(a), s.cy + s.ry * Math.sin(a)); } }
      }
      if (cur.length > 2) out.push(cur);
    }
  };
  if (sh.custGeom) { segsTo(sh.custGeom.subs, x, y, w / sh.custGeom.w, h / sh.custGeom.h); return out; }
  const p = presetPath(sh.geom, w, h, sh.adj, sh.adjNames);
  if (p.kind === 'path') segsTo(p.fillRule === 'evenodd' ? p.subs.slice(0, 1) : p.subs.filter((_, i) => !p.subLum || p.subLum[i] !== null), x, y, 1, 1);
  else if (p.kind === 'poly') out.push(p.points.map((q) => [x + q.x, y + q.y]));
  else if (p.kind === 'ellipse' || p.kind === 'roundRect') {
    const r = p.kind === 'roundRect' ? Math.min(p.r, w / 2, h / 2) : 0, poly: [number, number][] = [];
    if (p.kind === 'ellipse') for (let i = 0; i < 64; i++) { const a = (i / 64) * 2 * Math.PI; poly.push([x + w / 2 + (w / 2) * Math.cos(a), y + h / 2 + (h / 2) * Math.sin(a)]); }
    else for (const [cx, cy, a0] of [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]] as const) for (let i = 0; i <= 6; i++) { const a = ((a0 + i * 15) * Math.PI) / 180; poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    out.push(poly);
  } else out.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  return out;
}

/**
 * Laterais da extrusão 3D (`extrusionH`): cada aresta do contorno vira um
 * quadrilátero entre a frente e o fundo (girado pela câmera — ortográfica — ou
 * deslocado pela oblíqua), pintado na cor da extrusão com a luz medida (normal
 * da lateral → light3d) e em ordem de profundidade; a frente vem depois, por
 * cima. Desenha no referencial do slide (`baseM`).
 */
function paintExtrusion(ctx: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number, scale: number, baseM: DOMMatrix,
  camR: { lat: number; lon: number; rev: number } | undefined): void {
  const ex = sh.extrusion!;
  const E = ex.h * scale;
  const color = ex.color ?? sh.fill?.color ?? sh.fill?.stops?.[0]?.color;
  if (!color || !(E > 0)) return;
  const tab = lightTable(ex.rig, ex.mat);
  const cx = x + w / 2, cy = y + h / 2;
  const rot = ((sh.xfrm?.rot ?? 0) / 60000) * Math.PI / 180, fh = sh.xfrm?.flipH ? -1 : 1, fv = sh.xfrm?.flipV ? -1 : 1;
  const M = camR ? cameraMatrix3(camR) : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const obl = camR ? undefined : obliqueOffset(sh.camPrst);
  // de frente (sem rotação nem oblíqua) a extrusão fica escondida atrás da face
  if (!camR && (!obl || (obl[0] === 0 && obl[1] === 0))) return;
  // ponto local (no plano da forma, já girado/espelhado) + profundidade z (0 frente, −E fundo) → tela
  const P = (lx: number, ly: number, z: number): [number, number, number] => {
    const ux = (lx - cx) * fh, uy = (ly - cy) * fv;
    const X = ux * Math.cos(rot) - uy * Math.sin(rot), Y = ux * Math.sin(rot) + uy * Math.cos(rot);
    if (obl) return [cx + X - obl[0] * z, cy + Y - obl[1] * z, z];
    return [cx + M[0]![0]! * X + M[0]![1]! * Y + M[0]![2]! * z, cy + M[1]![0]! * X + M[1]![1]! * Y + M[1]![2]! * z, M[2]![0]! * X + M[2]![1]! * Y + M[2]![2]! * z];
  };
  const quads: { pts: [number, number][]; z: number; fill: string }[] = [];
  const L = new Float32Array(4);
  const base = parseInt(color.replace('#', ''), 16);
  const lin = [(base >> 16) & 255, (base >> 8) & 255, base & 255].map((c) => SRGB_LIN[c]!);
  for (const poly of outlinePolys(sh, x, y, w, h)) {
    // orientação do polígono (normal para FORA)
    let area = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i]!, b = poly[(i + 1) % poly.length]!; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area >= 0 ? 1 : -1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) continue;
      const fa = P(a[0], a[1], 0), fb = P(b[0], b[1], 0), ba = P(a[0], a[1], -E), bb = P(b[0], b[1], -E);
      // normal da lateral: (dy, −dx) no plano local → 3D
      const nl = [(b[1] - a[1]) * sgn, -(b[0] - a[0]) * sgn], nlen = Math.hypot(nl[0]!, nl[1]!);
      const n0 = P(cx + (nl[0]! / nlen) * 100, cy + (nl[1]! / nlen) * 100, 0), c0 = P(cx, cy, 0);
      let nx = n0[0] - c0[0], ny = n0[1] - c0[1], nz = obl ? 0 : n0[2] - c0[2];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (!obl && nz < -1e-3) continue; // de costas para a câmera
      let fill = color;
      if (tab) {
        lightAt(tab, ex.dir, (Math.atan2(ny, nx) * 180) / Math.PI, (Math.acos(Math.max(-1, Math.min(1, nz))) * 180) / Math.PI, L);
        fill = `rgb(${[0, 1, 2].map((k) => LIN_SRGB[Math.max(0, Math.min(4095, Math.round((lin[k]! * L[k]! + L[3]!) * 4095)))]!).join(',')})`;
      }
      quads.push({ pts: [[fa[0], fa[1]], [fb[0], fb[1]], [bb[0], bb[1]], [ba[0], ba[1]]], z: (fa[2] + fb[2] + ba[2] + bb[2]) / 4, fill });
    }
  }
  quads.sort((p, q) => p.z - q.z);
  ctx.save();
  ctx.setTransform(baseM);
  if (/^(legacy)?[wW]ireframe$/.test(ex.mat ?? '')) {
    // material "aramado": só as arestas (frente, fundo e as ligações), sem preenchimento
    ctx.strokeStyle = sh.lineColor ?? '#000000'; ctx.lineWidth = Math.max(0.75, 9525 * scale);
    for (const q of quads) { ctx.beginPath(); q.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.stroke(); }
    ctx.restore();
    return;
  }
  for (const q of quads) {
    ctx.beginPath();
    q.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = q.fill; ctx.strokeStyle = q.fill; ctx.lineWidth = 0.6;
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

const SRGB_LIN = new Float32Array(256).map((_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const LIN_SRGB = new Uint8ClampedArray(4096).map((_, i) => { const v = i / 4095; return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)); });

/** Distância euclidiana ao quadrado (Felzenszwalb, 1D) — `f` = 0 fora, ∞ dentro. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) { k--; s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1]! < q) k++; const dq = q - v[k]!; d[q] = dq * dq + f[v[k]!]!; }
}

/**
 * Sombreado do chanfro (orthographicFront): distância de cada pixel à borda da
 * forma → inclinação do perfil (bevelSlope) → normal (azimute na tela, ângulo
 * polar pela razão altura/largura) → luz medida: em luz linear cor·D + S. A face
 * plana também muda (D da face: threePt +17%, harsh −33%…).
 */
function applyBevel(ctx: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number, scale: number): void {
  const b = sh.bevel!;
  const tab = lightTable(b.rig, b.mat);
  if (!tab) return;
  const M = ctx.getTransform();
  const kpx = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
  const bw = b.w * scale * kpx; // largura do chanfro em px do dispositivo
  const hw = b.h / b.w;
  const cv = (ctx as { canvas?: { width: number; height: number } }).canvas;
  if (!cv || !(bw > 0.5)) return;
  const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [M.a * px! + M.c * py! + M.e, M.b * px! + M.d * py! + M.f]);
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0]!))) - 1), y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]!))) - 1);
  const x1 = Math.min(cv.width, Math.ceil(Math.max(...pts.map((p) => p[0]!))) + 1), y1 = Math.min(cv.height, Math.ceil(Math.max(...pts.map((p) => p[1]!))) + 1);
  const W = x1 - x0, H = y1 - y0;
  if (W <= 2 || H <= 2 || W * H > 6e6) return;
  // máscara da forma (mesma geometria do preenchimento)
  const mc = scratchCanvas(W, H);
  const m2 = mc?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
  if (!m2) return;
  m2.setTransform(M.a, M.b, M.c, M.d, M.e - x0, M.f - y0);
  const rule = shapePath(m2, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
  m2.fillStyle = '#fff';
  if (rule) m2.fill(rule); else m2.fill();
  const mask = m2.getImageData(0, 0, W, H).data;
  // distância (px) até fora da forma
  const N = Math.max(W, H) + 2, f = new Float64Array(N), dd = new Float64Array(N), vv = new Int32Array(N), zz = new Float64Array(N + 1);
  const D2 = new Float64Array(W * H);
  const INF = 1e20;
  for (let c = 0; c < W; c++) {
    f[0] = 0; for (let r = 0; r < H; r++) f[r + 1] = mask[(r * W + c) * 4 + 3]! > 127 ? INF : 0; f[H + 1] = 0;
    edt1d(f, H + 2, dd, vv, zz);
    for (let r = 0; r < H; r++) D2[r * W + c] = dd[r + 1]!;
  }
  const dist = new Float32Array(W * H);
  for (let r = 0; r < H; r++) {
    f[0] = 0; for (let c = 0; c < W; c++) f[c + 1] = D2[r * W + c]!; f[W + 1] = 0;
    edt1d(f, W + 2, dd, vv, zz);
    for (let c = 0; c < W; c++) dist[r * W + c] = Math.sqrt(dd[c + 1]!);
  }
  const img = ctx.getImageData(x0, y0, W, H), px = img.data;
  const L = new Float32Array(4), face = new Float32Array(4);
  lightFace(tab, face);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = r * W + c, a = mask[i * 4 + 3]! / 255;
    if (a <= 0) continue;
    const d = dist[i]!;
    let lt = face;
    if (d < bw) {
      // direção para FORA = −∇d (diferenças centrais)
      const dl = c > 0 ? dist[i - 1]! : 0, dr = c < W - 1 ? dist[i + 1]! : 0, du = r > 0 ? dist[i - W]! : 0, dn = r < H - 1 ? dist[i + W]! : 0;
      const gx = dl - dr, gy = du - dn;
      const th = (Math.atan2(gy, gx) * 180) / Math.PI;
      const ph = bevelPhi(b.prst, d / bw, hw);
      // inclinada para dentro: a normal aponta para o lado oposto
      lightAt(tab, b.dir, ph < 0 ? th + 180 : th, Math.abs(ph), L);
      lt = L;
    }
    const o = i * 4;
    for (let k = 0; k < 3; k++) {
      const v = SRGB_LIN[px[o + k]!]! * lt[k]! + lt[3]!;
      const nv = LIN_SRGB[Math.max(0, Math.min(4095, Math.round(v * 4095)))]!;
      px[o + k] = a >= 1 ? nv : Math.round(px[o + k]! + (nv - px[o + k]!) * a);
    }
  }
  ctx.putImageData(img, x0, y0);
}

/**
 * Monta o path da geometria preset no contexto (usa o descritor puro
 * `presetPath` — o MESMO que o export PDF reusa como paths vetoriais).
 */
function shapePath(
  ctx: CanvasRenderingContext2D, geom: string | undefined,
  x: number, y: number, w: number, h: number,
  custGeom?: { w: number; h: number; subs: import('./geometry.js').PathSeg[][]; noFill?: boolean[]; noStroke?: boolean[] },
  adj?: number[],
  adjNames?: string[],
  /** Só os subcaminhos que PREENCHEM (`fill`) ou que têm CONTORNO (`stroke`); ausente = todos. */
  mode?: 'fill' | 'stroke',
  /** Acrescenta ao caminho atual (sem beginPath) — moldura da sombra interna. */
  append = false,
): CanvasFillRule | undefined {
  if (!append) ctx.beginPath();
  // geometria CUSTOM (freeform): segs nas unidades do path, escalados ao rect
  if (custGeom) {
    const sx = w / custGeom.w, sy = h / custGeom.h;
    // <a:path fill="none"> não preenche; stroke="0" não contorna
    const subs = mode === 'fill' && custGeom.noFill ? custGeom.subs.filter((_, i) => !custGeom.noFill![i])
      : mode === 'stroke' && custGeom.noStroke ? custGeom.subs.filter((_, i) => !custGeom.noStroke![i]) : custGeom.subs;
    drawSegs(ctx, subs, x, y, sx, sy);
    return undefined;
  }
  const p = presetPath(geom, w, h, adj, adjNames);
  switch (p.kind) {
    case 'path': {
      const subs = mode === 'fill' && p.subLum ? p.subs.filter((_, i) => p.subLum![i] !== null)
        : mode === 'stroke' && p.subStroke ? p.subs.filter((_, i) => p.subStroke![i] !== false)
          : p.subs;
      drawSegs(ctx, subs, x, y, 1, 1);
      return p.fillRule;
    }
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
      break;
    case 'roundRect':
      roundRect(ctx, x, y, w, h, p.r);
      break;
    case 'poly': {
      const pts = p.points;
      if (pts.length) {
        ctx.moveTo(x + pts[0]!.x, y + pts[0]!.y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i]!.x, y + pts[i]!.y);
        ctx.closePath();
      }
      break;
    }
    case 'line':
      ctx.moveTo(x + p.x1, y + p.y1);
      ctx.lineTo(x + p.x2, y + p.y2);
      break;
    case 'pie': {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, Math.max(0, w / 2), Math.max(0, h / 2), 0, p.startDeg * Math.PI / 180, p.endDeg * Math.PI / 180);
      ctx.closePath();
      break;
    }
    default:
      ctx.rect(x, y, w, h);
  }
  return undefined;
}

/**
 * Extremos + tangentes das geometrias de linha (para desenhar setas).
 * head = ponto inicial, apontando PARA FORA (contra a direção do traço);
 * tail = ponto final, apontando na direção do traço.
 */
function lineEndpoints(geom: string | undefined, x: number, y: number, w: number, h: number):
  { hx: number; hy: number; hAng: number; tx: number; ty: number; tAng: number } | null {
  switch (geom) {
    case 'line':
    case 'straightConnector1': {
      const a = Math.atan2(h, w);
      return { hx: x, hy: y, hAng: a + Math.PI, tx: x + w, ty: y + h, tAng: a };
    }
    case 'bentConnector2':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: Math.PI / 2 };
    case 'bentConnector3':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: 0 };
    case 'bentConnector4':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: Math.PI / 2 };
    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: 0 };
    default:
      return null;
  }
}

/**
 * Seta de extremidade de linha (`headEnd`/`tailEnd`), tamanho médio do app de
 * referência (~3× a espessura). `ang` = direção para onde a seta APONTA.
 */
function paintArrowhead(ctx: CanvasRenderingContext2D, type: string, px: number, py: number, ang: number, lw: number): void {
  const L = lw * 3.5 + 2;   // comprimento
  const W = lw * 1.6 + 1;   // meia-largura
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.beginPath();
  switch (type) {
    case 'stealth': // triângulo com entalhe traseiro
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L * 0.6, 0);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case 'arrow': // V aberto (stroke)
      ctx.moveTo(-L, W);
      ctx.lineTo(0, 0);
      ctx.lineTo(-L, -W);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.moveTo(L * 0.5, 0);
      ctx.lineTo(0, W);
      ctx.lineTo(-L * 0.5, 0);
      ctx.lineTo(0, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case 'oval':
      ctx.ellipse(0, 0, lw * 1.9 + 1, lw * 1.9 + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: // triangle
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
  }
  ctx.restore();
}

/** Constrói subpaths de PathSeg no contexto (offset x,y + escala sx,sy). */
function drawSegs(
  ctx: CanvasRenderingContext2D,
  subs: import('./geometry.js').PathSeg[][],
  x: number, y: number, sx: number, sy: number,
): void {
  for (const sub of subs) {
    for (const s of sub) {
      if (s.c === 'M') ctx.moveTo(x + s.x * sx, y + s.y * sy);
      else if (s.c === 'L') ctx.lineTo(x + s.x * sx, y + s.y * sy);
      else if (s.c === 'C') ctx.bezierCurveTo(x + s.x1 * sx, y + s.y1 * sy, x + s.x2 * sx, y + s.y2 * sy, x + s.x * sx, y + s.y * sy);
      else if (s.c === 'Q') ctx.quadraticCurveTo(x + s.x1 * sx, y + s.y1 * sy, x + s.x * sx, y + s.y * sy);
      else if (s.c === 'E') ctx.ellipse(x + s.cx * sx, y + s.cy * sy, Math.max(0, s.rx * sx), Math.max(0, s.ry * sy), 0, s.a0, s.a1, s.ccw ?? false);
      else ctx.closePath();
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, r); // arcTo lança com raio negativo (escala/ajuste negativo)
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Pinta o txBody usando o layout PURO `layoutTextBody` (word-wrap, autofit,
 * bullets com indent, âncora — spec 03 item D). O measurer injeta
 * `ctx.measureText`: fonte setada em `sizePt`px mede uma largura numericamente
 * igual a pontos (escala linear do canvas).
 */
function paintText(ctx: CanvasRenderingContext2D, sh: Shape, tb: TextBody, x: number, y: number, w: number, h: number, scale: number,
  anim?: ShapeAnimPaint, inTextRect = false): void {
  // texto VERTICAL (vert = 90° horário; vert270 = 90° anti-horário): diagrama
  // na caixa de lados trocados e gira em volta do centro
  // WordArt (prstTxWarp): texto deformado pelas regras medidas (text-warp.ts)
  if (tb.warp) { paintWarp(ctx, sh, tb, x, y, w, h, scale); return; }
  // retângulo de TEXTO da geometria (<a:rect> do preset ou da custGeom): o texto
  // quebra e ancora dentro dele, não na caixa inteira (elipse, triângulo, nuvem…)
  if (!inTextRect) {
    const cg = sh.custGeom;
    let tr = cg?.textRect ? { l: cg.textRect.l * w, t: cg.textRect.t * h, r: cg.textRect.r * w, b: cg.textRect.b * h }
      : !cg ? presetTextRect(sh.geom, w, h, sh.adj, sh.adjNames) : null;
    if (tr && (tr.l > 0.01 || tr.t > 0.01 || tr.r < w - 0.01 || tr.b < h - 0.01)) {
      // a geometria espelhada leva o retângulo junto (o texto continua legível)
      if (sh.xfrm?.flipH) tr = { ...tr, l: w - tr.r, r: w - tr.l };
      if (sh.xfrm?.flipV) tr = { ...tr, t: h - tr.b, b: h - tr.t };
      paintText(ctx, sh, tb, x + tr.l, y + tr.t, tr.r - tr.l, tr.b - tr.t, scale, anim, true);
      return;
    }
  }
  // <a:bodyPr rot>: giro extra do texto em volta do centro (forma girada 180° com o
  // texto desvirado — gdx-268620)
  if (tb.rot && tb.rot % 21600000 !== 0) {
    const { rot, ...flat } = tb;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot / 60000) * Math.PI / 180);
    ctx.translate(-cx, -cy);
    paintText(ctx, sh, flat, x, y, w, h, scale, anim, true);
    ctx.restore();
    return;
  }
  const turn = tb.vert === 'vert' || tb.vert === 'eaVert' ? 1 : tb.vert === 'vert270' ? -1 : 0;
  if (turn) {
    const { vert: _v, ...flat } = tb;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.translate(-cx, -cy);
    paintText(ctx, sh, flat, cx - h / 2, cy - w / 2, h, w, scale, anim, true);
    ctx.restore();
    return;
  }
  // flipH/flipV espelham a GEOMETRIA, nunca o TEXTO (o app de referência
  // mantém os glifos legíveis) — desfaz o espelho localmente em volta do centro
  const unflip = sh.xfrm?.flipH || sh.xfrm?.flipV;
  if (unflip) {
    ctx.save();
    const cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.scale(sh.xfrm!.flipH ? -1 : 1, sh.xfrm!.flipV ? -1 : 1);
    ctx.translate(-cx, -cy);
  }
  const all = anim?.all;
  // ênfase "tamanho da fonte": refaz o layout com a fonte escalada (contínua, por
  // cima do fontScale do autofit, que arredonda ao ponto)
  const fsc = all?.fontScale !== undefined && all.fontScale !== 1 ? all.fontScale : 1;
  const isTitle = sh.phType === 'title' || sh.phType === 'ctrTitle';
  const measure = pptMeasure(ctx);
  const lopts = { defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT, defaultAnchor: (isTitle ? 'ctr' : 't') as 't' | 'ctr', sizeScale: fsc };
  // normAutofit sem fontScale NÃO encolhe: o app usa só o valor gravado (medido,
  // syn-autofit; de novo em syn-b-t652a: o corpo do gdx-652066 #8 transbordando, 26 pt)
  const layout = layoutTextBody(tb, w / scale, h / scale, measure, lopts);

  const pxPerPt = EMU_PER_POINT * scale; // 1pt em px na escala atual
  // sobreposições de estilo animadas (forma inteira < parágrafo < unidade)
  const fontOf = (f: LayoutFont, st?: PartState | null): LayoutFont => {
    const wgt = st?.fontWeight ?? all?.fontWeight, sty = st?.fontStyle ?? all?.fontStyle, fam = st?.fontFamily ?? all?.fontFamily;
    if (!wgt && !sty && !fam) return f;
    return { ...f, bold: wgt ? wgt === 'bold' : f.bold, italic: sty ? sty === 'italic' : f.italic, family: fam ?? f.family };
  };
  const colorOf = (c: string, st?: PartState | null): string => st?.textColor ?? all?.textColor ?? c;
  const underOf = (u: boolean, st?: PartState | null): boolean => st?.underline ?? all?.underline ?? u;
  /** Caixa (px) da linha em desenho — referência do degradê/imagem das letras. */
  let lineBox: [number, number, number, number] | undefined;
  const drawText = (text: string, r: PlacedRun, tx: number, by0: number, st?: PartState | null): void => {
    const f = fontOf(r.font, st);
    ctx.font = layoutFontStr(f, pxPerPt);
    // sobrescrito/subscrito: baseline deslocada; espaçamento de caracteres (spc)
    const by = r.rise ? by0 - r.rise * scale : by0;
    const ls = r.spc ? r.spc * scale : 0;
    const lsCtx = ctx as unknown as { letterSpacing?: string; fontKerning?: string };
    const prevLs = lsCtx.letterSpacing;
    // kerning do desenho = o do layout (o run liga ou não — `kern`)
    const prevKern = lsCtx.fontKerning;
    if (prevKern !== undefined) lsCtx.fontKerning = r.font.kern ? 'normal' : 'none';
    // run inteiro: a diferença entre a largura natural do canvas e a do layout (avanços
    // do app em 1/8 pt, sem ligaduras) se espalha pelos caracteres
    let fit = 0;
    if (!ls && text === r.text && prevLs !== undefined && !st) {
      const n = [...text].length;
      if (n > 1) { const d = r.w * scale - ctx.measureText(text).width; if (Math.abs(d) > 0.25) fit = d / n; }
    }
    if ((ls || fit) && prevLs !== undefined) lsCtx.letterSpacing = `${ls || fit}px`;
    const color = colorOf(r.color, st);
    ctx.fillStyle = color;
    // letras com padrão (WordArt): o padrão 8×8 ancorado no slide
    if (r.pattFill && !st) { const pat = presetPattern(ctx, r.pattFill, 0, 0, scale); if (pat) ctx.fillStyle = pat; }
    // degradê/imagem das letras: na caixa da LINHA (avanço × altura da linha — medido, syn-b-e11)
    if (!st && lineBox && (r.gradFill || r.fillImage)) { const lf = letterFill(ctx, r, lineBox, scale); if (lf) ctx.fillStyle = lf; }
    const fillA = st ? 1 : r.alpha ?? 1;
    const prevA = ctx.globalAlpha;
    if (fillA < 1) ctx.globalAlpha = prevA * fillA;
    const effShadow = fillA <= 0 ? undefined : r.shadow ?? (shapeFilled(sh) ? undefined : sh.shadow);
    if (fillA <= 0) { /* letras sem preenchimento: só o contorno */ } else if (effShadow) {
      // sombra do texto: EMU→px pela escala; alpha na cor da sombra
      // (a sombra da SHAPE se aplica ao texto só quando a forma NÃO tem
      // preenchimento — com preenchimento ela é só da caixa; medido, syn-b-e8)
      const sc = effShadow;
      const n = parseInt(sc.color.replace('#', ''), 16);
      ctx.save();
      ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${sc.alpha})`;
      ctx.shadowBlur = sc.blurRad * scale * TEXT_SHADOW_BLUR_K;
      ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * scale;
      ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * scale;
      ctx.fillText(text, tx, by);
      ctx.restore();
    } else {
      ctx.fillText(text, tx, by);
    }
    ctx.globalAlpha = prevA;
    // contorno das letras (<a:ln> do rPr)
    if (r.outline) {
      ctx.save();
      ctx.strokeStyle = r.outline.color; ctx.lineWidth = Math.max(0.5, r.outline.width * scale); ctx.lineJoin = 'round';
      ctx.strokeText(text, tx, by);
      ctx.restore();
    }
    if (underOf(r.underline, st)) {
      const sizePx = f.sizePt * pxPerPt;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, sizePx / 16);
      const uy = Math.round(by + sizePx * 0.12) + 0.5;
      const tw = text === r.text ? r.w * scale : ctx.measureText(text).width;
      ctx.beginPath(); ctx.moveTo(tx, uy); ctx.lineTo(tx + tw, uy); ctx.stroke();
    }
    if (r.strike) {
      const sizePx = f.sizePt * pxPerPt;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, sizePx / 16);
      const sy = Math.round(by - sizePx * 0.3) + 0.5;
      const tw = text === r.text ? r.w * scale : ctx.measureText(text).width;
      ctx.beginPath(); ctx.moveTo(tx, sy); ctx.lineTo(tx + tw, sy); ctx.stroke();
    }
    if ((ls || fit) && prevLs !== undefined) lsCtx.letterSpacing = prevLs;
    if (prevKern !== undefined) lsCtx.fontKerning = prevKern;
  };

  // caixas por parágrafo (px) — geometria-base das animações por parágrafo
  const paraHook = anim?.hooks.para;
  const unitHook = anim?.hooks.unit;
  const pbox = new Map<number, [number, number, number, number]>();
  const pcolor = new Map<number, string>();
  if (paraHook) {
    for (const line of layout.lines) {
      if (!pcolor.has(line.para) && line.runs[0]) pcolor.set(line.para, line.runs[0].color);
      let x0 = Infinity, x1 = -Infinity;
      for (const r of line.runs) { x0 = Math.min(x0, x + r.x * scale); x1 = Math.max(x1, x + (r.x + r.w) * scale); }
      if (line.bullet) x0 = Math.min(x0, x + line.bullet.x * scale);
      if (!Number.isFinite(x0)) continue;
      const top = y + (line.baseline - line.height * 0.8) * scale, bot = y + (line.baseline + line.height * 0.2) * scale;
      const b = pbox.get(line.para);
      pbox.set(line.para, b ? [Math.min(b[0], x0), Math.min(b[1], top), Math.max(b[2], x1), Math.max(b[3], bot)] : [x0, top, x1, bot]);
    }
  }
  const paraSt = new Map<number, PartState | null>();
  const stOfPara = (pi: number): PartState | null => {
    if (!paraHook || !anim) return null;
    if (!paraSt.has(pi)) {
      const b = pbox.get(pi);
      paraSt.set(pi, b ? paraHook(pi, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m, { text: pcolor.get(pi) })) : null);
    }
    return paraSt.get(pi) ?? null;
  };
  // unidades (letras sem espaço / palavras) — MESMA contagem do modelo de tempo
  const plan = unitHook ? planUnits(tb, layout, unitHook.type, !!unitHook.words) : null;

  ctx.textBaseline = 'alphabetic';
  for (const line of layout.lines) {
    const by = y + line.baseline * scale;
    if (line.runs.some((r) => r.gradFill || r.fillImage)) {
      const l0 = Math.min(...line.runs.map((r) => r.x)), l1 = Math.max(...line.runs.map((r) => r.x + r.w));
      lineBox = [x + l0 * scale, y + (line.baseline - line.height * 0.8) * scale, (l1 - l0) * scale, line.height * scale];
    } else lineBox = undefined;
    const pst = stOfPara(line.para);
    if (pst && !pst.visible) continue;
    ctx.save();
    if (pst && anim) {
      const b = pbox.get(line.para)!;
      if (!applyPart(ctx, pst, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m), b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m)) {
        ctx.restore(); continue;
      }
    }
    if (line.bullet) {
      // marcador acompanha a 1ª unidade do parágrafo quando o texto entra por unidade
      let bulletOn = true;
      if (unitHook && plan && anim) {
        const sizePx = line.bullet.font.sizePt * pxPerPt;
        const bst = unitHook.state(plan.firstRef(line.para),
          boxBase(x + line.bullet.x * scale, by - sizePx * 0.8, sizePx, sizePx, anim.m, { text: line.bullet.color }),
          plan.firstWordRef(line.para));
        bulletOn = !bst || (bst.visible && bst.opacity > 0);
      }
      const bimg = line.bullet.image ? paintImages?.get(line.bullet.image.part) : undefined;
      if (bulletOn && bimg) {
        // marcador de IMAGEM: altura = tamanho do marcador, proporção da imagem, base na baseline
        const hPx = line.bullet.font.sizePt * pxPerPt * 0.8;
        const iw = imgW(bimg), ih = imgH(bimg);
        const wPx = ih > 0 ? (hPx * iw) / ih : hPx;
        ctx.drawImage(bimg, x + line.bullet.x * scale, by - hPx, wPx, hPx);
      } else if (bulletOn && !line.bullet.image) {
        ctx.font = layoutFontStr(line.bullet.font, pxPerPt);
        ctx.fillStyle = line.bullet.color;
        ctx.fillText(line.bullet.text, x + line.bullet.x * scale, by);
      }
    }
    if (!unitHook || !plan || !anim) {
      for (const r of line.runs) drawText(r.text, r, x + r.x * scale, by, pst);
      ctx.restore();
      continue;
    }
    // por letra/palavra: cada unidade tem o próprio estado (escalonado no tempo).
    // Geometria de cada pedaço; os pedaços de uma palavra que cruza runs
    // compartilham a caixa (união) e o estado
    const pieces: { p: UnitPiece; r: PlacedRun; ux: number; uw: number; sizePx: number }[] = [];
    for (const r of line.runs) {
      const ps = plan.pieces.get(r);
      if (!ps?.length) continue;
      ctx.font = layoutFontStr(fontOf(r.font, pst), pxPerPt);
      const tx = x + r.x * scale;
      for (const p of ps) {
        pieces.push({ p, r, ux: tx + ctx.measureText(r.text.slice(0, p.start)).width, uw: ctx.measureText(p.text).width, sizePx: r.font.sizePt * pxPerPt });
      }
    }
    const boxes = new Map<number, { x0: number; x1: number; size: number; color: string }>();
    for (const q of pieces) {
      const b = boxes.get(q.p.ref.k);
      if (b) { b.x0 = Math.min(b.x0, q.ux); b.x1 = Math.max(b.x1, q.ux + q.uw); b.size = Math.max(b.size, q.sizePx); }
      else boxes.set(q.p.ref.k, { x0: q.ux, x1: q.ux + q.uw, size: q.sizePx, color: q.r.color });
    }
    const states = new Map<number, PartState | null>();
    for (const q of pieces) {
      const b = boxes.get(q.p.ref.k)!;
      const uy = by - b.size * 0.8;
      const ubase = boxBase(b.x0, uy, b.x1 - b.x0, b.size, anim.m, { text: b.color });
      if (!states.has(q.p.ref.k)) states.set(q.p.ref.k, unitHook.state(q.p.ref, ubase, q.p.word));
      const ust = states.get(q.p.ref.k)!;
      if (ust && !ust.visible) continue;
      ctx.save();
      if (ust && !applyPart(ctx, ust, ubase, b.x0, uy, b.x1 - b.x0, b.size, anim.m)) { ctx.restore(); continue; }
      ctx.font = layoutFontStr(fontOf(q.r.font, pst), pxPerPt);
      drawText(q.p.text, q.r, q.ux, by, ust ?? pst);
      ctx.restore();
    }
    ctx.restore();
  }
  if (unflip) ctx.restore();
}

/**
 * Preenchimento das letras com degradê ou imagem na caixa (px) `box` — a da
 * LINHA no texto normal (medido, syn-b-e11: degradê e imagem esticada no avanço
 * da linha × altura da linha; ladrilho no tamanho natural a partir do canto dela).
 * `scale` = px por EMU no espaço de `ctx`.
 */
function letterFill(ctx: CanvasRenderingContext2D, r: { gradFill?: Fill; fillImage?: ImageRef; fillTile?: boolean }, box: readonly [number, number, number, number], scale: number): CanvasGradient | CanvasPattern | null {
  const [bx, by, bw, bh] = box;
  if (!(bw > 0) || !(bh > 0)) return null;
  if (r.gradFill?.stops && r.gradFill.stops.length >= 2) return makeLinearGradient(ctx, r.gradFill, bx, by, bw, bh);
  const raw = r.fillImage ? paintImages?.get(r.fillImage.part) : undefined;
  if (!raw || !r.fillImage) return null;
  const img = fxImage(raw, r.fillImage.fx);
  if (r.fillTile) return imageTile(ctx, img, r.fillImage, bx, by, scale, bw, bh);
  const rr = insetRect(r.fillImage.fillRect, bx, by, bw, bh);
  const pat = ctx.createPattern(img as CanvasImageSource, 'no-repeat');
  if (pat && typeof pat.setTransform === 'function' && typeof DOMMatrix !== 'undefined' && imgW(img) > 0 && imgH(img) > 0) {
    pat.setTransform(new DOMMatrix([rr.w / imgW(img), 0, 0, rr.h / imgH(img), rr.x, rr.y]));
  }
  return pat;
}

/** A forma tem preenchimento (aí a sombra da forma é só da caixa, não do texto). */
function shapeFilled(sh: Shape): boolean {
  return (!!sh.fill && sh.fill.type !== 'none') || !!sh.fillImage || !!sh.useBgFill;
}

/**
 * WordArt (`<a:prstTxWarp>`): layout normal do corpo (sem quebra nos presets de
 * caminho único — o app não quebra o texto do arco) e as linhas deformadas por
 * text-warp.ts. A sombra do texto (do run, ou da forma SEM preenchimento —
 * com preenchimento ela é só da caixa; medido, syn-b-e7/e8) é a silhueta
 * deformada deslocada: pinta numa camada e compõe com a sombra.
 */
function paintWarp(ctx: CanvasRenderingContext2D, sh: Shape, tb: TextBody, x: number, y: number, w: number, h: number, scale: number): void {
  const warp = tb.warp!;
  // WordArt vertical (vert="wordArtVert", gtextFVertical do .ppt): letras EMPILHADAS,
  // uma por linha, no quadro de lados trocados girado −90° — a conversão do app grava
  // a forma girada 90° com a caixa deitada (gd-109837), e as letras saem em pé
  if (tb.vert === 'wordArtVert' || tb.vert === 'wordArtVertRtl') {
    const { vert: _v, ...flat } = tb;
    const stacked: TextBody = {
      ...flat, wrap: 'none',
      paragraphs: tb.paragraphs.flatMap((p) => p.runs.flatMap((r) => Array.from(r.text.replace(/\n/g, '')).map((ch) => ({ ...p, runs: [{ ...r, text: ch }] })))),
    };
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2); ctx.translate(-cx, -cy);
    paintWarp(ctx, sh, stacked, cx - h / 2, cy - w / 2, h, w, scale);
    ctx.restore();
    return;
  }
  const single = /^text(ArchUp|ArchDown|Circle|Button)$/.test(warp.prst);
  const body: TextBody = single ? { ...tb, wrap: 'none' } : tb;
  const isTitle = sh.phType === 'title' || sh.phType === 'ctrTitle';
  const measure: MeasureText = (text, f) => { ctx.font = layoutFontStr(f, 1); return ctx.measureText(text).width; };
  const lopts = { defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT, defaultAnchor: (isTitle ? 'ctr' : 't') as 't' | 'ctr' };
  ctx.save();
  const layout = layoutTextBody(body, w / scale, h / scale, measure, lopts);
  // espaços no FIM do parágrafo: o layout os descarta, a deformação os conta (medido)
  const trailing = tb.paragraphs.map((p) => {
    const runs = p.runs.filter((r) => r.text && r.text !== '\n');
    const last = runs[runs.length - 1], m = last ? /\s+$/.exec(last.text) : null;
    if (!last || !m || !runs.some((r) => /\S/.test(r.text))) return 0;
    return measure(m[0], { family: last.font ?? 'Calibri', sizePt: (last.sz ?? lopts.defaultSzPt) * (tb.fontScale ?? 1), bold: !!last.bold, italic: !!last.italic });
  });
  ctx.restore();
  const lines: WarpLine[] = layout.lines.map((line, i) => {
    const lastOfPara = layout.lines[i + 1]?.para !== line.para;
    const p = tb.paragraphs[line.para];
    const szPt = line.runs.length ? Math.max(...line.runs.map((r) => r.font.sizePt)) : line.height / EMU_PER_POINT / 1.2;
    const lnPct = p?.lineSpacingPt !== undefined ? p.lineSpacingPt / (1.2 * szPt) : p?.lineSpacing;
    return {
      ...(lnPct !== undefined ? { lnPct } : {}),
      runs: line.runs.map((r) => ({
        text: r.text, font: (k: number) => layoutFontStr(r.font, k), x: r.x / EMU_PER_POINT, color: r.color,
        ...(r.outline ? { stroke: { color: r.outline.color, width: r.outline.width / EMU_PER_POINT } } : {}),
        ...(r.pattFill ? { pattern: r.pattFill } : {}),
        ...(r.spc ? { spc: r.spc / EMU_PER_POINT } : {}),
        ...(r.gradFill || r.fillImage ? { paint: (c: CanvasRenderingContext2D, box: [number, number, number, number], k: number) => letterFill(c, r, box, k / EMU_PER_POINT) } : {}),
        ...(r.alpha !== undefined ? { alpha: r.alpha } : {}),
      })),
      baseline: line.baseline / EMU_PER_POINT,
      height: line.height / EMU_PER_POINT,
      sizePt: szPt,
      align: p?.align ?? 'l',
      ...(lastOfPara && trailing[line.para] ? { trailing: trailing[line.para] } : {}),
    };
  });
  const run0 = tb.paragraphs.flatMap((p) => p.runs).find((r) => /\S/.test(r.text));
  const sd = run0?.shadow ?? (shapeFilled(sh) ? undefined : sh.shadow);
  // imagem LADRILHADA nas letras deformadas: as células ficam no tamanho natural na
  // SAÍDA (não esticam com a deformação — lo-tdf139618_WordArtBitmapFill): pinta a
  // silhueta deformada e a recobre com o ladrilho
  const vis = layout.lines.flatMap((l) => l.runs).filter((r) => /\S/.test(r.text));
  const tileRun = vis.length && vis.every((r) => r.fillTile && r.fillImage && r.fillImage.part === vis[0]!.fillImage!.part && !r.outline) ? vis[0] : undefined;
  const tileImg = tileRun?.fillImage ? paintImages?.get(tileRun.fillImage.part) : undefined;
  const layer = sd || tileImg ? acquireLayer(ctx) : null;
  const target = layer ?? ctx;
  paintWarpedText(target, warp.prst, warp.adj, !!warp.fromWordArt, lines, x, y, w, h, EMU_PER_POINT * scale, (cw, ch) => scratchCanvas(cw, ch));
  if (layer && tileImg && tileRun?.fillImage) {
    const pat = imageTile(layer, fxImage(tileImg, tileRun.fillImage.fx), tileRun.fillImage, x, y, scale, w, h);
    if (pat) {
      layer.save();
      layer.globalCompositeOperation = 'source-in';
      layer.fillStyle = pat;
      layer.fillRect(x - 4 * w, y - 4 * h, 9 * w, 9 * h);
      layer.restore();
    }
  }
  if (layer) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sd) {
      ctx.shadowColor = rgbaOf(sd.color, sd.alpha);
      ctx.shadowBlur = sd.blurRad * scale * TEXT_SHADOW_BLUR_K;
      ctx.shadowOffsetX = sd.dist * Math.cos(sd.dirDeg * Math.PI / 180) * scale;
      ctx.shadowOffsetY = sd.dist * Math.sin(sd.dirDeg * Math.PI / 180) * scale;
    }
    ctx.drawImage(layer.canvas as unknown as CanvasImageSource, 0, 0);
    ctx.restore();
    layerBusy.delete(layer);
  }
}

/** Pedaço de uma unidade de texto animada dentro de um run posicionado. */
interface UnitPiece {
  text: string;
  /** Início do pedaço no texto do run. */
  start: number;
  /** Unidade (letra ou palavra) a que o pedaço pertence. */
  ref: UnitRef;
  /** Palavra da letra (efeito por palavra desenhado por letra). */
  word?: UnitRef;
}

interface UnitPlan {
  pieces: Map<PlacedRun, UnitPiece[]>;
  /** 1ª unidade (e palavra) do parágrafo — o marcador acompanha. */
  firstRef(para: number): UnitRef;
  firstWordRef(para: number): UnitRef | undefined;
}

/**
 * Unidades de texto (`<p:iterate>`) com a MESMA contagem do modelo de tempo
 * (read.ts countTextUnits): letras = caracteres não-espaço; palavras = /\S+/
 * no texto do PARÁGRAFO inteiro — uma palavra que cruza runs ("H"+"₂"+"O",
 * negrito parcial) é UMA unidade. Os runs posicionados são localizados no
 * texto original do parágrafo (o layout descarta as quebras `\n`); se não
 * casarem, as linhas contam como separadas.
 */
function planUnits(tb: TextBody, layout: { lines: PlacedLine[] }, type: 'wd' | 'lt', withWords: boolean): UnitPlan {
  const byPara = new Map<number, PlacedRun[]>();
  for (const line of layout.lines) {
    let list = byPara.get(line.para);
    if (!list) byPara.set(line.para, list = []);
    list.push(...line.runs);
  }
  // palavras por parágrafo: deslocamento de cada run no texto + índice da palavra por caractere
  const runOff = new Map<PlacedRun, number>();
  const wordAt = new Map<number, Int32Array>();
  const wordCount = new Map<number, number>();
  for (const [pi, runs] of byPara) {
    const orig = (tb.paragraphs[pi]?.runs ?? []).map((r) => r.text).join('');
    let text = orig, cursor = 0, ok = true;
    const offs: number[] = [];
    for (const r of runs) {
      const idx = orig.indexOf(r.text, cursor);
      if (idx < 0 || /\S/.test(orig.slice(cursor, idx))) { ok = false; break; }
      offs.push(idx);
      cursor = idx + r.text.length;
    }
    if (!ok) { // fallback: texto dos runs posicionados, linhas separadas
      text = ''; offs.length = 0;
      let prevLine: PlacedLine | undefined;
      for (const line of layout.lines) {
        if (line.para !== pi) continue;
        if (prevLine) text += '\n';
        prevLine = line;
        for (const r of line.runs) { offs.push(text.length); text += r.text; }
      }
    }
    runs.forEach((r, i) => runOff.set(r, offs[i] ?? 0));
    const at = new Int32Array(text.length).fill(-1);
    let k = 0;
    for (const m of text.matchAll(/\S+/g)) { at.fill(k, m.index!, m.index! + m[0].length); k++; }
    wordAt.set(pi, at);
    wordCount.set(pi, k);
  }
  const paras = [...byPara.keys()].sort((a, b) => a - b);
  const wordBase = new Map<number, number>();
  let wTotal = 0;
  for (const pi of paras) { wordBase.set(pi, wTotal); wTotal += wordCount.get(pi) ?? 0; }
  const wordRef = (pi: number, kp: number): UnitRef =>
    ({ para: pi, k: (wordBase.get(pi) ?? 0) + kp, count: wTotal, kPara: kp, countPara: wordCount.get(pi) ?? 1 });

  const pieces = new Map<PlacedRun, UnitPiece[]>();
  if (type === 'wd') {
    for (const pi of paras) {
      const at = wordAt.get(pi)!;
      for (const r of byPara.get(pi)!) {
        const off = runOff.get(r) ?? 0;
        const list: UnitPiece[] = [];
        for (const m of r.text.matchAll(/\S+/g)) {
          const kp = Math.max(0, at[off + m.index!] ?? 0);
          list.push({ text: m[0], start: m.index!, ref: wordRef(pi, kp) });
        }
        pieces.set(r, list);
      }
    }
    return {
      pieces,
      firstRef: (pi) => wordRef(pi, 0),
      firstWordRef: () => undefined,
    };
  }
  // letras: contagem por caractere não-espaço (índice global e no parágrafo)
  const perPara = new Map<number, number>();
  const first = new Map<number, number>();
  let total = 0;
  for (const pi of paras) {
    first.set(pi, total);
    for (const r of byPara.get(pi)!) {
      const n = (r.text.match(/\S/g) ?? []).length;
      total += n;
      perPara.set(pi, (perPara.get(pi) ?? 0) + n);
    }
  }
  let k = 0;
  for (const pi of paras) {
    const at = wordAt.get(pi)!;
    let kp = 0;
    for (const r of byPara.get(pi)!) {
      const off = runOff.get(r) ?? 0;
      const list: UnitPiece[] = [];
      for (const m of r.text.matchAll(/\S/g)) {
        const piece: UnitPiece = { text: m[0], start: m.index!, ref: { para: pi, k: k++, count: total, kPara: kp++, countPara: perPara.get(pi) ?? 1 } };
        if (withWords) piece.word = wordRef(pi, Math.max(0, at[off + m.index!] ?? 0));
        list.push(piece);
      }
      pieces.set(r, list);
    }
  }
  return {
    pieces,
    firstRef: (pi) => ({ para: pi, k: first.get(pi) ?? 0, count: total, kPara: 0, countPara: perPara.get(pi) ?? 1 }),
    firstWordRef: (pi) => (withWords ? wordRef(pi, 0) : undefined),
  };
}

/** Font string CSS para uma LayoutFont (pxPerPt converte pt → px). */
function layoutFontStr(f: LayoutFont, pxPerPt: number): string {
  return `${f.italic ? 'italic ' : ''}${f.bold ? '700 ' : '400 '}${f.sizePt * pxPerPt}px ${fontStack(f.family, f.bold, f.italic)}`;
}

/** Avanço (em) de cada caractere por fonte — vale durante UM paintSlideTo (as fontes podem chegar depois). */
const advCache = new Map<string, Map<string, number>>();
/** Escritas em que cada caractere tem largura própria (latim, grego, cirílico, símbolos, CJK). */
const PER_CHAR = /^[\u0000-\u02FF\u0370-\u03FF\u0400-\u04FF\u1E00-\u1FFF\u2000-\u2BFF\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]*$/;
const ADV_REF = 1000;

/**
 * Medidor do layout com as larguras do app de referência (medido, syn-b-e16/e17,
 * 19 fontes, 10–44 pt: erro ≤ 0,02 pt na linha): cada caractere avança a largura
 * da fonte ARREDONDADA a 1/8 pt — sem ligaduras nem formas contextuais — e os
 * pares de kerning só entram quando o run os liga (`kern` ≤ tamanho). Escritas
 * complexas (marcas combinantes, árabe, índicas…) medem a cadeia inteira.
 */
export function pptMeasure(ctx: CanvasRenderingContext2D): MeasureText {
  const kc = ctx as unknown as { fontKerning?: string };
  return (text, f) => {
    if (!PER_CHAR.test(text)) {
      ctx.font = layoutFontStr(f, 1);
      const prevK = kc.fontKerning;
      if (prevK !== undefined) kc.fontKerning = f.kern ? 'normal' : 'none';
      const w = ctx.measureText(text).width;
      if (prevK !== undefined) kc.fontKerning = prevK;
      return w;
    }
    const ref = { ...f, sizePt: ADV_REF };
    const key = layoutFontStr(ref, 1);
    let adv = advCache.get(key);
    if (!adv) { adv = new Map(); advCache.set(key, adv); }
    let fontSet = false;
    const setFont = (): void => { if (!fontSet) { ctx.font = key; fontSet = true; } };
    let sum = 0;
    for (const ch of text) {
      let em = adv.get(ch);
      if (em === undefined) {
        setFont();
        const prevK = kc.fontKerning;
        if (prevK !== undefined) kc.fontKerning = 'none';
        em = ctx.measureText(ch).width / ADV_REF;
        if (prevK !== undefined) kc.fontKerning = prevK;
        adv.set(ch, em);
      }
      sum += Math.round(em * f.sizePt * 8) / 8;
    }
    // kerning: o que os pares tiram/põem na cadeia (sem arredondar — medido)
    if (f.kern && text.length > 1 && kc.fontKerning !== undefined) {
      setFont();
      const prevK = kc.fontKerning;
      kc.fontKerning = 'none';
      const w0 = ctx.measureText(text).width;
      kc.fontKerning = 'normal';
      const w1 = ctx.measureText(text).width;
      kc.fontKerning = prevK;
      sum += ((w1 - w0) / ADV_REF) * f.sizePt;
    }
    return sum;
  };
}

/**
 * Corpo de texto de uma célula como o motor de texto o vê: margens e âncora do
 * tcPr (default do app: 0,1" nas laterais, 0,05" em cima/embaixo, âncora no
 * TOPO) e cor/negrito default do ESTILO da tabela onde o run não define.
 */
function cellBody(cell: Table['rows'][number]['cells'][number]): TextBody {
  const { txColor, txBold, txItalic } = cell;
  return {
    ...cell.txBody!,
    anchor: cell.anchor ?? 't',
    ...(cell.vert ? { vert: cell.vert } : {}),
    insL: cell.marL ?? 91440, insR: cell.marR ?? 91440,
    insT: cell.marT ?? 45720, insB: cell.marB ?? 45720,
    paragraphs: txColor === undefined && txBold === undefined && txItalic === undefined ? cell.txBody!.paragraphs
      : cell.txBody!.paragraphs.map((p) => ({
        ...p,
        runs: p.runs.map((r): Run => {
          const o: Run = { ...r };
          if (o.color === undefined && txColor !== undefined) o.color = txColor;
          if (o.bold === undefined && txBold !== undefined) o.bold = txBold;
          if (o.italic === undefined && txItalic !== undefined) o.italic = txItalic;
          return o;
        }),
      })),
  };
}

/**
 * Renderiza uma tabela `<a:tbl>` a partir de (x, y): colunas do tblGrid, linhas com a
 * altura do XML que CRESCEM até caber o texto. Ordem: sombra, fundo da tabela,
 * preenchimento das células (mescladas = a região toda), grade de bordas, texto.
 * `scale` = px por EMU; `origin` = canto do slide (âncora dos padrões).
 */
function paintTable(ctx: CanvasRenderingContext2D, t: Table, x: number, y: number, w: number, h: number, scale: number, origin: { x: number; y: number }): void {
  // Alturas: se TODAS forem 0 (XML sem atributo h em <a:tr>), distribui
  // igualmente; caso contrário, usa as proporções do XML.
  const allZeroRows = t.rows.every((r) => !r.heightEmu);
  const totalColEmu = t.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const sx = w / totalColEmu;
  // a linha CRESCE até caber o texto da célula mais alta (como o app de
  // referência: a tabela pode passar do quadro); alturas absolutas do XML
  const measure = pptMeasure(ctx);
  const needOf = (cell: TableCell, ci: number): number => {
    const span = cell.gridSpan ?? 1;
    let cwEmu = 0;
    for (let k = ci; k < ci + span; k++) cwEmu += t.colWidthsEmu[k] ?? 0;
    const body = cellBody(cell);
    const lay = layoutTextBody(body, cwEmu, 1e12, measure, { defaultSzPt: DEFAULT_BODY_PT, defaultAnchor: 't' });
    return lay.totalH + (body.insT ?? 0) + (body.insB ?? 0);
  };
  const rowHs = allZeroRows
    ? t.rows.map(() => 1)
    : t.rows.map((r) => {
      let need = Math.max(r.heightEmu, 1);
      r.cells.forEach((cell, ci) => {
        if (cell.hMerge || cell.vMerge || (cell.rowSpan ?? 1) > 1 || !cell.txBody || cell.vert) return;
        need = Math.max(need, needOf(cell, ci));
      });
      return need;
    });
  // célula mesclada na vertical: a ÚLTIMA linha da mescla cresce o que faltar (medido, syn-a-tbl3 #7)
  if (!allZeroRows) {
    t.rows.forEach((r, ri) => r.cells.forEach((cell, ci) => {
      const rs = Math.min(cell.rowSpan ?? 1, t.rows.length - ri);
      if (cell.hMerge || cell.vMerge || rs <= 1 || !cell.txBody || cell.vert) return;
      let have = 0;
      for (let k = ri; k < ri + rs; k++) have += rowHs[k]!;
      const need = needOf(cell, ci);
      if (need > have) rowHs[ri + rs - 1]! += need - have;
    }));
  }
  const totalRowEmu = rowHs.reduce((a, b) => a + b, 0) || 1;
  const sy = allZeroRows ? h / totalRowEmu : scale;
  // posições acumuladas em px
  const colX: number[] = [0];
  for (const cw of t.colWidthsEmu) colX.push(colX[colX.length - 1]! + cw * sx);
  const rowY: number[] = [0];
  for (const rh of rowHs) rowY.push(rowY[rowY.length - 1]! + rh * sy);

  const tw = colX[colX.length - 1]!, th = rowY[rowY.length - 1]!;
  // retângulos das células de ORIGEM (mesclas cobrem as vizinhas)
  const cellsAt: { cell: TableCell; r: number; c: number; x: number; y: number; w: number; h: number }[] = [];
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri]!;
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci]!;
      if (cell.hMerge || cell.vMerge || ci >= colX.length - 1) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x + colX[ci]!, cy0 = y + rowY[ri]!;
      cellsAt.push({ cell, r: ri, c: ci, x: cx0, y: cy0,
        w: (colX[Math.min(ci + span, colX.length - 1)]!) - colX[ci]!, h: (rowY[Math.min(ri + rspan, rowY.length - 1)]!) - rowY[ri]! });
    }
  }
  const cellPaint = (cell: TableCell): TablePaint | undefined =>
    cell.fill ? { fill: { type: 'solid', color: cell.fill }, ...(cell.fillAlpha !== undefined ? { alpha: cell.fillAlpha } : {}) }
      : cell.fillPaint ? { fill: cell.fillPaint } : cell.fillImage ? { image: cell.fillImage, ...(cell.fillTile ? { tile: true } : {}) } : undefined;
  const bgPaint: TablePaint | undefined = t.bgPaint ?? (t.bg ? { fill: { type: 'solid', color: t.bg.color }, ...(t.bg.alpha !== undefined ? { alpha: t.bg.alpha } : {}) } : undefined);

  // sombra da tabela: do que ela PINTA (fundo, células preenchidas e linhas da grade), sem o
  // texto — sem nada disso, sem sombra (medido, syn-a-tbl4 #8–#10 e syn-a-tbl8 #7)
  if (t.shadow) {
    const rects: [number, number, number, number][] = bgPaint ? [[x, y, tw, th]]
      : cellsAt.filter((e) => cellPaint(e.cell)).map((e) => [e.x, e.y, e.w, e.h]);
    if (t.hLines && t.vLines) {
      for (const s of tableLineSegs(t.hLines, t.vLines, colX.map((v) => x + v), rowY.map((v) => y + v), scale)) {
        rects.push(s.vertical ? [s.x1 - s.w / 2, s.y1, s.w, s.y2 - s.y1] : [s.x1, s.y1 - s.w / 2, s.x2 - s.x1, s.w]);
      }
    }
    if (rects.length) paintRectsShadow(ctx, rects, t.shadow, x, y, tw, th, scale);
  }
  // fundo da tabela inteira (tblPr ou tblBg do estilo), atrás das células
  if (bgPaint) paintTablePaint(ctx, bgPaint, x, y, tw, th, x, y, tw, th, scale, origin);
  // preenchimento das células: esticado na célula; ladrilho a partir da ORIGEM DA TABELA
  for (const e of cellsAt) {
    const p = cellPaint(e.cell);
    if (p) paintTablePaint(ctx, p, e.x, e.y, e.w, e.h, x, y, tw, th, scale, origin);
  }
  // bordas: a grade resolvida no read (estilo + explícitas)
  if (t.hLines && t.vLines) paintTableLines(ctx, t.hLines, t.vLines, colX.map((v) => x + v), rowY.map((v) => y + v), scale);

  // texto: o MESMO motor das formas; margens e âncora do tcPr — default do app:
  // 0,1" nas laterais, 0,05" em cima/embaixo, âncora no TOPO
  for (const e of cellsAt) if (e.cell.txBody) paintText(ctx, TABLE_CELL, cellBody(e.cell), e.x, e.y, e.w, e.h, scale);
}

/** Preenchimento de tabela/célula resolvido. */
type TablePaint = NonNullable<Table['bgPaint']>;

/**
 * Pinta um preenchimento no retângulo (rx, ry, rw, rh): sólido, degradê (na célula),
 * padrão (ancorado no slide, como nas formas) ou imagem — esticada na célula e, em
 * ladrilho, a partir da ORIGEM DA TABELA (tx, ty) (medido, syn-a-tbl4 #1/#4/#5 e a
 * conversão do app de poi-119877: as células de uma tabela compartilham o ladrilho).
 */
function paintTablePaint(ctx: CanvasRenderingContext2D, p: TablePaint, rx: number, ry: number, rw: number, rh: number,
  tx: number, ty: number, tw: number, th: number, scale: number, origin: { x: number; y: number }): void {
  if (!(rw > 0) || !(rh > 0)) return;
  ctx.save();
  if (p.alpha !== undefined && p.alpha < 1) ctx.globalAlpha *= p.alpha;
  const f = p.fill;
  if (p.image) {
    const raw = paintImages?.get(p.image.part);
    if (raw) {
      const img = fxImage(raw, p.image.fx);
      if (p.image.fx?.alpha !== undefined) ctx.globalAlpha *= p.image.fx.alpha;
      if (p.tile) {
        const pat = imageTile(ctx, img, p.image, tx, ty, scale, tw, th);
        if (pat) { ctx.fillStyle = pat; ctx.fillRect(rx, ry, rw, rh); }
      } else {
        ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
        const r = insetRect(p.image.fillRect, rx, ry, rw, rh);
        ctx.drawImage(img as CanvasImageSource, r.x, r.y, r.w, r.h);
      }
    }
  } else if (f?.pattern) {
    const pat = presetPattern(ctx, f.pattern, origin.x, origin.y, scale);
    ctx.fillStyle = pat ?? f.color ?? '#000000';
    ctx.fillRect(rx, ry, rw, rh);
  } else if (f?.type === 'gradient' && f.stops && f.stops.length >= 2) {
    ctx.fillStyle = makeLinearGradient(ctx, f, rx, ry, rw, rh);
    ctx.fillRect(rx, ry, rw, rh);
  } else if (f?.type === 'solid' && f.color) {
    ctx.fillStyle = f.color;
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.restore();
}

/** Sombra externa de retângulos (união) — a cópia fica fora da tela e só a sombra volta. */
function paintRectsShadow(ctx: CanvasRenderingContext2D, rects: [number, number, number, number][], sd: NonNullable<Table['shadow']>,
  bx: number, by: number, bw: number, bh: number, scale: number): void {
  const a = sd.dirDeg * Math.PI / 180;
  const K = 20000;
  ctx.save();
  ctx.shadowColor = rgbaOf(sd.color, sd.alpha);
  ctx.shadowBlur = sd.blurRad * scale * SHADOW_BLUR_K;
  const m = ctx.getTransform();
  ctx.shadowOffsetX = sd.dist * Math.cos(a) * scale + m.a * K;
  ctx.shadowOffsetY = sd.dist * Math.sin(a) * scale + m.b * K;
  ctx.translate(-K, 0);
  if (sd.sx !== undefined || sd.sy !== undefined) {
    const al = sd.algn ?? 'b';
    const ax = bx + (al === 'tl' || al === 'l' || al === 'bl' ? 0 : al === 'tr' || al === 'r' || al === 'br' ? bw : bw / 2);
    const ay = by + (/^t/.test(al) ? 0 : /^b/.test(al) ? bh : bh / 2);
    ctx.translate(ax, ay);
    ctx.scale(sd.sx ?? 1, sd.sy ?? 1);
    ctx.translate(-ax, -ay);
  }
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  for (const [rx, ry, rw, rh] of rects) ctx.rect(rx, ry, rw, rh);
  ctx.fill();
  ctx.restore();
}

/** Listras das linhas compostas (frações da espessura, de cima/esquerda) — medido, syn-a-tbl6 #3. */
const CMPD_STRIPES: Record<string, [number, number][]> = {
  dbl: [[0, 1 / 3], [2 / 3, 1]], thickThin: [[0, 0.6], [0.8, 1]], thinThick: [[0, 0.2], [0.4, 1]], tri: [[0, 1 / 6], [1 / 3, 2 / 3], [5 / 6, 1]],
};

/**
 * Grade de bordas da tabela (medido, syn-a-tbl1 #18/#19 e syn-a-tbl6 #1–#3): cada
 * linha CENTRADA na aresta; abaixo de 1,5 px vira 1 px; as verticais primeiro e as
 * horizontais POR CIMA; cada ponta avança meia espessura da linha perpendicular que
 * encontra (junção rente); tracejado por aresta; linha composta em listras.
 */
function paintTableLines(ctx: CanvasRenderingContext2D, hL: (TableLine | null)[][], vL: (TableLine | null)[][], xs: number[], ys: number[], scale: number): void {
  for (const s of tableLineSegs(hL, vL, xs, ys, scale)) strokeTableLine(ctx, s);
}

/** Trecho reto da grade de bordas, já com as pontas avançadas e a espessura em px. */
interface TableLineSeg { l: TableLine; w: number; x1: number; y1: number; x2: number; y2: number; vertical: boolean }

/** Trechos da grade (verticais primeiro, depois horizontais), unindo arestas iguais em sequência. */
function tableLineSegs(hL: (TableLine | null)[][], vL: (TableLine | null)[][], xs: number[], ys: number[], scale: number): TableLineSeg[] {
  const out: TableLineSeg[] = [];
  const nR = ys.length - 1, nC = xs.length - 1;
  const px = (l: TableLine | null | undefined): number => (l ? Math.max(1, l.width * scale < 1.5 ? 1 : l.width * scale) : 0);
  const same = (a: TableLine, b: TableLine | null | undefined): boolean =>
    !!b && a.color === b.color && a.width === b.width && a.alpha === b.alpha && !a.dash && !b.dash && a.cmpd === b.cmpd;
  // meia espessura das linhas que cruzam um nó (r, c)
  const halfH = (r: number, c: number): number => Math.max(px(hL[r]?.[c - 1]), px(hL[r]?.[c])) / 2;
  const halfV = (r: number, c: number): number => Math.max(px(vL[r - 1]?.[c]), px(vL[r]?.[c])) / 2;
  for (let c = 0; c <= nC; c++) {
    for (let r = 0; r < nR;) {
      const l = vL[r]?.[c];
      if (!l) { r++; continue; }
      let r2 = r + 1;
      while (r2 < nR && same(l, vL[r2]?.[c])) r2++;
      out.push({ l, w: px(l), x1: xs[c]!, y1: ys[r]! - halfH(r, c), x2: xs[c]!, y2: ys[r2]! + halfH(r2, c), vertical: true });
      r = r2;
    }
  }
  for (let r = 0; r <= nR; r++) {
    for (let c = 0; c < nC;) {
      const l = hL[r]?.[c];
      if (!l) { c++; continue; }
      let c2 = c + 1;
      while (c2 < nC && same(l, hL[r]?.[c2])) c2++;
      out.push({ l, w: px(l), x1: xs[c]! - halfV(r, c), y1: ys[r]!, x2: xs[c2]! + halfV(r, c2), y2: ys[r]!, vertical: false });
      c = c2;
    }
  }
  return out;
}

/** Um trecho: tracejado e listras (linha composta) com pontas retas. */
function strokeTableLine(ctx: CanvasRenderingContext2D, s: TableLineSeg): void {
  const { l, w, x1, y1, x2, y2, vertical } = s;
  ctx.save();
  ctx.strokeStyle = l.alpha !== undefined ? rgbaOf(l.color, l.alpha) : l.color;
  ctx.lineCap = 'butt';
  const stripes = l.cmpd ? CMPD_STRIPES[l.cmpd] : undefined;
  if (l.dash) ctx.setLineDash(dashPattern(l.dash, w));
  for (const [a, b] of stripes ?? [[0, 1]]) {
    const off = ((a + b) / 2 - 0.5) * w;
    ctx.lineWidth = (b - a) * w;
    ctx.beginPath();
    if (vertical) { ctx.moveTo(x1 + off, y1); ctx.lineTo(x2 + off, y2); }
    else { ctx.moveTo(x1, y1 + off); ctx.lineTo(x2, y2 + off); }
    ctx.stroke();
  }
  ctx.restore();
}

/** Forma "neutra" para o texto de células de tabela (sem sombra, espelho nem placeholder). */
const TABLE_CELL: Shape = { id: '', name: 'tc' };

/**
 * Cria um CanvasGradient linear para um Fill gradient no rect (x,y,w,h).
 * `angleDeg` segue a convenção DrawingML: graus no sentido HORÁRIO a partir do
 * eixo +x (0 = esquerda→direita; 90 = topo→baixo). A reta do gradiente cruza o
 * centro do rect e é dimensionada pela projeção do rect na direção.
 */
function makeLinearGradient(ctx: CanvasRenderingContext2D, fill: Fill, x: number, y: number, w: number, h: number): CanvasGradient {
  // gradiente RADIAL (<a:path>): pos 0 = centro (fillToRect), pos 1 = borda.
  // Aproximação circular do path rect/shape do app de referência.
  if (fill.path) {
    const pat = pathGradient(ctx, fill, x, y, w, h);
    if (pat) return pat as unknown as CanvasGradient;
    const cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    addGradientStops(g, fill.stops ?? [], true);
    return g;
  }
  const ang = (fill.angleDeg ?? 0) * Math.PI / 180;
  let dx = Math.cos(ang), dy = Math.sin(ang);
  // scaled: o ângulo é definido no quadrado unitário; ao esticar para o rect,
  // as ISO-LINHAS transformam como vetores e a direção do gradiente (normal
  // delas) transforma de forma COVARIANTE: (cos·h, sin·w). Verificado contra o
  // app de referência (fundo 45° scaled fica mais íngreme em 16:9, não mais raso).
  if (fill.scaled) {
    dx = Math.cos(ang) * h; dy = Math.sin(ang) * w;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
  }
  const cx = x + w / 2, cy = y + h / 2;
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  addGradientStops(g, fill.stops ?? [], false);
  return g;
}

const pattCache = new Map<string, PaintImage>();

/** Padrão 8×8 (`pattFill`) como CanvasPattern ancorado na origem do slide, 1 px do padrão = 1/96 pol. */
function presetPattern(ctx: CanvasRenderingContext2D, p: NonNullable<Fill['pattern']>, ox: number, oy: number, scale: number): CanvasPattern | null {
  const rows = patternRows(p.prst);
  if (!rows) return null;
  const fa = Math.round((p.fgA ?? 1) * 255), ba = Math.round((p.bgA ?? 1) * 255);
  const key = p.prst + p.fg + p.bg + fa + '/' + ba;
  let img = pattCache.get(key);
  if (!img) {
    const cv = scratchCanvas(8, 8);
    const c2 = cv?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
    if (!cv || !c2) return null;
    const id = c2.createImageData(8, 8);
    const fg = hexRgb(p.fg), bg = hexRgb(p.bg);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const on = (rows[r]! >> (7 - c)) & 1, col = on ? fg : bg, o = (r * 8 + c) * 4;
      id.data[o] = col[0]; id.data[o + 1] = col[1]; id.data[o + 2] = col[2]; id.data[o + 3] = on ? fa : ba;
    }
    c2.putImageData(id, 0, 0);
    img = cv as unknown as PaintImage;
    pattCache.set(key, img);
  }
  const pat = ctx.createPattern(img as CanvasImageSource, 'repeat');
  if (!pat) return null;
  const k = 9525 * scale;
  if (typeof (pat as { setTransform?: unknown }).setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
    pat.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
  }
  return pat;
}

const pathGradCache = new Map<string, PaintImage>();

/**
 * Gradiente de CAMINHO (`<a:path path="circle|rect|shape">` + `fillToRect`),
 * como o app de referência (medido, decks syn-pathinv/syn-gradmode): o
 * retângulo de foco com lado invertido (l + r > 100%) colapsa no l/t;
 * `circle` = o círculo CIRCUNSCRITO à forma (centro da forma, raio = meia
 * diagonal) encolhido em direção ao PONTO central do foco — o anel t é o
 * círculo de centro F + t·(C − F) e raio t·R; `rect`/`shape` = contornos
 * retangulares, t = max(dx, dy) normalizados pela distância do retângulo de
 * foco à borda de cada lado. Rasterizado numa grade pequena (cores suaves) e
 * esticado como padrão.
 */
function pathGradient(ctx: CanvasRenderingContext2D, fill: Fill, x: number, y: number, w: number, h: number): CanvasPattern | null {
  const stops = (fill.stops ?? []).map((s) => ({ pos: Math.max(0, Math.min(1, s.pos)), rgb: hexRgb(s.color), a: s.alpha ?? 1 }));
  if (stops.length < 2 || !(w > 0) || !(h > 0)) return null;
  const ft = fill.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
  // grade de amostragem: proporção do retângulo, lado maior 192
  const k = 192 / Math.max(w, h);
  const gw = Math.max(2, Math.round(w * k)), gh = Math.max(2, Math.round(h * k));
  const key = JSON.stringify([fill.path, ft, gw, gh, fill.stops]);
  let img = pathGradCache.get(key);
  if (!img) {
    const cv = scratchCanvas(gw, gh);
    const c2 = cv?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
    if (!cv || !c2) return null;
    const id = c2.createImageData(gw, gh);
    const fl = ft.l * gw, fT = ft.t * gh;
    const fr = Math.max(fl, gw - ft.r * gw), fb = Math.max(fT, gh - ft.b * gh);
    const circle = fill.path === 'circle';
    // círculo: foco F (ponto), centro C, raio R; |P − F − t(C − F)| = t·R → 2º grau em t
    const Fx = (fl + fr) / 2, Fy = (fT + fb) / 2, Ex = gw / 2 - Fx, Ey = gh / 2 - Fy;
    // menor t ≥ 0 com |D − t·E|² ≤ (t·R)²: a·t² − 2b·t + c ≤ 0 (a < 0 com o foco dentro do
    // círculo; foco FORA (fillToRect além da forma): a > 0, entra no 1º cruzamento ou nunca → fim)
    const R = Math.hypot(gw, gh) / 2, qa = Ex * Ex + Ey * Ey - R * R;
    const tCircle = (px: number, py: number): number => {
      const dx = px - Fx, dy = py - Fy, bq = dx * Ex + dy * Ey, c = dx * dx + dy * dy;
      if (Math.abs(qa) < 1e-9) return bq > 0 ? c / (2 * bq) : 1;
      const disc = bq * bq - qa * c;
      if (disc < 0) return 1;
      return Math.max(0, (bq - Math.sqrt(disc)) / qa);
    };
    const lin = (v: number): number => Math.pow(v / 255, 2.2);
    const srgb = (v: number): number => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
    const mode = gradMode(fill.stops ?? []);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const px = i + 0.5, py = j + 0.5;
      let t: number;
      if (circle) t = tCircle(px, py);
      else {
        const tx = px < fl ? (fl - px) / (fl || 1) : px > fr ? (px - fr) / ((gw - fr) || 1) : 0;
        const ty = py < fT ? (fT - py) / (fT || 1) : py > fb ? (py - fb) / ((gh - fb) || 1) : 0;
        t = Math.max(tx, ty);
      }
      t = Math.max(0, Math.min(1, t));
      let a = stops[0]!, b = stops[stops.length - 1]!;
      for (let s = 0; s + 1 < stops.length; s++) if (t >= stops[s]!.pos && t <= stops[s + 1]!.pos) { a = stops[s]!; b = stops[s + 1]!; break; }
      let u = t <= a.pos ? 0 : t >= b.pos ? 1 : (t - a.pos) / ((b.pos - a.pos) || 1);
      const o = (j * gw + i) * 4;
      // caminho: 2 stops = sigma em luz linear; 3 simétricos = luz linear SEM sigma; resto = sRGB
      if (mode === 'srgb') for (let c = 0; c < 3; c++) id.data[o + c] = a.rgb[c]! * (1 - u) + b.rgb[c]! * u;
      else {
        if (mode === 'sigma') u = sigmaT(u);
        for (let c = 0; c < 3; c++) id.data[o + c] = srgb(lin(a.rgb[c]!) * (1 - u) + lin(b.rgb[c]!) * u);
      }
      id.data[o + 3] = Math.round((a.a * (1 - u) + b.a * u) * 255);
    }
    c2.putImageData(id, 0, 0);
    img = cv as unknown as PaintImage;
    if (pathGradCache.size > 64) pathGradCache.clear();
    pathGradCache.set(key, img);
  }
  const pat = ctx.createPattern(img as CanvasImageSource, 'no-repeat');
  if (!pat) return null;
  if (typeof (pat as { setTransform?: unknown }).setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
    pat.setTransform(new DOMMatrix([w / gw, 0, 0, h / gh, x, y]));
  }
  return pat;
}

/**
 * Como o PowerPoint interpola um degradê (medido, decks syn-gradmode*): ele
 * reconstrói o preenchimento "de 2 cores" do formato binário quando dá —
 *  - 2 stops em 0 e 100%: luz LINEAR (γ 2,2) com curva SIGMA (normal, σ = 0,25);
 *  - 3 stops com as pontas iguais (0/100%) — o "foco" do .ppt: linear → sigma
 *    em cada metade; caminho (path) → luz linear sem sigma;
 *  - o resto (stops em outras posições, 4+, pontas diferentes): sRGB direto.
 */
type GradMode = 'sigma' | 'sym' | 'srgb';
function gradMode(stops: readonly { pos: number; color: string; alpha?: number }[]): GradMode {
  const n = stops.length;
  if (n < 2 || stops[0]!.pos > 0 || stops[n - 1]!.pos < 1) return 'srgb';
  if (n === 2) return 'sigma';
  if (n === 3 && stops[0]!.color.toLowerCase() === stops[2]!.color.toLowerCase() && (stops[0]!.alpha ?? 1) === (stops[2]!.alpha ?? 1)) return 'sym';
  return 'srgb';
}

/** Φ (CDF normal) — aproximação de Abramowitz-Stegun via erf. */
function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}
const SIGMA0 = normCdf(-2);
/** Curva sigma do degradê de 2 cores (σ = 0,25, normalizada para 0..1). */
function sigmaT(u: number): number {
  return (normCdf((u - 0.5) / 0.25) - SIGMA0) / (1 - 2 * SIGMA0);
}

/**
 * Adiciona os stops ao CanvasGradient conforme o modo do PowerPoint: sRGB
 * direto (o próprio canvas) ou SUBSTOPS em luz linear, com a curva sigma.
 */
function addGradientStops(g: CanvasGradient, rawStops: { pos: number; color: string; alpha?: number }[], path: boolean): void {
  const stops = rawStops.map((s) => ({
    pos: Math.max(0, Math.min(1, s.pos)), color: s.color, alpha: s.alpha ?? 1,
  }));
  const mode = gradMode(rawStops);
  const sig = mode === 'sigma' || (mode === 'sym' && !path);
  const rgba = (hex: string, a: number): string => {
    if (a >= 1) return hex;
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  };
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    g.addColorStop(s.pos, rgba(s.color, s.alpha));
    const nx = stops[i + 1];
    if (mode === 'srgb' || !nx || nx.pos - s.pos < 0.05) continue;
    const N = sig ? 24 : 8;
    for (let k = 1; k < N; k++) {
      const f = k / N, t = sig ? sigmaT(f) : f;
      const a = s.alpha + (nx.alpha - s.alpha) * t;
      g.addColorStop(s.pos + (nx.pos - s.pos) * f, rgba(mixLinearRgb(s.color, nx.color, t), a));
    }
  }
}

/** Mistura duas cores #RRGGBB em espaço RGB linear (gamma 2.2 aproximado). */
function mixLinearRgb(c1: string, c2: string, f: number): string {
  const p = (h: string): [number, number, number] => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(c1);
  const [r2, g2, b2] = p(c2);
  const lin = (v: number): number => Math.pow(v / 255, 2.2);
  const srgb = (v: number): number => Math.round(Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255);
  const mix = (a: number, b: number): number => srgb(lin(a) * (1 - f) + lin(b) * f);
  const hx = (v: number): string => v.toString(16).padStart(2, '0');
  return '#' + hx(mix(r1, r2)) + hx(mix(g1, g2)) + hx(mix(b1, b2));
}

/**
 * Tabela de prstDash → padrão LineDash do canvas, em múltiplos da espessura.
 * Valores MEDIDOS no app de referência (tools/ppt-lab/measure-dash.mjs sobre o
 * PNG exportado; linhas de 2pt, compensação de ~1.5px de antialiasing por
 * borda): dot 1.5/3, dash 5/3, dashDot 5/3/1.5/3, lgDash 9.5/3,
 * lgDashDot 9.5/3/1.5/3, sysDashDotDot 3.8/0.7/1.5/0.7/1.5/0.7.
 */
function dashPattern(prstDash: string, lw: number): number[] {
  switch (prstDash) {
    case 'dash': return [5 * lw, 3 * lw];
    case 'lgDash': return [9.5 * lw, 3 * lw];
    case 'dashDot': return [5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'lgDashDot': return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'lgDashDotDot': return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'dot': return [1.5 * lw, 3 * lw];
    case 'sysDot': return [1.5 * lw, 1 * lw];
    case 'sysDash': return [3 * lw, 1 * lw];
    case 'sysDashDot': return [3 * lw, 1 * lw, 1.5 * lw, 1 * lw];
    case 'sysDashDotDot': return [3.8 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw];
    default: return [];
  }
}
