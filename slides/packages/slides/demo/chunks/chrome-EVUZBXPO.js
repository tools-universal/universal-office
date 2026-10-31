import {
  COMMON_FONTS,
  DEFAULT_UI_LANG,
  FontResolver,
  INSERTABLE_SHAPES,
  TRANSITION_TYPES,
  evalPreset,
  pickLabels,
  uiDecimal,
  uiLocale
} from "./chunk-XDXP5RH3.js";

// ../../../shared/ui/src/font-embedding-dialog.ts
var LABELS = {
  en: {
    and: "and",
    title: "Fonts in the file",
    embed: "Embed fonts in the file",
    subset: "Embed only the characters used",
    subsetNote: "(smaller file; editing with other characters on another computer uses another font)",
    skipCommon: "Do not embed common system fonts",
    neverEmbedded: (common) => `${common} are never embedded.`,
    note: "Only fonts whose file is available and whose license allows embedding are included; the ones left out are reported when saving.",
    cancel: "Cancel",
    ok: "OK",
    reasons: { common: "common system font", license: "the license does not allow it", unavailable: "font file unavailable" },
    embedded: "Fonts embedded",
    notEmbedded: "not embedded"
  },
  pt: {
    and: "e",
    title: "Fontes no arquivo",
    embed: "Incorporar fontes no arquivo",
    subset: "Incorporar s\xF3 os caracteres usados",
    subsetNote: "(arquivo menor; editar com outros caracteres em outra m\xE1quina usa outra fonte)",
    skipCommon: "N\xE3o incorporar fontes comuns do sistema",
    neverEmbedded: (common) => `${common} nunca s\xE3o incorporadas.`,
    note: "S\xF3 entram fontes cujo arquivo est\xE1 dispon\xEDvel e cuja licen\xE7a permite incorporar; as que ficarem de fora s\xE3o avisadas ao salvar.",
    cancel: "Cancelar",
    ok: "OK",
    reasons: { common: "fonte comum do sistema", license: "a licen\xE7a n\xE3o permite", unavailable: "arquivo da fonte indispon\xEDvel" },
    embedded: "Fontes incorporadas",
    notEmbedded: "n\xE3o incorporadas"
  },
  es: {
    and: "y",
    title: "Fuentes en el archivo",
    embed: "Incrustar fuentes en el archivo",
    subset: "Incrustar solo los caracteres usados",
    subsetNote: "(archivo m\xE1s peque\xF1o; editar con otros caracteres en otro equipo usa otra fuente)",
    skipCommon: "No incrustar fuentes comunes del sistema",
    neverEmbedded: (common) => `${common} nunca se incrustan.`,
    note: "Solo se incluyen las fuentes cuyo archivo est\xE1 disponible y cuya licencia permite incrustarlas; las que quedan fuera se notifican al guardar.",
    cancel: "Cancelar",
    ok: "Aceptar",
    reasons: { common: "fuente com\xFAn del sistema", license: "la licencia no lo permite", unavailable: "archivo de fuente no disponible" },
    embedded: "Fuentes incrustadas",
    notEmbedded: "no incrustadas"
  }
};
var join = (xs, L2) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${L2.and} ${xs[xs.length - 1]}`;
function openFontEmbeddingDialog(opts) {
  const { app, settings } = opts;
  const L2 = pickLabels(opts.lang, LABELS);
  const dlg = document.createElement("dialog");
  dlg.className = "uo-font-embedding";
  dlg.style.cssText = "max-width:460px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:12px;padding:20px 22px;font:inherit;color:inherit;background:Canvas;";
  const common = join(COMMON_FONTS[app], L2);
  dlg.innerHTML = `
    <form method="dialog" style="display:flex;flex-direction:column;gap:12px;margin:0">
      <strong style="font-size:1.1em">${L2.title}</strong>
      <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="embed"> <span>${L2.embed}</span></label>
      <div data-sub style="display:flex;flex-direction:column;gap:10px;margin-left:26px">
        <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="subset">
          <span>${L2.subset} <small style="opacity:.7">${L2.subsetNote}</small></span></label>
        ${app === "write" ? `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="skipCommon">
               <span>${L2.skipCommon} <small style="opacity:.7">(${common})</small></span></label>` : `<small style="opacity:.7">${L2.neverEmbedded(common)}</small>`}
      </div>
      <small style="opacity:.7">${L2.note}</small>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button value="cancel" type="submit">${L2.cancel}</button>
        <button value="ok" type="submit">${L2.ok}</button>
      </div>
    </form>`;
  const box = (n) => dlg.querySelector(`input[name="${n}"]`);
  const embed = box("embed"), subset = box("subset"), skipCommon = box("skipCommon");
  embed.checked = settings.embed;
  subset.checked = settings.subset;
  if (skipCommon) skipCommon.checked = settings.skipCommonFonts;
  const sync = () => {
    for (const el of dlg.querySelectorAll("[data-sub] input")) el.disabled = !embed.checked;
    dlg.querySelector("[data-sub]").style.opacity = embed.checked ? "1" : ".5";
  };
  embed.addEventListener("change", sync);
  sync();
  (opts.parent ?? document.body).append(dlg);
  return new Promise((resolve) => {
    dlg.addEventListener("close", () => {
      const ok = dlg.returnValue === "ok";
      dlg.remove();
      resolve(ok ? {
        embed: embed.checked,
        subset: subset.checked,
        skipCommonFonts: skipCommon ? skipCommon.checked : settings.skipCommonFonts
      } : null);
    }, { once: true });
    dlg.showModal();
  });
}
function describeFontEmbedding(detail, lang) {
  const L2 = pickLabels(lang, LABELS);
  const parts = [];
  if (detail.embedded.length) parts.push(`${L2.embedded}: ${join(detail.embedded, L2)}`);
  const by = /* @__PURE__ */ new Map();
  for (const s of detail.skipped) {
    if (s.reason === "already-embedded") continue;
    const r = L2.reasons[s.reason];
    by.set(r, [...by.get(r) ?? [], s.family]);
  }
  if (by.size) parts.push(`${L2.notEmbedded}: ${[...by].map(([r, fs]) => `${join(fs, L2)} (${r})`).join("; ")}`);
  return parts.join(" \xB7 ");
}

// ../../../shared/ui/src/toolbar/commands.ts
var CommandRegistry = class {
  constructor(lang) {
    this.lang = lang;
  }
  lang;
  cmds = /* @__PURE__ */ new Map();
  /** ids ocultos pelo hospedeiro (comandos, itens de menu, grupos, guias…) */
  hidden = /* @__PURE__ */ new Set();
  /** Oculta ids em tudo: barra, menus, menu de contexto e atalhos. */
  hide(ids) {
    for (const id of ids) this.hidden.add(id);
    return this;
  }
  unhide(ids) {
    for (const id of ids) this.hidden.delete(id);
    return this;
  }
  isHidden(id) {
    return this.hidden.has(id);
  }
  hiddenIds() {
    return [...this.hidden];
  }
  add(...cmds) {
    for (const c2 of cmds) this.cmds.set(c2.id, c2);
    return this;
  }
  get(id) {
    return this.cmds.get(id);
  }
  ids() {
    return [...this.cmds.keys()];
  }
  /** Texto de um rótulo no idioma da interface. */
  text(l) {
    if (l === void 0) return "";
    return typeof l === "string" ? l : pickLabels(this.lang, l);
  }
  label(id) {
    return this.text(this.cmds.get(id)?.label);
  }
  /** Tooltip: dica (ou rótulo) + atalho. */
  tooltip(id) {
    const c2 = this.cmds.get(id);
    if (!c2) return "";
    const t2 = this.text(c2.tip ?? c2.label);
    return c2.shortcut ? `${t2} (${c2.shortcut})` : t2;
  }
  supported(id) {
    const c2 = this.cmds.get(id);
    if (!c2 || this.hidden.has(id)) return false;
    try {
      return c2.supports?.() ?? true;
    } catch {
      return false;
    }
  }
  enabled(id) {
    const c2 = this.cmds.get(id);
    if (!c2 || !this.supported(id)) return false;
    try {
      return c2.isEnabled?.() ?? true;
    } catch {
      return false;
    }
  }
  checked(id) {
    const c2 = this.cmds.get(id);
    try {
      return !!c2?.isChecked?.();
    } catch {
      return false;
    }
  }
  /** Chamado depois de cada comando (e de novo quando um comando assíncrono termina). */
  afterRun = null;
  /** Executa (se existe, é suportado e está habilitado). */
  run(id) {
    if (!this.enabled(id)) return void 0;
    const r = this.cmds.get(id).run();
    this.afterRun?.(id);
    if (r instanceof Promise) void r.finally(() => this.afterRun?.(id)).catch(() => {
    });
    return r;
  }
  /** Item de menu do comando; null quando não suportado. */
  menuItem(id) {
    const c2 = this.cmds.get(id);
    if (!c2 || !this.supported(id)) return null;
    return {
      id,
      icon: c2.icon,
      label: this.text(c2.label),
      shortcut: c2.shortcut,
      checked: c2.isChecked ? this.checked(id) : void 0,
      disabled: !this.enabled(id),
      onClick: () => {
        void this.run(id);
      }
    };
  }
  /**
   * Resolve entradas declarativas: ids viram itens, '-' vira separador,
   * ocultos e não suportados saem, separadores repetidos/nas pontas somem e
   * submenus sem nenhum item visível também.
   */
  resolve(entries) {
    const out = [];
    for (const e of entries) {
      let it;
      if (typeof e === "string") it = e === "-" ? { sep: true } : this.menuItem(e);
      else it = e.hidden || e.id !== void 0 && this.hidden.has(e.id) ? null : e;
      if (!it) continue;
      if (it.submenu && !it.content) {
        const sub = typeof it.submenu === "function" ? it.submenu() : it.submenu;
        const resolved = this.resolve(sub);
        if (!resolved.some((s) => !s.sep)) continue;
        it = { ...it, submenu: resolved };
      }
      if (it.sep && (out.length === 0 || out[out.length - 1].sep)) continue;
      out.push(it);
    }
    while (out.length && out[out.length - 1].sep) out.pop();
    return out;
  }
};

// ../../../shared/ui/src/toolbar/extend.ts
function barItemId(item) {
  if (typeof item === "string") return item;
  if ("cmd" in item) return item.cmd;
  if ("split" in item) return item.split;
  if ("gallery" in item) return item.gallery.id;
  if ("widget" in item) return item.id;
  return item.id;
}
var keep = (hidden) => (item) => {
  const id = barItemId(item);
  return id === void 0 || !hidden.has(id);
};
function hideItems(items, hidden) {
  return items.filter(keep(hidden));
}
function hideCells(cells, hidden) {
  const out = [];
  for (const cell of cells) {
    if (typeof cell === "object" && "rows" in cell) {
      const rows = cell.rows.map((r) => hideItems(r, hidden)).filter((r) => r.length > 0);
      if (rows.length) out.push({ rows });
    } else if (keep(hidden)(cell)) out.push(cell);
  }
  return out;
}
function hideGroup(g, hidden) {
  return {
    ...g,
    ...g.items ? { items: hideItems(g.items, hidden) } : {},
    ...g.cells ? { cells: hideCells(g.cells, hidden) } : {},
    ...g.launcher && hidden.has(g.launcher) ? { launcher: void 0 } : {}
  };
}
var emptied = (before, after) => ((before.items?.length ?? 0) > 0 || (before.cells?.length ?? 0) > 0) && !(after.items?.length ?? 0) && !(after.cells?.length ?? 0);
function hideGroups(groups, hidden) {
  const out = [];
  for (const g of groups) {
    if (hidden.has(g.id)) continue;
    const h = hideGroup(g, hidden);
    if (!emptied(g, h)) out.push(h);
  }
  return out;
}
function hideInCompact(cfg, hidden) {
  if (!hidden.size) return cfg;
  const out = {
    ...cfg,
    menus: cfg.menus.filter((m) => !hidden.has(m.id)),
    groups: hideGroups(cfg.groups, hidden)
  };
  if (cfg.trailing) out.trailing = hideItems(cfg.trailing, hidden);
  if (cfg.title && !keep(hidden)(cfg.title)) delete out.title;
  if (cfg.leading && !keep(hidden)(cfg.leading)) delete out.leading;
  return out;
}
function hideInRibbon(cfg, hidden) {
  if (!hidden.size) return cfg;
  const out = {
    ...cfg,
    tabs: cfg.tabs.flatMap((t2) => {
      if (hidden.has(t2.id)) return [];
      const groups = hideGroups(t2.groups, hidden);
      return groups.length || !t2.groups.length ? [{ ...t2, groups }] : [];
    })
  };
  if (cfg.qat) out.qat = hideItems(cfg.qat, hidden);
  if (cfg.trailing) out.trailing = hideItems(cfg.trailing, hidden);
  if (cfg.title && !keep(hidden)(cfg.title)) delete out.title;
  return out;
}
function place(list, added) {
  const out = [...list];
  for (const a of added) {
    const { before, ...item } = a;
    const at = before === void 0 ? -1 : out.findIndex((x2) => x2.id === before);
    if (at < 0) out.push(item);
    else out.splice(at, 0, item);
  }
  return out;
}
function extendCompact(cfg, contributions) {
  let menus2 = cfg.menus;
  let groups = cfg.groups;
  let trailing = cfg.trailing;
  let title = cfg.title;
  let leading = cfg.leading;
  let titlePlacement = cfg.titlePlacement;
  for (const c2 of contributions) {
    if (!c2.compact) continue;
    if (c2.compact.title) title = c2.compact.title;
    if (c2.compact.leading) leading = c2.compact.leading;
    if (c2.compact.titlePlacement) titlePlacement = c2.compact.titlePlacement;
    if (c2.compact.menus?.length) menus2 = place(menus2, c2.compact.menus);
    if (c2.compact.groups?.length) groups = place(groups, c2.compact.groups);
    if (c2.compact.trailing?.length) trailing = [...trailing ?? [], ...c2.compact.trailing];
  }
  return {
    ...cfg,
    menus: menus2,
    groups,
    ...trailing ? { trailing } : {},
    ...title ? { title } : {},
    ...leading ? { leading } : {},
    ...titlePlacement ? { titlePlacement } : {}
  };
}
function extendRibbon(cfg, contributions) {
  let tabs = cfg.tabs;
  let qat = cfg.qat;
  let title = cfg.title;
  for (const c2 of contributions) {
    if (!c2.ribbon) continue;
    if (c2.ribbon.title) title = c2.ribbon.title;
    if (c2.ribbon.tabs?.length) tabs = place(tabs, c2.ribbon.tabs);
    for (const g of c2.ribbon.groups ?? []) {
      const { tab, ...group } = g;
      const i2 = tabs.findIndex((t2) => t2.id === tab);
      if (i2 < 0) continue;
      tabs = tabs.map((t2, k) => k === i2 ? { ...t2, groups: place(t2.groups, [group]) } : t2);
    }
    if (c2.ribbon.qat?.length) qat = [...qat ?? [], ...c2.ribbon.qat];
  }
  return { ...cfg, tabs, ...qat ? { qat } : {}, ...title ? { title } : {} };
}

// ../../../shared/ui/src/toolbar/collapse.ts
function planCollapse(groups, avail, opts) {
  const idx = groups.map((_, i2) => i2);
  const w = (arr) => arr.reduce((s, i2) => s + groups[i2].width - (groups[i2].shrink ?? 0), 0);
  const byPrio = (a, b) => groups[a].prio - groups[b].prio || b - a;
  const always = idx.filter((i2) => groups[i2].prio <= 0);
  let inline = idx.filter((i2) => groups[i2].prio > 0);
  const collapsed = [];
  const moreW = () => always.length || collapsed.length ? opts.moreW : 0;
  while (w(inline) + collapsed.length * opts.trigW + moreW() > avail) {
    const cand = inline.filter((i2) => groups[i2].prio < 9).sort(byPrio)[0];
    if (cand === void 0) break;
    inline = inline.filter((i2) => i2 !== cand);
    collapsed.push(cand);
  }
  let triggers = [...collapsed];
  const more = [...always];
  while (triggers.length && w(inline) + triggers.length * opts.trigW + opts.moreW > avail) {
    const c2 = [...triggers].sort(byPrio)[0];
    triggers = triggers.filter((i2) => i2 !== c2);
    more.push(c2);
  }
  const plan = {
    inline,
    triggers: triggers.sort((a, b) => a - b),
    more: more.sort(byPrio)
  };
  if (groups.some((g) => (g.shrink ?? 0) > 0)) {
    const full = inline.reduce((s, i2) => s + groups[i2].width, 0);
    let deficit = full + plan.triggers.length * opts.trigW + (plan.more.length ? opts.moreW : 0) - avail;
    plan.give = groups.map(() => 0);
    for (const i2 of [...inline].sort(byPrio)) {
      if (deficit <= 0) break;
      const g = Math.min(groups[i2].shrink ?? 0, deficit);
      plan.give[i2] = g;
      deficit -= g;
    }
  }
  return plan;
}

// ../../../shared/ui/src/toolbar/symbols.ts
var SYMBOLS = {
  "accessibility_new": "M480-720Q447-720 423.5-743.5Q400-767 400-800Q400-833 423.5-856.5Q447-880 480-880Q513-880 536.5-856.5Q560-833 560-800Q560-767 536.5-743.5Q513-720 480-720ZM360-120V-600Q311-604 261-611Q211-618 163-629Q146-633 135.5-648Q125-663 130-680Q135-697 151-705Q167-713 185-709Q255-694 330.5-687Q406-680 480-680Q554-680 629.5-687Q705-694 775-709Q793-713 809-705Q825-697 830-680Q835-663 824.5-648Q814-633 797-629Q749-618 699-611Q649-604 600-600V-120Q600-103 588.5-91.5Q577-80 560-80Q543-80 531.5-91.5Q520-103 520-120V-320H440V-120Q440-103 428.5-91.5Q417-80 400-80Q383-80 371.5-91.5Q360-103 360-120Z",
  "add": "M440-440H240Q223-440 211.5-451.5Q200-463 200-480Q200-497 211.5-508.5Q223-520 240-520H440V-720Q440-737 451.5-748.5Q463-760 480-760Q497-760 508.5-748.5Q520-737 520-720V-520H720Q737-520 748.5-508.5Q760-497 760-480Q760-463 748.5-451.5Q737-440 720-440H520V-240Q520-223 508.5-211.5Q497-200 480-200Q463-200 451.5-211.5Q440-223 440-240Z",
  "add_box": "M440-440V-320Q440-303 451.5-291.5Q463-280 480-280Q497-280 508.5-291.5Q520-303 520-320V-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H520V-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640V-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "add_column_left": "M560-200H800Q800-200 800-200Q800-200 800-200V-760Q800-760 800-760Q800-760 800-760H560ZM240-120Q207-120 183.5-143.5Q160-167 160-200V-240Q160-257 171.5-268.5Q183-280 200-280Q217-280 228.5-268.5Q240-257 240-240V-200Q240-200 240-200Q240-200 240-200H480V-760H240Q240-760 240-760Q240-760 240-760V-720Q240-703 228.5-691.5Q217-680 200-680Q183-680 171.5-691.5Q160-703 160-720V-760Q160-793 183.5-816.5Q207-840 240-840H800Q833-840 856.5-816.5Q880-793 880-760V-200Q880-167 856.5-143.5Q833-120 800-120ZM160-400V-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H160V-560Q160-577 171.5-588.5Q183-600 200-600Q217-600 228.5-588.5Q240-577 240-560V-520H280Q297-520 308.5-508.5Q320-497 320-480Q320-463 308.5-451.5Q297-440 280-440H240V-400Q240-383 228.5-371.5Q217-360 200-360Q183-360 171.5-371.5Q160-383 160-400ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM560-480H480ZM560-480Z",
  "add_column_right": "M400-760H160Q160-760 160-760Q160-760 160-760V-200Q160-200 160-200Q160-200 160-200H400ZM160-120Q127-120 103.5-143.5Q80-167 80-200V-760Q80-793 103.5-816.5Q127-840 160-840H720Q753-840 776.5-816.5Q800-793 800-760V-720Q800-703 788.5-691.5Q777-680 760-680Q743-680 731.5-691.5Q720-703 720-720V-760Q720-760 720-760Q720-760 720-760H480V-200H720Q720-200 720-200Q720-200 720-200V-240Q720-257 731.5-268.5Q743-280 760-280Q777-280 788.5-268.5Q800-257 800-240V-200Q800-167 776.5-143.5Q753-120 720-120ZM720-400V-440H680Q663-440 651.5-451.5Q640-463 640-480Q640-497 651.5-508.5Q663-520 680-520H720V-560Q720-577 731.5-588.5Q743-600 760-600Q777-600 788.5-588.5Q800-577 800-560V-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440H800V-400Q800-383 788.5-371.5Q777-360 760-360Q743-360 731.5-371.5Q720-383 720-400ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM400-480H480ZM400-480Z",
  "add_comment": "M440-520V-440Q440-423 451.5-411.5Q463-400 480-400Q497-400 508.5-411.5Q520-423 520-440V-520H600Q617-520 628.5-531.5Q640-543 640-560Q640-577 628.5-588.5Q617-600 600-600H520V-680Q520-697 508.5-708.5Q497-720 480-720Q463-720 451.5-708.5Q440-697 440-680V-600H360Q343-600 331.5-588.5Q320-577 320-560Q320-543 331.5-531.5Q343-520 360-520ZM240-240 148-148Q129-129 104.5-139.5Q80-150 80-177V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM206-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-275ZM160-320V-800Q160-800 160-800Q160-800 160-800Q160-800 160-800Q160-800 160-800V-320Q160-320 160-320Q160-320 160-320Z",
  "add_row_above": "M200-400V-160Q200-160 200-160Q200-160 200-160H760Q760-160 760-160Q760-160 760-160V-400ZM200-80Q167-80 143.5-103.5Q120-127 120-160V-720Q120-753 143.5-776.5Q167-800 200-800H240Q257-800 268.5-788.5Q280-777 280-760Q280-743 268.5-731.5Q257-720 240-720H200Q200-720 200-720Q200-720 200-720V-480H760V-720Q760-720 760-720Q760-720 760-720H720Q703-720 691.5-731.5Q680-743 680-760Q680-777 691.5-788.5Q703-800 720-800H760Q793-800 816.5-776.5Q840-753 840-720V-160Q840-127 816.5-103.5Q793-80 760-80ZM440-720H400Q383-720 371.5-731.5Q360-743 360-760Q360-777 371.5-788.5Q383-800 400-800H440V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-800H560Q577-800 588.5-788.5Q600-777 600-760Q600-743 588.5-731.5Q577-720 560-720H520V-680Q520-663 508.5-651.5Q497-640 480-640Q463-640 451.5-651.5Q440-663 440-680ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM480-400V-480ZM480-400Z",
  "add_row_below": "M760-560V-800Q760-800 760-800Q760-800 760-800H200Q200-800 200-800Q200-800 200-800V-560ZM200-160Q167-160 143.5-183.5Q120-207 120-240V-800Q120-833 143.5-856.5Q167-880 200-880H760Q793-880 816.5-856.5Q840-833 840-800V-240Q840-207 816.5-183.5Q793-160 760-160H720Q703-160 691.5-171.5Q680-183 680-200Q680-217 691.5-228.5Q703-240 720-240H760Q760-240 760-240Q760-240 760-240V-480H200V-240Q200-240 200-240Q200-240 200-240H240Q257-240 268.5-228.5Q280-217 280-200Q280-183 268.5-171.5Q257-160 240-160ZM440-120V-160H400Q383-160 371.5-171.5Q360-183 360-200Q360-217 371.5-228.5Q383-240 400-240H440V-280Q440-297 451.5-308.5Q463-320 480-320Q497-320 508.5-308.5Q520-297 520-280V-240H560Q577-240 588.5-228.5Q600-217 600-200Q600-183 588.5-171.5Q577-160 560-160H520V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM480-560V-480ZM480-560Z",
  "align_horizontal_center": "M440-120V-280H300Q275-280 257.5-297.5Q240-315 240-340Q240-365 257.5-382.5Q275-400 300-400H440V-560H180Q155-560 137.5-577.5Q120-595 120-620Q120-645 137.5-662.5Q155-680 180-680H440V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-680H780Q805-680 822.5-662.5Q840-645 840-620Q840-595 822.5-577.5Q805-560 780-560H520V-400H660Q685-400 702.5-382.5Q720-365 720-340Q720-315 702.5-297.5Q685-280 660-280H520V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120Z",
  "align_horizontal_left": "M120-80Q103-80 91.5-91.5Q80-103 80-120V-840Q80-857 91.5-868.5Q103-880 120-880Q137-880 148.5-868.5Q160-857 160-840V-120Q160-103 148.5-91.5Q137-80 120-80ZM300-280Q275-280 257.5-297.5Q240-315 240-340Q240-365 257.5-382.5Q275-400 300-400H580Q605-400 622.5-382.5Q640-365 640-340Q640-315 622.5-297.5Q605-280 580-280ZM300-560Q275-560 257.5-577.5Q240-595 240-620Q240-645 257.5-662.5Q275-680 300-680H820Q845-680 862.5-662.5Q880-645 880-620Q880-595 862.5-577.5Q845-560 820-560Z",
  "align_horizontal_right": "M800-120V-840Q800-857 811.5-868.5Q823-880 840-880Q857-880 868.5-868.5Q880-857 880-840V-120Q880-103 868.5-91.5Q857-80 840-80Q823-80 811.5-91.5Q800-103 800-120ZM380-280Q355-280 337.5-297.5Q320-315 320-340Q320-365 337.5-382.5Q355-400 380-400H660Q685-400 702.5-382.5Q720-365 720-340Q720-315 702.5-297.5Q685-280 660-280ZM140-560Q115-560 97.5-577.5Q80-595 80-620Q80-645 97.5-662.5Q115-680 140-680H660Q685-680 702.5-662.5Q720-645 720-620Q720-595 702.5-577.5Q685-560 660-560Z",
  "align_vertical_bottom": "M120-80Q103-80 91.5-91.5Q80-103 80-120Q80-137 91.5-148.5Q103-160 120-160H840Q857-160 868.5-148.5Q880-137 880-120Q880-103 868.5-91.5Q857-80 840-80ZM280-300V-820Q280-845 297.5-862.5Q315-880 340-880Q365-880 382.5-862.5Q400-845 400-820V-300Q400-275 382.5-257.5Q365-240 340-240Q315-240 297.5-257.5Q280-275 280-300ZM560-300V-580Q560-605 577.5-622.5Q595-640 620-640Q645-640 662.5-622.5Q680-605 680-580V-300Q680-275 662.5-257.5Q645-240 620-240Q595-240 577.5-257.5Q560-275 560-300Z",
  "align_vertical_center": "M280-180V-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H280V-780Q280-805 297.5-822.5Q315-840 340-840Q365-840 382.5-822.5Q400-805 400-780V-520H560V-660Q560-685 577.5-702.5Q595-720 620-720Q645-720 662.5-702.5Q680-685 680-660V-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440H680V-300Q680-275 662.5-257.5Q645-240 620-240Q595-240 577.5-257.5Q560-275 560-300V-440H400V-180Q400-155 382.5-137.5Q365-120 340-120Q315-120 297.5-137.5Q280-155 280-180Z",
  "align_vertical_top": "M280-140V-660Q280-685 297.5-702.5Q315-720 340-720Q365-720 382.5-702.5Q400-685 400-660V-140Q400-115 382.5-97.5Q365-80 340-80Q315-80 297.5-97.5Q280-115 280-140ZM560-380V-660Q560-685 577.5-702.5Q595-720 620-720Q645-720 662.5-702.5Q680-685 680-660V-380Q680-355 662.5-337.5Q645-320 620-320Q595-320 577.5-337.5Q560-355 560-380ZM120-800Q103-800 91.5-811.5Q80-823 80-840Q80-857 91.5-868.5Q103-880 120-880H840Q857-880 868.5-868.5Q880-857 880-840Q880-823 868.5-811.5Q857-800 840-800Z",
  "anchor": "M120-360V-440Q120-452 131-458Q142-464 152-456L243-388Q257-377 258.5-358.5Q260-340 247-327L218-298Q247-247 310-210Q373-173 440-163V-520H360Q343-520 331.5-531.5Q320-543 320-560Q320-577 331.5-588.5Q343-600 360-600H440V-647Q405-660 382.5-690.5Q360-721 360-760Q360-810 395-845Q430-880 480-880Q530-880 565-845Q600-810 600-760Q600-721 577.5-690.5Q555-660 520-647V-600H600Q617-600 628.5-588.5Q640-577 640-560Q640-543 628.5-531.5Q617-520 600-520H520V-163Q587-173 650-210Q713-247 742-298L713-327Q700-340 701.5-358.5Q703-377 717-388L808-456Q818-464 829-458Q840-452 840-440V-360Q840-302 806.5-251Q773-200 721-162Q669-124 605-102Q541-80 480-80Q419-80 355-102Q291-124 239-162Q187-200 153.5-251Q120-302 120-360ZM480-720Q497-720 508.5-731.5Q520-743 520-760Q520-777 508.5-788.5Q497-800 480-800Q463-800 451.5-788.5Q440-777 440-760Q440-743 451.5-731.5Q463-720 480-720Z",
  "arrow_back": "M313-440 509-244Q521-232 520.5-216Q520-200 508-188Q496-177 480-176.5Q464-176 452-188L188-452Q182-458 179.5-465Q177-472 177-480Q177-488 179.5-495Q182-502 188-508L452-772Q463-783 479.5-783Q496-783 508-772Q520-760 520-743.5Q520-727 508-715L313-520H760Q777-520 788.5-508.5Q800-497 800-480Q800-463 788.5-451.5Q777-440 760-440Z",
  "arrow_drop_down": "M459-381 314-526Q311-529 309.5-532.5Q308-536 308-540Q308-548 313.5-554Q319-560 328-560H632Q641-560 646.5-554Q652-548 652-540Q652-538 646-526L501-381Q496-376 491-374Q486-372 480-372Q474-372 469-374Q464-376 459-381Z",
  "arrow_drop_up": "M328-400Q319-400 313.5-406Q308-412 308-420Q308-422 314-434L459-579Q464-584 469-586Q474-588 480-588Q486-588 491-586Q496-584 501-579L646-434Q649-431 650.5-427.5Q652-424 652-420Q652-412 646.5-406Q641-400 632-400Z",
  "arrow_forward": "M647-440H200Q183-440 171.5-451.5Q160-463 160-480Q160-497 171.5-508.5Q183-520 200-520H647L451-716Q439-728 439.5-744Q440-760 452-772Q464-783 480-783.5Q496-784 508-772L772-508Q778-502 780.5-495Q783-488 783-480Q783-472 780.5-465Q778-458 772-452L508-188Q497-177 480.5-177Q464-177 452-188Q440-200 440-216.5Q440-233 452-245Z",
  "arrow_outward": "M640-624 284-268Q273-257 256-257Q239-257 228-268Q217-279 217-296Q217-313 228-324L584-680H280Q263-680 251.5-691.5Q240-703 240-720Q240-737 251.5-748.5Q263-760 280-760H680Q697-760 708.5-748.5Q720-737 720-720V-320Q720-303 708.5-291.5Q697-280 680-280Q663-280 651.5-291.5Q640-303 640-320Z",
  "article": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760ZM320-280H520Q537-280 548.5-291.5Q560-303 560-320Q560-337 548.5-348.5Q537-360 520-360H320Q303-360 291.5-348.5Q280-337 280-320Q280-303 291.5-291.5Q303-280 320-280ZM320-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM320-600H640Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680H320Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600Z",
  "aspect_ratio": "M680-360H600Q583-360 571.5-348.5Q560-337 560-320Q560-303 571.5-291.5Q583-280 600-280H720Q737-280 748.5-291.5Q760-303 760-320V-440Q760-457 748.5-468.5Q737-480 720-480Q703-480 691.5-468.5Q680-457 680-440ZM280-600H360Q377-600 388.5-611.5Q400-623 400-640Q400-657 388.5-668.5Q377-680 360-680H240Q223-680 211.5-668.5Q200-657 200-640V-520Q200-503 211.5-491.5Q223-480 240-480Q257-480 268.5-491.5Q280-503 280-520ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "auto_awesome": "M706-706 636-738Q630-741 627.5-746Q625-751 625-756Q625-761 627.5-766Q630-771 636-774L706-806L738-876Q741-882 746-885Q751-888 756-888Q761-888 766-885Q771-882 774-876L806-806L876-774Q882-771 885-766Q888-761 888-756Q888-751 885-746Q882-741 876-738L806-706L774-636Q771-630 766-627.5Q761-625 756-625Q751-625 746-627.5Q741-630 738-636ZM260-380 100-453Q91-457 87-464.5Q83-472 83-480Q83-488 87-495.5Q91-503 100-507L260-580L333-740Q337-749 344.5-753Q352-757 360-757Q368-757 375.5-753Q383-749 387-740L460-580L620-507Q629-503 633-495.5Q637-488 637-480Q637-472 633-464.5Q629-457 620-453L460-380L387-220Q383-211 375.5-207Q368-203 360-203Q352-203 344.5-207Q337-211 333-220ZM360-354 400-440 486-480 400-520 360-606 320-520 234-480 320-440ZM710-150 640-182Q634-185 631-190Q628-195 628-200Q628-205 631-210Q634-215 640-218L710-250L742-320Q745-326 750-329Q755-332 760-332Q765-332 770-329Q775-326 778-320L810-250L880-218Q886-215 889-210Q892-205 892-200Q892-195 889-190Q886-185 880-182L810-150L778-80Q775-74 770-71Q765-68 760-68Q755-68 750-71Q745-74 742-80ZM360-480Z",
  "auto_stories": "M439-189Q398-214 353-227Q308-240 260-240Q218-240 177.5-229Q137-218 100-198Q79-187 59.5-199Q40-211 40-234V-716Q40-727 45.5-737Q51-747 62-752Q108-776 158-788Q208-800 260-800Q318-800 373.5-785Q429-770 480-740V-256Q531-288 587-304Q643-320 700-320Q736-320 770.5-314Q805-308 840-296Q840-296 840-296Q840-296 840-296V-776Q855-771 869.5-765.5Q884-760 898-752Q909-747 914.5-737Q920-727 920-716V-234Q920-211 900.5-199Q881-187 860-198Q823-218 782.5-229Q742-240 700-240Q652-240 607-227Q562-214 521-189Q512-184 501.5-181Q491-178 480-178Q469-178 458.5-181Q448-184 439-189ZM593-390Q583-381 571.5-386.5Q560-392 560-405V-732Q560-736 561.5-739.5Q563-743 566-746L726-906Q736-916 748-911Q760-906 760-892V-549Q760-544 758-540.5Q756-537 753-534ZM400-295V-691Q367-705 331.5-712.5Q296-720 260-720Q223-720 188-713Q153-706 120-692Q120-692 120-692Q120-692 120-692V-295Q120-295 120-295Q120-295 120-295Q155-308 189.5-314Q224-320 260-320Q296-320 330.5-314Q365-308 400-295ZM400-295Q400-295 400-295Q400-295 400-295Q400-295 400-295Q400-295 400-295Q400-295 400-295Q400-295 400-295V-691Q400-691 400-691Q400-691 400-691Q400-691 400-691Q400-691 400-691Q400-691 400-691Q400-691 400-691Z",
  "autorenew": "M240-478Q240-462 242-446.5Q244-431 249-416Q254-399 248-383.5Q242-368 227-361Q211-353 195.5-359.5Q180-366 175-383Q167-406 163.5-430Q160-454 160-478Q160-612 253-706Q346-800 480-800H487L451-836Q440-847 440-864Q440-881 451-892Q462-903 479-903Q496-903 507-892L611-788Q623-776 623-760Q623-744 611-732L507-628Q496-617 479-617Q462-617 451-628Q440-639 440-656Q440-673 451-684L487-720H480Q380-720 310-649.5Q240-579 240-478ZM720-482Q720-498 718-513.5Q716-529 711-544Q706-561 712-576.5Q718-592 733-599Q749-607 764.5-600.5Q780-594 785-577Q793-554 796.5-530Q800-506 800-482Q800-348 707-254Q614-160 480-160H473L509-124Q520-113 520-96Q520-79 509-68Q498-57 481-57Q464-57 453-68L349-172Q337-184 337-200Q337-216 349-228L453-332Q464-343 481-343Q498-343 509-332Q520-321 520-304Q520-287 509-276L473-240H480Q580-240 650-310.5Q720-381 720-482Z",
  "bedtime": "M484-80Q400-80 326.5-112Q253-144 198.5-198.5Q144-253 112-326.5Q80-400 80-484Q80-612 152-716Q224-820 345-862Q367-870 386-856.5Q405-843 404-820Q401-735 431-658Q461-581 521-521Q581-461 658-431Q735-401 820-404Q846-405 858.5-386.5Q871-368 863-345Q819-225 715.5-152.5Q612-80 484-80ZM484-160Q572-160 647-204Q722-248 765-325Q679-333 602-368.5Q525-404 464-465Q403-526 367-603Q331-680 324-766Q247-723 203.5-647.5Q160-572 160-484Q160-349 254.5-254.5Q349-160 484-160ZM464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Z",
  "bookmark": "M480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H680Q713-840 736.5-816.5Q760-793 760-760V-241Q760-198 724-174.5Q688-151 648-168ZM480-328 680-242Q680-242 680-242Q680-242 680-242V-760Q680-760 680-760Q680-760 680-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H680Q680-760 680-760Q680-760 680-760Q680-760 680-760Q680-760 680-760Z",
  "bookmark_add": "M480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H480Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242L480-328L680-242Q680-242 680-242Q680-242 680-242V-480Q680-497 691.5-508.5Q703-520 720-520Q737-520 748.5-508.5Q760-497 760-480V-241Q760-198 724-174.5Q688-151 648-168ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H520Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760ZM680-680H640Q623-680 611.5-691.5Q600-703 600-720Q600-737 611.5-748.5Q623-760 640-760H680V-800Q680-817 691.5-828.5Q703-840 720-840Q737-840 748.5-828.5Q760-817 760-800V-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680H760V-640Q760-623 748.5-611.5Q737-600 720-600Q703-600 691.5-611.5Q680-623 680-640Z",
  "bookmark_remove": "M640-680Q623-680 611.5-691.5Q600-703 600-720Q600-737 611.5-748.5Q623-760 640-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680ZM480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H480Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242L480-328L680-242Q680-242 680-242Q680-242 680-242V-480Q680-497 691.5-508.5Q703-520 720-520Q737-520 748.5-508.5Q760-497 760-480V-241Q760-198 724-174.5Q688-151 648-168ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H520Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Z",
  "bookmarks": "M400-200 218-109Q198-99 179-110.5Q160-122 160-145V-640Q160-673 183.5-696.5Q207-720 240-720H560Q593-720 616.5-696.5Q640-673 640-640V-145Q640-122 621-110.5Q602-99 582-109ZM240-201 362-267Q380-277 400-277Q420-277 438-267L560-201V-640Q560-640 560-640Q560-640 560-640H240Q240-640 240-640Q240-640 240-640ZM720-280V-800Q720-800 720-800Q720-800 720-800H320Q303-800 291.5-811.5Q280-823 280-840Q280-857 291.5-868.5Q303-880 320-880H720Q753-880 776.5-856.5Q800-833 800-800V-280Q800-263 788.5-251.5Q777-240 760-240Q743-240 731.5-251.5Q720-263 720-280ZM240-640Q240-640 240-640Q240-640 240-640H560Q560-640 560-640Q560-640 560-640H438Q420-640 400-640Q380-640 362-640Z",
  "border_all": "M120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120H200Q167-120 143.5-143.5Q120-167 120-200ZM520-440V-200Q520-200 520-200Q520-200 520-200H760Q760-200 760-200Q760-200 760-200V-440Q760-440 760-440Q760-440 760-440H520Q520-440 520-440Q520-440 520-440ZM520-520H760Q760-520 760-520Q760-520 760-520V-760Q760-760 760-760Q760-760 760-760H520Q520-760 520-760Q520-760 520-760V-520Q520-520 520-520Q520-520 520-520ZM440-520V-760Q440-760 440-760Q440-760 440-760H200Q200-760 200-760Q200-760 200-760V-520Q200-520 200-520Q200-520 200-520H440Q440-520 440-520Q440-520 440-520ZM440-440H200Q200-440 200-440Q200-440 200-440V-200Q200-200 200-200Q200-200 200-200H440Q440-200 440-200Q440-200 440-200V-440Q440-440 440-440Q440-440 440-440Z",
  "border_bottom": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "border_clear": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "border_color": "M160 0Q127 0 103.5-23.5Q80-47 80-80Q80-113 103.5-136.5Q127-160 160-160H800Q833-160 856.5-136.5Q880-113 880-80Q880-47 856.5-23.5Q833 0 800 0ZM240-320H296L608-631L579-660L551-688L240-376ZM160-280V-393Q160-401 163-408.5Q166-416 172-422L608-857Q619-868 633.5-874Q648-880 664-880Q680-880 695-874Q710-868 722-856L777-800Q789-789 794.5-774Q800-759 800-743Q800-728 794.5-713.5Q789-699 777-687L342-252Q336-246 328.5-243Q321-240 313-240H200Q183-240 171.5-251.5Q160-263 160-280ZM720-744 664-800ZM608-631 579-660 551-688 608-631Z",
  "border_horizontal": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440Z",
  "border_inner": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM440-160V-440H160Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H440V-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800V-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440H520V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160Z",
  "border_left": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM120-160V-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800V-160Q200-143 188.5-131.5Q177-120 160-120Q143-120 131.5-131.5Q120-143 120-160Z",
  "border_outer": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120Z",
  "border_right": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM760-160V-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800V-160Q840-143 828.5-131.5Q817-120 800-120Q783-120 771.5-131.5Q760-143 760-160Z",
  "border_style": "M800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM120-160V-760Q120-793 143.5-816.5Q167-840 200-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760H200Q200-760 200-760Q200-760 200-760V-160Q200-143 188.5-131.5Q177-120 160-120Q143-120 131.5-131.5Q120-143 120-160Z",
  "border_top": "M480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760Z",
  "border_vertical": "M320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM440-160V-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160Z",
  "branding_watermark": "M440-280H720Q737-280 748.5-291.5Q760-303 760-320V-480Q760-497 748.5-508.5Q737-520 720-520H440Q423-520 411.5-508.5Q400-497 400-480V-320Q400-303 411.5-291.5Q423-280 440-280ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "brightness_auto": "M408-412H554L579-339Q582-331 589.5-325.5Q597-320 606-320Q621-320 629.5-332.5Q638-345 633-359L519-661Q516-670 508-675Q500-680 491-680H469Q460-680 452-675Q444-670 441-661L327-360Q322-346 330.5-333Q339-320 355-320Q365-320 372.5-325.5Q380-331 383-340ZM426-464 478-614H482L534-464ZM346-160H240Q207-160 183.5-183.5Q160-207 160-240V-346L83-424Q72-436 66-450.5Q60-465 60-480Q60-495 66-509.5Q72-524 83-536L160-614V-720Q160-753 183.5-776.5Q207-800 240-800H346L424-877Q436-888 450.5-894Q465-900 480-900Q495-900 509.5-894Q524-888 536-877L614-800H720Q753-800 776.5-776.5Q800-753 800-720V-614L877-536Q888-524 894-509.5Q900-495 900-480Q900-465 894-450.5Q888-436 877-424L800-346V-240Q800-207 776.5-183.5Q753-160 720-160H614L536-83Q524-72 509.5-66Q495-60 480-60Q465-60 450.5-66Q436-72 424-83ZM380-240 480-140Q480-140 480-140Q480-140 480-140L580-240H720Q720-240 720-240Q720-240 720-240V-380L820-480Q820-480 820-480Q820-480 820-480L720-580V-720Q720-720 720-720Q720-720 720-720H580L480-820Q480-820 480-820Q480-820 480-820L380-720H240Q240-720 240-720Q240-720 240-720V-580L140-480Q140-480 140-480Q140-480 140-480L240-380V-240Q240-240 240-240Q240-240 240-240ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "calendar_today": "M200-80Q167-80 143.5-103.5Q120-127 120-160V-720Q120-753 143.5-776.5Q167-800 200-800H240V-840Q240-857 251.5-868.5Q263-880 280-880Q297-880 308.5-868.5Q320-857 320-840V-800H640V-840Q640-857 651.5-868.5Q663-880 680-880Q697-880 708.5-868.5Q720-857 720-840V-800H760Q793-800 816.5-776.5Q840-753 840-720V-160Q840-127 816.5-103.5Q793-80 760-80ZM200-160H760Q760-160 760-160Q760-160 760-160V-560H200V-160Q200-160 200-160Q200-160 200-160ZM200-640H760V-720Q760-720 760-720Q760-720 760-720H200Q200-720 200-720Q200-720 200-720ZM200-640V-720Q200-720 200-720Q200-720 200-720Q200-720 200-720Q200-720 200-720V-640Z",
  "call_to_action": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM300-280H660Q685-280 702.5-297.5Q720-315 720-340Q720-365 702.5-382.5Q685-400 660-400H300Q275-400 257.5-382.5Q240-365 240-340Q240-315 257.5-297.5Q275-280 300-280Z",
  "cancel": "M480-424 596-308Q607-297 624-297Q641-297 652-308Q663-319 663-336Q663-353 652-364L536-480L652-596Q663-607 663-624Q663-641 652-652Q641-663 624-663Q607-663 596-652L480-536L364-652Q353-663 336-663Q319-663 308-652Q297-641 297-624Q297-607 308-596L424-480L308-364Q297-353 297-336Q297-319 308-308Q319-297 336-297Q353-297 364-308ZM480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM480-160Q614-160 707-253Q800-346 800-480Q800-614 707-707Q614-800 480-800Q346-800 253-707Q160-614 160-480Q160-346 253-253Q346-160 480-160ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "cell_merge": "M120-640V-760Q120-793 143.5-816.5Q167-840 200-840H320Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760H200Q200-760 200-760Q200-760 200-760V-640Q200-623 188.5-611.5Q177-600 160-600Q143-600 131.5-611.5Q120-623 120-640ZM760-640V-760Q760-760 760-760Q760-760 760-760H640Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840H760Q793-840 816.5-816.5Q840-793 840-760V-640Q840-623 828.5-611.5Q817-600 800-600Q783-600 771.5-611.5Q760-623 760-640ZM645-355 548-452Q536-464 536-480Q536-496 548-508L645-605Q657-617 673.5-617Q690-617 702-605Q714-593 714-576.5Q714-560 702-548L673-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440H673L702-412Q714-400 714-383.5Q714-367 702-355Q690-343 673.5-343Q657-343 645-355ZM259-355Q247-367 246.5-383.5Q246-400 258-412L287-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H287L258-548Q246-560 246.5-576.5Q247-593 259-605Q271-617 287-617Q303-617 315-605L412-508Q424-496 424-480Q424-464 412-452L315-355Q303-343 287-343Q271-343 259-355ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320V-200Q200-200 200-200Q200-200 200-200H320Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200H760Q760-200 760-200Q760-200 760-200V-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320V-200Q840-167 816.5-143.5Q793-120 760-120Z",
  "center_focus_strong": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320V-200Q200-200 200-200Q200-200 200-200H320Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM760-120H640Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200H760Q760-200 760-200Q760-200 760-200V-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320V-200Q840-167 816.5-143.5Q793-120 760-120ZM120-640V-760Q120-793 143.5-816.5Q167-840 200-840H320Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760H200Q200-760 200-760Q200-760 200-760V-640Q200-623 188.5-611.5Q177-600 160-600Q143-600 131.5-611.5Q120-623 120-640ZM760-640V-760Q760-760 760-760Q760-760 760-760H640Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840H760Q793-840 816.5-816.5Q840-793 840-760V-640Q840-623 828.5-611.5Q817-600 800-600Q783-600 771.5-611.5Q760-623 760-640ZM480-280Q397-280 338.5-338.5Q280-397 280-480Q280-563 338.5-621.5Q397-680 480-680Q563-680 621.5-621.5Q680-563 680-480Q680-397 621.5-338.5Q563-280 480-280ZM480-360Q530-360 565-395Q600-430 600-480Q600-530 565-565Q530-600 480-600Q430-600 395-565Q360-530 360-480Q360-430 395-395Q430-360 480-360ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "check": "M382-354 721-693Q733-705 749-705Q765-705 777-693Q789-681 789-664.5Q789-648 777-636L410-268Q398-256 382-256Q366-256 354-268L182-440Q170-452 170.5-468.5Q171-485 183-497Q195-509 211.5-509Q228-509 240-497Z",
  "check_circle": "M424-408 338-494Q327-505 310-505Q293-505 282-494Q271-483 271-466Q271-449 282-438L396-324Q408-312 424-312Q440-312 452-324L678-550Q689-561 689-578Q689-595 678-606Q667-617 650-617Q633-617 622-606ZM480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM480-160Q614-160 707-253Q800-346 800-480Q800-614 707-707Q614-800 480-800Q346-800 253-707Q160-614 160-480Q160-346 253-253Q346-160 480-160ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "chevron_right": "M504-480 348-636Q337-647 337-664Q337-681 348-692Q359-703 376-703Q393-703 404-692L588-508Q594-502 596.5-495Q599-488 599-480Q599-472 596.5-465Q594-458 588-452L404-268Q393-257 376-257Q359-257 348-268Q337-279 337-296Q337-313 348-324Z",
  "close": "M480-424 284-228Q273-217 256-217Q239-217 228-228Q217-239 217-256Q217-273 228-284L424-480L228-676Q217-687 217-704Q217-721 228-732Q239-743 256-743Q273-743 284-732L480-536L676-732Q687-743 704-743Q721-743 732-732Q743-721 743-704Q743-687 732-676L536-480L732-284Q743-273 743-256Q743-239 732-228Q721-217 704-217Q687-217 676-228Z",
  "colorize": "M120-160V-277Q120-293 126-307.5Q132-322 143-333L478-668L420-724L478-780L554-704L678-828Q683-833 690.5-836Q698-839 706-839Q714-839 721-836Q728-833 734-828L828-734Q833-728 836-721Q839-714 839-706Q839-698 836-690.5Q833-683 828-678L705-555L781-477L724-420L668-478L333-143Q322-132 307.5-126Q293-120 277-120H160Q143-120 131.5-131.5Q120-143 120-160ZM200-200H278L610-534L534-610L200-278ZM647-610 743-706 706-743 610-647ZM647-610 610-647 647-610Z",
  "comment": "M280-400H680Q697-400 708.5-411.5Q720-423 720-440Q720-457 708.5-468.5Q697-480 680-480H280Q263-480 251.5-468.5Q240-457 240-440Q240-423 251.5-411.5Q263-400 280-400ZM280-520H680Q697-520 708.5-531.5Q720-543 720-560Q720-577 708.5-588.5Q697-600 680-600H280Q263-600 251.5-588.5Q240-577 240-560Q240-543 251.5-531.5Q263-520 280-520ZM280-640H680Q697-640 708.5-651.5Q720-663 720-680Q720-697 708.5-708.5Q697-720 680-720H280Q263-720 251.5-708.5Q240-697 240-680Q240-663 251.5-651.5Q263-640 280-640ZM160-240Q127-240 103.5-263.5Q80-287 80-320V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-177Q880-150 855.5-139.5Q831-129 812-148L720-240ZM754-320 800-275V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-320Q160-320 160-320Q160-320 160-320ZM160-320Q160-320 160-320Q160-320 160-320V-800Q160-800 160-800Q160-800 160-800Q160-800 160-800Q160-800 160-800V-320Z",
  "compare": "M400-120H200Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H400V-880Q400-897 411.5-908.5Q423-920 440-920Q457-920 468.5-908.5Q480-897 480-880V-80Q480-63 468.5-51.5Q457-40 440-40Q423-40 411.5-51.5Q400-63 400-80ZM200-240H400V-480ZM560-120V-480L760-240V-760Q760-760 760-760Q760-760 760-760H560V-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120Z",
  "compress": "M200-400Q183-400 171.5-411.5Q160-423 160-440Q160-457 171.5-468.5Q183-480 200-480H760Q777-480 788.5-468.5Q800-457 800-440Q800-423 788.5-411.5Q777-400 760-400ZM200-520Q183-520 171.5-531.5Q160-543 160-560Q160-577 171.5-588.5Q183-600 200-600H760Q777-600 788.5-588.5Q800-577 800-560Q800-543 788.5-531.5Q777-520 760-520ZM440-120V-208L404-172Q393-161 376-161Q359-161 348-172Q337-183 337-200Q337-217 348-228L452-332Q458-338 465-340.5Q472-343 480-343Q488-343 495-340.5Q502-338 508-332L612-228Q623-217 623.5-200.5Q624-184 612-172Q601-161 584.5-160.5Q568-160 556-171L520-206V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120ZM452-668 348-772Q337-783 337-800Q337-817 348-828Q359-839 376-839Q393-839 404-828L440-792V-880Q440-897 451.5-908.5Q463-920 480-920Q497-920 508.5-908.5Q520-897 520-880V-792L556-828Q567-839 584-839Q601-839 612-828Q623-817 623-800Q623-783 612-772L508-668Q502-662 495-659.5Q488-657 480-657Q472-657 465-659.5Q458-662 452-668Z",
  "content_copy": "M360-240Q327-240 303.5-263.5Q280-287 280-320V-800Q280-833 303.5-856.5Q327-880 360-880H720Q753-880 776.5-856.5Q800-833 800-800V-320Q800-287 776.5-263.5Q753-240 720-240ZM360-320H720Q720-320 720-320Q720-320 720-320V-800Q720-800 720-800Q720-800 720-800H360Q360-800 360-800Q360-800 360-800V-320Q360-320 360-320Q360-320 360-320ZM200-80Q167-80 143.5-103.5Q120-127 120-160V-680Q120-697 131.5-708.5Q143-720 160-720Q177-720 188.5-708.5Q200-697 200-680V-160Q200-160 200-160Q200-160 200-160H600Q617-160 628.5-148.5Q640-137 640-120Q640-103 628.5-91.5Q617-80 600-80ZM360-320Q360-320 360-320Q360-320 360-320V-800Q360-800 360-800Q360-800 360-800Q360-800 360-800Q360-800 360-800V-320Q360-320 360-320Q360-320 360-320Z",
  "content_cut": "M480-400 386-306Q394-291 397-274Q400-257 400-240Q400-174 353-127Q306-80 240-80Q174-80 127-127Q80-174 80-240Q80-306 127-353Q174-400 240-400Q257-400 274-397Q291-394 306-386L400-480L306-574Q291-566 274-563Q257-560 240-560Q174-560 127-607Q80-654 80-720Q80-786 127-833Q174-880 240-880Q306-880 353-833Q400-786 400-720Q400-703 397-686Q394-669 386-654L824-216Q851-189 836-154.5Q821-120 783-120Q772-120 761.5-124.5Q751-129 743-137ZM600-520 520-600 743-823Q751-831 761.5-835.5Q772-840 783-840Q821-840 835.5-805Q850-770 823-743ZM240-640Q273-640 296.5-663.5Q320-687 320-720Q320-753 296.5-776.5Q273-800 240-800Q207-800 183.5-776.5Q160-753 160-720Q160-687 183.5-663.5Q207-640 240-640ZM480-460Q488-460 494-466Q500-472 500-480Q500-488 494-494Q488-500 480-500Q472-500 466-494Q460-488 460-480Q460-472 466-466Q472-460 480-460ZM240-160Q273-160 296.5-183.5Q320-207 320-240Q320-273 296.5-296.5Q273-320 240-320Q207-320 183.5-296.5Q160-273 160-240Q160-207 183.5-183.5Q207-160 240-160Z",
  "content_paste": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H367Q378-875 410-897.5Q442-920 480-920Q520-920 551.5-897.5Q583-875 594-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H680V-680Q680-663 668.5-651.5Q657-640 640-640H320Q303-640 291.5-651.5Q280-663 280-680V-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM480-760Q497-760 508.5-771.5Q520-783 520-800Q520-817 508.5-828.5Q497-840 480-840Q463-840 451.5-828.5Q440-817 440-800Q440-783 451.5-771.5Q463-760 480-760Z",
  "content_paste_go": "M727-240H520Q503-240 491.5-251.5Q480-263 480-280Q480-297 491.5-308.5Q503-320 520-320H727L691-356Q680-367 680-383.5Q680-400 692-412Q703-423 720-423Q737-423 748-412L852-308Q864-296 864-280Q864-264 852-252L748-148Q736-136 720-136.5Q704-137 692-149Q681-161 680.5-177Q680-193 692-205ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H367Q378-875 410-897.5Q442-920 480-920Q520-920 551.5-897.5Q583-875 594-840H760Q793-840 816.5-816.5Q840-793 840-760V-560Q840-543 828.5-531.5Q817-520 800-520Q783-520 771.5-531.5Q760-543 760-560V-760Q760-760 760-760Q760-760 760-760H680V-680Q680-663 668.5-651.5Q657-640 640-640H320Q303-640 291.5-651.5Q280-663 280-680V-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H360Q377-200 388.5-188.5Q400-177 400-160Q400-143 388.5-131.5Q377-120 360-120ZM480-760Q497-760 508.5-771.5Q520-783 520-800Q520-817 508.5-828.5Q497-840 480-840Q463-840 451.5-828.5Q440-817 440-800Q440-783 451.5-771.5Q463-760 480-760Z",
  "contrast": "M480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM520-163Q639-178 719.5-267.5Q800-357 800-480Q800-603 719.5-692.5Q639-782 520-797Z",
  "crop": "M680-80V-200H280Q247-200 223.5-223.5Q200-247 200-280V-680H80Q63-680 51.5-691.5Q40-703 40-720Q40-737 51.5-748.5Q63-760 80-760H200V-880Q200-897 211.5-908.5Q223-920 240-920Q257-920 268.5-908.5Q280-897 280-880V-280Q280-280 280-280Q280-280 280-280H880Q897-280 908.5-268.5Q920-257 920-240Q920-223 908.5-211.5Q897-200 880-200H760V-80Q760-63 748.5-51.5Q737-40 720-40Q703-40 691.5-51.5Q680-63 680-80ZM680-360V-680Q680-680 680-680Q680-680 680-680H360V-760H680Q713-760 736.5-736.5Q760-713 760-680V-360Z",
  "crop_free": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320V-200Q200-200 200-200Q200-200 200-200H320Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM760-120H640Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200H760Q760-200 760-200Q760-200 760-200V-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320V-200Q840-167 816.5-143.5Q793-120 760-120ZM120-640V-760Q120-793 143.5-816.5Q167-840 200-840H320Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760H200Q200-760 200-760Q200-760 200-760V-640Q200-623 188.5-611.5Q177-600 160-600Q143-600 131.5-611.5Q120-623 120-640ZM760-640V-760Q760-760 760-760Q760-760 760-760H640Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840H760Q793-840 816.5-816.5Q840-793 840-760V-640Q840-623 828.5-611.5Q817-600 800-600Q783-600 771.5-611.5Q760-623 760-640Z",
  "crop_landscape": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "crop_portrait": "M720-80H240Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H720Q753-880 776.5-856.5Q800-833 800-800V-160Q800-127 776.5-103.5Q753-80 720-80ZM240-160H720Q720-160 720-160Q720-160 720-160V-800Q720-800 720-800Q720-800 720-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160ZM240-160Q240-160 240-160Q240-160 240-160V-800Q240-800 240-800Q240-800 240-800Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160Z",
  "crop_rotate": "M480 0Q304 0 171.5-110.5Q39-221 7-389Q4-406 13.5-420Q23-434 40-436Q57-438 70-427.5Q83-417 86-400Q112-269 210.5-181Q309-93 444-82L410-116Q399-127 399-144Q399-161 410-172Q421-183 438-183Q455-183 466-172L598-40Q605-33 602.5-24Q600-15 591-13Q564-6 536.5-3Q509 0 480 0ZM360-280Q327-280 303.5-303.5Q280-327 280-360V-600H240Q223-600 211.5-611.5Q200-623 200-640Q200-657 211.5-668.5Q223-680 240-680H280V-720Q280-737 291.5-748.5Q303-760 320-760Q337-760 348.5-748.5Q360-737 360-720V-360Q360-360 360-360Q360-360 360-360H720Q737-360 748.5-348.5Q760-337 760-320Q760-303 748.5-291.5Q737-280 720-280H680V-240Q680-223 668.5-211.5Q657-200 640-200Q623-200 611.5-211.5Q600-223 600-240V-280ZM600-440V-600Q600-600 600-600Q600-600 600-600H440V-680H600Q633-680 656.5-656.5Q680-633 680-600V-440ZM480-960Q656-960 788.5-850Q921-740 953-571Q956-554 946.5-540Q937-526 920-524Q903-522 890-532.5Q877-543 874-560Q848-691 749.5-779Q651-867 516-878L550-844Q561-833 561-816Q561-799 550-788Q539-777 522-777Q505-777 494-788L362-920Q355-927 357.5-936Q360-945 369-947Q396-954 423.5-957Q451-960 480-960Z",
  "crop_square": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Z",
  "dark_mode": "M480-120Q329-120 224.5-224.5Q120-329 120-480Q120-618 210-719.5Q300-821 440-838Q453-840 463-834.5Q473-829 479-820Q485-811 485.5-799Q486-787 478-776Q461-750 452.5-721Q444-692 444-660Q444-570 507-507Q570-444 660-444Q691-444 721.5-453Q752-462 776-478Q787-485 798.5-484.5Q810-484 819-479Q829-474 834.5-464Q840-454 838-440Q824-302 720.5-211Q617-120 480-120ZM480-200Q568-200 638-248.5Q708-297 740-375Q720-370 700-367Q680-364 660-364Q537-364 450.5-450.5Q364-537 364-660Q364-680 367-700Q370-720 375-740Q297-708 248.5-638Q200-568 200-480Q200-364 282-282Q364-200 480-200ZM470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Q470-470 470-470Z",
  "data_object": "M600-160Q583-160 571.5-171.5Q560-183 560-200Q560-217 571.5-228.5Q583-240 600-240H680Q697-240 708.5-251.5Q720-263 720-280V-360Q720-398 742-429Q764-460 800-473V-487Q764-500 742-531Q720-562 720-600V-680Q720-697 708.5-708.5Q697-720 680-720H600Q583-720 571.5-731.5Q560-743 560-760Q560-777 571.5-788.5Q583-800 600-800H680Q730-800 765-765Q800-730 800-680V-600Q800-583 811.5-571.5Q823-560 840-560Q857-560 868.5-548.5Q880-537 880-520V-440Q880-423 868.5-411.5Q857-400 840-400Q823-400 811.5-388.5Q800-377 800-360V-280Q800-230 765-195Q730-160 680-160ZM280-160Q230-160 195-195Q160-230 160-280V-360Q160-377 148.5-388.5Q137-400 120-400Q103-400 91.5-411.5Q80-423 80-440V-520Q80-537 91.5-548.5Q103-560 120-560Q137-560 148.5-571.5Q160-583 160-600V-680Q160-730 195-765Q230-800 280-800H360Q377-800 388.5-788.5Q400-777 400-760Q400-743 388.5-731.5Q377-720 360-720H280Q263-720 251.5-708.5Q240-697 240-680V-600Q240-562 218-531Q196-500 160-487V-473Q196-460 218-429Q240-398 240-360V-280Q240-263 251.5-251.5Q263-240 280-240H360Q377-240 388.5-228.5Q400-217 400-200Q400-183 388.5-171.5Q377-160 360-160Z",
  "delete": "M280-120Q247-120 223.5-143.5Q200-167 200-200V-720Q183-720 171.5-731.5Q160-743 160-760Q160-777 171.5-788.5Q183-800 200-800H360Q360-817 371.5-828.5Q383-840 400-840H560Q577-840 588.5-828.5Q600-817 600-800H760Q777-800 788.5-788.5Q800-777 800-760Q800-743 788.5-731.5Q777-720 760-720V-200Q760-167 736.5-143.5Q713-120 680-120ZM680-720H280V-200Q280-200 280-200Q280-200 280-200H680Q680-200 680-200Q680-200 680-200ZM440-320V-600Q440-617 428.5-628.5Q417-640 400-640Q383-640 371.5-628.5Q360-617 360-600V-320Q360-303 371.5-291.5Q383-280 400-280Q417-280 428.5-291.5Q440-303 440-320ZM600-320V-600Q600-617 588.5-628.5Q577-640 560-640Q543-640 531.5-628.5Q520-617 520-600V-320Q520-303 531.5-291.5Q543-280 560-280Q577-280 588.5-291.5Q600-303 600-320ZM280-720V-200Q280-200 280-200Q280-200 280-200Q280-200 280-200Q280-200 280-200Z",
  "delete_forever": "M280-120Q247-120 223.5-143.5Q200-167 200-200V-720Q183-720 171.5-731.5Q160-743 160-760Q160-777 171.5-788.5Q183-800 200-800H360Q360-817 371.5-828.5Q383-840 400-840H560Q577-840 588.5-828.5Q600-817 600-800H760Q777-800 788.5-788.5Q800-777 800-760Q800-743 788.5-731.5Q777-720 760-720V-200Q760-167 736.5-143.5Q713-120 680-120ZM680-720H280V-200Q280-200 280-200Q280-200 280-200H680Q680-200 680-200Q680-200 680-200ZM280-720V-200Q280-200 280-200Q280-200 280-200Q280-200 280-200Q280-200 280-200ZM480-404 556-328Q567-317 584-317Q601-317 612-328Q623-339 623-356Q623-373 612-384L536-460L612-536Q623-547 623-564Q623-581 612-592Q601-603 584-603Q567-603 556-592L480-516L404-592Q393-603 376-603Q359-603 348-592Q337-581 337-564Q337-547 348-536L424-460L348-384Q337-373 337-356Q337-339 348-328Q359-317 376-317Q393-317 404-328Z",
  "delete_sweep": "M200-200Q167-200 143.5-223.5Q120-247 120-280V-640Q103-640 91.5-651.5Q80-663 80-680Q80-697 91.5-708.5Q103-720 120-720H240V-740Q240-757 251.5-768.5Q263-780 280-780H360Q377-780 388.5-768.5Q400-757 400-740V-720H520Q537-720 548.5-708.5Q560-697 560-680Q560-663 548.5-651.5Q537-640 520-640V-280Q520-247 496.5-223.5Q473-200 440-200ZM640-240Q623-240 611.5-251.5Q600-263 600-280Q600-297 611.5-308.5Q623-320 640-320H720Q737-320 748.5-308.5Q760-297 760-280Q760-263 748.5-251.5Q737-240 720-240ZM640-400Q623-400 611.5-411.5Q600-423 600-440Q600-457 611.5-468.5Q623-480 640-480H800Q817-480 828.5-468.5Q840-457 840-440Q840-423 828.5-411.5Q817-400 800-400ZM640-560Q623-560 611.5-571.5Q600-583 600-600Q600-617 611.5-628.5Q623-640 640-640H840Q857-640 868.5-628.5Q880-617 880-600Q880-583 868.5-571.5Q857-560 840-560ZM200-640V-280Q200-280 200-280Q200-280 200-280H440Q440-280 440-280Q440-280 440-280V-640Z",
  "description": "M360-240H600Q617-240 628.5-251.5Q640-263 640-280Q640-297 628.5-308.5Q617-320 600-320H360Q343-320 331.5-308.5Q320-297 320-280Q320-263 331.5-251.5Q343-240 360-240ZM360-400H600Q617-400 628.5-411.5Q640-423 640-440Q640-457 628.5-468.5Q617-480 600-480H360Q343-480 331.5-468.5Q320-457 320-440Q320-423 331.5-411.5Q343-400 360-400ZM240-80Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-160Q800-127 776.5-103.5Q753-80 720-80ZM520-640V-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-600H560Q543-600 531.5-611.5Q520-623 520-640ZM240-800V-640Q240-623 240-611.5Q240-600 240-600V-800V-640Q240-623 240-611.5Q240-600 240-600V-160Q240-160 240-160Q240-160 240-160Q240-160 240-160Q240-160 240-160V-800Q240-800 240-800Q240-800 240-800Z",
  "disabled_by_default": "M480-424 596-308Q607-297 624-297Q641-297 652-308Q663-319 663-336Q663-353 652-364L536-480L652-596Q663-607 663-624Q663-641 652-652Q641-663 624-663Q607-663 596-652L480-536L364-652Q353-663 336-663Q319-663 308-652Q297-641 297-624Q297-607 308-596L424-480L308-364Q297-353 297-336Q297-319 308-308Q319-297 336-297Q353-297 364-308ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "done_all": "M70-438Q58-450 58.5-466Q59-482 71-494Q83-505 99-505.5Q115-506 127-494L269-352Q276-345 283-338Q290-331 297-324Q309-312 308.5-296Q308-280 296-268Q284-257 268-256.5Q252-256 240-268ZM494-353 834-693Q846-705 862-704.5Q878-704 890-692Q901-680 901.5-664Q902-648 890-636L522-268Q510-256 494-256Q478-256 466-268L296-438Q285-449 285-465.5Q285-482 296-494Q308-506 324.5-506Q341-506 353-494ZM663-635 522-494Q511-483 494.5-483Q478-483 466-494Q454-506 454-522.5Q454-539 466-551L607-692Q618-703 634.5-703Q651-703 663-692Q675-680 675-663.5Q675-647 663-635Z",
  "download": "M452-348 308-492Q296-504 296.5-520Q297-536 308-548Q320-560 336.5-560.5Q353-561 365-549L440-474V-760Q440-777 451.5-788.5Q463-800 480-800Q497-800 508.5-788.5Q520-777 520-760V-474L595-549Q607-561 623.5-560.5Q640-560 652-548Q663-536 663.5-520Q664-504 652-492L508-348Q502-342 495-339.5Q488-337 480-337Q472-337 465-339.5Q458-342 452-348ZM240-160Q207-160 183.5-183.5Q160-207 160-240V-320Q160-337 171.5-348.5Q183-360 200-360Q217-360 228.5-348.5Q240-337 240-320V-240Q240-240 240-240Q240-240 240-240H720Q720-240 720-240Q720-240 720-240V-320Q720-337 731.5-348.5Q743-360 760-360Q777-360 788.5-348.5Q800-337 800-320V-240Q800-207 776.5-183.5Q753-160 720-160Z",
  "draft": "M240-80Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-160Q800-127 776.5-103.5Q753-80 720-80ZM520-640V-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-600H560Q543-600 531.5-611.5Q520-623 520-640ZM240-800V-640Q240-623 240-611.5Q240-600 240-600V-800V-640Q240-623 240-611.5Q240-600 240-600V-160Q240-160 240-160Q240-160 240-160Q240-160 240-160Q240-160 240-160V-800Q240-800 240-800Q240-800 240-800Z",
  "draw": "M200-120Q183-120 171.5-131.5Q160-143 160-160V-257Q160-273 166-287.5Q172-302 183-313L687-816Q699-828 714-834Q729-840 744-840Q760-840 774.5-834Q789-828 800-816L856-760Q868-749 874-734.5Q880-720 880-704Q880-689 874-674Q868-659 856-647L353-143Q342-132 327.5-126Q313-120 297-120ZM240-200H296L689-592L661-621L632-649L240-256ZM800-703 743-760ZM661-621 632-649 689-592ZM560-120Q634-120 697-157Q760-194 760-260Q760-292 744-315.5Q728-339 702-359Q688-369 672-369Q656-369 645-357Q634-345 634-327.5Q634-310 648-300Q662-289 671-280Q680-271 680-260Q680-237 643.5-218.5Q607-200 560-200Q543-200 531.5-188.5Q520-177 520-160Q520-143 531.5-131.5Q543-120 560-120ZM360-720Q360-706 342.5-694.5Q325-683 262-654Q182-619 151-590.5Q120-562 120-520Q120-494 132-474Q144-454 163-439Q176-428 192-429.5Q208-431 219-444Q230-457 229-473Q228-489 215-500Q208-505 204-510Q200-515 200-520Q200-532 218-544Q236-556 294-581Q382-619 411-650Q440-681 440-720Q440-775 396-807.5Q352-840 280-840Q235-840 199.5-824Q164-808 145-785Q134-772 136-756Q138-740 151-730Q164-719 180-721Q196-723 207-734Q221-748 238-754Q255-760 280-760Q321-760 340.5-748Q360-736 360-720Z",
  "drive_file_rename_outline": "M400-120 560-280H800Q833-280 856.5-256.5Q880-233 880-200Q880-167 856.5-143.5Q833-120 800-120ZM160-200H217L608-591L551-648L160-257ZM80-160V-257Q80-273 86-287.5Q92-302 103-313L608-817Q620-828 634.5-834Q649-840 665-840Q681-840 696-834Q711-828 722-816L777-760Q789-749 794.5-734Q800-719 800-704Q800-688 794.5-673.5Q789-659 777-647L273-143Q262-132 247.5-126Q233-120 217-120H120Q103-120 91.5-131.5Q80-143 80-160ZM720-704 664-760ZM579-619 551-648 608-591Z",
  "edit": "M200-200H257L648-591L591-648L200-257ZM160-120Q143-120 131.5-131.5Q120-143 120-160V-257Q120-273 126-287.5Q132-302 143-313L648-817Q660-828 674.5-834Q689-840 705-840Q721-840 736-834Q751-828 762-816L817-760Q829-749 834.5-734Q840-719 840-704Q840-688 834.5-673.5Q829-659 817-647L313-143Q302-132 287.5-126Q273-120 257-120ZM760-704 704-760ZM619-619 591-648 648-591Z",
  "edit_document": "M560-120V-186Q560-194 563-201.5Q566-209 572-215L781-423Q790-432 801-436Q812-440 823-440Q835-440 846-435.5Q857-431 866-422L903-385Q911-376 915.5-365Q920-354 920-343Q920-332 916-320.5Q912-309 903-300L695-92Q689-86 681.5-83Q674-80 666-80H600Q583-80 571.5-91.5Q560-103 560-120ZM860-343 823-380ZM620-140H658L779-262L742-299L620-178ZM240-80Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-550Q800-533 788.5-521.5Q777-510 760-510Q743-510 731.5-521.5Q720-533 720-550V-600H560Q543-600 531.5-611.5Q520-623 520-640V-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160H440Q457-160 468.5-148.5Q480-137 480-120Q480-103 468.5-91.5Q457-80 440-80ZM240-160V-204Q240-220 240-234.5Q240-249 240-260V-520V-600V-800Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160ZM761-281 742-299 779-262Z",
  "error": "M480-280Q497-280 508.5-291.5Q520-303 520-320Q520-337 508.5-348.5Q497-360 480-360Q463-360 451.5-348.5Q440-337 440-320Q440-303 451.5-291.5Q463-280 480-280ZM520-480V-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640V-480Q440-463 451.5-451.5Q463-440 480-440Q497-440 508.5-451.5Q520-463 520-480ZM480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM480-160Q614-160 707-253Q800-346 800-480Q800-614 707-707Q614-800 480-800Q346-800 253-707Q160-614 160-480Q160-346 253-253Q346-160 480-160ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "expand_content": "M280-280H400Q417-280 428.5-268.5Q440-257 440-240Q440-223 428.5-211.5Q417-200 400-200H240Q223-200 211.5-211.5Q200-223 200-240V-400Q200-417 211.5-428.5Q223-440 240-440Q257-440 268.5-428.5Q280-417 280-400ZM680-680H560Q543-680 531.5-691.5Q520-703 520-720Q520-737 531.5-748.5Q543-760 560-760H720Q737-760 748.5-748.5Q760-737 760-720V-560Q760-543 748.5-531.5Q737-520 720-520Q703-520 691.5-531.5Q680-543 680-560Z",
  "expand_more": "M452-373 268-557Q257-568 257-585Q257-602 268-613Q279-624 296-624Q313-624 324-613L480-457L636-613Q647-624 664-624Q681-624 692-613Q703-602 703-585Q703-568 692-557L508-373Q502-367 495-364.5Q488-362 480-362Q472-362 465-364.5Q458-367 452-373Z",
  "filter_1": "M560-680V-400Q560-383 571.5-371.5Q583-360 600-360Q617-360 628.5-371.5Q640-383 640-400V-720Q640-737 628.5-748.5Q617-760 600-760H520Q503-760 491.5-748.5Q480-737 480-720Q480-703 491.5-691.5Q503-680 520-680ZM320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z",
  "filter_b_and_w": "M760-120H200Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200Q200-200 200-200Q200-200 200-200H480V-520L760-200Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H480V-520Z",
  "filter_none": "M320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z",
  "find_replace": "M440-720Q377-720 326.5-685.5Q276-651 254-595Q248-580 234.5-572.5Q221-565 205-568Q189-571 179.5-583.5Q170-596 175-610Q202-694 274-747Q346-800 440-800Q499-800 550.5-777.5Q602-755 640-716V-760Q640-777 651.5-788.5Q663-800 680-800Q697-800 708.5-788.5Q720-777 720-760V-600Q720-583 708.5-571.5Q697-560 680-560H520Q503-560 491.5-571.5Q480-583 480-600Q480-617 491.5-628.5Q503-640 520-640H600Q571-676 530.5-698Q490-720 440-720ZM440-240Q381-240 329.5-262.5Q278-285 240-324V-280Q240-263 228.5-251.5Q217-240 200-240Q183-240 171.5-251.5Q160-263 160-280V-440Q160-457 171.5-468.5Q183-480 200-480H360Q377-480 388.5-468.5Q400-457 400-440Q400-423 388.5-411.5Q377-400 360-400H280Q309-364 349.5-342Q390-320 440-320Q502-320 551.5-353Q601-386 624-440Q631-456 644.5-465.5Q658-475 675-472Q692-468 700-454Q708-440 703-424Q696-404 686.5-386.5Q677-369 664-352L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L608-296Q572-269 529.5-254.5Q487-240 440-240Z",
  "fit_screen": "M800-640V-720Q800-720 800-720Q800-720 800-720H720Q703-720 691.5-731.5Q680-743 680-760Q680-777 691.5-788.5Q703-800 720-800H800Q833-800 856.5-776.5Q880-753 880-720V-640Q880-623 868.5-611.5Q857-600 840-600Q823-600 811.5-611.5Q800-623 800-640ZM80-640V-720Q80-753 103.5-776.5Q127-800 160-800H240Q257-800 268.5-788.5Q280-777 280-760Q280-743 268.5-731.5Q257-720 240-720H160Q160-720 160-720Q160-720 160-720V-640Q160-623 148.5-611.5Q137-600 120-600Q103-600 91.5-611.5Q80-623 80-640ZM800-160H720Q703-160 691.5-171.5Q680-183 680-200Q680-217 691.5-228.5Q703-240 720-240H800Q800-240 800-240Q800-240 800-240V-320Q800-337 811.5-348.5Q823-360 840-360Q857-360 868.5-348.5Q880-337 880-320V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-320Q80-337 91.5-348.5Q103-360 120-360Q137-360 148.5-348.5Q160-337 160-320V-240Q160-240 160-240Q160-240 160-240H240Q257-240 268.5-228.5Q280-217 280-200Q280-183 268.5-171.5Q257-160 240-160ZM240-400V-560Q240-593 263.5-616.5Q287-640 320-640H640Q673-640 696.5-616.5Q720-593 720-560V-400Q720-367 696.5-343.5Q673-320 640-320H320Q287-320 263.5-343.5Q240-367 240-400ZM320-400H640Q640-400 640-400Q640-400 640-400V-560Q640-560 640-560Q640-560 640-560H320Q320-560 320-560Q320-560 320-560V-400Q320-400 320-400Q320-400 320-400ZM320-400Q320-400 320-400Q320-400 320-400V-560Q320-560 320-560Q320-560 320-560Q320-560 320-560Q320-560 320-560V-400Q320-400 320-400Q320-400 320-400Z",
  "fit_width": "M120-160V-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800V-160Q200-143 188.5-131.5Q177-120 160-120Q143-120 131.5-131.5Q120-143 120-160ZM760-160V-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800V-160Q840-143 828.5-131.5Q817-120 800-120Q783-120 771.5-131.5Q760-143 760-160ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440Z",
  "flip": "M640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H320Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H320Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM440-80V-880Q440-897 451.5-908.5Q463-920 480-920Q497-920 508.5-908.5Q520-897 520-880V-80Q520-63 508.5-51.5Q497-40 480-40Q463-40 451.5-51.5Q440-63 440-80Z",
  "flip_to_back": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640V-200Q200-200 200-200Q200-200 200-200H640Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM320-600Q303-600 291.5-611.5Q280-623 280-640Q280-657 291.5-668.5Q303-680 320-680Q337-680 348.5-668.5Q360-657 360-640Q360-623 348.5-611.5Q337-600 320-600ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM320-280Q303-280 291.5-291.5Q280-303 280-320Q280-337 291.5-348.5Q303-360 320-360Q337-360 348.5-348.5Q360-337 360-320Q360-303 348.5-291.5Q337-280 320-280ZM640-280Q623-280 611.5-291.5Q600-303 600-320Q600-337 611.5-348.5Q623-360 640-360Q657-360 668.5-348.5Q680-337 680-320Q680-303 668.5-291.5Q657-280 640-280ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280Z",
  "flip_to_front": "M360-280Q327-280 303.5-303.5Q280-327 280-360V-760Q280-793 303.5-816.5Q327-840 360-840H760Q793-840 816.5-816.5Q840-793 840-760V-360Q840-327 816.5-303.5Q793-280 760-280ZM360-360H760Q760-360 760-360Q760-360 760-360V-760Q760-760 760-760Q760-760 760-760H360Q360-760 360-760Q360-760 360-760V-360Q360-360 360-360Q360-360 360-360ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120Z",
  "folder": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H367Q383-800 397.5-794Q412-788 423-777L480-720H800Q833-720 856.5-696.5Q880-673 880-640V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-640Q800-640 800-640Q800-640 800-640H447L367-720Q367-720 367-720Q367-720 367-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-640Q160-640 160-640Q160-640 160-640V-240Q160-240 160-240Q160-240 160-240Z",
  "folder_open": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H367Q383-800 397.5-794Q412-788 423-777L480-720H840Q857-720 868.5-708.5Q880-697 880-680Q880-663 868.5-651.5Q857-640 840-640H447L367-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240L239-503Q247-529 268.5-544.5Q290-560 316-560H832Q873-560 896.5-527.5Q920-495 909-457L837-217Q829-191 807.5-175.5Q786-160 760-160ZM244-240H760Q760-240 760-240Q760-240 760-240L832-480Q832-480 832-480Q832-480 832-480H316Q316-480 316-480Q316-480 316-480ZM160-502V-720Q160-720 160-720Q160-720 160-720V-640Q160-640 160-601Q160-562 160-502ZM244-240 316-480Q316-480 316-480Q316-480 316-480Q316-480 316-480Q316-480 316-480L244-240Q244-240 244-240Q244-240 244-240Z",
  "font_download": "M384-362H576L611-265Q615-254 625-247Q635-240 647-240Q667-240 679.5-256.5Q692-273 684-293L532-695Q527-706 517-713Q507-720 495-720H465Q453-720 443-713Q433-706 428-695L276-293Q268-274 280-257Q292-240 312-240Q325-240 334.5-247Q344-254 349-266ZM408-432 478-630H482L552-432ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-160Q880-127 856.5-103.5Q833-80 800-80ZM160-160H800Q800-160 800-160Q800-160 800-160V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-160Q160-160 160-160Q160-160 160-160ZM160-800Q160-800 160-800Q160-800 160-800V-160Q160-160 160-160Q160-160 160-160Q160-160 160-160Q160-160 160-160V-800Q160-800 160-800Q160-800 160-800Z",
  "format_align_center": "M160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM320-280Q303-280 291.5-291.5Q280-303 280-320Q280-337 291.5-348.5Q303-360 320-360H640Q657-360 668.5-348.5Q680-337 680-320Q680-303 668.5-291.5Q657-280 640-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM320-600Q303-600 291.5-611.5Q280-623 280-640Q280-657 291.5-668.5Q303-680 320-680H640Q657-680 668.5-668.5Q680-657 680-640Q680-623 668.5-611.5Q657-600 640-600ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760Z",
  "format_align_justify": "M160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680H800Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760Z",
  "format_align_left": "M160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H560Q577-360 588.5-348.5Q600-337 600-320Q600-303 588.5-291.5Q577-280 560-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680H560Q577-680 588.5-668.5Q600-657 600-640Q600-623 588.5-611.5Q577-600 560-600ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760Z",
  "format_align_right": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM400-600Q383-600 371.5-611.5Q360-623 360-640Q360-657 371.5-668.5Q383-680 400-680H800Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM400-280Q383-280 371.5-291.5Q360-303 360-320Q360-337 371.5-348.5Q383-360 400-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "format_bold": "M352-200Q319-200 295.5-223.5Q272-247 272-280V-680Q272-713 295.5-736.5Q319-760 352-760H493Q558-760 613-720Q668-680 668-609Q668-558 645-530.5Q622-503 602-491Q627-480 657.5-450Q688-420 688-360Q688-271 623-235.5Q558-200 501-200ZM393-312H497Q545-312 555.5-336.5Q566-361 566-372Q566-383 555.5-407.5Q545-432 494-432H393ZM393-540H486Q519-540 534-557Q549-574 549-595Q549-619 532-634Q515-649 488-649H393Z",
  "format_clear": "M528-546 435-639Q422-652 408.5-665.5Q395-679 382-692Q363-711 373.5-735.5Q384-760 411-760H740Q765-760 782.5-742.5Q800-725 800-700Q800-675 782.5-657.5Q765-640 740-640H568ZM764-84 460-388 396-237Q389-220 373.5-210Q358-200 340-200Q308-200 290-227Q272-254 285-284L368-480L84-764Q73-775 73-792Q73-809 84-820Q95-831 112-831Q129-831 140-820L820-140Q831-129 831-112Q831-95 820-84Q809-73 792-73Q775-73 764-84Z",
  "format_color_fill": "M332-932 647-617Q670-594 670-560Q670-526 647-503L457-313Q434-290 400-290Q366-290 343-313L153-503Q130-526 130-560Q130-594 153-617L343-808L275-876Q263-888 263.5-904Q264-920 276-932Q288-943 304-943.5Q320-944 332-932ZM400-751 209-560Q209-560 209-560Q209-560 209-560H591Q591-560 591-560Q591-560 591-560ZM680-360Q680-381 692.5-405Q705-429 720-450Q729-462 739-475Q749-488 760-500Q771-488 781-475Q791-462 800-450Q815-429 827.5-405Q840-381 840-360Q840-327 816.5-303.5Q793-280 760-280Q727-280 703.5-303.5Q680-327 680-360ZM160 0Q127 0 103.5-23.5Q80-47 80-80Q80-113 103.5-136.5Q127-160 160-160H800Q833-160 856.5-136.5Q880-113 880-80Q880-47 856.5-23.5Q833 0 800 0Z",
  "format_color_reset": "M480-120Q347-120 253.5-212.5Q160-305 160-436Q160-487 176-534Q192-581 224-624L84-764Q73-775 73-792Q73-809 84-820Q95-831 112-831Q129-831 140-820L820-140Q831-129 831-112Q831-95 820-84Q809-73 792-73Q775-73 764-84L668-180Q627-151 580-135.5Q533-120 480-120ZM480-200Q516-200 548.5-210Q581-220 610-238L280-566Q259-534 249.5-502Q240-470 240-436Q240-338 310-269Q380-200 480-200ZM443-404Q443-404 443-404Q443-404 443-404Q443-404 443-404Q443-404 443-404Q443-404 443-404Q443-404 443-404ZM706-658Q766-598 787.5-521.5Q809-445 791-367Q788-353 777-345Q766-337 752-337Q730-337 720.5-355Q711-373 716-393Q731-448 711-503.5Q691-559 650-600L480-768L420-709Q409-698 392-698.5Q375-699 364-710Q352-722 352-738.5Q352-755 364-766L438-839Q447-848 458-852Q469-856 480-856Q491-856 502-851.5Q513-847 522-839ZM578-580Q578-580 578-580Q578-580 578-580Z",
  "format_color_text": "M120 0Q103 0 91.5-11.5Q80-23 80-40V-120Q80-137 91.5-148.5Q103-160 120-160H840Q857-160 868.5-148.5Q880-137 880-120V-40Q880-23 868.5-11.5Q857 0 840 0ZM285-280Q262-280 248.5-299.5Q235-319 243-341L419-810Q424-824 436-832Q448-840 462-840H498Q513-840 524.5-832Q536-824 541-810L718-340Q726-318 712.5-299Q699-280 676-280Q662-280 650-288Q638-296 633-310L594-424H368L327-309Q322-295 310.5-287.5Q299-280 285-280ZM396-504H564L482-736H478Z",
  "format_h1": "M200-320V-640Q200-657 211.5-668.5Q223-680 240-680Q257-680 268.5-668.5Q280-657 280-640V-520H440V-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640V-320Q520-303 508.5-291.5Q497-280 480-280Q463-280 451.5-291.5Q440-303 440-320V-440H280V-320Q280-303 268.5-291.5Q257-280 240-280Q223-280 211.5-291.5Q200-303 200-320ZM680-320V-600H640Q623-600 611.5-611.5Q600-623 600-640Q600-657 611.5-668.5Q623-680 640-680H720Q737-680 748.5-668.5Q760-657 760-640V-320Q760-303 748.5-291.5Q737-280 720-280Q703-280 691.5-291.5Q680-303 680-320Z",
  "format_h2": "M120-320V-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640V-520H360V-640Q360-657 371.5-668.5Q383-680 400-680Q417-680 428.5-668.5Q440-657 440-640V-320Q440-303 428.5-291.5Q417-280 400-280Q383-280 371.5-291.5Q360-303 360-320V-440H200V-320Q200-303 188.5-291.5Q177-280 160-280Q143-280 131.5-291.5Q120-303 120-320ZM560-280Q543-280 531.5-291.5Q520-303 520-320V-440Q520-473 543.5-496.5Q567-520 600-520H760Q760-520 760-520Q760-520 760-520V-600Q760-600 760-600Q760-600 760-600H560Q543-600 531.5-611.5Q520-623 520-640Q520-657 531.5-668.5Q543-680 560-680H760Q793-680 816.5-656.5Q840-633 840-600V-520Q840-487 816.5-463.5Q793-440 760-440H600Q600-440 600-440Q600-440 600-440V-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280Z",
  "format_h3": "M120-320V-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640V-520H360V-640Q360-657 371.5-668.5Q383-680 400-680Q417-680 428.5-668.5Q440-657 440-640V-320Q440-303 428.5-291.5Q417-280 400-280Q383-280 371.5-291.5Q360-303 360-320V-440H200V-320Q200-303 188.5-291.5Q177-280 160-280Q143-280 131.5-291.5Q120-303 120-320ZM560-280Q543-280 531.5-291.5Q520-303 520-320Q520-337 531.5-348.5Q543-360 560-360H760Q760-360 760-360Q760-360 760-360V-440H640Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520H760V-600Q760-600 760-600Q760-600 760-600H560Q543-600 531.5-611.5Q520-623 520-640Q520-657 531.5-668.5Q543-680 560-680H760Q793-680 816.5-656.5Q840-633 840-600V-360Q840-327 816.5-303.5Q793-280 760-280Z",
  "format_indent_decrease": "M160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680H800Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM246-354 134-466Q128-472 128-480Q128-488 134-494L246-606Q256-616 268-611Q280-606 280-592V-368Q280-354 268-349Q256-344 246-354Z",
  "format_indent_increase": "M160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM480-280Q463-280 451.5-291.5Q440-303 440-320Q440-337 451.5-348.5Q463-360 480-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680H800Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM154-354Q144-344 132-349Q120-354 120-368V-592Q120-606 132-611Q144-616 154-606L266-494Q272-488 272-480Q272-472 266-466Z",
  "format_ink_highlighter": "M160 0Q127 0 103.5-23.5Q80-47 80-80Q80-113 103.5-136.5Q127-160 160-160H800Q833-160 856.5-136.5Q880-113 880-80Q880-47 856.5-23.5Q833 0 800 0ZM584-480 480-584 320-424Q320-424 320-424Q320-424 320-424L423-320Q423-320 423-320Q423-320 423-320ZM537-640 640-537 800-696Q800-696 800-696Q800-696 800-696L696-800Q696-800 696-800Q696-800 696-800ZM453-669 669-453 480-263Q456-239 423.5-239Q391-239 367-263L362-259Q351-250 338-245Q325-240 311-240H189Q175-240 169.5-252Q164-264 174-274L266-365Q242-389 241-422.5Q240-456 264-480ZM453-669 640-856Q664-880 696.5-880Q729-880 753-856L857-753Q881-729 881-696.5Q881-664 857-640L669-453Z",
  "format_italic": "M250-200Q229-200 214.5-214.5Q200-229 200-250Q200-271 214.5-285.5Q229-300 250-300H360L480-660H370Q349-660 334.5-674.5Q320-689 320-710Q320-731 334.5-745.5Q349-760 370-760H670Q691-760 705.5-745.5Q720-731 720-710Q720-689 705.5-674.5Q691-660 670-660H580L460-300H550Q571-300 585.5-285.5Q600-271 600-250Q600-229 585.5-214.5Q571-200 550-200Z",
  "format_letter_spacing": "M313-200 349-164Q360-153 360-136.5Q360-120 348-108Q337-97 320-97Q303-97 292-108L188-212Q176-224 176-240Q176-256 188-268L292-372Q303-383 319.5-383Q336-383 348-372Q360-360 360-343.5Q360-327 348-315L313-280H647L611-316Q600-327 600-343.5Q600-360 612-372Q623-383 640-383Q657-383 668-372L772-268Q784-256 784-240Q784-224 772-212L668-108Q657-97 640.5-97Q624-97 612-108Q600-120 600-136.5Q600-153 612-165L647-200ZM200-520V-840Q200-857 211.5-868.5Q223-880 240-880Q257-880 268.5-868.5Q280-857 280-840V-520Q280-503 268.5-491.5Q257-480 240-480Q223-480 211.5-491.5Q200-503 200-520ZM440-520V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-520Q520-503 508.5-491.5Q497-480 480-480Q463-480 451.5-491.5Q440-503 440-520ZM680-520V-840Q680-857 691.5-868.5Q703-880 720-880Q737-880 748.5-868.5Q760-857 760-840V-520Q760-503 748.5-491.5Q737-480 720-480Q703-480 691.5-491.5Q680-503 680-520Z",
  "format_line_spacing": "M200-646 164-611Q153-600 136.5-600Q120-600 108-612Q97-623 97-640Q97-657 108-668L212-772Q218-778 225-780.5Q232-783 240-783Q248-783 255-780.5Q262-778 268-772L372-668Q383-657 383.5-640.5Q384-624 372-612Q361-601 344.5-600.5Q328-600 316-611L280-646V-314L316-349Q327-360 343.5-360Q360-360 372-348Q383-337 383-320Q383-303 372-292L268-188Q262-182 255-179.5Q248-177 240-177Q232-177 225-179.5Q218-182 212-188L108-292Q97-303 96.5-319.5Q96-336 108-348Q119-359 135.5-359.5Q152-360 164-349L200-314ZM520-200Q503-200 491.5-211.5Q480-223 480-240Q480-257 491.5-268.5Q503-280 520-280H840Q857-280 868.5-268.5Q880-257 880-240Q880-223 868.5-211.5Q857-200 840-200ZM520-440Q503-440 491.5-451.5Q480-463 480-480Q480-497 491.5-508.5Q503-520 520-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440ZM520-680Q503-680 491.5-691.5Q480-703 480-720Q480-737 491.5-748.5Q503-760 520-760H840Q857-760 868.5-748.5Q880-737 880-720Q880-703 868.5-691.5Q857-680 840-680Z",
  "format_list_bulleted": "M400-200Q383-200 371.5-211.5Q360-223 360-240Q360-257 371.5-268.5Q383-280 400-280H800Q817-280 828.5-268.5Q840-257 840-240Q840-223 828.5-211.5Q817-200 800-200ZM400-440Q383-440 371.5-451.5Q360-463 360-480Q360-497 371.5-508.5Q383-520 400-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM400-680Q383-680 371.5-691.5Q360-703 360-720Q360-737 371.5-748.5Q383-760 400-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680ZM200-160Q167-160 143.5-183.5Q120-207 120-240Q120-273 143.5-296.5Q167-320 200-320Q233-320 256.5-296.5Q280-273 280-240Q280-207 256.5-183.5Q233-160 200-160ZM200-400Q167-400 143.5-423.5Q120-447 120-480Q120-513 143.5-536.5Q167-560 200-560Q233-560 256.5-536.5Q280-513 280-480Q280-447 256.5-423.5Q233-400 200-400ZM200-640Q167-640 143.5-663.5Q120-687 120-720Q120-753 143.5-776.5Q167-800 200-800Q233-800 256.5-776.5Q280-753 280-720Q280-687 256.5-663.5Q233-640 200-640Z",
  "format_list_numbered": "M150-80Q137-80 128.5-88.5Q120-97 120-110Q120-123 128.5-131.5Q137-140 150-140H220V-170H190Q177-170 168.5-178.5Q160-187 160-200Q160-213 168.5-221.5Q177-230 190-230H220V-260H150Q137-260 128.5-268.5Q120-277 120-290Q120-303 128.5-311.5Q137-320 150-320H240Q257-320 268.5-308.5Q280-297 280-280V-240Q280-223 268.5-211.5Q257-200 240-200Q257-200 268.5-188.5Q280-177 280-160V-120Q280-103 268.5-91.5Q257-80 240-80ZM150-360Q137-360 128.5-368.5Q120-377 120-390V-470Q120-487 131.5-498.5Q143-510 160-510H220V-540H150Q137-540 128.5-548.5Q120-557 120-570Q120-583 128.5-591.5Q137-600 150-600H240Q257-600 268.5-588.5Q280-577 280-560V-490Q280-473 268.5-461.5Q257-450 240-450H180V-420H250Q263-420 271.5-411.5Q280-403 280-390Q280-377 271.5-368.5Q263-360 250-360ZM180-670V-820H150Q137-820 128.5-828.5Q120-837 120-850Q120-863 128.5-871.5Q137-880 150-880H210Q223-880 231.5-871.5Q240-863 240-850V-670Q240-657 231.5-648.5Q223-640 210-640Q197-640 188.5-648.5Q180-657 180-670ZM400-200Q383-200 371.5-211.5Q360-223 360-240Q360-257 371.5-268.5Q383-280 400-280H800Q817-280 828.5-268.5Q840-257 840-240Q840-223 828.5-211.5Q817-200 800-200ZM400-440Q383-440 371.5-451.5Q360-463 360-480Q360-497 371.5-508.5Q383-520 400-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM400-680Q383-680 371.5-691.5Q360-703 360-720Q360-737 371.5-748.5Q383-760 400-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680Z",
  "format_paint": "M440-80Q407-80 383.5-103.5Q360-127 360-160V-320H240Q207-320 183.5-343.5Q160-367 160-400V-680Q160-746 207-793Q254-840 320-840H760Q777-840 788.5-828.5Q800-817 800-800V-400Q800-367 776.5-343.5Q753-320 720-320H600V-160Q600-127 576.5-103.5Q553-80 520-80ZM240-560H720V-760H680V-640Q680-623 668.5-611.5Q657-600 640-600Q623-600 611.5-611.5Q600-623 600-640V-760H560V-720Q560-703 548.5-691.5Q537-680 520-680Q503-680 491.5-691.5Q480-703 480-720V-760H320Q287-760 263.5-736.5Q240-713 240-680ZM240-400H720Q720-400 720-400Q720-400 720-400V-480H240V-400Q240-400 240-400Q240-400 240-400ZM240-400Q240-400 240-400Q240-400 240-400V-480V-400Q240-400 240-400Q240-400 240-400Z",
  "format_paragraph": "M360-200V-400Q277-400 218.5-458.5Q160-517 160-600Q160-683 218.5-741.5Q277-800 360-800H680Q697-800 708.5-788.5Q720-777 720-760Q720-743 708.5-731.5Q697-720 680-720H640V-200Q640-183 628.5-171.5Q617-160 600-160Q583-160 571.5-171.5Q560-183 560-200V-720H440V-200Q440-183 428.5-171.5Q417-160 400-160Q383-160 371.5-171.5Q360-183 360-200Z",
  "format_shapes": "M327-361 441-661Q444-670 452-675Q460-680 469-680H491Q500-680 508-675Q516-670 519-661L633-358Q638-344 630-332Q622-320 607-320Q598-320 590-325.5Q582-331 579-340L554-412H408L383-339Q380-330 372-325Q364-320 355-320Q339-320 330.5-333Q322-346 327-361ZM426-464H534L482-614H478ZM40-80V-240Q40-257 51.5-268.5Q63-280 80-280H120V-680H80Q63-680 51.5-691.5Q40-703 40-720V-880Q40-897 51.5-908.5Q63-920 80-920H240Q257-920 268.5-908.5Q280-897 280-880V-840H680V-880Q680-897 691.5-908.5Q703-920 720-920H880Q897-920 908.5-908.5Q920-897 920-880V-720Q920-703 908.5-691.5Q897-680 880-680H840V-280H880Q897-280 908.5-268.5Q920-257 920-240V-80Q920-63 908.5-51.5Q897-40 880-40H720Q703-40 691.5-51.5Q680-63 680-80V-120H280V-80Q280-63 268.5-51.5Q257-40 240-40H80Q63-40 51.5-51.5Q40-63 40-80ZM280-200H680V-240Q680-257 691.5-268.5Q703-280 720-280H760V-680H720Q703-680 691.5-691.5Q680-703 680-720V-760H280V-720Q280-703 268.5-691.5Q257-680 240-680H200V-280H240Q257-280 268.5-268.5Q280-257 280-240ZM120-760H200V-840H120ZM760-760H840V-840H760ZM760-120H840V-200H760ZM120-120H200V-200H120ZM200-760ZM760-760ZM760-200ZM200-200Z",
  "format_size": "M560-680H420Q395-680 377.5-697.5Q360-715 360-740Q360-765 377.5-782.5Q395-800 420-800H820Q845-800 862.5-782.5Q880-765 880-740Q880-715 862.5-697.5Q845-680 820-680H680V-220Q680-195 662.5-177.5Q645-160 620-160Q595-160 577.5-177.5Q560-195 560-220ZM200-480H140Q115-480 97.5-497.5Q80-515 80-540Q80-565 97.5-582.5Q115-600 140-600H380Q405-600 422.5-582.5Q440-565 440-540Q440-515 422.5-497.5Q405-480 380-480H320V-220Q320-195 302.5-177.5Q285-160 260-160Q235-160 217.5-177.5Q200-195 200-220Z",
  "format_strikethrough": "M120-400Q103-400 91.5-411.5Q80-423 80-440Q80-457 91.5-468.5Q103-480 120-480H840Q857-480 868.5-468.5Q880-457 880-440Q880-423 868.5-411.5Q857-400 840-400ZM420-560V-680H260Q235-680 217.5-697.5Q200-715 200-740Q200-765 217.5-782.5Q235-800 260-800H700Q725-800 742.5-782.5Q760-765 760-740Q760-715 742.5-697.5Q725-680 700-680H540V-560ZM420-320H540V-220Q540-195 522.5-177.5Q505-160 480-160Q455-160 437.5-177.5Q420-195 420-220Z",
  "format_textdirection_l_to_r": "M440-800V-400Q440-383 428.5-371.5Q417-360 400-360Q383-360 371.5-371.5Q360-383 360-400V-560Q294-560 247-607Q200-654 200-720Q200-786 247-833Q294-880 360-880H640Q657-880 668.5-868.5Q680-857 680-840Q680-823 668.5-811.5Q657-800 640-800H600V-400Q600-383 588.5-371.5Q577-360 560-360Q543-360 531.5-371.5Q520-383 520-400V-800ZM360-640V-800Q327-800 303.5-776.5Q280-753 280-720Q280-687 303.5-663.5Q327-640 360-640ZM360-720Q360-720 360-720Q360-720 360-720Q360-720 360-720Q360-720 360-720ZM688-200H160Q143-200 131.5-211.5Q120-223 120-240Q120-257 131.5-268.5Q143-280 160-280H688L652-316Q641-327 641-344Q641-361 652-372Q663-383 680-383Q697-383 708-372L812-268Q824-256 824-240Q824-224 812-212L708-108Q697-97 680-97Q663-97 652-108Q641-119 641-136Q641-153 652-164Z",
  "format_underlined": "M240-120Q223-120 211.5-131.5Q200-143 200-160Q200-177 211.5-188.5Q223-200 240-200H720Q737-200 748.5-188.5Q760-177 760-160Q760-143 748.5-131.5Q737-120 720-120ZM267-510V-789Q267-810 282.5-825Q298-840 319-840Q340-840 355-825Q370-810 370-789V-504Q370-448 398-413Q426-378 480-378Q534-378 562-413Q590-448 590-504V-789Q590-810 605.5-825Q621-840 642-840Q663-840 678-825Q693-810 693-789V-510Q693-406 637-343Q581-280 480-280Q379-280 323-343Q267-406 267-510Z",
  "functions": "M500-480 253-708Q247-714 243.5-721.5Q240-729 240-737V-760Q240-777 251.5-788.5Q263-800 280-800H660Q685-800 702.5-782.5Q720-765 720-740Q720-715 702.5-697.5Q685-680 660-680H431L615-509Q628-497 628-480Q628-463 615-451L431-280H660Q685-280 702.5-262.5Q720-245 720-220Q720-195 702.5-177.5Q685-160 660-160H269Q257-160 248.5-168.5Q240-177 240-189V-227Q240-233 242-238.5Q244-244 249-249Z",
  "gpp_maybe": "M480-320Q497-320 508.5-331.5Q520-343 520-360Q520-377 508.5-388.5Q497-400 480-400Q463-400 451.5-388.5Q440-377 440-360Q440-343 451.5-331.5Q463-320 480-320ZM520-520V-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640V-520Q440-503 451.5-491.5Q463-480 480-480Q497-480 508.5-491.5Q520-503 520-520ZM455-88Q320-133 240-254.5Q160-376 160-516V-705Q160-730 174.5-750Q189-770 212-779L452-869Q466-874 480-874Q494-874 508-869L748-779Q771-770 785.5-750Q800-730 800-705V-516Q800-376 720-254.5Q640-133 505-88Q499-86 493-85Q487-84 480-84Q473-84 467-85Q461-86 455-88ZM480-164Q584-197 652-296Q720-395 720-516V-705Q720-705 720-705Q720-705 720-705L480-795Q480-795 480-795Q480-795 480-795L240-705Q240-705 240-705Q240-705 240-705V-516Q240-395 308-296Q376-197 480-164ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "gradient": "M440-440V-520H520V-440ZM360-360V-440H440V-360ZM520-360V-440H600V-360ZM600-440V-520H680V-440ZM280-440V-520H360V-440ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM280-200H360V-280H280ZM440-200H520V-280H440ZM760-200V-280ZM200-280H280V-360H360V-280H440V-360H520V-280H600V-360H680V-280H760V-360H680V-440H760V-520V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-440H280V-360H200ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM760-440V-360V-440ZM600-280V-200H680V-280Z",
  "grid_4x4": "M200-200H120Q103-200 91.5-211.5Q80-223 80-240Q80-257 91.5-268.5Q103-280 120-280H200V-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H200V-680H120Q103-680 91.5-691.5Q80-703 80-720Q80-737 91.5-748.5Q103-760 120-760H200V-840Q200-857 211.5-868.5Q223-880 240-880Q257-880 268.5-868.5Q280-857 280-840V-760H440V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-760H680V-840Q680-857 691.5-868.5Q703-880 720-880Q737-880 748.5-868.5Q760-857 760-840V-760H840Q857-760 868.5-748.5Q880-737 880-720Q880-703 868.5-691.5Q857-680 840-680H760V-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440H760V-280H840Q857-280 868.5-268.5Q880-257 880-240Q880-223 868.5-211.5Q857-200 840-200H760V-120Q760-103 748.5-91.5Q737-80 720-80Q703-80 691.5-91.5Q680-103 680-120V-200H520V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120V-200H280V-120Q280-103 268.5-91.5Q257-80 240-80Q223-80 211.5-91.5Q200-103 200-120ZM280-280H440V-440H280ZM520-280H680V-440H520ZM280-520H440V-680H280ZM520-520H680V-680H520Z",
  "grid_on": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H333V-333H200V-200Q200-200 200-200Q200-200 200-200ZM413-200H547V-333H413ZM627-200H760Q760-200 760-200Q760-200 760-200V-333H627ZM200-413H333V-547H200ZM413-413H547V-547H413ZM627-413H760V-547H627ZM200-627H333V-760H200Q200-760 200-760Q200-760 200-760ZM413-627H547V-760H413ZM627-627H760V-760Q760-760 760-760Q760-760 760-760H627Z",
  "grid_view": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-600Q440-567 416.5-543.5Q393-520 360-520ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H360Q393-440 416.5-416.5Q440-393 440-360V-200Q440-167 416.5-143.5Q393-120 360-120ZM600-520Q567-520 543.5-543.5Q520-567 520-600V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM600-120Q567-120 543.5-143.5Q520-167 520-200V-360Q520-393 543.5-416.5Q567-440 600-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-600H360V-760H200ZM600-600H760V-760H600ZM600-200H760V-360H600ZM200-200H360V-360H200ZM600-600ZM600-360ZM360-360ZM360-600Z",
  "height": "M440-273V-687L404-651Q393-640 376.5-640Q360-640 348-652Q337-663 337-680Q337-697 348-708L452-812Q458-818 465-820.5Q472-823 480-823Q488-823 495-820.5Q502-818 508-812L612-708Q623-697 623-680.5Q623-664 612-652Q600-640 583.5-640Q567-640 555-652L520-687V-273L556-309Q567-320 583.5-320Q600-320 612-308Q623-297 623-280Q623-263 612-252L508-148Q502-142 495-139.5Q488-137 480-137Q472-137 465-139.5Q458-142 452-148L348-252Q337-263 336.5-279.5Q336-296 348-308Q359-319 376-319Q393-319 404-308Z",
  "history": "M480-120Q354-120 257-196.5Q160-273 131-392Q127-407 137-419.5Q147-432 164-434Q180-436 193-428Q206-420 211-404Q235-314 310-257Q385-200 480-200Q597-200 678.5-281.5Q760-363 760-480Q760-597 678.5-678.5Q597-760 480-760Q411-760 351-728Q291-696 250-640H320Q337-640 348.5-628.5Q360-617 360-600Q360-583 348.5-571.5Q337-560 320-560H160Q143-560 131.5-571.5Q120-583 120-600V-760Q120-777 131.5-788.5Q143-800 160-800Q177-800 188.5-788.5Q200-777 200-760V-706Q251-770 324.5-805Q398-840 480-840Q555-840 620.5-811.5Q686-783 734.5-734.5Q783-686 811.5-620.5Q840-555 840-480Q840-405 811.5-339.5Q783-274 734.5-225.5Q686-177 620.5-148.5Q555-120 480-120ZM520-496 620-396Q631-385 631-368Q631-351 620-340Q609-329 592-329Q575-329 564-340L452-452Q446-458 443-465.5Q440-473 440-481V-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Z",
  "horizontal_distribute": "M120-80Q103-80 91.5-91.5Q80-103 80-120V-840Q80-857 91.5-868.5Q103-880 120-880Q137-880 148.5-868.5Q160-857 160-840V-120Q160-103 148.5-91.5Q137-80 120-80ZM420-340V-620Q420-645 437.5-662.5Q455-680 480-680Q505-680 522.5-662.5Q540-645 540-620V-340Q540-315 522.5-297.5Q505-280 480-280Q455-280 437.5-297.5Q420-315 420-340ZM800-120V-840Q800-857 811.5-868.5Q823-880 840-880Q857-880 868.5-868.5Q880-857 880-840V-120Q880-103 868.5-91.5Q857-80 840-80Q823-80 811.5-91.5Q800-103 800-120Z",
  "horizontal_rule": "M200-440Q183-440 171.5-451.5Q160-463 160-480Q160-497 171.5-508.5Q183-520 200-520H760Q777-520 788.5-508.5Q800-497 800-480Q800-463 788.5-451.5Q777-440 760-440Z",
  "horizontal_split": "M160-200Q143-200 131.5-211.5Q120-223 120-240V-400Q120-417 131.5-428.5Q143-440 160-440H800Q817-440 828.5-428.5Q840-417 840-400V-240Q840-223 828.5-211.5Q817-200 800-200ZM160-520Q143-520 131.5-531.5Q120-543 120-560Q120-577 131.5-588.5Q143-600 160-600H800Q817-600 828.5-588.5Q840-577 840-560Q840-543 828.5-531.5Q817-520 800-520ZM160-680Q143-680 131.5-691.5Q120-703 120-720Q120-737 131.5-748.5Q143-760 160-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680Z",
  "html": "M0-390V-570Q0-583 8.5-591.5Q17-600 30-600Q43-600 51.5-591.5Q60-583 60-570V-520H140V-570Q140-583 148.5-591.5Q157-600 170-600Q183-600 191.5-591.5Q200-583 200-570V-390Q200-377 191.5-368.5Q183-360 170-360Q157-360 148.5-368.5Q140-377 140-390V-460H60V-390Q60-377 51.5-368.5Q43-360 30-360Q17-360 8.5-368.5Q0-377 0-390ZM310-390V-540H270Q257-540 248.5-548.5Q240-557 240-570Q240-583 248.5-591.5Q257-600 270-600H410Q423-600 431.5-591.5Q440-583 440-570Q440-557 431.5-548.5Q423-540 410-540H370V-390Q370-377 361.5-368.5Q353-360 340-360Q327-360 318.5-368.5Q310-377 310-390ZM480-390V-560Q480-577 491.5-588.5Q503-600 520-600H700Q717-600 728.5-588.5Q740-577 740-560V-390Q740-377 731.5-368.5Q723-360 710-360Q697-360 688.5-368.5Q680-377 680-390V-540H640V-430Q640-417 631.5-408.5Q623-400 610-400Q597-400 588.5-408.5Q580-417 580-430V-540H540V-390Q540-377 531.5-368.5Q523-360 510-360Q497-360 488.5-368.5Q480-377 480-390ZM830-360Q817-360 808.5-368.5Q800-377 800-390V-570Q800-583 808.5-591.5Q817-600 830-600Q843-600 851.5-591.5Q860-583 860-570V-420H930Q943-420 951.5-411.5Q960-403 960-390Q960-377 951.5-368.5Q943-360 930-360Z",
  "image": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM280-280H680Q692-280 698-291Q704-302 696-312L586-459Q580-467 570-467Q560-467 554-459L450-320L376-419Q370-427 360-427Q350-427 344-419L264-312Q256-302 262-291Q268-280 280-280Z",
  "info": "M520-320V-480Q520-497 508.5-508.5Q497-520 480-520Q463-520 451.5-508.5Q440-497 440-480V-320Q440-303 451.5-291.5Q463-280 480-280Q497-280 508.5-291.5Q520-303 520-320ZM520-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600Q497-600 508.5-611.5Q520-623 520-640ZM480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM480-160Q614-160 707-253Q800-346 800-480Q800-614 707-707Q614-800 480-800Q346-800 253-707Q160-614 160-480Q160-346 253-253Q346-160 480-160ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "ink_eraser": "M690-240H840Q857-240 868.5-228.5Q880-217 880-200Q880-183 868.5-171.5Q857-160 840-160H610ZM207-160Q199-160 191.5-163Q184-166 178-172L105-245Q82-268 81.5-302Q81-336 104-360L544-816Q567-840 600.5-840Q634-840 657-817L856-618Q879-595 879-561Q879-527 856-504L532-172Q526-166 518.5-163Q511-160 503-160ZM486-240 800-562Q800-562 800-562Q800-562 800-562L602-760Q602-760 602-760Q602-760 602-760L160-304Q160-304 160-304Q160-304 160-304L224-240ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "insert_page_break": "M240-80Q207-80 183.5-103.5Q160-127 160-160V-240Q160-257 171.5-268.5Q183-280 200-280Q217-280 228.5-268.5Q240-257 240-240V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-240Q720-257 731.5-268.5Q743-280 760-280Q777-280 788.5-268.5Q800-257 800-240V-160Q800-127 776.5-103.5Q753-80 720-80ZM160-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-560Q800-543 788.5-531.5Q777-520 760-520Q743-520 731.5-531.5Q720-543 720-560V-600H560Q543-600 531.5-611.5Q520-623 520-640V-800H240Q240-800 240-800Q240-800 240-800V-560Q240-543 228.5-531.5Q217-520 200-520Q183-520 171.5-531.5Q160-543 160-560ZM400-360Q383-360 371.5-371.5Q360-383 360-400Q360-417 371.5-428.5Q383-440 400-440H560Q577-440 588.5-428.5Q600-417 600-400Q600-383 588.5-371.5Q577-360 560-360ZM720-360Q703-360 691.5-371.5Q680-383 680-400Q680-417 691.5-428.5Q703-440 720-440H880Q897-440 908.5-428.5Q920-417 920-400Q920-383 908.5-371.5Q897-360 880-360ZM80-360Q63-360 51.5-371.5Q40-383 40-400Q40-417 51.5-428.5Q63-440 80-440H240Q257-440 268.5-428.5Q280-417 280-400Q280-383 268.5-371.5Q257-360 240-360ZM480-520Q480-520 480-520Q480-520 480-520ZM480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Z",
  "join_inner": "M122-678Q167-723 227.5-744.5Q288-766 352-758Q369-756 379-743.5Q389-731 387-714Q385-697 372-687Q359-677 342-679Q297-684 254-668.5Q211-653 179-621Q151-593 135.5-556.5Q120-520 120-480Q120-440 135.5-403.5Q151-367 179-339Q211-307 254-291.5Q297-276 342-281Q359-283 371.5-273Q384-263 386-246Q388-230 378.5-217Q369-204 352-202Q288-194 227.5-215.5Q167-237 122-282Q82-322 61-373Q40-424 40-480Q40-536 61-587Q82-638 122-678ZM838-282Q793-237 732.5-217Q672-197 609-203Q592-205 582-217Q572-229 574-246Q576-263 588.5-273Q601-283 618-281Q663-276 706-291.5Q749-307 781-339Q809-367 824.5-403.5Q840-440 840-480Q840-520 824.5-556.5Q809-593 781-621Q749-653 706-668.5Q663-684 618-679Q601-677 588.5-687Q576-697 574-714Q572-731 582-743.5Q592-756 609-758Q673-765 733-744Q793-723 838-678Q878-638 899-587Q920-536 920-480Q920-424 899-373Q878-322 838-282ZM454-272Q408-310 384-365Q360-420 360-480Q360-540 384-595Q408-650 454-688Q459-693 466-695.5Q473-698 480-698Q487-698 494-695.5Q501-693 506-688Q552-650 576-595Q600-540 600-480Q600-420 576-365Q552-310 506-272Q501-267 494-264.5Q487-262 480-262Q473-262 466-264.5Q459-267 454-272Z",
  "keyboard": "M160-200Q127-200 103.5-223.5Q80-247 80-280V-680Q80-713 103.5-736.5Q127-760 160-760H800Q833-760 856.5-736.5Q880-713 880-680V-280Q880-247 856.5-223.5Q833-200 800-200ZM160-280H800Q800-280 800-280Q800-280 800-280V-680Q800-680 800-680Q800-680 800-680H160Q160-680 160-680Q160-680 160-680V-280Q160-280 160-280Q160-280 160-280ZM360-320H600Q617-320 628.5-331.5Q640-343 640-360Q640-377 628.5-388.5Q617-400 600-400H360Q343-400 331.5-388.5Q320-377 320-360Q320-343 331.5-331.5Q343-320 360-320ZM160-280Q160-280 160-280Q160-280 160-280V-680Q160-680 160-680Q160-680 160-680Q160-680 160-680Q160-680 160-680V-280Q160-280 160-280Q160-280 160-280ZM240-560Q257-560 268.5-571.5Q280-583 280-600Q280-617 268.5-628.5Q257-640 240-640Q223-640 211.5-628.5Q200-617 200-600Q200-583 211.5-571.5Q223-560 240-560ZM360-560Q377-560 388.5-571.5Q400-583 400-600Q400-617 388.5-628.5Q377-640 360-640Q343-640 331.5-628.5Q320-617 320-600Q320-583 331.5-571.5Q343-560 360-560ZM480-560Q497-560 508.5-571.5Q520-583 520-600Q520-617 508.5-628.5Q497-640 480-640Q463-640 451.5-628.5Q440-617 440-600Q440-583 451.5-571.5Q463-560 480-560ZM600-560Q617-560 628.5-571.5Q640-583 640-600Q640-617 628.5-628.5Q617-640 600-640Q583-640 571.5-628.5Q560-617 560-600Q560-583 571.5-571.5Q583-560 600-560ZM720-560Q737-560 748.5-571.5Q760-583 760-600Q760-617 748.5-628.5Q737-640 720-640Q703-640 691.5-628.5Q680-617 680-600Q680-583 691.5-571.5Q703-560 720-560ZM240-440Q257-440 268.5-451.5Q280-463 280-480Q280-497 268.5-508.5Q257-520 240-520Q223-520 211.5-508.5Q200-497 200-480Q200-463 211.5-451.5Q223-440 240-440ZM360-440Q377-440 388.5-451.5Q400-463 400-480Q400-497 388.5-508.5Q377-520 360-520Q343-520 331.5-508.5Q320-497 320-480Q320-463 331.5-451.5Q343-440 360-440ZM480-440Q497-440 508.5-451.5Q520-463 520-480Q520-497 508.5-508.5Q497-520 480-520Q463-520 451.5-508.5Q440-497 440-480Q440-463 451.5-451.5Q463-440 480-440ZM600-440Q617-440 628.5-451.5Q640-463 640-480Q640-497 628.5-508.5Q617-520 600-520Q583-520 571.5-508.5Q560-497 560-480Q560-463 571.5-451.5Q583-440 600-440ZM720-440Q737-440 748.5-451.5Q760-463 760-480Q760-497 748.5-508.5Q737-520 720-520Q703-520 691.5-508.5Q680-497 680-480Q680-463 691.5-451.5Q703-440 720-440Z",
  "keyboard_arrow_down": "M452-372 268-556Q257-567 257-584Q257-601 268-612Q279-623 296-623Q313-623 324-612L480-456L636-612Q647-623 664-623Q681-623 692-612Q703-601 703-584Q703-567 692-556L508-372Q502-366 495-363.5Q488-361 480-361Q472-361 465-363.5Q458-366 452-372Z",
  "keyboard_arrow_up": "M480-528 324-372Q313-361 296-361Q279-361 268-372Q257-383 257-400Q257-417 268-428L452-612Q464-624 480-624Q496-624 508-612L692-428Q703-417 703-400Q703-383 692-372Q681-361 664-361Q647-361 636-372Z",
  "keyboard_tab": "M800-280V-680Q800-697 811.5-708.5Q823-720 840-720Q857-720 868.5-708.5Q880-697 880-680V-280Q880-263 868.5-251.5Q857-240 840-240Q823-240 811.5-251.5Q800-263 800-280ZM567-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H567L452-636Q441-647 440.5-663.5Q440-680 452-692Q463-703 480-703Q497-703 508-692L692-508Q698-502 700.5-495Q703-488 703-480Q703-472 700.5-465Q698-458 692-452L508-268Q497-257 480.5-257Q464-257 452-268Q440-280 440-296.5Q440-313 452-325Z",
  "language": "M480.5-80Q398-80 325-111.5Q252-143 197.5-197.5Q143-252 111.5-325Q80-398 80-480.5Q80-563 111.5-635.5Q143-708 197.5-762.5Q252-817 325-848.5Q398-880 480.5-880Q563-880 635.5-848.5Q708-817 762.5-762.5Q817-708 848.5-635.5Q880-563 880-480.5Q880-398 848.5-325Q817-252 762.5-197.5Q708-143 635.5-111.5Q563-80 480.5-80ZM480-162Q506-198 525-237Q544-276 556-320H404Q416-276 435-237Q454-198 480-162ZM376-178Q358-211 344.5-246.5Q331-282 322-320H204Q233-270 276.5-233Q320-196 376-178ZM584-178Q640-196 683.5-233Q727-270 756-320H638Q629-282 615.5-246.5Q602-211 584-178ZM170-400H306Q303-420 301.5-439.5Q300-459 300-480Q300-501 301.5-520.5Q303-540 306-560H170Q165-540 162.5-520.5Q160-501 160-480Q160-459 162.5-439.5Q165-420 170-400ZM386-400H574Q577-420 578.5-439.5Q580-459 580-480Q580-501 578.5-520.5Q577-540 574-560H386Q383-540 381.5-520.5Q380-501 380-480Q380-459 381.5-439.5Q383-420 386-400ZM654-400H790Q795-420 797.5-439.5Q800-459 800-480Q800-501 797.5-520.5Q795-540 790-560H654Q657-540 658.5-520.5Q660-501 660-480Q660-459 658.5-439.5Q657-420 654-400ZM638-640H756Q727-690 683.5-727Q640-764 584-782Q602-749 615.5-713.5Q629-678 638-640ZM404-640H556Q544-684 525-723Q506-762 480-798Q454-762 435-723Q416-684 404-640ZM204-640H322Q331-678 344.5-713.5Q358-749 376-782Q320-764 276.5-727Q233-690 204-640Z",
  "layers": "M161-366Q145-378 145.5-397.5Q146-417 162-429Q173-437 186-437Q199-437 210-429L480-220Q480-220 480-220Q480-220 480-220L750-429Q761-437 774-437Q787-437 798-429Q814-417 814.5-397.5Q815-378 799-366L529-156Q507-139 480-139Q453-139 431-156ZM431-358 201-537Q170-561 170-600Q170-639 201-663L431-842Q453-859 480-859Q507-859 529-842L759-663Q790-639 790-600Q790-561 759-537L529-358Q507-341 480-341Q453-341 431-358ZM480-422 710-600Q710-600 710-600Q710-600 710-600L480-778Q480-778 480-778Q480-778 480-778L250-600Q250-600 250-600Q250-600 250-600L480-422Q480-422 480-422Q480-422 480-422ZM480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Q480-600 480-600Z",
  "light": "M320-280H200Q167-280 143.5-303.5Q120-327 120-360Q120-500 212-601.5Q304-703 440-718V-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800V-718Q656-703 748-601.5Q840-500 840-360Q840-327 816.5-303.5Q793-280 760-280H640Q640-214 593-167Q546-120 480-120Q414-120 367-167Q320-214 320-280ZM200-360H760Q760-476 678-558Q596-640 480-640Q364-640 282-558Q200-476 200-360ZM560-280H400Q400-247 423.5-223.5Q447-200 480-200Q513-200 536.5-223.5Q560-247 560-280ZM480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Z",
  "light_mode": "M480-360Q530-360 565-395Q600-430 600-480Q600-530 565-565Q530-600 480-600Q430-600 395-565Q360-530 360-480Q360-430 395-395Q430-360 480-360ZM480-280Q397-280 338.5-338.5Q280-397 280-480Q280-563 338.5-621.5Q397-680 480-680Q563-680 621.5-621.5Q680-563 680-480Q680-397 621.5-338.5Q563-280 480-280ZM80-440Q63-440 51.5-451.5Q40-463 40-480Q40-497 51.5-508.5Q63-520 80-520H160Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520H880Q897-520 908.5-508.5Q920-497 920-480Q920-463 908.5-451.5Q897-440 880-440ZM440-800V-880Q440-897 451.5-908.5Q463-920 480-920Q497-920 508.5-908.5Q520-897 520-880V-800Q520-783 508.5-771.5Q497-760 480-760Q463-760 451.5-771.5Q440-783 440-800ZM440-80V-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160V-80Q520-63 508.5-51.5Q497-40 480-40Q463-40 451.5-51.5Q440-63 440-80ZM226-678 183-720Q171-731 171.5-748Q172-765 183-777Q195-789 212-789Q229-789 240-777L282-734Q293-722 293-706Q293-690 282-678Q271-666 254.5-666.5Q238-667 226-678ZM720-183 678-226Q667-238 667-254.5Q667-271 678-282Q689-294 705.5-293.5Q722-293 734-282L777-240Q789-229 788.5-212Q788-195 777-183Q765-171 748-171Q731-171 720-183ZM678-678Q666-689 666.5-705.5Q667-722 678-734L720-777Q731-789 748-788.5Q765-788 777-777Q789-765 789-748Q789-731 777-720L734-678Q722-667 706-667Q690-667 678-678ZM183-183Q171-195 171-212Q171-229 183-240L226-282Q238-293 254.5-293Q271-293 282-282Q294-271 293.5-254.5Q293-238 282-226L240-183Q229-171 212-171.5Q195-172 183-183ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "line_style": "M159-160Q142-160 131-171.5Q120-183 120-200Q120-217 132-228.5Q144-240 161-240Q178-240 189-228.5Q200-217 200-200Q200-183 188-171.5Q176-160 159-160ZM319-160Q302-160 291-171.5Q280-183 280-200Q280-217 292-228.5Q304-240 321-240Q338-240 349-228.5Q360-217 360-200Q360-183 348-171.5Q336-160 319-160ZM479-160Q462-160 451-171.5Q440-183 440-200Q440-217 451.5-228.5Q463-240 480-240Q497-240 508.5-228.5Q520-217 520-200Q520-183 508-171.5Q496-160 479-160ZM640-160Q623-160 611.5-171.5Q600-183 600-200Q600-217 612-228.5Q624-240 641-240Q658-240 669-228.5Q680-217 680-200Q680-183 668.5-171.5Q657-160 640-160ZM800-160Q783-160 771.5-171.5Q760-183 760-200Q760-217 771.5-228.5Q783-240 800-240Q817-240 828.5-228.5Q840-217 840-200Q840-183 828.5-171.5Q817-160 800-160ZM159-320Q142-320 131-331.5Q120-343 120-360Q120-377 131.5-388.5Q143-400 160-400H281Q298-400 309-388.5Q320-377 320-360Q320-343 308.5-331.5Q297-320 280-320ZM419-320Q402-320 391-331.5Q380-343 380-360Q380-377 391.5-388.5Q403-400 420-400H541Q558-400 569-388.5Q580-377 580-360Q580-343 568.5-331.5Q557-320 540-320ZM679-320Q662-320 651-331.5Q640-343 640-360Q640-377 651.5-388.5Q663-400 680-400H801Q818-400 829-388.5Q840-377 840-360Q840-343 828.5-331.5Q817-320 800-320ZM159-480Q142-480 131-491.5Q120-503 120-520Q120-537 131.5-548.5Q143-560 160-560H401Q418-560 429-548.5Q440-537 440-520Q440-503 428.5-491.5Q417-480 400-480ZM559-480Q542-480 531-491.5Q520-503 520-520Q520-537 531.5-548.5Q543-560 560-560H801Q818-560 829-548.5Q840-537 840-520Q840-503 828.5-491.5Q817-480 800-480ZM160-640Q143-640 131.5-651.5Q120-663 120-680V-760Q120-777 131.5-788.5Q143-800 160-800H800Q817-800 828.5-788.5Q840-777 840-760V-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "line_weight": "M140-160Q132-160 126-166Q120-172 120-180Q120-188 126-194Q132-200 140-200H820Q828-200 834-194Q840-188 840-180Q840-172 834-166Q828-160 820-160ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480V-520Q120-537 131.5-548.5Q143-560 160-560H800Q817-560 828.5-548.5Q840-537 840-520V-480Q840-463 828.5-451.5Q817-440 800-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680V-760Q120-777 131.5-788.5Q143-800 160-800H800Q817-800 828.5-788.5Q840-777 840-760V-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "link": "M280-280Q197-280 138.5-338.5Q80-397 80-480Q80-563 138.5-621.5Q197-680 280-680H400Q417-680 428.5-668.5Q440-657 440-640Q440-623 428.5-611.5Q417-600 400-600H280Q230-600 195-565Q160-530 160-480Q160-430 195-395Q230-360 280-360H400Q417-360 428.5-348.5Q440-337 440-320Q440-303 428.5-291.5Q417-280 400-280ZM360-440Q343-440 331.5-451.5Q320-463 320-480Q320-497 331.5-508.5Q343-520 360-520H600Q617-520 628.5-508.5Q640-497 640-480Q640-463 628.5-451.5Q617-440 600-440ZM560-280Q543-280 531.5-291.5Q520-303 520-320Q520-337 531.5-348.5Q543-360 560-360H680Q730-360 765-395Q800-430 800-480Q800-530 765-565Q730-600 680-600H560Q543-600 531.5-611.5Q520-623 520-640Q520-657 531.5-668.5Q543-680 560-680H680Q763-680 821.5-621.5Q880-563 880-480Q880-397 821.5-338.5Q763-280 680-280Z",
  "link_off": "M625-449 554-520H600Q617-520 628.5-508.5Q640-497 640-480Q640-470 636-462Q632-454 625-449ZM820-84Q809-73 792-73Q775-73 764-84L84-764Q73-775 73-792Q73-809 84-820Q95-831 112-831Q129-831 140-820L820-140Q831-129 831-112Q831-95 820-84ZM280-280Q197-280 138.5-338.5Q80-397 80-480Q80-549 122-603Q164-657 230-674L304-600H280Q230-600 195-565Q160-530 160-480Q160-430 195-395Q230-360 280-360H400Q417-360 428.5-348.5Q440-337 440-320Q440-303 428.5-291.5Q417-280 400-280ZM360-440Q343-440 331.5-451.5Q320-463 320-480Q320-497 331.5-508.5Q343-520 360-520H385L464-440ZM740-328Q731-342 733.5-358Q736-374 750-383Q773-400 786.5-425Q800-450 800-480Q800-530 765-565Q730-600 680-600H560Q543-600 531.5-611.5Q520-623 520-640Q520-657 531.5-668.5Q543-680 560-680H680Q763-680 821.5-621.5Q880-563 880-480Q880-431 857.5-388.5Q835-346 795-318Q781-309 765-311.5Q749-314 740-328Z",
  "list_alt": "M320-280Q337-280 348.5-291.5Q360-303 360-320Q360-337 348.5-348.5Q337-360 320-360Q303-360 291.5-348.5Q280-337 280-320Q280-303 291.5-291.5Q303-280 320-280ZM320-440Q337-440 348.5-451.5Q360-463 360-480Q360-497 348.5-508.5Q337-520 320-520Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM320-600Q337-600 348.5-611.5Q360-623 360-640Q360-657 348.5-668.5Q337-680 320-680Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM480-280H640Q657-280 668.5-291.5Q680-303 680-320Q680-337 668.5-348.5Q657-360 640-360H480Q463-360 451.5-348.5Q440-337 440-320Q440-303 451.5-291.5Q463-280 480-280ZM480-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H480Q463-520 451.5-508.5Q440-497 440-480Q440-463 451.5-451.5Q463-440 480-440ZM480-600H640Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680H480Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "looks_one": "M480-600V-320Q480-303 491.5-291.5Q503-280 520-280Q537-280 548.5-291.5Q560-303 560-320V-640Q560-657 548.5-668.5Q537-680 520-680H440Q423-680 411.5-668.5Q400-657 400-640Q400-623 411.5-611.5Q423-600 440-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "looks_two": "M440-360V-440Q440-440 440-440Q440-440 440-440H520Q553-440 576.5-463.5Q600-487 600-520V-600Q600-633 576.5-656.5Q553-680 520-680H400Q383-680 371.5-668.5Q360-657 360-640Q360-623 371.5-611.5Q383-600 400-600H520Q520-600 520-600Q520-600 520-600V-520Q520-520 520-520Q520-520 520-520H440Q407-520 383.5-496.5Q360-473 360-440V-320Q360-303 371.5-291.5Q383-280 400-280H560Q577-280 588.5-291.5Q600-303 600-320Q600-337 588.5-348.5Q577-360 560-360ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "mail": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM800-640 501-453Q496-450 490.5-448.5Q485-447 480-447Q475-447 469.5-448.5Q464-450 459-453L160-640V-240Q160-240 160-240Q160-240 160-240H800Q800-240 800-240Q800-240 800-240ZM480-520 800-720H160ZM160-640V-630Q160-635 160-642.5Q160-650 160-659Q160-679 160-689Q160-699 160-688V-720V-688Q160-699 160-688.5Q160-678 160-659Q160-649 160-641.5Q160-634 160-630V-640V-240Q160-240 160-240Q160-240 160-240Q160-240 160-240Q160-240 160-240Z",
  "manage_search": "M120-200Q103-200 91.5-211.5Q80-223 80-240Q80-257 91.5-268.5Q103-280 120-280H440Q457-280 468.5-268.5Q480-257 480-240Q480-223 468.5-211.5Q457-200 440-200ZM120-400Q103-400 91.5-411.5Q80-423 80-440Q80-457 91.5-468.5Q103-480 120-480H240Q257-480 268.5-468.5Q280-457 280-440Q280-423 268.5-411.5Q257-400 240-400ZM120-600Q103-600 91.5-611.5Q80-623 80-640Q80-657 91.5-668.5Q103-680 120-680H240Q257-680 268.5-668.5Q280-657 280-640Q280-623 268.5-611.5Q257-600 240-600ZM560-320Q477-320 418.5-378.5Q360-437 360-520Q360-603 418.5-661.5Q477-720 560-720Q643-720 701.5-661.5Q760-603 760-520Q760-491 751.5-462.5Q743-434 726-410L852-284Q863-273 863-256Q863-239 852-228Q841-217 824-217Q807-217 796-228L670-354Q646-337 617.5-328.5Q589-320 560-320ZM560-400Q610-400 645-435Q680-470 680-520Q680-570 645-605Q610-640 560-640Q510-640 475-605Q440-570 440-520Q440-470 475-435Q510-400 560-400Z",
  "margin": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760ZM320-600Q337-600 348.5-611.5Q360-623 360-640Q360-657 348.5-668.5Q337-680 320-680Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM480-600Q497-600 508.5-611.5Q520-623 520-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600ZM640-600Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680Q623-680 611.5-668.5Q600-657 600-640Q600-623 611.5-611.5Q623-600 640-600ZM640-440Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520Q623-520 611.5-508.5Q600-497 600-480Q600-463 611.5-451.5Q623-440 640-440ZM480-440Q497-440 508.5-451.5Q520-463 520-480Q520-497 508.5-508.5Q497-520 480-520Q463-520 451.5-508.5Q440-497 440-480Q440-463 451.5-451.5Q463-440 480-440ZM320-440Q337-440 348.5-451.5Q360-463 360-480Q360-497 348.5-508.5Q337-520 320-520Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440Z",
  "markdown": "M610-475 583-502Q574-511 562-510.5Q550-510 541-501Q532-492 532-480Q532-468 541-459L612-388Q624-376 640-376Q656-376 668-388L739-459Q748-468 748-480Q748-492 739-501Q730-510 717.5-510Q705-510 696-501L670-475V-570Q670-583 661.5-591.5Q653-600 640-600Q627-600 618.5-591.5Q610-583 610-570ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM280-540H320V-450Q320-437 328.5-428.5Q337-420 350-420Q363-420 371.5-428.5Q380-437 380-450V-540H420V-390Q420-377 428.5-368.5Q437-360 450-360Q463-360 471.5-368.5Q480-377 480-390V-560Q480-577 468.5-588.5Q457-600 440-600H260Q243-600 231.5-588.5Q220-577 220-560V-390Q220-377 228.5-368.5Q237-360 250-360Q263-360 271.5-368.5Q280-377 280-390Z",
  "match_case": "M247-364 215-275Q211-264 202-258Q193-252 182-252Q163-252 152.5-267.5Q142-283 149-300L287-668Q291-679 300.5-685.5Q310-692 321-692H349Q360-692 370-685.5Q380-679 384-668L522-299Q529-282 518-267Q507-252 489-252Q478-252 469-258.5Q460-265 456-276L425-364ZM270-428H401L337-610H333ZM665-242Q614-242 584-269.5Q554-297 554-342Q554-386 588.5-414.5Q623-443 677-443Q700-443 722-439Q744-435 760-428V-440Q760-469 739.5-487Q719-505 685-505Q670-505 655.5-500.5Q641-496 629-487Q616-477 604.5-480Q593-483 586-491Q579-499 579-510Q579-521 590-529Q610-545 635-552.5Q660-560 686-560Q755-560 789-527.5Q823-495 823-430V-283Q823-270 813.5-261Q804-252 791-252Q778-252 769-261.5Q760-271 760-284V-289H756Q742-266 718-254Q694-242 665-242ZM677-296Q712-296 736.5-320Q761-344 761-376Q747-384 727.5-388.5Q708-393 689-393Q657-393 639-379Q621-365 621-342Q621-322 637-309Q653-296 677-296Z",
  "menu": "M160-240Q143-240 131.5-251.5Q120-263 120-280Q120-297 131.5-308.5Q143-320 160-320H800Q817-320 828.5-308.5Q840-297 840-280Q840-263 828.5-251.5Q817-240 800-240ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680Q120-697 131.5-708.5Q143-720 160-720H800Q817-720 828.5-708.5Q840-697 840-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "menu_book": "M260-320Q307-320 351.5-309.5Q396-299 440-278V-672Q399-696 353-708Q307-720 260-720Q224-720 188.5-713Q153-706 120-692Q120-692 120-692Q120-692 120-692V-296Q120-296 120-296Q120-296 120-296Q155-308 189.5-314Q224-320 260-320ZM520-278Q564-299 608.5-309.5Q653-320 700-320Q736-320 770.5-314Q805-308 840-296Q840-296 840-296Q840-296 840-296V-692Q840-692 840-692Q840-692 840-692Q807-706 771.5-713Q736-720 700-720Q653-720 607-708Q561-696 520-672ZM430-194Q391-217 348-228.5Q305-240 260-240Q218-240 177.5-229Q137-218 100-198Q79-187 59.5-199Q40-211 40-234V-716Q40-727 45.5-737Q51-747 62-752Q108-776 158-788Q208-800 260-800Q318-800 373.5-785Q429-770 480-740Q531-770 586.5-785Q642-800 700-800Q752-800 802-788Q852-776 898-752Q909-747 914.5-737Q920-727 920-716V-234Q920-211 900.5-199Q881-187 860-198Q823-218 782.5-229Q742-240 700-240Q655-240 612-228.5Q569-217 530-194Q519-188 506.5-184.5Q494-181 480-181Q466-181 453.5-184.5Q441-188 430-194ZM280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494Q280-494 280-494ZM560-609Q560-618 566.5-627.5Q573-637 581-640Q610-650 639-655Q668-660 700-660Q720-660 739.5-657.5Q759-655 778-651Q787-649 793.5-641Q800-633 800-623Q800-606 789-598Q778-590 761-594Q747-597 731.5-598.5Q716-600 700-600Q674-600 649-595Q624-590 601-582Q583-575 571.5-583Q560-591 560-609ZM560-389Q560-398 566.5-407.5Q573-417 581-420Q610-430 639-435Q668-440 700-440Q720-440 739.5-437.5Q759-435 778-431Q787-429 793.5-421Q800-413 800-403Q800-386 789-378Q778-370 761-374Q747-377 731.5-378.5Q716-380 700-380Q674-380 649-375.5Q624-371 601-363Q583-356 571.5-363.5Q560-371 560-389ZM560-499Q560-508 566.5-517.5Q573-527 581-530Q610-540 639-545Q668-550 700-550Q720-550 739.5-547.5Q759-545 778-541Q787-539 793.5-531Q800-523 800-513Q800-496 789-488Q778-480 761-484Q747-487 731.5-488.5Q716-490 700-490Q674-490 649-485Q624-480 601-472Q583-465 571.5-473Q560-481 560-499Z",
  "more_horiz": "M240-400Q207-400 183.5-423.5Q160-447 160-480Q160-513 183.5-536.5Q207-560 240-560Q273-560 296.5-536.5Q320-513 320-480Q320-447 296.5-423.5Q273-400 240-400ZM480-400Q447-400 423.5-423.5Q400-447 400-480Q400-513 423.5-536.5Q447-560 480-560Q513-560 536.5-536.5Q560-513 560-480Q560-447 536.5-423.5Q513-400 480-400ZM720-400Q687-400 663.5-423.5Q640-447 640-480Q640-513 663.5-536.5Q687-560 720-560Q753-560 776.5-536.5Q800-513 800-480Q800-447 776.5-423.5Q753-400 720-400Z",
  "more_vert": "M480-160Q447-160 423.5-183.5Q400-207 400-240Q400-273 423.5-296.5Q447-320 480-320Q513-320 536.5-296.5Q560-273 560-240Q560-207 536.5-183.5Q513-160 480-160ZM480-400Q447-400 423.5-423.5Q400-447 400-480Q400-513 423.5-536.5Q447-560 480-560Q513-560 536.5-536.5Q560-513 560-480Q560-447 536.5-423.5Q513-400 480-400ZM480-640Q447-640 423.5-663.5Q400-687 400-720Q400-753 423.5-776.5Q447-800 480-800Q513-800 536.5-776.5Q560-753 560-720Q560-687 536.5-663.5Q513-640 480-640Z",
  "navigate_before": "M432-480 588-324Q599-313 599-296Q599-279 588-268Q577-257 560-257Q543-257 532-268L348-452Q342-458 339.5-465Q337-472 337-480Q337-488 339.5-495Q342-502 348-508L532-692Q543-703 560-703Q577-703 588-692Q599-681 599-664Q599-647 588-636Z",
  "navigate_next": "M504-480 348-636Q337-647 337-664Q337-681 348-692Q359-703 376-703Q393-703 404-692L588-508Q594-502 596.5-495Q599-488 599-480Q599-472 596.5-465Q594-458 588-452L404-268Q393-257 376-257Q359-257 348-268Q337-279 337-296Q337-313 348-324Z",
  "note_add": "M440-360V-280Q440-263 451.5-251.5Q463-240 480-240Q497-240 508.5-251.5Q520-263 520-280V-360H600Q617-360 628.5-371.5Q640-383 640-400Q640-417 628.5-428.5Q617-440 600-440H520V-520Q520-537 508.5-548.5Q497-560 480-560Q463-560 451.5-548.5Q440-537 440-520V-440H360Q343-440 331.5-428.5Q320-417 320-400Q320-383 331.5-371.5Q343-360 360-360ZM240-80Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-160Q800-127 776.5-103.5Q753-80 720-80ZM520-640V-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-600H560Q543-600 531.5-611.5Q520-623 520-640ZM240-800V-640Q240-623 240-611.5Q240-600 240-600V-800V-640Q240-623 240-611.5Q240-600 240-600V-160Q240-160 240-160Q240-160 240-160Q240-160 240-160Q240-160 240-160V-800Q240-800 240-800Q240-800 240-800Z",
  "notes": "M160-240Q143-240 131.5-251.5Q120-263 120-280Q120-297 131.5-308.5Q143-320 160-320H560Q577-320 588.5-308.5Q600-297 600-280Q600-263 588.5-251.5Q577-240 560-240ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680Q120-697 131.5-708.5Q143-720 160-720H800Q817-720 828.5-708.5Q840-697 840-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "numbers": "M360-320 327-189Q324-176 314-168Q304-160 290-160Q271-160 259-175Q247-190 252-208L280-320H171Q151-320 139-335.5Q127-351 132-370Q135-384 146-392Q157-400 171-400H300L340-560H231Q211-560 199-575.5Q187-591 192-610Q195-624 206-632Q217-640 231-640H360L393-771Q396-784 406-792Q416-800 430-800Q449-800 461-785Q473-770 468-752L440-640H600L633-771Q636-784 646-792Q656-800 670-800Q689-800 701-785Q713-770 708-752L680-640H789Q809-640 821-624.5Q833-609 828-590Q825-576 814-568Q803-560 789-560H660L620-400H729Q749-400 761-384.5Q773-369 768-350Q765-336 754-328Q743-320 729-320H600L567-189Q564-176 554-168Q544-160 530-160Q511-160 499-175Q487-190 492-208L520-320ZM380-400H540L580-560H420Z",
  "opacity": "M160-436Q160-501 185-557.5Q210-614 254-658L438-839Q447-847 458-851.5Q469-856 480-856Q491-856 502-851.5Q513-847 522-839L706-658Q750-614 775-557.5Q800-501 800-436Q800-304 706.5-212Q613-120 480-120Q347-120 253.5-212Q160-304 160-436ZM242-400H716Q728-472 702.5-523Q677-574 650-600L480-768L310-600Q283-574 257-523Q231-472 242-400Z",
  "padding": "M320-600Q337-600 348.5-611.5Q360-623 360-640Q360-657 348.5-668.5Q337-680 320-680Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM480-600Q497-600 508.5-611.5Q520-623 520-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600ZM640-600Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680Q623-680 611.5-668.5Q600-657 600-640Q600-623 611.5-611.5Q623-600 640-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "palette": "M480-80Q398-80 325-111.5Q252-143 197.5-197.5Q143-252 111.5-325Q80-398 80-480Q80-563 112.5-636Q145-709 200.5-763Q256-817 330-848.5Q404-880 488-880Q568-880 639-852.5Q710-825 763.5-776.5Q817-728 848.5-661.5Q880-595 880-518Q880-403 810-341.5Q740-280 640-280H566Q557-280 553.5-275Q550-270 550-264Q550-252 565-229.5Q580-207 580-178Q580-128 552.5-104Q525-80 480-80ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM260-440Q286-440 303-457Q320-474 320-500Q320-526 303-543Q286-560 260-560Q234-560 217-543Q200-526 200-500Q200-474 217-457Q234-440 260-440ZM380-600Q406-600 423-617Q440-634 440-660Q440-686 423-703Q406-720 380-720Q354-720 337-703Q320-686 320-660Q320-634 337-617Q354-600 380-600ZM580-600Q606-600 623-617Q640-634 640-660Q640-686 623-703Q606-720 580-720Q554-720 537-703Q520-686 520-660Q520-634 537-617Q554-600 580-600ZM700-440Q726-440 743-457Q760-474 760-500Q760-526 743-543Q726-560 700-560Q674-560 657-543Q640-526 640-500Q640-474 657-457Q674-440 700-440ZM480-160Q489-160 494.5-165Q500-170 500-178Q500-192 485-211Q470-230 470-268Q470-310 499-335Q528-360 570-360H640Q706-360 753-398.5Q800-437 800-518Q800-639 707.5-719.5Q615-800 488-800Q352-800 256-707Q160-614 160-480Q160-347 253.5-253.5Q347-160 480-160Z",
  "person": "M480-480Q414-480 367-527Q320-574 320-640Q320-706 367-753Q414-800 480-800Q546-800 593-753Q640-706 640-640Q640-574 593-527Q546-480 480-480ZM160-240V-272Q160-306 177.5-334.5Q195-363 224-378Q286-409 350-424.5Q414-440 480-440Q546-440 610-424.5Q674-409 736-378Q765-363 782.5-334.5Q800-306 800-272V-240Q800-207 776.5-183.5Q753-160 720-160H240Q207-160 183.5-183.5Q160-207 160-240ZM240-240H720V-272Q720-283 714.5-292Q709-301 700-306Q646-333 591-346.5Q536-360 480-360Q424-360 369-346.5Q314-333 260-306Q251-301 245.5-292Q240-283 240-272ZM480-560Q513-560 536.5-583.5Q560-607 560-640Q560-673 536.5-696.5Q513-720 480-720Q447-720 423.5-696.5Q400-673 400-640Q400-607 423.5-583.5Q447-560 480-560ZM480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640Q480-640 480-640ZM480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Q480-240 480-240Z",
  "photo_frame": "M240-120Q223-120 211.5-131.5Q200-143 200-160V-200H120Q87-200 63.5-223.5Q40-247 40-280V-720Q40-753 63.5-776.5Q87-800 120-800H840Q873-800 896.5-776.5Q920-753 920-720V-280Q920-247 896.5-223.5Q873-200 840-200H760V-160Q760-143 748.5-131.5Q737-120 720-120ZM120-280H840Q840-280 840-280Q840-280 840-280V-720Q840-720 840-720Q840-720 840-720H120Q120-720 120-720Q120-720 120-720V-280Q120-280 120-280Q120-280 120-280ZM241-360H720Q732-360 738-371Q744-382 736-392L596-579Q590-587 580-587Q570-587 564-579L440-420L356-521Q350-529 340.5-528.5Q331-528 325-520L225-392Q217-382 222.5-371Q228-360 241-360ZM120-280Q120-280 120-280Q120-280 120-280V-720Q120-720 120-720Q120-720 120-720Q120-720 120-720Q120-720 120-720V-280Q120-280 120-280Q120-280 120-280Z",
  "picture_as_pdf": "M400-540H440Q457-540 468.5-551.5Q480-563 480-580V-620Q480-637 468.5-648.5Q457-660 440-660H380Q372-660 366-654Q360-648 360-640V-480Q360-472 366-466Q372-460 380-460Q388-460 394-466Q400-472 400-480ZM400-580V-620H440V-580ZM600-460Q617-460 628.5-471.5Q640-483 640-500V-620Q640-637 628.5-648.5Q617-660 600-660H540Q532-660 526-654Q520-648 520-640V-480Q520-472 526-466Q532-460 540-460ZM560-500V-620H600V-500ZM720-540H740Q748-540 754-546Q760-552 760-560Q760-568 754-574Q748-580 740-580H720V-620H740Q748-620 754-626Q760-632 760-640Q760-648 754-654Q748-660 740-660H700Q692-660 686-654Q680-648 680-640V-480Q680-472 686-466Q692-460 700-460Q708-460 714-466Q720-472 720-480ZM320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z",
  "picture_in_picture": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM480-440H720Q737-440 748.5-451.5Q760-463 760-480V-640Q760-657 748.5-668.5Q737-680 720-680H480Q463-680 451.5-668.5Q440-657 440-640V-480Q440-463 451.5-451.5Q463-440 480-440ZM520-520V-600H680V-520Z",
  "playlist_add": "M160-320Q143-320 131.5-331.5Q120-343 120-360Q120-377 131.5-388.5Q143-400 160-400H360Q377-400 388.5-388.5Q400-377 400-360Q400-343 388.5-331.5Q377-320 360-320ZM160-480Q143-480 131.5-491.5Q120-503 120-520Q120-537 131.5-548.5Q143-560 160-560H520Q537-560 548.5-548.5Q560-537 560-520Q560-503 548.5-491.5Q537-480 520-480ZM160-640Q143-640 131.5-651.5Q120-663 120-680Q120-697 131.5-708.5Q143-720 160-720H520Q537-720 548.5-708.5Q560-697 560-680Q560-663 548.5-651.5Q537-640 520-640ZM640-200V-320H520Q503-320 491.5-331.5Q480-343 480-360Q480-377 491.5-388.5Q503-400 520-400H640V-520Q640-537 651.5-548.5Q663-560 680-560Q697-560 708.5-548.5Q720-537 720-520V-400H840Q857-400 868.5-388.5Q880-377 880-360Q880-343 868.5-331.5Q857-320 840-320H720V-200Q720-183 708.5-171.5Q697-160 680-160Q663-160 651.5-171.5Q640-183 640-200Z",
  "polyline": "M480-720H560V-800H480ZM200-400H280V-480H200ZM680-160H760V-240H680ZM520-760ZM240-440ZM720-200ZM600-160V-180L320-320H200Q167-320 143.5-343.5Q120-367 120-400V-480Q120-513 143.5-536.5Q167-560 200-560H292L400-684V-800Q400-833 423.5-856.5Q447-880 480-880H560Q593-880 616.5-856.5Q640-833 640-800V-720Q640-687 616.5-663.5Q593-640 560-640H468L360-516V-390L605-268Q613-291 633.5-305.5Q654-320 680-320H760Q793-320 816.5-296.5Q840-273 840-240V-160Q840-127 816.5-103.5Q793-80 760-80H680Q647-80 623.5-103.5Q600-127 600-160Z",
  "print": "M320-120Q287-120 263.5-143.5Q240-167 240-200V-280H160Q127-280 103.5-303.5Q80-327 80-360V-520Q80-571 115-605.5Q150-640 200-640H760Q811-640 845.5-605.5Q880-571 880-520V-360Q880-327 856.5-303.5Q833-280 800-280H720V-200Q720-167 696.5-143.5Q673-120 640-120ZM160-360H240Q240-393 263.5-416.5Q287-440 320-440H640Q673-440 696.5-416.5Q720-393 720-360H800Q800-360 800-360Q800-360 800-360V-520Q800-537 788.5-548.5Q777-560 760-560H200Q183-560 171.5-548.5Q160-537 160-520V-360Q160-360 160-360Q160-360 160-360ZM640-640V-760Q640-760 640-760Q640-760 640-760H320Q320-760 320-760Q320-760 320-760V-640H240V-760Q240-793 263.5-816.5Q287-840 320-840H640Q673-840 696.5-816.5Q720-793 720-760V-640ZM720-460Q737-460 748.5-471.5Q760-483 760-500Q760-517 748.5-528.5Q737-540 720-540Q703-540 691.5-528.5Q680-517 680-500Q680-483 691.5-471.5Q703-460 720-460ZM640-200V-360Q640-360 640-360Q640-360 640-360H320Q320-360 320-360Q320-360 320-360V-200Q320-200 320-200Q320-200 320-200H640Q640-200 640-200Q640-200 640-200ZM160-560Q160-560 160-560Q160-560 160-560Q160-560 171.5-560Q183-560 200-560H760Q777-560 788.5-560Q800-560 800-560Q800-560 800-560Q800-560 800-560H720Q720-560 696.5-560Q673-560 640-560H320Q287-560 263.5-560Q240-560 240-560Z",
  "public": "M480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM440-162V-240Q407-240 383.5-263.5Q360-287 360-320V-360L168-552Q165-534 162.5-516Q160-498 160-480Q160-359 239.5-268Q319-177 440-162ZM716-264Q757-309 778.5-364.5Q800-420 800-480Q800-578 745.5-659Q691-740 600-776V-760Q600-727 576.5-703.5Q553-680 520-680H440V-600Q440-583 428.5-571.5Q417-560 400-560H320V-480H560Q577-480 588.5-468.5Q600-457 600-440V-320H640Q666-320 687-304.5Q708-289 716-264Z",
  "redo": "M648-560H396Q333-560 286.5-520Q240-480 240-420Q240-360 286.5-320Q333-280 396-280H640Q657-280 668.5-268.5Q680-257 680-240Q680-223 668.5-211.5Q657-200 640-200H396Q299-200 229.5-263Q160-326 160-420Q160-514 229.5-577Q299-640 396-640H648L572-716Q561-727 561-744Q561-761 572-772Q583-783 600-783Q617-783 628-772L772-628Q778-622 780.5-615Q783-608 783-600Q783-592 780.5-585Q778-578 772-572L628-428Q617-417 600-417Q583-417 572-428Q561-439 561-456Q561-473 572-484Z",
  "refresh": "M480-160Q346-160 253-253Q160-346 160-480Q160-614 253-707Q346-800 480-800Q549-800 612-771.5Q675-743 720-690V-760Q720-777 731.5-788.5Q743-800 760-800Q777-800 788.5-788.5Q800-777 800-760V-560Q800-543 788.5-531.5Q777-520 760-520H560Q543-520 531.5-531.5Q520-543 520-560Q520-577 531.5-588.5Q543-600 560-600H688Q656-656 600.5-688Q545-720 480-720Q380-720 310-650Q240-580 240-480Q240-380 310-310Q380-240 480-240Q548-240 604.5-274.5Q661-309 692-367Q700-381 714.5-386.5Q729-392 744-387Q760-382 767-366Q774-350 766-336Q725-256 649-208Q573-160 480-160Z",
  "remove": "M240-440Q223-440 211.5-451.5Q200-463 200-480Q200-497 211.5-508.5Q223-520 240-520H720Q737-520 748.5-508.5Q760-497 760-480Q760-463 748.5-451.5Q737-440 720-440Z",
  "remove_done": "M845-116 609-352 523-266Q511-254 495-254Q479-254 467-266L297-436Q285-448 285.5-464Q286-480 297-492Q309-504 325.5-504.5Q342-505 354-493L495-352L551-408L165-794Q153-806 153.5-822Q154-838 165-850Q177-862 193.5-862.5Q210-863 222-851L901-172Q912-161 912-144Q912-127 901-116Q890-105 873-105Q856-105 845-116ZM241-266 71-436Q60-447 60-464Q60-481 71-492Q82-503 99-503Q116-503 127-492L269-350L325-294L297-266Q285-254 269-254Q253-254 241-266ZM721-464 665-520 834-689Q845-700 861-700.5Q877-701 889-690Q901-679 901.5-662Q902-645 890-633ZM607-578 551-634 609-692Q620-703 637-703Q654-703 665-692Q676-681 676-664Q676-647 665-636Z",
  "restart_alt": "M393-132Q290-161 225-245.5Q160-330 160-440Q160-497 179-548.5Q198-600 233-643Q244-655 260-655.5Q276-656 289-643Q300-632 300.5-616Q301-600 290-586Q266-555 253-518Q240-481 240-440Q240-359 287.5-295.5Q335-232 410-209Q423-205 431.5-194Q440-183 440-170Q440-150 426-138.5Q412-127 393-132ZM567-132Q548-127 534-139Q520-151 520-171Q520-183 528.5-194Q537-205 550-209Q625-233 672.5-296Q720-359 720-440Q720-540 650-610Q580-680 480-680H477L493-664Q504-653 504-636Q504-619 493-608Q482-597 465-597Q448-597 437-608L353-692Q347-698 344.5-705Q342-712 342-720Q342-728 344.5-735Q347-742 353-748L437-832Q448-843 465-843Q482-843 493-832Q504-821 504-804Q504-787 493-776L477-760H480Q614-760 707-667Q800-574 800-440Q800-331 735-246Q670-161 567-132Z",
  "rotate_90_degrees_ccw": "M520-80Q483-80 447.5-87.5Q412-95 378-109Q363-115 358-130.5Q353-146 359-161Q365-176 380-182.5Q395-189 410-182Q436-171 463.5-165.5Q491-160 520-160Q637-160 718.5-241.5Q800-323 800-440Q800-557 718-638.5Q636-720 519-720H512L548-684Q559-673 559-656Q559-639 548-628Q537-617 520-617Q503-617 492-628L388-732Q383-737 380-744.5Q377-752 377-760Q377-768 380-775.5Q383-783 388-788L492-892Q503-903 520-903Q537-903 548-892Q559-881 559-864Q559-847 548-836L512-800H519Q669-800 774.5-695Q880-590 880-440Q880-290 775-185Q670-80 520-80ZM252-228 68-412Q62-418 59.5-425Q57-432 57-440Q57-448 59.5-455Q62-462 68-468L252-652Q258-658 265-660.5Q272-663 280-663Q288-663 295-660.5Q302-658 308-652L492-468Q498-462 500.5-455Q503-448 503-440Q503-432 500.5-425Q498-418 492-412L308-228Q302-222 295-219.5Q288-217 280-217Q272-217 265-219.5Q258-222 252-228ZM280-314 406-440 280-566 154-440ZM280-440Z",
  "rotate_90_degrees_cw": "M440-80Q290-80 185-185Q80-290 80-440Q80-590 185.5-695Q291-800 441-800H448L412-836Q401-847 401-864Q401-881 412-892Q423-903 440-903Q457-903 468-892L572-788Q577-783 580-775.5Q583-768 583-760Q583-752 580-744.5Q577-737 572-732L468-628Q457-617 440-617Q423-617 412-628Q401-639 401-656Q401-673 412-684L448-720H441Q324-720 242-638.5Q160-557 160-440Q160-323 241.5-241.5Q323-160 440-160Q469-160 496.5-165.5Q524-171 550-182Q565-189 580-182.5Q595-176 601-161Q607-146 602-130.5Q597-115 582-109Q548-95 512.5-87.5Q477-80 440-80ZM652-228 468-412Q462-418 459.5-425Q457-432 457-440Q457-448 459.5-455Q462-462 468-468L652-652Q658-658 665-660.5Q672-663 680-663Q688-663 695-660.5Q702-658 708-652L892-468Q898-462 900.5-455Q903-448 903-440Q903-432 900.5-425Q898-418 892-412L708-228Q702-222 695-219.5Q688-217 680-217Q672-217 665-219.5Q658-222 652-228ZM680-314 806-440 680-566 554-440ZM680-440Z",
  "rotate_left": "M170-478Q149-478 136.5-493Q124-508 129-528Q135-553 145-576Q155-599 168-621Q178-638 197.5-640Q217-642 232-628Q241-619 243-605.5Q245-592 238-581Q228-564 220.5-545.5Q213-527 208-508Q205-495 193.5-486.5Q182-478 170-478ZM438-130Q438-108 423-96Q408-84 388-89Q364-96 341-105.5Q318-115 295-128Q278-138 276-157.5Q274-177 288-192Q297-201 310.5-203Q324-205 335-198Q352-188 370.5-180.5Q389-173 408-168Q421-165 429.5-153.5Q438-142 438-130ZM232-248Q217-234 197.5-236Q178-238 168-255Q155-278 145.5-301Q136-324 129-348Q124-368 136-383Q148-398 170-398Q183-398 194-389.5Q205-381 208-368Q213-349 220.5-330.5Q228-312 238-295Q245-284 243-270Q241-256 232-248ZM567-90Q547-85 532.5-97Q518-109 518-130Q518-143 526.5-154Q535-165 548-168Q640-192 699-266.5Q758-341 758-438Q758-555 676.5-636.5Q595-718 478-718H470L506-682Q517-671 517-654Q517-637 506-626Q495-615 478-615Q461-615 450-626L346-730Q340-736 337.5-743Q335-750 335-758Q335-766 337.5-773Q340-780 346-786L449-890Q461-901 478-901Q495-901 506-890Q518-878 518-861Q518-844 507-833L472-798H478Q628-798 733-693Q838-588 838-438Q838-314 762-218Q686-122 567-90Z",
  "rotate_right": "M790-478Q778-478 766.5-486.5Q755-495 752-508Q747-527 739.5-545.5Q732-564 722-581Q715-592 717-605.5Q719-619 728-628Q743-642 762.5-640Q782-638 792-621Q805-599 815-576Q825-553 831-528Q836-508 823.5-493Q811-478 790-478ZM522-130Q522-142 530.5-153.5Q539-165 552-168Q571-173 589.5-180.5Q608-188 625-198Q636-205 649.5-203Q663-201 672-192Q686-177 684-157.5Q682-138 665-128Q642-115 619-105.5Q596-96 572-89Q552-84 537-96Q522-108 522-130ZM728-248Q719-256 717-270Q715-284 722-295Q732-312 739.5-330.5Q747-349 752-368Q755-381 766-389.5Q777-398 790-398Q812-398 824-383Q836-368 831-348Q824-324 814.5-301Q805-278 792-255Q782-238 762.5-236Q743-234 728-248ZM393-90Q274-122 198-218Q122-314 122-438Q122-588 227-693Q332-798 482-798H488L453-833Q442-844 442-861Q442-878 454-890Q465-901 482-901Q499-901 511-890L614-786Q620-780 622.5-773Q625-766 625-758Q625-750 622.5-743Q620-736 614-730L510-626Q499-615 482-615Q465-615 454-626Q443-637 443-654Q443-671 454-682L490-718H482Q365-718 283.5-636.5Q202-555 202-438Q202-341 261-266.5Q320-192 412-168Q425-165 433.5-154Q442-143 442-130Q442-109 427.5-97Q413-85 393-90Z",
  "save": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H647Q663-840 677.5-834Q692-828 703-817L817-703Q828-692 834-677.5Q840-663 840-647V-200Q840-167 816.5-143.5Q793-120 760-120ZM760-646 646-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200ZM480-240Q530-240 565-275Q600-310 600-360Q600-410 565-445Q530-480 480-480Q430-480 395-445Q360-410 360-360Q360-310 395-275Q430-240 480-240ZM280-560H560Q577-560 588.5-571.5Q600-583 600-600V-680Q600-697 588.5-708.5Q577-720 560-720H280Q263-720 251.5-708.5Q240-697 240-680V-600Q240-583 251.5-571.5Q263-560 280-560ZM200-646V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "save_as": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H647Q663-840 677.5-834Q692-828 703-817L817-703Q828-692 834-677.5Q840-663 840-647V-520Q840-503 828.5-491.5Q817-480 800-480Q783-480 771.5-491.5Q760-503 760-520V-647L647-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H400Q417-200 428.5-188.5Q440-177 440-160Q440-143 428.5-131.5Q417-120 400-120ZM200-760V-647V-478Q200-475 200-465.5Q200-456 200-441V-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760ZM520-80V-146Q520-154 523-161.5Q526-169 532-175L741-383Q750-392 761-396Q772-400 783-400Q795-400 806-395.5Q817-391 826-382L863-345Q871-336 875.5-325Q880-314 880-303Q880-292 876-280.5Q872-269 863-260L655-52Q649-46 641.5-43Q634-40 626-40H560Q543-40 531.5-51.5Q520-63 520-80ZM820-303 783-340ZM580-100H618L739-222L721-241L702-259L580-138ZM721-241 702-259 739-222ZM280-560H560Q577-560 588.5-571.5Q600-583 600-600V-680Q600-697 588.5-708.5Q577-720 560-720H280Q263-720 251.5-708.5Q240-697 240-680V-600Q240-583 251.5-571.5Q263-560 280-560ZM480-240Q481-240 482-240Q483-240 484-240L600-355Q600-357 600-357.5Q600-358 600-360Q600-410 565-445Q530-480 480-480Q430-480 395-445Q360-410 360-360Q360-310 395-275Q430-240 480-240Z",
  "search": "M380-320Q271-320 195.5-395.5Q120-471 120-580Q120-689 195.5-764.5Q271-840 380-840Q489-840 564.5-764.5Q640-689 640-580Q640-536 626-497Q612-458 588-428L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L532-372Q502-348 463-334Q424-320 380-320ZM380-400Q455-400 507.5-452.5Q560-505 560-580Q560-655 507.5-707.5Q455-760 380-760Q305-760 252.5-707.5Q200-655 200-580Q200-505 252.5-452.5Q305-400 380-400Z",
  "select": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "select_all": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM360-280Q327-280 303.5-303.5Q280-327 280-360V-600Q280-633 303.5-656.5Q327-680 360-680H600Q633-680 656.5-656.5Q680-633 680-600V-360Q680-327 656.5-303.5Q633-280 600-280ZM360-360H600Q600-360 600-360Q600-360 600-360V-600Q600-600 600-600Q600-600 600-600H360Q360-600 360-600Q360-600 360-600V-360Q360-360 360-360Q360-360 360-360Z",
  "send": "M792-443 176-183Q156-175 138-186.5Q120-198 120-220V-740Q120-762 138-773.5Q156-785 176-777L792-517Q817-506 817-480Q817-454 792-443ZM200-280 674-480 200-680V-540L440-480L200-420ZM200-280V-480V-680V-540V-420Z",
  "settings": "M433-80Q406-80 386.5-98Q367-116 363-142L354-208Q341-213 329.5-220Q318-227 307-235L245-209Q220-198 195-207Q170-216 156-239L109-321Q95-344 101-370Q107-396 128-413L181-453Q180-460 180-466.5Q180-473 180-480Q180-487 180-493.5Q180-500 181-507L128-547Q107-564 101-590Q95-616 109-639L156-721Q170-744 195-753Q220-762 245-751L307-725Q318-733 330-740Q342-747 354-752L363-818Q367-844 386.5-862Q406-880 433-880H527Q554-880 573.5-862Q593-844 597-818L606-752Q619-747 630.5-740Q642-733 653-725L715-751Q740-762 765-753Q790-744 804-721L851-639Q865-616 859-590Q853-564 832-547L779-507Q780-500 780-493.5Q780-487 780-480Q780-473 780-466.5Q780-460 778-453L831-413Q852-396 858-370Q864-344 850-321L802-239Q788-216 763-207Q738-198 713-209L653-235Q642-227 630-220Q618-213 606-208L597-142Q593-116 573.5-98Q554-80 527-80ZM440-160H519L533-266Q564-274 590.5-289.5Q617-305 639-327L738-286L777-354L691-419Q696-433 698-448.5Q700-464 700-480Q700-496 698-511.5Q696-527 691-541L777-606L738-674L639-632Q617-655 590.5-670.5Q564-686 533-694L520-800H441L427-694Q396-686 369.5-670.5Q343-655 321-633L222-674L183-606L269-542Q264-527 262-512Q260-497 260-480Q260-464 262-449Q264-434 269-419L183-354L222-286L321-328Q343-305 369.5-289.5Q396-274 427-266ZM482-340Q540-340 581-381Q622-422 622-480Q622-538 581-579Q540-620 482-620Q423-620 382.5-579Q342-538 342-480Q342-422 382.5-381Q423-340 482-340ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "shapes": "M600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360Q600-360 600-360ZM400-80Q367-80 343.5-103.5Q320-127 320-160V-200Q320-217 331.5-228.5Q343-240 360-240Q377-240 388.5-228.5Q400-217 400-200V-160Q400-160 400-160Q400-160 400-160H800Q800-160 800-160Q800-160 800-160V-560Q800-560 800-560Q800-560 800-560H760Q743-560 731.5-571.5Q720-583 720-600Q720-617 731.5-628.5Q743-640 760-640H800Q833-640 856.5-616.5Q880-593 880-560V-160Q880-127 856.5-103.5Q833-80 800-80ZM360-320Q243-320 161.5-401.5Q80-483 80-600Q80-717 161.5-798.5Q243-880 360-880Q477-880 558.5-798.5Q640-717 640-600Q640-483 558.5-401.5Q477-320 360-320ZM360-400Q443-400 501.5-458.5Q560-517 560-600Q560-683 501.5-741.5Q443-800 360-800Q277-800 218.5-741.5Q160-683 160-600Q160-517 218.5-458.5Q277-400 360-400ZM360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Q360-600 360-600Z",
  "short_text": "M200-360Q183-360 171.5-371.5Q160-383 160-400Q160-417 171.5-428.5Q183-440 200-440H520Q537-440 548.5-428.5Q560-417 560-400Q560-383 548.5-371.5Q537-360 520-360ZM200-520Q183-520 171.5-531.5Q160-543 160-560Q160-577 171.5-588.5Q183-600 200-600H760Q777-600 788.5-588.5Q800-577 800-560Q800-543 788.5-531.5Q777-520 760-520Z",
  "side_navigation": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM480-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H480Z",
  "sort": "M160-240Q143-240 131.5-251.5Q120-263 120-280Q120-297 131.5-308.5Q143-320 160-320H320Q337-320 348.5-308.5Q360-297 360-280Q360-263 348.5-251.5Q337-240 320-240ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H560Q577-520 588.5-508.5Q600-497 600-480Q600-463 588.5-451.5Q577-440 560-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680Q120-697 131.5-708.5Q143-720 160-720H800Q817-720 828.5-708.5Q840-697 840-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "sort_by_alpha": "M196-376 173-306Q169-295 159-287.5Q149-280 137-280Q117-280 104.5-296.5Q92-313 100-333L220-654Q225-666 235-673Q245-680 258-680H288Q301-680 311-673Q321-666 326-654L447-331Q454-312 442.5-296Q431-280 411-280Q399-280 389-287.5Q379-295 375-306L350-376ZM220-444H324L276-594H270ZM638-352H804Q819-352 829.5-341.5Q840-331 840-316Q840-301 829.5-290.5Q819-280 804-280H572Q562-280 555-287Q548-294 548-304V-342Q548-349 550-355.5Q552-362 557-367L750-608H592Q577-608 566.5-618.5Q556-629 556-644Q556-659 566.5-669.5Q577-680 592-680H814Q824-680 831-673Q838-666 838-656V-618Q838-611 836-604.5Q834-598 829-593ZM384-760Q377-760 374.5-766Q372-772 377-777L466-866Q472-872 480-872Q488-872 494-866L583-777Q588-772 585.5-766Q583-760 576-760ZM466-94 377-183Q372-188 374.5-194Q377-200 384-200H576Q583-200 585.5-194Q588-188 583-183L494-94Q488-88 480-88Q472-88 466-94Z",
  "south_east": "M624-280 188-716Q177-727 177-744Q177-761 188-772Q199-783 216-783Q233-783 244-772L680-336V-560Q680-577 691.5-588.5Q703-600 720-600Q737-600 748.5-588.5Q760-577 760-560V-240Q760-223 748.5-211.5Q737-200 720-200H400Q383-200 371.5-211.5Q360-223 360-240Q360-257 371.5-268.5Q383-280 400-280Z",
  "special_character": "M260-540Q260-477 293-424Q326-371 383-343Q407-331 423.5-310.5Q440-290 440-264V-180Q440-155 422.5-137.5Q405-120 380-120H180Q155-120 137.5-137.5Q120-155 120-180Q120-205 137.5-222.5Q155-240 180-240H320Q236-285 188-365Q140-445 140-540Q140-682 239-781Q338-880 480-880Q622-880 721-781Q820-682 820-540Q820-445 772-365Q724-285 640-240H780Q805-240 822.5-222.5Q840-205 840-180Q840-155 822.5-137.5Q805-120 780-120H580Q555-120 537.5-137.5Q520-155 520-180V-264Q520-290 536.5-310.5Q553-331 577-343Q634-371 667-424Q700-477 700-540Q700-632 636-696Q572-760 480-760Q388-760 324-696Q260-632 260-540Z",
  "spellcheck": "M564-192 762-390Q773-401 790-401Q807-401 818-390Q829-379 829-362Q829-345 818-334L621-137Q609-125 594-119Q579-113 564-113Q549-113 534-119Q519-125 507-137L422-222Q411-233 411-250Q411-267 422-278Q433-289 450-289Q467-289 478-278ZM254-452 217-347Q212-335 202-327.5Q192-320 179-320Q157-320 145-338Q133-356 141-376L303-811Q308-824 319.5-832Q331-840 345-840H377Q391-840 402.5-832Q414-824 419-811L581-377Q589-356 576.5-338Q564-320 541-320Q527-320 516-328Q505-336 500-349L464-452ZM282-528H438L362-744H358Z",
  "splitscreen": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM200-600H760Q760-600 760-600Q760-600 760-600V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-360Q760-360 760-360Q760-360 760-360H200Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200ZM200-600Q200-600 200-600Q200-600 200-600V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-200Q200-200 200-200Q200-200 200-200V-360Q200-360 200-360Q200-360 200-360Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200Z",
  "splitscreen_left": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM760-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760V-200Q600-200 600-200Q600-200 600-200H760Q760-200 760-200Q760-200 760-200Z",
  "splitscreen_right": "M600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200V-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Z",
  "splitscreen_vertical_add": "M760-760H759Q690-760 644.5-760Q599-760 599-760Q599-760 600.5-760Q602-760 604-760H600Q600-760 600-760Q600-760 600-760H760Q760-760 760-760Q760-760 760-760ZM520-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-400Q840-383 828.5-371.5Q817-360 800-360Q783-360 771.5-371.5Q760-383 760-400V-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760V-120Q567-120 543.5-143.5Q520-167 520-200ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760H360Q360-760 360-760Q360-760 360-760ZM760-120H720Q703-120 691.5-131.5Q680-143 680-160Q680-177 691.5-188.5Q703-200 720-200H760V-240Q760-257 771.5-268.5Q783-280 800-280Q817-280 828.5-268.5Q840-257 840-240V-200H880Q897-200 908.5-188.5Q920-177 920-160Q920-143 908.5-131.5Q897-120 880-120H840V-80Q840-63 828.5-51.5Q817-40 800-40Q783-40 771.5-51.5Q760-63 760-80Z",
  "straighten": "M160-240Q127-240 103.5-263.5Q80-287 80-320V-640Q80-673 103.5-696.5Q127-720 160-720H800Q833-720 856.5-696.5Q880-673 880-640V-320Q880-287 856.5-263.5Q833-240 800-240ZM160-320H800Q800-320 800-320Q800-320 800-320V-640Q800-640 800-640Q800-640 800-640H680V-520Q680-503 668.5-491.5Q657-480 640-480Q623-480 611.5-491.5Q600-503 600-520V-640H520V-520Q520-503 508.5-491.5Q497-480 480-480Q463-480 451.5-491.5Q440-503 440-520V-640H360V-520Q360-503 348.5-491.5Q337-480 320-480Q303-480 291.5-491.5Q280-503 280-520V-640H160Q160-640 160-640Q160-640 160-640V-320Q160-320 160-320Q160-320 160-320ZM320-480ZM480-480ZM640-480ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "style": "M159-168 125-182Q94-195 83.5-227Q73-259 87-290L159-446ZM319-80Q286-80 262.5-103.5Q239-127 239-160V-400L345-106Q348-99 351-92.5Q354-86 359-80ZM525-84Q493-72 463-87Q433-102 421-134L243-622Q231-654 245-684.5Q259-715 291-726L593-836Q625-848 655-833Q685-818 697-786L875-298Q887-266 873-235.5Q859-205 827-194ZM439-560Q456-560 467.5-571.5Q479-583 479-600Q479-617 467.5-628.5Q456-640 439-640Q422-640 410.5-628.5Q399-617 399-600Q399-583 410.5-571.5Q422-560 439-560ZM497-160 799-270 621-760 319-650ZM319-650 621-760Z",
  "subscript": "M800-160Q783-160 771.5-171.5Q760-183 760-200V-240Q760-257 771.5-268.5Q783-280 800-280H880V-320H780Q772-320 766-326Q760-332 760-340Q760-348 766-354Q772-360 780-360H880Q897-360 908.5-348.5Q920-337 920-320V-280Q920-263 908.5-251.5Q897-240 880-240H800V-200H900Q908-200 914-194Q920-188 920-180Q920-172 914-166Q908-160 900-160ZM317-240Q290-240 277.5-263Q265-286 279-309L420-531L292-732Q278-754 290.5-777Q303-800 329-800Q341-800 351-794.5Q361-789 367-779L478-600H482L592-779Q598-789 608.5-794.5Q619-800 630-800Q657-800 669-777Q681-754 667-731L539-531L681-309Q695-286 682-263Q669-240 643-240Q631-240 621-245.5Q611-251 605-261L482-457H478L355-261Q349-251 338.5-245.5Q328-240 317-240Z",
  "subtitles": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM280-320H520Q537-320 548.5-331.5Q560-343 560-360Q560-377 548.5-388.5Q537-400 520-400H280Q263-400 251.5-388.5Q240-377 240-360Q240-343 251.5-331.5Q263-320 280-320ZM440-480H680Q697-480 708.5-491.5Q720-503 720-520Q720-537 708.5-548.5Q697-560 680-560H440Q423-560 411.5-548.5Q400-537 400-520Q400-503 411.5-491.5Q423-480 440-480ZM280-480Q297-480 308.5-491.5Q320-503 320-520Q320-537 308.5-548.5Q297-560 280-560Q263-560 251.5-548.5Q240-537 240-520Q240-503 251.5-491.5Q263-480 280-480ZM680-320Q697-320 708.5-331.5Q720-343 720-360Q720-377 708.5-388.5Q697-400 680-400Q663-400 651.5-388.5Q640-377 640-360Q640-343 651.5-331.5Q663-320 680-320Z",
  "superscript": "M800-600Q783-600 771.5-611.5Q760-623 760-640V-680Q760-697 771.5-708.5Q783-720 800-720H880V-760H780Q772-760 766-766Q760-772 760-780Q760-788 766-794Q772-800 780-800H880Q897-800 908.5-788.5Q920-777 920-760V-720Q920-703 908.5-691.5Q897-680 880-680H800V-640H900Q908-640 914-634Q920-628 920-620Q920-612 914-606Q908-600 900-600ZM317-160Q290-160 277.5-183Q265-206 279-229L420-451L292-652Q278-674 290.5-697Q303-720 329-720Q341-720 351-714.5Q361-709 367-699L478-520H482L592-699Q598-709 608.5-714.5Q619-720 630-720Q657-720 669-697Q681-674 667-651L539-451L681-229Q695-206 682-183Q669-160 643-160Q631-160 621-165.5Q611-171 605-181L482-377H478L355-181Q349-171 338.5-165.5Q328-160 317-160Z",
  "swap_horiz": "M233-320 308-245Q319-234 319-217.5Q319-201 308-189Q296-177 279.5-177Q263-177 251-189L108-332Q102-338 99.5-345Q97-352 97-360Q97-368 99.5-375Q102-382 108-388L252-532Q264-544 280-543.5Q296-543 308-531Q319-519 319.5-503Q320-487 308-475L233-400H480Q497-400 508.5-388.5Q520-377 520-360Q520-343 508.5-331.5Q497-320 480-320ZM727-560H480Q463-560 451.5-571.5Q440-583 440-600Q440-617 451.5-628.5Q463-640 480-640H727L652-715Q641-726 641-742.5Q641-759 652-771Q664-783 680.5-783Q697-783 709-771L852-628Q858-622 860.5-615Q863-608 863-600Q863-592 860.5-585Q858-578 852-572L708-428Q696-416 680-416.5Q664-417 652-429Q641-441 640.5-457Q640-473 652-485Z",
  "swap_vert": "M320-480V-727L245-652Q234-641 217.5-641Q201-641 189-652Q177-664 177-680.5Q177-697 189-709L332-852Q338-858 345-860.5Q352-863 360-863Q368-863 375-860.5Q382-858 388-852L532-708Q544-696 543.5-680Q543-664 531-652Q519-641 503-640.5Q487-640 475-652L400-727V-480Q400-463 388.5-451.5Q377-440 360-440Q343-440 331.5-451.5Q320-463 320-480ZM572-108 428-252Q416-264 416.5-280Q417-296 429-308Q441-319 457-319.5Q473-320 485-308L560-233V-480Q560-497 571.5-508.5Q583-520 600-520Q617-520 628.5-508.5Q640-497 640-480V-233L715-308Q726-319 742.5-319Q759-319 771-308Q783-296 783-279.5Q783-263 771-251L628-108Q622-102 615-99.5Q608-97 600-97Q592-97 585-99.5Q578-102 572-108Z",
  "table": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM440-360H200V-200Q200-200 200-200Q200-200 200-200H440ZM520-360V-200H760Q760-200 760-200Q760-200 760-200V-360ZM440-440V-600H200V-440ZM520-440H760V-600H520ZM200-680H760V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760Z",
  "table_chart": "M760-120H200Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-640H760V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760ZM300-560H200V-200Q200-200 200-200Q200-200 200-200H300ZM660-560V-200H760Q760-200 760-200Q760-200 760-200V-560ZM580-560H380V-200H580Z",
  "table_convert": "M440-120V-600H120V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM520-200H760Q760-200 760-200Q760-200 760-200V-360H520ZM520-440H760V-600H520ZM200-680H760V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760ZM305-520Q322-520 333.5-508.5Q345-497 345-480Q345-463 333.5-451.5Q322-440 305-440Q260-440 227.5-408Q195-376 195-330Q195-291 219-261Q243-231 280-223V-280Q280-297 291.5-308.5Q303-320 320-320Q337-320 348.5-308.5Q360-297 360-280V-120Q360-103 348.5-91.5Q337-80 320-80H160Q143-80 131.5-91.5Q120-103 120-120Q120-137 131.5-148.5Q143-160 160-160H222Q174-183 144.5-228Q115-273 115-330Q115-409 170.5-464.5Q226-520 305-520Z",
  "table_rows": "M760-200V-320Q760-320 760-320Q760-320 760-320H200Q200-320 200-320Q200-320 200-320V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200ZM760-400V-560Q760-560 760-560Q760-560 760-560H200Q200-560 200-560Q200-560 200-560V-400Q200-400 200-400Q200-400 200-400H760Q760-400 760-400Q760-400 760-400ZM760-640V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-640Q200-640 200-640Q200-640 200-640H760Q760-640 760-640Q760-640 760-640ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120Z",
  "table_view": "M320-80Q287-80 263.5-103.5Q240-127 240-160V-640Q240-673 263.5-696.5Q287-720 320-720H800Q833-720 856.5-696.5Q880-673 880-640V-160Q880-127 856.5-103.5Q833-80 800-80ZM320-160H520V-280H320V-160Q320-160 320-160Q320-160 320-160ZM600-160H800Q800-160 800-160Q800-160 800-160V-280H600ZM120-240Q103-240 91.5-251.5Q80-263 80-280V-800Q80-833 103.5-856.5Q127-880 160-880H680Q697-880 708.5-868.5Q720-857 720-840Q720-823 708.5-811.5Q697-800 680-800H160Q160-800 160-800Q160-800 160-800V-280Q160-263 148.5-251.5Q137-240 120-240ZM320-360H520V-480H320ZM600-360H800V-480H600ZM320-560H800V-640Q800-640 800-640Q800-640 800-640H320Q320-640 320-640Q320-640 320-640Z",
  "text_decrease": "M640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520H880Q897-520 908.5-508.5Q920-497 920-480Q920-463 908.5-451.5Q897-440 880-440ZM187-343 146-229Q141-215 130-207.5Q119-200 105-200Q82-200 68.5-219.5Q55-239 63-261L239-730Q244-744 256-752Q268-760 282-760H318Q333-760 344.5-752Q356-744 361-730L538-260Q546-238 532.5-219Q519-200 496-200Q482-200 470-208Q458-216 453-230L413-343ZM216-424H384L302-656H298Z",
  "text_fields": "M280-220V-680H140Q115-680 97.5-697.5Q80-715 80-740Q80-765 97.5-782.5Q115-800 140-800H540Q565-800 582.5-782.5Q600-765 600-740Q600-715 582.5-697.5Q565-680 540-680H400V-220Q400-195 382.5-177.5Q365-160 340-160Q315-160 297.5-177.5Q280-195 280-220ZM640-220V-480H580Q555-480 537.5-497.5Q520-515 520-540Q520-565 537.5-582.5Q555-600 580-600H820Q845-600 862.5-582.5Q880-565 880-540Q880-515 862.5-497.5Q845-480 820-480H760V-220Q760-195 742.5-177.5Q725-160 700-160Q675-160 657.5-177.5Q640-195 640-220Z",
  "text_format": "M240-200Q223-200 211.5-211.5Q200-223 200-240Q200-257 211.5-268.5Q223-280 240-280H720Q737-280 748.5-268.5Q760-257 760-240Q760-223 748.5-211.5Q737-200 720-200ZM294-408 431-776Q435-787 444.5-793.5Q454-800 466-800H494Q506-800 515.5-793.5Q525-787 529-776L666-407Q672-390 662-375Q652-360 634-360Q623-360 613.5-366.5Q604-373 600-384L570-472H392L360-383Q356-372 347-366Q338-360 327-360Q308-360 297.5-375.5Q287-391 294-408ZM414-536H546L482-718H478Z",
  "text_increase": "M187-343 146-229Q141-215 130-207.5Q119-200 105-200Q82-200 68.5-219.5Q55-239 63-261L239-730Q244-744 256-752Q268-760 282-760H318Q333-760 344.5-752Q356-744 361-730L538-260Q546-238 532.5-219Q519-200 496-200Q482-200 470-208Q458-216 453-230L413-343ZM216-424H384L302-656H298ZM720-440H640Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520H720V-600Q720-617 731.5-628.5Q743-640 760-640Q777-640 788.5-628.5Q800-617 800-600V-520H880Q897-520 908.5-508.5Q920-497 920-480Q920-463 908.5-451.5Q897-440 880-440H800V-360Q800-343 788.5-331.5Q777-320 760-320Q743-320 731.5-331.5Q720-343 720-360Z",
  "text_rotate_up": "M680-688 666-674Q655-663 638-663Q621-663 610-674Q599-685 599-702Q599-719 610-730L692-812Q704-824 720-823.5Q736-823 748-812L831-731Q843-719 842.5-702.5Q842-686 830-674Q818-663 802-662.5Q786-662 774-674L760-688V-200Q760-183 748.5-171.5Q737-160 720-160Q703-160 691.5-171.5Q680-183 680-200ZM448-392 537-360Q548-356 554-347Q560-338 560-327Q560-308 544.5-297.5Q529-287 512-294L144-431Q133-435 126.5-444.5Q120-454 120-466V-494Q120-506 126.5-515.5Q133-525 144-529L513-666Q530-672 545-662Q560-652 560-634Q560-623 553.5-613.5Q547-604 536-600L448-570ZM384-414V-546L202-482V-478Z",
  "text_rotate_vertical": "M552-432 520-343Q516-332 507-326Q498-320 487-320Q468-320 457.5-335.5Q447-351 454-368L591-736Q595-747 604.5-753.5Q614-760 626-760H654Q666-760 675.5-753.5Q685-747 689-736L826-367Q833-350 822.5-335Q812-320 793-320Q782-320 773-326.5Q764-333 760-344L728-432ZM574-496H706L642-678H638ZM200-314V-800Q200-817 211.5-828.5Q223-840 240-840Q257-840 268.5-828.5Q280-817 280-800V-314L296-329Q308-340 324-340Q340-340 352-328Q363-317 363-300Q363-283 352-272L268-188Q256-176 240-176Q224-176 212-188L128-272Q117-283 117-300Q117-317 129-329Q140-340 156-340Q172-340 184-329Z",
  "text_rotation_down": "M280-272 294-286Q305-297 322-297Q339-297 350-286Q361-275 361-258Q361-241 350-230L268-148Q256-136 240-136.5Q224-137 212-148L129-229Q117-241 117.5-257.5Q118-274 130-286Q142-297 158-297.5Q174-298 186-286L200-272V-760Q200-777 211.5-788.5Q223-800 240-800Q257-800 268.5-788.5Q280-777 280-760ZM512-390V-568L423-600Q412-604 406-613Q400-622 400-633Q400-652 415.5-662.5Q431-673 448-666L816-529Q827-525 833.5-515.5Q840-506 840-494V-466Q840-454 833.5-444.5Q827-435 816-431L447-294Q430-288 415-298Q400-308 400-326Q400-337 406.5-346.5Q413-356 424-360ZM576-414 758-478V-482L576-546Z",
  "text_select_end": "M480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200H680V-760H640Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840H800Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760H760V-200H800Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "text_snippet": "M200-200H760Q760-200 760-200Q760-200 760-200V-567L567-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H567Q583-840 597.5-834Q612-828 623-817L817-623Q828-612 834-597.5Q840-583 840-567V-200Q840-167 816.5-143.5Q793-120 760-120ZM320-280H640Q657-280 668.5-291.5Q680-303 680-320Q680-337 668.5-348.5Q657-360 640-360H320Q303-360 291.5-348.5Q280-337 280-320Q280-303 291.5-291.5Q303-280 320-280ZM320-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM320-600H520Q537-600 548.5-611.5Q560-623 560-640Q560-657 548.5-668.5Q537-680 520-680H320Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760V-567V-200Q200-200 200-200Q200-200 200-200Z",
  "title": "M420-680H260Q235-680 217.5-697.5Q200-715 200-740Q200-765 217.5-782.5Q235-800 260-800H700Q725-800 742.5-782.5Q760-765 760-740Q760-715 742.5-697.5Q725-680 700-680H540V-220Q540-195 522.5-177.5Q505-160 480-160Q455-160 437.5-177.5Q420-195 420-220Z",
  "toc": "M160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H640Q657-360 668.5-348.5Q680-337 680-320Q680-303 668.5-291.5Q657-280 640-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H640Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680H640Q657-680 668.5-668.5Q680-657 680-640Q680-623 668.5-611.5Q657-600 640-600ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600Z",
  "toolbar": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-640H760V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760ZM760-560H200V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200ZM200-640V-560V-640ZM200-640V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-640ZM200-560V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-560Z",
  "track_changes": "M480-880Q497-880 508.5-868.5Q520-857 520-840V-549Q538-538 549-520.5Q560-503 560-480Q560-447 536.5-423.5Q513-400 480-400Q447-400 423.5-423.5Q400-447 400-480Q400-503 411-521Q422-539 440-549V-635Q388-621 354-578.5Q320-536 320-480Q320-414 367-367Q414-320 480-320Q546-320 593-367Q640-414 640-480Q640-506 632.5-528Q625-550 612-570Q602-584 603-601Q604-618 615-629Q627-641 643.5-641Q660-641 670-627Q693-596 706.5-559Q720-522 720-480Q720-380 650-310Q580-240 480-240Q380-240 310-310Q240-380 240-480Q240-570 297-636.5Q354-703 440-717V-798Q321-783 240.5-693Q160-603 160-480Q160-346 253-253Q346-160 480-160Q614-160 707-253Q800-346 800-480Q800-538 781-589.5Q762-641 727-683Q716-696 716-713Q716-730 728-742Q740-754 756.5-753.5Q773-753 784-740Q829-687 854.5-621Q880-555 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Z",
  "tune": "M440-160V-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320V-280H800Q817-280 828.5-268.5Q840-257 840-240Q840-223 828.5-211.5Q817-200 800-200H520V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160ZM160-200Q143-200 131.5-211.5Q120-223 120-240Q120-257 131.5-268.5Q143-280 160-280H320Q337-280 348.5-268.5Q360-257 360-240Q360-223 348.5-211.5Q337-200 320-200ZM280-400V-440H160Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H280V-560Q280-577 291.5-588.5Q303-600 320-600Q337-600 348.5-588.5Q360-577 360-560V-400Q360-383 348.5-371.5Q337-360 320-360Q303-360 291.5-371.5Q280-383 280-400ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM600-640V-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800V-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680H680V-640Q680-623 668.5-611.5Q657-600 640-600Q623-600 611.5-611.5Q600-623 600-640ZM160-680Q143-680 131.5-691.5Q120-703 120-720Q120-737 131.5-748.5Q143-760 160-760H480Q497-760 508.5-748.5Q520-737 520-720Q520-703 508.5-691.5Q497-680 480-680Z",
  "undo": "M320-200Q303-200 291.5-211.5Q280-223 280-240Q280-257 291.5-268.5Q303-280 320-280H564Q627-280 673.5-320Q720-360 720-420Q720-480 673.5-520Q627-560 564-560H312L388-484Q399-473 399-456Q399-439 388-428Q377-417 360-417Q343-417 332-428L188-572Q182-578 179.5-585Q177-592 177-600Q177-608 179.5-615Q182-622 188-628L332-772Q343-783 360-783Q377-783 388-772Q399-761 399-744Q399-727 388-716L312-640H564Q661-640 730.5-577Q800-514 800-420Q800-326 730.5-263Q661-200 564-200Z",
  "unfold_less": "M480-284 384-188Q373-177 356-177Q339-177 328-188Q317-199 317-216Q317-233 328-244L452-368Q458-374 465-376.5Q472-379 480-379Q488-379 495-376.5Q502-374 508-368L632-244Q643-233 643-216Q643-199 632-188Q621-177 604-177Q587-177 576-188ZM480-676 576-772Q587-783 604-783Q621-783 632-772Q643-761 643-744Q643-727 632-716L508-592Q502-586 495-583.5Q488-581 480-581Q472-581 465-583.5Q458-586 452-592L328-716Q317-727 317-744Q317-761 328-772Q339-783 356-783Q373-783 384-772Z",
  "unfold_more": "M480-236 573-329Q585-341 602-341Q619-341 631-329Q643-317 643-300Q643-283 631-271L508-148Q502-142 495-139.5Q488-137 480-137Q472-137 465-139.5Q458-142 452-148L329-271Q317-283 317-300Q317-317 329-329Q341-341 358-341Q375-341 387-329ZM480-720 387-627Q375-615 358-615Q341-615 329-627Q317-639 317-656Q317-673 329-685L452-808Q458-814 465-816.5Q472-819 480-819Q488-819 495-816.5Q502-814 508-808L631-685Q643-673 643-656Q643-639 631-627Q619-615 602-615Q585-615 573-627Z",
  "upload_file": "M440-367V-240Q440-223 451.5-211.5Q463-200 480-200Q497-200 508.5-211.5Q520-223 520-240V-367L556-331Q562-325 569.5-322Q577-319 584.5-319.5Q592-320 599-323Q606-326 612-332Q623-344 623.5-360Q624-376 612-388L508-492Q502-498 495-500.5Q488-503 480-503Q472-503 465-500.5Q458-498 452-492L348-388Q336-376 336.5-360Q337-344 349-332Q361-321 377-320.5Q393-320 405-332ZM240-80Q207-80 183.5-103.5Q160-127 160-160V-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-160Q800-127 776.5-103.5Q753-80 720-80ZM520-640V-800H240Q240-800 240-800Q240-800 240-800V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-600H560Q543-600 531.5-611.5Q520-623 520-640ZM240-800V-640Q240-623 240-611.5Q240-600 240-600V-800V-640Q240-623 240-611.5Q240-600 240-600V-160Q240-160 240-160Q240-160 240-160Q240-160 240-160Q240-160 240-160V-800Q240-800 240-800Q240-800 240-800Z",
  "uppercase": "M660-280V-488L624-452Q613-441 596-441Q579-441 568-452Q557-463 557-480Q557-497 568-508L672-612Q684-624 700-624Q716-624 728-612L832-508Q843-497 843-480Q843-463 832-452Q821-441 804-441Q787-441 776-452L740-488V-280Q740-263 728.5-251.5Q717-240 700-240Q683-240 671.5-251.5Q660-263 660-280ZM236-353 204-263Q200-252 191-246Q182-240 171-240Q152-240 141.5-255.5Q131-271 138-288L276-656Q280-667 290-673.5Q300-680 311-680H338Q349-680 359-673.5Q369-667 373-656L511-287Q518-270 507.5-255Q497-240 479-240Q468-240 458.5-246.5Q449-253 445-264L414-353ZM259-417H390L325-599H321Z",
  "vertical_align_bottom": "M200-120Q183-120 171.5-131.5Q160-143 160-160Q160-177 171.5-188.5Q183-200 200-200H760Q777-200 788.5-188.5Q800-177 800-160Q800-143 788.5-131.5Q777-120 760-120ZM452-308 308-452Q297-463 297-480Q297-497 308-508Q319-519 336-519Q353-519 364-508L440-432V-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800V-432L596-508Q607-519 624-519Q641-519 652-508Q663-497 663-480Q663-463 652-452L508-308Q502-302 495-299.5Q488-297 480-297Q472-297 465-299.5Q458-302 452-308Z",
  "vertical_align_center": "M440-248 404-212Q393-201 376-201Q359-201 348-212Q337-223 337-240Q337-257 348-268L452-372Q458-378 465-380.5Q472-383 480-383Q488-383 495-380.5Q502-378 508-372L612-268Q623-257 623-240Q623-223 612-212Q601-201 584-201Q567-201 556-212L520-248V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120ZM200-440Q183-440 171.5-451.5Q160-463 160-480Q160-497 171.5-508.5Q183-520 200-520H760Q777-520 788.5-508.5Q800-497 800-480Q800-463 788.5-451.5Q777-440 760-440ZM440-712V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-712L556-748Q567-759 584-759Q601-759 612-748Q623-737 623-720Q623-703 612-692L508-588Q502-582 495-579.5Q488-577 480-577Q472-577 465-579.5Q458-582 452-588L348-692Q337-703 337-720Q337-737 348-748Q359-759 376-759Q393-759 404-748Z",
  "vertical_align_top": "M200-760Q183-760 171.5-771.5Q160-783 160-800Q160-817 171.5-828.5Q183-840 200-840H760Q777-840 788.5-828.5Q800-817 800-800Q800-783 788.5-771.5Q777-760 760-760ZM440-160V-528L364-452Q353-441 336-441Q319-441 308-452Q297-463 297-480Q297-497 308-508L452-652Q458-658 465-660.5Q472-663 480-663Q488-663 495-660.5Q502-658 508-652L652-508Q663-497 663-480Q663-463 652-452Q641-441 624-441Q607-441 596-452L520-528V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160Z",
  "vertical_distribute": "M120-80Q103-80 91.5-91.5Q80-103 80-120Q80-137 91.5-148.5Q103-160 120-160H840Q857-160 868.5-148.5Q880-137 880-120Q880-103 868.5-91.5Q857-80 840-80ZM340-420Q315-420 297.5-437.5Q280-455 280-480Q280-505 297.5-522.5Q315-540 340-540H620Q645-540 662.5-522.5Q680-505 680-480Q680-455 662.5-437.5Q645-420 620-420ZM120-800Q103-800 91.5-811.5Q80-823 80-840Q80-857 91.5-868.5Q103-880 120-880H840Q857-880 868.5-868.5Q880-857 880-840Q880-823 868.5-811.5Q857-800 840-800Z",
  "view_agenda": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM200-600H760Q760-600 760-600Q760-600 760-600V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-360Q760-360 760-360Q760-360 760-360H200Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600Q200-600 200-600Q200-600 200-600V-760Q200-760 200-760Q200-760 200-760ZM200-360Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-360Q200-360 200-360Q200-360 200-360Z",
  "view_column": "M121-280V-680Q121-713 144.5-736.5Q168-760 201-760H760Q793-760 816.5-736.5Q840-713 840-680V-280Q840-247 816.5-223.5Q793-200 760-200H201Q168-200 144.5-223.5Q121-247 121-280ZM200-280H333Q333-280 333-280Q333-280 333-280V-680Q333-680 333-680Q333-680 333-680H200Q200-680 200-680Q200-680 200-680V-280Q200-280 200-280Q200-280 200-280ZM413-280H546Q546-280 546-280Q546-280 546-280V-680Q546-680 546-680Q546-680 546-680H413Q413-680 413-680Q413-680 413-680V-280Q413-280 413-280Q413-280 413-280ZM626-280H759Q759-280 759-280Q759-280 759-280V-680Q759-680 759-680Q759-680 759-680H626Q626-680 626-680Q626-680 626-680V-280Q626-280 626-280Q626-280 626-280Z",
  "view_column_2": "M600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM600-760V-200Q600-200 600-200Q600-200 600-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200V-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760ZM760-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760Q600-760 600-760Q600-760 600-760H760Q760-760 760-760Q760-760 760-760ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760H360Q360-760 360-760Q360-760 360-760Z",
  "view_compact_alt": "M340-300H420Q437-300 448.5-311.5Q460-323 460-340V-420Q460-437 448.5-448.5Q437-460 420-460H340Q323-460 311.5-448.5Q300-437 300-420V-340Q300-323 311.5-311.5Q323-300 340-300ZM340-500H420Q437-500 448.5-511.5Q460-523 460-540V-620Q460-637 448.5-648.5Q437-660 420-660H340Q323-660 311.5-648.5Q300-637 300-620V-540Q300-523 311.5-511.5Q323-500 340-500ZM540-300H620Q637-300 648.5-311.5Q660-323 660-340V-420Q660-437 648.5-448.5Q637-460 620-460H540Q523-460 511.5-448.5Q500-437 500-420V-340Q500-323 511.5-311.5Q523-300 540-300ZM540-500H620Q637-500 648.5-511.5Q660-523 660-540V-620Q660-637 648.5-648.5Q637-660 620-660H540Q523-660 511.5-648.5Q500-637 500-620V-540Q500-523 511.5-511.5Q523-500 540-500ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "view_headline": "M199-360Q182-360 171-371.5Q160-383 160-400Q160-417 171.5-428.5Q183-440 200-440H761Q778-440 789-428.5Q800-417 800-400Q800-383 788.5-371.5Q777-360 760-360ZM199-200Q182-200 171-211.5Q160-223 160-240Q160-257 171.5-268.5Q183-280 200-280H761Q778-280 789-268.5Q800-257 800-240Q800-223 788.5-211.5Q777-200 760-200ZM199-520Q182-520 171-531.5Q160-543 160-560Q160-577 171.5-588.5Q183-600 200-600H761Q778-600 789-588.5Q800-577 800-560Q800-543 788.5-531.5Q777-520 760-520ZM199-680Q182-680 171-691.5Q160-703 160-720Q160-737 171.5-748.5Q183-760 200-760H761Q778-760 789-748.5Q800-737 800-720Q800-703 788.5-691.5Q777-680 760-680Z",
  "view_in_ar": "M440-181 240-296Q221-307 210.5-325Q200-343 200-365V-595Q200-617 210.5-635Q221-653 240-664L440-779Q459-790 480-790Q501-790 520-779L720-664Q739-653 749.5-635Q760-617 760-595V-365Q760-343 749.5-325Q739-307 720-296L520-181Q501-170 480-170Q459-170 440-181ZM440-273V-457L280-550V-365Q280-365 280-365Q280-365 280-365ZM520-273 680-365Q680-365 680-365Q680-365 680-365V-550L520-457ZM120-640Q103-640 91.5-651.5Q80-663 80-680V-800Q80-833 103.5-856.5Q127-880 160-880H280Q297-880 308.5-868.5Q320-857 320-840Q320-823 308.5-811.5Q297-800 280-800H160Q160-800 160-800Q160-800 160-800V-680Q160-663 148.5-651.5Q137-640 120-640ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-280Q80-297 91.5-308.5Q103-320 120-320Q137-320 148.5-308.5Q160-297 160-280V-160Q160-160 160-160Q160-160 160-160H280Q297-160 308.5-148.5Q320-137 320-120Q320-103 308.5-91.5Q297-80 280-80ZM800-80H680Q663-80 651.5-91.5Q640-103 640-120Q640-137 651.5-148.5Q663-160 680-160H800Q800-160 800-160Q800-160 800-160V-280Q800-297 811.5-308.5Q823-320 840-320Q857-320 868.5-308.5Q880-297 880-280V-160Q880-127 856.5-103.5Q833-80 800-80ZM800-680V-800Q800-800 800-800Q800-800 800-800H680Q663-800 651.5-811.5Q640-823 640-840Q640-857 651.5-868.5Q663-880 680-880H800Q833-880 856.5-856.5Q880-833 880-800V-680Q880-663 868.5-651.5Q857-640 840-640Q823-640 811.5-651.5Q800-663 800-680ZM480-526 638-619 480-710Q480-710 480-710Q480-710 480-710L322-619ZM480-481ZM480-526ZM520-457ZM440-457Z",
  "view_sidebar": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM700-613H800Q800-613 800-613Q800-613 800-613V-720Q800-720 800-720Q800-720 800-720H700Q700-720 700-720Q700-720 700-720V-613Q700-613 700-613Q700-613 700-613ZM700-427H800Q800-427 800-427Q800-427 800-427V-533Q800-533 800-533Q800-533 800-533H700Q700-533 700-533Q700-533 700-533V-427Q700-427 700-427Q700-427 700-427ZM160-240H620Q620-240 620-240Q620-240 620-240V-720Q620-720 620-720Q620-720 620-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM700-240H800Q800-240 800-240Q800-240 800-240V-347Q800-347 800-347Q800-347 800-347H700Q700-347 700-347Q700-347 700-347V-240Q700-240 700-240Q700-240 700-240Z",
  "view_week": "M160-240H320Q320-240 320-240Q320-240 320-240V-720Q320-720 320-720Q320-720 320-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM400-240H560Q560-240 560-240Q560-240 560-240V-720Q560-720 560-720Q560-720 560-720H400Q400-720 400-720Q400-720 400-720V-240Q400-240 400-240Q400-240 400-240ZM640-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H640Q640-720 640-720Q640-720 640-720V-240Q640-240 640-240Q640-240 640-240ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160Z",
  "visibility": "M480-320Q555-320 607.5-372.5Q660-425 660-500Q660-575 607.5-627.5Q555-680 480-680Q405-680 352.5-627.5Q300-575 300-500Q300-425 352.5-372.5Q405-320 480-320ZM480-392Q435-392 403.5-423.5Q372-455 372-500Q372-545 403.5-576.5Q435-608 480-608Q525-608 556.5-576.5Q588-545 588-500Q588-455 556.5-423.5Q525-392 480-392ZM61-462Q56-471 53.5-480.5Q51-490 51-500Q51-510 53.5-519.5Q56-529 61-538Q125-656 235.5-728Q346-800 480-800Q614-800 724.5-728Q835-656 899-538Q904-529 906.5-519.5Q909-510 909-500Q909-490 906.5-480.5Q904-471 899-462Q835-344 724.5-272Q614-200 480-200Q346-200 235.5-272Q125-344 61-462ZM480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500ZM832-500Q782-601 687.5-660.5Q593-720 480-720Q367-720 272.5-660.5Q178-601 128-500Q178-399 272.5-339.5Q367-280 480-280Q593-280 687.5-339.5Q782-399 832-500Z",
  "visibility_off": "M607-627Q636-598 649.5-561Q663-524 659-485Q659-470 648-459.5Q637-449 622-449Q607-449 596.5-459.5Q586-470 586-485Q591-511 583-535Q575-559 558-576Q541-593 517-602Q493-611 466-606Q451-606 440.5-617Q430-628 430-643Q430-658 440.5-668.5Q451-679 466-679Q504-683 541-669.5Q578-656 607-627ZM480-720Q461-720 443-718.5Q425-717 407-713Q390-710 376.5-718Q363-726 358-742Q353-758 361.5-773Q370-788 386-791Q409-796 432.5-798Q456-800 480-800Q617-800 730.5-728Q844-656 904-534Q908-526 910-517.5Q912-509 912-500Q912-491 910.5-482.5Q909-474 905-466Q887-426 860.5-391Q834-356 802-327Q790-316 774-318Q758-320 748-334Q738-348 739.5-364.5Q741-381 753-392Q777-415 797-442Q817-469 832-500Q782-601 687.5-660.5Q593-720 480-720ZM480-200Q346-200 235-272.5Q124-345 60-463Q55-471 52.5-480.5Q50-490 50-500Q50-510 52-519Q54-528 59-537Q79-577 105.5-613.5Q132-650 166-680L83-764Q72-776 72.5-792.5Q73-809 84-820Q95-831 112-831Q129-831 140-820L820-140Q831-129 831.5-112.5Q832-96 820-84Q809-73 792-73Q775-73 764-84L624-222Q589-211 553-205.5Q517-200 480-200ZM222-624Q193-598 169-567Q145-536 128-500Q178-399 272.5-339.5Q367-280 480-280Q500-280 519-282.5Q538-285 558-288L522-326Q511-323 501-321.5Q491-320 480-320Q405-320 352.5-372.5Q300-425 300-500Q300-511 301.5-521Q303-531 306-542ZM541-531Q541-531 541-531Q541-531 541-531Q541-531 541-531Q541-531 541-531Q541-531 541-531Q541-531 541-531ZM390-456Q390-456 390-456Q390-456 390-456Q390-456 390-456Q390-456 390-456Q390-456 390-456Q390-456 390-456Z",
  "warning": "M109-120Q98-120 89-125.5Q80-131 75-140Q70-149 69.5-159.5Q69-170 75-180L445-820Q451-830 460.5-835Q470-840 480-840Q490-840 499.5-835Q509-830 515-820L885-180Q891-170 890.5-159.5Q890-149 885-140Q880-131 871-125.5Q862-120 851-120ZM178-200H782L480-720ZM480-240Q497-240 508.5-251.5Q520-263 520-280Q520-297 508.5-308.5Q497-320 480-320Q463-320 451.5-308.5Q440-297 440-280Q440-263 451.5-251.5Q463-240 480-240ZM520-400V-520Q520-537 508.5-548.5Q497-560 480-560Q463-560 451.5-548.5Q440-537 440-520V-400Q440-383 451.5-371.5Q463-360 480-360Q497-360 508.5-371.5Q520-383 520-400ZM480-460Z",
  "web_asset": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-640H160V-240Q160-240 160-240Q160-240 160-240Z",
  "width": "M273-440 308-403Q319-392 319-375.5Q319-359 308-348Q296-336 279.5-336Q263-336 252-348L148-451Q142-457 139-464.5Q136-472 136-480Q136-488 139-495Q142-502 148-508L252-612Q263-623 279.5-623Q296-623 308-612Q320-600 320-583.5Q320-567 308-555L273-520H687L651-556Q640-567 640-583.5Q640-600 652-612Q663-623 679.5-623Q696-623 708-612L811-508Q817-502 820-495Q823-488 823-480Q823-472 820-464.5Q817-457 811-451L707-347Q696-336 679.5-336Q663-336 651-348Q640-359 640-375.5Q640-392 651-403L687-440Z",
  "width_normal": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H320V-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM400-240H560V-720H400ZM640-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H640ZM400-240V-720V-240Z",
  "wrap_text": "M200-460Q183-460 171.5-471.5Q160-483 160-500Q160-517 171.5-528.5Q183-540 200-540H690Q753-540 796.5-496.5Q840-453 840-390Q840-327 796.5-283.5Q753-240 690-240H594L616-218Q628-206 627.5-190Q627-174 616-162Q604-150 587.5-149.5Q571-149 559-161L468-252Q462-258 459.5-265Q457-272 457-280Q457-288 459.5-295Q462-302 468-308L559-399Q571-411 587.5-411Q604-411 616-399Q627-387 627.5-370.5Q628-354 616-342L594-320H690Q719-320 739.5-340.5Q760-361 760-390Q760-419 739.5-439.5Q719-460 690-460ZM200-240Q183-240 171.5-251.5Q160-263 160-280Q160-297 171.5-308.5Q183-320 200-320H320Q337-320 348.5-308.5Q360-297 360-280Q360-263 348.5-251.5Q337-240 320-240ZM200-680Q183-680 171.5-691.5Q160-703 160-720Q160-737 171.5-748.5Q183-760 200-760H760Q777-760 788.5-748.5Q800-737 800-720Q800-703 788.5-691.5Q777-680 760-680Z",
  "zoom_in": "M340-540H300Q283-540 271.5-551.5Q260-563 260-580Q260-597 271.5-608.5Q283-620 300-620H340V-660Q340-677 351.5-688.5Q363-700 380-700Q397-700 408.5-688.5Q420-677 420-660V-620H460Q477-620 488.5-608.5Q500-597 500-580Q500-563 488.5-551.5Q477-540 460-540H420V-500Q420-483 408.5-471.5Q397-460 380-460Q363-460 351.5-471.5Q340-483 340-500ZM380-320Q271-320 195.5-395.5Q120-471 120-580Q120-689 195.5-764.5Q271-840 380-840Q489-840 564.5-764.5Q640-689 640-580Q640-536 626-497Q612-458 588-428L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L532-372Q502-348 463-334Q424-320 380-320ZM380-400Q455-400 507.5-452.5Q560-505 560-580Q560-655 507.5-707.5Q455-760 380-760Q305-760 252.5-707.5Q200-655 200-580Q200-505 252.5-452.5Q305-400 380-400Z",
  "zoom_out": "M320-540Q303-540 291.5-551.5Q280-563 280-580Q280-597 291.5-608.5Q303-620 320-620H440Q457-620 468.5-608.5Q480-597 480-580Q480-563 468.5-551.5Q457-540 440-540ZM380-320Q271-320 195.5-395.5Q120-471 120-580Q120-689 195.5-764.5Q271-840 380-840Q489-840 564.5-764.5Q640-689 640-580Q640-536 626-497Q612-458 588-428L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L532-372Q502-348 463-334Q424-320 380-320ZM380-400Q455-400 507.5-452.5Q560-505 560-580Q560-655 507.5-707.5Q455-760 380-760Q305-760 252.5-707.5Q200-655 200-580Q200-505 252.5-452.5Q305-400 380-400Z"
};

// ../../../shared/ui/src/toolbar/icons.ts
function symbol(name, cls = "uo-ic") {
  if (!name) return "";
  const raw = name.startsWith("<") ? name : SYMBOLS[name] ? `<path d="${SYMBOLS[name]}"/>` : "";
  if (!raw) return "";
  return `<svg class="${cls}" viewBox="0 -960 960 960" aria-hidden="true">${raw}</svg>`;
}
function hasSymbol(name) {
  return name in SYMBOLS;
}

// ../../../shared/ui/src/toolbar/menu.ts
var stack = [];
var rootOpts = null;
var rootAnchor = null;
var detach = null;
var hoverTimer = 0;
function isMenuOpen() {
  return stack.length > 0;
}
function isMenuOpenFor(anchor) {
  return stack.length > 0 && rootAnchor === anchor;
}
function closeMenus() {
  window.clearTimeout(hoverTimer);
  for (const l of stack) l.el.remove();
  stack = [];
  rootAnchor = null;
  detach?.();
  detach = null;
  const o = rootOpts;
  rootOpts = null;
  o?.onClose?.();
}
var labelText = (l, lang) => l === void 0 ? "" : typeof l === "string" ? l : pickLabels(lang, l);
function resolveItems(src, opts) {
  const entries = typeof src === "function" ? src() : src;
  if (opts.registry) return opts.registry.resolve(entries);
  return entries.filter((e) => typeof e !== "string" && !e.hidden);
}
function closeFrom(level) {
  while (stack.length > level) stack.pop().el.remove();
}
function place2(menu, at) {
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x2, y;
  if ("anchor" in at) {
    const r = at.anchor.getBoundingClientRect();
    if (at.side === "right") {
      x2 = r.right - 2;
      y = r.top - 5;
      if (x2 + mw > vw - 8) x2 = Math.max(8, r.left - mw + 2);
      if (y + mh > vh - 8) y = Math.max(8, vh - mh - 8);
    } else {
      x2 = r.left;
      y = r.bottom + 4;
      if (y + mh > vh - 8) y = r.top - mh - 4 >= 8 ? r.top - mh - 4 : Math.max(8, vh - mh - 8);
    }
  } else {
    x2 = at.x;
    y = at.y;
    if (y + mh > vh - 8) y = Math.max(8, y - mh);
  }
  if (x2 + mw > vw - 8) x2 = Math.max(8, vw - mw - 8);
  menu.style.left = `${Math.max(8, x2)}px`;
  menu.style.top = `${Math.max(8, y)}px`;
}
function focusables(el) {
  return [...el.querySelectorAll(":scope > .uo-menu-item:not([disabled])")];
}
function build(items, level, opts) {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const menu = document.createElement("div");
  menu.className = "uo-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("part", "menu");
  for (const it of items) {
    if (it.sep) {
      const s = document.createElement("div");
      s.className = "uo-menu-sep";
      s.setAttribute("role", "separator");
      menu.appendChild(s);
      continue;
    }
    if (it.content) {
      const box = document.createElement("div");
      box.className = "uo-menu-content";
      box.appendChild(it.content(closeMenus));
      menu.appendChild(box);
      continue;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-menu-item";
    if (it.id) b.dataset["a"] = it.id;
    b.setAttribute("role", it.checked !== void 0 ? "menuitemcheckbox" : "menuitem");
    if (it.checked !== void 0) b.setAttribute("aria-checked", String(!!it.checked));
    if (it.disabled) b.disabled = true;
    if (it.checked) b.classList.add("checked");
    const lead = document.createElement("span");
    lead.className = "lead";
    if (it.swatch !== void 0) {
      const sw = document.createElement("span");
      sw.className = "sw";
      if (it.swatch) sw.style.background = it.swatch;
      else sw.style.borderStyle = "dashed";
      lead.appendChild(sw);
    } else if (it.icon) lead.innerHTML = symbol(it.icon);
    else if (it.checked) lead.innerHTML = symbol("check");
    const lb = document.createElement("span");
    lb.className = "lb";
    lb.textContent = labelText(it.label, lang);
    b.append(lead, lb);
    if (it.submenu) {
      b.setAttribute("aria-haspopup", "menu");
      const ar = document.createElement("span");
      ar.className = "sc";
      ar.innerHTML = symbol("chevron_right");
      b.appendChild(ar);
    } else if (it.shortcut) {
      const sc = document.createElement("span");
      sc.className = "sc";
      sc.textContent = it.shortcut;
      b.appendChild(sc);
    }
    if (customElements.get("u-ripple") && !it.disabled) b.appendChild(document.createElement("u-ripple"));
    b.addEventListener("mousedown", (e) => e.preventDefault());
    const openSub = (focus) => {
      window.clearTimeout(hoverTimer);
      if (stack[level + 1]?.parentBtn === b) return;
      closeFrom(level + 1);
      const sub = resolveItems(it.submenu, opts);
      if (!sub.length) return;
      const el = build(sub, level + 1, opts);
      (opts.layer ?? document.body).appendChild(el);
      place2(el, { anchor: b, side: "right" });
      stack.push({ el, items: sub, parentBtn: b });
      if (focus) focusables(el)[0]?.focus();
    };
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (it.submenu) {
        openSub(false);
        return;
      }
      closeMenus();
      it.onClick?.();
    });
    b.addEventListener("mouseenter", () => {
      window.clearTimeout(hoverTimer);
      if (it.submenu) hoverTimer = window.setTimeout(() => openSub(false), 160);
      else if (stack.length > level + 1) hoverTimer = window.setTimeout(() => closeFrom(level + 1), 220);
    });
    b._openSub = it.submenu ? openSub : void 0;
    menu.appendChild(b);
  }
  return menu;
}
function openMenu(src, at, opts = {}) {
  closeMenus();
  const items = resolveItems(src, opts);
  if (!items.length) return null;
  const el = build(items, 0, opts);
  (opts.layer ?? document.body).appendChild(el);
  place2(el, at);
  stack = [{ el, items }];
  rootOpts = opts;
  rootAnchor = "anchor" in at ? at.anchor : null;
  if (opts.focus) focusables(el)[0]?.focus();
  const inMenus = (e) => {
    const path = e.composedPath();
    return stack.some((l) => path.includes(l.el)) || !!rootAnchor && path.includes(rootAnchor);
  };
  const onDown = (e) => {
    if (!inMenus(e)) closeMenus();
  };
  const onKey = (e) => {
    if (!stack.length) return;
    const top = stack[stack.length - 1];
    const items2 = focusables(top.el);
    const active = top.el.getRootNode() instanceof ShadowRoot ? top.el.getRootNode().activeElement : document.activeElement;
    const i2 = items2.indexOf(active);
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    switch (e.key) {
      case "Escape":
        handled();
        if (stack.length > 1) {
          const p = top.parentBtn;
          closeFrom(stack.length - 1);
          p?.focus();
        } else closeMenus();
        break;
      case "ArrowDown":
        handled();
        items2[(i2 + 1) % items2.length]?.focus();
        break;
      case "ArrowUp":
        handled();
        items2[(i2 - 1 + items2.length) % items2.length]?.focus();
        break;
      case "Home":
        handled();
        items2[0]?.focus();
        break;
      case "End":
        handled();
        items2[items2.length - 1]?.focus();
        break;
      case "ArrowRight": {
        handled();
        const open2 = items2[i2]?._openSub;
        if (open2) open2(true);
        else rootOpts?.onNavigate?.(1);
        break;
      }
      case "ArrowLeft":
        handled();
        if (stack.length > 1) {
          const p = top.parentBtn;
          closeFrom(stack.length - 1);
          p?.focus();
        } else rootOpts?.onNavigate?.(-1);
        break;
      case "Enter":
      case " ":
        if (i2 >= 0) {
          handled();
          items2[i2].click();
        }
        break;
      case "Tab":
        handled();
        closeMenus();
        break;
    }
  };
  const onBlur = () => closeMenus();
  const t2 = window.setTimeout(() => {
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("contextmenu", onDown, true);
    window.addEventListener("resize", onBlur);
    window.addEventListener("blur", onBlur);
  }, 0);
  document.addEventListener("keydown", onKey, true);
  detach = () => {
    window.clearTimeout(t2);
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("contextmenu", onDown, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onBlur);
    window.removeEventListener("blur", onBlur);
  };
  return el;
}

// ../../../shared/ui/src/toolbar/dialog.ts
var LABELS2 = {
  en: { ok: "OK", cancel: "Cancel", close: "Close" },
  pt: { ok: "OK", cancel: "Cancelar", close: "Fechar" },
  es: { ok: "Aceptar", cancel: "Cancelar", close: "Cerrar" }
};
var open = /* @__PURE__ */ new Set();
function closeDialogs(layer) {
  for (const h of [...open]) if (!layer || layer.contains(h.el)) h.close(null);
  for (const d of layer?.querySelectorAll("dialog") ?? []) if (d.open) d.close();
}
var txt = (l, lang) => typeof l === "string" ? l : pickLabels(lang, l);
function openDialog(opts) {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const L2 = pickLabels(lang, LABELS2);
  const dlg = document.createElement("dialog");
  dlg.className = "uo-dialog";
  dlg.setAttribute("part", "dialog");
  if (opts.width) dlg.style.width = `${opts.width}px`;
  const head = document.createElement("div");
  head.className = "uo-dialog-head";
  head.innerHTML = `${opts.icon ? `<span class="uo-dialog-icon">${symbol(opts.icon)}</span>` : ""}<span class="uo-dialog-title"></span><button type="button" class="uo-btn uo-dialog-x" title="${L2.close}">${symbol("close")}</button>`;
  head.querySelector(".uo-dialog-title").textContent = txt(opts.title, lang);
  const body = document.createElement("div");
  body.className = "uo-dialog-body";
  if (typeof opts.body === "string") body.textContent = opts.body;
  else body.appendChild(opts.body);
  dlg.append(head, body);
  const actions = opts.actions ?? [{ id: "ok", label: L2.ok, primary: true }];
  if (actions.length) {
    const bar = document.createElement("div");
    bar.className = "uo-dialog-actions";
    for (const a of actions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = a.primary ? "uo-pill uo-pill-primary" : "uo-pill";
      b.dataset["action"] = a.id;
      b.textContent = txt(a.label, lang);
      b.addEventListener("click", () => {
        if (opts.onAction?.(a.id, dlg) === false) return;
        handle.close(a.id);
      });
      bar.appendChild(b);
    }
    dlg.appendChild(bar);
  }
  let resolve;
  const result = new Promise((r) => {
    resolve = r;
  });
  let done = false;
  const handle = {
    el: dlg,
    result,
    close(value = null) {
      if (done) return;
      done = true;
      open.delete(handle);
      if (dlg.open) dlg.close();
      dlg.remove();
      resolve(value);
    },
    setTitle(t2) {
      head.querySelector(".uo-dialog-title").textContent = txt(t2, lang);
    }
  };
  head.querySelector(".uo-dialog-x").addEventListener("click", () => handle.close(null));
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    handle.close(null);
  });
  dlg.addEventListener("mousedown", (e) => {
    if (e.target !== dlg || opts.modal === false) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) handle.close(null);
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.target.tagName === "TEXTAREA") return;
    if (e.target.tagName !== "INPUT") return;
    const p = dlg.querySelector(".uo-pill-primary");
    if (p) {
      e.preventDefault();
      p.click();
    }
  });
  (opts.layer ?? document.body).appendChild(dlg);
  open.add(handle);
  if (opts.modal === false) dlg.show();
  else dlg.showModal();
  const first = body.querySelector("input, select, textarea");
  if (first) {
    first.focus();
    if (first instanceof HTMLInputElement) first.select();
  }
  return handle;
}
async function promptDialog(opts) {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const L2 = pickLabels(lang, LABELS2);
  const box = document.createElement("label");
  box.className = "uo-field";
  if (opts.label) {
    const s = document.createElement("span");
    s.textContent = txt(opts.label, lang);
    box.appendChild(s);
  }
  const input = document.createElement(opts.multiline ? "textarea" : "input");
  input.value = opts.value ?? "";
  if (opts.placeholder) input.placeholder = opts.placeholder;
  box.appendChild(input);
  const h = openDialog({
    title: opts.title,
    body: box,
    layer: opts.layer,
    lang,
    actions: [{ id: "cancel", label: L2.cancel }, { id: "ok", label: opts.ok ?? L2.ok, primary: true }]
  });
  return await h.result === "ok" ? input.value : null;
}
function showToast(layer, message, ms = 2600) {
  layer.querySelector(":scope > .uo-toast")?.remove();
  const t2 = document.createElement("div");
  t2.className = "uo-toast";
  t2.setAttribute("role", "status");
  t2.textContent = message;
  layer.appendChild(t2);
  window.setTimeout(() => t2.remove(), ms);
}

// ../../../shared/ui/src/toolbar/gallery.ts
var L_UP = { en: "Previous row", pt: "Linha anterior", es: "Fila anterior" };
var L_DOWN = { en: "Next row", pt: "Pr\xF3xima linha", es: "Fila siguiente" };
var L_MORE = { en: "More", pt: "Mais", es: "M\xE1s" };
var GAP = 2;
var PAD = 6;
var openGrid = null;
function closeGallery() {
  openGrid?.close();
}
function renderGallery(cfg, ctx, inline) {
  const reg = ctx.registry;
  const t2 = (l) => reg.text(l);
  const rows = cfg.rows ?? 1;
  const maxCols = cfg.maxCols ?? 7;
  const minCols = Math.min(cfg.minCols ?? 3, maxCols);
  let cols = maxCols;
  let top = 0;
  let items = [];
  let itemsKey = "";
  let drawn = /* @__PURE__ */ Symbol("none");
  let sel;
  const enabled = () => {
    try {
      return cfg.isEnabled?.() ?? true;
    } catch {
      return false;
    }
  };
  const vis = () => {
    try {
      return cfg.supports?.() ?? true;
    } catch {
      return false;
    }
  };
  const tile = (it) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-gal-tile";
    b.dataset["id"] = it.id;
    b.setAttribute("role", "option");
    b.title = t2(it.tip ?? it.label);
    b.setAttribute("aria-label", t2(it.label));
    b.style.width = `${cfg.tile.w}px`;
    b.style.height = `${cfg.tile.h}px`;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      closeGallery();
      cfg.onPick(it.id);
      ctx.after();
    });
    b.addEventListener("contextmenu", (e) => {
      if (!cfg.context) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(cfg.context(it), { x: e.clientX, y: e.clientY }, { lang: ctx.lang, registry: reg, layer: ctx.layer, onClose: () => ctx.after() });
    });
    b.addEventListener("keydown", (e) => keyNav(e, b));
    cfg.render(b, it);
    ripple(b);
    return b;
  };
  const keyNav = (e, b) => {
    const grid = b.parentElement;
    if (!grid) return;
    const list = [...grid.querySelectorAll(".uo-gal-tile")];
    const i2 = list.indexOf(b);
    const n = parseInt(getComputedStyle(grid).gridTemplateColumns.split(" ").length.toString(), 10) || cols;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n };
    if (step[e.key] === void 0) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(list.length - 1, i2 + step[e.key]));
    list[j]?.focus();
  };
  const root = document.createElement("div");
  root.dataset["a"] = `gallery:${cfg.id}`;
  let view = null, strip = null;
  let up = null, down = null;
  let trigText = null;
  const navBtn = (icon, lbl, a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-btn uo-gal-nav-btn";
    b.dataset["a"] = `gallery:${cfg.id}:${a}`;
    b.title = t2(lbl);
    b.setAttribute("aria-label", t2(lbl));
    b.innerHTML = symbol(icon);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    ripple(b);
    return b;
  };
  if (inline) {
    root.className = "uo-gal";
    root.setAttribute("role", "listbox");
    root.setAttribute("aria-label", t2(cfg.label));
    view = document.createElement("div");
    view.className = "uo-gal-view";
    view.style.height = `${rows * cfg.tile.h + (rows - 1) * GAP + PAD}px`;
    strip = document.createElement("div");
    strip.className = "uo-gal-grid";
    view.appendChild(strip);
    const nav = document.createElement("div");
    nav.className = "uo-gal-nav";
    up = navBtn("keyboard_arrow_up", L_UP, "up");
    down = navBtn("keyboard_arrow_down", L_DOWN, "down");
    const more = navBtn("expand_more", L_MORE, "more");
    up.addEventListener("click", () => {
      top = Math.max(0, top - 1);
      layoutStrip();
    });
    down.addEventListener("click", () => {
      top = Math.min(lastTop(), top + 1);
      layoutStrip();
    });
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleGrid(root);
    });
    nav.append(up, down, more);
    root.append(view, nav);
  } else {
    root.className = "uo-btn uo-drop uo-combo uo-gal-trigger";
    root.setAttribute("role", "button");
    root.setAttribute("aria-haspopup", "listbox");
    root.tabIndex = 0;
    root.title = t2(cfg.label);
    root.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    trigText = root.querySelector(".uo-drop-text");
    root.addEventListener("mousedown", (e) => e.preventDefault());
    root.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!root.hasAttribute("aria-disabled")) toggleGrid(root);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        toggleGrid(root);
      }
    });
    ripple(root);
  }
  const lastTop = () => Math.max(0, Math.ceil(items.length / cols) - rows);
  const stripWidth = (c2) => c2 * cfg.tile.w + (c2 - 1) * GAP + PAD;
  const layoutStrip = () => {
    if (!strip || !view) return;
    strip.style.gridTemplateColumns = `repeat(${cols}, ${cfg.tile.w}px)`;
    view.style.width = `${stripWidth(cols)}px`;
    top = Math.min(top, lastTop());
    strip.style.transform = `translateY(${-top * (cfg.tile.h + GAP)}px)`;
    up.disabled = top <= 0;
    down.disabled = top >= lastTop();
    for (const b of strip.querySelectorAll(".uo-gal-tile")) {
      const i2 = items.findIndex((x2) => x2.id === b.dataset["id"]);
      const row = Math.floor(i2 / cols);
      b.tabIndex = row >= top && row < top + rows ? 0 : -1;
    }
  };
  const reveal = () => {
    const i2 = items.findIndex((x2) => x2.id === sel);
    if (i2 < 0) return;
    const row = Math.floor(i2 / cols);
    if (row < top) top = row;
    else if (row >= top + rows) top = row - rows + 1;
  };
  const rebuild = () => {
    if (!strip) return;
    strip.replaceChildren(...items.map(tile));
    layoutStrip();
  };
  const markSel = (scope) => {
    for (const b of scope.querySelectorAll(".uo-gal-tile")) {
      const on = b.dataset["id"] === sel;
      b.classList.toggle("uo-on", on);
      b.setAttribute("aria-selected", String(on));
    }
  };
  const toggleGrid = (anchor) => {
    if (openGrid?.owner === anchor) {
      closeGallery();
      return;
    }
    closeGallery();
    closeMenus();
    items = cfg.items();
    const pop = document.createElement("div");
    pop.className = "uo-pop uo-gal-pop";
    pop.setAttribute("role", "listbox");
    pop.setAttribute("aria-label", t2(cfg.label));
    const n = cfg.expandCols ?? maxCols;
    const secs = cfg.sections?.length ? cfg.sections : [{ id: "", label: "" }];
    for (const s of secs) {
      const its = cfg.sections?.length ? items.filter((it) => (it.section ?? "") === s.id) : items;
      if (!its.length) continue;
      if (s.label) {
        const h = document.createElement("div");
        h.className = "uo-pop-lbl";
        h.textContent = t2(s.label);
        pop.appendChild(h);
      }
      const g = document.createElement("div");
      g.className = "uo-gal-grid";
      g.style.gridTemplateColumns = `repeat(${Math.min(n, its.length)}, ${cfg.tile.w}px)`;
      g.append(...its.map(tile));
      pop.appendChild(g);
    }
    if (cfg.footer) {
      const entries = reg.resolve(typeof cfg.footer === "function" ? cfg.footer() : cfg.footer);
      if (entries.length) {
        const f = document.createElement("div");
        f.className = "uo-gal-foot";
        for (const m of entries) {
          if (m.sep) {
            const s = document.createElement("div");
            s.className = "uo-menu-sep";
            f.appendChild(s);
            continue;
          }
          const b = document.createElement("button");
          b.type = "button";
          b.className = "uo-menu-item";
          if (m.id) b.dataset["a"] = m.id;
          b.disabled = !!m.disabled;
          b.innerHTML = `<span class="lead">${m.icon ? symbol(m.icon) : ""}</span><span class="lb">${esc(m.label === void 0 ? "" : t2(m.label))}</span>` + (m.shortcut ? `<span class="sc">${esc(m.shortcut)}</span>` : "");
          b.addEventListener("mousedown", (e) => e.preventDefault());
          b.addEventListener("click", () => {
            closeGallery();
            m.onClick?.();
            ctx.after();
          });
          f.appendChild(b);
        }
        pop.appendChild(f);
      }
    }
    markSel(pop);
    ctx.layer.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let y = inline ? r.top : r.bottom + 4;
    if (y + pop.offsetHeight > vh - 8) y = Math.max(8, vh - pop.offsetHeight - 8);
    pop.style.top = `${y}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, vw - pop.offsetWidth - 8))}px`;
    anchor.classList.add("uo-open");
    const onDown = (e) => {
      const path = e.composedPath();
      if (path.includes(pop) || path.includes(anchor)) return;
      if (path.some((x2) => x2 instanceof HTMLElement && x2.classList.contains("uo-menu"))) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        anchor.focus?.();
      }
    };
    const close = () => {
      if (openGrid?.owner !== anchor) return;
      openGrid = null;
      pop.remove();
      anchor.classList.remove("uo-open");
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", close);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", close);
    openGrid = { close, owner: anchor };
    (pop.querySelector(".uo-gal-tile.uo-on") ?? pop.querySelector(".uo-gal-tile"))?.focus({ preventScroll: true });
  };
  return {
    el: root,
    visible: vis,
    shrink: () => inline ? Math.max(0, stripWidth(maxCols) - stripWidth(minCols)) : 0,
    fit: (px) => {
      if (!inline) return;
      const want = Math.max(minCols, Math.min(maxCols, Math.floor((stripWidth(maxCols) - px - PAD + GAP) / (cfg.tile.w + GAP))));
      if (want === cols) return;
      cols = want;
      reveal();
      layoutStrip();
    },
    sync: () => {
      const v = vis();
      root.hidden = !v;
      if (!v) return;
      const its = cfg.items();
      const key = its.map((x2) => `${x2.id}${t2(x2.label)}`).join("");
      const ver = cfg.version?.();
      const prevSel = sel;
      sel = cfg.selected?.();
      if (key !== itemsKey || ver !== drawn) {
        items = its;
        itemsKey = key;
        drawn = ver;
        rebuild();
      }
      if (sel !== prevSel) {
        reveal();
        layoutStrip();
      }
      markSel(root);
      const ok = enabled();
      root.classList.toggle("uo-disabled", !ok);
      if (ok) root.removeAttribute("aria-disabled");
      else root.setAttribute("aria-disabled", "true");
      for (const b of root.querySelectorAll("button")) b.disabled = !ok || b === up && top <= 0 || b === down && top >= lastTop();
      if (trigText) trigText.textContent = items.find((x2) => x2.id === sel) ? t2(items.find((x2) => x2.id === sel).label) : "";
    }
  };
}

// ../../../shared/ui/src/toolbar/items.ts
function ripple(el) {
  if (customElements.get("u-ripple") && !el.querySelector(":scope > u-ripple")) {
    el.appendChild(document.createElement("u-ripple"));
  }
}
function titleClass(el) {
  return el.classList.contains("uo-title") ? null : "uo-title-slot";
}
function button(cls) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.addEventListener("mousedown", (e) => e.preventDefault());
  return b;
}
function toggleMenu(anchor, src, ctx, focus = false) {
  if (isMenuOpenFor(anchor)) {
    closeMenus();
    return;
  }
  anchor.classList.add("uo-open");
  openMenu(src, { anchor }, {
    lang: ctx.lang,
    registry: ctx.registry,
    layer: ctx.layer,
    focus,
    onClose: () => anchor.classList.remove("uo-open")
  });
}
var CHEV = () => `<span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
function renderItem(item, ctx, defSize = "small") {
  const reg = ctx.registry;
  if (typeof item === "string") item = { cmd: item };
  if ("gallery" in item) return renderGallery(item.gallery, ctx, defSize === "large");
  if ("widget" in item) {
    const w = item.widget(ctx);
    return {
      el: w.el,
      sync: () => {
        const v = w.visible?.() ?? true;
        w.el.hidden = !v;
        if (v) w.sync?.();
      },
      visible: () => w.visible?.() ?? true
    };
  }
  if ("cmd" in item) {
    const { cmd } = item;
    const c2 = reg.get(cmd);
    const size2 = item.size ?? defSize;
    const showLabel2 = item.label ?? size2 === "large";
    const icon = item.icon ?? c2?.icon;
    const b3 = button(`uo-btn${size2 === "large" ? " uo-btn-lg" : ""}${showLabel2 ? " uo-btn-lbl" : ""}`);
    b3.dataset["a"] = cmd;
    b3.title = reg.tooltip(cmd);
    b3.setAttribute("aria-label", reg.label(cmd));
    b3.innerHTML = (icon ? symbol(icon) : "") + (showLabel2 || !icon ? `<span class="uo-lbl">${esc(reg.label(cmd))}</span>` : "") + (c2?.color ? '<span class="uo-swbar"></span>' : "");
    ripple(b3);
    b3.addEventListener("click", () => {
      void reg.run(cmd);
    });
    const bar = b3.querySelector(".uo-swbar");
    return {
      el: b3,
      visible: () => reg.supported(cmd),
      sync: () => {
        const v = reg.supported(cmd);
        b3.hidden = !v;
        if (!v) return;
        b3.disabled = !reg.enabled(cmd);
        if (c2?.isChecked) {
          const on = reg.checked(cmd);
          b3.classList.toggle("uo-on", on);
          b3.setAttribute("aria-pressed", String(on));
        }
        if (bar) bar.style.background = c2.color() ?? "transparent";
      }
    };
  }
  if ("split" in item) {
    const cmd = item.split;
    const main = renderItem({ cmd, size: item.size ?? defSize, ...item.label !== void 0 ? { label: item.label } : {} }, ctx, defSize);
    const wrap2 = document.createElement("span");
    wrap2.className = `uo-split${(item.size ?? defSize) === "large" ? " uo-split-lg" : ""}`;
    const arrow = button("uo-btn uo-split-arrow");
    arrow.dataset["a"] = `${cmd}:menu`;
    arrow.title = reg.tooltip(cmd);
    arrow.innerHTML = symbol("arrow_drop_down");
    ripple(arrow);
    const src = item.menu;
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(wrap2, src, ctx);
    });
    wrap2.append(main.el, arrow);
    return {
      el: wrap2,
      visible: main.visible,
      sync: () => {
        main.sync();
        wrap2.hidden = !main.visible();
        main.el.hidden = false;
        arrow.disabled = !reg.enabled(cmd);
      }
    };
  }
  const m = item;
  const size = m.size ?? defSize;
  const showLabel = m.showLabel ?? size === "large";
  const b = button(`uo-btn uo-drop${size === "large" ? " uo-btn-lg" : ""}${showLabel ? " uo-btn-lbl" : ""}`);
  b.dataset["a"] = m.id;
  const label = reg.text(m.label);
  b.title = label;
  b.setAttribute("aria-label", label);
  b.setAttribute("aria-haspopup", "menu");
  const head = m.text ? '<span class="uo-drop-text"></span>' : symbol(m.icon);
  b.innerHTML = head + (showLabel ? `<span class="uo-lbl">${esc(label)}</span>` : "") + CHEV();
  ripple(b);
  const textEl = b.querySelector(".uo-drop-text");
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(b, m.menu, ctx, e.detail === 0);
  });
  const vis = () => {
    try {
      return m.supports?.() ?? true;
    } catch {
      return false;
    }
  };
  return {
    el: b,
    visible: vis,
    sync: () => {
      const v = vis();
      b.hidden = !v;
      if (!v) return;
      b.disabled = m.isEnabled ? !m.isEnabled() : false;
      if (m.isChecked) b.classList.toggle("uo-on", m.isChecked());
      if (textEl) textEl.textContent = m.text();
    }
  };
}
function esc(s) {
  return s.replace(/[<>&"]/g, (c2) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c2] ?? c2);
}

// ../../../shared/ui/src/toolbar/css.ts
var c = (name, uo, def) => `var(--uo-${uo}, var(--u-color-${name}, ${def}))`;
var SURFACE = c("surface", "bar-bg", "#fdfbff");
var CONTAINER = c("surface-container", "bar-container", "#eef0f4");
var HIGH = c("surface-container-high", "menu-bg", "#e9e7ec");
var HIGHEST = c("surface-container-highest", "hover-bg", "#e3e2e6");
var LOWEST = "var(--u-color-surface-container-lowest, #ffffff)";
var ON = c("on-surface", "bar-color", "#1b1b1f");
var ON_VAR = c("on-surface-variant", "bar-color-2", "#44474f");
var OUTLINE = "var(--u-color-outline, #74777f)";
var OUTLINE_VAR = c("outline-variant", "bar-divider", "#c4c6d0");
var PRIMARY = c("primary", "accent", "#005bc0");
var ON_PRIMARY = "var(--u-color-on-primary, #ffffff)";
var ACTIVE = `color-mix(in srgb, ${PRIMARY} 14%, transparent)`;
var SHADOW = "light-dark(rgba(0,0,0,.16), rgba(0,0,0,.5))";
var BAR_CSS = (
  /* css */
  `
.uo-bar, .uo-menu, .uo-pop, .uo-dialog, .uo-toast {
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif);
  font-size: 14px; color: ${ON}; box-sizing: border-box;
}
.uo-bar *, .uo-menu *, .uo-pop *, .uo-dialog * { box-sizing: border-box; }
.uo-bar [hidden], .uo-pop [hidden], .uo-menu [hidden], .uo-dialog [hidden] { display: none !important; }
.uo-ic { width: 20px; height: 20px; flex: none; display: block; fill: currentColor; pointer-events: none; }
.uo-spacer { flex: 1 1 auto; min-width: 8px; }
.uo-btn, .uo-mbtn, .uo-tab, .uo-trig, .uo-menu-item, .uo-pill { position: relative; }

/* \u2500\u2500 linha de t\xEDtulo \u2500\u2500 */
.uo-bar { background: ${SURFACE}; width: 100%; }
.uo-titlebar { display: flex; align-items: center; gap: 4px; min-height: 46px; padding: 4px 12px 2px; }
/* janela sem moldura com os controles do SO sobrepostos (Electron titleBarOverlay,
   PWA window-controls-overlay): o host liga .uo-wco num ancestral \u2014 reserva a
   \xE1rea dos controles e arrasta a janela pela linha de t\xEDtulo */
.uo-wco .uo-titlebar {
  min-height: max(46px, env(titlebar-area-height, 46px));
  padding-right: calc(12px + 100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
  -webkit-app-region: drag;
}
.uo-wco .uo-titlebar > :not(.uo-spacer) { -webkit-app-region: no-drag; }
.uo-title {
  font: inherit; font-size: 17px; color: ${ON}; background: transparent;
  border: 1px solid transparent; border-radius: 6px; padding: 2px 8px;
  min-width: 60px; width: 22ch; max-width: 40vw; text-overflow: ellipsis; outline: none;
}
.uo-title:hover { border-color: ${OUTLINE_VAR}; }
.uo-title:focus { border-color: ${PRIMARY}; }
/* t\xEDtulo do HOSPEDEIRO (contribui\xE7\xE3o compact.title / ribbon.title): o lugar, sem o visual do campo */
.uo-title-slot { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 auto; color: ${ON}; }
.uo-menubar { display: flex; gap: 0; min-width: 0; overflow: hidden; flex: 0 1 auto; }
.uo-mbtn {
  border: 0; background: transparent; color: ${ON}; font: inherit; font-size: 14px;
  padding: 4px 9px; border-radius: 6px; cursor: pointer; white-space: nowrap; flex: none;
}
.uo-mbtn:hover, .uo-mbtn.uo-open { background: ${HIGHEST}; }
/* \xEDcone/logo antes do t\xEDtulo (compact.leading) */
.uo-leading { display: flex; align-items: center; justify-content: center; flex: none; min-width: 0; color: ${PRIMARY}; }
/* t\xEDtulo ACIMA dos menus (titlePlacement: 'above-menus', estilo Google Docs): leading e
   trailing ocupam as duas linhas, centralizados; os menus alinham o texto com o t\xEDtulo */
.uo-titlebar.uo-stacked { gap: 8px; min-height: 64px; padding: 6px 12px 2px 12px; }
.uo-stacked > .uo-leading { align-self: center; padding: 0 4px; }
.uo-titlebar-main { display: flex; flex-direction: column; justify-content: center; flex: 1 1 auto; min-width: 0; }
.uo-title-row { display: flex; align-items: center; gap: 4px; min-height: 30px; min-width: 0; }
.uo-title-row > .uo-title-slot { padding-inline-start: 9px; white-space: nowrap; }
.uo-menu-row { display: flex; align-items: center; min-height: 28px; min-width: 0; }
.uo-stacked .uo-mbtn { padding: 3px 9px; }
.uo-trailing { display: flex; align-items: center; gap: 4px; flex: none; align-self: center; }
/* empilhada com os controles do SO sobrepostos: a regra acima zeraria a reserva da
   \xE1rea dos controles; o vazio das duas linhas continua arrastando a janela */
.uo-wco .uo-titlebar.uo-stacked {
  min-height: max(64px, env(titlebar-area-height, 64px));
  padding-right: calc(12px + 100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
}
.uo-wco .uo-stacked > .uo-titlebar-main { -webkit-app-region: drag; }
.uo-wco .uo-title-row > *, .uo-wco .uo-menu-row > * { -webkit-app-region: no-drag; }

/* \u2500\u2500 faixa de aviso (BarHandle.setNotice): entre o t\xEDtulo/menus e as ferramentas \u2500\u2500 */
.uo-notice {
  display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 6px 16px;
  font-size: 13px; line-height: 1.4; border-block: 1px solid ${OUTLINE_VAR};
  background: var(--uo-notice-bg, color-mix(in srgb, ${PRIMARY} 10%, ${SURFACE}));
  color: var(--uo-notice-color, ${ON});
}
.uo-notice[data-tone="warning"] {
  background: var(--uo-notice-warning-bg, var(--u-color-warning-container, #ffdea8));
  color: var(--uo-notice-warning-color, var(--u-color-on-warning-container, #271900));
}
.uo-notice[data-tone="error"] {
  background: var(--uo-notice-error-bg, var(--u-color-error-container, #ffdad6));
  color: var(--uo-notice-error-color, var(--u-color-on-error-container, #410002));
}
.uo-notice > * { min-width: 0; }
.uo-notice a { color: inherit; font-weight: 600; }
.uo-ribbon .uo-notice { border-top: 0; }

/* \u2500\u2500 bot\xF5es \u2500\u2500 */
.uo-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 2px;
  height: 32px; min-width: 32px; padding: 0 5px; border: 0; border-radius: 8px;
  background: transparent; color: ${ON_VAR}; cursor: pointer; font: inherit; font-size: 13px;
  flex: none; white-space: nowrap; vertical-align: middle;
}
.uo-btn:hover:not(:disabled), .uo-btn.uo-open { background: ${HIGHEST}; }
.uo-btn.uo-on { background: ${ACTIVE}; color: ${PRIMARY}; }
.uo-btn:disabled { opacity: .38; cursor: default; }
.uo-btn:focus-visible, .uo-mbtn:focus-visible, .uo-tab:focus-visible, .uo-menu-item:focus-visible, .uo-pill:focus-visible {
  outline: 2px solid ${PRIMARY}; outline-offset: -2px;
}
.uo-btn-lbl { padding: 0 8px; gap: 5px; }
.uo-lbl { pointer-events: none; }
.uo-chev { display: inline-flex; margin: 0 -4px 0 -3px; opacity: .7; }
.uo-chev .uo-ic { width: 18px; height: 18px; }
.uo-drop-text { font-size: 13px; font-weight: 500; min-width: 26px; text-align: center; pointer-events: none; }
.uo-swbar {
  position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%);
  width: 18px; height: 3px; border-radius: 2px; pointer-events: none;
}
.uo-split { display: inline-flex; align-items: stretch; flex: none; }
.uo-split > .uo-btn:first-child { border-radius: 8px 0 0 8px; }
.uo-split-arrow { min-width: 14px !important; width: 16px; padding: 0 !important; border-radius: 0 8px 8px 0 !important; }
.uo-split-arrow .uo-ic { width: 18px; height: 18px; }
.uo-pill {
  height: 38px; padding: 0 18px; border-radius: 19px; border: 1px solid ${OUTLINE_VAR};
  background: transparent; color: ${PRIMARY}; font: inherit; font-size: 14px; font-weight: 500;
  cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;
}
.uo-pill:hover { background: color-mix(in srgb, ${PRIMARY} 8%, transparent); }
.uo-pill-primary { background: ${PRIMARY}; color: ${ON_PRIMARY}; border-color: ${PRIMARY}; }
.uo-pill-primary:hover { background: color-mix(in srgb, ${PRIMARY} 88%, ${ON_PRIMARY}); }
.uo-pill .uo-ic { width: 18px; height: 18px; }
.uo-pill:disabled { opacity: .38; cursor: default; pointer-events: none; }
/* variantes dos bot\xF5es do hospedeiro (createBarButton) */
.uo-pill-tonal { background: var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))); color: var(--uo-tonal-color, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); border-color: transparent; }
.uo-pill-tonal:hover { background: color-mix(in srgb, var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))) 88%, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
.uo-pill-text { border-color: transparent; padding: 0 12px; }
.uo-btn-icon { width: 40px; height: 40px; border-radius: 20px; padding: 0; }
.uo-btn-icon .uo-ic { width: 22px; height: 22px; }
/* \xEDcone com destaque: fundo de destaque ou tonal (createBarButton icon-filled / icon-tonal) */
.uo-btn-icon-filled { background: ${PRIMARY}; color: ${ON_PRIMARY}; }
.uo-btn-icon-filled:hover:not(:disabled) { background: color-mix(in srgb, ${PRIMARY} 88%, ${ON_PRIMARY}); }
.uo-btn-icon-tonal { background: var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))); color: var(--uo-tonal-color, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
.uo-btn-icon-tonal:hover:not(:disabled) { background: color-mix(in srgb, var(--uo-tonal-bg, var(--u-color-secondary-container, light-dark(#dbe2f9, #3f4759))) 88%, var(--u-color-on-secondary-container, light-dark(#131b2c, #dbe2f9))); }
/* \xEDcone + r\xF3tulo: o espa\xE7o entre os dois \xE9 s\xF3 o gap; padding do M3 (16px antes do \xEDcone, 24px depois do r\xF3tulo) */
.uo-pill > .uo-lbl { margin: 0; line-height: normal; }
.uo-pill.uo-pill-ic { padding: 0 24px 0 16px; }
.uo-pill-text.uo-pill-ic { padding: 0 16px 0 12px; }
/* tamanho pequeno (size: 'small'): p\xEDlula de 24px para chips de status; \xEDcone redondo de 28px */
.uo-pill.uo-btn-sm { height: 24px; padding: 0 10px; border-radius: 12px; gap: 4px; font-size: 12px; }
.uo-pill.uo-btn-sm.uo-pill-ic { padding: 0 10px 0 6px; }
.uo-pill.uo-btn-sm .uo-ic { width: 16px; height: 16px; }
.uo-btn-icon.uo-btn-sm { width: 28px; height: 28px; min-width: 28px; border-radius: 14px; }
.uo-btn-icon.uo-btn-sm .uo-ic { width: 18px; height: 18px; }
/* linha m\xEDnima do hospedeiro fora do editor (createBarRow) */
.uo-host-row .uo-titlebar { gap: 8px; }
.uo-host-row .uo-trailing { gap: 8px; }
.uo-ic-box { display: inline-flex; flex: none; color: inherit; }
.uo-ic-box > .uo-ic { width: var(--uo-ic-size, 20px); height: var(--uo-ic-size, 20px); }

/* \u2500\u2500 campos (seletores de texto, tamanho, t\xEDtulo) \u2500\u2500 */
.uo-combo { justify-content: space-between; padding: 0 2px 0 8px; color: ${ON}; }
.uo-combo .uo-drop-text { text-align: left; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; font-weight: 400; }
.uo-num {
  height: 28px; width: 40px; padding: 0; text-align: center; font: inherit; font-size: 13px;
  border: 1px solid ${OUTLINE_VAR}; border-radius: 6px; background: ${LOWEST}; color: ${ON}; flex: none;
}
.uo-num:focus { outline: none; border-color: ${PRIMARY}; }
/* caixa num\xE9rica com setas (spin.ts): r\xF3tulo, caixa e as duas setas empilhadas */
.uo-spin { display: inline-flex; align-items: center; gap: 6px; height: 28px; font-size: 13px; color: ${ON}; white-space: nowrap; }
.uo-spin-lbl { display: inline-flex; align-items: center; gap: 4px; min-width: 0; color: ${ON}; cursor: default; }
.uo-spin-lbl .uo-ic { width: 18px; height: 18px; color: ${ON_VAR}; }
.uo-spin-box {
  display: inline-flex; align-items: stretch; height: 24px; border: 1px solid ${OUTLINE_VAR}; border-radius: 6px;
  background: ${LOWEST}; overflow: hidden; margin-left: auto;
}
.uo-spin-box:focus-within { border-color: ${PRIMARY}; }
.uo-spin-in { width: 64px; min-width: 0; border: 0; padding: 0 4px 0 8px; font: inherit; font-size: 13px; background: transparent; color: ${ON}; outline: none; }
.uo-spin-in[aria-invalid=true] { color: var(--u-color-error, #ba1a1a); }
.uo-spin-arrows { display: flex; flex-direction: column; border-left: 1px solid ${OUTLINE_VAR}; }
.uo-spin-arrow {
  flex: 1 1 0; width: 18px; display: flex; align-items: center; justify-content: center; padding: 0;
  border: 0; background: transparent; color: ${ON_VAR}; cursor: pointer; overflow: hidden;
}
.uo-spin-arrow .uo-ic { width: 18px; height: 18px; margin: -4px 0; }
.uo-spin-arrow:hover { background: ${HIGHEST}; color: ${ON}; }
.uo-spin-arrow:disabled, .uo-spin.uo-off .uo-spin-in { opacity: .38; cursor: default; }
.uo-caption { display: inline-flex; align-items: center; height: 24px; font-size: 12px; color: ${ON_VAR}; padding: 0 2px; }
/* na coluna da ribbon as caixas se alinham \xE0 direita (r\xF3tulos de larguras diferentes) */
.uo-rrow > .uo-spin { flex: 1 1 auto; padding: 0 4px; }
.uo-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: ${ON_VAR}; }
.uo-field input, .uo-field textarea, .uo-field select, .uo-dialog input[type=text], .uo-dialog input[type=number], .uo-dialog select {
  height: 38px; border: 1px solid ${OUTLINE}; border-radius: 8px; padding: 0 12px;
  background: ${LOWEST}; color: ${ON}; font: inherit; font-size: 14px;
}
.uo-field textarea { height: 90px; padding: 8px 12px; resize: vertical; }
.uo-field input:focus, .uo-field textarea:focus, .uo-field select:focus,
.uo-dialog input:focus, .uo-dialog select:focus { outline: 2px solid ${PRIMARY}; outline-offset: -1px; border-color: ${PRIMARY}; }
.uo-check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${ON}; cursor: pointer; }
.uo-check input { width: 18px; height: 18px; accent-color: ${PRIMARY}; margin: 0; }

/* \u2500\u2500 barra compacta (Google Docs) \u2500\u2500 */
.uo-toolrow { padding: 2px 12px 8px; }
.uo-toolbar {
  display: flex; align-items: center; gap: 2px; min-width: 0; overflow: hidden;
  background: ${CONTAINER}; border-radius: 20px; padding: 4px 8px; min-height: 40px;
}
.uo-g { display: inline-flex; align-items: center; gap: 2px; flex: none; }
.uo-g::before { content: ""; width: 1px; height: 22px; background: ${OUTLINE_VAR}; margin: 0 6px 0 5px; }
.uo-trig {
  display: inline-flex; align-items: center; gap: 1px; height: 32px; padding: 0 4px 0 6px; margin-left: 13px;
  border: 0; border-radius: 8px; background: transparent; color: ${ON_VAR}; cursor: pointer; flex: none;
}
.uo-trig::before {
  content: ""; position: absolute; left: -7px; top: 50%; transform: translateY(-50%);
  width: 1px; height: 22px; background: ${OUTLINE_VAR};
}
.uo-trig:hover, .uo-trig.uo-open { background: ${HIGHEST}; }
.uo-more { padding: 0 6px; }
.uo-toolbar > .uo-first { margin-left: 0; }
.uo-toolbar > .uo-first::before { display: none; }
.uo-burger { margin-right: 2px; }

/* \u2500\u2500 ribbon (Word) \u2500\u2500 */
.uo-qat { display: inline-flex; align-items: center; gap: 0; }
.uo-ribbon .uo-titlebar { min-height: 40px; }
.uo-tabs { display: flex; align-items: flex-end; padding: 0 10px; gap: 4px; }
.uo-tabs-scroll { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; flex: 1 1 auto; min-width: 0; }
.uo-tabs-scroll::-webkit-scrollbar { display: none; }
.uo-tab {
  height: 34px; padding: 0 12px; border: 0; border-radius: 8px 8px 0 0; background: transparent;
  color: ${ON_VAR}; font: inherit; font-size: 13.5px; cursor: pointer; white-space: nowrap; flex: none;
}
.uo-tab:hover { background: ${HIGHEST}; }
.uo-tab.uo-on { color: ${PRIMARY}; font-weight: 600; }
.uo-tab.uo-on::after {
  content: ""; position: absolute; left: 12px; right: 12px; bottom: 0; height: 3px;
  border-radius: 3px 3px 0 0; background: ${PRIMARY};
}
.uo-tab-file { color: ${PRIMARY}; font-weight: 600; }
.uo-tab-ctx { color: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-tab-ctx.uo-on { color: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-tab-ctx.uo-on::after { background: var(--uo-contextual, var(--u-color-tertiary, #7d5260)); }
.uo-ribbon-toggle { margin-bottom: 1px; }
.uo-ribbon-body { margin: 0 10px 8px; background: ${CONTAINER}; border-radius: 12px; padding: 4px 4px 2px; }
.uo-collapsed .uo-ribbon-body { display: none; }
.uo-collapsed .uo-tabs { padding-bottom: 6px; }
.uo-rpanel { display: flex; align-items: stretch; min-height: 98px; overflow: hidden; width: 100%; }
.uo-rgroup {
  display: flex; flex-direction: column; flex: none; padding: 2px 4px 0;
  border-right: 1px solid ${OUTLINE_VAR}; margin: 2px 0;
}
.uo-rgroup:last-child { border-right: 0; }
.uo-rgroup-body { display: flex; align-items: flex-start; gap: 2px; flex: 1 1 auto; }
.uo-rcol { display: flex; flex-direction: column; justify-content: flex-start; gap: 1px; align-self: stretch; }
.uo-rrow { display: flex; align-items: center; gap: 1px; min-height: 32px; }
.uo-rgroup-foot { display: flex; align-items: center; justify-content: center; gap: 2px; height: 20px; position: relative; }
.uo-rgroup-lbl { font-size: 11.5px; color: ${ON_VAR}; white-space: nowrap; padding: 0 16px; }
.uo-launcher { position: absolute; right: -2px; bottom: 1px; height: 18px; min-width: 18px; padding: 0; border-radius: 4px; }
.uo-launcher .uo-ic { width: 14px; height: 14px; }
.uo-btn-lg {
  flex-direction: column; height: auto; min-height: 74px; min-width: 50px; max-width: 86px;
  padding: 4px 6px; gap: 3px; justify-content: flex-start; white-space: normal;
}
.uo-btn-lg > .uo-ic { width: 30px; height: 30px; margin-top: 2px; }
.uo-btn-lg .uo-lbl { font-size: 12px; line-height: 1.2; text-align: center; color: ${ON}; }
.uo-btn-lg .uo-chev { margin: -4px 0 0; }
.uo-btn-lg .uo-swbar { bottom: auto; top: 34px; width: 26px; }
.uo-split-lg { flex-direction: column; }
.uo-split-lg > .uo-btn:first-child { border-radius: 8px 8px 0 0; min-height: 56px; }
.uo-split-lg > .uo-split-arrow { width: auto; height: 18px; border-radius: 0 0 8px 8px !important; }
.uo-rtrig { align-self: stretch; margin: 2px 2px; }

/* \u2500\u2500 menus \u2500\u2500 */
.uo-menu {
  position: fixed; z-index: 1000; min-width: 210px; max-width: min(420px, calc(100vw - 16px));
  max-height: min(72vh, 560px); overflow: auto; padding: 5px;
  background: ${HIGH}; border: 1px solid ${OUTLINE_VAR}; border-radius: 12px;
  box-shadow: 0 12px 32px ${SHADOW};
}
.uo-menu-item {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 34px;
  padding: 0 12px 0 10px; border: 0; border-radius: 8px; background: transparent;
  color: ${ON}; cursor: pointer; font: inherit; font-size: 13.5px; text-align: left;
}
.uo-menu-item:hover, .uo-menu-item:focus { background: ${HIGHEST}; outline: none; }
.uo-menu-item[disabled] { opacity: .38; pointer-events: none; }
.uo-menu-item.checked { background: ${ACTIVE}; }
.uo-menu-item.checked .lead { color: ${PRIMARY}; }
.uo-menu-item .lead { width: 22px; flex: none; color: ${ON_VAR}; display: inline-flex; align-items: center; justify-content: center; }
.uo-menu-item .lead .sw { width: 16px; height: 16px; border-radius: 4px; border: 1px solid ${OUTLINE_VAR}; }
.uo-menu-item .lb { flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uo-menu-item .sc { margin-left: 20px; font-size: 11.5px; color: ${ON_VAR}; opacity: .85; display: inline-flex; }
.uo-menu-item .sc .uo-ic { width: 18px; height: 18px; }
.uo-menu-sep { height: 1px; background: ${OUTLINE_VAR}; margin: 5px 8px; }
.uo-menu-content { padding: 6px 8px; }

/* \u2500\u2500 grade de cores \u2500\u2500 */
.uo-colors { display: grid; grid-template-columns: repeat(10, 20px); gap: 4px; }
.uo-colors button {
  width: 20px; height: 20px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 1px solid color-mix(in srgb, ${ON} 18%, transparent);
}
.uo-colors button:hover { transform: scale(1.15); }
.uo-colors button.sel { outline: 2px solid ${PRIMARY}; outline-offset: 1px; }
.uo-colors-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; }

/* \u2500\u2500 popover dos grupos recolhidos \u2500\u2500 */
.uo-pop {
  position: fixed; z-index: 990; padding: 6px 8px 8px; max-width: calc(100vw - 16px);
  background: ${HIGH}; border: 1px solid ${OUTLINE_VAR}; border-radius: 14px;
  box-shadow: 0 12px 32px ${SHADOW};
}
.uo-pop-lbl {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: ${ON_VAR}; padding: 6px 6px 4px;
}
.uo-pop-sec + .uo-pop-sec { border-top: 1px solid ${OUTLINE_VAR}; margin-top: 4px; }
.uo-pop .uo-g { flex-wrap: wrap; }
.uo-pop .uo-g::before { display: none; }
.uo-pop .uo-rgroup { border-right: 0; }

/* \u2500\u2500 di\xE1logo \u2500\u2500 */
.uo-dialog {
  border: 0; border-radius: 24px; padding: 20px 24px 18px; min-width: 300px; max-width: calc(100vw - 32px);
  background: ${HIGH}; color: ${ON}; box-shadow: 0 16px 48px ${SHADOW};
}
.uo-dialog::backdrop { background: rgba(0,0,0,.32); }
.uo-dialog:not([open]) { display: none; }
.uo-dialog-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.uo-dialog-icon { color: ${PRIMARY}; }
.uo-dialog-icon .uo-ic { width: 24px; height: 24px; }
.uo-dialog-title { font-size: 18px; font-weight: 500; flex: 1 1 auto; }
.uo-dialog-x { margin: -6px -10px -6px 0; border-radius: 50%; }
.uo-dialog-body { display: flex; flex-direction: column; gap: 12px; line-height: 1.45; }
.uo-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
.uo-dialog-grid { display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; align-items: center; }
.uo-dtabs { display: flex; flex-direction: column; gap: 14px; }
.uo-dtabs-strip { display: flex; gap: 2px; border-bottom: 1px solid ${OUTLINE_VAR}; overflow-x: auto; scrollbar-width: none; }
.uo-dtab { border: 0; background: transparent; color: inherit; font: inherit; padding: 8px 12px; cursor: pointer; border-bottom: 3px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
.uo-dtab:hover { background: ${HIGHEST}; }
.uo-dtab.uo-on { border-bottom-color: ${PRIMARY}; color: ${PRIMARY}; font-weight: 500; }
.uo-dtab:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }
.uo-dtabs-panes { display: grid; }
.uo-dtab-pane { grid-area: 1 / 1; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.uo-dtab-pane.uo-off { visibility: hidden; }

/* \u2500\u2500 galeria (estilos, temas\u2026) \u2500\u2500 */
.uo-gal {
  display: inline-flex; align-items: stretch; flex: none; margin: 2px 2px 0;
  border: 1px solid ${OUTLINE_VAR}; border-radius: 10px; background: ${LOWEST}; overflow: hidden;
}
.uo-gal.uo-disabled { opacity: .5; }
.uo-gal-view { overflow: hidden; padding: 3px; flex: none; }
.uo-gal-grid { display: grid; gap: 2px; transition: transform .12s ease-out; }
.uo-gal-tile {
  position: relative; display: block; padding: 0; margin: 0; overflow: hidden; cursor: pointer;
  border: 1px solid transparent; border-radius: 7px; background: transparent; color: ${ON}; font: inherit; text-align: left;
}
.uo-gal-tile:hover:not(:disabled) { background: ${HIGHEST}; border-color: ${OUTLINE_VAR}; }
.uo-gal-tile.uo-on { border-color: ${PRIMARY}; background: ${ACTIVE}; }
.uo-gal-tile:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }
.uo-gal-tile:disabled { cursor: default; }
.uo-gal-nav { display: flex; flex-direction: column; border-left: 1px solid ${OUTLINE_VAR}; flex: none; }
.uo-gal-nav-btn { flex: 1 1 0; height: auto; min-height: 0; width: 22px; min-width: 22px; padding: 0; border-radius: 0; }
.uo-gal-nav-btn .uo-ic { width: 16px; height: 16px; }
.uo-gal-pop { padding: 8px; max-height: min(80vh, 640px); overflow: auto; }
.uo-gal-pop .uo-gal-grid { margin: 0 0 6px; }
.uo-gal-foot { border-top: 1px solid ${OUTLINE_VAR}; padding-top: 4px; }
.uo-gal-trigger { min-width: 120px; }
.uo-tiles { display: flex; flex-direction: column; gap: 4px; padding: 4px 8px 8px; max-height: min(70vh, 560px); overflow: auto; }
.uo-menu:has(> .uo-tiles), .uo-menu:has(> * > .uo-tiles) { max-width: calc(100vw - 16px); }
.uo-tiles-h { font-size: 12px; font-weight: 600; opacity: .8; padding: 4px 2px 0; }

/* \u2500\u2500 painel lateral \u2500\u2500 */
.uo-pane {
  position: fixed; z-index: 940; display: flex; flex-direction: column;
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif); font-size: 13.5px; color: ${ON};
  background: ${SURFACE}; border-left: 1px solid ${OUTLINE_VAR}; box-shadow: -4px 0 16px ${SHADOW}; box-sizing: border-box;
}
.uo-pane[data-dock="left"] { border-left: 0; border-right: 1px solid ${OUTLINE_VAR}; box-shadow: 4px 0 16px ${SHADOW}; }
.uo-pane[data-dock="bottom"] { border-left: 0; border-top: 1px solid ${OUTLINE_VAR}; box-shadow: 0 -4px 16px ${SHADOW}; }
.uo-pane * { box-sizing: border-box; }
.uo-pane [hidden] { display: none !important; }
.uo-pane-head { display: flex; align-items: center; gap: 8px; padding: 10px 6px 6px 16px; flex: none; }
.uo-pane-title { flex: 1 1 auto; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uo-pane-body { flex: 1 1 auto; overflow: auto; padding: 2px 8px 8px; min-height: 0; }
.uo-pane-foot { flex: none; display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 10px; border-top: 1px solid ${OUTLINE_VAR}; }

/* \u2500\u2500 r\xE9gua \u2500\u2500 */
.uo-ruler {
  --uo-ruler-track: ${LOWEST}; --uo-ruler-shade: ${OUTLINE_VAR}; --uo-ruler-ink: ${ON_VAR};
  --uo-ruler-mark: ${ON}; --uo-ruler-accent: ${PRIMARY}; --uo-ruler-fill: ${LOWEST};
  display: flex; box-sizing: border-box; user-select: none; -webkit-user-select: none; touch-action: none;
  font-family: var(--uo-font, "Segoe UI", system-ui, -apple-system, sans-serif);
}
.uo-ruler[hidden] { display: none !important; }
.uo-ruler-h { height: 24px; width: 100%; flex-direction: row; align-items: stretch; }
.uo-ruler-v { width: 22px; height: 100%; flex-direction: column; }
.uo-ruler-canvas { display: block; flex: 1 1 auto; min-width: 0; min-height: 0; width: 100%; height: 100%; }
.uo-ruler-sel {
  flex: none; width: 22px; height: 24px; padding: 0; margin: 0; border: 0; border-right: 1px solid ${OUTLINE_VAR};
  background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.uo-ruler-sel:hover { background: ${HIGHEST}; }
.uo-ruler-sel:focus-visible { outline: 2px solid ${PRIMARY}; outline-offset: -2px; }

/* \u2500\u2500 aviso (snackbar) \u2500\u2500 */
.uo-toast {
  position: fixed; z-index: 1100; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(560px, calc(100vw - 32px)); padding: 12px 18px; border-radius: 8px;
  background: var(--u-color-inverse-surface, #303034); color: var(--u-color-inverse-on-surface, #f2f0f4);
  box-shadow: 0 6px 18px ${SHADOW}; font-size: 13.5px;
}
`
);
function ensureBarStyles(root = document) {
  const host = root instanceof Document ? root.head : root;
  if (host.querySelector("style[data-uo-bar]")) return;
  const s = document.createElement("style");
  s.dataset["uoBar"] = "";
  s.textContent = BAR_CSS;
  host.appendChild(s);
}

// ../../../shared/ui/src/toolbar/bar-button.ts
var CLASSES = {
  filled: "uo-pill uo-pill-primary",
  tonal: "uo-pill uo-pill-tonal",
  outlined: "uo-pill",
  text: "uo-pill uo-pill-text",
  icon: "uo-btn uo-btn-icon",
  "icon-filled": "uo-btn uo-btn-icon uo-btn-icon-filled",
  "icon-tonal": "uo-btn uo-btn-icon uo-btn-icon-tonal"
};
var iconOnly = (v) => v === "icon" || v === "icon-filled" || v === "icon-tonal";
var text = (l, lang) => l === void 0 ? "" : typeof l === "string" ? l : pickLabels(lang, l);
var escapeHtml = (s) => s.replace(/[&<>"']/g, (c2) => `&#${c2.charCodeAt(0)};`);
function createBarIcon(name, opts = {}) {
  const span = document.createElement("span");
  span.className = "uo-ic-box";
  span.innerHTML = symbol(name);
  if (opts.size) span.style.setProperty("--uo-ic-size", `${opts.size}px`);
  if (opts.title) {
    span.title = opts.title;
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", opts.title);
  } else span.setAttribute("aria-hidden", "true");
  return span;
}
var hasBarIcon = (name) => name.startsWith("<") || hasSymbol(name);
function createBarButton(opts) {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const label = text(opts.label, lang);
  const variant = opts.variant ?? (label ? "outlined" : "icon");
  const only = iconOnly(variant);
  const b = document.createElement("button");
  b.type = "button";
  b.className = CLASSES[variant] + (opts.size === "small" ? " uo-btn-sm" : "") + (!only && opts.icon && label ? " uo-pill-ic" : "");
  b.dataset["variant"] = variant;
  if (opts.size === "small") b.dataset["size"] = "small";
  const tip = text(opts.title, lang) || label;
  if (tip) b.title = tip;
  if (only || !label) {
    if (tip) b.setAttribute("aria-label", tip);
  }
  b.innerHTML = (opts.icon ? symbol(opts.icon) : "") + (label && !only ? `<span class="uo-lbl">${escapeHtml(label)}</span>` : "");
  b.disabled = !!opts.disabled;
  b.addEventListener("mousedown", (e) => e.preventDefault());
  if (opts.onClick) b.addEventListener("click", (e) => opts.onClick(e));
  ripple(b);
  return b;
}
function createBarRow(opts = {}) {
  const stacked = opts.titlePlacement === "above-menus" || opts.titlePlacement === void 0 && opts.title !== void 0;
  const row = document.createElement("div");
  row.className = stacked ? "uo-bar uo-host-row uo-title-above" : "uo-bar uo-host-row";
  const line = document.createElement("div");
  line.className = stacked ? "uo-titlebar uo-stacked" : "uo-titlebar";
  const slot = document.createElement("div");
  slot.className = "uo-title-slot";
  if (typeof opts.title === "string") slot.textContent = opts.title;
  else if (opts.title) slot.appendChild(opts.title);
  let leading = null;
  if (opts.leading) {
    leading = document.createElement("div");
    leading.className = "uo-leading";
    leading.appendChild(opts.leading);
  }
  if (stacked) {
    const titleRow = document.createElement("div");
    titleRow.className = "uo-title-row";
    titleRow.appendChild(slot);
    const menuRow = document.createElement("div");
    menuRow.className = "uo-menu-row";
    const main = document.createElement("div");
    main.className = "uo-titlebar-main";
    main.append(titleRow, menuRow);
    const trailing = document.createElement("div");
    trailing.className = "uo-trailing";
    trailing.append(...opts.actions ?? []);
    if (leading) line.appendChild(leading);
    line.append(main, trailing);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "uo-spacer";
    if (leading) line.appendChild(leading);
    line.append(slot, spacer, ...opts.actions ?? []);
  }
  row.appendChild(line);
  return row;
}
var barCss = BAR_CSS;
var sheet;
function barStyleSheet() {
  if (sheet !== void 0) return sheet;
  try {
    const s = new CSSStyleSheet();
    s.replaceSync(BAR_CSS);
    sheet = s;
  } catch {
    sheet = null;
  }
  return sheet;
}
function adoptBarStyles(root) {
  const s = barStyleSheet();
  const r = root;
  if (s && Array.isArray(r.adoptedStyleSheets)) {
    if (!r.adoptedStyleSheets.includes(s)) r.adoptedStyleSheets = [...r.adoptedStyleSheets, s];
    return;
  }
  const host = "head" in root && root.head ? root.head : root;
  if (host.querySelector("style[data-uo-bar]")) return;
  const st = document.createElement("style");
  st.dataset["uoBar"] = "";
  st.textContent = BAR_CSS;
  host.appendChild(st);
}

// ../../../shared/ui/src/toolbar/popover.ts
var state = null;
function isPopoverOpenFor(anchor) {
  return state?.anchor === anchor;
}
function closePopover() {
  if (!state) return;
  const s = state;
  state = null;
  for (const m of s.moved) m.home.appendChild(m.el);
  s.pop.remove();
  s.anchor.classList.remove("uo-open");
  s.detach();
}
function openPopover(anchor, sections, layer) {
  closePopover();
  const pop = document.createElement("div");
  pop.className = "uo-pop";
  pop.setAttribute("part", "popover");
  for (const s of sections) {
    const sec = document.createElement("div");
    sec.className = "uo-pop-sec";
    if (s.label) {
      const lbl = document.createElement("div");
      lbl.className = "uo-pop-lbl";
      lbl.textContent = s.label;
      sec.appendChild(lbl);
    }
    sec.appendChild(s.el);
    pop.appendChild(sec);
  }
  layer.appendChild(pop);
  const ar = anchor.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = ar.bottom + 4;
  if (top + pop.offsetHeight > vh - 8) top = Math.max(8, ar.top - pop.offsetHeight - 4);
  pop.style.top = `${top}px`;
  pop.style.left = `${Math.max(8, Math.min(ar.left, vw - pop.offsetWidth - 8))}px`;
  anchor.classList.add("uo-open");
  const onDown = (e) => {
    const path = e.composedPath();
    if (path.includes(pop) || path.includes(anchor)) return;
    if (path.some((n) => n instanceof HTMLElement && n.classList.contains("uo-menu"))) return;
    closePopover();
  };
  const onKey = (e) => {
    if (e.key === "Escape" && !isMenuOpen()) closePopover();
  };
  const onResize = () => closePopover();
  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);
  state = {
    pop,
    anchor,
    moved: sections.map((s) => ({ el: s.el, home: s.home })),
    detach: () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
    }
  };
}

// ../../../shared/ui/src/toolbar/notice.ts
function createNoticeRegion() {
  const el = document.createElement("div");
  el.className = "uo-notice";
  el.setAttribute("part", "notice");
  el.setAttribute("role", "status");
  el.hidden = true;
  return {
    el,
    set: (content, tone = "info") => {
      if (content) el.replaceChildren(content);
      else el.replaceChildren();
      el.dataset["tone"] = tone;
      el.hidden = !content;
    }
  };
}

// ../../../shared/ui/src/toolbar/compact.ts
var MORE_LABEL = { en: "More tools", pt: "Mais ferramentas", es: "M\xE1s herramientas" };
var MENU_LABEL = { en: "Menu", pt: "Menu", es: "Men\xFA" };
var TRIG_W = 50;
var MORE_W = 46;
var PAD2 = 16;
function createCompactBar(container, cfg, ctx) {
  const reg = ctx.registry;
  const root = document.createElement("div");
  root.className = "uo-bar uo-compact";
  root.setAttribute("part", "toolbar");
  const stacked = cfg.titlePlacement === "above-menus" || cfg.titlePlacement === void 0 && cfg.title !== void 0;
  if (stacked) root.classList.add("uo-title-above");
  const titlebar = document.createElement("div");
  titlebar.className = stacked ? "uo-titlebar uo-stacked" : "uo-titlebar";
  titlebar.setAttribute("part", "titlebar");
  const synced = [];
  let leadingEl = null;
  if (cfg.leading) {
    const l = renderItem(cfg.leading, ctx);
    leadingEl = document.createElement("div");
    leadingEl.className = "uo-leading";
    leadingEl.setAttribute("part", "leading");
    leadingEl.appendChild(l.el);
    synced.push(l);
  }
  let titleEl = null;
  if (cfg.title) {
    const t2 = renderItem(cfg.title, ctx);
    const cls = titleClass(t2.el);
    if (cls) t2.el.classList.add(cls);
    titleEl = t2.el;
    synced.push(t2);
  }
  const menubar = document.createElement("nav");
  menubar.className = "uo-menubar";
  menubar.setAttribute("role", "menubar");
  menubar.setAttribute("part", "menubar");
  const mbtns = [];
  const openTop = (i2, focus) => {
    const b = mbtns[i2];
    const m = cfg.menus[i2];
    b.classList.add("uo-open");
    openMenu(m.items, { anchor: b }, {
      lang: ctx.lang,
      registry: reg,
      layer: ctx.layer,
      focus,
      onClose: () => b.classList.remove("uo-open"),
      onNavigate: (dir) => openTop((i2 + dir + mbtns.length) % mbtns.length, true)
    });
  };
  cfg.menus.forEach((m, i2) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-mbtn";
    b.dataset["menu"] = m.id;
    b.setAttribute("role", "menuitem");
    b.setAttribute("aria-haspopup", "menu");
    b.textContent = reg.text(m.label);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isMenuOpenFor(b)) {
        closeMenus();
        return;
      }
      openTop(i2, e.detail === 0);
    });
    b.addEventListener("mouseenter", () => {
      if (isMenuOpen() && mbtns.some((x2) => isMenuOpenFor(x2)) && !isMenuOpenFor(b)) openTop(i2, false);
    });
    ripple(b);
    mbtns.push(b);
    menubar.appendChild(b);
  });
  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "uo-btn uo-burger";
  burger.title = reg.text(MENU_LABEL);
  burger.dataset["a"] = "menubar";
  burger.innerHTML = symbol("menu");
  burger.hidden = true;
  burger.addEventListener("mousedown", (e) => e.preventDefault());
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const items = cfg.menus.map((m) => ({ label: m.label, submenu: m.items }));
    toggleMenu(burger, items, ctx, e.detail === 0);
  });
  const trailingEls = (cfg.trailing ?? []).map((t2) => {
    const r = renderItem(t2, ctx);
    synced.push(r);
    return r.el;
  });
  if (stacked) {
    const titleRow = document.createElement("div");
    titleRow.className = "uo-title-row";
    titleRow.setAttribute("part", "title-row");
    if (titleEl) titleRow.appendChild(titleEl);
    const menuRow = document.createElement("div");
    menuRow.className = "uo-menu-row";
    menuRow.setAttribute("part", "menu-row");
    menuRow.append(burger, menubar);
    const main = document.createElement("div");
    main.className = "uo-titlebar-main";
    main.append(titleRow, menuRow);
    const trailing = document.createElement("div");
    trailing.className = "uo-trailing";
    trailing.setAttribute("part", "trailing");
    trailing.append(...trailingEls);
    if (leadingEl) titlebar.appendChild(leadingEl);
    titlebar.append(main, trailing);
  } else {
    if (leadingEl) titlebar.appendChild(leadingEl);
    if (titleEl) titlebar.appendChild(titleEl);
    titlebar.append(burger, menubar);
    const spacer = document.createElement("span");
    spacer.className = "uo-spacer";
    titlebar.append(spacer, ...trailingEls);
  }
  const row = document.createElement("div");
  row.className = "uo-toolrow";
  row.setAttribute("part", "toolrow");
  const toolbar = document.createElement("div");
  toolbar.className = "uo-toolbar";
  toolbar.setAttribute("role", "toolbar");
  const stash = document.createElement("div");
  stash.hidden = true;
  row.append(toolbar, stash);
  const notice = createNoticeRegion();
  root.append(titlebar, notice.el, row);
  container.appendChild(root);
  const groups = cfg.groups.map((def) => {
    const el = document.createElement("div");
    el.className = "uo-g";
    el.dataset["g"] = def.id;
    const items = (def.items ?? []).map((it) => renderItem(it, ctx));
    for (const r of items) el.appendChild(r.el);
    return { def, el, items, width: 0, visible: true };
  });
  const syncGroups = () => {
    let changed = false;
    for (const g of groups) {
      for (const r of g.items) r.sync();
      const v = g.items.some((r) => r.visible());
      if (v !== g.visible) {
        g.visible = v;
        changed = true;
      }
    }
    return changed;
  };
  const remeasure = () => {
    for (const g of groups) if (g.visible) toolbar.appendChild(g.el);
    for (const g of groups) g.width = g.visible ? g.el.getBoundingClientRect().width + 14 : 0;
  };
  const makeTrigger = (g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-trig";
    b.dataset["g"] = g.def.id;
    b.title = reg.text(g.def.label);
    b.innerHTML = symbol(g.def.icon ?? "more_horiz") + `<span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) {
        closePopover();
        return;
      }
      openPopover(b, [{ el: g.el, label: reg.text(g.def.label), home: stash }], ctx.layer);
    });
    ripple(b);
    return b;
  };
  const makeMore = (gs) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-trig uo-more";
    b.dataset["a"] = "more";
    b.title = reg.text(MORE_LABEL);
    b.innerHTML = symbol("more_vert");
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) {
        closePopover();
        return;
      }
      openPopover(b, gs.map((g) => ({ el: g.el, label: reg.text(g.def.label), home: stash })), ctx.layer);
    });
    ripple(b);
    return b;
  };
  let measured = false;
  const relayout = () => {
    if (!root.isConnected || toolbar.clientWidth === 0) return;
    closePopover();
    if (!measured || groups.some((g) => g.visible && g.width === 0)) {
      remeasure();
      measured = true;
    }
    toolbar.querySelectorAll(":scope > .uo-trig").forEach((e) => e.remove());
    const vis = groups.filter((g) => g.visible);
    const plan = planCollapse(
      vis.map((g) => ({ prio: g.def.prio ?? 5, width: g.width })),
      toolbar.clientWidth - PAD2,
      { trigW: TRIG_W, moreW: MORE_W }
    );
    for (const g of groups) stash.appendChild(g.el);
    for (const i2 of plan.inline) toolbar.appendChild(vis[i2].el);
    for (const i2 of plan.triggers) toolbar.appendChild(makeTrigger(vis[i2]));
    if (plan.more.length) toolbar.appendChild(makeMore(plan.more.map((i2) => vis[i2])));
    toolbar.querySelector(".uo-first")?.classList.remove("uo-first");
    toolbar.firstElementChild?.classList.add("uo-first");
    burger.hidden = true;
    menubar.hidden = false;
    if (menubar.scrollWidth > menubar.clientWidth + 1) {
      menubar.hidden = true;
      burger.hidden = false;
    }
  };
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      relayout();
    });
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(toolbar);
  ro.observe(titlebar);
  void document.fonts?.ready.then(() => {
    measured = false;
    schedule();
  });
  const sync = () => {
    for (const r of synced) r.sync();
    if (syncGroups()) {
      measured = false;
      schedule();
    }
  };
  syncGroups();
  sync();
  relayout();
  return {
    el: root,
    sync,
    relayout: () => {
      measured = false;
      relayout();
    },
    setNotice: notice.set,
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    }
  };
}

// ../../../shared/ui/src/toolbar/ribbon.ts
var L_COLLAPSE = { en: "Collapse the ribbon", pt: "Recolher a faixa de op\xE7\xF5es", es: "Contraer la cinta de opciones" };
var L_EXPAND = { en: "Expand the ribbon", pt: "Expandir a faixa de op\xE7\xF5es", es: "Expandir la cinta de opciones" };
var L_MORE2 = { en: "More", pt: "Mais", es: "M\xE1s" };
var TRIG_W2 = 64;
var MORE_W2 = 56;
var PAD3 = 12;
function renderGroup(def, ctx) {
  const reg = ctx.registry;
  const el = document.createElement("div");
  el.className = "uo-rgroup";
  el.dataset["g"] = def.id;
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", reg.text(def.label));
  const body = document.createElement("div");
  body.className = "uo-rgroup-body";
  const items = [];
  const cells = def.cells ?? (def.items ? [{ rows: [def.items] }] : []);
  for (const cell of cells) {
    if (typeof cell === "object" && "rows" in cell) {
      const col = document.createElement("div");
      col.className = "uo-rcol";
      for (const r of cell.rows) {
        const rowEl = document.createElement("div");
        rowEl.className = "uo-rrow";
        for (const it of r) {
          const x2 = renderItem(it, ctx, "small");
          rowEl.appendChild(x2.el);
          items.push(x2);
        }
        col.appendChild(rowEl);
      }
      body.appendChild(col);
    } else {
      const x2 = renderItem(cell, ctx, "large");
      body.appendChild(x2.el);
      items.push(x2);
    }
  }
  const foot = document.createElement("div");
  foot.className = "uo-rgroup-foot";
  foot.innerHTML = `<span class="uo-rgroup-lbl">${esc(reg.text(def.label))}</span>`;
  if (def.launcher) {
    const id = def.launcher;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-btn uo-launcher";
    b.dataset["a"] = id;
    b.title = reg.tooltip(id);
    b.innerHTML = symbol("south_east");
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      void reg.run(id);
    });
    foot.appendChild(b);
    items.push({
      el: b,
      visible: () => false,
      // o iniciador sozinho não mantém o grupo visível
      sync: () => {
        b.hidden = !reg.supported(id);
        b.disabled = !reg.enabled(id);
      }
    });
  }
  el.append(body, foot);
  return { def, el, items, width: 0, visible: true };
}
function createRibbon(container, cfg, ctx) {
  const reg = ctx.registry;
  const root = document.createElement("div");
  root.className = "uo-bar uo-ribbon";
  root.setAttribute("part", "toolbar");
  const titlebar = document.createElement("div");
  titlebar.className = "uo-titlebar";
  titlebar.setAttribute("part", "titlebar");
  const synced = [];
  const qat = document.createElement("div");
  qat.className = "uo-qat";
  for (const it of cfg.qat ?? []) {
    const r = renderItem(it, ctx);
    qat.appendChild(r.el);
    synced.push(r);
  }
  titlebar.appendChild(qat);
  if (cfg.title) {
    const t2 = renderItem(cfg.title, ctx);
    const cls = titleClass(t2.el);
    if (cls) t2.el.classList.add(cls);
    titlebar.appendChild(t2.el);
    synced.push(t2);
  }
  const sp = document.createElement("span");
  sp.className = "uo-spacer";
  titlebar.appendChild(sp);
  for (const it of cfg.trailing ?? []) {
    const r = renderItem(it, ctx);
    titlebar.appendChild(r.el);
    synced.push(r);
  }
  const tabsEl = document.createElement("div");
  tabsEl.className = "uo-tabs";
  tabsEl.setAttribute("role", "tablist");
  tabsEl.setAttribute("part", "tabs");
  const tabScroller = document.createElement("div");
  tabScroller.className = "uo-tabs-scroll";
  tabsEl.appendChild(tabScroller);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "uo-btn uo-ribbon-toggle";
  toggle.dataset["a"] = "ribbon-toggle";
  toggle.addEventListener("mousedown", (e) => e.preventDefault());
  tabsEl.appendChild(toggle);
  const body = document.createElement("div");
  body.className = "uo-ribbon-body";
  body.setAttribute("part", "ribbon");
  const notice = createNoticeRegion();
  root.append(titlebar, notice.el, tabsEl, body);
  container.appendChild(root);
  let active = null;
  let collapsed = false;
  const setCollapsed = (v) => {
    collapsed = v;
    root.classList.toggle("uo-collapsed", v);
    toggle.innerHTML = symbol(v ? "keyboard_arrow_down" : "keyboard_arrow_up");
    toggle.title = reg.text(v ? L_EXPAND : L_COLLAPSE);
    if (!v) schedule();
  };
  toggle.addEventListener("click", () => setCollapsed(!collapsed));
  const tabs = cfg.tabs.map((def) => {
    const btn2 = document.createElement("button");
    btn2.type = "button";
    btn2.className = `uo-tab${def.contextual ? " uo-tab-ctx" : ""}${def.menu ? " uo-tab-file" : ""}`;
    btn2.dataset["tab"] = def.id;
    btn2.setAttribute("role", "tab");
    btn2.textContent = reg.text(def.label);
    btn2.addEventListener("mousedown", (e) => e.preventDefault());
    ripple(btn2);
    tabScroller.appendChild(btn2);
    const panel = document.createElement("div");
    panel.className = "uo-rpanel";
    panel.dataset["tab"] = def.id;
    panel.setAttribute("role", "tabpanel");
    panel.hidden = true;
    const stash = document.createElement("div");
    stash.hidden = true;
    body.append(panel, stash);
    const groups = def.groups.map((g) => renderGroup(g, ctx));
    for (const g of groups) panel.appendChild(g.el);
    const st = { def, btn: btn2, panel, stash, groups, measured: false, visible: true };
    btn2.addEventListener("click", (e) => {
      if (def.menu) {
        e.stopPropagation();
        if (isMenuOpenFor(btn2)) {
          closeMenus();
          return;
        }
        toggleMenu(btn2, def.menu, ctx, e.detail === 0);
        return;
      }
      if (collapsed) setCollapsed(false);
      select(st);
    });
    return st;
  });
  const select = (t2) => {
    if (active === t2) return;
    closePopover();
    for (const x2 of tabs) {
      const on = x2 === t2;
      x2.btn.classList.toggle("uo-on", on);
      x2.btn.setAttribute("aria-selected", String(on));
      x2.panel.hidden = !on;
    }
    active = t2;
    schedule();
  };
  const makeTrigger = (t2, g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-btn uo-btn-lg uo-btn-lbl uo-rtrig";
    b.dataset["g"] = g.def.id;
    b.title = reg.text(g.def.label);
    b.innerHTML = symbol(g.def.icon ?? "more_horiz") + `<span class="uo-lbl">${esc(reg.text(g.def.label))}</span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) {
        closePopover();
        return;
      }
      openPopover(b, [{ el: g.el, label: "", home: t2.stash }], ctx.layer);
    });
    ripple(b);
    return b;
  };
  const makeMore = (t2, gs) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-btn uo-btn-lg uo-btn-lbl uo-rtrig";
    b.dataset["a"] = "more";
    b.title = reg.text(L_MORE2);
    b.innerHTML = symbol("more_horiz") + `<span class="uo-lbl">${esc(reg.text(L_MORE2))}</span>`;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopoverOpenFor(b)) {
        closePopover();
        return;
      }
      openPopover(b, gs.map((g) => ({ el: g.el, label: reg.text(g.def.label), home: t2.stash })), ctx.layer);
    });
    ripple(b);
    return b;
  };
  const relayout = () => {
    const t2 = active;
    if (!t2 || !root.isConnected || collapsed || t2.panel.clientWidth === 0) return;
    closePopover();
    const vis = t2.groups.filter((g) => g.visible);
    for (const g of t2.groups) for (const r of g.items) r.fit?.(0);
    if (!t2.measured || vis.some((g) => g.width === 0)) {
      for (const g of vis) t2.panel.appendChild(g.el);
      t2.panel.querySelectorAll(":scope > .uo-rtrig").forEach((e) => e.remove());
      for (const g of vis) g.width = g.el.getBoundingClientRect().width + 2;
      t2.measured = true;
    }
    t2.panel.querySelectorAll(":scope > .uo-rtrig").forEach((e) => e.remove());
    const shrinkOf = (g) => g.items.reduce((s, r) => s + (r.shrink?.() ?? 0), 0);
    const plan = planCollapse(
      vis.map((g) => ({ prio: g.def.prio ?? 5, width: g.width, shrink: shrinkOf(g) })),
      t2.panel.clientWidth - PAD3,
      { trigW: TRIG_W2, moreW: MORE_W2 }
    );
    for (const g of t2.groups) t2.stash.appendChild(g.el);
    const inline = new Set(plan.inline), trig = new Set(plan.triggers);
    vis.forEach((g, i2) => {
      if (inline.has(i2)) t2.panel.appendChild(g.el);
      else if (trig.has(i2)) t2.panel.appendChild(makeTrigger(t2, g));
    });
    if (plan.more.length) t2.panel.appendChild(makeMore(t2, plan.more.map((i2) => vis[i2])));
    plan.give?.forEach((px, i2) => {
      let left = px;
      for (const r of vis[i2].items) {
        if (!r.fit || left <= 0) continue;
        const s = Math.min(r.shrink(), left);
        r.fit(s);
        left -= s;
      }
    });
  };
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      relayout();
    });
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(body);
  void document.fonts?.ready.then(() => {
    for (const t2 of tabs) t2.measured = false;
    schedule();
  });
  const sync = () => {
    for (const r of synced) r.sync();
    let surfaced = null;
    for (const t2 of tabs) {
      let changed = false;
      for (const g of t2.groups) {
        for (const r of g.items) r.sync();
        const v2 = g.items.some((r) => r.visible());
        g.el.hidden = !v2;
        if (v2 !== g.visible) {
          g.visible = v2;
          changed = true;
        }
      }
      if (changed) t2.measured = false;
      const ctxOk = t2.def.contextual ? !!t2.def.contextual() : true;
      const v = ctxOk && (!!t2.def.menu || t2.groups.some((g) => g.visible));
      if (v && !t2.visible && t2.def.contextual) surfaced = t2;
      t2.visible = v;
      t2.btn.hidden = !v;
      if (changed && t2 === active) schedule();
    }
    if (surfaced) select(surfaced);
    else if (active && !active.visible) select(tabs.find((t2) => t2.visible && !t2.def.menu && !t2.def.contextual));
  };
  setCollapsed(false);
  sync();
  select(tabs.find((t2) => t2.visible && !t2.def.menu) ?? tabs[0]);
  relayout();
  return {
    el: root,
    sync,
    relayout: () => {
      for (const t2 of tabs) t2.measured = false;
      relayout();
    },
    setNotice: notice.set,
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    }
  };
}

// ../../../shared/ui/src/toolbar/colors.ts
var BASE = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
var STANDARD = ["C00000", "FF0000", "FFC000", "FFFF00", "92D050", "00B050", "00B0F0", "0070C0", "002060", "7030A0"];
function mix(hex2, f) {
  const n = parseInt(hex2, 16);
  const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
  return ch.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
var WHITE = ["F2F2F2", "D9D9D9", "BFBFBF", "A6A6A6", "808080"];
var BLACK = ["7F7F7F", "595959", "404040", "262626", "0D0D0D"];
var OFFICE_COLORS = [
  ...BASE,
  ...[0.8, 0.6, 0.4, -0.25, -0.5].flatMap((f, row) => BASE.map((h, i2) => i2 === 0 ? WHITE[row] : i2 === 1 ? BLACK[row] : mix(h, f))),
  ...STANDARD
];
function colorGrid(o) {
  const g = document.createElement("div");
  g.className = "uo-colors";
  if (o.columns) g.style.gridTemplateColumns = `repeat(${o.columns}, 20px)`;
  for (const c2 of o.colors) {
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = c2.css;
    b.title = c2.title ?? c2.css;
    b.dataset["color"] = c2.value;
    if (o.selected && o.selected.toLowerCase() === c2.value.toLowerCase()) b.classList.add("sel");
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      o.close();
      o.onPick(c2.value);
    });
    g.appendChild(b);
  }
  return g;
}

// ../../../shared/ui/src/toolbar/pane.ts
var LABELS3 = { en: { close: "Close" }, pt: { close: "Fechar" }, es: { close: "Cerrar" } };
var panes = /* @__PURE__ */ new Map();
function closePanes(layer) {
  for (const p of [...panes.values()]) if (!layer || layer.contains(p.el)) p.close();
}
function openPane(o) {
  const cur = panes.get(o.id);
  if (cur) {
    cur.place();
    return cur;
  }
  const lang = o.lang ?? DEFAULT_UI_LANG;
  const L2 = pickLabels(lang, LABELS3);
  const txt2 = (l) => typeof l === "string" ? l : pickLabels(lang, l);
  const width = o.width ?? 300;
  const height = o.height ?? 220;
  const dock = o.dock ?? "right";
  const el = document.createElement("aside");
  el.className = "uo-pane";
  el.dataset["pane"] = o.id;
  el.dataset["dock"] = dock;
  el.setAttribute("part", "pane");
  el.setAttribute("role", "complementary");
  if (dock !== "bottom") el.style.width = `${width}px`;
  const head = document.createElement("div");
  head.className = "uo-pane-head";
  const title = document.createElement("span");
  title.className = "uo-pane-title";
  title.textContent = txt2(o.title);
  const x2 = document.createElement("button");
  x2.type = "button";
  x2.className = "uo-btn uo-pane-x";
  x2.dataset["a"] = `pane:${o.id}:close`;
  x2.title = L2.close;
  x2.setAttribute("aria-label", L2.close);
  x2.innerHTML = symbol("close");
  head.append(title, x2);
  const body = o.body;
  body.classList.add("uo-pane-body");
  el.append(head, body);
  if (o.footer) {
    o.footer.classList.add("uo-pane-foot");
    el.appendChild(o.footer);
  }
  el.setAttribute("aria-label", txt2(o.title));
  o.layer.appendChild(el);
  const place3 = () => {
    const r = o.frame();
    const top = Math.max(0, r.top), bottom = Math.min(r.bottom, window.innerHeight);
    if (dock === "bottom") {
      const h = Math.min(height, Math.max(120, bottom - top));
      el.style.top = `${bottom - h}px`;
      el.style.height = `${h}px`;
      el.style.left = `${Math.max(0, r.left)}px`;
      el.style.width = `${r.width}px`;
      return;
    }
    el.style.top = `${top}px`;
    el.style.height = `${Math.max(120, bottom - top)}px`;
    el.style.left = `${Math.max(0, dock === "left" ? r.left : r.right - width)}px`;
  };
  let open2 = true;
  const onWin = () => place3();
  window.addEventListener("resize", onWin);
  window.addEventListener("scroll", onWin, true);
  const handle = {
    el,
    body,
    get open() {
      return open2;
    },
    place: place3,
    setTitle: (t2) => {
      title.textContent = txt2(t2);
      el.setAttribute("aria-label", txt2(t2));
    },
    close: () => {
      if (!open2) return;
      open2 = false;
      panes.delete(o.id);
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      el.remove();
      o.onClose?.();
    }
  };
  x2.addEventListener("click", () => handle.close());
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target === el) handle.close();
  });
  panes.set(o.id, handle);
  place3();
  return handle;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/binary.js
function toUint8Array(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

// ../../../../../../vendor/office-converter/node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t2 = s + l;
        if (t2 > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t2), bt);
        st.b = bt += l, st.p = pos = t2 * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c2 = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c2 = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c2;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c2 = lm[bits16(dat, pos) & lms], sym = c2 >> 4;
      pos += c2 & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c2)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t2 = [];
  for (var i2 = 0; i2 < d.length; ++i2) {
    if (d[i2])
      t2.push({ s: i2, f: d[i2] });
  }
  var s = t2.length;
  var t22 = t2.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t2[0].s + 1);
    v[t2[0].s] = 1;
    return { t: v, l: 1 };
  }
  t2.sort(function(a, b) {
    return a.f - b.f;
  });
  t2.push({ s: -1, f: 25001 });
  var l = t2[0], r = t2[1], i0 = 0, i1 = 1, i22 = 2;
  t2[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t2[t2[i0].f < t2[i22].f ? i0++ : i22++];
    r = t2[i0 != i1 && t2[i0].f < t2[i22].f ? i0++ : i22++];
    t2[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t22[0].s;
  for (var i2 = 1; i2 < s; ++i2) {
    if (t22[i2].s > maxSym)
      maxSym = t22[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t2[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t22.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t22[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t22[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t22[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c2) {
  var s = c2.length;
  while (s && !c2[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c2[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c2[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c2[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c2 = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c2, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t2 = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c2 = i2, k = 9;
    while (--k)
      c2 = (c2 & 1 && -306674912) ^ c2 >>> 1;
    t2[i2] = c2;
  }
  return t2;
})();
var crc = function() {
  var c2 = -1;
  return {
    p: function(d) {
      var cr = c2;
      for (var i2 = 0; i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c2 = cr;
    },
    d: function() {
      return ~c2;
    }
  };
};
var adler = function() {
  var a = 1, b = 0;
  return {
    p: function(d) {
      var n = a, m = b;
      var l = d.length | 0;
      for (var i2 = 0; i2 != l; ) {
        var e = Math.min(i2 + 2655, l);
        for (; i2 < e; ++i2)
          m += n += d[i2];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d: function() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
var zlh = function(c2, o) {
  var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c2[0] = 120, c2[1] = fl2 << 6 | (o.dictionary && 32);
  c2[1] |= 31 - (c2[0] << 8 | c2[1]) % 31;
  if (o.dictionary) {
    var h = adler();
    h.p(o.dictionary);
    wbytes(c2, 2, h.d());
  }
};
var zls = function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t2, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t2[n] = [val, op];
    else {
      t2[n += "/"] = [new u8(0), op];
      fltn(val, n, t2, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c2 = d[i2++];
    var eb = (c2 > 127) + (c2 > 223) + (c2 > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c2);
    else if (eb == 3) {
      c2 = ((c2 & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c2 >> 10, 56320 | c2 & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c2 & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c2 & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c2 = str.charCodeAt(i2);
    if (c2 < 128 || latin1)
      w(c2);
    else if (c2 < 2048)
      w(192 | c2 >> 6), w(128 | c2 & 63);
    else if (c2 > 55295 && c2 < 57344)
      c2 = 65536 + (c2 & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c2 >> 18), w(128 | c2 >> 12 & 63), w(128 | c2 >> 6 & 63), w(128 | c2 & 63);
    else
      w(224 | c2 >> 12), w(128 | c2 >> 6 & 63), w(128 | c2 & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c2, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c2 < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c2 != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c2 < 0 ? -c2 - 2 : c2);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c2, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c2);
  wbytes(o, b + 10, c2);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c2 = crc();
    c2.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c2.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i2 = 0; i2 < files.length; ++i2) {
    var f = files[i2];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c2 = b2(data, e + 8);
  if (!c2)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c2 = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c2; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/detect.js
function startsWith(bytes, ascii) {
  return ascii.length <= bytes.length && [...ascii].every((c2, i2) => bytes[i2] === c2.charCodeAt(0));
}
function detectFormat(input) {
  const bytes = toUint8Array(input);
  if (startsWith(bytes, "%PDF-"))
    return "pdf";
  if (!startsWith(bytes, "PK"))
    throw new Error("Unsupported input: expected PDF, DOCX, XLSX, or PPTX bytes");
  let files;
  try {
    files = unzipSync(bytes);
  } catch (cause) {
    throw new Error("Invalid OOXML ZIP container", { cause });
  }
  const names = new Set(Object.keys(files).map((name) => name.replace(/\\/g, "/")));
  if (names.has("word/document.xml"))
    return "docx";
  if (names.has("xl/workbook.xml"))
    return "xlsx";
  if (names.has("ppt/presentation.xml"))
    return "pptx";
  throw new Error("Unsupported ZIP container: no DOCX, XLSX, or PPTX main part found");
}

// ../../../../../../vendor/office-converter/vendor/docs-processing/packages/processing/dist/package.js
var DocxPackage = class _DocxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  /** Pacote OPC mínimo para documentos novos (writeDocument completa o resto). */
  static empty() {
    const enc = new TextEncoder();
    const parts = /* @__PURE__ */ new Map();
    parts.set("[Content_Types].xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
    parts.set("_rels/.rels", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
    parts.set("word/document.xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'));
    return new _DocxPackage(parts);
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote OOXML v\xE1lido (ZIP corrompido ou formato legado .doc)");
    }
    const pkg = new _DocxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("word/document.xml")) {
      throw new Error("Pacote sem word/document.xml \u2014 n\xE3o \xE9 um documento .docx v\xE1lido");
    }
    return pkg;
  }
  save() {
    const zippable = {};
    for (const [path, data] of this.parts)
      zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }
  partNames() {
    return [...this.parts.keys()];
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  setPart(path, data) {
    this.parts.set(path, data);
  }
  setPartText(path, text2) {
    this.parts.set(path, new TextEncoder().encode(text2));
  }
  /** Conteúdo principal (word/document.xml). */
  documentXml() {
    const xml = this.getPartText("word/document.xml");
    if (xml === void 0)
      throw new Error("Pacote sem word/document.xml");
    return xml;
  }
};

// ../../../../../../vendor/office-converter/vendor/docs-processing/packages/processing/dist/xml.js
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e) => {
    if (e.startsWith("#x") || e.startsWith("#X"))
      return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#"))
      return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? `&${e};`;
  });
}
function parseXml(xml) {
  let i2 = 0;
  const n = xml.length;
  function error(msg) {
    throw new Error(`XML inv\xE1lido @${i2}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml.startsWith("<?", i2)) {
        i2 = xml.indexOf("?>", i2);
        if (i2 < 0)
          error("?> n\xE3o fechado");
        i2 += 2;
      } else if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2);
        if (i2 < 0)
          error("--> n\xE3o fechado");
        i2 += 3;
      } else if (xml.startsWith("<!", i2)) {
        i2 = xml.indexOf(">", i2);
        if (i2 < 0)
          error("<! n\xE3o fechado");
        i2 += 1;
      } else
        break;
    }
  }
  function parseElement() {
    if (xml[i2] !== "<")
      error("esperava <");
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2]))
      i2++;
    const name = xml.slice(nameStart, i2);
    const attrs = {};
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">")
          error("esperava />");
        i2 += 2;
        return { name, attrs, children: [] };
      }
      if (xml[i2] === ">") {
        i2++;
        break;
      }
      const aStart = i2;
      while (i2 < n && xml[i2] !== "=" && !/\s/.test(xml[i2]))
        i2++;
      const aName = xml.slice(aStart, i2);
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] !== "=")
        error(`atributo ${aName} sem =`);
      i2++;
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      const q = xml[i2];
      if (q !== '"' && q !== "'")
        error("valor de atributo sem aspas");
      i2++;
      const vStart = i2;
      i2 = xml.indexOf(q, i2);
      if (i2 < 0)
        error("aspas n\xE3o fechadas");
      attrs[aName] = decodeEntities(xml.slice(vStart, i2));
      i2++;
    }
    const children = [];
    for (; ; ) {
      if (i2 >= n)
        error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        const close = xml.indexOf(">", i2);
        i2 = close + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i2)) {
        const end = xml.indexOf("]]>", i2);
        children.push(xml.slice(i2 + 9, end));
        i2 = end + 3;
        continue;
      }
      if (xml[i2] === "<") {
        children.push(parseElement());
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<")
        i2++;
      const text2 = decodeEntities(xml.slice(tStart, i2));
      if (text2.length > 0)
        children.push(text2);
    }
  }
  skipMisc();
  const root = parseElement();
  return root;
}
function childElements(el, name) {
  return el.children.filter((c2) => typeof c2 !== "string" && (name === void 0 || c2.name === name));
}
function firstChild(el, name) {
  return childElements(el, name)[0];
}

// ../../../../../../vendor/office-converter/vendor/docs-processing/packages/processing/dist/document.js
var DEFAULT_RUN_PROPS = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  allCaps: false,
  smallCaps: false
};
var EMU_PER_TWIP = 635;
function readBorderEdge(el) {
  if (!el)
    return void 0;
  const style = el.attrs["w:val"];
  if (!style || style === "none" || style === "nil")
    return void 0;
  const color = el.attrs["w:color"];
  return {
    style,
    sizeEighthPt: parseInt(el.attrs["w:sz"] ?? "4", 10),
    color: color && color !== "auto" ? color : void 0,
    spacePt: parseInt(el.attrs["w:space"] ?? "0", 10)
  };
}
var onOff = (el) => {
  if (!el)
    return false;
  const v = el.attrs["w:val"];
  return v !== "0" && v !== "false" && v !== "none";
};
function readRunProps(rPr) {
  const p = { ...DEFAULT_RUN_PROPS };
  if (!rPr)
    return p;
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:b":
        p.bold = onOff(el);
        break;
      case "w:i":
        p.italic = onOff(el);
        break;
      case "w:u":
        p.underline = val !== void 0 && val !== "none";
        if (val === "double" || val === "dotted" || val === "dash" || val === "wave" || val === "thick") {
          p.underlineStyle = val;
        }
        if (el.attrs["w:color"] && el.attrs["w:color"] !== "auto")
          p.underlineColor = el.attrs["w:color"];
        break;
      case "w:strike":
        p.strike = onOff(el);
        break;
      case "w:dstrike":
        p.doubleStrike = onOff(el);
        break;
      case "w:caps":
        p.allCaps = onOff(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff(el);
        break;
      case "w:vertAlign":
        if (val === "superscript" || val === "subscript")
          p.vertAlign = val;
        break;
      case "w:sz":
        if (val)
          p.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto")
          p.color = val;
        break;
      case "w:highlight":
        if (val && val !== "none")
          p.highlight = val;
        break;
      case "w:rFonts":
        p.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:spacing":
        if (val)
          p.charSpacingTwips = parseInt(val, 10);
        break;
    }
  }
  return p;
}
function findDeep(el, name) {
  for (const c2 of childElements(el)) {
    if (c2.name === name)
      return c2;
    const found = findDeep(c2, name);
    if (found)
      return found;
  }
  return void 0;
}
function readDrawing(drawing, resolveImage) {
  const anchor = firstChild(drawing, "wp:anchor");
  const extent = findDeep(drawing, "wp:extent");
  const blip = findDeep(drawing, "a:blip");
  const rid = blip?.attrs["r:embed"];
  if (!extent || !rid)
    return void 0;
  const media = resolveImage(rid);
  if (!media)
    return void 0;
  const img = {
    data: media.data,
    ext: media.ext,
    widthTwips: parseInt(extent.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP,
    heightTwips: parseInt(extent.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP
  };
  if (anchor) {
    img.floating = true;
    const posH = firstChild(anchor, "wp:positionH");
    const posV = firstChild(anchor, "wp:positionV");
    const offH = posH && firstChild(posH, "wp:posOffset");
    const offV = posV && firstChild(posV, "wp:posOffset");
    if (offH)
      img.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV)
      img.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  return img;
}
function textContentOf(el) {
  let out = "";
  for (const c2 of el.children)
    out += typeof c2 === "string" ? c2 : textContentOf(c2);
  return out;
}
function readRunsInto(runs, container, ctx, inherit) {
  for (const child of childElements(container)) {
    if (child.name === "w:commentRangeStart") {
      ctx.activeComments?.add(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:commentRangeEnd") {
      ctx.activeComments?.delete(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:bookmarkStart") {
      const name = child.attrs["w:name"];
      if (name)
        ctx.onBookmark?.(name);
    } else if (child.name === "w:r") {
      readSingleRun(runs, child, ctx, inherit);
    } else if (child.name === "w:hyperlink") {
      const rid = child.attrs["r:id"];
      const anchor = child.attrs["w:anchor"];
      const link = rid && ctx.resolveLink(rid) || (anchor ? `#${anchor}` : void 0);
      readRunsInto(runs, child, ctx, { ...inherit, link });
    } else if (child.name === "w:fldSimple") {
      const instr = child.attrs["w:instr"] ?? "";
      const before = runs.length;
      readRunsInto(runs, child, ctx, { ...inherit, field: instr });
      if (runs.length === before) {
        runs.push({ text: "", props: { ...DEFAULT_RUN_PROPS }, field: instr });
      }
    } else if (child.name === "m:oMath" || child.name === "m:oMathPara") {
      const text2 = collectMathText(child);
      if (text2) {
        runs.push({
          text: text2,
          props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true }
        });
      }
    } else if (child.name === "w:sdt") {
      const content = findDeep(child, "w:sdtContent");
      const sdtPr = firstChild(child, "w:sdtPr");
      const tag = sdtPr ? firstChild(sdtPr, "w:tag")?.attrs["w:val"] : void 0;
      const custom = parseCustomInlineTag(tag);
      if (content && custom) {
        const nested = [];
        readRunsInto(nested, content, ctx, inherit);
        const fallbackText = nested.map((run) => run.text).join("");
        runs.push({
          text: "\uFFFC",
          props: { ...nested[0]?.props ?? DEFAULT_RUN_PROPS },
          custom: { ...custom, fallbackText }
        });
      } else if (content) {
        readRunsInto(runs, content, ctx, inherit);
      }
    } else if (child.name === "w:smartTag" || child.name === "w:ins") {
      readRunsInto(runs, child, ctx, inherit);
    }
  }
}
var CUSTOM_INLINE_TAG_PREFIX = "wordnext:inline:";
function parseCustomInlineTag(tag) {
  if (!tag?.startsWith(CUSTOM_INLINE_TAG_PREFIX))
    return void 0;
  const payload = tag.slice(CUSTOM_INLINE_TAG_PREFIX.length);
  const split = payload.indexOf(":");
  if (split <= 0)
    return void 0;
  const type = payload.slice(0, split);
  if (!/^[a-zA-Z0-9._-]+$/.test(type))
    return void 0;
  try {
    return { type, data: JSON.parse(decodeURIComponent(payload.slice(split + 1))) };
  } catch {
    return void 0;
  }
}
function collectMathText(el) {
  let out = "";
  for (const c2 of el.children) {
    if (typeof c2 === "string")
      continue;
    if (c2.name === "m:t")
      out += textContentOf(c2);
    else
      out += collectMathText(c2);
  }
  return out;
}
function readSingleRun(runs, rEl, ctx, inherit) {
  const rProps = readRunProps(firstChild(rEl, "w:rPr"));
  if (inherit?.link) {
    rProps.link = inherit.link;
    rProps.underline = true;
    rProps.color ??= "0563C1";
  }
  const flush = (text3, extra) => {
    if (text3.length === 0 && !extra)
      return;
    const props = { ...rProps };
    if (ctx.activeComments?.size)
      props.commentIds = [...ctx.activeComments];
    runs.push({ text: text3, props, ...inherit?.field ? { field: inherit.field } : {}, ...extra });
  };
  let text2 = "";
  for (const child of childElements(rEl)) {
    if (child.name === "w:fldChar") {
      const type = child.attrs["w:fldCharType"];
      if (type === "begin") {
        if (text2) {
          flush(text2);
          text2 = "";
        }
        ctx.fieldState = { instr: "", phase: "instr", result: "" };
      } else if (type === "separate") {
        if (ctx.fieldState)
          ctx.fieldState.phase = "result";
      } else if (type === "end") {
        const fs = ctx.fieldState;
        ctx.fieldState = null;
        if (fs) {
          const instr = ` ${fs.instr.trim()} `;
          const props = { ...rProps };
          if (ctx.activeComments?.size)
            props.commentIds = [...ctx.activeComments];
          runs.push({ text: fs.result, props, field: instr });
        }
      }
      continue;
    }
    if (child.name === "w:instrText") {
      if (ctx.fieldState)
        ctx.fieldState.instr += textContentOf(child);
      continue;
    }
    if (ctx.fieldState) {
      if (child.name === "w:t" && ctx.fieldState.phase === "result") {
        ctx.fieldState.result += child.children.filter((c2) => typeof c2 === "string").join("");
      }
      continue;
    }
    if (child.name === "w:t") {
      text2 += child.children.filter((c2) => typeof c2 === "string").join("");
    } else if (child.name === "w:tab")
      text2 += "	";
    else if (child.name === "w:br" || child.name === "w:cr") {
      text2 += child.attrs["w:type"] === "page" ? "\f" : "\n";
    } else if (child.name === "w:sym") {
      if (text2) {
        flush(text2);
        text2 = "";
      }
      const hex2 = child.attrs["w:char"] ?? "F0B7";
      let code = parseInt(hex2, 16);
      if (code <= 255)
        code |= 61440;
      runs.push({
        text: String.fromCharCode(code),
        props: { ...rProps, fontAscii: child.attrs["w:font"] ?? rProps.fontAscii }
      });
    } else if (child.name === "w:footnoteReference" || child.name === "w:endnoteReference") {
      if (text2) {
        flush(text2);
        text2 = "";
      }
      const id = parseInt(child.attrs["w:id"] ?? "0", 10);
      runs.push({
        text: "",
        props: { ...rProps, vertAlign: "superscript" },
        noteRef: { kind: child.name === "w:footnoteReference" ? "footnote" : "endnote", id }
      });
    } else if (child.name === "w:drawing") {
      if (text2) {
        flush(text2);
        text2 = "";
      }
      const image = readDrawing(child, ctx.resolveImage);
      if (image)
        runs.push({ text: "\uFFFC", props: { ...rProps }, image });
    }
  }
  if (text2.length > 0)
    flush(text2);
}
function readParagraph(pEl, ctx) {
  const props = {};
  const pPr = firstChild(pEl, "w:pPr");
  if (pPr) {
    const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
    if (jc === "center" || jc === "right" || jc === "both" || jc === "left")
      props.alignment = jc;
    props.styleId = firstChild(pPr, "w:pStyle")?.attrs["w:val"];
    const numPr = firstChild(pPr, "w:numPr");
    if (numPr) {
      const numId = parseInt(firstChild(numPr, "w:numId")?.attrs["w:val"] ?? "0", 10);
      props.numbering = {
        kind: numId === 1002 ? "decimal" : "bullet",
        ilvl: parseInt(firstChild(numPr, "w:ilvl")?.attrs["w:val"] ?? "0", 10)
      };
    }
    const ind = firstChild(pPr, "w:ind");
    if (ind) {
      if (ind.attrs["w:left"])
        props.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
      if (ind.attrs["w:right"])
        props.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
      if (ind.attrs["w:firstLine"])
        props.indentFirstLineTwips = parseInt(ind.attrs["w:firstLine"], 10);
      if (ind.attrs["w:hanging"])
        props.indentFirstLineTwips = -parseInt(ind.attrs["w:hanging"], 10);
    }
    const spacing = firstChild(pPr, "w:spacing");
    if (spacing) {
      if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
        props.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
      }
      if (spacing.attrs["w:after"])
        props.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
      if (spacing.attrs["w:before"])
        props.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
    }
    const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
    if (shd && shd !== "auto")
      props.shadingHex = shd;
    const tabs = firstChild(pPr, "w:tabs");
    if (tabs) {
      const stops = childElements(tabs, "w:tab").map((t2) => ({
        posTwips: parseInt(t2.attrs["w:pos"] ?? "0", 10),
        align: t2.attrs["w:val"] === "right" ? "right" : "left",
        leader: t2.attrs["w:leader"] === "dot" ? "dot" : void 0
      })).filter((t2) => t2.posTwips > 0);
      if (stops.length)
        props.tabStops = stops;
    }
    const pBdr = firstChild(pPr, "w:pBdr");
    if (pBdr) {
      props.boxBorder = true;
      const borders = {};
      for (const side of ["top", "left", "bottom", "right"]) {
        const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
        if (edge)
          borders[side] = edge;
      }
      if (Object.keys(borders).length > 0)
        props.borders = borders;
    }
    if (firstChild(pPr, "w:pageBreakBefore"))
      props.pageBreakBefore = true;
    const framePr = firstChild(pPr, "w:framePr");
    if (framePr?.attrs["w:dropCap"] && framePr.attrs["w:dropCap"] !== "none")
      props.dropCap = true;
  }
  const runs = [];
  readRunsInto(runs, pEl, ctx);
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr))
    props.tocInstr = instr.trim();
  return { runs, props };
}
function collectInstrText(el) {
  let out = "";
  for (const c2 of el.children) {
    if (typeof c2 === "string")
      continue;
    if (c2.name === "w:instrText")
      out += textContentOf(c2);
    else
      out += collectInstrText(c2);
  }
  return out;
}
function buildReadContext(pkg, relsPath) {
  const relsXml = pkg.getPartText(relsPath);
  const relMap = /* @__PURE__ */ new Map();
  if (relsXml) {
    const rels = parseXml(relsXml);
    for (const rel of childElements(rels, "Relationship")) {
      const id = rel.attrs["Id"];
      const target = rel.attrs["Target"];
      if (id && target) {
        relMap.set(id, {
          target: target.replace(/^\.\//, ""),
          external: rel.attrs["TargetMode"] === "External"
        });
      }
    }
  }
  return {
    activeComments: /* @__PURE__ */ new Set(),
    fieldState: null,
    resolveImage: (rid) => {
      const rel = relMap.get(rid);
      if (!rel || rel.external)
        return void 0;
      const path = rel.target.startsWith("/") ? rel.target.slice(1) : `word/${rel.target}`;
      const data = pkg.getPart(path);
      if (!data)
        return void 0;
      const ext = path.split(".").pop()?.toLowerCase() ?? "png";
      return { data, ext };
    },
    resolveLink: (rid) => {
      const rel = relMap.get(rid);
      return rel?.external ? rel.target : void 0;
    }
  };
}
var tw = (el, attr, fallback) => {
  const v = el?.attrs[attr];
  return v === void 0 ? fallback : parseInt(v, 10);
};
function readSectPr(sectEl) {
  const pgSz = sectEl && firstChild(sectEl, "w:pgSz");
  const pgMar = sectEl && firstChild(sectEl, "w:pgMar");
  const colsEl = sectEl && firstChild(sectEl, "w:cols");
  const sect = {
    pageWidthTwips: tw(pgSz, "w:w", 11906),
    pageHeightTwips: tw(pgSz, "w:h", 16838),
    marginLeftTwips: tw(pgMar, "w:left", 1701),
    marginRightTwips: tw(pgMar, "w:right", 1701),
    marginTopTwips: tw(pgMar, "w:top", 1417),
    marginBottomTwips: tw(pgMar, "w:bottom", 1417)
  };
  const num = colsEl ? parseInt(colsEl.attrs["w:num"] ?? "1", 10) : 1;
  if (num > 1) {
    sect.cols = {
      count: num,
      spaceTwips: parseInt(colsEl.attrs["w:space"] ?? "720", 10),
      sep: colsEl.attrs["w:sep"] === "true" || colsEl.attrs["w:sep"] === "1"
    };
  }
  return sect;
}

// ../../../../../../vendor/office-converter/vendor/docs-processing/packages/processing/dist/styles.js
var onOff2 = (el) => {
  if (!el)
    return void 0;
  const v = el.attrs["w:val"];
  return v !== "0" && v !== "false" && v !== "none";
};
function readStyleRunProps(rPr) {
  const p = {};
  if (!rPr)
    return p;
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:b":
        p.bold = onOff2(el);
        break;
      case "w:i":
        p.italic = onOff2(el);
        break;
      case "w:caps":
        p.allCaps = onOff2(el);
        break;
      case "w:smallCaps":
        p.smallCaps = onOff2(el);
        break;
      case "w:strike":
        p.strike = onOff2(el);
        break;
      case "w:sz":
        if (val)
          p.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto")
          p.color = val;
        break;
      case "w:rFonts":
        if (el.attrs["w:ascii"])
          p.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:u":
        p.underline = val !== "none";
        break;
    }
  }
  return p;
}
function readStyleParaProps(pPr) {
  const p = {};
  if (!pPr)
    return p;
  const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
  if (jc === "center" || jc === "right" || jc === "both" || jc === "left")
    p.alignment = jc;
  const spacing = firstChild(pPr, "w:spacing");
  if (spacing) {
    if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
      p.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
    }
    if (spacing.attrs["w:after"])
      p.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
    if (spacing.attrs["w:before"])
      p.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
  }
  const ind = firstChild(pPr, "w:ind");
  if (ind?.attrs["w:left"])
    p.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
  if (ind?.attrs["w:right"])
    p.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
  if (firstChild(pPr, "w:pageBreakBefore"))
    p.pageBreakBefore = true;
  const pBdr = firstChild(pPr, "w:pBdr");
  if (pBdr) {
    const borders = {};
    for (const side of ["top", "left", "bottom", "right"]) {
      const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
      if (edge)
        borders[side] = edge;
    }
    if (Object.keys(borders).length > 0)
      p.borders = borders;
  }
  const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
  if (shd && shd !== "auto")
    p.shadingHex = shd;
  return p;
}
function readStyles(pkg) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText("word/styles.xml");
  if (!xml)
    return out;
  const root = parseXml(xml);
  const docDefaults = firstChild(root, "w:docDefaults");
  const defRun = readStyleRunProps(docDefaults && firstChild(firstChild(docDefaults, "w:rPrDefault") ?? docDefaults, "w:rPr"));
  const defPara = readStyleParaProps(docDefaults && firstChild(firstChild(docDefaults, "w:pPrDefault") ?? docDefaults, "w:pPr"));
  const raw = /* @__PURE__ */ new Map();
  for (const st of childElements(root, "w:style")) {
    if (st.attrs["w:type"] !== "paragraph" && st.attrs["w:type"] !== "character")
      continue;
    const id = st.attrs["w:styleId"];
    if (!id)
      continue;
    raw.set(id, {
      basedOn: firstChild(st, "w:basedOn")?.attrs["w:val"],
      para: readStyleParaProps(firstChild(st, "w:pPr")),
      run: readStyleRunProps(firstChild(st, "w:rPr"))
    });
  }
  const resolve = (id, seen) => {
    const cached = out.get(id);
    if (cached)
      return cached;
    const r = raw.get(id);
    if (!r || seen.has(id))
      return { para: { ...defPara }, run: { ...defRun } };
    seen.add(id);
    const base = r.basedOn ? resolve(r.basedOn, seen) : { para: { ...defPara }, run: { ...defRun } };
    const resolved = {
      para: { ...base.para, ...r.para },
      run: { ...base.run, ...r.run }
    };
    out.set(id, resolved);
    return resolved;
  };
  for (const id of raw.keys())
    resolve(id, /* @__PURE__ */ new Set());
  out.set("docDefaults", { para: { ...defPara }, run: { ...defRun } });
  return out;
}

// ../../../../../../vendor/office-converter/vendor/docs-processing/packages/processing/dist/fulldoc.js
function readBorderSet(el, inside) {
  if (!el)
    return void 0;
  const out = {};
  const sides = inside ? ["top", "left", "bottom", "right", "insideH", "insideV"] : ["top", "left", "bottom", "right"];
  let any = false;
  for (const side of sides) {
    const edge = readBorderEdge(firstChild(el, `w:${side}`));
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function readTable(tblEl, ctx) {
  const grid = firstChild(tblEl, "w:tblGrid");
  const gridColsTwips = grid ? childElements(grid, "w:gridCol").map((c2) => parseInt(c2.attrs["w:w"] ?? "0", 10)) : [];
  const tblPr = firstChild(tblEl, "w:tblPr");
  const tblBorders = readBorderSet(tblPr && firstChild(tblPr, "w:tblBorders"), true);
  const rows = [];
  for (const trEl of childElements(tblEl, "w:tr")) {
    const cells = [];
    for (const tcEl of childElements(trEl, "w:tc")) {
      const tcPr = firstChild(tcEl, "w:tcPr");
      const shd = tcPr && firstChild(tcPr, "w:shd")?.attrs["w:fill"];
      const tcW = tcPr && firstChild(tcPr, "w:tcW");
      const cellBorders = readBorderSet(tcPr && firstChild(tcPr, "w:tcBorders"), true);
      const gridSpan = tcPr ? parseInt(firstChild(tcPr, "w:gridSpan")?.attrs["w:val"] ?? "1", 10) : 1;
      const paragraphs = childElements(tcEl, "w:p").map((p) => readParagraph(p, ctx));
      const tables = childElements(tcEl, "w:tbl").map((t2) => readTable(t2, ctx));
      if (paragraphs.length === 0 && tables.length === 0)
        paragraphs.push({ runs: [], props: {} });
      cells.push({
        paragraphs,
        tables,
        gridSpan,
        widthTwips: tcW && tcW.attrs["w:type"] === "dxa" ? parseInt(tcW.attrs["w:w"] ?? "0", 10) : void 0,
        shadingHex: shd && shd !== "auto" ? shd : void 0,
        borders: cellBorders
      });
    }
    if (cells.length > 0)
      rows.push({ cells });
  }
  return { type: "table", rows, gridColsTwips, borders: tblBorders };
}
function readHeaderFooterPart(pkg, path) {
  const xml = pkg.getPartText(path);
  if (!xml)
    return void 0;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  const paras = [];
  for (const child of childElements(root)) {
    if (child.name === "w:p")
      paras.push(readParagraph(child, ctx));
    else if (child.name === "w:tbl") {
      const t2 = readTable(child, ctx);
      for (const r of t2.rows)
        for (const c2 of r.cells)
          paras.push(...c2.paragraphs);
    }
  }
  return paras;
}
function readNotesPart(pkg, path, elementName) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(path);
  if (!xml)
    return out;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs["w:id"] ?? "0", 10);
    const type = note.attrs["w:type"];
    if (type === "separator" || type === "continuationSeparator")
      continue;
    out.set(id, childElements(note, "w:p").map((p) => readParagraph(p, ctx)));
  }
  return out;
}
function readComments(pkg) {
  const xml = pkg.getPartText("word/comments.xml");
  if (!xml)
    return [];
  const root = parseXml(xml);
  const ctx = buildReadContext(pkg, "word/_rels/comments.xml.rels");
  return childElements(root, "w:comment").map((c2) => ({
    id: parseInt(c2.attrs["w:id"] ?? "0", 10),
    author: c2.attrs["w:author"],
    text: childElements(c2, "w:p").map((p) => readParagraph(p, ctx).runs.map((r) => r.text).join("")).join("\n")
  }));
}
function readFullDocument(pkg) {
  const root = parseXml(pkg.documentXml());
  const body = firstChild(root, "w:body");
  if (!body)
    throw new Error("w:document sem w:body");
  const ctx = buildReadContext(pkg, "word/_rels/document.xml.rels");
  const relsXml = pkg.getPartText("word/_rels/document.xml.rels");
  const relTargets = /* @__PURE__ */ new Map();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), "Relationship")) {
      if (rel.attrs["Id"] && rel.attrs["Target"]) {
        relTargets.set(rel.attrs["Id"], `word/${rel.attrs["Target"].replace(/^\.\//, "")}`);
      }
    }
  }
  const readHfSet = (sectEl, kind) => {
    const set = {};
    const refs = [];
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs["r:id"];
      const type = ref.attrs["w:type"] ?? "default";
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        const paras = readHeaderFooterPart(pkg, target);
        if (paras) {
          set[type] = paras;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs };
  };
  const blocks = [];
  const sections = [];
  const bookmarks = /* @__PURE__ */ new Map();
  ctx.onBookmark = (name) => {
    if (!bookmarks.has(name))
      bookmarks.set(name, blocks.length);
  };
  let sectionStart = 0;
  const closeSection = (sectEl, endBlock) => {
    const h = readHfSet(sectEl, "headerReference");
    const f = readHfSet(sectEl, "footerReference");
    sections.push({
      sectPr: readSectPr(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h.set,
      footers: f.set,
      headerRefs: h.refs,
      footerRefs: f.refs
    });
    sectionStart = endBlock + 1;
  };
  for (const child of childElements(body)) {
    if (child.name === "w:p") {
      const para = readParagraph(child, ctx);
      blocks.push({ type: "paragraph", paragraph: para });
      const pPr = firstChild(child, "w:pPr");
      const sectEl = pPr && firstChild(pPr, "w:sectPr");
      if (sectEl)
        closeSection(sectEl, blocks.length - 1);
    } else if (child.name === "w:tbl") {
      blocks.push(readTable(child, ctx));
    } else if (child.name === "w:sectPr") {
      closeSection(child, blocks.length - 1);
    } else if (child.name === "w:sdt") {
      const content = firstChild(child, "w:sdtContent");
      if (content) {
        for (const inner of childElements(content)) {
          if (inner.name === "w:p")
            blocks.push({ type: "paragraph", paragraph: readParagraph(inner, ctx) });
          else if (inner.name === "w:tbl")
            blocks.push(readTable(inner, ctx));
        }
      }
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, "w:sectPr") ?? { name: "w:sectPr", attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0)
    blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, "word/footnotes.xml", "w:footnote"),
    endnotes: readNotesPart(pkg, "word/endnotes.xml", "w:endnote"),
    comments: readComments(pkg),
    styles: readStyles(pkg),
    bookmarks
  };
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/docx/model.js
function orderedBlocks(doc) {
  const out = [];
  const byPara = /* @__PURE__ */ new Map();
  for (const a of doc.tableAnchors ?? []) {
    const arr = byPara.get(a.beforePara) ?? [];
    arr.push(a.table);
    byPara.set(a.beforePara, arr);
  }
  for (let i2 = 0; i2 < doc.paragraphs.length; i2++) {
    for (const t2 of byPara.get(i2) ?? [])
      out.push({ kind: "table", t: t2 });
    out.push({ kind: "para", p: doc.paragraphs[i2] });
  }
  for (const t2 of byPara.get(doc.paragraphs.length) ?? [])
    out.push({ kind: "table", t: t2 });
  return out;
}
function headingLevel(p) {
  const id = p.props.styleId ?? "";
  let m = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i);
  if (m)
    return Math.min(6, parseInt(m[1], 10));
  m = id.match(/^h([1-6])$/i);
  if (m)
    return parseInt(m[1], 10);
  if (/^(title|t[íi]tulo)$/i.test(id))
    return 1;
  return 0;
}
function escapeHtml2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml2(s).replace(/"/g, "&quot;");
}
function imgMime(ext) {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg")
    return "image/jpeg";
  if (e === "png")
    return "image/png";
  if (e === "gif")
    return "image/gif";
  if (e === "bmp")
    return "image/bmp";
  if (e === "svg")
    return "image/svg+xml";
  if (e === "webp")
    return "image/webp";
  if (e === "tif" || e === "tiff")
    return "image/tiff";
  return `image/${e}`;
}
function base64(bytes) {
  let bin = "";
  const chunk = 32768;
  for (let i2 = 0; i2 < bytes.length; i2 += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i2, i2 + chunk));
  }
  const g = globalThis;
  if (typeof g.btoa === "function")
    return g.btoa(bin);
  if (g.Buffer)
    return g.Buffer.from(bin, "binary").toString("base64");
  throw new Error("sem base64 (btoa/Buffer) no ambiente");
}
function dataUri(img) {
  return `data:${imgMime(img.ext)};base64,${base64(img.data)}`;
}
function resolveImageUri(img, cache) {
  const cached = cache?.get(img);
  return cached ?? dataUri(img);
}
var twipsToPx = (t2) => Math.round(t2 / 1440 * 96);
var twipsToPt = (t2) => +(t2 / 20).toFixed(2);
var halfPtToPt = (h) => h / 2;

// ../../../../../../vendor/office-converter/packages/office-converter/dist/docx/markdown.js
function escapeMd(s) {
  return s.replace(/([\\`*_{}\[\]<>|])/g, "\\$1");
}
function emphasize(t2, p) {
  const lead = (t2.match(/^\s*/) ?? [""])[0];
  const trail = (t2.match(/\s*$/) ?? [""])[0];
  let core = t2.slice(lead.length, t2.length - trail.length);
  if (!core)
    return t2;
  if (p.bold && p.italic)
    core = `***${core}***`;
  else if (p.bold)
    core = `**${core}**`;
  else if (p.italic)
    core = `*${core}*`;
  if (p.strike || p.doubleStrike)
    core = `~~${core}~~`;
  if (p.underline)
    core = `<u>${core}</u>`;
  if (p.vertAlign === "superscript")
    core = `<sup>${core}</sup>`;
  else if (p.vertAlign === "subscript")
    core = `<sub>${core}</sub>`;
  return lead + core + trail;
}
function runMd(run, ctx) {
  if (run.image)
    return ctx.imagesMode === "omit" ? "[imagem]" : `![](${resolveImageUri(run.image, ctx.imageDataUris)})`;
  if (run.noteRef) {
    const seq = ++ctx.noteSeq;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const txt2 = paras?.map((np) => np.runs.map((r) => r.text).join("")).join(" ").trim() ?? "";
    ctx.noteDefs.push(`[^n${seq}]: ${txt2}`);
    return `[^n${seq}]`;
  }
  let t2 = emphasize(escapeMd(run.text), run.props);
  if (run.props.link)
    t2 = `[${t2}](${run.props.link})`;
  return t2;
}
function inlineRuns(runs, ctx) {
  let s = "";
  const ids = /* @__PURE__ */ new Set();
  for (const r of runs) {
    s += runMd(r, ctx);
    for (const id of r.props.commentIds ?? [])
      ids.add(id);
  }
  for (const id of ids) {
    if (ctx.comments.has(id)) {
      ctx.usedComments.add(id);
      s += `[^c${id}]`;
    }
  }
  return s;
}
function cellText(cell, ctx) {
  const inner = cell.paragraphs.map((p) => inlineRuns(p.runs, ctx)).join("<br>");
  return inner.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function tableMd(t2, ctx) {
  const rows = t2.rows.map((r) => r.cells.map((c2) => cellText(c2, ctx)));
  if (!rows.length)
    return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const pad = (r) => {
    while (r.length < cols)
      r.push("");
    return r;
  };
  const header = pad(rows[0].slice());
  let md = `| ${header.join(" | ")} |
`;
  md += `| ${header.map(() => "---").join(" | ")} |
`;
  for (const r of rows.slice(1))
    md += `| ${pad(r.slice()).join(" | ")} |
`;
  return md;
}
function toMarkdown(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c2) => [c2.id, c2])),
    footnotes: doc.footnotes ?? /* @__PURE__ */ new Map(),
    endnotes: doc.endnotes ?? /* @__PURE__ */ new Map(),
    noteDefs: [],
    noteSeq: 0,
    usedComments: /* @__PURE__ */ new Set(),
    imagesMode: opts.images ?? "data",
    imageDataUris: doc.imageDataUris
  };
  const out = [];
  const title = opts.title ?? doc.title;
  if (title)
    out.push(`# ${title}
`);
  let inList = false;
  for (const b of orderedBlocks(doc)) {
    const isList = b.kind === "para" && !!b.p.props.numbering;
    if (inList && !isList)
      out.push("");
    inList = isList;
    if (b.kind === "table") {
      out.push(tableMd(b.t, ctx));
      continue;
    }
    const p = b.p;
    const inner = inlineRuns(p.runs, ctx);
    if (p.props.numbering) {
      const indent = "  ".repeat(p.props.numbering.ilvl);
      const marker = p.props.numbering.kind === "decimal" ? "1." : "-";
      out.push(`${indent}${marker} ${inner}`);
      continue;
    }
    const lvl = headingLevel(p);
    if (lvl)
      out.push(`${"#".repeat(lvl)} ${inner}
`);
    else if (inner.trim())
      out.push(`${inner}
`);
    else
      out.push("");
  }
  if (ctx.noteDefs.length)
    out.push("", ...ctx.noteDefs);
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    out.push("");
    for (const id of used) {
      const c2 = ctx.comments.get(id);
      out.push(`[^c${id}]: **${c2.author ?? "An\xF4nimo"}**: ${c2.text}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/docx/html.js
var HIGHLIGHTS = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
  white: "#ffffff"
};
function cssBorderStyle(s) {
  if (s === "dashed" || s === "dotted" || s === "double")
    return s;
  if (s === "none" || s === "nil")
    return "none";
  return "solid";
}
function edgeCss(e) {
  const w = Math.max(0.5, e.sizeEighthPt / 8);
  return `${w}pt ${cssBorderStyle(e.style)} ${e.color ? "#" + e.color : "#000"}`;
}
function runHtml(run, ctx) {
  if (run.image) {
    if (ctx.imagesMode === "omit") {
      return `<span class="wn-img-placeholder" aria-label="imagem" style="display:inline-block;padding:0 .35em;margin:0 .15em;background:rgba(0,0,0,.06);border-radius:4px;font-size:.9em;color:#777">\u{1F4F7}</span>`;
    }
    const w = twipsToPx(run.image.widthTwips);
    const h = twipsToPx(run.image.heightTwips);
    return `<img src="${resolveImageUri(run.image, ctx.imageDataUris)}" width="${w}" height="${h}" alt="" loading="lazy">`;
  }
  const p = run.props;
  if (run.noteRef) {
    const seq = ctx.notes.length + 1;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const noteHtml = paras?.map((np) => np.runs.map((r) => escapeHtml2(r.text)).join("")).join(" ").trim() ?? "";
    ctx.notes.push({ kind: run.noteRef.kind, id: run.noteRef.id, html: escapeHtml2(noteHtml) });
    return `<sup class="wn-note"><a id="noteref-${seq}" href="#note-${seq}">${seq}</a></sup>`;
  }
  let text2 = escapeHtml2(run.text);
  if (!text2)
    return "";
  const styles = [];
  if (p.color)
    styles.push(`color:#${p.color}`);
  if (p.szHalfPt)
    styles.push(`font-size:${halfPtToPt(p.szHalfPt)}pt`);
  if (p.highlight)
    styles.push(`background-color:${HIGHLIGHTS[p.highlight] ?? p.highlight}`);
  if (p.fontAscii)
    styles.push(`font-family:'${p.fontAscii}',serif`);
  if (p.allCaps)
    styles.push("text-transform:uppercase");
  if (p.smallCaps)
    styles.push("font-variant:small-caps");
  if (p.charSpacingTwips)
    styles.push(`letter-spacing:${twipsToPt(p.charSpacingTwips)}pt`);
  let inner = text2;
  if (p.bold)
    inner = `<strong>${inner}</strong>`;
  if (p.italic)
    inner = `<em>${inner}</em>`;
  if (p.strike || p.doubleStrike)
    inner = `<s>${inner}</s>`;
  if (p.underline)
    inner = `<u>${inner}</u>`;
  if (p.vertAlign === "superscript")
    inner = `<sup>${inner}</sup>`;
  else if (p.vertAlign === "subscript")
    inner = `<sub>${inner}</sub>`;
  if (styles.length)
    inner = `<span style="${styles.join(";")}">${inner}</span>`;
  if (p.link)
    inner = `<a href="${escapeAttr(p.link)}">${inner}</a>`;
  if (p.commentIds?.length) {
    for (const id of p.commentIds)
      ctx.usedComments.add(id);
    const tips = p.commentIds.map((id) => {
      const c2 = ctx.comments.get(id);
      return c2 ? `${c2.author ?? "An\xF4nimo"}: ${c2.text}` : "";
    }).filter(Boolean).join(" | ");
    inner = `<span class="wn-comment" data-comment="${p.commentIds.join(",")}" title="${escapeAttr(tips)}">${inner}</span>`;
  }
  return inner;
}
function paraStyles(p) {
  const s = [];
  const a = p.props.alignment;
  if (a === "center")
    s.push("text-align:center");
  else if (a === "right")
    s.push("text-align:right");
  else if (a === "both")
    s.push("text-align:justify");
  if (p.props.indentLeftTwips)
    s.push(`margin-left:${twipsToPt(p.props.indentLeftTwips)}pt`);
  if (p.props.indentRightTwips)
    s.push(`margin-right:${twipsToPt(p.props.indentRightTwips)}pt`);
  if (p.props.indentFirstLineTwips)
    s.push(`text-indent:${twipsToPt(p.props.indentFirstLineTwips)}pt`);
  if (p.props.shadingHex)
    s.push(`background-color:#${p.props.shadingHex}`);
  const b = p.props.borders;
  if (b) {
    if (b.top)
      s.push(`border-top:${edgeCss(b.top)}`);
    if (b.bottom)
      s.push(`border-bottom:${edgeCss(b.bottom)}`);
    if (b.left)
      s.push(`border-left:${edgeCss(b.left)}`);
    if (b.right)
      s.push(`border-right:${edgeCss(b.right)}`);
  }
  return s.join(";");
}
function paraInner(p, ctx) {
  const html = p.runs.map((r) => runHtml(r, ctx)).join("");
  return html || "<br>";
}
function paraHtml(p, ctx) {
  const inner = paraInner(p, ctx);
  const st = paraStyles(p);
  const attr = st ? ` style="${st}"` : "";
  const lvl = headingLevel(p);
  if (lvl)
    return `<h${lvl}${attr}>${inner}</h${lvl}>`;
  return `<p${attr}>${inner}</p>`;
}
function tableHtml(t2, ctx) {
  let html = "<table>";
  for (const row of t2.rows) {
    html += "<tr>";
    for (const cell of row.cells) {
      const span = cell.gridSpan > 1 ? ` colspan="${cell.gridSpan}"` : "";
      const style = cell.shadingHex ? ` style="background-color:#${cell.shadingHex}"` : "";
      let inner = cell.paragraphs.map((p) => paraHtml(p, ctx)).join("");
      for (const nt of cell.tables)
        inner += tableHtml(nt, ctx);
      html += `<td${span}${style}>${inner}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}
function listHtml(items) {
  let i2 = 0;
  function build2(level) {
    const tag = items[i2].kind === "decimal" ? "ol" : "ul";
    let html = `<${tag}>`;
    while (i2 < items.length && items[i2].ilvl >= level) {
      if (items[i2].ilvl > level)
        break;
      let li = `<li>${items[i2].inner}`;
      i2++;
      if (i2 < items.length && items[i2].ilvl > level)
        li += build2(items[i2].ilvl);
      html += li + "</li>";
    }
    return html + `</${tag}>`;
  }
  return items.length ? build2(items[0].ilvl) : "";
}
function bodyHtml(doc, ctx) {
  const blocks = orderedBlocks(doc);
  const parts = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      parts.push(listHtml(listBuf));
      listBuf = [];
    }
  };
  for (const b of blocks) {
    if (b.kind === "para" && b.p.props.numbering) {
      listBuf.push({
        ilvl: b.p.props.numbering.ilvl,
        kind: b.p.props.numbering.kind,
        inner: paraInner(b.p, ctx)
      });
      continue;
    }
    flushList();
    if (b.kind === "para")
      parts.push(paraHtml(b.p, ctx));
    else
      parts.push(tableHtml(b.t, ctx));
  }
  flushList();
  if (ctx.notes.length) {
    parts.push('<hr><section class="wn-notes"><ol>');
    ctx.notes.forEach((n, idx) => {
      parts.push(`<li id="note-${idx + 1}">${n.html} <a href="#noteref-${idx + 1}">\u21A9</a></li>`);
    });
    parts.push("</ol></section>");
  }
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    parts.push('<section class="wn-comments"><h2>Coment\xE1rios</h2><ol>');
    for (const id of used) {
      const c2 = ctx.comments.get(id);
      parts.push(`<li id="cmt-${id}"><span class="wn-author">${escapeHtml2(c2.author ?? "An\xF4nimo")}</span>: ${escapeHtml2(c2.text)}</li>`);
    }
    parts.push("</ol></section>");
  }
  return parts.join("\n");
}
var STYLE = `
:root { color-scheme: light; }
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55;
  max-width: 46rem; margin: 2.5rem auto; padding: 0 1.25rem; color: #1a1a1a;
  background: #ffffff; }
h1,h2,h3,h4,h5,h6 { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.25; margin: 1.6em 0 .5em; }
h1 { font-size: 2rem; } h2 { font-size: 1.6rem; } h3 { font-size: 1.3rem; }
p { margin: 0 0 .75em; }
a { color: #1a73e8; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; margin: 1em 0; width: 100%; }
td, th { border: 1px solid #bbb; padding: .4em .6em; vertical-align: top; }
ul, ol { margin: 0 0 .75em; padding-left: 1.6em; }
sup.wn-note a { text-decoration: none; }
.wn-comment { background: rgba(255,187,0,.28); border-bottom: 1px dotted #c79100; cursor: help; }
.wn-img-placeholder { display: inline-block; padding: 0 .35em; margin: 0 .15em; background: rgba(0,0,0,.06); border-radius: 4px; font-size: .9em; color: #777; }
.wn-comments { margin-top: 2.5rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: .9rem; color: #555; }
.wn-comments .wn-author { font-weight: 600; }
.wn-notes { font-size: .85rem; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0 .5rem; }
`;
function toHtml(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c2) => [c2.id, c2])),
    usedComments: /* @__PURE__ */ new Set(),
    notes: [],
    footnotes: doc.footnotes ?? /* @__PURE__ */ new Map(),
    endnotes: doc.endnotes ?? /* @__PURE__ */ new Map(),
    imagesMode: opts.images ?? "data",
    imageDataUris: doc.imageDataUris
  };
  const body = bodyHtml(doc, ctx);
  if (opts.fullDocument === false)
    return body;
  const title = escapeHtml2(opts.title ?? doc.title ?? "Documento");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/docx/from-docx.js
function exportDocFromFullDocument(full) {
  const paragraphs = [];
  const tableAnchors = [];
  for (const b of full.blocks) {
    if (b.type === "paragraph")
      paragraphs.push(b.paragraph);
    else
      tableAnchors.push({ beforePara: paragraphs.length, table: b });
  }
  return {
    paragraphs,
    tableAnchors,
    comments: full.comments,
    footnotes: full.footnotes,
    endnotes: full.endnotes,
    sectPr: full.sections[0]?.sectPr
  };
}
function docxToMarkdown(bytes, opts = {}) {
  const pkg = DocxPackage.load(bytes);
  return toMarkdown(exportDocFromFullDocument(readFullDocument(pkg)), opts);
}
function docxToHtml(bytes, opts = {}) {
  const pkg = DocxPackage.load(bytes);
  return toHtml(exportDocFromFullDocument(readFullDocument(pkg)), opts);
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf-writer/bytes.js
var ByteBuilder = class {
  chunks = [];
  len = 0;
  /** Comprimento atual em bytes (offset corrente). */
  get length() {
    return this.len;
  }
  /** Anexa uma string como latin1 (1 byte por code unit; só use ASCII/latin1). */
  str(s) {
    const n = s.length;
    const out = new Uint8Array(n);
    for (let i2 = 0; i2 < n; i2++)
      out[i2] = s.charCodeAt(i2) & 255;
    return this.bytes(out);
  }
  /** Anexa bytes crus. */
  bytes(b) {
    this.chunks.push(b);
    this.len += b.length;
    return this;
  }
  /** Concatena tudo num único Uint8Array. */
  toUint8Array() {
    const out = new Uint8Array(this.len);
    let off = 0;
    for (const c2 of this.chunks) {
      out.set(c2, off);
      off += c2.length;
    }
    return out;
  }
};
function utf16beHex(s) {
  let out = "";
  for (let i2 = 0; i2 < s.length; i2++) {
    const c2 = s.charCodeAt(i2);
    out += (c2 >> 8 & 255).toString(16).padStart(2, "0");
    out += (c2 & 255).toString(16).padStart(2, "0");
  }
  return out;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf-writer/writer.js
var PdfWriter = class {
  /** Corpo serializado de cada objeto (índice 0 = objeto 1). null = ainda não definido. */
  bodies = [];
  compress;
  constructor(opts = {}) {
    this.compress = opts.compress ?? true;
  }
  /** Reserva um número de objeto (1-based) para referência antecipada. */
  alloc() {
    this.bodies.push(null);
    return this.bodies.length;
  }
  /** Define o corpo de um objeto já alocado (entre `obj`/`endobj`). */
  define(num, body) {
    this.bodies[num - 1] = typeof body === "string" ? new ByteBuilder().str(body).toUint8Array() : body;
  }
  /** Atalho: aloca e define um dicionário a partir de uma string `<< ... >>`. */
  addDict(dict) {
    const n = this.alloc();
    this.define(n, dict);
    return n;
  }
  /**
   * Aloca e define um objeto stream. `dict` são as entradas extras do dicionário
   * (sem `/Length`, sem `<<`/`>>`). Comprime com FlateDecode quando habilitado e
   * vantajoso. Retorna o número do objeto.
   */
  addStream(dict, data, opts = {}) {
    const n = this.alloc();
    this.defineStream(n, dict, data, opts);
    return n;
  }
  defineStream(num, dict, data, opts = {}) {
    let payload = data;
    let filter = "";
    if (this.compress && (opts.allowCompress ?? true) && data.length > 64) {
      const z = zlibSync(data);
      if (z.length < data.length) {
        payload = z;
        filter = " /Filter /FlateDecode";
      }
    }
    const head = `<< ${dict.trim()}${filter} /Length ${payload.length} >>
stream
`;
    const b = new ByteBuilder();
    b.str(head).bytes(payload).str("\nendstream");
    this.define(num, b.toUint8Array());
  }
  /** Monta o arquivo PDF completo, com xref clássico e trailer. `root` = obj do /Catalog. */
  build(root) {
    const out = new ByteBuilder();
    out.str("%PDF-1.7\n");
    out.bytes(new Uint8Array([37, 226, 227, 207, 211])).str("\n");
    const offsets = new Array(this.bodies.length).fill(0);
    for (let i2 = 0; i2 < this.bodies.length; i2++) {
      const body = this.bodies[i2];
      if (!body)
        throw new Error(`Objeto PDF ${i2 + 1} alocado mas n\xE3o definido`);
      offsets[i2] = out.length;
      out.str(`${i2 + 1} 0 obj
`).bytes(body).str("\nendobj\n");
    }
    const xrefOffset = out.length;
    const count = this.bodies.length + 1;
    out.str(`xref
0 ${count}
`);
    out.str("0000000000 65535 f \n");
    for (let i2 = 0; i2 < this.bodies.length; i2++) {
      out.str(`${String(offsets[i2]).padStart(10, "0")} 00000 n 
`);
    }
    out.str("trailer\n");
    out.str(`<< /Size ${count} /Root ${root} 0 R >>
`);
    out.str(`startxref
${xrefOffset}
%%EOF
`);
    return out.toUint8Array();
  }
};

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf-writer/subset.js
var KEEP = /* @__PURE__ */ new Set(["head", "hhea", "maxp", "hmtx", "cmap", "loca", "glyf", "OS/2", "post", "cvt ", "fpgm", "prep", "gasp", "name"]);
function subsetTrueType(bytes, usedGids) {
  try {
    return doSubset(bytes, usedGids);
  } catch {
    return bytes;
  }
}
function doSubset(bytes, usedGids) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = v.getUint32(0);
  const numTables = v.getUint16(4);
  const dir = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < numTables; i2++) {
    const p = 12 + i2 * 16;
    const tag = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
    dir.set(tag, { tag, offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
  }
  const head = dir.get("head"), maxp = dir.get("maxp"), loca = dir.get("loca"), glyf = dir.get("glyf");
  if (!head || !maxp || !loca || !glyf)
    return bytes;
  const numGlyphs = v.getUint16(maxp.offset + 4);
  const longLoca = v.getUint16(head.offset + 50) === 1;
  const readLoca = (i2) => longLoca ? v.getUint32(loca.offset + i2 * 4) : v.getUint16(loca.offset + i2 * 2) * 2;
  const glyphOff = [];
  for (let i2 = 0; i2 <= numGlyphs; i2++)
    glyphOff.push(readLoca(i2));
  const keep2 = /* @__PURE__ */ new Set([0]);
  for (const g of usedGids)
    if (g >= 0 && g < numGlyphs)
      keep2.add(g);
  const work = [...keep2];
  while (work.length) {
    const g = work.pop();
    const s = glyf.offset + glyphOff[g], e = glyf.offset + glyphOff[g + 1];
    if (e <= s)
      continue;
    if (v.getInt16(s) >= 0)
      continue;
    let p = s + 10;
    for (; ; ) {
      const flags = v.getUint16(p);
      const comp = v.getUint16(p + 2);
      p += 4;
      if (!keep2.has(comp)) {
        keep2.add(comp);
        work.push(comp);
      }
      p += flags & 1 ? 4 : 2;
      if (flags & 8)
        p += 2;
      else if (flags & 64)
        p += 4;
      else if (flags & 128)
        p += 8;
      if (!(flags & 32))
        break;
    }
  }
  const glyfParts = [];
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const locaView = new DataView(newLoca.buffer);
  let acc = 0;
  for (let g = 0; g < numGlyphs; g++) {
    locaView.setUint32(g * 4, acc);
    if (keep2.has(g)) {
      const s = glyf.offset + glyphOff[g], e = glyf.offset + glyphOff[g + 1];
      let len = e - s;
      if (len > 0) {
        const padded = len + 1 & ~1;
        const part = new Uint8Array(padded);
        part.set(bytes.subarray(s, e));
        glyfParts.push(part);
        acc += padded;
      }
    }
  }
  locaView.setUint32(numGlyphs * 4, acc);
  const newGlyf = concat(glyfParts);
  const newHead = new Uint8Array(head.length);
  newHead.set(bytes.subarray(head.offset, head.offset + head.length));
  const headView = new DataView(newHead.buffer, newHead.byteOffset, newHead.byteLength);
  headView.setUint16(50, 1);
  headView.setUint32(8, 0);
  const out = [];
  for (const [tag, t2] of dir) {
    if (!KEEP.has(tag))
      continue;
    if (tag === "glyf")
      out.push({ tag, data: newGlyf });
    else if (tag === "loca")
      out.push({ tag, data: newLoca });
    else if (tag === "head")
      out.push({ tag, data: newHead });
    else
      out.push({ tag, data: bytes.slice(t2.offset, t2.offset + t2.length) });
  }
  return buildSfnt(sfntVersion, out);
}
function concat(parts) {
  let n = 0;
  for (const p of parts)
    n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
function checksum(buf, off, len) {
  const dv = new DataView(buf.buffer, buf.byteOffset);
  let sum = 0;
  const end = off + (len + 3 & ~3);
  for (let i2 = off; i2 < end; i2 += 4)
    sum = sum + dv.getUint32(i2) >>> 0;
  return sum >>> 0;
}
function buildSfnt(sfntVersion, tables) {
  tables.sort((a, b) => a.tag < b.tag ? -1 : 1);
  const num = tables.length;
  const headerSize = 12 + num * 16;
  let offset = headerSize;
  const layout = tables.map((t2) => {
    const o = offset;
    offset += t2.data.length + 3 & ~3;
    return { ...t2, offset: o };
  });
  const out = new Uint8Array(offset);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, sfntVersion);
  dv.setUint16(4, num);
  const maxPow = Math.floor(Math.log2(num));
  const searchRange = 2 ** maxPow * 16;
  dv.setUint16(6, searchRange);
  dv.setUint16(8, maxPow);
  dv.setUint16(10, num * 16 - searchRange);
  let p = 12;
  for (const t2 of layout) {
    out.set(t2.data, t2.offset);
    for (let i2 = 0; i2 < 4; i2++)
      out[p + i2] = t2.tag.charCodeAt(i2) || 32;
    dv.setUint32(p + 4, checksum(out, t2.offset, t2.data.length));
    dv.setUint32(p + 8, t2.offset);
    dv.setUint32(p + 12, t2.data.length);
    p += 16;
  }
  const headEntry = layout.find((t2) => t2.tag === "head");
  if (headEntry) {
    const fileCs = checksum(out, 0, out.length);
    dv.setUint32(headEntry.offset + 8, 2981146554 - fileCs >>> 0);
  }
  return out;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf-writer/font.js
var EmbeddedFont = class {
  index;
  baseName;
  bytes;
  program;
  /** Recurso usado no content stream (ex.: "F0"). */
  resourceName;
  used = /* @__PURE__ */ new Map();
  // gid -> codePoint (para ToUnicode)
  scale;
  constructor(index, baseName, bytes, program) {
    this.index = index;
    this.baseName = baseName;
    this.bytes = bytes;
    this.program = program;
    this.resourceName = `F${index}`;
    this.scale = 1e3 / program.unitsPerEm;
  }
  /** Mapeia um code point para (gid, advance em unidades de fonte) e registra uso. */
  encode(codePoint) {
    const gid = this.program.glyphId(codePoint);
    if (!this.used.has(gid))
      this.used.set(gid, codePoint);
    return { gid, advanceWidth: this.program.advanceWidth(gid) };
  }
  /** Largura em milésimos de em (espaço de texto do PDF) de um glifo. */
  widthThousandths(gid) {
    return Math.round(this.program.advanceWidth(gid) * this.scale);
  }
  psName() {
    return this.baseName.replace(/[^A-Za-z0-9+\-]/g, "");
  }
  /** Emite o grafo de objetos da fonte e retorna o número do objeto Type0. */
  write(w) {
    const name = this.psName();
    const um = this.program.unitsPerEm;
    const asc = Math.round((this.program.ascender ?? um * 0.8) * this.scale);
    const desc = Math.round((this.program.descender ?? -um * 0.2) * this.scale);
    const bbox = this.program.fontBBox ? this.program.fontBBox.map((v) => Math.round(v * this.scale)) : [-200, desc, 1200, asc];
    const italic = this.program.italicAngle ?? 0;
    const flags = 32 | (italic !== 0 ? 64 : 0);
    const gids = [...this.used.keys()].sort((a, b) => a - b);
    const subset = subsetTrueType(this.bytes, gids);
    const fontFile = w.addStream(`/Length1 ${subset.length}`, subset);
    const descriptor = w.addDict(`<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${bbox.join(" ")}] /ItalicAngle ${italic} /Ascent ${asc} /Descent ${desc} /CapHeight ${asc} /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
    const wParts = [];
    for (const gid of gids)
      wParts.push(`${gid} [${this.widthThousandths(gid)}]`);
    const cidFont = w.addDict(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${wParts.join(" ")}] >>`);
    const toUnicode = w.addStream("", this.buildToUnicode(gids));
    return w.addDict(`<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`);
  }
  /** CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode. */
  buildToUnicode(gids) {
    const b = new ByteBuilder();
    b.str("/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n");
    for (let i2 = 0; i2 < gids.length; i2 += 100) {
      const chunk = gids.slice(i2, i2 + 100);
      b.str(`${chunk.length} beginbfchar
`);
      for (const gid of chunk) {
        const cp = this.used.get(gid);
        b.str(`<${gid.toString(16).padStart(4, "0")}> <${utf16beHex(String.fromCodePoint(cp))}>
`);
      }
      b.str("endbfchar\n");
    }
    b.str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    return b.toUint8Array();
  }
};

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf-writer/document.js
function rgb255(r, g, b) {
  return [r / 255, g / 255, b / 255];
}
function hexColor(hex2) {
  const h = hex2.replace("#", "");
  return rgb255(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}
var fmt = (n) => {
  const r = Math.round(n * 1e3) / 1e3;
  return Object.is(r, -0) ? "0" : String(r);
};
var PdfPage = class {
  widthPt;
  heightPt;
  /** @internal */
  content = new ByteBuilder();
  constructor(widthPt, heightPt) {
    this.widthPt = widthPt;
    this.heightPt = heightPt;
  }
  fromTop(yTop) {
    return this.heightPt - yTop;
  }
  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt, yTopPt, wPt, hPt, color) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg
${fmt(xPt)} ${fmt(y)} ${fmt(wPt)} ${fmt(hPt)} re f
`);
  }
  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(x0, y0Top, x1, y1Top, color, widthPt, dash) {
    const d = dash && dash.length ? `[${dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    this.content.str(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG
${fmt(widthPt)} w
${d}${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S
`);
  }
  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(font, sizePt, color, glyphs) {
    if (!glyphs.length)
      return;
    const c2 = this.content;
    c2.str(`BT
/${font.resourceName} ${fmt(sizePt)} Tf
${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg
`);
    for (const g of glyphs) {
      const y = this.fromTop(g.baselineFromTopPt);
      c2.str(`1 0 0 1 ${fmt(g.xPt)} ${fmt(y)} Tm <${g.gid.toString(16).padStart(4, "0")}> Tj
`);
    }
    c2.str("ET\n");
  }
  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img, xPt, yTopPt, wPt, hPt) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(`q
${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y)} cm
/${img.resourceName} Do
Q
`);
  }
};
var PdfDocument = class {
  writer;
  fonts = [];
  images = [];
  pages = [];
  constructor(opts = {}) {
    this.writer = new PdfWriter({ compress: opts.compress });
  }
  /** Embute uma fonte TrueType (bytes crus + consultas de métrica). */
  embedFont(name, bytes, program) {
    const f = new EmbeddedFont(this.fonts.length, name, bytes, program);
    this.fonts.push(f);
    return f;
  }
  /** Embute um JPEG (baseline) diretamente via DCTDecode. */
  embedJpeg(bytes, widthPx, heightPx) {
    const objNum = this.writer.addStream(`/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, bytes, { allowCompress: false });
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  /**
   * Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
   * trivial (algum pixel < 255), o canal vira um /SMask DeviceGray — PNGs com
   * transparência preservam o recorte no PDF.
   */
  embedRgba(rgba, widthPx, heightPx) {
    const rgb2 = new Uint8Array(widthPx * heightPx * 3);
    const alpha = new Uint8Array(widthPx * heightPx);
    let hasAlpha = false;
    for (let i2 = 0, j = 0, k = 0; i2 < rgba.length; i2 += 4, j += 3, k++) {
      rgb2[j] = rgba[i2];
      rgb2[j + 1] = rgba[i2 + 1];
      rgb2[j + 2] = rgba[i2 + 2];
      const a = rgba[i2 + 3];
      alpha[k] = a;
      if (a !== 255)
        hasAlpha = true;
    }
    let smask = "";
    if (hasAlpha) {
      const smaskNum = this.writer.addStream(`/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceGray /BitsPerComponent 8`, alpha);
      smask = ` /SMask ${smaskNum} 0 R`;
    }
    const objNum = this.writer.addStream(`/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`, rgb2);
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  addPage(widthPt, heightPt) {
    const p = new PdfPage(widthPt, heightPt);
    this.pages.push(p);
    return p;
  }
  /** Serializa o PDF completo. */
  build() {
    const w = this.writer;
    const fontRefs = this.fonts.map((f) => ({ name: f.resourceName, ref: f.write(w) }));
    const fontDict = fontRefs.length ? `/Font << ${fontRefs.map((f) => `/${f.name} ${f.ref} 0 R`).join(" ")} >>` : "";
    const xobjDict = this.images.length ? `/XObject << ${this.images.map((i2) => `/${i2.handle.resourceName} ${i2.objNum} 0 R`).join(" ")} >>` : "";
    const resources = `<< ${fontDict} ${xobjDict} >>`;
    const catalog = w.alloc();
    const pagesNode = w.alloc();
    const pageRefs = [];
    for (const page of this.pages) {
      const contentNum = w.addStream("", page.content.toUint8Array());
      const pageNum = w.addDict(`<< /Type /Page /Parent ${pagesNode} 0 R /MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] /Resources ${resources} /Contents ${contentNum} 0 R >>`);
      pageRefs.push(pageNum);
    }
    w.define(pagesNode, `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] >>`);
    w.define(catalog, `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w.build(catalog);
  }
};

// ../../../../../../vendor/office-converter/packages/office-converter/dist/xlsx/sfnt.js
var TtfProgram = class {
  unitsPerEm;
  ascender;
  descender;
  // negativo
  fontBBox;
  italicAngle;
  view;
  numberOfHMetrics;
  hmtxOffset;
  cmapRanges = [];
  advanceCache = /* @__PURE__ */ new Map();
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const tables = /* @__PURE__ */ new Map();
    const numTables = v.getUint16(4);
    for (let i2 = 0; i2 < numTables; i2++) {
      const p = 12 + i2 * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      tables.set(tag, v.getUint32(p + 8));
    }
    const req = (tag) => {
      const off = tables.get(tag);
      if (off === void 0)
        throw new Error(`Fonte TTF sem a tabela ${tag}`);
      return off;
    };
    const head = req("head");
    const hhea = req("hhea");
    this.unitsPerEm = v.getUint16(head + 18);
    this.fontBBox = [v.getInt16(head + 36), v.getInt16(head + 38), v.getInt16(head + 40), v.getInt16(head + 42)];
    this.ascender = v.getInt16(hhea + 4);
    this.descender = v.getInt16(hhea + 6);
    this.numberOfHMetrics = v.getUint16(hhea + 34);
    this.hmtxOffset = req("hmtx");
    const post = tables.get("post");
    this.italicAngle = post !== void 0 ? v.getInt32(post + 4) / 65536 : 0;
    this.parseCmap(req("cmap"));
  }
  parseCmap(cmap) {
    const v = this.view;
    const n = v.getUint16(cmap + 2);
    let best = -1;
    let bestScore = -1;
    for (let i2 = 0; i2 < n; i2++) {
      const p = cmap + 4 + i2 * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      const score = platform === 3 && encoding === 10 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = cmap + offset;
      }
    }
    if (best < 0)
      throw new Error("Fonte TTF: cmap sem subtabela utiliz\xE1vel");
    const format = v.getUint16(best);
    if (format === 4) {
      const segCount = v.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = v.getUint16(endP + s * 2);
        const start = v.getUint16(startP + s * 2);
        const delta = v.getInt16(deltaP + s * 2);
        const rangeOffset = v.getUint16(rangeP + s * 2);
        const idP = rangeP + s * 2;
        this.cmapRanges.push({
          start,
          end,
          mapper: rangeOffset === 0 ? (c2) => c2 + delta & 65535 : (c2) => {
            const g = v.getUint16(idP + rangeOffset + (c2 - start) * 2);
            return g === 0 ? 0 : g + delta & 65535;
          }
        });
      }
    } else if (format === 12) {
      const nGroups = v.getUint32(best + 12);
      for (let g = 0; g < nGroups; g++) {
        const p = best + 16 + g * 12;
        const start = v.getUint32(p);
        const end = v.getUint32(p + 4);
        const startGlyph = v.getUint32(p + 8);
        this.cmapRanges.push({ start, end, mapper: (c2) => startGlyph + (c2 - start) });
      }
    } else {
      throw new Error(`Fonte TTF: cmap format ${format} n\xE3o suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }
  /** glyph id de um code point (0 = .notdef). */
  glyphId(codePoint) {
    let lo = 0;
    let hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const r = this.cmapRanges[mid];
      if (codePoint < r.start)
        hi = mid - 1;
      else if (codePoint > r.end)
        lo = mid + 1;
      else
        return r.mapper(codePoint);
    }
    return 0;
  }
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId) {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== void 0)
      return cached;
    const i2 = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i2 * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }
};

// ../../../../../../vendor/office-converter/packages/office-converter/dist/docx/pdf.js
function textWidth(text2, font, size) {
  let units = 0;
  for (const char of text2)
    units += font.advanceWidth(font.glyphId(char.codePointAt(0)));
  return units * size / font.unitsPerEm;
}
function wrap(text2, width, font, size) {
  const words = text2.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, font, size) > width) {
      lines.push(line);
      line = word;
    } else
      line = candidate;
  }
  if (line)
    lines.push(line);
  return lines.length ? lines : [""];
}
function docxToPdf(bytes, options = {}) {
  const source = options.fonts?.[0];
  if (!source)
    throw new Error("docxToPdf: options.fonts must contain at least one TrueType font");
  const program = new TtfProgram(source.bytes);
  const pdf = new PdfDocument();
  const embedded = pdf.embedFont(source.name ?? "DocumentFont", source.bytes, program);
  const margin = options.marginPt ?? 54;
  const pageWidth = 595.276;
  const pageHeight = 841.89;
  let page = pdf.addPage(pageWidth, pageHeight);
  let y = margin;
  const draw = (text2, size, gapAfter = 6) => {
    for (const line of wrap(text2, pageWidth - margin * 2, program, size)) {
      if (y + size * 1.4 > pageHeight - margin) {
        page = pdf.addPage(pageWidth, pageHeight);
        y = margin;
      }
      const glyphs = [];
      let x2 = margin;
      for (const char of line) {
        const codePoint = char.codePointAt(0);
        const gid = program.glyphId(codePoint);
        glyphs.push({ gid, codePoint, xPt: x2, baselineFromTopPt: y + size });
        x2 += program.advanceWidth(gid) * size / program.unitsPerEm;
      }
      page.glyphs(embedded, size, [0, 0, 0], glyphs);
      y += size * 1.35;
    }
    y += gapAfter;
  };
  const doc = exportDocFromFullDocument(readFullDocument(DocxPackage.load(bytes)));
  for (const block of orderedBlocks(doc)) {
    if (block.kind === "table") {
      for (const row of block.t.rows) {
        draw(row.cells.map((cell) => cell.paragraphs.flatMap((p) => p.runs).map((run) => run.text).join(" ")).join(" | "), 9, 2);
      }
      y += 5;
    } else {
      const text2 = block.p.runs.map((run) => run.text || (run.image ? "[image]" : "")).join("").trim();
      if (!text2) {
        y += 6;
        continue;
      }
      const level = headingLevel(block.p);
      draw(text2, level ? Math.max(14, 24 - level * 2) : 11, level ? 9 : 5);
    }
  }
  return pdf.build();
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/package.js
var XlsxPackage = class _XlsxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  /** Pacote OPC mínimo para workbooks novos. */
  static empty() {
    const enc = new TextEncoder();
    const parts = /* @__PURE__ */ new Map();
    parts.set("[Content_Types].xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'));
    parts.set("_rels/.rels", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'));
    parts.set("xl/workbook.xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'));
    parts.set("xl/_rels/workbook.xml.rels", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'));
    parts.set("xl/worksheets/sheet1.xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'));
    parts.set("xl/styles.xml", enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'));
    return new _XlsxPackage(parts);
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote OOXML v\xE1lido (ZIP corrompido ou formato legado .xls/.xlsb)");
    }
    const pkg = new _XlsxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("xl/workbook.xml")) {
      throw new Error("Pacote sem xl/workbook.xml \u2014 n\xE3o \xE9 uma pasta de trabalho do app de refer\xEAncia");
    }
    return pkg;
  }
  save() {
    const zippable = {};
    for (const [path, data] of this.parts)
      zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }
  partNames() {
    return [...this.parts.keys()];
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  setPart(path, data) {
    this.parts.set(path, data);
  }
  setPartText(path, text2) {
    this.parts.set(path, new TextEncoder().encode(text2));
  }
  /** Conteúdo principal (xl/workbook.xml). */
  workbookXml() {
    const xml = this.getPartText("xl/workbook.xml");
    if (xml === void 0)
      throw new Error("Pacote sem xl/workbook.xml");
    return xml;
  }
  /**
   * Resolve o caminho de uma parte alvo a partir de um relacionamento.
   * Relativos ao diretório do .rels (ex.: workbook.xml.rels está em xl/_rels/,
   * target "worksheets/sheet1.xml" → "xl/worksheets/sheet1.xml").
   */
  resolveRelTarget(fromPart, target) {
    if (target.startsWith("/"))
      return target.slice(1);
    let dir = fromPart.includes("/") ? fromPart.slice(0, fromPart.lastIndexOf("/")) : "";
    let t2 = target;
    while (t2.startsWith("../")) {
      t2 = t2.slice(3);
      dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
    }
    return dir ? `${dir}/${t2}` : t2;
  }
};

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/model.js
var COL_RE = /([A-Z]+)(\d+)/;
function refToRowCol(ref) {
  const m = COL_RE.exec(ref);
  if (!m)
    throw new Error(`Refer\xEAncia de c\xE9lula inv\xE1lida: ${ref}`);
  const col = m[1].split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
  return { col, row: parseInt(m[2], 10) };
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/xml.js
var ENTITIES2 = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
function decodeEntities2(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e) => {
    if (e.startsWith("#x") || e.startsWith("#X"))
      return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#"))
      return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITIES2[e] ?? `&${e};`;
  });
}
function parseXml2(xml) {
  let i2 = 0;
  const n = xml.length;
  function error(msg) {
    throw new Error(`XML inv\xE1lido @${i2}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml.startsWith("<?", i2)) {
        i2 = xml.indexOf("?>", i2);
        if (i2 < 0)
          error("?> n\xE3o fechado");
        i2 += 2;
      } else if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2);
        if (i2 < 0)
          error("--> n\xE3o fechado");
        i2 += 3;
      } else if (xml.startsWith("<!", i2)) {
        i2 = xml.indexOf(">", i2);
        if (i2 < 0)
          error("<! n\xE3o fechado");
        i2 += 1;
      } else
        break;
    }
  }
  function parseElement() {
    if (xml[i2] !== "<")
      error("esperava <");
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2]))
      i2++;
    const name = xml.slice(nameStart, i2);
    const attrs = {};
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">")
          error("esperava />");
        i2 += 2;
        return { name, attrs, children: [] };
      }
      if (xml[i2] === ">") {
        i2++;
        break;
      }
      const aStart = i2;
      while (i2 < n && xml[i2] !== "=" && !/\s/.test(xml[i2]))
        i2++;
      const aName = xml.slice(aStart, i2);
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] !== "=")
        error(`atributo ${aName} sem =`);
      i2++;
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      const q = xml[i2];
      if (q !== '"' && q !== "'")
        error("valor de atributo sem aspas");
      i2++;
      const vStart = i2;
      i2 = xml.indexOf(q, i2);
      if (i2 < 0)
        error("aspas n\xE3o fechadas");
      attrs[aName] = decodeEntities2(xml.slice(vStart, i2));
      i2++;
    }
    const children = [];
    for (; ; ) {
      if (i2 >= n)
        error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        const close = xml.indexOf(">", i2);
        i2 = close + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i2)) {
        const end = xml.indexOf("]]>", i2);
        children.push(xml.slice(i2 + 9, end));
        i2 = end + 3;
        continue;
      }
      if (xml[i2] === "<") {
        children.push(parseElement());
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<")
        i2++;
      const text2 = decodeEntities2(xml.slice(tStart, i2));
      if (text2.length > 0)
        children.push(text2);
    }
  }
  skipMisc();
  const root = parseElement();
  return root;
}
function childElements2(el, name) {
  return el.children.filter((c2) => typeof c2 !== "string" && (name === void 0 || c2.name === name));
}
function firstChild2(el, name) {
  return childElements2(el, name)[0];
}
function textContent(el) {
  let out = "";
  for (const c2 of el.children) {
    out += typeof c2 === "string" ? c2 : textContent(c2);
  }
  return out;
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/theme.js
var DEFAULT_THEME_COLORS = [
  "#FFFFFF",
  // 0 lt1 (background1)
  "#000000",
  // 1 dk1 (text1)
  "#E7E6E6",
  // 2 lt2
  "#44546A",
  // 3 dk2
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  // 4-9 accent1-6
  "#0563C1",
  // 10 hyperlink
  "#954F72"
  // 11 followedHyperlink
];
var SLOT_TO_INDEX = {
  lt1: 0,
  dk1: 1,
  lt2: 2,
  dk2: 3,
  accent1: 4,
  accent2: 5,
  accent3: 6,
  accent4: 7,
  accent5: 8,
  accent6: 9,
  hlink: 10,
  folHlink: 11
};
function defaultTheme() {
  const colors = [...DEFAULT_THEME_COLORS];
  const byName = {};
  for (const [slot, idx] of Object.entries(SLOT_TO_INDEX))
    byName[slot] = colors[idx];
  return { colors, byName };
}
function schemeSlotColor(slot) {
  for (const c2 of childElements2(slot)) {
    if (c2.name === "a:srgbClr")
      return "#" + (c2.attrs["val"] ?? "000000").slice(-6).toUpperCase();
    if (c2.name === "a:sysClr") {
      const last = c2.attrs["lastClr"];
      if (last !== void 0)
        return "#" + last.slice(-6).toUpperCase();
      return c2.attrs["val"] === "window" ? "#FFFFFF" : "#000000";
    }
  }
  return void 0;
}
function readTheme(pkg) {
  const xml = pkg.getPartText(themePath(pkg));
  if (xml === void 0)
    return defaultTheme();
  let root;
  try {
    root = parseXml2(xml);
  } catch {
    return defaultTheme();
  }
  const themeEls = firstChild2(root, "a:themeElements");
  const scheme = themeEls ? firstChild2(themeEls, "a:clrScheme") : void 0;
  if (!scheme)
    return defaultTheme();
  const theme = defaultTheme();
  for (const slot of childElements2(scheme)) {
    const name = slot.name.replace(/^a:/, "");
    const idx = SLOT_TO_INDEX[name];
    const color = schemeSlotColor(slot);
    if (color === void 0)
      continue;
    theme.byName[name] = color;
    if (idx !== void 0)
      theme.colors[idx] = color;
  }
  return theme;
}
function themePath(pkg) {
  if (pkg.getPart("xl/theme/theme1.xml"))
    return "xl/theme/theme1.xml";
  const rels = pkg.getPartText("xl/_rels/workbook.xml.rels");
  if (rels !== void 0) {
    try {
      const root = parseXml2(rels);
      for (const rel of childElements2(root, "Relationship")) {
        if ((rel.attrs["Type"] ?? "").endsWith("/theme") && rel.attrs["Target"] !== void 0) {
          return pkg.resolveRelTarget("xl/workbook.xml", rel.attrs["Target"]);
        }
      }
    } catch {
    }
  }
  return "xl/theme/theme1.xml";
}
var INDEXED_COLORS_DEFAULT = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  // 0-7
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  // 8-15
  "#800000",
  "#008000",
  "#000080",
  "#808000",
  "#800080",
  "#008080",
  "#C0C0C0",
  "#808080",
  // 16-23
  "#9999FF",
  "#993366",
  "#FFFFCC",
  "#CCFFFF",
  "#660066",
  "#FF8080",
  "#0066CC",
  "#CCCCFF",
  // 24-31
  "#000080",
  "#FF00FF",
  "#FFFF00",
  "#00FFFF",
  "#800080",
  "#800000",
  "#008080",
  "#0000FF",
  // 32-39
  "#00CCFF",
  "#CCFFFF",
  "#CCFFCC",
  "#FFFF99",
  "#99CCFF",
  "#FF99CC",
  "#CC99FF",
  "#FFCC99",
  // 40-47
  "#3366FF",
  "#33CCCC",
  "#99CC00",
  "#FFCC00",
  "#FF9900",
  "#FF6600",
  "#666699",
  "#969696",
  // 48-55
  "#003366",
  "#339966",
  "#003300",
  "#333300",
  "#993300",
  "#993366",
  "#333399",
  "#333333",
  // 56-63
  "#000000",
  // 64 system foreground (preto "auto")
  "#FFFFFF"
  // 65 system background
];
function readIndexedColors(pkg) {
  const out = [...INDEXED_COLORS_DEFAULT];
  const xml = pkg.getPartText("xl/styles.xml");
  if (xml === void 0)
    return out;
  let root;
  try {
    root = parseXml2(xml);
  } catch {
    return out;
  }
  const colorsEl = firstChild2(root, "colors");
  const idxEl = colorsEl ? firstChild2(colorsEl, "indexedColors") : void 0;
  if (!idxEl)
    return out;
  let i2 = 0;
  for (const rc of childElements2(idxEl, "rgbColor")) {
    const rgb2 = rc.attrs["rgb"];
    if (rgb2 !== void 0)
      out[i2] = "#" + rgb2.slice(-6).toUpperCase();
    i2++;
  }
  return out;
}
function colorContext(pkg) {
  return { theme: readTheme(pkg), indexed: readIndexedColors(pkg) };
}
function defaultColorContext() {
  return { theme: defaultTheme(), indexed: [...INDEXED_COLORS_DEFAULT] };
}
function resolveColorEl(c2, cx) {
  const ctx = cx ?? defaultColorContext();
  let base;
  const rgb2 = c2.attrs["rgb"];
  const theme = c2.attrs["theme"];
  const indexed = c2.attrs["indexed"];
  if (rgb2 !== void 0)
    base = "#" + rgb2.slice(-6);
  else if (theme !== void 0)
    base = ctx.theme.colors[parseInt(theme, 10)] ?? "#000000";
  else if (indexed !== void 0)
    base = ctx.indexed[parseInt(indexed, 10)] ?? "#000000";
  else if (c2.attrs["auto"] === "1" || c2.attrs["auto"] === "true")
    base = "#000000";
  if (base === void 0)
    return void 0;
  const tint = c2.attrs["tint"];
  return tint !== void 0 ? applyTint(base, parseFloat(tint)) : base;
}
function applyTint(hex2, tint) {
  if (!tint)
    return hex2;
  const m = /#?([0-9a-fA-F]{6})/.exec(hex2);
  if (!m)
    return hex2;
  const n = parseInt(m[1], 16);
  const rf = (n >> 16 & 255) / 255, gf = (n >> 8 & 255) / 255, bf = (n & 255) / 255;
  const max2 = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max2 - min;
  let hh = 0, s = 0;
  let l = (max2 + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max2 - min) : d / (max2 + min);
    if (max2 === rf)
      hh = (gf - bf) / d % 6;
    else if (max2 === gf)
      hh = (bf - rf) / d + 2;
    else
      hh = (rf - gf) / d + 4;
    hh /= 6;
    if (hh < 0)
      hh += 1;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue2rgb = (p, q, t2) => {
    if (t2 < 0)
      t2 += 1;
    if (t2 > 1)
      t2 -= 1;
    if (t2 < 1 / 6)
      return p + (q - p) * 6 * t2;
    if (t2 < 1 / 2)
      return q;
    if (t2 < 2 / 3)
      return p + (q - p) * (2 / 3 - t2) * 6;
    return p;
  };
  let R, G, B;
  if (s === 0) {
    R = G = B = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    R = hue2rgb(p, q, hh + 1 / 3);
    G = hue2rgb(p, q, hh);
    B = hue2rgb(p, q, hh - 1 / 3);
  }
  const to = (x2) => Math.round(Math.min(1, Math.max(0, x2)) * 255).toString(16).padStart(2, "0");
  return "#" + to(R) + to(G) + to(B);
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/read.js
function readRels(pkg, relsPart) {
  const map = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(relsPart);
  if (xml === void 0)
    return map;
  const root = parseXml2(xml);
  for (const rel of childElements2(root, "Relationship")) {
    const id = rel.attrs["Id"];
    const target = rel.attrs["Target"];
    if (id !== void 0 && target !== void 0)
      map.set(id, target);
  }
  return map;
}
function relsPathFor(part) {
  const slash = part.lastIndexOf("/");
  const dir = part.slice(0, slash);
  const file = part.slice(slash + 1);
  return `${dir}/_rels/${file}.rels`;
}
function readWorkbook(pkg) {
  const root = parseXml2(pkg.workbookXml());
  const sheetsEl = firstChild2(root, "sheets");
  const sheets = [];
  const rels = readRels(pkg, "xl/_rels/workbook.xml.rels");
  if (sheetsEl) {
    for (const s of childElements2(sheetsEl, "sheet")) {
      const rId = s.attrs["r:id"];
      const target = rId !== void 0 ? rels.get(rId) : void 0;
      sheets.push({
        name: s.attrs["name"] ?? "",
        sheetId: s.attrs["sheetId"] ?? "",
        rId: rId ?? "",
        state: s.attrs["state"],
        target: target !== void 0 ? pkg.resolveRelTarget("xl/workbook.xml", target) : void 0
      });
    }
  }
  const wb = { sheets };
  const bookViews = firstChild2(root, "bookViews");
  const wbView = bookViews ? firstChild2(bookViews, "workbookView") : void 0;
  const activeTabStr = wbView?.attrs["activeTab"] ?? root.attrs["activeTab"];
  if (activeTabStr !== void 0)
    wb.activeTab = parseInt(activeTabStr, 10);
  const wbPr = firstChild2(root, "workbookPr");
  if (wbPr?.attrs["date1904"] === "1" || wbPr?.attrs["date1904"] === "true")
    wb.date1904 = true;
  return wb;
}
function readSharedStrings(pkg, cx) {
  const xml = pkg.getPartText("xl/sharedStrings.xml");
  if (xml === void 0)
    return [];
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml2(xml);
  const out = [];
  for (const si of childElements2(root, "si")) {
    out.push(readSharedStringEntry(si, ctx));
  }
  return out;
}
function readRunProps2(rPr, cx) {
  const props = {};
  const boolEl = (name) => {
    const e = firstChild2(rPr, name);
    if (!e)
      return void 0;
    const v = e.attrs["val"];
    return v !== "0" && v !== "false" && v !== "none";
  };
  const b = boolEl("b");
  if (b !== void 0)
    props.bold = b;
  const i2 = boolEl("i");
  if (i2 !== void 0)
    props.italic = i2;
  const u = boolEl("u");
  if (u !== void 0)
    props.underline = u;
  const st = boolEl("strike");
  if (st !== void 0)
    props.strike = st;
  const sz = firstChild2(rPr, "sz");
  if (sz?.attrs["val"] !== void 0)
    props.size = parseFloat(sz.attrs["val"]);
  const colEl = firstChild2(rPr, "color");
  if (colEl)
    props.color = resolveColorEl(colEl, cx);
  const rFont = firstChild2(rPr, "rFont");
  if (rFont?.attrs["val"] !== void 0)
    props.font = rFont.attrs["val"];
  return Object.keys(props).length ? props : void 0;
}
function readSharedStringEntry(el, cx) {
  const runsEls = childElements2(el, "r");
  if (runsEls.length > 0) {
    const runs = runsEls.map((r) => {
      const t3 = firstChild2(r, "t");
      const rPr = firstChild2(r, "rPr");
      const rPrAttrs = {};
      if (rPr)
        for (const a of Object.keys(rPr.attrs))
          rPrAttrs[a] = rPr.attrs[a];
      const run = { text: t3 ? textContent(t3) : "" };
      if (Object.keys(rPrAttrs).length)
        run.rPr = rPrAttrs;
      if (rPr) {
        const props = readRunProps2(rPr, cx);
        if (props)
          run.props = props;
      }
      return run;
    });
    return { text: runs.map((r) => r.text).join(""), runs };
  }
  const t2 = firstChild2(el, "t");
  return { text: t2 ? textContent(t2) : "" };
}
function readWorksheet(pkg, sheetPath, cx) {
  const xml = pkg.getPartText(sheetPath);
  if (xml === void 0)
    throw new Error(`Pacote sem ${sheetPath}`);
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml2(xml);
  const relsPath = relsPathFor(sheetPath);
  const sheetRels = readRels(pkg, relsPath);
  const rows = [];
  const sheetData = firstChild2(root, "sheetData");
  if (sheetData) {
    for (const rowEl of childElements2(sheetData, "row")) {
      rows.push(readRow(rowEl, ctx));
    }
  }
  const merges = [];
  const mergeCells = firstChild2(root, "mergeCells");
  if (mergeCells) {
    for (const mc of childElements2(mergeCells, "mergeCell")) {
      const ref = mc.attrs["ref"];
      if (ref !== void 0)
        merges.push(ref);
    }
  }
  const cols = [];
  const colsEl = firstChild2(root, "cols");
  if (colsEl) {
    for (const c2 of childElements2(colsEl, "col")) {
      const def = { min: parseInt(c2.attrs["min"] ?? "1", 10), max: parseInt(c2.attrs["max"] ?? "1", 10) };
      if (c2.attrs["width"] !== void 0)
        def.width = parseFloat(c2.attrs["width"]);
      if (c2.attrs["customWidth"] === "1")
        def.customWidth = true;
      if (c2.attrs["hidden"] === "1")
        def.hidden = true;
      if (c2.attrs["style"] !== void 0)
        def.style = parseInt(c2.attrs["style"], 10);
      cols.push(def);
    }
  }
  let sheetFormatPr;
  const sfp = firstChild2(root, "sheetFormatPr");
  if (sfp) {
    sheetFormatPr = {};
    if (sfp.attrs["defaultColWidth"] !== void 0)
      sheetFormatPr.defaultColWidth = parseFloat(sfp.attrs["defaultColWidth"]);
    if (sfp.attrs["baseColWidth"] !== void 0)
      sheetFormatPr.baseColWidth = parseFloat(sfp.attrs["baseColWidth"]);
    if (sfp.attrs["defaultRowHeight"] !== void 0)
      sheetFormatPr.defaultRowHeight = parseFloat(sfp.attrs["defaultRowHeight"]);
    if (sfp.attrs["customHeight"] === "1" || sfp.attrs["customHeight"] === "true")
      sheetFormatPr.customHeight = true;
    if (Object.keys(sheetFormatPr).length === 0)
      sheetFormatPr = void 0;
  }
  const hyperlinks = [];
  const hlinksEl = firstChild2(root, "hyperlinks");
  if (hlinksEl) {
    for (const hl of childElements2(hlinksEl, "hyperlink")) {
      const ref = hl.attrs["ref"];
      if (ref === void 0)
        continue;
      const link = { ref };
      const rid = hl.attrs["r:id"] ?? hl.attrs["id"];
      if (rid !== void 0) {
        const target = sheetRels.get(rid);
        if (target !== void 0)
          link.target = target;
      }
      if (hl.attrs["location"] !== void 0)
        link.location = hl.attrs["location"];
      if (hl.attrs["display"] !== void 0)
        link.display = hl.attrs["display"];
      if (hl.attrs["tooltip"] !== void 0)
        link.tooltip = hl.attrs["tooltip"];
      hyperlinks.push(link);
    }
  }
  let pane;
  const sheetView = firstChild2(firstChild2(root, "sheetViews") ?? root, "sheetView");
  const showGridLines = sheetView?.attrs["showGridLines"] === "0" ? false : void 0;
  const paneEl = sheetView ? firstChild2(sheetView, "pane") : void 0;
  if (paneEl) {
    pane = {
      xSplit: parseInt(paneEl.attrs["xSplit"] ?? "0", 10),
      ySplit: parseInt(paneEl.attrs["ySplit"] ?? "0", 10),
      topLeftCell: paneEl.attrs["topLeftCell"],
      state: paneEl.attrs["state"] ?? "split"
    };
  }
  const condFormats = [];
  for (const cfEl of childElements2(root, "conditionalFormatting")) {
    const sqref = cfEl.attrs["sqref"] ?? "";
    const rules = [];
    for (const ruleEl of childElements2(cfEl, "cfRule")) {
      const type = ruleEl.attrs["type"];
      const priority = parseInt(ruleEl.attrs["priority"] ?? "0", 10);
      if (type === "colorScale") {
        const cs = firstChild2(ruleEl, "colorScale");
        const stops = [];
        if (cs)
          for (const cfvo of childElements2(cs, "cfvo")) {
            stops.push({ type: cfvo.attrs["type"] ?? "min", value: cfvo.attrs["val"] !== void 0 ? parseFloat(cfvo.attrs["val"]) : void 0, color: "#808080" });
          }
        let i2 = 0;
        for (const colEl of cs ? childElements2(cs, "color") : []) {
          const c2 = resolveColorEl(colEl, ctx) ?? "#000000";
          if (stops[i2])
            stops[i2].color = c2;
          i2++;
        }
        rules.push({ type, priority, stops });
      } else if (type === "dataBar") {
        const db = firstChild2(ruleEl, "dataBar");
        const colorEl = db ? firstChild2(db, "color") : void 0;
        rules.push({ type, priority, barColor: (colorEl ? resolveColorEl(colorEl, ctx) : void 0) ?? "#638EC6" });
      } else if (type === "cellIs" || type === "expression") {
        const dxfId = ruleEl.attrs["dxfId"] !== void 0 ? parseInt(ruleEl.attrs["dxfId"], 10) : void 0;
        const formula = childElements2(ruleEl, "formula").map((f) => textContent(f));
        rules.push({ type, priority, operator: ruleEl.attrs["operator"], formula, dxfId });
      }
    }
    if (rules.length)
      condFormats.push({ sqref, rules });
  }
  const commentsPath = findRelByType(pkg, relsPath, "/comments");
  const comments = commentsPath ? readComments2(pkg, pkg.resolveRelTarget(sheetPath, commentsPath)) : [];
  const drawingTarget = findRelByType(pkg, relsPath, "/drawing");
  const charts = drawingTarget ? readDrawingCharts(pkg, pkg.resolveRelTarget(sheetPath, drawingTarget)) : [];
  const ws = { rows };
  if (merges.length > 0) {
    ws.merges = merges;
    ws.mergedAreas = new Map(merges.map((m) => {
      const [tl] = m.split(":");
      return [tl ?? m, m];
    }));
  }
  if (cols.length > 0)
    ws.cols = cols;
  if (pane)
    ws.pane = pane;
  if (showGridLines === false)
    ws.showGridLines = false;
  if (condFormats.length > 0)
    ws.condFormats = condFormats;
  if (comments.length > 0)
    ws.comments = comments;
  if (charts.length > 0)
    ws.charts = charts;
  if (hyperlinks.length > 0)
    ws.hyperlinks = hyperlinks;
  if (sheetFormatPr)
    ws.sheetFormatPr = sheetFormatPr;
  return ws;
}
function readDrawingCharts(pkg, drawingPath) {
  const out = [];
  const xml = pkg.getPartText(drawingPath);
  if (xml === void 0)
    return out;
  const root = parseXml2(xml);
  const drelsPath = relsPathFor(drawingPath);
  const drelsMap = /* @__PURE__ */ new Map();
  const drelsXml = pkg.getPartText(drelsPath);
  if (drelsXml !== void 0) {
    const drelsRoot = parseXml2(drelsXml);
    for (const rel of childElements2(drelsRoot, "Relationship")) {
      const id = rel.attrs["Id"];
      const target = rel.attrs["Target"];
      if (id && target)
        drelsMap.set(id, pkg.resolveRelTarget(drawingPath, target));
    }
  }
  const parseInt0 = (s) => s ? parseInt(s, 10) : 0;
  for (const anchor of childElements2(root, "xdr:twoCellAnchor")) {
    const from = firstChild2(anchor, "xdr:from");
    const to = firstChild2(anchor, "xdr:to");
    if (!from || !to)
      continue;
    const gframe = firstChild2(anchor, "xdr:graphicFrame");
    if (!gframe)
      continue;
    const graphic = firstChild2(gframe, "a:graphic");
    const data = graphic ? firstChild2(graphic, "a:graphicData") : void 0;
    if (!data)
      continue;
    const chartEl = firstChild2(data, "c:chart");
    if (!chartEl)
      continue;
    const rid = chartEl.attrs["r:id"] ?? chartEl.attrs["id"];
    if (!rid)
      continue;
    const chartPath = drelsMap.get(rid);
    if (!chartPath)
      continue;
    const chartXml = pkg.getPartText(chartPath);
    if (!chartXml)
      continue;
    const anchorData = {
      from: {
        col: parseInt0(textContent(firstChild2(from, "xdr:col") ?? makeStub())),
        row: parseInt0(textContent(firstChild2(from, "xdr:row") ?? makeStub())),
        colOff: parseInt0(textContent(firstChild2(from, "xdr:colOff") ?? makeStub())),
        rowOff: parseInt0(textContent(firstChild2(from, "xdr:rowOff") ?? makeStub()))
      },
      to: {
        col: parseInt0(textContent(firstChild2(to, "xdr:col") ?? makeStub())),
        row: parseInt0(textContent(firstChild2(to, "xdr:row") ?? makeStub())),
        colOff: parseInt0(textContent(firstChild2(to, "xdr:colOff") ?? makeStub())),
        rowOff: parseInt0(textContent(firstChild2(to, "xdr:rowOff") ?? makeStub()))
      }
    };
    out.push({ anchor: anchorData, chartXml });
  }
  return out;
}
function makeStub() {
  return { name: "", attrs: {}, children: ["0"] };
}
function findRelByType(pkg, relsPart, typeSuffix) {
  const xml = pkg.getPartText(relsPart);
  if (xml === void 0)
    return void 0;
  const root = parseXml2(xml);
  for (const rel of childElements2(root, "Relationship")) {
    const t2 = rel.attrs["Type"] ?? "";
    if (t2.endsWith(typeSuffix))
      return rel.attrs["Target"];
  }
  return void 0;
}
function readComments2(pkg, path) {
  const xml = pkg.getPartText(path);
  if (xml === void 0)
    return [];
  const root = parseXml2(xml);
  const authors = [];
  const authorsEl = firstChild2(root, "authors");
  if (authorsEl)
    for (const a of childElements2(authorsEl, "author"))
      authors.push(textContent(a));
  const list = firstChild2(root, "commentList");
  const out = [];
  if (!list)
    return out;
  for (const cmt of childElements2(list, "comment")) {
    const ref = cmt.attrs["ref"];
    if (!ref)
      continue;
    const text2 = firstChild2(cmt, "text");
    const plain = text2 ? textContent(text2) : "";
    const ai = cmt.attrs["authorId"] !== void 0 ? parseInt(cmt.attrs["authorId"], 10) : -1;
    const c2 = { ref, text: plain };
    if (ai >= 0 && authors[ai] !== void 0)
      c2.author = authors[ai];
    out.push(c2);
  }
  return out;
}
function readRow(el, cx) {
  const row = {
    r: parseInt(el.attrs["r"] ?? "0", 10),
    cells: []
  };
  if (el.attrs["spans"] !== void 0)
    row.spans = el.attrs["spans"];
  if (el.attrs["ht"] !== void 0)
    row.height = parseFloat(el.attrs["ht"]);
  if (el.attrs["customHeight"] === "1" || el.attrs["customHeight"] === "true")
    row.customHeight = true;
  if (el.attrs["hidden"] === "1" || el.attrs["hidden"] === "true")
    row.hidden = true;
  if (el.attrs["s"] !== void 0)
    row.style = parseInt(el.attrs["s"], 10);
  for (const cEl of childElements2(el, "c"))
    row.cells.push(readCell(cEl, cx));
  return row;
}
function readCell(el, cx) {
  const cell = { ref: el.attrs["r"] ?? "" };
  if (el.attrs["t"] !== void 0)
    cell.type = el.attrs["t"];
  if (el.attrs["s"] !== void 0)
    cell.style = parseInt(el.attrs["s"], 10);
  const v = firstChild2(el, "v");
  if (v !== void 0)
    cell.value = textContent(v);
  const f = firstChild2(el, "f");
  if (f !== void 0)
    cell.formula = textContent(f);
  const isEl = firstChild2(el, "is");
  if (isEl !== void 0)
    cell.inlineString = readSharedStringEntry(isEl, cx);
  return cell;
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/styles.js
function readStyles2(pkg, cx) {
  const xml = pkg.getPartText("xl/styles.xml");
  if (xml === void 0)
    return { numFmts: /* @__PURE__ */ new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] };
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml2(xml);
  const fonts = [];
  const fontsEl = firstChild2(root, "fonts");
  if (fontsEl) {
    for (const f of childElements2(fontsEl, "font")) {
      const font = {};
      if (firstChild2(f, "b"))
        font.bold = true;
      if (firstChild2(f, "i"))
        font.italic = true;
      if (firstChild2(f, "u"))
        font.underline = true;
      if (firstChild2(f, "strike"))
        font.strike = true;
      const sz = firstChild2(f, "sz");
      if (sz?.attrs["val"] !== void 0)
        font.size = parseFloat(sz.attrs["val"]);
      font.color = readColor(f, ctx);
      const name = firstChild2(f, "name");
      if (name?.attrs["val"] !== void 0)
        font.name = name.attrs["val"];
      fonts.push(font);
    }
  }
  const fills = [];
  const fillsEl = firstChild2(root, "fills");
  if (fillsEl) {
    for (const fl2 of childElements2(fillsEl, "fill")) {
      fills.push(readFill(fl2, ctx));
    }
  }
  const borders = [];
  const bordersEl = firstChild2(root, "borders");
  if (bordersEl) {
    for (const bd of childElements2(bordersEl, "border")) {
      const border = {};
      for (const side of ["left", "right", "top", "bottom", "diagonal"]) {
        const e = firstChild2(bd, side);
        if (e && e.attrs["style"] && e.attrs["style"] !== "none") {
          const colEl = firstChild2(e, "color");
          border[side] = {
            style: e.attrs["style"],
            color: colEl ? resolveColorEl(colEl, ctx) : "#000000"
          };
        }
      }
      borders.push(border);
    }
  }
  const dxfs = [];
  const dxfsEl = firstChild2(root, "dxfs");
  if (dxfsEl) {
    for (const d of childElements2(dxfsEl, "dxf")) {
      const dxf = {};
      const fill = firstChild2(d, "fill");
      const pf = fill ? firstChild2(fill, "patternFill") : void 0;
      const bg = pf ? firstChild2(pf, "bgColor") : void 0;
      if (bg)
        dxf.fillColor = resolveColorEl(bg, ctx);
      const font = firstChild2(d, "font");
      if (font) {
        if (firstChild2(font, "b"))
          dxf.bold = true;
        if (firstChild2(font, "i"))
          dxf.italic = true;
        const colEl = firstChild2(font, "color");
        if (colEl)
          dxf.fontColor = resolveColorEl(colEl, ctx);
      }
      dxfs.push(dxf);
    }
  }
  const numFmts = /* @__PURE__ */ new Map();
  const numFmtsEl = firstChild2(root, "numFmts");
  if (numFmtsEl) {
    for (const nf of childElements2(numFmtsEl, "numFmt")) {
      const id = nf.attrs["numFmtId"];
      const code = nf.attrs["formatCode"];
      if (id !== void 0 && code !== void 0)
        numFmts.set(parseInt(id, 10), code);
    }
  }
  const cellXfs = [];
  const cellXfsEl = firstChild2(root, "cellXfs");
  if (cellXfsEl) {
    for (const xf of childElements2(cellXfsEl, "xf")) {
      const a = xf.attrs;
      const rec = {
        numFmtId: parseInt(a["numFmtId"] ?? "0", 10),
        fontId: parseInt(a["fontId"] ?? "0", 10),
        fillId: parseInt(a["fillId"] ?? "0", 10),
        borderId: parseInt(a["borderId"] ?? "0", 10),
        xfId: parseInt(a["xfId"] ?? "0", 10)
      };
      if (a["applyNumberFormat"] === "1")
        rec.applyNumberFormat = true;
      if (a["applyFont"] === "1")
        rec.applyFont = true;
      if (a["applyFill"] === "1")
        rec.applyFill = true;
      if (a["applyBorder"] === "1")
        rec.applyBorder = true;
      if (a["applyAlignment"] === "1")
        rec.applyAlignment = true;
      const al = firstChild2(xf, "alignment");
      if (al) {
        if (al.attrs["horizontal"] !== void 0)
          rec.horizontal = al.attrs["horizontal"];
        if (al.attrs["vertical"] !== void 0)
          rec.vertical = al.attrs["vertical"];
        if (al.attrs["wrapText"] === "1")
          rec.wrapText = true;
        if (al.attrs["indent"] !== void 0)
          rec.indent = parseInt(al.attrs["indent"], 10);
      }
      cellXfs.push(rec);
    }
  }
  return { numFmts, cellXfs, fonts, fills, borders, dxfs };
}
function readFill(fl2, ctx) {
  const fill = {};
  const pf = firstChild2(fl2, "patternFill");
  if (pf) {
    fill.pattern = pf.attrs["patternType"];
    const fg = firstChild2(pf, "fgColor");
    const bg = firstChild2(pf, "bgColor");
    if (pf.attrs["patternType"] === "solid") {
      fill.fgColor = fg ? resolveColorEl(fg, ctx) : void 0;
    } else if (pf.attrs["patternType"] !== void 0 && pf.attrs["patternType"] !== "none") {
      if (fg)
        fill.fgColor = resolveColorEl(fg, ctx);
      if (bg)
        fill.bgColor = resolveColorEl(bg, ctx);
    }
    return fill;
  }
  const gf = firstChild2(fl2, "gradientFill");
  if (gf) {
    const stops = [];
    for (const stop of childElements2(gf, "stop")) {
      const colEl = firstChild2(stop, "color");
      stops.push({
        position: parseFloat(stop.attrs["position"] ?? "0"),
        color: (colEl ? resolveColorEl(colEl, ctx) : void 0) ?? "#FFFFFF"
      });
    }
    fill.gradient = { degree: parseFloat(gf.attrs["degree"] ?? "0"), stops };
  }
  return fill;
}
function readColor(el, ctx) {
  const c2 = firstChild2(el, "color");
  return c2 ? resolveColorEl(c2, ctx) : void 0;
}

// ../../../../../../vendor/office-converter/vendor/sheets-processing/packages/processing/dist/format.js
var PT_BR = {
  decimal: ",",
  group: ".",
  monthsShort: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  monthsLong: ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  daysShort: ["dom", "seg", "ter", "qua", "qui", "sex", "s\xE1b"],
  daysLong: ["domingo", "segunda-feira", "ter\xE7a-feira", "quarta-feira", "quinta-feira", "sexta-feira", "s\xE1bado"],
  ampm: ["AM", "PM"],
  // Oráculo COM 2026-07-01 (builtin-probe.xlsx): NumberFormatLocal por id —
  // 14 dd/mm/aaaa · 15 dd/mmm/aa · 16 dd/mmm · 17 mmm/aa · 20 hh:mm ·
  // 21 hh:mm:ss · 22 dd/mm/aaaa hh:mm (18/19 iguais ao en-US)
  builtins: {
    14: "dd/mm/yyyy",
    15: "dd/mmm/yy",
    16: "dd/mmm",
    17: "mmm/yy",
    20: "hh:mm",
    21: "hh:mm:ss",
    22: "dd/mm/yyyy hh:mm"
  }
};
var BUILTIN_FORMATS = {
  0: "General",
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  5: '"$"#,##0_);("$"#,##0)',
  6: '"$"#,##0_);[Red]("$"#,##0)',
  7: '"$"#,##0.00_);("$"#,##0.00)',
  8: '"$"#,##0.00_);[Red]("$"#,##0.00)',
  9: "0%",
  10: "0.00%",
  11: "0.00E+00",
  12: "# ?/?",
  13: "# ??/??",
  14: "m/d/yyyy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yyyy h:mm",
  37: "#,##0_);(#,##0)",
  38: "#,##0_);[Red](#,##0)",
  39: "#,##0.00_);(#,##0.00)",
  40: "#,##0.00_);[Red](#,##0.00)",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mm:ss.0",
  48: "##0.0E+0",
  49: "@"
};
function builtinFormatCode(id, locale = PT_BR) {
  return locale.builtins?.[id] ?? BUILTIN_FORMATS[id];
}
var COLOR_NAMES = {
  black: "#000000",
  blue: "#0000FF",
  cyan: "#00FFFF",
  green: "#008000",
  magenta: "#FF00FF",
  red: "#FF0000",
  white: "#FFFFFF",
  yellow: "#FFFF00"
};
function excelRound(a, d) {
  if (!isFinite(a) || a === 0)
    return a;
  const neg = a < 0;
  const f = Math.pow(10, d);
  const scaled = Number((Math.abs(a) * f).toPrecision(15));
  return (neg ? -1 : 1) * Math.round(scaled) / f;
}
function groupInt(digits, sep) {
  let out = "";
  for (let i2 = 0; i2 < digits.length; i2++) {
    if (i2 > 0 && (digits.length - i2) % 3 === 0)
      out += sep;
    out += digits[i2];
  }
  return out;
}
function formatGeneral(x2, loc = PT_BR) {
  if (x2 === 0)
    return "0";
  if (!isFinite(x2))
    return x2 > 0 ? "" : "";
  const neg = x2 < 0;
  const a = Math.abs(x2);
  const BUDGET = 11;
  const intLen = a >= 1 ? Math.floor(Math.log10(a)) + 1 : 1;
  let body;
  if (intLen > BUDGET) {
    body = sciGeneral(a, loc, BUDGET);
  } else {
    const avail = BUDGET - intLen;
    const decimals = avail > 1 ? avail - 1 : 0;
    const rounded = excelRound(a, decimals);
    let s = rounded.toFixed(decimals);
    if (s.includes("."))
      s = s.replace(/0+$/, "").replace(/\.$/, "");
    if (decimals > 0 && (s === "0" || s === "")) {
      body = sciGeneral(a, loc, BUDGET);
    } else {
      body = s.replace(".", loc.decimal);
    }
  }
  return neg ? "-" + body : body;
}
function sciGeneral(a, loc, budget) {
  let e = Math.floor(Math.log10(a));
  let mant = a / Math.pow(10, e);
  const expDigits = Math.max(2, String(Math.abs(e)).length);
  let expStr = "E" + (e < 0 ? "-" : "+") + String(Math.abs(e)).padStart(expDigits, "0");
  let mantDecimals = Math.max(0, budget - expStr.length - 2);
  let m = mant.toFixed(mantDecimals);
  if (parseFloat(m) >= 10) {
    e += 1;
    mant = a / Math.pow(10, e);
    const ed = Math.max(2, String(Math.abs(e)).length);
    expStr = "E" + (e < 0 ? "-" : "+") + String(Math.abs(e)).padStart(ed, "0");
    mantDecimals = Math.max(0, budget - expStr.length - 2);
    m = mant.toFixed(mantDecimals);
  }
  if (m.includes("."))
    m = m.replace(/0+$/, "").replace(/\.$/, "");
  return m.replace(".", loc.decimal) + expStr;
}
function splitSections(code) {
  const out = [];
  let cur = "";
  for (let i2 = 0; i2 < code.length; i2++) {
    const ch = code[i2];
    if (ch === '"') {
      const end = code.indexOf('"', i2 + 1);
      const j = end < 0 ? code.length : end;
      cur += code.slice(i2, j + 1);
      i2 = j;
      continue;
    }
    if (ch === "[") {
      const end = code.indexOf("]", i2 + 1);
      const j = end < 0 ? code.length : end;
      cur += code.slice(i2, j + 1);
      i2 = j;
      continue;
    }
    if (ch === "\\") {
      cur += code.slice(i2, i2 + 2);
      i2++;
      continue;
    }
    if (ch === ";") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function stripDecor(section) {
  let out = "";
  for (let i2 = 0; i2 < section.length; i2++) {
    const ch = section[i2];
    if (ch === '"') {
      const end = section.indexOf('"', i2 + 1);
      i2 = end < 0 ? section.length : end;
      continue;
    }
    if (ch === "[") {
      const end = section.indexOf("]", i2 + 1);
      i2 = end < 0 ? section.length : end;
      continue;
    }
    if (ch === "\\") {
      i2++;
      continue;
    }
    if (ch === "_") {
      i2++;
      continue;
    }
    out += ch;
  }
  return out;
}
function isDateSection(section) {
  if (/\[(hh?|mm?|ss?)\]/i.test(section))
    return true;
  const bare = stripDecor(section).replace(/AM\/PM/gi, "").replace(/A\/P/gi, "");
  return /[ymdhs]/i.test(bare);
}
function formatValue(value, code, opts = {}) {
  const loc = opts.locale ?? PT_BR;
  const isText = typeof value === "string";
  if (!code || code === "General") {
    if (isText)
      return { text: value };
    return { text: formatGeneral(value, loc) };
  }
  const sections = splitSections(code);
  if (isText) {
    const tsec = sections[3];
    if (tsec !== void 0 && tsec.includes("@"))
      return applyTextSection(tsec, value);
    return { text: value };
  }
  const num = value;
  let section;
  let useAbs = false;
  if (num > 0)
    section = sections[0];
  else if (num < 0) {
    if (sections.length >= 2) {
      section = sections[1];
      useAbs = true;
    } else
      section = sections[0];
  } else {
    section = sections.length >= 3 ? sections[2] : sections[0];
  }
  const { color, body } = extractColor(section);
  const magnitude = useAbs ? Math.abs(num) : num;
  if (isDateSection(body)) {
    return { text: formatDateSection(magnitude, body, loc, !!opts.date1904), color };
  }
  const autoNeg = num < 0 && sections.length < 2;
  const r = formatNumberSection(Math.abs(num), body, loc, opts);
  return { text: (autoNeg ? "-" : "") + r, color };
}
function applyTextSection(section, text2) {
  const { color, body } = extractColor(section);
  let out = "";
  for (let i2 = 0; i2 < body.length; i2++) {
    const ch = body[i2];
    if (ch === '"') {
      const end = body.indexOf('"', i2 + 1);
      const j = end < 0 ? body.length : end;
      out += body.slice(i2 + 1, j);
      i2 = j;
      continue;
    }
    if (ch === "\\") {
      out += body[i2 + 1] ?? "";
      i2++;
      continue;
    }
    if (ch === "@") {
      out += text2;
      continue;
    }
    if (ch === "_") {
      out += " ";
      i2++;
      continue;
    }
    if (ch === "*") {
      i2++;
      continue;
    }
    out += ch;
  }
  return { text: out, color };
}
function extractColor(section) {
  let color;
  let body = "";
  for (let i2 = 0; i2 < section.length; i2++) {
    const ch = section[i2];
    if (ch === "[") {
      const end = section.indexOf("]", i2 + 1);
      const j = end < 0 ? section.length : end;
      const inner = section.slice(i2 + 1, j);
      const low = inner.toLowerCase();
      if (/^(hh?|mm?|ss?)$/.test(low)) {
        body += section.slice(i2, j + 1);
        i2 = j;
        continue;
      }
      if (COLOR_NAMES[low] && color === void 0)
        color = COLOR_NAMES[low];
      else if (/^color\s*\d+$/.test(low) && color === void 0)
        color = "#000000";
      i2 = j;
      continue;
    }
    body += ch;
  }
  return { color, body };
}
function formatNumberSection(a, section, loc, opts) {
  if (section.includes("@"))
    return applyTextSection(section, formatGeneral(a, loc)).text;
  if (/[?#0]+\s*\/\s*[?#0]+/.test(section) || /\/[?#0]/.test(section)) {
    return formatFraction(a, section, loc);
  }
  if (/[eE][+-]/.test(section)) {
    return formatScientificSection(a, section, loc);
  }
  const specMatch = section.match(/[#0?][#0?,.%]*/);
  const numSpec = specMatch ? specMatch[0] : "";
  if (!numSpec)
    return emitSection(section, "", "", opts);
  let scaled = a;
  const pctCount = (numSpec.match(/%/g) ?? []).length;
  if (pctCount)
    scaled *= Math.pow(100, pctCount);
  const intSpecRaw = numSpec.split(".")[0] ?? "";
  const trailingCommas = intSpecRaw.match(/,+$/)?.[0]?.length ?? 0;
  if (trailingCommas)
    scaled /= Math.pow(1e3, trailingCommas);
  const dotIdx = numSpec.indexOf(".");
  const fracSpec = dotIdx >= 0 ? numSpec.slice(dotIdx + 1).replace(/[^0#?]/g, "") : "";
  const intSpec = (dotIdx >= 0 ? numSpec.slice(0, dotIdx) : numSpec).replace(/[^0#?]/g, "");
  const grouped = /[#0?],[#0?]/.test(numSpec.split(".")[0] ?? "");
  const decimals = fracSpec.length;
  const rounded = excelRound(scaled, decimals);
  const fixed = rounded.toFixed(decimals);
  let [intDigits, fracDigits] = fixed.split(".");
  intDigits = intDigits.replace("-", "");
  const minInt = (intSpec.match(/0/g) ?? []).length;
  let intOut = intDigits.replace(/^0+/, "");
  if (intOut.length < minInt)
    intOut = intOut.padStart(minInt, "0");
  if (intOut === "" && minInt === 0 && decimals > 0)
    intOut = "";
  if (intOut === "" && (minInt > 0 || decimals === 0))
    intOut = "0";
  if (grouped && intOut !== "")
    intOut = groupInt(intOut, loc.group);
  let fracOut = "";
  if (decimals > 0) {
    const fd2 = (fracDigits ?? "").padEnd(decimals, "0");
    const chars = [];
    let sigAfter = false;
    for (let i2 = decimals - 1; i2 >= 0; i2--) {
      const ph = fracSpec[i2] ?? "#";
      const dig = fd2[i2] ?? "0";
      if (dig !== "0") {
        chars.unshift(dig);
        sigAfter = true;
      } else if (ph === "0")
        chars.unshift("0");
      else if (ph === "?")
        chars.unshift(" ");
      else {
        if (sigAfter)
          chars.unshift("0");
      }
    }
    fracOut = chars.join("");
  }
  let numberText = intOut + (fracOut !== "" || decimals > 0 && fracSpec.includes("0") ? loc.decimal + fracOut : "");
  if (pctCount)
    numberText += "%".repeat(pctCount);
  return emitSection(section, numSpec, numberText, opts);
}
function emitSection(section, numSpec, numberText, opts) {
  let out = "";
  let emitted = false;
  for (let i2 = 0; i2 < section.length; i2++) {
    const ch = section[i2];
    if (!emitted && numSpec && section.startsWith(numSpec, i2)) {
      out += numberText;
      i2 += numSpec.length - 1;
      emitted = true;
      continue;
    }
    if (ch === '"') {
      const end = section.indexOf('"', i2 + 1);
      const j = end < 0 ? section.length : end;
      out += section.slice(i2 + 1, j);
      i2 = j;
      continue;
    }
    if (ch === "\\") {
      out += section[i2 + 1] ?? "";
      i2++;
      continue;
    }
    if (ch === "_") {
      out += " ";
      i2++;
      continue;
    }
    if (ch === "*") {
      const fill = section[i2 + 1] ?? " ";
      const reps = opts.colWidthChars ? Math.max(0, opts.colWidthChars - out.length) : 1;
      out += fill.repeat(reps);
      i2++;
      continue;
    }
    if ("#0?,.%".includes(ch))
      continue;
    if (ch === "[") {
      const end = section.indexOf("]", i2 + 1);
      i2 = end < 0 ? section.length : end;
      continue;
    }
    out += ch;
  }
  if (!emitted && numberText !== "")
    out += numberText;
  return out;
}
function formatScientificSection(a, section, loc) {
  const m = section.match(/([#0?][#0?,]*(?:\.[#0?]*)?)?[eE]([+-])([0#]+)/);
  if (!m)
    return formatGeneral(a, loc);
  const mantSpec = m[1] ?? "0";
  const sign = m[2];
  const expSpec = m[3] ?? "0";
  const mantDecimals = (mantSpec.split(".")[1] ?? "").replace(/[^0#?]/g, "").length;
  const mantInt = (mantSpec.split(".")[0] ?? "0").replace(/[^0#?]/g, "");
  const intDigits = Math.max(1, mantInt.length);
  const minInt = (mantInt.match(/0/g) ?? []).length;
  const padInt = (s) => {
    const neg = s.startsWith("-");
    const [ip, fp] = s.replace("-", "").split(".");
    const padded = ip.length < minInt ? ip.padStart(minInt, "0") : ip;
    return (neg ? "-" : "") + padded + (fp !== void 0 ? "." + fp : "");
  };
  if (a === 0) {
    const mant2 = padInt(0 .toFixed(mantDecimals)).replace(".", loc.decimal);
    return `${mant2}E${sign === "-" ? "+" : "+"}${"0".padStart(expSpec.length, "0")}`;
  }
  let e = Math.floor(Math.log10(Math.abs(a)));
  let e2 = intDigits > 1 ? Math.floor(e / intDigits) * intDigits : e;
  let mant = a / Math.pow(10, e2);
  let mantStr = excelRound(mant, mantDecimals).toFixed(mantDecimals);
  if (Math.abs(parseFloat(mantStr)) >= Math.pow(10, intDigits)) {
    e2 += intDigits;
    mant = a / Math.pow(10, e2);
    mantStr = excelRound(mant, mantDecimals).toFixed(mantDecimals);
  }
  const expDigits = (expSpec.match(/0/g) ?? []).length || expSpec.length;
  const expOut = String(Math.abs(e2)).padStart(expDigits, "0");
  const expSign = e2 < 0 ? "-" : "+";
  return `${padInt(mantStr).replace(".", loc.decimal)}E${expSign}${expOut}`;
}
function formatFraction(a, section, loc) {
  const m = section.match(/([#0?]+)\s*\/\s*([#0?]+|\d+)/);
  if (!m)
    return formatGeneral(a, loc);
  const numPh = m[1];
  const denPh = m[2];
  const whole = Math.floor(a);
  let frac = a - whole;
  const fixedDen = /^\d+$/.test(denPh) ? parseInt(denPh, 10) : 0;
  const maxDen = fixedDen || Math.pow(10, denPh.length) - 1;
  let bestN = 0, bestD = 1, bestErr = Infinity;
  if (fixedDen) {
    bestD = fixedDen;
    bestN = Math.round(frac * fixedDen);
    bestErr = 0;
  } else {
    let lo = [0, 1], hi = [1, 1];
    for (let it = 0; it < 64; it++) {
      const med = [lo[0] + hi[0], lo[1] + hi[1]];
      if (med[1] > maxDen)
        break;
      const val = med[0] / med[1];
      if (Math.abs(val - frac) < bestErr) {
        bestErr = Math.abs(val - frac);
        bestN = med[0];
        bestD = med[1];
      }
      if (val < frac)
        lo = med;
      else
        hi = med;
    }
    for (const cand of [lo, hi]) {
      if (cand[1] <= maxDen) {
        const err2 = Math.abs(cand[0] / cand[1] - frac);
        if (err2 < bestErr) {
          bestErr = err2;
          bestN = cand[0];
          bestD = cand[1];
        }
      }
    }
  }
  let wholeOut = whole;
  if (bestN >= bestD && bestD > 0) {
    wholeOut += Math.floor(bestN / bestD);
    bestN = bestN % bestD;
  }
  const intPh = section.match(/^([#0?,]+)/)?.[1] ?? "";
  const hasWholePh = /[#0?]/.test(intPh) || section.includes(" ");
  let head = "";
  if (bestN === 0) {
    head = String(wholeOut);
    return head;
  }
  const numStr = String(bestN).padStart(numPh.length, " ");
  const denStr = (fixedDen ? String(fixedDen) : String(bestD)).padEnd(denPh.length, " ");
  const wholeStr = wholeOut === 0 ? hasWholePh ? "" : "" : String(wholeOut);
  const sep = section.includes(" ") ? " " : "";
  return `${wholeStr}${sep}${numStr}/${denStr}`;
}
function serialToDate(serial) {
  const ms = Math.round(serial * 864e5);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}
function formatDateSection(serial, code, loc, date1904 = false) {
  const d = serialToDate(date1904 ? serial + 1462 : serial);
  const yr = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate(), wd = d.getUTCDay();
  const h24 = d.getUTCHours(), min = d.getUTCMinutes(), sec = d.getUTCSeconds();
  const has12 = /AM\/PM|A\/P/i.test(code);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  let out = "";
  let prevTime = false;
  for (let i2 = 0; i2 < code.length; i2++) {
    const ch = code[i2];
    if (ch === '"') {
      const end = code.indexOf('"', i2 + 1);
      const j = end < 0 ? code.length : end;
      out += code.slice(i2 + 1, j);
      i2 = j;
      continue;
    }
    if (ch === "\\") {
      out += code[i2 + 1] ?? "";
      i2++;
      continue;
    }
    if (ch === "[") {
      const end = code.indexOf("]", i2 + 1);
      const j = end < 0 ? code.length : end;
      const inner = code.slice(i2 + 1, j).toLowerCase();
      i2 = j;
      if (inner[0] === "h")
        out += String(Math.floor(serial * 24)).padStart(inner.length, "0");
      else if (inner[0] === "m")
        out += String(Math.floor(serial * 1440)).padStart(inner.length, "0");
      else if (inner[0] === "s")
        out += String(Math.floor(serial * 86400)).padStart(inner.length, "0");
      prevTime = true;
      continue;
    }
    if (/AM\/PM/i.test(code.slice(i2, i2 + 5))) {
      out += h24 < 12 ? loc.ampm[0] : loc.ampm[1];
      i2 += 4;
      prevTime = false;
      continue;
    }
    if (/A\/P/i.test(code.slice(i2, i2 + 3))) {
      out += (h24 < 12 ? loc.ampm[0] : loc.ampm[1]).slice(0, 1);
      i2 += 2;
      prevTime = false;
      continue;
    }
    if (/[ymdhs]/i.test(ch)) {
      let run = "";
      while (i2 < code.length && code[i2].toLowerCase() === ch.toLowerCase()) {
        run += code[i2];
        i2++;
      }
      i2--;
      const L2 = run.length, lower = ch.toLowerCase();
      if (lower === "y")
        out += L2 >= 3 ? String(yr) : String(yr).slice(-2).padStart(2, "0");
      else if (lower === "d") {
        if (L2 >= 4)
          out += loc.daysLong[wd];
        else if (L2 === 3)
          out += loc.daysShort[wd];
        else
          out += L2 === 2 ? String(day).padStart(2, "0") : String(day);
      } else if (lower === "h") {
        out += L2 >= 2 ? String(has12 ? h12 : h24).padStart(2, "0") : String(has12 ? h12 : h24);
        prevTime = true;
      } else if (lower === "s") {
        out += L2 >= 2 ? String(sec).padStart(2, "0") : String(sec);
        prevTime = true;
      } else if (lower === "m") {
        const isMinute = prevTime || /^[\s:.]*s/i.test(code.slice(i2 + 1));
        if (isMinute) {
          out += L2 >= 2 ? String(min).padStart(2, "0") : String(min);
          prevTime = false;
        } else if (L2 >= 4)
          out += loc.monthsLong[mo];
        else if (L2 === 3)
          out += loc.monthsShort[mo];
        else
          out += L2 === 2 ? String(mo + 1).padStart(2, "0") : String(mo + 1);
      }
      continue;
    }
    if (ch === "_") {
      out += " ";
      i2++;
      continue;
    }
    if (ch === "*") {
      i2++;
      continue;
    }
    out += ch;
  }
  return out;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/xlsx/model.js
function loadModel(input) {
  if (input instanceof Uint8Array) {
    const pkg = XlsxPackage.load(input);
    const cx = colorContext(pkg);
    return {
      pkg,
      workbook: readWorkbook(pkg),
      styles: readStyles2(pkg, cx),
      sharedStrings: readSharedStrings(pkg, cx)
    };
  }
  return input;
}
function selectSheets(model, sheet2, defaultScope) {
  const { workbook, pkg } = model;
  const cx = colorContext(pkg);
  const readOne = (ref) => {
    if (!ref.target)
      throw new Error(`Planilha "${ref.name}" sem parte resolvida no pacote`);
    return { name: ref.name, ws: readWorksheet(pkg, ref.target, cx) };
  };
  if (sheet2 !== void 0) {
    const ref = typeof sheet2 === "number" ? workbook.sheets[sheet2] : workbook.sheets.find((s) => s.name === sheet2);
    if (!ref) {
      throw new Error(typeof sheet2 === "number" ? `\xCDndice de planilha fora do intervalo: ${sheet2} (0..${workbook.sheets.length - 1})` : `Planilha n\xE3o encontrada: "${sheet2}"`);
    }
    return [readOne(ref)];
  }
  if (workbook.sheets.length === 0)
    throw new Error("Pasta de trabalho sem planilhas");
  if (defaultScope === "active") {
    const ref = workbook.sheets[workbook.activeTab ?? 0] ?? workbook.sheets[0];
    return [readOne(ref)];
  }
  const visible = workbook.sheets.filter((s) => s.state === void 0 || s.state === "visible");
  return (visible.length ? visible : workbook.sheets).map(readOne);
}
function displayValue(cell, model, loc) {
  if (cell.type === "s" && cell.value !== void 0) {
    return { text: model.sharedStrings[parseInt(cell.value, 10)]?.text ?? "", numeric: false };
  }
  if (cell.type === "inlineStr")
    return { text: cell.inlineString?.text ?? "", numeric: false };
  if (cell.type === "b")
    return { text: cell.value === "1" ? "VERDADEIRO" : "FALSO", numeric: false };
  if (cell.type === "e")
    return { text: cell.value ?? "", numeric: false };
  if (cell.value === void 0)
    return { text: "", numeric: false };
  if (cell.type === "str")
    return { text: cell.value, numeric: false };
  const n = parseFloat(cell.value);
  if (Number.isNaN(n))
    return { text: cell.value, numeric: false };
  const xf = model.styles.cellXfs[cell.style ?? 0];
  const numFmtId = xf?.numFmtId ?? 0;
  const code = model.styles.numFmts.get(numFmtId) ?? builtinFormatCode(numFmtId, loc) ?? "General";
  const r = formatValue(n, code, { locale: loc, date1904: model.workbook.date1904 });
  return { text: r.text, color: r.color, numeric: true };
}
function buildGrid(model, sel, loc) {
  const { ws, name } = sel;
  let rowCount = 0;
  let colCount = 0;
  for (const row of ws.rows) {
    if (row.cells.length === 0)
      continue;
    if (row.r > rowCount)
      rowCount = row.r;
    for (const c2 of row.cells) {
      const { col } = refToRowCol(c2.ref);
      if (col > colCount)
        colCount = col;
    }
  }
  const merges = [];
  for (const m of ws.merges ?? []) {
    const [a, b] = m.split(":");
    if (!a)
      continue;
    try {
      const s = refToRowCol(a);
      const e = b ? refToRowCol(b) : s;
      const g = {
        r0: Math.min(s.row, e.row),
        c0: Math.min(s.col, e.col),
        r1: Math.max(s.row, e.row),
        c1: Math.max(s.col, e.col)
      };
      merges.push(g);
      if (g.r1 > rowCount)
        rowCount = g.r1;
      if (g.c1 > colCount)
        colCount = g.c1;
    } catch {
    }
  }
  const cells = [];
  for (let r = 0; r < rowCount; r++)
    cells.push(new Array(colCount).fill(void 0));
  for (const row of ws.rows) {
    for (const c2 of row.cells) {
      const { col, row: r } = refToRowCol(c2.ref);
      if (r < 1 || r > rowCount || col < 1 || col > colCount)
        continue;
      const gc = displayValue(c2, model, loc);
      if (c2.style !== void 0)
        gc.xf = c2.style;
      cells[r - 1][col - 1] = gc;
    }
  }
  const mergeMap = /* @__PURE__ */ new Map();
  for (const g of merges) {
    for (let r = g.r0; r <= g.r1; r++) {
      for (let c2 = g.c0; c2 <= g.c1; c2++)
        mergeMap.set(`${r},${c2}`, g);
    }
  }
  return {
    name,
    ws,
    rowCount,
    colCount,
    cells,
    merges,
    mergeAt: (r, c2) => mergeMap.get(`${r},${c2}`)
  };
}
function colWidthPx(width) {
  const MDW = 7;
  return Math.floor((256 * width + Math.floor(128 / MDW)) / 256 * MDW);
}
var DEFAULT_COL_W_PX = 64;
var DEFAULT_ROW_H_PT = 15;
function colWidthsPx(ws, colCount) {
  const sfp = ws.sheetFormatPr;
  const defPx = sfp?.defaultColWidth !== void 0 ? colWidthPx(sfp.defaultColWidth) : sfp?.baseColWidth !== void 0 ? colWidthPx(sfp.baseColWidth + 5 / 7) : DEFAULT_COL_W_PX;
  const out = new Array(colCount).fill(defPx);
  for (const cd of ws.cols ?? []) {
    if (cd.width === void 0)
      continue;
    for (let c2 = Math.max(1, cd.min); c2 <= Math.min(colCount, cd.max); c2++) {
      out[c2 - 1] = colWidthPx(cd.width);
    }
  }
  return out;
}
function rowHeightsPt(ws, rowCount) {
  const def = ws.sheetFormatPr?.defaultRowHeight ?? DEFAULT_ROW_H_PT;
  const out = new Array(rowCount).fill(def);
  for (const row of ws.rows) {
    if (row.height !== void 0 && row.r >= 1 && row.r <= rowCount)
      out[row.r - 1] = row.height;
  }
  return out;
}
function hiddenCols(ws, colCount) {
  const out = /* @__PURE__ */ new Set();
  for (const cd of ws.cols ?? []) {
    if (!cd.hidden)
      continue;
    for (let c2 = Math.max(1, cd.min); c2 <= Math.min(colCount, cd.max); c2++)
      out.add(c2);
  }
  return out;
}
function hiddenRows(ws) {
  const out = /* @__PURE__ */ new Set();
  for (const row of ws.rows)
    if (row.hidden)
      out.add(row.r);
  return out;
}
function fillColor(fill) {
  if (!fill)
    return void 0;
  if (fill.pattern === "solid")
    return fill.fgColor;
  if (fill.gradient)
    return fill.gradient.stops[0]?.color;
  if (fill.pattern && fill.pattern !== "none")
    return fill.fgColor ?? fill.bgColor;
  return void 0;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/xlsx/html.js
function escapeHtml3(text2) {
  return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function htmlText(text2) {
  return escapeHtml3(text2).replace(/\r\n|\r|\n/g, "<br>");
}
function borderCss(edge) {
  const style = edge.style ?? "thin";
  const map = {
    thin: "1px solid",
    hair: "1px solid",
    dotted: "1px dotted",
    dashed: "1px dashed",
    dashDot: "1px dashed",
    dashDotDot: "1px dashed",
    medium: "2px solid",
    mediumDashed: "2px dashed",
    mediumDashDot: "2px dashed",
    mediumDashDotDot: "2px dashed",
    slantDashDot: "2px dashed",
    thick: "3px solid",
    double: "3px double"
  };
  return `${map[style] ?? "1px solid"} ${edge.color ?? "#000000"}`;
}
function cellCss(gc, styles) {
  const parts = [];
  const xf = gc?.xf !== void 0 ? styles.cellXfs[gc.xf] : void 0;
  const font = xf ? styles.fonts[xf.fontId] : void 0;
  const bg = fillColor(xf ? styles.fills[xf.fillId] : void 0);
  if (bg)
    parts.push(`background-color:${bg}`);
  const border = xf ? styles.borders[xf.borderId] : void 0;
  if (border?.top)
    parts.push(`border-top:${borderCss(border.top)}`);
  if (border?.right)
    parts.push(`border-right:${borderCss(border.right)}`);
  if (border?.bottom)
    parts.push(`border-bottom:${borderCss(border.bottom)}`);
  if (border?.left)
    parts.push(`border-left:${borderCss(border.left)}`);
  if (font?.bold)
    parts.push("font-weight:700");
  if (font?.italic)
    parts.push("font-style:italic");
  if (font?.size !== void 0)
    parts.push(`font-size:${font.size}pt`);
  if (font?.name)
    parts.push(`font-family:'${font.name}'`);
  const deco = [];
  if (font?.underline)
    deco.push("underline");
  if (font?.strike)
    deco.push("line-through");
  if (deco.length)
    parts.push(`text-decoration:${deco.join(" ")}`);
  const color = gc?.color ?? font?.color;
  if (color)
    parts.push(`color:${color}`);
  let ha = xf?.horizontal;
  if (ha === "general")
    ha = void 0;
  if (ha === "centerContinuous")
    ha = "center";
  if (ha === "fill")
    ha = "left";
  if (!ha && gc?.numeric)
    ha = "right";
  if (ha)
    parts.push(`text-align:${ha}`);
  if (xf?.vertical === "top")
    parts.push("vertical-align:top");
  else if (xf?.vertical === "center")
    parts.push("vertical-align:middle");
  if (xf?.wrapText)
    parts.push("white-space:pre-wrap");
  return parts.join(";");
}
function sheetToHtml(model, grid, heading) {
  const out = [];
  if (heading)
    out.push(`<h2>${escapeHtml3(grid.name)}</h2>`);
  out.push(`<table style="border-collapse:collapse;font-family:'Aptos Narrow',Calibri,sans-serif;font-size:11pt">`);
  if (grid.colCount > 0) {
    const widths = colWidthsPx(grid.ws, grid.colCount);
    out.push(`<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join("")}</colgroup>`);
  }
  const heights = rowHeightsPt(grid.ws, grid.rowCount);
  out.push("<tbody>");
  for (let r = 1; r <= grid.rowCount; r++) {
    const tds2 = [];
    for (let c2 = 1; c2 <= grid.colCount; c2++) {
      const merge = grid.mergeAt(r, c2);
      if (merge && (merge.r0 !== r || merge.c0 !== c2))
        continue;
      const gc = grid.cells[r - 1][c2 - 1];
      const attrs = [];
      if (merge) {
        const colspan = merge.c1 - merge.c0 + 1;
        const rowspan = merge.r1 - merge.r0 + 1;
        if (colspan > 1)
          attrs.push(`colspan="${colspan}"`);
        if (rowspan > 1)
          attrs.push(`rowspan="${rowspan}"`);
      }
      const css = cellCss(gc, model.styles);
      if (css)
        attrs.push(`style="${css}"`);
      tds2.push(`<td${attrs.length ? " " + attrs.join(" ") : ""}>${htmlText(gc?.text ?? "")}</td>`);
    }
    out.push(`<tr style="height:${heights[r - 1]}pt">${tds2.join("")}</tr>`);
  }
  out.push("</tbody>");
  out.push("</table>");
  return out.join("\n");
}
function xlsxToHtml(input, opts = {}) {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, "all");
  const heading = sheets.length > 1;
  const body = sheets.map((sel) => sheetToHtml(model, buildGrid(model, sel, loc), heading)).join("\n");
  if (!opts.fullDocument)
    return body;
  return [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    '<head><meta charset="utf-8"><title>Planilha</title></head>',
    "<body>",
    body,
    "</body>",
    "</html>"
  ].join("\n");
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/xlsx/markdown.js
function mdEscape(text2) {
  return text2.replace(/\|/g, "\\|").replace(/\r\n|\r|\n/g, "<br>");
}
function cellText2(grid, r, c2) {
  const merge = grid.mergeAt(r, c2);
  if (merge && (merge.r0 !== r || merge.c0 !== c2))
    return "";
  return mdEscape(grid.cells[r - 1][c2 - 1]?.text ?? "");
}
function sheetToMarkdown(grid) {
  const out = [`## ${grid.name}`];
  if (grid.rowCount === 0)
    return out.join("\n");
  let headerRow = 1;
  for (let r = 1; r <= grid.rowCount; r++) {
    if (grid.cells[r - 1].some((c2) => c2 !== void 0)) {
      headerRow = r;
      break;
    }
  }
  const aligns = [];
  for (let c2 = 1; c2 <= grid.colCount; c2++) {
    let numeric = 0;
    let nonEmpty = 0;
    for (let r = headerRow + 1; r <= grid.rowCount; r++) {
      const gc = grid.cells[r - 1][c2 - 1];
      if (!gc || gc.text === "")
        continue;
      nonEmpty++;
      if (gc.numeric)
        numeric++;
    }
    aligns.push(nonEmpty > 0 && numeric * 2 > nonEmpty ? "---:" : "---");
  }
  const rowLine = (r) => {
    const fields = [];
    for (let c2 = 1; c2 <= grid.colCount; c2++)
      fields.push(cellText2(grid, r, c2));
    return `| ${fields.join(" | ")} |`;
  };
  out.push("");
  out.push(rowLine(headerRow));
  out.push(`| ${aligns.join(" | ")} |`);
  for (let r = headerRow + 1; r <= grid.rowCount; r++)
    out.push(rowLine(r));
  return out.join("\n");
}
function xlsxToMarkdown(input, opts = {}) {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, "all");
  return sheets.map((sel) => sheetToMarkdown(buildGrid(model, sel, loc))).join("\n\n") + "\n";
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/xlsx/pdf.js
var A4_W = 595.276;
var A4_H = 841.89;
var CELL_PAD = 2.25;
var CELL_VPAD = 1.5;
function borderStroke(edge) {
  switch (edge.style) {
    case "hair":
      return { width: 0.5 };
    case "dotted":
      return { width: 0.75, dash: [1, 1] };
    case "dashed":
    case "dashDot":
    case "dashDotDot":
      return { width: 0.75, dash: [3, 2] };
    case "medium":
      return { width: 1.5 };
    case "mediumDashed":
    case "mediumDashDot":
    case "mediumDashDotDot":
    case "slantDashDot":
      return { width: 1.5, dash: [3, 2] };
    case "thick":
      return { width: 2.25 };
    case "double":
      return { width: 2.25 };
    // aproximação: linha única grossa
    default:
      return { width: 0.75 };
  }
}
function textWidthPt(text2, program, sizePt) {
  let units = 0;
  for (const ch of text2)
    units += program.advanceWidth(program.glyphId(ch.codePointAt(0)));
  return units * sizePt / program.unitsPerEm;
}
function xlsxToPdf(input, opts = {}) {
  const fonts = opts.fonts;
  if (!fonts || fonts.length === 0) {
    throw new Error("xlsxToPdf: opts.fonts \xE9 obrigat\xF3rio \u2014 o gerador de PDF n\xE3o tem fontes base-14. Passe ao menos uma TTF (ex.: Aptos Narrow regular; ideal: regular/bold/italic/bold-italic).");
  }
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const margin = opts.marginPt ?? 36;
  const doc = new PdfDocument();
  const variants = fonts.map((f, i2) => {
    const program = new TtfProgram(f.bytes);
    return {
      bold: !!f.bold,
      italic: !!f.italic,
      program,
      embedded: doc.embedFont(f.name ?? `Font${i2}`, f.bytes, program)
    };
  });
  const pick = (bold, italic) => variants.find((v) => v.bold === bold && v.italic === italic) ?? variants.find((v) => !v.bold && !v.italic) ?? variants[0];
  const sheets = selectSheets(model, opts.sheet, "all");
  for (const sel of sheets)
    renderSheet(doc, model, sel, loc, margin, pick);
  return doc.build();
}
function renderSheet(doc, model, sel, loc, margin, pick) {
  const grid = buildGrid(model, sel, loc);
  if (grid.rowCount === 0 || grid.colCount === 0)
    return;
  const widthsPt = colWidthsPx(grid.ws, grid.colCount).map((px) => px * 72 / 96);
  const hidCols = hiddenCols(grid.ws, grid.colCount);
  for (const c2 of hidCols)
    widthsPt[c2 - 1] = 0;
  const heights = rowHeightsPt(grid.ws, grid.rowCount);
  const hidRows = hiddenRows(grid.ws);
  const totalW = widthsPt.reduce((a, b) => a + b, 0);
  const landscape = totalW > A4_W - 2 * margin;
  const pageW = landscape ? A4_H : A4_W;
  const pageH = landscape ? A4_W : A4_H;
  const contentH = pageH - 2 * margin;
  const xs = [margin];
  for (let c2 = 1; c2 <= grid.colCount; c2++)
    xs.push(xs[c2 - 1] + widthsPt[c2 - 1]);
  const pagesRows = [];
  let cur = [];
  let used = 0;
  for (let r = 1; r <= grid.rowCount; r++) {
    if (hidRows.has(r))
      continue;
    const h = heights[r - 1];
    if (cur.length > 0 && used + h > contentH) {
      pagesRows.push(cur);
      cur = [];
      used = 0;
    }
    cur.push(r);
    used += h;
  }
  if (cur.length)
    pagesRows.push(cur);
  for (const rows of pagesRows) {
    const page = doc.addPage(pageW, pageH);
    drawPage(page, model, grid, rows, xs, widthsPt, heights, hidCols, margin, pageH, pick);
  }
}
function drawPage(page, model, grid, rows, xs, widthsPt, heights, hidCols, margin, pageH, pick) {
  const styles = model.styles;
  const pageBottom = pageH - margin;
  const yOf = /* @__PURE__ */ new Map();
  let y = margin;
  for (const r of rows) {
    yOf.set(r, y);
    y += heights[r - 1];
  }
  const boxes = [];
  for (const r of rows) {
    for (let c2 = 1; c2 <= grid.colCount; c2++) {
      if (hidCols.has(c2))
        continue;
      const merge = grid.mergeAt(r, c2);
      if (merge && (merge.r0 !== r || merge.c0 !== c2))
        continue;
      const gc = grid.cells[r - 1][c2 - 1];
      const x2 = xs[c2 - 1];
      let w = widthsPt[c2 - 1];
      let h = heights[r - 1];
      if (merge) {
        w = xs[merge.c1] - xs[merge.c0 - 1];
        h = 0;
        for (let rr = merge.r0; rr <= merge.r1; rr++)
          h += heights[rr - 1];
        h = Math.min(h, pageBottom - yOf.get(r));
      }
      if (w <= 0 || h <= 0)
        continue;
      boxes.push({
        r,
        c: c2,
        x: x2,
        y: yOf.get(r),
        w,
        h,
        xf: gc?.xf,
        text: gc?.text ?? "",
        color: gc?.color,
        numeric: gc?.numeric ?? false,
        merged: !!merge
      });
    }
  }
  for (const b of boxes) {
    const xf = b.xf !== void 0 ? styles.cellXfs[b.xf] : void 0;
    const bg = fillColor(xf ? styles.fills[xf.fillId] : void 0);
    if (bg)
      page.fillRect(b.x, b.y, b.w, b.h, hexColor(bg));
  }
  for (const b of boxes) {
    const xf = b.xf !== void 0 ? styles.cellXfs[b.xf] : void 0;
    const border = xf ? styles.borders[xf.borderId] : void 0;
    if (!border)
      continue;
    const edge = (e, x0, y0, x1, y1) => {
      if (!e)
        return;
      const { width, dash } = borderStroke(e);
      page.line(x0, y0, x1, y1, hexColor(e.color ?? "#000000"), width, dash);
    };
    edge(border.top, b.x, b.y, b.x + b.w, b.y);
    edge(border.bottom, b.x, b.y + b.h, b.x + b.w, b.y + b.h);
    edge(border.left, b.x, b.y, b.x, b.y + b.h);
    edge(border.right, b.x + b.w, b.y, b.x + b.w, b.y + b.h);
  }
  for (const b of boxes) {
    if (b.text === "")
      continue;
    const xf = b.xf !== void 0 ? styles.cellXfs[b.xf] : void 0;
    const font = xf ? styles.fonts[xf.fontId] : void 0;
    const variant = pick(!!font?.bold, !!font?.italic);
    const size = font?.size ?? 11;
    const color = hexColor(b.color ?? font?.color ?? "#000000");
    let text2 = b.text.split(/\r\n|\r|\n/, 1)[0];
    let textW = textWidthPt(text2, variant.program, size);
    if (b.numeric && textW > b.w - 2 * CELL_PAD) {
      const hashW = textWidthPt("#", variant.program, size);
      const n = Math.floor((b.w - 2 * CELL_PAD) / hashW);
      if (n <= 0)
        continue;
      text2 = "#".repeat(n);
      textW = hashW * n;
    }
    let ha = xf?.horizontal;
    if (ha === "general" || ha === "fill")
      ha = void 0;
    if (ha === "centerContinuous")
      ha = "center";
    if (!ha)
      ha = b.numeric ? "right" : "left";
    let startX;
    if (ha === "right")
      startX = b.x + b.w - CELL_PAD - textW;
    else if (ha === "center")
      startX = b.x + (b.w - textW) / 2;
    else
      startX = b.x + CELL_PAD;
    let clipRight = b.x + b.w - CELL_PAD;
    if (ha === "left" && !b.merged && textW > b.w - 2 * CELL_PAD) {
      let cc = b.c + 1;
      while (cc <= grid.colCount) {
        const next = grid.cells[b.r - 1][cc - 1];
        if (next && next.text !== "" || grid.mergeAt(b.r, cc))
          break;
        clipRight = xs[cc];
        cc++;
      }
    }
    const clipLeft = ha === "left" ? b.x : b.x - 0.01;
    const upem = variant.program.unitsPerEm;
    const ascPt = variant.program.ascender / upem * size;
    const descPt = -variant.program.descender / upem * size;
    let baseline;
    if (xf?.vertical === "top")
      baseline = b.y + CELL_VPAD + ascPt;
    else if (xf?.vertical === "center")
      baseline = b.y + (b.h - ascPt - descPt) / 2 + ascPt;
    else
      baseline = b.y + b.h - CELL_VPAD - descPt;
    const glyphs = [];
    let penX = startX;
    for (const ch of text2) {
      const cp = ch.codePointAt(0);
      const { gid, advanceWidth } = variant.embedded.encode(cp);
      const adv = advanceWidth * size / upem;
      if (penX >= clipLeft && penX + adv <= clipRight + 0.01) {
        glyphs.push({ gid, codePoint: cp, xPt: penX, baselineFromTopPt: baseline });
      }
      penX += adv;
    }
    if (glyphs.length)
      page.glyphs(variant.embedded, size, color, glyphs);
  }
}

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/package.js
var PptxPackage = class _PptxPackage {
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo nao e um pacote OOXML valido (ZIP corrompido ou .ppt legado)");
    }
    const pkg = new _PptxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("ppt/presentation.xml")) {
      throw new Error("Pacote sem ppt/presentation.xml \u2014 nao e uma apresentacao valida");
    }
    return pkg;
  }
  save() {
    const zippable = {};
    for (const [path, data] of this.parts)
      zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }
  partNames() {
    return [...this.parts.keys()];
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const d = this.parts.get(path);
    return d === void 0 ? void 0 : new TextDecoder().decode(d);
  }
  setPartText(path, text2) {
    this.parts.set(path, new TextEncoder().encode(text2));
  }
  presentationXml() {
    const xml = this.getPartText("ppt/presentation.xml");
    if (xml === void 0)
      throw new Error("Pacote sem ppt/presentation.xml");
    return xml;
  }
  /** Resolve o caminho de uma parte alvo a partir de um relacionamento (.rels). */
  resolveRelTarget(fromPart, target) {
    if (target.startsWith("/"))
      return target.slice(1);
    let dir = fromPart.includes("/") ? fromPart.slice(0, fromPart.lastIndexOf("/")) : "";
    let t2 = target;
    while (t2.startsWith("../")) {
      t2 = t2.slice(3);
      dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
    }
    return dir ? `${dir}/${t2}` : t2;
  }
};

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/xml.js
var ENTITIES3 = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeEntities3(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e) => {
    if (e.startsWith("#x") || e.startsWith("#X"))
      return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#"))
      return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITIES3[e] ?? `&${e};`;
  });
}
function parseXml3(xml) {
  let i2 = 0;
  const n = xml.length;
  function error(msg) {
    throw new Error(`XML invalido @${i2}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml.startsWith("<?", i2)) {
        i2 = xml.indexOf("?>", i2);
        if (i2 < 0)
          error("?> nao fechado");
        i2 += 2;
      } else if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2);
        if (i2 < 0)
          error("--> nao fechado");
        i2 += 3;
      } else if (xml.startsWith("<!", i2)) {
        i2 = xml.indexOf(">", i2);
        if (i2 < 0)
          error("<! nao fechado");
        i2 += 1;
      } else
        break;
    }
  }
  function parseElement() {
    if (xml[i2] !== "<")
      error("esperava <");
    i2++;
    const nameStart = i2;
    while (i2 < n && !/[\s/>]/.test(xml[i2]))
      i2++;
    const name = xml.slice(nameStart, i2);
    const attrs = {};
    for (; ; ) {
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] === "/") {
        if (xml[i2 + 1] !== ">")
          error("esperava />");
        i2 += 2;
        return { name, attrs, children: [] };
      }
      if (xml[i2] === ">") {
        i2++;
        break;
      }
      const aStart = i2;
      while (i2 < n && xml[i2] !== "=" && !/\s/.test(xml[i2]))
        i2++;
      const aName = xml.slice(aStart, i2);
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      if (xml[i2] !== "=")
        error(`atributo ${aName} sem =`);
      i2++;
      while (i2 < n && /\s/.test(xml[i2]))
        i2++;
      const q = xml[i2];
      if (q !== '"' && q !== "'")
        error("valor de atributo sem aspas");
      i2++;
      const vStart = i2;
      i2 = xml.indexOf(q, i2);
      if (i2 < 0)
        error("aspas nao fechadas");
      attrs[aName] = decodeEntities3(xml.slice(vStart, i2));
      i2++;
    }
    const children = [];
    for (; ; ) {
      if (i2 >= n)
        error(`</${name}> ausente`);
      if (xml.startsWith("</", i2)) {
        i2 = xml.indexOf(">", i2) + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith("<!--", i2)) {
        i2 = xml.indexOf("-->", i2) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i2)) {
        const end = xml.indexOf("]]>", i2);
        children.push(xml.slice(i2 + 9, end));
        i2 = end + 3;
        continue;
      }
      if (xml[i2] === "<") {
        children.push(parseElement());
        continue;
      }
      const tStart = i2;
      while (i2 < n && xml[i2] !== "<")
        i2++;
      const text2 = decodeEntities3(xml.slice(tStart, i2));
      if (text2.length > 0)
        children.push(text2);
    }
  }
  skipMisc();
  return parseElement();
}
function childElements3(el, name) {
  return el.children.filter((c2) => typeof c2 !== "string" && (name === void 0 || c2.name === name));
}
function firstChild3(el, name) {
  return childElements3(el, name)[0];
}
function descend(el, name) {
  for (const c2 of el.children) {
    if (typeof c2 === "string")
      continue;
    if (c2.name === name)
      return c2;
    const found = descend(c2, name);
    if (found)
      return found;
  }
  return void 0;
}
function textContent2(el) {
  let out = "";
  for (const c2 of el.children)
    out += typeof c2 === "string" ? c2 : textContent2(c2);
  return out;
}

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/theme.js
var STD_MAP = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
function readTheme2(pkg, themePath2) {
  const colors = {};
  const xml = pkg.getPartText(themePath2);
  if (xml === void 0)
    return { colors };
  const root = parseXml3(xml);
  const themeEls = firstChild3(root, "a:themeElements");
  const scheme = themeEls ? firstChild3(themeEls, "a:clrScheme") : void 0;
  if (scheme) {
    for (const el of childElements3(scheme)) {
      const key = el.name.replace(/^a:/, "");
      const c2 = colorFromDml(childElements3(el)[0], { colors });
      if (c2)
        colors[key] = c2;
    }
  }
  for (const [alias, src] of Object.entries(STD_MAP))
    if (colors[src])
      colors[alias] = colors[src];
  const theme = { colors };
  const fontScheme = themeEls ? firstChild3(themeEls, "a:fontScheme") : void 0;
  if (fontScheme) {
    const majLatin = firstChild3(fontScheme, "a:majorFont");
    const minLatin = firstChild3(fontScheme, "a:minorFont");
    const major = majLatin ? firstChild3(majLatin, "a:latin")?.attrs["typeface"] : void 0;
    const minor = minLatin ? firstChild3(minLatin, "a:latin")?.attrs["typeface"] : void 0;
    if (major || minor) {
      theme.fonts = {};
      if (major)
        theme.fonts.major = major;
      if (minor)
        theme.fonts.minor = minor;
    }
  }
  return theme;
}
function colorFromDml(el, theme) {
  if (!el)
    return void 0;
  let base;
  if (el.name === "a:srgbClr")
    base = "#" + (el.attrs["val"] ?? "000000");
  else if (el.name === "a:sysClr")
    base = "#" + (el.attrs["lastClr"] ?? "000000");
  else if (el.name === "a:prstClr")
    base = PRESET[el.attrs["val"] ?? "black"] ?? "#000000";
  else if (el.name === "a:schemeClr") {
    const v = el.attrs["val"] ?? "";
    base = theme.colors[v] ?? theme.colors[STD_MAP[v] ?? v] ?? "#000000";
  }
  if (base === void 0)
    return void 0;
  for (const mod of childElements3(el)) {
    const val = mod.attrs["val"] !== void 0 ? parseInt(mod.attrs["val"], 10) / 1e5 : void 0;
    if (val === void 0)
      continue;
    if (mod.name === "a:shade")
      base = scaleLum(base, val);
    else if (mod.name === "a:tint")
      base = mixWhite(base, val);
    else if (mod.name === "a:lumMod")
      base = scaleLum(base, val);
    else if (mod.name === "a:lumOff")
      base = offsetLum(base, val);
  }
  return base;
}
function solidFillColor(parent, theme) {
  const sf = firstChild3(parent, "a:solidFill");
  if (!sf)
    return void 0;
  return colorFromDml(childElements3(sf)[0], theme);
}
function rgb(hex2) {
  const m = /#?([0-9a-fA-F]{6})/.exec(hex2);
  if (!m)
    return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function hex(r, g, b) {
  const c2 = (x2) => Math.round(Math.min(255, Math.max(0, x2))).toString(16).padStart(2, "0");
  return "#" + c2(r) + c2(g) + c2(b);
}
function scaleLum(h, f) {
  const [r, g, b] = rgb(h);
  return hex(r * f, g * f, b * f);
}
function offsetLum(h, f) {
  const [r, g, b] = rgb(h);
  return hex(r + 255 * f, g + 255 * f, b + 255 * f);
}
function mixWhite(h, f) {
  const [r, g, b] = rgb(h);
  return hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}
var PRESET = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  gray: "#808080",
  grey: "#808080"
};

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/text-style.js
var LEVEL_NAMES = [
  "a:lvl1pPr",
  "a:lvl2pPr",
  "a:lvl3pPr",
  "a:lvl4pPr",
  "a:lvl5pPr",
  "a:lvl6pPr",
  "a:lvl7pPr",
  "a:lvl8pPr",
  "a:lvl9pPr"
];
function parseTxStyleLevels(el, theme) {
  const levels = Array.from({ length: 9 }, () => ({}));
  if (!el)
    return levels;
  const defPPr = firstChild3(el, "a:defPPr");
  const base = defPPr ? parsePPrLevel(defPPr, theme) : {};
  for (let i2 = 0; i2 < 9; i2++) {
    const lvlEl = firstChild3(el, LEVEL_NAMES[i2]);
    levels[i2] = lvlEl ? { ...base, ...parsePPrLevel(lvlEl, theme) } : { ...base };
  }
  return levels;
}
function parsePPrLevel(pPr, theme) {
  const lvl = {};
  if (pPr.attrs["algn"])
    lvl.align = pPr.attrs["algn"];
  if (pPr.attrs["marL"] !== void 0)
    lvl.marL = parseInt(pPr.attrs["marL"], 10);
  if (pPr.attrs["indent"] !== void 0)
    lvl.indent = parseInt(pPr.attrs["indent"], 10);
  const buChar = firstChild3(pPr, "a:buChar");
  if (buChar?.attrs["char"])
    lvl.buChar = buChar.attrs["char"];
  const buAuto = firstChild3(pPr, "a:buAutoNum");
  if (buAuto)
    lvl.buAutoNum = buAuto.attrs["type"] ?? "arabicPeriod";
  if (firstChild3(pPr, "a:buNone"))
    lvl.buNone = true;
  const defRPr = firstChild3(pPr, "a:defRPr");
  if (defRPr) {
    if (defRPr.attrs["sz"])
      lvl.sz = parseInt(defRPr.attrs["sz"], 10) / 100;
    if (defRPr.attrs["b"] !== void 0)
      lvl.bold = defRPr.attrs["b"] === "1";
    if (defRPr.attrs["i"] !== void 0)
      lvl.italic = defRPr.attrs["i"] === "1";
    const sf = firstChild3(defRPr, "a:solidFill");
    if (sf) {
      const c2 = colorFromDml(childElements3(sf)[0], theme);
      if (c2)
        lvl.color = c2;
    }
    const latin = firstChild3(defRPr, "a:latin");
    if (latin?.attrs["typeface"])
      lvl.font = latin.attrs["typeface"];
  }
  return lvl;
}
function mergeStyleLevels(...layers) {
  const out = Array.from({ length: 9 }, () => ({}));
  for (const layer of layers) {
    for (let i2 = 0; i2 < 9; i2++) {
      const src = layer[i2];
      if (!src)
        continue;
      const dst = out[i2];
      if (src.sz !== void 0)
        dst.sz = src.sz;
      if (src.bold !== void 0)
        dst.bold = src.bold;
      if (src.italic !== void 0)
        dst.italic = src.italic;
      if (src.color !== void 0)
        dst.color = src.color;
      if (src.font !== void 0)
        dst.font = src.font;
      if (src.align !== void 0)
        dst.align = src.align;
      if (src.marL !== void 0)
        dst.marL = src.marL;
      if (src.indent !== void 0)
        dst.indent = src.indent;
      if (src.buChar !== void 0 || src.buAutoNum !== void 0 || src.buNone) {
        delete dst.buChar;
        delete dst.buAutoNum;
        delete dst.buNone;
        if (src.buChar !== void 0)
          dst.buChar = src.buChar;
        if (src.buAutoNum !== void 0)
          dst.buAutoNum = src.buAutoNum;
        if (src.buNone)
          dst.buNone = true;
      }
    }
  }
  return out;
}
function resolveFontAlias(font, theme) {
  if (font === void 0)
    return void 0;
  if (font.startsWith("+mj"))
    return theme.fonts?.major;
  if (font.startsWith("+mn"))
    return theme.fonts?.minor;
  return font;
}
function applyTextStyles(tb, levels, theme) {
  for (const p of tb.paragraphs) {
    const lvl = levels[Math.min(p.level ?? 0, 8)] ?? {};
    if (p.align === void 0 && lvl.align !== void 0)
      p.align = lvl.align;
    if (p.marL === void 0 && lvl.marL !== void 0)
      p.marL = lvl.marL;
    if (p.indent === void 0 && lvl.indent !== void 0)
      p.indent = lvl.indent;
    if (p.bullet === void 0) {
      if (lvl.buChar !== void 0) {
        p.bullet = true;
        p.bulletChar = lvl.buChar;
      } else if (lvl.buAutoNum !== void 0) {
        p.bullet = true;
        p.bulletAutoNum = lvl.buAutoNum;
      } else if (lvl.buNone)
        p.bullet = false;
    } else if (p.bullet && p.bulletChar === void 0 && p.bulletAutoNum === void 0) {
      if (lvl.buChar !== void 0)
        p.bulletChar = lvl.buChar;
      else if (lvl.buAutoNum !== void 0)
        p.bulletAutoNum = lvl.buAutoNum;
    }
    for (const r of p.runs) {
      if (r.sz === void 0 && lvl.sz !== void 0)
        r.sz = lvl.sz;
      if (r.bold === void 0 && lvl.bold !== void 0)
        r.bold = lvl.bold;
      if (r.italic === void 0 && lvl.italic !== void 0)
        r.italic = lvl.italic;
      if (r.color === void 0 && lvl.color !== void 0)
        r.color = lvl.color;
      if (r.font === void 0 && lvl.font !== void 0) {
        const f = resolveFontAlias(lvl.font, theme);
        if (f !== void 0)
          r.font = f;
      } else if (r.font !== void 0 && r.font.startsWith("+")) {
        const f = resolveFontAlias(r.font, theme);
        if (f !== void 0)
          r.font = f;
      }
    }
  }
}
function masterStyleFor(ctx, phType) {
  if (phType === "title" || phType === "ctrTitle")
    return ctx.titleStyle;
  if (phType === "body" || phType === "subTitle")
    return ctx.bodyStyle;
  return ctx.otherStyle;
}
function applyShapeTextCascade(sh, ctx, theme, phKeys) {
  if (!sh.txBody)
    return;
  const layers = [ctx.defaultStyle, masterStyleFor(ctx, sh.phType)];
  if (sh.styleFontColor !== void 0 || sh.styleFontIdx !== void 0) {
    const font = sh.styleFontIdx === "major" ? theme.fonts?.major : sh.styleFontIdx === "minor" ? theme.fonts?.minor : void 0;
    const lvl = {};
    if (sh.styleFontColor !== void 0)
      lvl.color = sh.styleFontColor;
    if (font !== void 0)
      lvl.font = font;
    layers.push(Array.from({ length: 9 }, () => ({ ...lvl })));
  }
  for (const map of [ctx.masterPh, ctx.layoutPh]) {
    for (const key of phKeys) {
      const ls2 = map.get(key);
      if (ls2) {
        layers.push(ls2);
        break;
      }
    }
  }
  if (sh.txBody.lstStyle)
    layers.push(sh.txBody.lstStyle);
  applyTextStyles(sh.txBody, mergeStyleLevels(...layers), theme);
}

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/read.js
function readRels2(pkg, relsPart, ownerPart) {
  const map = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(relsPart);
  if (xml === void 0)
    return map;
  const root = parseXml3(xml);
  for (const rel of childElements3(root, "Relationship")) {
    const id = rel.attrs["Id"];
    const target = rel.attrs["Target"];
    const mode = rel.attrs["TargetMode"];
    if (id === void 0 || target === void 0)
      continue;
    if (mode === "External")
      map.set(id, target);
    else
      map.set(id, pkg.resolveRelTarget(ownerPart, target));
  }
  return map;
}
function relsPathFor2(part) {
  const slash = part.lastIndexOf("/");
  const dir = part.slice(0, slash);
  const file = part.slice(slash + 1);
  return `${dir}/_rels/${file}.rels`;
}
function readPresentation(pkg) {
  const root = parseXml3(pkg.presentationXml());
  const rels = readRels2(pkg, "ppt/_rels/presentation.xml.rels", "ppt/presentation.xml");
  const sz = firstChild3(root, "p:sldSz");
  const slideW = sz?.attrs["cx"] !== void 0 ? parseInt(sz.attrs["cx"], 10) : 9144e3;
  const slideH = sz?.attrs["cy"] !== void 0 ? parseInt(sz.attrs["cy"], 10) : 5143500;
  const slides = [];
  const lst = firstChild3(root, "p:sldIdLst");
  if (lst)
    for (const s of childElements3(lst, "p:sldId")) {
      const rId = s.attrs["r:id"] ?? "";
      slides.push({ id: s.attrs["id"] ?? "", rId, target: rels.get(rId) });
    }
  const pres = { slideW, slideH, slides };
  if (sz?.attrs["type"])
    pres.sizeType = sz.attrs["type"];
  return pres;
}
function themeFor(pkg, part) {
  const masterPath = findRelTarget(pkg, part, "slideMaster") ?? findRelTarget(pkg, findRelTarget(pkg, part, "slideLayout") ?? "", "slideMaster");
  const themePath2 = masterPath ? findRelTarget(pkg, masterPath, "theme") : findRelTarget(pkg, "ppt/presentation.xml", "theme");
  return readTheme2(pkg, themePath2 ?? "ppt/theme/theme1.xml");
}
function findRelTarget(pkg, part, typeSuffix) {
  if (!part)
    return void 0;
  const xml = pkg.getPartText(relsPathFor2(part));
  if (xml === void 0)
    return void 0;
  const root = parseXml3(xml);
  for (const rel of childElements3(root, "Relationship")) {
    if ((rel.attrs["Type"] ?? "").endsWith("/" + typeSuffix)) {
      return pkg.resolveRelTarget(part, rel.attrs["Target"] ?? "");
    }
  }
  return void 0;
}
function readSlide(pkg, slidePath) {
  const xml = pkg.getPartText(slidePath);
  if (xml === void 0)
    throw new Error(`Pacote sem ${slidePath}`);
  const root = parseXml3(xml);
  const theme = themeFor(pkg, slidePath);
  const slideRels = readRels2(pkg, relsPathFor2(slidePath), slidePath);
  const cSld = firstChild3(root, "p:cSld");
  const spTree = cSld ? firstChild3(cSld, "p:spTree") : void 0;
  const shapes = spTree ? readShapes(spTree, theme, pkg, slideRels) : [];
  const phMap = placeholderXfrmMap(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.xfrm && sh.phType !== void 0) {
      const x2 = phMap.get(phKey(sh.phType, sh.phIdx)) ?? phMap.get(phKey(sh.phType)) ?? phMap.get("idx:" + (sh.phIdx ?? ""));
      if (x2)
        sh.xfrm = x2;
    }
  }
  const styleCtx = buildTextStyleContext(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.txBody)
      continue;
    const keys = sh.phType !== void 0 || sh.phIdx !== void 0 ? [phKey(sh.phType, sh.phIdx), phKey(sh.phType), "idx:" + (sh.phIdx ?? "")] : [];
    applyShapeTextCascade(sh, styleCtx, theme, keys);
  }
  const slide = { shapes };
  const bgEl = cSld ? firstChild3(cSld, "p:bg") : void 0;
  if (bgEl) {
    const bgPr = firstChild3(bgEl, "p:bgPr");
    if (bgPr) {
      const c2 = solidFillColor(bgPr, theme);
      if (c2)
        slide.bg = { type: "solid", color: c2 };
      const blip = descend(bgPr, "a:blip");
      if (blip) {
        const img = resolveBlip(blip, pkg, slideRels);
        if (img)
          slide.bgImage = img;
      }
    }
  }
  const timing = firstChild3(root, "p:timing");
  if (timing) {
    const anims = parseTiming(timing);
    if (anims.length)
      slide.animations = anims;
  }
  const transEl = firstChild3(root, "p:transition");
  if (transEl)
    slide.transition = parseTransition(transEl);
  return slide;
}
function parseTransition(el) {
  const spd = el.attrs["spd"] ?? "med";
  const durMs = spd === "fast" ? 300 : spd === "slow" ? 1e3 : 500;
  for (const c2 of childElements3(el)) {
    switch (c2.name) {
      case "p:fade":
        return { type: "fade", durMs };
      case "p:push":
        return { type: "push", durMs, dir: c2.attrs["dir"] };
      case "p:cover":
        return { type: "cover", durMs, dir: c2.attrs["dir"] };
      case "p:wipe":
        return { type: "wipe", durMs, dir: c2.attrs["dir"] };
      case "p:dissolve":
        return { type: "dissolve", durMs };
      case "p:blinds":
        return { type: "blinds", durMs, dir: c2.attrs["dir"] };
      case "p:split":
        return { type: "split", durMs, dir: c2.attrs["dir"] };
      case "p:circle":
        return { type: "circle", durMs };
    }
  }
  return { type: "fade", durMs };
}
function parseTiming(timing) {
  const out = [];
  const mainSeq = deepFindAttr(timing, "p:cTn", "nodeType", "mainSeq");
  if (!mainSeq)
    return out;
  const childList = firstChild3(mainSeq, "p:childTnLst");
  if (!childList)
    return out;
  let acc = 0;
  for (const par of childElements3(childList, "p:par")) {
    const cTn = firstChild3(par, "p:cTn");
    if (!cTn)
      continue;
    const stDelay = readCondDelay(cTn);
    acc += stDelay;
    const inner = firstChild3(cTn, "p:childTnLst");
    if (!inner)
      continue;
    for (const ipar of childElements3(inner, "p:par")) {
      const icTn = firstChild3(ipar, "p:cTn");
      if (!icTn)
        continue;
      if (icTn.attrs["presetClass"] !== "entr")
        continue;
      const localDelay = readCondDelay(icTn);
      const clickGated = icTn.attrs["nodeType"] === "clickEffect";
      const grandKids = firstChild3(icTn, "p:childTnLst");
      if (!grandKids)
        continue;
      let type = "appear";
      let durMs = 500;
      let spid;
      for (const k of childElements3(grandKids)) {
        if (k.name === "p:animEffect") {
          if (k.attrs["filter"]?.includes("fade"))
            type = "fade";
          const cBhvr = firstChild3(k, "p:cBhvr");
          const innerCTn = cBhvr ? firstChild3(cBhvr, "p:cTn") : void 0;
          if (innerCTn?.attrs["dur"])
            durMs = parseInt(innerCTn.attrs["dur"], 10);
          const tgt = cBhvr ? firstChild3(cBhvr, "p:tgtEl") : void 0;
          const spTgt = tgt ? firstChild3(tgt, "p:spTgt") : void 0;
          if (spTgt?.attrs["spid"])
            spid = spTgt.attrs["spid"];
        } else if (k.name === "p:set" && !spid) {
          const cBhvr = firstChild3(k, "p:cBhvr");
          const tgt = cBhvr ? firstChild3(cBhvr, "p:tgtEl") : void 0;
          const spTgt = tgt ? firstChild3(tgt, "p:spTgt") : void 0;
          if (spTgt?.attrs["spid"])
            spid = spTgt.attrs["spid"];
        }
      }
      if (!spid)
        continue;
      out.push({ spid, delayMs: acc + localDelay, durMs, type, clickGated });
    }
  }
  return out;
}
function readCondDelay(cTn) {
  const st = firstChild3(cTn, "p:stCondLst");
  if (!st)
    return 0;
  const cond = firstChild3(st, "p:cond");
  if (!cond)
    return 0;
  const d = cond.attrs["delay"];
  if (!d || d === "indefinite")
    return 0;
  return parseInt(d, 10) || 0;
}
function deepFindAttr(el, name, attr, val) {
  for (const c2 of el.children) {
    if (typeof c2 === "string")
      continue;
    if (c2.name === name && c2.attrs[attr] === val)
      return c2;
    const f = deepFindAttr(c2, name, attr, val);
    if (f)
      return f;
  }
  return void 0;
}
function phKey(type, idx) {
  const t2 = type === "ctrTitle" ? "title" : type ?? "body";
  return idx !== void 0 ? `${t2}#${idx}` : t2;
}
function placeholderXfrmMap(pkg, slidePath, theme) {
  const map = /* @__PURE__ */ new Map();
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  for (const part of [masterPath, layoutPath]) {
    if (!part)
      continue;
    const xml = pkg.getPartText(part);
    if (xml === void 0)
      continue;
    const tree = descend(parseXml3(xml), "p:spTree");
    if (!tree)
      continue;
    for (const sh of readShapes(tree, theme, pkg, /* @__PURE__ */ new Map())) {
      if (sh.phType === void 0 && sh.phIdx === void 0)
        continue;
      if (!sh.xfrm)
        continue;
      map.set(phKey(sh.phType, sh.phIdx), sh.xfrm);
      map.set(phKey(sh.phType), sh.xfrm);
      if (sh.phIdx !== void 0)
        map.set("idx:" + sh.phIdx, sh.xfrm);
    }
  }
  return map;
}
function emptyLevels() {
  return Array.from({ length: 9 }, () => ({}));
}
function buildTextStyleContext(pkg, slidePath, theme) {
  const ctx = {
    defaultStyle: emptyLevels(),
    titleStyle: emptyLevels(),
    bodyStyle: emptyLevels(),
    otherStyle: emptyLevels(),
    masterPh: /* @__PURE__ */ new Map(),
    layoutPh: /* @__PURE__ */ new Map()
  };
  const presXml = pkg.getPartText("ppt/presentation.xml");
  if (presXml !== void 0) {
    const dts = firstChild3(parseXml3(presXml), "p:defaultTextStyle");
    if (dts)
      ctx.defaultStyle = parseTxStyleLevels(dts, theme);
  }
  const layoutPath = findRelTarget(pkg, slidePath, "slideLayout");
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, "slideMaster") : void 0;
  if (masterPath) {
    const xml = pkg.getPartText(masterPath);
    if (xml !== void 0) {
      const root = parseXml3(xml);
      const tx2 = firstChild3(root, "p:txStyles");
      if (tx2) {
        ctx.titleStyle = parseTxStyleLevels(firstChild3(tx2, "p:titleStyle"), theme);
        ctx.bodyStyle = parseTxStyleLevels(firstChild3(tx2, "p:bodyStyle"), theme);
        ctx.otherStyle = parseTxStyleLevels(firstChild3(tx2, "p:otherStyle"), theme);
      }
      collectPhStyles(root, theme, pkg, ctx.masterPh);
    }
  }
  if (layoutPath) {
    const xml = pkg.getPartText(layoutPath);
    if (xml !== void 0)
      collectPhStyles(parseXml3(xml), theme, pkg, ctx.layoutPh);
  }
  return ctx;
}
function collectPhStyles(root, theme, pkg, map) {
  const tree = descend(root, "p:spTree");
  if (!tree)
    return;
  for (const sh of readShapes(tree, theme, pkg, /* @__PURE__ */ new Map())) {
    if (sh.phType === void 0 && sh.phIdx === void 0)
      continue;
    const ls2 = sh.txBody?.lstStyle;
    if (!ls2)
      continue;
    map.set(phKey(sh.phType, sh.phIdx), ls2);
    if (!map.has(phKey(sh.phType)))
      map.set(phKey(sh.phType), ls2);
    if (sh.phIdx !== void 0 && !map.has("idx:" + sh.phIdx))
      map.set("idx:" + sh.phIdx, ls2);
  }
}
function readShapes(spTree, theme, pkg, rels) {
  const out = [];
  for (const c2 of childElements3(spTree)) {
    if (c2.name === "p:sp" || c2.name === "p:cxnSp")
      out.push(readShape(c2, theme, pkg, rels));
    else if (c2.name === "p:pic")
      out.push(readPic(c2, theme, pkg, rels));
    else if (c2.name === "p:graphicFrame") {
      const gf = readGraphicFrame(c2, pkg, rels);
      if (gf)
        out.push(gf);
    } else if (c2.name === "p:grpSp") {
      out.push(...readGroup(c2, theme, pkg, rels));
    }
  }
  return out;
}
function readGroup(grp, theme, pkg, rels) {
  const children = readShapes(grp, theme, pkg, rels);
  const grpSpPr = firstChild3(grp, "p:grpSpPr");
  const xfrmEl = grpSpPr ? firstChild3(grpSpPr, "a:xfrm") : void 0;
  if (!xfrmEl)
    return children;
  const num = (el, a, dflt2) => el?.attrs[a] !== void 0 ? parseInt(el.attrs[a], 10) : dflt2;
  const off = firstChild3(xfrmEl, "a:off");
  const ext = firstChild3(xfrmEl, "a:ext");
  const chOff = firstChild3(xfrmEl, "a:chOff");
  const chExt = firstChild3(xfrmEl, "a:chExt");
  const gx = num(off, "x", 0), gy = num(off, "y", 0);
  const gcx = num(ext, "cx", 0), gcy = num(ext, "cy", 0);
  const cox = num(chOff, "x", gx), coy = num(chOff, "y", gy);
  const cex = num(chExt, "cx", gcx), cey = num(chExt, "cy", gcy);
  const sx = cex !== 0 ? gcx / cex : 1;
  const sy = cey !== 0 ? gcy / cey : 1;
  const rotRaw = xfrmEl.attrs["rot"] ? parseInt(xfrmEl.attrs["rot"], 10) : 0;
  const flipH = xfrmEl.attrs["flipH"] === "1";
  const flipV = xfrmEl.attrs["flipV"] === "1";
  const gCenterX = gx + gcx / 2, gCenterY = gy + gcy / 2;
  for (const sh of children) {
    const x2 = sh.xfrm;
    if (!x2)
      continue;
    x2.x = gx + (x2.x - cox) * sx;
    x2.y = gy + (x2.y - coy) * sy;
    x2.cx = x2.cx * sx;
    x2.cy = x2.cy * sy;
    if (flipH) {
      x2.x = 2 * gCenterX - (x2.x + x2.cx);
      x2.flipH = !x2.flipH || void 0;
      if (x2.rot)
        x2.rot = -x2.rot;
    }
    if (flipV) {
      x2.y = 2 * gCenterY - (x2.y + x2.cy);
      x2.flipV = !x2.flipV || void 0;
      if (x2.rot)
        x2.rot = -x2.rot;
    }
    if (rotRaw) {
      const a = rotRaw / 6e4 * Math.PI / 180;
      const dx = x2.x + x2.cx / 2 - gCenterX;
      const dy = x2.y + x2.cy / 2 - gCenterY;
      const ncx = gCenterX + dx * Math.cos(a) - dy * Math.sin(a);
      const ncy = gCenterY + dx * Math.sin(a) + dy * Math.cos(a);
      x2.x = ncx - x2.cx / 2;
      x2.y = ncy - x2.cy / 2;
      x2.rot = (x2.rot ?? 0) + rotRaw || void 0;
    }
    if (sh.lineWidth !== void 0 && sx > 0 && sy > 0) {
      sh.lineWidth = Math.round(sh.lineWidth * Math.sqrt(sx * sy));
    }
  }
  return children;
}
function readGraphicFrame(gf, pkg, rels) {
  const nvPr = firstChild3(gf, "p:nvGraphicFramePr");
  const cNvPr = nvPr ? firstChild3(nvPr, "p:cNvPr") : void 0;
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  const xfrm = firstChild3(gf, "p:xfrm") ?? firstChild3(gf, "a:xfrm");
  if (xfrm)
    shape.xfrm = parseXfrm(xfrm);
  const graphic = firstChild3(gf, "a:graphic");
  const data = graphic ? firstChild3(graphic, "a:graphicData") : void 0;
  if (!data)
    return shape;
  const chartEl = firstChild3(data, "c:chart");
  if (chartEl) {
    const rid = chartEl.attrs["r:id"] ?? chartEl.attrs["id"];
    if (rid) {
      const target = rels.get(rid);
      if (target) {
        const xml = pkg.getPartText(target);
        if (xml)
          shape.chartXml = xml;
      }
    }
  }
  const tblEl = firstChild3(data, "a:tbl");
  if (tblEl)
    shape.table = readTable2(
      tblEl,
      /* theme */
      { colors: {} }
    );
  return shape;
}
function readTable2(tbl, theme) {
  const gridEl = firstChild3(tbl, "a:tblGrid");
  const colWidthsEmu = [];
  if (gridEl) {
    for (const gc of childElements3(gridEl, "a:gridCol")) {
      colWidthsEmu.push(gc.attrs["w"] ? parseInt(gc.attrs["w"], 10) : 0);
    }
  }
  const rows = [];
  for (const tr of childElements3(tbl, "a:tr")) {
    const heightEmu = tr.attrs["h"] ? parseInt(tr.attrs["h"], 10) : 0;
    const cells = [];
    for (const tc of childElements3(tr, "a:tc")) {
      const cell = {};
      if (tc.attrs["gridSpan"])
        cell.gridSpan = parseInt(tc.attrs["gridSpan"], 10);
      if (tc.attrs["rowSpan"])
        cell.rowSpan = parseInt(tc.attrs["rowSpan"], 10);
      if (tc.attrs["hMerge"] === "1")
        cell.hMerge = true;
      if (tc.attrs["vMerge"] === "1")
        cell.vMerge = true;
      const txBody = firstChild3(tc, "a:txBody");
      if (txBody)
        cell.txBody = readTxBody(txBody, theme);
      const tcPr = firstChild3(tc, "a:tcPr");
      if (tcPr) {
        if (tcPr.attrs["anchor"])
          cell.anchor = tcPr.attrs["anchor"];
        const fill = solidFillColor(tcPr, theme);
        if (fill)
          cell.fill = fill;
        let bw = 0;
        let bc;
        for (const side of ["a:lnL", "a:lnR", "a:lnT", "a:lnB"]) {
          const ln2 = firstChild3(tcPr, side);
          if (!ln2)
            continue;
          const w = ln2.attrs["w"] ? parseInt(ln2.attrs["w"], 10) : 0;
          if (w > bw)
            bw = w;
          if (!bc) {
            const fillEl = firstChild3(ln2, "a:solidFill");
            const srgb = fillEl ? firstChild3(fillEl, "a:srgbClr") : void 0;
            if (srgb?.attrs["val"])
              bc = "#" + srgb.attrs["val"];
          }
        }
        if (bw)
          cell.borderWidth = bw;
        if (bc)
          cell.borderColor = bc;
      }
      cells.push(cell);
    }
    rows.push({ heightEmu, cells });
  }
  return { colWidthsEmu, rows };
}
function readShape(sp, theme, pkg, rels) {
  const nvSpPr = firstChild3(sp, "p:nvSpPr") ?? firstChild3(sp, "p:nvCxnSpPr");
  const cNvPr = nvSpPr ? firstChild3(nvSpPr, "p:cNvPr") : void 0;
  const cNvSpPr = nvSpPr ? firstChild3(nvSpPr, "p:cNvSpPr") : void 0;
  const nvPr = nvSpPr ? firstChild3(nvSpPr, "p:nvPr") : void 0;
  const ph = nvPr ? firstChild3(nvPr, "p:ph") : void 0;
  const spPr = firstChild3(sp, "p:spPr");
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  if (cNvSpPr?.attrs["txBox"] === "1")
    shape.isTextBox = true;
  if (ph) {
    if (ph.attrs["type"])
      shape.phType = ph.attrs["type"];
    if (ph.attrs["idx"])
      shape.phIdx = ph.attrs["idx"];
  }
  if (ph && shape.phType === void 0)
    shape.phType = "body";
  if (spPr) {
    const xfrm = firstChild3(spPr, "a:xfrm");
    if (xfrm)
      shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild3(spPr, "a:prstGeom");
    if (geom?.attrs["prst"])
      shape.geom = geom.attrs["prst"];
    if (firstChild3(spPr, "a:noFill"))
      shape.fill = { type: "none" };
    else {
      const c2 = solidFillColor(spPr, theme);
      if (c2)
        shape.fill = { type: "solid", color: c2 };
    }
    if (!shape.fill) {
      const grad = firstChild3(spPr, "a:gradFill");
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g)
          shape.fill = g;
      }
    }
    if (pkg && rels) {
      const bf = firstChild3(spPr, "a:blipFill");
      const blip = bf ? firstChild3(bf, "a:blip") : void 0;
      if (blip) {
        const img = resolveBlip(blip, pkg, rels);
        if (img)
          shape.fillImage = img;
      }
    }
    const sf = firstChild3(spPr, "a:solidFill");
    if (sf) {
      const alphaEl = descend(sf, "a:alpha");
      if (alphaEl?.attrs["val"])
        shape.fillAlpha = parseInt(alphaEl.attrs["val"], 10) / 1e5;
    }
    const ln2 = firstChild3(spPr, "a:ln");
    if (ln2) {
      const lc2 = solidFillColor(ln2, theme);
      if (lc2)
        shape.lineColor = lc2;
      if (ln2.attrs["w"])
        shape.lineWidth = parseInt(ln2.attrs["w"], 10);
      const dash = firstChild3(ln2, "a:prstDash");
      if (dash?.attrs["val"])
        shape.lineDash = dash.attrs["val"];
    }
    const eff = firstChild3(spPr, "a:effectLst");
    const shd = eff ? firstChild3(eff, "a:outerShdw") : void 0;
    if (shd) {
      const blurRad = shd.attrs["blurRad"] ? parseInt(shd.attrs["blurRad"], 10) : 0;
      const dist = shd.attrs["dist"] ? parseInt(shd.attrs["dist"], 10) : 0;
      const dirDeg = (shd.attrs["dir"] ? parseInt(shd.attrs["dir"], 10) : 54e5) / 6e4;
      const srgb = firstChild3(shd, "a:srgbClr");
      const scheme = firstChild3(shd, "a:schemeClr");
      let color = "#000000", alpha = 1;
      const colorEl = srgb ?? scheme;
      if (colorEl) {
        if (srgb?.attrs["val"])
          color = "#" + srgb.attrs["val"];
        const aEl = firstChild3(colorEl, "a:alpha");
        if (aEl?.attrs["val"])
          alpha = parseInt(aEl.attrs["val"], 10) / 1e5;
      }
      shape.shadow = { color, blurRad, dist, dirDeg, alpha };
    }
  }
  const styleEl = firstChild3(sp, "p:style");
  if (styleEl) {
    const refColor = (name) => {
      const ref = firstChild3(styleEl, name);
      if (!ref || ref.attrs["idx"] === "0")
        return void 0;
      return colorFromDml(childElements3(ref)[0], theme);
    };
    if (!shape.fill && !shape.fillImage) {
      const fc = refColor("a:fillRef");
      if (fc)
        shape.fill = { type: "solid", color: fc };
    }
    if (shape.lineColor === void 0) {
      const lc2 = refColor("a:lnRef");
      if (lc2)
        shape.lineColor = lc2;
    }
    const fontRef = firstChild3(styleEl, "a:fontRef");
    if (fontRef) {
      const fc = colorFromDml(childElements3(fontRef)[0], theme);
      if (fc)
        shape.styleFontColor = fc;
      if (fontRef.attrs["idx"])
        shape.styleFontIdx = fontRef.attrs["idx"];
    }
  }
  const txBody = firstChild3(sp, "p:txBody");
  if (txBody)
    shape.txBody = readTxBody(txBody, theme, rels);
  return shape;
}
function parseGradFill(grad, theme) {
  const gsLst = firstChild3(grad, "a:gsLst");
  if (!gsLst)
    return void 0;
  const stops = [];
  for (const gs of childElements3(gsLst, "a:gs")) {
    const pos = gs.attrs["pos"] !== void 0 ? parseInt(gs.attrs["pos"], 10) / 1e5 : 0;
    const color = colorFromDml(childElements3(gs)[0], theme);
    if (color)
      stops.push({ pos: Math.max(0, Math.min(1, pos)), color });
  }
  if (stops.length < 2)
    return void 0;
  stops.sort((a, b) => a.pos - b.pos);
  const lin = firstChild3(grad, "a:lin");
  const angleDeg = lin?.attrs["ang"] !== void 0 ? parseInt(lin.attrs["ang"], 10) / 6e4 : 0;
  return { type: "gradient", stops, angleDeg };
}
function parseXfrm(el) {
  const off = firstChild3(el, "a:off");
  const ext = firstChild3(el, "a:ext");
  const x2 = {
    x: off?.attrs["x"] !== void 0 ? parseInt(off.attrs["x"], 10) : 0,
    y: off?.attrs["y"] !== void 0 ? parseInt(off.attrs["y"], 10) : 0,
    cx: ext?.attrs["cx"] !== void 0 ? parseInt(ext.attrs["cx"], 10) : 0,
    cy: ext?.attrs["cy"] !== void 0 ? parseInt(ext.attrs["cy"], 10) : 0
  };
  if (el.attrs["rot"])
    x2.rot = parseInt(el.attrs["rot"], 10);
  if (el.attrs["flipH"] === "1")
    x2.flipH = true;
  if (el.attrs["flipV"] === "1")
    x2.flipV = true;
  return x2;
}
function readTxBody(el, theme, rels) {
  const bodyPr = firstChild3(el, "a:bodyPr");
  const tb = { paragraphs: [] };
  if (bodyPr) {
    if (bodyPr.attrs["anchor"])
      tb.anchor = bodyPr.attrs["anchor"];
    if (bodyPr.attrs["wrap"])
      tb.wrap = bodyPr.attrs["wrap"];
    if (bodyPr.attrs["lIns"] !== void 0)
      tb.insL = parseInt(bodyPr.attrs["lIns"], 10);
    if (bodyPr.attrs["tIns"] !== void 0)
      tb.insT = parseInt(bodyPr.attrs["tIns"], 10);
    if (bodyPr.attrs["rIns"] !== void 0)
      tb.insR = parseInt(bodyPr.attrs["rIns"], 10);
    if (bodyPr.attrs["bIns"] !== void 0)
      tb.insB = parseInt(bodyPr.attrs["bIns"], 10);
    const na = firstChild3(bodyPr, "a:normAutofit");
    if (na) {
      if (na.attrs["fontScale"] !== void 0)
        tb.fontScale = parseInt(na.attrs["fontScale"], 10) / 1e5;
      if (na.attrs["lnSpcReduction"] !== void 0)
        tb.lnSpcReduction = parseInt(na.attrs["lnSpcReduction"], 10) / 1e5;
    }
  }
  const lst = firstChild3(el, "a:lstStyle");
  if (lst && childElements3(lst).length > 0)
    tb.lstStyle = parseTxStyleLevels(lst, theme);
  for (const p of childElements3(el, "a:p"))
    tb.paragraphs.push(readParagraph2(p, theme, rels));
  return tb;
}
function readParagraph2(p, theme, rels) {
  const para = { runs: [] };
  const pPr = firstChild3(p, "a:pPr");
  if (pPr) {
    if (pPr.attrs["algn"])
      para.align = pPr.attrs["algn"];
    if (pPr.attrs["lvl"])
      para.level = parseInt(pPr.attrs["lvl"], 10);
    if (pPr.attrs["marL"] !== void 0)
      para.marL = parseInt(pPr.attrs["marL"], 10);
    if (pPr.attrs["indent"] !== void 0)
      para.indent = parseInt(pPr.attrs["indent"], 10);
    const buChar = firstChild3(pPr, "a:buChar");
    const buAuto = firstChild3(pPr, "a:buAutoNum");
    if (buChar) {
      para.bullet = true;
      if (buChar.attrs["char"])
        para.bulletChar = buChar.attrs["char"];
    } else if (buAuto) {
      para.bullet = true;
      para.bulletAutoNum = buAuto.attrs["type"] ?? "arabicPeriod";
    } else if (firstChild3(pPr, "a:buNone")) {
      para.bullet = false;
    }
  }
  for (const child of childElements3(p)) {
    if (child.name === "a:r")
      para.runs.push(readRun(child, theme, rels));
    else if (child.name === "a:br")
      para.runs.push({ text: "\n" });
    else if (child.name === "a:fld") {
      const t2 = firstChild3(child, "a:t");
      para.runs.push({ text: t2 ? textContent2(t2) : "" });
    }
  }
  return para;
}
function readRun(r, theme, rels) {
  const t2 = firstChild3(r, "a:t");
  const run = { text: t2 ? textContent2(t2) : "" };
  const rPr = firstChild3(r, "a:rPr");
  if (rPr) {
    if (rPr.attrs["sz"])
      run.sz = parseInt(rPr.attrs["sz"], 10) / 100;
    if (rPr.attrs["b"] !== void 0)
      run.bold = rPr.attrs["b"] === "1";
    if (rPr.attrs["i"] !== void 0)
      run.italic = rPr.attrs["i"] === "1";
    if (rPr.attrs["u"] && rPr.attrs["u"] !== "none")
      run.underline = true;
    const c2 = solidFillColor(rPr, theme);
    if (c2)
      run.color = c2;
    const latin = firstChild3(rPr, "a:latin");
    if (latin?.attrs["typeface"])
      run.font = latin.attrs["typeface"];
    const hlink = firstChild3(rPr, "a:hlinkClick");
    if (hlink && rels) {
      const rid = hlink.attrs["r:id"] ?? hlink.attrs["id"];
      if (rid) {
        const direct = rels.get(rid);
        if (direct && /^https?:/i.test(direct))
          run.hyperlink = direct;
      }
    }
  }
  return run;
}
function readPic(pic, theme, pkg, rels) {
  const nvPicPr = firstChild3(pic, "p:nvPicPr");
  const cNvPr = nvPicPr ? firstChild3(nvPicPr, "p:cNvPr") : void 0;
  const blipFill = firstChild3(pic, "p:blipFill");
  const blip = blipFill ? firstChild3(blipFill, "a:blip") : void 0;
  const srcRect = blipFill ? firstChild3(blipFill, "a:srcRect") : void 0;
  const spPr = firstChild3(pic, "p:spPr");
  const shape = {
    id: cNvPr?.attrs["id"] ?? "",
    name: cNvPr?.attrs["name"] ?? ""
  };
  if (blip) {
    const img = resolveBlip(blip, pkg, rels);
    if (img)
      shape.image = img;
    const am = firstChild3(blip, "a:alphaModFix");
    if (am?.attrs["amt"])
      shape.alpha = Math.max(0, Math.min(1, parseInt(am.attrs["amt"], 10) / 1e5));
  }
  if (srcRect) {
    const num = (a) => (a ? parseInt(a, 10) : 0) / 1e5;
    shape.srcRect = {
      l: num(srcRect.attrs["l"]),
      t: num(srcRect.attrs["t"]),
      r: num(srcRect.attrs["r"]),
      b: num(srcRect.attrs["b"])
    };
  }
  if (spPr) {
    const xfrm = firstChild3(spPr, "a:xfrm");
    if (xfrm)
      shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild3(spPr, "a:prstGeom");
    if (geom?.attrs["prst"])
      shape.geom = geom.attrs["prst"];
    const ln2 = firstChild3(spPr, "a:ln");
    if (ln2) {
      const lc2 = solidFillColor(ln2, theme);
      if (lc2)
        shape.lineColor = lc2;
      if (ln2.attrs["w"])
        shape.lineWidth = parseInt(ln2.attrs["w"], 10);
    }
  }
  return shape;
}
function resolveBlip(blip, pkg, rels) {
  const rid = blip.attrs["r:embed"] ?? blip.attrs["embed"];
  if (!rid)
    return void 0;
  const part = rels.get(rid);
  if (!part)
    return void 0;
  const bytes = pkg.getPart(part);
  if (!bytes)
    return void 0;
  return { part, bytes, mime: mimeFromPart(part) };
}
function mimeFromPart(part) {
  const dot = part.lastIndexOf(".");
  const ext = (dot >= 0 ? part.slice(dot + 1) : "").toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/model.js
var EMU_PER_INCH = 914400;
var EMU_PER_POINT = 12700;
var EMU_PER_PX = EMU_PER_INCH / 96;

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/text-layout.js
var DEF_INS_L = 91440;
var DEF_INS_T = 45720;
var DEF_INS_R = 91440;
var DEF_INS_B = 45720;
var LINE_FACTOR = 1.2;
var BASELINE_FACTOR = 0.8;
function formatAutoNum(scheme, n) {
  const roman = (v) => {
    const table = [[1e3, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let out = "";
    let x2 = v;
    for (const [val, sym] of table)
      while (x2 >= val) {
        out += sym;
        x2 -= val;
      }
    return out;
  };
  const alpha = (v) => String.fromCharCode(96 + (v - 1) % 26 + 1);
  switch (scheme) {
    case "alphaLcPeriod":
      return `${alpha(n)}.`;
    case "alphaUcPeriod":
      return `${alpha(n).toUpperCase()}.`;
    case "alphaLcParenR":
      return `${alpha(n)})`;
    case "alphaUcParenR":
      return `${alpha(n).toUpperCase()})`;
    case "romanLcPeriod":
      return `${roman(n)}.`;
    case "romanUcPeriod":
      return `${roman(n).toUpperCase()}.`;
    case "arabicParenR":
      return `${n})`;
    case "arabicPlain":
      return `${n}`;
    case "arabicPeriod":
    default:
      return `${n}.`;
  }
}
function tokenize(runs) {
  const out = [];
  for (const r of runs) {
    if (r.text === "\n") {
      out.push({ text: "\n", run: r });
      continue;
    }
    const parts = r.text.match(/\S+\s*|\s+/g) ?? [];
    for (const p of parts)
      out.push({ text: p, run: r });
  }
  return out;
}
function fontOf(r, fontScale, opts) {
  return {
    family: r.font ?? opts.defaultFont,
    sizePt: (r.sz ?? opts.defaultSzPt) * fontScale,
    bold: !!r.bold,
    italic: !!r.italic
  };
}
function layoutTextBody(tb, boxW, boxH, measure, opts = {}) {
  const insL = tb.insL ?? opts.insL ?? DEF_INS_L;
  const insT = tb.insT ?? opts.insT ?? DEF_INS_T;
  const insR = tb.insR ?? opts.insR ?? DEF_INS_R;
  const insB = tb.insB ?? opts.insB ?? DEF_INS_B;
  const defaultSzPt = opts.defaultSzPt ?? 18;
  const defaultFont = opts.defaultFont ?? "Calibri";
  const defaultColor = opts.defaultColor ?? "#000000";
  const fontScale = tb.fontScale ?? 1;
  const lineFactor = LINE_FACTOR * (1 - (tb.lnSpcReduction ?? 0));
  const usableW = Math.max(0, boxW - insL - insR);
  const wrap2 = tb.wrap !== "none";
  const fOpts = { defaultSzPt, defaultFont };
  const measureEmu = (text2, f) => measure(text2, f) * EMU_PER_POINT;
  const proto = [];
  const heights = [];
  const autoNumCounters = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
    const level = Math.min(p.level ?? 0, 8);
    const marL = p.marL ?? 0;
    const indent = p.indent ?? 0;
    const align = p.align ?? "l";
    const runs = p.runs.length ? p.runs : [{ text: "" }];
    let bullet;
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++)
        autoNumCounters[l] = 0;
      let btext;
      if (p.bulletAutoNum !== void 0) {
        autoNumCounters[level] = (autoNumCounters[level] ?? 0) + 1;
        btext = formatAutoNum(p.bulletAutoNum, autoNumCounters[level]);
      } else {
        btext = p.bulletChar ?? "\u2022";
      }
      const bFont = fontOf(runs[0], fontScale, fOpts);
      bullet = {
        text: btext,
        // hanging indent: bullet fica em marL+indent (indent tipicamente negativo)
        x: insL + Math.max(0, marL + indent),
        font: bFont,
        color: runs[0].color ?? defaultColor
      };
    }
    const contX = insL + marL;
    const firstX = p.bullet ? contX : insL + Math.max(0, marL + indent);
    const words = tokenize(runs);
    let cur = { runs: [], marL: firstX, align, bullet };
    let curW = 0;
    const emptyPt = (runs[0].sz ?? defaultSzPt) * fontScale;
    const flush = () => {
      proto.push(cur);
      const maxPt = cur.runs.reduce((a, t2) => Math.max(a, (t2.run.sz ?? defaultSzPt) * fontScale), cur.runs.length ? 0 : emptyPt);
      heights.push(maxPt * EMU_PER_POINT * lineFactor);
      cur = { runs: [], marL: contX, align };
      curW = 0;
    };
    for (const wd of words) {
      if (wd.text === "\n") {
        flush();
        continue;
      }
      const f = fontOf(wd.run, fontScale, fOpts);
      const wEmu = measureEmu(wd.text, f);
      const availW = Math.max(0, usableW - (cur.marL - insL));
      if (wrap2 && cur.runs.length > 0 && curW + measureEmu(wd.text.replace(/\s+$/, ""), f) > availW)
        flush();
      cur.runs.push({ text: wd.text, run: wd.run });
      curW += wEmu;
    }
    flush();
  }
  const totalH = heights.reduce((a, b) => a + b, 0);
  const usableH = Math.max(0, boxH - insT - insB);
  const anchor = tb.anchor ?? opts.defaultAnchor ?? "t";
  let y = insT;
  if (anchor === "ctr")
    y = insT + (usableH - totalH) / 2;
  else if (anchor === "b")
    y = insT + usableH - totalH;
  const lines = [];
  for (let i2 = 0; i2 < proto.length; i2++) {
    const pl = proto[i2];
    const h = heights[i2];
    const merged = [];
    for (const t2 of pl.runs) {
      const last = merged[merged.length - 1];
      if (last && last.run === t2.run)
        last.text += t2.text;
      else
        merged.push({ text: t2.text, run: t2.run });
    }
    if (merged.length) {
      const last = merged[merged.length - 1];
      last.text = last.text.replace(/\s+$/, "");
    }
    const placed = [];
    let w = 0;
    for (const m of merged) {
      const f = fontOf(m.run, fontScale, fOpts);
      const mw = measureEmu(m.text, f);
      const pr = {
        text: m.text,
        x: pl.marL + w,
        w: mw,
        font: f,
        color: m.run.color ?? defaultColor,
        underline: !!m.run.underline
      };
      if (m.run.hyperlink !== void 0)
        pr.hyperlink = m.run.hyperlink;
      placed.push(pr);
      w += mw;
    }
    let dx = 0;
    if (pl.align === "ctr")
      dx = (usableW - (pl.marL - insL) - w) / 2;
    else if (pl.align === "r")
      dx = usableW - (pl.marL - insL) - w;
    if (dx > 0)
      for (const pr of placed)
        pr.x += dx;
    const line = { runs: placed, baseline: y + h * BASELINE_FACTOR, height: h };
    if (pl.bullet)
      line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}

// ../../../../../../vendor/office-converter/vendor/slides-processing/packages/processing/dist/geometry.js
function regularPolygon(n, w, h) {
  const pts = [];
  for (let i2 = 0; i2 < n; i2++) {
    const a = -Math.PI / 2 + i2 * 2 * Math.PI / n;
    pts.push({ x: w / 2 + w / 2 * Math.cos(a), y: h / 2 + h / 2 * Math.sin(a) });
  }
  return pts;
}
function presetPath(geom, w, h) {
  const ss = Math.min(w, h);
  switch (geom) {
    case "ellipse":
      return { kind: "ellipse" };
    case "roundRect":
      return { kind: "roundRect", r: ss * 0.1 };
    case "triangle":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "rtTriangle":
      return { kind: "poly", points: [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case "diamond":
      return { kind: "poly", points: [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }] };
    case "parallelogram": {
      const d = ss * 0.25;
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w, y: 0 }, { x: w - d, y: h }, { x: 0, y: h }] };
    }
    case "trapezoid": {
      const d = ss * 0.25;
      return { kind: "poly", points: [{ x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    }
    case "pentagon":
      return { kind: "poly", points: regularPolygon(5, w, h) };
    case "hexagon": {
      const d = ss * 0.25;
      return {
        kind: "poly",
        points: [
          { x: d, y: 0 },
          { x: w - d, y: 0 },
          { x: w, y: h / 2 },
          { x: w - d, y: h },
          { x: d, y: h },
          { x: 0, y: h / 2 }
        ]
      };
    }
    case "star5": {
      const inner = 19098 / 5e4;
      const pts = [];
      for (let i2 = 0; i2 < 10; i2++) {
        const a = -Math.PI / 2 + i2 * Math.PI / 5;
        const fx = i2 % 2 === 0 ? 1 : inner;
        pts.push({ x: w / 2 + w / 2 * fx * Math.cos(a), y: h / 2 + h / 2 * fx * Math.sin(a) });
      }
      return { kind: "poly", points: pts };
    }
    // setas em bloco (adj1=50000 → haste com metade da altura; adj2=50000 →
    // cabeça com comprimento ss/2)
    case "rightArrow": {
      const hd = ss * 0.5, t2 = h * 0.25;
      return {
        kind: "poly",
        points: [
          { x: 0, y: t2 },
          { x: w - hd, y: t2 },
          { x: w - hd, y: 0 },
          { x: w, y: h / 2 },
          { x: w - hd, y: h },
          { x: w - hd, y: h - t2 },
          { x: 0, y: h - t2 }
        ]
      };
    }
    case "leftArrow": {
      const hd = ss * 0.5, t2 = h * 0.25;
      return {
        kind: "poly",
        points: [
          { x: w, y: t2 },
          { x: hd, y: t2 },
          { x: hd, y: 0 },
          { x: 0, y: h / 2 },
          { x: hd, y: h },
          { x: hd, y: h - t2 },
          { x: w, y: h - t2 }
        ]
      };
    }
    case "upArrow": {
      const hd = ss * 0.5, t2 = w * 0.25;
      return {
        kind: "poly",
        points: [
          { x: t2, y: h },
          { x: t2, y: hd },
          { x: 0, y: hd },
          { x: w / 2, y: 0 },
          { x: w, y: hd },
          { x: w - t2, y: hd },
          { x: w - t2, y: h }
        ]
      };
    }
    case "downArrow": {
      const hd = ss * 0.5, t2 = w * 0.25;
      return {
        kind: "poly",
        points: [
          { x: t2, y: 0 },
          { x: t2, y: h - hd },
          { x: 0, y: h - hd },
          { x: w / 2, y: h },
          { x: w, y: h - hd },
          { x: w - t2, y: h - hd },
          { x: w - t2, y: 0 }
        ]
      };
    }
    case "chevron": {
      const d = ss * 0.5;
      return {
        kind: "poly",
        points: [
          { x: 0, y: 0 },
          { x: w - d, y: 0 },
          { x: w, y: h / 2 },
          { x: w - d, y: h },
          { x: 0, y: h },
          { x: d, y: h / 2 }
        ]
      };
    }
    case "pie":
      return { kind: "pie", startDeg: 0, endDeg: 270 };
    case "line":
    case "straightConnector1":
      return { kind: "line", x1: 0, y1: 0, x2: w, y2: h };
    default:
      return { kind: "rect" };
  }
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/model.js
function loadDeck(bytes) {
  const pkg = PptxPackage.load(bytes);
  const pres = readPresentation(pkg);
  const slides = [];
  for (const ref of pres.slides) {
    if (!ref.target)
      continue;
    let slide;
    try {
      slide = readSlide(pkg, ref.target);
    } catch {
      slide = { shapes: [] };
    }
    slides.push({ slide, notes: readNotes(pkg, ref.target) });
  }
  return { pkg, pres, slides };
}
function relsPathFor3(part) {
  const slash = part.lastIndexOf("/");
  return `${part.slice(0, slash)}/_rels/${part.slice(slash + 1)}.rels`;
}
function readNotes(pkg, slidePath) {
  const relsXml = pkg.getPartText(relsPathFor3(slidePath));
  if (relsXml === void 0)
    return [];
  let notesPath;
  for (const rel of childElements3(parseXml3(relsXml), "Relationship")) {
    if ((rel.attrs["Type"] ?? "").endsWith("/notesSlide")) {
      notesPath = pkg.resolveRelTarget(slidePath, rel.attrs["Target"] ?? "");
      break;
    }
  }
  if (!notesPath)
    return [];
  const xml = pkg.getPartText(notesPath);
  if (xml === void 0)
    return [];
  const tree = descend(parseXml3(xml), "p:spTree");
  if (!tree)
    return [];
  const out = [];
  for (const sp of childElements3(tree, "p:sp")) {
    const ph = descend(sp, "p:ph");
    if (ph?.attrs["type"] !== "body")
      continue;
    const txBody = firstChild3(sp, "p:txBody");
    if (!txBody)
      continue;
    for (const p of childElements3(txBody, "a:p")) {
      const text2 = paraXmlText(p);
      if (text2.trim() !== "")
        out.push(text2);
    }
  }
  return out;
}
function paraXmlText(p) {
  let out = "";
  for (const c2 of childElements3(p)) {
    if (c2.name === "a:r" || c2.name === "a:fld") {
      const t2 = firstChild3(c2, "a:t");
      if (t2)
        out += textContent2(t2);
    } else if (c2.name === "a:br")
      out += "\n";
  }
  return out;
}
function paragraphText(p) {
  return p.runs.map((r) => r.text).join("");
}
function bodyText(tb) {
  return tb.paragraphs.map(paragraphText).join("\n");
}
function isTitleShape(sh) {
  return sh.phType === "title" || sh.phType === "ctrTitle";
}
function slideTitle(slide) {
  for (const sh of slide.shapes) {
    if (isTitleShape(sh) && sh.txBody && bodyText(sh.txBody).trim() !== "") {
      return { text: bodyText(sh.txBody).replace(/\s+/g, " ").trim(), shape: sh };
    }
  }
  for (const sh of slide.shapes) {
    if (sh.txBody && bodyText(sh.txBody).trim() !== "") {
      return { text: bodyText(sh.txBody).replace(/\s+/g, " ").trim(), shape: sh };
    }
  }
  return void 0;
}
function base642(bytes) {
  let bin = "";
  const CHUNK = 32768;
  for (let i2 = 0; i2 < bytes.length; i2 += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i2, i2 + CHUNK));
  }
  const g = globalThis;
  if (typeof g.btoa === "function")
    return g.btoa(bin);
  if (g.Buffer)
    return g.Buffer.from(bin, "binary").toString("base64");
  throw new Error("sem base64 (btoa/Buffer) no ambiente");
}
function dataUri2(img) {
  return `data:${img.mime};base64,${base642(img.bytes)}`;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/html.js
function escapeHtml4(text2) {
  return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function pct(v, total) {
  return `${(v / total * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
}
function fillCss(fill, fillAlpha) {
  if (!fill || fill.type === "none")
    return void 0;
  if (fill.type === "gradient" && fill.stops && fill.stops.length >= 2) {
    const ang = 90 + (fill.angleDeg ?? 0);
    const stops = fill.stops.map((s) => `${s.color} ${Math.round(s.pos * 100)}%`).join(", ");
    return `background:linear-gradient(${ang}deg, ${stops})`;
  }
  if (fill.type === "solid" && fill.color) {
    if (fillAlpha !== void 0 && fillAlpha < 1) {
      const h = fill.color.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return `background-color:rgba(${r},${g},${b},${Math.round(fillAlpha * 1e3) / 1e3})`;
    }
    return `background-color:${fill.color}`;
  }
  return void 0;
}
function radiusCss(geom) {
  if (geom === "ellipse")
    return "border-radius:50%";
  if (geom === "roundRect")
    return "border-radius:8px";
  return void 0;
}
function transformCss(sh) {
  const x2 = sh.xfrm;
  if (!x2 || !x2.rot && !x2.flipH && !x2.flipV)
    return void 0;
  const parts = [];
  if (x2.rot)
    parts.push(`rotate(${Math.round(x2.rot / 6e4 * 100) / 100}deg)`);
  if (x2.flipH)
    parts.push("scaleX(-1)");
  if (x2.flipV)
    parts.push("scaleY(-1)");
  return `transform:${parts.join(" ")}`;
}
function runHtml2(r, defaultSzPt) {
  const css = [];
  css.push(`font-size:${r.sz ?? defaultSzPt}pt`);
  if (r.bold)
    css.push("font-weight:700");
  if (r.italic)
    css.push("font-style:italic");
  if (r.underline)
    css.push("text-decoration:underline");
  if (r.color)
    css.push(`color:${r.color}`);
  if (r.font)
    css.push(`font-family:'${r.font}'`);
  const inner = escapeHtml4(r.text).replace(/\n/g, "<br>");
  const span = `<span style="${css.join(";")}">${inner}</span>`;
  return r.hyperlink ? `<a href="${escapeHtml4(r.hyperlink)}">${span}</a>` : span;
}
function bodyHtml2(tb, isTitle) {
  const defaultSzPt = isTitle ? 40 : 18;
  const out = [];
  const counters = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
    const level = Math.min(p.level ?? 0, 8);
    const align = p.align === "ctr" ? "center" : p.align === "r" ? "right" : p.align === "just" ? "justify" : "left";
    const css = [`margin:0`, `text-align:${align}`];
    if (level > 0)
      css.push(`padding-left:${level * 24}px`);
    let bullet = "";
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++)
        counters[l] = 0;
      if (p.bulletAutoNum !== void 0) {
        counters[level] = (counters[level] ?? 0) + 1;
        bullet = `${formatAutoNum(p.bulletAutoNum, counters[level])} `;
      } else {
        bullet = `${p.bulletChar ?? "\u2022"} `;
      }
    }
    const runs = p.runs.map((r) => runHtml2(r, defaultSzPt)).join("");
    const bulletSpan = bullet ? `<span style="font-size:${p.runs[0]?.sz ?? defaultSzPt}pt${p.runs[0]?.color ? `;color:${p.runs[0].color}` : ""}">${escapeHtml4(bullet)}</span>` : "";
    out.push(`<p style="${css.join(";")}">${bulletSpan}${runs || "&nbsp;"}</p>`);
  }
  return out.join("");
}
function tableHtml2(t2, posCss) {
  const totalW = t2.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const cols = t2.colWidthsEmu.map((w) => `<col style="width:${(w / totalW * 100).toFixed(2)}%">`).join("");
  const rows = [];
  for (const row of t2.rows) {
    const cells = [];
    for (const cell of row.cells) {
      if (cell.hMerge || cell.vMerge)
        continue;
      const attrs = [];
      if (cell.gridSpan && cell.gridSpan > 1)
        attrs.push(`colspan="${cell.gridSpan}"`);
      if (cell.rowSpan && cell.rowSpan > 1)
        attrs.push(`rowspan="${cell.rowSpan}"`);
      const css = ["padding:2px 6px", `border:1px solid ${cell.borderColor ?? "#CBD5E1"}`];
      if (cell.fill)
        css.push(`background-color:${cell.fill}`);
      if (cell.anchor === "ctr")
        css.push("vertical-align:middle");
      else if (cell.anchor === "b")
        css.push("vertical-align:bottom");
      const body = cell.txBody ? bodyHtml2(cell.txBody, false) : "";
      cells.push(`<td ${attrs.join(" ")} style="${css.join(";")}">${body}</td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table style="${posCss};border-collapse:collapse;table-layout:fixed">${cols}${rows.join("")}</table>`;
}
function shapeHtml(sh, pres, opts) {
  if (!sh.xfrm) {
    return void 0;
  }
  const pos = `position:absolute;left:${pct(sh.xfrm.x, pres.slideW)};top:${pct(sh.xfrm.y, pres.slideH)};width:${pct(sh.xfrm.cx, pres.slideW)};height:${pct(sh.xfrm.cy, pres.slideH)};box-sizing:border-box`;
  const xform = transformCss(sh);
  if (sh.table)
    return tableHtml2(sh.table, pos + (xform ? `;${xform}` : ""));
  if (sh.chartXml) {
    return `<div style="${pos};border:1px dashed #94A3B8;color:#64748B;display:flex;align-items:center;justify-content:center;font-size:12px">[gr\xE1fico]</div>`;
  }
  if (sh.image) {
    if (opts.images === "omit")
      return void 0;
    const css2 = [pos, "object-fit:fill"];
    if (xform)
      css2.push(xform);
    if (sh.alpha !== void 0 && sh.alpha < 1)
      css2.push(`opacity:${sh.alpha}`);
    return `<img src="${dataUri2(sh.image)}" alt="${escapeHtml4(sh.name)}" style="${css2.join(";")}">`;
  }
  const css = [pos];
  if (xform)
    css.push(xform);
  const bg = fillCss(sh.fill, sh.fillAlpha);
  if (bg)
    css.push(bg);
  if (sh.fillImage && opts.images !== "omit") {
    css.push(`background-image:url(${dataUri2(sh.fillImage)})`, "background-size:100% 100%");
  }
  if (sh.lineColor) {
    const wpx = Math.max(1, Math.round((sh.lineWidth ?? 9525) / EMU_PER_PX));
    const style = sh.lineDash ? sh.lineDash.includes("ot") ? "dotted" : "dashed" : "solid";
    css.push(`border:${wpx}px ${style} ${sh.lineColor}`);
  }
  const radius = radiusCss(sh.geom);
  if (radius)
    css.push(radius);
  let inner = "";
  if (sh.txBody) {
    const anchor = sh.txBody.anchor ?? (sh.phType === "title" || sh.phType === "ctrTitle" ? "ctr" : "t");
    const justify = anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start";
    css.push("display:flex", "flex-direction:column", `justify-content:${justify}`, "overflow:hidden", "padding:4.8px 9.6px");
    inner = bodyHtml2(sh.txBody, sh.phType === "title" || sh.phType === "ctrTitle");
  }
  if (!inner && !bg && !sh.lineColor && !sh.fillImage)
    return void 0;
  return `<div style="${css.join(";")}">${inner}</div>`;
}
function slideHtml(slide, pres, opts) {
  const wPx = Math.round(pres.slideW / EMU_PER_PX);
  const css = [
    "position:relative",
    `width:${wPx}px`,
    `aspect-ratio:${pres.slideW}/${pres.slideH}`,
    "overflow:hidden",
    `background-color:${slide.bg?.color ?? "#ffffff"}`,
    "font-family:'Aptos',Calibri,Arial,sans-serif"
  ];
  if (slide.bgImage && opts.images !== "omit") {
    css.push(`background-image:url(${dataUri2(slide.bgImage)})`, "background-size:100% 100%");
  }
  const shapes = slide.shapes.map((sh) => shapeHtml(sh, pres, opts)).filter((s) => s !== void 0);
  return `<section class="slide" style="${css.join(";")}">
${shapes.join("\n")}
</section>`;
}
function pptxToHtml(bytes, opts = {}) {
  const deck = loadDeck(bytes);
  const body = deck.slides.map((ds) => slideHtml(ds.slide, deck.pres, opts)).join("\n");
  if (!opts.fullDocument)
    return body;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Apresenta\xE7\xE3o</title>
</head>
<body>
${body}
</body>
</html>
`;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/markdown.js
function mdCell(text2) {
  return text2.replace(/\|/g, "\\|").replace(/\r\n|\r|\n/g, "<br>").trim();
}
function bodyToMarkdown(tb) {
  const lines = [];
  const counters = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
    const text2 = paragraphText(p).replace(/\n/g, " ").trim();
    if (text2 === "")
      continue;
    const level = Math.min(p.level ?? 0, 8);
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++)
        counters[l] = 0;
      let marker = "-";
      if (p.bulletAutoNum !== void 0) {
        counters[level] = (counters[level] ?? 0) + 1;
        marker = `${counters[level]}.`;
      }
      lines.push(`${"  ".repeat(level)}${marker} ${text2}`);
    } else {
      lines.push(text2);
    }
  }
  return lines;
}
function tableToMarkdown(t2) {
  if (t2.rows.length === 0)
    return [];
  const cols = t2.colWidthsEmu.length || Math.max(...t2.rows.map((r) => r.cells.length));
  const rowLine = (ri) => {
    const row = t2.rows[ri];
    const fields = [];
    for (let ci = 0; ci < cols; ci++) {
      const cell = row.cells[ci];
      if (!cell || cell.hMerge || cell.vMerge || !cell.txBody) {
        fields.push("");
        continue;
      }
      fields.push(mdCell(cell.txBody.paragraphs.map(paragraphText).join(" ")));
    }
    return `| ${fields.join(" | ")} |`;
  };
  const out = [rowLine(0), `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`];
  for (let ri = 1; ri < t2.rows.length; ri++)
    out.push(rowLine(ri));
  return out;
}
function slideToMarkdown(ds, n, opts) {
  const { slide, notes } = ds;
  const title = slideTitle(slide);
  const blocks = [`## Slide ${n}${title ? ` \u2014 ${title.text}` : ""}`];
  for (const sh of slide.shapes) {
    if (title && sh === title.shape)
      continue;
    const block = shapeToMarkdown(sh, opts);
    if (block)
      blocks.push(block);
  }
  if (notes.length) {
    blocks.push(notes.map((l) => l.split("\n").map((s) => `> ${s}`).join("\n")).join("\n>\n"));
  }
  return blocks.join("\n\n");
}
function shapeToMarkdown(sh, opts) {
  if (sh.table) {
    const t2 = tableToMarkdown(sh.table);
    return t2.length ? t2.join("\n") : void 0;
  }
  if (sh.image) {
    return opts.images === "data" ? `![](${dataUri2(sh.image)})` : "[imagem]";
  }
  if (sh.chartXml)
    return "[gr\xE1fico]";
  if (sh.txBody) {
    const lines = bodyToMarkdown(sh.txBody);
    return lines.length ? lines.join("\n") : void 0;
  }
  return void 0;
}
function pptxToMarkdown(bytes, opts = {}) {
  const deck = loadDeck(bytes);
  return deck.slides.map((ds, i2) => slideToMarkdown(ds, i2 + 1, opts)).join("\n\n") + "\n";
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/sfnt.js
var TtfProgram2 = class {
  unitsPerEm;
  ascender;
  descender;
  // negativo
  fontBBox;
  italicAngle;
  view;
  numberOfHMetrics;
  hmtxOffset;
  cmapRanges = [];
  advanceCache = /* @__PURE__ */ new Map();
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const tables = /* @__PURE__ */ new Map();
    const numTables = v.getUint16(4);
    for (let i2 = 0; i2 < numTables; i2++) {
      const p = 12 + i2 * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      tables.set(tag, v.getUint32(p + 8));
    }
    const req = (tag) => {
      const off = tables.get(tag);
      if (off === void 0)
        throw new Error(`Fonte TTF sem a tabela ${tag}`);
      return off;
    };
    const head = req("head");
    const hhea = req("hhea");
    this.unitsPerEm = v.getUint16(head + 18);
    this.fontBBox = [v.getInt16(head + 36), v.getInt16(head + 38), v.getInt16(head + 40), v.getInt16(head + 42)];
    this.ascender = v.getInt16(hhea + 4);
    this.descender = v.getInt16(hhea + 6);
    this.numberOfHMetrics = v.getUint16(hhea + 34);
    this.hmtxOffset = req("hmtx");
    const post = tables.get("post");
    this.italicAngle = post !== void 0 ? v.getInt32(post + 4) / 65536 : 0;
    this.parseCmap(req("cmap"));
  }
  parseCmap(cmap) {
    const v = this.view;
    const n = v.getUint16(cmap + 2);
    let best = -1;
    let bestScore = -1;
    for (let i2 = 0; i2 < n; i2++) {
      const p = cmap + 4 + i2 * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      const score = platform === 3 && encoding === 10 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = cmap + offset;
      }
    }
    if (best < 0)
      throw new Error("Fonte TTF: cmap sem subtabela utiliz\xE1vel");
    const format = v.getUint16(best);
    if (format === 4) {
      const segCount = v.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = v.getUint16(endP + s * 2);
        const start = v.getUint16(startP + s * 2);
        const delta = v.getInt16(deltaP + s * 2);
        const rangeOffset = v.getUint16(rangeP + s * 2);
        const idP = rangeP + s * 2;
        this.cmapRanges.push({
          start,
          end,
          mapper: rangeOffset === 0 ? (c2) => c2 + delta & 65535 : (c2) => {
            const g = v.getUint16(idP + rangeOffset + (c2 - start) * 2);
            return g === 0 ? 0 : g + delta & 65535;
          }
        });
      }
    } else if (format === 12) {
      const nGroups = v.getUint32(best + 12);
      for (let g = 0; g < nGroups; g++) {
        const p = best + 16 + g * 12;
        const start = v.getUint32(p);
        const end = v.getUint32(p + 4);
        const startGlyph = v.getUint32(p + 8);
        this.cmapRanges.push({ start, end, mapper: (c2) => startGlyph + (c2 - start) });
      }
    } else {
      throw new Error(`Fonte TTF: cmap format ${format} n\xE3o suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }
  /** glyph id de um code point (0 = .notdef). */
  glyphId(codePoint) {
    let lo = 0;
    let hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const r = this.cmapRanges[mid];
      if (codePoint < r.start)
        hi = mid - 1;
      else if (codePoint > r.end)
        lo = mid + 1;
      else
        return r.mapper(codePoint);
    }
    return 0;
  }
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId) {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== void 0)
      return cached;
    const i2 = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i2 * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }
};

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/raster.js
var PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
function decodePng(bytes) {
  if (bytes.length < 8 || PNG_SIG.some((b, i2) => bytes[i2] !== b))
    return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette = null;
  let trns = null;
  const idat = [];
  let p = 8;
  while (p + 8 <= bytes.length) {
    const len = v.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const dataStart = p + 8;
    if (dataStart + len > bytes.length)
      return null;
    if (type === "IHDR") {
      width = v.getUint32(dataStart);
      height = v.getUint32(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlace = bytes[dataStart + 12];
    } else if (type === "PLTE") {
      palette = bytes.subarray(dataStart, dataStart + len);
    } else if (type === "tRNS") {
      trns = bytes.subarray(dataStart, dataStart + len);
    } else if (type === "IDAT") {
      idat.push(bytes.subarray(dataStart, dataStart + len));
    } else if (type === "IEND") {
      break;
    }
    p = dataStart + len + 4;
  }
  if (!width || !height || interlace !== 0 || bitDepth !== 8)
    return null;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0)
    return null;
  if (colorType === 3 && !palette)
    return null;
  let total = 0;
  for (const c2 of idat)
    total += c2.length;
  const zdata = new Uint8Array(total);
  let off = 0;
  for (const c2 of idat) {
    zdata.set(c2, off);
    off += c2.length;
  }
  let raw;
  try {
    raw = unzlibSync(zdata);
  } catch {
    return null;
  }
  const bpp = channels;
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height)
    return null;
  const img = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let x2 = 0; x2 < stride; x2++) {
      const rawB = raw[src + x2];
      const a = x2 >= bpp ? img[dst + x2 - bpp] : 0;
      const b = y > 0 ? img[prev + x2] : 0;
      const c2 = y > 0 && x2 >= bpp ? img[prev + x2 - bpp] : 0;
      let val;
      switch (filter) {
        case 0:
          val = rawB;
          break;
        case 1:
          val = rawB + a;
          break;
        case 2:
          val = rawB + b;
          break;
        case 3:
          val = rawB + (a + b >> 1);
          break;
        case 4: {
          const pp = a + b - c2;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c2);
          val = rawB + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c2);
          break;
        }
        default:
          return null;
      }
      img[dst + x2] = val & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i2 = 0, o = 0; i2 < width * height; i2++, o += 4) {
    const s = i2 * bpp;
    switch (colorType) {
      case 0: {
        const g = img[s];
        rgba[o] = g;
        rgba[o + 1] = g;
        rgba[o + 2] = g;
        rgba[o + 3] = 255;
        break;
      }
      case 2:
        rgba[o] = img[s];
        rgba[o + 1] = img[s + 1];
        rgba[o + 2] = img[s + 2];
        rgba[o + 3] = 255;
        break;
      case 3: {
        const idx = img[s];
        rgba[o] = palette[idx * 3] ?? 0;
        rgba[o + 1] = palette[idx * 3 + 1] ?? 0;
        rgba[o + 2] = palette[idx * 3 + 2] ?? 0;
        rgba[o + 3] = trns ? trns[idx] ?? 255 : 255;
        break;
      }
      case 4: {
        const g = img[s];
        rgba[o] = g;
        rgba[o + 1] = g;
        rgba[o + 2] = g;
        rgba[o + 3] = img[s + 1];
        break;
      }
      default:
        rgba[o] = img[s];
        rgba[o + 1] = img[s + 1];
        rgba[o + 2] = img[s + 2];
        rgba[o + 3] = img[s + 3];
    }
  }
  return { width, height, rgba };
}
function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216)
    return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 2;
  while (p + 4 <= bytes.length) {
    if (bytes[p] !== 255) {
      p++;
      continue;
    }
    const marker = bytes[p + 1];
    if (marker === 216 || marker >= 208 && marker <= 217) {
      p += 2;
      continue;
    }
    const len = v.getUint16(p + 2);
    if (marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204) {
      if (p + 9 > bytes.length)
        return null;
      return { height: v.getUint16(p + 5), width: v.getUint16(p + 7) };
    }
    p += 2 + len;
  }
  return null;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pptx/pdf.js
var DEFAULT_TITLE_PT = 40;
var DEFAULT_BODY_PT = 18;
var KAPPA = 0.5522847498307936;
var GRAD_STRIPS = 24;
var PLACEHOLDER = [0.8, 0.8, 0.8];
var fmt2 = (n) => {
  const r = Math.round(n * 1e3) / 1e3;
  return Object.is(r, -0) ? "0" : String(r);
};
var pt = (emu) => emu / EMU_PER_POINT;
function pptxToPdf(bytes, opts = {}) {
  const fonts = opts.fonts;
  if (!fonts || fonts.length === 0) {
    throw new Error("pptxToPdf: opts.fonts \xE9 obrigat\xF3rio \u2014 o gerador de PDF n\xE3o tem fontes base-14. Passe ao menos uma TTF (ideal: regular/bold/italic/bold-italic da fonte do deck).");
  }
  const deck = loadDeck(bytes);
  const doc = new PdfDocument();
  const variants = fonts.map((f, i2) => {
    const program = new TtfProgram2(f.bytes);
    return {
      bold: !!f.bold,
      italic: !!f.italic,
      program,
      embedded: doc.embedFont(f.name ?? `Font${i2}`, f.bytes, program)
    };
  });
  const pick = (bold, italic) => variants.find((v) => v.bold === bold && v.italic === italic) ?? variants.find((v) => !v.bold && !v.italic) ?? variants[0];
  const imageCache = /* @__PURE__ */ new Map();
  const pageW = pt(deck.pres.slideW);
  const pageH = pt(deck.pres.slideH);
  for (const ds of deck.slides) {
    const page = doc.addPage(pageW, pageH);
    drawSlide(page, doc, ds.slide, pageW, pageH, pick, imageCache);
  }
  return doc.build();
}
function drawSlide(page, doc, slide, pageW, pageH, pick, imageCache) {
  if (slide.bg?.color)
    page.fillRect(0, 0, pageW, pageH, hexColor(slide.bg.color));
  if (slide.bgImage)
    drawImageRef(page, doc, imageCache, slide.bgImage, 0, 0, pageW, pageH);
  for (const sh of slide.shapes)
    drawShape(page, doc, sh, pageH, pick, imageCache);
}
function drawShape(page, doc, sh, pageH, pick, imageCache) {
  if (!sh.xfrm)
    return;
  const x2 = pt(sh.xfrm.x), y = pt(sh.xfrm.y);
  const w = pt(sh.xfrm.cx), h = pt(sh.xfrm.cy);
  const hasXform = !!(sh.xfrm.rot || sh.xfrm.flipH || sh.xfrm.flipV);
  if (hasXform)
    page.content.str(transformCm(sh, x2, y, w, h, pageH));
  if (sh.chartXml) {
    page.fillRect(x2, y, w, h, [0.945, 0.961, 0.976]);
    strokeRectRaw(page, x2, y, w, h, pageH, [0.58, 0.64, 0.72], 0.75);
  } else if (sh.table) {
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    drawTable(page, sh.table, x2, y, natW > 0 ? pt(natW) : w, natH > 0 ? pt(natH) : h, pageH, pick);
  } else if (sh.image) {
    drawImageRef(page, doc, imageCache, sh.image, x2, y, w, h, sh.srcRect);
    if (sh.lineColor) {
      strokeRectRaw(page, x2, y, w, h, pageH, hexColor(sh.lineColor), Math.max(0.5, pt(sh.lineWidth ?? 9525)));
    }
  } else {
    const preset = presetPath(sh.geom, w, h);
    const isLineGeom = preset.kind === "line";
    if (!isLineGeom && (sh.fillImage || sh.fill && sh.fill.type !== "none")) {
      if (sh.fillImage) {
        page.content.str(`q
${pathOps(preset, x2, y, w, h, pageH)}W n
`);
        drawImageRef(page, doc, imageCache, sh.fillImage, x2, y, w, h);
        page.content.str("Q\n");
      } else if (sh.fill.type === "gradient" && sh.fill.stops && sh.fill.stops.length >= 2) {
        fillGradient(page, preset, sh.fill, x2, y, w, h, pageH);
      } else if (sh.fill.type === "solid" && sh.fill.color) {
        const c2 = hexColor(sh.fill.color);
        page.content.str(`${fmt2(c2[0])} ${fmt2(c2[1])} ${fmt2(c2[2])} rg
${pathOps(preset, x2, y, w, h, pageH)}f
`);
      }
    }
    if (sh.lineColor) {
      const c2 = hexColor(sh.lineColor);
      const lw = Math.max(0.5, pt(sh.lineWidth ?? 9525));
      const dash = sh.lineDash ? dashArray(sh.lineDash, lw) : "[] 0 d\n";
      page.content.str(`${fmt2(c2[0])} ${fmt2(c2[1])} ${fmt2(c2[2])} RG
${fmt2(lw)} w
${dash}${pathOps(preset, x2, y, w, h, pageH)}S
`);
    }
    if (sh.txBody)
      drawTextBody(page, sh, sh.txBody, x2, y, pick);
  }
  if (hasXform)
    page.content.str("Q\n");
}
function pathOps(p, x2, y, w, h, pageH) {
  const Y = (v) => fmt2(pageH - v);
  const M = (px, py) => `${fmt2(px)} ${Y(py)} m
`;
  const L2 = (px, py) => `${fmt2(px)} ${Y(py)} l
`;
  const C = (x1, y1, x22, y2, x3, y3) => `${fmt2(x1)} ${Y(y1)} ${fmt2(x22)} ${Y(y2)} ${fmt2(x3)} ${Y(y3)} c
`;
  switch (p.kind) {
    case "ellipse":
      return ellipseOps(x2 + w / 2, y + h / 2, w / 2, h / 2, Y, M, C);
    case "roundRect": {
      const r = Math.min(p.r, w / 2, h / 2);
      const k = KAPPA * r;
      return M(x2 + r, y) + L2(x2 + w - r, y) + C(x2 + w - r + k, y, x2 + w, y + r - k, x2 + w, y + r) + L2(x2 + w, y + h - r) + C(x2 + w, y + h - r + k, x2 + w - r + k, y + h, x2 + w - r, y + h) + L2(x2 + r, y + h) + C(x2 + r - k, y + h, x2, y + h - r + k, x2, y + h - r) + L2(x2, y + r) + C(x2, y + r - k, x2 + r - k, y, x2 + r, y) + "h\n";
    }
    case "poly": {
      if (!p.points.length)
        return "";
      let ops = M(x2 + p.points[0].x, y + p.points[0].y);
      for (let i2 = 1; i2 < p.points.length; i2++)
        ops += L2(x2 + p.points[i2].x, y + p.points[i2].y);
      return ops + "h\n";
    }
    case "line":
      return M(x2 + p.x1, y + p.y1) + L2(x2 + p.x2, y + p.y2);
    case "pie": {
      const cx = x2 + w / 2, cy = y + h / 2;
      let ops = M(cx, cy) + L2(cx + w / 2 * Math.cos(p.startDeg * Math.PI / 180), cy + h / 2 * Math.sin(p.startDeg * Math.PI / 180));
      ops += arcOps(cx, cy, w / 2, h / 2, p.startDeg, p.endDeg, C);
      return ops + "h\n";
    }
    default: {
      return `${fmt2(x2)} ${fmt2(pageH - (y + h))} ${fmt2(w)} ${fmt2(h)} re
`;
    }
  }
}
function ellipseOps(cx, cy, rx, ry, _Y, M, C) {
  const kx = KAPPA * rx, ky = KAPPA * ry;
  return M(cx + rx, cy) + C(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry) + C(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy) + C(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry) + C(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy) + "h\n";
}
function arcOps(cx, cy, rx, ry, startDeg, endDeg, C) {
  let ops = "";
  const total = endDeg - startDeg;
  const n = Math.max(1, Math.ceil(Math.abs(total) / 90));
  const step = total / n;
  for (let i2 = 0; i2 < n; i2++) {
    const a0 = (startDeg + i2 * step) * Math.PI / 180;
    const a1 = (startDeg + (i2 + 1) * step) * Math.PI / 180;
    const t2 = 4 / 3 * Math.tan((a1 - a0) / 4);
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    ops += C(cx + rx * (c0 - t2 * s0), cy + ry * (s0 + t2 * c0), cx + rx * (c1 + t2 * s1), cy + ry * (s1 - t2 * c1), cx + rx * c1, cy + ry * s1);
  }
  return ops;
}
function transformCm(sh, x2, y, w, h, pageH) {
  const cx = x2 + w / 2;
  const cy = pageH - (y + h / 2);
  const theta = -((sh.xfrm.rot ?? 0) / 6e4) * Math.PI / 180;
  const sx = sh.xfrm.flipH ? -1 : 1;
  const sy = sh.xfrm.flipV ? -1 : 1;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const a = cos * sx, b = sin * sx, c2 = -sin * sy, d = cos * sy;
  const e = cx - (a * cx + c2 * cy);
  const f = cy - (b * cx + d * cy);
  return `q
${fmt2(a)} ${fmt2(b)} ${fmt2(c2)} ${fmt2(d)} ${fmt2(e)} ${fmt2(f)} cm
`;
}
function strokeRectRaw(page, x2, y, w, h, pageH, c2, lw) {
  page.content.str(`${fmt2(c2[0])} ${fmt2(c2[1])} ${fmt2(c2[2])} RG
${fmt2(lw)} w
[] 0 d
${fmt2(x2)} ${fmt2(pageH - (y + h))} ${fmt2(w)} ${fmt2(h)} re S
`);
}
function dashArray(prstDash, lw) {
  const pat = (() => {
    switch (prstDash) {
      case "dash":
        return [4, 3];
      case "lgDash":
        return [8, 3];
      case "dashDot":
        return [4, 3, 1, 3];
      case "lgDashDot":
        return [8, 3, 1, 3];
      case "lgDashDotDot":
        return [8, 3, 1, 3, 1, 3];
      case "dot":
      case "sysDot":
        return [1, 2];
      case "sysDash":
        return [3, 1];
      case "sysDashDot":
        return [3, 1, 1, 1];
      case "sysDashDotDot":
        return [3, 1, 1, 1, 1, 1];
      default:
        return [];
    }
  })();
  if (!pat.length)
    return "[] 0 d\n";
  return `[${pat.map((v) => fmt2(v * lw)).join(" ")}] 0 d
`;
}
function fillGradient(page, preset, fill, x2, y, w, h, pageH) {
  const stops = fill.stops;
  const ang = (fill.angleDeg ?? 0) * Math.PI / 180;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const cx = x2 + w / 2, cy = y + h / 2;
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const len = 2 * half;
  const px = -dy, py = dx;
  const halfPerp = (Math.abs(dy) * w + Math.abs(dx) * h) / 2 + 1;
  const lerp = (t2) => {
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i2 = 0; i2 < stops.length - 1; i2++) {
      if (t2 >= stops[i2].pos && t2 <= stops[i2 + 1].pos) {
        lo = stops[i2];
        hi = stops[i2 + 1];
        break;
      }
    }
    if (t2 <= stops[0].pos)
      return hexColor(stops[0].color);
    if (t2 >= stops[stops.length - 1].pos)
      return hexColor(stops[stops.length - 1].color);
    const f = hi.pos > lo.pos ? (t2 - lo.pos) / (hi.pos - lo.pos) : 0;
    const a = hexColor(lo.color), b = hexColor(hi.color);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  let ops = `q
${pathOps(preset, x2, y, w, h, pageH)}W n
`;
  for (let i2 = 0; i2 < GRAD_STRIPS; i2++) {
    const t0 = i2 / GRAD_STRIPS, t1 = (i2 + 1) / GRAD_STRIPS + 2e-3;
    const c2 = lerp((t0 + (i2 + 1) / GRAD_STRIPS) / 2);
    const s0 = -half + t0 * len, s1 = -half + Math.min(1, t1) * len;
    const corners = [
      [cx + dx * s0 + px * halfPerp, cy + dy * s0 + py * halfPerp],
      [cx + dx * s1 + px * halfPerp, cy + dy * s1 + py * halfPerp],
      [cx + dx * s1 - px * halfPerp, cy + dy * s1 - py * halfPerp],
      [cx + dx * s0 - px * halfPerp, cy + dy * s0 - py * halfPerp]
    ];
    ops += `${fmt2(c2[0])} ${fmt2(c2[1])} ${fmt2(c2[2])} rg
`;
    ops += `${fmt2(corners[0][0])} ${fmt2(pageH - corners[0][1])} m
`;
    for (let k = 1; k < 4; k++)
      ops += `${fmt2(corners[k][0])} ${fmt2(pageH - corners[k][1])} l
`;
    ops += "h f\n";
  }
  page.content.str(ops + "Q\n");
}
function textWidthPt2(text2, v, sizePt) {
  let units = 0;
  for (const ch of text2)
    units += v.program.advanceWidth(v.program.glyphId(ch.codePointAt(0)));
  return units * sizePt / v.program.unitsPerEm;
}
function drawString(page, v, sizePt, color, xPt, baselinePt, text2) {
  const glyphs = [];
  let pen = xPt;
  const upem = v.program.unitsPerEm;
  for (const ch of text2) {
    const cp = ch.codePointAt(0);
    const { gid, advanceWidth } = v.embedded.encode(cp);
    glyphs.push({ gid, codePoint: cp, xPt: pen, baselineFromTopPt: baselinePt });
    pen += advanceWidth * sizePt / upem;
  }
  if (glyphs.length)
    page.glyphs(v.embedded, sizePt, color, glyphs);
}
function drawTextBody(page, sh, tb, xPt, yPt, pick) {
  const isTitle = sh.phType === "title" || sh.phType === "ctrTitle";
  const measure = (text2, f) => textWidthPt2(text2, pick(f.bold, f.italic), f.sizePt);
  const layout = layoutTextBody(tb, sh.xfrm.cx, sh.xfrm.cy, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? "ctr" : "t"
  });
  for (const line of layout.lines) {
    const baseline = yPt + pt(line.baseline);
    if (line.bullet) {
      const v = pick(line.bullet.font.bold, line.bullet.font.italic);
      drawString(page, v, line.bullet.font.sizePt, hexColor(line.bullet.color), xPt + pt(line.bullet.x), baseline, line.bullet.text);
    }
    for (const r of line.runs) {
      const v = pick(r.font.bold, r.font.italic);
      const color = hexColor(r.color);
      const rx = xPt + pt(r.x);
      drawString(page, v, r.font.sizePt, color, rx, baseline, r.text);
      if (r.underline) {
        const uy = baseline + r.font.sizePt * 0.12;
        page.line(rx, uy, rx + pt(r.w), uy, color, Math.max(0.5, r.font.sizePt / 16));
      }
    }
  }
}
function drawTable(page, t2, x2, y, w, h, pageH, pick) {
  const allZeroRows = t2.rows.every((r) => !r.heightEmu);
  const rowHs = allZeroRows ? t2.rows.map(() => 1) : t2.rows.map((r) => Math.max(r.heightEmu, 1));
  const totalColEmu = t2.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const totalRowEmu = rowHs.reduce((a, b) => a + b, 0) || 1;
  const sx = w / totalColEmu;
  const sy = h / totalRowEmu;
  const colX = [0];
  for (const cw of t2.colWidthsEmu)
    colX.push(colX[colX.length - 1] + cw * sx);
  const rowY = [0];
  for (const rh of rowHs)
    rowY.push(rowY[rowY.length - 1] + rh * sy);
  page.fillRect(x2, y, w, h, [1, 1, 1]);
  const boxes = [];
  for (let ri = 0; ri < t2.rows.length; ri++) {
    const row = t2.rows[ri];
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      if (cell.hMerge || cell.vMerge)
        continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      boxes.push({
        cx0: x2 + colX[ci],
        cy0: y + rowY[ri],
        cw: (colX[ci + span] ?? colX[colX.length - 1]) - colX[ci],
        ch: (rowY[ri + rspan] ?? rowY[rowY.length - 1]) - rowY[ri],
        cell
      });
    }
  }
  for (const b of boxes) {
    if (b.cell.fill)
      page.fillRect(b.cx0, b.cy0, b.cw, b.ch, hexColor(b.cell.fill));
  }
  for (const b of boxes) {
    const lw = Math.max(0.4, pt(b.cell.borderWidth ?? 6350));
    strokeRectRaw(page, b.cx0, b.cy0, b.cw, b.ch, pageH, hexColor(b.cell.borderColor ?? "#CBD5E1"), lw);
  }
  const pad = 45720 * Math.min(sx, sy);
  for (const b of boxes) {
    if (!b.cell.txBody)
      continue;
    const lines = [];
    for (const p of b.cell.txBody.paragraphs) {
      for (const r of p.runs.length ? p.runs : [{ text: "" }]) {
        lines.push({
          text: r.text,
          v: pick(!!r.bold, !!r.italic),
          size: r.sz ?? 12,
          color: hexColor(r.color ?? "#1f1f1f"),
          align: p.align ?? "l"
        });
      }
    }
    const lineH = (lines[0]?.size ?? 12) * 1.2;
    const totalH = lines.length * lineH;
    const anchor = b.cell.anchor ?? "ctr";
    let cy = b.cy0 + pad;
    if (anchor === "ctr")
      cy = b.cy0 + (b.ch - totalH) / 2;
    else if (anchor === "b")
      cy = b.cy0 + b.ch - totalH - pad;
    for (const l of lines) {
      const asc = l.v.program.ascender / l.v.program.unitsPerEm * l.size;
      const tw2 = textWidthPt2(l.text, l.v, l.size);
      let tx2;
      if (l.align === "ctr")
        tx2 = b.cx0 + (b.cw - tw2) / 2;
      else if (l.align === "r")
        tx2 = b.cx0 + b.cw - tw2 - pad;
      else
        tx2 = b.cx0 + pad;
      drawString(page, l.v, l.size, l.color, tx2, cy + asc, l.text);
      cy += lineH;
    }
  }
}
function embedImage(doc, cache, ref) {
  const cached = cache.get(ref.part);
  if (cached !== void 0)
    return cached;
  let img = null;
  if (ref.mime === "image/jpeg") {
    const size = jpegSize(ref.bytes);
    if (size)
      img = doc.embedJpeg(ref.bytes, size.width, size.height);
  } else if (ref.mime === "image/png") {
    const png = decodePng(ref.bytes);
    if (png)
      img = doc.embedRgba(png.rgba, png.width, png.height);
  }
  cache.set(ref.part, img);
  return img;
}
function drawImageRef(page, doc, cache, ref, x2, y, w, h, srcRect) {
  const img = embedImage(doc, cache, ref);
  if (!img) {
    page.fillRect(x2, y, w, h, PLACEHOLDER);
    return;
  }
  if (srcRect) {
    const visW = Math.max(1e-4, 1 - srcRect.l - srcRect.r);
    const visH = Math.max(1e-4, 1 - srcRect.t - srcRect.b);
    const fullW = w / visW;
    const fullH = h / visH;
    const x0 = x2 - srcRect.l * fullW;
    const y0 = y - srcRect.t * fullH;
    page.content.str(`q
${fmt2(x2)} ${fmt2(page.heightPt - (y + h))} ${fmt2(w)} ${fmt2(h)} re W n
`);
    page.drawImage(img, x0, y0, fullW, fullH);
    page.content.str("Q\n");
  } else {
    page.drawImage(img, x2, y, w, h);
  }
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf/markdown.js
function escapeMarkdown(text2) {
  return text2.replace(/([\\`*_{}\[\]<>|])/g, "\\$1");
}
function median(values) {
  if (!values.length)
    return 12;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function joinItems(items) {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = "";
  let right = 0;
  for (const item of sorted) {
    const gap = item.x - right;
    if (out && gap > Math.max(1.2, item.size * 0.12) && !/^[,.;:!?%)\]}]/.test(item.text))
      out += " ";
    out += item.text;
    right = Math.max(right, item.x + item.width);
  }
  return out.replace(/\s+/g, " ").trim();
}
function makeLines(items) {
  const groups = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const group = groups.find((candidate) => {
      const y = candidate.reduce((sum, value) => sum + value.y, 0) / candidate.length;
      const size = Math.max(item.size, ...candidate.map((value) => value.size));
      return Math.abs(y - item.y) <= Math.max(1.5, size * 0.35);
    });
    if (group)
      group.push(item);
    else
      groups.push([item]);
  }
  return groups.map((group) => ({
    text: joinItems(group),
    y: group.reduce((sum, value) => sum + value.y, 0) / group.length,
    size: Math.max(...group.map((value) => value.size)),
    bold: group.filter((value) => value.bold).length * 2 >= group.length
  })).filter((line) => line.text.length > 0).sort((a, b) => b.y - a.y);
}
function listLine(text2) {
  const bullet = text2.match(/^[•●▪◦‣⁃]\s*(.*)$/u);
  if (bullet)
    return `- ${escapeMarkdown(bullet[1])}`;
  const numbered = text2.match(/^(\d+)[.)]\s+(.*)$/);
  if (numbered)
    return `${numbered[1]}. ${escapeMarkdown(numbered[2])}`;
  return void 0;
}
function linesToMarkdown(lines, inferHeadings) {
  if (!lines.length)
    return "";
  const bodySize = median(lines.map((line) => line.size).filter((size) => size > 0));
  const blocks = [];
  let paragraph = "";
  let previous;
  const flush = () => {
    if (paragraph)
      blocks.push(paragraph);
    paragraph = "";
  };
  for (const line of lines) {
    const listed = listLine(line.text);
    const isHeading = inferHeadings && line.text.length <= 160 && (line.size >= bodySize * 1.35 || line.bold && line.size >= bodySize * 1.12);
    if (listed) {
      flush();
      if (blocks.length && /^[-\d]/.test(blocks.at(-1)) && !blocks.at(-1).includes("\n\n")) {
        blocks[blocks.length - 1] += `
${listed}`;
      } else
        blocks.push(listed);
    } else if (isHeading) {
      flush();
      const level = line.size >= bodySize * 1.8 ? 1 : line.size >= bodySize * 1.45 ? 2 : 3;
      blocks.push(`${"#".repeat(level)} ${escapeMarkdown(line.text)}`);
    } else {
      const gap = previous ? previous.y - line.y : 0;
      if (paragraph && gap > Math.max(previous.size, line.size) * 1.65)
        flush();
      paragraph += `${paragraph ? " " : ""}${escapeMarkdown(line.text)}`;
    }
    previous = line;
  }
  flush();
  return blocks.join("\n\n");
}
async function pdfToMarkdown(input, options = {}) {
  const pdfjs = await import("./pdf-5NPMUG5X.js");
  const data = toUint8Array(input).slice();
  const loadingTask = pdfjs.getDocument({ data });
  const document2 = await loadingTask.promise;
  const selected = options.pages ?? Array.from({ length: document2.numPages }, (_, index) => index + 1);
  const pageHeadings = options.pageHeadings ?? document2.numPages > 1;
  const pages = [];
  try {
    for (const pageNumber of selected) {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document2.numPages) {
        throw new RangeError(`PDF page out of range: ${pageNumber}`);
      }
      const page = await document2.getPage(pageNumber);
      const content = await page.getTextContent();
      const styles = content.styles;
      const items = content.items.filter((item) => typeof item.str === "string").map((item) => {
        const family = styles[item.fontName]?.fontFamily ?? item.fontName;
        const size = Math.max(Math.abs(item.transform[0] ?? 0), Math.abs(item.transform[3] ?? 0), item.height || 0);
        return {
          text: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          width: item.width || 0,
          size: size || 12,
          bold: /bold|black|heavy|semibold/i.test(family)
        };
      }).filter((item) => item.text.trim().length > 0);
      const body = linesToMarkdown(makeLines(items), options.inferHeadings ?? true);
      pages.push(`${pageHeadings ? `## Page ${pageNumber}${body ? "\n\n" : ""}` : ""}${body}`.trim());
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.filter(Boolean).join("\n\n---\n\n").trim() + "\n";
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/pdf/html.js
function escapeHtml5(text2) {
  return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function pdfToHtml(input, options = {}) {
  const text2 = await pdfToMarkdown(input, { ...options, inferHeadings: false, pageHeadings: false });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>PDF</title><style>body{max-width:72rem;margin:2rem auto;padding:0 1rem;font:16px/1.55 system-ui,sans-serif;white-space:pre-wrap}</style></head><body>${escapeHtml5(text2.trim())}</body></html>
`;
}

// ../../../../../../vendor/office-converter/packages/office-converter/dist/index.js
var OfficeConverter = class {
  handlers = /* @__PURE__ */ new Map();
  register(source, target, handler) {
    this.handlers.set(`${source}:${target}`, handler);
    return this;
  }
  canConvert(source, target) {
    return this.handlers.has(`${source}:${target}`);
  }
  async convert(input, request) {
    const bytes = toUint8Array(input);
    const source = request.from ?? detectFormat(bytes);
    const handler = this.handlers.get(`${source}:${request.to}`);
    if (!handler)
      throw new Error(`Unsupported conversion: ${source} -> ${request.to}`);
    return handler(bytes, request.options);
  }
};
function createOfficeConverter() {
  return new OfficeConverter().register("docx", "html", (input, options) => docxToHtml(input, options)).register("docx", "markdown", (input, options) => docxToMarkdown(input, options)).register("docx", "pdf", (input, options) => docxToPdf(input, options)).register("xlsx", "html", (input, options) => xlsxToHtml(input, { fullDocument: true, ...options })).register("xlsx", "markdown", (input, options) => xlsxToMarkdown(input, options)).register("xlsx", "pdf", (input, options) => xlsxToPdf(input, options)).register("pptx", "html", (input, options) => pptxToHtml(input, { fullDocument: true, ...options })).register("pptx", "markdown", (input, options) => pptxToMarkdown(input, options)).register("pptx", "pdf", (input, options) => pptxToPdf(input, options)).register("pdf", "html", (input, options) => pdfToHtml(input, options)).register("pdf", "markdown", (input, options) => pdfToMarkdown(input, options)).register("pdf", "pdf", (input) => input.slice());
}
var defaultOfficeConverter = createOfficeConverter();

// ../slides-core/src/export/markdown.ts
function pptxToMarkdown2(bytes, opts = {}) {
  return pptxToMarkdown(bytes, opts);
}

// ../slides-core/src/export/html.ts
function pptxToHtml2(bytes, opts = {}) {
  return pptxToHtml(bytes, opts);
}

// ../slides-core/src/export/pdf.ts
function pptxToPdf2(bytes, opts = {}) {
  return pptxToPdf(bytes, opts);
}

// src/chrome-labels.ts
var LABELS4 = {
  en: {
    untitled: "Untitled presentation",
    docTitle: "Rename",
    slideOf: (n, total) => `Slide ${n} of ${total}`,
    noSlides: "No slides",
    hidden: "Hidden",
    saved: (name) => `\u201C${name}\u201D saved`,
    downloaded: (name) => `\u201C${name}\u201D downloaded`,
    exported: (name) => `\u201C${name}\u201D exported`,
    notPresentation: (name) => `\u201C${name}\u201D is not a presentation (.pptx, .ppt)`,
    openFailed: (name, msg) => `\u201C${name}\u201D could not be opened: ${msg}`,
    saveFailed: (msg) => `Not saved: ${msg}`,
    exportFailed: (msg) => `Export failed: ${msg}`,
    dropHere: "Drop the presentation to open it",
    notesPlaceholder: "Click to add speaker notes",
    nothingToPresent: "There are no slides to present",
    replaced: (n) => n === 1 ? "1 replacement" : `${n} replacements`,
    notFound: "No matches",
    found: (i2, n) => `${i2} of ${n}`,
    printTitle: "Presentation",
    linkPrompt: "Address (URL)",
    linkTitle: "Link",
    noTextShape: "Select a shape with text",
    stillLoading: "The presentation is still loading",
    pdfFonts: "The PDF needs the open fonts (fonts attribute or FontResolver base URL).",
    unsaved: (name) => `\u201C${name}\u201D has unsaved changes`,
    seconds: "s"
  },
  pt: {
    untitled: "Apresenta\xE7\xE3o sem t\xEDtulo",
    docTitle: "Renomear",
    slideOf: (n, total) => `Slide ${n} de ${total}`,
    noSlides: "Nenhum slide",
    hidden: "Oculto",
    saved: (name) => `\u201C${name}\u201D salvo`,
    downloaded: (name) => `\u201C${name}\u201D baixado`,
    exported: (name) => `\u201C${name}\u201D exportado`,
    notPresentation: (name) => `\u201C${name}\u201D n\xE3o \xE9 uma apresenta\xE7\xE3o (.pptx, .ppt)`,
    openFailed: (name, msg) => `\u201C${name}\u201D n\xE3o abriu: ${msg}`,
    saveFailed: (msg) => `N\xE3o salvou: ${msg}`,
    exportFailed: (msg) => `N\xE3o exportou: ${msg}`,
    dropHere: "Solte a apresenta\xE7\xE3o para abrir",
    notesPlaceholder: "Clique para adicionar anota\xE7\xF5es",
    nothingToPresent: "N\xE3o h\xE1 slides para apresentar",
    replaced: (n) => n === 1 ? "1 substitui\xE7\xE3o" : `${n} substitui\xE7\xF5es`,
    notFound: "Nada encontrado",
    found: (i2, n) => `${i2} de ${n}`,
    printTitle: "Apresenta\xE7\xE3o",
    linkPrompt: "Endere\xE7o (URL)",
    linkTitle: "Link",
    noTextShape: "Selecione uma forma com texto",
    stillLoading: "A apresenta\xE7\xE3o ainda est\xE1 carregando",
    pdfFonts: "O PDF precisa das fontes abertas (atributo fonts ou a base do FontResolver).",
    unsaved: (name) => `\u201C${name}\u201D tem altera\xE7\xF5es n\xE3o salvas`,
    seconds: "s"
  },
  es: {
    untitled: "Presentaci\xF3n sin t\xEDtulo",
    docTitle: "Cambiar nombre",
    slideOf: (n, total) => `Diapositiva ${n} de ${total}`,
    noSlides: "No hay diapositivas",
    hidden: "Oculto",
    saved: (name) => `\u201C${name}\u201D guardado`,
    downloaded: (name) => `\u201C${name}\u201D descargado`,
    exported: (name) => `\u201C${name}\u201D exportado`,
    notPresentation: (name) => `\u201C${name}\u201D no es una presentaci\xF3n (.pptx, .ppt)`,
    openFailed: (name, msg) => `No se pudo abrir \u201C${name}\u201D: ${msg}`,
    saveFailed: (msg) => `No se pudo guardar: ${msg}`,
    exportFailed: (msg) => `No se pudo exportar: ${msg}`,
    dropHere: "Suelta la presentaci\xF3n para abrirla",
    notesPlaceholder: "Haz clic para agregar notas",
    nothingToPresent: "No hay diapositivas para presentar",
    replaced: (n) => n === 1 ? "1 reemplazo" : `${n} reemplazos`,
    notFound: "No hay coincidencias",
    found: (i2, n) => `${i2} de ${n}`,
    printTitle: "Presentaci\xF3n",
    linkPrompt: "Direcci\xF3n (URL)",
    linkTitle: "V\xEDnculo",
    noTextShape: "Selecciona una forma con texto",
    stillLoading: "La presentaci\xF3n todav\xEDa se est\xE1 cargando",
    pdfFonts: "El PDF necesita las fuentes abiertas (atributo fonts o la URL base del FontResolver).",
    unsaved: (name) => `\u201C${name}\u201D tiene cambios sin guardar`,
    seconds: "s"
  }
};

// src/chrome-app.ts
var PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
var EXPORT_MIME = { pdf: "application/pdf", html: "text/html", md: "text/markdown", png: "image/png" };
var picker = () => typeof window !== "undefined" ? window : {};
function download(data, name, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
}
var ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
    }
  }
};
function instanceStore(el) {
  const key = () => el.getAttribute("storage-key") || el.id || null;
  return {
    get: (name) => {
      const k = key();
      return k ? ls.get(`us:${k}:${name}`) : null;
    },
    set: (name, v) => {
      const k = key();
      if (k) ls.set(`us:${k}:${name}`, v);
    }
  };
}
function looksLikePresentation(bytes, name) {
  return /\.(pptx|pptm|ppsx|ppsm|potx|ppt|pps)$/i.test(name) || bytes[0] === 80 && bytes[1] === 75 || bytes[0] === 208 && bytes[1] === 207;
}
var SlidesApp = class {
  constructor(el) {
    this.el = el;
    this.prefs = instanceStore(el);
  }
  el;
  ui = null;
  prefs;
  fileHandle = null;
  fontNote = "";
  detachFn = null;
  boundHost = void 0;
  get L() {
    return pickLabels(this.el, LABELS4);
  }
  /** Nome exibido (o do documento ou "Apresentação sem título"). */
  get title() {
    return this.el.documentName || this.L.untitled;
  }
  /** Nome de arquivo sugerido (sem caracteres proibidos). */
  fileName(ext) {
    return `${this.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "presentation"}.${ext}`;
  }
  flash(msg) {
    if (this.ui) this.ui.flash(msg);
  }
  /** Ouvintes de aplicativo (dirty → host, aviso ao sair). detach() tira todos. */
  attach() {
    if (this.detachFn) return;
    const ac = new AbortController();
    const signal = ac.signal;
    this.el.addEventListener("us-dirty", () => this.pushDirty(), { signal });
    this.el.addEventListener("us-title-change", () => {
      this.el.appHost?.setTitle?.(this.title);
      this.pushDirty();
      this.ui?.sync();
    }, { signal });
    this.el.addEventListener("us-font-embedding", ((e) => {
      this.fontNote = describeFontEmbedding(e.detail, this.el);
    }), { signal });
    window.addEventListener("beforeunload", (e) => {
      this.flushPending();
      if (this.el.isDirty() && !this.el.appHost?.setDirty) e.preventDefault();
    }, { signal });
    this.detachFn = () => ac.abort();
  }
  detach() {
    this.detachFn?.();
    this.detachFn = null;
    this.boundHost = void 0;
  }
  /** Liga o host atual (uma vez por host): título, salvar ao fechar. */
  bindHost() {
    const host = this.el.appHost;
    if (host === this.boundHost) return;
    this.boundHost = host;
    host?.setTitle?.(this.title);
    host?.onSaveBeforeClose?.(() => {
      void this.save(false).then((ok) => {
        if (ok) host.closeWindow?.();
      });
    });
    this.pushDirty();
  }
  pushDirty() {
    this.el.appHost?.setDirty?.(this.el.isDirty(), this.title);
  }
  /**
   * Há texto digitado num painel e ainda não gravado: o host já trata a janela
   * como alterada (fechar pergunta antes); sem pendência volta ao estado real.
   */
  setPending(pending) {
    this.el.appHost?.setDirty?.(pending || this.el.isDirty(), this.title);
  }
  /** Antes de salvar, exportar ou imprimir: o texto digitado nos painéis entra no documento. */
  flushPending() {
    this.ui?.flush?.();
  }
  // ───── abrir ─────
  /** Abrir… (host, File System Access ou <input type=file>). */
  async open() {
    const host = this.el.appHost;
    if (host?.openFile) {
      const f = await host.openFile();
      if (f) this.openBytes(toBytes(f), f.name, null, f.path);
      return;
    }
    const p = picker();
    if (p.showOpenFilePicker) {
      try {
        const [h] = await p.showOpenFilePicker({
          types: [{ description: "PowerPoint", accept: { [PPTX_MIME]: [".pptx", ".pptm", ".ppsx", ".potx"], "application/vnd.ms-powerpoint": [".ppt", ".pps"] } }]
        });
        if (!h) return;
        const file = await h.getFile();
        this.openBytes(new Uint8Array(await file.arrayBuffer()), file.name, h);
      } catch {
      }
      return;
    }
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".pptx,.pptm,.ppsx,.potx,.ppt,.pps" });
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (file) await this.openFile(file);
    });
    input.click();
  }
  async openFile(file) {
    return this.openBytes(new Uint8Array(await file.arrayBuffer()), file.name, null);
  }
  /** Abre bytes (arquivo solto, recente, host). false = não abriu (aviso na barra). */
  openBytes(bytes, name, handle, path) {
    if (!looksLikePresentation(bytes, name)) {
      this.flash(`\u26A0 ${this.L.notPresentation(name)}`);
      return false;
    }
    try {
      this.el.openPresentation(bytes, { name, path: path ?? null });
    } catch (e) {
      this.flash(`\u26A0 ${this.L.openFailed(name, e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    this.fileHandle = /\.pptx$/i.test(name) ? handle : null;
    if (path && !/\.pptx$/i.test(name)) this.el.documentPath = null;
    this.el.appHost?.setTitle?.(this.title);
    this.ui?.sync();
    return true;
  }
  /** Nova apresentação em branco. */
  newPresentation() {
    this.el.newPresentation();
    this.fileHandle = null;
    this.el.appHost?.setTitle?.(this.title);
    this.ui?.sync();
  }
  // ───── salvar ─────
  /** Salvar (no mesmo lugar, se houver) ou Salvar como. true = gravou. */
  async save(saveAs) {
    this.flushPending();
    let bytes;
    this.fontNote = "";
    try {
      bytes = await this.el.savePptx();
    } catch (e) {
      this.flash(`\u26A0 ${this.L.saveFailed(e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    const name = this.fileName("pptx");
    const note = this.fontNote ? ` \xB7 ${this.fontNote}` : "";
    const host = this.el.appHost;
    try {
      if (host?.saveFile) {
        const r = await host.saveFile(bytes, { name, saveAs, ...!saveAs && this.el.documentPath ? { path: this.el.documentPath } : {} });
        if (!r) return false;
        const saved = typeof r === "string" ? { name: r } : r;
        this.el.documentPath = saved.path ?? this.el.documentPath;
        this.el.documentName = saved.name.replace(/\.(pptx|ppt)$/i, "");
        this.el.markClean();
        this.flash(this.L.saved(saved.name) + note);
        return true;
      }
      const p = picker();
      if (this.fileHandle && !saveAs) {
        await writeHandle(this.fileHandle, bytes);
      } else if (p.showSaveFilePicker) {
        let h;
        try {
          h = await p.showSaveFilePicker({ suggestedName: name, types: [{ description: "PowerPoint", accept: { [PPTX_MIME]: [".pptx"] } }] });
        } catch {
          return false;
        }
        await writeHandle(h, bytes);
        this.fileHandle = h;
        this.el.documentName = h.name.replace(/\.pptx$/i, "");
      } else {
        download(bytes, name, PPTX_MIME);
        this.el.markClean();
        this.flash(this.L.downloaded(name) + note);
        return true;
      }
    } catch (e) {
      this.flash(`\u26A0 ${this.L.saveFailed(e instanceof Error ? e.message : String(e))}`);
      return false;
    }
    this.el.markClean();
    this.flash(this.L.saved(this.fileName("pptx")) + note);
    return true;
  }
  // ───── exportar ─────
  /** Bytes (ou texto) de um formato de exportação. */
  async exportData(kind) {
    if (kind === "png") return this.slidePng(this.el.getSlideIndex());
    const pptx = await this.el.savePptx();
    if (kind === "html") return pptxToHtml2(pptx, { images: "data", fullDocument: true });
    if (kind === "md") return pptxToMarkdown2(pptx, { images: "data" });
    const fonts = await pdfFonts();
    if (!fonts.length) throw new Error(this.L.pdfFonts);
    return pptxToPdf2(pptx, { fonts });
  }
  /** PNG do slide `i` (o mesmo motor da tela, 1920 px de largura). */
  async slidePng(i2) {
    await this.el.fontsReady();
    const c2 = document.createElement("canvas");
    this.el.renderSlideToCanvas(i2, c2, 1920);
    const blob = await new Promise((r) => c2.toBlob(r, "image/png"));
    if (!blob) throw new Error("canvas");
    return new Uint8Array(await blob.arrayBuffer());
  }
  /** Baixar como / Exportar (pelo host, se houver). */
  async export(kind) {
    this.flushPending();
    const ext = kind;
    const name = kind === "png" ? `${this.fileName("png").replace(/\.png$/, "")} ${this.el.getSlideIndex() + 1}.png` : this.fileName(ext);
    const host = this.el.appHost;
    try {
      if (host?.exportFile) {
        const saved = await host.exportFile(kind, name, () => this.exportData(kind));
        if (saved) this.flash(this.L.exported(saved));
        return;
      }
      const data = await this.exportData(kind);
      download(data, name, EXPORT_MIME[kind]);
      this.flash(this.L.downloaded(name));
    } catch (e) {
      this.flash(`\u26A0 ${this.L.exportFailed(e instanceof Error ? e.message : String(e))}`);
    }
  }
  // ───── imprimir ─────
  /** Imprimir: um slide por folha (paisagem), pintados pelo motor da tela. */
  async print() {
    this.flushPending();
    const n = this.el.getSlideCount();
    if (!n) {
      this.flash(this.L.nothingToPresent);
      return;
    }
    await this.el.fontsReady();
    const pages = [];
    const c2 = document.createElement("canvas");
    for (let i2 = 0; i2 < n; i2++) {
      this.el.renderSlideToCanvas(i2, c2, 1600);
      pages.push(c2.toDataURL("image/png"));
    }
    const title = this.title;
    const host = this.el.appHost;
    if (host?.print) {
      await host.print({ pages, title, landscape: true });
      return;
    }
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml6(title)}</title><style>@page{size:landscape;margin:8mm}html,body{margin:0}img{display:block;width:100%;height:auto;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}</style><body>${pages.map((p) => `<img src="${p}">`).join("")}</body>`);
    doc.close();
    const w = frame.contentWindow;
    await Promise.all([...doc.images].map((img) => img.complete ? Promise.resolve() : new Promise((r) => {
      img.onload = img.onerror = r;
    })));
    const cleanup = () => {
      setTimeout(() => frame.remove(), 500);
    };
    w.addEventListener("afterprint", cleanup, { once: true });
    w.focus();
    w.print();
    setTimeout(cleanup, 6e4);
  }
  /** Aviso flutuante quando não há barra de status. */
  toast(msg) {
    if (this.ui) showToast(this.ui.layer, msg);
  }
};
var apps = /* @__PURE__ */ new WeakMap();
function appFor(el) {
  let a = apps.get(el);
  if (!a) apps.set(el, a = new SlidesApp(el));
  return a;
}
function toBytes(f) {
  return f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes);
}
async function writeHandle(h, bytes) {
  const w = await h.createWritable();
  await w.write(bytes);
  await w.close();
}
var escapeHtml6 = (s) => s.replace(/[&<>"]/g, (c2) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c2] ?? c2);
async function pdfFonts() {
  const faces = await FontResolver.shared().bundledFaces("Liberation Sans", ["regular", "bold", "italic", "boldItalic"]);
  const out = [];
  const add = (v, bold, italic) => {
    const b = faces[v];
    if (b) out.push({ bytes: b, bold, italic, name: `LiberationSans${v === "regular" ? "" : v[0].toUpperCase() + v.slice(1)}` });
  };
  add("regular", false, false);
  add("bold", true, false);
  add("italic", false, true);
  add("boldItalic", true, true);
  return out;
}

// src/chrome-icons.ts
var ICONS = {
  "add_photo_alternate": '<path d="M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H480Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200V-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480V-200Q840-167 816.5-143.5Q793-120 760-120ZM240-280H720L570-480L450-320L360-440ZM680-680H640Q623-680 611.5-691.5Q600-703 600-720Q600-737 611.5-748.5Q623-760 640-760H680V-800Q680-817 691.5-828.5Q703-840 720-840Q737-840 748.5-828.5Q760-817 760-800V-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680H760V-640Q760-623 748.5-611.5Q737-600 720-600Q703-600 691.5-611.5Q680-623 680-640Z"/>',
  "add_to_photos": '<path d="M600-440V-520H680Q697-520 708.5-531.5Q720-543 720-560Q720-577 708.5-588.5Q697-600 680-600H600V-680Q600-697 588.5-708.5Q577-720 560-720Q543-720 531.5-708.5Q520-697 520-680V-600H440Q423-600 411.5-588.5Q400-577 400-560Q400-543 411.5-531.5Q423-520 440-520H520V-440Q520-423 531.5-411.5Q543-400 560-400Q577-400 588.5-411.5Q600-423 600-440ZM320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z"/>',
  "ads_click": '<path d="M480-640Q414-640 367-593Q320-546 320-480Q320-435 342.5-397Q365-359 405-338Q421-330 427.5-314.5Q434-299 427-283Q420-269 406-262Q392-255 378-262Q315-292 277.5-351Q240-410 240-480Q240-580 310-650Q380-720 480-720Q551-720 610.5-682.5Q670-645 699-580Q705-566 698.5-552Q692-538 678-532Q662-525 646-532Q630-539 622-555Q601-595 563-617.5Q525-640 480-640ZM480-800Q346-800 253-707Q160-614 160-480Q160-354 243-264Q326-174 451-162Q468-160 480.5-147Q493-134 492-117Q491-100 479.5-89Q468-78 451-79Q373-84 305.5-118Q238-152 187.5-206.5Q137-261 108.5-331.5Q80-402 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q637-880 753.5-773Q870-666 881-509Q883-493 871.5-481.5Q860-470 843-469Q826-468 812.5-480Q799-492 797-509Q782-629 692.5-714.5Q603-800 480-800ZM782-100 650-231 620-140Q615-126 601-126.5Q587-127 582-141L491-444Q487-455 496-464Q505-473 516-469L819-378Q833-373 833.5-359Q834-345 820-340L729-310L861-178Q878-161 878-139Q878-117 861-100Q844-83 821.5-83Q799-83 782-100Z"/>',
  "animation": '<path d="M360-80Q302-80 251-102Q200-124 162-162Q124-200 102-251Q80-302 80-360Q80-441 122-508Q164-575 232-610Q252-649 281.5-678.5Q311-708 350-728Q383-796 451-838Q519-880 600-880Q658-880 709-858Q760-836 798-798Q836-760 858-709Q880-658 880-600Q880-515 838-450Q796-385 728-350Q708-311 678.5-281.5Q649-252 610-232Q575-164 508-122Q441-80 360-80ZM360-160Q393-160 423.5-170Q454-180 480-200Q422-200 371-222Q320-244 282-282Q244-320 222-371Q200-422 200-480Q180-454 170-423.5Q160-393 160-360Q160-318 176-282Q192-246 219-219Q246-192 282-176Q318-160 360-160ZM480-280Q513-280 544.5-290Q576-300 602-320Q543-320 492-342.5Q441-365 403-403Q365-441 342.5-492Q320-543 320-602Q300-576 290-544.5Q280-513 280-480Q280-438 295.5-402Q311-366 339-339Q366-311 402-295.5Q438-280 480-280ZM600-400Q618-400 634.5-403Q651-406 668-412Q690-472 674.5-527.5Q659-583 621-621Q583-659 527.5-674.5Q472-690 412-668Q406-651 403-634.5Q400-618 400-600Q400-558 415.5-522Q431-486 459-459Q486-431 522-415.5Q558-400 600-400ZM760-478Q780-504 790-535.5Q800-567 800-600Q800-642 784.5-678Q769-714 741-741Q714-769 678-784.5Q642-800 600-800Q565-800 534.5-790Q504-780 478-760Q537-760 588-737.5Q639-715 677-677Q715-639 737.5-588Q760-537 760-478Z"/>',
  "arrow_downward": '<path d="M440-313V-760Q440-777 451.5-788.5Q463-800 480-800Q497-800 508.5-788.5Q520-777 520-760V-313L716-509Q728-521 744-520.5Q760-520 772-508Q783-496 783.5-480Q784-464 772-452L508-188Q502-182 495-179.5Q488-177 480-177Q472-177 465-179.5Q458-182 452-188L188-452Q177-463 177-479.5Q177-496 188-508Q200-520 216.5-520Q233-520 245-508Z"/>',
  "arrow_upward": '<path d="M440-647 244-451Q232-439 216-439.5Q200-440 188-452Q177-464 176.5-480Q176-496 188-508L452-772Q458-778 465-780.5Q472-783 480-783Q488-783 495-780.5Q502-778 508-772L772-508Q783-497 783-480.5Q783-464 772-452Q760-440 743.5-440Q727-440 715-452L520-647V-200Q520-183 508.5-171.5Q497-160 480-160Q463-160 451.5-171.5Q440-183 440-200Z"/>',
  "auto_awesome_motion": '<path d="M480-80Q447-80 423.5-103.5Q400-127 400-160V-480Q400-513 423.5-536.5Q447-560 480-560H800Q833-560 856.5-536.5Q880-513 880-480V-160Q880-127 856.5-103.5Q833-80 800-80ZM480-160H800Q800-160 800-160Q800-160 800-160V-480Q800-480 800-480Q800-480 800-480H480Q480-480 480-480Q480-480 480-480V-160Q480-160 480-160Q480-160 480-160ZM240-280V-640Q240-673 263.5-696.5Q287-720 320-720H680Q697-720 708.5-708.5Q720-697 720-680Q720-663 708.5-651.5Q697-640 680-640H320Q320-640 320-640Q320-640 320-640V-280Q320-263 308.5-251.5Q297-240 280-240Q263-240 251.5-251.5Q240-263 240-280ZM80-440V-800Q80-833 103.5-856.5Q127-880 160-880H520Q537-880 548.5-868.5Q560-857 560-840Q560-823 548.5-811.5Q537-800 520-800H160Q160-800 160-800Q160-800 160-800V-440Q160-423 148.5-411.5Q137-400 120-400Q103-400 91.5-411.5Q80-423 80-440ZM480-160Q480-160 480-160Q480-160 480-160V-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480V-160Q480-160 480-160Q480-160 480-160Z"/>',
  "block": '<path d="M80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480ZM480-160Q534-160 584-177.5Q634-195 676-228L228-676Q195-634 177.5-584Q160-534 160-480Q160-346 253-253Q346-160 480-160ZM732-284Q765-326 782.5-376Q800-426 800-480Q800-614 707-707Q614-800 480-800Q426-800 376-782.5Q326-765 284-732Z"/>',
  "chrome_reader_mode": '<path d="M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H440V-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM520-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H520ZM730-360Q743-360 751.5-368.5Q760-377 760-390Q760-403 751.5-411.5Q743-420 730-420H590Q577-420 568.5-411.5Q560-403 560-390Q560-377 568.5-368.5Q577-360 590-360ZM730-460Q743-460 751.5-468.5Q760-477 760-490Q760-503 751.5-511.5Q743-520 730-520H590Q577-520 568.5-511.5Q560-503 560-490Q560-477 568.5-468.5Q577-460 590-460ZM730-560Q743-560 751.5-568.5Q760-577 760-590Q760-603 751.5-611.5Q743-620 730-620H590Q577-620 568.5-611.5Q560-603 560-590Q560-577 568.5-568.5Q577-560 590-560ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720V-240Z"/>',
  "dashboard": '<path d="M520-640V-800Q520-817 531.5-828.5Q543-840 560-840H800Q817-840 828.5-828.5Q840-817 840-800V-640Q840-623 828.5-611.5Q817-600 800-600H560Q543-600 531.5-611.5Q520-623 520-640ZM120-480V-800Q120-817 131.5-828.5Q143-840 160-840H400Q417-840 428.5-828.5Q440-817 440-800V-480Q440-463 428.5-451.5Q417-440 400-440H160Q143-440 131.5-451.5Q120-463 120-480ZM520-160V-480Q520-497 531.5-508.5Q543-520 560-520H800Q817-520 828.5-508.5Q840-497 840-480V-160Q840-143 828.5-131.5Q817-120 800-120H560Q543-120 531.5-131.5Q520-143 520-160ZM120-160V-320Q120-337 131.5-348.5Q143-360 160-360H400Q417-360 428.5-348.5Q440-337 440-320V-160Q440-143 428.5-131.5Q417-120 400-120H160Q143-120 131.5-131.5Q120-143 120-160ZM200-520H360V-760H200ZM600-200H760V-440H600ZM600-680H760V-760H600ZM200-200H360V-280H200ZM360-520ZM600-680ZM600-440ZM360-280Z"/>',
  "keyboard_double_arrow_down": '<path d="M480-313 636-468Q647-479 663.5-479.5Q680-480 692-468Q703-457 703-440Q703-423 692-412L508-228Q502-222 495-219.5Q488-217 480-217Q472-217 465-219.5Q458-222 452-228L268-412Q257-423 256.5-439.5Q256-456 268-468Q279-479 296-479Q313-479 324-468ZM480-553 636-708Q647-719 663.5-719.5Q680-720 692-708Q703-697 703-680Q703-663 692-652L508-468Q502-462 495-459.5Q488-457 480-457Q472-457 465-459.5Q458-462 452-468L268-652Q257-663 256.5-679.5Q256-696 268-708Q279-719 296-719Q313-719 324-708Z"/>',
  "keyboard_double_arrow_up": '<path d="M480-407 324-252Q313-241 296.5-240.5Q280-240 268-252Q257-263 257-280Q257-297 268-308L452-492Q458-498 465-500.5Q472-503 480-503Q488-503 495-500.5Q502-498 508-492L692-308Q703-297 703.5-280.5Q704-264 692-252Q681-241 664-241Q647-241 636-252ZM480-647 324-492Q313-481 296.5-480.5Q280-480 268-492Q257-503 257-520Q257-537 268-548L452-732Q458-738 465-740.5Q472-743 480-743Q488-743 495-740.5Q502-738 508-732L692-548Q703-537 703.5-520.5Q704-504 692-492Q681-481 664-481Q647-481 636-492Z"/>',
  "library_add": '<path d="M600-440V-520H680Q697-520 708.5-531.5Q720-543 720-560Q720-577 708.5-588.5Q697-600 680-600H600V-680Q600-697 588.5-708.5Q577-720 560-720Q543-720 531.5-708.5Q520-697 520-680V-600H440Q423-600 411.5-588.5Q400-577 400-560Q400-543 411.5-531.5Q423-520 440-520H520V-440Q520-423 531.5-411.5Q543-400 560-400Q577-400 588.5-411.5Q600-423 600-440ZM320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z"/>',
  "play_arrow": '<path d="M320-273V-687Q320-704 332-715.5Q344-727 360-727Q365-727 370.5-725.5Q376-724 381-721L707-514Q716-508 720.5-499Q725-490 725-480Q725-470 720.5-461Q716-452 707-446L381-239Q376-236 370.5-234.5Q365-233 360-233Q344-233 332-244.5Q320-256 320-273ZM400-480ZM400-346 610-480 400-614Z"/>',
  "present_to_all": '<path d="M440-487V-360Q440-343 451.5-331.5Q463-320 480-320Q497-320 508.5-331.5Q520-343 520-360V-486L556-451Q568-440 584-439.5Q600-439 612-451Q624-463 624-479.5Q624-496 612-508L508-612Q496-624 480-624Q464-624 452-612L348-508Q336-496 336.5-480Q337-464 349-452Q361-441 377-440.5Q393-440 405-452ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z"/>',
  "preview": '<path d="M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-680H200V-200Q200-200 200-200Q200-200 200-200ZM240-440Q269-511 333.5-555.5Q398-600 480-600Q562-600 626.5-555.5Q691-511 720-440Q691-369 626.5-324.5Q562-280 480-280Q398-280 333.5-324.5Q269-369 240-440ZM654-440Q628-487 582-513.5Q536-540 480-540Q424-540 378-513.5Q332-487 306-440Q332-393 378-366.5Q424-340 480-340Q536-340 582-366.5Q628-393 654-440ZM480-380Q505-380 522.5-397.5Q540-415 540-440Q540-465 522.5-482.5Q505-500 480-500Q455-500 437.5-482.5Q420-465 420-440Q420-415 437.5-397.5Q455-380 480-380Z"/>',
  "slideshow": '<path d="M634-463Q643-469 643-480Q643-491 634-497L411-640Q401-647 390.5-641Q380-635 380-623V-337Q380-325 390.5-319Q401-313 411-320ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z"/>',
  "speaker_notes": '<path d="M280-400Q297-400 308.5-411.5Q320-423 320-440Q320-457 308.5-468.5Q297-480 280-480Q263-480 251.5-468.5Q240-457 240-440Q240-423 251.5-411.5Q263-400 280-400ZM280-520Q297-520 308.5-531.5Q320-543 320-560Q320-577 308.5-588.5Q297-600 280-600Q263-600 251.5-588.5Q240-577 240-560Q240-543 251.5-531.5Q263-520 280-520ZM280-640Q297-640 308.5-651.5Q320-663 320-680Q320-697 308.5-708.5Q297-720 280-720Q263-720 251.5-708.5Q240-697 240-680Q240-663 251.5-651.5Q263-640 280-640ZM440-400H560Q577-400 588.5-411.5Q600-423 600-440Q600-457 588.5-468.5Q577-480 560-480H440Q423-480 411.5-468.5Q400-457 400-440Q400-423 411.5-411.5Q423-400 440-400ZM440-520H680Q697-520 708.5-531.5Q720-543 720-560Q720-577 708.5-588.5Q697-600 680-600H440Q423-600 411.5-588.5Q400-577 400-560Q400-543 411.5-531.5Q423-520 440-520ZM440-640H680Q697-640 708.5-651.5Q720-663 720-680Q720-697 708.5-708.5Q697-720 680-720H440Q423-720 411.5-708.5Q400-697 400-680Q400-663 411.5-651.5Q423-640 440-640ZM240-240 148-148Q129-129 104.5-139.5Q80-150 80-177V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM206-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-275ZM160-320V-800Q160-800 160-800Q160-800 160-800Q160-800 160-800Q160-800 160-800V-320Q160-320 160-320Q160-320 160-320Z"/>',
  "timer": '<path d="M400-840Q383-840 371.5-851.5Q360-863 360-880Q360-897 371.5-908.5Q383-920 400-920H560Q577-920 588.5-908.5Q600-897 600-880Q600-863 588.5-851.5Q577-840 560-840ZM520-440V-600Q520-617 508.5-628.5Q497-640 480-640Q463-640 451.5-628.5Q440-617 440-600V-440Q440-423 451.5-411.5Q463-400 480-400Q497-400 508.5-411.5Q520-423 520-440ZM480-800Q542-800 599-780Q656-760 706-722L734-750Q745-761 762-761Q779-761 790-750Q801-739 801-722Q801-705 790-694L762-666Q800-616 820-559Q840-502 840-440Q840-366 811.5-300.5Q783-235 734-186Q685-137 619.5-108.5Q554-80 480-80Q406-80 340.5-108.5Q275-137 226-186Q177-235 148.5-300.5Q120-366 120-440Q120-514 148.5-579.5Q177-645 226-694Q275-743 340.5-771.5Q406-800 480-800ZM480-160Q596-160 678-242Q760-324 760-440Q760-556 678-638Q596-720 480-720Q364-720 282-638Q200-556 200-440Q200-324 282-242Q364-160 480-160Z"/>',
  "transition_fade": '<path d="M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H320Q353-840 376.5-816.5Q400-793 400-760V-200Q400-167 376.5-143.5Q353-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM440-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320Q520-303 508.5-291.5Q497-280 480-280Q463-280 451.5-291.5Q440-303 440-320ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM480-600Q463-600 451.5-611.5Q440-623 440-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Q520-623 508.5-611.5Q497-600 480-600ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM520-240Q520-257 531.5-268.5Q543-280 560-280Q577-280 588.5-268.5Q600-257 600-240Q600-223 588.5-211.5Q577-200 560-200Q543-200 531.5-211.5Q520-223 520-240ZM560-360Q543-360 531.5-371.5Q520-383 520-400Q520-417 531.5-428.5Q543-440 560-440Q577-440 588.5-428.5Q600-417 600-400Q600-383 588.5-371.5Q577-360 560-360ZM560-520Q543-520 531.5-531.5Q520-543 520-560Q520-577 531.5-588.5Q543-600 560-600Q577-600 588.5-588.5Q600-577 600-560Q600-543 588.5-531.5Q577-520 560-520ZM520-720Q520-737 531.5-748.5Q543-760 560-760Q577-760 588.5-748.5Q600-737 600-720Q600-703 588.5-691.5Q577-680 560-680Q543-680 531.5-691.5Q520-703 520-720ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM600-320Q600-337 611.5-348.5Q623-360 640-360Q657-360 668.5-348.5Q680-337 680-320Q680-303 668.5-291.5Q657-280 640-280Q623-280 611.5-291.5Q600-303 600-320ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM640-600Q623-600 611.5-611.5Q600-623 600-640Q600-657 611.5-668.5Q623-680 640-680Q657-680 668.5-668.5Q680-657 680-640Q680-623 668.5-611.5Q657-600 640-600ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM720-200Q703-200 691.5-211.5Q680-223 680-240Q680-257 691.5-268.5Q703-280 720-280Q737-280 748.5-268.5Q760-257 760-240Q760-223 748.5-211.5Q737-200 720-200ZM720-360Q703-360 691.5-371.5Q680-383 680-400Q680-417 691.5-428.5Q703-440 720-440Q737-440 748.5-428.5Q760-417 760-400Q760-383 748.5-371.5Q737-360 720-360ZM720-520Q703-520 691.5-531.5Q680-543 680-560Q680-577 691.5-588.5Q703-600 720-600Q737-600 748.5-588.5Q760-577 760-560Q760-543 748.5-531.5Q737-520 720-520ZM680-720Q680-737 691.5-748.5Q703-760 720-760Q737-760 748.5-748.5Q760-737 760-720Q760-703 748.5-691.5Q737-680 720-680Q703-680 691.5-691.5Q680-703 680-720ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600Q783-600 771.5-611.5Q760-623 760-640ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760Z"/>',
  "view_carousel": '<path d="M80-360V-600Q80-633 103.5-656.5Q127-680 160-680Q193-680 216.5-656.5Q240-633 240-600V-360Q240-327 216.5-303.5Q193-280 160-280Q127-280 103.5-303.5Q80-327 80-360ZM360-200Q327-200 303.5-223.5Q280-247 280-280V-680Q280-713 303.5-736.5Q327-760 360-760H600Q633-760 656.5-736.5Q680-713 680-680V-280Q680-247 656.5-223.5Q633-200 600-200ZM720-360V-600Q720-633 743.5-656.5Q767-680 800-680Q833-680 856.5-656.5Q880-633 880-600V-360Q880-327 856.5-303.5Q833-280 800-280Q767-280 743.5-303.5Q720-327 720-360ZM360-280H600Q600-280 600-280Q600-280 600-280V-680Q600-680 600-680Q600-680 600-680H360Q360-680 360-680Q360-680 360-680V-280Q360-280 360-280Q360-280 360-280Z"/>',
  "wallpaper": '<path d="M200-120Q167-120 143.5-143.5Q120-167 120-200V-400Q120-417 131.5-428.5Q143-440 160-440Q177-440 188.5-428.5Q200-417 200-400V-200Q200-200 200-200Q200-200 200-200H400Q417-200 428.5-188.5Q440-177 440-160Q440-143 428.5-131.5Q417-120 400-120ZM760-120H560Q543-120 531.5-131.5Q520-143 520-160Q520-177 531.5-188.5Q543-200 560-200H760Q760-200 760-200Q760-200 760-200V-400Q760-417 771.5-428.5Q783-440 800-440Q817-440 828.5-428.5Q840-417 840-400V-200Q840-167 816.5-143.5Q793-120 760-120ZM450-320 554-459Q560-467 570-467Q580-467 586-459L696-312Q704-302 698-291Q692-280 680-280H280Q268-280 262-291Q256-302 264-312L344-419Q350-427 360-427Q370-427 376-419ZM120-760Q120-793 143.5-816.5Q167-840 200-840H400Q417-840 428.5-828.5Q440-817 440-800Q440-783 428.5-771.5Q417-760 400-760H200Q200-760 200-760Q200-760 200-760V-560Q200-543 188.5-531.5Q177-520 160-520Q143-520 131.5-531.5Q120-543 120-560ZM840-760V-560Q840-543 828.5-531.5Q817-520 800-520Q783-520 771.5-531.5Q760-543 760-560V-760Q760-760 760-760Q760-760 760-760H560Q543-760 531.5-771.5Q520-783 520-800Q520-817 531.5-828.5Q543-840 560-840H760Q793-840 816.5-816.5Q840-793 840-760ZM620-560Q594-560 577-577Q560-594 560-620Q560-646 577-663Q594-680 620-680Q646-680 663-663Q680-646 680-620Q680-594 663-577Q646-560 620-560Z"/>',
  "zoom_out_map": '<path d="M256-200H320Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120H160Q143-120 131.5-131.5Q120-143 120-160V-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320V-256L296-352Q307-363 324-363Q341-363 352-352Q363-341 363-324Q363-307 352-296ZM704-200 608-296Q597-307 597-324Q597-341 608-352Q619-363 636-363Q653-363 664-352L760-256V-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320V-160Q840-143 828.5-131.5Q817-120 800-120H640Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200ZM200-704V-640Q200-623 188.5-611.5Q177-600 160-600Q143-600 131.5-611.5Q120-623 120-640V-800Q120-817 131.5-828.5Q143-840 160-840H320Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760H256L352-664Q363-653 363-636Q363-619 352-608Q341-597 324-597Q307-597 296-608ZM760-704 664-608Q653-597 636-597Q619-597 608-608Q597-619 597-636Q597-653 608-664L704-760H640Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840H800Q817-840 828.5-828.5Q840-817 840-800V-640Q840-623 828.5-611.5Q817-600 800-600Q783-600 771.5-611.5Q760-623 760-640Z"/>'
};

// src/chrome-commands.ts
var ic = (name) => ICONS[name] ?? name;
var L = (en, pt2, es) => ({ en, pt: pt2, es });
var TRANSITION_LABELS = {
  none: L("None", "Nenhuma", "Ninguno"),
  fade: L("Fade", "Esmaecer", "Desvanecer"),
  push: L("Push", "Empurrar", "Empujar"),
  wipe: L("Wipe", "Revelar", "Barrido"),
  split: L("Split", "Dividir", "Divisi\xF3n"),
  cover: L("Cover", "Cobrir", "Cubrir"),
  pull: L("Uncover", "Descobrir", "Descubrir"),
  randomBar: L("Random Bars", "Barras Aleat\xF3rias", "Barras aleatorias"),
  circle: L("Circle", "C\xEDrculo", "C\xEDrculo"),
  diamond: L("Diamond", "Losango", "Rombo"),
  plus: L("Plus", "Mais", "M\xE1s"),
  wedge: L("Wedge", "Cunha", "Cu\xF1a"),
  wheel: L("Wheel", "Roda", "Rueda"),
  zoom: L("Zoom", "Zoom", "Zoom"),
  dissolve: L("Dissolve", "Dissolver", "Disolver"),
  newsflash: L("Newsflash", "Not\xEDcias", "Noticias"),
  blinds: L("Blinds", "Persianas", "Persianas"),
  checker: L("Checkerboard", "Quadriculado", "Cuadros bicolores"),
  strips: L("Strips", "Faixas", "Franjas"),
  comb: L("Comb", "Pente", "Peine"),
  cut: L("Cut", "Cortar", "Cortar")
};
var SHAPE_LABELS = {
  rect: L("Rectangle", "Ret\xE2ngulo", "Rect\xE1ngulo"),
  roundRect: L("Rounded Rectangle", "Ret\xE2ngulo de Cantos Arredondados", "Rect\xE1ngulo: esquinas redondeadas"),
  ellipse: L("Oval", "Elipse", "Elipse"),
  triangle: L("Isosceles Triangle", "Tri\xE2ngulo Is\xF3sceles", "Tri\xE1ngulo is\xF3sceles"),
  rtTriangle: L("Right Triangle", "Tri\xE2ngulo Ret\xE2ngulo", "Tri\xE1ngulo rect\xE1ngulo"),
  diamond: L("Diamond", "Losango", "Rombo"),
  pentagon: L("Regular Pentagon", "Pent\xE1gono Regular", "Pent\xE1gono regular"),
  hexagon: L("Hexagon", "Hex\xE1gono", "Hex\xE1gono"),
  parallelogram: L("Parallelogram", "Paralelogramo", "Paralelogramo"),
  trapezoid: L("Trapezoid", "Trapezoide", "Trapecio"),
  rightArrow: L("Right Arrow", "Seta para a Direita", "Flecha: a la derecha"),
  leftArrow: L("Left Arrow", "Seta para a Esquerda", "Flecha: a la izquierda"),
  upArrow: L("Up Arrow", "Seta para Cima", "Flecha: arriba"),
  downArrow: L("Down Arrow", "Seta para Baixo", "Flecha: abajo"),
  leftRightArrow: L("Left-Right Arrow", "Seta Dupla", "Flecha: izquierda y derecha"),
  chevron: L("Chevron", "Divisa", "Flecha: cheur\xF3n"),
  homePlate: L("Pentagon Arrow", "Seta: Pent\xE1gono", "Flecha: pent\xE1gono"),
  star5: L("5-Point Star", "Estrela de 5 Pontas", "Estrella: 5 puntas"),
  star6: L("6-Point Star", "Estrela de 6 Pontas", "Estrella: 6 puntas"),
  heart: L("Heart", "Cora\xE7\xE3o", "Coraz\xF3n"),
  cloud: L("Cloud", "Nuvem", "Nube"),
  lightningBolt: L("Lightning Bolt", "Raio", "Rayo"),
  wedgeRectCallout: L("Speech Bubble: Rectangle", "Bal\xE3o de Fala: Ret\xE2ngulo", "Bocadillo: rect\xE1ngulo"),
  wedgeEllipseCallout: L("Speech Bubble: Oval", "Bal\xE3o de Fala: Oval", "Bocadillo: ovalado"),
  plus: L("Cross", "Cruz", "Cruz"),
  donut: L("Circle: Hollow", "C\xEDrculo: Vazado", "C\xEDrculo: vac\xEDo"),
  smileyFace: L("Smiley Face", "Rosto Feliz", "Cara sonriente"),
  line: L("Line", "Linha", "L\xEDnea")
};
var ZOOMS = [25, 33, 50, 66, 75, 100, 125, 150, 200, 300];
function registerSlidesCommands(reg, el, ctl) {
  const has = (m) => () => typeof el[m] === "function";
  const deck = () => el.getSlideCount() > 0;
  const shape = () => el.getShapeInfo() !== null;
  const text2 = () => el.getTextFormat() !== null;
  const movable = () => !!el.getShapeInfo()?.movable;
  const notPlaying = () => !el.isPresenting() && !el.isPlaying();
  const fmt3 = (k) => () => !!el.getTextFormat()?.[k];
  const tr = () => el.getSlideTransition();
  const setTr = (patch) => {
    const cur = tr() ?? { type: "none" };
    el.setSlideTransition({ ...cur, ...patch });
  };
  const cmds = [
    // ── Arquivo ──
    { id: "new", label: L("New presentation", "Nova apresenta\xE7\xE3o", "Nueva presentaci\xF3n"), icon: "note_add", supports: has("newPresentation"), run: () => ctl.app.newPresentation() },
    { id: "open", label: L("Open\u2026", "Abrir\u2026", "Abrir\u2026"), icon: "folder_open", shortcut: "Ctrl+O", run: () => ctl.app.open() },
    { id: "save", label: L("Save", "Salvar", "Guardar"), icon: "save", shortcut: "Ctrl+S", isEnabled: deck, run: () => ctl.app.save(false) },
    { id: "saveAs", label: L("Save as\u2026", "Salvar como\u2026", "Guardar como\u2026"), icon: "save_as", shortcut: "Ctrl+Shift+S", isEnabled: deck, run: () => ctl.app.save(true) },
    { id: "export:pdf", label: L("PDF document (.pdf)", "Documento PDF (.pdf)", "Documento PDF (.pdf)"), icon: "picture_as_pdf", isEnabled: deck, run: () => ctl.app.export("pdf") },
    { id: "export:html", label: L("Web page (.html)", "P\xE1gina da Web (.html)", "P\xE1gina web (.html)"), icon: "html", isEnabled: deck, run: () => ctl.app.export("html") },
    { id: "export:md", label: L("Markdown (.md)", "Markdown (.md)", "Markdown (.md)"), icon: "markdown", isEnabled: deck, run: () => ctl.app.export("md") },
    { id: "export:png", label: L("Current slide as image (.png)", "Slide atual como imagem (.png)", "Diapositiva actual como imagen (.png)"), icon: "image", isEnabled: deck, run: () => ctl.app.export("png") },
    { id: "fontsInFile", label: L("Fonts in file\u2026", "Fontes no arquivo\u2026", "Fuentes en el archivo\u2026"), icon: "font_download", supports: has("setFontEmbedding"), isEnabled: deck, run: () => ctl.fontEmbeddingDialog() },
    { id: "print", label: L("Print", "Imprimir", "Imprimir"), icon: "print", shortcut: "Ctrl+P", isEnabled: deck, run: () => ctl.app.print() },
    { id: "properties", label: L("Properties\u2026", "Propriedades\u2026", "Propiedades\u2026"), icon: "info", supports: has("getProperties"), isEnabled: deck, run: () => ctl.propertiesDialog() },
    // ── Editar ──
    { id: "undo", label: L("Undo", "Desfazer", "Deshacer"), icon: "undo", shortcut: "Ctrl+Z", supports: has("undo"), isEnabled: () => el.canUndo(), run: () => el.undo() },
    { id: "redo", label: L("Redo", "Refazer", "Rehacer"), icon: "redo", shortcut: "Ctrl+Y", supports: has("redo"), isEnabled: () => el.canRedo(), run: () => el.redo() },
    { id: "cut", label: L("Cut", "Recortar", "Cortar"), icon: "content_cut", shortcut: "Ctrl+X", isEnabled: shape, run: () => ctl.clipboard("cut") },
    { id: "copy", label: L("Copy", "Copiar", "Copiar"), icon: "content_copy", shortcut: "Ctrl+C", isEnabled: shape, run: () => ctl.clipboard("copy") },
    { id: "paste", label: L("Paste", "Colar", "Pegar"), icon: "content_paste", shortcut: "Ctrl+V", isEnabled: deck, run: () => ctl.clipboard("paste") },
    { id: "delete", label: L("Delete", "Excluir", "Eliminar"), icon: "delete", shortcut: "Del", supports: has("deleteShape"), isEnabled: shape, run: () => el.deleteShape() },
    { id: "find", label: L("Find\u2026", "Localizar\u2026", "Buscar\u2026"), icon: "search", shortcut: "Ctrl+F", supports: has("findText"), isEnabled: deck, run: () => ctl.findDialog(false) },
    { id: "replace", label: L("Replace\u2026", "Substituir\u2026", "Reemplazar\u2026"), icon: "find_replace", shortcut: "Ctrl+H", supports: has("replaceText"), isEnabled: deck, run: () => ctl.findDialog(true) },
    // ── Exibir ──
    { id: "view:normal", label: L("Normal", "Normal", "Normal"), icon: "view_sidebar", isChecked: () => ctl.view() === "normal", run: () => ctl.setView("normal") },
    { id: "view:sorter", label: L("Slide Sorter", "Classifica\xE7\xE3o de Slides", "Clasificador de diapositivas"), icon: "grid_view", isEnabled: deck, isChecked: () => ctl.view() === "sorter", run: () => ctl.setView(ctl.view() === "sorter" ? "normal" : "sorter") },
    { id: "view:reading", label: L("Reading View", "Modo de Exibi\xE7\xE3o de Leitura", "Vista de lectura"), icon: ic("chrome_reader_mode"), isEnabled: deck, isChecked: () => ctl.view() === "reading", run: () => ctl.setView(ctl.view() === "reading" ? "normal" : "reading") },
    { id: "view:thumbnails", label: L("Thumbnails", "Miniaturas", "Miniaturas"), icon: ic("view_carousel"), isChecked: () => ctl.thumbsOpen(), run: () => ctl.toggleThumbs() },
    { id: "view:notes", label: L("Notes", "Anota\xE7\xF5es", "Notas"), icon: ic("speaker_notes"), isChecked: () => ctl.notesOpen(), run: () => ctl.toggleNotes() },
    { id: "statusbar", label: L("Status bar", "Barra de status", "Barra de estado"), icon: "web_asset", isChecked: () => el.hasAttribute("bottombar"), run: () => el.toggleAttribute("bottombar") },
    { id: "zoomin", label: L("Zoom in", "Ampliar", "Acercar"), icon: "zoom_in", shortcut: "Ctrl+=", supports: has("setZoom"), isEnabled: () => deck() && notPlaying(), run: () => el.setZoom(nextZoom(el.getZoom(), 1)) },
    { id: "zoomout", label: L("Zoom out", "Reduzir", "Alejar"), icon: "zoom_out", shortcut: "Ctrl+-", supports: has("setZoom"), isEnabled: () => deck() && notPlaying(), run: () => el.setZoom(nextZoom(el.getZoom(), -1)) },
    { id: "zoomfit", label: L("Fit to window", "Ajustar \xE0 janela", "Ajustar a la ventana"), icon: "fit_screen", supports: has("setZoom"), isChecked: () => el.isZoomFit(), run: () => el.setZoom("fit") },
    { id: "zoom100", label: L("100%", "100%", "100%"), icon: ic("zoom_out_map"), supports: has("setZoom"), run: () => el.setZoom(1) },
    { id: "toolbar:compact", label: L("Compact", "Compacta", "Compacta"), isChecked: () => ctl.toolbarMode() === "compact", run: () => ctl.setToolbarMode("compact") },
    { id: "toolbar:ribbon", label: L("Ribbon", "Faixa de op\xE7\xF5es", "Cinta de opciones"), isChecked: () => ctl.toolbarMode() === "ribbon", run: () => ctl.setToolbarMode("ribbon") },
    // ── Slides ──
    { id: "slide:new", label: L("New slide", "Novo slide", "Nueva diapositiva"), icon: ic("add_to_photos"), shortcut: "Ctrl+M", supports: has("addSlide"), isEnabled: notPlaying, run: () => el.addSlide() },
    { id: "slide:duplicate", label: L("Duplicate slide", "Duplicar slide", "Duplicar diapositiva"), icon: ic("library_add"), supports: has("duplicateSlide"), isEnabled: () => deck() && notPlaying(), run: () => el.duplicateSlide() },
    { id: "slide:delete", label: L("Delete slide", "Excluir slide", "Eliminar diapositiva"), icon: "delete", supports: has("deleteSlide"), isEnabled: () => deck() && notPlaying(), run: () => el.deleteSlide() },
    { id: "slide:hide", label: L("Hide slide", "Ocultar slide", "Ocultar diapositiva"), icon: "visibility_off", supports: has("setSlideHidden"), isEnabled: deck, isChecked: () => el.isSlideHidden(), run: () => el.setSlideHidden(!el.isSlideHidden()) },
    { id: "slide:up", label: L("Move slide up", "Mover slide para cima", "Subir diapositiva"), icon: ic("arrow_upward"), supports: has("moveSlide"), isEnabled: () => el.getSlideIndex() > 0, run: () => el.moveSlide(el.getSlideIndex(), el.getSlideIndex() - 1) },
    { id: "slide:down", label: L("Move slide down", "Mover slide para baixo", "Bajar diapositiva"), icon: ic("arrow_downward"), supports: has("moveSlide"), isEnabled: () => el.getSlideIndex() < el.getSlideCount() - 1, run: () => el.moveSlide(el.getSlideIndex(), el.getSlideIndex() + 1) },
    { id: "slide:resetBackground", label: L("Reset background", "Redefinir plano de fundo", "Restablecer fondo"), icon: "format_color_reset", supports: has("setSlideBackground"), isEnabled: deck, run: () => el.setSlideBackground(null) },
    // ── Inserir ──
    { id: "textbox", label: L("Text box", "Caixa de texto", "Cuadro de texto"), icon: "text_fields", supports: has("insertTextBox"), isEnabled: notPlaying, run: () => {
      el.insertTextBox();
    } },
    { id: "image", label: L("Image\u2026", "Imagem\u2026", "Imagen\u2026"), icon: ic("add_photo_alternate"), supports: has("insertImage"), isEnabled: notPlaying, run: () => ctl.pickImage() },
    { id: "link", label: L("Link\u2026", "Link\u2026", "V\xEDnculo\u2026"), icon: "link", shortcut: "Ctrl+K", supports: has("setLink"), isEnabled: text2, run: () => ctl.linkDialog() },
    // ── Formatar (texto da forma) ──
    { id: "bold", label: L("Bold", "Negrito", "Negrita"), icon: "format_bold", shortcut: "Ctrl+B", supports: has("toggleTextFormat"), isEnabled: text2, isChecked: fmt3("bold"), run: () => el.toggleTextFormat("bold") },
    { id: "italic", label: L("Italic", "It\xE1lico", "Cursiva"), icon: "format_italic", shortcut: "Ctrl+I", supports: has("toggleTextFormat"), isEnabled: text2, isChecked: fmt3("italic"), run: () => el.toggleTextFormat("italic") },
    { id: "underline", label: L("Underline", "Sublinhado", "Subrayado"), icon: "format_underlined", shortcut: "Ctrl+U", supports: has("toggleTextFormat"), isEnabled: text2, isChecked: fmt3("underline"), run: () => el.toggleTextFormat("underline") },
    { id: "strike", label: L("Strikethrough", "Tachado", "Tachado"), icon: "format_strikethrough", supports: has("toggleTextFormat"), isEnabled: text2, isChecked: fmt3("strike"), run: () => el.toggleTextFormat("strike") },
    { id: "grow", label: L("Increase font size", "Aumentar tamanho da fonte", "Aumentar tama\xF1o de fuente"), icon: "text_increase", shortcut: "Ctrl+]", supports: has("growFont"), isEnabled: text2, run: () => el.growFont(1) },
    { id: "shrink", label: L("Decrease font size", "Diminuir tamanho da fonte", "Disminuir tama\xF1o de fuente"), icon: "text_decrease", shortcut: "Ctrl+[", supports: has("growFont"), isEnabled: text2, run: () => el.growFont(-1) },
    { id: "align:left", label: L("Align left", "Alinhar \xE0 esquerda", "Alinear a la izquierda"), icon: "format_align_left", shortcut: "Ctrl+L", supports: has("alignText"), isEnabled: text2, isChecked: () => el.getTextFormat()?.align === "l", run: () => el.alignText("l") },
    { id: "align:center", label: L("Center", "Centralizar", "Centrar"), icon: "format_align_center", shortcut: "Ctrl+E", supports: has("alignText"), isEnabled: text2, isChecked: () => el.getTextFormat()?.align === "ctr", run: () => el.alignText("ctr") },
    { id: "align:right", label: L("Align right", "Alinhar \xE0 direita", "Alinear a la derecha"), icon: "format_align_right", shortcut: "Ctrl+R", supports: has("alignText"), isEnabled: text2, isChecked: () => el.getTextFormat()?.align === "r", run: () => el.alignText("r") },
    { id: "align:justify", label: L("Justify", "Justificar", "Justificar"), icon: "format_align_justify", shortcut: "Ctrl+J", supports: has("alignText"), isEnabled: text2, isChecked: () => el.getTextFormat()?.align === "just", run: () => el.alignText("just") },
    { id: "list:bullet", label: L("Bullets", "Marcadores", "Vi\xF1etas"), icon: "format_list_bulleted", supports: has("setBullets"), isEnabled: text2, isChecked: () => el.getTextFormat()?.bullet === "bullet", run: () => el.setBullets(el.getTextFormat()?.bullet === "bullet" ? "none" : "bullet") },
    { id: "list:number", label: L("Numbering", "Numera\xE7\xE3o", "Numeraci\xF3n"), icon: "format_list_numbered", supports: has("setBullets"), isEnabled: text2, isChecked: () => el.getTextFormat()?.bullet === "number", run: () => el.setBullets(el.getTextFormat()?.bullet === "number" ? "none" : "number") },
    { id: "clear", label: L("Clear formatting", "Limpar formata\xE7\xE3o", "Borrar formato"), icon: "format_clear", shortcut: "Ctrl+Space", supports: has("clearFormatting"), isEnabled: text2, run: () => el.clearFormatting() },
    { id: "shape:noFill", label: L("No fill", "Sem preenchimento", "Sin relleno"), icon: "format_color_reset", supports: has("setShapeFill"), isEnabled: shape, run: () => el.setShapeFill(null) },
    { id: "shape:noOutline", label: L("No outline", "Sem contorno", "Sin contorno"), icon: "border_clear", supports: has("setShapeOutline"), isEnabled: shape, run: () => el.setShapeOutline(null) },
    { id: "arrange:front", label: L("Bring to front", "Trazer para a frente", "Traer al frente"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: movable, run: () => el.arrangeShape("front") },
    { id: "arrange:forward", label: L("Bring forward", "Avan\xE7ar", "Traer adelante"), icon: ic("keyboard_double_arrow_up"), supports: has("arrangeShape"), isEnabled: movable, run: () => el.arrangeShape("forward") },
    { id: "arrange:backward", label: L("Send backward", "Recuar", "Enviar atr\xE1s"), icon: ic("keyboard_double_arrow_down"), supports: has("arrangeShape"), isEnabled: movable, run: () => el.arrangeShape("backward") },
    { id: "arrange:back", label: L("Send to back", "Enviar para tr\xE1s", "Enviar al fondo"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: movable, run: () => el.arrangeShape("back") },
    { id: "shape:size", label: L("Size and position\u2026", "Tamanho e posi\xE7\xE3o\u2026", "Tama\xF1o y posici\xF3n\u2026"), icon: "aspect_ratio", supports: has("setShapeFrame"), isEnabled: movable, run: () => ctl.sizeDialog() },
    // ── Apresentação de Slides ──
    { id: "show:start", label: L("From beginning", "Do come\xE7o", "Desde el principio"), icon: ic("slideshow"), shortcut: "F5", isEnabled: deck, run: () => ctl.present("start") },
    { id: "show:current", label: L("From current slide", "Do slide atual", "Desde la diapositiva actual"), icon: ic("present_to_all"), shortcut: "Shift+F5", isEnabled: deck, run: () => ctl.present(el.getSlideIndex()) },
    { id: "show:auto", label: L("Play automatically (use timings)", "Reproduzir automaticamente (usar intervalos)", "Reproducir autom\xE1ticamente (usar intervalos)"), icon: ic("play_arrow"), isEnabled: deck, isChecked: () => el.isPlaying(), run: () => el.isPlaying() ? el.stopPlayback() : void el.play({ from: el.getSlideIndex() }) },
    { id: "show:setup", label: L("Set up slide show\u2026", "Configurar apresenta\xE7\xE3o\u2026", "Configurar presentaci\xF3n con diapositivas\u2026"), icon: "settings", supports: has("setShowSettings"), isEnabled: deck, run: () => ctl.showSetupDialog() },
    // ── Transições ──
    { id: "transition:preview", label: L("Preview transition", "Visualizar transi\xE7\xE3o", "Vista previa de la transici\xF3n"), icon: ic("preview"), supports: has("previewSlide"), isEnabled: () => deck() && notPlaying(), run: () => el.previewSlide("transition") },
    { id: "transition:applyAll", label: L("Apply to all slides", "Aplicar a todos os slides", "Aplicar a todas las diapositivas"), icon: "done_all", supports: has("setSlideTransition"), isEnabled: deck, run: () => el.setSlideTransition(tr(), "all") },
    { id: "transition:onClick", label: L("On mouse click", "Ao clicar com o mouse", "Al hacer clic con el mouse"), icon: "check", supports: has("setSlideTransition"), isEnabled: deck, isChecked: () => tr()?.advanceOnClick !== false, run: () => setTr({ advanceOnClick: tr()?.advanceOnClick === false }) },
    { id: "transition:after", label: L("After\u2026", "Ap\xF3s\u2026", "Despu\xE9s de\u2026"), icon: ic("timer"), supports: has("setSlideTransition"), isEnabled: deck, isChecked: () => tr()?.advanceAfterMs !== void 0, run: () => ctl.advanceDialog() },
    ...TRANSITION_TYPES.map((t2) => ({
      id: `transition:${t2}`,
      label: TRANSITION_LABELS[t2],
      icon: t2 === "none" ? ic("block") : ic("transition_fade"),
      supports: has("setSlideTransition"),
      isEnabled: deck,
      isChecked: () => (tr()?.type ?? "none") === t2,
      run: () => t2 === "none" ? tr()?.advanceAfterMs !== void 0 || tr()?.advanceOnClick === false ? setTr({ type: "none" }) : el.setSlideTransition(null) : setTr({ type: t2, dir: defaultDir(t2) })
    })),
    // ── Animações (só visualizar: o editor não cria nem edita animações) ──
    { id: "animation:preview", label: L("Preview animations", "Visualizar anima\xE7\xF5es", "Vista previa de las animaciones"), icon: ic("animation"), supports: has("previewSlide"), isEnabled: () => deck() && notPlaying() && hasAnimations(el), run: () => el.previewSlide("animations") },
    { id: "animation:pane", label: L("Animation pane", "Painel de anima\xE7\xE3o", "Panel de animaci\xF3n"), icon: ic("auto_awesome_motion"), isEnabled: deck, isChecked: () => ctl.animationPaneOpen(), run: () => ctl.animationPane() },
    // ── Ajuda ──
    { id: "shortcuts", label: L("Keyboard shortcuts", "Atalhos do teclado", "M\xE9todos abreviados de teclado"), icon: "keyboard", run: () => ctl.shortcutsDialog() },
    { id: "about", label: L("About Universal Slides", "Sobre o Universal Slides", "Acerca de Universal Slides"), icon: "info", run: () => ctl.aboutDialog() }
  ];
  reg.add(...cmds);
}
function nextZoom(z, dir) {
  const pct2 = Math.round(z * 100);
  const steps = ZOOMS;
  const n = dir > 0 ? steps.find((s) => s > pct2 + 0.5) ?? Math.min(400, pct2 + 50) : [...steps].reverse().find((s) => s < pct2 - 0.5) ?? Math.max(10, pct2 - 10);
  return n / 100;
}
function defaultDir(t2) {
  return t2 === "push" || t2 === "cover" ? "u" : t2 === "wipe" || t2 === "pull" ? "l" : t2 === "split" ? "out" : void 0;
}
function hasAnimations(el) {
  return !!el.getSlideAnimations().length;
}

// src/chrome-widgets.ts
function btn(cls, id, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.dataset["a"] = id;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.addEventListener("mousedown", (e) => e.preventDefault());
  ripple(b);
  return b;
}
var t = (ctx, l) => ctx.registry.text(l);
var titleWidget = (env) => ({
  id: "title",
  widget: (ctx) => {
    const input = document.createElement("input");
    input.className = "uo-title";
    input.dataset["a"] = "title";
    input.spellcheck = false;
    input.title = env.app.L.docTitle;
    input.setAttribute("aria-label", input.title);
    input.addEventListener("change", () => {
      env.el.documentName = input.value.trim();
      ctx.after();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
        ctx.after();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        input.value = env.app.title;
        input.blur();
        ctx.after();
      }
    });
    input.addEventListener("focus", () => input.select());
    return {
      el: input,
      sync: () => {
        const v = env.app.title;
        if (env.root.activeElement !== input && input.value !== v) input.value = v;
      }
    };
  }
});
var leadingWidget = () => ({
  id: "logo",
  widget: (ctx) => {
    const box = document.createElement("span");
    box.className = "us-logo";
    box.title = "Universal Slides";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", "Universal Slides");
    box.innerHTML = symbol(ic("slideshow"));
    void ctx;
    return { el: box };
  }
});
var fontWidget = (env, width = 130) => ({
  id: "font:family",
  widget: (ctx) => {
    const b = btn("uo-btn uo-drop uo-combo", "font", t(ctx, L("Font", "Fonte", "Fuente")));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    const text2 = b.querySelector(".uo-drop-text");
    let families = [];
    const refresh = () => {
      void FontResolver.shared().listFamilies().then((f) => {
        families = f;
      }, () => {
      });
    };
    refresh();
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      void FontResolver.shared().requestLocalAccess().then((ok) => {
        if (ok) refresh();
      });
      const cur = env.el.getTextFormat()?.font ?? "";
      const list = cur && !families.includes(cur) ? [cur, ...families] : families;
      toggleMenu(b, () => list.map((f) => ({
        id: `font:${f}`,
        label: f,
        checked: f === cur,
        onClick: () => {
          env.el.formatText({ font: f });
          ctx.after();
        }
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const f = env.el.getTextFormat();
        if (text2) text2.textContent = f?.font ?? "";
        b.disabled = !f;
      }
    };
  }
});
var SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];
var sizeWidget = (env, variant) => ({
  id: "font:size",
  widget: (ctx) => {
    const wrap2 = document.createElement("span");
    wrap2.className = "uo-g-inline";
    wrap2.style.cssText = "display:inline-flex;align-items:center;gap:1px";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.dataset["a"] = "size";
    input.inputMode = "decimal";
    input.maxLength = 5;
    input.title = t(ctx, L("Font size", "Tamanho da fonte", "Tama\xF1o de fuente"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text({ en: ".", pt: ",", es: "," });
    const fmt3 = (n) => String(Math.round(n * 10) / 10).replace(".", dec);
    const apply = () => {
      const v = parseFloat(input.value.replace(",", "."));
      if (!isNaN(v) && v > 0) env.el.formatText({ size: v });
      ctx.after();
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    });
    input.addEventListener("focus", () => input.select());
    if (variant === "steppers") {
      const minus = btn("uo-btn", "shrink", ctx.registry.tooltip("shrink"));
      minus.innerHTML = symbol("remove");
      minus.addEventListener("click", () => {
        void ctx.registry.run("shrink");
      });
      const plus = btn("uo-btn", "grow", ctx.registry.tooltip("grow"));
      plus.innerHTML = symbol("add");
      plus.addEventListener("click", () => {
        void ctx.registry.run("grow");
      });
      wrap2.append(minus, input, plus);
    } else {
      input.style.width = "44px";
      const drop = btn("uo-btn uo-split-arrow", "size:menu", input.title);
      drop.innerHTML = symbol("arrow_drop_down");
      drop.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu(drop, () => SIZES.map((s) => ({
          label: fmt3(s),
          checked: input.value === fmt3(s),
          onClick: () => {
            env.el.formatText({ size: s });
            ctx.after();
          }
        })), ctx);
      });
      wrap2.append(input, drop);
    }
    return {
      el: wrap2,
      sync: () => {
        const f = env.el.getTextFormat();
        if (env.root.activeElement !== input) input.value = f?.size ? fmt3(f.size) : "";
        for (const x2 of wrap2.querySelectorAll("input,button")) x2.disabled = !f;
      }
    };
  }
});
var slideshowWidget = (env) => ({
  id: "slideshow",
  widget: (ctx) => {
    const wrap2 = document.createElement("span");
    wrap2.className = "us-show";
    const main = btn("uo-pill uo-pill-primary us-show-main", "show:current", ctx.registry.tooltip("show:current"));
    main.innerHTML = `${symbol(ic("slideshow"))}<span class="uo-lbl">${t(ctx, L("Slideshow", "Apresentar", "Presentar"))}</span>`;
    main.addEventListener("click", () => {
      void ctx.registry.run("show:current");
    });
    const arrow = btn("uo-pill uo-pill-primary us-show-arrow", "slideshow:menu", t(ctx, L("Slideshow options", "Op\xE7\xF5es de apresenta\xE7\xE3o", "Opciones de presentaci\xF3n")));
    arrow.innerHTML = symbol("arrow_drop_down");
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(wrap2, ["show:start", "show:current", "-", "show:auto", "-", "show:setup", "slide:hide"], ctx);
    });
    wrap2.append(main, arrow);
    return {
      el: wrap2,
      sync: () => {
        const ok = env.el.getSlideCount() > 0;
        main.disabled = !ok;
        arrow.disabled = !ok;
      }
    };
  }
});
var zoomItem = (env) => ({
  menu: () => zoomMenu(env),
  id: "zoom",
  label: L("Zoom", "Zoom", "Zoom"),
  icon: "zoom_in",
  text: () => `${Math.round(env.el.getZoom() * 100)}%`
});
var zoomMenu = (env) => [
  "zoomfit",
  "-",
  ...ZOOMS.map((z) => ({
    id: `zoom:${z}`,
    label: `${z}%`,
    checked: !env.el.isZoomFit() && Math.round(env.el.getZoom() * 100) === z,
    onClick: () => env.el.setZoom(z / 100)
  })),
  "-",
  "zoomin",
  "zoomout"
];
function colorMenu(ctx, current, pick, extra) {
  return [
    ...extra,
    ...extra.length ? ["-"] : [],
    {
      content: (close) => colorGrid({
        colors: OFFICE_COLORS.map((c2) => ({ value: c2, css: `#${c2}` })),
        selected: current()?.replace("#", ""),
        close,
        onPick: (c2) => {
          pick(`#${c2}`);
          ctx.after();
        }
      })
    }
  ];
}
var fontColorMenu = (env, ctx) => colorMenu(ctx, () => env.el.getTextFormat()?.color, (c2) => env.el.formatText({ color: c2 }), []);
var fillMenu = (env, ctx) => colorMenu(ctx, () => void 0, (c2) => env.el.setShapeFill(c2), ["shape:noFill"]);
var outlineMenu = (env, ctx) => colorMenu(ctx, () => void 0, (c2) => env.el.setShapeOutline(c2), ["shape:noOutline"]);
var backgroundMenu = (env, ctx) => [
  ...colorMenu(ctx, () => void 0, (c2) => env.el.setSlideBackground(c2), ["slide:resetBackground"]),
  "-",
  {
    id: "background:all",
    label: L("Apply current background to all", "Aplicar este plano de fundo a todos", "Aplicar este fondo a todas"),
    icon: "done_all",
    onClick: () => {
      const bg = env.el.getSlideBackgroundColor();
      env.el.setSlideBackground(bg, "all");
      ctx.after();
    }
  }
];
var layoutMenu = (env, ctx, kind) => {
  const cur = env.el.getSlideLayout();
  const layouts = env.el.getLayouts();
  const masters = new Set(layouts.map((l) => l.master));
  return layouts.map((l) => ({
    id: `layout:${kind}:${l.path}`,
    label: masters.size > 1 ? `${l.name} (${l.master.split("/").pop().replace(/\.xml$/, "")})` : l.name,
    icon: ic("dashboard"),
    checked: kind === "change" && l.path === cur,
    onClick: () => {
      if (kind === "new") env.el.addSlide(l.path);
      else env.el.setSlideLayout(l.path);
      ctx.after();
    }
  }));
};
function drawPreset(c2, prst, size) {
  const dpr = typeof window !== "undefined" && window.devicePixelRatio || 1;
  c2.width = size * dpr;
  c2.height = size * dpr;
  c2.style.width = c2.style.height = `${size}px`;
  const g = c2.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.strokeStyle = "currentColor";
  g.lineWidth = 1.4;
  const pad = 3, w = size - pad * 2, h = size - pad * 2;
  if (prst === "line") {
    g.beginPath();
    g.moveTo(pad, size - pad);
    g.lineTo(size - pad, pad);
    g.stroke();
    return;
  }
  const geo = evalPreset(prst, w, h);
  g.beginPath();
  for (const sub of geo?.subs ?? []) {
    for (const s of sub) {
      if (s.c === "M") g.moveTo(pad + s.x, pad + s.y);
      else if (s.c === "L") g.lineTo(pad + s.x, pad + s.y);
      else if (s.c === "C") g.bezierCurveTo(pad + s.x1, pad + s.y1, pad + s.x2, pad + s.y2, pad + s.x, pad + s.y);
      else if (s.c === "Q") g.quadraticCurveTo(pad + s.x1, pad + s.y1, pad + s.x, pad + s.y);
      else if (s.c === "E") g.ellipse(pad + s.cx, pad + s.cy, s.rx, s.ry, 0, s.a0, s.a1, !!s.ccw);
      else if (s.c === "Z") g.closePath();
    }
  }
  g.stroke();
}
var shapesMenu = (env, ctx) => [{
  content: (close) => {
    const grid = document.createElement("div");
    grid.className = "us-shapes";
    for (const prst of INSERTABLE_SHAPES) {
      const label = t(ctx, SHAPE_LABELS[prst] ?? L(prst, prst, prst));
      const b = btn("uo-btn us-shape-tile", `shape:${prst}`, label);
      const c2 = document.createElement("canvas");
      drawPreset(c2, prst, 24);
      b.appendChild(c2);
      b.addEventListener("click", () => {
        close();
        env.el.insertShape(prst);
        ctx.after();
      });
      grid.appendChild(b);
    }
    return grid;
  }
}];
var transitionGallery = (env, ctx) => ({
  id: "transition:gallery",
  label: L("Transition to This Slide", "Transi\xE7\xE3o para Este Slide", "Transici\xF3n a esta diapositiva"),
  icon: ic("transition_fade"),
  items: () => TRANSITION_TYPES.map((tp) => ({ id: tp, label: TRANSITION_LABELS[tp] })),
  render: (tile, item) => {
    tile.classList.add("us-tr-tile");
    tile.innerHTML = `${symbol(item.id === "none" ? ic("block") : ic("transition_fade"), "uo-ic us-tr-ic")}<span class="us-tr-lbl"></span>`;
    const lbl = tile.querySelector(".us-tr-lbl");
    if (lbl) lbl.textContent = ctx.registry.text(item.label);
  },
  selected: () => env.el.getSlideTransition()?.type ?? "none",
  onPick: (id) => {
    const cur = env.el.getSlideTransition();
    if (id === "none" && !cur?.advanceAfterMs && cur?.advanceOnClick !== false) env.el.setSlideTransition(null);
    else env.el.setSlideTransition({ ...cur ?? {}, type: id, dir: defaultDir(id) });
  },
  isEnabled: () => env.el.getSlideCount() > 0,
  tile: { w: 74, h: 58 },
  maxCols: 8,
  minCols: 3,
  expandCols: 6
});
var directionMenu = (env, ctx) => {
  const cur = env.el.getSlideTransition();
  const type = cur?.type ?? "none";
  const set = (dir) => {
    env.el.setSlideTransition({ ...cur ?? { type }, dir });
    ctx.after();
  };
  const dirs = type === "split" ? [["out", L("Vertical Out", "Vertical para Fora", "Vertical hacia fuera")], ["in", L("Vertical In", "Vertical para Dentro", "Vertical hacia dentro")]] : [["u", L("From Bottom", "De Baixo", "Desde abajo")], ["l", L("From Right", "Da Direita", "Desde la derecha")], ["d", L("From Top", "De Cima", "Desde arriba")], ["r", L("From Left", "Da Esquerda", "Desde la izquierda")]];
  if (!["push", "wipe", "cover", "pull", "split"].includes(type)) return [{ label: L("No effect options for this transition", "Esta transi\xE7\xE3o n\xE3o tem op\xE7\xF5es de efeito", "Esta transici\xF3n no tiene opciones de efectos"), disabled: true }];
  return dirs.map(([d, label]) => ({ id: `transition:dir:${d}`, label, checked: (cur?.dir ?? defaultDir(type)) === d, onClick: () => set(d) }));
};
var speedMenu = (env, ctx) => {
  const cur = env.el.getSlideTransition();
  return [["fast", L("Fast", "R\xE1pida", "R\xE1pida")], ["med", L("Medium", "M\xE9dia", "Media")], ["slow", L("Slow", "Lenta", "Lenta")]].map(([s, label]) => ({
    id: `transition:speed:${s}`,
    label,
    checked: (cur?.speed ?? "fast") === s,
    disabled: !cur || cur.type === "none",
    onClick: () => {
      if (cur) env.el.setSlideTransition({ ...cur, speed: s });
      ctx.after();
    }
  }));
};
var transitionMenu = (env, ctx) => [
  ...TRANSITION_TYPES.map((tp) => `transition:${tp}`),
  "-",
  { id: "transition:dirMenu", label: L("Effect options", "Op\xE7\xF5es de efeito", "Opciones de efectos"), icon: "tune", submenu: () => directionMenu(env, ctx) },
  { id: "transition:speedMenu", label: L("Speed", "Velocidade", "Velocidad"), icon: ic("timer"), submenu: () => speedMenu(env, ctx) },
  "transition:onClick",
  "transition:after",
  "-",
  "transition:applyAll",
  "transition:preview"
];
var advanceWidget = (env) => ({
  id: "transition:afterField",
  widget: (ctx) => {
    const wrap2 = document.createElement("label");
    wrap2.className = "uo-spin us-after";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.dataset["a"] = "transition:afterCheck";
    const span = document.createElement("span");
    span.textContent = t(ctx, L("After:", "Ap\xF3s:", "Despu\xE9s de:"));
    const box = document.createElement("span");
    box.className = "uo-spin-box";
    const input = document.createElement("input");
    input.className = "uo-spin-in";
    input.inputMode = "decimal";
    input.style.width = "56px";
    input.dataset["a"] = "transition:afterSeconds";
    input.title = t(ctx, L("Advance the slide after this many seconds", "Avan\xE7ar o slide ap\xF3s estes segundos", "Avanzar la diapositiva despu\xE9s de estos segundos"));
    box.appendChild(input);
    const dec = ctx.registry.text({ en: ".", pt: ",", es: "," });
    const apply = (on, secs) => {
      const cur = env.el.getSlideTransition() ?? { type: "none" };
      const next = { ...cur };
      if (on) next.advanceAfterMs = Math.max(0, Math.round(secs * 1e3));
      else delete next.advanceAfterMs;
      env.el.setSlideTransition(next);
      ctx.after();
    };
    chk.addEventListener("change", () => apply(chk.checked, parseFloat(input.value.replace(",", ".")) || 0));
    input.addEventListener("change", () => {
      const v = parseFloat(input.value.replace(",", "."));
      if (!isNaN(v)) apply(true, v);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.dispatchEvent(new Event("change"));
      }
    });
    wrap2.append(chk, span, box);
    return {
      el: wrap2,
      sync: () => {
        const cur = env.el.getSlideTransition();
        const ms = cur?.advanceAfterMs;
        chk.checked = ms !== void 0;
        if (env.root.activeElement !== input) input.value = ms !== void 0 ? String(Math.round(ms / 10) / 100).replace(".", dec) : "";
        const ok = env.el.getSlideCount() > 0;
        chk.disabled = !ok;
        input.disabled = !ok;
      }
    };
  }
});
var themeMenu = (env, ctx) => [
  {
    id: "theme:page",
    label: L("Follow the page", "Seguir a p\xE1gina", "Seguir la p\xE1gina"),
    icon: "web_asset",
    checked: env.ctl.themeMode() === null,
    onClick: () => {
      env.ctl.setThemeMode(null);
      ctx.after();
    }
  },
  "-",
  ...[["auto", "Automatic", "Autom\xE1tico", "Autom\xE1tico", "brightness_auto"], ["light", "Light", "Claro", "Claro", "light_mode"], ["dark", "Dark", "Escuro", "Oscuro", "dark_mode"]].map(([m, en, pt2, es, icon]) => ({
    id: `theme:${m}`,
    label: { en, pt: pt2, es },
    icon,
    checked: env.ctl.themeMode() === m,
    onClick: () => {
      env.ctl.setThemeMode(m);
      ctx.after();
    }
  }))
];

// src/chrome-layout.ts
function menus(env, ctx) {
  const sub = (label, icon, items, id) => ({ id, label, icon, submenu: items });
  return {
    download: sub(L("Download", "Baixar", "Descargar"), "download", () => ["export:pdf", "export:html", "export:md", "export:png"], "download"),
    zoom: sub(L("Zoom", "Zoom", "Zoom"), "zoom_in", () => zoomMenu(env), "zoomMenu"),
    theme: sub(L("Theme", "Tema", "Tema"), "contrast", () => themeMenu(env, ctx), "theme"),
    toolbar: sub(L("Toolbar", "Barra de ferramentas", "Barra de herramientas"), "toolbar", () => ["toolbar:compact", "toolbar:ribbon", "-", "statusbar"], "toolbar"),
    newLayout: sub(L("New slide with layout", "Novo slide com layout", "Nueva diapositiva con dise\xF1o"), ic("add_to_photos"), () => layoutMenu(env, ctx, "new"), "slide:newLayout"),
    layout: sub(L("Layout", "Layout", "Dise\xF1o"), ic("dashboard"), () => layoutMenu(env, ctx, "change"), "layout"),
    background: sub(L("Background", "Plano de fundo", "Fondo"), ic("wallpaper"), () => backgroundMenu(env, ctx), "background"),
    transition: sub(L("Transition", "Transi\xE7\xE3o", "Transici\xF3n"), ic("transition_fade"), () => transitionMenu(env, ctx), "transition"),
    shapes: sub(L("Shapes", "Formas", "Formas"), "shapes", () => shapesMenu(env, ctx), "shapes"),
    text: sub(L("Text", "Texto", "Texto"), "format_bold", () => ["bold", "italic", "underline", "strike", "-", "grow", "shrink"], "text"),
    color: sub(L("Font color", "Cor da fonte", "Color de fuente"), "format_color_text", () => fontColorMenu(env, ctx), "color"),
    align: sub(L("Align", "Alinhar", "Alinear"), "format_align_left", () => ["align:left", "align:center", "align:right", "align:justify"], "align"),
    fill: sub(L("Shape fill", "Preenchimento da forma", "Relleno de forma"), "format_color_fill", () => fillMenu(env, ctx), "fill"),
    outline: sub(L("Shape outline", "Contorno da forma", "Contorno de forma"), "border_color", () => outlineMenu(env, ctx), "outline"),
    arrange: sub(L("Arrange", "Organizar", "Organizar"), "flip_to_front", () => ["arrange:front", "arrange:forward", "arrange:backward", "arrange:back"], "arrange")
  };
}
var fileMenu = (m) => [
  "new",
  "open",
  "-",
  "save",
  "saveAs",
  m.download,
  "fontsInFile",
  "-",
  "print",
  "-",
  "properties"
];
var shapeSelected = (env) => () => env.el.getShapeInfo() !== null;
function compactLayout(env, ctx) {
  const m = menus(env, ctx);
  return {
    leading: leadingWidget(),
    title: titleWidget(env),
    trailing: [slideshowWidget(env)],
    menus: [
      { id: "file", label: L("File", "Arquivo", "Archivo"), items: () => fileMenu(m) },
      { id: "edit", label: L("Edit", "Editar", "Editar"), items: ["undo", "redo", "-", "cut", "copy", "paste", "delete", "-", "find", "replace"] },
      { id: "view", label: L("View", "Exibir", "Vista"), items: () => ["view:normal", "view:sorter", "view:reading", "-", "view:thumbnails", "view:notes", "statusbar", "-", m.zoom, "-", m.theme, m.toolbar] },
      { id: "insert", label: L("Insert", "Inserir", "Insertar"), items: () => ["slide:new", m.newLayout, "slide:duplicate", "-", "textbox", "image", m.shapes, "-", "link"] },
      { id: "format", label: L("Format", "Formatar", "Formato"), items: () => [m.text, m.color, m.align, "list:bullet", "list:number", "clear", "-", m.fill, m.outline, m.arrange, "shape:size"] },
      { id: "slide", label: L("Slide", "Slide", "Diapositiva"), items: () => ["slide:new", "slide:duplicate", "slide:delete", "slide:hide", "-", "slide:up", "slide:down", "-", m.layout, m.background, m.transition] },
      { id: "slideshow", label: L("Slide Show", "Apresenta\xE7\xE3o", "Presentaci\xF3n"), items: ["show:start", "show:current", "show:auto", "-", "show:setup", "slide:hide", "-", "animation:preview", "animation:pane"] },
      { id: "help", label: L("Help", "Ajuda", "Ayuda"), items: ["shortcuts", "about"] }
    ],
    groups: [
      { id: "tools", label: L("Tools", "Ferramentas", "Herramientas"), icon: "undo", prio: 4, items: ["undo", "redo", "print", zoomItem(env)] },
      { id: "slides", label: L("Slides", "Slides", "Diapositivas"), icon: ic("add_to_photos"), prio: 6, items: [
        { split: "slide:new", menu: () => layoutMenu(env, ctx, "new") },
        { menu: () => layoutMenu(env, ctx, "change"), id: "layout:menu", label: L("Layout", "Layout", "Dise\xF1o"), icon: ic("dashboard"), isEnabled: () => env.el.getSlideCount() > 0 }
      ] },
      { id: "insert", label: L("Insert", "Inserir", "Insertar"), icon: "text_fields", prio: 5, items: [
        "textbox",
        "image",
        { menu: () => shapesMenu(env, ctx), id: "shapes:menu", label: L("Shapes", "Formas", "Formas"), icon: "shapes" },
        "link"
      ] },
      { id: "font", label: L("Font", "Fonte", "Fuente"), icon: "font_download", prio: 8, items: [fontWidget(env)] },
      { id: "size", label: L("Font size", "Tamanho da fonte", "Tama\xF1o de fuente"), icon: "format_size", prio: 7, items: [sizeWidget(env, "steppers")] },
      { id: "format", label: L("Formatting", "Formata\xE7\xE3o", "Formato"), icon: "format_bold", prio: 9, items: [
        "bold",
        "italic",
        "underline",
        { menu: () => fontColorMenu(env, ctx), id: "color:menu", label: L("Font color", "Cor da fonte", "Color de fuente"), icon: "format_color_text", isEnabled: () => env.el.getTextFormat() !== null }
      ] },
      { id: "para", label: L("Paragraph", "Par\xE1grafo", "P\xE1rrafo"), icon: "format_align_left", prio: 6, items: [
        "align:left",
        "align:center",
        "align:right",
        "align:justify",
        "list:bullet",
        "list:number",
        "clear"
      ] },
      { id: "shape", label: L("Shape", "Forma", "Forma"), icon: "format_shapes", prio: 3, items: [
        { menu: () => fillMenu(env, ctx), id: "fill:menu", label: L("Shape fill", "Preenchimento da forma", "Relleno de forma"), icon: "format_color_fill", isEnabled: shapeSelected(env) },
        { menu: () => outlineMenu(env, ctx), id: "outline:menu", label: L("Shape outline", "Contorno da forma", "Contorno de forma"), icon: "border_color", isEnabled: shapeSelected(env) },
        { menu: () => ["arrange:front", "arrange:forward", "arrange:backward", "arrange:back"], id: "arrange:menu", label: L("Arrange", "Organizar", "Organizar"), icon: "flip_to_front", isEnabled: shapeSelected(env) }
      ] },
      { id: "motion", label: L("Transitions and animations", "Transi\xE7\xF5es e anima\xE7\xF5es", "Transiciones y animaciones"), icon: ic("transition_fade"), prio: 2, items: [
        { menu: () => transitionMenu(env, ctx), id: "transition:menu", label: L("Transition", "Transi\xE7\xE3o", "Transici\xF3n"), icon: ic("transition_fade"), isEnabled: () => env.el.getSlideCount() > 0 },
        "animation:preview"
      ] },
      { id: "extras", label: L("More tools", "Mais ferramentas", "M\xE1s herramientas"), icon: "more_horiz", prio: 0, items: [
        "strike",
        "grow",
        "shrink",
        "slide:hide",
        "find",
        "view:notes"
      ] }
    ]
  };
}
var large = (cmd) => ({ cmd, size: "large" });
function ribbonLayout(env, ctx) {
  const m = menus(env, ctx);
  const deck = () => env.el.getSlideCount() > 0;
  return {
    qat: ["save", "undo", "redo", "show:start"],
    title: titleWidget(env),
    trailing: [slideshowWidget(env)],
    tabs: [
      { id: "file", label: L("File", "Arquivo", "Archivo"), groups: [], menu: () => fileMenu(m) },
      {
        id: "home",
        label: L("Home", "P\xE1gina Inicial", "Inicio"),
        groups: [
          { id: "clipboard", label: L("Clipboard", "\xC1rea de Transfer\xEAncia", "Portapapeles"), icon: "content_paste", prio: 3, cells: [
            large("paste"),
            { rows: [[{ cmd: "cut", label: true }], [{ cmd: "copy", label: true }], [{ cmd: "delete", label: true }]] }
          ] },
          { id: "slides", label: L("Slides", "Slides", "Diapositivas"), icon: ic("add_to_photos"), prio: 7, cells: [
            { split: "slide:new", size: "large", menu: () => layoutMenu(env, ctx, "new") },
            { rows: [
              [{ menu: () => layoutMenu(env, ctx, "change"), id: "layout:menu", label: L("Layout", "Layout", "Dise\xF1o"), icon: ic("dashboard"), showLabel: true, isEnabled: deck }],
              [{ cmd: "slide:duplicate", label: true }],
              [{ cmd: "slide:hide", label: true }]
            ] }
          ] },
          { id: "font", label: L("Font", "Fonte", "Fuente"), icon: "text_format", prio: 8, cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, "dropdown"), "grow", "shrink", "clear"],
              [
                "bold",
                "italic",
                "underline",
                "strike",
                { menu: () => fontColorMenu(env, ctx), id: "color:menu", label: L("Font color", "Cor da fonte", "Color de fuente"), icon: "format_color_text", isEnabled: () => env.el.getTextFormat() !== null }
              ]
            ] }
          ] },
          { id: "paragraph", label: L("Paragraph", "Par\xE1grafo", "P\xE1rrafo"), icon: "format_align_left", prio: 7, cells: [
            { rows: [["list:bullet", "list:number"], ["align:left", "align:center", "align:right", "align:justify"]] }
          ] },
          { id: "drawing", label: L("Drawing", "Desenho", "Dibujo"), icon: "shapes", prio: 5, cells: [
            { menu: () => shapesMenu(env, ctx), id: "shapes:menu", label: L("Shapes", "Formas", "Formas"), icon: "shapes", size: "large" },
            { menu: () => ["arrange:front", "arrange:forward", "arrange:backward", "arrange:back"], id: "arrange:menu", label: L("Arrange", "Organizar", "Organizar"), icon: "flip_to_front", size: "large", isEnabled: shapeSelected(env) },
            { rows: [
              [{ menu: () => fillMenu(env, ctx), id: "fill:menu", label: L("Shape Fill", "Preenchimento da Forma", "Relleno de forma"), icon: "format_color_fill", showLabel: true, isEnabled: shapeSelected(env) }],
              [{ menu: () => outlineMenu(env, ctx), id: "outline:menu", label: L("Shape Outline", "Contorno da Forma", "Contorno de forma"), icon: "border_color", showLabel: true, isEnabled: shapeSelected(env) }]
            ] }
          ] },
          { id: "editing", label: L("Editing", "Edi\xE7\xE3o", "Edici\xF3n"), icon: "search", prio: 4, cells: [
            { rows: [[{ cmd: "find", label: true }], [{ cmd: "replace", label: true }]] }
          ] }
        ]
      },
      {
        id: "insert",
        label: L("Insert", "Inserir", "Insertar"),
        groups: [
          { id: "slides", label: L("Slides", "Slides", "Diapositivas"), icon: ic("add_to_photos"), prio: 6, cells: [
            { split: "slide:new", size: "large", menu: () => layoutMenu(env, ctx, "new") },
            large("slide:duplicate")
          ] },
          { id: "images", label: L("Images", "Imagens", "Im\xE1genes"), icon: "image", prio: 6, cells: [large("image")] },
          { id: "illustrations", label: L("Illustrations", "Ilustra\xE7\xF5es", "Ilustraciones"), icon: "shapes", prio: 5, cells: [
            { menu: () => shapesMenu(env, ctx), id: "shapes:menu", label: L("Shapes", "Formas", "Formas"), icon: "shapes", size: "large" }
          ] },
          { id: "links", label: L("Links", "Links", "V\xEDnculos"), icon: "link", prio: 4, cells: [large("link")] },
          { id: "text", label: L("Text", "Texto", "Texto"), icon: "text_fields", prio: 5, cells: [large("textbox")] }
        ]
      },
      {
        id: "design",
        label: L("Design", "Design", "Dise\xF1o"),
        groups: [
          { id: "customize", label: L("Customize", "Personalizar", "Personalizar"), icon: ic("wallpaper"), prio: 4, cells: [
            { menu: () => backgroundMenu(env, ctx), id: "background:menu", label: L("Format Background", "Formatar Plano de Fundo", "Formato del fondo"), icon: ic("wallpaper"), size: "large", isEnabled: deck },
            { menu: () => layoutMenu(env, ctx, "change"), id: "layout:menu", label: L("Layout", "Layout", "Dise\xF1o"), icon: ic("dashboard"), size: "large", isEnabled: deck }
          ] }
        ]
      },
      {
        id: "transitions",
        label: L("Transitions", "Transi\xE7\xF5es", "Transiciones"),
        groups: [
          { id: "preview", label: L("Preview", "Visualizar", "Vista previa"), icon: ic("preview"), prio: 5, cells: [large("transition:preview")] },
          { id: "gallery", label: L("Transition to This Slide", "Transi\xE7\xE3o para Este Slide", "Transici\xF3n a esta diapositiva"), icon: ic("transition_fade"), prio: 6, cells: [
            { gallery: transitionGallery(env, ctx) },
            { menu: () => directionMenu(env, ctx), id: "transition:dirMenu", label: L("Effect Options", "Op\xE7\xF5es de Efeito", "Opciones de efectos"), icon: "tune", size: "large", isEnabled: deck }
          ] },
          { id: "timing", label: L("Timing", "Intervalo", "Intervalos"), icon: ic("timer"), prio: 4, cells: [
            { rows: [
              [{ menu: () => speedMenu(env, ctx), id: "transition:speedMenu", label: L("Speed", "Velocidade", "Velocidad"), icon: ic("timer"), showLabel: true, isEnabled: deck }],
              [{ cmd: "transition:applyAll", label: true }]
            ] },
            { rows: [[{ cmd: "transition:onClick", label: true }], [advanceWidget(env)]] }
          ] }
        ]
      },
      {
        // o editor visualiza as animações do arquivo; criar/editar animações não existe (ainda)
        id: "animations",
        label: L("Animations", "Anima\xE7\xF5es", "Animaciones"),
        groups: [
          { id: "preview", label: L("Preview", "Visualizar", "Vista previa"), icon: ic("preview"), prio: 5, cells: [large("animation:preview")] },
          { id: "advanced", label: L("Advanced Animation", "Anima\xE7\xE3o Avan\xE7ada", "Animaci\xF3n avanzada"), icon: ic("auto_awesome_motion"), prio: 4, cells: [large("animation:pane")] }
        ]
      },
      {
        id: "slideshow",
        label: L("Slide Show", "Apresenta\xE7\xE3o de Slides", "Presentaci\xF3n con diapositivas"),
        groups: [
          { id: "start", label: L("Start Slide Show", "Iniciar Apresenta\xE7\xE3o de Slides", "Iniciar presentaci\xF3n con diapositivas"), icon: ic("slideshow"), prio: 6, cells: [
            large("show:start"),
            large("show:current"),
            large("show:auto")
          ] },
          { id: "setup", label: L("Set Up", "Configurar", "Configurar"), icon: "settings", prio: 5, cells: [large("show:setup"), large("slide:hide")] }
        ]
      },
      {
        id: "view",
        label: L("View", "Exibir", "Vista"),
        groups: [
          { id: "views", label: L("Presentation Views", "Modos de Exibi\xE7\xE3o de Apresenta\xE7\xE3o", "Vistas de presentaci\xF3n"), icon: "view_sidebar", prio: 6, cells: [
            large("view:normal"),
            large("view:sorter"),
            large("view:reading")
          ] },
          { id: "show", label: L("Show", "Mostrar", "Mostrar"), icon: "visibility", prio: 4, cells: [
            { rows: [[{ cmd: "view:thumbnails", label: true }], [{ cmd: "view:notes", label: true }], [{ cmd: "statusbar", label: true }]] }
          ] },
          { id: "zoom", label: L("Zoom", "Zoom", "Zoom"), icon: "zoom_in", prio: 5, cells: [
            { menu: () => zoomMenu(env), id: "zoom:menu", label: L("Zoom", "Zoom", "Zoom"), icon: "zoom_in", size: "large" },
            large("zoomfit"),
            { rows: [["zoomin"], ["zoomout"], ["zoom100"]] }
          ] },
          { id: "appearance", label: L("Appearance", "Apar\xEAncia", "Apariencia"), icon: "contrast", prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: "theme:menu", label: L("Theme", "Tema", "Tema"), icon: "contrast", size: "large" },
            { menu: () => ["toolbar:compact", "toolbar:ribbon"], id: "toolbarMode", label: L("Toolbar", "Barra", "Barra"), icon: "toolbar", size: "large" }
          ] }
        ]
      },
      {
        id: "shape-format",
        label: L("Shape Format", "Formato da Forma", "Formato de forma"),
        contextual: shapeSelected(env),
        groups: [
          { id: "styles", label: L("Shape Styles", "Estilos de Forma", "Estilos de forma"), icon: "format_color_fill", prio: 5, cells: [
            { menu: () => fillMenu(env, ctx), id: "fill:menu", label: L("Shape Fill", "Preenchimento da Forma", "Relleno de forma"), icon: "format_color_fill", size: "large" },
            { menu: () => outlineMenu(env, ctx), id: "outline:menu", label: L("Shape Outline", "Contorno da Forma", "Contorno de forma"), icon: "border_color", size: "large" }
          ] },
          { id: "arrange", label: L("Arrange", "Organizar", "Organizar"), icon: "flip_to_front", prio: 4, cells: [
            { rows: [[{ cmd: "arrange:front", label: true }], [{ cmd: "arrange:back", label: true }]] },
            { rows: [[{ cmd: "arrange:forward", label: true }], [{ cmd: "arrange:backward", label: true }]] }
          ] },
          { id: "size", label: L("Size", "Tamanho", "Tama\xF1o"), icon: "aspect_ratio", prio: 4, cells: [large("shape:size"), large("delete")] }
        ]
      }
    ]
  };
}

// src/chrome-panels.ts
function slideContextMenu(env, ctx) {
  return [
    "slide:new",
    "slide:duplicate",
    "slide:delete",
    "slide:hide",
    "-",
    { id: "layout:ctx", label: L("Layout", "Layout", "Dise\xF1o"), icon: ic("dashboard"), submenu: () => layoutMenu(env, ctx, "change") },
    { id: "background:ctx", label: L("Background", "Plano de fundo", "Fondo"), icon: ic("wallpaper"), submenu: () => backgroundMenu(env, ctx) },
    { id: "transition:ctx", label: L("Transition", "Transi\xE7\xE3o", "Transici\xF3n"), icon: ic("transition_fade"), submenu: () => transitionMenu(env, ctx) },
    "-",
    "slide:up",
    "slide:down"
  ];
}
var SlideList = class {
  constructor(env, ctx, mode, labels) {
    this.env = env;
    this.ctx = ctx;
    this.mode = mode;
    this.labels = labels;
    const el = this.el = document.createElement("div");
    el.className = mode === "pane" ? "us-thumbs" : "us-sorter";
    el.setAttribute("part", mode === "pane" ? "thumbnails" : "sorter");
    el.setAttribute("role", "listbox");
    el.setAttribute("aria-label", ctx.registry.text(mode === "pane" ? L("Slides", "Slides", "Diapositivas") : L("Slide Sorter", "Classifica\xE7\xE3o de Slides", "Clasificador de diapositivas")));
    el.tabIndex = 0;
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const i2 = Number(e.target.dataset["i"]);
          if (e.isIntersecting) this.visible.add(i2);
          else this.visible.delete(i2);
        }
        this.schedule();
      }, { root: el, rootMargin: "200px 0px" });
    }
    el.addEventListener("keydown", this.onKey);
    el.addEventListener("contextmenu", (e) => {
      const item = e.target.closest(".us-slide");
      if (!item) return;
      e.preventDefault();
      const i2 = Number(item.dataset["i"]);
      if (i2 !== this.env.el.getSlideIndex()) this.env.el.selectSlide(i2);
      openMenu(slideContextMenu(this.env, this.ctx), { x: e.clientX, y: e.clientY }, { lang: this.ctx.lang, registry: this.ctx.registry, layer: this.ctx.layer, onClose: () => this.ctx.after() });
    });
  }
  env;
  ctx;
  mode;
  labels;
  el;
  items = [];
  visible = /* @__PURE__ */ new Set();
  dirty = /* @__PURE__ */ new Set();
  io = null;
  dragFrom = -1;
  raf = 0;
  /** Remonta os itens quando o número de slides muda; senão só o estado. */
  render() {
    const el = this.env.el;
    const n = el.getSlideCount();
    if (n !== this.items.length) {
      this.io?.disconnect();
      this.visible.clear();
      this.el.replaceChildren();
      this.items = [];
      for (let i2 = 0; i2 < n; i2++) this.items.push(this.makeItem(i2));
      this.el.append(...this.items);
      if (!this.io) for (let i2 = 0; i2 < n; i2++) this.visible.add(i2);
      for (const it of this.items) this.io?.observe(it);
      if (!n) {
        const empty = document.createElement("div");
        empty.className = "us-thumbs-empty";
        empty.textContent = this.labels.noSlides;
        this.el.appendChild(empty);
      }
    }
    this.invalidate();
    this.syncState();
  }
  makeItem(i2) {
    const it = document.createElement("div");
    it.className = "us-slide";
    it.dataset["i"] = String(i2);
    it.setAttribute("role", "option");
    it.draggable = true;
    const num = document.createElement("span");
    num.className = "us-num";
    num.textContent = String(i2 + 1);
    const frame = document.createElement("div");
    frame.className = "us-frame";
    const c2 = document.createElement("canvas");
    frame.appendChild(c2);
    const mark = document.createElement("span");
    mark.className = "us-hidden-mark";
    mark.innerHTML = symbol("visibility_off");
    frame.appendChild(mark);
    it.append(num, frame);
    it.addEventListener("click", () => {
      this.env.el.selectSlide(i2);
      this.el.focus();
      this.ctx.after();
    });
    it.addEventListener("dblclick", () => {
      if (this.mode === "grid") this.env.ctl.setView("normal");
    });
    it.addEventListener("dragstart", (e) => {
      this.dragFrom = i2;
      e.dataTransfer?.setData("text/plain", `slide:${i2}`);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      it.classList.add("us-dragging");
    });
    it.addEventListener("dragend", () => {
      this.dragFrom = -1;
      it.classList.remove("us-dragging");
      this.clearDrop();
    });
    it.addEventListener("dragover", (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.clearDrop();
      const r = it.getBoundingClientRect();
      const after = this.mode === "pane" ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
      it.classList.add(after ? "us-drop-after" : "us-drop-before");
    });
    it.addEventListener("drop", (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      e.stopPropagation();
      const after = it.classList.contains("us-drop-after");
      this.clearDrop();
      let to = i2 + (after ? 1 : 0);
      if (to > this.dragFrom) to--;
      const from = this.dragFrom;
      this.dragFrom = -1;
      if (to !== from) {
        this.env.el.moveSlide(from, to);
        this.ctx.after();
      }
    });
    return it;
  }
  clearDrop() {
    for (const x2 of this.el.querySelectorAll(".us-drop-before, .us-drop-after")) x2.classList.remove("us-drop-before", "us-drop-after");
  }
  /** Estado (atual, oculto, proporção) sem repintar. */
  syncState() {
    const el = this.env.el;
    const cur = el.getSlideIndex();
    const aspect = el.getSlideAspect();
    this.items.forEach((it, i2) => {
      const on = i2 === cur;
      it.classList.toggle("uo-on", on);
      it.setAttribute("aria-selected", String(on));
      it.classList.toggle("us-is-hidden", el.isSlideHidden(i2));
      const frame = it.querySelector(".us-frame");
      if (frame) frame.style.aspectRatio = String(aspect);
    });
  }
  /** O slide atual entra no campo de visão da lista. */
  reveal() {
    const it = this.items[this.env.el.getSlideIndex()];
    if (!it || !this.el.isConnected) return;
    const r = it.getBoundingClientRect(), box = this.el.getBoundingClientRect();
    if (r.top < box.top) this.el.scrollTop -= box.top - r.top + 8;
    else if (r.bottom > box.bottom) this.el.scrollTop += r.bottom - box.bottom + 8;
  }
  /** Marca miniaturas para repintar (todas, ou só `i`). */
  invalidate(i2) {
    if (i2 === void 0) for (let k = 0; k < this.items.length; k++) this.dirty.add(k);
    else this.dirty.add(i2);
    this.schedule();
  }
  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }
  paint() {
    if (!this.el.isConnected || this.el.hidden) return;
    for (const i2 of [...this.dirty]) {
      if (!this.visible.has(i2)) continue;
      const c2 = this.items[i2]?.querySelector("canvas");
      if (c2 && c2.clientWidth > 0) {
        this.env.el.renderThumbnail(i2, c2);
        this.dirty.delete(i2);
      }
    }
  }
  onKey = (e) => {
    const el = this.env.el;
    const n = el.getSlideCount();
    const cur = el.getSlideIndex();
    const cols = this.mode === "grid" ? Math.max(1, Math.round(this.el.clientWidth / 240)) : 1;
    const go = (i2) => {
      e.preventDefault();
      e.stopPropagation();
      el.selectSlide(Math.max(0, Math.min(n - 1, i2)));
      this.reveal();
      this.ctx.after();
    };
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case "ArrowUp":
        go(cur - cols);
        break;
      case "ArrowDown":
        go(cur + cols);
        break;
      case "ArrowLeft":
        if (this.mode === "grid") go(cur - 1);
        break;
      case "ArrowRight":
        if (this.mode === "grid") go(cur + 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(n - 1);
        break;
      case "PageUp":
        go(cur - 5 * cols);
        break;
      case "PageDown":
        go(cur + 5 * cols);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        e.stopPropagation();
        void this.ctx.registry.run("slide:delete");
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (this.mode === "grid") this.env.ctl.setView("normal");
        else void this.ctx.registry.run("slide:new");
        break;
      default:
    }
  };
  destroy() {
    this.io?.disconnect();
    cancelAnimationFrame(this.raf);
    this.el.remove();
  }
};
var NotesPane = class {
  constructor(env, labels) {
    this.env = env;
    this.labels = labels;
    const el = this.el = document.createElement("div");
    el.className = "us-notes";
    el.setAttribute("part", "notes");
    const grip = document.createElement("div");
    grip.className = "us-notes-grip";
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-orientation", "horizontal");
    this.area = document.createElement("textarea");
    this.area.className = "us-notes-text";
    this.area.dataset["a"] = "notes";
    this.area.spellcheck = true;
    this.area.setAttribute("aria-label", labels.notesPlaceholder);
    this.area.addEventListener("input", () => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.commit(), 800);
      this.onPendingChange?.(this.index >= 0 && this.area.value !== this.env.el.getSlideNotes(this.index));
    });
    this.area.addEventListener("blur", () => this.commit());
    el.append(grip, this.area);
    grip.addEventListener("pointerdown", (e) => {
      const host = this.env.el;
      const start = e.clientY, h0 = el.getBoundingClientRect().height;
      const move = (ev) => {
        const h = Math.max(48, Math.min(host.clientHeight * 0.6, h0 - (ev.clientY - start)));
        host.style.setProperty("--us-notes-height", `${Math.round(h)}px`);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      e.preventDefault();
    });
  }
  env;
  labels;
  el;
  area;
  index = -1;
  timer = 0;
  /** Texto digitado e ainda não gravado no documento (o app avisa o host para não fechar sem perguntar). */
  onPendingChange = null;
  /** Grava o que mudou no slide em que o texto foi escrito. */
  commit() {
    window.clearTimeout(this.timer);
    if (this.index < 0 || this.area.readOnly) return;
    if (this.area.value !== this.env.el.getSlideNotes(this.index)) this.env.el.setSlideNotes(this.area.value, this.index);
    this.onPendingChange?.(false);
  }
  sync() {
    const el = this.env.el;
    const i2 = el.getSlideIndex();
    if (i2 !== this.index) {
      this.commit();
      this.index = i2;
      this.area.value = el.getSlideCount() ? el.getSlideNotes(i2) : "";
    } else if (this.env.root.activeElement !== this.area) {
      const v = el.getSlideCount() ? el.getSlideNotes(i2) : "";
      if (this.area.value !== v) this.area.value = v;
    }
    const editable = el.getSlideCount() > 0 && el.canEditNotes(i2);
    this.area.readOnly = !editable;
    this.area.placeholder = editable ? this.labels.notesPlaceholder : "";
  }
  destroy() {
    this.commit();
    this.el.remove();
  }
};
var EFFECT_NAMES = {
  entr: {
    1: L("Appear", "Aparecer", "Aparecer"),
    2: L("Fly In", "Surgir", "Desplazar hacia dentro"),
    3: L("Blinds", "Persianas", "Persianas"),
    4: L("Box", "Caixa", "Cuadro"),
    5: L("Checkerboard", "Quadriculado", "Cuadros bicolores"),
    6: L("Circle", "C\xEDrculo", "C\xEDrculo"),
    8: L("Diamond", "Losango", "Rombo"),
    9: L("Dissolve In", "Dissolver", "Disolver hacia dentro"),
    10: L("Fade", "Esmaecer", "Desvanecer"),
    13: L("Plus", "Sinal de Adi\xE7\xE3o", "Signo m\xE1s"),
    14: L("Random Bars", "Barras Aleat\xF3rias", "Barras aleatorias"),
    16: L("Split", "Dividir", "Divisi\xF3n"),
    18: L("Strips", "Faixas", "Franjas"),
    20: L("Wedge", "Cunha", "Cu\xF1a"),
    21: L("Wheel", "Roda", "Rueda"),
    22: L("Wipe", "Revelar", "Barrido"),
    23: L("Zoom", "Zoom", "Zoom"),
    26: L("Bounce", "Saltar", "Rebote"),
    30: L("Float In", "Flutuar para Dentro", "Flotar hacia dentro"),
    31: L("Grow & Turn", "Aumentar e Girar", "Aumentar y girar"),
    37: L("Rise Up", "Subir", "Elevar"),
    42: L("Ascend", "Ascender", "Ascender"),
    47: L("Descend", "Descender", "Descender"),
    53: L("Fade Zoom", "Zoom Esmaecido", "Zoom con desvanecimiento"),
    55: L("Expand", "Expandir", "Expandir")
  },
  exit: {
    1: L("Disappear", "Desaparecer", "Desaparecer"),
    2: L("Fly Out", "Sair Voando", "Desplazar hacia fuera"),
    9: L("Dissolve Out", "Dissolver", "Disolver hacia fuera"),
    10: L("Fade", "Esmaecer", "Desvanecer"),
    16: L("Split", "Dividir", "Divisi\xF3n"),
    21: L("Wheel", "Roda", "Rueda"),
    22: L("Wipe", "Revelar", "Barrido"),
    23: L("Zoom", "Zoom", "Zoom"),
    26: L("Bounce", "Saltar", "Rebote"),
    30: L("Float Out", "Flutuar para Fora", "Flotar hacia fuera")
  },
  emph: {
    1: L("Fill Color", "Cor de Preenchimento", "Color de relleno"),
    3: L("Font Color", "Cor da Fonte", "Color de fuente"),
    6: L("Grow/Shrink", "Aumentar/Diminuir", "Aumentar/disminuir"),
    7: L("Line Color", "Cor da Linha", "Color de l\xEDnea"),
    8: L("Spin", "Girar", "Girar"),
    9: L("Transparency", "Transpar\xEAncia", "Transparencia"),
    26: L("Pulse", "Pulsar", "Impulso"),
    27: L("Color Pulse", "Pulso Colorido", "Pulso de color"),
    32: L("Teeter", "Balan\xE7ar", "Balancear"),
    35: L("Blink", "Piscar", "Parpadear"),
    36: L("Wave", "Onda", "Onda")
  }
};
var CLASS_NAMES = {
  entr: L("Entrance", "Entrada", "Entrada"),
  exit: L("Exit", "Sa\xEDda", "Salir"),
  emph: L("Emphasis", "\xCAnfase", "\xC9nfasis"),
  path: L("Motion path", "Trajet\xF3ria", "Trayectoria de la animaci\xF3n"),
  verb: L("Action", "A\xE7\xE3o", "Acci\xF3n"),
  mediacall: L("Media", "M\xEDdia", "Multimedia")
};
var AnimationPane = class {
  constructor(env, ctx, frame) {
    this.env = env;
    this.ctx = ctx;
    this.frame = frame;
  }
  env;
  ctx;
  frame;
  pane = null;
  list = null;
  get isOpen() {
    return !!this.pane?.open;
  }
  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
  open() {
    const body = document.createElement("div");
    body.className = "us-anim";
    const play = document.createElement("button");
    play.type = "button";
    play.className = "uo-pill us-anim-play";
    play.dataset["a"] = "animation:play";
    play.innerHTML = `${symbol(ic("play_arrow"))}<span>${this.ctx.registry.text(L("Play", "Reproduzir", "Reproducir"))}</span>`;
    play.addEventListener("click", () => {
      void this.ctx.registry.run("animation:preview");
    });
    const note = document.createElement("p");
    note.className = "us-anim-note";
    note.textContent = this.ctx.registry.text(L(
      "Animations from the file, as they play in the slide show (editing animations is not available).",
      "As anima\xE7\xF5es do arquivo, como tocam na apresenta\xE7\xE3o (a edi\xE7\xE3o de anima\xE7\xF5es n\xE3o est\xE1 dispon\xEDvel).",
      "Animaciones del archivo, tal como se reproducen en la presentaci\xF3n (la edici\xF3n de animaciones no est\xE1 disponible)."
    ));
    this.list = document.createElement("ol");
    this.list.className = "us-anim-list";
    body.append(play, this.list, note);
    this.pane = openPane({
      id: "us-animation",
      title: L("Animation Pane", "Painel de Anima\xE7\xE3o", "Panel de animaci\xF3n"),
      lang: this.ctx.lang,
      layer: this.ctx.layer,
      frame: this.frame,
      dock: "right",
      width: 280,
      body,
      onClose: () => {
        this.pane = null;
        this.ctx.after();
      }
    });
    this.sync();
  }
  close() {
    this.pane?.close();
    this.pane = null;
  }
  place() {
    this.pane?.place();
  }
  sync() {
    if (!this.pane || !this.list) return;
    const anims = this.env.el.getSlideAnimations();
    this.list.replaceChildren();
    if (!anims.length) {
      const li = document.createElement("li");
      li.className = "us-anim-empty";
      li.textContent = this.ctx.registry.text(L("This slide has no animations", "Este slide n\xE3o tem anima\xE7\xF5es", "Esta diapositiva no tiene animaciones"));
      this.list.appendChild(li);
      return;
    }
    for (const a of anims) {
      const li = document.createElement("li");
      li.className = `us-anim-item us-anim-${a.presetClass}`;
      const step = document.createElement("span");
      step.className = "us-anim-step";
      step.textContent = a.trigger === "click" ? String(a.step + 1) : "";
      step.title = this.ctx.registry.text(a.trigger === "click" ? L("On click", "Ao clicar", "Al hacer clic") : a.trigger === "with" ? L("With previous", "Com o anterior", "Con la anterior") : L("After previous", "Ap\xF3s o anterior", "Despu\xE9s de la anterior"));
      const icon = document.createElement("span");
      icon.className = "us-anim-kind";
      icon.innerHTML = symbol(a.trigger === "click" ? ic("ads_click") : a.trigger === "with" ? "link" : ic("timer"));
      const name = document.createElement("span");
      name.className = "us-anim-name";
      const effect = EFFECT_NAMES[a.presetClass]?.[a.presetId] ?? CLASS_NAMES[a.presetClass] ?? L(a.presetClass, a.presetClass, a.presetClass);
      name.textContent = `${this.ctx.registry.text(effect)} \u2014 ${a.shapeName ?? (a.shapeId ? `#${a.shapeId}` : "")}`;
      li.title = `${this.ctx.registry.text(CLASS_NAMES[a.presetClass] ?? L(a.presetClass, a.presetClass, a.presetClass))} \xB7 ${a.durMs < 0 ? "\u221E" : `${(a.durMs / 1e3).toFixed(2)} s`}`;
      li.append(step, icon, name);
      this.list.appendChild(li);
    }
  }
  destroy() {
    this.close();
  }
};
var StatusBar = class {
  constructor(env, container, ctx, labels) {
    this.env = env;
    this.ctx = ctx;
    this.labels = labels;
    const bar = document.createElement("div");
    bar.className = "us-status-bar";
    bar.setAttribute("part", "statusbar");
    this.status = document.createElement("button");
    this.status.type = "button";
    this.status.className = "uo-btn us-status";
    this.status.dataset["a"] = "status";
    this.status.setAttribute("role", "status");
    this.status.addEventListener("mousedown", (e) => e.preventDefault());
    this.status.addEventListener("click", (e) => {
      e.stopPropagation();
      const el = this.env.el;
      toggleMenu(this.status, () => Array.from({ length: el.getSlideCount() }, (_, i2) => ({
        id: `goto:${i2}`,
        label: `${i2 + 1}`,
        checked: i2 === el.getSlideIndex(),
        onClick: () => {
          el.selectSlide(i2);
          ctx.after();
        }
      })), ctx);
    });
    const sp = document.createElement("span");
    sp.className = "uo-spacer";
    bar.append(this.status, sp);
    const add = (id, into) => {
      const r = renderItem(id, ctx);
      into.appendChild(r.el);
      this.items.push(r);
    };
    add("view:notes", bar);
    const views = document.createElement("span");
    views.className = "us-views";
    for (const id of ["view:normal", "view:sorter", "view:reading", "show:current"]) add(id, views);
    bar.appendChild(views);
    add("zoomout", bar);
    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.min = "10";
    this.slider.max = "400";
    this.slider.step = "1";
    this.slider.className = "us-zoom-slider";
    this.slider.dataset["a"] = "zoom:slider";
    this.slider.title = ctx.registry.text(L("Zoom (Ctrl+wheel on the slide)", "Zoom (Ctrl+roda sobre o slide)", "Zoom (Ctrl+rueda sobre la diapositiva)"));
    this.slider.addEventListener("input", () => this.env.el.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener("change", () => ctx.after());
    bar.appendChild(this.slider);
    add("zoomin", bar);
    const pct2 = document.createElement("button");
    pct2.type = "button";
    pct2.className = "uo-btn us-zoom-pct";
    pct2.dataset["a"] = "zoom";
    pct2.title = ctx.registry.text(L("Zoom", "Zoom", "Zoom"));
    pct2.addEventListener("mousedown", (e) => e.preventDefault());
    pct2.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(pct2, () => ["zoomfit", "-", ...ZOOMS.map((z) => ({
        label: `${z}%`,
        checked: !this.env.el.isZoomFit() && Math.round(this.env.el.getZoom() * 100) === z,
        onClick: () => {
          this.env.el.setZoom(z / 100);
          ctx.after();
        }
      }))], ctx);
    });
    this.items.push({ el: pct2, visible: () => true, sync: () => {
      pct2.textContent = `${Math.round(this.env.el.getZoom() * 100)}%`;
    } });
    bar.appendChild(pct2);
    add("zoomfit", bar);
    container.appendChild(bar);
  }
  env;
  ctx;
  labels;
  status;
  slider;
  items = [];
  flashTimer = 0;
  flashing = false;
  flash(msg) {
    window.clearTimeout(this.flashTimer);
    if (!msg) {
      this.flashing = false;
      this.sync();
      return;
    }
    this.flashing = true;
    this.status.textContent = msg;
    this.flashTimer = window.setTimeout(() => {
      this.flashing = false;
      this.sync();
    }, 3200);
  }
  sync() {
    const el = this.env.el;
    if (!this.flashing) {
      const n = el.getSlideCount();
      const i2 = el.getSlideIndex();
      this.status.textContent = n ? this.labels.slideOf(i2 + 1, n) + (el.isSlideHidden(i2) ? ` \xB7 ${this.labels.hidden}` : "") : this.labels.noSlides;
    }
    this.status.disabled = !el.getSlideCount();
    for (const r of this.items) r.sync();
    if (this.env.root.activeElement !== this.slider) this.slider.value = String(Math.round(el.getZoom() * 100));
  }
};

// src/chrome-dialogs.ts
var tx = (lang, l) => l[lang];
function field(label, input) {
  const box = document.createElement("label");
  box.className = "uo-field";
  const s = document.createElement("span");
  s.textContent = label;
  box.append(s, input);
  return box;
}
function textInput(value, name) {
  const i2 = document.createElement("input");
  i2.type = "text";
  i2.name = name;
  i2.value = value;
  i2.spellcheck = false;
  return i2;
}
function check(label, checked, name) {
  const el = document.createElement("label");
  el.className = "uo-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.checked = checked;
  const s = document.createElement("span");
  s.textContent = label;
  el.append(input, s);
  return { el, input };
}
var FindDialog = class {
  constructor(env) {
    this.env = env;
  }
  env;
  handle = null;
  query;
  repl;
  replRow;
  matchCase;
  msg;
  hits = [];
  pos = -1;
  /** Substituir só aparece no modo Substituir (Ctrl+H); Localizar (Ctrl+F) mostra só Localizar Próxima. */
  syncReplace() {
    for (const b of this.handle?.el.querySelectorAll(".uo-dialog-actions .uo-pill") ?? []) {
      const id = b.dataset["action"];
      if (id === "replace" || id === "replaceAll") b.hidden = this.replRow.hidden;
    }
  }
  open(replace) {
    if (this.handle) {
      this.replRow.hidden = !replace;
      this.syncReplace();
      this.query.focus();
      this.query.select();
      return;
    }
    const { lang } = this.env;
    const T = (l) => tx(lang, l);
    const body = document.createElement("div");
    body.className = "us-find";
    this.query = textInput("", "find");
    this.repl = textInput("", "replace");
    this.replRow = field(T(L("Replace with", "Substituir por", "Reemplazar con")), this.repl);
    this.replRow.hidden = !replace;
    const mc = check(T(L("Match case", "Diferenciar mai\xFAsculas de min\xFAsculas", "Coincidir may\xFAsculas y min\xFAsculas")), false, "matchCase");
    this.matchCase = mc.input;
    this.msg = document.createElement("div");
    this.msg.className = "us-find-msg";
    this.msg.setAttribute("role", "status");
    body.append(field(T(L("Find what", "Localizar", "Buscar")), this.query), this.replRow, mc.el, this.msg);
    const reset = () => {
      this.hits = [];
      this.pos = -1;
      this.msg.textContent = "";
    };
    this.query.addEventListener("input", reset);
    this.matchCase.addEventListener("change", reset);
    this.handle = openDialog({
      title: L("Find and Replace", "Localizar e Substituir", "Buscar y reemplazar"),
      body,
      layer: this.env.layer,
      lang,
      modal: false,
      width: 380,
      icon: "find_replace",
      actions: [
        { id: "replaceAll", label: L("Replace All", "Substituir Tudo", "Reemplazar todos") },
        { id: "replace", label: L("Replace", "Substituir", "Reemplazar") },
        { id: "next", label: L("Find Next", "Localizar Pr\xF3xima", "Buscar siguiente"), primary: true }
      ],
      onAction: (id) => {
        if (id === "next") this.next();
        else if (id === "replace") this.replaceOne();
        else if (id === "replaceAll") this.replaceAll();
        return false;
      }
    });
    this.syncReplace();
    void this.handle.result.then(() => {
      this.handle = null;
    });
  }
  search() {
    this.hits = this.env.el.findText(this.query.value, { matchCase: this.matchCase.checked });
  }
  next() {
    const L0 = pickLabels(this.env.lang, LABELS4);
    if (!this.hits.length) this.search();
    if (!this.hits.length) {
      this.msg.textContent = L0.notFound;
      return;
    }
    this.pos = (this.pos + 1) % this.hits.length;
    const h = this.hits[this.pos];
    this.env.el.selectSlide(h.slide);
    this.env.el.selectShape(h.shape);
    this.msg.textContent = L0.found(this.pos + 1, this.hits.length);
    this.env.after();
  }
  replaceOne() {
    const L0 = pickLabels(this.env.lang, LABELS4);
    if (this.pos < 0 || !this.hits[this.pos]) {
      this.next();
      return;
    }
    const n = this.env.el.replaceText(this.query.value, this.repl.value, { matchCase: this.matchCase.checked, hit: this.hits[this.pos] });
    this.msg.textContent = L0.replaced(n);
    this.hits = [];
    this.pos = -1;
    this.env.after();
  }
  replaceAll() {
    const L0 = pickLabels(this.env.lang, LABELS4);
    const n = this.env.el.replaceText(this.query.value, this.repl.value, { matchCase: this.matchCase.checked });
    this.msg.textContent = n ? L0.replaced(n) : L0.notFound;
    this.hits = [];
    this.pos = -1;
    this.env.after();
  }
  close() {
    this.handle?.close(null);
    this.handle = null;
  }
};
async function propertiesDialog(env) {
  const { el, lang } = env;
  const T = (l) => tx(lang, l);
  const p = el.getProperties();
  const body = document.createElement("div");
  body.className = "uo-dialog-grid us-props";
  const inputs = {
    title: textInput(p.title ?? "", "title"),
    subject: textInput(p.subject ?? "", "subject"),
    author: textInput(p.author ?? "", "author"),
    keywords: textInput(p.keywords ?? "", "keywords"),
    description: textInput(p.description ?? "", "description")
  };
  const rows = [
    [T(L("Title", "T\xEDtulo", "T\xEDtulo")), inputs.title],
    [T(L("Subject", "Assunto", "Asunto")), inputs.subject],
    [T(L("Author", "Autor", "Autor")), inputs.author],
    [T(L("Keywords", "Palavras-chave", "Palabras clave")), inputs.keywords],
    [T(L("Comments", "Coment\xE1rios", "Comentarios")), inputs.description]
  ];
  const size = el.getSlideSize();
  const cm = (emu) => (emu / 36e4).toLocaleString(uiLocale(lang), { maximumFractionDigits: 2 });
  const fmtDate = (s) => {
    if (!s) return "\u2014";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString(uiLocale(lang));
  };
  const info = [
    [T(L("Slides", "Slides", "Diapositivas")), String(el.getSlideCount())],
    [T(L("Slide size", "Tamanho do slide", "Tama\xF1o de diapositiva")), `${cm(size.width)} \xD7 ${cm(size.height)} cm`],
    [T(L("Created", "Criado", "Creado")), fmtDate(p.created)],
    [T(L("Modified", "Modificado", "Modificado")), fmtDate(p.modified)],
    [T(L("Last modified by", "Modificado por", "Modificado por")), p.lastModifiedBy ?? "\u2014"]
  ];
  for (const [label, input] of rows) {
    const l = document.createElement("label");
    l.textContent = label;
    body.append(l, input);
  }
  for (const [label, value] of info) {
    const l = document.createElement("span");
    l.textContent = label;
    l.className = "us-props-k";
    const v = document.createElement("span");
    v.textContent = value;
    v.className = "us-props-v";
    body.append(l, v);
  }
  const h = openDialog({
    title: L("Properties", "Propriedades", "Propiedades"),
    body,
    layer: env.layer,
    lang,
    width: 460,
    icon: "info",
    actions: [{ id: "cancel", label: L("Cancel", "Cancelar", "Cancelar") }, { id: "ok", label: L("OK", "OK", "Aceptar"), primary: true }]
  });
  if (await h.result !== "ok") return;
  el.setProperties({
    title: inputs.title.value.trim(),
    subject: inputs.subject.value.trim(),
    author: inputs.author.value.trim(),
    keywords: inputs.keywords.value.trim(),
    description: inputs.description.value.trim()
  });
  if (!el.documentName && inputs.title.value.trim()) el.documentName = inputs.title.value.trim();
  env.after();
}
async function showSetupDialog(env) {
  const { el, lang } = env;
  const T = (l) => tx(lang, l);
  const s = el.getShowSettings();
  const body = document.createElement("div");
  body.className = "us-setup";
  const kiosk = check(T(L("Browsed at a kiosk (full screen, loops, advances only by timings)", "Apresentada em um quiosque (tela inteira, repete, avan\xE7a s\xF3 pelos intervalos)", "Examinada en exposici\xF3n (pantalla completa, se repite, avanza solo por intervalos)")), s.kiosk, "kiosk");
  const loop = check(T(L("Loop continuously until Esc", "Repetir at\xE9 ESC ser pressionada", "Repetir el ciclo hasta presionar Esc")), s.loop, "loop");
  const anim = check(T(L("Show with animation", "Apresentar com anima\xE7\xE3o", "Mostrar con animaci\xF3n")), s.showAnimation, "showAnimation");
  const timings = check(T(L("Use timings, if present", "Usar intervalos, se houver", "Usar intervalos, si existen")), s.useTimings, "useTimings");
  const syncKiosk = () => {
    loop.input.disabled = kiosk.input.checked;
    if (kiosk.input.checked) loop.input.checked = true;
  };
  kiosk.input.addEventListener("change", syncKiosk);
  syncKiosk();
  body.append(kiosk.el, loop.el, anim.el, timings.el);
  const h = openDialog({
    title: L("Set Up Slide Show", "Configurar Apresenta\xE7\xE3o", "Configurar presentaci\xF3n"),
    body,
    layer: env.layer,
    lang,
    width: 440,
    icon: "settings",
    actions: [{ id: "cancel", label: L("Cancel", "Cancelar", "Cancelar") }, { id: "ok", label: L("OK", "OK", "Aceptar"), primary: true }]
  });
  if (await h.result !== "ok") return;
  el.setShowSettings({ kiosk: kiosk.input.checked, loop: loop.input.checked, showAnimation: anim.input.checked, useTimings: timings.input.checked });
  env.after();
}
async function sizeDialog(env) {
  const { el, lang } = env;
  const info = el.getShapeInfo();
  if (!info?.frame) return;
  const T = (l) => tx(lang, l);
  const unit = lang !== "en" ? 36e4 : 914400;
  const suffix = lang !== "en" ? "cm" : "in";
  const fmt3 = (emu) => String(Math.round(emu / unit * 100) / 100).replace(".", uiDecimal(lang));
  const parse = (s) => {
    const v = parseFloat(s.replace(",", "."));
    return Number.isFinite(v) ? Math.round(v * unit) : null;
  };
  const f = info.frame;
  const body = document.createElement("div");
  body.className = "uo-dialog-grid";
  const make = (label, emu, name) => {
    const l = document.createElement("label");
    l.textContent = `${label} (${suffix})`;
    const i2 = textInput(fmt3(emu), name);
    i2.inputMode = "decimal";
    body.append(l, i2);
    return i2;
  };
  const w = make(T(L("Width", "Largura", "Ancho")), f.cx, "width");
  const hh = make(T(L("Height", "Altura", "Alto")), f.cy, "height");
  const x2 = make(T(L("Horizontal position", "Posi\xE7\xE3o horizontal", "Posici\xF3n horizontal")), f.x, "x");
  const y = make(T(L("Vertical position", "Posi\xE7\xE3o vertical", "Posici\xF3n vertical")), f.y, "y");
  const lock = check(T(L("Lock aspect ratio", "Bloquear taxa de propor\xE7\xE3o", "Bloquear relaci\xF3n de aspecto")), info.kind === "picture", "lock");
  body.append(document.createElement("span"), lock.el);
  const ratio = f.cy > 0 ? f.cx / f.cy : 1;
  w.addEventListener("change", () => {
    const v = parse(w.value);
    if (lock.input.checked && v !== null) hh.value = fmt3(v / ratio);
  });
  hh.addEventListener("change", () => {
    const v = parse(hh.value);
    if (lock.input.checked && v !== null) w.value = fmt3(v * ratio);
  });
  const h = openDialog({
    title: L("Size and Position", "Tamanho e Posi\xE7\xE3o", "Tama\xF1o y posici\xF3n"),
    body,
    layer: env.layer,
    lang,
    width: 380,
    icon: "aspect_ratio",
    actions: [{ id: "cancel", label: L("Cancel", "Cancelar", "Cancelar") }, { id: "ok", label: L("OK", "OK", "Aceptar"), primary: true }]
  });
  if (await h.result !== "ok") return;
  const nf = { x: parse(x2.value) ?? f.x, y: parse(y.value) ?? f.y, cx: Math.max(12700, parse(w.value) ?? f.cx), cy: Math.max(0, parse(hh.value) ?? f.cy) };
  el.setShapeFrame(nf, info.index);
  env.after();
}
async function linkDialog(env) {
  const { el, lang } = env;
  const L0 = pickLabels(lang, LABELS4);
  if (!el.getTextFormat()) return;
  const url = await promptDialog({ title: L0.linkTitle, label: L0.linkPrompt, value: el.getLink() ?? "https://", layer: env.layer, lang });
  if (url === null) return;
  const v = url.trim();
  el.setLink(v && v !== "https://" ? v : null);
  env.after();
}
async function advanceDialog(env) {
  const { el, lang } = env;
  const cur = el.getSlideTransition();
  const ms = cur?.advanceAfterMs;
  const v = await promptDialog({
    title: L("Advance slide", "Avan\xE7ar slide", "Avanzar diapositiva"),
    label: L("After (seconds); empty = only on click", "Ap\xF3s (segundos); vazio = s\xF3 ao clicar", "Despu\xE9s de (segundos); vac\xEDo = solo al hacer clic"),
    value: ms !== void 0 ? String(ms / 1e3).replace(".", uiDecimal(lang)) : "",
    layer: env.layer,
    lang
  });
  if (v === null) return;
  const secs = parseFloat(v.replace(",", "."));
  const next = { ...cur ?? { type: "none" } };
  if (Number.isFinite(secs) && secs >= 0) next.advanceAfterMs = Math.round(secs * 1e3);
  else delete next.advanceAfterMs;
  el.setSlideTransition(next);
  env.after();
}
var SHORTCUTS = [
  ["F5", L("Start the slide show from the beginning", "Apresentar do come\xE7o", "Iniciar la presentaci\xF3n desde el principio")],
  ["Shift+F5", L("Start the slide show from the current slide", "Apresentar do slide atual", "Iniciar la presentaci\xF3n desde la diapositiva actual")],
  ["Esc", L("End the slide show / deselect", "Encerrar a apresenta\xE7\xE3o / tirar a sele\xE7\xE3o", "Finalizar la presentaci\xF3n / anular la selecci\xF3n")],
  ["Ctrl+M", L("New slide", "Novo slide", "Nueva diapositiva")],
  ["Ctrl+D", L("Duplicate the selected shape or the slide", "Duplicar a forma selecionada ou o slide", "Duplicar la forma seleccionada o la diapositiva")],
  ["Ctrl+Z / Ctrl+Y", L("Undo / redo", "Desfazer / refazer", "Deshacer / rehacer")],
  ["Ctrl+X / C / V", L("Cut / copy / paste the shape", "Recortar / copiar / colar a forma", "Cortar / copiar / pegar la forma")],
  ["Del", L("Delete the selected shape (or slide, in the thumbnails)", "Excluir a forma selecionada (ou o slide, nas miniaturas)", "Eliminar la forma seleccionada (o la diapositiva, en las miniaturas)")],
  ["F2 / Enter", L("Edit the text of the selected shape", "Editar o texto da forma selecionada", "Editar el texto de la forma seleccionada")],
  ["Tab", L("Select the next shape", "Selecionar a pr\xF3xima forma", "Seleccionar la forma siguiente")],
  ["\u2190\u2191\u2192\u2193", L("Nudge the shape (Ctrl: finer) / change slide", "Mover a forma (Ctrl: fino) / trocar de slide", "Desplazar la forma (Ctrl: m\xE1s fino) / cambiar de diapositiva")],
  ["Ctrl+B / I / U", L("Bold / italic / underline", "Negrito / it\xE1lico / sublinhado", "Negrita / cursiva / subrayado")],
  ["Ctrl+] / Ctrl+[", L("Increase / decrease font size", "Aumentar / diminuir a fonte", "Aumentar / disminuir el tama\xF1o de fuente")],
  ["Ctrl+L / E / R / J", L("Align left / center / right / justify", "Alinhar \xE0 esquerda / centro / direita / justificar", "Alinear a la izquierda / centro / derecha / justificar")],
  ["Ctrl+K", L("Link", "Link", "V\xEDnculo")],
  ["Ctrl+F / Ctrl+H", L("Find / replace", "Localizar / substituir", "Buscar / reemplazar")],
  ["Ctrl+O / S / Shift+S / P", L("Open / save / save as / print", "Abrir / salvar / salvar como / imprimir", "Abrir / guardar / guardar como / imprimir")],
  ["Ctrl+= / Ctrl+- / Ctrl+wheel", L("Zoom in / out", "Ampliar / reduzir", "Acercar / alejar")]
];
function shortcutsDialog(env) {
  const body = document.createElement("div");
  body.className = "us-keys";
  for (const [k, l] of SHORTCUTS) {
    const kbd = document.createElement("kbd");
    kbd.textContent = k;
    const d = document.createElement("span");
    d.textContent = l[env.lang];
    body.append(kbd, d);
  }
  openDialog({ title: L("Keyboard shortcuts", "Atalhos do teclado", "M\xE9todos abreviados de teclado"), body, layer: env.layer, lang: env.lang, width: 520, icon: "keyboard" });
}
function aboutDialog(env) {
  const body = document.createElement("div");
  body.className = "us-about";
  const p1 = document.createElement("p");
  p1.textContent = tx(env.lang, L(
    "Universal Slides \u2014 the <universal-slides> web component: a .pptx editor faithful to PowerPoint, part of Universal Office (MIT).",
    "Universal Slides \u2014 o web component <universal-slides>: um editor de .pptx fiel ao PowerPoint, parte do Universal Office (MIT).",
    "Universal Slides \u2014 el componente web <universal-slides>: un editor de .pptx fiel a PowerPoint, parte de Universal Office (MIT)."
  ));
  const p2 = document.createElement("p");
  p2.textContent = tx(env.lang, L(
    "Text is edited per shape; formatting applies to the whole text of the shape. Animations play as recorded in the file.",
    "O texto \xE9 editado por forma; a formata\xE7\xE3o vale para o texto inteiro da forma. As anima\xE7\xF5es tocam como est\xE3o gravadas no arquivo.",
    "El texto se edita por forma; el formato se aplica a todo el texto de la forma. Las animaciones se reproducen tal como est\xE1n grabadas en el archivo."
  ));
  body.append(p1, p2);
  openDialog({ title: L("About Universal Slides", "Sobre o Universal Slides", "Acerca de Universal Slides"), body, layer: env.layer, lang: env.lang, width: 440, icon: "info" });
}

// src/bar-kit.ts
var barKit = { createBarButton, createBarIcon, hasBarIcon, createBarRow, barCss, barStyleSheet, adoptBarStyles };

// src/chrome.ts
var PALETTE = (
  /* css */
  `:host {
  --u-color-primary: light-dark(#a8401e, #ffb59c);
  --u-color-on-primary: light-dark(#ffffff, #5c1900);
  --u-color-surface: light-dark(#fcfbfb, #141313);
  --u-color-surface-container-lowest: light-dark(#ffffff, #0e0e0e);
  --u-color-surface-container-low: light-dark(#f6f5f5, #1c1b1b);
  --u-color-surface-container: light-dark(#efeded, #201f1f);
  --u-color-surface-container-high: light-dark(#e9e7e7, #2b2a2a);
  --u-color-surface-container-highest: light-dark(#e3e1e1, #363434);
  --u-color-on-surface: light-dark(#1c1b1b, #e6e1e1);
  --u-color-on-surface-variant: light-dark(#4b4646, #cdc5c4);
  --u-color-outline: light-dark(#7c7575, #968f8e);
  --u-color-outline-variant: light-dark(#cdc5c4, #4b4646);
  --u-color-secondary-container: light-dark(#ffdbd0, #5d4037);
  --u-color-on-secondary-container: light-dark(#3a0b00, #ffdbd0);
  --u-color-tertiary: light-dark(#715b2e, #e0c38c);
  --u-color-error: light-dark(#ba1a1a, #ffb4ab);
  --u-color-error-container: light-dark(#ffdad6, #93000a);
  --u-color-on-error-container: light-dark(#410002, #ffdad6);
  --u-color-inverse-surface: light-dark(#313030, #e6e1e1);
  --u-color-inverse-on-surface: light-dark(#f4f0ef, #313030);
  --u-color-warning-container: light-dark(#ffdea8, #5c4200);
  --u-color-on-warning-container: light-dark(#271900, #ffdea8);
}`
);
var CHROME_CSS = (
  /* css */
  `
:host { display: block; min-height: 320px; --uo-font: var(--us-font, "Segoe UI", system-ui, -apple-system, sans-serif);
  --us-bg: var(--us-background, var(--u-color-surface-container-low, light-dark(#f6f5f5, #1c1b1b))); }
/* UMA cor de fundo (como o Google Slides/Docs): barras, miniaturas, mesa e status
   s\xE3o --us-background; o slide e o que flutua (menus, di\xE1logos) t\xEAm outra cor */
.us-shell {
  display: flex; flex-direction: column; width: 100%; height: 100%; min-height: inherit; box-sizing: border-box;
  background: var(--us-bg); color: var(--u-color-on-surface, light-dark(#1c1b1b, #e6e1e1)); font-family: var(--uo-font);
}
.us-top, .us-bottom { flex: none; background: var(--uo-bar-bg, var(--us-bg)); }
.us-top > .uo-bar, .us-bottom > .uo-bar { background: transparent; }
.us-top .uo-toolbar, .us-top .uo-ribbon-body {
  background: var(--uo-bar-container, light-dark(var(--u-color-surface-container, #efeded), var(--u-color-surface-container-high, #2b2a2a)));
}
.us-top:empty, .us-bottom:empty { display: none; }
.us-body { flex: 1 1 auto; min-height: 0; display: flex; }
.us-center { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.us-stage { flex: 1 1 auto; min-height: 0; position: relative; }
.us-wrap { background: var(--us-desk, var(--us-bg)); }
.us-wrap canvas:focus-visible { outline: 2px solid var(--u-color-primary, #a8401e); outline-offset: -2px; }
.us-badge { display: none !important; }

/* miniaturas (modo Normal) e classifica\xE7\xE3o de slides */
.us-thumbs {
  flex: none; width: var(--us-thumbnails-width, 200px); overflow-y: auto; overflow-x: hidden; box-sizing: border-box;
  padding: 6px 10px 12px 2px; outline: none; scrollbar-width: thin;
}
.us-sorter {
  flex: 1 1 auto; min-height: 0; overflow: auto; outline: none; box-sizing: border-box; padding: 18px 22px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--us-sorter-size, 210px), 1fr)); gap: 18px 16px; align-content: start;
}
.us-sorter[hidden], .us-thumbs[hidden] { display: none; }
.us-slide { display: flex; gap: 4px; align-items: flex-start; padding: 4px 2px; margin-bottom: 4px; border-radius: 10px; cursor: pointer; user-select: none; }
.us-sorter .us-slide { flex-direction: column-reverse; gap: 4px; margin: 0; padding: 4px; }
.us-num { flex: none; width: 22px; text-align: right; padding-top: 1px; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); font-variant-numeric: tabular-nums; }
.us-sorter .us-num { width: auto; text-align: left; padding: 0 2px; }
.us-frame {
  position: relative; flex: 1 1 auto; min-width: 0; border-radius: 6px; overflow: hidden; background: #fff;
  outline: 1px solid var(--u-color-outline-variant, #cdc5c4); outline-offset: 0; aspect-ratio: 16 / 9;
}
.us-sorter .us-frame { width: 100%; }
.us-slide:hover .us-frame { outline-color: var(--u-color-outline, #7c7575); }
.us-slide.uo-on .us-frame { outline: 3px solid var(--u-color-primary, #a8401e); }
.us-slide.uo-on .us-num { color: var(--u-color-primary, #a8401e); font-weight: 600; }
.us-thumbs:focus-visible .us-slide.uo-on .us-frame, .us-sorter:focus-visible .us-slide.uo-on .us-frame { outline-offset: 2px; }
.us-frame canvas { display: block; width: 100%; height: 100%; }
.us-hidden-mark { display: none; position: absolute; inset: 0; place-items: center; background: color-mix(in srgb, var(--us-bg) 55%, transparent); color: var(--u-color-on-surface-variant, #4b4646); }
.us-hidden-mark .uo-ic { width: 28px; height: 28px; }
.us-is-hidden .us-hidden-mark { display: grid; }
.us-is-hidden .us-num { text-decoration: line-through; }
.us-dragging { opacity: .45; }
.us-thumbs .us-drop-before { box-shadow: inset 0 3px 0 var(--u-color-primary, #a8401e); }
.us-thumbs .us-drop-after { box-shadow: inset 0 -3px 0 var(--u-color-primary, #a8401e); }
.us-sorter .us-drop-before { box-shadow: inset 3px 0 0 var(--u-color-primary, #a8401e); }
.us-sorter .us-drop-after { box-shadow: inset -3px 0 0 var(--u-color-primary, #a8401e); }
.us-thumbs-empty { padding: 12px; font-size: 13px; color: var(--u-color-on-surface-variant, #4b4646); }

/* anota\xE7\xF5es do orador */
.us-notes { flex: none; height: var(--us-notes-height, 112px); display: flex; flex-direction: column; border-top: 1px solid var(--u-color-outline-variant, #cdc5c4); }
.us-notes[hidden] { display: none; }
.us-notes-grip { flex: none; height: 6px; margin-top: -3px; cursor: ns-resize; }
.us-notes-text {
  flex: 1 1 auto; resize: none; border: 0; outline: none; background: transparent; color: inherit; box-sizing: border-box;
  font: 14px/1.5 var(--uo-font); padding: 4px 18px 10px;
}
.us-notes-text::placeholder { color: var(--u-color-on-surface-variant, #4b4646); opacity: .8; }

/* modos de exibi\xE7\xE3o */
.us-shell.us-view-sorter .us-stage, .us-shell.us-view-sorter .us-notes, .us-shell.us-view-sorter .us-thumbs { display: none; }
.us-shell.us-reading .us-top, .us-shell.us-reading .us-thumbs, .us-shell.us-reading .us-notes { display: none; }
/* painel lateral (Painel de Anima\xE7\xE3o): o palco encolhe em vez de ficar por baixo */
.us-shell.us-has-pane .us-center { padding-right: 280px; }

/* barra de status */
.us-status-bar { display: flex; align-items: center; gap: 2px; padding: 2px 10px; min-height: 30px; font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-status { font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12.5px !important; color: inherit !important; padding: 0 8px !important; }
.us-views { display: inline-flex; gap: 1px; margin: 0 6px; }
.us-status-bar .uo-btn { height: 26px; min-width: 26px; }
.us-status-bar .uo-ic { width: 18px; height: 18px; }
.us-zoom-slider { width: 110px; accent-color: var(--u-color-primary, #a8401e); }
.us-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 640px) { .us-zoom-slider, .us-views { display: none; } }

/* logo, Apresenta\xE7\xE3o de Slides, formas, transi\xE7\xF5es */
.us-logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--u-color-primary, #a8401e); color: var(--u-color-on-primary, #fff); }
.us-logo .uo-ic { width: 24px; height: 24px; }
.us-show { display: inline-flex; align-items: stretch; flex: none; }
.us-show-main { border-radius: 19px 0 0 19px; padding: 0 14px 0 12px; }
.us-show-arrow { border-radius: 0 19px 19px 0; padding: 0 6px; margin-left: 1px; }
.us-shapes { display: grid; grid-template-columns: repeat(7, 34px); gap: 2px; padding: 2px; }
.us-shape-tile { width: 34px; height: 34px; padding: 0; color: var(--u-color-on-surface, #1c1b1b); }
.us-shape-tile canvas { display: block; }
.uo-gal-tile.us-tr-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; }
.us-tr-ic { width: 26px !important; height: 26px !important; color: var(--u-color-primary, #a8401e); }
.us-tr-lbl { display: block; max-width: 100%; padding: 0 3px; font-size: 11px; line-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.us-after { gap: 6px; }
.us-after .uo-spin-box { margin-left: 0; }
.us-after input[type=checkbox] { margin: 0; accent-color: var(--u-color-primary, #a8401e); }

/* camada flutuante (menus, popovers, di\xE1logos, pain\xE9is, avisos) */
.us-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* arrastar e soltar */
.us-drop {
  position: fixed; inset: 12px; z-index: 1200; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #a8401e); border-radius: 14px;
  background: color-mix(in srgb, var(--u-color-primary, #a8401e) 12%, transparent);
  color: var(--u-color-primary, #a8401e); font-family: var(--uo-font); font-size: 22px;
}
.us-drop[hidden] { display: none; }

/* di\xE1logos e pain\xE9is */
.us-find { display: flex; flex-direction: column; gap: 10px; }
.us-find-msg { min-height: 18px; font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-setup { display: flex; flex-direction: column; gap: 10px; }
.us-props .us-props-k { font-size: 12.5px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-props .us-props-v { font-size: 13px; }
.us-keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; align-items: center; font-size: 13px; }
.us-keys kbd { font: 12px/1.6 ui-monospace, Consolas, monospace; padding: 1px 6px; border-radius: 6px; border: 1px solid var(--u-color-outline-variant, #cdc5c4); white-space: nowrap; justify-self: start; }
.us-about p { margin: 0; }
.us-anim { display: flex; flex-direction: column; gap: 10px; }
.us-anim-play { align-self: flex-start; height: 32px; padding: 0 14px 0 10px; }
.us-anim-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.us-anim-item { display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 6px; border-radius: 6px; font-size: 13px; }
.us-anim-item:hover { background: var(--u-color-surface-container-highest, #e3e1e1); }
.us-anim-step { width: 16px; text-align: right; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); }
.us-anim-kind .uo-ic { width: 16px; height: 16px; }
.us-anim-entr .us-anim-kind { color: #2e7d32; }
.us-anim-exit .us-anim-kind { color: #c62828; }
.us-anim-emph .us-anim-kind { color: #f9a825; }
.us-anim-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.us-anim-empty { padding: 6px; color: var(--u-color-on-surface-variant, #4b4646); font-size: 13px; }
.us-anim-note { margin: 4px 2px 0; font-size: 12px; color: var(--u-color-on-surface-variant, #4b4646); line-height: 1.4; }
`
);
var NATIVE_KEYS = /* @__PURE__ */ new Set(["Ctrl+C", "Ctrl+X", "Ctrl+V", "Del"]);
var APP_SHORTCUTS = /* @__PURE__ */ new Set(["open", "save", "saveAs", "print", "find", "replace", "show:start", "show:current"]);
var lastFocused = null;
var shapeClipboard = null;
function isField(t2) {
  if (!(t2 instanceof HTMLElement)) return false;
  return t2.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t2.tagName);
}
function comboOf(e) {
  const code = e.code;
  let k = code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : { Equal: "=", Minus: "-", BracketLeft: "[", BracketRight: "]", Slash: "/", Space: "Space", Enter: "Enter", Delete: "Del", NumpadAdd: "=", NumpadSubtract: "-" }[code] ?? e.key;
  if (/^F\d+$/.test(e.key)) k = e.key;
  return `${e.ctrlKey || e.metaKey ? "Ctrl+" : ""}${e.altKey ? "Alt+" : ""}${e.shiftKey ? "Shift+" : ""}${k}`;
}
function pageDefinesTokens(host) {
  const parent = host.parentElement ?? host.getRootNode().host ?? null;
  if (!parent || typeof getComputedStyle !== "function") return false;
  return getComputedStyle(parent).getPropertyValue("--u-color-surface").trim() !== "";
}
var SlidesChrome = class {
  constructor(el, opts) {
    this.el = el;
    const parts = el.chromeParts();
    this.root = parts.root;
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS4);
    ensureBarStyles(this.root);
    this.chromeStyle = document.createElement("style");
    this.chromeStyle.dataset["usChrome"] = "";
    this.chromeStyle.textContent = CHROME_CSS;
    this.root.appendChild(this.chromeStyle);
    if (!pageDefinesTokens(el)) {
      this.paletteStyle = document.createElement("style");
      this.paletteStyle.dataset["usPalette"] = "";
      this.paletteStyle.textContent = PALETTE;
      this.root.prepend(this.paletteStyle);
    }
    this.shell = document.createElement("div");
    this.shell.className = "us-shell";
    this.topEl = document.createElement("div");
    this.topEl.className = "us-top";
    this.topEl.setAttribute("part", "topbar");
    this.bottomEl = document.createElement("div");
    this.bottomEl.className = "us-bottom";
    this.bottomEl.setAttribute("part", "bottombar");
    const body = document.createElement("div");
    body.className = "us-body";
    this.center = document.createElement("div");
    this.center.className = "us-center";
    const stage = document.createElement("div");
    stage.className = "us-stage";
    parts.wrap.classList.add("us-wrap");
    stage.appendChild(parts.wrap);
    this.center.appendChild(stage);
    body.appendChild(this.center);
    this.shell.append(this.topEl, body, this.bottomEl);
    this.root.appendChild(this.shell);
    this.layer = this.makeLayer();
    const app = this.app = appFor(el);
    app.ui = { layer: this.layer, flash: (m) => this.flash(m), sync: () => this.sync(), flush: () => this.notes?.commit() };
    app.attach();
    app.bindHost();
    const host = el.appHost;
    if (host?.listFonts && host.resolveFonts && !FontResolver.shared().hasHost) {
      FontResolver.shared().configure({ host: { list: host.listFonts.bind(host), resolve: host.resolveFonts.bind(host) } });
    }
    const mode = app.prefs.get("mode");
    if (mode === "auto" || mode === "light" || mode === "dark") el.setUiColorMode(mode);
    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    const ctl = this.ctl();
    registerSlidesCommands(this.reg, el, ctl);
    const contributions = opts.contributions ?? [];
    for (const c2 of contributions) if (c2.commands?.length) this.reg.add(...c2.commands);
    const hidden = new Set(el.hiddenCommands);
    this.reg.hide(hidden);
    const env = { el, app, ctl, root: this.root };
    if (opts.topbar) {
      this.bar = this.mode() === "ribbon" ? createRibbon(this.topEl, hideInRibbon(extendRibbon(ribbonLayout(env, this.ctx), contributions), hidden), this.ctx) : createCompactBar(this.topEl, hideInCompact(extendCompact(compactLayout(env, this.ctx), contributions), hidden), this.ctx);
      this.thumbs = new SlideList(env, this.ctx, "pane", this.L);
      body.insertBefore(this.thumbs.el, this.center);
      this.sorter = new SlideList(env, this.ctx, "grid", this.L);
      this.sorter.el.hidden = true;
      this.center.appendChild(this.sorter.el);
      this.notes = new NotesPane(env, this.L);
      this.notes.onPendingChange = (pending) => app.setPending(pending);
      this.center.appendChild(this.notes.el);
      this.anim = new AnimationPane(env, this.ctx, () => this.center.getBoundingClientRect());
      if (app.prefs.get("thumbs") === "0" || hidden.has("view:thumbnails")) this.thumbs.el.hidden = true;
      if (app.prefs.get("notes") === "0" || hidden.has("view:notes")) this.notes.el.hidden = true;
      this.thumbs.render();
      this.sorter.render();
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) this.status = new StatusBar(env, this.bottomEl, this.ctx, this.L);
    el.setChromeMounted(true);
    this.bindEvents();
    this.sync();
  }
  el;
  ac = new AbortController();
  root;
  app;
  reg;
  ctx;
  layer;
  L;
  lang;
  shell;
  topEl;
  bottomEl;
  center;
  bar = null;
  status = null;
  thumbs = null;
  sorter = null;
  notes = null;
  anim = null;
  find = null;
  viewMode = "normal";
  raf = 0;
  chromeStyle;
  paletteStyle = null;
  makeLayer() {
    const l = document.createElement("div");
    l.className = "us-layer";
    for (const t2 of ["mousedown", "pointerdown", "click", "dblclick", "contextmenu", "keydown", "keyup", "wheel", "copy", "cut", "paste"]) {
      l.addEventListener(t2, (e) => e.stopPropagation(), { passive: t2 === "wheel" });
    }
    this.root.appendChild(l);
    return l;
  }
  mode() {
    const a = this.el.getAttribute("toolbar");
    if (a === "ribbon" || a === "compact") return a;
    return this.app.prefs.get("toolbar") === "ribbon" ? "ribbon" : "compact";
  }
  dialogEnv() {
    return { el: this.el, layer: this.layer, lang: this.lang, after: () => this.after() };
  }
  ctl() {
    const el = this.el;
    return {
      app: this.app,
      flash: (m) => this.flash(m),
      view: () => this.viewMode,
      setView: (v) => this.setView(v),
      thumbsOpen: () => !!this.thumbs && !this.thumbs.el.hidden,
      toggleThumbs: () => {
        if (!this.thumbs) return;
        this.thumbs.el.hidden = !this.thumbs.el.hidden;
        this.app.prefs.set("thumbs", this.thumbs.el.hidden ? "0" : "1");
        if (!this.thumbs.el.hidden) this.thumbs.invalidate();
      },
      notesOpen: () => !!this.notes && !this.notes.el.hidden,
      toggleNotes: () => {
        if (!this.notes) return;
        this.notes.el.hidden = !this.notes.el.hidden;
        this.app.prefs.set("notes", this.notes.el.hidden ? "0" : "1");
      },
      toolbarMode: () => this.mode(),
      setToolbarMode: (m) => {
        this.app.prefs.set("toolbar", m);
        el.setAttribute("toolbar", m);
      },
      themeMode: () => {
        const a = el.getAttribute("theme");
        return a === "auto" || a === "light" || a === "dark" ? a : this.app.prefs.get("mode") || null;
      },
      setThemeMode: (m) => {
        this.app.prefs.set("mode", m ?? "");
        if (m === null) el.removeAttribute("theme");
        else if (el.hasAttribute("theme")) el.setAttribute("theme", m);
        el.setUiColorMode(m);
      },
      findDialog: (replace) => {
        (this.find ??= new FindDialog(this.dialogEnv())).open(replace);
      },
      propertiesDialog: () => {
        void propertiesDialog(this.dialogEnv());
      },
      showSetupDialog: () => {
        void showSetupDialog(this.dialogEnv());
      },
      sizeDialog: () => {
        void sizeDialog(this.dialogEnv());
      },
      linkDialog: () => {
        void linkDialog(this.dialogEnv());
      },
      shortcutsDialog: () => shortcutsDialog(this.dialogEnv()),
      aboutDialog: () => aboutDialog(this.dialogEnv()),
      advanceDialog: () => {
        void advanceDialog(this.dialogEnv());
      },
      fontEmbeddingDialog: () => {
        void openFontEmbeddingDialog({ app: "slides", settings: el.getFontEmbedding(), lang: el }).then((s) => {
          if (s) {
            el.setFontEmbedding(s);
            this.after();
          }
        });
      },
      pickImage: () => this.pickImage(),
      clipboard: (kind) => {
        void this.clipboard(kind);
      },
      present: (from) => this.present(from),
      animationPane: () => {
        this.anim?.toggle();
        this.after();
      },
      animationPaneOpen: () => !!this.anim?.isOpen
    };
  }
  // ───── modos de exibição ─────
  setView(v) {
    if (v === this.viewMode) return;
    const prev = this.viewMode;
    this.viewMode = v;
    this.shell.classList.toggle("us-view-sorter", v === "sorter");
    this.shell.classList.toggle("us-reading", v === "reading");
    if (this.sorter) this.sorter.el.hidden = v !== "sorter";
    if (v === "sorter") {
      this.el.selectShape(null);
      this.sorter?.invalidate();
      requestAnimationFrame(() => {
        this.sorter?.reveal();
        this.sorter?.el.focus();
      });
    }
    if (prev === "reading" && this.el.isPresenting()) this.el.stopPresentation();
    if (v === "reading") {
      if (!this.el.getSlideCount()) {
        this.viewMode = prev;
        this.shell.classList.remove("us-reading");
        return;
      }
      requestAnimationFrame(() => {
        if (this.viewMode === "reading") this.el.present(this.el.getSlideIndex(), { fullscreen: false });
      });
    }
    if (v === "normal") requestAnimationFrame(() => this.thumbs?.reveal());
    this.sync();
  }
  present(from) {
    if (!this.el.getSlideCount()) {
      this.flash(this.L.nothingToPresent);
      return;
    }
    if (this.viewMode !== "normal") this.setView("normal");
    this.el.selectShape(null);
    this.el.present(from);
  }
  // ───── imagem e área de transferência ─────
  pickImage() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml" });
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) return;
      await this.el.insertImage(new Uint8Array(await f.arrayBuffer()), f.type || "image/png");
      this.after();
    });
    input.click();
  }
  async clipboard(kind) {
    const el = this.el;
    if (kind === "paste") {
      if (shapeClipboard) {
        el.pasteShape(shapeClipboard);
        this.after();
        return;
      }
      try {
        const text2 = await navigator.clipboard?.readText?.();
        if (text2) {
          el.insertTextBox(text2);
          this.after();
        }
      } catch {
      }
      return;
    }
    const clip = el.copyShape();
    if (!clip) return;
    shapeClipboard = clip;
    try {
      await navigator.clipboard?.writeText?.(clip.text);
    } catch {
    }
    if (kind === "cut") el.deleteShape();
    this.after();
  }
  // ───── sincronia ─────
  /** Depois de qualquer ação: o foco volta ao slide (se não abriu painel) e sincroniza. */
  after() {
    if (this.ac.signal.aborted) return;
    const a = this.root.activeElement;
    const keep2 = !!a && (this.layer.contains(a) || this.topEl.contains(a) && a.tagName === "INPUT" || a.classList.contains("us-notes-text") || (this.thumbs?.el.contains(a) ?? false) || (this.sorter?.el.contains(a) ?? false));
    if (!isMenuOpen()) closePopover();
    if (!keep2 && !isMenuOpen() && this.viewMode === "normal" && this.el.getEditingShape() === null) this.el.chromeParts().canvas.focus();
    this.sync();
  }
  sync() {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.syncNow();
    });
  }
  syncNow() {
    this.app.bindHost();
    this.topEl.classList.toggle("uo-wco", !!this.el.appHost?.windowControlsOverlay);
    this.bar?.sync();
    this.status?.sync();
    this.thumbs?.syncState();
    this.sorter?.syncState();
    this.notes?.sync();
    this.shell.classList.toggle("us-has-pane", !!this.anim?.isOpen && this.viewMode !== "reading");
    this.anim?.sync();
    this.anim?.place();
  }
  flash(msg) {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }
  /** Faixa de aviso na barra atual (sem `topbar` não há onde mostrar). */
  setNotice(el, tone) {
    this.bar?.setNotice(el, tone);
  }
  destroy() {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    closeDialogs(this.layer);
    closePanes(this.layer);
    this.find?.close();
    this.notes?.destroy();
    this.anim?.destroy();
    this.thumbs?.destroy();
    this.sorter?.destroy();
    this.bar?.destroy();
    if (this.el.isPresenting() && this.viewMode === "reading") this.el.stopPresentation();
    const { wrap: wrap2 } = this.el.chromeParts();
    wrap2.classList.remove("us-wrap");
    this.root.appendChild(wrap2);
    this.shell.remove();
    this.layer.remove();
    this.chromeStyle.remove();
    this.paletteStyle?.remove();
    this.el.setUiColorMode(null);
    this.el.setChromeMounted(false);
    if (this.app.ui?.layer === this.layer) {
      this.app.ui = null;
      this.app.detach();
    }
  }
  // ───── eventos ─────
  bindEvents() {
    const { el } = this;
    const signal = this.ac.signal;
    const resync = () => this.sync();
    el.addEventListener("us-loaded", () => {
      this.thumbs?.render();
      this.sorter?.render();
      if (this.viewMode !== "normal") this.setView("normal");
      this.sync();
    }, { signal });
    el.addEventListener("us-change", ((e) => {
      const deckWide = ["newSlide", "duplicateSlide", "deleteSlide", "moveSlide", "undo", "redo", "replace", "transition", "background", "properties", "showSettings"].includes(e.detail.kind);
      if (deckWide) {
        this.thumbs?.render();
        this.sorter?.render();
      } else {
        this.thumbs?.invalidate(el.getSlideIndex());
        this.sorter?.invalidate(el.getSlideIndex());
      }
      this.sync();
    }), { signal });
    el.addEventListener("us-slide", () => {
      this.sync();
      requestAnimationFrame(() => {
        this.thumbs?.reveal();
        this.sorter?.reveal();
      });
    }, { signal });
    el.addEventListener("us-image", () => {
      this.thumbs?.invalidate();
      this.sorter?.invalidate();
    }, { signal });
    for (const t2 of ["us-selection", "us-zoom", "us-dirty", "us-title-change", "us-step", "us-playback-end"]) el.addEventListener(t2, resync, { signal });
    el.addEventListener("us-present-end", () => {
      if (this.viewMode === "reading") this.setView("normal");
      this.sync();
    }, { signal });
    el.addEventListener("us-theme-change", () => {
      this.el.appHost?.setTitleTheme?.(this.el.effectiveTheme === "dark");
      this.thumbs?.invalidate();
      this.sync();
    }, { signal });
    this.el.appHost?.setTitleTheme?.(this.el.effectiveTheme === "dark");
    const off = FontResolver.shared().onChange(() => {
      this.thumbs?.invalidate();
      this.sorter?.invalidate();
    });
    signal.addEventListener("abort", off);
    const ro = new ResizeObserver(() => {
      this.anim?.place();
      this.thumbs?.invalidate();
    });
    ro.observe(this.center);
    signal.addEventListener("abort", () => ro.disconnect());
  }
  /** Atalhos, área de transferência e arrastar e soltar (só com a barra superior). */
  bindDocumentFeatures() {
    const { el } = this;
    const signal = this.ac.signal;
    const byShortcut = /* @__PURE__ */ new Map();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id).shortcut;
      if (sc && !NATIVE_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    const run = (e, id) => {
      e.preventDefault();
      e.stopPropagation();
      void this.reg.run(id);
    };
    el.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || el.isPresenting() || el.isPlaying()) return;
      const combo = comboOf(e);
      const field2 = isField(e.composedPath()[0]);
      if (combo === "Ctrl+D" && !field2) {
        e.preventDefault();
        if (el.getShapeInfo()) el.duplicateShape();
        else void this.reg.run("slide:duplicate");
        this.after();
        return;
      }
      if (combo === "Escape" && this.viewMode === "sorter") {
        e.preventDefault();
        this.setView("normal");
        return;
      }
      const id = byShortcut.get(combo);
      if (!id || !this.reg.supported(id)) return;
      if (field2 && !APP_SHORTCUTS.has(id)) return;
      run(e, id);
    }, { signal });
    el.addEventListener("focusin", () => {
      lastFocused = new WeakRef(el);
    }, { signal });
    document.addEventListener("keydown", (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.some((n) => n instanceof HTMLElement && n.localName === "universal-slides")) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === el : document.querySelectorAll("universal-slides[topbar]").length === 1;
      if (mine) run(e, id);
    }, { signal });
    const inField = (e) => isField(e.composedPath()[0]);
    el.addEventListener("copy", (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const clip = el.copyShape();
      if (!clip) return;
      shapeClipboard = clip;
      e.clipboardData?.setData("text/plain", clip.text);
      e.preventDefault();
    }, { signal });
    el.addEventListener("cut", (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const clip = el.copyShape();
      if (!clip) return;
      shapeClipboard = clip;
      e.clipboardData?.setData("text/plain", clip.text);
      e.preventDefault();
      el.deleteShape();
      this.after();
    }, { signal });
    el.addEventListener("paste", (e) => {
      if (inField(e) || el.getEditingShape() !== null) return;
      const data = e.clipboardData;
      const text2 = data?.getData("text/plain") ?? "";
      const img = Array.from(data?.files ?? []).find((f) => /^image\//.test(f.type));
      e.preventDefault();
      if (img) {
        void img.arrayBuffer().then((b) => el.insertImage(new Uint8Array(b), img.type)).then(() => this.after());
        return;
      }
      if (shapeClipboard && text2 === shapeClipboard.text) {
        el.pasteShape(shapeClipboard);
        this.after();
        return;
      }
      if (text2.trim()) {
        el.insertTextBox(text2.replace(/\r\n?/g, "\n"));
        this.after();
      }
    }, { signal });
    el.addEventListener("contextmenu", (e) => {
      const path = e.composedPath();
      if (path.some((n) => n === this.topEl || n === this.bottomEl || n === this.layer || n === this.thumbs?.el || n === this.sorter?.el || n === this.notes?.el)) return;
      if (path[0] !== el.chromeParts().canvas || el.isPresenting() || el.isPlaying()) return;
      e.preventDefault();
      const shape = el.getShapeInfo();
      const items = shape ? ["cut", "copy", "paste", "delete", "-", "link", "-", "arrange:front", "arrange:back", "shape:size"] : ["paste", "-", "slide:new", "slide:duplicate", "slide:delete", "slide:hide", "-", "textbox", "image"];
      openMenu(items, { x: e.clientX, y: e.clientY }, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
    }, { signal });
    const overlay = document.createElement("div");
    overlay.className = "us-drop";
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e) => !!e.dataTransfer?.types?.includes("Files");
    const onlyImages = (e) => {
      const items = Array.from(e.dataTransfer?.items ?? []);
      return items.length > 0 && items.every((it) => it.kind === "file" && it.type.startsWith("image/"));
    };
    el.addEventListener("dragenter", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      overlay.hidden = onlyImages(e);
    }, { signal });
    el.addEventListener("dragleave", (e) => {
      if (!hasFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        overlay.hidden = true;
      }
    }, { signal });
    el.addEventListener("dragover", (e) => {
      if (hasFiles(e)) e.preventDefault();
    }, { signal });
    el.addEventListener("drop", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      const ev = new CustomEvent("us-file-drop", { detail: { files }, cancelable: true });
      if (!el.dispatchEvent(ev)) return;
      void (async () => {
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (images.length === files.length) {
          for (const f of images) await el.insertImage(new Uint8Array(await f.arrayBuffer()), f.type);
          this.after();
          return;
        }
        await this.app.openFile(files[0]);
        this.sync();
      })();
    }, { signal });
  }
};
var chromes = /* @__PURE__ */ new WeakMap();
function setupChrome(el, opts) {
  chromes.get(el)?.destroy();
  const c2 = new SlidesChrome(el, opts);
  chromes.set(el, c2);
  return { sync: () => c2.sync(), setNotice: (n, tone) => c2.setNotice(n, tone) };
}
function teardownChrome(el) {
  chromes.get(el)?.destroy();
  chromes.delete(el);
}
export {
  CHROME_CSS,
  barKit,
  setupChrome,
  teardownChrome
};
