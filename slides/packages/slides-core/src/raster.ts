/**
 * Imagens que o navegador NÃO decodifica (WMF/EMF, PICT, TIFF) → canvas, de forma
 * síncrona. Ponto único usado pelo viewer e pelo export.
 */
import { rasterizeMetafile } from './metafile.js';
import { isTiff, decodeTiff } from './tiff.js';
import { isPict, rasterizePict } from './pict.js';

type CanvasLike = { getContext(id: '2d'): unknown; width: number; height: number };

export function rasterizeSpecialImage<C extends CanvasLike>(bytes: Uint8Array, makeCanvas: (w: number, h: number) => C | undefined): C | undefined {
  const meta = rasterizeMetafile(bytes, makeCanvas);
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
