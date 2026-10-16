/**
 * Barra de controles do <universal-presentation-viewer> — o equivalente aos
 * controles nativos do <video>: aparece por padrão, `nocontrols` desliga tudo
 * e um atributo booleano por item tira só ele: `nodownload`, `nofullscreen`,
 * `nothumbnails`… (`no` + nome do item, ver CONTROL_ITEMS).
 *
 * Personalização pelo host, sem tocar no shadow DOM:
 *  - variáveis CSS (herdam pela fronteira do shadow): `--upv-controls-color`,
 *    `--upv-controls-size`, `--upv-controls-bg`, `--upv-controls-hover-bg`,
 *    `--upv-progress-color`, `--upv-progress-track`, `--upv-progress-height`,
 *    `--upv-notes-height`, `--upv-thumbnails-bg`, `--upv-background` (letterbox);
 *  - `::part()`: `controls`, `progress`, `progress-value`, `counter`, `button`,
 *    `button-<nome>` (prev, play, next, mute, thumbnails, notes, download,
 *    present, fullscreen), `thumbnails`, `thumbnail`, `notes`.
 *
 * Os ícones são SVG com `currentColor`: a cor e o tamanho vêm só das variáveis.
 */

/** Itens da barra; o atributo booleano `no` + nome tira o item (`nodownload`…). */
export const CONTROL_ITEMS = ['nav', 'counter', 'play', 'mute', 'thumbnails', 'notes', 'download', 'present', 'fullscreen', 'progress'] as const;
export type ControlItem = typeof CONTROL_ITEMS[number];

/** O que a barra precisa do viewer. */
export interface ControlsHost {
  count(): number;
  index(): number;
  goTo(i: number): void;
  next(): void;
  prev(): void;
  /** Reprodução automática: tocando agora e fração percorrida da linha do tempo (null = parada). */
  isPlaying(): boolean;
  playbackFraction(): number | null;
  togglePlay(): void;
  playFrom(fraction: number): void;
  hasMedia(): boolean;
  isMuted(): boolean;
  setMuted(m: boolean): void;
  notes(i: number): string;
  hasNotes(): boolean;
  download(): void;
  isPresenting(): boolean;
  togglePresent(): void;
  isFullscreen(): boolean;
  toggleFullscreen(): void;
  renderThumbnail(i: number, target: HTMLCanvasElement): boolean;
  slideAspect(): number;
}

const SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICONS: Record<string, string> = {
  prev: '<path d="M5 5v14"/><path d="M19 5v14L8 12z" fill="currentColor"/>',
  next: '<path d="M19 5v14"/><path d="M5 5v14l11-7z" fill="currentColor"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  muted: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  thumbnails: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10.5 7.5v5l4-2.5z" fill="currentColor"/>',
  unpresent: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10 8l4 4M14 8l-4 4"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  unfullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
};
const icon = (name: string): string => `<svg ${SVG_ATTRS}>${ICONS[name]}</svg>`;

