import {
  PptxPackage, readPresentation, readSlide, paintSlideTo,
  readEmbeddedFonts, collectDeckTypefaces,
  buildPlaybackTimeline, playbackStateAt, shapeAnimHooks, paintTransition,
  type ChartModel, type PaintImage, type PaintSlideOptions,
  type Presentation, type Slide, type Shape, type ImageRef,
  type PlaybackOptions, type PlaybackTimeline, type PlaybackSlide,
} from '@universal/slides-core';
import { MediaPlayer } from './media-player.js';

/** Opções de `play()` — reprodução automática. */
export interface PlayOptions extends PlaybackOptions {
  /** Slide (índice no deck) onde começar. Default 0. */
  from?: number;
  /** Recomeça do início ao terminar (quiosque). Default false. */
  loop?: boolean;
  /**
   * Mídia (vídeo/áudio/GIF): `realtime` toca de verdade (com som) e corrige
   * deriva; `seek` não toca — `syncMedia()` busca o quadro exato antes de cada
   * pintura (captura determinística). Default `realtime`.
   */
  media?: 'realtime' | 'seek';
}

/**
 * <universal-presentation-viewer> — webcomponent de VISUALIZAÇÃO pura de
 * apresentações .pptx, fiel ao app de referência. É a abstração embarcável do
 * modo de exibição do Universal Slides: carrega bytes (ou `src` por URL),
 * navega, pinta cada slide em canvas, toca animações de entrada e transições,
 * abre hyperlinks e renderiza miniaturas. NÃO edita — o `<universal-slides>`
 * (editor) herda desta classe e acrescenta a edição inline.
 *
 * A pintura em si vive na função PURA `paintSlideTo` (slides-core/render.ts),
 * compartilhada com miniaturas e export de imagens: uma só fonte de verdade.
 *
 * API: `loadPptx(bytes)`, atributo/propriedade `src`, `selectSlide/next/prev`,
 * `getSlideCount/getSlideIndex`, `renderThumbnail(i, canvas)`,
 * `renderSlideToCanvas(i, canvas, pxWidth)`, `replayAnimation()`, `present()`,
 * `play()`/`stopPlayback()` (reprodução automática com intervalos).
 * Eventos: `us-loaded`, `us-slide`, `us-image`, `us-playback-end`.
 */
export class UniversalPresentationViewerElement extends HTMLElement {
  protected host = this.attachShadow({ mode: 'open' });
  protected canvas = document.createElement('canvas');
  protected badge = document.createElement('div');
  /** Wrapper que hospeda canvas + badge (+ overlays de subclasses). */
  protected wrap = document.createElement('div');

  protected pkg: PptxPackage | null = null;
  protected pres: Presentation | null = null;
  protected slides: Slide[] = [];
  protected index = 0;
  /**
   * Cache de decodificacao de imagens (`<p:pic>` + bg image). Chave = `ImageRef.part`
   * (caminho unico no pacote). Reutilizamos entre slides — uma logo repetida em
   * varios slides decodifica UMA vez. Pintamos sem bloquear: enquanto a imagem
   * ainda nao carregou, deixamos o retangulo vazio; um repaint e disparado quando
   * `onload` chega.
   */
  protected imageCache = new Map<string, { img: HTMLImageElement; ready: boolean }>();
  /** Cache de ChartModel parseado, por XML cru (passado a paintSlideTo). */
  protected chartCache = new Map<string, ChartModel>();
  /**
   * Estado da animação em curso. Sem animação tocando, `playStartMs = null`.
   */
  protected animPlay: { startMs: number | null; rafId: number; pausedAt: number } = { startMs: null, rafId: 0, pausedAt: 0 };
  /**
   * Snapshot do frame anterior pra transição entre slides. `prevImage` é o
   * ImageData do canvas no instante em que selectSlide foi chamado.
   */
  protected trans: { prevImage: ImageData | null; startMs: number | null; durMs: number; type: string } = {
    prevImage: null, startMs: null, durMs: 0, type: 'fade',
  };
  /**
   * Reprodução automática em curso (`play()`): linha do tempo PURA
   * (slides-core/playback.ts) + relógio. `null` = navegação manual.
   */
  protected auto: { tl: PlaybackTimeline; t0: number; loop: boolean; rafId: number; pos: number } | null = null;
  /** Canvases de trabalho da transição (origem/destino) na reprodução automática. */
  private fromCanvas: HTMLCanvasElement | null = null;
  private toCanvas: HTMLCanvasElement | null = null;
  private fromKey = '';
  /** Vídeo/áudio/GIF da reprodução automática. */
  protected media = new MediaPlayer(() => this.paint());

