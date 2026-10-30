// Painéis das barras do Slides: as MINIATURAS (à esquerda, como o modo Normal
// do PowerPoint — clicar, arrastar para reordenar, menu de contexto, teclas),
// a CLASSIFICAÇÃO DE SLIDES (a mesma lista em grade), as ANOTAÇÕES (embaixo do
// slide), o PAINEL DE ANIMAÇÃO (leitura) e a BARRA DE STATUS. As miniaturas
// usam o `renderThumbnail` do viewer — o mesmo motor da tela.
import {
  openMenu, openPane, renderItem, symbol, toggleMenu,
  type BarContext, type MenuEntry, type MenuItem, type PaneHandle, type RenderedItem,
} from '@universal-office/ui';
import type { UniversalSlidesElement } from './universal-slides.js';
import type { ChromeLabels } from './chrome-labels.js';
import { L, ZOOMS, ic } from './chrome-commands.js';
import { backgroundMenu, layoutMenu, transitionMenu, type WidgetEnv } from './chrome-widgets.js';

/** Menu de contexto de um slide (miniaturas e classificação). */
export function slideContextMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  return ['slide:new', 'slide:duplicate', 'slide:delete', 'slide:hide', '-',
    { id: 'layout:ctx', label: L('Layout', 'Layout'), icon: ic('dashboard'), submenu: () => layoutMenu(env, ctx, 'change') },
    { id: 'background:ctx', label: L('Background', 'Plano de fundo'), icon: ic('wallpaper'), submenu: () => backgroundMenu(env, ctx) },
    { id: 'transition:ctx', label: L('Transition', 'Transição'), icon: ic('transition_fade'), submenu: () => transitionMenu(env, ctx) },
    '-', 'slide:up', 'slide:down'];
}

/** Lista de slides (painel vertical ou grade da classificação). */
export class SlideList {
  readonly el: HTMLElement;
  private items: HTMLElement[] = [];
  private visible = new Set<number>();
  private dirty = new Set<number>();
  private io: IntersectionObserver | null = null;
  private dragFrom = -1;
  private raf = 0;

