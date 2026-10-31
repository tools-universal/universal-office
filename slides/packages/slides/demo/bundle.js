import {
  DEFAULT_EMBEDDING,
  EMU_PER_PX,
  FontResolver,
  PptxPackage,
  SlideShow,
  addSlide,
  alignShapeText,
  arrangeShape,
  blankDeck,
  buildPlaybackTimeline,
  clearShapeFormatting,
  collectDeckTypefaces,
  deleteShape,
  deleteSlide,
  duplicateSlide,
  extractShape,
  formatShapeText,
  gifFrameAt,
  insertImage,
  insertShape,
  insertTextBox,
  layoutOf,
  listLayouts,
  mediaFadeAlpha,
  mediaStateAt,
  moveSlide,
  onBrowserLangChange,
  paintSlideTo,
  paintTransition,
  pasteShape,
  pickLabels,
  planFontEmbedding,
  playbackStateAt,
  prepareSpecialImage,
  rasterizeSpecialImage,
  readEmbeddedFonts,
  readPptxEmbedding,
  readPresentation,
  readProperties,
  readSlide,
  readSlideNotes,
  replaceInShape,
  scaleShapeText,
  setShapeBullets,
  setShapeFill,
  setShapeFrame,
  setShapeLink,
  setShapeOutline,
  setShapeText,
  setSlideBackground,
  setSlideHidden,
  setSlideLayout,
  setSlideNotes,
  setSlideTransition,
  shapeAnimHooks,
  specialImageNeedsPrepare,
  tableImages,
  uiLang,
  uiLocale,
  variantOf,
  writePptxEmbedding,
  writeProperties,
  writeShowSettings
} from "./chunks/chunk-XDXP5RH3.js";

// ../viewer/src/media-player.ts
var MediaPlayer = class {
  constructor(repaint) {
    this.repaint = repaint;
  }
  repaint;
  mode = "realtime";
  els = /* @__PURE__ */ new Map();
  urls = [];
  gifs = /* @__PURE__ */ new Map();
  gifJobs = /* @__PURE__ */ new Map();
  /** Posições pedidas no último quadro pintado (elemento → estado). */
  wanted = /* @__PURE__ */ new Map();
  /** Quadros de GIF mostrados no último quadro (parte → índice). */
  gifShown = /* @__PURE__ */ new Map();
  /** Relógio da mídia (export emulado: 2 ticks de latência, 1/30 s por quadro). */
  clock = {};
  /** Vídeo em TELA CHEIA tocando no quadro em curso (a pintura cobre o slide com ele). */
  fullScreen = null;
  /** Mudo geral (botão de som dos controles): vale por cima do volume gravado no arquivo. */
  muted = false;
  /** Chave do elemento de uma forma com mídia. */
  key(sh) {
    return sh.media ? sh.media.part ?? sh.media.url : void 0;
  }
  /** Elemento (criado sob demanda) da mídia da forma. */
  element(sh, bytes) {
    const k = this.key(sh);
    if (!k || !sh.media) return null;
    let el = this.els.get(k);
    if (el) return el;
    let src;
    if (sh.media.part) {
      const b = bytes(sh.media.part);
      if (!b) return null;
      src = URL.createObjectURL(new Blob([new Uint8Array(b)], { type: sh.media.mime }));
      this.urls.push(src);
    } else src = sh.media.url;
    if (!src) return null;
    el = document.createElement(sh.media.kind === "audio" ? "audio" : "video");
    el.preload = "auto";
    el.muted = this.mode === "seek";
    el.playsInline = true;
    el.addEventListener("loadeddata", () => this.repaint());
    el.src = src;
    this.els.set(k, el);
    return el;
  }
  /** Geração do deck: decodificação que termina depois de `dispose()` é de outro deck. */
  gen = 0;
  /** Decodifica (uma vez) os GIFs animados do slide; repinta quando prontos. */
  warmGifs(slide) {
    const gen = this.gen;
    for (const sh of slide.shapes) {
      const img = sh.image;
      if (!img || img.mime !== "image/gif" || this.gifs.has(img.part) || this.gifJobs.has(img.part)) continue;
      this.gifJobs.set(img.part, this.decodeGif(img.part, img.bytes).then((g) => {
        if (gen !== this.gen) {
          g?.frames.forEach((f) => f.close());
          return;
        }
        this.gifs.set(img.part, g);
        this.gifJobs.delete(img.part);
        if (g) this.repaint();
      }));
    }
  }
  async decodeGif(part, bytes) {
    const Ctor = globalThis.ImageDecoder;
    if (!Ctor) return null;
    try {
      const dec = new Ctor({ data: new Uint8Array(bytes), type: "image/gif" });
      await dec.tracks.ready;
      const tr = dec.tracks.selectedTrack;
      if (!tr || tr.frameCount <= 1) {
        dec.close();
        return null;
      }
      const frames = [], delays = [];
      for (let i = 0; i < tr.frameCount; i++) {
        const { image } = await dec.decode({ frameIndex: i });
        delays.push((image.duration ?? 0) / 1e3);
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
  frame(sh, ps, animMs, bytes, info) {
    if (sh.media) {
      const st = mediaStateAt(ps.effects, sh.id, animMs, this.clock, !!info?.loop);
      const el = this.element(sh, bytes);
      if (!el || el.error) return null;
      const trimSt = (sh.media.trim?.startMs ?? 0) / 1e3;
      const trimEnd = (sh.media.trim?.endMs ?? 0) / 1e3;
      const fileDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : void 0;
      const lenSec = fileDur !== void 0 ? Math.max(0, fileDur - trimSt - trimEnd) : (st.durMs ?? Infinity) / 1e3;
      let t = st.timeSec;
      if (info?.loop && this.mode === "realtime" && lenSec > 0 && Number.isFinite(lenSec)) t %= lenSec;
      const played = Math.max(0, Math.min(t, Math.max(0, lenSec - 1e-3)));
      if (st.started) {
        this.wanted.set(el, {
          time: trimSt + played,
          playing: st.playing && t < lenSec,
          volume: info?.vol ?? 1,
          muted: info?.mute ?? false
        });
      }
      if (sh.media.kind !== "video" || !st.started) return null;
      if (st.ended && info?.rewind) return null;
      if (el.readyState < 2) return null;
      const video = el;
      if (info?.fullScreen && st.playing) this.fullScreen = video;
      const alpha = st.ended && sh.media.fade?.outMs ? 0 : mediaFadeAlpha(sh.media.fade, played * 1e3, lenSec * 1e3);
      if (alpha <= 0) return null;
      return alpha >= 1 ? video : { image: video, alpha };
    }
    const img = sh.image;
    if (img?.mime === "image/gif") {
      const g = this.gifs.get(img.part);
      if (!g) return null;
      const t = Number.isFinite(animMs) ? animMs : ps.endMs - ps.animStartMs;
      const elapsed = Math.max(0, t) * (this.clock.scale ?? 1);
      const i = gifFrameAt(g.delays, elapsed, g.repeat);
      this.gifShown.set(img.part, i);
      return g.frames[i] ?? null;
    }
    return null;
  }
  /** `play()` em andamento (a promessa ainda não resolveu): não buscar de novo a cada quadro. */
  starting = /* @__PURE__ */ new WeakSet();
  /** Autoplay recusado (sem gesto do usuário): tentou mudo; se nem assim, fica parado. */
  forcedMute = /* @__PURE__ */ new WeakSet();
  blocked = /* @__PURE__ */ new WeakSet();
  start(el, time) {
    el.currentTime = time;
    this.starting.add(el);
    el.play().then(() => this.starting.delete(el), (err) => {
      this.starting.delete(el);
      if (err?.name === "NotAllowedError" && !this.forcedMute.has(el)) {
        this.forcedMute.add(el);
        el.muted = true;
        this.starting.add(el);
        el.play().then(() => this.starting.delete(el), () => {
          this.starting.delete(el);
          this.blocked.add(el);
        });
      } else this.blocked.add(el);
    });
  }
  /** Modo tempo real: toca/pausa/corrige os elementos conforme o último quadro. */
  syncRealtime() {
    for (const [, el] of this.els) {
      const w = this.wanted.get(el);
      if (!w) {
        if (!el.paused) el.pause();
        continue;
      }
      el.volume = Math.max(0, Math.min(1, w.volume));
      el.muted = this.muted || w.muted || this.forcedMute.has(el);
      if (w.playing) {
        if (this.starting.has(el)) continue;
        if (this.blocked.has(el)) {
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
  /** Liga/desliga o mudo geral já (o desmudo volta no próximo quadro, com o volume do arquivo). */
  setMuted(muted) {
    this.muted = muted;
    if (muted) for (const [, el] of this.els) el.muted = true;
  }
  /** Esquece as posições pedidas (antes de recalcular um quadro). */
  resetWanted() {
    this.wanted.clear();
    this.gifShown.clear();
  }
  /** Assinatura das posições do último quadro (vídeo em ms, quadro de GIF). */
  signature() {
    const parts = [];
    for (const [el, w] of this.wanted) parts.push(`${el.currentSrc.slice(-12)}@${Math.round(w.time * 1e3)}`);
    for (const [k, i] of this.gifShown) parts.push(`${k}#${i}`);
    return parts.join("|");
  }
  /** A mídia da forma está tocando em `animMs`? */
  isPlaying(sh, ps, animMs, loop = false) {
    return mediaStateAt(ps.effects, sh.id, animMs, this.clock, loop).playing;
  }
  /**
   * Modo busca: posiciona cada vídeo pedido no instante exato e espera o
   * quadro decodificado (+ GIFs pendentes). Chamar após um quadro "seco"
   * (que registra as posições) e antes do quadro definitivo.
   */
  async seekAll(timeoutMs = 3e3) {
    const jobs = [...this.gifJobs.values()];
    for (const [el, w] of this.wanted) {
      if (!(el instanceof HTMLVideoElement)) continue;
      jobs.push(seekTo(el, w.time + 1 / 60, timeoutMs));
    }
    await Promise.all(jobs);
  }
  /** Para tudo (fim da reprodução). */
  stop() {
    for (const [, el] of this.els) if (!el.paused) el.pause();
    this.wanted.clear();
  }
  /** Libera elementos/URLs/quadros (troca de deck). */
  dispose() {
    this.gen++;
    this.stop();
    for (const [, el] of this.els) {
      el.removeAttribute("src");
      el.load();
    }
    this.els.clear();
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = [];
    for (const [, g] of this.gifs) g?.frames.forEach((f) => f.close());
    this.gifs.clear();
    this.gifJobs.clear();
  }
};
async function seekTo(el, time, timeoutMs) {
  if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) return;
  const wait = (ev) => new Promise((res) => {
    const t = setTimeout(res, timeoutMs);
    const done = () => {
      clearTimeout(t);
      el.removeEventListener(ev, done);
      el.removeEventListener("error", done);
      res();
    };
    el.addEventListener(ev, done, { once: true });
    el.addEventListener("error", done, { once: true });
  });
  if (el.readyState < 1) await wait("loadedmetadata");
  if (el.error) return;
  const target = Math.max(0, Math.min(time, Number.isFinite(el.duration) ? Math.max(0, el.duration - 1e-3) : time));
  if (Math.abs(el.currentTime - target) > 5e-4 || el.readyState < 2) {
    const done = wait("seeked");
    el.currentTime = target;
    await done;
  }
  if (el.readyState < 2) await wait("loadeddata");
}

// ../../../shared/ui/src/viewer-controls.ts
var SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
var ICONS = {
  // navegação
  "skip-prev": '<path d="M5 5v14"/><path d="M19 5v14L8 12z" fill="currentColor"/>',
  "skip-next": '<path d="M19 5v14"/><path d="M5 5v14l11-7z" fill="currentColor"/>',
  "chevron-up": '<path d="M6 15l6-6 6 6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  // reprodução e som
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  muted: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  // painéis
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  outline: '<path d="M9 6h11M12 12h8M12 18h8"/><circle cx="5" cy="6" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="18" r="1.2" fill="currentColor"/>',
  comment: '<path d="M4 5h16v11H10l-4.5 3.5V16H4z"/><path d="M8 9h8M8 12.5h5"/>',
  // modos de exibição (documento)
  "view-read": '<path d="M3 5.5c3-1 6-1 9 1.2 3-2.2 6-2.2 9-1.2v13c-3-1-6-1-9 1.2-3-2.2-6-2.2-9-1.2z"/><path d="M12 6.7v13.2"/>',
  "view-print": '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 12h7M9 15.5h7"/>',
  "view-web": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
  // zoom
  "zoom-out": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M7.5 10.5h6M20 20l-4.8-4.8"/>',
  "zoom-in": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M7.5 10.5h6M10.5 7.5v6M20 20l-4.8-4.8"/>',
  // arquivo
  download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  // apresentação e tela cheia
  present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10.5 7.5v5l4-2.5z" fill="currentColor"/>',
  unpresent: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10 8l4 4M14 8l-4 4"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  unfullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'
};
var icon = (name) => `<svg ${SVG_ATTRS}>${ICONS[name] ?? ""}</svg>`;
var cssVar = (prefix, name, def) => `var(--${prefix}-${name}, var(--uo-${name}, ${def}))`;
function controlsCss(prefix, defaults = {}) {
  const v = (name, def) => cssVar(prefix, name, def);
  return `
:host {
  --uoc-c: ${v("controls-color", defaults.color ?? "#fff")};
  --uoc-s: ${v("controls-size", "22px")};
  --uoc-hover: ${v("controls-hover-bg", defaults.hoverBg ?? "rgba(255,255,255,.16)")};
  --uoc-progress: ${v("progress-color", defaults.progressColor ?? "#fff")};
}
.uoc-ui [hidden] { display: none !important; }
.uoc-ui { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; }
.uoc-bar {
  position: absolute; left: 0; right: 0; bottom: 0; pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: calc(var(--uoc-s) * 1.9) 10px 6px;
  background: ${v("controls-bg", defaults.bg ?? "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.35) 40%, rgba(0,0,0,.8))")};
  color: var(--uoc-c); font: 400 calc(var(--uoc-s) * .6)/1 system-ui, "Segoe UI", sans-serif;
  /* aparecer: vis\xEDvel J\xC1 (o Tab precisa achar os bot\xF5es no mesmo instante); sumir: esmaece e s\xF3 ent\xE3o esconde */
  transition: opacity .25s, visibility 0s;
}
.uoc-hidden .uoc-bar { opacity: 0; visibility: hidden; transition: opacity .25s, visibility 0s .25s; }
.uoc-btn {
  all: unset; box-sizing: border-box; flex: none; cursor: pointer; color: inherit;
  width: calc(var(--uoc-s) * 1.8); height: calc(var(--uoc-s) * 1.8);
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: calc(var(--uoc-s) * .35); opacity: .9;
}
.uoc-btn:hover, .uoc-btn[aria-pressed="true"], .uoc-btn[aria-expanded="true"] { background: var(--uoc-hover); opacity: 1; }
.uoc-btn:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: -2px; }
.uoc-btn svg { width: var(--uoc-s); height: var(--uoc-s); display: block; }
.uoc-counter { padding: 0 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.uoc-spacer { flex: 1; }
.uoc-progress {
  position: absolute; left: 12px; right: 12px; top: calc(var(--uoc-s) * 1.9 - 10px);
  height: 14px; cursor: pointer; display: flex; align-items: center;
}
.uoc-track { position: relative; width: 100%; height: ${v("progress-height", "3px")}; background: ${v("progress-track", defaults.progressTrack ?? "rgba(255,255,255,.28)")}; transition: height .1s; }
.uoc-progress:hover .uoc-track { height: calc(${v("progress-height", "3px")} + 2px); }
.uoc-progress:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: 2px; border-radius: 2px; }
.uoc-value { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--uoc-progress); }
`;
}
var SR_ONLY = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;";
var LiveRegion = class {
  el = document.createElement("div");
  timer = 0;
  constructor() {
    this.el.setAttribute("role", "status");
    this.el.setAttribute("aria-live", "polite");
    this.el.setAttribute("aria-atomic", "true");
    this.el.setAttribute("part", "live");
    this.el.style.cssText = SR_ONLY;
  }
  /** Anuncia `text` (o mesmo texto de novo também é anunciado). */
  announce(text) {
    clearTimeout(this.timer);
    this.el.textContent = "";
    this.timer = window.setTimeout(() => {
      this.el.textContent = text;
    }, 60);
  }
};
var IDLE_MS = 2500;
var ControlBar = class {
  constructor(o) {
    this.o = o;
    this.ui.className = "uoc-ui";
    this.bar.className = "uoc-bar";
    this.bar.setAttribute("part", "controls");
    this.bar.setAttribute("role", "toolbar");
    this.progress.className = "uoc-progress";
    this.progress.setAttribute("part", "progress");
    this.progress.setAttribute("role", "slider");
    this.progress.setAttribute("aria-orientation", "horizontal");
    this.progress.tabIndex = 0;
    this.progress.dataset["item"] = o.progressItem;
    this.progress.addEventListener("keydown", (e) => {
      const step = {
        ArrowRight: "next",
        ArrowUp: "next",
        ArrowLeft: "prev",
        ArrowDown: "prev",
        PageUp: "pagenext",
        PageDown: "pageprev",
        Home: "home",
        End: "end"
      }[e.key];
      if (!step || !o.onStep) return;
      e.preventDefault();
      e.stopPropagation();
      o.onStep(step);
      this.wake();
    });
    const track = document.createElement("div");
    track.className = "uoc-track";
    this.value.className = "uoc-value";
    this.value.setAttribute("part", "progress-value");
    track.appendChild(this.value);
    this.progress.appendChild(track);
    this.progress.addEventListener("click", (e) => {
      const r = this.progress.getBoundingClientRect();
      o.onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1))));
      this.wake();
    });
    this.bar.appendChild(this.progress);
    this.counter.className = "uoc-counter";
    this.counter.setAttribute("part", "counter");
    this.counter.dataset["item"] = o.counterItem;
    for (const s of o.start) this.bar.appendChild(s === "counter" ? this.counter : this.button(s));
    const spacer = document.createElement("span");
    spacer.className = "uoc-spacer";
    this.bar.appendChild(spacer);
    for (const s of o.end) this.bar.appendChild(this.button(s));
    this.ui.appendChild(this.bar);
    this.bar.addEventListener("click", (e) => e.stopPropagation());
    this.bar.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.bar.addEventListener("pointerenter", () => {
      this.pointerInBar = true;
      this.wake();
    });
    this.bar.addEventListener("pointerleave", () => {
      this.pointerInBar = false;
      this.wake();
    });
    this.bar.addEventListener("focusin", () => this.wake());
    o.wrap.addEventListener("keydown", (e) => {
      if (e.key === "Tab" || e.key === "F6") this.wake();
    }, true);
    o.wrap.addEventListener("focusin", () => this.wake());
  }
  o;
  ui = document.createElement("div");
  bar = document.createElement("div");
  progress = document.createElement("div");
  value = document.createElement("div");
  counter = document.createElement("span");
  buttons = /* @__PURE__ */ new Map();
  removed = /* @__PURE__ */ new Set();
  enabledFlag = false;
  hideTimer = 0;
  pointerInBar = false;
  button(s) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = s.className ? `uoc-btn ${s.className}` : "uoc-btn";
    b.setAttribute("part", `button button-${s.name}`);
    b.dataset["item"] = s.item;
    if (s.icon) {
      b.innerHTML = icon(s.icon);
      b.dataset["icon"] = s.icon;
    }
    b.addEventListener("click", () => {
      s.run();
      this.wake();
    });
    this.buttons.set(s.name, b);
    return b;
  }
  get enabled() {
    return this.enabledFlag;
  }
  /** Liga/desliga a barra e guarda os itens tirados (`no<item>`). Devolve true se mudou de ligada↔desligada. */
  configure(enabled, removed) {
    this.removed = new Set(removed);
    if (enabled === this.enabledFlag && enabled === this.ui.isConnected) return false;
    this.enabledFlag = enabled;
    if (enabled) {
      this.o.wrap.appendChild(this.ui);
      this.wake();
    } else {
      clearTimeout(this.hideTimer);
      this.ui.remove();
    }
    return true;
  }
  isRemoved(item) {
    return this.removed.has(item);
  }
  /** Atividade do usuário: mostra a barra e reagenda o sumiço. */
  wake = () => {
    if (!this.enabledFlag) return;
    this.o.wrap.classList.remove("uoc-hidden");
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(this.idle, IDLE_MS);
  };
  /** O ponteiro saiu do viewer: some já (se nada prende a barra). */
  leave = () => {
    if (this.enabledFlag) this.idle();
  };
  idle = () => {
    clearTimeout(this.hideTimer);
    if (this.pointerInBar || this.o.keepVisible?.() || this.bar.contains(this.o.root.activeElement)) return;
    this.o.wrap.classList.add("uoc-hidden");
  };
  /**
   * Visibilidade dos itens: o atributo `no<item>` tira; `available(item)`
   * esconde o que não se aplica agora (sem mídia, sem anotações, deck vazio…).
   */
  applyVisibility(available) {
    for (const el of this.bar.querySelectorAll("[data-item]")) {
      const it = el.dataset["item"];
      el.hidden = this.removed.has(it) || !available(it);
    }
  }
  /** Nome da barra (role=toolbar) para o leitor de tela. */
  setLabel(label) {
    this.bar.setAttribute("aria-label", label);
  }
  setProgress(fraction, aria) {
    this.value.style.width = `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(2)}%`;
    this.progress.setAttribute("aria-label", aria.label);
    this.progress.setAttribute("aria-valuemin", String(aria.min));
    this.progress.setAttribute("aria-valuemax", String(aria.max));
    this.progress.setAttribute("aria-valuenow", String(aria.now));
    if (aria.text) this.progress.setAttribute("aria-valuetext", aria.text);
    else this.progress.removeAttribute("aria-valuetext");
  }
  setCounter(text) {
    this.counter.textContent = text;
  }
  setButton(name, st) {
    const b = this.buttons.get(name);
    if (!b) return;
    b.setAttribute("aria-label", st.label);
    b.title = st.label;
    if (st.icon && b.dataset["icon"] !== st.icon) {
      b.innerHTML = icon(st.icon);
      b.dataset["icon"] = st.icon;
    }
    if (st.text !== void 0) b.textContent = st.text;
    if (st.pressed !== void 0) b.setAttribute("aria-pressed", String(st.pressed));
    if (st.expanded !== void 0) b.setAttribute("aria-expanded", String(st.expanded));
  }
  buttonEl(name) {
    return this.buttons.get(name);
  }
  dispose() {
    clearTimeout(this.hideTimer);
  }
};

// ../../../shared/ui/src/plugin-registry.ts
var PluginRegistry = class {
  constructor(hooks) {
    this.hooks = hooks;
  }
  hooks;
  plugins = /* @__PURE__ */ new Map();
  connected = /* @__PURE__ */ new Set();
  /** o que o registro instalou em cada instância (inclusive desconectadas) */
  installed = /* @__PURE__ */ new WeakMap();
  /** Registra (ou troca, pelo id) e instala nas instâncias conectadas. */
  register(plugin) {
    this.plugins.set(plugin.id, plugin);
    for (const host of this.connected) this.sync(host);
  }
  /** Tira do registro e das instâncias conectadas que o receberam por ele. */
  unregister(id) {
    if (!this.plugins.delete(id)) return false;
    for (const host of this.connected) this.sync(host);
    return true;
  }
  /** Plugins registrados, na ordem de registro. */
  list() {
    return [...this.plugins.values()];
  }
  /** A instância entrou no documento: recebe os registrados (e perde os que
   *  saíram do registro enquanto estava fora). */
  connect(host) {
    this.connected.add(host);
    this.sync(host);
  }
  disconnect(host) {
    this.connected.delete(host);
  }
  sync(host) {
    let mine = this.installed.get(host);
    if (!mine) this.installed.set(host, mine = /* @__PURE__ */ new Map());
    for (const [id, plugin] of [...mine]) {
      if (this.plugins.get(id) === plugin) continue;
      mine.delete(id);
      this.attempt("uninstall", plugin, () => this.hooks.uninstall(host, plugin));
    }
    for (const plugin of this.plugins.values()) {
      if (mine.has(plugin.id)) continue;
      if (this.attempt("install", plugin, () => this.hooks.install(host, plugin))) mine.set(plugin.id, plugin);
    }
  }
  attempt(what, plugin, fn) {
    try {
      return fn() !== false;
    } catch (e) {
      console.warn(`[${this.hooks.name}] plugin "${plugin.id}": ${what === "install" ? "instala\xE7\xE3o" : "remo\xE7\xE3o"} falhou`, e);
      return false;
    }
  }
};

// ../../../shared/ui/src/color-scheme.ts
var LIGHT = "rgb(0, 0, 1)";
var DARK = "rgb(0, 0, 2)";
var PROBE_CSS = `position:absolute;top:0;left:0;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);pointer-events:none;color:light-dark(${LIGHT},${DARK});background-color:light-dark(${LIGHT},${DARK});transition:background-color 1ms`;
var prefersDark = () => typeof matchMedia === "function" && !!matchMedia("(prefers-color-scheme: dark)")?.matches;
function schemeFromColorScheme(value, osDark = prefersDark()) {
  const t = (value ?? "").trim().toLowerCase().split(/\s+/);
  const light = t.includes("light"), dark = t.includes("dark");
  if (dark && !light) return "dark";
  if (dark && light) return osDark ? "dark" : "light";
  return "light";
}
function schemeFromProbeColor(color) {
  const m = /^rgba?\(\s*0\s*,\s*0\s*,\s*([\d.]+)\s*[,)]/.exec((color ?? "").trim());
  if (!m) return null;
  const b = Number(m[1]);
  if (!(b >= 0.5 && b <= 2.5)) return null;
  return b >= 1.5 ? "dark" : "light";
}
function themeMode(value) {
  return value === "light" || value === "dark" ? value : "auto";
}
function forceColorScheme(root, scheme) {
  let s = root.querySelector("style[data-uo-scheme]");
  if (!scheme) {
    s?.remove();
    return;
  }
  if (!s) {
    s = document.createElement("style");
    s.setAttribute("data-uo-scheme", "");
    root.prepend(s);
  }
  const css = `:host { color-scheme: ${scheme} !important; }`;
  if (s.textContent !== css) s.textContent = css;
}
var ColorSchemeWatcher = class {
  constructor(root, host, onChange) {
    this.root = root;
    this.host = host;
    this.onChange = onChange;
    this.probe = document.createElement("span");
    this.probe.className = "uo-scheme-probe";
    this.probe.setAttribute("aria-hidden", "true");
    this.probe.style.cssText = PROBE_CSS;
  }
  root;
  host;
  onChange;
  probe;
  value = "light";
  read0 = false;
  ac = null;
  ro = null;
  /** Tema efetivo agora (relido se ainda não conectado). */
  get scheme() {
    if (!this.ac) return this.read();
    return this.value;
  }
  get connected() {
    return !!this.ac;
  }
  connect() {
    if (this.ac) return;
    const ac = this.ac = new AbortController();
    const { signal } = ac;
    if (this.probe.parentNode !== this.root) this.root.appendChild(this.probe);
    const refresh = () => {
      this.refresh();
    };
    this.probe.addEventListener("transitionend", refresh, { signal });
    this.probe.addEventListener("transitioncancel", refresh, { signal });
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
    if (mq?.addEventListener) {
      mq.addEventListener("change", refresh);
      signal.addEventListener("abort", () => mq.removeEventListener("change", refresh));
    }
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(refresh);
      this.ro.observe(this.host);
    }
    this.refresh();
  }
  disconnect() {
    this.ac?.abort();
    this.ac = null;
    this.ro?.disconnect();
    this.ro = null;
    this.probe.remove();
  }
  /** Relê o tema; avisa se mudou. Devolve o tema efetivo. */
  refresh() {
    const v = this.read();
    const first = !this.read0;
    this.read0 = true;
    if (v !== this.value) {
      this.value = v;
      if (!first) this.onChange(v);
    }
    return v;
  }
  read() {
    if (typeof getComputedStyle !== "function") return "light";
    const fromProbe = this.probe.isConnected ? schemeFromProbeColor(getComputedStyle(this.probe).color) : null;
    return fromProbe ?? schemeFromColorScheme(getComputedStyle(this.host).colorScheme);
  }
};

