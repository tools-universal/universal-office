/**
 * Barra de controles dos viewers — o núcleo ÚNICO do <universal-presentation-viewer>
 * (Slides) e do <universal-document-viewer> (Write): o mesmo modelo dos
 * controles do <video>, visível por padrão; `nocontrols` desliga tudo e um
 * atributo booleano por item (`no` + nome: `nodownload`, `nofullscreen`…) tira
 * só ele. Cada viewer declara os PRÓPRIOS itens e botões; aqui ficam a barra,
 * o progresso, o contador, os botões, o auto-ocultar, os ícones e o CSS.
 *
 * Personalização pelo host, sem tocar no shadow DOM:
 *  - variáveis CSS com o prefixo do viewer (`--upv-*`, `--udv-*`) e, sem ele,
 *    as COMUNS `--uo-*` (um tema para os dois viewers): `controls-color`,
 *    `controls-size`, `controls-bg`, `controls-hover-bg`, `progress-color`,
 *    `progress-track`, `progress-height`;
 *  - `::part()`: `controls`, `progress`, `progress-value`, `counter`,
 *    `button` e `button-<nome>`.
 * Os ícones são SVG com `currentColor`: cor e tamanho vêm só das variáveis.
 */

const SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

/** Ícones da barra (24×24, traço em currentColor). */
export const ICONS: Record<string, string> = {
  // navegação
  'skip-prev': '<path d="M5 5v14"/><path d="M19 5v14L8 12z" fill="currentColor"/>',
  'skip-next': '<path d="M19 5v14"/><path d="M5 5v14l11-7z" fill="currentColor"/>',
  'chevron-up': '<path d="M6 15l6-6 6 6"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
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
  'view-read': '<path d="M3 5.5c3-1 6-1 9 1.2 3-2.2 6-2.2 9-1.2v13c-3-1-6-1-9 1.2-3-2.2-6-2.2-9-1.2z"/><path d="M12 6.7v13.2"/>',
  'view-print': '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 12h7M9 15.5h7"/>',
  'view-web': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
  // zoom
  'zoom-out': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M7.5 10.5h6M20 20l-4.8-4.8"/>',
  'zoom-in': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M7.5 10.5h6M10.5 7.5v6M20 20l-4.8-4.8"/>',
  // arquivo
  download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  // apresentação e tela cheia
  present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10.5 7.5v5l4-2.5z" fill="currentColor"/>',
  unpresent: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10 8l4 4M14 8l-4 4"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  unfullscreen: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
};

export const icon = (name: string): string => `<svg ${SVG_ATTRS}>${ICONS[name] ?? ''}</svg>`;

/**
 * `var(--<prefixo>-<nome>, var(--uo-<nome>, <padrão>))` — a variável do viewer
 * vence; sem ela, a comum aos viewers; sem as duas, o padrão.
 */
export const cssVar = (prefix: string, name: string, def: string): string =>
  `var(--${prefix}-${name}, var(--uo-${name}, ${def}))`;

/** Padrões das variáveis da barra que o viewer pode trocar (o do documento segue o claro/escuro). */
export interface ControlsDefaults {
  color?: string;
  hoverBg?: string;
  bg?: string;
  progressColor?: string;
  progressTrack?: string;
}

/**
 * CSS da barra (vai no shadow root do viewer). `prefix` = o das variáveis do
 * viewer (`upv`, `udv`). Expõe `--uoc-c` (cor) e `--uoc-s` (tamanho) para o
 * CSS próprio do viewer (miniaturas, menus…). `defaults` troca os padrões
 * (sem ele: barra de vídeo, ícones brancos sobre degradê escuro).
 */
export function controlsCss(prefix: string, defaults: ControlsDefaults = {}): string {
  const v = (name: string, def: string): string => cssVar(prefix, name, def);
  return `
:host {
  --uoc-c: ${v('controls-color', defaults.color ?? '#fff')};
  --uoc-s: ${v('controls-size', '22px')};
  --uoc-hover: ${v('controls-hover-bg', defaults.hoverBg ?? 'rgba(255,255,255,.16)')};
  --uoc-progress: ${v('progress-color', defaults.progressColor ?? '#fff')};
}
.uoc-ui [hidden] { display: none !important; }
.uoc-ui { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; }
.uoc-bar {
  position: absolute; left: 0; right: 0; bottom: 0; pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: calc(var(--uoc-s) * 1.9) 10px 6px;
  background: ${v('controls-bg', defaults.bg ?? 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.35) 40%, rgba(0,0,0,.8))')};
  color: var(--uoc-c); font: 400 calc(var(--uoc-s) * .6)/1 system-ui, "Segoe UI", sans-serif;
  /* aparecer: visível JÁ (o Tab precisa achar os botões no mesmo instante); sumir: esmaece e só então esconde */
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
.uoc-track { position: relative; width: 100%; height: ${v('progress-height', '3px')}; background: ${v('progress-track', defaults.progressTrack ?? 'rgba(255,255,255,.28)')}; transition: height .1s; }
.uoc-progress:hover .uoc-track { height: calc(${v('progress-height', '3px')} + 2px); }
.uoc-progress:focus-visible { outline: 2px solid var(--uoc-c); outline-offset: 2px; border-radius: 2px; }
.uoc-value { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--uoc-progress); }
`;
}