const CSS = `
:host {
  --_c: var(--upv-controls-color, #fff);
  --_s: var(--upv-controls-size, 22px);
}
.upv-ui [hidden], .upv-notes[hidden] { display: none !important; }
.upv-ui { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; }
.upv-notes-open .upv-ui { bottom: var(--upv-notes-height, 28%); }
.upv-notes-open > canvas { height: calc(100% - var(--upv-notes-height, 28%)) !important; }
.upv-bar {
  position: absolute; left: 0; right: 0; bottom: 0; pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: calc(var(--_s) * 1.9) 10px 6px;
  background: var(--upv-controls-bg, linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.35) 40%, rgba(0,0,0,.8)));
  color: var(--_c); font: 400 calc(var(--_s) * .6)/1 system-ui, "Segoe UI", sans-serif;
  transition: opacity .25s, visibility .25s;
}
.upv-hidden .upv-bar, .upv-hidden .upv-thumbs { opacity: 0; visibility: hidden; }
.upv-hidden.upv-presenting { cursor: none; }
.upv-btn {
  all: unset; box-sizing: border-box; flex: none; cursor: pointer; color: inherit;
  width: calc(var(--_s) * 1.8); height: calc(var(--_s) * 1.8);
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: calc(var(--_s) * .35); opacity: .9;
}
.upv-btn:hover, .upv-btn[aria-pressed="true"] { background: var(--upv-controls-hover-bg, rgba(255,255,255,.16)); opacity: 1; }
.upv-btn:focus-visible { outline: 2px solid var(--_c); outline-offset: -2px; }
.upv-btn svg { width: var(--_s); height: var(--_s); display: block; }
.upv-counter { padding: 0 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.upv-spacer { flex: 1; }
.upv-progress {
  position: absolute; left: 12px; right: 12px; top: calc(var(--_s) * 1.9 - 10px);
  height: 14px; cursor: pointer; display: flex; align-items: center;
}
.upv-track { position: relative; width: 100%; height: var(--upv-progress-height, 3px); background: var(--upv-progress-track, rgba(255,255,255,.28)); transition: height .1s; }
.upv-progress:hover .upv-track { height: calc(var(--upv-progress-height, 3px) + 2px); }
.upv-value { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--upv-progress-color, #fff); }
.upv-thumbs {
  position: absolute; left: 0; right: 0; pointer-events: auto;
  bottom: calc(var(--_s) * 3.9 + 6px);
  display: flex; gap: 8px; padding: 8px 12px; overflow-x: auto; scrollbar-width: thin;
  background: var(--upv-thumbnails-bg, rgba(0,0,0,.6));
  transition: opacity .25s, visibility .25s;
}
.upv-thumb {
  all: unset; flex: none; cursor: pointer; position: relative; border-radius: 3px;
  outline: 2px solid transparent; outline-offset: 1px; background: #444;
}
.upv-thumb canvas { display: block; width: 100%; height: 100%; border-radius: 3px; }
.upv-thumb[aria-current="true"] { outline-color: var(--upv-progress-color, #fff); }
.upv-thumb:focus-visible { outline-color: var(--_c); }
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

/** Rótulos em pt-BR e en (pelo `lang` do elemento ou do documento). */
const LABELS = {
  pt: {
    prev: 'Slide anterior', next: 'Próximo slide', play: 'Reproduzir', pause: 'Pausar',
    mute: 'Desativar som', unmute: 'Ativar som', thumbnails: 'Miniaturas', notes: 'Anotações',
    download: 'Baixar', present: 'Apresentar', unpresent: 'Encerrar apresentação',
    fullscreen: 'Tela cheia', unfullscreen: 'Sair da tela cheia', progress: 'Progresso',
    slide: 'Slide', noNotes: 'Sem anotações neste slide.',
  },
  en: {
    prev: 'Previous slide', next: 'Next slide', play: 'Play', pause: 'Pause',
    mute: 'Mute', unmute: 'Unmute', thumbnails: 'Thumbnails', notes: 'Notes',
    download: 'Download', present: 'Present', unpresent: 'End presentation',
    fullscreen: 'Full screen', unfullscreen: 'Exit full screen', progress: 'Progress',
    slide: 'Slide', noNotes: 'No notes on this slide.',
  },
};
type Labels = typeof LABELS.pt;

/** Tempo parado até a barra sumir (ms). */
const IDLE_MS = 2500;

export class ViewerControls {
  readonly ui = document.createElement('div');
  private readonly bar = document.createElement('div');
  private readonly progress = document.createElement('div');
  private readonly value = document.createElement('div');
  private readonly counter = document.createElement('span');
  private readonly thumbs = document.createElement('div');
  private readonly notesEl = document.createElement('div');
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private readonly style = document.createElement('style');
  private hidden = new Set<ControlItem>();
  private enabled = true;
  private thumbsOpen = false;
  private notesOpen = false;
  private hideTimer = 0;
  private pointerInBar = false;
  private labels: Labels = LABELS.pt;
  /** Último estado aplicado (evita mexer no DOM a cada quadro da reprodução). */
  private last = '';
  private thumbsKey = '';

  constructor(private readonly host: ControlsHost, private readonly root: ShadowRoot, private readonly wrap: HTMLElement) {
    this.style.textContent = CSS;
    this.ui.className = 'upv-ui';
    this.bar.className = 'upv-bar';
    this.bar.setAttribute('part', 'controls');
    this.bar.setAttribute('role', 'toolbar');

    this.progress.className = 'upv-progress';
    this.progress.setAttribute('part', 'progress');
    this.progress.setAttribute('role', 'slider');
    this.progress.tabIndex = -1;
    const track = document.createElement('div');
    track.className = 'upv-track';
    this.value.className = 'upv-value';
    this.value.setAttribute('part', 'progress-value');
    track.appendChild(this.value);
    this.progress.appendChild(track);
    this.progress.addEventListener('click', this.onProgressClick);
    this.bar.appendChild(this.progress);

    this.counter.className = 'upv-counter';
    this.counter.setAttribute('part', 'counter');

    const left: Array<[string, ControlItem, () => void]> = [
      ['prev', 'nav', () => host.prev()],
      ['play', 'play', () => host.togglePlay()],
      ['next', 'nav', () => host.next()],
      ['mute', 'mute', () => host.setMuted(!host.isMuted())],
    ];
    const right: Array<[string, ControlItem, () => void]> = [
      ['thumbnails', 'thumbnails', () => this.setThumbsOpen(!this.thumbsOpen)],
      ['notes', 'notes', () => this.setNotesOpen(!this.notesOpen)],
      ['download', 'download', () => host.download()],
      ['present', 'present', () => host.togglePresent()],
      ['fullscreen', 'fullscreen', () => host.toggleFullscreen()],
    ];
    for (const [name, item, run] of left) this.bar.appendChild(this.button(name, item, run));
    this.counter.dataset['item'] = 'counter';
    this.bar.appendChild(this.counter);
    const spacer = document.createElement('span');
    spacer.className = 'upv-spacer';
    this.bar.appendChild(spacer);
    for (const [name, item, run] of right) this.bar.appendChild(this.button(name, item, run));

    this.thumbs.className = 'upv-thumbs';
    this.thumbs.setAttribute('part', 'thumbnails');
    this.thumbs.hidden = true;
    this.thumbs.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.upv-thumb');
      if (b) host.goTo(Number(b.dataset['i']));
    });

    this.notesEl.className = 'upv-notes';
    this.notesEl.setAttribute('part', 'notes');
    this.notesEl.setAttribute('role', 'note');
    this.notesEl.hidden = true;

    this.ui.append(this.thumbs, this.bar);
    // os cliques na barra não chegam ao canvas (na apresentação o clique avança)
    for (const el of [this.bar, this.thumbs, this.notesEl]) {
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    this.bar.addEventListener('pointerenter', () => { this.pointerInBar = true; this.wake(); });
    this.bar.addEventListener('pointerleave', () => { this.pointerInBar = false; this.wake(); });
    this.bar.addEventListener('focusin', () => this.wake());
  }

  private button(name: string, item: ControlItem, run: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'upv-btn';
    b.setAttribute('part', `button button-${name}`);
    b.dataset['item'] = item;
    b.innerHTML = icon(name);
    b.addEventListener('click', () => { run(); this.wake(); this.sync(); });
    this.buttons.set(name, b);
    return b;
  }

  /** Monta (ou desmonta) a barra conforme `nocontrols` e os `no<item>`. */
  configure(enabled: boolean, removed: readonly ControlItem[], lang: string): void {
    this.labels = /^en\b/i.test(lang) ? LABELS.en : LABELS.pt;
    this.notesEl.dataset['empty'] = this.labels.noNotes;
    this.hidden = new Set(removed);
    if (enabled !== this.enabled || !this.ui.isConnected) {
      this.enabled = enabled;
      if (enabled) {
        if (!this.style.isConnected) this.root.appendChild(this.style);
        this.wrap.append(this.ui, this.notesEl);
        this.wake();
      } else {
        this.setThumbsOpen(false);
        this.setNotesOpen(false);
        this.ui.remove();
        this.notesEl.remove();
      }
    }
    if (this.hidden.has('thumbnails')) this.setThumbsOpen(false);
    if (this.hidden.has('notes')) this.setNotesOpen(false);
    this.last = '';
    this.sync();
  }

  /** Atividade do usuário: mostra a barra e reagenda o sumiço. */
  wake = (): void => {
    if (!this.enabled) return;
    this.wrap.classList.remove('upv-hidden');
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(this.idle, IDLE_MS);
  };

  /** Ponteiro saiu do viewer: some já (se nada prende a barra). */
  leave = (): void => { if (this.enabled) this.idle(); };

  private idle = (): void => {
    clearTimeout(this.hideTimer);
    if (this.pointerInBar || this.thumbsOpen || this.bar.contains(this.root.activeElement)) return;
    this.wrap.classList.add('upv-hidden');
  };

  private setThumbsOpen(open: boolean): void {
    this.thumbsOpen = open;
    this.thumbs.hidden = !open;
    if (open) { this.thumbsKey = ''; this.renderThumbs(); }
    this.last = '';
  }

  private setNotesOpen(open: boolean): void {
    if (open === this.notesOpen) return;
    this.notesOpen = open;
    this.notesEl.hidden = !open;
    this.wrap.classList.toggle('upv-notes-open', open);
    this.last = '';
  }

  /** Miniaturas (re)pintadas: ao abrir, ao trocar de deck e quando imagens chegam. */
  renderThumbs(): void {
    if (!this.thumbsOpen) return;
    const n = this.host.count();
    const h = Math.max(48, Math.min(96, Math.round(this.wrap.clientHeight * 0.14)));
    const w = Math.round(h * this.host.slideAspect());
    const key = `${n}:${w}x${h}`;
    if (key !== this.thumbsKey) {
      this.thumbsKey = key;
      this.thumbs.textContent = '';
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'upv-thumb';
        b.setAttribute('part', 'thumbnail');
        b.dataset['i'] = String(i);
        b.style.width = `${w}px`; b.style.height = `${h}px`;
        b.setAttribute('aria-label', `${this.labels.slide} ${i + 1}`);
        const cv = document.createElement('canvas');
        const tag = document.createElement('span');
        tag.textContent = String(i + 1);
        b.append(cv, tag);
        this.thumbs.appendChild(b);
      }
    }
    for (const cv of this.thumbs.querySelectorAll('canvas')) {
      this.host.renderThumbnail(Number((cv.parentElement as HTMLElement).dataset['i']), cv);
    }
    this.last = '';
    this.sync();
  }

  private onProgressClick = (e: MouseEvent): void => {
    const r = this.progress.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
    if (this.host.isPlaying()) this.host.playFrom(f);
    else {
      const n = this.host.count();
      if (n) this.host.goTo(Math.min(n - 1, Math.floor(f * n)));
    }
    this.wake();
  };

  /** Reflete o estado do viewer (chamado a cada pintura; só mexe no DOM quando muda). */
  sync(): void {
    if (!this.enabled) return;
    const h = this.host, L = this.labels;
    const n = h.count(), i = h.index();
    const playing = h.isPlaying(), presenting = h.isPresenting(), full = h.isFullscreen();
    const frac = h.playbackFraction();
    const pct = n ? (frac ?? (i + 1) / n) * 100 : 0;
    this.value.style.width = `${pct.toFixed(2)}%`;
    const muted = h.isMuted(), media = h.hasMedia(), notes = h.hasNotes();
    const state = [n, i, playing, presenting, full, muted, media, notes, this.thumbsOpen, this.notesOpen, [...this.hidden].join()].join('|');
    if (state === this.last) return;
    this.last = state;

    const show = (item: ControlItem, extra = true): boolean => !this.hidden.has(item) && extra && n > 0;
    for (const b of this.bar.querySelectorAll<HTMLElement>('[data-item]')) {
      const it = b.dataset['item'] as ControlItem;
      b.hidden = !show(it, it === 'mute' ? media : it === 'notes' ? notes : true);
    }
    this.progress.hidden = !show('progress');
    this.progress.setAttribute('aria-label', L.progress);
    this.progress.setAttribute('aria-valuemin', '1');
    this.progress.setAttribute('aria-valuemax', String(n));
    this.progress.setAttribute('aria-valuenow', String(i + 1));
    this.counter.textContent = n ? `${i + 1} / ${n}` : '';

    const set = (name: string, label: string, ico?: string, pressed?: boolean): void => {
      const b = this.buttons.get(name)!;
      b.setAttribute('aria-label', label);
      b.title = label;
      if (ico && b.dataset['icon'] !== ico) { b.innerHTML = icon(ico); b.dataset['icon'] = ico; }
      if (pressed === undefined) b.removeAttribute('aria-pressed');
      else b.setAttribute('aria-pressed', String(pressed));
    };
    set('prev', L.prev);
    set('next', L.next);
    set('play', playing ? L.pause : L.play, playing ? 'pause' : 'play');
    set('mute', muted ? L.unmute : L.mute, muted ? 'muted' : 'volume');
    set('thumbnails', L.thumbnails, undefined, this.thumbsOpen);
    set('notes', L.notes, undefined, this.notesOpen);
    set('download', L.download);
    set('present', presenting ? L.unpresent : L.present, presenting ? 'unpresent' : 'present');
    set('fullscreen', full ? L.unfullscreen : L.fullscreen, full ? 'unfullscreen' : 'fullscreen');
    this.wrap.classList.toggle('upv-presenting', presenting);

    if (this.notesOpen) this.notesEl.textContent = h.notes(i);
    for (const t of this.thumbs.children as HTMLCollectionOf<HTMLElement>) {
      const cur = Number(t.dataset['i']) === i;
      t.setAttribute('aria-current', String(cur));
      // rola só a faixa (scrollIntoView rolaria também a página do host)
      if (cur && this.thumbsOpen) {
        const s = this.thumbs, l = t.offsetLeft, r = l + t.offsetWidth;
        if (l < s.scrollLeft) s.scrollLeft = l - 12;
        else if (r > s.scrollLeft + s.clientWidth) s.scrollLeft = r - s.clientWidth + 12;
      }
    }
  }

  dispose(): void {
    clearTimeout(this.hideTimer);
  }
}
