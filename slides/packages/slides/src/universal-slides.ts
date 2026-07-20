import {
  PptxPackage, readPresentation, readSlide, paintSlideTo,
  type ChartModel, type PaintImage, type PaintSlideOptions,
  type Presentation, type Slide, type Shape, type ImageRef,
  type Paragraph, type Run,
} from '@universal/slides-core';

/**
 * <universal-slides> — webcomponent que renderiza um .pptx slide a slide em
 * canvas, fiel ao app de referência. Geometria em EMU escalada para caber no canvas
 * (slide centralizado, fundo branco). Texto com paragrafos, ancora vertical,
 * alinhamento e fontes por run.
 *
 * A pintura em si vive na função PURA `paintSlideTo` (slides-core/render.ts),
 * compartilhada com miniaturas e com o export de imagens (`pptxToImages` da
 * spec 05). O componente cuida apenas do chrome (fundo, borda, badge),
 * decodificação de imagens (HTMLImageElement + Blob URL), edição inline,
 * animações e transições.
 */

export class UniversalSlidesElement extends HTMLElement {
  private host = this.attachShadow({ mode: 'open' });
  private canvas = document.createElement('canvas');
  private badge = document.createElement('div');

  private pkg: PptxPackage | null = null;
  private pres: Presentation | null = null;
  private slides: Slide[] = [];
  private index = 0;
  /**
   * Cache de decodificacao de imagens (`<p:pic>` + bg image). Chave = `ImageRef.part`
   * (caminho unico no pacote). Reutilizamos entre slides — uma logo repetida em
   * varios slides decodifica UMA vez. Pintamos sem bloquear: enquanto a imagem
   * ainda nao carregou, deixamos o retangulo vazio; um repaint e disparado quando
   * `onload` chega.
   */
  private imageCache = new Map<string, { img: HTMLImageElement; ready: boolean }>();
  /** Cache de ChartModel parseado, por XML cru (passado a paintSlideTo). */
  private chartCache = new Map<string, ChartModel>();
  /** Editor inline da shape de texto (criado em `beginEditShape`). */
  private editor: HTMLDivElement | null = null;
  private editingShape: { slide: number; shapeIdx: number } | null = null;
  /** Wrapper que hospeda canvas + badge + editor. */
  private wrap = document.createElement('div');
  /**
   * Estado da animação em curso. Sem animação tocando, `playStartMs = null`.
   * `now` cacheia o tempo do último frame para opacidades determinísticas.
   */
  private play: { startMs: number | null; rafId: number; pausedAt: number } = { startMs: null, rafId: 0, pausedAt: 0 };
  /** True quando o play deve respeitar `clickGated` (espera click p/ avançar). */
  private clickAdvance = true;
  /**
   * Snapshot do frame anterior pra transição entre slides. `prevImage` é o
   * ImageBitmap do canvas no instante em que selectSlide foi chamado;
   * `transStart` quando começou a transição; `transDurMs` total da transição.
   */
  private trans: { prevImage: ImageData | null; startMs: number | null; durMs: number; type: string } = {
    prevImage: null, startMs: null, durMs: 0, type: 'fade',
  };

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
    // Double-click sobre uma shape de texto entra em modo edição. Single click
    // só dá foco (NUNCA avança o slide — o usuário tem teclado/chrome p/ isso).
    // Hyperlinks: click simples sobre shape cujo txBody contém run.hyperlink
    // abre URL em nova aba.
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  connectedCallback(): void {
    new ResizeObserver(() => { this.resize(); this.paint(); }).observe(this.canvas);
    this.resize(); this.paint();
    (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => this.paint()).catch(() => {});
  }

