// RÉGUA dos editores (horizontal e vertical), no estilo da régua do Word:
// faixa da página com as margens sombreadas, números na unidade (cm ou
// polegada) a partir da margem, marcadores de recuo (primeira linha,
// deslocamento, esquerdo, direito), tabulações, marcas da tabulação padrão,
// divisas de coluna/célula/linha e as bordas das margens. Arrastar encaixa no
// passo da unidade (0,25 cm ou 1/16") — com Alt, livre e com a medida à mostra;
// puxar uma tabulação para fora da régua a remove; clicar na área do texto
// marca uma tabulação do tipo do seletor (canto esquerdo). O app só descreve
// a régua (RulerModel, em twips) e recebe os eventos — a geometria é dele.
import { DEFAULT_UI_LANG, pickLabels, type UiLang } from '../i18n.js';
import type { Lbl } from './types.js';

export type RulerTabKind = 'left' | 'center' | 'right' | 'decimal' | 'bar';
/** tipos do seletor: as tabulações e os dois recuos que o Word também põe lá */
export type RulerSelectorKind = RulerTabKind | 'first-line' | 'hanging';

export type RulerMarkerKind =
  | 'first-line' | 'hanging' | 'left-indent' | 'right-indent'
  | `tab-${RulerTabKind}`
  /** borda de margem (entre o sombreado e o branco) */
  | 'margin'
  /** borda do espaço entre colunas da seção */
  | 'column'
  /** divisa de coluna de tabela (régua horizontal) ou de linha (vertical) */
  | 'cell' | 'row';

export interface RulerMarker {
  id: string;
  kind: RulerMarkerKind;
  /** posição em twips a partir da borda da página (topo, na vertical) */
  pos: number;
  tip?: Lbl;
  /** limites do arrasto (twips) */
  min?: number;
  max?: number;
  /** pode ser removido puxando para fora (tabulação) */
  removable?: boolean;
  /** outros marcadores que andam junto no arrasto (recuo esquerdo leva os outros dois) */
  group?: string[];
  /** só desenho (sem arrasto) */
  fixed?: boolean;
}

export interface RulerModel {
  /** comprimento da página na direção da régua (twips) */
  length: number;
  /** px por twip (zoom) */
  scale: number;
  /** px, no elemento da régua, onde fica a borda da página */
  offset: number;
  unit: 'cm' | 'in';
  /** zero dos números (twips): a margem / o quadro do parágrafo */
  zero: number;
  /** faixas sombreadas (margens, espaço entre colunas), twips */
  shaded: [number, number][];
  /** área onde o clique marca tabulação (o quadro do parágrafo), twips */
  textArea?: [number, number];
  markers: RulerMarker[];
  /** marcas da tabulação padrão (twips) */
  defaultTabs?: number[];
  readOnly?: boolean;
}

export interface RulerEvents {
  /** durante o arrasto (o app desenha a guia no documento); null = acabou */
  onDrag?(m: RulerMarker | null, pos: number): void;
  /** soltou: `removed` = tabulação puxada para fora */
  onDrop?(m: RulerMarker, pos: number, removed: boolean): void;
  /** clique na área do texto com uma tabulação no seletor */
  onAddTab?(kind: RulerTabKind, pos: number): void;
  /** duplo clique: num marcador, numa margem ('margin') ou na faixa ('track') */
  onDblClick?(target: RulerMarker | 'margin' | 'track', pos: number): void;
}

const LABELS = {
  en: {
    left: 'Left Tab', center: 'Center Tab', right: 'Right Tab', decimal: 'Decimal Tab', bar: 'Bar Tab',
    'first-line': 'First Line Indent', hanging: 'Hanging Indent', selector: 'Tab type — click to change',
  },
  pt: {
    left: 'Tabulação Esquerda', center: 'Tabulação Centralizada', right: 'Tabulação Direita', decimal: 'Tabulação Decimal', bar: 'Barra de Tabulação',
    'first-line': 'Recuo da Primeira Linha', hanging: 'Recuo Deslocado', selector: 'Tipo de tabulação — clique para trocar',
  },
};

