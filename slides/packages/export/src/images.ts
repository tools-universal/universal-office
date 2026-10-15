/**
 * Export de imagens: 1 PNG por slide, reusando o pipeline de paint do
 * webcomponent — a função PURA `paintSlideTo` do slides-core (spec 05).
 *
 * Browser: usa OffscreenCanvas (ou <canvas> do document) e createImageBitmap
 * para decodificar as imagens do deck. Node: SEM dependência nativa — o
 * chamador injeta `opts.canvas` com uma factory `(w, h) => CanvasLike`
 * (ex.: `createCanvas` do @napi-rs/canvas); sem factory e sem DOM o erro é
 * claro e orienta. Decodificação de imagem também é injetável
 * (`opts.decodeImage`) — sem ela em node, shapes de imagem ficam em branco.
 */
import {
  paintSlideTo, EMU_PER_PX, rasterizeSpecialImage, prepareSpecialImage, tableImages,
  type Slide, type ImageRef, type PaintImage, type ChartModel,
} from '@universal/slides-core';
import { loadDeck } from './model.js';

/**
 * Canvas mínimo que o export precisa: contexto 2d + UM método de encode PNG.
 * Cobre OffscreenCanvas (convertToBlob), HTMLCanvasElement (toBlob) e os
 * canvases node (@napi-rs/canvas `toBuffer` / skia-canvas `encode`).
 */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): unknown;
  convertToBlob?(opts?: { type?: string }): Promise<Blob>;
  toBlob?(callback: (blob: Blob | null) => void, type?: string): void;
  toBuffer?(mime?: string): Uint8Array;
  encode?(format: string): Promise<Uint8Array> | Uint8Array;
}

/** Factory de canvas injetável (obrigatória em node). */
export type CanvasFactory = (width: number, height: number) => CanvasLike;

/**
 * Decodificador de imagem injetável (default: createImageBitmap no browser).
 * `display` = tamanho (px de saída) da imagem inteira no slide, quando conhecido —
 * metarquivos rasterizam nessa escala (traço mínimo de 1 px, como o app).
 */
export type ImageDecoder = (ref: ImageRef, display?: { w: number; h: number }) => Promise<PaintImage | null>;

export interface SlidesImagesOptions {
  /** Multiplicador sobre a resolução base de 96dpi (1 = 96dpi; 2 = 192dpi). */
  scale?: number;
  /** Formato de saída — v1 só PNG. */
  mime?: 'image/png';
  /** Factory de canvas (obrigatória fora do browser). */
  canvas?: CanvasFactory;
  /** Decodificador das imagens do deck (default: createImageBitmap). */
  decodeImage?: ImageDecoder;
}

/** Resolve a factory de canvas: injetada > OffscreenCanvas > document.createElement. */
function resolveFactory(opts: SlidesImagesOptions): CanvasFactory {
  if (opts.canvas) return opts.canvas;
  const g = globalThis as {
    OffscreenCanvas?: new (w: number, h: number) => CanvasLike;
    document?: { createElement(tag: 'canvas'): CanvasLike & { width: number; height: number } };
  };
  if (typeof g.OffscreenCanvas === 'function') {
    return (w, h) => new g.OffscreenCanvas!(w, h);
  }
  if (g.document && typeof g.document.createElement === 'function') {
    return (w, h) => {
      const c = g.document!.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    };
  }
  throw new Error(
    'pptxToImages: nenhum canvas disponível neste ambiente. Em node, passe ' +
    'opts.canvas com uma factory (w, h) => canvas — ex.: com @napi-rs/canvas, ' +
    '`{ canvas: (w, h) => createCanvas(w, h) }`. (O pacote não embute dependência nativa.)',
  );
}

/** Decoder default: createImageBitmap(Blob) quando existir; senão null (pula imagens). */
function defaultDecoder(): ImageDecoder {
  const g = globalThis as { createImageBitmap?: (b: Blob) => Promise<ImageBitmap>; Blob?: typeof Blob };
  if (typeof g.createImageBitmap === 'function' && typeof g.Blob === 'function') {
    return async (ref, display) => {
      // WMF/EMF e TIFF: rasteriza num OffscreenCanvas (o navegador não decodifica);
      // EMF+ com PNG/JPEG embutido decodifica antes
      if (typeof OffscreenCanvas !== 'undefined') {
        await prepareSpecialImage(ref.bytes).catch(() => undefined);
        const meta = rasterizeSpecialImage(ref.bytes, (w, h) => new OffscreenCanvas(w, h), display);
        if (meta) return meta as unknown as PaintImage;
      }
      try {
        const blob = new g.Blob!([new Uint8Array(ref.bytes)], { type: ref.mime });
        return await g.createImageBitmap!(blob);
      } catch { return null; }
    };
  }
  return async () => null;
}

