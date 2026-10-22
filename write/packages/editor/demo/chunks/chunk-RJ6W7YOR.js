import {
  DEFAULT_RUN_PROPS,
  DEFAULT_UI_LANG,
  childElements,
  finalBlocks,
  firstChild,
  parseXml,
  pickLabels,
  unzipSync,
  zipSync
} from "./chunk-IP6LSAL6.js";

// ../docx-core/src/odf/zip.ts
var OdfPackage = class _OdfPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote ODF v\xE1lido (ZIP corrompido)");
    }
    return new _OdfPackage(new Map(Object.entries(unzipped)));
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  partNames() {
    return [...this.parts.keys()];
  }
};
function writeZip(files) {
  const zippable = {};
  for (const [path, data] of Object.entries(files)) {
    zippable[path] = path === "mimetype" ? [data, { level: 0 }] : data;
  }
  return zipSync(zippable, { level: 6 });
}

// ../docx-core/src/odf/units.ts
var TWIPS_PER_UNIT = {
  in: 1440,
  cm: 567,
  mm: 56.7,
  pt: 20,
  pc: 240,
  px: 15
};
function lengthToTwips(value) {
  if (value === void 0) return void 0;
  const m = /^\s*(-?[0-9]*\.?[0-9]+)\s*(in|cm|mm|pt|pc|px)\s*$/.exec(value);
  if (!m) return void 0;
  const num = parseFloat(m[1]);
  const unit = m[2];
  const factor = TWIPS_PER_UNIT[unit];
  if (factor === void 0 || Number.isNaN(num)) return void 0;
  return Math.round(num * factor);
}
function lengthToHalfPt(value) {
  const twips = lengthToTwips(value);
  if (twips === void 0) return void 0;
  return Math.round(twips / 10);
}

