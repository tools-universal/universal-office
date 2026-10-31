// Régua do Write (Exibir > Régua): monta as duas réguas do framework
// (shared/ui, createRuler) sobre a geometria do <universal-write>
// (getRulerInfo) e traduz os arrastos para a API pública: recuos
// (setParagraphIndents), tabulações (setTabStops), margens (setPageSetup),
// colunas da seção (setColumns) e divisas da tabela (resizeTableColumn/Row).
// Duplo clique abre Configurar Página / Parágrafo / Tabulação, como no Word.
// A horizontal fica sob a barra (dentro dela, rola junto); a vertical, na
// borda esquerda da área do documento (fixa).
import { createRuler, type RulerHandle, type RulerMarker, type RulerModel, type UiLang } from '@universal-office/ui';
import type { RulerInfo, UniversalWriteElement } from './universal-write.js';

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });
const TIPS = {
  firstLine: L('First Line Indent', 'Recuo da Primeira Linha', 'Sangría de primera línea'),
  hanging: L('Hanging Indent', 'Recuo Deslocado', 'Sangría francesa'),
  left: L('Left Indent', 'Recuo à Esquerda', 'Sangría izquierda'),
  right: L('Right Indent', 'Recuo à Direita', 'Sangría derecha'),
  marginL: L('Left Margin', 'Margem Esquerda', 'Margen izquierdo'),
  marginR: L('Right Margin', 'Margem Direita', 'Margen derecho'),
  marginT: L('Top Margin', 'Margem Superior', 'Margen superior'),
  marginB: L('Bottom Margin', 'Margem Inferior', 'Margen inferior'),
  column: L('Move Column', 'Mover Coluna', 'Mover columna'),
  cell: L('Move Table Column', 'Mover Coluna da Tabela', 'Mover columna de tabla'),
  row: L('Adjust Table Row', 'Ajustar Linha da Tabela', 'Ajustar fila de tabla'),
  tab: {
    left: L('Left Tab', 'Tabulação Esquerda', 'Tabulación izquierda'), center: L('Center Tab', 'Tabulação Centralizada', 'Tabulación centrada'), right: L('Right Tab', 'Tabulação Direita', 'Tabulación derecha'),
    decimal: L('Decimal Tab', 'Tabulação Decimal', 'Tabulación decimal'), bar: L('Bar Tab', 'Barra de Tabulação', 'Tabulación de barra'),
  },
};

/** Largura mínima do texto entre as margens e de uma coluna (twips). */
const MIN_TEXT = 720;

export interface RulerEnv {
  ed: UniversalWriteElement;
  lang: UiLang;
  /** onde a régua horizontal entra (dentro da barra superior) */
  top: HTMLElement;
  /** camada flutuante (régua vertical e guia do arrasto) */
  layer: HTMLElement;
  /** área do documento entre as barras e os painéis da esquerda */
  frame: () => DOMRect;
  pageDialog(): void;
  paragraphDialog(): void;
  tabsDialog(): void;
}

export class RulerUI {
  private h: RulerHandle;
  private v: RulerHandle;
  private vbox: HTMLElement;
  private guide: HTMLElement;
  private info: RulerInfo | null = null;
  private raf = 0;
  on = false;

  constructor(private readonly env: RulerEnv) {
    this.h = createRuler({
      orientation: 'horizontal', lang: env.lang,
      onDrag: (m, pos) => this.showGuide('h', m, pos),
      onDrop: (m, pos, removed) => this.drop(m, pos, removed),
      onAddTab: (kind, pos) => this.addTab(kind, pos),
      onDblClick: (t) => this.dblClick(t),
    });
    this.h.el.classList.add('uw-hruler');
    this.v = createRuler({
      orientation: 'vertical', lang: env.lang, selector: false,
      onDrag: (m, pos) => this.showGuide('v', m, pos),
      onDrop: (m, pos, removed) => this.drop(m, pos, removed),
      onDblClick: (t) => this.dblClick(t),
    });
    this.vbox = document.createElement('div');
    this.vbox.className = 'uw-vruler';
    this.vbox.appendChild(this.v.el);
    this.guide = document.createElement('div');
    this.guide.className = 'uw-ruler-guide';
    this.guide.hidden = true;
    for (const el of [this.h.el, this.vbox]) el.addEventListener('mousedown', (e) => e.preventDefault());
  }

