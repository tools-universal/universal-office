// Barra COMPACTA, estilo Google Docs: linha de menus (Arquivo, Editar, Ver…)
// e uma linha de ferramentas que recolhe por prioridade (motor do demo do
// Write — data-prio, ResizeObserver, "⋮" — agora escopado ao container, que
// pode estar num shadow root). Com pouca largura a barra de menus vira "☰".
import { planCollapse } from './collapse.js';
import { symbol } from './icons.js';
import { renderItem, ripple, toggleMenu, type RenderedItem } from './items.js';
import { closeMenus, isMenuOpen, isMenuOpenFor, openMenu } from './menu.js';
import { closePopover, isPopoverOpenFor, openPopover } from './popover.js';
import type { BarContext, BarGroup, BarHandle, CompactConfig, MenuItem } from './types.js';

const MORE_LABEL = { en: 'More tools', pt: 'Mais ferramentas' };
const MENU_LABEL = { en: 'Menu', pt: 'Menu' };
const TRIG_W = 50, MORE_W = 46, PAD = 16;

interface GroupState {
  def: BarGroup;
  el: HTMLElement;
  items: RenderedItem[];
  width: number;
  visible: boolean;
}

export function createCompactBar(container: HTMLElement, cfg: CompactConfig, ctx: BarContext): BarHandle {
  const reg = ctx.registry;
  const root = document.createElement('div');
  root.className = 'uo-bar uo-compact';
  root.setAttribute('part', 'toolbar');

  // ── linha de título + menus ──
  const titlebar = document.createElement('div');
  titlebar.className = 'uo-titlebar';
  titlebar.setAttribute('part', 'titlebar');
  const synced: RenderedItem[] = [];
  if (cfg.title) {
    const t = renderItem(cfg.title, ctx);
    t.el.classList.add('uo-title');
    titlebar.appendChild(t.el);
    synced.push(t);
  }
  const menubar = document.createElement('nav');
  menubar.className = 'uo-menubar';
  menubar.setAttribute('role', 'menubar');
  menubar.setAttribute('part', 'menubar');
  const mbtns: HTMLButtonElement[] = [];
  const openTop = (i: number, focus: boolean): void => {
    const b = mbtns[i]!;
    const m = cfg.menus[i]!;
    b.classList.add('uo-open');
    openMenu(m.items, { anchor: b }, {
      lang: ctx.lang, registry: reg, layer: ctx.layer, focus,
      onClose: () => b.classList.remove('uo-open'),
      onNavigate: (dir) => openTop((i + dir + mbtns.length) % mbtns.length, true),
    });
  };
  cfg.menus.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-mbtn';
    b.dataset['menu'] = m.id;
    b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-haspopup', 'menu');
    b.textContent = reg.text(m.label);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMenuOpenFor(b)) { closeMenus(); return; }
      openTop(i, e.detail === 0);
    });
    // com um menu da barra aberto, passar o mouse troca de menu
    b.addEventListener('mouseenter', () => {
      if (isMenuOpen() && mbtns.some((x) => isMenuOpenFor(x)) && !isMenuOpenFor(b)) openTop(i, false);
    });
    ripple(b);
    mbtns.push(b);
    menubar.appendChild(b);
  });
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'uo-btn uo-burger';
  burger.title = reg.text(MENU_LABEL);
  burger.dataset['a'] = 'menubar';
  burger.innerHTML = symbol('menu');
  burger.hidden = true;
  burger.addEventListener('mousedown', (e) => e.preventDefault());
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    const items: MenuItem[] = cfg.menus.map((m) => ({ label: m.label, submenu: m.items }));
    toggleMenu(burger, items, ctx, e.detail === 0);
  });
  titlebar.append(burger, menubar);
  const spacer = document.createElement('span');
  spacer.className = 'uo-spacer';
  titlebar.appendChild(spacer);
  for (const t of cfg.trailing ?? []) {
    const r = renderItem(t, ctx);
    titlebar.appendChild(r.el);
    synced.push(r);
  }

  // ── linha de ferramentas ──
  const row = document.createElement('div');
  row.className = 'uo-toolrow';
  row.setAttribute('part', 'toolrow');
  const toolbar = document.createElement('div');
  toolbar.className = 'uo-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  const stash = document.createElement('div');
  stash.hidden = true;
  row.append(toolbar, stash);
  root.append(titlebar, row);
  container.appendChild(root);

  const groups: GroupState[] = cfg.groups.map((def) => {
    const el = document.createElement('div');
    el.className = 'uo-g';
    el.dataset['g'] = def.id;
    const items = (def.items ?? []).map((it) => renderItem(it, ctx));
    for (const r of items) el.appendChild(r.el);
    return { def, el, items, width: 0, visible: true };
  });

  const syncGroups = (): boolean => {
    let changed = false;
    for (const g of groups) {
      for (const r of g.items) r.sync();
      const v = g.items.some((r) => r.visible());
      if (v !== g.visible) { g.visible = v; changed = true; }
    }
    return changed;
  };

  const remeasure = (): void => {
    for (const g of groups) if (g.visible) toolbar.appendChild(g.el);
    for (const g of groups) g.width = g.visible ? g.el.getBoundingClientRect().width + 14 : 0;
  };

  const makeTrigger = (g: GroupState): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-trig';
    b.dataset['g'] = g.def.id;
    b.title = reg.text(g.def.label);
    b.innerHTML = symbol(g.def.icon ?? 'more_horiz') + `<span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) { closePopover(); return; }
      openPopover(b, [{ el: g.el, label: reg.text(g.def.label), home: stash }], ctx.layer);
    });
    ripple(b);
    return b;
  };
  const makeMore = (gs: GroupState[]): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-trig uo-more';
    b.dataset['a'] = 'more';
    b.title = reg.text(MORE_LABEL);
    b.innerHTML = symbol('more_vert');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) { closePopover(); return; }
      openPopover(b, gs.map((g) => ({ el: g.el, label: reg.text(g.def.label), home: stash })), ctx.layer);
    });
    ripple(b);
    return b;
  };

  let measured = false;
  const relayout = (): void => {
    if (!root.isConnected || toolbar.clientWidth === 0) return;
    closePopover();
    if (!measured || groups.some((g) => g.visible && g.width === 0)) { remeasure(); measured = true; }
    toolbar.querySelectorAll(':scope > .uo-trig').forEach((e) => e.remove());
    const vis = groups.filter((g) => g.visible);
    const plan = planCollapse(vis.map((g) => ({ prio: g.def.prio ?? 5, width: g.width })),
      toolbar.clientWidth - PAD, { trigW: TRIG_W, moreW: MORE_W });
    for (const g of groups) stash.appendChild(g.el);
    for (const i of plan.inline) toolbar.appendChild(vis[i]!.el);
    for (const i of plan.triggers) toolbar.appendChild(makeTrigger(vis[i]!));
    if (plan.more.length) toolbar.appendChild(makeMore(plan.more.map((i) => vis[i]!)));
    toolbar.querySelector('.uo-first')?.classList.remove('uo-first');
    toolbar.firstElementChild?.classList.add('uo-first');

    // barra de menus: não coube → "☰"
    burger.hidden = true;
    menubar.hidden = false;
    if (menubar.scrollWidth > menubar.clientWidth + 1) { menubar.hidden = true; burger.hidden = false; }
  };

  let raf = 0;
  const schedule = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; relayout(); });
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(toolbar);
  ro.observe(titlebar);
  // fontes da página assentando mudam a largura dos grupos
  void document.fonts?.ready.then(() => { measured = false; schedule(); });

  const sync = (): void => {
    for (const r of synced) r.sync();
    if (syncGroups()) { measured = false; schedule(); }
  };
  syncGroups();
  sync();
  relayout();

  return {
    el: root,
    sync,
    relayout: () => { measured = false; relayout(); },
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    },
  };
}
