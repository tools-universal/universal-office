// Entry do harness de REPRODUÇÃO AUTOMÁTICA (bundled por capture-ours.mjs).
// Expõe window.pb para o Playwright: carregar o deck, iniciar play() e pintar
// sob relógio virtual (page.clock) — cada quadro é função pura do tempo.
import '../../../packages/viewer/src/universal-presentation-viewer';
import type { UniversalPresentationViewerElement } from '../../../packages/viewer/src/universal-presentation-viewer';
import { playbackStateAt, type PlaybackTimeline } from '@universal/slides-core';

const pv = document.getElementById('pv') as UniversalPresentationViewerElement;

declare global {
  interface Window {
    pb: {
      load(url: string): Promise<{ ok: boolean; count?: number; error?: string }>;
      pendingImages(): number;
      fontsReady(): Promise<boolean>;
      setSize(w: number, h: number): void;
      start(opts: { defaultSlideMs: number; useTimings?: boolean; tickMs?: number; transitionFps?: number; media?: 'realtime' | 'seek' }): unknown;
      paint(): void;
      /** O deck tem vídeo/áudio/GIF (precisa de `media()` antes de cada quadro). */
      hasMedia(): boolean;
      /** Posiciona as mídias do quadro atual (busca exata); devolve a assinatura delas. */
      media(): Promise<string>;
      signature(): string;
      time(): number | null;
      slideIndex(): number;
    };
  }
}

/** Timeline serializável (sem as referências aos nós da árvore). */
function plain(tl: PlaybackTimeline): unknown {
  return {
    durationMs: tl.durationMs,
    slides: tl.slides.map((s) => ({
      index: s.index, startMs: s.startMs, transitionMs: s.transitionMs, animStartMs: s.animStartMs,
      stepStartMs: s.stepStartMs, endMs: s.endMs,
      transition: s.transition,
      effects: s.effects.map((e) => ({
        presetClass: e.presetClass, presetId: e.presetId, presetSubtype: e.presetSubtype,
        target: e.target, t0: e.t0, durMs: Number.isFinite(e.durMs) ? e.durMs : null,
        step: e.step, filter: e.filter, fill: e.fill, motion: e.motion,
      })),
    })),
  };
}

window.pb = {
  async load(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: `fetch ${res.status}` };
      pv.loadPptx(new Uint8Array(await res.arrayBuffer()));
      return { ok: true, count: pv.getSlideCount() };
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e) };
    }
  },
  pendingImages() {
    const cache = (pv as unknown as { imageCache: Map<string, { ready: boolean }> }).imageCache;
    let n = 0;
    for (const e of cache.values()) if (!e.ready) n++;
    return n;
  },
  async fontsReady() {
    // fontes EMBUTIDAS do deck (decodificadas depois da 1ª pintura)
    await pv.fontsReady();
    // @font-face é preguiçoso: força o carregamento de TODAS as faces antes
    // de tocar (senão o 1º quadro com texto sai com a fonte de fallback)
    const faces: FontFace[] = [];
    document.fonts.forEach((f) => { faces.push(f); });
    await Promise.allSettled(faces.map((f) => f.load()));
    await document.fonts.ready;
    return faces.every((f) => f.status === 'loaded');
  },
  setSize(w, h) {
    pv.style.width = `${w}px`;
    pv.style.height = `${h}px`;
  },
  start(opts) {
    return plain(pv.play(opts));
  },
  paint() {
    (pv as unknown as { paint(): void }).paint();
  },
  hasMedia() {
    const slides = (pv as unknown as { slides: { shapes: { media?: unknown; image?: { mime: string } }[] }[] }).slides;
    return slides.some((s) => s.shapes.some((sh) => sh.media || sh.image?.mime === 'image/gif'));
  },
  media() {
    return pv.syncMedia();
  },
  /** Assinatura do estado visual no instante atual — quadros iguais => mesma assinatura. */
  signature() {
    const tl = pv.getPlaybackTimeline();
    const t = pv.getPlaybackTime();
    if (!tl || t === null) return 'idle';
    const st = playbackStateAt(tl, t);
    if (!st.slide) return 'empty';
    const parts: string[] = [String(st.pos)];
    if (st.transitionProgress < 1) parts.push(`tr${st.transitionProgress.toFixed(6)}`);
    for (const e of st.slide.effects) {
      const a = st.animMs;
      parts.push(a < e.t0 ? '0' : a < e.t0 + e.durMs ? `a${(a - e.t0).toFixed(2)}` : '1');
    }
    return parts.join('|');
  },
  time() { return pv.getPlaybackTime(); },
  slideIndex() { return pv.getSlideIndex(); },
};