  /** Carrega bytes .pptx e monta os slides. */
  loadPptx(bytes: Uint8Array): void {
    this.pkg = PptxPackage.load(bytes);
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

  /**
   * Inicia a decodificacao de uma ImageRef e dispara um repaint quando carrega.
   * Reentrante: chamadas repetidas para o mesmo `part` reaproveitam o HTMLImageElement.
   */
  private warmImage(ref: ImageRef): void {
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
  private readyImages(slide: Slide): Map<string, PaintImage> {
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
    if (this.editingShape) this.commitEditShape();
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

  /** RAF loop que pinta a transição até completar, depois libera o snapshot. */
  private startTransitionPlayback(): void {
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
   * efeito terminar. Sem animacoes → noop. clickGated é ignorado nesta v1
   * (todos efeitos rodam em sequência calculada).
   */
  private startAnimation(): void {
    const slide = this.slides[this.index];
    if (!slide?.animations || slide.animations.length === 0) return;
    this.play.startMs = (window.performance ?? Date).now();
    const lastEnd = Math.max(...slide.animations.map((a) => a.delayMs + a.durMs));
    const tick = (): void => {
      if (this.play.startMs == null) return;
      const tMs = ((window.performance ?? Date).now()) - this.play.startMs;
      this.paint();
      if (tMs < lastEnd) this.play.rafId = requestAnimationFrame(tick);
      else this.play.startMs = null;
    };
    this.play.rafId = requestAnimationFrame(tick);
  }

  /** Para qualquer animação em curso (cancela o RAF). */
  private stopAnimation(): void {
    if (this.play.rafId) cancelAnimationFrame(this.play.rafId);
    this.play.startMs = null;
    this.play.rafId = 0;
  }

  /**
   * Opacidade computada de uma shape no instante t da timeline. Sem animacao
   * para essa shape → opaca. Antes do delay → invisível. Durante o ramp →
   * linear; após o fim → opaca.
   */
  private shapeOpacity(shape: Shape, slide: Slide): number {
    if (!slide.animations || slide.animations.length === 0) return 1;
    if (this.play.startMs == null) return 1; // sem playback => mostra tudo
    const t = ((window.performance ?? Date).now()) - this.play.startMs;
    const entry = slide.animations.find((a) => a.spid === shape.id);
    if (!entry) return 1;
    if (t < entry.delayMs) return 0;
    if (t >= entry.delayMs + entry.durMs) return 1;
    const f = (t - entry.delayMs) / entry.durMs;
    return entry.type === 'fade' ? f : 1;
  }
  next(): void { this.selectSlide(Math.min(this.slides.length - 1, this.index + 1)); }
  prev(): void { this.selectSlide(Math.max(0, this.index - 1)); }

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

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.editingShape) return; // teclado pertence ao editor
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { this.next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.prev(); e.preventDefault(); }
    else if (e.key === 'Home') { this.selectSlide(0); e.preventDefault(); }
    else if (e.key === 'End') { this.selectSlide(this.slides.length - 1); e.preventDefault(); }
  };

  /**
   * Detecta hyperlink na posição (canvas-relativa) e abre URL se houver.
   * v1: o link é "shape-wide" (a primeira run com hyperlink no txBody manda).
   * Não tenta delimitar o run específico — basta clicar dentro da shape.
   */
  private onClick = (e: MouseEvent): void => {
    if (this.editingShape) return;
    const hit = this.hitTestHyperlink(e);
    if (hit) {
      window.open(hit, '_blank', 'noopener');
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.editingShape) return;
    this.canvas.style.cursor = this.hitTestHyperlink(e) ? 'pointer' : 'default';
  };

  /** Devolve a primeira URL de hyperlink sob (clientX, clientY) ou null. */
  private hitTestHyperlink(e: MouseEvent): string | null {
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

  private onDblClick = (e: MouseEvent): void => {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // hit-test: ULTIMA shape com txBody que contem o ponto (z-order: a mais ao topo).
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i]!;
      if (!sh.txBody || !sh.xfrm) continue;
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
   * sobre o `xfrm` da shape. Enter (sem Shift) e Esc commitam; blur commita.
   * **Limitação v1:** ao commitar, descarta runs e mantém um único run com o
   * texto editado no PRIMEIRO parágrafo. Preservação de runs/formato vem em
   * iterações futuras (precisa de diff + reaplicação por offset).
   */
  beginEditShape(shapeIdx: number): void {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const sh = slide.shapes[shapeIdx];
    if (!sh || !sh.xfrm || !sh.txBody) return;
    if (this.editor) this.commitEditShape();
    this.editingShape = { slide: this.index, shapeIdx };

    // texto inicial: concat de runs (\n entre paragrafos)
    const initialText = sh.txBody.paragraphs
      .map((p) => p.runs.map((r) => r.text).join(''))
      .join('\n');

    const left = fit.ox + sh.xfrm.x * fit.scale;
    const top = fit.oy + sh.xfrm.y * fit.scale;
    const w = sh.xfrm.cx * fit.scale;
    const h = sh.xfrm.cy * fit.scale;
    // estimativa de tamanho de fonte = sz do primeiro run (default 18pt)
    const firstRun = sh.txBody.paragraphs[0]?.runs[0];
    const pt = firstRun?.sz ?? (sh.phType === 'title' || sh.phType === 'ctrTitle' ? 40 : 18);
    const px = pt * 12700 * fit.scale / 12700; // pt -> px (12700 EMU/pt, escala 1:1)
    const color = firstRun?.color ?? '#000000';
    const font = firstRun?.font ?? 'Calibri';
    const align = sh.txBody.paragraphs[0]?.align;

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.spellcheck = false;
    div.textContent = initialText;
    div.style.cssText =
      `position:absolute;left:${left}px;top:${top}px;width:${w}px;min-height:${h}px;` +
      `padding:4px;border:2px dashed #ff7043;outline:none;background:rgba(255,255,255,.92);` +
      `color:${color};font:${px}px '${font}', 'Aptos', Calibri, Arial, sans-serif;` +
      `text-align:${align === 'ctr' ? 'center' : align === 'r' ? 'right' : 'left'};` +
      `white-space:pre-wrap;z-index:5;`;
    this.wrap.appendChild(div);
    this.editor = div;
    div.focus();
    // seleciona todo o texto (Excel/PowerPoint convention: F2/dbl-click selects)
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }

    let suppressBlur = false;
    div.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEditShape();
        this.canvas.focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        suppressBlur = true;
        this.cancelEditShape();
        this.canvas.focus();
      }
    });
    div.addEventListener('blur', () => {
      if (suppressBlur || !this.editingShape) return;
      this.commitEditShape();
    });
  }

  /** Commita a edição → atualiza shape.txBody.paragraphs com o texto editado. */
  commitEditShape(): void {
    if (!this.editor || !this.editingShape) return;
    const text = this.editor.innerText.replace(/\r\n/g, '\n');
    const { slide: slideIdx, shapeIdx } = this.editingShape;
    const slide = this.slides[slideIdx];
    const sh = slide?.shapes[shapeIdx];
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    if (!sh || !sh.txBody) { this.paint(); return; }
    // v1: 1 paragrafo por linha, 1 run por paragrafo. Preserva sz/cor/fonte do
    // PRIMEIRO run quando possivel (default razoavel).
    const firstRun: Run | undefined = sh.txBody.paragraphs[0]?.runs[0];
    const firstPara: Paragraph | undefined = sh.txBody.paragraphs[0];
    sh.txBody.paragraphs = text.split('\n').map((line): Paragraph => {
      const run: Run = { text: line };
      if (firstRun?.sz !== undefined) run.sz = firstRun.sz;
      if (firstRun?.bold) run.bold = true;
      if (firstRun?.italic) run.italic = true;
      if (firstRun?.underline) run.underline = true;
      if (firstRun?.color) run.color = firstRun.color;
      if (firstRun?.font) run.font = firstRun.font;
      const para: Paragraph = { runs: [run] };
      if (firstPara?.align) para.align = firstPara.align;
      if (firstPara?.bullet) para.bullet = firstPara.bullet;
      return para;
    });
    this.dispatchEvent(new CustomEvent('us-shape-edit', {
      detail: { slide: slideIdx, shapeIdx, text },
    }));
    this.paint();
  }

  /** Descarta a edição em curso (texto original mantido). */
  cancelEditShape(): void {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    this.paint();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /** Geometria de encaixe do slide no canvas (origem + escala EMU→px). */
  private fit(): { ox: number; oy: number; scale: number; sw: number; sh: number } | null {
    if (!this.pres) return null;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const margin = 16;
    const aw = W - margin * 2, ah = H - margin * 2;
    const scale = Math.min(aw / this.pres.slideW, ah / this.pres.slideH);
    const sw = this.pres.slideW * scale, sh = this.pres.slideH * scale;
    return { ox: (W - sw) / 2, oy: (H - sh) / 2, scale, sw, sh };
  }

  private paint(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
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
    const editingIdx = this.editingShape && this.editingShape.slide === this.index
      ? this.editingShape.shapeIdx
      : undefined;
    const paintOpts: PaintSlideOptions = {
      ox: fit.ox, oy: fit.oy,
      shapeOpacity: (sh) => this.shapeOpacity(sh, slide),
    };
    if (editingIdx !== undefined) paintOpts.suppressTextShapeIdx = editingIdx;
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

customElements.define('universal-slides', UniversalSlidesElement);