// ../viewer/src/controls.ts
var CONTROL_ITEMS = ["nav", "counter", "play", "mute", "thumbnails", "notes", "download", "present", "fullscreen", "progress"];
var CSS = controlsCss("upv") + `
.upv-notes[hidden] { display: none !important; }
.upv-notes-open .uoc-ui { bottom: var(--upv-notes-height, 28%); }
.upv-notes-open > canvas { height: calc(100% - var(--upv-notes-height, 28%)) !important; }
.uoc-hidden .upv-thumbs { opacity: 0; visibility: hidden; transition: opacity .25s, visibility 0s .25s; }
.uoc-hidden.upv-presenting { cursor: none; }
.upv-thumbs {
  position: absolute; left: 0; right: 0; pointer-events: auto;
  bottom: calc(var(--uoc-s) * 3.9 + 6px);
  display: flex; gap: 8px; padding: 8px 12px; overflow-x: auto; scrollbar-width: thin;
  background: var(--upv-thumbnails-bg, rgba(0,0,0,.6));
  transition: opacity .25s, visibility 0s;
}
.upv-thumb {
  all: unset; flex: none; cursor: pointer; position: relative; border-radius: 3px;
  outline: 2px solid transparent; outline-offset: 1px; background: #444;
}
.upv-thumb canvas { display: block; width: 100%; height: 100%; border-radius: 3px; }
.upv-thumb[aria-current="true"] { outline-color: ${cssVar("upv", "progress-color", "#fff")}; }
.upv-thumb:focus-visible { outline-color: var(--uoc-c); }
.upv-thumb span {
  position: absolute; left: 4px; bottom: 3px; padding: 0 4px; border-radius: 3px;
  background: rgba(0,0,0,.6); color: #fff; font: 11px/1.4 system-ui, sans-serif;
}
.upv-notes {
  position: absolute; left: 0; right: 0; bottom: 0; height: var(--upv-notes-height, 28%);
  box-sizing: border-box; overflow: auto; padding: 10px 16px; white-space: pre-wrap;
  background: #1e1e1e; color: #e6e6e6; border-top: 1px solid #333;
  font: 14px/1.5 system-ui, "Segoe UI", sans-serif;
}
.upv-notes:empty::before { content: attr(data-empty); color: #9a9a9a; }
`;
var LABELS = {
  pt: {
    prev: "Slide anterior",
    next: "Pr\xF3ximo slide",
    play: "Reproduzir",
    pause: "Pausar",
    mute: "Desativar som",
    unmute: "Ativar som",
    thumbnails: "Miniaturas",
    notes: "Anota\xE7\xF5es",
    download: "Baixar",
    present: "Apresentar",
    unpresent: "Encerrar apresenta\xE7\xE3o",
    fullscreen: "Tela cheia",
    unfullscreen: "Sair da tela cheia",
    progress: "Progresso",
    slide: "Slide",
    noNotes: "Sem anota\xE7\xF5es neste slide.",
    toolbar: "Controles da apresenta\xE7\xE3o",
    slideOf: (n, m) => `Slide ${n} de ${m}`
  },
  es: {
    prev: "Diapositiva anterior",
    next: "Diapositiva siguiente",
    play: "Reproducir",
    pause: "Pausar",
    mute: "Silenciar",
    unmute: "Activar sonido",
    thumbnails: "Miniaturas",
    notes: "Notas",
    download: "Descargar",
    present: "Presentar",
    unpresent: "Finalizar presentaci\xF3n",
    fullscreen: "Pantalla completa",
    unfullscreen: "Salir de pantalla completa",
    progress: "Progreso",
    slide: "Diapositiva",
    noNotes: "No hay notas en esta diapositiva.",
    toolbar: "Controles de la presentaci\xF3n",
    slideOf: (n, m) => `Diapositiva ${n} de ${m}`
  },
  en: {
    prev: "Previous slide",
    next: "Next slide",
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    thumbnails: "Thumbnails",
    notes: "Notes",
    download: "Download",
    present: "Present",
    unpresent: "End presentation",
    fullscreen: "Full screen",
    unfullscreen: "Exit full screen",
    progress: "Progress",
    slide: "Slide",
    noNotes: "No notes on this slide.",
    toolbar: "Presentation controls",
    slideOf: (n, m) => `Slide ${n} of ${m}`
  }
};
var ViewerControls = class {
  constructor(host, root, wrap) {
    this.host = host;
    this.root = root;
    this.wrap = wrap;
    this.style.textContent = CSS;
    const r = (f) => () => {
      f();
      this.sync();
    };
    this.bar = new ControlBar({
      root,
      wrap,
      counterItem: "counter",
      progressItem: "progress",
      start: [
        { name: "prev", item: "nav", icon: "skip-prev", run: r(() => host.prev()) },
        { name: "play", item: "play", icon: "play", run: r(() => host.togglePlay()) },
        { name: "next", item: "nav", icon: "skip-next", run: r(() => host.next()) },
        { name: "mute", item: "mute", icon: "volume", run: r(() => host.setMuted(!host.isMuted())) },
        "counter"
      ],
      end: [
        { name: "thumbnails", item: "thumbnails", icon: "grid", run: r(() => this.setThumbsOpen(!this.thumbsOpen)) },
        { name: "notes", item: "notes", icon: "notes", run: r(() => this.setNotesOpen(!this.notesOpen)) },
        { name: "download", item: "download", icon: "download", run: r(() => host.download()) },
        { name: "present", item: "present", icon: "present", run: r(() => host.togglePresent()) },
        { name: "fullscreen", item: "fullscreen", icon: "fullscreen", run: r(() => host.toggleFullscreen()) }
      ],
      onStep: (st) => {
        const n = host.count(), i = host.index();
        const to = st === "home" ? 0 : st === "end" ? n - 1 : st === "next" ? i + 1 : st === "prev" ? i - 1 : st === "pagenext" ? i + 5 : i - 5;
        if (n) host.goTo(Math.max(0, Math.min(n - 1, to)));
        this.sync();
      },
      onSeek: (f) => {
        if (host.isPlaying()) host.playFrom(f);
        else {
          const n = host.count();
          if (n) host.goTo(Math.min(n - 1, Math.floor(f * n)));
        }
      },
      keepVisible: () => this.thumbsOpen
    });
    this.thumbs.className = "upv-thumbs";
    this.thumbs.setAttribute("part", "thumbnails");
    this.thumbs.hidden = true;
    this.thumbs.addEventListener("click", (e) => {
      const b = e.target.closest(".upv-thumb");
      if (b) host.goTo(Number(b.dataset["i"]));
    });
    this.notesEl.className = "upv-notes";
    this.notesEl.setAttribute("part", "notes");
    this.notesEl.setAttribute("role", "note");
    this.notesEl.hidden = true;
    this.bar.ui.insertBefore(this.thumbs, this.bar.bar);
    for (const el of [this.thumbs, this.notesEl]) {
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("pointerdown", (e) => e.stopPropagation());
    }
  }
  host;
  root;
  wrap;
  bar;
  thumbs = document.createElement("div");
  notesEl = document.createElement("div");
  style = document.createElement("style");
  thumbsOpen = false;
  notesOpen = false;
  labels = LABELS.en;
  /** Último estado aplicado (evita mexer no DOM a cada quadro da reprodução). */
  last = "";
  thumbsKey = "";
  /** Monta (ou desmonta) a barra conforme `nocontrols` e os `no<item>`. */
  configure(enabled, removed, lang) {
    this.labels = pickLabels(lang, LABELS);
    this.bar.setLabel(this.labels.toolbar);
    this.notesEl.dataset["empty"] = this.labels.noNotes;
    if (enabled && !this.style.isConnected) this.root.appendChild(this.style);
    if (!enabled) {
      this.setThumbsOpen(false);
      this.setNotesOpen(false);
    }
    if (this.bar.configure(enabled, removed)) {
      if (enabled) this.wrap.appendChild(this.notesEl);
      else this.notesEl.remove();
    }
    if (this.bar.isRemoved("thumbnails")) this.setThumbsOpen(false);
    if (this.bar.isRemoved("notes")) this.setNotesOpen(false);
    this.last = "";
    this.sync();
  }
  wake = () => this.bar.wake();
  leave = () => this.bar.leave();
  setThumbsOpen(open) {
    this.thumbsOpen = open;
    this.thumbs.hidden = !open;
    if (open) {
      this.thumbsKey = "";
      this.renderThumbs();
    }
    this.last = "";
  }
  setNotesOpen(open) {
    if (open === this.notesOpen) return;
    this.notesOpen = open;
    this.notesEl.hidden = !open;
    this.wrap.classList.toggle("upv-notes-open", open);
    this.last = "";
  }
  /** Miniaturas (re)pintadas: ao abrir, ao trocar de deck e quando imagens chegam. */
  renderThumbs() {
    if (!this.thumbsOpen) return;
    const n = this.host.count();
    const h = Math.max(48, Math.min(96, Math.round(this.wrap.clientHeight * 0.14)));
    const w = Math.round(h * this.host.slideAspect());
    const key = `${n}:${w}x${h}`;
    if (key !== this.thumbsKey) {
      this.thumbsKey = key;
      this.thumbs.textContent = "";
      for (let i = 0; i < n; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "upv-thumb";
        b.setAttribute("part", "thumbnail");
        b.dataset["i"] = String(i);
        b.style.width = `${w}px`;
        b.style.height = `${h}px`;
        b.setAttribute("aria-label", `${this.labels.slide} ${i + 1}`);
        const cv = document.createElement("canvas");
        const tag = document.createElement("span");
        tag.textContent = String(i + 1);
        b.append(cv, tag);
        this.thumbs.appendChild(b);
      }
    }
    for (const cv of this.thumbs.querySelectorAll("canvas")) {
      this.host.renderThumbnail(Number(cv.parentElement.dataset["i"]), cv);
    }
    this.last = "";
    this.sync();
  }
  /** Reflete o estado do viewer (chamado a cada pintura; só mexe no DOM quando muda). */
  sync() {
    if (!this.bar.enabled) return;
    const h = this.host, L = this.labels, b = this.bar;
    const n = h.count(), i = h.index();
    const playing = h.isPlaying(), presenting = h.isPresenting(), full = h.isFullscreen();
    const frac = h.playbackFraction();
    b.setProgress(n ? frac ?? (i + 1) / n : 0, { label: L.progress, min: 1, max: n, now: i + 1, text: n ? L.slideOf(i + 1, n) : "" });
    const muted = h.isMuted(), media = h.hasMedia(), notes = h.hasNotes();
    const state = [
      n,
      i,
      playing,
      presenting,
      full,
      muted,
      media,
      notes,
      this.thumbsOpen,
      this.notesOpen,
      CONTROL_ITEMS.filter((it) => b.isRemoved(it)).join()
    ].join("|");
    if (state === this.last) return;
    this.last = state;
    b.applyVisibility((it) => n > 0 && (it === "mute" ? media : it === "notes" ? notes : true));
    b.setCounter(n ? `${i + 1} / ${n}` : "");
    b.setButton("prev", { label: L.prev });
    b.setButton("next", { label: L.next });
    b.setButton("play", { label: playing ? L.pause : L.play, icon: playing ? "pause" : "play" });
    b.setButton("mute", { label: muted ? L.unmute : L.mute, icon: muted ? "muted" : "volume" });
    b.setButton("thumbnails", { label: L.thumbnails, pressed: this.thumbsOpen });
    b.setButton("notes", { label: L.notes, pressed: this.notesOpen });
    b.setButton("download", { label: L.download });
    b.setButton("present", { label: presenting ? L.unpresent : L.present, icon: presenting ? "unpresent" : "present" });
    b.setButton("fullscreen", { label: full ? L.unfullscreen : L.fullscreen, icon: full ? "unfullscreen" : "fullscreen" });
    this.wrap.classList.toggle("upv-presenting", presenting);
    if (this.notesOpen) this.notesEl.textContent = h.notes(i);
    for (const t of this.thumbs.children) {
      const cur = Number(t.dataset["i"]) === i;
      t.setAttribute("aria-current", String(cur));
      if (cur && this.thumbsOpen) {
        const s = this.thumbs, l = t.offsetLeft, rr = l + t.offsetWidth;
        if (l < s.scrollLeft) s.scrollLeft = l - 12;
        else if (rr > s.scrollLeft + s.clientWidth) s.scrollLeft = rr - s.clientWidth + 12;
      }
    }
  }
  dispose() {
    this.bar.dispose();
  }
};