  constructor(private readonly env: WidgetEnv, private readonly ctx: BarContext, private readonly mode: 'pane' | 'grid', private readonly labels: ChromeLabels) {
    const el = this.el = document.createElement('div');
    el.className = mode === 'pane' ? 'us-thumbs' : 'us-sorter';
    el.setAttribute('part', mode === 'pane' ? 'thumbnails' : 'sorter');
    el.setAttribute('role', 'listbox');
    el.setAttribute('aria-label', ctx.registry.text(mode === 'pane' ? L('Slides', 'Slides') : L('Slide Sorter', 'Classificação de Slides')));
    el.tabIndex = 0;
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset['i']);
          if (e.isIntersecting) this.visible.add(i); else this.visible.delete(i);
        }
        this.schedule();
      }, { root: el, rootMargin: '200px 0px' });
    }
    el.addEventListener('keydown', this.onKey);
    el.addEventListener('contextmenu', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.us-slide');
      if (!item) return;
      e.preventDefault();
      const i = Number(item.dataset['i']);
      if (i !== this.env.el.getSlideIndex()) this.env.el.selectSlide(i);
      openMenu(slideContextMenu(this.env, this.ctx), { x: e.clientX, y: e.clientY }, { lang: this.ctx.lang, registry: this.ctx.registry, layer: this.ctx.layer, onClose: () => this.ctx.after() });
    });
  }

  /** Remonta os itens quando o número de slides muda; senão só o estado. */
  render(): void {
    const el = this.env.el;
    const n = el.getSlideCount();
    if (n !== this.items.length) {
      this.io?.disconnect();
      this.visible.clear();
      this.el.replaceChildren();
      this.items = [];
      for (let i = 0; i < n; i++) this.items.push(this.makeItem(i));
      this.el.append(...this.items);
      if (!this.io) for (let i = 0; i < n; i++) this.visible.add(i);
      for (const it of this.items) this.io?.observe(it);
      if (!n) {
        const empty = document.createElement('div');
        empty.className = 'us-thumbs-empty';
        empty.textContent = this.labels.noSlides;
        this.el.appendChild(empty);
      }
    }
    this.invalidate();
    this.syncState();
  }

  private makeItem(i: number): HTMLElement {
    const it = document.createElement('div');
    it.className = 'us-slide';
    it.dataset['i'] = String(i);
    it.setAttribute('role', 'option');
    it.draggable = true;
    const num = document.createElement('span');
    num.className = 'us-num';
    num.textContent = String(i + 1);
    const frame = document.createElement('div');
    frame.className = 'us-frame';
    const c = document.createElement('canvas');
    frame.appendChild(c);
    const mark = document.createElement('span');
    mark.className = 'us-hidden-mark';
    mark.innerHTML = symbol('visibility_off');
    frame.appendChild(mark);
    it.append(num, frame);
    it.addEventListener('click', () => { this.env.el.selectSlide(i); this.el.focus(); this.ctx.after(); });
    it.addEventListener('dblclick', () => { if (this.mode === 'grid') this.env.ctl.setView('normal'); });
    it.addEventListener('dragstart', (e) => { this.dragFrom = i; e.dataTransfer?.setData('text/plain', `slide:${i}`); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; it.classList.add('us-dragging'); });
    it.addEventListener('dragend', () => { this.dragFrom = -1; it.classList.remove('us-dragging'); this.clearDrop(); });
    it.addEventListener('dragover', (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.clearDrop();
      const r = it.getBoundingClientRect();
      const after = this.mode === 'pane' ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
      it.classList.add(after ? 'us-drop-after' : 'us-drop-before');
    });
    it.addEventListener('drop', (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      e.stopPropagation();
      const after = it.classList.contains('us-drop-after');
      this.clearDrop();
      let to = i + (after ? 1 : 0);
      if (to > this.dragFrom) to--;
      const from = this.dragFrom;
      this.dragFrom = -1;
      if (to !== from) { this.env.el.moveSlide(from, to); this.ctx.after(); }
    });
    return it;
  }

  private clearDrop(): void {
    for (const x of this.el.querySelectorAll('.us-drop-before, .us-drop-after')) x.classList.remove('us-drop-before', 'us-drop-after');
  }

  /** Estado (atual, oculto, proporção) sem repintar. */
  syncState(): void {
    const el = this.env.el;
    const cur = el.getSlideIndex();
    const aspect = el.getSlideAspect();
    this.items.forEach((it, i) => {
      const on = i === cur;
      it.classList.toggle('uo-on', on);
      it.setAttribute('aria-selected', String(on));
      it.classList.toggle('us-is-hidden', el.isSlideHidden(i));
      const frame = it.querySelector<HTMLElement>('.us-frame');
      if (frame) frame.style.aspectRatio = String(aspect);
    });
  }

  /** O slide atual entra no campo de visão da lista. */
  reveal(): void {
    const it = this.items[this.env.el.getSlideIndex()];
    if (!it || !this.el.isConnected) return;
    const r = it.getBoundingClientRect(), box = this.el.getBoundingClientRect();
    if (r.top < box.top) this.el.scrollTop -= box.top - r.top + 8;
    else if (r.bottom > box.bottom) this.el.scrollTop += r.bottom - box.bottom + 8;
  }

  /** Marca miniaturas para repintar (todas, ou só `i`). */
  invalidate(i?: number): void {
    if (i === undefined) for (let k = 0; k < this.items.length; k++) this.dirty.add(k);
    else this.dirty.add(i);
    this.schedule();
  }

  private schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.paint(); });
  }

  private paint(): void {
    if (!this.el.isConnected || this.el.hidden) return;
    for (const i of [...this.dirty]) {
      if (!this.visible.has(i)) continue;
      const c = this.items[i]?.querySelector('canvas');
      if (c && c.clientWidth > 0) { this.env.el.renderThumbnail(i, c); this.dirty.delete(i); }
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    const el = this.env.el;
    const n = el.getSlideCount();
    const cur = el.getSlideIndex();
    const cols = this.mode === 'grid' ? Math.max(1, Math.round(this.el.clientWidth / 240)) : 1;
    const go = (i: number): void => { e.preventDefault(); e.stopPropagation(); el.selectSlide(Math.max(0, Math.min(n - 1, i))); this.reveal(); this.ctx.after(); };
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowUp': go(cur - cols); break;
      case 'ArrowDown': go(cur + cols); break;
      case 'ArrowLeft': if (this.mode === 'grid') go(cur - 1); break;
      case 'ArrowRight': if (this.mode === 'grid') go(cur + 1); break;
      case 'Home': go(0); break;
      case 'End': go(n - 1); break;
      case 'PageUp': go(cur - 5 * cols); break;
      case 'PageDown': go(cur + 5 * cols); break;
      case 'Delete': case 'Backspace': e.preventDefault(); e.stopPropagation(); void this.ctx.registry.run('slide:delete'); break;
      case 'Enter':
        e.preventDefault(); e.stopPropagation();
        if (this.mode === 'grid') this.env.ctl.setView('normal'); else void this.ctx.registry.run('slide:new');
        break;
      default:
    }
  };

  destroy(): void {
    this.io?.disconnect();
    cancelAnimationFrame(this.raf);
    this.el.remove();
  }
}