const SELECTOR_ORDER: RulerSelectorKind[] = ['left', 'center', 'right', 'decimal', 'bar', 'first-line', 'hanging'];
const TW_PER_UNIT = { cm: 1440 / 2.54, in: 1440 };
/** px de tolerância para pegar um marcador */
const HIT = 5;
/** px fora da régua que removem a tabulação */
const OFF = 18;

/** Passo de encaixe (twips): 0,25 cm ou 1/16". */
export const rulerStep = (unit: 'cm' | 'in'): number => (unit === 'cm' ? TW_PER_UNIT.cm / 4 : TW_PER_UNIT.in / 16);

export interface RulerHandle {
  el: HTMLElement;
  update(m: RulerModel | null): void;
  /** tipo do seletor (só horizontal) */
  readonly selector: RulerSelectorKind;
  destroy(): void;
}

export function createRuler(opts: { orientation: 'horizontal' | 'vertical'; lang?: UiLang; selector?: boolean } & RulerEvents): RulerHandle {
  const horiz = opts.orientation === 'horizontal';
  const L = pickLabels(opts.lang ?? DEFAULT_UI_LANG, LABELS);
  const txt = (l: Lbl | undefined): string => (l === undefined ? '' : typeof l === 'string' ? l : pickLabels(opts.lang ?? DEFAULT_UI_LANG, l));
  const el = document.createElement('div');
  el.className = `uo-ruler uo-ruler-${horiz ? 'h' : 'v'}`;
  el.setAttribute('part', `ruler ruler-${horiz ? 'h' : 'v'}`);
  el.setAttribute('role', 'presentation');
  const canvas = document.createElement('canvas');
  canvas.className = 'uo-ruler-canvas';
  let selBtn: HTMLButtonElement | null = null;
  let selector: RulerSelectorKind = 'left';
  if (horiz && opts.selector !== false) {
    selBtn = document.createElement('button');
    selBtn.type = 'button';
    selBtn.className = 'uo-ruler-sel';
    selBtn.addEventListener('mousedown', (e) => e.preventDefault());
    selBtn.addEventListener('click', () => {
      selector = SELECTOR_ORDER[(SELECTOR_ORDER.indexOf(selector) + 1) % SELECTOR_ORDER.length]!;
      paintSelector();
    });
    el.appendChild(selBtn);
  }
  el.appendChild(canvas);

  let model: RulerModel | null = null;
  /** modelo que chegou durante o arrasto (aplicado ao soltar) */
  let pending: RulerModel | null | undefined;
  let drag: { m: RulerMarker; start: number; pos: number; off: boolean; moved: boolean; base: Map<string, number>; provisional?: RulerTabKind } | null = null;
  let hover: RulerMarker | null = null;
  let dpr = 1;

  // os tokens podem vir como light-dark()/color-mix(), que o canvas não entende:
  // um elemento de prova resolve cada um para a cor computada (rgb)
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  el.appendChild(probe);
  const colors = (): { track: string; shade: string; ink: string; mark: string; accent: string; bg: string; fill: string } => {
    const v = (n: string, d: string): string => {
      probe.style.color = `var(${n}, ${d})`;
      return getComputedStyle(probe).color || d;
    };
    return {
      track: v('--uo-ruler-track', '#ffffff'), shade: v('--uo-ruler-shade', '#d6d6da'), ink: v('--uo-ruler-ink', '#44474f'),
      mark: v('--uo-ruler-mark', '#1b1b1f'), accent: v('--uo-ruler-accent', '#005bc0'), bg: v('--uo-ruler-bg', 'transparent'),
      fill: v('--uo-ruler-fill', '#ffffff'),
    };
  };

  /** px no eixo da régua → twips da página */
  const toTw = (px: number): number => (px - (model?.offset ?? 0)) / (model?.scale || 1);
  const toPx = (tw: number): number => (model?.offset ?? 0) + tw * (model?.scale ?? 1);
  const axis = (e: { clientX: number; clientY: number }): { a: number; c: number } => {
    const r = canvas.getBoundingClientRect();
    return horiz ? { a: e.clientX - r.left, c: e.clientY - r.top } : { a: e.clientY - r.top, c: e.clientX - r.left };
  };
  const thick = (): number => (horiz ? canvas.clientHeight : canvas.clientWidth) || 22;
  const markerPos = (m: RulerMarker): number => {
    if (!drag) return m.pos;
    if (drag.m.id === m.id) return drag.pos;
    const b = drag.base.get(m.id);
    return b !== undefined ? b + (drag.pos - drag.start) : m.pos;
  };

  function paintSelector(): void {
    if (!selBtn) return;
    selBtn.title = `${L[selector]} — ${L.selector}`;
    selBtn.setAttribute('aria-label', selBtn.title);
    const c = document.createElement('canvas');
    const s = 16, r = window.devicePixelRatio || 1;
    c.width = s * r; c.height = s * r;
    c.style.width = `${s}px`; c.style.height = `${s}px`;
    const g = c.getContext('2d')!;
    g.scale(r, r);
    const col = colors();
    const kind: RulerMarkerKind = selector === 'first-line' ? 'first-line' : selector === 'hanging' ? 'hanging' : `tab-${selector}`;
    drawGlyph(g, kind, 8, selector === 'first-line' ? 4 : selector === 'hanging' ? 12 : 12, col.mark, col.fill, true);
    selBtn.replaceChildren(c);
  }

  /** desenha o símbolo de um marcador centrado em (x, y) — y é a base para tabulações */
  function drawGlyph(g: CanvasRenderingContext2D, kind: RulerMarkerKind, x: number, y: number, ink: string, fill: string, icon = false): void {
    g.save();
    g.strokeStyle = ink;
    g.fillStyle = fill;
    g.lineWidth = 1;
    const tri = (down: boolean, cy: number): void => {
      g.beginPath();
      if (down) { g.moveTo(x - 4.5, cy - 3.5); g.lineTo(x + 4.5, cy - 3.5); g.lineTo(x, cy + 2.5); }
      else { g.moveTo(x - 4.5, cy + 3.5); g.lineTo(x + 4.5, cy + 3.5); g.lineTo(x, cy - 2.5); }
      g.closePath(); g.fill(); g.stroke();
    };
    switch (kind) {
      case 'first-line': tri(true, y); break;
      case 'hanging': tri(false, y); break;
      case 'right-indent': tri(false, y); break;
      case 'left-indent': g.fillRect(x - 4.5, y - 3, 9, 6); g.strokeRect(x - 4.5 + 0.5, y - 3 + 0.5, 8, 5); break;
      default:
        if (kind.startsWith('tab-')) {
          g.lineWidth = icon ? 2 : 1.6;
          g.beginPath();
          const t = kind.slice(4);
          const h = 6, w = 5;
          if (t === 'left') { g.moveTo(x, y - h); g.lineTo(x, y); g.lineTo(x + w, y); }
          else if (t === 'right') { g.moveTo(x, y - h); g.lineTo(x, y); g.lineTo(x - w, y); }
          else if (t === 'center' || t === 'decimal') { g.moveTo(x, y - h); g.lineTo(x, y); g.moveTo(x - w, y); g.lineTo(x + w, y); }
          else if (t === 'bar') { g.moveTo(x, y - h - 1); g.lineTo(x, y + 1); }
          g.stroke();
          if (t === 'decimal') { g.fillStyle = ink; g.fillRect(x + 2, y - 4, 2, 2); }
        }
    }
    g.restore();
  }

  function paint(): void {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
    }
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!model) return;
    const col = colors();
    // no sistema da régua: a = eixo, c = espessura
    if (!horiz) { g.translate(W, 0); g.rotate(Math.PI / 2); }
    const T = thick();
    const len = horiz ? W : H;
    const band = { c0: Math.round(T * 0.21), c1: Math.round(T * 0.71) };
    const p0 = toPx(0), p1 = toPx(model.length);
    // faixa da página: margens sombreadas, texto claro
    g.fillStyle = col.shade;
    g.fillRect(Math.max(0, p0), band.c0, Math.min(len, p1) - Math.max(0, p0), band.c1 - band.c0);
    g.fillStyle = col.track;
    const area: [number, number][] = [];
    // branco = página menos as faixas sombreadas
    let at = 0;
    for (const [a, b] of [...model.shaded].sort((x, y) => x[0] - y[0])) { if (a > at) area.push([at, a]); at = Math.max(at, b); }
    if (at < model.length) area.push([at, model.length]);
    for (const [a, b] of area) g.fillRect(toPx(a), band.c0, (b - a) * model.scale, band.c1 - band.c0);
    // escala: números na unidade, a partir do zero (a margem), e tiques
    const unitTw = TW_PER_UNIT[model.unit];
    const sub = model.unit === 'cm' ? 4 : 8;
    const stepPx = unitTw / sub * model.scale;
    const every = stepPx < 3 ? sub : stepPx < 6 ? sub / 2 : 1;
    g.fillStyle = col.ink;
    g.strokeStyle = col.ink;
    g.lineWidth = 1;
    g.font = `${Math.max(8, Math.round(T * 0.42))}px var(--uo-font, "Segoe UI", system-ui, sans-serif)`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const kMin = Math.ceil(-model.zero / unitTw * sub), kMax = Math.floor((model.length - model.zero) / unitTw * sub);
    const labelEvery = unitTw * model.scale < 28 ? 2 : 1;
    const mid = (band.c0 + band.c1) / 2;
    g.beginPath();
    for (let k = kMin; k <= kMax; k++) {
      if (k % every) continue;
      const x = Math.round(toPx(model.zero + (k * unitTw) / sub)) + 0.5;
      if (x < -20 || x > len + 20) continue;
      if (k % sub === 0) {
        const n = Math.abs(k / sub);
        if (n !== 0 && n % labelEvery === 0) {
          if (!horiz) { g.save(); g.translate(x, mid); g.rotate(-Math.PI / 2); g.fillText(String(n), 0, 0); g.restore(); }
          else g.fillText(String(n), x, mid + 0.5);
        }
      } else {
        const half = sub % 2 === 0 && k % (sub / 2) === 0;
        const h = half ? T * 0.22 : T * 0.1;
        g.moveTo(x, mid - h / 2); g.lineTo(x, mid + h / 2);
      }
    }
    g.stroke();
    // tabulação padrão: tiques curtos na borda de baixo
    if (model.defaultTabs?.length && horiz) {
      g.beginPath();
      for (const t of model.defaultTabs) {
        const x = Math.round(toPx(t)) + 0.5;
        g.moveTo(x, band.c1 - 1); g.lineTo(x, band.c1 + 2);
      }
      g.stroke();
    }
    // marcadores
    for (const m of model.markers) {
      const pos = markerPos(m);
      const x = Math.round(toPx(pos)) + 0.5;
      if (x < -10 || x > len + 10) continue;
      const faded = drag?.off && drag.m.id === m.id;
      g.globalAlpha = faded ? 0.35 : 1;
      const ink = hover?.id === m.id || drag?.m.id === m.id ? col.accent : col.mark;
      if (m.kind === 'first-line') drawGlyph(g, m.kind, x, band.c0 + 1, ink, col.fill);
      else if (m.kind === 'hanging' || m.kind === 'right-indent') drawGlyph(g, m.kind, x, band.c1 - 3, ink, col.fill);
      else if (m.kind === 'left-indent') drawGlyph(g, m.kind, x, band.c1 + 3.5, ink, col.fill);
      else if (m.kind.startsWith('tab-')) drawGlyph(g, m.kind, x, band.c1 - 2, ink, col.fill);
      else if (m.kind === 'cell' || m.kind === 'row') {
        // grade pequena (Mover Coluna da Tabela / Ajustar Linha da Tabela)
        g.fillStyle = col.shade; g.strokeStyle = ink;
        g.fillRect(x - 4, band.c0 + 1, 8, band.c1 - band.c0 - 2);
        g.beginPath();
        for (let i = 0; i < 3; i++) { const yy = band.c0 + 3 + i * ((band.c1 - band.c0 - 6) / 2); g.moveTo(x - 3, yy); g.lineTo(x + 3, yy); }
        g.stroke();
      } else if (drag?.m.id === m.id && (m.kind === 'margin' || m.kind === 'column')) {
        g.strokeStyle = col.accent;
        g.beginPath(); g.moveTo(x, band.c0); g.lineTo(x, band.c1); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // medida durante o arrasto (com Alt, como o Word; aqui sempre que arrasta)
    if (drag && drag.moved && !drag.off) {
      const x = toPx(drag.pos);
      const v = (drag.pos - model.zero) / unitTw;
      const label = `${(Math.round(v * 100) / 100).toLocaleString(opts.lang === 'pt' ? 'pt-BR' : 'en-US')} ${model.unit === 'cm' ? 'cm' : '"'}`;
      g.font = `${Math.max(9, Math.round(T * 0.45))}px var(--uo-font, "Segoe UI", system-ui, sans-serif)`;
      const tw = g.measureText(label).width + 8;
      const lx = Math.min(len - tw - 2, Math.max(2, x + 6));
      g.fillStyle = col.accent;
      if (!horiz) { g.save(); g.translate(lx + tw / 2, mid); g.rotate(-Math.PI / 2); g.translate(-(lx + tw / 2), -mid); }
      g.globalAlpha = 0.92;
      g.fillRect(lx, band.c0 + 1, tw, band.c1 - band.c0 - 2);
      g.globalAlpha = 1;
      g.fillStyle = col.fill;
      g.fillText(label, lx + tw / 2, mid + 0.5);
      if (!horiz) g.restore();
    }
  }

  const markerAt = (a: number, c: number): RulerMarker | null => {
    if (!model) return null;
    let best: RulerMarker | null = null, bd = HIT + 1;
    const T = thick();
    for (const m of model.markers) {
      if (m.fixed) continue;
      const d = Math.abs(toPx(m.pos) - a);
      if (d > HIT) continue;
      // primeira linha (em cima) × deslocamento/esquerdo (embaixo) na mesma posição
      if (m.kind === 'first-line' && c > T * 0.45) continue;
      if (m.kind === 'hanging' && (c < T * 0.4 || c > T * 0.74)) continue;
      if (m.kind === 'left-indent' && c < T * 0.72) continue;
      // recuo direito embaixo; em cima, na mesma posição, pega a borda da margem (como no Word)
      if (m.kind === 'right-indent' && c < T * 0.4) continue;
      // prioridade: recuo/tabulação > célula > coluna > margem
      const rank = m.kind === 'margin' ? 3 : m.kind === 'column' ? 2 : m.kind === 'cell' || m.kind === 'row' ? 1 : 0;
      const score = d + rank * 0.1;
      if (score < bd) { bd = score; best = m; }
    }
    return best;
  };

  const cursorFor = (m: RulerMarker | null): string => {
    if (!m || model?.readOnly) return '';
    if (m.kind === 'margin' || m.kind === 'column' || m.kind === 'cell') return horiz ? 'col-resize' : 'row-resize';
    if (m.kind === 'row') return 'row-resize';
    return 'default';
  };

  canvas.addEventListener('pointermove', (e) => {
    if (drag) return;
    const { a, c } = axis(e);
    const m = markerAt(a, c);
    if (m?.id !== hover?.id) { hover = m; paint(); }
    canvas.style.cursor = cursorFor(m);
    canvas.title = m ? txt(m.tip) : '';
  });
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; paint(); } });

  const snap = (tw: number, free: boolean): number => {
    if (free || !model) return Math.round(tw);
    const st = rulerStep(model.unit);
    return Math.round(model.zero + Math.round((tw - model.zero) / st) * st);
  };
  const clamp = (m: RulerMarker, v: number): number => Math.max(m.min ?? -Infinity, Math.min(m.max ?? Infinity, v));

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !model || model.readOnly) return;
    e.preventDefault();
    const { a, c } = axis(e);
    let m = markerAt(a, c);
    let provisional: RulerTabKind | undefined;
    const tw = toTw(a);
    if (!m) {
      // área do texto: tabulação nova (ou o recuo escolhido no seletor) já em arrasto
      const ta = model.textArea;
      if (!horiz || !ta || tw < ta[0] || tw > ta[1] || !opts.onAddTab) return;
      if (selector === 'first-line' || selector === 'hanging') {
        const target = model.markers.find((x) => x.kind === selector);
        if (!target) return;
        m = target;
      } else {
        provisional = selector;
        m = { id: '__new', kind: `tab-${selector}`, pos: snap(tw, e.altKey), removable: true, min: ta[0], max: ta[1] };
      }
    }
    const base = new Map<string, number>();
    for (const id of m.group ?? []) { const g = model.markers.find((x) => x.id === id); if (g) base.set(id, g.pos); }
    const startPos = provisional ? m.pos : m.pos;
    drag = { m, start: startPos, pos: provisional || m.kind === 'first-line' || m.kind === 'hanging' ? clamp(m, snap(tw, e.altKey)) : m.pos, off: false, moved: !!provisional, base, provisional };
    if (!provisional && (m.kind === 'first-line' || m.kind === 'hanging') && Math.abs(drag.pos - m.pos) > 1) drag.moved = true;
    canvas.setPointerCapture(e.pointerId);
    opts.onDrag?.(m, drag.pos);
    paint();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || !model) return;
    const { a, c } = axis(e);
    const v = clamp(drag.m, snap(toTw(a), e.altKey));
    drag.off = !!drag.m.removable && (c < -OFF || c > thick() + OFF);
    if (v !== drag.pos) drag.moved = true;
    drag.pos = v;
    opts.onDrag?.(drag.off ? null : drag.m, v);
    paint();
  });

  const finish = (e: PointerEvent): void => {
    const d = drag;
    drag = null;
    if (pending !== undefined) { model = pending; pending = undefined; el.hidden = !model; }
    if (!d) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* já solto */ }
    opts.onDrag?.(null, d.pos);
    paint();
    if (d.provisional) {
      if (!d.off) opts.onAddTab?.(d.provisional, d.pos);
      return;
    }
    if (d.off) { opts.onDrop?.(d.m, d.pos, true); return; }
    if (d.moved && d.pos !== d.m.pos) opts.onDrop?.(d.m, d.pos, false);
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', (e) => { drag = null; opts.onDrag?.(null, 0); paint(); void e; });

  canvas.addEventListener('dblclick', (e) => {
    if (!model || !opts.onDblClick) return;
    const { a, c } = axis(e);
    const m = markerAt(a, c);
    const tw = toTw(a);
    if (m) { opts.onDblClick(m, tw); return; }
    const inShade = model.shaded.some(([x, y]) => tw >= x && tw <= y) || tw < 0 || tw > model.length;
    opts.onDblClick(inShade ? 'margin' : 'track', tw);
  });

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint()) : null;
  ro?.observe(canvas);
  paintSelector();

  return {
    el,
    get selector() { return selector; },
    update(m) {
      // durante o arrasto o modelo não troca (o app relê depois de soltar)
      if (drag) { pending = m; return; }
      model = m;
      el.hidden = !m;
      paint();
    },
    destroy() { ro?.disconnect(); el.remove(); },
  };
}