// ../viewer/src/a11y.ts
var LABELS2 = {
  pt: {
    slide: (n, m) => `Slide ${n} de ${m}`,
    untitled: "Sem t\xEDtulo",
    presentation: "Apresenta\xE7\xE3o",
    content: "Conte\xFAdo do slide",
    roledesc: "slide",
    image: "Imagem"
  },
  es: {
    slide: (n, m) => `Diapositiva ${n} de ${m}`,
    untitled: "Sin t\xEDtulo",
    presentation: "Presentaci\xF3n",
    content: "Contenido de la diapositiva",
    roledesc: "diapositiva",
    image: "Imagen"
  },
  en: {
    slide: (n, m) => `Slide ${n} of ${m}`,
    untitled: "Untitled",
    presentation: "Presentation",
    content: "Slide content",
    roledesc: "slide",
    image: "Image"
  }
};
var TITLE_PH = /* @__PURE__ */ new Set(["title", "ctrTitle"]);
var SKIP_PH = /* @__PURE__ */ new Set(["sldNum", "dt", "ftr", "hdr"]);
var usefulAlt = (d) => d && !/^[\w .()-]+\.(png|jpe?g|gif|svg|emf|wmf|bmp|tiff?|webp)$/i.test(d.trim()) ? d.trim() : void 0;
var paraText = (p) => p.runs.map((r) => r.text).join("").replace(/\s+/g, " ").trim();
function slideTitle(slide) {
  if (!slide) return "";
  const own = slide.shapes.filter((s) => !s.inherited);
  const t = own.find((s) => s.phType && TITLE_PH.has(s.phType) && s.txBody);
  const text = t?.txBody?.paragraphs.map(paraText).filter(Boolean).join(" ");
  if (text) return text;
  for (const s of own) for (const p of s.txBody?.paragraphs ?? []) {
    const x = paraText(p);
    if (x) return x;
  }
  return "";
}
var SlideA11y = class {
  constructor(canvas, wrap) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.content.style.cssText = SR_ONLY;
    this.content.setAttribute("role", "group");
    this.content.setAttribute("part", "slide-text");
    canvas.setAttribute("role", "img");
    wrap.setAttribute("role", "region");
    wrap.append(this.content, this.live.el);
  }
  canvas;
  wrap;
  /** conteúdo do slide em cena (oculto, na árvore de acessibilidade) */
  content = document.createElement("div");
  live = new LiveRegion();
  labels = LABELS2.en;
  shown = -1;
  skipText = null;
  count = 0;
  setLang(lang) {
    this.labels = pickLabels(lang, LABELS2);
    this.canvas.setAttribute("aria-roledescription", this.labels.roledesc);
    this.shown = -1;
  }
  /** Nome da região do viewer (o arquivo, quando houver). */
  setName(fileName) {
    this.wrap.setAttribute("aria-label", fileName ? `${this.labels.presentation}: ${fileName}` : this.labels.presentation);
  }
  /** Slide em cena mudou (ou o deck): refaz o texto e, se `announce`, anuncia. */
  show(slides, index, announce) {
    if (index === this.shown && slides.length === this.count) return;
    const first = this.shown < 0;
    this.shown = index;
    this.count = slides.length;
    const L = this.labels;
    const slide = slides[index];
    if (!slide) {
      this.canvas.setAttribute("aria-label", L.presentation);
      this.content.textContent = "";
      return;
    }
    const title = slideTitle(slide);
    const where = L.slide(index + 1, slides.length);
    const label = `${where}: ${title || L.untitled}`;
    this.canvas.setAttribute("aria-label", label);
    this.content.setAttribute("aria-label", `${L.content} \u2014 ${where}`);
    this.content.textContent = "";
    const h = document.createElement("h2");
    h.textContent = label;
    this.content.appendChild(h);
    this.skipText = slide.shapes.some((s) => !s.inherited && s.phType && TITLE_PH.has(s.phType) && s.txBody) ? null : title;
    for (const s of slide.shapes) this.appendShape(s);
    if (announce && !first) this.live.announce(label);
  }
  appendShape(s) {
    if (s.inherited || s.phType && (SKIP_PH.has(s.phType) || TITLE_PH.has(s.phType))) return;
    const alt = usefulAlt(s.descr);
    if (alt && (s.image || s.media || !s.txBody?.paragraphs.some((p) => paraText(p)))) {
      const img = document.createElement("div");
      img.setAttribute("role", "img");
      img.setAttribute("aria-label", alt);
      this.content.appendChild(img);
    }
    for (const p of s.txBody?.paragraphs ?? []) {
      const t = paraText(p);
      if (!t) continue;
      if (t === this.skipText) {
        this.skipText = null;
        continue;
      }
      const el = document.createElement("p");
      el.textContent = t;
      this.content.appendChild(el);
    }
    if (s.table) {
      const table = document.createElement("table");
      for (const row of s.table.rows) {
        const tr = document.createElement("tr");
        for (const cell of row.cells) {
          if (cell.hMerge || cell.vMerge) continue;
          const td = document.createElement("td");
          td.textContent = (cell.txBody?.paragraphs ?? []).map(paraText).filter(Boolean).join(" ");
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      this.content.appendChild(table);
    }
  }
};

// ../viewer/src/universal-slides-viewer.ts
var TEXT = {
  en: { endOfShow: "End of slide show, click to exit.", empty: "No .pptx loaded" },
  pt: { endOfShow: "Fim da apresenta\xE7\xE3o de slides. Clique para sair.", empty: "Nenhum .pptx carregado" },
  es: { endOfShow: "Fin de la presentaci\xF3n. Haz clic para salir.", empty: "No se ha cargado ning\xFAn .pptx" }
};
var NO_TIMING = { steps: [], interactive: [], hidden: false };
function picDisplaySize(sh) {
  const x = sh.xfrm;
  if (!x || !(x.cx > 0) || !(x.cy > 0)) return void 0;
  const c = sh.srcRect;
  const fw = c ? Math.max(0.05, 1 - c.l - c.r) : 1, fh = c ? Math.max(0.05, 1 - c.t - c.b) : 1;
  return { w: x.cx / 9525 / fw, h: x.cy / 9525 / fh };
}
var MISSING_FONT_FALLBACKS = ["Calibri", "Aptos"];
var NEXT_KEYS = /* @__PURE__ */ new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "n", "N"]);
var PREV_KEYS = /* @__PURE__ */ new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p", "P"]);
var UniversalSlidesViewerElement = class extends HTMLElement {
  host = this.attachShadow({ mode: "open" });
  canvas = document.createElement("canvas");
  badge = document.createElement("div");
  /** Wrapper que hospeda canvas + badge (+ overlays de subclasses). */
  wrap = document.createElement("div");
  pkg = null;
  pres = null;
  slides = [];
  index = 0;
  /**
   * Cache de decodificacao de imagens (`<p:pic>` + bg image). Chave = `ImageRef.part`
   * (caminho unico no pacote). Reutilizamos entre slides — uma logo repetida em
   * varios slides decodifica UMA vez. Pintamos sem bloquear: enquanto a imagem
   * ainda nao carregou, deixamos o retangulo vazio; um repaint e disparado quando
   * `onload` chega.
   */
  imageCache = /* @__PURE__ */ new Map();
  /** Cache de ChartModel parseado, por XML cru (passado a paintSlideTo). */
  chartCache = /* @__PURE__ */ new Map();
  /**
   * Reprodução automática em curso (`play()`): linha do tempo PURA
   * (slides-core/playback.ts) + relógio. `null` = sem reprodução.
   */
  auto = null;
  /**
   * Apresentação em curso (`present()`): máquina de estados PURA
   * (slides-core/slideshow.ts) + agendamento do próximo quadro. `null` = sem
   * apresentação.
   */
  show = null;
  /** Texto da tela de fim da apresentação (o do PowerPoint, no idioma da interface). */
  get endOfShowText() {
    return pickLabels(this, TEXT).endOfShow;
  }
  /** Canvases de trabalho da transição (origem/destino) na reprodução automática. */
  fromCanvas = null;
  toCanvas = null;
  fromKey = "";
  /** Vídeo/áudio/GIF da reprodução automática. */
  media = new MediaPlayer(() => this.paint());
  static get observedAttributes() {
    return ["src", "nocontrols", ...CONTROL_ITEMS.map((it) => `no${it}`), "lang"];
  }
  /**
   * Barra de controles embutida. O editor (subclasse) tem a própria interface:
   * desliga, e mantém o selo "n / N" no lugar dela.
   */
  controlsBuiltIn() {
    return true;
  }
  controls = null;
  /** Texto acessível do slide em cena + anúncios (leitores de tela). */
  a11y = null;
  /** Bytes do arquivo carregado (botão de download). */
  fileBytes = null;
  /** Caminho da parte de cada slide (anotações) e anotações já lidas. */
  slidePaths = [];
  notesCache = [];
  anyNotes = null;
  constructor() {
    super();
    this.canvas.style.cssText = "display:block;width:100%;height:100%;outline:none;background:#3c3c3c;";
    this.canvas.tabIndex = 0;
    this.badge.style.cssText = "position:absolute;right:10px;bottom:8px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.55);color:#fff;font:600 12px/1.4 Segoe UI,Arial;pointer-events:none;";
    this.wrap.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;";
    this.wrap.appendChild(this.canvas);
    this.wrap.appendChild(this.badge);
    this.host.appendChild(this.wrap);
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("click", this.onClick);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    if (this.controlsBuiltIn()) {
      this.badge.style.display = "none";
      this.canvas.style.background = "var(--upv-background, var(--uo-background, #000))";
      this.controls = new ViewerControls(this.controlsHost(), this.host, this.wrap);
      this.a11y = new SlideA11y(this.canvas, this.wrap);
      this.canvas.style.outline = "";
      const focusCss = document.createElement("style");
      focusCss.textContent = "canvas:focus-visible { outline: 2px solid var(--upv-focus-color, var(--uo-focus-color, #4ea1ff)); outline-offset: -3px; }";
      this.host.appendChild(focusCss);
      this.wrap.addEventListener("pointermove", () => this.controls?.wake());
      this.wrap.addEventListener("pointerdown", () => this.controls?.wake());
      this.wrap.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "mouse") this.controls?.leave();
      });
      this.addEventListener("us-image", () => this.controls?.renderThumbs());
    }
  }
  /** Liga a barra conforme os atributos — no connect e quando eles mudam. */
  configureControls() {
    const lang = uiLang(this);
    this.a11y?.setLang(lang);
    this.a11y?.setName(this.fileName());
    this.controls?.configure(!this.hasAttribute("nocontrols"), CONTROL_ITEMS.filter((it) => this.hasAttribute(`no${it}`)), lang);
  }
  /** Ponte da barra de controles com a API pública do viewer. */
  controlsHost() {
    return {
      count: () => this.slides.length,
      index: () => this.index,
      goTo: (i) => this.selectSlide(i),
      next: () => this.next(),
      prev: () => this.prev(),
      isPlaying: () => this.isPlaying(),
      playbackFraction: () => {
        const a = this.auto;
        if (!a || a.ended || a.tl.durationMs <= 0) return null;
        return Math.max(0, Math.min(1, (this.now() - a.t0) / a.tl.durationMs));
      },
      togglePlay: () => {
        if (this.isPlaying()) {
          this.stopPlayback();
          return;
        }
        this.play({ from: this.index >= this.slides.length - 1 ? 0 : this.index });
      },
      playFrom: (f) => {
        const a = this.auto;
        if (!a || a.ended) return;
        a.t0 = this.now() - f * a.tl.durationMs;
        a.pos = -1;
        this.fromKey = "";
      },
      hasMedia: () => this.slides.some((s) => s.shapes.some((sh) => sh.media)),
      isMuted: () => this.media.muted,
      setMuted: (m) => {
        this.media.setMuted(m);
        this.paint();
      },
      notes: (i) => this.slideNotes(i),
      hasNotes: () => this.anyNotes ??= this.slides.some((_, i) => this.slideNotes(i) !== ""),
      download: () => this.downloadFile(),
      isPresenting: () => this.isPresenting(),
      togglePresent: () => this.show ? this.stopPresentation() : this.present(this.index),
      isFullscreen: () => this.host.fullscreenElement === this.wrap,
      toggleFullscreen: () => this.toggleFullscreen(),
      renderThumbnail: (i, c) => this.renderThumbnail(i, c),
      slideAspect: () => this.pres ? this.pres.slideW / this.pres.slideH : 16 / 9
    };
  }
  /** Anotações do orador do slide `i` (texto puro; lidas sob demanda). */
  getSlideNotes(i) {
    return this.slideNotes(i);
  }
  slideNotes(i) {
    let t = this.notesCache[i];
    if (t === void 0) {
      const path = this.slidePaths[i];
      try {
        t = this.pkg && path ? readSlideNotes(this.pkg, path) : "";
      } catch {
        t = "";
      }
      this.notesCache[i] = t;
    }
    return t;
  }
  /** Tela cheia do viewer (sem apresentar). Na apresentação, sair dela a encerra. */
  toggleFullscreen() {
    if (this.host.fullscreenElement === this.wrap) document.exitFullscreen().catch(() => {
    });
    else if (document.fullscreenEnabled && this.wrap.requestFullscreen) this.wrap.requestFullscreen().catch(() => {
    });
  }
  /**
   * Botão de download: emite `us-download` (cancelável, com os bytes e o
   * nome); se ninguém cancelar, baixa o arquivo original.
   */
  downloadFile() {
    const bytes = this.fileBytes;
    if (!bytes) return;
    const ole = bytes[0] === 208 && bytes[1] === 207;
    const src = this.getAttribute("src");
    let name = "";
    try {
      name = src ? decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() ?? "") : "";
    } catch {
    }
    if (!/\.(pptx|pptm|ppsx|ppsm|potx|ppt|pps)$/i.test(name)) name = `apresentacao.${ole ? "ppt" : "pptx"}`;
    const ev = new CustomEvent("us-download", { cancelable: true, detail: { bytes, filename: name } });
    if (!this.dispatchEvent(ev)) return;
    const type = ole ? "application/vnd.ms-powerpoint" : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  onAnyFullscreenChange = () => {
    this.controls?.wake();
    this.paint();
  };
  resizeObs = null;
  /** Mudança de devicePixelRatio (janela levada a outro monitor): o tamanho CSS não muda, o backing store sim. */
  dprWatch = null;
  /** Geração do carregamento: resposta de `src` antiga não sobrescreve um deck mais novo. */
  loadSeq = 0;
  /** `src` já carregado/pedido (o upgrade do elemento dispara attributeChanged E connected). */
  srcUrl = null;
  connectedCallback() {
    this.resizeObs ??= new ResizeObserver(() => {
      this.resize();
      this.paint();
    });
    this.resizeObs.observe(this.canvas);
    this.watchDpr();
    this.restoreParkedFonts();
    this.unsubscribeFonts ??= this.fontResolver.onChange(() => this.paint());
    this.unsubscribeLang ??= onBrowserLangChange(() => {
      this.configureControls();
      this.paint();
    });
    this.configureControls();
    document.addEventListener("fullscreenchange", this.onAnyFullscreenChange);
    this.resize();
    this.paint();
    document.fonts?.ready.then(() => this.paint()).catch(() => {
    });
    const src = this.getAttribute("src");
    if (src && src !== this.srcUrl) void this.loadSrc(src);
  }
  /**
   * Saiu do documento: nada pode continuar rodando — laços de quadro,
   * timers, áudio/vídeo, URLs de mídia, observadores e as fontes embutidas
   * que ESTE viewer registrou (o editor cria um viewer por apresentação).
   */
  disconnectedCallback() {
    this.resizeObs?.disconnect();
    this.unwatchDpr();
    document.removeEventListener("fullscreenchange", this.onAnyFullscreenChange);
    this.controls?.dispose();
    this.stopPresentation();
    this.stopPlayback();
    this.media.dispose();
    this.parkFonts();
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    this.unsubscribeLang?.();
    this.unsubscribeLang = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (name === "src" && newV && newV !== oldV && this.isConnected && newV !== this.srcUrl) void this.loadSrc(newV);
    else if (name !== "src" && this.isConnected) {
      this.configureControls();
      if (name === "lang") this.paint();
    }
  }
  /**
   * Carrega um .pptx por URL (mesma origem ou CORS liberado). Só a carga MAIS
   * RECENTE vale (`src` trocado de novo ou `loadPptx` direto no meio do
   * download descarta a resposta antiga). Falha → evento `us-error`.
   */
  async loadSrc(url) {
    const seq = ++this.loadSeq;
    this.srcUrl = url;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (seq !== this.loadSeq) return;
      this.loadPptx(bytes);
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.dispatchEvent(new CustomEvent("us-error", { detail: { src: url, error } }));
    }
  }
  watchDpr() {
    this.unwatchDpr();
    const mq = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    if (!mq) return;
    const onChange = () => {
      this.resize();
      this.paint();
      this.watchDpr();
    };
    mq.addEventListener("change", onChange);
    this.dprWatch = { mq, onChange };
  }
  unwatchDpr() {
    if (!this.dprWatch) return;
    this.dprWatch.mq.removeEventListener("change", this.dprWatch.onChange);
    this.dprWatch = null;
  }
  // ───────────────────────── FONTES ─────────────────────────
  // Fontes EMBUTIDAS no arquivo (p:embeddedFontLst) são deste viewer (ciclo de
  // vida do deck); todo o resto — padrão (Liberation Sans, base do atributo
  // `fonts`), fontes do SO/host, instaladas, substitutas abertas — vem do
  // resolvedor ÚNICO dos apps (shared/fonts), o mesmo do Write e do Sheet.
  /** Famílias com FontFace carregado (embutidas/SO/default). */
  loadedFamilyNames = /* @__PURE__ */ new Set();
  defaultFontsInstalled = false;
  /** Fonte padrão (Liberation Sans) pela base do atributo `fonts` — via o
   *  resolvedor único (sem base configurada: o host já registrou @font-face). */
  async installDefaultFonts() {
    if (this.defaultFontsInstalled) return;
    this.defaultFontsInstalled = true;
    this.fontResolver.suggestBaseUrl(this.getAttribute("fonts"));
    const faces = await this.fontResolver.bundledFaces();
    if (!Object.keys(faces).length) return;
    this.loadedFamilyNames.add("Liberation Sans");
    this.paint();
  }
  /** Carregamentos das fontes embutidas do deck atual (ver `fontsReady`). */
  embeddedFontLoads = [];
  /** Decodificação/registro das fontes embutidas (adiado para depois da 1ª pintura). */
  embeddedFontsTask = Promise.resolve();
  /**
   * Faces EMBUTIDAS que este viewer pôs no `document.fonts` (do deck atual).
   * Saem ao trocar de deck (o subset "só caracteres usados" do deck A não
   * pode servir ao deck B) e ao desconectar (voltam se reconectar).
   */
  ownFaces = /* @__PURE__ */ new Set();
  embeddedFamilies = /* @__PURE__ */ new Set();
  parkedFaces = [];
  /** Registra as fontes EMBUTIDAS no pacote (FontFace) e repinta ao carregar. */
  registerEmbeddedFonts(pkg) {
    this.embeddedFontLoads = [];
    for (const f of readEmbeddedFonts(pkg)) {
      const weight = f.weight !== void 0 ? String(f.weight) : f.variant === "bold" || f.variant === "boldItalic" ? "700" : "400";
      const style = f.italic ?? (f.variant === "italic" || f.variant === "boldItalic") ? "italic" : "normal";
      try {
        const buf = f.data.slice().buffer;
        const face = new FontFace(f.family, buf, { weight, style });
        this.embeddedFontLoads.push(face.load().then(() => {
          if (this.pkg !== pkg) return;
          document.fonts.add(face);
          this.ownFaces.add(face);
          this.embeddedFamilies.add(f.family);
          this.loadedFamilyNames.add(f.family);
          this.paint();
        }).catch(() => {
        }));
      } catch {
      }
    }
  }
  /** Tira do documento as faces embutidas deste viewer (troca de deck). */
  releaseFonts() {
    for (const f of this.ownFaces) document.fonts.delete(f);
    this.ownFaces.clear();
    for (const fam of this.embeddedFamilies) this.loadedFamilyNames.delete(fam);
    this.embeddedFamilies.clear();
    this.parkedFaces = [];
  }
  /** Desconectado: as faces saem do documento, guardadas para uma reconexão. */
  parkFonts() {
    for (const f of this.ownFaces) document.fonts.delete(f);
    this.parkedFaces = [...this.ownFaces];
  }
  restoreParkedFonts() {
    for (const f of this.parkedFaces) document.fonts.add(f);
    this.parkedFaces = [];
  }
  /** Resolvedor de fontes ÚNICO dos apps (shared/fonts): host, Local Font
   *  Access, instaladas pelo nome, substitutas abertas, padrão. */
  fontResolver = FontResolver.shared();
  unsubscribeFonts = null;
  unsubscribeLang = null;
  /** Pilha CSS de uma família do texto: a EMBUTIDA no deck, se houver;
   *  senão a que o resolvedor escolheu (vai em `PaintSlideOptions.fontStack`). */
  fontStackFor = (family, bold = false, italic = false) => this.embeddedFamilies.has(family) ? `"${family.replace(/["\\]/g, "\\$&")}", "Liberation Sans", sans-serif` : this.fontResolver.cssStack(family, MISSING_FONT_FALLBACKS, variantOf(bold, italic));
  /**
   * Resolve quando as fontes EMBUTIDAS do deck terminaram de carregar (ou
   * falharam) e o conjunto de fontes do documento assentou — antes disso o
   * texto sai na fonte substituta (miniaturas, export, captura).
   */
  async fontsReady() {
    await this.embeddedFontsTask;
    await Promise.allSettled(this.embeddedFontLoads);
    await document.fonts?.ready;
  }
  /**
   * Resolve as fontes usadas pelo deck (resolvedor único: do host, instaladas,
   * substitutas abertas…); as embutidas no arquivo têm precedência (ver
   * fontStackFor). O aviso de onChange repinta quando chegarem.
   */
  async ensureDeckFonts(pkg) {
    const wanted = collectDeckTypefaces(pkg).filter((fam) => !this.embeddedFamilies.has(fam));
    if (!wanted.length) return;
    await this.fontResolver.resolve(wanted);
    if (this.pkg === pkg) this.paint();
  }
  /** True quando uma subclasse está com edição inline aberta (viewer: nunca). */
  isEditing() {
    return false;
  }
  /** Índice de shape cujo texto NÃO deve ser pintado (edição inline). */
  suppressTextIdx() {
    return void 0;
  }
  /**
   * Carrega bytes .pptx (ou .ppt) e monta os slides. Arquivo inválido LANÇA e
   * o deck atual fica intacto (tudo é lido antes de trocar o estado).
   */
  loadPptx(bytes) {
    const pkg = PptxPackage.load(bytes);
    const pres = readPresentation(pkg);
    const slides = [];
    const paths = [];
    for (const ref of pres.slides) {
      if (!ref.target) continue;
      paths.push(ref.target);
      try {
        slides.push(readSlide(pkg, ref.target));
      } catch {
        slides.push({ shapes: [] });
      }
    }
    this.loadSeq++;
    this.srcUrl = this.getAttribute("src");
    this.stopPresentation();
    this.stopPlayback();
    this.media.dispose();
    this.releaseFonts();
    this.chartCache.clear();
    this.pkg = pkg;
    this.pres = pres;
    this.slides = slides;
    this.slidePaths = paths;
    this.notesCache = [];
    this.anyNotes = null;
    this.fileBytes = bytes;
    void this.installDefaultFonts();
    this.embeddedFontsTask = new Promise((resolve) => setTimeout(() => {
      try {
        if (this.pkg === pkg) this.registerEmbeddedFonts(pkg);
      } catch {
      } finally {
        resolve();
      }
    }, 0));
    void this.ensureDeckFonts(pkg);
    this.imageCache.clear();
    for (const s of this.slides) this.warmSlideImages(s);
    this.index = 0;
    this.resize();
    this.paint();
    this.controls?.renderThumbs();
    this.a11y?.setName(this.fileName());
    this.dispatchEvent(new CustomEvent("us-loaded", { detail: { count: this.slides.length } }));
  }
  /** Imagens de um slide (fundo, pic, preenchimentos, tabelas, gráficos, marcadores) no cache. */
  warmSlideImages(s) {
    if (s.bgImage) this.warmImage(s.bgImage);
    for (const sh of s.shapes) {
      if (sh.image) this.warmImage(sh.image, picDisplaySize(sh));
      if (sh.fillImage) this.warmImage(sh.fillImage);
      if (sh.table) for (const r of tableImages(sh.table)) this.warmImage(r);
      for (const r of Object.values(sh.chartImages ?? {})) this.warmImage(r);
      for (const p of sh.txBody?.paragraphs ?? []) {
        if (p.bulletImage) this.warmImage(p.bulletImage);
        for (const r of p.runs) if (r.fillImage) this.warmImage(r.fillImage);
      }
    }
  }
  // ─────────────── releitura (o editor mudou partes do pacote) ───────────────
  /** Caminho da parte do slide `i` no pacote (o editor grava nela). */
  slidePartPath(i) {
    return this.slidePaths[i];
  }
  /**
   * Relê a lista e TODOS os slides do pacote atual depois de uma edição
   * (slide novo, excluído, movido; desfazer). Fontes, imagens já decodificadas
   * e o estado de reprodução ficam; o slide atual passa a ser `index`.
   */
  rereadDeck(index = this.index) {
    const pkg = this.pkg;
    if (!pkg) return;
    const pres = readPresentation(pkg);
    const slides = [];
    const paths = [];
    for (const ref of pres.slides) {
      if (!ref.target) continue;
      paths.push(ref.target);
      try {
        slides.push(readSlide(pkg, ref.target));
      } catch {
        slides.push({ shapes: [] });
      }
    }
    this.pres = pres;
    this.slides = slides;
    this.slidePaths = paths;
    this.notesCache = [];
    this.anyNotes = null;
    for (const s of slides) this.warmSlideImages(s);
    this.index = Math.max(0, Math.min(index, slides.length - 1));
    this.resize();
    this.paint();
    this.controls?.renderThumbs();
  }
  /** Relê só o slide `i` (texto ou forma editados). */
  rereadSlide(i) {
    const pkg = this.pkg, path = this.slidePaths[i];
    if (!pkg || !path) return;
    try {
      this.slides[i] = readSlide(pkg, path);
    } catch {
      this.slides[i] = { shapes: [] };
    }
    this.notesCache[i] = void 0;
    this.anyNotes = null;
    this.warmSlideImages(this.slides[i]);
    this.paint();
  }
  /** Cor da mesa ao redor do slide no modo de edição (subclasse com tema troca). */
  deskColor() {
    return "#3c3c3c";
  }
  // ───────────────────────── APRESENTAÇÃO ─────────────────────────
  /**
   * APRESENTAÇÃO — o F5 do app de referência: tela cheia, fundo preto, mesmo
   * motor de animação e transições da reprodução automática, mas quem avança
   * é o apresentador (semântica medida no app: `SlideShow`, slides-core/slideshow.ts):
   *  - clique / Espaço / → / ↓ / Enter / PageDown / N (e `next()`): dispara
   *    o próximo passo "ao clicar"; sem passo pendente, o próximo slide;
   *    durante uma transição, conclui a transição;
   *  - ← / ↑ / PageUp / Backspace / P (e `prev()`): desfaz o último passo
   *    (slide com intervalo: rebobina); no início do slide, o anterior no
   *    estado final, pela transição do que sai no sentido contrário;
   *  - Home/End (e `selectSlide(i)`): pula; Esc (ou sair da tela cheia): sai;
   *  - slide com intervalo gravado (`useTimings`): passos e avanço sozinhos;
   *  - depois do último slide, a tela de fim; o próximo comando sai.
   * `from` = slide inicial: índice (um oculto também, se pedido), `'start'` =
   * o F5 "do começo" (1º slide VISÍVEL da faixa) ou ausente = o atual. Emite
   * `us-slide` a cada slide, `us-step` a cada passo e `us-present-end` ao
   * sair (por qualquer motivo). Chamar a partir de um gesto do usuário (a
   * tela cheia exige).
   */
  present(from, opts = {}) {
    if (!this.slides.length) return;
    this.stopPlayback();
    const full = opts.fullscreen ?? true;
    const already = this.host.fullscreenElement === this.wrap;
    this.endShow(full && already);
    const cfg = this.pres?.show ?? {};
    const range = cfg.range;
    const models = this.slides.map((s, i) => range && (i < range[0] || i > range[1]) ? { ...s.timing ?? NO_TIMING, hidden: true } : s.timing);
    const kiosk = opts.kiosk ?? cfg.kiosk ?? false;
    const start = from === "start" ? SlideShow.firstVisible(models) : from ?? this.index;
    const ss = new SlideShow(models, start, this.now(), {
      useTimings: opts.useTimings ?? cfg.useTimings ?? true,
      loop: opts.loop ?? (cfg.loop || kiosk || false),
      animations: opts.animations ?? cfg.showAnimation ?? true
    });
    this.media.mode = "realtime";
    this.media.clock = {};
    for (const s of this.slides) this.media.warmGifs(s);
    this.show = { ss, rafId: 0, timer: 0, fullscreen: full, kiosk };
    this.fromKey = "";
    this.badge.style.display = "none";
    if (full) {
      document.addEventListener("fullscreenchange", this.onFullscreenChange);
      if (!already && document.fullscreenEnabled && this.wrap.requestFullscreen) this.wrap.requestFullscreen().catch(() => {
      });
    }
    this.canvas.focus();
    this.afterShowCommand(-1, -1);
  }
  /** Encerra a apresentação (sai da tela cheia); o viewer fica no slide em cena. */
  stopPresentation() {
    this.endShow(false);
  }
  /** Encerra a apresentação; `keepFullscreen` = outra começa em seguida (sem piscar a tela). */
  endShow(keepFullscreen) {
    const s = this.show;
    if (!s) return;
    if (s.rafId) cancelAnimationFrame(s.rafId);
    if (s.timer) clearTimeout(s.timer);
    this.show = null;
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    if (!keepFullscreen && this.host.fullscreenElement === this.wrap) document.exitFullscreen().catch(() => {
    });
    this.media.stop();
    if (!this.controls) this.badge.style.display = "";
    this.paint();
    this.dispatchEvent(new CustomEvent("us-present-end", { detail: { index: this.index } }));
  }
  isPresenting() {
    return this.show !== null;
  }
  /** Saiu da tela cheia (Esc do navegador…) → a apresentação acaba junto. */
  onFullscreenChange = () => {
    if (this.show?.fullscreen && this.host.fullscreenElement !== this.wrap) this.stopPresentation();
  };
  now() {
    return (window.performance ?? Date).now();
  }
  /** Aplica um comando do apresentador e emite os eventos do que mudou. */
  showCommand(cmd) {
    const s = this.show;
    if (!s) return;
    const index = s.ss.index, step = s.ss.step;
    if (cmd(s.ss, this.now()) === "exit") {
      this.stopPresentation();
      return;
    }
    this.afterShowCommand(index, step);
  }
  /** Eventos `us-slide`/`us-step` (comparando com o estado de antes) e próximo quadro. */
  afterShowCommand(index, step) {
    const s = this.show;
    if (!s) return;
    const ss = s.ss;
    const detail = { index: ss.index, step: ss.step, steps: ss.steps };
    if (ss.index !== index) {
      if (ss.index >= 0) {
        this.index = ss.index;
        this.dispatchEvent(new CustomEvent("us-slide", { detail }));
      }
    } else if (ss.step !== step) {
      this.dispatchEvent(new CustomEvent("us-step", { detail }));
    }
    this.wakeShow();
  }
  /** Pinta já no próximo quadro (cancela a espera agendada). */
  wakeShow() {
    const s = this.show;
    if (!s || s.rafId) return;
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = 0;
    }
    s.rafId = requestAnimationFrame(this.showTick);
  }
  /**
   * Quadro da apresentação: avanço automático vencido, pintura e o próximo
   * agendamento — a cada quadro enquanto algo anima (transição, efeito,
   * mídia), um timer até a próxima mudança agendada, ou nada (parado).
   */
  showTick = () => {
    const s = this.show;
    if (!s) return;
    s.rafId = 0;
    const now = this.now();
    const index = s.ss.index, step = s.ss.step;
    s.ss.update(now);
    if (s.ss.index !== index || s.ss.step !== step) {
      this.afterShowCommand(index, step);
      return;
    }
    this.paint();
    const slide = this.slides[s.ss.index];
    const media = !!slide?.shapes.some((sh) => sh.media || sh.image?.mime === "image/gif");
    const at = media ? now : s.ss.wakeAt(now);
    if (at <= now) s.rafId = requestAnimationFrame(this.showTick);
    else if (Number.isFinite(at)) s.timer = window.setTimeout(() => {
      s.timer = 0;
      this.wakeShow();
    }, at - now);
  };
  /**
   * Inicia a decodificacao de uma ImageRef e dispara um repaint quando carrega.
   * Reentrante: chamadas repetidas para o mesmo `part` reaproveitam o HTMLImageElement.
   */
  warmImage(ref, display) {
    if (this.imageCache.has(ref.part)) return;
    const mk = (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    };
    if (specialImageNeedsPrepare(ref.bytes)) {
      const pending = { img: mk(1, 1), ready: false };
      this.imageCache.set(ref.part, pending);
      void prepareSpecialImage(ref.bytes).catch(() => void 0).then(() => {
        const c = rasterizeSpecialImage(ref.bytes, mk, display);
        if (c) pending.img = c;
        pending.ready = true;
        this.paint();
        this.dispatchEvent(new CustomEvent("us-image", { detail: { part: ref.part } }));
      });
      return;
    }
    const meta = rasterizeSpecialImage(ref.bytes, mk, display);
    if (meta) {
      this.imageCache.set(ref.part, { img: meta, ready: true });
      return;
    }
    const img = new Image();
    const entry = { img, ready: false };
    this.imageCache.set(ref.part, entry);
    const buf = new Uint8Array(ref.bytes);
    const blob = new Blob([buf], { type: ref.mime });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      entry.ready = true;
      this.paint();
      URL.revokeObjectURL(url);
      this.dispatchEvent(new CustomEvent("us-image", { detail: { part: ref.part } }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
  /**
   * Mapa `part → imagem decodificada` para o `paintSlideTo`. Só entram as
   * PRONTAS (paint pula as pendentes; onload dispara repaint). Aproveita para
   * aquecer imagens do slide que ainda não entraram no cache (path raro).
   */
  readyImages(slide) {
    if (slide.bgImage) this.warmImage(slide.bgImage);
    for (const sh of slide.shapes) {
      if (sh.image) this.warmImage(sh.image, picDisplaySize(sh));
      if (sh.fillImage) this.warmImage(sh.fillImage);
      if (sh.table) for (const r of tableImages(sh.table)) this.warmImage(r);
      for (const r of Object.values(sh.chartImages ?? {})) this.warmImage(r);
      for (const p of sh.txBody?.paragraphs ?? []) {
        if (p.bulletImage) this.warmImage(p.bulletImage);
        for (const r of p.runs) if (r.fillImage) this.warmImage(r.fillImage);
      }
    }
    const map = /* @__PURE__ */ new Map();
    for (const [part, e] of this.imageCache) if (e.ready) map.set(part, e.img);
    return map;
  }
  getSlideCount() {
    return this.slides.length;
  }
  getSlideIndex() {
    return this.index;
  }
  /**
   * Vai ao slide `i`. Na apresentação, pula para ele (entra pela transição);
   * na reprodução automática, para a reprodução; na navegação, só troca.
   */
  selectSlide(i) {
    if (this.show) {
      this.showCommand((ss, now) => ss.goTo(i, now));
      return;
    }
    if (this.auto) this.stopPlayback();
    if (i < 0 || i >= this.slides.length || i === this.index) return;
    this.index = i;
    this.paint();
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: i } }));
  }
  /** Próximo — na apresentação, o próximo passo "ao clicar" (ou slide). */
  next() {
    if (this.show) this.showCommand((ss, now) => ss.next(now));
    else this.selectSlide(Math.min(this.slides.length - 1, this.index + 1));
  }
  /** Anterior — na apresentação, desfaz o último passo (ou volta um slide). */
  prev() {
    if (this.show) this.showCommand((ss, now) => ss.prev(now));
    else this.selectSlide(Math.max(0, this.index - 1));
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
  play(opts = {}) {
    this.stopPresentation();
    this.stopPlayback();
    const tl = buildPlaybackTimeline(this.slides.map((s) => s.timing), opts);
    this.media.mode = opts.media ?? "realtime";
    this.media.clock = tl.tickMs > 0 ? { latencyMs: 2 * tl.tickMs, scale: tl.mediaClock } : {};
    for (const s of this.slides) this.media.warmGifs(s);
    const from = opts.from ?? 0;
    const first = tl.slides.find((s) => s.index >= from);
    const now = (window.performance ?? Date).now();
    this.auto = { tl, t0: now - (first?.startMs ?? 0), loop: opts.loop ?? false, rafId: 0, pos: -1, ended: false };
    this.fromKey = "";
    this.badge.style.display = "none";
    const finish = (a) => {
      a.rafId = 0;
      a.ended = true;
      this.media.stop();
      this.dispatchEvent(new CustomEvent("us-playback-end"));
    };
    const tick = () => {
      const a = this.auto;
      if (!a) return;
      const t = (window.performance ?? Date).now() - a.t0;
      if (t >= a.tl.durationMs && a.loop && a.tl.durationMs > 0) a.t0 += a.tl.durationMs;
      this.paint();
      if (t >= a.tl.durationMs && (!a.loop || a.tl.durationMs <= 0)) {
        finish(a);
        return;
      }
      a.rafId = requestAnimationFrame(tick);
    };
    this.paint();
    if (tl.durationMs <= 0) {
      const a = this.auto;
      queueMicrotask(() => {
        if (this.auto === a) finish(a);
      });
      return tl;
    }
    this.auto.rafId = requestAnimationFrame(tick);
    return tl;
  }
  /** Para a reprodução automática; o viewer fica no slide em cena. */
  stopPlayback() {
    if (!this.auto) return;
    if (this.auto.rafId) cancelAnimationFrame(this.auto.rafId);
    this.auto = null;
    this.media.stop();
    if (!this.controls) this.badge.style.display = "";
    this.paint();
  }
  /** Reproduzindo agora (depois do fim, o último quadro fica no palco mas isto é false). */
  isPlaying() {
    return this.auto !== null && !this.auto.ended;
  }
  /** Linha do tempo da reprodução em curso (debug/lab de playback). */
  getPlaybackTimeline() {
    return this.auto?.tl ?? null;
  }
  /** Tempo (ms) da reprodução em curso, ou null. */
  getPlaybackTime() {
    return this.auto ? (window.performance ?? Date).now() - this.auto.t0 : null;
  }
  /**
   * Modo `media: 'seek'` (captura): posiciona vídeos/GIFs do quadro atual no
   * instante exato e espera os quadros decodificados. Devolve uma assinatura
   * das posições (muda quando o quadro de mídia muda).
   */
  async syncMedia() {
    if (!this.auto) return "";
    this.media.resetWanted();
    this.paint();
    await this.media.seekAll();
    return this.media.signature();
  }
  /** Vídeo em tela cheia tocando: cobre o slide inteiro (barras pretas se a proporção diferir). */
  paintFullScreenVideo(ctx, fit) {
    const v = this.media.fullScreen;
    if (!v || !this.pres) return;
    const w = this.pres.slideW * fit.scale, h = this.pres.slideH * fit.scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(fit.ox, fit.oy, w, h);
    const vw = v.videoWidth || w, vh = v.videoHeight || h;
    const k = Math.min(w / vw, h / vh);
    ctx.drawImage(v, fit.ox + (w - vw * k) / 2, fit.oy + (h - vh * k) / 2, vw * k, vh * k);
  }
  /** Canvas de trabalho do tamanho do canvas principal. */
  workCanvas(c) {
    const cv = c ?? document.createElement("canvas");
    if (cv.width !== this.canvas.width) cv.width = this.canvas.width;
    if (cv.height !== this.canvas.height) cv.height = this.canvas.height;
    return cv;
  }
  /**
   * Pinta um slide da linha do tempo num contexto, no tempo de animação
   * `animMs`. `media = false`: vídeo/GIF ficam na capa (imagem congelada).
   */
  paintPlaybackSlide(ctx, ps, animMs, fit, media = true) {
    const slide = this.slides[ps.index];
    if (!slide || !this.pres) return;
    const bg = new Set(slide.timing?.animBg ?? []);
    const actx = { animBg: (spid) => bg.has(spid) };
    const mediaInfo = new Map((slide.timing?.media ?? []).map((m) => [m.spid, m]));
    const bytes = (part) => this.pkg?.getPart(part);
    const hasMedia = media && slide.shapes.some((sh) => sh.media || sh.image?.mime === "image/gif");
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, fit.scale, {
      ox: fit.ox,
      oy: fit.oy,
      fontStack: this.fontStackFor,
      // motor SMIL: cada forma toca os comportamentos gravados no arquivo
      shapeAnim: (sh) => sh.inherited || !ps.effects.length ? null : shapeAnimHooks(
        ps.effects,
        sh.groupIds ? [sh.id, ...sh.groupIds] : [sh.id],
        animMs,
        sh.dgmId ? { ...actx, dgmId: sh.dgmId } : actx
      ),
      // vídeo tocando / quadro do GIF no lugar da capa
      ...hasMedia ? {
        mediaFrame: (sh) => sh.inherited ? null : this.media.frame(sh, ps, animMs, bytes, mediaInfo.get(sh.id)),
        // "ocultar enquanto não estiver tocando" (cMediaNode showWhenStopped="0")
        shapeOpacity: (sh) => {
          const mi = sh.media ? mediaInfo.get(sh.id) : void 0;
          return mi?.showWhenStopped === false && !this.media.isPlaying(sh, ps, animMs, !!mi.loop) ? 0 : 1;
        }
      } : {}
    });
  }
  /** Quadro da reprodução automática: o instante atual da linha do tempo, no palco. */
  paintPlayback(ctx) {
    const a = this.auto;
    const st = this.pres ? playbackStateAt(a.tl, this.now() - a.t0) : null;
    if (st?.slide && st.pos !== a.pos) {
      a.pos = st.pos;
      this.index = st.slide.index;
      const detail = { index: st.slide.index };
      queueMicrotask(() => this.dispatchEvent(new CustomEvent("us-slide", { detail })));
    }
    this.paintStage(
      ctx,
      st?.slide ?? null,
      st?.animMs ?? 0,
      st?.transitionProgress ?? 1,
      st?.from ? { slide: st.from, animMs: Infinity, key: `a${st.from.index}`, media: true } : null
    );
  }
  /** Quadro da apresentação, no palco; na tela de fim, o aviso sobre o preto. */
  paintShow(ctx) {
    const f = this.show.ss.frame(this.now());
    const o = f.from;
    this.paintStage(
      ctx,
      f.slide,
      f.animMs,
      f.transitionProgress,
      o ? { slide: o.slide, animMs: o.animMs, key: `p${o.key}`, media: false } : null
    );
    if (!f.ended) return;
    const W = this.canvas.clientWidth;
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(this.endOfShowText, W / 2, 5);
    ctx.restore();
    this.media.syncRealtime();
  }
  /**
   * PALCO da apresentação e da reprodução: fundo preto, slide encaixado sem
   * margem, no tempo de animação `animMs`. Durante a transição compõe ORIGEM
   * (`from`; null = preto) × DESTINO — `thruBlk` passa pelo preto; corte seco
   * é instantâneo (progresso 1). `from.key` identifica a imagem de origem
   * (pintada uma vez por passagem).
   */
  paintStage(ctx, slide, animMs, progress, from) {
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const fit = this.fit();
    if (!slide || !fit || !this.pres) return;
    this.media.fullScreen = null;
    if (progress >= 1) {
      this.paintPlaybackSlide(ctx, slide, animMs, fit);
      this.paintFullScreenVideo(ctx, fit);
      if (this.media.mode === "realtime") this.media.syncRealtime();
      return;
    }
    const to = this.toCanvas = this.workCanvas(this.toCanvas);
    const tctx = to.getContext("2d");
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.fillStyle = "#000";
    tctx.fillRect(0, 0, W, H);
    this.paintPlaybackSlide(tctx, slide, animMs, fit);
    const fromCv = this.fromCanvas = this.workCanvas(this.fromCanvas);
    const key = `${from?.key ?? "preto"}:${fromCv.width}x${fromCv.height}`;
    if (key !== this.fromKey) {
      const fctx = fromCv.getContext("2d");
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.fillStyle = "#000";
      fctx.fillRect(0, 0, W, H);
      if (from) this.paintPlaybackSlide(fctx, from.slide, from.animMs, fit, from.media);
      this.fromKey = key;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tr = slide.transition ?? { type: "fade", ns: "p", attrs: {}, durMs: 0, advClick: true };
    const rect = {
      x: fit.ox * dpr,
      y: fit.oy * dpr,
      w: this.pres.slideW * fit.scale * dpr,
      h: this.pres.slideH * fit.scale * dpr
    };
    paintTransition(ctx, fromCv, to, tr, progress, rect, this.canvas.width, this.canvas.height);
    ctx.restore();
    if (this.media.mode === "realtime") this.media.syncRealtime();
  }
  /**
   * Pinta o slide `i` num canvas externo (uso: miniaturas da sidebar). Usa o
   * MESMO `paintSlideTo` — uma so fonte de verdade entre slide principal
   * e thumbnail. Retorna `false` se a imagem do slide ainda nao decodificou —
   * o chamador pode escutar `us-loaded`/`us-image` para repintar.
   */
  renderThumbnail(i, target) {
    const slide = this.slides[i];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext("2d");
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
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, scale, { ox, oy, fontStack: this.fontStackFor });
    return true;
  }
  /**
   * Pinta o slide `i` num canvas externo em TAMANHO EXATO: o canvas é
   * redimensionado para `pxWidth × (proporção do slide)` e o slide preenche
   * 100% da área (sem margens/chrome). Uso: export, comparação 1:1 com o
   * app de referência, impressão.
   */
  renderSlideToCanvas(i, target, pxWidth = 1280) {
    const slide = this.slides[i];
    if (!slide || !this.pres) return false;
    const ctx = target.getContext("2d");
    if (!ctx) return false;
    const pxHeight = Math.round(pxWidth * this.pres.slideH / this.pres.slideW);
    if (target.width !== pxWidth) target.width = pxWidth;
    if (target.height !== pxHeight) target.height = pxHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pxWidth, pxHeight);
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, pxWidth / this.pres.slideW, { fontStack: this.fontStackFor });
    return true;
  }
  onKeyDown = (e) => {
    if (this.isEditing()) return;
    if (this.show) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === "Escape") this.stopPresentation();
      else if (k === "F5") {
      } else if (this.show.kiosk) return;
      else if (NEXT_KEYS.has(k)) this.next();
      else if (PREV_KEYS.has(k)) this.prev();
      else if (k === "Home") this.showCommand((ss, now) => ss.first(now));
      else if (k === "End") this.showCommand((ss, now) => ss.last(now));
      else return;
      e.preventDefault();
      return;
    }
    if (this.auto && e.key === "Escape") {
      this.stopPlayback();
      e.preventDefault();
      return;
    }
    if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.toggleFullscreen();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      this.next();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      this.prev();
      e.preventDefault();
    } else if (e.key === "Home") {
      this.selectSlide(0);
      e.preventDefault();
    } else if (e.key === "End") {
      this.selectSlide(this.slides.length - 1);
      e.preventDefault();
    }
  };
  /**
   * Detecta hyperlink na posição (canvas-relativa) e abre URL se houver.
   * v1: o link é "shape-wide" (a primeira run com hyperlink no txBody manda).
   */
  onClick = (e) => {
    if (this.isEditing()) return;
    const hit = this.hitTestHyperlink(e);
    if (hit) {
      window.open(hit, "_blank", "noopener");
      e.preventDefault();
      return;
    }
    if (this.show && !this.show.kiosk && e.button === 0) this.showCommand((ss, now) => ss.next(now, true));
  };
  onMouseMove = (e) => {
    if (this.isEditing()) return;
    this.canvas.style.cursor = this.hitTestHyperlink(e) ? "pointer" : "default";
  };
  /** Devolve a primeira URL de hyperlink sob (clientX, clientY) ou null. */
  hitTestHyperlink(e) {
    if (this.show?.ss.ended) return null;
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i];
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
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }
  /**
   * Geometria de encaixe do slide no canvas (origem + escala EMU→px). No
   * palco (apresentação/reprodução) o slide encosta nas bordas.
   */
  fit() {
    if (!this.pres) return null;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const margin = this.auto || this.show || this.controlsBuiltIn() ? 0 : 16;
    const aw = W - margin * 2, ah = H - margin * 2;
    if (aw <= 0 || ah <= 0) return null;
    const scale = Math.min(aw / this.pres.slideW, ah / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    return { ox: (W - sw) / 2, oy: (H - sh) / 2, scale, sw, sh };
  }
  paint() {
    this.paintFrame();
    this.controls?.sync();
    this.a11y?.show(this.slides, this.index, true);
  }
  /** Nome do arquivo (do `src`), para o leitor de tela e o download. */
  fileName() {
    const src = this.getAttribute("src");
    try {
      return src ? decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() ?? "") || null : null;
    } catch {
      return null;
    }
  }
  paintFrame() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    if (this.auto) {
      this.paintPlayback(ctx);
      return;
    }
    if (this.show) {
      this.paintShow(ctx);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (this.controlsBuiltIn()) ctx.clearRect(0, 0, W, H);
    else {
      ctx.fillStyle = this.deskColor();
      ctx.fillRect(0, 0, W, H);
    }
    const fit = this.fit();
    const slide = this.slides[this.index];
    if (!fit || !slide) {
      ctx.fillStyle = "#bbb";
      ctx.font = "14px Segoe UI, Arial";
      ctx.fillText(pickLabels(this, TEXT).empty, 20, 30);
      this.badge.textContent = "";
      return;
    }
    const paintOpts = { ox: fit.ox, oy: fit.oy, fontStack: this.fontStackFor };
    const suppress = this.suppressTextIdx();
    if (suppress !== void 0) paintOpts.suppressTextShapeIdx = suppress;
    paintSlideTo(ctx, slide, {
      slideW: this.pres.slideW,
      slideH: this.pres.slideH,
      images: this.readyImages(slide),
      charts: this.chartCache
    }, fit.scale, paintOpts);
    if (!this.controlsBuiltIn()) {
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(fit.ox + 0.5, fit.oy + 0.5, fit.sw - 1, fit.sh - 1);
    }
    this.badge.textContent = `${this.index + 1} / ${this.slides.length}`;
  }
};
customElements.define("universal-slides-viewer", UniversalSlidesViewerElement);

