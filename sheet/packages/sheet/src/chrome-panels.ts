// Partes fixas das barras do Sheet: a BARRA DE FÓRMULAS (Caixa de Nome, fx e a
// fórmula da célula ativa, com o autocompletar de funções), as GUIAS das
// planilhas e a BARRA DE STATUS (soma/média/contagem da seleção e zoom), como
// no Excel.
import { pickLabels, renderItem, ripple, symbol, toggleMenu, type BarContext, type MenuItem, type RenderedItem } from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import type { SheetApp } from './chrome-app.js';
import { ZOOMS } from './chrome-commands.js';
import { ICONS } from './chrome-icons.js';

const T = {
  en: { nameBox: 'Name Box', fx: 'Insert function', formula: 'Formula bar', cancel: 'Cancel', enter: 'Enter', sheets: 'Sheets', zoom: 'Zoom' },
  pt: { nameBox: 'Caixa de Nome', fx: 'Inserir função', formula: 'Barra de fórmulas', cancel: 'Cancelar', enter: 'Inserir', sheets: 'Planilhas', zoom: 'Zoom' },
  es: { nameBox: 'Cuadro de nombres', fx: 'Insertar función', formula: 'Barra de fórmulas', cancel: 'Cancelar', enter: 'Introducir', sheets: 'Hojas', zoom: 'Zoom' },
};

function iconButton(cls: string, id: string, title: string, icon: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.dataset['a'] = id;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = symbol(icon);
  b.addEventListener('mousedown', (e) => e.preventDefault());
  ripple(b);
  return b;
}

/** Barra de fórmulas: Caixa de Nome (vai para a referência digitada) + fx + entrada da célula ativa. */
export class FormulaBar {
  readonly el: HTMLElement;
  private readonly name: HTMLInputElement;
  private readonly input: HTMLInputElement;
  private readonly detachAc: () => void;
  private ghost = false;

  constructor(private readonly sheet: UniversalSheetElement, ctx: BarContext, flash: (m: string) => void, invalidRef: (r: string) => string) {
    const L = pickLabels(ctx.lang, T);
    this.el = document.createElement('div');
    this.el.className = 'us-formula';
    this.el.setAttribute('part', 'formula-bar');
    this.name = document.createElement('input');
    this.name.className = 'us-namebox';
    this.name.dataset['a'] = 'namebox';
    this.name.spellcheck = false;
    this.name.title = L.nameBox;
    this.name.setAttribute('aria-label', L.nameBox);
    this.name.addEventListener('focus', () => this.name.select());
    this.name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const ref = this.name.value.trim();
        try { sheet.selectRange(ref); sheet.focus(); } catch { flash(invalidRef(ref)); }
      } else if (e.key === 'Escape') { e.preventDefault(); this.sync(true); sheet.focus(); }
    });
    const sep = document.createElement('span');
    sep.className = 'us-formula-sep';
    const fx = iconButton('uo-btn us-fx-btn', 'fx', L.fx, ICONS.fx);
    fx.addEventListener('click', () => { void ctx.registry.run('function'); });
    this.input = document.createElement('input');
    this.input.className = 'us-fx';
    this.input.dataset['a'] = 'formula';
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', L.formula);
    this.input.addEventListener('focus', () => {
      // célula derramada: editar começa vazio (a fórmula cinza é a da âncora)
      if (this.ghost) { this.input.value = ''; this.ghost = false; this.input.classList.remove('us-ghost'); }
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = sheet.setActiveCellText(this.input.value);
        if (r.ok) { sheet.focus(); ctx.after(); } else flash(`⚠ ${r.message}`);
      } else if (e.key === 'Escape') { e.preventDefault(); this.sync(true); sheet.focus(); }
    });
    this.detachAc = sheet.attachFormulaBar(this.input);
    this.el.append(this.name, sep, fx, this.input);
  }

  sync(force = false): void {
    const root = this.el.getRootNode() as ShadowRoot | Document;
    const active = 'activeElement' in root ? root.activeElement : null;
    const sel = this.sheet.getSheetNames().length ? this.sheet.getSelection() : null;
    if (force || active !== this.name) this.name.value = sel ? sel.range : '';
    if (force || active !== this.input) {
      const d = this.sheet.activeCellBarText();
      this.ghost = d.ghost;
      this.input.value = d.ghost ? d.formula : d.edit;
      this.input.classList.toggle('us-ghost', d.ghost);
    }
    this.input.disabled = !sel;
    this.name.disabled = !sel;
  }

  destroy(): void { this.detachAc(); this.el.remove(); }
}

/** Guias das planilhas (+ Inserir planilha), como a faixa de abas do Excel. */
export class SheetTabs {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private readonly add: RenderedItem;
  private names = '';
  private active = -1;