/** Anotações do orador do slide atual (texto puro), embaixo do slide. */
export class NotesPane {
  readonly el: HTMLElement;
  private readonly area: HTMLTextAreaElement;
  private index = -1;
  private timer = 0;
  /** Texto digitado e ainda não gravado no documento (o app avisa o host para não fechar sem perguntar). */
  onPendingChange: ((pending: boolean) => void) | null = null;

  constructor(private readonly env: WidgetEnv, private readonly labels: ChromeLabels) {
    const el = this.el = document.createElement('div');
    el.className = 'us-notes';
    el.setAttribute('part', 'notes');
    const grip = document.createElement('div');
    grip.className = 'us-notes-grip';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'horizontal');
    this.area = document.createElement('textarea');
    this.area.className = 'us-notes-text';
    this.area.dataset['a'] = 'notes';
    this.area.spellcheck = true;
    this.area.setAttribute('aria-label', labels.notesPlaceholder);
    this.area.addEventListener('input', () => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.commit(), 800);
      this.onPendingChange?.(this.index >= 0 && this.area.value !== this.env.el.getSlideNotes(this.index));
    });
    this.area.addEventListener('blur', () => this.commit());
    el.append(grip, this.area);
    // arrastar a divisória muda a altura do painel
    grip.addEventListener('pointerdown', (e) => {
      const host = this.env.el;
      const start = e.clientY, h0 = el.getBoundingClientRect().height;
      const move = (ev: PointerEvent): void => {
        const h = Math.max(48, Math.min(host.clientHeight * 0.6, h0 - (ev.clientY - start)));
        host.style.setProperty('--us-notes-height', `${Math.round(h)}px`);
      };
      const up = (): void => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      e.preventDefault();
    });
  }

  /** Grava o que mudou no slide em que o texto foi escrito. */
  commit(): void {
    window.clearTimeout(this.timer);
    if (this.index < 0 || this.area.readOnly) return;
    if (this.area.value !== this.env.el.getSlideNotes(this.index)) this.env.el.setSlideNotes(this.area.value, this.index);
    this.onPendingChange?.(false);
  }

  sync(): void {
    const el = this.env.el;
    const i = el.getSlideIndex();
    if (i !== this.index) { this.commit(); this.index = i; this.area.value = el.getSlideCount() ? el.getSlideNotes(i) : ''; }
    else if (this.env.root.activeElement !== this.area) {
      const v = el.getSlideCount() ? el.getSlideNotes(i) : '';
      if (this.area.value !== v) this.area.value = v;
    }
    const editable = el.getSlideCount() > 0 && el.canEditNotes(i);
    this.area.readOnly = !editable;
    this.area.placeholder = editable ? this.labels.notesPlaceholder : '';
  }

  destroy(): void { this.commit(); this.el.remove(); }
}

/** Nomes dos efeitos de animação mais comuns (os do app); o resto sai pela classe. */
const EFFECT_NAMES: Record<string, Record<number, { en: string; pt: string }>> = {
  entr: {
    1: L('Appear', 'Aparecer'), 2: L('Fly In', 'Surgir'), 3: L('Blinds', 'Persianas'), 4: L('Box', 'Caixa'), 5: L('Checkerboard', 'Quadriculado'),
    6: L('Circle', 'Círculo'), 8: L('Diamond', 'Losango'), 9: L('Dissolve In', 'Dissolver'), 10: L('Fade', 'Esmaecer'), 13: L('Plus', 'Sinal de Adição'),
    14: L('Random Bars', 'Barras Aleatórias'), 16: L('Split', 'Dividir'), 18: L('Strips', 'Faixas'), 20: L('Wedge', 'Cunha'), 21: L('Wheel', 'Roda'),
    22: L('Wipe', 'Revelar'), 23: L('Zoom', 'Zoom'), 26: L('Bounce', 'Saltar'), 30: L('Float In', 'Flutuar para Dentro'), 31: L('Grow & Turn', 'Aumentar e Girar'),
    37: L('Rise Up', 'Subir'), 42: L('Ascend', 'Ascender'), 47: L('Descend', 'Descender'), 53: L('Fade Zoom', 'Zoom Esmaecido'), 55: L('Expand', 'Expandir'),
  },
  exit: {
    1: L('Disappear', 'Desaparecer'), 2: L('Fly Out', 'Sair Voando'), 9: L('Dissolve Out', 'Dissolver'), 10: L('Fade', 'Esmaecer'), 16: L('Split', 'Dividir'),
    21: L('Wheel', 'Roda'), 22: L('Wipe', 'Revelar'), 23: L('Zoom', 'Zoom'), 26: L('Bounce', 'Saltar'), 30: L('Float Out', 'Flutuar para Fora'),
  },
  emph: {
    1: L('Fill Color', 'Cor de Preenchimento'), 3: L('Font Color', 'Cor da Fonte'), 6: L('Grow/Shrink', 'Aumentar/Diminuir'), 7: L('Line Color', 'Cor da Linha'),
    8: L('Spin', 'Girar'), 9: L('Transparency', 'Transparência'), 26: L('Pulse', 'Pulsar'), 27: L('Color Pulse', 'Pulso Colorido'), 32: L('Teeter', 'Balançar'),
    35: L('Blink', 'Piscar'), 36: L('Wave', 'Onda'),
  },
};
const CLASS_NAMES: Record<string, { en: string; pt: string }> = {
  entr: L('Entrance', 'Entrada'), exit: L('Exit', 'Saída'), emph: L('Emphasis', 'Ênfase'), path: L('Motion path', 'Trajetória'),
  verb: L('Action', 'Ação'), mediacall: L('Media', 'Mídia'),
};