  static get observedAttributes(): string[] { return ['src']; }

  constructor() {
    super();
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;background:#3c3c3c;';
    this.canvas.tabIndex = 0;
    this.badge.style.cssText =
      'position:absolute;right:10px;bottom:8px;padding:2px 8px;border-radius:10px;' +
      'background:rgba(0,0,0,.55);color:#fff;font:600 12px/1.4 Segoe UI,Arial;pointer-events:none;';
    this.wrap.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
    this.wrap.appendChild(this.canvas);
    this.wrap.appendChild(this.badge);
    this.host.appendChild(this.wrap);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    // Hyperlinks: click simples sobre shape cujo txBody contém run.hyperlink
    // abre URL em nova aba. Single click NUNCA avança o slide.
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  connectedCallback(): void {
    new ResizeObserver(() => { this.resize(); this.paint(); }).observe(this.canvas);
    this.resize(); this.paint();
    (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => this.paint()).catch(() => {});
    const src = this.getAttribute('src');
    if (src && !this.pkg) void this.loadSrc(src);
  }

  attributeChangedCallback(name: string, oldV: string | null, newV: string | null): void {
    if (name === 'src' && newV && newV !== oldV && this.isConnected) void this.loadSrc(newV);
  }

  /** Carrega um .pptx por URL (mesma origem ou CORS liberado). */
  protected async loadSrc(url: string): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      this.loadPptx(new Uint8Array(await res.arrayBuffer()));
    } catch { /* src inválido: mantém estado atual */ }
  }

  // ───────────────────────── FONTES (lógica do Universal Write) ─────────────────────────
  // 1 fonte DEFAULT embarcada (Liberation Sans, via atributo `fonts` = base URL),
  // fontes EMBUTIDAS no arquivo (p:embeddedFontLst) e fontes do SO carregadas
  // SOB DEMANDA (queryLocalFonts) para as famílias que o deck realmente usa.

  /** Famílias com FontFace carregado (embutidas/SO/default). */
  protected loadedFamilyNames = new Set<string>();
  private defaultFontsInstalled = false;

  /** Busca os assets default (Liberation Sans) da base do atributo `fonts`. */
  protected async installDefaultFonts(): Promise<void> {
    if (this.defaultFontsInstalled) return;
    this.defaultFontsInstalled = true;
    const base = this.getAttribute('fonts');
    if (!base) return; // sem base: o host já registrou @font-face próprios
    const files: [string, string, string][] = [
      ['liberationsans-regular.ttf', '400', 'normal'],
      ['liberationsans-bold.ttf', '700', 'normal'],
      ['liberationsans-italic.ttf', '400', 'italic'],
      ['liberationsans-bolditalic.ttf', '700', 'italic'],
    ];
    for (const [file, weight, style] of files) {
      try {
        const res = await fetch(`${base.replace(/\/$/, '')}/${file}`);
        if (!res.ok) continue;
        const face = new FontFace('Liberation Sans', await res.arrayBuffer(), { weight, style });
        document.fonts.add(await face.load());
        this.loadedFamilyNames.add('Liberation Sans');
      } catch { /* opcional em dev; fallback do canvas cobre */ }
    }
    if (this.loadedFamilyNames.has('Liberation Sans')) this.paint();
  }

  /** Registra as fontes EMBUTIDAS no pacote (FontFace) e repinta ao carregar. */
  protected registerEmbeddedFonts(pkg: PptxPackage): void {
    for (const f of readEmbeddedFonts(pkg)) {
      const weight = f.variant === 'bold' || f.variant === 'boldItalic' ? '700' : '400';
      const style = f.variant === 'italic' || f.variant === 'boldItalic' ? 'italic' : 'normal';
      try {
        const buf = f.data.slice().buffer;
        const face = new FontFace(f.family, buf, { weight, style });
        void face.load().then(() => {
          document.fonts.add(face);
          this.loadedFamilyNames.add(f.family);
          this.paint();
        }).catch(() => {});
      } catch { /* face inválida: ignora */ }
    }
  }

  /**
   * Carrega SOB DEMANDA as fontes do SO usadas pelo deck e ainda não
   * disponíveis (queryLocalFonts — Chromium/Electron). Sem permissão/API,
   * o fallback CSS (default → Aptos → Calibri → Arial) cobre.
   */
  protected async ensureDeckFonts(pkg: PptxPackage): Promise<void> {
    const wanted = collectDeckTypefaces(pkg)
      .filter((fam) => !this.loadedFamilyNames.has(fam))
      .filter((fam) => {
        try { return !document.fonts.check(`12px "${fam}"`); } catch { return true; }
      });
    if (!wanted.length) return;
    const qlf = (window as unknown as { queryLocalFonts?: () => Promise<{ family: string; style: string; blob(): Promise<Blob> }[]> }).queryLocalFonts;
    if (!qlf) return;
    let faces: { family: string; style: string; blob(): Promise<Blob> }[];
    try { faces = await qlf.call(window); } catch { return; /* sem permissão */ }
    const wantSet = new Set(wanted.map((f) => f.toLowerCase()));
    let added = false;
    for (const fd of faces) {
      if (!wantSet.has(fd.family.toLowerCase())) continue;
      const styleLc = fd.style.toLowerCase();
      const weight = /bold|black|heavy|semibold|demi/.test(styleLc) ? '700' : '400';
      const style = /italic|oblique/.test(styleLc) ? 'italic' : 'normal';
      try {
        const bytes = await (await fd.blob()).arrayBuffer();
        const face = new FontFace(fd.family, bytes, { weight, style });
        document.fonts.add(await face.load());
        this.loadedFamilyNames.add(fd.family);
        added = true;
      } catch { /* face inacessível: segue */ }
    }
    if (added) this.paint();
  }

  /** True quando uma subclasse está com edição inline aberta (viewer: nunca). */
  protected isEditing(): boolean { return false; }
  /** Índice de shape cujo texto NÃO deve ser pintado (edição inline). */
  protected suppressTextIdx(): number | undefined { return undefined; }

  /** Carrega bytes .pptx e monta os slides. */
  loadPptx(bytes: Uint8Array): void {
    if (this.auto) this.stopPlayback(); // a linha do tempo é do deck anterior
    this.media.dispose();
    this.pkg = PptxPackage.load(bytes);
    // fontes: default embarcada + embutidas no arquivo + SO sob demanda
    void this.installDefaultFonts();
    this.registerEmbeddedFonts(this.pkg);
    void this.ensureDeckFonts(this.pkg);
    this.pres = readPresentation(this.pkg);
    this.slides = [];
    for (const ref of this.pres.slides) {
      if (!ref.target) continue;
      try { this.slides.push(readSlide(this.pkg, ref.target)); }
      catch { this.slides.push({ shapes: [] }); }
    }
    this.imageCache.clear();
    // pre-aquece o cache: todas as imagens deste deck (bg + pic) decodificam em
    // paralelo. Quando cada uma fica pronta, dispara repaint UMA vez.
    for (const s of this.slides) {
      if (s.bgImage) this.warmImage(s.bgImage);
      for (const sh of s.shapes) {
        if (sh.image) this.warmImage(sh.image);
        if (sh.fillImage) this.warmImage(sh.fillImage);
      }
    }
    this.index = 0;
    this.resize();
    this.paint();
    this.startAnimation();
    this.dispatchEvent(new CustomEvent('us-loaded', { detail: { count: this.slides.length } }));
  }

  /** Reinicia a animação do slide atual (útil para um botão "replay"). */
  replayAnimation(): void { this.stopAnimation(); this.paint(); this.startAnimation(); }

  /** Entra em modo apresentação: fullscreen do próprio componente. */
  present(from?: number): void {
    if (from !== undefined) this.selectSlide(from);
    if (document.fullscreenEnabled && this.wrap.requestFullscreen) {
      this.wrap.requestFullscreen().catch(() => {});
    }
    this.canvas.focus();
  }

  /**
   * Inicia a decodificacao de uma ImageRef e dispara um repaint quando carrega.
   * Reentrante: chamadas repetidas para o mesmo `part` reaproveitam o HTMLImageElement.
   */
  protected warmImage(ref: ImageRef): void {
    if (this.imageCache.has(ref.part)) return;
    const img = new Image();
    const entry = { img, ready: false };
    this.imageCache.set(ref.part, entry);
    // copiamos para um Uint8Array proprio para garantir buffer estavel + tipo de Blob
    const buf = new Uint8Array(ref.bytes);
    const blob = new Blob([buf], { type: ref.mime });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      entry.ready = true; this.paint(); URL.revokeObjectURL(url);
      // notifica consumidores (ex.: sidebar de miniaturas) p/ repintar.
      this.dispatchEvent(new CustomEvent('us-image', { detail: { part: ref.part } }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); };
    img.src = url;
  }

  /**
   * Mapa `part → imagem decodificada` para o `paintSlideTo`. Só entram as
   * PRONTAS (paint pula as pendentes; onload dispara repaint). Aproveita para
   * aquecer imagens do slide que ainda não entraram no cache (path raro).
   */
  protected readyImages(slide: Slide): Map<string, PaintImage> {
    if (slide.bgImage) this.warmImage(slide.bgImage);
    for (const sh of slide.shapes) {
      if (sh.image) this.warmImage(sh.image);
      if (sh.fillImage) this.warmImage(sh.fillImage);
    }
    const map = new Map<string, PaintImage>();
    for (const [part, e] of this.imageCache) if (e.ready) map.set(part, e.img);
    return map;
  }

  getSlideCount(): number { return this.slides.length; }
  getSlideIndex(): number { return this.index; }

  selectSlide(i: number): void {
    if (i < 0 || i >= this.slides.length || i === this.index) return;
    if (this.auto) this.stopPlayback();
    this.stopAnimation();
    // Snapshot do canvas atual p/ cross-fade (se a slide alvo tiver transição)
    const target = this.slides[i];
    if (target?.transition) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        try {
          this.trans.prevImage = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          this.trans.startMs = (window.performance ?? Date).now();
          this.trans.durMs = target.transition.durMs;
          this.trans.type = target.transition.type;
        } catch { this.trans.prevImage = null; }
      }
    }
    this.index = i; this.paint();
    this.startTransitionPlayback();
    this.startAnimation();
    this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: i } }));
  }

  next(): void { this.selectSlide(Math.min(this.slides.length - 1, this.index + 1)); }
  prev(): void { this.selectSlide(Math.max(0, this.index - 1)); }

  /** RAF loop que pinta a transição até completar, depois libera o snapshot. */
  protected startTransitionPlayback(): void {
    if (this.trans.startMs == null || !this.trans.prevImage) return;
    const tick = (): void => {
      if (this.trans.startMs == null) return;
      const dt = ((window.performance ?? Date).now()) - this.trans.startMs;
      if (dt >= this.trans.durMs) {
        this.trans.prevImage = null;
        this.trans.startMs = null;
        this.paint();
        return;
      }
      this.paint();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Auto-play da timeline do slide atual. Chama paint() via RAF até o último
   * efeito terminar. Sem animacoes → noop.
   */
  protected startAnimation(): void {
    const slide = this.slides[this.index];
    if (!slide?.animations || slide.animations.length === 0) return;
    this.animPlay.startMs = (window.performance ?? Date).now();
    const lastEnd = Math.max(...slide.animations.map((a) => a.delayMs + a.durMs));
    const tick = (): void => {
      if (this.animPlay.startMs == null) return;
      const tMs = ((window.performance ?? Date).now()) - this.animPlay.startMs;
      this.paint();
      if (tMs < lastEnd) this.animPlay.rafId = requestAnimationFrame(tick);
      else this.animPlay.startMs = null;
    };
    this.animPlay.rafId = requestAnimationFrame(tick);
  }

  /** Para qualquer animação em curso (cancela o RAF). */
  protected stopAnimation(): void {
    if (this.animPlay.rafId) cancelAnimationFrame(this.animPlay.rafId);
    this.animPlay.startMs = null;
    this.animPlay.rafId = 0;
  }

  /**
   * Opacidade computada de uma shape no instante t da timeline. Sem animacao
   * para essa shape → opaca. Antes do delay → invisível. Durante o ramp →
   * linear; após o fim → opaca.
   */
  protected shapeOpacity(shape: Shape, slide: Slide): number {
    if (!slide.animations || slide.animations.length === 0) return 1;
    if (this.animPlay.startMs == null) return 1; // sem playback => mostra tudo
    const t = ((window.performance ?? Date).now()) - this.animPlay.startMs;
    const entry = slide.animations.find((a) => a.spid === shape.id);
    if (!entry) return 1;
    if (t < entry.delayMs) return 0;
    if (t >= entry.delayMs + entry.durMs) return 1;
    const f = (t - entry.delayMs) / entry.durMs;
    return entry.type === 'fade' ? f : 1;
  }

  // ───────────────────────── REPRODUÇÃO AUTOMÁTICA ─────────────────────────

  /**
   * REPRODUÇÃO AUTOMÁTICA (quiosque / "usar intervalos"): a apresentação toca
   * sozinha — transição de entrada, animações (passos por clique disparam no
   * tempo do export de vídeo do app de referência), avanço por `advTm` (ou
   * `defaultSlideMs` sem intervalo), slides ocultos pulados. Pinta em modo
   * slideshow (fundo preto, slide encaixado sem margem, sem selo). O estado
   * de cada quadro é função PURA de `performance.now() − início`
   * (`playbackStateAt`) — determinístico sob relógio virtual.
   * Emite `us-slide` a cada troca e `us-playback-end` ao terminar.
   */
  play(opts: PlayOptions = {}): PlaybackTimeline {
    this.stopAnimation();
    this.stopPlayback();
    this.trans.prevImage = null; this.trans.startMs = null;
    const tl = buildPlaybackTimeline(this.slides.map((s) => s.timing), opts);
    this.media.mode = opts.media ?? 'realtime';
    // export emulado (tickMs): mídia parte 2 ticks após o comando e anda no relógio das transições
    this.media.clock = tl.tickMs > 0 ? { latencyMs: 2 * tl.tickMs, scale: tl.mediaClock } : {};
    for (const s of this.slides) this.media.warmGifs(s);
    const from = opts.from ?? 0;
    const first = tl.slides.find((s) => s.index >= from);
    const now = (window.performance ?? Date).now();
    this.auto = { tl, t0: now - (first?.startMs ?? 0), loop: opts.loop ?? false, rafId: 0, pos: -1 };
    this.fromKey = '';
    this.badge.style.display = 'none';
    const tick = (): void => {
      const a = this.auto;
      if (!a) return;
      const t = (window.performance ?? Date).now() - a.t0;
      if (t >= a.tl.durationMs && a.loop && a.tl.durationMs > 0) a.t0 += a.tl.durationMs;
      this.paint();
      if (t >= a.tl.durationMs && !a.loop) {
        a.rafId = 0;
        this.dispatchEvent(new CustomEvent('us-playback-end'));
        return;
      }
      a.rafId = requestAnimationFrame(tick);
    };
    this.paint();
    this.auto.rafId = requestAnimationFrame(tick);
    return tl;
  }

  /** Para a reprodução automática; o viewer fica no slide em cena. */
  stopPlayback(): void {
    if (!this.auto) return;
    if (this.auto.rafId) cancelAnimationFrame(this.auto.rafId);
    this.auto = null;
    this.media.stop();
    this.badge.style.display = '';
    this.paint();
  }

  isPlaying(): boolean { return this.auto !== null; }

  /** Linha do tempo da reprodução em curso (debug/lab de playback). */
  getPlaybackTimeline(): PlaybackTimeline | null { return this.auto?.tl ?? null; }

  /** Tempo (ms) da reprodução em curso, ou null. */
  getPlaybackTime(): number | null {
    return this.auto ? (window.performance ?? Date).now() - this.auto.t0 : null;
  }

  /**
   * Modo `media: 'seek'` (captura): posiciona vídeos/GIFs do quadro atual no
   * instante exato e espera os quadros decodificados. Devolve uma assinatura
   * das posições (muda quando o quadro de mídia muda).
   */
  async syncMedia(): Promise<string> {
    if (!this.auto) return '';
    this.media.resetWanted();
    this.paint(); // quadro "seco": registra as posições pedidas
    await this.media.seekAll();
    return this.media.signature();
  }

  /** Canvas de trabalho do tamanho do canvas principal. */
  private workCanvas(c: HTMLCanvasElement | null): HTMLCanvasElement {
    const cv = c ?? document.createElement('canvas');
    if (cv.width !== this.canvas.width) cv.width = this.canvas.width;
    if (cv.height !== this.canvas.height) cv.height = this.canvas.height;
    return cv;
  }

  /** Pinta um slide da linha do tempo num contexto, no tempo de animação `animMs`. */
  private paintPlaybackSlide(ctx: CanvasRenderingContext2D, ps: PlaybackSlide, animMs: number,
    fit: { ox: number; oy: number; scale: number }): void {
    const slide = this.slides[ps.index];
    if (!slide || !this.pres) return;
    const bg = new Set(slide.timing?.animBg ?? []);
    const actx = { animBg: (spid: string) => bg.has(spid) };
    const mediaInfo = new Map((slide.timing?.media ?? []).map((m) => [m.spid, m]));
    const bytes = (part: string): Uint8Array | undefined => this.pkg?.getPart(part);
    const hasMedia = slide.shapes.some((sh) => sh.media || sh.image?.mime === 'image/gif');
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW, slideH: this.pres.slideH,
      images: this.readyImages(slide), charts: this.chartCache,
    }, fit.scale, {
      ox: fit.ox, oy: fit.oy,
      // motor SMIL: cada forma toca os comportamentos gravados no arquivo
      shapeAnim: (sh) => (sh.inherited || !ps.effects.length ? null
        : shapeAnimHooks(ps.effects, sh.groupIds ? [sh.id, ...sh.groupIds] : [sh.id], animMs, actx)),
      // vídeo tocando / quadro do GIF no lugar da capa
      ...(hasMedia ? {
        mediaFrame: (sh: Shape) => {
          if (sh.inherited) return null;
          const mi = mediaInfo.get(sh.id);
          return this.media.frame(sh, ps, animMs, bytes, mi?.vol ?? 1, mi?.mute ?? false);
        },
        // "ocultar enquanto não estiver tocando" (cMediaNode showWhenStopped="0")
        shapeOpacity: (sh: Shape) => (sh.media && mediaInfo.get(sh.id)?.showWhenStopped === false
          && !this.media.isPlaying(sh, ps, animMs) ? 0 : 1),
      } : {}),
    });
  }

  /**
   * Quadro da reprodução automática: slide em cena no estado de animação do
   * instante atual; durante a transição, compõe ORIGEM (slide anterior no
   * estado final, ou preto no 1º slide) × DESTINO. v1: esmaecer cruzado;
   * `thruBlk` passa pelo preto; corte seco é instantâneo (transitionMs = 0).
   */
  protected paintPlayback(ctx: CanvasRenderingContext2D): void {
    const a = this.auto!;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!this.pres) return;
    const st = playbackStateAt(a.tl, (window.performance ?? Date).now() - a.t0);
    if (!st.slide) return;
    if (st.pos !== a.pos) {
      a.pos = st.pos;
      this.index = st.slide.index;
      this.dispatchEvent(new CustomEvent('us-slide', { detail: { index: st.slide.index } }));
    }
    const scale = Math.min(W / this.pres.slideW, H / this.pres.slideH);
    const fit = { scale, ox: (W - this.pres.slideW * scale) / 2, oy: (H - this.pres.slideH * scale) / 2 };
    const p = st.transitionProgress;
    if (p >= 1) {
      this.paintPlaybackSlide(ctx, st.slide, st.animMs, fit);
      if (this.media.mode === 'realtime') this.media.syncRealtime();
      return;
    }

    // transição em curso: ORIGEM (estado final do anterior; preto no 1º) × DESTINO
    const to = this.toCanvas = this.workCanvas(this.toCanvas);
    const tctx = to.getContext('2d')!;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.fillStyle = '#000'; tctx.fillRect(0, 0, W, H);
    this.paintPlaybackSlide(tctx, st.slide, st.animMs, fit);
    const from = this.fromCanvas = this.workCanvas(this.fromCanvas);
    const key = `${st.from?.index ?? -1}:${from.width}x${from.height}`;
    if (key !== this.fromKey) {
      const fctx = from.getContext('2d')!;
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.fillStyle = '#000'; fctx.fillRect(0, 0, W, H);
      if (st.from) this.paintPlaybackSlide(fctx, st.from, Infinity, fit);
      this.fromKey = key;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tr = st.slide.transition ?? { type: 'fade', ns: 'p', attrs: {}, durMs: 0, advClick: true };
    // retângulo do slide em px de canvas (o resto é letterbox preto)
    const rect = {
      x: fit.ox * dpr, y: fit.oy * dpr,
      w: this.pres.slideW * fit.scale * dpr, h: this.pres.slideH * fit.scale * dpr,
    };
    paintTransition(ctx, from, to, tr, p, rect, this.canvas.width, this.canvas.height);
    ctx.restore();
    if (this.media.mode === 'realtime') this.media.syncRealtime();
  }

  /**
   * Pinta o slide `i` num canvas externo (uso: miniaturas da sidebar). Usa o
   * MESMO `paintSlideTo` — uma so fonte de verdade entre slide principal
   * e thumbnail. Retorna `false` se a imagem do slide ainda nao decodificou —
   * o chamador pode escutar `us-loaded`/`us-image` para repintar.
   */
  renderThumbnail(i: number, target: HTMLCanvasElement): boolean {
    const slide = this.slides[i];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext('2d');
    if (!ctx) return false;
    const dpr = window.devicePixelRatio || 1;
    const cssW = target.clientWidth || 200;
    const cssH = target.clientHeight || Math.round(cssW * this.pres.slideH / this.pres.slideW);
    if (target.width !== Math.round(cssW * dpr)) target.width = Math.round(cssW * dpr);
    if (target.height !== Math.round(cssH * dpr)) target.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const scale = Math.min(cssW / this.pres.slideW, cssH / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    const ox = (cssW - sw) / 2, oy = (cssH - sh) / 2;
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW, slideH: this.pres.slideH,
      images: this.readyImages(slide), charts: this.chartCache,
    }, scale, { ox, oy });
    return true;
  }

  /**
   * Pinta o slide `i` num canvas externo em TAMANHO EXATO: o canvas é
   * redimensionado para `pxWidth × (proporção do slide)` e o slide preenche
   * 100% da área (sem margens/chrome). Uso: export, comparação 1:1 com o
   * app de referência, impressão.
   */
  renderSlideToCanvas(i: number, target: HTMLCanvasElement, pxWidth = 1280): boolean {
    const slide = this.slides[i];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext('2d');
    if (!ctx) return false;
    const pxHeight = Math.round(pxWidth * this.pres.slideH / this.pres.slideW);
    if (target.width !== pxWidth) target.width = pxWidth;
    if (target.height !== pxHeight) target.height = pxHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pxWidth, pxHeight);
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW, slideH: this.pres.slideH,
      images: this.readyImages(slide), charts: this.chartCache,
    }, pxWidth / this.pres.slideW);
    return true;
  }

  protected onKeyDown = (e: KeyboardEvent): void => {
    if (this.isEditing()) return; // teclado pertence ao editor da subclasse
    if (this.auto && e.key === 'Escape') { this.stopPlayback(); e.preventDefault(); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { this.next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.prev(); e.preventDefault(); }
    else if (e.key === 'Home') { this.selectSlide(0); e.preventDefault(); }
    else if (e.key === 'End') { this.selectSlide(this.slides.length - 1); e.preventDefault(); }
  };

  /**
   * Detecta hyperlink na posição (canvas-relativa) e abre URL se houver.
   * v1: o link é "shape-wide" (a primeira run com hyperlink no txBody manda).
   */
  protected onClick = (e: MouseEvent): void => {
    if (this.isEditing()) return;
    const hit = this.hitTestHyperlink(e);
    if (hit) {
      window.open(hit, '_blank', 'noopener');
      e.preventDefault();
    }
  };

  protected onMouseMove = (e: MouseEvent): void => {
    if (this.isEditing()) return;
    this.canvas.style.cursor = this.hitTestHyperlink(e) ? 'pointer' : 'default';
  };

  /** Devolve a primeira URL de hyperlink sob (clientX, clientY) ou null. */
  protected hitTestHyperlink(e: MouseEvent): string | null {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i]!;
      if (!sh.xfrm || !sh.txBody) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x < sx || x > sx + sw || y < sy || y > sy + sh2) continue;
      for (const p of sh.txBody.paragraphs) {
        for (const r of p.runs) {
          if (r.hyperlink) return r.hyperlink;
        }
      }
    }
    return null;
  }

  protected resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /** Geometria de encaixe do slide no canvas (origem + escala EMU→px). */
  protected fit(): { ox: number; oy: number; scale: number; sw: number; sh: number } | null {
    if (!this.pres) return null;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const margin = 16;
    const aw = W - margin * 2, ah = H - margin * 2;
    const scale = Math.min(aw / this.pres.slideW, ah / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    return { ox: (W - sw) / 2, oy: (H - sh) / 2, scale, sw, sh };
  }

  protected paint(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    if (this.auto) { this.paintPlayback(ctx); return; }
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    ctx.fillStyle = '#3c3c3c'; ctx.fillRect(0, 0, W, H);

    const fit = this.fit();
    const slide = this.slides[this.index];
    if (!fit || !slide) {
      ctx.fillStyle = '#bbb'; ctx.font = '14px Segoe UI, Arial';
      ctx.fillText('Nenhum .pptx carregado', 20, 30);
      this.badge.textContent = '';
      return;
    }

    // conteúdo do slide (fundo + shapes) — função pura compartilhada
    const paintOpts: PaintSlideOptions = {
      ox: fit.ox, oy: fit.oy,
      shapeOpacity: (sh) => this.shapeOpacity(sh, slide),
    };
    const suppress = this.suppressTextIdx();
    if (suppress !== undefined) paintOpts.suppressTextShapeIdx = suppress;
    paintSlideTo(ctx, slide, {
      slideW: this.pres!.slideW, slideH: this.pres!.slideH,
      images: this.readyImages(slide), charts: this.chartCache,
    }, fit.scale, paintOpts);

    // sombra/borda do slide
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(fit.ox + 0.5, fit.oy + 0.5, fit.sw - 1, fit.sh - 1);

    // ── transição entre slides: overlay do FRAME ANTERIOR com alpha decrescente
    if (this.trans.prevImage && this.trans.startMs != null) {
      const dt = ((window.performance ?? Date).now()) - this.trans.startMs;
      const f = Math.max(0, Math.min(1, dt / this.trans.durMs));
      // fade simples: alpha 1-f no frame antigo desenhado por cima
      const overlay = document.createElement('canvas');
      overlay.width = this.canvas.width; overlay.height = this.canvas.height;
      const octx = overlay.getContext('2d');
      if (octx) {
        octx.putImageData(this.trans.prevImage, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // coordenadas brutas (sem dpr)
        ctx.globalAlpha = 1 - f;
        ctx.drawImage(overlay, 0, 0);
        ctx.restore();
      }
    }

    this.badge.textContent = `${this.index + 1} / ${this.slides.length}`;
  }
}

customElements.define('universal-presentation-viewer', UniversalPresentationViewerElement);