  constructor(private readonly sheet: UniversalSheetElement, ctx: BarContext) {
    this.el = document.createElement('div');
    this.el.className = 'us-tabs-row';
    this.el.setAttribute('part', 'sheet-tabs');
    this.el.setAttribute('role', 'tablist');
    const prev = renderItem('sheet:prev', ctx);
    const next = renderItem('sheet:next', ctx);
    this.list = document.createElement('div');
    this.list.className = 'us-tabs';
    this.add = renderItem('sheet:insert', ctx);
    this.add.el.classList.add('us-tab-add');
    this.el.append(prev.el, next.el, this.list, this.add.el);
    this.items.push(prev, next, this.add);
  }

  private readonly items: RenderedItem[] = [];

  sync(): void {
    for (const r of this.items) r.sync();
    const names = this.sheet.getSheetNames();
    const key = names.join('\u0000');
    const active = this.sheet.activeSheet;
    if (key !== this.names) {
      this.names = key;
      this.list.replaceChildren(...names.map((n, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'us-tab';
        b.dataset['sheet'] = String(i);
        b.setAttribute('role', 'tab');
        b.textContent = n;
        b.title = n;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { this.sheet.selectSheet(i); this.sheet.focus(); });
        ripple(b);
        return b;
      }));
      this.active = -1;
    }
    if (active !== this.active) {
      this.active = active;
      this.list.querySelectorAll<HTMLElement>('.us-tab').forEach((b, i) => {
        b.classList.toggle('uo-on', i === active);
        b.setAttribute('aria-selected', String(i === active));
        if (i === active) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      });
    }
  }
}

/** Barra de status: mensagem, estatísticas da seleção (Média, Contagem, Soma) e zoom. */
export class StatusBar {
  readonly el: HTMLElement;
  private readonly status: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly items: RenderedItem[] = [];
  private flashTimer = 0;
  private flashing = false;

  constructor(private readonly sheet: UniversalSheetElement, private readonly app: SheetApp, ctx: BarContext) {
    const L = pickLabels(ctx.lang, T);
    this.el = document.createElement('div');
    this.el.className = 'us-status-bar';
    this.el.setAttribute('part', 'statusbar');
    this.status = document.createElement('span');
    this.status.className = 'us-status';
    this.status.dataset['a'] = 'status';
    this.status.setAttribute('role', 'status');
    const sp = document.createElement('span');
    sp.className = 'uo-spacer';
    this.stats = document.createElement('span');
    this.stats.className = 'us-stats';
    this.stats.dataset['a'] = 'stats';
    const zo = renderItem('zoomout', ctx);
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '40';
    this.slider.max = '300';
    this.slider.step = '5';
    this.slider.className = 'us-zoom-slider';
    this.slider.dataset['a'] = 'zoom:slider';
    this.slider.title = L.zoom;
    this.slider.addEventListener('input', () => sheet.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener('change', () => ctx.after());
    const zi = renderItem('zoomin', ctx);
    const pct = document.createElement('button');
    pct.type = 'button';
    pct.className = 'uo-btn us-zoom-pct';
    pct.dataset['a'] = 'zoom';
    pct.title = L.zoom;
    pct.addEventListener('mousedown', (e) => e.preventDefault());
    pct.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(pct, () => ZOOMS.map((z): MenuItem => ({
        label: `${z}%`, checked: Math.round(sheet.getZoom() * 100) === z,
        onClick: () => { sheet.setZoom(z / 100); ctx.after(); },
      })), ctx);
    });
    this.items.push(zo, zi, { el: pct, visible: () => true, sync: () => { pct.textContent = `${Math.round(sheet.getZoom() * 100)}%`; } });
    this.el.append(this.status, sp, this.stats, zo.el, this.slider, zi.el, pct);
  }

  flash(msg: string): void {
    window.clearTimeout(this.flashTimer);
    if (!msg) { this.flashing = false; this.sync(); return; }
    this.flashing = true;
    this.status.textContent = msg;
    this.flashTimer = window.setTimeout(() => { this.flashing = false; this.sync(); }, 2600);
  }

  sync(): void {
    const L = this.app.ui!.L;
    if (!this.flashing) this.status.textContent = this.sheet.getSheetNames().length ? L.ready : '';
    // como o Excel: com 2+ células selecionadas e alguma preenchida
    const s = this.sheet.getSheetNames().length ? this.sheet.selectionStats() : null;
    const parts: string[] = [];
    if (s && s.cells > 1 && s.count > 0) {
      if (s.average !== undefined) parts.push(`${L.average}: ${this.sheet.formatStat(s.average)}`);
      parts.push(`${L.count}: ${s.count}`);
      if (s.sum !== undefined) parts.push(`${L.sum}: ${this.sheet.formatStat(s.sum)}`);
    }
    const text = parts.join('    ');
    if (this.stats.textContent !== text) this.stats.textContent = text;
    for (const r of this.items) r.sync();
    const root = this.el.getRootNode() as ShadowRoot;
    if (root.activeElement !== this.slider) this.slider.value = String(Math.round(this.sheet.getZoom() * 100));
  }
}