// ../docx-core/src/odf/styles.ts
function readRawStyle(st) {
  return {
    family: st.attrs["style:family"],
    parent: st.attrs["style:parent-style-name"],
    listStyleName: st.attrs["style:list-style-name"],
    text: firstChild(st, "style:text-properties"),
    para: firstChild(st, "style:paragraph-properties"),
    column: firstChild(st, "style:table-column-properties"),
    cell: firstChild(st, "style:table-cell-properties"),
    graphic: firstChild(st, "style:graphic-properties")
  };
}
function readListStyle(ls) {
  const levels = /* @__PURE__ */ new Map();
  for (const lvl of childElements(ls)) {
    const level = parseInt(lvl.attrs["text:level"] ?? "1", 10);
    if (lvl.name === "text:list-level-style-bullet") {
      levels.set(level, "bullet");
    } else if (lvl.name === "text:list-level-style-number") {
      levels.set(level, "decimal");
    } else if (lvl.name === "text:list-level-style-image") {
      levels.set(level, "bullet");
    }
  }
  return levels;
}
function collectStyles(container, index) {
  if (!container) return;
  for (const el of childElements(container)) {
    if (el.name === "style:style") {
      const name = el.attrs["style:name"];
      if (name) index.styles.set(name, readRawStyle(el));
    } else if (el.name === "style:default-style") {
      const family = el.attrs["style:family"];
      if (family) index.defaults.set(family, readRawStyle(el));
    } else if (el.name === "text:list-style") {
      const name = el.attrs["style:name"];
      if (name) index.listStyles.set(name, readListStyle(el));
    }
  }
}
function buildStyleIndex(contentRoot, stylesRoot) {
  const index = {
    styles: /* @__PURE__ */ new Map(),
    listStyles: /* @__PURE__ */ new Map(),
    defaults: /* @__PURE__ */ new Map()
  };
  if (stylesRoot) {
    collectStyles(firstChild(stylesRoot, "office:styles"), index);
    collectStyles(firstChild(stylesRoot, "office:automatic-styles"), index);
  }
  collectStyles(firstChild(contentRoot, "office:automatic-styles"), index);
  return index;
}
var isTrue = (v) => v === "bold" || v === "italic" || v === "true" || v === "700";
function readTextProps(el) {
  const p = {};
  if (!el) return p;
  const a = el.attrs;
  if (a["fo:font-weight"] !== void 0) p.bold = isTrue(a["fo:font-weight"]);
  if (a["fo:font-style"] !== void 0) p.italic = a["fo:font-style"] === "italic" || a["fo:font-style"] === "oblique";
  const uStyle = a["style:text-underline-style"];
  if (uStyle !== void 0) p.underline = uStyle !== "none";
  const lineThrough = a["style:text-line-through-style"];
  if (lineThrough !== void 0) p.strike = lineThrough !== "none";
  if (a["fo:color"] !== void 0) p.color = normHex(a["fo:color"]);
  if (a["fo:background-color"] !== void 0 && a["fo:background-color"] !== "transparent") {
    p.highlight = normHex(a["fo:background-color"]);
  }
  const size = lengthToHalfPt(a["fo:font-size"]);
  if (size !== void 0) p.szHalfPt = size;
  const font = a["style:font-name"] ?? a["fo:font-family"];
  if (font) p.fontAscii = stripQuotes(font);
  if (a["fo:font-variant"] === "small-caps" || a["style:font-variant"] === "small-caps") p.smallCaps = true;
  if (a["fo:text-transform"] === "uppercase") p.allCaps = true;
  const pos = a["style:text-position"];
  if (pos) {
    if (/^super\b/.test(pos) || /^[1-9]/.test(pos)) p.vertAlign = "superscript";
    else if (/^sub\b/.test(pos) || /^-/.test(pos)) p.vertAlign = "subscript";
  }
  return p;
}
function readParaPropsStyle(el) {
  const p = {};
  if (!el) return p;
  const a = el.attrs;
  switch (a["fo:text-align"]) {
    case "start":
    case "left":
      p.alignment = "left";
      break;
    case "end":
    case "right":
      p.alignment = "right";
      break;
    case "center":
      p.alignment = "center";
      break;
    case "justify":
      p.alignment = "both";
      break;
    default:
      break;
  }
  const ml = lengthToTwips(a["fo:margin-left"]);
  if (ml !== void 0) p.indentLeftTwips = ml;
  const mr = lengthToTwips(a["fo:margin-right"]);
  if (mr !== void 0) p.indentRightTwips = mr;
  const ti = lengthToTwips(a["fo:text-indent"]);
  if (ti !== void 0) p.indentFirstLineTwips = ti;
  const mt = lengthToTwips(a["fo:margin-top"]);
  if (mt !== void 0) p.spaceBeforeTwips = mt;
  const mb = lengthToTwips(a["fo:margin-bottom"]);
  if (mb !== void 0) p.spaceAfterTwips = mb;
  if (a["fo:background-color"] !== void 0 && a["fo:background-color"] !== "transparent") {
    p.shadingHex = normHex(a["fo:background-color"]);
  }
  if (a["fo:break-before"] === "page") p.pageBreakBefore = true;
  return p;
}
function normHex(v) {
  return v.replace(/^#/, "").toUpperCase();
}
function stripQuotes(v) {
  return v.replace(/^['"]|['"]$/g, "").split(",")[0].trim();
}
function resolveStyle(index, name, seen = /* @__PURE__ */ new Set()) {
  const empty = { run: {}, para: {} };
  if (!name || seen.has(name)) return empty;
  seen.add(name);
  const raw = index.styles.get(name);
  if (!raw) return empty;
  const familyDefault = raw.family ? index.defaults.get(raw.family) : void 0;
  const baseFromDefault = familyDefault ? { run: readTextProps(familyDefault.text), para: readParaPropsStyle(familyDefault.para) } : empty;
  const baseFromParent = raw.parent ? resolveStyle(index, raw.parent, seen) : empty;
  return {
    run: { ...baseFromDefault.run, ...baseFromParent.run, ...readTextProps(raw.text) },
    para: { ...baseFromDefault.para, ...baseFromParent.para, ...readParaPropsStyle(raw.para) },
    listStyleName: raw.listStyleName ?? baseFromParent.listStyleName
  };
}

// ../docx-core/src/odf/write-odt.ts
var ENC = new TextEncoder();
var MIMETYPE = "application/vnd.oasis.opendocument.text";
function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function twipsToPt(t) {
  return `${(t / 20).toFixed(2)}pt`;
}
function twipsToCm(t) {
  return `${(t / 1440 * 2.54).toFixed(4)}cm`;
}
function halfPtToPt(hp) {
  return `${(hp / 2).toFixed(2)}pt`;
}
function eighthPtToPt(ep) {
  return ep / 8;
}
function runStyleKey(p) {
  return [
    p.bold ? "B" : "",
    p.italic ? "I" : "",
    p.underline ? "U" : "",
    p.underlineStyle ?? "",
    p.underlineColor ?? "",
    p.strike ? "S" : "",
    p.doubleStrike ? "DS" : "",
    p.vertAlign ?? "",
    p.szHalfPt ?? "",
    p.color ?? "",
    p.highlight ?? "",
    p.fontAscii ?? "",
    p.allCaps ? "C" : "",
    p.smallCaps ? "SC" : "",
    p.charSpacingTwips ?? ""
  ].join("|");
}
function getRunStyle(ctx, p) {
  const key = runStyleKey(p);
  const cached = ctx.runStyles.get(key);
  if (cached) return cached;
  const name = `R${ctx.runStyleDefs.length + 1}`;
  ctx.runStyles.set(key, name);
  ctx.runStyleDefs.push({ name, xml: runStyleXml(name, p) });
  return name;
}
function runStyleXml(name, p) {
  const text = [];
  if (p.bold) text.push(`fo:font-weight="bold"`);
  if (p.italic) text.push(`fo:font-style="italic"`);
  if (p.underline) {
    const u = p.underlineStyle === "double" ? "double" : p.underlineStyle === "dotted" ? "dotted" : p.underlineStyle === "dash" ? "dash" : p.underlineStyle === "wave" ? "wave" : "solid";
    text.push(`style:text-underline-style="${u}"`, `style:text-underline-width="auto"`);
    if (p.underlineColor) text.push(`style:text-underline-color="#${p.underlineColor}"`);
    else text.push(`style:text-underline-color="font-color"`);
  }
  if (p.strike || p.doubleStrike) {
    text.push(`style:text-line-through-style="solid"`);
    if (p.doubleStrike) text.push(`style:text-line-through-type="double"`);
  }
  if (p.vertAlign === "superscript") text.push(`style:text-position="super 58%"`);
  else if (p.vertAlign === "subscript") text.push(`style:text-position="sub 58%"`);
  if (p.szHalfPt) text.push(`fo:font-size="${halfPtToPt(p.szHalfPt)}"`);
  if (p.color) text.push(`fo:color="#${p.color}"`);
  if (p.highlight) text.push(`fo:background-color="${highlightToHex(p.highlight)}"`);
  if (p.fontAscii) text.push(`style:font-name="${xmlEscape(p.fontAscii)}"`);
  if (p.allCaps) text.push(`fo:text-transform="uppercase"`);
  if (p.smallCaps) text.push(`fo:font-variant="small-caps"`);
  if (p.charSpacingTwips) text.push(`fo:letter-spacing="${twipsToPt(p.charSpacingTwips)}"`);
  const attrs = text.length ? ` ${text.join(" ")}` : "";
  return `<style:style style:name="${name}" style:family="text"><style:text-properties${attrs}/></style:style>`;
}
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
function highlightToHex(name) {
  return HIGHLIGHTS[name] ?? (name.startsWith("#") ? name : `#${name}`);
}
function paraStyleKey(p) {
  return [
    p.alignment ?? "",
    p.indentLeftTwips ?? "",
    p.indentRightTwips ?? "",
    p.indentFirstLineTwips ?? "",
    p.spaceBeforeTwips ?? "",
    p.spaceAfterTwips ?? "",
    p.lineTwentieths ?? "",
    p.shadingHex ?? "",
    p.pageBreakBefore ? "PBB" : "",
    borderKey(p.borders)
  ].join("|");
}
function borderKey(b) {
  if (!b) return "";
  const e = (x) => x ? `${x.style}-${x.sizeEighthPt}-${x.color ?? ""}` : "";
  return `${e(b.top)}/${e(b.right)}/${e(b.bottom)}/${e(b.left)}`;
}
function getParaStyle(ctx, p, parentStyleName) {
  const key = (parentStyleName ?? "") + "||" + paraStyleKey(p);
  const cached = ctx.paraStyles.get(key);
  if (cached) return cached;
  const name = `P${ctx.paraStyleDefs.length + 1}`;
  ctx.paraStyles.set(key, name);
  ctx.paraStyleDefs.push({ name, xml: paraStyleXml(name, p, parentStyleName) });
  return name;
}
function paraStyleXml(name, p, parentStyleName) {
  const para = [];
  if (p.alignment === "center") para.push(`fo:text-align="center"`);
  else if (p.alignment === "right") para.push(`fo:text-align="end"`);
  else if (p.alignment === "both") para.push(`fo:text-align="justify"`);
  else if (p.alignment === "left") para.push(`fo:text-align="start"`);
  if (p.indentLeftTwips) para.push(`fo:margin-left="${twipsToPt(p.indentLeftTwips)}"`);
  if (p.indentRightTwips) para.push(`fo:margin-right="${twipsToPt(p.indentRightTwips)}"`);
  if (p.indentFirstLineTwips) para.push(`fo:text-indent="${twipsToPt(p.indentFirstLineTwips)}"`);
  if (p.spaceBeforeTwips) para.push(`fo:margin-top="${twipsToPt(p.spaceBeforeTwips)}"`);
  if (p.spaceAfterTwips) para.push(`fo:margin-bottom="${twipsToPt(p.spaceAfterTwips)}"`);
  if (p.shadingHex) para.push(`fo:background-color="#${p.shadingHex}"`);
  if (p.pageBreakBefore) para.push(`fo:break-before="page"`);
  if (p.borders) {
    const b = p.borders;
    const edge = (e) => `${eighthPtToPt(e.sizeEighthPt).toFixed(2)}pt ${cssStyle(e.style)} #${e.color ?? "000000"}`;
    if (b.top) para.push(`fo:border-top="${edge(b.top)}"`);
    if (b.bottom) para.push(`fo:border-bottom="${edge(b.bottom)}"`);
    if (b.left) para.push(`fo:border-left="${edge(b.left)}"`);
    if (b.right) para.push(`fo:border-right="${edge(b.right)}"`);
  }
  const attrs = para.length ? ` ${para.join(" ")}` : "";
  const parent = parentStyleName ? ` style:parent-style-name="${xmlEscape(parentStyleName)}"` : "";
  return `<style:style style:name="${name}" style:family="paragraph"${parent}><style:paragraph-properties${attrs}/></style:style>`;
}
function cssStyle(s) {
  if (s === "dashed" || s === "dotted" || s === "double") return s;
  if (s === "none" || s === "nil") return "none";
  return "solid";
}
function annotationsForRun(run, ctx) {
  const ids = run.props.commentIds;
  if (!ids?.length) return "";
  let out = "";
  for (const id of ids) {
    if (ctx.emittedComments.has(id)) continue;
    const c2 = ctx.comments.get(id);
    if (!c2) continue;
    ctx.emittedComments.add(id);
    const author = c2.author ? `<dc:creator>${xmlEscape(c2.author)}</dc:creator>` : "";
    out += `<office:annotation>${author}<text:p>${escapeText(c2.text)}</text:p></office:annotation>`;
  }
  return out;
}
function runXml(run, ctx) {
  if (run.image) {
    if (ctx.options.images === "omit") return "";
    return annotationsForRun(run, ctx) + imageXml(run.image, ctx);
  }
  if (run.textbox) return annotationsForRun(run, ctx) + textFrameXml(run.textbox, ctx);
  const styleName = isAllDefault(run.props) ? null : getRunStyle(ctx, run.props);
  const text = escapeText(run.text);
  if (!text) return annotationsForRun(run, ctx);
  const ann = annotationsForRun(run, ctx);
  if (run.props.link) {
    const styleAttr = styleName ? ` text:style-name="${styleName}"` : "";
    return `${ann}<text:a xlink:type="simple" xlink:href="${xmlEscape(run.props.link)}"><text:span${styleAttr}>${text}</text:span></text:a>`;
  }
  if (!styleName) return ann + text;
  return `${ann}<text:span text:style-name="${styleName}">${text}</text:span>`;
}
function isAllDefault(p) {
  return !p.bold && !p.italic && !p.underline && !p.strike && !p.doubleStrike && !p.vertAlign && p.szHalfPt === void 0 && !p.color && !p.highlight && !p.fontAscii && !p.allCaps && !p.smallCaps && !p.charSpacingTwips;
}
function escapeText(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "	") {
      out += "<text:tab/>";
      continue;
    }
    if (ch === "\n") {
      out += "<text:line-break/>";
      continue;
    }
    if (ch === " ") {
      let n = 1;
      while (i + n < s.length && s[i + n] === " ") n++;
      if (n === 1) {
        out += " ";
      } else {
        out += ` <text:s text:c="${n - 1}"/>`;
        i += n - 1;
      }
      continue;
    }
    if (ch === "&") {
      out += "&amp;";
      continue;
    }
    if (ch === "<") {
      out += "&lt;";
      continue;
    }
    if (ch === ">") {
      out += "&gt;";
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code === 12) {
      out += "<text:soft-page-break/>";
      continue;
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += ch;
  }
  return out;
}
function imageXml(img, ctx) {
  const idx = ctx.pictures.length + 1;
  const ext = img.ext.toLowerCase() === "jpg" ? "jpeg" : img.ext.toLowerCase();
  const path = `Pictures/img${idx}.${ext}`;
  ctx.pictures.push({ path, data: img.data, ext });
  return `<draw:frame draw:name="Image${idx}" text:anchor-type="as-char" svg:width="${twipsToCm(img.widthTwips)}" svg:height="${twipsToCm(img.heightTwips)}"><draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
}
function textFrameXml(tb, ctx) {
  const out = [];
  emitBlocks(tb.blocks ?? tb.paras.map((paragraph) => ({ type: "paragraph", paragraph })), out, ctx);
  const a = tb.floating ? tb.anchor : void 0;
  const at = !a ? "as-char" : a.posV.relativeFrom === "page" ? "page" : "paragraph";
  const pos = a ? ` svg:x="${twipsToCm(a.posH.offset ?? 0)}" svg:y="${twipsToCm(a.posV.offset ?? 0)}"` : "";
  ctx.frames = (ctx.frames ?? 0) + 1;
  return `<draw:frame draw:name="Moldura${ctx.frames}" text:anchor-type="${at}"${pos} svg:width="${twipsToCm(tb.widthTwips)}" svg:height="${twipsToCm(tb.heightTwips)}"><draw:text-box>${out.join("")}</draw:text-box></draw:frame>`;
}
function paragraphXml(para, ctx, opts) {
  const styleName = getParaStyle(ctx, para.props, opts.parentStyleName);
  const inner = para.runs.map((r) => runXml(r, ctx)).join("");
  if (opts.asHeading) {
    return `<text:h text:style-name="${styleName}" text:outline-level="${opts.asHeading}">${inner}</text:h>`;
  }
  return `<text:p text:style-name="${styleName}">${inner}</text:p>`;
}
function headingLevelOf(p) {
  const id = p.props.styleId ?? "";
  if (/^title$/i.test(id) || /^t[íi]tulo$/i.test(id)) return 1;
  if (/^subtitle$/i.test(id) || /^subt[íi]tulo$/i.test(id)) return 2;
  const m = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i) ?? id.match(/^h([1-6])$/i);
  if (m) return Math.min(6, parseInt(m[1], 10));
  return 0;
}
function emitParagraph(para, out, ctx) {
  const lvl = headingLevelOf(para);
  if (lvl) {
    out.push(paragraphXml(para, ctx, { parentStyleName: `Heading_20_${lvl}`, asHeading: lvl }));
  } else {
    out.push(paragraphXml(para, ctx, { parentStyleName: "Standard" }));
  }
}
function emitList(items, out, ctx) {
  if (!items.length) return;
  const root = [];
  const stack2 = [];
  for (const p of items) {
    const num = p.props.numbering;
    const node = { paras: [p], children: [], ilvl: num.ilvl, kind: num.kind };
    while (stack2.length && stack2[stack2.length - 1].ilvl >= num.ilvl) stack2.pop();
    if (stack2.length === 0) root.push(node);
    else stack2[stack2.length - 1].children.push(node);
    stack2.push(node);
  }
  const styleNameFor = (kind) => kind === "bullet" ? "WNListBullet" : "WNListNumber";
  const render = (nodes) => {
    if (!nodes.length) return "";
    const kind = nodes[0].kind;
    let xml = `<text:list text:style-name="${styleNameFor(kind)}">`;
    for (const n of nodes) {
      xml += `<text:list-item>`;
      xml += paragraphXml(n.paras[0], ctx, { parentStyleName: "Standard" });
      if (n.children.length) xml += render(n.children);
      xml += `</text:list-item>`;
    }
    return xml + `</text:list>`;
  };
  out.push(render(root));
}
function tableXml(t, ctx) {
  const tableName = `T${ctx.paraStyleDefs.length + ctx.runStyleDefs.length + 1}`;
  ctx.paraStyleDefs.push({
    name: tableName,
    xml: `<style:style style:name="${tableName}" style:family="table"><style:table-properties style:width="${twipsToPt(t.gridColsTwips.reduce((a, b) => a + b, 0))}" table:align="left"/></style:style>`
  });
  let xml = `<table:table table:name="${tableName}" table:style-name="${tableName}">`;
  t.gridColsTwips.forEach((w, i) => {
    const colName = `${tableName}.C${i + 1}`;
    ctx.paraStyleDefs.push({
      name: colName,
      xml: `<style:style style:name="${colName}" style:family="table-column"><style:table-column-properties style:column-width="${twipsToPt(w)}"/></style:style>`
    });
    xml += `<table:table-column table:style-name="${colName}"/>`;
  });
  t.rows.forEach((row) => {
    xml += `<table:table-row>`;
    row.cells.forEach((cell) => {
      xml += tableCellXml(cell, ctx, tableName);
      for (let i = 1; i < cell.gridSpan; i++) xml += `<table:covered-table-cell/>`;
    });
    xml += `</table:table-row>`;
  });
  return xml + `</table:table>`;
}
function tableCellXml(cell, ctx, tableName) {
  const cellName = `${tableName}.A${ctx.paraStyleDefs.length}`;
  const cellAttrs = [];
  if (cell.shadingHex) cellAttrs.push(`fo:background-color="#${cell.shadingHex}"`);
  if (cell.borders) {
    const b = cell.borders;
    const edge = (e) => `${eighthPtToPt(e.sizeEighthPt).toFixed(2)}pt ${cssStyle(e.style)} #${e.color ?? "000000"}`;
    if (b.top) cellAttrs.push(`fo:border-top="${edge(b.top)}"`);
    if (b.bottom) cellAttrs.push(`fo:border-bottom="${edge(b.bottom)}"`);
    if (b.left) cellAttrs.push(`fo:border-left="${edge(b.left)}"`);
    if (b.right) cellAttrs.push(`fo:border-right="${edge(b.right)}"`);
  }
  cellAttrs.push(`fo:padding="0.05cm"`);
  ctx.paraStyleDefs.push({
    name: cellName,
    xml: `<style:style style:name="${cellName}" style:family="table-cell"><style:table-cell-properties ${cellAttrs.join(" ")}/></style:style>`
  });
  let xml = `<table:table-cell table:style-name="${cellName}"` + (cell.gridSpan > 1 ? ` table:number-columns-spanned="${cell.gridSpan}"` : "") + `>`;
  const body = [];
  emitBlocks([
    ...cell.paragraphs.map((p) => ({ type: "paragraph", paragraph: p })),
    ...cell.tables.map((t) => t)
  ], body, ctx);
  xml += body.join("");
  return xml + `</table:table-cell>`;
}
function emitBlocks(blocks, out, ctx) {
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      emitList(listBuf, out, ctx);
      listBuf = [];
    }
  };
  for (const b of blocks) {
    if (b.type === "paragraph" && b.paragraph.props.numbering) {
      listBuf.push(b.paragraph);
      continue;
    }
    flushList();
    if (b.type === "paragraph") emitParagraph(b.paragraph, out, ctx);
    else out.push(tableXml(b, ctx));
  }
  flushList();
}
function styleStandardXml() {
  return `<style:style style:name="Standard" style:family="paragraph"><style:paragraph-properties/></style:style><style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="16pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="14pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_4" style:display-name="Heading 4" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="13pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_5" style:display-name="Heading 5" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="12pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_6" style:display-name="Heading 6" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><text:list-style style:name="WNListBullet">` + [0, 1, 2, 3, 4].map(
    (lvl) => `<text:list-level-style-bullet text:level="${lvl + 1}" text:bullet-char="\u2022"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/></style:list-level-properties></text:list-level-style-bullet>`
  ).join("") + `</text:list-style><text:list-style style:name="WNListNumber">` + [0, 1, 2, 3, 4].map(
    (lvl) => `<text:list-level-style-number text:level="${lvl + 1}" style:num-format="1" style:num-suffix="."><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/></style:list-level-properties></text:list-level-style-number>`
  ).join("") + `</text:list-style>`;
}
function pageLayoutXml(doc) {
  const sp = doc.sections[0]?.sectPr ?? {
    pageWidthTwips: 11906,
    pageHeightTwips: 16838,
    marginLeftTwips: 1417,
    marginRightTwips: 1417,
    marginTopTwips: 1417,
    marginBottomTwips: 1417
  };
  return `<style:page-layout style:name="WNPage"><style:page-layout-properties fo:page-width="${twipsToCm(sp.pageWidthTwips)}" fo:page-height="${twipsToCm(sp.pageHeightTwips)}" fo:margin-left="${twipsToCm(sp.marginLeftTwips)}" fo:margin-right="${twipsToCm(sp.marginRightTwips)}" fo:margin-top="${twipsToCm(sp.marginTopTwips)}" fo:margin-bottom="${twipsToCm(sp.marginBottomTwips)}"/></style:page-layout>`;
}
function masterStyleXml() {
  return `<style:master-page style:name="Standard" style:page-layout-name="WNPage"/>`;
}
var NS = [
  `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"`,
  `xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"`,
  `xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"`,
  `xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"`,
  `xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"`,
  `xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`,
  `xmlns:xlink="http://www.w3.org/1999/xlink"`,
  `xmlns:dc="http://purl.org/dc/elements/1.1/"`,
  `xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"`,
  `xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`
].join(" ");
function contentXml(doc, ctx) {
  const body = [];
  emitBlocks(doc.blocks, body, ctx);
  const autoStyles = [
    ...ctx.paraStyleDefs.map((s) => s.xml),
    ...ctx.runStyleDefs.map((s) => s.xml)
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3"><office:automatic-styles>${autoStyles}</office:automatic-styles><office:body><office:text>${body.join("")}</office:text></office:body></office:document-content>`;
}
function stylesXml(doc) {
  return `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS} office:version="1.3"><office:styles>${styleStandardXml()}</office:styles><office:automatic-styles>${pageLayoutXml(doc)}</office:automatic-styles><office:master-styles>${masterStyleXml()}</office:master-styles></office:document-styles>`;
}
function manifestXml(pictures) {
  const picEntries = pictures.map((p) => {
    const mime = p.ext === "jpeg" || p.ext === "jpg" ? "image/jpeg" : p.ext === "png" ? "image/png" : p.ext === "gif" ? "image/gif" : `image/${p.ext}`;
    return `<manifest:file-entry manifest:full-path="${p.path}" manifest:media-type="${mime}"/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIMETYPE}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>` + picEntries + `</manifest:manifest>`;
}
function writeOdt(doc, options = {}) {
  doc = { ...doc, blocks: finalBlocks(doc.blocks) };
  const ctx = {
    paraStyles: /* @__PURE__ */ new Map(),
    runStyles: /* @__PURE__ */ new Map(),
    paraStyleDefs: [],
    runStyleDefs: [],
    pictures: [],
    options: { images: options.images ?? "embed" },
    comments: new Map(doc.comments.map((c2) => [c2.id, c2])),
    emittedComments: /* @__PURE__ */ new Set()
  };
  const contentBody = contentXml(doc, ctx);
  const styles = stylesXml(doc);
  const manifest = manifestXml(ctx.pictures);
  const parts = {
    "mimetype": ENC.encode(MIMETYPE),
    "content.xml": ENC.encode(contentBody),
    "styles.xml": ENC.encode(styles),
    "META-INF/manifest.xml": ENC.encode(manifest)
  };
  for (const pic of ctx.pictures) parts[pic.path] = pic.data;
  return writeZip(parts);
}

// ../docx-core/src/odf/index.ts
var ODT_MIMETYPE = "application/vnd.oasis.opendocument.text";
var DEFAULT_CONTENT_WIDTH_TWIPS = 9026;
var DEFAULT_SECTPR = {
  pageWidthTwips: 11906,
  pageHeightTwips: 16838,
  marginLeftTwips: 1417,
  marginRightTwips: 1417,
  marginTopTwips: 1417,
  marginBottomTwips: 1417
};
var HEADING_LOOKS = {
  1: { szHalfPt: 40, bold: true, color: "0F4761" },
  2: { szHalfPt: 32, bold: true, color: "0F4761" },
  3: { szHalfPt: 28, bold: true, color: "0F4761" },
  4: { szHalfPt: 26, bold: true, color: "0F4761" },
  5: { szHalfPt: 24, bold: true, color: "0F4761" },
  6: { szHalfPt: 22, bold: true, color: "0F4761" }
};
function isOdt(bytes) {
  if (bytes.length < 4 || bytes[0] !== 80 || bytes[1] !== 75) return false;
  let pkg;
  try {
    pkg = OdfPackage.load(bytes);
  } catch {
    return false;
  }
  const mime = pkg.getPartText("mimetype");
  return mime?.trim() === ODT_MIMETYPE;
}
function readOdt(bytes) {
  const pkg = OdfPackage.load(bytes);
  const contentXml2 = pkg.getPartText("content.xml");
  if (contentXml2 === void 0) {
    throw new Error("Pacote ODF sem content.xml \u2014 n\xE3o \xE9 um documento OpenDocument");
  }
  const contentRoot = parseXml(contentXml2);
  const stylesXml2 = pkg.getPartText("styles.xml");
  const stylesRoot = stylesXml2 !== void 0 ? parseXml(stylesXml2) : void 0;
  const styleIndex = buildStyleIndex(contentRoot, stylesRoot);
  const body = firstChild(contentRoot, "office:body");
  const officeText = body && firstChild(body, "office:text");
  if (!officeText) {
    throw new Error("content.xml sem office:body/office:text");
  }
  const ctx = { pkg, styleIndex, comments: [], nextCommentId: 0 };
  const blocks = [];
  for (const child of childElements(officeText)) {
    readBodyChild(child, blocks, ctx, 0);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  const sectPr = readPageGeometry(stylesRoot, contentRoot);
  const sections = [{
    sectPr,
    blockStart: 0,
    blockEnd: blocks.length,
    headers: {},
    footers: {},
    headerRefs: [],
    footerRefs: []
  }];
  return {
    blocks,
    sections,
    footnotes: /* @__PURE__ */ new Map(),
    endnotes: /* @__PURE__ */ new Map(),
    comments: ctx.comments,
    styles: buildStylesMap(styleIndex),
    bookmarks: /* @__PURE__ */ new Map()
  };
}
function readBodyChild(el, blocks, ctx, listDepth) {
  switch (el.name) {
    case "text:p":
      blocks.push({ type: "paragraph", paragraph: readParagraph(el, ctx, void 0) });
      break;
    case "text:h":
      blocks.push({ type: "paragraph", paragraph: readHeading(el, ctx) });
      break;
    case "text:list":
      readList(el, blocks, ctx, listDepth);
      break;
    case "table:table":
      blocks.push(readTable(el, ctx));
      break;
    case "text:section":
      for (const c2 of childElements(el)) readBodyChild(c2, blocks, ctx, listDepth);
      break;
    case "text:soft-page-break":
    case "text:sequence-decls":
      break;
    default:
      break;
  }
}
function readParagraph(pEl, ctx, list) {
  const styleName = pEl.attrs["text:style-name"];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  if (list) props.numbering = { kind: list.kind, ilvl: list.ilvl };
  applyParaBorders(ctx.styleIndex, styleName, props);
  const runs = [];
  const base = baseRunPropsFor(resolved);
  collectRuns(pEl, runs, ctx, base, void 0);
  const rPr = {};
  if (base.szHalfPt) {
    rPr.sz = base.szHalfPt;
    rPr.szCs = base.szHalfPt;
  }
  if (base.fontAscii) rPr.rFonts = { ascii: base.fontAscii, hAnsi: base.fontAscii, cs: base.fontAscii };
  if (base.bold) rPr.b = true;
  if (base.italic) rPr.i = true;
  return { runs, props, ...Object.keys(rPr).length ? { ppr: { rPr } } : {} };
}
function readHeading(hEl, ctx) {
  const level = clampLevel(parseInt(hEl.attrs["text:outline-level"] ?? "1", 10));
  const styleName = hEl.attrs["text:style-name"];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  props.styleId = `Heading${level}`;
  applyParaBorders(ctx.styleIndex, styleName, props);
  const look = HEADING_LOOKS[level];
  const base = { ...baseRunPropsFor(resolved) };
  base.bold = base.bold || look.bold;
  base.szHalfPt = base.szHalfPt ?? look.szHalfPt;
  base.color = base.color ?? look.color;
  const runs = [];
  collectRuns(hEl, runs, ctx, base, void 0);
  return { runs, props };
}
function clampLevel(n) {
  if (Number.isNaN(n) || n < 1) return 1;
  return n > 6 ? 6 : n;
}
function paraPropsFromStyle(resolved, styleId) {
  const p = {};
  const s = resolved.para;
  if (s.alignment !== void 0) p.alignment = s.alignment;
  if (s.indentLeftTwips !== void 0) p.indentLeftTwips = s.indentLeftTwips;
  if (s.indentRightTwips !== void 0) p.indentRightTwips = s.indentRightTwips;
  if (s.indentFirstLineTwips !== void 0) p.indentFirstLineTwips = s.indentFirstLineTwips;
  if (s.spaceBeforeTwips !== void 0) p.spaceBeforeTwips = s.spaceBeforeTwips;
  if (s.spaceAfterTwips !== void 0) p.spaceAfterTwips = s.spaceAfterTwips;
  if (s.shadingHex !== void 0) p.shadingHex = s.shadingHex;
  if (s.pageBreakBefore) p.pageBreakBefore = true;
  if (styleId) p.styleId = styleId;
  return p;
}
function baseRunPropsFor(resolved) {
  return mergeRunProps({ ...DEFAULT_RUN_PROPS }, resolved.run);
}
function mergeRunProps(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over)) {
    if (over[k] !== void 0) {
      Object.assign(out, { [k]: over[k] });
    }
  }
  return out;
}
function collectRuns(container, runs, ctx, base, pendingLink) {
  let buffer = "";
  const flush = () => {
    if (buffer.length === 0) return;
    const props = { ...base };
    if (pendingLink) {
      props.link = pendingLink;
      props.underline = true;
      props.color ??= "0563C1";
    }
    runs.push({ text: buffer, props });
    buffer = "";
  };
  for (const child of container.children) {
    if (typeof child === "string") {
      buffer += child;
      continue;
    }
    switch (child.name) {
      case "text:span": {
        flush();
        const spanStyle = resolveStyle(ctx.styleIndex, child.attrs["text:style-name"]);
        const spanBase = mergeRunProps(base, spanStyle.run);
        collectRuns(child, runs, ctx, spanBase, pendingLink);
        break;
      }
      case "text:a": {
        flush();
        const href = child.attrs["xlink:href"];
        collectRuns(child, runs, ctx, base, href ?? pendingLink);
        break;
      }
      case "text:s": {
        const count = parseInt(child.attrs["text:c"] ?? "1", 10);
        buffer += " ".repeat(Number.isNaN(count) || count < 1 ? 1 : count);
        break;
      }
      case "text:tab":
        buffer += "	";
        break;
      case "text:line-break":
        buffer += "\n";
        break;
      case "draw:frame": {
        flush();
        const img = readImage(child, ctx);
        if (img) {
          runs.push({ text: "\uFFFC", props: { ...base }, image: img });
        } else {
          const tb = readTextFrame(child, ctx);
          if (tb) runs.push({ text: "\uFFFC", props: { ...base }, textbox: tb });
          else collectRuns(child, runs, ctx, base, pendingLink);
        }
        break;
      }
      case "office:annotation": {
        flush();
        readAnnotation(child, ctx);
        break;
      }
      case "text:note": {
        flush();
        const body = firstChild(child, "text:note-body");
        if (body) collectRuns(flattenNoteBody(body), runs, ctx, base, pendingLink);
        break;
      }
      case "text:bookmark":
      case "text:bookmark-start":
      case "text:bookmark-end":
      case "text:annotation-end":
      case "text:soft-page-break":
      case "office:annotation-end":
        break;
      default:
        collectRuns(child, runs, ctx, base, pendingLink);
        break;
    }
  }
  flush();
}
function flattenNoteBody(noteBody) {
  const children = [];
  for (const p of childElements(noteBody)) {
    for (const c2 of p.children) children.push(c2);
    children.push(" ");
  }
  return { name: "span", attrs: {}, children };
}
function readAnnotation(el, ctx) {
  const author = firstChild(el, "dc:creator");
  const paras = childElements(el, "text:p");
  const text = paras.map((p) => {
    const r = [];
    collectRuns(p, r, ctx, { ...DEFAULT_RUN_PROPS }, void 0);
    return r.map((x) => x.text).join("");
  }).join("\n");
  const info = { id: ctx.nextCommentId++, text };
  if (author) info.author = textOf(author);
  ctx.comments.push(info);
}
function textOf(el) {
  let out = "";
  for (const c2 of el.children) out += typeof c2 === "string" ? c2 : textOf(c2);
  return out;
}
function readList(listEl, blocks, ctx, depth) {
  const ilvl = depth;
  const kind = resolveListKind(ctx, listEl, depth);
  for (const item of childElements(listEl, "text:list-item")) {
    readListItem(item, blocks, ctx, depth, ilvl, kind);
  }
  for (const header of childElements(listEl, "text:list-header")) {
    for (const c2 of childElements(header)) {
      if (c2.name === "text:p" || c2.name === "text:h") {
        blocks.push({ type: "paragraph", paragraph: readParagraph(c2, ctx, void 0) });
      }
    }
  }
}
function readListItem(item, blocks, ctx, depth, ilvl, kind) {
  for (const c2 of childElements(item)) {
    if (c2.name === "text:p" || c2.name === "text:h") {
      blocks.push({ type: "paragraph", paragraph: readParagraph(c2, ctx, { kind, ilvl }) });
    } else if (c2.name === "text:list") {
      readList(c2, blocks, ctx, depth + 1);
    }
  }
}
function resolveListKind(ctx, listEl, depth) {
  const level = depth + 1;
  const direct = listEl.attrs["text:style-name"];
  const fromDirect = lookupListKind(ctx, direct, level);
  if (fromDirect) return fromDirect;
  for (const item of childElements(listEl, "text:list-item")) {
    for (const c2 of childElements(item, "text:p")) {
      const resolved = resolveStyle(ctx.styleIndex, c2.attrs["text:style-name"]);
      const fromStyle = lookupListKind(ctx, resolved.listStyleName, level);
      if (fromStyle) return fromStyle;
    }
  }
  return "bullet";
}
function lookupListKind(ctx, listStyleName, level) {
  if (!listStyleName) return void 0;
  const levels = ctx.styleIndex.listStyles.get(listStyleName);
  if (!levels) return void 0;
  return levels.get(level) ?? levels.get(1);
}
function readTable(tblEl, ctx) {
  const colWidths = readColumns(tblEl, ctx);
  const rows = [];
  for (const rowEl of collectRows(tblEl)) {
    const cells = [];
    for (const cellEl of childElements(rowEl)) {
      if (cellEl.name === "table:table-cell") {
        cells.push(readCell(cellEl, ctx));
      } else if (cellEl.name === "table:covered-table-cell") {
      }
    }
    if (cells.length > 0) rows.push({ cells });
  }
  const totalCols = rows.reduce(
    (max, r) => Math.max(max, r.cells.reduce((s, c2) => s + c2.gridSpan, 0)),
    colWidths.length
  );
  const gridColsTwips = buildGridCols(colWidths, totalCols);
  return { type: "table", rows, gridColsTwips };
}
function collectRows(tblEl) {
  const out = [];
  for (const c2 of childElements(tblEl)) {
    if (c2.name === "table:table-row") out.push(c2);
    else if (c2.name === "table:table-header-rows" || c2.name === "table:table-row-group") {
      out.push(...childElements(c2, "table:table-row"));
    }
  }
  return out;
}
function readColumns(tblEl, ctx) {
  const widths = [];
  const visit = (el) => {
    for (const c2 of childElements(el)) {
      if (c2.name === "table:table-column") {
        const repeat = parseInt(c2.attrs["table:number-columns-repeated"] ?? "1", 10);
        const w = columnWidth(c2, ctx.styleIndex);
        for (let i = 0; i < (Number.isNaN(repeat) || repeat < 1 ? 1 : repeat); i++) widths.push(w);
      } else if (c2.name === "table:table-columns" || c2.name === "table:table-header-columns") {
        visit(c2);
      }
    }
  };
  visit(tblEl);
  return widths;
}
function columnWidth(colEl, index) {
  const styleName = colEl.attrs["table:style-name"];
  if (!styleName) return void 0;
  const raw = index.styles.get(styleName);
  const colProps = raw?.column;
  if (!colProps) return void 0;
  return lengthToTwips(colProps.attrs["style:column-width"]);
}
function buildGridCols(colWidths, totalCols) {
  const n = Math.max(totalCols, colWidths.length, 1);
  const known = colWidths.filter((w) => w !== void 0);
  if (known.length === n) return [...known];
  const each = Math.round(DEFAULT_CONTENT_WIDTH_TWIPS / n);
  const out = [];
  for (let i = 0; i < n; i++) out.push(colWidths[i] ?? each);
  return out;
}
function readCell(cellEl, ctx) {
  const gridSpan = parseInt(cellEl.attrs["table:number-columns-spanned"] ?? "1", 10);
  const paragraphs = [];
  const tables = [];
  const innerBlocks = [];
  for (const c2 of childElements(cellEl)) {
    readBodyChild(c2, innerBlocks, ctx, 0);
  }
  for (const b of innerBlocks) {
    if (b.type === "paragraph") paragraphs.push(b.paragraph);
    else tables.push(b);
  }
  if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });
  const cell = {
    paragraphs,
    tables,
    gridSpan: Number.isNaN(gridSpan) || gridSpan < 1 ? 1 : gridSpan
  };
  const cellStyle = cellEl.attrs["table:style-name"];
  const shading = cellShading(ctx.styleIndex, cellStyle);
  if (shading) cell.shadingHex = shading;
  const borders = cellBorders(ctx.styleIndex, cellStyle);
  if (borders) cell.borders = borders;
  return cell;
}
function readImage(frame, ctx) {
  const imageEl = firstChild(frame, "draw:image");
  if (!imageEl) return void 0;
  let data;
  let ext = "png";
  const href = imageEl.attrs["xlink:href"];
  if (href) {
    const path = href.replace(/^\.\//, "");
    data = ctx.pkg.getPart(path);
    const e = path.split(".").pop();
    if (e) ext = e.toLowerCase();
  }
  if (!data) {
    const binary = firstChild(imageEl, "office:binary-data");
    if (binary) {
      const b64 = textOf(binary).replace(/\s+/g, "");
      data = decodeBase64(b64);
    }
  }
  if (!data) return void 0;
  const widthTwips = lengthToTwips(frame.attrs["svg:width"]) ?? 0;
  const heightTwips = lengthToTwips(frame.attrs["svg:height"]) ?? 0;
  return { data, ext, widthTwips, heightTwips };
}
function readTextFrame(frame, ctx) {
  const box = firstChild(frame, "draw:text-box");
  if (!box) return void 0;
  const blocks = [];
  for (const c2 of childElements(box)) readBodyChild(c2, blocks, ctx, 0);
  if (!blocks.length) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  const gp = ctx.styleIndex.styles.get(frame.attrs["draw:style-name"] ?? "")?.graphic;
  const ga = (k) => gp?.attrs[k];
  const pad = (side) => lengthToTwips(ga(`fo:padding-${side}`) ?? ga("fo:padding")) ?? 0;
  const tb = {
    paras: blocks.flatMap((b) => b.type === "paragraph" ? [b.paragraph] : []),
    blocks,
    widthTwips: lengthToTwips(frame.attrs["svg:width"] ?? box.attrs["fo:min-width"]) ?? 0,
    heightTwips: lengthToTwips(frame.attrs["svg:height"] ?? box.attrs["fo:min-height"]) ?? 0,
    insets: { l: pad("left"), t: pad("top"), r: pad("right"), b: pad("bottom") }
  };
  const at = frame.attrs["text:anchor-type"] ?? "paragraph";
  if (at === "as-char") return tb;
  const w = ga("style:wrap");
  const wrap = w === "none" ? "topAndBottom" : w === void 0 || w === "run-through" ? "none" : "square";
  const hRel = ga("style:horizontal-rel") ?? (at === "page" ? "page" : "paragraph");
  const vRel = ga("style:vertical-rel") ?? (at === "page" ? "page" : "paragraph");
  const hPos = ga("style:horizontal-pos"), vPos = ga("style:vertical-pos");
  tb.floating = true;
  tb.anchor = {
    wrap,
    ...wrap === "square" ? { wrapText: w === "left" ? "left" : w === "right" ? "right" : w === "biggest" || w === "dynamic" ? "largest" : "bothSides" } : {},
    ...w === "run-through" && ga("style:run-through") === "background" ? { behindDoc: true } : {},
    posH: {
      relativeFrom: hRel === "page" ? "page" : hRel === "page-content" ? "margin" : hRel === "char" ? "character" : "column",
      ...hPos && hPos !== "from-left" ? { align: hPos === "center" ? "center" : hPos === "right" ? "right" : "left" } : { offset: lengthToTwips(frame.attrs["svg:x"]) ?? 0 }
    },
    posV: {
      relativeFrom: vRel === "page" ? "page" : vRel === "page-content" ? "margin" : vRel === "line" || vRel === "char" ? "line" : "paragraph",
      ...vPos && vPos !== "from-top" ? { align: vPos === "middle" ? "center" : vPos === "bottom" ? "bottom" : "top" } : { offset: lengthToTwips(frame.attrs["svg:y"]) ?? 0 }
    },
    relativeHeight: parseInt(frame.attrs["draw:z-index"] ?? "0", 10) || 0,
    layoutInCell: true,
    allowOverlap: true
  };
  return tb;
}
function decodeBase64(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const g = globalThis;
  if (g.Buffer) return new Uint8Array(g.Buffer.from(b64, "base64"));
  throw new Error("sem decodificador base64 (atob/Buffer) no ambiente");
}
function applyParaBorders(index, styleName, props) {
  const borders = bordersFromStyle(index, styleName);
  if (borders) props.borders = borders;
}
function bordersFromStyle(index, styleName) {
  if (!styleName) return void 0;
  const raw = index.styles.get(styleName);
  const paraEl = raw?.para;
  if (!paraEl) {
    const parent = raw?.parent;
    return parent ? bordersFromStyle(index, parent) : void 0;
  }
  const a = paraEl.attrs;
  const all = parseBorder(a["fo:border"]);
  const out = {};
  let any = false;
  for (const [side, attr] of [
    ["top", "fo:border-top"],
    ["left", "fo:border-left"],
    ["bottom", "fo:border-bottom"],
    ["right", "fo:border-right"]
  ]) {
    const edge = parseBorder(a[attr]) ?? all;
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  if (any) return out;
  return raw?.parent ? bordersFromStyle(index, raw.parent) : void 0;
}
function parseBorder(spec) {
  if (!spec || spec === "none") return void 0;
  const parts = spec.trim().split(/\s+/);
  let widthTwips;
  let style = "single";
  let color;
  for (const part of parts) {
    const w = lengthToTwips(part);
    if (w !== void 0) {
      widthTwips = w;
      continue;
    }
    if (/^#?[0-9a-fA-F]{6}$/.test(part)) {
      color = part.replace(/^#/, "").toUpperCase();
      continue;
    }
    switch (part) {
      case "solid":
        style = "single";
        break;
      case "double":
        style = "double";
        break;
      case "dashed":
        style = "dashed";
        break;
      case "dotted":
        style = "dotted";
        break;
      case "none":
      case "hidden":
        return void 0;
      default:
        break;
    }
  }
  const pt = widthTwips !== void 0 ? widthTwips / 20 : 0.5;
  return {
    style,
    sizeEighthPt: Math.max(2, Math.round(pt * 8)),
    color,
    spacePt: 0
  };
}
function cellPropsEl(index, styleName, seen = /* @__PURE__ */ new Set()) {
  if (!styleName || seen.has(styleName)) return void 0;
  seen.add(styleName);
  const raw = index.styles.get(styleName);
  if (!raw) return void 0;
  return raw.cell ?? cellPropsEl(index, raw.parent, seen);
}
function cellShading(index, styleName) {
  const el = cellPropsEl(index, styleName);
  const bg = el?.attrs["fo:background-color"];
  if (bg && bg !== "transparent") return bg.replace(/^#/, "").toUpperCase();
  return void 0;
}
function cellBorders(index, styleName) {
  const el = cellPropsEl(index, styleName);
  if (!el) return void 0;
  const a = el.attrs;
  const all = parseBorder(a["fo:border"]);
  const out = {};
  let any = false;
  for (const [side, attr] of [
    ["top", "fo:border-top"],
    ["left", "fo:border-left"],
    ["bottom", "fo:border-bottom"],
    ["right", "fo:border-right"]
  ]) {
    const edge = parseBorder(a[attr]) ?? all;
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function readPageGeometry(stylesRoot, contentRoot) {
  const layout = findPageLayout(stylesRoot) ?? findPageLayout(contentRoot);
  if (!layout) return { ...DEFAULT_SECTPR };
  const propsEl = firstChild(layout, "style:page-layout-properties");
  if (!propsEl) return { ...DEFAULT_SECTPR };
  const a = propsEl.attrs;
  return {
    pageWidthTwips: lengthToTwips(a["fo:page-width"]) ?? DEFAULT_SECTPR.pageWidthTwips,
    pageHeightTwips: lengthToTwips(a["fo:page-height"]) ?? DEFAULT_SECTPR.pageHeightTwips,
    marginLeftTwips: lengthToTwips(a["fo:margin-left"]) ?? DEFAULT_SECTPR.marginLeftTwips,
    marginRightTwips: lengthToTwips(a["fo:margin-right"]) ?? DEFAULT_SECTPR.marginRightTwips,
    marginTopTwips: lengthToTwips(a["fo:margin-top"]) ?? DEFAULT_SECTPR.marginTopTwips,
    marginBottomTwips: lengthToTwips(a["fo:margin-bottom"]) ?? DEFAULT_SECTPR.marginBottomTwips
  };
}
function findPageLayout(root) {
  if (!root) return void 0;
  const auto = firstChild(root, "office:automatic-styles");
  const found = auto && firstChild(auto, "style:page-layout");
  if (found) return found;
  const styles = firstChild(root, "office:styles");
  return styles ? firstChild(styles, "style:page-layout") : void 0;
}
function buildStylesMap(index) {
  const out = /* @__PURE__ */ new Map();
  for (const [name, _raw] of index.styles) {
    const resolved = resolveStyle(index, name);
    const id = normalizeStyleId(name);
    const entry = {
      run: { ...resolved.run },
      para: { ...resolved.para }
    };
    out.set(id, entry);
    if (id !== name) out.set(name, entry);
  }
  for (let lvl = 1; lvl <= 6; lvl++) {
    const id = `Heading${lvl}`;
    if (!out.has(id)) {
      const look = HEADING_LOOKS[lvl];
      out.set(id, {
        run: { bold: look.bold, szHalfPt: look.szHalfPt, color: look.color },
        para: {}
      });
    }
  }
  return out;
}
function normalizeStyleId(name) {
  return name.replace(/\s+/g, "");
}

// ../../../shared/fonts/src/catalog.ts
var DEFAULT_FAMILY = "Liberation Sans";
var BUNDLED = {
  "liberation sans": { family: "Liberation Sans", file: "liberationsans" },
  "liberation serif": { family: "Liberation Serif", file: "liberationserif" },
  "liberation mono": { family: "Liberation Mono", file: "liberationmono" },
  carlito: { family: "Carlito", file: "carlito" },
  caladea: { family: "Caladea", file: "caladea" }
};
function bundledFileName(file, v) {
  return `${file}-${v.toLowerCase()}.ttf`;
}
var METRIC_SUBSTITUTES = {
  calibri: "Carlito",
  cambria: "Caladea",
  arial: "Liberation Sans",
  "arial mt": "Liberation Sans",
  // ausente, o PowerPoint a desenha com as métricas da Arial (oráculo syn-b-e29:
  // "Arial Unicode MS" mede 354,01 pt = Arial; família desconhecida = Calibri)
  "arial unicode ms": "Liberation Sans",
  helvetica: "Liberation Sans",
  arimo: "Liberation Sans",
  "times new roman": "Liberation Serif",
  times: "Liberation Serif",
  tinos: "Liberation Serif",
  "courier new": "Liberation Mono",
  courier: "Liberation Mono",
  cousine: "Liberation Mono"
};
var PROBE_FAMILIES = [
  // Windows
  "Arial",
  "Arial Black",
  "Bahnschrift",
  "Calibri",
  "Calibri Light",
  "Cambria",
  "Cambria Math",
  "Candara",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Ebrima",
  "Franklin Gothic Medium",
  "Gabriola",
  "Gadugi",
  "Georgia",
  "Impact",
  "Ink Free",
  "Javanese Text",
  "Leelawadee UI",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Malgun Gothic",
  "Microsoft Himalaya",
  "Microsoft JhengHei",
  "Microsoft New Tai Lue",
  "Microsoft PhagsPa",
  "Microsoft Sans Serif",
  "Microsoft Tai Le",
  "Microsoft YaHei",
  "Microsoft Yi Baiti",
  "MingLiU-ExtB",
  "Mongolian Baiti",
  "MS Gothic",
  "MV Boli",
  "Myanmar Text",
  "Nirmala UI",
  "Palatino Linotype",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Segoe UI Black",
  "Segoe UI Emoji",
  "Segoe UI Historic",
  "Segoe UI Light",
  "Segoe UI Semibold",
  "Segoe UI Semilight",
  "Segoe UI Symbol",
  "SimSun",
  "Sitka Text",
  "Sylfaen",
  "Symbol",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Webdings",
  "Wingdings",
  "Yu Gothic",
  // instaladas pelo Office (pasta de fontes do Windows)
  "Agency FB",
  "Algerian",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Baskerville Old Face",
  "Bauhaus 93",
  "Bell MT",
  "Berlin Sans FB",
  "Bernard MT Condensed",
  "Book Antiqua",
  "Bookman Old Style",
  "Bradley Hand ITC",
  "Britannic Bold",
  "Broadway",
  "Brush Script MT",
  "Californian FB",
  "Calisto MT",
  "Castellar",
  "Centaur",
  "Century",
  "Century Gothic",
  "Century Schoolbook",
  "Chiller",
  "Colonna MT",
  "Cooper Black",
  "Copperplate Gothic Bold",
  "Curlz MT",
  "Edwardian Script ITC",
  "Elephant",
  "Engravers MT",
  "Eras Medium ITC",
  "Felix Titling",
  "Footlight MT Light",
  "Forte",
  "Franklin Gothic Book",
  "Freestyle Script",
  "French Script MT",
  "Garamond",
  "Gigi",
  "Gill Sans MT",
  "Gloucester MT Extra Condensed",
  "Goudy Old Style",
  "Haettenschweiler",
  "Harlow Solid Italic",
  "Harrington",
  "High Tower Text",
  "Imprint MT Shadow",
  "Informal Roman",
  "Jokerman",
  "Juice ITC",
  "Kristen ITC",
  "Kunstler Script",
  "Lucida Bright",
  "Lucida Calligraphy",
  "Lucida Fax",
  "Lucida Handwriting",
  "Lucida Sans",
  "Lucida Sans Typewriter",
  "Magneto",
  "Maiandra GD",
  "Matura MT Script Capitals",
  "Mistral",
  "Modern No. 20",
  "Monotype Corsiva",
  "Niagara Engraved",
  "Old English Text MT",
  "Onyx",
  "Palace Script MT",
  "Papyrus",
  "Parchment",
  "Perpetua",
  "Playbill",
  "Poor Richard",
  "Pristina",
  "Rage Italic",
  "Ravie",
  "Rockwell",
  "Script MT Bold",
  "Showcard Gothic",
  "Snap ITC",
  "Stencil",
  "Tempus Sans ITC",
  "Tw Cen MT",
  "Viner Hand ITC",
  "Vivaldi",
  "Vladimir Script",
  "Wide Latin",
  // macOS
  "American Typewriter",
  "Andale Mono",
  "Apple Chancery",
  "Avenir",
  "Avenir Next",
  "Baskerville",
  "Big Caslon",
  "Chalkboard",
  "Charter",
  "Cochin",
  "Copperplate",
  "Didot",
  "Futura",
  "Geneva",
  "Gill Sans",
  "Helvetica",
  "Helvetica Neue",
  "Hoefler Text",
  "Lucida Grande",
  "Marker Felt",
  "Menlo",
  "Monaco",
  "Optima",
  "Palatino",
  "Rockwell",
  "SF Pro",
  "Skia",
  "Snell Roundhand",
  "Times",
  "Trattatello",
  "Zapfino",
  // Linux / abertas comuns
  "Cantarell",
  "DejaVu Sans",
  "DejaVu Sans Mono",
  "DejaVu Serif",
  "Droid Sans",
  "Fira Sans",
  "Fira Mono",
  "Inter",
  "Lato",
  "Montserrat",
  "Noto Sans",
  "Noto Serif",
  "Noto Sans Mono",
  "Open Sans",
  "Oswald",
  "Poppins",
  "PT Sans",
  "PT Serif",
  "Raleway",
  "Roboto",
  "Roboto Mono",
  "Source Sans Pro",
  "Source Serif Pro",
  "Ubuntu",
  "Ubuntu Mono"
];

// ../../../shared/fonts/src/types.ts
var VARIANTS = ["regular", "bold", "italic", "boldItalic"];
function variantOf(bold, italic) {
  return bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
}
function isBoldVariant(v) {
  return v === "bold" || v === "boldItalic";
}
function isItalicVariant(v) {
  return v === "italic" || v === "boldItalic";
}
function faceDescriptors(v) {
  return { weight: isBoldVariant(v) ? "700" : "400", style: isItalicVariant(v) ? "italic" : "normal" };
}
function variantOfStyle(style) {
  const s = (style ?? "Regular").toLowerCase().replace(/\s+/g, " ").trim();
  switch (s) {
    case "regular":
    case "normal":
    case "roman":
    case "":
      return "regular";
    case "bold":
      return "bold";
    case "italic":
    case "oblique":
      return "italic";
    case "bold italic":
    case "bold oblique":
      return "boldItalic";
    default:
      return null;
  }
}

// ../../../shared/fonts/src/environment.ts
var PROBE_TEXT = "mmmmmmmmmmlli1WQ@#\u03A9\u03B2";
var GENERICS = ["monospace", "serif", "sans-serif"];
var cssName = (family) => `"${family.replace(/["\\]/g, "\\$&")}"`;
var unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, "$2");
function browserEnvironment() {
  let ctx = null;
  const context = () => {
    if (ctx) return ctx;
    ctx = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(8, 8).getContext("2d") : document.createElement("canvas").getContext("2d");
    return ctx;
  };
  const width = (font) => {
    const c2 = context();
    if (!c2) return 0;
    c2.font = font;
    return c2.measureText(PROBE_TEXT).width;
  };
  const baseWidths = /* @__PURE__ */ new Map();
  const generic = (g) => {
    let w = baseWidths.get(g);
    if (w === void 0) baseWidths.set(g, w = width(`72px ${g}`));
    return w;
  };
  const qlf = typeof window !== "undefined" ? window.queryLocalFonts : void 0;
  return {
    // Mede o texto com a família + uma genérica; se a largura mudar em
    // alguma das três genéricas, o navegador achou a família.
    isInstalled(family) {
      return GENERICS.some((g) => width(`72px ${cssName(family)}, ${g}`) !== generic(g));
    },
    async loadLocal(family, v) {
      const names = v === "regular" ? [family, `${family} Regular`] : v === "bold" ? [`${family} Bold`] : v === "italic" ? [`${family} Italic`] : [`${family} Bold Italic`];
      for (const n of names) {
        try {
          const face = new FontFace(family, `local(${cssName(n)})`, faceDescriptors(v));
          await face.load();
          document.fonts.add(face);
          return true;
        } catch {
        }
      }
      return false;
    },
    async addFace(family, v, bytes) {
      try {
        const face = new FontFace(family, bytes.slice().buffer, faceDescriptors(v));
        await face.load();
        document.fonts.add(face);
        return true;
      } catch {
        return false;
      }
    },
    pageFamilies(exclude) {
      const out = /* @__PURE__ */ new Map();
      if (typeof document === "undefined" || !document.fonts) return out;
      for (const f of document.fonts) {
        const name = unquote(f.family);
        const key = name.toLowerCase();
        if (!exclude.has(key)) out.set(key, name);
      }
      return out;
    },
    async loadPageFamily(family) {
      const n = cssName(family);
      await Promise.allSettled([
        document.fonts.load(`16px ${n}`),
        document.fonts.load(`bold 16px ${n}`),
        document.fonts.load(`italic 16px ${n}`),
        document.fonts.load(`italic bold 16px ${n}`)
      ]);
    },
    async fetchBytes(url) {
      try {
        const res = await fetch(url);
        return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },
    localAccess: typeof qlf === "function" ? {
      async granted() {
        try {
          const st = await navigator.permissions.query({ name: "local-fonts" });
          return st.state === "granted";
        } catch {
          return false;
        }
      },
      query: () => qlf.call(window)
    } : null
  };
}

// ../../../shared/fonts/src/sfnt.ts
var tag = (v, p) => String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
function tableOf(v, base, want) {
  const num = v.getUint16(base + 4);
  for (let i = 0; i < num; i++) {
    const p = base + 12 + i * 16;
    if (tag(v, p) === want) return { off: v.getUint32(p + 8), len: v.getUint32(p + 12) };
  }
  return null;
}
function isEmbeddable(bytes) {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const os2 = tableOf(v, 0, "OS/2");
    if (!os2 || os2.len < 10) return true;
    const fsType = v.getUint16(os2.off + 8);
    return !(fsType & 2 && !(fsType & 12)) && !(fsType & 512);
  } catch {
    return true;
  }
}
function hasTrueTypeOutlines(bytes) {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return !!tableOf(v, 0, "glyf") && !!tableOf(v, 0, "loca");
  } catch {
    return false;
  }
}
function glyphIdsFor(bytes, codePoints) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = /* @__PURE__ */ new Set();
  const cmap = tableOf(v, 0, "cmap");
  if (!cmap) return out;
  const n = v.getUint16(cmap.off + 2);
  let best = -1, score = -1;
  for (let i = 0; i < n; i++) {
    const p = cmap.off + 4 + i * 8;
    const pl = v.getUint16(p), enc = v.getUint16(p + 2);
    const s = pl === 3 && enc === 10 ? 3 : pl === 3 && enc === 1 ? 2 : pl === 0 ? 1 : 0;
    if (s > score) {
      score = s;
      best = cmap.off + v.getUint32(p + 4);
    }
  }
  if (best < 0) return out;
  const format = v.getUint16(best);
  const lookup = (cp) => {
    if (format === 4) {
      if (cp > 65535) return 0;
      const segX2 = v.getUint16(best + 6);
      const ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        if (cp > v.getUint16(ends + s)) continue;
        const start = v.getUint16(starts + s);
        if (cp < start) return 0;
        const delta = v.getInt16(deltas + s), ro = v.getUint16(ranges + s);
        if (!ro) return cp + delta & 65535;
        const g = v.getUint16(ranges + s + ro + (cp - start) * 2);
        return g ? g + delta & 65535 : 0;
      }
      return 0;
    }
    if (format === 12) {
      const groups = v.getUint32(best + 12);
      for (let i = 0; i < groups; i++) {
        const p = best + 16 + i * 12;
        const a = v.getUint32(p), b = v.getUint32(p + 4);
        if (cp >= a && cp <= b) return v.getUint32(p + 8) + (cp - a);
      }
    }
    return 0;
  };
  for (const cp of codePoints) {
    const g = lookup(cp);
    if (g) out.add(g);
  }
  return out;
}
function faceInfo(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const os2 = tableOf(v, 0, "OS/2"), head = tableOf(v, 0, "head");
  const u32 = (t, o) => t && t.len >= o + 4 ? v.getUint32(t.off + o) : 0;
  const panose = os2 && os2.len >= 42 ? [...bytes.subarray(os2.off + 32, os2.off + 42)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase() : "00000000000000000000";
  return {
    panose,
    weight: os2 ? v.getUint16(os2.off + 4) || 400 : 400,
    italic: os2 ? (v.getUint16(os2.off + 62) & 1) === 1 : false,
    fsType: os2 ? v.getUint16(os2.off + 8) : 0,
    unicodeRange: [u32(os2, 42), u32(os2, 46), u32(os2, 50), u32(os2, 54)],
    codePageRange: os2 && v.getUint16(os2.off) >= 1 ? [u32(os2, 78), u32(os2, 82)] : [0, 0],
    checkSumAdjustment: u32(head, 8),
    names: { family: nameString(v, 1), style: nameString(v, 2), version: nameString(v, 5), full: nameString(v, 4) }
  };
}
function nameString(v, id) {
  const name = tableOf(v, 0, "name");
  if (!name) return "";
  const count = v.getUint16(name.off + 2);
  const strOff = name.off + v.getUint16(name.off + 4);
  let any = "";
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (v.getUint16(r) !== 3 || v.getUint16(r + 6) !== id) continue;
    const len = v.getUint16(r + 8), o = strOff + v.getUint16(r + 10);
    let s = "";
    for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(o + k));
    if (v.getUint16(r + 4) === 1033) return s;
    any ||= s;
  }
  return any;
}
function postscriptName(v, base) {
  const name = tableOf(v, base, "name");
  if (!name) return null;
  const count = v.getUint16(name.off + 2);
  const strOff = name.off + v.getUint16(name.off + 4);
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (v.getUint16(r + 6) !== 6) continue;
    const platform = v.getUint16(r), len = v.getUint16(r + 8), o = strOff + v.getUint16(r + 10);
    let s = "";
    if (platform === 3 || platform === 0) for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(o + k));
    else for (let k = 0; k < len; k++) s += String.fromCharCode(v.getUint8(o + k));
    if (s) return s;
  }
  return null;
}
function standaloneFace(bytes, wantPostscript) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12 || tag(v, 0) !== "ttcf") return bytes;
  const numFonts = v.getUint32(8);
  let base = v.getUint32(12);
  if (wantPostscript) {
    for (let i = 0; i < numFonts; i++) {
      const b = v.getUint32(12 + i * 4);
      if (postscriptName(v, b) === wantPostscript) {
        base = b;
        break;
      }
    }
  }
  const num = v.getUint16(base + 4);
  const recs = [];
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    const off = v.getUint32(o + 8), len = v.getUint32(o + 12);
    if (off + len > bytes.length) throw new RangeError("tabela fora do arquivo");
    recs.push({ o, off, len });
  }
  const headerLen = 12 + num * 16;
  const out = new Uint8Array(recs.reduce((n, r) => n + (r.len + 3 & ~3), headerLen));
  const ov = new DataView(out.buffer);
  out.set(bytes.subarray(base, base + 12), 0);
  let pos = headerLen;
  recs.forEach((r, i) => {
    const d = 12 + i * 16;
    out.set(bytes.subarray(r.o, r.o + 8), d);
    ov.setUint32(d + 8, pos);
    ov.setUint32(d + 12, r.len);
    out.set(bytes.subarray(r.off, r.off + r.len), pos);
    pos += r.len + 3 & ~3;
  });
  return out;
}

