import {
  ControlBar, controlsCss, cssVar, type ProgressStep,
} from '@universal-office/ui';
import { pickLabels, type UiLang } from '@universal-office/ui';
import { VIEW_MODES, type ViewMode } from './views.js';

/**
 * Controles do <universal-document-viewer> sobre a barra ÚNICA dos viewers
 * (shared/ui) — o mesmo modelo do <universal-presentation-viewer>:
 * aparecem por padrão, `nocontrols` desliga tudo e um atributo booleano por
 * item tira só ele (`nodownload`, `noprint`, `nozoom`, `noview`… — `no` + nome
 * do item, ver CONTROL_ITEMS). Aqui ficam só os itens de documento (páginas,
 * índice, comentários, zoom e modo de exibição com menu, imprimir).
 *
 * Personalização pelo host, sem tocar no shadow DOM:
 *  - variáveis CSS `--udv-*` (ou as comuns `--uo-*`, que valem para os dois
 *    viewers): `controls-color`, `controls-size`, `controls-bg`,
 *    `controls-hover-bg`, `progress-color`, `progress-track`,
 *    `progress-height`, `background` (atrás das páginas); e as do documento:
 *    `--udv-panel-bg`, `--udv-comment-highlight`, `--udv-selection`, `--udv-page-gap`;
 *  - `::part()`: `controls`, `progress`, `progress-value`, `counter`, `button`,
 *    `button-<nome>` (prev, next, outline, thumbnails, comments, zoom-out,
 *    zoom-level, zoom-in, view, download, print, fullscreen), `menu`,
 *    `menu-option`, `nav-panel`, `nav-tab`, `outline`, `outline-item`,
 *    `thumbnails`, `thumbnail`, `comments`, `comment`, `pages`, `page`.
 */

export const CONTROL_ITEMS = ['nav', 'counter', 'outline', 'thumbnails', 'comments', 'zoom', 'view', 'download', 'downloadpdf', 'print', 'fullscreen', 'progress'] as const;
export type ControlItem = typeof CONTROL_ITEMS[number];

/** Zoom: largura da página, página inteira ou fator (1 = 100%). */
export type ZoomSpec = 'page-width' | 'page-fit' | number;

export interface ControlsHost {
  /** o item faz sentido agora (ex.: sem títulos não há índice; no Layout da Web não há páginas) */
  available(item: ControlItem): boolean;
  count(): number;
  counter(): string;
  prev(): void;
  next(): void;
  progress(): number;
  seek(f: number): void;
  /** teclado no slider de progresso */
  step(st: ProgressStep): void;
  /** posição para o leitor de tela ("Página 3 de 12") */
  positionText(): string;
  announce(text: string): void;
  zoom(): { spec: ZoomSpec; factor: number };
  setZoom(z: ZoomSpec): void;
  view(): ViewMode;
  setView(v: ViewMode): void;
  /** aba aberta do painel de navegação (índice ou páginas); null = fechado */
  navTab(): 'outline' | 'pages' | null;
  toggleNav(tab: 'outline' | 'pages'): void;
  commentsOpen(): boolean;
  toggleComments(): void;
  download(): void;
  /** PDF do layout de impressão (o mesmo que imprimir) */
  downloadPdf(): void;
  print(): void;
  isFullscreen(): boolean;
  toggleFullscreen(): void;
}

