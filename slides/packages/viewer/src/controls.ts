import {
  ControlBar, controlsCss, cssVar,
} from '@universal-office/viewer-controls';
import { pickLabels, type UiLang } from '@universal-office/i18n';

/**
 * Controles do <universal-presentation-viewer> sobre a barra ÚNICA dos viewers
 * (shared/viewer-controls): aparecem por padrão, `nocontrols` desliga tudo e
 * um atributo booleano por item tira só ele: `nodownload`, `nofullscreen`,
 * `nothumbnails`… (`no` + nome do item, ver CONTROL_ITEMS).
 *
 * Aqui ficam só os itens do Slides (reproduzir, som, miniaturas em faixa,
 * anotações do orador, apresentar) e o que é deles.
 *
 * Personalização pelo host, sem tocar no shadow DOM:
 *  - variáveis CSS `--upv-*` (ou as comuns `--uo-*`, que valem para os dois
 *    viewers): `controls-color`, `controls-size`, `controls-bg`,
 *    `controls-hover-bg`, `progress-color`, `progress-track`,
 *    `progress-height`; e as do Slides: `--upv-notes-height`,
 *    `--upv-thumbnails-bg`, `--upv-background` (letterbox);
 *  - `::part()`: `controls`, `progress`, `progress-value`, `counter`, `button`,
 *    `button-<nome>` (prev, play, next, mute, thumbnails, notes, download,
 *    present, fullscreen), `thumbnails`, `thumbnail`, `notes`.
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

const CSS = controlsCss('upv') + `
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
.upv-thumb[aria-current="true"] { outline-color: ${cssVar('upv', 'progress-color', '#fff')}; }
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

const LABELS = {
  pt: {
    prev: 'Slide anterior', next: 'Próximo slide', play: 'Reproduzir', pause: 'Pausar',
    mute: 'Desativar som', unmute: 'Ativar som', thumbnails: 'Miniaturas', notes: 'Anotações',
    download: 'Baixar', present: 'Apresentar', unpresent: 'Encerrar apresentação',
    fullscreen: 'Tela cheia', unfullscreen: 'Sair da tela cheia', progress: 'Progresso',
    slide: 'Slide', noNotes: 'Sem anotações neste slide.', toolbar: 'Controles da apresentação',
    slideOf: (n: number, m: number) => `Slide ${n} de ${m}`,
  },
  en: {
    prev: 'Previous slide', next: 'Next slide', play: 'Play', pause: 'Pause',
    mute: 'Mute', unmute: 'Unmute', thumbnails: 'Thumbnails', notes: 'Notes',
    download: 'Download', present: 'Present', unpresent: 'End presentation',
    fullscreen: 'Full screen', unfullscreen: 'Exit full screen', progress: 'Progress',
    slide: 'Slide', noNotes: 'No notes on this slide.', toolbar: 'Presentation controls',
    slideOf: (n: number, m: number) => `Slide ${n} of ${m}`,
  },
};
type Labels = typeof LABELS.en;

export class ViewerControls {
  private readonly bar: ControlBar<ControlItem>;
  private readonly thumbs = document.createElement('div');
  private readonly notesEl = document.createElement('div');
  private readonly style = document.createElement('style');
  private thumbsOpen = false;
  private notesOpen = false;
  private labels: Labels = LABELS.en;
  /** Último estado aplicado (evita mexer no DOM a cada quadro da reprodução). */
  private last = '';
  private thumbsKey = '';

  constructor(private readonly host: ControlsHost, private readonly root: ShadowRoot, private readonly wrap: HTMLElement) {
    this.style.textContent = CSS;
    const r = (f: () => void) => (): void => { f(); this.sync(); };
    this.bar = new ControlBar<ControlItem>({
      root, wrap,
      counterItem: 'counter',
      progressItem: 'progress',
      start: [
        { name: 'prev', item: 'nav', icon: 'skip-prev', run: r(() => host.prev()) },
        { name: 'play', item: 'play', icon: 'play', run: r(() => host.togglePlay()) },
        { name: 'next', item: 'nav', icon: 'skip-next', run: r(() => host.next()) },
        { name: 'mute', item: 'mute', icon: 'volume', run: r(() => host.setMuted(!host.isMuted())) },
        'counter',
      ],
      end: [
        { name: 'thumbnails', item: 'thumbnails', icon: 'grid', run: r(() => this.setThumbsOpen(!this.thumbsOpen)) },
        { name: 'notes', item: 'notes', icon: 'notes', run: r(() => this.setNotesOpen(!this.notesOpen)) },
        { name: 'download', item: 'download', icon: 'download', run: r(() => host.download()) },
        { name: 'present', item: 'present', icon: 'present', run: r(() => host.togglePresent()) },
        { name: 'fullscreen', item: 'fullscreen', icon: 'fullscreen', run: r(() => host.toggleFullscreen()) },
      ],
      onStep: (st) => {
        const n = host.count(), i = host.index();
        const to = st === 'home' ? 0 : st === 'end' ? n - 1 : st === 'next' ? i + 1 : st === 'prev' ? i - 1 : st === 'pagenext' ? i + 5 : i - 5;
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
      keepVisible: () => this.thumbsOpen,
    });

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

    this.bar.ui.insertBefore(this.thumbs, this.bar.bar);
    // os cliques nos painéis não chegam ao canvas (na apresentação o clique avança)
    for (const el of [this.thumbs, this.notesEl]) {
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
  }

  /** Monta (ou desmonta) a barra conforme `nocontrols` e os `no<item>`. */
  configure(enabled: boolean, removed: readonly ControlItem[], lang: UiLang): void {
    this.labels = pickLabels(lang, LABELS);
    this.bar.setLabel(this.labels.toolbar);
    this.notesEl.dataset['empty'] = this.labels.noNotes;
    if (enabled && !this.style.isConnected) this.root.appendChild(this.style);
    if (!enabled) { this.setThumbsOpen(false); this.setNotesOpen(false); }
    if (this.bar.configure(enabled, removed)) {
      if (enabled) this.wrap.appendChild(this.notesEl); else this.notesEl.remove();
    }
    if (this.bar.isRemoved('thumbnails')) this.setThumbsOpen(false);
    if (this.bar.isRemoved('notes')) this.setNotesOpen(false);
    this.last = '';
    this.sync();
  }

  wake = (): void => this.bar.wake();
  leave = (): void => this.bar.leave();

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

  /** Reflete o estado do viewer (chamado a cada pintura; só mexe no DOM quando muda). */
  sync(): void {
    if (!this.bar.enabled) return;
    const h = this.host, L = this.labels, b = this.bar;
    const n = h.count(), i = h.index();
    const playing = h.isPlaying(), presenting = h.isPresenting(), full = h.isFullscreen();
    const frac = h.playbackFraction();
    b.setProgress(n ? (frac ?? (i + 1) / n) : 0, { label: L.progress, min: 1, max: n, now: i + 1, text: n ? L.slideOf(i + 1, n) : '' });
    const muted = h.isMuted(), media = h.hasMedia(), notes = h.hasNotes();
    const state = [n, i, playing, presenting, full, muted, media, notes, this.thumbsOpen, this.notesOpen,
      CONTROL_ITEMS.filter((it) => b.isRemoved(it)).join()].join('|');
    if (state === this.last) return;
    this.last = state;

    b.applyVisibility((it) => n > 0 && (it === 'mute' ? media : it === 'notes' ? notes : true));
    b.setCounter(n ? `${i + 1} / ${n}` : '');
    b.setButton('prev', { label: L.prev });
    b.setButton('next', { label: L.next });
    b.setButton('play', { label: playing ? L.pause : L.play, icon: playing ? 'pause' : 'play' });
    b.setButton('mute', { label: muted ? L.unmute : L.mute, icon: muted ? 'muted' : 'volume' });
    b.setButton('thumbnails', { label: L.thumbnails, pressed: this.thumbsOpen });
    b.setButton('notes', { label: L.notes, pressed: this.notesOpen });
    b.setButton('download', { label: L.download });
    b.setButton('present', { label: presenting ? L.unpresent : L.present, icon: presenting ? 'unpresent' : 'present' });
    b.setButton('fullscreen', { label: full ? L.unfullscreen : L.fullscreen, icon: full ? 'unfullscreen' : 'fullscreen' });
    this.wrap.classList.toggle('upv-presenting', presenting);

    if (this.notesOpen) this.notesEl.textContent = h.notes(i);
    for (const t of this.thumbs.children as HTMLCollectionOf<HTMLElement>) {
      const cur = Number(t.dataset['i']) === i;
      t.setAttribute('aria-current', String(cur));
      // rola só a faixa (scrollIntoView rolaria também a página do host)
      if (cur && this.thumbsOpen) {
        const s = this.thumbs, l = t.offsetLeft, rr = l + t.offsetWidth;
        if (l < s.scrollLeft) s.scrollLeft = l - 12;
        else if (rr > s.scrollLeft + s.clientWidth) s.scrollLeft = rr - s.clientWidth + 12;
      }
    }
  }

  dispose(): void { this.bar.dispose(); }
}