// ../../../shared/fonts/src/resolver.ts
var needsFile = (r) => r.source === "installed" || r.source === "page";
var css = (family) => `"${family.replace(/["\\]/g, "\\$&")}"`;
var FontResolver = class _FontResolver {
  constructor(env) {
    this.env = env;
  }
  env;
  static sharedInstance = null;
  /** O resolvedor da página (as fontes de `document.fonts` são globais). */
  static shared() {
    return _FontResolver.sharedInstance ??= new _FontResolver(browserEnvironment());
  }
  baseUrl = null;
  host = null;
  resolved = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  /** Famílias (minúsculas) cujos FontFaces fomos NÓS que registramos. */
  own = /* @__PURE__ */ new Set();
  bundledLoads = /* @__PURE__ */ new Map();
  /** Variante de embarcada sendo baixada (arquivo|variante). */
  faceLoads = /* @__PURE__ */ new Map();
  localFonts = null;
  /** Substituta/padrão COM arquivo das famílias só-pelo-nome (getWithFile). */
  fileFallbacks = /* @__PURE__ */ new Map();
  pendingFile = /* @__PURE__ */ new Map();
  hostList = null;
  /** Configura base das embarcadas e/ou host. Trocar o host refaz as resoluções. */
  configure(opts) {
    if (opts.baseUrl !== void 0) this.baseUrl = opts.baseUrl ? opts.baseUrl.replace(/\/$/, "") : null;
    if (opts.host !== void 0 && opts.host !== this.host) {
      this.host = opts.host;
      this.hostList = null;
      this.invalidate(() => true);
    }
  }
  /** Base sugerida por um componente (atributo `fonts`): só vale se ninguém configurou. */
  suggestBaseUrl(url) {
    if (url && this.baseUrl === null) this.baseUrl = url.replace(/\/$/, "");
  }
  get hasHost() {
    return !!this.host;
  }
  /** Resolução já pronta (síncrono); undefined se ainda não resolvida. */
  get(family) {
    return this.resolved.get(family.toLowerCase());
  }
  /** Avisa quando famílias (re)resolvem — repintar/medir de novo. */
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  /**
   * Pilha CSS para desenhar a família (síncrono). Ainda não resolvida: dispara
   * a resolução em segundo plano e devolve o nome pedido + os substitutos + o
   * padrão (o navegador já usa a instalada, se houver); ao resolver,
   * `onChange` avisa.
   *
   * `fallbacks`: o SUBSTITUTO DO APP para família que não existe em lugar
   * nenhum (resolvida como `default`) — cada app imita o seu programa de
   * referência (o PowerPoint desenha família ausente com métricas da Calibri;
   * o Excel cai na Aptos Narrow). O primeiro que resolver para uma fonte de
   * verdade vence; nenhum: o padrão (Liberation Sans).
   */
  cssStack(family, fallbacks = [], variant = "regular") {
    const tail = `${css(DEFAULT_FAMILY)}, sans-serif`;
    if (!family) return tail;
    const r = this.get(family);
    if (!r) {
      void this.resolve([family, ...fallbacks]);
      return [family, ...fallbacks].map(css).join(", ") + `, ${tail}`;
    }
    const use = (x) => {
      this.wantVariant(x, variant);
      return x.cssFamily === DEFAULT_FAMILY ? tail : `${css(x.cssFamily)}, ${tail}`;
    };
    if (r.source !== "default") return use(r);
    for (const fb of fallbacks) {
      const f = this.get(fb);
      if (!f) {
        void this.resolve([fb]);
        return `${css(fb)}, ${tail}`;
      }
      if (f.source !== "default") return use(f);
    }
    return use(r);
  }
  /** Quem desenha usa uma variante que a embarcada ainda não baixou (só a
   *  regular vem de início): baixa essa face, uma vez — o onChange repinta. */
  wantVariant(r, v) {
    if (v === "regular" || r.faces[v]) return;
    if (r.source !== "bundled" && r.source !== "substitute" && r.source !== "default") return;
    void this.loadFace(r, v);
  }
  /** Resolve as famílias (idempotente; pedidos em andamento são reaproveitados). */
  async resolve(families) {
    const wanted = /* @__PURE__ */ new Map();
    for (const f of families) if (f && !wanted.has(f.toLowerCase())) wanted.set(f.toLowerCase(), f);
    const missing = [...wanted].filter(([k]) => !this.resolved.has(k) && !this.pending.has(k)).map(([, f]) => f);
    if (missing.length) {
      const batch = this.resolveBatch(missing).then((rs) => {
        for (const r of rs) this.resolved.set(r.family.toLowerCase(), r);
        return rs;
      });
      missing.forEach((f, i) => {
        const key = f.toLowerCase();
        const p = batch.then((rs) => rs[i]);
        this.pending.set(key, p);
        void p.finally(() => this.pending.delete(key)).catch(() => {
        });
      });
      void batch.then((rs) => this.emit(rs.map((r) => r.family)), () => {
      });
    }
    return Promise.all([...wanted].map(([k]) => this.resolved.get(k) ?? this.pending.get(k)));
  }
  /** Bytes de uma família ABERTA embarcada (ex.: o padrão) — das variantes pedidas. */
  async bundledFaces(family = DEFAULT_FAMILY, variants = ["regular"]) {
    const faces = await this.loadBundled(family);
    const b = BUNDLED[family.toLowerCase()];
    if (b) await Promise.all(variants.map((v) => this.loadBundledFace(b, faces, v)));
    return faces;
  }
  /**
   * Bytes de UMA variante da família resolvida, baixando se preciso — as
   * embarcadas (bundled/substituta/padrão) chegam só com a regular; as outras
   * vêm quando alguém mede/embute aquela variante. undefined: não há o arquivo.
   */
  async loadFace(r, v) {
    if (r.faces[v]) return r.faces[v];
    if (r.source !== "bundled" && r.source !== "substitute" && r.source !== "default") return void 0;
    const b = BUNDLED[r.cssFamily.toLowerCase()];
    if (!b) return void 0;
    return this.loadBundledFace(b, await this.loadBundled(b.family), v);
  }
  /**
   * Resolução que EXIGE o arquivo da fonte (síncrono) — para quem mede e embute
   * o texto com as métricas do arquivo (o Write). Família que o navegador só
   * expõe PELO NOME (`installed`/`page`, sem bytes) vira a substituta
   * métrico-compatível ou o padrão — como um editor que não acha a fonte, e
   * igual na tela e no PDF. undefined: ainda não resolvida (ver resolveWithFile).
   */
  getWithFile(family) {
    const r = this.get(family);
    if (!r || !needsFile(r)) return r;
    return this.fileFallbacks.get(family.toLowerCase());
  }
  /** resolve() exigindo o arquivo (ver getWithFile); avisa por onChange. */
  async resolveWithFile(families) {
    const rs = await this.resolve(families);
    return Promise.all(rs.map((r) => needsFile(r) ? this.fileFallback(r) : r));
  }
  /**
   * Famílias para um seletor de fonte. Com host: as dele. Senão, as que a
   * Local Font Access já entregou (se permitida) ou as SONDADAS pelo nome
   * (lista PROBE_FAMILIES) + as embarcadas e as que têm substituta.
   * `withFile`: só as que dá para usar COM o arquivo (sem as sondadas pelo
   * nome nem as `@font-face` da página) — o seletor do Write.
   */
  async listFamilies(opts = {}) {
    const names = /* @__PURE__ */ new Map();
    const add = (n) => {
      if (n && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), n);
    };
    for (const b of Object.values(BUNDLED)) add(b.family);
    for (const k of Object.keys(METRIC_SUBSTITUTES)) {
      const r = PROBE_FAMILIES.find((p) => p.toLowerCase() === k);
      if (r) add(r);
    }
    for (const r of this.resolved.values()) if (r.source !== "default" && !(opts.withFile && needsFile(r))) add(r.family);
    if (!opts.withFile) for (const n of this.env.pageFamilies(this.own).values()) add(n);
    if (this.host) {
      try {
        for (const n of await (this.hostList ??= this.host.list())) add(n);
      } catch {
      }
    } else if (await this.localAccessFonts()) {
      for (const f of this.localFonts) add(f.family);
    } else if (!opts.withFile) {
      for (const p of PROBE_FAMILIES) if (this.env.isInstalled(p)) add(p);
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }
  /**
   * Pede a Local Font Access (Chromium): CHAMAR NUM GESTO DO USUÁRIO (abrir o
   * seletor de fonte, exportar). Concedida, refaz as famílias que ficaram sem
   * bytes (instaladas/substitutas/padrão) para usar a fonte real.
   */
  async requestLocalAccess() {
    if (this.host || !this.env.localAccess) return false;
    if (this.localFonts) return true;
    try {
      this.localFonts = await this.env.localAccess.query();
    } catch {
      return false;
    }
    this.invalidate((r) => r.source === "installed" || r.source === "substitute" || r.source === "default");
    return true;
  }
  // ───────────────────────── internos ─────────────────────────
  emit(families) {
    if (!families.length) return;
    for (const cb of this.listeners) {
      try {
        cb(families);
      } catch {
      }
    }
  }
  /** Substituta (ou padrão) COM arquivo para uma família só-pelo-nome; uma vez. */
  fileFallback(r) {
    const key = r.family.toLowerCase();
    const done = this.fileFallbacks.get(key);
    if (done) return Promise.resolve(done);
    let p = this.pendingFile.get(key);
    if (!p) {
      p = (async () => {
        const sub = METRIC_SUBSTITUTES[key];
        const subFaces = sub ? await this.loadBundled(sub) : {};
        const out = Object.keys(subFaces).length ? { family: r.family, cssFamily: sub, source: "substitute", faces: subFaces, embeddable: true } : { family: r.family, cssFamily: DEFAULT_FAMILY, source: "default", faces: await this.loadBundled(DEFAULT_FAMILY), embeddable: true };
        this.fileFallbacks.set(key, out);
        this.pendingFile.delete(key);
        this.emit([r.family]);
        return out;
      })();
      this.pendingFile.set(key, p);
    }
    return p;
  }
  /** Esquece resoluções (para refazer com uma fonte melhor) e avisa. */
  invalidate(which) {
    this.fileFallbacks.clear();
    const again = [];
    for (const [k, r] of this.resolved) if (which(r)) {
      this.resolved.delete(k);
      again.push(r.family);
    }
    if (again.length) void this.resolve(again);
  }
  async localAccessFonts() {
    if (this.localFonts) return true;
    const la = this.env.localAccess;
    if (!la || !await la.granted()) return false;
    try {
      this.localFonts = await la.query();
      return true;
    } catch {
      return false;
    }
  }
  async resolveBatch(families) {
    let hostFaces = [];
    if (this.host) {
      try {
        hostFaces = await this.host.resolve(families);
      } catch {
        hostFaces = [];
      }
    }
    const byFamily = /* @__PURE__ */ new Map();
    for (const f of hostFaces) {
      const k = f.family.toLowerCase();
      byFamily.set(k, [...byFamily.get(k) ?? [], f]);
    }
    const hasLocal = !this.host && await this.localAccessFonts();
    const out = [];
    for (const family of families) {
      out.push(await this.resolveOne(family, byFamily.get(family.toLowerCase()) ?? [], hasLocal));
    }
    return out;
  }
  async resolveOne(family, hostFaces, hasLocal) {
    const key = family.toLowerCase();
    const result = (source, cssFamily, faces = {}, embeddable = true) => ({ family, cssFamily, source, faces, embeddable });
    if (hostFaces.length) {
      const faces = {};
      let embeddable = true;
      for (const f of hostFaces) {
        const v = variantOf(f.bold ?? Number(f.weight) >= 600, f.style === "italic");
        if (faces[v]) continue;
        const bytes = new Uint8Array(f.bytes);
        if (await this.env.addFace(family, v, bytes)) {
          faces[v] = bytes;
          if (f.embeddable === false) embeddable = false;
        }
      }
      if (Object.keys(faces).length) {
        this.own.add(key);
        return result("host", family, faces, embeddable);
      }
    }
    if (hasLocal && this.localFonts) {
      const faces = {};
      let embeddable = true;
      const byFull = /* @__PURE__ */ new Map([
        [key, "regular"],
        [`${key} regular`, "regular"],
        [`${key} bold`, "bold"],
        [`${key} italic`, "italic"],
        [`${key} bold italic`, "boldItalic"]
      ]);
      for (const fd of this.localFonts) {
        const v = fd.family.toLowerCase() === key ? variantOfStyle(fd.style) : byFull.get((fd.fullName ?? "").toLowerCase());
        if (!v) continue;
        if (faces[v]) continue;
        try {
          const bytes = standaloneFace(new Uint8Array(await (await fd.blob()).arrayBuffer()), fd.postscriptName);
          if (await this.env.addFace(family, v, bytes)) {
            faces[v] = bytes;
            if (!isEmbeddable(bytes)) embeddable = false;
          }
        } catch {
        }
      }
      if (Object.keys(faces).length) {
        this.own.add(key);
        return result("local-access", family, faces, embeddable);
      }
    }
    if (BUNDLED[key]) {
      const faces = await this.loadBundled(family);
      if (Object.keys(faces).length) return result("bundled", BUNDLED[key].family, faces);
    }
    const page = this.env.pageFamilies(this.own).get(key);
    if (page) {
      await this.env.loadPageFamily(page);
      return result("page", page);
    }
    if (this.env.isInstalled(family)) return result("installed", family);
    if (await this.env.loadLocal(family, "regular")) {
      this.own.add(key);
      await Promise.all(VARIANTS.slice(1).map((v) => this.env.loadLocal(family, v)));
      return result("installed", family);
    }
    const sub = METRIC_SUBSTITUTES[key];
    if (sub) {
      const faces = await this.loadBundled(sub);
      if (Object.keys(faces).length) return result("substitute", sub, faces);
    }
    return result("default", DEFAULT_FAMILY, await this.loadBundled(DEFAULT_FAMILY));
  }
  /**
   * Família embarcada da `baseUrl`, uma vez: baixa SÓ a regular. As outras
   * variantes vêm quando alguém as usa — quem desenha avisa pelo cssStack
   * (variante), quem mede/embute pede loadFace — e chegam UMA vez, para todos.
   * O objeto `Faces` é compartilhado: variantes que chegarem depois aparecem
   * em toda resolução que usa o arquivo.
   */
  loadBundled(family) {
    const b = BUNDLED[family.toLowerCase()];
    if (!b || !this.baseUrl) return Promise.resolve({});
    let p = this.bundledLoads.get(b.file);
    if (!p) {
      const base = this.baseUrl;
      p = (async () => {
        const faces = {};
        const bytes = await this.env.fetchBytes(`${base}/${bundledFileName(b.file, "regular")}`);
        if (!bytes || !await this.env.addFace(b.family, "regular", bytes)) {
          this.bundledLoads.delete(b.file);
          return faces;
        }
        faces.regular = bytes;
        this.own.add(b.family.toLowerCase());
        return faces;
      })();
      this.bundledLoads.set(b.file, p);
    }
    return p;
  }
  /** Baixa (uma vez) os bytes de uma variante de família embarcada e avisa. */
  loadBundledFace(b, faces, v) {
    if (faces[v]) return Promise.resolve(faces[v]);
    if (!this.baseUrl || !faces.regular) return Promise.resolve(void 0);
    const key = `${b.file}|${v}`;
    let p = this.faceLoads.get(key);
    if (!p) {
      const url = `${this.baseUrl}/${bundledFileName(b.file, v)}`;
      p = (async () => {
        const bytes = await this.env.fetchBytes(url);
        if (!bytes) return void 0;
        faces[v] = bytes;
        await this.env.addFace(b.family, v, bytes);
        const fams = [...this.resolved.values(), ...this.fileFallbacks.values()].filter((r) => r.faces === faces).map((r) => r.family);
        this.emit([...new Set(fams)]);
        return bytes;
      })();
      this.faceLoads.set(key, p);
    }
    return p;
  }
};