/** CSS da barra + o menu (zoom, modo de exibição). */
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
    comments: 'Comentários', noHeadings: 'O documento não tem títulos.', noComments: 'Sem comentários.',
    zoomOut: 'Diminuir zoom', zoomIn: 'Aumentar zoom', zoom: 'Zoom', pageWidth: 'Largura da página', pageFit: 'Página inteira',
    view: 'Modo de exibição', read: 'Modo de Leitura', print: 'Layout de Impressão', web: 'Layout da Web',
    download: 'Baixar', printDoc: 'Imprimir', printOrPdf: 'Imprimir ou salvar como PDF', printMenu: 'Imprimir…', savePdf: 'Salvar como PDF', fullscreen: 'Tela cheia', unfullscreen: 'Sair da tela cheia',
    progress: 'Posição no documento', page: 'Página', document: 'Documento', pagesArea: 'Páginas do documento',
    toolbar: 'Controles do documento',
    pageOf: (n: number, m: number) => `Página ${n} de ${m}`,
    pagesOf: (a: number, b: number, m: number) => `Páginas ${a} a ${b} de ${m}`,
  },
  en: {
    prev: 'Previous page', next: 'Next page', thumbnails: 'Thumbnails', outline: 'Outline', pages: 'Pages',
    comments: 'Comments', noHeadings: 'This document has no headings.', noComments: 'No comments.',
    zoomOut: 'Zoom out', zoomIn: 'Zoom in', zoom: 'Zoom', pageWidth: 'Page width', pageFit: 'Whole page',
    view: 'View', read: 'Read Mode', print: 'Print Layout', web: 'Web Layout',
    download: 'Download', printDoc: 'Print', printOrPdf: 'Print or save as PDF', printMenu: 'Print…', savePdf: 'Save as PDF', fullscreen: 'Full screen', unfullscreen: 'Exit full screen',
    progress: 'Position in document', page: 'Page', document: 'Document', pagesArea: 'Document pages',
    toolbar: 'Document controls',
    pageOf: (n: number, m: number) => `Page ${n} of ${m}`,
    pagesOf: (a: number, b: number, m: number) => `Pages ${a} to ${b} of ${m}`,
  },
};
export type Labels = typeof LABELS.en;
export const labelsFor = (lang: UiLang): Labels => pickLabels(lang, LABELS);

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/** `checked` ausente = ação (menuitem), não escolha (menuitemradio) */
interface MenuOption { value: string; label: string; checked?: boolean }

export class DocumentControls {
  private readonly bar: ControlBar<ControlItem>;
  private readonly menu = document.createElement('div');
  /** botão que abriu o menu (zoom-level | view) e o que fazer na escolha */
  private menuFor: { button: string; pick: (v: string) => void } | null = null;
  private labels: Labels = LABELS.en;
  private last = '';

