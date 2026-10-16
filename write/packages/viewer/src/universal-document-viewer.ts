import {
  DocxPackage, readFullDocument, readEmbeddedFonts, isWordBinary, convertDocToDocx,
  type FullDocument, type InlineImage,
} from '@universal-office/docx-core';
import { FontResolver } from '@universal-office/fonts';
import { SfntFont, loadHyphenation } from '@universal-office/layout';
import {
  layoutDocument, renderPdf, withEmbeddedFonts, documentHyphenationLanguages, paintItems,
  type LayoutOptions, type LayoutResult, type EnginePaintEnv,
} from '@universal-office/docx-layout';
import { langOf } from '@universal-office/viewer-controls';
import { ViewerFonts } from './fonts.js';
import {
  DocumentControls, CONTROL_ITEMS, CONTROLS_CSS, PROGRESS_COLOR, labelsFor,
  type ControlsHost, type ZoomSpec,
} from './controls.js';

/** Mesmas opções de layout do editor (ENGINE_LAYOUT_OPTS em universal-write.ts). */
const LAYOUT_OPTS: LayoutOptions = { hyphenationLanguages: ['pt-BR', 'en', 'es'] };
const hyphenationLangs = (full: FullDocument): string[] =>
  documentHyphenationLanguages(full).filter((l) => {
    const x = l.toLowerCase();
    return LAYOUT_OPTS.hyphenationLanguages!.some((y) => { const z = y.toLowerCase(); return x === z || x.startsWith(`${z}-`); });
  });

/** px CSS por twip (96 dpi). */
const PX_PER_TWIP = 96 / 1440;
const THUMBS_W = 132;

const CSS = `
:host { display: block; position: relative; contain: content; }
.udv-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--udv-background, var(--uo-background, #2b2b2b)); }
.udv-scroll {
  position: absolute; inset: 0; overflow: auto; outline: none; scrollbar-width: thin;
  padding: var(--udv-page-gap, 16px) 0 calc(var(--uoc-s) * 3.9);
  box-sizing: border-box;
}
.udv-thumbs-open .udv-scroll { padding-left: ${THUMBS_W}px; }
.udv-page {
  position: relative; margin: 0 auto var(--udv-page-gap, 16px); background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.45);
}
.udv-page canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.udv-thumbs {
  position: absolute; left: 0; top: 0; bottom: 0; width: ${THUMBS_W}px; box-sizing: border-box;
  overflow: auto; padding: 12px 0 calc(var(--uoc-s) * 3.9); scrollbar-width: thin;
  background: var(--udv-thumbnails-bg, rgba(0,0,0,.72));
}
.udv-thumbs[hidden] { display: none; }
.udv-thumb {
  all: unset; display: block; position: relative; margin: 0 auto 4px; cursor: pointer; background: #fff;
  outline: 2px solid transparent; outline-offset: 2px;
}
.udv-thumb canvas { display: block; width: 100%; height: 100%; }
.udv-thumb[aria-current="true"] { outline-color: ${PROGRESS_COLOR}; }
.udv-thumb:focus-visible { outline-color: var(--uoc-c); }
.udv-thumb + span { display: block; text-align: center; color: #ddd; font: 11px/1.4 system-ui, sans-serif; margin: 0 0 10px; }
.udv-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #bbb; font: 14px system-ui, sans-serif; pointer-events: none; }
` + CONTROLS_CSS;

/**
 * <universal-document-viewer> — visualização pura de .docx (e .doc), com a
 * MESMA paginação e pintura do editor e do PDF: o motor @universal-office/docx-layout
 * diagrama, `paintItems` pinta cada página num canvas (só as visíveis).
 *
 * Controles no mesmo modelo do <universal-presentation-viewer>: visíveis por
 * padrão, `nocontrols` desliga todos, `nonav`/`nocounter`/`nothumbnails`/
 * `nozoom`/`nodownload`/`noprint`/`nofullscreen`/`noprogress` tiram um a um.
 *
 * API: atributos `src`, `fonts` (base dos arquivos de fonte), `zoom`
 * (`page-width` | `page-fit` | percentual), `nocontrols`, `no<item>`;
 * `loadDocx(bytes)`, `getPageCount()`, `getPageIndex()`, `goToPage(i)`,
 * `setZoom(z)`, `print()`, `download()`, `toggleFullscreen()`, `exportPdf()`.
 * Eventos: `udv-loaded`, `udv-page`, `udv-zoom`, `udv-error`,
 * `udv-download` e `udv-print` (canceláveis: o host trata).
 */