// src/history.ts
function snapshot(pkg) {
  const m = /* @__PURE__ */ new Map();
  for (const n of pkg.partNames()) m.set(n, pkg.getPart(n));
  return m;
}
function changedSince(pkg, snap) {
  const names = pkg.partNames();
  if (names.length !== snap.size) return true;
  for (const n of names) if (snap.get(n) !== pkg.getPart(n)) return true;
  return false;
}
function restore(pkg, snap) {
  for (const n of pkg.partNames()) if (!snap.has(n)) pkg.removePart(n);
  for (const [n, bytes] of snap) if (pkg.getPart(n) !== bytes) pkg.setPart(n, bytes);
}
var EditHistory = class {
  constructor(limit = 100) {
    this.limit = limit;
  }
  limit;
  steps = [];
  /** quantos passos estão aplicados (o resto é o que dá para refazer) */
  pos = 0;
  /** posição gravada no último salvar (null = o arquivo salvo saiu do histórico) */
  savedPos = 0;
  push(label, before, after, stateBefore, stateAfter) {
    this.steps.length = this.pos;
    if (this.savedPos !== null && this.savedPos > this.pos) this.savedPos = null;
    this.steps.push({ label, before, after, stateBefore, stateAfter });
    this.pos++;
    if (this.steps.length > this.limit) {
      this.steps.shift();
      this.pos--;
      if (this.savedPos !== null) this.savedPos = this.savedPos > 0 ? this.savedPos - 1 : null;
    }
  }
  canUndo() {
    return this.pos > 0;
  }
  canRedo() {
    return this.pos < this.steps.length;
  }
  undoLabel() {
    return this.pos > 0 ? this.steps[this.pos - 1].label : null;
  }
  redoLabel() {
    return this.pos < this.steps.length ? this.steps[this.pos].label : null;
  }
  /** Desfaz: devolve o instantâneo e o estado de antes do passo. */
  undo() {
    if (!this.canUndo()) return null;
    const s = this.steps[--this.pos];
    return { snap: s.before, state: s.stateBefore };
  }
  redo() {
    if (!this.canRedo()) return null;
    const s = this.steps[this.pos++];
    return { snap: s.after, state: s.stateAfter };
  }
  /** Zera (documento novo/aberto). */
  clear() {
    this.steps = [];
    this.pos = 0;
    this.savedPos = 0;
  }
  markSaved() {
    this.savedPos = this.pos;
  }
  get dirty() {
    return this.savedPos !== this.pos;
  }
};

