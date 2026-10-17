import {
  ControlBar, controlsCss, cssVar, pickLabels,
} from '@universal-office/viewer-controls';

/**
 * Controles do <universal-document-viewer> sobre a barra ÚNICA dos viewers
 * (shared/viewer-controls) — o mesmo modelo do <universal-presentation-viewer>:
 * aparecem por padrão, `nocontrols` desliga tudo e um atributo booleano por
 * item tira só ele (`nodownload`, `noprint`, `nozoom`… — `no` + nome do item,
 * ver CONTROL_ITEMS). Aqui ficam só os itens de documento (páginas, zoom com
 * menu, imprimir).
 *
 * Personalização pelo host, sem tocar no shadow DOM:
 *  - variáveis CSS `--udv-*` (ou as comuns `--uo-*`, que valem para os dois
 *    viewers): `controls-color`, `controls-size`, `controls-bg`,
 *    `controls-hover-bg`, `progress-color`, `progress-track`,
 *    `progress-height`, `background` (atrás das páginas); e as do documento:
 *    `--udv-panel-bg`, `--udv-comment-highlight`, `--udv-page-gap`;
 *  - `::part()`: `controls`, `progress`, `progress-value`, `counter`, `button`,
 *    `button-<nome>` (prev, next, outline, thumbnails, comments, zoom-out,
 *    zoom-level, zoom-in, download, print, fullscreen), `zoom-menu`,
 *    `zoom-option`, `nav-panel`, `nav-tab`, `outline`, `outline-item`,
 *    `thumbnails`, `thumbnail`, `comments`, `comment`, `pages`, `page`.
 */

export const CONTROL_ITEMS = ['nav', 'counter', 'outline', 'thumbnails', 'comments', 'zoom', 'download', 'print', 'fullscreen', 'progress'] as const;
export type ControlItem = typeof CONTROL_ITEMS[number];

/** Zoom: largura da página, página inteira ou fator (1 = 100%). */
export type ZoomSpec = 'page-width' | 'page-fit' | number;

export interface ControlsHost {
  count(): number;
  index(): number;
  goTo(i: number): void;
  scrollFraction(): number;
  scrollToFraction(f: number): void;
  zoom(): { spec: ZoomSpec; factor: number };
  setZoom(z: ZoomSpec): void;
  /** aba aberta do painel de navegação (índice ou páginas); null = fechado */
  navTab(): 'outline' | 'pages' | null;
  toggleNav(tab: 'outline' | 'pages'): void;
  hasHeadings(): boolean;
  hasComments(): boolean;
  commentsOpen(): boolean;
  toggleComments(): void;
  download(): void;
  print(): void;
  isFullscreen(): boolean;
  toggleFullscreen(): void;
}

/** CSS da barra + o menu de zoom (o resto do viewer está em universal-document-viewer.ts). */
export const CONTROLS_CSS = controlsCss('udv') + `
.udv-level { width: auto; min-width: calc(var(--uoc-s) * 2.6); padding: 0 6px; font-variant-numeric: tabular-nums; }
.udv-menu {
  position: absolute; bottom: calc(var(--uoc-s) * 1.8 + 12px); pointer-events: auto;
  display: flex; flex-direction: column; min-width: 170px; padding: 4px; border-radius: 8px;
  background: rgba(28,28,28,.96); color: #fff; font: 13px/1.2 system-ui, "Segoe UI", sans-serif;
}
.udv-menu[hidden] { display: none; }
.udv-menu button { all: unset; padding: 8px 10px 8px 28px; border-radius: 6px; cursor: pointer; position: relative; }
.udv-menu button:hover, .udv-menu button:focus-visible { background: rgba(255,255,255,.12); }
.udv-menu button[aria-checked="true"]::before { content: ""; position: absolute; left: 10px; top: 50%; width: 8px; height: 4px; border: solid currentColor; border-width: 0 0 2px 2px; transform: translateY(-70%) rotate(-45deg); }
`;

/** Cor do contorno da miniatura atual (a do progresso, como no Slides). */
export const PROGRESS_COLOR = cssVar('udv', 'progress-color', '#fff');