  /** Liga/desliga (Exibir > Régua). */
  show(on: boolean): void {
    this.on = on;
    if (on) {
      if (!this.h.el.isConnected) this.env.top.appendChild(this.h.el);
      if (!this.vbox.isConnected) this.env.layer.append(this.vbox, this.guide);
    } else {
      this.h.el.remove();
      this.vbox.remove();
      this.guide.remove();
      this.env.ed.classList.remove('uw-vruler-on');
    }
    this.schedule();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.h.destroy();
    this.v.destroy();
    this.vbox.remove();
    this.guide.remove();
    this.env.ed.classList.remove('uw-vruler-on');
  }

  schedule(): void {
    if (!this.on || this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
  }

  /** Canvas da página `pg` (layout de impressão) ou o 1º (visões contínuas). */
  private pageCanvas(pg: number): HTMLCanvasElement | null {
    const cs = this.env.ed.shadowRoot?.querySelectorAll<HTMLCanvasElement>('canvas.page');
    if (!cs?.length) return null;
    return cs[pg] ?? cs[0] ?? null;
  }

  render(): void {
    if (!this.on) return;
    const ed = this.env.ed;
    const info = ed.getRulerInfo();
    this.info = info;
    const view = ed.getView();
    // a régua vertical reserva a faixa dela antes de medir (as páginas andam)
    ed.classList.toggle('uw-vruler-on', !!info && view === 'print');
    const canvas = info ? this.pageCanvas(view === 'print' ? info.page : 0) : null;
    if (!info || !canvas) { this.h.update(null); this.v.update(null); this.vbox.hidden = true; ed.classList.remove('uw-vruler-on'); return; }
    const unit: 'cm' | 'in' = this.env.lang !== 'en' ? 'cm' : 'in';
    // o seletor de tabulação fica no canto, sobre a régua vertical (depois dos painéis da esquerda)
    const fr0 = this.env.frame();
    this.h.el.style.paddingLeft = `${Math.max(0, fr0.left - this.env.top.getBoundingClientRect().left)}px`;
    const pr = canvas.getBoundingClientRect();
    // ── horizontal ──
    const hc = this.h.el.querySelector<HTMLCanvasElement>('.uo-ruler-canvas')!.getBoundingClientRect();
    // px por twip pelo zoom (nas visões contínuas o canvas não tem a largura da página)
    const scale = (ed.getZoom() * 96) / 1440;
    const { frame, margins, indents, tabs } = info;
    // visões contínuas (Web/Rascunho): a faixa é a do canvas, o texto entre as bordas do quadro
    const W = view === 'print' ? info.pageWidthTwips : Math.round(pr.width / scale);
    const markers: RulerMarker[] = [];
    const inCell = info.where === 'cell';
    const shaded: [number, number][] = inCell || view !== 'print'
      ? [[0, frame.x0], [frame.x1, W]]
      : [[0, margins.left], [W - margins.right, W]];
    if (!inCell && info.columns.length > 1) {
      info.columns.forEach((c, i) => {
        const n = info.columns[i + 1];
        if (!n) return;
        shaded.push([c.x + c.w, n.x]);
        markers.push({ id: `col-${i}-r`, kind: 'column', pos: c.x + c.w, tip: TIPS.column, min: c.x + MIN_TEXT, max: n.x });
        markers.push({ id: `col-${i + 1}-l`, kind: 'column', pos: n.x, tip: TIPS.column, min: c.x + c.w, max: n.x + n.w - MIN_TEXT });
      });
    }
    if (!inCell && view === 'print') {
      markers.push({ id: 'm-left', kind: 'margin', pos: margins.left, tip: TIPS.marginL, min: 0, max: W - margins.right - MIN_TEXT });
      markers.push({ id: 'm-right', kind: 'margin', pos: W - margins.right, tip: TIPS.marginR, min: margins.left + MIN_TEXT, max: W });
    }
    if (info.table) {
      for (const c of info.table.cols) markers.push({ id: `cell-${c.boundary}`, kind: 'cell', pos: c.x, tip: TIPS.cell });
      const cs = info.table.cols;
      cs.forEach((c, i) => {
        const m = markers.find((x) => x.id === `cell-${c.boundary}`)!;
        m.min = i > 0 ? cs[i - 1]!.x + 100 : -Infinity;
        m.max = i < cs.length - 1 ? cs[i + 1]!.x - 100 : Infinity;
      });
    }
    const x0 = frame.x0, x1 = frame.x1;
    const left = x0 + indents.left;
    markers.push(
      { id: 'first-line', kind: 'first-line', pos: left + indents.firstLine, tip: TIPS.firstLine, min: 0, max: x1 - indents.right },
      { id: 'hanging', kind: 'hanging', pos: left, tip: TIPS.hanging, min: 0, max: x1 - indents.right, group: ['left-indent'] },
      { id: 'left-indent', kind: 'left-indent', pos: left, tip: TIPS.left, min: 0, max: x1 - indents.right, group: ['first-line', 'hanging'] },
      { id: 'right-indent', kind: 'right-indent', pos: x1 - indents.right, tip: TIPS.right, min: Math.max(left, left + indents.firstLine), max: W },
    );
    let lastTab = Math.max(0, indents.left);
    for (const t of tabs) {
      markers.push({ id: `tab-${t.pos}`, kind: `tab-${t.align}`, pos: x0 + t.pos, tip: TIPS.tab[t.align], removable: true, min: x0, max: x1 });
      lastTab = Math.max(lastTab, t.pos);
    }
    const dts: number[] = [];
    const dt = info.defaultTabTwips;
    if (dt > 0) for (let k = Math.floor(lastTab / dt) + 1, p = k * dt; x0 + p <= x1 && dts.length < 200; k++, p = k * dt) dts.push(x0 + p);
    const hm: RulerModel = {
      length: W, scale, offset: pr.left - hc.left, unit, zero: x0, shaded, textArea: [x0, x1],
      markers, defaultTabs: dts, readOnly: info.readOnly,
    };
    this.h.update(hm);
    // ── vertical (só no layout de impressão, como o Word) ──
    if (view !== 'print') { this.v.update(null); this.vbox.hidden = true; return; }
    const fr = this.env.frame();
    this.vbox.hidden = false;
    this.vbox.style.left = `${fr.left}px`;
    this.vbox.style.top = `${fr.top}px`;
    this.vbox.style.height = `${Math.max(0, fr.height)}px`;
    const vc = this.v.el.querySelector<HTMLCanvasElement>('.uo-ruler-canvas')!.getBoundingClientRect();
    const H = info.pageHeightTwips;
    const vs = scale;
    const vmarkers: RulerMarker[] = [
      { id: 'm-top', kind: 'margin', pos: margins.top, tip: TIPS.marginT, min: 0, max: H - margins.bottom - MIN_TEXT },
      { id: 'm-bottom', kind: 'margin', pos: H - margins.bottom, tip: TIPS.marginB, min: margins.top + MIN_TEXT, max: H },
    ];
    if (info.table) {
      for (const r of info.table.rows) vmarkers.push({ id: `row-${r.row}`, kind: 'row', pos: r.bottom, tip: TIPS.row, min: r.top + 100 });
    }
    this.v.update({
      length: H, scale: vs, offset: pr.top - vc.top, unit, zero: margins.top,
      shaded: [[0, margins.top], [H - margins.bottom, H]], markers: vmarkers, readOnly: info.readOnly,
    });
  }

  /** Guia tracejada sobre o documento enquanto arrasta (como o Word). */
  private showGuide(dir: 'h' | 'v', m: RulerMarker | null, pos: number): void {
    const info = this.info;
    const canvas = info ? this.pageCanvas(this.env.ed.getView() === 'print' ? info.page : 0) : null;
    if (!m || !info || !canvas) { this.guide.hidden = true; return; }
    const pr = canvas.getBoundingClientRect();
    const fr = this.env.frame();
    this.guide.hidden = false;
    this.guide.classList.toggle('uw-ruler-guide-v', dir === 'h');
    if (dir === 'h') {
      const x = pr.left + pos * ((this.env.ed.getZoom() * 96) / 1440);
      Object.assign(this.guide.style, { left: `${x}px`, top: `${fr.top}px`, width: '0px', height: `${fr.height}px` });
    } else {
      const y = pr.top + pos * ((this.env.ed.getZoom() * 96) / 1440);
      Object.assign(this.guide.style, { left: `${fr.left}px`, top: `${y}px`, width: `${fr.width}px`, height: '0px' });
    }
  }

  private drop(m: RulerMarker, pos: number, removed: boolean): void {
    const info = this.info;
    const ed = this.env.ed;
    if (!info) return;
    const { frame, indents, margins } = info;
    const left = frame.x0 + indents.left;
    const id = m.id;
    if (id.startsWith('tab-')) {
      const old = m.pos - frame.x0;
      const t = info.tabs.find((x) => x.pos === Math.round(old));
      if (removed) ed.setTabStops([], { remove: [old] });
      else if (t) ed.setTabStops([], { remove: [old], add: [{ ...t, pos: Math.round(pos - frame.x0) }] });
    } else if (id === 'first-line') ed.setParagraphIndents({ firstLine: Math.round(pos - left) });
    else if (id === 'hanging') ed.setParagraphIndents({ left: Math.round(pos - frame.x0), firstLine: Math.round(left + indents.firstLine - pos) });
    else if (id === 'left-indent') ed.setParagraphIndents({ left: Math.round(pos - frame.x0) });
    else if (id === 'right-indent') ed.setParagraphIndents({ right: Math.round(frame.x1 - pos) });
    else if (id.startsWith('m-')) {
      const W = info.pageWidthTwips, H = info.pageHeightTwips;
      const mm = { ...margins };
      if (id === 'm-left') mm.left = Math.round(pos);
      else if (id === 'm-right') mm.right = Math.round(W - pos);
      else if (id === 'm-top') mm.top = Math.round(pos);
      else if (id === 'm-bottom') mm.bottom = Math.round(H - pos);
      ed.setPageSetup({ customMargins: mm, applyTo: 'section' });
    } else if (id.startsWith('col-')) this.dropColumn(id, pos);
    else if (id.startsWith('cell-')) ed.resizeTableColumn(+id.slice(5), Math.round(pos - m.pos));
    else if (id.startsWith('row-')) ed.resizeTableRow(+id.slice(4), Math.round(pos - m.pos));
    this.render();
  }

  /** Borda do espaço entre colunas: colunas iguais mudam o espaço de todas;
   *  desiguais trocam largura com o espaço vizinho. */
  private dropColumn(id: string, pos: number): void {
    const info = this.info!;
    const sec = this.env.ed.getSection();
    if (!sec) return;
    const m = /^col-(\d+)-(l|r)$/.exec(id);
    if (!m) return;
    const i = +m[1]!, side = m[2]!;
    const cols = info.columns;
    const c = cols[i]!;
    const edge = side === 'r' ? c.x + c.w : c.x;
    const d = Math.round(pos - edge);
    if (!d) return;
    if (sec.columns.equalWidth) {
      const space = Math.max(0, sec.columns.spaceTwips - 2 * (side === 'r' ? d : -d));
      this.env.ed.setColumns({ count: sec.columns.count, spaceTwips: space, sep: sec.columns.sep, applyTo: 'section' });
      return;
    }
    const widths = sec.columns.widths.map((w) => ({ ...w }));
    if (side === 'r' && widths[i] && widths[i + 1] !== undefined) {
      widths[i]!.widthTwips += d;
      widths[i]!.spaceTwips = Math.max(0, widths[i]!.spaceTwips - d);
    } else if (side === 'l' && widths[i] && widths[i - 1]) {
      widths[i - 1]!.spaceTwips = Math.max(0, widths[i - 1]!.spaceTwips + d);
      widths[i]!.widthTwips -= d;
    }
    this.env.ed.setColumns({ count: sec.columns.count, widths, sep: sec.columns.sep, applyTo: 'section' });
  }

  private addTab(kind: 'left' | 'center' | 'right' | 'decimal' | 'bar', pos: number): void {
    const info = this.info;
    if (!info) return;
    this.env.ed.setTabStops([], { add: [{ pos: Math.round(pos - info.frame.x0), align: kind }] });
    this.render();
  }

  private dblClick(t: RulerMarker | 'margin' | 'track'): void {
    if (t === 'margin') { this.env.pageDialog(); return; }
    if (t === 'track') { this.env.tabsDialog(); return; }
    if (t.kind.startsWith('tab-')) this.env.tabsDialog();
    else if (t.kind === 'margin' || t.kind === 'column') this.env.pageDialog();
    else if (t.kind === 'first-line' || t.kind === 'hanging' || t.kind === 'left-indent' || t.kind === 'right-indent') this.env.paragraphDialog();
  }
}