/** Bytes PNG de um CanvasLike, tentando os encoders conhecidos. */
async function encodePng(canvas: CanvasLike): Promise<Uint8Array> {
  if (typeof canvas.convertToBlob === 'function') {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  }
  if (typeof canvas.toBuffer === 'function') {
    return new Uint8Array(canvas.toBuffer('image/png'));
  }
  if (typeof canvas.encode === 'function') {
    return new Uint8Array(await canvas.encode('png'));
  }
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob!(resolve, 'image/png'));
    if (blob) return new Uint8Array(await blob.arrayBuffer());
  }
  throw new Error(
    'pptxToImages: o canvas injetado não expõe encoder PNG conhecido ' +
    '(convertToBlob/toBlob/toBuffer/encode).',
  );
}

/**
 * Coleta as ImageRef únicas (por part) de todos os slides; `sizes` recebe o
 * tamanho (px a 96 dpi) da imagem INTEIRA de cada p:pic (o recorte a amplia).
 */
function collectImageRefs(slides: Slide[], sizes?: Map<string, { w: number; h: number }>): Map<string, ImageRef> {
  const map = new Map<string, ImageRef>();
  for (const s of slides) {
    if (s.bgImage) map.set(s.bgImage.part, s.bgImage);
    for (const sh of s.shapes) {
      if (sh.image) map.set(sh.image.part, sh.image);
      if (sh.image && sizes && sh.xfrm && sh.xfrm.cx > 0 && sh.xfrm.cy > 0 && !sizes.has(sh.image.part)) {
        const c = sh.srcRect;
        const fw = c ? Math.max(0.05, 1 - c.l - c.r) : 1, fh = c ? Math.max(0.05, 1 - c.t - c.b) : 1;
        sizes.set(sh.image.part, { w: sh.xfrm.cx / EMU_PER_PX / fw, h: sh.xfrm.cy / EMU_PER_PX / fh });
      }
      if (sh.fillImage) map.set(sh.fillImage.part, sh.fillImage);
      if (sh.table) for (const r of tableImages(sh.table)) map.set(r.part, r);
      for (const r of Object.values(sh.chartImages ?? {})) map.set(r.part, r);
      for (const p of sh.txBody?.paragraphs ?? []) {
        if (p.bulletImage) map.set(p.bulletImage.part, p.bulletImage);
        for (const r of p.runs) if (r.fillImage) map.set(r.fillImage.part, r.fillImage);
      }
    }
  }
  return map;
}

/**
 * Renderiza cada slide num canvas offscreen e devolve os bytes PNG
 * (`Promise<Uint8Array[]>` — 1 item por slide, na ordem da apresentação).
 */
export async function pptxToImages(bytes: Uint8Array, opts: SlidesImagesOptions = {}): Promise<Uint8Array[]> {
  const factory = resolveFactory(opts);
  const deck = loadDeck(bytes);
  const scale = opts.scale ?? 1;

  // decodifica todas as imagens do deck em paralelo (cache por part)
  const decode = opts.decodeImage ?? defaultDecoder();
  const sizes = new Map<string, { w: number; h: number }>();
  const refs = collectImageRefs(deck.slides.map((d) => d.slide), sizes);
  const images = new Map<string, PaintImage>();
  await Promise.all([...refs.values()].map(async (ref) => {
    const sz = sizes.get(ref.part);
    const img = await decode(ref, sz ? { w: sz.w * scale, h: sz.h * scale } : undefined);
    if (img) images.set(ref.part, img);
  }));

  const wPx = Math.max(1, Math.round(deck.pres.slideW / EMU_PER_PX * scale));
  const hPx = Math.max(1, Math.round(deck.pres.slideH / EMU_PER_PX * scale));
  const out: Uint8Array[] = [];
  const charts = new Map<string, ChartModel>();
  for (const ds of deck.slides) {
    const canvas = factory(wPx, hPx);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('pptxToImages: canvas.getContext("2d") devolveu null');
    paintSlideTo(ctx, ds.slide, {
      slideW: deck.pres.slideW, slideH: deck.pres.slideH,
      images, charts,
    }, wPx / deck.pres.slideW);
    out.push(await encodePng(canvas));
  }
  return out;
}