export class UniversalDocumentViewerElement extends HTMLElement {
  private readonly root = this.attachShadow({ mode: 'open' });
  private readonly wrap = document.createElement('div');
  private readonly scroller = document.createElement('div');
  private readonly thumbs = document.createElement('div');
  private readonly msg = document.createElement('div');
  private readonly controls: DocumentControls;
  private readonly fonts = new ViewerFonts(FontResolver.shared(), () => this.repaintAll());

  private fileBytes: Uint8Array | null = null;
  private full: FullDocument | null = null;
  private pkg: DocxPackage | null = null;
  private layout: LayoutResult | null = null;
  private layoutVersion = 0;
  private pageEls: HTMLDivElement[] = [];
  private thumbEls: HTMLButtonElement[] = [];
  private painted = new Map<number, string>();
  private thumbPainted = new Map<number, string>();
  private zoomSpec: ZoomSpec = 'page-width';
  private zoomFactor = 1;
  private index = 0;
  private thumbsOpen = false;
  private loadSeq = 0;
  private srcUrl: string | null = null;
  private rafId = 0;
  private bitmaps = new WeakMap<object, ImageBitmap | HTMLCanvasElement | 'loading' | null>();
  private resizeObs: ResizeObserver | null = null;
  private unsubscribeFonts: (() => void) | null = null;
  private relayoutTimer = 0;

  static get observedAttributes(): string[] {
    return ['src', 'zoom', 'nocontrols', ...CONTROL_ITEMS.map((it) => `no${it}`), 'lang'];
  }

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = CSS;
    this.wrap.className = 'udv-wrap';
    this.wrap.setAttribute('part', 'viewer');
    this.scroller.className = 'udv-scroll';
    this.scroller.setAttribute('part', 'pages');
    this.scroller.tabIndex = 0;
    this.thumbs.className = 'udv-thumbs';
    this.thumbs.setAttribute('part', 'thumbnails');
    this.thumbs.hidden = true;
    this.msg.className = 'udv-msg';
    this.wrap.append(this.scroller, this.thumbs, this.msg);
    this.root.append(style, this.wrap);
    this.controls = new DocumentControls(this.controlsHost(), this.root, this.wrap);

