// Personalização das barras pelo hospedeiro: OCULTAR ids (comandos, menus,
// grupos, guias e controles — o `removeItems` do CKEditor / `removed_menuitems`
// do TinyMCE) e ESTENDER com contribuições de plugins (o `modules.toolbar` do
// Quill). Funções puras sobre as configurações declarativas: o componente as
// aplica antes de desenhar a barra. Comandos ocultos também saem dos menus e
// atalhos pelo CommandRegistry.hide (aqui só a estrutura da barra).
import type {
  BarContribution, BarGroup, BarItem, CompactConfig, CompactMenu, Placed, RibbonCell, RibbonConfig, RibbonTab,
} from './types.js';

/** Id de um item de barra (o que `hidden` compara). */
export function barItemId(item: BarItem): string | undefined {
  if (typeof item === 'string') return item;
  if ('cmd' in item) return item.cmd;
  if ('split' in item) return item.split;
  if ('gallery' in item) return item.gallery.id;
  if ('widget' in item) return item.id;
  return item.id;
}

const keep = (hidden: ReadonlySet<string>) => (item: BarItem): boolean => {
  const id = barItemId(item);
  return id === undefined || !hidden.has(id);
};

function hideItems(items: readonly BarItem[], hidden: ReadonlySet<string>): BarItem[] {
  return items.filter(keep(hidden));
}

function hideCells(cells: readonly RibbonCell[], hidden: ReadonlySet<string>): RibbonCell[] {
  const out: RibbonCell[] = [];
  for (const cell of cells) {
    if (typeof cell === 'object' && 'rows' in cell) {
      const rows = cell.rows.map((r) => hideItems(r, hidden)).filter((r) => r.length > 0);
      if (rows.length) out.push({ rows });
    } else if (keep(hidden)(cell)) out.push(cell);
  }
  return out;
}

function hideGroup(g: BarGroup, hidden: ReadonlySet<string>): BarGroup {
  return {
    ...g,
    ...(g.items ? { items: hideItems(g.items, hidden) } : {}),
    ...(g.cells ? { cells: hideCells(g.cells, hidden) } : {}),
    ...(g.launcher && hidden.has(g.launcher) ? { launcher: undefined } : {}),
  };
}

/** Grupo que tinha itens/células e ficou sem nenhum: sai inteiro (não sobra só o rótulo). */
const emptied = (before: BarGroup, after: BarGroup): boolean =>
  ((before.items?.length ?? 0) > 0 || (before.cells?.length ?? 0) > 0)
  && !(after.items?.length ?? 0) && !(after.cells?.length ?? 0);

function hideGroups(groups: readonly BarGroup[], hidden: ReadonlySet<string>): BarGroup[] {
  const out: BarGroup[] = [];
  for (const g of groups) {
    if (hidden.has(g.id)) continue;
    const h = hideGroup(g, hidden);
    if (!emptied(g, h)) out.push(h);
  }
  return out;
}

/** Barra compacta sem os ids ocultos (menus, grupos, itens, título e direita). Grupo
 *  que fica vazio sai. */
export function hideInCompact(cfg: CompactConfig, hidden: ReadonlySet<string>): CompactConfig {
  if (!hidden.size) return cfg;
  const out: CompactConfig = {
    ...cfg,
    menus: cfg.menus.filter((m) => !hidden.has(m.id)),
    groups: hideGroups(cfg.groups, hidden),
  };
  if (cfg.trailing) out.trailing = hideItems(cfg.trailing, hidden);
  if (cfg.title && !keep(hidden)(cfg.title)) delete out.title;
  if (cfg.leading && !keep(hidden)(cfg.leading)) delete out.leading;
  return out;
}

/** Ribbon sem os ids ocultos (guias, grupos, células, acesso rápido e título). Grupo
 *  que fica vazio sai; guia cujos grupos todos saíram também (a de menu, como Arquivo, fica). */
export function hideInRibbon(cfg: RibbonConfig, hidden: ReadonlySet<string>): RibbonConfig {
  if (!hidden.size) return cfg;
  const out: RibbonConfig = {
    ...cfg,
    tabs: cfg.tabs.flatMap((t): RibbonTab[] => {
      if (hidden.has(t.id)) return [];
      const groups = hideGroups(t.groups, hidden);
      return groups.length || !t.groups.length ? [{ ...t, groups }] : [];
    }),
  };
  if (cfg.qat) out.qat = hideItems(cfg.qat, hidden);
  if (cfg.trailing) out.trailing = hideItems(cfg.trailing, hidden);
  if (cfg.title && !keep(hidden)(cfg.title)) delete out.title;
  return out;
}

/** Insere `added` antes do irmão `before` (ou no fim), sem levar o `before`. */
function place<T extends { id: string }>(list: readonly T[], added: readonly Placed<T>[]): T[] {
  const out = [...list];
  for (const a of added) {
    const { before, ...item } = a;
    const at = before === undefined ? -1 : out.findIndex((x) => x.id === before);
    if (at < 0) out.push(item as unknown as T);
    else out.splice(at, 0, item as unknown as T);
  }
  return out;
}

/** Barra compacta com as contribuições (na ordem em que chegaram; `title`, `leading`
 *  e `titlePlacement` substituem os anteriores). */
export function extendCompact(cfg: CompactConfig, contributions: readonly BarContribution[]): CompactConfig {
  let menus: CompactMenu[] = cfg.menus;
  let groups: BarGroup[] = cfg.groups;
  let trailing: BarItem[] | undefined = cfg.trailing;
  let title: BarItem | undefined = cfg.title;
  let leading: BarItem | undefined = cfg.leading;
  let titlePlacement = cfg.titlePlacement;
  for (const c of contributions) {
    if (!c.compact) continue;
    if (c.compact.title) title = c.compact.title;
    if (c.compact.leading) leading = c.compact.leading;
    if (c.compact.titlePlacement) titlePlacement = c.compact.titlePlacement;
    if (c.compact.menus?.length) menus = place(menus, c.compact.menus);
    if (c.compact.groups?.length) groups = place(groups, c.compact.groups);
    if (c.compact.trailing?.length) trailing = [...(trailing ?? []), ...c.compact.trailing];
  }
  return {
    ...cfg, menus, groups, ...(trailing ? { trailing } : {}), ...(title ? { title } : {}),
    ...(leading ? { leading } : {}), ...(titlePlacement ? { titlePlacement } : {}),
  };
}

/** Ribbon com as contribuições: título, guias novas, grupos em guias existentes e acesso rápido. */
export function extendRibbon(cfg: RibbonConfig, contributions: readonly BarContribution[]): RibbonConfig {
  let tabs: RibbonTab[] = cfg.tabs;
  let qat: BarItem[] | undefined = cfg.qat;
  let title: BarItem | undefined = cfg.title;
  for (const c of contributions) {
    if (!c.ribbon) continue;
    if (c.ribbon.title) title = c.ribbon.title;
    if (c.ribbon.tabs?.length) tabs = place(tabs, c.ribbon.tabs);
    for (const g of c.ribbon.groups ?? []) {
      const { tab, ...group } = g;
      const i = tabs.findIndex((t) => t.id === tab);
      if (i < 0) continue;
      tabs = tabs.map((t, k) => (k === i ? { ...t, groups: place(t.groups, [group]) } : t));
    }
    if (c.ribbon.qat?.length) qat = [...(qat ?? []), ...c.ribbon.qat];
  }
  return { ...cfg, tabs, ...(qat ? { qat } : {}), ...(title ? { title } : {}) };
}