/** Painel de Animação: as animações do slide atual (leitura) e Reproduzir. */
export class AnimationPane {
  private pane: PaneHandle | null = null;
  private list: HTMLElement | null = null;

  constructor(private readonly env: WidgetEnv, private readonly ctx: BarContext, private readonly frame: () => DOMRect) {}

  get isOpen(): boolean { return !!this.pane?.open; }

  toggle(): void { if (this.isOpen) this.close(); else this.open(); }

  open(): void {
    const body = document.createElement('div');
    body.className = 'us-anim';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'uo-pill us-anim-play';
    play.dataset['a'] = 'animation:play';
    play.innerHTML = `${symbol(ic('play_arrow'))}<span>${this.ctx.registry.text(L('Play', 'Reproduzir'))}</span>`;
    play.addEventListener('click', () => { void this.ctx.registry.run('animation:preview'); });
    const note = document.createElement('p');
    note.className = 'us-anim-note';
    note.textContent = this.ctx.registry.text(L('Animations from the file, as they play in the slide show (editing animations is not available).',
      'As animações do arquivo, como tocam na apresentação (a edição de animações não está disponível).'));
    this.list = document.createElement('ol');
    this.list.className = 'us-anim-list';
    body.append(play, this.list, note);
    this.pane = openPane({
      id: 'us-animation', title: L('Animation Pane', 'Painel de Animação'), lang: this.ctx.lang, layer: this.ctx.layer,
      frame: this.frame, dock: 'right', width: 280, body, onClose: () => { this.pane = null; this.ctx.after(); },
    });
    this.sync();
  }

  close(): void { this.pane?.close(); this.pane = null; }

  place(): void { this.pane?.place(); }

  sync(): void {
    if (!this.pane || !this.list) return;
    const anims = this.env.el.getSlideAnimations();
    this.list.replaceChildren();
    if (!anims.length) {
      const li = document.createElement('li');
      li.className = 'us-anim-empty';
      li.textContent = this.ctx.registry.text(L('This slide has no animations', 'Este slide não tem animações'));
      this.list.appendChild(li);
      return;
    }
    for (const a of anims) {
      const li = document.createElement('li');
      li.className = `us-anim-item us-anim-${a.presetClass}`;
      const step = document.createElement('span');
      step.className = 'us-anim-step';
      step.textContent = a.trigger === 'click' ? String(a.step + 1) : '';
      step.title = this.ctx.registry.text(a.trigger === 'click' ? L('On click', 'Ao clicar') : a.trigger === 'with' ? L('With previous', 'Com o anterior') : L('After previous', 'Após o anterior'));
      const icon = document.createElement('span');
      icon.className = 'us-anim-kind';
      icon.innerHTML = symbol(a.trigger === 'click' ? ic('ads_click') : a.trigger === 'with' ? 'link' : ic('timer'));
      const name = document.createElement('span');
      name.className = 'us-anim-name';
      const effect = EFFECT_NAMES[a.presetClass]?.[a.presetId] ?? CLASS_NAMES[a.presetClass] ?? L(a.presetClass, a.presetClass);
      name.textContent = `${this.ctx.registry.text(effect)} — ${a.shapeName ?? (a.shapeId ? `#${a.shapeId}` : '')}`;
      li.title = `${this.ctx.registry.text(CLASS_NAMES[a.presetClass] ?? L(a.presetClass, a.presetClass))} · ${a.durMs < 0 ? '∞' : `${(a.durMs / 1000).toFixed(2)} s`}`;
      li.append(step, icon, name);
      this.list.appendChild(li);
    }
  }