  constructor(private readonly host: ControlsHost, root: ShadowRoot, wrap: HTMLElement) {
    const r = (f: () => void) => (): void => { f(); this.sync(); };
    this.bar = new ControlBar<ControlItem>({
      root, wrap,
      counterItem: 'counter',
      progressItem: 'progress',
      start: [
        { name: 'prev', item: 'nav', icon: 'chevron-up', run: r(() => host.prev()) },
        { name: 'next', item: 'nav', icon: 'chevron-down', run: r(() => host.next()) },
        'counter',
      ],
      end: [
        { name: 'outline', item: 'outline', icon: 'outline', run: r(() => host.toggleNav('outline')) },
        { name: 'thumbnails', item: 'thumbnails', icon: 'sidebar', run: r(() => host.toggleNav('pages')) },
        { name: 'comments', item: 'comments', icon: 'comment', run: r(() => host.toggleComments()) },
        { name: 'zoom-out', item: 'zoom', icon: 'zoom-out', run: r(() => this.step(-1)) },
        { name: 'zoom-level', item: 'zoom', className: 'udv-level', run: r(() => this.toggleZoomMenu()) },
        { name: 'zoom-in', item: 'zoom', icon: 'zoom-in', run: r(() => this.step(1)) },
        { name: 'view', item: 'view', icon: 'view-print', run: r(() => this.toggleViewMenu()) },
        { name: 'download', item: 'download', icon: 'download', run: r(() => host.download()) },
        { name: 'print', item: 'print', icon: 'print', run: r(() => this.printOrMenu()) },
        { name: 'fullscreen', item: 'fullscreen', icon: 'fullscreen', run: r(() => host.toggleFullscreen()) },
      ],
      onSeek: (f) => host.seek(f),
      onStep: (st) => { host.step(st); this.sync(); },
      keepVisible: () => !this.menu.hidden,
    });
    for (const b of ['zoom-level', 'view']) this.bar.buttonEl(b)!.setAttribute('aria-haspopup', 'menu');

    this.menu.className = 'udv-menu';
    this.menu.setAttribute('part', 'menu');
    this.menu.setAttribute('role', 'menu');
    this.menu.hidden = true;
    this.menu.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!b || !this.menuFor) return;
      const pick = this.menuFor.pick;
      this.closeMenu(true);
      pick(b.dataset['value']!);
      this.sync();
    });
    this.bar.bar.appendChild(this.menu);
    this.bar.bar.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.menu.hidden) { this.closeMenu(true); e.stopPropagation(); } });
    // padrão ARIA de menu: ↑ ↓ Home End movem entre as opções; Tab fecha
    this.menu.addEventListener('keydown', (e) => {
      const items = [...this.menu.querySelectorAll<HTMLElement>('button')];
      const cur = items.indexOf((this.menu.getRootNode() as ShadowRoot).activeElement as HTMLElement);
      const go = (i: number): void => { e.preventDefault(); items[(i + items.length) % items.length]?.focus(); };
      if (e.key === 'ArrowDown') go(cur + 1);
      else if (e.key === 'ArrowUp') go(cur - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(items.length - 1);
      else if (e.key === 'Tab') this.closeMenu();
    });
  }

  /** Próximo degrau de zoom (a partir do fator atual). */
  private step(dir: 1 | -1): void {
    const f = this.host.zoom().factor;
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > f + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < f - 0.001);
    if (next) { this.host.setZoom(next); this.host.announce(`${this.labels.zoom} ${Math.round(next * 100)}%`); }
  }

  private toggleZoomMenu(): void {
    const L = this.labels, cur = this.host.zoom();
    const paged = this.host.view() === 'print';
    this.toggleMenu('zoom-level', [
      ...(paged ? [{ value: 'page-width', label: L.pageWidth }, { value: 'page-fit', label: L.pageFit }] : []),
      ...[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` })),
    ].map((o) => ({ ...o, checked: String(cur.spec) === o.value || (!paged && Math.abs(cur.factor - Number(o.value)) < 0.001) })),
    (v) => {
      this.host.setZoom(v === 'page-width' || v === 'page-fit' ? v : Number(v));
      this.host.announce(`${L.zoom} ${Math.round(this.host.zoom().factor * 100)}%`);
    });
  }

  private toggleViewMenu(): void {
    const L = this.labels, cur = this.host.view();
    this.toggleMenu('view', VIEW_MODES.map((v) => ({ value: v, label: L[v], checked: v === cur })),
      (v) => this.host.setView(v as ViewMode));
  }

  /** Imprimir: com o PDF liberado, menu Imprimir… / Salvar como PDF; sem (`nodownloadpdf`), imprime direto. */
  private printOrMenu(): void {
    if (this.bar.isRemoved('downloadpdf')) { this.host.print(); return; }
    const L = this.labels;
    this.toggleMenu('print', [{ value: 'print', label: L.printMenu }, { value: 'pdf', label: L.savePdf }],
      (v) => (v === 'pdf' ? this.host.downloadPdf() : this.host.print()));
  }

  private toggleMenu(button: string, options: MenuOption[], pick: (v: string) => void): void {
    if (!this.menu.hidden) {
      const same = this.menuFor?.button === button;
      this.closeMenu();
      if (same) return;
    }
    this.menu.textContent = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', o.checked === undefined ? 'menuitem' : 'menuitemradio');
      b.setAttribute('part', 'menu-option');
      b.dataset['value'] = o.value;
      b.textContent = o.label;
      if (o.checked !== undefined) b.setAttribute('aria-checked', String(o.checked));
      this.menu.appendChild(b);
    }
    const btn = this.bar.buttonEl(button)!;
    this.menuFor = { button, pick };
    this.menu.hidden = false;
    // alinha o menu ao botão, sem sair da barra
    const br = this.bar.bar.getBoundingClientRect(), lr = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(br.width - this.menu.offsetWidth - 8, lr.left - br.left + lr.width / 2 - this.menu.offsetWidth / 2));
    this.menu.style.left = `${left}px`;
    this.last = '';
    (this.menu.querySelector('[aria-checked="true"]') as HTMLElement | null ?? this.menu.firstElementChild as HTMLElement)?.focus();
  }

  /** Fecha o menu; `refocus` = o foco volta ao botão que o abriu (Esc). */
  private closeMenu(refocus = false): void {
    const btn = this.menuFor ? this.bar.buttonEl(this.menuFor.button) : undefined;
    this.menu.hidden = true;
    this.menuFor = null;
    this.last = '';
    if (refocus) btn?.focus();
  }

  configure(enabled: boolean, removed: readonly ControlItem[], lang: UiLang): void {
    this.labels = labelsFor(lang);
    this.bar.setLabel(this.labels.toolbar);
    if (!enabled) this.closeMenu();
    this.bar.configure(enabled, removed);
    const itemOf: Record<string, ControlItem> = { view: 'view', 'zoom-level': 'zoom', print: 'print' };
    if (this.menuFor && (this.bar.isRemoved(itemOf[this.menuFor.button]!) || (this.menuFor.button === 'print' && this.bar.isRemoved('downloadpdf')))) this.closeMenu();
    this.last = '';
    this.sync();
  }

  wake = (): void => this.bar.wake();
  leave = (): void => this.bar.leave();

  /** Reflete o estado do viewer; só mexe no DOM quando muda. */
  sync(): void {
    if (!this.bar.enabled) return;
    const h = this.host, L = this.labels, b = this.bar;
    const n = h.count();
    const frac = h.progress();
    b.setProgress(frac, { label: L.progress, min: 0, max: 100, now: Math.round(frac * 100), text: h.positionText() });
    const z = h.zoom(), full = h.isFullscreen(), tab = h.navTab(), cmOpen = h.commentsOpen(), view = h.view();
    const avail = CONTROL_ITEMS.map((it) => (h.available(it) ? 1 : 0)).join('');
    const counter = h.counter();
    const state = [n, counter, z.spec, z.factor.toFixed(3), full, tab, cmOpen, view, avail, this.menuFor?.button,
      CONTROL_ITEMS.filter((it) => b.isRemoved(it)).join()].join('|');
    if (state === this.last) return;
    this.last = state;

    b.applyVisibility((it) => n > 0 && h.available(it));
    b.setCounter(counter);
    const pct = `${Math.round(z.factor * 100)}%`;
    b.setButton('prev', { label: L.prev });
    b.setButton('next', { label: L.next });
    b.setButton('outline', { label: L.outline, pressed: tab === 'outline' });
    b.setButton('thumbnails', { label: L.thumbnails, pressed: tab === 'pages' });
    b.setButton('comments', { label: L.comments, pressed: cmOpen });
    b.setButton('zoom-out', { label: L.zoomOut });
    b.setButton('zoom-level', { label: `${L.zoom}: ${pct}`, text: pct, expanded: this.menuFor?.button === 'zoom-level' });
    b.setButton('zoom-in', { label: L.zoomIn });
    b.setButton('view', { label: `${L.view}: ${L[view]}`, icon: `view-${view}`, expanded: this.menuFor?.button === 'view' });
    b.setButton('download', { label: L.download });
    const pdf = !b.isRemoved('downloadpdf');
    b.setButton('print', { label: pdf ? L.printOrPdf : L.printDoc, expanded: pdf ? this.menuFor?.button === 'print' : undefined });
    const pb = b.buttonEl('print');
    if (pdf) pb?.setAttribute('aria-haspopup', 'menu');
    else { pb?.removeAttribute('aria-haspopup'); pb?.removeAttribute('aria-expanded'); }
    b.setButton('fullscreen', { label: full ? L.unfullscreen : L.fullscreen, icon: full ? 'unfullscreen' : 'fullscreen' });
  }

  dispose(): void { this.bar.dispose(); }
}
