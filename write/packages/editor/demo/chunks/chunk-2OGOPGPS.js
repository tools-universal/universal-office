import {
  DEFAULT_RUN_PROPS,
  childElements,
  firstChild,
  parseXml,
  unzipSync,
  zipSync
} from "./chunk-WKEEN2RM.js";

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
    const c = ctx.comments.get(id);
    if (!c) continue;
    ctx.emittedComments.add(id);
    const author = c.author ? `<dc:creator>${xmlEscape(c.author)}</dc:creator>` : "";
    out += `<office:annotation>${author}<text:p>${escapeText(c.text)}</text:p></office:annotation>`;
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
  const stack = [];
  for (const p of items) {
    const num = p.props.numbering;
    const node = { paras: [p], children: [], ilvl: num.ilvl, kind: num.kind };
    while (stack.length && stack[stack.length - 1].ilvl >= num.ilvl) stack.pop();
    if (stack.length === 0) root.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
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
  const ctx = {
    paraStyles: /* @__PURE__ */ new Map(),
    runStyles: /* @__PURE__ */ new Map(),
    paraStyleDefs: [],
    runStyleDefs: [],
    pictures: [],
    options: { images: options.images ?? "embed" },
    comments: new Map(doc.comments.map((c) => [c.id, c])),
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
      for (const c of childElements(el)) readBodyChild(c, blocks, ctx, listDepth);
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
    for (const c of p.children) children.push(c);
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
  for (const c of el.children) out += typeof c === "string" ? c : textOf(c);
  return out;
}
function readList(listEl, blocks, ctx, depth) {
  const ilvl = depth;
  const kind = resolveListKind(ctx, listEl, depth);
  for (const item of childElements(listEl, "text:list-item")) {
    readListItem(item, blocks, ctx, depth, ilvl, kind);
  }
  for (const header of childElements(listEl, "text:list-header")) {
    for (const c of childElements(header)) {
      if (c.name === "text:p" || c.name === "text:h") {
        blocks.push({ type: "paragraph", paragraph: readParagraph(c, ctx, void 0) });
      }
    }
  }
}
function readListItem(item, blocks, ctx, depth, ilvl, kind) {
  for (const c of childElements(item)) {
    if (c.name === "text:p" || c.name === "text:h") {
      blocks.push({ type: "paragraph", paragraph: readParagraph(c, ctx, { kind, ilvl }) });
    } else if (c.name === "text:list") {
      readList(c, blocks, ctx, depth + 1);
    }
  }
}
function resolveListKind(ctx, listEl, depth) {
  const level = depth + 1;
  const direct = listEl.attrs["text:style-name"];
  const fromDirect = lookupListKind(ctx, direct, level);
  if (fromDirect) return fromDirect;
  for (const item of childElements(listEl, "text:list-item")) {
    for (const c of childElements(item, "text:p")) {
      const resolved = resolveStyle(ctx.styleIndex, c.attrs["text:style-name"]);
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
    (max, r) => Math.max(max, r.cells.reduce((s, c) => s + c.gridSpan, 0)),
    colWidths.length
  );
  const gridColsTwips = buildGridCols(colWidths, totalCols);
  return { type: "table", rows, gridColsTwips };
}
function collectRows(tblEl) {
  const out = [];
  for (const c of childElements(tblEl)) {
    if (c.name === "table:table-row") out.push(c);
    else if (c.name === "table:table-header-rows" || c.name === "table:table-row-group") {
      out.push(...childElements(c, "table:table-row"));
    }
  }
  return out;
}
function readColumns(tblEl, ctx) {
  const widths = [];
  const visit = (el) => {
    for (const c of childElements(el)) {
      if (c.name === "table:table-column") {
        const repeat = parseInt(c.attrs["table:number-columns-repeated"] ?? "1", 10);
        const w = columnWidth(c, ctx.styleIndex);
        for (let i = 0; i < (Number.isNaN(repeat) || repeat < 1 ? 1 : repeat); i++) widths.push(w);
      } else if (c.name === "table:table-columns" || c.name === "table:table-header-columns") {
        visit(c);
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
  for (const c of childElements(cellEl)) {
    readBodyChild(c, innerBlocks, ctx, 0);
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
  for (const c of childElements(box)) readBodyChild(c, blocks, ctx, 0);
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
    const c = context();
    if (!c) return 0;
    c.font = font;
    return c.measureText(PROBE_TEXT).width;
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
  writeDocxEmbedding
};
