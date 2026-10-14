/**
 * Imagens que o navegador NÃO decodifica (WMF/EMF, PICT, TIFF) → canvas, de forma
 * síncrona. Ponto único usado pelo viewer e pelo export.
 */
import { rasterizeMetafile, metafileNeedsPrepare, prepareMetafile } from './metafile.js';
import { isTiff, decodeTiff } from './tiff.js';
import { isPict, rasterizePict } from './pict.js';

type CanvasLike = { getContext(id: '2d'): unknown; width: number; height: number };

/** A imagem precisa de uma etapa assíncrona antes do raster síncrono (bitmap comprimido dentro de EMF+). */
export function specialImageNeedsPrepare(bytes: Uint8Array): boolean { return metafileNeedsPrepare(bytes); }
/** Etapa assíncrona antes de `rasterizeSpecialImage` (decodifica PNG/JPEG embutidos no EMF+). */
export async function prepareSpecialImage(bytes: Uint8Array): Promise<void> { await prepareMetafile(bytes); }

/** `display`: tamanho (px a 96 dpi) da imagem inteira no slide — metarquivos rasterizam nessa escala. */
export function rasterizeSpecialImage<C extends CanvasLike>(bytes: Uint8Array, makeCanvas: (w: number, h: number) => C | undefined, display?: { w: number; h: number }): C | undefined {
  const meta = rasterizeMetafile(bytes, makeCanvas, display ? { display } : {});
  if (meta) return meta;
  if (isPict(bytes)) return rasterizePict(bytes, makeCanvas);
  if (isTiff(bytes)) {
    let img: ReturnType<typeof decodeTiff>;
    try { img = decodeTiff(bytes); } catch { img = undefined; }
    if (!img) return undefined;
    const cv = makeCanvas(img.width, img.height);
    const ctx = cv?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
    if (!cv || !ctx) return undefined;
    const id = ctx.createImageData(img.width, img.height);
    id.data.set(img.data);
    ctx.putImageData(id, 0, 0);
    return cv;
  }
  return undefined;
}