// src/edit-surface.ts
function shapeRect(sh, fit) {
  const x = sh.xfrm;
  if (!x) return null;
  return { x: fit.ox + x.x * fit.scale, y: fit.oy + x.y * fit.scale, w: x.cx * fit.scale, h: x.cy * fit.scale, rot: (x.rot ?? 0) / 6e4 };
}
function unrotate(r, px, py) {
  if (!r.rot) return [px, py];
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const a = -r.rot * Math.PI / 180;
  const dx = px - cx, dy = py - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
function selectable(sh) {
  return !sh.inherited && !sh.dgmId && !sh.dgmTextOf && !!sh.xfrm;
}
function hitShape(slide, px, py, fit) {
  for (let i = slide.shapes.length - 1; i >= 0; i--) {
    const sh = slide.shapes[i];
    if (!selectable(sh)) continue;
    const r = shapeRect(sh, fit);
    const [x, y] = unrotate(r, px, py);
    const pad = 4;
    if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return i;
  }
  return -1;
}
var HANDLES = [["nw", 0, 0], ["n", 0.5, 0], ["ne", 1, 0], ["e", 1, 0.5], ["se", 1, 1], ["s", 0.5, 1], ["sw", 0, 1], ["w", 0, 0.5]];
var HANDLE_CURSOR = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
function hitHandle(r, px, py) {
  if (r.rot) return null;
  for (const [h, fx, fy] of HANDLES) {
    if (Math.abs(px - (r.x + r.w * fx)) <= 6 && Math.abs(py - (r.y + r.h * fy)) <= 6) return h;
  }
  return null;
}
function resizeFrame(f, h, dx, dy, keepRatio) {
  let { x, y, cx, cy } = f;
  const min = 12700 * 4;
  if (h.includes("w")) {
    x += dx;
    cx -= dx;
  }
  if (h.includes("e")) cx += dx;
  if (h.includes("n")) {
    y += dy;
    cy -= dy;
  }
  if (h.includes("s")) cy += dy;
  if (keepRatio && f.cx > 0 && f.cy > 0 && h.length === 2) {
    const k = Math.max(cx / f.cx, cy / f.cy);
    const ncx = f.cx * k, ncy = f.cy * k;
    if (h.includes("w")) x = f.x + f.cx - ncx;
    if (h.includes("n")) y = f.y + f.cy - ncy;
    cx = ncx;
    cy = ncy;
  }
  if (cx < min) {
    if (h.includes("w")) x -= min - cx;
    cx = min;
  }
  if (cy < min) {
    if (h.includes("n")) y -= min - cy;
    cy = min;
  }
  return { x, y, cx, cy };
}
function drawSelection(ctx, r, color, handles) {
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
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
var TEXT_TYPES = /* @__PURE__ */ new Set([void 0, "title", "ctrTitle", "subTitle", "body", "obj"]);
var FOOTER_TYPES = /* @__PURE__ */ new Set(["dt", "ftr", "sldNum", "hdr"]);
function isEmptyPlaceholder(sh) {
  if (sh.inherited || sh.phType === void 0 && sh.phIdx === void 0 || FOOTER_TYPES.has(sh.phType ?? "")) return false;
  if (sh.image || sh.table || sh.chartXml) return false;
  return !(sh.txBody?.paragraphs ?? []).some((p) => p.runs.some((r) => r.text.trim() !== ""));
}
function drawPrompts(ctx, slide, fit, L, fontStack, skip) {
  slide.shapes.forEach((sh, i) => {
    if (i === skip || !isEmptyPlaceholder(sh)) return;
    const r = shapeRect(sh, fit);
    if (!r || r.w < 4 || r.h < 4) return;
    ctx.save();
    ctx.strokeStyle = "rgba(128,128,128,.85)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
    const t = sh.phType;
    const text = t === "title" || t === "ctrTitle" ? L.title : t === "subTitle" ? L.subtitle : TEXT_TYPES.has(t) ? t === void 0 && !sh.txBody ? L.object : L.text : t === "pic" ? L.picture : L.object;
    const p = sh.txBody?.paragraphs[0];
    const pt = p?.endSz ?? (t === "title" || t === "ctrTitle" ? 44 : 24);
    const px = Math.max(6, Math.min(r.h * 0.8, pt * 12700 * fit.scale * (sh.txBody?.fontScale ?? 1)));
    ctx.font = `${px}px ${fontStack}`;
    ctx.fillStyle = "rgba(110,110,110,.95)";
    const algn = p?.align ?? (t === "ctrTitle" || t === "subTitle" ? "ctr" : "l");
    ctx.textAlign = algn === "ctr" ? "center" : algn === "r" ? "right" : "left";
    const anchor = sh.txBody?.anchor ?? (t === "ctrTitle" ? "b" : t === "title" ? "ctr" : "t");
    ctx.textBaseline = anchor === "b" ? "bottom" : anchor === "ctr" ? "middle" : "top";
    const pad = 0.1 * 914400 * fit.scale;
    const tx = algn === "ctr" ? r.x + r.w / 2 : algn === "r" ? r.x + r.w - pad : r.x + pad;
    const ty = anchor === "b" ? r.y + r.h - pad / 2 : anchor === "ctr" ? r.y + r.h / 2 : r.y + pad / 2;
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.fillText(text, tx, ty, Math.max(10, r.w - pad * 2));
    ctx.restore();
  });
}

// src/universal-slides.ts
var XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
var unescXml = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : XML_ENTITIES[e.toLowerCase()]);
var PROMPTS = {
  en: { title: "Click to add title", subtitle: "Click to add subtitle", text: "Click to add text", picture: "Picture", object: "Content" },
  pt: { title: "Clique para adicionar um t\xEDtulo", subtitle: "Clique para adicionar um subt\xEDtulo", text: "Clique para adicionar texto", picture: "Imagem", object: "Conte\xFAdo" },
  es: { title: "Haz clic para agregar t\xEDtulo", subtitle: "Haz clic para agregar subt\xEDtulo", text: "Haz clic para agregar texto", picture: "Imagen", object: "Contenido" }
};
var CHROME_ATTRS = /* @__PURE__ */ new Set(["topbar", "bottombar", "toolbar", "hidden-commands"]);
var UniversalSlidesElement = class _UniversalSlidesElement extends UniversalSlidesViewerElement {
  /** Editor inline da shape de texto (criado em `beginEditShape`). */
  editor = null;
  editingShape = null;
  /** Opção "incorporar fontes no arquivo" desta apresentação (lida do
   *  presentation.xml ao abrir; padrões do PowerPoint num deck sem a opção). */
  fontEmbedding = { ...DEFAULT_EMBEDDING.slides };
  fontEmbeddingTouched = false;
  /** Desfazer/refazer por instantâneo do pacote. */
  history = new EditHistory(100);
  /** Forma selecionada (índice no slide atual) — só com a interface embutida. */
  selected = null;
  /** Interface embutida ligada: seleção por clique, arrastar, alças, teclas. */
  interactive = false;
  /** Zoom (1 = tamanho real a 96 dpi); null = ajustar à janela. */
  zoomLevel = null;
  pan = { x: 0, y: 0 };
  deskCss = "#3c3c3c";
  /** Nome do documento (sem extensão) e onde o host o guarda. */
  docName = "";
  /** @internal onde o host guarda o arquivo (Electron: caminho) — volta no saveFile. */
  documentPath = null;
  /** Integração opcional com o app hospedeiro (Electron/PWA) — ver UniversalSlidesHost. */
  appHost = null;
  colorScheme;
  constructor() {
    super();
    this.canvas.addEventListener("dblclick", this.onDblClick);
    this.badge.classList.add("us-badge");
    this.colorScheme = new ColorSchemeWatcher(this.host, this, (theme) => {
      this.readDesk();
      this.paint();
      this.dispatchEvent(new CustomEvent("us-theme-change", { detail: { theme } }));
    });
    this.wrap.addEventListener("pointerdown", this.onSurfaceDown, true);
    this.wrap.addEventListener("mousemove", this.onSurfaceHover, true);
    this.wrap.addEventListener("click", this.onSurfaceClick, true);
    this.wrap.addEventListener("dblclick", this.onSurfaceDblClick, true);
    this.wrap.addEventListener("keydown", this.onSurfaceKey, true);
    this.wrap.addEventListener("wheel", this.onSurfaceWheel, { capture: true, passive: false });
  }
  // ───────────────────────── atributos e ciclo de vida ─────────────────────────
  static get observedAttributes() {
    return [...super.observedAttributes, ...CHROME_ATTRS, "theme"];
  }
  attributeChangedCallback(name, oldV, newV) {
    if (name === "theme") {
      this.applyColorScheme();
      return;
    }
    if (CHROME_ATTRS.has(name)) {
      if (this.isConnected) void this.updateChrome();
      return;
    }
    super.attributeChangedCallback(name, oldV, newV);
    if (name === "lang" && this.isConnected && this.chromeActive()) void this.updateChrome();
  }
  connectedCallback() {
    super.connectedCallback();
    _UniversalSlidesElement.registry.connect(this);
    this.applyColorScheme();
    this.unsubscribeChromeLang ??= onBrowserLangChange(() => {
      if (!this.hasAttribute("lang") && this.chromeActive()) void this.updateChrome();
    });
    if (this.chromeActive()) void this.updateChrome();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    _UniversalSlidesElement.registry.disconnect(this);
    this.unsubscribeChromeLang?.();
    this.unsubscribeChromeLang = null;
    if (this.chromeLoaded) void import("./chunks/chrome-CSHXZ6MH.js").then((m) => {
      if (!this.isConnected) m.teardownChrome(this);
    });
  }
  unsubscribeChromeLang = null;
  /** Barra superior (menus/ferramentas, painel de miniaturas e anotações). */
  get topbar() {
    return this.hasAttribute("topbar");
  }
  set topbar(v) {
    this.toggleAttribute("topbar", v);
  }
  /** Barra de status (slide n de N, anotações, modos de exibição, zoom). */
  get bottombar() {
    return this.hasAttribute("bottombar");
  }
  set bottombar(v) {
    this.toggleAttribute("bottombar", v);
  }
  chromeActive() {
    return this.topbar || this.bottombar;
  }
  chromeReq = 0;
  chromeLoaded = false;
  chromeSync = null;
  /** (Re)monta as barras conforme os atributos (carregadas sob demanda). */
  async updateChrome() {
    const req = ++this.chromeReq;
    if (!this.chromeActive()) {
      if (!this.chromeLoaded) return;
      const m2 = await import("./chunks/chrome-CSHXZ6MH.js");
      if (req === this.chromeReq) m2.teardownChrome(this);
      return;
    }
    const m = await import("./chunks/chrome-CSHXZ6MH.js");
    if (req !== this.chromeReq || !this.isConnected) return;
    this.chromeLoaded = true;
    const lang = uiLang(this);
    const handle = m.setupChrome(this, {
      topbar: this.topbar,
      bottombar: this.bottombar,
      lang,
      contributions: this.toolbarContributions(lang, m.barKit)
    });
    this.chromeSync = handle.sync;
    this.chromeNotice = handle.setNotice;
    if (this.noticeState) handle.setNotice(this.noticeState.el, this.noticeState.tone);
  }
  chromeNotice = null;
  noticeState = null;
  /**
   * Faixa de aviso do hospedeiro, entre a linha de título/menus e as
   * ferramentas (como o <universal-write>). Sobrevive à troca de barra e de
   * idioma; só aparece com `topbar`. `null` tira o aviso.
   */
  setNotice(el, options = {}) {
    this.noticeState = el ? { el, tone: options.tone ?? "info" } : null;
    this.chromeNotice?.(el, options.tone);
  }
  /** Elemento do aviso atual (setNotice), ou null. */
  get notice() {
    return this.noticeState?.el ?? null;
  }
  /** @internal as barras montaram/desmontaram: superfície de edição e tema. */
  setChromeMounted(on) {
    this.interactive = on;
    if (on) {
      this.colorScheme.connect();
      this.readDesk();
    } else {
      this.colorScheme.disconnect();
      this.deskCss = "#3c3c3c";
      this.selected = null;
      this.chromeSync = null;
      this.chromeNotice = null;
      this.zoomLevel = null;
    }
    this.resize();
    this.paint();
  }
  /** @internal partes do shadow DOM que as barras rearranjam. */
  chromeParts() {
    return { root: this.host, wrap: this.wrap, canvas: this.canvas };
  }
  /** Lê a cor da mesa (fundo do palco, `--us-desk`) para o canvas. */
  readDesk() {
    if (!this.interactive || typeof getComputedStyle !== "function") return;
    const v = getComputedStyle(this.wrap).backgroundColor;
    if (v && v !== "rgba(0, 0, 0, 0)" && v !== "transparent") this.deskCss = v;
  }
  deskColor() {
    return this.interactive ? this.deskCss : super.deskColor();
  }
  // ───────────────────────── claro/escuro ─────────────────────────
  /** Tema efetivo da interface ('light' | 'dark'), pelo `color-scheme` do contexto ou `theme`. */
  get effectiveTheme() {
    return this.colorScheme.connected ? this.colorScheme.scheme : this.colorScheme.refresh();
  }
  uiColorMode = null;
  /** @internal barras: a escolha do menu Exibir › Tema (null = herdar o contexto). */
  setUiColorMode(mode) {
    this.uiColorMode = mode;
    this.applyColorScheme();
  }
  /** `theme` (ou a escolha do menu) → `color-scheme` no host; `auto`/ausente herda. */
  applyColorScheme() {
    const attr = this.getAttribute("theme");
    const m = attr !== null ? attr : this.uiColorMode;
    const t = themeMode(m);
    forceColorScheme(this.host, t === "auto" ? null : t);
    if (this.colorScheme.connected) this.colorScheme.refresh();
  }
  // ───────────────────────── plugins ─────────────────────────
  static registry = new PluginRegistry({
    name: "universal-slides",
    install: (el, plugin) => {
      if (el.plugins.has(plugin.id)) return false;
      el.use(plugin);
      return true;
    },
    uninstall: (el, plugin) => {
      if (el.plugins.get(plugin.id) === plugin) el.unuse(plugin.id);
    }
  });
  /** Registra um plugin para TODAS as instâncias (como o `Quill.register`). */
  static register(plugin) {
    _UniversalSlidesElement.registry.register(plugin);
  }
  /** Tira um plugin do registro global e das instâncias que o receberam por ele. */
  static unregister(id) {
    return _UniversalSlidesElement.registry.unregister(id);
  }
  plugins = /* @__PURE__ */ new Map();
  pluginCleanups = /* @__PURE__ */ new Map();
  /** Instala um plugin nesta instância. */
  use(plugin) {
    if (!plugin.id.trim()) throw new Error("plugin.id is required");
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    this.plugins.set(plugin.id, plugin);
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      throw error;
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    this.dispatchEvent(new CustomEvent("us-plugin-added", { detail: { id: plugin.id } }));
  }
  /** Remove o plugin (e os itens dele nas barras). */
  unuse(id) {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    try {
      this.pluginCleanups.get(id)?.();
    } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
    }
    if (plugin.toolbar && this.chromeSync) void this.updateChrome();
    this.dispatchEvent(new CustomEvent("us-plugin-removed", { detail: { id } }));
    return true;
  }
  pluginIds() {
    return [...this.plugins.keys()];
  }
  toolbarContributions(lang, ui) {
    const out = [];
    const kit = { ...ui, createBarButton: (o) => ui.createBarButton({ lang, ...o }) };
    for (const plugin of this.plugins.values()) {
      if (!plugin.toolbar) continue;
      try {
        out.push(plugin.toolbar({ editor: this, lang, theme: this.effectiveTheme, ui: kit }));
      } catch (e) {
        console.warn(`[universal-slides] plugin "${plugin.id}": toolbar falhou`, e);
      }
    }
    return out;
  }
  hiddenCommandList = null;
  /**
   * Ids ocultos nas barras, menus e atalhos — comandos (`new`, `open`,
   * `print`…), menus (`file`), grupos e guias. Atributo `hidden-commands`
   * (vírgula ou espaço) ou esta propriedade.
   */
  get hiddenCommands() {
    return this.hiddenCommandList ?? (this.getAttribute("hidden-commands") ?? "").split(/[\s,]+/).filter(Boolean);
  }
  set hiddenCommands(ids) {
    this.hiddenCommandList = [...ids];
    if (this.chromeActive() && this.isConnected) void this.updateChrome();
  }
  // ───────────────────────── documento ─────────────────────────
  loadPptx(bytes) {
    if (this.editor) this.cancelEditShape();
    super.loadPptx(bytes);
    if (this.pkg) this.fontEmbedding = { ...DEFAULT_EMBEDDING.slides, ...readPptxEmbedding(this.pkg).settings };
    this.fontEmbeddingTouched = false;
    this.history.clear();
    this.selected = null;
    this.pan = { x: 0, y: 0 };
    this.notifyDirty();
  }
  /**
   * Abre uma apresentação como o Arquivo › Abrir das barras: carrega, dá o
   * nome (título) e guarda onde o host a mantém (`path`, para "Salvar").
   * .ppt é convertido para .pptx. Lança se os bytes não são uma apresentação.
   */
  openPresentation(bytes, opts = {}) {
    this.loadPptx(bytes);
    this.documentPath = opts.path ?? null;
    this.documentName = (opts.name ?? "").replace(/\.(pptx|pptm|ppsx|ppsm|potx|ppt|pps)$/i, "");
  }
  /** Apresentação nova em branco (um slide de título vazio). */
  newPresentation(opts = {}) {
    this.loadPptx(blankDeck({ aspect: opts.aspect, lang: this.textLang() }));
    this.documentPath = null;
    this.documentName = "";
  }
  /** Nome da apresentação (sem extensão) — o título das barras e o nome sugerido ao salvar. */
  get documentName() {
    return this.docName;
  }
  set documentName(v) {
    if (v === this.docName) return;
    this.docName = v;
    this.dispatchEvent(new CustomEvent("us-title-change", { detail: { name: v } }));
  }
  /** Há alterações não salvas (desde a abertura ou o último `markClean()`). */
  isDirty() {
    return this.history.dirty || this.fontEmbeddingTouched;
  }
  /** O documento foi salvo pelo hospedeiro: o estado atual passa a ser o "limpo". */
  markClean() {
    this.history.markSaved();
    this.fontEmbeddingTouched = false;
    this.notifyDirty();
  }
  lastDirty = false;
  notifyDirty() {
    const d = this.isDirty();
    if (d === this.lastDirty) return;
    this.lastDirty = d;
    this.dispatchEvent(new CustomEvent("us-dirty", { detail: { dirty: d } }));
  }
  /** Idioma gravado no texto novo (`lang` dos runs): o da interface. */
  textLang() {
    return uiLocale(uiLang(this));
  }
  // ───────────────────────── fontes no arquivo ─────────────────────────
  /** Opção "incorporar fontes no arquivo" desta apresentação. */
  getFontEmbedding() {
    return { ...this.fontEmbedding };
  }
  /** Muda a opção (vale no próximo `savePptx`). */
  setFontEmbedding(settings) {
    this.fontEmbedding = { ...this.fontEmbedding, ...settings };
    this.fontEmbeddingTouched = true;
    this.notifyDirty();
  }
  /**
   * Bytes do .pptx com a opção de fontes aplicada (resolvedor único + gravação
   * em shared/fonts), sobre uma CÓPIA do pacote — o resto segue byte a byte.
   * Ligada: acrescenta as famílias usadas que ainda não estão no arquivo (as 4
   * variantes, como o PowerPoint); desligada: tira as incorporadas. O que
   * ficou de fora vai no evento `us-font-embedding`.
   */
  async savePptx() {
    if (!this.pkg) throw new Error("No presentation loaded");
    if (this.editor) this.commitEditShape();
    const pkg = PptxPackage.load(this.pkg.save());
    const settings = this.fontEmbedding;
    let plan = { faces: [], skipped: [] };
    if (settings.embed) {
      plan = await planFontEmbedding(this.fontResolver, deckFontUsage(pkg), settings, "slides", {
        alreadyEmbedded: readPptxEmbedding(pkg).embedded
      });
    }
    writePptxEmbedding(pkg, plan, settings);
    this.dispatchEvent(new CustomEvent("us-font-embedding", {
      detail: {
        embedded: [...new Set(plan.faces.map((f) => f.family))],
        skipped: plan.skipped.filter((s) => s.reason !== "already-embedded")
      }
    }));
    return pkg.save();
  }
  /** O editor tem a própria interface: sem a barra de controles do viewer. */
  controlsBuiltIn() {
    return false;
  }
  isEditing() {
    return this.editingShape !== null;
  }
  suppressTextIdx() {
    return this.editingShape && this.editingShape.slide === this.index ? this.editingShape.shapeIdx : void 0;
  }
  selectSlide(i) {
    if (this.editingShape) this.commitEditShape();
    if (i !== this.index) this.selected = null;
    super.selectSlide(i);
  }
  // ───────────────────────── edição: passo de desfazer ─────────────────────────
  editState() {
    const sh = this.selected !== null ? this.slides[this.index]?.shapes[this.selected] : void 0;
    return { index: this.index, shapeId: sh && !sh.inherited ? sh.id : null };
  }
  /** Seleciona pelo id da forma no slide atual (depois de reler o modelo). */
  selectById(id) {
    if (id === null) {
      this.selected = null;
      return;
    }
    const i = this.slides[this.index]?.shapes.findIndex((s) => !s.inherited && s.id === id) ?? -1;
    this.selected = i >= 0 ? i : null;
  }
  /**
   * Executa uma edição do pacote como UM passo de desfazer e relê o modelo:
   * só o slide atual (`reread: 'slide'`), um slide (`number`) ou a
   * apresentação inteira (`'deck'`). `then` = slide atual e forma selecionada depois.
   */
  edit(label, fn, reread = "slide", then = {}) {
    const pkg = this.pkg;
    if (!pkg) return void 0;
    if (this.editor && label !== "typing") this.commitEditShape();
    const before = snapshot(pkg);
    const stateBefore = this.editState();
    const result = fn(pkg);
    if (!changedSince(pkg, before)) return result;
    const keep = then.select !== void 0 ? then.select : stateBefore.shapeId;
    if (reread === "deck") this.rereadDeck(then.index ?? this.index);
    else this.rereadSlide(typeof reread === "number" ? reread : this.index);
    if (then.index !== void 0 && reread !== "deck") this.index = then.index;
    this.selectById(keep);
    this.history.push(label, before, snapshot(pkg), stateBefore, this.editState());
    this.afterEdit(label);
    return result;
  }
  afterEdit(kind) {
    this.paint();
    this.dispatchEvent(new CustomEvent("us-change", { detail: { kind, index: this.index } }));
    this.notifyDirty();
  }
  canUndo() {
    return this.history.canUndo();
  }
  canRedo() {
    return this.history.canRedo();
  }
  /** Desfaz a última edição. */
  undo() {
    if (this.editor) {
      this.commitEditShape();
    }
    const u = this.history.undo();
    if (!u || !this.pkg) return;
    restore(this.pkg, u.snap);
    this.rereadDeck(u.state.index);
    this.selectById(u.state.shapeId);
    this.afterEdit("undo");
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
  }
  /** Refaz a edição desfeita. */
  redo() {
    if (this.editor) this.commitEditShape();
    const r = this.history.redo();
    if (!r || !this.pkg) return;
    restore(this.pkg, r.snap);
    this.rereadDeck(r.state.index);
    this.selectById(r.state.shapeId);
    this.afterEdit("redo");
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
  }
  /** Caminho do slide `i` (lança se não existe). */
  slidePath(i = this.index) {
    const p = this.slidePartPath(i);
    if (!p) throw new Error(`slide ${i} inexistente`);
    return p;
  }
  // ───────────────────────── slides ─────────────────────────
  /** Layouts da apresentação (de todos os masters). */
  getLayouts() {
    return this.pkg ? listLayouts(this.pkg) : [];
  }
  /** Layout (caminho da parte) do slide `i`. */
  getSlideLayout(i = this.index) {
    const p = this.slidePartPath(i);
    return this.pkg && p ? layoutOf(this.pkg, p) : void 0;
  }
  /**
   * Slide novo DEPOIS do atual, a partir de `layout` (caminho; padrão: o
   * layout do slide atual — depois de um Slide de Título, o "Título e
   * Conteúdo", como o app). Vira o slide atual; devolve o índice.
   */
  addSlide(layout) {
    if (!this.pkg) this.newPresentation();
    const at = this.slides.length ? this.index + 1 : 0;
    const path = layout ?? this.defaultNewLayout();
    if (!path) return -1;
    this.edit("newSlide", (pkg) => addSlide(pkg, at, path, this.textLang()), "deck", { index: at, select: null });
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
    return at;
  }
  defaultNewLayout() {
    const layouts = this.getLayouts();
    const cur = this.getSlideLayout();
    const info = layouts.find((l) => l.path === cur);
    if (info?.type === "title") {
      const next = layouts.find((l) => l.master === info.master && l.type === "obj") ?? layouts.find((l) => l.master === info.master && l.type === "tx");
      if (next) return next.path;
    }
    return cur ?? layouts.find((l) => l.type === "obj")?.path ?? layouts[0]?.path;
  }
  /** Duplica o slide `i` (com as anotações) logo depois dele. Devolve o índice da cópia. */
  duplicateSlide(i = this.index) {
    if (!this.slidePartPath(i)) return -1;
    this.edit("duplicateSlide", (pkg) => duplicateSlide(pkg, i), "deck", { index: i + 1, select: null });
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
    return i + 1;
  }
  /** Exclui o slide `i`. */
  deleteSlide(i = this.index) {
    if (!this.slidePartPath(i)) return;
    const next = Math.max(0, Math.min(i, this.slides.length - 2));
    this.edit("deleteSlide", (pkg) => deleteSlide(pkg, i), "deck", { index: next, select: null });
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
  }
  /** Move o slide de `from` para `to`. */
  moveSlide(from, to) {
    if (from === to || !this.slidePartPath(from) || to < 0 || to >= this.slides.length) return;
    const index = this.index === from ? to : this.index;
    this.edit("moveSlide", (pkg) => moveSlide(pkg, from, to), "deck", { index });
    this.dispatchEvent(new CustomEvent("us-slide", { detail: { index: this.index } }));
  }
  /** Slide oculto na apresentação? */
  isSlideHidden(i = this.index) {
    return !!this.slides[i]?.timing?.hidden;
  }
  /** Oculta/mostra o slide na apresentação. */
  setSlideHidden(hidden, i = this.index) {
    if (!this.slidePartPath(i)) return;
    this.edit("hideSlide", (pkg) => setSlideHidden(pkg, this.slidePath(i), hidden), i);
  }
  /** Troca o layout do slide. */
  setSlideLayout(layout, i = this.index) {
    if (!this.slidePartPath(i)) return;
    this.edit("layout", (pkg) => setSlideLayout(pkg, this.slidePath(i), layout), i);
  }
  /** Fundo sólido do slide (`null` volta a herdar). `'all'` aplica a todos. */
  setSlideBackground(color, i = this.index) {
    const targets = i === "all" ? this.slides.map((_, k) => k) : [i];
    this.edit("background", (pkg) => {
      for (const k of targets) setSlideBackground(pkg, this.slidePath(k), color);
    }, i === "all" ? "deck" : i);
  }
  /** Transição de entrada do slide `i` (null se não houver). */
  getSlideTransition(i = this.index) {
    const t = this.slides[i]?.timing?.transition;
    if (!t || t.type === "none" && t.advTmMs === void 0 && t.advClick) return null;
    const spec = { type: t.type, advanceOnClick: t.advClick };
    const dir = t.attrs["dir"];
    if (dir) spec.dir = dir;
    if (t.advTmMs !== void 0) spec.advanceAfterMs = t.advTmMs;
    spec.speed = t.durMs >= 1e3 ? "slow" : t.durMs >= 700 ? "med" : "fast";
    return spec;
  }
  /** Grava a transição (`null` tira) no slide `i` ou em todos (`'all'`). */
  setSlideTransition(t, i = this.index) {
    const targets = i === "all" ? this.slides.map((_, k) => k) : [i];
    this.edit("transition", (pkg) => {
      for (const k of targets) setSlideTransition(pkg, this.slidePath(k), t);
    }, i === "all" ? "deck" : i);
  }
  /** Tamanho do slide em EMU (16:9 padrão sem apresentação). */
  getSlideSize() {
    return { width: this.pres?.slideW ?? 12192e3, height: this.pres?.slideH ?? 6858e3 };
  }
  /** Largura ÷ altura do slide. */
  getSlideAspect() {
    const s = this.getSlideSize();
    return s.width / s.height;
  }
  /** Cor de fundo própria do slide (`null` = herda do layout/master ou não é cor sólida). */
  getSlideBackgroundColor(i = this.index) {
    const bg = this.slides[i]?.bg;
    return bg?.type === "solid" && bg.color ? bg.color : null;
  }
  /**
   * Animações do slide (sequência principal, em ordem), só para LEITURA: o
   * editor reproduz e visualiza as animações do arquivo, mas não as cria nem edita.
   */
  getSlideAnimations(i = this.index) {
    const timing = this.slides[i]?.timing;
    const shapes = this.slides[i]?.shapes ?? [];
    const out = [];
    timing?.steps.forEach((st, k) => st.effects.forEach((e, j) => {
      const sh = e.target ? shapes.find((s) => !s.inherited && s.id === e.target.spid) : void 0;
      const trigger = e.nodeType === "withEffect" ? "with" : e.nodeType === "afterEffect" ? "after" : e.nodeType === "clickEffect" ? "click" : j === 0 ? st.auto ? "after" : "click" : "with";
      out.push({
        step: k,
        trigger,
        presetClass: e.presetClass,
        presetId: e.presetId,
        durMs: Number.isFinite(e.durMs) ? e.durMs : -1,
        delayMs: e.startMs,
        ...e.target ? { shapeId: e.target.spid } : {},
        ...sh ? { shapeName: sh.name } : {}
      });
    }));
    return out;
  }
  /** "Configurar apresentação" gravado no arquivo. */
  getShowSettings() {
    const s = this.pres?.show ?? {};
    return { loop: !!s.loop, useTimings: s.useTimings ?? true, showAnimation: s.showAnimation ?? true, kiosk: !!s.kiosk };
  }
  setShowSettings(s) {
    this.edit("showSettings", (pkg) => writeShowSettings(pkg, s), "deck");
  }
  // ───────────────────────── seleção ─────────────────────────
  /** Forma selecionada (índice no slide atual) ou null. */
  getSelectedShape() {
    return this.selected;
  }
  /** Seleciona uma forma do slide atual (null tira a seleção). */
  selectShape(i) {
    if (this.editor) this.commitEditShape();
    const sh = i !== null ? this.slides[this.index]?.shapes[i] : void 0;
    const next = sh && selectable(sh) ? i : null;
    if (next === this.selected) return;
    this.selected = next;
    this.paint();
    this.dispatchEvent(new CustomEvent("us-selection", { detail: { index: this.index, shape: next } }));
  }
  /** Forma alvo das ações: a que está sendo editada ou a selecionada. */
  target(i) {
    const idx = i ?? this.editingShape?.shapeIdx ?? this.selected;
    if (idx === null || idx === void 0) return null;
    const shape = this.slides[this.index]?.shapes[idx];
    return shape && !shape.inherited ? { shape, index: idx } : null;
  }
  /** O que a forma `i` (padrão: a selecionada) é e o que dá para fazer com ela. */
  getShapeInfo(i) {
    const t = this.target(i);
    if (!t) return null;
    const sh = t.shape;
    const kind = sh.media ? "media" : sh.image && !sh.txBody ? "picture" : sh.table ? "table" : sh.chartXml ? "chart" : sh.geom === "line" || sh.geom?.startsWith("straightConnector") ? "line" : sh.txBody && (sh.isTextBox || sh.phType !== void 0 || sh.phIdx !== void 0) ? "text" : sh.dgmId ? "other" : "shape";
    const info = {
      index: t.index,
      id: sh.id,
      name: sh.name,
      kind,
      text: kind === "text" || kind === "shape",
      movable: !sh.groupIds?.length && !!sh.xfrm
    };
    if (sh.phType !== void 0 || sh.phIdx !== void 0) info.placeholder = sh.phType ?? "obj";
    if (sh.xfrm) info.frame = { x: sh.xfrm.x, y: sh.xfrm.y, cx: sh.xfrm.cx, cy: sh.xfrm.cy };
    return info;
  }
  /** Formatação do texto da forma (o 1º run com texto e o 1º parágrafo). */
  getTextFormat(i) {
    const t = this.target(i);
    const body = t?.shape.txBody;
    if (!body) return null;
    const para = body.paragraphs.find((p) => p.runs.some((r) => r.text)) ?? body.paragraphs[0];
    const run = para?.runs.find((r) => r.text && r.text !== "\n");
    return {
      bold: !!run?.bold,
      italic: !!run?.italic,
      underline: !!run?.underline,
      strike: !!run?.strike,
      size: run?.sz ?? para?.endSz,
      font: run?.font,
      color: run?.color,
      align: para?.align ?? "l",
      bullet: para?.bulletAutoNum ? "number" : para?.bullet ? "bullet" : "none"
    };
  }
  // ───────────────────────── texto e formatação ─────────────────────────
  /** Troca o texto da forma (uma linha por parágrafo; parágrafos iguais ficam como estavam). */
  setShapeText(text, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("text", (pkg) => setShapeText(pkg, this.slidePath(), t.shape.id, text, this.textLang()));
  }
  /** Formatação de caractere em TODO o texto da forma (negrito, itálico, tamanho, fonte, cor…). */
  formatText(f, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("format", (pkg) => formatShapeText(pkg, this.slidePath(), t.shape.id, f, this.textLang()));
  }
  /** Alterna negrito/itálico/sublinhado/tachado (pelo estado do 1º run, como o app). */
  toggleTextFormat(k, i) {
    const cur = this.getTextFormat(i);
    if (!cur) return;
    this.formatText({ [k]: !cur[k] }, i);
  }
  static FONT_STEPS = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];
  /** Aumentar/Diminuir Tamanho da Fonte (os degraus do app), em cada run. */
  growFont(dir = 1, i) {
    const t = this.target(i);
    if (!t) return;
    const steps = _UniversalSlidesElement.FONT_STEPS;
    const base = this.getTextFormat(i)?.size ?? 18;
    const step = (pt) => {
      const v = pt ?? base;
      if (dir > 0) return steps.find((s) => s > v + 0.01) ?? Math.round(v + 10);
      return [...steps].reverse().find((s) => s < v - 0.01) ?? Math.max(1, v - 1);
    };
    this.edit("fontSize", (pkg) => scaleShapeText(pkg, this.slidePath(), t.shape.id, step, this.textLang()));
  }
  /** Alinhamento dos parágrafos da forma. */
  alignText(algn, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("align", (pkg) => alignShapeText(pkg, this.slidePath(), t.shape.id, algn));
  }
  /** Marcadores/numeração dos parágrafos da forma. */
  setBullets(kind, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("bullets", (pkg) => setShapeBullets(pkg, this.slidePath(), t.shape.id, kind));
  }
  /** Limpar toda a formatação de caractere do texto da forma. */
  clearFormatting(i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("clearFormat", (pkg) => clearShapeFormatting(pkg, this.slidePath(), t.shape.id, this.textLang()));
  }
  /** Hiperlink em todo o texto da forma (`null` tira). */
  setLink(url, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("link", (pkg) => setShapeLink(pkg, this.slidePath(), t.shape.id, url, this.textLang()));
  }
  /** Hiperlink do texto da forma (o 1º run com link), ou null. */
  getLink(i) {
    const t = this.target(i);
    for (const p of t?.shape.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.hyperlink) return r.hyperlink;
    return null;
  }
  // ───────────────────────── formas ─────────────────────────
  /** Retângulo padrão de uma forma nova: centralizado, `w`×`h` EMU (limitados ao slide). */
  centered(w, h) {
    const W = this.pres?.slideW ?? 12192e3, H = this.pres?.slideH ?? 6858e3;
    const cx = Math.min(w, W * 0.9), cy = Math.min(h, H * 0.9);
    return { x: (W - cx) / 2, y: (H - cy) / 2, cx, cy };
  }
  insertWith(label, fn) {
    if (!this.slides.length) this.addSlide();
    const id = this.edit(label, (pkg) => fn(pkg, this.slidePath()), "slide", { select: null });
    if (id === void 0) return -1;
    this.selectById(id);
    this.paint();
    this.dispatchEvent(new CustomEvent("us-selection", { detail: { index: this.index, shape: this.selected } }));
    return this.selected ?? -1;
  }
  /** Caixa de texto nova (selecionada). Devolve o índice da forma. */
  insertTextBox(text = "", frame) {
    const W = this.pres?.slideW ?? 12192e3;
    const f = frame ?? this.centered(W * 0.4, 12700 * 40);
    return this.insertWith("textBox", (pkg, path) => insertTextBox(pkg, path, f, text, this.textLang()));
  }
  /** Forma predefinida nova (geometria do Office, ex. 'rect', 'ellipse', 'rightArrow'). */
  insertShape(prst, frame) {
    const side = Math.round((this.pres?.slideH ?? 6858e3) * 0.3);
    const f = frame ?? (prst === "line" ? { ...this.centered(side * 1.5, 0), cy: 0 } : this.centered(prst === "rect" || prst === "roundRect" ? side * 1.5 : side, side));
    return this.insertWith("shape", (pkg, path) => insertShape(pkg, path, prst, f, this.textLang()));
  }
  /** Imagem nova (PNG/JPEG/GIF/BMP/WebP/SVG), no tamanho natural limitado ao slide. */
  async insertImage(bytes, mime, frame) {
    let f = frame;
    if (!f) {
      const size = await imageSize(bytes, mime);
      const W = this.pres?.slideW ?? 12192e3, H = this.pres?.slideH ?? 6858e3;
      let w = (size?.w ?? 640) * EMU_PER_PX, h = (size?.h ?? 480) * EMU_PER_PX;
      const k = Math.min(1, W * 0.8 / w, H * 0.8 / h);
      w *= k;
      h *= k;
      f = { x: (W - w) / 2, y: (H - h) / 2, cx: w, cy: h };
    }
    const target = f;
    return this.insertWith("image", (pkg, path) => {
      const r = insertImage(pkg, path, bytes, mime, target);
      this.imageCache.delete(r.part);
      return r.id;
    });
  }
  /** Posição/tamanho da forma (EMU). */
  setShapeFrame(frame, i) {
    const t = this.target(i);
    if (!t || t.shape.groupIds?.length) return;
    this.edit("frame", (pkg) => setShapeFrame(pkg, this.slidePath(), t.shape.id, frame));
  }
  /** Preenchimento da forma (`null` = sem preenchimento). */
  setShapeFill(color, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("fill", (pkg) => setShapeFill(pkg, this.slidePath(), t.shape.id, color));
  }
  /** Contorno da forma (`null` = sem contorno). */
  setShapeOutline(color, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("outline", (pkg) => setShapeOutline(pkg, this.slidePath(), t.shape.id, color));
  }
  /** Trazer para a frente / Enviar para trás (um nível ou tudo). */
  arrangeShape(mode, i) {
    const t = this.target(i);
    if (!t) return;
    this.edit("arrange", (pkg) => arrangeShape(pkg, this.slidePath(), t.shape.id, mode));
  }
  /** Exclui a forma (e as animações dela). */
  deleteShape(i) {
    const t = this.target(i);
    if (!t) return;
    if (this.editor) this.cancelEditShape();
    this.edit("deleteShape", (pkg) => deleteShape(pkg, this.slidePath(), t.shape.id), "slide", { select: null });
    this.dispatchEvent(new CustomEvent("us-selection", { detail: { index: this.index, shape: null } }));
  }
  /**
   * Copia a forma (XML + relações; imagens com os bytes): o que `pasteShape`
   * cola neste ou em outro `<universal-slides>`. null = não dá para copiar
   * (forma dentro de grupo, decoração do layout).
   */
  copyShape(i) {
    const t = this.target(i);
    if (!t || !this.pkg || t.shape.groupIds?.length) return null;
    return extractShape(this.pkg, this.slidePath(), t.shape.id);
  }
  /**
   * Cola uma forma copiada no slide atual (selecionada). Colada no MESMO
   * slide de onde veio, desloca um pouco (não fica por cima da original).
   * Devolve o índice, ou -1 (forma que depende de partes que não dá para levar).
   */
  pasteShape(clip) {
    if (!this.slides.length) this.addSlide();
    const sameSlide = clip.source === this.pkg && clip.slidePath === this.slidePartPath(this.index);
    const d = sameSlide ? 12700 * 12 : 0;
    const id = this.edit("paste", (pkg) => pasteShape(pkg, this.slidePath(), clip, d, d) ?? "", "slide", { select: null });
    if (!id) return -1;
    this.selectById(id);
    this.paint();
    this.dispatchEvent(new CustomEvent("us-selection", { detail: { index: this.index, shape: this.selected } }));
    return this.selected ?? -1;
  }
  /** Duplica a forma no mesmo slide (Ctrl+D). Devolve o índice da cópia. */
  duplicateShape(i) {
    const clip = this.copyShape(i);
    return clip ? this.pasteShape(clip) : -1;
  }
  // ───────────────────────── anotações ─────────────────────────
  /** Dá para escrever anotações no slide (sem master de anotações, o primeiro registro cria um). */
  canEditNotes(i = this.index) {
    return !!this.pkg && !!this.slidePartPath(i);
  }
  /** Grava as anotações do orador do slide `i`. false = nada mudou (ou não há slide). */
  setSlideNotes(text, i = this.index) {
    if (!this.canEditNotes(i) || this.getSlideNotes(i) === text) return false;
    return !!this.edit("notes", (pkg) => setSlideNotes(pkg, this.slidePath(i), text, this.textLang()), i);
  }
  // ───────────────────────── propriedades ─────────────────────────
  getProperties() {
    return this.pkg ? readProperties(this.pkg) : {};
  }
  setProperties(p) {
    this.edit("properties", (pkg) => writeProperties(pkg, p), "deck");
  }
  // ───────────────────────── localizar e substituir ─────────────────────────
  /** Formas cujo texto contém `query` (slides em ordem, formas em ordem). */
  findText(query, opts = {}) {
    if (!query) return [];
    const q = opts.matchCase ? query : query.toLowerCase();
    const out = [];
    this.slides.forEach((s, si) => s.shapes.forEach((sh, i) => {
      if (sh.inherited || !sh.txBody) return;
      const text = sh.txBody.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
      if ((opts.matchCase ? text : text.toLowerCase()).includes(q)) out.push({ slide: si, shape: i });
    }));
    return out;
  }
  /**
   * Substitui no texto das formas (dentro de cada trecho de mesma formatação):
   * em `hit` (uma forma) ou em toda a apresentação. Devolve quantas trocas.
   */
  replaceText(query, replacement, opts = {}) {
    const hits = opts.hit ? [opts.hit] : this.findText(query, opts);
    if (!hits.length) return 0;
    let count = 0;
    this.edit("replace", (pkg) => {
      for (const h of hits) {
        const sh = this.slides[h.slide]?.shapes[h.shape];
        if (sh) count += replaceInShape(pkg, this.slidePath(h.slide), sh.id, query, replacement, opts.matchCase);
      }
    }, "deck");
    return count;
  }
  // ───────────────────────── visualizar ─────────────────────────
  /**
   * Visualizar a transição (`'transition'`) ou as animações (`'animations'`)
   * do slide atual, no próprio palco do editor; para sozinho no fim.
   */
  previewSlide(kind) {
    const i = this.index;
    if (!this.slides[i]) return;
    if (this.editor) this.commitEditShape();
    const tl = this.play({ from: i, defaultSlideMs: 6e5 });
    const ps = tl.slides.find((s) => s.index === i);
    if (!ps) {
      this.stopPlayback();
      return;
    }
    let end = ps.animStartMs;
    if (kind === "animations") {
      for (const e of ps.effects) {
        if (e.step < 0) continue;
        const dur = Number.isFinite(e.durMs) ? e.durMs : e.blockMs;
        end = Math.max(end, ps.animStartMs + e.t0 + dur);
      }
    }
    const ms = Math.max(0, end - ps.startMs) + 400;
    const run = this.auto;
    window.setTimeout(() => {
      if (this.auto === run) {
        this.stopPlayback();
        this.selectSlide(i);
      }
    }, ms);
  }
  // ───────────────────────── zoom ─────────────────────────
  /** Zoom em uso (1 = 100%, tamanho real a 96 dpi), também com "ajustar à janela". */
  getZoom() {
    const f = this.fit();
    if (f) this.lastZoom = f.scale * EMU_PER_PX;
    return this.lastZoom;
  }
  lastZoom = 1;
  /** Zoom (1 = 100%) ou `'fit'` (ajustar à janela). */
  setZoom(z) {
    this.zoomLevel = z === "fit" ? null : Math.max(0.1, Math.min(4, z));
    this.pan = { x: 0, y: 0 };
    this.paint();
    this.dispatchEvent(new CustomEvent("us-zoom", { detail: { zoom: this.getZoom(), fit: this.zoomLevel === null } }));
  }
  /** Está em "ajustar à janela"? */
  isZoomFit() {
    return this.zoomLevel === null;
  }
  fit() {
    const base = super.fit();
    if (!base || this.zoomLevel === null || this.auto || this.show || !this.pres) return base;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const scale = this.zoomLevel / EMU_PER_PX;
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    const m = 16;
    const maxX = Math.max(0, sw + 2 * m - W), maxY = Math.max(0, sh + 2 * m - H);
    this.pan.x = Math.max(0, Math.min(this.pan.x, maxX));
    this.pan.y = Math.max(0, Math.min(this.pan.y, maxY));
    const ox = maxX > 0 ? m - this.pan.x : (W - sw) / 2;
    const oy = maxY > 0 ? m - this.pan.y : (H - sh) / 2;
    return { ox, oy, scale, sw, sh };
  }
  // ───────────────────────── pintura da superfície ─────────────────────────
  paint() {
    super.paint();
    if (!this.interactive || this.auto || this.show) return;
    const slide = this.slides[this.index];
    const fit = this.fit();
    const ctx = this.canvas.getContext("2d");
    if (!slide || !fit || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPrompts(ctx, slide, fit, pickLabels(this, PROMPTS), this.fontStackFor("Calibri"), this.editingShape?.shapeIdx);
    const sel = this.selected !== null ? slide.shapes[this.selected] : void 0;
    if (sel && !this.editor) {
      const r = shapeRect(sel, fit);
      if (r) drawSelection(ctx, r, "#2b7cd3", !sel.groupIds?.length);
    }
  }
  // ───────────────────────── superfície: mouse e teclado ─────────────────────────
  drag = null;
  surfaceActive(e) {
    return this.interactive && !this.auto && !this.show && e.composedPath()[0] === this.canvas;
  }
  canvasPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  onSurfaceDown = (e) => {
    if (!this.surfaceActive(e) || e.button !== 0) return;
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    if (this.editor) this.commitEditShape();
    const [x, y] = this.canvasPoint(e);
    const cur = this.selected !== null ? slide.shapes[this.selected] : void 0;
    if (cur?.xfrm && !cur.groupIds?.length) {
      const h = hitHandle(shapeRect(cur, fit), x, y);
      if (h) {
        this.startDrag(e, h, this.selected, cur);
        return;
      }
    }
    const hit = hitShape(slide, x, y, fit);
    if (hit < 0) {
      this.selectShape(null);
      return;
    }
    if (hit !== this.selected) this.selectShape(hit);
    const sh = slide.shapes[hit];
    if (sh.xfrm && !sh.groupIds?.length) this.startDrag(e, "move", hit, sh);
    this.canvas.focus();
  };
  startDrag(e, kind, id, sh) {
    const x = sh.xfrm;
    this.drag = { kind, id, startX: e.clientX, startY: e.clientY, orig: { x: x.x, y: x.y, cx: x.cx, cy: x.cy }, moved: false, pointer: e.pointerId };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
    }
    this.canvas.addEventListener("pointermove", this.onDragMove);
    this.canvas.addEventListener("pointerup", this.onDragEnd);
    this.canvas.addEventListener("pointercancel", this.onDragEnd);
    e.preventDefault();
  }
  onDragMove = (e) => {
    const d = this.drag;
    const fit = this.fit();
    const sh = d ? this.slides[this.index]?.shapes[d.id] : void 0;
    if (!d || !fit || !sh?.xfrm) return;
    const dx = (e.clientX - d.startX) / fit.scale, dy = (e.clientY - d.startY) / fit.scale;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3) return;
    d.moved = true;
    const f = d.kind === "move" ? { ...d.orig, x: d.orig.x + (e.shiftKey && Math.abs(dy) > Math.abs(dx) ? 0 : dx), y: d.orig.y + (e.shiftKey && Math.abs(dx) >= Math.abs(dy) ? 0 : dy) } : resizeFrame(d.orig, d.kind, dx, dy, e.shiftKey || !!sh.image);
    sh.xfrm = { ...sh.xfrm, x: f.x, y: f.y, cx: f.cx, cy: f.cy };
    this.paint();
  };
  onDragEnd = (e) => {
    const d = this.drag;
    this.drag = null;
    this.canvas.removeEventListener("pointermove", this.onDragMove);
    this.canvas.removeEventListener("pointerup", this.onDragEnd);
    this.canvas.removeEventListener("pointercancel", this.onDragEnd);
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
    }
    if (!d?.moved) return;
    const sh = this.slides[this.index]?.shapes[d.id];
    if (!sh?.xfrm) return;
    const f = { x: sh.xfrm.x, y: sh.xfrm.y, cx: sh.xfrm.cx, cy: sh.xfrm.cy };
    sh.xfrm = { ...sh.xfrm, ...d.orig };
    if (e.type === "pointercancel") {
      this.paint();
      return;
    }
    this.setShapeFrame(f, d.id);
  };
  onSurfaceHover = (e) => {
    if (!this.surfaceActive(e) || this.drag) return;
    e.stopPropagation();
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const [x, y] = this.canvasPoint(e);
    const cur = this.selected !== null ? slide.shapes[this.selected] : void 0;
    const h = cur?.xfrm && !cur.groupIds?.length ? hitHandle(shapeRect(cur, fit), x, y) : null;
    const hit = h ? -1 : hitShape(slide, x, y, fit);
    const over = hit >= 0 ? slide.shapes[hit] : void 0;
    this.canvas.style.cursor = h ? HANDLE_CURSOR[h] : over ? over.groupIds?.length ? "default" : hit === this.selected ? "move" : "pointer" : "default";
  };
  onSurfaceClick = (e) => {
    if (!this.surfaceActive(e)) return;
    if (e.ctrlKey || e.metaKey) return;
    e.stopPropagation();
  };
  onSurfaceDblClick = (e) => {
    if (!this.surfaceActive(e)) return;
    e.stopPropagation();
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const [x, y] = this.canvasPoint(e);
    const hit = hitShape(slide, x, y, fit);
    if (hit < 0) return;
    if (this.getShapeInfo(hit)?.text) {
      this.beginEditShape(hit);
      e.preventDefault();
    }
  };
  onSurfaceKey = (e) => {
    if (!this.surfaceActive(e) || e.defaultPrevented || this.editor) return;
    const k = e.key;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (this.selected === null) {
      if ((k === "f" || k === "F") && plain) e.stopPropagation();
      return;
    }
    const info = this.getShapeInfo();
    if (!info) return;
    const done = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (k.length === 1 && plain && info.text) {
      e.stopPropagation();
      this.beginEditShape(info.index);
      return;
    }
    if (k === "Escape") {
      this.selectShape(null);
      done();
      return;
    }
    if ((k === "Delete" || k === "Backspace") && !e.ctrlKey && !e.metaKey) {
      this.deleteShape();
      done();
      return;
    }
    if ((k === "Enter" || k === "F2") && info.text) {
      this.beginEditShape(info.index);
      done();
      return;
    }
    if (k === "Tab") {
      const slide = this.slides[this.index];
      const ids = slide.shapes.map((s, i) => selectable(s) ? i : -1).filter((i) => i >= 0);
      const pos = ids.indexOf(info.index);
      const next = ids[(pos + (e.shiftKey ? -1 : 1) + ids.length) % ids.length];
      if (next !== void 0) this.selectShape(next);
      done();
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[k];
    if (a && info.movable && info.frame && !e.altKey) {
      const step = e.ctrlKey || e.metaKey ? 12700 : 91440;
      this.setShapeFrame({ ...info.frame, x: info.frame.x + a[0] * step, y: info.frame.y + a[1] * step });
      done();
    }
  };
  wheelAt = 0;
  onSurfaceWheel = (e) => {
    if (!this.interactive || this.auto || this.show || e.composedPath()[0] !== this.canvas) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      this.setZoom(Math.round(this.getZoom() * (e.deltaY < 0 ? 1.1 : 1 / 1.1) * 100) / 100);
      return;
    }
    const f = this.fit();
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const overflows = !!f && this.zoomLevel !== null && (f.sw + 32 > W || f.sh + 32 > H);
    if (overflows) {
      this.pan.x += e.shiftKey ? e.deltaY : e.deltaX;
      this.pan.y += e.shiftKey ? 0 : e.deltaY;
      this.paint();
      return;
    }
    const now = (window.performance ?? Date).now();
    if (now - this.wheelAt < 220 || Math.abs(e.deltaY) < 1) return;
    this.wheelAt = now;
    if (e.deltaY > 0) this.next();
    else this.prev();
  };
  onDblClick = (e) => {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i];
      if (!sh.txBody || !sh.xfrm || sh.inherited || sh.dgmId || sh.dgmTextOf) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh2) {
        this.beginEditShape(i);
        e.preventDefault();
        return;
      }
    }
  };
  // ───────────────────────── EDIÇÃO DE TEXTO ─────────────────────────
  /**
   * Entra em modo edição numa shape de texto. Cria um `<div contenteditable>`
   * sobre o `xfrm` da shape. Sem as barras: Enter (sem Shift) e Esc
   * commitam/cancelam; com as barras (como o app): Enter quebra o parágrafo e
   * Esc sai gravando. O commit grava no pacote: parágrafo que não mudou fica
   * como estava; o que mudou mantém o parágrafo (nível, marcador,
   * alinhamento) e a formatação do 1º run dele.
   */
  beginEditShape(shapeIdx) {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const sh = slide.shapes[shapeIdx];
    if (!sh || !sh.xfrm || sh.inherited || !sh.txBody && !(this.interactive && this.getShapeInfo(shapeIdx)?.text)) return;
    if (this.editor) this.commitEditShape();
    this.editingShape = { slide: this.index, shapeIdx };
    this.selected = this.interactive ? shapeIdx : this.selected;
    const paragraphs = sh.txBody?.paragraphs ?? [];
    const initialText = paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
    const left = fit.ox + sh.xfrm.x * fit.scale;
    const top = fit.oy + sh.xfrm.y * fit.scale;
    const w = sh.xfrm.cx * fit.scale;
    const h = sh.xfrm.cy * fit.scale;
    const firstRun = paragraphs.find((p) => p.runs.length)?.runs[0];
    const pt = firstRun?.sz ?? paragraphs[0]?.endSz ?? (sh.phType === "title" || sh.phType === "ctrTitle" ? 40 : 18);
    const px = pt * 12700 * fit.scale;
    const color = firstRun?.color ?? "#000000";
    const font = firstRun?.font ?? "Calibri";
    const align = paragraphs[0]?.align;
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.spellcheck = false;
    div.textContent = initialText;
    div.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${w}px;min-height:${h}px;padding:4px;border:2px dashed #ff7043;outline:none;background:rgba(255,255,255,.92);color:${color};font:${firstRun?.italic ? "italic " : ""}${firstRun?.bold ? "700 " : ""}${px}px ${this.fontStackFor(font, !!firstRun?.bold, !!firstRun?.italic)};text-align:${align === "ctr" ? "center" : align === "r" ? "right" : "left"};white-space:pre-wrap;z-index:5;box-sizing:border-box;`;
    this.wrap.appendChild(div);
    this.editor = div;
    div.focus();
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const pptKeys = this.interactive;
    let suppressBlur = false;
    div.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey && !pptKeys) {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEditShape();
        this.canvas.focus();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        suppressBlur = true;
        if (pptKeys) this.commitEditShape();
        else this.cancelEditShape();
        this.canvas.focus();
      }
    });
    div.addEventListener("blur", () => {
      if (suppressBlur || !this.editingShape) return;
      this.commitEditShape();
    });
    this.paint();
    this.dispatchEvent(new CustomEvent("us-selection", { detail: { index: this.index, shape: this.selected } }));
  }
  /** Commita a edição: grava o texto no pacote e relê o slide. */
  commitEditShape() {
    if (!this.editor || !this.editingShape) return;
    const text = this.editor.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "");
    const { slide: slideIdx, shapeIdx } = this.editingShape;
    const sh = this.slides[slideIdx]?.shapes[shapeIdx];
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    const before = sh ? (sh.txBody?.paragraphs ?? []).map((p) => p.runs.map((r) => r.text).join("")).join("\n") : "";
    const path = this.slidePartPath(slideIdx);
    if (!sh || !path || !this.pkg || text === before) {
      this.paint();
      return;
    }
    const prevIndex = this.index;
    this.index = slideIdx;
    this.edit("typing", (pkg) => setShapeText(pkg, path, sh.id, text, this.textLang()), slideIdx);
    this.index = prevIndex;
    this.dispatchEvent(new CustomEvent("us-shape-edit", {
      detail: { slide: slideIdx, shapeIdx, text }
    }));
    this.paint();
  }
  /** Descarta a edição em curso (texto original mantido). */
  cancelEditShape() {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    this.paint();
  }
  /** Forma em edição de texto (índice no slide atual) ou null. */
  getEditingShape() {
    return this.editingShape && this.editingShape.slide === this.index ? this.editingShape.shapeIdx : null;
  }
};
async function imageSize(bytes, mime) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (bytes[0] === 137 && bytes[1] === 80) return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (bytes[0] === 71 && bytes[1] === 73) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (bytes[0] === 66 && bytes[1] === 77) return { w: dv.getInt32(18, true), h: Math.abs(dv.getInt32(22, true)) };
    if (bytes[0] === 255 && bytes[1] === 216) {
      let p = 2;
      while (p < bytes.length - 8) {
        if (bytes[p] !== 255) {
          p++;
          continue;
        }
        const m = bytes[p + 1];
        if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) return { h: dv.getUint16(p + 5), w: dv.getUint16(p + 7) };
        p += 2 + dv.getUint16(p + 2);
      }
    }
  } catch {
  }
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mime }));
      const s = { w: bmp.width, h: bmp.height };
      bmp.close();
      return s;
    } catch {
    }
  }
  return null;
}
function deckFontUsage(pkg) {
  const families = new Set(collectDeckTypefaces(pkg));
  let text = "";
  for (const part of pkg.partNames()) {
    const xml = /^ppt\/(slides|slideLayouts|slideMasters|theme)\/[^/]+\.xml$/.test(part) ? pkg.getPartText(part) : void 0;
    if (!xml) continue;
    if (part.startsWith("ppt/theme/")) {
      for (const m of xml.matchAll(/<a:(?:major|minor)Font>\s*<a:latin\b[^>]*typeface="([^"]+)"/g)) families.add(unescXml(m[1]));
      continue;
    }
    for (const m of xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) text += unescXml(m[1]);
  }
  return [...families].filter((f) => f && !f.startsWith("+")).map((family) => ({ family, variants: ["regular"], text }));
}
customElements.define("universal-slides", UniversalSlidesElement);

