import {
  mediaStateAt, mediaFadeAlpha, gifFrameAt,
  type Slide, type Shape, type PaintImage, type PlaybackSlide, type MediaClock, type SlideMediaInfo,
} from '@universal-office/slides-core';

/** Quadro de mídia com opacidade (esmaecer sobre a capa). */
export type MediaFrame = PaintImage | { image: PaintImage; alpha: number };

/** GIF animado decodificado: quadros + atraso de cada um (ms) + repetições. */
interface GifAnim {
  frames: ImageBitmap[];
  delays: number[];
  repeat: number;
}

/** Subconjunto do WebCodecs `ImageDecoder` (nem toda lib.dom traz os tipos). */
interface ImageDecoderLike {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number; repetitionCount: number } | null };
  decode(o: { frameIndex: number }): Promise<{ image: CanvasImageSource & { duration: number | null; close(): void } }>;
  close(): void;
}
type ImageDecoderCtor = new (init: { data: Uint8Array | ReadableStream; type: string }) => ImageDecoderLike;

/** Posição desejada de um elemento de mídia no quadro em curso. */
interface Wanted { time: number; playing: boolean; volume: number; muted: boolean }

/**
 * MÍDIA da reprodução automática (`play()`): vídeo/áudio embutidos e GIF
 * animado. O ESTADO desejado vem das funções puras de slides-core/media.ts
 * (comandos playFrom/pause… na árvore de tempo); aqui ficam os elementos.
 *
 * Dois modos:
 *  - `realtime`: os elementos tocam sozinhos e só são corrigidos quando
 *    escorregam do relógio da apresentação (apresentação de verdade, com som);
 *  - `seek`: nada toca — antes de cada quadro, `seekAll()` posiciona cada
 *    vídeo no instante exato e espera o quadro (captura determinística do lab).
 */
export class MediaPlayer {
  mode: 'realtime' | 'seek' = 'realtime';
  private els = new Map<string, HTMLMediaElement>();
  private urls: string[] = [];
  private gifs = new Map<string, GifAnim | null>();
  private gifJobs = new Map<string, Promise<void>>();
  /** Posições pedidas no último quadro pintado (elemento → estado). */
  private wanted = new Map<HTMLMediaElement, Wanted>();
  /** Quadros de GIF mostrados no último quadro (parte → índice). */
  private gifShown = new Map<string, number>();
  /** Relógio da mídia (export emulado: 2 ticks de latência, 1/30 s por quadro). */
  clock: MediaClock = {};
  /** Vídeo em TELA CHEIA tocando no quadro em curso (a pintura cobre o slide com ele). */
  fullScreen: HTMLVideoElement | null = null;

  constructor(private readonly repaint: () => void) {}

  /** Chave do elemento de uma forma com mídia. */
  private key(sh: Shape): string | undefined {
    return sh.media ? (sh.media.part ?? sh.media.url) : undefined;
  }

  /** Elemento (criado sob demanda) da mídia da forma. */
  element(sh: Shape, bytes: (part: string) => Uint8Array | undefined): HTMLMediaElement | null {
    const k = this.key(sh);
    if (!k || !sh.media) return null;
    let el = this.els.get(k);
    if (el) return el;
    let src: string | undefined;
    if (sh.media.part) {
      const b = bytes(sh.media.part);
      if (!b) return null;
      src = URL.createObjectURL(new Blob([new Uint8Array(b)], { type: sh.media.mime }));
      this.urls.push(src);
    } else src = sh.media.url;
    if (!src) return null;
    el = document.createElement(sh.media.kind === 'audio' ? 'audio' : 'video');
    el.preload = 'auto';
    el.muted = this.mode === 'seek';
    (el as HTMLVideoElement).playsInline = true;
    el.addEventListener('loadeddata', () => this.repaint());
    el.src = src;
    this.els.set(k, el);
    return el;
  }

  /** Geração do deck: decodificação que termina depois de `dispose()` é de outro deck. */
  private gen = 0;

  /** Decodifica (uma vez) os GIFs animados do slide; repinta quando prontos. */
  warmGifs(slide: Slide): void {
    const gen = this.gen;
    for (const sh of slide.shapes) {
      const img = sh.image;
      if (!img || img.mime !== 'image/gif' || this.gifs.has(img.part) || this.gifJobs.has(img.part)) continue;
      this.gifJobs.set(img.part, this.decodeGif(img.part, img.bytes).then((g) => {
        // deck trocado no meio: não entra no cache (o mesmo nome de parte do deck
        // novo pintaria os quadros do antigo) e os quadros são liberados
        if (gen !== this.gen) { g?.frames.forEach((f) => f.close()); return; }
        this.gifs.set(img.part, g);
        this.gifJobs.delete(img.part);
        if (g) this.repaint();
      }));
    }
  }