// ../../../shared/fonts/src/subset.ts
var KEEP = /* @__PURE__ */ new Set(["head", "hhea", "maxp", "hmtx", "cmap", "loca", "glyf", "OS/2", "post", "cvt ", "fpgm", "prep", "gasp", "name"]);
var KEEP_FOR_DOCUMENT = /* @__PURE__ */ new Set([...KEEP, "GPOS", "GSUB", "GDEF", "kern", "vhea", "vmtx"]);
function subsetTrueType(bytes, usedGids, opts = {}) {
  try {
    return doSubset(bytes, usedGids, opts.keepLayout ? KEEP_FOR_DOCUMENT : KEEP);
  } catch {
    return bytes;
  }
}
function doSubset(bytes, usedGids, KEEP2) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = v.getUint32(0);
  const numTables = v.getUint16(4);
  const dir = /* @__PURE__ */ new Map();
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    const tag2 = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
    dir.set(tag2, { tag: tag2, offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
  }
  const head = dir.get("head"), maxp = dir.get("maxp"), loca = dir.get("loca"), glyf = dir.get("glyf");
  if (!head || !maxp || !loca || !glyf) return bytes;
  const numGlyphs = v.getUint16(maxp.offset + 4);
  const longLoca = v.getUint16(head.offset + 50) === 1;
  const readLoca = (i) => longLoca ? v.getUint32(loca.offset + i * 4) : v.getUint16(loca.offset + i * 2) * 2;
  const glyphOff = [];
  for (let i = 0; i <= numGlyphs; i++) glyphOff.push(readLoca(i));
  const keep = /* @__PURE__ */ new Set([0]);
  for (const g of usedGids) if (g >= 0 && g < numGlyphs) keep.add(g);
  const work = [...keep];
  while (work.length) {
    const g = work.pop();
    const s = glyf.offset + glyphOff[g], e = glyf.offset + glyphOff[g + 1];
    if (e <= s) continue;
    if (v.getInt16(s) >= 0) continue;
    let p = s + 10;
    for (; ; ) {
      const flags = v.getUint16(p);
      const comp = v.getUint16(p + 2);
      p += 4;
      if (!keep.has(comp)) {
        keep.add(comp);
        work.push(comp);
      }
      p += flags & 1 ? 4 : 2;
      if (flags & 8) p += 2;
      else if (flags & 64) p += 4;
      else if (flags & 128) p += 8;
      if (!(flags & 32)) break;
    }
  }
  const glyfParts = [];
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const locaView = new DataView(newLoca.buffer);
  let acc = 0;
  for (let g = 0; g < numGlyphs; g++) {
    locaView.setUint32(g * 4, acc);
    if (keep.has(g)) {
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
  for (const [tag2, t] of dir) {
    if (!KEEP2.has(tag2)) continue;
    if (tag2 === "glyf") out.push({ tag: tag2, data: newGlyf });
    else if (tag2 === "loca") out.push({ tag: tag2, data: newLoca });
    else if (tag2 === "head") out.push({ tag: tag2, data: newHead });
    else out.push({ tag: tag2, data: bytes.slice(t.offset, t.offset + t.length) });
  }
  return buildSfnt(sfntVersion, out);
}
function concat(parts) {
  let n = 0;
  for (const p of parts) n += p.length;
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
  for (let i = off; i < end; i += 4) sum = sum + dv.getUint32(i) >>> 0;
  return sum >>> 0;
}
function buildSfnt(sfntVersion, tables) {
  tables.sort((a, b) => a.tag < b.tag ? -1 : 1);
  const num = tables.length;
  const headerSize = 12 + num * 16;
  let offset = headerSize;
  const layout = tables.map((t) => {
    const o = offset;
    offset += t.data.length + 3 & ~3;
    return { ...t, offset: o };
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
  for (const t of layout) {
    out.set(t.data, t.offset);
    for (let i = 0; i < 4; i++) out[p + i] = t.tag.charCodeAt(i) || 32;
    dv.setUint32(p + 4, checksum(out, t.offset, t.data.length));
    dv.setUint32(p + 8, t.offset);
    dv.setUint32(p + 12, t.data.length);
    p += 16;
  }
  const headEntry = layout.find((t) => t.tag === "head");
  if (headEntry) {
    const fileCs = checksum(out, 0, out.length);
    dv.setUint32(headEntry.offset + 8, 2981146554 - fileCs >>> 0);
  }
  return out;
}

// ../../../shared/fonts/src/embedding.ts
var DEFAULT_EMBEDDING = {
  write: { embed: false, subset: false, skipCommonFonts: true },
  slides: { embed: false, subset: true, skipCommonFonts: true }
};
var COMMON_FONTS = {
  write: ["Arial", "Times New Roman", "Courier New"],
  slides: ["Arial", "Times New Roman", "Courier New", "Calibri", "Aptos"]
};
async function planFontEmbedding(resolver, usage, settings, app, opts = {}) {
  const plan = { faces: [], skipped: [] };
  if (!settings.embed) return plan;
  const byFamily = /* @__PURE__ */ new Map();
  for (const u of usage) {
    if (!u.family) continue;
    const key = u.family.toLowerCase();
    const e = byFamily.get(key) ?? { family: u.family, variants: /* @__PURE__ */ new Set(), chars: /* @__PURE__ */ new Set() };
    for (const v of u.variants) e.variants.add(v);
    for (const ch of u.text) e.chars.add(ch.codePointAt(0));
    byFamily.set(key, e);
  }
  const common = new Set(COMMON_FONTS[app].map((f) => f.toLowerCase()));
  const skipCommon = app === "slides" || settings.skipCommonFonts;
  const resolved = new Map((await resolver.resolve([...byFamily.values()].map((e) => e.family))).map((r) => [r.family.toLowerCase(), r]));
  for (const [key, use] of byFamily) {
    if (opts.alreadyEmbedded?.has(key)) {
      plan.skipped.push({ family: use.family, reason: "already-embedded" });
      continue;
    }
    if (skipCommon && common.has(key)) {
      plan.skipped.push({ family: use.family, reason: "common" });
      continue;
    }
    const r = resolved.get(key);
    const ownFile = r && (r.source === "host" || r.source === "local-access" || r.source === "bundled");
    const wanted = app === "slides" ? VARIANTS : VARIANTS.filter((v) => use.variants.has(v));
    let found = 0, blocked = 0;
    for (const v of wanted) {
      const bytes = opts.documentFace?.(use.family, v) ?? (ownFile ? r.faces[v] ?? await resolver.loadFace(r, v) : void 0);
      if (!bytes) continue;
      found++;
      if (!isEmbeddable(bytes)) {
        blocked++;
        continue;
      }
      const subset = settings.subset && hasTrueTypeOutlines(bytes);
      const data = subset ? subsetTrueType(bytes, glyphIdsFor(bytes, use.chars), { keepLayout: true }) : bytes;
      plan.faces.push({ family: use.family, variant: v, bytes: data, subsetted: subset, info: faceInfo(bytes) });
    }
    if (!found) plan.skipped.push({ family: use.family, reason: "unavailable" });
    else if (found === blocked) plan.skipped.push({ family: use.family, reason: "license" });
  }
  return plan;
}

// ../../../shared/fonts/src/ooxml.ts
var REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
var REL_FONT = `${REL}/font`;
var W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
var CT_ODTTF = "application/vnd.openxmlformats-officedocument.obfuscatedFont";
var VARIANT_ORDER = ["regular", "bold", "italic", "boldItalic"];
var W_EMBED = {
  regular: "w:embedRegular",
  bold: "w:embedBold",
  italic: "w:embedItalic",
  boldItalic: "w:embedBoldItalic"
};
var escAttr = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var unescAttr = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
var escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function relsPathOf(part) {
  const i = part.lastIndexOf("/");
  return `${part.slice(0, i + 1)}_rels/${part.slice(i + 1)}.rels`;
}
function resolveTarget(fromPart, target) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = fromPart.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}
function readRels(pkg, part) {
  const xml = pkg.getPartText(relsPathOf(part));
  if (!xml) return [];
  const out = [];
  for (const m of xml.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const a = (n) => new RegExp(`\\b${n}="([^"]*)"`).exec(m[0])?.[1] ?? "";
    out.push({ id: a("Id"), type: a("Type"), target: unescAttr(a("Target")), external: a("TargetMode") === "External", xml: m[0] });
  }
  return out;
}
function addRel(pkg, part, type, target) {
  const path = relsPathOf(part);
  let xml = pkg.getPartText(path) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const used = new Set(readRels(pkg, part).map((r) => r.id));
  let n = used.size + 1;
  while (used.has(`rId${n}`)) n++;
  const id = `rId${n}`;
  xml = xml.replace(/<Relationships\b([^>]*?)\s*\/>/, "<Relationships$1></Relationships>");
  xml = xml.replace(/<\/Relationships>\s*$/, `<Relationship Id="${id}" Type="${type}" Target="${escAttr(target)}"/></Relationships>`);
  pkg.setPartText(path, xml);
  return id;
}
function removeRelsOfType(pkg, part, type) {
  const path = relsPathOf(part);
  const xml = pkg.getPartText(path);
  const ids = /* @__PURE__ */ new Set();
  if (!xml) return ids;
  let out = xml;
  for (const r of readRels(pkg, part)) {
    if (r.type !== type) continue;
    ids.add(r.id);
    out = out.replace(r.xml, "");
    if (!r.external) pkg.removePart(resolveTarget(part, r.target));
  }
  if (ids.size) pkg.setPartText(path, out);
  return ids;
}
function relTargetOfType(pkg, part, type) {
  const r = readRels(pkg, part).find((x) => x.type === type && !x.external);
  return r ? resolveTarget(part, r.target) : void 0;
}
function ensureDefaultContentType(pkg, ext, ct) {
  const xml = pkg.getPartText("[Content_Types].xml");
  if (!xml || new RegExp(`<Default\\b[^>]*Extension="${escRe(ext)}"`, "i").test(xml)) return;
  pkg.setPartText("[Content_Types].xml", xml.replace(/(<Types\b[^>]*>)/, `$1<Default Extension="${ext}" ContentType="${ct}"/>`));
}
function ensureOverride(pkg, part, ct) {
  const xml = pkg.getPartText("[Content_Types].xml");
  if (!xml || xml.includes(`PartName="/${part}"`)) return;
  pkg.setPartText("[Content_Types].xml", xml.replace(/<\/Types>\s*$/, `<Override PartName="/${part}" ContentType="${ct}"/></Types>`));
}
function uniquePartName(pkg, dir, ext) {
  const names = new Set(pkg.partNames().map((n2) => n2.toLowerCase()));
  let n = 1;
  while (names.has(`${dir}font${n}.${ext}`.toLowerCase())) n++;
  return `${dir}font${n}.${ext}`;
}
function elementEnd(xml, start, qname) {
  const gt = xml.indexOf(">", start);
  if (gt < 0) return -1;
  if (xml[gt - 1] === "/") return gt + 1;
  const close = xml.indexOf(`</${qname}>`, gt);
  return close < 0 ? -1 : close + qname.length + 3;
}
function findElement(xml, qname) {
  const m = new RegExp(`<${escRe(qname)}(?=[\\s/>])`).exec(xml);
  if (!m) return null;
  const end = elementEnd(xml, m.index, qname);
  return end < 0 ? null : { start: m.index, end };
}
function randomGuid() {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = b[6] & 15 | 64;
  b[8] = b[8] & 63 | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `{${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}}`;
}
function obfuscateOdttf(data, fontKey) {
  const hex = fontKey.replace(/[{}-]/g, "");
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i++) key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  key.reverse();
  const out = data.slice();
  for (let i = 0; i < Math.min(32, out.length); i++) out[i] = out[i] ^ key[i % 16];
  return out;
}
function groupByFamily(faces) {
  const m = /* @__PURE__ */ new Map();
  for (const f of faces) m.set(f.family, [...m.get(f.family) ?? [], f]);
  for (const list of m.values()) list.sort((a, b) => VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant));
  return m;
}
var DOCX_MAIN = "word/document.xml";
var SETTINGS_BEFORE = [
  "writeProtection",
  "view",
  "zoom",
  "removePersonalInformation",
  "removeDateAndTime",
  "doNotDisplayPageBoundaries",
  "displayBackgroundShape",
  "printPostScriptOverText",
  "printFractionalCharacterWidth",
  "printFormsData"
];
function docxPart(pkg, type, fallback) {
  return relTargetOfType(pkg, DOCX_MAIN, `${REL}/${type}`) ?? fallback;
}
function readDocxEmbedding(pkg) {
  const settings = pkg.getPartText(docxPart(pkg, "settings", "word/settings.xml")) ?? "";
  const on = (name) => new RegExp(`<w:${name}(?![^>]*w:val="(?:false|0|off)")[\\s/>]`).test(settings);
  const embedded = /* @__PURE__ */ new Set();
  const table = pkg.getPartText(docxPart(pkg, "fontTable", "word/fontTable.xml")) ?? "";
  for (const m of table.matchAll(/<w:font\b[^>]*w:name="([^"]*)"[^>]*>([\s\S]*?)<\/w:font>/g)) {
    if (/<w:embed(?:Regular|Bold|Italic|BoldItalic)\b/.test(m[2])) embedded.add(unescAttr(m[1]).toLowerCase());
  }
  if (!on("embedTrueTypeFonts")) return { settings: { embed: false }, embedded };
  return {
    settings: { embed: true, subset: on("saveSubsetFonts"), skipCommonFonts: !on("embedSystemFonts") },
    embedded
  };
}
function writeDocxSettings(pkg, settings) {
  let path = docxPart(pkg, "settings", "");
  let xml = path ? pkg.getPartText(path) : void 0;
  if (!xml) {
    if (!settings.embed) return;
    path = "word/settings.xml";
    xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W_NS}"></w:settings>`;
    addRel(pkg, DOCX_MAIN, `${REL}/settings`, "settings.xml");
    ensureOverride(pkg, path, "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml");
  }
  for (const name of ["w:embedTrueTypeFonts", "w:embedSystemFonts", "w:saveSubsetFonts"]) {
    for (let el = findElement(xml, name); el; el = findElement(xml, name)) xml = xml.slice(0, el.start) + xml.slice(el.end);
  }
  if (settings.embed) {
    const flags = "<w:embedTrueTypeFonts/>" + (settings.skipCommonFonts ? "" : "<w:embedSystemFonts/>") + (settings.subset ? "<w:saveSubsetFonts/>" : "");
    let at = -1;
    for (const n of SETTINGS_BEFORE) {
      const el = findElement(xml, `w:${n}`);
      if (el) at = Math.max(at, el.end);
    }
    if (at < 0) {
      const root = /<w:settings\b[^>]*>/.exec(xml);
      if (root[0].endsWith("/>")) xml = xml.replace(root[0], `${root[0].slice(0, -2)}></w:settings>`);
      at = /<w:settings\b[^>]*>/.exec(xml).index + /<w:settings\b[^>]*>/.exec(xml)[0].length;
    }
    xml = xml.slice(0, at) + flags + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}
