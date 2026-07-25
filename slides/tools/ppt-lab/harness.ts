// Entry do harness de comparação (bundled por render-deck.mjs via esbuild).
// Expõe window.harness com loadDeck/paintSlide para o Playwright dirigir.
import '../../packages/viewer/src/universal-presentation-viewer';
import type { UniversalPresentationViewerElement } from '../../packages/viewer/src/universal-presentation-viewer';

const pv = document.getElementById('pv') as UniversalPresentationViewerElement;
const cv = document.getElementById('cv') as HTMLCanvasElement;

declare global {
  interface Window {
    harness: {
      loadDeck(url: string): Promise<number>;
      paintSlide(i: number, pxWidth: number): boolean;
      pendingImages(): number;
    };
  }
}

window.harness = {
  /** Carrega o deck e resolve com o número de slides. */
  async loadDeck(url: string): Promise<number> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    pv.loadPptx(new Uint8Array(await res.arrayBuffer()));
    return pv.getSlideCount();
  },
  /** Pinta o slide i no canvas visível em tamanho exato. */
  paintSlide(i: number, pxWidth: number): boolean {
    return pv.renderSlideToCanvas(i, cv, pxWidth);
  },
  /** Quantas imagens do deck ainda não decodificaram (0 = pronto p/ capturar). */
  pendingImages(): number {
    // acessa o cache protegido via cast — só para o harness saber quando capturar
    const cache = (pv as unknown as { imageCache: Map<string, { ready: boolean }> }).imageCache;
    let n = 0;
    for (const e of cache.values()) if (!e.ready) n++;
    return n;
  },
};
