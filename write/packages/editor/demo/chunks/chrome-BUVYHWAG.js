import {
  ACCENTS,
  appFor,
  applyTheme,
  bindHostFonts,
  hostOf,
  originStore
} from "./chunk-F4TFST2S.js";
import {
  barKit
} from "./chunk-ML3BYBSQ.js";
import {
  ASPECT_RATIOS,
  BEVEL_PRESETS,
  BRIGHT_CONTRAST_STEPS,
  CROP_SHAPES,
  GLOW_SIZES,
  GRADIENT_DIRECTIONS,
  GRADIENT_PRESETS,
  GRADIENT_VARIANTS,
  HYPHENATION_LIMITS,
  LIGATURE_OPTIONS,
  LINE_DASHES,
  LINE_NUMBER_LIMITS,
  LINE_WEIGHTS_PT,
  NUMBER_STYLES_OT,
  OUTLINE_DASHES,
  OUTLINE_WEIGHTS,
  PARAGRAPH_LAYOUT_LIMITS,
  POSITION_PRESETS,
  PRESET_PATTERNS,
  RECOLOR_PRESETS,
  REFLECTION_PRESETS,
  ROTATION_PRESETS,
  SATURATION_PRESETS,
  SHADOW_PRESETS,
  SHAPE_STYLE_PRESETS,
  SHARPEN_PRESETS,
  SOFT_EDGE_PRESETS,
  TEMPERATURE_PRESETS,
  TEXT_EFFECT_GALLERY,
  TEXT_GLOW_SIZES,
  TEXT_REFLECTION_PRESETS,
  TEXT_SHADOW_PRESETS,
  TOC_FORMATS,
  TRANSPARENCY_PRESETS,
  adjustBrightnessContrast,
  adjustSaturation,
  adjustSharpen,
  adjustTemperature,
  applyBlipFx,
  formatNumber,
  glowPreset,
  gradientGeometry,
  gradientTileRgba,
  outline,
  paintPicture,
  patternRgba,
  patternRows,
  policyHiddenIds,
  policySplitsToPlain,
  presetOutline,
  textGlow,
  textboxTemplateSpec,
  tocFormatStyle
} from "./chunk-PPDAIT5J.js";
import "./chunk-LC44A2XI.js";
import {
  CommandRegistry,
  HIGHLIGHT_COLORS,
  OFFICE_COLORS,
  STANDARD_COLORS,
  barCaption,
  closeDialogs,
  closeMenus,
  closePopover,
  colorGrid,
  createCompactBar,
  createRibbon,
  createRuler,
  dialogTabs,
  ensureBarStyles,
  extendCompact,
  extendRibbon,
  formatMeasure,
  hideInCompact,
  hideInRibbon,
  isMenuOpen,
  openDialog,
  openMenu,
  openPane,
  paneOpen,
  parseMeasure,
  parseThemePick,
  promptDialog,
  renderItem,
  ripple,
  showToast,
  spinField,
  symbol,
  themePaletteColors,
  tileGrid,
  toggleMenu
} from "./chunk-W3RLDDHA.js";
import {
  FORMULA_FUNCTIONS,
  TABLE_STYLE_CONDS,
  WATERMARK_TEXTS,
  newTableStyleXml,
  oneColorGradientColor2,
  patchTableStyleXml,
  readStyleSheet,
  resolveColor2,
  retitleTableStyleXml
} from "./chunk-IUSCSE62.js";
import {
  pickLabels,
  uiLang
} from "./chunk-GCZNTURT.js";
import "./chunk-WSFCRVEQ.js";

// src/chrome-borders.ts
var tr = (lang, en, pt) => pickLabels(lang, { en, pt });
var BORDER_STYLES = [
  ["single", "Single", "Simples"],
  ["dotted", "Dotted", "Pontilhada"],
  ["dashSmallGap", "Dashed (small gap)", "Tracejada (intervalo curto)"],
  ["dashed", "Dashed", "Tracejada"],
  ["dotDash", "Dash dot", "Tra\xE7o e ponto"],
  ["dotDotDash", "Dash dot dot", "Tra\xE7o e dois pontos"],
  ["double", "Double", "Dupla"],
  ["triple", "Triple", "Tripla"],
  ["thinThickSmallGap", "Thin-thick (small gap)", "Fina-grossa (intervalo pequeno)"],
  ["thickThinSmallGap", "Thick-thin (small gap)", "Grossa-fina (intervalo pequeno)"],
  ["thinThickThinSmallGap", "Thin-thick-thin (small gap)", "Fina-grossa-fina (intervalo pequeno)"],
  ["thinThickMediumGap", "Thin-thick (medium gap)", "Fina-grossa (intervalo m\xE9dio)"],
  ["thickThinMediumGap", "Thick-thin (medium gap)", "Grossa-fina (intervalo m\xE9dio)"],
  ["thinThickThinMediumGap", "Thin-thick-thin (medium gap)", "Fina-grossa-fina (intervalo m\xE9dio)"],
  ["thinThickLargeGap", "Thin-thick (large gap)", "Fina-grossa (intervalo grande)"],
  ["thickThinLargeGap", "Thick-thin (large gap)", "Grossa-fina (intervalo grande)"],
  ["thinThickThinLargeGap", "Thin-thick-thin (large gap)", "Fina-grossa-fina (intervalo grande)"],
  ["wave", "Wave", "Ondulada"],
  ["doubleWave", "Double wave", "Ondulada dupla"],
  ["dashDotStroked", "Dash dot stroked", "Tra\xE7o e ponto inclinado"],
  ["threeDEmboss", "3-D emboss", "Relevo 3D"],
  ["threeDEngrave", "3-D engrave", "Baixo relevo 3D"],
  ["outset", "Outset", "Alto relevo"],
  ["inset", "Inset", "Baixo relevo"]
];
var BORDER_WIDTHS = [[2, "\xBC"], [4, "\xBD"], [6, "\xBE"], [8, "1"], [12, "1\xBD"], [18, "2\xBC"], [24, "3"], [36, "4\xBD"], [48, "6"]];
function borderSampleSvg(val, color = "currentColor", w = 120, h = 14) {
  const y = h / 2;
  const line2 = (yy, sw, dash = "", stroke = color) => `<line x1="2" y1="${yy}" x2="${w - 2}" y2="${yy}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const bands = (spec) => {
    const total = spec.reduce((a, [t2, g]) => a + t2 + g, 0);
    let yy = y - total / 2;
    return spec.map(([t2, g]) => {
      const s = line2(yy + t2 / 2, t2);
      yy += t2 + g;
      return s;
    }).join("");
  };
  let body;
  switch (val) {
    case "dotted":
      body = line2(y, 1.5, "1.5 1.5");
      break;
    case "dashSmallGap":
      body = line2(y, 1.5, "5 1.5");
      break;
    case "dashed":
      body = line2(y, 1.5, "6 3");
      break;
    case "dotDash":
      body = line2(y, 1.5, "6 2 1.5 2");
      break;
    case "dotDotDash":
      body = line2(y, 1.5, "6 2 1.5 2 1.5 2");
      break;
    case "dashDotStroked":
      body = line2(y, 2, "7 2 2 2");
      break;
    case "double":
      body = bands([[1, 2], [1, 0]]);
      break;
    case "triple":
      body = bands([[1, 1.5], [1, 1.5], [1, 0]]);
      break;
    case "thinThickSmallGap":
      body = bands([[1, 1], [2.5, 0]]);
      break;
    case "thickThinSmallGap":
      body = bands([[2.5, 1], [1, 0]]);
      break;
    case "thinThickThinSmallGap":
      body = bands([[1, 1], [2.5, 1], [1, 0]]);
      break;
    case "thinThickMediumGap":
      body = bands([[1, 2], [2.5, 0]]);
      break;
    case "thickThinMediumGap":
      body = bands([[2.5, 2], [1, 0]]);
      break;
    case "thinThickThinMediumGap":
      body = bands([[1, 2], [2.5, 2], [1, 0]]);
      break;
    case "thinThickLargeGap":
      body = bands([[1, 3.5], [2.5, 0]]);
      break;
    case "thickThinLargeGap":
      body = bands([[2.5, 3.5], [1, 0]]);
      break;
    case "thinThickThinLargeGap":
      body = bands([[1, 3], [2.5, 3], [1, 0]]);
      break;
    case "wave":
    case "doubleWave": {
      const wave = (yy) => {
        let d = `M2 ${yy}`;
        for (let x = 2; x < w - 2; x += 6) d += ` q1.5 -2.5 3 0 q1.5 2.5 3 0`;
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>`;
      };
      body = val === "wave" ? wave(y) : wave(y - 2) + wave(y + 2);
      break;
    }
    case "threeDEmboss":
      body = line2(y - 1.5, 1.5, "", "#c0c0c0") + line2(y, 1.5, "", "#606060") + line2(y + 1.5, 1.5);
      break;
    case "threeDEngrave":
      body = line2(y - 1.5, 1.5) + line2(y, 1.5, "", "#606060") + line2(y + 1.5, 1.5, "", "#c0c0c0");
      break;
    case "outset":
      body = line2(y - 1, 1, "", "#c0c0c0") + line2(y + 0.5, 2);
      break;
    case "inset":
      body = line2(y - 1, 2) + line2(y + 1, 1, "", "#c0c0c0");
      break;
    case "thick":
      body = line2(y, 3);
      break;
    default:
      body = line2(y, 1);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}
var SHADING_PATTERNS = [
  ["clear", "Clear", "Limpar"],
  ["solid", "Solid (100%)", "S\xF3lido (100%)"],
  ...[5, 10, 12.5, 15, 20, 25, 30, 35, 37.5, 40, 45, 50, 55, 60, 62.5, 65, 70, 75, 80, 85, 87.5, 90, 95].map((n) => [`pct${Math.floor(n)}`, `${n}%`, `${String(n).replace(".", ",")}%`]),
  ["horzStripe", "Dark Horizontal", "Horizontal escuro"],
  ["vertStripe", "Dark Vertical", "Vertical escuro"],
  ["reverseDiagStripe", "Dark Down Diagonal", "Diagonal para baixo escura"],
  ["diagStripe", "Dark Up Diagonal", "Diagonal para cima escura"],
  ["horzCross", "Dark Grid", "Grade escura"],
  ["diagCross", "Dark Trellis", "Treli\xE7a escura"],
  ["thinHorzStripe", "Light Horizontal", "Horizontal claro"],
  ["thinVertStripe", "Light Vertical", "Vertical claro"],
  ["thinReverseDiagStripe", "Light Down Diagonal", "Diagonal para baixo clara"],
  ["thinDiagStripe", "Light Up Diagonal", "Diagonal para cima clara"],
  ["thinHorzCross", "Light Grid", "Grade clara"],
  ["thinDiagCross", "Light Trellis", "Treli\xE7a clara"]
];
var el = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var section = (title, ...kids) => el("div", { style: "display:flex;flex-direction:column;gap:8px" }, el("strong", {}, title), ...kids);
var sel = (name, opts, value) => {
  const s = el("select", { name });
  for (const [v, t2] of opts) s.append(el("option", { value: v, selected: v === value }, t2));
  return s;
};
function colorButton(env, value, autoLabel) {
  let cur = value;
  let changed = () => {
  };
  const swatch = el("span", { style: "display:inline-block;width:28px;height:14px;border:1px solid currentColor;border-radius:2px" });
  const text = el("span", {});
  const btn3 = el("button", { type: "button", className: "uo-pill", style: "display:inline-flex;align-items:center;gap:8px;min-width:150px" }, swatch, text, "\u25BE");
  const paint = () => {
    const auto = cur.hex === "auto";
    swatch.style.background = auto ? "transparent" : `#${cur.hex}`;
    text.textContent = auto ? autoLabel : `#${cur.hex}`;
  };
  paint();
  btn3.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = btn3.getBoundingClientRect();
    const colors = env.ed.documentThemeColors();
    openMenu([
      { id: "clr:auto", label: autoLabel, icon: "format_color_reset", onClick: () => {
        cur = { hex: "auto" };
        paint();
        changed();
      } },
      "-",
      {
        content: (close) => colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            const p = parseThemePick(v, colors);
            cur = p ? { hex: p.hex, themeColor: p.themeColor, tint: p.tint, shade: p.shade } : { hex: v.replace(/^#/, "").toUpperCase() };
            paint();
            changed();
          }
        })
      }
    ], { x: r.left, y: r.bottom + 2 }, { lang: env.lang, layer: env.layer });
  });
  return { el: btn3, value: () => cur, onChange: (f) => {
    changed = f;
  } };
}
function styleList(lang, value) {
  let cur = value;
  let changed = () => {
  };
  const box = el("div", { style: "display:flex;flex-direction:column;max-height:180px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px", tabIndex: 0 });
  box.setAttribute("role", "listbox");
  const items = [];
  const all = [["none", tr(lang, "(none)", "(nenhuma)")], ...BORDER_STYLES.map(([v, en, pt]) => [v, tr(lang, en, pt)])];
  for (const [v, label] of all) {
    const it = el("div", { title: label, style: "padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;align-items:center;min-height:18px" });
    it.setAttribute("role", "option");
    it.dataset["v"] = v;
    if (v === "none") it.textContent = label;
    else it.innerHTML = borderSampleSvg(v);
    it.addEventListener("click", () => {
      cur = v;
      sync();
      changed();
    });
    items.push(it);
    box.append(it);
  }
  const sync = () => {
    for (const it of items) {
      const on = it.dataset["v"] === cur;
      it.style.background = on ? "color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)" : "";
      it.setAttribute("aria-selected", String(on));
    }
  };
  box.addEventListener("keydown", (e) => {
    const i = all.findIndex(([v]) => v === cur);
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    cur = all[Math.max(0, Math.min(all.length - 1, i + d))][0];
    sync();
    changed();
    items[all.findIndex(([v]) => v === cur)].scrollIntoView({ block: "nearest" });
  });
  sync();
  queueMicrotask(() => items[all.findIndex(([v]) => v === cur)]?.scrollIntoView({ block: "nearest" }));
  return { el: box, value: () => cur, onChange: (f) => {
    changed = f;
  } };
}
function preview(sides, state, onToggle) {
  const W = 180, H = 140, P = 22;
  const host = el("div", { style: `position:relative;width:${W}px;height:${H}px;background:#fff;border-radius:6px;color:#000` });
  const svgBox = el("div", { style: "position:absolute;inset:0" });
  host.append(svgBox);
  const hit = (s, css) => {
    const b = el("button", { type: "button", title: s, style: `position:absolute;${css};background:transparent;border:0;cursor:pointer;padding:0` });
    b.addEventListener("click", () => onToggle(s));
    host.append(b);
  };
  hit("top", `left:${P}px;top:${P - 8}px;width:${W - 2 * P}px;height:16px`);
  hit("bottom", `left:${P}px;top:${H - P - 8}px;width:${W - 2 * P}px;height:16px`);
  hit("left", `left:${P - 8}px;top:${P}px;width:16px;height:${H - 2 * P}px`);
  hit("right", `left:${W - P - 8}px;top:${P}px;width:16px;height:${H - 2 * P}px`);
  if (sides.includes("insideH")) hit("insideH", `left:${P + 10}px;top:${H / 2 - 8}px;width:${W - 2 * P - 20}px;height:16px`);
  if (sides.includes("insideV")) hit("insideV", `left:${W / 2 - 8}px;top:${P + 10}px;width:16px;height:${H - 2 * P - 20}px`);
  const paint = () => {
    const ln = (s, x1, y1, x2, y2) => {
      const b = state.get(s);
      if (!b || b.val === "nil" || b.val === "none") return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#bbb" stroke-dasharray="2 3"/>`;
      const c = b.color && b.color !== "auto" ? `#${b.color}` : "#000";
      const sw = Math.max(1, (b.sz ?? 4) / 8 * 1.333);
      const dash = /dot|dash/i.test(b.val) ? ` stroke-dasharray="${sw * 2} ${sw * 1.5}"` : "";
      const dbl = /double|thin|thick|triple/i.test(b.val) && b.val !== "thick";
      if (!dbl) return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"${dash}/>`;
      const dx = y1 === y2 ? 0 : 2, dy = y1 === y2 ? 2 : 0;
      return `<line x1="${x1 - dx}" y1="${y1 - dy}" x2="${x2 - dx}" y2="${y2 - dy}" stroke="${c}"/><line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y2 + dy}" stroke="${c}"/>`;
    };
    let txt = "";
    for (let yy = P + 12; yy < H - P - 6; yy += 8) txt += `<line x1="${P + 10}" y1="${yy}" x2="${W - P - 10}" y2="${yy}" stroke="#d8d8d8" stroke-width="3"/>`;
    svgBox.innerHTML = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${txt}` + ln("top", P, P, W - P, P) + ln("bottom", P, H - P, W - P, H - P) + ln("left", P, P, P, H - P) + ln("right", W - P, P, W - P, H - P) + (sides.includes("insideH") ? ln("insideH", P, H / 2, W - P, H / 2) : "") + (sides.includes("insideV") ? ln("insideV", W / 2, P, W / 2, H - P) : "") + "</svg>";
  };
  paint();
  return { el: host, paint };
}
function settings(lang, opts, value) {
  let cur = value;
  let changed = (_v) => {
  };
  const box = el("div", { style: "display:flex;flex-direction:column;gap:4px" });
  const btns = opts.map(([v, en, pt, icon]) => {
    const b = el("button", { type: "button", className: "uo-btn uo-btn-lbl", style: "justify-content:flex-start;gap:8px;width:100%" });
    b.innerHTML = symbol(icon);
    b.append(tr(lang, en, pt));
    b.addEventListener("click", () => {
      cur = v;
      sync();
      changed(v);
    });
    box.append(b);
    return [v, b];
  });
  const sync = () => {
    for (const [v, b] of btns) b.classList.toggle("uo-on", v === cur);
  };
  sync();
  return { el: box, value: () => cur, set: (v) => {
    cur = v;
    sync();
  }, onChange: (f) => {
    changed = f;
  } };
}
var BOX_ICON = "border_outer";
var ALL_ICON = "border_all";
var GRID_ICON = "border_inner";
var NONE_ICON = "border_clear";
var SHADOW_ICON = "filter_none";
var THREE_D_ICON = "view_in_ar";
var CUSTOM_ICON = "edit";
async function bordersShadingDialog(env, tab = "borders") {
  const lang = env.lang, ed = env.ed;
  const ts = ed.getTableState();
  const inTable = !!ts;
  const autoLbl = tr(lang, "Automatic", "Autom\xE1tico");
  const pen0 = ed.getBorderPen();
  const applyOpts = [
    ...inTable ? [["cell", tr(lang, "Cell", "C\xE9lula")], ["table", tr(lang, "Table", "Tabela")]] : [],
    ["paragraph", tr(lang, "Paragraph", "Par\xE1grafo")]
  ];
  const applyTo = sel("b-apply", applyOpts, inTable ? ts.cells ? "cell" : "table" : "paragraph");
  const bState = /* @__PURE__ */ new Map();
  const bStyle = styleList(lang, pen0.val ?? "single");
  const bColor = colorButton(env, { hex: pen0.color ?? "auto", themeColor: pen0.themeColor, tint: pen0.themeTint, shade: pen0.themeShade }, autoLbl);
  const bWidth = sel("b-width", BORDER_WIDTHS.map(([sz, t2]) => [String(sz), `${t2} pt`]), String(pen0.sz ?? 4));
  const pen = () => {
    const v = bStyle.value();
    if (v === "none") return null;
    const c = bColor.value();
    return { val: v, sz: +bWidth.value, space: 0, color: c.hex, ...c.themeColor ? { themeColor: c.themeColor } : {}, ...c.tint ? { themeTint: c.tint } : {}, ...c.shade ? { themeShade: c.shade } : {} };
  };
  const sidesFor = () => applyTo.value === "paragraph" ? ["top", "left", "bottom", "right"] : ["top", "left", "bottom", "right", "insideH", "insideV"];
  const touched = /* @__PURE__ */ new Set();
  const bPrev = () => preview(sidesFor(), bState, (s) => {
    const cur = bState.get(s);
    bState.set(s, cur && cur.val !== "nil" ? null : pen());
    touched.add(s);
    bSet.set("custom");
    bPv.paint();
  });
  let bPv = bPrev();
  const pvHost = el("div", {}, bPv.el);
  const tableSettings = [["none", "None", "Nenhuma", NONE_ICON], ["box", "Box", "Caixa", BOX_ICON], ["all", "All", "Todas", ALL_ICON], ["grid", "Grid", "Grade", GRID_ICON], ["custom", "Custom", "Personalizado", CUSTOM_ICON]];
  const paraSettings = [["none", "None", "Nenhuma", NONE_ICON], ["box", "Box", "Caixa", BOX_ICON], ["shadow", "Shadow", "Sombra", SHADOW_ICON], ["custom", "Custom", "Personalizado", CUSTOM_ICON]];
  const setHost = el("div", {});
  let bSet = settings(lang, inTable ? tableSettings : paraSettings, "custom");
  setHost.append(bSet.el);
  const applySetting = (v) => {
    const p = pen();
    const all = sidesFor();
    for (const s of all) touched.add(s);
    const thick = p ? { ...p, sz: Math.max(p.sz ?? 4, 12) } : null;
    for (const s of all) {
      const inner = s === "insideH" || s === "insideV";
      bState.set(s, v === "none" ? null : v === "box" || v === "shadow" ? inner ? null : p && v === "shadow" ? { ...p, shadow: true } : p : v === "all" ? p : v === "grid" ? inner ? p : thick : bState.get(s) ?? null);
    }
    bPv.paint();
  };
  bSet.onChange(applySetting);
  const loadCurrent = () => {
    bState.clear();
    touched.clear();
    if (applyTo.value === "paragraph") {
      const pb = ed.getParagraphBorders();
      for (const s of ["top", "left", "bottom", "right"]) bState.set(s, pb[s] ?? null);
    } else {
      const tb = { ...ts.styleBorders ?? {}, ...ts.tblPr.tblBorders ?? {} };
      const b = applyTo.value === "table" ? tb : { ...tb, ...ts.tcPr.tcBorders ?? {} };
      for (const s of ["top", "left", "bottom", "right", "insideH", "insideV"]) bState.set(s, b[s] ?? null);
    }
  };
  loadCurrent();
  applyTo.addEventListener("change", () => {
    loadCurrent();
    const ns = settings(lang, applyTo.value === "paragraph" ? paraSettings : tableSettings, "custom");
    ns.onChange(applySetting);
    setHost.replaceChildren(ns.el);
    bSet = ns;
    bPv = bPrev();
    pvHost.replaceChildren(bPv.el);
  });
  const bordersTab = el(
    "div",
    { style: "display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start" },
    section(tr(lang, "Setting:", "Defini\xE7\xE3o:"), setHost),
    section(
      tr(lang, "Style:", "Estilo:"),
      bStyle.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), bColor.el),
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Width:", "Largura:"), bWidth)
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      el(
        "div",
        { style: "font-size:12px;opacity:.8;max-width:180px" },
        tr(lang, "Click on the diagram to apply borders", "Clique no diagrama para aplicar bordas")
      ),
      pvHost,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), applyTo)
    )
  );
  const pb0 = ed.getPageBorders();
  const pgState = /* @__PURE__ */ new Map();
  for (const s of ["top", "left", "bottom", "right"]) pgState.set(s, pb0?.[s] ?? null);
  const firstSide = pb0 ? ["top", "left", "bottom", "right"].map((s) => pb0[s]).find(Boolean) : void 0;
  const pStyle = styleList(lang, firstSide?.val ?? "single");
  const pColor = colorButton(env, { hex: firstSide?.color ?? "auto", themeColor: firstSide?.themeColor }, autoLbl);
  const pWidth = sel("p-width", BORDER_WIDTHS.map(([sz, t2]) => [String(sz), `${t2} pt`]), String(firstSide?.sz ?? 4));
  const pPen = (shadow = false) => {
    const v = pStyle.value();
    if (v === "none") return null;
    const c = pColor.value();
    return { val: v, sz: +pWidth.value, space: 24, color: c.hex, ...c.themeColor ? { themeColor: c.themeColor } : {}, ...shadow ? { shadow: true } : {} };
  };
  const pPv = preview(["top", "left", "bottom", "right"], pgState, (s) => {
    const cur = pgState.get(s);
    pgState.set(s, cur ? null : pPen());
    pSet.set("custom");
    pPv.paint();
  });
  const pSet = settings(lang, [
    ["none", "None", "Nenhuma", NONE_ICON],
    ["box", "Box", "Caixa", BOX_ICON],
    ["shadow", "Shadow", "Sombra", SHADOW_ICON],
    ["3d", "3-D", "3D", THREE_D_ICON],
    ["custom", "Custom", "Personalizado", CUSTOM_ICON]
  ], pb0 ? firstSide?.shadow ? "shadow" : "box" : "none");
  pSet.onChange((v) => {
    for (const s of ["top", "left", "bottom", "right"]) {
      const p = v === "none" ? null : v === "3d" ? { ...pPen() ?? { val: "single", sz: 4 }, val: "threeDEmboss", sz: Math.max(+pWidth.value, 6), space: 24 } : pPen(v === "shadow");
      pgState.set(s, p);
    }
    pPv.paint();
  });
  const pApply = sel("p-apply", [["document", tr(lang, "Whole document", "Documento inteiro")], ["section", tr(lang, "This section", "Esta se\xE7\xE3o")]], "document");
  const pDisplay = sel("p-display", [["allPages", tr(lang, "All pages", "Todas as p\xE1ginas")], ["firstPage", tr(lang, "First page only", "Somente a primeira p\xE1gina")], ["notFirstPage", tr(lang, "All except first page", "Todas exceto a primeira p\xE1gina")]], pb0?.display ?? "allPages");
  const pFrom = sel("p-from", [["page", tr(lang, "Edge of page", "Borda da p\xE1gina")], ["text", tr(lang, "Text", "Texto")]], pb0?.offsetFrom ?? "page");
  const pTop = el("input", { type: "number", name: "p-top", min: "0", max: "31", value: String(pb0?.top?.space ?? 24), style: "width:64px" });
  const pBottom = el("input", { type: "number", name: "p-bottom", min: "0", max: "31", value: String(pb0?.bottom?.space ?? 24), style: "width:64px" });
  const pLeft = el("input", { type: "number", name: "p-left", min: "0", max: "31", value: String(pb0?.left?.space ?? 24), style: "width:64px" });
  const pRight = el("input", { type: "number", name: "p-right", min: "0", max: "31", value: String(pb0?.right?.space ?? 24), style: "width:64px" });
  pFrom.addEventListener("change", () => {
    const [tb, lr] = pFrom.value === "text" ? ["1", "4"] : ["24", "24"];
    pTop.value = pBottom.value = tb;
    pLeft.value = pRight.value = lr;
  });
  const pFront = el("input", { type: "checkbox", name: "p-front", checked: pb0?.zOrder !== "back" });
  const pageTab = el(
    "div",
    { style: "display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start" },
    section(tr(lang, "Setting:", "Defini\xE7\xE3o:"), pSet.el),
    section(
      tr(lang, "Style:", "Estilo:"),
      pStyle.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), pColor.el),
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Width:", "Largura:"), pWidth)
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      pPv.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), pApply, pDisplay),
      section(
        tr(lang, "Margin (pt) measured from", "Margem (pt) medida a partir de"),
        pFrom,
        el(
          "div",
          { className: "uo-dialog-grid" },
          el("span", {}, tr(lang, "Top:", "Superior:")),
          pTop,
          el("span", {}, tr(lang, "Bottom:", "Inferior:")),
          pBottom,
          el("span", {}, tr(lang, "Left:", "Esquerda:")),
          pLeft,
          el("span", {}, tr(lang, "Right:", "Direita:")),
          pRight
        ),
        el("label", { className: "uo-check" }, pFront, tr(lang, "Always display in front", "Sempre exibir na frente"))
      )
    )
  );
  const shdState = ts?.tcPr.shd;
  const fill = colorButton(env, { hex: shdState?.fill && shdState.fill !== "auto" ? shdState.fill : "auto", themeColor: shdState?.themeFill }, tr(lang, "No Color", "Sem Cor"));
  const patStyle = sel("s-pattern", SHADING_PATTERNS.map(([v, en, pt]) => [v, tr(lang, en, pt)]), shdState?.val && shdState.val !== "nil" ? shdState.val : "clear");
  const patColor = colorButton(env, { hex: shdState?.color && shdState.color !== "auto" ? shdState.color : "auto" }, autoLbl);
  const sApply = sel("s-apply", applyOpts, inTable ? ts.cells ? "cell" : "table" : "paragraph");
  const swatch = el("div", { style: "width:180px;height:70px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 30%, transparent)" });
  const syncShd = () => {
    const para = sApply.value === "paragraph";
    patStyle.disabled = para;
    patColor.el.toggleAttribute("disabled", para);
    const f2 = fill.value().hex, pc2 = patColor.value().hex;
    const bg = f2 === "auto" ? "#ffffff" : `#${f2}`;
    const fg = pc2 === "auto" ? "#000000" : `#${pc2}`;
    const v = para ? "clear" : patStyle.value;
    const pct = v === "solid" ? 100 : /^pct(\d+)/.test(v) ? +v.slice(3) + (v === "pct12" || v === "pct37" || v === "pct62" || v === "pct87" ? 0.5 : 0) : 0;
    swatch.style.background = pct ? `color-mix(in srgb, ${fg} ${pct}%, ${bg})` : v === "clear" ? bg : `repeating-linear-gradient(${/vert/i.test(v) ? 90 : /diag/i.test(v) ? 45 : 0}deg, ${fg} 0 ${/thin/.test(v) ? 1 : 2}px, ${bg} ${/thin/.test(v) ? 1 : 2}px 4px)`;
  };
  for (const c of [fill, patColor]) c.onChange(syncShd);
  patStyle.addEventListener("change", syncShd);
  sApply.addEventListener("change", syncShd);
  syncShd();
  const shadingTab = el(
    "div",
    { style: "display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start" },
    el(
      "div",
      { style: "display:flex;flex-direction:column;gap:12px" },
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Fill", "Preenchimento"), fill.el),
      section(
        tr(lang, "Patterns", "Padr\xF5es"),
        el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Style:", "Estilo:"), patStyle),
        el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), patColor.el)
      )
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      swatch,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), sApply)
    )
  );
  const tabs = dialogTabs([
    { id: "borders", label: tr(lang, "Borders", "Bordas"), body: bordersTab },
    { id: "page", label: tr(lang, "Page Border", "Borda da P\xE1gina"), body: pageTab },
    { id: "shading", label: tr(lang, "Shading", "Sombreamento"), body: shadingTab }
  ], tab);
  const h = openDialog({
    title: tr(lang, "Borders and Shading", "Bordas e Sombreamento"),
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 680,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  if (touched.size) {
    const sides = {};
    for (const s of touched) sides[s] = bState.get(s) ?? null;
    if (applyTo.value === "paragraph") {
      const { insideH: _h, insideV: _v, ...ps } = sides;
      ed.setParagraphBorders(ps);
    } else ed.setTableBorderSides(sides, applyTo.value);
  }
  const pgSides = ["top", "left", "bottom", "right"].map((s) => [s, pgState.get(s)]).filter(([, b]) => !!b);
  const space = { top: +pTop.value, bottom: +pBottom.value, left: +pLeft.value, right: +pRight.value };
  const newPb = pgSides.length ? {
    ...pFront.checked ? {} : { zOrder: "back" },
    ...pDisplay.value !== "allPages" ? { display: pDisplay.value } : {},
    ...pFrom.value === "page" ? { offsetFrom: "page" } : {},
    ...Object.fromEntries(pgSides.map(([s, b]) => [s, { ...b, space: space[s] }]))
  } : null;
  if (JSON.stringify(newPb) !== JSON.stringify(pb0 ?? null)) ed.setPageBorders(newPb, pApply.value);
  const f = fill.value(), pv = patStyle.value, pc = patColor.value();
  const shdChanged = f.hex !== (shdState?.fill && shdState.fill !== "auto" ? shdState.fill : "auto") || pv !== (shdState?.val ?? "clear") || pc.hex !== (shdState?.color && shdState.color !== "auto" ? shdState.color : "auto");
  if (shdChanged) {
    if (sApply.value === "paragraph") ed.setShading(f.hex === "auto" ? void 0 : f.hex);
    else {
      const color = f.hex === "auto" ? null : f.themeColor ? { themeColor: f.themeColor, tint: f.tint, shade: f.shade } : f.hex;
      ed.setCellShading(color, pv === "clear" ? null : { val: pv, color: pc.hex }, sApply.value);
    }
  }
}

// src/chrome-table.ts
var L = (en, pt) => ({ en, pt });
function alignIcon(v, h) {
  const y0 = v === "top" ? -760 : v === "center" ? -560 : -360;
  const bars = [[0, 360], [80, 260], [160, 360]].map(([dy, w]) => {
    const x = h === "left" ? 200 : h === "center" ? 480 - w / 2 : 760 - w;
    return `M${x} ${y0 + dy}h${w}v40h-${w}z`;
  }).join("");
  return `<path d="M120-120v-720h720v720H120Zm60-60h600v-600H180v600Z${bars}"/>`;
}
var ALIGN = [
  ["tl", "top", "left", "Align Top Left", "Alinhar em Cima \xE0 Esquerda"],
  ["tc", "top", "center", "Align Top Center", "Alinhar em Cima no Centro"],
  ["tr", "top", "right", "Align Top Right", "Alinhar em Cima \xE0 Direita"],
  ["cl", "center", "left", "Align Center Left", "Alinhar no Centro \xE0 Esquerda"],
  ["cc", "center", "center", "Align Center", "Alinhar no Centro"],
  ["cr", "center", "right", "Align Center Right", "Alinhar no Centro \xE0 Direita"],
  ["bl", "bottom", "left", "Align Bottom Left", "Alinhar Embaixo \xE0 Esquerda"],
  ["bc", "bottom", "center", "Align Bottom Center", "Alinhar Embaixo no Centro"],
  ["br", "bottom", "right", "Align Bottom Right", "Alinhar Embaixo \xE0 Direita"]
];
function registerTableCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const tbl = () => ctl.state().table;
  const inTable = () => canEdit3() && !!tbl();
  const t2 = (c) => ({ ...c, isEnabled: c.isEnabled ? () => inTable() && c.isEnabled() : inTable });
  const cmds = [
    // ── Inserir ──
    { id: "table", label: L("Table", "Tabela"), tip: L("Insert table", "Inserir tabela"), icon: "table", supports: has("insertTable"), run: () => ctl.tableDialog("insert"), isEnabled: canEdit3 },
    { id: "table:insertDlg", label: L("Insert Table\u2026", "Inserir Tabela\u2026"), icon: "table", supports: has("insertTable"), run: () => ctl.tableDialog("insert"), isEnabled: canEdit3 },
    {
      id: "table:excel",
      label: L("Excel Spreadsheet", "Planilha do Excel"),
      icon: "table_view",
      supports: () => typeof ed.canEmbedSpreadsheet === "function" && ed.canEmbedSpreadsheet(),
      isEnabled: () => canEdit3() && !tbl(),
      run: () => {
        void ed.insertSpreadsheet().then(() => ctl.flash(""));
      }
    },
    { id: "table:fromText", label: L("Convert Text to Table\u2026", "Converter Texto em Tabela\u2026"), icon: "table_convert", supports: has("convertTextToTable"), run: () => ctl.tableDialog("fromText"), isEnabled: () => canEdit3() && !tbl() },
    // ── Layout da Tabela: Tabela ──
    t2({ id: "table:select:cell", label: L("Select Cell", "Selecionar C\xE9lula"), icon: "crop_square", supports: has("selectCell"), run: () => ed.selectCell() }),
    t2({ id: "table:select:column", label: L("Select Column", "Selecionar Coluna"), icon: "view_column", supports: has("selectColumn"), run: () => ed.selectColumn() }),
    t2({ id: "table:select:row", label: L("Select Row", "Selecionar Linha"), icon: "table_rows", supports: has("selectRow"), run: () => ed.selectRow() }),
    t2({ id: "table:select:table", label: L("Select Table", "Selecionar Tabela"), icon: "select_all", supports: has("selectTable"), run: () => ed.selectTable() }),
    {
      id: "table:gridlines",
      label: L("View Gridlines", "Exibir Linhas de Grade"),
      icon: "grid_on",
      supports: has("showTableGridlines"),
      run: () => {
        const on = !ed.tableGridlinesShown();
        ed.showTableGridlines(on);
        app.prefs.set("tableGridlines", on ? "1" : "");
      },
      isChecked: () => ed.tableGridlinesShown()
    },
    t2({ id: "table:properties", label: L("Properties", "Propriedades"), tip: L("Table Properties", "Propriedades da Tabela"), icon: "tune", supports: has("setTableProperties"), run: () => ctl.tableDialog("properties") }),
    t2({ id: "table:propertiesDlg", label: L("Table Properties\u2026", "Propriedades da Tabela\u2026"), icon: "tune", supports: has("setTableProperties"), run: () => ctl.tableDialog("properties") }),
    // ── Linhas e Colunas ──
    t2({ id: "row:above", label: L("Insert Above", "Inserir Acima"), icon: "add_row_above", supports: has("insertRowAbove"), run: () => ed.insertRowAbove() }),
    t2({ id: "row:below", label: L("Insert Below", "Inserir Abaixo"), icon: "add_row_below", supports: has("insertRowBelow"), run: () => ed.insertRowBelow() }),
    t2({ id: "col:left", label: L("Insert Left", "Inserir \xE0 Esquerda"), icon: "add_column_left", supports: has("insertColumnLeft"), run: () => ed.insertColumnLeft() }),
    t2({ id: "col:right", label: L("Insert Right", "Inserir \xE0 Direita"), icon: "add_column_right", supports: has("insertColumnRight"), run: () => ed.insertColumnRight() }),
    t2({ id: "cells:insertDlg", label: L("Insert Cells\u2026", "Inserir C\xE9lulas\u2026"), icon: "add_box", supports: has("insertCells"), run: () => ctl.tableDialog("insertCells") }),
    t2({ id: "cells:deleteDlg", label: L("Delete Cells\u2026", "Excluir C\xE9lulas\u2026"), icon: "disabled_by_default", supports: has("deleteCells"), run: () => ctl.tableDialog("deleteCells") }),
    t2({ id: "col:delete", label: L("Delete Columns", "Excluir Colunas"), icon: "delete", supports: has("deleteColumn"), run: () => ed.deleteColumn() }),
    t2({ id: "row:delete", label: L("Delete Rows", "Excluir Linhas"), icon: "delete", supports: has("deleteRow"), run: () => ed.deleteRow() }),
    t2({ id: "table:delete", label: L("Delete Table", "Excluir Tabela"), icon: "delete_forever", supports: has("deleteTable"), run: () => ed.deleteTable() }),
    // ── Mesclar ──
    t2({ id: "cells:merge", label: L("Merge Cells", "Mesclar C\xE9lulas"), icon: "cell_merge", supports: has("mergeCells"), run: () => ed.mergeCells(), isEnabled: () => !!tbl()?.canMerge }),
    t2({ id: "cells:split", label: L("Split Cells\u2026", "Dividir C\xE9lulas\u2026"), icon: "splitscreen_vertical_add", supports: has("splitCell"), run: () => ctl.tableDialog("split") }),
    t2({ id: "table:split", label: L("Split Table", "Dividir Tabela"), icon: "splitscreen", supports: has("splitTable"), run: () => ed.splitTable() }),
    // ── Tamanho da Célula ──
    t2({ id: "table:autofit:content", label: L("AutoFit Contents", "AutoAjuste de Conte\xFAdo"), icon: "fit_width", supports: has("autoFitTable"), run: () => ed.autoFitTable("content") }),
    t2({ id: "table:autofit:window", label: L("AutoFit Window", "AutoAjuste de Janela"), icon: "expand_content", supports: has("autoFitTable"), run: () => ed.autoFitTable("window") }),
    t2({ id: "table:autofit:fixed", label: L("Fixed Column Width", "Largura Fixa da Coluna"), icon: "width_normal", supports: has("autoFitTable"), run: () => ed.autoFitTable("fixed") }),
    t2({ id: "rows:distribute", label: L("Distribute Rows", "Distribuir Linhas"), icon: "view_agenda", supports: has("distributeRows"), run: () => ed.distributeRows() }),
    t2({ id: "cols:distribute", label: L("Distribute Columns", "Distribuir Colunas"), icon: "view_week", supports: has("distributeColumns"), run: () => ed.distributeColumns() }),
    // ── Alinhamento ──
    ...ALIGN.map(([id, v, h, en, pt]) => t2({
      id: `cell:align:${id}`,
      label: L(en, pt),
      icon: alignIcon(v, h),
      supports: has("setCellAlignment"),
      run: () => ed.setCellAlignment(h, v),
      isChecked: () => {
        const s = tbl();
        const ph = ctl.state().para.alignment ?? "left";
        return !!s && s.vAlign === v && ph === h;
      }
    })),
    t2({ id: "cell:textdir", label: L("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", supports: has("cycleTextDirection"), run: () => ed.cycleTextDirection() }),
    t2({ id: "cell:margins", label: L("Cell Margins", "Margens da C\xE9lula"), icon: "padding", supports: has("setTableCellMargins"), run: () => ctl.tableDialog("margins") }),
    // ── Dados ──
    t2({ id: "table:headerRows", label: L("Repeat Header Rows", "Repetir Linhas de Cabe\xE7alho"), icon: "view_headline", supports: has("toggleRepeatHeaderRows"), run: () => ed.toggleRepeatHeaderRows(), isChecked: () => !!tbl()?.headerRow }),
    t2({ id: "table:toText", label: L("Convert to Text", "Converter em Texto"), icon: "text_snippet", supports: has("convertTableToText"), run: () => ctl.tableDialog("toText") }),
    { id: "sort", label: L("Sort", "Classificar"), tip: L("Sort (rows of the table or the selected paragraphs)", "Classificar (linhas da tabela ou os par\xE1grafos selecionados)"), icon: "sort_by_alpha", supports: has("sort"), isEnabled: canEdit3, run: () => ctl.tableDialog("sort") },
    t2({ id: "table:formula", label: L("Formula", "F\xF3rmula"), tip: L("Formula (F9 updates)", "F\xF3rmula (F9 atualiza)"), icon: "functions", supports: has("insertFormula"), run: () => ctl.tableDialog("formula"), isEnabled: () => !tbl()?.cells }),
    {
      id: "fields:update",
      label: L("Update Fields", "Atualizar Campos"),
      icon: "autorenew",
      shortcut: "F9",
      supports: has("updateFields"),
      isEnabled: canEdit3,
      run: () => {
        if (!ed.updateFields()) ctl.flash(pickLabels(app.lang, L("No fields to update", "Nenhum campo para atualizar")));
      }
    },
    // ── Design da Tabela: Opções de Estilo ──
    ...LOOK.map(([id, key, en, pt]) => t2({
      id: `table:look:${id}`,
      label: L(en, pt),
      icon: "check_box_outline_blank",
      supports: has("setTableStyleOptions"),
      run: () => ed.setTableStyleOptions({ [key]: !lookOn(tbl()?.look, key) }),
      isChecked: () => lookOn(tbl()?.look, key)
    })),
    // ── Estilos de Tabela ──
    { id: "table:style:new", label: L("New Table Style\u2026", "Novo Estilo de Tabela\u2026"), icon: "add", supports: has("saveTableStyle"), isEnabled: canEdit3, run: () => ctl.tableDialog("tableStyle:new") },
    t2({ id: "table:style:modify", label: L("Modify Table Style\u2026", "Modificar Estilo de Tabela\u2026"), icon: "edit", supports: has("saveTableStyle"), run: () => ctl.tableDialog("tableStyle:modify") }),
    t2({ id: "table:style:clear", label: L("Clear", "Limpar"), icon: "format_clear", supports: has("setTableStyle"), run: () => {
      void ed.setTableStyle(null);
    } }),
    t2({
      id: "table:shading",
      label: L("Shading", "Sombreamento"),
      icon: "format_color_fill",
      supports: has("setCellShading"),
      run: () => ed.setCellShading(app.lastTableShading),
      color: () => app.lastTableShadingCss
    }),
    // ── Bordas ──
    ...BORDERS.map(([kind, en, pt, icon]) => t2({
      id: `table:border:${kind}`,
      label: L(en, pt),
      icon,
      supports: has("setCellBorders"),
      run: () => {
        app.lastTableBorder = kind;
        ed.setCellBorders(kind);
      }
    })),
    t2({
      id: "table:borders",
      label: L("Borders", "Bordas"),
      icon: "border_all",
      supports: has("setCellBorders"),
      run: () => ed.setCellBorders(app.lastTableBorder)
    }),
    {
      id: "table:painter",
      label: L("Border Painter", "Pincel de Bordas"),
      tip: L("Border Painter: click cell borders to apply the pen (Esc ends)", "Pincel de Bordas: clique nas bordas das c\xE9lulas para aplicar a caneta (Esc encerra)"),
      icon: "format_paint",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("painter"),
      isChecked: () => ed.getTableTool() === "painter"
    },
    {
      id: "table:draw",
      label: L("Draw Table", "Desenhar Tabela"),
      tip: L("Draw Table: drag inside a cell to split it, outside to create a table (Esc ends)", "Desenhar Tabela: arraste numa c\xE9lula para dividi-la, fora para criar uma tabela (Esc encerra)"),
      icon: "draw",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("draw"),
      isChecked: () => ed.getTableTool() === "draw"
    },
    {
      id: "table:eraser",
      label: L("Eraser", "Borracha"),
      tip: L("Eraser: click a border between cells to merge them (Esc ends)", "Borracha: clique numa divisa entre c\xE9lulas para mescl\xE1-las (Esc encerra)"),
      icon: "ink_eraser",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("eraser"),
      isChecked: () => ed.getTableTool() === "eraser"
    },
    // Opções de colagem de células (depois de copiar células)
    ...[
      ["overwrite", "Overwrite Cells", "Substituir C\xE9lulas", "content_paste"],
      ["rows", "Insert as New Rows", "Inserir como Novas Linhas", "add_row_above"],
      ["nest", "Nest Table", "Aninhar Tabela", "table"],
      ["text", "Keep Text Only", "Manter Somente Texto", "text_snippet"]
    ].map(([mode, en, pt, icon]) => ({
      id: `paste:cells:${mode}`,
      label: L(en, pt),
      icon,
      supports: has("pasteCells"),
      isEnabled: () => canEdit3() && ed.hasCellsClip() && (mode === "text" || mode === "overwrite" || !!tbl()),
      run: () => {
        ed.pasteCells(mode);
      }
    })),
    { id: "dlg:borders", label: L("Borders and Shading\u2026", "Bordas e Sombreamento\u2026"), icon: "border_style", supports: has("setParagraphBorders"), isEnabled: canEdit3, run: () => ctl.tableDialog("borders") },
    { id: "dlg:pageBorders", label: L("Page Borders", "Bordas de P\xE1gina"), tip: L("Page Borders (Borders and Shading)", "Bordas de P\xE1gina (Bordas e Sombreamento)"), icon: "border_outer", supports: has("setPageBorders"), isEnabled: canEdit3, run: () => ctl.tableDialog("pageBorders") }
  ];
  reg.add(...cmds);
}
var LOOK = [
  ["header", "headerRow", "Header Row", "Linha de Cabe\xE7alho"],
  ["first", "firstColumn", "First Column", "Primeira Coluna"],
  ["total", "totalRow", "Total Row", "Linha de Total"],
  ["last", "lastColumn", "Last Column", "\xDAltima Coluna"],
  ["bandedRows", "bandedRows", "Banded Rows", "Linhas em Tiras"],
  ["bandedCols", "bandedColumns", "Banded Columns", "Colunas em Tiras"]
];
var lookOn = (look, k) => {
  if (!look) return false;
  switch (k) {
    case "headerRow":
      return !!look.firstRow;
    case "totalRow":
      return !!look.lastRow;
    case "firstColumn":
      return !!look.firstColumn;
    case "lastColumn":
      return !!look.lastColumn;
    case "bandedRows":
      return !look.noHBand;
    case "bandedColumns":
      return !look.noVBand;
  }
};
var BORDERS = [
  ["bottom", "Bottom Border", "Borda Inferior", "border_bottom"],
  ["top", "Top Border", "Borda Superior", "border_top"],
  ["left", "Left Border", "Borda Esquerda", "border_left"],
  ["right", "Right Border", "Borda Direita", "border_right"],
  ["none", "No Border", "Sem Borda", "border_clear"],
  ["all", "All Borders", "Todas as Bordas", "border_all"],
  ["outside", "Outside Borders", "Bordas Externas", "border_outer"],
  ["inside", "Inside Borders", "Bordas Internas", "border_inner"],
  ["insideH", "Inside Horizontal Border", "Borda Horizontal Interna", "border_horizontal"],
  ["insideV", "Inside Vertical Border", "Borda Vertical Interna", "border_vertical"],
  ["tl2br", "Diagonal Down Border", "Borda Diagonal Inferior", "south_east"],
  ["tr2bl", "Diagonal Up Border", "Borda Diagonal Superior", "rotate_90_degrees_ccw"]
];
var thumbQueue = [];
var thumbBusy = false;
function queueThumb(f) {
  thumbQueue.push(f);
  if (thumbBusy) return;
  thumbBusy = true;
  const step = () => {
    const batch = thumbQueue.splice(0, 8);
    if (!batch.length) {
      thumbBusy = false;
      return;
    }
    void Promise.all(batch.map((g) => g().catch(() => void 0))).then(() => requestAnimationFrame(step));
  };
  requestAnimationFrame(step);
}
var STYLE_SECTIONS = [
  { id: "custom", label: L("Custom", "Personalizado") },
  { id: "plain", label: L("Plain Tables", "Tabelas Simples") },
  { id: "grid", label: L("Grid Tables", "Tabelas de Grade") },
  { id: "list", label: L("List Tables", "Tabelas de Lista") }
];
function tableStyleGallery(env) {
  const W = 72, H = 52;
  const list = () => env.ed.tableStyleListNow() ?? [];
  const lookKey = () => JSON.stringify(env.ctl.state().table?.look ?? {});
  return {
    gallery: {
      id: "table:styles",
      label: L("Table Styles", "Estilos de Tabela"),
      icon: "table_view",
      tile: { w: W, h: H },
      rows: 1,
      maxCols: 7,
      minCols: 3,
      expandCols: 7,
      sections: STYLE_SECTIONS,
      supports: () => typeof env.ed.tableStyleListNow === "function",
      isEnabled: () => !!env.ctl.state().table && !env.ed.isProtected(),
      items: () => list().map((s) => ({ id: s.name, label: s.label, section: s.group })),
      version: () => `${env.ed.stylesVersion()}|${lookKey()}|${list().length}`,
      selected: () => {
        const cur = env.ctl.state().table?.style;
        return cur ? list().find((s) => s.id === cur)?.name : void 0;
      },
      render: (tile, it) => {
        const dpr = window.devicePixelRatio || 1;
        const cv = document.createElement("canvas");
        cv.width = Math.round((W - 6) * dpr);
        cv.height = Math.round((H - 6) * dpr);
        cv.style.cssText = `width:${W - 6}px;height:${H - 6}px;display:block;margin:auto`;
        tile.replaceChildren(cv);
        const look = env.ctl.state().table?.look;
        queueThumb(() => cv.isConnected ? env.ed.renderTableStyleThumb(cv, it.id, look) : Promise.resolve());
      },
      onPick: (name) => {
        void env.ed.setTableStyle(name).then(() => env.app.ui?.sync());
      },
      footer: () => ["table:style:modify", "table:style:clear", "table:style:new"],
      context: (it) => [{
        id: "table:style:modifyItem",
        icon: "edit",
        label: L("Modify Table Style\u2026", "Modificar Estilo de Tabela\u2026"),
        onClick: () => env.ctl.tableDialog("tableStyle:modify", it.id)
      }]
    }
  };
}
var tableShadingMenu = (env, ctx) => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const box = document.createElement("div");
    const theme = colorGrid({
      colors: themePaletteColors(colors),
      columns: 10,
      close,
      onPick: (v) => {
        const p = parseThemePick(v, colors);
        if (!p) return;
        env.app.lastTableShading = { themeColor: p.themeColor, tint: p.tint, shade: p.shade };
        env.app.lastTableShadingCss = `#${p.hex}`;
        env.ed.setCellShading(env.app.lastTableShading);
        ctx.after();
      }
    });
    const std = colorGrid({
      colors: STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` })),
      columns: 10,
      close,
      onPick: (h) => {
        env.app.lastTableShading = h;
        env.app.lastTableShadingCss = `#${h}`;
        env.ed.setCellShading(h);
        ctx.after();
      }
    });
    const cap2 = (en, pt) => {
      const d = document.createElement("div");
      d.textContent = ctx.registry.text(L(en, pt));
      d.style.cssText = "font-size:12px;opacity:.8;margin:6px 0 4px";
      return d;
    };
    box.append(cap2("Theme Colors", "Cores do Tema"), theme, cap2("Standard Colors", "Cores Padr\xE3o"), std);
    return box;
  }
}, "-", { id: "table:shading:none", label: L("No Color", "Sem Cor"), icon: "format_color_reset", onClick: () => {
  env.ed.setCellShading(null);
  ctx.after();
} }];
var bordersMenu = () => [...BORDERS.map(([k]) => `table:border:${k}`), "-", "dlg:borders"];
var penStyleMenu = (env, ctx) => [{
  content: (close) => {
    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;max-height:min(420px,60vh);overflow:auto;min-width:150px";
    const cur = env.ed.getBorderPen().val;
    for (const [v, en, pt] of BORDER_STYLES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "uo-mi";
      b.title = ctx.registry.text(L(en, pt));
      b.style.cssText = `display:flex;align-items:center;padding:6px 10px;border:0;background:${v === cur ? "color-mix(in srgb, var(--u-color-primary,#005bc0) 18%, transparent)" : "transparent"};color:inherit;cursor:pointer`;
      b.innerHTML = borderSampleSvg(v);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        close();
        env.ed.setBorderPen({ val: v });
        ctx.after();
      });
      box.append(b);
    }
    return box;
  }
}];
var penWidthMenu = (env, ctx) => BORDER_WIDTHS.map(([sz, t2]) => ({
  id: `penw:${sz}`,
  label: `${t2} pt`,
  checked: env.ed.getBorderPen().sz === sz,
  onClick: () => {
    env.ed.setBorderPen({ sz });
    ctx.after();
  }
}));
var penColorMenu = (env, ctx) => [{
  id: "pen:auto",
  label: L("Automatic", "Autom\xE1tico"),
  icon: "format_color_text",
  onClick: () => {
    env.ed.setBorderPen({ color: "auto", themeColor: void 0, themeTint: void 0, themeShade: void 0 });
    ctx.after();
  }
}, "-", {
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    return colorGrid({
      colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
      columns: 10,
      close,
      onPick: (v) => {
        const p = parseThemePick(v, colors);
        env.ed.setBorderPen(p ? { color: p.hex, themeColor: p.themeColor, themeTint: p.tint, themeShade: p.shade } : { color: v, themeColor: void 0, themeTint: void 0, themeShade: void 0 });
        ctx.after();
      }
    });
  }
}];
function tableDesignGroups(env, ctx) {
  const has = (m) => () => typeof env.ed[m] === "function";
  return [
    { id: "td-options", label: L("Table Style Options", "Op\xE7\xF5es de Estilo de Tabela"), icon: "check_box", prio: 4, cells: [
      { rows: [[{ cmd: "table:look:header", label: true }], [{ cmd: "table:look:total", label: true }], [{ cmd: "table:look:bandedRows", label: true }]] },
      { rows: [[{ cmd: "table:look:first", label: true }], [{ cmd: "table:look:last", label: true }], [{ cmd: "table:look:bandedCols", label: true }]] }
    ] },
    { id: "td-styles", label: L("Table Styles", "Estilos de Tabela"), icon: "table_view", prio: 6, cells: [
      tableStyleGallery(env),
      { split: "table:shading", menu: () => tableShadingMenu(env, ctx), size: "large" }
    ] },
    { id: "td-borders", label: L("Borders", "Bordas"), icon: "border_all", prio: 5, cells: [
      { rows: [
        [{ menu: () => penStyleMenu(env, ctx), id: "pen:style", label: L("Pen Style", "Estilo da Caneta"), icon: "line_style", showLabel: true, supports: has("setBorderPen") }],
        [{ menu: () => penWidthMenu(env, ctx), id: "pen:width", label: L("Pen Weight", "Espessura da Caneta"), icon: "line_weight", showLabel: true, supports: has("setBorderPen") }],
        [{ menu: () => penColorMenu(env, ctx), id: "pen:color", label: L("Pen Color", "Cor da Caneta"), icon: "border_color", showLabel: true, supports: has("setBorderPen") }]
      ] },
      { menu: () => borderStylesMenu(env, ctx), id: "table:borderStyles", label: L("Border Styles", "Estilos de Borda"), icon: "style", size: "large", supports: has("setBorderPen") },
      { split: "table:borders", menu: bordersMenu, size: "large" },
      { cmd: "table:painter", size: "large" }
    ] }
  ];
}
var recentPens = [];
var BORDER_STYLE_ROWS = [["single", 4], ["single", 12], ["single", 18], ["double", 4], ["double", 12], ["thinThickSmallGap", 18], ["dotted", 4], ["dashed", 4]];
var borderStylesMenu = (env, ctx) => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const slots = [["text1", colors["dk1"] ?? colors["text1"] ?? "000000"], ...[1, 2, 3, 4, 5, 6].map((i) => [`accent${i}`, colors[`accent${i}`] ?? "808080"])];
    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;gap:6px;padding:2px;max-height:min(460px,65vh);overflow:auto";
    const pick = (pen) => {
      close();
      env.ed.setBorderPen({ val: pen.val, sz: pen.sz, color: pen.color, themeColor: pen.themeColor, themeTint: void 0, themeShade: void 0 });
      const k = JSON.stringify(pen);
      const i = recentPens.findIndex((x) => JSON.stringify(x) === k);
      if (i >= 0) recentPens.splice(i, 1);
      recentPens.unshift(pen);
      recentPens.length = Math.min(recentPens.length, 7);
      if (env.ed.getTableTool() !== "painter") env.ed.setTableTool("painter");
      ctx.after();
    };
    const grid2 = (pens) => {
      const g = document.createElement("div");
      g.style.cssText = "display:grid;grid-template-columns:repeat(7,64px);gap:3px";
      for (const pen of pens) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "uo-mi";
        b.title = `${ctx.registry.text(L(BORDER_STYLES.find(([v]) => v === pen.val)?.[1] ?? pen.val, BORDER_STYLES.find(([v]) => v === pen.val)?.[2] ?? pen.val))}, ${pen.sz / 8} pt`;
        b.style.cssText = "height:26px;padding:2px;border:1px solid color-mix(in srgb, currentColor 20%, transparent);border-radius:4px;background:#fff;cursor:pointer;display:flex;align-items:center";
        b.innerHTML = borderSampleSvg(pen.val, `#${pen.color}`, 58, 14);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => pick(pen));
        g.append(b);
      }
      return g;
    };
    const head = (t2) => {
      const h = document.createElement("div");
      h.textContent = ctx.registry.text(t2);
      h.style.cssText = "font-size:12px;font-weight:600;opacity:.8;margin:2px";
      return h;
    };
    box.append(
      head(L("Theme Borders", "Bordas do Tema")),
      grid2(BORDER_STYLE_ROWS.flatMap(([val, sz]) => slots.map(([slot, hex]) => ({ val, sz, color: hex, themeColor: slot }))))
    );
    if (recentPens.length) box.append(head(L("Recently Used Borders", "Bordas Usadas Recentemente")), grid2(recentPens));
    return box;
  }
}];
var tableMenu = (env, ctx) => [{
  content: (close) => {
    const box = document.createElement("div");
    const cap2 = document.createElement("div");
    cap2.style.cssText = "font-size:12.5px;margin-bottom:6px";
    cap2.textContent = env.app.ui.L.rows(1, 1);
    const g = document.createElement("div");
    g.style.cssText = "display:grid;grid-template-columns:repeat(10,18px);gap:3px";
    const cells = [];
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) {
      const cell = document.createElement("div");
      cell.style.cssText = "width:18px;height:18px;border:1px solid currentColor;opacity:.35;border-radius:2px;cursor:pointer";
      cell.addEventListener("mouseenter", () => {
        cap2.textContent = env.app.ui.L.rows(r, c);
        cells.forEach((x, i) => {
          const rr = Math.floor(i / 10) + 1, cc = i % 10 + 1;
          x.style.opacity = rr <= r && cc <= c ? "1" : ".35";
        });
      });
      cell.addEventListener("mousedown", (e) => e.preventDefault());
      cell.addEventListener("click", () => {
        close();
        env.ed.insertTable(r, c);
        ctx.after();
      });
      cells.push(cell);
      g.appendChild(cell);
    }
    box.append(cap2, g);
    return box;
  }
}, "-", "table:insertDlg", "table:fromText", "table:excel", "-", {
  id: "table:quickMenu",
  label: L("Quick Tables", "Tabelas R\xE1pidas"),
  icon: "table_view",
  hidden: typeof env.ed.insertQuickTable !== "function",
  submenu: () => env.ed.quickTables().map((q) => ({
    id: `table:quick:${q.id}`,
    label: q.label,
    icon: "table",
    onClick: () => {
      void env.ed.insertQuickTable(q.id).then(() => ctx.after());
    }
  }))
}];
var measureWidget = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L("Table Row Height", "Altura da Linha da Tabela") : L("Table Column Width", "Largura da Coluna da Tabela"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L(".", ","));
    const cm = (tw2) => `${(Math.round(tw2 / 1440 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const tw = (s) => {
      const n = parseFloat(s.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? Math.round(n / 2.54 * 1440) : void 0;
    };
    const cur = () => {
      const s = env.ctl.state().table;
      return which === "height" ? s?.rowHeight?.twips ?? 0 : s?.colWidth ?? 0;
    };
    const set = (v) => {
      if (which === "height") env.ed.setRowHeight(Math.max(0, v), env.ctl.state().table?.rowHeight?.rule === "exact" ? "exact" : "atLeast");
      else env.ed.setColumnWidth(Math.max(57, v));
      ctx.after();
    };
    const apply = () => {
      const v = tw(input.value);
      if (v !== void 0) set(v);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    });
    const step = (d) => set(cur() + d * 57);
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b, d, s] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b.type = "button";
      b.className = "uo-btn";
      b.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b.innerHTML = symbol(s);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => step(d));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      sync: () => {
        const s = env.ctl.state().table;
        const off = !s || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(cur()) : "";
      }
    };
  }
});
var selectMenu = () => ["table:select:cell", "table:select:column", "table:select:row", "table:select:table"];
var deleteMenu = () => ["cells:deleteDlg", "col:delete", "row:delete", "table:delete"];
var autofitMenu = () => ["table:autofit:content", "table:autofit:window", "table:autofit:fixed"];
function tableLayoutGroups(env) {
  const big = (cmd) => ({ cmd, size: "large" });
  const has = (m) => () => typeof env.ed[m] === "function";
  const alignGrid = { rows: [["cell:align:tl", "cell:align:tc", "cell:align:tr"], ["cell:align:cl", "cell:align:cc", "cell:align:cr"], ["cell:align:bl", "cell:align:bc", "cell:align:br"]] };
  return [
    { id: "tl-table", label: L("Table", "Tabela"), icon: "table", prio: 3, cells: [
      { rows: [
        [{ menu: selectMenu, id: "table:select", label: L("Select", "Selecionar"), icon: "select_all", showLabel: true, supports: has("selectTable") }],
        [{ cmd: "table:gridlines", label: true }],
        [{ cmd: "table:properties", label: true }]
      ] }
    ] },
    { id: "tl-draw", label: L("Draw", "Desenhar"), icon: "draw", prio: 1, cells: [big("table:draw"), big("table:eraser")] },
    { id: "tl-rows", label: L("Rows & Columns", "Linhas e Colunas"), icon: "table_rows", prio: 6, launcher: "cells:insertDlg", cells: [
      { menu: deleteMenu, id: "table:deleteMenu", label: L("Delete", "Excluir"), icon: "delete", size: "large", supports: has("deleteRow") },
      big("row:above"),
      { rows: [[{ cmd: "row:below", label: true }], [{ cmd: "col:left", label: true }], [{ cmd: "col:right", label: true }]] }
    ] },
    { id: "tl-merge", label: L("Merge", "Mesclar"), icon: "cell_merge", prio: 5, cells: [
      { rows: [[{ cmd: "cells:merge", label: true }], [{ cmd: "cells:split", label: true }], [{ cmd: "table:split", label: true }]] }
    ] },
    { id: "tl-size", label: L("Cell Size", "Tamanho da C\xE9lula"), icon: "width", prio: 4, cells: [
      { menu: autofitMenu, id: "table:autofit", label: L("AutoFit", "AutoAjuste"), icon: "fit_width", size: "large", supports: has("autoFitTable") },
      { rows: [[measureWidget(env, "height")], [measureWidget(env, "width")]] },
      { rows: [[{ cmd: "rows:distribute", label: true }], [{ cmd: "cols:distribute", label: true }]] }
    ] },
    { id: "tl-align", label: L("Alignment", "Alinhamento"), icon: "vertical_align_center", prio: 5, cells: [
      alignGrid,
      big("cell:textdir"),
      big("cell:margins")
    ] },
    { id: "tl-data", label: L("Data", "Dados"), icon: "functions", prio: 2, cells: [
      big("sort"),
      { rows: [[{ cmd: "table:headerRows", label: true }], [{ cmd: "table:toText", label: true }], [{ cmd: "table:formula", label: true }]] }
    ] }
  ];
}
var tableFormatMenu = () => ({
  id: "tableFmt",
  label: L("Table", "Tabela"),
  icon: "table",
  submenu: () => [
    "row:above",
    "row:below",
    "col:left",
    "col:right",
    "cells:insertDlg",
    "-",
    "row:delete",
    "col:delete",
    "cells:deleteDlg",
    "table:delete",
    "-",
    "cells:merge",
    "cells:split",
    "table:split",
    "-",
    { id: "tableFmt:select", label: L("Select", "Selecionar"), icon: "select_all", submenu: selectMenu },
    { id: "tableFmt:autofit", label: L("AutoFit", "AutoAjuste"), icon: "fit_width", submenu: autofitMenu },
    "rows:distribute",
    "cols:distribute",
    "-",
    { id: "tableFmt:align", label: L("Cell alignment", "Alinhamento da c\xE9lula"), icon: "vertical_align_center", submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
    "cell:textdir",
    "cell:margins",
    "-",
    "table:headerRows",
    "table:toText",
    "table:formula",
    "sort",
    "-",
    "table:gridlines",
    "table:propertiesDlg"
  ]
});
var tableContextItems = () => [
  { id: "ctxTablePaste", label: L("Paste Options", "Op\xE7\xF5es de Colagem"), icon: "content_paste", submenu: () => ["paste:cells:overwrite", "paste:cells:rows", "paste:cells:nest", "paste:cells:text"] },
  { id: "ctxTableInsert", label: L("Insert", "Inserir"), icon: "add", submenu: () => ["row:above", "row:below", "col:left", "col:right", "cells:insertDlg"] },
  { id: "ctxTableDelete", label: L("Delete", "Excluir"), icon: "delete", submenu: deleteMenu },
  "cells:merge",
  "cells:split",
  "-",
  { id: "ctxTableAlign", label: L("Cell alignment", "Alinhamento da c\xE9lula"), icon: "vertical_align_center", submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
  "cell:textdir",
  { id: "ctxTableAutofit", label: L("AutoFit", "AutoAjuste"), icon: "fit_width", submenu: autofitMenu },
  "rows:distribute",
  "cols:distribute",
  "-",
  "table:propertiesDlg"
];

// src/chrome-hf.ts
var L2 = (en, pt) => ({ en, pt });
var tr2 = (lang, en, pt) => pickLabels(lang, { en, pt });
function registerHfCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const opts = () => ed.getHeaderFooterOptions();
  const inHf = () => ed.editingHeaderFooter() !== null;
  const edit = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  const cmds = [
    edit({ id: "hf:editHeader", label: L2("Edit Header", "Editar Cabe\xE7alho"), icon: "edit", run: () => ed.goToHeaderFooter("header") }),
    edit({ id: "hf:editFooter", label: L2("Edit Footer", "Editar Rodap\xE9"), icon: "edit", run: () => ed.goToHeaderFooter("footer") }),
    edit({ id: "hf:removeHeader", label: L2("Remove Header", "Remover Cabe\xE7alho"), icon: "delete", supports: has("removeHeaderFooter"), run: () => ed.removeHeaderFooter("header") }),
    edit({ id: "hf:removeFooter", label: L2("Remove Footer", "Remover Rodap\xE9"), icon: "delete", supports: has("removeHeaderFooter"), run: () => ed.removeHeaderFooter("footer") }),
    edit({ id: "hf:removePageNumbers", label: L2("Remove Page Numbers", "Remover N\xFAmeros de P\xE1gina"), icon: "delete", supports: has("removePageNumbers"), run: () => ed.removePageNumbers() }),
    edit({ id: "dlg:pageNumberFormat", label: L2("Format Page Numbers\u2026", "Formatar N\xFAmeros de P\xE1gina\u2026"), icon: "format_list_numbered", supports: has("setPageNumberFormat"), run: () => ctl.hfDialog("pageNumbers") }),
    edit({ id: "dlg:dateTime", label: L2("Date & Time", "Data e Hora"), tip: L2("Insert the current date or time", "Insere a data ou a hora atual"), icon: "calendar_today", supports: has("insertDateTime"), run: () => ctl.hfDialog("dateTime") }),
    edit({ id: "dlg:alignTab", label: L2("Insert Alignment Tab", "Inserir Tabula\xE7\xE3o de Alinhamento"), tip: L2("Tab stop that aligns text to the margin or the indent", "Tabula\xE7\xE3o que alinha o texto \xE0 margem ou ao recuo"), icon: "keyboard_tab", supports: has("insertAlignmentTab"), run: () => ctl.hfDialog("alignTab") }),
    edit({ id: "dlg:hfOptions", label: L2("Header & footer options\u2026", "Op\xE7\xF5es de cabe\xE7alho e rodap\xE9\u2026"), icon: "tune", supports: has("setDifferentFirstPage"), run: () => ctl.hfDialog("options") }),
    ...[["author", "Author", "Autor", "person"], ["title", "Document Title", "T\xEDtulo do Documento", "title"], ["fileName", "File Name", "Nome do Arquivo", "draft"], ["filePath", "File Path", "Caminho do Arquivo", "folder"]].map(([k, en, pt, icon]) => edit({ id: `docinfo:${k}`, label: { en, pt }, icon, supports: has("insertDocumentInfo"), run: () => ed.insertDocumentInfo(k, app.title ? app.title + "." + app.format : "") })),
    // navegação (guia contextual)
    edit({ id: "hf:gotoHeader", label: L2("Go to Header", "Ir para Cabe\xE7alho"), icon: "vertical_align_top", supports: has("goToHeaderFooter"), run: () => ed.goToHeaderFooter("header"), isEnabled: () => ed.editingHeaderFooter() === "footer" }),
    edit({ id: "hf:gotoFooter", label: L2("Go to Footer", "Ir para Rodap\xE9"), icon: "vertical_align_bottom", supports: has("goToHeaderFooter"), run: () => ed.goToHeaderFooter("footer"), isEnabled: () => ed.editingHeaderFooter() === "header" }),
    edit({ id: "hf:prev", label: L2("Previous", "Anterior"), tip: L2("Previous header or footer", "Cabe\xE7alho ou rodap\xE9 anterior"), icon: "navigate_before", supports: has("previousHeaderFooter"), run: () => ed.previousHeaderFooter(), isEnabled: inHf }),
    edit({ id: "hf:next", label: L2("Next", "Pr\xF3ximo"), tip: L2("Next header or footer", "Pr\xF3ximo cabe\xE7alho ou rodap\xE9"), icon: "navigate_next", supports: has("nextHeaderFooter"), run: () => ed.nextHeaderFooter(), isEnabled: inHf }),
    edit({
      id: "hf:link",
      label: L2("Link to Previous", "Vincular ao Anterior"),
      tip: L2("Use the same header or footer as the previous section", "Usa o mesmo cabe\xE7alho ou rodap\xE9 da se\xE7\xE3o anterior"),
      icon: "link",
      supports: has("setLinkToPrevious"),
      isEnabled: () => inHf() && (opts()?.section ?? 0) > 0,
      isChecked: () => !!opts()?.linkToPrevious,
      run: () => ed.setLinkToPrevious(!opts()?.linkToPrevious)
    }),
    // opções (caixas de seleção)
    edit({ id: "hf:firstPage", label: L2("Different First Page", "Primeira P\xE1gina Diferente"), icon: "filter_1", supports: has("setDifferentFirstPage"), isChecked: () => !!opts()?.differentFirstPage, run: () => ed.setDifferentFirstPage(!opts()?.differentFirstPage) }),
    edit({ id: "hf:oddEven", label: L2("Different Odd & Even Pages", "P\xE1ginas Pares e \xCDmpares Diferentes"), icon: "auto_stories", supports: has("setDifferentOddEven"), isChecked: () => !!opts()?.differentOddEven, run: () => ed.setDifferentOddEven(!opts()?.differentOddEven) }),
    { id: "hf:showText", label: L2("Show Document Text", "Mostrar Texto do Documento"), icon: "visibility", supports: has("showDocumentText"), isEnabled: inHf, isChecked: () => ed.documentTextShown(), run: () => ed.showDocumentText(!ed.documentTextShown()) }
  ];
  reg.add(...cmds);
}
function templateTiles(env, ctx, gallery, wide) {
  return {
    content: (close) => {
      const list = document.createElement("div");
      list.className = "uw-hf-gallery";
      list.style.cssText = `display:grid;grid-template-columns:${wide ? "1fr" : "repeat(3, auto)"};gap:6px;padding:6px;max-height:${wide ? 420 : 300}px;overflow:auto`;
      for (const t2 of env.ed.headerFooterTemplates(gallery)) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset["template"] = t2.id;
        b.title = t2.name;
        b.setAttribute("aria-label", t2.name);
        b.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left";
        const cap2 = document.createElement("span");
        cap2.textContent = t2.name;
        cap2.style.cssText = "font-size:12px;opacity:.8";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        b.append(cap2, cv);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => {
          close();
          env.ed.insertHeaderFooterTemplate(gallery, t2.id);
          ctx.after();
        });
        list.append(b);
        requestAnimationFrame(() => {
          env.ed.paintHeaderFooterTemplate(gallery, t2.id, cv, wide ? 300 : gallery === "pageMargin" ? 90 : 160);
        });
      }
      return list;
    }
  };
}
function hfGalleryMenu(env, ctx, kind) {
  return [
    templateTiles(env, ctx, kind, true),
    "-",
    kind === "header" ? "hf:editHeader" : "hf:editFooter",
    kind === "header" ? "hf:removeHeader" : "hf:removeFooter"
  ];
}
function pageNumberMenu(env, ctx) {
  const sub = (id, label, icon) => ({ id: `pgnum:${id}`, label, icon, submenu: () => [templateTiles(env, ctx, id, id !== "pageMargin" && id !== "pageCurrent")] });
  return [
    sub("pageTop", L2("Top of Page", "In\xEDcio da P\xE1gina"), "vertical_align_top"),
    sub("pageBottom", L2("Bottom of Page", "Fim da P\xE1gina"), "vertical_align_bottom"),
    sub("pageMargin", L2("Page Margins", "Margens da P\xE1gina"), "border_right"),
    sub("pageCurrent", L2("Current Position", "Posi\xE7\xE3o Atual"), "text_select_end"),
    "-",
    "dlg:pageNumberFormat",
    "hf:removePageNumbers"
  ];
}
var docInfoMenu = () => ["docinfo:author", "docinfo:title", "docinfo:fileName", "docinfo:filePath"];
function distanceWidget(env, which) {
  return {
    widget: (ctx) => {
      const lang = ctx.lang;
      const u = lang === "pt" ? { tw: 1440 / 2.54, name: "cm" } : { tw: 1440, name: '"' };
      const wrap = document.createElement("label");
      wrap.className = "uo-g-inline";
      wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;white-space:nowrap";
      const title = which === "header" ? tr2(lang, "Header from Top", "Cabe\xE7alho a Partir da Parte Superior") : tr2(lang, "Footer from Bottom", "Rodap\xE9 a Partir da Parte Inferior");
      wrap.title = title;
      wrap.innerHTML = symbol(which === "header" ? "vertical_align_top" : "vertical_align_bottom");
      const input = document.createElement("input");
      input.className = "uo-num";
      input.dataset["a"] = `hf:dist:${which}`;
      input.inputMode = "decimal";
      input.style.width = "64px";
      input.setAttribute("aria-label", title);
      const fmt2 = (tw) => `${(Math.round(tw / u.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 })} ${u.name}`;
      const apply = () => {
        const n = parseFloat(input.value.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
        if (Number.isFinite(n) && n >= 0) env.ed.setHeaderFooterDistance({ [which]: Math.round(n * u.tw) });
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
      wrap.append(input);
      return {
        el: wrap,
        sync: () => {
          const o = env.ed.getHeaderFooterOptions();
          if (o && env.root.activeElement !== input) input.value = fmt2(which === "header" ? o.headerDistance : o.footerDistance);
          input.disabled = env.app.comparing || env.ed.isProtected();
        }
      };
    }
  };
}
function hfToolsGroups(env, ctx) {
  const large4 = (cmd) => ({ cmd, size: "large" });
  return [
    { id: "hf-hf", label: L2("Header & Footer", "Cabe\xE7alho e Rodap\xE9"), icon: "call_to_action", prio: 6, cells: [
      { menu: () => hfGalleryMenu(env, ctx, "header"), id: "hf:headerMenu", label: L2("Header", "Cabe\xE7alho"), icon: "vertical_align_top", size: "large" },
      { menu: () => hfGalleryMenu(env, ctx, "footer"), id: "hf:footerMenu", label: L2("Footer", "Rodap\xE9"), icon: "vertical_align_bottom", size: "large" },
      { menu: () => pageNumberMenu(env, ctx), id: "hf:pgnumMenu", label: L2("Page Number", "N\xFAmero de P\xE1gina"), icon: "numbers", size: "large" }
    ] },
    { id: "hf-insert", label: L2("Insert", "Inserir"), icon: "calendar_today", prio: 5, cells: [
      large4("dlg:dateTime"),
      { menu: docInfoMenu, id: "hf:docinfo", label: L2("Document Info", "Informa\xE7\xF5es do Documento"), icon: "info", size: "large" },
      large4("image")
    ] },
    { id: "hf-nav", label: L2("Navigation", "Navega\xE7\xE3o"), icon: "swap_vert", prio: 4, cells: [
      large4("hf:gotoHeader"),
      large4("hf:gotoFooter"),
      { rows: [[{ cmd: "hf:prev", label: true }], [{ cmd: "hf:next", label: true }], [{ cmd: "hf:link", label: true }]] }
    ] },
    { id: "hf-options", label: L2("Options", "Op\xE7\xF5es"), icon: "tune", prio: 4, cells: [
      { rows: [[{ cmd: "hf:firstPage", label: true }], [{ cmd: "hf:oddEven", label: true }], [{ cmd: "hf:showText", label: true }]] }
    ] },
    { id: "hf-position", label: L2("Position", "Posi\xE7\xE3o"), icon: "height", prio: 3, cells: [
      { rows: [[distanceWidget(env, "header")], [distanceWidget(env, "footer")], [{ cmd: "dlg:alignTab", label: true }]] }
    ] },
    { id: "hf-close", label: L2("Close", "Fechar"), icon: "close", prio: 9, cells: [large4("hf:close")] }
  ];
}
var el2 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var select = (name, opts, value) => {
  const s = el2("select", { name });
  for (const [v, t2] of opts) s.append(el2("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var radio = (name, value, label, on) => el2("label", { className: "uo-check" }, el2("input", { type: "radio", name, value, checked: on }), label);
var check = (name, label, on) => el2("label", { className: "uo-check" }, el2("input", { type: "checkbox", name, checked: on }), label);
async function pageNumberFormatDialog(env) {
  const lang = env.lang, ed = env.ed;
  const f = ed.getPageNumberFormat();
  if (!f) return;
  const fmt2 = select("fmt", [
    ["decimal", "1, 2, 3, \u2026"],
    ["numberInDash", "- 1 -, - 2 -, - 3 -, \u2026"],
    ["lowerLetter", "a, b, c, \u2026"],
    ["upperLetter", "A, B, C, \u2026"],
    ["lowerRoman", "i, ii, iii, \u2026"],
    ["upperRoman", "I, II, III, \u2026"]
  ], f.format);
  const chap = check("chap", tr2(lang, "Include chapter number", "Incluir n\xFAmero do cap\xEDtulo"), !!f.chapter);
  const level = select("level", Array.from({ length: 9 }, (_, i) => [String(i + 1), tr2(lang, `Heading ${i + 1}`, `T\xEDtulo ${i + 1}`)]), String(f.chapter?.level ?? 1));
  const sep = select("sep", [
    ["hyphen", tr2(lang, "- (hyphen)", "- (h\xEDfen)")],
    ["period", tr2(lang, ". (period)", ". (ponto)")],
    ["colon", tr2(lang, ": (colon)", ": (dois-pontos)")],
    ["emDash", tr2(lang, "\u2014 (em dash)", "\u2014 (travess\xE3o)")],
    ["enDash", tr2(lang, "\u2013 (en dash)", "\u2013 (tra\xE7o)")]
  ], f.chapter?.separator ?? "hyphen");
  const cont = radio("num", "continue", tr2(lang, "Continue from previous section", "Continuar da se\xE7\xE3o anterior"), f.start === null);
  const startR = radio("num", "start", tr2(lang, "Start at:", "Iniciar em:"), f.start !== null);
  const start = el2("input", { type: "number", name: "start", min: "0", step: "1", value: String(f.start ?? 1), style: "width:72px" });
  const chapIn = chap.querySelector("input");
  const sync = () => {
    level.disabled = sep.disabled = !chapIn.checked;
    start.disabled = !startR.querySelector("input").checked;
  };
  for (const x of [chapIn, cont.querySelector("input"), startR.querySelector("input")]) x.addEventListener("change", sync);
  start.addEventListener("focus", () => {
    startR.querySelector("input").checked = true;
    sync();
  });
  sync();
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el2("div", { className: "uo-dialog-grid" }, el2("span", {}, tr2(lang, "Number format", "Formato do n\xFAmero")), fmt2),
    chap,
    el2(
      "div",
      { className: "uo-dialog-grid", style: "padding-left:24px" },
      el2("span", {}, tr2(lang, "Chapter starts with style", "O cap\xEDtulo come\xE7a com o estilo")),
      level,
      el2("span", {}, tr2(lang, "Use separator", "Usar separador")),
      sep
    ),
    el2("strong", {}, tr2(lang, "Page numbering", "Numera\xE7\xE3o de p\xE1gina")),
    cont,
    el2("div", { style: "display:flex;gap:8px;align-items:center" }, startR, start)
  );
  const h = openDialog({
    title: tr2(lang, "Page Number Format", "Formatar N\xFAmeros de P\xE1gina"),
    icon: "format_list_numbered",
    body,
    layer: env.layer,
    lang,
    width: 440,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const n = Math.max(0, Math.round(Number(start.value) || 0));
  ed.setPageNumberFormat({
    format: fmt2.value,
    chapter: chapIn.checked ? { level: Number(level.value), separator: sep.value } : null,
    start: startR.querySelector("input").checked ? n : null
  });
}
async function dateTimeDialog(env) {
  const lang = env.lang, ed = env.ed;
  let dl = lang;
  const list = el2("select", { name: "formats", size: 12, style: "width:100%;min-height:240px" });
  const fill = () => {
    list.replaceChildren(...ed.dateTimeFormats(dl).map((f) => el2("option", { value: f.pattern, textContent: f.sample })));
    list.selectedIndex = 0;
  };
  fill();
  const language = select("lang", [["pt", "Portugu\xEAs (Brasil)"], ["en", tr2(lang, "English (United States)", "Ingl\xEAs (Estados Unidos)")]], dl);
  language.addEventListener("change", () => {
    dl = language.value;
    fill();
  });
  const update = check("update", tr2(lang, "Update automatically", "Atualizar automaticamente"), false);
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el2("span", {}, tr2(lang, "Available formats:", "Formatos dispon\xEDveis:")),
    list,
    el2("div", { className: "uo-dialog-grid" }, el2("span", {}, tr2(lang, "Language", "Idioma")), language),
    update
  );
  list.addEventListener("dblclick", () => h.close("ok"));
  const h = openDialog({
    title: tr2(lang, "Date and Time", "Data e Hora"),
    icon: "calendar_today",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok" || !list.value) return;
  ed.insertDateTime(list.value, update.querySelector("input").checked, dl);
}
async function alignTabDialog(env) {
  const lang = env.lang;
  const al = el2(
    "div",
    { style: "display:flex;gap:12px" },
    radio("al", "left", tr2(lang, "Left", "Esquerda"), true),
    radio("al", "center", tr2(lang, "Center", "Centro"), false),
    radio("al", "right", tr2(lang, "Right", "Direita"), false)
  );
  const rel = el2(
    "div",
    { style: "display:flex;gap:12px" },
    radio("rel", "margin", tr2(lang, "Margin", "Margem"), true),
    radio("rel", "indent", tr2(lang, "Indent", "Recuo"), false)
  );
  const leader = select("leader", [["none", tr2(lang, "(none)", "(nenhum)")], ["dot", "......."], ["hyphen", "-------"], ["underscore", "_______"], ["middleDot", "\xB7\xB7\xB7\xB7\xB7\xB7\xB7"]], "none");
  const body = el2(
    "div",
    { className: "uo-dialog-grid" },
    el2("span", {}, tr2(lang, "Alignment", "Alinhamento")),
    al,
    el2("span", {}, tr2(lang, "Align relative to", "Alinhar em rela\xE7\xE3o a")),
    rel,
    el2("span", {}, tr2(lang, "Leader", "Preenchimento")),
    leader
  );
  const h = openDialog({
    title: tr2(lang, "Alignment Tab", "Tabula\xE7\xE3o de Alinhamento"),
    icon: "keyboard_tab",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const v = (n) => body.querySelector(`input[name="${n}"]:checked`)?.value ?? "";
  env.ed.insertAlignmentTab(v("al"), v("rel"), leader.value);
}
async function hfOptionsDialog(env) {
  const lang = env.lang, ed = env.ed;
  const o = ed.getHeaderFooterOptions();
  if (!o) return;
  const u = lang === "pt" ? { tw: 1440 / 2.54, name: "cm" } : { tw: 1440, name: '"' };
  const fmt2 = (tw) => (Math.round(tw / u.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 });
  const parse = (v) => {
    const n = parseFloat(v.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * u.tw) : NaN;
  };
  const first = check("first", tr2(lang, "Different first page", "Primeira p\xE1gina diferente"), o.differentFirstPage);
  const oddEven = check("oddEven", tr2(lang, "Different odd & even pages", "P\xE1ginas pares e \xEDmpares diferentes"), o.differentOddEven);
  const hd = el2("input", { type: "text", name: "hd", value: fmt2(o.headerDistance), inputMode: "decimal", style: "width:80px" });
  const fd = el2("input", { type: "text", name: "fd", value: fmt2(o.footerDistance), inputMode: "decimal", style: "width:80px" });
  const unit = (i) => el2("span", { style: "display:flex;gap:4px;align-items:center" }, i, u.name);
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el2("strong", {}, o.sectionCount > 1 ? tr2(lang, `Section ${o.section + 1}`, `Se\xE7\xE3o ${o.section + 1}`) : tr2(lang, "Document", "Documento")),
    first,
    oddEven,
    el2(
      "div",
      { className: "uo-dialog-grid" },
      el2("span", {}, tr2(lang, "Header from top", "Cabe\xE7alho a partir do topo")),
      unit(hd),
      el2("span", {}, tr2(lang, "Footer from bottom", "Rodap\xE9 a partir da base")),
      unit(fd)
    )
  );
  const h = openDialog({
    title: tr2(lang, "Header & footer options", "Op\xE7\xF5es de cabe\xE7alho e rodap\xE9"),
    icon: "tune",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: env.app.ui.L.apply, primary: true }]
  });
  if (await h.result !== "ok") return;
  const fi = first.querySelector("input").checked, oe = oddEven.querySelector("input").checked;
  if (fi !== o.differentFirstPage) ed.setDifferentFirstPage(fi);
  if (oe !== o.differentOddEven) ed.setDifferentOddEven(oe);
  const h2 = parse(hd.value), f2 = parse(fd.value);
  const d = {};
  if (Number.isFinite(h2) && h2 >= 0 && h2 !== o.headerDistance) d.header = h2;
  if (Number.isFinite(f2) && f2 >= 0 && f2 !== o.footerDistance) d.footer = f2;
  if (d.header !== void 0 || d.footer !== void 0) ed.setHeaderFooterDistance(d);
}

// src/chrome-picture-adjust.ts
var L3 = (en, pt) => ({ en, pt });
var pctText = (v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
function registerPictureAdjustCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const on = () => !app.comparing && !ed.isProtected() && typeof api["selectedImage"] === "function" && !!ed.selectedImage();
  const p = (c) => ({ ...c, isEnabled: on });
  reg.add(
    p({ id: "pic:compress", label: L3("Compress Pictures", "Compactar Imagens"), icon: "compress", supports: has("compressImages"), run: () => ctl.pictureDialog("compress") }),
    p({ id: "pic:change:file", label: L3("From a File\u2026", "De um Arquivo..."), icon: "upload_file", supports: has("changeImageFromFile"), run: () => ed.changeImageFromFile() }),
    p({ id: "pic:change:clip", label: L3("From Clipboard", "Da \xC1rea de Transfer\xEAncia"), icon: "content_paste", supports: has("changeImageFromClipboard"), run: () => ed.changeImageFromClipboard() }),
    p({ id: "pic:reset", label: L3("Reset Picture", "Redefinir Imagem"), icon: "restart_alt", supports: has("resetImage"), run: () => ed.resetImage(false) }),
    p({ id: "pic:resetSize", label: L3("Reset Picture & Size", "Redefinir Imagem e Tamanho"), icon: "restart_alt", supports: has("resetImage"), run: () => ed.resetImage(true) }),
    p({ id: "pic:transparentColor", label: L3("Set Transparent Color", "Definir Cor Transparente"), icon: "colorize", supports: has("startTransparentColorPick"), run: () => ed.startTransparentColorPick() })
  );
}
function docTheme(env) {
  return { major: { scripts: {} }, minor: { scripts: {} }, colors: env.ed.documentThemeColors() };
}
function previewTile(env, tile, fn) {
  const p = env.ed.selectedImagePreview(64, 52);
  const c = document.createElement("canvas");
  c.style.cssText = "max-width:64px;max-height:52px;display:block;margin:auto";
  if (p) {
    c.width = p.width;
    c.height = p.height;
    const d = new Uint8ClampedArray(p.data);
    if (fn) fn(d, p.width, p.height);
    c.getContext("2d").putImageData(new ImageData(d, p.width, p.height), 0, 0);
    let clear = false;
    for (let i = 3; i < d.length && !clear; i += 4) clear = d[i] < 250;
    if (clear) c.style.background = "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px";
  }
  tile.replaceChildren(c);
}
function grid(env, ctx, sections, fx, pick, selected, cols) {
  return (close) => tileGrid({
    sections,
    tile: { w: 72, h: 60 },
    cols,
    text: (l) => ctx.registry.text(l),
    close,
    ...selected ? { selected } : {},
    render: (tile, it) => previewTile(env, tile, fx(it.id)),
    onPick: (id) => {
      pick(id);
      ctx.after();
    }
  });
}
function correctionsMenu(env, ctx) {
  const ed = env.ed;
  const a = ed.selectedImage()?.format.blip.a14;
  const sel4 = a?.sharpen ? `sh:${a.sharpen / 1e5}` : `bc:${(a?.bright ?? 0) / 1e5}:${(a?.contrast ?? 0) / 1e5}`;
  const sharpLabel = (v) => v === 0 ? L3("Sharpen: 0%", "Nitidez: 0%") : v < 0 ? L3(`Soften: ${-v / 1e3}%`, `Suavizar: ${-v / 1e3}%`) : L3(`Sharpen: ${v / 1e3}%`, `Nitidez: ${v / 1e3}%`);
  return [{
    content: grid(env, ctx, [
      { label: L3("Sharpen/Soften", "Nitidez/Suavizar"), items: SHARPEN_PRESETS.map((v) => ({ id: `sh:${v / 1e5}`, label: sharpLabel(v) })) },
      {
        label: L3("Brightness/Contrast", "Brilho/Contraste"),
        items: BRIGHT_CONTRAST_STEPS.flatMap((c) => BRIGHT_CONTRAST_STEPS.map((b) => ({
          id: `bc:${b / 1e5}:${c / 1e5}`,
          label: L3(`Brightness: ${pctText(b / 1e5)} Contrast: ${pctText(c / 1e5)}`, `Brilho: ${pctText(b / 1e5)} Contraste: ${pctText(c / 1e5)}`)
        })))
      }
    ], (id) => {
      const [k, x, y] = id.split(":");
      if (k === "sh") return (d, w, h) => adjustSharpen(d, w, h, Number(x));
      return (d) => adjustBrightnessContrast(d, Number(x), Number(y));
    }, (id) => {
      const [k, x, y] = id.split(":");
      void (k === "sh" ? ed.setImageAdjust({ sharpen: Number(x) }) : ed.setImageAdjust({ bright: Number(x), contrast: Number(y) })).then(() => ctx.after());
    }, sel4, 5)
  }, "-", { id: "pic:corrections:options", label: L3("Picture Corrections Options\u2026", "Op\xE7\xF5es de Corre\xE7\xF5es de Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }];
}
function colorMenu(env, ctx) {
  const ed = env.ed;
  const theme = docTheme(env);
  const a = ed.selectedImage()?.format.blip.a14;
  const blip = ed.selectedImage()?.format.blip;
  const recolorNow = RECOLOR_PRESETS.find((p) => p.id !== "none" && JSON.stringify(p.fx) === JSON.stringify({ ...blip?.grayscl ? { grayscl: true } : {}, ...blip?.duotone ? { duotone: blip.duotone } : {}, ...blip?.lum ? { lum: blip.lum } : {}, ...blip?.biLevel !== void 0 ? { biLevel: blip.biLevel } : {} }));
  const sel4 = a?.saturation !== void 0 ? `sat:${a.saturation}` : a?.colorTemp !== void 0 ? `temp:${a.colorTemp}` : recolorNow ? `re:${recolorNow.id}` : "sat:100000";
  return [
    {
      content: grid(env, ctx, [
        { label: L3("Color Saturation", "Satura\xE7\xE3o da Cor"), items: SATURATION_PRESETS.map((v) => ({ id: `sat:${v}`, label: L3(`Saturation: ${v / 1e3}%`, `Satura\xE7\xE3o: ${v / 1e3}%`) })) },
        { label: L3("Color Tone", "Tom da Cor"), items: TEMPERATURE_PRESETS.map((v) => ({ id: `temp:${v}`, label: L3(`Temperature: ${v} K`, `Temperatura: ${v} K`) })) },
        { label: L3("Recolor", "Recolorir"), items: RECOLOR_PRESETS.map((p) => ({ id: `re:${p.id}`, label: p.label })) }
      ], (id) => {
        const [k, v] = id.split(":");
        if (k === "sat") return (d) => adjustSaturation(d, Number(v) / 1e5);
        if (k === "temp") return (d) => adjustTemperature(d, Number(v));
        const fx = RECOLOR_PRESETS.find((x) => x.id === v)?.fx;
        return fx ? (d) => applyBlipFx(d, fx, theme) : null;
      }, (id) => {
        const [k, v] = id.split(":");
        if (k === "sat") void ed.setImageAdjust({ saturation: Number(v) / 1e5 }).then(() => ctx.after());
        else if (k === "temp") void ed.setImageAdjust({ temperature: Number(v) }).then(() => ctx.after());
        else ed.setImageRecolor(v);
      }, sel4, 7)
    },
    "-",
    {
      id: "pic:color:more",
      label: L3("More Variations", "Mais Varia\xE7\xF5es"),
      icon: "palette",
      submenu: () => [{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme.colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            ed.setImageRecolor(dmlFromPick(v, theme.colors));
            ctx.after();
          }
        })
      }]
    },
    "pic:transparentColor",
    { id: "pic:color:options", label: L3("Picture Color Options\u2026", "Op\xE7\xF5es de Cor da Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }
  ];
}
function transparencyMenu(env, ctx) {
  const ed = env.ed;
  const theme = docTheme(env);
  const sel4 = `t:${Math.round(100 - (ed.selectedImage()?.format.blip.alphaModFix ?? 1e5) / 1e3)}`;
  return [{
    content: grid(env, ctx, [
      { items: TRANSPARENCY_PRESETS.map((v) => ({ id: `t:${v}`, label: L3(`Transparency: ${v}%`, `Transpar\xEAncia: ${v}%`) })) }
    ], (id) => (d) => applyBlipFx(d, { alphaModFix: (100 - Number(id.slice(2))) * 1e3 }, theme), (id) => ed.setImageTransparency(Number(id.slice(2))), sel4, 7)
  }, "-", { id: "pic:transparency:options", label: L3("Picture Transparency Options\u2026", "Op\xE7\xF5es de Transpar\xEAncia da Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }];
}
function adjustCells(env, ctx) {
  const api = env.ed;
  const has = (m) => () => typeof api[m] === "function";
  const editable = () => !env.ed.isProtected();
  return [
    { menu: () => correctionsMenu(env, ctx), id: "pic:corrections", label: L3("Corrections", "Corre\xE7\xF5es"), icon: "tune", size: "large", supports: has("setImageAdjust"), isEnabled: editable },
    { menu: () => colorMenu(env, ctx), id: "pic:color", label: L3("Color", "Cor"), icon: "palette", size: "large", supports: has("setImageRecolor"), isEnabled: editable },
    { menu: () => transparencyMenu(env, ctx), id: "pic:transparency", label: L3("Transparency", "Transpar\xEAncia"), icon: "opacity", size: "large", supports: has("setImageTransparency"), isEnabled: editable },
    { rows: [
      [{ cmd: "pic:compress", label: true }],
      [{ menu: ["pic:change:file", "pic:change:clip"], id: "pic:change", label: L3("Change Picture", "Alterar Imagem"), icon: "swap_horiz", showLabel: true, supports: has("changeImage"), isEnabled: editable }],
      [{ split: "pic:reset", menu: ["pic:reset", "pic:resetSize"], label: true }]
    ] }
  ];
}

// src/chrome-picture.ts
var L4 = (en, pt) => ({ en, pt });
var WRAPS = [
  ["inline", "In Line with Text", "Alinhado ao Texto", "format_align_left"],
  ["square", "Square", "Quadrado", "wrap_text"],
  ["tight", "Tight", "Comprimido", "wrap_text"],
  ["through", "Through", "Atrav\xE9s", "wrap_text"],
  ["topAndBottom", "Top and Bottom", "Superior e Inferior", "vertical_align_center"],
  ["behind", "Behind Text", "Atr\xE1s do Texto", "flip_to_back"],
  ["front", "In Front of Text", "Na Frente do Texto", "flip_to_front"]
];
function positionIcon(v, h) {
  const x = h === "left" ? 240 : h === "center" ? 400 : 560, y = v === "top" ? -760 : v === "center" ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x} ${y}h160v120H${x}z"/>`;
}
function registerPictureCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const pic = () => typeof api["selectedImage"] === "function" ? ed.selectedImage() : null;
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const on = () => canEdit3() && !!pic();
  const floating = () => on() && !pic().inline;
  const p = (c) => ({ ...c, isEnabled: c.isEnabled ? () => on() && c.isEnabled() : on });
  const cmds = [
    // ── Organizar: Quebra de Texto Automática ──
    ...WRAPS.map(([k, en, pt, icon]) => p({
      id: `pic:wrap:${k}`,
      label: L4(en, pt),
      icon,
      supports: has("setImageWrap"),
      run: () => ed.setImageWrap(k),
      isChecked: () => pic()?.wrap === k
    })),
    p({
      id: "pic:wrap:editPoints",
      label: L4("Edit Wrap Points", "Editar pontos da disposi\xE7\xE3o do texto"),
      icon: "polyline",
      supports: has("startEditWrapPoints"),
      isEnabled: floating,
      isChecked: () => typeof api["editingWrapPoints"] === "function" && ed.editingWrapPoints(),
      run: () => ed.editingWrapPoints() ? ed.endEditWrapPoints() : ed.startEditWrapPoints()
    }),
    p({
      id: "pic:wrap:moveWithText",
      label: L4("Move with Text", "Mover com o Texto"),
      supports: has("setImageMoveWithText"),
      isEnabled: floating,
      run: () => ed.setImageMoveWithText(true),
      isChecked: () => !!pic()?.moveWithText
    }),
    p({
      id: "pic:wrap:fixOnPage",
      label: L4("Fix Position on Page", "Corrigir Posi\xE7\xE3o na P\xE1gina"),
      supports: has("setImageMoveWithText"),
      isEnabled: floating,
      run: () => ed.setImageMoveWithText(false),
      isChecked: () => !!pic() && !pic().inline && !pic().moveWithText
    }),
    p({ id: "pic:wrap:more", label: L4("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:wrap") }),
    // ── Organizar: Posição ──
    p({
      id: "pic:pos:inline",
      label: L4("In Line with Text", "Alinhado ao Texto"),
      icon: "format_align_left",
      supports: has("setImagePosition"),
      run: () => ed.setImagePosition("inline"),
      isChecked: () => !!pic()?.inline
    }),
    ...POSITION_PRESETS.map((q) => p({
      id: `pic:pos:${q.id}`,
      label: q.label,
      icon: positionIcon(q.v, q.h),
      supports: has("setImagePosition"),
      run: () => ed.setImagePosition(q.id),
      isChecked: () => {
        const f = pic()?.format;
        const map = { top: "top", center: "center", bottom: "bottom" };
        return !!f && f.wrap === "square" && f.posH?.relativeFrom === "margin" && f.posH.align === q.h && f.posV?.relativeFrom === "margin" && f.posV.align === map[q.v];
      }
    })),
    p({ id: "pic:pos:more", label: L4("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:position") }),
    // ── Organizar: Avançar / Recuar ──
    p({ id: "pic:forward", label: L4("Bring Forward", "Avan\xE7ar"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("forward") }),
    p({ id: "pic:front", label: L4("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("front") }),
    p({ id: "pic:frontOfText", label: L4("Bring in Front of Text", "Trazer para a Frente do Texto"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("frontOfText") }),
    p({ id: "pic:backward", label: L4("Send Backward", "Recuar"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("backward") }),
    p({ id: "pic:back", label: L4("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("back") }),
    p({ id: "pic:behindText", label: L4("Send Behind Text", "Enviar para Tr\xE1s do Texto"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("behindText") }),
    // ── Organizar: Girar ──
    p({ id: "pic:rotate:right", label: L4("Rotate Right 90\xB0", "Girar 90\xB0 para a Direita"), icon: "rotate_right", supports: has("rotateImage"), run: () => ed.rotateImage(90) }),
    p({ id: "pic:rotate:left", label: L4("Rotate Left 90\xB0", "Girar 90\xB0 para a Esquerda"), icon: "rotate_left", supports: has("rotateImage"), run: () => ed.rotateImage(-90) }),
    p({ id: "pic:flip:v", label: L4("Flip Vertical", "Inverter Verticalmente"), icon: "flip", supports: has("flipImage"), run: () => ed.flipImage("v") }),
    p({ id: "pic:flip:h", label: L4("Flip Horizontal", "Inverter Horizontalmente"), icon: "flip", supports: has("flipImage"), run: () => ed.flipImage("h") }),
    p({ id: "pic:rotate:more", label: L4("More Rotation Options\u2026", "Mais Op\xE7\xF5es de Rota\xE7\xE3o..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Tamanho: Cortar ──
    p({
      id: "pic:crop:mode",
      label: L4("Crop", "Cortar"),
      tip: L4("Crop: drag the black handles to remove unwanted areas", "Cortar: arraste as al\xE7as pretas para remover as \xE1reas indesejadas"),
      icon: "crop",
      supports: has("startImageCrop"),
      isChecked: () => typeof api["croppingImage"] === "function" && ed.croppingImage(),
      run: () => ed.croppingImage() ? ed.endImageCrop() : ed.startImageCrop()
    }),
    p({ id: "pic:crop:fill", label: L4("Fill", "Preencher"), icon: "fit_screen", supports: has("cropImageFillFit"), run: () => ed.cropImageFillFit("fill") }),
    p({ id: "pic:crop:fit", label: L4("Fit", "Ajustar"), icon: "crop_free", supports: has("cropImageFillFit"), run: () => ed.cropImageFillFit("fit") }),
    ...ASPECT_RATIOS.map((r) => p({ id: `pic:crop:ratio:${r.id}`, label: r.id, supports: has("cropImageToAspect"), run: () => ed.cropImageToAspect(r.w, r.h) })),
    p({ id: "pic:layout", label: L4("Layout Options\u2026", "Layout..."), icon: "aspect_ratio", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Organizar: Painel de Seleção e Alinhar ──
    { id: "pic:selectionPane", label: L4("Selection Pane", "Painel de Sele\xE7\xE3o"), icon: "select", supports: has("selectionPaneItems"), isEnabled: () => !app.comparing, isChecked: () => ctl.pictureDialogOpen("selection"), run: () => ctl.pictureDialog("selection") },
    ...ALIGNS.map(([k, en, pt, icon]) => p({ id: `pic:align:${k}`, label: L4(en, pt), icon, supports: has("alignImage"), isEnabled: floating, run: () => ed.alignImage(k) })),
    ...["page", "margin"].map((k) => ({
      id: `pic:align:to:${k}`,
      label: k === "page" ? L4("Align to Page", "Alinhar \xE0 P\xE1gina") : L4("Align to Margin", "Alinhar \xE0 Margem"),
      supports: has("alignImage"),
      isChecked: () => ed.imageAlignTo === k,
      run: () => {
        ed.imageAlignTo = k;
      }
    })),
    // ── Formatar Imagem (painel) ──
    { id: "pic:format", label: L4("Format Picture\u2026", "Formatar Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:line") },
    ...["line", "effects", "layout", "picture"].map((t2) => ({ id: `pic:format:${t2}`, label: L4("Format Picture\u2026", "Formatar Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog(`format:${t2}`) })),
    { id: "pic:fx:options", label: L4("Effect Options\u2026", "Op\xE7\xF5es de Efeitos..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:effects") },
    { id: "pic:adjust:options", label: L4("Picture Options\u2026", "Op\xE7\xF5es de Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:picture") },
    // ── Acessibilidade ──
    p({ id: "pic:alt", label: L4("Alt Text", "Texto Alt"), tip: L4("Alt Text: describe the picture for people who use screen readers", "Texto Alt: descreva a imagem para quem usa leitor de tela"), icon: "accessibility_new", supports: has("setImageAltText"), run: () => ctl.pictureDialog("alt") })
  ];
  reg.add(...cmds);
}
var ALIGNS = [
  ["left", "Align Left", "Alinhar \xE0 Esquerda", "align_horizontal_left"],
  ["center", "Align Center", "Centralizar", "align_horizontal_center"],
  ["right", "Align Right", "Alinhar \xE0 Direita", "align_horizontal_right"],
  ["top", "Align Top", "Alinhar Acima", "align_vertical_top"],
  ["middle", "Align Middle", "Alinhar ao Meio", "align_vertical_center"],
  ["bottom", "Align Bottom", "Alinhar Parte Inferior", "align_vertical_bottom"]
];
var alignMenu = () => [...ALIGNS.slice(0, 3).map(([k]) => `pic:align:${k}`), "-", ...ALIGNS.slice(3).map(([k]) => `pic:align:${k}`), "-", "shp:distribute:h", "shp:distribute:v", "-", "pic:align:to:page", "pic:align:to:margin"];
var wrapMenu = () => [
  ...WRAPS.map(([k]) => `pic:wrap:${k}`),
  "-",
  "pic:wrap:editPoints",
  "pic:wrap:moveWithText",
  "pic:wrap:fixOnPage",
  "-",
  "pic:wrap:more"
];
var positionMenu = () => [
  "pic:pos:inline",
  "-",
  ...POSITION_PRESETS.map((q) => `pic:pos:${q.id}`),
  "-",
  "pic:pos:more"
];
var rotateMenu = () => ["pic:rotate:right", "pic:rotate:left", "pic:flip:v", "pic:flip:h", "-", "pic:rotate:more"];
function shapeThumb(tile, prst) {
  const W = 26, H = 22, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext("2d");
  x.scale(dpr, dpr);
  x.translate(1.5, 1.5);
  const o = presetOutline(prst, W - 3, H - 3);
  o.subs.forEach((sub, i) => {
    const p = new Path2D();
    for (const g of sub) {
      if (g.c === "M") p.moveTo(g.x, g.y);
      else if (g.c === "L") p.lineTo(g.x, g.y);
      else if (g.c === "C") p.bezierCurveTo(g.x1, g.y1, g.x2, g.y2, g.x, g.y);
      else if (g.c === "Q") p.quadraticCurveTo(g.x1, g.y1, g.x, g.y);
      else if (g.c === "E") p.ellipse(g.cx, g.cy, Math.abs(g.rx), Math.abs(g.ry), 0, g.a0, g.a1, g.ccw);
      else p.closePath();
    }
    if (o.fill[i]) {
      x.fillStyle = "rgba(68,114,196,.25)";
      x.fill(p);
    }
    if (o.stroke[i]) {
      x.lineWidth = 1;
      x.strokeStyle = getComputedStyle(tile).color || "#444";
      x.stroke(p);
    }
  });
  tile.replaceChildren(c);
}
var cropMenu = (env, ctx) => () => [
  "pic:crop:mode",
  {
    id: "pic:crop:shape",
    label: L4("Crop to Shape", "Cortar para Forma"),
    icon: "shapes",
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g) => ({ label: g.label, items: g.shapes.map(([prst, en, pt]) => ({ id: prst, label: L4(en, pt) })) })),
        tile: { w: 30, h: 26 },
        cols: 10,
        close,
        text: (l) => ctx.registry.text(l),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => {
          env.ed.cropImageToShape(id);
          ctx.after();
        }
      })
    }]
  },
  { id: "pic:crop:ratio", label: L4("Aspect Ratio", "Taxa de Propor\xE7\xE3o"), icon: "aspect_ratio", submenu: () => ASPECT_RATIOS.map((r) => `pic:crop:ratio:${r.id}`) },
  "-",
  "pic:crop:fill",
  "pic:crop:fit"
];
var measureWidget2 = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L4("Shape Height", "Altura da Forma") : L4("Shape Width", "Largura da Forma"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L4(".", ","));
    const cm = (pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const ptOf3 = (s) => {
      const n = parseFloat(s.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n / 2.54 * 72 : void 0;
    };
    const cur = () => {
      const s = env.ed.selectedImage();
      return s ? which === "height" ? s.heightPt : s.widthPt : 0;
    };
    const set = (v) => {
      env.ed.setImageSize(which === "height" ? { heightPt: Math.max(0.1, v) } : { widthPt: Math.max(0.1, v) });
      ctx.after();
    };
    const apply = () => {
      const v = ptOf3(input.value);
      if (v !== void 0) set(v);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    });
    const step = (d) => set(cur() + d * (72 / 25.4));
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b, d, s] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b.type = "button";
      b.className = "uo-btn";
      b.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b.innerHTML = symbol(s);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => step(d));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof env.ed.selectedImage === "function",
      sync: () => {
        const s = env.ed.selectedImage();
        const off = !s || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(which === "height" ? s.heightPt : s.widthPt) : "";
      }
    };
  }
});
var large = (cmd) => ({ cmd, size: "large" });
function pictureFormatGroups(env, ctx) {
  const has = (m) => () => typeof env.ed[m] === "function";
  return [
    { id: "pic-adjust", label: L4("Adjust", "Ajustar"), icon: "tune", prio: 4, cells: adjustCells(env, ctx) },
    { id: "pic-styles", label: L4("Picture Styles", "Estilos de Imagem"), icon: "photo_frame", prio: 5, launcher: "pic:format:effects", cells: [
      { rows: [
        [{ menu: () => borderMenu(env, ctx), id: "pic:border", label: L4("Picture Border", "Borda da Imagem"), icon: "border_color", showLabel: true, supports: has("setImageBorder") }],
        [{ menu: () => effectsMenu(env, ctx), id: "pic:effects", label: L4("Picture Effects", "Efeitos de Imagem"), icon: "auto_awesome", showLabel: true, supports: has("setImageEffect") }]
      ] }
    ] },
    { id: "pic-access", label: L4("Accessibility", "Acessibilidade"), icon: "accessibility_new", prio: 4, cells: [large("pic:alt")] },
    { id: "pic-arrange", label: L4("Arrange", "Organizar"), icon: "layers", prio: 6, cells: [
      { menu: positionMenu, id: "pic:position", label: L4("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", size: "large", supports: has("setImagePosition") },
      { menu: wrapMenu, id: "pic:wrap", label: L4("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", size: "large", supports: has("setImageWrap") },
      { rows: [
        [{ split: "pic:forward", menu: ["pic:forward", "pic:front", "pic:frontOfText"], label: true }],
        [{ split: "pic:backward", menu: ["pic:backward", "pic:back", "pic:behindText"], label: true }]
      ] },
      { rows: [
        [{ cmd: "pic:selectionPane", label: true }],
        [{ menu: alignMenu, id: "pic:align", label: L4("Align", "Alinhar"), icon: "align_horizontal_left", showLabel: true, supports: has("alignImage") }],
        [{ menu: rotateMenu, id: "pic:rotate", label: L4("Rotate", "Girar"), icon: "rotate_90_degrees_cw", showLabel: true, supports: has("rotateImage") }]
      ] }
    ] },
    { id: "pic-size", label: L4("Size", "Tamanho"), icon: "aspect_ratio", prio: 5, launcher: "pic:layout", cells: [
      { split: "pic:crop:mode", menu: cropMenu(env, ctx), size: "large" },
      { rows: [[measureWidget2(env, "height")], [measureWidget2(env, "width")]] }
    ] }
  ];
}
function adjustSubmenus(env, ctx) {
  return [
    { id: "pic:sub:corrections", label: L4("Corrections", "Corre\xE7\xF5es"), icon: "tune", submenu: () => correctionsMenu(env, ctx) },
    { id: "pic:sub:color", label: L4("Color", "Cor"), icon: "palette", submenu: () => colorMenu(env, ctx) },
    { id: "pic:sub:transparency", label: L4("Transparency", "Transpar\xEAncia"), icon: "opacity", submenu: () => transparencyMenu(env, ctx) },
    "-",
    "pic:compress",
    changeSubmenu,
    "pic:reset",
    "pic:resetSize"
  ];
}
var changeSubmenu = { id: "pic:sub:change", label: L4("Change Picture", "Alterar Imagem"), icon: "swap_horiz", submenu: ["pic:change:file", "pic:change:clip"] };
function styleSubmenus(env, ctx) {
  return [
    { id: "pic:sub:border", label: L4("Picture Border", "Borda da Imagem"), icon: "border_color", submenu: () => borderMenu(env, ctx) },
    { id: "pic:sub:effects", label: L4("Picture Effects", "Efeitos de Imagem"), icon: "auto_awesome", submenu: () => effectsMenu(env, ctx) }
  ];
}
function pictureCompactGroup(env, ctx) {
  const sel4 = () => typeof env.ed.selectedImage === "function" && !!env.ed.selectedImage();
  return {
    id: "picture",
    label: L4("Picture", "Imagem"),
    icon: "image",
    prio: 7,
    items: [
      { menu: wrapMenu, id: "pic:wrap", label: L4("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", supports: sel4 },
      { menu: positionMenu, id: "pic:position", label: L4("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", supports: sel4 },
      { menu: rotateMenu, id: "pic:rotate", label: L4("Rotate", "Girar"), icon: "rotate_90_degrees_cw", supports: sel4 },
      { menu: cropMenu(env, ctx), id: "pic:crop", label: L4("Crop", "Cortar"), icon: "crop", supports: sel4 },
      { menu: () => adjustSubmenus(env, ctx), id: "pic:adjust", label: L4("Adjust", "Ajustar"), icon: "tune", supports: sel4 },
      { menu: () => styleSubmenus(env, ctx), id: "pic:styles", label: L4("Picture Styles", "Estilos de Imagem"), icon: "photo_frame", supports: sel4 },
      { menu: () => ["pic:forward", "pic:front", "pic:frontOfText", "-", "pic:backward", "pic:back", "pic:behindText"], id: "pic:order", label: L4("Arrange", "Organizar"), icon: "layers", supports: sel4 },
      { cmd: "pic:alt" },
      { cmd: "pic:layout" }
    ]
  };
}
function pictureMenu(env, ctx) {
  return {
    id: "pic:menu",
    label: L4("Picture", "Imagem"),
    icon: "image",
    submenu: () => [
      { id: "pic:wrapSub", label: L4("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: wrapMenu },
      { id: "pic:posSub", label: L4("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", submenu: positionMenu },
      { id: "pic:rotSub", label: L4("Rotate", "Girar"), icon: "rotate_90_degrees_cw", submenu: rotateMenu },
      { id: "pic:cropSub", label: L4("Crop", "Cortar"), icon: "crop", submenu: cropMenu(env, ctx) },
      "-",
      ...adjustSubmenus(env, ctx),
      "-",
      ...styleSubmenus(env, ctx),
      "-",
      "pic:alt",
      "pic:layout",
      "-",
      "image:delete"
    ]
  };
}
function pictureContextItems() {
  return [
    "cut",
    "copy",
    "paste",
    "-",
    { id: "pic:ctx:front", label: L4("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", submenu: ["pic:front", "pic:forward", "pic:frontOfText"] },
    { id: "pic:ctx:back", label: L4("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", submenu: ["pic:back", "pic:backward", "pic:behindText"] },
    "-",
    changeSubmenu,
    "link",
    "caption",
    { id: "pic:ctx:wrap", label: L4("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: wrapMenu },
    "pic:alt",
    "pic:layout",
    "pic:format",
    "-",
    "image:delete"
  ];
}
function dmlFromPick(value, colors) {
  const p = parseThemePick(value, colors);
  if (!p) return { kind: "srgbClr", val: value.toUpperCase() };
  const SCHEME = { background1: "bg1", text1: "tx1", background2: "bg2", text2: "tx2" };
  const val = SCHEME[p.themeColor] ?? p.themeColor;
  const snap = (x) => Math.round(x * 20) / 20;
  const mods = [];
  if (p.tint) {
    const k = snap(1 - parseInt(p.tint, 16) / 255);
    mods.push(["lumMod", Math.round((1 - k) * 1e5)], ["lumOff", Math.round(k * 1e5)]);
  }
  if (p.shade) {
    const k = snap(1 - parseInt(p.shade, 16) / 255);
    mods.push(["lumMod", Math.round((1 - k) * 1e5)]);
  }
  return { kind: "schemeClr", val, ...mods.length ? { mods } : {} };
}
var SAMPLE = /* @__PURE__ */ new Map();
function sampleBitmap(hex) {
  let c = SAMPLE.get(hex);
  if (!c) {
    c = document.createElement("canvas");
    c.width = 32;
    c.height = 24;
    const x = c.getContext("2d");
    x.fillStyle = `#${hex}`;
    x.fillRect(0, 0, 32, 24);
    SAMPLE.set(hex, c);
  }
  return c;
}
var THUMB_IMG = { data: new Uint8Array(0), ext: "png", widthTwips: 0, heightTwips: 0 };
function effectThumb(tile, look, base) {
  const W = 56, H = 48;
  const c = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, c.width, c.height);
  x.scale(dpr * 96 / 1440, dpr * 96 / 1440);
  const w = 30 * 20, h = 22 * 20;
  const it = { t: "image", x: (W * 15 - w) / 2, y: (H * 15 - h) / 2 - (look?.reflection ? 120 : 0), w, h, image: THUMB_IMG, ...look ? { pic: look } : {} };
  if (look) paintPicture(x, it, sampleBitmap(base));
  else x.drawImage(sampleBitmap(base), it.x, it.y, it.w, it.h);
  tile.replaceChildren(c);
}
var accentOf = (env, n = 1) => (env.ed.documentThemeColors()[`accent${n}`] ?? "4472C4").toUpperCase();
function borderMenu(env, ctx) {
  const ed = env.ed;
  const st = () => ed.selectedImage();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            ed.setImageBorder({ color: dmlFromPick(v, colors) });
            ctx.after();
          }
        });
      }
    },
    { id: "pic:border:none", label: L4("No Outline", "Sem Contorno"), icon: "border_clear", checked: !st()?.format.line?.fill, onClick: () => {
      ed.setImageBorder({ color: null });
      ctx.after();
    } },
    {
      id: "pic:border:more",
      label: L4("More Outline Colors\u2026", "Mais Cores de Contorno..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setImageBorder({ color: { kind: "srgbClr", val: inp.value.slice(1).toUpperCase() } });
          ctx.after();
        });
        inp.click();
      }
    },
    "-",
    {
      id: "pic:border:weight",
      label: L4("Weight", "Espessura"),
      icon: "line_weight",
      submenu: () => LINE_WEIGHTS_PT.map((w) => ({
        id: `pic:border:w:${w}`,
        label: `${String(w).replace(".", ctx.registry.text(L4(".", ",")))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st().format.line.w ?? 9525) / 12700 - w) < 0.01,
        onClick: () => {
          ed.setImageBorder({ weightPt: w });
          ctx.after();
        }
      }))
    },
    {
      id: "pic:border:dash",
      label: L4("Dashes", "Tracejados"),
      icon: "line_style",
      submenu: () => LINE_DASHES.map((d) => ({
        id: `pic:border:d:${d.val}`,
        label: d.label,
        checked: (st()?.format.line?.dash ?? "solid") === d.val,
        onClick: () => {
          ed.setImageBorder({ dash: d.val });
          ctx.after();
        }
      }))
    }
  ];
}
function effectsMenu(env, ctx, shape = false) {
  const ed = env.ed;
  const setFx = (kind, preset) => shape ? ed.setShapeEffect(kind, preset) : ed.setImageEffect(kind, preset);
  const t2 = (l) => ctx.registry.text(l);
  const base = accentOf(env);
  const fx = () => shape ? ed.selectedShape()?.format.effects : ed.selectedImage()?.format.effects;
  const grid2 = (sections, look, pick, selected, cols) => (close) => tileGrid({
    sections,
    tile: { w: 64, h: 56 },
    cols,
    text: t2,
    close,
    ...selected ? { selected } : {},
    render: (tile, it) => effectThumb(tile, look(it.id), base),
    onPick: (id) => {
      pick(id);
      ctx.after();
    }
  });
  const shadowLook = (id) => {
    const p = SHADOW_PRESETS.find((x) => x.id === id);
    if (!p) return null;
    const s = p.shadow, al = (s.color.mods?.find((m) => m[0] === "alpha")?.[1] ?? 1e5) / 1e5;
    return {
      shadow: {
        kind: s.kind === "inner" ? "inner" : "outer",
        color: "000000",
        alpha: al,
        blurPt: (s.blurRad ?? 0) / 12700,
        distPt: (s.dist ?? 0) / 12700,
        dirDeg: (s.dir ?? 0) / 6e4,
        ...s.sx !== void 0 ? { sx: s.sx / 1e5 } : {},
        ...s.sy !== void 0 ? { sy: s.sy / 1e5 } : {},
        ...s.kx ? { kxDeg: s.kx / 6e4 } : {},
        ...s.algn ? { algn: s.algn } : {}
      }
    };
  };
  const none = (en, pt) => ({ id: "none", label: L4(en, pt) });
  const curShadow = () => {
    const s = fx()?.shadow;
    return s ? SHADOW_PRESETS.find((p) => JSON.stringify(p.shadow) === JSON.stringify(s))?.id : "none";
  };
  const curRefl = () => {
    const r = fx()?.reflection;
    return r ? REFLECTION_PRESETS.find((p) => JSON.stringify(p.reflection) === JSON.stringify(r))?.id : "none";
  };
  const items = [
    {
      id: "pic:fx:shadow",
      label: L4("Shadow", "Sombra"),
      icon: "filter_none",
      submenu: () => [{
        content: grid2([
          { label: L4("No Shadow", "Sem Sombra"), items: [none("No Shadow", "Sem Sombra")] },
          { label: L4("Outer", "Externa"), items: SHADOW_PRESETS.filter((p) => p.group === "outer").map((p) => ({ id: p.id, label: p.label })) },
          { label: L4("Inner", "Interna"), items: SHADOW_PRESETS.filter((p) => p.group === "inner").map((p) => ({ id: p.id, label: p.label })) },
          { label: L4("Perspective", "Perspectiva"), items: SHADOW_PRESETS.filter((p) => p.group === "persp").map((p) => ({ id: p.id, label: p.label })) }
        ], shadowLook, (id) => setFx("shadow", id === "none" ? null : id), curShadow(), 3)
      }]
    },
    {
      id: "pic:fx:reflection",
      label: L4("Reflection", "Reflexo"),
      icon: "flip",
      submenu: () => [{
        content: grid2([
          { label: L4("No Reflection", "Sem Reflexo"), items: [none("No Reflection", "Sem Reflexo")] },
          { label: L4("Reflection Variations", "Varia\xE7\xF5es de Reflexo"), items: REFLECTION_PRESETS.map((p) => ({ id: p.id, label: p.label })) }
        ], (id) => {
          const p = REFLECTION_PRESETS.find((x) => x.id === id);
          if (!p) return null;
          const r = p.reflection;
          return { reflection: { blurPt: (r.blurRad ?? 0) / 12700, stA: (r.stA ?? 1e5) / 1e5, stPos: 0, endA: (r.endA ?? 0) / 1e5, endPos: (r.endPos ?? 1e5) / 1e5, distPt: (r.dist ?? 0) / 12700, dirDeg: 90, sy: -1 } };
        }, (id) => setFx("reflection", id === "none" ? null : id), curRefl(), 3)
      }]
    },
    {
      id: "pic:fx:glow",
      label: L4("Glow", "Brilho"),
      icon: "light",
      submenu: () => [{
        content: grid2([
          { label: L4("No Glow", "Sem Brilho"), items: [none("No Glow", "Sem Brilho")] },
          {
            label: L4("Glow Variations", "Varia\xE7\xF5es de Brilho"),
            items: GLOW_SIZES.flatMap((rad, si) => [1, 2, 3, 4, 5, 6].map((a) => ({
              id: `glow-${si}-${a}`,
              label: L4(`Glow: ${rad / 12700} point; Accent color ${a}`, `Brilho: ${String(rad / 12700).replace(".", ",")} pt; Cor de \xEAnfase ${a}`)
            })))
          }
        ], (id) => {
          const m = /^glow-(\d+)-(\d)$/.exec(id);
          return m ? { glow: { color: accentOf(env, Number(m[2])), alpha: 0.4, radPt: GLOW_SIZES[Number(m[1])] / 12700 / 1.6 } } : null;
        }, (id) => setFx("glow", id === "none" ? null : id), void 0, 6)
      }]
    },
    {
      id: "pic:fx:soft",
      label: L4("Soft Edges", "Bordas Suaves"),
      icon: "crop_free",
      submenu: () => [{
        content: grid2([
          { label: L4("No Soft Edges", "Sem Bordas Suaves"), items: [none("No Soft Edges", "Sem Bordas Suaves")] },
          { label: L4("Soft Edge Variations", "Varia\xE7\xF5es de Bordas Suaves"), items: SOFT_EDGE_PRESETS.map((v) => ({ id: String(v), label: L4(`${v / 12700} Point`, `${String(v / 12700).replace(".", ",")} Ponto`) })) }
        ], (id) => id === "none" ? null : { softEdgePt: Number(id) / 12700 / 2.5 }, (id) => setFx("softEdge", id === "none" ? null : id), fx()?.softEdge ? String(fx().softEdge) : "none", 3)
      }]
    },
    {
      id: "pic:fx:bevel",
      label: L4("Bevel", "Bisel"),
      icon: "crop_square",
      submenu: () => [{
        content: grid2([
          { label: L4("No Bevel", "Sem Bisel"), items: [none("No Bevel", "Sem Bisel")] },
          { label: L4("Bevel", "Bisel"), items: BEVEL_PRESETS.map((p) => ({ id: p.prst, label: p.label })) }
        ], () => null, (id) => setFx("bevel", id === "none" ? null : id), void 0, 4)
      }]
    },
    {
      id: "pic:fx:rot3d",
      label: L4("3-D Rotation", "Rota\xE7\xE3o 3D"),
      icon: "view_in_ar",
      submenu: () => [{
        content: grid2([
          { label: L4("No Rotation", "Sem Rota\xE7\xE3o"), items: [none("No Rotation", "Sem Rota\xE7\xE3o")] },
          { label: L4("Parallel", "Paralelo"), items: ROTATION_PRESETS.filter((p) => p.group === "parallel").map((p) => ({ id: p.prst, label: p.label })) },
          { label: L4("Perspective", "Perspectiva"), items: ROTATION_PRESETS.filter((p) => p.group === "perspective").map((p) => ({ id: p.prst, label: p.label })) },
          { label: L4("Oblique", "Obl\xEDqua"), items: ROTATION_PRESETS.filter((p) => p.group === "oblique").map((p) => ({ id: p.prst, label: p.label })) }
        ], () => null, (id) => setFx("rotation", id === "none" ? null : id), void 0, 4)
      }]
    }
  ];
  const OPT = {
    "pic:fx:shadow": ["Shadow Options\u2026", "Op\xE7\xF5es de Sombra..."],
    "pic:fx:reflection": ["Reflection Options\u2026", "Op\xE7\xF5es de Reflexo..."],
    "pic:fx:glow": ["Glow Options\u2026", "Op\xE7\xF5es de Brilho..."],
    "pic:fx:soft": ["Soft Edges Options\u2026", "Op\xE7\xF5es de Bordas Suaves..."],
    "pic:fx:bevel": ["3-D Options\u2026", "Op\xE7\xF5es 3D..."],
    "pic:fx:rot3d": ["3-D Rotation Options\u2026", "Op\xE7\xF5es de Rota\xE7\xE3o 3D..."]
  };
  return items.map((it) => {
    const o = it.id ? OPT[it.id] : void 0;
    const sub = it.submenu;
    if (!o || typeof sub !== "function") return it;
    return { ...it, submenu: () => [...sub(), "-", { id: `${it.id}:options`, label: L4(o[0], o[1]), icon: "tune", onClick: () => env.ctl.pictureDialog("format:effects") }] };
  });
}

// src/chrome-page.ts
var L5 = (en, pt) => ({ en, pt });
var tr3 = (lang, en, pt) => pickLabels(lang, { en, pt });
function registerPageCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const edit = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  reg.add(
    edit({ id: "page:noColor", label: L5("No Color", "Sem Cor"), icon: "format_color_reset", supports: has("setPageColor"), run: () => ed.setPageColor(null) }),
    edit({ id: "dlg:pageFill", label: L5("Fill Effects\u2026", "Efeitos de Preenchimento\u2026"), icon: "gradient", supports: has("setPageFill"), run: () => ctl.pageBgDialog("fill") }),
    edit({ id: "dlg:watermark", label: L5("Custom Watermark\u2026", "Personalizar Marca-d'\xC1gua\u2026"), icon: "branding_watermark", supports: has("setWatermark"), run: () => ctl.pageBgDialog("watermark") }),
    edit({ id: "watermark:remove", label: L5("Remove Watermark", "Remover Marca-d'\xC1gua"), icon: "delete", supports: has("removeWatermark"), isEnabled: () => !!ed.watermark(), run: () => ed.removeWatermark() }),
    edit({ id: "cover:remove", label: L5("Remove Current Cover Page", "Remover Folha de Rosto Atual"), icon: "delete", supports: has("removeCoverPage"), isEnabled: () => ed.hasCoverPage(), run: () => {
      ed.removeCoverPage();
    } }),
    edit({ id: "blankPage", label: L5("Blank Page", "P\xE1gina em Branco"), tip: L5("Insert a new blank page at the cursor", "Insere uma p\xE1gina em branco no cursor"), icon: "note_add", supports: has("insertBlankPage"), run: () => ed.insertBlankPage() })
  );
}
var cap = (ctx, en, pt) => {
  const d = document.createElement("div");
  d.textContent = ctx.registry.text(L5(en, pt));
  d.style.cssText = "font-size:12px;opacity:.8;margin:6px 0 4px";
  return d;
};
function pageColorMenu(env, ctx) {
  const more = {
    id: "page:moreColors",
    icon: "palette",
    label: L5("More Colors\u2026", "Mais Cores\u2026"),
    onClick: () => {
      const input = document.createElement("input");
      input.type = "color";
      const cur = env.ed.pageBackground()?.color;
      if (cur) input.value = `#${cur.toLowerCase()}`;
      input.style.cssText = "position:fixed;left:-100px;top:0;opacity:0";
      ctx.layer.appendChild(input);
      input.addEventListener("change", () => {
        env.ed.setPageColor(input.value.slice(1).toUpperCase());
        input.remove();
        ctx.after();
      });
      input.addEventListener("blur", () => setTimeout(() => input.remove(), 1e3));
      input.click();
    }
  };
  return [{
    content: (close) => {
      const colors = env.ed.documentThemeColors();
      const box = document.createElement("div");
      box.className = "uw-page-color";
      const theme = colorGrid({
        colors: themePaletteColors(colors),
        columns: 10,
        close,
        onPick: (v) => {
          const p = parseThemePick(v, colors);
          if (!p) return;
          const frac = (h) => h ? Math.round((1 - parseInt(h, 16) / 255) * 1e3) / 1e3 : void 0;
          const tint = frac(p.tint), shade = frac(p.shade);
          env.ed.setPageColor({ themeColor: p.themeColor, ...tint !== void 0 ? { tint } : {}, ...shade !== void 0 ? { shade } : {} });
          ctx.after();
        }
      });
      const std = colorGrid({
        colors: STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` })),
        columns: 10,
        close,
        onPick: (h) => {
          env.ed.setPageColor(h);
          ctx.after();
        }
      });
      box.append(cap(ctx, "Theme Colors", "Cores do Tema"), theme, cap(ctx, "Standard Colors", "Cores Padr\xE3o"), std);
      return box;
    }
  }, "-", "page:noColor", more, "dlg:pageFill"];
}
function watermarkMenu(env, ctx) {
  return [{
    content: (close) => {
      const box = document.createElement("div");
      box.className = "uw-wm-gallery";
      box.style.cssText = "padding:4px 6px;max-height:440px;overflow:auto";
      let cat = "";
      let grid2 = null;
      for (const g of env.ed.watermarkGallery()) {
        if (g.categoryLabel !== cat) {
          cat = g.categoryLabel;
          const h = document.createElement("div");
          h.textContent = cat;
          h.style.cssText = "font-size:12px;font-weight:600;opacity:.8;margin:8px 0 4px";
          grid2 = document.createElement("div");
          grid2.style.cssText = "display:grid;grid-template-columns:repeat(4, 88px);gap:6px";
          box.append(h, grid2);
        }
        const b = document.createElement("button");
        b.type = "button";
        b.dataset["watermark"] = g.id;
        b.title = g.label;
        b.setAttribute("aria-label", g.label);
        b.style.cssText = "display:flex;flex-direction:column;gap:3px;align-items:center;padding:4px;border-radius:6px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        const t2 = document.createElement("span");
        t2.textContent = g.label;
        t2.style.cssText = "font-size:10.5px;opacity:.8;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        b.append(cv, t2);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => {
          close();
          env.ed.setWatermark(g.id);
          ctx.after();
        });
        grid2.append(b);
        requestAnimationFrame(() => {
          env.ed.paintWatermarkTemplate(g.id, cv, 68);
        });
      }
      return box;
    }
  }, "-", "dlg:watermark", "watermark:remove"];
}
function coverPageMenu(env, ctx) {
  return [{
    content: (close) => {
      const grid2 = document.createElement("div");
      grid2.className = "uw-cover-gallery";
      grid2.style.cssText = "display:grid;grid-template-columns:repeat(4, 88px);gap:8px;padding:6px;max-height:460px;overflow:auto";
      for (const c of env.ed.coverPages()) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset["cover"] = c.id;
        b.title = c.name;
        b.setAttribute("aria-label", c.name);
        b.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:center;padding:6px 4px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        const t2 = document.createElement("span");
        t2.textContent = c.name;
        t2.style.cssText = "font-size:12px;opacity:.85";
        b.append(cv, t2);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => {
          close();
          env.ed.insertCoverPage(c.id);
          ctx.after();
        });
        grid2.append(b);
        requestAnimationFrame(() => {
          env.ed.paintCoverTemplate(c.id, cv, 74);
        });
      }
      return grid2;
    }
  }, "-", "cover:remove"];
}
var el3 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var radio2 = (name, value, label, on) => el3("label", { className: "uo-check" }, el3("input", { type: "radio", name, value, checked: on }), label);
var check2 = (name, label, on) => el3("label", { className: "uo-check" }, el3("input", { type: "checkbox", name, checked: on }), label);
var colorInput = (name, hex) => el3("input", { type: "color", name, value: `#${hex.toLowerCase()}`, style: "width:56px;height:28px;padding:0 2px" });
var hexOf = (i) => i.value.slice(1).toUpperCase();
function paintRgba(cv, rgba, w, h, cssW, cssH) {
  cv.width = w;
  cv.height = h;
  cv.style.width = `${cssW}px`;
  cv.style.height = `${cssH}px`;
  const x = cv.getContext("2d");
  const id = x.createImageData(w, h);
  id.data.set(rgba);
  x.putImageData(id, 0, 0);
}
var sniffExt = (d) => d[0] === 255 && d[1] === 216 ? "jpeg" : d[0] === 71 && d[1] === 73 ? "gif" : d[0] === 66 && d[1] === 77 ? "bmp" : "png";
function pickImage(onPick) {
  const input = el3("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/bmp", style: "position:fixed;left:-100px;top:0;opacity:0" });
  document.body.append(input);
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f) return;
    const data = new Uint8Array(await f.arrayBuffer());
    onPick({ data, ext: (f.name.split(".").pop() ?? "png").toLowerCase(), name: f.name });
  });
  input.click();
}
var STYLES = [
  ["horizontal", "Horizontal", "Horizontal"],
  ["vertical", "Vertical", "Vertical"],
  ["diagonalUp", "Diagonal up", "Diagonal para cima"],
  ["diagonalDown", "Diagonal down", "Diagonal para baixo"],
  ["fromCorner", "From corner", "Do canto"],
  ["fromCenter", "From center", "Do centro"]
];
async function pageFillDialog(env) {
  const lang = env.lang, ed = env.ed;
  const opts = ed.pageFillOptions();
  const cur = ed.pageBackground();
  const f = cur?.fill;
  const isGrad = f?.type === "gradient" || f?.type === "gradientRadial";
  const oneM = /^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$/i.exec(f?.color2 ?? "");
  const cMode = isGrad && f?.colors ? "preset" : isGrad && oneM ? "one" : "two";
  const color1 = f?.color ?? cur?.color ?? "4472C4";
  const c1 = colorInput("c1", color1);
  const c2 = colorInput("c2", isGrad && !oneM && f?.color2 ? resolveColor2(f.color2, color1) : "FFFFFF");
  const deg0 = !oneM?.[1] ? 0.5 : oneM[1].toLowerCase() === "darken" ? Number(oneM[2]) / 510 : 1 - Number(oneM[2]) / 510;
  const degree = el3("input", { type: "range", name: "degree", min: "0", max: "1", step: "0.01", value: String(Math.round(deg0 * 100) / 100), style: "width:140px" });
  const preset = el3("select", { name: "preset" });
  for (const p of opts.presets) preset.append(el3("option", { value: p.id, textContent: p.name }));
  const curPreset = f?.colors ? opts.presets.find((p) => p.stops.length === f.colors.length && p.stops.every((s, i) => s.color.toUpperCase() === f.colors[i].color.toUpperCase())) : void 0;
  if (curPreset) preset.value = curPreset.id;
  let style0 = "horizontal", variant = 1;
  if (isGrad) {
    for (const [st] of STYLES) for (let v = 1; v <= GRADIENT_VARIANTS[st]; v++) {
      const g = gradientGeometry(st, v);
      const fp = (p) => p ? p.join(",") : "";
      if (g.type === f.type && (g.angle ?? 0) === (f.angle ?? 0) && (g.focus ?? 0) === (f.focus ?? 0) && !!g.gradientCenter === !!f.gradientCenter && fp(g.focusPosition) === fp(f.focusPosition)) {
        style0 = st;
        variant = v;
      }
    }
  }
  const modes = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px" },
    radio2("cmode", "one", tr3(lang, "One color", "Uma cor"), cMode === "one"),
    radio2("cmode", "two", tr3(lang, "Two colors", "Duas cores"), cMode === "two"),
    radio2("cmode", "preset", tr3(lang, "Preset", "Predefini\xE7\xE3o"), cMode === "preset")
  );
  const colorsRow = el3(
    "div",
    { className: "uo-dialog-grid" },
    el3("span", {}, tr3(lang, "Color 1", "Cor 1")),
    c1,
    el3("span", {}, tr3(lang, "Color 2", "Cor 2")),
    c2,
    el3("span", {}, tr3(lang, "Dark \u2194 Light", "Escuro \u2194 Claro")),
    degree,
    el3("span", {}, tr3(lang, "Preset colors", "Cores predefinidas")),
    preset
  );
  const styles = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:4px" },
    ...STYLES.map(([v, en, pt]) => radio2("gstyle", v, tr3(lang, en, pt), v === style0))
  );
  const variants = el3("div", { style: "display:grid;grid-template-columns:repeat(2, auto);gap:6px" });
  const sample = el3("canvas", { style: "border:1px solid rgba(127,127,127,.4)" });
  const gStyle = () => styles.querySelector("input:checked")?.value ?? "horizontal";
  const cmode = () => modes.querySelector("input:checked")?.value ?? "two";
  const paintOf = (style, v) => {
    const geo = gradientGeometry(style, v);
    const m = cmode();
    const pre = GRADIENT_PRESETS.find((p) => p.id === preset.value) ?? GRADIENT_PRESETS[0];
    const a = m === "preset" ? pre.stops[0].color : hexOf(c1);
    const b = m === "one" ? resolveColor2(oneColorGradientColor2(Number(degree.value)), a) : m === "two" ? hexOf(c2) : pre.stops[pre.stops.length - 1].color;
    return { type: geo.type, c1: a, c2: b, angle: geo.angle ?? 0, focus: geo.focus ?? 0, ...geo.focusPosition ? { focusPosition: geo.focusPosition } : {}, ...geo.gradientCenter ? { gradientCenter: true } : {}, ...m === "preset" ? { stops: pre.stops } : {} };
  };
  const refreshGradient = () => {
    const m = cmode();
    c2.disabled = m !== "two";
    degree.disabled = m !== "one";
    preset.disabled = m !== "preset";
    c1.disabled = m === "preset";
    const style = gStyle();
    const n = GRADIENT_VARIANTS[style];
    if (variant > n) variant = 1;
    variants.replaceChildren();
    for (let v = 1; v <= n; v++) {
      const cv = el3("canvas", { style: `cursor:pointer;border:2px solid ${v === variant ? "var(--u-color-primary,#005bc0)" : "transparent"}` });
      cv.title = `${tr3(lang, "Variant", "Variante")} ${v}`;
      paintRgba(cv, gradientTileRgba(paintOf(style, v), 64, 48), 64, 48, 64, 48);
      cv.addEventListener("click", () => {
        variant = v;
        refreshGradient();
      });
      variants.append(cv);
    }
    paintRgba(sample, gradientTileRgba(paintOf(style, variant), 96, 72), 96, 72, 96, 72);
  };
  const gradBody = el3(
    "div",
    { style: "display:grid;grid-template-columns:auto auto;gap:14px 18px;align-items:start" },
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Colors", "Cores")), modes, colorsRow),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Sample", "Amostra")), sample),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Shading styles", "Estilos de sombreamento")), styles),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Variants", "Varia\xE7\xF5es")), variants)
  );
  gradBody.addEventListener("change", refreshGradient);
  degree.addEventListener("input", refreshGradient);
  const isPat = f?.type === "pattern";
  let pattern = (isPat ? opts.patterns.find((p) => p.name === f.title?.trim())?.id : void 0) ?? opts.patterns[0].id;
  const fg = colorInput("fg", isPat && f.color ? f.color : "000000"), bg = colorInput("bg", isPat ? resolveColor2(f.color2, f.color ?? "000000") : "FFFFFF");
  const patGrid = el3("div", { style: "display:grid;grid-template-columns:repeat(8, auto);gap:4px" });
  const patSample = el3("canvas", { style: "border:1px solid rgba(127,127,127,.4);image-rendering:pixelated" });
  const patName = el3("span", { style: "font-size:12px;opacity:.85" });
  const patPaint = (prst) => ({ type: "pattern", c1: hexOf(fg), c2: hexOf(bg), angle: 0, focus: 0, pattern: patternRows(prst) ?? [] });
  const tileRgba = (rgba8, reps) => {
    const n = 8 * reps, out = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.set(rgba8.subarray((y % 8 * 8 + x % 8) * 4, (y % 8 * 8 + x % 8) * 4 + 4), (y * n + x) * 4);
    return out;
  };
  const refreshPattern = () => {
    patGrid.replaceChildren();
    for (const p of opts.patterns) {
      const cv = el3("canvas", { style: `cursor:pointer;image-rendering:pixelated;border:2px solid ${p.id === pattern ? "var(--u-color-primary,#005bc0)" : "rgba(127,127,127,.3)"}` });
      cv.title = p.name;
      paintRgba(cv, tileRgba(patternRgba(patPaint(p.id)), 3), 24, 24, 24, 24);
      cv.addEventListener("click", () => {
        pattern = p.id;
        refreshPattern();
      });
      patGrid.append(cv);
    }
    patName.textContent = opts.patterns.find((p) => p.id === pattern)?.name ?? "";
    paintRgba(patSample, tileRgba(patternRgba(patPaint(pattern)), 12), 96, 96, 96, 96);
  };
  const patBody = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el3("strong", {}, tr3(lang, "Pattern", "Padr\xE3o")),
    patGrid,
    patName,
    el3("div", { className: "uo-dialog-grid" }, el3("span", {}, tr3(lang, "Foreground", "Primeiro plano")), fg, el3("span", {}, tr3(lang, "Background", "Plano de fundo")), bg),
    el3("strong", {}, tr3(lang, "Sample", "Amostra")),
    patSample
  );
  fg.addEventListener("input", refreshPattern);
  bg.addEventListener("input", refreshPattern);
  const files = { texture: null, picture: null };
  const imgPane = (kind) => {
    const prev = el3("img", { alt: "", style: "max-width:280px;max-height:180px;border:1px solid rgba(127,127,127,.4);display:none" });
    const name = el3("span", { style: "font-size:12px;opacity:.85" });
    const btn3 = el3("button", { type: "button", className: "uo-pill", textContent: kind === "texture" ? tr3(lang, "Other Texture\u2026", "Outra Textura\u2026") : tr3(lang, "Select Picture\u2026", "Selecionar Imagem\u2026") });
    btn3.addEventListener("click", () => pickImage((file) => {
      files[kind] = file;
      name.textContent = file.name;
      prev.src = URL.createObjectURL(new Blob([file.data.slice().buffer]));
      prev.style.display = "block";
    }));
    const note = kind === "texture" ? tr3(lang, "The image repeats across the page at its natural size.", "A imagem se repete pela p\xE1gina no tamanho natural.") : tr3(lang, "The picture repeats across the page, as in the desktop app.", "A imagem se repete pela p\xE1gina, como no aplicativo de mesa.");
    return el3("div", { style: "display:flex;flex-direction:column;gap:10px;align-items:flex-start" }, btn3, name, prev, el3("span", { style: "font-size:12px;opacity:.7" }, note));
  };
  const tabs = dialogTabs([
    { id: "gradient", label: tr3(lang, "Gradient", "Gradiente"), body: gradBody },
    { id: "texture", label: tr3(lang, "Texture", "Textura"), body: imgPane("texture") },
    { id: "pattern", label: tr3(lang, "Pattern", "Padr\xE3o"), body: patBody },
    { id: "picture", label: tr3(lang, "Picture", "Imagem"), body: imgPane("picture") }
  ], cur?.fill?.type === "pattern" ? "pattern" : cur?.fill?.type === "tile" ? "texture" : cur?.fill?.type === "frame" ? "picture" : "gradient");
  const h = openDialog({
    title: tr3(lang, "Fill Effects", "Efeitos de Preenchimento"),
    icon: "gradient",
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 560,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  refreshGradient();
  refreshPattern();
  if (await h.result !== "ok") return;
  let input = null;
  switch (tabs.current()) {
    case "gradient": {
      const m = cmode(), style = gStyle();
      input = m === "one" ? { type: "gradient", colors: "one", color: hexOf(c1), degree: Number(degree.value), style, variant } : m === "two" ? { type: "gradient", colors: "two", color: hexOf(c1), color2: hexOf(c2), style, variant } : { type: "gradient", colors: "preset", preset: preset.value, style, variant };
      break;
    }
    case "pattern":
      input = { type: "pattern", pattern, color: hexOf(fg), background: hexOf(bg) };
      break;
    case "texture":
      if (files.texture) input = { type: "texture", ...files.texture };
      break;
    case "picture":
      if (files.picture) input = { type: "picture", ...files.picture };
      break;
  }
  if (input) ed.setPageFill(input);
}
async function watermarkDialog(env) {
  const lang = env.lang, ed = env.ed;
  const cur = ed.watermark();
  const none = radio2("wmkind", "none", tr3(lang, "No watermark", "Sem marca-d'\xE1gua"), !cur);
  const pic = radio2("wmkind", "picture", tr3(lang, "Picture watermark", "Marca-d'\xE1gua de imagem"), cur?.kind === "picture");
  const txt = radio2("wmkind", "text", tr3(lang, "Text watermark", "Marca-d'\xE1gua de texto"), cur?.kind === "text");
  let image = cur?.kind === "picture" && cur.image ? { data: cur.image, ext: sniffExt(cur.image), name: cur.title } : null;
  const picName = el3("span", { style: "font-size:12px;opacity:.85", textContent: image?.name ?? "" });
  const picBtn = el3("button", { type: "button", className: "uo-pill", textContent: tr3(lang, "Select Picture\u2026", "Selecionar Imagem\u2026") });
  picBtn.addEventListener("click", () => pickImage((f) => {
    image = f;
    picName.textContent = f.name;
    pic.querySelector("input").checked = true;
    sync();
  }));
  const scale = el3("select", { name: "scale" });
  for (const [v, t2] of [["auto", tr3(lang, "Auto", "Autom\xE1tico")], ["500", "500%"], ["200", "200%"], ["150", "150%"], ["100", "100%"], ["50", "50%"]]) scale.append(el3("option", { value: v, textContent: t2 }));
  const washout = check2("washout", tr3(lang, "Washout", "Desbotar"), cur?.kind === "picture" ? cur.washout : true);
  const langSel = el3("select", { name: "wmlang" });
  for (const [v, t2] of [["pt", "Portugu\xEAs (Brasil)"], ["en", tr3(lang, "English (United States)", "Ingl\xEAs (Estados Unidos)")]]) langSel.append(el3("option", { value: v, textContent: t2 }));
  langSel.value = cur?.kind === "text" && cur.lang ? cur.lang.toLowerCase().startsWith("pt") ? "pt" : "en" : lang;
  const list = el3("datalist", { id: "uw-wm-texts" });
  const text = el3("input", { type: "text", name: "wmtext", value: cur?.kind === "text" ? cur.text : WATERMARK_TEXTS[langSel.value][0] ?? "", style: "width:220px" });
  text.setAttribute("list", "uw-wm-texts");
  const fillTexts = () => list.replaceChildren(...WATERMARK_TEXTS[langSel.value].map((t2) => el3("option", { value: t2 })));
  fillTexts();
  langSel.addEventListener("change", fillTexts);
  const font = el3("select", { name: "wmfont", style: "width:220px" });
  const known = ed.knownFontFamilies();
  const want = cur?.kind === "text" ? cur.font : "Calibri";
  const font0 = known.find((k) => k.toLowerCase() === want.toLowerCase()) ?? want;
  for (const f of [.../* @__PURE__ */ new Set([font0, ...known])]) font.append(el3("option", { value: f, textContent: f }));
  font.value = font0;
  const size = el3("select", { name: "wmsize" });
  for (const s of ["auto", "36", "40", "44", "48", "54", "60", "66", "72", "80", "90", "96", "105", "120", "144"]) size.append(el3("option", { value: s, textContent: s === "auto" ? tr3(lang, "Auto", "Autom\xE1tico") : s }));
  size.value = cur?.kind === "text" && cur.sizePt ? String(cur.sizePt) : "auto";
  const color = colorInput("wmcolor", cur?.kind === "text" ? cur.color : "C0C0C0");
  const semi = check2("semi", tr3(lang, "Semitransparent", "Semitransparente"), cur?.kind === "text" ? cur.semitransparent : true);
  const diag = radio2("wmlayout", "diagonal", tr3(lang, "Diagonal", "Diagonal"), cur?.kind !== "text" || cur.layout === "diagonal");
  const horiz = radio2("wmlayout", "horizontal", tr3(lang, "Horizontal", "Horizontal"), cur?.kind === "text" && cur.layout === "horizontal");
  const picPane = el3(
    "div",
    { className: "uo-dialog-grid", style: "padding-left:24px" },
    el3("span", {}, ""),
    el3("div", { style: "display:flex;gap:8px;align-items:center" }, picBtn, picName),
    el3("span", {}, tr3(lang, "Scale", "Escala")),
    el3("div", { style: "display:flex;gap:12px;align-items:center" }, scale, washout)
  );
  const txtPane = el3(
    "div",
    { className: "uo-dialog-grid", style: "padding-left:24px" },
    el3("span", {}, tr3(lang, "Language", "Idioma")),
    langSel,
    el3("span", {}, tr3(lang, "Text", "Texto")),
    el3("div", {}, text, list),
    el3("span", {}, tr3(lang, "Font", "Fonte")),
    font,
    el3("span", {}, tr3(lang, "Size", "Tamanho")),
    size,
    el3("span", {}, tr3(lang, "Color", "Cor")),
    el3("div", { style: "display:flex;gap:12px;align-items:center" }, color, semi),
    el3("span", {}, tr3(lang, "Layout", "Layout")),
    el3("div", { style: "display:flex;gap:12px" }, diag, horiz)
  );
  const body = el3("div", { style: "display:flex;flex-direction:column;gap:10px" }, none, pic, picPane, txt, txtPane);
  const kind = () => body.querySelector('input[name="wmkind"]:checked')?.value ?? "none";
  const sync = () => {
    for (const x of picPane.querySelectorAll("input,select,button")) x.disabled = kind() !== "picture";
    for (const x of txtPane.querySelectorAll("input,select")) x.disabled = kind() !== "text";
  };
  body.addEventListener("change", sync);
  sync();
  const apply = () => {
    const k = kind();
    if (k === "none") {
      ed.removeWatermark();
      return;
    }
    if (k === "picture") {
      if (!image) return;
      ed.setWatermark({ kind: "picture", data: image.data, ext: image.ext, title: image.name.replace(/\.[^.]+$/, ""), washout: washout.querySelector("input").checked, ...scale.value !== "auto" ? { scale: Number(scale.value) } : {} });
      return;
    }
    if (!text.value.trim()) return;
    const spec = {
      kind: "text",
      text: text.value.trim(),
      font: font.value || "Calibri",
      color: hexOf(color),
      semitransparent: semi.querySelector("input").checked,
      layout: body.querySelector('input[name="wmlayout"]:checked')?.value ?? "diagonal",
      lang: langSel.value === "pt" ? "pt-BR" : "en-US",
      ...size.value !== "auto" ? { sizePt: Number(size.value) } : {}
    };
    ed.setWatermark(spec);
  };
  const h = openDialog({
    title: tr3(lang, "Printed Watermark", "Marca-d'\xE1gua Impressa"),
    icon: "branding_watermark",
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "apply", label: tr3(lang, "Apply", "Aplicar") }, { id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }],
    onAction: (id) => {
      if (id === "apply") {
        apply();
        return false;
      }
      return void 0;
    }
  });
  if (await h.result !== "ok") return;
  apply();
}

// src/chrome-toc.ts
var L6 = (en, pt) => ({ en, pt });
function registerTocCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const edit = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  const hasToc = () => typeof api["hasTableOfContents"] === "function" && ed.hasTableOfContents();
  const cmds = [
    edit({ id: "toc", label: L6("Update Table", "Atualizar Sum\xE1rio"), tip: L6("Update the table of contents so all the entries refer to the correct page numbers", "Atualiza o sum\xE1rio para que todas as entradas indiquem os n\xFAmeros de p\xE1gina corretos"), icon: "autorenew", supports: has("updateToc"), isEnabled: hasToc, run: () => ctl.tocDialog("update") }),
    edit({ id: "toc:custom", label: L6("Custom Table of Contents\u2026", "Sum\xE1rio Personalizado\u2026"), icon: "tune", supports: has("insertTableOfContents"), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog("custom") }),
    edit({ id: "toc:remove", label: L6("Remove Table of Contents", "Remover Sum\xE1rio"), icon: "delete", supports: has("removeTableOfContents"), isEnabled: hasToc, run: () => {
      ed.removeTableOfContents();
    } }),
    edit({ id: "toc:mark", label: L6("Mark Table of Contents Entry\u2026", "Marcar Entrada de Sum\xE1rio\u2026"), icon: "bookmark_add", shortcut: "Alt+Shift+O", supports: has("markTocEntry"), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog("mark") }),
    ...Array.from({ length: 10 }, (_, lv) => edit({
      id: `toc:level${lv}`,
      label: lv ? L6(`Level ${lv}`, `N\xEDvel ${lv}`) : L6("Do Not Show in Table of Contents", "N\xE3o Mostrar no Sum\xE1rio"),
      supports: has("setTocLevel"),
      isChecked: () => ed.getTocLevel() === lv,
      run: () => ed.setTocLevel(lv)
    }))
  ];
  reg.add(...cmds);
}
function tocGalleryMenu(env, ctx) {
  const tiles = {
    content: (close) => {
      const list = document.createElement("div");
      list.className = "uw-toc-gallery";
      list.style.cssText = "display:grid;grid-template-columns:1fr;gap:6px;padding:6px;max-height:460px;overflow:auto";
      for (const t2 of env.ed.tocTemplates()) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset["template"] = t2.id;
        b.title = t2.name;
        b.setAttribute("aria-label", t2.name);
        b.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left";
        const cap2 = document.createElement("span");
        cap2.textContent = t2.name;
        cap2.style.cssText = "font-size:12px;opacity:.8";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        b.append(cap2, cv);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => {
          close();
          env.ed.insertTocTemplate(t2.id);
          ctx.after();
        });
        list.append(b);
        requestAnimationFrame(() => {
          env.ed.paintTocTemplate(t2.id, cv, 300);
        });
      }
      return list;
    }
  };
  return [tiles, "-", "toc:custom", "toc:remove"];
}
function addTextMenu(env) {
  const shown = Math.max(3, Math.min(9, env.ed.getTableOfContentsOptions()?.levels ?? 3));
  return [...Array.from({ length: shown + 1 }, (_, i) => `toc:level${i}`), "-", "toc:mark"];
}
var el4 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var check3 = (label, on) => {
  const input = el4("input", { type: "checkbox", checked: on });
  return { box: el4("label", { className: "uo-check" }, input, label), input };
};
var select2 = (opts, value) => {
  const s = el4("select");
  for (const [v, t2] of opts) s.append(el4("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var button = (label) => el4("button", { type: "button", className: "uo-pill", textContent: label });
var T = (env) => (en, pt) => pickLabels(env.lang, { en, pt });
var LEADERS = (t2) => [
  ["none", t2("(none)", "(nenhum)")],
  ["dot", "......."],
  ["hyphen", "-------"],
  ["underscore", "_______"]
];
async function updateTocDialog(env, scope = "caret") {
  const t2 = T(env), ed = env.ed;
  const name = `toc-upd-${Math.random().toString(36).slice(2)}`;
  const pages = el4("input", { type: "radio", name, checked: true });
  const all = el4("input", { type: "radio", name });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    el4("div", { style: "font-size:13px" }, t2("Choose how to update the table of contents:", "Selecione como atualizar o sum\xE1rio:")),
    el4("label", { className: "uo-check" }, pages, t2("Update page numbers only", "Atualizar somente os n\xFAmeros de p\xE1gina")),
    el4("label", { className: "uo-check" }, all, t2("Update entire table", "Atualizar o \xEDndice inteiro"))
  );
  const h = openDialog({
    title: t2("Update Table of Contents", "Atualizar Sum\xE1rio"),
    icon: "autorenew",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 420,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const mode = pages.checked ? "pages" : "all";
  if (scope === "selection") ed.updateFields("selection", mode);
  else ed.updateToc(mode);
}
async function replaceQuestion(env) {
  const t2 = T(env);
  const h = openDialog({
    title: t2("Table of Contents", "Sum\xE1rio"),
    body: el4("div", { style: "min-width:300px;font-size:13px" }, t2("Do you want to replace the selected table of contents?", "Deseja substituir o sum\xE1rio selecionado?")),
    layer: env.layer,
    lang: env.lang,
    width: 400,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "no", label: t2("No", "N\xE3o") }, { id: "yes", label: t2("Yes", "Sim"), primary: true }]
  });
  const r = await h.result;
  return r === "yes" || r === "no" ? r : null;
}
async function optionsDialog(env, cur) {
  const t2 = T(env), ed = env.ed;
  const useStyles = check3(t2("Styles", "Estilos"), cur.useStyles !== false);
  const outline2 = check3(t2("Outline levels", "N\xEDveis de t\xF3picos"), cur.outlineLevels !== false);
  const fields = check3(t2("Table entry fields", "Campos de entrada de \xEDndice"), !!cur.fields);
  const levels = cur.levels ?? 3;
  const styles = ed.listStyles("document").filter((s) => s.kind !== "character");
  const isHeading = (raw) => {
    const m = /^heading ([1-9])$/i.exec(raw);
    return m ? +m[1] : 0;
  };
  const initial = (raw, name) => {
    const hd = isHeading(raw);
    if (hd && cur.useStyles !== false && hd <= levels) return String(hd);
    const s = cur.styles?.find((x) => x.style.toLowerCase() === name.toLowerCase() || x.style.toLowerCase() === raw.toLowerCase());
    return s ? String(s.level) : "";
  };
  const rows = styles.map((s) => {
    const input = el4("input", { type: "text", value: initial(s.rawName, s.name), maxLength: 1, style: "width:34px;height:22px;padding:0 4px;box-sizing:border-box;text-align:center;font:inherit" });
    return { s, input, row: el4("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:12px;padding:1px 4px;font-size:13px" }, el4("span", {}, s.name), input) };
  });
  const list = el4("div", { style: "height:200px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px" }, ...rows.map((r) => r.row));
  const reset = button(t2("Reset", "Redefinir"));
  reset.addEventListener("click", () => {
    for (const r of rows) {
      const hd = isHeading(r.s.rawName);
      r.input.value = hd && hd <= 3 ? String(hd) : "";
    }
    useStyles.input.checked = true;
    outline2.input.checked = true;
    fields.input.checked = false;
  });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px;min-width:360px" },
    el4("strong", { style: "font-size:13px" }, t2("Build table of contents from:", "Construir sum\xE1rio a partir de:")),
    useStyles.box,
    el4("div", { style: "display:flex;justify-content:space-between;font-size:12px;opacity:.75;padding:0 4px" }, el4("span", {}, t2("Available styles:", "Estilos dispon\xEDveis:")), el4("span", {}, t2("TOC level:", "N\xEDvel do sum\xE1rio:"))),
    list,
    outline2.box,
    fields.box,
    el4("div", {}, reset)
  );
  const h = openDialog({
    title: t2("Table of Contents Options", "Op\xE7\xF5es do Sum\xE1rio"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 460,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return null;
  const map = rows.map((r) => ({ s: r.s, level: Math.min(9, Math.max(0, parseInt(r.input.value, 10) || 0)) })).filter((x) => x.level > 0);
  let k = 0;
  while (k < 9 && map.some((x) => isHeading(x.s.rawName) === k + 1 && x.level === k + 1)) k++;
  const extra = map.filter((x) => !(isHeading(x.s.rawName) && isHeading(x.s.rawName) <= k && x.level === isHeading(x.s.rawName)));
  return {
    ...cur,
    useStyles: useStyles.input.checked,
    outlineLevels: outline2.input.checked,
    fields: fields.input.checked,
    levels: k || levels,
    styles: extra.map((x) => ({ style: x.s.name, level: x.level }))
  };
}
async function modifyDialog(env) {
  const t2 = T(env), ed = env.ed;
  const names = Array.from({ length: 9 }, (_, i) => [`toc ${i + 1}`, t2(`TOC ${i + 1}`, `Sum\xE1rio ${i + 1}`)]);
  const list = el4("select", { size: 9, style: "width:100%;font:inherit" });
  for (const [v, txt] of names) list.append(el4("option", { value: v, textContent: txt }));
  list.value = "toc 1";
  const mod = button(t2("Modify\u2026", "Modificar\u2026"));
  mod.addEventListener("click", () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  list.addEventListener("dblclick", () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px;min-width:280px" },
    el4("span", { style: "font-size:13px" }, t2("Styles:", "Estilos:")),
    list,
    el4("div", {}, mod)
  );
  const h = openDialog({
    title: t2("Style", "Estilo"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 340,
    actions: [{ id: "ok", label: "OK", primary: true }]
  });
  await h.result;
}
async function customTocDialog(env) {
  const t2 = T(env), ed = env.ed;
  let cur = ed.getTableOfContentsOptions() ?? {};
  const pages = check3(t2("Show page numbers", "Mostrar n\xFAmeros de p\xE1gina"), cur.pageNumbers !== false);
  const right = check3(t2("Right align page numbers", "Alinhar n\xFAmeros de p\xE1gina \xE0 direita"), cur.rightAlign !== false);
  const leader = select2(LEADERS(t2), cur.leader ?? "dot");
  const links = check3(t2("Use hyperlinks instead of page numbers", "Usar hiperlinks em vez de n\xFAmeros de p\xE1gina"), cur.hyperlinks !== false);
  const format = select2(TOC_FORMATS.map((f) => [f.id, pickLabels(env.lang, f.label)]), "template");
  let formatTouched = false;
  format.addEventListener("change", () => {
    formatTouched = true;
  });
  const levels = el4("input", { type: "number", min: "1", max: "9", value: String(cur.levels ?? 3), style: "width:56px" });
  const print = el4("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f" });
  const web = el4("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f" });
  const paint = () => {
    const n = Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3));
    const lead = { none: " ", dot: ".", hyphen: "-", underscore: "_" }[leader.value] ?? ".";
    const f = format.value;
    const show = Math.min(n, 3);
    print.replaceChildren(...Array.from({ length: show }, (_, i) => {
      const st = tocFormatStyle(f, i + 1);
      const css = `padding-left:${/w:left="(\d+)"/.exec(st.pPr)?.[1] ? +/w:left="(\d+)"/.exec(st.pPr)[1] / 20 : 0}px;${/<w:b\/>/.test(st.rPr) ? "font-weight:700;" : ""}${/<w:i\/>/.test(st.rPr) ? "font-style:italic;" : ""}${/<w:caps\/>/.test(st.rPr) ? "text-transform:uppercase;" : ""}${/<w:smallCaps\/>/.test(st.rPr) ? "font-variant:small-caps;" : ""}${/w:jc w:val="center"/.test(st.pPr) ? "justify-content:center;" : ""}`;
      const row3 = el4("div", { style: `display:flex;gap:4px;white-space:nowrap;${css}` }, el4("span", {}, t2(`Heading ${i + 1}`, `T\xEDtulo ${i + 1}`)));
      if (pages.input.checked && right.input.checked) row3.append(el4("span", { style: "flex:1;overflow:hidden;opacity:.7", textContent: lead.repeat(200) }), el4("span", {}, String(i * 2 + 1)));
      else if (pages.input.checked) row3.append(el4("span", {}, String(i * 2 + 1)));
      return row3;
    }));
    web.replaceChildren(...Array.from({ length: show }, (_, i) => el4("div", { style: `padding-left:${i * 11}px;${links.input.checked ? "color:#0563c1;text-decoration:underline" : ""}` }, t2(`Heading ${i + 1}`, `T\xEDtulo ${i + 1}`))));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c of [pages.input, right.input, links.input]) c.addEventListener("change", paint);
  for (const s of [leader, format]) s.addEventListener("change", paint);
  levels.addEventListener("input", paint);
  paint();
  const optBtn = button(t2("Options\u2026", "Op\xE7\xF5es\u2026"));
  optBtn.addEventListener("click", () => {
    void optionsDialog(env, { ...cur, levels: parseInt(levels.value, 10) || 3 }).then((o) => {
      if (!o) return;
      cur = o;
      levels.value = String(o.levels ?? 3);
      paint();
    });
  });
  const modBtn = button(t2("Modify\u2026", "Modificar\u2026"));
  modBtn.addEventListener("click", () => {
    void modifyDialog(env);
  });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:520px" },
    el4(
      "div",
      { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px" },
      el4(
        "div",
        { style: "display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden" },
        el4("strong", { style: "font-size:13px" }, t2("Print Preview", "Visualizar Impress\xE3o")),
        print,
        pages.box,
        right.box,
        el4("label", { className: "uo-field" }, el4("span", {}, t2("Tab leader:", "Preenchimento de tabula\xE7\xE3o:")), leader)
      ),
      el4("div", { style: "display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden" }, el4("strong", { style: "font-size:13px" }, t2("Web Preview", "Visualizar da Web")), web, links.box)
    ),
    el4("strong", { style: "font-size:13px" }, t2("General", "Geral")),
    el4("div", { className: "uo-dialog-grid" }, el4("span", {}, t2("Formats:", "Formatos:")), format, el4("span", {}, t2("Show levels:", "Mostrar n\xEDveis:")), levels),
    el4("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, optBtn, modBtn)
  );
  const h = openDialog({
    title: t2("Table of Contents", "Sum\xE1rio"),
    icon: "toc",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 620,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const opts = {
    ...cur,
    pageNumbers: pages.input.checked,
    rightAlign: right.input.checked,
    leader: leader.value,
    hyperlinks: links.input.checked,
    levels: Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3)),
    ...formatTouched ? { format: format.value } : {}
  };
  let replace;
  if (ed.hasTableOfContents()) {
    const r = await replaceQuestion(env);
    if (!r) return;
    replace = r === "yes";
  }
  if (!ed.insertTableOfContents(opts, replace)) env.flash(t2("The table of contents could not be inserted here", "N\xE3o foi poss\xEDvel inserir o sum\xE1rio aqui"));
}
async function markTocDialog(env) {
  const t2 = T(env), ed = env.ed;
  const entry = el4("input", { type: "text", value: ed.tocEntrySuggestion(), style: "min-width:260px" });
  const ids = select2("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => [c, c]), "C");
  const level = el4("input", { type: "number", min: "1", max: "9", value: "1", style: "width:56px" });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:340px" },
    el4("label", { className: "uo-field" }, el4("span", {}, t2("Entry:", "Entrada:")), entry),
    el4("div", { className: "uo-dialog-grid" }, el4("span", {}, t2("Table identifier:", "Identificador do sum\xE1rio:")), ids, el4("span", {}, t2("Level:", "N\xEDvel:")), level)
  );
  const h = openDialog({
    title: t2("Mark Table of Contents Entry", "Marcar Entrada de Sum\xE1rio"),
    icon: "bookmark_add",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 440,
    modal: false,
    actions: [{ id: "cancel", label: t2("Close", "Fechar") }, { id: "mark", label: t2("Mark", "Marcar"), primary: true }],
    onAction: (id) => {
      if (id !== "mark") return true;
      const ok = ed.markTocEntry({ text: entry.value, identifier: ids.value, level: parseInt(level.value, 10) || 1 });
      if (!ok) env.flash(t2("Type the entry text", "Digite o texto da entrada"));
      return false;
    }
  });
  h.el.style.cssText += ";position:fixed;inset:0;margin:auto;height:fit-content";
  queueMicrotask(() => entry.focus());
  await h.result;
}
function tocDialog(env, kind, scope = "caret") {
  switch (kind) {
    case "custom":
      return customTocDialog(env);
    case "update":
      return updateTocDialog(env, scope);
    case "mark":
      return markTocDialog(env);
  }
}

// src/chrome-textlayout.ts
var L7 = (en, pt) => ({ en, pt });
var tr4 = (lang, en, pt) => pickLabels(lang, { en, pt });
function registerTextLayoutCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const edit = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  const auto = () => has("getHyphenation")() ? ed.getHyphenation().auto : false;
  const lnMode = () => {
    const i = has("getLineNumbering")() ? ed.getLineNumbering() : null;
    return !i || i.mixed ? null : i.mode;
  };
  const ln = (id, label) => edit({ id: `ln:${id}`, label, supports: has("setLineNumbering"), isChecked: () => lnMode() === id, run: () => ed.setLineNumbering(id) });
  reg.add(
    edit({ id: "hyph:none", label: L7("None", "Nenhuma"), tip: L7("Turn off automatic hyphenation", "Desativa a hifeniza\xE7\xE3o autom\xE1tica"), supports: has("setHyphenation"), isChecked: () => !auto(), run: () => ed.setHyphenation("none") }),
    edit({ id: "hyph:auto", label: L7("Automatic", "Autom\xE1tico"), tip: L7("Turn on automatic hyphenation", "Ativa a hifeniza\xE7\xE3o autom\xE1tica"), supports: has("setHyphenation"), isChecked: auto, run: () => ed.setHyphenation("auto") }),
    edit({ id: "hyph:manual", label: L7("Manual", "Manual"), tip: L7("Manual hyphenation", "Hifeniza\xE7\xE3o manual"), supports: has("nextManualHyphenation"), run: () => ctl.textLayoutDialog("manualHyphenation") }),
    edit({ id: "dlg:hyphenation", label: L7("Hyphenation Options\u2026", "Op\xE7\xF5es de Hifeniza\xE7\xE3o\u2026"), icon: "settings", supports: has("setHyphenationOptions"), run: () => ctl.textLayoutDialog("hyphenation") }),
    ln("none", L7("None", "Nenhum")),
    ln("continuous", L7("Continuous", "Cont\xEDnuo")),
    ln("page", L7("Restart Each Page", "Reiniciar Cada P\xE1gina")),
    ln("section", L7("Restart Each Section", "Reiniciar Cada Se\xE7\xE3o")),
    edit({ id: "ln:suppress", label: L7("Suppress for Current Paragraph", "Suprimir no Par\xE1grafo Atual"), supports: has("toggleLineNumberSuppression"), isChecked: () => ed.lineNumbersSuppressed(), run: () => ed.toggleLineNumberSuppression() }),
    edit({ id: "dlg:lineNumbers", label: L7("Line Numbering Options\u2026", "Op\xE7\xF5es de Numera\xE7\xE3o de Linhas\u2026"), icon: "settings", supports: has("setPageSetup"), run: () => ctl.pageDialog("layout") }),
    // hífens (Inserir › Símbolo › Caracteres Especiais no Word; aqui só pelos atalhos)
    edit({ id: "hyphen:optional", label: L7("Optional Hyphen", "H\xEDfen Opcional"), shortcut: "Ctrl+-", supports: has("pasteText"), run: () => ed.pasteText("\xAD") }),
    edit({ id: "hyphen:nonBreaking", label: L7("Nonbreaking Hyphen", "H\xEDfen Incondicional"), shortcut: "Ctrl+Shift+-", supports: has("pasteText"), run: () => ed.pasteText("\u2011") })
  );
}
var hyphenationMenu = () => ["hyph:none", "hyph:auto", "hyph:manual", "-", "dlg:hyphenation"];
var lineNumbersMenu = () => ["ln:none", "ln:continuous", "ln:page", "ln:section", "ln:suppress", "-", "dlg:lineNumbers"];
var indentUnit = (lang) => lang === "pt" ? "cm" : "in";
var indentStep = (lang) => lang === "pt" ? 1440 / 2.54 / 10 : 144;
function paragraphLayoutCells(env) {
  const ed = env.ed;
  const has = () => typeof ed["setParagraphLayout"] === "function";
  const editable = () => !env.app.comparing && !ed.isProtected() && !!ed.getParagraphLayout();
  const cur = (k) => () => ed.getParagraphLayout()?.[k] ?? null;
  const [imin, imax] = PARAGRAPH_LAYOUT_LIMITS.indent;
  const [smin, smax] = PARAGRAPH_LAYOUT_LIMITS.spacing;
  return [
    { rows: [
      [barCaption(L7("Indent", "Recuar"), "indent:caption")],
      [spinField({
        id: "indent:left",
        label: L7("Left:", "\xC0 Esquerda:"),
        tip: L7("Indent Left", "Recuar \xE0 Esquerda"),
        icon: "format_indent_increase",
        unit: indentUnit,
        step: indentStep,
        min: imin,
        max: imax,
        supports: has,
        isEnabled: editable,
        get: cur("left"),
        set: (v) => {
          if (v !== "auto") ed.setParagraphLayout({ left: v });
        }
      })],
      [spinField({
        id: "indent:right",
        label: L7("Right:", "\xC0 Direita:"),
        tip: L7("Indent Right", "Recuar \xE0 Direita"),
        icon: "format_indent_decrease",
        unit: indentUnit,
        step: indentStep,
        min: imin,
        max: imax,
        supports: has,
        isEnabled: editable,
        get: cur("right"),
        set: (v) => {
          if (v !== "auto") ed.setParagraphLayout({ right: v });
        }
      })]
    ] },
    { rows: [
      [barCaption(L7("Spacing", "Espa\xE7amento"), "spacing:caption")],
      [spinField({
        id: "spacing:before",
        label: L7("Before:", "Antes:"),
        tip: L7("Spacing Before", "Espa\xE7amento Antes"),
        icon: "vertical_align_top",
        unit: "pt",
        step: 120,
        min: smin,
        max: smax,
        auto: true,
        supports: has,
        isEnabled: editable,
        get: cur("before"),
        set: (v) => ed.setParagraphLayout({ before: v })
      })],
      [spinField({
        id: "spacing:after",
        label: L7("After:", "Depois:"),
        tip: L7("Spacing After", "Espa\xE7amento Depois"),
        icon: "vertical_align_bottom",
        unit: "pt",
        step: 120,
        min: smin,
        max: smax,
        auto: true,
        supports: has,
        isEnabled: editable,
        get: cur("after"),
        set: (v) => ed.setParagraphLayout({ after: v })
      })]
    ] }
  ];
}
var el5 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var check4 = (name, label, on) => {
  const i = el5("input", { type: "checkbox", name, checked: on });
  return [el5("label", { className: "uo-check" }, i, label), i];
};
var radio3 = (name, value, label, on) => el5("label", { className: "uo-check" }, el5("input", { type: "radio", name, value, checked: on }), label);
var radioValue = (box, name) => box.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
function languageName(tag, lang) {
  try {
    const n = new Intl.DisplayNames([lang === "pt" ? "pt-BR" : "en"], { type: "language" }).of(tag) ?? tag;
    return n.charAt(0).toLocaleUpperCase() + n.slice(1);
  } catch {
    return tag;
  }
}
async function hyphenationDialog(env) {
  const lang = env.lang, ed = env.ed;
  const h = ed.getHyphenation();
  const unit = indentUnit(lang);
  const noLimit = tr4(lang, "No limit", "Sem limite");
  const [autoL, autoI] = check4("auto", tr4(lang, "Automatically hyphenate document", "Hifenizar documento automaticamente"), h.auto);
  const [capsL, capsI] = check4("caps", tr4(lang, "Hyphenate words in CAPS", "Hifenizar palavras em MAI\xDASCULAS"), h.caps);
  const zone = el5("input", { type: "text", name: "zone", inputMode: "decimal", value: formatMeasure(h.zoneTwips, unit, lang), style: "width:120px" });
  const limit = el5("input", { type: "text", name: "limit", inputMode: "numeric", value: h.limit ? String(h.limit) : noLimit, style: "width:120px" });
  limit.addEventListener("focus", () => limit.select());
  zone.addEventListener("focus", () => zone.select());
  const grid2 = el5(
    "div",
    { className: "uo-dialog-grid" },
    el5("span", {}, tr4(lang, "Hyphenation zone:", "Zona de hifeniza\xE7\xE3o:")),
    zone,
    el5("span", {}, tr4(lang, "Limit consecutive hyphens to:", "Limitar hifens consecutivos a:")),
    limit
  );
  const body = el5("div", { style: "display:flex;flex-direction:column;gap:10px" }, autoL, capsL, grid2);
  const dlg = openDialog({
    title: tr4(lang, "Hyphenation", "Hifeniza\xE7\xE3o"),
    icon: "horizontal_rule",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "manual", label: L7("Manual\u2026", "Manual\u2026") }, { id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  const res = await dlg.result;
  if (res !== "ok" && res !== "manual") return;
  const z = parseMeasure(zone.value, unit);
  const ls = limit.value.trim();
  const lv = ls === "" || ls.toLowerCase() === noLimit.toLowerCase() ? 0 : parseInt(ls, 10);
  ed.setHyphenationOptions({
    auto: autoI.checked,
    caps: capsI.checked,
    ...z !== null && z !== h.zoneTwips ? { zoneTwips: Math.min(HYPHENATION_LIMITS.zoneTwips[1], Math.max(HYPHENATION_LIMITS.zoneTwips[0], z)) } : {},
    ...Number.isFinite(lv) ? { limit: lv } : {}
  });
  if (res === "manual") await manualHyphenationDialog(env);
}
async function manualHyphenationDialog(env) {
  const lang = env.lang, ed = env.ed;
  const done = tr4(lang, "Hyphenation is complete.", "A hifeniza\xE7\xE3o foi conclu\xEDda.");
  let cur = await ed.nextManualHyphenation();
  if (!cur) {
    ed.endManualHyphenation();
    env.app.ui.flash(done);
    return;
  }
  let pick = cur.suggested;
  const wordEl = el5("div", { className: "uw-hyph-word", style: "font-size:20px;letter-spacing:.5px;padding:8px 10px;border:1px solid var(--u-color-outline-variant,#c4c6d0);border-radius:8px;font-family:inherit;user-select:none" });
  wordEl.setAttribute("role", "listbox");
  wordEl.tabIndex = 0;
  const hint = el5("div", { style: "font-size:12px;opacity:.75;margin-top:6px" }, tr4(lang, "Click a hyphen (or use \u2190 \u2192) to choose where the word breaks.", "Clique num h\xEDfen (ou use \u2190 \u2192) para escolher onde a palavra quebra."));
  const label = el5("div", { style: "margin-bottom:6px" }, tr4(lang, "Hyphenate at:", "Hifenizar em:"));
  const render = () => {
    const m = cur;
    const kids = [];
    let k = 0;
    for (const ch of m.word) {
      kids.push(document.createTextNode(ch));
      k++;
      if (!m.points.includes(k)) continue;
      const on = k === pick;
      const beyond = k > m.limit;
      const b = el5("span", { className: "uw-hyph-pt", textContent: "-", style: `cursor:${beyond ? "default" : "pointer"};padding:0 1px;border-radius:3px;${on ? "background:var(--u-color-primary,#005bc0);color:var(--u-color-on-primary,#fff);" : ""}${beyond ? "opacity:.4;" : ""}` });
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(on));
      const at = k;
      if (!beyond) b.addEventListener("click", () => {
        pick = at;
        render();
      });
      kids.push(b);
      if (k === m.limit) kids.push(el5("span", { textContent: "|", style: "opacity:.6;margin:0 1px" }));
    }
    wordEl.replaceChildren(...kids);
  };
  wordEl.addEventListener("keydown", (e) => {
    const m = cur;
    if (!m) return;
    const ok = m.points.filter((p) => p <= m.limit);
    const i = ok.indexOf(pick);
    if (e.key === "ArrowLeft" && i > 0) {
      pick = ok[i - 1];
      render();
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && i >= 0 && i < ok.length - 1) {
      pick = ok[i + 1];
      render();
      e.preventDefault();
    }
  });
  render();
  const title = (m) => `${tr4(lang, "Manual Hyphenation", "Hifeniza\xE7\xE3o Manual")}: ${languageName(m.lang, lang)}`;
  let busy = false;
  const step = async (id) => {
    if (!cur || busy) return;
    busy = true;
    try {
      if (id === "cancel") {
        ed.endManualHyphenation();
        dlg.close();
        return;
      }
      if (id === "yes") ed.applyManualHyphenation(pick);
      else ed.skipManualHyphenation();
      cur = await ed.nextManualHyphenation();
      if (!cur) {
        ed.endManualHyphenation();
        dlg.close();
        env.app.ui.flash(done);
        return;
      }
      pick = cur.suggested;
      dlg.setTitle(title(cur));
      render();
    } finally {
      busy = false;
    }
  };
  const dlg = openDialog({
    title: title(cur),
    icon: "horizontal_rule",
    body: el5("div", {}, label, wordEl, hint),
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "yes", label: L7("Yes", "Sim"), primary: true }, { id: "no", label: L7("No", "N\xE3o") }, { id: "cancel", label: env.app.ui.L.cancel }],
    onAction: (id) => {
      void step(id);
      return false;
    }
  });
  setTimeout(() => wordEl.focus(), 0);
  await dlg.result;
  ed.endManualHyphenation();
}
async function lineNumbersDialog(env, cur) {
  const lang = env.lang;
  const unit = indentUnit(lang);
  const autoTxt = tr4(lang, "Auto", "Autom\xE1tico");
  const [onL, onI] = check4("on", tr4(lang, "Add line numbering", "Adicionar numera\xE7\xE3o de linha"), cur.on);
  const num3 = (name, v, [lo, hi]) => el5("input", { type: "number", name, value: String(v), min: String(lo), max: String(hi), step: "1", style: "width:110px" });
  const start = num3("start", cur.startAt, LINE_NUMBER_LIMITS.startAt);
  const count = num3("count", cur.countBy, LINE_NUMBER_LIMITS.countBy);
  const dist = el5("input", { type: "text", name: "distance", inputMode: "decimal", value: cur.distanceTwips ? formatMeasure(cur.distanceTwips, unit, lang) : autoTxt, style: "width:110px" });
  dist.addEventListener("focus", () => dist.select());
  const restart = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:4px;margin-left:8px" },
    radio3("restart", "page", tr4(lang, "Restart each page", "Reiniciar cada p\xE1gina"), cur.restart === "page"),
    radio3("restart", "section", tr4(lang, "Restart each section", "Reiniciar cada se\xE7\xE3o"), cur.restart === "section"),
    radio3("restart", "continuous", tr4(lang, "Continuous", "Cont\xEDnua"), cur.restart === "continuous")
  );
  const grid2 = el5(
    "div",
    { className: "uo-dialog-grid" },
    el5("span", {}, tr4(lang, "Start at:", "Iniciar em:")),
    start,
    el5("span", {}, tr4(lang, "From text:", "Do texto:")),
    dist,
    el5("span", {}, tr4(lang, "Count by:", "Contar por:")),
    count
  );
  const opts = el5("div", { style: "display:flex;flex-direction:column;gap:10px" }, grid2, el5("strong", {}, tr4(lang, "Numbering:", "Numera\xE7\xE3o:")), restart);
  const sync = () => {
    for (const i of opts.querySelectorAll("input")) i.disabled = !onI.checked;
  };
  onI.addEventListener("change", sync);
  sync();
  const body = el5("div", { style: "display:flex;flex-direction:column;gap:12px" }, onL, opts);
  const dlg = openDialog({
    title: tr4(lang, "Line Numbers", "N\xFAmeros de Linha"),
    icon: "format_list_numbered",
    body,
    layer: env.layer,
    lang,
    width: 380,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await dlg.result !== "ok") return null;
  const ds = dist.value.trim();
  const d = ds === "" || ds.toLowerCase() === autoTxt.toLowerCase() ? 0 : parseMeasure(ds, unit);
  return {
    on: onI.checked,
    startAt: Number(start.value) || 1,
    countBy: Number(count.value) || 1,
    distanceTwips: d ?? cur.distanceTwips,
    restart: radioValue(restart, "restart") || "page"
  };
}

// src/chrome-shape.ts
var L8 = (en, pt) => ({ en, pt });
var WRAPS2 = [
  ["inline", "In Line with Text", "Alinhado ao Texto", "format_align_left"],
  ["square", "Square", "Quadrado", "wrap_text"],
  ["tight", "Tight", "Comprimido", "wrap_text"],
  ["through", "Through", "Atrav\xE9s", "wrap_text"],
  ["topAndBottom", "Top and Bottom", "Superior e Inferior", "vertical_align_center"],
  ["behind", "Behind Text", "Atr\xE1s do Texto", "flip_to_back"],
  ["front", "In Front of Text", "Na Frente do Texto", "flip_to_front"]
];
var ALIGNS2 = [
  ["left", "Align Left", "Alinhar \xE0 Esquerda", "align_horizontal_left"],
  ["center", "Align Center", "Centralizar", "align_horizontal_center"],
  ["right", "Align Right", "Alinhar \xE0 Direita", "align_horizontal_right"],
  ["top", "Align Top", "Alinhar Acima", "align_vertical_top"],
  ["middle", "Align Middle", "Alinhar ao Meio", "align_vertical_center"],
  ["bottom", "Align Bottom", "Alinhar Parte Inferior", "align_vertical_bottom"]
];
var DIRS = [
  ["horz", "Horizontal", "Horizontal", "format_textdirection_l_to_r"],
  ["vert", "Rotate all text 90\xB0", "Girar todo o texto 90\xB0", "text_rotation_down"],
  ["vert270", "Rotate all text 270\xB0", "Girar todo o texto 270\xB0", "text_rotate_up"]
];
var ANCHORS = [
  ["t", "Top", "Superior", "vertical_align_top"],
  ["ctr", "Middle", "Meio", "vertical_align_center"],
  ["b", "Bottom", "Inferior", "vertical_align_bottom"]
];
function pickImage2(cb) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.addEventListener("change", () => {
    const f = inp.files?.[0];
    if (!f) return;
    void f.arrayBuffer().then((b) => cb(new Uint8Array(b), (f.name.split(".").pop() || "png").toLowerCase()));
  });
  inp.click();
}
function registerShapeCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const shp = () => typeof api["selectedShape"] === "function" ? ed.selectedShape() : null;
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const on = () => canEdit3() && !!shp();
  const floating = () => on() && !shp().inline;
  const box = () => on() && !!shp().text;
  const s = (c) => ({ ...c, isEnabled: c.isEnabled ? () => on() && c.isEnabled() : on });
  const cmds = [
    // ── Inserir › Caixa de Texto: desenhar ──
    {
      id: "textbox:draw",
      label: L8("Draw Text Box", "Desenhar Caixa de Texto"),
      icon: "draw",
      supports: has("drawTextbox"),
      isEnabled: canEdit3,
      isChecked: () => typeof api["drawingTextbox"] === "function" && ed.drawingTextbox(),
      run: () => ed.drawingTextbox() ? ed.cancelDrawTextbox() : ed.drawTextbox(false)
    },
    { id: "textbox:drawVertical", label: L8("Draw Vertical Text Box", "Desenhar Caixa de Texto Vertical"), icon: "text_rotate_vertical", supports: has("drawTextbox"), isEnabled: canEdit3, run: () => ed.drawTextbox(true) },
    // ── Organizar ──
    ...WRAPS2.map(([k, en, pt, icon]) => s({ id: `shp:wrap:${k}`, label: L8(en, pt), icon, supports: has("setShapeWrap"), run: () => ed.setShapeWrap(k), isChecked: () => shp()?.wrap === k })),
    s({ id: "shp:wrap:moveWithText", label: L8("Move with Text", "Mover com o Texto"), supports: has("setShapeMoveWithText"), isEnabled: floating, run: () => ed.setShapeMoveWithText(true), isChecked: () => !!shp()?.moveWithText }),
    s({ id: "shp:wrap:fixOnPage", label: L8("Fix Position on Page", "Corrigir Posi\xE7\xE3o na P\xE1gina"), supports: has("setShapeMoveWithText"), isEnabled: floating, run: () => ed.setShapeMoveWithText(false), isChecked: () => !!shp() && !shp().inline && !shp().moveWithText }),
    s({ id: "shp:wrap:more", label: L8("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:wrap") }),
    s({ id: "shp:pos:inline", label: L8("In Line with Text", "Alinhado ao Texto"), icon: "format_align_left", supports: has("setShapePosition"), run: () => ed.setShapePosition("inline"), isChecked: () => !!shp()?.inline }),
    ...POSITION_PRESETS.map((q) => s({
      id: `shp:pos:${q.id}`,
      label: q.label,
      icon: positionIcon2(q.v, q.h),
      supports: has("setShapePosition"),
      run: () => ed.setShapePosition(q.id),
      isChecked: () => {
        const f = shp()?.format;
        return !!f && f.wrap === "square" && f.posH?.relativeFrom === "margin" && f.posH.align === q.h && f.posV?.relativeFrom === "margin" && f.posV.align === q.v;
      }
    })),
    s({ id: "shp:pos:more", label: L8("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:position") }),
    s({ id: "shp:forward", label: L8("Bring Forward", "Avan\xE7ar"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("forward") }),
    s({ id: "shp:front", label: L8("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("front") }),
    s({ id: "shp:frontOfText", label: L8("Bring in Front of Text", "Trazer para a Frente do Texto"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("frontOfText") }),
    s({ id: "shp:backward", label: L8("Send Backward", "Recuar"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("backward") }),
    s({ id: "shp:back", label: L8("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("back") }),
    s({ id: "shp:behindText", label: L8("Send Behind Text", "Enviar para Tr\xE1s do Texto"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("behindText") }),
    s({ id: "shp:rotate:right", label: L8("Rotate Right 90\xB0", "Girar 90\xB0 para a Direita"), icon: "rotate_right", supports: has("rotateShape"), run: () => ed.rotateShape(90) }),
    s({ id: "shp:rotate:left", label: L8("Rotate Left 90\xB0", "Girar 90\xB0 para a Esquerda"), icon: "rotate_left", supports: has("rotateShape"), run: () => ed.rotateShape(-90) }),
    s({ id: "shp:flip:v", label: L8("Flip Vertical", "Inverter Verticalmente"), icon: "flip", supports: has("flipShape"), run: () => ed.flipShape("v") }),
    s({ id: "shp:flip:h", label: L8("Flip Horizontal", "Inverter Horizontalmente"), icon: "flip", supports: has("flipShape"), run: () => ed.flipShape("h") }),
    s({ id: "shp:rotate:more", label: L8("More Rotation Options\u2026", "Mais Op\xE7\xF5es de Rota\xE7\xE3o..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:size") }),
    ...ALIGNS2.map(([k, en, pt, icon]) => s({ id: `shp:align:${k}`, label: L8(en, pt), icon, supports: has("alignShape"), isEnabled: floating, run: () => ed.alignShape(k) })),
    // vários objetos selecionados (Selecionar Objetos, Shift+clique): vãos iguais entre eles
    s({ id: "shp:distribute:h", label: L8("Distribute Horizontally", "Distribuir na Horizontal"), icon: "horizontal_distribute", supports: has("alignObjects"), isEnabled: () => ed.selectedObjectCount() >= 3, run: () => ed.alignObjects("distributeH") }),
    s({ id: "shp:distribute:v", label: L8("Distribute Vertically", "Distribuir na Vertical"), icon: "vertical_distribute", supports: has("alignObjects"), isEnabled: () => ed.selectedObjectCount() >= 3, run: () => ed.alignObjects("distributeV") }),
    s({ id: "shp:layout", label: L8("Layout Options\u2026", "Layout..."), icon: "aspect_ratio", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Texto ──
    ...DIRS.map(([k, en, pt, icon]) => s({ id: `shp:dir:${k}`, label: L8(en, pt), icon, supports: has("setTextboxOptions"), isEnabled: box, run: () => ed.setTextboxOptions({ direction: k }), isChecked: () => shp()?.text?.direction === k })),
    ...ANCHORS.map(([k, en, pt, icon]) => s({ id: `shp:anchor:${k}`, label: L8(en, pt), icon, supports: has("setTextboxOptions"), isEnabled: box, run: () => ed.setTextboxOptions({ anchor: k }), isChecked: () => shp()?.text?.anchor === k })),
    s({ id: "shp:textOptions", label: L8("Text Box Options\u2026", "Op\xE7\xF5es da Caixa de Texto..."), icon: "tune", supports: has("setTextboxOptions"), isEnabled: box, run: () => ctl.pictureDialog("format:layout") }),
    s({
      id: "shp:link",
      label: L8("Create Link", "Criar V\xEDnculo"),
      tip: L8("Create Link: the text continues in the next text box you click (it must be empty)", "Criar V\xEDnculo: o texto continua na pr\xF3xima caixa de texto que voc\xEA clicar (ela precisa estar vazia)"),
      icon: "link",
      supports: has("createTextboxLink"),
      isEnabled: () => box() && !shp().link?.next,
      isChecked: () => typeof api["linkingTextbox"] === "function" && ed.linkingTextbox(),
      run: () => ed.linkingTextbox() ? ed.cancelTextboxLink() : ed.createTextboxLink()
    }),
    s({ id: "shp:unlink", label: L8("Break Link", "Quebrar V\xEDnculo"), icon: "link_off", supports: has("breakTextboxLink"), isEnabled: () => box() && !!shp().link?.next, run: () => ed.breakTextboxLink() }),
    s({ id: "shp:setDefault", label: L8("Set as Default Text Box", "Definir como Caixa de Texto Padr\xE3o"), icon: "check", supports: has("setAsDefaultTextbox"), isEnabled: box, run: () => ed.setAsDefaultTextbox() }),
    // ── Estilos de Forma ──
    s({ id: "shp:fill:none", label: L8("No Fill", "Sem Preenchimento"), icon: "format_color_reset", supports: has("setShapeFill"), isEnabled: () => shp()?.kind !== "group", run: () => ed.setShapeFill(null), isChecked: () => shp()?.format && "fill" in shp().format ? shp().format.fill.kind === "none" : false }),
    s({ id: "shp:outline:none", label: L8("No Outline", "Sem Contorno"), icon: "border_clear", supports: has("setShapeOutline"), isEnabled: () => shp()?.kind !== "group", run: () => ed.setShapeOutline({ color: null }), isChecked: () => shp()?.format.line?.fill === null }),
    { id: "shp:format", label: L8("Format Shape\u2026", "Formatar Forma..."), icon: "tune", supports: has("setShapeFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:line") },
    s({ id: "shp:editText", label: L8("Edit Text", "Editar Texto"), icon: "edit", supports: has("editSelectedTextbox"), isEnabled: () => box() && !shp().editingText, run: () => ed.editSelectedTextbox() }),
    s({ id: "shp:delete", label: L8("Delete", "Excluir"), icon: "delete", supports: has("deleteSelectedShape"), run: () => ed.deleteSelectedShape() }),
    // ── Acessibilidade ──
    s({ id: "shp:alt", label: L8("Alt Text", "Texto Alt"), tip: L8("Alt Text: describe the shape for people who use screen readers", "Texto Alt: descreva a forma para quem usa leitor de tela"), icon: "accessibility_new", supports: has("setShapeAltText"), run: () => ctl.pictureDialog("alt") })
  ];
  reg.add(...cmds);
}
function positionIcon2(v, h) {
  const x = h === "left" ? 240 : h === "center" ? 400 : 560, y = v === "top" ? -760 : v === "center" ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x} ${y}h160v120H${x}z"/>`;
}
var shapeWrapMenu = () => [...WRAPS2.map(([k]) => `shp:wrap:${k}`), "-", "shp:wrap:moveWithText", "shp:wrap:fixOnPage", "-", "shp:wrap:more"];
var shapePositionMenu = () => ["shp:pos:inline", "-", ...POSITION_PRESETS.map((q) => `shp:pos:${q.id}`), "-", "shp:pos:more"];
var shapeRotateMenu = () => ["shp:rotate:right", "shp:rotate:left", "shp:flip:v", "shp:flip:h", "-", "shp:rotate:more"];
var shapeAlignMenu = () => [...ALIGNS2.slice(0, 3).map(([k]) => `shp:align:${k}`), "-", ...ALIGNS2.slice(3).map(([k]) => `shp:align:${k}`), "-", "shp:distribute:h", "shp:distribute:v", "-", "pic:align:to:page", "pic:align:to:margin"];
var dirMenu = () => [...DIRS.map(([k]) => `shp:dir:${k}`), "-", "shp:textOptions"];
var anchorMenu = () => [...ANCHORS.map(([k]) => `shp:anchor:${k}`), "-", "shp:textOptions"];
function colorIn(xml) {
  if (!xml) return null;
  const m = /<a:(schemeClr|srgbClr|prstClr|sysClr) val="([^"]+)"(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xml);
  if (!m) return null;
  const mods = [...(m[3] ?? "").matchAll(/<a:(\w+) val="(-?\d+)"\/>/g)].map((x) => [x[1], Number(x[2])]);
  return { kind: m[1], val: m[2], ...mods.length ? { mods } : {} };
}
function styleLook(n, hex) {
  const [sp, st] = SHAPE_STYLE_PRESETS[n - 1];
  const ref = (tag) => /<a:(\w+Ref) idx="(\w+)">([\s\S]*?)<\/a:\1>/g;
  const refs = /* @__PURE__ */ new Map();
  for (const m of st.matchAll(ref(""))) refs.set(m[1], { idx: m[2], color: colorIn(m[3]) });
  const text = hex(refs.get("fontRef")?.color ?? { kind: "schemeClr", val: "dk1" }) ?? "000000";
  let fill = null, line2 = null, lw = 1;
  if (n <= 42) {
    const fr = refs.get("fillRef"), lr = refs.get("lnRef");
    const fc = fr?.color ? hex(fr.color) : void 0;
    if (fc && fr.idx !== "0") fill = fr.idx === "1" ? [fc] : [lighten(fc, fr.idx === "2" ? 0.35 : 0.2), fc];
    const lc = lr?.color ? hex(lr.color) : void 0;
    if (lc && lr.idx !== "0") {
      line2 = lc;
      lw = lr.idx === "3" ? 2 : 1;
    }
  } else {
    if (/^<a:solidFill>/.test(sp)) {
      const c = colorIn(sp);
      if (c) fill = [hex(c) ?? "FFFFFF"];
    } else if (/^<a:gradFill/.test(sp)) {
      const stops = [...sp.matchAll(/<a:gs pos="\d+">([\s\S]*?)<\/a:gs>/g)].map((g) => colorIn(g[1]));
      fill = stops.filter((c) => !!c).map((c) => hex(c) ?? "FFFFFF");
    }
    const ln = /<a:ln\b[^>]*?(?:w="(\d+)")?[^>]*>([\s\S]*?)<\/a:ln>/.exec(sp);
    if (ln && !/<a:noFill\/>/.test(ln[2])) {
      const c = colorIn(ln[2]);
      if (c) {
        line2 = hex(c) ?? null;
        lw = Math.max(1, Number(ln[1] ?? 12700) / 12700);
      }
    }
  }
  return { fill, line: line2, lw, text };
}
function lighten(hex, k) {
  const n = parseInt(hex, 16);
  const ch = (s) => Math.round((n >> s & 255) + (255 - (n >> s & 255)) * k);
  return [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function styleThumb(tile, n, hex) {
  const W = 56, H = 40, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext("2d");
  x.scale(dpr, dpr);
  const lk = styleLook(n, hex);
  const r = { x: 4, y: 4, w: W - 8, h: H - 8 };
  if (lk.fill?.length) {
    if (lk.fill.length > 1) {
      const g = x.createLinearGradient(0, r.y, 0, r.y + r.h);
      lk.fill.forEach((f, i) => g.addColorStop(i / (lk.fill.length - 1), `#${f}`));
      x.fillStyle = g;
    } else x.fillStyle = `#${lk.fill[0]}`;
    x.fillRect(r.x, r.y, r.w, r.h);
  }
  if (lk.line) {
    x.strokeStyle = `#${lk.line}`;
    x.lineWidth = lk.lw;
    x.strokeRect(r.x, r.y, r.w, r.h);
  }
  x.fillStyle = `#${lk.text}`;
  x.font = "12px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("Abc", W / 2, H / 2 + 1);
  tile.replaceChildren(c);
}
function templateThumb(tile, id, ed, lang) {
  const W = 84, H = 108, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.cssText = `width:${W}px;height:${H}px;display:block;margin:auto`;
  const x = c.getContext("2d");
  x.scale(dpr, dpr);
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#c8c8c8";
  x.strokeRect(0.5, 0.5, W - 1, H - 1);
  const accent = ed.documentThemeColors()["accent1"] ?? "156082";
  const sp = textboxTemplateSpec(id, { accent, lang });
  if (sp) {
    const k = W / (8.5 * 914400);
    const mw = 6.5 * 914400 * k, ml = 914400 * k;
    let w = sp.sizeRelH ? sp.sizeRelH.pct / 1e5 * (sp.sizeRelH.relativeFrom === "page" ? W : mw) : sp.cx * k;
    let h = sp.sizeRelV ? sp.sizeRelV.pct / 1e5 * H : Math.min(sp.cy * k, H * 0.4);
    w = Math.min(w, W);
    h = Math.min(h, H);
    const bx = sp.posH.relativeFrom === "page" ? sp.posH.align === "right" ? W - w : 0 : ml + (sp.posH.align === "right" ? mw - w : sp.posH.align === "center" ? (mw - w) / 2 : 0);
    const by = sp.posV.relativeFrom === "page" ? 0 : 24;
    x.fillStyle = "#d8d8d8";
    for (let ly = 14; ly < H - 10; ly += 7) {
      const inBox = ly >= by - 4 && ly <= by + h + 4;
      if (inBox && sp.wrap !== "none") {
        if (bx > ml + 8) x.fillRect(ml, ly, bx - ml - 4, 2);
        if (bx + w < ml + mw - 8) x.fillRect(bx + w + 4, ly, ml + mw - bx - w - 4, 2);
      } else x.fillRect(ml, ly, mw, 2);
    }
    const hex = (cc) => ed.resolveDmlColor(cc);
    const f = sp.fill;
    x.fillStyle = f.kind === "solid" ? `#${hex(f.color) ?? "ffffff"}` : "#ffffff";
    x.fillRect(bx, by, w, h);
    if (sp.line) {
      x.strokeStyle = `#${hex(sp.line.fill) ?? "000000"}`;
      x.lineWidth = 1;
      x.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    }
    const dark = f.kind === "solid" && /accent1"?$/.test(JSON.stringify(f.color.val)) && !(f.color.mods ?? []).length;
    x.fillStyle = dark ? "rgba(255,255,255,.8)" : `#${accent}`;
    for (let ly = by + 6; ly < by + h - 4 && ly < by + 40; ly += 6) x.fillRect(bx + 5, ly, Math.max(4, w - 10), 2);
  }
  tile.replaceChildren(c);
}
function textboxMenu(env, ctx) {
  const ed = env.ed;
  const lang = ctx.lang === "pt" ? "pt" : "en";
  const all = ed.textboxTemplates();
  const mine = all.filter((t2) => t2.user);
  const isBox = () => typeof ed.selectedShape === "function" && ed.selectedShape()?.kind === "textbox" && !ed.isProtected();
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: L8("Built-In", "Internos"), items: all.filter((t2) => !t2.user).map((t2) => ({ id: t2.id, label: t2.name })) },
          { label: L8("General", "Geral"), items: mine.map((t2) => ({ id: t2.id, label: t2.name })) }
        ],
        tile: { w: 92, h: 116 },
        cols: 3,
        close,
        text: (l) => ctx.registry.text(l),
        render: (tile, it) => it.id.startsWith("user:") ? userThumb(tile, it.label) : templateThumb(tile, it.id, ed, lang),
        onPick: (id) => {
          ed.insertTextbox(id);
          ctx.after();
        }
      })
    },
    "-",
    "textbox:draw",
    "textbox:drawVertical",
    {
      id: "textbox:save",
      label: L8("Save Selection to Text Box Gallery\u2026", "Salvar Sele\xE7\xE3o na Galeria de Caixas de Texto..."),
      icon: "save",
      disabled: !isBox(),
      onClick: () => {
        void promptDialog({ title: L8("Create New Building Block", "Criar Novo Bloco de Constru\xE7\xE3o"), label: L8("Name", "Nome"), value: ed.selectedShape()?.name ?? "", layer: env.root.querySelector(".uw-layer") ?? void 0, lang }).then((n) => {
          if (n !== null) ed.saveSelectionToTextboxGallery(n);
          ctx.after();
        });
      }
    },
    ...mine.length ? [{
      id: "textbox:remove",
      label: L8("Remove from Gallery", "Remover da Galeria"),
      icon: "delete",
      submenu: () => mine.map((t2) => ({ id: `textbox:rm:${t2.id}`, label: t2.name, onClick: () => {
        ed.removeTextboxGalleryItem(t2.id);
        ctx.after();
      } }))
    }] : []
  ];
}
function userThumb(tile, name) {
  tile.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:78px;height:96px;margin:auto;border:1px solid #c8c8c8;background:#fff;font-size:11px;color:#333;text-align:center;padding:4px;box-sizing:border-box;overflow:hidden">${name.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])}</span>`;
}
function fillMenu(env, ctx) {
  const ed = env.ed;
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            ed.setShapeFill(dmlFromPick(v, colors));
            ctx.after();
          }
        });
      }
    },
    "shp:fill:none",
    {
      id: "shp:fill:more",
      label: L8("More Fill Colors\u2026", "Mais Cores de Preenchimento..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setShapeFill({ kind: "srgbClr", val: inp.value.slice(1).toUpperCase() });
          ctx.after();
        });
        inp.click();
      }
    },
    { id: "shp:fill:picture", label: L8("Picture\u2026", "Imagem..."), icon: "image", onClick: () => pickImage2((d, ext) => {
      void ed.setShapePictureFill(d, ext, false).then(() => ctx.after());
    }) },
    {
      id: "shp:fill:gradient",
      label: L8("Gradient", "Gradiente"),
      icon: "format_color_fill",
      submenu: () => [{
        content: (close) => {
          const vars = ed.shapeGradientVariations();
          return tileGrid({
            sections: [
              { label: L8("Light Variations", "Varia\xE7\xF5es Claras"), items: vars.filter((v) => !v.dark).map((v) => ({ id: v.id, label: L8(v.id, v.id) })) },
              { label: L8("Dark Variations", "Varia\xE7\xF5es Escuras"), items: vars.filter((v) => v.dark).map((v) => ({ id: v.id, label: L8(v.id, v.id) })) }
            ],
            tile: { w: 40, h: 40 },
            cols: 4,
            close,
            text: (l) => ctx.registry.text(l),
            render: (tile, it) => {
              const v = vars.find((q) => q.id === it.id);
              const f = v.fill;
              const cs = f.stops.map((st) => `#${ed.resolveDmlColor(st.color) ?? "ffffff"}`);
              const deg = 90 + (f.lin?.ang ?? 0) / 6e4;
              tile.innerHTML = `<span style="display:block;width:30px;height:30px;margin:auto;background:linear-gradient(${deg}deg,${cs.join(",")})"></span>`;
            },
            onPick: (id) => {
              const v = vars.find((q) => q.id === id);
              if (v) ed.setShapeFill(v.fill);
              ctx.after();
            }
          });
        }
      }, "-", { id: "shp:fill:gradOptions", label: L8("More Gradients\u2026", "Mais Gradientes..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:line") }]
    },
    { id: "shp:fill:texture", label: L8("Texture\u2026", "Textura..."), icon: "grid_on", onClick: () => pickImage2((d, ext) => {
      void ed.setShapePictureFill(d, ext, true).then(() => ctx.after());
    }) }
  ];
}
function outlineMenu(env, ctx) {
  const ed = env.ed;
  const st = () => ed.selectedShape();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            ed.setShapeOutline({ color: dmlFromPick(v, colors) });
            ctx.after();
          }
        });
      }
    },
    "shp:outline:none",
    {
      id: "shp:outline:more",
      label: L8("More Outline Colors\u2026", "Mais Cores de Contorno..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setShapeOutline({ color: { kind: "srgbClr", val: inp.value.slice(1).toUpperCase() } });
          ctx.after();
        });
        inp.click();
      }
    },
    "-",
    {
      id: "shp:outline:weight",
      label: L8("Weight", "Espessura"),
      icon: "line_weight",
      submenu: () => LINE_WEIGHTS_PT.map((w) => ({
        id: `shp:outline:w:${w}`,
        label: `${String(w).replace(".", ctx.registry.text(L8(".", ",")))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st().format.line.w ?? 9525) / 12700 - w) < 0.01,
        onClick: () => {
          ed.setShapeOutline({ weightPt: w });
          ctx.after();
        }
      }))
    },
    {
      id: "shp:outline:dash",
      label: L8("Dashes", "Tracejados"),
      icon: "line_style",
      submenu: () => LINE_DASHES.map((d) => ({
        id: `shp:outline:d:${d.val}`,
        label: d.label,
        checked: (st()?.format.line?.dash ?? "solid") === d.val,
        onClick: () => {
          ed.setShapeOutline({ dash: d.val });
          ctx.after();
        }
      }))
    }
  ];
}
function changeShapeMenu(env, ctx) {
  return [{
    id: "shp:change",
    label: L8("Change Shape", "Alterar Forma"),
    icon: "shapes",
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g) => ({ label: g.label, items: g.shapes.map(([prst, en, pt]) => ({ id: prst, label: L8(en, pt) })) })),
        tile: { w: 30, h: 26 },
        cols: 10,
        close,
        text: (l) => ctx.registry.text(l),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => {
          env.ed.changeShape(id);
          ctx.after();
        }
      })
    }]
  }];
}
function shapeStylesGallery(env) {
  const ed = env.ed;
  const items = () => SHAPE_STYLE_PRESETS.map((_, i) => ({ id: String(i + 1), label: L8(`Style ${i + 1}`, `Estilo ${i + 1}`), section: i < 42 ? "theme" : "presets" }));
  return {
    gallery: {
      id: "shp:styles",
      label: L8("Shape Styles", "Estilos de Forma"),
      icon: "style",
      tile: { w: 60, h: 44 },
      rows: 1,
      maxCols: 6,
      minCols: 3,
      expandCols: 7,
      sections: [{ id: "theme", label: L8("Theme Styles", "Estilos do Tema") }, { id: "presets", label: L8("Presets", "Predefini\xE7\xF5es") }],
      supports: () => typeof ed.setShapeStyle === "function",
      isEnabled: () => !ed.isProtected() && !!ed.selectedShape() && ed.selectedShape().kind !== "group",
      items,
      version: () => JSON.stringify(ed.documentThemeColors()),
      selected: () => {
        const n = ed.selectedShape()?.styleIndex;
        return n ? String(n) : void 0;
      },
      render: (tile, it) => styleThumb(tile, Number(it.id), (c) => ed.resolveDmlColor(c)),
      onPick: (id) => ed.setShapeStyle(Number(id)),
      footer: () => ["shp:format"]
    }
  };
}
var measureWidget3 = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L8("Shape Height", "Altura da Forma") : L8("Shape Width", "Largura da Forma"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L8(".", ","));
    const cm = (pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const ptOf3 = (v) => {
      const n = parseFloat(v.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n / 2.54 * 72 : void 0;
    };
    const cur = () => {
      const s = env.ed.selectedShape();
      return s ? which === "height" ? s.heightPt : s.widthPt : 0;
    };
    const set = (v) => {
      env.ed.setShapeSize(which === "height" ? { heightPt: Math.max(0.1, v) } : { widthPt: Math.max(0.1, v) });
      ctx.after();
    };
    const apply = () => {
      const v = ptOf3(input.value);
      if (v !== void 0) set(v);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    });
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b, d, sy] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b.type = "button";
      b.className = "uo-btn";
      b.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b.innerHTML = symbol(sy);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => set(cur() + d * (72 / 25.4)));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof env.ed.selectedShape === "function",
      sync: () => {
        const s = env.ed.selectedShape();
        input.disabled = up.disabled = dn.disabled = !s || env.ed.isProtected();
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(which === "height" ? s.heightPt : s.widthPt) : "";
      }
    };
  }
});
var large2 = (cmd) => ({ cmd, size: "large" });
function shapeFormatGroups(env, ctx) {
  const has = (m) => () => typeof env.ed[m] === "function";
  return [
    { id: "shp-insert", label: L8("Insert Shapes", "Inserir Formas"), icon: "shapes", prio: 4, cells: [
      { rows: [
        [{ menu: () => changeShapeMenu(env, ctx), id: "shp:edit", label: L8("Edit Shape", "Editar Forma"), icon: "format_shapes", showLabel: true, supports: has("changeShape") }],
        [{ split: "textbox:draw", menu: ["textbox:draw", "textbox:drawVertical"], label: true }]
      ] }
    ] },
    { id: "shp-styles", label: L8("Shape Styles", "Estilos de Forma"), icon: "style", prio: 6, launcher: "shp:format", cells: [
      shapeStylesGallery(env),
      { rows: [
        [{ menu: () => fillMenu(env, ctx), id: "shp:fill", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", showLabel: true, supports: has("setShapeFill") }],
        [{ menu: () => outlineMenu(env, ctx), id: "shp:outline", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", showLabel: true, supports: has("setShapeOutline") }],
        [{ menu: () => effectsMenu(env, ctx, true), id: "shp:effects", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", showLabel: true, supports: has("setShapeEffect") }]
      ] }
    ] },
    { id: "shp-text", label: L8("Text", "Texto"), icon: "text_fields", prio: 5, cells: [
      { rows: [
        [{ menu: dirMenu, id: "shp:dir", label: L8("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", showLabel: true, supports: has("setTextboxOptions") }],
        [{ menu: anchorMenu, id: "shp:anchor", label: L8("Align Text", "Alinhar Texto"), icon: "vertical_align_center", showLabel: true, supports: has("setTextboxOptions") }],
        [{ cmd: "shp:link", label: true }, { cmd: "shp:unlink" }]
      ] }
    ] },
    { id: "shp-access", label: L8("Accessibility", "Acessibilidade"), icon: "accessibility_new", prio: 3, cells: [large2("shp:alt")] },
    { id: "shp-arrange", label: L8("Arrange", "Organizar"), icon: "layers", prio: 6, cells: [
      { menu: shapePositionMenu, id: "shp:position", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", size: "large", supports: has("setShapePosition") },
      { menu: shapeWrapMenu, id: "shp:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", size: "large", supports: has("setShapeWrap") },
      { rows: [
        [{ split: "shp:forward", menu: ["shp:forward", "shp:front", "shp:frontOfText"], label: true }],
        [{ split: "shp:backward", menu: ["shp:backward", "shp:back", "shp:behindText"], label: true }]
      ] },
      { rows: [
        [{ cmd: "pic:selectionPane", label: true }],
        [{ menu: shapeAlignMenu, id: "shp:align", label: L8("Align", "Alinhar"), icon: "align_horizontal_left", showLabel: true, supports: has("alignShape") }],
        [{ menu: shapeRotateMenu, id: "shp:rotate", label: L8("Rotate", "Girar"), icon: "rotate_90_degrees_cw", showLabel: true, supports: has("rotateShape") }]
      ] }
    ] },
    { id: "shp-size", label: L8("Size", "Tamanho"), icon: "aspect_ratio", prio: 5, launcher: "shp:layout", cells: [
      { rows: [[measureWidget3(env, "height")], [measureWidget3(env, "width")]] }
    ] }
  ];
}
function shapeCompactGroup(env, ctx) {
  const sel4 = () => typeof env.ed.selectedShape === "function" && !!env.ed.selectedShape();
  return {
    id: "shape",
    label: L8("Shape", "Forma"),
    icon: "format_shapes",
    prio: 7,
    items: [
      { menu: () => fillMenu(env, ctx), id: "shp:fill", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", supports: sel4 },
      { menu: () => outlineMenu(env, ctx), id: "shp:outline", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", supports: sel4 },
      { menu: () => effectsMenu(env, ctx, true), id: "shp:effects", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", supports: sel4 },
      { menu: () => [...dirMenu(), "-", ...anchorMenu(), "-", "shp:link", "shp:unlink"], id: "shp:text", label: L8("Text", "Texto"), icon: "text_fields", supports: sel4 },
      { menu: shapeWrapMenu, id: "shp:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", supports: sel4 },
      { menu: shapePositionMenu, id: "shp:position", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", supports: sel4 },
      { menu: () => ["shp:forward", "shp:front", "shp:frontOfText", "-", "shp:backward", "shp:back", "shp:behindText"], id: "shp:order", label: L8("Arrange", "Organizar"), icon: "layers", supports: sel4 },
      { cmd: "shp:format" }
    ]
  };
}
function shapeMenu(env, ctx) {
  return {
    id: "shp:menu",
    label: L8("Shape", "Forma"),
    icon: "format_shapes",
    submenu: () => [
      { id: "shp:fillSub", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", submenu: () => fillMenu(env, ctx) },
      { id: "shp:outlineSub", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", submenu: () => outlineMenu(env, ctx) },
      { id: "shp:effectsSub", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", submenu: () => effectsMenu(env, ctx, true) },
      ...changeShapeMenu(env, ctx),
      "-",
      { id: "shp:dirSub", label: L8("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", submenu: dirMenu },
      { id: "shp:anchorSub", label: L8("Align Text", "Alinhar Texto"), icon: "vertical_align_center", submenu: anchorMenu },
      "shp:link",
      "shp:unlink",
      "-",
      { id: "shp:wrapSub", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: shapeWrapMenu },
      { id: "shp:posSub", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", submenu: shapePositionMenu },
      { id: "shp:rotSub", label: L8("Rotate", "Girar"), icon: "rotate_90_degrees_cw", submenu: shapeRotateMenu },
      "-",
      "shp:alt",
      "shp:layout",
      "shp:format",
      "-",
      "shp:delete"
    ]
  };
}
function shapeContextItems() {
  return [
    "cut",
    "copy",
    "paste",
    "-",
    "shp:editText",
    { id: "shp:ctx:front", label: L8("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", submenu: ["shp:front", "shp:forward", "shp:frontOfText"] },
    { id: "shp:ctx:back", label: L8("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", submenu: ["shp:back", "shp:backward", "shp:behindText"] },
    "-",
    "shp:link",
    "shp:unlink",
    { id: "shp:ctx:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: shapeWrapMenu },
    "shp:alt",
    "shp:setDefault",
    "shp:layout",
    "shp:format",
    "-",
    "shp:delete"
  ];
}

// src/chrome-effects.ts
var L9 = (en, pt) => ({ en, pt });
var tr5 = (lang, en, pt) => pickLabels(lang, { en, pt });
var el6 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
function fxColorOf(value, colors) {
  const p = parseThemePick(value, colors);
  if (!p) return { rgb: value.replace(/^#/, "").toUpperCase() };
  const slot = { text1: "tx1", background1: "bg1", text2: "tx2", background2: "bg2", dark1: "tx1", light1: "bg1", dark2: "tx2", light2: "bg2" };
  const mods = [];
  const frac = (h) => h ? 1 - parseInt(h, 16) / 255 : void 0;
  const tint = frac(p.tint), shade = frac(p.shade);
  if (tint !== void 0) {
    mods.push(["lumMod", Math.round((1 - tint) * 1e5)], ["lumOff", Math.round(tint * 1e5)]);
  }
  if (shade !== void 0) mods.push(["lumMod", Math.round((1 - shade) * 1e5)]);
  return { scheme: slot[p.themeColor] ?? p.themeColor, ...mods.length ? { mods } : {} };
}
function fxCss(fx, colors) {
  const hex = (c) => {
    const base = c.rgb ?? colors[{ tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" }[c.scheme ?? ""] ?? c.scheme ?? ""] ?? "000000";
    return `#${base}`;
  };
  const alpha = (c) => {
    const a = c.mods?.find(([k]) => k === "alpha")?.[1];
    return a !== void 0 ? 1 - a / 1e5 : 1;
  };
  const rgba = (c) => {
    const h = hex(c).slice(1);
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha(c)})`;
  };
  let css = "";
  const f = fx.fill;
  if (f?.type === "solid") css += `color:${rgba(f.color)};`;
  else if (f?.type === "grad") css += `background:linear-gradient(${(f.lin?.ang ?? 54e5) / 6e4 + 90}deg,${f.stops.map((s) => `${rgba(s.color)} ${s.pos / 1e3}%`).join(",")});-webkit-background-clip:text;background-clip:text;color:transparent;`;
  else if (f?.type === "none") css += "color:transparent;";
  if (fx.outline?.fill?.type === "solid") css += `-webkit-text-stroke:${Math.max(0.5, (fx.outline.w ?? 9525) / 12700)}px ${rgba(fx.outline.fill.color)};`;
  const shadows = [];
  if (fx.shadow) {
    const a = fx.shadow.dir / 6e4 * (Math.PI / 180), d = fx.shadow.dist / 12700 * 1.3;
    shadows.push(`${(Math.cos(a) * d).toFixed(1)}px ${(Math.sin(a) * d).toFixed(1)}px ${(fx.shadow.blurRad / 12700).toFixed(1)}px ${rgba(fx.shadow.color)}`);
  }
  if (fx.glow) shadows.push(`0 0 ${(fx.glow.rad / 12700).toFixed(1)}px ${rgba(fx.glow.color)}`, `0 0 ${(fx.glow.rad / 25400).toFixed(1)}px ${rgba(fx.glow.color)}`);
  if (shadows.length) css += `text-shadow:${shadows.join(",")};`;
  return css;
}
function textEffectsMenu(env, ctx) {
  const ed = env.ed;
  const colors = ed.documentThemeColors();
  const after = () => ctx.after();
  return [
    {
      content: (close) => tileGrid({
        sections: [{ items: TEXT_EFFECT_GALLERY.map((p, i) => ({ id: String(i), label: p.label })) }],
        tile: { w: 44, h: 44 },
        cols: 5,
        close,
        text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          const p = TEXT_EFFECT_GALLERY[Number(it.id)];
          b.replaceChildren(el6("span", { textContent: "A", style: `font:700 30px/1 Georgia, 'Times New Roman', serif;${fxCss(p.fx, colors)}` }));
        },
        onPick: (id) => {
          ed.applyTextEffectPreset(Number(id));
          after();
        }
      })
    },
    "-",
    { id: "fx:outlineMenu", label: L9("Outline", "Contorno"), icon: "border_color", submenu: () => outlineMenu2(env, ctx) },
    { id: "fx:shadowMenu", label: L9("Shadow", "Sombra"), icon: "opacity", submenu: () => shadowMenu(env, ctx) },
    { id: "fx:reflectionMenu", label: L9("Reflection", "Reflexo"), icon: "flip", submenu: () => reflectionMenu(env, ctx) },
    { id: "fx:glowMenu", label: L9("Glow", "Brilho"), icon: "auto_awesome", submenu: () => glowMenu(env, ctx) },
    { id: "fx:numberMenu", label: L9("Number Styles", "Estilos de N\xFAmero"), icon: "numbers", submenu: () => numberStylesMenu(env, ctx) },
    { id: "fx:ligatureMenu", label: L9("Ligatures", "Ligaduras"), icon: "text_fields", submenu: () => ligaturesMenu(env, ctx) },
    { id: "fx:setsMenu", label: L9("Stylistic Sets", "Conjuntos Estil\xEDsticos"), icon: "format_shapes", submenu: () => stylisticSetsMenu(env, ctx) }
  ];
}
function paletteGrid(env, ctx, onPick) {
  const colors = env.ed.documentThemeColors();
  return {
    content: (close) => {
      const box = el6("div", { className: "uw-palette" });
      const h = (t2) => el6("div", { className: "uo-tiles-h", textContent: t2 });
      box.append(
        h(ctx.registry.text(L9("Theme Colors", "Cores do Tema"))),
        colorGrid({ colors: themePaletteColors(colors), columns: 10, close, onPick: (v) => {
          onPick(fxColorOf(v, colors));
          ctx.after();
        } }),
        h(ctx.registry.text(L9("Standard Colors", "Cores Padr\xE3o"))),
        colorGrid({ colors: STANDARD_COLORS.map((x) => ({ value: x, css: `#${x}` })), columns: 10, close, onPick: (v) => {
          onPick(fxColorOf(v, colors));
          ctx.after();
        } })
      );
      return box;
    }
  };
}
function outlineMenu2(env, ctx) {
  const ed = env.ed;
  const cur = () => ed.textEffects().fx?.outline;
  const color = () => cur()?.fill?.type === "solid" ? cur().fill.color : { scheme: "accent1" };
  return [
    paletteGrid(env, ctx, (c) => ed.setTextEffects({ outline: outline(c, (cur()?.w ?? 9525) / 12700, cur()?.dash ?? "solid") })),
    { id: "fx:noOutline", label: L9("No Outline", "Sem Contorno"), icon: "format_color_reset", onClick: () => {
      ed.setTextEffects({ outline: null });
      ctx.after();
    } },
    { id: "fx:weight", label: L9("Weight", "Espessura"), icon: "line_weight", submenu: () => OUTLINE_WEIGHTS.map((w) => ({
      id: `fx:w:${w}`,
      label: `${String(w).replace(".", ctx.registry.text(L9(".", ",")))} pt`,
      checked: Math.abs((cur()?.w ?? -1) / 12700 - w) < 0.01,
      onClick: () => {
        ed.setTextEffects({ outline: outline(color(), w, cur()?.dash ?? "solid") });
        ctx.after();
      }
    })) },
    { id: "fx:dashes", label: L9("Dashes", "Tra\xE7os"), icon: "line_style", submenu: () => OUTLINE_DASHES.map(([d, lbl]) => ({
      id: `fx:d:${d}`,
      label: lbl,
      checked: (cur()?.dash ?? "") === d,
      onClick: () => {
        ed.setTextEffects({ outline: outline(color(), (cur()?.w ?? 9525) / 12700, d) });
        ctx.after();
      }
    })) }
  ];
}
function shadowMenu(env, ctx) {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.shadow ?? null);
  const grid2 = (group2, label) => ({ label, items: TEXT_SHADOW_PRESETS.filter((p) => p.group === group2).map((p) => ({ id: p.id, label: p.label })) });
  return [
    { id: "fx:noShadow", label: L9("No Shadow", "Sem Sombra"), icon: "cancel", checked: cur === "null", onClick: () => {
      ed.setTextEffects({ shadow: null });
      ctx.after();
    } },
    {
      content: (close) => tileGrid({
        sections: [grid2("outer", L9("Outer", "Externa")), grid2("persp", L9("Perspective", "Perspectiva"))],
        tile: { w: 44, h: 44 },
        cols: 3,
        close,
        text: (l) => ctx.registry.text(l),
        selected: TEXT_SHADOW_PRESETS.find((p) => JSON.stringify(p.shadow) === cur)?.id,
        render: (b, it) => {
          const p = TEXT_SHADOW_PRESETS.find((x) => x.id === it.id);
          b.replaceChildren(el6("span", { textContent: "A", style: `font:700 28px/1 Georgia, serif;${fxCss({ shadow: p.shadow }, ed.documentThemeColors())}` }));
        },
        onPick: (id) => {
          ed.setTextEffects({ shadow: TEXT_SHADOW_PRESETS.find((p) => p.id === id).shadow });
          ctx.after();
        }
      })
    },
    "-",
    "fx:pane"
  ];
}
function reflectionMenu(env, ctx) {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.reflection ?? null);
  return [
    { id: "fx:noReflection", label: L9("No Reflection", "Sem Reflexo"), icon: "cancel", checked: cur === "null", onClick: () => {
      ed.setTextEffects({ reflection: null });
      ctx.after();
    } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L9("Reflection Variations", "Varia\xE7\xF5es de Reflexo"), items: TEXT_REFLECTION_PRESETS.map((p) => ({ id: p.id, label: p.label })) }],
        tile: { w: 52, h: 52 },
        cols: 3,
        close,
        text: (l) => ctx.registry.text(l),
        selected: TEXT_REFLECTION_PRESETS.find((p) => JSON.stringify(p.reflection) === cur)?.id,
        render: (b, it) => {
          const p = TEXT_REFLECTION_PRESETS.find((x) => x.id === it.id);
          const gap = p.reflection.dist / 12700 * 0.6;
          const size = Math.round(p.reflection.endPos / 1e5 * 100);
          b.replaceChildren(el6("span", { textContent: "A", style: `font:700 24px/1 Georgia, serif;-webkit-box-reflect:below ${gap.toFixed(1)}px linear-gradient(transparent ${100 - size}%, rgba(0,0,0,.45))` }));
        },
        onPick: (id) => {
          ed.setTextEffects({ reflection: TEXT_REFLECTION_PRESETS.find((p) => p.id === id).reflection });
          ctx.after();
        }
      })
    },
    "-",
    "fx:pane"
  ];
}
function glowMenu(env, ctx) {
  const ed = env.ed;
  const cur = JSON.stringify(ed.textEffects().fx?.glow ?? null);
  const items = TEXT_GLOW_SIZES.flatMap((rad) => [1, 2, 3, 4, 5, 6].map((a) => ({ id: `${rad}:${a}`, label: L9(`Glow: ${rad / 12700} pt; Accent color ${a}`, `Brilho: ${String(rad / 12700).replace(".", ",")} pt; Cor de destaque ${a}`) })));
  const glowOf = (id) => {
    const [rad, a] = id.split(":").map(Number);
    return textGlow(rad, { scheme: `accent${a}` });
  };
  return [
    { id: "fx:noGlow", label: L9("No Glow", "Sem Brilho"), icon: "cancel", checked: cur === "null", onClick: () => {
      ed.setTextEffects({ glow: null });
      ctx.after();
    } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L9("Glow Variations", "Varia\xE7\xF5es de Brilho"), items }],
        tile: { w: 40, h: 40 },
        cols: 6,
        close,
        text: (l) => ctx.registry.text(l),
        selected: items.find((x) => JSON.stringify(glowOf(x.id)) === cur)?.id,
        render: (b, it) => {
          b.replaceChildren(el6("span", { textContent: "A", style: `font:700 22px/1 Georgia, serif;${fxCss({ glow: glowOf(it.id) }, ed.documentThemeColors())}` }));
        },
        onPick: (id) => {
          ed.setTextEffects({ glow: glowOf(id) });
          ctx.after();
        }
      })
    },
    { id: "fx:glowColors", label: L9("More Glow Colors", "Mais Cores de Brilho"), icon: "palette", submenu: () => [paletteGrid(env, ctx, (c) => ed.setTextEffects({ glow: textGlow(ed.textEffects().fx?.glow?.rad ?? 101600, c) }))] },
    "-",
    "fx:pane"
  ];
}
function numberStylesMenu(env, ctx) {
  const ed = env.ed;
  const ot = ed.textEffects().ot ?? {};
  return NUMBER_STYLES_OT.map((n) => ({
    id: `fx:num:${n.id}`,
    label: n.label,
    checked: (ot.numForm ?? "default") === n.numForm && (ot.numSpacing ?? "default") === n.numSpacing,
    onClick: () => {
      ed.setOpenType({ numForm: n.numForm === "default" ? null : n.numForm, numSpacing: n.numSpacing === "default" ? null : n.numSpacing });
      ctx.after();
    }
  }));
}
function ligaturesMenu(env, ctx) {
  const ed = env.ed;
  const cur = ed.textEffects().ot?.ligatures ?? "none";
  return LIGATURE_OPTIONS.map((o) => ({
    id: `fx:lig:${o.val}`,
    label: o.label,
    checked: cur === o.val,
    onClick: () => {
      ed.setOpenType({ ligatures: o.val === "none" ? null : o.val });
      ctx.after();
    }
  }));
}
function stylisticSetsMenu(env, ctx) {
  const ed = env.ed;
  const cur = ed.textEffects().ot?.stylisticSets ?? [];
  return [
    { id: "fx:ss:0", label: L9("Default", "Padr\xE3o"), checked: !cur.length, onClick: () => {
      ed.setOpenType({ stylisticSets: null });
      ctx.after();
    } },
    { content: (close) => tileGrid({
      sections: [{ label: L9("Individual", "Individual"), items: Array.from({ length: 20 }, (_v, i) => ({ id: String(i + 1), label: L9(`Set ${i + 1}`, `Conjunto ${i + 1}`) })) }],
      tile: { w: 40, h: 28 },
      cols: 5,
      close,
      text: (l) => ctx.registry.text(l),
      selected: cur.length === 1 ? String(cur[0]) : void 0,
      render: (b, it) => {
        b.replaceChildren(el6("span", { textContent: it.id, style: "font-size:12px" }));
      },
      onPick: (id) => {
        ed.setOpenType({ stylisticSets: [Number(id)] });
        ctx.after();
      }
    }) }
  ];
}
function fontGradientMenu(env, ctx) {
  const ed = env.ed;
  const items = (light) => GRADIENT_DIRECTIONS.map(([ang, l]) => ({ id: `${light ? "l" : "d"}:${ang}`, label: l }));
  const color = env.ctl.state().run.color;
  return [
    { id: "fx:noGradient", label: L9("No Gradient", "Nenhum Gradiente"), icon: "cancel", onClick: () => {
      ed.setTextGradient(null);
      ctx.after();
    } },
    {
      content: (close) => tileGrid({
        sections: [{ label: L9("Light Variations", "Varia\xE7\xF5es Claras"), items: items(true) }, { label: L9("Dark Variations", "Varia\xE7\xF5es Escuras"), items: items(false) }],
        tile: { w: 44, h: 44 },
        cols: 4,
        close,
        text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          const [k, ang] = it.id.split(":");
          const c = `#${color && /^[0-9A-Fa-f]{6}$/.test(color) ? color : "1F4E79"}`;
          const other = k === "l" ? `color-mix(in srgb, ${c} 20%, white)` : `color-mix(in srgb, ${c} 50%, black)`;
          b.replaceChildren(el6("span", { style: `display:block;width:30px;height:30px;border-radius:3px;background:linear-gradient(${Number(ang) + 90}deg, ${c}, ${other})` }));
        },
        onPick: (id) => {
          const [k, ang] = id.split(":");
          ed.setTextGradient({ angleDeg: Number(ang), light: k === "l" });
          ctx.after();
        }
      })
    },
    "-",
    "fx:pane"
  ];
}
function registerEffectsCommands(reg, ed, app, ctl) {
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const has = (m) => () => typeof ed[m] === "function";
  const cmds = [
    { id: "fx:pane", label: L9("Text Effects Options\u2026", "Op\xE7\xF5es de Efeitos de Texto..."), icon: "auto_awesome", supports: has("setTextEffects"), isEnabled: canEdit3, isChecked: () => !!paneOpen("uw-texteffects"), run: () => ctl.textEffectsPane() }
  ];
  reg.add(...cmds);
}
function openTextEffectsPane(o) {
  const { ed, lang } = o;
  const cur = paneOpen("uw-texteffects");
  if (cur) {
    cur.close();
    return null;
  }
  const num3 = (v, step = 0.5, min = 0, max = 200) => el6("input", { type: "number", value: String(Math.round(v * 100) / 100), step: String(step), min: String(min), max: String(max), style: "width:70px" });
  const colorIn2 = (hex) => el6("input", { type: "color", value: `#${hex}`, style: "width:44px;height:24px;padding:0" });
  const sel4 = (opts, v) => {
    const s = el6("select", { style: "min-width:120px" });
    for (const [k, t3] of opts) s.append(el6("option", { value: k, textContent: t3 }));
    s.value = v;
    return s;
  };
  const row3 = (label, ...kids) => el6("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px" }, el6("span", { textContent: label, style: "font-size:12px" }), el6("span", { style: "display:flex;gap:6px;align-items:center" }, ...kids));
  const section4 = (title, ...kids) => el6("details", { open: true, style: "border-bottom:1px solid color-mix(in srgb, currentColor 15%, transparent);padding:4px 0" }, el6("summary", { textContent: title, style: "font-weight:600;cursor:pointer" }), el6("div", { style: "display:flex;flex-direction:column;gap:6px;padding:6px 2px" }, ...kids));
  const hexOf2 = (c) => c?.rgb ?? "000000";
  const transOf = (c) => (c?.mods?.find(([k]) => k === "alpha")?.[1] ?? 0) / 1e3;
  const withT = (hex, t3) => ({ rgb: hex.replace("#", "").toUpperCase(), ...t3 > 0 ? { mods: [["alpha", Math.round(t3 * 1e3)]] } : {} });
  const fx = () => ed.textEffects().fx ?? {};
  const fillKind = sel4([["auto", tr5(lang, "Automatic", "Autom\xE1tico")], ["none", tr5(lang, "No fill", "Sem preenchimento")], ["solid", tr5(lang, "Solid fill", "Preenchimento s\xF3lido")], ["grad", tr5(lang, "Gradient fill", "Preenchimento gradiente")]], "auto");
  const fillColor = colorIn2("000000"), fillColor2 = colorIn2("FFFFFF");
  const fillT = num3(0, 1, 0, 100), gradAngle = num3(90, 15, 0, 359);
  const lineKind = sel4([["none", tr5(lang, "No line", "Sem linha")], ["solid", tr5(lang, "Solid line", "Linha s\xF3lida")]], "none");
  const lineColor = colorIn2("000000"), lineT = num3(0, 1, 0, 100), lineW = num3(0.75, 0.25, 0.25, 20);
  const lineDash = sel4(OUTLINE_DASHES.map(([d, l]) => [d, pickLabels(lang, l)]), "solid");
  const shOn = el6("input", { type: "checkbox" });
  const shColor = colorIn2("000000"), shT = num3(60, 1, 0, 100), shBlur = num3(4, 0.5, 0, 100), shAng = num3(45, 1, 0, 359), shDist = num3(3, 0.5, 0, 200);
  const rfOn = el6("input", { type: "checkbox" });
  const rfT = num3(45, 1, 0, 100), rfSize = num3(45, 1, 1, 100), rfBlur = num3(0.5, 0.5, 0, 100), rfDist = num3(0, 0.5, 0, 100);
  const glOn = el6("input", { type: "checkbox" });
  const glColor = colorIn2("4472C4"), glSize = num3(8, 1, 0, 150), glT = num3(60, 1, 0, 100);
  const threeD = el6("div", { style: "font-size:12px;opacity:.75" });
  const load = () => {
    const f = fx();
    fillKind.value = f.fill?.type === "grad" ? "grad" : f.fill?.type === "solid" ? "solid" : f.fill?.type === "none" ? "none" : "auto";
    if (f.fill?.type === "solid") {
      fillColor.value = `#${hexOf2(f.fill.color)}`;
      fillT.value = String(transOf(f.fill.color));
    }
    if (f.fill?.type === "grad") {
      fillColor.value = `#${hexOf2(f.fill.stops[0]?.color)}`;
      fillColor2.value = `#${hexOf2(f.fill.stops[f.fill.stops.length - 1]?.color)}`;
      gradAngle.value = String((f.fill.lin?.ang ?? 54e5) / 6e4);
    }
    const ol = f.outline;
    lineKind.value = ol?.fill?.type === "solid" ? "solid" : "none";
    if (ol?.fill?.type === "solid") {
      lineColor.value = `#${hexOf2(ol.fill.color)}`;
      lineT.value = String(transOf(ol.fill.color));
    }
    if (ol?.w !== void 0) lineW.value = String(ol.w / 12700);
    lineDash.value = ol?.dash ?? "solid";
    shOn.checked = !!f.shadow;
    if (f.shadow) {
      shColor.value = `#${hexOf2(f.shadow.color)}`;
      shT.value = String(transOf(f.shadow.color));
      shBlur.value = String(f.shadow.blurRad / 12700);
      shAng.value = String(f.shadow.dir / 6e4);
      shDist.value = String(f.shadow.dist / 12700);
    }
    rfOn.checked = !!f.reflection;
    if (f.reflection) {
      rfT.value = String(Math.round(100 - f.reflection.stA / 1e3));
      rfSize.value = String(Math.round(f.reflection.endPos / 1e3));
      rfBlur.value = String(f.reflection.blurRad / 12700);
      rfDist.value = String(f.reflection.dist / 12700);
    }
    glOn.checked = !!f.glow;
    if (f.glow) {
      glColor.value = `#${hexOf2(f.glow.color)}`;
      glSize.value = String(f.glow.rad / 12700);
      glT.value = String(transOf(f.glow.color));
    }
    threeD.textContent = f.props3d || f.scene3d ? tr5(lang, "3-D format kept (drawn flat).", "Formato 3D preservado (desenhado plano).") : "";
  };
  const n = (i) => Number(i.value) || 0;
  const apply = (part) => {
    if (part === "fill") {
      const k = fillKind.value;
      ed.setTextEffects({ fill: k === "auto" ? null : k === "none" ? { type: "none" } : k === "solid" ? { type: "solid", color: withT(fillColor.value, n(fillT)) } : { type: "grad", stops: [{ pos: 0, color: withT(fillColor.value, n(fillT)) }, { pos: 1e5, color: withT(fillColor2.value, n(fillT)) }], lin: { ang: Math.round(n(gradAngle) * 6e4), scaled: false } } });
    } else if (part === "outline") {
      ed.setTextEffects({ outline: lineKind.value === "none" ? null : { ...outline(withT(lineColor.value, n(lineT)), n(lineW), lineDash.value) } });
    } else if (part === "shadow") {
      ed.setTextEffects({ shadow: !shOn.checked ? null : { blurRad: Math.round(n(shBlur) * 12700), dist: Math.round(n(shDist) * 12700), dir: Math.round(n(shAng) * 6e4), sx: 1e5, sy: 1e5, kx: 0, ky: 0, algn: "tl", color: withT(shColor.value, n(shT)) } });
    } else if (part === "reflection") {
      ed.setTextEffects({ reflection: !rfOn.checked ? null : { blurRad: Math.round(n(rfBlur) * 12700), stA: Math.round((100 - n(rfT)) * 1e3), stPos: 0, endA: 300, endPos: Math.round(n(rfSize) * 1e3), dist: Math.round(n(rfDist) * 12700), dir: 54e5, fadeDir: 54e5, sx: 1e5, sy: -1e5, kx: 0, ky: 0, algn: "bl" } });
    } else {
      ed.setTextEffects({ glow: !glOn.checked ? null : { rad: Math.round(n(glSize) * 12700), color: withT(glColor.value, n(glT)) } });
    }
    o.after();
  };
  for (const x of [fillKind, fillColor, fillColor2, fillT, gradAngle]) x.addEventListener("change", () => apply("fill"));
  for (const x of [lineKind, lineColor, lineT, lineW, lineDash]) x.addEventListener("change", () => apply("outline"));
  for (const x of [shOn, shColor, shT, shBlur, shAng, shDist]) x.addEventListener("change", () => apply("shadow"));
  for (const x of [rfOn, rfT, rfSize, rfBlur, rfDist]) x.addEventListener("change", () => apply("reflection"));
  for (const x of [glOn, glColor, glSize, glT]) x.addEventListener("change", () => apply("glow"));
  const t2 = (en, pt) => tr5(lang, en, pt);
  const body = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:4px;padding:4px;font-size:13px" },
    section4(t2("Text Fill", "Preenchimento do Texto"), row3(t2("Fill", "Preenchimento"), fillKind), row3(t2("Color", "Cor"), fillColor, fillColor2), row3(t2("Transparency (%)", "Transpar\xEAncia (%)"), fillT), row3(t2("Gradient angle (\xB0)", "\xC2ngulo do gradiente (\xB0)"), gradAngle)),
    section4(t2("Text Outline", "Contorno do Texto"), row3(t2("Line", "Linha"), lineKind), row3(t2("Color", "Cor"), lineColor), row3(t2("Transparency (%)", "Transpar\xEAncia (%)"), lineT), row3(t2("Width (pt)", "Largura (pt)"), lineW), row3(t2("Dash type", "Tipo de tra\xE7o"), lineDash)),
    section4(t2("Shadow", "Sombra"), row3(t2("Shadow", "Sombra"), shOn), row3(t2("Color", "Cor"), shColor), row3(t2("Transparency (%)", "Transpar\xEAncia (%)"), shT), row3(t2("Blur (pt)", "Desfoque (pt)"), shBlur), row3(t2("Angle (\xB0)", "\xC2ngulo (\xB0)"), shAng), row3(t2("Distance (pt)", "Dist\xE2ncia (pt)"), shDist)),
    section4(t2("Reflection", "Reflexo"), row3(t2("Reflection", "Reflexo"), rfOn), row3(t2("Transparency (%)", "Transpar\xEAncia (%)"), rfT), row3(t2("Size (%)", "Tamanho (%)"), rfSize), row3(t2("Blur (pt)", "Desfoque (pt)"), rfBlur), row3(t2("Distance (pt)", "Dist\xE2ncia (pt)"), rfDist)),
    section4(t2("Glow", "Brilho"), row3(t2("Glow", "Brilho"), glOn), row3(t2("Color", "Cor"), glColor), row3(t2("Size (pt)", "Tamanho (pt)"), glSize), row3(t2("Transparency (%)", "Transpar\xEAncia (%)"), glT)),
    section4(t2("3-D Format", "Formato 3D"), threeD)
  );
  load();
  openPane({ id: "uw-texteffects", title: L9("Format Text Effects", "Formatar Efeitos de Texto"), lang, layer: o.layer, frame: o.frame, width: 300, body, onClose: () => {
    ed.classList.remove("uw-has-pane");
    o.after();
  } });
  ed.classList.add("uw-has-pane");
  return { sync: () => {
    const a = document.activeElement;
    if (!a || !body.contains(a)) load();
  } };
}

// src/chrome-home.ts
var L10 = (en, pt) => ({ en, pt });
var UNDERLINE_MENU = [
  ["single", L10("Underline", "Sublinhado")],
  ["double", L10("Double underline", "Sublinhado duplo")],
  ["thick", L10("Thick underline", "Sublinhado grosso")],
  ["dotted", L10("Dotted underline", "Sublinhado pontilhado")],
  ["dash", L10("Dashed underline", "Sublinhado tracejado")],
  ["dotDash", L10("Dot-dash underline", "Sublinhado tra\xE7o-ponto")],
  ["dotDotDash", L10("Dot-dot-dash underline", "Sublinhado tra\xE7o-ponto-ponto")],
  ["wave", L10("Wave underline", "Sublinhado ondulado")]
];
var UNDERLINE_ALL = [
  ["single", L10("Single", "Simples")],
  ["words", L10("Words only", "Somente palavras")],
  ["double", L10("Double", "Duplo")],
  ["thick", L10("Thick", "Grosso")],
  ["dotted", L10("Dotted", "Pontilhado")],
  ["dottedHeavy", L10("Dotted heavy", "Pontilhado grosso")],
  ["dash", L10("Dashed", "Tracejado")],
  ["dashedHeavy", L10("Dashed heavy", "Tracejado grosso")],
  ["dashLong", L10("Long dashed", "Tracejado longo")],
  ["dashLongHeavy", L10("Long dashed heavy", "Tracejado longo grosso")],
  ["dotDash", L10("Dot dash", "Tra\xE7o-ponto")],
  ["dashDotHeavy", L10("Dot dash heavy", "Tra\xE7o-ponto grosso")],
  ["dotDotDash", L10("Dot dot dash", "Tra\xE7o-ponto-ponto")],
  ["dashDotDotHeavy", L10("Dot dot dash heavy", "Tra\xE7o-ponto-ponto grosso")],
  ["wave", L10("Wave", "Ondulado")],
  ["wavyHeavy", L10("Wave heavy", "Ondulado grosso")],
  ["wavyDouble", L10("Double wave", "Ondulado duplo")]
];
function underlineSampleSvg(style, w = 132, h = 14, color = "currentColor") {
  const y = Math.round(h / 2) + 0.5;
  const ln = (yy, sw, dash2 = "") => `<line x1="2" y1="${yy}" x2="${w - 2}" y2="${yy}" stroke="${color}" stroke-width="${sw}"${dash2 ? ` stroke-dasharray="${dash2}"` : ""}/>`;
  const wave = (yy, amp, sw) => {
    let d = `M2 ${yy}`;
    for (let x = 2, up = true; x < w - 2; x += 3, up = !up) d += ` Q${x + 1.5} ${up ? yy - amp * 2 : yy + amp * 2} ${x + 3} ${yy}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
  };
  const heavy = /Heavy$|^thick$/.test(style) ? 2.5 : 1;
  const dash = {
    dotted: "1.5 1.5",
    dottedHeavy: "2.5 2.5",
    dash: "4 2",
    dashedHeavy: "4 2",
    dashLong: "8 4",
    dashLongHeavy: "8 4",
    dotDash: "4 1.5 1.5 1.5",
    dashDotHeavy: "4 1.5 1.5 1.5",
    dotDotDash: "3 1.2 1.2 1.2 1.2 1.2",
    dashDotDotHeavy: "3 1.2 1.2 1.2 1.2 1.2"
  };
  let body;
  switch (style) {
    case "double":
      body = ln(y - 1.5, 1) + ln(y + 1.5, 1);
      break;
    case "wave":
      body = wave(y, 1, 1);
      break;
    case "wavyHeavy":
      body = wave(y, 1, 2);
      break;
    case "wavyDouble":
      body = wave(y - 2, 0.8, 0.9) + wave(y + 2, 0.8, 0.9);
      break;
    case "words":
      body = `<line x1="2" y1="${y}" x2="${w * 0.42}" y2="${y}" stroke="${color}"/><line x1="${w * 0.52}" y1="${y}" x2="${w - 2}" y2="${y}" stroke="${color}"/>`;
      break;
    default:
      body = ln(y, heavy, dash[style] ?? "");
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
}
function colorFromPick(value, colors) {
  const p = parseThemePick(value, colors);
  if (!p) return value.toUpperCase();
  const frac = (h) => h ? Math.round((1 - parseInt(h, 16) / 255) * 100) / 100 : void 0;
  const tint = frac(p.tint), shade = frac(p.shade);
  return { themeColor: p.themeColor, ...tint !== void 0 ? { tint } : {}, ...shade !== void 0 ? { shade } : {} };
}
function pickHex(value, colors) {
  return parseThemePick(value, colors)?.hex ?? value.toUpperCase();
}
function paletteMenu(env, ctx, o) {
  const L0 = env.app.ui.L;
  const colors = env.ed.documentThemeColors();
  return [
    { id: "palette:auto", label: o.autoLabel, swatch: "#000000", onClick: () => {
      o.onAuto();
      ctx.after();
    } },
    { content: (close) => {
      const box = document.createElement("div");
      box.className = "uw-palette";
      const h = (txt) => {
        const d = document.createElement("div");
        d.className = "uo-tiles-h";
        d.textContent = txt;
        return d;
      };
      box.append(
        h(ctx.registry.text(L10("Theme Colors", "Cores do Tema"))),
        colorGrid({ colors: themePaletteColors(colors), columns: 10, close, selected: o.selected, onPick: (v) => {
          o.onPick(v);
          ctx.after();
        } }),
        h(ctx.registry.text(L10("Standard Colors", "Cores Padr\xE3o"))),
        colorGrid({ colors: STANDARD_COLORS.map((x) => ({ value: x, css: `#${x}` })), columns: 10, close, selected: o.selected, onPick: (v) => {
          o.onPick(v);
          ctx.after();
        } })
      );
      return box;
    } },
    {
      icon: "palette",
      label: L0.moreColors,
      onClick: () => {
        const input = document.createElement("input");
        input.type = "color";
        input.style.cssText = "position:fixed;left:-100px;top:0;opacity:0";
        ctx.layer.appendChild(input);
        input.addEventListener("change", () => {
          o.onPick(input.value.slice(1).toUpperCase());
          input.remove();
          ctx.after();
        });
        input.addEventListener("blur", () => setTimeout(() => input.remove(), 1e3));
        input.click();
      }
    }
  ];
}
function fontColorMenu(env, ctx) {
  const colors = env.ed.documentThemeColors();
  return [
    ...paletteMenu(env, ctx, {
      autoLabel: env.app.ui.L.automatic,
      selected: env.ctl.state().run.color,
      onAuto: () => env.ed.setColor(void 0),
      onPick: (v) => {
        env.app.lastColor = v;
        env.ed.setColor(colorFromPick(v, colors));
      }
    }),
    ...typeof env.ed.setTextGradient === "function" ? [{ id: "color:gradient", label: L10("Gradient", "Gradiente"), icon: "gradient", submenu: () => fontGradientMenu(env, ctx) }] : []
  ];
}
function underlineMenu(env, ctx) {
  const run = env.ctl.state().run;
  const cur = run.underline ? run.underlineStyle ?? "single" : void 0;
  return [
    {
      content: (close) => tileGrid({
        sections: [{ items: UNDERLINE_MENU.map(([id, label]) => ({ id, label })) }],
        tile: { w: 150, h: 24 },
        cols: 1,
        close,
        text: (l) => ctx.registry.text(l),
        selected: cur,
        render: (tile, it) => {
          tile.innerHTML = underlineSampleSvg(it.id);
        },
        onPick: (id) => {
          env.ed.setUnderline(id);
          ctx.after();
        }
      })
    },
    "-",
    "underline:more",
    { id: "underline:color", label: L10("Underline Color", "Cor do Sublinhado"), icon: "format_color_text", submenu: () => underlineColorMenu(env, ctx) }
  ];
}
function underlineColorMenu(env, ctx) {
  const colors = env.ed.documentThemeColors();
  return paletteMenu(env, ctx, {
    autoLabel: env.app.ui.L.automatic,
    selected: env.ctl.state().run.underlineColor,
    onAuto: () => env.ed.setUnderlineColor(null),
    onPick: (v) => env.ed.setUnderlineColor(colorFromPick(v, colors))
  });
}
var homeBordersMenu = () => [
  ...BORDERS.map(([k]) => `home:border:${k}`),
  "-",
  "home:hrule",
  "table:draw",
  "view:gridlines",
  "-",
  "dlg:borders"
];
function registerHomeCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const e = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  const inCell = () => ed.editingTableCell();
  const cmds = [
    e({ id: "underline:more", label: L10("More Underlines\u2026", "Mais Sublinhados..."), icon: "format_underlined", supports: has("setFontFormat"), run: () => ctl.fontDialog() }),
    // Maiúsculas e Minúsculas (Shift+F3 alterna — o editor trata a tecla)
    e({ id: "case:sentence", label: L10("Sentence case.", "Primeira letra da frase em mai\xFAscula."), run: () => ed.changeCase("sentence") }),
    e({ id: "case:title", label: L10("Capitalize Each Word", "Colocar Cada Palavra em Mai\xFAscula"), run: () => ed.changeCase("title") }),
    e({ id: "case:toggle", label: L10("tOGGLE cASE", "aLTERNAR mAI\xDASC./mIN\xDASC."), run: () => ed.changeCase("toggle") }),
    e({ id: "case:next", label: L10("Change Case", "Mai\xFAsculas e Min\xFAsculas"), icon: "match_case", shortcut: "Shift+F3", run: () => ed.changeCase("next") }),
    // botão Bordas: o último item escolhido fica no botão (Borda Inferior de início)
    ...BORDERS.map(([kind, en, pt, icon]) => e({
      id: `home:border:${kind}`,
      label: L10(en, pt),
      icon,
      supports: has("paragraphBorderPreset"),
      // diagonais só nas células (o Word as desabilita fora de tabela)
      isEnabled: () => inCell() || kind !== "tl2br" && kind !== "tr2bl",
      isChecked: () => !inCell() && borderOn(ed, kind),
      run: () => {
        app.lastHomeBorder = kind;
        applyBorder(ed, kind);
      }
    })),
    e({ id: "home:borders", label: L10("Borders", "Bordas"), icon: "border_bottom", supports: has("paragraphBorderPreset"), run: () => applyBorder(ed, app.lastHomeBorder) }),
    e({ id: "home:hrule", label: L10("Horizontal Line", "Linha Horizontal"), icon: "horizontal_rule", supports: has("insertHorizontalLine"), run: () => ed.insertHorizontalLine() })
  ];
  reg.add(...cmds);
}
function applyBorder(ed, kind) {
  if (ed.editingTableCell()) {
    ed.setCellBorders(kind);
    return;
  }
  if (kind === "tl2br" || kind === "tr2bl") return;
  ed.paragraphBorderPreset(kind);
}
function borderOn(ed, kind) {
  const s = new Set(ed.paragraphBorderSides());
  switch (kind) {
    case "bottom":
    case "top":
    case "left":
    case "right":
      return s.has(kind);
    case "all":
      return ["top", "left", "bottom", "right", "between"].every((x) => s.has(x));
    case "outside":
      return ["top", "left", "bottom", "right"].every((x) => s.has(x));
    case "inside":
    case "insideH":
      return s.has("between");
    case "insideV":
      return s.has("bar");
    default:
      return false;
  }
}

// src/chrome-lists.ts
var L11 = (en, pt) => ({ en, pt });
var tr6 = (lang, en, pt) => pickLabels(lang, { en, pt });
var el7 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var select3 = (opts, value) => {
  const s = el7("select", { style: "width:auto;min-width:120px" });
  for (const [v, t2] of opts) s.append(el7("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var row = (...kids) => el7("div", { style: "display:flex;align-items:center;gap:8px" }, ...kids);
var group = (title, ...kids) => el7(
  "fieldset",
  { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:6px 10px;display:flex;flex-direction:column;gap:8px" },
  el7("legend", { textContent: title }),
  ...kids
);
var cmText = (lang, tw) => (Math.round(tw / 1440 * 254) / 100).toFixed(2).replace(".", tr6(lang, ".", ","));
var cmInput = (lang, tw) => el7("input", { type: "text", inputMode: "decimal", value: `${cmText(lang, tw)} cm`, style: "width:90px" });
var twOf = (s) => {
  const n = parseFloat(s.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? Math.round(n / 2.54 * 1440) : void 0;
};
var NUMBER_STYLES = [
  ["decimal", L11("1, 2, 3, ...", "1, 2, 3, ...")],
  ["upperRoman", L11("I, II, III, ...", "I, II, III, ...")],
  ["lowerRoman", L11("i, ii, iii, ...", "i, ii, iii, ...")],
  ["upperLetter", L11("A, B, C, ...", "A, B, C, ...")],
  ["lowerLetter", L11("a, b, c, ...", "a, b, c, ...")],
  ["ordinal", L11("1st, 2nd, 3rd, ...", "1\xBA, 2\xBA, 3\xBA, ...")],
  ["cardinalText", L11("One, Two, Three, ...", "Um, Dois, Tr\xEAs, ...")],
  ["ordinalText", L11("First, Second, Third, ...", "Primeiro, Segundo, Terceiro, ...")],
  ["decimalZero", L11("01, 02, 03, ...", "01, 02, 03, ...")],
  ["none", L11("(none)", "(nenhum)")]
];
var docLang = (lang) => lang === "pt" ? "pt-BR" : "en-US";
function markerText(levels, ilvl, values, lang) {
  const lvl = levels.find((l) => l.ilvl === ilvl);
  if (!lvl) return "";
  if (lvl.numFmt === "bullet") return lvl.lvlText;
  return lvl.lvlText.replace(/%([1-9])/g, (_m, k) => {
    const i = Number(k) - 1;
    const src = levels.find((l) => l.ilvl === i);
    const fmt2 = lvl.isLgl && i !== ilvl ? "decimal" : src?.numFmt ?? "decimal";
    return formatNumber(values[i] ?? src?.start ?? 1, fmt2 === "bullet" ? "decimal" : fmt2, docLang(lang));
  });
}
function markerSpan(ed, text, lvl, sizePx) {
  const p = lvl?.numFmt === "bullet" ? ed.markerPreview(text, lvl.font) : { text, css: lvl?.font ? `"${ed.canvasFont(lvl.font).family}"` : "inherit" };
  return el7("span", { textContent: p.text, style: `font-family:${p.css};font-size:${sizePx}px;line-height:1;white-space:pre${lvl?.bold ? ";font-weight:700" : ""}${lvl?.italic ? ";font-style:italic" : ""}${lvl?.color ? `;color:#${lvl.color}` : ""}` });
}
var bar = (w) => el7("span", { style: `display:inline-block;height:2px;width:${w};background:color-mix(in srgb, currentColor 35%, transparent);border-radius:1px` });
function listTile(ed, levels, kind, lang) {
  const box = el7("div", { style: "width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:9px;padding:6px 8px;box-sizing:border-box;overflow:hidden" });
  if (kind === "bullet") {
    box.style.alignItems = "center";
    const l0 = levels.find((l) => l.ilvl === 0);
    box.append(markerSpan(ed, l0?.lvlText ?? "", l0, 22));
    return box;
  }
  const rows = kind === "number" ? [[0, 1], [0, 2], [0, 3]] : [[0, 1], [1, 1], [2, 1]];
  for (const [ilvl, v] of rows) {
    const lvl = levels.find((l) => l.ilvl === ilvl);
    const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    values[ilvl] = v;
    const txt = markerText(levels, ilvl, values, lang);
    box.append(el7(
      "div",
      { style: `display:flex;align-items:center;gap:4px;padding-left:${kind === "multi" ? ilvl * 9 : 0}px` },
      markerSpan(ed, txt, lvl, 10),
      bar("100%")
    ));
  }
  return box;
}
var NONE = "__none";
var noneTile = (lang, small = false) => el7("div", { textContent: tr6(lang, "None", "Nenhum"), style: `width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${small ? 9 : 12}px` });
function recents(app, kind) {
  const a = app;
  return (a.listRecents ??= {})[kind] ??= [];
}
function rememberList(app, kind, levels) {
  const r = recents(app, kind);
  const key = (x) => JSON.stringify(x[0] ?? {});
  const i = r.findIndex((x) => key(x) === key(levels));
  if (i >= 0) r.splice(i, 1);
  r.unshift(levels);
  if (r.length > 7) r.length = 7;
}
var formatOf = (l) => ({
  ...l.numFmt === "bullet" ? { bullet: l.lvlText } : { numFmt: l.numFmt, lvlText: l.lvlText.replace(/%[1-9]/g, "%1") },
  align: l.jc ?? "left",
  ...l.font ? { font: l.font } : {},
  ...l.bold ? { bold: true } : {},
  ...l.italic ? { italic: true } : {},
  ...l.sizePt ? { sizePt: l.sizePt } : {},
  ...l.color ? { color: l.color } : {}
});
function listMenu(env, ctx, kind) {
  const ed = env.ed, lang = langOf(ctx);
  const lib = ed.listLibrary(kind);
  const docs = ed.documentLists().filter((d) => d.kind === kind).map((d) => d.levels);
  const rec = recents(env.app, kind);
  const all = /* @__PURE__ */ new Map();
  const sec = (prefix, lists) => lists.map((lv, i) => {
    const id = `${prefix}${i}`;
    all.set(id, lv);
    const l0 = lv.find((l) => l.ilvl === 0);
    return { id, label: L11(l0?.lvlText ?? "", l0?.lvlText ?? "") };
  });
  const tile = kind === "bullet" ? { w: 44, h: 44 } : { w: 80, h: 80 };
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: kind === "bullet" ? L11("Recently Used Bullets", "Marcadores Usados Recentemente") : L11("Recently Used Number Formats", "Formatos de N\xFAmero Usados Recentemente"), items: sec("r", rec) },
          { label: kind === "bullet" ? L11("Bullet Library", "Biblioteca de Marcadores") : L11("Numbering Library", "Biblioteca de Numera\xE7\xE3o"), items: [{ id: NONE, label: L11("None", "Nenhum") }, ...sec("l", lib)] },
          { label: kind === "bullet" ? L11("Document Bullets", "Marcadores do Documento") : L11("Document Number Formats", "Formatos de N\xFAmero do Documento"), items: sec("d", docs) }
        ],
        tile,
        cols: kind === "bullet" ? 7 : 3,
        close,
        text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          b.replaceChildren(it.id === NONE ? noneTile(lang, kind === "bullet") : listTile(ed, all.get(it.id), kind, lang));
        },
        onPick: (id) => {
          if (id === NONE) ed.removeList();
          else if (id.startsWith("l")) {
            ed.applyListLibrary(kind, Number(id.slice(1)));
            rememberList(env.app, kind, all.get(id));
          } else {
            const lv = all.get(id);
            ed.defineListLevel(formatOf(lv[0]));
            rememberList(env.app, kind, lv);
          }
          ctx.after();
        }
      })
    },
    "-",
    { id: "list:levelMenu", label: L11("Change List Level", "Alterar N\xEDvel da Lista"), icon: "format_indent_increase", disabled: !ed.listInfo(), submenu: () => levelMenu(env, ctx) },
    kind === "bullet" ? "list:defineBullet" : "list:defineNumber",
    ...kind === "number" ? ["list:setValue"] : []
  ];
}
function multilevelMenu(env, ctx) {
  const ed = env.ed, lang = langOf(ctx);
  const info = ed.listInfo();
  const all = /* @__PURE__ */ new Map();
  const put = (id, lv, label) => {
    all.set(id, lv);
    return { id, label: L11(label, label) };
  };
  const cur = info && info.levels.length ? [put("c", info.levels, tr6(lang, "Current List", "Lista Atual"))] : [];
  const lib = ed.listLibrary("multilevel").map((lv, i) => put(`l${i}`, lv, markerText(lv, 0, [1], lang)));
  const docs = ed.documentLists().map((d, i) => put(`d${i}`, d.levels, markerText(d.levels, 0, [1], lang)));
  const styles = ed.listStylesInDocument().map((s) => put(`s:${s.id}`, s.levels, s.name));
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: L11("Current List", "Lista Atual"), items: cur },
          { label: L11("List Library", "Biblioteca de Listas"), items: [{ id: NONE, label: L11("None", "Nenhum") }, ...lib] },
          { label: L11("Lists in Current Documents", "Listas nos Documentos Atuais"), items: docs },
          { label: L11("List Styles", "Estilos de Lista"), items: styles }
        ],
        tile: { w: 80, h: 80 },
        cols: 3,
        close,
        text: (l) => ctx.registry.text(l),
        render: (b, it) => {
          b.replaceChildren(it.id === NONE ? noneTile(lang) : listTile(ed, all.get(it.id), "multi", lang));
        },
        onPick: (id) => {
          if (id === NONE) ed.removeList();
          else if (id === "c") {
          } else if (id.startsWith("l")) ed.applyMultilevelLibrary(Number(id.slice(1)));
          else if (id.startsWith("s:")) ed.applyListStyle(id.slice(2));
          else ed.applyListLevels(all.get(id));
          ctx.after();
        }
      })
    },
    "-",
    { id: "list:levelMenu", label: L11("Change List Level", "Alterar N\xEDvel da Lista"), icon: "format_indent_increase", disabled: !info, submenu: () => levelMenu(env, ctx) },
    "list:defineMultilevel",
    "list:defineStyle"
  ];
}
function levelMenu(env, ctx) {
  const ed = env.ed, lang = langOf(ctx);
  const info = ed.listInfo();
  if (!info) return [];
  const levels = info.levels;
  return [{
    content: (close) => tileGrid({
      sections: [{ items: levels.map((l) => ({ id: String(l.ilvl), label: L11(`Level ${l.ilvl + 1}`, `N\xEDvel ${l.ilvl + 1}`) })) }],
      tile: { w: 220, h: 24 },
      cols: 1,
      close,
      text: (l) => ctx.registry.text(l),
      selected: String(info.ilvl),
      render: (b, it) => {
        const ilvl = Number(it.id);
        const lvl = levels.find((l) => l.ilvl === ilvl);
        b.replaceChildren(el7(
          "div",
          { style: `display:flex;align-items:center;gap:6px;width:100%;padding-left:${6 + ilvl * 12}px;box-sizing:border-box` },
          markerSpan(ed, markerText(levels, ilvl, [1, 1, 1, 1, 1, 1, 1, 1, 1], lang), lvl, 12),
          bar("60%")
        ));
      },
      onPick: (id) => {
        ed.setListLevel(Number(id));
        ctx.after();
      }
    })
  }];
}
var langOf = (ctx) => ctx.registry.text(L11("en", "pt")) === "pt" ? "pt" : "en";
function registerListCommands(reg, ed, app, ctl) {
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const has = (m) => () => typeof ed[m] === "function";
  const inList = () => canEdit3() && !!ed.listInfo();
  const numbered = () => canEdit3() && ed.listInfo()?.kind === "number";
  const cmds = [
    { id: "list:defineBullet", label: L11("Define New Bullet\u2026", "Definir Novo Marcador..."), supports: has("defineListLevel"), isEnabled: canEdit3, run: () => ctl.listDialog("bullet") },
    { id: "list:defineNumber", label: L11("Define New Number Format\u2026", "Definir Novo Formato de N\xFAmero..."), supports: has("defineListLevel"), isEnabled: canEdit3, run: () => ctl.listDialog("number") },
    { id: "list:setValue", label: L11("Set Numbering Value\u2026", "Definir Valor de Numera\xE7\xE3o..."), icon: "numbers", supports: has("setNumberingValue"), isEnabled: numbered, run: () => ctl.listDialog("value") },
    { id: "list:defineMultilevel", label: L11("Define New Multilevel List\u2026", "Definir Nova Lista de V\xE1rios N\xEDveis..."), supports: has("defineMultilevelList"), isEnabled: canEdit3, run: () => ctl.listDialog("multilevel") },
    { id: "list:defineStyle", label: L11("Define New List Style\u2026", "Definir Novo Estilo de Lista..."), supports: has("createListStyle"), isEnabled: canEdit3, run: () => ctl.listDialog("style") },
    { id: "list:indents", label: L11("Adjust List Indents\u2026", "Ajustar Recuos da Lista..."), icon: "format_indent_increase", supports: has("defineMultilevelList"), isEnabled: inList, run: () => ctl.listDialog("indents") },
    { id: "list:restart", label: L11("Restart at 1", "Reiniciar em 1"), icon: "restart_alt", supports: has("restartNumbering"), isEnabled: numbered, run: () => ed.restartNumbering() },
    { id: "list:continue", label: L11("Continue Numbering", "Continuar Numera\xE7\xE3o"), icon: "arrow_forward", supports: has("continueNumbering"), isEnabled: numbered, run: () => {
      ed.continueNumbering();
    } }
  ];
  reg.add(...cmds);
}
async function openListDialog(env, families, kind) {
  switch (kind) {
    case "bullet":
      return bulletDialog(env, families);
    case "number":
      return numberDialog(env, families);
    case "value":
      return valueDialog(env);
    case "multilevel":
      return multilevelDialog(env, families, false);
    case "indents":
      return indentsDialog(env);
    case "style":
      return multilevelDialog(env, families, true);
  }
}
async function ask(env, title, body, width = 420) {
  const h = openDialog({
    title,
    body,
    layer: env.layer,
    lang: env.lang,
    width,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  return await h.result === "ok";
}
async function markFontDialog(env, families, cur) {
  const lang = env.lang;
  const fams = cur.font && !families.includes(cur.font) ? [cur.font, ...families] : families;
  const font = select3([["", tr6(lang, "(same as text)", "(a do texto)")], ...fams.map((f) => [f, f])], cur.font ?? "");
  const style = select3(
    [["r", tr6(lang, "Regular", "Normal")], ["i", tr6(lang, "Italic", "It\xE1lico")], ["b", tr6(lang, "Bold", "Negrito")], ["bi", tr6(lang, "Bold Italic", "Negrito It\xE1lico")]],
    `${cur.bold ? "b" : ""}${cur.italic ? "i" : ""}` || "r"
  );
  const size = el7("input", { type: "text", inputMode: "decimal", value: cur.sizePt ? String(cur.sizePt).replace(".", tr6(lang, ".", ",")) : "", placeholder: tr6(lang, "(text)", "(do texto)"), style: "width:80px" });
  const pick = cur.color ? { hex: cur.color } : { hex: "auto" };
  const color = colorButton(env, pick, env.app.ui.L.automatic);
  const body = el7(
    "div",
    { style: "display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center" },
    tr6(lang, "Font:", "Fonte:"),
    font,
    tr6(lang, "Font style:", "Estilo da fonte:"),
    style,
    tr6(lang, "Size:", "Tamanho:"),
    size,
    tr6(lang, "Font color:", "Cor da fonte:"),
    color.el
  );
  if (!await ask(env, tr6(lang, "Font", "Fonte"), body, 380)) return null;
  const sz = parseFloat(size.value.replace(",", "."));
  const c = color.value();
  return {
    ...font.value ? { font: font.value } : {},
    ...style.value.includes("b") ? { bold: true } : {},
    ...style.value.includes("i") ? { italic: true } : {},
    ...Number.isFinite(sz) && sz >= 1 && sz <= 1638 ? { sizePt: Math.round(sz * 2) / 2 } : {},
    ...c.hex !== "auto" ? { color: c.hex.toUpperCase() } : {}
  };
}
var SYMBOL_FONTS = ["Symbol", "Wingdings", "Wingdings 2", "Wingdings 3", "Webdings"];
var TEXT_RANGES = [[33, 126], [161, 383], [8208, 8250], [8592, 8703], [8704, 8959], [9632, 9727], [9728, 9983], [9984, 10175]];
async function symbolDialog(env, families, cur) {
  const lang = env.lang, ed = env.ed;
  const fonts = [...SYMBOL_FONTS, ...families.filter((f) => !SYMBOL_FONTS.includes(f))];
  const font = select3(fonts.map((f) => [f, f]), cur.font && fonts.includes(cur.font) ? cur.font : "Symbol");
  const grid2 = el7("div", { style: "display:grid;grid-template-columns:repeat(16, 28px);gap:2px;max-height:260px;overflow:auto;padding:2px", tabIndex: 0 });
  const code = el7("input", { type: "text", style: "width:80px" });
  let chosen = cur.char;
  const paint = () => {
    const f = font.value;
    const sym = SYMBOL_FONTS.includes(f);
    const cps = [];
    if (sym) for (let c = 61472; c <= 61695; c++) cps.push(c);
    else for (const [a, b] of TEXT_RANGES) for (let c = a; c <= b; c++) cps.push(c);
    const css = `"${f}", ${ed.canvasFont(f).family === f ? "" : `"${ed.canvasFont(f).family}", `}sans-serif`;
    grid2.replaceChildren(...cps.map((cp) => {
      const ch = String.fromCodePoint(cp);
      const b = el7("button", {
        type: "button",
        textContent: ch,
        title: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        style: `width:28px;height:28px;padding:0;font-family:${css};font-size:16px;line-height:1;border:1px solid color-mix(in srgb, currentColor 20%, transparent);border-radius:3px;background:transparent;color:inherit${ch === chosen ? ";outline:2px solid var(--uo-accent, #1a73e8)" : ""}`
      });
      b.dataset["cp"] = String(cp);
      b.addEventListener("click", () => {
        chosen = ch;
        code.value = cp.toString(16).toUpperCase();
        for (const x of grid2.children) x.style.outline = "";
        b.style.outline = "2px solid var(--uo-accent, #1a73e8)";
      });
      b.addEventListener("dblclick", () => {
        chosen = ch;
        h.close("ok");
      });
      return b;
    }));
  };
  code.addEventListener("change", () => {
    const cp = parseInt(code.value, 16);
    if (Number.isFinite(cp) && cp > 31 && cp <= 1114111) {
      chosen = String.fromCodePoint(cp);
      paint();
    }
  });
  font.addEventListener("change", paint);
  void ed.ensureFontLoaded(font.value);
  code.value = (chosen.codePointAt(0) ?? 0).toString(16).toUpperCase();
  paint();
  const body = el7("div", { style: "display:flex;flex-direction:column;gap:10px" }, row(tr6(lang, "Font:", "Fonte:"), font), grid2, row(tr6(lang, "Character code:", "C\xF3digo do caractere:"), code));
  const h = openDialog({
    title: tr6(lang, "Symbol", "S\xEDmbolo"),
    body,
    layer: env.layer,
    lang,
    width: 540,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  return await h.result === "ok" && chosen ? { char: chosen, font: font.value } : null;
}
function levelPreview(ed, lang, levels, ilvl) {
  const box = el7("div", { style: "height:120px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:4px;padding:10px 16px;display:flex;flex-direction:column;gap:10px;overflow:hidden;background:#fff;color:#000" });
  const paint = () => {
    const lv = levels(), k = ilvl();
    const lvl = lv.find((l) => l.ilvl === k);
    box.replaceChildren(...[1, 2, 3].map((v) => {
      const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
      values[k] = (lvl?.start ?? 1) + v - 1;
      const jc = lvl?.jc ?? "left";
      const mk = markerSpan(ed, markerText(lv, k, values, lang), lvl, 13);
      const cell = el7("span", { style: `display:inline-flex;justify-content:${jc === "right" ? "flex-end" : jc === "center" ? "center" : "flex-start"};width:36px;flex:none` }, mk);
      return el7("div", { style: "display:flex;align-items:center;gap:8px" }, cell, bar("100%"));
    }));
  };
  paint();
  return { el: box, paint };
}
function startLevel(ed, kind) {
  const info = ed.listInfo();
  if (info?.level && info.level.numFmt === "bullet" === (kind === "bullet")) return { levels: info.levels.map((l) => ({ ...l })), ilvl: info.ilvl };
  return { levels: (ed.listLibrary(kind)[0] ?? []).map((l) => ({ ...l })), ilvl: info?.ilvl ?? 0 };
}
var ALIGNS3 = (lang) => [["left", tr6(lang, "Left", "Esquerda")], ["center", tr6(lang, "Centered", "Centralizado")], ["right", tr6(lang, "Right", "Direita")]];
async function bulletDialog(env, families) {
  const lang = env.lang, ed = env.ed;
  const st = startLevel(ed, "bullet");
  const lvl = () => st.levels.find((l2) => l2.ilvl === st.ilvl) ?? (st.levels[st.ilvl] = { ilvl: st.ilvl, numFmt: "bullet", lvlText: "\u2022", indLeft: 720, hanging: 360 });
  const align = select3(ALIGNS3(lang), lvl().jc ?? "left");
  const prev = levelPreview(ed, lang, () => st.levels, () => st.ilvl);
  const symBtn = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Symbol...", "S\xEDmbolo...") });
  const fontBtn = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Font...", "Fonte...") });
  const picBtn = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Picture...", "Imagem...") });
  const thumb = el7("img", { alt: "", style: "height:24px;max-width:48px;object-fit:contain;display:none" });
  let picture = null;
  picBtn.addEventListener("click", () => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/png,image/jpeg,image/gif" });
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ext = { "image/jpeg": "jpeg", "image/gif": "gif" }[file.type] ?? "png";
      picture = { data: new Uint8Array(await file.arrayBuffer()), ext, name: file.name.replace(/\.[^.]+$/, "") };
      thumb.src = URL.createObjectURL(file);
      thumb.style.display = "";
    });
    input.click();
  });
  symBtn.addEventListener("click", async () => {
    const r = await symbolDialog(env, families, { char: lvl().lvlText, font: lvl().font });
    if (r) {
      Object.assign(lvl(), { lvlText: r.char, font: r.font });
      picture = null;
      thumb.style.display = "none";
      prev.paint();
    }
  });
  fontBtn.addEventListener("click", async () => {
    const r = await markFontDialog(env, families, lvl());
    if (r) {
      const l2 = lvl();
      delete l2.bold;
      delete l2.italic;
      delete l2.sizePt;
      delete l2.color;
      Object.assign(l2, r);
      prev.paint();
    }
  });
  align.addEventListener("change", () => {
    lvl().jc = align.value;
    prev.paint();
  });
  const body = el7(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    group(tr6(lang, "Bullet character", "Caractere de marcador"), row(symBtn, picBtn, fontBtn, thumb)),
    row(tr6(lang, "Alignment:", "Alinhamento:"), align),
    group(tr6(lang, "Preview", "Visualiza\xE7\xE3o"), prev.el)
  );
  if (!await ask(env, tr6(lang, "Define New Bullet", "Definir Novo Marcador"), body)) return;
  const l = lvl();
  const f = { ...picture ? { picture } : { bullet: l.lvlText }, align: align.value, ...l.font ? { font: l.font } : {}, ...l.bold ? { bold: true } : {}, ...l.italic ? { italic: true } : {}, ...l.sizePt ? { sizePt: l.sizePt } : {}, ...l.color ? { color: l.color } : {} };
  ed.defineListLevel(f);
  rememberList(env.app, "bullet", [{ ...l, jc: f.align }]);
}
async function numberDialog(env, families) {
  const lang = env.lang, ed = env.ed;
  const st = startLevel(ed, "number");
  const k = st.ilvl;
  const lvl = () => st.levels.find((l2) => l2.ilvl === k) ?? (st.levels[k] = { ilvl: k, numFmt: "decimal", lvlText: `%${k + 1}.`, indLeft: 720 * (k + 1), hanging: 360 });
  const cur = lvl();
  const style = select3(NUMBER_STYLES.map(([v, l2]) => [v, pickLabels(lang, l2)]), NUMBER_STYLES.some(([v]) => v === cur.numFmt) ? cur.numFmt : "decimal");
  const sample = () => style.value === "none" ? "" : formatNumber(1, style.value, docLang(lang));
  const toText = (lvlText) => lvlText.replace(new RegExp(`%${k + 1}`), () => sample());
  const fmt2 = el7("input", { type: "text", value: toText(cur.lvlText), style: "width:180px" });
  const fromText = () => {
    const s = sample();
    const i = s ? fmt2.value.indexOf(s) : -1;
    return i < 0 ? `${fmt2.value}%${k + 1}` : `${fmt2.value.slice(0, i)}%${k + 1}${fmt2.value.slice(i + s.length)}`;
  };
  const align = select3(ALIGNS3(lang), cur.jc ?? "left");
  const prev = levelPreview(ed, lang, () => st.levels, () => k);
  const fontBtn = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Font...", "Fonte...") });
  let lastSample = sample();
  style.addEventListener("change", () => {
    const s = sample();
    fmt2.value = lastSample && fmt2.value.includes(lastSample) ? fmt2.value.replace(lastSample, () => s) : `${s}${fmt2.value}`;
    lastSample = s;
    Object.assign(lvl(), { numFmt: style.value, lvlText: fromText() });
    prev.paint();
  });
  fmt2.addEventListener("input", () => {
    lvl().lvlText = fromText();
    prev.paint();
  });
  align.addEventListener("change", () => {
    lvl().jc = align.value;
    prev.paint();
  });
  fontBtn.addEventListener("click", async () => {
    const r = await markFontDialog(env, families, lvl());
    if (r) {
      const l2 = lvl();
      delete l2.font;
      delete l2.bold;
      delete l2.italic;
      delete l2.sizePt;
      delete l2.color;
      Object.assign(l2, r);
      prev.paint();
    }
  });
  const body = el7(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    group(
      tr6(lang, "Number format", "Formato de n\xFAmero"),
      row(tr6(lang, "Number style:", "Estilo de n\xFAmero:"), style, fontBtn),
      row(tr6(lang, "Number format:", "Formato de n\xFAmero:"), fmt2)
    ),
    row(tr6(lang, "Alignment:", "Alinhamento:"), align),
    group(tr6(lang, "Preview", "Visualiza\xE7\xE3o"), prev.el)
  );
  if (!await ask(env, tr6(lang, "Define New Number Format", "Definir Novo Formato de N\xFAmero"), body)) return;
  const l = lvl();
  ed.defineListLevel({
    numFmt: style.value,
    lvlText: fromText(),
    align: align.value,
    start: l.start ?? 1,
    ...l.font ? { font: l.font } : {},
    ...l.bold ? { bold: true } : {},
    ...l.italic ? { italic: true } : {},
    ...l.sizePt ? { sizePt: l.sizePt } : {},
    ...l.color ? { color: l.color } : {}
  });
  rememberList(env.app, "number", [{ ...l, numFmt: style.value, lvlText: fromText(), jc: align.value }]);
}
async function valueDialog(env) {
  const lang = env.lang, ed = env.ed;
  const info = ed.numberingValueInfo();
  if (!info) return;
  const radio6 = (v2, label, on) => {
    const input = el7("input", { type: "radio", name: "uw-numval", value: v2, checked: on });
    return { el: el7("label", { className: "uo-check" }, input, label), input };
  };
  const fresh = radio6("new", tr6(lang, "Start new list", "Iniciar nova lista"), true);
  const cont = radio6("continue", tr6(lang, "Continue from previous list", "Continuar a partir da lista anterior"), false);
  cont.input.disabled = !info.canContinue;
  const adv = el7("input", { type: "checkbox" });
  const advL = el7("label", { className: "uo-check", style: "margin-left:22px" }, adv, tr6(lang, "Advance value (skip numbers)", "Avan\xE7ar valor (ignorar n\xFAmeros)"));
  const value = el7("input", { type: "number", min: "0", max: "32767", step: "1", value: String(info.value), style: "width:90px" });
  const prev = el7("span", {});
  const paint = () => {
    adv.disabled = !cont.input.checked;
    value.disabled = cont.input.checked && !adv.checked;
    const v2 = Math.max(0, Math.round(Number(value.value) || 0));
    prev.textContent = formatNumber(v2, info.numFmt, docLang(lang));
  };
  for (const x of [fresh.input, cont.input, adv]) x.addEventListener("change", paint);
  value.addEventListener("input", paint);
  paint();
  const body = el7(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    fresh.el,
    cont.el,
    advL,
    row(tr6(lang, "Set value to:", "Definir valor como:"), value),
    row(tr6(lang, "Preview:", "Visualiza\xE7\xE3o:"), prev)
  );
  if (!await ask(env, tr6(lang, "Set Numbering Value", "Definir Valor de Numera\xE7\xE3o"), body, 380)) return;
  const v = Math.max(0, Math.round(Number(value.value) || 0));
  if (fresh.input.checked) ed.setNumberingValue({ mode: "new", value: v });
  else ed.setNumberingValue({ mode: "continue", ...adv.checked ? { value: v } : {} });
}
async function indentsDialog(env) {
  const lang = env.lang, ed = env.ed;
  const info = ed.listInfo();
  const lvl = info?.level;
  if (!info || !lvl) return;
  const numPos = cmInput(lang, lvl.indLeft - lvl.hanging);
  const textPos = cmInput(lang, lvl.indLeft);
  const follow = select3([["tab", tr6(lang, "Tab character", "Caractere de tabula\xE7\xE3o")], ["space", tr6(lang, "Space", "Espa\xE7o")], ["nothing", tr6(lang, "Nothing", "Nada")]], lvl.suff ?? "tab");
  const tabOn = el7("input", { type: "checkbox", checked: lvl.tabPos !== void 0 });
  const tabAt = cmInput(lang, lvl.tabPos ?? lvl.indLeft);
  const body = el7(
    "div",
    { style: "display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center" },
    tr6(lang, "Bullet position:", "Posi\xE7\xE3o do marcador:"),
    numPos,
    tr6(lang, "Text indent:", "Recuo do texto:"),
    textPos,
    tr6(lang, "Follow number with:", "Seguir n\xFAmero com:"),
    follow,
    el7("label", { className: "uo-check" }, tabOn, tr6(lang, "Add tab stop at:", "Adicionar parada de tabula\xE7\xE3o em:")),
    tabAt
  );
  if (!await ask(env, tr6(lang, "Adjust List Indents", "Ajustar Recuos da Lista"), body, 420)) return;
  const np = twOf(numPos.value) ?? lvl.indLeft - lvl.hanging, tp = twOf(textPos.value) ?? lvl.indLeft;
  const tab = tabOn.checked ? twOf(tabAt.value) : void 0;
  const { tabPos: _old, ...rest } = lvl;
  ed.defineMultilevelList([{ ...rest, indLeft: tp, hanging: tp - np, suff: follow.value, ...tab !== void 0 ? { tabPos: tab } : {} }]);
}
async function multilevelDialog(env, families, asStyle) {
  const lang = env.lang, ed = env.ed;
  const info = ed.listInfo();
  const base = info && info.levels.length >= 9 && !asStyle ? info.levels : ed.listLibrary("multilevel")[0] ?? [];
  const levels = base.map((l) => ({ ...l }));
  let k = info && !asStyle ? info.ilvl : 0;
  const lv = () => levels.find((l) => l.ilvl === k);
  const headings = ed.listStyles("all").filter((s) => /^heading [1-9]$/i.test(s.rawName));
  const name = el7("input", { type: "text", value: "", style: "width:220px" });
  const levelList = el7("select", { size: 9, style: "width:56px;height:180px" });
  for (let i = 0; i < 9; i++) levelList.append(el7("option", { value: String(i), textContent: String(i + 1) }));
  const prev = el7("div", { style: "flex:1;height:180px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:4px;padding:6px 10px;overflow:hidden;background:#fff;color:#000;font-size:11px;display:flex;flex-direction:column;gap:3px" });
  const fmt2 = el7("input", { type: "text", style: "width:200px" });
  const style = select3([...NUMBER_STYLES.map(([v, l]) => [v, pickLabels(lang, l)]), ["bullet", tr6(lang, "Bullet: \u2022", "Marcador: \u2022")]], "decimal");
  const include = select3([["", ""]], "");
  const fontBtn = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Font...", "Fonte...") });
  const start = el7("input", { type: "number", min: "0", max: "32767", step: "1", style: "width:80px" });
  const restartOn = el7("input", { type: "checkbox" });
  const restartAfter = select3([["0", ""]], "0");
  const legal = el7("input", { type: "checkbox" });
  const link = select3([["", tr6(lang, "(no style)", "(sem estilo)")], ...headings.map((s) => [s.id, s.name])], "");
  const jc = select3(ALIGNS3(lang), "left");
  const alignedAt = cmInput(lang, 0);
  const indentAt = cmInput(lang, 0);
  const follow = select3([["tab", tr6(lang, "Tab character", "Caractere de tabula\xE7\xE3o")], ["space", tr6(lang, "Space", "Espa\xE7o")], ["nothing", tr6(lang, "Nothing", "Nada")]], "tab");
  const tabOn = el7("input", { type: "checkbox" });
  const tabAt = cmInput(lang, 0);
  const applyTo = select3([["list", tr6(lang, "Whole list", "Lista inteira")], ["forward", tr6(lang, "This point forward", "Deste ponto em diante")]], "list");
  const sampleOf = (fmtId) => fmtId === "bullet" ? "\u2022" : fmtId === "none" ? "" : formatNumber(1, fmtId, docLang(lang));
  const sampleFor = (l, i) => sampleOf(l.isLgl && i !== l.ilvl ? "decimal" : levels.find((x) => x.ilvl === i)?.numFmt ?? "decimal");
  const tokensOf = (l) => l.lvlText.split(/(%[1-9])/).filter(Boolean).map((s) => /^%[1-9]$/.test(s) ? Number(s[1]) - 1 : s);
  const toField = (l) => l.numFmt === "bullet" ? l.lvlText : tokensOf(l).map((t2) => typeof t2 === "number" ? sampleFor(l, t2) : t2).join("");
  const fromField = (l) => {
    if (l.numFmt === "bullet") return fmt2.value || "\u2022";
    const order = tokensOf(l).filter((t2) => typeof t2 === "number");
    if (!order.includes(l.ilvl)) order.push(l.ilvl);
    let at = 0, res = "";
    for (const i of order) {
      const s = sampleFor(l, i);
      const p = s ? fmt2.value.indexOf(s, at) : -1;
      if (p < 0) continue;
      res += fmt2.value.slice(at, p) + `%${i + 1}`;
      at = p + s.length;
    }
    res += fmt2.value.slice(at);
    return /%[1-9]/.test(res) ? res : `%${l.ilvl + 1}${res}`;
  };
  const paintPrev = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const rows = [];
    for (let i = 0; i < 9; i++) {
      counts[i] += 1;
      for (let d = i + 1; d < 9; d++) counts[d] = 0;
      const vals = counts.map((c, j) => c || (levels.find((x) => x.ilvl === j)?.start ?? 1));
      const l = levels.find((x) => x.ilvl === i);
      if (!l) continue;
      const txt = markerText(levels, i, vals, lang);
      const left = Math.max(0, (l.indLeft - l.hanging) / 1440 * 96 * 0.5);
      const r = el7("div", { style: `display:flex;align-items:center;gap:4px;padding-left:${left}px;${i === k ? "font-weight:700" : ""}` }, markerSpan(ed, txt, l, 11), bar("100%"));
      rows.push(r);
    }
    prev.replaceChildren(...rows);
  };
  const load = () => {
    const l = lv();
    levelList.value = String(k);
    fmt2.value = toField(l);
    style.value = NUMBER_STYLES.some(([v]) => v === l.numFmt) || l.numFmt === "bullet" ? l.numFmt : "decimal";
    include.replaceChildren(el7("option", { value: "", textContent: "" }), ...Array.from({ length: k }, (_v, i) => el7("option", { value: String(i), textContent: tr6(lang, `Level ${i + 1}`, `N\xEDvel ${i + 1}`) })));
    include.disabled = k === 0 || l.numFmt === "bullet";
    start.value = String(l.start ?? 1);
    restartAfter.replaceChildren(...Array.from({ length: k }, (_v, i) => el7("option", { value: String(i + 1), textContent: tr6(lang, `Level ${i + 1}`, `N\xEDvel ${i + 1}`) })));
    restartOn.checked = k > 0 && l.lvlRestart !== 0;
    restartOn.disabled = k === 0;
    restartAfter.value = String(l.lvlRestart && l.lvlRestart > 0 ? l.lvlRestart : k);
    restartAfter.disabled = !restartOn.checked;
    legal.checked = !!l.isLgl;
    link.value = l.pStyle ?? "";
    jc.value = l.jc ?? "left";
    alignedAt.value = `${cmText(lang, l.indLeft - l.hanging)} cm`;
    indentAt.value = `${cmText(lang, l.indLeft)} cm`;
    follow.value = l.suff ?? "tab";
    tabOn.checked = l.tabPos !== void 0;
    tabAt.value = `${cmText(lang, l.tabPos ?? l.indLeft)} cm`;
    paintPrev();
  };
  const store = () => {
    const l = lv();
    l.numFmt = style.value;
    l.lvlText = fromField(l);
    l.start = Math.max(0, Math.round(Number(start.value) || 0));
    if (k > 0) {
      if (restartOn.checked) {
        const r = Number(restartAfter.value);
        if (r === k) delete l.lvlRestart;
        else l.lvlRestart = r;
      } else l.lvlRestart = 0;
    }
    if (legal.checked) l.isLgl = true;
    else delete l.isLgl;
    if (link.value) l.pStyle = link.value;
    else delete l.pStyle;
    l.jc = jc.value;
    const at = twOf(alignedAt.value), ti = twOf(indentAt.value);
    if (ti !== void 0) l.indLeft = ti;
    if (at !== void 0) l.hanging = l.indLeft - at;
    l.suff = follow.value;
    const tp = tabOn.checked ? twOf(tabAt.value) : void 0;
    if (tp !== void 0) l.tabPos = tp;
    else delete l.tabPos;
    paintPrev();
  };
  levelList.addEventListener("change", () => {
    store();
    k = Number(levelList.value);
    load();
  });
  style.addEventListener("change", () => {
    const l = lv();
    const before = sampleOf(l.numFmt);
    l.numFmt = style.value;
    if (style.value === "bullet") {
      l.lvlText = "\u2022";
      delete l.font;
      fmt2.value = "\u2022";
    } else if (before && fmt2.value.includes(before)) fmt2.value = fmt2.value.replace(before, () => sampleOf(style.value));
    store();
  });
  include.addEventListener("change", () => {
    if (!include.value) return;
    const i = Number(include.value);
    const pos = fmt2.selectionStart ?? 0;
    store();
    const l = lv();
    const out = [];
    let acc = 0, done = false;
    for (const t2 of tokensOf(l)) {
      const len = typeof t2 === "number" ? sampleFor(l, t2).length : t2.length;
      if (!done && pos <= acc + len) {
        if (typeof t2 === "number") out.push(...pos === acc ? [i, t2] : [t2, i]);
        else out.push(t2.slice(0, pos - acc), i, t2.slice(pos - acc));
        done = true;
      } else out.push(t2);
      acc += len;
    }
    if (!done) out.push(i);
    l.lvlText = out.map((t2) => typeof t2 === "number" ? `%${t2 + 1}` : t2).join("");
    fmt2.value = toField(l);
    include.value = "";
    paintPrev();
  });
  restartOn.addEventListener("change", () => {
    restartAfter.disabled = !restartOn.checked;
    store();
  });
  for (const x of [fmt2, start, alignedAt, indentAt, tabAt]) x.addEventListener("change", store);
  for (const x of [restartAfter, legal, link, jc, follow, tabOn]) x.addEventListener("change", store);
  fontBtn.addEventListener("click", async () => {
    const r = await markFontDialog(env, families, lv());
    if (r) {
      const l = lv();
      delete l.font;
      delete l.bold;
      delete l.italic;
      delete l.sizePt;
      delete l.color;
      Object.assign(l, r);
      paintPrev();
    }
  });
  const setAll = el7("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Set for All Levels...", "Definir para Todos os N\xEDveis...") });
  setAll.addEventListener("click", () => {
    store();
    const l0 = levels.find((x) => x.ilvl === 0), l1 = levels.find((x) => x.ilvl === 1) ?? l0;
    const step = Math.max(0, l1.indLeft - l0.indLeft) || 360;
    for (const l of levels) {
      l.indLeft = l0.indLeft + l.ilvl * step;
      l.hanging = l0.hanging;
    }
    load();
  });
  load();
  for (const s of [style, include, restartAfter, link, jc, follow, applyTo]) s.style.width = "170px";
  fmt2.style.width = "150px";
  const grid2 = (...kids) => el7("div", { style: "display:grid;grid-template-columns:auto auto auto auto;gap:6px 10px;align-items:center;justify-content:start" }, ...kids);
  const span2 = (n) => el7("div", { style: "grid-column:span 2;display:flex;align-items:center;gap:8px" }, n);
  levelList.style.height = "204px";
  prev.style.height = "204px";
  const body = el7(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;font-size:13px" },
    ...asStyle ? [row(tr6(lang, "Name:", "Nome:"), name)] : [],
    el7("div", { style: "display:flex;gap:10px" }, el7("div", { style: "display:flex;flex-direction:column;gap:4px" }, tr6(lang, "Level:", "N\xEDvel:"), levelList), prev),
    group(
      tr6(lang, "Number format", "Formato de n\xFAmero"),
      grid2(
        tr6(lang, "Enter formatting for number:", "Digite a formata\xE7\xE3o do n\xFAmero:"),
        fmt2,
        span2(fontBtn),
        tr6(lang, "Number style for this level:", "Estilo de n\xFAmero para este n\xEDvel:"),
        style,
        tr6(lang, "Include level number from:", "Incluir n\xFAmero de n\xEDvel de:"),
        include,
        tr6(lang, "Start at:", "Iniciar em:"),
        start,
        el7("label", { className: "uo-check" }, restartOn, tr6(lang, "Restart list after:", "Reiniciar lista ap\xF3s:")),
        restartAfter,
        span2(el7("label", { className: "uo-check" }, legal, tr6(lang, "Legal style numbering", "Numera\xE7\xE3o no estilo legal"))),
        tr6(lang, "Link level to style:", "Vincular n\xEDvel ao estilo:"),
        link
      )
    ),
    group(
      tr6(lang, "Position", "Posi\xE7\xE3o"),
      grid2(
        tr6(lang, "Number alignment:", "Alinhamento do n\xFAmero:"),
        jc,
        tr6(lang, "Aligned at:", "Alinhado em:"),
        alignedAt,
        tr6(lang, "Text indent at:", "Recuo do texto em:"),
        indentAt,
        span2(setAll),
        tr6(lang, "Follow number with:", "Seguir n\xFAmero com:"),
        follow,
        el7("label", { className: "uo-check" }, tabOn, tr6(lang, "Add tab stop at:", "Adicionar parada de tabula\xE7\xE3o em:")),
        tabAt
      )
    ),
    ...asStyle || !info ? [] : [row(tr6(lang, "Apply changes to:", "Aplicar altera\xE7\xF5es a:"), applyTo)]
  );
  const title = asStyle ? tr6(lang, "Define New List Style", "Definir Novo Estilo de Lista") : tr6(lang, "Define new Multilevel list", "Definir nova Lista de V\xE1rios N\xEDveis");
  for (; ; ) {
    if (!await ask(env, title, body, 720)) return;
    store();
    if (!asStyle) {
      ed.defineMultilevelList(levels, { applyTo: applyTo.value });
      return;
    }
    const nm = name.value.trim();
    if (nm && ed.createListStyle(nm, levels)) return;
    name.focus();
    name.style.outline = "2px solid #d93025";
  }
}
function listContextItems(ed) {
  const info = ed.listInfo();
  if (!info) return [];
  return info.kind === "number" ? ["list:indents", "-", "list:restart", "list:continue", "list:setValue"] : ["list:indents"];
}

// src/chrome-clipboard.ts
var L12 = (en, pt) => ({ en, pt });
var tr7 = (lang, en, pt) => pickLabels(lang, { en, pt });
var el8 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var PASTE_MODES = {
  keep: { label: L12("Keep Source Formatting (K)", "Manter Formata\xE7\xE3o Original (K)"), icon: "content_paste", key: "k" },
  merge: { label: L12("Merge Formatting (M)", "Mesclar Formata\xE7\xE3o (M)"), icon: "format_paint", key: "m" },
  picture: { label: L12("Picture (U)", "Imagem (U)"), icon: "image", key: "u" },
  text: { label: L12("Keep Text Only (T)", "Manter Somente Texto (T)"), icon: "text_fields", key: "t" }
};
var LIST_PASTE = {
  continue: { label: L12("Continue List (C)", "Continuar Lista (C)"), icon: "format_list_numbered", key: "c" },
  new: { label: L12("New List (N)", "Nova Lista (N)"), icon: "restart_alt", key: "n" },
  merge: { label: L12("Merge List (M)", "Mesclar Lista (M)"), icon: "format_list_numbered", key: "m" },
  nomerge: { label: L12("Don't Merge List (N)", "N\xE3o Mesclar Lista (N)"), icon: "restart_alt", key: "n" }
};
function optionItems(ed, after, afterPaste) {
  const o = ed.pasteOptions();
  const out = [];
  const modes = afterPaste ? o.modes.filter((m) => m !== "default") : ["keep", "merge", "picture", "text"];
  for (const m of modes) {
    const d = PASTE_MODES[m];
    out.push({ id: `paste:opt:${m}`, label: d.label, icon: d.icon, checked: afterPaste && o.current === m, onClick: () => {
      if (afterPaste) ed.repaste(m);
      else void ed.paste(m).then(after);
      after();
    } });
  }
  if (afterPaste && o.list.length) {
    out.push("-");
    for (const l of o.list) {
      const d = LIST_PASTE[l];
      out.push({ id: `paste:list:${l}`, label: d.label, icon: d.icon, checked: o.currentList === l, onClick: () => {
        ed.repaste(o.current ?? "keep", l);
        after();
      } });
    }
  }
  return out;
}
function pasteMenu(env, ctx) {
  return [
    { content: () => optionStrip(env.ed, ctx), id: "paste:strip" },
    "-",
    "paste:special",
    "paste:defaults"
  ];
}
function optionStrip(ed, ctx) {
  const box = el8("div", { style: "display:flex;flex-direction:column;gap:4px;padding:4px 10px" });
  box.append(el8("div", { className: "uo-tiles-h", textContent: ctx.registry.text(L12("Paste Options:", "Op\xE7\xF5es de Colagem:")) }));
  const row3 = el8("div", { style: "display:flex;gap:4px" });
  for (const m of ["keep", "merge", "picture", "text"]) {
    const d = PASTE_MODES[m];
    const b = el8("button", { type: "button", className: "uo-btn", title: ctx.registry.text(d.label), style: "width:34px;height:34px" });
    b.setAttribute("aria-label", ctx.registry.text(d.label));
    b.dataset["a"] = `paste:opt:${m}`;
    b.innerHTML = symbol(d.icon);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      void ed.paste(m).then(() => ctx.after());
    });
    row3.append(b);
  }
  box.append(row3);
  return box;
}
function registerClipboardCommands(reg, ed, app, ctl) {
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const has = (m) => () => typeof ed[m] === "function";
  const cmds = [
    ...["keep", "merge", "picture", "text"].map((m) => ({
      id: `paste:${m}`,
      label: PASTE_MODES[m].label,
      icon: PASTE_MODES[m].icon,
      supports: has("repaste"),
      isEnabled: canEdit3,
      run: () => ed.paste(m)
    })),
    { id: "paste:special", label: L12("Paste Special\u2026", "Colar Especial..."), icon: "content_paste_go", shortcut: "Ctrl+Alt+V", supports: has("pasteSpecial"), isEnabled: canEdit3, run: () => ctl.clipboard("special") },
    { id: "paste:defaults", label: L12("Set Default Paste\u2026", "Definir Colagem Padr\xE3o..."), icon: "settings", supports: has("repaste"), run: () => ctl.clipboard("defaults") },
    { id: "clipboard:pane", label: L12("Clipboard", "\xC1rea de Transfer\xEAncia"), icon: "content_paste", supports: has("clipboardItems"), isChecked: () => !!paneOpen("uw-clipboard"), run: () => ctl.clipboard("pane") }
  ];
  reg.add(...cmds);
}
var ClipboardUI = class {
  constructor(env) {
    this.env = env;
    const { ed, signal } = env;
    signal.addEventListener("abort", () => {
      this.hideButton();
      this.off?.();
    });
    const saved = env.app.prefs.get("pasteDefaults");
    if (saved) {
      try {
        Object.assign(ed.pasteDefaults, JSON.parse(saved));
      } catch {
      }
    }
    ed.addEventListener("uw-pasted", () => this.showButton(), { signal });
    ed.addEventListener("uw-paste-options", () => this.openOptions(), { signal });
    ed.addEventListener("uw-paste-special", () => {
      void this.special();
    }, { signal });
  }
  env;
  btn = null;
  off = null;
  /** O botão some quando a colagem não dá mais para refazer (outra edição). */
  sync() {
    if (this.btn && !this.env.ed.pasteOptions().modes.length) this.hideButton();
    else if (this.btn) this.placeButton();
  }
  showButton() {
    const o = this.env.ed.pasteOptions();
    if (!o.modes.length) {
      this.hideButton();
      return;
    }
    if (!this.btn) {
      const b = el8("button", { type: "button", className: "uo-btn uw-paste-btn", style: "position:fixed;z-index:30;height:24px;min-width:34px;padding:0 4px;border-radius:4px;border:1px solid color-mix(in srgb, currentColor 30%, transparent);background:var(--uo-surface, #fff);display:inline-flex;align-items:center;gap:2px;box-shadow:0 1px 3px rgba(0,0,0,.2)" });
      b.innerHTML = `${symbol("content_paste")}<span style="font-size:11px">(Ctrl)</span>`;
      b.title = tr7(this.env.lang, "Paste Options", "Op\xE7\xF5es de Colagem");
      b.setAttribute("aria-label", b.title);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => this.openOptions());
      this.env.layer.append(b);
      this.btn = b;
    }
    this.placeButton();
  }
  placeButton() {
    const r = this.env.ed.pasteButtonRect();
    if (!r || !this.btn) {
      this.btn && (this.btn.style.display = "none");
      return;
    }
    this.btn.style.display = "";
    this.btn.style.left = `${Math.round(r.x)}px`;
    this.btn.style.top = `${Math.round(r.y)}px`;
  }
  hideButton() {
    this.btn?.remove();
    this.btn = null;
  }
  /** Menu das opções (clique no botão ou Ctrl): as teclas K, M, T, U (e C/N das listas) escolhem. */
  openOptions() {
    const { ed, lang, layer } = this.env;
    if (!this.btn) this.showButton();
    const r = this.btn?.getBoundingClientRect() ?? ed.getBoundingClientRect();
    const items = optionItems(ed, () => this.env.after(), true);
    openMenu(items, { x: r.left, y: r.bottom + 2 }, { lang, layer, onClose: () => {
      window.removeEventListener("keydown", keys, true);
      this.env.after();
    } });
    const o = ed.pasteOptions();
    const keys = (e) => {
      const k = e.key.toLowerCase();
      const m = Object.keys(PASTE_MODES).find((x) => PASTE_MODES[x].key === k && o.modes.includes(x));
      const l = o.list.find((x) => LIST_PASTE[x].key === k && !(k === "m" && m));
      if (!m && !l) return;
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      if (l) ed.repaste(o.current ?? "keep", l);
      else if (m) ed.repaste(m);
      this.env.after();
    };
    window.addEventListener("keydown", keys, true);
  }
  async run(kind) {
    if (kind === "special") await this.special();
    else if (kind === "defaults") await this.defaults();
    else this.togglePane();
  }
  /** Colar Especial: Colar / Colar vínculo e os formatos do que está copiado. */
  async special() {
    const { ed, lang } = this.env;
    const info = await ed.pasteSpecialFormats();
    if (!info.formats.length) return;
    const NAMES = {
      rtf: ["Formatted Text (RTF)", "Texto Formatado (RTF)"],
      text: ["Unformatted Text", "Texto n\xE3o formatado"],
      picture: ["Picture (PNG)", "Imagem (PNG)"],
      html: ["HTML Format", "Formato HTML"],
      unicode: ["Unformatted Unicode Text", "Texto Unicode n\xE3o formatado"],
      image: ["Bitmap", "Bitmap"]
    };
    const HINTS = {
      rtf: ["Inserts the contents of the Clipboard as text with font and table formatting.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como texto com formata\xE7\xE3o de fonte e tabela."],
      text: ["Inserts the contents of the Clipboard as text without any formatting.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como texto sem nenhuma formata\xE7\xE3o."],
      picture: ["Inserts the contents of the Clipboard as a picture.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como uma imagem."],
      html: ["Inserts the contents of the Clipboard as HTML Format.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como Formato HTML."],
      unicode: ["Inserts the contents of the Clipboard as text without any formatting.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como texto sem nenhuma formata\xE7\xE3o."],
      image: ["Inserts the contents of the Clipboard as a picture.", "Insere o conte\xFAdo da \xC1rea de Transfer\xEAncia como uma imagem."]
    };
    const radio6 = (v, label, on, disabled = false) => {
      const input = el8("input", { type: "radio", name: "uw-pspec", value: v, checked: on, disabled });
      return { el: el8("label", { className: "uo-check" }, input, label), input };
    };
    const paste = radio6("paste", tr7(lang, "Paste:", "Colar:"), true);
    const link = radio6("link", tr7(lang, "Paste link:", "Colar v\xEDnculo:"), false, !info.link);
    const list = el8("select", { size: Math.max(4, info.formats.length), style: "width:100%;height:auto" });
    for (const f of info.formats) list.append(el8("option", { value: f, textContent: tr7(lang, NAMES[f][0], NAMES[f][1]) }));
    list.value = info.formats[0];
    const hint = el8("div", { style: "font-size:12px;opacity:.85;min-height:32px" });
    const src = el8("div", { style: "font-size:12px;opacity:.85;word-break:break-all", textContent: info.source ? `${tr7(lang, "Source:", "Origem:")} ${info.source}` : "" });
    const sync = () => {
      for (const op of list.options) op.disabled = link.input.checked && !["rtf", "html", "text", "unicode"].includes(op.value);
      if (list.selectedOptions[0]?.disabled) list.value = "rtf";
      const f = list.value;
      hint.textContent = HINTS[f] ? tr7(lang, HINTS[f][0], HINTS[f][1]) : "";
    };
    list.addEventListener("change", sync);
    paste.input.addEventListener("change", sync);
    link.input.addEventListener("change", sync);
    list.addEventListener("dblclick", () => h.close("ok"));
    sync();
    const body = el8(
      "div",
      { style: "display:flex;gap:16px" },
      el8("div", { style: "display:flex;flex-direction:column;gap:10px;min-width:130px" }, src, paste.el, link.el),
      el8("div", { style: "display:flex;flex-direction:column;gap:8px;flex:1" }, tr7(lang, "As:", "Como:"), list, hint)
    );
    const h = openDialog({
      title: tr7(lang, "Paste Special", "Colar Especial"),
      body,
      layer: this.env.layer,
      lang,
      width: 520,
      actions: [{ id: "cancel", label: this.env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
    });
    if (await h.result !== "ok") return;
    await ed.pasteSpecial(list.value, { link: link.input.checked });
    this.env.after();
  }
  /** Definir Colagem Padrão (Opções › Avançado › Recortar, copiar e colar do Word). */
  async defaults() {
    const { ed, lang } = this.env;
    const opts = [["keep", tr7(lang, "Keep Source Formatting (Default)", "Manter Formata\xE7\xE3o Original (Padr\xE3o)")], ["merge", tr7(lang, "Merge Formatting", "Mesclar Formata\xE7\xE3o")], ["text", tr7(lang, "Keep Text Only", "Manter Somente Texto")]];
    const sel4 = (v, extra = []) => {
      const s = el8("select", { style: "min-width:260px" });
      for (const [k, t2] of [...extra, ...opts]) s.append(el8("option", { value: k, textContent: t2 }));
      s.value = v;
      return s;
    };
    const within = sel4(ed.pasteDefaults.within), between = sel4(ed.pasteDefaults.between);
    const other = sel4(ed.pasteDefaults.other, [["default", tr7(lang, "Use Destination Styles (Default)", "Usar Estilos de Destino (Padr\xE3o)")]]);
    const body = el8(
      "div",
      { style: "display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center" },
      tr7(lang, "Pasting within the same document:", "Colar no mesmo documento:"),
      within,
      tr7(lang, "Pasting between documents:", "Colar entre documentos:"),
      between,
      tr7(lang, "Pasting from other programs:", "Colar de outros programas:"),
      other
    );
    const h = openDialog({
      title: tr7(lang, "Cut, copy, and paste", "Recortar, copiar e colar"),
      body,
      layer: this.env.layer,
      lang,
      width: 560,
      actions: [{ id: "cancel", label: this.env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
    });
    if (await h.result !== "ok") return;
    ed.pasteDefaults = { within: within.value, between: between.value, other: other.value };
    this.env.app.prefs.set("pasteDefaults", JSON.stringify(ed.pasteDefaults));
  }
  get paneIsOpen() {
    return !!paneOpen("uw-clipboard");
  }
  /** Painel Área de Transferência: os itens copiados (o mais novo em cima), Colar Tudo, Limpar Tudo. */
  togglePane() {
    const { ed, lang } = this.env;
    const cur = paneOpen("uw-clipboard");
    if (cur) {
      cur.close();
      return;
    }
    const count = el8("div", { style: "font-size:12px;opacity:.8" });
    const all = el8("button", { type: "button", className: "uo-pill", textContent: tr7(lang, "Paste All", "Colar Tudo") });
    const clear = el8("button", { type: "button", className: "uo-pill", textContent: tr7(lang, "Clear All", "Limpar Tudo") });
    const list = el8("div", { style: "display:flex;flex-direction:column;gap:6px;overflow:auto" });
    const hint = el8("div", { style: "font-size:12px;opacity:.75", textContent: tr7(lang, "Click an item to paste.", "Clique em um item para colar.") });
    const body = el8("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px;height:100%;box-sizing:border-box" }, count, el8("div", { style: "display:flex;gap:8px" }, all, clear), hint, list);
    all.addEventListener("click", () => {
      ed.pasteAllClipboardItems();
      this.env.after();
    });
    clear.addEventListener("click", () => {
      ed.clearClipboardItems();
    });
    const render = () => {
      const items = ed.clipboardItems();
      count.textContent = tr7(lang, `${items.length} of 24 - Clipboard`, `${items.length} de 24 - \xC1rea de Transfer\xEAncia`);
      all.disabled = clear.disabled = !items.length;
      hint.textContent = items.length ? tr7(lang, "Click an item to paste.", "Clique em um item para colar.") : tr7(lang, "The Clipboard is empty. Copy or cut to collect items.", "A \xC1rea de Transfer\xEAncia est\xE1 vazia. Copie ou recorte para coletar itens.");
      list.replaceChildren(...items.map((it) => {
        const ico = it.kind === "table" ? "table" : it.kind === "drawing" || it.kind === "image" ? "image" : "content_copy";
        const txt = it.text.replace(/\s+/g, " ").trim() || tr7(lang, it.kind === "drawing" || it.kind === "image" ? "(picture)" : "(item)", it.kind === "drawing" || it.kind === "image" ? "(imagem)" : "(item)");
        const b = el8("button", { type: "button", className: "uo-btn uw-clip-item", title: txt.slice(0, 300), style: "display:flex;align-items:flex-start;gap:8px;text-align:left;width:100%;height:auto;padding:6px;border:1px solid color-mix(in srgb, currentColor 18%, transparent);border-radius:6px" });
        b.innerHTML = symbol(ico);
        b.append(el8("span", { textContent: txt.length > 120 ? `${txt.slice(0, 120)}\u2026` : txt, style: "flex:1;font-size:12px;line-height:1.35;overflow:hidden" }));
        b.dataset["id"] = String(it.id);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => {
          ed.pasteClipboardItem(it.id);
          this.env.after();
        });
        b.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          openMenu([
            { id: "clip:paste", label: L12("Paste", "Colar"), icon: "content_paste", onClick: () => {
              ed.pasteClipboardItem(it.id);
              this.env.after();
            } },
            { id: "clip:delete", label: L12("Delete", "Excluir"), icon: "delete", onClick: () => ed.removeClipboardItem(it.id) }
          ], { x: e.clientX, y: e.clientY }, { lang, layer: this.env.layer });
        });
        return b;
      }));
    };
    this.off?.();
    this.off = ed.onClipboardChange(render);
    render();
    openPane({
      id: "uw-clipboard",
      title: L12("Clipboard", "\xC1rea de Transfer\xEAncia"),
      lang,
      layer: this.env.layer,
      frame: this.env.frame,
      dock: "left",
      width: 280,
      body,
      onClose: () => {
        this.off?.();
        this.off = null;
        ed.classList.remove("uw-has-pane");
        this.env.after();
      }
    });
    ed.classList.add("uw-has-pane");
  }
};

// src/chrome-find.ts
var tr8 = (lang, en, pt) => pickLabels(lang, { en, pt });
var memo = { find: "", repl: "", more: false, dir: "all", opts: {}, findFmt: {}, replFmt: {}, gotoWhat: "page" };
var GOTO = [
  ["page", "Page", "P\xE1gina", "Enter page number:", "Insira o n\xFAmero da p\xE1gina:"],
  ["section", "Section", "Se\xE7\xE3o", "Enter section number:", "Insira o n\xFAmero da se\xE7\xE3o:"],
  ["line", "Line", "Linha", "Enter line number:", "Insira o n\xFAmero da linha:"],
  ["bookmark", "Bookmark", "Indicador", "Enter bookmark name:", "Insira o nome do indicador:"],
  ["comment", "Comment", "Coment\xE1rio", "Enter reviewer\u2019s name:", "Insira o nome do revisor:"],
  ["footnote", "Footnote", "Nota de Rodap\xE9", "Enter footnote number:", "Insira o n\xFAmero da nota de rodap\xE9:"],
  ["endnote", "Endnote", "Nota de Fim", "Enter endnote number:", "Insira o n\xFAmero da nota de fim:"],
  ["field", "Field", "Campo", "Enter field name:", "Insira o nome do campo:"],
  ["table", "Table", "Tabela", "Enter table number:", "Insira o n\xFAmero da tabela:"],
  ["graphic", "Graphic", "Gr\xE1fico", "Enter graphic number:", "Insira o n\xFAmero do gr\xE1fico:"],
  ["equation", "Equation", "Equa\xE7\xE3o", "Enter equation number:", "Insira o n\xFAmero da equa\xE7\xE3o:"],
  ["object", "Object", "Objeto", "Enter object number:", "Insira o n\xFAmero do objeto:"],
  ["heading", "Heading", "T\xEDtulo", "Enter heading number:", "Insira o n\xFAmero do t\xEDtulo:"]
];
var SPECIAL_FIND = [
  ["^p", "Paragraph Mark", "Marca de Par\xE1grafo"],
  ["^t", "Tab Character", "Caractere de Tabula\xE7\xE3o"],
  ["^?", "Any Character", "Qualquer Caractere"],
  ["^#", "Any Digit", "Qualquer D\xEDgito"],
  ["^$", "Any Letter", "Qualquer Letra"],
  ["^^", "Caret Character", "Caractere Circunflexo"],
  ["^e", "Endnote Mark", "Marca de Nota de Fim"],
  ["^d", "Field", "Campo"],
  ["^f", "Footnote Mark", "Marca de Nota de Rodap\xE9"],
  ["^g", "Graphic", "Gr\xE1fico"],
  ["^l", "Manual Line Break", "Quebra de Linha Manual"],
  ["^m", "Manual Page Break", "Quebra de P\xE1gina Manual"],
  ["^~", "Nonbreaking Hyphen", "H\xEDfen Incondicional"],
  ["^s", "Nonbreaking Space", "Espa\xE7o Incondicional"],
  ["^-", "Optional Hyphen", "H\xEDfen Opcional"],
  ["^b", "Section Break", "Quebra de Se\xE7\xE3o"],
  ["^w", "White Space", "Espa\xE7o em Branco"],
  ["^+", "Em Dash", "Travess\xE3o"],
  ["^=", "En Dash", "Tra\xE7o"],
  ["^n", "Column Break", "Quebra de Coluna"]
];
var SPECIAL_WILD = [
  ["?", "Any Character", "Qualquer Caractere"],
  ["[-]", "Character in Range", "Caractere no Intervalo"],
  ["<", "Beginning of Word", "In\xEDcio da Palavra"],
  [">", "End of Word", "Fim da Palavra"],
  ["()", "Expression", "Express\xE3o"],
  ["[!]", "Not", "Diferente de"],
  ["{,}", "Num Occurrences", "N\xFAmero de Ocorr\xEAncias"],
  ["@", "Previous 1 or More", "Item Anterior 1 ou Mais"],
  ["*", "0 or More Characters", "0 ou Mais Caracteres"],
  ["^t", "Tab Character", "Caractere de Tabula\xE7\xE3o"],
  ["^^", "Caret Character", "Caractere Circunflexo"],
  ["^13", "Paragraph Mark", "Marca de Par\xE1grafo"],
  ["^l", "Manual Line Break", "Quebra de Linha Manual"],
  ["^m", "Manual Page Break", "Quebra de P\xE1gina Manual"],
  ["^s", "Nonbreaking Space", "Espa\xE7o Incondicional"]
];
var SPECIAL_REPL = [
  ["^p", "Paragraph Mark", "Marca de Par\xE1grafo"],
  ["^t", "Tab Character", "Caractere de Tabula\xE7\xE3o"],
  ["^^", "Caret Character", "Caractere Circunflexo"],
  ["^c", "Clipboard Contents", "Conte\xFAdo da \xC1rea de Transfer\xEAncia"],
  ["^&", "Find What Text", "Conte\xFAdo de Localizar"],
  ["^l", "Manual Line Break", "Quebra de Linha Manual"],
  ["^m", "Manual Page Break", "Quebra de P\xE1gina Manual"],
  ["^n", "Column Break", "Quebra de Coluna"],
  ["^~", "Nonbreaking Hyphen", "H\xEDfen Incondicional"],
  ["^s", "Nonbreaking Space", "Espa\xE7o Incondicional"],
  ["^-", "Optional Hyphen", "H\xEDfen Opcional"],
  ["^+", "Em Dash", "Travess\xE3o"],
  ["^=", "En Dash", "Tra\xE7o"]
];
var el9 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var btn = (label, primary = false) => el9("button", { type: "button", className: primary ? "uo-pill uo-pill-primary" : "uo-pill", textContent: label });
var check5 = (label, on) => {
  const input = el9("input", { type: "checkbox", checked: on });
  return { el: el9("label", { className: "uo-check", style: "display:flex;align-items:center;gap:6px" }, input, label), input };
};
function formatSummary(f, lang) {
  const out = [];
  const yn = (v, on, off) => {
    if (v !== void 0) out.push(v ? on : off);
  };
  if (f.font) out.push(f.font);
  if (f.sizePt) out.push(`${f.sizePt} pt`);
  yn(f.bold, tr8(lang, "Bold", "Negrito"), tr8(lang, "Not Bold", "Sem Negrito"));
  yn(f.italic, tr8(lang, "Italic", "It\xE1lico"), tr8(lang, "Not Italic", "Sem It\xE1lico"));
  yn(f.underline, tr8(lang, "Underline", "Sublinhado"), tr8(lang, "No underline", "Sem sublinhado"));
  yn(f.strike, tr8(lang, "Strikethrough", "Tachado"), tr8(lang, "Not Strikethrough", "Sem Tachado"));
  yn(f.allCaps, tr8(lang, "All caps", "Todas em mai\xFAsculas"), tr8(lang, "Not All caps", "Sem Todas em mai\xFAsculas"));
  yn(f.smallCaps, tr8(lang, "Small caps", "Versalete"), tr8(lang, "Not Small caps", "Sem Versalete"));
  yn(f.hidden, tr8(lang, "Hidden", "Oculto"), tr8(lang, "Not Hidden", "Sem Oculto"));
  if (f.vertAlign) out.push(f.vertAlign === "superscript" ? tr8(lang, "Superscript", "Sobrescrito") : tr8(lang, "Subscript", "Subscrito"));
  if (f.color) out.push(`${tr8(lang, "Font color", "Cor da fonte")}: #${f.color}`);
  yn(f.highlight, tr8(lang, "Highlight", "Realce"), tr8(lang, "Not Highlight", "Sem Realce"));
  if (f.paraStyle) out.push(`${tr8(lang, "Style", "Estilo")}: ${f.paraStyle}`);
  if (f.charStyle) out.push(`${tr8(lang, "Style", "Estilo")}: ${f.charStyle}`);
  return out.join(", ");
}
var FindReplaceDialog = class {
  constructor(env) {
    this.env = env;
  }
  env;
  handle = null;
  tab = "find";
  active = "find";
  get isOpen() {
    return !!this.handle;
  }
  close() {
    this.handle?.close(null);
    this.handle = null;
  }
  open(tab) {
    const { ed, lang } = this.env;
    const sel4 = ed.selectedText();
    if (sel4 && !sel4.includes("\n") && sel4.length < 256 && tab !== "goto") memo.find = sel4;
    if (this.handle) {
      this.show(tab);
      return;
    }
    const body = this.build();
    this.handle = openDialog({ title: tr8(lang, "Find and Replace", "Localizar e Substituir"), body, actions: [], modal: false, layer: this.env.layer, lang, width: 680 });
    const d = this.handle.el;
    d.style.position = "fixed";
    d.style.margin = "0";
    d.style.top = "96px";
    d.style.left = "max(8px, calc(50% - 340px))";
    d.style.zIndex = "20";
    void this.handle.result.then(() => {
      this.handle = null;
      ed.focusEditor();
    });
    this.show(tab);
  }
  // ───── montagem ─────
  els;
  build() {
    const { ed, lang } = this.env;
    const T4 = (en, pt) => tr8(lang, en, pt);
    const root = el9("div", { className: "uw-findrep", style: "display:flex;flex-direction:column;gap:10px;min-width:480px" });
    const tabBar = el9("div", { role: "tablist", style: "display:flex;gap:4px;border-bottom:1px solid var(--uo-outline-variant,#ccc)" });
    const mkTab = (id, label) => {
      const b = el9("button", { type: "button", className: "uo-btn", textContent: label, role: "tab", style: "padding:6px 12px;border-radius:6px 6px 0 0" });
      b.addEventListener("click", () => this.show(id));
      tabBar.append(b);
      return b;
    };
    const tabs = { find: mkTab("find", T4("Find", "Localizar")), replace: mkTab("replace", T4("Replace", "Substituir")), goto: mkTab("goto", T4("Go To", "Ir para")) };
    const find = el9("input", { type: "text", value: memo.find, style: "flex:1;min-width:0", ariaLabel: T4("Find what", "Localizar") });
    const repl = el9("input", { type: "text", value: memo.repl, style: "flex:1;min-width:0", ariaLabel: T4("Replace with", "Substituir por") });
    find.addEventListener("focus", () => {
      this.active = "find";
    });
    repl.addEventListener("focus", () => {
      this.active = "repl";
    });
    find.addEventListener("input", () => {
      memo.find = find.value;
      this.setStatus("");
    });
    repl.addEventListener("input", () => {
      memo.repl = repl.value;
    });
    const findFmt = el9("div", { style: "font-size:12px;opacity:.8;min-height:14px" });
    const replFmt = el9("div", { style: "font-size:12px;opacity:.8;min-height:14px" });
    const lab = (t2) => el9("span", { textContent: t2, style: "width:110px;flex:none" });
    const findRow = el9(
      "div",
      { style: "display:flex;flex-direction:column;gap:2px" },
      el9("div", { style: "display:flex;align-items:center;gap:8px" }, lab(T4("Find what:", "Localizar:")), find),
      el9("div", { style: "padding-left:118px" }, findFmt)
    );
    const replRow = el9(
      "div",
      { style: "display:flex;flex-direction:column;gap:2px" },
      el9("div", { style: "display:flex;align-items:center;gap:8px" }, lab(T4("Replace with:", "Substituir por:")), repl),
      el9("div", { style: "padding-left:118px" }, replFmt)
    );
    const C = (k, en, pt) => {
      const c = check5(T4(en, pt), !!memo.opts[k]);
      c.input.addEventListener("change", () => {
        memo.opts[k] = c.input.checked;
        this.syncOpts();
      });
      checks[k] = c.input;
      return c.el;
    };
    const checks = {};
    const dir = el9("select", {});
    for (const [v, en, pt] of [["all", "All", "Tudo"], ["down", "Down", "Abaixo"], ["up", "Up", "Acima"]]) dir.append(el9("option", { value: v, textContent: T4(en, pt) }));
    dir.value = memo.dir;
    dir.addEventListener("change", () => {
      memo.dir = dir.value;
    });
    const formatBtn = btn(`${T4("Format", "Formatar")} \u25BE`);
    formatBtn.addEventListener("click", () => this.formatMenu(formatBtn));
    const specialBtn = btn(`${T4("Special", "Especial")} \u25BE`);
    specialBtn.addEventListener("click", () => this.specialMenu(specialBtn));
    const noFmtBtn = btn(T4("No Formatting", "Sem Formata\xE7\xE3o"));
    noFmtBtn.addEventListener("click", () => {
      if (this.active === "repl" && this.tab === "replace") memo.replFmt = {};
      else memo.findFmt = {};
      this.syncFormat();
    });
    const more = el9(
      "div",
      { style: "display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--uo-outline-variant,#ccc);padding-top:8px" },
      el9("strong", { textContent: T4("Search Options", "Op\xE7\xF5es de pesquisa") }),
      el9("div", { style: "display:flex;align-items:center;gap:8px" }, el9("span", { textContent: T4("Search:", "Pesquisar:") }), dir),
      el9(
        "div",
        { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px 16px" },
        C("matchCase", "Match case", "Diferenciar mai\xFAsculas e min\xFAsculas"),
        C("prefix", "Match prefix", "Coincidir prefixo"),
        C("wholeWord", "Find whole words only", "Localizar apenas palavras inteiras"),
        C("suffix", "Match suffix", "Coincidir sufixo"),
        C("wildcards", "Use wildcards", "Usar caracteres curinga"),
        el9("span"),
        C("soundsLike", "Sounds like (English)", "Semelhantes (Ingl\xEAs)"),
        C("ignorePunct", "Ignore punctuation characters", "Ignorar caracteres de pontua\xE7\xE3o"),
        C("allForms", "Find all word forms (English)", "Todas as formas da palavra (Ingl\xEAs)"),
        C("ignoreSpace", "Ignore white-space characters", "Ignorar espa\xE7os em branco")
      ),
      el9("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, formatBtn, specialBtn, noFmtBtn)
    );
    more.hidden = !memo.more;
    const moreBtn = btn(memo.more ? T4("<< Less", "<< Menos") : T4("More >>", "Mais >>"));
    moreBtn.addEventListener("click", () => {
      memo.more = !memo.more;
      more.hidden = !memo.more;
      moreBtn.textContent = memo.more ? T4("<< Less", "<< Menos") : T4("More >>", "Mais >>");
    });
    const status = el9("div", { role: "status", style: "font-size:13px;min-height:18px" });
    const readBtn = btn(`${T4("Reading Highlight", "Realce de Leitura")} \u25BE`);
    readBtn.addEventListener("click", () => openMenu([
      { id: "hl:all", label: { en: "Highlight All", pt: "Real\xE7ar Tudo" }, onClick: () => this.highlightAll() },
      { id: "hl:clear", label: { en: "Clear Highlighting", pt: "Limpar Realce" }, onClick: () => {
        ed.clearSearch();
        this.setStatus("");
      } }
    ], { anchor: readBtn, side: "below" }, { lang, layer: this.env.layer }));
    const inBtn = btn(`${T4("Find In", "Localizar em")} \u25BE`);
    inBtn.addEventListener("click", () => openMenu([
      { id: "in:sel", label: { en: "Current Selection", pt: "Sele\xE7\xE3o Atual" }, disabled: !ed.selectedText(), onClick: () => this.findIn("selection") },
      { id: "in:main", label: { en: "Main Document", pt: "Documento Principal" }, onClick: () => this.findIn("document") }
    ], { anchor: inBtn, side: "below" }, { lang, layer: this.env.layer }));
    const nextBtn = btn(T4("Find Next", "Localizar Pr\xF3xima"), true);
    nextBtn.addEventListener("click", () => this.findNext());
    const replOne = btn(T4("Replace", "Substituir"));
    replOne.addEventListener("click", () => this.replaceOne());
    const replAll = btn(T4("Replace All", "Substituir Tudo"));
    replAll.addEventListener("click", () => this.replaceAll());
    const cancel = btn(T4("Cancel", "Cancelar"));
    cancel.addEventListener("click", () => this.close());
    const findBtns = el9("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, readBtn, inBtn);
    const replBtns = el9("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, replOne, replAll);
    const footer = el9(
      "div",
      { style: "display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;align-items:center" },
      el9("div", { style: "display:flex;gap:6px" }, moreBtn),
      el9("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, findBtns, replBtns, nextBtn, cancel)
    );
    const findPane = el9("div", { style: "display:flex;flex-direction:column;gap:8px" }, findRow, replRow, status, footer, more);
    for (const i of [find, repl]) {
      i.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (i === repl && e.ctrlKey) this.replaceAll();
          else this.findNext();
        }
      });
    }
    const gotoList = el9("select", { size: 8, style: "width:180px;height:180px" });
    for (const [v, en, pt] of GOTO) gotoList.append(el9("option", { value: v, textContent: T4(en, pt) }));
    gotoList.value = memo.gotoWhat;
    const gotoLabel = el9("span", {});
    const gotoData = el9("datalist", { id: `uw-goto-${Math.random().toString(36).slice(2)}` });
    const gotoInput = el9("input", { type: "text", style: "width:100%" });
    gotoInput.setAttribute("list", gotoData.id);
    const prevBtn = btn(T4("Previous", "Anterior"));
    const gotoNext = btn(T4("Next", "Avan\xE7ar"), true);
    const gotoClose = btn(T4("Close", "Fechar"));
    gotoClose.addEventListener("click", () => this.close());
    const gotoStatus = el9("div", { role: "status", style: "font-size:13px;min-height:18px" });
    const syncGoto = () => {
      const w = gotoList.value;
      memo.gotoWhat = w;
      const g = GOTO.find((x) => x[0] === w);
      gotoLabel.textContent = T4(g[3], g[4]);
      gotoData.replaceChildren();
      const opts = w === "bookmark" ? ed.getBookmarks().map((b) => b.name) : w === "comment" ? [...new Set(ed.getComments().map((c) => c.author ?? "").filter(Boolean))] : w === "field" ? ["PAGE", "NUMPAGES", "DATE", "TIME", "TOC", "REF", "PAGEREF", "HYPERLINK", "SEQ", "STYLEREF", "FILENAME", "AUTHOR"] : [];
      for (const o of opts) gotoData.append(el9("option", { value: o }));
      gotoNext.textContent = gotoInput.value.trim() && !/^[+-]/.test(gotoInput.value.trim()) ? T4("Go To", "Ir para") : T4("Next", "Avan\xE7ar");
      prevBtn.disabled = w === "bookmark";
      gotoStatus.textContent = "";
    };
    gotoList.addEventListener("change", syncGoto);
    gotoInput.addEventListener("input", syncGoto);
    const go = (target) => {
      const ok = ed.goTo(gotoList.value, target);
      gotoStatus.textContent = ok ? "" : T4("The item could not be found.", "O item n\xE3o foi encontrado.");
      this.env.after();
    };
    gotoNext.addEventListener("click", () => go(gotoInput.value));
    prevBtn.addEventListener("click", () => go("-1"));
    gotoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        go(gotoInput.value);
      }
    });
    const gotoPane = el9(
      "div",
      { style: "display:flex;flex-direction:column;gap:8px" },
      el9(
        "div",
        { style: "display:flex;gap:12px" },
        el9("label", { style: "display:flex;flex-direction:column;gap:4px" }, T4("Go to what:", "Ir para:"), gotoList),
        el9(
          "div",
          { style: "flex:1;display:flex;flex-direction:column;gap:4px" },
          gotoLabel,
          gotoInput,
          gotoData,
          el9("div", { style: "font-size:12px;opacity:.8", textContent: T4("Enter + and - to move relative to the current location. Example: +4 will move forward four items.", "Digite + e - para mover-se em rela\xE7\xE3o \xE0 posi\xE7\xE3o atual. Exemplo: +4 avan\xE7ar\xE1 quatro itens.") })
        )
      ),
      gotoStatus,
      el9("div", { style: "display:flex;gap:6px;justify-content:flex-end" }, prevBtn, gotoNext, gotoClose)
    );
    root.append(tabBar, findPane, gotoPane);
    this.els = { tabs, findRow, replRow, gotoPane, findPane, find, repl, findFmt, replFmt, more, moreBtn, status, replBtns, findBtns, checks, dir, gotoList, gotoInput, gotoLabel, gotoNext, gotoData };
    syncGoto();
    this.syncOpts();
    this.syncFormat();
    return root;
  }
  show(tab) {
    this.tab = tab;
    const e = this.els;
    for (const [k, b] of Object.entries(e.tabs)) {
      const on = k === tab;
      b.setAttribute("aria-selected", String(on));
      b.style.fontWeight = on ? "600" : "";
      b.style.borderBottom = on ? "2px solid var(--uo-primary,#3a72c4)" : "2px solid transparent";
    }
    e.findPane.hidden = tab === "goto";
    e.gotoPane.hidden = tab !== "goto";
    const replace = tab === "replace" && !this.env.ed.isProtected();
    e.replRow.hidden = !replace;
    e.replBtns.hidden = !replace;
    e.findBtns.hidden = replace;
    e.find.value = memo.find;
    const focus = tab === "goto" ? e.gotoInput : e.find;
    queueMicrotask(() => {
      focus.focus();
      focus.select();
    });
  }
  /** Semelhantes / todas as formas / curingas se excluem (o Word desmarca os outros). */
  syncOpts() {
    const c = this.els.checks, o = memo.opts;
    if (o.wildcards) {
      o.soundsLike = false;
      o.allForms = false;
      o.matchCase = false;
      o.wholeWord = false;
    }
    if (o.soundsLike) o.allForms = false;
    for (const [k, i] of Object.entries(c)) i.checked = !!o[k];
    for (const k of ["matchCase", "wholeWord", "prefix", "suffix", "ignorePunct", "ignoreSpace", "soundsLike", "allForms"]) {
      const i = c[k];
      if (i) i.disabled = !!o.wildcards || (k === "matchCase" || k === "wholeWord" || k === "prefix" || k === "suffix" || k === "ignorePunct" || k === "ignoreSpace" || k === "allForms") && !!o.soundsLike || k !== "allForms" && k !== "soundsLike" && !!o.allForms && k !== "matchCase";
    }
  }
  syncFormat() {
    const lang = this.env.lang;
    const f = formatSummary(memo.findFmt, lang), r = formatSummary(memo.replFmt, lang);
    this.els.findFmt.textContent = f ? `${tr8(lang, "Format:", "Formato:")} ${f}` : "";
    this.els.replFmt.textContent = r ? `${tr8(lang, "Format:", "Formato:")} ${r}` : "";
    const optsTxt = Object.entries(memo.opts).filter(([, v]) => v).length;
    this.els.moreBtn.title = optsTxt ? tr8(lang, `${optsTxt} options on`, `${optsTxt} op\xE7\xF5es ligadas`) : "";
  }
  query() {
    const f = memo.findFmt;
    return { text: this.els.find.value, ...memo.opts, ...Object.keys(f).length ? { format: f } : {} };
  }
  runOpts() {
    return { direction: memo.dir };
  }
  setStatus(msg) {
    this.els.status.textContent = msg;
  }
  ready() {
    const q = this.query();
    if (!q.text && !q.format) {
      this.els.find.focus();
      return false;
    }
    memo.find = q.text;
    return true;
  }
  findNext() {
    if (!this.ready()) return;
    const { lang } = this.env;
    const r = this.env.ed.findNextMatch(this.query(), this.runOpts());
    this.setStatus(r.error ?? (r.found ? r.wrapped ? tr8(lang, "Search continued from the beginning of the document.", "A pesquisa continuou do in\xEDcio do documento.") : "" : tr8(lang, "Finished searching the document. The search item was not found.", "A pesquisa no documento terminou. O item n\xE3o foi encontrado.")));
    this.env.after();
  }
  replaceOne() {
    if (!this.ready()) return;
    memo.repl = this.els.repl.value;
    const r = this.env.ed.replaceMatch(this.query(), memo.repl, { ...this.runOpts(), ...Object.keys(memo.replFmt).length ? { replaceFormat: memo.replFmt } : {} });
    const lang = this.env.lang;
    this.setStatus(r.error ?? (r.found ? "" : tr8(lang, "Finished searching the document. The search item was not found.", "A pesquisa no documento terminou. O item n\xE3o foi encontrado.")));
    this.env.after();
  }
  replaceAll() {
    if (!this.ready()) return;
    memo.repl = this.els.repl.value;
    const r = this.env.ed.replaceAllMatches(this.query(), memo.repl, { ...Object.keys(memo.replFmt).length ? { replaceFormat: memo.replFmt } : {} });
    const lang = this.env.lang;
    this.setStatus(r.error ?? (r.count ? tr8(lang, `All done. We made ${r.count} replacements.`, `Conclu\xEDdo. Fizemos ${r.count} substitui\xE7\xF5es.`) : tr8(lang, "We couldn\u2019t find what you were looking for.", "N\xE3o encontramos o que voc\xEA estava procurando.")));
    this.env.after();
  }
  highlightAll() {
    if (!this.ready()) return;
    const n = this.env.ed.highlightMatches(this.query());
    this.setStatus(tr8(this.env.lang, `${n} items were found matching this criteria.`, `Foram encontrados ${n} itens que correspondem a esse crit\xE9rio.`));
  }
  findIn(within) {
    if (!this.ready()) return;
    const n = this.env.ed.selectAllMatches(this.query(), { within });
    this.setStatus(tr8(this.env.lang, `${n} items were found matching this criteria.`, `Foram encontrados ${n} itens que correspondem a esse crit\xE9rio.`));
    this.env.after();
  }
  // ───── Formatar e Especial ─────
  target() {
    return this.active === "repl" && this.tab === "replace" ? { input: this.els.repl, fmt: "replFmt" } : { input: this.els.find, fmt: "findFmt" };
  }
  formatMenu(anchor) {
    const { lang } = this.env;
    const t2 = this.target();
    const f = memo[t2.fmt];
    const hl = f.highlight;
    openMenu([
      { id: "fmt:font", label: { en: "Font\u2026", pt: "Fonte\u2026" }, onClick: () => void this.fontFormat(t2.fmt) },
      { id: "fmt:style", label: { en: "Style\u2026", pt: "Estilo\u2026" }, onClick: () => void this.styleFormat(t2.fmt) },
      // Realce: realce → sem realce → indiferente (como o Word)
      { id: "fmt:hl", label: { en: "Highlight", pt: "Realce" }, checked: hl !== void 0, onClick: () => {
        const next = { ...f };
        if (hl === void 0) next.highlight = true;
        else if (hl) next.highlight = false;
        else delete next.highlight;
        memo[t2.fmt] = next;
        this.syncFormat();
      } }
    ], { anchor, side: "below" }, { lang, layer: this.env.layer });
  }
  specialMenu(anchor) {
    const t2 = this.target();
    const list = t2.fmt === "replFmt" ? memo.opts.wildcards ? [["\\n", "Find What Expression", "Express\xE3o Localizada"], ...SPECIAL_REPL] : SPECIAL_REPL : memo.opts.wildcards ? SPECIAL_WILD : SPECIAL_FIND;
    const items = list.map(([code, en, pt]) => ({ id: `sp:${code}`, label: { en, pt }, onClick: () => {
      const i = t2.input;
      const s = i.selectionStart ?? i.value.length, e = i.selectionEnd ?? i.value.length;
      const ins = code === "\\n" ? "\\1" : code;
      i.value = i.value.slice(0, s) + ins + i.value.slice(e);
      i.focus();
      i.setSelectionRange(s + ins.length, s + ins.length);
      if (t2.fmt === "findFmt") memo.find = i.value;
      else memo.repl = i.value;
    } }));
    openMenu(items, { anchor, side: "below" }, { lang: this.env.lang, layer: this.env.layer });
  }
  /** Formatar › Fonte: cada atributo "indiferente", sim ou não. */
  async fontFormat(which) {
    const { lang } = this.env;
    const T4 = (en, pt) => tr8(lang, en, pt);
    const f = { ...memo[which] };
    const tri = (v) => v === void 0 ? "" : v ? "1" : "0";
    const triSel = (label, v) => {
      const s = el9("select", {});
      for (const [k, en, pt] of [["", "(any)", "(qualquer)"], ["1", "Yes", "Sim"], ["0", "No", "N\xE3o"]]) s.append(el9("option", { value: k, textContent: T4(en, pt) }));
      s.value = tri(v);
      return { row: el9("label", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, label, s), get: () => s.value === "" ? void 0 : s.value === "1" };
    };
    const font = el9("input", { type: "text", value: f.font ?? "" });
    const size = el9("input", { type: "number", value: f.sizePt ? String(f.sizePt) : "", min: "1", max: "1638", step: "0.5", style: "width:80px" });
    const color = el9("input", { type: "text", value: f.color ?? "", placeholder: "RRGGBB", style: "width:90px" });
    const fields = {
      bold: triSel(T4("Bold", "Negrito"), f.bold),
      italic: triSel(T4("Italic", "It\xE1lico"), f.italic),
      underline: triSel(T4("Underline", "Sublinhado"), f.underline),
      strike: triSel(T4("Strikethrough", "Tachado"), f.strike),
      allCaps: triSel(T4("All caps", "Todas em mai\xFAsculas"), f.allCaps),
      smallCaps: triSel(T4("Small caps", "Versalete"), f.smallCaps),
      hidden: triSel(T4("Hidden", "Oculto"), f.hidden)
    };
    const va = el9("select", {});
    for (const [k, en, pt] of [["", "(any)", "(qualquer)"], ["superscript", "Superscript", "Sobrescrito"], ["subscript", "Subscript", "Subscrito"]]) va.append(el9("option", { value: k, textContent: T4(en, pt) }));
    va.value = f.vertAlign ?? "";
    const body = el9(
      "div",
      { style: "display:flex;flex-direction:column;gap:8px;min-width:320px" },
      el9("label", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, T4("Font:", "Fonte:"), font),
      el9("label", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, T4("Size:", "Tamanho:"), size),
      el9("label", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, T4("Font color:", "Cor da fonte:"), color),
      ...Object.values(fields).map((x) => x.row),
      el9("label", { style: "display:flex;justify-content:space-between;gap:8px;align-items:center" }, T4("Position:", "Posi\xE7\xE3o:"), va)
    );
    const h = openDialog({
      title: which === "findFmt" ? T4("Find Font", "Localizar Fonte") : T4("Replace Font", "Substituir Fonte"),
      body,
      layer: this.env.layer,
      lang,
      actions: [{ id: "cancel", label: { en: "Cancel", pt: "Cancelar" } }, { id: "ok", label: "OK", primary: true }]
    });
    if (await h.result !== "ok") return;
    const out = { ...f.highlight !== void 0 ? { highlight: f.highlight } : {}, ...f.paraStyle ? { paraStyle: f.paraStyle } : {}, ...f.charStyle ? { charStyle: f.charStyle } : {} };
    if (font.value.trim()) out.font = font.value.trim();
    const sz = parseFloat(size.value.replace(",", "."));
    if (Number.isFinite(sz) && sz > 0) out.sizePt = sz;
    const hex = color.value.trim().replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(hex)) out.color = hex.toUpperCase();
    for (const [k, x] of Object.entries(fields)) {
      const v = x.get();
      if (v !== void 0) out[k] = v;
    }
    if (va.value) out.vertAlign = va.value;
    memo[which] = out;
    this.syncFormat();
  }
  /** Formatar › Estilo: o estilo procurado (ou o da substituição). */
  async styleFormat(which) {
    const { ed, lang } = this.env;
    const T4 = (en, pt) => tr8(lang, en, pt);
    const styles = ed.listStyles("all");
    const sel4 = el9("select", { size: 12, style: "width:100%" });
    for (const s of styles) sel4.append(el9("option", { value: `${s.kind}:${s.id}`, textContent: s.name }));
    const f = memo[which];
    const cur = f.paraStyle ? styles.find((s) => s.id === f.paraStyle) : f.charStyle ? styles.find((s) => s.id === f.charStyle) : void 0;
    if (cur) sel4.value = `${cur.kind}:${cur.id}`;
    const h = openDialog({
      title: which === "findFmt" ? T4("Find Style", "Localizar Estilo") : T4("Replace Style", "Substituir Estilo"),
      body: el9("div", { style: "min-width:300px" }, sel4),
      layer: this.env.layer,
      lang,
      actions: [{ id: "cancel", label: { en: "Cancel", pt: "Cancelar" } }, { id: "ok", label: "OK", primary: true }]
    });
    if (await h.result !== "ok" || !sel4.value) return;
    const [kind, id] = [sel4.value.slice(0, sel4.value.indexOf(":")), sel4.value.slice(sel4.value.indexOf(":") + 1)];
    const next = { ...f };
    delete next.paraStyle;
    delete next.charStyle;
    if (kind === "character") next.charStyle = id;
    else next.paraStyle = id;
    memo[which] = next;
    this.syncFormat();
  }
};
function findMenu() {
  return ["find", "find:advanced", "goto"];
}
function selectMenu2() {
  return ["selectAll", "select:objects", "select:similar", "pic:selectionPane"];
}
function registerFindCommands(reg, ed, app, ctl) {
  const has = (m) => () => typeof ed[m] === "function";
  const notComparing = () => !app.comparing;
  reg.add(
    { id: "find:advanced", label: { en: "Advanced Find\u2026", pt: "Localiza\xE7\xE3o Avan\xE7ada\u2026" }, icon: "search", supports: has("findNextMatch"), isEnabled: notComparing, run: () => ctl.findDialog("find") },
    { id: "goto", label: { en: "Go To\u2026", pt: "Ir para\u2026" }, icon: "arrow_forward", shortcut: "Ctrl+G", supports: has("goTo"), isEnabled: notComparing, run: () => ctl.findDialog("goto") },
    { id: "goto:f5", label: { en: "Go To\u2026", pt: "Ir para\u2026" }, icon: "arrow_forward", shortcut: "F5", supports: has("goTo"), isEnabled: notComparing, run: () => ctl.findDialog("goto") },
    {
      id: "select:objects",
      label: { en: "Select Objects", pt: "Selecionar Objetos" },
      icon: "select",
      supports: has("setSelectObjectsMode"),
      isEnabled: () => !app.comparing,
      isChecked: () => ed.isSelectObjectsMode(),
      run: () => {
        ed.setSelectObjectsMode(!ed.isSelectObjectsMode());
      }
    },
    {
      id: "select:similar",
      label: { en: "Select Text with Similar Formatting", pt: "Selecionar Texto com Formata\xE7\xE3o Semelhante" },
      icon: "select_all",
      supports: has("selectSimilarFormatting"),
      isEnabled: notComparing,
      run: () => {
        ed.selectSimilarFormatting();
      }
    }
  );
}

// src/chrome-commands.ts
var ZOOMS = [50, 75, 90, 100, 125, 150, 200];
function registerWriteCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m) => () => typeof api[m] === "function";
  const call = (m, ...args) => api[m].apply(ed, args);
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const notComparing = () => !app.comparing;
  const run = () => ctl.state().run;
  const para = () => ctl.state().para;
  const L15 = app.ui.L;
  let painterClick = 0;
  const markup = () => typeof api["getMarkupOptions"] === "function" ? call("getMarkupOptions") : { insertionsDeletions: true, formatting: true, balloons: "mixed", authors: null };
  const hasRevisions = () => typeof api["getRevisions"] === "function" && call("getRevisions").length > 0;
  const resolved = (n, accept) => {
    ctl.flash(accept ? L15.revAccepted(Number(n) || 0) : L15.revRejected(Number(n) || 0));
  };
  const edit = (c) => ({ ...c, isEnabled: c.isEnabled ? () => canEdit3() && c.isEnabled() : canEdit3 });
  const bodyOnly = () => ed.editingHeaderFooter() === null && !ed.editingTextbox() && !ed.editingTableCell();
  const section4 = () => typeof api["getSection"] === "function" ? call("getSection") : null;
  const cmds = [
    // ── Arquivo ──
    { id: "new", label: { en: "New", pt: "Novo" }, tip: { en: "New document", pt: "Novo documento" }, icon: "note_add", run: () => app.newDocument(), isEnabled: notComparing },
    { id: "open", label: { en: "Open\u2026", pt: "Abrir\u2026" }, icon: "folder_open", shortcut: "Ctrl+O", run: () => app.open(), isEnabled: notComparing },
    { id: "save", label: { en: "Save", pt: "Salvar" }, icon: "save", shortcut: "Ctrl+S", run: () => app.save(false), isEnabled: notComparing },
    { id: "saveAs", label: { en: "Save as\u2026", pt: "Salvar como\u2026" }, icon: "save_as", shortcut: "Ctrl+Shift+S", run: () => app.save(true), isEnabled: notComparing },
    { id: "fontsInFile", label: { en: "Fonts in the file\u2026", pt: "Fontes no arquivo\u2026" }, icon: "font_download", run: () => app.fontEmbedding() },
    { id: "export:pdf", label: { en: "PDF document (.pdf)", pt: "Documento PDF (.pdf)" }, icon: "picture_as_pdf", run: () => app.export("pdf") },
    { id: "export:odt", label: { en: "OpenDocument (.odt)", pt: "OpenDocument (.odt)" }, icon: "description", run: () => app.export("odt") },
    { id: "export:html", label: { en: "Web page (.html)", pt: "P\xE1gina da Web (.html)" }, icon: "html", run: () => app.export("html") },
    { id: "export:md", label: { en: "Markdown (.md)", pt: "Markdown (.md)" }, icon: "markdown", run: () => app.export("md") },
    { id: "export:xps", label: { en: "XPS document (.xps)", pt: "Documento XPS (.xps)" }, icon: "draft", run: () => app.export("xps") },
    { id: "print", label: { en: "Print", pt: "Imprimir" }, icon: "print", shortcut: "Ctrl+P", run: () => ed.print(), isEnabled: notComparing },
    { id: "compare", label: { en: "Compare with\u2026", pt: "Comparar com\u2026" }, tip: { en: "Compare the current document with another .docx", pt: "Compara o documento atual com outro .docx" }, icon: "compare", run: () => ctl.compare(), isEnabled: notComparing },
    // ── Editar ──
    edit({ id: "undo", label: { en: "Undo", pt: "Desfazer" }, icon: "undo", shortcut: "Ctrl+Z", run: () => ed.undo() }),
    edit({ id: "redo", label: { en: "Redo", pt: "Refazer" }, icon: "redo", shortcut: "Ctrl+Y", run: () => ed.redo() }),
    edit({ id: "cut", label: { en: "Cut", pt: "Recortar" }, icon: "content_cut", shortcut: "Ctrl+X", run: () => ed.cut(), isEnabled: () => ed.selectedText().length > 0 }),
    { id: "copy", label: { en: "Copy", pt: "Copiar" }, icon: "content_copy", shortcut: "Ctrl+C", run: () => ed.copy(), isEnabled: () => notComparing() && ed.selectedText().length > 0 },
    edit({ id: "paste", label: { en: "Paste", pt: "Colar" }, icon: "content_paste", shortcut: "Ctrl+V", run: () => ed.paste() }),
    edit({ id: "pastePlain", label: { en: "Paste without formatting", pt: "Colar sem formata\xE7\xE3o" }, icon: "content_paste_go", shortcut: "Ctrl+Shift+V", run: () => ed.pastePlain() }),
    { id: "selectAll", label: { en: "Select all", pt: "Selecionar tudo" }, icon: "select_all", shortcut: "Ctrl+A", run: () => ed.selectAll(), isEnabled: notComparing },
    { id: "find", label: { en: "Find", pt: "Localizar" }, icon: "search", shortcut: "Ctrl+F", run: () => ctl.find(false), isEnabled: notComparing },
    { id: "replace", label: { en: "Replace", pt: "Substituir" }, icon: "find_replace", shortcut: "Ctrl+H", run: () => ctl.find(true), isEnabled: canEdit3 },
    // Pincel: um clique = uma vez; duplo clique trava (até Esc ou outro clique) — como o Word
    edit({
      id: "painter",
      label: { en: "Format Painter", pt: "Pincel de Formata\xE7\xE3o" },
      tip: { en: "Format Painter (double-click to apply to several places; Esc ends)", pt: "Pincel de Formata\xE7\xE3o (clique duplo para aplicar em v\xE1rios lugares; Esc encerra)" },
      icon: "format_paint",
      run: () => {
        const now = Date.now();
        if (now - painterClick < 450 && ed.painterActive()) ed.copyFormat(true);
        else if (ed.painterActive()) ed.cancelFormatPainter();
        else ed.copyFormat();
        painterClick = now;
      },
      isChecked: () => ed.painterActive()
    }),
    // ── Exibir ──
    ...["print", "web", "read", "outline", "draft"].map((v) => ({
      id: `view:${v}`,
      label: {
        print: { en: "Print Layout", pt: "Layout de Impress\xE3o" },
        web: { en: "Web Layout", pt: "Layout da Web" },
        read: { en: "Read Mode", pt: "Modo de Leitura" },
        outline: { en: "Outline", pt: "Estrutura de T\xF3picos" },
        draft: { en: "Draft", pt: "Rascunho" }
      }[v],
      icon: { print: "article", web: "language", read: "menu_book", outline: "format_list_bulleted", draft: "notes" }[v],
      run: () => ed.setView(v),
      isChecked: () => ed.getView() === v,
      isEnabled: notComparing
    })),
    // Mostrar (Exibir): Régua, Linhas de Grade e Painel de Navegação
    { id: "view:ruler", label: { en: "Ruler", pt: "R\xE9gua" }, tip: { en: "Show the rulers to measure and line up objects, indents and tabs", pt: "Mostra as r\xE9guas para medir e alinhar objetos, recuos e tabula\xE7\xF5es" }, icon: "straighten", supports: has("getRulerInfo"), run: () => ctl.ruler(), isChecked: () => ctl.rulerOn() },
    { id: "view:gridlines", label: { en: "Gridlines", pt: "Linhas de Grade" }, tip: { en: "Show the document grid on the page", pt: "Mostra a grade do documento na p\xE1gina" }, icon: "grid_4x4", supports: has("showGridlines"), run: () => ctl.gridlines(), isChecked: () => ed.gridlinesShown() },
    { id: "view:bookmarks", label: { en: "Bookmarks", pt: "Indicadores" }, tip: { en: "Show bookmarks (gray brackets on the screen)", pt: "Mostrar indicadores (colchetes cinza na tela)" }, icon: "bookmarks", supports: has("showBookmarks"), run: () => {
      ed.showBookmarks();
    }, isChecked: () => ed.bookmarksShown() },
    { id: "view:navpane", label: { en: "Navigation Pane", pt: "Painel de Navega\xE7\xE3o" }, tip: { en: "Headings, pages and search results of the document", pt: "T\xEDtulos, p\xE1ginas e resultados da pesquisa no documento" }, icon: "side_navigation", supports: has("getHeadings"), run: () => ctl.navPane(), isChecked: () => ctl.navPaneOpen() },
    { id: "focus", label: { en: "Focus", pt: "Foco" }, tip: { en: "Focus mode \u2014 full screen (Esc to exit)", pt: "Modo foco \u2014 tela inteira (Esc para sair)" }, icon: "center_focus_strong", run: () => ctl.focusMode(), isChecked: () => ctl.inFocusMode() },
    { id: "marks", label: { en: "Formatting marks", pt: "Mostrar tudo" }, tip: { en: "Show paragraph marks and other formatting symbols", pt: "Mostrar marcas de par\xE1grafo e outros s\xEDmbolos de formata\xE7\xE3o" }, icon: "format_paragraph", shortcut: "Ctrl+Shift+8", run: () => ed.toggleMarks(), isChecked: () => ctl.state().marks },
    { id: "comments", label: { en: "Show comments", pt: "Mostrar coment\xE1rios" }, icon: "comment", run: () => ctl.toggleComments(), isChecked: () => app.commentsVisible, supports: () => true },
    { id: "zoomin", label: { en: "Zoom in", pt: "Ampliar" }, icon: "zoom_in", run: () => ed.setZoom(Math.min(5, Math.round(ed.getZoom() * 110) / 100)) },
    { id: "zoomout", label: { en: "Zoom out", pt: "Reduzir" }, icon: "zoom_out", run: () => ed.setZoom(Math.max(0.1, Math.round(ed.getZoom() / 1.1 * 100) / 100)) },
    { id: "zoom100", label: { en: "100%", pt: "100%" }, tip: { en: "Zoom to 100%", pt: "Zoom em 100%" }, icon: "search", run: () => ed.setZoom(1) },
    { id: "toolbar:ribbon", label: { en: "Ribbon", pt: "Faixa de op\xE7\xF5es" }, icon: "view_compact_alt", run: () => ctl.setToolbarMode("ribbon"), isChecked: () => ctl.toolbarMode() === "ribbon" },
    { id: "toolbar:compact", label: { en: "Compact toolbar", pt: "Barra compacta" }, icon: "toolbar", run: () => ctl.setToolbarMode("compact"), isChecked: () => ctl.toolbarMode() === "compact" },
    { id: "statusbar", label: { en: "Status bar", pt: "Barra de status" }, icon: "call_to_action", run: () => {
      ed.bottombar = !ed.bottombar;
    }, isChecked: () => ed.bottombar },
    // ── Inserir ──
    edit({ id: "image", label: { en: "Image\u2026", pt: "Imagem\u2026" }, tip: { en: "Insert image", pt: "Inserir imagem" }, icon: "image", run: () => ctl.image() }),
    edit({ id: "link", label: { en: "Link\u2026", pt: "Link\u2026" }, tip: { en: "Insert link", pt: "Inserir link" }, icon: "link", shortcut: "Ctrl+K", run: () => ctl.link(), isChecked: () => !!run().link, isEnabled: () => ed.canInsertField() }),
    edit({ id: "comment", label: { en: "Comment", pt: "Coment\xE1rio" }, tip: { en: "New comment", pt: "Novo coment\xE1rio" }, icon: "add_comment", shortcut: "Ctrl+Alt+M", run: () => ctl.comment() }),
    edit({ id: "pagebreak", label: { en: "Page break", pt: "Quebra de p\xE1gina" }, icon: "insert_page_break", shortcut: "Ctrl+Enter", run: () => ed.insertPageBreak(), isEnabled: () => bodyOnly() }),
    edit({ id: "field:page", label: { en: "Page number", pt: "N\xFAmero da p\xE1gina" }, icon: "numbers", run: () => ed.insertField("PAGE") }),
    edit({ id: "field:numpages", label: { en: "Page count", pt: "N\xFAmero de p\xE1ginas" }, icon: "filter_none", run: () => ed.insertField("NUMPAGES") }),
    edit({ id: "field:date", label: { en: "Date", pt: "Data" }, tip: { en: "Insert date field", pt: "Inserir campo de data" }, icon: "calendar_today", run: () => ed.insertField("DATE") }),
    edit({ id: "header", label: { en: "Header", pt: "Cabe\xE7alho" }, icon: "vertical_align_top", run: () => ed.enterHeaderFooter("header") }),
    edit({ id: "footer", label: { en: "Footer", pt: "Rodap\xE9" }, icon: "vertical_align_bottom", run: () => ed.enterHeaderFooter("footer") }),
    { id: "hf:close", label: { en: "Close Header and Footer", pt: "Fechar Cabe\xE7alho e Rodap\xE9" }, icon: "close", run: () => ed.exitHeaderFooter(), isEnabled: () => ed.editingHeaderFooter() !== null },
    // frentes futuras: aparecem quando o método existir (tabela: chrome-table.ts)
    edit({ id: "footnote", label: { en: "Footnote", pt: "Nota de rodap\xE9" }, tip: { en: "Insert footnote", pt: "Inserir nota de rodap\xE9" }, icon: "notes", shortcut: "Ctrl+Alt+F", supports: has("insertFootnote"), isEnabled: () => ed.canInsertNote(), run: () => call("insertFootnote") }),
    edit({ id: "endnote", label: { en: "Endnote", pt: "Nota de fim" }, tip: { en: "Insert endnote", pt: "Inserir nota de fim" }, icon: "short_text", shortcut: "Ctrl+Alt+D", supports: has("insertEndnote"), isEnabled: () => ed.canInsertNote(), run: () => call("insertEndnote") }),
    // notas: navegar, mostrar, opções e converter
    { id: "note:next", label: { en: "Next Footnote", pt: "Pr\xF3xima Nota de Rodap\xE9" }, tip: { en: "Go to the next footnote", pt: "Ir para a pr\xF3xima nota de rodap\xE9" }, icon: "keyboard_arrow_down", supports: has("nextNote"), isEnabled: () => ed.noteCount("footnote") > 0, run: () => {
      ed.nextNote("footnote", 1);
    } },
    { id: "note:prev", label: { en: "Previous Footnote", pt: "Nota de Rodap\xE9 Anterior" }, icon: "keyboard_arrow_up", supports: has("nextNote"), isEnabled: () => ed.noteCount("footnote") > 0, run: () => {
      ed.nextNote("footnote", -1);
    } },
    { id: "note:nextEnd", label: { en: "Next Endnote", pt: "Pr\xF3xima Nota de Fim" }, icon: "keyboard_arrow_down", supports: has("nextNote"), isEnabled: () => ed.noteCount("endnote") > 0, run: () => {
      ed.nextNote("endnote", 1);
    } },
    { id: "note:prevEnd", label: { en: "Previous Endnote", pt: "Nota de Fim Anterior" }, icon: "keyboard_arrow_up", supports: has("nextNote"), isEnabled: () => ed.noteCount("endnote") > 0, run: () => {
      ed.nextNote("endnote", -1);
    } },
    { id: "note:show", label: { en: "Show Notes", pt: "Mostrar Notas" }, tip: { en: "Go from the reference to the note and back", pt: "Vai da refer\xEAncia \xE0 nota e volta" }, icon: "visibility", supports: has("showNotes"), isEnabled: () => ed.noteCount("footnote") + ed.noteCount("endnote") > 0, run: () => ctl.showNotes() },
    edit({ id: "dlg:notes", label: { en: "Footnote and Endnote\u2026", pt: "Notas de Rodap\xE9 e de Fim\u2026" }, tip: { en: "Location, number format and numbering of the notes", pt: "Local, formato e numera\xE7\xE3o das notas" }, icon: "notes", supports: has("setNoteOptions"), run: () => ctl.notesDialog() }),
    edit({ id: "note:convert", label: { en: "Convert Notes\u2026", pt: "Converter Notas\u2026" }, icon: "autorenew", supports: has("convertNotes"), isEnabled: () => ed.noteCount("footnote") + ed.noteCount("endnote") > 0, run: () => ctl.convertNotesDialog() }),
    { id: "note:goRef", label: { en: "Go to Reference", pt: "Ir para a Refer\xEAncia" }, icon: "keyboard_arrow_up", supports: () => !!ed.editingNote(), run: () => {
      const n = ed.editingNote();
      if (n) ed.goToNoteRef(n.kind, n.id);
    } },
    edit({ id: "note:toEndnote", label: { en: "Convert to Endnote", pt: "Converter em Nota de Fim" }, icon: "autorenew", supports: () => ed.editingNote()?.kind === "footnote", run: () => {
      const n = ed.editingNote();
      if (n) ed.convertNotes("toEndnotes", n);
    } }),
    edit({ id: "note:toFootnote", label: { en: "Convert to Footnote", pt: "Converter em Nota de Rodap\xE9" }, icon: "autorenew", supports: () => ed.editingNote()?.kind === "endnote", run: () => {
      const n = ed.editingNote();
      if (n) ed.convertNotes("toFootnotes", n);
    } }),
    edit({ id: "bookmark", label: { en: "Bookmark", pt: "Indicador" }, tip: { en: "Add, delete or go to a bookmark", pt: "Adicionar, excluir ou ir para um indicador" }, icon: "bookmark", supports: has("insertBookmark"), run: () => ctl.refsDialog("bookmark") }),
    // links e referências: Referência Cruzada, Legenda, Índice de Ilustrações
    edit({ id: "crossref", label: { en: "Cross-reference", pt: "Refer\xEAncia Cruzada" }, tip: { en: "Refer to a heading, numbered item, bookmark, note or caption", pt: "Referir-se a t\xEDtulo, item numerado, indicador, nota ou legenda" }, icon: "arrow_outward", supports: has("insertCrossReference"), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog("crossref") }),
    edit({ id: "caption", label: { en: "Insert Caption", pt: "Inserir Legenda" }, tip: { en: "Add a numbered caption to a picture, table or equation", pt: "Adicionar uma legenda numerada a imagem, tabela ou equa\xE7\xE3o" }, icon: "subtitles", supports: has("insertCaption"), isEnabled: () => !!ed.captionTarget() || ed.canInsertField(), run: () => ctl.refsDialog("caption") }),
    edit({ id: "tof", label: { en: "Insert Table of Figures", pt: "Inserir \xCDndice de Ilustra\xE7\xF5es" }, tip: { en: "List of the captions of a label", pt: "Lista das legendas de um r\xF3tulo" }, icon: "list_alt", supports: has("insertTableOfFigures"), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog("tof") }),
    edit({ id: "tof:update", label: { en: "Update Table", pt: "Atualizar Tabela" }, tip: { en: "Update the table of figures", pt: "Atualizar o \xEDndice de ilustra\xE7\xF5es" }, icon: "autorenew", supports: has("updateTableOfFigures"), run: () => {
      if (!ed.updateTableOfFigures()) ctl.flash(L15.noTof);
    } }),
    edit({ id: "textbox", label: { en: "Text box", pt: "Caixa de texto" }, icon: "text_fields", supports: has("insertTextbox"), run: () => call("insertTextbox") }),
    // quebras de seção/coluna: só no corpo (cabeçalho/rodapé, caixa e célula não)
    ...[
      ["sectionbreak", "nextPage", "Section break (next page)", "Quebra de se\xE7\xE3o (pr\xF3xima p\xE1gina)", "Start the new section on the next page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina", "insert_page_break"],
      ["sectionbreak:continuous", "continuous", "Section break (continuous)", "Quebra de se\xE7\xE3o (cont\xEDnua)", "Start the new section on the same page", "Come\xE7a a se\xE7\xE3o nova na mesma p\xE1gina", "horizontal_split"],
      ["sectionbreak:evenPage", "evenPage", "Section break (even page)", "Quebra de se\xE7\xE3o (p\xE1gina par)", "Start the new section on the next even-numbered page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina par", "looks_two"],
      ["sectionbreak:oddPage", "oddPage", "Section break (odd page)", "Quebra de se\xE7\xE3o (p\xE1gina \xEDmpar)", "Start the new section on the next odd-numbered page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina \xEDmpar", "looks_one"]
    ].map(([id, type, en, pt, ten, tpt, icon]) => edit({
      id,
      label: { en, pt },
      tip: { en: ten, pt: tpt },
      icon,
      supports: has("insertSectionBreak"),
      run: () => call("insertSectionBreak", type),
      isEnabled: bodyOnly
    })),
    edit({ id: "columnbreak", label: { en: "Column break", pt: "Quebra de coluna" }, tip: { en: "Text after the break starts in the next column", pt: "O texto depois da quebra come\xE7a na pr\xF3xima coluna" }, icon: "view_column", shortcut: "Ctrl+Shift+Enter", supports: has("insertColumnBreak"), run: () => call("insertColumnBreak"), isEnabled: bodyOnly }),
    // colunas (galeria do grupo Configurar Página)
    ...[
      ["one", "One", "Uma", "crop_portrait"],
      ["two", "Two", "Duas", "view_column_2"],
      ["three", "Three", "Tr\xEAs", "view_column"],
      ["left", "Left", "Esquerda", "splitscreen_left"],
      ["right", "Right", "Direita", "splitscreen_right"]
    ].map(([p, en, pt, icon]) => edit({
      id: `columns:${p}`,
      label: { en, pt },
      icon,
      supports: has("setColumns"),
      run: () => call("setColumns", p),
      isChecked: () => section4()?.columns.preset === p
    })),
    edit({ id: "dlg:columns", label: { en: "More Columns\u2026", pt: "Mais Colunas\u2026" }, tip: { en: "Number, width and spacing of the columns", pt: "N\xFAmero, largura e espa\xE7amento das colunas" }, icon: "view_week", supports: has("setColumns"), run: () => ctl.columnsDialog() }),
    // ── Formatar: fonte ──
    edit({ id: "bold", label: { en: "Bold", pt: "Negrito" }, icon: "format_bold", shortcut: "Ctrl+B", run: () => ed.toggleRunProp("bold"), isChecked: () => !!run().bold }),
    edit({ id: "italic", label: { en: "Italic", pt: "It\xE1lico" }, icon: "format_italic", shortcut: "Ctrl+I", run: () => ed.toggleRunProp("italic"), isChecked: () => !!run().italic }),
    edit({ id: "underline", label: { en: "Underline", pt: "Sublinhado" }, icon: "format_underlined", shortcut: "Ctrl+U", run: () => ed.toggleUnderline(), isChecked: () => !!run().underline }),
    edit({ id: "doubleStrike", label: { en: "Double strikethrough", pt: "Tachado duplo" }, icon: "format_strikethrough", run: () => ed.toggleRunProp("doubleStrike"), isChecked: () => !!run().doubleStrike }),
    edit({ id: "hidden", label: { en: "Hidden", pt: "Oculto" }, icon: "visibility_off", shortcut: "Ctrl+Shift+H", run: () => ed.toggleRunProp("hidden"), isChecked: () => !!run().hidden }),
    edit({ id: "strike", label: { en: "Strikethrough", pt: "Tachado" }, icon: "format_strikethrough", run: () => ed.toggleRunProp("strike"), isChecked: () => !!run().strike }),
    edit({ id: "sup", label: { en: "Superscript", pt: "Sobrescrito" }, icon: "superscript", shortcut: "Ctrl+Shift+=", run: () => ed.toggleVertAlign("superscript"), isChecked: () => run().vertAlign === "superscript" }),
    edit({ id: "sub", label: { en: "Subscript", pt: "Subscrito" }, icon: "subscript", shortcut: "Ctrl+=", run: () => ed.toggleVertAlign("subscript"), isChecked: () => run().vertAlign === "subscript" }),
    edit({ id: "allCaps", label: { en: "All caps", pt: "Todas em mai\xFAsculas" }, icon: "uppercase", shortcut: "Ctrl+Shift+A", run: () => ed.toggleRunProp("allCaps"), isChecked: () => !!run().allCaps }),
    edit({ id: "smallCaps", label: { en: "Small caps", pt: "Versalete" }, icon: "match_case", shortcut: "Ctrl+Shift+K", run: () => ed.toggleRunProp("smallCaps"), isChecked: () => !!run().smallCaps }),
    edit({ id: "case:upper", label: { en: "UPPERCASE", pt: "MAI\xDASCULAS" }, run: () => ed.changeCase("upper") }),
    edit({ id: "case:lower", label: { en: "lowercase", pt: "min\xFAsculas" }, run: () => ed.changeCase("lower") }),
    edit({ id: "grow", label: { en: "Increase font size", pt: "Aumentar Fonte" }, icon: "text_increase", shortcut: "Ctrl+]", run: () => ed.growFont(1) }),
    edit({ id: "shrink", label: { en: "Decrease font size", pt: "Diminuir Fonte" }, icon: "text_decrease", shortcut: "Ctrl+[", run: () => ed.growFont(-1) }),
    edit({ id: "color", label: { en: "Font color", pt: "Cor da Fonte" }, icon: "format_color_text", run: () => ed.setColor(colorFromPick(app.lastColor, ed.documentThemeColors())), color: () => `#${pickHex(app.lastColor, ed.documentThemeColors())}` }),
    edit({ id: "highlight", label: { en: "Text highlight color", pt: "Cor do Realce do Texto" }, icon: "format_ink_highlighter", run: () => ed.setHighlight(app.lastHighlight), color: () => HL_CSS[app.lastHighlight] }),
    edit({ id: "clear", label: { en: "Clear All Formatting", pt: "Limpar Toda a Formata\xE7\xE3o" }, icon: "format_clear", run: () => ed.clearFormatting() }),
    edit({ id: "dlg:font", label: { en: "Font\u2026", pt: "Fonte\u2026" }, tip: { en: "Font settings", pt: "Configura\xE7\xF5es de fonte" }, icon: "text_format", shortcut: "Ctrl+D", run: () => ctl.fontDialog() }),
    // ── Estilos (chrome-styles.ts) ──
    { id: "styles:pane", label: { en: "Styles pane", pt: "Painel de Estilos" }, tip: { en: "Styles (Ctrl+Alt+Shift+S)", pt: "Estilos (Ctrl+Alt+Shift+S)" }, icon: "view_sidebar", shortcut: "Ctrl+Alt+Shift+S", supports: has("listStyles"), run: () => ctl.stylesPane(), isChecked: () => ctl.stylesPaneOpen() },
    { id: "style:inspector", label: { en: "Style Inspector", pt: "Inspetor de Estilo" }, icon: "manage_search", supports: has("inspectStyle"), run: () => ctl.styleInspector(), isChecked: () => ctl.inspectorOpen() },
    edit({ id: "style:new", label: { en: "New style\u2026", pt: "Novo estilo\u2026" }, tip: { en: "Create a style from the formatting of the selection", pt: "Cria um estilo com a formata\xE7\xE3o da sele\xE7\xE3o" }, icon: "add", supports: has("createStyle"), run: () => ctl.newStyle() }),
    edit({ id: "style:modifyCurrent", label: { en: "Modify style\u2026", pt: "Modificar estilo\u2026" }, tip: { en: "Modify the style of the current paragraph", pt: "Modifica o estilo do par\xE1grafo atual" }, icon: "edit", supports: has("modifyStyle"), run: () => ctl.modifyStyle() }),
    edit({ id: "style:updateCurrent", label: { en: "Update style to match selection", pt: "Atualizar estilo para corresponder \xE0 sele\xE7\xE3o" }, icon: "refresh", supports: has("updateStyleFromSelection"), run: () => ed.updateStyleFromSelection() }),
    edit({ id: "style:normal", label: { en: "Normal style", pt: "Estilo Normal" }, icon: "format_paragraph", shortcut: "Ctrl+Shift+N", supports: has("applyStyle"), run: () => ed.applyStyle(void 0) }),
    ...[1, 2, 3].map((n) => edit({
      id: `style:h${n}`,
      label: { en: `Heading ${n}`, pt: `T\xEDtulo ${n}` },
      icon: `format_h${n}`,
      shortcut: `Ctrl+Alt+${n}`,
      supports: has("listStyles"),
      run: () => ed.applyStyle(ed.listStyles("all").find((s) => s.rawName.toLowerCase() === `heading ${n}`)?.id)
    })),
    edit({ id: "style:clearChar", label: { en: "Clear character formatting", pt: "Limpar formata\xE7\xE3o de caractere" }, icon: "format_clear", shortcut: "Ctrl+Space", supports: has("clearCharacterFormatting"), run: () => ed.clearCharacterFormatting() }),
    edit({ id: "style:clearPara", label: { en: "Clear paragraph formatting", pt: "Limpar formata\xE7\xE3o de par\xE1grafo" }, icon: "format_clear", shortcut: "Ctrl+Q", supports: has("clearParagraphFormatting"), run: () => ed.clearParagraphFormatting() }),
    // ── Formatar: parágrafo ──
    ...[
      ["left", "Align left", "Alinhar \xE0 Esquerda", "Ctrl+L"],
      ["center", "Center", "Centralizar", "Ctrl+E"],
      ["right", "Align right", "Alinhar \xE0 Direita", "Ctrl+R"],
      ["both", "Justify", "Justificar", "Ctrl+J"]
    ].map(([a, en, pt, sc]) => edit({
      id: `align:${a}`,
      label: { en, pt },
      icon: a === "both" ? "format_align_justify" : `format_align_${a}`,
      shortcut: sc,
      run: () => ed.setAlignment(a),
      isChecked: () => (para().alignment ?? "left") === a
    })),
    edit({ id: "list:bullet", label: { en: "Bullets", pt: "Marcadores" }, icon: "format_list_bulleted", run: () => ed.toggleList("bullet"), isChecked: () => ed.listInfo()?.kind === "bullet" }),
    edit({ id: "list:decimal", label: { en: "Numbering", pt: "Numera\xE7\xE3o" }, icon: "format_list_numbered", run: () => ed.toggleList("decimal"), isChecked: () => ed.listInfo()?.kind === "number" }),
    edit({ id: "outdent", label: { en: "Decrease indent", pt: "Diminuir Recuo" }, icon: "format_indent_decrease", run: () => ed.indent(-1) }),
    edit({ id: "indent", label: { en: "Increase indent", pt: "Aumentar Recuo" }, icon: "format_indent_increase", run: () => ed.indent(1) }),
    edit({ id: "shading", label: { en: "Shading", pt: "Sombreamento" }, icon: "format_color_fill", run: () => ed.setShading(app.lastShading), color: () => `#${app.lastShading}` }),
    edit({ id: "borders", label: { en: "Borders", pt: "Bordas" }, icon: "border_outer", run: () => ed.toggleBorder(), isChecked: () => !!para().boxBorder }),
    edit({ id: "dlg:paragraph", label: { en: "Paragraph\u2026", pt: "Par\xE1grafo\u2026" }, tip: { en: "Paragraph settings", pt: "Configura\xE7\xF5es de par\xE1grafo" }, icon: "format_textdirection_l_to_r", run: () => ctl.paragraphDialog() }),
    edit({ id: "dlg:tabs", label: { en: "Tabs\u2026", pt: "Tabula\xE7\xE3o\u2026" }, tip: { en: "Tab stops of the paragraph and the default tab stop", pt: "Tabula\xE7\xF5es do par\xE1grafo e a tabula\xE7\xE3o padr\xE3o" }, icon: "keyboard_tab", supports: has("setTabStops"), run: () => ctl.tabsDialog() }),
    edit({ id: "dlg:page", label: { en: "Page setup\u2026", pt: "Configurar p\xE1gina\u2026" }, icon: "settings", run: () => ctl.pageDialog() }),
    // ── Revisão ──
    { id: "comment:prev", label: { en: "Previous", pt: "Anterior" }, tip: { en: "Previous comment", pt: "Coment\xE1rio anterior" }, icon: "navigate_before", run: () => stepComment(-1), isEnabled: () => ed.getComments().length > 0 },
    { id: "comment:next", label: { en: "Next", pt: "Pr\xF3ximo" }, tip: { en: "Next comment", pt: "Pr\xF3ximo coment\xE1rio" }, icon: "navigate_next", run: () => stepComment(1), isEnabled: () => ed.getComments().length > 0 },
    edit({ id: "comment:delete", label: { en: "Delete", pt: "Excluir" }, tip: { en: "Delete comment", pt: "Excluir coment\xE1rio" }, icon: "delete", run: () => {
      for (const id of app.activeCommentIds) ed.removeComment(id);
      app.activeCommentIds = [];
    }, isEnabled: () => app.activeCommentIds.length > 0 }),
    edit({ id: "comment:deleteAll", label: { en: "Delete all comments", pt: "Excluir todos os coment\xE1rios" }, icon: "delete_sweep", run: () => {
      for (const c of ed.getComments()) ed.removeComment(c.id);
    }, isEnabled: () => ed.getComments().length > 0 }),
    { id: "enableEditing", label: { en: "Enable Editing", pt: "Habilitar Edi\xE7\xE3o" }, icon: "edit_document", run: () => app.enableEditing(), isEnabled: () => ed.isProtected(), supports: () => true },
    { id: "wordCount", label: { en: "Word count", pt: "Contar Palavras" }, icon: "numbers", shortcut: "Ctrl+Shift+G", run: () => ctl.wordCount() },
    { id: "spelling", label: { en: "Spelling & grammar", pt: "Ortografia e gram\xE1tica" }, icon: "spellcheck", shortcut: "F7", supports: has("nextMisspelling"), run: () => ctl.spelling(), isEnabled: canEdit3 },
    { id: "spellAsYouType", label: { en: "Check spelling as you type", pt: "Verificar ortografia ao digitar" }, icon: "spellcheck", supports: has("toggleSpellCheck"), run: () => call("toggleSpellCheck"), isChecked: () => typeof api["spellCheckEnabled"] === "function" && !!call("spellCheckEnabled") },
    // controle de alterações (rótulos do Word 365 pt-BR, guia Revisão)
    edit({ id: "trackChanges", label: { en: "Track Changes", pt: "Controlar Altera\xE7\xF5es" }, icon: "track_changes", shortcut: "Ctrl+Shift+E", supports: has("toggleTrackChanges"), run: () => ctl.trackChanges(), isChecked: () => typeof api["isTrackingChanges"] === "function" && !!call("isTrackingChanges") }),
    ...[["simple", "Simple Markup", "Marca\xE7\xE3o Simples"], ["all", "All Markup", "Todas as Marca\xE7\xF5es"], ["none", "No Markup", "Sem Marca\xE7\xE3o"], ["original", "Original", "Original"]].map(([m, en, pt]) => ({ id: `markup:${m}`, label: { en, pt }, supports: has("setMarkupMode"), run: () => call("setMarkupMode", m), isChecked: () => typeof api["getMarkupMode"] === "function" && call("getMarkupMode") === m })),
    ...[["insdel", "Insertions and Deletions", "Inser\xE7\xF5es e Exclus\xF5es", "insertionsDeletions"], ["formatting", "Formatting", "Formata\xE7\xE3o", "formatting"]].map(([k, en, pt, opt]) => ({ id: `show:${k}`, label: { en, pt }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { [opt]: !markup()[opt] }), isChecked: () => !!markup()[opt] })),
    ...[["revisions", "Show Revisions in Balloons", "Mostrar Revis\xF5es em Bal\xF5es"], ["inline", "Show All Revisions Inline", "Mostrar Todas as Revis\xF5es Embutidas"], ["mixed", "Show Only Comments and Formatting in Balloons", "Mostrar Somente Coment\xE1rios e Formata\xE7\xE3o em Bal\xF5es"]].map(([b, en, pt]) => ({ id: `balloons:${b}`, label: { en, pt }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { balloons: b }), isChecked: () => markup().balloons === b })),
    { id: "people:all", label: { en: "All Reviewers", pt: "Todos os Revisores" }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { authors: markup().authors ? null : [] }), isChecked: () => !markup().authors },
    { id: "reviewPane", label: { en: "Reviewing Pane", pt: "Painel de Revis\xE3o" }, icon: "view_column", supports: has("getRevisions"), run: () => ctl.reviewPane(), isChecked: () => !!ctl.reviewPaneOpen() },
    { id: "reviewPane:vertical", label: { en: "Reviewing Pane Vertical\u2026", pt: "Painel de Revis\xE3o Vertical..." }, supports: has("getRevisions"), run: () => ctl.reviewPane("vertical"), isChecked: () => ctl.reviewPaneOpen() === "vertical" },
    { id: "reviewPane:horizontal", label: { en: "Reviewing Pane Horizontal\u2026", pt: "Painel de Revis\xE3o Horizontal..." }, supports: has("getRevisions"), run: () => ctl.reviewPane("horizontal"), isChecked: () => ctl.reviewPaneOpen() === "horizontal" },
    edit({ id: "change:accept", label: { en: "Accept", pt: "Aceitar" }, tip: { en: "Accept and Move to Next", pt: "Aceitar e Mover para a Pr\xF3xima" }, icon: "check_circle", supports: has("acceptChange"), run: () => call("acceptChange"), isEnabled: hasRevisions }),
    edit({ id: "change:acceptNext", label: { en: "Accept and Move to Next", pt: "Aceitar e Mover para a Pr\xF3xima" }, icon: "check_circle", supports: has("acceptChange"), run: () => call("acceptChange"), isEnabled: hasRevisions }),
    edit({ id: "change:acceptOne", label: { en: "Accept This Change", pt: "Aceitar Esta Altera\xE7\xE3o" }, supports: has("acceptChange"), run: () => call("acceptChange", { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: "change:acceptShown", label: { en: "Accept All Changes Shown", pt: "Aceitar Todas as Altera\xE7\xF5es Mostradas" }, supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges", { shown: true }), true), isEnabled: hasRevisions }),
    edit({ id: "change:acceptAll", label: { en: "Accept All Changes", pt: "Aceitar Todas as Altera\xE7\xF5es" }, icon: "done_all", supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges"), true), isEnabled: hasRevisions }),
    edit({ id: "change:acceptAllStop", label: { en: "Accept All Changes and Stop Tracking", pt: "Aceitar Todas as Altera\xE7\xF5es e Parar o Controle" }, supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges", { stopTracking: true }), true) }),
    edit({ id: "change:reject", label: { en: "Reject", pt: "Rejeitar" }, tip: { en: "Reject and Move to Next", pt: "Rejeitar e Mover para a Pr\xF3xima" }, icon: "cancel", supports: has("rejectChange"), run: () => call("rejectChange"), isEnabled: hasRevisions }),
    edit({ id: "change:rejectNext", label: { en: "Reject and Move to Next", pt: "Rejeitar e Mover para a Pr\xF3xima" }, icon: "cancel", supports: has("rejectChange"), run: () => call("rejectChange"), isEnabled: hasRevisions }),
    edit({ id: "change:rejectOne", label: { en: "Reject Change", pt: "Rejeitar Altera\xE7\xE3o" }, supports: has("rejectChange"), run: () => call("rejectChange", { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: "change:rejectShown", label: { en: "Reject All Changes Shown", pt: "Rejeitar Todas as Altera\xE7\xF5es Mostradas" }, supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges", { shown: true }), false), isEnabled: hasRevisions }),
    edit({ id: "change:rejectAll", label: { en: "Reject All Changes", pt: "Rejeitar Todas as Altera\xE7\xF5es" }, icon: "remove_done", supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges"), false), isEnabled: hasRevisions }),
    edit({ id: "change:rejectAllStop", label: { en: "Reject All Changes and Stop Tracking", pt: "Rejeitar Todas as Altera\xE7\xF5es e Parar o Controle" }, supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges", { stopTracking: true }), false) }),
    { id: "change:prev", label: { en: "Previous", pt: "Anterior" }, tip: { en: "Previous Change", pt: "Altera\xE7\xE3o Anterior" }, icon: "navigate_before", supports: has("previousChange"), run: () => {
      if (!call("previousChange")) ctl.flash(L15.noMoreRevisions);
    }, isEnabled: hasRevisions },
    { id: "change:next", label: { en: "Next", pt: "Pr\xF3ximo" }, tip: { en: "Next Change", pt: "Pr\xF3xima Altera\xE7\xE3o" }, icon: "navigate_next", supports: has("nextChange"), run: () => {
      if (!call("nextChange")) ctl.flash(L15.noMoreRevisions);
    }, isEnabled: hasRevisions },
    edit({ id: "mailmerge", label: { en: "Start Mail Merge", pt: "Iniciar Mala Direta" }, icon: "mail", supports: has("startMailMerge"), run: () => call("startMailMerge") }),
    edit({ id: "mergefield", label: { en: "Insert Merge Field", pt: "Inserir Campo de Mesclagem" }, icon: "data_object", supports: has("insertMergeField"), run: () => call("insertMergeField") }),
    edit({ id: "image:delete", label: { en: "Delete image", pt: "Excluir imagem" }, icon: "delete", supports: has("deleteSelectedImage"), run: () => call("deleteSelectedImage") }),
    // ── Ferramentas / Ajuda ──
    { id: "fontAccess", label: { en: "Use installed fonts\u2026", pt: "Usar as fontes instaladas\u2026" }, icon: "font_download", run: () => ctl.requestFonts(), supports: () => !ed.hasHostSystemFonts() && typeof window.queryLocalFonts === "function" },
    { id: "shortcuts", label: { en: "Keyboard shortcuts", pt: "Atalhos de teclado" }, icon: "keyboard", shortcut: "Ctrl+/", run: () => ctl.shortcuts() },
    { id: "about", label: { en: "About Universal Write", pt: "Sobre o Universal Write" }, icon: "info", run: () => ctl.about() }
  ];
  reg.add(...cmds);
  registerTableCommands(reg, ed, app, ctl);
  registerHfCommands(reg, ed, app, ctl);
  registerPictureCommands(reg, ed, app, ctl);
  registerShapeCommands(reg, ed, app, ctl);
  registerPictureAdjustCommands(reg, ed, app, ctl);
  registerPageCommands(reg, ed, app, ctl);
  registerHomeCommands(reg, ed, app, ctl);
  registerListCommands(reg, ed, app, ctl);
  registerClipboardCommands(reg, ed, app, ctl);
  registerEffectsCommands(reg, ed, app, ctl);
  registerFindCommands(reg, ed, app, ctl);
  registerTocCommands(reg, ed, app, ctl);
  registerTextLayoutCommands(reg, ed, app, ctl);
  function stepComment(dir) {
    const cs = ed.getComments();
    if (!cs.length) return;
    const cur = cs.findIndex((c) => app.activeCommentIds.includes(c.id));
    const next = cs[cur < 0 ? dir > 0 ? 0 : cs.length - 1 : (cur + dir + cs.length) % cs.length];
    app.activeCommentIds = [next.id];
    ed.goToComment(next.id);
  }
}
var HL_CSS = Object.fromEntries(HIGHLIGHT_COLORS.map((h) => [h.value, h.css]));

// src/chrome-refs.ts
var el10 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var select4 = (opts, value) => {
  const s = el10("select");
  for (const [v, t2] of opts) s.append(el10("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var check6 = (label, on) => {
  const input = el10("input", { type: "checkbox", checked: on });
  return { box: el10("label", { className: "uo-check" }, input, label), input };
};
var field = (label, ...kids) => el10("label", { className: "uo-field" }, el10("span", {}, label), ...kids);
var button2 = (label) => el10("button", { type: "button", className: "uo-pill", textContent: label });
function listBox(height = 180) {
  const box = el10("div", { tabIndex: 0, style: `height:${height}px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px;font-size:13px` });
  box.setAttribute("role", "listbox");
  let items = [];
  let cur;
  let changed = () => {
  }, activated = () => {
  };
  const rows = [];
  const sync = () => {
    rows.forEach((r, i) => {
      const on = items[i].id === cur;
      r.style.background = on ? "color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)" : "";
      r.setAttribute("aria-selected", String(on));
      if (on) r.scrollIntoView({ block: "nearest" });
    });
  };
  box.addEventListener("keydown", (e) => {
    const i = items.findIndex((x) => x.id === cur);
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (e.key === "Enter" && cur !== void 0) {
      e.preventDefault();
      activated();
      return;
    }
    if (!d || !items.length) return;
    e.preventDefault();
    cur = items[Math.max(0, Math.min(items.length - 1, i + d))].id;
    sync();
    changed();
  });
  return {
    el: box,
    set(list, keep) {
      items = list;
      cur = keep === null ? void 0 : keep !== void 0 && list.some((x) => x.id === keep) ? keep : list[0]?.id;
      rows.length = 0;
      box.replaceChildren(...list.map((it) => {
        const head = it.id.startsWith("#");
        const r = el10("div", { textContent: it.text, title: it.text.trim(), style: `padding:3px 6px;border-radius:4px;white-space:pre;overflow:hidden;text-overflow:ellipsis;${head ? "font-weight:600;opacity:.8" : "cursor:pointer"}` });
        r.setAttribute("role", head ? "presentation" : "option");
        if (!head) {
          r.addEventListener("click", () => {
            cur = it.id;
            sync();
            changed();
          });
          r.addEventListener("dblclick", () => {
            cur = it.id;
            sync();
            activated();
          });
        }
        rows.push(r);
        return r;
      }));
      sync();
    },
    value: () => cur,
    onChange: (f) => {
      changed = f;
    },
    onActivate: (f) => {
      activated = f;
    }
  };
}
var T2 = (env) => (en, pt) => pickLabels(env.lang, { en, pt });
async function bookmarkDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const name = el10("input", { type: "text", maxLength: 40, spellcheck: false });
  const list = listBox(170);
  const byName = el10("input", { type: "radio", name: "bmsort", checked: true });
  const byLoc = el10("input", { type: "radio", name: "bmsort" });
  const hidden = check6(t2("Hidden bookmarks", "Indicadores ocultos"), false);
  const show = check6(t2("Show bookmarks", "Mostrar indicadores"), ed.bookmarksShown());
  const fill = (keep) => {
    const bms = ed.getBookmarks({ hidden: hidden.input.checked, sort: byLoc.checked ? "location" : "name" });
    list.set(bms.map((b) => ({ id: b.name, text: b.name })), keep ?? null);
    sync();
  };
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:340px" },
    field(t2("Bookmark name:", "Nome do indicador:"), name),
    list.el,
    el10(
      "div",
      { style: "display:flex;gap:14px;align-items:center;font-size:13px" },
      t2("Sort by:", "Classificar por:"),
      el10("label", { className: "uo-check" }, byName, t2("Name", "Nome")),
      el10("label", { className: "uo-check" }, byLoc, t2("Location", "Local"))
    ),
    hidden.box,
    show.box
  );
  const h = openDialog({
    title: t2("Bookmark", "Indicador"),
    icon: "bookmark",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 500,
    actions: [
      { id: "goto", label: t2("Go To", "Ir para") },
      { id: "delete", label: t2("Delete", "Excluir") },
      { id: "cancel", label: t2("Cancel", "Cancelar") },
      { id: "add", label: t2("Add", "Adicionar"), primary: true }
    ],
    onAction: (id) => {
      const n = name.value.trim();
      if (id === "goto") {
        if (n) ed.goToBookmark(n);
        return false;
      }
      if (id === "delete") {
        if (n && ed.deleteBookmark(n)) {
          name.value = "";
          fill();
        }
        return false;
      }
      if (id === "add" && !ed.insertBookmark(n)) return false;
      return true;
    }
  });
  const btn3 = (id) => h.el.querySelector(`[data-action="${id}"]`);
  function sync() {
    const n = name.value.trim();
    const exists = !!n && ed.hasBookmark(n);
    btn3("add").disabled = !ed.validBookmarkName(n);
    btn3("goto").disabled = !exists;
    btn3("delete").disabled = !exists;
  }
  list.onChange(() => {
    name.value = list.value() ?? "";
    sync();
  });
  list.onActivate(() => {
    const n = list.value();
    if (n) ed.goToBookmark(n);
  });
  name.addEventListener("input", sync);
  for (const r of [byName, byLoc]) r.addEventListener("change", () => fill(list.value()));
  hidden.input.addEventListener("change", () => fill(list.value()));
  show.input.addEventListener("change", () => ed.showBookmarks(show.input.checked));
  fill();
  name.value = "";
  sync();
  await h.result;
}
var KIND_LABEL = (t2, type, k) => {
  const what = type === "heading" ? t2("Heading", "t\xEDtulo") : type === "bookmark" ? t2("Bookmark", "indicador") : t2("Paragraph", "par\xE1grafo");
  switch (k) {
    case "text":
      return type === "heading" ? t2("Heading text", "Texto do t\xEDtulo") : type === "bookmark" ? t2("Bookmark text", "Texto do indicador") : t2("Paragraph text", "Texto do par\xE1grafo");
    case "page":
      return t2("Page number", "N\xFAmero da p\xE1gina");
    case "number":
      return type === "heading" ? t2("Heading number", "N\xFAmero do t\xEDtulo") : t2("Paragraph number", "N\xFAmero do par\xE1grafo");
    case "numberNoContext":
      return `${type === "heading" ? t2("Heading number", "N\xFAmero do t\xEDtulo") : t2("Paragraph number", "N\xFAmero do par\xE1grafo")} ${t2("(no context)", "(sem contexto)")}`;
    case "numberFullContext":
      return `${type === "heading" ? t2("Heading number", "N\xFAmero do t\xEDtulo") : t2("Paragraph number", "N\xFAmero do par\xE1grafo")} ${t2("(full context)", "(contexto completo)")}`;
    case "position":
      return t2("Above/below", "Acima/abaixo");
    case "noteNumber":
      return type === "endnote" ? t2("Endnote number", "N\xFAmero da nota de fim") : t2("Footnote number", "N\xFAmero da nota de rodap\xE9");
    case "noteNumberFormatted":
      return `${type === "endnote" ? t2("Endnote number", "N\xFAmero da nota de fim") : t2("Footnote number", "N\xFAmero da nota de rodap\xE9")} ${t2("(formatted)", "(formatado)")}`;
    case "captionEntire":
      return t2("Entire caption", "Legenda inteira");
    case "captionLabel":
      return t2("Only label and number", "Apenas r\xF3tulo e n\xFAmero");
    case "captionText":
      return t2("Only caption text", "Apenas texto da legenda");
  }
  return what;
};
async function crossRefDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const labels = ed.getCaptionLabels().map((l) => l.name);
  const types = [
    ["numbered", t2("Numbered item", "Item numerado")],
    ["heading", t2("Heading", "T\xEDtulo")],
    ["bookmark", t2("Bookmark", "Indicador")],
    ["footnote", t2("Footnote", "Nota de rodap\xE9")],
    ["endnote", t2("Endnote", "Nota de fim")],
    ...labels.map((l) => [`caption:${l}`, l])
  ];
  const type = select4(types, "heading");
  const kind = el10("select");
  const link = check6(t2("Insert as hyperlink", "Inserir como hiperlink"), true);
  const pos = check6(t2("Include above/below", "Incluir acima/abaixo"), false);
  const sep = el10("input", { type: "text", maxLength: 5, style: "width:60px" });
  const sepBox = check6(t2("Separate numbers with", "Separar n\xFAmeros com"), false);
  const list = listBox(200);
  const forWhich = el10("span");
  const cur = () => {
    const v = type.value;
    return v.startsWith("caption:") ? { type: "caption", label: v.slice(8) } : { type: v };
  };
  const forLabel = (c) => {
    switch (c.type) {
      case "numbered":
        return t2("For which numbered item:", "Para qual item numerado:");
      case "heading":
        return t2("For which heading:", "Para qual t\xEDtulo:");
      case "bookmark":
        return t2("For which bookmark:", "Para qual indicador:");
      case "footnote":
        return t2("For which footnote:", "Para qual nota de rodap\xE9:");
      case "endnote":
        return t2("For which endnote:", "Para qual nota de fim:");
      default:
        return t2("For which caption:", "Para qual legenda:");
    }
  };
  const refill = () => {
    const c = cur();
    const kinds = ed.crossReferenceKinds(c.type);
    const keep = kinds.includes(kind.value) ? kind.value : kinds[0];
    kind.replaceChildren(...kinds.map((k) => el10("option", { value: k, textContent: KIND_LABEL(t2, c.type, k) })));
    kind.value = keep;
    forWhich.textContent = forLabel(c);
    list.set(ed.getCrossReferenceItems(c.type, c.label));
    syncOpts();
  };
  const syncOpts = () => {
    const k = kind.value;
    pos.input.disabled = k === "position";
    const full = k === "numberFullContext";
    sepBox.input.disabled = !full;
    sep.disabled = !full || !sepBox.input.checked;
  };
  type.addEventListener("change", refill);
  kind.addEventListener("change", syncOpts);
  sepBox.input.addEventListener("change", syncOpts);
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:420px" },
    el10(
      "div",
      { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px" },
      field(t2("Reference type:", "Tipo de refer\xEAncia:"), type),
      field(t2("Insert reference to:", "Inserir refer\xEAncia para:"), kind)
    ),
    el10("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:center" }, link.box, pos.box),
    el10("div", { style: "display:flex;gap:8px;align-items:center" }, sepBox.box, sep),
    el10("div", { style: "font-size:13px" }, forWhich),
    list.el
  );
  const insert = () => {
    const c = cur(), item = list.value();
    if (!item) return false;
    const ok = ed.insertCrossReference({
      type: c.type,
      ...c.label ? { label: c.label } : {},
      item,
      kind: kind.value,
      hyperlink: link.input.checked,
      position: pos.input.checked && !pos.input.disabled,
      ...sepBox.input.checked && !sep.disabled ? { separator: sep.value } : {}
    });
    if (!ok) env.flash(t2("The reference could not be inserted here", "N\xE3o foi poss\xEDvel inserir a refer\xEAncia aqui"));
    return ok;
  };
  const h = openDialog({
    title: t2("Cross-reference", "Refer\xEAncia Cruzada"),
    icon: "arrow_outward",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 520,
    modal: false,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "insert", label: t2("Insert", "Inserir"), primary: true }],
    onAction: (id) => {
      if (id !== "insert") return true;
      if (insert()) h.el.querySelector('[data-action="cancel"]').textContent = t2("Close", "Fechar");
      return false;
    }
  });
  h.el.style.cssText += ";position:fixed;inset:0;margin:auto;height:fit-content";
  list.onActivate(() => {
    if (insert()) h.el.querySelector('[data-action="cancel"]').textContent = t2("Close", "Fechar");
  });
  refill();
  await h.result;
}
var FORMATS = [["ARABIC", "1, 2, 3, \u2026"], ["alphabetic", "a, b, c, \u2026"], ["ALPHABETIC", "A, B, C, \u2026"], ["roman", "i, ii, iii, \u2026"], ["ROMAN", "I, II, III, \u2026"]];
async function numberingDialog(env, label) {
  const t2 = T2(env), ed = env.ed;
  const cur = ed.getCaptionNumbering(label);
  const fmt2 = select4(FORMATS, cur.format);
  const chap = check6(t2("Include chapter number", "Incluir n\xFAmero do cap\xEDtulo"), !!cur.chapter);
  const levels = select4(Array.from({ length: 9 }, (_, i) => [String(i + 1), t2(`Heading ${i + 1}`, `T\xEDtulo ${i + 1}`)]), String(cur.chapter?.level ?? 1));
  const seps = select4([
    ["hyphen", t2("- (hyphen)", "- (h\xEDfen)")],
    ["period", t2(". (period)", ". (ponto)")],
    ["colon", t2(": (colon)", ": (dois-pontos)")],
    ["emDash", t2("\u2014 (em dash)", "\u2014 (travess\xE3o)")],
    ["enDash", t2("\u2013 (en dash)", "\u2013 (meia-risca)")]
  ], cur.chapter?.separator ?? "hyphen");
  const sync = () => {
    levels.disabled = !chap.input.checked;
    seps.disabled = !chap.input.checked;
  };
  chap.input.addEventListener("change", sync);
  sync();
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    field(t2("Format:", "Formato:"), fmt2),
    chap.box,
    field(t2("Chapter starts with style:", "Cap\xEDtulo come\xE7a com estilo:"), levels),
    field(t2("Use separator:", "Usar separador:"), seps),
    el10("div", { style: "font-size:12px;opacity:.75" }, t2("Examples: 1-1, 1.A", "Exemplos: 1-1, 1.A"))
  );
  const h = openDialog({
    title: t2("Caption Numbering", "Numera\xE7\xE3o de Legenda"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 380,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const n = { format: fmt2.value, ...chap.input.checked ? { chapter: { level: +levels.value, separator: seps.value } } : {} };
  ed.setCaptionNumbering(label, n);
  env.saveCaptionSettings?.();
}
async function autoCaptionDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const cur = ed.getAutoCaption()?.table;
  const labels = ed.getCaptionLabels();
  const on = check6(t2("Table", "Tabela"), !!cur);
  const label = select4(labels.map((l) => [l.name, l.name]), cur?.label ?? labels.find((l) => l.position === "above")?.name ?? labels[0].name);
  const pos = select4([["above", t2("Above item", "Acima do item")], ["below", t2("Below item", "Abaixo do item")]], cur?.position ?? "above");
  const sync = () => {
    label.disabled = !on.input.checked;
    pos.disabled = !on.input.checked;
  };
  on.input.addEventListener("change", sync);
  sync();
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    el10("div", { style: "font-size:13px" }, t2("Add caption when inserting:", "Adicionar legenda ao inserir:")),
    on.box,
    field(t2("Use label:", "Usar r\xF3tulo:"), label),
    field(t2("Position:", "Posi\xE7\xE3o:"), pos)
  );
  const h = openDialog({
    title: t2("AutoCaption", "AutoLegenda"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 380,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  ed.setAutoCaption(on.input.checked ? { table: { label: label.value, position: pos.value } } : void 0);
  env.saveCaptionSettings?.();
}
async function captionDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const target = ed.captionTarget();
  const labels = () => ed.getCaptionLabels();
  const labelSel = el10("select");
  const fillLabels = (keep) => {
    labelSel.replaceChildren(...labels().map((l) => el10("option", { value: l.name, textContent: l.name })));
    labelSel.value = keep && labels().some((l) => l.name === keep) ? keep : (target === "table" ? labels().find((l) => l.position === "above")?.name : void 0) ?? labels()[0].name;
  };
  fillLabels();
  const pos = select4([["above", t2("Above selected item", "Acima do item selecionado")], ["below", t2("Below selected item", "Abaixo do item selecionado")]], "below");
  pos.disabled = !target;
  const excl = check6(t2("Exclude label from caption", "Excluir r\xF3tulo da legenda"), false);
  const caption = el10("input", { type: "text" });
  let prefix = "";
  const syncPrefix = () => {
    const l = labelSel.value;
    const text = caption.value.slice(prefix.length);
    prefix = `${excl.input.checked ? "" : `${l} `}${ed.nextCaptionNumber(l)}`;
    caption.value = prefix + text;
    const def = labels().find((x) => x.name === l)?.position ?? "below";
    if (target) pos.value = def;
    delBtn.disabled = labels().find((x) => x.name === l)?.builtIn !== false;
  };
  caption.addEventListener("input", () => {
    if (!caption.value.startsWith(prefix)) caption.value = prefix + caption.value.slice(Math.min(prefix.length, caption.value.length));
  });
  const newBtn = button2(t2("New Label\u2026", "Novo R\xF3tulo\u2026"));
  const delBtn = button2(t2("Delete Label", "Excluir R\xF3tulo"));
  const numBtn = button2(t2("Numbering\u2026", "Numera\xE7\xE3o\u2026"));
  const autoBtn = button2(t2("AutoCaption\u2026", "AutoLegenda\u2026"));
  labelSel.addEventListener("change", syncPrefix);
  excl.input.addEventListener("change", syncPrefix);
  newBtn.addEventListener("click", () => {
    void promptDialog({ title: t2("New Label", "Novo R\xF3tulo"), label: t2("Label:", "R\xF3tulo:"), layer: env.layer, lang: env.lang }).then((v) => {
      const n = v?.trim();
      if (!n) return;
      ed.addCaptionLabel(n);
      env.saveCaptionSettings?.();
      fillLabels(n);
      syncPrefix();
    });
  });
  delBtn.addEventListener("click", () => {
    if (ed.deleteCaptionLabel(labelSel.value)) {
      env.saveCaptionSettings?.();
      fillLabels();
      syncPrefix();
    }
  });
  numBtn.addEventListener("click", () => {
    void numberingDialog(env, labelSel.value).then(syncPrefix);
  });
  autoBtn.addEventListener("click", () => {
    void autoCaptionDialog(env);
  });
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:400px" },
    field(t2("Caption:", "Legenda:"), caption),
    el10("strong", { style: "font-size:13px" }, t2("Options", "Op\xE7\xF5es")),
    el10("div", { className: "uo-dialog-grid" }, el10("span", {}, t2("Label:", "R\xF3tulo:")), labelSel, el10("span", {}, t2("Position:", "Posi\xE7\xE3o:")), pos),
    excl.box,
    el10("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, newBtn, delBtn, numBtn, autoBtn)
  );
  syncPrefix();
  const h = openDialog({
    title: t2("Caption", "Legenda"),
    icon: "subtitles",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 480,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  queueMicrotask(() => {
    caption.focus();
    caption.setSelectionRange(caption.value.length, caption.value.length);
  });
  if (await h.result !== "ok") return;
  ed.insertCaption({ label: labelSel.value, title: caption.value.slice(prefix.length), excludeLabel: excl.input.checked, ...target ? { position: pos.value } : {} });
}
async function tofDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const cur = ed.getTableOfFiguresOptions();
  const labels = ed.getCaptionLabels();
  const pages = check6(t2("Show page numbers", "Mostrar n\xFAmeros de p\xE1gina"), cur?.pageNumbers ?? true);
  const right = check6(t2("Right align page numbers", "Alinhar n\xFAmeros de p\xE1gina \xE0 direita"), cur?.rightAlign ?? true);
  const leader = select4([["none", t2("(none)", "(nenhum)")], ["dot", "......."], ["hyphen", "-------"], ["underscore", "_______"]], cur?.leader ?? "dot");
  const links = check6(t2("Use hyperlinks instead of page numbers", "Usar hiperlinks em vez de n\xFAmeros de p\xE1gina"), cur?.hyperlinks ?? true);
  const format = select4([
    ["template", t2("From template", "Do modelo")],
    ["classic", t2("Classic", "Cl\xE1ssico")],
    ["distinctive", t2("Distinctive", "Elegante")],
    ["centered", t2("Centered", "Centralizado")],
    ["formal", t2("Formal", "Formal")],
    ["simple", t2("Simple", "Simples")]
  ], "template");
  const label = select4([...labels.map((l) => [l.name, l.name])], cur?.label ?? labels[0].name);
  const incl = check6(t2("Include label and number", "Incluir r\xF3tulo e n\xFAmero"), cur?.includeLabel ?? true);
  const preview2 = el10("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:70px;display:flex;flex-direction:column;gap:2px" });
  const paint = () => {
    const lab = label.value;
    const lead = { none: " ", dot: ".", hyphen: "-", underscore: "_" }[leader.value] ?? ".";
    preview2.replaceChildren(...[1, 2, 3, 4].map((n) => {
      const txt = `${incl.input.checked ? `${lab} ${n}: ` : ""}${t2("Text", "Texto")}`;
      const row3 = el10("div", { style: "display:flex;gap:4px;white-space:nowrap" }, el10("span", {}, txt));
      if (pages.input.checked && right.input.checked) row3.append(el10("span", { style: "flex:1;overflow:hidden;opacity:.7", textContent: lead.repeat(200) }), el10("span", {}, String(n * 2 - 1)));
      else if (pages.input.checked) row3.append(el10("span", {}, String(n * 2 - 1)));
      return row3;
    }));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c of [pages.input, right.input, incl.input, links.input]) c.addEventListener("change", paint);
  for (const s of [leader, label, format]) s.addEventListener("change", paint);
  paint();
  const modify = button2(t2("Modify\u2026", "Modificar\u2026"));
  modify.addEventListener("click", () => env.modifyStyle?.(ed.ensureBuiltinStyle("table of figures")));
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:440px" },
    el10("strong", { style: "font-size:13px" }, t2("Print Preview", "Visualizar Impress\xE3o")),
    preview2,
    pages.box,
    right.box,
    field(t2("Tab leader:", "Preenchimento de tabula\xE7\xE3o:"), leader),
    links.box,
    el10("strong", { style: "font-size:13px" }, t2("General", "Geral")),
    el10("div", { className: "uo-dialog-grid" }, el10("span", {}, t2("Formats:", "Formatos:")), format, el10("span", {}, t2("Caption label:", "Nome da legenda:")), label),
    incl.box,
    el10("div", {}, modify)
  );
  const h = openDialog({
    title: t2("Table of Figures", "\xCDndice de Ilustra\xE7\xF5es"),
    icon: "list_alt",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 520,
    actions: [{ id: "cancel", label: t2("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const ok = ed.insertTableOfFigures({
    label: label.value,
    includeLabel: incl.input.checked,
    pageNumbers: pages.input.checked,
    rightAlign: right.input.checked,
    leader: leader.value,
    hyperlinks: links.input.checked,
    format: format.value
  });
  if (!ok) env.flash(t2("The table of figures could not be inserted here", "N\xE3o foi poss\xEDvel inserir o \xEDndice aqui"));
}
async function hyperlinkDialog(env) {
  const t2 = T2(env), ed = env.ed;
  const cur = ed.getLink();
  const sel4 = ed.selectedText();
  const display = el10("input", { type: "text", value: cur?.text ?? sel4 ?? "" });
  const tip = el10("input", { type: "text", value: cur?.tip ?? "" });
  const isMail = !!cur?.address?.startsWith("mailto:");
  const address = el10("input", { type: "text", value: cur?.address && !isMail ? cur.address : "https://", spellcheck: false });
  const mail = el10("input", { type: "text", value: isMail ? decodeURIComponent(cur.address.slice(7).split("?")[0]) : "", spellcheck: false });
  const subject = el10("input", { type: "text", value: isMail ? decodeURIComponent(/[?&]subject=([^&]*)/i.exec(cur.address)?.[1] ?? "") : "" });
  const targets = ed.getLinkTargets();
  const place = listBox(220);
  const items = [
    { id: "_top", text: t2("Top of the Document", "In\xEDcio do documento") },
    ...targets.headings.length ? [{ id: "", text: t2("Headings", "T\xEDtulos") }] : [],
    ...targets.headings.map((hd) => ({ id: hd.id, text: `${"  ".repeat(hd.level)}${hd.text}` })),
    ...targets.bookmarks.length ? [{ id: "", text: t2("Bookmarks", "Indicadores") }] : [],
    ...targets.bookmarks.map((b) => ({ id: b, text: `  ${b}` }))
  ];
  place.set(items.map((x, i) => ({ id: x.id || `#sec${i}`, text: x.text })), cur?.anchor && items.some((x) => x.id === cur.anchor) ? cur.anchor : "_top");
  const panes = {
    web: el10("div", { style: "display:flex;flex-direction:column;gap:10px" }, field(t2("Address:", "Endere\xE7o:"), address)),
    place: el10("div", { style: "display:flex;flex-direction:column;gap:6px" }, el10("span", { style: "font-size:13px" }, t2("Select a place in this document:", "Selecione um local neste documento:")), place.el),
    mail: el10("div", { style: "display:flex;flex-direction:column;gap:10px" }, field(t2("E-mail address:", "Endere\xE7o de email:"), mail), field(t2("Subject:", "Assunto:"), subject))
  };
  const tabs = dialogTabs([
    { id: "web", label: t2("Existing File or Web Page", "P\xE1gina da Web ou arquivo"), body: panes.web },
    { id: "place", label: t2("Place in This Document", "Colocar neste documento"), body: panes.place },
    { id: "mail", label: t2("E-mail Address", "Endere\xE7o de email"), body: panes.mail }
  ], cur?.anchor ? "place" : isMail ? "mail" : "web");
  const body = el10(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:460px" },
    field(t2("Text to display:", "Texto para exibi\xE7\xE3o:"), display),
    tabs.el,
    field(t2("ScreenTip:", "Dica de Tela:"), tip)
  );
  const h = openDialog({
    title: cur ? t2("Edit Hyperlink", "Editar Hiperlink") : t2("Insert Hyperlink", "Inserir Hiperlink"),
    icon: "link",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 560,
    actions: [
      ...cur ? [{ id: "remove", label: t2("Remove Link", "Remover Link") }] : [],
      { id: "cancel", label: t2("Cancel", "Cancelar") },
      { id: "ok", label: "OK", primary: true }
    ]
  });
  const r = await h.result;
  if (r === "remove") {
    ed.removeLink();
    return;
  }
  if (r !== "ok") return;
  const text = display.value;
  const opts = { tip: tip.value.trim() || void 0, ...text && text !== (cur?.text ?? sel4 ?? "") ? { text } : text && !sel4 && !cur ? { text } : {} };
  const tab = tabs.current();
  if (tab === "place") {
    const id = place.value();
    if (!id || id.startsWith("#sec")) return;
    ed.insertHyperlink({ anchor: id, ...opts });
  } else if (tab === "mail") {
    const a = mail.value.trim();
    if (!a) return;
    ed.insertHyperlink({ address: `mailto:${a.replace(/^mailto:/i, "")}${subject.value.trim() ? `?subject=${encodeURIComponent(subject.value.trim())}` : ""}`, ...opts });
  } else {
    const a = address.value.trim();
    if (!a || a === "https://") return;
    ed.insertHyperlink({ address: a, ...opts });
  }
}
function refsDialog(env, kind) {
  switch (kind) {
    case "bookmark":
      return bookmarkDialog(env);
    case "crossref":
      return crossRefDialog(env);
    case "caption":
      return captionDialog(env);
    case "tof":
      return tofDialog(env);
    case "link":
      return hyperlinkDialog(env);
  }
}

// src/chrome-font.ts
var el11 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var tr9 = (lang, en, pt) => pickLabels(lang, { en, pt });
var select5 = (opts, value) => {
  const s = el11("select", {});
  for (const [v, t2] of opts) s.append(el11("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var check7 = (label, on) => {
  const input = el11("input", { type: "checkbox", checked: on });
  return { el: el11("label", { className: "uo-check" }, input, label), input };
};
var num = (v) => parseFloat(v.replace(/\s|pt|%/gi, "").replace(",", "."));
var fmt = (n, lang) => (Math.round(n * 10) / 10).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 1 });
var SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
var SCALES = [200, 150, 100, 90, 80, 66, 50, 33];
var apiColor = (p) => {
  if (p.hex === "auto") return null;
  if (!p.themeColor) return p.hex;
  const frac = (h) => h ? Math.round((1 - parseInt(h, 16) / 255) * 100) / 100 : void 0;
  const tint = frac(p.tint), shade = frac(p.shade);
  return { themeColor: p.themeColor, ...tint !== void 0 ? { tint } : {}, ...shade !== void 0 ? { shade } : {} };
};
async function fontDialog(env, families, openTextEffects) {
  const lang = env.lang, L15 = env.app.ui.L, ed = env.ed;
  const r = env.state().run;
  const curFont = r.fontAscii ?? "";
  const fams = curFont && !families.includes(curFont) ? [curFont, ...families] : families;
  const font = el11("input", { value: curFont, style: "width:100%" });
  const fontList = el11("select", { size: 6, style: "width:100%;height:118px" });
  for (const f2 of fams) fontList.append(el11("option", { value: f2, textContent: f2 }));
  fontList.value = curFont;
  fontList.addEventListener("change", () => {
    font.value = fontList.value;
    preview2();
  });
  font.addEventListener("input", () => {
    const m = fams.find((f2) => f2.toLowerCase().startsWith(font.value.toLowerCase()));
    if (m) fontList.value = m;
    preview2();
  });
  const styleNames2 = [["r", tr9(lang, "Regular", "Normal")], ["i", tr9(lang, "Italic", "It\xE1lico")], ["b", tr9(lang, "Bold", "Negrito")], ["bi", tr9(lang, "Bold Italic", "Negrito It\xE1lico")]];
  const styleCur = `${r.bold ? "b" : ""}${r.italic ? "i" : ""}` || "r";
  const fstyle = el11("select", { size: 4, style: "width:100%;height:146px" });
  for (const [v, t2] of styleNames2) fstyle.append(el11("option", { value: v, textContent: t2 }));
  fstyle.value = styleCur;
  const curSize = (r.szHalfPt ?? 22) / 2;
  const size = el11("input", { value: fmt(curSize, lang), style: "width:100%" });
  const sizeList = el11("select", { size: 4, style: "width:100%;height:118px" });
  for (const s of SIZES) sizeList.append(el11("option", { value: String(s), textContent: fmt(s, lang) }));
  sizeList.value = String(curSize);
  sizeList.addEventListener("change", () => {
    size.value = fmt(+sizeList.value, lang);
    preview2();
  });
  size.addEventListener("input", preview2);
  fstyle.addEventListener("change", preview2);
  const colorPick = r.color ? { hex: r.color, ...r.colorTheme ? { themeColor: r.colorTheme.themeColor, tint: r.colorTheme.tint, shade: r.colorTheme.shade } : {} } : { hex: "auto" };
  const color = colorButton(env, colorPick, L15.automatic);
  const ulCur = r.underline ? r.underlineStyle ?? "single" : "none";
  const ul = select5([["none", tr9(lang, "(none)", "(nenhum)")], ...UNDERLINE_ALL.map(([v, l]) => [v, pickLabels(lang, l)])], ulCur);
  const ulPick = r.underlineColor ? { hex: r.underlineColor, ...r.underlineTheme ? { themeColor: r.underlineTheme.themeColor, tint: r.underlineTheme.tint, shade: r.underlineTheme.shade } : {} } : { hex: "auto" };
  const ulColor = colorButton(env, ulPick, L15.automatic);
  const syncUl = () => {
    ulColor.el.disabled = ul.value === "none";
    preview2();
  };
  ul.addEventListener("change", syncUl);
  color.onChange(preview2);
  ulColor.onChange(preview2);
  const fx = {
    strike: check7(tr9(lang, "Strikethrough", "Tachado"), !!r.strike),
    dstrike: check7(tr9(lang, "Double strikethrough", "Tachado duplo"), !!r.doubleStrike),
    sup: check7(tr9(lang, "Superscript", "Sobrescrito"), r.vertAlign === "superscript"),
    sub: check7(tr9(lang, "Subscript", "Subscrito"), r.vertAlign === "subscript"),
    small: check7(tr9(lang, "Small caps", "Versalete"), !!r.smallCaps),
    caps: check7(tr9(lang, "All caps", "Todas em mai\xFAsculas"), !!r.allCaps),
    hidden: check7(tr9(lang, "Hidden", "Oculto"), !!r.hidden)
  };
  const excl = (a, b) => {
    a.addEventListener("change", () => {
      if (a.checked) b.checked = false;
      preview2();
    });
    b.addEventListener("change", () => {
      if (b.checked) a.checked = false;
      preview2();
    });
  };
  excl(fx.strike.input, fx.dstrike.input);
  excl(fx.sup.input, fx.sub.input);
  excl(fx.small.input, fx.caps.input);
  fx.hidden.input.addEventListener("change", preview2);
  const col = (label, ...kids) => el11("label", { style: "display:flex;flex-direction:column;gap:4px;min-width:0" }, label, ...kids);
  const fontTab = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el11(
      "div",
      { style: "display:grid;grid-template-columns:2fr 1.2fr 0.8fr;gap:10px" },
      col(tr9(lang, "Font:", "Fonte:"), font, fontList),
      col(tr9(lang, "Font style:", "Estilo da fonte:"), fstyle),
      col(tr9(lang, "Size:", "Tamanho:"), size, sizeList)
    ),
    el11(
      "div",
      { style: "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end" },
      col(tr9(lang, "Font color:", "Cor da fonte:"), color.el),
      col(tr9(lang, "Underline style:", "Estilo de sublinhado:"), ul),
      col(tr9(lang, "Underline color:", "Cor do sublinhado:"), ulColor.el)
    ),
    el11(
      "fieldset",
      { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:6px 10px" },
      el11("legend", {}, tr9(lang, "Effects", "Efeitos")),
      el11(
        "div",
        { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px 16px" },
        fx.strike.el,
        fx.small.el,
        fx.dstrike.el,
        fx.caps.el,
        fx.sup.el,
        fx.hidden.el,
        fx.sub.el
      )
    )
  );
  const scale = el11("input", { value: `${r.scalePct ?? 100}%`, style: "width:90px" });
  scale.setAttribute("list", "uw-font-scales");
  const scales = el11("datalist", { id: "uw-font-scales" });
  for (const s of SCALES) scales.append(el11("option", { value: `${s}%` }));
  const sp = r.charSpacingTwips ?? 0;
  const spacing = select5([["normal", "Normal"], ["expanded", tr9(lang, "Expanded", "Expandido")], ["condensed", tr9(lang, "Condensed", "Condensado")]], sp > 0 ? "expanded" : sp < 0 ? "condensed" : "normal");
  const spBy = el11("input", { value: sp ? fmt(Math.abs(sp) / 20, lang) : "", style: "width:70px" });
  const pos = r.positionHalfPt ?? 0;
  const position = select5([["normal", "Normal"], ["raised", tr9(lang, "Raised", "Elevado")], ["lowered", tr9(lang, "Lowered", "Rebaixado")]], pos > 0 ? "raised" : pos < 0 ? "lowered" : "normal");
  const posBy = el11("input", { value: pos ? fmt(Math.abs(pos) / 2, lang) : "", style: "width:70px" });
  const kern = r.kernHalfPt ?? 0;
  const kernOn = check7(tr9(lang, "Kerning for fonts:", "Kerning de fontes:"), kern > 0);
  const kernBy = el11("input", { value: fmt(kern > 0 ? kern / 2 : curSize, lang), style: "width:70px", disabled: kern <= 0 });
  spacing.addEventListener("change", () => {
    spBy.disabled = spacing.value === "normal";
    spBy.value = spacing.value === "normal" ? "" : spBy.value || fmt(1, lang);
    preview2();
  });
  position.addEventListener("change", () => {
    posBy.disabled = position.value === "normal";
    posBy.value = position.value === "normal" ? "" : posBy.value || fmt(3, lang);
    preview2();
  });
  kernOn.input.addEventListener("change", () => {
    kernBy.disabled = !kernOn.input.checked;
  });
  spBy.disabled = spacing.value === "normal";
  posBy.disabled = position.value === "normal";
  for (const i of [scale, spBy, posBy]) i.addEventListener("input", preview2);
  const row3 = (label, ...kids) => el11("div", { style: "display:flex;align-items:center;gap:8px" }, el11("span", { style: "min-width:110px" }, label), ...kids);
  const advTab = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el11("strong", {}, tr9(lang, "Character Spacing", "Espa\xE7amento de caracteres")),
    row3(tr9(lang, "Scale:", "Escala:"), scale, scales),
    row3(tr9(lang, "Spacing:", "Espa\xE7amento:"), spacing, tr9(lang, "By:", "Por:"), spBy, "pt"),
    row3(tr9(lang, "Position:", "Posi\xE7\xE3o:"), position, tr9(lang, "By:", "Por:"), posBy, "pt"),
    el11("div", { style: "display:flex;align-items:center;gap:8px" }, kernOn.el, kernBy, tr9(lang, "Points and above", "Pontos e acima"))
  );
  const ot0 = typeof ed.textEffects === "function" ? ed.textEffects().ot ?? {} : {};
  const lig = select5([
    ["none", tr9(lang, "None", "Nenhuma")],
    ["standard", tr9(lang, "Standard Only", "Somente Padr\xE3o")],
    ["standardContextual", tr9(lang, "Standard and Contextual", "Padr\xE3o e Contextual")],
    ["historicalDiscretional", tr9(lang, "Historical and Discretionary", "Hist\xF3rica e Discricion\xE1ria")],
    ["all", tr9(lang, "All", "Todas")]
  ], ot0.ligatures ?? "none");
  const numSp = select5([["default", tr9(lang, "Default", "Padr\xE3o")], ["proportional", tr9(lang, "Proportional", "Proporcional")], ["tabular", tr9(lang, "Tabular", "Tabular")]], ot0.numSpacing ?? "default");
  const numFm = select5([["default", tr9(lang, "Default", "Padr\xE3o")], ["lining", tr9(lang, "Lining", "Alinhado")], ["oldStyle", tr9(lang, "Old-style", "Estilo Antigo")]], ot0.numForm ?? "default");
  const sets = select5([["0", tr9(lang, "Default", "Padr\xE3o")], ...Array.from({ length: 20 }, (_v, i) => [String(i + 1), String(i + 1)])], String(ot0.stylisticSets?.[0] ?? 0));
  const calt = check7(tr9(lang, "Use Contextual Alternates", "Usar Alternativas Contextuais"), !!ot0.cntxtAlts);
  if (typeof ed.setOpenType === "function") advTab.append(
    el11("strong", { style: "margin-top:6px" }, tr9(lang, "OpenType Features", "Recursos OpenType")),
    row3(tr9(lang, "Ligatures:", "Ligaduras:"), lig),
    row3(tr9(lang, "Number spacing:", "Espa\xE7amento de n\xFAmeros:"), numSp),
    row3(tr9(lang, "Number forms:", "Formas de n\xFAmeros:"), numFm),
    row3(tr9(lang, "Stylistic sets:", "Conjuntos estil\xEDsticos:"), sets),
    calt.el
  );
  const sample = el11("div", { style: "height:56px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;overflow:hidden;background:#fff;color:#000" });
  const sampleText = el11("span", {});
  sample.append(sampleText);
  function preview2() {
    const fam2 = font.value || curFont;
    const css = ed.canvasFont(fam2, fstyle.value.includes("b"), fstyle.value.includes("i"));
    const sz2 = num(size.value);
    sampleText.textContent = fam2 || tr9(lang, "Sample", "Exemplo");
    const st = sampleText.style;
    st.fontFamily = `"${css.family}"`;
    st.fontWeight = String(css.weight);
    st.fontStyle = css.italic ? "italic" : "normal";
    st.fontSize = `${Math.min(Math.max(Number.isFinite(sz2) ? sz2 : 11, 6), 36)}pt`;
    const c2 = color.value();
    st.color = c2.hex === "auto" ? "#000" : `#${c2.hex}`;
    const lines = [];
    if (ul.value !== "none") lines.push("underline");
    if (fx.strike.input.checked || fx.dstrike.input.checked) lines.push("line-through");
    st.textDecorationLine = lines.join(" ") || "none";
    st.textDecorationStyle = /^double/.test(ul.value) || fx.dstrike.input.checked ? "double" : /^dot/.test(ul.value) ? "dotted" : /^dash/.test(ul.value) ? "dashed" : /^wav/.test(ul.value) ? "wavy" : "solid";
    const uc2 = ulColor.value();
    st.textDecorationColor = uc2.hex === "auto" ? "currentColor" : `#${uc2.hex}`;
    st.textDecorationThickness = /Heavy$|^thick$/.test(ul.value) ? "2px" : "auto";
    st.fontVariant = fx.small.input.checked ? "small-caps" : "normal";
    st.textTransform = fx.caps.input.checked ? "uppercase" : "none";
    st.verticalAlign = fx.sup.input.checked ? "super" : fx.sub.input.checked ? "sub" : "baseline";
    st.opacity = fx.hidden.input.checked ? "0.4" : "1";
    const sc2 = num(scale.value);
    st.display = "inline-block";
    st.transform = Number.isFinite(sc2) && sc2 !== 100 ? `scaleX(${sc2 / 100})` : "";
    const by = num(spBy.value);
    st.letterSpacing = spacing.value === "normal" || !Number.isFinite(by) ? "normal" : `${spacing.value === "condensed" ? -by : by}pt`;
  }
  syncUl();
  const tabs = dialogTabs([
    { id: "font", label: tr9(lang, "Font", "Fonte"), body: fontTab },
    { id: "advanced", label: tr9(lang, "Advanced", "Avan\xE7ado"), body: advTab }
  ], "font");
  const body = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    tabs.el,
    el11("div", { style: "display:flex;flex-direction:column;gap:4px" }, tr9(lang, "Preview", "Visualiza\xE7\xE3o"), sample)
  );
  const h = openDialog({
    title: tr9(lang, "Font", "Fonte"),
    body,
    layer: env.layer,
    lang,
    width: 560,
    actions: [
      ...typeof ed.setDefaultFont === "function" && !ed.isProtected() ? [{ id: "default", label: tr9(lang, "Set As Default", "Definir como Padr\xE3o") }] : [],
      ...openTextEffects && !ed.isProtected() ? [{ id: "effects", label: tr9(lang, "Text Effects...", "Efeitos de Texto...") }] : [],
      { id: "cancel", label: L15.cancel },
      { id: "ok", label: "OK", primary: true }
    ]
  });
  const res = await h.result;
  if (res === "default") {
    setAsDefault();
    return;
  }
  if (res === "effects") {
    openTextEffects?.();
    return;
  }
  if (res !== "ok") return;
  const f = {};
  const fam = font.value.trim();
  if (fam && fam !== curFont) f.fontFamily = fam;
  if (fstyle.value !== styleCur) {
    f.bold = fstyle.value.includes("b");
    f.italic = fstyle.value.includes("i");
  }
  const sz = num(size.value);
  if (Number.isFinite(sz) && sz >= 1 && sz <= 1638 && Math.round(sz * 2) !== (r.szHalfPt ?? 22)) f.sizePt = Math.round(sz * 2) / 2;
  const c = color.value();
  if (JSON.stringify(c) !== JSON.stringify(colorPick)) f.color = apiColor(c);
  if (ul.value !== ulCur) f.underline = ul.value;
  const uc = ulColor.value();
  if (JSON.stringify(uc) !== JSON.stringify(ulPick) && ul.value !== "none") f.underlineColor = apiColor(uc);
  if (fx.strike.input.checked !== !!r.strike) f.strike = fx.strike.input.checked;
  if (fx.dstrike.input.checked !== !!r.doubleStrike) f.doubleStrike = fx.dstrike.input.checked;
  if (fx.sup.input.checked !== (r.vertAlign === "superscript") || fx.sub.input.checked !== (r.vertAlign === "subscript")) {
    f.superscript = fx.sup.input.checked;
    f.subscript = fx.sub.input.checked;
  }
  if (fx.small.input.checked !== !!r.smallCaps) f.smallCaps = fx.small.input.checked;
  if (fx.caps.input.checked !== !!r.allCaps) f.allCaps = fx.caps.input.checked;
  if (fx.hidden.input.checked !== !!r.hidden) f.hidden = fx.hidden.input.checked;
  const sc = num(scale.value);
  if (Number.isFinite(sc) && sc >= 1 && sc <= 600 && Math.round(sc) !== (r.scalePct ?? 100)) f.scalePct = Math.round(sc);
  const spv = spacing.value === "normal" ? 0 : Math.round((Number.isFinite(num(spBy.value)) ? num(spBy.value) : 0) * 20) * (spacing.value === "condensed" ? -1 : 1);
  if (spv !== sp) f.spacingTwips = spv;
  const pv = position.value === "normal" ? 0 : Math.round((Number.isFinite(num(posBy.value)) ? num(posBy.value) : 0) * 2) * (position.value === "lowered" ? -1 : 1);
  if (pv !== pos) f.positionHalfPt = pv;
  const kv = kernOn.input.checked ? Math.max(1, Math.round((Number.isFinite(num(kernBy.value)) ? num(kernBy.value) : curSize) * 2)) : 0;
  if (kv !== kern) f.kernMinHalfPt = kv;
  if (Object.keys(f).length) ed.setFontFormat(f);
  if (typeof ed.setOpenType === "function") {
    const ot = {};
    if (lig.value !== (ot0.ligatures ?? "none")) ot.ligatures = lig.value === "none" ? null : lig.value;
    if (numSp.value !== (ot0.numSpacing ?? "default")) ot.numSpacing = numSp.value === "default" ? null : numSp.value;
    if (numFm.value !== (ot0.numForm ?? "default")) ot.numForm = numFm.value === "default" ? null : numFm.value;
    if (sets.value !== String(ot0.stylisticSets?.[0] ?? 0)) ot.stylisticSets = sets.value === "0" ? null : [Number(sets.value)];
    if (calt.input.checked !== !!ot0.cntxtAlts) ot.cntxtAlts = calt.input.checked || null;
    if (Object.keys(ot).length) ed.setOpenType(ot);
  }
  function setAsDefault() {
    const def = ed.listStyles("all").find((x) => x.isDefault && x.kind !== "character");
    const look = def ? ed.styleFormatting(def.id) : null;
    const d = {};
    const fam2 = font.value.trim() || curFont;
    if (!look || fam2 !== look.fontFamily) d.fontFamily = fam2;
    const sz2 = num(size.value);
    if (Number.isFinite(sz2) && (!look || Math.abs(sz2 - look.sizePt) > 0.01)) d.sizePt = sz2;
    const b = fstyle.value.includes("b"), i = fstyle.value.includes("i");
    if (!look || b !== look.bold) d.bold = b;
    if (!look || i !== look.italic) d.italic = i;
    const c2 = color.value();
    if (c2.hex !== "auto" && (!look || c2.hex.toUpperCase() !== (look.color ?? "").toUpperCase())) d.color = apiColor(c2);
    if (!look || ul.value !== "none" !== look.underline) d.underline = ul.value;
    if (!look || fx.strike.input.checked !== look.strike) d.strike = fx.strike.input.checked;
    if (!look || fx.caps.input.checked !== look.allCaps) d.allCaps = fx.caps.input.checked;
    if (!look || fx.small.input.checked !== look.smallCaps) d.smallCaps = fx.small.input.checked;
    if (Object.keys(d).length) ed.setDefaultFont(d);
  }
}

// src/chrome-table-style.ts
var tr10 = (lang, en, pt) => pickLabels(lang, { en, pt });
var el12 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var sel2 = (name, opts, value, style = "") => {
  const s = el12("select", { name, style });
  for (const [v, t2] of opts) s.append(el12("option", { value: v, selected: v === value }, t2));
  return s;
};
var COND_LABELS = {
  wholeTable: ["Whole table", "Tabela inteira"],
  firstRow: ["Header row", "Linha de cabe\xE7alho"],
  lastRow: ["Total row", "Linha de total"],
  firstCol: ["First column", "Primeira coluna"],
  lastCol: ["Last column", "\xDAltima coluna"],
  band1Horz: ["Odd banded rows", "Linhas em tiras \xEDmpares"],
  band2Horz: ["Even banded rows", "Linhas em tiras pares"],
  band1Vert: ["Odd banded columns", "Colunas em tiras \xEDmpares"],
  band2Vert: ["Even banded columns", "Colunas em tiras pares"],
  nwCell: ["Top left cell", "C\xE9lula superior esquerda"],
  neCell: ["Top right cell", "C\xE9lula superior direita"],
  swCell: ["Bottom left cell", "C\xE9lula inferior esquerda"],
  seCell: ["Bottom right cell", "C\xE9lula inferior direita"]
};
function condState(xml, cond) {
  const sheet = readStyleSheet('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + xml + "</w:styles>");
  const st = Object.values(sheet.styles)[0];
  const part = cond === "wholeTable" ? st : st?.tblStylePr?.[cond];
  const rPr = part?.rPr, pPr = part?.pPr, tcPr = part?.tcPr;
  return {
    bold: !!rPr?.b,
    italic: !!rPr?.i,
    underline: !!rPr?.u && rPr.u.val !== "none",
    color: rPr?.color?.val && rPr.color.val !== "auto" ? rPr.color.val : void 0,
    sz: rPr?.sz,
    font: rPr?.rFonts?.ascii,
    fill: tcPr?.shd?.fill && tcPr.shd.fill !== "auto" ? tcPr.shd.fill : void 0,
    jc: pPr?.jc,
    vAlign: tcPr?.vAlign
  };
}
async function tableStyleDialog(env, mode, nameOrId) {
  const lang = env.lang, ed = env.ed;
  let draft;
  let basedOnName;
  const bases = ed.tableStyleBases();
  const normalId = bases.find((b) => b.name === "Normal Table")?.id ?? "TableNormal";
  if (mode === "modify") {
    const cur = await ed.tableStyleXml(nameOrId ?? ed.getTableState()?.style ?? "Table Grid");
    if (!cur) return;
    draft = cur.xml;
  } else {
    const name2 = tr10(lang, "Style1", "Estilo1");
    draft = newTableStyleXml({ id: ed.newTableStyleId(name2), name: name2, basedOn: normalId });
  }
  const headName = /<w:name w:val="([^"]*)"/.exec(draft)?.[1] ?? "";
  const headBase = /<w:basedOn w:val="([^"]*)"/.exec(draft)?.[1] ?? "";
  const name = el12("input", { type: "text", name: "ts-name", value: headName, style: "width:100%" });
  const base = sel2("ts-base", [["", tr10(lang, "(no style)", "(sem estilo)")], ...bases.map((b) => [b.id, b.name])], headBase, "width:100%");
  const cond = sel2("ts-cond", TABLE_STYLE_CONDS.map((c2) => [c2, tr10(lang, ...COND_LABELS[c2])]), "wholeTable", "width:100%");
  const font = el12("input", { type: "text", name: "ts-font", placeholder: tr10(lang, "(theme font)", "(fonte do tema)"), style: "width:150px" });
  const size = sel2("ts-size", [["", "\u2014"], ...[8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24].map((n) => [String(n * 2), String(n).replace(".", tr10(lang, ".", ","))])], "", "width:70px");
  const tog = (label, title) => el12("button", { type: "button", className: "uo-pill", textContent: label, title, style: "min-width:36px;padding:4px 10px" });
  const bBtn = tog("B", tr10(lang, "Bold", "Negrito")), iBtn = tog("I", tr10(lang, "Italic", "It\xE1lico")), uBtn = tog("U", tr10(lang, "Underline", "Sublinhado"));
  bBtn.style.fontWeight = "700";
  iBtn.style.fontStyle = "italic";
  uBtn.style.textDecoration = "underline";
  const color = el12("input", { type: "color", name: "ts-color", value: "#000000", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const bStyle = sel2("ts-bstyle", BORDER_STYLES.map(([v, en, pt]) => [v, tr10(lang, en, pt)]), "single");
  const bWidth = sel2("ts-bwidth", BORDER_WIDTHS.map(([sz, t2]) => [String(sz), `${t2} pt`]), "4");
  const bColor = el12("input", { type: "color", name: "ts-bcolor", value: "#000000", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const sideBtns = [
    ["top", "Top", "Superior"],
    ["bottom", "Bottom", "Inferior"],
    ["left", "Left", "Esquerda"],
    ["right", "Right", "Direita"],
    ["insideH", "Inside H", "Interna H"],
    ["insideV", "Inside V", "Interna V"],
    ["none", "None", "Nenhuma"],
    ["all", "All", "Todas"]
  ].map(([s, en, pt]) => {
    const b = el12("button", { type: "button", className: "uo-pill", textContent: tr10(lang, en, pt), style: "padding:3px 9px" });
    b.dataset["side"] = s;
    return b;
  });
  const fillOn = el12("input", { type: "checkbox", name: "ts-fill-on" });
  const fill = el12("input", { type: "color", name: "ts-fill", value: "#ffffff", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const align = sel2("ts-align", [
    ["", "\u2014"],
    ["left|top", tr10(lang, "Top left", "Em cima, \xE0 esquerda")],
    ["center|top", tr10(lang, "Top center", "Em cima, centralizado")],
    ["right|top", tr10(lang, "Top right", "Em cima, \xE0 direita")],
    ["left|center", tr10(lang, "Center left", "No centro, \xE0 esquerda")],
    ["center|center", tr10(lang, "Center", "No centro")],
    ["right|center", tr10(lang, "Center right", "No centro, \xE0 direita")],
    ["left|bottom", tr10(lang, "Bottom left", "Embaixo, \xE0 esquerda")],
    ["center|bottom", tr10(lang, "Bottom center", "Embaixo, centralizado")],
    ["right|bottom", tr10(lang, "Bottom right", "Embaixo, \xE0 direita")]
  ], "");
  const dpr = window.devicePixelRatio || 1;
  const cv = el12("canvas", { width: Math.round(420 * dpr), height: Math.round(150 * dpr), style: "width:420px;height:150px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);background:#fff" });
  const c = () => cond.value;
  const sync = () => {
    const st = condState(draft, c());
    bBtn.classList.toggle("uo-on", st.bold);
    iBtn.classList.toggle("uo-on", st.italic);
    uBtn.classList.toggle("uo-on", st.underline);
    font.value = st.font ?? "";
    size.value = st.sz ? String(st.sz) : "";
    color.value = `#${(st.color ?? "000000").toLowerCase()}`;
    fillOn.checked = !!st.fill;
    fill.value = `#${(st.fill ?? "ffffff").toLowerCase()}`;
    align.value = st.jc || st.vAlign ? `${st.jc ?? "left"}|${st.vAlign ?? "top"}` : "";
    ed.renderTableStyleXmlThumb(cv, draft);
  };
  const apply = (f) => {
    draft = patchTableStyleXml(draft, c(), f);
    sync();
  };
  const hex = (i) => i.value.replace("#", "").toUpperCase();
  bBtn.addEventListener("click", () => apply({ bold: !condState(draft, c()).bold }));
  iBtn.addEventListener("click", () => apply({ italic: !condState(draft, c()).italic }));
  uBtn.addEventListener("click", () => apply({ underline: !condState(draft, c()).underline }));
  font.addEventListener("change", () => apply({ fontAscii: font.value.trim() || null }));
  size.addEventListener("change", () => apply({ szHalfPt: size.value ? +size.value : null }));
  color.addEventListener("change", () => apply({ color: hex(color) }));
  fillOn.addEventListener("change", () => apply({ fill: fillOn.checked ? hex(fill) : null }));
  fill.addEventListener("change", () => {
    fillOn.checked = true;
    apply({ fill: hex(fill) });
  });
  align.addEventListener("change", () => {
    if (!align.value) {
      apply({ alignment: null, vAlign: null });
      return;
    }
    const [h2, v] = align.value.split("|");
    apply({ alignment: h2 === "left" ? null : h2, vAlign: v === "top" ? null : v });
  });
  for (const b of sideBtns) b.addEventListener("click", () => {
    const s = b.dataset["side"];
    const pen = { val: bStyle.value, sz: +bWidth.value, color: hex(bColor) };
    const sides = s === "all" || s === "none" ? ["top", "left", "bottom", "right", "insideH", "insideV"] : [s];
    apply({ borders: Object.fromEntries(sides.map((x) => [x, s === "none" ? null : pen])) });
  });
  cond.addEventListener("change", sync);
  base.addEventListener("change", () => {
    draft = retitleTableStyleXml(draft, { basedOn: base.value || null });
    sync();
  });
  const row3 = (...kids) => el12("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
  const lbl = (t2, ctl) => el12("label", { style: "display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px" }, t2, ctl);
  const body = el12(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el12("strong", {}, tr10(lang, "Properties", "Propriedades")),
    row3(lbl(tr10(lang, "Name:", "Nome:"), name), lbl(tr10(lang, "Style type:", "Tipo de estilo:"), sel2("ts-type", [["table", tr10(lang, "Table", "Tabela")]], "table", "width:100%")), lbl(tr10(lang, "Style based on:", "Estilo baseado em:"), base)),
    el12("strong", {}, tr10(lang, "Formatting", "Formata\xE7\xE3o")),
    lbl(tr10(lang, "Apply formatting to:", "Aplicar formata\xE7\xE3o a:"), cond),
    row3(font, size, bBtn, iBtn, uBtn, el12("span", {}, tr10(lang, "Color", "Cor")), color),
    row3(bStyle, bWidth, bColor, ...sideBtns),
    row3(el12("label", { className: "uo-check" }, fillOn, tr10(lang, "Fill", "Preenchimento")), fill, el12("span", {}, tr10(lang, "Alignment", "Alinhamento")), align),
    cv,
    el12("label", { className: "uo-check" }, el12("input", { type: "radio", name: "ts-where", checked: true }), tr10(lang, "Only in this document", "Somente neste documento"))
  );
  sync();
  const h = openDialog({
    title: mode === "new" ? tr10(lang, "Create New Style from Formatting", "Criar Novo Estilo a partir da Formata\xE7\xE3o") : tr10(lang, "Modify Style", "Modificar Estilo"),
    body,
    layer: env.layer,
    lang,
    width: 640,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const nm = name.value.trim() || headName;
  draft = retitleTableStyleXml(draft, { name: nm });
  if (mode === "new") {
    const id = ed.newTableStyleId(nm);
    draft = draft.replace(/w:styleId="[^"]*"/, () => `w:styleId="${id.replace(/"/g, "")}"`);
  }
  const baseName = bases.find((b) => b.id === base.value)?.name;
  ed.saveTableStyle(draft, { apply: false, basedOnName: baseName });
}

// src/chrome-table-dialogs.ts
var NUMBER_FORMATS = ["#.##0", "#.##0,00", "R$ #.##0,00;(R$ #.##0,00)", "0", "0%", "0,00", "0,00%"];
var el13 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var tr11 = (lang, en, pt) => pickLabels(lang, { en, pt });
function radios(name, opts, value) {
  const box = el13("div", { style: "display:flex;flex-direction:column;gap:6px" });
  for (const [v, t2] of opts) {
    const i = el13("input", { type: "radio", name, value: v, checked: v === value });
    box.append(el13("label", { className: "uo-check" }, i, t2));
  }
  return { el: box, value: () => box.querySelector(`input[name="${name}"]:checked`)?.value ?? value };
}
var num2 = (name, value, min = 1, max = 63) => el13("input", { type: "number", name, min: String(min), max: String(max), step: "1", value: String(value) });
var cmText2 = (lang, tw) => (Math.round(tw / 1440 * 254) / 100).toFixed(2).replace(".", tr11(lang, ".", ","));
var cmInput2 = (lang, name, tw) => el13("input", { type: "text", name, inputMode: "decimal", value: `${cmText2(lang, tw)} cm`, style: "width:96px" });
var twOf2 = (s) => {
  const n = parseFloat(s.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? Math.round(n / 2.54 * 1440) : void 0;
};
var section2 = (title, ...kids) => el13("div", { style: "display:flex;flex-direction:column;gap:8px" }, el13("strong", {}, title), ...kids);
async function ask2(env, title, body, width = 400) {
  const L15 = env.app.ui.L;
  const h = openDialog({
    title,
    body,
    layer: env.layer,
    lang: env.lang,
    width,
    actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  return await h.result === "ok";
}
function separatorPicker(lang, name, value, other, paraLabel) {
  const opts = [["paragraph", paraLabel], ["tab", tr11(lang, "Tabs", "Tabula\xE7\xF5es")], ["semicolon", tr11(lang, "Semicolons", "Ponto e v\xEDrgula")], ["other", tr11(lang, "Other:", "Outro:")]];
  const r = radios(name, opts, value);
  const otherIn = el13("input", { type: "text", name: `${name}-other`, maxLength: 1, value: other, style: "width:40px;margin-left:8px" });
  r.el.lastElementChild.append(otherIn);
  otherIn.addEventListener("input", () => {
    r.el.querySelector('input[value="other"]').checked = true;
  });
  const read = () => {
    const v = r.value();
    return v === "other" ? { char: otherIn.value || "-" } : v;
  };
  return { el: r.el, read, radios: r.el };
}
function autofitPicker(lang, value, colTw) {
  const r = radios("autofit", [
    ["fixed", tr11(lang, "Fixed column width:", "Largura fixa da coluna:")],
    ["content", tr11(lang, "AutoFit to contents", "AutoAjuste ao conte\xFAdo")],
    ["window", tr11(lang, "AutoFit to window", "AutoAjustar \xE0 janela")]
  ], value);
  const auto = tr11(lang, "Auto", "Autom\xE1tico");
  const w = el13("input", { type: "text", name: "colw", value: colTw ? `${cmText2(lang, colTw)} cm` : auto, style: "width:120px;margin-left:8px" });
  r.el.firstElementChild.append(w);
  const read = () => {
    const a = r.value();
    const tw = a === "fixed" && w.value.trim() !== auto ? twOf2(w.value) : void 0;
    return { autofit: a, ...tw && tw > 0 ? { colWidthTwips: tw } : {} };
  };
  return { el: r.el, read };
}
async function tableDialog(env, kind, arg) {
  const lang = env.lang, ed = env.ed;
  switch (kind) {
    case "insert": {
      const mem = env.app.prefs.get("tableDims")?.split("x").map(Number);
      const cols = num2("cols", mem?.[0] || 5), rows = num2("rows", mem?.[1] || 2, 1, 32767);
      const af = autofitPicker(lang, "fixed");
      const remember = el13("input", { type: "checkbox", name: "remember", checked: !!mem });
      const body = el13(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr11(lang, "Table size", "Tamanho da tabela"), el13(
          "div",
          { className: "uo-dialog-grid" },
          el13("span", {}, tr11(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el13("span", {}, tr11(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rows
        )),
        section2(tr11(lang, "AutoFit behavior", "Comportamento de AutoAjuste"), af.el),
        el13("label", { className: "uo-check" }, remember, tr11(lang, "Remember dimensions for new tables", "Lembrar dimens\xF5es para novas tabelas"))
      );
      if (!await ask2(env, tr11(lang, "Insert Table", "Inserir Tabela"), body, 420)) return;
      const c = Math.max(1, Math.min(63, parseInt(cols.value, 10) || 1)), r = Math.max(1, parseInt(rows.value, 10) || 1);
      env.app.prefs.set("tableDims", remember.checked ? `${c}x${r}` : "");
      ed.insertTable(r, c, af.read());
      return;
    }
    case "fromText": {
      const sep = separatorPicker(lang, "sep", "tab", "-", tr11(lang, "Paragraphs", "Par\xE1grafos"));
      const cols = num2("cols", 2);
      const rowsOut = el13("input", { type: "number", name: "rows", readOnly: true, value: "1", style: "opacity:.7" });
      const af = autofitPicker(lang, "fixed");
      const guess = ed.textToTableGuess();
      if (guess) {
        sep.radios.querySelector(`input[value="${typeof guess.separator === "string" ? guess.separator : "other"}"]`).checked = true;
        cols.value = String(guess.cols);
        rowsOut.value = String(guess.rows);
      }
      const recount = () => {
        const g = ed.textToTableGuess(sep.read(), parseInt(cols.value, 10) || 1);
        if (g) {
          if (document.activeElement !== cols) cols.value = String(g.cols);
          rowsOut.value = String(g.rows);
        }
      };
      sep.el.addEventListener("change", recount);
      cols.addEventListener("input", recount);
      const body = el13(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr11(lang, "Table size", "Tamanho da tabela"), el13(
          "div",
          { className: "uo-dialog-grid" },
          el13("span", {}, tr11(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el13("span", {}, tr11(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rowsOut
        )),
        section2(tr11(lang, "AutoFit behavior", "Comportamento de AutoAjuste"), af.el),
        section2(tr11(lang, "Separate text at", "Separar texto em"), sep.el)
      );
      if (!await ask2(env, tr11(lang, "Convert Text to Table", "Converter Texto em Tabela"), body, 420)) return;
      ed.convertTextToTable({ separator: sep.read(), cols: parseInt(cols.value, 10) || 1, ...af.read() });
      return;
    }
    case "toText": {
      const sep = separatorPicker(lang, "sep", "tab", "-", tr11(lang, "Paragraph marks", "Marcas de par\xE1grafo"));
      const body = section2(tr11(lang, "Separate text with", "Separar texto com"), sep.el);
      if (!await ask2(env, tr11(lang, "Convert Table To Text", "Converter Tabela em Texto"), body, 360)) return;
      ed.convertTableToText(sep.read());
      return;
    }
    case "insertCells": {
      const r = radios("shift", [
        ["right", tr11(lang, "Shift cells right", "Deslocar c\xE9lulas para a direita")],
        ["down", tr11(lang, "Shift cells down", "Deslocar c\xE9lulas para baixo")],
        ["row", tr11(lang, "Insert entire row", "Inserir linha inteira")],
        ["column", tr11(lang, "Insert entire column", "Inserir coluna inteira")]
      ], "down");
      if (!await ask2(env, tr11(lang, "Insert Cells", "Inserir C\xE9lulas"), r.el, 340)) return;
      ed.insertCells(r.value());
      return;
    }
    case "deleteCells": {
      const r = radios("shift", [
        ["left", tr11(lang, "Shift cells left", "Deslocar c\xE9lulas para a esquerda")],
        ["up", tr11(lang, "Shift cells up", "Deslocar c\xE9lulas para cima")],
        ["row", tr11(lang, "Delete entire row", "Excluir linha inteira")],
        ["column", tr11(lang, "Delete entire column", "Excluir coluna inteira")]
      ], "left");
      if (!await ask2(env, tr11(lang, "Delete Cells", "Excluir C\xE9lulas"), r.el, 340)) return;
      ed.deleteCells(r.value());
      return;
    }
    case "split": {
      const s = ed.getTableState();
      const cols = num2("cols", 2), rows = num2("rows", 1, 1, 32767);
      const merge = el13("input", { type: "checkbox", name: "merge", checked: true, disabled: !s?.canMerge });
      const body = el13(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        el13(
          "div",
          { className: "uo-dialog-grid" },
          el13("span", {}, tr11(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el13("span", {}, tr11(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rows
        ),
        el13("label", { className: "uo-check" }, merge, tr11(lang, "Merge cells before split", "Mesclar c\xE9lulas antes de dividir"))
      );
      if (!await ask2(env, tr11(lang, "Split Cells", "Dividir C\xE9lulas"), body, 340)) return;
      ed.splitCell(parseInt(cols.value, 10) || 1, parseInt(rows.value, 10) || 1, merge.checked);
      return;
    }
    case "margins": {
      const s = ed.getTableState();
      const mar = s?.tblPr.tblCellMar ?? {};
      const w = (v, d = 0) => v?.type === "dxa" ? v.w : d;
      const top = cmInput2(lang, "top", w(mar.top)), bottom = cmInput2(lang, "bottom", w(mar.bottom));
      const left = cmInput2(lang, "left", w(mar.left, 108)), right = cmInput2(lang, "right", w(mar.right, 108));
      const spTw = s?.tblPr.tblCellSpacing?.type === "dxa" ? s.tblPr.tblCellSpacing.w * 2 : 0;
      const allow = el13("input", { type: "checkbox", name: "allow", checked: spTw > 0 });
      const spacing = cmInput2(lang, "spacing", spTw);
      const resize = el13("input", { type: "checkbox", name: "resize", checked: s?.tblPr.tblLayout !== "fixed" });
      const body = el13(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr11(lang, "Default cell margins", "Margens padr\xE3o da c\xE9lula"), el13(
          "div",
          { className: "uo-dialog-grid" },
          el13("span", {}, tr11(lang, "Top:", "Superior:")),
          top,
          el13("span", {}, tr11(lang, "Left:", "Esquerda:")),
          left,
          el13("span", {}, tr11(lang, "Bottom:", "Inferior:")),
          bottom,
          el13("span", {}, tr11(lang, "Right:", "Direita:")),
          right
        )),
        section2(
          tr11(lang, "Default cell spacing", "Espa\xE7amento padr\xE3o entre c\xE9lulas"),
          el13("div", { style: "display:flex;align-items:center;gap:8px" }, el13("label", { className: "uo-check" }, allow, tr11(lang, "Allow spacing between cells", "Permitir espa\xE7amento entre c\xE9lulas")), spacing)
        ),
        section2(tr11(lang, "Options", "Op\xE7\xF5es"), el13("label", { className: "uo-check" }, resize, tr11(lang, "Automatically resize to fit contents", "Redimensionar automaticamente para ajustar conte\xFAdo")))
      );
      if (!await ask2(env, tr11(lang, "Table Options", "Op\xE7\xF5es de Tabela"), body, 440)) return;
      ed.setTableCellMargins(
        { top: twOf2(top.value), left: twOf2(left.value), bottom: twOf2(bottom.value), right: twOf2(right.value) },
        allow.checked ? twOf2(spacing.value) ?? 0 : 0,
        resize.checked
      );
      return;
    }
    case "sort":
      return sortDialog(env);
    case "borders":
      return bordersShadingDialog(env, "borders");
    case "pageBorders":
      return bordersShadingDialog(env, "page");
    case "shading":
      return bordersShadingDialog(env, "shading");
    case "tableStyle:new":
      return tableStyleDialog(env, "new");
    case "tableStyle:modify":
      return tableStyleDialog(env, "modify", arg);
    case "properties":
    case "properties:row":
    case "properties:column":
    case "properties:cell":
    case "properties:alt":
      return propertiesDialog(env, kind === "properties" ? "table" : kind.slice(11));
    case "formula": {
      const formula = el13("input", { type: "text", name: "formula", value: ed.suggestFormula(), style: "width:100%;box-sizing:border-box" });
      const fmt2 = el13("input", { type: "text", name: "format", value: "", style: "flex:1;min-width:0" });
      const fmtList = el13(
        "select",
        { name: "format-list", style: "width:28px" },
        el13("option", { value: "" }, ""),
        ...NUMBER_FORMATS.map((f) => el13("option", { value: f }, f))
      );
      fmtList.addEventListener("change", () => {
        fmt2.value = fmtList.value;
        fmtList.value = "";
      });
      const fn = el13(
        "select",
        { name: "function" },
        el13("option", { value: "" }, tr11(lang, "Paste function", "Colar fun\xE7\xE3o")),
        ...FORMULA_FUNCTIONS.map((f) => el13("option", { value: f }, f))
      );
      fn.addEventListener("change", () => {
        if (!fn.value) return;
        const a = formula.selectionStart ?? formula.value.length, b = formula.selectionEnd ?? a;
        const ins = `${fn.value}()`;
        formula.value = formula.value.slice(0, a) + ins + formula.value.slice(b);
        formula.focus();
        formula.setSelectionRange(a + ins.length - 1, a + ins.length - 1);
        fn.value = "";
      });
      const body = el13(
        "div",
        { style: "display:flex;flex-direction:column;gap:12px" },
        el13("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr11(lang, "Formula:", "F\xF3rmula:"), formula),
        el13(
          "label",
          { style: "display:flex;flex-direction:column;gap:4px" },
          tr11(lang, "Number format:", "Formato do n\xFAmero:"),
          el13("div", { style: "display:flex;gap:4px" }, fmt2, fmtList)
        ),
        el13("div", { style: "display:flex;gap:8px;align-items:center" }, fn)
      );
      queueMicrotask(() => {
        formula.focus();
        formula.setSelectionRange(formula.value.length, formula.value.length);
      });
      if (!await ask2(env, tr11(lang, "Formula", "F\xF3rmula"), body, 380)) return;
      ed.insertFormula(formula.value, fmt2.value.trim() || void 0);
      return;
    }
  }
}
var sel3 = (name, opts, value) => {
  const s = el13("select", { name });
  for (const [v, t2] of opts) s.append(el13("option", { value: v, selected: v === value }, t2));
  return s;
};
var line = (...kids) => el13("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
var check8 = (name, on, label) => {
  const box = el13("input", { type: "checkbox", name, checked: on });
  return { el: el13("label", { className: "uo-check" }, box, label), box };
};
function radiosRow(name, opts, value) {
  const box = el13("div", { style: "display:flex;gap:14px;flex-wrap:wrap" });
  for (const [v, t2] of opts) box.append(el13("label", { className: "uo-check" }, el13("input", { type: "radio", name, value: v, checked: v === value }), t2));
  return { el: box, value: () => box.querySelector(`input[name="${name}"]:checked`)?.value ?? value };
}
function widthField(lang, name, w, defTw) {
  const on = !!w && (w.type === "dxa" || w.type === "pct") && w.w > 0;
  const c = check8(`${name}-on`, on, tr11(lang, "Preferred width:", "Largura preferencial:"));
  const unit = sel3(`${name}-unit`, [["dxa", tr11(lang, "Centimeters", "Cent\xEDmetros")], ["pct", tr11(lang, "Percent", "Porcentagem")]], w?.type === "pct" ? "pct" : "dxa");
  const pctText2 = (v) => `${Math.round(v / 50 * 10) / 10}%`.replace(".", tr11(lang, ".", ","));
  const val = el13("input", {
    type: "text",
    name,
    inputMode: "decimal",
    style: "width:96px",
    value: w?.type === "pct" ? pctText2(w.w) : `${cmText2(lang, on && w ? w.w : defTw)} cm`
  });
  unit.addEventListener("change", () => {
    val.value = unit.value === "pct" ? "100%" : `${cmText2(lang, defTw)} cm`;
  });
  const sync = () => {
    val.disabled = unit.disabled = !c.box.checked;
  };
  c.box.addEventListener("change", sync);
  sync();
  const read = () => {
    if (!c.box.checked) return null;
    if (unit.value === "pct") {
      const n = parseFloat(val.value.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? { w: Math.round(n * 50), type: "pct" } : null;
    }
    const tw = twOf2(val.value);
    return tw && tw > 0 ? { w: tw, type: "dxa" } : null;
  };
  return { el: line(c.el, val, el13("span", {}, tr11(lang, "Measure in:", "Medir em:")), unit), read };
}
async function propertiesDialog(env, tab) {
  const lang = env.lang, ed = env.ed;
  const s = ed.getTableState();
  if (!s) return;
  const t2 = s.tblPr, rp = s.trPr, cp = s.tcPr;
  const tWidth = widthField(lang, "tw", t2.tblW, s.availTwips);
  const curAlign = t2.jc === "center" || t2.jc === "right" ? t2.jc : "left";
  const align = radiosRow("talign", [["left", tr11(lang, "Left", "Esquerda")], ["center", tr11(lang, "Center", "Centralizado")], ["right", tr11(lang, "Right", "Direita")]], curAlign);
  const indent = cmInput2(lang, "tind", t2.tblInd?.type === "dxa" ? t2.tblInd.w : 0);
  const syncInd = () => {
    indent.disabled = align.value() !== "left";
  };
  align.el.addEventListener("change", syncInd);
  syncInd();
  const wrap = radiosRow("twrap", [["none", tr11(lang, "None", "Nenhuma")], ["around", tr11(lang, "Around", "Ao redor")]], t2.tblpPr ? "around" : "none");
  let position = t2.tblpPr ? { ...t2.tblpPr } : void 0;
  let overlap;
  const posBtn = el13("button", { type: "button", className: "uo-pill", textContent: tr11(lang, "Positioning\u2026", "Posicionamento\u2026") });
  const syncWrap = () => {
    posBtn.disabled = wrap.value() !== "around";
  };
  wrap.el.addEventListener("change", syncWrap);
  syncWrap();
  posBtn.addEventListener("click", () => {
    const p0 = position ?? { leftFromText: 141, rightFromText: 141, vertAnchor: "text", tblpY: 1 };
    void positioningDialog(env, p0, overlap ?? (!!t2.tblpPr && t2.tblOverlap !== "never")).then((r) => {
      if (r) {
        position = r.pos;
        overlap = r.overlap;
      }
    });
  });
  const optBtn = el13("button", { type: "button", className: "uo-pill", textContent: tr11(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  optBtn.addEventListener("click", () => {
    void tableDialog(env, "margins");
  });
  const tableTab = el13(
    "div",
    {},
    section2(tr11(lang, "Size", "Tamanho"), tWidth.el),
    section2(tr11(lang, "Alignment", "Alinhamento"), line(align.el, el13("span", {}, tr11(lang, "Indent from left:", "Recuo \xE0 esquerda:")), indent)),
    section2(tr11(lang, "Text wrapping", "Quebra autom\xE1tica de texto"), line(wrap.el, posBtn)),
    el13("div", { style: "display:flex;justify-content:flex-end;gap:8px" }, optBtn)
  );
  const rowsLabel = s.rect.r1 === s.rect.r2 ? tr11(lang, `Row ${s.rect.r1 + 1}:`, `Linha ${s.rect.r1 + 1}:`) : tr11(lang, `Rows ${s.rect.r1 + 1}-${s.rect.r2 + 1}:`, `Linhas ${s.rect.r1 + 1}-${s.rect.r2 + 1}:`);
  const hOn = check8("rh-on", !!rp.trHeight, tr11(lang, "Specify height:", "Especificar altura:"));
  const hVal = cmInput2(lang, "rh", rp.trHeight?.val ?? s.rowHeight?.twips ?? 0);
  const hRule = sel3("rh-rule", [["atLeast", tr11(lang, "At least", "Pelo menos")], ["exact", tr11(lang, "Exactly", "Exatamente")]], rp.trHeight?.hRule === "exact" ? "exact" : "atLeast");
  const syncH = () => {
    hVal.disabled = hRule.disabled = !hOn.box.checked;
  };
  hOn.box.addEventListener("change", syncH);
  syncH();
  const brk = check8("r-break", !rp.cantSplit, tr11(lang, "Allow row to break across pages", "Permitir quebra de linha entre p\xE1ginas"));
  const hdr = check8("r-header", !!rp.tblHeader, tr11(lang, "Repeat as header row at the top of each page", "Repetir como linha de cabe\xE7alho na parte superior de cada p\xE1gina"));
  const rowTab = el13(
    "div",
    {},
    el13("strong", {}, rowsLabel),
    section2(tr11(lang, "Size", "Tamanho"), line(hOn.el, hVal, el13("span", {}, tr11(lang, "Row height is:", "A altura da linha \xE9:")), hRule)),
    section2(tr11(lang, "Options", "Op\xE7\xF5es"), brk.el, hdr.el)
  );
  const colsLabel = s.rect.c1 === s.rect.c2 ? tr11(lang, `Column ${s.rect.c1 + 1}:`, `Coluna ${s.rect.c1 + 1}:`) : tr11(lang, `Columns ${s.rect.c1 + 1}-${s.rect.c2 + 1}:`, `Colunas ${s.rect.c1 + 1}-${s.rect.c2 + 1}:`);
  const tcW = cp.tcW?.type === "dxa" || cp.tcW?.type === "pct" ? cp.tcW : void 0;
  const cWidth = widthField(lang, "cw", tcW, s.colWidth);
  const colTab = el13("div", {}, el13("strong", {}, colsLabel), section2(tr11(lang, "Size", "Tamanho"), cWidth.el));
  const kWidth = widthField(lang, "kw", tcW, s.colWidth);
  const curV = cp.vAlign === "center" || cp.vAlign === "bottom" ? cp.vAlign : "top";
  const vAlign = radiosRow("kva", [["top", tr11(lang, "Top", "Superior")], ["center", tr11(lang, "Center", "Centralizado")], ["bottom", tr11(lang, "Bottom", "Inferior")]], curV);
  let cellOpts;
  const cellBtn = el13("button", { type: "button", className: "uo-pill", textContent: tr11(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  cellBtn.addEventListener("click", () => {
    void cellOptionsDialog(env, cp, t2).then((r) => {
      if (r) cellOpts = r;
    });
  });
  const cellTab = el13(
    "div",
    {},
    section2(tr11(lang, "Size", "Tamanho"), kWidth.el),
    section2(tr11(lang, "Vertical alignment", "Alinhamento vertical"), vAlign.el),
    el13("div", { style: "display:flex;justify-content:flex-end" }, cellBtn)
  );
  const title = el13("input", { type: "text", name: "alt-title", value: t2.tblCaption ?? "", style: "width:100%" });
  const descr = el13("textarea", { name: "alt-descr", value: t2.tblDescription ?? "", rows: 5, style: "width:100%;resize:vertical;font:inherit" });
  const altTab = el13(
    "div",
    {},
    el13("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr11(lang, "Title", "T\xEDtulo"), title),
    el13("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr11(lang, "Description", "Descri\xE7\xE3o"), descr)
  );
  const tabs = dialogTabs([
    { id: "table", label: tr11(lang, "Table", "Tabela"), body: tableTab },
    { id: "row", label: tr11(lang, "Row", "Linha"), body: rowTab },
    { id: "column", label: tr11(lang, "Column", "Coluna"), body: colTab },
    { id: "cell", label: tr11(lang, "Cell", "C\xE9lula"), body: cellTab },
    { id: "alt", label: tr11(lang, "Alt Text", "Texto Alt"), body: altTab }
  ], tab);
  if (!await ask2(env, tr11(lang, "Table Properties", "Propriedades da Tabela"), tabs.el, 540)) return;
  const sameW = (a, b) => a === null ? !b || b.type === "auto" || b.type === "nil" || !b.w : !!b && a.type === b.type && a.w === b.w;
  const out = {};
  const tb = {};
  const tw = tWidth.read();
  if (!sameW(tw, t2.tblW)) tb.width = tw;
  const al = align.value();
  if (al !== curAlign) tb.align = al;
  const ind = twOf2(indent.value) ?? 0;
  if (al === "left" && ind !== (t2.tblInd?.type === "dxa" ? t2.tblInd.w : 0)) tb.indentTwips = ind;
  const wr = wrap.value();
  if (wr !== (t2.tblpPr ? "around" : "none")) tb.wrap = wr;
  if (wr === "around" && position && JSON.stringify(position) !== JSON.stringify(t2.tblpPr ?? null)) tb.position = position;
  if (wr === "around" && overlap !== void 0) tb.overlap = overlap;
  if (title.value !== (t2.tblCaption ?? "")) tb.title = title.value;
  if (descr.value !== (t2.tblDescription ?? "")) tb.description = descr.value;
  if (Object.keys(tb).length) out.table = tb;
  const rw = {};
  const hTw = twOf2(hVal.value) ?? 0;
  const hNew = hOn.box.checked && hTw > 0 ? { twips: hTw, rule: hRule.value } : null;
  const hOld = rp.trHeight ? { twips: rp.trHeight.val, rule: rp.trHeight.hRule === "exact" ? "exact" : "atLeast" } : null;
  if (JSON.stringify(hNew) !== JSON.stringify(hOld)) rw.height = hNew;
  if (brk.box.checked !== !rp.cantSplit) rw.allowBreak = brk.box.checked;
  if (hdr.box.checked !== !!rp.tblHeader) rw.header = hdr.box.checked;
  if (Object.keys(rw).length) out.row = rw;
  const cw = cWidth.read();
  if (!sameW(cw, tcW)) out.column = { width: cw };
  const cl = {};
  const kw = kWidth.read();
  if (!out.column && !sameW(kw, tcW)) cl.width = kw;
  const va = vAlign.value();
  if (va !== curV) cl.vAlign = va;
  if (cellOpts) {
    cl.margins = cellOpts.margins;
    cl.wrap = cellOpts.wrap;
    cl.fitText = cellOpts.fitText;
  }
  if (Object.keys(cl).length) out.cell = cl;
  if (Object.keys(out).length) ed.setTableProperties(out);
}
async function positioningDialog(env, pos, overlap) {
  const lang = env.lang;
  const hSpecs = [
    ["left", tr11(lang, "Left", "Esquerda")],
    ["center", tr11(lang, "Center", "Centralizado")],
    ["right", tr11(lang, "Right", "Direita")],
    ["inside", tr11(lang, "Inside", "Interna")],
    ["outside", tr11(lang, "Outside", "Externa")]
  ];
  const vSpecs = [
    ["top", tr11(lang, "Top", "Superior")],
    ["center", tr11(lang, "Center", "Centralizado")],
    ["bottom", tr11(lang, "Bottom", "Inferior")],
    ["inside", tr11(lang, "Inside", "Interna")],
    ["outside", tr11(lang, "Outside", "Externa")]
  ];
  const combo = (name, specs, spec, tw) => {
    const input = el13("input", { type: "text", name, style: "width:120px", value: spec ? specs.find(([v2]) => v2 === spec)?.[1] ?? spec : `${cmText2(lang, tw ?? 0)} cm` });
    const list = el13("select", { name: `${name}-list`, style: "width:28px" }, el13("option", { value: "" }, ""), ...specs.map(([v2, x]) => el13("option", { value: v2 }, x)));
    list.addEventListener("change", () => {
      if (list.value) input.value = specs.find(([v2]) => v2 === list.value)[1];
      list.value = "";
    });
    const read = () => {
      const hit = specs.find(([, x]) => x.toLowerCase() === input.value.trim().toLowerCase());
      return hit ? { spec: hit[0] } : { tw: twOf2(input.value) ?? 0 };
    };
    return { el: el13("span", { style: "display:inline-flex;gap:4px" }, input, list), read };
  };
  const hPos = combo("hpos", hSpecs, pos.tblpXSpec, pos.tblpX);
  const hRel = sel3("hrel", [["text", tr11(lang, "Column", "Coluna")], ["margin", tr11(lang, "Margin", "Margem")], ["page", tr11(lang, "Page", "P\xE1gina")]], pos.horzAnchor ?? "text");
  const vPos = combo("vpos", vSpecs, pos.tblpYSpec, pos.tblpY);
  const vRel = sel3("vrel", [["margin", tr11(lang, "Margin", "Margem")], ["page", tr11(lang, "Page", "P\xE1gina")], ["text", tr11(lang, "Paragraph", "Par\xE1grafo")]], pos.vertAnchor ?? "text");
  const top = cmInput2(lang, "dtop", pos.topFromText ?? 0), bottom = cmInput2(lang, "dbottom", pos.bottomFromText ?? 0);
  const left = cmInput2(lang, "dleft", pos.leftFromText ?? 0), right = cmInput2(lang, "dright", pos.rightFromText ?? 0);
  const move = check8("move", (pos.vertAnchor ?? "text") === "text", tr11(lang, "Move with text", "Mover com texto"));
  move.box.addEventListener("change", () => {
    vRel.value = move.box.checked ? "text" : "margin";
  });
  vRel.addEventListener("change", () => {
    move.box.checked = vRel.value === "text";
  });
  const ov = check8("overlap", overlap, tr11(lang, "Allow overlap", "Permitir sobreposi\xE7\xE3o"));
  const grid2 = (...kids) => el13("div", { className: "uo-dialog-grid" }, ...kids);
  const body = el13(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    section2(tr11(lang, "Horizontal", "Horizontal"), grid2(el13("span", {}, tr11(lang, "Position:", "Posi\xE7\xE3o:")), hPos.el, el13("span", {}, tr11(lang, "Relative to:", "Em rela\xE7\xE3o a:")), hRel)),
    section2(tr11(lang, "Vertical", "Vertical"), grid2(el13("span", {}, tr11(lang, "Position:", "Posi\xE7\xE3o:")), vPos.el, el13("span", {}, tr11(lang, "Relative to:", "Em rela\xE7\xE3o a:")), vRel)),
    section2(tr11(lang, "Distance from surrounding text", "Dist\xE2ncia do texto ao redor"), grid2(
      el13("span", {}, tr11(lang, "Top:", "Superior:")),
      top,
      el13("span", {}, tr11(lang, "Left:", "Esquerda:")),
      left,
      el13("span", {}, tr11(lang, "Bottom:", "Inferior:")),
      bottom,
      el13("span", {}, tr11(lang, "Right:", "Direita:")),
      right
    )),
    section2(tr11(lang, "Options", "Op\xE7\xF5es"), move.el, ov.el)
  );
  if (!await ask2(env, tr11(lang, "Table Positioning", "Posicionamento da Tabela"), body, 440)) return null;
  const h = hPos.read(), v = vPos.read();
  const nz = (x) => x ? x : void 0;
  const out = {
    leftFromText: nz(twOf2(left.value)),
    rightFromText: nz(twOf2(right.value)),
    topFromText: nz(twOf2(top.value)),
    bottomFromText: nz(twOf2(bottom.value)),
    vertAnchor: vRel.value,
    horzAnchor: hRel.value === "text" ? void 0 : hRel.value,
    tblpXSpec: h.spec,
    tblpX: h.spec ? void 0 : nz(h.tw),
    tblpYSpec: v.spec,
    tblpY: v.spec ? void 0 : nz(v.tw)
  };
  for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
  return { pos: out, overlap: ov.box.checked };
}
async function cellOptionsDialog(env, cp, t2) {
  const lang = env.lang;
  const tm = t2.tblCellMar ?? {};
  const w = (v, d = 0) => v?.type === "dxa" ? v.w : d;
  const own = !!cp.tcMar && Object.keys(cp.tcMar).length > 0;
  const same = check8("same", !own, tr11(lang, "Same as the whole table", "Igual \xE0 tabela inteira"));
  const m = cp.tcMar ?? {};
  const top = cmInput2(lang, "top", w(m.top, w(tm.top))), bottom = cmInput2(lang, "bottom", w(m.bottom, w(tm.bottom)));
  const left = cmInput2(lang, "left", w(m.left, w(tm.left, 108))), right = cmInput2(lang, "right", w(m.right, w(tm.right, 108)));
  const syncM = () => {
    for (const i of [top, bottom, left, right]) i.disabled = same.box.checked;
  };
  same.box.addEventListener("change", syncM);
  syncM();
  const wrap = check8("wrap", !cp.noWrap, tr11(lang, "Wrap text", "Quebrar texto automaticamente"));
  const fit = check8("fit", !!cp.tcFitText, tr11(lang, "Fit text", "Ajustar texto"));
  const body = el13(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    section2(tr11(lang, "Cell margins", "Margens da c\xE9lula"), same.el, el13(
      "div",
      { className: "uo-dialog-grid" },
      el13("span", {}, tr11(lang, "Top:", "Superior:")),
      top,
      el13("span", {}, tr11(lang, "Left:", "Esquerda:")),
      left,
      el13("span", {}, tr11(lang, "Bottom:", "Inferior:")),
      bottom,
      el13("span", {}, tr11(lang, "Right:", "Direita:")),
      right
    )),
    section2(tr11(lang, "Options", "Op\xE7\xF5es"), wrap.el, fit.el)
  );
  if (!await ask2(env, tr11(lang, "Cell Options", "Op\xE7\xF5es da C\xE9lula"), body, 400)) return null;
  return {
    margins: same.box.checked ? null : { top: twOf2(top.value), left: twOf2(left.value), bottom: twOf2(bottom.value), right: twOf2(right.value) },
    wrap: wrap.box.checked,
    fitText: fit.box.checked
  };
}
async function sortDialog(env) {
  const lang = env.lang, ed = env.ed;
  let separator = void 0;
  let caseSensitive = false;
  let info = ed.sortInfo();
  if (!info) return;
  if (info.mergeError) {
    const h = openDialog({
      title: tr11(lang, "Sort", "Classificar"),
      icon: "warning",
      layer: env.layer,
      lang,
      body: tr11(lang, "Cannot sort a table that contains merged cells.", "N\xE3o \xE9 poss\xEDvel classificar uma tabela que cont\xE9m c\xE9lulas mescladas.")
    });
    await h.result;
    return;
  }
  const types = [["text", tr11(lang, "Text", "Texto")], ["number", tr11(lang, "Number", "N\xFAmero")], ["date", tr11(lang, "Date", "Data")]];
  const none = tr11(lang, "(none)", "(nenhum)");
  const header = radiosRow("hdr", [["yes", tr11(lang, "Header row", "Linha de cabe\xE7alho")], ["no", tr11(lang, "No header row", "Nenhuma linha de cabe\xE7alho")]], info.header ? "yes" : "no");
  const isHeader = () => header.value() === "yes";
  const labels = () => info.columns.map((c, i) => {
    if (info.kind === "paragraphs") return info.columns.length === 1 ? tr11(lang, "Paragraphs", "Par\xE1grafos") : tr11(lang, `Field ${i + 1}`, `Campo ${i + 1}`);
    return isHeader() && c.text ? c.text : tr11(lang, `Column ${i + 1}`, `Coluna ${i + 1}`);
  });
  const keyRow = (n) => {
    const col = el13("select", { name: `k${n}-col`, style: "min-width:160px" });
    const type = sel3(`k${n}-type`, types, "text");
    const dir = radiosRow(`k${n}-dir`, [["asc", tr11(lang, "Ascending", "Crescente")], ["desc", tr11(lang, "Descending", "Decrescente")]], "asc");
    const fill = () => {
      const cur = col.value;
      col.replaceChildren(...n > 0 ? [el13("option", { value: "" }, none)] : [], ...labels().map((l, i) => el13("option", { value: String(i) }, l)));
      col.value = cur && [...col.options].some((o) => o.value === cur) ? cur : n > 0 ? "" : "0";
    };
    const sync = () => {
      type.disabled = col.value === "";
      for (const i of dir.el.querySelectorAll("input")) i.disabled = col.value === "";
    };
    const guess = () => {
      const c = info.columns[+col.value];
      if (col.value !== "" && c) type.value = c.guess;
    };
    fill();
    guess();
    sync();
    col.addEventListener("change", () => {
      guess();
      sync();
    });
    const title = n === 0 ? tr11(lang, "Sort by", "Classificar por") : tr11(lang, "Then by", "E depois por");
    return {
      el: section2(title, line(col, el13("span", {}, tr11(lang, "Type:", "Tipo:")), type), dir.el),
      fill: () => {
        fill();
        sync();
      },
      read: () => col.value === "" ? null : { column: +col.value, type: type.value, desc: dir.value() === "desc" }
    };
  };
  const keys = [keyRow(0), keyRow(1), keyRow(2)];
  header.el.addEventListener("change", () => keys.forEach((k) => k.fill()));
  const opts = el13("button", { type: "button", className: "uo-pill", textContent: tr11(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  opts.addEventListener("click", () => {
    void sortOptionsDialog(env, info.kind === "paragraphs", separator, caseSensitive).then((r) => {
      if (!r) return;
      separator = r.separator;
      caseSensitive = r.caseSensitive;
      info = ed.sortInfo(separator) ?? info;
      keys.forEach((k) => k.fill());
    });
  });
  const body = el13(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    ...keys.map((k) => k.el),
    section2(tr11(lang, "My list has", "Minha lista tem"), header.el),
    el13("div", { style: "display:flex;justify-content:flex-end" }, opts)
  );
  if (!await ask2(env, tr11(lang, "Sort", "Classificar"), body, 460)) return;
  const ks = keys.map((k) => k.read()).filter((k) => !!k);
  if (ks.length) ed.sort({ keys: ks, header: isHeader(), caseSensitive, separator });
}
async function sortOptionsDialog(env, paragraphs, sep, cs) {
  const lang = env.lang;
  const cur = sep === void 0 ? "tab" : typeof sep === "string" ? sep : "other";
  const r = radiosRow("ssep", [["tab", tr11(lang, "Tabs", "Tabula\xE7\xF5es")], ["comma", tr11(lang, "Commas", "V\xEDrgulas")], ["other", tr11(lang, "Other:", "Outro:")]], cur);
  const other = el13("input", { type: "text", name: "ssep-other", maxLength: 1, value: typeof sep === "object" ? sep.char : "", style: "width:40px" });
  other.addEventListener("input", () => {
    r.el.querySelector('input[value="other"]').checked = true;
  });
  const use = check8("fields", sep !== void 0, tr11(lang, "Sort by fields", "Classificar por campos"));
  const csBox = check8("case", cs, tr11(lang, "Case sensitive", "Diferenciar mai\xFAsculas de min\xFAsculas"));
  const body = el13(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    ...paragraphs ? [section2(tr11(lang, "Separate fields at", "Separar campos em"), use.el, line(r.el, other))] : [],
    section2(tr11(lang, "Sort options", "Op\xE7\xF5es de classifica\xE7\xE3o"), csBox.el)
  );
  if (!await ask2(env, tr11(lang, "Sort Options", "Op\xE7\xF5es de Classifica\xE7\xE3o"), body, 380)) return null;
  const v = r.value();
  const separator = !paragraphs || !use.box.checked ? void 0 : v === "other" ? { char: other.value || "-" } : v;
  return { separator, caseSensitive: csBox.box.checked };
}

// src/chrome-dialogs.ts
var el14 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var select6 = (name, opts, value) => {
  const s = el14("select", { name });
  for (const [v, t2] of opts) s.append(el14("option", { value: v, textContent: t2 }));
  s.value = value;
  return s;
};
var check9 = (name, label, on) => {
  const i = el14("input", { type: "checkbox", name, checked: on });
  return el14("label", { className: "uo-check" }, i, label);
};
var tr12 = (lang, en, pt) => pickLabels(lang, { en, pt });
async function authorDialog(env) {
  if (env.ed.hasAuthor()) return true;
  const L15 = env.app.ui.L;
  const name = await promptDialog({ title: L15.authorTitle, label: L15.authorText, ok: L15.authorOk, layer: env.layer, lang: env.lang });
  if (!name?.trim()) return false;
  env.ed.author = name.trim();
  originStore.set("uw-author", env.ed.author);
  return true;
}
async function commentDialog(env) {
  const L15 = env.app.ui.L;
  if (!env.ed.selectedText()) {
    env.app.ui.flash(L15.selectToComment);
    return;
  }
  if (!await authorDialog(env)) return;
  const text = await promptDialog({ title: L15.commentTitle, label: L15.commentText, multiline: true, ok: L15.commentAdd, layer: env.layer, lang: env.lang });
  if (!text?.trim()) return;
  env.app.ui.flash(env.ed.addComment(text.trim()) === null ? L15.selectToComment : L15.commentAdded);
}
var unitOf = (lang) => lang === "pt" ? { tw: 1440 / 2.54, name: "cm", step: "0.01" } : { tw: 1440, name: '"', step: "0.01" };
var fmtUnit = (tw, u, lang) => (Math.round(tw / u.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 });
var parseUnit = (v, u) => {
  const n = parseFloat(v.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * u.tw) : NaN;
};
var unitInput = (name, tw, u, lang, min) => el14("input", { type: "text", name, value: fmtUnit(tw, u, lang), inputMode: "decimal", style: "width:96px", ...min !== void 0 ? { dataset: { min: String(min) } } : {} });
async function paragraphDialog(env, tab = "indents") {
  const L15 = env.app.ui.L, lang = env.lang;
  const p = env.state().para;
  const u = unitOf(lang);
  const ind = env.ed.getParagraphIndents();
  const lay = typeof env.ed.getParagraphLayout === "function" ? env.ed.getParagraphLayout() : null;
  const align = select6("align", [
    ["left", tr12(lang, "Left", "Esquerda")],
    ["center", tr12(lang, "Centered", "Centralizada")],
    ["right", tr12(lang, "Right", "Direita")],
    ["both", tr12(lang, "Justified", "Justificada")]
  ], p.alignment ?? "left");
  const left = unitInput("left", ind.left, u, lang);
  const right = unitInput("right", ind.right, u, lang);
  const special = select6("special", [
    ["none", tr12(lang, "(none)", "(nenhum)")],
    ["firstLine", tr12(lang, "First line", "Primeira linha")],
    ["hanging", tr12(lang, "Hanging", "Deslocamento")]
  ], !ind.firstLine ? "none" : ind.firstLine > 0 ? "firstLine" : "hanging");
  const by = unitInput("by", Math.abs(ind.firstLine), u, lang);
  const syncBy = () => {
    by.disabled = special.value === "none";
    if (special.value === "none") by.value = "";
    else if (!by.value || parseUnit(by.value, u) === 0) by.value = fmtUnit(Math.round(u.tw * (lang === "pt" ? 1.25 : 0.5)), u, lang);
  };
  special.addEventListener("change", syncBy);
  if (special.value === "none") {
    by.value = "";
    by.disabled = true;
  }
  const autoTxt = tr12(lang, "Auto", "Autom\xE1tico");
  const spText = (v) => v === null || v === void 0 ? "" : v === "auto" ? autoTxt : formatMeasure(v, "pt", lang);
  const before = el14("input", { type: "text", name: "before", inputMode: "decimal", style: "width:96px", value: spText(lay ? lay.before : p.spaceBeforeTwips ?? 0) });
  const after = el14("input", { type: "text", name: "after", inputMode: "decimal", style: "width:96px", value: spText(lay ? lay.after : p.spaceAfterTwips ?? 0) });
  const spStart = { before: before.value, after: after.value };
  const dec = tr12(lang, ".", ",");
  const line2 = select6(
    "line",
    [["240", `1${dec}0`], ["259", `1${dec}08`], ["276", `1${dec}15`], ["360", `1${dec}5`], ["480", `2${dec}0`]],
    String(p.lineTwentieths ?? 259)
  );
  const withUnit = (i) => el14("span", { style: "display:flex;gap:4px;align-items:center" }, i, u.name);
  const grid2 = el14(
    "div",
    { className: "uo-dialog-grid" },
    el14("span", {}, L15.alignment),
    align,
    el14("span", {}, tr12(lang, "Left indent", "Recuo \xE0 esquerda")),
    withUnit(left),
    el14("span", {}, tr12(lang, "Right indent", "Recuo \xE0 direita")),
    withUnit(right),
    el14("span", {}, L15.specialIndent),
    el14("span", { style: "display:flex;gap:6px;align-items:center" }, special, withUnit(by)),
    el14("span", {}, L15.before),
    before,
    el14("span", {}, L15.after),
    after,
    el14("span", {}, L15.lineSpacing),
    line2
  );
  const flow = typeof env.ed.getParagraphFlow === "function" ? env.ed.getParagraphFlow() : null;
  const flag = (name, label) => {
    const v = flow?.[name];
    const i = el14("input", { type: "checkbox", name, checked: !!v });
    if (v === null) i.indeterminate = true;
    i.addEventListener("change", () => {
      i.dataset["touched"] = "1";
    });
    return el14("label", { className: "uo-check" }, i, label);
  };
  const tight = select6("tight", [
    ["none", tr12(lang, "None", "Nenhum")],
    ["allLines", tr12(lang, "All", "Todas")],
    ["firstAndLastLine", tr12(lang, "First and last lines", "Primeira e \xFAltima linhas")],
    ["firstLineOnly", tr12(lang, "First line only", "Somente primeira linha")],
    ["lastLineOnly", tr12(lang, "Last line only", "Somente \xFAltima linha")]
  ], flow?.textboxTightWrap ?? "");
  if (!flow?.textboxTightWrap) tight.selectedIndex = -1;
  const breaks = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px" },
    el14("strong", {}, tr12(lang, "Pagination", "Pagina\xE7\xE3o")),
    flag("widowControl", tr12(lang, "Widow/Orphan control", "Controle de linhas \xF3rf\xE3s/vi\xFAvas")),
    flag("keepNext", tr12(lang, "Keep with next", "Manter com o pr\xF3ximo")),
    flag("keepLines", tr12(lang, "Keep lines together", "Manter linhas juntas")),
    flag("pageBreakBefore", tr12(lang, "Page break before", "Quebrar p\xE1gina antes")),
    el14("strong", { style: "margin-top:6px" }, tr12(lang, "Formatting exceptions", "Exce\xE7\xF5es de formata\xE7\xE3o")),
    flag("suppressLineNumbers", tr12(lang, "Suppress line numbers", "Suprimir n\xFAmeros de linha")),
    flag("suppressAutoHyphens", tr12(lang, "Don't hyphenate", "N\xE3o hifenizar")),
    el14("strong", { style: "margin-top:6px" }, tr12(lang, "Textbox options", "Op\xE7\xF5es de caixa de texto")),
    el14("div", { className: "uo-dialog-grid" }, el14("span", {}, tr12(lang, "Tight wrap:", "Ajuste r\xEDgido:")), tight)
  );
  const tabs = dialogTabs([
    { id: "indents", label: tr12(lang, "Indents and Spacing", "Recuos e espa\xE7amento"), body: grid2 },
    { id: "breaks", label: tr12(lang, "Line and Page Breaks", "Quebras de linha e de p\xE1gina"), body: breaks }
  ], tab);
  const h = openDialog({
    title: L15.paraDlg,
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "tabs", label: tr12(lang, "Tabs\u2026", "Tabula\xE7\xE3o\u2026") }, { id: "cancel", label: L15.cancel }, { id: "ok", label: L15.apply, primary: true }]
  });
  const res = await h.result;
  if (res !== "ok" && res !== "tabs") return;
  const ed = env.ed;
  ed.setAlignment(align.value);
  const nl = parseUnit(left.value, u), nr = parseUnit(right.value, u);
  const nb = special.value === "none" ? 0 : parseUnit(by.value, u);
  const nf = special.value === "hanging" ? -Math.abs(nb) : Math.abs(nb);
  const patch = {};
  if (Number.isFinite(nl) && nl !== ind.left) patch.left = nl;
  if (Number.isFinite(nr) && nr !== ind.right) patch.right = nr;
  if (Number.isFinite(nf) && nf !== ind.firstLine) patch.firstLine = nf;
  if (Object.keys(patch).length) ed.setParagraphIndents(patch);
  const spVal = (s) => s.trim().toLowerCase() === autoTxt.toLowerCase() ? "auto" : parseMeasure(s, "pt");
  const sp = {};
  if (before.value !== spStart.before) {
    const v = spVal(before.value);
    if (v !== null) sp.before = v;
  }
  if (after.value !== spStart.after) {
    const v = spVal(after.value);
    if (v !== null) sp.after = v;
  }
  if (Object.keys(sp).length) {
    if (typeof ed.setParagraphLayout === "function") ed.setParagraphLayout(sp);
    else {
      if (typeof sp.before === "number") ed.setSpaceBefore(sp.before);
      if (typeof sp.after === "number") ed.setSpaceAfter(sp.after);
    }
  }
  ed.setLineSpacing(Number(line2.value));
  if (flow && typeof ed.setParagraphFlow === "function") {
    const f = {};
    for (const i of breaks.querySelectorAll("input[type=checkbox][data-touched]")) f[i.name] = i.checked;
    if (tight.value && tight.value !== (flow.textboxTightWrap ?? "")) f.textboxTightWrap = tight.value;
    if (Object.keys(f).length) ed.setParagraphFlow(f);
  }
  if (res === "tabs") await tabsDialog(env);
}
async function tabsDialog(env) {
  const lang = env.lang, ed = env.ed, L15 = env.app.ui.L;
  const u = unitOf(lang);
  const cur = ed.getTabStops();
  let tabs = cur.tabs.map((t2) => ({ ...t2 }));
  const cleared = [];
  const pos = el14("input", { type: "text", name: "pos", inputMode: "decimal", style: "width:100%" });
  pos.setAttribute("aria-label", tr12(lang, "Tab stop position", "Posi\xE7\xE3o da parada de tabula\xE7\xE3o"));
  const list = el14("select", { name: "list", size: 6, style: "width:100%;height:132px" });
  const def = unitInput("default", cur.defaultTabTwips, u, lang);
  const clearedEl = el14("div", { style: "font-size:12px;min-height:16px;color:var(--u-color-on-surface-variant,#44474f)" });
  const radios2 = (name, opts, value) => {
    const box = el14("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px 12px" });
    for (const [v, t2] of opts) {
      const i = el14("input", { type: "radio", name, value: v, checked: v === value });
      box.append(el14("label", { className: "uo-check" }, i, t2));
    }
    return box;
  };
  const alignBox = radios2("align", [
    ["left", tr12(lang, "Left", "Esquerdo")],
    ["center", tr12(lang, "Center", "Centralizado")],
    ["right", tr12(lang, "Right", "Direito")],
    ["decimal", tr12(lang, "Decimal", "Decimal")],
    ["bar", tr12(lang, "Bar", "Barra")]
  ], "left");
  const leaderBox = radios2("leader", [["", tr12(lang, "1 None", "1 Nenhum")], ["dot", "2 ......."], ["hyphen", "3 -------"], ["underscore", "4 _______"]], "");
  const val = (name) => alignBox.parentElement?.querySelector(`input[name="${name}"]:checked`)?.value ?? body.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
  const setRadio = (name, v) => {
    for (const i of body.querySelectorAll(`input[name="${name}"]`)) i.checked = i.value === v;
  };
  const render = (keep) => {
    tabs.sort((a, b) => a.pos - b.pos);
    list.replaceChildren(...tabs.map((t2) => el14("option", { value: String(t2.pos), textContent: `${fmtUnit(t2.pos, u, lang)} ${u.name}` })));
    if (keep !== void 0) list.value = String(keep);
    clearedEl.textContent = cleared.length ? `${tr12(lang, "Tab stops to be cleared:", "Tabula\xE7\xF5es a serem limpas:")} ${cleared.map((x) => `${fmtUnit(x, u, lang)} ${u.name}`).join("; ")}` : "";
  };
  list.addEventListener("change", () => {
    const t2 = tabs.find((x) => String(x.pos) === list.value);
    if (!t2) return;
    pos.value = `${fmtUnit(t2.pos, u, lang)}`;
    setRadio("align", t2.align);
    setRadio("leader", t2.leader === "dot" || t2.leader === "hyphen" || t2.leader === "underscore" ? t2.leader : "");
  });
  const setBtn = el14("button", { type: "button", className: "uo-pill", textContent: tr12(lang, "Set", "Definir") });
  const clrBtn = el14("button", { type: "button", className: "uo-pill", textContent: tr12(lang, "Clear", "Limpar") });
  const allBtn = el14("button", { type: "button", className: "uo-pill", textContent: tr12(lang, "Clear All", "Limpar Tudo") });
  const define = () => {
    const p = parseUnit(pos.value, u);
    if (!Number.isFinite(p)) return false;
    tabs = tabs.filter((t2) => t2.pos !== p);
    const lead = val("leader");
    tabs.push({ pos: p, align: val("align") || "left", ...lead ? { leader: lead } : {} });
    const ci = cleared.indexOf(p);
    if (ci >= 0) cleared.splice(ci, 1);
    render(p);
    return true;
  };
  setBtn.addEventListener("click", () => {
    define();
    pos.focus();
    pos.select();
  });
  clrBtn.addEventListener("click", () => {
    const p = list.value ? Number(list.value) : parseUnit(pos.value, u);
    if (!Number.isFinite(p) || !tabs.some((t2) => t2.pos === p)) return;
    tabs = tabs.filter((t2) => t2.pos !== p);
    cleared.push(p);
    pos.value = "";
    render();
  });
  allBtn.addEventListener("click", () => {
    cleared.push(...tabs.map((t2) => t2.pos));
    tabs = [];
    pos.value = "";
    render();
  });
  pos.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      define();
    }
  });
  const left = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px;min-width:150px;flex:1 1 0" },
    el14("span", {}, tr12(lang, "Tab stop position:", "Posi\xE7\xE3o da parada de tabula\xE7\xE3o:")),
    pos,
    list
  );
  const right = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px;flex:1 1 0" },
    el14("span", {}, tr12(lang, "Default tab stops:", "Paradas de tabula\xE7\xE3o padr\xE3o:")),
    el14("span", { style: "display:flex;gap:4px;align-items:center" }, def, u.name),
    clearedEl
  );
  const body = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el14("div", { style: "display:flex;gap:16px" }, left, right),
    el14("strong", {}, tr12(lang, "Alignment", "Alinhamento")),
    alignBox,
    el14("strong", {}, tr12(lang, "Leader", "Preenchimento")),
    leaderBox,
    el14("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, setBtn, clrBtn, allBtn)
  );
  render();
  if (tabs[0]) {
    list.value = String(tabs[0].pos);
    list.dispatchEvent(new Event("change"));
  }
  const h = openDialog({
    title: tr12(lang, "Tabs", "Tabula\xE7\xE3o"),
    body,
    layer: env.layer,
    lang,
    width: 460,
    actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.apply, primary: true }]
  });
  setTimeout(() => pos.focus(), 0);
  if (await h.result !== "ok") return;
  if (pos.value && !tabs.some((t2) => t2.pos === parseUnit(pos.value, u))) define();
  const d = parseUnit(def.value, u);
  if (Number.isFinite(d) && d > 0 && d !== cur.defaultTabTwips) ed.setDefaultTabStop(d);
  const same = JSON.stringify(tabs) === JSON.stringify(cur.tabs.map((t2) => ({ ...t2 })).sort((a, b) => a.pos - b.pos));
  if (!same) ed.setTabStops(tabs);
}
var applyToSelect = (lang, hasSel, value) => select6("applyTo", [
  ["section", tr12(lang, "This section", "Esta se\xE7\xE3o")],
  ["forward", tr12(lang, "This point forward", "Deste ponto em diante")],
  ["document", tr12(lang, "Whole document", "No documento inteiro")],
  ...hasSel ? [["selection", tr12(lang, "Selected text", "Texto selecionado")]] : []
], value);
async function pageDialog(env, tab = "margins") {
  const L15 = env.app.ui.L, lang = env.lang, ed = env.ed;
  const u = unitOf(lang);
  const orient = select6("orientation", [["portrait", tr12(lang, "Portrait", "Retrato")], ["landscape", tr12(lang, "Landscape", "Paisagem")]], "portrait");
  const size = select6("size", [["A4", "A4"], ["Letter", tr12(lang, "Letter", "Carta")]], "A4");
  const margins = select6("margins", [["normal", "Normal"], ["narrow", tr12(lang, "Narrow", "Estreita")], ["wide", tr12(lang, "Wide", "Larga")], ["custom", tr12(lang, "Custom", "Personalizadas")]], "normal");
  const s = ed.getSection();
  const cm = s ? { ...s.margins } : { top: 1417, right: 1701, bottom: 1417, left: 1701 };
  if (s) {
    orient.value = s.orientation;
    size.value = Math.abs(Math.min(s.pageWidthTwips, s.pageHeightTwips) - 12240) < 60 ? "Letter" : "A4";
    const m = s.orientation === "landscape" ? s.margins.top : s.margins.left;
    margins.value = m < 1e3 ? "narrow" : m > 2200 ? "wide" : "normal";
  }
  const mt = unitInput("mtop", cm.top, u, lang), mb = unitInput("mbottom", cm.bottom, u, lang);
  const ml = unitInput("mleft", cm.left, u, lang), mr = unitInput("mright", cm.right, u, lang);
  const marginInputs = [mt, mb, ml, mr];
  for (const i of marginInputs) i.addEventListener("input", () => {
    margins.value = "custom";
  });
  const start = { orientation: orient.value, size: size.value, margins: margins.value };
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, "section");
  const withUnit = (i) => el14("span", { style: "display:flex;gap:4px;align-items:center" }, i, u.name);
  const marginsTab = el14(
    "div",
    { className: "uo-dialog-grid" },
    el14("span", {}, L15.margins),
    margins,
    el14("span", {}, tr12(lang, "Top", "Superior")),
    withUnit(mt),
    el14("span", {}, tr12(lang, "Bottom", "Inferior")),
    withUnit(mb),
    el14("span", {}, tr12(lang, "Left", "Esquerda")),
    withUnit(ml),
    el14("span", {}, tr12(lang, "Right", "Direita")),
    withUnit(mr),
    el14("span", {}, L15.orientation),
    orient
  );
  const paperTab = el14("div", { className: "uo-dialog-grid" }, el14("span", {}, L15.paper), size);
  const startType = s?.type ?? "nextPage";
  const sectStart = select6("sectionStart", [
    ["continuous", tr12(lang, "Continuous", "Cont\xEDnuo")],
    ["nextColumn", tr12(lang, "New column", "Nova coluna")],
    ["nextPage", tr12(lang, "New page", "Nova p\xE1gina")],
    ["evenPage", tr12(lang, "Even page", "P\xE1gina par")],
    ["oddPage", tr12(lang, "Odd page", "P\xE1gina \xEDmpar")]
  ], startType);
  const hf = typeof ed.getHeaderFooterOptions === "function" ? ed.getHeaderFooterOptions() : null;
  const oddEven = check9("oddEven", tr12(lang, "Different odd and even", "Diferentes em p\xE1ginas pares e \xEDmpares"), !!hf?.differentOddEven);
  const firstPage = check9("firstPage", tr12(lang, "Different first page", "Diferente na primeira p\xE1gina"), !!hf?.differentFirstPage);
  const hdr = unitInput("header", hf?.headerDistance ?? 708, u, lang), ftr = unitInput("footer", hf?.footerDistance ?? 708, u, lang);
  const hfStart = { header: hdr.value, footer: ftr.value };
  const vStart = s?.verticalAlignment ?? "top";
  const valign = select6("valign", [
    ["top", tr12(lang, "Top", "Superior")],
    ["center", tr12(lang, "Center", "Centralizado")],
    ["both", tr12(lang, "Justified", "Justificado")],
    ["bottom", tr12(lang, "Bottom", "Inferior")]
  ], vStart);
  const lnInfo = s?.lineNumbering;
  let lnOpts = {
    on: !!lnInfo && lnInfo.mode !== "none",
    startAt: lnInfo?.startAt ?? 1,
    countBy: lnInfo?.countBy ?? 1,
    distanceTwips: lnInfo?.distanceTwips ?? 0,
    restart: lnInfo?.mode === "continuous" ? "continuous" : lnInfo?.mode === "section" ? "section" : "page"
  };
  let lnChanged = false;
  const lnBtn = el14("button", { type: "button", className: "uo-pill", textContent: tr12(lang, "Line Numbers\u2026", "N\xFAmeros de Linha\u2026") });
  lnBtn.addEventListener("click", () => {
    void lineNumbersDialog(env, lnOpts).then((r) => {
      if (r) {
        lnOpts = r;
        lnChanged = true;
      }
    });
  });
  const bordersBtn = el14("button", { type: "button", className: "uo-pill", textContent: tr12(lang, "Borders\u2026", "Bordas\u2026") });
  bordersBtn.addEventListener("click", () => {
    void tableDialog(env, "pageBorders");
  });
  const layoutTab = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el14("strong", {}, tr12(lang, "Section", "Se\xE7\xE3o")),
    el14("div", { className: "uo-dialog-grid" }, el14("span", {}, tr12(lang, "Section start:", "In\xEDcio da se\xE7\xE3o:")), sectStart),
    el14("strong", {}, tr12(lang, "Headers and footers", "Cabe\xE7alhos e rodap\xE9s")),
    oddEven,
    firstPage,
    el14(
      "div",
      { className: "uo-dialog-grid" },
      el14("span", {}, tr12(lang, "From edge: Header:", "Da borda: Cabe\xE7alho:")),
      withUnit(hdr),
      el14("span", {}, tr12(lang, "Footer:", "Rodap\xE9:")),
      withUnit(ftr)
    ),
    el14("strong", {}, tr12(lang, "Page", "P\xE1gina")),
    el14("div", { className: "uo-dialog-grid" }, el14("span", {}, tr12(lang, "Vertical alignment:", "Alinhamento vertical:")), valign),
    el14("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, lnBtn, bordersBtn)
  );
  for (const i of [hdr, ftr]) i.disabled = !hf;
  oddEven.querySelector("input").disabled = firstPage.querySelector("input").disabled = !hf;
  const tabs = dialogTabs([
    { id: "margins", label: tr12(lang, "Margins", "Margens"), body: marginsTab },
    { id: "paper", label: tr12(lang, "Paper", "Papel"), body: paperTab },
    { id: "layout", label: tr12(lang, "Layout", "Layout"), body: layoutTab }
  ], tab);
  const body = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    tabs.el,
    el14("div", { className: "uo-dialog-grid" }, el14("span", {}, tr12(lang, "Apply to", "Aplicar a")), applyTo)
  );
  const h = openDialog({
    title: L15.pageDlg,
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.apply, primary: true }]
  });
  if (await h.result !== "ok") return;
  const all = applyTo.value !== "section";
  const custom = margins.value === "custom" ? { top: parseUnit(mt.value, u), bottom: parseUnit(mb.value, u), left: parseUnit(ml.value, u), right: parseUnit(mr.value, u) } : null;
  const customOk = !!custom && Object.values(custom).every((v) => Number.isFinite(v) && v >= 0);
  ed.setPageSetup({
    ...all || orient.value !== start.orientation ? { orientation: orient.value } : {},
    ...all || size.value !== start.size ? { size: size.value } : {},
    ...customOk ? { customMargins: custom } : all || margins.value !== start.margins ? { margins: margins.value } : {},
    ...all || sectStart.value !== startType ? { sectionStart: sectStart.value } : {},
    ...all || valign.value !== vStart ? { verticalAlignment: valign.value } : {},
    ...all || lnChanged ? { lineNumbering: lnOpts } : {},
    applyTo: applyTo.value
  });
  if (hf) {
    const oe = oddEven.querySelector("input").checked, fp = firstPage.querySelector("input").checked;
    if (oe !== hf.differentOddEven) ed.setDifferentOddEven(oe);
    if (fp !== hf.differentFirstPage) ed.setDifferentFirstPage(fp);
    const hd = hdr.value !== hfStart.header ? parseUnit(hdr.value, u) : NaN, fd = ftr.value !== hfStart.footer ? parseUnit(ftr.value, u) : NaN;
    if (Number.isFinite(hd) || Number.isFinite(fd)) ed.setHeaderFooterDistance({ ...Number.isFinite(hd) ? { header: hd } : {}, ...Number.isFinite(fd) ? { footer: fd } : {} });
  }
}
async function columnsDialog(env) {
  const lang = env.lang, ed = env.ed;
  const s = ed.getSection();
  if (!s) return;
  const W = s.columns.contentWidthTwips;
  const unit = lang === "pt" ? { tw: 1440 / 2.54, name: "cm", step: "0.01" } : { tw: 1440, name: '"', step: "0.01" };
  const fmt2 = (tw) => String(Math.round(tw / unit.tw * 100) / 100);
  const parse = (v) => Math.round(parseFloat(v.replace(",", ".")) * unit.tw);
  const MIN = 720;
  const st = {
    count: s.columns.count,
    equal: s.columns.equalWidth,
    sep: s.columns.sep,
    widths: s.columns.widths.map((w) => ({ ...w })),
    space: s.columns.count > 1 ? s.columns.spaceTwips : 708
  };
  const equalize = () => {
    const n = st.count;
    if ((W - st.space * (n - 1)) / n < MIN) st.space = n > 1 ? Math.max(0, Math.floor((W - n * MIN) / (n - 1))) : st.space;
    const w = Math.round((W - st.space * (n - 1)) / n);
    st.widths = Array.from({ length: n }, (_, i) => ({ widthTwips: w, spaceTwips: i < n - 1 ? st.space : 0 }));
  };
  const presets = el14("div", { style: "display:flex;gap:8px;flex-wrap:wrap" });
  const PRESETS = [["one", "One", "Uma", 1], ["two", "Two", "Duas", 2], ["three", "Three", "Tr\xEAs", 3], ["left", "Left", "Esquerda", 2], ["right", "Right", "Direita", 2]];
  const presetBtns = PRESETS.map(([id, en, pt, n]) => {
    const b = el14("button", { type: "button", textContent: tr12(lang, en, pt), style: "min-width:72px;padding:6px 10px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit" });
    b.addEventListener("click", () => {
      st.count = n;
      if (id === "left" || id === "right") {
        const narrow = Math.round((W - 2 * st.space) / 3), wide = W - narrow - st.space;
        const ws = id === "left" ? [narrow, wide] : [wide, narrow];
        st.equal = false;
        st.widths = ws.map((w, i) => ({ widthTwips: w, spaceTwips: i === 0 ? st.space : 0 }));
      } else {
        st.equal = true;
        equalize();
      }
      render();
    });
    presets.append(b);
    return [id, b];
  });
  const count = el14("input", { type: "number", name: "count", min: "1", max: String(s.columns.max), step: "1", value: String(st.count), style: "width:72px" });
  const sep = check9("sep", tr12(lang, "Line between", "Linha entre colunas"), st.sep);
  const equal = check9("equal", tr12(lang, "Equal column width", "Colunas de mesma largura"), st.equal);
  const rows = el14("div", { style: "display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 10px;align-items:center" });
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, "section");
  const newCol = check9("newCol", tr12(lang, "Start new column", "Iniciar nova coluna"), false);
  const preview2 = el14("div", { style: "display:flex;height:84px;border:1px solid var(--uo-border, #c7c7c7);border-radius:6px;padding:8px;box-sizing:border-box;gap:0" });
  const box = (k) => (k === "sep" ? sep : k === "equal" ? equal : newCol).querySelector("input");
  function render() {
    count.value = String(st.count);
    box("equal").checked = st.equal;
    box("equal").disabled = st.count < 2;
    box("sep").disabled = st.count < 2;
    box("newCol").disabled = applyTo.value !== "forward";
    if (box("newCol").disabled) box("newCol").checked = false;
    for (const [id, b] of presetBtns) {
      const on = id === "one" ? st.count === 1 : id === "two" || id === "three" ? st.equal && st.count === (id === "two" ? 2 : 3) : !st.equal && st.count === 2 && Math.abs(st.widths[0].widthTwips - st.widths[1].widthTwips) > 40 && id === "left" === st.widths[0].widthTwips < st.widths[1].widthTwips;
      b.style.background = on ? "var(--uo-accent-soft, rgba(26,115,232,.14))" : "transparent";
      b.setAttribute("aria-pressed", String(on));
    }
    rows.replaceChildren(el14("strong", {}, "#"), el14("strong", {}, tr12(lang, "Width", "Largura")), el14("strong", {}, tr12(lang, "Spacing", "Espa\xE7amento")));
    st.widths.slice(0, Math.max(1, st.count)).forEach((c, i) => {
      const last = i === st.count - 1;
      const wIn = el14("input", { type: "number", step: unit.step, min: "0", value: fmt2(c.widthTwips), disabled: st.count < 2 || st.equal && i > 0, style: "width:96px" });
      const sIn = el14("input", { type: "number", step: unit.step, min: "0", value: last ? "" : fmt2(c.spaceTwips), disabled: last || st.count < 2 || st.equal && i > 0, style: "width:96px" });
      wIn.setAttribute("aria-label", `${tr12(lang, "Width", "Largura")} ${i + 1}`);
      sIn.setAttribute("aria-label", `${tr12(lang, "Spacing", "Espa\xE7amento")} ${i + 1}`);
      wIn.addEventListener("change", () => setWidth(i, parse(wIn.value)));
      sIn.addEventListener("change", () => setSpace(i, parse(sIn.value)));
      rows.append(el14("span", {}, `${i + 1}:`), el14("span", { style: "display:flex;gap:4px;align-items:center" }, wIn, unit.name), el14("span", { style: "display:flex;gap:4px;align-items:center" }, sIn, last ? "" : unit.name));
    });
    preview2.replaceChildren(...st.widths.slice(0, Math.max(1, st.count)).flatMap((c, i) => {
      const col = el14("div", { style: `flex:${c.widthTwips} 0 0;background:repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 7px);opacity:.45` });
      if (i === st.count - 1) return [col];
      const gap = el14("div", { style: `flex:${Math.max(1, c.spaceTwips)} 0 0;display:flex;justify-content:center` });
      if (box("sep").checked) gap.append(el14("div", { style: "width:1px;background:currentColor" }));
      return [col, gap];
    }));
  }
  function setWidth(i, w) {
    if (!(w > 0)) {
      render();
      return;
    }
    if (st.equal) {
      const n = st.count;
      const ww = Math.max(MIN, Math.min(w, Math.floor(W / n)));
      st.space = n > 1 ? Math.max(0, Math.floor((W - n * ww) / (n - 1))) : 0;
      st.widths = st.widths.map((c, k) => ({ widthTwips: ww, spaceTwips: k < n - 1 ? st.space : 0 }));
    } else {
      const j = i < st.count - 1 ? i + 1 : i - 1;
      const total = st.widths[i].widthTwips + st.widths[j].widthTwips;
      const ww = Math.max(MIN, Math.min(w, total - MIN));
      st.widths[i].widthTwips = ww;
      st.widths[j].widthTwips = total - ww;
    }
    render();
  }
  function setSpace(i, sp) {
    if (!(sp >= 0)) {
      render();
      return;
    }
    if (st.equal) {
      const n = st.count;
      st.space = Math.min(sp, Math.floor((W - n * MIN) / Math.max(1, n - 1)));
      equalize();
    } else {
      const j = i + 1;
      const total = st.widths[i].spaceTwips + st.widths[j].widthTwips;
      const ss = Math.max(0, Math.min(sp, total - MIN));
      st.widths[i].spaceTwips = ss;
      st.widths[j].widthTwips = total - ss;
    }
    render();
  }
  count.addEventListener("change", () => {
    const n = Math.max(1, Math.min(s.columns.max, Math.round(Number(count.value) || 1)));
    st.count = n;
    if (n < 2) st.equal = true;
    if (st.equal || st.widths.length !== n) {
      st.equal = true;
      equalize();
    }
    render();
  });
  box("equal").addEventListener("change", () => {
    st.equal = box("equal").checked;
    if (st.equal) {
      st.space = st.widths[0]?.spaceTwips || st.space;
      equalize();
    }
    render();
  });
  box("sep").addEventListener("change", () => {
    st.sep = box("sep").checked;
    render();
  });
  applyTo.addEventListener("change", render);
  if (st.count < 2) {
    st.count = 1;
    equalize();
  }
  render();
  const body = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    el14("strong", {}, tr12(lang, "Presets", "Predefini\xE7\xF5es")),
    presets,
    el14(
      "div",
      { style: "display:flex;gap:16px;align-items:center;flex-wrap:wrap" },
      el14("label", { style: "display:flex;gap:8px;align-items:center" }, tr12(lang, "Number of columns", "N\xFAmero de colunas"), count),
      sep
    ),
    el14("strong", {}, tr12(lang, "Width and spacing", "Largura e espa\xE7amento")),
    rows,
    equal,
    el14("div", { className: "uo-dialog-grid" }, el14("span", {}, tr12(lang, "Apply to", "Aplicar a")), applyTo),
    newCol,
    el14("strong", {}, tr12(lang, "Preview", "Visualiza\xE7\xE3o")),
    preview2
  );
  const h = openDialog({
    title: tr12(lang, "Columns", "Colunas"),
    icon: "view_column_2",
    body,
    layer: env.layer,
    lang,
    width: 460,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: env.app.ui.L.apply, primary: true }]
  });
  if (await h.result !== "ok") return;
  ed.setColumns({
    count: st.count,
    spaceTwips: st.space,
    ...st.equal || st.count < 2 ? {} : { widths: st.widths.slice(0, st.count) },
    sep: st.sep,
    applyTo: applyTo.value,
    startNewColumn: box("newCol").checked
  });
}
function wordCountDialog(env) {
  const L15 = env.app.ui.L;
  const s = env.ed.stats();
  const fmt2 = (n) => n.toLocaleString(tr12(env.lang, "en-US", "pt-BR"));
  const grid2 = el14(
    "div",
    { className: "uo-dialog-grid" },
    el14("span", {}, L15.pages),
    el14("strong", {}, fmt2(s.pages)),
    el14("span", {}, L15.words),
    el14("strong", {}, fmt2(s.words)),
    el14("span", {}, L15.chars),
    el14("strong", {}, fmt2(s.chars))
  );
  openDialog({ title: L15.wordCountTitle, body: grid2, layer: env.layer, lang: env.lang, width: 320 });
}
var SHORTCUTS = [
  ["Ctrl+O", "Open", "Abrir"],
  ["Ctrl+S", "Save", "Salvar"],
  ["Ctrl+Shift+S", "Save as", "Salvar como"],
  ["Ctrl+P", "Print", "Imprimir"],
  ["Ctrl+Z / Ctrl+Y", "Undo / Redo", "Desfazer / Refazer"],
  ["Ctrl+X / C / V", "Cut / Copy / Paste", "Recortar / Copiar / Colar"],
  ["Ctrl+Shift+V", "Paste without formatting", "Colar sem formata\xE7\xE3o"],
  ["Ctrl+F / Ctrl+H", "Find / Replace", "Localizar / Substituir"],
  ["Ctrl+B / I / U", "Bold / Italic / Underline", "Negrito / It\xE1lico / Sublinhado"],
  ["Ctrl+L / E / R / J", "Align left / center / right / justify", "Alinhar \xE0 esquerda / centralizar / \xE0 direita / justificar"],
  ["Ctrl+] / Ctrl+[", "Increase / decrease font size", "Aumentar / diminuir fonte"],
  ["Ctrl+K", "Insert link", "Inserir link"],
  ["Ctrl+Alt+M", "New comment", "Novo coment\xE1rio"],
  ["Ctrl+Enter", "Page break", "Quebra de p\xE1gina"],
  ["Ctrl+Shift+Enter", "Column break", "Quebra de coluna"],
  ["Ctrl+D", "Font dialog", "Di\xE1logo Fonte"],
  ["Ctrl+Shift+8", "Formatting marks", "Marcas de formata\xE7\xE3o"],
  ["Ctrl+scroll", "Zoom", "Zoom"]
];
function shortcutsDialog(env) {
  const grid2 = el14("div", { className: "uo-dialog-grid" });
  grid2.style.gridTemplateColumns = "auto 1fr";
  for (const [k, en, pt] of SHORTCUTS) {
    grid2.append(el14("kbd", { style: "font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap" }, k), el14("span", {}, tr12(env.lang, en, pt)));
  }
  openDialog({ title: env.app.ui.L.shortcutsTitle, body: grid2, layer: env.layer, lang: env.lang, width: 520 });
}
function aboutDialog(env) {
  const L15 = env.app.ui.L;
  openDialog({ title: L15.aboutTitle, icon: "info", body: L15.aboutText, layer: env.layer, lang: env.lang, width: 400 });
}
async function spellingDialog(env) {
  const lang = env.lang, ed = env.ed;
  const done = tr12(lang, "The spelling check is complete.", "A verifica\xE7\xE3o ortogr\xE1fica foi conclu\xEDda.");
  const skip = /* @__PURE__ */ new Set();
  const always = /* @__PURE__ */ new Map();
  let cur = await ed.nextMisspelling(skip);
  if (!cur) {
    env.app.ui.flash(done);
    return;
  }
  const word = el14("div", { style: "font-size:18px;font-weight:600;color:#e81123;margin-bottom:2px" });
  const info = el14("div", { style: "opacity:.7;font-size:12px;margin-bottom:10px" });
  const list = el14("select", { size: 6, style: "width:100%;box-sizing:border-box;height:auto;min-height:132px;padding:4px" });
  const show = async (m) => {
    word.textContent = m.word;
    info.textContent = tr12(lang, `Not in dictionary (${m.lang})`, `N\xE3o consta no dicion\xE1rio (${m.lang})`);
    const sug = await ed.spellingSuggestions(m, 8);
    list.replaceChildren(...sug.length ? sug.map((x) => el14("option", { value: x, textContent: x })) : [el14("option", { value: "", disabled: true, textContent: tr12(lang, "(no suggestions)", "(sem sugest\xF5es)") })]);
    list.selectedIndex = sug.length ? 0 : -1;
  };
  await show(cur);
  const body = el14("div", {}, word, info, el14("div", { style: "font-size:12px;margin-bottom:4px" }, tr12(lang, "Suggestions", "Sugest\xF5es")), list);
  const next = async () => {
    cur = await ed.nextMisspelling(skip);
    while (cur && always.has(cur.word)) {
      if (!ed.replaceSpelling(cur, always.get(cur.word))) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      cur = await ed.nextMisspelling(skip);
    }
    if (!cur) {
      h.close();
      env.app.ui.flash(done);
      return;
    }
    await show(cur);
  };
  let busy = false;
  const step = async (id) => {
    if (!cur || busy) return;
    busy = true;
    try {
      const choice = list.value;
      if (id === "ignore") skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      else if (id === "ignoreAll") ed.ignoreSpelling(cur.word);
      else if (id === "add") await ed.addToDictionary(cur.word);
      else if (id === "change" || id === "changeAll") {
        if (!choice) return;
        if (id === "changeAll") always.set(cur.word, choice);
        if (!ed.replaceSpelling(cur, choice)) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      }
      await next();
    } finally {
      busy = false;
    }
  };
  list.addEventListener("dblclick", () => {
    void step("change");
  });
  const h = openDialog({
    title: tr12(lang, "Spelling", "Ortografia"),
    icon: "spellcheck",
    body,
    layer: env.layer,
    lang,
    width: 400,
    modal: false,
    actions: [
      { id: "ignore", label: { en: "Ignore Once", pt: "Ignorar uma vez" } },
      { id: "ignoreAll", label: { en: "Ignore All", pt: "Ignorar tudo" } },
      { id: "add", label: { en: "Add to Dictionary", pt: "Adicionar ao dicion\xE1rio" } },
      { id: "changeAll", label: { en: "Change All", pt: "Alterar todas" } },
      { id: "change", label: { en: "Change", pt: "Alterar" }, primary: true }
    ],
    onAction: (id) => {
      void step(id);
      return false;
    }
  });
  await h.result;
}
var radio4 = (name, value, label, on) => el14("label", { className: "uo-check" }, el14("input", { type: "radio", name, value, checked: on }), label);
async function notesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T4 = (en, pt) => tr12(lang, en, pt);
  let kind = ed.editingNote()?.kind ?? "footnote";
  const st = { footnote: ed.getNoteOptions("footnote"), endnote: ed.getNoteOptions("endnote") };
  const fnRadio = radio4("kind", "footnote", T4("Footnotes:", "Notas de rodap\xE9:"), kind === "footnote");
  const enRadio = radio4("kind", "endnote", T4("Endnotes:", "Notas de fim:"), kind === "endnote");
  const fnPos = select6("fnPos", [["pageBottom", T4("Bottom of page", "Fim da p\xE1gina")], ["beneathText", T4("Below text", "Abaixo do texto")]], st.footnote.position);
  const enPos = select6("enPos", [["docEnd", T4("End of document", "Fim do documento")], ["sectEnd", T4("End of section", "Fim da se\xE7\xE3o")]], st.endnote.position);
  const convert = el14("button", { type: "button", className: "uo-pill", textContent: T4("Convert\u2026", "Converter\u2026") });
  const columns = select6("columns", [["0", T4("Match section layout", "Coincidir layout de se\xE7\xE3o")], ["1", T4("1 column", "1 coluna")], ["2", T4("2 columns", "2 colunas")], ["3", T4("3 columns", "3 colunas")], ["4", T4("4 columns", "4 colunas")]], String(st.footnote.columns ?? 0));
  const format = select6("format", [
    ["decimal", "1, 2, 3, \u2026"],
    ["lowerLetter", "a, b, c, \u2026"],
    ["upperLetter", "A, B, C, \u2026"],
    ["lowerRoman", "i, ii, iii, \u2026"],
    ["upperRoman", "I, II, III, \u2026"],
    ["chicago", "*, \u2020, \u2021, \xA7, \u2026"]
  ], st[kind].numberFormat);
  const mark = el14("input", { type: "text", name: "mark", maxLength: 10, style: "width:72px" });
  mark.setAttribute("aria-label", T4("Custom mark", "Marca personalizada"));
  const symbols = el14("div", { style: "display:flex;gap:4px;flex-wrap:wrap" });
  for (const ch of ["*", "\u2020", "\u2021", "\xA7", "\xB6", "\u2016", "#", "\u203B", "\xB9", "\xB2", "\xB3"]) {
    const b = el14("button", { type: "button", className: "uo-btn", textContent: ch, title: ch, style: "min-width:28px;font:inherit" });
    b.addEventListener("click", () => {
      mark.value += ch;
      mark.focus();
    });
    symbols.append(b);
  }
  const startAt = el14("input", { type: "number", name: "startAt", min: "1", step: "1", value: String(st[kind].startAt), style: "width:72px" });
  const restart = select6("restart", [["continuous", T4("Continuous", "Cont\xEDnua")], ["eachSect", T4("Restart each section", "Reiniciar a cada se\xE7\xE3o")], ["eachPage", T4("Restart each page", "Reiniciar a cada p\xE1gina")]], st[kind].restart);
  const scope = select6("scope", [["document", T4("Whole document", "Todo o documento")], ["section", T4("This section", "Esta se\xE7\xE3o")]], "document");
  const show = () => {
    format.value = st[kind].numberFormat;
    startAt.value = String(st[kind].startAt);
    restart.value = st[kind].restart;
    restart.querySelector('option[value="eachPage"]').disabled = kind === "endnote";
    columns.disabled = kind !== "footnote";
    fnPos.disabled = kind !== "footnote";
    enPos.disabled = kind !== "endnote";
    startAt.disabled = restart.value !== "continuous";
  };
  const keep = () => {
    const o = st[kind];
    o.numberFormat = format.value;
    o.restart = restart.value;
    o.startAt = o.restart === "continuous" ? Math.max(1, Math.round(Number(startAt.value) || 1)) : 1;
    st.footnote.position = fnPos.value;
    st.footnote.columns = Number(columns.value);
    st.endnote.position = enPos.value;
  };
  for (const r of [fnRadio, enRadio]) r.querySelector("input").addEventListener("change", (e) => {
    keep();
    kind = e.target.value;
    show();
  });
  restart.addEventListener("change", () => {
    if (restart.value !== "continuous") startAt.value = "1";
    startAt.disabled = restart.value !== "continuous";
  });
  show();
  const grid2 = (...rows) => el14("div", { className: "uo-dialog-grid" }, ...rows.flatMap(([label, ...kids]) => [el14("span", {}, label), el14("span", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, ...kids)]));
  const body = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    el14("strong", {}, T4("Location", "Local")),
    el14("div", { className: "uo-dialog-grid" }, fnRadio, fnPos, enRadio, enPos),
    el14("div", {}, convert),
    el14("strong", {}, T4("Footnote layout", "Layout de nota de rodap\xE9")),
    grid2([T4("Columns:", "Colunas:"), columns]),
    el14("strong", {}, T4("Format", "Formato")),
    grid2([T4("Number format:", "Formato do n\xFAmero:"), format], [T4("Custom mark:", "Marca personalizada:"), mark], [T4("Symbol:", "S\xEDmbolo:"), symbols], [T4("Start at:", "Iniciar em:"), startAt], [T4("Numbering:", "Numera\xE7\xE3o:"), restart]),
    el14("strong", {}, T4("Apply changes", "Aplicar altera\xE7\xF5es")),
    grid2([T4("Apply changes to:", "Aplicar altera\xE7\xF5es a:"), scope])
  );
  convert.addEventListener("click", () => {
    void convertNotesDialog(env);
  });
  const canInsert = ed.canInsertNote();
  const h = openDialog({
    title: T4("Footnote and Endnote", "Notas de Rodap\xE9 e de Fim"),
    icon: "notes",
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [
      ...canInsert ? [{ id: "insert", label: T4("Insert", "Inserir"), primary: true }] : [],
      { id: "cancel", label: env.app.ui.L.cancel },
      { id: "apply", label: env.app.ui.L.apply, primary: !canInsert }
    ]
  });
  const res = await h.result;
  if (res !== "insert" && res !== "apply") return;
  keep();
  const sc = scope.value;
  ed.setNoteOptions("footnote", st.footnote, sc);
  ed.setNoteOptions("endnote", st.endnote, sc);
  if (res === "insert") {
    const m = mark.value.trim();
    if (kind === "footnote") ed.insertFootnote(m ? { mark: m } : {});
    else ed.insertEndnote(m ? { mark: m } : {});
  }
}
async function convertNotesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T4 = (en, pt) => tr12(lang, en, pt);
  const nf = ed.noteCount("footnote"), ne = ed.noteCount("endnote");
  const opts = [
    ["toEndnotes", T4("Convert all footnotes to endnotes", "Converter todas as notas de rodap\xE9 em notas de fim"), nf > 0],
    ["toFootnotes", T4("Convert all endnotes to footnotes", "Converter todas as notas de fim em notas de rodap\xE9"), ne > 0],
    ["swap", T4("Swap footnotes and endnotes", "Trocar notas de rodap\xE9 e notas de fim"), nf > 0 && ne > 0]
  ];
  const first = opts.find((o) => o[2])?.[0];
  const body = el14("div", { style: "display:flex;flex-direction:column;gap:8px" }, ...opts.map(([v2, label, on]) => {
    const r = radio4("convert", v2, label, v2 === first);
    r.querySelector("input").disabled = !on;
    return r;
  }));
  const h = openDialog({
    title: T4("Convert Notes", "Converter Notas"),
    icon: "autorenew",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok" || !first) return;
  const v = body.querySelector('input[name="convert"]:checked')?.value;
  if (v) ed.convertNotes(v);
}
async function showNotesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T4 = (en, pt) => tr12(lang, en, pt);
  if (ed.editingNote() || !ed.noteCount("footnote") || !ed.noteCount("endnote")) {
    ed.showNotes();
    return;
  }
  const body = el14(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px" },
    el14("span", {}, T4("This document contains both footnotes and endnotes. Which do you want to view?", "Este documento cont\xE9m notas de rodap\xE9 e notas de fim. Qual \xE1rea voc\xEA deseja exibir?")),
    radio4("area", "footnote", T4("View footnote area", "Exibir \xE1rea de notas de rodap\xE9"), true),
    radio4("area", "endnote", T4("View endnote area", "Exibir \xE1rea de notas de fim"), false)
  );
  const h = openDialog({
    title: T4("Show Notes", "Mostrar Notas"),
    icon: "notes",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const v = body.querySelector('input[name="area"]:checked')?.value;
  ed.showNotes(v ?? "footnote");
}

// src/chrome-nav.ts
var LABELS = {
  en: {
    title: "Navigation",
    search: "Search document",
    options: "Search options",
    headings: "Headings",
    pages: "Pages",
    results: "Results",
    matchCase: "Match case",
    wholeWord: "Find whole words only",
    highlight: "Highlight all",
    incremental: "Incremental find",
    replace: "Replace\u2026",
    clear: "Clear search",
    result: (i, n) => `Result ${i} of ${n}`,
    results0: "No results",
    resultsN: (n) => `${n} results`,
    prev: "Previous result",
    next: "Next result",
    noHeadings: "Apply Heading styles to the titles in your document so they show up here.",
    noPages: "Thumbnails are available in Print Layout.",
    noSearch: "Type in the search box to find text in the document.",
    noMatch: "We couldn\u2019t find what you were looking for.",
    promote: "Promote",
    demote: "Demote",
    newBefore: "New Heading Before",
    newAfter: "New Heading After",
    newSub: "New Subheading",
    del: "Delete",
    select: "Select Heading and Content",
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    showLevels: "Show Heading Levels",
    all: "All",
    level: (n) => `Show Heading ${n}`,
    page: (n) => `Page ${n}`,
    collapse: "Collapse",
    expand: "Expand"
  },
  pt: {
    title: "Navega\xE7\xE3o",
    search: "Pesquisar documento",
    options: "Op\xE7\xF5es de pesquisa",
    headings: "T\xEDtulos",
    pages: "P\xE1ginas",
    results: "Resultados",
    matchCase: "Diferenciar mai\xFAsculas e min\xFAsculas",
    wholeWord: "Localizar apenas palavras inteiras",
    highlight: "Real\xE7ar tudo",
    incremental: "Pesquisa incremental",
    replace: "Substituir\u2026",
    clear: "Limpar pesquisa",
    result: (i, n) => `Resultado ${i} de ${n}`,
    results0: "Nenhum resultado",
    resultsN: (n) => `${n} resultados`,
    prev: "Resultado anterior",
    next: "Pr\xF3ximo resultado",
    noHeadings: "Aplique estilos de T\xEDtulo aos t\xEDtulos do documento para que apare\xE7am aqui.",
    noPages: "As miniaturas aparecem no Layout de Impress\xE3o.",
    noSearch: "Digite na caixa de pesquisa para localizar texto no documento.",
    noMatch: "N\xE3o encontramos o que voc\xEA procurava.",
    promote: "Promover",
    demote: "Rebaixar",
    newBefore: "Novo T\xEDtulo Antes",
    newAfter: "Novo T\xEDtulo Depois",
    newSub: "Novo Subt\xEDtulo",
    del: "Excluir",
    select: "Selecionar T\xEDtulo e Conte\xFAdo",
    expandAll: "Expandir Tudo",
    collapseAll: "Recolher Tudo",
    showLevels: "Mostrar N\xEDveis de T\xEDtulo",
    all: "Todos",
    level: (n) => `Mostrar T\xEDtulo ${n}`,
    page: (n) => `P\xE1gina ${n}`,
    collapse: "Recolher",
    expand: "Expandir"
  }
};
var el15 = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
var NavPane = class {
  constructor(env) {
    this.env = env;
    this.L = pickLabels(env.lang, LABELS);
  }
  env;
  pane = null;
  L;
  tab = "headings";
  input;
  status;
  bodyEl;
  tabs = /* @__PURE__ */ new Map();
  heads = [];
  results = [];
  current = -1;
  query = "";
  opts = { matchCase: false, wholeWord: false, highlight: true, incremental: true };
  /** títulos recolhidos (nível + texto + ocorrência) */
  collapsed = /* @__PURE__ */ new Set();
  maxLevel = 9;
  raf = 0;
  searchTimer = 0;
  thumbs = /* @__PURE__ */ new Map();
  io = null;
  dirtyThumbs = true;
  dragFrom = -1;
  /** assinatura da árvore desenhada (redesenha só quando muda) */
  treeSig = "";
  get isOpen() {
    return !!this.pane;
  }
  open(focusSearch = false) {
    if (!this.pane) this.build();
    this.pane.place();
    this.refresh();
    if (focusSearch) {
      const sel4 = this.env.ed.selectedText();
      if (sel4 && !sel4.includes("\n") && sel4.length < 200) {
        this.input.value = sel4;
        this.runSearch(true);
      }
      this.input.focus();
      this.input.select();
    }
  }
  close() {
    this.pane?.close();
  }
  /** Desmonta sem mexer na preferência (troca de barra, desmontagem). */
  detach() {
    const p = this.pane;
    this.pane = null;
    this.io?.disconnect();
    this.io = null;
    this.thumbs.clear();
    p?.close();
    this.env.ed.classList.remove("uw-nav-open");
  }
  toggle() {
    if (this.pane) this.close();
    else this.open();
  }
  place() {
    this.pane?.place();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.searchTimer);
    this.detach();
  }
  /** O documento mudou (edição, seleção, zoom): redesenha no próximo quadro. */
  schedule(docChanged = false) {
    if (!this.pane) return;
    if (docChanged) {
      this.dirtyThumbs = true;
      if (this.query) {
        clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => this.runSearch(false), 300);
      }
    }
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.refresh();
    });
  }
  build() {
    const L15 = this.L;
    const body = el15("div", "uw-nav");
    const box = el15("div", "uw-nav-search");
    const ic = el15("span", "uw-nav-search-ic");
    ic.innerHTML = symbol("search");
    this.input = el15("input", "uw-nav-input");
    this.input.type = "search";
    this.input.placeholder = L15.search;
    this.input.setAttribute("aria-label", L15.search);
    this.input.dataset["a"] = "nav:search";
    const optBtn = el15("button", "uo-btn uw-nav-opt");
    optBtn.type = "button";
    optBtn.title = L15.options;
    optBtn.setAttribute("aria-label", L15.options);
    optBtn.dataset["a"] = "nav:options";
    optBtn.innerHTML = symbol("arrow_drop_down");
    optBtn.addEventListener("click", () => this.optionsMenu(optBtn));
    box.append(ic, this.input, optBtn);
    this.input.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      if (this.opts.incremental || !this.input.value) this.searchTimer = window.setTimeout(() => this.runSearch(true), this.input.value ? 250 : 0);
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (this.input.value !== this.query) this.runSearch(true);
        else this.step(e.shiftKey ? -1 : 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (this.input.value) {
          this.input.value = "";
          this.runSearch(true);
        } else this.env.ed.focusEditor();
      }
    });
    const st = el15("div", "uw-nav-status");
    this.status = el15("span", "uw-nav-count");
    const prev = el15("button", "uo-btn uw-nav-step");
    prev.type = "button";
    prev.title = L15.prev;
    prev.setAttribute("aria-label", L15.prev);
    prev.innerHTML = symbol("keyboard_arrow_up");
    prev.dataset["a"] = "nav:prev";
    prev.addEventListener("click", () => this.step(-1));
    const next = el15("button", "uo-btn uw-nav-step");
    next.type = "button";
    next.title = L15.next;
    next.setAttribute("aria-label", L15.next);
    next.innerHTML = symbol("keyboard_arrow_down");
    next.dataset["a"] = "nav:next";
    next.addEventListener("click", () => this.step(1));
    st.append(this.status, prev, next);
    const tabs = el15("div", "uw-nav-tabs");
    tabs.setAttribute("role", "tablist");
    for (const t2 of ["headings", "pages", "results"]) {
      const b = el15("button", "uw-nav-tab", L15[t2]);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset["a"] = `nav:tab:${t2}`;
      b.addEventListener("click", () => {
        this.tab = t2;
        this.refresh();
      });
      this.tabs.set(t2, b);
      tabs.appendChild(b);
    }
    this.bodyEl = el15("div", "uw-nav-body");
    body.append(box, st, tabs, this.bodyEl);
    const pane = openPane({
      id: "navigation",
      title: L15.title,
      lang: this.env.lang,
      layer: this.env.layer,
      frame: this.env.frame,
      dock: "left",
      width: 300,
      body,
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.io?.disconnect();
        this.io = null;
        this.thumbs.clear();
        this.env.ed.classList.remove("uw-nav-open");
        this.env.ed.clearSearch();
        this.results = [];
        this.query = "";
        this.env.app.prefs.set("navPane", "");
        this.env.after();
      }
    });
    pane.el.setAttribute("part", "pane navigation-pane");
    this.pane = pane;
    this.env.ed.classList.add("uw-nav-open");
    this.env.app.prefs.set("navPane", "1");
  }
  optionsMenu(anchor) {
    const L15 = this.L;
    const flag = (k, label) => ({
      id: `nav:${k}`,
      label,
      checked: this.opts[k],
      onClick: () => {
        this.opts[k] = !this.opts[k];
        if (k !== "incremental") this.runSearch(false);
      }
    });
    openMenu([
      flag("matchCase", L15.matchCase),
      flag("wholeWord", L15.wholeWord),
      flag("highlight", L15.highlight),
      flag("incremental", L15.incremental),
      { sep: true },
      { id: "nav:replace", label: L15.replace, icon: "find_replace", onClick: () => this.env.replace(), disabled: this.env.ed.isProtected() },
      { id: "nav:clear", label: L15.clear, icon: "close", onClick: () => {
        this.input.value = "";
        this.runSearch(true);
      }, disabled: !this.query }
    ], { anchor, side: "below" }, { layer: this.env.layer, lang: this.env.lang });
  }
  runSearch(showResults) {
    const q = this.input.value;
    this.query = q;
    this.results = q ? this.env.ed.search(q, { matchCase: this.opts.matchCase, wholeWord: this.opts.wholeWord, highlight: this.opts.highlight }) : (this.env.ed.clearSearch(), []);
    this.current = -1;
    if (q && showResults && this.tab === "headings" && !this.heads.length) this.tab = "results";
    this.refresh();
  }
  step(dir) {
    const n = this.results.length;
    if (!n) return;
    this.current = this.current < 0 ? dir > 0 ? 0 : n - 1 : (this.current + dir + n) % n;
    this.env.ed.goToSearchResult(this.current);
    this.refresh();
    this.input.focus();
  }
  refresh() {
    if (!this.pane) return;
    const L15 = this.L;
    const ed = this.env.ed;
    this.pane.place();
    this.heads = ed.getHeadings();
    for (const [t2, b] of this.tabs) {
      b.classList.toggle("uo-on", t2 === this.tab);
      b.setAttribute("aria-selected", String(t2 === this.tab));
    }
    const n = this.results.length;
    this.status.parentElement.hidden = !this.query;
    this.status.textContent = !this.query ? "" : !n ? L15.results0 : this.current >= 0 ? L15.result(this.current + 1, n) : L15.resultsN(n);
    for (const b of this.status.parentElement.querySelectorAll("button")) b.disabled = !n;
    if (this.tab === "headings") this.renderHeadings();
    else if (this.tab === "pages") this.renderPages();
    else this.renderResults();
  }
  // ───── Títulos ─────
  keyOf(h) {
    let k = 0;
    for (const x of this.heads) {
      if (x.index >= h.index) break;
      if (x.level === h.level && x.text === h.text) k++;
    }
    return `${h.level}|${h.text}|${k}`;
  }
  tree() {
    const roots = [];
    const stack = [];
    for (const h of this.heads) {
      const node = { h, kids: [] };
      while (stack.length && stack[stack.length - 1].h.level >= h.level) stack.pop();
      if (stack.length) stack[stack.length - 1].kids.push(node);
      else roots.push(node);
      stack.push(node);
    }
    return roots;
  }
  renderHeadings() {
    const L15 = this.L;
    const ed = this.env.ed;
    const list = el15("div", "uw-nav-tree");
    list.setAttribute("role", "tree");
    if (!this.heads.length) {
      this.treeSig = "";
      this.bodyEl.replaceChildren(el15("p", "uw-nav-empty", L15.noHeadings));
      return;
    }
    const cur = ed.currentHeading(this.heads);
    const hit = new Set(this.results.map((r) => r.heading));
    const editable = !ed.isProtected();
    const sig = [this.heads.map((h) => `${h.level}|${h.text}`).join("\n"), [...this.collapsed].join("\n"), this.maxLevel, [...hit].join(","), editable].join("");
    const old = this.bodyEl.querySelector(".uw-nav-tree");
    if (old && this.treeSig === sig) {
      for (const r of old.querySelectorAll(".uw-nav-row")) r.classList.toggle("uo-on", +r.dataset["index"] === cur);
      old.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
      return;
    }
    this.treeSig = sig;
    const row3 = (node, depth) => {
      const h = node.h;
      if (h.level > this.maxLevel) return;
      const kids = node.kids.filter((k) => k.h.level <= this.maxLevel);
      const key = this.keyOf(h);
      const closed = this.collapsed.has(key);
      const r = el15("div", "uw-nav-row");
      r.setAttribute("role", "treeitem");
      r.dataset["index"] = String(h.index);
      r.style.paddingLeft = `${4 + depth * 14}px`;
      r.classList.toggle("uo-on", h.index === cur);
      r.classList.toggle("uw-nav-hit", hit.has(h.index));
      if (kids.length) r.setAttribute("aria-expanded", String(!closed));
      const tw = el15("button", "uw-nav-twisty");
      tw.type = "button";
      tw.tabIndex = -1;
      if (kids.length) {
        tw.innerHTML = symbol(closed ? "chevron_right" : "expand_more");
        tw.title = closed ? L15.expand : L15.collapse;
        tw.addEventListener("click", (e) => {
          e.stopPropagation();
          if (closed) this.collapsed.delete(key);
          else this.collapsed.add(key);
          this.refresh();
        });
      } else tw.classList.add("uw-nav-leaf");
      const label = el15("span", "uw-nav-label", h.text);
      label.title = h.text;
      r.append(tw, label);
      r.addEventListener("click", () => {
        ed.goToHeading(h.index);
        this.refresh();
      });
      r.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.headingMenu(h, e.clientX, e.clientY);
      });
      if (editable) {
        r.draggable = true;
        r.addEventListener("dragstart", (e) => {
          this.dragFrom = h.index;
          e.dataTransfer?.setData("text/plain", h.text);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
          r.classList.add("uw-nav-dragging");
        });
        r.addEventListener("dragend", () => {
          this.dragFrom = -1;
          r.classList.remove("uw-nav-dragging");
          this.clearDrop();
        });
      }
      list.appendChild(r);
      if (!closed) for (const k of kids) row3(k, depth + 1);
    };
    for (const n of this.tree()) row3(n, 0);
    list.addEventListener("dragover", (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      this.markDrop(list, e.clientY);
    });
    list.addEventListener("dragleave", (e) => {
      if (!list.contains(e.relatedTarget)) this.clearDrop();
    });
    list.addEventListener("drop", (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      const before = this.dropTarget(list, e.clientY);
      const from = this.dragFrom;
      this.dragFrom = -1;
      this.clearDrop();
      if (ed.moveHeading(from, before)) this.env.after();
      this.refresh();
    });
    this.bodyEl.replaceChildren(list);
    list.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
  }
  /** Título antes do qual a seção arrastada entra (heads.length = fim). */
  dropTarget(list, y) {
    const rows = [...list.querySelectorAll(".uw-nav-row")];
    for (const r of rows) {
      const b = r.getBoundingClientRect();
      if (y < b.top + b.height / 2) return +r.dataset["index"];
    }
    const last = rows[rows.length - 1];
    if (!last) return this.heads.length;
    const li = +last.dataset["index"];
    const lh = this.heads[li];
    const nxt = this.heads.find((h) => h.index > li && h.level <= lh.level);
    return nxt ? nxt.index : this.heads.length;
  }
  markDrop(list, y) {
    this.clearDrop();
    const before = this.dropTarget(list, y);
    const r = list.querySelector(`.uw-nav-row[data-index="${before}"]`);
    if (r) r.classList.add("uw-nav-drop-before");
    else list.classList.add("uw-nav-drop-end");
  }
  clearDrop() {
    for (const r of this.bodyEl.querySelectorAll(".uw-nav-drop-before")) r.classList.remove("uw-nav-drop-before");
    this.bodyEl.querySelector(".uw-nav-tree")?.classList.remove("uw-nav-drop-end");
  }
  headingMenu(h, x, y) {
    const L15 = this.L;
    const ed = this.env.ed;
    const ro = ed.isProtected();
    const done = (ok) => {
      if (ok !== false) this.env.after();
      this.refresh();
    };
    const levels = () => [
      { id: "nav:levels:all", label: L15.all, checked: this.maxLevel === 9, onClick: () => {
        this.maxLevel = 9;
        this.refresh();
      } },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `nav:levels:${n}`, label: L15.level(n), checked: this.maxLevel === n, onClick: () => {
        this.maxLevel = n;
        this.refresh();
      } }))
    ];
    openMenu([
      { id: "nav:promote", label: L15.promote, icon: "arrow_back", disabled: ro || h.level <= 1, onClick: () => done(ed.promoteHeading(h.index)) },
      { id: "nav:demote", label: L15.demote, icon: "arrow_forward", disabled: ro || h.level >= 9, onClick: () => done(ed.demoteHeading(h.index)) },
      { sep: true },
      { id: "nav:newBefore", label: L15.newBefore, disabled: ro, onClick: () => done(ed.insertHeading(h.index, "before")) },
      { id: "nav:newAfter", label: L15.newAfter, disabled: ro, onClick: () => done(ed.insertHeading(h.index, "after")) },
      { id: "nav:newSub", label: L15.newSub, disabled: ro || h.level >= 9, onClick: () => done(ed.insertHeading(h.index, "sub")) },
      { id: "nav:delete", label: L15.del, icon: "delete", disabled: ro, onClick: () => done(ed.deleteHeading(h.index)) },
      { sep: true },
      { id: "nav:select", label: L15.select, icon: "select_all", onClick: () => {
        ed.selectHeading(h.index);
        this.env.after();
      } },
      { sep: true },
      { id: "nav:expandAll", label: L15.expandAll, icon: "unfold_more", onClick: () => {
        this.collapsed.clear();
        this.refresh();
      } },
      { id: "nav:collapseAll", label: L15.collapseAll, icon: "unfold_less", onClick: () => {
        for (const x2 of this.heads) this.collapsed.add(this.keyOf(x2));
        this.refresh();
      } },
      { id: "nav:levels", label: L15.showLevels, submenu: levels }
    ], { x, y }, { layer: this.env.layer, lang: this.env.lang });
  }
  // ───── Páginas ─────
  renderPages() {
    const L15 = this.L;
    const ed = this.env.ed;
    const total = ed.layoutPageCount();
    if (!total) {
      this.bodyEl.replaceChildren(el15("p", "uw-nav-empty", L15.noPages));
      return;
    }
    const only = this.query ? new Set(this.results.map((r) => r.page).filter((p) => p >= 0)) : null;
    if (only && !only.size) {
      this.bodyEl.replaceChildren(el15("p", "uw-nav-empty", L15.noMatch));
      return;
    }
    const cur = ed.currentPage() - 1;
    let grid2 = this.bodyEl.querySelector(".uw-nav-pages");
    const want = [...Array(total).keys()].filter((i) => !only || only.has(i));
    const sig = want.join(",");
    if (!grid2 || grid2.dataset["sig"] !== sig) {
      grid2 = el15("div", "uw-nav-pages");
      grid2.dataset["sig"] = sig;
      this.io?.disconnect();
      this.thumbs.clear();
      this.io = new IntersectionObserver((ents) => {
        for (const e of ents) if (e.isIntersecting) this.paintThumb(+e.target.dataset["page"]);
      }, { root: this.bodyEl, rootMargin: "200px" });
      for (const i of want) {
        const item = el15("button", "uw-nav-page");
        item.type = "button";
        item.dataset["page"] = String(i);
        item.dataset["a"] = `nav:page:${i + 1}`;
        item.title = L15.page(i + 1);
        const c = el15("canvas", "uw-nav-thumb");
        const num3 = el15("span", "uw-nav-pnum", String(i + 1));
        item.append(c, num3);
        item.addEventListener("click", () => {
          ed.goToPage(i);
          this.refresh();
        });
        this.thumbs.set(i, c);
        grid2.appendChild(item);
        this.io.observe(item);
      }
      this.bodyEl.replaceChildren(grid2);
      this.dirtyThumbs = true;
    }
    for (const b of grid2.querySelectorAll(".uw-nav-page")) b.classList.toggle("uo-on", +b.dataset["page"] === cur);
    if (this.dirtyThumbs) {
      this.dirtyThumbs = false;
      for (const [i, c] of this.thumbs) if (c.dataset["painted"]) this.paintThumb(i);
    }
  }
  paintThumb(i) {
    const c = this.thumbs.get(i);
    if (!c) return;
    if (this.env.ed.paintPageThumbnail(i, c, 150)) c.dataset["painted"] = "1";
  }
  // ───── Resultados ─────
  renderResults() {
    const L15 = this.L;
    if (!this.query) {
      this.bodyEl.replaceChildren(el15("p", "uw-nav-empty", L15.noSearch));
      return;
    }
    if (!this.results.length) {
      this.bodyEl.replaceChildren(el15("p", "uw-nav-empty", L15.noMatch));
      return;
    }
    const list = el15("div", "uw-nav-results");
    list.setAttribute("role", "list");
    for (const r of this.results) {
      const b = el15("button", "uw-nav-result");
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.dataset["a"] = `nav:result:${r.index + 1}`;
      b.classList.toggle("uo-on", r.index === this.current);
      b.append(document.createTextNode(r.before), el15("strong", void 0, r.match), document.createTextNode(r.after));
      b.addEventListener("click", () => {
        this.current = r.index;
        this.env.ed.goToSearchResult(r.index);
        this.refresh();
      });
      list.appendChild(b);
    }
    this.bodyEl.replaceChildren(list);
    list.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
  }
};

// src/chrome-ruler.ts
var L13 = (en, pt) => ({ en, pt });
var TIPS = {
  firstLine: L13("First Line Indent", "Recuo da Primeira Linha"),
  hanging: L13("Hanging Indent", "Recuo Deslocado"),
  left: L13("Left Indent", "Recuo \xE0 Esquerda"),
  right: L13("Right Indent", "Recuo \xE0 Direita"),
  marginL: L13("Left Margin", "Margem Esquerda"),
  marginR: L13("Right Margin", "Margem Direita"),
  marginT: L13("Top Margin", "Margem Superior"),
  marginB: L13("Bottom Margin", "Margem Inferior"),
  column: L13("Move Column", "Mover Coluna"),
  cell: L13("Move Table Column", "Mover Coluna da Tabela"),
  row: L13("Adjust Table Row", "Ajustar Linha da Tabela"),
  tab: {
    left: L13("Left Tab", "Tabula\xE7\xE3o Esquerda"),
    center: L13("Center Tab", "Tabula\xE7\xE3o Centralizada"),
    right: L13("Right Tab", "Tabula\xE7\xE3o Direita"),
    decimal: L13("Decimal Tab", "Tabula\xE7\xE3o Decimal"),
    bar: L13("Bar Tab", "Barra de Tabula\xE7\xE3o")
  }
};
var MIN_TEXT = 720;
var RulerUI = class {
  constructor(env) {
    this.env = env;
    this.h = createRuler({
      orientation: "horizontal",
      lang: env.lang,
      onDrag: (m, pos) => this.showGuide("h", m, pos),
      onDrop: (m, pos, removed) => this.drop(m, pos, removed),
      onAddTab: (kind, pos) => this.addTab(kind, pos),
      onDblClick: (t2) => this.dblClick(t2)
    });
    this.h.el.classList.add("uw-hruler");
    this.v = createRuler({
      orientation: "vertical",
      lang: env.lang,
      selector: false,
      onDrag: (m, pos) => this.showGuide("v", m, pos),
      onDrop: (m, pos, removed) => this.drop(m, pos, removed),
      onDblClick: (t2) => this.dblClick(t2)
    });
    this.vbox = document.createElement("div");
    this.vbox.className = "uw-vruler";
    this.vbox.appendChild(this.v.el);
    this.guide = document.createElement("div");
    this.guide.className = "uw-ruler-guide";
    this.guide.hidden = true;
    for (const el19 of [this.h.el, this.vbox]) el19.addEventListener("mousedown", (e) => e.preventDefault());
  }
  env;
  h;
  v;
  vbox;
  guide;
  info = null;
  raf = 0;
  on = false;
  /** Liga/desliga (Exibir > Régua). */
  show(on) {
    this.on = on;
    if (on) {
      if (!this.h.el.isConnected) this.env.top.appendChild(this.h.el);
      if (!this.vbox.isConnected) this.env.layer.append(this.vbox, this.guide);
    } else {
      this.h.el.remove();
      this.vbox.remove();
      this.guide.remove();
      this.env.ed.classList.remove("uw-vruler-on");
    }
    this.schedule();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.h.destroy();
    this.v.destroy();
    this.vbox.remove();
    this.guide.remove();
    this.env.ed.classList.remove("uw-vruler-on");
  }
  schedule() {
    if (!this.on || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  /** Canvas da página `pg` (layout de impressão) ou o 1º (visões contínuas). */
  pageCanvas(pg) {
    const cs = this.env.ed.shadowRoot?.querySelectorAll("canvas.page");
    if (!cs?.length) return null;
    return cs[pg] ?? cs[0] ?? null;
  }
  render() {
    if (!this.on) return;
    const ed = this.env.ed;
    const info = ed.getRulerInfo();
    this.info = info;
    const view = ed.getView();
    ed.classList.toggle("uw-vruler-on", !!info && view === "print");
    const canvas = info ? this.pageCanvas(view === "print" ? info.page : 0) : null;
    if (!info || !canvas) {
      this.h.update(null);
      this.v.update(null);
      this.vbox.hidden = true;
      ed.classList.remove("uw-vruler-on");
      return;
    }
    const unit = this.env.lang === "pt" ? "cm" : "in";
    const fr0 = this.env.frame();
    this.h.el.style.paddingLeft = `${Math.max(0, fr0.left - this.env.top.getBoundingClientRect().left)}px`;
    const pr = canvas.getBoundingClientRect();
    const hc = this.h.el.querySelector(".uo-ruler-canvas").getBoundingClientRect();
    const scale = ed.getZoom() * 96 / 1440;
    const { frame, margins, indents, tabs } = info;
    const W = view === "print" ? info.pageWidthTwips : Math.round(pr.width / scale);
    const markers = [];
    const inCell = info.where === "cell";
    const shaded = inCell || view !== "print" ? [[0, frame.x0], [frame.x1, W]] : [[0, margins.left], [W - margins.right, W]];
    if (!inCell && info.columns.length > 1) {
      info.columns.forEach((c, i) => {
        const n = info.columns[i + 1];
        if (!n) return;
        shaded.push([c.x + c.w, n.x]);
        markers.push({ id: `col-${i}-r`, kind: "column", pos: c.x + c.w, tip: TIPS.column, min: c.x + MIN_TEXT, max: n.x });
        markers.push({ id: `col-${i + 1}-l`, kind: "column", pos: n.x, tip: TIPS.column, min: c.x + c.w, max: n.x + n.w - MIN_TEXT });
      });
    }
    if (!inCell && view === "print") {
      markers.push({ id: "m-left", kind: "margin", pos: margins.left, tip: TIPS.marginL, min: 0, max: W - margins.right - MIN_TEXT });
      markers.push({ id: "m-right", kind: "margin", pos: W - margins.right, tip: TIPS.marginR, min: margins.left + MIN_TEXT, max: W });
    }
    if (info.table) {
      for (const c of info.table.cols) markers.push({ id: `cell-${c.boundary}`, kind: "cell", pos: c.x, tip: TIPS.cell });
      const cs = info.table.cols;
      cs.forEach((c, i) => {
        const m = markers.find((x) => x.id === `cell-${c.boundary}`);
        m.min = i > 0 ? cs[i - 1].x + 100 : -Infinity;
        m.max = i < cs.length - 1 ? cs[i + 1].x - 100 : Infinity;
      });
    }
    const x0 = frame.x0, x1 = frame.x1;
    const left = x0 + indents.left;
    markers.push(
      { id: "first-line", kind: "first-line", pos: left + indents.firstLine, tip: TIPS.firstLine, min: 0, max: x1 - indents.right },
      { id: "hanging", kind: "hanging", pos: left, tip: TIPS.hanging, min: 0, max: x1 - indents.right, group: ["left-indent"] },
      { id: "left-indent", kind: "left-indent", pos: left, tip: TIPS.left, min: 0, max: x1 - indents.right, group: ["first-line", "hanging"] },
      { id: "right-indent", kind: "right-indent", pos: x1 - indents.right, tip: TIPS.right, min: Math.max(left, left + indents.firstLine), max: W }
    );
    let lastTab = Math.max(0, indents.left);
    for (const t2 of tabs) {
      markers.push({ id: `tab-${t2.pos}`, kind: `tab-${t2.align}`, pos: x0 + t2.pos, tip: TIPS.tab[t2.align], removable: true, min: x0, max: x1 });
      lastTab = Math.max(lastTab, t2.pos);
    }
    const dts = [];
    const dt = info.defaultTabTwips;
    if (dt > 0) for (let k = Math.floor(lastTab / dt) + 1, p = k * dt; x0 + p <= x1 && dts.length < 200; k++, p = k * dt) dts.push(x0 + p);
    const hm = {
      length: W,
      scale,
      offset: pr.left - hc.left,
      unit,
      zero: x0,
      shaded,
      textArea: [x0, x1],
      markers,
      defaultTabs: dts,
      readOnly: info.readOnly
    };
    this.h.update(hm);
    if (view !== "print") {
      this.v.update(null);
      this.vbox.hidden = true;
      return;
    }
    const fr = this.env.frame();
    this.vbox.hidden = false;
    this.vbox.style.left = `${fr.left}px`;
    this.vbox.style.top = `${fr.top}px`;
    this.vbox.style.height = `${Math.max(0, fr.height)}px`;
    const vc = this.v.el.querySelector(".uo-ruler-canvas").getBoundingClientRect();
    const H = info.pageHeightTwips;
    const vs = scale;
    const vmarkers = [
      { id: "m-top", kind: "margin", pos: margins.top, tip: TIPS.marginT, min: 0, max: H - margins.bottom - MIN_TEXT },
      { id: "m-bottom", kind: "margin", pos: H - margins.bottom, tip: TIPS.marginB, min: margins.top + MIN_TEXT, max: H }
    ];
    if (info.table) {
      for (const r of info.table.rows) vmarkers.push({ id: `row-${r.row}`, kind: "row", pos: r.bottom, tip: TIPS.row, min: r.top + 100 });
    }
    this.v.update({
      length: H,
      scale: vs,
      offset: pr.top - vc.top,
      unit,
      zero: margins.top,
      shaded: [[0, margins.top], [H - margins.bottom, H]],
      markers: vmarkers,
      readOnly: info.readOnly
    });
  }
  /** Guia tracejada sobre o documento enquanto arrasta (como o Word). */
  showGuide(dir, m, pos) {
    const info = this.info;
    const canvas = info ? this.pageCanvas(this.env.ed.getView() === "print" ? info.page : 0) : null;
    if (!m || !info || !canvas) {
      this.guide.hidden = true;
      return;
    }
    const pr = canvas.getBoundingClientRect();
    const fr = this.env.frame();
    this.guide.hidden = false;
    this.guide.classList.toggle("uw-ruler-guide-v", dir === "h");
    if (dir === "h") {
      const x = pr.left + pos * (this.env.ed.getZoom() * 96 / 1440);
      Object.assign(this.guide.style, { left: `${x}px`, top: `${fr.top}px`, width: "0px", height: `${fr.height}px` });
    } else {
      const y = pr.top + pos * (this.env.ed.getZoom() * 96 / 1440);
      Object.assign(this.guide.style, { left: `${fr.left}px`, top: `${y}px`, width: `${fr.width}px`, height: "0px" });
    }
  }
  drop(m, pos, removed) {
    const info = this.info;
    const ed = this.env.ed;
    if (!info) return;
    const { frame, indents, margins } = info;
    const left = frame.x0 + indents.left;
    const id = m.id;
    if (id.startsWith("tab-")) {
      const old = m.pos - frame.x0;
      const t2 = info.tabs.find((x) => x.pos === Math.round(old));
      if (removed) ed.setTabStops([], { remove: [old] });
      else if (t2) ed.setTabStops([], { remove: [old], add: [{ ...t2, pos: Math.round(pos - frame.x0) }] });
    } else if (id === "first-line") ed.setParagraphIndents({ firstLine: Math.round(pos - left) });
    else if (id === "hanging") ed.setParagraphIndents({ left: Math.round(pos - frame.x0), firstLine: Math.round(left + indents.firstLine - pos) });
    else if (id === "left-indent") ed.setParagraphIndents({ left: Math.round(pos - frame.x0) });
    else if (id === "right-indent") ed.setParagraphIndents({ right: Math.round(frame.x1 - pos) });
    else if (id.startsWith("m-")) {
      const W = info.pageWidthTwips, H = info.pageHeightTwips;
      const mm = { ...margins };
      if (id === "m-left") mm.left = Math.round(pos);
      else if (id === "m-right") mm.right = Math.round(W - pos);
      else if (id === "m-top") mm.top = Math.round(pos);
      else if (id === "m-bottom") mm.bottom = Math.round(H - pos);
      ed.setPageSetup({ customMargins: mm, applyTo: "section" });
    } else if (id.startsWith("col-")) this.dropColumn(id, pos);
    else if (id.startsWith("cell-")) ed.resizeTableColumn(+id.slice(5), Math.round(pos - m.pos));
    else if (id.startsWith("row-")) ed.resizeTableRow(+id.slice(4), Math.round(pos - m.pos));
    this.render();
  }
  /** Borda do espaço entre colunas: colunas iguais mudam o espaço de todas;
   *  desiguais trocam largura com o espaço vizinho. */
  dropColumn(id, pos) {
    const info = this.info;
    const sec = this.env.ed.getSection();
    if (!sec) return;
    const m = /^col-(\d+)-(l|r)$/.exec(id);
    if (!m) return;
    const i = +m[1], side = m[2];
    const cols = info.columns;
    const c = cols[i];
    const edge = side === "r" ? c.x + c.w : c.x;
    const d = Math.round(pos - edge);
    if (!d) return;
    if (sec.columns.equalWidth) {
      const space = Math.max(0, sec.columns.spaceTwips - 2 * (side === "r" ? d : -d));
      this.env.ed.setColumns({ count: sec.columns.count, spaceTwips: space, sep: sec.columns.sep, applyTo: "section" });
      return;
    }
    const widths = sec.columns.widths.map((w) => ({ ...w }));
    if (side === "r" && widths[i] && widths[i + 1] !== void 0) {
      widths[i].widthTwips += d;
      widths[i].spaceTwips = Math.max(0, widths[i].spaceTwips - d);
    } else if (side === "l" && widths[i] && widths[i - 1]) {
      widths[i - 1].spaceTwips = Math.max(0, widths[i - 1].spaceTwips + d);
      widths[i].widthTwips -= d;
    }
    this.env.ed.setColumns({ count: sec.columns.count, widths, sep: sec.columns.sep, applyTo: "section" });
  }
  addTab(kind, pos) {
    const info = this.info;
    if (!info) return;
    this.env.ed.setTabStops([], { add: [{ pos: Math.round(pos - info.frame.x0), align: kind }] });
    this.render();
  }
  dblClick(t2) {
    if (t2 === "margin") {
      this.env.pageDialog();
      return;
    }
    if (t2 === "track") {
      this.env.tabsDialog();
      return;
    }
    if (t2.kind.startsWith("tab-")) this.env.tabsDialog();
    else if (t2.kind === "margin" || t2.kind === "column") this.env.pageDialog();
    else if (t2.kind === "first-line" || t2.kind === "hanging" || t2.kind === "left-indent" || t2.kind === "right-indent") this.env.paragraphDialog();
  }
};

// src/chrome-panels.ts
var CommentCards = class {
  constructor(ed, app, root, after) {
    this.ed = ed;
    this.app = app;
    this.after = after;
    const el19 = document.createElement("div");
    el19.className = "uw-comments";
    el19.setAttribute("part", "comments");
    for (const t2 of ["mousedown", "dblclick", "contextmenu", "keydown", "wheel"]) {
      el19.addEventListener(t2, (e) => {
        if (t2 !== "wheel") e.stopPropagation();
      }, { passive: t2 === "wheel" });
    }
    root.appendChild(el19);
    this.el = el19;
  }
  ed;
  app;
  after;
  el;
  raf = 0;
  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.el.remove();
    this.ed.classList.remove("uw-has-comments");
  }
  render() {
    const pages = [...this.ed.shadowRoot?.querySelectorAll("canvas.page") ?? []];
    const print = this.ed.getView() === "print";
    const L15 = this.app.ui.L;
    const mode = this.ed.getMarkupMode();
    const mk = this.ed.getMarkupOptions();
    const revs = print && mode === "all" && mk.balloons !== "inline" ? this.ed.getRevisions() : [];
    const anchors = revs.length ? this.ed.revisionAnchors() : [];
    const balloons = anchors.filter((a) => {
      const r = revs[a.index];
      if (r.kind === "format" || r.kind === "paraFormat") return mk.formatting && (!mk.authors || mk.authors.includes(r.author));
      return mk.balloons === "revisions" && r.kind === "delete" && mk.insertionsDeletions && (!mk.authors || mk.authors.includes(r.author));
    });
    const all = this.app.commentsVisible && mk.comments && print ? this.ed.getComments() : [];
    const pageW = Math.max(
      0,
      ...all.map((c) => pages[this.ed.commentAnchorPx(c.id)?.page ?? -1]?.offsetWidth ?? 0),
      ...balloons.map((a) => pages[a.page]?.offsetWidth ?? 0)
    );
    const room = this.ed.clientWidth >= pageW + 300 + 48;
    const comments = room ? all : [];
    const shown = room ? balloons : [];
    this.ed.classList.toggle("uw-has-comments", comments.length + shown.length > 0);
    const active = new Set(this.app.activeCommentIds);
    this.el.replaceChildren();
    if (!comments.length && !shown.length) return;
    const placed = [];
    for (const c of comments) {
      const a = this.ed.commentAnchorPx(c.id);
      const page = a ? pages[a.page] : void 0;
      if (!a || !page) continue;
      const card = document.createElement("div");
      card.className = `uw-card${active.has(c.id) ? " active" : ""}`;
      card.dataset["commentId"] = String(c.id);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span>
        <button type="button" class="uo-btn" data-a="comment:delete:${c.id}" title="${L15.deleteComment}">${symbol("delete")}</button></div>
        <div class="txt"></div>`;
      card.querySelector(".who").textContent = c.author ?? L15.anonymous;
      card.querySelector(".txt").textContent = c.text;
      card.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.ed.isProtected()) return;
        this.ed.removeComment(c.id);
        this.after();
      });
      card.addEventListener("click", () => {
        this.app.activeCommentIds = [c.id];
        this.ed.goToComment(c.id);
        this.render();
        this.after();
      });
      card.style.left = `${page.offsetLeft + page.offsetWidth + 24}px`;
      this.el.appendChild(card);
      placed.push({ card, ideal: a.topPx });
    }
    for (const a of shown) {
      const r = revs[a.index];
      const page = pages[a.page];
      if (!page) continue;
      const card = document.createElement("div");
      card.className = "uw-card uw-rev-card";
      card.style.setProperty("--uw-rev", `#${r.color}`);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span><span class="when"></span>
        <button type="button" class="uo-btn" data-a="rev:accept" title="${L15.revAccept}">${symbol("check")}</button>
        <button type="button" class="uo-btn" data-a="rev:reject" title="${L15.revReject}">${symbol("close")}</button></div>
        <div class="txt"></div>`;
      card.querySelector(".who").textContent = r.author;
      card.querySelector(".when").textContent = revisionTime(r.date, uiLang(this.ed));
      const txt = card.querySelector(".txt");
      if (r.description) {
        const [head, ...rest] = r.description.split(": ");
        txt.append(Object.assign(document.createElement("b"), { textContent: `${head}: ` }), rest.join(": "));
      } else {
        txt.append(Object.assign(document.createElement("b"), { textContent: `${r.mark ? L15.revParaDeleted : L15.revDeleted}: ` }), r.text);
      }
      const [acc, rej] = card.querySelectorAll("button");
      acc.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.ed.acceptRevisionAt(a.index)) this.after();
      });
      rej.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.ed.rejectRevisionAt(a.index)) this.after();
      });
      card.addEventListener("click", () => {
        this.ed.selectRevision(a.index);
        this.after();
      });
      card.style.left = `${page.offsetLeft + page.offsetWidth + 24}px`;
      this.el.appendChild(card);
      placed.push({ card, ideal: a.topPx });
    }
    placed.sort((x, y) => x.ideal - y.ideal);
    let bottom = -Infinity;
    for (const p of placed) {
      const top = Math.max(p.ideal, bottom + 8);
      p.card.style.top = `${top}px`;
      p.card.classList.toggle("anchored", Math.abs(top - p.ideal) <= 6);
      bottom = top + (p.card.offsetHeight || 56);
    }
  }
};
function revisionTime(date, lang) {
  const m = date ? /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(date) : null;
  if (!m) return "";
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return d.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { dateStyle: "short", timeStyle: "short" });
}
var StatusBar = class {
  constructor(ed, app, container, ctx) {
    this.ed = ed;
    this.app = app;
    const bar2 = document.createElement("div");
    bar2.className = "uw-status-bar";
    bar2.setAttribute("part", "statusbar");
    this.status = document.createElement("span");
    this.status.className = "uw-status";
    this.status.dataset["a"] = "status";
    this.status.setAttribute("role", "status");
    const sp = document.createElement("span");
    sp.className = "uo-spacer";
    bar2.append(this.status, sp);
    const views = document.createElement("span");
    views.className = "uw-views";
    for (const id of ["view:print", "view:web", "view:read", "focus"]) {
      const r = renderItem(id, ctx);
      views.appendChild(r.el);
      this.items.push(r);
    }
    bar2.appendChild(views);
    const zo = renderItem("zoomout", ctx);
    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.min = "10";
    this.slider.max = "500";
    this.slider.step = "5";
    this.slider.className = "uw-zoom-slider";
    this.slider.dataset["a"] = "zoom:slider";
    this.slider.title = ctx.registry.text({ en: "Zoom (Ctrl+scroll on the document)", pt: "Zoom (Ctrl+rolagem no documento)" });
    this.slider.addEventListener("input", () => ed.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener("change", () => ctx.after());
    const zi = renderItem("zoomin", ctx);
    const pct = document.createElement("button");
    pct.type = "button";
    pct.className = "uo-btn uw-zoom-pct";
    pct.dataset["a"] = "zoom";
    pct.title = ctx.registry.text({ en: "Zoom", pt: "Zoom" });
    pct.addEventListener("mousedown", (e) => e.preventDefault());
    pct.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(pct, () => ZOOMS.map((z) => ({
        label: `${z}%`,
        checked: Math.round(ed.getZoom() * 100) === z,
        onClick: () => {
          ed.setZoom(z / 100);
          ctx.after();
        }
      })), ctx);
    });
    this.items.push(zo, zi, { el: pct, visible: () => true, sync: () => {
      pct.textContent = `${Math.round(ed.getZoom() * 100)}%`;
    } });
    bar2.append(zo.el, this.slider, zi.el, pct);
    container.appendChild(bar2);
  }
  ed;
  app;
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
    }, 2400);
  }
  sync() {
    if (!this.flashing) {
      const s = this.ed.stats();
      this.status.textContent = this.app.ui.L.status(s.page, s.pages, s.words);
    }
    for (const r of this.items) r.sync();
    if (this.ed.getRootNode() && document.activeElement !== this.slider) this.slider.value = String(Math.round(this.ed.getZoom() * 100));
  }
};

// src/chrome-review.ts
var ReviewPane = class {
  constructor(ed, app, env, after) {
    this.ed = ed;
    this.app = app;
    this.env = env;
    this.after = after;
  }
  ed;
  app;
  env;
  after;
  dir = null;
  pane = null;
  raf = 0;
  open(dir) {
    this.close();
    this.dir = dir;
    const body = document.createElement("div");
    body.className = "uw-review";
    const pane = openPane({
      id: "revisions",
      title: this.app.ui.L.revPane,
      lang: this.env.lang,
      layer: this.env.layer,
      frame: this.env.frame,
      dock: dir === "vertical" ? "left" : "bottom",
      width: 300,
      height: 220,
      body,
      // fechado pelo ×: o painel não volta na próxima abertura
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.dir = null;
        this.ed.classList.remove("uw-review-v", "uw-review-h");
        this.app.prefs.set("reviewPane", "");
        this.after();
      }
    });
    pane.el.setAttribute("part", "pane review-pane");
    this.pane = pane;
    this.ed.classList.toggle("uw-review-v", dir === "vertical");
    this.ed.classList.toggle("uw-review-h", dir === "horizontal");
    this.render();
  }
  close() {
    const pane = this.pane;
    this.pane = null;
    this.dir = null;
    pane?.close();
    this.ed.classList.remove("uw-review-v", "uw-review-h");
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.close();
  }
  schedule() {
    if (!this.dir || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  /** Reposiciona (a área entre as barras mudou). */
  place() {
    this.pane?.place();
  }
  render() {
    const pane = this.pane;
    if (!pane) return;
    pane.place();
    const L15 = this.app.ui.L;
    const lang = uiLang(this.ed);
    const revs = this.ed.getRevisions();
    const comments = this.app.commentsVisible ? this.ed.getComments() : [];
    const n = { ins: 0, del: 0, move: 0, fmt: 0 };
    for (const r of revs) {
      if (r.move) n.move++;
      else if (r.kind === "insert") n.ins++;
      else if (r.kind === "delete") n.del++;
      else n.fmt++;
    }
    pane.setTitle(`${L15.revPane}: ${L15.revCount(revs.length)}`);
    const sum = document.createElement("div");
    sum.className = "uw-review-sum";
    sum.textContent = [`${L15.revInsertions}: ${n.ins}`, `${L15.revDeletions}: ${n.del}`, `${L15.revMoves}: ${n.move}`, `${L15.revFormatting}: ${n.fmt}`, `${L15.revComments}: ${comments.length}`].join(" \xB7 ");
    const list = document.createElement("ul");
    list.className = "uw-review-list";
    revs.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "uw-rev";
      li.style.setProperty("--uw-rev", `#${r.color}`);
      const what = r.move ? r.kind === "delete" ? L15.revMovedFrom : L15.revMovedTo : r.kind === "insert" ? r.mark ? L15.revParaInserted : L15.revInserted : r.kind === "delete" ? r.mark ? L15.revParaDeleted : L15.revDeleted : L15.revFormatted;
      li.innerHTML = `<div class="uw-rev-head"><span class="who"></span><span class="what"></span><span class="gap"></span>
        <button type="button" class="uo-btn" data-a="rev:accept">${symbol("check")}</button>
        <button type="button" class="uo-btn" data-a="rev:reject">${symbol("close")}</button></div><div class="when"></div><div class="txt"></div>`;
      li.querySelector(".who").textContent = r.author;
      li.querySelector(".what").textContent = what;
      li.querySelector(".when").textContent = revisionTime(r.date, lang);
      li.querySelector(".txt").textContent = r.description ? r.description.replace(/^[^:]*:\s*/, "") : r.text;
      const [acc, rej] = li.querySelectorAll("button");
      acc.title = L15.revAccept;
      rej.title = L15.revReject;
      acc.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.ed.acceptRevisionAt(i)) this.after();
      });
      rej.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.ed.rejectRevisionAt(i)) this.after();
      });
      li.addEventListener("click", () => {
        this.ed.selectRevision(i);
        this.after();
      });
      list.appendChild(li);
    });
    for (const c of comments) {
      const li = document.createElement("li");
      li.className = "uw-rev uw-rev-comment";
      li.innerHTML = '<div class="uw-rev-head"><span class="who"></span><span class="what"></span></div><div class="txt"></div>';
      li.querySelector(".who").textContent = c.author ?? L15.anonymous;
      li.querySelector(".what").textContent = L15.revComments;
      li.querySelector(".txt").textContent = c.text;
      li.addEventListener("click", () => {
        this.app.activeCommentIds = [c.id];
        this.ed.goToComment(c.id);
        this.after();
      });
      list.appendChild(li);
    }
    if (!revs.length && !comments.length) {
      const li = document.createElement("li");
      li.className = "uw-rev-empty";
      li.textContent = L15.revNone;
      list.appendChild(li);
    }
    pane.body.replaceChildren(sum, list);
  }
};

// src/chrome-picture-pane.ts
var el16 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var EMU_PT = 12700;
var ANG = 6e4;
var alphaOf = (c) => (c?.mods?.find((m) => m[0] === "alpha")?.[1] ?? 1e5) / 1e3;
var withAlpha = (c, pct) => ({ ...c, mods: [...(c.mods ?? []).filter((m) => m[0] !== "alpha"), ...pct < 100 ? [["alpha", Math.round(pct * 1e3)]] : []] });
var noAlpha = (c) => ({ ...c, mods: (c.mods ?? []).filter((m) => m[0] !== "alpha") });
function toggleFormatPane(env, tab, onClose) {
  const { ed, lang } = env;
  const tr14 = (en, pt2) => pickLabels(lang, { en, pt: pt2 });
  const cur = paneOpen("pic-format");
  if (cur) {
    cur.close();
    return null;
  }
  const shape = !ed.selectedImage() && typeof ed.selectedShape === "function" && !!ed.selectedShape();
  const fmt2 = () => ed.selectedImage()?.format ?? null;
  const sfmt = () => ed.selectedShape()?.format ?? null;
  const anyFmt = () => shape ? sfmt() : fmt2();
  const off = () => !(shape ? ed.selectedShape() : ed.selectedImage()) || ed.isProtected();
  const setFormat = (o) => shape ? ed.setShapeFormat(o) : ed.setImageFormat(o);
  const setEffect = (k, id) => shape ? ed.setShapeEffect(k, id) : ed.setImageEffect(k, id);
  const setAlt = (o) => shape ? ed.setShapeAltText(o) : ed.setImageAltText(o);
  const syncers = [];
  const dec = tr14(".", ",");
  const num3 = (label, unit, get, set, o = {}) => {
    const input = el16("input", { type: "text", inputMode: "decimal", style: "width:76px" });
    input.setAttribute("aria-label", label);
    const digits = o.digits ?? 1;
    const show2 = () => {
      const v = get();
      if (document.activeElement !== input && ed.shadowRoot?.activeElement !== input) input.value = v === void 0 ? "" : `${(Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, "").replace(".", dec)} ${unit}`.trim();
      input.disabled = off();
      up.disabled = dn.disabled = off();
    };
    const clamp = (v) => Math.max(o.min ?? -Infinity, Math.min(o.max ?? Infinity, v));
    const apply = () => {
      const n = parseFloat(input.value.replace(",", ".").replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(n)) {
        set(clamp(n));
        env.after();
      }
      sync();
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        apply();
      }
    });
    const step = (d) => {
      set(clamp((get() ?? 0) + d * (o.step ?? 1)));
      env.after();
      sync();
    };
    const up = el16("button", { type: "button", className: "uo-btn", style: "width:18px;height:13px;min-width:0;padding:0" });
    const dn = el16("button", { type: "button", className: "uo-btn", style: "width:18px;height:13px;min-width:0;padding:0" });
    up.innerHTML = symbol("keyboard_arrow_up");
    dn.innerHTML = symbol("keyboard_arrow_down");
    for (const [b, d] of [[up, 1], [dn, -1]]) {
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => step(d));
    }
    syncers.push(show2);
    return row3(label, el16("span", { style: "display:inline-flex;align-items:center;gap:2px" }, input, el16("span", { style: "display:inline-flex;flex-direction:column" }, up, dn)));
  };
  const choice = (label, opts, get, set) => {
    const s = el16("select", { style: "max-width:150px" });
    s.setAttribute("aria-label", label);
    for (const [v, t2] of opts) s.append(el16("option", { value: v, textContent: t2 }));
    s.addEventListener("change", () => {
      set(s.value);
      env.after();
      sync();
    });
    syncers.push(() => {
      const v = get();
      s.value = v ?? "";
      s.disabled = off();
    });
    return row3(label, s);
  };
  const color = (label, get, set) => {
    const b = el16("button", { type: "button", className: "uo-btn", style: "min-width:0;padding:2px 6px;display:inline-flex;align-items:center;gap:4px" });
    b.setAttribute("aria-label", label);
    const chip = el16("span", { style: "width:18px;height:14px;border:1px solid var(--uo-outline,#888);border-radius:3px;display:inline-block" });
    b.append(chip);
    b.insertAdjacentHTML("beforeend", symbol("arrow_drop_down"));
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      const theme = ed.documentThemeColors();
      openMenu([{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))],
          columns: 10,
          close,
          onPick: (v) => {
            set(dmlFromPick(v, theme));
            env.after();
            sync();
          }
        })
      }], { anchor: b }, { layer: env.layer, lang });
    });
    syncers.push(() => {
      const c = get();
      const hex = c ? ed.resolveDmlColor(c) : void 0;
      chip.style.background = hex ? `#${hex}` : "transparent";
      b.disabled = off();
    });
    return row3(label, b);
  };
  const row3 = (label, ctl) => el16("label", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px" }, el16("span", { textContent: label }), ctl);
  const section4 = (title2, open, ...kids) => {
    const d = el16("details", { open, style: "border-bottom:1px solid var(--uo-outline-variant,#ddd);padding:4px 0" }, el16("summary", { textContent: title2, style: "font-weight:600;font-size:13px;cursor:pointer;padding:4px 0" }));
    d.append(el16("div", { style: "display:flex;flex-direction:column;gap:6px;padding:4px 0 6px 12px" }, ...kids));
    return d;
  };
  const presetRow = (label, items, set, noneLabel) => choice(label, [["", tr14("(choose)", "(escolher)")], ["none", noneLabel], ...items.map((i) => [i.id, i.label])], () => "", (v) => {
    if (v) set(v === "none" ? null : v);
  });
  const line2 = () => anyFmt()?.line ?? void 0;
  const setLine = (ch) => {
    const base = line2()?.fill ? { ...line2() } : { w: 9525, fill: { kind: "schemeClr", val: "tx1" } };
    setFormat({ line: { ...base, ...ch } });
  };
  const fill = () => sfmt()?.fill;
  const fillColor = () => {
    const f = fill();
    return f?.kind === "solid" ? f.color : f?.kind === "pattern" ? f.fg : void 0;
  };
  const grad = () => {
    const f = fill();
    return f?.kind === "gradient" ? f : void 0;
  };
  const setGrad = (ch) => {
    const base = grad() ?? ed.shapeGradientVariations()[0].fill;
    ed.setShapeFill({ ...base, ...ch });
  };
  const patt = () => {
    const f = fill();
    return f?.kind === "pattern" ? f : void 0;
  };
  const setPatt = (ch) => {
    const base = patt() ?? { kind: "pattern", prst: "pct5", fg: { kind: "schemeClr", val: "accent1" }, bg: { kind: "schemeClr", val: "bg1" } };
    ed.setShapeFill({ ...base, ...ch });
  };
  const pickPicture = (tile) => {
    const inp = el16("input", { type: "file", accept: "image/*" });
    inp.addEventListener("change", () => {
      const f = inp.files?.[0];
      if (f) void f.arrayBuffer().then((b) => ed.setShapePictureFill(new Uint8Array(b), (f.name.split(".").pop() || "png").toLowerCase(), tile)).then(() => {
        env.after();
        sync();
      });
    });
    inp.click();
  };
  const fillSection = section4(
    tr14("Fill", "Preenchimento"),
    true,
    choice(
      tr14("Fill", "Preenchimento"),
      [["none", tr14("No fill", "Sem preenchimento")], ["solid", tr14("Solid fill", "Preenchimento s\xF3lido")], ["gradient", tr14("Gradient fill", "Preenchimento gradiente")], ["picture", tr14("Picture or texture fill", "Preenchimento com imagem ou textura")], ["pattern", tr14("Pattern fill", "Preenchimento de padr\xE3o")], ["style", tr14("Automatic", "Autom\xE1tico")]],
      () => {
        const k = fill()?.kind;
        return k === "raw" ? "picture" : k;
      },
      (v) => {
        if (v === "none") ed.setShapeFill(null);
        else if (v === "solid") ed.setShapeFill(fillColor() ?? { kind: "schemeClr", val: "accent1" });
        else if (v === "gradient") setGrad({});
        else if (v === "pattern") setPatt({});
        else if (v === "style") ed.setShapeFill({ kind: "style" });
        else pickPicture(false);
      }
    ),
    color(tr14("Color", "Cor"), () => fillColor(), (c) => {
      const f = fill();
      if (f?.kind === "pattern") setPatt({ fg: c });
      else ed.setShapeFill({ kind: "solid", color: withAlpha(c, alphaOf(fillColor())) });
    }),
    num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => {
      const f = fill();
      return f?.kind === "solid" ? 100 - alphaOf(f.color) : void 0;
    }, (v) => {
      const f = fill();
      if (f?.kind === "solid") ed.setShapeFill({ kind: "solid", color: withAlpha(noAlpha(f.color), 100 - v) });
    }, { min: 0, max: 100 }),
    choice(tr14("Preset gradients", "Gradientes predefinidos"), [["", tr14("(choose)", "(escolher)")], ...ed.shapeGradientVariations().map((g) => [g.id, g.id])], () => "", (v) => {
      const g = ed.shapeGradientVariations().find((x) => x.id === v);
      if (g) ed.setShapeFill(g.fill);
    }),
    choice(
      tr14("Gradient type", "Tipo de gradiente"),
      [["linear", tr14("Linear", "Linear")], ["circle", tr14("Radial", "Radial")], ["rect", tr14("Rectangular", "Retangular")], ["shape", tr14("Path", "Caminho")]],
      () => {
        const g = grad();
        return g ? g.path ? g.path.path : "linear" : void 0;
      },
      (v) => {
        const g = grad();
        if (!g) return;
        const { lin: _l, path: _p, ...rest } = g;
        void _l;
        void _p;
        setGrad(v === "linear" ? { ...rest, lin: { ang: 54e5, scaled: true } } : { ...rest, path: { path: v, fillToRect: { l: 5e4, t: 5e4, r: 5e4, b: 5e4 } } });
      }
    ),
    num3(tr14("Angle", "\xC2ngulo"), "\xB0", () => {
      const g = grad();
      return g?.lin ? g.lin.ang / ANG : void 0;
    }, (v) => {
      const g = grad();
      if (g?.lin) setGrad({ lin: { ...g.lin, ang: Math.round((v % 360 + 360) % 360 * ANG) } });
    }, { min: 0, max: 359.9 }),
    choice(tr14("Pattern", "Padr\xE3o"), Object.keys(PRESET_PATTERNS).map((k) => [k, k]), () => patt()?.prst, (v) => setPatt({ prst: v })),
    color(tr14("Background", "Plano de fundo"), () => patt()?.bg, (c) => setPatt({ bg: c })),
    row3(tr14("Picture source", "Fonte da imagem"), el16(
      "span",
      { style: "display:inline-flex;gap:4px" },
      (() => {
        const b = el16("button", { type: "button", className: "uo-btn", textContent: tr14("Insert\u2026", "Inserir...") });
        b.addEventListener("click", () => pickPicture(false));
        return b;
      })(),
      (() => {
        const b = el16("button", { type: "button", className: "uo-btn", textContent: tr14("Texture\u2026", "Textura...") });
        b.addEventListener("click", () => pickPicture(true));
        return b;
      })()
    ))
  );
  const lineTab = el16(
    "div",
    {},
    ...shape ? [fillSection] : [],
    section4(
      tr14("Line", "Linha"),
      true,
      choice(tr14("Line", "Linha"), [["none", tr14("No line", "Sem linha")], ["solid", tr14("Solid line", "Linha s\xF3lida")]], () => line2()?.fill ? "solid" : "none", (v) => v === "none" ? setFormat({ line: shape ? null : { ...line2() ?? {}, fill: null } }) : setLine({})),
      color(tr14("Color", "Cor"), () => line2()?.fill ?? void 0, (c) => setLine({ fill: withAlpha(c, alphaOf(line2()?.fill ?? void 0)) })),
      num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => line2()?.fill ? 100 - alphaOf(line2().fill) : void 0, (v) => line2()?.fill && setLine({ fill: withAlpha(line2().fill, 100 - v) }), { min: 0, max: 100 }),
      num3(tr14("Width", "Largura"), "pt", () => line2()?.fill ? (line2().w ?? 9525) / EMU_PT : void 0, (v) => setLine({ w: Math.round(v * EMU_PT) }), { min: 0, max: 1584, step: 0.25, digits: 2 }),
      choice(tr14("Compound type", "Tipo composto"), [["sng", tr14("Single", "Simples")], ["dbl", tr14("Double", "Duplo")], ["thickThin", tr14("Thick Thin", "Grosso Fino")], ["thinThick", tr14("Thin Thick", "Fino Grosso")], ["tri", tr14("Triple", "Triplo")]], () => line2()?.cmpd ?? "sng", (v) => setLine({ cmpd: v })),
      choice(tr14("Dash type", "Tipo de tra\xE7o"), LINE_DASHES.map((d) => [d.val, pickLabels(lang, d.label)]), () => line2()?.dash ?? "solid", (v) => setLine({ dash: v === "solid" ? void 0 : v })),
      choice(tr14("Cap type", "Tipo de extremidade"), [["sq", tr14("Square", "Quadrado")], ["rnd", tr14("Round", "Arredondado")], ["flat", tr14("Flat", "Plano")]], () => line2()?.cap ?? "flat", (v) => setLine({ cap: v })),
      choice(tr14("Join type", "Tipo de jun\xE7\xE3o"), [["round", tr14("Round", "Arredondada")], ["bevel", tr14("Bevel", "Chanfrada")], ["miter", tr14("Miter", "Malhete")]], () => line2()?.join ?? "round", (v) => setLine({ join: v }))
    )
  );
  const fx = () => anyFmt()?.effects;
  const sh = () => fx()?.shadow;
  const setSh = (ch) => {
    const base = sh() ?? { kind: "outer", blurRad: 50800, dist: 38100, dir: 27e5, algn: "tl", rotWithShape: false, color: { kind: "prstClr", val: "black", mods: [["alpha", 4e4]] } };
    setFormat({ shadow: { ...base, ...ch } });
  };
  const rf = () => fx()?.reflection;
  const setRf = (ch) => {
    const base = rf() ?? { blurRad: 6350, stA: 5e4, endA: 300, endPos: 55e3, dir: 54e5, sy: -1e5, algn: "bl", rotWithShape: false };
    setFormat({ reflection: { ...base, ...ch } });
  };
  const gl = () => fx()?.glow;
  const setGl = (ch) => {
    const base = gl() ?? glowPreset(GLOW_SIZES[0], 1);
    setFormat({ glow: { ...base, ...ch } });
  };
  const td = () => anyFmt()?.threeD;
  const setTd = (ch) => {
    const base = td() ?? { camera: { prst: "orthographicFront" }, lightRig: { rig: "threePt", dir: "t" } };
    setFormat({ threeD: { ...base, ...ch } });
  };
  const bevelOpts = [["", tr14("No Bevel", "Sem Bisel")], ...BEVEL_PRESETS.map((b) => [b.prst, pickLabels(lang, b.label)])];
  const bevel = (which, title2) => [
    choice(title2, bevelOpts, () => td()?.[which] ? td()[which].prst ?? "circle" : "", (v) => setTd({ [which]: v ? { ...td()?.[which] ?? {}, prst: v === "circle" ? void 0 : v } : void 0 })),
    num3(tr14("Width", "Largura"), "pt", () => td()?.[which] ? (td()[which].w ?? 76200) / EMU_PT : void 0, (v) => setTd({ [which]: { ...td()?.[which] ?? {}, w: Math.round(v * EMU_PT) } }), { min: 0, max: 1584, step: 1 }),
    num3(tr14("Height", "Altura"), "pt", () => td()?.[which] ? (td()[which].h ?? 76200) / EMU_PT : void 0, (v) => setTd({ [which]: { ...td()?.[which] ?? {}, h: Math.round(v * EMU_PT) } }), { min: 0, max: 1584, step: 1 })
  ];
  const rot = () => td()?.camera?.rot ?? { lat: 0, lon: 0, rev: 0 };
  const setRot = (k, deg) => {
    const cam = td()?.camera ?? { prst: "orthographicFront" };
    setTd({ camera: { ...cam, rot: { ...rot(), [k]: Math.round((deg % 360 + 360) % 360 * ANG) } } });
  };
  const effectsTab = el16(
    "div",
    {},
    section4(
      tr14("Shadow", "Sombra"),
      true,
      presetRow(tr14("Presets", "Predefini\xE7\xF5es"), SHADOW_PRESETS.map((p) => ({ id: p.id, label: pickLabels(lang, p.label) })), (id) => setEffect("shadow", id), tr14("No Shadow", "Sem Sombra")),
      color(tr14("Color", "Cor"), () => sh()?.color, (c) => setSh({ color: withAlpha(c, alphaOf(sh()?.color)) })),
      num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => sh() ? 100 - alphaOf(sh().color) : void 0, (v) => sh() && setSh({ color: withAlpha(noAlpha(sh().color), 100 - v) }), { min: 0, max: 100 }),
      num3(tr14("Size", "Tamanho"), "%", () => sh() ? (sh().sx ?? 1e5) / 1e3 : void 0, (v) => setSh({ sx: Math.round(v * 1e3), sy: Math.round(v * 1e3) }), { min: 1, max: 200 }),
      num3(tr14("Blur", "Desfoque"), "pt", () => sh() ? (sh().blurRad ?? 0) / EMU_PT : void 0, (v) => setSh({ blurRad: Math.round(v * EMU_PT) }), { min: 0, max: 100 }),
      num3(tr14("Angle", "\xC2ngulo"), "\xB0", () => sh() ? (sh().dir ?? 0) / ANG : void 0, (v) => setSh({ dir: Math.round((v % 360 + 360) % 360 * ANG) }), { min: 0, max: 359.9 }),
      num3(tr14("Distance", "Dist\xE2ncia"), "pt", () => sh() ? (sh().dist ?? 0) / EMU_PT : void 0, (v) => setSh({ dist: Math.round(v * EMU_PT) }), { min: 0, max: 200 })
    ),
    section4(
      tr14("Reflection", "Reflexo"),
      false,
      presetRow(tr14("Presets", "Predefini\xE7\xF5es"), REFLECTION_PRESETS.map((p) => ({ id: p.id, label: pickLabels(lang, p.label) })), (id) => setEffect("reflection", id), tr14("No Reflection", "Sem Reflexo")),
      num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => rf() ? 100 - (rf().stA ?? 1e5) / 1e3 : void 0, (v) => setRf({ stA: Math.round((100 - v) * 1e3) }), { min: 0, max: 100 }),
      num3(tr14("Size", "Tamanho"), "%", () => rf() ? (rf().endPos ?? 1e5) / 1e3 : void 0, (v) => setRf({ endPos: Math.round(v * 1e3) }), { min: 1, max: 100 }),
      num3(tr14("Blur", "Desfoque"), "pt", () => rf() ? (rf().blurRad ?? 0) / EMU_PT : void 0, (v) => setRf({ blurRad: Math.round(v * EMU_PT) }), { min: 0, max: 100 }),
      num3(tr14("Distance", "Dist\xE2ncia"), "pt", () => rf() ? (rf().dist ?? 0) / EMU_PT : void 0, (v) => setRf({ dist: Math.round(v * EMU_PT) }), { min: 0, max: 100 })
    ),
    section4(
      tr14("Glow", "Brilho"),
      false,
      presetRow(tr14("Presets", "Predefini\xE7\xF5es"), GLOW_SIZES.flatMap((r, si) => [1, 2, 3, 4, 5, 6].map((a) => ({ id: `glow-${si}-${a}`, label: `${r / EMU_PT} pt, ${tr14("Accent color", "Cor de \xEAnfase")} ${a}` }))), (id) => setEffect("glow", id), tr14("No Glow", "Sem Brilho")),
      color(tr14("Color", "Cor"), () => gl()?.color, (c) => setGl({ color: withAlpha(c, alphaOf(gl()?.color)) })),
      num3(tr14("Size", "Tamanho"), "pt", () => gl() ? gl().rad / EMU_PT : void 0, (v) => setGl({ rad: Math.round(v * EMU_PT) }), { min: 0, max: 150 }),
      num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => gl() ? 100 - alphaOf(gl().color) : void 0, (v) => gl() && setGl({ color: withAlpha(noAlpha(gl().color), 100 - v) }), { min: 0, max: 100 })
    ),
    section4(
      tr14("Soft Edges", "Bordas Suaves"),
      false,
      num3(tr14("Size", "Tamanho"), "pt", () => fx()?.softEdge !== void 0 ? fx().softEdge / EMU_PT : 0, (v) => setFormat({ softEdge: v > 0 ? Math.round(v * EMU_PT) : null }), { min: 0, max: 100 })
    ),
    section4(
      tr14("3-D Format", "Formato 3D"),
      false,
      ...bevel("bevelT", tr14("Top bevel", "Bisel superior")),
      ...bevel("bevelB", tr14("Bottom bevel", "Bisel inferior")),
      color(tr14("Depth color", "Cor da profundidade"), () => td()?.extrusionClr, (c) => setTd({ extrusionClr: c })),
      num3(tr14("Depth size", "Tamanho da profundidade"), "pt", () => (td()?.extrusionH ?? 0) / EMU_PT, (v) => setTd({ extrusionH: Math.round(v * EMU_PT) }), { min: 0, max: 1584 }),
      color(tr14("Contour color", "Cor do contorno"), () => td()?.contourClr, (c) => setTd({ contourClr: c })),
      num3(tr14("Contour size", "Tamanho do contorno"), "pt", () => (td()?.contourW ?? 0) / EMU_PT, (v) => setTd({ contourW: Math.round(v * EMU_PT) }), { min: 0, max: 1584 }),
      choice(tr14("Material", "Material"), [["warmMatte", tr14("Warm Matte", "Fosco Quente")], ["matte", tr14("Matte", "Fosco")], ["plastic", tr14("Plastic", "Pl\xE1stico")], ["metal", tr14("Metal", "Metal")], ["dkEdge", tr14("Dark Edge", "Borda Escura")], ["softEdge", tr14("Soft Edge", "Borda Suave")], ["flat", tr14("Flat", "Plano")], ["legacyWireframe", tr14("Wire Frame", "Estrutura de Arame")], ["powder", tr14("Powder", "P\xF3")], ["translucentPowder", tr14("Translucent Powder", "P\xF3 Transl\xFAcido")], ["clear", tr14("Clear", "Transparente")], ["softmetal", tr14("Soft Metal", "Metal Suave")]], () => td()?.prstMaterial ?? "warmMatte", (v) => setTd({ prstMaterial: v })),
      choice(tr14("Lighting", "Ilumina\xE7\xE3o"), [["threePt", tr14("Three Point", "Tr\xEAs Pontos")], ["balanced", tr14("Balanced", "Balanceado")], ["soft", tr14("Soft", "Suave")], ["harsh", tr14("Harsh", "Forte")], ["flood", tr14("Flood", "Inunda\xE7\xE3o")], ["contrasting", tr14("Contrasting", "Contrastante")], ["morning", tr14("Morning", "Manh\xE3")], ["sunrise", tr14("Sunrise", "Nascer do Sol")], ["sunset", tr14("Sunset", "P\xF4r do Sol")], ["chilly", tr14("Chilly", "Frio")], ["freezing", tr14("Freezing", "Congelante")], ["flat", tr14("Flat", "Plano")], ["twoPt", tr14("Two Point", "Dois Pontos")], ["glow", tr14("Glow", "Brilho")], ["brightRoom", tr14("Bright Room", "Sala Iluminada")]], () => td()?.lightRig?.rig ?? "threePt", (v) => setTd({ lightRig: { ...td()?.lightRig ?? { dir: "t" }, rig: v } }))
    ),
    section4(
      tr14("3-D Rotation", "Rota\xE7\xE3o 3D"),
      false,
      presetRow(tr14("Presets", "Predefini\xE7\xF5es"), ROTATION_PRESETS.map((p) => ({ id: p.prst, label: pickLabels(lang, p.label) })), (id) => setEffect("rotation", id), tr14("No Rotation", "Sem Rota\xE7\xE3o")),
      num3(tr14("X Rotation", "Rota\xE7\xE3o X"), "\xB0", () => rot().lon / ANG, (v) => setRot("lon", v), { min: 0, max: 359.9 }),
      num3(tr14("Y Rotation", "Rota\xE7\xE3o Y"), "\xB0", () => rot().lat / ANG, (v) => setRot("lat", v), { min: 0, max: 359.9 }),
      num3(tr14("Z Rotation", "Rota\xE7\xE3o Z"), "\xB0", () => rot().rev / ANG, (v) => setRot("rev", v), { min: 0, max: 359.9 }),
      num3(tr14("Perspective", "Perspectiva"), "\xB0", () => (td()?.camera?.fov ?? 0) / ANG, (v) => setTd({ camera: { ...td()?.camera ?? { prst: "perspectiveFront" }, fov: Math.round(v * ANG) } }), { min: 0, max: 120 })
    )
  );
  const title = el16("input", { type: "text", style: "width:100%;box-sizing:border-box" });
  const descr = el16("textarea", { rows: 4, style: "width:100%;box-sizing:border-box;resize:vertical" });
  title.addEventListener("change", () => {
    setAlt({ title: title.value });
    env.after();
  });
  descr.addEventListener("change", () => {
    setAlt({ text: descr.value });
    env.after();
  });
  for (const i of [title, descr]) i.addEventListener("keydown", (e) => e.stopPropagation());
  syncers.push(() => {
    const st = shape ? ed.selectedShape() : ed.selectedImage();
    const focused = [title, descr].some((i) => document.activeElement === i || ed.shadowRoot?.activeElement === i);
    if (!focused) {
      title.value = st?.format.docPr.title ?? "";
      descr.value = st?.altText ?? "";
    }
    title.disabled = descr.disabled = off();
  });
  const tx = () => ed.selectedShape()?.text;
  const check11 = (label, get, set) => {
    const i = el16("input", { type: "checkbox" });
    i.addEventListener("change", () => {
      set(i.checked);
      env.after();
      sync();
    });
    syncers.push(() => {
      i.checked = !!get();
      i.disabled = off() || !tx();
    });
    return el16("label", { style: "display:flex;align-items:center;gap:6px;font-size:13px" }, i, label);
  };
  const textSection = section4(
    tr14("Text Box", "Caixa de Texto"),
    true,
    choice(tr14("Vertical alignment", "Alinhamento vertical"), [["t", tr14("Top", "Superior")], ["ctr", tr14("Middle", "Meio")], ["b", tr14("Bottom", "Inferior")]], () => tx()?.anchor, (v) => ed.setTextboxOptions({ anchor: v })),
    choice(tr14("Text direction", "Dire\xE7\xE3o do texto"), [["horz", tr14("Horizontal", "Horizontal")], ["vert", tr14("Rotate all text 90\xB0", "Girar todo o texto 90\xB0")], ["vert270", tr14("Rotate all text 270\xB0", "Girar todo o texto 270\xB0")], ["eaVert", tr14("Stacked (East Asian)", "Empilhado (Leste Asi\xE1tico)")], ["wordArtVert", tr14("Stacked", "Empilhado")]], () => tx()?.direction, (v) => ed.setTextboxOptions({ direction: v })),
    check11(tr14("Do not rotate text", "N\xE3o girar o texto"), () => tx()?.upright, (v) => ed.setTextboxOptions({ upright: v })),
    check11(tr14("Resize shape to fit text", "Redimensionar a forma para ajustar o texto"), () => tx()?.autofit === "shape", (v) => ed.setTextboxOptions({ autofit: v ? "shape" : "none" })),
    num3(tr14("Left margin", "Margem esquerda"), "cm", () => tx() ? tx().marginsPt.l / 72 * 2.54 : void 0, (v) => ed.setTextboxOptions({ marginsPt: { l: v / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num3(tr14("Right margin", "Margem direita"), "cm", () => tx() ? tx().marginsPt.r / 72 * 2.54 : void 0, (v) => ed.setTextboxOptions({ marginsPt: { r: v / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num3(tr14("Top margin", "Margem superior"), "cm", () => tx() ? tx().marginsPt.t / 72 * 2.54 : void 0, (v) => ed.setTextboxOptions({ marginsPt: { t: v / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num3(tr14("Bottom margin", "Margem inferior"), "cm", () => tx() ? tx().marginsPt.b / 72 * 2.54 : void 0, (v) => ed.setTextboxOptions({ marginsPt: { b: v / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    check11(tr14("Wrap text in shape", "Quebrar texto na forma"), () => tx()?.wrap, (v) => ed.setTextboxOptions({ wrap: v }))
  );
  const layoutTab = el16(
    "div",
    {},
    ...shape ? [textSection] : [],
    section4(
      tr14("Alt Text", "Texto Alt"),
      true,
      el16("label", { style: "display:flex;flex-direction:column;gap:4px;font-size:13px" }, tr14("Title", "T\xEDtulo"), title),
      el16("label", { style: "display:flex;flex-direction:column;gap:4px;font-size:13px" }, tr14("Description", "Descri\xE7\xE3o"), descr)
    )
  );
  const a14 = () => fmt2()?.blip.a14;
  const cropRect = () => fmt2()?.srcRect ?? { l: 0, t: 0, r: 0, b: 0 };
  const cm = (pt2) => pt2 / 72 * 2.54;
  const pt = (c) => c / 2.54 * 72;
  const geo = () => {
    const st = ed.selectedImage();
    if (!st) return null;
    const s = cropRect();
    const vw = 1 - (s.l + s.r) / 1e5, vh = 1 - (s.t + s.b) / 1e5;
    const fw = st.widthPt / vw, fh = st.heightPt / vh;
    return { fw, fh, ox: (s.r - s.l) / 2e5 * fw, oy: (s.b - s.t) / 2e5 * fh, w: st.widthPt, h: st.heightPt, left: s.l / 1e5 * fw, top: s.t / 1e5 * fh };
  };
  const setCropFrom = (o) => {
    const l = (o.fw / 2 - o.ox - o.w / 2) / o.fw, r = (o.fw / 2 + o.ox - o.w / 2) / o.fw;
    const t2 = (o.fh / 2 - o.oy - o.h / 2) / o.fh, b = (o.fh / 2 + o.oy - o.h / 2) / o.fh;
    ed.setImageCrop({ l, t: t2, r, b });
  };
  const pictureTab = el16(
    "div",
    {},
    section4(
      tr14("Picture Corrections", "Corre\xE7\xF5es de Imagem"),
      true,
      num3(tr14("Sharpness", "Nitidez"), "%", () => (a14()?.sharpen ?? 0) / 1e3, (v) => void ed.setImageAdjust({ sharpen: v / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 }),
      num3(tr14("Brightness", "Brilho"), "%", () => (a14()?.bright ?? 0) / 1e3, (v) => void ed.setImageAdjust({ bright: v / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 }),
      num3(tr14("Contrast", "Contraste"), "%", () => (a14()?.contrast ?? 0) / 1e3, (v) => void ed.setImageAdjust({ contrast: v / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 })
    ),
    section4(
      tr14("Picture Color", "Cor da Imagem"),
      false,
      num3(tr14("Saturation", "Satura\xE7\xE3o"), "%", () => (a14()?.saturation ?? 1e5) / 1e3, (v) => void ed.setImageAdjust({ saturation: v / 100 }).then(() => {
        env.after();
        sync();
      }), { min: 0, max: 400 }),
      num3(tr14("Temperature", "Temperatura"), "K", () => a14()?.colorTemp ?? 6500, (v) => void ed.setImageAdjust({ temperature: v }).then(() => {
        env.after();
        sync();
      }), { min: 1500, max: 11500, step: 100, digits: 0 })
    ),
    section4(
      tr14("Picture Transparency", "Transpar\xEAncia da Imagem"),
      false,
      num3(tr14("Transparency", "Transpar\xEAncia"), "%", () => 100 - (fmt2()?.blip.alphaModFix ?? 1e5) / 1e3, (v) => ed.setImageTransparency(v), { min: 0, max: 100 })
    ),
    section4(
      tr14("Crop", "Cortar"),
      false,
      el16("div", { textContent: tr14("Picture position", "Posi\xE7\xE3o da imagem"), style: "font-size:12px;opacity:.75" }),
      num3(tr14("Width", "Largura"), "cm", () => {
        const g = geo();
        return g ? cm(g.fw) : void 0;
      }, (v) => {
        const g = geo();
        if (g) setCropFrom({ ...g, fw: pt(v), fh: g.fh * (pt(v) / g.fw) });
      }, { min: 0.01, step: 0.1, digits: 2 }),
      num3(tr14("Height", "Altura"), "cm", () => {
        const g = geo();
        return g ? cm(g.fh) : void 0;
      }, (v) => {
        const g = geo();
        if (g) setCropFrom({ ...g, fh: pt(v), fw: g.fw * (pt(v) / g.fh) });
      }, { min: 0.01, step: 0.1, digits: 2 }),
      num3(tr14("Offset X", "Deslocamento X"), "cm", () => {
        const g = geo();
        return g ? cm(g.ox) : void 0;
      }, (v) => {
        const g = geo();
        if (g) setCropFrom({ ...g, ox: pt(v) });
      }, { step: 0.1, digits: 2 }),
      num3(tr14("Offset Y", "Deslocamento Y"), "cm", () => {
        const g = geo();
        return g ? cm(g.oy) : void 0;
      }, (v) => {
        const g = geo();
        if (g) setCropFrom({ ...g, oy: pt(v) });
      }, { step: 0.1, digits: 2 }),
      el16("div", { textContent: tr14("Crop position", "Posi\xE7\xE3o do corte"), style: "font-size:12px;opacity:.75" }),
      num3(tr14("Width", "Largura"), "cm", () => {
        const g = geo();
        return g ? cm(g.w) : void 0;
      }, (v) => ed.setImageSize({ widthPt: pt(v), heightPt: ed.selectedImage().heightPt }), { min: 0.01, step: 0.1, digits: 2 }),
      num3(tr14("Height", "Altura"), "cm", () => {
        const g = geo();
        return g ? cm(g.h) : void 0;
      }, (v) => ed.setImageSize({ heightPt: pt(v), widthPt: ed.selectedImage().widthPt }), { min: 0.01, step: 0.1, digits: 2 })
    )
  );
  const tabs = [
    ["line", tr14("Fill & Line", "Preenchimento e Linha"), "format_color_fill", lineTab],
    ["effects", tr14("Effects", "Efeitos"), "auto_awesome", effectsTab],
    ["layout", tr14("Layout & Properties", "Layout e Propriedades"), "aspect_ratio", layoutTab],
    ...shape ? [] : [["picture", tr14("Picture", "Imagem"), "image", pictureTab]]
  ];
  const head = el16("div", { style: "display:flex;gap:4px;border-bottom:1px solid var(--uo-outline-variant,#ddd);padding-bottom:6px" });
  head.setAttribute("role", "tablist");
  const btns = tabs.map(([id, label, icon, panel]) => {
    const b = el16("button", { type: "button", className: "uo-btn", title: label, style: "min-width:0;padding:4px 8px" });
    b.innerHTML = symbol(icon);
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", label);
    b.dataset["a"] = `pic:format:${id}`;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => show(id));
    panel.setAttribute("role", "tabpanel");
    return b;
  });
  const empty = el16("p", { textContent: shape ? tr14("Select a shape to format it.", "Selecione uma forma para format\xE1-la.") : tr14("Select a picture to format it.", "Selecione uma imagem para format\xE1-la."), style: "margin:0;font-size:13px;opacity:.75" });
  const body = el16("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, head, empty, ...tabs.map((t2) => t2[3]));
  head.append(...btns);
  const show = (id) => {
    tabs.forEach(([tid, , , panel], i) => {
      panel.hidden = tid !== id;
      btns[i].classList.toggle("uo-on", tid === id);
      btns[i].setAttribute("aria-selected", String(tid === id));
    });
  };
  const sync = () => {
    empty.hidden = !!(shape ? ed.selectedShape() : ed.selectedImage());
    for (const s of syncers) s();
  };
  show(shape && tab === "picture" ? "line" : tab);
  openPane({ id: "pic-format", title: shape ? { en: "Format Shape", pt: "Formatar Forma" } : { en: "Format Picture", pt: "Formatar Imagem" }, lang, layer: env.layer, frame: env.frame, width: 320, body, onClose });
  ed.classList.add("uw-has-pane");
  sync();
  return { sync, show };
}

// src/chrome-picture-dialogs.ts
var el17 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
var tr13 = (lang, en, pt) => pickLabels(lang, { en, pt });
var select7 = (name, opts, value) => {
  const s = el17("select", { name });
  for (const [v, t2] of opts) s.append(el17("option", { value: v, textContent: t2 }));
  s.value = opts.some(([v]) => v === value) ? value : opts[0]?.[0] ?? "";
  return s;
};
var check10 = (name, label, on) => {
  const input = el17("input", { type: "checkbox", name, checked: on });
  return { el: el17("label", { className: "uo-check" }, input, label), input };
};
var cmText3 = (lang, pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", tr13(lang, ".", ","))} cm`;
var ptOf = (s) => {
  const n = parseFloat(s.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n / 2.54 * 72 : void 0;
};
var numOf = (s) => {
  const n = parseFloat(s.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : void 0;
};
var cmInput3 = (lang, name, pt) => el17("input", { type: "text", name, inputMode: "decimal", value: cmText3(lang, pt), style: "width:92px" });
var row2 = (...kids) => el17("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
var section3 = (title, ...kids) => el17("fieldset", { style: "display:flex;flex-direction:column;gap:8px;border:1px solid var(--uo-outline-variant,#ccc);border-radius:8px;padding:8px 12px" }, el17("legend", { textContent: title }), ...kids);
var radio5 = (name, value, label, on) => {
  const input = el17("input", { type: "radio", name, value, checked: on });
  return { el: el17("label", { className: "uo-check" }, input, label), input };
};
var H_REFS = (lang) => [
  ["margin", tr13(lang, "Margin", "Margem")],
  ["page", tr13(lang, "Page", "P\xE1gina")],
  ["column", tr13(lang, "Column", "Coluna")],
  ["character", tr13(lang, "Character", "Caractere")],
  ["leftMargin", tr13(lang, "Left Margin", "Margem Esquerda")],
  ["rightMargin", tr13(lang, "Right Margin", "Margem Direita")],
  ["insideMargin", tr13(lang, "Inside Margin", "Margem Interna")],
  ["outsideMargin", tr13(lang, "Outside Margin", "Margem Externa")]
];
var V_REFS = (lang) => [
  ["margin", tr13(lang, "Margin", "Margem")],
  ["page", tr13(lang, "Page", "P\xE1gina")],
  ["paragraph", tr13(lang, "Paragraph", "Par\xE1grafo")],
  ["line", tr13(lang, "Line", "Linha")],
  ["topMargin", tr13(lang, "Top Margin", "Margem Superior")],
  ["bottomMargin", tr13(lang, "Bottom Margin", "Margem Inferior")],
  ["insideMargin", tr13(lang, "Inside Margin", "Margem Interna")],
  ["outsideMargin", tr13(lang, "Outside Margin", "Margem Externa")]
];
var WRAP_STYLES = (lang) => [
  ["inline", tr13(lang, "In line with text", "Alinhado ao texto")],
  ["square", tr13(lang, "Square", "Quadrado")],
  ["tight", tr13(lang, "Tight", "Comprimido")],
  ["through", tr13(lang, "Through", "Atrav\xE9s")],
  ["topAndBottom", tr13(lang, "Top and bottom", "Superior e inferior")],
  ["behind", tr13(lang, "Behind text", "Atr\xE1s do texto")],
  ["front", tr13(lang, "In front of text", "Na frente do texto")]
];
async function pictureLayoutDialog(env, tab) {
  const { ed, lang } = env;
  const st = ed.selectedImage() ?? ed.selectedShape();
  if (!st) return;
  const f = st.format;
  const pt = (emu) => emu / 12700;
  const anchored = !f.inline;
  const ph = f.posH, pv = f.posV;
  const hMode = !ph ? "abs" : ph.align === "inside" || ph.align === "outside" ? "book" : ph.align !== void 0 ? "align" : ph.pct !== void 0 ? "rel" : "abs";
  const vMode = !pv ? "abs" : pv.align !== void 0 ? "align" : pv.pct !== void 0 ? "rel" : "abs";
  const hAlign = select7("hAlign", [["left", tr13(lang, "Left", "Esquerda")], ["center", tr13(lang, "Centered", "Centralizado")], ["right", tr13(lang, "Right", "Direita")]], ph?.align ?? "left");
  const hAlignRef = select7("hAlignRef", H_REFS(lang), ph?.relativeFrom ?? "column");
  const hBook = select7("hBook", [["inside", tr13(lang, "Inside", "Interna")], ["outside", tr13(lang, "Outside", "Externa")]], ph?.align ?? "inside");
  const hBookRef = select7("hBookRef", [["margin", tr13(lang, "Margin", "Margem")], ["page", tr13(lang, "Page", "P\xE1gina")]], ph?.relativeFrom ?? "margin");
  const hAbs = cmInput3(lang, "hAbs", pt(ph?.offset ?? 0));
  const hAbsRef = select7("hAbsRef", H_REFS(lang), ph?.relativeFrom ?? "column");
  const hRel = el17("input", { type: "text", name: "hRel", value: `${(ph?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const hRelRef = select7("hRelRef", H_REFS(lang).filter(([k]) => k !== "column" && k !== "character"), ph?.relativeFrom ?? "margin");
  const vAlign = select7("vAlign", [["top", tr13(lang, "Top", "Superior")], ["center", tr13(lang, "Centered", "Centralizado")], ["bottom", tr13(lang, "Bottom", "Inferior")], ["inside", tr13(lang, "Inside", "Interna")], ["outside", tr13(lang, "Outside", "Externa")]], pv?.align ?? "top");
  const vAlignRef = select7("vAlignRef", V_REFS(lang).filter(([k]) => k !== "paragraph"), pv?.relativeFrom ?? "margin");
  const vAbs = cmInput3(lang, "vAbs", pt(pv?.offset ?? 0));
  const vAbsRef = select7("vAbsRef", V_REFS(lang), pv?.relativeFrom ?? "paragraph");
  const vRel = el17("input", { type: "text", name: "vRel", value: `${(pv?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const vRelRef = select7("vRelRef", V_REFS(lang).filter(([k]) => k !== "paragraph" && k !== "line"), pv?.relativeFrom ?? "margin");
  const hR = { align: radio5("h", "align", tr13(lang, "Alignment", "Alinhamento"), hMode === "align"), book: radio5("h", "book", tr13(lang, "Book layout", "Layout do livro"), hMode === "book"), abs: radio5("h", "abs", tr13(lang, "Absolute position", "Posi\xE7\xE3o absoluta"), hMode === "abs"), rel: radio5("h", "rel", tr13(lang, "Relative position", "Posi\xE7\xE3o relativa"), hMode === "rel") };
  const vR = { align: radio5("v", "align", tr13(lang, "Alignment", "Alinhamento"), vMode === "align"), abs: radio5("v", "abs", tr13(lang, "Absolute position", "Posi\xE7\xE3o absoluta"), vMode === "abs"), rel: radio5("v", "rel", tr13(lang, "Relative position", "Posi\xE7\xE3o relativa"), vMode === "rel") };
  const moveWith = check10("moveWith", tr13(lang, "Move object with text", "Mover objeto com texto"), st.moveWithText);
  const lockAnchor = check10("lockAnchor", tr13(lang, "Lock anchor", "Bloquear \xE2ncora"), f.locked);
  const overlap = check10("overlap", tr13(lang, "Allow overlap", "Permitir sobreposi\xE7\xE3o"), f.allowOverlap);
  const inCell = check10("inCell", tr13(lang, "Layout in table cell", "Layout na c\xE9lula da tabela"), f.layoutInCell);
  const rel = tr13(lang, "relative to", "relativo a");
  const posBody = el17(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(
      tr13(lang, "Horizontal", "Horizontal"),
      row2(hR.align.el, hAlign, rel, hAlignRef),
      row2(hR.book.el, hBook, tr13(lang, "of", "de"), hBookRef),
      row2(hR.abs.el, hAbs, tr13(lang, "to the right of", "\xE0 direita de"), hAbsRef),
      row2(hR.rel.el, hRel, rel, hRelRef)
    ),
    section3(
      tr13(lang, "Vertical", "Vertical"),
      row2(vR.align.el, vAlign, rel, vAlignRef),
      row2(vR.abs.el, vAbs, tr13(lang, "below", "abaixo de"), vAbsRef),
      row2(vR.rel.el, vRel, rel, vRelRef)
    ),
    section3(tr13(lang, "Options", "Op\xE7\xF5es"), row2(moveWith.el, overlap.el), row2(lockAnchor.el, inCell.el))
  );
  for (const i of posBody.querySelectorAll("input,select")) i.disabled = !anchored;
  const wrapR = WRAP_STYLES(lang).map(([k, t2]) => ({ k, ...radio5("wrap", k, t2, f.wrap === k) }));
  const sides = [["bothSides", tr13(lang, "Both sides", "Ambos os lados")], ["left", tr13(lang, "Left only", "Somente \xE0 esquerda")], ["right", tr13(lang, "Right only", "Somente \xE0 direita")], ["largest", tr13(lang, "Largest only", "Somente no maior")]].map(([k, t2]) => ({ k, ...radio5("side", k, t2, f.wrapText === k) }));
  const dT = cmInput3(lang, "dT", pt(f.dist.t)), dB = cmInput3(lang, "dB", pt(f.dist.b)), dL = cmInput3(lang, "dL", pt(f.dist.l)), dR = cmInput3(lang, "dR", pt(f.dist.r));
  const syncWrap = () => {
    const w = wrapR.find((r) => r.input.checked)?.k ?? f.wrap;
    const sideOk = w === "square" || w === "tight" || w === "through";
    for (const s of sides) s.input.disabled = !sideOk;
    dT.disabled = dB.disabled = !(w === "square" || w === "topAndBottom");
    dL.disabled = dR.disabled = !sideOk;
  };
  for (const r of wrapR) r.input.addEventListener("change", syncWrap);
  syncWrap();
  const wrapBody = el17(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr13(lang, "Wrapping style", "Estilo de quebra autom\xE1tica"), el17("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:6px" }, ...wrapR.map((r) => r.el))),
    section3(tr13(lang, "Wrap text", "Quebra autom\xE1tica de texto"), row2(...sides.map((s) => s.el))),
    section3(
      tr13(lang, "Distance from text", "Dist\xE2ncia do texto"),
      row2(tr13(lang, "Top", "Superior"), dT, tr13(lang, "Left", "Esquerda"), dL),
      row2(tr13(lang, "Bottom", "Inferior"), dB, tr13(lang, "Right", "Direita"), dR)
    )
  );
  const nat = st.naturalPt;
  const hAbsSz = cmInput3(lang, "hAbsSz", st.heightPt), wAbsSz = cmInput3(lang, "wAbsSz", st.widthPt);
  const relV = f.sizeRelV?.pct ? f.sizeRelV : null, relH = f.sizeRelH?.pct ? f.sizeRelH : null;
  const hRelSz = el17("input", { type: "text", name: "hRelSz", value: `${(relV?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const wRelSz = el17("input", { type: "text", name: "wRelSz", value: `${(relH?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const sizeRefsV = [["margin", tr13(lang, "Margin", "Margem")], ["page", tr13(lang, "Page", "P\xE1gina")], ["topMargin", tr13(lang, "Top Margin", "Margem Superior")], ["bottomMargin", tr13(lang, "Bottom Margin", "Margem Inferior")], ["insideMargin", tr13(lang, "Inside Margin", "Margem Interna")], ["outsideMargin", tr13(lang, "Outside Margin", "Margem Externa")]];
  const sizeRefsH = [["margin", tr13(lang, "Margin", "Margem")], ["page", tr13(lang, "Page", "P\xE1gina")], ["leftMargin", tr13(lang, "Left Margin", "Margem Esquerda")], ["rightMargin", tr13(lang, "Right Margin", "Margem Direita")], ["insideMargin", tr13(lang, "Inside Margin", "Margem Interna")], ["outsideMargin", tr13(lang, "Outside Margin", "Margem Externa")]];
  const hRelRefSz = select7("hRelRefSz", sizeRefsV, relV?.relativeFrom ?? "margin");
  const wRelRefSz = select7("wRelRefSz", sizeRefsH, relH?.relativeFrom ?? "margin");
  const szH = { abs: radio5("szh", "abs", tr13(lang, "Absolute", "Absoluta"), !relV), rel: radio5("szh", "rel", tr13(lang, "Relative", "Relativa"), !!relV) };
  const szW = { abs: radio5("szw", "abs", tr13(lang, "Absolute", "Absoluta"), !relH), rel: radio5("szw", "rel", tr13(lang, "Relative", "Relativa"), !!relH) };
  const rotIn = el17("input", { type: "number", name: "rot", min: "-3600", max: "3600", step: "1", value: String(Math.round(st.rotation * 10) / 10), style: "width:80px" });
  const relOrig = check10("relOrig", tr13(lang, "Relative to original picture size", "Relativo ao tamanho original da imagem"), !!nat);
  const lockAsp = check10("lockAsp", tr13(lang, "Lock aspect ratio", "Bloquear propor\xE7\xE3o"), st.lockAspect);
  const base = () => relOrig.input.checked && nat ? nat : { w: st.widthPt, h: st.heightPt };
  const scH = el17("input", { type: "text", name: "scH", value: "", style: "width:72px" });
  const scW = el17("input", { type: "text", name: "scW", value: "", style: "width:72px" });
  const showScale = () => {
    const b = base();
    const h2 = ptOf(hAbsSz.value) ?? st.heightPt, w = ptOf(wAbsSz.value) ?? st.widthPt;
    scH.value = `${Math.round(h2 / b.h * 100)}%`;
    scW.value = `${Math.round(w / b.w * 100)}%`;
  };
  showScale();
  relOrig.input.addEventListener("change", showScale);
  hAbsSz.addEventListener("change", () => {
    const h2 = ptOf(hAbsSz.value);
    if (h2 !== void 0 && lockAsp.input.checked && st.heightPt) wAbsSz.value = cmText3(lang, st.widthPt * h2 / st.heightPt);
    showScale();
  });
  wAbsSz.addEventListener("change", () => {
    const w = ptOf(wAbsSz.value);
    if (w !== void 0 && lockAsp.input.checked && st.widthPt) hAbsSz.value = cmText3(lang, st.heightPt * w / st.widthPt);
    showScale();
  });
  const fromScale = (which) => {
    const b = base();
    const p = numOf((which === "h" ? scH : scW).value);
    if (p === void 0) return;
    if (which === "h" || lockAsp.input.checked) hAbsSz.value = cmText3(lang, b.h * p / 100);
    if (which === "w" || lockAsp.input.checked) wAbsSz.value = cmText3(lang, b.w * p / 100);
    showScale();
  };
  scH.addEventListener("change", () => fromScale("h"));
  scW.addEventListener("change", () => fromScale("w"));
  const reset = el17("button", { type: "button", className: "uo-btn", textContent: tr13(lang, "Reset", "Redefinir"), disabled: !nat });
  reset.addEventListener("click", () => {
    if (!nat) return;
    hAbsSz.value = cmText3(lang, nat.h);
    wAbsSz.value = cmText3(lang, nat.w);
    rotIn.value = "0";
    szH.abs.input.checked = szW.abs.input.checked = true;
    showScale();
  });
  for (const i of [hRelSz, hRelRefSz, wRelSz, wRelRefSz, szH.rel.input, szW.rel.input]) i.disabled = !anchored;
  const sizeBody = el17(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr13(lang, "Height", "Altura"), row2(szH.abs.el, hAbsSz), row2(szH.rel.el, hRelSz, rel, hRelRefSz)),
    section3(tr13(lang, "Width", "Largura"), row2(szW.abs.el, wAbsSz), row2(szW.rel.el, wRelSz, rel, wRelRefSz)),
    section3(tr13(lang, "Rotate", "Girar"), row2(tr13(lang, "Rotation:", "Rota\xE7\xE3o:"), rotIn, "\xB0")),
    section3(tr13(lang, "Scale", "Escala"), row2(tr13(lang, "Height:", "Altura:"), scH, tr13(lang, "Width:", "Largura:"), scW), lockAsp.el, relOrig.el),
    section3(tr13(lang, "Original size", "Tamanho original"), row2(
      el17("span", { textContent: `${tr13(lang, "Height:", "Altura:")} ${nat ? cmText3(lang, nat.h) : "\u2014"}` }),
      el17("span", { textContent: `${tr13(lang, "Width:", "Largura:")} ${nat ? cmText3(lang, nat.w) : "\u2014"}` }),
      reset
    ))
  );
  const tabs = dialogTabs([
    { id: "position", label: tr13(lang, "Position", "Posi\xE7\xE3o"), body: posBody },
    { id: "wrap", label: tr13(lang, "Text Wrapping", "Quebra Autom\xE1tica de Texto"), body: wrapBody },
    { id: "size", label: tr13(lang, "Size", "Tamanho"), body: sizeBody }
  ], tab);
  const L15 = env.app.ui.L;
  const h = openDialog({
    title: tr13(lang, "Layout", "Layout"),
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 560,
    actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const o = {};
  const wrap = wrapR.find((r) => r.input.checked)?.k;
  if (wrap && wrap !== f.wrap) o.wrap = wrap;
  const willFloat = (wrap ?? f.wrap) !== "inline";
  if (willFloat) {
    const side = sides.find((s) => s.input.checked)?.k;
    if (side && side !== f.wrapText) o.wrapText = side;
    const dist = {};
    for (const [k, inp, cur] of [["t", dT, f.dist.t], ["b", dB, f.dist.b], ["l", dL, f.dist.l], ["r", dR, f.dist.r]]) {
      const v = ptOf(inp.value);
      if (v !== void 0 && Math.abs(v - cur / 12700) > 0.01) dist[k] = v;
    }
    if (Object.keys(dist).length) o.distPt = dist;
  }
  if (anchored) {
    const hm = Object.entries(hR).find(([, r]) => r.input.checked)?.[0];
    if (hm === "align") o.posH = { relativeFrom: hAlignRef.value, align: hAlign.value };
    else if (hm === "book") o.posH = { relativeFrom: hBookRef.value, align: hBook.value };
    else if (hm === "rel") o.posH = { relativeFrom: hRelRef.value, pct: numOf(hRel.value) ?? 0 };
    else o.posH = { relativeFrom: hAbsRef.value, offsetPt: ptOf(hAbs.value) ?? 0 };
    const vm = Object.entries(vR).find(([, r]) => r.input.checked)?.[0];
    if (vm === "align") o.posV = { relativeFrom: vAlignRef.value, align: vAlign.value };
    else if (vm === "rel") o.posV = { relativeFrom: vRelRef.value, pct: numOf(vRel.value) ?? 0 };
    else o.posV = { relativeFrom: vAbsRef.value, offsetPt: ptOf(vAbs.value) ?? 0 };
    o.lockAnchor = lockAnchor.input.checked;
    o.allowOverlap = overlap.input.checked;
    o.layoutInCell = inCell.input.checked;
    if (moveWith.input.checked !== st.moveWithText && vm === "abs") o.posV = { relativeFrom: moveWith.input.checked ? "paragraph" : "page", offsetPt: ptOf(vAbs.value) ?? 0 };
    o.relHeight = szH.rel.input.checked ? { relativeFrom: hRelRefSz.value, pct: numOf(hRelSz.value) ?? 0 } : relV ? null : void 0;
    o.relWidth = szW.rel.input.checked ? { relativeFrom: wRelRefSz.value, pct: numOf(wRelSz.value) ?? 0 } : relH ? null : void 0;
    if (o.relHeight === void 0) delete o.relHeight;
    if (o.relWidth === void 0) delete o.relWidth;
  }
  const hh = ptOf(hAbsSz.value), ww = ptOf(wAbsSz.value);
  if (hh !== void 0 && Math.abs(hh - st.heightPt) > 0.01) o.heightPt = hh;
  if (ww !== void 0 && Math.abs(ww - st.widthPt) > 0.01) o.widthPt = ww;
  if (lockAsp.input.checked !== st.lockAspect) o.lockAspect = lockAsp.input.checked;
  const rot = numOf(rotIn.value);
  if (rot !== void 0 && Math.abs(rot - st.rotation) > 0.01) o.rotation = rot;
  if (ed.selectedImage()) ed.setImageLayout(o);
  else ed.setShapeLayout(o);
}
async function pictureCompressDialog(env) {
  const { ed, lang } = env;
  if (!ed.selectedImage()) return;
  const only = check10("only", tr13(lang, "Apply only to this picture", "Aplicar somente a esta imagem"), true);
  const crop = check10("crop", tr13(lang, "Delete cropped areas of pictures", "Excluir \xE1reas cortadas de imagens"), true);
  const RES = [
    ["hifi", Infinity, "High fidelity: preserves quality of the original picture", "Alta fidelidade: preserva a qualidade da imagem original"],
    ["hd", 330, "HD (330 ppi): good quality for high-definition (HD) displays", "HD (330 ppi): boa qualidade para monitores de alta defini\xE7\xE3o (HD)"],
    ["print", 220, "Print (220 ppi): excellent quality on most printers and screens", "Impress\xE3o (220 ppi): excelente qualidade na maioria das impressoras e telas"],
    ["web", 150, "Web (150 ppi): good for web pages and projectors", "Web (150 ppi): bom para p\xE1ginas da Web e projetores"],
    ["email", 96, "E-mail (96 ppi): minimize document size for sharing", "Email (96 ppi): minimizar o tamanho do documento para compartilhamento"],
    ["default", 220, "Use default resolution", "Usar a resolu\xE7\xE3o padr\xE3o"]
  ];
  const res = RES.map(([k, ppi2, en, pt]) => ({ ppi: ppi2, ...radio5("res", k, tr13(lang, en, pt), k === "default") }));
  const body = el17(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr13(lang, "Compression options:", "Op\xE7\xF5es de compacta\xE7\xE3o:"), only.el, crop.el),
    section3(tr13(lang, "Resolution:", "Resolu\xE7\xE3o:"), ...res.map((r) => r.el))
  );
  const L15 = env.app.ui.L;
  const h = openDialog({
    title: tr13(lang, "Compress Pictures", "Compactar Imagens"),
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h.result !== "ok") return;
  const ppi = res.find((r) => r.input.checked)?.ppi ?? 220;
  await ed.compressImages({ ppi, deleteCropped: crop.input.checked, all: !only.input.checked });
}
var PictureUI = class {
  constructor(env) {
    this.env = env;
  }
  env;
  alt = null;
  sel = null;
  fmt = null;
  fmtTab = "line";
  get altOpen() {
    return !!this.alt;
  }
  get selectionOpen() {
    return !!this.sel;
  }
  get formatOpen() {
    return !!this.fmt;
  }
  sync() {
    this.alt?.sync();
    this.sel?.sync();
    this.fmt?.sync();
  }
  /** Painel Formatar Imagem na guia pedida (aberto em outra guia: troca de guia). */
  toggleFormat(tab) {
    if (this.fmt && this.fmtTab !== tab) {
      this.fmtTab = tab;
      this.fmt.show(tab);
      return;
    }
    this.fmtTab = tab;
    this.fmt = toggleFormatPane(this.env, tab, () => {
      this.fmt = null;
      this.env.ed.classList.remove("uw-has-pane");
      this.env.after();
    });
  }
  /** Painel de Seleção: as imagens flutuantes da frente para trás — clicar seleciona,
   *  duplo clique renomeia, o olho mostra/oculta; Mostrar/Ocultar Tudo e as setas
   *  de ordem (Avançar/Recuar) no topo. */
  toggleSelection() {
    const { ed, lang } = this.env;
    const cur = paneOpen("pic-sel");
    if (cur) {
      cur.close();
      return;
    }
    const btn3 = (label, icon, run) => {
      const b = el17("button", { type: "button", className: "uo-btn", title: label, style: "min-width:0;padding:2px 6px;display:inline-flex;align-items:center;gap:4px" });
      b.innerHTML = symbol(icon) + (icon === "keyboard_arrow_up" || icon === "keyboard_arrow_down" ? "" : `<span>${label}</span>`);
      b.setAttribute("aria-label", label);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        run();
        this.env.after();
        sync();
      });
      return b;
    };
    const showAll = btn3(tr13(lang, "Show All", "Mostrar Tudo"), "visibility", () => ed.setPaneItemHidden(null, false));
    const hideAll = btn3(tr13(lang, "Hide All", "Ocultar Tudo"), "visibility_off", () => ed.setPaneItemHidden(null, true));
    const up = btn3(tr13(lang, "Bring Forward", "Avan\xE7ar"), "keyboard_arrow_up", () => ed.arrangeImage("forward"));
    const down = btn3(tr13(lang, "Send Backward", "Recuar"), "keyboard_arrow_down", () => ed.arrangeImage("backward"));
    const bar2 = el17("div", { style: "display:flex;gap:4px;align-items:center;flex-wrap:wrap" }, showAll, hideAll, el17("span", { style: "flex:1" }), up, down);
    const list = el17("div", { style: "display:flex;flex-direction:column;gap:1px" });
    list.setAttribute("role", "listbox");
    const empty = el17("p", { textContent: tr13(lang, "There are no floating objects in this document.", "N\xE3o h\xE1 objetos flutuantes neste documento."), style: "margin:0;font-size:13px;opacity:.75" });
    const body = el17("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, bar2, list, empty);
    let editing = false;
    const sync = () => {
      if (editing) return;
      const items = ed.selectionPaneItems();
      empty.hidden = items.length > 0;
      const off = ed.isProtected();
      showAll.disabled = hideAll.disabled = off || !items.length;
      const sel4 = items.find((i) => i.selected);
      up.disabled = down.disabled = off || !sel4;
      list.replaceChildren(...items.map((it) => {
        const row3 = el17("div", { className: "uo-sel-row", style: `display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:6px;cursor:default;${it.selected ? "background:var(--uo-secondary-container,#d3e3fd);" : ""}${it.hidden ? "opacity:.55;" : ""}` });
        row3.setAttribute("role", "option");
        row3.setAttribute("aria-selected", String(it.selected));
        row3.dataset["key"] = it.key;
        const name = el17("span", { textContent: it.name || "\u2014", style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px" });
        const eye = el17("button", { type: "button", className: "uo-btn", title: it.hidden ? tr13(lang, "Show", "Mostrar") : tr13(lang, "Hide", "Ocultar"), style: "min-width:0;padding:2px" });
        eye.innerHTML = symbol(it.hidden ? "visibility_off" : "visibility");
        eye.disabled = off;
        eye.addEventListener("mousedown", (e) => e.preventDefault());
        eye.addEventListener("click", (e) => {
          e.stopPropagation();
          ed.setPaneItemHidden(it.key, !it.hidden);
          this.env.after();
          sync();
        });
        row3.addEventListener("mousedown", (e) => e.preventDefault());
        row3.addEventListener("click", (e) => {
          ed.selectPaneItem(it.key, e.ctrlKey || e.shiftKey);
          this.env.after();
          sync();
        });
        row3.addEventListener("dblclick", () => {
          if (off) return;
          editing = true;
          const input = el17("input", { type: "text", value: it.name, style: "flex:1;font-size:13px;min-width:0" });
          const done = (ok) => {
            if (!editing) return;
            editing = false;
            if (ok) ed.renamePaneItem(it.key, input.value);
            this.env.after();
            sync();
          };
          input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") done(true);
            if (e.key === "Escape") done(false);
          });
          input.addEventListener("blur", () => done(true));
          name.replaceWith(input);
          input.focus();
          input.select();
        });
        row3.append(name, eye);
        return row3;
      }));
    };
    openPane({
      id: "pic-sel",
      title: { en: "Selection", pt: "Sele\xE7\xE3o" },
      lang,
      layer: this.env.layer,
      frame: this.env.frame,
      width: 280,
      body,
      onClose: () => {
        this.sel = null;
        ed.classList.remove("uw-has-pane");
        this.env.after();
      }
    });
    ed.classList.add("uw-has-pane");
    this.sel = { sync };
    sync();
  }
  /** Painel Texto Alt: descrição + "Marcar como decorativa". */
  toggleAlt() {
    const { ed, lang } = this.env;
    const cur = paneOpen("pic-alt");
    if (cur) {
      cur.close();
      return;
    }
    const intro = el17("p", { textContent: tr13(lang, "How would you describe this object and its context to someone who is blind or has low vision?", "Como voc\xEA descreveria este objeto e seu contexto para algu\xE9m que \xE9 cego ou tem baixa vis\xE3o?"), style: "margin:0 0 8px;font-size:13px" });
    const text = el17("textarea", { rows: 6, style: "width:100%;box-sizing:border-box;resize:vertical" });
    text.dataset["a"] = "pic:alt:text";
    const deco = check10("decorative", tr13(lang, "Mark as decorative", "Marcar como decorativa"), false);
    const note = el17("p", { textContent: tr13(lang, "Decorative objects add visual interest but aren\u2019t informative (e.g., stylistic borders). People using screen readers won\u2019t hear these.", "Objetos decorativos acrescentam interesse visual, mas n\xE3o s\xE3o informativos (por exemplo, bordas estil\xEDsticas). Quem usa leitor de tela n\xE3o os ouvir\xE1."), style: "margin:4px 0 0;font-size:12px;opacity:.75" });
    const empty = el17("p", { textContent: tr13(lang, "Select a picture or shape to add alt text.", "Selecione uma imagem ou forma para adicionar o texto alt."), style: "margin:0;font-size:13px;opacity:.75" });
    const body = el17("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, intro, text, deco.el, note, empty);
    let last = null;
    const sync = () => {
      const st = ed.selectedImage() ?? ed.selectedShape();
      empty.hidden = !!st;
      intro.hidden = text.hidden = deco.el.hidden = note.hidden = !st;
      const off = !st || ed.isProtected();
      deco.input.disabled = off;
      const key = st?.format ?? null;
      const focused = document.activeElement === text || ed.shadowRoot?.activeElement === text;
      if (key !== last && !focused) {
        last = key;
        text.value = st?.altText ?? "";
        deco.input.checked = !!st?.decorative;
      }
      text.disabled = off || deco.input.checked;
    };
    const setAlt = (o) => {
      if (ed.selectedImage()) ed.setImageAltText(o);
      else ed.setShapeAltText(o);
    };
    text.addEventListener("change", () => {
      setAlt({ text: text.value });
    });
    deco.input.addEventListener("change", () => {
      setAlt({ decorative: deco.input.checked });
      sync();
    });
    openPane({
      id: "pic-alt",
      title: { en: "Alt Text", pt: "Texto Alt" },
      lang,
      layer: this.env.layer,
      frame: this.env.frame,
      width: 300,
      body,
      onClose: () => {
        this.alt = null;
        ed.classList.remove("uw-has-pane");
        this.env.after();
      }
    });
    ed.classList.add("uw-has-pane");
    this.alt = { sync };
    sync();
  }
};

// src/chrome-labels.ts
var LABELS2 = {
  en: {
    untitled: "Untitled document",
    docTitle: "Document title",
    decimal: ".",
    status: (page, pages, words) => `Page ${page} of ${pages} \xB7 ${words} word${words === 1 ? "" : "s"}`,
    saved: (fmt2) => `Saved \u2713 (${fmt2})`,
    autosaved: "Autosaved \u2713",
    autosavePending: "Autosave pending \u2014 save once to choose the file",
    autosaveOff: "Autosave off",
    autosaveEvery: (n) => `Autosave every ${n} min`,
    invalidDoc: (n) => `"${n}" is not a valid document or is corrupted`,
    notDoc: (n) => `"${n}" doesn't look like a .docx or .odt`,
    dropHere: "Drop the .docx to open",
    exported: (k) => `${k} downloaded \u2713`,
    protectedTitle: "PROTECTED VIEW",
    protectedText: "Be careful \u2014 files from the Internet can contain viruses. Unless you need to edit, it\u2019s safer to stay in Protected View.",
    enableEditing: "Enable Editing",
    editingEnabled: "Editing enabled",
    editingEnabledSaved: "Editing enabled \u2014 saved \u2713",
    blocked: "Protected document \u2014 click \u201CEnable Editing\u201D to edit",
    fieldsTitle: "Security Warning",
    fieldsText: "This document contains fields that may refer to other content (table of contents, dates, page numbers). Do you want to update them?",
    updateFields: "Update Fields",
    notNow: "Not now",
    fieldsUpdated: "Fields updated \u2713",
    noFields: "No field to update",
    tocUpdated: "Table of contents updated \u2713",
    noToc: "The document has no table of contents",
    noTof: "The document has no table of figures",
    find: "Find",
    replaceWith: "Replace with",
    findNext: "Find next",
    replace: "Replace",
    replaceAll: "Replace all",
    findTitle: "Find and replace",
    replaced: (n) => `${n} replacement${n === 1 ? "" : "s"}`,
    notFound: "No matches",
    commentTitle: "New comment",
    commentText: "Comment",
    commentAdd: "Comment",
    selectToComment: "Select some text to comment on",
    comments: "Comments",
    deleteComment: "Delete comment",
    anonymous: "Anonymous",
    commentAdded: "Comment added \u2713",
    linkTitle: "Insert link",
    linkUrl: "Address (URL)",
    linkApply: "Apply",
    compareWith: "Compare with\u2026",
    compareCurrent: (n) => `${n} (current)`,
    stillLoading: "The editor is still loading \u2014 try again in a moment",
    readFailed: "Could not read the selected file",
    compareNeedsFs: "Comparison needs a browser with File System Access",
    compareStats: (s) => `Comparison: +${s.inserted} \u2212${s.deleted} ~${s.changed} \u270E${s.formatOnly}`,
    notValidDocx: (n) => `"${n}" is not a valid .docx`,
    closeCompare: "Close comparison",
    wordCountTitle: "Word count",
    pages: "Pages",
    words: "Words",
    chars: "Characters (with spaces)",
    shortcutsTitle: "Keyboard shortcuts",
    aboutTitle: "About",
    aboutText: "Universal Write \u2014 a .docx editor web component with high-fidelity canvas rendering.",
    fontDlg: "Font",
    paraDlg: "Paragraph",
    pageDlg: "Page Setup",
    size: "Size",
    effects: "Effects",
    color: "Color",
    alignment: "Alignment",
    specialIndent: "Special indent",
    before: "Spacing before (pt)",
    after: "Spacing after (pt)",
    lineSpacing: "Line spacing",
    orientation: "Orientation",
    paper: "Paper size",
    margins: "Margins",
    charSpacing: "Character spacing",
    apply: "OK",
    cancel: "Cancel",
    fontAccessDenied: "The browser did not allow access to the installed fonts",
    fontAccessOk: (n) => `${n} installed fonts available`,
    automatic: "Automatic",
    noColor: "No color",
    moreColors: "More colors\u2026",
    rows: (r, c) => `${c} \xD7 ${r} table`,
    authorTitle: "Your name",
    authorText: "Name shown on your changes and comments",
    authorOk: "OK",
    trackOn: "Track Changes on",
    trackOff: "Track Changes off",
    revPane: "Revisions",
    revCount: (n) => `${n} revision${n === 1 ? "" : "s"}`,
    revNone: "No revisions",
    revInserted: "Inserted",
    revDeleted: "Deleted",
    revFormatted: "Formatted",
    revMovedFrom: "Moved (from)",
    revMovedTo: "Moved (to)",
    revParaInserted: "Inserted paragraph",
    revParaDeleted: "Deleted paragraph",
    revInsertions: "Insertions",
    revDeletions: "Deletions",
    revMoves: "Moves",
    revFormatting: "Formatting",
    revComments: "Comments",
    revAccept: "Accept",
    revReject: "Reject",
    acceptAt: (k) => `Accept ${k}`,
    rejectAt: (k) => `Reject ${k}`,
    kInsertion: "Insertion",
    kDeletion: "Deletion",
    kFormat: "Formatting Change",
    kMove: "Move",
    revAccepted: (n) => `${n} change${n === 1 ? "" : "s"} accepted`,
    revRejected: (n) => `${n} change${n === 1 ? "" : "s"} rejected`,
    noMoreRevisions: "The document contains no revisions"
  },
  pt: {
    untitled: "Documento sem t\xEDtulo",
    docTitle: "T\xEDtulo do documento",
    decimal: ",",
    status: (page, pages, words) => `P\xE1gina ${page} de ${pages} \xB7 ${words} palavra${words === 1 ? "" : "s"}`,
    saved: (fmt2) => `Salvo \u2713 (${fmt2})`,
    autosaved: "Salvamento autom\xE1tico \u2713",
    autosavePending: "Salvamento autom\xE1tico pendente \u2014 salve uma vez para escolher o arquivo",
    autosaveOff: "Salvamento autom\xE1tico desligado",
    autosaveEvery: (n) => `Salvamento autom\xE1tico a cada ${n} min`,
    invalidDoc: (n) => `"${n}" n\xE3o \xE9 um documento v\xE1lido ou est\xE1 corrompido`,
    notDoc: (n) => `"${n}" n\xE3o parece um .docx nem um .odt`,
    dropHere: "Solte o .docx para abrir",
    exported: (k) => `${k} baixado \u2713`,
    protectedTitle: "MODO DE EXIBI\xC7\xC3O PROTEGIDO",
    protectedText: "Cuidado \u2014 arquivos da Internet podem conter v\xEDrus. A menos que voc\xEA precise editar, \xE9 mais seguro permanecer no Modo de Exibi\xE7\xE3o Protegido.",
    enableEditing: "Habilitar Edi\xE7\xE3o",
    editingEnabled: "Edi\xE7\xE3o habilitada",
    editingEnabledSaved: "Edi\xE7\xE3o habilitada \u2014 salvo \u2713",
    blocked: "Documento protegido \u2014 clique em \u201CHabilitar Edi\xE7\xE3o\u201D para editar",
    fieldsTitle: "Aviso de Seguran\xE7a",
    fieldsText: "Este documento cont\xE9m campos que podem se referir a outro conte\xFAdo (sum\xE1rio, datas, n\xFAmeros de p\xE1gina). Deseja atualiz\xE1-los?",
    updateFields: "Atualizar Campos",
    notNow: "Agora n\xE3o",
    fieldsUpdated: "Campos atualizados \u2713",
    noFields: "Nenhum campo para atualizar",
    tocUpdated: "Sum\xE1rio atualizado \u2713",
    noToc: "O documento n\xE3o tem sum\xE1rio",
    noTof: "O documento n\xE3o tem \xEDndice de ilustra\xE7\xF5es",
    find: "Localizar",
    replaceWith: "Substituir por",
    findNext: "Localizar pr\xF3xima",
    replace: "Substituir",
    replaceAll: "Substituir tudo",
    findTitle: "Localizar e substituir",
    replaced: (n) => `${n} substitui\xE7${n === 1 ? "\xE3o" : "\xF5es"}`,
    notFound: "Nenhuma ocorr\xEAncia",
    commentTitle: "Novo coment\xE1rio",
    commentText: "Coment\xE1rio",
    commentAdd: "Comentar",
    selectToComment: "Selecione um trecho para comentar",
    comments: "Coment\xE1rios",
    deleteComment: "Excluir coment\xE1rio",
    anonymous: "An\xF4nimo",
    commentAdded: "Coment\xE1rio inserido \u2713",
    linkTitle: "Inserir link",
    linkUrl: "Endere\xE7o (URL)",
    linkApply: "Aplicar",
    compareWith: "Comparar com\u2026",
    compareCurrent: (n) => `${n} (atual)`,
    stillLoading: "O editor ainda est\xE1 carregando \u2014 tente de novo em instantes",
    readFailed: "N\xE3o foi poss\xEDvel ler o arquivo escolhido",
    compareNeedsFs: "A compara\xE7\xE3o precisa de um navegador com File System Access",
    compareStats: (s) => `Compara\xE7\xE3o: +${s.inserted} \u2212${s.deleted} ~${s.changed} \u270E${s.formatOnly}`,
    notValidDocx: (n) => `"${n}" n\xE3o \xE9 um .docx v\xE1lido`,
    closeCompare: "Fechar compara\xE7\xE3o",
    wordCountTitle: "Contar palavras",
    pages: "P\xE1ginas",
    words: "Palavras",
    chars: "Caracteres (com espa\xE7os)",
    shortcutsTitle: "Atalhos de teclado",
    aboutTitle: "Sobre",
    aboutText: "Universal Write \u2014 web component de edi\xE7\xE3o de .docx com renderiza\xE7\xE3o em canvas de alta fidelidade.",
    fontDlg: "Fonte",
    paraDlg: "Par\xE1grafo",
    pageDlg: "Configurar P\xE1gina",
    size: "Tamanho",
    effects: "Efeitos",
    color: "Cor",
    alignment: "Alinhamento",
    specialIndent: "Recuo especial",
    before: "Espa\xE7amento antes (pt)",
    after: "Espa\xE7amento depois (pt)",
    lineSpacing: "Espa\xE7amento entre linhas",
    orientation: "Orienta\xE7\xE3o",
    paper: "Tamanho do papel",
    margins: "Margens",
    charSpacing: "Espa\xE7amento entre caracteres",
    apply: "OK",
    cancel: "Cancelar",
    fontAccessDenied: "O navegador n\xE3o permitiu acesso \xE0s fontes instaladas",
    fontAccessOk: (n) => `${n} fontes instaladas dispon\xEDveis`,
    automatic: "Autom\xE1tico",
    noColor: "Sem cor",
    moreColors: "Mais cores\u2026",
    rows: (r, c) => `Tabela ${c} \xD7 ${r}`,
    authorTitle: "Seu nome",
    authorText: "Nome que aparece nas suas altera\xE7\xF5es e coment\xE1rios",
    authorOk: "OK",
    trackOn: "Controle de Altera\xE7\xF5es ativado",
    trackOff: "Controle de Altera\xE7\xF5es desativado",
    revPane: "Revis\xF5es",
    revCount: (n) => `${n} ${n === 1 ? "revis\xE3o" : "revis\xF5es"}`,
    revNone: "Nenhuma revis\xE3o",
    revInserted: "Inserido",
    revDeleted: "Exclu\xEDdo",
    revFormatted: "Formatado",
    revMovedFrom: "Movido (de)",
    revMovedTo: "Movido (para)",
    revParaInserted: "Par\xE1grafo inserido",
    revParaDeleted: "Par\xE1grafo exclu\xEDdo",
    revInsertions: "Inser\xE7\xF5es",
    revDeletions: "Exclus\xF5es",
    revMoves: "Movimenta\xE7\xF5es",
    revFormatting: "Formata\xE7\xE3o",
    revComments: "Coment\xE1rios",
    revAccept: "Aceitar",
    revReject: "Rejeitar",
    acceptAt: (k) => `Aceitar ${k}`,
    rejectAt: (k) => `Rejeitar ${k}`,
    kInsertion: "Inser\xE7\xE3o",
    kDeletion: "Exclus\xE3o",
    kFormat: "Altera\xE7\xE3o de Formata\xE7\xE3o",
    kMove: "Movimenta\xE7\xE3o",
    revAccepted: (n) => `${n} ${n === 1 ? "altera\xE7\xE3o aceita" : "altera\xE7\xF5es aceitas"}`,
    revRejected: (n) => `${n} ${n === 1 ? "altera\xE7\xE3o rejeitada" : "altera\xE7\xF5es rejeitadas"}`,
    noMoreRevisions: "O documento n\xE3o cont\xE9m revis\xF5es"
  }
};

// src/chrome-widgets.ts
function btn2(cls, id, title) {
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
var canEdit = (env) => !env.app.comparing && !env.ed.isProtected();
var titleWidget = (env) => ({
  id: "title",
  widget: (ctx) => {
    const input = document.createElement("input");
    input.className = "uo-title";
    input.dataset["a"] = "title";
    input.spellcheck = false;
    input.title = env.app.ui.L.docTitle;
    input.setAttribute("aria-label", input.title);
    input.addEventListener("change", () => {
      env.app.setTitle(input.value.trim());
      ctx.after();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
        ctx.after();
      }
    });
    return {
      el: input,
      sync: () => {
        const v = env.app.title || env.app.ui.L.untitled;
        if (document.activeElement !== input && env.root.activeElement !== input && input.value !== v) input.value = v;
      }
    };
  }
});
var saveWidget = (env) => ({
  id: "save",
  widget: (ctx) => {
    const b = btn2("uo-pill uo-pill-primary", "save", ctx.registry.tooltip("save"));
    b.innerHTML = `${symbol("save")}<span></span>`;
    const span = b.querySelector("span");
    b.addEventListener("click", () => {
      void ctx.registry.run("save");
    });
    return {
      el: b,
      sync: () => {
        span.textContent = `${ctx.registry.label("save")} .${env.app.format}`;
        b.disabled = env.app.comparing;
      }
    };
  }
});
var styleWidget = (env, width = 120) => ({
  id: "style:combo",
  widget: (ctx) => {
    const b = btn2("uo-btn uo-drop uo-combo", "style", t(ctx, { en: "Paragraph style", pt: "Estilo de par\xE1grafo" }));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    const text = b.querySelector(".uo-drop-text");
    const styles = () => {
      const ds = env.ed.paragraphStyles();
      if (ds.length) return ds;
      return [
        { id: "Normal", name: "Normal" },
        { id: "Title", name: t(ctx, { en: "Title", pt: "T\xEDtulo" }) },
        ...[1, 2, 3].map((n) => ({ id: `Heading${n}`, name: t(ctx, { en: `Heading ${n}`, pt: `T\xEDtulo ${n}` }) }))
      ];
    };
    const cur = () => env.ctl.state().para.styleId || "Normal";
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const c = cur();
      toggleMenu(b, () => styles().map((s) => ({
        id: `style:${s.id}`,
        label: s.name,
        checked: s.id === c,
        onClick: () => {
          env.ed.applyStyle(s.id === "Normal" ? void 0 : s.id);
          ctx.after();
        }
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const c = cur();
        text.textContent = styles().find((s) => s.id === c)?.name ?? c;
        b.disabled = !canEdit(env);
      }
    };
  }
});
var fontWidget = (env, width = 130) => ({
  id: "font:family",
  widget: (ctx) => {
    const b = btn2("uo-btn uo-drop uo-combo", "font", t(ctx, { en: "Font", pt: "Fonte" }));
    b.style.width = `${width}px`;
    b.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    const text = b.querySelector(".uo-drop-text");
    let families = env.ed.knownFontFamilies();
    let lastKnown = families.length;
    const refresh = () => {
      void env.ed.listAvailableFonts().then((f) => {
        families = f;
      });
    };
    refresh();
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      env.ctl.requestFonts();
      const cur = env.ctl.state().run.fontAscii ?? "";
      const list = cur && !families.includes(cur) ? [cur, ...families] : families;
      toggleMenu(b, () => list.map((f) => ({
        id: `font:${f}`,
        label: f,
        checked: f === cur,
        onClick: () => {
          env.ed.setFontFamily(f);
          ctx.after();
        }
      })), ctx);
    });
    return {
      el: b,
      sync: () => {
        const known = env.ed.knownFontFamilies().length;
        if (known !== lastKnown) {
          lastKnown = known;
          refresh();
        }
        text.textContent = env.ctl.state().run.fontAscii ?? "";
        b.disabled = !canEdit(env);
      }
    };
  }
});
var SIZES2 = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
var sizeWidget = (env, variant) => ({
  id: "font:size",
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.className = "uo-g-inline";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:1px";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.dataset["a"] = "size";
    input.inputMode = "decimal";
    input.maxLength = 5;
    input.title = t(ctx, { en: "Font size", pt: "Tamanho da fonte" });
    input.setAttribute("aria-label", input.title);
    const apply = () => {
      const v = parseFloat(input.value.replace(",", "."));
      if (!isNaN(v) && v > 0) env.ed.setFontSize(v);
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
    const dec = ctx.registry.text({ en: ".", pt: "," });
    const fmt2 = (n) => String(n).replace(".", dec);
    if (variant === "steppers") {
      const minus = btn2("uo-btn", "shrink", ctx.registry.tooltip("shrink"));
      minus.innerHTML = symbol("remove");
      minus.addEventListener("click", () => {
        void ctx.registry.run("shrink");
      });
      const plus = btn2("uo-btn", "grow", ctx.registry.tooltip("grow"));
      plus.innerHTML = symbol("add");
      plus.addEventListener("click", () => {
        void ctx.registry.run("grow");
      });
      wrap.append(minus, input, plus);
    } else {
      input.style.width = "44px";
      const drop = btn2("uo-btn uo-split-arrow", "size:menu", input.title);
      drop.innerHTML = symbol("arrow_drop_down");
      drop.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu(drop, () => SIZES2.map((s) => ({
          label: fmt2(s),
          checked: input.value === fmt2(s),
          onClick: () => {
            env.ed.setFontSize(s);
            ctx.after();
          }
        })), ctx);
      });
      wrap.append(input, drop);
    }
    return {
      el: wrap,
      sync: () => {
        const half = env.ctl.state().run.szHalfPt;
        if (half && env.root.activeElement !== input) input.value = fmt2(half / 2);
        const ok = canEdit(env);
        for (const el19 of wrap.querySelectorAll("input,button")) el19.disabled = !ok;
      }
    };
  }
});
var zoomItem = (env) => ({
  menu: () => [
    ...ZOOMS.map((z) => ({
      label: `${z}%`,
      checked: Math.round(env.ed.getZoom() * 100) === z,
      onClick: () => {
        env.ed.setZoom(z / 100);
        env.ed.focusEditor();
      }
    }))
  ],
  id: "zoom",
  label: { en: "Zoom", pt: "Zoom" },
  text: () => `${Math.round(env.ed.getZoom() * 100)}%`
});
var moreColors = (ctx, label, onPick) => ({
  icon: "palette",
  label,
  onClick: () => {
    const input = document.createElement("input");
    input.type = "color";
    input.style.cssText = "position:fixed;left:-100px;top:0;opacity:0";
    ctx.layer.appendChild(input);
    input.addEventListener("change", () => {
      onPick(input.value.slice(1).toUpperCase());
      input.remove();
      ctx.after();
    });
    input.addEventListener("blur", () => setTimeout(() => input.remove(), 1e3));
    input.click();
  }
});
var highlightMenu = (env, ctx) => {
  const L15 = env.app.ui.L;
  return [
    { content: (close) => colorGrid({
      colors: HIGHLIGHT_COLORS.map((h) => ({ value: h.value, css: h.css, title: ctx.registry.text(h.label) })),
      columns: 5,
      selected: env.ctl.state().run.highlight,
      onPick: (v) => {
        env.app.lastHighlight = v;
        env.ed.setHighlight(v);
        ctx.after();
      },
      close
    }) },
    { id: "highlight:none", label: L15.noColor, swatch: "", onClick: () => {
      env.ed.setHighlight(void 0);
      ctx.after();
    } }
  ];
};
var shadingMenu = (env, ctx) => {
  const L15 = env.app.ui.L;
  const pick = (hex) => {
    env.app.lastShading = hex;
    env.ed.setShading(hex);
    ctx.after();
  };
  return [
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h) => ({ value: h, css: `#${h}` })), selected: env.ctl.state().para.shadingHex, onPick: pick, close }) },
    { id: "shading:none", label: L15.noColor, swatch: "", onClick: () => {
      env.ed.setShading(void 0);
      ctx.after();
    } },
    moreColors(ctx, L15.moreColors, pick)
  ];
};
var lineSpacingMenu = (env, ctx) => {
  const p = env.ctl.state().para;
  const dec = ctx.registry.text({ en: ".", pt: "," });
  const line2 = p.lineTwentieths;
  const sb = p.spaceBeforeTwips, sa = p.spaceAfterTwips;
  const ok = canEdit(env);
  return [
    ...[[240, "1.0"], [259, "1.08"], [276, "1.15"], [360, "1.5"], [480, "2.0"]].map(([v, txt]) => ({
      id: `spacing:${v}`,
      label: txt.replace(".", dec),
      checked: line2 === v,
      disabled: !ok,
      onClick: () => {
        env.ed.setLineSpacing(v);
        ctx.after();
      }
    })),
    "-",
    sb ? { id: "spaceBefore:remove", label: t(ctx, { en: "Remove space before paragraph", pt: "Remover espa\xE7o antes do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceBefore(0);
      ctx.after();
    } } : { id: "spaceBefore:add", label: t(ctx, { en: "Add space before paragraph", pt: "Adicionar espa\xE7o antes do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceBefore(240);
      ctx.after();
    } },
    sa ? { id: "spaceAfter:remove", label: t(ctx, { en: "Remove space after paragraph", pt: "Remover espa\xE7o depois do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceAfter(0);
      ctx.after();
    } } : { id: "spaceAfter:add", label: t(ctx, { en: "Add space after paragraph", pt: "Adicionar espa\xE7o depois do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceAfter(160);
      ctx.after();
    } },
    "-",
    "dlg:paragraph"
  ];
};
var paragraphSpacingMenu = (env, ctx) => {
  const ok = canEdit(env);
  const preset = (id, en, pt, before, after, line2) => ({
    id: `pspacing:${id}`,
    label: { en, pt },
    disabled: !ok,
    onClick: () => {
      env.ed.setSpaceBefore(before);
      env.ed.setSpaceAfter(after);
      env.ed.setLineSpacing(line2);
      ctx.after();
    }
  });
  return [
    preset("none", "No paragraph space", "Sem espa\xE7o entre par\xE1grafos", 0, 0, 240),
    preset("compact", "Compact", "Compacto", 0, 80, 240),
    preset("tight", "Tight", "Apertado", 0, 120, 259),
    preset("open", "Open", "Aberto", 0, 200, 276),
    preset("relaxed", "Relaxed", "Relaxado", 0, 120, 300),
    preset("double", "Double", "Duplo", 0, 160, 480)
  ];
};
var charSpacingMenu = (env, ctx) => {
  const cur = env.ctl.state().run.charSpacingTwips;
  const ok = canEdit(env);
  return [
    [void 0, "Normal", "Normal"],
    [20, "Expanded 1 pt", "Expandido 1 pt"],
    [40, "Expanded 2 pt", "Expandido 2 pt"],
    [-10, "Condensed 0.5 pt", "Condensado 0,5 pt"],
    [-20, "Condensed 1 pt", "Condensado 1 pt"]
  ].map(([v, en, pt]) => ({
    id: `charSpacing:${v ?? 0}`,
    label: { en, pt },
    checked: (cur ?? void 0) === v,
    disabled: !ok,
    onClick: () => {
      env.ed.setCharSpacing(v);
      ctx.after();
    }
  }));
};
var specialIndentMenu = (env, ctx) => {
  const first = env.ctl.state().para.indentFirstLineTwips;
  const cur = !first ? "none" : first > 0 ? "firstLine" : "hanging";
  const ok = canEdit(env);
  return [["none", "None", "Nenhum"], ["firstLine", "First line", "Primeira linha"], ["hanging", "Hanging", "Deslocamento"]].map(([v, en, pt]) => ({
    id: `specialIndent:${v}`,
    label: { en, pt },
    checked: cur === v,
    disabled: !ok,
    onClick: () => {
      env.ed.setSpecialIndent(v);
      ctx.after();
    }
  }));
};
var pageItems = (env, ctx, key, opts) => opts.map(([v, en, pt, icon]) => ({
  id: `${key}:${v}`,
  label: { en, pt },
  icon,
  disabled: !canEdit(env),
  onClick: () => {
    env.ed.setPageSetup({ [key]: v });
    ctx.after();
  }
}));
var orientationMenu = (env, ctx) => pageItems(env, ctx, "orientation", [["portrait", "Portrait", "Retrato", "crop_portrait"], ["landscape", "Landscape", "Paisagem", "crop_landscape"]]);
var sizeMenu = (env, ctx) => pageItems(env, ctx, "size", [["A4", "A4 (21 \xD7 29.7 cm)", "A4 (21 \xD7 29,7 cm)"], ["Letter", "Letter (21.59 \xD7 27.94 cm)", "Carta (21,59 \xD7 27,94 cm)"]]);
var marginsMenu = (env, ctx) => [
  ...pageItems(env, ctx, "margins", [["normal", "Normal (2.5 cm)", "Normal (2,5 cm)"], ["narrow", "Narrow (1.27 cm)", "Estreita (1,27 cm)"], ["wide", "Wide (5.08 cm)", "Larga (5,08 cm)"]]),
  "-",
  "dlg:page"
];
var caseMenu = () => ["case:sentence", "case:lower", "case:upper", "case:title", "case:toggle"];
var fieldsMenu = () => ["field:page", "field:numpages", "field:date", "-", "fields:update"];
var SYMBOL_CHARS = "\xA9\xAE\u2122\xA7\xB6\u20AC\xA3\xA5\xA2\xB0\xB1\xD7\xF7\u2260\u2264\u2265\u2248\u221E\xB5\u2013\u2014\u2026\u201C\u201D\u2018\u2019\xAB\xBB\u2022\xB7\u2020\u2021\u2192\u2190\u2191\u2193\u2713\u2717\xBD\xBC\xBE\u03B1\u03B2\u03C0\u03A9\u03A3";
var symbolMenu = (env, ctx) => [{
  content: (close) => {
    const g = document.createElement("div");
    g.className = "uo-colors";
    g.style.gridTemplateColumns = "repeat(8, 28px)";
    for (const ch of SYMBOL_CHARS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = ch;
      b.dataset["symbol"] = ch;
      b.style.cssText = "width:28px;height:28px;border-radius:6px;background:transparent;font:inherit;font-size:16px;color:inherit;border:1px solid transparent";
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.disabled = !canEdit(env);
      b.addEventListener("click", () => {
        close();
        env.ed.pasteText(ch);
        ctx.after();
      });
      g.appendChild(b);
    }
    return g;
  }
}];
var themeMenu = (env, ctx) => [
  {
    id: "theme:page",
    label: { en: "Follow the page", pt: "Seguir a p\xE1gina" },
    icon: "web_asset",
    checked: env.app.mode === null,
    onClick: () => {
      setMode(env, null);
      ctx.after();
    }
  },
  "-",
  ...[
    ["auto", "Automatic", "Autom\xE1tico", "brightness_auto"],
    ["light", "Light", "Claro", "light_mode"],
    ["dark", "Dark", "Escuro", "dark_mode"],
    ["black", "Black (dark page)", "Escuro total (p\xE1gina escura)", "bedtime"]
  ].map(([m, en, pt, icon]) => ({
    id: `theme:${m}`,
    label: { en, pt },
    icon,
    checked: env.app.mode === m,
    onClick: () => {
      setMode(env, m);
      ctx.after();
    }
  }))
];
function setMode(env, m) {
  env.app.chosenMode = m;
  env.app.prefs.set("mode", m ?? "");
  if (m === null) env.ed.removeAttribute("theme");
  else if (env.ed.hasAttribute("theme")) env.ed.setAttribute("theme", m);
  env.ctl.applyTheme();
}
var accentMenu = (env, ctx) => [{
  content: (close) => colorGrid({
    colors: ACCENTS.map((a) => ({ value: a.id, css: a.id === "neutral" ? "linear-gradient(135deg,#111 0 50%,#fff 50% 100%)" : a.seed, title: ctx.registry.text(a.label) })),
    columns: 7,
    selected: env.app.accent,
    close,
    onPick: (id) => {
      env.app.chosenAccent = id;
      env.app.prefs.set("accent", id);
      if (env.ed.hasAttribute("accent")) env.ed.setAttribute("accent", id);
      if (env.app.mode === null) setMode(env, "auto");
      else env.ctl.applyTheme();
      ctx.after();
    }
  })
}];

// src/chrome-layout.ts
function menus(env, ctx) {
  const sub = (label, icon, items, id) => ({ id, label, icon, submenu: items });
  const autosave = () => [
    [0, "Off", "Desligado"],
    [1, "1 min", "1 min"],
    [5, "5 min", "5 min"],
    [10, "10 min", "10 min"],
    [30, "30 min", "30 min"]
  ].map(([n, en, pt]) => ({
    id: `autosave:${n}`,
    label: { en, pt },
    checked: env.app.autosaveMinutes === n,
    onClick: () => {
      env.app.autosaveMinutes = n;
    }
  }));
  const recents2 = () => env.app.recents.map((r) => ({
    id: `recent:${r.name}`,
    label: r.name,
    icon: "description",
    onClick: () => {
      void env.app.openRecent(r);
    }
  }));
  const zoom = () => ZOOMS.map((z) => ({
    id: `zoom:${z}`,
    label: `${z}%`,
    checked: Math.round(env.ed.getZoom() * 100) === z,
    onClick: () => {
      env.ed.setZoom(z / 100);
      ctx.after();
    }
  }));
  return {
    exportAs: sub({ en: "Download", pt: "Baixar" }, "download", () => ["export:pdf", "export:odt", "export:html", "export:md", "export:xps"], "export"),
    recent: sub({ en: "Open recent", pt: "Abrir recente" }, "history", recents2, "recent"),
    autosave: sub({ en: "Autosave", pt: "Salvamento autom\xE1tico" }, "autorenew", autosave, "autosave"),
    zoomItems: () => [...zoom(), "-", "zoomin", "zoomout"],
    zoom: sub({ en: "Zoom", pt: "Zoom" }, "zoom_in", () => [...zoom(), "-", "zoomin", "zoomout"], "zoom"),
    theme: sub({ en: "Theme", pt: "Tema" }, "contrast", () => themeMenu(env, ctx), "theme"),
    accent: sub({ en: "Accent color", pt: "Cor de destaque" }, "palette", () => accentMenu(env, ctx), "accent"),
    toolbar: sub({ en: "Toolbar", pt: "Barra de ferramentas" }, "toolbar", () => ["toolbar:compact", "toolbar:ribbon", "-", "statusbar"], "toolbar"),
    fields: sub({ en: "Field", pt: "Campo" }, "data_object", fieldsMenu, "fields"),
    // Sumário: a galeria, Adicionar Texto (com Marcar Entrada) e Atualizar
    toc: sub({ en: "Table of contents", pt: "Sum\xE1rio" }, "toc", () => [
      ...tocGalleryMenu(env, ctx),
      "-",
      sub({ en: "Add text", pt: "Adicionar texto" }, "playlist_add", () => addTextMenu(env), "toc:addText"),
      "toc"
    ], "toc:sub"),
    symbols: sub({ en: "Special characters", pt: "Caracteres especiais" }, "special_character", () => symbolMenu(env, ctx), "symbols"),
    breaks: sub({ en: "Break", pt: "Quebra" }, "insert_page_break", breaksMenu, "breaks"),
    columns: sub({ en: "Columns", pt: "Colunas" }, "view_column_2", columnsMenu, "columns"),
    // Layout do texto: Hifenização e Números de Linha (guia Layout da ribbon)
    hyphenation: { ...sub({ en: "Hyphenation", pt: "Hifeniza\xE7\xE3o" }, "horizontal_rule", hyphenationMenu, "hyphenation"), hidden: typeof env.ed.setHyphenation !== "function" },
    lineNumbers: { ...sub({ en: "Line numbers", pt: "N\xFAmeros de linha" }, "format_list_numbered", lineNumbersMenu, "lineNumbers"), hidden: typeof env.ed.setLineNumbering !== "function" },
    cover: { ...sub({ en: "Cover page", pt: "Folha de rosto" }, "auto_stories", () => coverPageMenu(env, ctx), "cover:menu"), hidden: typeof env.ed.insertCoverPage !== "function" },
    // Plano de Fundo da Página (guia Design da ribbon)
    background: { ...sub({ en: "Page background", pt: "Plano de fundo da p\xE1gina" }, "format_color_fill", () => [
      sub({ en: "Watermark", pt: "Marca-d'\xE1gua" }, "branding_watermark", () => watermarkMenu(env, ctx), "watermark:menu"),
      sub({ en: "Page color", pt: "Cor da p\xE1gina" }, "format_color_fill", () => pageColorMenu(env, ctx), "pageColor:menu"),
      "dlg:pageBorders"
    ], "background"), hidden: typeof env.ed.setPageColor !== "function" },
    // Cabeçalho, Rodapé e Número de Página com as galerias de modelos; opções e vínculo no diálogo
    hf: sub({ en: "Headers & footers", pt: "Cabe\xE7alhos e rodap\xE9s" }, "call_to_action", () => [
      sub({ en: "Header", pt: "Cabe\xE7alho" }, "vertical_align_top", () => hfGalleryMenu(env, ctx, "header"), "hf:headerMenu"),
      sub({ en: "Footer", pt: "Rodap\xE9" }, "vertical_align_bottom", () => hfGalleryMenu(env, ctx, "footer"), "hf:footerMenu"),
      sub({ en: "Page number", pt: "N\xFAmero de p\xE1gina" }, "numbers", () => pageNumberMenu(env, ctx), "hf:pgnumMenu"),
      "-",
      "dlg:dateTime",
      sub({ en: "Document info", pt: "Informa\xE7\xF5es do documento" }, "info", docInfoMenu, "hf:docinfo"),
      "dlg:alignTab",
      "-",
      "dlg:hfOptions",
      "hf:link",
      "hf:prev",
      "hf:next",
      "hf:showText",
      "-",
      "hf:close"
    ], "hf"),
    text: sub({ en: "Text", pt: "Texto" }, "format_bold", () => [
      "bold",
      "italic",
      "underline",
      "strike",
      "doubleStrike",
      "sup",
      "sub",
      "-",
      "grow",
      "shrink",
      "-",
      "allCaps",
      "smallCaps",
      "hidden",
      { id: "caseSub", label: { en: "Change case", pt: "Mai\xFAsculas e min\xFAsculas" }, icon: "match_case", submenu: caseMenu }
    ], "text"),
    color: sub({ en: "Font color", pt: "Cor da fonte" }, "format_color_text", () => fontColorMenu(env, ctx), "color"),
    underline: sub({ en: "Underline", pt: "Sublinhado" }, "format_underlined", () => underlineMenu(env, ctx), "underlineMenu"),
    borders: sub({ en: "Borders", pt: "Bordas" }, "border_bottom", homeBordersMenu, "homeBorders"),
    highlight: sub({ en: "Highlight color", pt: "Cor do realce" }, "format_ink_highlighter", () => highlightMenu(env, ctx), "highlightMenu"),
    styles: sub({ en: "Paragraph styles", pt: "Estilos de par\xE1grafo" }, "style", () => {
      const cur = env.ctl.state().para.styleId || "Normal";
      const ds = env.ed.paragraphStyles();
      return (ds.length ? ds : [{ id: "Normal", name: "Normal" }]).map((s) => ({
        id: `style:${s.id}`,
        label: s.name,
        checked: s.id === cur,
        onClick: () => {
          env.ed.applyStyle(s.id === "Normal" ? void 0 : s.id);
          ctx.after();
        }
      }));
    }, "styles"),
    styleTools: sub({ en: "Styles", pt: "Estilos" }, "view_sidebar", () => ["styles:pane", "style:inspector", "-", "style:new", "style:modifyCurrent", "style:updateCurrent", "-", "style:normal", "style:h1", "style:h2", "style:h3"], "styleTools"),
    align: sub({ en: "Align & indent", pt: "Alinhar e recuar" }, "format_align_left", () => [
      "align:left",
      "align:center",
      "align:right",
      "align:both",
      "-",
      "indent",
      "outdent",
      "-",
      sub({ en: "Special indent", pt: "Recuo especial" }, void 0, () => specialIndentMenu(env, ctx), "specialIndent")
    ], "align"),
    spacing: sub({ en: "Line & paragraph spacing", pt: "Espa\xE7amento entre linhas e par\xE1grafos" }, "format_line_spacing", () => lineSpacingMenu(env, ctx), "spacing"),
    lists: sub({ en: "Bullets & numbering", pt: "Marcadores e numera\xE7\xE3o" }, "format_list_bulleted", () => [
      { id: "list:bulletMenu", label: { en: "Bullets", pt: "Marcadores" }, icon: "format_list_bulleted", submenu: () => listMenu(env, ctx, "bullet") },
      { id: "list:numberMenu", label: { en: "Numbering", pt: "Numera\xE7\xE3o" }, icon: "format_list_numbered", submenu: () => listMenu(env, ctx, "number") },
      { id: "list:multiMenu", label: { en: "Multilevel List", pt: "Lista de V\xE1rios N\xEDveis" }, icon: "list_alt", submenu: () => multilevelMenu(env, ctx) },
      "-",
      "list:defineBullet",
      "list:defineNumber",
      "list:setValue",
      "list:defineMultilevel",
      "list:defineStyle"
    ], "lists"),
    shading: sub({ en: "Paragraph shading", pt: "Sombreamento do par\xE1grafo" }, "format_color_fill", () => shadingMenu(env, ctx), "shadingMenu"),
    charSpacing: sub({ en: "Character spacing", pt: "Espa\xE7amento entre caracteres" }, "format_letter_spacing", () => charSpacingMenu(env, ctx), "charSpacing"),
    page: sub({ en: "Page setup", pt: "Configurar p\xE1gina" }, "description", () => [
      sub({ en: "Orientation", pt: "Orienta\xE7\xE3o" }, "crop_rotate", () => orientationMenu(env, ctx), "orientation"),
      sub({ en: "Size", pt: "Tamanho" }, "aspect_ratio", () => sizeMenu(env, ctx), "pageSize"),
      sub({ en: "Margins", pt: "Margens" }, "margin", () => marginsMenu(env, ctx), "margins"),
      "-",
      "dlg:pageBorders"
    ], "page"),
    trackChanges: sub({ en: "Track Changes", pt: "Controlar Altera\xE7\xF5es" }, "track_changes", () => [
      "trackChanges",
      "-",
      sub({ en: "Display for Review", pt: "Exibir para Revis\xE3o" }, "visibility", markupModes, "markupMode"),
      sub({ en: "Show Markup", pt: "Mostrar Marca\xE7\xE3o" }, "notes", () => showMarkup(env, ctx), "showMarkup"),
      "reviewPane",
      "-",
      "change:prev",
      "change:next",
      "-",
      sub({ en: "Accept", pt: "Aceitar" }, "check_circle", acceptItems, "acceptMenu"),
      sub({ en: "Reject", pt: "Rejeitar" }, "cancel", rejectItems, "rejectMenu")
    ], "tracking"),
    comments: sub({ en: "Comments", pt: "Coment\xE1rios" }, "comment", () => ["comment", "comment:prev", "comment:next", "comment:delete", "comment:deleteAll", "-", "comments"], "commentsMenu"),
    table: { ...sub({ en: "Table", pt: "Tabela" }, "table", () => tableMenu(env, ctx), "tableMenu"), hidden: typeof env.ed.insertTable !== "function" },
    notes: sub({ en: "Notes", pt: "Notas" }, "notes", () => [...noteNavMenu(), "-", "note:show", "note:convert", "dlg:notes"], "notesMenu")
  };
}
var breaksMenu = () => ["pagebreak", "columnbreak", "-", "sectionbreak", "sectionbreak:continuous", "sectionbreak:evenPage", "sectionbreak:oddPage"];
var noteNavMenu = () => ["note:next", "note:prev", "note:nextEnd", "note:prevEnd"];
var columnsMenu = () => ["columns:one", "columns:two", "columns:three", "columns:left", "columns:right", "-", "dlg:columns"];
var markupModes = () => ["markup:simple", "markup:all", "markup:none", "markup:original"];
var acceptItems = () => ["change:acceptNext", "change:acceptOne", "change:acceptShown", "change:acceptAll", "change:acceptAllStop"];
var rejectItems = () => ["change:rejectNext", "change:rejectOne", "change:rejectShown", "change:rejectAll", "change:rejectAllStop"];
var MODE_LABELS = {
  simple: { en: "Simple Markup", pt: "Marca\xE7\xE3o Simples" },
  all: { en: "All Markup", pt: "Todas as Marca\xE7\xF5es" },
  none: { en: "No Markup", pt: "Sem Marca\xE7\xE3o" },
  original: { en: "Original", pt: "Original" }
};
function showMarkup(env, ctx) {
  const ed = env.ed;
  const people = () => {
    const all = ed.revisionAuthors();
    const sel4 = ed.getMarkupOptions().authors;
    return ["people:all", "-", ...all.map((a) => ({
      id: `people:${a}`,
      label: a,
      swatch: `#${ed.authorColor(a)}`,
      checked: !sel4 || sel4.includes(a),
      onClick: () => {
        const cur = ed.getMarkupOptions().authors ?? all;
        const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
        ed.setMarkupOptions({ authors: all.every((x) => next.includes(x)) ? null : next });
        ctx.after();
      }
    }))];
  };
  return [
    "comments",
    "show:insdel",
    "show:formatting",
    "-",
    { id: "balloons", label: { en: "Balloons", pt: "Bal\xF5es" }, submenu: () => ["balloons:revisions", "balloons:inline", "balloons:mixed"] },
    { id: "people", label: { en: "Specific People", pt: "Pessoas Espec\xEDficas" }, submenu: people }
  ];
}
var fileMenu = (m) => [
  "new",
  "open",
  m.recent,
  "-",
  "save",
  "saveAs",
  m.exportAs,
  "fontsInFile",
  "-",
  "compare",
  "-",
  "print",
  "-",
  m.autosave
];
function compactLayout(env, ctx) {
  const m = menus(env, ctx);
  return {
    title: titleWidget(env),
    trailing: [saveWidget(env)],
    menus: [
      { id: "file", label: { en: "File", pt: "Arquivo" }, items: () => fileMenu(m) },
      { id: "edit", label: { en: "Edit", pt: "Editar" }, items: ["undo", "redo", "-", "cut", "copy", "paste", "pastePlain", "paste:special", "paste:defaults", "clipboard:pane", "-", "selectAll", "select:objects", "select:similar", "-", "find", "find:advanced", "replace", "goto"] },
      { id: "view", label: { en: "View", pt: "Ver" }, items: () => ["view:print", "view:web", "view:read", "view:outline", "view:draft", "focus", "-", "view:ruler", "view:gridlines", "view:navpane", "view:bookmarks", "-", "marks", "comments", "-", m.zoom, "-", m.theme, m.accent, m.toolbar] },
      { id: "insert", label: { en: "Insert", pt: "Inserir" }, items: () => ["image", m.table, "link", "comment", "-", m.cover, "blankPage", m.breaks, m.hf, m.fields, m.toc, "-", "footnote", "endnote", m.notes, "bookmark", "crossref", "caption", "tof", "tof:update", { id: "textbox:sub", label: { en: "Text box", pt: "Caixa de texto" }, icon: "text_fields", submenu: () => textboxMenu(env, ctx) }, m.symbols] },
      { id: "format", label: { en: "Format", pt: "Formatar" }, items: () => [m.text, m.underline, m.color, m.highlight, m.styles, m.styleTools, "-", m.align, m.spacing, m.lists, m.shading, m.borders, "dlg:borders", m.charSpacing, "-", tableFormatMenu(), pictureMenu(env, ctx), shapeMenu(env, ctx), "-", m.page, m.background, m.columns, "-", "dlg:font", "dlg:paragraph", "dlg:tabs", "-", "clear", "style:clearChar", "style:clearPara"] },
      { id: "tools", label: { en: "Tools", pt: "Ferramentas" }, items: () => ["spelling", "spellAsYouType", "wordCount", "sort", "-", m.trackChanges, m.comments, "-", "compare", "mailmerge", "-", "fontAccess", m.hyphenation, m.lineNumbers, "-", "enableEditing"] },
      { id: "help", label: { en: "Help", pt: "Ajuda" }, items: ["shortcuts", "about"] }
    ],
    groups: [
      { id: "tools", label: { en: "Tools", pt: "Ferramentas" }, icon: "undo", prio: 4, items: ["undo", "redo", "print", "spelling", "painter", zoomItem(env)] },
      { id: "style", label: { en: "Style", pt: "Estilo" }, icon: "style", prio: 8, items: [styleWidget(env)] },
      { id: "font", label: { en: "Font", pt: "Fonte" }, icon: "font_download", prio: 8, items: [fontWidget(env)] },
      { id: "size", label: { en: "Font size", pt: "Tamanho da fonte" }, icon: "format_size", prio: 7, items: [sizeWidget(env, "steppers")] },
      { id: "format", label: { en: "Formatting", pt: "Formata\xE7\xE3o" }, icon: "format_bold", prio: 9, items: [
        "bold",
        "italic",
        { split: "underline", menu: () => underlineMenu(env, ctx) },
        { split: "color", menu: () => fontColorMenu(env, ctx) },
        { split: "highlight", menu: () => highlightMenu(env, ctx) },
        { menu: () => textEffectsMenu(env, ctx), id: "fx:menu", label: { en: "Text Effects and Typography", pt: "Efeitos de Texto e Tipografia" }, icon: "format_color_text" }
      ] },
      { id: "insert", label: { en: "Insert", pt: "Inserir" }, icon: "link", prio: 5, items: ["link", "comment", "image", { menu: () => tableMenu(env, ctx), id: "table:menu", label: { en: "Table", pt: "Tabela" }, icon: "table", supports: () => typeof env.ed.insertTable === "function" }] },
      { id: "para", label: { en: "Paragraph", pt: "Par\xE1grafo" }, icon: "format_align_left", prio: 6, items: [
        "align:left",
        "align:center",
        "align:right",
        "align:both",
        { menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: { en: "Line & paragraph spacing", pt: "Espa\xE7amento entre linhas e par\xE1grafos" }, icon: "format_line_spacing" },
        { split: "list:bullet", menu: () => listMenu(env, ctx, "bullet") },
        { split: "list:decimal", menu: () => listMenu(env, ctx, "number") },
        { menu: () => multilevelMenu(env, ctx), id: "list:multi", label: { en: "Multilevel List", pt: "Lista de V\xE1rios N\xEDveis" }, icon: "list_alt" },
        "outdent",
        "indent",
        "clear"
      ] },
      pictureCompactGroup(env, ctx),
      shapeCompactGroup(env, ctx),
      { id: "extras", label: { en: "More tools", pt: "Mais ferramentas" }, icon: "more_horiz", prio: 0, items: [
        "strike",
        "sub",
        "sup",
        { menu: caseMenu, id: "case", label: { en: "Change case", pt: "Mai\xFAsculas e min\xFAsculas" }, icon: "match_case" },
        { split: "shading", menu: () => shadingMenu(env, ctx) },
        { split: "home:borders", menu: homeBordersMenu },
        "marks",
        { menu: () => charSpacingMenu(env, ctx), id: "charSpacing", label: { en: "Character spacing", pt: "Espa\xE7amento entre caracteres" }, icon: "format_letter_spacing" },
        { menu: () => specialIndentMenu(env, ctx), id: "specialIndent", label: { en: "Special indent", pt: "Recuo especial" }, icon: "format_indent_increase" },
        { menu: () => orientationMenu(env, ctx), id: "orientation", label: { en: "Orientation", pt: "Orienta\xE7\xE3o" }, icon: "crop_rotate" },
        { menu: () => sizeMenu(env, ctx), id: "pageSize", label: { en: "Paper size", pt: "Tamanho do papel" }, icon: "aspect_ratio" },
        { menu: () => marginsMenu(env, ctx), id: "margins", label: { en: "Margins", pt: "Margens" }, icon: "margin" },
        "find"
      ] }
    ]
  };
}
var L14 = (en, pt) => ({ en, pt });
var large3 = (cmd) => ({ cmd, size: "large" });
function ribbonLayout(env, ctx) {
  const m = menus(env, ctx);
  const has = (meth) => () => typeof env.ed[meth] === "function";
  return {
    qat: ["save", "undo", "redo"],
    title: titleWidget(env),
    tabs: [
      { id: "file", label: L14("File", "Arquivo"), groups: [], menu: () => fileMenu(m) },
      {
        id: "home",
        label: L14("Home", "P\xE1gina Inicial"),
        groups: [
          { id: "clipboard", label: L14("Clipboard", "\xC1rea de Transfer\xEAncia"), icon: "content_paste", prio: 3, launcher: "clipboard:pane", cells: [
            { split: "paste", size: "large", menu: () => pasteMenu(env, ctx) },
            { rows: [["cut"], ["copy"], ["painter"]] }
          ] },
          { id: "font", label: L14("Font", "Fonte"), icon: "text_format", prio: 8, launcher: "dlg:font", cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, "dropdown"), "grow", "shrink", { menu: caseMenu, id: "case", label: L14("Change case", "Mai\xFAsculas e min\xFAsculas"), icon: "match_case" }, "clear"],
              ["bold", "italic", { split: "underline", menu: () => underlineMenu(env, ctx) }, "strike", "sub", "sup", { menu: () => textEffectsMenu(env, ctx), id: "fx:menu", label: L14("Text Effects and Typography", "Efeitos de Texto e Tipografia"), icon: "format_color_text" }, { split: "highlight", menu: () => highlightMenu(env, ctx) }, { split: "color", menu: () => fontColorMenu(env, ctx) }]
            ] }
          ] },
          { id: "paragraph", label: L14("Paragraph", "Par\xE1grafo"), icon: "format_align_left", prio: 7, launcher: "dlg:paragraph", cells: [
            { rows: [
              [
                { split: "list:bullet", menu: () => listMenu(env, ctx, "bullet") },
                { split: "list:decimal", menu: () => listMenu(env, ctx, "number") },
                { menu: () => multilevelMenu(env, ctx), id: "list:multi", label: L14("Multilevel List", "Lista de V\xE1rios N\xEDveis"), icon: "list_alt" },
                "outdent",
                "indent",
                "sort",
                "marks"
              ],
              [
                "align:left",
                "align:center",
                "align:right",
                "align:both",
                { menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: L14("Line & paragraph spacing", "Espa\xE7amento entre linhas e par\xE1grafos"), icon: "format_line_spacing" },
                { split: "shading", menu: () => shadingMenu(env, ctx) },
                { split: "home:borders", menu: homeBordersMenu }
              ]
            ] }
          ] },
          // galeria com miniaturas (widget de galeria do framework; elástica) + ↘ Painel de Estilos
          { id: "styles", label: L14("Styles", "Estilos"), icon: "style", prio: 5, launcher: "styles:pane", cells: env.styles ? [env.styles.galleryItem()] : [{ rows: [[styleWidget(env, 150)]] }] },
          { id: "editing", label: L14("Editing", "Edi\xE7\xE3o"), icon: "search", prio: 4, cells: [
            { rows: [
              [{ split: "find", menu: findMenu, label: true }],
              [{ cmd: "replace", label: true }],
              [{ menu: selectMenu2, id: "select:menu", label: L14("Select", "Selecionar"), icon: "select_all", showLabel: true }]
            ] }
          ] }
        ]
      },
      {
        id: "insert",
        label: L14("Insert", "Inserir"),
        groups: [
          { id: "pages", label: L14("Pages", "P\xE1ginas"), icon: "insert_page_break", prio: 4, cells: [
            { menu: () => coverPageMenu(env, ctx), id: "cover:menu", label: L14("Cover Page", "Folha de Rosto"), icon: "auto_stories", size: "large", supports: has("insertCoverPage") },
            large3("blankPage"),
            large3("pagebreak"),
            { menu: breaksMenu, id: "breaks", label: L14("Breaks", "Quebras"), icon: "insert_page_break", size: "large", supports: has("insertSectionBreak") }
          ] },
          { id: "objects", label: L14("Illustrations", "Ilustra\xE7\xF5es"), icon: "image", prio: 6, cells: [
            { menu: () => tableMenu(env, ctx), id: "table:menu", label: L14("Table", "Tabela"), icon: "table", size: "large", supports: has("insertTable") },
            large3("image")
          ] },
          // Links (Link, Indicador, Referência Cruzada) e Comentários, como no Word
          { id: "links", label: L14("Links", "Links"), icon: "link", prio: 5, cells: [large3("link"), large3("bookmark"), large3("crossref")] },
          { id: "comments", label: L14("Comments", "Coment\xE1rios"), icon: "add_comment", prio: 4, cells: [large3("comment")] },
          { id: "hf", label: L14("Header & Footer", "Cabe\xE7alho e Rodap\xE9"), icon: "call_to_action", prio: 4, cells: [
            { menu: () => hfGalleryMenu(env, ctx, "header"), id: "hf:headerMenu", label: L14("Header", "Cabe\xE7alho"), icon: "vertical_align_top", size: "large" },
            { menu: () => hfGalleryMenu(env, ctx, "footer"), id: "hf:footerMenu", label: L14("Footer", "Rodap\xE9"), icon: "vertical_align_bottom", size: "large" },
            { menu: () => pageNumberMenu(env, ctx), id: "hf:pgnumMenu", label: L14("Page Number", "N\xFAmero de P\xE1gina"), icon: "numbers", size: "large" }
          ] },
          { id: "text", label: L14("Text", "Texto"), icon: "text_fields", prio: 3, cells: [
            { menu: () => textboxMenu(env, ctx), id: "textbox:menu", label: L14("Text Box", "Caixa de Texto"), icon: "text_fields", size: "large", supports: has("insertTextbox") },
            { rows: [[{ cmd: "dlg:dateTime", label: true }], [{ menu: () => symbolMenu(env, ctx), id: "symbols", label: L14("Symbol", "S\xEDmbolo"), icon: "special_character", showLabel: true }]] }
          ] }
        ]
      },
      {
        // guia Design (como no Word): por ora só o Plano de Fundo da Página; Formatação do
        // Documento (temas, conjuntos de estilos) entra quando chegar
        id: "design",
        label: L14("Design", "Design"),
        groups: [
          { id: "docformat", label: L14("Document Formatting", "Formata\xE7\xE3o do Documento"), icon: "format_line_spacing", prio: 3, cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: "pspacing", label: L14("Paragraph Spacing", "Espa\xE7amento entre Par\xE1grafos"), icon: "format_line_spacing", size: "large" }
          ] },
          { id: "background", label: L14("Page Background", "Plano de Fundo da P\xE1gina"), icon: "format_color_fill", prio: 4, cells: [
            { menu: () => watermarkMenu(env, ctx), id: "watermark:menu", label: L14("Watermark", "Marca-d'\xC1gua"), icon: "branding_watermark", size: "large", supports: has("setWatermark") },
            { menu: () => pageColorMenu(env, ctx), id: "pageColor:menu", label: L14("Page Color", "Cor da P\xE1gina"), icon: "format_color_fill", size: "large", supports: has("setPageColor") },
            { cmd: "dlg:pageBorders", size: "large" }
          ] }
        ]
      },
      {
        id: "layout",
        label: L14("Layout", "Layout"),
        groups: [
          { id: "pagesetup", label: L14("Page Setup", "Configurar P\xE1gina"), icon: "description", prio: 6, launcher: "dlg:page", cells: [
            { menu: () => marginsMenu(env, ctx), id: "margins", label: L14("Margins", "Margens"), icon: "margin", size: "large" },
            { menu: () => orientationMenu(env, ctx), id: "orientation", label: L14("Orientation", "Orienta\xE7\xE3o"), icon: "crop_rotate", size: "large" },
            { menu: () => sizeMenu(env, ctx), id: "pageSize", label: L14("Size", "Tamanho"), icon: "aspect_ratio", size: "large" },
            { menu: columnsMenu, id: "columns", label: L14("Columns", "Colunas"), icon: "view_column_2", size: "large", supports: has("setColumns") },
            { rows: [
              [{ menu: breaksMenu, id: "breaks", label: L14("Breaks", "Quebras"), icon: "insert_page_break", showLabel: true }],
              [{ menu: lineNumbersMenu, id: "lineNumbers", label: L14("Line Numbers", "N\xFAmeros de Linha"), icon: "format_list_numbered", showLabel: true, supports: has("setLineNumbering") }],
              [{ menu: hyphenationMenu, id: "hyphenation", label: L14("Hyphenation", "Hifeniza\xE7\xE3o"), icon: "horizontal_rule", showLabel: true, supports: has("setHyphenation") }]
            ] }
          ] },
          // Recuar (À Esquerda/À Direita) e Espaçamento (Antes/Depois) em caixas numéricas, como no Word
          { id: "paragraph", label: L14("Paragraph", "Par\xE1grafo"), icon: "format_indent_increase", prio: 5, launcher: "dlg:paragraph", cells: paragraphLayoutCells(env) }
        ]
      },
      {
        // guia Referências (como no Word): Sumário e Notas de Rodapé; Links, Citações e
        // Índice entram aqui quando chegarem
        id: "references",
        label: L14("References", "Refer\xEAncias"),
        groups: [
          // Sumário (como no Word): a galeria com Personalizado/Remover, Adicionar Texto e Atualizar
          { id: "toc", label: L14("Table of Contents", "Sum\xE1rio"), icon: "toc", prio: 4, cells: [
            { menu: () => tocGalleryMenu(env, ctx), id: "toc:menu", label: L14("Table of Contents", "Sum\xE1rio"), icon: "toc", size: "large", supports: has("insertTocTemplate") },
            { rows: [
              [{ menu: () => addTextMenu(env), id: "toc:addText", label: L14("Add Text", "Adicionar Texto"), icon: "playlist_add", showLabel: true, supports: has("setTocLevel") }],
              [{ cmd: "toc", label: true }]
            ] }
          ] },
          { id: "footnotes", label: L14("Footnotes", "Notas de Rodap\xE9"), icon: "notes", prio: 6, launcher: "dlg:notes", cells: [
            large3("footnote"),
            { rows: [
              [{ cmd: "endnote", label: true }],
              [{ menu: noteNavMenu, id: "note:nav", label: L14("Next Footnote", "Pr\xF3xima Nota de Rodap\xE9"), icon: "keyboard_arrow_down", showLabel: true, supports: has("nextNote") }],
              [{ cmd: "note:show", label: true }]
            ] }
          ] },
          { id: "captions", label: L14("Captions", "Legendas"), icon: "subtitles", prio: 5, cells: [
            large3("caption"),
            { rows: [[{ cmd: "tof", label: true }], [{ cmd: "tof:update", label: true }], [{ cmd: "crossref", label: true }]] }
          ] }
        ]
      },
      {
        id: "mailings",
        label: L14("Mailings", "Correspond\xEAncias"),
        groups: [
          { id: "merge", label: L14("Mail Merge", "Mala Direta"), icon: "mail", prio: 5, cells: [large3("mailmerge"), large3("mergefield")] }
        ]
      },
      {
        id: "review",
        label: L14("Review", "Revis\xE3o"),
        groups: [
          { id: "proofing", label: L14("Proofing", "Revis\xE3o de Texto"), icon: "spellcheck", prio: 5, cells: [large3("spelling"), { rows: [[{ cmd: "spellAsYouType", label: true }], [{ cmd: "wordCount", label: true }]] }] },
          { id: "comments", label: L14("Comments", "Coment\xE1rios"), icon: "comment", prio: 6, cells: [
            large3("comment"),
            { rows: [[{ cmd: "comment:delete", label: true }], [{ cmd: "comment:prev", label: true }], [{ cmd: "comment:next", label: true }]] },
            { cmd: "comments", size: "large" }
          ] },
          { id: "tracking", label: L14("Tracking", "Controle"), icon: "track_changes", prio: 4, cells: [
            large3("trackChanges"),
            { rows: [
              [{ menu: markupModes, id: "markupMode", label: L14("Display for Review", "Exibir para Revis\xE3o"), icon: "visibility", text: () => MODE_LABELS[env.ed.getMarkupMode()][ctx.lang], supports: () => typeof env.ed.setMarkupMode === "function" }],
              [{ menu: () => showMarkup(env, ctx), id: "showMarkup", label: L14("Show Markup", "Mostrar Marca\xE7\xE3o"), icon: "notes", showLabel: true, supports: () => typeof env.ed.setMarkupOptions === "function" }],
              [{ cmd: "reviewPane", label: true }, { menu: () => ["reviewPane:vertical", "reviewPane:horizontal"], id: "reviewPaneDir", label: { en: "Reviewing Pane", pt: "Painel de Revis\xE3o" }, icon: "arrow_drop_down", supports: () => typeof env.ed.getRevisions === "function" }]
            ] }
          ] },
          { id: "changes", label: L14("Changes", "Altera\xE7\xF5es"), icon: "check_circle", prio: 4, cells: [
            { split: "change:accept", menu: acceptItems, size: "large" },
            { split: "change:reject", menu: rejectItems, size: "large" },
            { rows: [[{ cmd: "change:prev", label: true }], [{ cmd: "change:next", label: true }]] }
          ] },
          { id: "document", label: L14("Compare & Protect", "Comparar e Proteger"), icon: "compare", prio: 3, cells: [large3("compare"), large3("enableEditing")] }
        ]
      },
      {
        id: "view",
        label: L14("View", "Exibir"),
        groups: [
          { id: "views", label: L14("Views", "Modos de Exibi\xE7\xE3o"), icon: "article", prio: 6, cells: [
            large3("view:read"),
            large3("view:print"),
            large3("view:web"),
            { rows: [[{ cmd: "view:outline", label: true }], [{ cmd: "view:draft", label: true }]] },
            large3("focus")
          ] },
          { id: "show", label: L14("Show", "Mostrar"), icon: "visibility", prio: 4, cells: [
            { rows: [[{ cmd: "view:ruler", label: true }], [{ cmd: "view:gridlines", label: true }], [{ cmd: "view:navpane", label: true }]] },
            { rows: [[{ cmd: "marks", label: true }], [{ cmd: "comments", label: true }], [{ cmd: "statusbar", label: true }]] },
            { rows: [[{ cmd: "view:bookmarks", label: true }]] }
          ] },
          { id: "zoom", label: L14("Zoom", "Zoom"), icon: "zoom_in", prio: 5, cells: [
            { menu: m.zoomItems, id: "zoom", label: L14("Zoom", "Zoom"), icon: "zoom_in", size: "large" },
            large3("zoom100"),
            { rows: [["zoomin"], ["zoomout"]] }
          ] },
          { id: "appearance", label: L14("Appearance", "Apar\xEAncia"), icon: "palette", prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: "theme", label: L14("Theme", "Tema"), icon: "contrast", size: "large" },
            { menu: () => accentMenu(env, ctx), id: "accent", label: L14("Accent", "Destaque"), icon: "palette", size: "large" },
            { menu: () => ["toolbar:compact", "toolbar:ribbon"], id: "toolbarMode", label: L14("Toolbar", "Barra"), icon: "toolbar", size: "large" }
          ] }
        ]
      },
      {
        id: "hf-tools",
        label: L14("Header & Footer", "Cabe\xE7alho e Rodap\xE9"),
        contextual: () => env.ed.editingHeaderFooter() !== null,
        groups: hfToolsGroups(env, ctx)
      },
      {
        id: "table-design",
        label: L14("Table Design", "Design da Tabela"),
        contextual: () => env.ed.editingTableCell(),
        groups: tableDesignGroups(env, ctx)
      },
      {
        id: "table-layout",
        label: L14("Table Layout", "Layout da Tabela"),
        contextual: () => env.ed.editingTableCell(),
        groups: tableLayoutGroups(env)
      },
      {
        id: "image-tools",
        label: L14("Picture Format", "Formato da Imagem"),
        contextual: () => {
          const f = env.ed.selectedImage;
          return typeof f === "function" && !!f.call(env.ed);
        },
        groups: pictureFormatGroups(env, ctx)
      },
      {
        id: "shape-tools",
        label: L14("Shape Format", "Formato da Forma"),
        contextual: () => {
          const f = env.ed.selectedShape;
          return typeof f === "function" && !!f.call(env.ed);
        },
        groups: shapeFormatGroups(env, ctx)
      }
    ]
  };
}

// src/chrome-styles.ts
var T3 = {
  en: {
    gallery: "Styles",
    pane: "Styles",
    inspector: "Style Inspector",
    createStyle: "Create a Style",
    newStyle: "New Style",
    newStyleTitle: "Create New Style from Formatting",
    modifyTitle: "Modify Style",
    name: "Name",
    type: "Style type",
    basedOn: "Style based on",
    next: "Style for following paragraph",
    properties: "Properties",
    formatting: "Formatting",
    linked: "Linked (paragraph and character)",
    paragraph: "Paragraph",
    character: "Character",
    addToGallery: "Add to the Styles gallery",
    autoUpdate: "Automatically update",
    modify: "Modify\u2026",
    format: "Format",
    fontDots: "Font\u2026",
    paraDots: "Paragraph\u2026",
    ok: "OK",
    cancel: "Cancel",
    update: (n) => `Update ${n} to Match Selection`,
    modifyDots: "Modify\u2026",
    rename: "Rename\u2026",
    renameTitle: "Rename Style",
    removeFromGallery: "Remove from Style Gallery",
    addGallery: "Add to Style Gallery",
    del: (n) => `Delete "${n}"\u2026`,
    delConfirm: (n) => `Delete all instances of the style "${n}" from the document? Its text will be formatted as Normal.`,
    delete: "Delete",
    clearAll: "Clear All",
    show: "Show",
    recommended: "Recommended",
    inUse: "In use",
    inDoc: "In current document",
    all: "All styles",
    sort: "Sort",
    asRecommended: "As Recommended",
    alphabetical: "Alphabetical",
    preview: "Show Preview",
    paraFmt: "Paragraph formatting",
    textFmt: "Text level formatting",
    plus: "Plus:",
    noDirect: "<none>",
    resetPara: "Reset to Normal Paragraph Style",
    clearParaFmt: "Clear Paragraph Formatting",
    clearCharStyle: "Clear Character Style",
    clearCharFmt: "Clear Character Formatting",
    nameTaken: "There is already a style with this name",
    empty: "Type a name for the style",
    kind: { paragraph: "Paragraph style", character: "Character style", linked: "Linked style" },
    sample: "Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text",
    prevPara: "Previous Paragraph Previous Paragraph Previous Paragraph Previous Paragraph",
    font: "Font",
    size: "Size",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    caps: "All caps",
    smallCaps: "Small caps",
    color: "Font color",
    auto: "Automatic",
    charSpacing: "Character spacing",
    left: "Left",
    center: "Centered",
    right: "Right",
    justify: "Justified",
    lineSpacing: "Line spacing",
    before: "Space before (pt)",
    after: "Space after (pt)",
    indentLeft: "Left indent (cm)",
    indentRight: "Right indent (cm)",
    special: "Special indent",
    firstLine: "First line",
    hanging: "Hanging",
    none: "(none)",
    by: "By (cm)",
    lines: { 240: "Single", 259: "1.08", 276: "1.15", 360: "1.5 lines", 480: "Double" },
    d: {
      font: (v) => `Font: ${v}`,
      pt: (v) => `${v} pt`,
      bold: "Bold",
      italic: "Italic",
      underline: "Underline",
      strike: "Strikethrough",
      caps: "All caps",
      smallCaps: "Small caps",
      color: (v) => `Font color: ${v}`,
      align: (v) => v,
      before: (v) => `Space Before: ${v} pt`,
      after: (v) => `After: ${v} pt`,
      line: (v) => `Line spacing: ${v}`,
      indent: (v) => `Indent: Left ${v}`,
      gallery: "Show in the Styles gallery",
      basedOn: (v) => `Based on: ${v}`,
      next: (v) => `Following Style: ${v}`,
      priority: (v) => `Priority: ${v}`,
      style: (v) => `Style: ${v}`,
      highlight: "Highlight",
      sup: "Superscript",
      sub: "Subscript",
      numbering: "Numbered or bulleted",
      borders: "Borders",
      shading: "Shading",
      tabs: "Tab stops",
      pageBreak: "Page break before",
      spacing: (v) => `Spacing: ${v}`
    }
  },
  pt: {
    gallery: "Estilos",
    pane: "Estilos",
    inspector: "Inspetor de Estilo",
    createStyle: "Criar um Estilo",
    newStyle: "Novo Estilo",
    newStyleTitle: "Criar Novo Estilo a Partir da Formata\xE7\xE3o",
    modifyTitle: "Modificar Estilo",
    name: "Nome",
    type: "Tipo de estilo",
    basedOn: "Estilo baseado em",
    next: "Estilo do par\xE1grafo seguinte",
    properties: "Propriedades",
    formatting: "Formata\xE7\xE3o",
    linked: "Vinculado (par\xE1grafo e caractere)",
    paragraph: "Par\xE1grafo",
    character: "Caractere",
    addToGallery: "Adicionar \xE0 galeria de Estilos",
    autoUpdate: "Atualizar automaticamente",
    modify: "Modificar\u2026",
    format: "Formatar",
    fontDots: "Fonte\u2026",
    paraDots: "Par\xE1grafo\u2026",
    ok: "OK",
    cancel: "Cancelar",
    update: (n) => `Atualizar ${n} para Corresponder \xE0 Sele\xE7\xE3o`,
    modifyDots: "Modificar\u2026",
    rename: "Renomear\u2026",
    renameTitle: "Renomear Estilo",
    removeFromGallery: "Remover da Galeria de Estilos",
    addGallery: "Adicionar \xE0 Galeria de Estilos",
    del: (n) => `Excluir "${n}"\u2026`,
    delConfirm: (n) => `Excluir todas as ocorr\xEAncias do estilo "${n}" do documento? O texto ficar\xE1 com o estilo Normal.`,
    delete: "Excluir",
    clearAll: "Limpar Tudo",
    show: "Mostrar",
    recommended: "Recomendados",
    inUse: "Em uso",
    inDoc: "No documento atual",
    all: "Todos os estilos",
    sort: "Ordenar",
    asRecommended: "Como recomendado",
    alphabetical: "Alfab\xE9tica",
    preview: "Mostrar Visualiza\xE7\xE3o",
    paraFmt: "Formata\xE7\xE3o de par\xE1grafo",
    textFmt: "Formata\xE7\xE3o de n\xEDvel de texto",
    plus: "Mais:",
    noDirect: "<nenhuma>",
    resetPara: "Redefinir para o Estilo de Par\xE1grafo Normal",
    clearParaFmt: "Limpar Formata\xE7\xE3o de Par\xE1grafo",
    clearCharStyle: "Limpar Estilo de Caractere",
    clearCharFmt: "Limpar Formata\xE7\xE3o de Caractere",
    nameTaken: "J\xE1 existe um estilo com esse nome",
    empty: "Digite um nome para o estilo",
    kind: { paragraph: "Estilo de par\xE1grafo", character: "Estilo de caractere", linked: "Estilo vinculado" },
    sample: "Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo",
    prevPara: "Par\xE1grafo Anterior Par\xE1grafo Anterior Par\xE1grafo Anterior Par\xE1grafo Anterior",
    font: "Fonte",
    size: "Tamanho",
    bold: "Negrito",
    italic: "It\xE1lico",
    underline: "Sublinhado",
    strike: "Tachado",
    caps: "Todas em mai\xFAsculas",
    smallCaps: "Versalete",
    color: "Cor da fonte",
    auto: "Autom\xE1tica",
    charSpacing: "Espa\xE7amento entre caracteres",
    left: "Esquerda",
    center: "Centralizado",
    right: "Direita",
    justify: "Justificado",
    lineSpacing: "Espa\xE7amento entre linhas",
    before: "Espa\xE7o antes (pt)",
    after: "Espa\xE7o depois (pt)",
    indentLeft: "Recuo \xE0 esquerda (cm)",
    indentRight: "Recuo \xE0 direita (cm)",
    special: "Recuo especial",
    firstLine: "Primeira linha",
    hanging: "Deslocamento",
    none: "(nenhum)",
    by: "Em (cm)",
    lines: { 240: "Simples", 259: "1,08", 276: "1,15", 360: "1,5 linha", 480: "Duplo" },
    d: {
      font: (v) => `Fonte: ${v}`,
      pt: (v) => `${String(v).replace(".", ",")} pt`,
      bold: "Negrito",
      italic: "It\xE1lico",
      underline: "Sublinhado",
      strike: "Tachado",
      caps: "Todas em mai\xFAsculas",
      smallCaps: "Versalete",
      color: (v) => `Cor da fonte: ${v}`,
      align: (v) => v,
      before: (v) => `Espa\xE7o Antes: ${String(v).replace(".", ",")} pt`,
      after: (v) => `Depois de: ${String(v).replace(".", ",")} pt`,
      line: (v) => `Espa\xE7amento entre linhas: ${v}`,
      indent: (v) => `Recuo: \xC0 esquerda ${v}`,
      gallery: "Mostrar na galeria de Estilos",
      basedOn: (v) => `Baseado em: ${v}`,
      next: (v) => `Pr\xF3ximo Estilo: ${v}`,
      priority: (v) => `Prioridade: ${v}`,
      style: (v) => `Estilo: ${v}`,
      highlight: "Realce",
      sup: "Sobrescrito",
      sub: "Subscrito",
      numbering: "Numera\xE7\xE3o ou marcadores",
      borders: "Bordas",
      shading: "Sombreamento",
      tabs: "Paradas de tabula\xE7\xE3o",
      pageBreak: "Quebra de p\xE1gina antes",
      spacing: (v) => `Espa\xE7amento: ${v}`
    }
  }
};
var SAMPLE2 = "AaBbCcDd";
var canEdit2 = (env) => !env.app.comparing && !env.ed.isProtected();
var ptOf2 = (tw) => Math.round(tw / 2) / 10;
var cmOf = (tw, dec) => (Math.round(tw / 567 * 100) / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", dec);
function drawSample(canvas, ed, look, o) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(o.w * dpr);
  canvas.height = Math.round(o.h * dpr);
  canvas.style.width = `${o.w}px`;
  canvas.style.height = `${o.h}px`;
  const c = canvas.getContext("2d");
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, o.w, o.h);
  if (o.paper) {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, o.w, o.h);
  }
  if (look.shadingHex) {
    c.fillStyle = `#${look.shadingHex}`;
    c.fillRect(2, 3, o.w - 4, o.h - 6);
  }
  const f = ed.canvasFont(look.fontFamily, look.bold, look.italic);
  const px = Math.max(o.minPx ?? 8, Math.min(o.maxPx, look.sizePt * 96 / 72));
  c.font = `${f.italic ? "italic " : ""}${f.weight} ${px}px ${f.family}`;
  c.fillStyle = look.color ? `#${look.color}` : o.autoColor ?? "#000000";
  c.textBaseline = "alphabetic";
  let text = look.allCaps ? o.text.toUpperCase() : o.text;
  if (look.smallCaps && !look.allCaps) text = text.toUpperCase();
  const tw = c.measureText(text).width;
  const x = o.align && look.alignment === "center" ? Math.max(4, (o.w - tw) / 2) : o.align && look.alignment === "right" ? Math.max(4, o.w - tw - 4) : 4;
  const y = Math.round(o.h / 2 + px * 0.33);
  if (look.borderTop || look.borderBottom) {
    c.strokeStyle = (look.borderTop ?? look.borderBottom ?? "").split(" ").pop() ?? "#000";
    c.lineWidth = 1;
    if (look.borderTop) {
      c.beginPath();
      c.moveTo(3, 3.5);
      c.lineTo(o.w - 3, 3.5);
      c.stroke();
    }
    if (look.borderBottom) {
      c.beginPath();
      c.moveTo(3, o.h - 3.5);
      c.lineTo(o.w - 3, o.h - 3.5);
      c.stroke();
    }
  }
  c.fillText(text, x, y);
  if (look.underline || look.strike) {
    c.fillRect(x, look.strike ? y - px * 0.3 : y + Math.max(1, px * 0.08), Math.min(tw, o.w - x), Math.max(1, px / 16));
  }
}
function renderTile(env, tile, s, W, H) {
  const look = env.ed.styleFormatting(s.id);
  tile.replaceChildren();
  const cv = document.createElement("canvas");
  cv.className = "uw-style-sample";
  const cap2 = document.createElement("span");
  cap2.className = "uw-style-cap";
  cap2.textContent = s.name;
  if (look) drawSample(cv, env.ed, look, { text: SAMPLE2, w: W - 4, h: H - 22, maxPx: 22, paper: true, align: false });
  tile.append(cv, cap2);
}
function styleGalleryItem(env, ui) {
  const W = 84, H = 64;
  let cache = null;
  const get = () => {
    const key = env.ed.stylesKey();
    if (!cache || cache.key !== key) {
      const list2 = env.ed.listStyles("gallery");
      const names = styleNames(env);
      cache = { key, list: list2, items: list2.map((s) => ({ id: s.id, label: s.name, tip: describeStyle(env, s, void 0, names) })) };
    }
    return cache;
  };
  const list = () => get().list;
  return {
    gallery: {
      id: "styles",
      label: { en: "Styles", pt: "Estilos" },
      icon: "style",
      tile: { w: W, h: H },
      rows: 1,
      maxCols: 7,
      minCols: 3,
      expandCols: 7,
      supports: () => typeof env.ed.listStyles === "function",
      isEnabled: () => canEdit2(env),
      items: () => get().items,
      version: () => `${env.ed.stylesVersion()}|${env.ed.knownFontFamilies().length}|${env.lang}`,
      selected: () => {
        const cur = env.ed.currentStyles();
        return list().some((s) => s.id === cur.character) ? cur.character : cur.paragraph;
      },
      render: (tile, it) => {
        const s = list().find((x) => x.id === it.id) ?? env.ed.listStyles("all").find((x) => x.id === it.id);
        if (s) renderTile(env, tile, s, W, H);
      },
      onPick: (id) => env.ed.applyStyle(id),
      context: (it) => galleryMenu(env, ui, list().find((x) => x.id === it.id)),
      footer: () => [
        { id: "style:create", icon: "add", label: { en: "Create a Style", pt: "Criar um Estilo" }, onClick: () => {
          void ui.quickCreate();
        } },
        "clear",
        { id: "styles:paneFoot", icon: "view_sidebar", label: { en: "Styles pane", pt: "Painel de estilos" }, shortcut: "Ctrl+Alt+Shift+S", onClick: () => ui.togglePane() }
      ]
    }
  };
}
function styleNames(env) {
  return new Map(env.ed.listStyles("all").map((s) => [s.id, s.name]));
}
function galleryMenu(env, ui, s) {
  const L15 = pickLabels(env.lang, T3);
  const ok = canEdit2(env);
  const out = [
    { id: "style:update", icon: "refresh", label: L15.update(s.name), disabled: !ok || s.kind === "character", onClick: () => {
      env.ed.updateStyleFromSelection(s.id);
      env.after();
    } },
    { id: "style:modify", icon: "edit", label: L15.modifyDots, disabled: !ok, onClick: () => {
      void ui.styleDialog("modify", s.id);
    } },
    { id: "style:rename", icon: "drive_file_rename_outline", label: L15.rename, disabled: !ok, onClick: () => {
      void ui.rename(s);
    } },
    s.quick ? { id: "style:ungallery", icon: "bookmark_remove", label: L15.removeFromGallery, disabled: !ok, onClick: () => {
      env.ed.setStyleInGallery(s.id, false);
      env.after();
    } } : { id: "style:togallery", icon: "bookmark_add", label: L15.addGallery, disabled: !ok, onClick: () => {
      env.ed.setStyleInGallery(s.id, true);
      env.after();
    } }
  ];
  if (!s.builtIn) {
    out.push("-", { id: "style:delete", icon: "delete", label: L15.del(s.name), disabled: !ok, onClick: () => {
      void ui.remove(s);
    } });
  }
  return out;
}
var colorName = (hex, L15) => hex ? `#${hex}` : L15.auto;
function describeStyle(env, s, look = env.ed.styleFormatting(s.id), names) {
  const L15 = pickLabels(env.lang, T3);
  if (!look) return s.name;
  const parts = [];
  const d = L15.d;
  parts.push(`${d.font(look.fontFamily)}, ${d.pt(look.sizePt)}`);
  if (look.bold) parts.push(d.bold);
  if (look.italic) parts.push(d.italic);
  if (look.underline) parts.push(d.underline);
  if (look.strike) parts.push(d.strike);
  if (look.allCaps) parts.push(d.caps);
  if (look.smallCaps) parts.push(d.smallCaps);
  if (look.color) parts.push(d.color(colorName(look.color, L15)));
  if (s.kind !== "character") {
    if (look.alignment !== "left") parts.push({ center: L15.center, right: L15.right, both: L15.justify }[look.alignment]);
    if (look.lineTwentieths !== void 0) parts.push(d.line(L15.lines[look.lineTwentieths] ?? `${(look.lineTwentieths / 240).toFixed(2)}`));
    if (look.spaceBeforeTwips) parts.push(d.before(ptOf2(look.spaceBeforeTwips)));
    if (look.spaceAfterTwips || look.spaceBeforeTwips) parts.push(d.after(ptOf2(look.spaceAfterTwips)));
    if (look.indentLeftTwips) parts.push(d.indent(`${cmOf(look.indentLeftTwips, env.lang === "pt" ? "," : ".")} cm`));
  }
  parts.push(d.style(L15.kind[s.kind]));
  if (s.quick) parts.push(d.gallery);
  parts.push(d.priority(s.priority + 1));
  const nm = names ?? styleNames(env);
  const name = (id) => id ? nm.get(id) ?? id : void 0;
  if (s.basedOn) parts.push(d.basedOn(name(s.basedOn)));
  if (s.kind !== "character") parts.push(d.next(name(s.next) ?? s.name));
  return `${s.name}
${parts.join(", ")}`;
}
function describeDirect(env, run, para) {
  const L15 = pickLabels(env.lang, T3);
  const d = L15.d;
  const parts = [];
  if (para) {
    const a = para["alignment"];
    if (a) parts.push({ left: L15.left, center: L15.center, right: L15.right, both: L15.justify }[a] ?? a);
    if (para["lineTwentieths"] !== void 0) parts.push(d.line(L15.lines[para["lineTwentieths"]] ?? String(para["lineTwentieths"])));
    if (para["spaceBeforeTwips"] !== void 0) parts.push(d.before(ptOf2(para["spaceBeforeTwips"])));
    if (para["spaceAfterTwips"] !== void 0) parts.push(d.after(ptOf2(para["spaceAfterTwips"])));
    if (para["indentLeftTwips"] !== void 0) parts.push(d.indent(`${cmOf(para["indentLeftTwips"], env.lang === "pt" ? "," : ".")} cm`));
    if (para["numbering"]) parts.push(d.numbering);
    if (para["borders"]) parts.push(d.borders);
    if (para["shadingHex"]) parts.push(d.shading);
    if (para["tabStops"]) parts.push(d.tabs);
    if (para["pageBreakBefore"]) parts.push(d.pageBreak);
  } else {
    if (run["fontAscii"]) parts.push(d.font(run["fontAscii"]));
    if (run["szHalfPt"] !== void 0) parts.push(d.pt(run["szHalfPt"] / 2));
    if (run["bold"]) parts.push(d.bold);
    if (run["italic"]) parts.push(d.italic);
    if (run["underline"]) parts.push(d.underline);
    if (run["strike"] || run["doubleStrike"]) parts.push(d.strike);
    if (run["allCaps"]) parts.push(d.caps);
    if (run["smallCaps"]) parts.push(d.smallCaps);
    if (run["color"]) parts.push(d.color(colorName(run["color"], L15)));
    if (run["highlight"]) parts.push(d.highlight);
    if (run["vertAlign"]) parts.push(run["vertAlign"] === "superscript" ? d.sup : d.sub);
    if (run["charSpacingTwips"]) parts.push(d.spacing(d.pt(ptOf2(run["charSpacingTwips"]))));
  }
  return parts.length ? parts.join(", ") : L15.noDirect;
}
var el18 = (tag, props = {}, ...kids) => {
  const { cls, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (cls) e.className = cls;
  e.append(...kids);
  return e;
};
var draftOf = (l) => ({
  fontAscii: l.fontFamily,
  szHalfPt: Math.round(l.sizePt * 2),
  bold: l.bold,
  italic: l.italic,
  underline: l.underline,
  strike: l.strike,
  allCaps: l.allCaps,
  smallCaps: l.smallCaps,
  color: l.color,
  charSpacingTwips: l.charSpacingTwips,
  alignment: l.alignment,
  spaceBeforeTwips: l.spaceBeforeTwips,
  spaceAfterTwips: l.spaceAfterTwips,
  lineTwentieths: l.lineTwentieths,
  indentLeftTwips: l.indentLeftTwips,
  indentRightTwips: l.indentRightTwips,
  indentFirstLineTwips: l.indentFirstLineTwips
});
var lookOfDraft = (d, base) => ({ ...base, ...d, fontFamily: d.fontAscii, sizePt: d.szHalfPt / 2 });
function diff(a, b, para) {
  const f = {};
  const keys = [
    "fontAscii",
    "szHalfPt",
    "bold",
    "italic",
    "underline",
    "strike",
    "allCaps",
    "smallCaps",
    "color",
    "charSpacingTwips",
    ...para ? ["alignment", "spaceBeforeTwips", "spaceAfterTwips", "lineTwentieths", "indentLeftTwips", "indentRightTwips", "indentFirstLineTwips"] : []
  ];
  for (const k of keys) {
    if (a[k] === b[k]) continue;
    f[k] = b[k] === void 0 ? null : b[k];
  }
  return f;
}
var StylesUI = class {
  constructor(env) {
    this.env = env;
    this.filter = env.app.prefs.get("stylesFilter") ?? "recommended";
    this.alpha = env.app.prefs.get("stylesSort") === "alpha";
    this.preview = env.app.prefs.get("stylesPreview") === "1";
  }
  env;
  pane = null;
  inspector = null;
  filter = "recommended";
  alpha = false;
  preview = false;
  listEl = null;
  lastKey = "";
  inspRows = null;
  get L() {
    return pickLabels(this.env.lang, T3);
  }
  /** Galeria da ribbon (Página Inicial › Estilos). */
  galleryItem() {
    return styleGalleryItem(this.env, this);
  }
  get paneOpen() {
    return !!this.pane?.open;
  }
  get inspectorOpen() {
    return !!this.inspector?.open;
  }
  // ── painel de estilos ──
  togglePane() {
    if (this.pane?.open) {
      this.pane.close();
      return;
    }
    const { env } = this;
    const L15 = this.L;
    const body = el18("div", { cls: "uw-styles" });
    const sel4 = (name, opts2, v, on) => {
      const s = el18("select", { name });
      for (const [k, t2] of opts2) s.append(el18("option", { value: k, textContent: t2 }));
      s.value = v;
      s.addEventListener("change", () => {
        on(s.value);
        this.lastKey = "";
        this.renderList();
      });
      return s;
    };
    const opts = el18(
      "div",
      { cls: "uw-styles-opts" },
      sel4(
        "filter",
        [["recommended", L15.recommended], ["inUse", L15.inUse], ["document", L15.inDoc], ["all", L15.all]],
        this.filter,
        (v) => {
          this.filter = v;
          env.app.prefs.set("stylesFilter", v);
        }
      ),
      sel4(
        "sort",
        [["prio", L15.asRecommended], ["alpha", L15.alphabetical]],
        this.alpha ? "alpha" : "prio",
        (v) => {
          this.alpha = v === "alpha";
          env.app.prefs.set("stylesSort", v === "alpha" ? "alpha" : "");
        }
      )
    );
    const prev = el18("input", { type: "checkbox", checked: this.preview });
    prev.addEventListener("change", () => {
      this.preview = prev.checked;
      env.app.prefs.set("stylesPreview", prev.checked ? "1" : "");
      this.lastKey = "";
      this.renderList();
    });
    this.listEl = el18("div", { cls: "uw-styles-list" });
    this.listEl.setAttribute("role", "listbox");
    body.append(opts, this.listEl, el18("label", { cls: "uo-check uw-styles-prev" }, prev, L15.preview));
    const foot = el18("div");
    const btn3 = (icon, label, a, fn) => {
      const b = el18("button", { type: "button", cls: "uo-btn", title: label });
      b.dataset["a"] = a;
      b.setAttribute("aria-label", label);
      b.innerHTML = symbol(icon);
      b.addEventListener("click", fn);
      return b;
    };
    foot.append(
      btn3("add", L15.newStyle, "styles:new", () => {
        void this.styleDialog("new");
      }),
      btn3("manage_search", L15.inspector, "styles:inspector", () => this.toggleInspector())
    );
    this.pane = openPane({
      id: "styles",
      title: L15.pane,
      lang: env.lang,
      layer: env.layer,
      width: 280,
      body,
      footer: foot,
      frame: env.frame,
      onClose: () => {
        this.pane = null;
        this.listEl = null;
        env.ed.classList.remove("uw-has-pane");
        this.placeInspector();
        env.after();
      }
    });
    env.ed.classList.add("uw-has-pane");
    this.lastKey = "";
    this.renderList();
    this.placeInspector();
  }
  renderList() {
    const box = this.listEl;
    if (!box) return;
    const { env } = this;
    const cur = env.ed.currentStyles();
    const key = `${env.ed.stylesKey()}|${this.filter}|${this.alpha}|${this.preview}|${cur.paragraph}|${cur.character}|${env.ed.knownFontFamilies().length}|${canEdit2(env)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    let list = env.ed.listStyles(this.filter);
    if (this.alpha) list = [...list].sort((a, b) => a.name.localeCompare(b.name, env.lang === "pt" ? "pt-BR" : "en"));
    const ok = canEdit2(env);
    const names = styleNames(env);
    box.replaceChildren(...list.map((s) => {
      const row3 = el18("div", { cls: "uw-style-row" });
      row3.dataset["id"] = s.id;
      row3.setAttribute("role", "option");
      row3.title = describeStyle(env, s, void 0, names);
      const on = s.id === cur.character || s.id === cur.paragraph && !list.some((x) => x.id === cur.character);
      row3.classList.toggle("uo-on", on);
      row3.setAttribute("aria-selected", String(on));
      const name = el18("span", { cls: "uw-style-name" });
      if (this.preview) {
        const look = env.ed.styleFormatting(s.id);
        const cv = document.createElement("canvas");
        if (look) drawSample(cv, env.ed, look, { text: s.name, w: 190, h: 24, maxPx: 18, minPx: 9, autoColor: getComputedStyle(box).color });
        name.append(cv);
      } else name.textContent = s.name;
      const mark = el18("span", { cls: "uw-style-kind", textContent: { paragraph: "\xB6", character: "a", linked: "\xB6a" }[s.kind] });
      const more = el18("button", { type: "button", cls: "uo-btn uw-style-more", title: this.L.modifyDots });
      more.innerHTML = symbol("arrow_drop_down");
      more.addEventListener("mousedown", (e) => e.preventDefault());
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = more.getBoundingClientRect();
        openMenu(galleryMenu(env, this, s), { x: r.left, y: r.bottom }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      row3.append(name, mark, more);
      row3.addEventListener("mousedown", (e) => e.preventDefault());
      row3.addEventListener("click", () => {
        if (ok) {
          env.ed.applyStyle(s.id);
          env.after();
        }
      });
      row3.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openMenu(galleryMenu(env, this, s), { x: e.clientX, y: e.clientY }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      return row3;
    }));
  }
  // ── inspetor ──
  toggleInspector() {
    if (this.inspector?.open) {
      this.inspector.close();
      return;
    }
    const { env } = this;
    const L15 = this.L;
    const body = el18("div", { cls: "uw-insp" });
    const row3 = (value, icon, tip, a, fn) => {
      const b = el18("button", { type: "button", cls: "uo-btn", title: tip });
      b.dataset["a"] = a;
      b.setAttribute("aria-label", tip);
      b.innerHTML = symbol(icon);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        fn();
        env.after();
      });
      return el18("div", { cls: "uw-insp-row" }, value, b);
    };
    const box = () => el18("div", { cls: "uw-insp-val" });
    const r = { pStyle: box(), pDirect: box(), tStyle: box(), tDirect: box() };
    body.append(
      el18("div", { cls: "uw-insp-h", textContent: L15.paraFmt }),
      row3(r.pStyle, "format_clear", L15.resetPara, "insp:resetPara", () => env.ed.clearParagraphStyle()),
      row3(r.pDirect, "format_clear", L15.clearParaFmt, "insp:clearPara", () => env.ed.clearParagraphFormatting()),
      el18("div", { cls: "uw-insp-h", textContent: L15.textFmt }),
      row3(r.tStyle, "format_clear", L15.clearCharStyle, "insp:clearCharStyle", () => env.ed.clearCharacterStyle()),
      row3(r.tDirect, "format_clear", L15.clearCharFmt, "insp:clearChar", () => env.ed.clearCharacterFormatting())
    );
    this.inspRows = r;
    const foot = el18("div");
    const pill = (label, a, fn) => {
      const b = el18("button", { type: "button", cls: "uo-pill", textContent: label });
      b.dataset["a"] = a;
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", fn);
      return b;
    };
    foot.append(
      pill(L15.newStyle, "insp:new", () => {
        void this.styleDialog("new");
      }),
      pill(L15.clearAll, "insp:clearAll", () => {
        env.ed.clearFormatting();
        env.after();
      })
    );
    this.inspector = openPane({
      id: "styleInspector",
      title: L15.inspector,
      lang: env.lang,
      layer: env.layer,
      width: 300,
      body,
      footer: foot,
      frame: () => this.inspectorFrame(),
      onClose: () => {
        this.inspector = null;
        this.inspRows = null;
        env.after();
      }
    });
    this.inspector.el.classList.add("uw-insp-pane");
    this.syncInspector();
  }
  inspectorFrame() {
    const f = this.env.frame();
    const right = this.pane?.open ? f.right - 290 : f.right - 12;
    return new DOMRect(right - 300, f.top + 12, 300, Math.min(330, f.height - 24));
  }
  placeInspector() {
    this.inspector?.place();
  }
  syncInspector() {
    const r = this.inspRows;
    if (!r) return;
    const i = this.env.ed.inspectStyle();
    r.pStyle.textContent = i.paragraph.name;
    r.pDirect.textContent = `${this.L.plus} ${describeDirect(this.env, {}, i.paragraph.direct)}`;
    r.tStyle.textContent = i.text.name;
    r.tDirect.textContent = `${this.L.plus} ${describeDirect(this.env, i.text.direct, null)}`;
  }
  /** Chamado a cada sync da barra. */
  sync() {
    if (this.pane?.open) {
      this.pane.place();
      this.renderList();
    }
    if (this.inspector?.open) {
      this.inspector.place();
      this.syncInspector();
    }
  }
  close() {
    this.pane?.close();
    this.inspector?.close();
  }
  // ── diálogos ──
  /** "Criar um Estilo" (galeria): nome + visualização; Modificar… abre o completo. */
  async quickCreate() {
    const { env } = this;
    const L15 = this.L;
    if (!canEdit2(env)) return;
    const input = el18("input", { type: "text", value: this.freeName() });
    const look = this.selectionLook();
    const cv = document.createElement("canvas");
    if (look) drawSample(cv, env.ed, look, { text: SAMPLE2, w: 360, h: 56, maxPx: 30, paper: true, align: true });
    const msg = el18("div", { cls: "uw-style-msg" });
    const body = el18("div", { cls: "uw-style-quick" }, el18("label", { cls: "uo-field" }, el18("span", { textContent: L15.name }), input), cv, msg);
    let action = null;
    const h = openDialog({
      title: L15.newStyleTitle,
      body,
      layer: env.layer,
      lang: env.lang,
      width: 420,
      actions: [{ id: "modify", label: L15.modify }, { id: "cancel", label: L15.cancel }, { id: "ok", label: L15.ok, primary: true }],
      onAction: (id) => {
        if (id === "cancel") return true;
        const name = input.value.trim();
        if (!name) {
          msg.textContent = L15.empty;
          return false;
        }
        if (env.ed.listStyles("all").some((s) => s.name.toLowerCase() === name.toLowerCase())) {
          msg.textContent = L15.nameTaken;
          return false;
        }
        return true;
      }
    });
    action = await h.result;
    if (action === "ok") {
      env.ed.createStyle({ name: input.value.trim() });
      env.after();
    } else if (action === "modify") await this.styleDialog("new", void 0, input.value.trim());
  }
  freeName() {
    const names = new Set(this.env.ed.listStyles("all").map((s) => s.name.toLowerCase()));
    const base = this.env.lang === "pt" ? "Estilo" : "Style";
    for (let i = 1; ; i++) if (!names.has(`${base}${i}`.toLowerCase())) return `${base}${i}`;
  }
  /** Formatação efetiva no cursor: o estilo do parágrafo + o direto da seleção. */
  selectionLook() {
    const ed = this.env.ed;
    const base = ed.styleFormatting(ed.currentStyles().paragraph);
    if (!base) return null;
    const f = ed.selectionStyleFormat();
    const out = { ...base };
    for (const [k, v] of Object.entries(f)) if (v !== null && v !== void 0) out[k === "fontAscii" ? "fontFamily" : k === "szHalfPt" ? "sizePt" : k] = k === "szHalfPt" ? v / 2 : v;
    return out;
  }
  /** Criar Novo Estilo / Modificar Estilo (diálogo completo). */
  async styleDialog(mode, id, presetName) {
    const { env } = this;
    const ed = env.ed;
    const L15 = this.L;
    if (!canEdit2(env)) return;
    const all = ed.listStyles("all");
    const info = id ? all.find((s) => s.id === id) : void 0;
    if (mode === "modify" && !info) return;
    const dec = env.lang === "pt" ? "," : ".";
    let kind = info?.kind ?? "linked";
    const cur = ed.currentStyles().paragraph;
    const startLook = mode === "modify" ? ed.styleFormatting(id) : this.selectionLook();
    if (!startLook) return;
    const start = draftOf(startLook);
    const draft = { ...start };
    const nameIn = el18("input", { type: "text", value: info?.name ?? presetName ?? this.freeName() });
    const typeSel = el18("select", { name: "type" });
    for (const [k, t2] of [["linked", L15.linked], ["paragraph", L15.paragraph], ["character", L15.character]]) typeSel.append(el18("option", { value: k, textContent: t2 }));
    typeSel.value = kind;
    typeSel.disabled = mode === "modify";
    const baseSel = el18("select", { name: "basedOn" });
    const nextSel = el18("select", { name: "next" });
    const fillBases = () => {
      baseSel.replaceChildren();
      nextSel.replaceChildren();
      const paraStyles = all.filter((s) => s.kind !== "character" && s.id !== id);
      const charStyles = all.filter((s) => s.kind !== "paragraph" && s.id !== id);
      const opts = kind === "character" ? charStyles : paraStyles;
      if (kind === "character") baseSel.append(el18("option", { value: "", textContent: L15.none }));
      for (const s of opts) baseSel.append(el18("option", { value: s.id, textContent: s.name }));
      baseSel.value = info?.basedOn ?? (kind === "character" ? "" : cur);
      if (kind !== "character") {
        nextSel.append(el18("option", { value: "", textContent: nameIn.value.trim() || L15.none }));
        for (const s of paraStyles) nextSel.append(el18("option", { value: s.id, textContent: s.name }));
        nextSel.value = info?.next && info.next !== id ? info.next : "";
      }
      nextSel.disabled = kind === "character";
    };
    fillBases();
    typeSel.addEventListener("change", () => {
      kind = typeSel.value;
      fillBases();
      refresh();
    });
    const families = await ed.listAvailableFonts();
    const fontSel = el18("select", { name: "font" });
    for (const f of draft.fontAscii && !families.includes(draft.fontAscii) ? [draft.fontAscii, ...families] : families) fontSel.append(el18("option", { value: f, textContent: f }));
    fontSel.value = draft.fontAscii;
    const sizeIn = el18("input", { type: "number", name: "size", min: "1", max: "1638", step: "0.5", value: String(draft.szHalfPt / 2) });
    sizeIn.style.width = "64px";
    const tog = (k, icon, tip) => {
      const b = el18("button", { type: "button", cls: "uo-btn", title: tip });
      b.dataset["a"] = `dlg:${k}`;
      b.innerHTML = symbol(icon);
      const upd = () => {
        b.classList.toggle("uo-on", draft[k]);
        b.setAttribute("aria-pressed", String(draft[k]));
      };
      b.addEventListener("click", () => {
        draft[k] = !draft[k];
        upd();
        refresh();
      });
      upd();
      return b;
    };
    const colorIn2 = el18("input", { type: "color", name: "color", value: `#${draft.color ?? "000000"}` });
    colorIn2.style.cssText = "width:40px;height:30px;padding:2px;border-radius:8px";
    const alignBtns = ["left", "center", "right", "both"].map((a) => {
      const b = el18("button", { type: "button", cls: "uo-btn", title: { left: L15.left, center: L15.center, right: L15.right, both: L15.justify }[a] });
      b.dataset["a"] = `dlg:align:${a}`;
      b.innerHTML = symbol(a === "both" ? "format_align_justify" : `format_align_${a}`);
      b.addEventListener("click", () => {
        draft.alignment = a;
        syncAlign();
        refresh();
      });
      return b;
    });
    const syncAlign = () => alignBtns.forEach((b, i) => b.classList.toggle("uo-on", ["left", "center", "right", "both"][i] === draft.alignment));
    syncAlign();
    const lineSel = el18("select", { name: "line" });
    for (const v of [240, 259, 276, 360, 480]) lineSel.append(el18("option", { value: String(v), textContent: L15.lines[v] }));
    if (draft.lineTwentieths !== void 0 && ![240, 259, 276, 360, 480].includes(draft.lineTwentieths)) {
      lineSel.append(el18("option", { value: String(draft.lineTwentieths), textContent: (draft.lineTwentieths / 240).toFixed(2).replace(".", dec) }));
    }
    lineSel.value = String(draft.lineTwentieths ?? 240);
    const num3 = (v, step, name2) => {
      const i = el18("input", { type: "number", name: name2, min: "0", step, value: String(v) });
      i.style.width = "72px";
      return i;
    };
    const beforeIn = num3(ptOf2(draft.spaceBeforeTwips), "6", "before");
    const afterIn = num3(ptOf2(draft.spaceAfterTwips), "6", "after");
    const indentIn = num3(Math.round(draft.indentLeftTwips / 567 * 100) / 100, "0.25", "indentLeft");
    const read = () => {
      draft.fontAscii = fontSel.value;
      const sz = parseFloat(sizeIn.value.replace(",", "."));
      if (sz > 0) draft.szHalfPt = Math.round(sz * 2);
      const hex = colorIn2.value.slice(1).toUpperCase();
      if (hex !== (start.color ?? "000000") || draft.color !== start.color) draft.color = hex === "000000" && !start.color ? void 0 : hex;
      draft.lineTwentieths = Number(lineSel.value);
      draft.spaceBeforeTwips = Math.round(Number(beforeIn.value.replace(",", ".")) * 20) || 0;
      draft.spaceAfterTwips = Math.round(Number(afterIn.value.replace(",", ".")) * 20) || 0;
      draft.indentLeftTwips = Math.round(Number(indentIn.value.replace(",", ".")) * 567) || 0;
    };
    for (const i of [fontSel, sizeIn, colorIn2, lineSel, beforeIn, afterIn, indentIn]) i.addEventListener("change", () => {
      read();
      refresh();
    });
    const formatBtn = el18("button", { type: "button", cls: "uo-pill", textContent: `${L15.format} \u25BE` });
    formatBtn.dataset["a"] = "dlg:format";
    formatBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = formatBtn.getBoundingClientRect();
      openMenu([
        { id: "dlg:format:font", icon: "text_format", label: L15.fontDots, onClick: () => {
          void this.fontSub(draft).then(refresh);
        } },
        { id: "dlg:format:para", icon: "format_textdirection_l_to_r", label: L15.paraDots, disabled: kind === "character", onClick: () => {
          void this.paraSub(draft).then(() => {
            syncAlign();
            beforeIn.value = String(ptOf2(draft.spaceBeforeTwips));
            afterIn.value = String(ptOf2(draft.spaceAfterTwips));
            indentIn.value = String(Math.round(draft.indentLeftTwips / 567 * 100) / 100);
            lineSel.value = String(draft.lineTwentieths ?? 240);
            refresh();
          });
        } }
      ], { x: r.left, y: r.top - 4 }, { lang: env.lang, layer: env.layer });
    });
    const cv = document.createElement("canvas");
    cv.className = "uw-style-prev";
    const desc = el18("div", { cls: "uw-style-desc" });
    const quick = el18("input", { type: "checkbox", checked: info?.quick ?? true });
    const auto = el18("input", { type: "checkbox", checked: info?.autoUpdate ?? false });
    const msg = el18("div", { cls: "uw-style-msg" });
    const refresh = () => {
      const look = lookOfDraft(draft, startLook);
      drawPreview(cv, ed, look, L15, kind);
      const fake = {
        id: id ?? "",
        name: nameIn.value.trim() || "\u2026",
        rawName: "",
        kind,
        builtIn: !!info?.builtIn,
        defined: true,
        quick: quick.checked,
        hidden: false,
        priority: info?.priority ?? 0,
        inUse: false,
        isDefault: false,
        basedOn: baseSel.value || void 0,
        next: nextSel.value || void 0,
        autoUpdate: auto.checked
      };
      desc.textContent = describeStyle(env, fake, look).split("\n")[1] ?? "";
      for (const b of alignBtns) b.disabled = kind === "character";
      for (const i of [lineSel, beforeIn, afterIn, indentIn]) i.disabled = kind === "character";
    };
    nameIn.addEventListener("input", () => {
      fillBases();
      refresh();
    });
    for (const i of [baseSel, nextSel, quick, auto]) i.addEventListener("change", refresh);
    const grid2 = el18(
      "div",
      { cls: "uo-dialog-grid" },
      el18("span", { textContent: L15.name }),
      nameIn,
      el18("span", { textContent: L15.type }),
      typeSel,
      el18("span", { textContent: L15.basedOn }),
      baseSel,
      el18("span", { textContent: L15.next }),
      nextSel
    );
    const fmtRow1 = el18(
      "div",
      { cls: "uw-style-fmt" },
      fontSel,
      sizeIn,
      tog("bold", "format_bold", L15.bold),
      tog("italic", "format_italic", L15.italic),
      tog("underline", "format_underlined", L15.underline),
      colorIn2
    );
    const fmtRow2 = el18("div", { cls: "uw-style-fmt" }, ...alignBtns, el18("span", { textContent: L15.lineSpacing }), lineSel);
    const fmtRow3 = el18(
      "div",
      { cls: "uw-style-fmt" },
      el18("span", { textContent: L15.before }),
      beforeIn,
      el18("span", { textContent: L15.after }),
      afterIn,
      el18("span", { textContent: L15.indentLeft }),
      indentIn
    );
    const checks = el18(
      "div",
      { cls: "uw-style-checks" },
      el18("label", { cls: "uo-check" }, quick, L15.addToGallery),
      el18("label", { cls: "uo-check" }, auto, L15.autoUpdate)
    );
    const body = el18(
      "div",
      { cls: "uw-style-dlg" },
      el18("strong", { textContent: L15.properties }),
      grid2,
      el18("strong", { textContent: L15.formatting }),
      fmtRow1,
      fmtRow2,
      fmtRow3,
      cv,
      desc,
      checks,
      el18("div", {}, formatBtn),
      msg
    );
    refresh();
    const h = openDialog({
      title: mode === "new" ? L15.newStyleTitle : L15.modifyTitle,
      body,
      layer: env.layer,
      lang: env.lang,
      width: 560,
      actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.ok, primary: true }],
      onAction: (a) => {
        if (a !== "ok") return true;
        read();
        const name2 = nameIn.value.trim();
        if (!name2) {
          msg.textContent = L15.empty;
          return false;
        }
        if (all.some((s) => s.id !== id && s.name.toLowerCase() === name2.toLowerCase())) {
          msg.textContent = L15.nameTaken;
          return false;
        }
        return true;
      }
    });
    if (await h.result !== "ok") return;
    const name = nameIn.value.trim();
    if (mode === "new") {
      const baseLook = baseSel.value ? ed.styleFormatting(baseSel.value) : ed.styleFormatting(ed.currentStyles().paragraph);
      const format = baseLook ? diff(draftOf(baseLook), draft, kind !== "character") : {};
      for (const k of Object.keys(format)) if (format[k] === null) delete format[k];
      ed.createStyle({ name, type: kind, basedOn: baseSel.value || void 0, next: nextSel.value || void 0, quick: quick.checked, autoUpdate: auto.checked, format, fromSelection: false });
    } else {
      ed.modifyStyle(id, {
        name: name !== info.name ? name : void 0,
        basedOn: baseSel.value && baseSel.value !== info.basedOn ? baseSel.value : void 0,
        next: kind === "character" ? void 0 : (nextSel.value || null) !== (info.next && info.next !== id ? info.next : null) ? nextSel.value || null : void 0,
        quick: quick.checked !== info.quick ? quick.checked : void 0,
        autoUpdate: auto.checked !== info.autoUpdate ? auto.checked : void 0,
        format: diff(start, draft, kind !== "character")
      });
    }
    env.after();
  }
  /** Formatar › Fonte… (rascunho do estilo). */
  async fontSub(d) {
    const L15 = this.L;
    const box = (k, label) => {
      const i = el18("input", { type: "checkbox", checked: !!d[k] });
      i.name = k;
      return el18("label", { cls: "uo-check" }, i, label);
    };
    const spacing = el18("input", { type: "number", name: "charSpacing", step: "0.5", value: String(ptOf2(d.charSpacingTwips)) });
    const body = el18(
      "div",
      { cls: "uw-style-sub" },
      el18(
        "div",
        { cls: "uw-style-fx" },
        box("bold", L15.bold),
        box("italic", L15.italic),
        box("underline", L15.underline),
        box("strike", L15.strike),
        box("allCaps", L15.caps),
        box("smallCaps", L15.smallCaps)
      ),
      el18("label", { cls: "uo-field" }, el18("span", { textContent: `${L15.charSpacing} (pt)` }), spacing)
    );
    const h = openDialog({ title: L15.font, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.ok, primary: true }] });
    if (await h.result !== "ok") return;
    for (const k of ["bold", "italic", "underline", "strike", "allCaps", "smallCaps"]) d[k] = body.querySelector(`input[name="${k}"]`).checked;
    d.charSpacingTwips = Math.round(Number(spacing.value.replace(",", ".")) * 20) || 0;
  }
  /** Formatar › Parágrafo… (recuos à direita e especial). */
  async paraSub(d) {
    const L15 = this.L;
    const right = el18("input", { type: "number", name: "indentRight", min: "0", step: "0.25", value: String(Math.round(d.indentRightTwips / 567 * 100) / 100) });
    const special = el18("select", { name: "special" });
    for (const [k, t2] of [["none", L15.none], ["firstLine", L15.firstLine], ["hanging", L15.hanging]]) special.append(el18("option", { value: k, textContent: t2 }));
    special.value = !d.indentFirstLineTwips ? "none" : d.indentFirstLineTwips > 0 ? "firstLine" : "hanging";
    const by = el18("input", { type: "number", name: "by", min: "0", step: "0.25", value: String(Math.round(Math.abs(d.indentFirstLineTwips) / 567 * 100) / 100 || 1.25) });
    const body = el18(
      "div",
      { cls: "uo-dialog-grid" },
      el18("span", { textContent: L15.indentRight }),
      right,
      el18("span", { textContent: L15.special }),
      special,
      el18("span", { textContent: L15.by }),
      by
    );
    const h = openDialog({ title: L15.paragraph, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.ok, primary: true }] });
    if (await h.result !== "ok") return;
    d.indentRightTwips = Math.round(Number(right.value.replace(",", ".")) * 567) || 0;
    const v = Math.round(Number(by.value.replace(",", ".")) * 567) || 0;
    d.indentFirstLineTwips = special.value === "none" ? 0 : special.value === "firstLine" ? v : -v;
  }
  async rename(s) {
    const L15 = this.L;
    const v = await promptDialog({ title: L15.renameTitle, label: L15.name, value: s.name, layer: this.env.layer, lang: this.env.lang });
    if (v === null || !v.trim() || v.trim() === s.name) return;
    if (!this.env.ed.renameStyle(s.id, v.trim())) this.env.app.ui?.flash(L15.nameTaken);
    this.env.after();
  }
  async remove(s) {
    const L15 = this.L;
    const h = openDialog({
      title: L15.del(s.name).replace(/…$/, ""),
      body: L15.delConfirm(s.name),
      layer: this.env.layer,
      lang: this.env.lang,
      icon: "delete",
      actions: [{ id: "cancel", label: L15.cancel }, { id: "ok", label: L15.delete, primary: true }]
    });
    if (await h.result === "ok") this.env.ed.deleteStyle(s.id);
    this.env.after();
  }
};
function drawPreview(cv, ed, look, L15, kind) {
  const W = 508, H = 96;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const c = cv.getContext("2d");
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#a0a0a0";
  c.font = "9px sans-serif";
  c.fillText(L15.prevPara, 8, 14);
  const inner = document.createElement("canvas");
  drawSample(inner, ed, look, { text: kind === "character" ? L15.sample.split(" ").slice(0, 4).join(" ") : L15.sample, w: W - 16, h: 46, maxPx: 28, minPx: 8, align: kind !== "character" });
  c.drawImage(inner, 8, 22, W - 16, 46);
  c.fillStyle = "#a0a0a0";
  c.font = "9px sans-serif";
  c.fillText(L15.prevPara, 8, 84);
}

// src/chrome.ts
function plainSplits(cfg, ids) {
  if (!ids.size) return cfg;
  const item = (it) => typeof it === "object" && "split" in it && ids.has(it.split) ? { cmd: it.split, ...it.size ? { size: it.size } : {}, ...it.label ? { label: it.label } : {} } : it;
  const cell = (c) => typeof c === "object" && "rows" in c ? { rows: c.rows.map((r) => r.map(item)) } : item(c);
  const group2 = (g) => ({ ...g, ...g.items ? { items: g.items.map(item) } : {}, ...g.cells ? { cells: g.cells.map(cell) } : {} });
  if ("menus" in cfg) return { ...cfg, groups: cfg.groups.map(group2) };
  return { ...cfg, tabs: cfg.tabs.map((t2) => ({ ...t2, groups: t2.groups.map(group2) })) };
}
if (!customElements.get("u-ripple")) await import("./ripple-OH663BHI.js").catch(() => void 0);
var CHROME_CSS = (
  /* css */
  `
:host { --uo-font: var(--uw-font, "Segoe UI", system-ui, -apple-system, sans-serif); }
/* UMA cor de fundo, como o Google Docs/Drive: mesa, barras, r\xE9gua, pain\xE9is e
   status s\xE3o --uw-background (--uw-bg, definido no :host do elemento: padr\xE3o
   --u-color-surface-container-low); s\xF3 a p\xE1gina e o que flutua (menus,
   di\xE1logos, cart\xF5es) t\xEAm outra cor. --uw-desk e --uo-bar-bg seguem valendo
   para cada parte. Claro/escuro: tudo por tokens/light-dark(), pelo color-scheme. */
:host { background: var(--uw-desk, var(--uw-bg)); }
.uw-topbar { background: var(--uo-bar-bg, var(--uw-bg)) !important; border-bottom: 0 !important; }
.uw-bottombar { background: var(--uo-bar-bg, var(--uw-bg)) !important; }
.uw-topbar > .uo-bar, .uw-bottombar > .uo-bar { background: transparent; }
.uo-pane { background: var(--uo-bar-bg, var(--uw-bg)); }
/* a "p\xEDlula" das ferramentas (e o corpo da ribbon): tom de destaque leve sobre o
   fundo \xFAnico (no escuro, um degrau acima para n\xE3o sumir) \u2014 agrupa as ferramentas
   como no Docs, sem virar outra faixa de cor */
.uw-topbar .uo-toolbar, .uw-topbar .uo-ribbon-body {
  background: var(--uo-bar-container, light-dark(var(--u-color-surface-container, #efedf1), var(--u-color-surface-container-high, #292a2d)));
}
:host(.view-read) .uo-toolrow, :host(.view-read) .uo-ribbon-body, :host(.view-read) .uw-protbar { display: none !important; }
:host(.uw-focus) .uw-topbar, :host(.uw-focus) .uw-bottombar { display: none !important; }
:host(.uw-comparing) .pages { display: none !important; }
:host(.uw-has-comments) .pages { padding-right: 300px; }

/* estilos: miniaturas da galeria, painel de estilos, inspetor, di\xE1logo */
:host(.uw-has-pane) .pages { padding-right: 304px; }
:host(.uw-has-pane.uw-has-comments) .pages { padding-right: 604px; }
.uo-gal-tile { display: flex; flex-direction: column; align-items: stretch; }
.uw-style-sample { display: block; margin: 2px 2px 0; border-radius: 4px; flex: none; }
.uw-style-cap {
  display: block; padding: 2px 5px 0; font-size: 11px; line-height: 15px; color: var(--u-color-on-surface-variant, #44474f);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
}
.uw-styles { display: flex; flex-direction: column; gap: 6px; }
.uw-styles-opts { display: flex; gap: 6px; }
.uw-styles-opts select, .uw-style-dlg select, .uw-style-dlg input[type="text"], .uw-style-dlg input[type="number"], .uw-style-sub input[type="number"] {
  height: 30px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 6px;
  background: transparent; color: inherit; font: inherit; font-size: 13px; min-width: 0;
}
.uw-styles-opts select { flex: 1 1 0; }
.uw-styles-list { display: flex; flex-direction: column; gap: 1px; }
.uw-style-row {
  display: flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 2px 0 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
}
.uw-style-row:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-style-row.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-style-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uw-style-name canvas { display: block; }
.uw-style-kind { flex: none; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); min-width: 18px; text-align: center; }
.uw-style-more { height: 26px; min-width: 22px; padding: 0; visibility: hidden; }
.uw-style-row:hover .uw-style-more, .uw-style-row.uo-on .uw-style-more { visibility: visible; }
.uw-styles-prev { margin-top: 4px; font-size: 13px; }
.uw-insp { display: flex; flex-direction: column; gap: 4px; }
.uw-insp-h { font-size: 12px; font-weight: 600; color: var(--u-color-on-surface-variant, #44474f); margin-top: 6px; }
.uw-insp-row { display: flex; align-items: center; gap: 4px; }
.uw-insp-val {
  flex: 1 1 auto; min-width: 0; min-height: 30px; padding: 5px 8px; border: 1px solid var(--u-color-outline-variant, #c4c6d0);
  border-radius: 8px; font-size: 12.5px; line-height: 1.35; overflow-wrap: anywhere;
}
.uw-insp-pane { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px; }
.uw-style-dlg { display: flex; flex-direction: column; gap: 10px; }
.uw-style-dlg .uo-dialog-grid select, .uw-style-dlg .uo-dialog-grid input { width: 100%; }
.uw-style-fmt { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; }
.uw-style-fmt select[name="font"] { width: 180px; }
.uw-style-prev { display: block; border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; max-width: 100%; }
.uw-style-desc { font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); line-height: 1.4; }
.uw-style-checks { display: flex; gap: 18px; flex-wrap: wrap; }
.uw-style-msg { color: var(--u-color-error, #ba1a1a); font-size: 12.5px; min-height: 16px; }
.uw-style-quick { display: flex; flex-direction: column; gap: 10px; }
.uw-style-quick canvas { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; }
.uw-style-sub { display: flex; flex-direction: column; gap: 12px; }
.uw-style-fx { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }

/* camada flutuante (menus, popovers, di\xE1logos, localizar, avisos) */
.uw-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* barra de Modo Protegido (Word: faixa amarela sob a faixa de op\xE7\xF5es) */
.uw-protbar {
  display: flex; align-items: center; gap: 12px; padding: 6px 16px; font-size: 13px;
  font-family: var(--uo-font);
  background: var(--u-color-warning-container, #ffdea8); color: var(--u-color-on-warning-container, #271900);
}
.uw-protbar[hidden] { display: none; }
.uw-protbar .uo-ic { width: 20px; height: 20px; flex: none; }
.uw-protbar span { flex: 1 1 auto; min-width: 0; }
.uw-protbar .uo-pill { flex: none; height: 30px; background: var(--u-color-warning, #7c5800); color: var(--u-color-on-warning, #fff); border: 0; }
@keyframes uwPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,181,0,0); } 30% { box-shadow: 0 0 0 5px rgba(232,181,0,.9); } }
.uw-pulse { animation: uwPulse .5s ease-out 2; }

/* barra de status */
.uw-status-bar {
  display: flex; align-items: center; gap: 4px; padding: 2px 12px; min-height: 30px;
  font-family: var(--uo-font); font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f);
}
.uw-status { font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uw-views { display: inline-flex; gap: 1px; margin-right: 6px; }
.uw-status-bar .uo-btn { height: 26px; min-width: 26px; }
.uw-status-bar .uo-ic { width: 18px; height: 18px; }
.uw-zoom-slider { width: 120px; accent-color: var(--u-color-primary, #005bc0); }
.uw-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 560px) { .uw-zoom-slider { display: none; } }

/* localizar e substituir (flutuante, n\xE3o modal) */
.uw-find {
  position: fixed; right: 20px; z-index: 950; width: 340px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 14px;
  background: var(--u-color-surface-container-high, #e9e7ec); color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px;
  box-shadow: 0 12px 32px light-dark(rgba(0,0,0,.16), rgba(0,0,0,.5)); font-family: var(--uo-font); font-size: 14px;
}
.uw-find[hidden] { display: none; }
.uw-find-head { display: flex; align-items: center; justify-content: space-between; }
.uw-find input {
  height: 36px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 10px;
  background: var(--u-color-surface-container-lowest, #fff); color: inherit; font: inherit;
}
.uw-find input:focus { outline: 2px solid var(--u-color-primary, #005bc0); outline-offset: -1px; }
.uw-find input.uw-miss { outline: 2px solid var(--u-color-error, #ba1a1a); outline-offset: -1px; }
.uw-find-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.uw-find-actions .uo-pill { height: 32px; padding: 0 12px; font-size: 13px; }
.uw-find-msg { flex: 1 1 auto; font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f); }

/* coment\xE1rios ao lado da p\xE1gina */
.uw-comments { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 5; }
.uw-card {
  position: absolute; width: 240px; padding: 8px 10px; border-radius: 10px; cursor: pointer;
  /* cart\xE3o sobre o fundo \xFAnico: claro como a p\xE1gina no tema claro, um degrau acima no escuro */
  background: light-dark(var(--u-color-surface-container-lowest, #fff), var(--u-color-surface-container-high, #292a2d));
  color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); box-shadow: 0 1px 3px rgba(0,0,0,.08);
  font-family: var(--uo-font); font-size: 13px; line-height: 1.4; transition: top 120ms ease-out;
}
.uw-card::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: rgba(255,187,0,.6); }
.uw-card.anchored::after {
  content: ""; position: absolute; right: 100%; top: 18px; width: 24px; margin-right: 12px;
  border-top: 1px dotted rgba(255,187,0,.7); pointer-events: none;
}
.uw-card.active { border-color: var(--u-color-primary, #005bc0); box-shadow: 0 0 0 2px var(--u-color-primary, #005bc0); }
.uw-card-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin: -2px -4px 2px 0; }
.uw-card .who { font-weight: 600; font-size: 12px; }
.uw-card .uo-btn { height: 24px; min-width: 24px; }
.uw-card .uo-ic { width: 16px; height: 16px; }
.uw-card .txt { white-space: pre-wrap; word-break: break-word; }

/* bal\xF5es de revis\xE3o: o cart\xE3o dos coment\xE1rios, na cor do autor */
.uw-rev-card::before { background: var(--uw-rev); }
.uw-rev-card.anchored::after { border-top-color: var(--uw-rev); }
.uw-card .when { flex: 1 1 auto; margin-left: 6px; font-size: 11px; opacity: .7; white-space: nowrap; }
.uw-rev-card .txt b { font-weight: 600; }

/* Painel de Revis\xE3o (painel das barras: vertical \xE0 esquerda; horizontal acima da barra de status) */
:host(.uw-review-v) .pages { padding-left: 304px; justify-content: safe center; }
:host(.uw-review-h) .pages { padding-bottom: 224px; }

/* pain\xE9is da esquerda: Navega\xE7\xE3o na borda, Revis\xE3o vertical ao lado, r\xE9gua vertical depois */
:host(.uw-nav-open) .pages { padding-left: 304px; justify-content: safe center; }
:host(.uw-nav-open.uw-review-v) .pages { padding-left: 604px; }
:host(.uw-vruler-on) .pages { padding-left: 48px; justify-content: safe center; }
:host(.uw-vruler-on.uw-nav-open) .pages, :host(.uw-vruler-on.uw-review-v) .pages { padding-left: 326px; }
:host(.uw-vruler-on.uw-nav-open.uw-review-v) .pages { padding-left: 626px; }

/* r\xE9gua (Exibir > R\xE9gua): a horizontal dentro da barra; a vertical na borda do documento */
.uw-hruler { border-top: 1px solid var(--u-color-outline-variant, light-dark(rgba(0,0,0,.12), rgba(255,255,255,.12))); background: var(--uo-bar-bg, var(--uw-bg)); }
:host(.view-read) .uw-hruler, :host(.view-outline) .uw-hruler { display: none !important; }
.uw-vruler { position: fixed; z-index: 35; width: 22px; background: var(--uo-bar-bg, var(--uw-bg)); border-right: 1px solid var(--u-color-outline-variant, light-dark(rgba(0,0,0,.12), rgba(255,255,255,.12))); }
.uw-vruler[hidden] { display: none; }
.uw-ruler-guide { position: fixed; z-index: 36; pointer-events: none; border: 0 dashed var(--u-color-on-surface-variant, #44474f); border-top-width: 1px; }
.uw-ruler-guide.uw-ruler-guide-v { border-top-width: 0; border-left-width: 1px; }
.uw-ruler-guide[hidden] { display: none; }

/* Painel de Navega\xE7\xE3o */
.uw-nav.uo-pane-body { display: flex; flex-direction: column; padding: 0; overflow: hidden; font-size: 13px; }
.uw-nav-search { display: flex; align-items: center; gap: 2px; margin: 2px 12px 6px; height: 34px; padding: 0 2px 0 8px;
  border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; background: var(--u-color-surface-container-lowest, #fff); }
.uw-nav-search:focus-within { outline: 2px solid var(--u-color-primary, #005bc0); outline-offset: -1px; }
.uw-nav-search-ic { display: flex; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-search-ic .uo-ic { width: 18px; height: 18px; }
.uw-nav-input { flex: 1 1 auto; min-width: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 13.5px; height: 30px; }
.uw-nav-input::-webkit-search-cancel-button { cursor: pointer; }
.uw-nav-opt { height: 28px; min-width: 28px; padding: 0; }
.uw-nav-status { display: flex; align-items: center; gap: 2px; padding: 0 8px 4px 14px; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-status[hidden] { display: none; }
.uw-nav-count { flex: 1 1 auto; }
.uw-nav-step { height: 26px; min-width: 26px; padding: 0; }
.uw-nav-tabs { display: flex; gap: 2px; padding: 0 10px; border-bottom: 1px solid var(--u-color-outline-variant, #c4c6d0); flex: none; }
.uw-nav-tab { position: relative; border: 0; background: transparent; color: var(--u-color-on-surface-variant, #44474f); font: inherit; font-size: 13px; padding: 7px 8px 8px; cursor: pointer; border-radius: 6px 6px 0 0; }
.uw-nav-tab:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-tab.uo-on { color: var(--u-color-primary, #005bc0); font-weight: 600; }
.uw-nav-tab.uo-on::after { content: ''; position: absolute; left: 6px; right: 6px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: var(--u-color-primary, #005bc0); }
.uw-nav-body { flex: 1 1 auto; overflow: auto; min-height: 0; padding: 6px 6px 10px; }
.uw-nav-empty { margin: 10px 8px; color: var(--u-color-on-surface-variant, #44474f); line-height: 1.45; }
.uw-nav-tree { display: flex; flex-direction: column; gap: 1px; }
.uw-nav-tree.uw-nav-drop-end { box-shadow: inset 0 -2px 0 var(--u-color-primary, #005bc0); }
.uw-nav-row { display: flex; align-items: center; gap: 2px; min-height: 28px; padding-right: 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.uw-nav-row:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-row.uo-on { background: color-mix(in srgb, var(--u-color-primary, #005bc0) 14%, transparent); }
.uw-nav-row.uw-nav-hit .uw-nav-label { background: color-mix(in srgb, #ffd600 55%, transparent); border-radius: 3px; }
.uw-nav-row.uw-nav-dragging { opacity: .45; }
.uw-nav-row.uw-nav-drop-before { box-shadow: inset 0 2px 0 var(--u-color-primary, #005bc0); }
.uw-nav-twisty { flex: none; width: 22px; height: 22px; padding: 0; border: 0; background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; }
.uw-nav-twisty .uo-ic { width: 18px; height: 18px; }
.uw-nav-twisty.uw-nav-leaf { visibility: hidden; cursor: default; }
.uw-nav-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uw-nav-pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 6px 0; }
.uw-nav-page { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; border: 2px solid transparent; border-radius: 8px; background: transparent; cursor: pointer; color: inherit; font: inherit; }
.uw-nav-page:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-page.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-nav-thumb { display: block; width: 150px; min-height: 60px; background: #fff; outline: 1px solid var(--u-color-outline-variant, #c4c6d0); }
.uw-nav-pnum { font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-results { display: flex; flex-direction: column; gap: 2px; }
.uw-nav-result { text-align: left; border: 1px solid transparent; border-radius: 8px; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.4; padding: 6px 8px; cursor: pointer; }
.uw-nav-result:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-result.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-nav-result strong { font-weight: 700; background: color-mix(in srgb, #ffd600 45%, transparent); border-radius: 2px; }
.uw-review.uo-pane-body { display: flex; flex-direction: column; padding: 0; overflow: hidden; font-size: 13px; }
.uw-review-sum { flex: none; padding: 0 16px 8px; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); border-bottom: 1px solid var(--u-color-outline-variant, #c4c6d0); }
.uw-review-list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; flex: 1 1 auto; min-height: 0; }
.uw-rev { padding: 6px 8px 6px 12px; cursor: pointer; border-left: 3px solid var(--uw-rev, rgba(255,187,0,.6)); margin: 2px 6px; border-radius: 4px; }
.uw-rev:hover { background: var(--u-color-surface-container-high, #e9e7ec); }
.uw-rev-head { display: flex; align-items: center; gap: 6px; }
.uw-rev-head .who { font-weight: 600; font-size: 12px; }
.uw-rev-head .what { font-size: 12px; color: var(--uw-rev, inherit); }
.uw-rev-head .gap { flex: 1 1 auto; }
.uw-rev .when { font-size: 11px; opacity: .7; }
.uw-rev-head .uo-btn { height: 22px; min-width: 22px; visibility: hidden; }
.uw-rev:hover .uo-btn { visibility: visible; }
.uw-rev .uo-ic { width: 16px; height: 16px; }
.uw-rev .txt { white-space: pre-wrap; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.uw-rev-empty { padding: 12px; color: var(--u-color-on-surface-variant, #44474f); }

/* comparar */
.uw-compare { display: none; }
:host(.uw-comparing) .uw-compare { display: flex; flex-direction: column; }

/* arrastar e soltar */
.uw-drop {
  position: fixed; inset: 12px; z-index: 1200; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #005bc0); border-radius: 14px;
  background: color-mix(in srgb, var(--u-color-primary, #005bc0) 12%, transparent);
  color: var(--u-color-primary, #005bc0); font-family: var(--uo-font); font-size: 22px;
}
.uw-drop[hidden] { display: none; }
`
);
var EDITOR_KEYS = /* @__PURE__ */ new Set([
  "Ctrl+C",
  "Ctrl+X",
  "Ctrl+V",
  "Ctrl+Shift+V",
  "Ctrl+Z",
  "Ctrl+Y",
  "Ctrl+A",
  "Ctrl+B",
  "Ctrl+I",
  "Ctrl+U",
  "Ctrl+E",
  "Ctrl+L",
  "Ctrl+R",
  "Ctrl+J",
  "Ctrl+Enter",
  "Ctrl+Alt+F",
  "Ctrl+Alt+D",
  "Ctrl+Shift+D",
  "Ctrl+Shift+W",
  "Ctrl+Shift+H",
  "Ctrl+Shift+K",
  "Ctrl+Shift+A",
  "Shift+F3",
  "Ctrl+Alt+V"
]);
var APP_SHORTCUTS = /* @__PURE__ */ new Set(["open", "save", "saveAs", "print", "find", "replace"]);
var lastFocused = null;
function isField(t2) {
  if (!(t2 instanceof HTMLElement)) return false;
  if (t2.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(t2.tagName) && !t2.classList.contains("proxy");
}
function comboOf(e) {
  const code = e.code;
  let k = code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : { Equal: "=", Minus: "-", BracketLeft: "[", BracketRight: "]", Slash: "/", Space: "Space", Enter: "Enter", IntlRo: "/" }[code] ?? e.key;
  if (/^F\d+$/.test(e.key)) k = e.key;
  return `${e.ctrlKey || e.metaKey ? "Ctrl+" : ""}${e.altKey ? "Alt+" : ""}${e.shiftKey ? "Shift+" : ""}${k}`;
}
var WriteChrome = class {
  constructor(ed, topEl, bottomEl, opts) {
    this.ed = ed;
    this.topEl = topEl;
    this.bottomEl = bottomEl;
    this.root = topEl.getRootNode();
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS2);
    ensureBarStyles(this.root);
    if (!this.root.querySelector("style[data-uw-chrome]")) {
      const s = document.createElement("style");
      s.dataset["uwChrome"] = "";
      s.textContent = CHROME_CSS;
      this.root.appendChild(s);
    }
    this.layer = this.root.querySelector(".uw-layer") ?? this.makeLayer();
    this.layer.replaceChildren();
    const app = this.app = appFor(ed);
    app.ui = {
      L: this.L,
      layer: this.layer,
      flash: (m) => this.flash(m),
      sync: () => this.sync(),
      protectedChanged: () => this.sync(),
      pulseEnable: () => {
        const b = this.protbar?.querySelector(".uo-pill");
        if (!b) return;
        b.classList.remove("uw-pulse");
        void b.offsetWidth;
        b.classList.add("uw-pulse");
      }
    };
    if (!app.title) app.title = this.L.untitled;
    app.attach();
    app.bindHost();
    bindHostFonts(hostOf(ed));
    this.applyTheme();
    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    this.styles = new StylesUI({ ed, app, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
    this.pictures = new PictureUI({ ed, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
    this.clipboardUI = new ClipboardUI({
      ed,
      app,
      lang: opts.lang,
      layer: this.layer,
      frame: () => this.docFrame(),
      after: () => this.after(),
      dialog: () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() }),
      signal: this.ac.signal
    });
    registerWriteCommands(this.reg, ed, app, this.ctl());
    const contributions = opts.contributions ?? [];
    for (const c of contributions) if (c.commands?.length) this.reg.add(...c.commands);
    const policy = ed.resolvedFormattingPolicy();
    const hidden = /* @__PURE__ */ new Set([...ed.hiddenCommands, ...policyHiddenIds(policy)]);
    this.reg.hide(hidden);
    const plain = policySplitsToPlain(policy);
    const env = { ed, app, ctl: this.ctl(), root: this.root, styles: this.styles };
    topEl.replaceChildren();
    bottomEl.replaceChildren();
    if (opts.topbar) {
      this.bar = this.mode() === "ribbon" ? createRibbon(topEl, hideInRibbon(plainSplits(extendRibbon(ribbonLayout(env, this.ctx), contributions), plain), hidden), this.ctx) : createCompactBar(topEl, hideInCompact(plainSplits(extendCompact(compactLayout(env, this.ctx), contributions), plain), hidden), this.ctx);
      this.protbar = this.makeProtectedBar();
      topEl.appendChild(this.protbar);
      this.cards = new CommentCards(ed, app, this.root, () => this.after());
      this.nav = new NavPane({ ed, app, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), replace: () => this.openFind(true), after: () => this.after() });
      this.review = new ReviewPane(ed, app, { layer: this.layer, frame: () => this.leftFrame("review"), lang: opts.lang }, () => this.after());
      const pane = app.prefs.get("reviewPane");
      if (pane === "vertical" || pane === "horizontal") this.review.open(pane);
      if (app.prefs.get("navPane") === "1") this.nav.open();
      const d = () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
      this.ruler = new RulerUI({
        ed,
        lang: opts.lang,
        top: topEl,
        layer: this.layer,
        frame: () => this.leftFrame("ruler"),
        pageDialog: () => {
          void pageDialog(d()).then(() => this.after());
        },
        paragraphDialog: () => {
          void paragraphDialog(d()).then(() => this.after());
        },
        tabsDialog: () => {
          void tabsDialog(d()).then(() => this.after());
        }
      });
      if (app.prefs.get("ruler") === "1" && !hidden.has("view:ruler")) this.ruler.show(true);
      if (app.prefs.get("gridlines") === "1") ed.showGridlines(true);
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) this.status = new StatusBar(ed, app, bottomEl, this.ctx);
    this.bindEvents();
    const mo = new MutationObserver((recs) => {
      if (!ed.hasAttribute("topbar") && !ed.hasAttribute("bottombar")) {
        teardownChrome(ed);
        return;
      }
      if (recs.some((r) => r.attributeName === "theme" || r.attributeName === "accent")) {
        this.applyTheme();
        this.sync();
      }
    });
    mo.observe(ed, { attributes: true, attributeFilter: ["topbar", "bottombar", "theme", "accent"] });
    ed.addEventListener("uw-theme-change", () => {
      hostOf(ed)?.setTitleTheme?.(ed.effectiveTheme === "dark");
      this.sync();
    }, { signal: this.ac.signal });
    this.ac.signal.addEventListener("abort", () => mo.disconnect());
    try {
      const cs = originStore.get("uw-captions");
      if (cs) ed.captionSettings = JSON.parse(cs);
    } catch {
    }
    if (!ed.hasAuthor()) {
      void Promise.resolve(hostOf(ed)?.userName?.()).then((n) => {
        if (ed.hasAuthor()) return;
        const name = n || originStore.get("uw-author");
        if (name) ed.author = name;
      }, () => {
      });
    }
    void ed.listAvailableFonts().then((f) => {
      this.families = f;
    });
    this.sync();
    this.cards?.schedule();
  }
  ed;
  topEl;
  bottomEl;
  ac = new AbortController();
  root;
  app;
  reg;
  ctx;
  layer;
  L;
  lang;
  bar = null;
  status = null;
  cards = null;
  review = null;
  nav = null;
  ruler = null;
  styles = null;
  pictures = null;
  clipboardUI = null;
  /** painel Formatar Efeitos de Texto aberto (recarrega com a seleção) */
  fxPane = null;
  protbar = null;
  stateCache = null;
  families = [];
  fontAsked = false;
  makeLayer() {
    const l = document.createElement("div");
    l.className = "uw-layer";
    for (const t2 of ["mousedown", "mouseup", "click", "dblclick", "contextmenu", "keydown", "keyup", "keypress", "wheel", "input", "paste", "copy", "cut"]) {
      l.addEventListener(t2, (e) => e.stopPropagation(), { passive: t2 === "wheel" });
    }
    this.root.appendChild(l);
    return l;
  }
  mode() {
    const a = this.ed.getAttribute("toolbar");
    if (a === "ribbon" || a === "compact") return a;
    return this.app.prefs.get("toolbar") === "ribbon" ? "ribbon" : "compact";
  }
  /** Ambiente dos diálogos de Links e referências (estilo e legendas pela barra). */
  refsEnv() {
    return {
      ed: this.ed,
      app: this.app,
      layer: this.layer,
      lang: this.lang,
      flash: (m) => this.flash(m),
      modifyStyle: (id) => {
        void this.styles?.styleDialog("modify", id);
      },
      // rótulos/numeração/AutoLegenda: por máquina, como o Word no Normal
      saveCaptionSettings: () => originStore.set("uw-captions", JSON.stringify(this.ed.captionSettings))
    };
  }
  /** Ambiente dos diálogos do Sumário (Modificar estilo pela barra). */
  tocEnv() {
    return { ed: this.ed, layer: this.layer, lang: this.lang, flash: (m) => this.flash(m), modifyStyle: (id) => {
      void this.styles?.styleDialog("modify", id);
    } };
  }
  ctl() {
    const d = () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
    return {
      state: () => this.state(),
      // Localizar abre a busca do Painel de Navegação (Ctrl+F, como no Word); Substituir, a caixa flutuante
      find: (replace) => {
        if (!replace && this.nav) this.nav.open(true);
        else this.openFind(replace);
      },
      navPane: () => {
        this.nav?.toggle();
        this.review?.place();
        this.ruler?.schedule();
      },
      navPaneOpen: () => !!this.nav?.isOpen,
      ruler: () => {
        const r = this.ruler;
        if (!r) return;
        r.show(!r.on);
        this.app.prefs.set("ruler", r.on ? "1" : "");
      },
      rulerOn: () => !!this.ruler?.on,
      gridlines: () => {
        const on = !this.ed.gridlinesShown();
        this.ed.showGridlines(on);
        this.app.prefs.set("gridlines", on ? "1" : "");
      },
      tabsDialog: () => {
        void tabsDialog(d()).then(() => this.after());
      },
      comment: () => {
        void commentDialog(d()).then(() => this.after());
      },
      link: () => {
        void hyperlinkDialog(this.refsEnv()).then(() => this.after());
      },
      refsDialog: (kind) => {
        void refsDialog(this.refsEnv(), kind).then(() => this.after());
      },
      tocDialog: (kind, scope) => {
        void tocDialog(this.tocEnv(), kind, scope).then(() => this.after());
      },
      image: () => this.pickImage(),
      fontDialog: () => {
        void fontDialog(d(), this.families, () => this.ctl().textEffectsPane()).then(() => this.after());
      },
      listDialog: (kind) => {
        void openListDialog(d(), this.families, kind).then(() => this.after());
      },
      clipboard: (kind) => {
        void this.clipboardUI?.run(kind).then(() => this.after());
      },
      findDialog: (tab) => {
        this.findDlg ??= new FindReplaceDialog({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, after: () => this.after() });
        this.findDlg.open(tab);
      },
      textEffectsPane: () => {
        this.fxPane = openTextEffectsPane({ ed: this.ed, lang: this.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
        this.after();
      },
      paragraphDialog: () => {
        void paragraphDialog(d()).then(() => this.after());
      },
      pageDialog: (tab) => {
        void pageDialog(d(), tab).then(() => this.after());
      },
      textLayoutDialog: (kind) => {
        const dlg = kind === "hyphenation" ? hyphenationDialog : manualHyphenationDialog;
        void dlg(d()).then(() => this.after());
      },
      columnsDialog: () => {
        void columnsDialog(d()).then(() => this.after());
      },
      notesDialog: () => {
        void notesDialog(d()).then(() => this.after());
      },
      convertNotesDialog: () => {
        void convertNotesDialog(d()).then(() => this.after());
      },
      showNotes: () => {
        void showNotesDialog(d()).then(() => this.after());
      },
      wordCount: () => wordCountDialog(d()),
      spelling: () => {
        void spellingDialog(d()).then(() => this.after());
      },
      shortcuts: () => shortcutsDialog(d()),
      about: () => aboutDialog(d()),
      compare: () => {
        void this.compare();
      },
      focusMode: () => this.toggleFocus(),
      inFocusMode: () => this.ed.classList.contains("uw-focus"),
      toolbarMode: () => this.mode(),
      setToolbarMode: (m) => {
        this.app.prefs.set("toolbar", m);
        this.ed.setAttribute("toolbar", m);
      },
      trackChanges: () => {
        void (async () => {
          if (!this.ed.isTrackingChanges() && !await authorDialog(d())) return;
          this.ed.toggleTrackChanges();
          this.flash(this.ed.isTrackingChanges() ? this.L.trackOn : this.L.trackOff);
          this.after();
        })();
      },
      reviewPane: (dir) => {
        const r = this.review;
        if (!r) return;
        if (!dir && r.dir) r.close();
        else {
          r.close();
          r.open(dir ?? "vertical");
        }
        this.app.prefs.set("reviewPane", r.dir ?? "");
        this.cards?.schedule();
      },
      reviewPaneOpen: () => this.review?.dir ?? false,
      toggleComments: () => {
        this.app.commentsVisible = !this.app.commentsVisible;
        this.app.prefs.set("comments", this.app.commentsVisible ? "1" : "0");
        this.cards?.render();
        this.review?.schedule();
      },
      requestFonts: () => this.requestFonts(),
      flash: (m) => this.flash(m),
      applyTheme: () => this.applyTheme(),
      stylesPane: () => this.styles?.togglePane(),
      stylesPaneOpen: () => !!this.styles?.paneOpen,
      styleInspector: () => this.styles?.toggleInspector(),
      inspectorOpen: () => !!this.styles?.inspectorOpen,
      newStyle: () => {
        void this.styles?.styleDialog("new");
      },
      modifyStyle: () => {
        const c = this.ed.currentStyles();
        void this.styles?.styleDialog("modify", c.character ?? c.paragraph);
      },
      tableDialog: (kind, arg) => {
        void tableDialog(d(), kind, arg).then(() => this.after());
      },
      hfDialog: (kind) => {
        const dlg = { pageNumbers: pageNumberFormatDialog, dateTime: dateTimeDialog, alignTab: alignTabDialog, options: hfOptionsDialog }[kind];
        void dlg(d()).then(() => this.after());
      },
      pageBgDialog: (kind) => {
        void (kind === "fill" ? pageFillDialog : watermarkDialog)(d()).then(() => this.after());
      },
      pictureDialogOpen: (kind) => kind === "selection" ? !!this.pictures?.selectionOpen : kind === "alt" ? !!this.pictures?.altOpen : kind.startsWith("format:") ? !!this.pictures?.formatOpen : false,
      pictureDialog: (kind) => {
        if (kind === "alt") this.pictures?.toggleAlt();
        else if (kind === "selection") this.pictures?.toggleSelection();
        else if (kind.startsWith("format:")) this.pictures?.toggleFormat(kind.slice(7));
        else if (kind === "compress") void pictureCompressDialog(d()).then(() => this.after());
        else void pictureLayoutDialog(d(), kind.slice(7)).then(() => this.after());
      }
    };
  }
  state() {
    return this.stateCache ??= this.ed.getSelectionState();
  }
  /** Paleta (destaque) e Escuro total; o claro/escuro é do elemento (color-scheme). */
  applyTheme() {
    this.ed.setUiColorMode(this.app.chosenMode);
    applyTheme(this.ed, this.root, this.app.accent, this.app.mode, this.app.explicitAccent);
    hostOf(this.ed)?.setTitleTheme?.(this.ed.effectiveTheme === "dark");
  }
  /** Depois de qualquer ação: foco de volta ao documento (se não abriu painel) e sincroniza. */
  after() {
    if (this.ac.signal.aborted) return;
    const a = this.root.activeElement;
    const inLayer = !!a && this.layer.contains(a);
    const inBar = !!a && this.topEl.contains(a) && a.tagName === "INPUT";
    if (!isMenuOpen()) closePopover();
    if (!inLayer && !inBar && !isMenuOpen()) this.ed.focusEditor();
    this.sync();
  }
  /** Um sync por quadro, venha de onde vier (seleção, eventos, ações). */
  sync() {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.syncNow();
    });
  }
  raf = 0;
  syncNow() {
    this.stateCache = null;
    this.app.bindHost();
    this.topEl.classList.toggle("uo-wco", !!hostOf(this.ed)?.windowControlsOverlay);
    if (this.protbar) this.protbar.hidden = !this.ed.isProtected();
    this.bar?.sync();
    this.status?.sync();
    this.styles?.sync();
    this.pictures?.sync();
    this.clipboardUI?.sync();
    this.fxPane?.sync();
    this.review?.place();
    this.nav?.schedule();
    this.ruler?.schedule();
  }
  /** Área do documento entre as barras (os painéis acoplam nela — Estilos à direita, sem
   *  cobrir a rolagem; Revisão à esquerda ou embaixo). */
  /** Área do documento sem os painéis da esquerda que vêm antes: a Revisão
   *  vertical fica à direita da Navegação; a régua vertical, depois das duas. */
  leftFrame(kind) {
    const r = this.docFrame();
    let x = r.left;
    if (this.nav?.isOpen) x += 300;
    if (kind === "ruler" && this.review?.dir === "vertical") x += 300;
    return new DOMRect(x, r.top, Math.max(0, r.right - x), r.height);
  }
  docFrame() {
    const r = this.ed.getBoundingClientRect();
    const top = this.topEl.getBoundingClientRect(), bot = this.bottomEl.getBoundingClientRect();
    const t2 = top.height ? top.bottom : r.top;
    const b = bot.height ? bot.top : r.bottom;
    const side = typeof this.ed.sidePanelWidths === "function" ? this.ed.sidePanelWidths() : { start: 0, end: 0 };
    const left = r.left + this.ed.clientLeft + side.start;
    const right = r.left + this.ed.clientLeft + this.ed.clientWidth - side.end;
    return new DOMRect(left, t2, Math.max(0, right - left), b - t2);
  }
  flash(msg) {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }
  /** Faixa de aviso na barra atual (sem `topbar` não há onde mostrar). */
  setNotice(notice) {
    this.bar?.setNotice(notice?.el ?? null, notice?.tone);
  }
  destroy() {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    closeDialogs(this.layer);
    this.styles?.close();
    this.bar?.destroy();
    this.cards?.destroy();
    this.review?.destroy();
    this.nav?.destroy();
    this.ruler?.destroy();
    this.layer.replaceChildren();
    this.root.querySelector(".uw-compare")?.remove();
    this.topEl.classList.remove("uo-wco");
    this.topEl.replaceChildren();
    this.bottomEl.replaceChildren();
    this.ed.classList.remove("uw-comparing", "uw-focus");
    if (this.app.ui?.layer === this.layer) this.app.detach();
  }
  // ───── Modo Protegido ─────
  makeProtectedBar() {
    const el19 = document.createElement("div");
    el19.className = "uw-protbar";
    el19.setAttribute("part", "protected-bar");
    el19.setAttribute("role", "alert");
    el19.innerHTML = `<svg class="uo-ic" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-81q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 143-80 264.5T505-85q-6 2-12 3t-13 1Z"/></svg>
`;
    const span = document.createElement("span");
    const title = document.createElement("b");
    title.textContent = this.L.protectedTitle;
    span.append(title, " \u2014 ", this.L.protectedText);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-pill";
    b.dataset["a"] = "enableEditing";
    b.textContent = this.L.enableEditing;
    el19.append(span, b);
    b.addEventListener("click", () => {
      this.app.enableEditing();
      this.after();
    });
    el19.hidden = true;
    return el19;
  }
  // ───── localizar ─────
  openFind(replace) {
    this.ctl().findDialog(replace ? "replace" : "find");
  }
  findDlg = null;
  // ───── imagem ─────
  pickImage() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp,image/bmp" });
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) return;
      const ext = { "image/jpeg": "jpeg", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp" }[f.type] ?? "png";
      await this.ed.insertImage(new Uint8Array(await f.arrayBuffer()), ext);
      this.after();
    });
    input.click();
  }
  // ───── fontes instaladas (Local Font Access, Chromium) ─────
  requestFonts() {
    if (this.fontAsked || this.ed.hasHostSystemFonts()) return;
    this.fontAsked = true;
    void this.ed.requestSystemFonts().then(async (ok) => {
      this.families = await this.ed.listAvailableFonts();
      if (!ok) return;
      this.flash(this.L.fontAccessOk(this.families.length));
    });
  }
  // ───── foco ─────
  toggleFocus() {
    const ed = this.ed;
    if (ed.classList.contains("uw-focus")) {
      ed.classList.remove("uw-focus");
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {
      });
    } else {
      ed.classList.add("uw-focus");
      void ed.requestFullscreen?.().catch(() => {
      });
    }
    this.after();
  }
  // ───── comparar ─────
  closeCompare = null;
  async compare() {
    const other = await this.app.pickForCompare();
    if (!other) return;
    let current;
    try {
      current = this.ed.saveDocx();
    } catch {
      this.flash(`\u26A0 ${this.L.stillLoading}`);
      return;
    }
    await import("./src-NI44CAPH.js");
    let box = this.root.querySelector(".uw-compare");
    if (!box) {
      box = document.createElement("div");
      box.className = "uw-compare";
      box.setAttribute("part", "compare");
      for (const t2 of ["mousedown", "dblclick", "contextmenu", "keydown", "wheel"]) {
        box.addEventListener(t2, (e) => e.stopPropagation(), { passive: t2 === "wheel" });
      }
      box.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !e.defaultPrevented && !isMenuOpen()) {
          e.preventDefault();
          this.closeCompare?.();
        }
      });
      const wd2 = document.createElement("universal-write-diff");
      wd2.setAttribute("lang", this.lang);
      wd2.style.cssText = "flex:1;min-height:0;display:flex";
      box.appendChild(wd2);
      this.root.querySelector(".pages")?.after(box);
    }
    const wd = box.firstElementChild;
    const fit = () => {
      const h = this.ed.clientHeight - this.topEl.offsetHeight - this.bottomEl.offsetHeight;
      box.style.height = `${Math.max(200, h)}px`;
    };
    const close = () => {
      this.closeCompare = null;
      this.app.comparing = false;
      this.ed.classList.remove("uw-comparing");
      ro.disconnect();
      this.after();
    };
    this.closeCompare = close;
    const ro = new ResizeObserver(fit);
    this.ac.signal.addEventListener("abort", () => ro.disconnect());
    try {
      wd.loadPair(current, other.bytes, { leftLabel: this.L.compareCurrent(this.app.docName), rightLabel: other.name });
    } catch {
      this.flash(`\u26A0 ${this.L.notValidDocx(other.name)}`);
      return;
    }
    wd.addEventListener("close-request", close, { once: true, signal: this.ac.signal });
    wd.addEventListener("ready", (e) => {
      this.flash(this.L.compareStats(e.detail.stats));
    }, { once: true, signal: this.ac.signal });
    this.app.comparing = true;
    this.ed.classList.add("uw-comparing");
    this.ed.scrollTop = 0;
    ro.observe(this.ed);
    fit();
    this.sync();
  }
  // ───── eventos ─────
  bindEvents() {
    const { ed } = this;
    const signal = this.ac.signal;
    const resync = () => this.sync();
    for (const t2 of ["uw-hfmode", "uw-cellmode", "uw-tbmode", "uw-protected", "uw-ready", "uw-styles-change"]) {
      ed.addEventListener(t2, resync, { signal });
    }
    let tick = false;
    ed.addEventListener("scroll", () => {
      this.ruler?.schedule();
    }, { signal, passive: true });
    ed.addEventListener("scroll", () => {
      if (tick || !this.status) return;
      tick = true;
      setTimeout(() => {
        tick = false;
        this.status?.sync();
      }, 150);
    }, { signal, passive: true });
    if (this.cards) {
      const cards = this.cards;
      for (const t2 of ["uw-comments-changed", "uw-change", "uw-zoom", "uw-ready", "uw-protected", "uw-markup", "uw-revisions-changed"]) ed.addEventListener(t2, () => cards.schedule(), { signal });
      const review = this.review;
      if (review) for (const t2 of ["uw-comments-changed", "uw-change", "uw-ready", "uw-protected", "uw-markup", "uw-revisions-changed", "uw-track-changes"]) ed.addEventListener(t2, () => review.schedule(), { signal });
      const nav = this.nav;
      if (nav) for (const t2 of ["uw-change", "uw-ready", "uw-protected", "uw-styles-change", "uw-markup"]) ed.addEventListener(t2, () => nav.schedule(true), { signal });
      const cro = new ResizeObserver(() => cards.schedule());
      cro.observe(ed);
      signal.addEventListener("abort", () => cro.disconnect());
      ed.addEventListener("uw-comment-click", ((e) => {
        this.app.activeCommentIds = e.detail.ids;
        cards.render();
        this.sync();
      }), { signal });
    }
    const pro = new ResizeObserver(() => {
      this.review?.place();
      this.styles?.sync();
      this.nav?.place();
      this.ruler?.schedule();
    });
    for (const t2 of [this.topEl, this.bottomEl, ed]) pro.observe(t2);
    const pages = this.root.querySelector(".pages");
    if (pages) pro.observe(pages);
    signal.addEventListener("abort", () => pro.disconnect());
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && ed.classList.contains("uw-focus")) {
        ed.classList.remove("uw-focus");
        this.sync();
      }
    }, { signal });
  }
  /** Recursos de documento só com a barra superior: atalhos, contexto, arrastar e soltar. */
  bindDocumentFeatures() {
    const { ed } = this;
    const signal = this.ac.signal;
    const byShortcut = /* @__PURE__ */ new Map();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id).shortcut;
      if (sc && !EDITOR_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    const run = (e, id) => {
      e.preventDefault();
      e.stopPropagation();
      void this.reg.run(id);
    };
    ed.addEventListener("keydown", (e) => {
      if (e.defaultPrevented) return;
      const inSide = !!ed.isSidePanelEvent?.(e);
      if (e.key === "Escape" && this.app.comparing && !inSide) {
        e.preventDefault();
        this.closeCompare?.();
        return;
      }
      const id = byShortcut.get(comboOf(e));
      if (!id || !this.reg.supported(id)) return;
      if (inSide && !APP_SHORTCUTS.has(id)) return;
      if (isField(e.composedPath()[0]) && !APP_SHORTCUTS.has(id)) return;
      run(e, id);
    }, { signal });
    ed.addEventListener("focusin", () => {
      lastFocused = new WeakRef(ed);
    }, { signal });
    document.addEventListener("keydown", (e) => {
      if (e.defaultPrevented) return;
      const path = e.composedPath();
      if (path.some((n) => n instanceof HTMLElement && n.localName === "universal-write")) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === ed : document.querySelectorAll("universal-write[topbar]").length === 1;
      if (mine) run(e, id);
    }, { signal });
    ed.addEventListener("uw-toc-update", ((e) => {
      e.preventDefault();
      void tocDialog(this.tocEnv(), "update", e.detail.scope).then(() => this.after());
    }), { signal });
    ed.addEventListener("uw-toc-menu", ((e) => {
      const env = { ed, app: this.app, ctl: this.ctl(), root: this.root, ...this.styles ? { styles: this.styles } : {} };
      openMenu(tocGalleryMenu(env, this.ctx), { x: e.detail.x, y: e.detail.y }, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
    }), { signal });
    ed.addEventListener("contextmenu", (e) => {
      if (e.composedPath().some((n) => n === this.topEl || n === this.bottomEl || n === this.layer)) return;
      if (ed.isSidePanelEvent?.(e)) return;
      if (this.app.comparing) return;
      e.preventDefault();
      const at = { x: e.clientX, y: e.clientY };
      if (typeof ed.selectedImage === "function" && ed.selectedImage()) {
        openMenu(pictureContextItems(), at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
        return;
      }
      const shp = typeof ed.selectedShape === "function" ? ed.selectedShape() : null;
      if (shp && !shp.editingText) {
        openMenu(shapeContextItems(), at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
        return;
      }
      const items = [
        "cut",
        "copy",
        "paste",
        "pastePlain",
        "-",
        ...ed.getTableState() ? tableContextItems() : [],
        "bold",
        "italic",
        "underline",
        "-",
        "link",
        "comment",
        "-",
        "list:bullet",
        "list:decimal",
        ...listContextItems(ed),
        "-",
        "find",
        "selectAll"
      ];
      const noteItems = ed.editingNote() ? ["note:goRef", "note:toEndnote", "note:toFootnote", "dlg:notes", "-"] : [];
      const open = (pre) => {
        openMenu([...pre, ...noteItems, ...items], at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
      };
      const rv = typeof ed.revisionAtCaret === "function" ? ed.revisionAtCaret() : null;
      const revItems = rv ? (() => {
        const k = rv.move ? this.L.kMove : rv.kind === "insert" ? this.L.kInsertion : rv.kind === "delete" ? this.L.kDeletion : this.L.kFormat;
        return [
          { icon: "check_circle", label: this.L.acceptAt(k), onClick: () => {
            ed.acceptRevisionAt(rv.index);
            this.after();
          } },
          { icon: "cancel", label: this.L.rejectAt(k), onClick: () => {
            ed.rejectRevisionAt(rv.index);
            this.after();
          } },
          "-"
        ];
      })() : [];
      const m = ed.spellingAtCaret();
      if (!m) {
        open(revItems);
        return;
      }
      void ed.spellingSuggestions(m).then((sug) => {
        const pre = sug.length ? sug.map((s) => ({ label: s, onClick: () => {
          ed.replaceSpelling(m, s);
          this.after();
        } })) : [{ label: { en: "(no suggestions)", pt: "(sem sugest\xF5es)" }, disabled: true }];
        open([
          ...pre,
          "-",
          { icon: "visibility_off", label: { en: "Ignore All", pt: "Ignorar tudo" }, onClick: () => ed.ignoreSpelling(m.word) },
          { icon: "library_add", label: { en: "Add to Dictionary", pt: "Adicionar ao dicion\xE1rio" }, onClick: () => {
            void ed.addToDictionary(m.word);
          } },
          "-",
          ...revItems
        ]);
      }, () => open(revItems));
    }, { signal });
    const overlay = document.createElement("div");
    overlay.className = "uw-drop";
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e) => !!e.dataTransfer?.types?.includes("Files");
    const opensDoc = (e) => {
      if (ed.fileDropDisabled) return false;
      const items = Array.from(e.dataTransfer?.items ?? []);
      return !items.length || !items.every((it) => it.kind === "file" && it.type.startsWith("image/"));
    };
    ed.addEventListener("dragenter", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      overlay.hidden = !opensDoc(e);
    }, { signal });
    ed.addEventListener("dragleave", (e) => {
      if (!hasFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        overlay.hidden = true;
      }
    }, { signal });
    ed.addEventListener("dragover", (e) => {
      if (hasFiles(e)) e.preventDefault();
    }, { signal });
    ed.addEventListener("drop", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      void (async () => {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const ok = /\.(docx|odt|doc)$/i.test(f.name) || bytes[0] === 80 && bytes[1] === 75 || bytes[0] === 208 && bytes[1] === 207;
        if (!ok) {
          this.flash(`\u26A0 ${this.L.notDoc(f.name)}`);
          return;
        }
        await this.app.openFile(f);
        this.sync();
      })();
    }, { signal });
  }
};
var chromes = /* @__PURE__ */ new WeakMap();
function setupChrome(editor, topbarEl, bottombarEl, opts) {
  chromes.get(editor)?.destroy();
  const c = new WriteChrome(editor, topbarEl, bottombarEl, opts);
  chromes.set(editor, c);
  return { sync: () => c.sync(), setNotice: (n) => c.setNotice(n) };
}
function teardownChrome(editor) {
  chromes.get(editor)?.destroy();
  chromes.delete(editor);
}
export {
  CHROME_CSS,
  barKit,
  setupChrome,
  teardownChrome
};