    this.scroller.addEventListener('scroll', () => { this.schedule(); this.controls.wake(); }, { passive: true });
    this.thumbs.addEventListener('scroll', () => this.schedule(), { passive: true });
    this.thumbs.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.udv-thumb');
      if (b) this.goToPage(Number(b.dataset['i']));
    });
    this.wrap.addEventListener('pointermove', () => this.controls.wake());
    this.wrap.addEventListener('pointerdown', () => this.controls.wake());
    this.wrap.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.controls.leave(); });
    this.scroller.addEventListener('keydown', this.onKeyDown);
    this.wrap.addEventListener('wheel', this.onWheel, { passive: false });
  }

  connectedCallback(): void {
    this.resizeObs ??= new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(this.wrap);
    this.unsubscribeFonts ??= this.fonts.resolver.onChange(() => this.queueRelayout());
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.readZoomAttr();
    this.configureControls();
    const src = this.getAttribute('src');
    if (src && src !== this.srcUrl) void this.loadSrc(src);
    else if (!this.layout) this.msg.textContent = '';
  }

  disconnectedCallback(): void {
    this.resizeObs?.disconnect();
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.controls.dispose();
  }

  attributeChangedCallback(name: string, oldV: string | null, newV: string | null): void {
    if (!this.isConnected) return;
    if (name === 'src') { if (newV && newV !== oldV && newV !== this.srcUrl) void this.loadSrc(newV); }
    else if (name === 'zoom') { this.readZoomAttr(); this.applyZoom(); }
    else this.configureControls();
  }

  private configureControls(): void {
    const lang = langOf(this);
    this.controls.configure(!this.hasAttribute('nocontrols'), CONTROL_ITEMS.filter((it) => this.hasAttribute(`no${it}`)), lang);
    if (this.hasAttribute('nothumbnails') || this.hasAttribute('nocontrols')) this.setThumbs(false);
    this.labelThumbs(lang);
  }

  private readZoomAttr(): void {
    const z = (this.getAttribute('zoom') ?? '').trim().toLowerCase();
    if (z === 'page-fit' || z === 'page-width') this.zoomSpec = z;
    else if (/^\d+(\.\d+)?%?$/.test(z)) this.zoomSpec = Math.max(0.1, Math.min(8, parseFloat(z) / 100));
  }

  // ───────────────────────── carga e layout ─────────────────────────

  private async loadSrc(url: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.srcUrl = url;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (seq !== this.loadSeq) return;
      await this.loadDocx(bytes);
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.dispatchEvent(new CustomEvent('udv-error', { detail: { src: url, error } }));
    }
  }

  /** Carrega um .docx (ou .doc). Arquivo inválido LANÇA e o documento atual fica. */
  async loadDocx(bytes: Uint8Array): Promise<void> {
    const docx = isWordBinary(bytes) ? convertDocToDocx(bytes) : bytes;
    const pkg = DocxPackage.load(docx);
    const full = readFullDocument(pkg);
    const seq = ++this.loadSeq;
    this.srcUrl = this.getAttribute('src');
    this.fileBytes = bytes;
    this.pkg = pkg;
    this.full = full;
    this.index = 0;
    this.scroller.scrollTop = 0;
    await this.relayout(seq);
    if (seq !== this.loadSeq) return;
    this.dispatchEvent(new CustomEvent('udv-loaded', { detail: { pages: this.getPageCount() } }));
  }

  /** Diagrama o documento atual; repete enquanto o motor pede fontes que chegam. */
  private async relayout(seq = this.loadSeq): Promise<void> {
    const full = this.full, pkg = this.pkg;
    if (!full || !pkg) return;
    await this.fonts.loadAssets(this.getAttribute('fonts'));
    try { await loadHyphenation(hyphenationLangs(full)); } catch { /* sem padrões: sem hifenização */ }
    let embedded: ReturnType<typeof readEmbeddedFonts> = [];
    try { embedded = readEmbeddedFonts(pkg); } catch { /* fontes embutidas ilegíveis */ }
    for (let pass = 0; pass < 4; pass++) {
      if (seq !== this.loadSeq) return;
      const prov = withEmbeddedFonts(this.fonts.provider(), embedded, (b) => new SfntFont(b));
      this.setLayout(layoutDocument(full, prov, LAYOUT_OPTS));
      if (!(await this.fonts.loadMissing())) break;
    }
  }

  private queueRelayout(): void {
    clearTimeout(this.relayoutTimer);
    this.relayoutTimer = window.setTimeout(() => { void this.relayout(); }, 50);
  }

  private setLayout(res: LayoutResult): void {
    const keepFrac = this.layout ? this.scrollFraction() : 0;
    this.layout = res;
    this.layoutVersion++;
    this.painted.clear();
    this.thumbPainted.clear();
    this.msg.textContent = '';
    const n = res.pages.length;
    while (this.pageEls.length > n) this.pageEls.pop()!.remove();
    while (this.pageEls.length < n) {
      const d = document.createElement('div');
      d.className = 'udv-page';
      d.setAttribute('part', 'page');
      d.appendChild(document.createElement('canvas'));
      this.scroller.appendChild(d);
      this.pageEls.push(d);
    }
    this.buildThumbs();
    this.applyZoom(false);
    if (keepFrac) this.scrollToFraction(keepFrac);
  }

  // ───────────────────────── zoom e geometria ─────────────────────────

  private maxPageWidthTw(): number {
    return Math.max(1, ...(this.layout?.pages.map((p) => p.widthTw) ?? [12240]));
  }

  private computeZoom(): number {
    if (typeof this.zoomSpec === 'number') return this.zoomSpec;
    const gap = 16;
    const availW = this.scroller.clientWidth - (this.thumbsOpen ? THUMBS_W : 0) - gap * 2;
    const wFit = availW / (this.maxPageWidthTw() * PX_PER_TWIP);
    if (this.zoomSpec === 'page-width') return Math.max(0.1, wFit);
    const p = this.layout?.pages[this.index] ?? this.layout?.pages[0];
    const hFit = p ? (this.scroller.clientHeight - gap * 2) / (p.heightTw * PX_PER_TWIP) : wFit;
    return Math.max(0.1, Math.min(wFit, hFit));
  }

  /** Recalcula o fator e o tamanho das páginas, mantendo a página atual em vista. */
  private applyZoom(keep = true): void {
    if (!this.layout) return;
    const anchor = keep ? this.anchor() : null;
    const z = this.computeZoom();
    const changed = Math.abs(z - this.zoomFactor) > 1e-4;
    this.zoomFactor = z;
    this.layout.pages.forEach((p, i) => {
      const el = this.pageEls[i]!;
      el.style.width = `${Math.round(p.widthTw * PX_PER_TWIP * z)}px`;
      el.style.height = `${Math.round(p.heightTw * PX_PER_TWIP * z)}px`;
      if (p.background) el.style.background = `#${p.background}`;
    });
    if (anchor) this.restoreAnchor(anchor);
    if (changed) this.dispatchEvent(new CustomEvent('udv-zoom', { detail: { zoom: this.zoomSpec, factor: z } }));
    this.schedule();
  }

  /** Página + posição relativa nela (para o zoom não "pular"). */
  private anchor(): { i: number; f: number } | null {
    const el = this.pageEls[this.index];
    if (!el) return null;
    return { i: this.index, f: (this.scroller.scrollTop - el.offsetTop) / Math.max(1, el.offsetHeight) };
  }

  private restoreAnchor(a: { i: number; f: number }): void {
    const el = this.pageEls[a.i];
    if (el) this.scroller.scrollTop = el.offsetTop + a.f * el.offsetHeight;
  }

  private onResize(): void {
    if (typeof this.zoomSpec !== 'number') this.applyZoom();
    else this.schedule();
  }

  // ───────────────────────── pintura (só o visível) ─────────────────────────

  private schedule(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => { this.rafId = 0; this.update(); });
  }

  private repaintAll(): void {
    this.painted.clear();
    this.thumbPainted.clear();
    this.schedule();
  }

  private paintEnv(): EnginePaintEnv {
    return {
      fontOf: (face) => this.fonts.cssOf(face),
      image: (img) => this.bitmapFor(img),
      color: (hex) => `#${hex}`,
    };
  }

  private update(): void {
    const res = this.layout;
    if (!res) return;
    const s = this.scroller;
    const top = s.scrollTop, bottom = top + s.clientHeight;
    // página atual: a última cujo topo passou do 1º terço da janela
    let cur = 0;
    for (let i = 0; i < this.pageEls.length; i++) {
      if (this.pageEls[i]!.offsetTop <= top + s.clientHeight / 3) cur = i; else break;
    }
    if (cur !== this.index) {
      this.index = cur;
      this.dispatchEvent(new CustomEvent('udv-page', { detail: { index: cur } }));
    }
    const dpr = window.devicePixelRatio || 1;
    const key = `${this.layoutVersion}|${this.zoomFactor.toFixed(4)}|${dpr}`;
    const margin = s.clientHeight;
    for (let i = 0; i < this.pageEls.length; i++) {
      const el = this.pageEls[i]!;
      const visible = el.offsetTop + el.offsetHeight >= top - margin && el.offsetTop <= bottom + margin;
      const cv = el.firstElementChild as HTMLCanvasElement;
      if (!visible) {
        if (this.painted.has(i)) { cv.width = cv.height = 0; this.painted.delete(i); }
        continue;
      }
      if (this.painted.get(i) === key) continue;
      this.paintPage(i, cv, this.zoomFactor * dpr);
      this.painted.set(i, key);
    }
    if (this.thumbsOpen) this.updateThumbs();
    this.syncThumbCurrent();
    this.controls.sync();
  }

  /** Pinta a página `i` num canvas, na escala px/(px CSS a 100%). */
  private paintPage(i: number, cv: HTMLCanvasElement, k: number): void {
    const p = this.layout!.pages[i]!;
    const w = Math.max(1, Math.round(p.widthTw * PX_PER_TWIP * k)), h = Math.max(1, Math.round(p.heightTw * PX_PER_TWIP * k));
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = p.background ? `#${p.background}` : '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const sc = (w / p.widthTw);
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    try { paintItems(ctx, p.items, this.paintEnv()); } catch { /* item que o pintor não conhece: o resto fica */ }
  }

  /** Imagem decodificada (o vetor SVG, como o Word, quando houver). */
  private bitmapFor(img: InlineImage): CanvasImageSource | null {
    const c = this.bitmaps.get(img);
    if (c === 'loading' || c === null) return null;
    if (c) return c;
    this.bitmaps.set(img, 'loading');
    const done = (b: ImageBitmap | HTMLCanvasElement | null): void => { this.bitmaps.set(img, b); if (b) this.repaintAll(); };
    const svg = (img as { svg?: Uint8Array }).svg;
    if (svg) {
      const url = URL.createObjectURL(new Blob([new Uint8Array(svg)], { type: 'image/svg+xml' }));
      const el = new Image();
      el.onload = () => {
        try {
          const SS = 3;
          const wt = (img as { widthTwips?: number }).widthTwips, ht = (img as { heightTwips?: number }).heightTwips;
          const oc = document.createElement('canvas');
          oc.width = Math.min(4096, Math.max(1, Math.round((wt ?? el.width / PX_PER_TWIP) * PX_PER_TWIP * SS)));
          oc.height = Math.min(4096, Math.max(1, Math.round((ht ?? el.height / PX_PER_TWIP) * PX_PER_TWIP * SS)));
          oc.getContext('2d')!.drawImage(el, 0, 0, oc.width, oc.height);
          done(oc);
        } catch { done(null); }
        URL.revokeObjectURL(url);
      };
      el.onerror = () => { URL.revokeObjectURL(url); done(null); };
      el.src = url;
      return null;
    }
    const ext = img.ext === 'jpg' ? 'jpeg' : img.ext;
    void createImageBitmap(new Blob([new Uint8Array(img.data)], { type: `image/${ext}` })).then(done, () => done(null));
    return null;
  }

  // ───────────────────────── miniaturas ─────────────────────────

  private buildThumbs(): void {
    const n = this.layout?.pages.length ?? 0;
    this.thumbs.textContent = '';
    this.thumbEls = [];
    for (let i = 0; i < n; i++) {
      const p = this.layout!.pages[i]!;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'udv-thumb';
      b.setAttribute('part', 'thumbnail');
      b.dataset['i'] = String(i);
      const w = 84, h = Math.round(w * p.heightTw / p.widthTw);
      b.style.width = `${w}px`; b.style.height = `${h}px`;
      b.appendChild(document.createElement('canvas'));
      const num = document.createElement('span');
      num.textContent = String(i + 1);
      this.thumbs.append(b, num);
      this.thumbEls.push(b);
    }
    this.labelThumbs();
  }

  private labelThumbs(lang?: string): void {
    const L = labelsFor(lang ?? langOf(this));
    this.thumbEls.forEach((b, i) => b.setAttribute('aria-label', `${L.page} ${i + 1}`));
  }

  private updateThumbs(): void {
    const s = this.thumbs, top = s.scrollTop, bottom = top + s.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const key = `${this.layoutVersion}|${dpr}`;
    for (let i = 0; i < this.thumbEls.length; i++) {
      const el = this.thumbEls[i]!;
      if (el.offsetTop + el.offsetHeight < top - 200 || el.offsetTop > bottom + 200) continue;
      if (this.thumbPainted.get(i) === key) continue;
      const p = this.layout!.pages[i]!;
      this.paintPage(i, el.firstElementChild as HTMLCanvasElement, (el.offsetWidth / (p.widthTw * PX_PER_TWIP)) * dpr);
      this.thumbPainted.set(i, key);
    }
  }

  private syncThumbCurrent(): void {
    this.thumbEls.forEach((t, i) => {
      const cur = i === this.index;
      if ((t.getAttribute('aria-current') === 'true') === cur) return;
      t.setAttribute('aria-current', String(cur));
      if (cur && this.thumbsOpen) {
        const s = this.thumbs;
        if (t.offsetTop < s.scrollTop) s.scrollTop = t.offsetTop - 12;
        else if (t.offsetTop + t.offsetHeight > s.scrollTop + s.clientHeight) s.scrollTop = t.offsetTop + t.offsetHeight - s.clientHeight + 40;
      }
    });
  }

  private setThumbs(open: boolean): void {
    if (open === this.thumbsOpen) return;
    this.thumbsOpen = open;
    this.thumbs.hidden = !open;
    this.wrap.classList.toggle('udv-thumbs-open', open);
    for (const t of this.thumbEls) t.removeAttribute('aria-current');
    this.applyZoom();
  }

  // ───────────────────────── API ─────────────────────────

  getPageCount(): number { return this.layout?.pages.length ?? 0; }
  getPageIndex(): number { return this.index; }

  goToPage(i: number): void {
    const el = this.pageEls[Math.max(0, Math.min(this.pageEls.length - 1, i))];
    if (!el) return;
    this.scroller.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
  }

  /** `page-width`, `page-fit` ou fator (1 = 100%). */
  setZoom(z: ZoomSpec): void {
    this.zoomSpec = typeof z === 'number' ? Math.max(0.1, Math.min(8, z)) : z;
    this.applyZoom();
    this.controls.sync();
  }

  getZoom(): { spec: ZoomSpec; factor: number } { return { spec: this.zoomSpec, factor: this.zoomFactor }; }

  /** PDF do MESMO layout da tela (o pintor de referência do motor). */
  exportPdf(): Uint8Array {
    if (!this.layout) throw new Error('document not loaded');
    return renderPdf(this.layout);
  }

  /** Imprime pelo PDF do motor (não pelo que está na tela): `udv-print` cancelável. */
  print(): void {
    if (!this.layout) return;
    const pdf = this.exportPdf();
    if (!this.dispatchEvent(new CustomEvent('udv-print', { cancelable: true, detail: { pdf } }))) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }));
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden';
    frame.onload = () => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
      catch { window.open(url, '_blank', 'noopener'); }
      setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60_000);
    };
    frame.src = url;
    document.body.appendChild(frame);
  }

  /** Baixa o arquivo ORIGINAL: `udv-download` cancelável (bytes + nome). */
  download(): void {
    const bytes = this.fileBytes;
    if (!bytes) return;
    const doc = isWordBinary(bytes);
    const src = this.getAttribute('src');
    let name = '';
    try { name = src ? decodeURIComponent(src.split(/[?#]/)[0]!.split('/').pop() ?? '') : ''; } catch { /* nome ilegível */ }
    if (!/\.(docx|docm|dotx|doc|dot)$/i.test(name)) name = `documento.${doc ? 'doc' : 'docx'}`;
    if (!this.dispatchEvent(new CustomEvent('udv-download', { cancelable: true, detail: { bytes, filename: name } }))) return;
    const type = doc ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  toggleFullscreen(): void {
    if (this.root.fullscreenElement === this.wrap) document.exitFullscreen().catch(() => {});
    else if (document.fullscreenEnabled && this.wrap.requestFullscreen) this.wrap.requestFullscreen().catch(() => {});
  }

  private onFullscreenChange = (): void => { this.controls.wake(); this.controls.sync(); };

  private scrollFraction(): number {
    const s = this.scroller, max = s.scrollHeight - s.clientHeight;
    return max > 0 ? Math.max(0, Math.min(1, s.scrollTop / max)) : 0;
  }

  private scrollToFraction(f: number): void {
    const s = this.scroller;
    s.scrollTop = f * (s.scrollHeight - s.clientHeight);
  }

  private controlsHost(): ControlsHost {
    return {
      count: () => this.getPageCount(),
      index: () => this.index,
      goTo: (i) => this.goToPage(i),
      scrollFraction: () => this.scrollFraction(),
      scrollToFraction: (f) => this.scrollToFraction(f),
      zoom: () => this.getZoom(),
      setZoom: (z) => this.setZoom(z),
      thumbnailsOpen: () => this.thumbsOpen,
      toggleThumbnails: () => this.setThumbs(!this.thumbsOpen),
      download: () => this.download(),
      print: () => this.print(),
      isFullscreen: () => this.root.fullscreenElement === this.wrap,
      toggleFullscreen: () => this.toggleFullscreen(),
    };
  }

  /** Ctrl +/−/0: zoom do viewer (não o do navegador) com o foco nele. */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (!(e.ctrlKey || e.metaKey) || this.hasAttribute('nozoom')) return;
    if (e.key === '+' || e.key === '=') { this.setZoom(this.zoomFactor * 1.25); e.preventDefault(); }
    else if (e.key === '-') { this.setZoom(this.zoomFactor / 1.25); e.preventDefault(); }
    else if (e.key === '0') { this.setZoom('page-width'); e.preventDefault(); }
  };

  /** Ctrl + roda: zoom do viewer. */
  private onWheel = (e: WheelEvent): void => {
    if (!(e.ctrlKey || e.metaKey) || this.hasAttribute('nozoom') || !this.layout) return;
    e.preventDefault();
    this.setZoom(this.zoomFactor * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  };
}

customElements.define('universal-document-viewer', UniversalDocumentViewerElement);