function writeDocxEmbedding(pkg, plan, settings) {
  writeDocxSettings(pkg, settings);
  let tablePath = docxPart(pkg, "fontTable", "");
  let table = tablePath ? pkg.getPartText(tablePath) : void 0;
  if (!settings.embed) {
    if (!tablePath || !table) return;
    removeRelsOfType(pkg, tablePath, REL_FONT);
    pkg.setPartText(tablePath, table.replace(/<w:embed(?:Regular|Bold|Italic|BoldItalic)\b[^>]*\/>/g, ""));
    return;
  }
  if (!plan.faces.length) return;
  if (!table) {
    tablePath = "word/fontTable.xml";
    table = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="${W_NS}" xmlns:r="${REL}"></w:fonts>`;
    addRel(pkg, DOCX_MAIN, `${REL}/fontTable`, "fontTable.xml");
    ensureOverride(pkg, tablePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml");
  }
  if (!/<w:fonts\b[^>]*xmlns:r=/.test(table)) table = table.replace(/<w:fonts\b/, `<w:fonts xmlns:r="${REL}"`);
  if (/<w:fonts\b[^>]*\/>/.test(table)) table = table.replace(/(<w:fonts\b[^>]*)\/>/, "$1></w:fonts>");
  ensureDefaultContentType(pkg, "odttf", CT_ODTTF);
  const dir = tablePath.slice(0, tablePath.lastIndexOf("/") + 1) + "fonts/";
  for (const [family, faces] of groupByFamily(plan.faces)) {
    let embeds = "";
    for (const f of faces) {
      const key = randomGuid();
      const part = uniquePartName(pkg, dir, "odttf");
      pkg.setPart(part, obfuscateOdttf(f.bytes, key));
      const id = addRel(pkg, tablePath, REL_FONT, part.slice(tablePath.lastIndexOf("/") + 1));
      embeds += `<${W_EMBED[f.variant]} r:id="${id}"${f.subsetted ? ' w:subsetted="1"' : ""} w:fontKey="${key}"/>`;
    }
    const re = new RegExp(`<w:font\\b[^>]*w:name="${escRe(escAttr(family))}"[^>]*?(\\/>|>[\\s\\S]*?<\\/w:font>)`, "i");
    const m = re.exec(table);
    if (m) {
      const el = m[0];
      const merged = el.endsWith("/>") ? `${el.slice(0, -2)}>${embeds}</w:font>` : el.replace(/<\/w:font>$/, `${embeds}</w:font>`);
      table = table.replace(el, merged);
    } else {
      const panose = faces[0].info.panose;
      table = table.replace(
        /<\/w:fonts>\s*$/,
        `<w:font w:name="${escAttr(family)}"><w:panose1 w:val="${panose}"/><w:charset w:val="00"/><w:family w:val="auto"/><w:pitch w:val="variable"/>${embeds}</w:font></w:fonts>`
      );
    }
  }
  pkg.setPartText(tablePath, table);
}

// ../../../shared/ui/src/toolbar/commands.ts
var CommandRegistry = class {
  constructor(lang) {
    this.lang = lang;
  }
  lang;
  cmds = /* @__PURE__ */ new Map();
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
    const t = this.text(c2.tip ?? c2.label);
    return c2.shortcut ? `${t} (${c2.shortcut})` : t;
  }
  supported(id) {
    const c2 = this.cmds.get(id);
    if (!c2) return false;
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
      else it = e.hidden ? null : e;
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

// ../../../shared/ui/src/toolbar/symbols.ts
var SYMBOLS = {
  "add": "M440-440H240Q223-440 211.5-451.5Q200-463 200-480Q200-497 211.5-508.5Q223-520 240-520H440V-720Q440-737 451.5-748.5Q463-760 480-760Q497-760 508.5-748.5Q520-737 520-720V-520H720Q737-520 748.5-508.5Q760-497 760-480Q760-463 748.5-451.5Q737-440 720-440H520V-240Q520-223 508.5-211.5Q497-200 480-200Q463-200 451.5-211.5Q440-223 440-240Z",
  "add_box": "M440-440V-320Q440-303 451.5-291.5Q463-280 480-280Q497-280 508.5-291.5Q520-303 520-320V-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H520V-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640V-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "add_column_left": "M560-200H800Q800-200 800-200Q800-200 800-200V-760Q800-760 800-760Q800-760 800-760H560ZM240-120Q207-120 183.5-143.5Q160-167 160-200V-240Q160-257 171.5-268.5Q183-280 200-280Q217-280 228.5-268.5Q240-257 240-240V-200Q240-200 240-200Q240-200 240-200H480V-760H240Q240-760 240-760Q240-760 240-760V-720Q240-703 228.5-691.5Q217-680 200-680Q183-680 171.5-691.5Q160-703 160-720V-760Q160-793 183.5-816.5Q207-840 240-840H800Q833-840 856.5-816.5Q880-793 880-760V-200Q880-167 856.5-143.5Q833-120 800-120ZM160-400V-440H120Q103-440 91.5-451.5Q80-463 80-480Q80-497 91.5-508.5Q103-520 120-520H160V-560Q160-577 171.5-588.5Q183-600 200-600Q217-600 228.5-588.5Q240-577 240-560V-520H280Q297-520 308.5-508.5Q320-497 320-480Q320-463 308.5-451.5Q297-440 280-440H240V-400Q240-383 228.5-371.5Q217-360 200-360Q183-360 171.5-371.5Q160-383 160-400ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM560-480H480ZM560-480Z",
  "add_column_right": "M400-760H160Q160-760 160-760Q160-760 160-760V-200Q160-200 160-200Q160-200 160-200H400ZM160-120Q127-120 103.5-143.5Q80-167 80-200V-760Q80-793 103.5-816.5Q127-840 160-840H720Q753-840 776.5-816.5Q800-793 800-760V-720Q800-703 788.5-691.5Q777-680 760-680Q743-680 731.5-691.5Q720-703 720-720V-760Q720-760 720-760Q720-760 720-760H480V-200H720Q720-200 720-200Q720-200 720-200V-240Q720-257 731.5-268.5Q743-280 760-280Q777-280 788.5-268.5Q800-257 800-240V-200Q800-167 776.5-143.5Q753-120 720-120ZM720-400V-440H680Q663-440 651.5-451.5Q640-463 640-480Q640-497 651.5-508.5Q663-520 680-520H720V-560Q720-577 731.5-588.5Q743-600 760-600Q777-600 788.5-588.5Q800-577 800-560V-520H840Q857-520 868.5-508.5Q880-497 880-480Q880-463 868.5-451.5Q857-440 840-440H800V-400Q800-383 788.5-371.5Q777-360 760-360Q743-360 731.5-371.5Q720-383 720-400ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM400-480H480ZM400-480Z",
  "add_comment": "M440-520V-440Q440-423 451.5-411.5Q463-400 480-400Q497-400 508.5-411.5Q520-423 520-440V-520H600Q617-520 628.5-531.5Q640-543 640-560Q640-577 628.5-588.5Q617-600 600-600H520V-680Q520-697 508.5-708.5Q497-720 480-720Q463-720 451.5-708.5Q440-697 440-680V-600H360Q343-600 331.5-588.5Q320-577 320-560Q320-543 331.5-531.5Q343-520 360-520ZM240-240 148-148Q129-129 104.5-139.5Q80-150 80-177V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM206-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-275ZM160-320V-800Q160-800 160-800Q160-800 160-800Q160-800 160-800Q160-800 160-800V-320Q160-320 160-320Q160-320 160-320Z",
  "add_row_above": "M200-400V-160Q200-160 200-160Q200-160 200-160H760Q760-160 760-160Q760-160 760-160V-400ZM200-80Q167-80 143.5-103.5Q120-127 120-160V-720Q120-753 143.5-776.5Q167-800 200-800H240Q257-800 268.5-788.5Q280-777 280-760Q280-743 268.5-731.5Q257-720 240-720H200Q200-720 200-720Q200-720 200-720V-480H760V-720Q760-720 760-720Q760-720 760-720H720Q703-720 691.5-731.5Q680-743 680-760Q680-777 691.5-788.5Q703-800 720-800H760Q793-800 816.5-776.5Q840-753 840-720V-160Q840-127 816.5-103.5Q793-80 760-80ZM440-720H400Q383-720 371.5-731.5Q360-743 360-760Q360-777 371.5-788.5Q383-800 400-800H440V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-800H560Q577-800 588.5-788.5Q600-777 600-760Q600-743 588.5-731.5Q577-720 560-720H520V-680Q520-663 508.5-651.5Q497-640 480-640Q463-640 451.5-651.5Q440-663 440-680ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM480-400V-480ZM480-400Z",
  "add_row_below": "M760-560V-800Q760-800 760-800Q760-800 760-800H200Q200-800 200-800Q200-800 200-800V-560ZM200-160Q167-160 143.5-183.5Q120-207 120-240V-800Q120-833 143.5-856.5Q167-880 200-880H760Q793-880 816.5-856.5Q840-833 840-800V-240Q840-207 816.5-183.5Q793-160 760-160H720Q703-160 691.5-171.5Q680-183 680-200Q680-217 691.5-228.5Q703-240 720-240H760Q760-240 760-240Q760-240 760-240V-480H200V-240Q200-240 200-240Q200-240 200-240H240Q257-240 268.5-228.5Q280-217 280-200Q280-183 268.5-171.5Q257-160 240-160ZM440-120V-160H400Q383-160 371.5-171.5Q360-183 360-200Q360-217 371.5-228.5Q383-240 400-240H440V-280Q440-297 451.5-308.5Q463-320 480-320Q497-320 508.5-308.5Q520-297 520-280V-240H560Q577-240 588.5-228.5Q600-217 600-200Q600-183 588.5-171.5Q577-160 560-160H520V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM480-560V-480ZM480-560Z",
  "arrow_drop_down": "M459-381 314-526Q311-529 309.5-532.5Q308-536 308-540Q308-548 313.5-554Q319-560 328-560H632Q641-560 646.5-554Q652-548 652-540Q652-538 646-526L501-381Q496-376 491-374Q486-372 480-372Q474-372 469-374Q464-376 459-381Z",
  "article": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760ZM320-280H520Q537-280 548.5-291.5Q560-303 560-320Q560-337 548.5-348.5Q537-360 520-360H320Q303-360 291.5-348.5Q280-337 280-320Q280-303 291.5-291.5Q303-280 320-280ZM320-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM320-600H640Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680H320Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600Z",
  "aspect_ratio": "M680-360H600Q583-360 571.5-348.5Q560-337 560-320Q560-303 571.5-291.5Q583-280 600-280H720Q737-280 748.5-291.5Q760-303 760-320V-440Q760-457 748.5-468.5Q737-480 720-480Q703-480 691.5-468.5Q680-457 680-440ZM280-600H360Q377-600 388.5-611.5Q400-623 400-640Q400-657 388.5-668.5Q377-680 360-680H240Q223-680 211.5-668.5Q200-657 200-640V-520Q200-503 211.5-491.5Q223-480 240-480Q257-480 268.5-491.5Q280-503 280-520ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "autorenew": "M240-478Q240-462 242-446.5Q244-431 249-416Q254-399 248-383.5Q242-368 227-361Q211-353 195.5-359.5Q180-366 175-383Q167-406 163.5-430Q160-454 160-478Q160-612 253-706Q346-800 480-800H487L451-836Q440-847 440-864Q440-881 451-892Q462-903 479-903Q496-903 507-892L611-788Q623-776 623-760Q623-744 611-732L507-628Q496-617 479-617Q462-617 451-628Q440-639 440-656Q440-673 451-684L487-720H480Q380-720 310-649.5Q240-579 240-478ZM720-482Q720-498 718-513.5Q716-529 711-544Q706-561 712-576.5Q718-592 733-599Q749-607 764.5-600.5Q780-594 785-577Q793-554 796.5-530Q800-506 800-482Q800-348 707-254Q614-160 480-160H473L509-124Q520-113 520-96Q520-79 509-68Q498-57 481-57Q464-57 453-68L349-172Q337-184 337-200Q337-216 349-228L453-332Q464-343 481-343Q498-343 509-332Q520-321 520-304Q520-287 509-276L473-240H480Q580-240 650-310.5Q720-381 720-482Z",
  "bedtime": "M484-80Q400-80 326.5-112Q253-144 198.5-198.5Q144-253 112-326.5Q80-400 80-484Q80-612 152-716Q224-820 345-862Q367-870 386-856.5Q405-843 404-820Q401-735 431-658Q461-581 521-521Q581-461 658-431Q735-401 820-404Q846-405 858.5-386.5Q871-368 863-345Q819-225 715.5-152.5Q612-80 484-80ZM484-160Q572-160 647-204Q722-248 765-325Q679-333 602-368.5Q525-404 464-465Q403-526 367-603Q331-680 324-766Q247-723 203.5-647.5Q160-572 160-484Q160-349 254.5-254.5Q349-160 484-160ZM464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Q464-465 464-465Z",
  "bookmark": "M480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H680Q713-840 736.5-816.5Q760-793 760-760V-241Q760-198 724-174.5Q688-151 648-168ZM480-328 680-242Q680-242 680-242Q680-242 680-242V-760Q680-760 680-760Q680-760 680-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H680Q680-760 680-760Q680-760 680-760Q680-760 680-760Q680-760 680-760Z",
  "bookmark_add": "M480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H480Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242L480-328L680-242Q680-242 680-242Q680-242 680-242V-480Q680-497 691.5-508.5Q703-520 720-520Q737-520 748.5-508.5Q760-497 760-480V-241Q760-198 724-174.5Q688-151 648-168ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H520Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760ZM680-680H640Q623-680 611.5-691.5Q600-703 600-720Q600-737 611.5-748.5Q623-760 640-760H680V-800Q680-817 691.5-828.5Q703-840 720-840Q737-840 748.5-828.5Q760-817 760-800V-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680H760V-640Q760-623 748.5-611.5Q737-600 720-600Q703-600 691.5-611.5Q680-623 680-640Z",
  "bookmark_remove": "M640-680Q623-680 611.5-691.5Q600-703 600-720Q600-737 611.5-748.5Q623-760 640-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680ZM480-240 312-168Q272-151 236-174.5Q200-198 200-241V-760Q200-793 223.5-816.5Q247-840 280-840H480Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760H280Q280-760 280-760Q280-760 280-760V-242Q280-242 280-242Q280-242 280-242L480-328L680-242Q680-242 680-242Q680-242 680-242V-480Q680-497 691.5-508.5Q703-520 720-520Q737-520 748.5-508.5Q760-497 760-480V-241Q760-198 724-174.5Q688-151 648-168ZM480-760H280Q280-760 280-760Q280-760 280-760Q280-760 280-760Q280-760 280-760H520Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Q520-760 520-760Z",
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
  "comment": "M280-400H680Q697-400 708.5-411.5Q720-423 720-440Q720-457 708.5-468.5Q697-480 680-480H280Q263-480 251.5-468.5Q240-457 240-440Q240-423 251.5-411.5Q263-400 280-400ZM280-520H680Q697-520 708.5-531.5Q720-543 720-560Q720-577 708.5-588.5Q697-600 680-600H280Q263-600 251.5-588.5Q240-577 240-560Q240-543 251.5-531.5Q263-520 280-520ZM280-640H680Q697-640 708.5-651.5Q720-663 720-680Q720-697 708.5-708.5Q697-720 680-720H280Q263-720 251.5-708.5Q240-697 240-680Q240-663 251.5-651.5Q263-640 280-640ZM160-240Q127-240 103.5-263.5Q80-287 80-320V-800Q80-833 103.5-856.5Q127-880 160-880H800Q833-880 856.5-856.5Q880-833 880-800V-177Q880-150 855.5-139.5Q831-129 812-148L720-240ZM754-320 800-275V-800Q800-800 800-800Q800-800 800-800H160Q160-800 160-800Q160-800 160-800V-320Q160-320 160-320Q160-320 160-320ZM160-320Q160-320 160-320Q160-320 160-320V-800Q160-800 160-800Q160-800 160-800Q160-800 160-800Q160-800 160-800V-320Z",
  "compare": "M400-120H200Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H400V-880Q400-897 411.5-908.5Q423-920 440-920Q457-920 468.5-908.5Q480-897 480-880V-80Q480-63 468.5-51.5Q457-40 440-40Q423-40 411.5-51.5Q400-63 400-80ZM200-240H400V-480ZM560-120V-480L760-240V-760Q760-760 760-760Q760-760 760-760H560V-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120Z",
  "content_copy": "M360-240Q327-240 303.5-263.5Q280-287 280-320V-800Q280-833 303.5-856.5Q327-880 360-880H720Q753-880 776.5-856.5Q800-833 800-800V-320Q800-287 776.5-263.5Q753-240 720-240ZM360-320H720Q720-320 720-320Q720-320 720-320V-800Q720-800 720-800Q720-800 720-800H360Q360-800 360-800Q360-800 360-800V-320Q360-320 360-320Q360-320 360-320ZM200-80Q167-80 143.5-103.5Q120-127 120-160V-680Q120-697 131.5-708.5Q143-720 160-720Q177-720 188.5-708.5Q200-697 200-680V-160Q200-160 200-160Q200-160 200-160H600Q617-160 628.5-148.5Q640-137 640-120Q640-103 628.5-91.5Q617-80 600-80ZM360-320Q360-320 360-320Q360-320 360-320V-800Q360-800 360-800Q360-800 360-800Q360-800 360-800Q360-800 360-800V-320Q360-320 360-320Q360-320 360-320Z",
  "content_cut": "M480-400 386-306Q394-291 397-274Q400-257 400-240Q400-174 353-127Q306-80 240-80Q174-80 127-127Q80-174 80-240Q80-306 127-353Q174-400 240-400Q257-400 274-397Q291-394 306-386L400-480L306-574Q291-566 274-563Q257-560 240-560Q174-560 127-607Q80-654 80-720Q80-786 127-833Q174-880 240-880Q306-880 353-833Q400-786 400-720Q400-703 397-686Q394-669 386-654L824-216Q851-189 836-154.5Q821-120 783-120Q772-120 761.5-124.5Q751-129 743-137ZM600-520 520-600 743-823Q751-831 761.5-835.5Q772-840 783-840Q821-840 835.5-805Q850-770 823-743ZM240-640Q273-640 296.5-663.5Q320-687 320-720Q320-753 296.5-776.5Q273-800 240-800Q207-800 183.5-776.5Q160-753 160-720Q160-687 183.5-663.5Q207-640 240-640ZM480-460Q488-460 494-466Q500-472 500-480Q500-488 494-494Q488-500 480-500Q472-500 466-494Q460-488 460-480Q460-472 466-466Q472-460 480-460ZM240-160Q273-160 296.5-183.5Q320-207 320-240Q320-273 296.5-296.5Q273-320 240-320Q207-320 183.5-296.5Q160-273 160-240Q160-207 183.5-183.5Q207-160 240-160Z",
  "content_paste": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H367Q378-875 410-897.5Q442-920 480-920Q520-920 551.5-897.5Q583-875 594-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H680V-680Q680-663 668.5-651.5Q657-640 640-640H320Q303-640 291.5-651.5Q280-663 280-680V-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM480-760Q497-760 508.5-771.5Q520-783 520-800Q520-817 508.5-828.5Q497-840 480-840Q463-840 451.5-828.5Q440-817 440-800Q440-783 451.5-771.5Q463-760 480-760Z",
  "content_paste_go": "M727-240H520Q503-240 491.5-251.5Q480-263 480-280Q480-297 491.5-308.5Q503-320 520-320H727L691-356Q680-367 680-383.5Q680-400 692-412Q703-423 720-423Q737-423 748-412L852-308Q864-296 864-280Q864-264 852-252L748-148Q736-136 720-136.5Q704-137 692-149Q681-161 680.5-177Q680-193 692-205ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H367Q378-875 410-897.5Q442-920 480-920Q520-920 551.5-897.5Q583-875 594-840H760Q793-840 816.5-816.5Q840-793 840-760V-560Q840-543 828.5-531.5Q817-520 800-520Q783-520 771.5-531.5Q760-543 760-560V-760Q760-760 760-760Q760-760 760-760H680V-680Q680-663 668.5-651.5Q657-640 640-640H320Q303-640 291.5-651.5Q280-663 280-680V-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H360Q377-200 388.5-188.5Q400-177 400-160Q400-143 388.5-131.5Q377-120 360-120ZM480-760Q497-760 508.5-771.5Q520-783 520-800Q520-817 508.5-828.5Q497-840 480-840Q463-840 451.5-828.5Q440-817 440-800Q440-783 451.5-771.5Q463-760 480-760Z",
  "contrast": "M480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM520-163Q639-178 719.5-267.5Q800-357 800-480Q800-603 719.5-692.5Q639-782 520-797Z",
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
  "expand_content": "M280-280H400Q417-280 428.5-268.5Q440-257 440-240Q440-223 428.5-211.5Q417-200 400-200H240Q223-200 211.5-211.5Q200-223 200-240V-400Q200-417 211.5-428.5Q223-440 240-440Q257-440 268.5-428.5Q280-417 280-400ZM680-680H560Q543-680 531.5-691.5Q520-703 520-720Q520-737 531.5-748.5Q543-760 560-760H720Q737-760 748.5-748.5Q760-737 760-720V-560Q760-543 748.5-531.5Q737-520 720-520Q703-520 691.5-531.5Q680-543 680-560Z",
  "expand_more": "M452-373 268-557Q257-568 257-585Q257-602 268-613Q279-624 296-624Q313-624 324-613L480-457L636-613Q647-624 664-624Q681-624 692-613Q703-602 703-585Q703-568 692-557L508-373Q502-367 495-364.5Q488-362 480-362Q472-362 465-364.5Q458-367 452-373Z",
  "filter_none": "M320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z",
  "find_replace": "M440-720Q377-720 326.5-685.5Q276-651 254-595Q248-580 234.5-572.5Q221-565 205-568Q189-571 179.5-583.5Q170-596 175-610Q202-694 274-747Q346-800 440-800Q499-800 550.5-777.5Q602-755 640-716V-760Q640-777 651.5-788.5Q663-800 680-800Q697-800 708.5-788.5Q720-777 720-760V-600Q720-583 708.5-571.5Q697-560 680-560H520Q503-560 491.5-571.5Q480-583 480-600Q480-617 491.5-628.5Q503-640 520-640H600Q571-676 530.5-698Q490-720 440-720ZM440-240Q381-240 329.5-262.5Q278-285 240-324V-280Q240-263 228.5-251.5Q217-240 200-240Q183-240 171.5-251.5Q160-263 160-280V-440Q160-457 171.5-468.5Q183-480 200-480H360Q377-480 388.5-468.5Q400-457 400-440Q400-423 388.5-411.5Q377-400 360-400H280Q309-364 349.5-342Q390-320 440-320Q502-320 551.5-353Q601-386 624-440Q631-456 644.5-465.5Q658-475 675-472Q692-468 700-454Q708-440 703-424Q696-404 686.5-386.5Q677-369 664-352L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L608-296Q572-269 529.5-254.5Q487-240 440-240Z",
  "fit_width": "M120-160V-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800V-160Q200-143 188.5-131.5Q177-120 160-120Q143-120 131.5-131.5Q120-143 120-160ZM760-160V-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800V-160Q840-143 828.5-131.5Q817-120 800-120Q783-120 771.5-131.5Q760-143 760-160ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520Q497-520 508.5-508.5Q520-497 520-480Q520-463 508.5-451.5Q497-440 480-440ZM320-440Q303-440 291.5-451.5Q280-463 280-480Q280-497 291.5-508.5Q303-520 320-520Q337-520 348.5-508.5Q360-497 360-480Q360-463 348.5-451.5Q337-440 320-440ZM640-440Q623-440 611.5-451.5Q600-463 600-480Q600-497 611.5-508.5Q623-520 640-520Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440Z",
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
  "grid_on": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H333V-333H200V-200Q200-200 200-200Q200-200 200-200ZM413-200H547V-333H413ZM627-200H760Q760-200 760-200Q760-200 760-200V-333H627ZM200-413H333V-547H200ZM413-413H547V-547H413ZM627-413H760V-547H627ZM200-627H333V-760H200Q200-760 200-760Q200-760 200-760ZM413-627H547V-760H413ZM627-627H760V-760Q760-760 760-760Q760-760 760-760H627Z",
  "grid_view": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-600Q440-567 416.5-543.5Q393-520 360-520ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H360Q393-440 416.5-416.5Q440-393 440-360V-200Q440-167 416.5-143.5Q393-120 360-120ZM600-520Q567-520 543.5-543.5Q520-567 520-600V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM600-120Q567-120 543.5-143.5Q520-167 520-200V-360Q520-393 543.5-416.5Q567-440 600-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-600H360V-760H200ZM600-600H760V-760H600ZM600-200H760V-360H600ZM200-200H360V-360H200ZM600-600ZM600-360ZM360-360ZM360-600Z",
  "height": "M440-273V-687L404-651Q393-640 376.5-640Q360-640 348-652Q337-663 337-680Q337-697 348-708L452-812Q458-818 465-820.5Q472-823 480-823Q488-823 495-820.5Q502-818 508-812L612-708Q623-697 623-680.5Q623-664 612-652Q600-640 583.5-640Q567-640 555-652L520-687V-273L556-309Q567-320 583.5-320Q600-320 612-308Q623-297 623-280Q623-263 612-252L508-148Q502-142 495-139.5Q488-137 480-137Q472-137 465-139.5Q458-142 452-148L348-252Q337-263 336.5-279.5Q336-296 348-308Q359-319 376-319Q393-319 404-308Z",
  "history": "M480-120Q354-120 257-196.5Q160-273 131-392Q127-407 137-419.5Q147-432 164-434Q180-436 193-428Q206-420 211-404Q235-314 310-257Q385-200 480-200Q597-200 678.5-281.5Q760-363 760-480Q760-597 678.5-678.5Q597-760 480-760Q411-760 351-728Q291-696 250-640H320Q337-640 348.5-628.5Q360-617 360-600Q360-583 348.5-571.5Q337-560 320-560H160Q143-560 131.5-571.5Q120-583 120-600V-760Q120-777 131.5-788.5Q143-800 160-800Q177-800 188.5-788.5Q200-777 200-760V-706Q251-770 324.5-805Q398-840 480-840Q555-840 620.5-811.5Q686-783 734.5-734.5Q783-686 811.5-620.5Q840-555 840-480Q840-405 811.5-339.5Q783-274 734.5-225.5Q686-177 620.5-148.5Q555-120 480-120ZM520-496 620-396Q631-385 631-368Q631-351 620-340Q609-329 592-329Q575-329 564-340L452-452Q446-458 443-465.5Q440-473 440-481V-640Q440-657 451.5-668.5Q463-680 480-680Q497-680 508.5-668.5Q520-657 520-640Z",
  "horizontal_rule": "M200-440Q183-440 171.5-451.5Q160-463 160-480Q160-497 171.5-508.5Q183-520 200-520H760Q777-520 788.5-508.5Q800-497 800-480Q800-463 788.5-451.5Q777-440 760-440Z",
  "horizontal_split": "M160-200Q143-200 131.5-211.5Q120-223 120-240V-400Q120-417 131.5-428.5Q143-440 160-440H800Q817-440 828.5-428.5Q840-417 840-400V-240Q840-223 828.5-211.5Q817-200 800-200ZM160-520Q143-520 131.5-531.5Q120-543 120-560Q120-577 131.5-588.5Q143-600 160-600H800Q817-600 828.5-588.5Q840-577 840-560Q840-543 828.5-531.5Q817-520 800-520ZM160-680Q143-680 131.5-691.5Q120-703 120-720Q120-737 131.5-748.5Q143-760 160-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680Z",
  "html": "M0-390V-570Q0-583 8.5-591.5Q17-600 30-600Q43-600 51.5-591.5Q60-583 60-570V-520H140V-570Q140-583 148.5-591.5Q157-600 170-600Q183-600 191.5-591.5Q200-583 200-570V-390Q200-377 191.5-368.5Q183-360 170-360Q157-360 148.5-368.5Q140-377 140-390V-460H60V-390Q60-377 51.5-368.5Q43-360 30-360Q17-360 8.5-368.5Q0-377 0-390ZM310-390V-540H270Q257-540 248.5-548.5Q240-557 240-570Q240-583 248.5-591.5Q257-600 270-600H410Q423-600 431.5-591.5Q440-583 440-570Q440-557 431.5-548.5Q423-540 410-540H370V-390Q370-377 361.5-368.5Q353-360 340-360Q327-360 318.5-368.5Q310-377 310-390ZM480-390V-560Q480-577 491.5-588.5Q503-600 520-600H700Q717-600 728.5-588.5Q740-577 740-560V-390Q740-377 731.5-368.5Q723-360 710-360Q697-360 688.5-368.5Q680-377 680-390V-540H640V-430Q640-417 631.5-408.5Q623-400 610-400Q597-400 588.5-408.5Q580-417 580-430V-540H540V-390Q540-377 531.5-368.5Q523-360 510-360Q497-360 488.5-368.5Q480-377 480-390ZM830-360Q817-360 808.5-368.5Q800-377 800-390V-570Q800-583 808.5-591.5Q817-600 830-600Q843-600 851.5-591.5Q860-583 860-570V-420H930Q943-420 951.5-411.5Q960-403 960-390Q960-377 951.5-368.5Q943-360 930-360Z",
  "image": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM280-280H680Q692-280 698-291Q704-302 696-312L586-459Q580-467 570-467Q560-467 554-459L450-320L376-419Q370-427 360-427Q350-427 344-419L264-312Q256-302 262-291Q268-280 280-280Z",
  "info": "M520-320V-480Q520-497 508.5-508.5Q497-520 480-520Q463-520 451.5-508.5Q440-497 440-480V-320Q440-303 451.5-291.5Q463-280 480-280Q497-280 508.5-291.5Q520-303 520-320ZM520-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600Q497-600 508.5-611.5Q520-623 520-640ZM480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Q563-880 636-848.5Q709-817 763-763Q817-709 848.5-636Q880-563 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80ZM480-160Q614-160 707-253Q800-346 800-480Q800-614 707-707Q614-800 480-800Q346-800 253-707Q160-614 160-480Q160-346 253-253Q346-160 480-160ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "ink_eraser": "M690-240H840Q857-240 868.5-228.5Q880-217 880-200Q880-183 868.5-171.5Q857-160 840-160H610ZM207-160Q199-160 191.5-163Q184-166 178-172L105-245Q82-268 81.5-302Q81-336 104-360L544-816Q567-840 600.5-840Q634-840 657-817L856-618Q879-595 879-561Q879-527 856-504L532-172Q526-166 518.5-163Q511-160 503-160ZM486-240 800-562Q800-562 800-562Q800-562 800-562L602-760Q602-760 602-760Q602-760 602-760L160-304Q160-304 160-304Q160-304 160-304L224-240ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "insert_page_break": "M240-80Q207-80 183.5-103.5Q160-127 160-160V-240Q160-257 171.5-268.5Q183-280 200-280Q217-280 228.5-268.5Q240-257 240-240V-160Q240-160 240-160Q240-160 240-160H720Q720-160 720-160Q720-160 720-160V-240Q720-257 731.5-268.5Q743-280 760-280Q777-280 788.5-268.5Q800-257 800-240V-160Q800-127 776.5-103.5Q753-80 720-80ZM160-800Q160-833 183.5-856.5Q207-880 240-880H527Q543-880 557.5-874Q572-868 583-857L777-663Q788-652 794-637.5Q800-623 800-607V-560Q800-543 788.5-531.5Q777-520 760-520Q743-520 731.5-531.5Q720-543 720-560V-600H560Q543-600 531.5-611.5Q520-623 520-640V-800H240Q240-800 240-800Q240-800 240-800V-560Q240-543 228.5-531.5Q217-520 200-520Q183-520 171.5-531.5Q160-543 160-560ZM400-360Q383-360 371.5-371.5Q360-383 360-400Q360-417 371.5-428.5Q383-440 400-440H560Q577-440 588.5-428.5Q600-417 600-400Q600-383 588.5-371.5Q577-360 560-360ZM720-360Q703-360 691.5-371.5Q680-383 680-400Q680-417 691.5-428.5Q703-440 720-440H880Q897-440 908.5-428.5Q920-417 920-400Q920-383 908.5-371.5Q897-360 880-360ZM80-360Q63-360 51.5-371.5Q40-383 40-400Q40-417 51.5-428.5Q63-440 80-440H240Q257-440 268.5-428.5Q280-417 280-400Q280-383 268.5-371.5Q257-360 240-360ZM480-520Q480-520 480-520Q480-520 480-520ZM480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Q480-280 480-280Z",
  "keyboard": "M160-200Q127-200 103.5-223.5Q80-247 80-280V-680Q80-713 103.5-736.5Q127-760 160-760H800Q833-760 856.5-736.5Q880-713 880-680V-280Q880-247 856.5-223.5Q833-200 800-200ZM160-280H800Q800-280 800-280Q800-280 800-280V-680Q800-680 800-680Q800-680 800-680H160Q160-680 160-680Q160-680 160-680V-280Q160-280 160-280Q160-280 160-280ZM360-320H600Q617-320 628.5-331.5Q640-343 640-360Q640-377 628.5-388.5Q617-400 600-400H360Q343-400 331.5-388.5Q320-377 320-360Q320-343 331.5-331.5Q343-320 360-320ZM160-280Q160-280 160-280Q160-280 160-280V-680Q160-680 160-680Q160-680 160-680Q160-680 160-680Q160-680 160-680V-280Q160-280 160-280Q160-280 160-280ZM240-560Q257-560 268.5-571.5Q280-583 280-600Q280-617 268.5-628.5Q257-640 240-640Q223-640 211.5-628.5Q200-617 200-600Q200-583 211.5-571.5Q223-560 240-560ZM360-560Q377-560 388.5-571.5Q400-583 400-600Q400-617 388.5-628.5Q377-640 360-640Q343-640 331.5-628.5Q320-617 320-600Q320-583 331.5-571.5Q343-560 360-560ZM480-560Q497-560 508.5-571.5Q520-583 520-600Q520-617 508.5-628.5Q497-640 480-640Q463-640 451.5-628.5Q440-617 440-600Q440-583 451.5-571.5Q463-560 480-560ZM600-560Q617-560 628.5-571.5Q640-583 640-600Q640-617 628.5-628.5Q617-640 600-640Q583-640 571.5-628.5Q560-617 560-600Q560-583 571.5-571.5Q583-560 600-560ZM720-560Q737-560 748.5-571.5Q760-583 760-600Q760-617 748.5-628.5Q737-640 720-640Q703-640 691.5-628.5Q680-617 680-600Q680-583 691.5-571.5Q703-560 720-560ZM240-440Q257-440 268.5-451.5Q280-463 280-480Q280-497 268.5-508.5Q257-520 240-520Q223-520 211.5-508.5Q200-497 200-480Q200-463 211.5-451.5Q223-440 240-440ZM360-440Q377-440 388.5-451.5Q400-463 400-480Q400-497 388.5-508.5Q377-520 360-520Q343-520 331.5-508.5Q320-497 320-480Q320-463 331.5-451.5Q343-440 360-440ZM480-440Q497-440 508.5-451.5Q520-463 520-480Q520-497 508.5-508.5Q497-520 480-520Q463-520 451.5-508.5Q440-497 440-480Q440-463 451.5-451.5Q463-440 480-440ZM600-440Q617-440 628.5-451.5Q640-463 640-480Q640-497 628.5-508.5Q617-520 600-520Q583-520 571.5-508.5Q560-497 560-480Q560-463 571.5-451.5Q583-440 600-440ZM720-440Q737-440 748.5-451.5Q760-463 760-480Q760-497 748.5-508.5Q737-520 720-520Q703-520 691.5-508.5Q680-497 680-480Q680-463 691.5-451.5Q703-440 720-440Z",
  "keyboard_arrow_down": "M452-372 268-556Q257-567 257-584Q257-601 268-612Q279-623 296-623Q313-623 324-612L480-456L636-612Q647-623 664-623Q681-623 692-612Q703-601 703-584Q703-567 692-556L508-372Q502-366 495-363.5Q488-361 480-361Q472-361 465-363.5Q458-366 452-372Z",
  "keyboard_arrow_up": "M480-528 324-372Q313-361 296-361Q279-361 268-372Q257-383 257-400Q257-417 268-428L452-612Q464-624 480-624Q496-624 508-612L692-428Q703-417 703-400Q703-383 692-372Q681-361 664-361Q647-361 636-372Z",
  "language": "M480.5-80Q398-80 325-111.5Q252-143 197.5-197.5Q143-252 111.5-325Q80-398 80-480.5Q80-563 111.5-635.5Q143-708 197.5-762.5Q252-817 325-848.5Q398-880 480.5-880Q563-880 635.5-848.5Q708-817 762.5-762.5Q817-708 848.5-635.5Q880-563 880-480.5Q880-398 848.5-325Q817-252 762.5-197.5Q708-143 635.5-111.5Q563-80 480.5-80ZM480-162Q506-198 525-237Q544-276 556-320H404Q416-276 435-237Q454-198 480-162ZM376-178Q358-211 344.5-246.5Q331-282 322-320H204Q233-270 276.5-233Q320-196 376-178ZM584-178Q640-196 683.5-233Q727-270 756-320H638Q629-282 615.5-246.5Q602-211 584-178ZM170-400H306Q303-420 301.5-439.5Q300-459 300-480Q300-501 301.5-520.5Q303-540 306-560H170Q165-540 162.5-520.5Q160-501 160-480Q160-459 162.5-439.5Q165-420 170-400ZM386-400H574Q577-420 578.5-439.5Q580-459 580-480Q580-501 578.5-520.5Q577-540 574-560H386Q383-540 381.5-520.5Q380-501 380-480Q380-459 381.5-439.5Q383-420 386-400ZM654-400H790Q795-420 797.5-439.5Q800-459 800-480Q800-501 797.5-520.5Q795-540 790-560H654Q657-540 658.5-520.5Q660-501 660-480Q660-459 658.5-439.5Q657-420 654-400ZM638-640H756Q727-690 683.5-727Q640-764 584-782Q602-749 615.5-713.5Q629-678 638-640ZM404-640H556Q544-684 525-723Q506-762 480-798Q454-762 435-723Q416-684 404-640ZM204-640H322Q331-678 344.5-713.5Q358-749 376-782Q320-764 276.5-727Q233-690 204-640Z",
  "light_mode": "M480-360Q530-360 565-395Q600-430 600-480Q600-530 565-565Q530-600 480-600Q430-600 395-565Q360-530 360-480Q360-430 395-395Q430-360 480-360ZM480-280Q397-280 338.5-338.5Q280-397 280-480Q280-563 338.5-621.5Q397-680 480-680Q563-680 621.5-621.5Q680-563 680-480Q680-397 621.5-338.5Q563-280 480-280ZM80-440Q63-440 51.5-451.5Q40-463 40-480Q40-497 51.5-508.5Q63-520 80-520H160Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520H880Q897-520 908.5-508.5Q920-497 920-480Q920-463 908.5-451.5Q897-440 880-440ZM440-800V-880Q440-897 451.5-908.5Q463-920 480-920Q497-920 508.5-908.5Q520-897 520-880V-800Q520-783 508.5-771.5Q497-760 480-760Q463-760 451.5-771.5Q440-783 440-800ZM440-80V-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160V-80Q520-63 508.5-51.5Q497-40 480-40Q463-40 451.5-51.5Q440-63 440-80ZM226-678 183-720Q171-731 171.5-748Q172-765 183-777Q195-789 212-789Q229-789 240-777L282-734Q293-722 293-706Q293-690 282-678Q271-666 254.5-666.5Q238-667 226-678ZM720-183 678-226Q667-238 667-254.5Q667-271 678-282Q689-294 705.5-293.5Q722-293 734-282L777-240Q789-229 788.5-212Q788-195 777-183Q765-171 748-171Q731-171 720-183ZM678-678Q666-689 666.5-705.5Q667-722 678-734L720-777Q731-789 748-788.5Q765-788 777-777Q789-765 789-748Q789-731 777-720L734-678Q722-667 706-667Q690-667 678-678ZM183-183Q171-195 171-212Q171-229 183-240L226-282Q238-293 254.5-293Q271-293 282-282Q294-271 293.5-254.5Q293-238 282-226L240-183Q229-171 212-171.5Q195-172 183-183ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "line_style": "M159-160Q142-160 131-171.5Q120-183 120-200Q120-217 132-228.5Q144-240 161-240Q178-240 189-228.5Q200-217 200-200Q200-183 188-171.5Q176-160 159-160ZM319-160Q302-160 291-171.5Q280-183 280-200Q280-217 292-228.5Q304-240 321-240Q338-240 349-228.5Q360-217 360-200Q360-183 348-171.5Q336-160 319-160ZM479-160Q462-160 451-171.5Q440-183 440-200Q440-217 451.5-228.5Q463-240 480-240Q497-240 508.5-228.5Q520-217 520-200Q520-183 508-171.5Q496-160 479-160ZM640-160Q623-160 611.5-171.5Q600-183 600-200Q600-217 612-228.5Q624-240 641-240Q658-240 669-228.5Q680-217 680-200Q680-183 668.5-171.5Q657-160 640-160ZM800-160Q783-160 771.5-171.5Q760-183 760-200Q760-217 771.5-228.5Q783-240 800-240Q817-240 828.5-228.5Q840-217 840-200Q840-183 828.5-171.5Q817-160 800-160ZM159-320Q142-320 131-331.5Q120-343 120-360Q120-377 131.5-388.5Q143-400 160-400H281Q298-400 309-388.5Q320-377 320-360Q320-343 308.5-331.5Q297-320 280-320ZM419-320Q402-320 391-331.5Q380-343 380-360Q380-377 391.5-388.5Q403-400 420-400H541Q558-400 569-388.5Q580-377 580-360Q580-343 568.5-331.5Q557-320 540-320ZM679-320Q662-320 651-331.5Q640-343 640-360Q640-377 651.5-388.5Q663-400 680-400H801Q818-400 829-388.5Q840-377 840-360Q840-343 828.5-331.5Q817-320 800-320ZM159-480Q142-480 131-491.5Q120-503 120-520Q120-537 131.5-548.5Q143-560 160-560H401Q418-560 429-548.5Q440-537 440-520Q440-503 428.5-491.5Q417-480 400-480ZM559-480Q542-480 531-491.5Q520-503 520-520Q520-537 531.5-548.5Q543-560 560-560H801Q818-560 829-548.5Q840-537 840-520Q840-503 828.5-491.5Q817-480 800-480ZM160-640Q143-640 131.5-651.5Q120-663 120-680V-760Q120-777 131.5-788.5Q143-800 160-800H800Q817-800 828.5-788.5Q840-777 840-760V-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "line_weight": "M140-160Q132-160 126-166Q120-172 120-180Q120-188 126-194Q132-200 140-200H820Q828-200 834-194Q840-188 840-180Q840-172 834-166Q828-160 820-160ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H800Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480V-520Q120-537 131.5-548.5Q143-560 160-560H800Q817-560 828.5-548.5Q840-537 840-520V-480Q840-463 828.5-451.5Q817-440 800-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680V-760Q120-777 131.5-788.5Q143-800 160-800H800Q817-800 828.5-788.5Q840-777 840-760V-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "link": "M280-280Q197-280 138.5-338.5Q80-397 80-480Q80-563 138.5-621.5Q197-680 280-680H400Q417-680 428.5-668.5Q440-657 440-640Q440-623 428.5-611.5Q417-600 400-600H280Q230-600 195-565Q160-530 160-480Q160-430 195-395Q230-360 280-360H400Q417-360 428.5-348.5Q440-337 440-320Q440-303 428.5-291.5Q417-280 400-280ZM360-440Q343-440 331.5-451.5Q320-463 320-480Q320-497 331.5-508.5Q343-520 360-520H600Q617-520 628.5-508.5Q640-497 640-480Q640-463 628.5-451.5Q617-440 600-440ZM560-280Q543-280 531.5-291.5Q520-303 520-320Q520-337 531.5-348.5Q543-360 560-360H680Q730-360 765-395Q800-430 800-480Q800-530 765-565Q730-600 680-600H560Q543-600 531.5-611.5Q520-623 520-640Q520-657 531.5-668.5Q543-680 560-680H680Q763-680 821.5-621.5Q880-563 880-480Q880-397 821.5-338.5Q763-280 680-280Z",
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
  "padding": "M320-600Q337-600 348.5-611.5Q360-623 360-640Q360-657 348.5-668.5Q337-680 320-680Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM480-600Q497-600 508.5-611.5Q520-623 520-640Q520-657 508.5-668.5Q497-680 480-680Q463-680 451.5-668.5Q440-657 440-640Q440-623 451.5-611.5Q463-600 480-600ZM640-600Q657-600 668.5-611.5Q680-623 680-640Q680-657 668.5-668.5Q657-680 640-680Q623-680 611.5-668.5Q600-657 600-640Q600-623 611.5-611.5Q623-600 640-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "palette": "M480-80Q398-80 325-111.5Q252-143 197.5-197.5Q143-252 111.5-325Q80-398 80-480Q80-563 112.5-636Q145-709 200.5-763Q256-817 330-848.5Q404-880 488-880Q568-880 639-852.5Q710-825 763.5-776.5Q817-728 848.5-661.5Q880-595 880-518Q880-403 810-341.5Q740-280 640-280H566Q557-280 553.5-275Q550-270 550-264Q550-252 565-229.5Q580-207 580-178Q580-128 552.5-104Q525-80 480-80ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480ZM260-440Q286-440 303-457Q320-474 320-500Q320-526 303-543Q286-560 260-560Q234-560 217-543Q200-526 200-500Q200-474 217-457Q234-440 260-440ZM380-600Q406-600 423-617Q440-634 440-660Q440-686 423-703Q406-720 380-720Q354-720 337-703Q320-686 320-660Q320-634 337-617Q354-600 380-600ZM580-600Q606-600 623-617Q640-634 640-660Q640-686 623-703Q606-720 580-720Q554-720 537-703Q520-686 520-660Q520-634 537-617Q554-600 580-600ZM700-440Q726-440 743-457Q760-474 760-500Q760-526 743-543Q726-560 700-560Q674-560 657-543Q640-526 640-500Q640-474 657-457Q674-440 700-440ZM480-160Q489-160 494.5-165Q500-170 500-178Q500-192 485-211Q470-230 470-268Q470-310 499-335Q528-360 570-360H640Q706-360 753-398.5Q800-437 800-518Q800-639 707.5-719.5Q615-800 488-800Q352-800 256-707Q160-614 160-480Q160-347 253.5-253.5Q347-160 480-160Z",
  "picture_as_pdf": "M400-540H440Q457-540 468.5-551.5Q480-563 480-580V-620Q480-637 468.5-648.5Q457-660 440-660H380Q372-660 366-654Q360-648 360-640V-480Q360-472 366-466Q372-460 380-460Q388-460 394-466Q400-472 400-480ZM400-580V-620H440V-580ZM600-460Q617-460 628.5-471.5Q640-483 640-500V-620Q640-637 628.5-648.5Q617-660 600-660H540Q532-660 526-654Q520-648 520-640V-480Q520-472 526-466Q532-460 540-460ZM560-500V-620H600V-500ZM720-540H740Q748-540 754-546Q760-552 760-560Q760-568 754-574Q748-580 740-580H720V-620H740Q748-620 754-626Q760-632 760-640Q760-648 754-654Q748-660 740-660H700Q692-660 686-654Q680-648 680-640V-480Q680-472 686-466Q692-460 700-460Q708-460 714-466Q720-472 720-480ZM320-240Q287-240 263.5-263.5Q240-287 240-320V-800Q240-833 263.5-856.5Q287-880 320-880H800Q833-880 856.5-856.5Q880-833 880-800V-320Q880-287 856.5-263.5Q833-240 800-240ZM320-320H800Q800-320 800-320Q800-320 800-320V-800Q800-800 800-800Q800-800 800-800H320Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-680Q80-697 91.5-708.5Q103-720 120-720Q137-720 148.5-708.5Q160-697 160-680V-160Q160-160 160-160Q160-160 160-160H680Q697-160 708.5-148.5Q720-137 720-120Q720-103 708.5-91.5Q697-80 680-80ZM320-800Q320-800 320-800Q320-800 320-800V-320Q320-320 320-320Q320-320 320-320Q320-320 320-320Q320-320 320-320V-800Q320-800 320-800Q320-800 320-800Z",
  "print": "M320-120Q287-120 263.5-143.5Q240-167 240-200V-280H160Q127-280 103.5-303.5Q80-327 80-360V-520Q80-571 115-605.5Q150-640 200-640H760Q811-640 845.5-605.5Q880-571 880-520V-360Q880-327 856.5-303.5Q833-280 800-280H720V-200Q720-167 696.5-143.5Q673-120 640-120ZM160-360H240Q240-393 263.5-416.5Q287-440 320-440H640Q673-440 696.5-416.5Q720-393 720-360H800Q800-360 800-360Q800-360 800-360V-520Q800-537 788.5-548.5Q777-560 760-560H200Q183-560 171.5-548.5Q160-537 160-520V-360Q160-360 160-360Q160-360 160-360ZM640-640V-760Q640-760 640-760Q640-760 640-760H320Q320-760 320-760Q320-760 320-760V-640H240V-760Q240-793 263.5-816.5Q287-840 320-840H640Q673-840 696.5-816.5Q720-793 720-760V-640ZM720-460Q737-460 748.5-471.5Q760-483 760-500Q760-517 748.5-528.5Q737-540 720-540Q703-540 691.5-528.5Q680-517 680-500Q680-483 691.5-471.5Q703-460 720-460ZM640-200V-360Q640-360 640-360Q640-360 640-360H320Q320-360 320-360Q320-360 320-360V-200Q320-200 320-200Q320-200 320-200H640Q640-200 640-200Q640-200 640-200ZM160-560Q160-560 160-560Q160-560 160-560Q160-560 171.5-560Q183-560 200-560H760Q777-560 788.5-560Q800-560 800-560Q800-560 800-560Q800-560 800-560H720Q720-560 696.5-560Q673-560 640-560H320Q287-560 263.5-560Q240-560 240-560Z",
  "redo": "M648-560H396Q333-560 286.5-520Q240-480 240-420Q240-360 286.5-320Q333-280 396-280H640Q657-280 668.5-268.5Q680-257 680-240Q680-223 668.5-211.5Q657-200 640-200H396Q299-200 229.5-263Q160-326 160-420Q160-514 229.5-577Q299-640 396-640H648L572-716Q561-727 561-744Q561-761 572-772Q583-783 600-783Q617-783 628-772L772-628Q778-622 780.5-615Q783-608 783-600Q783-592 780.5-585Q778-578 772-572L628-428Q617-417 600-417Q583-417 572-428Q561-439 561-456Q561-473 572-484Z",
  "refresh": "M480-160Q346-160 253-253Q160-346 160-480Q160-614 253-707Q346-800 480-800Q549-800 612-771.5Q675-743 720-690V-760Q720-777 731.5-788.5Q743-800 760-800Q777-800 788.5-788.5Q800-777 800-760V-560Q800-543 788.5-531.5Q777-520 760-520H560Q543-520 531.5-531.5Q520-543 520-560Q520-577 531.5-588.5Q543-600 560-600H688Q656-656 600.5-688Q545-720 480-720Q380-720 310-650Q240-580 240-480Q240-380 310-310Q380-240 480-240Q548-240 604.5-274.5Q661-309 692-367Q700-381 714.5-386.5Q729-392 744-387Q760-382 767-366Q774-350 766-336Q725-256 649-208Q573-160 480-160Z",
  "remove": "M240-440Q223-440 211.5-451.5Q200-463 200-480Q200-497 211.5-508.5Q223-520 240-520H720Q737-520 748.5-508.5Q760-497 760-480Q760-463 748.5-451.5Q737-440 720-440Z",
  "remove_done": "M845-116 609-352 523-266Q511-254 495-254Q479-254 467-266L297-436Q285-448 285.5-464Q286-480 297-492Q309-504 325.5-504.5Q342-505 354-493L495-352L551-408L165-794Q153-806 153.5-822Q154-838 165-850Q177-862 193.5-862.5Q210-863 222-851L901-172Q912-161 912-144Q912-127 901-116Q890-105 873-105Q856-105 845-116ZM241-266 71-436Q60-447 60-464Q60-481 71-492Q82-503 99-503Q116-503 127-492L269-350L325-294L297-266Q285-254 269-254Q253-254 241-266ZM721-464 665-520 834-689Q845-700 861-700.5Q877-701 889-690Q901-679 901.5-662Q902-645 890-633ZM607-578 551-634 609-692Q620-703 637-703Q654-703 665-692Q676-681 676-664Q676-647 665-636Z",
  "rotate_90_degrees_ccw": "M520-80Q483-80 447.5-87.5Q412-95 378-109Q363-115 358-130.5Q353-146 359-161Q365-176 380-182.5Q395-189 410-182Q436-171 463.5-165.5Q491-160 520-160Q637-160 718.5-241.5Q800-323 800-440Q800-557 718-638.5Q636-720 519-720H512L548-684Q559-673 559-656Q559-639 548-628Q537-617 520-617Q503-617 492-628L388-732Q383-737 380-744.5Q377-752 377-760Q377-768 380-775.5Q383-783 388-788L492-892Q503-903 520-903Q537-903 548-892Q559-881 559-864Q559-847 548-836L512-800H519Q669-800 774.5-695Q880-590 880-440Q880-290 775-185Q670-80 520-80ZM252-228 68-412Q62-418 59.5-425Q57-432 57-440Q57-448 59.5-455Q62-462 68-468L252-652Q258-658 265-660.5Q272-663 280-663Q288-663 295-660.5Q302-658 308-652L492-468Q498-462 500.5-455Q503-448 503-440Q503-432 500.5-425Q498-418 492-412L308-228Q302-222 295-219.5Q288-217 280-217Q272-217 265-219.5Q258-222 252-228ZM280-314 406-440 280-566 154-440ZM280-440Z",
  "save": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H647Q663-840 677.5-834Q692-828 703-817L817-703Q828-692 834-677.5Q840-663 840-647V-200Q840-167 816.5-143.5Q793-120 760-120ZM760-646 646-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200ZM480-240Q530-240 565-275Q600-310 600-360Q600-410 565-445Q530-480 480-480Q430-480 395-445Q360-410 360-360Q360-310 395-275Q430-240 480-240ZM280-560H560Q577-560 588.5-571.5Q600-583 600-600V-680Q600-697 588.5-708.5Q577-720 560-720H280Q263-720 251.5-708.5Q240-697 240-680V-600Q240-583 251.5-571.5Q263-560 280-560ZM200-646V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760Z",
  "save_as": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H647Q663-840 677.5-834Q692-828 703-817L817-703Q828-692 834-677.5Q840-663 840-647V-520Q840-503 828.5-491.5Q817-480 800-480Q783-480 771.5-491.5Q760-503 760-520V-647L647-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H400Q417-200 428.5-188.5Q440-177 440-160Q440-143 428.5-131.5Q417-120 400-120ZM200-760V-647V-478Q200-475 200-465.5Q200-456 200-441V-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760ZM520-80V-146Q520-154 523-161.5Q526-169 532-175L741-383Q750-392 761-396Q772-400 783-400Q795-400 806-395.5Q817-391 826-382L863-345Q871-336 875.5-325Q880-314 880-303Q880-292 876-280.5Q872-269 863-260L655-52Q649-46 641.5-43Q634-40 626-40H560Q543-40 531.5-51.5Q520-63 520-80ZM820-303 783-340ZM580-100H618L739-222L721-241L702-259L580-138ZM721-241 702-259 739-222ZM280-560H560Q577-560 588.5-571.5Q600-583 600-600V-680Q600-697 588.5-708.5Q577-720 560-720H280Q263-720 251.5-708.5Q240-697 240-680V-600Q240-583 251.5-571.5Q263-560 280-560ZM480-240Q481-240 482-240Q483-240 484-240L600-355Q600-357 600-357.5Q600-358 600-360Q600-410 565-445Q530-480 480-480Q430-480 395-445Q360-410 360-360Q360-310 395-275Q430-240 480-240Z",
  "search": "M380-320Q271-320 195.5-395.5Q120-471 120-580Q120-689 195.5-764.5Q271-840 380-840Q489-840 564.5-764.5Q640-689 640-580Q640-536 626-497Q612-458 588-428L812-204Q823-193 823-176Q823-159 812-148Q801-137 784-137Q767-137 756-148L532-372Q502-348 463-334Q424-320 380-320ZM380-400Q455-400 507.5-452.5Q560-505 560-580Q560-655 507.5-707.5Q455-760 380-760Q305-760 252.5-707.5Q200-655 200-580Q200-505 252.5-452.5Q305-400 380-400Z",
  "select": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120Z",
  "select_all": "M160-760Q143-760 131.5-771.5Q120-783 120-800Q120-817 131.5-828.5Q143-840 160-840Q177-840 188.5-828.5Q200-817 200-800Q200-783 188.5-771.5Q177-760 160-760ZM320-760Q303-760 291.5-771.5Q280-783 280-800Q280-817 291.5-828.5Q303-840 320-840Q337-840 348.5-828.5Q360-817 360-800Q360-783 348.5-771.5Q337-760 320-760ZM480-760Q463-760 451.5-771.5Q440-783 440-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800Q520-783 508.5-771.5Q497-760 480-760ZM640-760Q623-760 611.5-771.5Q600-783 600-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800Q680-783 668.5-771.5Q657-760 640-760ZM800-760Q783-760 771.5-771.5Q760-783 760-800Q760-817 771.5-828.5Q783-840 800-840Q817-840 828.5-828.5Q840-817 840-800Q840-783 828.5-771.5Q817-760 800-760ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680Q177-680 188.5-668.5Q200-657 200-640Q200-623 188.5-611.5Q177-600 160-600ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520Q177-520 188.5-508.5Q200-497 200-480Q200-463 188.5-451.5Q177-440 160-440ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360Q177-360 188.5-348.5Q200-337 200-320Q200-303 188.5-291.5Q177-280 160-280ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM160-120Q143-120 131.5-131.5Q120-143 120-160Q120-177 131.5-188.5Q143-200 160-200Q177-200 188.5-188.5Q200-177 200-160Q200-143 188.5-131.5Q177-120 160-120ZM320-120Q303-120 291.5-131.5Q280-143 280-160Q280-177 291.5-188.5Q303-200 320-200Q337-200 348.5-188.5Q360-177 360-160Q360-143 348.5-131.5Q337-120 320-120ZM480-120Q463-120 451.5-131.5Q440-143 440-160Q440-177 451.5-188.5Q463-200 480-200Q497-200 508.5-188.5Q520-177 520-160Q520-143 508.5-131.5Q497-120 480-120ZM640-120Q623-120 611.5-131.5Q600-143 600-160Q600-177 611.5-188.5Q623-200 640-200Q657-200 668.5-188.5Q680-177 680-160Q680-143 668.5-131.5Q657-120 640-120ZM800-120Q783-120 771.5-131.5Q760-143 760-160Q760-177 771.5-188.5Q783-200 800-200Q817-200 828.5-188.5Q840-177 840-160Q840-143 828.5-131.5Q817-120 800-120ZM360-280Q327-280 303.5-303.5Q280-327 280-360V-600Q280-633 303.5-656.5Q327-680 360-680H600Q633-680 656.5-656.5Q680-633 680-600V-360Q680-327 656.5-303.5Q633-280 600-280ZM360-360H600Q600-360 600-360Q600-360 600-360V-600Q600-600 600-600Q600-600 600-600H360Q360-600 360-600Q360-600 360-600V-360Q360-360 360-360Q360-360 360-360Z",
  "settings": "M433-80Q406-80 386.5-98Q367-116 363-142L354-208Q341-213 329.5-220Q318-227 307-235L245-209Q220-198 195-207Q170-216 156-239L109-321Q95-344 101-370Q107-396 128-413L181-453Q180-460 180-466.5Q180-473 180-480Q180-487 180-493.5Q180-500 181-507L128-547Q107-564 101-590Q95-616 109-639L156-721Q170-744 195-753Q220-762 245-751L307-725Q318-733 330-740Q342-747 354-752L363-818Q367-844 386.5-862Q406-880 433-880H527Q554-880 573.5-862Q593-844 597-818L606-752Q619-747 630.5-740Q642-733 653-725L715-751Q740-762 765-753Q790-744 804-721L851-639Q865-616 859-590Q853-564 832-547L779-507Q780-500 780-493.5Q780-487 780-480Q780-473 780-466.5Q780-460 778-453L831-413Q852-396 858-370Q864-344 850-321L802-239Q788-216 763-207Q738-198 713-209L653-235Q642-227 630-220Q618-213 606-208L597-142Q593-116 573.5-98Q554-80 527-80ZM440-160H519L533-266Q564-274 590.5-289.5Q617-305 639-327L738-286L777-354L691-419Q696-433 698-448.5Q700-464 700-480Q700-496 698-511.5Q696-527 691-541L777-606L738-674L639-632Q617-655 590.5-670.5Q564-686 533-694L520-800H441L427-694Q396-686 369.5-670.5Q343-655 321-633L222-674L183-606L269-542Q264-527 262-512Q260-497 260-480Q260-464 262-449Q264-434 269-419L183-354L222-286L321-328Q343-305 369.5-289.5Q396-274 427-266ZM482-340Q540-340 581-381Q622-422 622-480Q622-538 581-579Q540-620 482-620Q423-620 382.5-579Q342-538 342-480Q342-422 382.5-381Q423-340 482-340ZM480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Q480-480 480-480Z",
  "short_text": "M200-360Q183-360 171.5-371.5Q160-383 160-400Q160-417 171.5-428.5Q183-440 200-440H520Q537-440 548.5-428.5Q560-417 560-400Q560-383 548.5-371.5Q537-360 520-360ZM200-520Q183-520 171.5-531.5Q160-543 160-560Q160-577 171.5-588.5Q183-600 200-600H760Q777-600 788.5-588.5Q800-577 800-560Q800-543 788.5-531.5Q777-520 760-520Z",
  "sort": "M160-240Q143-240 131.5-251.5Q120-263 120-280Q120-297 131.5-308.5Q143-320 160-320H320Q337-320 348.5-308.5Q360-297 360-280Q360-263 348.5-251.5Q337-240 320-240ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H560Q577-520 588.5-508.5Q600-497 600-480Q600-463 588.5-451.5Q577-440 560-440ZM160-640Q143-640 131.5-651.5Q120-663 120-680Q120-697 131.5-708.5Q143-720 160-720H800Q817-720 828.5-708.5Q840-697 840-680Q840-663 828.5-651.5Q817-640 800-640Z",
  "sort_by_alpha": "M196-376 173-306Q169-295 159-287.5Q149-280 137-280Q117-280 104.5-296.5Q92-313 100-333L220-654Q225-666 235-673Q245-680 258-680H288Q301-680 311-673Q321-666 326-654L447-331Q454-312 442.5-296Q431-280 411-280Q399-280 389-287.5Q379-295 375-306L350-376ZM220-444H324L276-594H270ZM638-352H804Q819-352 829.5-341.5Q840-331 840-316Q840-301 829.5-290.5Q819-280 804-280H572Q562-280 555-287Q548-294 548-304V-342Q548-349 550-355.5Q552-362 557-367L750-608H592Q577-608 566.5-618.5Q556-629 556-644Q556-659 566.5-669.5Q577-680 592-680H814Q824-680 831-673Q838-666 838-656V-618Q838-611 836-604.5Q834-598 829-593ZM384-760Q377-760 374.5-766Q372-772 377-777L466-866Q472-872 480-872Q488-872 494-866L583-777Q588-772 585.5-766Q583-760 576-760ZM466-94 377-183Q372-188 374.5-194Q377-200 384-200H576Q583-200 585.5-194Q588-188 583-183L494-94Q488-88 480-88Q472-88 466-94Z",
  "south_east": "M624-280 188-716Q177-727 177-744Q177-761 188-772Q199-783 216-783Q233-783 244-772L680-336V-560Q680-577 691.5-588.5Q703-600 720-600Q737-600 748.5-588.5Q760-577 760-560V-240Q760-223 748.5-211.5Q737-200 720-200H400Q383-200 371.5-211.5Q360-223 360-240Q360-257 371.5-268.5Q383-280 400-280Z",
  "special_character": "M260-540Q260-477 293-424Q326-371 383-343Q407-331 423.5-310.5Q440-290 440-264V-180Q440-155 422.5-137.5Q405-120 380-120H180Q155-120 137.5-137.5Q120-155 120-180Q120-205 137.5-222.5Q155-240 180-240H320Q236-285 188-365Q140-445 140-540Q140-682 239-781Q338-880 480-880Q622-880 721-781Q820-682 820-540Q820-445 772-365Q724-285 640-240H780Q805-240 822.5-222.5Q840-205 840-180Q840-155 822.5-137.5Q805-120 780-120H580Q555-120 537.5-137.5Q520-155 520-180V-264Q520-290 536.5-310.5Q553-331 577-343Q634-371 667-424Q700-477 700-540Q700-632 636-696Q572-760 480-760Q388-760 324-696Q260-632 260-540Z",
  "spellcheck": "M564-192 762-390Q773-401 790-401Q807-401 818-390Q829-379 829-362Q829-345 818-334L621-137Q609-125 594-119Q579-113 564-113Q549-113 534-119Q519-125 507-137L422-222Q411-233 411-250Q411-267 422-278Q433-289 450-289Q467-289 478-278ZM254-452 217-347Q212-335 202-327.5Q192-320 179-320Q157-320 145-338Q133-356 141-376L303-811Q308-824 319.5-832Q331-840 345-840H377Q391-840 402.5-832Q414-824 419-811L581-377Q589-356 576.5-338Q564-320 541-320Q527-320 516-328Q505-336 500-349L464-452ZM282-528H438L362-744H358Z",
  "splitscreen": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM200-600H760Q760-600 760-600Q760-600 760-600V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-360Q760-360 760-360Q760-360 760-360H200Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200ZM200-600Q200-600 200-600Q200-600 200-600V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-200Q200-200 200-200Q200-200 200-200V-360Q200-360 200-360Q200-360 200-360Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200Z",
  "splitscreen_left": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM760-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760V-200Q600-200 600-200Q600-200 600-200H760Q760-200 760-200Q760-200 760-200Z",
  "splitscreen_right": "M600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200V-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Z",
  "splitscreen_vertical_add": "M760-760H759Q690-760 644.5-760Q599-760 599-760Q599-760 600.5-760Q602-760 604-760H600Q600-760 600-760Q600-760 600-760H760Q760-760 760-760Q760-760 760-760ZM520-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-400Q840-383 828.5-371.5Q817-360 800-360Q783-360 771.5-371.5Q760-383 760-400V-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760V-120Q567-120 543.5-143.5Q520-167 520-200ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760H360Q360-760 360-760Q360-760 360-760ZM760-120H720Q703-120 691.5-131.5Q680-143 680-160Q680-177 691.5-188.5Q703-200 720-200H760V-240Q760-257 771.5-268.5Q783-280 800-280Q817-280 828.5-268.5Q840-257 840-240V-200H880Q897-200 908.5-188.5Q920-177 920-160Q920-143 908.5-131.5Q897-120 880-120H840V-80Q840-63 828.5-51.5Q817-40 800-40Q783-40 771.5-51.5Q760-63 760-80Z",
  "style": "M159-168 125-182Q94-195 83.5-227Q73-259 87-290L159-446ZM319-80Q286-80 262.5-103.5Q239-127 239-160V-400L345-106Q348-99 351-92.5Q354-86 359-80ZM525-84Q493-72 463-87Q433-102 421-134L243-622Q231-654 245-684.5Q259-715 291-726L593-836Q625-848 655-833Q685-818 697-786L875-298Q887-266 873-235.5Q859-205 827-194ZM439-560Q456-560 467.5-571.5Q479-583 479-600Q479-617 467.5-628.5Q456-640 439-640Q422-640 410.5-628.5Q399-617 399-600Q399-583 410.5-571.5Q422-560 439-560ZM497-160 799-270 621-760 319-650ZM319-650 621-760Z",
  "subscript": "M800-160Q783-160 771.5-171.5Q760-183 760-200V-240Q760-257 771.5-268.5Q783-280 800-280H880V-320H780Q772-320 766-326Q760-332 760-340Q760-348 766-354Q772-360 780-360H880Q897-360 908.5-348.5Q920-337 920-320V-280Q920-263 908.5-251.5Q897-240 880-240H800V-200H900Q908-200 914-194Q920-188 920-180Q920-172 914-166Q908-160 900-160ZM317-240Q290-240 277.5-263Q265-286 279-309L420-531L292-732Q278-754 290.5-777Q303-800 329-800Q341-800 351-794.5Q361-789 367-779L478-600H482L592-779Q598-789 608.5-794.5Q619-800 630-800Q657-800 669-777Q681-754 667-731L539-531L681-309Q695-286 682-263Q669-240 643-240Q631-240 621-245.5Q611-251 605-261L482-457H478L355-261Q349-251 338.5-245.5Q328-240 317-240Z",
  "superscript": "M800-600Q783-600 771.5-611.5Q760-623 760-640V-680Q760-697 771.5-708.5Q783-720 800-720H880V-760H780Q772-760 766-766Q760-772 760-780Q760-788 766-794Q772-800 780-800H880Q897-800 908.5-788.5Q920-777 920-760V-720Q920-703 908.5-691.5Q897-680 880-680H800V-640H900Q908-640 914-634Q920-628 920-620Q920-612 914-606Q908-600 900-600ZM317-160Q290-160 277.5-183Q265-206 279-229L420-451L292-652Q278-674 290.5-697Q303-720 329-720Q341-720 351-714.5Q361-709 367-699L478-520H482L592-699Q598-709 608.5-714.5Q619-720 630-720Q657-720 669-697Q681-674 667-651L539-451L681-229Q695-206 682-183Q669-160 643-160Q631-160 621-165.5Q611-171 605-181L482-377H478L355-181Q349-171 338.5-165.5Q328-160 317-160Z",
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
  "text_snippet": "M200-200H760Q760-200 760-200Q760-200 760-200V-567L567-760H200Q200-760 200-760Q200-760 200-760V-200Q200-200 200-200Q200-200 200-200ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H567Q583-840 597.5-834Q612-828 623-817L817-623Q828-612 834-597.5Q840-583 840-567V-200Q840-167 816.5-143.5Q793-120 760-120ZM320-280H640Q657-280 668.5-291.5Q680-303 680-320Q680-337 668.5-348.5Q657-360 640-360H320Q303-360 291.5-348.5Q280-337 280-320Q280-303 291.5-291.5Q303-280 320-280ZM320-440H640Q657-440 668.5-451.5Q680-463 680-480Q680-497 668.5-508.5Q657-520 640-520H320Q303-520 291.5-508.5Q280-497 280-480Q280-463 291.5-451.5Q303-440 320-440ZM320-600H520Q537-600 548.5-611.5Q560-623 560-640Q560-657 548.5-668.5Q537-680 520-680H320Q303-680 291.5-668.5Q280-657 280-640Q280-623 291.5-611.5Q303-600 320-600ZM200-200Q200-200 200-200Q200-200 200-200V-760Q200-760 200-760Q200-760 200-760V-567V-200Q200-200 200-200Q200-200 200-200Z",
  "toc": "M160-280Q143-280 131.5-291.5Q120-303 120-320Q120-337 131.5-348.5Q143-360 160-360H640Q657-360 668.5-348.5Q680-337 680-320Q680-303 668.5-291.5Q657-280 640-280ZM160-440Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H640Q657-520 668.5-508.5Q680-497 680-480Q680-463 668.5-451.5Q657-440 640-440ZM160-600Q143-600 131.5-611.5Q120-623 120-640Q120-657 131.5-668.5Q143-680 160-680H640Q657-680 668.5-668.5Q680-657 680-640Q680-623 668.5-611.5Q657-600 640-600ZM800-280Q783-280 771.5-291.5Q760-303 760-320Q760-337 771.5-348.5Q783-360 800-360Q817-360 828.5-348.5Q840-337 840-320Q840-303 828.5-291.5Q817-280 800-280ZM800-440Q783-440 771.5-451.5Q760-463 760-480Q760-497 771.5-508.5Q783-520 800-520Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM800-600Q783-600 771.5-611.5Q760-623 760-640Q760-657 771.5-668.5Q783-680 800-680Q817-680 828.5-668.5Q840-657 840-640Q840-623 828.5-611.5Q817-600 800-600Z",
  "toolbar": "M200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-640H760V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760ZM760-560H200V-200Q200-200 200-200Q200-200 200-200H760Q760-200 760-200Q760-200 760-200ZM200-640V-560V-640ZM200-640V-760Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760V-640ZM200-560V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-560Z",
  "track_changes": "M480-880Q497-880 508.5-868.5Q520-857 520-840V-549Q538-538 549-520.5Q560-503 560-480Q560-447 536.5-423.5Q513-400 480-400Q447-400 423.5-423.5Q400-447 400-480Q400-503 411-521Q422-539 440-549V-635Q388-621 354-578.5Q320-536 320-480Q320-414 367-367Q414-320 480-320Q546-320 593-367Q640-414 640-480Q640-506 632.5-528Q625-550 612-570Q602-584 603-601Q604-618 615-629Q627-641 643.5-641Q660-641 670-627Q693-596 706.5-559Q720-522 720-480Q720-380 650-310Q580-240 480-240Q380-240 310-310Q240-380 240-480Q240-570 297-636.5Q354-703 440-717V-798Q321-783 240.5-693Q160-603 160-480Q160-346 253-253Q346-160 480-160Q614-160 707-253Q800-346 800-480Q800-538 781-589.5Q762-641 727-683Q716-696 716-713Q716-730 728-742Q740-754 756.5-753.5Q773-753 784-740Q829-687 854.5-621Q880-555 880-480Q880-397 848.5-324Q817-251 763-197Q709-143 636-111.5Q563-80 480-80Q397-80 324-111.5Q251-143 197-197Q143-251 111.5-324Q80-397 80-480Q80-563 111.5-636Q143-709 197-763Q251-817 324-848.5Q397-880 480-880Z",
  "tune": "M440-160V-320Q440-337 451.5-348.5Q463-360 480-360Q497-360 508.5-348.5Q520-337 520-320V-280H800Q817-280 828.5-268.5Q840-257 840-240Q840-223 828.5-211.5Q817-200 800-200H520V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160ZM160-200Q143-200 131.5-211.5Q120-223 120-240Q120-257 131.5-268.5Q143-280 160-280H320Q337-280 348.5-268.5Q360-257 360-240Q360-223 348.5-211.5Q337-200 320-200ZM280-400V-440H160Q143-440 131.5-451.5Q120-463 120-480Q120-497 131.5-508.5Q143-520 160-520H280V-560Q280-577 291.5-588.5Q303-600 320-600Q337-600 348.5-588.5Q360-577 360-560V-400Q360-383 348.5-371.5Q337-360 320-360Q303-360 291.5-371.5Q280-383 280-400ZM480-440Q463-440 451.5-451.5Q440-463 440-480Q440-497 451.5-508.5Q463-520 480-520H800Q817-520 828.5-508.5Q840-497 840-480Q840-463 828.5-451.5Q817-440 800-440ZM600-640V-800Q600-817 611.5-828.5Q623-840 640-840Q657-840 668.5-828.5Q680-817 680-800V-760H800Q817-760 828.5-748.5Q840-737 840-720Q840-703 828.5-691.5Q817-680 800-680H680V-640Q680-623 668.5-611.5Q657-600 640-600Q623-600 611.5-611.5Q600-623 600-640ZM160-680Q143-680 131.5-691.5Q120-703 120-720Q120-737 131.5-748.5Q143-760 160-760H480Q497-760 508.5-748.5Q520-737 520-720Q520-703 508.5-691.5Q497-680 480-680Z",
  "undo": "M320-200Q303-200 291.5-211.5Q280-223 280-240Q280-257 291.5-268.5Q303-280 320-280H564Q627-280 673.5-320Q720-360 720-420Q720-480 673.5-520Q627-560 564-560H312L388-484Q399-473 399-456Q399-439 388-428Q377-417 360-417Q343-417 332-428L188-572Q182-578 179.5-585Q177-592 177-600Q177-608 179.5-615Q182-622 188-628L332-772Q343-783 360-783Q377-783 388-772Q399-761 399-744Q399-727 388-716L312-640H564Q661-640 730.5-577Q800-514 800-420Q800-326 730.5-263Q661-200 564-200Z",
  "uppercase": "M660-280V-488L624-452Q613-441 596-441Q579-441 568-452Q557-463 557-480Q557-497 568-508L672-612Q684-624 700-624Q716-624 728-612L832-508Q843-497 843-480Q843-463 832-452Q821-441 804-441Q787-441 776-452L740-488V-280Q740-263 728.5-251.5Q717-240 700-240Q683-240 671.5-251.5Q660-263 660-280ZM236-353 204-263Q200-252 191-246Q182-240 171-240Q152-240 141.5-255.5Q131-271 138-288L276-656Q280-667 290-673.5Q300-680 311-680H338Q349-680 359-673.5Q369-667 373-656L511-287Q518-270 507.5-255Q497-240 479-240Q468-240 458.5-246.5Q449-253 445-264L414-353ZM259-417H390L325-599H321Z",
  "vertical_align_bottom": "M200-120Q183-120 171.5-131.5Q160-143 160-160Q160-177 171.5-188.5Q183-200 200-200H760Q777-200 788.5-188.5Q800-177 800-160Q800-143 788.5-131.5Q777-120 760-120ZM452-308 308-452Q297-463 297-480Q297-497 308-508Q319-519 336-519Q353-519 364-508L440-432V-800Q440-817 451.5-828.5Q463-840 480-840Q497-840 508.5-828.5Q520-817 520-800V-432L596-508Q607-519 624-519Q641-519 652-508Q663-497 663-480Q663-463 652-452L508-308Q502-302 495-299.5Q488-297 480-297Q472-297 465-299.5Q458-302 452-308Z",
  "vertical_align_center": "M440-248 404-212Q393-201 376-201Q359-201 348-212Q337-223 337-240Q337-257 348-268L452-372Q458-378 465-380.5Q472-383 480-383Q488-383 495-380.5Q502-378 508-372L612-268Q623-257 623-240Q623-223 612-212Q601-201 584-201Q567-201 556-212L520-248V-120Q520-103 508.5-91.5Q497-80 480-80Q463-80 451.5-91.5Q440-103 440-120ZM200-440Q183-440 171.5-451.5Q160-463 160-480Q160-497 171.5-508.5Q183-520 200-520H760Q777-520 788.5-508.5Q800-497 800-480Q800-463 788.5-451.5Q777-440 760-440ZM440-712V-840Q440-857 451.5-868.5Q463-880 480-880Q497-880 508.5-868.5Q520-857 520-840V-712L556-748Q567-759 584-759Q601-759 612-748Q623-737 623-720Q623-703 612-692L508-588Q502-582 495-579.5Q488-577 480-577Q472-577 465-579.5Q458-582 452-588L348-692Q337-703 337-720Q337-737 348-748Q359-759 376-759Q393-759 404-748Z",
  "vertical_align_top": "M200-760Q183-760 171.5-771.5Q160-783 160-800Q160-817 171.5-828.5Q183-840 200-840H760Q777-840 788.5-828.5Q800-817 800-800Q800-783 788.5-771.5Q777-760 760-760ZM440-160V-528L364-452Q353-441 336-441Q319-441 308-452Q297-463 297-480Q297-497 308-508L452-652Q458-658 465-660.5Q472-663 480-663Q488-663 495-660.5Q502-658 508-652L652-508Q663-497 663-480Q663-463 652-452Q641-441 624-441Q607-441 596-452L520-528V-160Q520-143 508.5-131.5Q497-120 480-120Q463-120 451.5-131.5Q440-143 440-160Z",
  "view_agenda": "M200-520Q167-520 143.5-543.5Q120-567 120-600V-760Q120-793 143.5-816.5Q167-840 200-840H760Q793-840 816.5-816.5Q840-793 840-760V-600Q840-567 816.5-543.5Q793-520 760-520ZM200-600H760Q760-600 760-600Q760-600 760-600V-760Q760-760 760-760Q760-760 760-760H200Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-360Q120-393 143.5-416.5Q167-440 200-440H760Q793-440 816.5-416.5Q840-393 840-360V-200Q840-167 816.5-143.5Q793-120 760-120ZM200-200H760Q760-200 760-200Q760-200 760-200V-360Q760-360 760-360Q760-360 760-360H200Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200ZM200-760Q200-760 200-760Q200-760 200-760V-600Q200-600 200-600Q200-600 200-600Q200-600 200-600Q200-600 200-600V-760Q200-760 200-760Q200-760 200-760ZM200-360Q200-360 200-360Q200-360 200-360V-200Q200-200 200-200Q200-200 200-200Q200-200 200-200Q200-200 200-200V-360Q200-360 200-360Q200-360 200-360Z",
  "view_column": "M121-280V-680Q121-713 144.5-736.5Q168-760 201-760H760Q793-760 816.5-736.5Q840-713 840-680V-280Q840-247 816.5-223.5Q793-200 760-200H201Q168-200 144.5-223.5Q121-247 121-280ZM200-280H333Q333-280 333-280Q333-280 333-280V-680Q333-680 333-680Q333-680 333-680H200Q200-680 200-680Q200-680 200-680V-280Q200-280 200-280Q200-280 200-280ZM413-280H546Q546-280 546-280Q546-280 546-280V-680Q546-680 546-680Q546-680 546-680H413Q413-680 413-680Q413-680 413-680V-280Q413-280 413-280Q413-280 413-280ZM626-280H759Q759-280 759-280Q759-280 759-280V-680Q759-680 759-680Q759-680 759-680H626Q626-680 626-680Q626-680 626-680V-280Q626-280 626-280Q626-280 626-280Z",
  "view_column_2": "M600-120Q567-120 543.5-143.5Q520-167 520-200V-760Q520-793 543.5-816.5Q567-840 600-840H760Q793-840 816.5-816.5Q840-793 840-760V-200Q840-167 816.5-143.5Q793-120 760-120ZM600-760V-200Q600-200 600-200Q600-200 600-200H760Q760-200 760-200Q760-200 760-200V-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760ZM200-120Q167-120 143.5-143.5Q120-167 120-200V-760Q120-793 143.5-816.5Q167-840 200-840H360Q393-840 416.5-816.5Q440-793 440-760V-200Q440-167 416.5-143.5Q393-120 360-120ZM200-760V-200Q200-200 200-200Q200-200 200-200H360Q360-200 360-200Q360-200 360-200V-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760ZM760-760Q760-760 760-760Q760-760 760-760H600Q600-760 600-760Q600-760 600-760Q600-760 600-760Q600-760 600-760H760Q760-760 760-760Q760-760 760-760ZM360-760Q360-760 360-760Q360-760 360-760H200Q200-760 200-760Q200-760 200-760Q200-760 200-760Q200-760 200-760H360Q360-760 360-760Q360-760 360-760Z",
  "view_compact_alt": "M340-300H420Q437-300 448.5-311.5Q460-323 460-340V-420Q460-437 448.5-448.5Q437-460 420-460H340Q323-460 311.5-448.5Q300-437 300-420V-340Q300-323 311.5-311.5Q323-300 340-300ZM340-500H420Q437-500 448.5-511.5Q460-523 460-540V-620Q460-637 448.5-648.5Q437-660 420-660H340Q323-660 311.5-648.5Q300-637 300-620V-540Q300-523 311.5-511.5Q323-500 340-500ZM540-300H620Q637-300 648.5-311.5Q660-323 660-340V-420Q660-437 648.5-448.5Q637-460 620-460H540Q523-460 511.5-448.5Q500-437 500-420V-340Q500-323 511.5-311.5Q523-300 540-300ZM540-500H620Q637-500 648.5-511.5Q660-523 660-540V-620Q660-637 648.5-648.5Q637-660 620-660H540Q523-660 511.5-648.5Q500-637 500-620V-540Q500-523 511.5-511.5Q523-500 540-500ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM160-240Q160-240 160-240Q160-240 160-240V-720Q160-720 160-720Q160-720 160-720Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240Z",
  "view_headline": "M199-360Q182-360 171-371.5Q160-383 160-400Q160-417 171.5-428.5Q183-440 200-440H761Q778-440 789-428.5Q800-417 800-400Q800-383 788.5-371.5Q777-360 760-360ZM199-200Q182-200 171-211.5Q160-223 160-240Q160-257 171.5-268.5Q183-280 200-280H761Q778-280 789-268.5Q800-257 800-240Q800-223 788.5-211.5Q777-200 760-200ZM199-520Q182-520 171-531.5Q160-543 160-560Q160-577 171.5-588.5Q183-600 200-600H761Q778-600 789-588.5Q800-577 800-560Q800-543 788.5-531.5Q777-520 760-520ZM199-680Q182-680 171-691.5Q160-703 160-720Q160-737 171.5-748.5Q183-760 200-760H761Q778-760 789-748.5Q800-737 800-720Q800-703 788.5-691.5Q777-680 760-680Z",
  "view_in_ar": "M440-181 240-296Q221-307 210.5-325Q200-343 200-365V-595Q200-617 210.5-635Q221-653 240-664L440-779Q459-790 480-790Q501-790 520-779L720-664Q739-653 749.5-635Q760-617 760-595V-365Q760-343 749.5-325Q739-307 720-296L520-181Q501-170 480-170Q459-170 440-181ZM440-273V-457L280-550V-365Q280-365 280-365Q280-365 280-365ZM520-273 680-365Q680-365 680-365Q680-365 680-365V-550L520-457ZM120-640Q103-640 91.5-651.5Q80-663 80-680V-800Q80-833 103.5-856.5Q127-880 160-880H280Q297-880 308.5-868.5Q320-857 320-840Q320-823 308.5-811.5Q297-800 280-800H160Q160-800 160-800Q160-800 160-800V-680Q160-663 148.5-651.5Q137-640 120-640ZM160-80Q127-80 103.5-103.5Q80-127 80-160V-280Q80-297 91.5-308.5Q103-320 120-320Q137-320 148.5-308.5Q160-297 160-280V-160Q160-160 160-160Q160-160 160-160H280Q297-160 308.5-148.5Q320-137 320-120Q320-103 308.5-91.5Q297-80 280-80ZM800-80H680Q663-80 651.5-91.5Q640-103 640-120Q640-137 651.5-148.5Q663-160 680-160H800Q800-160 800-160Q800-160 800-160V-280Q800-297 811.5-308.5Q823-320 840-320Q857-320 868.5-308.5Q880-297 880-280V-160Q880-127 856.5-103.5Q833-80 800-80ZM800-680V-800Q800-800 800-800Q800-800 800-800H680Q663-800 651.5-811.5Q640-823 640-840Q640-857 651.5-868.5Q663-880 680-880H800Q833-880 856.5-856.5Q880-833 880-800V-680Q880-663 868.5-651.5Q857-640 840-640Q823-640 811.5-651.5Q800-663 800-680ZM480-526 638-619 480-710Q480-710 480-710Q480-710 480-710L322-619ZM480-481ZM480-526ZM520-457ZM440-457Z",
  "view_sidebar": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM700-613H800Q800-613 800-613Q800-613 800-613V-720Q800-720 800-720Q800-720 800-720H700Q700-720 700-720Q700-720 700-720V-613Q700-613 700-613Q700-613 700-613ZM700-427H800Q800-427 800-427Q800-427 800-427V-533Q800-533 800-533Q800-533 800-533H700Q700-533 700-533Q700-533 700-533V-427Q700-427 700-427Q700-427 700-427ZM160-240H620Q620-240 620-240Q620-240 620-240V-720Q620-720 620-720Q620-720 620-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM700-240H800Q800-240 800-240Q800-240 800-240V-347Q800-347 800-347Q800-347 800-347H700Q700-347 700-347Q700-347 700-347V-240Q700-240 700-240Q700-240 700-240Z",
  "view_week": "M160-240H320Q320-240 320-240Q320-240 320-240V-720Q320-720 320-720Q320-720 320-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM400-240H560Q560-240 560-240Q560-240 560-240V-720Q560-720 560-720Q560-720 560-720H400Q400-720 400-720Q400-720 400-720V-240Q400-240 400-240Q400-240 400-240ZM640-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H640Q640-720 640-720Q640-720 640-720V-240Q640-240 640-240Q640-240 640-240ZM160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160Z",
  "visibility": "M480-320Q555-320 607.5-372.5Q660-425 660-500Q660-575 607.5-627.5Q555-680 480-680Q405-680 352.5-627.5Q300-575 300-500Q300-425 352.5-372.5Q405-320 480-320ZM480-392Q435-392 403.5-423.5Q372-455 372-500Q372-545 403.5-576.5Q435-608 480-608Q525-608 556.5-576.5Q588-545 588-500Q588-455 556.5-423.5Q525-392 480-392ZM61-462Q56-471 53.5-480.5Q51-490 51-500Q51-510 53.5-519.5Q56-529 61-538Q125-656 235.5-728Q346-800 480-800Q614-800 724.5-728Q835-656 899-538Q904-529 906.5-519.5Q909-510 909-500Q909-490 906.5-480.5Q904-471 899-462Q835-344 724.5-272Q614-200 480-200Q346-200 235.5-272Q125-344 61-462ZM480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500Q480-500 480-500ZM832-500Q782-601 687.5-660.5Q593-720 480-720Q367-720 272.5-660.5Q178-601 128-500Q178-399 272.5-339.5Q367-280 480-280Q593-280 687.5-339.5Q782-399 832-500Z",
  "warning": "M109-120Q98-120 89-125.5Q80-131 75-140Q70-149 69.5-159.5Q69-170 75-180L445-820Q451-830 460.5-835Q470-840 480-840Q490-840 499.5-835Q509-830 515-820L885-180Q891-170 890.5-159.5Q890-149 885-140Q880-131 871-125.5Q862-120 851-120ZM178-200H782L480-720ZM480-240Q497-240 508.5-251.5Q520-263 520-280Q520-297 508.5-308.5Q497-320 480-320Q463-320 451.5-308.5Q440-297 440-280Q440-263 451.5-251.5Q463-240 480-240ZM520-400V-520Q520-537 508.5-548.5Q497-560 480-560Q463-560 451.5-548.5Q440-537 440-520V-400Q440-383 451.5-371.5Q463-360 480-360Q497-360 508.5-371.5Q520-383 520-400ZM480-460Z",
  "web_asset": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H800Q800-240 800-240Q800-240 800-240V-640H160V-240Q160-240 160-240Q160-240 160-240Z",
  "width": "M273-440 308-403Q319-392 319-375.5Q319-359 308-348Q296-336 279.5-336Q263-336 252-348L148-451Q142-457 139-464.5Q136-472 136-480Q136-488 139-495Q142-502 148-508L252-612Q263-623 279.5-623Q296-623 308-612Q320-600 320-583.5Q320-567 308-555L273-520H687L651-556Q640-567 640-583.5Q640-600 652-612Q663-623 679.5-623Q696-623 708-612L811-508Q817-502 820-495Q823-488 823-480Q823-472 820-464.5Q817-457 811-451L707-347Q696-336 679.5-336Q663-336 651-348Q640-359 640-375.5Q640-392 651-403L687-440Z",
  "width_normal": "M160-160Q127-160 103.5-183.5Q80-207 80-240V-720Q80-753 103.5-776.5Q127-800 160-800H800Q833-800 856.5-776.5Q880-753 880-720V-240Q880-207 856.5-183.5Q833-160 800-160ZM160-240H320V-720H160Q160-720 160-720Q160-720 160-720V-240Q160-240 160-240Q160-240 160-240ZM400-240H560V-720H400ZM640-240H800Q800-240 800-240Q800-240 800-240V-720Q800-720 800-720Q800-720 800-720H640ZM400-240V-720V-240Z",
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
function place(menu, at) {
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x, y;
  if ("anchor" in at) {
    const r = at.anchor.getBoundingClientRect();
    if (at.side === "right") {
      x = r.right - 2;
      y = r.top - 5;
      if (x + mw > vw - 8) x = Math.max(8, r.left - mw + 2);
      if (y + mh > vh - 8) y = Math.max(8, vh - mh - 8);
    } else {
      x = r.left;
      y = r.bottom + 4;
      if (y + mh > vh - 8) y = r.top - mh - 4 >= 8 ? r.top - mh - 4 : Math.max(8, vh - mh - 8);
    }
  } else {
    x = at.x;
    y = at.y;
    if (y + mh > vh - 8) y = Math.max(8, y - mh);
  }
  if (x + mw > vw - 8) x = Math.max(8, vw - mw - 8);
  menu.style.left = `${Math.max(8, x)}px`;
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
      place(el, { anchor: b, side: "right" });
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
  place(el, at);
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
    const i = items2.indexOf(active);
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
        items2[(i + 1) % items2.length]?.focus();
        break;
      case "ArrowUp":
        handled();
        items2[(i - 1 + items2.length) % items2.length]?.focus();
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
        const open2 = items2[i]?._openSub;
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
        if (i >= 0) {
          handled();
          items2[i].click();
        }
        break;
      case "Tab":
        handled();
        closeMenus();
        break;
    }
  };
  const onBlur = () => closeMenus();
  const t = window.setTimeout(() => {
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("contextmenu", onDown, true);
    window.addEventListener("resize", onBlur);
    window.addEventListener("blur", onBlur);
  }, 0);
  document.addEventListener("keydown", onKey, true);
  detach = () => {
    window.clearTimeout(t);
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("contextmenu", onDown, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onBlur);
    window.removeEventListener("blur", onBlur);
  };
  return el;
}

// ../../../shared/ui/src/toolbar/dialog.ts
var LABELS = {
  en: { ok: "OK", cancel: "Cancel", close: "Close" },
  pt: { ok: "OK", cancel: "Cancelar", close: "Fechar" }
};
var open = /* @__PURE__ */ new Set();
function closeDialogs(layer) {
  for (const h of [...open]) if (!layer || layer.contains(h.el)) h.close(null);
  for (const d of layer?.querySelectorAll("dialog") ?? []) if (d.open) d.close();
}
var txt = (l, lang) => typeof l === "string" ? l : pickLabels(lang, l);
function openDialog(opts) {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const L = pickLabels(lang, LABELS);
  const dlg = document.createElement("dialog");
  dlg.className = "uo-dialog";
  dlg.setAttribute("part", "dialog");
  if (opts.width) dlg.style.width = `${opts.width}px`;
  const head = document.createElement("div");
  head.className = "uo-dialog-head";
  head.innerHTML = `${opts.icon ? `<span class="uo-dialog-icon">${symbol(opts.icon)}</span>` : ""}<span class="uo-dialog-title"></span><button type="button" class="uo-btn uo-dialog-x" title="${L.close}">${symbol("close")}</button>`;
  head.querySelector(".uo-dialog-title").textContent = txt(opts.title, lang);
  const body = document.createElement("div");
  body.className = "uo-dialog-body";
  if (typeof opts.body === "string") body.textContent = opts.body;
  else body.appendChild(opts.body);
  dlg.append(head, body);
  const actions = opts.actions ?? [{ id: "ok", label: L.ok, primary: true }];
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
  const L = pickLabels(lang, LABELS);
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
    actions: [{ id: "cancel", label: L.cancel }, { id: "ok", label: opts.ok ?? L.ok, primary: true }]
  });
  return await h.result === "ok" ? input.value : null;
}
function dialogTabs(tabs, selected) {
  const el = document.createElement("div");
  el.className = "uo-dtabs";
  const strip = document.createElement("div");
  strip.className = "uo-dtabs-strip";
  strip.setAttribute("role", "tablist");
  const panes2 = document.createElement("div");
  panes2.className = "uo-dtabs-panes";
  let cur = selected && tabs.some((t) => t.id === selected) ? selected : tabs[0]?.id ?? "";
  const buttons = tabs.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "uo-dtab";
    b.setAttribute("role", "tab");
    b.textContent = t.label;
    b.addEventListener("click", () => select(t.id));
    b.addEventListener("keydown", (e) => {
      const i = tabs.findIndex((x) => x.id === cur);
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n.id);
      buttons[tabs.indexOf(n)].focus();
    });
    strip.append(b);
    t.body.classList.add("uo-dtab-pane");
    t.body.setAttribute("role", "tabpanel");
    panes2.append(t.body);
    return b;
  });
  function select(id) {
    cur = id;
    tabs.forEach((t, i) => {
      const on = t.id === id;
      buttons[i].classList.toggle("uo-on", on);
      buttons[i].setAttribute("aria-selected", String(on));
      buttons[i].tabIndex = on ? 0 : -1;
      t.body.classList.toggle("uo-off", !on);
      t.body.inert = !on;
    });
  }
  select(cur);
  el.append(strip, panes2);
  return { el, select, current: () => cur };
}
function showToast(layer, message, ms = 2600) {
  layer.querySelector(":scope > .uo-toast")?.remove();
  const t = document.createElement("div");
  t.className = "uo-toast";
  t.setAttribute("role", "status");
  t.textContent = message;
  layer.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
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

// ../../../shared/ui/src/toolbar/collapse.ts
function planCollapse(groups, avail, opts) {
  const idx = groups.map((_, i) => i);
  const w = (arr) => arr.reduce((s, i) => s + groups[i].width - (groups[i].shrink ?? 0), 0);
  const byPrio = (a, b) => groups[a].prio - groups[b].prio || b - a;
  const always = idx.filter((i) => groups[i].prio <= 0);
  let inline = idx.filter((i) => groups[i].prio > 0);
  const collapsed = [];
  const moreW = () => always.length || collapsed.length ? opts.moreW : 0;
  while (w(inline) + collapsed.length * opts.trigW + moreW() > avail) {
    const cand = inline.filter((i) => groups[i].prio < 9).sort(byPrio)[0];
    if (cand === void 0) break;
    inline = inline.filter((i) => i !== cand);
    collapsed.push(cand);
  }
  let triggers = [...collapsed];
  const more = [...always];
  while (triggers.length && w(inline) + triggers.length * opts.trigW + opts.moreW > avail) {
    const c2 = [...triggers].sort(byPrio)[0];
    triggers = triggers.filter((i) => i !== c2);
    more.push(c2);
  }
  const plan = {
    inline,
    triggers: triggers.sort((a, b) => a - b),
    more: more.sort(byPrio)
  };
  if (groups.some((g) => (g.shrink ?? 0) > 0)) {
    const full = inline.reduce((s, i) => s + groups[i].width, 0);
    let deficit = full + plan.triggers.length * opts.trigW + (plan.more.length ? opts.moreW : 0) - avail;
    plan.give = groups.map(() => 0);
    for (const i of [...inline].sort(byPrio)) {
      if (deficit <= 0) break;
      const g = Math.min(groups[i].shrink ?? 0, deficit);
      plan.give[i] = g;
      deficit -= g;
    }
  }
  return plan;
}

// ../../../shared/ui/src/toolbar/gallery.ts
var L_UP = { en: "Previous row", pt: "Linha anterior" };
var L_DOWN = { en: "Next row", pt: "Pr\xF3xima linha" };
var L_MORE = { en: "More", pt: "Mais" };
var GAP = 2;
var PAD = 6;
var openGrid = null;
function closeGallery() {
  openGrid?.close();
}
function renderGallery(cfg, ctx, inline) {
  const reg = ctx.registry;
  const t = (l) => reg.text(l);
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
    b.title = t(it.tip ?? it.label);
    b.setAttribute("aria-label", t(it.label));
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
    const i = list.indexOf(b);
    const n = parseInt(getComputedStyle(grid).gridTemplateColumns.split(" ").length.toString(), 10) || cols;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n };
    if (step[e.key] === void 0) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(list.length - 1, i + step[e.key]));
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
    b.title = t(lbl);
    b.setAttribute("aria-label", t(lbl));
    b.innerHTML = symbol(icon);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    ripple(b);
    return b;
  };
  if (inline) {
    root.className = "uo-gal";
    root.setAttribute("role", "listbox");
    root.setAttribute("aria-label", t(cfg.label));
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
    root.title = t(cfg.label);
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
      const i = items.findIndex((x) => x.id === b.dataset["id"]);
      const row = Math.floor(i / cols);
      b.tabIndex = row >= top && row < top + rows ? 0 : -1;
    }
  };
  const reveal = () => {
    const i = items.findIndex((x) => x.id === sel);
    if (i < 0) return;
    const row = Math.floor(i / cols);
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
    pop.setAttribute("aria-label", t(cfg.label));
    const n = cfg.expandCols ?? maxCols;
    const secs = cfg.sections?.length ? cfg.sections : [{ id: "", label: "" }];
    for (const s of secs) {
      const its = cfg.sections?.length ? items.filter((it) => (it.section ?? "") === s.id) : items;
      if (!its.length) continue;
      if (s.label) {
        const h = document.createElement("div");
        h.className = "uo-pop-lbl";
        h.textContent = t(s.label);
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
          b.innerHTML = `<span class="lead">${m.icon ? symbol(m.icon) : ""}</span><span class="lb">${esc(m.label === void 0 ? "" : t(m.label))}</span>` + (m.shortcut ? `<span class="sc">${esc(m.shortcut)}</span>` : "");
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
      if (path.some((x) => x instanceof HTMLElement && x.classList.contains("uo-menu"))) return;
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
      const key = its.map((x) => `${x.id}${t(x.label)}`).join("");
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
      if (trigText) trigText.textContent = items.find((x) => x.id === sel) ? t(items.find((x) => x.id === sel).label) : "";
    }
  };
}

// ../../../shared/ui/src/toolbar/items.ts
function ripple(el) {
  if (customElements.get("u-ripple") && !el.querySelector(":scope > u-ripple")) {
    el.appendChild(document.createElement("u-ripple"));
  }
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
    const b2 = button(`uo-btn${size2 === "large" ? " uo-btn-lg" : ""}${showLabel2 ? " uo-btn-lbl" : ""}`);
    b2.dataset["a"] = cmd;
    b2.title = reg.tooltip(cmd);
    b2.setAttribute("aria-label", reg.label(cmd));
    b2.innerHTML = (icon ? symbol(icon) : "") + (showLabel2 || !icon ? `<span class="uo-lbl">${esc(reg.label(cmd))}</span>` : "") + (c2?.color ? '<span class="uo-swbar"></span>' : "");
    ripple(b2);
    b2.addEventListener("click", () => {
      void reg.run(cmd);
    });
    const bar = b2.querySelector(".uo-swbar");
    return {
      el: b2,
      visible: () => reg.supported(cmd),
      sync: () => {
        const v = reg.supported(cmd);
        b2.hidden = !v;
        if (!v) return;
        b2.disabled = !reg.enabled(cmd);
        if (c2?.isChecked) {
          const on = reg.checked(cmd);
          b2.classList.toggle("uo-on", on);
          b2.setAttribute("aria-pressed", String(on));
        }
        if (bar) bar.style.background = c2.color() ?? "transparent";
      }
    };
  }
  if ("split" in item) {
    const cmd = item.split;
    const main = renderItem({ cmd, size: item.size ?? defSize }, ctx, defSize);
    const wrap = document.createElement("span");
    wrap.className = `uo-split${(item.size ?? defSize) === "large" ? " uo-split-lg" : ""}`;
    const arrow = button("uo-btn uo-split-arrow");
    arrow.dataset["a"] = `${cmd}:menu`;
    arrow.title = reg.tooltip(cmd);
    arrow.innerHTML = symbol("arrow_drop_down");
    ripple(arrow);
    const src = item.menu;
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(wrap, src, ctx);
    });
    wrap.append(main.el, arrow);
    return {
      el: wrap,
      visible: main.visible,
      sync: () => {
        main.sync();
        wrap.hidden = !main.visible();
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

// ../../../shared/ui/src/toolbar/compact.ts
var MORE_LABEL = { en: "More tools", pt: "Mais ferramentas" };
var MENU_LABEL = { en: "Menu", pt: "Menu" };
var TRIG_W = 50;
var MORE_W = 46;
var PAD2 = 16;
function createCompactBar(container, cfg, ctx) {
  const reg = ctx.registry;
  const root = document.createElement("div");
  root.className = "uo-bar uo-compact";
  root.setAttribute("part", "toolbar");
  const titlebar = document.createElement("div");
  titlebar.className = "uo-titlebar";
  titlebar.setAttribute("part", "titlebar");
  const synced = [];
  if (cfg.title) {
    const t = renderItem(cfg.title, ctx);
    t.el.classList.add("uo-title");
    titlebar.appendChild(t.el);
    synced.push(t);
  }
  const menubar = document.createElement("nav");
  menubar.className = "uo-menubar";
  menubar.setAttribute("role", "menubar");
  menubar.setAttribute("part", "menubar");
  const mbtns = [];
  const openTop = (i, focus) => {
    const b = mbtns[i];
    const m = cfg.menus[i];
    b.classList.add("uo-open");
    openMenu(m.items, { anchor: b }, {
      lang: ctx.lang,
      registry: reg,
      layer: ctx.layer,
      focus,
      onClose: () => b.classList.remove("uo-open"),
      onNavigate: (dir) => openTop((i + dir + mbtns.length) % mbtns.length, true)
    });
  };
  cfg.menus.forEach((m, i) => {
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
      openTop(i, e.detail === 0);
    });
    b.addEventListener("mouseenter", () => {
      if (isMenuOpen() && mbtns.some((x) => isMenuOpenFor(x)) && !isMenuOpenFor(b)) openTop(i, false);
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
  titlebar.append(burger, menubar);
  const spacer = document.createElement("span");
  spacer.className = "uo-spacer";
  titlebar.appendChild(spacer);
  for (const t of cfg.trailing ?? []) {
    const r = renderItem(t, ctx);
    titlebar.appendChild(r.el);
    synced.push(r);
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
  root.append(titlebar, row);
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
    for (const i of plan.inline) toolbar.appendChild(vis[i].el);
    for (const i of plan.triggers) toolbar.appendChild(makeTrigger(vis[i]));
    if (plan.more.length) toolbar.appendChild(makeMore(plan.more.map((i) => vis[i])));
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
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    }
  };
}

// ../../../shared/ui/src/toolbar/ribbon.ts
var L_COLLAPSE = { en: "Collapse the ribbon", pt: "Recolher a faixa de op\xE7\xF5es" };
var L_EXPAND = { en: "Expand the ribbon", pt: "Expandir a faixa de op\xE7\xF5es" };
var L_MORE2 = { en: "More", pt: "Mais" };
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
          const x = renderItem(it, ctx, "small");
          rowEl.appendChild(x.el);
          items.push(x);
        }
        col.appendChild(rowEl);
      }
      body.appendChild(col);
    } else {
      const x = renderItem(cell, ctx, "large");
      body.appendChild(x.el);
      items.push(x);
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
    const t = renderItem(cfg.title, ctx);
    t.el.classList.add("uo-title");
    titlebar.appendChild(t.el);
    synced.push(t);
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
  root.append(titlebar, tabsEl, body);
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `uo-tab${def.contextual ? " uo-tab-ctx" : ""}${def.menu ? " uo-tab-file" : ""}`;
    btn.dataset["tab"] = def.id;
    btn.setAttribute("role", "tab");
    btn.textContent = reg.text(def.label);
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    ripple(btn);
    tabScroller.appendChild(btn);
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
    const st = { def, btn, panel, stash, groups, measured: false, visible: true };
    btn.addEventListener("click", (e) => {
      if (def.menu) {
        e.stopPropagation();
        if (isMenuOpenFor(btn)) {
          closeMenus();
          return;
        }
        toggleMenu(btn, def.menu, ctx, e.detail === 0);
        return;
      }
      if (collapsed) setCollapsed(false);
      select(st);
    });
    return st;
  });
  const select = (t) => {
    if (active === t) return;
    closePopover();
    for (const x of tabs) {
      const on = x === t;
      x.btn.classList.toggle("uo-on", on);
      x.btn.setAttribute("aria-selected", String(on));
      x.panel.hidden = !on;
    }
    active = t;
    schedule();
  };
  const makeTrigger = (t, g) => {
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
      openPopover(b, [{ el: g.el, label: "", home: t.stash }], ctx.layer);
    });
    ripple(b);
    return b;
  };
  const makeMore = (t, gs) => {
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
      openPopover(b, gs.map((g) => ({ el: g.el, label: reg.text(g.def.label), home: t.stash })), ctx.layer);
    });
    ripple(b);
    return b;
  };
  const relayout = () => {
    const t = active;
    if (!t || !root.isConnected || collapsed || t.panel.clientWidth === 0) return;
    closePopover();
    const vis = t.groups.filter((g) => g.visible);
    for (const g of t.groups) for (const r of g.items) r.fit?.(0);
    if (!t.measured || vis.some((g) => g.width === 0)) {
      for (const g of vis) t.panel.appendChild(g.el);
      t.panel.querySelectorAll(":scope > .uo-rtrig").forEach((e) => e.remove());
      for (const g of vis) g.width = g.el.getBoundingClientRect().width + 2;
      t.measured = true;
    }
    t.panel.querySelectorAll(":scope > .uo-rtrig").forEach((e) => e.remove());
    const shrinkOf = (g) => g.items.reduce((s, r) => s + (r.shrink?.() ?? 0), 0);
    const plan = planCollapse(
      vis.map((g) => ({ prio: g.def.prio ?? 5, width: g.width, shrink: shrinkOf(g) })),
      t.panel.clientWidth - PAD3,
      { trigW: TRIG_W2, moreW: MORE_W2 }
    );
    for (const g of t.groups) t.stash.appendChild(g.el);
    const inline = new Set(plan.inline), trig = new Set(plan.triggers);
    vis.forEach((g, i) => {
      if (inline.has(i)) t.panel.appendChild(g.el);
      else if (trig.has(i)) t.panel.appendChild(makeTrigger(t, g));
    });
    if (plan.more.length) t.panel.appendChild(makeMore(t, plan.more.map((i) => vis[i])));
    plan.give?.forEach((px, i) => {
      let left = px;
      for (const r of vis[i].items) {
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
    for (const t of tabs) t.measured = false;
    schedule();
  });
  const sync = () => {
    for (const r of synced) r.sync();
    let surfaced = null;
    for (const t of tabs) {
      let changed = false;
      for (const g of t.groups) {
        for (const r of g.items) r.sync();
        const v2 = g.items.some((r) => r.visible());
        g.el.hidden = !v2;
        if (v2 !== g.visible) {
          g.visible = v2;
          changed = true;
        }
      }
      if (changed) t.measured = false;
      const ctxOk = t.def.contextual ? !!t.def.contextual() : true;
      const v = ctxOk && (!!t.def.menu || t.groups.some((g) => g.visible));
      if (v && !t.visible && t.def.contextual) surfaced = t;
      t.visible = v;
      t.btn.hidden = !v;
      if (changed && t === active) schedule();
    }
    if (surfaced) select(surfaced);
    else if (active && !active.visible) select(tabs.find((t) => t.visible && !t.def.menu && !t.def.contextual));
  };
  setCollapsed(false);
  sync();
  select(tabs.find((t) => t.visible && !t.def.menu) ?? tabs[0]);
  relayout();
  return {
    el: root,
    sync,
    relayout: () => {
      for (const t of tabs) t.measured = false;
      relayout();
    },
    destroy: () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      closePopover();
      root.remove();
    }
  };
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
.uo-menubar { display: flex; gap: 0; min-width: 0; overflow: hidden; flex: 0 1 auto; }
.uo-mbtn {
  border: 0; background: transparent; color: ${ON}; font: inherit; font-size: 14px;
  padding: 4px 9px; border-radius: 6px; cursor: pointer; white-space: nowrap; flex: none;
}
.uo-mbtn:hover, .uo-mbtn.uo-open { background: ${HIGHEST}; }

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

/* \u2500\u2500 campos (seletores de texto, tamanho, t\xEDtulo) \u2500\u2500 */
.uo-combo { justify-content: space-between; padding: 0 2px 0 8px; color: ${ON}; }
.uo-combo .uo-drop-text { text-align: left; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; font-weight: 400; }
.uo-num {
  height: 28px; width: 40px; padding: 0; text-align: center; font: inherit; font-size: 13px;
  border: 1px solid ${OUTLINE_VAR}; border-radius: 6px; background: ${LOWEST}; color: ${ON}; flex: none;
}
.uo-num:focus { outline: none; border-color: ${PRIMARY}; }
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

// ../../../shared/ui/src/toolbar/colors.ts
var BASE = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
var STANDARD = ["C00000", "FF0000", "FFC000", "FFFF00", "92D050", "00B050", "00B0F0", "0070C0", "002060", "7030A0"];
function mix(hex, f) {
  const n = parseInt(hex, 16);
  const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
  return ch.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
var WHITE = ["F2F2F2", "D9D9D9", "BFBFBF", "A6A6A6", "808080"];
var BLACK = ["7F7F7F", "595959", "404040", "262626", "0D0D0D"];
var OFFICE_COLORS = [
  ...BASE,
  ...[0.8, 0.6, 0.4, -0.25, -0.5].flatMap((f, row) => BASE.map((h, i) => i === 0 ? WHITE[row] : i === 1 ? BLACK[row] : mix(h, f))),
  ...STANDARD
];
var HIGHLIGHT_COLORS = [
  { value: "yellow", css: "#FFFF00", label: { en: "Yellow", pt: "Amarelo" } },
  { value: "green", css: "#00FF00", label: { en: "Bright green", pt: "Verde brilhante" } },
  { value: "cyan", css: "#00FFFF", label: { en: "Turquoise", pt: "Turquesa" } },
  { value: "magenta", css: "#FF00FF", label: { en: "Pink", pt: "Rosa" } },
  { value: "blue", css: "#0000FF", label: { en: "Blue", pt: "Azul" } },
  { value: "red", css: "#FF0000", label: { en: "Red", pt: "Vermelho" } },
  { value: "darkBlue", css: "#000080", label: { en: "Dark blue", pt: "Azul escuro" } },
  { value: "darkCyan", css: "#008080", label: { en: "Teal", pt: "Verde-azulado" } },
  { value: "darkGreen", css: "#008000", label: { en: "Green", pt: "Verde" } },
  { value: "darkMagenta", css: "#800080", label: { en: "Violet", pt: "Violeta" } },
  { value: "darkRed", css: "#800000", label: { en: "Dark red", pt: "Vermelho escuro" } },
  { value: "darkYellow", css: "#808000", label: { en: "Dark yellow", pt: "Amarelo escuro" } },
  { value: "darkGray", css: "#808080", label: { en: "Gray 50%", pt: "Cinza 50%" } },
  { value: "lightGray", css: "#C0C0C0", label: { en: "Gray 25%", pt: "Cinza 25%" } },
  { value: "black", css: "#000000", label: { en: "Black", pt: "Preto" } }
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
var THEME_SLOTS = ["background1", "text1", "background2", "text2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
var SLOT_KEY = { background1: "lt1", text1: "dk1", background2: "lt2", text2: "dk2" };
function themeTintHex(hex, tint, shade) {
  if (!tint && !shade) return hex.toUpperCase();
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let l = (mx + mn) / 2, h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  if (shade) l *= parseInt(shade, 16) / 255;
  if (tint) {
    const t = parseInt(tint, 16) / 255;
    l = l * t + 1 - t;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (x) => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.max(0, Math.min(255, Math.floor(v * 255))).toString(16).padStart(2, "0");
  };
  return (ch(h + 1 / 3) + ch(h) + ch(h - 1 / 3)).toUpperCase();
}
function themeVariants(hex) {
  const n = parseInt(hex, 16);
  const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
  const h2 = (x) => Math.round(x * 255).toString(16).toUpperCase().padStart(2, "0");
  const lighter = (p) => ({ tint: h2(1 - p), pct: p });
  const darker = (p) => ({ shade: h2(1 - p), pct: -p });
  if (l >= 0.999) return [0.05, 0.15, 0.25, 0.35, 0.5].map(darker);
  if (l <= 1e-3) return [0.5, 0.35, 0.25, 0.15, 0.05].map(lighter);
  if (l > 0.8) return [0.1, 0.25, 0.5, 0.75, 0.9].map(darker);
  if (l < 0.2) return [0.9, 0.75, 0.5, 0.25, 0.1].map(lighter);
  return [lighter(0.8), lighter(0.6), lighter(0.4), darker(0.25), darker(0.5)];
}
function themePaletteColors(colors, names) {
  const base = THEME_SLOTS.map((s) => (colors[SLOT_KEY[s] ?? s] ?? "000000").toUpperCase());
  const out = THEME_SLOTS.map((s, i) => ({
    value: `theme|${s}||`,
    css: `#${base[i]}`,
    ...names ? { title: names(s, 0) } : {}
  }));
  const vars = base.map((h) => themeVariants(h));
  for (let row = 0; row < 5; row++) {
    THEME_SLOTS.forEach((s, i) => {
      const v = vars[i][row];
      out.push({ value: `theme|${s}|${v.tint ?? ""}|${v.shade ?? ""}`, css: `#${themeTintHex(base[i], v.tint, v.shade)}`, ...names ? { title: names(s, v.pct) } : {} });
    });
  }
  return out;
}
function parseThemePick(value, colors) {
  const m = /^theme\|([^|]*)\|([^|]*)\|([^|]*)$/.exec(value);
  if (!m) return null;
  const slot = m[1];
  const base = (colors[SLOT_KEY[slot] ?? slot] ?? "000000").toUpperCase();
  return { themeColor: slot, ...m[2] ? { tint: m[2] } : {}, ...m[3] ? { shade: m[3] } : {}, hex: themeTintHex(base, m[2] || void 0, m[3] || void 0) };
}
var STANDARD_COLORS = STANDARD;