const LABELS = {
  pt: {
    prev: 'Página anterior', next: 'Próxima página', thumbnails: 'Miniaturas', outline: 'Índice', pages: 'Páginas',
    comments: 'Comentários', noHeadings: 'O documento não tem títulos.', noComments: 'Sem comentários.', zoomOut: 'Diminuir zoom',
    zoomIn: 'Aumentar zoom', zoom: 'Zoom', pageWidth: 'Largura da página', pageFit: 'Página inteira',
    download: 'Baixar', print: 'Imprimir', fullscreen: 'Tela cheia', unfullscreen: 'Sair da tela cheia',
    progress: 'Posição no documento', page: 'Página',
  },
  en: {
    prev: 'Previous page', next: 'Next page', thumbnails: 'Thumbnails', outline: 'Outline', pages: 'Pages',
    comments: 'Comments', noHeadings: 'This document has no headings.', noComments: 'No comments.', zoomOut: 'Zoom out',
    zoomIn: 'Zoom in', zoom: 'Zoom', pageWidth: 'Page width', pageFit: 'Whole page',
    download: 'Download', print: 'Print', fullscreen: 'Full screen', unfullscreen: 'Exit full screen',
    progress: 'Position in document', page: 'Page',
  },
};
export type Labels = typeof LABELS.pt;
export const labelsFor = (lang: string): Labels => pickLabels(lang, LABELS);

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export class DocumentControls {
  private readonly bar: ControlBar<ControlItem>;
  private readonly menu = document.createElement('div');
  private labels: Labels = LABELS.pt;
  private last = '';

  constructor(private readonly host: ControlsHost, root: ShadowRoot, wrap: HTMLElement) {
    const r = (f: () => void) => (): void => { f(); this.sync(); };
    this.bar = new ControlBar<ControlItem>({
      root, wrap,
      counterItem: 'counter',
      progressItem: 'progress',
      start: [
        { name: 'prev', item: 'nav', icon: 'chevron-up', run: r(() => host.goTo(host.index() - 1)) },
        { name: 'next', item: 'nav', icon: 'chevron-down', run: r(() => host.goTo(host.index() + 1)) },
        'counter',
      ],
      end: [
        { name: 'outline', item: 'outline', icon: 'outline', run: r(() => host.toggleNav('outline')) },
        { name: 'thumbnails', item: 'thumbnails', icon: 'sidebar', run: r(() => host.toggleNav('pages')) },
        { name: 'comments', item: 'comments', icon: 'comment', run: r(() => host.toggleComments()) },
        { name: 'zoom-out', item: 'zoom', icon: 'zoom-out', run: r(() => this.step(-1)) },
        { name: 'zoom-level', item: 'zoom', className: 'udv-level', run: r(() => this.toggleMenu()) },
        { name: 'zoom-in', item: 'zoom', icon: 'zoom-in', run: r(() => this.step(1)) },
        { name: 'download', item: 'download', icon: 'download', run: r(() => host.download()) },
        { name: 'print', item: 'print', icon: 'print', run: r(() => host.print()) },
        { name: 'fullscreen', item: 'fullscreen', icon: 'fullscreen', run: r(() => host.toggleFullscreen()) },
      ],
      onSeek: (f) => host.scrollToFraction(f),
      keepVisible: () => !this.menu.hidden,
    });
    this.bar.buttonEl('zoom-level')!.setAttribute('aria-haspopup', 'menu');

    this.menu.className = 'udv-menu';
    this.menu.setAttribute('part', 'zoom-menu');
    this.menu.setAttribute('role', 'menu');
    this.menu.hidden = true;
    this.menu.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!b) return;
      const v = b.dataset['zoom']!;
      host.setZoom(v === 'page-width' || v === 'page-fit' ? v : Number(v));
      this.closeMenu();
      this.sync();
    });
    this.bar.bar.appendChild(this.menu);
    this.bar.bar.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.menu.hidden) { this.closeMenu(); e.stopPropagation(); } });
  }

  /** Próximo degrau de zoom (a partir do fator atual). */
  private step(dir: 1 | -1): void {
    const f = this.host.zoom().factor;
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > f + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < f - 0.001);
    if (next) this.host.setZoom(next);
  }

  private toggleMenu(): void {
    if (!this.menu.hidden) { this.closeMenu(); return; }
    const L = this.labels, cur = this.host.zoom();
    const opts: [string, string][] = [['page-width', L.pageWidth], ['page-fit', L.pageFit],
      ...[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => [String(z), `${Math.round(z * 100)}%`] as [string, string])];
    this.menu.textContent = '';
    for (const [v, label] of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('part', 'zoom-option');
      b.dataset['zoom'] = v;
      b.textContent = label;
      b.setAttribute('aria-checked', String(String(cur.spec) === v));
      this.menu.appendChild(b);
    }
    const lvl = this.bar.buttonEl('zoom-level')!;
    this.menu.hidden = false;
    // alinha o menu ao botão, sem sair da barra
    const br = this.bar.bar.getBoundingClientRect(), lr = lvl.getBoundingClientRect();
    const left = Math.max(8, Math.min(br.width - this.menu.offsetWidth - 8, lr.left - br.left + lr.width / 2 - this.menu.offsetWidth / 2));
    this.menu.style.left = `${left}px`;
    this.last = '';
    (this.menu.querySelector('[aria-checked="true"]') as HTMLElement | null ?? this.menu.firstElementChild as HTMLElement)?.focus();
  }

  private closeMenu(): void {
    this.menu.hidden = true;
    this.last = '';
  }

  configure(enabled: boolean, removed: readonly ControlItem[], lang: string): void {
    this.labels = labelsFor(lang);
    if (!enabled) this.closeMenu();
    this.bar.configure(enabled, removed);
    if (this.bar.isRemoved('zoom')) this.closeMenu();
    this.last = '';
    this.sync();
  }

  wake = (): void => this.bar.wake();
  leave = (): void => this.bar.leave();

  /** Reflete o estado do viewer; só mexe no DOM quando muda. */
  sync(): void {
    if (!this.bar.enabled) return;
    const h = this.host, L = this.labels, b = this.bar;
    const n = h.count(), i = h.index();
    const frac = h.scrollFraction();
    b.setProgress(frac, { label: L.progress, min: 0, max: 100, now: Math.round(frac * 100) });
    const z = h.zoom(), full = h.isFullscreen(), tab = h.navTab();
    const heads = h.hasHeadings(), cms = h.hasComments(), cmOpen = h.commentsOpen();
    const state = [n, i, z.spec, z.factor.toFixed(3), full, tab, heads, cms, cmOpen, !this.menu.hidden,
      CONTROL_ITEMS.filter((it) => b.isRemoved(it)).join()].join('|');
    if (state === this.last) return;
    this.last = state;

    b.applyVisibility((it) => n > 0 && (it === 'outline' ? heads : it === 'comments' ? cms : true));
    b.setCounter(n ? `${i + 1} / ${n}` : '');
    const pct = `${Math.round(z.factor * 100)}%`;
    b.setButton('prev', { label: L.prev });
    b.setButton('next', { label: L.next });
    b.setButton('outline', { label: L.outline, pressed: tab === 'outline' });
    b.setButton('thumbnails', { label: L.thumbnails, pressed: tab === 'pages' });
    b.setButton('comments', { label: L.comments, pressed: cmOpen });
    b.setButton('zoom-out', { label: L.zoomOut });
    b.setButton('zoom-level', { label: `${L.zoom}: ${pct}`, text: pct, expanded: !this.menu.hidden });
    b.setButton('zoom-in', { label: L.zoomIn });
    b.setButton('download', { label: L.download });
    b.setButton('print', { label: L.print });
    b.setButton('fullscreen', { label: full ? L.unfullscreen : L.fullscreen, icon: full ? 'unfullscreen' : 'fullscreen' });
  }

  dispose(): void { this.bar.dispose(); }
}