/** Botão declarado pelo viewer. */
export interface ButtonSpec<Item extends string> {
  /** nome (parte `button-<nome>` e chave em `setButton`) */
  name: string;
  /** item que o atributo `no<item>` tira */
  item: Item;
  /** ícone inicial (nome em ICONS) */
  icon?: string;
  run: () => void;
  className?: string;
}

/** Estado de um botão na sincronização. */
export interface ButtonState {
  label: string;
  icon?: string;
  pressed?: boolean;
  expanded?: boolean;
  text?: string;
}

export interface ControlBarOptions<Item extends string> {
  root: ShadowRoot;
  /** elemento que recebe a classe `uoc-hidden` (o fullscreen do viewer) */
  wrap: HTMLElement;
  /** à esquerda: botões e o contador (`'counter'`) */
  start: (ButtonSpec<Item> | 'counter')[];
  /** à direita */
  end: ButtonSpec<Item>[];
  /** item do contador e do progresso (`nocounter`, `noprogress`) */
  counterItem: Item;
  progressItem: Item;
  /** clique no progresso: fração 0–1 */
  onSeek: (fraction: number) => void;
  /** teclado no progresso (slider): passo, página, início/fim */
  onStep?: (step: ProgressStep) => void;
  /** algo do viewer prende a barra visível (menu ou painel aberto) */
  keepVisible?: () => boolean;
}

/** Teclas do slider de progresso (padrão ARIA de slider). */
export type ProgressStep = 'prev' | 'next' | 'pageprev' | 'pagenext' | 'home' | 'end';

/** Visualmente oculto, mas na árvore de acessibilidade (leitores de tela). */
export const SR_ONLY = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';

/**
 * Região viva (aria-live) para os anúncios do viewer: troca de slide/página,
 * de modo, de zoom… Fica no viewer mesmo com `nocontrols`.
 */
export class LiveRegion {
  readonly el = document.createElement('div');
  private timer = 0;
  constructor() {
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.setAttribute('aria-atomic', 'true');
    this.el.setAttribute('part', 'live');
    this.el.style.cssText = SR_ONLY;
  }
  /** Anuncia `text` (o mesmo texto de novo também é anunciado). */
  announce(text: string): void {
    clearTimeout(this.timer);
    this.el.textContent = '';
    this.timer = window.setTimeout(() => { this.el.textContent = text; }, 60);
  }
}

/** Tempo parado até a barra sumir (ms). */
export const IDLE_MS = 2500;

/** Barra de controles: monta, mostra/esconde e reflete o estado que o viewer passar. */
export class ControlBar<Item extends string> {
  readonly ui = document.createElement('div');
  readonly bar = document.createElement('div');
  private readonly progress = document.createElement('div');
  private readonly value = document.createElement('div');
  private readonly counter = document.createElement('span');
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private removed = new Set<Item>();
  private enabledFlag = false;
  private hideTimer = 0;
  private pointerInBar = false;