// demo/main.ts
var bridge = window.universalSlides;
FontResolver.shared().configure({
  baseUrl: "./fonts",
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null
});
var us = document.getElementById("us");
var setTitle = (t) => {
  document.title = `${t} \u2014 Universal Slides`;
};
if (bridge) {
  const enc = new TextEncoder();
  const host = {
    openFile: bridge.openPptx ? () => bridge.openPptx() : void 0,
    // o shell grava direto no caminho já conhecido e só pergunta no Salvar como
    saveFile: bridge.saveFile ? async (data, o) => bridge.saveFile({ suggestedName: o.name, bytes: data, ...o.path ? { path: o.path } : {} }) : void 0,
    exportFile: bridge.exportFile ? async (kind, name, data) => {
      const r = await bridge.exportFile({
        suggestedName: name,
        format: kind,
        bytes: async () => {
          const d = await data();
          return typeof d === "string" ? enc.encode(d) : d;
        }
      });
      return r?.name ?? null;
    } : void 0,
    print: bridge.print ? async (o) => {
      await bridge.print(o);
    } : void 0,
    setDirty: bridge.setDirty ? (d, n) => bridge.setDirty(d, n) : void 0,
    onSaveBeforeClose: bridge.onSaveBeforeClose ? (cb) => bridge.onSaveBeforeClose(cb) : void 0,
    closeWindow: bridge.closeWindow ? () => bridge.closeWindow() : void 0,
    setTitleTheme: bridge.setTitleTheme ? (d) => bridge.setTitleTheme(d) : void 0,
    setTitle,
    // janela sem moldura (titleBarOverlay): a linha de título reserva os controles e arrasta a janela
    windowControlsOverlay: true
  };
  us.appHost = host;
} else {
  us.appHost = { setTitle };
}
(async () => {
  let fromOs = false;
  if (bridge?.onOpenFile) {
    bridge.onOpenFile((doc) => {
      fromOs = true;
      try {
        us.openPresentation(new Uint8Array(doc.bytes), { name: doc.name, path: doc.path ?? null });
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    });
    await new Promise((r) => setTimeout(r, 150));
    if (fromOs) return;
  }
  for (const [url, name] of [["/samples/showcase_animado.pptx", "showcase_animado.pptx"], ["/samples/reference.pptx", "reference.pptx"]]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      if (fromOs) return;
      us.openPresentation(new Uint8Array(await res.arrayBuffer()), { name });
      return;
    } catch {
    }
  }
  if (!fromOs) us.newPresentation();
})();