  private async decodeGif(part: string, bytes: Uint8Array): Promise<GifAnim | null> {
    const Ctor = (globalThis as unknown as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
    if (!Ctor) return null; // sem WebCodecs: fica a imagem estática (1º quadro)
    try {
      const dec = new Ctor({ data: new Uint8Array(bytes), type: 'image/gif' });
      await dec.tracks.ready;
      const tr = dec.tracks.selectedTrack;
      if (!tr || tr.frameCount <= 1) { dec.close(); return null; }
      const frames: ImageBitmap[] = [], delays: number[] = [];
      for (let i = 0; i < tr.frameCount; i++) {
        const { image } = await dec.decode({ frameIndex: i });
        delays.push((image.duration ?? 0) / 1000); // µs → ms
        frames.push(await createImageBitmap(image));
        image.close();
      }
      const repeat = Number.isFinite(tr.repetitionCount) ? tr.repetitionCount : Infinity;
      dec.close();
      void part;
      return { frames, delays, repeat };
    } catch {
      return null;
    }
  }

  /**
   * Quadro a pintar no lugar da imagem da forma: vídeo em curso (ou parado
   * no último quadro) / quadro atual do GIF. null = imagem normal (capa).
   * `animMs` = tempo de animação do slide (Infinity = estado final).
   */
  frame(sh: Shape, ps: PlaybackSlide, animMs: number, bytes: (part: string) => Uint8Array | undefined, info?: SlideMediaInfo): MediaFrame | null {
    if (sh.media) {
      const st = mediaStateAt(ps.effects, sh.id, animMs, this.clock, !!info?.loop);
      const el = this.element(sh, bytes);
      if (!el || el.error) return null; // inacessível (vinculado fora do pacote…): fica a capa
      // corte (p14:trim): toca de `st` até duração − `end` do arquivo
      const trimSt = (sh.media.trim?.startMs ?? 0) / 1000;
      const trimEnd = (sh.media.trim?.endMs ?? 0) / 1000;
      const fileDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : undefined;
      const lenSec = fileDur !== undefined ? Math.max(0, fileDur - trimSt - trimEnd) : (st.durMs ?? Infinity) / 1000;
      let t = st.timeSec;
      // "repetir até parar": o app repete ao vivo; o export de vídeo NÃO repete (medido) — toca até o fim do arquivo
      if (info?.loop && this.mode === 'realtime' && lenSec > 0 && Number.isFinite(lenSec)) t %= lenSec;
      const played = Math.max(0, Math.min(t, Math.max(0, lenSec - 0.001)));
      if (st.started) {
        this.wanted.set(el, {
          time: trimSt + played, playing: st.playing && t < lenSec,
          volume: info?.vol ?? 1, muted: info?.mute ?? false,
        });
      }
      if (sh.media.kind !== 'video' || !st.started) return null;
      if (st.ended && info?.rewind) return null; // retroceder: volta à capa ao terminar
      if (el.readyState < 2) return null;
      const video = el as HTMLVideoElement;
      if (info?.fullScreen && st.playing) this.fullScreen = video;
      // esmaecer: o vídeo surge/some SOBRE a capa (depois do fim fica a capa)
      const alpha = st.ended && sh.media.fade?.outMs ? 0 : mediaFadeAlpha(sh.media.fade, played * 1000, lenSec * 1000);
      if (alpha <= 0) return null;
      return alpha >= 1 ? video : { image: video, alpha };
    }
    const img = sh.image;
    if (img?.mime === 'image/gif') {
      const g = this.gifs.get(img.part);
      if (!g) return null;
      // o GIF anda desde o INÍCIO DAS ANIMAÇÕES do slide (medido; na transição, 1º quadro)
      const t = Number.isFinite(animMs) ? animMs : ps.endMs - ps.animStartMs;
      const elapsed = Math.max(0, t) * (this.clock.scale ?? 1);
      const i = gifFrameAt(g.delays, elapsed, g.repeat);
      this.gifShown.set(img.part, i);
      return g.frames[i] ?? null;
    }
    return null;
  }

  /** `play()` em andamento (a promessa ainda não resolveu): não buscar de novo a cada quadro. */
  private starting = new WeakSet<HTMLMediaElement>();
  /** Autoplay recusado (sem gesto do usuário): tentou mudo; se nem assim, fica parado. */
  private forcedMute = new WeakSet<HTMLMediaElement>();
  private blocked = new WeakSet<HTMLMediaElement>();

  private start(el: HTMLMediaElement, time: number): void {
    el.currentTime = time;
    this.starting.add(el);
    el.play().then(() => this.starting.delete(el), (err: unknown) => {
      this.starting.delete(el);
      // política de autoplay: o navegador aceita mídia MUDA — tenta assim uma vez
      if ((err as { name?: string })?.name === 'NotAllowedError' && !this.forcedMute.has(el)) {
        this.forcedMute.add(el);
        el.muted = true;
        this.starting.add(el);
        el.play().then(() => this.starting.delete(el), () => { this.starting.delete(el); this.blocked.add(el); });
      } else this.blocked.add(el);
    });
  }

  /** Modo tempo real: toca/pausa/corrige os elementos conforme o último quadro. */
  syncRealtime(): void {
    for (const [, el] of this.els) {
      const w = this.wanted.get(el);
      if (!w) { if (!el.paused) el.pause(); continue; }
      el.volume = Math.max(0, Math.min(1, w.volume));
      el.muted = w.muted || this.forcedMute.has(el);
      if (w.playing) {
        if (this.starting.has(el)) continue; // aguardando o play(): sem busca a cada quadro
        if (this.blocked.has(el)) {
          // recusado de vez: fica parado mostrando o quadro do instante (sem buscar a cada quadro)
          if (Math.abs(el.currentTime - w.time) > 0.3) el.currentTime = w.time;
          continue;
        }
        if (el.paused) this.start(el, w.time);
        else if (Math.abs(el.currentTime - w.time) > 0.3) el.currentTime = w.time;
      } else {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - w.time) > 0.05) el.currentTime = w.time;
      }
    }
    this.wanted.clear();
  }

  /** Esquece as posições pedidas (antes de recalcular um quadro). */
  resetWanted(): void { this.wanted.clear(); this.gifShown.clear(); }

  /** Assinatura das posições do último quadro (vídeo em ms, quadro de GIF). */
  signature(): string {
    const parts: string[] = [];
    for (const [el, w] of this.wanted) parts.push(`${el.currentSrc.slice(-12)}@${Math.round(w.time * 1000)}`);
    for (const [k, i] of this.gifShown) parts.push(`${k}#${i}`);
    return parts.join('|');
  }

  /** A mídia da forma está tocando em `animMs`? */
  isPlaying(sh: Shape, ps: PlaybackSlide, animMs: number, loop = false): boolean {
    return mediaStateAt(ps.effects, sh.id, animMs, this.clock, loop).playing;
  }

  /**
   * Modo busca: posiciona cada vídeo pedido no instante exato e espera o
   * quadro decodificado (+ GIFs pendentes). Chamar após um quadro "seco"
   * (que registra as posições) e antes do quadro definitivo.
   */
  async seekAll(timeoutMs = 3000): Promise<void> {
    const jobs: Promise<void>[] = [...this.gifJobs.values()];
    for (const [el, w] of this.wanted) {
      if (!(el instanceof HTMLVideoElement)) continue;
      // meio do quadro (+1/60 s): instantes exatos k/30 caem na FRONTEIRA entre
      // quadros e a busca devolve ora um, ora o vizinho
      jobs.push(seekTo(el, w.time + 1 / 60, timeoutMs));
    }
    await Promise.all(jobs);
  }

  /** Para tudo (fim da reprodução). */
  stop(): void {
    for (const [, el] of this.els) if (!el.paused) el.pause();
    this.wanted.clear();
  }

  /** Libera elementos/URLs/quadros (troca de deck). */
  dispose(): void {
    this.gen++;
    this.stop();
    for (const [, el] of this.els) { el.removeAttribute('src'); el.load(); }
    this.els.clear();
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = [];
    for (const [, g] of this.gifs) g?.frames.forEach((f) => f.close());
    this.gifs.clear();
    this.gifJobs.clear();
  }
}

/** Busca exata num vídeo: espera dados + `seeked` (com teto de tempo). */
async function seekTo(el: HTMLVideoElement, time: number, timeoutMs: number): Promise<void> {
  // mídia que não carrega (link externo bloqueado…) não pode segurar o quadro;
  // sob relógio virtual o setTimeout não anda — o evento 'error' é a saída
  if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) return;
  const wait = (ev: string): Promise<void> => new Promise((res) => {
    const t = setTimeout(res, timeoutMs);
    const done = (): void => { clearTimeout(t); el.removeEventListener(ev, done); el.removeEventListener('error', done); res(); };
    el.addEventListener(ev, done, { once: true });
    el.addEventListener('error', done, { once: true });
  });
  if (el.readyState < 1) await wait('loadedmetadata');
  if (el.error) return;
  const target = Math.max(0, Math.min(time, Number.isFinite(el.duration) ? Math.max(0, el.duration - 0.001) : time));
  if (Math.abs(el.currentTime - target) > 0.0005 || el.readyState < 2) {
    const done = wait('seeked');
    el.currentTime = target;
    await done;
  }
  if (el.readyState < 2) await wait('loadeddata');
}
