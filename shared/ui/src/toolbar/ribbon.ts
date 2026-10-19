// RIBBON, estilo Word: barra de acesso rápido + título, guias (Arquivo abre
// um menu; guias contextuais aparecem com o predicado e ganham o foco ao
// surgir), grupos com rótulo e iniciador de diálogo (↘). Sem largura, os
// grupos de menor prioridade recolhem num botão com o rótulo do grupo
// (mesmo motor da barra compacta).
import { planCollapse } from './collapse.js';
import { symbol } from './icons.js';
import { esc, renderItem, ripple, toggleMenu, type RenderedItem } from './items.js';
import { closeMenus, isMenuOpenFor } from './menu.js';
import { closePopover, isPopoverOpenFor, openPopover } from './popover.js';
import type { BarContext, BarHandle, BarGroup, RibbonCell, RibbonConfig, RibbonTab } from './types.js';

const L_COLLAPSE = { en: 'Collapse the ribbon', pt: 'Recolher a faixa de opções' };
const L_EXPAND = { en: 'Expand the ribbon', pt: 'Expandir a faixa de opções' };
const L_MORE = { en: 'More', pt: 'Mais' };
const TRIG_W = 64, MORE_W = 56, PAD = 12;

interface GroupState {
  def: BarGroup;
  el: HTMLElement;
  items: RenderedItem[];
  width: number;
  visible: boolean;
}
interface TabState {
  def: RibbonTab;
  btn: HTMLButtonElement;
  panel: HTMLElement;
  stash: HTMLElement;
  groups: GroupState[];
  measured: boolean;
  visible: boolean;
}

function renderGroup(def: BarGroup, ctx: BarContext): GroupState {
  const reg = ctx.registry;
  const el = document.createElement('div');
  el.className = 'uo-rgroup';
  el.dataset['g'] = def.id;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', reg.text(def.label));
  const body = document.createElement('div');
  body.className = 'uo-rgroup-body';
  const items: RenderedItem[] = [];
  const cells: RibbonCell[] = def.cells ?? (def.items ? [{ rows: [def.items] }] : []);
  for (const cell of cells) {
    if (typeof cell === 'object' && 'rows' in cell) {
      const col = document.createElement('div');
      col.className = 'uo-rcol';
      for (const r of cell.rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'uo-rrow';
        for (const it of r) {
          const x = renderItem(it, ctx, 'small');
          rowEl.appendChild(x.el);
          items.push(x);
        }
        col.appendChild(rowEl);
      }
      body.appendChild(col);
    } else {
      const x = renderItem(cell, ctx, 'large');
      body.appendChild(x.el);
      items.push(x);
    }
  }
  const foot = document.createElement('div');
  foot.className = 'uo-rgroup-foot';
  foot.innerHTML = `<span class="uo-rgroup-lbl">${esc(reg.text(def.label))}</span>`;
  if (def.launcher) {
    const id = def.launcher;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-btn uo-launcher';
    b.dataset['a'] = id;
    b.title = reg.tooltip(id);
    b.innerHTML = symbol('south_east');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { void reg.run(id); });
    foot.appendChild(b);
    items.push({
      el: b,
      visible: () => false, // o iniciador sozinho não mantém o grupo visível
      sync: () => { b.hidden = !reg.supported(id); b.disabled = !reg.enabled(id); },
    });
  }
  el.append(body, foot);
  return { def, el, items, width: 0, visible: true };
}