  constructor(private readonly o: ControlBarOptions<Item>) {
    this.ui.className = 'uoc-ui';
    this.bar.className = 'uoc-bar';
    this.bar.setAttribute('part', 'controls');
    this.bar.setAttribute('role', 'toolbar');

    this.progress.className = 'uoc-progress';
    this.progress.setAttribute('part', 'progress');
    this.progress.setAttribute('role', 'slider');
    this.progress.setAttribute('aria-orientation', 'horizontal');
    this.progress.tabIndex = 0;
    this.progress.dataset['item'] = o.progressItem;
    this.progress.addEventListener('keydown', (e) => {
      const step: ProgressStep | undefined = ({
        ArrowRight: 'next', ArrowUp: 'next', ArrowLeft: 'prev', ArrowDown: 'prev',
        PageUp: 'pagenext', PageDown: 'pageprev', Home: 'home', End: 'end',
      } as Record<string, ProgressStep>)[e.key];
      if (!step || !o.onStep) return;
      e.preventDefault();
      e.stopPropagation();
      o.onStep(step);
      this.wake();
    });
    const track = document.createElement('div');
    track.className = 'uoc-track';
    this.value.className = 'uoc-value';
    this.value.setAttribute('part', 'progress-value');
    track.appendChild(this.value);
    this.progress.appendChild(track);
    this.progress.addEventListener('click', (e) => {
      const r = this.progress.getBoundingClientRect();
      o.onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1))));
      this.wake();
    });
    this.bar.appendChild(this.progress);

    this.counter.className = 'uoc-counter';
    this.counter.setAttribute('part', 'counter');
    this.counter.dataset['item'] = o.counterItem;

    for (const s of o.start) this.bar.appendChild(s === 'counter' ? this.counter : this.button(s));
    const spacer = document.createElement('span');
    spacer.className = 'uoc-spacer';
    this.bar.appendChild(spacer);
    for (const s of o.end) this.bar.appendChild(this.button(s));

    this.ui.appendChild(this.bar);
    // cliques na barra não chegam ao conteúdo (na apresentação o clique avança)
    this.bar.addEventListener('click', (e) => e.stopPropagation());
    this.bar.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.bar.addEventListener('pointerenter', () => { this.pointerInBar = true; this.wake(); });
    this.bar.addEventListener('pointerleave', () => { this.pointerInBar = false; this.wake(); });
    this.bar.addEventListener('focusin', () => this.wake());
    // teclado: o Tab precisa achar a barra VISÍVEL (escondida, o navegador pula os
    // botões) — mostra antes do foco andar; e mostra quando o foco entra no viewer
    o.wrap.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'F6') this.wake(); }, true);
    o.wrap.addEventListener('focusin', () => this.wake());
  }

  private button(s: ButtonSpec<Item>): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = s.className ? `uoc-btn ${s.className}` : 'uoc-btn';
    b.setAttribute('part', `button button-${s.name}`);
    b.dataset['item'] = s.item;
    if (s.icon) { b.innerHTML = icon(s.icon); b.dataset['icon'] = s.icon; }
    b.addEventListener('click', () => { s.run(); this.wake(); });
    this.buttons.set(s.name, b);
    return b;
  }

  get enabled(): boolean { return this.enabledFlag; }

  /** Liga/desliga a barra e guarda os itens tirados (`no<item>`). Devolve true se mudou de ligada↔desligada. */
  configure(enabled: boolean, removed: readonly Item[]): boolean {
    this.removed = new Set(removed);
    if (enabled === this.enabledFlag && enabled === this.ui.isConnected) return false;
    this.enabledFlag = enabled;
    if (enabled) { this.o.wrap.appendChild(this.ui); this.wake(); }
    else { clearTimeout(this.hideTimer); this.ui.remove(); }
    return true;
  }

  isRemoved(item: Item): boolean { return this.removed.has(item); }

  /** Atividade do usuário: mostra a barra e reagenda o sumiço. */
  wake = (): void => {
    if (!this.enabledFlag) return;
    this.o.wrap.classList.remove('uoc-hidden');
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(this.idle, IDLE_MS);
  };

  /** O ponteiro saiu do viewer: some já (se nada prende a barra). */
  leave = (): void => { if (this.enabledFlag) this.idle(); };

  private idle = (): void => {
    clearTimeout(this.hideTimer);
    if (this.pointerInBar || this.o.keepVisible?.() || this.bar.contains(this.o.root.activeElement)) return;
    this.o.wrap.classList.add('uoc-hidden');
  };

  /**
   * Visibilidade dos itens: o atributo `no<item>` tira; `available(item)`
   * esconde o que não se aplica agora (sem mídia, sem anotações, deck vazio…).
   */
  applyVisibility(available: (item: Item) => boolean): void {
    for (const el of this.bar.querySelectorAll<HTMLElement>('[data-item]')) {
      const it = el.dataset['item'] as Item;
      el.hidden = this.removed.has(it) || !available(it);
    }
  }

  /** Nome da barra (role=toolbar) para o leitor de tela. */
  setLabel(label: string): void { this.bar.setAttribute('aria-label', label); }

  setProgress(fraction: number, aria: { label: string; min: number; max: number; now: number; text?: string }): void {
    this.value.style.width = `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(2)}%`;
    this.progress.setAttribute('aria-label', aria.label);
    this.progress.setAttribute('aria-valuemin', String(aria.min));
    this.progress.setAttribute('aria-valuemax', String(aria.max));
    this.progress.setAttribute('aria-valuenow', String(aria.now));
    if (aria.text) this.progress.setAttribute('aria-valuetext', aria.text); else this.progress.removeAttribute('aria-valuetext');
  }

  setCounter(text: string): void { this.counter.textContent = text; }

  setButton(name: string, st: ButtonState): void {
    const b = this.buttons.get(name);
    if (!b) return;
    b.setAttribute('aria-label', st.label);
    b.title = st.label;
    if (st.icon && b.dataset['icon'] !== st.icon) { b.innerHTML = icon(st.icon); b.dataset['icon'] = st.icon; }
    if (st.text !== undefined) b.textContent = st.text;
    if (st.pressed !== undefined) b.setAttribute('aria-pressed', String(st.pressed));
    if (st.expanded !== undefined) b.setAttribute('aria-expanded', String(st.expanded));
  }

  buttonEl(name: string): HTMLButtonElement | undefined { return this.buttons.get(name); }

  dispose(): void { clearTimeout(this.hideTimer); }
}