  destroy(): void { this.close(); }
}

/** Barra de status: "Slide n de N", anotações, modos de exibição e zoom. */
export class StatusBar {
  private readonly status: HTMLButtonElement;
  private readonly slider: HTMLInputElement;
  private readonly items: RenderedItem[] = [];
  private flashTimer = 0;
  private flashing = false;

  constructor(private readonly env: WidgetEnv, container: HTMLElement, private readonly ctx: BarContext, private readonly labels: ChromeLabels) {
    const bar = document.createElement('div');
    bar.className = 'us-status-bar';
    bar.setAttribute('part', 'statusbar');
    this.status = document.createElement('button');
    this.status.type = 'button';
    this.status.className = 'uo-btn us-status';
    this.status.dataset['a'] = 'status';
    this.status.setAttribute('role', 'status');
    this.status.addEventListener('mousedown', (e) => e.preventDefault());
    this.status.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = this.env.el;
      toggleMenu(this.status, () => Array.from({ length: el.getSlideCount() }, (_, i): MenuItem => ({
        id: `goto:${i}`, label: `${i + 1}`, checked: i === el.getSlideIndex(), onClick: () => { el.selectSlide(i); ctx.after(); },
      })), ctx);
    });
    const sp = document.createElement('span');
    sp.className = 'uo-spacer';
    bar.append(this.status, sp);
    const add = (id: string, into: HTMLElement): void => {
      const r = renderItem(id, ctx);
      into.appendChild(r.el);
      this.items.push(r);
    };
    add('view:notes', bar);
    const views = document.createElement('span');
    views.className = 'us-views';
    for (const id of ['view:normal', 'view:sorter', 'view:reading', 'show:current']) add(id, views);
    bar.appendChild(views);
    add('zoomout', bar);
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '10';
    this.slider.max = '400';
    this.slider.step = '1';
    this.slider.className = 'us-zoom-slider';
    this.slider.dataset['a'] = 'zoom:slider';
    this.slider.title = ctx.registry.text(L('Zoom (Ctrl+wheel on the slide)', 'Zoom (Ctrl+roda sobre o slide)'));
    this.slider.addEventListener('input', () => this.env.el.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener('change', () => ctx.after());
    bar.appendChild(this.slider);
    add('zoomin', bar);
    const pct = document.createElement('button');
    pct.type = 'button';
    pct.className = 'uo-btn us-zoom-pct';
    pct.dataset['a'] = 'zoom';
    pct.title = ctx.registry.text(L('Zoom', 'Zoom'));
    pct.addEventListener('mousedown', (e) => e.preventDefault());
    pct.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(pct, () => ['zoomfit', '-', ...ZOOMS.map((z): MenuItem => ({
        label: `${z}%`, checked: !this.env.el.isZoomFit() && Math.round(this.env.el.getZoom() * 100) === z,
        onClick: () => { this.env.el.setZoom(z / 100); ctx.after(); },
      }))], ctx);
    });
    this.items.push({ el: pct, visible: () => true, sync: () => { pct.textContent = `${Math.round(this.env.el.getZoom() * 100)}%`; } });
    bar.appendChild(pct);
    add('zoomfit', bar);
    container.appendChild(bar);
  }

  flash(msg: string): void {
    window.clearTimeout(this.flashTimer);
    if (!msg) { this.flashing = false; this.sync(); return; }
    this.flashing = true;
    this.status.textContent = msg;
    this.flashTimer = window.setTimeout(() => { this.flashing = false; this.sync(); }, 3200);
  }

  sync(): void {
    const el = this.env.el;
    if (!this.flashing) {
      const n = el.getSlideCount();
      const i = el.getSlideIndex();
      this.status.textContent = n ? this.labels.slideOf(i + 1, n) + (el.isSlideHidden(i) ? ` · ${this.labels.hidden}` : '') : this.labels.noSlides;
    }
    this.status.disabled = !el.getSlideCount();
    for (const r of this.items) r.sync();
    if (this.env.root.activeElement !== this.slider) this.slider.value = String(Math.round(el.getZoom() * 100));
  }
}