export function createRibbon(container: HTMLElement, cfg: RibbonConfig, ctx: BarContext): BarHandle {
  const reg = ctx.registry;
  const root = document.createElement('div');
  root.className = 'uo-bar uo-ribbon';
  root.setAttribute('part', 'toolbar');

  const titlebar = document.createElement('div');
  titlebar.className = 'uo-titlebar';
  titlebar.setAttribute('part', 'titlebar');
  const synced: RenderedItem[] = [];
  const qat = document.createElement('div');
  qat.className = 'uo-qat';
  for (const it of cfg.qat ?? []) {
    const r = renderItem(it, ctx);
    qat.appendChild(r.el);
    synced.push(r);
  }
  titlebar.appendChild(qat);
  if (cfg.title) {
    const t = renderItem(cfg.title, ctx);
    t.el.classList.add('uo-title');
    titlebar.appendChild(t.el);
    synced.push(t);
  }
  const sp = document.createElement('span');
  sp.className = 'uo-spacer';
  titlebar.appendChild(sp);
  for (const it of cfg.trailing ?? []) {
    const r = renderItem(it, ctx);
    titlebar.appendChild(r.el);
    synced.push(r);
  }

  const tabsEl = document.createElement('div');
  tabsEl.className = 'uo-tabs';
  tabsEl.setAttribute('role', 'tablist');
  tabsEl.setAttribute('part', 'tabs');
  const tabScroller = document.createElement('div');
  tabScroller.className = 'uo-tabs-scroll';
  tabsEl.appendChild(tabScroller);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'uo-btn uo-ribbon-toggle';
  toggle.dataset['a'] = 'ribbon-toggle';
  toggle.addEventListener('mousedown', (e) => e.preventDefault());
  tabsEl.appendChild(toggle);

  const body = document.createElement('div');
  body.className = 'uo-ribbon-body';
  body.setAttribute('part', 'ribbon');
  root.append(titlebar, tabsEl, body);
  container.appendChild(root);

  let active: TabState | null = null;
  let collapsed = false;
  const setCollapsed = (v: boolean): void => {
    collapsed = v;
    root.classList.toggle('uo-collapsed', v);
    toggle.innerHTML = symbol(v ? 'keyboard_arrow_down' : 'keyboard_arrow_up');
    toggle.title = reg.text(v ? L_EXPAND : L_COLLAPSE);
    if (!v) schedule();
  };
  toggle.addEventListener('click', () => setCollapsed(!collapsed));

  const tabs: TabState[] = cfg.tabs.map((def) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `uo-tab${def.contextual ? ' uo-tab-ctx' : ''}${def.menu ? ' uo-tab-file' : ''}`;
    btn.dataset['tab'] = def.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = reg.text(def.label);
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    ripple(btn);
    tabScroller.appendChild(btn);
    const panel = document.createElement('div');
    panel.className = 'uo-rpanel';
    panel.dataset['tab'] = def.id;
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = true;
    const stash = document.createElement('div');
    stash.hidden = true;
    body.append(panel, stash);
    const groups = def.groups.map((g) => renderGroup(g, ctx));
    for (const g of groups) panel.appendChild(g.el);
    const st: TabState = { def, btn, panel, stash, groups, measured: false, visible: true };
    btn.addEventListener('click', (e) => {
      if (def.menu) {
        e.stopPropagation();
        if (isMenuOpenFor(btn)) { closeMenus(); return; }
        toggleMenu(btn, def.menu, ctx, e.detail === 0);
        return;
      }
      if (collapsed) setCollapsed(false);
      select(st);
    });
    return st;
  });

  const select = (t: TabState): void => {
    if (active === t) return;
    closePopover();
    for (const x of tabs) {
      const on = x === t;
      x.btn.classList.toggle('uo-on', on);
      x.btn.setAttribute('aria-selected', String(on));
      x.panel.hidden = !on;
    }
    active = t;
    schedule();
  };

  const makeTrigger = (t: TabState, g: GroupState): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-btn uo-btn-lg uo-btn-lbl uo-rtrig';
    b.dataset['g'] = g.def.id;
    b.title = reg.text(g.def.label);
    b.innerHTML = symbol(g.def.icon ?? 'more_horiz') + `<span class="uo-lbl">${esc(reg.text(g.def.label))}</span>`
      + `<span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) { closePopover(); return; }
      openPopover(b, [{ el: g.el, label: '', home: t.stash }], ctx.layer);
    });
    ripple(b);
    return b;
  };
  const makeMore = (t: TabState, gs: GroupState[]): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-btn uo-btn-lg uo-btn-lbl uo-rtrig';
    b.dataset['a'] = 'more';
    b.title = reg.text(L_MORE);
    b.innerHTML = symbol('more_horiz') + `<span class="uo-lbl">${esc(reg.text(L_MORE))}</span>`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) { closePopover(); return; }
      openPopover(b, gs.map((g) => ({ el: g.el, label: reg.text(g.def.label), home: t.stash })), ctx.layer);
    });
    ripple(b);
    return b;
  };

  const relayout = (): void => {
    const t = active;
    if (!t || !root.isConnected || collapsed || t.panel.clientWidth === 0) return;
    closePopover();
    const vis = t.groups.filter((g) => g.visible);
    if (!t.measured || vis.some((g) => g.width === 0)) {
      for (const g of vis) t.panel.appendChild(g.el);
      t.panel.querySelectorAll(':scope > .uo-rtrig').forEach((e) => e.remove());
      for (const g of vis) g.width = g.el.getBoundingClientRect().width + 2;
      t.measured = true;
    }
    t.panel.querySelectorAll(':scope > .uo-rtrig').forEach((e) => e.remove());
    const plan = planCollapse(vis.map((g) => ({ prio: g.def.prio ?? 5, width: g.width })),
      t.panel.clientWidth - PAD, { trigW: TRIG_W, moreW: MORE_W });
    for (const g of t.groups) t.stash.appendChild(g.el);
    // ordem original: grupos inline e gatilhos intercalados como no Word
    const inline = new Set(plan.inline), trig = new Set(plan.triggers);
    vis.forEach((g, i) => {
      if (inline.has(i)) t.panel.appendChild(g.el);
      else if (trig.has(i)) t.panel.appendChild(makeTrigger(t, g));
    });
    if (plan.more.length) t.panel.appendChild(makeMore(t, plan.more.map((i) => vis[i]!)));
  };

  let raf = 0;
  const schedule = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; relayout(); });
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(body);
  void document.fonts?.ready.then(() => { for (const t of tabs) t.measured = false; schedule(); });

  const sync = (): void => {
    for (const r of synced) r.sync();
    let surfaced: TabState | null = null;
    for (const t of tabs) {
      let changed = false;
      for (const g of t.groups) {
        for (const r of g.items) r.sync();
        const v = g.items.some((r) => r.visible());
        g.el.hidden = !v;
        if (v !== g.visible) { g.visible = v; changed = true; }
      }
      if (changed) t.measured = false;
      const ctxOk = t.def.contextual ? !!t.def.contextual() : true;
      const v = ctxOk && (!!t.def.menu || t.groups.some((g) => g.visible));
      if (v && !t.visible && t.def.contextual) surfaced = t;
      t.visible = v;
      t.btn.hidden = !v;
      if (changed && t === active) schedule();
    }
    // guia contextual que acabou de surgir ganha o foco (como no Word);
    // a ativa que sumiu devolve para a 1ª guia normal
    if (surfaced) select(surfaced);
    else if (active && !active.visible) select(tabs.find((t) => t.visible && !t.def.menu && !t.def.contextual)!);
  };

  setCollapsed(false);
  sync();
  select(tabs.find((t) => t.visible && !t.def.menu) ?? tabs[0]!);
  relayout();

  return {
    el: root,
    sync,
    relayout: () => { for (const t of tabs) t.measured = false; relayout(); },
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    },
  };
}
