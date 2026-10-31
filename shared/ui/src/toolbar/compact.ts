// Barra COMPACTA, estilo Google Docs: linha de menus (Arquivo, Editar, Ver…)
// e uma linha de ferramentas que recolhe por prioridade (motor do demo do
// Write — data-prio, ResizeObserver, "⋮" — agora escopado ao container, que
// pode estar num shadow root). Com pouca largura a barra de menus vira "☰".
// Com título, o padrão é `titlePlacement: 'above-menus'`: o título numa linha acima
// dos menus, com o `leading` à esquerda e o `trailing` à direita ocupando as duas
// linhas; `inline` põe tudo na linha dos menus.
import { planCollapse } from './collapse.js';
import { symbol } from './icons.js';
import { renderItem, ripple, titleClass, toggleMenu, type RenderedItem } from './items.js';
import { closeMenus, isMenuOpen, isMenuOpenFor, openMenu } from './menu.js';
import { closePopover, isPopoverOpenFor, openPopover } from './popover.js';
import { createNoticeRegion } from './notice.js';
import type { BarContext, BarGroup, BarHandle, CompactConfig, MenuItem } from './types.js';

const MORE_LABEL = { en: 'More tools', pt: 'Mais ferramentas', es: 'Más herramientas' };
const MENU_LABEL = { en: 'Menu', pt: 'Menu', es: 'Menú' };
const TRIG_W = 50, MORE_W = 46, PAD = 16;
/** Abaixo desta largura (px) a barra vira a de celular: ☰, título e ações numa
 *  linha só, e as ferramentas no `dock` do contexto (classe `uo-narrow`). */
export const COMPACT_NARROW_WIDTH = 600;

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
  const stacked = cfg.titlePlacement === 'above-menus' || (cfg.titlePlacement === undefined && cfg.title !== undefined);
  if (stacked) root.classList.add('uo-title-above');
  const titlebar = document.createElement('div');
  titlebar.className = stacked ? 'uo-titlebar uo-stacked' : 'uo-titlebar';
  titlebar.setAttribute('part', 'titlebar');
  const synced: RenderedItem[] = [];
  let leadingEl: HTMLElement | null = null;
  if (cfg.leading) {
    const l = renderItem(cfg.leading, ctx);
    leadingEl = document.createElement('div');
    leadingEl.className = 'uo-leading';
    leadingEl.setAttribute('part', 'leading');
    leadingEl.appendChild(l.el);
    synced.push(l);
  }
  let titleEl: HTMLElement | null = null;
  if (cfg.title) {
    const t = renderItem(cfg.title, ctx);
    const cls = titleClass(t.el);
    if (cls) t.el.classList.add(cls);
    titleEl = t.el;
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
  const trailingEls = (cfg.trailing ?? []).map((t) => {
    const r = renderItem(t, ctx);
    synced.push(r);
    return r.el;
  });
  if (stacked) {
    // [leading] [título / menus] [trailing]: as pontas ocupam as duas linhas
    const titleRow = document.createElement('div');
    titleRow.className = 'uo-title-row';
    titleRow.setAttribute('part', 'title-row');
    if (titleEl) titleRow.appendChild(titleEl);
    const menuRow = document.createElement('div');
    menuRow.className = 'uo-menu-row';
    menuRow.setAttribute('part', 'menu-row');
    menuRow.append(burger, menubar);
    const main = document.createElement('div');
    main.className = 'uo-titlebar-main';
    main.append(titleRow, menuRow);
    const trailing = document.createElement('div');
    trailing.className = 'uo-trailing';
    trailing.setAttribute('part', 'trailing');
    trailing.append(...trailingEls);
    if (leadingEl) titlebar.appendChild(leadingEl);
    titlebar.append(main, trailing);
  } else {
    if (leadingEl) titlebar.appendChild(leadingEl);
    if (titleEl) titlebar.appendChild(titleEl);
    titlebar.append(burger, menubar);
    const spacer = document.createElement('span');
    spacer.className = 'uo-spacer';
    titlebar.append(spacer, ...trailingEls);
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
  const notice = createNoticeRegion();
  root.append(titlebar, notice.el, row);
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
  const placeRow = (narrow: boolean): void => {
    root.classList.toggle('uo-narrow', narrow);
    const home = narrow && ctx.dock ? ctx.dock : root;
    row.classList.toggle('uo-docked', home !== root);
    if (row.parentElement === home) return;
    if (home === root) root.appendChild(row); else home.prepend(row);
  };
  const relayout = (): void => {
    if (!root.isConnected) return;
    const narrow = root.clientWidth > 0 && root.clientWidth < COMPACT_NARROW_WIDTH;
    placeRow(narrow);
    if (toolbar.clientWidth === 0) return;
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

    // barra de menus: não coube (ou celular) → "☰"
    burger.hidden = true;
    menubar.hidden = false;
    if (narrow || menubar.scrollWidth > menubar.clientWidth + 1) { menubar.hidden = true; burger.hidden = false; }
    // celular: os menus moram no "⋮" da ponta direita, como nos apps do Google
    const icon = narrow ? 'more_vert' : 'menu';
    if (burger.dataset['icon'] !== icon) { burger.dataset['icon'] = icon; burger.innerHTML = symbol(icon); }
  };

  let raf = 0;
  const schedule = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; relayout(); });
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(root);
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
    setNotice: notice.set,
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      row.remove();
      root.remove();
    },
  };
}