// ../../../shared/ui/src/toolbar/pane.ts
var LABELS2 = { en: { close: "Close" }, pt: { close: "Fechar" } };
var panes = /* @__PURE__ */ new Map();
function openPane(o) {
  const cur = panes.get(o.id);
  if (cur) {
    cur.place();
    return cur;
  }
  const lang = o.lang ?? DEFAULT_UI_LANG;
  const L = pickLabels(lang, LABELS2);
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
  const x = document.createElement("button");
  x.type = "button";
  x.className = "uo-btn uo-pane-x";
  x.dataset["a"] = `pane:${o.id}:close`;
  x.title = L.close;
  x.setAttribute("aria-label", L.close);
  x.innerHTML = symbol("close");
  head.append(title, x);
  const body = o.body;
  body.classList.add("uo-pane-body");
  el.append(head, body);
  if (o.footer) {
    o.footer.classList.add("uo-pane-foot");
    el.appendChild(o.footer);
  }
  el.setAttribute("aria-label", txt2(o.title));
  o.layer.appendChild(el);
  const place2 = () => {
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
  const onWin = () => place2();
  window.addEventListener("resize", onWin);
  window.addEventListener("scroll", onWin, true);
  const handle = {
    el,
    body,
    get open() {
      return open2;
    },
    place: place2,
    setTitle: (t) => {
      title.textContent = txt2(t);
      el.setAttribute("aria-label", txt2(t));
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
  x.addEventListener("click", () => handle.close());
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target === el) handle.close();
  });
  panes.set(o.id, handle);
  place2();
  return handle;
}

export {
  writeOdt,
  isOdt,
  readOdt,
  METRIC_SUBSTITUTES,
  FontResolver,
  subsetTrueType,
  DEFAULT_EMBEDDING,
  COMMON_FONTS,
  planFontEmbedding,
  readDocxEmbedding,
  writeDocxEmbedding,
  CommandRegistry,
  symbol,
  isMenuOpen,
  closeMenus,
  openMenu,
  closeDialogs,
  openDialog,
  promptDialog,
  dialogTabs,
  showToast,
  ripple,
  toggleMenu,
  renderItem,
  closePopover,
  createCompactBar,
  createRibbon,
  OFFICE_COLORS,
  HIGHLIGHT_COLORS,
  colorGrid,
  themePaletteColors,
  parseThemePick,
  STANDARD_COLORS,
  openPane,
  ensureBarStyles
};
