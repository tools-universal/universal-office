import {
  DEFAULT_EMBEDDING,
  FontResolver,
  METRIC_SUBSTITUTES,
  planFontEmbedding,
  readDocxEmbedding,
  readOdt,
  subsetTrueType,
  writeDocxEmbedding,
  writeOdt
} from "./chunks/chunk-2OGOPGPS.js";
import {
  DEFAULT_RUN_PROPS,
  DocxPackage,
  applyParaProps,
  applyRunProps,
  comparePos,
  convertDocToDocx,
  deleteRange,
  editBaseProps,
  insertRun,
  insertText,
  isWordBinary,
  markSectionBreaks,
  mergeWithPrevious,
  normalizeRange,
  onBrowserLangChange,
  paraLength,
  paraPropsFromPPr,
  paraText,
  pickLabels,
  propsAt,
  readEmbeddedFonts,
  readFullDocument,
  runPropsFromRPr,
  splitParagraph,
  uiLang,
  unzlibSync,
  writeDocument,
  zipSync,
  zlibSync
} from "./chunks/chunk-WKEEN2RM.js";

// ../docx-core/src/export/model.ts
function orderedBlocks(doc) {
  const out = [];
  const byPara = /* @__PURE__ */ new Map();
  for (const a of doc.tableAnchors ?? []) {
    const arr = byPara.get(a.beforePara) ?? [];
    arr.push(a.table);
    byPara.set(a.beforePara, arr);
  }
  for (let i = 0; i < doc.paragraphs.length; i++) {
    for (const t of byPara.get(i) ?? []) out.push({ kind: "table", t });
    out.push({ kind: "para", p: doc.paragraphs[i] });
  }
  for (const t of byPara.get(doc.paragraphs.length) ?? []) out.push({ kind: "table", t });
  return out;
}
function headingLevel(p) {
  const id = p.props.styleId ?? "";
  let m = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i);
  if (m) return Math.min(6, parseInt(m[1], 10));
  m = id.match(/^h([1-6])$/i);
  if (m) return parseInt(m[1], 10);
  if (/^(title|t[íi]tulo)$/i.test(id)) return 1;
  return 0;
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function imgMime(ext) {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "gif") return "image/gif";
  if (e === "bmp") return "image/bmp";
  if (e === "svg") return "image/svg+xml";
  if (e === "webp") return "image/webp";
  if (e === "tif" || e === "tiff") return "image/tiff";
  return `image/${e}`;
}
function base64(bytes) {
  let bin = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const g = globalThis;
  if (typeof g.btoa === "function") return g.btoa(bin);
  if (g.Buffer) return g.Buffer.from(bin, "binary").toString("base64");
  throw new Error("sem base64 (btoa/Buffer) no ambiente");
}
function dataUri(img) {
  return `data:${imgMime(img.ext)};base64,${base64(img.data)}`;
}
function resolveImageUri(img, cache) {
  const cached = cache?.get(img);
  return cached ?? dataUri(img);
}
var twipsToPx = (t) => Math.round(t / 1440 * 96);
var twipsToPt = (t) => +(t / 20).toFixed(2);
var halfPtToPt = (h) => h / 2;

// ../docx-core/src/export/html.ts
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
  if (s === "dashed" || s === "dotted" || s === "double") return s;
  if (s === "none" || s === "nil") return "none";
  return "solid";
}
function edgeCss(e) {
  const w = Math.max(0.5, e.sizeEighthPt / 8);
  return `${w}pt ${cssBorderStyle(e.style)} ${e.color ? "#" + e.color : "#000"}`;
}
function runHtml(run, ctx) {
  if (run.image) {
    if (ctx.imagesMode === "omit") {
      return `<span class="uw-img-placeholder" aria-label="imagem" style="display:inline-block;padding:0 .35em;margin:0 .15em;background:rgba(0,0,0,.06);border-radius:4px;font-size:.9em;color:#777">\u{1F4F7}</span>`;
    }
    const w = twipsToPx(run.image.widthTwips);
    const h = twipsToPx(run.image.heightTwips);
    return `<img src="${resolveImageUri(run.image, ctx.imageDataUris)}" width="${w}" height="${h}" alt="" loading="lazy">`;
  }
  const p = run.props;
  if (run.noteRef) {
    const seq = ctx.notes.length + 1;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const noteHtml = paras?.map((np) => np.runs.map((r) => escapeHtml(r.text)).join("")).join(" ").trim() ?? "";
    ctx.notes.push({ kind: run.noteRef.kind, id: run.noteRef.id, html: escapeHtml(noteHtml) });
    return `<sup class="uw-note"><a id="noteref-${seq}" href="#note-${seq}">${seq}</a></sup>`;
  }
  let text = escapeHtml(run.text);
  if (!text) return "";
  const styles = [];
  if (p.color) styles.push(`color:#${p.color}`);
  if (p.szHalfPt) styles.push(`font-size:${halfPtToPt(p.szHalfPt)}pt`);
  if (p.highlight) styles.push(`background-color:${HIGHLIGHTS[p.highlight] ?? p.highlight}`);
  if (p.fontAscii) styles.push(`font-family:'${p.fontAscii}',serif`);
  if (p.allCaps) styles.push("text-transform:uppercase");
  if (p.smallCaps) styles.push("font-variant:small-caps");
  if (p.charSpacingTwips) styles.push(`letter-spacing:${twipsToPt(p.charSpacingTwips)}pt`);
  let inner = text;
  if (p.bold) inner = `<strong>${inner}</strong>`;
  if (p.italic) inner = `<em>${inner}</em>`;
  if (p.strike || p.doubleStrike) inner = `<s>${inner}</s>`;
  if (p.underline) inner = `<u>${inner}</u>`;
  if (p.vertAlign === "superscript") inner = `<sup>${inner}</sup>`;
  else if (p.vertAlign === "subscript") inner = `<sub>${inner}</sub>`;
  if (styles.length) inner = `<span style="${styles.join(";")}">${inner}</span>`;
  if (p.link) inner = `<a href="${escapeAttr(p.link)}">${inner}</a>`;
  if (p.commentIds?.length) {
    for (const id of p.commentIds) ctx.usedComments.add(id);
    const tips = p.commentIds.map((id) => {
      const c = ctx.comments.get(id);
      return c ? `${c.author ?? "An\xF4nimo"}: ${c.text}` : "";
    }).filter(Boolean).join(" | ");
    inner = `<span class="uw-comment" data-comment="${p.commentIds.join(",")}" title="${escapeAttr(tips)}">${inner}</span>`;
  }
  return inner;
}
function paraStyles(p) {
  const s = [];
  const a = p.props.alignment;
  if (a === "center") s.push("text-align:center");
  else if (a === "right") s.push("text-align:right");
  else if (a === "both") s.push("text-align:justify");
  if (p.props.indentLeftTwips) s.push(`margin-left:${twipsToPt(p.props.indentLeftTwips)}pt`);
  if (p.props.indentRightTwips) s.push(`margin-right:${twipsToPt(p.props.indentRightTwips)}pt`);
  if (p.props.indentFirstLineTwips) s.push(`text-indent:${twipsToPt(p.props.indentFirstLineTwips)}pt`);
  if (p.props.shadingHex) s.push(`background-color:#${p.props.shadingHex}`);
  const b = p.props.borders;
  if (b) {
    if (b.top) s.push(`border-top:${edgeCss(b.top)}`);
    if (b.bottom) s.push(`border-bottom:${edgeCss(b.bottom)}`);
    if (b.left) s.push(`border-left:${edgeCss(b.left)}`);
    if (b.right) s.push(`border-right:${edgeCss(b.right)}`);
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
  if (lvl) return `<h${lvl}${attr}>${inner}</h${lvl}>`;
  return `<p${attr}>${inner}</p>`;
}
function tableHtml(t, ctx) {
  let html = "<table>";
  for (const row of t.rows) {
    html += "<tr>";
    for (const cell of row.cells) {
      const span = cell.gridSpan > 1 ? ` colspan="${cell.gridSpan}"` : "";
      const style = cell.shadingHex ? ` style="background-color:#${cell.shadingHex}"` : "";
      let inner = cell.paragraphs.map((p) => paraHtml(p, ctx)).join("");
      for (const nt of cell.tables) inner += tableHtml(nt, ctx);
      html += `<td${span}${style}>${inner}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}
function listHtml(items) {
  let i = 0;
  function build(level) {
    const tag = items[i].kind === "decimal" ? "ol" : "ul";
    let html = `<${tag}>`;
    while (i < items.length && items[i].ilvl >= level) {
      if (items[i].ilvl > level) break;
      let li = `<li>${items[i].inner}`;
      i++;
      if (i < items.length && items[i].ilvl > level) li += build(items[i].ilvl);
      html += li + "</li>";
    }
    return html + `</${tag}>`;
  }
  return items.length ? build(items[0].ilvl) : "";
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
    if (b.kind === "para") parts.push(paraHtml(b.p, ctx));
    else parts.push(tableHtml(b.t, ctx));
  }
  flushList();
  if (ctx.notes.length) {
    parts.push('<hr><section class="uw-notes"><ol>');
    ctx.notes.forEach((n, idx) => {
      parts.push(`<li id="note-${idx + 1}">${n.html} <a href="#noteref-${idx + 1}">\u21A9</a></li>`);
    });
    parts.push("</ol></section>");
  }
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    parts.push('<section class="uw-comments"><h2>Coment\xE1rios</h2><ol>');
    for (const id of used) {
      const c = ctx.comments.get(id);
      parts.push(`<li id="cmt-${id}"><span class="uw-author">${escapeHtml(c.author ?? "An\xF4nimo")}</span>: ${escapeHtml(c.text)}</li>`);
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
sup.uw-note a { text-decoration: none; }
.uw-comment { background: rgba(255,187,0,.28); border-bottom: 1px dotted #c79100; cursor: help; }
.uw-img-placeholder { display: inline-block; padding: 0 .35em; margin: 0 .15em; background: rgba(0,0,0,.06); border-radius: 4px; font-size: .9em; color: #777; }
.uw-comments { margin-top: 2.5rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: .9rem; color: #555; }
.uw-comments .uw-author { font-weight: 600; }
.uw-notes { font-size: .85rem; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0 .5rem; }
`;
function toHtml(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c) => [c.id, c])),
    usedComments: /* @__PURE__ */ new Set(),
    notes: [],
    footnotes: doc.footnotes ?? /* @__PURE__ */ new Map(),
    endnotes: doc.endnotes ?? /* @__PURE__ */ new Map(),
    imagesMode: opts.images ?? "data",
    imageDataUris: doc.imageDataUris
  };
  const body = bodyHtml(doc, ctx);
  if (opts.fullDocument === false) return body;
  const title = escapeHtml(opts.title ?? doc.title ?? "Documento");
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

// ../docx-core/src/export/markdown.ts
function escapeMd(s) {
  return s.replace(/([\\`*_{}\[\]<>|])/g, "\\$1");
}
function emphasize(t, p) {
  const lead = (t.match(/^\s*/) ?? [""])[0];
  const trail = (t.match(/\s*$/) ?? [""])[0];
  let core = t.slice(lead.length, t.length - trail.length);
  if (!core) return t;
  if (p.bold && p.italic) core = `***${core}***`;
  else if (p.bold) core = `**${core}**`;
  else if (p.italic) core = `*${core}*`;
  if (p.strike || p.doubleStrike) core = `~~${core}~~`;
  if (p.underline) core = `<u>${core}</u>`;
  if (p.vertAlign === "superscript") core = `<sup>${core}</sup>`;
  else if (p.vertAlign === "subscript") core = `<sub>${core}</sub>`;
  return lead + core + trail;
}
function runMd(run, ctx) {
  if (run.image) return ctx.imagesMode === "omit" ? "[imagem]" : `![](${resolveImageUri(run.image, ctx.imageDataUris)})`;
  if (run.noteRef) {
    const seq = ++ctx.noteSeq;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const txt = paras?.map((np) => np.runs.map((r) => r.text).join("")).join(" ").trim() ?? "";
    ctx.noteDefs.push(`[^n${seq}]: ${txt}`);
    return `[^n${seq}]`;
  }
  let t = emphasize(escapeMd(run.text), run.props);
  if (run.props.link) t = `[${t}](${run.props.link})`;
  return t;
}
function inlineRuns(runs, ctx) {
  let s = "";
  const ids = /* @__PURE__ */ new Set();
  for (const r of runs) {
    s += runMd(r, ctx);
    for (const id of r.props.commentIds ?? []) ids.add(id);
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
function tableMd(t, ctx) {
  const rows = t.rows.map((r) => r.cells.map((c) => cellText(c, ctx)));
  if (!rows.length) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const pad2 = (r) => {
    while (r.length < cols) r.push("");
    return r;
  };
  const header = pad2(rows[0].slice());
  let md = `| ${header.join(" | ")} |
`;
  md += `| ${header.map(() => "---").join(" | ")} |
`;
  for (const r of rows.slice(1)) md += `| ${pad2(r.slice()).join(" | ")} |
`;
  return md;
}
function toMarkdown(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c) => [c.id, c])),
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
  if (title) out.push(`# ${title}
`);
  let inList = false;
  for (const b of orderedBlocks(doc)) {
    const isList = b.kind === "para" && !!b.p.props.numbering;
    if (inList && !isList) out.push("");
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
    if (lvl) out.push(`${"#".repeat(lvl)} ${inner}
`);
    else if (inner.trim()) out.push(`${inner}
`);
    else out.push("");
  }
  if (ctx.noteDefs.length) out.push("", ...ctx.noteDefs);
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    out.push("");
    for (const id of used) {
      const c = ctx.comments.get(id);
      out.push(`[^c${id}]: **${c.author ?? "An\xF4nimo"}**: ${c.text}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ../docx-layout/src/typography/font/gpos.ts
var kernKey = (g1, g2) => g1 * 65536 + g2;
function gposKernInLatin(view, gposOffset) {
  const u16 = (o) => view.getUint16(o);
  const tagAt = (o) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  const scriptListOff = gposOffset + u16(gposOffset + 4);
  const featureListOff = gposOffset + u16(gposOffset + 6);
  let latn = -1, dflt = -1;
  for (let i = 0, n = u16(scriptListOff); i < n; i++) {
    const rec = scriptListOff + 2 + i * 6;
    const tag = tagAt(rec);
    if (tag === "latn") latn = scriptListOff + u16(rec + 4);
    else if (tag === "DFLT") dflt = scriptListOff + u16(rec + 4);
  }
  const script = latn >= 0 ? latn : dflt;
  if (script < 0 || !u16(script)) return false;
  const ls = script + u16(script);
  const isKern = (fi) => fi !== 65535 && tagAt(featureListOff + 2 + fi * 6) === "kern";
  if (isKern(u16(ls + 2))) return true;
  for (let k = 0, n = u16(ls + 4); k < n; k++) if (isKern(u16(ls + 6 + k * 2))) return true;
  return false;
}
function parseGposKern(view, gposOffset, class0) {
  const kern = /* @__PURE__ */ new Map();
  const u16 = (o) => view.getUint16(o);
  const i16 = (o) => view.getInt16(o);
  const scriptListOff = gposOffset + u16(gposOffset + 4);
  const featureListOff = gposOffset + u16(gposOffset + 6);
  const lookupListOff = gposOffset + u16(gposOffset + 8);
  const kernFeatures = /* @__PURE__ */ new Set();
  const featureCount = u16(featureListOff);
  for (let i = 0; i < featureCount; i++) {
    const rec = featureListOff + 2 + i * 6;
    const tag = String.fromCharCode(
      view.getUint8(rec),
      view.getUint8(rec + 1),
      view.getUint8(rec + 2),
      view.getUint8(rec + 3)
    );
    if (tag === "kern") kernFeatures.add(i);
  }
  if (kernFeatures.size === 0) return kern;
  void scriptListOff;
  const lookupIdx = /* @__PURE__ */ new Set();
  for (const fi of kernFeatures) {
    const featOff = featureListOff + u16(featureListOff + 2 + fi * 6 + 4);
    const n = u16(featOff + 2);
    for (let k = 0; k < n; k++) lookupIdx.add(u16(featOff + 4 + k * 2));
  }
  const lookupCount = u16(lookupListOff);
  for (const li of lookupIdx) {
    if (li >= lookupCount) continue;
    const lookupOff = lookupListOff + u16(lookupListOff + 2 + li * 2);
    let type = u16(lookupOff);
    const subCount = u16(lookupOff + 4);
    for (let s = 0; s < subCount; s++) {
      let subOff = lookupOff + u16(lookupOff + 6 + s * 2);
      let t = type;
      if (t === 9) {
        t = u16(subOff + 2);
        subOff = subOff + view.getUint32(subOff + 4);
      }
      if (t !== 2) continue;
      parsePairPos(subOff);
    }
  }
  return kern;
  function readCoverage(off) {
    const fmt2 = u16(off);
    const out = [];
    if (fmt2 === 1) {
      const n = u16(off + 2);
      for (let i = 0; i < n; i++) out.push(u16(off + 4 + i * 2));
    } else if (fmt2 === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const start = u16(off + 4 + r * 6);
        const end = u16(off + 6 + r * 6);
        for (let g = start; g <= end; g++) out.push(g);
      }
    }
    return out;
  }
  function readClassDef(off) {
    const map = /* @__PURE__ */ new Map();
    const fmt2 = u16(off);
    if (fmt2 === 1) {
      const start = u16(off + 2);
      const n = u16(off + 4);
      for (let i = 0; i < n; i++) map.set(start + i, u16(off + 6 + i * 2));
    } else if (fmt2 === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const s = u16(off + 4 + r * 6);
        const e = u16(off + 6 + r * 6);
        const c = u16(off + 8 + r * 6);
        for (let g = s; g <= e; g++) map.set(g, c);
      }
    }
    return map;
  }
  function valueSize(format) {
    let n = 0;
    for (let b = 0; b < 16; b++) if (format & 1 << b) n++;
    return n * 2;
  }
  function readXAdvance(off, format) {
    let p = off;
    if (format & 1) p += 2;
    if (format & 2) p += 2;
    if (format & 4) return i16(p);
    return 0;
  }
  function parsePairPos(off) {
    const fmt2 = u16(off);
    const coverage = readCoverage(off + u16(off + 2));
    const vf1 = u16(off + 4);
    const vf2 = u16(off + 6);
    const size1 = valueSize(vf1);
    const size2 = valueSize(vf2);
    if (fmt2 === 1) {
      const pairSetCount = u16(off + 8);
      for (let i = 0; i < Math.min(pairSetCount, coverage.length); i++) {
        const ps = off + u16(off + 10 + i * 2);
        const n = u16(ps);
        const recSize = 2 + size1 + size2;
        for (let r = 0; r < n; r++) {
          const rec = ps + 2 + r * recSize;
          const g2 = u16(rec);
          const adv = readXAdvance(rec + 2, vf1);
          if (adv !== 0) {
            const key = kernKey(coverage[i], g2);
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    } else if (fmt2 === 2) {
      const cd1 = readClassDef(off + u16(off + 8));
      const cd2 = readClassDef(off + u16(off + 10));
      const c1n = u16(off + 12);
      const c2n = u16(off + 14);
      const recSize = size1 + size2;
      const classAdv = [];
      for (let c1 = 0; c1 < c1n; c1++) {
        classAdv.push([]);
        for (let c2 = 0; c2 < c2n; c2++) {
          const rec = off + 16 + (c1 * c2n + c2) * recSize;
          classAdv[c1].push(readXAdvance(rec, vf1));
        }
      }
      const class1 = /* @__PURE__ */ new Map();
      for (const g of coverage) class1.set(g, cd1.get(g) ?? 0);
      if (class0) {
        for (const [g1, c1] of class1) {
          const adv = classAdv[c1]?.[0] ?? 0;
          if (adv !== 0 && !class0.has(g1)) class0.set(g1, { adv, cd2 });
        }
      }
      for (const [g1, c1] of class1) {
        for (const [g2, c2] of cd2) {
          const adv = classAdv[c1]?.[c2] ?? 0;
          if (adv !== 0) {
            const key = kernKey(g1, g2);
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    }
  }
}

// ../docx-layout/src/typography/font/gsub.ts
function parseGsubLigatures(view, off) {
  const u16 = (o) => view.getUint16(o);
  const u32 = (o) => view.getUint32(o);
  const tagAt = (o) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  const scriptList = off + u16(off + 4);
  const featureList = off + u16(off + 6);
  const lookupList = off + u16(off + 8);
  const features = /* @__PURE__ */ new Map();
  const lookups = /* @__PURE__ */ new Map();
  let latn = -1, dflt = -1;
  for (let i = 0, n = u16(scriptList); i < n; i++) {
    const rec = scriptList + 2 + i * 6;
    const tag = tagAt(rec);
    if (tag === "latn") latn = scriptList + u16(rec + 4);
    else if (tag === "DFLT") dflt = scriptList + u16(rec + 4);
  }
  const script = latn >= 0 ? latn : dflt;
  if (script < 0 || !u16(script)) return { features, lookups };
  const ls = script + u16(script);
  const fidx = [];
  const req = u16(ls + 2);
  if (req !== 65535) fidx.push(req);
  for (let k = 0, n = u16(ls + 4); k < n; k++) fidx.push(u16(ls + 6 + k * 2));
  for (const fi of fidx) {
    const tag = tagAt(featureList + 2 + fi * 6);
    const fo = featureList + u16(featureList + 2 + fi * 6 + 4);
    const list = features.get(tag) ?? [];
    for (let k = 0, n = u16(fo + 2); k < n; k++) list.push(u16(fo + 4 + k * 2));
    features.set(tag, list);
  }
  const coverage = (o) => {
    const out = [];
    if (u16(o) === 1) for (let i = 0, n = u16(o + 2); i < n; i++) out.push(u16(o + 4 + i * 2));
    else for (let i = 0, n = u16(o + 2); i < n; i++) {
      const s = u16(o + 4 + i * 6), e = u16(o + 6 + i * 6);
      for (let g = s; g <= e; g++) out.push(g);
    }
    return out;
  };
  const wanted = new Set([...features.values()].flat());
  for (const li of wanted) {
    if (li >= u16(lookupList)) continue;
    const lo = lookupList + u16(lookupList + 2 + li * 2);
    const type = u16(lo);
    const map = /* @__PURE__ */ new Map();
    for (let s = 0, ns = u16(lo + 4); s < ns; s++) {
      let so = lo + u16(lo + 6 + s * 2);
      let t = type;
      if (t === 7) {
        t = u16(so + 2);
        so += u32(so + 4);
      }
      if (t !== 4 || u16(so) !== 1) continue;
      const cov = coverage(so + u16(so + 2));
      for (let k = 0, n = u16(so + 4); k < n && k < cov.length; k++) {
        const set = so + u16(so + 6 + k * 2);
        const list = map.get(cov[k]) ?? [];
        for (let j = 0, m = u16(set); j < m; j++) {
          const lg = set + u16(set + 2 + j * 2);
          const cc = u16(lg + 2);
          const rest = [];
          for (let q = 1; q < cc; q++) rest.push(u16(lg + 4 + (q - 1) * 2));
          list.push({ rest, lig: u16(lg) });
        }
        if (list.length) map.set(cov[k], list);
      }
    }
    if (map.size) lookups.set(li, map);
  }
  return { features, lookups };
}
function applyLigatures(g, gids, feats) {
  let out = gids.map((gid) => ({ gid, len: 1 }));
  const idx = [...new Set(feats.flatMap((f) => g.features.get(f) ?? []))].sort((a, b) => a - b);
  for (const li of idx) {
    const lk = g.lookups.get(li);
    if (!lk) continue;
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const cands = lk.get(out[i].gid);
      let hit;
      if (cands) hit = cands.find((c) => c.rest.every((r, k) => out[i + 1 + k]?.gid === r));
      if (!hit) {
        next.push(out[i]);
        continue;
      }
      let len = out[i].len;
      for (let k = 0; k < hit.rest.length; k++) len += out[i + 1 + k].len;
      next.push({ gid: hit.lig, len });
      i += hit.rest.length;
    }
    out = next;
  }
  return out;
}

// ../docx-layout/src/typography/font/sfnt.ts
var SfntFont = class {
  view;
  tables = /* @__PURE__ */ new Map();
  metrics;
  numGlyphs;
  numberOfHMetrics;
  hmtxOffset;
  cmapRanges = [];
  advanceCache = /* @__PURE__ */ new Map();
  /** 'kern' registrada no script latino (ou DFLT) do GPOS — com ligaduras OpenType o
   *  Word só kerneia nesse caso; sem GPOS (só a tabela 'kern' legada): true */
  kernInLatin = true;
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      this.tables.set(tag, { offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
    }
    const head = this.req("head");
    const hhea = this.req("hhea");
    const maxp = this.req("maxp");
    const os2 = this.req("OS/2");
    this.numGlyphs = v.getUint16(maxp.offset + 4);
    this.numberOfHMetrics = v.getUint16(hhea.offset + 34);
    this.hmtxOffset = this.req("hmtx").offset;
    this.metrics = {
      unitsPerEm: v.getUint16(head.offset + 18),
      ascender: v.getInt16(hhea.offset + 4),
      descender: v.getInt16(hhea.offset + 6),
      lineGap: v.getInt16(hhea.offset + 8),
      sTypoAscender: v.getInt16(os2.offset + 68),
      sTypoDescender: v.getInt16(os2.offset + 70),
      sTypoLineGap: v.getInt16(os2.offset + 72),
      usWinAscent: v.getUint16(os2.offset + 74),
      usWinDescent: v.getUint16(os2.offset + 76),
      fsSelection: v.getUint16(os2.offset + 62),
      ...os2.length >= 86 && v.getUint16(os2.offset) >= 1 ? { codePageRange1: v.getUint32(os2.offset + 78) } : {},
      ...os2.length >= 26 ? { ySuperscriptYOffset: v.getInt16(os2.offset + 24) } : {},
      ...os2.length >= 4 ? { xAvgCharWidth: v.getInt16(os2.offset + 2) } : {},
      ...os2.length >= 42 ? { panose: Array.from({ length: 10 }, (_, i) => v.getUint8(os2.offset + 32 + i)) } : {},
      underlinePosition: 0,
      underlineThickness: 0
    };
    const post = this.tables.get("post");
    if (post && post.length >= 12) {
      this.metrics.underlinePosition = v.getInt16(post.offset + 8);
      this.metrics.underlineThickness = v.getInt16(post.offset + 10);
    }
    this.parseCmap();
    const gpos = this.tables.get("GPOS");
    if (gpos) {
      try {
        this.kernMap = parseGposKern(this.view, gpos.offset, this.kernClass0);
        this.kernInLatin = gposKernInLatin(this.view, gpos.offset);
      } catch {
        this.kernMap = /* @__PURE__ */ new Map();
        this.kernClass0.clear();
      }
    } else this.kernMap = /* @__PURE__ */ new Map();
    const kernT = this.tables.get("kern");
    if (this.kernMap.size === 0 && kernT) {
      try {
        this.parseLegacyKern(kernT.offset);
      } catch {
      }
    }
  }
  kernMap;
  /** PairPos formato 2: ajuste contra a classe 0 do 2º glifo, por 1º glifo */
  kernClass0 = /* @__PURE__ */ new Map();
  /** Tabela 'kern' (versão 0, subtabelas formato 0 horizontais). */
  parseLegacyKern(off) {
    const v = this.view;
    if (v.getUint16(off) !== 0) return;
    const n = v.getUint16(off + 2);
    let p = off + 4;
    for (let t = 0; t < n; t++) {
      const length = v.getUint16(p + 2);
      const coverage = v.getUint16(p + 4);
      const format = coverage >> 8;
      const horizontal = (coverage & 1) !== 0;
      const cross = (coverage & 4) !== 0;
      if (format === 0 && horizontal && !cross) {
        const pairs = v.getUint16(p + 6);
        for (let i = 0; i < pairs; i++) {
          const r = p + 14 + i * 6;
          const key = kernKey(v.getUint16(r), v.getUint16(r + 2));
          if (!this.kernMap.has(key)) this.kernMap.set(key, v.getInt16(r + 4));
        }
      }
      p += length;
    }
  }
  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O app de referência (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint, codePoint, sizePt) {
    return this.kernGlyphsTwips(this.glyphId(prevCodePoint), this.glyphId(codePoint), sizePt);
  }
  /** Kerning do par de GLIFOS (g1→g2) em twips — para pares com glifo de ligadura. */
  kernGlyphsTwips(g1, g2, sizePt) {
    if (g1 > 65535 || g2 > 65535) return 0;
    let units = this.kernMap.get(kernKey(g1, g2));
    if (units === void 0) {
      const c0 = this.kernClass0.get(g1);
      if (c0 && !c0.cd2.has(g2)) units = c0.adv;
    }
    if (!units) return 0;
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
  gsub;
  /**
   * Ligaduras OpenType (GSUB, script latino) das features pedidas ('liga', 'clig',
   * 'dlig', 'hlig') sobre uma sequência de glifos: grupos {glifo, quantos glifos de
   * entrada cobre}; null se a fonte não tem nenhuma dessas ligaduras.
   */
  ligate(gids, features) {
    if (this.gsub === void 0) {
      const t = this.tables.get("GSUB");
      try {
        this.gsub = t ? parseGsubLigatures(this.view, t.offset) : null;
      } catch {
        this.gsub = null;
      }
    }
    const g = this.gsub;
    if (!g || !g.lookups.size || !features.some((f) => (g.features.get(f) ?? []).some((li) => g.lookups.has(li)))) return null;
    return applyLigatures(g, gids, features);
  }
  req(tag) {
    const t = this.tables.get(tag);
    if (!t) throw new Error(`Tabela ${tag} ausente`);
    return t;
  }
  parseCmap() {
    const v = this.view;
    const cmap = this.req("cmap");
    const n = v.getUint16(cmap.offset + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = cmap.offset + 4 + i * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      const score = platform === 3 && encoding === 10 ? 4 : platform === 3 && encoding === 1 ? 3 : platform === 0 ? 2 : platform === 3 && encoding === 0 ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = cmap.offset + offset;
      }
    }
    if (best < 0) throw new Error("cmap sem subtabela utiliz\xE1vel");
    this.symbolCmap = bestScore === 1;
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
          mapper: rangeOffset === 0 ? (c) => c + delta & 65535 : (c) => {
            const gp = idP + rangeOffset + (c - start) * 2;
            const g = v.getUint16(gp);
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
        this.cmapRanges.push({ start, end, mapper: (c) => startGlyph + (c - start) });
      }
    } else {
      throw new Error(`cmap format ${format} n\xE3o suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }
  /** cmap Windows Symbol (3,0): os glifos ficam em U+F000+código */
  symbolCmap = false;
  /** COLR v0 (registros base/camadas — o v1 os mantém) + CPAL; preparado sob demanda */
  colr;
  colrInfo() {
    if (this.colr !== void 0) return this.colr;
    this.colr = null;
    const t = this.tables.get("COLR"), cp = this.tables.get("CPAL");
    if (!t || !cp || t.length < 14 || cp.length < 14) return null;
    const v = this.view;
    try {
      const nBase = v.getUint16(t.offset + 2), bo = v.getUint32(t.offset + 4), lo = v.getUint32(t.offset + 8), nLayers = v.getUint16(t.offset + 12);
      if (!nBase || !bo || !lo) return null;
      this.colr = {
        base: t.offset + bo,
        nBase,
        layers: t.offset + lo,
        nLayers,
        colors: cp.offset + v.getUint32(cp.offset + 8),
        firstColor: v.getUint16(cp.offset + 12),
        nColors: v.getUint16(cp.offset + 2)
      };
    } catch {
      this.colr = null;
    }
    return this.colr;
  }
  hasColorGlyphs() {
    return this.colrInfo() !== null;
  }
  colorLayers(glyphId) {
    const c = this.colrInfo();
    if (!c) return null;
    const v = this.view;
    let lo = 0, hi = c.nBase - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1, p = c.base + mid * 6, g = v.getUint16(p);
      if (g < glyphId) {
        lo = mid + 1;
        continue;
      }
      if (g > glyphId) {
        hi = mid - 1;
        continue;
      }
      const first = v.getUint16(p + 2), n = v.getUint16(p + 4);
      const out = [];
      for (let k = 0; k < n && first + k < c.nLayers; k++) {
        const q = c.layers + (first + k) * 4;
        const pal = v.getUint16(q + 2);
        if (pal === 65535 || pal >= c.nColors) {
          out.push({ glyphId: v.getUint16(q), color: null, alpha: 1 });
          continue;
        }
        const r = c.colors + (c.firstColor + pal) * 4;
        const hex = (o) => v.getUint8(r + o).toString(16).padStart(2, "0").toUpperCase();
        out.push({ glyphId: v.getUint16(q), color: hex(2) + hex(1) + hex(0), alpha: v.getUint8(r + 3) / 255 });
      }
      return out.length ? out : null;
    }
    return null;
  }
  glyphId(codePoint) {
    const g = this.lookupGlyph(codePoint);
    if (g === 0 && this.symbolCmap && codePoint < 256) return this.lookupGlyph(codePoint + 61440);
    return g;
  }
  lookupGlyph(codePoint) {
    let lo = 0, hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const r = this.cmapRanges[mid];
      if (codePoint < r.start) hi = mid - 1;
      else if (codePoint > r.end) lo = mid + 1;
      else return r.mapper(codePoint);
    }
    return 0;
  }
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId) {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== void 0) return cached;
    const i = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }
  /** Tabela empírica de advances do app de referência (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  advanceTable = null;
  setAdvanceTable(table) {
    this.advanceTable = table;
  }
  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do app de referência; fallback: escala linear com o em
   *  arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt). */
  advanceTwips(codePoint, sizePt) {
    if (this.advanceTable) {
      const t = this.advanceTable[String(sizePt)]?.[String.fromCodePoint(codePoint)];
      if (t !== void 0) return t;
    }
    const units = this.advanceWidth(this.glyphId(codePoint));
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
  outlineCache = /* @__PURE__ */ new Map();
  /**
   * Contorno do glifo (TrueType `glyf`, glifos simples e compostos) em unidades
   * da fonte, y para CIMA: M/L/Q/Z. null se a fonte não tem `glyf` (CFF) ou o
   * glifo não existe. Usado para desenhar texto como curvas (WordArt no PDF,
   * como o Word faz).
   */
  glyphOutline(glyphId) {
    if (this.outlineCache.has(glyphId)) return this.outlineCache.get(glyphId);
    let out = null;
    try {
      const pts = this.glyphContours(glyphId, 0);
      out = pts ? contoursToPath(pts) : null;
    } catch {
      out = null;
    }
    this.outlineCache.set(glyphId, out);
    return out;
  }
  /** Contornos (pontos com on/off curve) de um glifo, compostos resolvidos. */
  glyphContours(gid, depth) {
    const glyf = this.tables.get("glyf"), loca = this.tables.get("loca"), head = this.tables.get("head"), maxp = this.tables.get("maxp");
    if (!glyf || !loca || !head || !maxp || depth > 8) return null;
    const v = this.view;
    const numGlyphs = v.getUint16(maxp.offset + 4);
    if (gid < 0 || gid >= numGlyphs) return null;
    const longLoca = v.getInt16(head.offset + 50) === 1;
    const at = (i) => longLoca ? v.getUint32(loca.offset + i * 4) : v.getUint16(loca.offset + i * 2) * 2;
    const start = at(gid), end = at(gid + 1);
    if (end <= start) return [];
    const p0 = glyf.offset + start;
    const nContours = v.getInt16(p0);
    if (nContours >= 0) {
      let p2 = p0 + 10;
      const ends = [];
      for (let i = 0; i < nContours; i++) {
        ends.push(v.getUint16(p2));
        p2 += 2;
      }
      const nPts = nContours ? ends[nContours - 1] + 1 : 0;
      p2 += 2 + v.getUint16(p2);
      const flags = [];
      while (flags.length < nPts) {
        const f = v.getUint8(p2++);
        flags.push(f);
        if (f & 8) {
          let rep = v.getUint8(p2++);
          while (rep-- > 0 && flags.length < nPts) flags.push(f);
        }
      }
      const xs = [], ys = [];
      let x = 0;
      for (const f of flags) {
        if (f & 2) {
          const d = v.getUint8(p2++);
          x += f & 16 ? d : -d;
        } else if (!(f & 16)) {
          x += v.getInt16(p2);
          p2 += 2;
        }
        xs.push(x);
      }
      let y = 0;
      for (const f of flags) {
        if (f & 4) {
          const d = v.getUint8(p2++);
          y += f & 32 ? d : -d;
        } else if (!(f & 32)) {
          y += v.getInt16(p2);
          p2 += 2;
        }
        ys.push(y);
      }
      const contours = [];
      let s = 0;
      for (const e of ends) {
        const c = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
        contours.push(c);
        s = e + 1;
      }
      return contours;
    }
    const all = [];
    let p = p0 + 10;
    for (let guard = 0; guard < 64; guard++) {
      const flags = v.getUint16(p), comp = v.getUint16(p + 2);
      p += 4;
      let dx = 0, dy = 0;
      if (flags & 1) {
        dx = v.getInt16(p);
        dy = v.getInt16(p + 2);
        p += 4;
      } else {
        dx = v.getInt8(p);
        dy = v.getInt8(p + 1);
        p += 2;
      }
      if (!(flags & 2)) {
        dx = 0;
        dy = 0;
      }
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = (o) => v.getInt16(o) / 16384;
      if (flags & 8) {
        a = d = f2(p);
        p += 2;
      } else if (flags & 64) {
        a = f2(p);
        d = f2(p + 2);
        p += 4;
      } else if (flags & 128) {
        a = f2(p);
        b = f2(p + 2);
        c = f2(p + 4);
        d = f2(p + 6);
        p += 8;
      }
      const sub = this.glyphContours(comp, depth + 1);
      if (sub) for (const ct of sub) all.push(ct.map((q) => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
      if (!(flags & 32)) break;
    }
    return all;
  }
};
function contoursToPath(contours) {
  const out = [];
  for (const c of contours) {
    const n = c.length;
    if (n < 2) continue;
    let startIdx = c.findIndex((q) => q.on);
    let start;
    if (startIdx < 0) {
      start = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
      startIdx = 0;
    } else start = c[startIdx];
    out.push({ op: "M", x: start.x, y: start.y });
    let ctrl = null;
    for (let k = 1; k <= n; k++) {
      const q = c[(startIdx + k) % n];
      if (q.on) {
        if (ctrl) {
          out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: q.x, y: q.y });
          ctrl = null;
        } else out.push({ op: "L", x: q.x, y: q.y });
      } else if (ctrl) {
        const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2 };
        out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: mid.x, y: mid.y });
        ctrl = q;
      } else ctrl = q;
    }
    if (ctrl) out.push({ op: "Q", cx: ctrl.x, cy: ctrl.y, x: start.x, y: start.y });
    out.push({ op: "Z" });
  }
  return out;
}

// ../docx-layout/src/typography/lineheight.ts
function deviceEmPt(sizePt) {
  return Math.round(sizePt * 600 / 72) * 72 / 600;
}
function singleLineHeightPt(font, sizePt) {
  const m = font.metrics;
  const units = m.ascender + Math.abs(m.descender) + m.lineGap;
  return units / m.unitsPerEm * deviceEmPt(sizePt);
}
function lineHeightPt(font, sizePt, spacing) {
  const single = singleLineHeightPt(font, sizePt);
  switch (spacing.lineRule) {
    case "auto":
      return single * spacing.line / 240;
    case "exact":
      return spacing.line / 20;
    // twips
    case "atLeast":
      return Math.max(single, spacing.line / 20);
  }
}

// ../docx-layout/src/typography/units.ts
var TWIPS_PER_PT = 20;

// ../docx-layout/src/typography/richbreak.ts
function breakRich(spans, fonts, opts) {
  const tabLeaders = /* @__PURE__ */ new Map();
  const tabStop = opts.defaultTabStopTwips ?? 708;
  const chars = [];
  spans.forEach((span, si) => {
    const font = fonts.resolve(span.family, span.variant);
    const ls = span.letterSpacingTwips ?? 0;
    for (let i2 = 0; i2 < span.text.length; i2++) {
      const ch = span.text[i2];
      const isTab = ch === "	";
      let adv;
      if (span.imageWidthTwips !== void 0) adv = span.imageWidthTwips;
      else if (isTab || ch === "\n" || ch === "\f") adv = 0;
      else {
        adv = font.advanceTwips(ch.codePointAt(0), span.sizePt) + ls;
        const next = span.text[i2 + 1];
        if (next && next !== " " && next !== "	" && ch !== " ") {
          adv += font.kernTwips(ch.codePointAt(0), next.codePointAt(0), span.sizePt);
        }
      }
      chars.push({
        ch,
        spanIndex: si,
        offsetInSpan: i2,
        baseAdvance: adv,
        isGap: span.imageWidthTwips === void 0 && (ch === " " || isTab),
        isTab: span.imageWidthTwips === void 0 && isTab
      });
    }
  });
  const charAdvances = new Array(chars.length).fill(0);
  const availOf = (lineIdx2) => {
    let avail = lineIdx2 === 0 ? opts.firstLineAvailableTwips ?? opts.availableTwips : opts.availableTwips;
    if (opts.indentFirstKLines && lineIdx2 < opts.indentFirstKLines.k) {
      avail -= opts.indentFirstKLines.indentTwips;
    }
    return avail;
  };
  const tabOffsetOf = (lineIdx2) => lineIdx2 === 0 ? opts.firstLineTabOriginOffsetTwips ?? opts.tabOriginOffsetTwips ?? 0 : opts.tabOriginOffsetTwips ?? 0;
  const breaks = [];
  let lineStart = 0;
  let width = 0;
  let pendingGap = 0;
  let i = 0;
  const lineIdx = () => breaks.length;
  while (i < chars.length) {
    const c = chars[i];
    if (c.ch === "\n" || c.ch === "\f") {
      charAdvances[i] = 0;
      breaks.push({ start: lineStart, end: i + 1, widthTwips: width + pendingGap });
      lineStart = i + 1;
      width = 0;
      pendingGap = 0;
      i++;
      continue;
    }
    if (c.isGap) {
      const cursor = width + pendingGap;
      let adv;
      if (c.isTab) {
        const fromMargin = tabOffsetOf(lineIdx()) + cursor;
        const custom = opts.tabStops?.find((t) => t.posTwips > fromMargin + 1);
        if (custom) {
          if (custom.align === "right") {
            let w = 0;
            for (let k = i + 1; k < chars.length; k++) {
              const cc = chars[k];
              if (cc.isTab || cc.ch === "\n" || cc.ch === "\f") break;
              w += cc.baseAdvance;
            }
            adv = Math.max(80, custom.posTwips - fromMargin - w);
          } else {
            adv = custom.posTwips - fromMargin;
          }
          if (custom.leader) tabLeaders.set(i, custom.leader);
        } else {
          const next = (Math.floor(fromMargin / tabStop + 1e-6) + 1) * tabStop;
          adv = next - fromMargin;
        }
      } else adv = c.baseAdvance;
      charAdvances[i] = adv;
      pendingGap += adv;
      i++;
      continue;
    }
    const wordStart = i;
    let wordWidth2 = 0;
    while (i < chars.length && !chars[i].isGap && chars[i].ch !== "\n" && chars[i].ch !== "\f") {
      charAdvances[i] = chars[i].baseAdvance;
      wordWidth2 += chars[i].baseAdvance;
      i++;
    }
    const avail = availOf(lineIdx());
    if (wordStart > lineStart && width + pendingGap + wordWidth2 > avail) {
      breaks.push({ start: lineStart, end: wordStart, widthTwips: width });
      lineStart = wordStart;
      width = wordWidth2;
      pendingGap = 0;
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => {
        lineStart = s;
      }, width);
    } else if (wordStart === lineStart && wordWidth2 > avail) {
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => {
        lineStart = s;
      }, wordWidth2);
      pendingGap = 0;
    } else {
      width += pendingGap + wordWidth2;
      pendingGap = 0;
    }
  }
  if (lineStart < chars.length || breaks.length === 0) {
    breaks.push({ start: lineStart, end: chars.length, widthTwips: width });
  }
  const lines = breaks.map((b) => {
    const segments = [];
    let x = 0;
    let maxSizePt = 0;
    let maxAscTwips = 0;
    let segStart = b.start;
    for (let k = b.start; k <= b.end; k++) {
      const boundary = k === b.end || chars[k].spanIndex !== chars[segStart].spanIndex;
      if (boundary && k > segStart) {
        const first = chars[segStart];
        let w = 0;
        for (let m = segStart; m < k; m++) w += charAdvances[m];
        segments.push({
          spanIndex: first.spanIndex,
          start: first.offsetInSpan,
          end: chars[k - 1].offsetInSpan + 1,
          xTwips: x,
          widthTwips: w
        });
        const span = spans[first.spanIndex];
        const font = fonts.resolve(span.family, span.variant);
        maxSizePt = Math.max(maxSizePt, span.sizePt);
        maxAscTwips = Math.max(
          maxAscTwips,
          span.imageHeightTwips ?? font.metrics.ascender / font.metrics.unitsPerEm * span.sizePt * 20
        );
        x += w;
        segStart = k;
      }
    }
    if (segments.length === 0 && spans.length > 0) {
      maxSizePt = spans[0].sizePt;
      const f = fonts.resolve(spans[0].family, spans[0].variant);
      maxAscTwips = f.metrics.ascender / f.metrics.unitsPerEm * maxSizePt * 20;
    }
    return { start: b.start, end: b.end, widthTwips: b.widthTwips, segments, maxSizePt, maxAscTwips };
  });
  return { lines, charAdvances, tabLeaders };
}
function emergency(chars, charAdvances, wordStart, wordEnd, availOf, lineIdx, breaks, setLineStart, initialWidth) {
  if (initialWidth <= availOf(lineIdx())) return initialWidth;
  let start = wordStart;
  let w = 0;
  for (let k = wordStart; k < wordEnd; k++) {
    const a = charAdvances[k];
    if (w + a > availOf(lineIdx()) && k > start) {
      breaks.push({ start, end: k, widthTwips: w });
      start = k;
      w = a;
    } else w += a;
  }
  setLineStart(start);
  return w;
}

// ../docx-layout/src/typography/hyphen/liang.ts
var DOT = 46;
function lowerCp(ch) {
  const l = ch.toLowerCase();
  const cp = l.codePointAt(0);
  return l.length === ch.length || String.fromCodePoint(cp) === l ? cp : ch.codePointAt(0);
}
var Hyphenator = class {
  constructor(data) {
    this.data = data;
    for (const p of data.patterns.split(/\s+/)) if (p) this.add(p.normalize("NFC"));
    for (const e of data.exceptions.split(/\s+/)) {
      if (!e) continue;
      const pts = [];
      let n = 0;
      for (const ch of e.normalize("NFC")) {
        if (ch === "-") pts.push(n);
        else n++;
      }
      this.exceptions.set(e.replace(/-/g, "").normalize("NFC").toLowerCase(), pts);
    }
  }
  data;
  root = {};
  exceptions = /* @__PURE__ */ new Map();
  cache = /* @__PURE__ */ new Map();
  add(pat) {
    const letters2 = [];
    const vals = [0];
    for (const ch of pat) {
      if (ch >= "0" && ch <= "9") vals[vals.length - 1] = ch.charCodeAt(0) - 48;
      else {
        letters2.push(ch.codePointAt(0));
        vals.push(0);
      }
    }
    let n = this.root;
    for (const c of letters2) {
      n.k ??= /* @__PURE__ */ new Map();
      let nx = n.k.get(c);
      if (!nx) {
        nx = {};
        n.k.set(c, nx);
      }
      n = nx;
    }
    n.v = Uint8Array.from(vals);
  }
  /** Pontos de quebra pelos padrões, SEM mínimos: k ∈ [1, n−1] = hífen depois de k letras
   *  (código a código — a palavra deve vir em NFC, como os padrões). */
  points(word) {
    const hit = this.cache.get(word);
    if (hit) return hit;
    const chars = Array.from(word);
    const n = chars.length;
    const low = chars.map(lowerCp);
    const exc = this.exceptions.get(String.fromCodePoint(...low));
    let out;
    if (exc) out = exc.filter((k) => k > 0 && k < n);
    else {
      const w = [DOT, ...low, DOT];
      const vals = new Uint8Array(w.length + 1);
      for (let i = 0; i < w.length; i++) {
        let node = this.root;
        for (let j = i; j < w.length && node; j++) {
          node = node.k?.get(w[j]);
          if (node?.v) {
            const v = node.v;
            for (let q = 0; q < v.length; q++) if (v[q] > vals[i + q]) vals[i + q] = v[q];
          }
        }
      }
      out = [];
      for (let k = 1; k < n; k++) if (vals[k + 1] & 1) out.push(k);
    }
    if (this.cache.size > 5e4) this.cache.clear();
    this.cache.set(word, out);
    return out;
  }
  /** Pontos com os mínimos de letras antes/depois do hífen (padrão: os do hyph-utf8). */
  hyphenate(word, left = this.data.left, right = this.data.right) {
    const n = Array.from(word).length;
    return this.points(word).filter((k) => k >= left && n - k >= right);
  }
};

// ../docx-layout/src/typography/hyphen/index.ts
var LOADERS = {
  pt: () => import("./chunks/pt-IG6JKBCN.js"),
  "en-us": () => import("./chunks/en-us-4QOSESD6.js"),
  es: () => import("./chunks/es-KND3FC66.js"),
  fr: () => import("./chunks/fr-LYGJKNKT.js"),
  "de-1996": () => import("./chunks/de-1996-UKMLCX3X.js"),
  it: () => import("./chunks/it-GLONI5PH.js"),
  nl: () => import("./chunks/nl-HH37VB2G.js")
};
function hyphenationPatternId(lang) {
  if (!lang) return void 0;
  const [base = ""] = lang.toLowerCase().split(/[-_]/);
  switch (base) {
    case "pt":
      return "pt";
    case "es":
      return "es";
    case "fr":
      return "fr";
    case "de":
      return "de-1996";
    case "it":
      return "it";
    case "nl":
      return "nl";
    case "en":
      return "en-us";
    default:
      return void 0;
  }
}
var loaded = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
function registerHyphenation(data) {
  const h = new Hyphenator(data);
  loaded.set(data.id, h);
  return h;
}
async function loadHyphenation(langs) {
  const ids = /* @__PURE__ */ new Set();
  for (const l of langs) {
    const id = l && LOADERS[l] ? l : hyphenationPatternId(l);
    if (id && !loaded.has(id)) ids.add(id);
  }
  await Promise.all([...ids].map((id) => {
    let p = pending.get(id);
    if (!p) {
      p = LOADERS[id]().then((m) => {
        if (!loaded.has(id)) registerHyphenation(m.default);
      });
      pending.set(id, p);
    }
    return p;
  }));
}
var HYPHENATION_PATTERN_IDS = Object.keys(LOADERS);
function hyphenatorFor(lang) {
  const id = hyphenationPatternId(lang);
  return id ? loaded.get(id) : void 0;
}

// ../docx-layout/src/pdf-writer/bytes.ts
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
    for (let i = 0; i < n; i++) out[i] = s.charCodeAt(i) & 255;
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
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
};
function utf16beHex(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += (c >> 8 & 255).toString(16).padStart(2, "0");
    out += (c & 255).toString(16).padStart(2, "0");
  }
  return out;
}

// ../docx-layout/src/pdf-writer/writer.ts
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
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body) throw new Error(`Objeto PDF ${i + 1} alocado mas n\xE3o definido`);
      offsets[i] = out.length;
      out.str(`${i + 1} 0 obj
`).bytes(body).str("\nendobj\n");
    }
    const xrefOffset = out.length;
    const count = this.bodies.length + 1;
    out.str(`xref
0 ${count}
`);
    out.str("0000000000 65535 f \n");
    for (let i = 0; i < this.bodies.length; i++) {
      out.str(`${String(offsets[i]).padStart(10, "0")} 00000 n 
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

// ../docx-layout/src/pdf-writer/font.ts
var EmbeddedFont = class {
  constructor(index, baseName, bytes, program) {
    this.index = index;
    this.baseName = baseName;
    this.bytes = bytes;
    this.program = program;
    this.resourceName = `F${index}`;
    this.scale = 1e3 / program.unitsPerEm;
  }
  index;
  baseName;
  bytes;
  program;
  /** Recurso usado no content stream (ex.: "F0"). */
  resourceName;
  used = /* @__PURE__ */ new Map();
  // gid -> codePoint (para ToUnicode)
  /** fonte de símbolo (Symbol, Wingdings — códigos na área privada F0xx) com a tabela de
   *  equivalentes Unicode que o Word grava no ToUnicode; também a negrita/itálica */
  get symbolTable() {
    const n = this.baseName.replace(/^[A-Z]{6}\+/, "").replace(/[\s,]+/g, "");
    if (/^Symbol(?:MT)?(?:-|$)/i.test(n)) return WORD_SYMBOL_UNICODE;
    if (/^Wingdings(?:-|$)/i.test(n)) return WORD_WINGDINGS_UNICODE;
    return void 0;
  }
  scale;
  /** Mapeia um code point para (gid, advance em unidades de fonte) e registra uso. */
  encode(codePoint) {
    const g0 = this.program.glyphId(codePoint);
    const gid = g0 >= 0 && g0 <= 65535 ? g0 : 0;
    if (!this.used.has(gid)) this.used.set(gid, codePoint);
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
    const descriptor = w.addDict(
      `<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${bbox.join(" ")}] /ItalicAngle ${italic} /Ascent ${asc} /Descent ${desc} /CapHeight ${asc} /StemV 80 /FontFile2 ${fontFile} 0 R >>`
    );
    const wParts = [];
    for (const gid of gids) wParts.push(`${gid} [${this.widthThousandths(gid)}]`);
    const cidFont = w.addDict(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${wParts.join(" ")}] >>`
    );
    const toUnicode = w.addStream("", this.buildToUnicode(gids));
    return w.addDict(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`
    );
  }
  /** CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode. */
  buildToUnicode(gids) {
    const b = new ByteBuilder();
    b.str(
      "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"
    );
    for (let i = 0; i < gids.length; i += 100) {
      const chunk = gids.slice(i, i + 100);
      b.str(`${chunk.length} beginbfchar
`);
      for (const gid of chunk) {
        const cp0 = this.used.get(gid);
        const table = this.symbolTable;
        const sym = table && cp0 >= 61472 && cp0 <= 61695 ? table[cp0 - 61440] : void 0;
        const cp = sym ?? cp0;
        b.str(`<${gid.toString(16).padStart(4, "0")}> <${utf16beHex(String.fromCodePoint(cp))}>
`);
      }
      b.str("endbfchar\n");
    }
    b.str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    return b.toUint8Array();
  }
};
var WORD_SYMBOL_UNICODE = {
  40: 40,
  41: 41,
  43: 43,
  45: 8722,
  61: 61,
  94: 8869,
  174: 8594,
  183: 8226,
  190: 9135,
  211: 169,
  227: 169
};
var WORD_WINGDINGS_UNICODE = {
  74: 9786,
  108: 9899,
  110: 9724,
  113: 10065,
  115: 11047,
  116: 10731,
  117: 9670,
  118: 10070,
  167: 9642,
  216: 10146,
  224: 8594,
  232: 10132,
  252: 10003
};

// ../docx-layout/src/pdf-writer/document.ts
function rgb255(r, g, b) {
  return [r / 255, g / 255, b / 255];
}
function hexColor(hex) {
  const h = hex.replace("#", "");
  return rgb255(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}
var MAX_REAL = 1e9;
var fmt = (n) => {
  if (Number.isNaN(n)) return "0";
  const r = Math.round(Math.max(-MAX_REAL, Math.min(MAX_REAL, n)) * 1e3) / 1e3;
  return Object.is(r, -0) ? "0" : String(r);
};
var PdfPage = class {
  constructor(widthPt, heightPt, gsFor) {
    this.widthPt = widthPt;
    this.heightPt = heightPt;
    this.gsFor = gsFor;
  }
  widthPt;
  heightPt;
  gsFor;
  /** @internal */
  content = new ByteBuilder();
  /**
   * Desenha com opacidade (0..1) de preenchimento/traço: envolve o desenho em
   * q /GSn gs … Q. Página avulsa (sem documento) ou opaco: desenha direto.
   */
  withAlpha(fillAlpha, strokeAlpha, draw) {
    const fa = fillAlpha ?? 1, sa = strokeAlpha ?? 1;
    if (!this.gsFor || fa >= 1 && sa >= 1) {
      draw();
      return;
    }
    this.content.str(`q
/${this.gsFor(Math.max(0, fa), Math.max(0, sa))} gs
`);
    draw();
    this.content.str("Q\n");
  }
  fromTop(yTop) {
    return this.heightPt - yTop;
  }
  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt, yTopPt, wPt, hPt, color) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg
${fmt(xPt)} ${fmt(y)} ${fmt(wPt)} ${fmt(hPt)} re f
`
    );
  }
  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(x0, y0Top, x1, y1Top, color, widthPt, dash) {
    const d = dash && dash.length ? `[${dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG
${fmt(widthPt)} w
${d}${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S
`
    );
  }
  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(font, sizePt, color, glyphs, opts = {}) {
    if (!glyphs.length) return;
    const c = this.content;
    const col = `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])}`;
    c.str(`BT
/${font.resourceName} ${fmt(sizePt)} Tf
${col} rg
`);
    if (opts.synthBold) c.str(`${col} RG ${fmt(sizePt / 35)} w 2 Tr
`);
    const a = fmt(opts.scaleX ?? 1);
    const skew = opts.synthItalic ? "0.21" : "0";
    if (opts.runs) {
      const sx = opts.scaleX ?? 1;
      let i = 0;
      while (i < glyphs.length) {
        const g0 = glyphs[i];
        let j = i + 1;
        while (j < glyphs.length && glyphs[j].baselineFromTopPt === g0.baselineFromTopPt && glyphs[j].xPt >= glyphs[j - 1].xPt) j++;
        let s = `${a} 0 ${skew} 1 ${fmt(g0.xPt)} ${fmt(this.fromTop(g0.baselineFromTopPt))} Tm [`;
        let pen = 0;
        for (let k = i; k < j; k++) {
          const g = glyphs[k];
          if (k > i) {
            const n = Math.round((pen - (g.xPt - g0.xPt) / sx) * 1e3 / sizePt);
            if (n !== 0) {
              s += `${n}`;
              pen -= n * sizePt / 1e3;
            }
          }
          s += `<${g.gid.toString(16).padStart(4, "0")}>`;
          pen += font.widthThousandths(g.gid) * sizePt / 1e3;
        }
        c.str(`${s}] TJ
`);
        i = j;
      }
    } else for (const g of glyphs) {
      const y = this.fromTop(g.baselineFromTopPt);
      c.str(`${a} 0 ${skew} 1 ${fmt(g.xPt)} ${fmt(y)} Tm <${g.gid.toString(16).padStart(4, "0")}> Tj
`);
    }
    if (opts.synthBold) c.str("0 Tr\n");
    c.str("ET\n");
  }
  /** Caminho preenchido e/ou contornado. */
  path(cmds, fill, stroke, evenOdd = false) {
    if (!cmds.length || !fill && !stroke) return;
    let s = "";
    if (fill) s += `${fmt(fill[0])} ${fmt(fill[1])} ${fmt(fill[2])} rg
`;
    if (stroke) {
      s += `${fmt(stroke.color[0])} ${fmt(stroke.color[1])} ${fmt(stroke.color[2])} RG ${fmt(stroke.widthPt)} w `;
      s += stroke.dash && stroke.dash.length ? `[${stroke.dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    }
    for (const cmd of cmds) {
      if (cmd.op === "M") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m
`;
      else if (cmd.op === "L") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l
`;
      else if (cmd.op === "C") {
        s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c
`;
      } else s += "h\n";
    }
    s += fill && stroke ? evenOdd ? "B*\n" : "B\n" : fill ? evenOdd ? "f*\n" : "f\n" : "S\n";
    this.content.str(s);
  }
  /** Preenche o caminho com um degradê (recorta pelo caminho e pinta com `sh`). */
  fillShaded(cmds, sh, evenOdd = false) {
    if (!cmds.length) return;
    let s = "q\n";
    for (const cmd of cmds) {
      if (cmd.op === "M") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m
`;
      else if (cmd.op === "L") s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l
`;
      else if (cmd.op === "C") s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c
`;
      else s += "h\n";
    }
    s += `${evenOdd ? "W*" : "W"} n
/${sh.resourceName} sh
Q
`;
    this.content.str(s);
  }
  /** Empilha um recorte retangular (até popClip). */
  pushClipRect(xPt, yTopPt, wPt, hPt) {
    this.content.str(`q
${fmt(xPt)} ${fmt(this.fromTop(yTopPt + hPt))} ${fmt(wPt)} ${fmt(hPt)} re W n
`);
  }
  popClip() {
    this.content.str("Q\n");
  }
  /** Empilha uma transformação afim (matriz cm, em pt) até popClip(). */
  pushTransform(a, b, c, d, e, f) {
    this.content.str(`q
${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm
`);
  }
  /** Imagem com rotação (graus, horário, em torno do centro) e espelhamento. */
  drawImageTransformed(img, xPt, yTopPt, wPt, hPt, rotDeg = 0, flipH = false, flipV = false) {
    const cx = xPt + wPt / 2;
    const cy = this.fromTop(yTopPt + hPt / 2);
    const r = -rotDeg * Math.PI / 180;
    const cos = Math.cos(r), sin = Math.sin(r);
    const sx = flipH ? -wPt : wPt, sy = flipV ? -hPt : hPt;
    const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
    const e = cx - (a + c) / 2, f = cy - (b + d) / 2;
    this.content.str(`q
${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm
/${img.resourceName} Do
Q
`);
  }
  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img, xPt, yTopPt, wPt, hPt) {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `q
${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y)} cm
/${img.resourceName} Do
Q
`
    );
  }
};
var PdfDocument = class {
  writer;
  fonts = [];
  images = [];
  pages = [];
  shadings = [];
  /** ExtGState de opacidade: chave "ca|CA" → nome do recurso */
  alphaStates = /* @__PURE__ */ new Map();
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
  embedJpeg(bytes, widthPx, heightPx, components = 3, adobeInverted = false, decodeArr) {
    const cs = components === 1 ? "/DeviceGray" : components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
    const decode = components === 4 && adobeInverted ? " /Decode [1 0 1 0 1 0 1 0]" : decodeArr?.length ? ` /Decode [${decodeArr.map(fmt).join(" ")}]` : "";
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode${decode}`,
      bytes,
      { allowCompress: false }
      // já comprimido
    );
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
    const rgb3 = new Uint8Array(widthPx * heightPx * 3);
    const alpha = new Uint8Array(widthPx * heightPx);
    let hasAlpha = false;
    for (let i = 0, j = 0, k = 0; i < rgba.length; i += 4, j += 3, k++) {
      rgb3[j] = rgba[i];
      rgb3[j + 1] = rgba[i + 1];
      rgb3[j + 2] = rgba[i + 2];
      const a = rgba[i + 3];
      alpha[k] = a;
      if (a !== 255) hasAlpha = true;
    }
    let smask = "";
    if (hasAlpha) {
      const smaskNum = this.writer.addStream(
        `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceGray /BitsPerComponent 8`,
        alpha
      );
      smask = ` /SMask ${smaskNum} 0 R`;
    }
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`,
      rgb3
    );
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  /**
   * Degradê axial (ShadingType 2, do ponto 0 ao 1) ou radial (ShadingType 3,
   * círculos concêntricos de centro (x0,y0), raio 0 → r) com cores amostradas
   * (função tipo 0: n amostras RGB de 8 bits, como o Word grava). Coordenadas em
   * pt com y a partir do TOPO; estende as cores das pontas.
   */
  addShading(geom, samples, pageHeightPt) {
    const n = Math.max(2, Math.floor(samples.length / 3));
    const fn = this.writer.addStream(
      `/FunctionType 0 /Domain [0 1] /Range [0 1 0 1 0 1] /Size [${n}] /BitsPerSample 8 /Order 1 /Encode [0 ${n - 1}]`,
      samples.subarray(0, n * 3)
    );
    const H = pageHeightPt;
    const coords = geom.kind === "axial" ? `/ShadingType 2 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.x1)} ${fmt(H - geom.y1)}]` : `/ShadingType 3 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} 0 ${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.r)}]`;
    const objNum = this.writer.addDict(`<< /ColorSpace /DeviceRGB ${coords} /Extend [true true] /Function ${fn} 0 R >>`);
    const handle = { resourceName: `Sh${this.shadings.length}`, objNum };
    this.shadings.push(handle);
    return handle;
  }
  addPage(widthPt, heightPt) {
    const p = new PdfPage(widthPt, heightPt, (ca, CA) => {
      const key = `${fmt(ca)}|${fmt(CA)}`;
      let name = this.alphaStates.get(key);
      if (!name) {
        name = `GS${this.alphaStates.size}`;
        this.alphaStates.set(key, name);
      }
      return name;
    });
    this.pages.push(p);
    return p;
  }
  /** Serializa o PDF completo. */
  build() {
    const w = this.writer;
    const fontRefs = this.fonts.map((f) => ({ name: f.resourceName, ref: f.write(w) }));
    const fontDict = fontRefs.length ? `/Font << ${fontRefs.map((f) => `/${f.name} ${f.ref} 0 R`).join(" ")} >>` : "";
    const xobjDict = this.images.length ? `/XObject << ${this.images.map((i) => `/${i.handle.resourceName} ${i.objNum} 0 R`).join(" ")} >>` : "";
    const gsDict = this.alphaStates.size ? `/ExtGState << ${[...this.alphaStates].map(([k, n]) => {
      const [ca, CA] = k.split("|");
      return `/${n} << /Type /ExtGState /ca ${ca} /CA ${CA} >>`;
    }).join(" ")} >>` : "";
    const shDict = this.shadings.length ? `/Shading << ${this.shadings.map((h) => `/${h.resourceName} ${h.objNum} 0 R`).join(" ")} >>` : "";
    const resources = gsDict || shDict ? `<< ${fontDict} ${xobjDict} ${gsDict} ${shDict} >>` : `<< ${fontDict} ${xobjDict} >>`;
    const catalog = w.alloc();
    const pagesNode = w.alloc();
    const pageRefs = [];
    for (const page of this.pages) {
      const contentNum = w.addStream("", page.content.toUint8Array());
      const pageNum = w.addDict(
        `<< /Type /Page /Parent ${pagesNode} 0 R /MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] /Resources ${resources} /Contents ${contentNum} 0 R >>`
      );
      pageRefs.push(pageNum);
    }
    w.define(
      pagesNode,
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] >>`
    );
    w.define(catalog, `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w.build(catalog);
  }
};

// ../docx-layout/src/resolve.ts
var TOGGLES = ["b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss", "imprint", "vanish"];
function mergeRFonts(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  const out = { ...base };
  const slot = (name, theme) => {
    if (over[name] !== void 0 || over[theme] !== void 0) {
      delete out[name];
      delete out[theme];
      if (over[name] !== void 0) out[name] = over[name];
      if (over[theme] !== void 0) out[theme] = over[theme];
    }
  };
  slot("ascii", "asciiTheme");
  slot("hAnsi", "hAnsiTheme");
  slot("eastAsia", "eastAsiaTheme");
  slot("cs", "cstheme");
  if (over.hint !== void 0) out.hint = over.hint;
  return out;
}
function mergeRPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const f = mergeRFonts(base.rFonts, over.rFonts);
  if (f) out.rFonts = f;
  if (base.lang && over.lang) out.lang = { ...base.lang, ...over.lang };
  return out;
}
function mergeTabs(base, over) {
  if (!over) return base;
  const map = /* @__PURE__ */ new Map();
  for (const t of base ?? []) map.set(t.pos, t);
  for (const t of over) {
    if (t.val === "clear") map.delete(t.pos);
    else map.set(t.pos, t);
  }
  return [...map.values()].sort((a, b) => a.pos - b.pos);
}
function mergePPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over, ...over.tabs ? { tabs: over.tabs.filter((t) => t.val !== "clear") } : {} };
  const out = { ...base, ...over };
  if (base.spacing || over.spacing) out.spacing = { ...base.spacing, ...over.spacing };
  if (base.ind || over.ind) {
    const ind = { ...base.ind, ...over.ind };
    if (over.ind?.hanging !== void 0 && over.ind.firstLine === void 0) delete ind.firstLine;
    if (over.ind?.firstLine !== void 0 && over.ind.hanging === void 0) delete ind.hanging;
    if (over.ind?.hangingChars !== void 0) delete ind.firstLineChars;
    if (over.ind?.firstLineChars !== void 0) delete ind.hangingChars;
    out.ind = ind;
  }
  if (base.pBdr || over.pBdr) out.pBdr = { ...base.pBdr, ...over.pBdr };
  if (base.numPr || over.numPr) out.numPr = { ...base.numPr, ...over.numPr };
  const tabs = mergeTabs(base.tabs, over.tabs);
  if (tabs) out.tabs = tabs;
  if (base.rPr || over.rPr) out.rPr = mergeRPr(base.rPr, over.rPr);
  if (base.framePr || over.framePr) out.framePr = { ...base.framePr, ...over.framePr };
  return out;
}
function mergeBorders(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}
function mergeMargins(base, over) {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}
function mergeTblPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const b = mergeBorders(base.tblBorders, over.tblBorders);
  if (b) out.tblBorders = b;
  const m = mergeMargins(base.tblCellMar, over.tblCellMar);
  if (m) out.tblCellMar = m;
  if (base.tblLook || over.tblLook) out.tblLook = { ...base.tblLook, ...over.tblLook };
  return out;
}
function mergeTrPr(base, over) {
  return { ...base ?? {}, ...over ?? {} };
}
function mergeTcPr(base, over) {
  if (!over) return { ...base ?? {} };
  if (!base) return { ...over };
  const out = { ...base, ...over };
  const b = mergeBorders(base.tcBorders, over.tcBorders);
  if (b) out.tcBorders = b;
  const m = mergeMargins(base.tcMar, over.tcMar);
  if (m) out.tcMar = m;
  return out;
}
var COND_ORDER = [
  "wholeTable",
  "band1Vert",
  "band2Vert",
  "band1Horz",
  "band2Horz",
  "firstCol",
  "lastCol",
  "firstRow",
  "lastRow",
  "nwCell",
  "neCell",
  "swCell",
  "seCell"
];
var StyleResolver = class {
  constructor(fmt2) {
    this.fmt = fmt2;
    this.styles = fmt2.styles.styles;
    this.docDefaults = fmt2.styles.docDefaults;
    this.defaults = fmt2.styles.defaults;
  }
  fmt;
  paraCache = /* @__PURE__ */ new Map();
  charCache = /* @__PURE__ */ new Map();
  tableCache = /* @__PURE__ */ new Map();
  styles;
  docDefaults;
  defaults;
  chain(id, type) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    let cur = id ? own(this.styles, id) : void 0;
    while (cur && !seen.has(cur.styleId) && out.length < 32) {
      if (cur.type !== type) break;
      seen.add(cur.styleId);
      out.unshift(cur);
      cur = cur.basedOn ? own(this.styles, cur.basedOn) : void 0;
    }
    return out;
  }
  /** Cadeia basedOn de um estilo de parágrafo (raiz primeiro). */
  paraChain(id) {
    return this.chain(this.paraStyleId(id) ?? "", "paragraph");
  }
  /** Estilo de parágrafo efetivo (ausente/inexistente → estilo padrão). */
  paraStyleId(id) {
    if (id && own(this.styles, id)?.type === "paragraph") return id;
    return this.defaults.paragraph;
  }
  paraStyle(id) {
    const key = this.paraStyleId(id) ?? "";
    let r = this.paraCache.get(key);
    if (!r) {
      let pPr = {};
      let rPr = {};
      for (const s of this.chain(key, "paragraph")) {
        pPr = mergePPr(pPr, s.pPr);
        rPr = mergeRPr(rPr, s.rPr);
      }
      r = { pPr, rPr };
      this.paraCache.set(key, r);
    }
    return r;
  }
  charStyle(id) {
    if (!id) return {};
    let r = this.charCache.get(id);
    if (!r) {
      r = {};
      for (const s of this.chain(id, "character")) r = mergeRPr(r, s.rPr);
      if (!this.chain(id, "character").length && own(this.styles, id)?.type === "paragraph") r = this.paraStyle(id).rPr;
      this.charCache.set(id, r);
    }
    return r;
  }
  tableStyle(id) {
    const key = id && own(this.styles, id)?.type === "table" ? id : this.defaults.table ?? "";
    let r = this.tableCache.get(key);
    if (!r) {
      r = { tblPr: {}, trPr: {}, tcPr: {}, pPr: {}, rPr: {}, cond: {} };
      if (this.chain(key, "table").length) r.hasStyle = true;
      for (const s of this.chain(key, "table")) {
        r.tblPr = mergeTblPr(r.tblPr, s.tblPr);
        r.trPr = mergeTrPr(r.trPr, s.trPr);
        r.tcPr = mergeTcPr(r.tcPr, s.tcPr);
        r.pPr = mergePPr(r.pPr, s.pPr);
        r.rPr = mergeRPr(r.rPr, s.rPr);
        for (const [t, part] of Object.entries(s.tblStylePr ?? {})) {
          const prev = r.cond[t] ?? {};
          r.cond[t] = {
            pPr: mergePPr(prev.pPr, part.pPr),
            rPr: mergeRPr(prev.rPr, part.rPr),
            tblPr: mergeTblPr(prev.tblPr, part.tblPr),
            trPr: mergeTrPr(prev.trPr, part.trPr),
            tcPr: mergeTcPr(prev.tcPr, part.tcPr)
          };
        }
      }
      this.tableCache.set(key, r);
    }
    return r;
  }
};
function cascadeRPr(docDefaults, styleLevels, direct) {
  let out = { ...docDefaults ?? {} };
  const toggled = {};
  for (const lvl of styleLevels) {
    if (!lvl) continue;
    const { ...rest } = lvl;
    for (const k of TOGGLES) {
      if (lvl[k] === void 0) continue;
      delete rest[k];
      if (lvl[k]) toggled[k] = !(toggled[k] ?? false);
      else toggled[k] ??= false;
    }
    out = mergeRPr(out, rest);
  }
  for (const k of TOGGLES) {
    const t = toggled[k];
    if (t === void 0) continue;
    const base = docDefaults?.[k] ?? false;
    out[k] = t ? !base : base;
  }
  return mergeRPr(out, direct);
}
function fontOfSlot(rf, slot, theme) {
  if (!rf) return void 0;
  const themeKey = slot === "cs" ? "cstheme" : `${slot}Theme`;
  const t = rf[themeKey];
  if (t) {
    const set = t.startsWith("major") ? theme.major : theme.minor;
    const name = t.endsWith("EastAsia") ? set.ea : t.endsWith("Bidi") ? set.cs : set.latin;
    if (name) return name;
  }
  return rf[slot];
}
var own = (rec, k) => rec && k !== void 0 && Object.hasOwn(rec, k) ? rec[k] : void 0;
var HIGHLIGHT = {
  yellow: "FFFF00",
  green: "00FF00",
  cyan: "00FFFF",
  magenta: "FF00FF",
  blue: "0000FF",
  red: "FF0000",
  darkBlue: "000080",
  darkCyan: "008080",
  darkGreen: "008000",
  darkMagenta: "800080",
  darkRed: "800000",
  darkYellow: "808000",
  darkGray: "808080",
  lightGray: "C0C0C0",
  black: "000000",
  white: "FFFFFF"
};
var highlightHex = (name) => own(HIGHLIGHT, name);
var THEME_ALIAS = {
  text1: "dk1",
  background1: "lt1",
  text2: "dk2",
  background2: "lt2",
  dark1: "dk1",
  light1: "lt1",
  dark2: "dk2",
  light2: "lt2",
  hyperlink: "hlink",
  followedHyperlink: "folHlink",
  tx1: "dk1",
  bg1: "lt1",
  tx2: "dk2",
  bg2: "lt2"
};
function rgb(hex) {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function toHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return (c(r) + c(g) + c(b)).toUpperCase();
}
function applyTintShade(hex, tint, shade) {
  let [r, g, b] = rgb(hex);
  if (shade) {
    const s = parseInt(shade, 16) / 255;
    r *= s;
    g *= s;
    b *= s;
  }
  if (tint) {
    const t = parseInt(tint, 16) / 255;
    r = 255 - (255 - r) * t;
    g = 255 - (255 - g) * t;
    b = 255 - (255 - b) * t;
  }
  return toHex(r, g, b);
}
function resolveColor(spec, theme) {
  if (!spec) return void 0;
  if (spec.themeColor) {
    const key = own(THEME_ALIAS, spec.themeColor) ?? spec.themeColor;
    const base = own(theme.colors, key);
    if (base) return applyTintShade(base, spec.themeTint, spec.themeShade);
  }
  const v = spec.val;
  if (!v || v === "auto") return void 0;
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : void 0;
}
function resolveDrawingColor(spec, theme) {
  if (!spec) return void 0;
  const [head, mods] = spec.split("|");
  let hex = head.startsWith("@") ? own(theme.colors, own(THEME_ALIAS, head.slice(1)) ?? head.slice(1)) : head;
  if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return void 0;
  if (!mods) return hex.toUpperCase();
  let [r, g, b] = rgb(hex).map((v) => v / 255);
  const toHsl = () => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  };
  const fromHsl = (h, s, l) => {
    if (s === 0) {
      r = g = b = l;
      return;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = f(h + 1 / 3);
    g = f(h);
    b = f(h - 1 / 3);
  };
  for (const m of mods.split(",")) {
    const [k, vs] = m.split("=");
    const v = parseInt(vs ?? "0", 10) / 1e5;
    if (k === "lumMod" || k === "lumOff") {
      const [h, s, l] = toHsl();
      fromHsl(h, s, k === "lumMod" ? Math.min(1, l * v) : Math.min(1, l + v));
    } else if (k === "tint") {
      r = 1 - (1 - r) * v;
      g = 1 - (1 - g) * v;
      b = 1 - (1 - b) * v;
    } else if (k === "shade") {
      r *= v;
      g *= v;
      b *= v;
    }
  }
  return toHex(r * 255, g * 255, b * 255);
}

// ../docx-layout/src/fonts.ts
var metricsCache = /* @__PURE__ */ new WeakMap();
function faceMetrics(font) {
  let m = metricsCache.get(font);
  if (!m) {
    const fm = font.metrics;
    const u = fm.unitsPerEm || 1e3;
    const hheaTotal = fm.ascender - fm.descender + fm.lineGap;
    let asc, desc, gap;
    if ((fm.fsSelection ?? 0) & 128) {
      asc = fm.sTypoAscender;
      desc = -fm.sTypoDescender;
      gap = fm.sTypoLineGap;
    } else if (fm.usWinAscent > 0 || fm.usWinDescent > 0) {
      asc = fm.usWinAscent;
      desc = fm.usWinDescent;
      gap = Math.max(0, hheaTotal - (asc + desc));
    } else {
      asc = fm.ascender;
      desc = -fm.descender;
      gap = fm.lineGap;
    }
    if ((fm.codePageRange1 ?? 0) >>> 17 & 31) {
      const extra = Math.round(0.15 * (asc + desc));
      asc += extra;
      desc += extra;
      gap = 0;
    }
    const lineHeight = (asc + desc + gap) / u;
    m = {
      ascent: (gap + asc) / u,
      descent: desc / u,
      lineHeight,
      underlinePos: fm.underlinePosition ? -fm.underlinePosition / u : 0.1,
      underlineThick: fm.underlineThickness > 0 ? fm.underlineThickness / u : 0.05,
      bareAscent: asc / u,
      ...fm.ySuperscriptYOffset && fm.ySuperscriptYOffset > 0 ? { supOffset: fm.ySuperscriptYOffset / u } : {}
    };
    metricsCache.set(font, m);
  }
  return m;
}
var VERT_TABLE = {
  "arial": ["5555666767878999aabbbcccdcdeeefffgggh", "1111221112221222222322233322333344434"],
  "calibri": ["5544555677888999aabbabbbcccdddeeefffg", "1221122212222322233333334434444544455"],
  "courier new": ["35445556567667778899999aababbccccdddd", "1221122222222322333233344434445444555"],
  "segoe ui": ["4556666778989aaabbccbddceeefffggghhhi", "1121112221222232223333333344334445444"],
  "times new roman": ["4555666777899999aabbbcccddeffefffgggh", "1112211222222222322233323233333333344"],
  "tahoma": ["4555666777888999aabbbcccdddeeefffgggh", "0111122211222212222223222333323333444"],
  "verdana": ["4555666777888999aabbbcccdddeeefffgggh", "0111112211222232222233222333223333444"],
  "cambria": ["333444455556666777788889999aaaabbbbcc", "1111111112221222222222333323333333344"],
  "georgia": ["334444555666677778888999aaaabbbbccccd", "1111111122221222222222333322333333333"],
  "century gothic": ["3344445555666677788889999aaaabbbbcccc", "1111111111122212222222222233333333333"]
};
var VERT_ALIAS = { "calibri light": "calibri" };
function vertTable(family, base, k) {
  const f = family.toLowerCase();
  const key = Object.hasOwn(VERT_ALIAS, f) ? VERT_ALIAS[f] : f;
  const t = Object.hasOwn(VERT_TABLE, key) ? VERT_TABLE[key][k] : void 0;
  const i = (base - 6) * 2;
  if (!t || !Number.isInteger(i) || i < 0 || i >= t.length) return void 0;
  return parseInt(t[i], 36) / 2;
}
function superscriptRaiseFor(family, m, base, sup) {
  return vertTable(family, base, 0) ?? superscriptRaisePt(m, base, sup);
}
function subscriptDropPt(family, base) {
  return vertTable(family, base, 1) ?? base * 0.08;
}
function superscriptRaisePt(m, base, sup) {
  const half = (v) => Math.floor(v * 2 + 0.5) / 2;
  const align = half(m.ascent * base - m.bareAscent * sup);
  return m.supOffset !== void 0 ? Math.min(half(m.supOffset * base), align) : align;
}
function isSymbolFont(font) {
  return (font.metrics.codePageRange1 ?? 0) >>> 31 === 1 || font.glyphId(61472) !== 0;
}
var own2 = (rec, k) => rec && k !== void 0 && Object.hasOwn(rec, k) ? rec[k] : void 0;
var ALIASES = {
  helvetica: "Arial",
  "helvetica neue": "Arial",
  arialmt: "Arial",
  "arial mt": "Arial",
  "ms sans serif": "Microsoft Sans Serif",
  "tms rmn": "Times New Roman",
  times: "Times New Roman",
  "times roman": "Times New Roman",
  timesnewromanpsmt: "Times New Roman",
  "ms serif": "Times New Roman",
  courier: "Courier New",
  "courier newpsmt": "Courier New",
  couriernewpsmt: "Courier New",
  "ms shell dlg": "Microsoft Sans Serif",
  "ms shell dlg 2": "Tahoma",
  "arial unicode ms": "Arial",
  symbolmt: "Symbol",
  "wingdings-regular": "Wingdings",
  "zapfdingbats": "Wingdings"
};
function parsePostScriptName(name) {
  const m = /^([A-Za-z][A-Za-z0-9 ]*?)[-,](Bold|BoldMT|Italic|ItalicMT|BoldItalic|BoldItalicMT|Regular|MT|Roman|BoldOblique|Oblique|Light|Semibold)$/.exec(name);
  if (!m) return null;
  const fam = m[1].replace(/MT$/, "").replace(/PS$/, "");
  const st = m[2].toLowerCase();
  return {
    family: fam.replace(/([a-z])([A-Z])/g, "$1 $2"),
    bold: st.includes("bold") || void 0,
    italic: st.includes("italic") || st.includes("oblique") || void 0
  };
}
function genericFor(info) {
  switch (info?.family) {
    case "roman":
      return "Times New Roman";
    case "modern":
      return "Courier New";
    case "script":
      return "Times New Roman";
    case "decorative":
      return "Times New Roman";
    case "swiss":
      return "Arial";
    default: {
      const p = info?.panose1;
      if (p && p.length >= 4) {
        const serif = parseInt(p.slice(2, 4), 16);
        if (serif >= 11 && serif <= 13) return "Arial";
        if (serif > 0 && serif < 11) return "Times New Roman";
      }
      return "Times New Roman";
    }
  }
}
var CJK_DEFAULT = {
  "80": ["Yu Gothic", "Yu Gothic"],
  "81": ["Dotum", "Batang"],
  "86": ["Microsoft YaHei", "SimSun"],
  "88": ["Microsoft JhengHei", "PMingLiU"]
};
var FaceResolver = class {
  constructor(provider, fontTable = {}, fallbacks = ["Times New Roman", "Arial", "Liberation Serif", "Liberation Sans"], docDefault) {
    this.provider = provider;
    this.fontTable = fontTable;
    this.fallbacks = fallbacks;
    this.docDefault = docDefault;
  }
  provider;
  fontTable;
  fallbacks;
  docDefault;
  cache = /* @__PURE__ */ new Map();
  get(family, bold, italic) {
    const fam = (family ?? "").trim() || "Times New Roman";
    const key = `${fam.toLowerCase()}|${bold ? 1 : 0}${italic ? 1 : 0}`;
    let f = this.cache.get(key);
    if (!f) {
      f = this.lookup(fam, bold, italic);
      this.cache.set(key, f);
    }
    return f;
  }
  lookup(fam, bold, italic) {
    const tries = [{ family: fam, bold, italic }];
    const alias = own2(ALIASES, fam.toLowerCase());
    const info0 = own2(this.fontTable, fam);
    const cjk = CJK_DEFAULT[info0?.charset?.toUpperCase() ?? ""]?.[info0?.family === "roman" ? 1 : 0];
    if (cjk) {
      if (!alias && info0?.altName) for (const alt of info0.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
      tries.push({ family: cjk, bold, italic });
    }
    if (alias) tries.push({ family: alias, bold, italic });
    const ps = parsePostScriptName(fam);
    if (ps) {
      const a2 = own2(ALIASES, ps.family.toLowerCase()) ?? ps.family;
      tries.push({ family: a2, bold: bold || !!ps.bold, italic: italic || !!ps.italic });
    }
    const info = own2(this.fontTable, fam);
    if (info?.altName) for (const alt of info.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
    const symbolic = info?.charset === "02" || info?.family === "decorative";
    if (!symbolic) {
      const arabic = info?.sig?.usb0 ? (parseInt(info.sig.usb0, 16) & 1 << 13) !== 0 : false;
      if (arabic) tries.push({ family: info?.family === "roman" ? "Sakkal Majalla" : "Arial", bold, italic });
      else tries.push({ family: !info || info.family === "roman" ? "Cambria" : "Calibri", bold, italic });
    }
    void this.docDefault;
    tries.push({ family: genericFor(info), bold, italic });
    for (const fb of this.fallbacks) tries.push({ family: fb, bold, italic });
    for (const t of tries) {
      if (!t.family) continue;
      const face = this.provider.face(t.family, t.bold, t.italic);
      if (face) return face;
    }
    throw new Error(`nenhuma fonte dispon\xEDvel para "${fam}"`);
  }
};
function withEmbeddedFonts(provider, embedded, makeFont) {
  if (!embedded.length) return provider;
  const byFam = /* @__PURE__ */ new Map();
  for (const e of embedded) {
    try {
      const font = makeFont(e.data);
      const m = byFam.get(e.family.toLowerCase()) ?? /* @__PURE__ */ new Map();
      m.set(e.variant, { font, bytes: e.data });
      byFam.set(e.family.toLowerCase(), m);
    } catch {
    }
  }
  const cache = /* @__PURE__ */ new Map();
  return {
    face(family, bold, italic) {
      const fam = byFam.get(family.toLowerCase());
      if (!fam) return provider.face(family, bold, italic);
      const key = `${family.toLowerCase()}|${bold}|${italic}`;
      if (cache.has(key)) return cache.get(key);
      const want = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
      const order = [want, bold ? "bold" : "regular", italic ? "italic" : "regular", "regular", "bold", "italic", "boldItalic"];
      let out = null;
      for (const v of order) {
        const f = fam.get(v);
        if (!f) continue;
        const fb = v === "bold" || v === "boldItalic", fi = v === "italic" || v === "boldItalic";
        out = {
          key: `embed:${family}|${v}`,
          family,
          font: f.font,
          bytes: f.bytes,
          bold,
          italic,
          ...bold && !fb ? { synthBold: true } : {},
          ...italic && !fi ? { synthItalic: true } : {}
        };
        break;
      }
      if (out && (out.synthBold || out.synthItalic)) out = provider.face(family, bold, italic) ?? out;
      cache.set(key, out);
      return out;
    }
  };
}

// ../docx-layout/src/numbering.ts
var ROMAN = [
  [1e3, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"]
];
function roman(n) {
  if (n <= 0) return String(n);
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) {
    out += s;
    n -= v;
  }
  return out;
}
function letters(n) {
  if (n <= 0) return String(n);
  const ch = String.fromCharCode(97 + (n - 1) % 26);
  return ch.repeat(Math.floor((n - 1) / 26) + 1);
}
var UNITS_PT = [
  "zero",
  "um",
  "dois",
  "tr\xEAs",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove"
];
var TENS_PT = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
function cardinalPt(n) {
  if (n < 20) return UNITS_PT[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return TENS_PT[t] + (u ? ` e ${UNITS_PT[u]}` : "");
  }
  return String(n);
}
function formatNumber(n, fmt2, lang = "pt-BR") {
  switch (fmt2) {
    case void 0:
    case "decimal":
      return String(n);
    case "decimalZero":
      return n < 10 && n >= 0 ? `0${n}` : String(n);
    case "upperRoman":
      return roman(n).toUpperCase();
    case "lowerRoman":
      return roman(n);
    case "upperLetter":
      return letters(n).toUpperCase();
    case "lowerLetter":
      return letters(n);
    case "ordinal":
      return lang.startsWith("pt") ? `${n}\xBA` : `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "th"}`;
    case "cardinalText": {
      const s = cardinalPt(n);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case "ordinalText":
      return `${n}\xBA`;
    case "hex":
      return n.toString(16).toUpperCase();
    case "decimalEnclosedCircle":
      return n >= 1 && n <= 20 ? String.fromCodePoint(9312 + n - 1) : String(n);
    case "decimalEnclosedParen":
      return `(${n})`;
    case "decimalEnclosedFullstop":
      return `${n}.`;
    case "none":
      return "";
    case "bullet":
      return "";
    default:
      return String(n);
  }
}
var NumberingState = class _NumberingState {
  constructor(numbering, styles, lang = "pt-BR") {
    this.numbering = numbering;
    this.styles = styles;
    this.lang = lang;
  }
  numbering;
  styles;
  lang;
  /** contadores por abstractNum (compartilhados por todos os w:num dele) */
  counters = /* @__PURE__ */ new Map();
  /** w:num já usados (o startOverride só reinicia no 1º uso) */
  seenNums = /* @__PURE__ */ new Set();
  /** "numId:ilvl" com startOverride adiado (nível pai ainda sem uso no 1º uso do w:num) */
  deferred = /* @__PURE__ */ new Set();
  /** Cópia independente dos contadores (medições sem efeito colateral). */
  clone() {
    const c = new _NumberingState(this.numbering, this.styles, this.lang);
    for (const [k, v] of this.counters) c.counters.set(k, v.map((x) => x ? { ...x } : x));
    for (const n of this.seenNums) c.seenNums.add(n);
    for (const d of this.deferred) c.deferred.add(d);
    return c;
  }
  /** Lista (abstractNum efetivo) de um w:num — espaçamento automático entre itens. */
  listKey(numId) {
    const a = numId ? this.abstractFor(numId) : null;
    return a ? `a${a.absId}` : void 0;
  }
  /** abstractNum efetivo (segue numStyleLink → estilo de numeração → numId). */
  abstractFor(numId, depth = 0) {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const abs = this.numbering.abstractNums[inst.abstractNumId];
    if (!abs) return null;
    if (abs.numStyleLink && depth < 4) {
      const st = own(this.styles, abs.numStyleLink);
      const linked = st?.pPr?.numPr?.numId;
      if (linked !== void 0 && linked !== numId) {
        const r = this.abstractFor(linked, depth + 1);
        if (r) return r;
      }
    }
    return { absId: abs.abstractNumId };
  }
  /** Nível efetivo (override da instância > abstractNum). */
  level(numId, ilvl) {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const ov = inst.overrides[ilvl]?.lvl;
    if (ov && (ov.lvlText !== void 0 || ov.numFmt !== void 0)) return ov;
    const a = this.abstractFor(numId);
    const abs = a ? this.numbering.abstractNums[a.absId] : void 0;
    return abs?.levels[ilvl] ?? null;
  }
  /**
   * Avança o contador e devolve o marcador do parágrafo (null = sem numeração).
   * Regras medidas no Word (oráculo numbering2):
   *  - o contador é do abstractNum, compartilhado por todos os w:num dele;
   *  - startOverride só age no 1º uso do w:num: os níveis com override do
   *    nível do parágrafo para baixo reiniciam (valem o override); um nível
   *    pai com override ainda sem uso fica com o valor do override (o próximo
   *    parágrafo de OUTRO w:num nele soma 1) e reinicia no 1º parágrafo deste
   *    w:num naquele nível; pai já usado ignora o override;
   *  - o início do nível de um w:num é o seu startOverride (vale nos reinícios);
   *  - nível pai nunca usado (parágrafo pulou níveis) aparece com o início do
   *    nível e passa a contar: o próximo parágrafo nele vem com início + 1.
   */
  next(numId, ilvl) {
    if (!numId) return null;
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const a = this.abstractFor(numId);
    if (!a) return null;
    ilvl = Math.max(0, Math.min(8, ilvl));
    const lvl = this.level(numId, ilvl);
    if (!lvl) return null;
    const key = `a${a.absId}`;
    let c = this.counters.get(key);
    if (!c) {
      c = [];
      this.counters.set(key, c);
    }
    const ovStart = (l) => inst.overrides[l]?.startOverride;
    const lvlStart = (l) => this.level(numId, l)?.start ?? 0;
    const startOf = (l) => ovStart(l) ?? lvlStart(l);
    if (!this.seenNums.has(numId)) {
      this.seenNums.add(numId);
      for (let l = 0; l < 9; l++) {
        const s = ovStart(l);
        if (s === void 0) continue;
        if (l >= ilvl) c[l] = void 0;
        else if (!c[l]?.real) {
          c[l] = { v: s, real: false };
          this.deferred.add(`${numId}:${l}`);
        }
      }
    }
    const cur = c[ilvl];
    if (this.deferred.delete(`${numId}:${ilvl}`) || !cur) c[ilvl] = { v: startOf(ilvl), real: true };
    else c[ilvl] = { v: cur.v + 1, real: true };
    for (let l = 0; l < ilvl; l++) if (!c[l]) c[l] = { v: startOf(l), real: false };
    for (let d = ilvl + 1; d < 9; d++) {
      const r = this.level(numId, d)?.lvlRestart;
      if (r === 0) continue;
      if (r === void 0 || ilvl < r) c[d] = void 0;
    }
    const lvlText = lvl.lvlTextNull ? "" : lvl.lvlText ?? "";
    let text;
    if (lvl.numFmt === "bullet") text = lvlText;
    else {
      text = lvlText.replace(/%([1-9])/g, (_, k) => {
        const l = parseInt(k, 10) - 1;
        const n = c[l];
        const v = n?.real ? n.v : lvlStart(l);
        const fmt2 = lvl.isLgl && l !== ilvl ? "decimal" : this.level(numId, l)?.numFmt ?? "decimal";
        return formatNumber(v, fmt2 === "bullet" ? "decimal" : fmt2, this.lang);
      });
    }
    return { text, level: lvl, numId, ilvl, listKey: key };
  }
};

// ../docx-layout/src/context.ts
var DocContext = class {
  constructor(fmt2, provider, opts = {}) {
    this.fmt = fmt2;
    this.resolver = new StyleResolver(fmt2);
    const ddFonts = fmt2.styles.docDefaults.rPr?.rFonts;
    this.faces = new FaceResolver(provider, fmt2.fontTable, void 0, fontOfSlot(ddFonts, "ascii", fmt2.theme) ?? fmt2.theme.minor.latin);
    this.opts = { advanceEm: opts.advanceEm ?? "nominal", advanceRound: opts.advanceRound ?? "word", justifyShrink: opts.justifyShrink ?? { ratio: 0.25, expandRatio: 0.5 }, lang: opts.lang ?? "pt-BR", now: opts.now ?? /* @__PURE__ */ new Date(), ...opts.onWordFit ? { onWordFit: opts.onWordFit } : {}, hyphenation: opts.hyphenation ?? true, ...opts.hyphenationLanguages ? { hyphenationLanguages: opts.hyphenationLanguages } : {} };
    this.numbering = new NumberingState(fmt2.numbering, fmt2.styles.styles, this.opts.lang);
  }
  fmt;
  resolver;
  faces;
  numbering;
  warnings = /* @__PURE__ */ new Set();
  opts;
  warn(msg) {
    this.warnings.add(msg);
  }
  footnotes = /* @__PURE__ */ new Map();
  endnotes = /* @__PURE__ */ new Map();
  /** contadores dos campos SEQ (ordem do documento) */
  seqCounters = /* @__PURE__ */ new Map();
  /** Fotografia do estado que avança com o conteúdo. */
  saveFlow() {
    return { numbering: this.numbering.clone(), seq: new Map(this.seqCounters), footnotes: new Map(this.footnotes), endnotes: new Map(this.endnotes) };
  }
  /** Volta ao estado fotografado (a fotografia continua reutilizável). */
  restoreFlow(s) {
    this.numbering = s.numbering.clone();
    this.seqCounters = new Map(s.seq);
    this.footnotes = new Map(s.footnotes);
    this.endnotes = new Map(s.endnotes);
  }
  /** Medição sem efeito colateral: não avança listas, SEQ nem números de nota. */
  pure(fn) {
    const s = this.saveFlow();
    try {
      return fn();
    } finally {
      this.restoreFlow(s);
    }
  }
  /** Número exibido da nota de rodapé (ordem da 1ª referência). */
  footnoteNumber(id) {
    let n = this.footnotes.get(id);
    if (n === void 0) {
      n = this.footnotes.size + 1;
      this.footnotes.set(id, n);
    }
    return n;
  }
  endnoteNumber(id) {
    let n = this.endnotes.get(id);
    if (n === void 0) {
      n = this.endnotes.size + 1;
      this.endnotes.set(id, n);
    }
    return n;
  }
};
function emptyFormatting() {
  return {
    styles: { docDefaults: {}, styles: {}, defaults: {} },
    numbering: { abstractNums: {}, nums: {}, picBullets: {} },
    theme: { major: { scripts: {} }, minor: { scripts: {} }, colors: {} },
    settings: {
      defaultTabStop: 720,
      compatibilityMode: 15,
      compat: {},
      evenAndOddHeaders: false,
      mirrorMargins: false,
      autoHyphenation: false,
      doNotHyphenateCaps: false,
      displayBackgroundShape: false,
      updateFields: false
    },
    fontTable: {}
  };
}
var eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function directRPr(run) {
  const base = run.rpr ? { ...run.rpr } : {};
  const p = run.props;
  const orig = editBaseProps(run, run.rpr);
  if (!run.rpr) {
    if (p.bold) base.b = true;
    if (p.italic) base.i = true;
    if (p.underline && !(p.link && !p.underlineStyle && !p.underlineColor)) base.u = { val: p.underlineStyle ?? "single", ...p.underlineColor ? { color: p.underlineColor } : {} };
    if (p.strike) base.strike = true;
    if (p.doubleStrike) base.dstrike = true;
    if (p.allCaps) base.caps = true;
    if (p.smallCaps) base.smallCaps = true;
    if (p.vertAlign && p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign;
    if (p.szHalfPt !== void 0) base.sz = p.szHalfPt;
    if (p.color && !(p.link && p.color === "0563C1")) base.color = { val: p.color };
    if (p.highlight) base.highlight = p.highlight;
    if (p.fontAscii && p.fontAscii !== orig.fontAscii) base.rFonts = { ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii };
    if (p.charSpacingTwips) base.spacing = p.charSpacingTwips;
    return base;
  }
  if (p.bold !== orig.bold) base.b = p.bold;
  if (p.italic !== orig.italic) base.i = p.italic;
  if (p.underline !== orig.underline || p.underlineStyle !== orig.underlineStyle || p.underlineColor !== orig.underlineColor) {
    base.u = p.underline ? { val: p.underlineStyle ?? "single", ...p.underlineColor ? { color: p.underlineColor } : {} } : { val: "none" };
  }
  if (p.strike !== orig.strike) base.strike = p.strike;
  if (p.doubleStrike !== orig.doubleStrike) base.dstrike = !!p.doubleStrike;
  if (p.allCaps !== orig.allCaps) base.caps = p.allCaps;
  if (p.smallCaps !== orig.smallCaps) base.smallCaps = p.smallCaps;
  if (p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign ?? "baseline";
  if (p.szHalfPt !== orig.szHalfPt) {
    if (p.szHalfPt === void 0) delete base.sz;
    else base.sz = p.szHalfPt;
  }
  if (p.color !== orig.color) {
    if (p.color === void 0) delete base.color;
    else base.color = { val: p.color };
  }
  if (p.highlight !== orig.highlight) {
    if (p.highlight === void 0) delete base.highlight;
    else base.highlight = p.highlight;
  }
  if (p.fontAscii !== orig.fontAscii) {
    if (p.fontAscii === void 0) delete base.rFonts;
    else base.rFonts = { ...base.rFonts, ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii, asciiTheme: void 0, hAnsiTheme: void 0, cstheme: void 0 };
  }
  if (p.charSpacingTwips !== orig.charSpacingTwips) {
    if (!p.charSpacingTwips) delete base.spacing;
    else base.spacing = p.charSpacingTwips;
  }
  return base;
}
function directPPr(para) {
  const base = para.ppr ? { ...para.ppr } : {};
  const p = para.props;
  const orig = paraPropsFromPPr(para.ppr);
  if (!eq(p.alignment, orig.alignment)) {
    if (p.alignment) base.jc = p.alignment;
    else delete base.jc;
  }
  if (p.styleId !== orig.styleId) {
    if (p.styleId) base.pStyle = p.styleId;
    else delete base.pStyle;
  }
  if (!eq(p.numbering, orig.numbering)) {
    if (!p.numbering) base.numPr = { numId: 0 };
    else if (para.ppr?.numPr?.numId) base.numPr = { ...para.ppr.numPr, ilvl: p.numbering.ilvl };
    else base.numPr = { numId: p.numbering.kind === "decimal" ? 1002 : 1001, ilvl: p.numbering.ilvl };
  }
  if (p.indentLeftTwips !== orig.indentLeftTwips || p.indentRightTwips !== orig.indentRightTwips || p.indentFirstLineTwips !== orig.indentFirstLineTwips) {
    const ind = { ...base.ind };
    if (p.indentLeftTwips !== void 0) ind.left = p.indentLeftTwips;
    else delete ind.left;
    if (p.indentRightTwips !== void 0) ind.right = p.indentRightTwips;
    else delete ind.right;
    delete ind.firstLine;
    delete ind.hanging;
    if (p.indentFirstLineTwips !== void 0) {
      if (p.indentFirstLineTwips < 0) ind.hanging = -p.indentFirstLineTwips;
      else ind.firstLine = p.indentFirstLineTwips;
    }
    base.ind = ind;
  }
  if (p.lineTwentieths !== orig.lineTwentieths || p.spaceAfterTwips !== orig.spaceAfterTwips || p.spaceBeforeTwips !== orig.spaceBeforeTwips) {
    const sp = { ...base.spacing };
    if (p.lineTwentieths !== orig.lineTwentieths) {
      if (p.lineTwentieths !== void 0) {
        sp.line = p.lineTwentieths;
        sp.lineRule = "auto";
      } else {
        delete sp.line;
        delete sp.lineRule;
      }
    }
    if (p.spaceAfterTwips !== orig.spaceAfterTwips) {
      if (p.spaceAfterTwips !== void 0) sp.after = p.spaceAfterTwips;
      else delete sp.after;
    }
    if (p.spaceBeforeTwips !== orig.spaceBeforeTwips) {
      if (p.spaceBeforeTwips !== void 0) sp.before = p.spaceBeforeTwips;
      else delete sp.before;
    }
    base.spacing = sp;
  }
  if (p.shadingHex !== orig.shadingHex) {
    if (p.shadingHex) base.shd = { val: "clear", fill: p.shadingHex };
    else delete base.shd;
  }
  if (!eq(p.borders, orig.borders)) {
    if (!p.borders) delete base.pBdr;
    else {
      base.pBdr = {};
      for (const side of ["top", "left", "bottom", "right"]) {
        const e = p.borders[side];
        if (e) base.pBdr[side] = { val: e.style, sz: e.sizeEighthPt, space: e.spacePt, ...e.color ? { color: e.color } : {} };
      }
    }
  }
  if (!eq(p.tabStops, orig.tabStops)) {
    base.tabs = (p.tabStops ?? []).map((t) => ({ val: t.align, pos: t.posTwips, ...t.leader ? { leader: t.leader } : {} }));
  }
  if (!!p.pageBreakBefore !== !!orig.pageBreakBefore) base.pageBreakBefore = !!p.pageBreakBefore;
  return base;
}

// ../docx-layout/src/math.ts
var K = { leading: 0, axis: 1, numUp: 28, numUpD: 29, denDown: 30, denDownD: 31, numGap: 32, numGapD: 33, rule: 34, denGap: 35, denGapD: 36 };
var CM = { 0: 300, 1: 585, 28: 1200, 29: 1550, 30: 1030, 31: 1370, 32: 133, 33: 260, 34: 133, 35: 133, 36: 260 };
var infoCache = /* @__PURE__ */ new WeakMap();
function fontInfo(face) {
  let info = infoCache.get(face.font);
  if (!info) {
    info = { upm: face.font.metrics.unitsPerEm || 2048, k: null, scriptPct: 73, ital: /* @__PURE__ */ new Map(), box: () => null };
    try {
      if (face.bytes) info = parseFont(face.bytes) ?? info;
    } catch {
    }
    infoCache.set(face.font, info);
  }
  return info;
}
function parseFont(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tables = /* @__PURE__ */ new Map();
  const n = v.getUint16(4);
  for (let i = 0; i < n; i++) {
    const p = 12 + 16 * i;
    tables.set(String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), v.getUint32(p + 8));
  }
  const head = tables.get("head");
  if (head === void 0) return null;
  const upm = v.getUint16(head + 18) || 2048;
  let k = null;
  let scriptPct = 73;
  const ital = /* @__PURE__ */ new Map();
  const m = tables.get("MATH");
  if (m !== void 0) {
    const c = m + v.getUint16(m + 4);
    scriptPct = v.getInt16(c) || 73;
    k = [];
    for (let i = 0; i <= 36; i++) k.push(v.getInt16(c + 8 + 4 * i));
    const gi = m + v.getUint16(m + 6);
    const io = v.getUint16(gi);
    if (io) {
      const ic = gi + io;
      const cov = ic + v.getUint16(ic);
      const cnt = v.getUint16(ic + 2);
      forCoverage(v, cov, (g, idx) => {
        if (idx < cnt) ital.set(g, v.getInt16(ic + 4 + 4 * idx));
      });
    }
  }
  const glyf = tables.get("glyf"), loca = tables.get("loca");
  const longLoca = v.getInt16(head + 50) === 1;
  const box = (gid) => {
    if (glyf === void 0 || loca === void 0) return null;
    const at = (i) => longLoca ? v.getUint32(loca + 4 * i) : v.getUint16(loca + 2 * i) * 2;
    const s = at(gid), e = at(gid + 1);
    if (e <= s || glyf + s + 10 > b.byteLength) return null;
    return [v.getInt16(glyf + s + 4), v.getInt16(glyf + s + 8)];
  };
  return { upm, k, scriptPct, ital, box };
}
function forCoverage(v, at, fn) {
  const fmt2 = v.getUint16(at), cnt = v.getUint16(at + 2);
  for (let i = 0; i < cnt; i++) {
    if (fmt2 === 1) fn(v.getUint16(at + 4 + 2 * i), i);
    else {
      const s = v.getUint16(at + 4 + 6 * i), e = v.getUint16(at + 6 + 6 * i), si = v.getUint16(at + 8 + 6 * i);
      for (let g = s; g <= e; g++) fn(g, si + g - s);
    }
  }
}
function kEm(info, i) {
  return info.k ? info.k[i] / info.upm : CM[i] / 2048;
}
var q600 = (tw) => Math.ceil(tw / 2.4 - 1e-6) * 2.4;
function mathTextMetrics(face) {
  const info = fontInfo(face);
  const fm = face.font.metrics;
  if (info.k && fm.sTypoAscender > 0) {
    const u = fm.unitsPerEm || 2048;
    return { ascent: (fm.sTypoAscender + Math.max(0, fm.sTypoLineGap)) / u, descent: -fm.sTypoDescender / u };
  }
  const m = faceMetrics(face.font);
  return { ascent: m.ascent, descent: m.descent };
}
var REL = new Set(Array.from("=<>\u2264\u2265\u2260\u2248\u2261\u223C\u2243\u2245\u221D\u2190\u2192\u2194\u21D0\u21D2\u21D4\u2208\u2209\u220B\u2282\u2283\u2286\u2287\u226A\u226B\u2254").map((c) => c.codePointAt(0)));
var BIN = new Set(Array.from("+-\u2212\xB1\u2213\xD7\xF7\xB7\u2217\u2218\u2219\u2229\u222A\u2227\u2228\u2295\u2297\u2296*").map((c) => c.codePointAt(0)));
var OPEN = new Set(Array.from("([{\u27E8\u2308\u230A").map((c) => c.codePointAt(0)));
var CLOSE = new Set(Array.from(")]}\u27E9\u2309\u230B").map((c) => c.codePointAt(0)));
var clsOf = (cp) => REL.has(cp) ? "rel" : BIN.has(cp) ? "bin" : OPEN.has(cp) ? "open" : CLOSE.has(cp) ? "close" : "ord";
function mathAlpha(cp, sty) {
  const up = cp >= 65 && cp <= 90, lo = cp >= 97 && cp <= 122;
  const s = sty ?? "i";
  if (s === "i") {
    if (cp === 104) return 8462;
    if (up) return 119860 + cp - 65;
    if (lo) return 119886 + cp - 97;
    if (cp >= 945 && cp <= 969) return 120572 + cp - 945;
  } else if (s === "b") {
    if (up) return 119808 + cp - 65;
    if (lo) return 119834 + cp - 97;
    if (cp >= 48 && cp <= 57) return 120782 + cp - 48;
  } else if (s === "bi") {
    if (up) return 119912 + cp - 65;
    if (lo) return 119938 + cp - 97;
  }
  return cp;
}
function mathAtoms(env, nodes, lvl = "D", scale = 1, off = { n: 0 }) {
  const atoms = [];
  for (const nd of nodes) {
    if (nd.t === "br") continue;
    if (nd.t === "f") {
      const o0 = off.n;
      const fb = fracBox(env, nd, lvl, scale, off);
      const st = env.styleOf(void 0);
      atoms.push({ kind: "frac", cp: 65532, face: env.face(false, false), sizePt: st.style.sizePt * scale, style: st.style, adv: fb.w, box: fb, offset: o0, cls: "ord", ital: 0, italic: false, top: fb.top, bottom: fb.bottom });
      continue;
    }
    const { style } = env.styleOf(nd.rpr);
    const size = style.sizePt * scale;
    const bold = nd.sty === "b" || nd.sty === "bi";
    for (const ch of Array.from(nd.text)) {
      const cp0 = ch.codePointAt(0);
      let cp = mathAlpha(cp0, nd.sty);
      let face = env.face(bold && cp === cp0, false);
      if (cp !== cp0 && face.font.glyphId(cp) === 0) {
        face = env.face(bold, nd.sty !== "b");
        cp = cp0;
      }
      const info = fontInfo(face);
      const gid = face.font.glyphId(cp);
      const bx = info.box(gid);
      const em = size * 20 / info.upm;
      const italic = cp !== cp0 && nd.sty !== "b";
      atoms.push({
        kind: "char",
        cp,
        face,
        sizePt: size,
        style,
        adv: env.adv(face, cp, size),
        offset: off.n,
        cls: clsOf(cp0),
        ital: italic ? (info.ital.get(gid) ?? 0) * em : 0,
        italic,
        top: bx ? Math.max(0, bx[1]) * em : 0,
        bottom: bx ? Math.max(0, -bx[0]) * em : 0
      });
      off.n += ch.length;
    }
  }
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    if (a.cls !== "bin") continue;
    const pv = atoms[i - 1]?.cls, nx = atoms[i + 1]?.cls;
    if (!pv || pv === "bin" || pv === "rel" || pv === "open" || !nx || nx === "rel" || nx === "close") a.cls = "ord";
  }
  const emTw = (a) => a.sizePt * 20;
  for (let i = 0; i + 1 < atoms.length; i++) {
    const a = atoms[i], b = atoms[i + 1];
    const kern = a.style.rpr.kern;
    if (kern && a.kind === "char" && b.kind === "char" && a.face === b.face && a.sizePt === b.sizePt && a.sizePt * 2 >= kern) a.adv += env.kern(a.face, a.cp, b.cp, a.sizePt);
    if (a.italic && !b.italic) a.adv += a.ital;
    if (lvl === "S") continue;
    let sp = 0;
    if (a.cls === "rel" !== (b.cls === "rel") && a.cls !== "open" && b.cls !== "close") sp = 5 / 18;
    else if ((a.cls === "bin" || b.cls === "bin") && a.cls !== "open") sp = 4 / 18;
    if (sp) a.adv += sp * emTw(a.cls === "ord" || a.cls === "close" ? b : a);
  }
  return atoms;
}
function rowBox(atoms) {
  const box = { w: 0, items: [], rules: [], top: 0, bottom: 0, lineTop: 0, lineBottom: 0 };
  let x = 0;
  for (const a of atoms) {
    if (a.kind === "frac" && a.box) {
      for (const it of a.box.items) box.items.push({ ...it, x: it.x + x });
      for (const r of a.box.rules) box.rules.push({ ...r, x: r.x + x });
    } else if (a.cp !== 32) {
      box.items.push({ cp: a.cp, x, y: 0, face: a.face, sizePt: a.sizePt, style: a.style });
    }
    box.top = Math.max(box.top, a.top);
    box.bottom = Math.max(box.bottom, a.bottom);
    x += a.adv;
  }
  box.w = x;
  return box;
}
function fracBox(env, f, lvl, scale, off) {
  const face = env.face(false, false);
  const info = fontInfo(face);
  const st = env.styleOf(void 0).style;
  const display = lvl === "D";
  const inner = display ? "T" : "S";
  const iscale = display ? scale : scale * (info.scriptPct / 100);
  const num = rowBox(mathAtoms(env, f.num, inner, iscale, off));
  const den = rowBox(mathAtoms(env, f.den, inner, iscale, off));
  const first = num.items[0] ?? den.items[0];
  const size = first ? first.sizePt * (scale / iscale) : st.sizePt * scale;
  const em = size * 20;
  const c = (i) => kEm(info, i) * em;
  const axis = c(K.axis), rule = c(K.rule);
  const noBar = f.type === "noBar";
  const ruleQ = noBar ? 0 : q600(rule);
  let numShift = c(display ? K.numUpD : K.numUp);
  let denShift = c(display ? K.denDownD : K.denDown);
  numShift = Math.max(numShift, axis + rule / 2 + c(display ? K.numGapD : K.numGap) + num.bottom);
  denShift = Math.max(denShift, den.top + c(display ? K.denGapD : K.denGap) - (axis - rule / 2));
  const numQ = q600(numShift), denQ = q600(denShift);
  const w = Math.max(num.w, den.w);
  const nx = (w - num.w) / 2, dx = (w - den.w) / 2;
  const box = {
    w,
    items: [
      ...num.items.map((it) => ({ ...it, x: it.x + nx, y: it.y - numQ })),
      ...den.items.map((it) => ({ ...it, x: it.x + dx, y: it.y + denQ }))
    ],
    rules: [
      ...num.rules.map((r) => ({ ...r, x: r.x + nx, y: r.y - numQ })),
      ...den.rules.map((r) => ({ ...r, x: r.x + dx, y: r.y + denQ }))
    ],
    top: numQ + num.top,
    bottom: denQ + den.bottom,
    lineTop: numQ + num.top + c(K.leading),
    lineBottom: denShift + den.bottom
  };
  if (!noBar) box.rules.push({ x: 0, y: -(axis + ruleQ / 2), w, h: ruleQ, color: st.color });
  return box;
}

// ../docx-layout/src/hyphenate.ts
var HYPHEN_GAP15 = 421;
var HYPHEN_EXPAND15 = 0.4868;
function hyphenMins(compat) {
  return [2, compat >= 15 ? 3 : 2];
}
var LETTER = /^[\p{L}\p{M}]$/u;
var MARK = /^\p{M}$/u;
function langOf(ctx, g) {
  return g.style.rpr.lang?.val ?? ctx.opts.lang;
}
function langAllowed(ctx, lang) {
  const list = ctx.opts.hyphenationLanguages;
  if (!list) return true;
  const l = lang.toLowerCase();
  return list.some((x) => {
    const y = x.toLowerCase();
    return l === y || l.startsWith(`${y}-`);
  });
}
function documentHyphenationLanguages(full, fallback = "pt-BR") {
  const fmt2 = full.formatting;
  if (!fmt2?.settings.autoHyphenation) return [];
  const out = /* @__PURE__ */ new Set([fmt2.styles.docDefaults.rPr?.lang?.val ?? fallback]);
  const visit = (x) => {
    if (!x || typeof x !== "object") return;
    if (x instanceof Map) {
      for (const v of x.values()) visit(v);
      return;
    }
    if (Array.isArray(x)) {
      for (const y of x) visit(y);
      return;
    }
    for (const [k, v] of Object.entries(x)) {
      if (k === "lang" && v && typeof v === "object" && typeof v.val === "string") out.add(v.val);
      else if (v && typeof v === "object") visit(v);
    }
  };
  visit(fmt2.styles.styles);
  visit(full.blocks);
  visit(full.sections);
  visit(full.footnoteBlocks);
  visit(full.endnoteBlocks);
  return [...out];
}
function markHyphenation(ctx, ppr, glyphs, skipRuns) {
  const s = ctx.fmt.settings;
  if (!s.autoHyphenation || ppr.suppressAutoHyphens || ctx.opts.hyphenation === false) return;
  const [left, right] = hyphenMins(s.compatibilityMode);
  for (let k = 0; k < glyphs.length; ) {
    const g = glyphs[k];
    if (g.kind !== "char" || !LETTER.test(g.ch) || MARK.test(g.ch) || skipRuns?.has(g.runIdx)) {
      k++;
      continue;
    }
    const lang = langOf(ctx, g);
    const idx = [];
    let e = k;
    for (; e < glyphs.length; e++) {
      const q = glyphs[e];
      if (q.kind === "shy") continue;
      if (q.kind !== "char" || !LETTER.test(q.ch) || langOf(ctx, q) !== lang || skipRuns?.has(q.runIdx)) break;
      idx.push(e);
    }
    k = e;
    const rpr = g.style.rpr;
    if (rpr.noProof || rpr.cs || rpr.rtl || !langAllowed(ctx, lang)) continue;
    if (s.doNotHyphenateCaps && idx.every((j) => {
      const c = glyphs[j].ch;
      return c.toLowerCase() === c.toUpperCase() || c === c.toUpperCase();
    })) continue;
    const h = hyphenatorFor(lang);
    if (!h) continue;
    const clusters = [];
    for (const j of idx) {
      if (MARK.test(glyphs[j].ch) && clusters.length) clusters[clusters.length - 1].push(j);
      else clusters.push([j]);
    }
    if (clusters.length < left + right) continue;
    const word = clusters.map((c) => {
      const t = c.map((j) => glyphs[j].ch).join("");
      const n = t.normalize("NFC");
      return Array.from(n).length === 1 ? n : glyphs[c[0]].ch;
    }).join("");
    for (const p of h.hyphenate(word, left, right)) {
      const c = clusters[p - 1];
      glyphs[c[c.length - 1]].hyph = true;
    }
  }
}
function hyphenCandidates(gs, i, e) {
  const out = [];
  let letters2 = 0;
  for (let k = i; k < e - 1; k++) {
    const g = gs[k];
    if (g.kind === "shy") {
      if (k > i) out.push(k);
      continue;
    }
    if (g.kind === "char" && LETTER.test(g.ch) && !MARK.test(g.ch)) letters2++;
    if (g.hyph && gs[k + 1]?.kind !== "shy" && letters2 >= 2) out.push(k);
  }
  return out;
}
var HYPHEN_ZONE_DEFAULT = 425;
function chooseHyphenation(ctx, gs, u) {
  const s = ctx.fmt.settings;
  let cands = hyphenCandidates(gs, u.i, u.e);
  const limit = s.consecutiveHyphenLimit ?? 0;
  if (limit > 0 && u.hyphenRun >= limit) cands = cands.filter((k) => gs[k].kind === "shy");
  if (!cands.length) return null;
  const modern = s.compatibilityMode >= 15;
  const justify = u.justify && modern;
  const hyphenW = (k) => advanceTwips(ctx, gs[k].face, 45, gs[k].sizePt);
  const ends = [];
  let x = u.x;
  let ci = 0;
  for (let k = u.i; k < u.e && ci < cands.length; k++) {
    const g = gs[k];
    if (g.kind !== "shy") x += g.adv;
    if (k === cands[ci]) {
      ends.push(x);
      ci++;
    }
  }
  if (!modern) {
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n];
      if (gs[k].kind === "shy" && ends[n] + hyphenW(k) - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    if (!u.lineStart && u.right - u.x < (s.hyphenationZone ?? HYPHEN_ZONE_DEFAULT) - 1e-3) return null;
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n];
      if (gs[k].kind === "shy") continue;
      let nx = k + 1;
      while (nx < u.e && (gs[nx].kind === "shy" || gs[nx].kind === "obj" && gs[nx].adv === 0)) nx++;
      const end = Math.max(ends[n] + hyphenW(k), ends[n] + (nx < u.e ? gs[nx].adv : 0));
      if (end - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    return null;
  }
  if (!u.lineStart) {
    if (justify) {
      const slack = u.right - u.contentEnd;
      if (u.restW > 0 && slack / u.restW <= HYPHEN_EXPAND15) return null;
    } else if (u.right - u.contentEnd < HYPHEN_GAP15) return null;
  }
  const fits = cands.map((k, n) => ends[n] + hyphenW(k) - u.right);
  for (let n = cands.length - 1; n >= 0; n--) {
    const ov = fits[n];
    if (ov <= 1e-3) return { k: cands[n], w: hyphenW(cands[n]) };
    if (!justify || u.nSpaces === 0) continue;
    const shrink = ctx.opts.justifyShrink;
    if (ov > shrink.ratio * u.spacesW + 0.0175) continue;
    if (n > 0) {
      const slackPrev = -fits[n - 1];
      if (ov <= shrink.expandRatio * slackPrev + 0.02) return { k: cands[n], w: hyphenW(cands[n]) };
    } else {
      const slack = u.right - u.contentEnd;
      if (u.lineStart || u.restW <= 0 || ov / u.spacesW <= shrink.expandRatio * slack / u.restW + 75e-4 * u.nSpaces / u.spacesW) return { k: cands[n], w: hyphenW(cands[n]) };
    }
  }
  return null;
}

// ../docx-layout/src/para.ts
var GLUED_FIELD = /* @__PURE__ */ new WeakSet();
var CJK = (cp) => cp >= 11904 && cp <= 40959 || cp >= 44032 && cp <= 55215 || cp >= 63744 && cp <= 64255 || cp >= 65280 && cp <= 65519 || cp >= 12288 && cp <= 12351;
var NO_BREAK_AFTER_DASH = /^[\s\u00a0\u202f\u2000-\u200b\u3000\ufeff\u00ad]$/u;
var CS = (cp) => cp >= 1424 && cp <= 2303 || cp >= 64285 && cp <= 65023 || cp >= 65136 && cp <= 65279;
var MATH_FONT = "Cambria Math";
var FALLBACK_FAMILIES = ["Segoe UI Symbol", "Segoe UI Emoji", "Arial Unicode MS", "MS Gothic", "Cambria Math", "Segoe UI", "Arial"];
function classFallback(font) {
  const pn = font.metrics.panose;
  if (pn && pn[0] === 2 && pn[3] === 9) return "Courier New";
  if (pn && pn[0] === 2 && pn[1] >= 11 && pn[1] <= 15) return "Arial";
  return "Times New Roman";
}
function fallbackOrder(cp, font) {
  if (cp >= 8592 && cp <= 8703 || cp >= 9632 && cp <= 9727) return [classFallback(font), "Cambria Math", ...FALLBACK_FAMILIES];
  if (cp >= 8704 && cp <= 8959 || cp >= 10624 && cp <= 10751) return ["Cambria Math", ...FALLBACK_FAMILIES];
  return FALLBACK_FAMILIES;
}
function resolveRunStyle(ctx, rpr, env, link) {
  const theme = ctx.fmt.theme;
  const sz = (rpr.sz ?? 20) / 2;
  const va = rpr.vertAlign;
  const sizePt = va === "superscript" || va === "subscript" ? Math.round(sz * 2 * 1331 / 2048) / 2 : sz;
  const shift = (rpr.position ?? 0) * 10;
  const tf = rpr.textFill;
  const color = (tf && (tf.color ?? (tf.themeColor ? resolveColor({ themeColor: tf.themeColor }, theme) : void 0))) ?? resolveColor(rpr.color, theme);
  const u = rpr.u && rpr.u.val !== "none" && rpr.u.val !== "" ? { val: rpr.u.val, ...rpr.u.color && rpr.u.color !== "auto" ? { color: rpr.u.color } : {} } : void 0;
  const shd = rpr.shd?.fill && rpr.shd.fill !== "auto" ? rpr.shd.fill : void 0;
  const style = {
    rpr,
    sizePt,
    color: color ?? (env.darkBackground ? "FFFFFF" : "000000"),
    autoColor: !color,
    bold: !!rpr.b,
    italic: !!rpr.i,
    underline: u,
    strike: !!rpr.strike,
    dstrike: !!rpr.dstrike,
    highlight: highlightHex(rpr.highlight),
    shading: shd,
    shift,
    hidden: !!rpr.vanish || !!rpr.specVanish,
    ...tf?.alpha !== void 0 && tf.alpha < 1 ? { alpha: tf.alpha } : {},
    ...rpr.textOutline ? { outline: true } : {},
    ...link ? { link } : {}
  };
  if (va === "superscript" || va === "subscript") {
    const face = faceFor(ctx, rpr, 65, style);
    style.shift += va === "superscript" ? superscriptRaiseFor(face.family, faceMetrics(face.font), sz, sizePt) * 20 : -subscriptDropPt(face.family, sz) * 20;
  }
  return style;
}
var notdefPua = (face, cp) => cp >= 61440 && cp <= 61695 && face.font.glyphId(cp) === 0 && !isSymbolFont(face.font);
function faceFor(ctx, rpr, cp, style, symFont) {
  const theme = ctx.fmt.theme;
  let family;
  let bold = style.bold, italic = style.italic;
  if (symFont && (cp >= 61440 && cp <= 61695 || !CJK(cp))) family = symFont;
  else if (CJK(cp)) family = fontOfSlot(rpr.rFonts, "eastAsia", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
  else if (CS(cp) || rpr.cs || rpr.rtl) {
    family = fontOfSlot(rpr.rFonts, "cs", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
    bold = !!rpr.bCs;
    italic = !!rpr.iCs;
  } else if (cp < 128) family = fontOfSlot(rpr.rFonts, "ascii", theme);
  else {
    family = rpr.rFonts?.hint === "eastAsia" && (cp === 8220 || cp === 8221 || cp === 8216 || cp === 8217) ? fontOfSlot(rpr.rFonts, "eastAsia", theme) : fontOfSlot(rpr.rFonts, "hAnsi", theme) ?? fontOfSlot(rpr.rFonts, "ascii", theme);
  }
  const face = ctx.faces.get(family, bold, italic);
  if (cp <= 32 || SPACE_WIDTHS[cp] !== void 0 || face.font.glyphId(cp) !== 0) return face;
  if (cp >= 61440 && cp <= 61695) {
    if (isSymbolFont(face.font) && face.font.glyphId(cp - 61440) !== 0) return face;
    return ctx.faces.get("Calibri", false, false);
  }
  for (const fb of fallbackOrder(cp, face.font)) {
    const f = ctx.faces.get(fb, bold, italic);
    if (f.font.glyphId(cp) !== 0) return f;
  }
  return face;
}
function vMetrics(m, style) {
  const va = style.rpr.vertAlign;
  if (va === "superscript" || va === "subscript") {
    const base = (style.rpr.sz ?? 20) / 2;
    return { asc: m.ascent * base * 20, desc: m.descent * base * 20 };
  }
  const [sa, sd] = shadowExtent(style);
  const a = m.ascent * style.sizePt * 20 + sa, d = m.descent * style.sizePt * 20 + sd;
  if (!style.shift) return { asc: a, desc: d };
  return { asc: Math.max(0, a + style.shift), desc: Math.max(0, d - style.shift), nAsc: a, nDesc: d };
}
function shadowExtent(style) {
  const sh = style.rpr.textShadow;
  if (!sh || !sh.blur && !sh.dist) return [0, 0];
  const k = Math.pow(style.sizePt / 72, 0.7);
  const dy = sh.dist * Math.sin(sh.dir * Math.PI / 180);
  return [k * Math.max(0, sh.blur - dy) * 20, k * Math.max(0, sh.blur + dy) * 20];
}
function isHyperlinkStyle(ctx, id) {
  const st = own(ctx.resolver.styles, id);
  return id === "Hyperlink" || st?.name?.toLowerCase() === "hyperlink";
}
var SPACE_WIDTHS = {
  8192: 0.5,
  8193: 1,
  8194: 0.5,
  8195: 1,
  8196: 1 / 3,
  8197: 0.25,
  8198: 1 / 6,
  8199: "0",
  8200: ".",
  8201: 0.2,
  8202: 0.1,
  8203: 0,
  8239: " ",
  8287: 4 / 18
};
var WORD_UNIT = 20 / 4096;
function wordWidth(units, sizePt, upm) {
  return Math.floor(units * sizePt * 4096 / upm + 1e-7) * WORD_UNIT;
}
function toWordUnit(tw) {
  return Math.round(tw / WORD_UNIT) * WORD_UNIT;
}
function scaledUnits(units, font, w) {
  const avg = font.metrics.xAvgCharWidth;
  if (!avg || avg <= 0) return units * w / 100;
  const lf = Math.floor(avg * w / 100 + 1e-9);
  return Math.floor(units * lf / avg + 0.5);
}
function spacingTwips(ctx, sp) {
  return ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device" ? toWordUnit(sp) : sp;
}
function advanceTwips(ctx, face, cp, sizePt, w = 100) {
  const f = face.font;
  let gid = f.glyphId(cp);
  let extra = 0;
  if (gid === 0 && cp >= 61440 && cp <= 61695) {
    if (isSymbolFont(f)) gid = f.glyphId(cp - 61440);
    else extra = f.advanceWidth(f.glyphId(32));
  }
  if (gid === 0 && SPACE_WIDTHS[cp] !== void 0) {
    const sw = SPACE_WIDTHS[cp];
    if (typeof sw === "string") return advanceTwips(ctx, face, sw.codePointAt(0), sizePt, w) * (cp === 8239 ? 0.5 : 1);
    return sw * sizePt * 20 * w / 100;
  }
  let frac = 1;
  if (gid !== 0 && (cp === 8194 || cp === 8195 || cp === 8197)) {
    const dg = f.glyphId(cp === 8194 ? 8211 : 8212);
    if (dg) {
      gid = dg;
      frac = cp === 8197 ? 1 / 4 : 1;
    }
  }
  const units = f.advanceWidth(gid) * frac + extra;
  if (ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device") {
    return wordWidth(w !== 100 ? scaledUnits(units, f, w) : units, sizePt, f.metrics.unitsPerEm);
  }
  return roundAdvance(ctx, units * emOf(ctx, sizePt) * 20 / f.metrics.unitsPerEm) * w / 100;
}
var emOf = (ctx, sizePt) => ctx.opts.advanceEm === "device" ? deviceEmPt(sizePt) : sizePt;
function roundAdvance(ctx, tw) {
  switch (ctx.opts.advanceRound) {
    case "twip":
      return Math.round(tw);
    case "twipFloor":
      return Math.floor(tw);
    case "twipCeil":
      return Math.ceil(tw);
    case "dev600":
      return Math.round(tw / 2.4) * 2.4;
    case "half":
      return Math.round(tw * 2) / 2;
    default:
      return tw;
  }
}
function kernGlyphs(ctx, face, g1, g2, sizePt) {
  const kg = face.font.kernGlyphsTwips;
  const k = kg ? kg.call(face.font, g1, g2, sizePt) : 0;
  if (!k) return 0;
  if (ctx.opts.advanceEm === "device") return k;
  return k * sizePt / deviceEmPt(sizePt);
}
function glyphAdvTwips(ctx, face, gid, sizePt) {
  const f = face.font;
  if (ctx.opts.advanceRound === "word" && ctx.opts.advanceEm !== "device") return wordWidth(f.advanceWidth(gid), sizePt, f.metrics.unitsPerEm);
  return roundAdvance(ctx, f.advanceWidth(gid) * emOf(ctx, sizePt) * 20 / f.metrics.unitsPerEm);
}
function ligFeatures(v) {
  if (!v || v === "none") return [];
  if (v === "all") return ["liga", "clig", "hlig", "dlig"];
  const out = [];
  if (/standard/i.test(v)) out.push("liga");
  if (/contextual/i.test(v)) out.push("clig");
  if (/historical/i.test(v)) out.push("hlig");
  if (/discretional/i.test(v)) out.push("dlig");
  return out;
}
function applyLigatures2(ctx, glyphs) {
  const keyOf2 = (g) => {
    const r = g.style.rpr;
    return `${r.lang?.val ?? ""}|${r.w ?? 100}|${g.style.shift}|${r.ligatures ?? ""}|${r.spacing ?? 0}`;
  };
  for (let k = 0; k < glyphs.length; ) {
    const g0 = glyphs[k];
    const rpr = g0.style.rpr;
    const feats = g0.kind === "char" && !rpr.spacing ? ligFeatures(rpr.ligatures) : [];
    const ligate = g0.face.font.ligate;
    if (!feats.length || !ligate) {
      k++;
      continue;
    }
    const key = keyOf2(g0);
    let e = k + 1;
    while (e < glyphs.length) {
      const q = glyphs[e];
      if (q.kind !== "char" || q.face !== g0.face || q.sizePt !== g0.sizePt || q.runIdx !== g0.runIdx && keyOf2(q) !== key) break;
      e++;
    }
    if (e - k >= 2) {
      const f = g0.face.font;
      const groups = ligate.call(f, glyphs.slice(k, e).map((q) => f.glyphId(q.cp)), feats);
      let pos = k;
      for (const grp of groups ?? []) {
        if (grp.len > 1) {
          const first = glyphs[pos], last = glyphs[pos + grp.len - 1];
          let sum = 0;
          for (let j = pos; j < pos + grp.len; j++) sum += glyphAdvTwips(ctx, first.face, f.glyphId(glyphs[j].cp), first.sizePt);
          const w = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
          let delta = (glyphAdvTwips(ctx, first.face, grp.gid, first.sizePt) - sum) * w;
          if (first.face.synthBold) delta -= (grp.len - 1) * first.sizePt * 20 / 2048;
          for (let j = pos; j < pos + grp.len - 1; j++) {
            const q = glyphs[j];
            if (q.kernAdj) {
              q.adv -= q.kernAdj;
              q.kernAdj = 0;
            }
          }
          const nx = glyphs[pos + grp.len];
          if (last.kernAdj !== void 0 && nx && nx.runIdx === last.runIdx) {
            const nk = kernGlyphs(ctx, first.face, grp.gid, nx.ligStart ?? f.glyphId(nx.cp), first.sizePt);
            last.adv += nk - last.kernAdj;
            last.kernAdj = nk;
          }
          const pv = glyphs[pos - 1];
          if (pv && pv.kernAdj !== void 0 && pv.runIdx === first.runIdx && pv.face === first.face) {
            const nk = kernGlyphs(ctx, first.face, pv.ligEnd ?? f.glyphId(pv.cp), grp.gid, first.sizePt);
            pv.adv += nk - pv.kernAdj;
            pv.kernAdj = nk;
          }
          last.adv += delta;
          first.ligStart = grp.gid;
          last.ligEnd = grp.gid;
        }
        pos += grp.len;
      }
    }
    k = e;
  }
}
function kernTwips(ctx, face, cp, next, sizePt) {
  const k = face.font.kernTwips(cp, next, sizePt);
  if (!k) return 0;
  if (ctx.opts.advanceEm === "device") return k;
  return k * sizePt / deviceEmPt(sizePt);
}
function fieldRuns(run, env) {
  const instr = (run.field ?? "").trim();
  const name = instr.split(/\s+/)[0]?.toUpperCase() ?? "";
  if (["PAGE", "NUMPAGES", "SECTIONPAGES", "SECTION", "PAGEREF", "SEQ", "REF", "DATE", "TIME", "SAVEDATE", "CREATEDATE", "PRINTDATE"].includes(name) || name.endsWith("_MARK")) {
    const v = env.field?.(name, instr);
    if (v !== void 0) {
      const base = run.fieldResult?.find((r) => !r.image && !r.textbox) ?? run;
      const out = { ...base, text: v, field: void 0, fieldResult: void 0 };
      if (env.hf && name === "PAGE") GLUED_FIELD.add(out);
      return [out];
    }
  }
  if (run.fieldResult?.length) {
    if (!run.fieldResult.some((r) => r.field !== void 0)) return run.fieldResult;
    return run.fieldResult.flatMap((r) => r.field !== void 0 ? fieldRuns(r, env) ?? (r.text ? [r] : []) : [r]);
  }
  return null;
}
function displayRuns(para, env) {
  const out = [];
  let offset = 0;
  para.runs.forEach((run, idx) => {
    if (run.formField?.type === "checkBox") out.push({ run, idx, offset });
    else if (run.formField?.type === "dropDown" && run.formField.entries) {
      const text = run.formField.entries[run.formField.selected ?? 0] ?? "";
      if (text) out.push({ run: { ...run, text, field: void 0, fieldResult: void 0, formField: void 0 }, idx, offset });
    } else if (run.field !== void 0) {
      const fr = fieldRuns(run, env);
      if (fr) {
        for (const r of fr) out.push({ run: r, idx, offset });
      } else if (run.text) out.push({ run, idx, offset });
    } else out.push({ run, idx, offset });
    offset += run.text.length;
  });
  return out;
}
function isDark(hex) {
  if (!hex || !/^[0-9A-Fa-f]{6}/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 80;
}
var NO_LINE_END = "$([{\xA3\xA5\u2018\u201C\u3008\u300A\u300C\u300E\u3010\u3014\u3016\u301D\uFE59\uFE5B\uFE5D\uFF04\uFF08\uFF3B\uFF5B\uFF62\uFFE1\uFFE5\uFFE6";
var CJK_FONT_NAME = /^(ms (p|ui )?(gothic|mincho)|yu (gothic|mincho)|meiryo|hg.*(gothic|mincho)|(p)?mingliu|n?simsun|simhei|kaiti|fangsong|microsoft (yahei|jhenghei)|dengxian|(batang|gulim|dotum|gungsuh)(che)?|malgun gothic|nanum)|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/i;
function isCjkFont(ctx, name) {
  if (!name) return false;
  const cs = own(ctx.fmt.fontTable, name)?.charset?.toUpperCase();
  if (cs) return ["80", "81", "82", "86", "88"].includes(cs);
  if (CJK_FONT_NAME.test(name)) return true;
  const f = ctx.faces.get(name, false, false);
  return f.family.toLowerCase() === name.toLowerCase() && (f.font.glyphId(19968) !== 0 || f.font.glyphId(44032) !== 0);
}
function docEastAsiaCjk(ctx) {
  const rf = ctx.resolver.docDefaults.rPr?.rFonts;
  const name = fontOfSlot(rf, "eastAsia", ctx.fmt.theme);
  if (name && !own(ctx.fmt.fontTable, name)?.charset && /^(ms (p|ui )(gothic|mincho)|meiryo|malgun gothic)\b/i.test(name)) return false;
  if (name) return isCjkFont(ctx, name);
  return !!rf?.eastAsiaTheme && /^(ja|zh|ko)\b/i.test(ctx.fmt.settings.themeFontLang?.eastAsia ?? "");
}
var isCjkLang = (rpr) => /^(ja|zh|ko)\b/i.test(rpr.lang?.eastAsia ?? "");
function eastAsianBreakRules(ctx, rpr) {
  if (!isCjkLang(rpr)) return false;
  return ctx.fmt.settings.compatibilityMode >= 15 || docEastAsiaCjk(ctx);
}
var HANG_BASE = ",.\u3001\u3002\uFF0C\uFF0E";
var HANG_CLOSE = ");:!?]}\uFF1A\uFF1B\uFF1F\uFF01\uFF09\uFF3D\uFF5D";
var HANG_QUOTES = "\u201D\u2019";
var hangPunct = (rpr, alt) => {
  const ea = rpr.lang?.eastAsia ?? "";
  if (/^ja/i.test(ea)) return alt ? HANG_BASE : HANG_BASE + HANG_QUOTES;
  if (alt) return /^ko/i.test(ea) ? HANG_BASE : HANG_BASE + HANG_CLOSE;
  return HANG_BASE + HANG_CLOSE + HANG_QUOTES + (/^zh-(tw|hk|mo)/i.test(ea) ? "" : "%");
};
var SPACE_LIKE = /* @__PURE__ */ new Set([32, 8194, 8195, 8197, 8203, 12288]);
function resolvePPr(ctx, para, env) {
  const dd = ctx.resolver.docDefaults;
  const direct = directPPr(para);
  const styleId = ctx.resolver.paraStyleId(direct.pStyle);
  const st = ctx.resolver.paraStyle(styleId);
  let ppr = mergePPr(dd.pPr, env.tablePPr);
  const numPr = { ...st.pPr.numPr, ...direct.numPr };
  const lvl = numPr.numId ? ctx.numbering.level(numPr.numId, numPr.ilvl ?? 0) : void 0;
  const addLvl = () => {
    if (lvl?.pPr) ppr = mergePPr(ppr, { ...lvl.pPr, tabs: void 0 });
    if (lvl?.pPr?.tabs) ppr = mergePPr(ppr, { tabs: lvl.pPr.tabs });
  };
  if (numPr.numId && direct.numPr?.numId === void 0) {
    const chain = ctx.resolver.paraChain(styleId);
    let at = -1;
    chain.forEach((s, i) => {
      if (s.pPr?.numPr?.numId !== void 0) at = i;
    });
    chain.forEach((s, i) => {
      if (i === at) addLvl();
      ppr = mergePPr(ppr, s.pPr);
    });
    if (at < 0) addLvl();
  } else {
    ppr = mergePPr(ppr, st.pPr);
    if (numPr.numId) addLvl();
  }
  ppr = mergePPr(ppr, direct);
  ppr.numPr = numPr;
  return { ppr, styleId, styleRPr: st.rPr };
}
function paraVisibility(ctx, para, env) {
  const { ppr, styleRPr } = resolvePPr(ctx, para, env);
  const dd = ctx.resolver.docDefaults;
  const runRPr = (rpr) => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const hidden = (rpr) => !!rpr.vanish || !!rpr.specVanish;
  const markHidden = hidden(runRPr(ppr.rPr ?? {}));
  const visible = displayRuns(para, env).some(({ run }) => !!(run.text || run.image || run.shape || run.group || run.textbox || run.formField?.type === "checkBox" || run.custom || run.ptab || run.noteRef) && !hidden(runRPr(directRPr(run))));
  return { markHidden, visible };
}
function prepareParagraph(ctx, para, env0) {
  const { ppr, styleId, styleRPr } = resolvePPr(ctx, para, env0);
  const shd = ppr.shd;
  const paraFill = shd?.fill && shd.fill !== "auto" ? shd.fill : shd?.themeFill ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, ctx.fmt.theme) : void 0;
  const env = paraFill && isDark(paraFill) && !env0.darkBackground ? { ...env0, darkBackground: true } : env0;
  const dd = ctx.resolver.docDefaults;
  const settings = ctx.fmt.settings;
  const yenBackslash = !!settings.compat["doNotLeaveBackslashAlone"] && docEastAsiaCjk(ctx);
  const runRPr = (rpr) => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const markRpr = runRPr(ppr.rPr ?? {});
  const markStyle = resolveRunStyle(ctx, markRpr, env);
  const markFace = faceFor(ctx, markRpr, 32, markStyle);
  const glyphs = [];
  const pushChars = (text, run, rpr, style, offset0, runIdx, formText = false) => {
    let t = text;
    if (rpr.caps) t = t.toUpperCase();
    const chars = Array.from(t);
    let off = offset0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cp = ch.codePointAt(0);
      if (cp === 65279 || cp === 8204 || cp === 8205) {
        const prev = glyphs[glyphs.length - 1];
        if (cp === 65279 && prev?.kind === "space") {
          prev.kind = "nbsp";
          prev.breakAfter = false;
        }
        off += ch.length;
        continue;
      }
      let kind = "char";
      if (ch === "	") kind = "tab";
      else if (ch === "\n" || ch === "\r" || ch === "\u2028") kind = "lb";
      else if (ch === "\f" || ch === "\v") {
        if (env.noPageBreaks) {
          off += ch.length;
          continue;
        }
        kind = ch === "\f" ? "pb" : "cb";
      } else if (cp === 160 || cp === 8239) kind = "nbsp";
      else if (cp === 173) kind = "shy";
      else if (SPACE_LIKE.has(cp) && !(cp !== 32 && formText)) kind = "space";
      let size = style.sizePt;
      let shownCh = ch;
      let shownCp = cp;
      if (cp === 8209) shownCp = 45;
      if (cp === 92 && yenBackslash && /^ja/i.test(rpr.lang?.eastAsia ?? "")) {
        shownCh = "\xA5";
        shownCp = 165;
      }
      if (rpr.smallCaps && !rpr.caps && ch.toLowerCase() === ch && ch.toUpperCase() !== ch) {
        shownCh = ch.toUpperCase();
        shownCp = shownCh.codePointAt(0);
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      } else if (rpr.smallCaps && !rpr.caps && cp === 32) {
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      }
      const face = faceFor(ctx, rpr, kind === "lb" ? 32 : shownCp, style, run.symFont);
      const m = faceMetrics(notdefPua(face, shownCp) ? faceFor(ctx, rpr, 65, style).font : face.font);
      let adv = 0;
      let kernAdj;
      if (kind === "char" || kind === "space" || kind === "nbsp") {
        const hs = rpr.w && rpr.w !== 100 ? rpr.w : 100;
        adv = advanceTwips(ctx, face, shownCp, size, hs);
        if (face.synthBold) adv += size * 20 / 2048 * (hs / 100);
        const next = chars[i + 1];
        const lig = rpr.ligatures;
        const kernOff = !!lig && lig !== "none" && face.font.kernInLatin === false;
        if (next && (kind === "char" || kind === "space") && rpr.kern && style.sizePt * 2 >= rpr.kern && !kernOff) {
          const sc = rpr.smallCaps && !rpr.caps;
          const lower = sc && next.toLowerCase() === next && next.toUpperCase() !== next && next.toUpperCase().length === 1;
          const nextShown = lower ? next.toUpperCase() : next;
          const nextSize = sc && (lower || next === " ") ? Math.round(style.sizePt * 2 * 0.8) / 2 : style.sizePt;
          kernAdj = sc && nextSize !== size ? 0 : kernTwips(ctx, face, shownCp, nextShown.codePointAt(0), size);
          adv += kernAdj;
        }
        if (rpr.spacing) adv += spacingTwips(ctx, rpr.spacing);
        if (cp >= 65024 && cp <= 65039) adv = 0;
      }
      const breakAfter = kind === "space" || kind === "tab" || kind === "shy" || (cp === 45 || cp === 8211 || cp === 8212) && i + 1 < chars.length && !NO_BREAK_AFTER_DASH.test(chars[i + 1]) || CJK(cp);
      glyphs.push({
        kind,
        ch: shownCh,
        cp: shownCp,
        face,
        style,
        adv,
        // sobrescrito/subscrito não mudam a altura da linha (medido no Word):
        // a linha mede como se o texto estivesse no corpo original; w:position mede
        ...vMetrics(m, style),
        offset: off,
        runIdx,
        breakAfter,
        sizePt: size,
        ...cp === 8232 ? { clear: true } : {},
        ...kernAdj !== void 0 ? { kernAdj } : {}
      });
      off += ch.length;
    }
  };
  let mathJc;
  const mathRuns = /* @__PURE__ */ new Set();
  const pushMath = (run, runIdx, offset0) => {
    const zone = run.math;
    mathJc = zone.jc ?? "centerGroup";
    mathRuns.add(runIdx);
    const menv = {
      styleOf: (r) => {
        const mr = { ...runRPr(r ?? {}) };
        delete mr.spacing;
        delete mr.w;
        delete mr.ligatures;
        return { rpr: mr, style: resolveRunStyle(ctx, mr, env) };
      },
      face: (bold, italic) => ctx.faces.get(MATH_FONT, bold, italic),
      adv: (face, cp, size) => advanceTwips(ctx, face, cp, size),
      kern: (face, cp, next, size) => kernTwips(ctx, face, cp, next, size)
    };
    const last = Math.max(0, run.text.length - 1);
    const off = { n: 0 };
    let seg = [];
    const flushSeg = () => {
      for (const a of mathAtoms(menv, seg, "D", 1, off)) {
        const tm = mathTextMetrics(a.face);
        const tA = tm.ascent * a.sizePt * 20, tD = tm.descent * a.sizePt * 20;
        const g = { kind: "char", ch: String.fromCodePoint(a.cp), cp: a.cp, face: a.face, style: a.style, adv: a.adv, asc: tA, desc: tD, offset: offset0 + Math.min(a.offset, last), runIdx, breakAfter: false, sizePt: a.sizePt };
        if (a.box) Object.assign(g, { asc: Math.max(tA, a.box.lineTop), desc: Math.max(tD, a.box.lineBottom), nAsc: tA, nDesc: tD, math: a.box });
        glyphs.push(g);
      }
      seg = [];
    };
    for (const nd of zone.nodes) {
      if (nd.t !== "br") {
        seg.push(nd);
        continue;
      }
      flushSeg();
      const { style: bs } = menv.styleOf(nd.rpr);
      const bf = menv.face(false, false);
      const tm = mathTextMetrics(bf);
      glyphs.push({ kind: "lb", ch: "\n", cp: 10, face: bf, style: bs, adv: 0, asc: tm.ascent * bs.sizePt * 20, desc: tm.descent * bs.sizePt * 20, offset: offset0 + Math.min(off.n, last), runIdx, breakAfter: true, sizePt: bs.sizePt });
    }
    flushSeg();
  };
  for (const { run, idx, offset } of displayRuns(para, env)) {
    const direct = directRPr(run);
    if (run.inToc && direct.rStyle && isHyperlinkStyle(ctx, direct.rStyle)) delete direct.rStyle;
    const rpr = runRPr(direct);
    const style = resolveRunStyle(ctx, rpr, env, run.props.link);
    if (style.hidden) continue;
    if (run.image || run.shape || run.group || run.textbox) {
      const floating = run.image?.floating ?? run.shape?.floating ?? run.group?.floating ?? run.textbox?.floating;
      const face = faceFor(ctx, rpr, 32, style);
      if (floating) {
        glyphs.push({ kind: "obj", ch: "", cp: 65532, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: false, obj: run, sizePt: style.sizePt });
        continue;
      }
      const ie = run.image?.inlineEffect ?? run.shape?.inlineEffect;
      const w = (run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0) + (ie ? ie.l + ie.r : 0);
      const h = (run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0) + (ie ? ie.t + ie.b : 0);
      if (run.shape?.hr) {
        glyphs.push({ kind: "obj", ch: "\uFFFC", cp: 65532, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, obj: run, sizePt: style.sizePt, hr: h });
        continue;
      }
      const m = faceMetrics(face.font);
      glyphs.push({
        kind: "obj",
        ch: "\uFFFC",
        cp: 65532,
        face,
        style,
        adv: w,
        asc: Math.max(0, h + style.shift),
        desc: Math.max(0, -style.shift),
        // a imagem fica na baseline: sem descendente (medido)
        offset,
        runIdx: idx,
        breakAfter: true,
        obj: run,
        sizePt: style.sizePt
      });
      continue;
    }
    if (run.formField?.type === "checkBox") {
      const face = faceFor(ctx, rpr, 32, style);
      const size = run.formField.sizeAuto || !run.formField.sizeHalfPt ? style.sizePt : run.formField.sizeHalfPt / 2;
      const side = 1.07 * size * 20;
      const fm = faceMetrics(face.font);
      glyphs.push({
        kind: "box",
        ch: "\u2610",
        cp: 9744,
        face,
        style,
        adv: side + 18,
        asc: fm.ascent * size * 20,
        desc: fm.descent * size * 20,
        offset,
        runIdx: idx,
        breakAfter: false,
        sizePt: style.sizePt,
        box: { side, checked: !!run.formField.checked }
      });
      continue;
    }
    if (run.custom) {
      const face = faceFor(ctx, rpr, 32, style);
      const text = run.custom.fallbackText || " ";
      pushChars(text, run, rpr, style, offset, idx);
      continue;
    }
    if (run.ptab) {
      const face = faceFor(ctx, rpr, 32, style);
      glyphs.push({ kind: "tab", ch: "	", cp: 9, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, ptab: run.ptab, sizePt: style.sizePt });
      continue;
    }
    if (run.noteRef && !run.text) {
      const num = run.noteRef.kind === "footnote" ? ctx.footnoteNumber(run.noteRef.id) : ctx.endnoteNumber(run.noteRef.id);
      const before2 = glyphs.length;
      pushChars(String(num), run, rpr, style, offset, idx);
      if (run.noteRef.kind === "footnote") for (let k = before2; k < glyphs.length; k++) glyphs[k].noteId = run.noteRef.id;
      continue;
    }
    if (run.math) {
      pushMath(run, idx, offset);
      continue;
    }
    const before = glyphs.length;
    pushChars(run.text, run, rpr, style, offset, idx, /^\s*FORMTEXT\b/i.test(para.runs[idx]?.field ?? ""));
    if (GLUED_FIELD.has(run)) for (let k = before + 1; k < glyphs.length; k++) glyphs[k].glue = true;
  }
  for (let k = 1; k < glyphs.length; k++) {
    if (glyphs[k].kind !== "obj" || glyphs[k].adv <= 0) continue;
    let j = k - 1;
    while (j > 0 && glyphs[j].kind === "obj" && glyphs[j].adv === 0) j--;
    const pv = glyphs[j];
    if (!pv.breakAfter && pv.kind !== "nbsp" && !(pv.kind === "obj" && pv.adv === 0)) pv.breakAfter = true;
  }
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k], nx = glyphs[k + 1];
    if (!g.breakAfter && g.kind === "char" && (g.cp === 45 || g.cp === 8211 || g.cp === 8212) && g.ch !== "\u2011" && g.runIdx !== nx.runIdx && nx.kind === "char" && !NO_BREAK_AFTER_DASH.test(nx.ch)) g.breakAfter = true;
  }
  applyLigatures2(ctx, glyphs);
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k], nx = glyphs[k + 1];
    if (g.runIdx === nx.runIdx || g.kind !== "char" && g.kind !== "space" || nx.kind !== "char" && nx.kind !== "space") continue;
    const a = g.style.rpr, b = nx.style.rpr;
    if (g.face !== nx.face || g.sizePt !== nx.sizePt || g.style.sizePt !== nx.style.sizePt || g.style.shift !== nx.style.shift) continue;
    if (!a.kern || !b.kern || g.style.sizePt * 2 < a.kern || nx.style.sizePt * 2 < b.kern) continue;
    if ((a.lang?.val ?? "") !== (b.lang?.val ?? "") || (a.w ?? 100) !== (b.w ?? 100)) continue;
    const lig = a.ligatures;
    if (lig && lig !== "none" && g.face.font.kernInLatin === false) continue;
    g.adv += g.ligEnd !== void 0 || nx.ligStart !== void 0 ? kernGlyphs(ctx, g.face, g.ligEnd ?? g.face.font.glyphId(g.cp), nx.ligStart ?? g.face.font.glyphId(nx.cp), g.sizePt) : kernTwips(ctx, g.face, g.cp, nx.cp, g.sizePt);
  }
  for (let k = 0; k < glyphs.length; k++) {
    if (glyphs[k].kind !== "space") continue;
    let e = k;
    while (e + 1 < glyphs.length && glyphs[e + 1].kind === "space") e++;
    if (glyphs[k - 1]?.kind === "nbsp" || glyphs[e + 1]?.kind === "nbsp") for (let j = k; j <= e; j++) glyphs[j].breakAfter = false;
    k = e;
  }
  if (ppr.kinsoku !== false) {
    for (let k = 1; k < glyphs.length; k++) {
      if (glyphs[k].kind !== "space" || glyphs[k - 1].kind !== "char") continue;
      const pv = glyphs[k - 1];
      if (!NO_LINE_END.includes(pv.ch) || !eastAsianBreakRules(ctx, pv.style.rpr)) continue;
      for (let j = k; j < glyphs.length && glyphs[j].kind === "space"; j++) glyphs[j].breakAfter = false;
    }
  }
  if (docEastAsiaCjk(ctx)) {
    const compress = settings.compatibilityMode < 15 && !!settings.characterSpacingControl && settings.characterSpacingControl !== "doNotCompress";
    const balance = !!settings.compat["balanceSingleByteDoubleByteWidth"];
    const altKinsoku = settings.compatibilityMode < 15 && !!settings.compat["useAltKinsokuLineBreakRules"];
    if (balance) for (let k = 0; k < glyphs.length; k++) {
      if (glyphs[k].kind !== "space" || glyphs[k].cp !== 32) continue;
      let e = k;
      while (e + 1 < glyphs.length && glyphs[e + 1].kind === "space" && glyphs[e + 1].cp === 32) e++;
      const lead = glyphs.slice(0, k).every((q) => q.kind === "obj" && q.adv === 0);
      if (e > k || lead) for (let j = k; j <= e; j++) {
        const g = glyphs[j];
        g.adv = g.sizePt * 10 + spacingTwips(ctx, g.style.rpr.spacing ?? 0);
        g.fixed = true;
      }
      k = e;
    }
    if (compress) {
      for (const g of glyphs) {
        if (g.kind === "char" && (g.cp === 45 || g.cp === 8212 || g.cp === 8211 && settings.compatibilityMode < 14)) g.breakAfter = false;
      }
    }
    for (const g of glyphs) {
      if (compress && g.kind === "space" && g.cp === 32 && !g.fixed) {
        const xAvg = g.face.font.metrics.xAvgCharWidth;
        const minSp = balance ? g.sizePt * 20 / 4 : xAvg ? xAvg * g.sizePt * 20 / g.face.font.metrics.unitsPerEm / 2 : void 0;
        if (minSp !== void 0) g.feShrink = Math.max(0, g.adv - minSp);
      } else if (g.kind === "char" && ppr.overflowPunct !== false && isCjkLang(g.style.rpr) && hangPunct(g.style.rpr, altKinsoku).includes(g.ch)) g.hang = true;
    }
  }
  markHyphenation(ctx, ppr, glyphs, mathRuns);
  let marker;
  const numId = ppr.numPr?.numId;
  if (numId && env.numbering !== false) {
    let nm = ctx.numbering.next(numId, ppr.numPr?.ilvl ?? 0);
    if (!nm && (numId === 1001 || numId === 1002)) {
      const ilvl = ppr.numPr?.ilvl ?? 0;
      nm = { text: numId === 1001 ? ["\u2022", "o", "\u25AA"][ilvl % 3] : "1.", level: { ilvl, numFmt: numId === 1001 ? "bullet" : "decimal", suff: "tab" }, numId, ilvl, listKey: "synthetic" };
    }
    if (nm && (nm.text || nm.level.lvlPicBulletId !== void 0)) {
      const lvlRpr = nm.level.rPr ?? {};
      const mrpr = mergeRPr(markRpr, lvlRpr);
      const ms = resolveRunStyle(ctx, mrpr, env);
      const mg = [];
      let w = 0;
      for (const ch of Array.from(nm.text)) {
        const cp = ch.codePointAt(0);
        const face = faceFor(ctx, mrpr, cp, ms);
        const m = faceMetrics(notdefPua(face, cp) ? faceFor(ctx, mrpr, 65, ms).font : face.font);
        let adv = advanceTwips(ctx, face, cp, ms.sizePt, mrpr.w && mrpr.w !== 100 ? mrpr.w : 100);
        if (mrpr.spacing) adv += spacingTwips(ctx, mrpr.spacing);
        mg.push({ kind: "char", ch, cp, face, style: ms, adv, asc: m.ascent * ms.sizePt * 20, desc: m.descent * ms.sizePt * 20, offset: -1, runIdx: -1, breakAfter: false, sizePt: ms.sizePt });
        w += adv;
      }
      marker = { text: nm.text, glyphs: mg, width: w, level: nm.level, suff: nm.level.suff ?? "tab", jc: nm.level.lvlJc ?? "left" };
    }
  }
  const ind = ppr.ind ?? {};
  const sp = ppr.spacing ?? {};
  let jc = ppr.jc ?? "left";
  if (jc === "start") jc = "left";
  if (jc === "end") jc = "right";
  let firstLine = ind.hanging !== void 0 ? -ind.hanging : ind.firstLine ?? 0;
  if (mathJc && !glyphs.some((g) => !mathRuns.has(g.runIdx) && g.kind !== "lb" && g.kind !== "pb" && g.kind !== "space" && !(g.kind === "obj" && g.adv === 0))) {
    jc = mathJc === "left" ? "left" : mathJc === "right" ? "right" : "center";
    firstLine = 0;
  }
  return {
    para,
    ppr,
    styleId,
    markStyle,
    markFace,
    glyphs,
    marker,
    indLeft: ind.left ?? 0,
    indRight: ind.right ?? 0,
    firstLine,
    jc,
    tabs: (ppr.tabs ?? []).filter((t) => t.val !== "clear"),
    spaceBefore: sp.before ?? 0,
    spaceAfter: sp.after ?? 0,
    // w:doNotUseHTMLParagraphAutoSpacing: o automático ("HTML", 14 pt) não vale — ficam os
    // w:before/w:after explícitos (oráculo autosphtml)
    beforeAuto: !!sp.beforeAutospacing && !settings.compat["doNotUseHTMLParagraphAutoSpacing"],
    afterAuto: !!sp.afterAutospacing && !settings.compat["doNotUseHTMLParagraphAutoSpacing"],
    lineRule: sp.lineRule ?? "auto",
    line: sp.line ?? 240,
    contextual: !!ppr.contextualSpacing,
    keepNext: !!ppr.keepNext,
    keepLines: !!ppr.keepLines,
    widowControl: ppr.widowControl ?? false,
    pageBreakBefore: !!ppr.pageBreakBefore,
    empty: glyphs.every((g) => g.kind === "pb" || g.kind === "obj" && !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating))
  };
  void settings;
}

// ../docx-layout/src/lines.ts
var FIXED_SPACE = (cp) => cp >= 8192 && cp <= 8202 || cp === 12288;
var FIT_EPS = 1e-3;
function nextTab(x, tabs, defaultTab, hangingStop, rightLimit) {
  let best;
  for (const t of tabs) {
    if (t.val === "bar") continue;
    if (t.pos > x + 0.5) {
      best = { pos: t.pos, tab: t };
      break;
    }
  }
  if (hangingStop !== void 0 && hangingStop > x + 0.5 && (!best || hangingStop < best.pos)) {
    best = { pos: hangingStop };
  }
  if (best) return best;
  const lastCustom = tabs.length ? Math.max(...tabs.map((t) => t.pos)) : -Infinity;
  const from = Math.max(x, lastCustom);
  const dts = defaultTab > 0 ? defaultTab : 720;
  let pos = (Math.floor(from / dts + 1e-6) + 1) * dts;
  if (pos <= x + 0.5) pos += dts;
  void rightLimit;
  return { pos };
}
function moreTabs(gs, i) {
  for (let k = i + 1; k < gs.length; k++) {
    const q = gs[k];
    if (q.kind === "tab") return true;
    if (q.kind === "lb" || q.kind === "pb" || q.kind === "cb") return false;
  }
  return false;
}
function lineBox(asc, desc, p, textNat, grid) {
  const nat = asc + desc;
  if (p.lineRule === "exact") {
    const h2 = p.line;
    return { height: h2, baseline: h2 * 0.8 };
  }
  if (grid && grid > 0) {
    const g = Math.max(1, Math.ceil((nat - 1) / grid)) * grid;
    const gBase = (g - nat) / 2 + asc;
    if (p.lineRule === "atLeast") {
      const h3 = Math.max(g, p.line);
      return { height: h3, baseline: h3 - g + gBase };
    }
    const h2 = Math.max(grid * p.line / 240, g);
    return { height: h2, baseline: (h2 - nat) / 2 + asc };
  }
  if (p.lineRule === "atLeast") {
    const h2 = Math.max(nat, p.line);
    return { height: h2, baseline: h2 - desc };
  }
  const extra = (p.line / 240 - 1) * (textNat ?? nat);
  const h = nat + extra;
  return { height: h, baseline: extra >= 0 ? asc : asc * (h / nat) };
}
var LineBreaker = class {
  constructor(ctx, p, grid) {
    this.ctx = ctx;
    this.p = p;
    this.grid = grid;
  }
  ctx;
  p;
  grid;
  pos = 0;
  lineIdx = 0;
  /** quebra de linha (w:br) no FIM do parágrafo: a marca de parágrafo vai
   *  para uma linha vazia própria (Word) */
  trailingBreak = false;
  /** linhas seguidas terminadas em hífen (w:consecutiveHyphenLimit) */
  hyphenRun = 0;
  done() {
    return this.pos >= this.p.glyphs.length && this.lineIdx > 0 && !this.trailingBreak;
  }
  /** Estado antes de uma linha (para refazê-la noutro quadro). */
  /** largura da próxima palavra (até o 1º ponto de quebra): o vão ao lado de um
   *  objeto só recebe texto se ela cabe nele (oráculo wrapsides) */
  peekWordWidth() {
    const gs = this.p.glyphs;
    let w = 0;
    for (let e = this.pos; e < gs.length; e++) {
      const q = gs[e];
      if (q.kind === "space" || q.kind === "tab" || q.kind === "lb" || q.kind === "pb" || q.kind === "cb") break;
      if (q.kind === "obj" && q.adv === 0) continue;
      w += q.kind === "shy" ? 0 : q.adv;
      if (q.breakAfter) break;
    }
    return w + (this.indentFirst() ? Math.max(0, this.p.firstLine) : 0);
  }
  /** Linha com o recuo da 1ª linha e o número da lista: a 1ª — ou, no parágrafo que
   *  COMEÇA com quebra de coluna, a que vem depois dela, na coluna seguinte (a linha da
   *  quebra fica sem os dois — oráculo brfirst, corpus t70). */
  indentFirst() {
    return this.lineIdx === (this.p.glyphs[0]?.kind === "cb" && this.p.glyphs.length > 1 ? 1 : 0);
  }
  mark() {
    return { pos: this.pos, lineIdx: this.lineIdx, trailingBreak: this.trailingBreak, hyphenRun: this.hyphenRun };
  }
  reset(m) {
    this.pos = m.pos;
    this.lineIdx = m.lineIdx;
    this.trailingBreak = m.trailingBreak;
    this.hyphenRun = m.hyphenRun;
  }
  /** Borda direita do teste "cabe" (x relativo ao quadro): o Word converte a largura da
   *  coluna/célula (borda direita + recuo direito) e cada recuo para 1/4096 pt
   *  separadamente, arredondando — oráculo emwidth. */
  fitRight(frame, xStart, first) {
    if (this.ctx.opts.advanceRound !== "word" || this.ctx.opts.advanceEm === "device") return frame.right;
    const p = this.p, q = toWordUnit;
    return xStart + q(frame.right + p.indRight) - q(p.indRight) - q(frame.left - p.indLeft) - q(p.indLeft) - (first ? q(p.firstLine) : 0);
  }
  /** Próxima linha no quadro dado. `frame` já desconta recuos do parágrafo. */
  next(frame) {
    const p = this.p;
    const gs = p.glyphs;
    const indFirst = this.indentFirst();
    const start = this.pos;
    const xStart = frame.left + (indFirst ? p.firstLine : 0);
    let right = frame.right;
    let rightQ = this.fitRight(frame, xStart, indFirst);
    const placed = [];
    let x = xStart;
    let markerPlaced;
    const defaultTab = this.ctx.fmt.settings.defaultTabStop;
    const hangingStop = indFirst && p.firstLine < 0 ? frame.left : void 0;
    if (indFirst && p.marker) {
      const mk = p.marker;
      let mx = xStart;
      if (mk.jc === "right") mx -= mk.width;
      else if (mk.jc === "center") mx -= mk.width / 2;
      markerPlaced = [];
      for (const g of mk.glyphs) {
        markerPlaced.push({ g, x: mx, w: g.adv });
        mx += g.adv;
      }
      x = Math.max(mx, xStart);
      if (mk.suff === "tab") {
        const xe = x - 0.5 - 1e-3;
        let ns = nextTab(xe, p.tabs, defaultTab, frame.left > xe + 0.5 ? frame.left : void 0, right);
        if (this.ctx.fmt.settings.compat["doNotUseIndentAsNumberingTabStop"] && this.ctx.fmt.settings.compatibilityMode < 15) {
          const plain = nextTab(xe, p.tabs, defaultTab, void 0, right);
          ns = frame.left > xe + 0.5 && frame.left < plain.pos ? { pos: frame.left } : plain;
        }
        x = ns.pos;
      } else if (mk.suff === "space") {
        x += advanceTwips(this.ctx, mk.glyphs[0]?.face ?? p.markFace, 32, mk.glyphs[0]?.sizePt ?? p.markStyle.sizePt);
      }
    }
    let i = start;
    let lastBreak = -1;
    const justify = (p.jc === "both" || p.jc === "distribute") && this.ctx.fmt.settings.compatibilityMode >= 15;
    const shrink = this.ctx.opts.justifyShrink;
    let spacesW = 0;
    let nSpaces = 0;
    let segWord = false;
    let lastGapW = 0;
    let lastGapSp = 0;
    let unitX = xStart, unitSpacesW = 0, unitGapW = 0, unitGapSp = 0;
    let feShrinkW = 0;
    let wordOk = false;
    let squeezed = false;
    let prevWasGap = true;
    let widthAtBreak = 0;
    let contentEnd = xStart;
    let pendTab = null;
    let breakAfter;
    let clearAfter = false;
    let gapTab;
    let spanned = false;
    let pastMargin = false;
    let forced = false;
    let hyphAt = -1, hyphW = 0, endedHyphen = false;
    const closePending = () => {
      if (!pendTab) return;
      const pt = placed[pendTab.idx];
      const segW = x - pendTab.segStart;
      let shift = 0;
      const avail2 = pendTab.pos - pendTab.startX;
      if (pendTab.tab.val === "right") shift = Math.max(0, avail2 - segW);
      else if (pendTab.tab.val === "center") shift = Math.max(0, avail2 - segW / 2);
      else if (pendTab.tab.val === "decimal") {
        const dx2 = pendTab.decimalSeen ? pendTab.decimalX - pendTab.segStart : segW;
        shift = Math.max(0, avail2 - dx2);
      }
      pt.w = shift;
      for (let k = pendTab.idx + 1; k < placed.length; k++) placed[k].x += shift;
      x += shift;
      if (contentEnd > pendTab.segStart) contentEnd += shift;
      pendTab = null;
    };
    for (; i < gs.length; i++) {
      const g = gs[i];
      if (hyphAt >= 0 && i > hyphAt) {
        const kg = gs[hyphAt];
        if (kg.kind === "shy") placed[placed.length - 1].w = hyphW;
        else placed.push({ g: { ...kg, kind: "shy", ch: "", cp: 173, adv: 0, hyph: false, autoHyphen: true, offset: kg.offset + kg.ch.length }, x, w: hyphW });
        contentEnd = x + hyphW;
        endedHyphen = kg.kind !== "shy";
        pendTab = null;
        break;
      }
      if (g.kind === "lb" || g.kind === "pb" || g.kind === "cb") {
        closePending();
        placed.push({ g, x, w: 0 });
        i++;
        forced = true;
        if (g.kind === "pb") {
          breakAfter = "page";
          let j = i;
          while (j < gs.length && gs[j].kind === "obj" && gs[j].adv === 0 && gs[j].hr === void 0) j++;
          if (j > i && j >= gs.length) for (; i < j; i++) placed.push({ g: gs[i], x, w: 0 });
        } else if (g.kind === "cb") breakAfter = "column";
        else if (g.clear) clearAfter = true;
        break;
      }
      if (g.hr !== void 0) {
        if (placed.some((q) => q.g.kind !== "obj" || q.g.adv > 0 || q.g.hr !== void 0)) break;
        placed.push({ g, x, w: 0 });
        i++;
        break;
      }
      if (g.kind === "tab") {
        closePending();
        let pos;
        let tab;
        if (g.ptab) {
          const width2 = right - frame.left;
          pos = g.ptab.alignment === "center" ? frame.left + width2 / 2 : g.ptab.alignment === "right" ? right : frame.left;
          tab = { val: g.ptab.alignment === "center" ? "center" : g.ptab.alignment === "right" ? "right" : "left", pos, ...g.ptab.leader && g.ptab.leader !== "none" ? { leader: g.ptab.leader } : {} };
        } else ({ pos, tab } = nextTab(x, p.tabs, defaultTab, hangingStop, right));
        if (frame.gap && !g.ptab && pos > right + 0.5 && moreTabs(gs, i)) {
          const nx = frame.next && !spanned ? nextTab(frame.next.left, p.tabs, defaultTab, hangingStop, frame.next.right) : void 0;
          if (nx && frame.next && nx.pos <= frame.next.right + 0.5) {
            spanned = true;
            x = frame.next.left;
            right = frame.next.right;
            rightQ = this.fitRight({ left: frame.left, right }, xStart, indFirst);
            ({ pos, tab } = nx);
          } else if (i > start) {
            gapTab = "break";
            break;
          } else gapTab = "start";
        }
        if (!g.ptab && tab && (tab.val === "right" || tab.val === "center" || tab.val === "decimal") && this.ctx.fmt.settings.compatibilityMode >= 15 && pos > Math.max(right, right + p.indRight) + 0.5) {
          pos = right;
          tab = { ...tab, val: "right" };
        }
        if (!g.ptab && tab && tab.val !== "right" && tab.val !== "center" && tab.val !== "decimal" && this.ctx.fmt.settings.compatibilityMode >= 15 && pos > right + 0.5) {
          if (i > start) break;
          pos = Math.max(x, right);
        }
        const legacyNoWrap = this.ctx.fmt.settings.compatibilityMode < 15 && p.tabs.some((t) => t.val !== "bar" && t.val !== "clear");
        if (!g.ptab && !tab && !legacyNoWrap && pos > right + 0.5 && i > start) break;
        if (legacyNoWrap && pos > right + 0.5) pastMargin = true;
        const pg = { g, x, w: 0, ...tab?.leader && tab.leader !== "none" ? { leader: tab.leader } : {} };
        placed.push(pg);
        if (tab && (tab.val === "right" || tab.val === "center" || tab.val === "decimal")) {
          pendTab = { idx: placed.length - 1, pos, tab, segStart: x, startX: x, decimalSeen: false, decimalX: 0 };
        } else {
          pg.w = Math.max(0, pos - x);
          x = Math.max(x, pos);
        }
        lastBreak = i > start ? i - 1 : i;
        widthAtBreak = contentEnd - xStart;
        spacesW = 0;
        nSpaces = 0;
        feShrinkW = 0;
        segWord = false;
        lastGapW = 0;
        lastGapSp = 0;
        prevWasGap = true;
        continue;
      }
      if (g.kind === "obj" && g.adv === 0) {
        placed.push({ g, x, w: 0 });
        continue;
      }
      const isGap = g.kind === "space";
      if (!isGap && g.kind !== "shy" && prevWasGap) {
        let e = i, wordW = 0;
        for (; e < gs.length; e++) {
          const q = gs[e];
          if (q.kind === "space" || q.kind === "tab" || q.kind === "lb" || q.kind === "pb" || q.kind === "cb") break;
          if (q.kind === "obj" && q.adv === 0) continue;
          if (q.kind === "shy") continue;
          wordW += q.adv;
          if (q.breakAfter && q.kind !== "char") break;
          if (q.breakAfter) {
            e++;
            break;
          }
        }
        const over = x + wordW - rightQ;
        if (i === start || !(gs[i - 1].kind === "space" && !gs[i - 1].breakAfter)) {
          const gap = i > start && gs[i - 1].kind === "space";
          unitX = x;
          unitSpacesW = spacesW;
          unitGapW = gap ? lastGapW : 0;
          unitGapSp = gap ? lastGapSp : 0;
        }
        wordOk = over <= FIT_EPS;
        const hangW = e > i && gs[e - 1].hang && (justify || this.ctx.fmt.settings.compatibilityMode < 15) ? gs[e - 1].adv : 0;
        if (!wordOk && (hangW > 0 || feShrinkW > 0) && i > start) {
          const paraEnd = gs.slice(e).every((q) => q.kind === "pb" || q.kind === "cb" || q.kind === "obj" && q.adv === 0);
          wordOk = over - hangW <= (hangW > 0 && paraEnd ? 0 : feShrinkW) + FIT_EPS;
        }
        if (!wordOk && justify && lastBreak >= start && i > start) {
          const slack = x + wordW - unitX + unitGapW - over;
          const rest = unitSpacesW - unitGapSp;
          const ov = over - hangW;
          wordOk = nSpaces > 0 && ov <= shrink.ratio * spacesW + 0.0175 && (nSpaces <= 1 || rest <= 0 || ov / spacesW <= shrink.expandRatio * slack / rest + 75e-4 * nSpaces / spacesW);
        }
        if (squeezed && i > start) wordOk = false;
        else if (wordOk && over > FIT_EPS) squeezed = true;
        else if (!wordOk && !pendTab && !pastMargin) {
          const ch = chooseHyphenation(this.ctx, gs, {
            i,
            e,
            x,
            right: rightQ,
            lineStart: lastBreak < start,
            contentEnd: xStart + widthAtBreak,
            justify: p.jc === "both" || p.jc === "distribute",
            spacesW,
            restW: unitSpacesW - unitGapSp,
            nSpaces,
            hyphenRun: this.hyphenRun
          });
          if (ch) {
            hyphAt = ch.k;
            hyphW = ch.w;
            wordOk = true;
          }
        }
        if (this.ctx.opts.onWordFit && over > -2e3) {
          this.ctx.opts.onWordFit({
            over,
            spacesW,
            nSpaces,
            wordW,
            lastGapW,
            justify,
            accepted: wordOk,
            lineStart: start,
            wordStart: i,
            wordEnd: e,
            sizePt: g.sizePt ?? 0,
            family: g.face?.family ?? "",
            compat: this.ctx.fmt.settings.compatibilityMode,
            lineText: gs.slice(start, i).map((q) => q.ch ?? (q.kind === "space" || q.kind === "tab" ? " " : "")).join(""),
            wordText: gs.slice(i, e).map((q) => q.ch ?? "").join("")
          });
        }
      }
      const projected = isGap ? x : x + g.adv;
      if (!isGap && g.kind !== "shy" && !wordOk && !pastMargin && projected > rightQ + FIT_EPS && i > start && pendTab?.tab.val === "right" && this.ctx.fmt.settings.compatibilityMode < 15) pastMargin = true;
      if (!isGap && g.kind !== "shy" && !wordOk && !pastMargin && projected > rightQ + FIT_EPS && i > start && placed.some((q) => q.g.kind !== "obj" || q.g.adv > 0)) {
        if (lastBreak >= start) {
          const keep = lastBreak + 1;
          while (placed.length && placed[placed.length - 1].g !== gs[lastBreak]) placed.pop();
          i = keep;
          contentEnd = xStart + widthAtBreak;
          pendTab = null;
          break;
        }
        if (!g.glue) break;
      }
      if (g.kind === "shy") {
        placed.push({ g, x, w: 0 });
        continue;
      }
      placed.push({ g, x, w: g.adv });
      if (isGap) {
        if (!prevWasGap) {
          lastGapW = 0;
          lastGapSp = 0;
        }
        lastGapW += g.adv;
        if (segWord && !FIXED_SPACE(g.cp) && !g.fixed) {
          spacesW += g.adv;
          nSpaces++;
          lastGapSp += g.adv;
          feShrinkW += g.feShrink ?? 0;
        }
      } else segWord = true;
      prevWasGap = isGap || !!g.breakAfter;
      if (pendTab?.tab.val === "decimal" && !pendTab.decimalSeen && (g.ch === "," || g.ch === ".")) {
        pendTab.decimalSeen = true;
        pendTab.decimalX = x;
      }
      x += g.adv;
      if (!isGap) contentEnd = x;
      if (g.breakAfter) {
        lastBreak = i;
        widthAtBreak = (isGap ? contentEnd : x) - xStart;
      }
    }
    closePending();
    let width = 0;
    for (const pg of placed) {
      if (pg.g.kind === "obj" && pg.g.adv === 0) continue;
      if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb" && pg.g.kind !== "cb") {
        width = Math.max(width, pg.x + pg.w - xStart);
      }
    }
    this.pos = Math.min(gs.length, i);
    if (this.pos === start && start < gs.length) this.pos = start + 1;
    this.hyphenRun = endedHyphen ? this.hyphenRun + 1 : 0;
    let lkI = placed.length - 1;
    while (lkI > 0 && placed[lkI].g.kind === "obj" && placed[lkI].g.adv === 0 && placed[lkI].g.hr === void 0) lkI--;
    const lk = placed[lkI]?.g.kind === "pb" ? "pb" : placed[placed.length - 1]?.g.kind;
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"];
    this.trailingBreak = forced && this.pos >= gs.length && (lk === "lb" || lk === "cb" || lk === "pb" && splitPg);
    const last = this.pos >= gs.length && !this.trailingBreak;
    this.lineIdx++;
    let asc = 0, desc = 0, tAsc = 0, tDesc = 0;
    let oAsc = 0, oDesc = 0;
    const content = placed.filter((pg) => pg.g.kind !== "obj" || pg.g.adv > 0);
    const withObj = content.some((pg) => pg.g.kind === "obj");
    for (const pg of content) {
      if (pg.g.kind === "pb" || pg.g.kind === "cb") continue;
      if (pg.g.kind === "lb" && withObj) continue;
      if (pg.g.ch === " " || pg.g.kind === "tab") continue;
      asc = Math.max(asc, pg.g.asc);
      desc = Math.max(desc, pg.g.desc);
      if (pg.g.kind !== "obj") {
        tAsc = Math.max(tAsc, pg.g.nAsc ?? pg.g.asc);
        tDesc = Math.max(tDesc, pg.g.nDesc ?? pg.g.desc);
      } else if (pg.g.kind === "obj") {
        const om = faceMetrics(pg.g.face.font);
        oAsc = Math.max(oAsc, om.ascent * pg.g.sizePt * 20);
        oDesc = Math.max(oDesc, om.descent * pg.g.sizePt * 20);
        if (pg.g.style.underline && pg.g.style.underline.val !== "none") desc = Math.max(desc, om.descent * pg.g.sizePt * 20);
      }
    }
    if (tAsc + tDesc === 0 && oAsc > 0) asc = Math.max(asc, oAsc + oDesc - desc);
    for (const pg of placed) {
      if (pg.g.hr === void 0) continue;
      const om = faceMetrics(pg.g.face.font);
      const fa = om.ascent * pg.g.sizePt * 20, fd = om.descent * pg.g.sizePt * 20;
      tAsc = Math.max(tAsc, fa);
      tDesc = Math.max(tDesc, fd);
      desc = Math.max(desc, fd);
      asc = Math.max(asc, fa, pg.g.hr + 100 - desc);
    }
    if (!last && asc === 0 && desc === 0 && content.some((pg) => pg.g.kind === "tab") && content.every((pg) => pg.g.kind === "tab" || pg.g.ch === " ")) {
      for (const pg of content) {
        if (pg.g.kind !== "tab") continue;
        asc = Math.max(asc, pg.g.asc);
        desc = Math.max(desc, pg.g.desc);
        tAsc = Math.max(tAsc, pg.g.nAsc ?? pg.g.asc);
        tDesc = Math.max(tDesc, pg.g.nDesc ?? pg.g.desc);
      }
    }
    const emptyLine = asc === 0 && desc === 0;
    if (emptyLine) {
      const mm = faceMetrics(p.markFace.font);
      const va = p.markStyle.rpr.vertAlign;
      const sz = (va === "superscript" || va === "subscript" ? (p.markStyle.rpr.sz ?? 20) / 2 : p.markStyle.sizePt) * 20;
      const sh = va ? 0 : p.markStyle.shift;
      const [ea, ed] = shadowExtent(p.markStyle);
      asc = Math.max(0, mm.ascent * sz + ea + sh);
      desc = Math.max(0, mm.descent * sz + ed - sh);
    }
    if (tAsc + tDesc === 0) {
      const mm = faceMetrics(p.markFace.font);
      tAsc = oAsc || (emptyLine ? asc : mm.ascent * p.markStyle.sizePt * 20);
      tDesc = oAsc ? oDesc : emptyLine ? desc : mm.descent * p.markStyle.sizePt * 20;
    }
    if (markerPlaced) for (const pg of markerPlaced) asc = Math.max(asc, pg.g.asc);
    const box = lineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : void 0, this.grid);
    const avail = right - xStart;
    let dx = 0;
    const jc = p.jc;
    let lastC;
    for (const pg of placed) if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb" && pg.g.kind !== "cb") lastC = pg;
    const alignW = lastC?.g.hang && width > avail + FIT_EPS ? width - lastC.w : width;
    const justified = (jc === "both" || jc === "distribute") && (!last || jc === "distribute") && breakAfter === void 0;
    if (!justified && alignW > avail + FIT_EPS) {
      const sh = placed.filter((pg) => pg.g.feShrink && pg.x < (lastC?.x ?? 0));
      const total = sh.reduce((a, pg) => a + pg.g.feShrink, 0);
      if (total > 0) {
        const f = Math.min(1, (alignW - avail) / total);
        let acc = 0;
        for (const pg of placed) {
          pg.x -= acc;
          if (pg.g.feShrink && sh.includes(pg)) {
            pg.w -= pg.g.feShrink * f;
            acc += pg.g.feShrink * f;
          }
        }
      }
    }
    if (jc === "center") dx = (avail - alignW) / 2;
    else if (jc === "right") dx = avail - alignW;
    else if (justified) {
      let lastTab = -1;
      placed.forEach((pg, k) => {
        if (pg.g.kind === "tab") lastTab = k;
      });
      let lastContent = -1;
      placed.forEach((pg, k) => {
        if (pg.g.kind !== "space" && pg.g.kind !== "lb") lastContent = k;
      });
      let firstContent = placed.length;
      for (let k = lastTab + 1; k < placed.length; k++) if (placed[k].g.kind !== "space") {
        firstContent = k;
        break;
      }
      const spaces = placed.filter((pg, k) => k > firstContent && k < lastContent && pg.g.kind === "space" && !FIXED_SPACE(pg.g.cp) && !pg.g.fixed);
      const extra = avail - alignW;
      if (spaces.length && (extra > 0 || extra < 0)) {
        const each = extra / spaces.length;
        let acc = 0;
        for (let k = 0; k < placed.length; k++) {
          const pg = placed[k];
          pg.x += acc;
          if (spaces.includes(pg)) {
            pg.w += each;
            acc += each;
          }
        }
      }
    }
    if (dx > 0 || dx < 0) {
      for (const pg of placed) pg.x += dx;
      if (markerPlaced && jc !== "left") for (const pg of markerPlaced) pg.x += dx;
    }
    return {
      start,
      end: this.pos,
      placed,
      ...markerPlaced ? { marker: markerPlaced } : {},
      width,
      xStart: xStart + Math.max(0, dx),
      asc,
      desc,
      height: box.height,
      baseline: box.baseline,
      ...breakAfter ? { breakAfter } : {},
      ...clearAfter ? { clear: true } : {},
      ...gapTab ? { gapTab } : {},
      ...spanned ? { spanned: true } : {},
      last
    };
  }
};

// ../docx-layout/src/emf.ts
var IDENT = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
var mul = (m, n) => ({
  a: m.a * n.a + m.b * n.c,
  b: m.a * n.b + m.b * n.d,
  c: m.c * n.a + m.d * n.c,
  d: m.c * n.b + m.d * n.d,
  e: m.e * n.a + m.f * n.c + n.e,
  f: m.e * n.b + m.f * n.d + n.f
});
var colorOf = (v) => [v & 255, v >> 8 & 255, v >> 16 & 255].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
var STOCK = {
  0: { kind: "brush", brush: { style: 0, color: "FFFFFF" } },
  1: { kind: "brush", brush: { style: 0, color: "C0C0C0" } },
  2: { kind: "brush", brush: { style: 0, color: "808080" } },
  3: { kind: "brush", brush: { style: 0, color: "404040" } },
  4: { kind: "brush", brush: { style: 0, color: "000000" } },
  5: { kind: "brush", brush: { style: 1, color: "000000" } },
  6: { kind: "pen", pen: { style: 0, width: 0, color: "FFFFFF" } },
  7: { kind: "pen", pen: { style: 0, width: 0, color: "000000" } },
  8: { kind: "pen", pen: { style: 5, width: 0, color: "000000" } },
  13: { kind: "font", font: { height: -12, weight: 400, italic: false, underline: false, strike: false, face: "Arial", escapement: 0 } },
  17: { kind: "font", font: { height: -11, weight: 400, italic: false, underline: false, strike: false, face: "Segoe UI", escapement: 0 } }
};
function isEmf(b) {
  return b.length > 44 && b[0] === 1 && b[1] === 0 && b[2] === 0 && b[3] === 0 && b[40] === 32 && b[41] === 69 && b[42] === 77 && b[43] === 70;
}
function renderEmf(ctx, bytes, dest) {
  const out = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i32 = (o) => dv.getInt32(o, true);
  const u32 = (o) => dv.getUint32(o, true);
  const i16 = (o) => dv.getInt16(o, true);
  const u16 = (o) => dv.getUint16(o, true);
  if (!isEmf(bytes)) return out;
  const frame = [i32(24), i32(28), i32(32), i32(36)];
  const devPx = [i32(72), i32(76)];
  const devMm = [i32(80), i32(84)];
  const pxPerHmmX = devPx[0] / Math.max(1, devMm[0] * 100);
  const pxPerHmmY = devPx[1] / Math.max(1, devMm[1] * 100);
  const fx0 = frame[0] * pxPerHmmX, fy0 = frame[1] * pxPerHmmY;
  const fw = Math.max(1e-6, (frame[2] - frame[0]) * pxPerHmmX), fh = Math.max(1e-6, (frame[3] - frame[1]) * pxPerHmmY);
  const sx = dest.w / fw, sy = dest.h / fh;
  const twipsPerDevPx = devMm[0] * 100 / Math.max(1, devPx[0]) * (1440 / 2540);
  let dc = {
    mapMode: 1,
    winOrg: [0, 0],
    winExt: [1, 1],
    vpOrg: [0, 0],
    vpExt: [1, 1],
    world: IDENT,
    pen: STOCK[7].pen,
    brush: STOCK[0].brush,
    font: STOCK[13].font,
    textColor: "000000",
    bkColor: "FFFFFF",
    bkMode: 2,
    textAlign: 0,
    polyFill: 1,
    cur: [0, 0]
  };
  const stack = [];
  const objs = /* @__PURE__ */ new Map();
  const mapScale = () => {
    switch (dc.mapMode) {
      case 2:
        return [0.1 * pxPerHmmX * 10, -0.1 * pxPerHmmY * 10];
      // LOMETRIC: 0,1 mm
      case 3:
        return [0.01 * pxPerHmmX * 100 / 1, -0.01 * pxPerHmmY * 100];
      // HIMETRIC
      case 4:
        return [0.254 * pxPerHmmX * 100, -0.254 * pxPerHmmY * 100];
      // LOENGLISH 0,01"
      case 5:
        return [0.0254 * pxPerHmmX * 100, -0.0254 * pxPerHmmY * 100];
      // HIENGLISH
      case 6:
        return [25.4 / 1440 * pxPerHmmX * 100, -(25.4 / 1440) * pxPerHmmY * 100];
      // TWIPS
      case 7:
      case 8:
        return [dc.vpExt[0] / (dc.winExt[0] || 1), dc.vpExt[1] / (dc.winExt[1] || 1)];
      default:
        return [1, 1];
    }
  };
  const toDev = (x, y) => {
    const w = dc.world;
    const wx = x * w.a + y * w.c + w.e, wy = x * w.b + y * w.d + w.f;
    const [kx, ky] = mapScale();
    let s = [kx, ky];
    if (dc.mapMode === 7) {
      const k = Math.min(Math.abs(kx), Math.abs(ky));
      s = [Math.sign(kx) * k, Math.sign(ky) * k];
    }
    return [(wx - dc.winOrg[0]) * s[0] + dc.vpOrg[0], (wy - dc.winOrg[1]) * s[1] + dc.vpOrg[1]];
  };
  const toPage = (x, y) => {
    const [dx, dy] = toDev(x, y);
    return [dest.x + (dx - fx0) * sx, dest.y + (dy - fy0) * sy];
  };
  const lenTw = (logical) => {
    const [kx] = mapScale();
    const w = dc.world;
    return Math.abs(logical * Math.hypot(w.a, w.b) * kx) * sx;
  };
  let path = null;
  const emitPath = (cmds, fill, stroke) => {
    if (!cmds.length) return;
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : void 0;
    const pen = dc.pen;
    const st = stroke && pen.style !== 5 ? { color: pen.color, widthPt: Math.max(0.25, lenTw(pen.width || 1) / 20), ...pen.style >= 1 && pen.style <= 4 ? { dash: "dashed" } : {} } : void 0;
    if (!f && !st) return;
    out.push({ t: "path", cmds, ...f ? { fill: f } : {}, ...st ? { stroke: st } : {}, ...dc.polyFill === 1 ? { evenOdd: true } : {} });
  };
  const draw = (cmds, closed) => {
    if (path) {
      path.push(...cmds);
      return;
    }
    emitPath(cmds, closed, true);
  };
  const pts16 = (o, n) => Array.from({ length: n }, (_, k) => [i16(o + k * 4), i16(o + k * 4 + 2)]);
  const pts32 = (o, n) => Array.from({ length: n }, (_, k) => [i32(o + k * 8), i32(o + k * 8 + 4)]);
  const poly2 = (pts, closed, cont = false) => {
    const c = [];
    pts.forEach(([x, y], k) => {
      const [px, py] = toPage(x, y);
      c.push({ op: k === 0 && !cont ? "M" : "L", x: px, y: py });
    });
    if (closed) c.push({ op: "Z" });
    return c;
  };
  const bezier = (pts, startWithMove) => {
    const c = [];
    let k = 0;
    if (startWithMove) {
      const [x, y] = toPage(pts[0][0], pts[0][1]);
      c.push({ op: "M", x, y });
      k = 1;
    }
    for (; k + 2 < pts.length + (startWithMove ? 0 : 0); k += 3) {
      const a = toPage(...pts[k]), b = toPage(...pts[k + 1]), d = toPage(...pts[k + 2]);
      c.push({ op: "C", x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
    }
    return c;
  };
  const rect = (l, t, r, b) => poly2([[l, t], [r, t], [r, b], [l, b]], true);
  const ellipse = (l, t, r, b) => {
    const K4 = 0.5523;
    const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
    const P = (x, y) => toPage(x, y);
    const p0 = P(cx + rx, cy);
    const seg = (x1, y1, x2, y2, x, y) => {
      const a = P(x1, y1), b2 = P(x2, y2), d = P(x, y);
      return { op: "C", x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], x: d[0], y: d[1] };
    };
    return [
      { op: "M", x: p0[0], y: p0[1] },
      seg(cx + rx, cy + ry * K4, cx + rx * K4, cy + ry, cx, cy + ry),
      seg(cx - rx * K4, cy + ry, cx - rx, cy + ry * K4, cx - rx, cy),
      seg(cx - rx, cy - ry * K4, cx - rx * K4, cy - ry, cx, cy - ry),
      seg(cx + rx * K4, cy - ry, cx + rx, cy - ry * K4, cx + rx, cy),
      { op: "Z" }
    ];
  };
  const dib = (off, cbBmi, offBits, cbBits, premul = false) => {
    if (!cbBmi || !cbBits || off + cbBmi > bytes.length || offBits + cbBits > bytes.length) return null;
    const build = (hdr) => {
      const b = new Uint8Array(14 + hdr + cbBits);
      b[0] = 66;
      b[1] = 77;
      const v = new DataView(b.buffer);
      v.setUint32(2, b.length, true);
      v.setUint32(10, 14 + hdr, true);
      b.set(bytes.subarray(off, off + cbBmi), 14);
      b.set(bytes.subarray(offBits, offBits + cbBits), 14 + hdr);
      return [b, v];
    };
    let [bmp, bv] = build(cbBmi);
    if (premul && bv.getUint16(14 + 14, true) === 32) {
      const hdr = Math.max(cbBmi, 56);
      [bmp, bv] = build(hdr);
      bv.setUint32(14, hdr, true);
      bv.setUint32(14 + 16, 3, true);
      bv.setUint32(14 + 40, 16711680, true);
      bv.setUint32(14 + 44, 65280, true);
      bv.setUint32(14 + 48, 255, true);
      bv.setUint32(14 + 52, 4278190080, true);
      for (let k = 14 + hdr; k + 3 < bmp.length; k += 4) {
        const a = bmp[k + 3];
        if (a > 0 && a < 255) for (let c = 0; c < 3; c++) bmp[k + c] = Math.min(255, Math.round(bmp[k + c] * 255 / a));
      }
    }
    return { data: bmp, ext: "bmp", widthTwips: 0, heightTwips: 0 };
  };
  const plus = emfPlusOnly(bytes) ? new EmfPlusPlayer(bytes, (img, x0, y0, x1, y1, crop) => {
    const [px0, py0] = [dest.x + (x0 - fx0) * sx, dest.y + (y0 - fy0) * sy];
    const [px1, py1] = [dest.x + (x1 - fx0) * sx, dest.y + (y1 - fy0) * sy];
    out.push({
      t: "image",
      x: Math.min(px0, px1),
      y: Math.min(py0, py1),
      w: Math.abs(px1 - px0),
      h: Math.abs(py1 - py0),
      image: img,
      ...crop ? { crop } : {},
      ...px1 < px0 ? { flipH: true } : {},
      ...py1 < py0 ? { flipV: true } : {}
    });
  }) : null;
  const rasterText = !plus && emfRastersDest(bytes);
  let pos = 0;
  let guard = 0;
  while (pos + 8 <= bytes.length && guard++ < 2e5) {
    const type = u32(pos), size = u32(pos + 4);
    if (size < 8 || pos + size > bytes.length) break;
    const r = pos + 8;
    if (plus) {
      if (type === 70 && size >= 16 && u32(r + 4) === EMF_PLUS) plus.play(r + 8, Math.min(pos + size, r + 4 + u32(r)));
      if (type === 14) break;
      pos += size;
      continue;
    }
    switch (type) {
      case 14:
        pos = bytes.length;
        continue;
      // EOF
      case 17:
        dc.mapMode = u32(r);
        break;
      case 9:
        dc.winExt = [i32(r), i32(r + 4)];
        break;
      case 10:
        dc.winOrg = [i32(r), i32(r + 4)];
        break;
      case 11:
        dc.vpExt = [i32(r), i32(r + 4)];
        break;
      case 12:
        dc.vpOrg = [i32(r), i32(r + 4)];
        break;
      case 35: {
        dc.world = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        break;
      }
      case 36: {
        const m = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        const mode = u32(r + 24);
        dc.world = mode === 1 ? IDENT : mode === 2 ? mul(m, dc.world) : mode === 3 ? mul(dc.world, m) : m;
        break;
      }
      case 33:
        stack.push({ ...dc, winOrg: [...dc.winOrg], winExt: [...dc.winExt], vpOrg: [...dc.vpOrg], vpExt: [...dc.vpExt], cur: [...dc.cur] });
        break;
      case 34: {
        let n = i32(r);
        let s;
        while (n < 0 && stack.length) {
          s = stack.pop();
          n++;
        }
        if (s) dc = s;
        break;
      }
      case 18:
        dc.bkMode = u32(r);
        break;
      case 19:
        dc.polyFill = u32(r);
        break;
      case 22:
        dc.textAlign = u32(r);
        break;
      case 24:
        dc.textColor = colorOf(u32(r));
        break;
      case 25:
        dc.bkColor = colorOf(u32(r));
        break;
      case 38:
        objs.set(u32(r), { kind: "pen", pen: { style: u32(r + 4) & 15, width: i32(r + 8), color: colorOf(u32(r + 16)) } });
        break;
      case 95:
        objs.set(u32(r), { kind: "pen", pen: { style: u32(r + 20) & 15, width: u32(r + 24), color: colorOf(u32(r + 32)) } });
        break;
      case 39:
        objs.set(u32(r), { kind: "brush", brush: { style: u32(r + 4), color: colorOf(u32(r + 8)) } });
        break;
      case 82: {
        let face = "";
        for (let k = 0; k < 32; k++) {
          const c = u16(r + 32 + k * 2);
          if (!c) break;
          face += String.fromCharCode(c);
        }
        objs.set(u32(r), { kind: "font", font: { height: i32(r + 4), escapement: i32(r + 12), weight: i32(r + 20), italic: bytes[r + 24] !== 0, underline: bytes[r + 25] !== 0, strike: bytes[r + 26] !== 0, face } });
        break;
      }
      case 37: {
        const h = u32(r);
        const o = h & 2147483648 ? STOCK[h & 2147483647] : objs.get(h);
        if (o?.kind === "pen") dc.pen = o.pen;
        else if (o?.kind === "brush") dc.brush = o.brush;
        else if (o?.kind === "font") dc.font = o.font;
        break;
      }
      case 40:
        objs.delete(u32(r));
        break;
      case 27:
        dc.cur = [i32(r), i32(r + 4)];
        if (path) {
          const [x, y] = toPage(dc.cur[0], dc.cur[1]);
          path.push({ op: "M", x, y });
        }
        break;
      case 54: {
        const to = [i32(r), i32(r + 4)];
        if (path) {
          const [x, y] = toPage(...to);
          path.push({ op: "L", x, y });
        } else draw(poly2([dc.cur, to], false), false);
        dc.cur = to;
        break;
      }
      case 43:
        draw(rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      case 44:
        draw(rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      // ROUNDRECT ≈ ret.
      case 42:
        draw(ellipse(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true);
        break;
      case 86:
        draw(poly2(pts16(r + 20, u32(r + 16)), true), true);
        break;
      // POLYGON16
      case 87:
        draw(poly2(pts16(r + 20, u32(r + 16)), false), false);
        break;
      // POLYLINE16
      case 3:
        draw(poly2(pts32(r + 20, u32(r + 16)), true), true);
        break;
      case 4:
        draw(poly2(pts32(r + 20, u32(r + 16)), false), false);
        break;
      case 89:
      case 6: {
        const pts = type === 89 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        if (path) path.push(...poly2(pts, false, true));
        else draw(poly2([dc.cur, ...pts], false), false);
        if (pts.length) dc.cur = pts[pts.length - 1];
        break;
      }
      case 85:
      case 2: {
        const pts = type === 85 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        draw(bezier(pts, true), false);
        break;
      }
      case 88:
      case 5: {
        const pts = type === 88 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        const c = bezier([dc.cur, ...pts], !path);
        if (path) path.push(...c.slice(0));
        else draw(c, false);
        if (pts.length) dc.cur = pts[pts.length - 1];
        break;
      }
      case 91:
      case 8: {
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        const cmds = [];
        for (const c of counts) {
          const pts = type === 91 ? pts16(o, c) : pts32(o, c);
          cmds.push(...poly2(pts, true));
          o += c * (type === 91 ? 4 : 8);
        }
        draw(cmds, true);
        break;
      }
      case 90:
      case 7: {
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        for (const c of counts) {
          draw(poly2(type === 90 ? pts16(o, c) : pts32(o, c), false), false);
          o += c * (type === 90 ? 4 : 8);
        }
        break;
      }
      case 59:
        path = [];
        break;
      // BEGINPATH
      case 60:
        break;
      // ENDPATH
      case 61:
        path?.push({ op: "Z" });
        break;
      // CLOSEFIGURE
      case 62:
        if (path) emitPath(path, true, false);
        path = null;
        break;
      // FILLPATH
      case 63:
        if (path) emitPath(path, true, true);
        path = null;
        break;
      // STROKEANDFILLPATH
      case 64:
        if (path) emitPath(path, false, true);
        path = null;
        break;
      // STROKEPATH
      case 67:
      case 68:
        path = null;
        break;
      // SELECTCLIPPATH / ABORTPATH
      case 84: {
        const refX = i32(r + 28), refY = i32(r + 32);
        const nChars = u32(r + 36), offStr = u32(r + 40), offDx = u32(r + 64);
        const byGid = (u32(r + 44) & 16) !== 0;
        let text = "";
        for (let k = 0; k < nChars; k++) text += String.fromCharCode(u16(pos + offStr + k * 2));
        if (!byGid && !text.trim()) break;
        if (byGid && !nChars) break;
        const f = dc.font;
        const face = ctx.faces.get(f.face || "Arial", f.weight >= 600, f.italic);
        const fm = face.font.metrics;
        const cell = Math.abs(f.height) || 12;
        const emLog = f.height < 0 ? cell : cell * fm.unitsPerEm / Math.max(1, fm.usWinAscent + fm.usWinDescent);
        const emTw = lenTw(emLog);
        if (emTw < 1) break;
        const sizePt = emTw / 20;
        const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : refX, dc.textAlign & 1 ? dc.cur[1] : refY);
        const ascTw = (fm.usWinAscent || fm.ascender) / fm.unitsPerEm * emTw;
        const descTw = (fm.usWinDescent || -fm.descender) / fm.unitsPerEm * emTw;
        const va = dc.textAlign & 24;
        const baseY = va === 24 ? py : va === 8 ? py - descTw : py + ascTw;
        const dxs = [];
        const gidOf = (k) => byGid ? text.charCodeAt(k) : face.font.glyphId(text.charCodeAt(k));
        for (let k = 0; k < nChars; k++) dxs.push(offDx ? lenTw(i32(pos + offDx + k * 4)) : face.font.advanceWidth(gidOf(k)) * emTw / fm.unitsPerEm);
        const total = dxs.reduce((a, b) => a + b, 0);
        const ha = dc.textAlign & 6;
        let x = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
        const glyphs = [];
        for (let k = 0; k < nChars; k++) {
          glyphs.push({ cp: text.charCodeAt(k), x, ...byGid ? { gid: text.charCodeAt(k) } : {} });
          x += dxs[k];
        }
        out.push({ t: "glyphs", face, sizePt, color: dc.textColor, y: baseY, glyphs, text, ...byGid || rasterText ? { asPath: true } : {} });
        break;
      }
      case 76:
      case 77: {
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = cbBmi ? dib(pos + offBmi, cbBmi, pos + offBits, cbBits) : null;
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        else {
          const rop3 = u32(r + 32) >>> 16 & 255;
          if ((rop3 === 240 || rop3 === 0 || rop3 === 255) && dc.brush.style !== 1) out.push({ t: "rect", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), fill: dc.brush.color });
        }
        break;
      }
      case 114: {
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const alphaFmt = bytes[r + 35];
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits, alphaFmt === 1);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        break;
      }
      case 81: {
        const xd = i32(r + 16), yd = i32(r + 20);
        const offBmi = u32(r + 40), cbBmi = u32(r + 44), offBits = u32(r + 48), cbBits = u32(r + 52);
        const cx = i32(r + 64), cy = i32(r + 68);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: "image", x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img, ...y1 < y0 ? { flipV: true } : {} });
        break;
      }
    }
    pos += size;
  }
  void twipsPerDevPx;
  return out;
}
var EMF_PLUS = 726027589;
function emfRastersDest(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 0;
  for (let guard = 0; pos + 8 <= b.length && guard < 2e5; guard++) {
    const type = dv.getUint32(pos, true), size = dv.getUint32(pos + 4, true);
    if (size < 8 || pos + size > b.length || type === 14) break;
    const at = type === 76 || type === 77 ? 40 : type === 81 ? 68 : -1;
    const withBits = type === 81 || pos + 92 <= b.length && dv.getUint32(pos + 88, true) > 0;
    if (at >= 0 && withBits && pos + at + 4 <= b.length) {
      const rop3 = dv.getUint32(pos + at, true) >>> 16 & 255;
      const usesD = (rop3 & 170) >>> 1 !== (rop3 & 85), usesS = (rop3 & 204) >>> 2 !== (rop3 & 51);
      if (usesD && usesS) return true;
    }
    pos += size;
  }
  return false;
}
function emfPlusOnly(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 0;
  for (let guard = 0; pos + 16 <= b.length && guard < 64; guard++) {
    const type = dv.getUint32(pos, true), size = dv.getUint32(pos + 4, true);
    if (size < 8) return false;
    if (type === 70 && dv.getUint32(pos + 12, true) === EMF_PLUS && pos + 28 <= b.length) {
      return dv.getUint16(pos + 16, true) === 16385 && (dv.getUint16(pos + 18, true) & 1) === 0;
    }
    if (type !== 1) return false;
    pos += size;
  }
  return false;
}
var matMul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5]
];
function emfPlusBitmap(b, o, end) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (o + 20 > end) return null;
  const w = dv.getInt32(o, true), h = dv.getInt32(o + 4, true), stride = dv.getInt32(o + 8, true);
  const fmt2 = dv.getUint32(o + 12, true), kind = dv.getUint32(o + 16, true);
  const data = b.subarray(o + 20, end);
  if (kind === 1) {
    const ext = data[0] === 137 ? "png" : data[0] === 255 ? "jpeg" : data[0] === 71 ? "gif" : data[0] === 66 ? "bmp" : "tiff";
    return { data: data.slice(), ext, widthTwips: 0, heightTwips: 0 };
  }
  const bpp = fmt2 >>> 8 & 255;
  if (w <= 0 || h <= 0 || bpp !== 32 && bpp !== 24 || fmt2 & 65536 || stride * h > data.length) return null;
  const alpha = (fmt2 & 262144) !== 0, premul = (fmt2 & 524288) !== 0;
  const hdr = bpp === 32 ? 56 : 40;
  const rowOut = Math.ceil(w * bpp / 32) * 4;
  const bmp = new Uint8Array(14 + hdr + rowOut * h);
  const v = new DataView(bmp.buffer);
  bmp[0] = 66;
  bmp[1] = 77;
  v.setUint32(2, bmp.length, true);
  v.setUint32(10, 14 + hdr, true);
  v.setUint32(14, hdr, true);
  v.setInt32(18, w, true);
  v.setInt32(22, -h, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, bpp, true);
  if (bpp === 32) {
    v.setUint32(30, 3, true);
    v.setUint32(54, 16711680, true);
    v.setUint32(58, 65280, true);
    v.setUint32(62, 255, true);
    v.setUint32(66, alpha ? 4278190080 : 0, true);
  }
  for (let y = 0; y < h; y++) {
    const src = y * stride, dst = 14 + hdr + y * rowOut;
    bmp.set(data.subarray(src, src + Math.min(stride, rowOut)), dst);
    if (premul) {
      for (let k = dst; k < dst + w * 4; k += 4) {
        const a = bmp[k + 3];
        if (a > 0 && a < 255) for (let c = 0; c < 3; c++) bmp[k + c] = Math.min(255, Math.round(bmp[k + c] * 255 / a));
      }
    }
  }
  return { data: bmp, ext: "bmp", widthTwips: 0, heightTwips: 0 };
}
var EmfPlusPlayer = class {
  constructor(b, emit) {
    this.b = b;
    this.emit = emit;
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  b;
  emit;
  world = [1, 0, 0, 1, 0, 0];
  pageScale = 1;
  unit = 2;
  dpi = 96;
  saved = /* @__PURE__ */ new Map();
  images = /* @__PURE__ */ new Map();
  pending = null;
  dv;
  /** unidade de página → pixels */
  unitPx() {
    switch (this.unit) {
      case 3:
        return this.dpi / 72;
      case 4:
        return this.dpi;
      case 5:
        return this.dpi / 300;
      case 6:
        return this.dpi / 25.4;
      default:
        return 1;
    }
  }
  dev(x, y) {
    const m = this.world, k = this.pageScale * this.unitPx();
    return [(x * m[0] + y * m[2] + m[4]) * k, (x * m[1] + y * m[3] + m[5]) * k];
  }
  /** EmfPlusImage (só bitmap) */
  image(id, b, o, end) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (o + 16 > end || dv.getUint32(o + 4, true) !== 1) {
      this.images.set(id, { img: null, w: 0, h: 0 });
      return;
    }
    this.images.set(id, { img: emfPlusBitmap(b, o + 8, end), w: dv.getInt32(o + 8, true), h: dv.getInt32(o + 12, true) });
  }
  draw(id, srcUnit, src, p0, p1, p2) {
    const im = this.images.get(id);
    if (!im?.img) return;
    const [d0x, d0y] = this.dev(...p0), [d1x] = this.dev(...p1), [, d2y] = this.dev(...p2);
    let crop;
    if (srcUnit === 2 && im.w > 0 && im.h > 0) {
      const c = { l: src[0] / im.w, t: src[1] / im.h, r: 1 - (src[0] + src[2]) / im.w, b: 1 - (src[1] + src[3]) / im.h };
      if (Math.abs(c.l) > 1e-3 || Math.abs(c.t) > 1e-3 || Math.abs(c.r) > 1e-3 || Math.abs(c.b) > 1e-3) crop = c;
    }
    this.emit(im.img, d0x, d0y, d1x, d2y, crop);
  }
  play(start, end) {
    const dv = this.dv;
    let q = start;
    while (q + 12 <= end) {
      const type = dv.getUint16(q, true), flags = dv.getUint16(q + 2, true);
      const size = dv.getUint32(q + 4, true), dsz = dv.getUint32(q + 8, true);
      if (size < 12 || q + size > end) break;
      const d = q + 12, dEnd = Math.min(q + size, d + dsz);
      const f32 = (o) => dv.getFloat32(o, true);
      switch (type) {
        case 16385:
          this.dpi = dv.getUint32(d + 8, true) || 96;
          break;
        // cabeçalho
        case 16392: {
          const id = flags & 255;
          if ((flags >> 8 & 127) !== 5) break;
          if (flags & 32768) {
            const total = dv.getUint32(d, true);
            if (!this.pending || this.pending.id !== id) this.pending = { id, total, parts: [], got: 0 };
            const part = this.b.subarray(d + 4, dEnd);
            this.pending.parts.push(part);
            this.pending.got += part.length;
            if (this.pending.got >= total) {
              const all = new Uint8Array(this.pending.got);
              let o = 0;
              for (const p of this.pending.parts) {
                all.set(p, o);
                o += p.length;
              }
              this.pending = null;
              this.image(id, all, 0, all.length);
            }
          } else this.image(id, this.b, d, dEnd);
          break;
        }
        case 16410: {
          const id = flags & 255, srcUnit = dv.getInt32(d + 4, true);
          const src = [f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          const r = flags & 16384 ? [dv.getInt16(d + 24, true), dv.getInt16(d + 26, true), dv.getInt16(d + 28, true), dv.getInt16(d + 30, true)] : [f32(d + 24), f32(d + 28), f32(d + 32), f32(d + 36)];
          this.draw(id, srcUnit, src, [r[0], r[1]], [r[0] + r[2], r[1]], [r[0], r[1] + r[3]]);
          break;
        }
        case 16411: {
          const id = flags & 255, srcUnit = dv.getInt32(d + 4, true);
          const src = [f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          if (flags & 2048) break;
          const pt = (k) => flags & 16384 ? [dv.getInt16(d + 28 + k * 4, true), dv.getInt16(d + 30 + k * 4, true)] : [f32(d + 28 + k * 8), f32(d + 32 + k * 8)];
          this.draw(id, srcUnit, src, pt(0), pt(1), pt(2));
          break;
        }
        case 16426:
          this.world = [f32(d), f32(d + 4), f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          break;
        case 16427:
          this.world = [1, 0, 0, 1, 0, 0];
          break;
        case 16428:
        case 16429:
        case 16430:
        case 16431: {
          let m;
          if (type === 16428) m = [f32(d), f32(d + 4), f32(d + 8), f32(d + 12), f32(d + 16), f32(d + 20)];
          else if (type === 16429) m = [1, 0, 0, 1, f32(d), f32(d + 4)];
          else if (type === 16430) m = [f32(d), 0, 0, f32(d + 4), 0, 0];
          else {
            const a = f32(d) * Math.PI / 180;
            m = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
          }
          this.world = flags & 8192 ? matMul(this.world, m) : matMul(m, this.world);
          break;
        }
        case 16432:
          this.unit = flags & 255;
          this.pageScale = f32(d) || 1;
          break;
        case 16421:
          this.saved.set(dv.getUint32(d, true), { world: this.world, pageScale: this.pageScale, unit: this.unit });
          break;
        case 16422: {
          const s = this.saved.get(dv.getUint32(d, true));
          if (s) {
            this.world = s.world;
            this.pageScale = s.pageScale;
            this.unit = s.unit;
          }
          break;
        }
      }
      q += size;
    }
  }
};

// ../docx-layout/src/wmf.ts
var colorOf2 = (v) => [v & 255, v >> 8 & 255, v >> 16 & 255].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
var CP1252 = [8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 157, 382, 376];
function isWmf(b) {
  if (b.length < 40) return false;
  if (b[0] === 215 && b[1] === 205 && b[2] === 198 && b[3] === 154) return true;
  return (b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0;
}
function renderWmf(ctx, bytes, dest) {
  const out = [];
  if (!isWmf(bytes)) return out;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i16 = (o) => dv.getInt16(o, true);
  const u16 = (o) => dv.getUint16(o, true);
  const u32 = (o) => dv.getUint32(o, true);
  const placeable = bytes[0] === 215;
  let pos = placeable ? 22 : 0;
  const box = placeable ? [i16(6), i16(8), i16(10), i16(12)] : [0, 0, 1, 1];
  pos += u16(pos + 2) * 2;
  let dc = {
    org: [box[0], box[1]],
    ext: [box[2] - box[0] || 1, box[3] - box[1] || 1],
    pen: { style: 0, width: 0, color: "000000" },
    brush: { style: 0, color: "FFFFFF" },
    font: { height: -12, weight: 400, italic: false, face: "Arial", charset: 0 },
    textColor: "000000",
    textAlign: 0,
    cur: [0, 0]
  };
  const stack = [];
  const objs = [];
  const add = (o) => {
    const k = objs.indexOf(null);
    if (k >= 0) objs[k] = o;
    else objs.push(o);
  };
  const sx = () => dest.w / dc.ext[0], sy = () => dest.h / dc.ext[1];
  const toPage = (x, y) => [dest.x + (x - dc.org[0]) * sx(), dest.y + (y - dc.org[1]) * sy()];
  const stroke = (cmds, fill) => {
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : void 0;
    const st = dc.pen.style !== 5 ? { color: dc.pen.color, widthPt: Math.max(0.25, (Math.abs(dc.pen.width * sx()) || 0) / 20) } : void 0;
    if (cmds.length && (f || st)) out.push({ t: "path", cmds, ...f ? { fill: f } : {}, ...st ? { stroke: st } : {} });
  };
  const poly2 = (o, n, closed) => {
    const c = [];
    for (let k = 0; k < n; k++) {
      const [x, y] = toPage(i16(o + 4 * k), i16(o + 4 * k + 2));
      c.push({ op: k ? "L" : "M", x, y });
    }
    if (closed) c.push({ op: "Z" });
    return c;
  };
  const text = (x, y, raw, dx) => {
    const f = dc.font;
    const sym = f.charset === 2;
    let s = "";
    for (const b of raw) s += String.fromCharCode(sym ? 61440 + b : b >= 128 && b < 160 ? CP1252[b - 128] : b);
    if (!s.trim()) return;
    const face = ctx.faces.get(f.face || "Arial", f.weight >= 600, f.italic);
    const fm = face.font.metrics;
    const cell = Math.abs(f.height) || 12;
    const emLog = f.height < 0 ? cell : cell * fm.unitsPerEm / Math.max(1, fm.usWinAscent + fm.usWinDescent);
    const emTw = Math.abs(emLog * sy());
    if (emTw < 1) return;
    const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : x, dc.textAlign & 1 ? dc.cur[1] : y);
    const asc = (fm.usWinAscent || fm.ascender) / fm.unitsPerEm * emTw, desc = (fm.usWinDescent || -fm.descender) / fm.unitsPerEm * emTw;
    const va = dc.textAlign & 24;
    const baseY = va === 24 ? py : va === 8 ? py - desc : py + asc;
    const adv = Array.from(s, (ch, k) => dx ? Math.abs(dx(k) * sx()) : face.font.advanceWidth(face.font.glyphId(ch.charCodeAt(0))) * emTw / fm.unitsPerEm);
    const total = adv.reduce((a, b) => a + b, 0);
    const ha = dc.textAlign & 6;
    let gx = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
    const glyphs = [];
    for (let k = 0; k < s.length; k++) {
      glyphs.push({ cp: s.charCodeAt(k), x: gx });
      gx += adv[k];
    }
    out.push({ t: "glyphs", face, sizePt: emTw / 20, color: dc.textColor, y: baseY, glyphs, text: s });
    if (dc.textAlign & 1) dc.cur = [dc.cur[0] + total / sx(), dc.cur[1]];
  };
  while (pos + 6 <= bytes.length) {
    const size = u32(pos) * 2, fn = u16(pos + 4), p = pos + 6;
    if (fn === 0 || size < 6 || pos + size > bytes.length) break;
    switch (fn) {
      case 523:
        dc.org = [i16(p + 2), i16(p)];
        break;
      // SETWINDOWORG (y, x)
      case 524:
        dc.ext = [i16(p + 2) || 1, i16(p) || 1];
        break;
      // SETWINDOWEXT
      case 302:
        dc.textAlign = u16(p);
        break;
      case 521:
        dc.textColor = colorOf2(u32(p));
        break;
      case 30:
        stack.push({ ...dc });
        break;
      // SAVEDC
      case 295: {
        const k = i16(p);
        const s = k < 0 ? stack.splice(stack.length + k)[0] : void 0;
        if (s) dc = s;
        break;
      }
      // RESTOREDC
      case 762:
        add({ kind: "pen", pen: { style: u16(p), width: i16(p + 2), color: colorOf2(u32(p + 6)) } });
        break;
      case 764:
        add({ kind: "brush", brush: { style: u16(p), color: colorOf2(u32(p + 2)) } });
        break;
      case 763: {
        let face = "";
        for (let k = p + 18; k < Math.min(p + 50, pos + size) && bytes[k]; k++) face += String.fromCharCode(bytes[k]);
        add({ kind: "font", font: { height: i16(p), weight: i16(p + 8), italic: bytes[p + 10] !== 0, face, charset: bytes[p + 13] } });
        break;
      }
      case 247:
      case 322:
      case 505:
      case 1791:
        add({ kind: "other" });
        break;
      // paleta, pincel DIB, região
      case 301: {
        const o = objs[u16(p)];
        if (o?.kind === "pen") dc.pen = o.pen;
        else if (o?.kind === "brush") dc.brush = o.brush;
        else if (o?.kind === "font") dc.font = o.font;
        break;
      }
      case 496:
        if (u16(p) < objs.length) objs[u16(p)] = null;
        break;
      // DELETEOBJECT
      case 532:
        dc.cur = [i16(p + 2), i16(p)];
        break;
      // MOVETO (y, x)
      case 531: {
        const [x0, y0] = toPage(dc.cur[0], dc.cur[1]);
        dc.cur = [i16(p + 2), i16(p)];
        const [x1, y1] = toPage(dc.cur[0], dc.cur[1]);
        stroke([{ op: "M", x: x0, y: y0 }, { op: "L", x: x1, y: y1 }], false);
        break;
      }
      case 805:
        stroke(poly2(p + 2, i16(p), false), false);
        break;
      // POLYLINE
      case 804:
        stroke(poly2(p + 2, i16(p), true), true);
        break;
      // POLYGON
      case 1051: {
        const [x0, y0] = toPage(i16(p + 6), i16(p + 4)), [x1, y1] = toPage(i16(p + 2), i16(p));
        stroke([{ op: "M", x: x0, y: y0 }, { op: "L", x: x1, y: y0 }, { op: "L", x: x1, y: y1 }, { op: "L", x: x0, y: y1 }, { op: "Z" }], true);
        break;
      }
      case 1313: {
        const n = i16(p), o = p + 2 + (n + 1 & ~1);
        text(i16(o + 2), i16(o), bytes.subarray(p + 2, p + 2 + n), null);
        break;
      }
      case 2610: {
        const n = i16(p + 4), opt = u16(p + 6);
        const so = p + 8 + (opt & 6 ? 8 : 0);
        const dxo = so + (n + 1 & ~1);
        const hasDx = dxo + 2 * n <= pos + size;
        text(i16(p + 2), i16(p), bytes.subarray(so, so + n), hasDx ? (k) => i16(dxo + 2 * k) : null);
        break;
      }
    }
    pos += size;
  }
  return out;
}

// ../docx-layout/src/paint.ts
var lineSeq = 0;
function paintLine(ctx, out, line, frameX, top) {
  const baseY = top + line.baseline;
  const lineId = ++lineSeq;
  const all = [...line.marker ?? [], ...line.placed];
  for (const pg of all) {
    const st = pg.g.style;
    const fill = st.highlight ?? st.shading;
    if (!fill || pg.w <= 0 || pg.g.kind === "lb" || pg.g.kind === "pb") continue;
    const m = faceMetrics(pg.g.face.font);
    const asc = m.ascent * st.sizePt * 20, desc = m.descent * st.sizePt * 20;
    out.push({ t: "rect", x: frameX + pg.x, y: baseY - asc, w: pg.w, h: asc + desc, fill });
  }
  let run = null;
  let runKey = "";
  const flush = () => {
    if (run && run.glyphs.length) out.push(run);
    run = null;
    runKey = "";
  };
  for (const pg of all) {
    const g = pg.g;
    if (g.math) {
      flush();
      paintMath(out, g.math, frameX, pg.x, baseY, line, lineId);
      continue;
    }
    if (g.kind !== "char" && g.kind !== "nbsp" && !(g.kind === "shy" && pg.w > 0)) {
      if (g.kind === "space") continue;
      flush();
      if (g.kind === "tab" && pg.leader) paintLeader(ctx, out, pg, frameX, baseY, all);
      if (g.kind === "obj" && g.obj && g.adv > 0) paintInlineObject(ctx, out, g, frameX + pg.x, baseY);
      if (g.kind === "box" && g.box) paintCheckBox(out, g, frameX + pg.x, baseY);
      continue;
    }
    if (g.cp >= 65024 && g.cp <= 65039) continue;
    if (g.cp >= 8192 && g.cp <= 8202 || g.cp === 12288) continue;
    const st = g.style;
    if (st.alpha === 0 && !st.outline) {
      flush();
      continue;
    }
    const colr = !!g.face.font.hasColorGlyphs?.() && !!g.face.font.colorLayers?.(g.face.font.glyphId(g.cp));
    const key = `${g.face.key}|${g.face.synthBold ? 1 : 0}${g.face.synthItalic ? 1 : 0}|${g.sizePt}|${st.color}|${st.shift}|${st.rpr.w ?? 100}|${st.alpha ?? 1}|${colr ? "c" : ""}`;
    if (key !== runKey) {
      flush();
      runKey = key;
      run = {
        t: "glyphs",
        face: g.face,
        sizePt: g.sizePt,
        color: st.color,
        y: baseY - st.shift,
        glyphs: [],
        text: "",
        ...st.rpr.w && st.rpr.w !== 100 ? { scaleX: st.rpr.w / 100 } : {},
        ...g.face.synthBold ? { synthBold: true } : {},
        ...g.face.synthItalic ? { synthItalic: true } : {},
        ...st.alpha !== void 0 ? { alpha: st.alpha } : {},
        // semitransparente: o Word desenha CURVAS, não texto (oráculo hidetext/tf-alpha50)
        ...st.alpha !== void 0 && st.alpha > 0 && st.alpha < 1 ? { asPath: true } : {},
        lineBox: { asc: line.baseline - st.shift, desc: line.height - line.baseline + st.shift, lead: pg.x, line: lineId },
        ...colr ? { asPath: true, colr: true } : {}
      };
    }
    const cp = g.kind === "shy" ? 45 : g.cp;
    run.glyphs.push({ cp, x: frameX + pg.x });
    run.text += String.fromCodePoint(cp);
  }
  flush();
  paintDecorations(out, all, frameX, baseY, line);
}
function paintLeader(ctx, out, pg, frameX, baseY, all) {
  if (pg.w <= 0) return;
  const g = pg.g;
  const ch = pg.leader === "hyphen" ? "-" : pg.leader === "underscore" || pg.leader === "heavy" ? "_" : pg.leader === "middleDot" ? "\xB7" : ".";
  const cp = ch.codePointAt(0);
  const face = g.face;
  const f = face.font;
  const rpr = g.style.rpr;
  const emPx = Math.round(g.sizePt * 600 / 72);
  let step = Math.round(f.advanceWidth(f.glyphId(cp)) * emPx / f.metrics.unitsPerEm);
  if (rpr.spacing) step += Math.round(rpr.spacing / 2.4);
  const scale = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
  step = Math.round(step * scale);
  if (step <= 0) return;
  const fv = frameX / 2.4, ff = Math.floor(fv);
  const fx = Math.abs(fv - ff - 0.5) < 1e-6 ? ff + ff % 2 : Math.round(fv);
  const x0 = displayEnd(ctx, all, pg, fx), x1 = fx + Math.round((pg.x + pg.w) / 2.4);
  const run = {
    t: "glyphs",
    face,
    sizePt: g.sizePt,
    color: g.style.color,
    y: baseY - g.style.shift,
    glyphs: [],
    text: "",
    ...scale !== 1 ? { scaleX: scale } : {}
  };
  for (let k = Math.ceil(x0 / step); (k + 1) * step <= x1; k++) {
    run.glyphs.push({ cp, x: k * step * 2.4 });
    run.text += ch;
  }
  if (run.glyphs.length) out.push(run);
}
function displayEnd(ctx, all, tab, fx) {
  const i = all.indexOf(tab);
  let s = i;
  while (s > 0 && all[s - 1].g.kind !== "tab") s--;
  const st = ctx.fmt.settings;
  if (st.compatibilityMode < 15 && st.compat["useWord97LineBreakRules"] && fontOfSlot((s < i ? all[s] : tab).g.style.rpr.rFonts, "eastAsia", ctx.fmt.theme)) return fx + Math.round(tab.x / 2.4);
  const seg = (u2) => Math.floor((u2 * 8534 + 2097152) / 4194304);
  let px = fx + Math.round((s < i ? all[s].x : tab.x) / 2.4);
  let u = 0;
  for (let j = s; j < i; j++) {
    const w = Math.round(all[j].w / WORD_UNIT);
    if (u > 0 && (u + w) * 8534 + 2097152 >= 4294967296) {
      px += seg(u);
      u = 0;
    }
    u += w;
  }
  return px + seg(u);
}
function paintMath(out, box, frameX, x, baseY, line, lineId) {
  let run = null;
  let key = "";
  for (const it of box.items) {
    const k = `${it.face.key}|${it.sizePt}|${it.style.color}|${it.y}`;
    if (!run || k !== key) {
      if (run) out.push(run);
      key = k;
      run = {
        t: "glyphs",
        face: it.face,
        sizePt: it.sizePt,
        color: it.style.color,
        y: baseY + it.y,
        glyphs: [],
        text: "",
        lineBox: { asc: line.baseline + it.y, desc: line.height - line.baseline - it.y, lead: x + it.x, line: lineId }
      };
    }
    run.glyphs.push({ cp: it.cp, x: frameX + x + it.x });
    run.text += String.fromCodePoint(it.cp);
  }
  if (run) out.push(run);
  for (const r of box.rules) out.push({ t: "rect", x: frameX + x + r.x, y: baseY + r.y, w: r.w, h: r.h, fill: r.color });
}
function paintCheckBox(out, g, x, baseY) {
  const b = g.box;
  const top = baseY + 0.18 * (b.side / 1.07) - b.side;
  const w = Math.max(0.5, b.side / 20 / 16);
  const c = g.style.color;
  out.push({ t: "line", x1: x, y1: top, x2: x + b.side, y2: top, color: c, widthPt: w });
  out.push({ t: "line", x1: x, y1: top + b.side, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: "line", x1: x, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: "line", x1: x + b.side, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  if (b.checked) {
    out.push({ t: "line", x1: x, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
    out.push({ t: "line", x1: x + b.side, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  }
}
function paintInlineObject(ctx, out, g, x0, baseY0) {
  const obj = g.obj;
  const shift = g.style.shift;
  const ie = obj.image?.inlineEffect ?? obj.shape?.inlineEffect;
  const x = x0 + (ie?.l ?? 0), baseY = baseY0 - (ie?.b ?? 0);
  if (obj.image && isEmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: "clip", op: "push", ...r }, ...renderEmf(ctx, im.data, r), { t: "clip", op: "pop" });
  } else if (obj.image && isWmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: "clip", op: "push", ...r }, ...renderWmf(ctx, im.data, r), { t: "clip", op: "pop" });
  } else if (obj.image) {
    const im = obj.image;
    out.push({
      t: "image",
      x,
      y: baseY - shift - im.heightTwips,
      w: im.widthTwips,
      h: im.heightTwips,
      image: im,
      ...im.crop ? { crop: im.crop } : {},
      ...im.style?.rot ? { rot: im.style.rot } : {},
      ...im.style?.flipH ? { flipH: true } : {},
      ...im.style?.flipV ? { flipV: true } : {}
    });
  } else if (obj.shape) {
    const s = obj.shape;
    out.push({ t: "shape", x, y: baseY - shift - s.heightTwips, w: s.widthTwips, h: s.heightTwips, style: s.style });
  }
}
function paintDecorations(out, all, frameX, baseY, line) {
  const segs = (pred) => {
    const res = [];
    let cur = null;
    let lastContent = -1;
    all.forEach((pg, k) => {
      if (pg.g.kind !== "space" && pg.g.kind !== "lb" && pg.g.kind !== "pb") lastContent = k;
    });
    all.forEach((pg, k) => {
      const g = pg.g;
      const on = k <= lastContent && pred(g) && pg.w > 0 && g.kind !== "lb" && g.kind !== "pb";
      if (on && cur && cur.g.style === g.style && Math.abs(cur.x1 - (frameX + pg.x)) < 1) {
        cur.x1 = frameX + pg.x + pg.w;
      } else if (on) {
        if (cur) res.push(cur);
        cur = { x0: frameX + pg.x, x1: frameX + pg.x + pg.w, g };
      } else if (cur) {
        res.push(cur);
        cur = null;
      }
    });
    if (cur) res.push(cur);
    return res;
  };
  for (const s of segs((g) => !!g.style.underline && g.style.underline.val !== "none")) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const sz = st.sizePt * 20;
    const y = baseY - st.shift + m.underlinePos * sz;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    const color = st.underline.color ?? st.color;
    const val = st.underline.val;
    if (val === "words" && s.g.kind === "space") continue;
    const dash = val.startsWith("dotted") ? "dotted" : val.startsWith("dash") ? "dashed" : void 0;
    out.push({ t: "line", x1: s.x0, y1: y, x2: s.x1, y2: y, color, widthPt: val === "thick" ? w * 2 : w, ...dash ? { dash } : {} });
    if (val === "double") out.push({ t: "line", x1: s.x0, y1: y + w * 20 * 2, x2: s.x1, y2: y + w * 20 * 2, color, widthPt: w });
  }
  for (const s of segs((g) => g.style.strike || g.style.dstrike)) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const y = baseY - st.shift - m.ascent * st.sizePt * 20 * 0.3;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    out.push({ t: "line", x1: s.x0, y1: y, x2: s.x1, y2: y, color: st.color, widthPt: w });
    if (st.dstrike) out.push({ t: "line", x1: s.x0, y1: y - w * 40, x2: s.x1, y2: y - w * 40, color: st.color, widthPt: w });
  }
  void line;
}
var BORDER_SINGLE_LIKE = /* @__PURE__ */ new Set(["single", "thick", "dotted", "dashed", "dotDash", "dotDotDash", "hairline", "dashSmallGap"]);
function borderWidth(b) {
  if (!b || b.val === "none" || b.val === "nil") return 0;
  const tw = Math.floor(Math.max(1, b.sz ?? 4) * 2.5 + 1e-9);
  if (b.val === "double") return tw * 3;
  if (b.val === "thinThickSmallGap" || b.val === "thickThinSmallGap") return tw + 40;
  return tw;
}
function borderPaintWidth(b) {
  return Math.max(1, Math.floor(Math.max(2, b.sz ?? 4) * 25 / 24 + 1e-9)) * 2.4;
}
function paintBorder(ctx, out, b, x1, y1, x2, y2) {
  if (!b || b.val === "none" || b.val === "nil") return;
  const color = resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? "000000";
  const w = borderPaintWidth(b);
  const dash = b.val === "dotted" ? "dotted" : b.val === "dashed" || b.val === "dashSmallGap" ? "dashed" : b.val === "dotDash" ? "dashDot" : b.val === "dotDotDash" ? "dashDotDot" : void 0;
  if (dash) {
    out.push({ t: "line", x1, y1, x2, y2, color, widthPt: w / 20, dash });
    return;
  }
  if (x1 !== x2 && y1 !== y2) {
    out.push({ t: "line", x1, y1, x2, y2, color, widthPt: w / 20 });
    return;
  }
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const bands = b.val === "double" ? [[-1.5 * w, -0.5 * w], [0.5 * w, 1.5 * w]] : [[-0.5 * w, 0.5 * w]];
  for (const [a, z] of bands) {
    if (horizontal) out.push({ t: "rect", x: Math.min(x1, x2), y: y1 + a, w: Math.abs(x2 - x1), h: z - a, fill: color });
    else out.push({ t: "rect", x: x1 + a, y: Math.min(y1, y2), w: z - a, h: Math.abs(y2 - y1), fill: color });
  }
  void BORDER_SINGLE_LIKE;
}
function paintParaBox(ctx, out, p, pBdr, left, right, top, bottom, drawTop, drawBottom, between = false) {
  const fill = p.ppr.shd?.fill && p.ppr.shd.fill !== "auto" ? p.ppr.shd.fill : p.ppr.shd?.themeFill ? resolveColor({ themeColor: p.ppr.shd.themeFill, themeTint: p.ppr.shd.themeFillTint, themeShade: p.ppr.shd.themeFillShade }, ctx.fmt.theme) : void 0;
  const EXT = 29;
  const bl = pBdr?.left, br = pBdr?.right;
  const padL = bl && bl.val !== "none" && bl.val !== "nil" ? (bl.space ?? 0) * 20 : 0;
  const padR = br && br.val !== "none" && br.val !== "nil" ? (br.space ?? 0) * 20 : 0;
  const inL = left - EXT - padL, inR = right + EXT + padR;
  const shT = drawTop && pBdr?.top?.shadow ? borderWidth(pBdr.top) : 0;
  const shB = drawBottom && pBdr?.bottom?.shadow ? borderWidth(pBdr.bottom) : 0;
  const shR = br?.shadow ? borderWidth(br) : 0;
  const fTop = shT ? top + shT + borderWidth(pBdr.top) : top, fBot = shB ? bottom - shB - borderWidth(pBdr.bottom) : bottom;
  if (fill) out.push({ t: "rect", x: inL, y: fTop, w: inR - inL, h: fBot - fTop, fill });
  if (!pBdr) return;
  const outL = inL - borderWidth(bl), outR = inR + borderWidth(br);
  if (drawTop) {
    const y = top + shT + borderWidth(pBdr.top) / 2;
    paintBorder(ctx, out, pBdr.top, outL, y, outR, y);
  }
  if (between && pBdr.between && pBdr.between.val !== "none" && pBdr.between.val !== "nil") {
    const yb = top + (pBdr.between.space ?? 0) * 20 + borderWidth(pBdr.between) / 2;
    paintBorder(ctx, out, pBdr.between, outL, yb, outR, yb);
  }
  if (drawBottom) {
    const y = bottom - shB - borderWidth(pBdr.bottom) / 2;
    paintBorder(ctx, out, pBdr.bottom, outL, y, outR, y);
    if (shB) paintBorder(ctx, out, pBdr.bottom, outL + shB, bottom - shB / 2, outR + shB, bottom - shB / 2);
  }
  paintBorder(ctx, out, bl, inL - borderWidth(bl) / 2, top + shT, inL - borderWidth(bl) / 2, bottom - shB);
  paintBorder(ctx, out, br, inR + borderWidth(br) / 2, top + shT, inR + borderWidth(br) / 2, bottom - shB);
  if (shR) paintBorder(ctx, out, br, inR + borderWidth(br) + shR / 2, top + shT + shR, inR + borderWidth(br) + shR / 2, bottom);
}
function pageBorderItems(ctx, pb, g, surround) {
  const on = (b) => !!b && b.val !== "none" && b.val !== "nil";
  const lw = (b) => on(b) ? Math.max(0.25, (b.sz ?? 4) / 8) * 20 : 0;
  const thick = (b) => on(b) && b.val === "double" ? 3 * lw(b) : lw(b);
  const sp = (b) => (b?.space ?? 0) * 20;
  const page = pb.offsetFrom === "page";
  const top = page ? sp(pb.top) : (surround.header ? g.hdr : g.marT) - sp(pb.top) - thick(pb.top);
  const bottom = page ? g.pageH - sp(pb.bottom) : g.pageH - (surround.footer ? g.ftr : g.marB) + sp(pb.bottom) + thick(pb.bottom);
  const left = page ? sp(pb.left) : g.marL - sp(pb.left) - thick(pb.left);
  const right = page ? g.pageW - sp(pb.right) : g.pageW - g.marR + sp(pb.right) + thick(pb.right);
  const out = [];
  const color = (b) => resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? "000000";
  const bands = (b) => b.val === "double" ? [[0, lw(b)], [2 * lw(b), 3 * lw(b)]] : [[0, lw(b)]];
  if (on(pb.top)) for (const [a, z] of bands(pb.top)) out.push({ t: "rect", x: left, y: top + a, w: right - left, h: z - a, fill: color(pb.top) });
  if (on(pb.bottom)) for (const [a, z] of bands(pb.bottom)) out.push({ t: "rect", x: left, y: bottom - z, w: right - left, h: z - a, fill: color(pb.bottom) });
  if (on(pb.left)) for (const [a, z] of bands(pb.left)) out.push({ t: "rect", x: left + a, y: top, w: z - a, h: bottom - top, fill: color(pb.left) });
  if (on(pb.right)) for (const [a, z] of bands(pb.right)) out.push({ t: "rect", x: right - z, y: top, w: z - a, h: bottom - top, fill: color(pb.right) });
  return out;
}

// ../docx-layout/src/datefmt.ts
var PT = {
  months: ["janeiro", "fevereiro", "mar\xE7o", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  monthsShort: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  days: ["domingo", "segunda-feira", "ter\xE7a-feira", "quarta-feira", "quinta-feira", "sexta-feira", "s\xE1bado"],
  daysShort: ["dom", "seg", "ter", "qua", "qui", "sex", "s\xE1b"],
  date: "dd/MM/yyyy",
  time: "HH:mm"
};
var EN = {
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  date: "M/d/yyyy",
  time: "h:mm am/pm"
};
var pad = (n, w) => String(n).padStart(w, "0");
function formatWordDate(d, picture, lang = "pt-BR") {
  const L = lang.toLowerCase().startsWith("en") ? EN : PT;
  let out = "";
  let i = 0;
  const run = (ch) => {
    let n = 0;
    while (picture[i + n] === ch) n++;
    return n;
  };
  while (i < picture.length) {
    const c = picture[i];
    if (c === "'") {
      const j = picture.indexOf("'", i + 1);
      out += j < 0 ? picture.slice(i + 1) : picture.slice(i + 1, j);
      i = j < 0 ? picture.length : j + 1;
      continue;
    }
    const lower = picture.slice(i, i + 5).toLowerCase();
    if (lower === "am/pm") {
      const pm = d.getHours() >= 12;
      const s = pm ? "pm" : "am";
      out += picture[i] === "A" ? s.toUpperCase() : s;
      i += 5;
      continue;
    }
    if (c === "d" || c === "D") {
      const n = run(c);
      out += n >= 4 ? L.days[d.getDay()] : n === 3 ? L.daysShort[d.getDay()] : n === 2 ? pad(d.getDate(), 2) : String(d.getDate());
      i += n;
      continue;
    }
    if (c === "M") {
      const n = run(c);
      out += n >= 4 ? L.months[d.getMonth()] : n === 3 ? L.monthsShort[d.getMonth()] : n === 2 ? pad(d.getMonth() + 1, 2) : String(d.getMonth() + 1);
      i += n;
      continue;
    }
    if (c === "y" || c === "Y") {
      const n = run(c);
      out += n >= 3 ? String(d.getFullYear()) : pad(d.getFullYear() % 100, 2);
      i += n;
      continue;
    }
    if (c === "H") {
      const n = run(c);
      out += n >= 2 ? pad(d.getHours(), 2) : String(d.getHours());
      i += n;
      continue;
    }
    if (c === "h") {
      const n = run(c);
      const h = d.getHours() % 12 || 12;
      out += n >= 2 ? pad(h, 2) : String(h);
      i += n;
      continue;
    }
    if (c === "m") {
      const n = run(c);
      out += n >= 2 ? pad(d.getMinutes(), 2) : String(d.getMinutes());
      i += n;
      continue;
    }
    if (c === "s" || c === "S") {
      const n = run(c);
      out += n >= 2 ? pad(d.getSeconds(), 2) : String(d.getSeconds());
      i += n;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function dateFieldValue(instr, now, lang = "pt-BR") {
  const name = instr.trim().split(/\s+/)[0].toUpperCase();
  const L = lang.toLowerCase().startsWith("en") ? EN : PT;
  const m = /\\@\s*(?:"([^"]*)"|(\S+))/.exec(instr);
  const picture = m ? m[1] ?? m[2] ?? "" : name === "TIME" ? L.time : L.date;
  let v = formatWordDate(now, picture, lang);
  const fmt2 = /\\\*\s*(\w+)/g;
  let f;
  while (f = fmt2.exec(instr)) {
    const k = f[1].toLowerCase();
    if (k === "upper") v = v.toUpperCase();
    else if (k === "lower") v = v.toLowerCase();
    else if (k === "firstcap") v = v.charAt(0).toUpperCase() + v.slice(1);
    else if (k === "caps") v = v.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
  }
  return v;
}

// ../docx-layout/src/table.ts
function splitContent(c, availContent) {
  const nr = c.nest?.find((n) => n.top < availContent - 0.5 && n.top + n.row.height > availContent + 0.05);
  if (nr) {
    const parts = nr.row.split?.(availContent - nr.top) ?? null;
    if (parts && parts[0].height > 0) return splitAtNest(c, nr, parts);
    if (nr.top > 0.5) return splitContent(c, nr.top);
  }
  const paras = c.paras;
  const lastOf = /* @__PURE__ */ new Map();
  if (paras) {
    for (const l of c.lines) if (paras.has(l.ref)) lastOf.set(l.ref, l);
  }
  let cut = 0;
  for (const l of c.lines) {
    const bottom = l.y + l.height + (lastOf.get(l.ref) === l ? paras.get(l.ref).band ?? 0 : 0);
    const after = lastOf.get(l.ref) === l ? paras.get(l.ref).after : 0;
    if (bottom + after <= availContent + 0.05 && bottom > cut) cut = bottom;
  }
  if (cut > 0 && paras) cut = widowCut(c, paras, cut);
  if (cut > 0) cut = nestedRowCut(c, cut);
  if (cut <= 0) return null;
  let cutB = cut;
  if (paras) {
    let last, next = Infinity;
    for (const l of c.lines) {
      if (l.y + l.height <= cut + 0.5) {
        if (!last || l.y + l.height > last.y + last.height) last = l;
      } else next = Math.min(next, l.y);
    }
    if (last && lastOf.get(last.ref) === last) cutB = Math.min(cut + paras.get(last.ref).after, next);
  }
  const w = paras ? { paras } : {};
  const a = { items: [], lines: [], height: cut, ...w };
  const b = { items: [], lines: [], height: Math.max(0, c.height - cutB), ...w };
  const keyY = (it) => it.t === "line" ? Math.min(it.y1, it.y2) : it.t === "clip" ? it.y ?? 0 : it.t === "xform" ? it.m?.[5] ?? 0 : it.t === "path" ? Math.min(...it.cmds.map((c2) => c2.op === "Z" ? Infinity : c2.y)) : it.y;
  for (const it of c.items) {
    const y = it.t === "glyphs" ? it.y : keyY(it);
    if (y < cut) a.items.push(it);
    else b.items.push(shiftItem(it, -cutB));
  }
  for (const l of c.lines) {
    if (l.y < cut) a.lines.push(l);
    else b.lines.push({ ...l, y: l.y - cutB, baseline: l.baseline - cutB });
  }
  return [a, b];
}
function itemTop(it) {
  return it.t === "glyphs" ? it.y : it.t === "line" ? Math.min(it.y1, it.y2) : it.t === "clip" ? it.y ?? 0 : it.t === "xform" ? it.m?.[5] ?? 0 : it.t === "path" ? Math.min(...it.cmds.map((c) => c.op === "Z" ? Infinity : c.y)) : it.y;
}
function splitAtNest(c, nr, [p0, p1]) {
  const own3 = /* @__PURE__ */ new Set([...nr.items, ...nr.lines]);
  const end = nr.top + nr.row.height;
  const dy = p1.height - end;
  const w = c.paras ? { paras: c.paras } : {};
  const aItems = [], aLines = [], bItems = [], bLines = [];
  const moved = /* @__PURE__ */ new Map();
  for (const it of c.items) {
    if (own3.has(it)) continue;
    if (itemTop(it) < nr.top + 0.5) aItems.push(it);
    else {
      const s = shiftItem(it, dy);
      moved.set(it, s);
      bItems.push(s);
    }
  }
  for (const l of c.lines) {
    if (own3.has(l)) continue;
    if (l.y < nr.top + 0.5) aLines.push(l);
    else {
      const s = { ...l, y: l.y + dy, baseline: l.baseline + dy };
      moved.set(l, s);
      bLines.push(s);
    }
  }
  const p0Items = [...p0.items, ...p0.borderItems].map((it) => shiftItem(it, nr.top));
  aItems.push(...p0Items);
  aLines.push(...p0.lines.map((l) => ({ ...l, y: l.y + nr.top, baseline: l.baseline + nr.top })));
  const p1Items = [...p1.items, ...p1.borderItems];
  const p1Lines = p1.lines.map((l) => ({ ...l }));
  bItems.unshift(...p1Items);
  bLines.unshift(...p1Lines);
  const before = (c.nest ?? []).filter((n) => n.top + n.row.height <= nr.top + 0.5);
  const after = (c.nest ?? []).filter((n) => n.top >= end - 0.5).map((n) => ({
    top: n.top + dy,
    row: n.row,
    items: n.items.map((it) => moved.get(it) ?? it),
    lines: n.lines.map((l) => moved.get(l) ?? l)
  }));
  const a = { items: aItems, lines: aLines, height: nr.top + p0.height, ...w, ...before.length ? { nest: before } : {} };
  const b = { items: bItems, lines: bLines, height: Math.max(0, c.height - end) + p1.height, ...w, nest: [{ top: 0, row: p1, items: p1Items, lines: p1Lines }, ...after] };
  return [a, b];
}
function nestedRowCut(c, cut) {
  if (!c.lines.length) return cut;
  const segs = (r) => r.split("/");
  const base = Math.min(...c.lines.map((l) => segs(l.ref).length)) - 1;
  const rows = /* @__PURE__ */ new Map();
  for (const l of c.lines) {
    const s = segs(l.ref);
    if (s.length < base + 4) continue;
    const k = s.slice(0, base + 2).join("/");
    (rows.get(k) ?? rows.set(k, []).get(k)).push(l);
  }
  for (const ls of rows.values()) {
    const above = ls.filter((l) => l.y < cut);
    if (!above.length || above.length === ls.length) continue;
    const cells = new Set(ls.map((l) => segs(l.ref).slice(0, base + 3).join("/")));
    if (![...cells].some((ck) => !above.some((l) => l.ref.startsWith(ck + "/")))) continue;
    const top = Math.min(...ls.map((l) => l.y));
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= top + 0.5) prev = Math.max(prev, l.y + l.height);
    cut = Math.min(cut, prev, top);
  }
  return cut;
}
function widowCut(c, paras, cut) {
  const byRef = /* @__PURE__ */ new Map();
  for (const l of c.lines) (byRef.get(l.ref) ?? byRef.set(l.ref, []).get(l.ref)).push(l);
  let out = cut;
  for (const [ref, mine] of byRef) {
    const info = paras.get(ref);
    if (!info?.widow) continue;
    const n1 = mine.filter((l) => l.y + l.height <= cut + 0.5).length;
    if (n1 === 0 || n1 === mine.length) continue;
    const hasFirst = mine.length === info.lines;
    let keep = n1;
    if (keep === 1 && hasFirst) keep = 0;
    else if (mine.length - n1 === 1 && n1 >= 2) {
      keep--;
      if (keep === 1 && hasFirst) keep = 0;
    }
    if (keep === n1) continue;
    if (keep > 0) {
      out = Math.min(out, mine[keep - 1].y + mine[keep - 1].height);
      continue;
    }
    let prev = 0;
    for (const l of c.lines) if (l.y + l.height <= mine[0].y + 0.5) prev = Math.max(prev, l.y + l.height);
    out = Math.min(out, prev, mine[0].y);
  }
  return out;
}
var DEFAULT_LOOK = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };
function widthTw(w, base) {
  if (!w) return void 0;
  if (w.type === "dxa") return w.w;
  if (w.type === "pct") return base * w.w / 5e3;
  return void 0;
}
function boundaryWidths(cells, nCols, v, spread) {
  const byEnd = Array.from({ length: nCols + 1 }, () => []);
  const late = [];
  for (const row of cells) {
    for (const c of row) {
      const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
      if (e <= s) continue;
      if (e - s > 1 && spread?.(c)) late.push(c);
      else byEnd[e].push({ start: s, v: v(c) });
    }
  }
  const b = [0];
  for (let k = 1; k <= nCols; k++) {
    let m = b[k - 1];
    for (const c of byEnd[k]) m = Math.max(m, b[c.start] + c.v);
    b.push(m);
  }
  const w = b.slice(1).map((x, k) => x - b[k]);
  late.sort((a, z) => a.span - z.span);
  for (const c of late) {
    const s = Math.min(c.col, nCols), e = Math.min(nCols, c.col + c.span);
    const have = w.slice(s, e).reduce((a, x) => a + x, 0), need = v(c) - have;
    if (need <= 0) continue;
    for (let k = s; k < e; k++) w[k] = w[k] + (have > 0 ? need * w[k] / have : need / (e - s));
  }
  return w;
}
var prefOf = (w) => w && w.w > 0 && (w.type === "dxa" || w.type === "pct") ? w.type : "auto";
function fitPctMins(p, cells, minOf, colMin, pct) {
  for (let it = 0; it < 2 * p.length + 2; it++) {
    let worst, need = 1e-6;
    for (const c of cells) {
      if (!pct(c.col)) continue;
      const d = minOf(c) - p.slice(c.col, c.col + c.span).reduce((a, x) => a + x, 0);
      if (d > need) {
        need = d;
        worst = c;
      }
    }
    if (!worst) break;
    const s = worst.col, e = Math.min(p.length, worst.col + worst.span);
    const others = p.map((_, k) => k).filter((k) => (k < s || k >= e) && pct(k) && p[k] > colMin[k] + 1e-6);
    const have = p.slice(s, e).reduce((a, x) => a + x, 0);
    for (let k = s; k < e; k++) p[k] = p[k] + (have > 0 ? need * p[k] / have : need / (e - s));
    if (!others.length) continue;
    for (const k of others) p[k] = p[k] - need / others.length;
  }
}
function fixedMins(cells, w) {
  const out = [...w];
  const locked = /* @__PURE__ */ new Set();
  for (let it = 0; it < 4; it++) {
    let changed = false;
    for (const c of cells.flat()) {
      if (c.pad === void 0) continue;
      const cols = Array.from({ length: Math.max(0, Math.min(out.length, c.col + c.span) - c.col) }, (_, k) => c.col + k);
      if (!cols.length) continue;
      const have = cols.reduce((a, k) => a + out[k], 0);
      const need = c.pad + 20 - have;
      if (need <= 0.5) continue;
      const donors = out.map((_, k) => k).filter((k) => !cols.includes(k) && !locked.has(k));
      const pool = donors.reduce((a, k) => a + out[k], 0);
      if (pool <= need) continue;
      for (const k of cols) {
        out[k] = out[k] + (have > 0 ? need * out[k] / have : need / cols.length);
        locked.add(k);
      }
      for (const k of donors) out[k] = out[k] - need * out[k] / pool;
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}
function columnWidths(cells, nCols, docGrid, tblW, fixed, base, avail) {
  return columnWidthsExact(cells, nCols, docGrid, tblW, fixed, base, avail).map((x) => Math.round(x));
}
function columnWidthsExact(cells, nCols, docGrid, tblW, fixed, base, avail) {
  const tw = prefOf(tblW);
  const T0 = tw === "dxa" ? tblW.w : tw === "pct" ? base * tblW.w / 5e3 : void 0;
  const all = cells.flat();
  if (fixed) {
    const gridSum = (c) => docGrid.slice(c.col, c.col + c.span).reduce((a, b) => a + b, 0);
    const tRef = T0 ?? base;
    const w = boundaryWidths(cells, nCols, (c) => {
      const k = prefOf(c.tcW);
      return k === "dxa" ? c.tcW.w : k === "pct" ? tRef * c.tcW.w / 5e3 : gridSum(c);
    });
    const sum = w.reduce((a, b) => a + b, 0);
    return fixedMins(cells, T0 !== void 0 && sum > 0 ? w.map((x) => x * T0 / sum) : w);
  }
  const m = /* @__PURE__ */ new Map();
  for (const c of all) m.set(c, c.measure());
  const g1 = boundaryWidths(cells, nCols, (c) => m.get(c).min, () => true);
  const minOf = (c) => m.get(c).min;
  if (all.length && all.every((c) => prefOf(c.tcW) === "pct")) {
    const T3 = T0 ?? Math.min(Math.max(...all.map((c) => m.get(c).max * 5e3 / c.tcW.w)), avail);
    const p2 = boundaryWidths(cells, nCols, (c) => T3 * c.tcW.w / 5e3);
    let room = T3;
    for (let j = 0; j < nCols; j++) {
      p2[j] = Math.max(0, Math.min(p2[j], room));
      room -= p2[j];
    }
    fitPctMins(p2, all, minOf, g1, () => true);
    const sp = p2.reduce((a, b) => a + b, 0);
    const cap = T0 !== void 0 && T0 > base + 0.5 ? Infinity : Math.max(T3, base);
    if (sp > cap + 0.5) return p2.map((x) => x * cap / sp);
    return sp > 0 && T3 > sp + 0.5 ? p2.map((x) => x * T3 / sp) : p2;
  }
  const frac = Array.from({ length: nCols }, (_, j) => {
    const own3 = all.filter((c) => c.span === 1 && c.col === j);
    if (!own3.some((c) => prefOf(c.tcW) === "pct") || own3.some((c) => prefOf(c.tcW) === "dxa")) return 0;
    return Math.max(...own3.filter((c) => prefOf(c.tcW) === "pct").map((c) => c.tcW.w / 5e3));
  });
  const isPct = frac.map((f) => f > 0);
  const kind = (c, T3) => {
    const k = prefOf(c.tcW);
    if (k === "pct") return c.span === 1 && isPct[c.col] ? { k: "pct", w: 0 } : { k: "dxa", w: T3 * c.tcW.w / 5e3 };
    return { k, w: k === "dxa" ? c.tcW.w : 0 };
  };
  const sumOf = (v, pick) => v.reduce((a, x, j) => a + (pick(j) ? x : 0), 0);
  const gMax = boundaryWidths(cells, nCols, (c) => m.get(c).max, () => true);
  const g3of = (T3) => boundaryWidths(cells, nCols, (c) => {
    const q = kind(c, T3);
    return q.k === "dxa" ? Math.max(q.w, m.get(c).min) : m.get(c).min;
  }, (c) => kind(c, T3).k !== "dxa");
  const g4of = (T3) => boundaryWidths(cells, nCols, (c) => {
    const q = kind(c, T3), mm = m.get(c);
    return q.k === "dxa" ? Math.max(q.w, mm.min) : q.k === "auto" ? mm.max : mm.min;
  }, (c) => kind(c, T3).k !== "dxa");
  let T2 = T0;
  if (T2 === void 0) {
    const g42 = g4of(0);
    const rest = sumOf(g42, (j) => !isPct[j]);
    const fr = Math.min(1, frac.reduce((a, b) => a + b, 0));
    let t = rest;
    if (fr > 0) {
      for (let j = 0; j < nCols; j++) if (isPct[j]) t = Math.max(t, gMax[j] / frac[j]);
      if (fr < 1) t = Math.max(t, rest / (1 - fr));
    }
    T2 = Math.min(t, avail);
  }
  const explicit = T0 !== void 0;
  const p = new Array(nCols).fill(0);
  if (isPct.some(Boolean)) {
    let room = T2 - sumOf(g1, (j) => !isPct[j]);
    for (let j = 0; j < nCols; j++) if (isPct[j]) {
      p[j] = Math.max(0, Math.min(frac[j] * T2, room));
      room -= p[j];
    }
    fitPctMins(p, all.filter((c) => c.span === 1), minOf, g1, (k) => isPct[k]);
  }
  const np = (j) => !isPct[j];
  if (!isPct.some((x) => !x)) {
    const sp = sumOf(p, () => true);
    return sp > 0 && T2 > sp + 0.5 ? p.map((x) => x * T2 / sp) : p;
  }
  let R = T2 - sumOf(p, () => true);
  const g3 = g3of(T2), g4 = g4of(T2);
  const S1 = sumOf(g1, np), S3 = sumOf(g3, np), S4 = sumOf(g4, np);
  const lerp = (a, b, t) => a.map((x, j) => isPct[j] ? p[j] : x + (b[j] - x) * t);
  if (R >= S4 - 0.5) {
    const covered = (j) => all.some((c) => c.col <= j && c.col + c.span > j);
    const auto = Array.from({ length: nCols }, (_, j) => np(j) && covered(j) && !all.some((c) => c.col <= j && c.col + c.span > j && kind(c, T2).k !== "auto"));
    let grow = auto;
    if (!grow.some(Boolean)) grow = isPct.map((x, j) => !x && covered(j));
    const wsum = sumOf(g4, (j) => grow[j]);
    const n = grow.filter(Boolean).length;
    return g4.map((x, j) => isPct[j] ? p[j] : grow[j] ? x + (R - S4) * (wsum > 0 ? x / wsum : 1 / n) : x);
  }
  if (R >= S3) return lerp(g3, g4, (R - S3) / (S4 - S3));
  if (R >= S1) return lerp(g1, g3, S3 > S1 ? (R - S1) / (S3 - S1) : 0);
  if (all.some((c) => c.floor) && !isPct.some(Boolean) && !(explicit && T2 > avail) && S1 > avail + 0.5) {
    const pad2 = Array.from({ length: nCols }, (_, j) => Math.max(0, ...all.filter((c) => c.span === 1 && c.col === j).map((c) => c.pad ?? 0)));
    const inner = g1.map((x, j) => Math.max(0, x - pad2[j]));
    const si = inner.reduce((a, b) => a + b, 0), cut = S1 - avail;
    return g1.map((x, j) => x - (si > 0 ? cut * inner[j] / si : cut / nCols));
  }
  if (explicit) {
    if (!(S1 > avail + 0.5 && (tw === "pct" ? T2 <= avail + 0.5 : T2 < avail - 0.5))) return g3.map((x, j) => isPct[j] ? p[j] : x);
    R += avail - T2;
    T2 = avail;
  }
  const sg = docGrid.reduce((a, b) => a + b, 0);
  if (!isPct.some(Boolean) && Math.abs(sg - T2) <= Math.max(20, 5e-3 * T2)) return docGrid.map((x) => x * T2 / sg);
  return g1.map((x, j) => isPct[j] ? p[j] : S1 > 0 ? x * R / S1 : x);
}
function measureCell(ctx, cell, r, mar) {
  const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
  const env = { tablePPr: r.pPr, tableRPr: r.rPr };
  let min = 0, max = 0;
  ctx.pure(() => {
    for (const b of blocks) {
      if (b.type !== "paragraph") {
        const w2 = prefOf(b.tblPr?.tblW) === "dxa" ? b.tblPr.tblW.w : prefOf(b.tblPr?.tblW) === "pct" ? 0 : b.gridColsTwips.reduce((a, g) => a + g, 0);
        let nMin = 0;
        for (const row of b.rows) {
          let sum = 0;
          for (const c of row.cells) sum += measureCell(ctx, c, { pPr: {}, rPr: {} }, 216).min;
          nMin = Math.max(nMin, sum);
        }
        min = Math.max(min, prefOf(b.tblPr?.tblW) === "dxa" ? w2 : nMin);
        max = Math.max(max, w2);
        continue;
      }
      const w = paraContentWidths(prepareParagraph(ctx, b.paragraph, env), ctx.fmt.settings.defaultTabStop);
      const ow = anchoredWidth(ctx, b.paragraph);
      min = Math.max(min, w.min, ow);
      max = Math.max(max, w.max, ow);
    }
  });
  return { min: Math.max(6, Math.ceil(min - 1e-6)) + mar, max: Math.max(6, Math.ceil(max - 1e-6)) + mar };
}
function anchoredWidth(ctx, para) {
  let w = 0;
  for (const run of para.runs) {
    const t = run.image ?? run.shape ?? run.group ?? run.textbox;
    const anc = t?.anchor;
    if (!t?.floating || !anc || anc.wrap === "none" || anc.wrap === "inline" || anc.layoutInCell === false) continue;
    let ow = t.widthTwips;
    const tb = run.textbox;
    if (tb?.autoFit && tb.noWrap) {
      let tw = 0;
      for (const tp of tb.paras) tw = Math.max(tw, paraContentWidths(prepareParagraph(ctx, tp, {}), ctx.fmt.settings.defaultTabStop).max);
      ow = tw + (tb.insets?.l ?? 144) + (tb.insets?.r ?? 144);
    }
    w = Math.max(w, ow);
  }
  return w;
}
function paraContentWidths(p, defaultTab) {
  const tabs = p.tabs.filter((t) => t.val !== "bar").map((t) => t.pos).sort((a, b) => a - b);
  const dts = defaultTab > 0 ? defaultTab : 720;
  const nextTab2 = (x2) => {
    const t = tabs.find((pos) => pos > x2 + 0.5);
    if (p.firstLine < 0 && p.indLeft > x2 + 0.5 && (t === void 0 || p.indLeft < t)) return p.indLeft;
    if (t !== void 0) return t;
    return (Math.floor(Math.max(x2, tabs.length ? tabs[tabs.length - 1] : x2) / dts + 1e-6) + 1) * dts;
  };
  let x = p.indLeft + p.firstLine;
  if (p.marker) {
    x += p.marker.width;
    if (p.marker.suff === "tab") x = nextTab2(x);
    else if (p.marker.suff === "space") x += p.markStyle.sizePt * 5;
  }
  let end = x, max = 0, min = 0, seg = 0, first = true;
  const x0 = x;
  const flush = () => {
    if (seg > 0) min = Math.max(min, seg + Math.max(0, first ? x0 : p.indLeft) + p.indRight);
    if (seg > 0) first = false;
    seg = 0;
  };
  for (const g of p.glyphs) {
    if (g.kind === "pb" || g.kind === "cb") continue;
    if (g.kind === "lb") {
      flush();
      max = Math.max(max, end + p.indRight);
      x = p.indLeft;
      end = x;
      continue;
    }
    if (g.kind === "tab") {
      flush();
      x = nextTab2(x);
      continue;
    }
    x += g.adv;
    if (g.kind === "space") {
      flush();
      continue;
    }
    end = x;
    seg += g.adv;
    if (g.breakAfter) flush();
  }
  flush();
  max = Math.max(max, end + p.indRight);
  return { min, max };
}
function isHiddenRow(ctx, row) {
  if (!row.trPr?.hidden) return false;
  return row.cells.every((c) => (c.blocks ?? c.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }))).every((b) => {
    if (b.type !== "paragraph") return false;
    const v = paraVisibility(ctx, b.paragraph, {});
    return v.markHidden && !v.visible;
  }));
}
function layoutTable(ctx, table0, frameX, frameWidth, layoutCell, ref) {
  const table = table0.rows.some((r) => r.trPr?.hidden) ? { ...table0, rows: table0.rows.filter((r) => !isHiddenRow(ctx, r)) } : table0;
  const theme = ctx.fmt.theme;
  const direct = table.tblPr ?? {};
  const style = ctx.resolver.tableStyle(direct.tblStyle);
  const tblPr = mergeTblPr(style.tblPr, direct);
  const look = { ...DEFAULT_LOOK, ...direct.tblLook ?? style.tblPr.tblLook ?? {} };
  const defMar = style.hasStyle ? 0 : 108;
  const noVaSp = ctx.fmt.settings.compatibilityMode < 15 && !!ctx.fmt.settings.compat["doNotVertAlignCellWithSp"];
  const vaOf = (c, v) => noVaSp && c?.shape ? void 0 : v;
  const nRows = table.rows.length;
  const usedCols = Math.max(1, ...table.rows.map((r) => r.cells.reduce((s, c) => s + Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1), 0) + (r.trPr?.gridBefore ?? 0) + (r.trPr?.gridAfter ?? 0)));
  let docGrid = table.gridColsTwips.slice();
  if (!docGrid.length || docGrid.every((g) => g <= 0)) {
    const total = widthTw(tblPr.tblW, frameWidth) || frameWidth;
    docGrid = Array.from({ length: usedCols }, () => total / usedCols);
  } else if (docGrid.length < usedCols) {
    const avg = docGrid.reduce((a, b) => a + b, 0) / docGrid.length;
    while (docGrid.length < usedCols) docGrid.push(avg);
  }
  const nCols = docGrid.length;
  const slots = [];
  table.rows.forEach((row, ri) => {
    const rowSlots = [];
    let col = row.trPr?.gridBefore ?? 0;
    for (const cell of row.cells) {
      const tc = cell.tcPr ?? {};
      const span = Math.max(1, tc.gridSpan ?? cell.gridSpan ?? 1);
      rowSlots.push({ cell, col, span, row: ri, tcPr: tc, rowSpan: 1, merged: tc.vMerge === "continue" });
      col += span;
    }
    slots.push(rowSlots);
  });
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]) {
      if (s.tcPr.vMerge !== "restart") continue;
      let k = ri + 1;
      while (k < slots.length && slots[k].some((o) => o.col === s.col && o.merged)) k++;
      s.rowSpan = k - ri;
    }
  }
  const rowBand = Math.max(1, tblPr.tblStyleRowBandSize ?? 1);
  const colBand = Math.max(1, tblPr.tblStyleColBandSize ?? 1);
  const condFor = (ri, s) => {
    const out = ["wholeTable"];
    const firstRow = look.firstRow && ri === 0 || !!table.rows[ri]?.trPr?.tblHeader && look.firstRow;
    const lastRow = look.lastRow && ri === nRows - 1;
    const firstCol = look.firstColumn && s.col === 0;
    const lastCol = look.lastColumn && s.col + s.span >= nCols;
    if (!look.noVBand) {
      const c0 = s.col - (look.firstColumn ? 1 : 0);
      if (c0 >= 0 && !(lastCol && look.lastColumn)) out.push(Math.floor(c0 / colBand) % 2 === 0 ? "band1Vert" : "band2Vert");
    }
    if (!look.noHBand) {
      const r0 = ri - (look.firstRow ? 1 : 0);
      if (r0 >= 0 && !lastRow) out.push(Math.floor(r0 / rowBand) % 2 === 0 ? "band1Horz" : "band2Horz");
    }
    if (firstCol) out.push("firstCol");
    if (lastCol) out.push("lastCol");
    if (firstRow) out.push("firstRow");
    if (lastRow) out.push("lastRow");
    if (firstRow && firstCol) out.push("nwCell");
    if (firstRow && lastCol) out.push("neCell");
    if (lastRow && firstCol) out.push("swCell");
    if (lastRow && lastCol) out.push("seCell");
    return COND_ORDER.filter((t) => out.includes(t));
  };
  const resolved = /* @__PURE__ */ new Map();
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]) {
      let tcPr = style.tcPr;
      let pPr = style.pPr;
      let rPr = style.rPr;
      for (const c of condFor(ri, s)) {
        const part = style.cond[c];
        if (!part) continue;
        tcPr = mergeTcPr(tcPr, part.tcPr);
        pPr = mergePPr(pPr, part.pPr);
        rPr = mergeRPr(rPr, part.rPr);
      }
      resolved.set(s, { tcPr: mergeTcPr(tcPr, s.tcPr), pPr, rPr });
    }
  }
  const tblBorders = tblPr.tblBorders ?? {};
  const edge = (s, side) => {
    const own3 = resolved.get(s)?.tcPr.tcBorders?.[side];
    if (own3) return own3;
    const ex = table.rows[s.row]?.tblPrEx;
    const tb = ex?.tblBorders ? { ...tblBorders, ...ex.tblBorders } : tblBorders;
    const isOuter = side === "top" ? s.row === 0 : side === "bottom" ? s.row + s.rowSpan >= nRows : side === "left" ? s.col === 0 : s.col + s.span >= nCols;
    return isOuter ? tb[side] : side === "top" || side === "bottom" ? tb.insideH : tb.insideV;
  };
  const heavier = (a, b) => borderWidth(b) > borderWidth(a) ? b : a;
  const covering = (ri, c0, c1) => (slots[ri] ?? []).filter((o) => o.col < c1 && o.col + o.span > c0);
  const topWinner = (s) => {
    let w;
    if (s.row > 0) for (const u of covering(s.row - 1, s.col, s.col + s.span)) w = heavier(w, edge(u, "bottom"));
    return heavier(w, edge(s, "top"));
  };
  const band = [];
  for (let k = 0; k <= nRows; k++) {
    let m = 0;
    if (k === nRows) for (const s of slots[nRows - 1] ?? []) m = Math.max(m, borderWidth(edge(s, "bottom")));
    else for (const s of slots[k] ?? []) {
      if (!s.merged) m = Math.max(m, borderWidth(topWinner(s)));
      else for (const u of covering(k - 1, s.col, s.col + s.span)) m = Math.max(m, borderWidth(edge(u, "bottom")));
    }
    band.push(m);
  }
  const legacy = ctx.fmt.settings.compatibilityMode < 15 && !/\/r\d+\/c\d+/.test(ref);
  const row0 = slots[0] ?? [];
  const sFirst = row0[0], sLast = row0[row0.length - 1];
  const marOf = (s, side) => {
    const ex = table.rows[s.row]?.tblPrEx;
    const m = resolved.get(s)?.tcPr.tcMar?.[side] ?? ex?.tblCellMar?.[side] ?? tblPr.tblCellMar?.[side];
    return widthTw(m, frameWidth) ?? defMar;
  };
  const bL = sFirst ? borderWidth(edge(sFirst, "left")) : 0;
  const bR = sLast ? borderWidth(edge(sLast, "right")) : 0;
  const effL = sFirst ? Math.max(marOf(sFirst, "left"), bL / 2) : 108;
  const effR = sLast ? Math.max(marOf(sLast, "right"), bR / 2) : 108;
  const base = legacy ? frameWidth + effL + effR : frameWidth - (bL + bR) / 2;
  const spacingOf = (ri) => widthTw(table.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, frameWidth) ?? 0;
  const rawMeasure = /* @__PURE__ */ new Map();
  const padOf = (s) => ["left", "right"].reduce((a, side) => a + (spacingOf(s.row) > 0 ? marOf(s, side) : Math.max(marOf(s, side), borderWidth(edge(s, side)) / 2)), 0);
  const rawOf = (s) => {
    let mm = rawMeasure.get(s);
    if (!mm) rawMeasure.set(s, mm = measureCell(ctx, s.cell, resolved.get(s), padOf(s)));
    return mm;
  };
  const geoCells = slots.map((rs, ri) => {
    const sp = spacingOf(ri);
    const out = rs.map((s) => {
      const tcW0 = resolved.get(s)?.tcPr.tcW;
      const exSp = sp > 0 ? 2 * sp + (s.col === 0 ? sp : 0) + (s.col + s.span >= nCols ? sp : 0) : 0;
      const ex = sp > 0 ? exSp + borderWidth(edge(s, "left")) + borderWidth(edge(s, "right")) : 0;
      const tcW = tcW0 && exSp && prefOf(tcW0) === "dxa" ? { ...tcW0, w: tcW0.w + exSp } : tcW0;
      const nw = !!resolved.get(s)?.tcPr.noWrap;
      const noWrap = nw && prefOf(tcW0) !== "dxa";
      const floorW = nw && prefOf(tcW0) === "dxa" ? tcW0.w : 0;
      const tdir = resolved.get(s)?.tcPr.textDirection;
      const vertical = tdir === "btLr" || tdir === "tbRl" || tdir === "tbRlV";
      const measure = () => {
        if (vertical) {
          const rr = resolved.get(s);
          const c = ctx.pure(() => layoutCell(s.cell, 0, 31680, { tablePPr: rr.pPr, tableRPr: rr.rPr }, `${ref}/r${s.row}/c${s.col}`));
          const linesH = c.lines.reduce((a, l) => a + l.height, 0);
          const vh = c.lines.reduce((a, l) => a + Math.round(l.height * 37 / 36), 0) + Math.max(0, c.height - linesH);
          const w = vh + 6 + padOf(s);
          return { min: w + ex, max: w + ex };
        }
        const mm = rawOf(s);
        const fits = () => mm.max + rs.reduce((a, o) => a + (o === s ? 0 : rawOf(o).min), 0) <= base;
        const min = noWrap && fits() ? mm.max : Math.max(mm.min, floorW);
        return { min: min + ex, max: Math.max(mm.max, min) + ex };
      };
      return { col: s.col, span: s.span, ...tcW ? { tcW } : {}, measure, ...floorW ? { floor: true } : {}, pad: padOf(s) + ex };
    });
    const tr = table.rows[ri]?.trPr;
    if (tr?.gridBefore && tr.wBefore?.type === "dxa" && tr.wBefore.w > 0) out.unshift({ col: 0, span: tr.gridBefore, tcW: tr.wBefore, measure: () => ({ min: 0, max: 0 }) });
    const end = rs.length ? rs[rs.length - 1].col + rs[rs.length - 1].span : 0;
    if (tr?.gridAfter && tr.wAfter?.type === "dxa" && tr.wAfter.w > 0) out.push({ col: end, span: tr.gridAfter, tcW: tr.wAfter, measure: () => ({ min: 0, max: 0 }) });
    return out;
  });
  const floating = !!tblPr.tblpPr && tblPr.tblpPr.tblpYSpec !== "inline";
  const jc = floating ? void 0 : tblPr.jc ?? table.rows[0]?.trPr?.jc;
  const indent = floating || jc === "center" || jc === "right" || jc === "end" ? 0 : widthTw(tblPr.tblInd, frameWidth) ?? 0;
  const maxInd = legacy && jc === "center" && !floating ? widthTw(tblPr.tblInd, frameWidth) ?? 0 : indent;
  const grid = columnWidths(geoCells, nCols, docGrid, tblPr.tblW, tblPr.tblLayout === "fixed", base, base - maxInd);
  const width = grid.reduce((a, b) => a + b, 0);
  const colX = [0];
  for (const g of grid) colX.push(colX[colX.length - 1] + g);
  let x = frameX + indent + (legacy ? -effL : bL / 2);
  if (jc === "center") x = frameX + (frameWidth - width) / 2;
  else if (jc === "right" || jc === "end") x = frameX + frameWidth - width + (legacy ? effR : -bR / 2);
  const rowByRow = legacy && !floating && !!ctx.fmt.settings.compat["alignTablesRowByRow"];
  const rowShift = (ri) => {
    const rjc = table.rows[ri]?.trPr?.jc ?? jc;
    const rs = slots[ri] ?? [];
    if (!rowByRow || !rs.length || rjc !== "center" && rjc !== "right" && rjc !== "end") return 0;
    const c0 = colX[Math.min(rs[0].col, nCols)], c1 = colX[Math.min(rs[rs.length - 1].col + rs[rs.length - 1].span, nCols)];
    const want = rjc === "center" ? frameX + (frameWidth - (c1 - c0)) / 2 : frameX + frameWidth - (c1 - c0) + effR;
    return want - (x + c0);
  };
  const separated = !!tblPr.tblCellSpacing || table.rows.some((r) => !!r.trPr?.tblCellSpacing);
  const spRow = (ri) => widthTw(table.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, width) ?? 0;
  const spTbl = widthTw(tblPr.tblCellSpacing ?? table.rows.find((r) => r.trPr?.tblCellSpacing)?.trPr?.tblCellSpacing, width) ?? 0;
  const outerB = (ri, side) => table.rows[ri]?.tblPrEx?.tblBorders?.[side] ?? tblBorders[side];
  const sepTop = [], sepBottom = [], sepWT = [], sepWB = [];
  if (separated) {
    for (let ri = 0; ri < nRows; ri++) {
      const sp = spRow(ri);
      let wT = 0, wB = 0;
      for (const sl of slots[ri] ?? []) {
        wT = Math.max(wT, borderWidth(edge(sl, "top")));
        wB = Math.max(wB, borderWidth(edge(sl, "bottom")));
      }
      sepWT.push(wT);
      sepWB.push(wB);
      sepTop.push((ri === 0 ? borderWidth(outerB(0, "top")) + sp : 0) + sp + wT);
      sepBottom.push(wB + sp + (ri === nRows - 1 ? sp + borderWidth(outerB(ri, "bottom")) : 0));
    }
  }
  const bandTopOf = (ri) => separated ? sepTop[ri] : band[ri];
  const bandBottomOf = (ri) => separated ? sepBottom[ri] : ri === nRows - 1 ? band[nRows] : 0;
  const g0 = colX[0], gn = colX[nCols];
  const sepB = (i) => i <= 0 ? g0 + spTbl : i >= nCols ? gn - spTbl : colX[i];
  const rows = [];
  const pendingMerges = [];
  const maxLineW = (c) => c.lines.reduce((m, l) => Math.max(m, l.x + l.width), 0);
  const layoutVertical = (s, avail, env, cref) => {
    const natural = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 31680, env, cref)));
    if (natural <= avail + 0.5) return layoutCell(s.cell, 0, Math.max(1, avail), env, cref);
    const longest = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 1, env, cref)));
    return layoutCell(s.cell, 0, Math.max(1, avail, longest), env, cref);
  };
  const rowHeights = [];
  table.rows.forEach((row, ri) => {
    const ex = row.tblPrEx;
    const trp = { ...style.trPr, ...look.firstRow && ri === 0 ? style.cond.firstRow?.trPr : void 0, ...row.trPr };
    let contentH = 0;
    const cellInfos = [];
    const shiftR = rowShift(ri);
    for (const s of slots[ri]) {
      const { tcPr, pPr, rPr } = resolved.get(s);
      const bx0 = (separated ? sepB(Math.min(s.col, nCols)) + spTbl : colX[Math.min(s.col, nCols)]) + shiftR;
      const bx1 = (separated ? sepB(Math.min(s.col + s.span, nCols)) - spTbl : colX[Math.min(s.col + s.span, nCols)]) + shiftR;
      const x0r = bx0, x1r = bx1;
      const mar = { ...tblPr.tblCellMar ?? {}, ...ex?.tblCellMar ?? {}, ...tcPr.tcMar ?? {} };
      const marL = Math.max(widthTw(mar.left, width) ?? defMar, separated ? 0 : borderWidth(edge(s, "left")) / 2);
      const marR = Math.max(widthTw(mar.right, width) ?? defMar, separated ? 0 : borderWidth(edge(s, "right")) / 2);
      const marT = widthTw(mar.top, width) ?? 0;
      const marB = widthTw(mar.bottom, width) ?? 0;
      const wl = separated ? borderWidth(edge(s, "left")) : 0, wr = separated ? borderWidth(edge(s, "right")) : 0;
      const x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.max(wl - marL, wl / 2);
      const x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.max(wr - marR, wr / 2);
      const env = { tablePPr: pPr, tableRPr: rPr, ...isDark(cellFill(tcPr, theme)) ? { darkBackground: true } : {} };
      const vertical = tcPr.textDirection === "btLr" || tcPr.textDirection === "tbRl" || tcPr.textDirection === "tbRlV" ? tcPr.textDirection : void 0;
      const info = { slot: s, tcPr, x0, x1, bx0, bx1, marT, marB, marL, marR, env, ...vertical ? { vertical } : {} };
      if (!s.merged) {
        if (vertical) {
          if (s.rowSpan !== 1) pendingMerges.push({ slot: s, content: null, tcPr, x0, x1, startRow: ri, vertical, marL, marR, marT, marB, env });
        } else {
          const content = layoutCell(s.cell, x + x0 + marL, Math.max(1, x1 - x0 - marL - marR), { ...env, cellMar: { l: marL, r: marR, t: bandTopOf(ri) + marT } }, `${ref}/r${ri}/c${s.col}`);
          info.content = content;
          if (s.rowSpan === 1) contentH = Math.max(contentH, content.height + marT + marB);
          else pendingMerges.push({ slot: s, content, tcPr, x0, x1, startRow: ri, marL, marR, marT, marB, env });
        }
      }
      cellInfos.push(info);
    }
    const rowMarT = Math.max(0, ...cellInfos.map((ci) => ci.marT)), rowMarB = Math.max(0, ...cellInfos.map((ci) => ci.marB));
    for (const ci of cellInfos) {
      if (ci.marT === rowMarT && ci.marB === rowMarB) continue;
      ci.marT = rowMarT;
      ci.marB = rowMarB;
      if (ci.content && !ci.slot.merged && ci.slot.rowSpan === 1 && !ci.vertical) contentH = Math.max(contentH, ci.content.height + rowMarT + rowMarB);
    }
    for (const m of pendingMerges) if (m.startRow === ri) {
      m.marT = rowMarT;
      m.marB = rowMarB;
    }
    const th = row.trPr?.trHeight;
    let maxMar = 0, maxMarB = 0;
    for (const ci of cellInfos) {
      maxMar = Math.max(maxMar, ci.marT + ci.marB);
      maxMarB = Math.max(maxMarB, ci.marB);
    }
    for (const ci of cellInfos) {
      if (!ci.vertical || ci.slot.merged || ci.slot.rowSpan !== 1) continue;
      const rowMin = th ? th.val + (th.hRule === "exact" ? maxMarB : maxMar) : 0;
      const avail = Math.max(contentH, rowMin) - ci.marT - ci.marB;
      const c = layoutVertical(ci.slot, avail, ci.env, `${ref}/r${ri}/c${ci.slot.col}`);
      ci.content = c;
      if (th?.hRule !== "exact") contentH = Math.max(contentH, maxLineW(c) + ci.marT + ci.marB);
    }
    const rowKeepNext = cellInfos.some((ci) => ci.content?.keepNext);
    let h = contentH;
    if (th) {
      if (th.hRule === "exact") h = th.val;
      else h = Math.max(h, th.val + maxMar);
    }
    let minMarT = Infinity, ownTop = 0;
    for (const ci of cellInfos) {
      if (ci.slot.merged) continue;
      minMarT = Math.min(minMarT, ci.marT);
      ownTop = Math.max(ownTop, borderWidth(edge(ci.slot, "top")));
    }
    const absorb = !separated && ri > 0 && ownTop === 0 && Number.isFinite(minMarT);
    const bandTop = absorb ? Math.max(0, bandTopOf(ri) - minMarT) : bandTopOf(ri);
    if (th?.hRule === "exact") h = Math.max(0, th.val - bandTop) + maxMarB;
    if (h <= 0) h = 0;
    const bandBottom = bandBottomOf(ri);
    for (const m of pendingMerges) {
      if (th?.hRule === "exact") break;
      if (m.startRow + m.slot.rowSpan - 1 !== ri || !m.content) continue;
      const spanned = rowHeights.slice(m.startRow).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) + bandTop + h;
      const need = m.content.height + m.marT + m.marB;
      if (need > spanned) h += need - spanned;
    }
    rowHeights.push(bandTop + h + bandBottom);
    const paintRow = (ch, contents, vTop, drawTop, bTop, bBottom) => {
      const its = [];
      const lns = [];
      const brd = [];
      const brk = [];
      const rh = bTop + ch + bBottom;
      const mergeAt = [];
      if (separated) {
        const cy0 = bTop - sepWT[ri], cy1 = bTop + ch + (bBottom > 0 ? sepWB[ri] : 0);
        const tblFill = shdFill(tblPr.shd, theme);
        if (tblFill) {
          const xl2 = x + g0, xr2 = x + gn;
          const strip = (x0, y0, x1, y1) => {
            if (x1 - x0 > 0.01 && y1 - y0 > 0.01) its.push({ t: "rect", x: x0, y: y0, w: x1 - x0, h: y1 - y0, fill: tblFill });
          };
          strip(xl2, 0, xr2, cy0);
          strip(xl2, cy1, xr2, rh);
          let cx = xl2;
          for (const ci of [...cellInfos].sort((a, b) => a.bx0 - b.bx0)) {
            strip(cx, cy0, x + ci.bx0, cy1);
            cx = Math.max(cx, x + ci.bx1);
          }
          strip(cx, cy0, xr2, cy1);
        }
        for (const ci of cellInfos) {
          const s = ci.slot;
          if (s.merged) continue;
          const fill = cellFill(ci.tcPr, theme);
          const content = contents.get(s);
          if (fill) its.push({ t: "rect", x: x + ci.bx0, y: cy0, w: ci.bx1 - ci.bx0, h: cy1 - cy0, fill });
          if (s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
          if (s.rowSpan === 1) {
            if (content && ci.vertical) paintVertical(its, content, ci.vertical, vaOf(content, ci.tcPr.vAlign), x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
            else if (content) placeContent(its, lns, content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ch, ci.marT, ci.marB, bTop);
          }
          const bT = edge(s, "top"), bB = edge(s, "bottom"), bL2 = edge(s, "left"), bR2 = edge(s, "right");
          if (drawTop && bT) paintBorder(ctx, brd, bT, x + ci.bx0, cy0 + borderWidth(bT) / 2, x + ci.bx1, cy0 + borderWidth(bT) / 2);
          if (bBottom > 0 && bB) paintBorder(ctx, brd, bB, x + ci.bx0, cy1 - borderWidth(bB) / 2, x + ci.bx1, cy1 - borderWidth(bB) / 2);
          if (bL2) paintBorder(ctx, brd, bL2, x + ci.bx0 + borderWidth(bL2) / 2, cy0, x + ci.bx0 + borderWidth(bL2) / 2, cy1);
          if (bR2) paintBorder(ctx, brd, bR2, x + ci.bx1 - borderWidth(bR2) / 2, cy0, x + ci.bx1 - borderWidth(bR2) / 2, cy1);
        }
        const oL = outerB(ri, "left"), oR = outerB(ri, "right"), oT = outerB(ri, "top"), oB = outerB(ri, "bottom");
        const xl = x + g0, xr = x + gn;
        paintBorder(ctx, brd, oL, xl, 0, xl, rh);
        paintBorder(ctx, brd, oR, xr, 0, xr, rh);
        if (ri === 0 && drawTop) paintBorder(ctx, brd, oT, xl - borderWidth(oL) / 2, borderWidth(oT) / 2, xr + borderWidth(oR) / 2, borderWidth(oT) / 2);
        if (ri === nRows - 1 && bBottom > 0) paintBorder(ctx, brd, oB, xl - borderWidth(oL) / 2, rh - borderWidth(oB) / 2, xr + borderWidth(oR) / 2, rh - borderWidth(oB) / 2);
        return {
          height: rh,
          items: its,
          lines: lns,
          borderItems: brd,
          breakBorderItems: brk,
          cantSplit: !!trp.cantSplit,
          header: !!trp.tblHeader,
          ...mergeAt.length ? { mergeAt } : {},
          ...rowKeepNext ? { keepNext: true } : {},
          natural: bTop + Math.min(ch, contentH) + bBottom
        };
      }
      const topBrd = [], ownBrd = [];
      let ownBand = 0;
      for (const ci of cellInfos) {
        const s = ci.slot;
        const fill = cellFill(ci.tcPr, theme);
        const content = contents.get(s);
        if (!s.merged && s.rowSpan > 1) mergeAt.push({ col: s.col, at: its.length, endRow: ri + s.rowSpan - 1 });
        if (!s.merged && s.rowSpan === 1) {
          if (fill) its.push({ t: "rect", x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
          if (content && ci.vertical) paintVertical(its, content, ci.vertical, vaOf(content, ci.tcPr.vAlign), x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
          else if (content) placeContent(its, lns, content, vTop ? "top" : vaOf(content, ci.tcPr.vAlign), ch, ci.marT, ci.marB, bTop);
        }
        const tcb = ci.tcPr.tcBorders;
        const top = drawTop ? s.merged ? void 0 : topWinner(s) : edge(s, "top") ?? edge(s, "bottom");
        const nb = brd.length;
        if (top) paintBorder(ctx, brd, top, x + ci.x0, borderWidth(top) / 2, x + ci.x1, borderWidth(top) / 2);
        if (drawTop && ri > 0) {
          topBrd.push(...brd.slice(nb));
          const own3 = edge(s, "top");
          ownBand = Math.max(ownBand, borderWidth(own3));
          if (own3 && !s.merged) paintBorder(ctx, ownBrd, own3, x + ci.x0, borderWidth(own3) / 2, x + ci.x1, borderWidth(own3) / 2);
        }
        const bottom = edge(s, "bottom");
        const lastOfMerge = !slots[ri + 1]?.some((o) => o.col === s.col && o.merged);
        if (bBottom > 0) {
          const b = bottom ?? edge(s, "top");
          paintBorder(ctx, brd, b, x + ci.x0, rh - bBottom + borderWidth(b) / 2, x + ci.x1, rh - bBottom + borderWidth(b) / 2);
        } else if (lastOfMerge) {
          let w = bottom;
          for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, "top"));
          if (w) paintBorder(ctx, brk, w, x + ci.x0, rh + borderWidth(w) / 2, x + ci.x1, rh + borderWidth(w) / 2);
        }
        const left = edge(s, "left"), right = edge(s, "right");
        paintBorder(ctx, brd, left, x + ci.x0, 0, x + ci.x0, rh);
        paintBorder(ctx, brd, right, x + ci.x1, 0, x + ci.x1, rh);
        if (tcb?.tl2br) paintBorder(ctx, brd, tcb.tl2br, x + ci.x0, bTop, x + ci.x1, rh - bBottom);
        if (tcb?.tr2bl) paintBorder(ctx, brd, tcb.tr2bl, x + ci.x1, bTop, x + ci.x0, rh - bBottom);
      }
      return {
        height: rh,
        items: its,
        lines: lns,
        borderItems: brd,
        breakBorderItems: brk,
        cantSplit: !!trp.cantSplit,
        header: !!trp.tblHeader,
        ...mergeAt.length ? { mergeAt } : {},
        ...rowKeepNext ? { keepNext: true } : {},
        natural: bTop + Math.min(ch, contentH) + bBottom,
        ...drawTop && ri > 0 && bTop - ownBand > 0.5 ? { topCut: bTop - ownBand, topBorders: topBrd, ownTopBorders: ownBrd } : {}
      };
    };
    const full = new Map(cellInfos.map((ci) => [ci.slot, ci.content]));
    const canSplit = !trp.cantSplit && row.trPr?.trHeight?.hRule !== "exact";
    let brkW = 0;
    if (!separated) {
      for (const ci of cellInfos) {
        const s = ci.slot;
        if (slots[ri + 1]?.some((o) => o.col === s.col && o.merged)) continue;
        let w = edge(s, "bottom");
        for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, "top"));
        brkW = Math.max(brkW, borderWidth(w));
      }
    }
    const minRow = th && th.hRule !== "exact" ? bandTop + th.val + maxMar + bandBottom : 0;
    const build = (ch, contents, vTop, drawTop) => {
      const r = paintRow(ch, contents, vTop, drawTop, bandTop, bandBottom);
      if (brkW > 0 && ri < nRows - 1) r.breakW = brkW;
      if (!canSplit) return r;
      r.split = (avail) => {
        if (drawTop && minRow > avail + 0.5) return null;
        const a = /* @__PURE__ */ new Map();
        const rest = /* @__PURE__ */ new Map();
        let h1 = 0, h2 = 0, any = false;
        const availContent = avail - bandTop;
        for (const ci of cellInfos) {
          const c = contents.get(ci.slot);
          if (!c || ci.slot.merged || ci.slot.rowSpan !== 1) {
            a.set(ci.slot, c);
            continue;
          }
          const sp = splitContent(c, availContent - ci.marT - ci.marB - brkW);
          if (!sp) {
            if (c.lines.length) return null;
            rest.set(ci.slot, c);
            h2 = Math.max(h2, c.height + ci.marT + ci.marB);
            continue;
          }
          any = true;
          a.set(ci.slot, sp[0]);
          rest.set(ci.slot, sp[1]);
          h1 = Math.max(h1, sp[0].height + ci.marT + ci.marB);
          h2 = Math.max(h2, sp[1].height + ci.marT + ci.marB);
        }
        if (!any) return null;
        const first = paintRow(h1, a, false, drawTop, bandTop, 0);
        first.borderItems.push(...first.breakBorderItems ?? []);
        first.breakBorderItems = [];
        return [first, build(Math.max(h2, 1, th && th.hRule !== "exact" ? th.val + maxMar : 0), rest, false, false)];
      };
      return r;
    };
    rows.push(build(h, full, false, true));
  });
  for (const m of pendingMerges) {
    const endRow = m.startRow + m.slot.rowSpan - 1;
    const h = rowHeights.slice(m.startRow, endRow + 1).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) - bandBottomOf(endRow);
    const first = rows[m.startRow];
    const target = rows[endRow] ?? first;
    const fill = cellFill(m.tcPr, theme);
    if (fill) {
      const item = { t: "rect", x: x + m.x0, y: 0, w: m.x1 - m.x0, h, fill };
      first.items.unshift(item);
      for (const a of first.mergeAt ?? []) a.at++;
      if (!first.header) (first.mergeFills ??= []).push({ item, end: endRow });
    }
    const { marT, marB } = m;
    const top = bandTopOf(m.startRow) - rowHeights.slice(m.startRow, Math.min(endRow, rows.length - 1)).reduce((a, b) => a + b, 0);
    if (m.vertical) {
      const c = layoutVertical(m.slot, h - marT - marB, m.env, `${ref}/r${m.startRow}/c${m.slot.col}`);
      paintVertical(target.items, c, m.vertical, vaOf(c, m.tcPr.vAlign), x + m.x0 + m.marL, x + m.x1 - m.marR, top + marT, top + h - marB);
    } else if (m.content) {
      const i0 = target.items.length, l0 = target.lines.length;
      placeContent(target.items, target.lines, m.content, vaOf(m.content, m.tcPr.vAlign), h, marT, marB, top);
      if (target !== first) (target.mergeText ??= []).push({ col: m.slot.col, items: target.items.slice(i0), lines: target.lines.slice(l0), dy: rowHeights.slice(m.startRow, endRow).reduce((a, b) => a + b, 0), start: m.startRow, content: m.content, marT, band: bandTopOf(m.startRow), ...vaOf(m.content, m.tcPr.vAlign) ? { vAlign: vaOf(m.content, m.tcPr.vAlign) } : {} });
    }
  }
  const borderLeft = slots[0]?.[0] ? borderWidth(edge(slots[0][0], "left")) : 0;
  return { x, width, rows, borderLeft, ...legacy ? { effR } : {}, ...tblPr.tblpPr ? { tblpPr: tblPr.tblpPr } : {} };
}
function cellFill(tcPr, theme) {
  return shdFill(tcPr.shd, theme);
}
function shdFill(shd, theme) {
  if (!shd) return void 0;
  if (shd.val === "solid") return resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? "000000";
  const fill = shd.themeFill ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, theme) : shd.fill && shd.fill !== "auto" ? shd.fill.toUpperCase() : void 0;
  if (shd.val && /^pct(\d+)$/.test(shd.val)) {
    const pct = parseInt(shd.val.slice(3), 10) / 100;
    const fg = resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? "000000";
    const bg = fill ?? "FFFFFF";
    const mix = (i) => Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - pct) + parseInt(fg.slice(i, i + 2), 16) * pct);
    return [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return fill;
}
function paintVertical(items, c, dir, vAlign, left, right, top, bottom) {
  const free = right - left - c.height;
  const off = vAlign === "center" ? free / 2 : vAlign === "bottom" ? free : 0;
  const m = dir === "btLr" ? [0, -1, 1, 0, left, bottom] : [0, 1, -1, 0, right, top];
  items.push({ t: "xform", op: "push", m });
  for (const it of c.items) items.push(shiftItem(it, Math.max(0, off)));
  items.push({ t: "xform", op: "pop" });
}
function placeContent(items, lines, c, vAlign, rowH, marT, marB, y0 = 0) {
  if (!c) return;
  let dy = y0 + marT;
  const free = rowH - marT - marB - (c.alignH ?? c.height);
  if (vAlign === "center" && free > 0) dy += free / 2;
  else if (vAlign === "bottom" && free > 0) dy += free;
  for (const it of c.items) items.push(shiftItem(it, dy));
  for (const l of c.lines) lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
}
function mergeTextFirst(rows, ri, row, moved, fits) {
  if (!row.mergeAt?.length) return row;
  let items = row.items, lines = row.lines;
  for (const m of [...row.mergeAt].sort((a, b) => b.at - a.at || b.col - a.col)) {
    const mt = rows[m.endRow]?.mergeText?.find((x) => x.col === m.col);
    if (!mt || !fits(rows.slice(ri, m.endRow + 1).reduce((a, r) => a + r.height, 0))) continue;
    if (items === row.items) {
      items = [...items];
      lines = [...lines];
    }
    const dy = mt.dy - (row.cut ?? 0);
    items.splice(m.at, 0, ...mt.items.map((it) => shiftItem(it, dy)));
    lines.push(...mt.lines.map((l) => ({ ...l, y: l.y + dy, baseline: l.baseline + dy })));
    for (const o of [...mt.items, ...mt.lines]) moved.add(o);
  }
  return items === row.items ? row : { ...row, items, lines };
}
function atPageTop(row) {
  const d = row.topCut ?? 0;
  if (d <= 0) return row;
  const h = row.height;
  const top = new Set(row.topBorders ?? []);
  const keep = new Set((row.mergeText ?? []).flatMap((m) => [...m.items, ...m.lines]));
  const cut = (it) => keep.has(it) ? it : it.t === "rect" && it.y === 0 ? { ...it, h: it.h - d } : it.t === "line" && it.y1 === 0 && it.y2 === h ? { ...it, y2: h - d } : shiftItem(it, -d);
  const { split: _s, topCut: _t, topBorders: _b, ownTopBorders: _o, ...rest } = row;
  const items = row.items.map(cut);
  return {
    ...rest,
    height: h - d,
    cut: d,
    items,
    ...row.mergeFills ? { mergeFills: row.mergeFills.map((f) => ({ ...f, item: items[row.items.indexOf(f.item)] })) } : {},
    lines: row.lines.map((l) => keep.has(l) ? l : { ...l, y: l.y - d, baseline: l.baseline - d }),
    borderItems: [...row.borderItems.filter((it) => !top.has(it)).map(cut), ...row.ownTopBorders ?? []],
    ...row.breakBorderItems ? { breakBorderItems: row.breakBorderItems.map((it) => shiftItem(it, -d)) } : {},
    ...row.natural !== void 0 ? { natural: row.natural - d } : {}
  };
}
function dropMoved(row, moved) {
  if (!moved.size || !row.mergeText) return row;
  return { ...row, items: row.items.filter((it) => !moved.has(it)), lines: row.lines.filter((l) => !moved.has(l)) };
}
var LATE_ITEMS = /* @__PURE__ */ new WeakMap();
function shiftItem(it, dy, dx = 0) {
  const out = shiftItem0(it, dy, dx);
  const m = out !== it ? LATE_ITEMS.get(it) : void 0;
  if (m) LATE_ITEMS.set(out, m);
  return out;
}
function shiftItem0(it, dy, dx) {
  switch (it.t) {
    case "glyphs":
      return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ ...g, x: g.x + dx })) : it.glyphs };
    case "rect":
    case "image":
    case "shape":
      return { ...it, x: it.x + dx, y: it.y + dy };
    case "line":
      return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case "clip":
      return it.y === void 0 ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    case "xform": {
      if (!it.m) return it;
      const [a, b, c, d, e, f] = it.m;
      return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] };
    }
    case "path":
      return { ...it, cmds: it.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy }) };
  }
}

// ../docx-layout/src/geometry.ts
var K2 = 0.5522847498;
function arcTo(out, cur, wR, hR, stDeg, swDeg) {
  const st = stDeg * Math.PI / 180, sw = swDeg * Math.PI / 180;
  const cx = cur[0] - wR * Math.cos(st), cy = cur[1] - hR * Math.sin(st);
  const n = Math.max(1, Math.ceil(Math.abs(swDeg) / 90 - 1e-9));
  const d = sw / n, k = 4 / 3 * Math.tan(d / 4);
  let a = st, x = cur[0], y = cur[1];
  for (let i = 0; i < n; i++) {
    const b = a + d;
    const x2 = cx + wR * Math.cos(b), y2 = cy + hR * Math.sin(b);
    out.push({
      op: "C",
      x1: x - k * wR * Math.sin(a),
      y1: y + k * hR * Math.cos(a),
      x2: x2 + k * wR * Math.sin(b),
      y2: y2 - k * hR * Math.cos(b),
      x: x2,
      y: y2
    });
    a = b;
    x = x2;
    y = y2;
  }
  return [x, y];
}
var poly = (pts, close = true) => {
  const out = pts.map(([x, y], i) => ({ op: i ? "L" : "M", x, y }));
  if (close) out.push({ op: "Z" });
  return out;
};
var pin = (lo, v, hi) => Math.max(lo, Math.min(hi, v));
function presetPathLocal(prst, w, h, adj = {}) {
  const ss = Math.min(w, h), hc = w / 2, vc = h / 2;
  const av = (name, def) => adj[name] ?? (name === "adj1" && adj["adj"] !== void 0 ? adj["adj"] : def);
  switch (prst) {
    case "triangle": {
      const a = pin(0, av("adj", 5e4), 1e5);
      return poly([[0, h], [w * a / 1e5, 0], [w, h]]);
    }
    case "rtTriangle":
      return poly([[0, 0], [w, h], [0, h]]);
    case "diamond":
      return poly([[0, vc], [hc, 0], [w, vc], [hc, h]]);
    case "parallelogram": {
      const a = pin(0, av("adj", 25e3), 1e5 * w / ss), x2 = ss * a / 1e5;
      return poly([[0, h], [x2, 0], [w, 0], [w - x2, h]]);
    }
    case "trapezoid": {
      const a = pin(0, av("adj", 25e3), 5e4 * w / ss), x2 = ss * a / 1e5;
      return poly([[0, h], [x2, 0], [w - x2, 0], [w, h]]);
    }
    case "homePlate": {
      const a = pin(0, av("adj", 5e4), 1e5 * w / ss), x1 = w - ss * a / 1e5;
      return poly([[0, 0], [x1, 0], [w, vc], [x1, h], [0, h]]);
    }
    case "chevron": {
      const a = pin(0, av("adj", 5e4), 1e5 * w / ss), x1 = ss * a / 1e5;
      return poly([[0, 0], [w - x1, 0], [w, vc], [w - x1, h], [0, h], [x1, vc]]);
    }
    case "hexagon": {
      const a = pin(0, av("adj", 25e3), 5e4 * w / ss), x1 = ss * a / 1e5;
      const dy1 = h / 2 * (av("vf", 115470) / 1e5) * Math.sin(Math.PI / 3);
      return poly([[0, vc], [x1, vc - dy1], [w - x1, vc - dy1], [w, vc], [w - x1, vc + dy1], [x1, vc + dy1]]);
    }
    case "octagon": {
      const x1 = ss * pin(0, av("adj", 29289), 5e4) / 1e5;
      return poly([[0, x1], [x1, 0], [w - x1, 0], [w, x1], [w, h - x1], [w - x1, h], [x1, h], [0, h - x1]]);
    }
    case "rightArrow":
    case "leftArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 1e5 * w / ss);
      const dx = ss * a2 / 1e5, dy1 = h * a1 / 2e5, y1 = vc - dy1, y2 = vc + dy1;
      if (prst === "rightArrow") {
        const x1 = w - dx;
        return poly([[0, y1], [x1, y1], [x1, 0], [w, vc], [x1, h], [x1, y2], [0, y2]]);
      }
      return poly([[0, vc], [dx, 0], [dx, y1], [w, y1], [w, y2], [dx, y2], [dx, h]]);
    }
    case "upArrow":
    case "downArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 1e5 * h / ss);
      const dy = ss * a2 / 1e5, dx1 = w * a1 / 2e5, x1 = hc - dx1, x2 = hc + dx1;
      if (prst === "downArrow") {
        const y1 = h - dy;
        return poly([[0, y1], [x1, y1], [x1, 0], [x2, 0], [x2, y1], [w, y1], [hc, h]]);
      }
      return poly([[0, dy], [hc, 0], [w, dy], [x2, dy], [x2, h], [x1, h], [x1, dy]]);
    }
    // setas duplas (presetShapeDefinitions; corpus t15: forma 70 de .doc)
    case "upDownArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 5e4 * h / ss);
      const y2 = ss * a2 / 1e5, y3 = h - y2, dx1 = w * a1 / 2e5, x1 = hc - dx1, x2 = hc + dx1;
      return poly([[0, y2], [hc, 0], [w, y2], [x2, y2], [x2, y3], [w, y3], [hc, h], [0, y3], [x1, y3], [x1, y2]]);
    }
    case "leftRightArrow": {
      const a1 = pin(0, av("adj1", 5e4), 1e5), a2 = pin(0, av("adj2", 5e4), 5e4 * w / ss);
      const x2 = ss * a2 / 1e5, x3 = w - x2, dy = h * a1 / 2e5, y1 = vc - dy, y2 = vc + dy;
      return poly([[0, vc], [x2, 0], [x2, y1], [x3, y1], [x3, 0], [w, vc], [x3, h], [x3, y2], [x2, y2], [x2, h]]);
    }
    case "ellipse": {
      const rx = w / 2, ry = h / 2;
      return [
        { op: "M", x: w, y: vc },
        { op: "C", x1: w, y1: vc + ry * K2, x2: hc + rx * K2, y2: h, x: hc, y: h },
        { op: "C", x1: hc - rx * K2, y1: h, x2: 0, y2: vc + ry * K2, x: 0, y: vc },
        { op: "C", x1: 0, y1: vc - ry * K2, x2: hc - rx * K2, y2: 0, x: hc, y: 0 },
        { op: "C", x1: hc + rx * K2, y1: 0, x2: w, y2: vc - ry * K2, x: w, y: vc },
        { op: "Z" }
      ];
    }
    case "roundRect": {
      const r = ss * pin(0, av("adj", 16667), 5e4) / 1e5;
      const out = [{ op: "M", x: 0, y: r }];
      let c = arcTo(out, [0, r], r, r, 180, 90);
      out.push({ op: "L", x: w - r, y: 0 });
      c = arcTo(out, [w - r, 0], r, r, 270, 90);
      out.push({ op: "L", x: w, y: h - r });
      c = arcTo(out, [w, h - r], r, r, 0, 90);
      out.push({ op: "L", x: r, y: h });
      arcTo(out, [r, h], r, r, 90, 90);
      void c;
      out.push({ op: "Z" });
      return out;
    }
    case "round2SameRect": {
      const t = ss * pin(0, av("adj1", 16667), 5e4) / 1e5, b = ss * pin(0, av("adj2", 0), 5e4) / 1e5;
      const out = [{ op: "M", x: t, y: 0 }, { op: "L", x: w - t, y: 0 }];
      arcTo(out, [w - t, 0], t, t, 270, 90);
      out.push({ op: "L", x: w, y: h - b });
      arcTo(out, [w, h - b], b, b, 0, 90);
      out.push({ op: "L", x: b, y: h });
      arcTo(out, [b, h], b, b, 90, 90);
      out.push({ op: "L", x: 0, y: t });
      arcTo(out, [0, t], t, t, 180, 90);
      out.push({ op: "Z" });
      return out;
    }
    case "frame": {
      const x1 = ss * pin(0, av("adj1", 12500), 5e4) / 1e5;
      return [...poly([[0, 0], [w, 0], [w, h], [0, h]]), ...poly([[x1, x1], [x1, h - x1], [w - x1, h - x1], [w - x1, x1]])];
    }
    case "bentConnector3": {
      const x1 = w * av("adj1", 5e4) / 1e5;
      return poly([[0, 0], [x1, 0], [x1, h], [w, h]], false);
    }
    case "line":
    case "straightConnector1":
      return poly([[0, 0], [w, h]], false);
    default:
      return poly([[0, 0], [w, 0], [w, h], [0, h]]);
  }
}
var OPEN_PRESETS = /* @__PURE__ */ new Set(["line", "straightConnector1", "bentConnector3", "bentConnector2", "curvedConnector3"]);
function mapPath(cmds, f) {
  return cmds.map((c) => {
    if (c.op === "Z") return c;
    if (c.op === "C") {
      const [x1, y1] = f(c.x1, c.y1), [x2, y2] = f(c.x2, c.y2), [x3, y3] = f(c.x, c.y);
      return { op: "C", x1, y1, x2, y2, x: x3, y: y3 };
    }
    const [x, y] = f(c.x, c.y);
    return { op: c.op, x, y };
  });
}
function presetPath(prst, x, y, w, h, opts = {}) {
  const local = presetPathLocal(prst, w, h, opts.adj);
  const r = (opts.rot ?? 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  return mapPath(local, (px, py) => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  });
}
function pathBounds(cmds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const c of cmds) {
    if (c.op === "Z") continue;
    if (c.op === "C") {
      add(c.x1, c.y1);
      add(c.x2, c.y2);
    }
    add(c.x, c.y);
  }
  return { x0, y0, x1, y1 };
}
function phi(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const e = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}
var hexRgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
function gradientSamples(stops, n = 512) {
  const out = new Uint8Array(n * 3);
  if (!stops.length) return out;
  const st = stops.map((s) => ({ pos: s.pos, c: hexRgb(s.color) }));
  const two = st.length === 2 && st[0].pos <= 0 && st[1].pos >= 1;
  const sig = 0.25, p0 = phi(-0.5 / sig), p1 = phi(0.5 / sig);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let c;
    if (two) {
      const g = (phi((t - 0.5) / sig) - p0) / (p1 - p0);
      c = [0, 1, 2].map((k) => 255 * ((st[0].c[k] / 255) ** 2.2 * (1 - g) + (st[1].c[k] / 255) ** 2.2 * g) ** (1 / 2.2));
    } else {
      let j = 0;
      while (j < st.length - 1 && st[j + 1].pos < t) j++;
      const a = st[j], b = st[Math.min(j + 1, st.length - 1)];
      const f = t <= a.pos ? 0 : t >= b.pos || b.pos === a.pos ? 1 : (t - a.pos) / (b.pos - a.pos);
      c = [0, 1, 2].map((k) => a.c[k] + (b.c[k] - a.c[k]) * f);
    }
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.max(0, Math.min(255, Math.round(c[k])));
  }
  return out;
}
function gradientGeometry(g, box, pathBox) {
  const withShape = g.rotWithShape !== false;
  const b = withShape ? box : { x: pathBox.x0, y: pathBox.y0, w: pathBox.x1 - pathBox.x0, h: pathBox.y1 - pathBox.y0 };
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rotPt = (px, py) => {
    if (!withShape || !box.rot) return [px, py];
    const r = box.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
  };
  if (g.path) {
    const f = g.fillTo ?? { l: 0.5, t: 0.5, r: 0.5, b: 0.5 };
    const fx = b.x + b.w * (f.l + (1 - f.l - f.r) / 2), fy = b.y + b.h * (f.t + (1 - f.t - f.b) / 2);
    const r = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([px, py]) => Math.hypot(px - fx, py - fy)));
    const [x02, y02] = rotPt(fx, fy);
    return { kind: "radial", x0: x02, y0: y02, r };
  }
  const a = g.angleDeg * Math.PI / 180;
  let dx = Math.cos(a), dy = Math.sin(a);
  if (g.scaled) {
    dx *= b.h;
    dy *= b.w;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const proj = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [-b.w / 2, b.h / 2], [b.w / 2, b.h / 2]].map(([px, py]) => px * dx + py * dy);
  const t0 = Math.min(...proj), t1 = Math.max(...proj);
  const [x0, y0] = rotPt(cx + dx * t0, cy + dy * t0);
  const [x1, y1] = rotPt(cx + dx * t1, cy + dy * t1);
  return { kind: "axial", x0, y0, x1, y1 };
}
function shapeExtras(s, theme) {
  const out = {};
  const g = s.gradient;
  if (g?.stops && g.stops.length) {
    out.grad = {
      stops: g.stops.map((st) => ({ pos: st.pos, color: resolveDrawingColor(st.color, theme) ?? "000000" })),
      angleDeg: g.angleDeg,
      ...g.scaled !== void 0 ? { scaled: g.scaled } : {},
      ...g.rotWithShape !== void 0 ? { rotWithShape: g.rotWithShape } : {},
      ...g.path ? { path: g.path } : {},
      ...g.fillTo ? { fillTo: g.fillTo } : {}
    };
  }
  if (s.shadow) {
    const c = resolveDrawingColor(s.shadow.color, theme);
    if (c) out.shadow = { ...s.shadow, color: c };
  }
  return out;
}
function groupChild(gr, item, x, y, w, h) {
  const sx = gr.widthTwips ? w / gr.widthTwips : 1, sy = gr.heightTwips ? h / gr.heightTwips : 1;
  const iw = item.w * sx, ih = item.h * sy;
  let ix = x + item.x * sx, iy = y + item.y * sy;
  if (!gr.rot && !gr.flipH && !gr.flipV) return { run: item.run, x: ix, y: iy, w: iw, h: ih };
  const gcx = x + w / 2, gcy = y + h / 2;
  let cx = ix + iw / 2, cy = iy + ih / 2;
  if (gr.flipH) cx = 2 * gcx - cx;
  if (gr.flipV) cy = 2 * gcy - cy;
  const a = (gr.rot ?? 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  [cx, cy] = [gcx + (cx - gcx) * c - (cy - gcy) * s, gcy + (cx - gcx) * s + (cy - gcy) * c];
  ix = cx - iw / 2;
  iy = cy - ih / 2;
  const mirror = !!gr.flipH !== !!gr.flipV;
  const xf = (st) => {
    if (!st) return st;
    const r = ((mirror ? -(st.rot ?? 0) : st.rot ?? 0) + (gr.rot ?? 0)) % 360;
    return { ...st, rot: r, flipH: !!st.flipH !== !!gr.flipH, flipV: !!st.flipV !== !!gr.flipV };
  };
  const r0 = item.run;
  const run = { ...r0 };
  if (r0.shape) run.shape = { ...r0.shape, style: xf(r0.shape.style) };
  if (r0.image) run.image = { ...r0.image, style: xf(r0.image.style ?? { geom: "rect" }) };
  if (r0.textbox) {
    const tb = { ...r0.textbox };
    if (tb.shape) tb.shape = xf(tb.shape);
    const tr = ((mirror ? -(tb.rot ?? 0) : tb.rot ?? 0) + (gr.rot ?? 0)) % 360;
    if (tr) tb.rot = tr;
    run.textbox = tb;
  }
  if (r0.group) run.group = { ...r0.group, rot: ((r0.group.rot ?? 0) + (gr.rot ?? 0)) % 360, flipH: !!r0.group.flipH !== !!gr.flipH, flipV: !!r0.group.flipV !== !!gr.flipV };
  return { run, x: ix, y: iy, w: iw, h: ih };
}
function custPaths(cust, x, y, w, h, opts = {}) {
  const r = (opts.rot ?? 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = w / 2, cy = h / 2;
  const place = (px, py) => {
    if (opts.flipH) px = w - px;
    if (opts.flipV) py = h - py;
    const dx = px - cx, dy = py - cy;
    return [x + cx + dx * c - dy * s, y + cy + dx * s + dy * c];
  };
  return cust.map((p) => {
    const sx = w / (p.w || 1), sy = h / (p.h || 1);
    const local = [];
    let cur = [0, 0];
    let start = [0, 0];
    for (const k of p.cmds) {
      if (k.op === "M" || k.op === "L") {
        cur = [k.x * sx, k.y * sy];
        if (k.op === "M") start = cur;
        local.push({ op: k.op, x: cur[0], y: cur[1] });
      } else if (k.op === "C" && k.pts.length >= 3) {
        const [a, b, d] = k.pts.map(([px, py]) => [px * sx, py * sy]);
        local.push({ op: "C", x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
        cur = d;
      } else if (k.op === "Q" && k.pts.length >= 2) {
        const [q, d] = k.pts.map(([px, py]) => [px * sx, py * sy]);
        local.push({ op: "C", x1: cur[0] + 2 / 3 * (q[0] - cur[0]), y1: cur[1] + 2 / 3 * (q[1] - cur[1]), x2: d[0] + 2 / 3 * (q[0] - d[0]), y2: d[1] + 2 / 3 * (q[1] - d[1]), x: d[0], y: d[1] });
        cur = d;
      } else if (k.op === "A") {
        cur = arcTo(local, cur, k.wR * sx, k.hR * sy, k.st, k.sw);
      } else if (k.op === "Z") {
        local.push({ op: "Z" });
        cur = start;
      }
    }
    return { cmds: mapPath(local, place), fill: p.fill, stroke: p.stroke };
  });
}

// ../docx-layout/src/frames.ts
var FRAME_INFO = /* @__PURE__ */ new WeakMap();
var FRAME_SKIP = /* @__PURE__ */ new WeakSet();
var FRAME_CARRY = /* @__PURE__ */ new WeakMap();
var INNER = /* @__PURE__ */ new WeakSet();
var runCache = /* @__PURE__ */ new WeakMap();
var anchorCache = /* @__PURE__ */ new WeakMap();
function frameOf(p) {
  const f = p.ppr?.framePr;
  if (!f || f.dropCap && f.dropCap !== "none" || INNER.has(p)) return void 0;
  return f;
}
var sameFrame = (a, b) => {
  const ks = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of ks) if (a[k] !== b[k]) return false;
  return true;
};
function frameRun(paras, f) {
  const hit = runCache.get(paras[0]);
  if (hit) return hit;
  const inner = paras.map((p) => {
    const ppr = { ...p.ppr };
    delete ppr.framePr;
    const q = { ...p, ppr };
    INNER.add(q);
    return q;
  });
  const hRule = f.hRule ?? (f.h ? "atLeast" : "auto");
  const wrap = f.wrap === "none" ? "none" : f.wrap === "notBeside" ? "topAndBottom" : "square";
  const hFrom = f.hAnchor === "page" ? "page" : f.hAnchor === "margin" ? "margin" : "column";
  const vFrom = f.vAnchor === "page" ? "page" : f.vAnchor === "text" ? "paragraph" : "margin";
  const hs = f.hSpace ?? 0, vs = f.vSpace ?? 0;
  const tb = {
    paras: inner,
    blocks: inner.map((paragraph) => ({ type: "paragraph", paragraph })),
    widthTwips: f.w ?? 0,
    heightTwips: f.h ?? 0,
    floating: true,
    insets: { l: 0, t: 0, r: 0, b: 0 },
    anchor: {
      // (o vão à esquerda da moldura mede 1 twip a menos — ws-a-fr-l18, ws-fr-l30)
      wrap,
      wrapText: "bothSides",
      distL: hs + 1,
      distR: hs,
      distT: vs,
      distB: vs,
      posH: { relativeFrom: hFrom, ...f.xAlign ? { align: f.xAlign } : { offset: f.x ?? 0 } },
      posV: { relativeFrom: vFrom, ...f.yAlign && f.yAlign !== "inline" ? { align: f.yAlign } : { offset: f.y ?? 0 } },
      layoutInCell: true,
      allowOverlap: true
    }
  };
  FRAME_INFO.set(tb, { autoWidth: !f.w, hRule: hRule === "exact" && f.h ? "exact" : hRule === "auto" || !f.h ? "auto" : "atLeast", h: f.h ?? 0 });
  const run = { text: "\uFFFC", props: { ...DEFAULT_RUN_PROPS }, textbox: tb };
  runCache.set(paras[0], run);
  return run;
}
function liftFrames(blocks, stops) {
  let out = null;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== "paragraph") continue;
    const f = frameOf(b.paragraph);
    if (!f) continue;
    const group = [b.paragraph];
    let j = i + 1;
    for (; j < blocks.length && !stops?.has(j - 1); j++) {
      const n = blocks[j];
      const nf = n.type === "paragraph" ? frameOf(n.paragraph) : void 0;
      if (!nf || !sameFrame(f, nf)) break;
      group.push(n.paragraph);
    }
    for (const p of group) FRAME_SKIP.add(p);
    const run = frameRun(group, f);
    let k = j;
    while (k < blocks.length && !stops?.has(k - 1)) {
      const n = blocks[k];
      if (n.type !== "paragraph" || !frameOf(n.paragraph)) break;
      k++;
    }
    const anchorB = k < blocks.length && !stops?.has(k - 1) ? blocks[k] : void 0;
    if (anchorB?.type === "paragraph") {
      out ??= blocks.slice();
      const cur = out[k];
      const src = cur.paragraph;
      let c = anchorCache.get(src);
      if (!c || !c.runs.includes(run)) {
        const prevRuns = c?.runs ?? [];
        const runs = [...prevRuns, run];
        const base = c ? c.para : src;
        const para = { ...base, runs: [...base.runs, run] };
        c = { runs, para };
        anchorCache.set(src, c);
      }
      out[k] = { ...cur, paragraph: c.para };
    } else FRAME_CARRY.set(group[0], run);
    i = j - 1;
  }
  return out ?? blocks;
}

// ../docx-layout/src/engine.ts
var zItems = (objs) => [...objs].sort((a, b) => a.z - b.z || a.seq - b.seq).flatMap((o) => o.items);
function layoutDocument(full0, provider, opts = {}) {
  const fmt2 = full0.formatting ?? emptyFormatting();
  const lifted = liftFrames(full0.blocks, new Set(full0.sections.map((s) => s.blockEnd)));
  const full = lifted === full0.blocks ? full0 : { ...full0, blocks: lifted };
  let total = 1;
  let marks = /* @__PURE__ */ new Map();
  let result = null;
  let late = /* @__PURE__ */ new Map();
  let lateTables = /* @__PURE__ */ new Map();
  let last = null;
  for (let pass = 0; pass < 5; pass++) {
    const ctx = new DocContext(fmt2, provider, opts);
    const eng = new Engine(ctx, full, total, marks, late, lateTables);
    result = eng.run();
    last = eng;
    const newMarks = eng.usedPageRef ? eng.bookmarkPages() : marks;
    const newLate = eng.lateFound.size ? mergeLate(late, eng.lateFound) : late;
    const newLateTables = eng.lateTablesFound.size ? new Map([...lateTables, ...eng.lateTablesFound]) : lateTables;
    const stable = (!eng.usedNumPages || result.pages.length === total) && (!eng.usedPageRef || sameMap(newMarks, marks)) && newLate === late && newLateTables === lateTables;
    if (stable) break;
    total = result.pages.length;
    marks = newMarks;
    late = newLate;
    lateTables = newLateTables;
  }
  const balance = /* @__PURE__ */ new Map();
  const runWith = (bal) => {
    const eng = new Engine(new DocContext(fmt2, provider, opts), full, total, marks, late, lateTables, bal);
    result = eng.run();
    return eng;
  };
  const done = /* @__PURE__ */ new Set();
  for (let guard = 0; guard < 20 && last; guard++) {
    const next = [...last.balanceFound].find(([s2, i]) => !done.has(s2) && i.n > 1);
    if (!next) break;
    const [s, info] = next;
    done.add(s);
    let lo = Math.max(0, Math.floor(info.sum / info.n) - 1), hi = Math.ceil(info.bottom - info.colTop);
    if (hi <= lo + 1) continue;
    const fits = (h) => runWith(new Map([...balance, [s, { page: info.page, h }]])).balanceFound.get(s)?.page === info.page;
    if (!fits(hi)) continue;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    balance.set(s, { page: info.page, h: hi });
    last = runWith(balance);
  }
  return result;
}
function mergeLate(a, b) {
  const seen = new Set([...a.values()].flat());
  let out = null;
  for (const [pg, runs] of b) for (const r of runs) {
    if (seen.has(r)) continue;
    seen.add(r);
    out ??= new Map([...a].map(([k, v]) => [k, [...v]]));
    (out.get(pg) ?? out.set(pg, []).get(pg)).push(r);
  }
  return out ?? a;
}
function sameMap(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
var Engine = class {
  constructor(ctx, full, totalPagesGuess, marksGuess = /* @__PURE__ */ new Map(), lateFloats = /* @__PURE__ */ new Map(), lateTables = /* @__PURE__ */ new Map(), balance = /* @__PURE__ */ new Map()) {
    this.ctx = ctx;
    this.full = full;
    this.totalPagesGuess = totalPagesGuess;
    this.marksGuess = marksGuess;
    this.lateFloats = lateFloats;
    this.lateTables = lateTables;
    this.balance = balance;
  }
  ctx;
  full;
  totalPagesGuess;
  marksGuess;
  lateFloats;
  lateTables;
  balance;
  pages = [];
  cur;
  col = 0;
  y = 0;
  /** topo da área de colunas corrente (muda numa seção contínua) */
  colTop = 0;
  atTop = true;
  /** topo de página que MANTÉM o espaço antes do próximo parágrafo (1º da seção
   *  nova, parágrafo que começa com quebra de página, quebra antes no modo ≤ 14):
   *  o "depois" do último parágrafo da página anterior, que o Word desconta —
   *  espaço = colapso(depois, antes) − depois (oráculo tocref-sectgap). null = suprime */
  topGapPrevAfter = null;
  prev = null;
  firstInDoc = true;
  usedNumPages = false;
  geoms = [];
  /** numeração de linhas: contador e onde foi zerado */
  lnCount = 0;
  lnPage = null;
  lnSect = -1;
  /** última linha de tabela emitida (borda de fechamento na quebra de página) */
  lastRowEmit = null;
  /** diagramando cabeçalho/rodapé (floats vão para as camadas do HF) */
  inHf = false;
  /** linhas de tabelas flutuantes que continuam na próxima página */
  floatCarry = [];
  /** tabela flutuante que parte: partes de linhas emitidas e mesclas verticais que
   *  atravessam a página (o texto flui pelas partes — oráculo ftvmsplit) */
  floatFlow = /* @__PURE__ */ new WeakMap();
  /** medição do rodapé: ignora flutuantes de posição absoluta */
  onlyTextFloats = false;
  /** flutuantes já posicionados antes do fluxo (posição vertical absoluta no HF) */
  prePlaced = /* @__PURE__ */ new Set();
  zSeq = 0;
  usedPageRef = false;
  /** seções de várias colunas seguidas de seção contínua: o que ocupam na última página */
  balanceFound = /* @__PURE__ */ new Map();
  /** alturas usadas pelas colunas já encerradas na porção da seção nesta página */
  colUsed = [];
  /** fundo do corpo antes do limite de coluna equilibrada (restaurado na seção seguinte) */
  balanceSaved = null;
  /** Limita a altura das colunas na última página de uma seção equilibrada. */
  applyBalance() {
    const spec = this.balance.get(this.cur.geom.index);
    if (!spec || spec.page !== this.pages.length - 1) return;
    this.balanceSaved = this.cur.bodyBottom;
    this.cur.bodyBottom = Math.min(this.cur.bodyBottom, this.colTop + spec.h);
  }
  /** flutuantes tardios achados nesta passada */
  lateFound = /* @__PURE__ */ new Map();
  lateTablesFound = /* @__PURE__ */ new Map();
  /** tabelas flutuantes do corpo já colocadas (blocos) */
  placedTables = /* @__PURE__ */ new Set();
  /** tabelas tardias (início da página) que partiram: a âncora vai para a continuação */
  lateSplit = /* @__PURE__ */ new Set();
  /** SEQ id [\* formato] [\r n] [\c] [\h] — contadores na ordem do documento. */
  seqValue(instr) {
    const tok = instr.trim().split(/\s+/);
    const id = tok[1]?.toLowerCase();
    if (!id || id.startsWith("\\")) return void 0;
    let v = this.ctx.seqCounters.get(id) ?? 0;
    const r = /\\r\s*(\d+)/i.exec(instr);
    if (r) v = parseInt(r[1], 10);
    else if (!/\\c\b/i.test(instr)) v++;
    this.ctx.seqCounters.set(id, v);
    if (/\\h\b/i.test(instr)) return "";
    const fmt2 = /\\\*\s*(\w+)/.exec(instr)?.[1] ?? "ARABIC";
    const map = { ARABIC: "decimal", ALPHABETIC: "upperLetter", alphabetic: "lowerLetter", ROMAN: "upperRoman", roman: "lowerRoman" };
    return formatNumber(v, map[fmt2] ?? "decimal", this.ctx.opts.lang);
  }
  /** REF indicador: o texto do parágrafo do indicador (os do sumário cobrem o título inteiro). */
  refValue(instr) {
    const tok = instr.trim().split(/\s+/);
    const bm = tok[1];
    if (!bm || /\\p\b/i.test(instr)) return void 0;
    if (/\\[nrw]\b/i.test(instr)) {
      const bi = this.full.bookmarks?.get(bm);
      if (bi === void 0 || this.full.blocks[bi]?.type !== "paragraph") return void 0;
      const t = this.listNumberOf(bi);
      return t ? t.replace(/\.+$/, "") : "0";
    }
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== void 0 ? this.full.blocks[b] : void 0;
    if (!blk || blk.type !== "paragraph") return void 0;
    const text = blk.paragraph.runs.map((x) => x.field || x.image || x.textbox ? "" : x.text).join("").replace(/[\t\n\f\u000B]/g, " ").trim();
    return text || void 0;
  }
  /** texto do número de lista de cada parágrafo do corpo (bloco → texto), na ordem do documento */
  listTexts;
  listNumberOf(block) {
    if (!this.listTexts) {
      const out = /* @__PURE__ */ new Map();
      const saved = this.ctx.numbering;
      const st = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      this.ctx.numbering = st;
      const num = (para) => {
        const n = resolvePPr(this.ctx, para, {}).ppr.numPr;
        return (n?.numId ? st.next(n.numId, n.ilvl ?? 0)?.text : void 0) ?? "";
      };
      const visit = (b) => {
        if (b.type === "paragraph") {
          num(b.paragraph);
          return;
        }
        for (const row of b.rows) {
          for (const cell of row.cells) for (const c of cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }))) visit(c);
        }
      };
      try {
        this.full.blocks.forEach((b, i) => {
          if (b.type === "paragraph") out.set(i, num(b.paragraph));
          else visit(b);
        });
      } finally {
        this.ctx.numbering = saved;
      }
      this.listTexts = out;
    }
    return this.listTexts.get(block);
  }
  /** Página exibida (já formatada) do parágrafo de cada indicador. */
  bookmarkPages() {
    const out = /* @__PURE__ */ new Map();
    const firstPage = /* @__PURE__ */ new Map();
    const paraLines = /* @__PURE__ */ new Map();
    for (const ps of this.pages) {
      for (const l of ps.page.lines) {
        const m = /^b(\d+)/.exec(l.ref);
        if (m && !firstPage.has(+m[1])) firstPage.set(+m[1], ps.page);
        if (m && l.ref === `b${m[1]}`) {
          const arr = paraLines.get(+m[1]) ?? [];
          arr.push({ end: l.end, page: ps.page });
          paraLines.set(+m[1], arr);
        }
      }
    }
    for (const [name, block] of this.full.bookmarks ?? []) {
      let pg;
      const off = this.full.bookmarkOffsets?.get(name);
      if (off !== void 0) pg = paraLines.get(block)?.find((l) => l.end > off)?.page;
      for (let b = block; b < block + 50 && !pg; b++) pg = firstPage.get(b);
      if (!pg) continue;
      const ps = this.pages.find((x) => x.page === pg);
      out.set(name, formatNumber(pg.number, ps.geom.pgFmt ?? "decimal", this.ctx.opts.lang));
    }
    return out;
  }
  run() {
    const full = this.full;
    this.geoms = [];
    full.sections.forEach((s, i) => {
      this.geoms.push(this.geomOf(s, i));
    });
    if (!this.geoms.length) {
      this.geoms.push(this.geomOf({
        sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
        blockStart: 0,
        blockEnd: full.blocks.length - 1,
        headers: {},
        footers: {},
        headerRefs: [],
        footerRefs: []
      }, 0));
    }
    for (const g of this.geoms) {
      if (g.index === 0 || g.type !== "continuous") {
        const lastAfter = this.prev ? this.prev.after : 0;
        this.newPage(g, g.type);
        if (g.index > 0) this.topGapPrevAfter = lastAfter;
      } else this.continuousSection(g);
      for (let b = g.blocks[0]; b <= g.blocks[1] && b < full.blocks.length; b++) {
        const block = full.blocks[b];
        if (block.type === "paragraph") this.placeParagraph(block.paragraph, `b${b}`, b, g);
        else this.placeTable(block, `b${b}`, b);
      }
    }
    for (let k = 0; k < 100 && this.floatCarry.length && this.cur; k++) this.newPage(this.cur.geom);
    if (this.cur) this.paintNotes(this.cur);
    const bgSpec = full.background;
    const bg = bgSpec ? resolveColor({ ...bgSpec.color ? { val: bgSpec.color } : {}, ...bgSpec.themeColor ? { themeColor: bgSpec.themeColor } : {}, ...bgSpec.themeTint ? { themeTint: bgSpec.themeTint } : {}, ...bgSpec.themeShade ? { themeShade: bgSpec.themeShade } : {} }, this.ctx.fmt.theme) : void 0;
    const pages = this.pages.map((ps) => {
      const late = (arr) => {
        const keep = [], front = [], back = [];
        let cur = null, curMk = null;
        for (const it of arr) {
          const mk = LATE_ITEMS.get(it);
          if (!mk) {
            keep.push(it);
            continue;
          }
          if (mk !== curMk) {
            cur = { z: mk.z, seq: mk.seq, items: [] };
            (mk.behind ? back : front).push(cur);
            curMk = mk;
          }
          cur.items.push(it);
        }
        return { keep, front, back };
      };
      const lateZ = (objs, into) => objs.map((o) => {
        const r = late(o.items);
        into.front.push(...r.front);
        into.back.push(...r.back);
        return r.front.length || r.back.length ? { ...o, items: r.keep } : o;
      });
      const lh = late(ps.hf), lb = late(ps.body);
      const hfB = lateZ(ps.hfBehind, lh), hfF = lateZ(ps.hfFront, lh), bB = lateZ(ps.behind, lb), bF = lateZ(ps.front, lb);
      const hfLayer = cullOffPage([...zItems([...hfB, ...lh.back]), ...lh.keep, ...zItems([...hfF, ...lh.front])], ps.page.widthTw, ps.page.heightTw);
      const pb = this.full.sections[ps.geom.index]?.sect?.pgBorders;
      const pbItems = pb ? this.pageBorders(ps, pb) : [];
      const pbBack = pb?.zOrder === "back";
      ps.page.items = [...hfLayer, ...pbBack ? pbItems : [], ...cullOffPage([...zItems([...bB, ...lb.back]), ...lb.keep, ...zItems([...bF, ...lb.front])], ps.page.widthTw, ps.page.heightTw), ...pbBack ? [] : pbItems];
      ps.page.hfItems = hfLayer.length;
      if (bg && bg.toUpperCase() !== "FFFFFF" && bg !== "auto") ps.page.background = bg;
      return ps.page;
    });
    return { pages, warnings: [...this.ctx.warnings] };
  }
  // ───────────────────────── seções e páginas ─────────────────────────
  /** Bordas de página da seção nesta página (w:display, contorno do cabeçalho/rodapé). */
  pageBorders(ps, pb) {
    const first = ps.sectPage === 0;
    if (pb.display === "firstPage" && !first || pb.display === "notFirstPage" && first) return [];
    const topOf = (it) => it.t === "glyphs" || it.t === "rect" || it.t === "image" || it.t === "shape" ? it.y : it.t === "line" ? it.y1 : void 0;
    const hf = [...ps.hf, ...zItems(ps.hfBehind), ...zItems(ps.hfFront)];
    const set = this.ctx.fmt.settings;
    return pageBorderItems(this.ctx, pb, ps.geom, {
      header: !set.bordersDoNotSurroundHeader && hf.some((it) => (topOf(it) ?? Infinity) < ps.bodyTop),
      footer: !set.bordersDoNotSurroundFooter && hf.some((it) => (topOf(it) ?? -Infinity) > ps.bodyBottom)
    });
  }
  geomOf(s, i) {
    const sp = s.sectPr;
    const pageW = sp.pageWidthTwips, pageH = sp.pageHeightTwips;
    const marL = sp.marginLeftTwips, marR = sp.marginRightTwips;
    const contentW = Math.max(720, pageW - marL - marR);
    const cols = [];
    const defs = s.sect?.colDefs;
    const n = Math.max(1, sp.cols?.count ?? 1);
    if (n > 1 && defs && defs.length >= n && s.sect?.equalWidth === false) {
      let x = marL;
      for (const d of defs.slice(0, n)) {
        cols.push({ x, w: d.w });
        x += d.w + d.space;
      }
    } else if (n > 1) {
      const space = sp.cols?.spaceTwips ?? 720;
      const w = (contentW - space * (n - 1)) / n;
      for (let k = 0; k < n; k++) cols.push({ x: marL + k * (w + space), w });
    } else cols.push({ x: marL, w: contentW });
    const prev = i > 0 ? this.geoms[i - 1] : void 0;
    const pick = (own3, inherited) => {
      const out = { ...inherited ?? {} };
      if (own3?.default) out.default = own3.default;
      if (own3?.first) out.first = own3.first;
      if (own3?.even) out.even = own3.even;
      return out;
    };
    const hb = s.headerBlocks ?? blocksOfParas(s.headers);
    const fb = s.footerBlocks ?? blocksOfParas(s.footers);
    return {
      index: i,
      pageW,
      pageH,
      marL,
      marR,
      marT: sp.marginTopTwips,
      marB: sp.marginBottomTwips,
      hdr: sp.headerDistanceTwips ?? 720,
      ftr: sp.footerDistanceTwips ?? 720,
      cols,
      colSep: !!sp.cols?.sep,
      titlePg: !!sp.titlePg,
      type: s.sect?.type ?? "nextPage",
      ...s.sect?.vAlign ? { vAlign: s.sect.vAlign } : {},
      ...sp.pgNumStart !== void 0 ? { pgStart: sp.pgNumStart } : {},
      ...s.sect?.pgNumFmt ? { pgFmt: s.sect.pgNumFmt } : {},
      headers: pick(hb, prev?.headers),
      footers: pick(fb, prev?.footers),
      blocks: [s.blockStart, s.blockEnd],
      ...s.sect?.docGrid && (s.sect.docGrid.type === "lines" || s.sect.docGrid.type === "linesAndChars") && (s.sect.docGrid.linePitch ?? 0) > 0 ? { linePitch: s.sect.docGrid.linePitch } : {},
      ...s.sect?.lnNumType ? { lnNum: {
        countBy: Math.max(1, s.sect.lnNumType.countBy ?? 1),
        start: s.sect.lnNumType.start ?? 0,
        restart: s.sect.lnNumType.restart ?? "newPage",
        distance: s.sect.lnNumType.distance ?? 360
      } } : {}
    };
  }
  pageNumber(g, sectPage) {
    if (g.pgStart !== void 0) return g.pgStart + sectPage;
    const prev = this.pages.length ? this.pages[this.pages.length - 1] : void 0;
    if (sectPage === 0) return prev ? prev.page.number + 1 : 1;
    return (prev?.page.number ?? 0) + 1;
  }
  newPage(g, breakType = "nextPage") {
    const sectPage = this.cur && this.cur.geom === g ? this.cur.sectPage + 1 : 0;
    let number = this.pageNumber(g, sectPage);
    if (sectPage === 0 && this.pages.length && (breakType === "evenPage" || breakType === "oddPage")) {
      const wantEven = breakType === "evenPage";
      if (number % 2 === 0 !== wantEven) {
        this.makePage(g, sectPage, number);
        number++;
        return this.newPageAt(g, sectPage + 1, number);
      }
    }
    this.newPageAt(g, sectPage, number);
  }
  newPageAt(g, sectPage, number) {
    this.makePage(g, sectPage, number);
    this.col = 0;
    this.colTop = this.cur.bodyTop;
    this.y = this.cur.bodyTop;
    this.colUsed = [];
    this.balanceSaved = null;
    this.applyBalance();
    this.atTop = true;
    this.topGapPrevAfter = null;
    this.prev = null;
    if (this.floatCarry.length) this.placeFloatCarry();
    const late = this.lateFloats.get(this.pages.length - 1);
    if (late) {
      const fr = this.colFrame();
      for (const run of late) {
        this.placeFloat(run, this.cur, fr.x, fr.w, this.cur.bodyTop, this.cur.body, 0);
        this.prePlaced.add(run);
      }
    }
    for (const [bi, lt] of this.lateTables) {
      const b = this.full.blocks[bi];
      if (lt.page !== this.pages.length - 1 || this.placedTables.has(bi) || b?.type !== "table" || !b.tblPr?.tblpPr) continue;
      this.placedTables.add(bi);
      const fr = this.colFrame();
      const t = layoutTable(this.ctx, b, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), `b${bi}`);
      const items = [];
      this.placeFloatingTable(t, b.tblPr.tblpPr, this.cur, lt.flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      if (this.floatCarry.some((c) => c.t === t)) this.lateSplit.add(bi);
    }
  }
  makePage(g, sectPage, number) {
    const page = { widthTw: g.pageW, heightTw: g.pageH, section: g.index, number, items: [], lines: [] };
    const ps = {
      page,
      geom: g,
      bodyTop: g.marT,
      bodyBottom: g.pageH - g.marB,
      behind: [],
      hf: [],
      body: [],
      front: [],
      hfBehind: [],
      hfFront: [],
      floats: [],
      sectPage,
      notes: [],
      noteArea: 0,
      bodyBottomBase: g.pageH - g.marB
    };
    if (this.cur) this.paintNotes(this.cur);
    this.pages.push(ps);
    this.cur = ps;
    this.colMaxY = 0;
    this.layoutHeaderFooter(ps);
    ps.bodyBottomBase = ps.bodyBottom;
    if (this.noteCarry.length) {
      for (const n of this.noteCarry) {
        if (!ps.notes.length) ps.noteArea += this.separatorHeight();
        ps.notes.push(n);
        ps.noteArea += n.content.height;
      }
      this.noteCarry = [];
      ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
    }
  }
  continuousSection(g) {
    const ending = this.cur.geom;
    if (ending.cols.length > 1) {
      const used = [...this.colUsed, this.y - this.colTop];
      this.balanceFound.set(ending.index, { page: this.pages.length - 1, colTop: this.colTop, bottom: this.balanceSaved ?? this.cur.bodyBottom, sum: used.reduce((a, b) => a + Math.max(0, b), 0), n: ending.cols.length });
    }
    if (this.balanceSaved !== null) {
      this.cur.bodyBottom = this.balanceSaved;
      this.balanceSaved = null;
    }
    this.colUsed = [];
    this.y = Math.max(this.y, this.colMaxY);
    this.colMaxY = 0;
    this.cur.geom = g;
    this.col = 0;
    this.colTop = this.y;
    this.applyBalance();
  }
  colFrame() {
    const c = this.cur.geom.cols[this.col] ?? this.cur.geom.cols[0];
    return { x: c.x, w: c.w };
  }
  /** Fim da coluna: próxima coluna ou nova página. */
  breakColumn() {
    const g = this.cur.geom;
    if (this.col < g.cols.length - 1) {
      this.colUsed.push(this.y - this.colTop);
      this.colMaxY = Math.max(this.colMaxY, this.y);
      this.col++;
      this.y = this.colTop;
      this.atTop = true;
      this.prev = null;
    } else this.newPage(g);
  }
  // ───────────────────────── cabeçalho / rodapé ─────────────────────────
  fieldValue(ps) {
    return (name, instr) => {
      if (name === "PAGEREF") {
        this.usedPageRef = true;
        const bm = (instr ?? "").trim().split(/\s+/)[1];
        return bm ? this.marksGuess.get(bm) : void 0;
      }
      if (name === "SEQ") return this.seqValue(instr ?? "");
      if (name === "REF") return this.refValue(instr ?? "");
      if (name === "PAGE") return formatNumber(ps.page.number, ps.geom.pgFmt ?? "decimal", this.ctx.opts.lang);
      if (name === "NUMPAGES") {
        this.usedNumPages = true;
        return String(this.totalPagesGuess);
      }
      if (name === "SECTIONPAGES") {
        this.usedNumPages = true;
        return String(this.totalPagesGuess);
      }
      if (name === "SECTION") return String(ps.geom.index + 1);
      if (name === "DATE" || name === "TIME") return dateFieldValue(instr ?? name, this.ctx.opts.now ?? /* @__PURE__ */ new Date(), this.ctx.opts.lang);
      if (name === "SAVEDATE" || name === "CREATEDATE" || name === "PRINTDATE") {
        const cp = this.full.coreProps;
        const iso = name === "SAVEDATE" ? cp?.modified : name === "CREATEDATE" ? cp?.created : cp?.lastPrinted;
        const d = iso ? new Date(iso) : void 0;
        return d && !isNaN(d.getTime()) ? dateFieldValue(instr ?? name, d, this.ctx.opts.lang) : void 0;
      }
      return void 0;
    };
  }
  layoutHeaderFooter(ps) {
    const g = ps.geom;
    const settings = this.ctx.fmt.settings;
    const first = ps.sectPage === 0 && g.titlePg;
    const even = settings.evenAndOddHeaders && ps.page.number % 2 === 0;
    const kind = first ? "first" : even ? "even" : "default";
    const pick = (set) => first ? set.first : even ? set.even : set.default;
    const env = { field: this.fieldValue(ps), hf: true };
    const width = g.pageW - g.marL - g.marR;
    const savedNum = this.ctx.numbering;
    this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
    this.inHf = true;
    try {
      const hdr = pick(g.headers);
      if (hdr?.length) {
        const probe = this.ctx.pure(() => this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, scratchPage(ps), g.hdr));
        ps.bodyTop = Math.max(g.marT, g.hdr + probe.height);
        const r = this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, ps, g.hdr);
        for (const it of r.items) ps.hf.push(shiftItem(it, g.hdr));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, g.hdr));
        ps.bodyTop = Math.max(g.marT, g.hdr + r.height);
      }
      const ftr = pick(g.footers);
      if (ftr?.length) {
        const probe = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, void 0, 0));
        let top = g.pageH - g.ftr - probe.height;
        const probe2 = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top));
        let limitH = probe.height;
        if (probe2.height > probe.height + 1) {
          top = g.pageH - g.ftr - probe2.height;
          this.onlyTextFloats = true;
          try {
            limitH = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top)).height;
          } finally {
            this.onlyTextFloats = false;
          }
        }
        const r = this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, ps, top);
        for (const it of r.items) ps.hf.push(shiftItem(it, top));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, top));
        ps.bodyBottom = Math.min(g.pageH - g.marB, g.pageH - g.ftr - limitH);
      }
    } finally {
      this.inHf = false;
      this.ctx.numbering = savedNum;
    }
  }
  // ───────────────────────── fluxo estático (célula, HF, caixa) ─────────────────────────
  /**
   * Lays out blocos sem paginação (y relativo a 0). Floats ancorados são
   * posicionados na página `ps` (se houver) com `yOrigin` = y absoluto do topo.
   */
  layoutStatic(blocks0, x, width, env, ref, ps, yOrigin = 0, nb) {
    const blocks = this.inCell ? blocks0 : liftFrames(blocks0);
    const items = [];
    const lines = [];
    let y = 0;
    let prev = null;
    let prevList;
    let keepNext = false;
    const n = blocks.length;
    const isHf = !!ps && /^(hdr|ftr):\w+$/.test(ref);
    const hfFlow = /^(hdr|ftr):\w+$/.test(ref);
    const cellFloats = [];
    const cellPs = { floats: cellFloats };
    let floatBottom = 0;
    let alignBottom = 0;
    let cellShape = false;
    const floatItems = [];
    const floatLines = [];
    if (isHf) {
      for (const b of blocks) {
        if (b.type !== "paragraph") continue;
        const carry = FRAME_CARRY.get(b.paragraph);
        for (const run of FRAME_SKIP.has(b.paragraph) ? carry ? [carry] : [] : b.paragraph.runs) {
          const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
          const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
          if (!fl || !anc || !ABSOLUTE_V.has(anc.posV.relativeFrom ?? "") || this.onlyTextFloats) continue;
          this.placeFloat(run, ps, x, width, yOrigin, items, yOrigin);
          this.prePlaced.add(run);
        }
      }
    }
    let join = null;
    let delRuns = null;
    const paras = /* @__PURE__ */ new Map();
    const nest = [];
    let lastPara = null;
    blocks.forEach((b, bi) => {
      if (b.type === "paragraph") {
        if (FRAME_SKIP.has(b.paragraph)) {
          const carry = FRAME_CARRY.get(b.paragraph);
          if (carry && ps && !this.prePlaced.has(carry)) this.placeFloat(carry, ps, x + this.staticDx, width, yOrigin + y + (prev ? prev.after : 0), items, yOrigin);
          if (this.hfFrameAfter.length && blocks[bi + 1]?.type === "table") {
            this.hfFrameTbl.push(...this.hfFrameAfter);
            this.hfFrameAfter = [];
          }
          if (this.hfFrameAfter.length) {
            items.push(...this.hfFrameAfter);
            this.hfFrameAfter = [];
          }
          return;
        }
        if (b.paragraph.ppr?.markDeleted && !join && bi < n - 1 && blocks[bi + 1].type === "paragraph") {
          delRuns = [...delRuns ?? [], ...b.paragraph.runs];
          return;
        }
        if (b.paragraph.ppr?.markDeleted && !b.paragraph.runs.length && !join && !delRuns) return;
        const merged = delRuns ? { ...b.paragraph, runs: [...delRuns, ...b.paragraph.runs] } : b.paragraph;
        delRuns = null;
        const para = join ? this.joinHidden(join, merged, env) : merged;
        const p = prepareParagraph(this.ctx, para, { ...env, noPageBreaks: true, ...join ? { numbering: false } : {} });
        if (join) p.marker = join.marker;
        join = null;
        if (p.markStyle.hidden && bi < n - 1) {
          if (!p.glyphs.length) return;
          if (blocks[bi + 1].type === "paragraph") {
            join = { para, marker: p.marker };
            return;
          }
        }
        if (p.keepNext) keepNext = true;
        const firstInCell = bi === 0;
        const lastInCell = bi === n - 1;
        let before = p.beforeAuto ? firstInCell ? 0 : 280 : p.spaceBefore;
        let prevAfter = prev ? prev.after : 0;
        let ctxAfter = null;
        if (prev && prev.styleId === p.styleId) {
          if (prev.contextual) {
            ctxAfter = prevAfter;
            prevAfter = 0;
          }
          if (p.contextual) before = 0;
        }
        const list = this.listOf(p);
        if (list && prevList === list) {
          if (p.beforeAuto) before = 0;
          if (prev?.afterAuto) prevAfter = 0;
        }
        prevList = list;
        if (bi === 0 && nb?.prev && p.contextual && nb.prev.styleId === p.styleId) before = 0;
        if (lastPara) lastPara.after = prevAfter;
        const gapS = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(prevAfter, before);
        const paraRefS = y + Math.min(prevAfter, gapS);
        y += gapS;
        const top = y;
        const br = new LineBreaker(this.ctx, p);
        const frame0 = { left: p.indLeft, right: width - p.indRight };
        const hfWrap = !!ps && /^(hdr|ftr):\w+$/.test(ref);
        if (hfWrap) this.placeFloats(p, ps, x, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        const cellAnch = this.inCell && ps && !hfWrap && /\/r\d+\/c\d+$/.test(ref) ? [] : null;
        if (this.inCell && !cellShape) cellShape = p.glyphs.some((g) => !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating));
        if (cellAnch) {
          for (const g of p.glyphs) {
            const run = g.obj;
            if (!run || this.prePlaced.has(run) || !(run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating)) continue;
            if (this.onlyTextFloats && !followsText(floatAnchor(run))) continue;
            const its = [];
            const rc = this.placeFloat(run, ps, x + this.staticDx, width, yOrigin + top, its, yOrigin, void 0, yOrigin + paraRefS);
            const mk = { z: floatAnchor(run)?.relativeHeight ?? 0, seq: this.zSeq++, behind: rc.obj.layer === "behind" };
            for (const it of its) LATE_ITEMS.set(it, mk);
            cellAnch.push(...its);
            if (rc.box && !floatAnchor(run)?.simplePos) {
              cellFloats.push({ ...rc.box, x: rc.box.x - this.staticDx, y: rc.box.y - yOrigin });
              floatBottom = Math.max(floatBottom, rc.obj.y - yOrigin + rc.obj.h);
            }
            alignBottom = Math.max(alignBottom, rc.obj.y - yOrigin + rc.obj.h);
          }
        }
        const boxTop = y;
        const boxAt = items.length;
        y += this.borderTopExtent(p, prev);
        const l0 = lines.length;
        do {
          let frame = frame0;
          const wPs = hfWrap ? ps : cellFloats.length ? cellPs : null;
          const wY0 = hfWrap ? yOrigin : 0;
          if (wPs) {
            const lh2 = markLineH(p);
            frame = this.wrapFrame(frame0, x, wY0 + y, lh2, wPs);
            for (let k = 0; k < 8 && frame.skipTo !== void 0 && frame.skipTo - wY0 > y; k++) {
              y = frame.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, lh2, wPs);
            }
          }
          const mark = br.mark();
          let seg = this.pickSeg(br, frame);
          let line = br.next(seg.f);
          const textH = Math.min(line.height, line.baseline + line.desc);
          if (wPs && wPs.floats.length && textH > markLineH(p) + 1) {
            const f2 = this.wrapFrame(frame0, x, wY0 + y, textH, wPs);
            if (f2.skipTo !== void 0 && f2.skipTo - wY0 > y) {
              y = f2.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, markLineH(p), wPs);
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            } else if (narrower(f2, frame)) {
              frame = f2;
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            }
          }
          let lh = 0;
          const put = (l) => {
            paintLine(this.ctx, items, l, x, y);
            this.paintInlineDrawings(items, l, x, y, ps);
            lines.push(lineRecord(`${ref}/b${bi}`, p, l, x, y));
            lh = Math.max(lh, l.height);
          };
          put(line);
          this.moreSegs(br, frame, seg.k, line, put);
          y += lh;
        } while (!br.done());
        if (this.hfFrameAfter.length) {
          items.push(...this.hfFrameAfter);
          this.hfFrameAfter = [];
        }
        const groupedNext = this.groupsWithNext(p, blocks[bi + 1], env);
        const bandB = this.borderBottomExtent(p, groupedNext);
        y += bandB;
        this.paintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
        if (ps && !hfWrap && !cellAnch) this.placeFloats(p, ps, x + this.staticDx, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        if (cellAnch) items.push(...cellAnch);
        let after = p.afterAuto ? lastInCell && !hfFlow ? 0 : 280 : p.spaceAfter;
        if (lastInCell && nb?.next && p.contextual && nb.next.styleId === p.styleId) after = 0;
        lastPara = {
          lines: lines.length - l0,
          after,
          ...bandB ? { band: bandB } : {},
          widow: this.ctx.fmt.settings.compatibilityMode >= 15 && (p.widowControl || p.ppr.widowControl === void 0)
        };
        paras.set(`${ref}/b${bi}`, lastPara);
        prev = { after, afterAuto: p.afterAuto, ...p.styleId ? { styleId: p.styleId } : {}, contextual: p.contextual, ...p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {} };
      } else if (b.rows.every((r) => isHiddenRow(this.ctx, r))) {
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== "inline" && !hfFlow && this.inCell) {
        const fp = b.tblPr.tblpPr;
        if (prev && this.dropsAfterBeforeTable(prev, b)) {
          prev = { ...prev, after: 0 };
          if (lastPara) lastPara.after = 0;
        }
        const t0 = this.ctx.pure(() => layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`));
        const H = t0.rows.reduce((a, r) => a + r.height, 0);
        const top = y + (prev ? prev.after : 0) + (fp.tblpYSpec ? 0 : fp.tblpY ?? 0);
        const [aL, aR] = fp.horzAnchor === "page" ? [x - 103, x + width + 103] : [x, x + width];
        const xs = fp.tblpXSpec;
        const refX = xs === "center" ? aL + (aR - aL - t0.width) / 2 : xs === "right" || xs === "outside" ? aR - t0.width : aL + (xs ? 0 : fp.tblpX ?? 0);
        const t = layoutTable(this.ctx, b, refX - t0.x, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
        let ry = top;
        for (const row of t.rows) {
          for (const it of row.items) floatItems.push(shiftItem(it, ry));
          for (const it of row.borderItems) floatItems.push(shiftItem(it, ry));
          for (const l of row.lines) floatLines.push({ ...l, y: l.y + ry, baseline: l.baseline + ry });
          ry += row.height;
        }
        cellFloats.push({
          x: t.x,
          y: top,
          w: t.width,
          h: H,
          wrap: "square",
          side: "bothSides",
          distL: fp.leftFromText ?? 0,
          distR: fp.rightFromText ?? 0,
          distT: fp.topFromText ?? 0,
          distB: fp.bottomFromText ?? 0
        });
        floatBottom = Math.max(floatBottom, top + H);
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== "inline" && hfFlow) {
        if (ps) {
          const t = layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
          const fItems = [];
          this.placeFloatingTable(t, b.tblPr.tblpPr, ps, yOrigin + y, x, width, fItems, 0, this.ctx.fmt.settings.compatibilityMode >= 15);
          ps.hfFront.push({ z: -1, seq: this.zSeq++, items: fItems });
        }
      } else {
        y += prev && !this.dropsAfterBeforeTable(prev, b) ? prev.after : 0;
        if (lastPara && prev && this.dropsAfterBeforeTable(prev, b)) lastPara.after = 0;
        lastPara = null;
        this.assignCellNeighbors(b, prev ? { ...prev.styleId ? { styleId: prev.styleId } : {} } : bi === 0 ? nb?.prev : void 0);
        const t = layoutTable(this.ctx, b, x, width, (cell, cx, cw, cenv, cref) => {
          const cc = this.layoutCell(cell, cx, cw, cenv, cref, ps);
          if (cc.paras) for (const [k, v] of cc.paras) paras.set(k, v);
          return cc;
        }, `${ref}/b${bi}`);
        const tblAt = items.length;
        if (isHf && t.rows[0]) {
          const h0 = t.rows.reduce((a, r) => a + r.height, 0);
          for (let k = 0; k < 8; k++) {
            const yy = yOrigin + y;
            const hit = ps.floats.find((fl) => !fl.bodyOnly && (fl.wrap === "topAndBottom" || fl.wrap === "square" || fl.wrap === "tight" || fl.wrap === "through") && yy + h0 > fl.y - fl.distT && yy < fl.y + fl.h + fl.distB && t.x + t.width > fl.x - fl.distL && t.x < fl.x + fl.w + fl.distR);
            if (!hit) break;
            y = hit.y + hit.h + hit.distB - yOrigin;
          }
        }
        const mergeMoved = /* @__PURE__ */ new Set();
        for (const [ri, row0] of t.rows.entries()) {
          const row = dropMoved(mergeTextFirst(t.rows, ri, row0, mergeMoved, () => true), mergeMoved);
          const ni = [], nl = [];
          for (const it of row.items) {
            const s = shiftItem(it, y);
            items.push(s);
            ni.push(s);
          }
          for (const it of row.borderItems) {
            const s = shiftItem(it, y);
            items.push(s);
            ni.push(s);
          }
          for (const l of row.lines) {
            const s = { ...l, y: l.y + y, baseline: l.baseline + y };
            lines.push(s);
            nl.push(s);
          }
          nest.push({ top: y, row, items: ni, lines: nl });
          y += row.height;
        }
        if (this.hfFrameTbl.length) {
          const fx = Math.min(...this.hfFrameTbl.map((it) => it.t === "glyphs" && it.glyphs[0] ? it.glyphs[0].x : Infinity));
          let at = items.length;
          for (let k = tblAt; k < items.length; k++) {
            const it = items[k];
            if (it.t === "glyphs" && it.glyphs[0] && it.glyphs[0].x >= fx - 10) {
              at = k;
              break;
            }
          }
          items.splice(at, 0, ...this.hfFrameTbl);
          this.hfFrameTbl = [];
        }
        prev = this.rowEndPrev();
        prevList = void 0;
      }
    });
    if (prev) y += prev.after;
    items.push(...floatItems);
    lines.push(...floatLines);
    return { items, lines, height: Math.max(y, floatBottom), ...alignBottom > Math.max(y, floatBottom) ? { alignH: alignBottom } : {}, ...cellShape ? { shape: true } : {}, ...keepNext ? { keepNext: true } : {}, ...paras.size ? { paras } : {}, ...nest.length ? { nest } : {} };
  }
  /** diagramando o conteúdo de uma célula (flutuantes ficam relativos à célula) */
  inCell = false;
  /** molduras do cabeçalho/rodapé à direita do início da linha: entram depois das linhas do âncora */
  hfFrameAfter = [];
  /** molduras do cabeçalho/rodapé ancoradas na tabela seguinte (entram na 1ª linha dela) */
  hfFrameTbl = [];
  /** conteúdo de caixa de texto: x da caixa na página (flutuantes dentro dela) */
  staticDx = 0;
  /** margens laterais da célula em diagramação (âncoras relativas à célula — oráculo cellwrap) */
  cellMar = null;
  /** fundo da coluna mais alta já deixada nesta página (seção de várias colunas) */
  colMaxY = 0;
  /** "depois" do parágrafo vazio de quebra contínua que não ocupa altura: o seguinte
   *  desconta (oráculo colbreak) */
  sectGapAfter = null;
  layoutCell(cell, x, width, env, ref, ps) {
    const prevInCell = this.inCell, prevMar = this.cellMar;
    this.inCell = true;
    this.cellMar = env.cellMar ?? null;
    try {
      return this.layoutCellIn(cell, x, width, env, ref, ps);
    } finally {
      this.inCell = prevInCell;
      this.cellMar = prevMar;
    }
  }
  layoutCellIn(cell, x, width, env, ref, ps) {
    const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
    const penv = { ...env.tablePPr ? { tablePPr: env.tablePPr } : {}, ...env.tableRPr ? { tableRPr: env.tableRPr } : {}, ...env.darkBackground ? { darkBackground: true } : {} };
    if (ps) penv.field = this.fieldValue(ps);
    if (this.inHf) penv.hf = true;
    const c = this.layoutStatic(blocks, x, width, penv, ref, ps, 0, this.cellNb.get(cell));
    if (cell.tcPr?.hideMark && blocks.every((b) => b.type === "paragraph" && !paraVisibility(this.ctx, b.paragraph, penv).visible)) return { ...c, height: 0 };
    const lastB = blocks[blocks.length - 1];
    if (cell.tcPr?.hideMark && blocks.length > 1 && lastB?.type === "paragraph" && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    if (blocks.length > 1 && lastB?.type === "paragraph" && blocks[blocks.length - 2]?.type === "table" && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    return c;
  }
  // ───────────────────────── espaçamento contextual em volta de tabelas ─────────────────────────
  // (oráculos autosp/autosp2) Para o contextualSpacing, os parágrafos seguem a ordem do
  // documento através da tabela: o de antes → 1º parágrafo da 1ª célula; o último de cada
  // célula → 1º da célula seguinte; o fim de cada linha é uma marca com o estilo de
  // parágrafo PADRÃO (não o da célula, nem o do parágrafo antes) → próxima linha / depois.
  cellNb = /* @__PURE__ */ new WeakMap();
  cellBlocks(cell) {
    return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
  }
  /** Estilo do 1º parágrafo (em ordem de documento) de uma sequência de blocos. */
  firstParaNeighbor(blocks) {
    const b = blocks[0];
    if (!b) return void 0;
    if (b.type === "paragraph") {
      const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
      return id ? { styleId: id } : {};
    }
    const c = b.rows[0]?.cells[0];
    return c ? this.firstParaNeighbor(this.cellBlocks(c)) : void 0;
  }
  /** Estilo do último parágrafo de uma célula (tabela no fim: a marca de fim de linha dela). */
  lastParaNeighbor(blocks) {
    const b = blocks[blocks.length - 1];
    if (!b) return void 0;
    if (b.type !== "paragraph") return this.rowEndNeighbor();
    const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
    return id ? { styleId: id } : {};
  }
  /** Marca de fim de linha da tabela: estilo de parágrafo padrão. */
  rowEndNeighbor() {
    const id = this.ctx.resolver.paraStyleId(void 0);
    return id ? { styleId: id } : {};
  }
  /** "Parágrafo anterior" depois de uma tabela: a marca de fim de linha (sem espaço próprio). */
  rowEndPrev() {
    return { after: 0, afterAuto: false, ...this.rowEndNeighbor(), contextual: false };
  }
  /** O "depois" do parágrafo antes da tabela some (contextual com o 1º parágrafo dela)? */
  dropsAfterBeforeTable(prev, table) {
    if (!prev.contextual) return false;
    const f = this.firstParaNeighbor([table]);
    return !!f && f.styleId === prev.styleId;
  }
  /** Registra os vizinhos de cada célula da tabela (`prev` = parágrafo antes dela). */
  assignCellNeighbors(table, prev) {
    table.rows.forEach((row, ri) => row.cells.forEach((cell, ci) => {
      const pv = ci > 0 ? this.lastParaNeighbor(this.cellBlocks(row.cells[ci - 1])) : ri > 0 ? this.rowEndNeighbor() : prev;
      const nx = ci + 1 < row.cells.length ? this.firstParaNeighbor(this.cellBlocks(row.cells[ci + 1])) : this.rowEndNeighbor();
      this.cellNb.set(cell, { ...pv ? { prev: pv } : {}, ...nx ? { next: nx } : {} });
    }));
  }
  collapse(after, before) {
    if (this.ctx.fmt.settings.compat["doNotUseHTMLParagraphAutoSpacing"]) return after + before;
    return Math.max(after, before);
  }
  /**
   * Bordas em grupo (oráculo pbdr): parágrafos seguidos com as mesmas bordas e
   * recuos formam uma caixa — o topo (espaço + espessura) só no 1º; entre eles
   * a borda "between" com o espaço dos DOIS lados; a base só no último.
   */
  borderTopExtent(p, prev) {
    const b = p.ppr.pBdr;
    if (prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr)) {
      const bt = b?.between;
      return bt && bt.val !== "none" && bt.val !== "nil" ? 2 * (bt.space ?? 0) * 20 + borderWidth(bt) : 0;
    }
    if (!b?.top || b.top.val === "none" || b.top.val === "nil") return 0;
    return (b.top.space ?? 0) * 20 + borderWidth(b.top) * (b.top.shadow ? 2 : 1);
  }
  borderBottomExtent(p, groupedNext = false) {
    const b = p.ppr.pBdr;
    if (groupedNext || !b?.bottom || b.bottom.val === "none" || b.bottom.val === "nil") return 0;
    return (b.bottom.space ?? 0) * 20 + borderWidth(b.bottom) * (b.bottom.shadow ? 2 : 1);
  }
  /** O bloco seguinte continua o grupo de bordas deste parágrafo? */
  groupsWithNext(p, next, env = {}) {
    if (!p.ppr.pBdr || !next || next.type !== "paragraph") return false;
    return bdrKey(resolvePPr(this.ctx, next.paragraph, env).ppr) === bdrKey(p.ppr);
  }
  /**
   * Número da linha (w:lnNumType) — medido no Word (oráculo lnnum): só linhas
   * do corpo (tabela e parágrafo com suppressLineNumbers não contam), vazio
   * conta; o 1º número é start+1; alinhado à direita em (coluna − distância,
   * auto = 360tw), mesma baseline, estilo Normal + "Line Number".
   */
  paintLineNumber(colX, baseline) {
    const ln = this.cur.geom.lnNum;
    const restart = ln.restart === "continuous" ? this.lnSect < 0 : ln.restart === "newSection" ? this.lnSect !== this.cur.geom.index : this.lnPage !== this.cur;
    if (restart) this.lnCount = ln.start;
    this.lnPage = this.cur;
    this.lnSect = this.cur.geom.index;
    this.lnCount++;
    if (this.lnCount % ln.countBy !== 0) return;
    const styles = this.ctx.fmt.styles.styles;
    const sid = Object.values(styles).find((d) => d.type === "character" && d.name?.toLowerCase() === "line number")?.styleId;
    const rpr = sid ? { rStyle: sid } : {};
    const para = { runs: [{ text: String(this.lnCount), props: runPropsFromRPr(rpr), rpr }], props: {}, ppr: {} };
    const np = prepareParagraph(this.ctx, para, { numbering: false });
    const line = new LineBreaker(this.ctx, np).next({ left: 0, right: 2e4 });
    const x = colX - ln.distance - line.width;
    paintLine(this.ctx, this.cur.body, line, x, baseline - line.baseline);
  }
  /** Sombreamento/bordas do parágrafo — inseridos em `at` (antes do texto já pintado). */
  paintBox(out, p, x, width, top, bottom, prev, at = out.length, groupedNext = false) {
    const hasFill = !!(p.ppr.shd && (p.ppr.shd.fill && p.ppr.shd.fill !== "auto" || p.ppr.shd.themeFill));
    if (!p.ppr.pBdr && !hasFill) return;
    const grouped = !!prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr);
    const left = x + p.indLeft + Math.min(0, p.firstLine);
    const right = x + width - p.indRight;
    const box = [];
    paintParaBox(this.ctx, box, p, p.ppr.pBdr, left, right, top, bottom, !grouped, !groupedNext, grouped);
    out.splice(at, 0, ...box);
  }
  // ───────────────────────── parágrafo no corpo (paginado) ─────────────────────────
  /** Lista (abstractNum) do parágrafo numerado/com marcador. */
  listOf(p) {
    const id = p.ppr.numPr?.numId;
    return id ? this.ctx.numbering.listKey(id) : void 0;
  }
  /** Passo da grade de linhas para um parágrafo do corpo (snapToGrid=0 desliga). */
  gridFor(p) {
    const pitch = this.cur?.geom.linePitch;
    return pitch && p.ppr.snapToGrid !== false ? pitch : void 0;
  }
  /** parágrafo de marca oculta que se junta ao parágrafo seguinte */
  pendingJoin = null;
  /** runs de parágrafos de marca excluída (revisão) que vão para o início do seguinte */
  pendingDel = null;
  /** o bloco anterior é uma tabela flutuante ancorada no texto (o parágrafo âncora
   *  empurrado para baixo dela tem o "antes" de novo — oráculo ftable2) */
  floatTableGap = false;
  /** âncora levada para a página da continuação da tabela flutuante: abaixo dela, o "antes" inteiro */
  carryAnchorGap = false;
  /**
   * Parágrafo de marca oculta + o seguinte: um parágrafo só, com as propriedades
   * (recuos, alinhamento…) do 1º e a marca do seguinte; o número que aparece é o
   * do 1º, mas o do seguinte também é consumido (oráculo numbering3, hidmark-*).
   */
  joinHidden(join, next, env) {
    const n = resolvePPr(this.ctx, next, env).ppr.numPr;
    if (n?.numId && env.numbering !== false) this.ctx.numbering.next(n.numId, n.ilvl ?? 0);
    const ppr = { ...join.para.ppr };
    if (next.ppr?.rPr) ppr.rPr = next.ppr.rPr;
    else delete ppr.rPr;
    return { ...join.para, ppr, runs: [...join.para.runs, ...next.runs] };
  }
  placeParagraph(para0, ref, blockIdx, g) {
    if (FRAME_SKIP.has(para0)) {
      const carry = FRAME_CARRY.get(para0);
      if (carry) {
        const fr = this.colFrame();
        this.placeFloat(carry, this.cur, fr.x, fr.w, this.y, this.cur.body, 0);
      }
      return;
    }
    if (para0.ppr?.markDeleted && !this.pendingJoin && blockIdx < g.blocks[1] && this.full.blocks[blockIdx + 1]?.type === "paragraph") {
      this.pendingDel = [...this.pendingDel ?? [], ...para0.runs];
      return;
    }
    if (para0.ppr?.markDeleted && !para0.runs.length && !this.pendingJoin && !this.pendingDel) return;
    const join = this.pendingJoin;
    this.pendingJoin = null;
    const env = { field: this.fieldValue(this.cur) };
    const merged = this.pendingDel ? { ...para0, runs: [...this.pendingDel, ...para0.runs] } : para0;
    this.pendingDel = null;
    const para = join ? this.joinHidden(join, merged, env) : merged;
    const p = prepareParagraph(this.ctx, para, join ? { ...env, numbering: false } : env);
    if (join) p.marker = join.marker;
    if (p.markStyle.hidden && blockIdx < g.blocks[1]) {
      if (!p.glyphs.length) return;
      if (this.full.blocks[blockIdx + 1]?.type === "paragraph") {
        this.pendingJoin = { para, marker: p.marker };
        return;
      }
    }
    if (blockIdx === g.blocks[1] && !p.glyphs.length && this.geoms[g.index + 1]?.type === "continuous" && (this.full.blocks[blockIdx - 1]?.type === "paragraph" || this.ctx.fmt.settings.compatibilityMode < 15)) {
      const sb = p.beforeAuto ? 280 : p.spaceBefore, sa = p.afterAuto ? 280 : p.spaceAfter;
      if (this.prev && !this.atTop) this.y += Math.max(0, this.collapse(this.prev.after, sb) - sb);
      this.prev = { after: 0, afterAuto: false, contextual: false };
      this.sectGapAfter = (this.geoms[g.index + 1]?.cols.length ?? 1) > 1 ? null : sa;
      return;
    }
    if (p.markStyle.hidden && !p.glyphs.length && blockIdx === this.full.blocks.length - 1 && !this.atTop) return;
    const ps0 = this.cur;
    if (p.glyphs[0]?.kind === "pb" && p.glyphs.length > 1) {
      const lastAfter = this.prev ? this.prev.after : 0;
      p.glyphs = p.glyphs.slice(1);
      this.newPage(this.cur.geom);
      this.topGapPrevAfter = lastAfter;
    }
    if (p.marker && p.glyphs.length === 1 && p.glyphs[0].kind === "pb" && !(this.ctx.fmt.settings.compatibilityMode < 15 && this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"])) p.marker = void 0;
    if (p.pageBreakBefore && !this.atTop) {
      const lastAfter = this.prev ? this.prev.after : 0;
      this.newPage(this.cur.geom);
      if (this.ctx.fmt.settings.compatibilityMode < 15) this.topGapPrevAfter = lastAfter;
    }
    const frameBase = this.colFrame();
    const avail = () => this.cur.bodyBottom - this.y;
    let before = p.beforeAuto ? this.firstInDoc ? 0 : 280 : p.spaceBefore;
    let prevAfter = this.prev ? this.prev.after : 0;
    let ctxAfter = null;
    if (this.prev && this.prev.styleId === p.styleId) {
      if (this.prev.contextual) {
        ctxAfter = prevAfter;
        prevAfter = 0;
      }
      if (p.contextual) before = 0;
    }
    const list = this.listOf(p);
    if (list && this.prev?.list === list) {
      if (p.beforeAuto) before = 0;
      if (this.prev.afterAuto) prevAfter = 0;
    }
    let gap = this.collapse(prevAfter, before);
    if (ctxAfter !== null) gap = Math.max(0, this.collapse(ctxAfter, before) - ctxAfter);
    if (this.sectGapAfter !== null) {
      gap = Math.max(0, this.collapse(this.sectGapAfter, before) - this.sectGapAfter);
      this.sectGapAfter = null;
    }
    const keepAfter = this.topGapPrevAfter;
    this.topGapPrevAfter = null;
    if (this.atTop && !this.firstInDoc) gap = keepAfter !== null ? Math.max(0, this.collapse(keepAfter, before) - keepAfter) : 0;
    let tailAt = -1;
    if (p.keepLines || p.keepNext) {
      const ls = this.paragraphLines(p, frameBase.w);
      const lastL = ls[ls.length - 1];
      const fullH = ls.reduce((a, l) => a + l.height, this.borderTopExtent(p, null) + this.borderBottomExtent(p));
      const closedH = fullH - lastL.height + this.closingFit(p, lastL);
      const need = gap + (p.keepNext ? fullH + this.nextBlockLead(blockIdx, g, frameBase.w) : closedH);
      const full = this.cur.bodyBottom - this.colTop;
      if (need > avail() && need <= full && !this.atTop) {
        if (!p.keepLines && gap + closedH > avail()) {
        } else if (!p.keepLines && this.ctx.fmt.settings.compatibilityMode >= 15 && ls.length > 1) {
          const widowOn = p.widowControl || p.ppr.widowControl === void 0;
          const m = widowOn ? ls.length - 2 >= 2 ? 2 : ls.length : 1;
          if (m >= ls.length) {
            this.breakColumn();
            gap = 0;
          } else tailAt = ls.length - m;
        } else {
          this.breakColumn();
          gap = 0;
        }
      }
    }
    const yPre = this.y;
    const gapIn = !this.atTop || this.firstInDoc || keepAfter !== null ? gap : 0;
    this.y += gapIn;
    if (this.atTop && gapIn > 0 && this.cur.floats.some((f) => f.bodyOnly)) {
      const fr = this.colFrame();
      const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, yPre, gapIn + markLineH(p));
      if (f0.skipTo !== void 0 && f0.skipTo > yPre) this.y = Math.max(this.y, f0.skipTo + gapIn);
    }
    const paraRef = yPre + Math.min(prevAfter, gapIn);
    const selfGap = gapIn - Math.min(prevAfter, gapIn);
    const ftGap = this.floatTableGap && !this.atTop ? gap : this.carryAnchorGap ? before : 0;
    this.floatTableGap = false;
    this.carryAnchorGap = false;
    this.firstInDoc = false;
    void ps0;
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const groupedNext = blockIdx + 1 <= g.blocks[1] && this.groupsWithNext(p, this.full.blocks[blockIdx + 1]);
    const widow = p.widowControl || p.ppr.widowControl === void 0;
    let frag = [];
    let fragTop = this.y;
    let fragHasFirst = true;
    const flushFrag = (isLast) => {
      if (!frag.length) return;
      const frameX = frag[0].frameX;
      const boxTop = fragTop;
      const boxAt = this.cur.body.length;
      for (const f of frag) {
        if (this.cur.geom.lnNum && !p.ppr.suppressLineNumbers) this.paintLineNumber(f.frameX, f.y + f.line.baseline);
        paintLine(this.ctx, this.cur.body, f.line, f.frameX, f.y);
        this.paintInlineDrawings(this.cur.body, f.line, f.frameX, f.y, this.cur);
        this.cur.page.lines.push(lineRecord(ref, p, f.line, f.frameX, f.y));
      }
      const last = frag[frag.length - 1];
      let bottom = last.y + last.line.height;
      if (isLast) bottom += this.borderBottomExtent(p, groupedNext);
      this.paintBox(this.cur.body, p, frameX, this.colFrame().w, boxTop, bottom, frag === null ? null : this.prev, boxAt, isLast && groupedNext);
      frag = [];
    };
    this.y += this.borderTopExtent(p, this.prev);
    let first = true;
    let lineNo = 0;
    const tailPs = this.cur;
    let anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: paraRef };
    let early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, void 0, paraRef);
    const over = early.filter((e) => followsText(floatAnchor(e.obj.run)) && e.obj.y + e.obj.h > this.cur.bodyBottom + 0.5);
    if (!this.atTop && over.length) {
      const paraBottom = this.y + this.paragraphHeight(p, frameBase.w);
      const lift = over.every((e) => this.cur.bodyBottom - e.obj.h >= paraBottom - 0.5);
      for (const e of early) this.unplaceFloat(e);
      if (lift) {
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, this.cur.bodyBottom, paraRef);
      } else {
        this.breakColumn();
        this.y += this.borderTopExtent(p, this.prev);
        anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
      }
    }
    let earlyAt = { ps: this.cur, x: this.colFrame().x };
    const earlyRuns = new Set(early.map((e) => e.obj.run));
    const hangs = blockIdx === g.blocks[1] && g.index < this.full.sections.length - 1 && p.glyphs.every((gl) => gl.kind === "obj" && gl.adv === 0);
    const frameHere = () => {
      const fr = this.colFrame();
      const lineH = markLineH(p);
      let frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      for (let k = 0; k < 8 && frame.skipTo !== void 0 && frame.skipTo > this.y; k++) {
        this.y = frame.skipTo;
        frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      }
      return frame;
    };
    do {
      const y0 = this.y;
      let frame = frameHere();
      const pushGap = ftGap > 0 ? ftGap : selfGap;
      if (first && pushGap > 0 && this.y > y0) {
        this.y += pushGap;
        frame = frameHere();
      }
      const mark = br.mark();
      let seg = this.pickSeg(br, frame);
      let line = br.next(seg.f);
      const textH = Math.min(line.height, line.baseline + line.desc);
      if (this.cur.floats.length && textH > markLineH(p) + 1) {
        const fr = this.colFrame();
        const f2 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, textH);
        if (f2.skipTo !== void 0 && f2.skipTo > this.y) {
          this.y = f2.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        } else if (narrower(f2, frame)) {
          frame = f2;
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      if (this.cur.floats.length && this.y > y0 + 0.5) {
        const textH2 = Math.min(line.height, line.baseline + line.desc);
        if (textH2 < markLineH(p) - 1) {
          const fr = this.colFrame();
          const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, y0, textH2);
          if (f0.skipTo === void 0 && !narrower(f0, frame)) {
            const yb = this.y;
            this.y = y0;
            br.reset(mark);
            const seg0 = this.pickSeg(br, f0);
            const line0 = br.next(seg0.f);
            if (Math.min(line0.height, line0.baseline + line0.desc) <= textH2 + 0.5) {
              frame = f0;
              seg = seg0;
              line = line0;
            } else {
              this.y = yb;
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            }
          }
        }
      }
      if (this.cur.floats.length && !line.last && line.end > line.start && line.end < p.glyphs.length) {
        const fr = this.colFrame();
        const narrowed = frame.left > p.indLeft + 0.5 || frame.right < fr.w - p.indRight - 0.5;
        const g0 = p.glyphs[line.end - 1], g1 = p.glyphs[line.end];
        const word = (g2) => g2.kind === "char" && !/\s/.test(g2.ch);
        if (narrowed && word(g0) && !g0.breakAfter && word(g1) && !line.placed[line.placed.length - 1]?.g.autoHyphen) {
          const lineH2 = Math.max(markLineH(p), line.height);
          let below = Infinity;
          for (const f of this.cur.floats) {
            if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through") continue;
            if (this.y + lineH2 <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
            below = Math.min(below, f.y + f.h + f.distB);
          }
          if (below < Infinity && below > this.y) {
            this.y = below;
            frame = frameHere();
            br.reset(mark);
            seg = this.pickSeg(br, frame);
            line = br.next(seg.f);
          }
        }
      }
      if (line.gapTab === "start" && this.cur.floats.length) {
        const lineH2 = Math.max(markLineH(p), line.height);
        let below = Infinity;
        for (const f of this.cur.floats) {
          if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through") continue;
          if (this.y + lineH2 <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
          below = Math.min(below, f.y + f.h + f.distB);
        }
        if (below < Infinity && below > this.y) {
          this.y = below;
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      if (this.cur.floats.length && line.last && this.ctx.fmt.settings.compatibilityMode < 15) {
        const aft = p.afterAuto ? 280 : p.spaceAfter;
        const fr = this.colFrame();
        const f3 = aft > 0 ? this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, line.height + aft) : void 0;
        if (f3?.skipTo !== void 0 && f3.skipTo > this.y) {
          this.y = f3.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      let noteNeed = this.noteNeed(p, line);
      let pageChanged = false;
      const breakOnly = line.breakAfter === "page" && !line.last && line.placed.every((pg) => pg.g.kind === "pb");
      const fitH = breakOnly ? 0 : p.lineRule === "exact" || p.lineRule === "atLeast" ? line.height : Math.min(line.height, line.baseline + line.desc);
      let noteCut = null;
      if (noteNeed.extra > 0 && !this.atTop && !hangs && this.y + this.noteLineFit(p, line) > this.cur.bodyBottom - noteNeed.extra + 0.05 && this.y + this.noteLineFit(p, line) <= this.cur.bodyBottom + 0.05) noteCut = this.notePartial(noteNeed.ids, this.y + this.noteLineFit(p, line));
      if (lineNo === tailAt && this.cur === tailPs && frag.length && !this.atTop) {
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
        pageChanged = true;
      } else if (!noteCut && this.y + (noteNeed.extra > 0 ? this.noteLineFit(p, line) : fitH) > this.cur.bodyBottom - noteNeed.extra + 0.05 && !this.atTop && !hangs) {
        const placedHere = frag.length;
        const moved = [];
        if (widow && placedHere === 1 && fragHasFirst && !first) {
          moved.push(frag.pop().line);
        } else if (widow && line.last && placedHere >= 2) {
          moved.push(frag.pop().line);
          if (frag.length === 1 && fragHasFirst) moved.unshift(frag.pop().line);
        }
        const allMoved = fragHasFirst && frag.length === 0;
        flushFrag(false);
        fragHasFirst = allMoved;
        this.breakColumn();
        fragTop = this.y;
        if (allMoved) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
        for (const m of moved) {
          const fx = this.colFrame().x;
          frag.push({ line: m, y: this.y, frameX: fx });
          this.y += m.height;
        }
        pageChanged = true;
      }
      if (first) {
        if (early.length && (earlyAt.ps !== this.cur || earlyAt.x !== this.colFrame().x)) {
          for (const e of early) this.unplaceFloat(e);
          early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
          earlyAt = { ps: this.cur, x: this.colFrame().x };
        }
        if (anchorAt.ps !== this.cur || this.y <= anchorAt.top + 0.5 || this.y > this.cur.bodyBottom) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: void 0 };
      }
      if (pageChanged) {
        const yTop = this.y;
        let nf = frameHere();
        if (first && fragHasFirst && !frag.length && pushGap > 0 && this.y > yTop + 0.01) {
          this.y += pushGap;
          nf = frameHere();
        }
        if (nf.left !== frame.left || nf.right !== frame.right || nf.segs || frame.segs) {
          br.reset(mark);
          frame = nf;
          seg = this.pickSeg(br, nf);
          line = br.next(seg.f);
          noteNeed = this.noteNeed(p, line);
        }
      }
      if (noteNeed.ids.length) this.reserveNotes(noteNeed.ids, pageChanged ? null : noteCut);
      frag.push({ line, y: this.y, frameX: this.colFrame().x });
      let lineH = line.height;
      line = this.moreSegs(br, frame, seg.k, line, (l) => {
        const nn = this.noteNeed(p, l);
        if (nn.ids.length) this.reserveNotes(nn.ids);
        frag.push({ line: l, y: this.y, frameX: this.colFrame().x });
        lineH = Math.max(lineH, l.height);
      });
      this.y += lineH;
      this.atTop = false;
      first = false;
      lineNo++;
      if (line.clear) {
        for (let k = 0; k < 8; k++) {
          const yy = this.y;
          const below = this.cur.floats.filter((f) => f.wrap !== "none" && f.y - f.distT < yy && f.y + f.h + f.distB > yy);
          if (!below.length) break;
          this.y = Math.max(...below.map((f) => f.y + f.h + f.distB));
        }
      }
      if (line.breakAfter === "page") {
        flushFrag(false);
        fragHasFirst = false;
        this.newPage(this.cur.geom);
        fragTop = this.y;
        this.atTop = true;
      } else if (line.breakAfter === "column") {
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
      }
    } while (!br.done());
    flushFrag(true);
    this.y += this.borderBottomExtent(p, groupedNext);
    for (const r of earlyRuns) this.prePlaced.add(r);
    this.placeFloats(p, anchorAt.ps, anchorAt.x, anchorAt.w, anchorAt.top, anchorAt.ps.body, 0, anchorAt.ref);
    for (const r of earlyRuns) this.prePlaced.delete(r);
    const lastGlyph = p.glyphs[p.glyphs.length - 1];
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["splitPgBreakAndParaMark"];
    if (lastGlyph?.kind === "pb" && !splitPg) this.atTop = true;
    this.prev = {
      after: p.afterAuto ? 280 : p.spaceAfter,
      afterAuto: p.afterAuto,
      ...list ? { list } : {},
      ...p.styleId ? { styleId: p.styleId } : {},
      contextual: p.contextual,
      ...p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {}
    };
  }
  // ───────────────────────── notas de rodapé ─────────────────────────
  noteCache = /* @__PURE__ */ new Map();
  /** Conteúdo diagramado de uma nota (largura do corpo da página). */
  noteContent(id) {
    let c = this.noteCache.get(id);
    if (!c) {
      const g = this.cur.geom;
      const blocks = this.full.footnoteBlocks?.get(id) ?? (this.full.footnotes.get(id) ?? []).map((paragraph) => ({ type: "paragraph", paragraph }));
      const num = this.ctx.footnoteNumber(id);
      const saved = this.ctx.numbering;
      this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      try {
        c = this.layoutStatic(blocks, g.marL, g.pageW - g.marL - g.marR, {
          field: (name) => name === "FOOTNOTEREF_MARK" ? String(num) : this.fieldValue(this.cur)(name)
        }, `fn${id}`);
      } finally {
        this.ctx.numbering = saved;
      }
      this.noteCache.set(id, c);
    }
    return c;
  }
  /** Notas de rodapé NOVAS referenciadas pelas linhas de texto de uma linha de tabela
   *  (cada linha diz o parágrafo de origem no ref: b3/r2/c0/b1…). */
  rowNoteIds(row) {
    const ids = [];
    for (const l of row.lines) {
      const para = this.paraByRef(l.ref);
      if (!para) continue;
      let off = 0;
      for (const r of para.runs) {
        const len = r.text.length;
        const id = r.noteRef?.kind === "footnote" ? r.noteRef.id : void 0;
        if (id !== void 0 && off + Math.max(len, 1) > l.start && off < Math.max(l.end, l.start + 1) && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
        off += len;
      }
    }
    return ids;
  }
  rowNoteExtra(row) {
    const ids = this.rowNoteIds(row);
    if (!ids.length) return 0;
    let extra = this.cur.notes.length ? 0 : this.separatorHeight();
    for (const id of ids) extra += this.noteContent(id).height;
    return extra;
  }
  /** Parágrafo do corpo pelo caminho do ref ("b3/r2/c0/b1"). */
  paraByRef(ref) {
    const seg = ref.split("/");
    const m = /^b(\d+)$/.exec(seg[0] ?? "");
    if (!m) return void 0;
    let block = this.full.blocks[+m[1]];
    for (let i = 1; i + 2 < seg.length + 1 && block; i += 3) {
      if (block.type !== "table") return void 0;
      const ri = /^r(\d+)$/.exec(seg[i] ?? ""), ci = /^c(\d+)$/.exec(seg[i + 1] ?? ""), bi = /^b(\d+)$/.exec(seg[i + 2] ?? "");
      if (!ri || !ci || !bi) return void 0;
      const row = block.rows[+ri[1]];
      let col = row?.trPr?.gridBefore ?? 0, cell;
      for (const c of row?.cells ?? []) {
        if (col === +ci[1]) {
          cell = c;
          break;
        }
        col += Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1);
      }
      if (!cell) return void 0;
      const blocks = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
      block = blocks[+bi[1]];
    }
    return block?.type === "paragraph" ? block.paragraph : void 0;
  }
  /** Altura do separador (1 linha do estilo Normal). */
  separatorHeight() {
    const ppr = { spacing: { before: 0, after: 0, line: 240, lineRule: "auto" } };
    const p = prepareParagraph(this.ctx, { runs: [], props: paraPropsFromPPr(ppr), ppr }, {});
    return new LineBreaker(this.ctx, p).next({ left: 0, right: 1e4 }).height;
  }
  /** Altura com que a linha que traz uma nota NOVA precisa caber acima das notas: a
   *  linha inteira (com a entrelinha extra) e, na última do parágrafo, o "depois"
   *  dele (oráculo fnsep, varreduras fsep-top* / fsep-a0-*) */
  noteLineFit(p, line) {
    return line.height + (line.last ? p.afterAuto ? 280 : p.spaceAfter : 0);
  }
  /** Notas NOVAS referenciadas na linha e o espaço extra que exigem. */
  noteNeed(p, line) {
    const ids = [];
    for (let k = line.start; k < line.end; k++) {
      const id = p.glyphs[k]?.noteId;
      if (id !== void 0 && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
    }
    if (!ids.length) return { ids, extra: 0 };
    let extra = this.cur.notes.length ? 0 : this.separatorHeight();
    for (const id of ids) extra += this.noteContent(id).height;
    return { ids, extra };
  }
  reserveNotes(ids, cut) {
    const ps = this.cur;
    for (const id of ids) {
      if (ps.notes.some((n) => n.id === id)) continue;
      if (!ps.notes.length) ps.noteArea += this.separatorHeight();
      const content = cut && cut.id === id ? cut.first : this.noteContent(id);
      ps.notes.push({ id, content });
      ps.noteArea += content.height;
      if (cut && cut.id === id) this.noteCarry.push({ id, content: cut.rest });
    }
    ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
  }
  /** notas que continuam na página seguinte (o resto de uma nota partida) */
  noteCarry = [];
  /** nota partida da linha de tabela que vai ser emitida */
  rowNoteCut = null;
  /** tabela do fluxo: os fundos de mescla vertical saem por página no fim (oráculo vmshd) */
  flowFills = false;
  /**
   * Nota NOVA que não cabe inteira com a linha da referência (que termina em `bottom`):
   * o começo dela fica nesta página — o que couber, com viúvas/órfãs da própria nota — e o
   * resto continua no pé da seguinte, antes das notas de lá (oráculo fncont). Só a última
   * das notas da linha parte; sem ao menos o começo permitido, null (a linha desce).
   */
  notePartial(ids, bottom) {
    if (!ids.length) return null;
    const ps = this.cur;
    let h = ps.notes.length ? 0 : this.separatorHeight();
    for (const id2 of ids.slice(0, -1)) h += this.noteContent(id2).height;
    const id = ids[ids.length - 1];
    const avail = ps.bodyBottom - bottom - h;
    if (avail <= 0) return null;
    const sp = splitContent(this.noteContent(id), avail);
    return sp && sp[0].lines.length && sp[1].lines.length ? { id, first: sp[0], rest: sp[1] } : null;
  }
  /** Separador + notas, alinhados ao fundo do corpo (medido no Word). */
  paintNotes(ps) {
    if (!ps.notes.length) return;
    const g = ps.geom;
    let y = ps.bodyBottomBase - ps.noteArea;
    const sepH = this.separatorHeight();
    const ly = y + sepH * 0.62;
    ps.body.push({ t: "line", x1: g.marL, y1: ly, x2: g.marL + 2880, y2: ly, color: "000000", widthPt: 0.5 });
    y += sepH;
    for (const n of ps.notes) {
      for (const it of n.content.items) ps.body.push(shiftItem(it, y));
      y += n.content.height;
    }
  }
  /** Linhas de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  paragraphLines(p, width) {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const ls = [];
    do
      ls.push(br.next({ left: p.indLeft, right: width - p.indRight }));
    while (!br.done());
    return ls;
  }
  /** Altura com que a linha que fecha um bloco precisa caber: a entrelinha extra
   *  (múltipla > 1) fica abaixo do texto e pode passar da margem (oráculos pagefit, keepfit). */
  closingFit(p, l) {
    return p.lineRule === "exact" || p.lineRule === "atLeast" ? l.height : Math.min(l.height, l.baseline + l.desc);
  }
  /** Altura total de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  paragraphHeight(p, width) {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    let h = this.borderTopExtent(p, null) + this.borderBottomExtent(p);
    do
      h += br.next({ left: p.indLeft, right: width - p.indRight }).height;
    while (!br.done());
    return h;
  }
  /** Altura da 1ª linha (e cadeia keepNext) do bloco seguinte. */
  nextBlockLead(blockIdx, g, width) {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || blockIdx + 1 > g.blocks[1]) return 0;
    const saved = this.ctx.saveFlow();
    try {
      const curB = this.full.blocks[blockIdx];
      const from = curB?.type === "paragraph" ? prepareParagraph(this.ctx, curB.paragraph, {}) : void 0;
      let after = from ? from.afterAuto ? 280 : from.spaceAfter : 0;
      if (nb.type === "table") {
        const t = layoutTable(this.ctx, nb, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref), "preview");
        const r0 = t.rows[0];
        if (!r0) return 0;
        const startNeed = (r, cap) => r.cantSplit || (r.natural ?? r.height) < r.height ? r.height : Math.min(r.height, cap);
        const r1 = t.rows[1];
        let chain = 0, k = 0;
        while (t.rows[k]?.keepNext && t.rows[k + 1]) {
          chain += t.rows[k].height;
          k++;
        }
        const lead = k > 0 ? chain + startNeed(t.rows[k], 400) : r1 && r0.keepNext ? r0.height + startNeed(r1, 400) : startNeed(r0, r0.natural ?? r0.height);
        const dropped = !!from && this.dropsAfterBeforeTable({ after, afterAuto: from.afterAuto, contextual: from.contextual, ...from.styleId ? { styleId: from.styleId } : {} }, nb);
        return (dropped ? 0 : after) + lead;
      }
      const q = prepareParagraph(this.ctx, nb.paragraph, {});
      let before = q.spaceBefore;
      let ctxAfter = null;
      if (from && from.styleId === q.styleId) {
        if (from.contextual) {
          ctxAfter = after;
          after = 0;
        }
        if (q.contextual) before = 0;
      }
      const gap = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(after, before);
      if (q.keepNext) return gap + this.paragraphHeight(q, width) + this.nextBlockLead(blockIdx + 1, g, width);
      if (q.keepLines) {
        const ls = this.paragraphLines(q, width);
        const lastL = ls[ls.length - 1];
        return gap + ls.reduce((a, l) => a + l.height, this.borderTopExtent(q, null)) - lastL.height + this.closingFit(q, lastL);
      }
      const br = new LineBreaker(this.ctx, q, this.gridFor(q));
      const qs = [];
      do
        qs.push(br.next({ left: q.indLeft, right: width - q.indRight }));
      while (!br.done() && qs.length < 4);
      const widow = q.widowControl || q.ppr.widowControl === void 0;
      const n = !widow ? 1 : br.done() && qs.length <= 3 ? qs.length : 2;
      const take = qs.slice(0, n);
      return gap + take.reduce((a, l) => a + l.height, 0) - take[n - 1].height + this.closingFit(q, take[n - 1]);
    } finally {
      this.ctx.restoreFlow(saved);
    }
  }
  // ───────────────────────── tabelas no corpo ─────────────────────────
  placeTable(table, ref, blockIdx = -1) {
    if (table.rows.every((r) => isHiddenRow(this.ctx, r))) return;
    this.sectGapAfter = null;
    const fr = this.colFrame();
    const fp = table.tblPr?.tblpPr;
    if (fp && fp.tblpYSpec !== "inline") {
      const textAnchor = fp.vertAnchor !== "page" && fp.vertAnchor !== "margin";
      if (textAnchor) {
        if (this.prev && !this.atTop && this.prev.after > 0 && !this.prev.contextual) {
          this.y += this.prev.after;
          this.prev = { ...this.prev, after: 0 };
        }
        this.floatTableGap = true;
      }
      const ltp = blockIdx >= 0 && !textAnchor ? this.lateTables.get(blockIdx) : void 0;
      for (let k = 0; ltp && k < 20 && this.pages.length - 1 < ltp.page; k++) this.breakColumn();
      if (blockIdx >= 0 && this.placedTables.has(blockIdx)) {
        const lt = this.lateTables.get(blockIdx);
        if (lt && !textAnchor && this.pages.length - 1 > lt.page && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.length - 1, flowY: this.y });
        if (this.lateSplit.delete(blockIdx) && this.floatCarry.length && this.col === this.cur.geom.cols.length - 1) {
          this.breakColumn();
          this.carryAnchorGap = true;
        }
        return;
      }
      if (blockIdx >= 0) this.placedTables.add(blockIdx);
      const t2 = layoutTable(this.ctx, table, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
      const items = [];
      let flowY = this.y;
      if (textAnchor) {
        let f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        for (let k = 0; k < 8 && f.skipTo !== void 0 && f.skipTo > flowY; k++) {
          flowY = f.skipTo;
          f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        }
        const top = fp.tblpYSpec ? flowY : flowY + (fp.tblpY ?? 0);
        const r0 = t2.rows[0];
        if (this.noBreakWrapped()) {
          if (!this.atTop && flowY + t2.rows.reduce((a, r) => a + r.height, 0) > this.cur.bodyBottom + 0.5) {
            this.breakColumn();
            flowY = this.y;
          }
        } else if (!this.atTop && r0 && top + r0.height > this.cur.bodyBottom + 0.5) {
          const avail = this.cur.bodyBottom - top;
          const onlyMin = (r0.natural ?? r0.height) <= avail + 0.5;
          const parts = onlyMin || r0.cantSplit ? null : r0.split?.(avail) ?? null;
          if (!(parts && parts[0].height > 0)) {
            this.breakColumn();
            flowY = this.y;
          }
        }
      }
      const nFloats = this.cur.floats.length;
      const nCarry = this.floatCarry.length;
      this.placeFloatingTable(t2, fp, this.cur, flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      const box = this.cur.floats.length > nFloats ? this.cur.floats[this.cur.floats.length - 1] : void 0;
      if (blockIdx >= 0 && box) {
        const g = this.cur.geom;
        const hit = this.cur.page.lines.some((l) => /^b\d+$/.test(l.ref) && l.y + l.height > box.y - box.distT + 1 && l.y < box.y + box.h + box.distB - 1 && box.x + box.w + box.distR > g.marL && box.x - box.distL < g.pageW - g.marR);
        if (hit && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.indexOf(this.cur), flowY });
      }
      if (this.floatCarry.length > nCarry && this.col === this.cur.geom.cols.length - 1) {
        this.breakColumn();
        this.carryAnchorGap = true;
      }
      return;
    }
    this.floatTableGap = false;
    if (this.prev) {
      this.y += this.atTop || this.dropsAfterBeforeTable(this.prev, table) ? 0 : this.prev.after;
    }
    this.assignCellNeighbors(table, this.prev ? { ...this.prev.styleId ? { styleId: this.prev.styleId } : {} } : void 0);
    this.prev = null;
    this.firstInDoc = false;
    this.topGapPrevAfter = null;
    const t = layoutTable(this.ctx, table, fr.x, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
    if (blockIdx >= 0) this.pinFloatsOverTable(t, blockIdx);
    this.lastRowEmit = null;
    const headerRows = [];
    for (const r of t.rows) {
      if (r.header) headerRows.push(r);
      else break;
    }
    const mergeMoved = /* @__PURE__ */ new Set();
    const rowEmits = [];
    const flowMerges = [];
    this.flowFills = true;
    t.rows.forEach((row0, ri) => {
      let row = row0;
      if (ri === 0 && headerRows.length && headerRows.length < t.rows.length && !this.atTop && this.ctx.fmt.settings.compatibilityMode >= 15) {
        const avail = this.cur.bodyBottom - this.y;
        const hh = headerRows.reduce((a, r) => a + r.height, 0);
        if (hh <= avail + 0.5 && !this.rowCanStart(t.rows[headerRows.length], avail - hh)) this.breakColumn();
      }
      if (row.keepNext && !this.atTop && ri + 1 < t.rows.length) {
        const avail = this.cur.bodyBottom - this.y;
        let chainH = row.height, k = ri + 1;
        while (k + 1 < t.rows.length && t.rows[k].keepNext && chainH + t.rows[k].height <= avail + 0.5) {
          chainH += t.rows[k].height;
          k++;
        }
        if (chainH <= avail + 0.5 && !this.rowCanStart(t.rows[k], avail - chainH)) {
          if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
          this.breakColumn();
          if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
        }
      }
      for (let guard = 0; guard < 500; guard++) {
        this.y = this.belowFloats(t.x, t.width, this.y, row.lines.length ? Math.min(row.height, ...row.lines.map((l) => l.y + l.height)) : row.height);
        const avail = Math.min(this.cur.bodyBottom - this.rowNoteExtra(row), this.floatFloor(t.x, t.width, this.y)) - this.y;
        const bw = ri < t.rows.length - 1 ? row.breakW ?? 0 : 0;
        if (this.atTop && row.topCut && row.height - row.topCut + bw <= avail + 0.5) row = atPageTop(row);
        if (row.height + bw <= avail + 0.05) break;
        if (!this.atTop && this.y + row.height + bw <= Math.min(this.cur.bodyBottom, this.floatFloor(t.x, t.width, this.y)) + 0.05) {
          const cut = this.notePartial(this.rowNoteIds(row), this.y + row.height + bw);
          if (cut) {
            this.rowNoteCut = cut;
            break;
          }
        }
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rowEmits.push({ ri, ps: this.cur, y: this.y, h: parts[0].height, at: this.cur.body.length });
          this.emitRow(parts[0]);
          row = parts[1];
        } else if (this.atTop) break;
        if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
        this.breakColumn();
        if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
      }
      if (row === row0 || row.cut !== void 0) row = dropMoved(mergeTextFirst(t.rows, ri, row, mergeMoved, (h) => this.y + h <= this.cur.bodyBottom + 0.5 && this.belowFloats(t.x, t.width, this.y, h) === this.y), mergeMoved);
      let grow = 0;
      for (const mt of row0.mergeText ?? []) {
        const s = rowEmits.find((e) => e.ri === mt.start);
        if (!s || s.ps === this.cur || !mt.content) continue;
        for (const o of [...mt.items, ...mt.lines]) mergeMoved.add(o);
        const off = (mt.band ?? 0) + (mt.marT ?? 0);
        flowMerges.push({ start: mt.start, end: ri, col: mt.col, content: mt.content, off, ...mt.vAlign ? { vAlign: mt.vAlign } : {} });
        let rest = mt.content, segPs = null, segTop = 0, segBot = 0, segCut = 0;
        for (const e of rowEmits) {
          if (e.ri < mt.start || e.ps === this.cur || !rest) continue;
          if (e.ps !== segPs) {
            if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
            segPs = e.ps;
            segTop = e.y;
            segCut = e.cut ?? 0;
          }
          segBot = e.y + e.h;
        }
        if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
        const hereE = rowEmits.find((e) => e.ri >= mt.start && e.ps === this.cur);
        const here = hereE?.y ?? this.y;
        const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
        if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (this.y - here + row.height));
      }
      if (row0.mergeText && mergeMoved.size) row = dropMoved(row, mergeMoved);
      rowEmits.push({ ri, ps: this.cur, y: this.y, h: row.height + Math.max(0, grow), at: this.cur.body.length, cut: row.cut ?? 0 });
      this.emitRow(row);
      if (grow > 0.5) this.y += grow;
    });
    this.flowFills = false;
    const ins = [];
    for (const m of flowMerges) {
      const segs = [];
      for (const e of rowEmits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at, cut: e.cut ?? 0 });
      }
      const colAt = (t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0) - (t.rows[m.start]?.mergeFills?.length ?? 0);
      let c = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part = c, rest = null;
        if (k < segs.length - 1) {
          const sp = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp) [part, rest] = sp;
          else {
            part = { items: [], lines: [], height: 0 };
            rest = c;
          }
        }
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === "center" ? free / 2 : m.vAlign === "bottom" ? free : 0);
        ins.push({ ps: sg.ps, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
        c = rest;
      });
    }
    t.rows.forEach((r0, start) => {
      for (const f of r0.mergeFills ?? []) {
        const short = t.rows.slice(start, f.end + 1).reduce((a, r) => a + r.height, 0) - f.item.h;
        const segs = [];
        for (const e of rowEmits) {
          if (e.ri < start || e.ri > f.end) continue;
          const last = segs[segs.length - 1];
          if (last && last.ps === e.ps) last.bottom = e.y + e.h;
          else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at });
        }
        segs.forEach((sg, k) => {
          const h = sg.bottom - sg.top - (k === segs.length - 1 ? short : 0);
          if (h > 0) ins.push({ ps: sg.ps, at: sg.at, items: [{ ...f.item, y: sg.top, h }] });
        });
      }
    });
    for (const n of ins.sort((a, b) => b.at - a.at)) n.ps.body.splice(n.at, 0, ...n.items);
    this.prev = this.rowEndPrev();
  }
  /** Topo do flutuante com quebra abaixo de `y` que cruza [x, x+w] e vai até o pé do corpo
   *  (o conteúdo da tabela não passa dele nesta página); sem nenhum, o pé do corpo. */
  floatFloor(x, w, y) {
    const fls = this.cur.floats;
    let floor = this.cur.bodyBottom;
    for (const f of fls) {
      const top = f.y - f.distT;
      if (f.wrap === "none" || top <= y + 0.5 || f.y + f.h + f.distB < this.cur.bodyBottom - 0.5) continue;
      if (x + w > f.x - f.distL && x < f.x + f.w + f.distR) floor = Math.min(floor, top);
    }
    return floor;
  }
  /** Topo livre para uma faixa [x, x+w] × [y, y+h] que não contorna flutuantes (linha de tabela). */
  belowFloats(x, w, y, h) {
    const fls = this.cur.floats;
    for (let k = 0; k < 8; k++) {
      const hit = fls.find((f) => f.wrap !== "none" && y + h > f.y - f.distT + 0.5 && y < f.y + f.h + f.distB - 0.5 && x + w > f.x - f.distL && x < f.x + f.w + f.distR);
      if (!hit) break;
      y = hit.y + hit.h + hit.distB;
    }
    return y;
  }
  /** Topo mínimo de um flutuante com quebra relativo ao texto: corpo (modo 15) ou página (≤ 14). */
  floatMinY(ps) {
    return this.ctx.fmt.settings.compatibilityMode >= 15 ? ps.bodyTop : 0;
  }
  /** flutuantes com y já decidido (presos antes do parágrafo âncora) */
  pinnedFloats = /* @__PURE__ */ new Map();
  /**
   * Flutuante com quebra do parágrafo SEGUINTE à tabela, relativo a ele e com
   * deslocamento negativo que cai sobre a tabela (oráculo toptbl): o Word o posiciona
   * pela posição INICIAL do parágrafo (logo após a tabela), preso no topo da margem;
   * a tabela desce para baixo dele e o objeto fica onde foi posto, mesmo que o
   * parágrafo desça com a tabela.
   */
  pinFloatsOverTable(t, blockIdx) {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || nb.type !== "paragraph") return;
    const runs = nb.paragraph.runs.filter((run) => {
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      const anc = floatAnchor(run);
      return !!fl && !!anc && WRAPPING.has(anc.wrap ?? "") && !anc.simplePos && (anc.posV.relativeFrom ?? "paragraph") === "paragraph" && anc.posV.align === void 0 && anc.posV.pct === void 0 && (anc.posV.offset ?? 0) < 0;
    });
    if (!runs.length) return;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    const top = this.y;
    const q = this.ctx.pure(() => prepareParagraph(this.ctx, nb.paragraph, {}));
    let before = q.beforeAuto ? 280 : q.spaceBefore;
    if (q.contextual && q.styleId === this.rowEndNeighbor().styleId) before = 0;
    const anchorTop0 = top + H + this.collapse(0, before);
    const fr = this.colFrame();
    const g = this.cur.geom;
    let newTop = top;
    for (const run of runs) {
      const anc = floatAnchor(run);
      const w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
      const h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
      const y = Math.max(this.floatMinY(this.cur), anchorTop0 + (anc.posV.offset ?? 0));
      const hRef = horizRef(anc.posH.relativeFrom ?? "column", g, fr.x, fr.w);
      const x = alignPos(anc.posH.align, anc.posH.offset, hRef.x, hRef.w, w, anc.posH.pct, g.pageW, anc.effectExtent?.l, anc.effectExtent?.r);
      const wb = anc.wrap === "tight" || anc.wrap === "through" ? anc.wrapBox : void 0;
      const by0 = wb ? y + h * wb.y0 : y, by1 = wb ? y + h * wb.y1 : y + h;
      const bx0 = wb ? x + w * wb.x0 : x, bx1 = wb ? x + w * wb.x1 : x + w;
      const overV = by0 - (anc.distT ?? 0) < top + H && by1 + (anc.distB ?? 0) > top;
      const overH = bx0 - (anc.distL ?? 0) < t.x + t.width && bx1 + (anc.distR ?? 0) > t.x;
      if (!overV || !overH) continue;
      this.pinnedFloats.set(run, { ps: this.cur, y });
      newTop = Math.max(newTop, by1 + (anc.distB ?? 0));
    }
    if (newTop > top) this.y = newTop;
  }
  /**
   * Tabela flutuante (oráculo ftable): âncoras página/margem/texto; tblpX/Y
   * ou tblpX/YSpec (left/center/right, top/center/bottom). No modo 15 a borda
   * externa fica na posição; nos antigos, o TEXTO da 1ª célula (como tblInd).
   * `t` foi diagramada com frameX = 0; os itens são deslocados para a posição.
   */
  placeFloatingTable(t, fp, ps, flowY, colX, colW, out, yOrigin, wrap, split = false) {
    const g = ps.geom;
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    const refW = legacy ? Math.max(0, t.width + t.x - (t.effR ?? 108)) : t.width;
    const [aL, aR] = fp.horzAnchor === "page" ? [0, g.pageW] : fp.horzAnchor === "margin" ? [g.marL, g.pageW - g.marR] : [colX, colX + colW];
    const xs = fp.tblpXSpec;
    const refX = xs === "center" ? aL + (aR - aL - refW) / 2 : xs === "right" || xs === "outside" ? aR - refW : aL + (xs ? 0 : fp.tblpX ?? 0);
    const [aT, aB] = fp.vertAnchor === "page" ? [0, g.pageH] : fp.vertAnchor === "margin" ? [g.marT, g.pageH - g.marB] : [flowY, flowY];
    const ys = fp.tblpYSpec;
    let top = ys === "center" ? aT + (aB - aT - H) / 2 : ys === "bottom" ? aB - H : aT + (ys ? 0 : fp.tblpY ?? 0);
    if (this.inHf && top + H > g.pageH) {
      top = Math.max(0, g.pageH - H);
      wrap = false;
    }
    this.emitFloatRows(t, t.rows, fp, ps, refX, top, out, yOrigin, wrap, split);
  }
  /** Linhas de uma tabela flutuante a partir de `top`. Com `split`, as que não
   *  cabem na página seguem para o topo da próxima (o texto as contorna lá). */
  emitFloatRows(t, rows, fp, ps, refX, top, out, yOrigin, wrap, split) {
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    let y = top;
    let n = 0;
    rows = [...rows];
    let fl = split ? this.floatFlow.get(t) : void 0;
    if (split && !fl && t.rows.some((r) => r.mergeText?.length)) {
      fl = { idx: new Map(t.rows.map((r, k) => [r, k])), moved: /* @__PURE__ */ new Set(), seen: /* @__PURE__ */ new Set(), emits: [], merges: [] };
      this.floatFlow.set(t, fl);
    }
    const vmMoved = fl?.moved ?? /* @__PURE__ */ new Set();
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      const ri = fl?.idx.get(row);
      if (split && n === 0 && i === 0 && row !== t.rows[0] && row.topCut && y + row.height - row.topCut <= ps.bodyBottom + 0.5) {
        row = atPageTop(row);
        rows[i] = row;
      }
      const bw = i < rows.length - 1 ? row.breakW ?? 0 : 0;
      let cutHere = false;
      if (split && !this.noBreakWrapped() && y + row.height + bw > ps.bodyBottom + 0.05) {
        const avail = ps.bodyBottom - y;
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin || row.cantSplit ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rows.splice(i, 1, parts[0], parts[1]);
          cutHere = true;
          if (fl && ri !== void 0) {
            fl.idx.set(parts[0], ri);
            fl.idx.set(parts[1], ri);
          }
          row = parts[0];
        } else if (n > 0) break;
      }
      const rk = t.rows.indexOf(row);
      if (rk >= 0) row = dropMoved(mergeTextFirst(t.rows, rk, row, vmMoved, (h) => !split || y + h <= ps.bodyBottom + 0.5), vmMoved);
      else if (vmMoved.size) row = dropMoved(row, vmMoved);
      let grow = 0;
      if (fl && ri !== void 0) {
        for (const mt of t.rows[ri].mergeText ?? []) {
          if (fl.seen.has(mt)) continue;
          const s = fl.emits.find((e) => e.ri === mt.start);
          if (!s || s.ps === ps || !mt.content) continue;
          fl.seen.add(mt);
          for (const o of [...mt.items, ...mt.lines]) fl.moved.add(o);
          const off = (mt.band ?? 0) + (mt.marT ?? 0);
          fl.merges.push({ start: mt.start, end: ri, col: mt.col, content: mt.content, off, ...mt.vAlign ? { vAlign: mt.vAlign } : {} });
          let rest = mt.content, segPs = null, segTop = 0, segBot = 0, segCut = 0;
          for (const e of fl.emits) {
            if (e.ri < mt.start || e.ps === ps || !rest) continue;
            if (e.ps !== segPs) {
              if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
              segPs = e.ps;
              segTop = e.y;
              segCut = e.cut ?? 0;
            }
            segBot = e.y + e.h;
          }
          if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
          const hereE = fl.emits.find((e) => e.ri >= mt.start && e.ps === ps);
          const here = hereE?.y ?? y;
          const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
          if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (y - here + row.height));
        }
        if (fl.moved.size) row = dropMoved(row, fl.moved);
        fl.emits.push({ ri, ps, y, h: row.height + Math.max(0, grow), out, at: out.length, yOrigin, refX, cut: row.cut ?? 0 });
      }
      for (const it of row.items) out.push(shiftItem(it, y - yOrigin, refX));
      for (const it of row.borderItems) out.push(shiftItem(it, y - yOrigin, refX));
      for (const l of row.lines) ps.page.lines.push({ ...l, x: l.x + refX, y: l.y + y, baseline: l.baseline + y, ...l.chars ? { chars: l.chars.map((c) => ({ ...c, x: c.x + refX })) } : {} });
      y += row.height + (grow > 0.5 ? grow : 0);
      n++;
      if (cutHere) break;
    }
    if (wrap) {
      ps.floats.push({
        // caixa = bordas externas (modo antigo: a grade fica na margem da célula antes do texto)
        x: refX + (legacy ? t.x - (t.borderLeft ?? 0) / 2 : 0),
        y: top,
        w: t.width + (legacy ? t.borderLeft ?? 0 : 0),
        h: y - top,
        wrap: "square",
        distL: fp.leftFromText ?? 0,
        distR: fp.rightFromText ?? 0,
        distT: fp.topFromText ?? 0,
        distB: fp.bottomFromText ?? 0
      });
    }
    if (n < rows.length) this.floatCarry.push({ t, rows: rows.slice(n), fp, refX });
    else if (fl) {
      this.floatFlow.delete(t);
      this.flowFloatMerges(t, fl);
    }
  }
  /** Texto das mesclas verticais de uma tabela flutuante que partiu: cada parte no topo
   *  da mescla na sua página (1ª parte na posição da coluna entre as células) */
  flowFloatMerges(t, fl) {
    const ins = [];
    for (const m of fl.merges) {
      const segs = [];
      for (const e of fl.emits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, out: e.out, at: e.at, yOrigin: e.yOrigin, refX: e.refX, cut: e.cut ?? 0 });
      }
      const colAt = t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0;
      let c = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part = c, rest = null;
        if (k < segs.length - 1) {
          const sp = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp) [part, rest] = sp;
          else {
            part = { items: [], lines: [], height: 0 };
            rest = c;
          }
        }
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === "center" ? free / 2 : m.vAlign === "bottom" ? free : 0);
        ins.push({ out: sg.out, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy - sg.yOrigin, sg.refX)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, x: l.x + sg.refX, y: l.y + dy, baseline: l.baseline + dy, ...l.chars ? { chars: l.chars.map((ch) => ({ ...ch, x: ch.x + sg.refX })) } : {} });
        c = rest;
      });
    }
    for (const n of ins.sort((a, b) => b.at - a.at)) n.out.splice(n.at, 0, ...n.items);
  }
  /** w:doNotBreakWrappedTables: tabelas flutuantes não partem (o modo 15 ignora — oráculo ftnobreak) */
  noBreakWrapped() {
    return this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat["doNotBreakWrappedTables"];
  }
  /** Continuação de tabelas flutuantes divididas: topo do corpo da página nova. */
  placeFloatCarry() {
    const carry = this.floatCarry;
    this.floatCarry = [];
    for (const c of carry) {
      const items = [];
      this.emitFloatRows(c.t, c.rows, c.fp, this.cur, c.refX, this.cur.bodyTop, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
    }
  }
  /** A linha pode começar no espaço dado (inteira, ou dividida se puder)? */
  rowCanStart(row, avail) {
    if (row.height <= avail + 0.5) return true;
    if (row.cantSplit || (row.natural ?? row.height) <= avail + 0.5) return false;
    const parts = row.split?.(avail) ?? null;
    return !!parts && parts[0].height > 0;
  }
  emitRow(row) {
    const ids = this.rowNoteIds(row);
    if (ids.length) this.reserveNotes(ids, this.rowNoteCut);
    this.rowNoteCut = null;
    this.lastRowEmit = { row, y: this.y };
    const skip = this.flowFills && row.mergeFills ? new Set(row.mergeFills.map((f) => f.item)) : null;
    for (const it of row.items) if (!skip?.has(it)) this.cur.body.push(shiftItem(it, this.y));
    for (const it of row.borderItems) this.cur.body.push(shiftItem(it, this.y));
    for (const l of row.lines) this.cur.page.lines.push({ ...l, y: l.y + this.y, baseline: l.baseline + this.y });
    this.y += row.height;
    this.atTop = false;
  }
  // ───────────────────────── objetos flutuantes ─────────────────────────
  /** Quadro de uma linha descontando floats com contorno (wrap) que a cruzam. */
  wrapFrame(frame, frameX, y, lineH = 240, ps = this.cur) {
    const floats = ps.floats;
    if (!floats.length) return frame;
    const { left, right } = frame;
    const crossed = right < left;
    let tl = left, tr = right;
    if (crossed) {
      const col = this.colFrame();
      if (Math.abs(frameX - col.x) < 0.5) {
        tl = Math.min(left, 0);
        tr = Math.max(left, col.w);
      } else tr = left;
    }
    let skipTo;
    let free = [[tl, tr]];
    let hit = false;
    let minBottom = Infinity;
    for (const f of floats) {
      if (f.wrap !== "square" && f.wrap !== "tight" && f.wrap !== "through" && f.wrap !== "topAndBottom") continue;
      if (f.bodyOnly && this.inHf) continue;
      const top = f.y - f.distT, bottom = f.y + f.h + f.distB;
      if (y + lineH <= top + 0.5 || y >= bottom - 0.5) continue;
      const fl = f.x - f.distL - frameX, fr = f.x + f.w + f.distR - frameX;
      if (fr <= tl || fl >= tr) continue;
      if (f.wrap === "topAndBottom") {
        skipTo = Math.max(skipTo ?? 0, bottom);
        continue;
      }
      hit = true;
      minBottom = Math.min(minBottom, bottom);
      let bl = fl, bh = fr;
      const side = f.side ?? "bothSides";
      if (side === "left") bh = Infinity;
      else if (side === "right") bl = -Infinity;
      else if (side === "largest") {
        if (fl - tl >= tr - fr) bh = Infinity;
        else bl = -Infinity;
      }
      const next = [];
      for (const [a, b] of free) {
        if (bh <= a || bl >= b) {
          next.push([a, b]);
          continue;
        }
        if (bl > a) next.push([a, bl]);
        if (bh < b) next.push([bh, b]);
      }
      free = next;
    }
    if (hit) {
      const col = this.colFrame();
      const cR = Math.abs(frameX - col.x) < 0.5 ? col.w : Infinity, cL = cR === Infinity ? -Infinity : 0;
      const ext = (a, b) => cR === Infinity ? [a, b] : [a <= tl + 0.5 ? Math.min(a, cL) : a, b >= tr - 0.5 ? Math.max(b, cR) : b];
      free = free.filter(([a, b]) => {
        const [ea, eb] = ext(a, b);
        return Math.min(eb, cR) - Math.max(ea, cL) >= MIN_GAP;
      });
      let best;
      for (const iv of free) if (!best || iv[1] - iv[0] > best[1] - best[0]) best = iv;
      if (!best) skipTo = Math.max(skipTo ?? 0, minBottom);
      else if (skipTo === void 0) return crossed ? { left, right } : { left: best[0], right: best[1], gap: true, ...free.length > 1 ? { segs: free } : {} };
    }
    if (skipTo !== void 0) return { ...frame, skipTo };
    return { left, right };
  }
  /**
   * Vão onde começa a linha: com o objeto no meio dela, o 1º vão (da esquerda)
   * em que a próxima palavra cabe — vão estreito demais fica vazio (oráculo
   * wrapsides). Nenhum cabe: o mais largo, sozinho (k = fim).
   */
  pickSeg(br, frame) {
    if (!frame.segs) return { k: -1, f: frame };
    const need = br.peekWordWidth();
    for (let k = 0; k < frame.segs.length; k++) {
      const [a, b] = frame.segs[k];
      const nx = frame.segs[k + 1];
      if (b - a + 0.01 >= need) return { k, f: { left: a, right: b, gap: true, ...nx ? { next: { left: nx[0], right: nx[1] } } : {} } };
    }
    return { k: frame.segs.length, f: { left: frame.left, right: frame.right, gap: true } };
  }
  /** linhas dos vãos seguintes da mesma linha (depois do vão `k`) */
  moreSegs(br, frame, k, last, put) {
    if (!frame.segs) return last;
    for (let j = k + 1 + (last.spanned ? 1 : 0); j < frame.segs.length && !br.done() && !last.breakAfter && !last.clear && last.gapTab !== "break"; j++) {
      const [a, b] = frame.segs[j];
      if (b - a + 0.01 < br.peekWordWidth()) continue;
      const nx = frame.segs[j + 1];
      last = br.next({ left: a, right: b, gap: true, ...nx ? { next: { left: nx[0], right: nx[1] } } : {} });
      put(last);
      if (last.spanned) j++;
    }
    return last;
  }
  placeFloats(p, ps, colX, colW, paraTop, flowItems, yOrigin, paraRef) {
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      if (!fl || this.prePlaced.has(run)) continue;
      if (this.onlyTextFloats && !followsText(floatAnchor(run))) continue;
      this.placeFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin, void 0, paraRef);
    }
  }
  placeFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin, clampBottom, paraRef) {
    const g = ps.geom;
    const anchor = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
    let w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
    let h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
    const wrapsText = !!anchor && anchor.wrap !== "none";
    const behind = !(wrapsText && this.ctx.fmt.settings.compatibilityMode >= 15) && (!!anchor?.behindDoc || !!run.image?.behindDoc || !!run.textbox?.behindDoc);
    let tbContent = null;
    let tbFinal = null;
    if (run.textbox) {
      const tb = run.textbox;
      const ins = tbInsets(tb, this.ctx.fmt.theme, w, h);
      const blocks = tb.blocks ?? tb.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
      const env = { field: this.fieldValue(ps), darkBackground: isDark(resolveDrawingColor(run.textbox.shape?.fill, this.ctx.fmt.theme)), ...this.inHf ? { hf: true } : {} };
      let inner = w - ins.l - ins.r;
      const fi = FRAME_INFO.get(tb);
      if (fi?.autoWidth) {
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, colW, env, "txbx"));
        w = inner = Math.max(1, probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, colW - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0));
      }
      if (tb.noWrap) {
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, 31680, env, "txbx"));
        const natural = probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, 31680 - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0);
        if (tb.autoFit) {
          w = natural + ins.l + ins.r;
          inner = natural;
        } else inner = Math.max(inner, natural);
      }
      const iw = Math.max(1, inner);
      tbContent = this.ctx.pure(() => this.layoutStatic(blocks, 0, iw, env, "txbx"));
      tbFinal = (bx, by) => {
        const prevDx = this.staticDx;
        this.staticDx = bx + ins.l;
        try {
          return this.layoutStatic(blocks, 0, iw, env, "txbx", ps, by + ins.t);
        } finally {
          this.staticDx = prevDx;
        }
      };
      if (tb.autoFit) h = tbContent.height + ins.t + ins.b;
      if (fi) h = fi.hRule === "exact" ? fi.h : fi.hRule === "atLeast" ? Math.max(fi.h, tbContent.height) : tbContent.height;
    }
    let x, y;
    if (anchor?.simplePos) {
      x = anchor.simplePos.x;
      y = anchor.simplePos.y;
    } else {
      const hRef = horizRef(anchor?.posH.relativeFrom ?? "column", g, colX, colW);
      x = alignPos(anchor?.posH.align, anchor?.posH.offset, hRef.x, hRef.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const pin2 = this.pinnedFloats.get(run);
      if (pin2 && pin2.ps === ps) y = pin2.y;
      else {
        const vFrom0 = anchor?.posV.relativeFrom ?? "paragraph";
        const vRef = vertRef(vFrom0, g, ps, vFrom0 === "paragraph" && paraRef !== void 0 ? paraRef : paraTop);
        y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef.y, vRef.h, h, anchor?.posV.pct, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
        if (clampBottom !== void 0 && y + h > clampBottom) y = clampBottom - h;
        if (!this.inHf && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) y = Math.max(y, this.floatMinY(ps));
        else if (this.inHf && this.ctx.fmt.settings.compatibilityMode < 15 && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) {
          y = Math.max(y, 0);
          x = Math.max(x, 0);
        }
      }
    }
    if (this.inCell && !anchor?.simplePos) {
      const vFrom = anchor?.posV.relativeFrom ?? "paragraph";
      const cm = this.cellMar ?? { l: 0, r: 0 };
      const hFrom = anchor?.posH.relativeFrom ?? "column";
      const [hx, hw] = hFrom === "rightMargin" || hFrom === "outsideMargin" ? [colX + colW, cm.r] : hFrom === "leftMargin" || hFrom === "insideMargin" ? [colX - cm.l, cm.l] : [colX, colW];
      const outCell = anchor?.layoutInCell === false && this.ctx.fmt.settings.compatibilityMode < 15;
      if (outCell) {
        const fr = this.colFrame(), hr = horizRef(hFrom, g, fr.x, fr.w);
        x = alignPos(anchor?.posH.align, anchor?.posH.offset, hr.x, hr.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      } else x = alignPos(anchor?.posH.align, anchor?.posH.offset, hx, hw, w, void 0, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const vRef = outCell && (vFrom === "paragraph" || vFrom === "line") ? yOrigin - (cm.t ?? 0) : vFrom === "paragraph" ? paraRef ?? paraTop : vFrom === "line" ? paraTop : yOrigin;
      y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef, 0, h, void 0, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
      if (anchor && WRAPPING.has(anchor.wrap) && (vFrom === "paragraph" || vFrom === "line")) y = Math.max(y, yOrigin);
      if (tbFinal) tbContent = this.ctx.pure(() => tbFinal(x, y));
      const cellItems = this.paintObject(run, x, y, w, h, tbContent, ps);
      if (behind) flowItems.unshift(...cellItems);
      else flowItems.push(...cellItems);
      const wb = anchor && (anchor.wrap === "tight" || anchor.wrap === "through") ? anchor.wrapBox : void 0;
      const cbox = anchor && WRAPPING.has(anchor.wrap) && anchor.layoutInCell !== false ? { x: wb ? x + w * wb.x0 : x, y: wb ? y + h * wb.y0 : y, w: wb ? w * (wb.x1 - wb.x0) : w, h: wb ? h * (wb.y1 - wb.y0) : h, wrap: anchor.wrap, side: anchor.wrapText ?? "bothSides", distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 } : void 0;
      return { ps, target: [], zobj: { z: 0, seq: this.zSeq++, items: cellItems }, obj: { run, x, y, w, h, layer: behind ? "behind" : "front", hf: this.inHf }, ...cbox ? { box: cbox } : {} };
    }
    const target = this.inHf ? behind ? ps.hfBehind : ps.hfFront : behind ? ps.behind : ps.front;
    if (tbFinal) tbContent = tbFinal(x, y);
    const items = this.paintObject(run, x, y, w, h, tbContent, ps);
    const obj = { run, x, y, w, h, layer: behind ? "behind" : "front", hf: this.inHf };
    (ps.page.objects ??= []).push(obj);
    const frameFlow = this.inHf && !!run.textbox && FRAME_INFO.has(run.textbox);
    let inFlow;
    if (frameFlow) {
      const rel = yOrigin ? items.map((it) => shiftItem(it, -yOrigin)) : items;
      if (x > colX + 20) this.hfFrameAfter.push(...rel);
      else flowItems.push(...rel);
      inFlow = { arr: flowItems, items: rel };
    }
    const zobj = { z: anchor?.relativeHeight ?? 0, seq: this.zSeq++, items: frameFlow ? [] : items };
    if (!frameFlow) target.push(zobj);
    let box;
    const hfLegacy = this.inHf && this.ctx.fmt.settings.compatibilityMode < 15;
    if (anchor && WRAPPING.has(anchor.wrap)) {
      const wb = anchor.wrap === "tight" || anchor.wrap === "through" ? anchor.wrapBox : void 0;
      const bx = wb ? x + w * wb.x0 : x, by = wb ? y + h * wb.y0 : y;
      const bw = wb ? w * (wb.x1 - wb.x0) : w, bh = wb ? h * (wb.y1 - wb.y0) : h;
      const fb = { x: bx, y: by, w: bw, h: bh, wrap: anchor.wrap, side: anchor.wrapText ?? "bothSides", distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 };
      if (hfLegacy) fb.bodyOnly = true;
      box = fb;
    }
    if (box) {
      ps.floats.push(box);
      if (!this.inHf && !followsText(anchor) && !this.prePlaced.has(run)) {
        const pi = this.pages.indexOf(ps);
        const b = box;
        const hit = pi >= 0 && ps.page.lines.some((l) => !/^(hdr|ftr|txbx)/.test(l.ref) && l.y + l.height > b.y - b.distT && l.y < b.y + b.h + b.distB && b.x + b.w + b.distR > ps.geom.marL && b.x - b.distL < ps.geom.pageW - ps.geom.marR);
        if (hit) (this.lateFound.get(pi) ?? this.lateFound.set(pi, []).get(pi)).push(run);
      }
    }
    return { ps, target, zobj, obj, ...box ? { box } : {}, ...inFlow ? { inFlow } : {} };
  }
  /** Desfaz um flutuante colocado (parágrafo que mudou de página). */
  unplaceFloat(r) {
    const rm = (arr, v) => {
      const i = arr ? arr.indexOf(v) : -1;
      if (i >= 0) arr.splice(i, 1);
    };
    rm(r.target, r.zobj);
    if (r.inFlow) for (const it of r.inFlow.items) rm(r.inFlow.arr, it);
    rm(r.ps.page.objects, r.obj);
    if (r.box) rm(r.ps.floats, r.box);
    if (r.flow) this.ctx.restoreFlow(r.flow);
  }
  /**
   * Flutuantes do parágrafo do corpo posicionados ANTES das linhas, para que o
   * próprio texto do parágrafo os contorne (como no cabeçalho). Só os
   * de quebra que afeta o texto; os demais seguem depois das linhas.
   */
  placeFloatsEarly(p, ps, colX, colW, paraTop, clampBottom, paraRef) {
    const out = [];
    let flow;
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
      if (!fl || !anc || !WRAPPING.has(anc.wrap ?? "") || this.prePlaced.has(run)) continue;
      flow ??= this.ctx.saveFlow();
      out.push({ ...this.placeFloat(run, ps, colX, colW, paraTop, ps.body, 0, clampBottom !== void 0 && followsText(anc) ? clampBottom : void 0, paraRef), flow });
    }
    return out;
  }
  /** Desenha imagem/forma/caixa/grupo no retângulo dado. */
  /** Grupo de desenho e caixa de texto EM LINHA (wp:inline): desenhados como os
   *  flutuantes, na caixa do glifo — o paintLine só desenha imagem e forma (corpus t15) */
  paintInlineDrawings(out, line, frameX, top, ps) {
    for (const pg of line.placed) {
      const r = pg.g.obj;
      if (pg.g.kind !== "obj" || !r || pg.g.adv <= 0 || !r.group && !r.textbox || r.image || r.shape) continue;
      const w = r.group?.widthTwips ?? r.textbox?.widthTwips ?? 0, h = r.group?.heightTwips ?? r.textbox?.heightTwips ?? 0;
      const x = frameX + pg.x, y = top + line.baseline - pg.g.style.shift - h;
      let tc = null;
      if (r.textbox) {
        const ins = tbInsets(r.textbox, this.ctx.fmt.theme, w, h);
        const blocks = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
        tc = this.layoutStatic(blocks, 0, Math.max(1, w - ins.l - ins.r), { darkBackground: isDark(resolveDrawingColor(r.textbox.shape?.fill, this.ctx.fmt.theme)) }, "itb", ps);
      }
      const drawn = this.paintObject(r, x, y, w, h, tc, ps ?? this.cur);
      if (out === this.cur.body) this.cur.front.push({ z: 0, seq: this.zSeq++, items: drawn });
      else out.push(...drawn);
    }
  }
  paintObject(run, x, y, w, h, tbContent, ps = this.cur, inGroup = false) {
    const out = [];
    const theme = this.ctx.fmt.theme;
    if (run.image && isEmf(run.image.data)) {
      out.push({ t: "clip", op: "push", x, y, w, h }, ...renderEmf(this.ctx, run.image.data, { x, y, w, h }), { t: "clip", op: "pop" });
    } else if (run.image && isWmf(run.image.data)) {
      out.push({ t: "clip", op: "push", x, y, w, h }, ...renderWmf(this.ctx, run.image.data, { x, y, w, h }), { t: "clip", op: "pop" });
    } else if (run.image) {
      const im = run.image;
      out.push({
        t: "image",
        x,
        y,
        w,
        h,
        image: im,
        ...im.crop ? { crop: im.crop } : {},
        ...im.style?.rot ? { rot: im.style.rot } : {},
        ...im.style?.flipH ? { flipH: true } : {},
        ...im.style?.flipV ? { flipV: true } : {}
      });
    } else if (run.shape) {
      const s = run.shape.style;
      const fill = resolveDrawingColor(s.fill, theme);
      const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
      const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? "000000", widthPt: lw, ...s.line.dash ? { dash: s.line.dash } : {} } : void 0;
      out.push({ t: "shape", x, y, w, h, style: s, ...fill ? { fill } : {}, ...stroke ? { stroke } : {}, ...run.shape.line ? { line: run.shape.line } : {}, ...shapeExtras(s, theme) });
    } else if (run.textbox) {
      const tb = run.textbox;
      const s = tb.shape;
      if (s && (s.fill || s.line)) {
        const fill = resolveDrawingColor(s.fill, theme);
        const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
        const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? "000000", widthPt: lw } : void 0;
        out.push({ t: "shape", x, y, w, h, style: s, ...fill ? { fill } : {}, ...stroke ? { stroke } : {}, ...shapeExtras(s, theme) });
      }
      if (tbContent) {
        const ins = tbInsets(tb, this.ctx.fmt.theme, w, h);
        const rot = tb.rot ?? s?.rot ?? 0;
        if (rot) out.push({ t: "xform", op: "push", m: rotation(x + w / 2, y + h / 2, rot) });
        if (tb.wordArt && tbContent.lines.length) {
          const x0 = Math.min(...tbContent.lines.map((l) => l.x)), x1 = Math.max(...tbContent.lines.map((l) => l.x + l.width));
          const iw = Math.max(1, w - ins.l - ins.r), ih = Math.max(1, h - ins.t - ins.b);
          const sx = iw / Math.max(1, x1 - x0), sy = ih / Math.max(1, tbContent.height);
          out.push({ t: "xform", op: "push", m: [sx, 0, 0, sy, x + ins.l - x0 * sx, y + ins.t] });
          for (const it of tbContent.items) out.push(it.t === "glyphs" ? { ...it, asPath: true } : it);
          out.push({ t: "xform", op: "pop" });
        } else {
          let dy = y + ins.t;
          const free = h - ins.t - ins.b - tbContent.height;
          if (tb.vAnchor === "ctr" && free > 0) dy += free / 2;
          else if (tb.vAnchor === "b" && free > 0) dy += free;
          out.push({ t: "clip", op: "push", x, y, w, h });
          const raster = rot % 90 !== 0;
          const outside = (r) => r.y >= y + h || r.y + r.h <= y || r.x >= x + w || r.x + r.w <= x;
          let skip = 0;
          for (const it of tbContent.items) {
            if (skip) {
              if (it.t === "clip") skip += it.op === "push" ? 1 : -1;
              continue;
            }
            if (it.t === "clip" && it.op === "push" && it.y !== void 0 && it.w !== void 0 && it.h !== void 0 && outside({ x: (it.x ?? 0) + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) {
              skip = 1;
              continue;
            }
            if (it.t === "image" && outside({ x: it.x + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) continue;
            const s2 = shiftItem(it, dy, x + ins.l);
            const curves = raster || inGroup && s2.t === "glyphs" && s2.scaleX !== void 0 && s2.scaleX !== 1;
            out.push(curves && s2.t === "glyphs" ? { ...s2, asPath: true } : s2);
          }
          out.push({ t: "clip", op: "pop" });
        }
        if (rot) out.push({ t: "xform", op: "pop" });
      }
    } else if (run.group) {
      const gr = run.group;
      for (const item of gr.items) {
        const { run: r, x: ix, y: iy, w: iw, h: ih } = groupChild(gr, item, x, y, w, h);
        let tc = null;
        if (r.textbox) {
          const ins = tbInsets(r.textbox, this.ctx.fmt.theme, iw, ih);
          const blocks = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: "paragraph", paragraph }));
          tc = this.layoutStatic(blocks, 0, Math.max(1, iw - ins.l - ins.r), { field: this.fieldValue(ps), darkBackground: isDark(resolveDrawingColor(r.textbox.shape?.fill, this.ctx.fmt.theme)), ...this.inHf ? { hf: true } : {} }, "grp", ps);
        }
        out.push(...this.paintObject(r, ix, iy, iw, ih, tc, ps, true));
      }
    }
    return out;
  }
};
function blocksOfParas(set) {
  const conv = (ps) => ps?.map((paragraph) => ({ type: "paragraph", paragraph }));
  const out = {};
  if (set.default) out.default = conv(set.default);
  if (set.first) out.first = conv(set.first);
  if (set.even) out.even = conv(set.even);
  return out;
}
function horizRef(from, g, colX, colW) {
  switch (from) {
    case "page":
      return { x: 0, w: g.pageW };
    case "margin":
      return { x: g.marL, w: g.pageW - g.marL - g.marR };
    case "leftMargin":
    case "insideMargin":
      return { x: 0, w: g.marL };
    case "rightMargin":
    case "outsideMargin":
      return { x: g.pageW - g.marR, w: g.marR };
    case "character":
      return { x: colX, w: colW };
    default:
      return { x: colX, w: colW };
  }
}
function vertRef(from, g, ps, paraTop) {
  switch (from) {
    case "page":
      return { y: 0, h: g.pageH };
    case "margin": {
      const top = Math.max(g.marT, ps?.bodyTop ?? g.marT);
      return { y: top, h: g.pageH - top - g.marB };
    }
    case "topMargin":
    case "insideMargin":
      return { y: 0, h: g.marT };
    case "bottomMargin":
    case "outsideMargin":
      return { y: g.pageH - g.marB, h: g.marB };
    default:
      return { y: paraTop, h: 0 };
  }
  void ps;
}
function tbInsets(tb, theme, w, h) {
  const ins0 = tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  const tr = tb.geom && w !== void 0 && h !== void 0 ? textRectInsets(tb.geom, w, h) : null;
  const ins = tr ? { l: ins0.l + tr.l, t: ins0.t + tr.t, r: ins0.r + tr.r, b: ins0.b + tr.b } : ins0;
  const li = tb.lineInset;
  const lw = li ? li.w ?? (li.ref ? theme?.lineWidthsPt?.[li.ref - 1] ?? [1, 1.5, 2][li.ref - 1] ?? 0.75 : 0) : tb.shape?.line?.widthPt ?? 0;
  const half = lw * 10;
  return half ? { l: ins.l + half, t: ins.t + half, r: ins.r + half, b: ins.b + half } : ins;
}
function textRectInsets(g, w, h) {
  switch (g.prst) {
    case "roundRect": {
      const i = Math.min(w, h) * (g.adj?.["adj"] ?? 16667) / 1e5 * 0.29289;
      return { l: i, t: i, r: i, b: i };
    }
    case "ellipse": {
      const k = 0.5 - Math.SQRT1_2 / 2;
      return { l: w * k, t: h * k, r: w * k, b: h * k };
    }
    case "triangle": {
      const x1 = w * (g.adj?.["adj"] ?? 5e4) / 2e5;
      return { l: x1, t: h / 2, r: w / 2 - x1, b: 0 };
    }
    case "diamond":
      return { l: w / 4, t: h / 4, r: w / 4, b: h / 4 };
    default:
      return null;
  }
}
function alignPos(align, offset, base, span, size, pct, pageSpan, e0 = 0, e1 = 0) {
  if (align && (e0 || e1)) return alignPos(align, offset, base, span, size + e0 + e1, pct, pageSpan) + e0;
  if (align) {
    switch (align) {
      case "center":
        return base + (span - size) / 2;
      case "right":
      case "bottom":
      case "outside":
        return base + span - size;
      default:
        return base;
    }
  }
  if (pct !== void 0) return base + pct / 1e5 * pageSpan;
  return base + (offset ?? 0);
}
function lineRecord(ref, p, line, frameX, top) {
  const gs = p.glyphs;
  const first = gs[line.start];
  const lastG = gs[Math.max(line.start, line.end - 1)];
  const start = first ? first.offset : 0;
  const end = lastG ? lastG.offset + (lastG.ch.length || 1) : start;
  const chars = line.placed.filter((pg) => pg.g.kind !== "pb" && pg.g.kind !== "cb" && !pg.g.autoHyphen).map((pg) => ({ o: pg.g.offset, x: frameX + pg.x, w: pg.w }));
  return {
    ref,
    start,
    end,
    x: frameX + line.xStart,
    y: top,
    height: line.height,
    baseline: top + line.baseline,
    width: line.width,
    chars
  };
}
function cullOffPage(items, pageW, pageH) {
  const stack = [];
  let m = null;
  const outside = /* @__PURE__ */ new Set();
  const lineIn = /* @__PURE__ */ new Set();
  for (const it of items) {
    if (it.t === "xform") {
      if (it.op === "push" && it.m) {
        stack.push(m);
        const n = it.m;
        m = m ? [
          m[0] * n[0] + m[2] * n[1],
          m[1] * n[0] + m[3] * n[1],
          m[0] * n[2] + m[2] * n[3],
          m[1] * n[2] + m[3] * n[3],
          m[0] * n[4] + m[2] * n[5] + m[4],
          m[1] * n[4] + m[3] * n[5] + m[5]
        ] : n;
      } else if (it.op === "pop") m = stack.pop() ?? null;
      continue;
    }
    if (it.t !== "glyphs" || !it.glyphs.length) continue;
    const em = it.sizePt * 20;
    const box = it.lineBox ?? { asc: em, desc: em * 0.3, lead: 0 };
    let x0 = Infinity, x1 = -Infinity;
    for (const g of it.glyphs) {
      x0 = Math.min(x0, g.x);
      x1 = Math.max(x1, g.x + em);
    }
    const frameL = it.glyphs[0].x - box.lead;
    x0 = Math.min(x0, frameL);
    x1 = Math.max(x1, frameL);
    const y0 = it.y - box.asc, y1 = it.y + box.desc;
    let bx0 = x0, bx1 = x1, by0 = y0, by1 = y1;
    if (m) {
      const mm = m;
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py]) => [mm[0] * px + mm[2] * py + mm[4], mm[1] * px + mm[3] * py + mm[5]]);
      bx0 = Math.min(...pts.map((q) => q[0]));
      bx1 = Math.max(...pts.map((q) => q[0]));
      by0 = Math.min(...pts.map((q) => q[1]));
      by1 = Math.max(...pts.map((q) => q[1]));
    }
    if (bx1 <= 0 || bx0 >= pageW || by1 <= 0 || by0 >= pageH) outside.add(it);
    else if (it.lineBox) lineIn.add(it.lineBox.line);
  }
  if (!outside.size) return items;
  return items.filter((it) => !outside.has(it) || it.t === "glyphs" && !!it.lineBox && lineIn.has(it.lineBox.line));
}
function rotation(cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
}
function bdrKey(ppr) {
  return ppr.pBdr ? JSON.stringify([ppr.pBdr, ppr.ind ?? null]) : void 0;
}
var ABSOLUTE_V = /* @__PURE__ */ new Set(["page", "margin", "topMargin", "bottomMargin", "insideMargin", "outsideMargin"]);
function shiftLine(l, dy) {
  return { ...l, y: l.y + dy, baseline: l.baseline + dy };
}
var WRAPPING = /* @__PURE__ */ new Set(["square", "tight", "through", "topAndBottom"]);
var MIN_GAP = 359.5;
function floatAnchor(run) {
  return run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
}
function followsText(a) {
  return !!a && !a.simplePos && !ABSOLUTE_V.has(a.posV.relativeFrom ?? "paragraph");
}
function narrower(a, b) {
  return a.left > b.left + 0.5 || a.right < b.right - 0.5 || (a.segs?.length ?? 0) !== (b.segs?.length ?? 0);
}
function markLineH(p) {
  const mm = faceMetrics(p.markFace.font);
  return Math.round((mm.ascent + mm.descent) * p.markStyle.sizePt * 20);
}
function scratchPage(ps) {
  return {
    ...ps,
    page: { ...ps.page, items: [], lines: [], objects: [] },
    behind: [],
    hf: [],
    body: [],
    front: [],
    hfBehind: [],
    hfFront: [],
    floats: [...ps.floats],
    notes: []
  };
}

// ../docx-layout/src/images.ts
function jpegInfo(b) {
  if (b[0] !== 255 || b[1] !== 216) return null;
  let i = 2;
  let adobe = false;
  while (i + 4 < b.length) {
    if (b[i] !== 255) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 255) {
      i++;
      continue;
    }
    if (m === 216 || m === 1 || m >= 208 && m <= 215) {
      i += 2;
      continue;
    }
    const len = b[i + 2] << 8 | b[i + 3];
    if (m === 238 && b[i + 4] === 65 && b[i + 5] === 100) adobe = true;
    if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) {
      if (i + 9 >= b.length) return null;
      const height = b[i + 5] << 8 | b[i + 6];
      const width = b[i + 7] << 8 | b[i + 8];
      const components = b[i + 9];
      return { width, height, components, adobe };
    }
    i += 2 + len;
  }
  return null;
}
var PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
function decodePng(b) {
  for (let k = 0; k < 8; k++) if (b[k] !== PNG_SIG[k]) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 8;
  let width = 0, height = 0, depth = 8, ctype = 0, interlace = 0;
  let palette = null;
  let trns = null;
  const idat = [];
  while (pos + 8 <= b.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = dv.getUint32(pos + 8);
      height = dv.getUint32(pos + 12);
      depth = b[pos + 16];
      ctype = b[pos + 17];
      interlace = b[pos + 20];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (!width || !height) return null;
  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  let o = 0;
  for (const c of idat) {
    z.set(c, o);
    o += c.length;
  }
  let raw;
  try {
    raw = unzlibSync(z);
  } catch {
    return null;
  }
  const channels = ctype === 0 ? 1 : ctype === 2 ? 3 : ctype === 3 ? 1 : ctype === 4 ? 2 : 4;
  const bitsPP = channels * depth;
  const bpp = Math.max(1, bitsPP >> 3);
  const out = new Uint8Array(width * height * 4);
  const pass = (rp, w, h, put) => {
    if (w === 0 || h === 0) return rp;
    const stride = Math.ceil(w * bitsPP / 8);
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const ft = raw[rp++];
      const line = raw.slice(rp, rp + stride);
      rp += stride;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        const up = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let v = line[i];
        if (ft === 1) v += a;
        else if (ft === 2) v += up;
        else if (ft === 3) v += a + up >> 1;
        else if (ft === 4) {
          const pp = a + up - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
        }
        line[i] = v & 255;
      }
      for (let x = 0; x < w; x++) {
        const rawSample = (ch) => {
          if (depth === 8) return line[x * channels + ch];
          if (depth === 16) {
            const i = (x * channels + ch) * 2;
            return line[i] << 8 | line[i + 1];
          }
          const bit = (x * channels + ch) * depth;
          const byte = line[bit >> 3];
          const shift = 8 - depth - (bit & 7);
          return byte >> shift & (1 << depth) - 1;
        };
        const sample = (ch) => {
          if (depth === 8) return line[x * channels + ch];
          if (depth === 16) return line[(x * channels + ch) * 2];
          const v = rawSample(ch);
          return ctype === 3 ? v : Math.round(v * 255 / ((1 << depth) - 1));
        };
        const key = (k) => trns[k * 2] << 8 | trns[k * 2 + 1];
        let px;
        if (ctype === 0) {
          const g = sample(0);
          const transparent = !!trns && trns.length >= 2 && key(0) === rawSample(0);
          px = [g, g, g, transparent ? 0 : 255];
        } else if (ctype === 2) {
          const transparent = !!trns && trns.length >= 6 && key(0) === rawSample(0) && key(1) === rawSample(1) && key(2) === rawSample(2);
          px = [sample(0), sample(1), sample(2), transparent ? 0 : 255];
        } else if (ctype === 3) {
          const i = sample(0);
          px = palette ? [palette[i * 3] ?? 0, palette[i * 3 + 1] ?? 0, palette[i * 3 + 2] ?? 0, trns && i < trns.length ? trns[i] : 255] : [0, 0, 0, 255];
        } else if (ctype === 4) {
          const g = sample(0);
          px = [g, g, g, sample(1)];
        } else px = [sample(0), sample(1), sample(2), sample(3)];
        put(x, y, px);
      }
      prev = line;
    }
    return rp;
  };
  const putAt = (ox, oy, dx, dy) => (x, y, px) => {
    const X = ox + x * dx, Y = oy + y * dy;
    const k = (Y * width + X) * 4;
    out[k] = px[0];
    out[k + 1] = px[1];
    out[k + 2] = px[2];
    out[k + 3] = px[3];
  };
  if (!interlace) pass(0, width, height, putAt(0, 0, 1, 1));
  else {
    const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
    let rp = 0;
    for (const [ox, oy, dx, dy] of passes) {
      const w = Math.ceil((width - ox) / dx), h = Math.ceil((height - oy) / dy);
      rp = pass(rp, w > 0 ? w : 0, h > 0 ? h : 0, putAt(ox, oy, dx, dy));
    }
  }
  return { width, height, data: out };
}
function decodeGif(b) {
  if (b[0] !== 71 || b[1] !== 73 || b[2] !== 70) return null;
  const width = b[6] | b[7] << 8, height = b[8] | b[9] << 8;
  const flags = b[10];
  let pos = 13;
  let gct = null;
  if (flags & 128) {
    const n = 3 * (1 << (flags & 7) + 1);
    gct = b.subarray(pos, pos + n);
    pos += n;
  }
  let transparent = -1;
  const out = new Uint8Array(width * height * 4);
  while (pos < b.length) {
    const t = b[pos++];
    if (t === 33) {
      const label = b[pos++];
      if (label === 249 && b[pos + 1] & 1) transparent = b[pos + 4];
      while (pos < b.length && b[pos]) pos += b[pos] + 1;
      pos++;
    } else if (t === 44) {
      const ix = b[pos] | b[pos + 1] << 8, iy = b[pos + 2] | b[pos + 3] << 8;
      const iw = b[pos + 4] | b[pos + 5] << 8, ih = b[pos + 6] | b[pos + 7] << 8;
      const lf = b[pos + 8];
      pos += 9;
      let ct = gct;
      if (lf & 128) {
        const n = 3 * (1 << (lf & 7) + 1);
        ct = b.subarray(pos, pos + n);
        pos += n;
      }
      const interlaced = !!(lf & 64);
      const minCode = b[pos++];
      if (!(minCode >= 1 && minCode <= 11)) return null;
      const chunks = [];
      while (pos < b.length && b[pos]) {
        const n = b[pos];
        for (let k = 1; k <= n; k++) chunks.push(b[pos + k]);
        pos += n + 1;
      }
      pos++;
      const idx = lzw(Uint8Array.from(chunks), minCode, iw * ih);
      const rows = [];
      if (interlaced) {
        for (const [s, st] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let r = s; r < ih; r += st) rows.push(r);
      } else for (let r = 0; r < ih; r++) rows.push(r);
      for (let r = 0; r < ih; r++) {
        const yy = iy + rows[r];
        if (yy >= height) continue;
        for (let x = 0; x < iw; x++) {
          if (ix + x >= width) break;
          const ci = idx[r * iw + x] ?? 0;
          const k = (yy * width + ix + x) * 4;
          if (ci === transparent || !ct) {
            out[k + 3] = 0;
            continue;
          }
          out[k] = ct[ci * 3];
          out[k + 1] = ct[ci * 3 + 1];
          out[k + 2] = ct[ci * 3 + 2];
          out[k + 3] = 255;
        }
      }
      return { width, height, data: out };
    } else break;
  }
  return null;
}
function lzw(data, minCode, n) {
  const out = new Uint8Array(n);
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = [];
    dict[eoi] = [];
    size = minCode + 1;
  };
  reset();
  let bit = 0, o = 0;
  let prev = null;
  while (o < n) {
    let code = 0;
    for (let k = 0; k < size; k++) {
      if (data[bit + k >> 3] >> (bit + k & 7) & 1) code |= 1 << k;
    }
    bit += size;
    if (bit > data.length * 8) break;
    if (code === clear) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoi) break;
    let entry;
    if (dict[code]) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else break;
    for (const v of entry) {
      if (o < n) out[o++] = v;
    }
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length >= 1 << size && size < 12) size++;
  }
  return out;
}
function decodeBmp(b) {
  if (b[0] !== 66 || b[1] !== 77) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true);
  const width = dv.getInt32(18, true);
  let height = dv.getInt32(22, true);
  const bpp = dv.getUint16(28, true);
  const comp = dv.getUint32(30, true);
  if (comp !== 0 && comp !== 3) return null;
  if (width <= 0 || height === 0) return null;
  const topDown = height < 0;
  height = Math.abs(height);
  const stride = Math.ceil(width * bpp / 32) * 4;
  const hdr = dv.getUint32(14, true);
  const palOff = 14 + hdr;
  let masks = bpp === 16 ? [31744, 992, 31, 0] : [16711680, 65280, 255, 0];
  if (comp === 3 && (bpp === 16 || bpp === 32)) masks = [dv.getUint32(54, true), dv.getUint32(58, true), dv.getUint32(62, true), hdr >= 56 ? dv.getUint32(66, true) : 0];
  const chan = (v, m, dflt) => {
    if (!m) return dflt;
    let shift = 0;
    while (!(m >>> shift & 1)) shift++;
    const bits = Math.clz32(0) - Math.clz32(m >>> shift);
    return Math.round(((v & m) >>> shift) * 255 / (2 ** bits - 1));
  };
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = off + (topDown ? y : height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      if (bpp === 24) {
        const p = row + x * 3;
        out[k] = b[p + 2];
        out[k + 1] = b[p + 1];
        out[k + 2] = b[p];
        out[k + 3] = 255;
      } else if (bpp === 16 || bpp === 32) {
        const p = row + x * (bpp / 8);
        const v = bpp === 16 ? b[p] | b[p + 1] << 8 : (b[p] | b[p + 1] << 8 | b[p + 2] << 16 | b[p + 3] << 24) >>> 0;
        out[k] = chan(v, masks[0], 0);
        out[k + 1] = chan(v, masks[1], 0);
        out[k + 2] = chan(v, masks[2], 0);
        out[k + 3] = chan(v, masks[3], 255);
      } else if (bpp <= 8) {
        const bit = x * bpp;
        const v = b[row + (bit >> 3)] >> 8 - bpp - (bit & 7) & (1 << bpp) - 1;
        const p = palOff + v * 4;
        out[k] = b[p + 2];
        out[k + 1] = b[p + 1];
        out[k + 2] = b[p];
        out[k + 3] = 255;
      }
    }
  }
  return { width, height, data: out };
}
function decodeRaster(b) {
  return decodePng(b) ?? decodeGif(b) ?? decodeBmp(b) ?? decodeTiff(b);
}
function tiffLzw(data, expected) {
  const out = new Uint8Array(expected);
  let o = 0;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < 256; i++) dict[i] = new Uint8Array([i]);
    dict[256] = new Uint8Array(0);
    dict[257] = new Uint8Array(0);
  };
  reset();
  let bitPos = 0, width = 9;
  let prev = null;
  const read = () => {
    let v = 0;
    for (let k = 0; k < width; k++) {
      const byte = data[bitPos + k >> 3];
      if (byte === void 0) return 257;
      v = v << 1 | byte >> 7 - (bitPos + k & 7) & 1;
    }
    bitPos += width;
    return v;
  };
  while (o < expected) {
    const code = read();
    if (code === 257) break;
    if (code === 256) {
      reset();
      width = 9;
      prev = null;
      continue;
    }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) {
      entry = new Uint8Array(prev.length + 1);
      entry.set(prev);
      entry[prev.length] = prev[0];
    } else break;
    for (let k = 0; k < entry.length && o < expected; k++) out[o++] = entry[k];
    if (prev) {
      const ne = new Uint8Array(prev.length + 1);
      ne.set(prev);
      ne[prev.length] = entry[0];
      dict.push(ne);
    }
    prev = entry;
    if (dict.length + 1 >= 1 << width && width < 12) width++;
  }
  return out;
}
function packBits(data, expected) {
  const out = new Uint8Array(expected);
  let i = 0, o = 0;
  while (i < data.length && o < expected) {
    const n = data[i++] << 24 >> 24;
    if (n >= 0) {
      for (let k = 0; k <= n && o < expected; k++) out[o++] = data[i++];
    } else if (n !== -128) {
      const v = data[i++];
      for (let k = 0; k < 1 - n && o < expected; k++) out[o++] = v;
    }
  }
  return out;
}
function decodeTiff(b) {
  const le = b[0] === 73 && b[1] === 73;
  const be = b[0] === 77 && b[1] === 77;
  if (!le && !be) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o) => dv.getUint16(o, le);
  const u32 = (o) => dv.getUint32(o, le);
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  const n = u16(ifd);
  const tags = /* @__PURE__ */ new Map();
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 };
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
    const size = (SIZES[type] ?? 1) * count;
    const base = size <= 4 ? e + 8 : u32(e + 8);
    const vals = [];
    for (let k = 0; k < Math.min(count, 1 << 20); k++) {
      if (type === 3) vals.push(u16(base + k * 2));
      else if (type === 4) vals.push(u32(base + k * 4));
      else if (type === 1 || type === 7) vals.push(b[base + k]);
      else if (type === 5) vals.push(u32(base + k * 8) / (u32(base + k * 8 + 4) || 1));
    }
    tags.set(tag, vals);
  }
  const t = (k, d = 0) => tags.get(k)?.[0] ?? d;
  const width = t(256), height = t(257);
  const bps = tags.get(258) ?? [1];
  const comp = t(259, 1);
  const photo = t(262, 1);
  const spp = t(277, 1);
  const predictor = t(317, 1);
  const planar = t(284, 1);
  if (!width || !height || planar !== 1 || ![1, 5, 8, 32946, 32773].includes(comp)) return null;
  const bits = bps[0] ?? 8;
  const decode0 = (chunk, expected) => {
    if (comp === 1) return chunk;
    if (comp === 5) return tiffLzw(chunk, expected);
    if (comp === 32773) return packBits(chunk, expected);
    try {
      return unzlibSync(chunk);
    } catch {
      return new Uint8Array(expected);
    }
  };
  const ycc = photo === 6 && bits === 8 && spp === 3;
  const sub = tags.get(530) ?? [2, 2];
  const sh = ycc ? Math.max(1, sub[0] ?? 2) : 1, sv = ycc ? Math.max(1, sub[1] ?? 2) : 1;
  const coef = tags.get(529) ?? [0.299, 0.587, 0.114];
  const toRgb = (Y, cb, cr) => {
    const lr = coef[0] ?? 0.299, lg = coef[1] ?? 0.587, lb = coef[2] ?? 0.114;
    const R = Y + (cr - 128) * (2 - 2 * lr), B = Y + (cb - 128) * (2 - 2 * lb);
    const G = (Y - lb * B - lr * R) / lg;
    const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return [c(R), c(G), c(B)];
  };
  if (ycc && (sh > 1 || sv > 1)) {
    if (tags.has(322)) return null;
    const across = Math.ceil(width / sh), unit = sh * sv + 2, blockRow = across * unit, blockRows = Math.ceil(height / sv);
    const data = new Uint8Array(blockRow * blockRows);
    const rps = t(278, height);
    let o = 0;
    (tags.get(273) ?? []).forEach((off, i) => {
      if (o >= data.length) return;
      const rows = Math.min(rps, height - i * rps);
      const exp = Math.ceil(rows / sv) * blockRow;
      const d = decode0(b.subarray(off, off + (tags.get(279)?.[i] ?? 0)), exp);
      data.set(d.subarray(0, Math.min(d.length, data.length - o)), o);
      o += exp;
    });
    const out2 = new Uint8Array(width * height * 4);
    for (let by = 0; by < blockRows; by++) {
      for (let bx = 0; bx < across; bx++) {
        const u = by * blockRow + bx * unit;
        const cb = data[u + sh * sv], cr = data[u + sh * sv + 1];
        for (let j = 0; j < sv; j++) {
          for (let i = 0; i < sh; i++) {
            const x = bx * sh + i, y = by * sv + j;
            if (x >= width || y >= height) continue;
            const [R, G, B] = toRgb(data[u + j * sh + i], cb, cr);
            const k = (y * width + x) * 4;
            out2[k] = R;
            out2[k + 1] = G;
            out2[k + 2] = B;
            out2[k + 3] = 255;
          }
        }
      }
    }
    return { width, height, data: out2 };
  }
  const rowBytes = Math.ceil(width * spp * bits / 8);
  const raw = new Uint8Array(rowBytes * height);
  const tiled = tags.has(322);
  const offs = tags.get(tiled ? 324 : 273) ?? [];
  const counts = tags.get(tiled ? 325 : 279) ?? [];
  const decode = decode0;
  if (!tiled) {
    const rps = t(278, height);
    let o = 0;
    offs.forEach((off, i) => {
      if (o >= raw.length) return;
      const rows = Math.min(rps, height - i * rps);
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), rows * rowBytes);
      raw.set(d.subarray(0, Math.min(d.length, raw.length - o)), o);
      o += rows * rowBytes;
    });
  } else {
    const tw = t(322), th = t(323);
    const tilesAcross = Math.ceil(width / tw);
    const tileRow = Math.ceil(tw * spp * bits / 8);
    offs.forEach((off, i) => {
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), tileRow * th);
      const tx = i % tilesAcross * tw, ty = Math.floor(i / tilesAcross) * th;
      for (let y = 0; y < th && ty + y < height; y++) {
        const dst = (ty + y) * rowBytes + Math.floor(tx * spp * bits / 8);
        const len = Math.min(tileRow, rowBytes - Math.floor(tx * spp * bits / 8));
        raw.set(d.subarray(y * tileRow, y * tileRow + len), dst);
      }
    });
  }
  if (predictor === 2 && bits === 8) {
    for (let y = 0; y < height; y++) {
      for (let x = spp; x < width * spp; x++) raw[y * rowBytes + x] = raw[y * rowBytes + x] + raw[y * rowBytes + x - spp] & 255;
    }
  } else if (predictor === 2 && bits === 16) {
    const get = (o) => le ? raw[o] | raw[o + 1] << 8 : raw[o] << 8 | raw[o + 1];
    const set = (o, v) => {
      if (le) {
        raw[o] = v & 255;
        raw[o + 1] = v >> 8;
      } else {
        raw[o] = v >> 8;
        raw[o + 1] = v & 255;
      }
    };
    for (let y = 0; y < height; y++) {
      for (let s = spp; s < width * spp; s++) {
        const o = y * rowBytes + s * 2;
        set(o, get(o) + get(o - spp * 2) & 65535);
      }
    }
  }
  const out = new Uint8Array(width * height * 4);
  const cmap = tags.get(320);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      const sample = (c) => {
        if (bits === 8) return raw[y * rowBytes + x * spp + c];
        if (bits === 16) return raw[y * rowBytes + (x * spp + c) * 2 + (le ? 1 : 0)];
        const bit = (x * spp + c) * bits;
        const v = raw[y * rowBytes + (bit >> 3)] >> 8 - bits - (bit & 7) & (1 << bits) - 1;
        return v;
      };
      if (ycc) {
        const [R, G, B] = toRgb(sample(0), sample(1), sample(2));
        out[k] = R;
        out[k + 1] = G;
        out[k + 2] = B;
        out[k + 3] = 255;
      } else if (photo === 2 || photo === 6) {
        out[k] = sample(0);
        out[k + 1] = sample(1);
        out[k + 2] = sample(2);
        out[k + 3] = spp >= 4 ? sample(3) : 255;
      } else if (photo === 3 && cmap) {
        const i = sample(0), nColors = 1 << bits;
        out[k] = cmap[i] >> 8;
        out[k + 1] = cmap[nColors + i] >> 8;
        out[k + 2] = cmap[2 * nColors + i] >> 8;
        out[k + 3] = 255;
      } else if (photo === 5) {
        const c = sample(0), m = sample(1), yy = sample(2), kk = sample(3);
        out[k] = 255 - Math.min(255, c + kk);
        out[k + 1] = 255 - Math.min(255, m + kk);
        out[k + 2] = 255 - Math.min(255, yy + kk);
        out[k + 3] = 255;
      } else {
        const max = bits >= 8 ? 255 : (1 << bits) - 1;
        let g = Math.round(sample(0) * 255 / max);
        if (photo === 0) g = 255 - g;
        out[k] = g;
        out[k + 1] = g;
        out[k + 2] = g;
        out[k + 3] = spp >= 2 ? sample(1) : 255;
      }
    }
  }
  return { width, height, data: out };
}
function effectLine(fx) {
  if (fx.gain === void 0 && !fx.bright) return null;
  const s = fx.gain ?? 1, b = fx.bright ?? 0;
  return { slope: s, off: 0.5 - 0.5 * s + b / 2 * (1 + s) };
}
function applyImageEffects(rgba, fx) {
  const ln = effectLine(fx);
  const map = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const y = ln ? (v / 255 * ln.slope + ln.off) * 255 : v;
    map[v] = Math.max(0, Math.min(255, fx.floor ? Math.floor(y + 1e-9) : Math.round(y)));
  }
  const thr = fx.biLevel !== void 0 ? fx.biLevel * 255 : -1;
  for (let i = 0; i < rgba.length; i += 4) {
    let r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (fx.gray) r = g = b = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    r = map[r];
    g = map[g];
    b = map[b];
    if (thr >= 0) r = g = b = 0.2126 * r + 0.7152 * g + 0.0722 * b >= thr ? 255 : 0;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
  }
}
function effectDecode(fx, components) {
  if (fx.gray || fx.biLevel !== void 0 || components === 4) return null;
  const ln = effectLine(fx);
  if (!ln) return null;
  const d = [ln.off, ln.off + ln.slope];
  return components === 1 ? d : [...d, ...d, ...d];
}

// ../docx-layout/src/pdf.ts
var T = 20;
function renderPdf(result, opts = {}) {
  const doc = new PdfDocument({ compress: opts.compress ?? true });
  const fonts = /* @__PURE__ */ new Map();
  const images = /* @__PURE__ */ new WeakMap();
  const fontFor = (face, pua = false) => {
    const key = pua ? `${face.key}#pua` : face.key;
    let f = fonts.get(key);
    if (f === void 0) {
      if (!face.bytes) f = null;
      else {
        const sf = face.font;
        const m = sf.metrics;
        f = doc.embedFont(face.family.replace(/\s+/g, "") + (face.bold ? "-Bold" : "") + (face.italic ? "-Italic" : ""), face.bytes, {
          unitsPerEm: m.unitsPerEm,
          ascender: m.ascender,
          descender: m.descender,
          glyphId: (cp) => {
            const g = sf.glyphId(cp);
            return g === 0 && cp >= 61440 && cp <= 61695 && isSymbolFont(sf) ? sf.glyphId(cp - 61440) : g;
          },
          advanceWidth: (g) => sf.advanceWidth(g)
        });
      }
      fonts.set(key, f);
    }
    return f;
  };
  const imageFor = (img) => {
    let h = images.get(img);
    if (h !== void 0) return h;
    h = null;
    const data = img.data;
    try {
      const fx = img.effects;
      const jp = jpegInfo(data);
      const dec = jp && fx ? effectDecode(fx, jp.components) : null;
      if (jp && (!fx || dec)) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe, dec ?? void 0);
      else {
        const r = jp ? null : decodeRaster(data);
        if (r) {
          if (fx) applyImageEffects(r.data, fx);
          h = doc.embedRgba(r.data, r.width, r.height);
        } else {
          const ext = opts.decodeImage?.(img);
          if (ext && fx) applyImageEffects(ext.rgba, fx);
          if (ext) h = doc.embedRgba(ext.rgba, ext.width, ext.height);
          else if (jp) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe);
        }
      }
    } catch {
      h = null;
    }
    images.set(img, h);
    return h;
  };
  for (const lp of result.pages) {
    const page = doc.addPage(lp.widthTw / T, lp.heightTw / T);
    if (lp.background) page.fillRect(0, 0, lp.widthTw / T, lp.heightTw / T, hexColor(lp.background));
    for (const it of lp.items) paintItem(page, it, fontFor, imageFor, (g, smp) => doc.addShading(g, smp, page.heightPt));
  }
  return doc.build();
}
function outlineInto(cmds, font, gid, ox, base, sx, s, skew) {
  const ol = font.glyphOutline?.(gid);
  if (!ol) return false;
  const X = (x, y) => ox + x * sx + skew * y * s;
  const Y = (y) => base - y * s;
  let px = 0, py = 0;
  for (const c of ol) {
    if (c.op === "Z") {
      cmds.push({ op: "Z" });
      continue;
    }
    if (c.op === "Q") {
      const c1x = px + 2 / 3 * (c.cx - px), c1y = py + 2 / 3 * (c.cy - py);
      const c2x = c.x + 2 / 3 * (c.cx - c.x), c2y = c.y + 2 / 3 * (c.cy - c.y);
      cmds.push({ op: "C", x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
    } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
    px = c.x;
    py = c.y;
  }
  return true;
}
function glyphsAsPath(page, it) {
  const font = it.face.font;
  if (!font.glyphOutline) return false;
  const upm = font.metrics.unitsPerEm;
  const s = it.sizePt / upm, sx = s * (it.scaleX ?? 1);
  const skew = it.synthItalic ? 0.2 : 0;
  const base = it.y / T;
  const cmds = [];
  for (const g of it.glyphs) {
    const gid = g.gid ?? font.glyphId(g.cp);
    const layers = it.colr ? font.colorLayers?.(gid) : null;
    if (layers) {
      for (const L of layers) {
        const lc = [];
        if (!outlineInto(lc, font, L.glyphId, g.x / T, base, sx, s, skew)) continue;
        if (!lc.length) continue;
        const a = L.alpha * (it.alpha ?? 1);
        page.withAlpha(a < 1 ? a : void 0, void 0, () => page.path(lc, hexColor(L.color ?? it.color)));
      }
      continue;
    }
    const ol = font.glyphOutline(gid);
    if (!ol) return false;
    const ox = g.x / T;
    const X = (x, y) => ox + x * sx + skew * y * s;
    const Y = (y) => base - y * s;
    let px = 0, py = 0;
    for (const c of ol) {
      if (c.op === "Z") {
        cmds.push({ op: "Z" });
        continue;
      }
      if (c.op === "Q") {
        const c1x = px + 2 / 3 * (c.cx - px), c1y = py + 2 / 3 * (c.cy - py);
        const c2x = c.x + 2 / 3 * (c.cx - c.x), c2y = c.y + 2 / 3 * (c.cy - c.y);
        cmds.push({ op: "C", x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
      } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
      px = c.x;
      py = c.y;
    }
  }
  if (!cmds.length) return true;
  const color = hexColor(it.color);
  const stroke = it.synthBold ? { color, widthPt: it.sizePt * 0.03 } : void 0;
  page.withAlpha(it.alpha, it.alpha, () => page.path(cmds, color, stroke));
  return true;
}
function paintItem(page, it, fontFor, imageFor, shade) {
  switch (it.t) {
    case "glyphs": {
      if (it.asPath && glyphsAsPath(page, it)) return;
      const ef = fontFor(it.face);
      if (!ef) return;
      const pdfSize = Math.round(it.sizePt / 0.12) * 0.12;
      const sf = it.face.font;
      const isPua = (cp) => cp >= 61440 && cp <= 61695 && sf.glyphId(cp) === 0;
      const all = it.glyphs.filter((g) => g.gid === void 0);
      for (let i = 0; i < all.length; ) {
        const pua = isPua(all[i].cp);
        let j = i + 1;
        while (j < all.length && isPua(all[j].cp) === pua) j++;
        const f = pua ? fontFor(it.face, true) ?? ef : ef;
        const placed = all.slice(i, j).map((g) => {
          const { gid } = f.encode(g.cp);
          return { gid, codePoint: g.cp, xPt: g.x / T, baselineFromTopPt: it.y / T };
        });
        page.withAlpha(it.alpha, it.alpha, () => page.glyphs(f, pdfSize, hexColor(it.color), placed, {
          ...it.scaleX ? { scaleX: it.scaleX } : {},
          ...it.synthBold ? { synthBold: true } : {},
          ...it.synthItalic ? { synthItalic: true } : {},
          // texto em corridas (Tm + TJ) como no PDF do Word: a extração não embaralha linhas sobrepostas
          runs: true
        }));
        i = j;
      }
      return;
    }
    case "rect":
      page.withAlpha(it.alpha, void 0, () => page.fillRect(it.x / T, it.y / T, it.w / T, it.h / T, hexColor(it.fill)));
      return;
    case "line": {
      const dash = it.dash === "dotted" ? [it.widthPt, it.widthPt * 2] : it.dash === "dashed" ? [it.widthPt * 4, it.widthPt * 3] : it.dash === "dashDot" ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2] : it.dash === "dashDotDot" ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2, it.widthPt, it.widthPt * 2] : void 0;
      page.line(it.x1 / T, it.y1 / T, it.x2 / T, it.y2 / T, hexColor(it.color), it.widthPt, dash);
      return;
    }
    case "image": {
      const h = imageFor(it.image);
      if (!h) return;
      let x = it.x / T, y = it.y / T, w = it.w / T, hh = it.h / T;
      const crop = it.crop;
      if (crop && (crop.l || crop.t || crop.r || crop.b)) {
        page.pushClipRect(x, y, w, hh);
        const fw = w / Math.max(0.01, 1 - crop.l - crop.r);
        const fh = hh / Math.max(0.01, 1 - crop.t - crop.b);
        x -= crop.l * fw;
        y -= crop.t * fh;
        w = fw;
        hh = fh;
        page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
        page.popClip();
      } else if (it.rot || it.flipH || it.flipV) page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
      else page.drawImage(h, x, y, w, hh);
      return;
    }
    case "shape": {
      const st = it.style;
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : void 0;
      const stroke = it.stroke && /^[0-9A-Fa-f]{6}$/.test(it.stroke.color) ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {} } : void 0;
      if (!fill && !stroke && !it.grad) return;
      const x = it.x / T, y = it.y / T, w = it.w / T, h = it.h / T;
      const isLine = st.geom === "line" || st.geom.startsWith("straightConnector");
      const xf = { flipH: !!st.flipH, flipV: !!st.flipV, rot: st.rot ?? 0 };
      let parts;
      if (isLine) {
        let cmds = linePath(x, y, w, h, it.line, !!st.flipH, !!st.flipV);
        if (st.rot) cmds = rotatePath(cmds, x + w / 2, y + h / 2, st.rot);
        parts = [{ cmds, fill: false, stroke: true, evenOdd: false }];
      } else if (st.geom === "custom" && st.cust) {
        parts = custPaths(st.cust, x, y, w, h, xf).map((p) => ({ cmds: p.cmds, fill: p.fill, stroke: p.stroke, evenOdd: true }));
      } else {
        parts = [{ cmds: presetPath(st.geom, x, y, w, h, { ...st.adj ? { adj: st.adj } : {}, ...xf }), fill: !OPEN_PRESETS.has(st.geom), stroke: true, evenOdd: false }];
      }
      if (it.shadow) {
        const dx = it.shadow.dx / T, dy = it.shadow.dy / T;
        const col = hexColor(it.shadow.color);
        for (const p of parts) {
          if (!p.fill && !stroke) continue;
          const sc = p.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy });
          page.withAlpha(it.shadow.alpha, it.shadow.alpha, () => page.path(sc, p.fill && (fill || it.grad) ? col : void 0, p.stroke && stroke ? { ...stroke, color: col } : void 0, p.evenOdd));
        }
      }
      if (it.grad) {
        const pb = pathBounds(parts.flatMap((p) => p.cmds));
        const g = gradientGeometry(it.grad, { x, y, w, h, rot: st.rot ?? 0 }, pb);
        const sh = shade(g, gradientSamples(it.grad.stops, it.grad.path ? 256 : 512));
        for (const p of parts) if (p.fill) page.withAlpha(st.fillAlpha, void 0, () => page.fillShaded(p.cmds, sh, p.evenOdd));
        if (stroke) {
          for (const p of parts) if (p.stroke) page.withAlpha(void 0, st.line?.alpha, () => page.path(p.cmds, void 0, stroke));
        }
        return;
      }
      for (const p of parts) page.withAlpha(st.fillAlpha, st.line?.alpha, () => page.path(p.cmds, p.fill ? fill : void 0, p.stroke ? stroke : void 0, p.evenOdd));
      return;
    }
    case "path": {
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : void 0;
      const stroke = it.stroke ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {} } : void 0;
      const cmds = it.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { op: "C", x1: c.x1 / T, y1: c.y1 / T, x2: c.x2 / T, y2: c.y2 / T, x: c.x / T, y: c.y / T } : { op: c.op, x: c.x / T, y: c.y / T });
      page.path(cmds, fill, stroke);
      return;
    }
    case "xform": {
      if (it.op === "pop" || !it.m) {
        page.popClip();
        return;
      }
      const [a, b, c, d, e, f] = it.m;
      const H = page.heightPt;
      page.pushTransform(a, -b, -c, d, c * H + e / T, H - d * H - f / T);
      return;
    }
    case "clip":
      if (it.op === "push") page.pushClipRect((it.x ?? 0) / T, (it.y ?? 0) / T, (it.w ?? 0) / T, (it.h ?? 0) / T);
      else page.popClip();
      return;
  }
}
function rotatePath(cmds, cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === "M" || m.op === "L") {
      const [x, y] = tr(m.x, m.y);
      return { op: m.op, x, y };
    }
    if (m.op === "C") {
      const [x1, y1] = tr(m.x1, m.y1);
      const [x2, y2] = tr(m.x2, m.y2);
      const [x, y] = tr(m.x, m.y);
      return { op: "C", x1, y1, x2, y2, x, y };
    }
    return m;
  });
}
function linePath(x, y, w, h, line, flipH = false, flipV = false) {
  if (line) return [{ op: "M", x: x + line.x1 / T, y: y + line.y1 / T }, { op: "L", x: x + line.x2 / T, y: y + line.y2 / T }];
  const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
  const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
  return [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }];
}

// ../docx-layout/src/canvas.ts
var HEX6 = /^[0-9A-Fa-f]{6}$/;
var K3 = 0.5523;
function paintItems(ctx, items, env, opts = {}) {
  const from = opts.from ?? 0;
  const to = Math.min(items.length, opts.to ?? items.length);
  const base = opts.alpha ?? 1;
  let depth = 0;
  ctx.save();
  ctx.globalAlpha = base;
  for (let i = from; i < to; i++) {
    const it = items[i];
    switch (it.t) {
      case "glyphs":
        paintGlyphs(ctx, it, env);
        break;
      case "rect": {
        if (!HEX6.test(it.fill)) break;
        let w = it.w;
        while (i + 1 < to) {
          const n = items[i + 1];
          if (n.t !== "rect" || n.fill !== it.fill || n.alpha !== it.alpha || n.y !== it.y || n.h !== it.h || Math.abs(n.x - (it.x + w)) > 0.5) break;
          w = n.x + n.w - it.x;
          i++;
        }
        ctx.globalAlpha = base * (it.alpha ?? 1);
        ctx.fillStyle = env.color(it.fill);
        ctx.fillRect(it.x, it.y, w, it.h);
        ctx.globalAlpha = base;
        break;
      }
      case "line": {
        if (!HEX6.test(it.color)) break;
        const w = it.widthPt;
        const dash = it.dash === "dotted" ? [w, w * 2] : it.dash === "dashed" ? [w * 4, w * 3] : it.dash === "dashDot" ? [w * 4, w * 2, w, w * 2] : it.dash === "dashDotDot" ? [w * 4, w * 2, w, w * 2, w, w * 2] : [];
        let { x1, y1, x2, y2 } = it;
        let lw = w * 20;
        const m = ctx.getTransform();
        if (m.b === 0 && m.c === 0) {
          const horiz = Math.abs(y1 - y2) < 0.01, vert = Math.abs(x1 - x2) < 0.01;
          const dev = lw * (horiz ? m.d : m.a);
          if ((horiz || vert) && dev < 3 && dev > 0) {
            const dw = Math.max(1, Math.round(dev));
            const snap = (v, s, o) => {
              const d = v * s + o;
              return ((dw % 2 ? Math.floor(d) + 0.5 : Math.round(d)) - o) / s;
            };
            if (horiz) {
              y1 = y2 = snap(y1, m.d, m.f);
              lw = dw / m.d;
            } else {
              x1 = x2 = snap(x1, m.a, m.e);
              lw = dw / m.a;
            }
          }
        }
        ctx.strokeStyle = env.color(it.color);
        ctx.lineWidth = lw;
        ctx.lineCap = "butt";
        ctx.setLineDash(dash.map((d) => d * 20));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case "image": {
        const bmp = env.image(it.image);
        if (!bmp) break;
        let x = it.x, y = it.y, w = it.w, h = it.h;
        const crop = it.crop;
        const cropped = !!crop && !!(crop.l || crop.t || crop.r || crop.b);
        ctx.save();
        if (cropped) {
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          const fw = w / Math.max(0.01, 1 - crop.l - crop.r);
          const fh = h / Math.max(0.01, 1 - crop.t - crop.b);
          x -= crop.l * fw;
          y -= crop.t * fh;
          w = fw;
          h = fh;
        }
        if (it.rot || it.flipH || it.flipV) {
          ctx.translate(x + w / 2, y + h / 2);
          if (it.rot) ctx.rotate(it.rot * Math.PI / 180);
          ctx.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
          ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
        } else ctx.drawImage(bmp, x, y, w, h);
        ctx.restore();
        break;
      }
      case "shape":
        paintShape(ctx, it, env, base);
        break;
      case "path": {
        const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : void 0;
        const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : void 0;
        if (!fill && !stroke) break;
        ctx.beginPath();
        tracePath(ctx, it.cmds);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill("nonzero");
        }
        if (stroke) strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
        break;
      }
      case "clip":
        if (it.op === "push") {
          ctx.save();
          depth++;
          ctx.beginPath();
          ctx.rect(it.x ?? 0, it.y ?? 0, it.w ?? 0, it.h ?? 0);
          ctx.clip();
        } else if (depth > 0) {
          ctx.restore();
          depth--;
        }
        break;
      default: {
        const x = it;
        if (x.t !== "xform") break;
        if (x.op === "push" && x.m) {
          ctx.save();
          depth++;
          ctx.transform(x.m[0], x.m[1], x.m[2], x.m[3], x.m[4], x.m[5]);
        } else if (depth > 0) {
          ctx.restore();
          depth--;
        }
      }
    }
  }
  while (depth-- > 0) ctx.restore();
  ctx.restore();
}
function paintGlyphs(ctx, it, env) {
  if (!it.glyphs.length || !HEX6.test(it.color)) return;
  const f = env.fontOf(it.face);
  const font = it.face.font;
  ctx.font = `${f.italic ? "italic " : ""}${f.weight} ${it.sizePt * 20}px ${f.family}`;
  const color = env.color(it.color);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (it.synthBold) {
    ctx.strokeStyle = color;
    ctx.lineWidth = it.sizePt / 35 * 20;
    ctx.lineJoin = "miter";
  }
  const sx = it.scaleX ?? 1;
  const skew = it.synthItalic ? -0.21 : 0;
  const plain = sx === 1 && skew === 0;
  const gl = it.glyphs;
  const batch = plain && "fontKerning" in ctx;
  if (batch) ctx.fontKerning = "none";
  const upem = font.metrics.unitsPerEm || 1e3;
  const adv = (cp) => font.advanceWidth(font.glyphId(cp)) * it.sizePt * 20 / upem;
  for (let i = 0; i < gl.length; i++) {
    const g = gl[i];
    let cp = g.cp;
    if (cp >= 61440 && cp <= 61695 && font.glyphId(cp) === 0 && font.glyphId(cp - 61440) !== 0) cp -= 61440;
    let ch = String.fromCodePoint(cp);
    if (batch && batchable(cp)) {
      while (i + 1 < gl.length) {
        const n = gl[i + 1];
        const prev = gl[i];
        if (!batchable(n.cp) || Math.abs(n.x - (prev.x + adv(prev.cp))) > 0.25) break;
        ch += "\u200C" + String.fromCodePoint(n.cp);
        i++;
      }
    }
    if (plain) {
      ctx.fillText(ch, g.x, it.y);
      if (it.synthBold) ctx.strokeText(ch, g.x, it.y);
    } else {
      ctx.save();
      ctx.translate(g.x, it.y);
      ctx.transform(sx, 0, skew, 1, 0, 0);
      ctx.fillText(ch, 0, 0);
      if (it.synthBold) ctx.strokeText(ch, 0, 0);
      ctx.restore();
    }
  }
}
function batchable(cp) {
  return cp >= 32 && cp < 768 || cp >= 880 && cp < 1424 || cp >= 8192 && cp < 8304 && cp !== 8204 && cp !== 8205 || cp >= 8352 && cp < 8400;
}
function strokeWith(ctx, color, widthPt, dash) {
  const w = Math.max(0.25, widthPt);
  ctx.strokeStyle = color;
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) || 1;
  ctx.lineWidth = Math.max(w * 20, 1 / px);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.setLineDash(dash ? [w * 3 * 20, w * 2 * 20] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}
function paintShape(ctx, it, env, base) {
  const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : void 0;
  const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : void 0;
  if (!fill && !stroke) return;
  let cmds = shapePath(it.style.geom, it.x, it.y, it.w, it.h, it.line, !!it.style.flipH, !!it.style.flipV);
  if (it.style.rot) cmds = rotatePath2(cmds, it.x + it.w / 2, it.y + it.h / 2, it.style.rot);
  ctx.beginPath();
  tracePath(ctx, cmds);
  if (fill && it.style.geom !== "line") {
    ctx.globalAlpha = base * (it.style.fillAlpha ?? 1);
    ctx.fillStyle = fill;
    ctx.fill("nonzero");
  }
  if (stroke) {
    ctx.globalAlpha = base * (it.style.line?.alpha ?? 1);
    strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
  }
  ctx.globalAlpha = base;
}
function tracePath(ctx, cmds) {
  for (const c of cmds) {
    if (c.op === "M") ctx.moveTo(c.x, c.y);
    else if (c.op === "L") ctx.lineTo(c.x, c.y);
    else if (c.op === "C") ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}
function rotatePath2(cmds, cx, cy, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === "M" || m.op === "L") {
      const [x, y] = tr(m.x, m.y);
      return { op: m.op, x, y };
    }
    if (m.op === "C") {
      const [x1, y1] = tr(m.x1, m.y1);
      const [x2, y2] = tr(m.x2, m.y2);
      const [x, y] = tr(m.x, m.y);
      return { op: "C", x1, y1, x2, y2, x, y };
    }
    return m;
  });
}
function shapePath(geom, x, y, w, h, line, flipH = false, flipV = false) {
  if (geom === "line" || geom.startsWith("straightConnector")) {
    if (line) return [{ op: "M", x: x + line.x1, y: y + line.y1 }, { op: "L", x: x + line.x2, y: y + line.y2 }];
    const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
    const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
    return [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }];
  }
  if (geom === "ellipse") {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    return [
      { op: "M", x: cx + rx, y: cy },
      { op: "C", x1: cx + rx, y1: cy + ry * K3, x2: cx + rx * K3, y2: cy + ry, x: cx, y: cy + ry },
      { op: "C", x1: cx - rx * K3, y1: cy + ry, x2: cx - rx, y2: cy + ry * K3, x: cx - rx, y: cy },
      { op: "C", x1: cx - rx, y1: cy - ry * K3, x2: cx - rx * K3, y2: cy - ry, x: cx, y: cy - ry },
      { op: "C", x1: cx + rx * K3, y1: cy - ry, x2: cx + rx, y2: cy - ry * K3, x: cx + rx, y: cy },
      { op: "Z" }
    ];
  }
  if (geom === "roundRect") {
    const r = Math.min(w, h) * 0.1667;
    return [
      { op: "M", x: x + r, y },
      { op: "L", x: x + w - r, y },
      { op: "C", x1: x + w - r + r * K3, y1: y, x2: x + w, y2: y + r - r * K3, x: x + w, y: y + r },
      { op: "L", x: x + w, y: y + h - r },
      { op: "C", x1: x + w, y1: y + h - r + r * K3, x2: x + w - r + r * K3, y2: y + h, x: x + w - r, y: y + h },
      { op: "L", x: x + r, y: y + h },
      { op: "C", x1: x + r - r * K3, y1: y + h, x2: x, y2: y + h - r + r * K3, x, y: y + h - r },
      { op: "L", x, y: y + r },
      { op: "C", x1: x, y1: y + r - r * K3, x2: x + r - r * K3, y2: y, x: x + r, y },
      { op: "Z" }
    ];
  }
  return [{ op: "M", x, y }, { op: "L", x: x + w, y }, { op: "L", x: x + w, y: y + h }, { op: "L", x, y: y + h }, { op: "Z" }];
}

// ../docx-layout/src/refs.ts
function cellAtGrid(t, r, c) {
  const row = t.rows[r];
  if (!row) return null;
  let col = row.trPr?.gridBefore ?? 0;
  for (const cell of row.cells) {
    if (col === c) return cell;
    col += Math.max(1, cell.tcPr?.gridSpan ?? cell.gridSpan ?? 1);
  }
  return null;
}
function cellBlocks(cell) {
  return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: "paragraph", paragraph }));
}
function paragraphAtPath(blocks, path) {
  let list = blocks;
  for (let i = 0; i < path.length; i += 3) {
    const b = /^b(\d+)$/.exec(path[i] ?? "");
    const blk = b ? list[+b[1]] : void 0;
    if (!blk) return null;
    if (i + 1 >= path.length) return blk.type === "paragraph" ? blk.paragraph : null;
    const r = /^r(\d+)$/.exec(path[i + 1] ?? ""), c = /^c(\d+)$/.exec(path[i + 2] ?? "");
    if (blk.type !== "table" || !r || !c) return null;
    const cell = cellAtGrid(blk, +r[1], +c[1]);
    if (!cell) return null;
    list = cellBlocks(cell);
  }
  return null;
}

// src/xps.ts
var PT_TO_PX = 96 / 72;
var TWIP_TO_PX = 96 / 1440;
var ENC = new TextEncoder();
var enc = (s) => ENC.encode(s);
function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function rgb2(c) {
  const f = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#FF${f(c[0])}${f(c[1])}${f(c[2])}`;
}
function safeFamily(family) {
  return family.replace(/\s+/g, "");
}
function fontPartName(family, v) {
  return `/Resources/Fonts/${safeFamily(family)}-${v}.ttf`;
}
function fixedDocSeq() {
  return `<?xml version="1.0" encoding="utf-8"?><FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06"><DocumentReference Source="/Documents/1/FixedDocument.fdoc"/></FixedDocumentSequence>`;
}
function fixedDoc(pageCount) {
  let inner = "";
  for (let i = 1; i <= pageCount; i++) {
    inner += `<PageContent Source="/Documents/1/Pages/${i}.fpage"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?><FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06">${inner}</FixedDocument>`;
}
function fixedPage(page, usedFonts) {
  const w = page.widthPt * PT_TO_PX;
  const h = page.heightPt * PT_TO_PX;
  let body = "";
  for (const r of page.fills) {
    const x = r.xPt * PT_TO_PX, y = r.yPt * PT_TO_PX;
    const ww = r.wPt * PT_TO_PX, hh = r.hPt * PT_TO_PX;
    body += `<Path Fill="${rgb2(r.colorRgb)}" Data="M ${x} ${y} L ${x + ww} ${y} ${x + ww} ${y + hh} ${x} ${y + hh} Z"/>`;
  }
  for (const ln of page.lines) {
    const ax = ln.ax * PT_TO_PX, ay = ln.ay * PT_TO_PX;
    const bx = ln.bx * PT_TO_PX, by = ln.by * PT_TO_PX;
    const w2 = ln.widthPt * PT_TO_PX;
    body += `<Path Stroke="${rgb2(ln.colorRgb)}" StrokeThickness="${w2.toFixed(2)}" Data="M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)}"/>`;
  }
  for (const g of page.glyphs) {
    if (!g.text) continue;
    usedFonts.add(`${g.fontFamily}-${g.variant}`);
    const x = g.xPt * PT_TO_PX;
    const y = g.baselinePt * PT_TO_PX;
    const em = g.sizePt * PT_TO_PX;
    const ital = g.variant === "italic" || g.variant === "boldItalic" ? ' StyleSimulations="ItalicSimulation"' : "";
    body += `<Glyphs OriginX="${x.toFixed(2)}" OriginY="${y.toFixed(2)}" FontRenderingEmSize="${em.toFixed(2)}" FontUri="${fontPartName(g.fontFamily, g.variant)}" Fill="${rgb2(g.colorRgb)}"${ital} UnicodeString="${xmlEscape(g.text)}"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?><FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" Width="${w.toFixed(2)}" Height="${h.toFixed(2)}" xml:lang="pt-BR">${body}</FixedPage>`;
}
function relsPagesDir(usedFonts) {
  let rels = "";
  let id = 1;
  for (const key of usedFonts) {
    const [family, variant] = key.split("-");
    rels += `<Relationship Id="R${id++}" Type="http://schemas.microsoft.com/xps/2005/06/required-resource" Target="/Resources/Fonts/${safeFamily(family)}-${variant}.ttf"/>`;
  }
  return rels;
}
function contentTypes(pageCount, usedFonts) {
  let overrides = `<Override PartName="/FixedDocumentSequence.fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Override PartName="/Documents/1/FixedDocument.fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/>`;
  for (let i = 1; i <= pageCount; i++) {
    overrides += `<Override PartName="/Documents/1/Pages/${i}.fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>`;
  }
  void usedFonts;
  return `<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/><Default Extension="ttf" ContentType="application/vnd.ms-opentype"/>${overrides}</Types>`;
}
function rootRels() {
  return `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" Target="/FixedDocumentSequence.fdseq"/></Relationships>`;
}
function buildXps(input) {
  const z = {};
  const usedFonts = /* @__PURE__ */ new Set();
  z["FixedDocumentSequence.fdseq"] = enc(fixedDocSeq());
  z["Documents/1/FixedDocument.fdoc"] = enc(fixedDoc(input.pages.length));
  for (let i = 0; i < input.pages.length; i++) {
    z[`Documents/1/Pages/${i + 1}.fpage`] = enc(fixedPage(input.pages[i], usedFonts));
  }
  for (let i = 0; i < input.pages.length; i++) {
    z[`Documents/1/Pages/_rels/${i + 1}.fpage.rels`] = enc(
      `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + relsPagesDir(usedFonts) + `</Relationships>`
    );
  }
  for (const key of usedFonts) {
    const [family, variant] = key.split("-");
    const bytes = input.fontBytes[family]?.[variant] ?? input.fontBytes[family]?.regular;
    if (!bytes) throw new Error(`fonte sem bytes para XPS: ${key}`);
    z[`Resources/Fonts/${safeFamily(family)}-${variant}.ttf`] = bytes;
  }
  z["[Content_Types].xml"] = enc(contentTypes(input.pages.length, usedFonts));
  z["_rels/.rels"] = enc(rootRels());
  return zipSync(z, { level: 6 });
}

// src/edit-guard.ts
var MARK2 = "\0uw-run:";
var EXTRAS = ["image", "textbox", "shape", "group", "ptab", "fieldResult", "field", "noteRef", "custom", "symFont", "formField", "inToc"];
function guardRuns(model, lo, hi, op) {
  const paras = model.paragraphs;
  const a = Math.max(0, Math.min(lo, hi)), b = Math.min(paras.length - 1, Math.max(lo, hi));
  const orig = /* @__PURE__ */ new Map();
  let n = 0;
  for (let i = a; i <= b; i++) {
    for (const r of paras[i].runs) {
      const key = MARK2 + n++;
      orig.set(key, { run: r, font: r.props.fontAscii });
      r.props = { ...r.props, fontAscii: key };
    }
  }
  try {
    return op();
  } finally {
    const end = Math.min(model.paragraphs.length - 1, b + 1);
    for (let i = a; i <= end; i++) restore(model.paragraphs[i], orig);
    for (const { run, font } of orig.values()) {
      if (run.props.fontAscii?.startsWith(MARK2)) setFont(run, font);
    }
  }
}
function setFont(r, font) {
  const props = { ...r.props };
  if (font === void 0) delete props.fontAscii;
  else props.fontAscii = font;
  r.props = props;
}
function restore(p, orig) {
  for (const r of p.runs) {
    const key = r.props.fontAscii;
    if (!key?.startsWith(MARK2)) continue;
    const o = orig.get(key);
    setFont(r, o?.font);
    if (!o) continue;
    if (!r.rpr && o.run.rpr) r.rpr = o.run.rpr;
    if (r !== o.run && r.text === o.run.text) {
      const src = o.run;
      const dst = r;
      for (const k of EXTRAS) if (dst[k] === void 0 && src[k] !== void 0) dst[k] = src[k];
    } else if (r !== o.run) {
      if (!r.symFont && o.run.symFont) r.symFont = o.run.symFont;
      if (!r.inToc && o.run.inToc) r.inToc = o.run.inToc;
    }
  }
}

// src/spell.ts
var DEFAULT_SPELL_LANG = "pt-BR";
var LangResolver = class {
  constructor(sheet, fallback = DEFAULT_SPELL_LANG) {
    this.sheet = sheet;
    this.fallback = fallback;
  }
  sheet;
  fallback;
  styleCache = /* @__PURE__ */ new Map();
  style(id, seen = /* @__PURE__ */ new Set()) {
    if (!id || !this.sheet) return {};
    const hit = this.styleCache.get(id);
    if (hit) return hit;
    const def = this.sheet.styles[id];
    let out = {};
    if (def && !seen.has(id)) {
      seen.add(id);
      const base = this.style(def.basedOn, seen);
      out = { lang: def.rPr?.lang?.val ?? base.lang, noProof: def.rPr?.noProof ?? base.noProof };
    }
    this.styleCache.set(id, out);
    return out;
  }
  run(run, para) {
    const rpr = run.rpr;
    const ch = this.style(rpr?.rStyle);
    const ps = this.style(para.props.styleId ?? para.ppr?.pStyle ?? this.sheet?.defaults.paragraph);
    const dd = this.sheet?.docDefaults.rPr;
    return {
      lang: rpr?.lang?.val ?? ch.lang ?? ps.lang ?? dd?.lang?.val ?? this.fallback,
      noProof: rpr?.noProof ?? ch.noProof ?? ps.noProof ?? dd?.noProof ?? false
    };
  }
};
var skipRun = (r) => !!(r.field || r.fieldResult || r.noteRef || r.custom || r.image || r.textbox || r.shape || r.group || r.math || r.props.isMath || r.formField);
function spellSpans(para, langs) {
  const full = para.runs.map((r) => r.text).join("");
  if (!/\p{L}/u.test(full)) return [];
  const byLang = /* @__PURE__ */ new Map();
  let at = 0;
  for (const r of para.runs) {
    const n = r.text.length;
    const { lang, noProof } = langs.run(r, para);
    if (!skipRun(r) && !noProof) {
      let arr = byLang.get(lang);
      if (!arr) {
        arr = Array.from({ length: full.length }, () => " ");
        byLang.set(lang, arr);
      }
      for (let k = 0; k < n; k++) arr[at + k] = r.text[k];
    }
    at += n;
  }
  return [...byLang].map(([lang, chars]) => ({ lang, text: chars.join("") }));
}
var keyOf = (spans) => spans.map((s) => `${s.lang}${s.text}`).join("");
var ParagraphSpell = class {
  constructor(engine, langs, onUpdate, delay = 120) {
    this.engine = engine;
    this.langs = langs;
    this.onUpdate = onUpdate;
    this.delay = delay;
    this.offChange = engine.onChange(() => this.invalidate());
  }
  engine;
  langs;
  onUpdate;
  delay;
  byPara = /* @__PURE__ */ new WeakMap();
  /** mesmo texto em outro objeto (desfazer recria os parágrafos): sem revisar de novo */
  byKey = /* @__PURE__ */ new Map();
  queue = /* @__PURE__ */ new Map();
  timer = null;
  generation = 0;
  offChange;
  invalidate() {
    this.generation++;
    this.byPara = /* @__PURE__ */ new WeakMap();
    this.byKey.clear();
    this.onUpdate();
  }
  dispose() {
    this.offChange();
    if (this.timer) clearTimeout(this.timer);
    this.queue.clear();
  }
  /** Erros do parágrafo, ou undefined se ainda não revisado. */
  get(para) {
    const spans = spellSpans(para, this.langs());
    if (!spans.length) return [];
    const key = keyOf(spans);
    const hit = this.byPara.get(para);
    if (hit?.key === key) return hit.list;
    const known = this.byKey.get(key);
    if (known) {
      this.byPara.set(para, { key, list: known });
      return known;
    }
    this.queue.set(para, spans);
    this.schedule();
    return hit?.list;
  }
  /** Revisão imediata (diálogo F7): espera o motor. */
  async check(para) {
    const spans = spellSpans(para, this.langs());
    if (!spans.length) return [];
    const key = keyOf(spans);
    const hit = this.byPara.get(para);
    if (hit?.key === key) return hit.list;
    const list = await this.run(spans);
    this.store(para, key, list);
    return list;
  }
  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delay);
  }
  async flush() {
    const batch = [...this.queue];
    this.queue.clear();
    const gen = this.generation;
    let changed = false;
    for (const [para, spans] of batch) {
      let list;
      try {
        list = await this.run(spans);
      } catch {
        continue;
      }
      if (gen !== this.generation) return;
      this.store(para, keyOf(spans), list);
      changed = true;
    }
    if (changed) this.onUpdate();
  }
  store(para, key, list) {
    this.byPara.set(para, { key, list });
    if (this.byKey.size > 4e3) this.byKey.clear();
    this.byKey.set(key, list);
  }
  async run(spans) {
    const out = [];
    for (const s of spans) {
      const dict = this.engine.resolve(s.lang);
      if (!dict) continue;
      for (const m of await this.engine.checkText(s.text, dict.id)) out.push({ ...m, lang: dict.id });
    }
    return out.sort((a, b) => a.start - b.start);
  }
};
function misspellingAt(list, offset) {
  return list?.find((m) => offset >= m.start && offset <= m.end);
}
function wavePath(ctx, x1, x2, y, amp = 18, period = 60) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  let up = true;
  for (let x = x1; x < x2; x += period / 2) {
    const nx = Math.min(x2, x + period / 2);
    ctx.quadraticCurveTo((x + nx) / 2, y + (up ? -amp : amp), nx, y);
    up = !up;
  }
}

// src/engine-doc.ts
function buildEngineDoc(input) {
  const { fullDoc, paragraphs, tableAnchors } = input;
  const blocks = [];
  const origins = [];
  const paraBlock = [];
  const firstBlockOf = [];
  const before = /* @__PURE__ */ new Map();
  tableAnchors.forEach((a, i) => {
    const k = Math.min(a.beforePara, paragraphs.length);
    let l = before.get(k);
    if (!l) before.set(k, l = []);
    l.push(i);
  });
  paragraphs.forEach((paragraph, pi) => {
    firstBlockOf[pi] = blocks.length;
    for (const ai of before.get(pi) ?? []) {
      blocks.push(reconcileTableCells(tableAnchors[ai].table));
      origins.push({ kind: "table", anchor: ai });
    }
    paraBlock[pi] = blocks.length;
    blocks.push({ type: "paragraph", paragraph });
    origins.push({ kind: "para", para: pi });
  });
  for (const ai of before.get(paragraphs.length) ?? []) {
    blocks.push(reconcileTableCells(tableAnchors[ai].table));
    origins.push({ kind: "table", anchor: ai });
  }
  const secs = [];
  const sectionMap = [];
  const starts = input.sectionStarts.length ? input.sectionStarts : fullDoc?.sections.length ? [{ startPara: 0, section: fullDoc.sections[0] }] : [];
  if (!starts.length) {
    secs.push({
      sectPr: input.sectPr,
      blockStart: 0,
      blockEnd: blocks.length - 1,
      headers: {},
      footers: {},
      headerRefs: [],
      footerRefs: []
    });
    sectionMap.push(0);
  } else {
    const startBlock = (i) => {
      if (i === 0) return 0;
      const sp = starts[i].startPara;
      return sp >= paragraphs.length ? blocks.length : firstBlockOf[sp];
    };
    for (let i = 0; i < starts.length; i++) {
      const a = startBlock(i);
      const b = i + 1 < starts.length ? startBlock(i + 1) - 1 : blocks.length - 1;
      if (b < a && secs.length) continue;
      const s = starts[i].section;
      secs.push({
        ...s,
        blockStart: a,
        blockEnd: Math.max(a - 1, b),
        headerBlocks: reconcileSet(s.headerBlocks, s.headers),
        footerBlocks: reconcileSet(s.footerBlocks, s.footers)
      });
      sectionMap.push(i);
    }
    secs[secs.length - 1].blockEnd = blocks.length - 1;
  }
  let bookmarks = fullDoc?.bookmarks ?? /* @__PURE__ */ new Map();
  if (input.bookmarkParas) {
    bookmarks = /* @__PURE__ */ new Map();
    for (const [name, pi] of input.bookmarkParas) {
      const b = paraBlock[Math.min(Math.max(0, pi), paragraphs.length - 1)];
      if (b !== void 0) bookmarks.set(name, b);
    }
  }
  const full = {
    ...fullDoc ?? { footnotes: /* @__PURE__ */ new Map(), endnotes: /* @__PURE__ */ new Map(), comments: [], styles: /* @__PURE__ */ new Map() },
    blocks,
    sections: secs,
    bookmarks
  };
  return { full, origins, paraBlock, sectionMap };
}
function reconcileSet(blocks, paras) {
  const out = {};
  for (const k of ["default", "first", "even"]) {
    const r = reconcileBlocks(blocks?.[k], paras[k], true);
    if (r) out[k] = r;
  }
  return out;
}
function reconcileTableCells(t) {
  let changed = false;
  const rows = t.rows.map((row) => {
    let rowChanged = false;
    const cells = row.cells.map((cell) => {
      const c = reconcileCell(cell);
      if (c !== cell) rowChanged = true;
      return c;
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, cells };
  });
  return changed ? { ...t, rows } : t;
}
function reconcileCell(cell) {
  if (!cell.blocks) return cell;
  let blocks = reconcileBlocks(cell.blocks, cell.paragraphs, false);
  let nestedChanged = false;
  const mapped = blocks.map((b) => {
    if (b.type !== "table") return b;
    const t = reconcileTableCells(b);
    if (t !== b) nestedChanged = true;
    return t;
  });
  if (nestedChanged) blocks = mapped;
  return blocks === cell.blocks ? cell : { ...cell, blocks };
}
function reconcileBlocks(blocks, flat, deep) {
  if (!flat) return blocks;
  if (!blocks) return flat.map((paragraph) => ({ type: "paragraph", paragraph }));
  const order = [];
  const walk = (bs) => {
    for (const b of bs) {
      if (b.type === "paragraph") order.push(b.paragraph);
      else if (deep) for (const r of b.rows) for (const c of r.cells) walk(c.blocks ?? c.paragraphs.map((p) => ({ type: "paragraph", paragraph: p })));
    }
  };
  walk(blocks);
  if (order.length === flat.length && order.every((p, i) => p === flat[i])) return blocks;
  const live = new Set(flat);
  const present = new Set(order);
  const after = /* @__PURE__ */ new Map();
  const atStart = [];
  let prev = null;
  for (const p of flat) {
    if (present.has(p)) {
      prev = p;
      continue;
    }
    if (prev) {
      let l = after.get(prev);
      if (!l) after.set(prev, l = []);
      l.push(p);
    } else atStart.push(p);
  }
  const rebuild = (bs) => {
    const out2 = [];
    for (const b of bs) {
      if (b.type === "paragraph") {
        if (live.has(b.paragraph)) out2.push(b);
        for (const q of after.get(b.paragraph) ?? []) out2.push({ type: "paragraph", paragraph: q });
      } else if (deep) {
        out2.push({
          ...b,
          rows: b.rows.map((r) => ({
            ...r,
            cells: r.cells.map((c) => {
              const inner = rebuild(c.blocks ?? c.paragraphs.map((p) => ({ type: "paragraph", paragraph: p })));
              if (!inner.some((x) => x.type === "paragraph")) inner.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
              return {
                ...c,
                blocks: inner,
                paragraphs: inner.filter((x) => x.type === "paragraph").map((x) => x.paragraph)
              };
            })
          }))
        });
      } else out2.push(b);
    }
    return out2;
  };
  const out = rebuild(blocks);
  out.unshift(...atStart.map((paragraph) => ({ type: "paragraph", paragraph })));
  return out;
}
function locateRef(ref, origins) {
  const parts = ref.split("/");
  const hf = /^(hdr|ftr):(first|even|default)$/.exec(parts[0]);
  if (hf) return { kind: "hf", which: hf[1], part: hf[2], path: parts.slice(1) };
  const m = /^b(\d+)$/.exec(parts[0]);
  if (!m) return { kind: "other", root: parts[0] };
  const o = origins[+m[1]];
  if (!o) return { kind: "other", root: parts[0] };
  if (o.kind === "para") return parts.length === 1 ? { kind: "body", para: o.para } : { kind: "other", root: "b" };
  const hops = [];
  let block = -1;
  for (let i = 1; i + 2 < parts.length; i += 3) {
    const r = /^r(\d+)$/.exec(parts[i] ?? "");
    const c = /^c(\d+)$/.exec(parts[i + 1] ?? "");
    const b = /^b(\d+)$/.exec(parts[i + 2] ?? "");
    if (!r || !c || !b) return { kind: "other", root: "b" };
    if (hops.length) hops[hops.length - 1].b = block;
    hops.push({ r: +r[1], c: +c[1] });
    block = +b[1];
  }
  if (!hops.length) return { kind: "other", root: "b" };
  return { kind: "cell", anchor: o.anchor, hops, block };
}
function resolveCell(t, hops) {
  let table = t;
  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    const cell = cellAtGrid(table, h.r, h.c);
    if (!cell) return null;
    if (i === hops.length - 1) return cell;
    const blk = cellBlocks(cell)[h.b ?? -1];
    if (!blk || blk.type !== "table") return null;
    table = blk;
  }
  return null;
}
function hfBlocksFor(full, section, which, part) {
  for (let i = Math.min(section, full.sections.length - 1); i >= 0; i--) {
    const s = full.sections[i];
    const set = which === "hdr" ? s.headerBlocks : s.footerBlocks;
    const own3 = set?.[part];
    if (own3) return { blocks: own3, definer: i };
  }
  return null;
}
function sameHops(a, b) {
  return a.length === b.length && a.every((h, i) => h.r === b[i].r && h.c === b[i].c && (i === a.length - 1 || h.b === b[i].b));
}
function caretXIn(line, offset) {
  const cs = line.chars;
  if (!cs || !cs.length) return line.x;
  let prev = null;
  for (const c of cs) {
    if (c.o === offset) return c.x;
    if (c.o < offset && (!prev || c.o > prev.o || c.o === prev.o && c.x > prev.x)) prev = c;
  }
  if (prev) return prev.x + prev.w;
  let first = cs[0];
  for (const c of cs) if (c.x < first.x) first = c;
  return first.x;
}
function offsetAtX(line, x, end = line.end) {
  const cs = line.chars;
  if (!cs || !cs.length) return line.start;
  const sorted = isSortedByX(cs) ? cs : [...cs].sort((a, b) => a.x - b.x);
  for (const c of sorted) {
    if (c.o < 0) continue;
    if (x < c.x + c.w / 2) return c.o;
  }
  return end;
}
function isSortedByX(cs) {
  for (let i = 1; i < cs.length; i++) if (cs[i].x < cs[i - 1].x) return false;
  return true;
}
function shiftPageItem(it, dx, dy) {
  if (!dx && !dy) return it;
  switch (it.t) {
    case "glyphs":
      return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ ...g, x: g.x + dx })) : it.glyphs };
    case "rect":
    case "image":
    case "shape":
      return { ...it, x: it.x + dx, y: it.y + dy };
    case "line":
      return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case "clip":
      return it.y === void 0 ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    default: {
      const x = it;
      if (x.t === "xform") {
        if (!x.m) return it;
        const [a, b, c, d, e, f] = x.m;
        return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] };
      }
      if (x.t === "path" && x.cmds) {
        return {
          ...it,
          cmds: x.cmds.map((c) => c.op === "Z" ? c : c.op === "C" ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy })
        };
      }
      return it;
    }
  }
}
var near = (a, b) => a === b || a !== void 0 && b !== void 0 && Math.abs(a - b) < 0.01;
function sameItem(a, b) {
  if (a.t !== b.t) return false;
  switch (a.t) {
    case "glyphs": {
      const o = b;
      if (a.face !== o.face || a.sizePt !== o.sizePt || a.color !== o.color || !near(a.y, o.y) || a.glyphs.length !== o.glyphs.length || a.scaleX !== o.scaleX || !!a.synthBold !== !!o.synthBold || !!a.synthItalic !== !!o.synthItalic) return false;
      for (let i = 0; i < a.glyphs.length; i++) if (a.glyphs[i].cp !== o.glyphs[i].cp || !near(a.glyphs[i].x, o.glyphs[i].x)) return false;
      return true;
    }
    case "rect": {
      const o = b;
      return a.fill === o.fill && a.alpha === o.alpha && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h);
    }
    case "line": {
      const o = b;
      return a.color === o.color && a.widthPt === o.widthPt && a.dash === o.dash && near(a.x1, o.x1) && near(a.y1, o.y1) && near(a.x2, o.x2) && near(a.y2, o.y2);
    }
    case "image": {
      const o = b;
      return a.image === o.image && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h);
    }
    case "shape": {
      const o = b;
      return a.style === o.style && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h);
    }
    case "clip": {
      const o = b;
      return a.op === o.op && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h);
    }
    default:
      return JSON.stringify(a) === JSON.stringify(b);
  }
}
function findItems(items, want, from = 0) {
  if (!want.length) return -1;
  outer: for (let k = from; k + want.length <= items.length; k++) {
    if (!sameItem(items[k], want[0])) continue;
    for (let i = 1; i < want.length; i++) if (!sameItem(items[k + i], want[i])) continue outer;
    return k;
  }
  return -1;
}

// src/universal-write.ts
var PX_PER_TWIP = 96 / 72 / TWIPS_PER_PT;
var HF_DIM_ALPHA = 0.5;
var ENGINE_LAYOUT_OPTS = { hyphenationLanguages: ["pt-BR", "en", "es"] };
var hyphenationLangs = (full) => documentHyphenationLanguages(full).filter((l) => {
  const x = l.toLowerCase();
  return ENGINE_LAYOUT_OPTS.hyphenationLanguages.some((y) => {
    const z = y.toLowerCase();
    return x === z || x.startsWith(`${z}-`);
  });
});
var DEFAULT_FONT = "Liberation Sans";
var DEFAULT_FONT_CSS = `"${DEFAULT_FONT}"`;
var STYLES = {
  "Ttulo1": { sizePt: 20, bold: false, color: "0F4761", spaceBeforeTwips: 360 },
  "Heading1": { sizePt: 20, bold: false, color: "0F4761", spaceBeforeTwips: 360 },
  "Ttulo2": { sizePt: 16, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Heading2": { sizePt: 16, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Ttulo3": { sizePt: 14, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Heading3": { sizePt: 14, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Ttulo": { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
  "Title": { sizePt: 28, bold: false, spaceBeforeTwips: 0 }
};
var HIGHLIGHTS2 = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkYellow: "#808000",
  lightGray: "#c0c0c0"
};
var RPR_REF = /* @__PURE__ */ Symbol("uw-rpr");
var insertText2 = (m, pos, text, props) => guardRuns(m, pos.para, pos.para, () => insertText(m, pos, text, props));
var insertRun2 = (m, pos, run) => guardRuns(m, pos.para, pos.para, () => insertRun(m, pos, run));
var deleteRange2 = (m, range) => {
  const r = normalizeRange(range);
  return guardRuns(m, r.start.para, r.end.para, () => deleteRange(m, range));
};
var splitParagraph2 = (m, pos) => guardRuns(m, pos.para, pos.para, () => splitParagraph(m, pos));
var mergeWithPrevious2 = (m, para) => guardRuns(m, para - 1, para, () => mergeWithPrevious(m, para));
var applyRunProps2 = (m, range, patch) => {
  const r = normalizeRange(range);
  guardRuns(m, r.start.para, r.end.para, () => applyRunProps(m, range, patch));
};
var cssFamily = (family) => `"${family.replace(/["\\]/g, "\\$&")}"`;
function collapseCustomChars(line, para) {
  const cs = line.chars;
  if (!cs?.length) return;
  let acc = 0;
  for (const r of para.runs) {
    const a = acc;
    acc += r.text.length;
    if (!r.custom) continue;
    const n = Math.max(1, Array.from(r.custom.fallbackText || " ").length);
    const i = cs.findIndex((c) => c.o === a);
    if (i < 0) continue;
    let j = i;
    while (j + 1 < cs.length && j - i + 1 < n && cs[j + 1].o === cs[j].o + 1) j++;
    const last = cs[j];
    cs.splice(i, j - i + 1, { o: a, x: cs[i].x, w: last.x + last.w - cs[i].x });
  }
}
function itemsBottom(page) {
  let b = 0;
  for (const it of page.items) {
    if (it.t === "rect" || it.t === "image" || it.t === "shape") b = Math.max(b, it.y + it.h);
    else if (it.t === "line") b = Math.max(b, it.y1, it.y2);
    else if (it.t === "glyphs") b = Math.max(b, it.y);
  }
  for (const l of page.lines) b = Math.max(b, l.y + l.height);
  return b;
}
var Registry = class {
  /** `onMiss(família)`: chamada quando a família não está registrada — o
   *  editor consulta o resolvedor de fontes e registra se já houver resposta. */
  constructor(sets, onMiss, onMissVariant) {
    this.sets = sets;
    this.onMiss = onMiss;
    this.onMissVariant = onMissVariant;
  }
  sets;
  onMiss;
  onMissVariant;
  /** muda a cada registro/remoção (o provedor do motor refaz o cache de faces) */
  version = 0;
  /** Registra uma variante de fonte (ex.: fontes EMBEDADAS do .docx). */
  register(family, variant, font) {
    (this.sets[family] ??= {})[variant] = font;
    this.version++;
  }
  has(family) {
    return this.sets[family] !== void 0 || this.sets[family.split(" ")[0]] !== void 0;
  }
  families() {
    return Object.keys(this.sets);
  }
  delete(family) {
    delete this.sets[family];
    this.version++;
  }
  get(family) {
    return this.sets[family];
  }
  resolve(family, variant) {
    if (family && !this.sets[family]) this.onMiss?.(family);
    const requested = family ? this.sets[family] ?? this.sets[family.split(" ")[0]] : void 0;
    if (family && requested && !requested[variant]) this.onMissVariant?.(family, variant);
    const def = this.sets[DEFAULT_FONT] ?? this.sets["Aptos"];
    return requested?.[variant] ?? requested?.regular ?? def[variant] ?? def.regular;
  }
};
var UniversalWriteElement = class _UniversalWriteElement extends HTMLElement {
  model = null;
  pkg = null;
  fullDoc = null;
  /** Tabelas ancoradas antes do parágrafo de índice beforePara. */
  tableAnchors = [];
  /** Seções: a partir de qual parágrafo cada uma vale. */
  sectionStarts = [];
  floatImages = [];
  tableLayouts = [];
  footnoteHits = [];
  pageDark = false;
  pageSections = [];
  // página → índice de seção
  fonts = null;
  /** bytes crus de cada fonte (família→variante) para embutir no PDF exportado. */
  fontBytes = {};
  /** variantes de fonte com FontFace já carregado ("Família variante"). */
  loadedFamilies = /* @__PURE__ */ new Set();
  /** nomes de família com QUALQUER FontFace carregado (p/ escolher a família CSS). */
  loadedFamilyNames = /* @__PURE__ */ new Set();
  /** Resolvedor de fontes ÚNICO dos apps (shared/fonts): host, Local Font
   *  Access, instaladas pelo nome, substitutas abertas, padrão. */
  fontResolver = FontResolver.shared();
  /** Opção "incorporar fontes no arquivo" DESTE documento (lida do settings do
   *  .docx ao abrir; padrões do Word num documento novo). */
  fontEmbedding = { ...DEFAULT_EMBEDDING.write };
  unsubscribeFonts = null;
  /** Famílias (como o documento as nomeia) pedidas ao resolvedor… */
  askedFonts = /* @__PURE__ */ new Set();
  /** …e as que já têm a resposta aplicada ao Registry. */
  appliedFonts = /* @__PURE__ */ new Set();
  /** Arquivo de cada fonte de métrica que tem bytes (nome p/ o PDF + bytes):
   *  o PDF embute EXATAMENTE o arquivo cujas métricas posicionaram o texto. */
  fontFiles = /* @__PURE__ */ new WeakMap();
  refreshQueued = false;
  container;
  input;
  topbarEl;
  bottombarEl;
  chromeSync = null;
  selection = {
    anchor: { para: 0, offset: 0 },
    focus: { para: 0, offset: 0 }
  };
  view = "print";
  readFirstPage = 0;
  // 1ª página do bloco visível no modo Leitura
  zoomBeforeRead = 1;
  // zoom a restaurar ao sair da Leitura
  readWheelLock = false;
  // 1 bloco por gesto de scroll
  zoom = 1;
  showMarks = false;
  layoutCache = [];
  pageCount = 1;
  canvases = [];
  caretVisible = true;
  /** Render "como impresso" (print() e o corpus-lab): sem caret, sem esmaecer
   *  cabeçalho/rodapé e sem sombreamento de campo/comentário — adornos de TELA
   *  que o Word também não imprime. */
  printRender = false;
  /** Layout do MOTOR (docx-layout, o mesmo do PDF) na visão de impressão;
   *  null = layout legado (outras visões, layout="legacy" ou falha do motor). */
  eng = null;
  engVersion = 0;
  /** o motor lançou exceção neste documento: legado até a próxima carga */
  engineFailed = false;
  /** Revisão ortográfica: motor compartilhado (carregado na 1ª pintura) e o
   *  cache dos erros por parágrafo. `spellOff` = desligada no menu (sessão). */
  spell = null;
  spellEngine = null;
  spellLoading = false;
  spellOff = false;
  spellLangs = null;
  spellRepaint = 0;
  /** pintura das páginas do motor em cache (o caret pisca sem repintar glifos) */
  engPageCache = /* @__PURE__ */ new Map();
  /** imagens decodificadas desde a última pintura (invalida o cache) */
  imagesVersion = 0;
  /** faces do motor → família/variante CSS carregada na página */
  engFaceCss = /* @__PURE__ */ new WeakMap();
  /** cache de faces do provedor ao vivo (refeito quando o Registry muda) */
  engFaceCache = /* @__PURE__ */ new Map();
  engFaceCacheVersion = -1;
  /** famílias que o motor pediu e ainda não foram resolvidas (carga em 2º plano) */
  engMissing = /* @__PURE__ */ new Map();
  engFontsAttempted = /* @__PURE__ */ new Set();
  engFontLoad = null;
  /** padrões de hifenização já pedidos (carga em 2º plano, uma vez por idioma) */
  hyphAttempted = /* @__PURE__ */ new Set();
  /** indicadores → índice do parágrafo (deslocado nas edições, como as âncoras) */
  bookmarkParas = /* @__PURE__ */ new Map();
  /** edição de célula de tabela (motor) */
  cellEdit = null;
  /** tempos do último layout do motor (ms) — diagnóstico/medição */
  engineStats = { buildMs: 0, layoutMs: 0, pages: 0, paintMs: 0, mode: "" };
  caretTimer = 0;
  readResizeQueued = false;
  handleWindowResize = () => {
    if (this.view !== "read" || this.readResizeQueued) return;
    this.readResizeQueued = true;
    requestAnimationFrame(() => {
      this.readResizeQueued = false;
      if (!this.isConnected) return;
      this.fitReadZoom();
      this.refreshView();
    });
  };
  undoStack = [];
  redoStack = [];
  pendingProps = null;
  // formatação aplicada antes de digitar
  plainPasteNext = false;
  // próximo paste (Ctrl+Shift+V) cola sem formatação
  // clipboard RICO interno (o sistema só guarda texto): casado por texto, usado
  // pelo "Colar" para preservar a formatação dos runs da ORIGEM.
  richClip = null;
  onSelectionChange = null;
  /** Fontes em memória usadas pela inicialização automática, sem fetch/backend. */
  fontAssets;
  /** Documento inicial em memória usado pela inicialização automática. */
  documentSource;
  initialization = null;
  initialized = false;
  plugins = /* @__PURE__ */ new Map();
  pluginCleanups = /* @__PURE__ */ new Map();
  inlineRenderers = /* @__PURE__ */ new Map();
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display:block; background:#e8e8e8; overflow:auto; position:relative; outline:none; }
      /* p\xE1ginas lado a lado quando o zoom abre espa\xE7o (como no app de refer\xEAncia) */
      .pages {
        padding: 24px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-content: flex-start;
        gap: 24px;
      }
      :host(.view-web) .pages, :host(.view-draft) .pages { padding: 0; display: block; }
      /* borda sutil em vez de sombra (outline n\xE3o afeta o tamanho do canvas) */
      .page { background:white; outline:1px solid var(--md-outline-variant, rgba(0,0,0,.18)); outline-offset:-1px; display:block; cursor:text; flex: none; }
      :host(.view-web) .page, :host(.view-draft) .page { margin: 0 auto; }
      :host(.view-web) .page, :host(.view-draft) .page { outline:none; }
      /* Web/Rascunho s\xE3o CONT\xCDNUOS: sem "desk" cinza em volta \u2014 o fundo \xE9 a
         pr\xF3pria cor da p\xE1gina (a folha preenche a largura). */
      :host(.view-web), :host(.view-draft) { background: #ffffff; }
      :host(.view-web.page-dark), :host(.view-draft.page-dark) { background: #1e1e1e; }
      /* Leitura: fundo da COR DA P\xC1GINA; p\xE1ginas em RAIAS lado a lado, sem
         espa\xE7o entre elas \u2014 a borda sutil de cada p\xE1gina vira o divisor da raia.
         As p\xE1ginas fora do bloco vis\xEDvel ficam display:none. */
      :host(.view-read) { background:#ffffff; }
      :host(.view-read) .pages { flex-wrap: nowrap; align-items: center; justify-content: center; align-content: center; min-height: 100%; gap: 0; padding: 0; }
      /* sem moldura ao redor; o divisor aparece S\xD3 entre p\xE1ginas (borda esq.) */
      :host(.view-read) .page { cursor:default; outline: none; }
      :host(.view-read) .page.read-divider { border-left: 1px solid var(--md-outline-variant, rgba(0,0,0,.18)); }
      :host(.view-outline) .page { outline:none; }
      textarea.proxy { position:absolute; opacity:0; width:1px; height:1em; padding:0; border:0; resize:none; }
      /* barras opcionais (topbar/bottombar) \u2014 sticky para preservar o scroll do host */
      /* sticky nos DOIS eixos (left:0) \u2014 sen\xE3o a barra rola junto quando o
         documento gera scroll horizontal (ex.: zoom alto). A largura \xE9 a do
         viewport (o host de scroll), ent\xE3o cobre a faixa vis\xEDvel em qualquer
         posi\xE7\xE3o de scroll. */
      .uw-topbar, .uw-bottombar { position: sticky; left: 0; z-index: 30; flex: none;
        width: 100%; box-sizing: border-box;
        background: var(--u-color-surface-container, #eef0f2); color: var(--u-color-on-surface, #1b1b1f); }
      .uw-topbar { top: 0; border-bottom: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-bottombar { bottom: 0; border-top: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-topbar:empty, .uw-bottombar:empty { display: none; }
    `;
    this.container = document.createElement("div");
    this.container.className = "pages";
    this.topbarEl = document.createElement("div");
    this.topbarEl.className = "uw-topbar";
    this.bottombarEl = document.createElement("div");
    this.bottombarEl.className = "uw-bottombar";
    this.input = document.createElement("textarea");
    this.input.className = "proxy";
    this.input.setAttribute("aria-hidden", "true");
    root.append(style, this.topbarEl, this.container, this.bottombarEl, this.input);
    this.bindEvents();
  }
  // ─────────────────────── chrome (barras) ───────────────────────
  static get observedAttributes() {
    return ["topbar", "bottombar", "toolbar", "layout", "lang", "nospellcheck"];
  }
  attributeChangedCallback(name) {
    if ((name === "topbar" || name === "bottombar" || name === "toolbar" || name === "lang") && this.initialized) void this.updateChrome();
    if (name === "nospellcheck" && this.model) this.paint();
    if (name === "layout" && this.model) {
      if (this.legacyRequested() && this.cellEdit) this.exitCell();
      this.refresh();
    }
  }
  /** Barra de ferramentas superior (única). */
  get topbar() {
    return this.hasAttribute("topbar");
  }
  set topbar(v) {
    if (v) this.setAttribute("topbar", "");
    else this.removeAttribute("topbar");
  }
  /** Visibilidade da barra inferior (status). */
  get bottombar() {
    return this.hasAttribute("bottombar");
  }
  set bottombar(v) {
    if (v) this.setAttribute("bottombar", "");
    else this.removeAttribute("bottombar");
  }
  chromeReq = 0;
  unsubscribeLang = null;
  chromeListenersBound = false;
  /** (Re)constrói as barras conforme os atributos topbar/bottombar. */
  async updateChrome() {
    const topbar = this.topbar;
    const bottombar = this.bottombar;
    if (!topbar && !bottombar) {
      this.topbarEl.replaceChildren();
      this.bottombarEl.replaceChildren();
      this.chromeSync = null;
      return;
    }
    const req = ++this.chromeReq;
    const { setupChrome } = await import("./chunks/chrome-IC5RAF47.js");
    if (req !== this.chromeReq) return;
    const handle = setupChrome(this, this.topbarEl, this.bottombarEl, { topbar, bottombar, lang: uiLang(this) });
    this.chromeSync = handle.sync;
    if (!this.chromeListenersBound) {
      const relay = () => this.chromeSync?.();
      this.addEventListener("uw-zoom", relay);
      this.addEventListener("uw-change", relay);
      this.chromeListenersBound = true;
    }
  }
  // ───────────────────────── carga ─────────────────────────
  async connectedCallback() {
    window.addEventListener("resize", this.handleWindowResize);
    this.fontResolver.suggestBaseUrl(this.getAttribute("fonts"));
    this.unsubscribeFonts ??= this.fontResolver.onChange((families) => this.onFontsResolved(families));
    this.unsubscribeLang ??= onBrowserLangChange(() => {
      if (this.initialized && !this.hasAttribute("lang")) void this.updateChrome();
    });
    if (this.initialized) this.startCaret();
    if (this.initialized && !this.chromeSync && (this.topbar || this.bottombar)) void this.updateChrome();
    if (!this.hasAttribute("manual-init")) await this.initialize();
  }
  disconnectedCallback() {
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    this.unsubscribeLang?.();
    this.unsubscribeLang = null;
    window.removeEventListener("resize", this.handleWindowResize);
    window.clearInterval(this.caretTimer);
    this.caretTimer = 0;
    this.spell?.dispose();
    this.spell = null;
    this.spellEngine?.dispose();
    this.spellEngine = null;
    if (this.chromeSync) {
      this.chromeSync = null;
      void import("./chunks/chrome-IC5RAF47.js").then((m) => {
        if (!this.isConnected) m.teardownChrome(this);
      });
    }
  }
  /**
   * Inicializa o componente. Com fonts + document em memória, não executa
   * nenhum fetch e funciona em apps estáticos, Electron e WebViews offline.
   */
  async initialize(options = {}) {
    if (this.initialized) return;
    if (!this.initialization) {
      this.initialization = this.initializeInternal(options).catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    await this.initialization;
  }
  async initializeInternal(options) {
    const suppliedFonts = options.fonts ?? this.fontAssets;
    const assets = suppliedFonts ?? await this.fetchDefaultFontAssets();
    await this.installFontAssets(assets);
    const source = options.document ?? this.documentSource;
    if (source) this.loadDocumentSource(source);
    else {
      const src = this.getAttribute("src");
      if (src) {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        this.loadDocx(bytes);
      } else this.newDocument();
    }
    this.initialized = true;
    if (this.isConnected) this.startCaret();
    if (this.topbar || this.bottombar) void this.updateChrome();
    this.dispatchEvent(new CustomEvent("uw-ready", {
      detail: { offline: suppliedFonts !== void 0, plugins: this.pluginIds() }
    }));
  }
  loadDocumentSource(source) {
    if ((source.format ?? "docx") === "odt") {
      this.loadOdt(source.bytes, { protected: source.protected });
    } else {
      this.loadDocx(source.bytes, { protected: source.protected });
    }
  }
  async installFontAssets(assets) {
    const sets = {};
    this.fontBytes = {};
    for (const asset of assets) {
      const bytes = asset.data instanceof Uint8Array ? asset.data : new Uint8Array(asset.data);
      const weight = asset.weight ?? (asset.variant === "bold" || asset.variant === "boldItalic" ? "700" : "400");
      const style = asset.style ?? (asset.variant === "italic" || asset.variant === "boldItalic" ? "italic" : "normal");
      const faceBytes = bytes.slice().buffer;
      const face = new FontFace(asset.family, faceBytes, { weight, style });
      document.fonts.add(await face.load());
      this.loadedFamilyNames.add(asset.family);
      sets[asset.family] ??= {};
      const font = new SfntFont(bytes);
      if (asset.advances) font.setAdvanceTable(asset.advances);
      sets[asset.family][asset.variant] = font;
      this.fontFiles.set(font, { name: asset.family, bytes });
      (this.fontBytes[asset.family] ??= {})[asset.variant] = bytes;
    }
    const def = sets[DEFAULT_FONT];
    if (!def?.regular || !def.bold || !def.italic || !def.boldItalic) {
      throw new Error(`initialize(): provide the four ${DEFAULT_FONT} font variants`);
    }
    this.fonts = new Registry(sets, (family) => this.applyResolvedFont(family), (family, v) => this.requestFace(family, v));
  }
  async fetchDefaultFontAssets() {
    const fontsBase = this.getAttribute("fonts") ?? "";
    const files = [
      // PADRÃO (open, sempre versionada) — Liberation Sans
      [DEFAULT_FONT, "liberationsans-regular.ttf", "regular"],
      [DEFAULT_FONT, "liberationsans-bold.ttf", "bold"],
      [DEFAULT_FONT, "liberationsans-italic.ttf", "italic"],
      [DEFAULT_FONT, "liberationsans-bolditalic.ttf", "boldItalic"],
      // Proprietárias — OPCIONAIS: presentes só no dev local; puladas (404) na
      // build/CI e em produção, onde tudo cai no fallback Liberation Sans.
      ["Aptos", "aptos-regular.ttf", "regular"],
      ["Aptos", "aptos-bold.ttf", "bold"],
      ["Aptos", "aptos-italic.ttf", "italic"],
      ["Aptos", "aptos-bolditalic.ttf", "boldItalic"],
      ["Calibri", "calibri.ttf", "regular"],
      ["Calibri", "calibrib.ttf", "bold"],
      ["Calibri", "calibrii.ttf", "italic"],
      ["Calibri", "calibriz.ttf", "boldItalic"]
    ];
    const tableName = (family, variant) => {
      const prefix = family.toLowerCase().replace(/\s+/g, "");
      const suffix = variant === "regular" ? "" : variant === "boldItalic" ? "-bolditalic" : `-${variant}`;
      return `${prefix}${suffix}-advances.json`;
    };
    const assets = await Promise.all(files.map(async ([family, file, variant]) => {
      const resp = await fetch(`${fontsBase}/${file}`).catch(() => null);
      if (!resp?.ok) return null;
      const data = new Uint8Array(await resp.arrayBuffer());
      let advances;
      try {
        const r = await fetch(`${fontsBase}/${tableName(family, variant)}`);
        if (r.ok) advances = await r.json();
      } catch {
      }
      return { family, variant, data, advances };
    }));
    return assets.filter((a) => a !== null);
  }
  /** Instala um plugin na instância (sem registro global e sem backend). */
  use(plugin) {
    if (!plugin.id.trim()) throw new Error("plugin.id is required");
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    for (const renderer of plugin.inlineRenderers ?? []) {
      if (!/^[a-zA-Z0-9._-]+$/.test(renderer.type)) {
        throw new Error(`invalid inline type: ${renderer.type}`);
      }
      const current = this.inlineRenderers.get(renderer.type);
      if (current) {
        throw new Error(`inline "${renderer.type}" already registered by ${current.owner}`);
      }
    }
    this.plugins.set(plugin.id, plugin);
    for (const renderer of plugin.inlineRenderers ?? []) {
      this.inlineRenderers.set(renderer.type, { owner: plugin.id, renderer });
    }
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === plugin.id) this.inlineRenderers.delete(type);
      }
      throw error;
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent("uw-plugin-added", { detail: { id: plugin.id } }));
  }
  /** Remove o plugin e seus renderers; o conteúdo permanece com fallback textual. */
  unuse(id) {
    if (!this.plugins.has(id)) return false;
    try {
      this.pluginCleanups.get(id)?.();
    } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === id) this.inlineRenderers.delete(type);
      }
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent("uw-plugin-removed", { detail: { id } }));
    return true;
  }
  pluginIds() {
    return [...this.plugins.keys()];
  }
  /** Insere um inline atômico na seleção atual. */
  insertCustomInline(type, data, options = {}) {
    if (!this.model || this.locked()) return;
    const renderer = this.inlineRenderers.get(type)?.renderer;
    const fallbackText = options.fallbackText ?? renderer?.toText?.(data) ?? String(data ?? "");
    this.snapshot();
    if (this.hasSelection()) {
      const deleted = this.deleteSelection();
      this.selection = { anchor: deleted, focus: deleted };
    }
    const props = { ...this.pendingProps ?? this.currentProps() };
    const pos = insertRun2(this.model, this.selection.focus, {
      text: "\uFFFC",
      props,
      custom: { type, data, fallbackText }
    });
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent("uw-custom-inline-inserted", {
      detail: { type, data, fallbackText }
    }));
  }
  // ───────── Modo de Exibição Protegido (mecânica do app de referência) ─────────
  /** Arquivos abertos entram protegidos: leitura até "Habilitar Edição". */
  protectedMode = false;
  isProtected() {
    return this.protectedMode;
  }
  enableEditing() {
    if (!this.protectedMode) return;
    this.protectedMode = false;
    this.dispatchEvent(new CustomEvent("uw-protected", {
      detail: { active: false, hasFields: this.hasExternalFields() }
    }));
    this.refreshView();
    this.focusEditor();
  }
  /** Campos que podem referenciar outros componentes (TOC/PAGE/DATE...). */
  hasExternalFields() {
    if (!this.model) return false;
    return this.model.paragraphs.some(
      (p) => p.props.tocInstr || p.props.tocEntry || p.runs.some((r) => r.field)
    );
  }
  /** Edição bloqueada? (modo protegido ou visão de leitura) */
  locked() {
    return this.protectedMode || this.view === "read";
  }
  /** Carrega um .docx (bytes). opts.protected = decisão pelo critério do
   *  app de referência: Mark-of-the-Web (Electron lê o Zone.Identifier real; browser usa
   *  Trusted Documents). Default: protegido (conservador). */
  /** Formato do documento carregado (usado por save('auto')). */
  loadedFormat = "docx";
  /**
   * Carrega um documento. Com format='auto' (padrão) detecta docx vs odt pelos
   * bytes. É a API única de carga (loadDocx/loadOdt são internos).
   */
  load(bytes, format = "auto", opts = {}) {
    const fmt2 = format === "auto" ? this.detectFormat(bytes) : format;
    if (fmt2 === "odt") this.loadOdt(bytes, opts);
    else this.loadDocx(bytes, opts);
  }
  /** Detecta o formato pelos bytes: docx e odt são ZIP; o odt guarda o mimetype
   *  "…opendocument.text" logo no início. */
  detectFormat(bytes) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 2e3)));
    return head.includes("opendocument.text") ? "odt" : "docx";
  }
  loadDocx(bytes, opts = {}) {
    this.protectedMode = opts.protected ?? true;
    if (isWordBinary(bytes)) bytes = convertDocToDocx(bytes);
    this.pkg = DocxPackage.load(bytes);
    this.loadedBytes = bytes;
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write, ...readDocxEmbedding(this.pkg).settings };
    this.fullDoc = readFullDocument(this.pkg, { sources: true });
    this.loadedFormat = "docx";
    this.installFullDoc();
    void this.registerEmbeddedFonts(this.pkg);
  }
  /** Carrega as fontes EMBEDADAS do .docx (word/fonts/*.odttf desofuscadas): cria
   *  o FontFace (render) e o SfntFont (métricas/layout), e repinta ao terminar.
   *  Sem isto o render cairia no Aptos/Calibri em vez da fonte real (ex.: Lato). */
  async registerEmbeddedFonts(pkg) {
    let fonts;
    try {
      fonts = readEmbeddedFonts(pkg);
    } catch {
      return;
    }
    if (!fonts.length || !this.fonts) return;
    let added = false;
    for (const f of fonts) {
      if (this.loadedFamilies.has(`${f.family} ${f.variant}`)) continue;
      const weight = f.variant === "bold" || f.variant === "boldItalic" ? "700" : "400";
      const style = f.variant === "italic" || f.variant === "boldItalic" ? "italic" : "normal";
      try {
        const face = new FontFace(f.family, f.data.slice().buffer, { weight, style });
        await face.load();
        document.fonts.add(face);
      } catch {
        continue;
      }
      this.loadedFamilies.add(`${f.family} ${f.variant}`);
      this.loadedFamilyNames.add(f.family);
      try {
        const sf = new SfntFont(f.data);
        this.fonts.register(f.family, f.variant, sf);
        this.fontFiles.set(sf, { name: f.family, bytes: f.data });
      } catch {
      }
      (this.fontBytes[f.family] ??= {})[f.variant] = f.data;
      added = true;
    }
    if (added && this.model) this.refresh();
  }
  /**
   * Carrega um .odt (OpenDocument Text). Não há pacote OOXML original — ao
   * salvar como .docx o pkg é criado do zero (DocxPackage.empty()).
   */
  loadOdt(bytes, opts = {}) {
    this.protectedMode = opts.protected ?? false;
    this.pkg = null;
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write };
    this.fullDoc = readOdt(bytes);
    this.loadedBytes = null;
    this.loadedFormat = "odt";
    this.installFullDoc();
  }
  /**
   * Salva/exporta o documento no formato pedido. Com format='auto' (padrão)
   * usa o formato originalmente carregado (docx ou odt). API única de saída —
   * retorna Uint8Array (docx/odt/pdf/xps) ou string (html/markdown).
   */
  async save(format = "auto", opts = {}) {
    const embed = opts.images !== false;
    const fmt2 = format === "auto" ? this.loadedFormat : format;
    switch (fmt2) {
      case "odt":
        return this.exportOdt({ images: embed ? "embed" : "omit" });
      case "pdf":
        return this.exportPdf();
      case "html":
        return this.exportHtml(opts.title, { images: embed ? "data" : "omit" });
      case "markdown":
        return this.exportMarkdown(opts.title, { images: embed ? "data" : "omit" });
      case "xps":
        return this.exportXps();
      case "docx":
      default:
        return this.saveDocxWithFonts();
    }
  }
  // ───────────────────────── fontes no arquivo ─────────────────────────
  /** Opção "incorporar fontes no arquivo" deste documento. */
  getFontEmbedding() {
    return { ...this.fontEmbedding };
  }
  /** Muda a opção (vale no próximo salvar .docx; marca o documento como alterado). */
  setFontEmbedding(settings) {
    this.fontEmbedding = { ...this.fontEmbedding, ...settings };
    this.dispatchEvent(new CustomEvent("uw-change"));
  }
  /**
   * Salva o .docx aplicando a opção de fontes (resolvedor único + gravação em
   * shared/fonts): ligada, acrescenta as famílias usadas que ainda não estão
   * no arquivo; desligada, tira as incorporadas — como o Word. O que ficou de
   * fora (fonte comum, licença, sem o arquivo) vai no evento
   * `uw-font-embedding` (detail: EmbeddingPlan resumido).
   */
  async saveDocxWithFonts() {
    const pkg = DocxPackage.load(this.saveDocx());
    const settings = this.fontEmbedding;
    let plan = { faces: [], skipped: [] };
    if (settings.embed) {
      plan = await planFontEmbedding(this.fontResolver, this.fontUsage(), settings, "write", {
        documentFace: (family, v) => this.fontBytes[family]?.[v],
        alreadyEmbedded: readDocxEmbedding(pkg).embedded
      });
    }
    writeDocxEmbedding(pkg, plan, settings);
    this.dispatchEvent(new CustomEvent("uw-font-embedding", {
      detail: {
        embedded: [...new Set(plan.faces.map((f) => f.family))],
        skipped: plan.skipped.filter((s) => s.reason !== "already-embedded")
      }
    }));
    return pkg.save();
  }
  /** Famílias/variantes/texto que o documento usa — a MESMA resolução do layout
   *  (buildSpans): corpo, tabelas, cabeçalhos/rodapés e caixas de texto. */
  fontUsage() {
    const out = [];
    const paras = (ps) => {
      for (const p of ps ?? []) {
        for (const s of this.buildSpans(p)) if (s.family && s.text) out.push({ family: s.family, variants: [s.variant], text: s.text });
        for (const r of p.runs) if (r.textbox) paras(r.textbox.paras);
      }
    };
    const table = (t) => {
      for (const row of t.rows) for (const c of row.cells) {
        paras(c.paragraphs);
        c.tables.forEach(table);
      }
    };
    paras(this.model?.paragraphs);
    for (const a of this.tableAnchors) table(a.table);
    for (const sec of this.fullDoc?.sections ?? []) {
      for (const set of [sec.headers, sec.footers]) {
        paras(set.default);
        paras(set.first);
        paras(set.even);
      }
    }
    return out;
  }
  /** Comum entre loadDocx e loadOdt — popula model/sections/floatImages a
   *  partir de this.fullDoc e dispara uw-protected. */
  installFullDoc() {
    if (!this.fullDoc) throw new Error("installFullDoc without fullDoc");
    this.resetEngineState();
    const paragraphs = [];
    this.tableAnchors = [];
    const paraOfBlock = [];
    for (const block of this.fullDoc.blocks) {
      paraOfBlock.push(paragraphs.length);
      if (block.type === "paragraph") paragraphs.push(block.paragraph);
      else this.tableAnchors.push({ beforePara: paragraphs.length, table: block });
    }
    if (paragraphs.length === 0) paragraphs.push({ runs: [], props: {} });
    for (const [name, b] of this.fullDoc.bookmarks ?? []) {
      this.bookmarkParas.set(name, Math.min(paraOfBlock[b] ?? paragraphs.length - 1, paragraphs.length - 1));
    }
    this.syncRunRPr(paragraphs);
    for (const a of this.tableAnchors) this.syncTableRPr(a.table);
    for (const s of this.fullDoc.sections) {
      for (const set of [s.headers, s.footers]) for (const ps of [set.default, set.first, set.even]) if (ps) this.syncRunRPr(ps);
    }
    this.sectionStarts = this.fullDoc.sections.map((section) => {
      let startPara = 0;
      for (let b = 0; b < section.blockStart; b++) {
        if (this.fullDoc.blocks[b].type === "paragraph") startPara++;
      }
      return { startPara, section };
    });
    markSectionBreaks(this.fullDoc);
    this.floatImages = [];
    paragraphs.forEach((p, pi) => {
      for (const run of p.runs) {
        if (run.field && run.text === "") {
          if (/DATE/i.test(run.field)) {
            run.text = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
          } else if (/PAGE/i.test(run.field)) {
            run.text = "1";
          }
        }
        if (run.noteRef && run.text === "") run.text = String(run.noteRef.id);
        if (run.image?.floating) this.floatImages.push({ para: pi, run });
      }
    });
    this.model = {
      paragraphs,
      sectPr: this.fullDoc.sections[0]?.sectPr ?? {
        pageWidthTwips: 11906,
        pageHeightTwips: 16838,
        marginLeftTwips: 1701,
        marginRightTwips: 1701,
        marginTopTwips: 1417,
        marginBottomTwips: 1417
      }
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.editsSinceLoad = 0;
    this.fullDoc.sources?.baseline();
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-protected", {
      detail: { active: this.protectedMode, hasFields: this.hasExternalFields() }
    }));
  }
  newDocument() {
    this.resetEngineState();
    this.protectedMode = false;
    this.loadedBytes = null;
    this.editsSinceLoad = 0;
    this.loadedFormat = "docx";
    this.pkg = null;
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write };
    this.fullDoc = null;
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.model = {
      paragraphs: [{ runs: [], props: {} }],
      sectPr: {
        pageWidthTwips: 11906,
        pageHeightTwips: 16838,
        marginLeftTwips: 1701,
        marginRightTwips: 1701,
        marginTopTwips: 1417,
        marginBottomTwips: 1417
      }
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
  }
  setDarkPage(dark) {
    this.pageDark = dark;
    this.classList.toggle("page-dark", dark);
    this.refreshView();
    this.paint();
  }
  /**
   * Cor "efetiva" para o canvas no tema escuro total: inverte a LUMINOSIDADE
   * (HSL: L = 100-L) preservando matiz e saturação. Preto vira branco, branco
   * vira preto, cinza claro vira cinza escuro, azul claro vira azul escuro etc.
   *
   * Não toca PDF/XPS/HTML/Markdown/ODT — esses são SAÍDA do documento e devem
   * manter as cores originais; o tema escuro é só renderização local no canvas.
   *
   * Aceita "RRGGBB" (sem #) ou "#RRGGBB". Retorna sempre "#RRGGBB" pronto p/
   * `ctx.fillStyle`/`strokeStyle`.
   */
  inkColor(hex, fallbackLight = "#000", fallbackDark = "#e8eaed") {
    if (!hex) return this.pageDark ? fallbackDark : fallbackLight;
    const h = hex.startsWith("#") ? hex.slice(1) : hex;
    if (!this.pageDark) return `#${h}`;
    if (h.length !== 6) return `#${h}`;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let hh = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          hh = ((b - r) / d + 2) / 6;
          break;
        case b:
          hh = ((r - g) / d + 4) / 6;
          break;
      }
    }
    const lInv = 1 - l;
    const c = (1 - Math.abs(2 * lInv - 1)) * s;
    const x = c * (1 - Math.abs(hh * 6 % 2 - 1));
    const m = lInv - c / 2;
    let rr = 0, gg = 0, bb = 0;
    const seg = Math.floor(hh * 6);
    if (seg === 0) {
      rr = c;
      gg = x;
    } else if (seg === 1) {
      rr = x;
      gg = c;
    } else if (seg === 2) {
      gg = c;
      bb = x;
    } else if (seg === 3) {
      gg = x;
      bb = c;
    } else if (seg === 4) {
      rr = x;
      bb = c;
    } else {
      rr = c;
      bb = x;
    }
    const toHex2 = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex2(rr)}${toHex2(gg)}${toHex2(bb)}`;
  }
  // ───────────────── edição de cabeçalho/rodapé ─────────────────
  hfEdit = null;
  dirtyHf = /* @__PURE__ */ new Set();
  savedBody = null;
  /** Página onde o HF está sendo editado (preserva a paginação do corpo). */
  hfActivePage = 0;
  // ─────────────── edição de caixa de texto flutuante ───────────────
  // Foco numa caixa de texto (wps:txbx): troca this.model para os parágrafos
  // INTERNOS da caixa, posicionados no retângulo ancorado. Pode empilhar sobre
  // a edição de HF (a caixa mora no header/footer) ou sair direto do corpo.
  tbEdit = null;
  savedForTb = null;
  tbBgSnapshots = [];
  /** Ao capturar o snapshot de fundo da edição de caixa: run cujo textbox NÃO é
   *  pintado (será desenhado ao vivo em foco), evitando texto "fantasma". */
  tbSnapshotSuppress = null;
  // ─────────── seleção/manipulação de objeto flutuante (imagem/caixa) ───────────
  /** Run que carrega o objeto flutuante SELECIONADO (mostra handles). */
  floatSel = null;
  /** Estado do arrasto de mover/redimensionar em andamento. */
  floatDrag = null;
  editingHeaderFooter() {
    return this.hfEdit?.kind ?? null;
  }
  /** true quando o foco está DENTRO de uma caixa de texto. */
  editingTextbox() {
    return this.tbEdit !== null;
  }
  enterHeaderFooter(kind, activePage = 0) {
    if (!this.model || this.hfEdit || this.locked()) return;
    if (this.cellEdit) {
      this.exitCell();
      this.refreshSelection();
    }
    this.floatSel = null;
    this.hfActivePage = Math.max(0, Math.min(activePage, this.pageCount - 1));
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [],
        sections: [{
          sectPr: this.model.sectPr,
          blockStart: 0,
          blockEnd: 0,
          headers: {},
          footers: {},
          headerRefs: [],
          footerRefs: []
        }],
        footnotes: /* @__PURE__ */ new Map(),
        endnotes: /* @__PURE__ */ new Map(),
        comments: [],
        styles: /* @__PURE__ */ new Map(),
        bookmarks: /* @__PURE__ */ new Map()
      };
    }
    const sIdx = this.pageSections[this.hfActivePage] ?? 0;
    const fd = this.fullDoc;
    let sec = this.sectionStarts[sIdx]?.section ?? fd.sections[0];
    let partType = this.hfActivePage === 0 && (kind === "header" ? sec.headers : sec.footers).first ? "first" : "default";
    const engPart = this.eng ? this.hfPartOfPage(kind, this.hfActivePage) : null;
    if (engPart) ({ section: sec, type: partType } = engPart);
    const set = kind === "header" ? sec.headers : sec.footers;
    const refs = kind === "header" ? sec.headerRefs : sec.footerRefs;
    if (!set[partType]) set[partType] = [{ runs: [], props: {} }];
    const part = set[partType];
    for (const p of part) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor()) : /PAGE/i.test(run.field) ? String(this.pageNumberFor(this.hfActivePage)) : /DATE/i.test(run.field) ? (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") : run.field.trim();
        }
      }
    }
    let ref = refs.find((r) => r.type === partType);
    if (!ref) {
      ref = { type: partType, rid: `rIdWn${kind}${partType}`, path: `word/uw-${kind}-${partType}.xml` };
      refs.push(ref);
      this.dirtyHf.add(ref.path);
    }
    if (!engPart) {
      this.hfCapturing = true;
      this.paint();
      this.hfBodySnapshots = this.canvases.map((c) => {
        const snap = document.createElement("canvas");
        snap.width = c.width;
        snap.height = c.height;
        if (c.width > 1) snap.getContext("2d").drawImage(c, 0, 0);
        return snap;
      });
      this.hfCapturing = false;
    }
    this.savedBody = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections]
    };
    this.model = { paragraphs: part, sectPr: this.savedBody.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.hfEdit = { kind, path: ref.path };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-hfmode", { detail: { active: true, kind } }));
  }
  exitHeaderFooter() {
    if (this.tbEdit) this.exitTextbox();
    if (!this.hfEdit || !this.savedBody) return;
    this.floatSel = null;
    this.hfBodySnapshots = [];
    this.model = this.savedBody.model;
    this.tableAnchors = this.savedBody.tableAnchors;
    this.sectionStarts = this.savedBody.sectionStarts;
    this.floatImages = this.savedBody.floatImages;
    this.selection = this.savedBody.selection;
    this.undoStack = this.savedBody.undoStack;
    this.redoStack = this.savedBody.redoStack;
    this.savedBody = null;
    this.hfEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-hfmode", { detail: { active: false } }));
  }
  /** Entra na edição do conteúdo de uma caixa de texto flutuante. hostRun é o
   *  run que carrega `.textbox`; rectTwips é o retângulo ancorado (coords de
   *  página, twips); caret opcional posiciona o cursor no ponto do clique. */
  enterTextbox(hostRun, rectTwips, pageIdx, caret) {
    if (!this.model || !hostRun.textbox || this.tbEdit || this.locked()) return;
    if (this.cellEdit) {
      this.exitCell();
      this.refreshSelection();
    }
    this.floatSel = null;
    const tb = hostRun.textbox;
    for (const p of tb.paras) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor()) : /PAGE/i.test(run.field) ? String(this.pageNumberFor(pageIdx)) : /DATE/i.test(run.field) ? (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") : run.field.trim();
        }
      }
    }
    this.tbSnapshotSuppress = hostRun;
    this.paint();
    this.tbSnapshotSuppress = null;
    this.tbBgSnapshots = this.canvases.map((c) => {
      const snap = document.createElement("canvas");
      snap.width = c.width;
      snap.height = c.height;
      if (c.width > 1) snap.getContext("2d").drawImage(c, 0, 0);
      return snap;
    });
    this.savedForTb = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections]
    };
    this.model = { paragraphs: tb.paras, sectPr: this.savedForTb.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.tbEdit = { hostRun, rectTwips, pageIdx };
    const start = caret ?? { para: 0, offset: 0 };
    this.selection = { anchor: start, focus: start };
    this.undoStack = [];
    this.redoStack = [];
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.focusEditor();
    this.dispatchEvent(new CustomEvent("uw-tbmode", { detail: { active: true } }));
  }
  exitTextbox() {
    if (!this.tbEdit || !this.savedForTb) return;
    const tbx = this.tbEdit.hostRun.textbox;
    if (tbx?.blocks) tbx.blocks = reconcileBlocks(tbx.blocks, tbx.paras, true);
    this.tbBgSnapshots = [];
    this.model = this.savedForTb.model;
    this.tableAnchors = this.savedForTb.tableAnchors;
    this.sectionStarts = this.savedForTb.sectionStarts;
    this.floatImages = this.savedForTb.floatImages;
    this.selection = this.savedForTb.selection;
    this.undoStack = this.savedForTb.undoStack;
    this.redoStack = this.savedForTb.redoStack;
    this.savedForTb = null;
    this.tbEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-tbmode", { detail: { active: false } }));
  }
  /** Desloca âncoras de tabela/seção quando parágrafos entram/saem. */
  shiftAnchors(fromPara, delta) {
    if (this.cellEdit) return;
    for (const a of this.tableAnchors) if (a.beforePara > fromPara) a.beforePara += delta;
    for (const s of this.sectionStarts) if (s.startPara > fromPara) s.startPara += delta;
    for (const f of this.floatImages) if (f.para > fromPara) f.para += delta;
    if (!this.hfEdit && !this.tbEdit) {
      for (const [k, v] of this.bookmarkParas) if (v > fromPara) this.bookmarkParas.set(k, Math.max(0, v + delta));
    }
  }
  // ───────────────────────── API pública ─────────────────────────
  setView(v) {
    const prev = this.view;
    if (this.cellEdit && v !== "print") this.exitCell();
    const z0 = this.zoom;
    if (v === "read" && prev !== "read") this.zoomBeforeRead = this.zoom;
    this.view = v;
    this.classList.remove("view-print", "view-web", "view-draft", "view-read", "view-outline");
    this.classList.add(`view-${v}`);
    if (v === "read") {
      this.readFirstPage = 0;
      this.fitReadZoom();
    } else if (prev === "read") this.zoom = this.zoomBeforeRead;
    this.refresh();
    this.scrollTop = 0;
    if (this.zoom !== z0) this.dispatchEvent(new CustomEvent("uw-zoom", { detail: { zoom: this.zoom } }));
  }
  getView() {
    return this.view;
  }
  // ── Modo Leitura: páginas em RAIAS (N por largura), navegadas em blocos ───
  /** Zoom: N páginas cabem na LARGURA e cada uma na ALTURA (o menor dos dois). */
  fitReadZoom() {
    if (!this.model) return;
    const s = this.sect();
    const pageW1 = s.pageWidthTwips * PX_PER_TWIP;
    const pageH1 = s.pageHeightTwips * PX_PER_TWIP;
    const n = this.readPagesPerView();
    const availW = (this.clientWidth || 1200) - 8;
    const availH = (this.clientHeight || 800) - 8;
    this.zoom = Math.max(0.1, Math.min(5, availW / (n * pageW1), availH / pageH1));
  }
  /** Nº de raias (páginas lado a lado) — escala com a largura: ~2 em 1440p,
   *  3 em 2560px, 4 em 4K. (largura-alvo por página ≈ 880px) */
  readPagesPerView() {
    return Math.max(1, Math.round((this.clientWidth || 1200) / 880));
  }
  /** Exibe só o bloco de N páginas a partir de readFirstPage; oculta as demais. */
  applyReadSpread() {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    this.readFirstPage = Math.max(0, Math.min(this.readFirstPage, Math.max(0, total - 1)));
    const a = this.readFirstPage, b = a + n;
    this.canvases.forEach((c, i) => {
      const shown = i >= a && i < b;
      c.style.display = shown ? "" : "none";
      c.classList.toggle("read-divider", shown && i > a);
    });
  }
  /** Navega ±1 bloco (N páginas) no modo Leitura. */
  nudgeRead(dir) {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    let next = this.readFirstPage + dir * n;
    if (next >= total) return;
    next = Math.max(0, next);
    if (next === this.readFirstPage) return;
    this.readFirstPage = next;
    this.scrollTop = 0;
    this.applyReadSpread();
    this.ensureVisiblePainted();
  }
  /** Zoom 10%–500%. anchorY (px do viewport): ponto que deve ficar parado. */
  setZoom(z, anchorY) {
    const clamped = Math.min(5, Math.max(0.1, z));
    if (clamped === this.zoom) return;
    const old = this.zoom;
    const anchor = anchorY ?? this.clientHeight / 2;
    const docY = this.scrollTop + anchor;
    this.zoom = clamped;
    this.refreshView();
    this.scrollTop = docY * clamped / old - anchor;
    this.dispatchEvent(new CustomEvent("uw-zoom", { detail: { zoom: clamped } }));
  }
  getZoom() {
    return this.zoom;
  }
  toggleMarks() {
    this.showMarks = !this.showMarks;
    this.refreshView();
    return this.showMarks;
  }
  getSelectionState() {
    const run = { ...this.pendingProps ?? this.currentProps() };
    const p = this.model?.paragraphs[this.selection.focus.para];
    const st = p ? this.styleOf(p) : void 0;
    const dd = this.docDefaults();
    const para = { ...p?.props ?? {} };
    if (para.alignment === void 0) para.alignment = st?.alignment;
    if (run.fontAscii === void 0) run.fontAscii = st?.fontAscii ?? dd.run.fontAscii ?? DEFAULT_FONT;
    if (run.szHalfPt === void 0) {
      run.szHalfPt = st?.sizePt !== void 0 ? Math.round(st.sizePt * 2) : dd.run.szHalfPt ?? 22;
    }
    return { run, para, view: this.view, marks: this.showMarks };
  }
  toggleRunProp(key) {
    const cur = this.pendingProps ?? this.currentProps();
    this.formatRuns({ [key]: !cur[key] });
  }
  toggleVertAlign(kind) {
    const cur = (this.pendingProps ?? this.currentProps()).vertAlign;
    this.formatRuns({ vertAlign: cur === kind ? void 0 : kind });
  }
  setFontSize(pt) {
    this.formatRuns({ szHalfPt: Math.round(pt * 2) });
  }
  growFont(delta) {
    const cur = (this.pendingProps ?? this.currentProps()).szHalfPt ?? 22;
    this.formatRuns({ szHalfPt: Math.max(2, cur + delta * 2) });
  }
  setFontFamily(name) {
    void this.ensureFontLoaded(name);
    this.formatRuns({ fontAscii: name });
  }
  /** Famílias de fonte JÁ carregadas (bundled + embedadas do doc), em ordem. */
  knownFontFamilies() {
    return [...this.loadedFamilyNames].sort((a, b) => a.localeCompare(b));
  }
  /** True quando a lista de fontes do SO vem do host (sem gesto/permissão). */
  hasHostSystemFonts() {
    return this.fontResolver.hasHost;
  }
  /** Lista para o seletor: carregadas (bundled + embedadas) + as do resolvedor
   *  que o Write consegue usar COM o arquivo (host; Local Font Access se
   *  permitida; as abertas embarcadas e as que têm substituta). */
  async listAvailableFonts() {
    const all = /* @__PURE__ */ new Set([...this.loadedFamilyNames, ...await this.fontResolver.listFamilies({ withFile: true })]);
    return [...all].sort((a, b) => a.localeCompare(b));
  }
  /** Pede a Local Font Access (Chromium) — CHAMAR NUM GESTO (ex.: abrir o
   *  seletor de fonte). Concedida, a lista ganha todas as fontes instaladas e
   *  as que estavam só pelo nome/substitutas passam a usar o arquivo real. */
  requestSystemFonts() {
    return this.fontResolver.requestLocalAccess();
  }
  /** Resolve uma família (resolvedor único) — ao chegar, refaz layout e pintura. */
  async ensureFontLoaded(family) {
    if (!family || this.loadedFamilyNames.has(family)) return;
    await this.fontResolver.resolveWithFile([family]);
  }
  /** O resolvedor (re)resolveu famílias: atualiza as que este documento usa. */
  onFontsResolved(families) {
    const keys = new Set(families.map((f) => f.toLowerCase()));
    let changed = false;
    for (const u of this.askedFonts) {
      if (!keys.has(u.toLowerCase())) continue;
      this.appliedFonts.delete(u);
      this.fonts?.delete(u);
      this.applyResolvedFont(u);
      changed = true;
    }
    if (changed) this.queueRefresh();
  }
  /**
   * Registra no Registry as métricas da família vinda do resolvedor (síncrono,
   * se já resolvida; senão pede e o aviso de onChange refaz o layout). O Write
   * mede e embute com o ARQUIVO da fonte: família que o navegador só expõe pelo
   * nome vem como a substituta métrico-compatível ou o padrão (getWithFile) —
   * igual na tela e no PDF. Fonte embutida/bundled do próprio editor nunca é
   * sobreposta.
   */
  applyResolvedFont(family) {
    if (!this.fonts || this.loadedFamilyNames.has(family) || this.appliedFonts.has(family)) return false;
    this.askedFonts.add(family);
    const r = this.fontResolver.getWithFile(family);
    if (!r) {
      void this.fontResolver.resolveWithFile([family]);
      return false;
    }
    this.appliedFonts.add(family);
    if (r.source === "default") return false;
    let registered = false;
    for (const v of ["regular", "bold", "italic", "boldItalic"]) {
      const font = this.layoutFontFor(r, v);
      if (!font) continue;
      this.fonts.register(family, v, font);
      registered = true;
    }
    return registered;
  }
  /** O layout pediu uma variante que ainda não chegou (as substitutas e
   *  embarcadas baixam só a regular de início): pede os bytes dela; ao chegar,
   *  o onChange reaplica a família e refaz o layout. */
  requestFace(family, v) {
    if (this.loadedFamilyNames.has(family)) return;
    const r = this.fontResolver.getWithFile(family);
    if (!r || r.faces[v]) return;
    const key = `${family.toLowerCase()}|${v}`;
    if (this.faceRequests.has(key)) return;
    this.faceRequests.add(key);
    void this.fontResolver.loadFace(r, v);
  }
  faceRequests = /* @__PURE__ */ new Set();
  layoutFontFor(r, v) {
    const bytes = r.faces[v];
    if (bytes) {
      try {
        const sf = new SfntFont(bytes);
        if (r.embeddable) this.fontFiles.set(sf, { name: r.cssFamily, bytes });
        (this.fontBytes[r.cssFamily] ??= {})[v] = bytes;
        return sf;
      } catch {
      }
    }
    return null;
  }
  /** Família COM ARQUIVO para o XPS (que embute os bytes): a do canvas; sem
   *  bytes embutíveis (licença que não permite), a substituta já carregada ou
   *  o padrão. */
  fileFamilyFor(family) {
    const fam = this.familyFor(family);
    if (this.fontBytes[fam]) return fam;
    const sub = family ? METRIC_SUBSTITUTES[family.toLowerCase()] : void 0;
    return sub && this.fontBytes[sub] ? sub : DEFAULT_FONT;
  }
  /** Antes de exportar: espera as fontes que o documento usa terminarem de
   *  resolver (a substituta pode estar chegando pela rede) e refaz o layout se
   *  alguma mudou — senão o PDF sairia com a fonte provisória. */
  async settleDocumentFonts() {
    const families = [...new Set(this.fontUsage().map((u) => u.family))].filter((f) => !this.loadedFamilyNames.has(f));
    if (!families.length) return;
    await this.fontResolver.resolveWithFile(families);
    await Promise.all(this.fontUsage().flatMap((u) => {
      const r = this.loadedFamilyNames.has(u.family) ? void 0 : this.fontResolver.getWithFile(u.family);
      return r ? [...u.variants].filter((v) => !r.faces[v]).map((v) => this.fontResolver.loadFace(r, v)) : [];
    }));
    let changed = false;
    for (const f of families) {
      if (this.appliedFonts.has(f)) continue;
      this.applyResolvedFont(f);
      changed = true;
    }
    if ((changed || this.refreshQueued) && this.model) this.refresh();
    await this.settleEngineFonts();
  }
  /** Espera as fontes que o MOTOR pediu (tema, substitutas do Word, símbolos)
   *  chegarem e o layout ser refeito com elas. */
  async settleEngineFonts() {
    for (let i = 0; i < 6 && this.eng; i++) {
      if (!this.engFontLoad) this.scheduleEngineFonts();
      if (!this.engFontLoad) break;
      await this.engFontLoad;
      if (this.refreshQueued && this.model) {
        this.refreshQueued = false;
        this.refresh();
      }
    }
  }
  /** Antes do PDF: famílias cujo arquivo a licença não deixa embutir ganham a
   *  substituta métrico-compatível embarcada, para o PDF embuti-la. */
  async preparePdfFonts() {
    if (!this.fonts) return;
    for (const family of this.fonts.families()) {
      const sub = METRIC_SUBSTITUTES[family.toLowerCase()];
      if (!sub || this.fonts.get(sub)) continue;
      const fonts = Object.values(this.fonts.get(family) ?? {});
      if (fonts.every((f) => f && this.fontFiles.has(f))) continue;
      const faces = await this.fontResolver.bundledFaces(sub, ["regular", "bold", "italic", "boldItalic"]);
      for (const [v, bytes] of Object.entries(faces)) {
        try {
          const sf = new SfntFont(bytes);
          this.fonts.register(sub, v, sf);
          this.fontFiles.set(sf, { name: sub, bytes });
          (this.fontBytes[sub] ??= {})[v] = bytes;
        } catch {
        }
      }
    }
  }
  queueRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      if (this.model) this.refresh();
    });
  }
  setColor(hex) {
    this.formatRuns({ color: hex });
  }
  setHighlight(name) {
    this.formatRuns({ highlight: name });
  }
  clearFormatting() {
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps2(this.model, this.range(), { ...DEFAULT_RUN_PROPS, szHalfPt: void 0, color: void 0, highlight: void 0, fontAscii: void 0, vertAlign: void 0 });
      applyParaProps(this.model, this.range(), { styleId: void 0, alignment: void 0 });
      const { start, end } = normalizeRange(this.range());
      for (let pi = start.para; pi <= end.para; pi++) {
        let acc = 0;
        for (const r of this.model.paragraphs[pi].runs) {
          const a = acc;
          acc += r.text.length;
          const from = pi === start.para ? start.offset : 0;
          const to = pi === end.para ? end.offset : Infinity;
          if (a < from || acc > to) continue;
          delete r.rpr;
          r.props = { ...r.props };
          delete r.props[RPR_REF];
        }
      }
    }
    this.refresh();
  }
  changeCase(mode) {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    this.snapshot();
    const { start, end } = normalizeRange(this.range());
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi];
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc;
        const re = acc + run.text.length;
        acc = re;
        const from = pi === start.para ? Math.max(start.offset, rs) : rs;
        const to = pi === end.para ? Math.min(end.offset, re) : re;
        if (to <= from) continue;
        const seg = run.text.slice(from - rs, to - rs);
        const tx = mode === "upper" ? seg.toUpperCase() : seg.toLowerCase();
        run.text = run.text.slice(0, from - rs) + tx + run.text.slice(to - rs);
      }
    }
    this.refresh();
  }
  setAlignment(a) {
    this.formatPara({ alignment: a });
  }
  /** Aplica hyperlink à seleção; sem seleção e com url, insere a url já linkada. */
  setLink(url) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps2(this.model, this.range(), { link: url || void 0 });
    } else if (url) {
      const start = this.selection.focus;
      const pos = insertText2(this.model, start, url);
      applyRunProps2(this.model, { start, end: pos }, { link: url });
      this.selection = { anchor: pos, focus: pos };
    }
    this.refresh();
  }
  toggleList(kind) {
    const cur = this.model?.paragraphs[this.selection.focus.para]?.props.numbering;
    this.formatPara({
      numbering: cur?.kind === kind ? void 0 : { kind, ilvl: 0 },
      indentLeftTwips: cur?.kind === kind ? void 0 : 720
    });
  }
  indent(delta) {
    const p = this.model?.paragraphs[this.selection.focus.para];
    const cur = p?.props.indentLeftTwips ?? 0;
    this.formatPara({ indentLeftTwips: Math.max(0, cur + delta * 720) || void 0 });
  }
  setLineSpacing(line) {
    this.formatPara({ lineTwentieths: line });
  }
  /** Aplica um estilo de parágrafo replicando o Word: além de setar o styleId,
   *  LIMPA a formatação direta que impediria o estilo de aparecer — props de
   *  parágrafo (numeração/bullet, alinhamento, espaçamento, recuos, bordas) e
   *  props de run UNIFORMES no parágrafo (tamanho/fonte/cor/negrito iguais em
   *  todos os runs). Formatação de run PARCIAL (ex.: uma palavra em negrito) é
   *  preservada — exatamente como o Word faz. */
  applyStyle(styleId) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    const r = this.range();
    const lo = Math.min(r.start.para, r.end.para);
    const hi = Math.max(r.start.para, r.end.para);
    const RUN_KEYS = [
      "szHalfPt",
      "fontAscii",
      "color",
      "bold",
      "italic",
      "underline",
      "underlineStyle",
      "underlineColor",
      "strike",
      "doubleStrike",
      "allCaps",
      "smallCaps",
      "vertAlign",
      "highlight",
      "charSpacingTwips"
    ];
    for (let pi = lo; pi <= hi; pi++) {
      const p = this.model.paragraphs[pi];
      if (!p) continue;
      p.props.styleId = styleId;
      p.props.numbering = void 0;
      p.props.alignment = void 0;
      p.props.spaceBeforeTwips = void 0;
      p.props.spaceAfterTwips = void 0;
      p.props.lineTwentieths = void 0;
      p.props.indentLeftTwips = void 0;
      p.props.indentRightTwips = void 0;
      p.props.indentFirstLineTwips = void 0;
      p.props.borders = void 0;
      p.props.shadingHex = void 0;
      const runs = p.runs;
      if (runs.length) {
        for (const key of RUN_KEYS) {
          const first = runs[0].props[key];
          if (first === void 0) continue;
          if (runs.every((rn) => rn.props[key] === first)) {
            for (const rn of runs) delete rn.props[key];
          }
        }
      }
    }
    this.pendingProps = null;
    this.refresh();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  setShading(hex) {
    this.formatPara({ shadingHex: hex });
  }
  setCharSpacing(twips) {
    this.formatRuns({ charSpacingTwips: twips });
  }
  setSpecialIndent(kind) {
    this.formatPara({
      indentFirstLineTwips: kind === "none" ? void 0 : kind === "firstLine" ? 708 : -708
    });
  }
  setIndentRight(twips) {
    this.formatPara({ indentRightTwips: twips });
  }
  // pincel de formatação
  painterProps = null;
  copyFormat() {
    if (!this.model) return;
    this.painterProps = {
      run: this.currentProps(),
      para: { ...this.model.paragraphs[this.selection.focus.para].props }
    };
  }
  painterActive() {
    return this.painterProps !== null;
  }
  applyPainter() {
    if (!this.painterProps || !this.model) return;
    const { run, para } = this.painterProps;
    this.painterProps = null;
    this.snapshot();
    if (this.hasSelection()) applyRunProps2(this.model, this.range(), run);
    applyParaProps(this.model, this.range(), para);
    this.refresh();
  }
  // localizar / substituir
  findNext(needle) {
    if (!this.model || !needle) return false;
    const lower = needle.toLowerCase();
    const startP = this.selection.focus.para;
    const startO = this.selection.focus.offset;
    const n = this.model.paragraphs.length;
    for (let k = 0; k <= n; k++) {
      const pi = (startP + k) % n;
      const text = paraText(this.model.paragraphs[pi]).toLowerCase();
      const from = k === 0 ? startO : 0;
      const idx = text.indexOf(lower, from);
      if (idx >= 0) {
        this.selection = {
          anchor: { para: pi, offset: idx },
          focus: { para: pi, offset: idx + needle.length }
        };
        this.refreshSelection();
        this.scrollCaretIntoView();
        return true;
      }
    }
    return false;
  }
  replaceAll(needle, replacement) {
    if (!this.model || !needle) return 0;
    this.snapshot();
    let count = 0;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let from = 0;
      for (; ; ) {
        const text = paraText(this.model.paragraphs[pi]).toLowerCase();
        const idx = text.indexOf(needle.toLowerCase(), from);
        if (idx < 0) break;
        const pos = deleteRange2(this.model, {
          start: { para: pi, offset: idx },
          end: { para: pi, offset: idx + needle.length }
        });
        insertText2(this.model, pos, replacement);
        from = idx + replacement.length;
        count++;
      }
    }
    this.refresh();
    return count;
  }
  /** Texto plano da seleção (parágrafos separados por \n). */
  selectedText() {
    if (!this.model || !this.hasSelection()) return "";
    const { start, end } = normalizeRange(this.range());
    const parts = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const paragraph = this.model.paragraphs[pi];
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(paragraph);
      parts.push(this.plainTextSlice(paragraph, from, to));
    }
    return parts.join("\n");
  }
  plainTextSlice(paragraph, from, to) {
    let out = "";
    let acc = 0;
    for (const run of paragraph.runs) {
      const start = acc;
      const end = acc + run.text.length;
      acc = end;
      const sliceStart = Math.max(from, start);
      const sliceEnd = Math.min(to, end);
      if (sliceEnd <= sliceStart) continue;
      out += run.custom ? run.custom.fallbackText : run.text.slice(sliceStart - start, sliceEnd - start);
    }
    return out;
  }
  /** pos está dentro da seleção atual (range normalizado)? */
  posInSelection(pos) {
    if (!this.hasSelection()) return false;
    const { start, end } = normalizeRange(this.range());
    const after = pos.para > start.para || pos.para === start.para && pos.offset >= start.offset;
    const before = pos.para < end.para || pos.para === end.para && pos.offset <= end.offset;
    return after && before;
  }
  /** Extrai a seleção como parágrafos de runs (com props) — base do clipboard rico. */
  extractSelection() {
    if (!this.model || !this.hasSelection()) return null;
    const { start, end } = normalizeRange(this.range());
    const paras = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi];
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(p);
      const runs = [];
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc, re = acc + run.text.length;
        acc = re;
        const s = Math.max(from, rs), e = Math.min(to, re);
        if (e > s) runs.push({
          text: run.custom ? run.custom.fallbackText : run.text.slice(s - rs, e - rs),
          props: { ...run.props }
        });
      }
      paras.push({ runs });
    }
    const text = paras.map((pp) => pp.runs.map((r) => r.text).join("")).join("\n");
    return { text, paras };
  }
  /** Copia a seleção: texto p/ o sistema + cópia RICA interna (preserva origem). */
  async copy() {
    const t = this.selectedText();
    if (!t) return;
    this.richClip = this.extractSelection();
    try {
      await navigator.clipboard?.writeText(t);
    } catch {
    }
  }
  /** Recorta a seleção. */
  async cut() {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    await this.copy();
    this.snapshot();
    const pos = this.deleteSelection();
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Colar (Ctrl+V): respeita a formatação da ORIGEM (rico) quando o texto do
   * sistema ainda casa com a cópia interna; senão cola texto externo herdando o destino. */
  async paste() {
    if (this.locked()) return;
    try {
      const t = await navigator.clipboard?.readText();
      if (!t) return;
      if (this.richClip && this.richClip.text === t.replace(/\r\n?/g, "\n")) this.insertRich(this.richClip);
      else this.pasteText(t);
      this.onSelectionChange?.();
      this.chromeSync?.();
    } catch {
    }
  }
  /** Colar sem formatação (Ctrl+Shift+V): sempre texto plano, herdando o DESTINO. */
  async pastePlain() {
    if (this.locked()) return;
    try {
      const t = await navigator.clipboard?.readText();
      if (t) {
        this.pasteText(t);
        this.onSelectionChange?.();
        this.chromeSync?.();
      }
    } catch {
    }
  }
  /** Insere os parágrafos/runs ricos preservando os props de cada run (origem). */
  insertRich(clip) {
    if (!this.model || this.view === "read") return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    let pos = this.selection.focus;
    clip.paras.forEach((cp, i) => {
      if (i > 0) pos = splitParagraph2(this.model, pos);
      for (const run of cp.runs) if (run.text) pos = insertText2(this.model, pos, run.text, { ...run.props });
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  /** Cola texto plano (\n divide parágrafos) HERDANDO a formatação do destino (props do caret). */
  pasteText(text) {
    if (!this.model || this.view === "read" || !text) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const paras = text.replace(/\r\n?/g, "\n").split("\n");
    let pos = this.selection.focus;
    paras.forEach((part, i) => {
      if (i > 0) pos = splitParagraph2(this.model, pos);
      if (part) pos = insertText2(this.model, pos, part);
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  toggleBorder() {
    const p = this.model?.paragraphs[this.selection.focus.para]?.props;
    const has = !!(p?.boxBorder || p?.borders);
    const edge = { style: "single", sizeEighthPt: 4, spacePt: 1 };
    this.formatPara({
      boxBorder: void 0,
      borders: has ? void 0 : { top: { ...edge }, left: { ...edge }, bottom: { ...edge }, right: { ...edge } }
    });
  }
  setSpaceAfter(twips) {
    this.formatPara({ spaceAfterTwips: twips });
  }
  setSpaceBefore(twips) {
    this.formatPara({ spaceBeforeTwips: twips });
  }
  setPageSetup(opts) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    const targets = [this.model.sectPr, ...this.sectionStarts.map((ss) => ss.section.sectPr)];
    for (const s of targets) {
      if (opts.size) {
        const [w, h] = opts.size === "A4" ? [11906, 16838] : [12240, 15840];
        const landscape = s.pageWidthTwips > s.pageHeightTwips;
        s.pageWidthTwips = landscape ? h : w;
        s.pageHeightTwips = landscape ? w : h;
      }
      if (opts.orientation) {
        const [a, b] = [s.pageWidthTwips, s.pageHeightTwips];
        const isLandscape = a > b;
        if (opts.orientation === "landscape" !== isLandscape) {
          s.pageWidthTwips = b;
          s.pageHeightTwips = a;
        }
      }
      if (opts.margins) {
        const m = { normal: [1417, 1701], narrow: [720, 720], wide: [1417, 2880] }[opts.margins];
        s.marginTopTwips = s.marginBottomTwips = m[0];
        s.marginLeftTwips = s.marginRightTwips = m[1];
      }
      if (opts.customMargins) {
        s.marginTopTwips = opts.customMargins.top;
        s.marginRightTwips = opts.customMargins.right;
        s.marginBottomTwips = opts.customMargins.bottom;
        s.marginLeftTwips = opts.customMargins.left;
      }
    }
    this.refresh();
  }
  undo() {
    this.popHistory(this.undoStack, this.redoStack);
  }
  redo() {
    this.popHistory(this.redoStack, this.undoStack);
  }
  /** Insere quebra de página no caret (Ctrl+Enter). */
  insertPageBreak() {
    this.type("\f");
  }
  /** Insere um CAMPO no caret (variáveis de cabeçalho/rodapé do app de referência).
   *  O texto é o token que o paint substitui por página; ao salvar vira
   *  fldSimple e o próprio app de referência passa a atualizá-lo. */
  insertField(kind) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const display = kind === "DATE" ? (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") : kind;
    const instr = kind === "DATE" ? ' DATE \\@ "dd/MM/yyyy" ' : ` ${kind} `;
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para];
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const fieldRun = {
          text: display,
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          field: instr
        };
        if (!run) p.runs.push(fieldRun);
        else {
          const cut = offset - acc;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props }, ...run.field ? { field: run.field } : {} });
          parts.push(fieldRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props }, ...run.field ? { field: run.field } : {} });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    const np = { para, offset: offset + display.length };
    this.selection = { anchor: np, focus: np };
    this.refresh();
  }
  // ───────────────── sumário (TOC) ─────────────────
  /** Gera/atualiza o sumário a partir dos títulos, com páginas do NOSSO
   *  layout e leader pontilhado — o equivalente do F9 do app de referência. */
  updateToc() {
    if (!this.model || this.locked()) return false;
    const tocIdx = this.model.paragraphs.findIndex((p) => p.props.tocInstr);
    if (tocIdx < 0) return false;
    this.quietChange = true;
    this.snapshot();
    this.quietChange = false;
    let end = tocIdx + 1;
    while (end < this.model.paragraphs.length && (this.model.paragraphs[end].props.tocEntry || end === tocIdx + 1 && paraLength(this.model.paragraphs[end]) === 0 && !this.model.paragraphs[end].props.styleId)) end++;
    const removed = end - (tocIdx + 1);
    this.model.paragraphs.splice(tocIdx + 1, removed);
    this.shiftAnchors(tocIdx, -removed);
    const instr = this.model.paragraphs[tocIdx].props.tocInstr;
    const range = instr.match(/\\o\s+"(\d)-(\d)"/);
    const minLvl = range ? parseInt(range[1], 10) : 1;
    const maxLvl = range ? parseInt(range[2], 10) : 3;
    const s = this.sect();
    const contentW = s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
    const entries = [];
    this.model.paragraphs.forEach((p, pi) => {
      const m = p.props.styleId?.match(/^(?:Heading|Ttulo)(\d)$/);
      if (!m) return;
      const lvl = parseInt(m[1], 10);
      if (lvl < minLvl || lvl > maxLvl) return;
      const page = (this.layoutCache[pi]?.lines[0]?.page ?? 0) + 1;
      const text = paraText(p).replace(/[\f\n]/g, "").trim();
      if (!text) return;
      entries.push({
        runs: [{
          text: `${text}	${page}`,
          props: { ...DEFAULT_RUN_PROPS, link: `#para:${pi}`, color: lvl === 1 ? void 0 : "444444" }
        }],
        props: {
          tocEntry: true,
          indentLeftTwips: (lvl - 1) * 220 || void 0,
          spaceAfterTwips: 40,
          tabStops: [{ posTwips: contentW, align: "right", leader: "dot" }]
        }
      });
    });
    this.model.paragraphs.splice(tocIdx + 1, 0, ...entries);
    this.shiftAnchors(tocIdx, entries.length);
    this.refresh();
    return true;
  }
  /** Navega para um destino interno: "#para:N" ou "#bookmark". */
  navigateTo(link) {
    if (!link.startsWith("#")) return false;
    if (this.cellEdit) {
      this.exitCell();
      this.refreshSelection();
    }
    let paraIdx = -1;
    const pm = link.match(/^#para:(\d+)$/);
    if (pm) paraIdx = parseInt(pm[1], 10);
    else if (this.bookmarkParas.has(link.slice(1))) paraIdx = this.bookmarkParas.get(link.slice(1));
    else {
      const blockIdx = this.fullDoc?.bookmarks.get(link.slice(1));
      if (blockIdx !== void 0 && this.fullDoc) {
        let count = 0;
        for (let b = 0; b < blockIdx && b < this.fullDoc.blocks.length; b++) {
          if (this.fullDoc.blocks[b].type === "paragraph") count++;
        }
        paraIdx = count;
      }
    }
    const line = this.layoutCache[paraIdx]?.lines[0];
    if (!line) return false;
    const canvas = this.canvases[line.page];
    if (!canvas) return false;
    this.animateScrollTo(Math.max(0, canvas.offsetTop + line.yTwips * PX_PER_TWIP * this.zoom - 60));
    return true;
  }
  // ───────────────── comentários (anotações) ─────────────────
  getComments() {
    return this.fullDoc?.comments ?? [];
  }
  /**
   * Posição CSS-pixel (top-left + altura) da PRIMEIRA linha que carrega este
   * comentário, no espaço de scroll do editor (somando canvas.offsetTop ao
   * y da linha). Permite à camada DOM posicionar cards "inline" alinhados ao
   * trecho anotado (gap do app de referência: comentários na margem como o Google Docs).
   */
  commentAnchorPx(id) {
    if (!this.model) return null;
    const scale = PX_PER_TWIP * this.zoom;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      const para = this.model.paragraphs[pi];
      const has = para.runs.some((r) => r.props.commentIds?.includes(id));
      if (!has) continue;
      const line = this.layoutCache[pi]?.lines[0];
      if (!line) return null;
      const canvas = this.canvases[line.page];
      if (!canvas) return null;
      return {
        topPx: canvas.offsetTop + line.yTwips * scale,
        heightPx: line.heightTwips * scale,
        page: line.page
      };
    }
    if (this.eng) {
      for (const el of this.eng.lines) {
        const para = el.para;
        if (!para?.runs.some((r) => r.props.commentIds?.includes(id))) continue;
        const canvas = this.canvases[el.page];
        if (!canvas) return null;
        return { topPx: canvas.offsetTop + el.line.y * scale, heightPx: el.line.height * scale, page: el.page };
      }
      return null;
    }
    for (const tl of this.tableLayouts) {
      const hit = this.findCommentRowInTable(tl.table, id);
      if (!hit) continue;
      const canvas = this.canvases[tl.page];
      if (!canvas) return null;
      const cellTopRel = tl.rowYs[hit.row] ?? 0;
      const cellHeightTwips = (tl.rowYs[hit.row + 1] ?? tl.heightTwips) - cellTopRel;
      const cellTopAbs = tl.yTwips + cellTopRel;
      return {
        topPx: canvas.offsetTop + cellTopAbs * scale,
        heightPx: cellHeightTwips * scale,
        page: tl.page
      };
    }
    return null;
  }
  /** Acha a 1ª linha (e coluna, p/ debug) de uma tabela onde algum run carrega o commentId. */
  findCommentRowInTable(table, id) {
    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci];
        if (cell.paragraphs.some((p) => p.runs.some((r) => r.props.commentIds?.includes(id)))) {
          return { row: ri, col: ci };
        }
        for (const nt of cell.tables) {
          const nested = this.findCommentRowInTable(nt, id);
          if (nested) return { row: ri, col: ci };
        }
      }
    }
    return null;
  }
  /** Comenta a seleção atual. Retorna o id (ou null sem seleção). */
  addComment(text, author = "You") {
    if (!this.model || !this.hasSelection() || !text.trim() || this.locked()) return null;
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [],
        sections: [],
        footnotes: /* @__PURE__ */ new Map(),
        endnotes: /* @__PURE__ */ new Map(),
        comments: [],
        styles: /* @__PURE__ */ new Map(),
        bookmarks: /* @__PURE__ */ new Map()
      };
    }
    this.snapshot();
    const id = this.fullDoc.comments.reduce((m, c) => Math.max(m, c.id), -1) + 1;
    applyRunProps2(this.model, this.range(), { commentIds: [id] });
    this.fullDoc.comments.push({ id, author, text: text.trim() });
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-comments-changed"));
    return id;
  }
  removeComment(id) {
    if (!this.fullDoc || !this.model) return;
    this.snapshot();
    this.fullDoc.comments = this.fullDoc.comments.filter((c) => c.id !== id);
    for (const p of this.model.paragraphs) {
      for (const run of p.runs) {
        if (run.props.commentIds) {
          run.props.commentIds = run.props.commentIds.filter((i) => i !== id);
          if (run.props.commentIds.length === 0) delete run.props.commentIds;
        }
      }
    }
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-comments-changed"));
  }
  /** Seleciona e rola até o intervalo do comentário. */
  goToComment(id) {
    if (!this.model) return;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let acc = 0;
      for (const run of this.model.paragraphs[pi].runs) {
        if (run.props.commentIds?.includes(id)) {
          this.selection = {
            anchor: { para: pi, offset: acc },
            focus: { para: pi, offset: acc + run.text.length }
          };
          this.refreshSelection();
          this.navigateTo(`#para:${pi}`);
          return;
        }
        acc += run.text.length;
      }
    }
  }
  selectAll() {
    if (!this.model) return;
    const lastP = this.model.paragraphs.length - 1;
    this.selection = {
      anchor: { para: 0, offset: 0 },
      focus: { para: lastP, offset: paraLength(this.model.paragraphs[lastP]) }
    };
    this.refreshSelection();
  }
  // imagens
  bitmaps = /* @__PURE__ */ new WeakMap();
  bitmapFor(img) {
    const cached = this.bitmaps.get(img);
    if (cached === "loading") return null;
    if (cached) return cached;
    this.bitmaps.set(img, "loading");
    if (img.svg) {
      this.rasterizeSvg(img);
      return null;
    }
    const copy = new Uint8Array(img.data);
    void createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === "jpg" ? "jpeg" : img.ext}` })).then((bmp) => {
      this.bitmaps.set(img, bmp);
      this.imagesVersion++;
      this.paint();
    }).catch(() => this.bitmaps.set(img, void 0));
    return null;
  }
  /** Rasteriza um SVG (asvg:svgBlip) num bitmap com supersampling, para o
   *  desenho ficar nítido no zoom/DPI do editor — como o vetor do Word. */
  rasterizeSvg(img) {
    const text = new TextDecoder().decode(img.svg);
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const el = new Image();
    el.onload = () => {
      try {
        const SS = 3;
        const wPx = Math.min(4096, Math.max(1, Math.round((img.widthTwips ?? el.width) * PX_PER_TWIP * SS)));
        const hPx = Math.min(4096, Math.max(1, Math.round((img.heightTwips ?? el.height) * PX_PER_TWIP * SS)));
        const oc = document.createElement("canvas");
        oc.width = wPx;
        oc.height = hPx;
        const octx = oc.getContext("2d");
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = "high";
        octx.drawImage(el, 0, 0, wPx, hPx);
        void createImageBitmap(oc).then((bmp) => {
          this.bitmaps.set(img, bmp);
          this.imagesVersion++;
          this.paint();
        }).catch(() => this.bitmaps.set(img, void 0));
      } catch {
        this.bitmaps.set(img, void 0);
      }
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      this.bitmaps.set(img, void 0);
      URL.revokeObjectURL(url);
    };
    el.src = url;
  }
  /** Insere imagem no caret. Dimensões naturais a 96dpi, limitada à coluna. */
  async insertImage(data, ext) {
    if (!this.model || this.locked()) return;
    const copy = new Uint8Array(data);
    const bmp = await createImageBitmap(
      new Blob([copy.buffer], { type: `image/${ext === "jpg" ? "jpeg" : ext}` })
    );
    let w = bmp.width * 15;
    let h = bmp.height * 15;
    const maxW = this.contentWidthTwips();
    if (w > maxW) {
      h = h * maxW / w;
      w = maxW;
    }
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para];
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const rs = acc;
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const imageRun = {
          text: "\uFFFC",
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          image: { data: copy, ext, widthTwips: w, heightTwips: h }
        };
        if (!run) {
          p.runs.push(imageRun);
        } else {
          const cut = offset - rs;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props } });
          parts.push(imageRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props } });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    this.selection = { anchor: { para, offset: offset + 1 }, focus: { para, offset: offset + 1 } };
    this.refresh();
  }
  /** Abre o seletor de arquivo para TROCAR a imagem flutuante selecionada
   *  (ex.: o logo do rodapé), mantendo posição/tamanho. */
  promptReplaceImage() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.style.display = "none";
    inp.addEventListener("change", async () => {
      const file = inp.files?.[0];
      inp.remove();
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      await this.replaceSelectedImage(buf, ext);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  /** Substitui os bytes da imagem selecionada, mantendo âncora/posição/tamanho.
   *  Sobrescreve a mídia referenciada no pacote e remove a versão vetorial
   *  (asvg:svgBlip) do XML cru, para o Word passar a exibir a nova imagem. */
  async replaceSelectedImage(data, ext) {
    const h = this.selectedFloat();
    if (!h || h.kind !== "image") return;
    const img = h.obj;
    this.snapshot();
    const copy = new Uint8Array(data);
    const rid = /<a:blip[^>]*r:embed="([^"]+)"/.exec(img.rawDrawingXml ?? "")?.[1];
    if (rid && this.pkg) {
      const relsPath = this.hfEdit ? `word/_rels/${this.hfEdit.path.split("/").pop()}.rels` : "word/_rels/document.xml.rels";
      const mediaPath = this.resolveMediaPath(rid, relsPath);
      if (mediaPath) this.pkg.setPart(mediaPath, copy);
    }
    if (img.rawDrawingXml) {
      img.rawDrawingXml = img.rawDrawingXml.replace(
        /<a:extLst>[\s\S]*?<\/a:extLst>/g,
        (m) => m.includes("svgBlip") ? "" : m
      );
    }
    img.data = copy;
    img.ext = ext;
    img.svg = void 0;
    this.bitmaps.delete(img);
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-change"));
  }
  /** Resolve rId → caminho da parte de mídia no pacote (via a parte .rels). */
  resolveMediaPath(rid, relsPath) {
    const rels = this.pkg?.getPartText(relsPath);
    if (!rels) return null;
    const m = new RegExp(`Id="${rid}"[^>]*?Target="([^"]+)"`).exec(rels);
    if (!m) return null;
    let target = m[1];
    if (/^https?:/i.test(target)) return null;
    target = target.replace(/^\.\//, "");
    if (!target.startsWith("word/")) target = `word/${target.replace(/^\/+/, "")}`;
    return target;
  }
  saveDocx() {
    if (!this.model) throw new Error("no document");
    if (this.hfEdit) this.exitHeaderFooter();
    const pkg = this.pkg ?? DocxPackage.empty();
    const hfParts = [];
    const seenPath = /* @__PURE__ */ new Set();
    for (const section of this.fullDoc?.sections ?? []) {
      for (const [kind, refs, set, blockSet] of [
        ["header", section.headerRefs, section.headers, section.headerBlocks],
        ["footer", section.footerRefs, section.footers, section.footerBlocks]
      ]) {
        for (const ref of refs) {
          if (seenPath.has(ref.path)) continue;
          const paragraphs = set[ref.type];
          if (!paragraphs) continue;
          seenPath.add(ref.path);
          hfParts.push({
            kind,
            type: ref.type,
            rid: ref.rid,
            path: ref.path,
            paragraphs,
            dirty: this.dirtyHf.has(ref.path),
            // tabelas do cabeçalho: os blocos alinhados aos parágrafos editados
            blocks: reconcileBlocks(blockSet?.[ref.type], paragraphs, true)
          });
        }
      }
    }
    const lastSec = this.fullDoc?.sections[this.fullDoc.sections.length - 1];
    const bodyParts = lastSec ? hfParts.filter((h) => [...lastSec.headerRefs, ...lastSec.footerRefs].some((r) => r.path === h.path)) : hfParts;
    const blocks = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: "paragraph", paragraph });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= this.model.paragraphs.length) blocks.push(a.table);
    }
    const saveModel = lastSec ? { paragraphs: this.model.paragraphs, sectPr: lastSec.sectPr } : this.model;
    writeDocument(pkg, saveModel, hfParts, {
      comments: this.fullDoc?.comments?.length ? this.fullDoc.comments : void 0,
      bodySectRefs: bodyParts.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
      blocks: this.tableAnchors.length || this.fullDoc?.sources ? blocks : void 0,
      sources: this.fullDoc?.sources
    });
    return pkg.save();
  }
  /** Monta o documento de exportação a partir do estado VIVO do editor. */
  buildExportDoc(title, imageDataUris) {
    return {
      title,
      paragraphs: this.model?.paragraphs.map((paragraph) => this.withPluginFallback(paragraph)) ?? [],
      tableAnchors: this.tableAnchors,
      comments: this.fullDoc?.comments ?? [],
      footnotes: this.fullDoc?.footnotes,
      endnotes: this.fullDoc?.endnotes,
      sectPr: this.model?.sectPr,
      imageDataUris
    };
  }
  withPluginFallback(paragraph) {
    return {
      props: paragraph.props,
      runs: paragraph.runs.map((run) => run.custom ? {
        text: run.custom.fallbackText,
        props: run.props
      } : run)
    };
  }
  /**
   * Pré-comprime as imagens do documento para inclusão em HTML/Markdown:
   * decode → downsample (lado max ~1200px) → JPEG quality 0.78 → data URI.
   * Imagens muito pequenas (≤ MAX_DIMENSION CSS px) ficam só re-encodadas
   * sem resize; PNGs minúsculos (< 32KB) ficam intactos. O resultado é um
   * WeakMap consumido pelos exportadores via `resolveImageUri`.
   *
   * Sem isso, fotos do .docx (PNGs grandes) gerariam data URIs gigantescos
   * (catálogo: 72MB) que muitos viewers de Markdown não renderizam.
   */
  async compressImagesForExport() {
    const MAX_DIM = 1200;
    const QUALITY = 0.78;
    const PASSTHROUGH_KB = 32;
    const cache = /* @__PURE__ */ new WeakMap();
    const imgs = this.collectImages();
    const seen = /* @__PURE__ */ new Set();
    const tasks = imgs.map(async (img) => {
      if (seen.has(img)) return;
      seen.add(img);
      if (img.data.byteLength <= PASSTHROUGH_KB * 1024) {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
        return;
      }
      try {
        const mime = this.mimeFor(img.ext);
        const blob = new Blob([img.data.slice().buffer], { type: mime });
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close?.();
        const dataUri2 = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (!b) {
              reject(new Error("canvas.toBlob returned null"));
              return;
            }
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(b);
          }, "image/jpeg", QUALITY);
        });
        cache.set(img, dataUri2);
      } catch {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
      }
    });
    await Promise.all(tasks);
    return cache;
  }
  mimeFor(ext) {
    const e = ext.toLowerCase();
    if (e === "jpg" || e === "jpeg") return "image/jpeg";
    if (e === "png") return "image/png";
    if (e === "gif") return "image/gif";
    if (e === "bmp") return "image/bmp";
    if (e === "webp") return "image/webp";
    return `image/${e}`;
  }
  toBase64(bytes) {
    let bin = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  /** Exporta HTML semântico e fluido (web-first; reflui, não pagina). */
  async exportHtml(title, opts = {}) {
    const cache = opts.images === "omit" ? void 0 : await this.compressImagesForExport();
    return toHtml(this.buildExportDoc(title, cache), { title, images: opts.images });
  }
  /** Exporta Markdown (GitHub Flavored). */
  async exportMarkdown(title, opts = {}) {
    const cache = opts.images === "omit" ? void 0 : await this.compressImagesForExport();
    return toMarkdown(this.buildExportDoc(title, cache), { title, images: opts.images });
  }
  /**
   * Exporta ODT (OpenDocument Text) p/ LibreOffice/OpenOffice. Reconstrói um
   * FullDocument leve a partir do estado VIVO do editor (model + tableAnchors)
   * — passa pelo writeOdt do docx-core (src/odf).
   */
  exportOdt(opts = {}) {
    if (!this.model) throw new Error("document not loaded");
    const blocks = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: "paragraph", paragraph: this.withPluginFallback(paragraph) });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= this.model.paragraphs.length) blocks.push(a.table);
    }
    const fd = {
      blocks,
      sections: [{
        sectPr: this.model.sectPr,
        blockStart: 0,
        blockEnd: blocks.length,
        headers: {},
        footers: {},
        headerRefs: [],
        footerRefs: []
      }],
      footnotes: this.fullDoc?.footnotes ?? /* @__PURE__ */ new Map(),
      endnotes: this.fullDoc?.endnotes ?? /* @__PURE__ */ new Map(),
      comments: this.fullDoc?.comments ?? [],
      styles: this.fullDoc?.styles ?? /* @__PURE__ */ new Map(),
      bookmarks: this.fullDoc?.bookmarks ?? /* @__PURE__ */ new Map()
    };
    return writeOdt(fd, { images: opts.images });
  }
  focusEditor() {
    this.input.focus({ preventScroll: true });
  }
  /** True when a pointer event originated in the built-in top/bottom bars.
   *  They live inside the host shadow, so their events bubble up to the
   *  document-level pointer handlers — without this guard a click on a
   *  toolbar control would hit-test the canvas behind the (sticky) bar,
   *  collapse the selection, and steal focus (closing native dropdowns).
   *  composedPath() is required because the event target is retargeted to
   *  the host by the time it reaches these listeners. */
  eventInChrome(e) {
    const path = e.composedPath();
    return path.includes(this.topbarEl) || path.includes(this.bottombarEl);
  }
  /** Página atualmente visível (centro do viewport), 1-based. */
  currentPage() {
    const center = this.scrollTop + (this.clientHeight || 900) / 2;
    let best = 0;
    let bestDist = Infinity;
    this.canvases.forEach((c, i) => {
      const mid = c.offsetTop + c.offsetHeight / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return Math.min(best + 1, this.pageCount);
  }
  /** Estatísticas para a barra de status (como a do app de referência). */
  stats() {
    let words = 0, chars = 0;
    if (this.model) {
      for (const p of this.model.paragraphs) {
        const t = this.plainTextSlice(p, 0, paraLength(p));
        chars += t.length;
        words += (t.match(/\S+/g) ?? []).length;
      }
    }
    return {
      pages: this.pageCount,
      page: this.currentPage(),
      words,
      chars,
      paragraph: this.selection.focus.para + 1
    };
  }
  /** Imprime: abre janela com as páginas como imagens (visão de impressão). */
  async print() {
    const host = this.host;
    if (host?.print) {
      await host.print({ pages: await this.printPages(), title: this.title || "Write" });
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    const wasView = this.view;
    if (wasView !== "print") this.setView("print");
    await this.ensureImagesDecoded();
    const imgs = this.canvases.map((_, i) => `<img src="${this.pageImageForPrint(i)}" style="width:100%;page-break-after:always"/>`);
    if (wasView !== "print") this.setView(wasView);
    win.document.write(`<!doctype html><title>Write \u2014 imprimir</title><body style="margin:0">${imgs.join("")}</body>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
  }
  /** Páginas "como impressas" (dataURLs PNG), uma por folha. */
  async printPages() {
    const wasView = this.view;
    if (wasView !== "print") this.setView("print");
    await this.ensureImagesDecoded();
    const pages = this.canvases.map((_, i) => this.pageImageForPrint(i));
    if (wasView !== "print") this.setView(wasView);
    return pages;
  }
  /** PNG (dataURL) da página `i` "como impressa" (sem adornos de tela) a
   *  96 dpi × devicePixelRatio. Aloca o buffer só durante a captura. */
  pageImageForPrint(i) {
    const c = this.canvases[i];
    if (!c) return "";
    const had = this.allocatedPages.has(i);
    const bs = this.bufferScaleFor(c);
    c.width = Math.round(parseFloat(c.style.width) * bs);
    c.height = Math.round(parseFloat(c.style.height) * bs);
    this.allocatedPages.add(i);
    const prev = this.printRender;
    this.printRender = true;
    try {
      this.paint(/* @__PURE__ */ new Set([i]));
      return c.toDataURL("image/png");
    } finally {
      this.printRender = prev;
      if (had) this.paint(/* @__PURE__ */ new Set([i]));
      else {
        c.width = 1;
        c.height = 1;
        this.allocatedPages.delete(i);
      }
    }
  }
  // ───────────────────────── edição ─────────────────────────
  currentProps() {
    if (!this.model) return { ...DEFAULT_RUN_PROPS };
    return propsAt(this.model, this.selection.focus);
  }
  hasSelection() {
    return comparePos(this.selection.anchor, this.selection.focus) !== 0;
  }
  range() {
    return { start: this.selection.anchor, end: this.selection.focus };
  }
  formatRuns(patch) {
    if (!this.model || this.locked()) return;
    if (this.hasSelection()) {
      this.snapshot();
      if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
      applyRunProps2(this.model, this.range(), patch);
      this.refresh();
    } else {
      this.pendingProps = { ...this.pendingProps ?? this.currentProps(), ...patch };
      this.onSelectionChange?.();
      this.chromeSync?.();
    }
  }
  formatPara(patch) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    applyParaProps(this.model, this.range(), patch);
    this.refresh();
  }
  // imagens são imutáveis: o snapshot guarda só um índice no pool em vez
  // dos bytes (senão JSON.stringify estoura com docs de 50MB de mídia)
  imgPool = [];
  imgPoolIdx = /* @__PURE__ */ new WeakMap();
  stringifyState() {
    return JSON.stringify({
      m: this.model,
      s: this.selection,
      // sectPrs das seções (margens/orientação) — fora do model, mas undoáveis
      sect: this.sectionStarts.map((ss) => ({ ...ss.section.sectPr })),
      // âncoras de tabela/seção e indicadores (deslocados por Enter/Backspace)
      anc: this.cellEdit || this.hfEdit || this.tbEdit ? void 0 : {
        t: this.tableAnchors.map((a) => a.beforePara),
        s: this.sectionStarts.map((x) => x.startPara),
        b: [...this.bookmarkParas]
      }
    }, (key, value) => {
      if (value instanceof Uint8Array) {
        let idx = this.imgPoolIdx.get(value);
        if (idx === void 0) {
          idx = this.imgPool.length;
          this.imgPool.push(value);
          this.imgPoolIdx.set(value, idx);
        }
        return { __imgPool: idx };
      }
      return value;
    });
  }
  parseState(json) {
    return JSON.parse(
      json,
      (key, value) => value && typeof value === "object" && "__imgPool" in value ? this.imgPool[value.__imgPool] : value
    );
  }
  /** Mudanças de campo (Atualizar Campos) não contam como edição p/ autosave. */
  quietChange = false;
  /** Edições desde a carga: sem nenhuma, o PDF sai dos bytes ORIGINAIS (o
   *  .docx regravado pelo modelo de edição ainda não preserva tudo). */
  editsSinceLoad = 0;
  loadedBytes = null;
  snapshot() {
    if (!this.model) return;
    this.editsSinceLoad++;
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.undoStack.push(this.stringifyState());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    if (!this.quietChange) {
      this.dispatchEvent(new CustomEvent("uw-change"));
    }
  }
  popHistory(from, to) {
    if (!this.model || from.length === 0) return;
    this.floatSel = null;
    to.push(this.stringifyState());
    const state = this.parseState(from.pop());
    if (this.cellEdit || this.hfEdit || this.tbEdit) {
      const linked = this.model.paragraphs;
      linked.splice(0, linked.length, ...state.m.paragraphs);
      this.model = { ...state.m, paragraphs: linked };
    } else this.model = state.m;
    this.selection = state.s;
    if (state.anc && !this.cellEdit && !this.hfEdit && !this.tbEdit) {
      state.anc.t.forEach((v, i) => {
        const a = this.tableAnchors[i];
        if (a) a.beforePara = v;
      });
      state.anc.s.forEach((v, i) => {
        const s = this.sectionStarts[i];
        if (s) s.startPara = v;
      });
      this.bookmarkParas = new Map(state.anc.b);
    }
    if (state.sect) {
      state.sect.forEach((sp, i) => {
        const target = this.sectionStarts[i]?.section.sectPr;
        if (target) Object.assign(target, sp);
      });
    }
    this.refresh();
  }
  /** deleteRange com ajuste de âncoras de tabela/seção. */
  deleteSelection() {
    const { start, end } = normalizeRange(this.range());
    const delta = end.para - start.para;
    const pos = deleteRange2(this.model, this.range());
    if (delta > 0) this.shiftAnchors(start.para, -delta);
    return pos;
  }
  type(text) {
    if (!this.model || this.locked()) return;
    const before = new CustomEvent("uw-before-input", {
      cancelable: true,
      detail: { text }
    });
    if (!this.dispatchEvent(before)) return;
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const props = this.pendingProps ?? void 0;
    const pos = insertText2(this.model, this.selection.focus, text, props);
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent("uw-input", { detail: { text } }));
  }
  pressEnter() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const at = this.selection.focus.para;
    const pos = splitParagraph2(this.model, this.selection.focus);
    this.shiftAnchors(at, 1);
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  pressBackspace() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para && (this.hasSelection() || this.selection.focus.offset > 0)) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      if (offset > 0) {
        const pos = deleteRange2(this.model, {
          start: { para, offset: offset - 1 },
          end: { para, offset }
        });
        this.selection = { anchor: pos, focus: pos };
      } else if (para > 0) {
        const pos = mergeWithPrevious2(this.model, para);
        this.shiftAnchors(para - 1, -1);
        this.selection = { anchor: pos, focus: pos };
      } else {
        this.undoStack.pop();
        return;
      }
    }
    this.refresh();
    this.scrollCaretIntoView();
  }
  pressDelete() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para && (this.hasSelection() || this.selection.focus.offset < paraLength(this.model.paragraphs[this.selection.focus.para]))) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      const len = paraLength(this.model.paragraphs[para]);
      if (offset < len) {
        deleteRange2(this.model, { start: { para, offset }, end: { para, offset: offset + 1 } });
      } else if (para < this.model.paragraphs.length - 1) {
        mergeWithPrevious2(this.model, para + 1);
      } else {
        this.undoStack.pop();
        return;
      }
    }
    this.refresh();
  }
  /** Próxima fronteira de palavra a partir do caret. */
  moveWord(dir, extend) {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const text = paraText(this.model.paragraphs[para]);
    if (dir === 1) {
      if (offset >= text.length) {
        if (para < this.model.paragraphs.length - 1) {
          para++;
          offset = 0;
        }
      } else {
        while (offset < text.length && /\S/.test(text[offset])) offset++;
        while (offset < text.length && /\s/.test(text[offset])) offset++;
      }
    } else {
      if (offset === 0) {
        if (para > 0) {
          para--;
          offset = paraLength(this.model.paragraphs[para]);
        }
      } else {
        while (offset > 0 && /\s/.test(text[offset - 1])) offset--;
        while (offset > 0 && /\S/.test(text[offset - 1])) offset--;
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.refreshSelection();
    this.scrollCaretIntoView();
  }
  deleteWord(dir) {
    if (!this.model || this.locked()) return;
    if (!this.hasSelection()) {
      const before = { ...this.selection.focus };
      this.moveWord(dir, false);
      const after = { ...this.selection.focus };
      if (comparePos(before, after) === 0) return;
      this.selection = { anchor: before, focus: after };
    }
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
    const pos = deleteRange2(this.model, this.range());
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
  }
  moveCaret(dir, extend) {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const len = (i) => paraLength(this.model.paragraphs[i]);
    if (dir === "left") {
      if (offset > 0) offset--;
      else if (para > 0) {
        para--;
        offset = len(para);
      }
    } else if (dir === "right") {
      if (offset < len(para)) offset++;
      else if (para < this.model.paragraphs.length - 1) {
        para++;
        offset = 0;
      }
    } else if (dir === "home" || dir === "end") {
      const line = this.lineOf({ para, offset });
      if (line) offset = dir === "home" ? line.rich.start : this.lineEndOffset(line);
    } else {
      const line = this.lineOf({ para, offset });
      if (line) {
        const x = this.caretX({ para, offset }, line);
        const all = this.allLines();
        const idx = all.indexOf(line);
        const target = all[idx + (dir === "down" ? 1 : -1)];
        if (target) {
          const hit = this.hitLineX(target, x);
          para = target.para;
          offset = hit;
        }
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.pendingProps = null;
    this.refreshSelection();
    this.scrollCaretIntoView();
  }
  // ───────────────────────── eventos ─────────────────────────
  bindEvents() {
    this.addEventListener("wheel", (e) => {
      if (this.view === "read" && !e.ctrlKey) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < 4 || this.readWheelLock) return;
        this.readWheelLock = true;
        setTimeout(() => {
          this.readWheelLock = false;
        }, 450);
        this.nudgeRead(e.deltaY > 0 ? 1 : -1);
        return;
      }
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.round(this.zoom * factor * 100) / 100;
      this.setZoom(next, e.clientY - this.getBoundingClientRect().top);
    }, { passive: false });
    let touchY0 = 0, touchX0 = 0;
    this.addEventListener("touchstart", (e) => {
      if (this.view !== "read") return;
      touchY0 = e.touches[0].clientY;
      touchX0 = e.touches[0].clientX;
    }, { passive: true });
    this.addEventListener("touchend", (e) => {
      if (this.view !== "read") return;
      const dy = e.changedTouches[0].clientY - touchY0;
      const dx = e.changedTouches[0].clientX - touchX0;
      const horiz = Math.abs(dx) > Math.abs(dy);
      const d = horiz ? dx : dy;
      if (Math.abs(d) < 40) return;
      this.nudgeRead(d < 0 ? 1 : -1);
    }, { passive: true });
    this.addEventListener("keydown", (e) => {
      if (this.view !== "read") return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        this.nudgeRead(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        this.nudgeRead(-1);
      }
    });
    this.addEventListener("scroll", () => {
      if (this.scrollPaintQueued) return;
      this.scrollPaintQueued = true;
      requestAnimationFrame(() => {
        this.scrollPaintQueued = false;
        this.ensureVisiblePainted();
      });
    });
    this.addEventListener("mousedown", (e) => {
      if (this.eventInChrome(e)) return;
      if (e.button === 0 && !this.protectedMode) {
        const hn = this.handleAt(e);
        if (hn) {
          this.focusEditor();
          this.startFloatDrag(e, "resize", hn);
          return;
        }
        if (!(this.tbEdit && this.pointInTbRect(e))) {
          if (this.tbEdit) this.exitTextbox();
          let tbHit = this.hitTextbox(e);
          const fh0 = tbHit && this.eng ? this.hitFloat(e, "image") : null;
          if (tbHit && fh0?.kind === "image" && fh0.rect.w * fh0.rect.h < tbHit.rect.w * tbHit.rect.h) tbHit = null;
          if (tbHit) {
            this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          } else {
            const fh = fh0 ?? this.hitFloat(e);
            if (fh && fh.kind === "image") {
              if (this.floatSel !== fh.run) {
                this.floatSel = fh.run;
                this.refreshSelection();
              }
              this.focusEditor();
              this.startFloatDrag(e, "move", "");
              this.onSelectionChange?.();
              this.chromeSync?.();
              return;
            }
            if (this.floatSel) {
              this.floatSel = null;
              this.refreshSelection();
            }
          }
        }
      }
      if (e.button === 0 && this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
          const pos = this.hitTest(e);
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.focusEditor();
          e.preventDefault();
          this.refresh();
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
      }
      if (e.button === 0 && !e.shiftKey) this.routeEngineClick(e);
      const hit = this.hitTest(e);
      if (!hit) return;
      if (e.button !== 0) {
        if (!this.posInSelection(hit)) {
          this.selection = { anchor: hit, focus: hit };
          this.pendingProps = null;
          this.refreshSelection();
        }
        this.focusEditor();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (e.ctrlKey && this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset <= end && run.props.link) {
            if (/^https?:/.test(run.props.link)) {
              window.open(run.props.link, "_blank", "noopener");
              return;
            }
            if (this.navigateTo(run.props.link)) return;
          }
          acc = end;
        }
      }
      if (this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset < end && run.props.commentIds?.length) {
            this.dispatchEvent(new CustomEvent("uw-comment-click", {
              detail: { ids: run.props.commentIds }
            }));
            break;
          }
          acc = end;
        }
      }
      this.focusEditor();
      e.preventDefault();
      const extend = e.shiftKey;
      this.selection = extend ? { anchor: this.selection.anchor, focus: hit } : { anchor: hit, focus: hit };
      this.pendingProps = null;
      this.refreshSelection();
      const move = (ev) => {
        const h = this.hitTest(ev);
        if (h) {
          this.selection.focus = h;
          this.refreshSelection();
        }
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        if (this.painterProps) this.applyPainter();
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      if (e.detail === 3 && this.model) {
        const len = paraLength(this.model.paragraphs[hit.para]);
        this.selection = {
          anchor: { para: hit.para, offset: 0 },
          focus: { para: hit.para, offset: len }
        };
        this.refreshSelection();
      }
    });
    this.input.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const plain = this.plainPasteNext;
      this.plainPasteNext = false;
      if (!plain && this.richClip && this.richClip.text === text.replace(/\r\n?/g, "\n")) this.insertRich(this.richClip);
      else if (text) this.pasteText(text);
      this.onSelectionChange?.();
      this.chromeSync?.();
    });
    this.addEventListener("mousemove", (e) => {
      if (this.view !== "print" || this.hfEdit || !this.model) return;
      const zone = this.hfZoneAt(e);
      const kind = zone?.kind ?? null;
      const wantHint = kind !== null && !this.protectedMode;
      this.style.cursor = wantHint ? "pointer" : "";
      if (kind !== this.lastHoverHf) {
        this.lastHoverHf = kind;
        this.dispatchEvent(new CustomEvent("uw-hfhover", {
          detail: { kind: wantHint ? kind : null, x: e.clientX, y: e.clientY }
        }));
      }
    });
    this.addEventListener("mouseleave", () => {
      if (this.lastHoverHf !== null) {
        this.lastHoverHf = null;
        this.dispatchEvent(new CustomEvent("uw-hfhover", { detail: { kind: null } }));
      }
    });
    this.addEventListener("mousemove", (e) => {
      if (this.floatDrag || !this.model) return;
      const hn = this.handleAt(e);
      if (hn) {
        this.style.cursor = this.cursorForHandle(hn);
        return;
      }
      const fh = this.tbEdit ? null : this.hitFloat(e);
      if (fh) {
        this.style.cursor = "move";
        return;
      }
      if (this.style.cursor === "move" || this.style.cursor.endsWith("-resize")) this.style.cursor = "";
    });
    this.addEventListener("dblclick", (e) => {
      if (this.eventInChrome(e)) return;
      if (this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
        }
      }
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const fh = this.hitFloat(e);
        if (fh && fh.kind === "image") {
          this.floatSel = fh.run;
          this.refresh();
          this.promptReplaceImage();
          return;
        }
      }
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const tbHit = this.hitTextbox(e);
        if (tbHit) {
          this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          const pos = this.hitTest(e);
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.refresh();
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
      }
      if (this.tbEdit && !this.pointInTbRect(e)) {
        this.exitTextbox();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (this.view === "print" && !this.hfEdit && !this.tbEdit && this.model) {
        const zone = this.hfZoneAt(e);
        if (zone) {
          if (this.protectedMode) {
            this.dispatchEvent(new CustomEvent("uw-blocked", { detail: { reason: "protected" } }));
            return;
          }
          this.enterHeaderFooter(zone.kind, zone.page);
          const pos = this.hfEdit ? this.hitTest(e) : null;
          if (pos) {
            this.selection = { anchor: pos, focus: pos };
            this.refreshSelection();
          }
          return;
        }
      }
      if (this.hfEdit && !this.hfRegionAtClick(e)) {
        this.exitHeaderFooter();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      const hit = this.hitTest(e);
      if (!hit || !this.model) return;
      const text = this.model.paragraphs[hit.para].runs.map((r) => r.text).join("");
      let a = hit.offset, b = hit.offset;
      while (a > 0 && !/[\s]/.test(text[a - 1])) a--;
      while (b < text.length && !/[\s]/.test(text[b])) b++;
      this.selection = { anchor: { para: hit.para, offset: a }, focus: { para: hit.para, offset: b } };
      this.refreshSelection();
    });
    let composing = false;
    this.input.addEventListener("compositionstart", () => {
      composing = true;
    });
    this.input.addEventListener("compositionend", (e) => {
      composing = false;
      this.input.value = "";
      if (e.data) this.type(e.data);
    });
    this.input.addEventListener("input", () => {
      if (composing) return;
      const v = this.input.value;
      if (v) {
        this.type(v);
        this.input.value = "";
      }
    });
    this.input.addEventListener("keydown", (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (ctrl) {
        if (k === "ArrowLeft" || k === "ArrowRight") {
          e.preventDefault();
          this.moveWord(k === "ArrowRight" ? 1 : -1, e.shiftKey);
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
        if (k === "Backspace" || k === "Delete") {
          e.preventDefault();
          this.deleteWord(k === "Delete" ? 1 : -1);
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
        if (k.toLowerCase() === "c") {
          e.preventDefault();
          void this.copy();
          return;
        }
        if (k.toLowerCase() === "x") {
          e.preventDefault();
          void this.cut();
          return;
        }
        if (k.toLowerCase() === "v") {
          this.plainPasteNext = e.shiftKey;
          return;
        }
        const map = {
          b: () => this.toggleRunProp("bold"),
          i: () => this.toggleRunProp("italic"),
          u: () => this.toggleRunProp("underline"),
          z: () => this.undo(),
          y: () => this.redo(),
          a: () => this.selectAll(),
          e: () => this.setAlignment("center"),
          l: () => this.setAlignment("left"),
          r: () => this.setAlignment("right"),
          j: () => this.setAlignment("both")
        };
        const fn2 = map[k.toLowerCase()];
        if (fn2) {
          e.preventDefault();
          fn2();
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
      }
      if (k === "PageDown" || k === "PageUp") {
        e.preventDefault();
        const step = this.clientHeight * 0.9 * (k === "PageDown" ? 1 : -1);
        this.scrollTop += step;
        for (let n = 0; n < 20; n++) this.moveCaret(k === "PageDown" ? "down" : "up", e.shiftKey);
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (ctrl && (k === "Home" || k === "End")) {
        e.preventDefault();
        if (!this.model) return;
        const lastP = this.model.paragraphs.length - 1;
        const focus = k === "Home" ? { para: 0, offset: 0 } : { para: lastP, offset: paraLength(this.model.paragraphs[lastP]) };
        this.selection = e.shiftKey ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
        this.refreshSelection();
        this.scrollCaretIntoView();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (k === "Tab") {
        e.preventDefault();
        if (this.cellEdit && !ctrl) {
          this.moveCell(e.shiftKey ? -1 : 1);
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
        const para = this.model?.paragraphs[this.selection.focus.para];
        if (para?.props.numbering && this.selection.focus.offset === 0) {
          const lvl = Math.max(0, Math.min(2, para.props.numbering.ilvl + (e.shiftKey ? -1 : 1)));
          this.formatPara({
            numbering: { ...para.props.numbering, ilvl: lvl },
            indentLeftTwips: 720 * (lvl + 1)
          });
        } else if (!e.shiftKey) this.type("	");
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (this.floatSel && !this.tbEdit) {
        if (k === "Escape") {
          e.preventDefault();
          this.floatSel = null;
          this.refreshSelection();
          return;
        }
        if (k === "Delete" || k === "Backspace") {
          e.preventDefault();
          this.deleteSelectedFloat();
          return;
        }
        if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
          e.preventDefault();
          const h = this.selectedFloat();
          if (h) {
            this.snapshot();
            const step = e.shiftKey ? 15 : 90;
            const obj = h.obj;
            const ox = obj.offsetXTwips ?? 0, oy = obj.offsetYTwips ?? 0;
            if (k === "ArrowLeft") obj.offsetXTwips = ox - step;
            else if (k === "ArrowRight") obj.offsetXTwips = ox + step;
            else if (k === "ArrowUp") obj.offsetYTwips = oy - step;
            else obj.offsetYTwips = oy + step;
            if (this.eng) this.moveAnchorTo(obj, h.rect.x + (obj.offsetXTwips ?? 0) - ox, h.rect.y + (obj.offsetYTwips ?? 0) - oy);
            this.refresh();
            this.dispatchEvent(new CustomEvent("uw-change"));
          }
          return;
        }
      }
      if (k === "Escape" && this.tbEdit) {
        e.preventDefault();
        this.exitTextbox();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (k === "Escape" && this.hfEdit) {
        e.preventDefault();
        this.exitHeaderFooter();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (k === "Escape" && this.cellEdit) {
        e.preventDefault();
        this.exitCell();
        this.refreshSelection();
        return;
      }
      const nav = {
        ArrowLeft: () => this.moveCaret("left", e.shiftKey),
        ArrowRight: () => this.moveCaret("right", e.shiftKey),
        ArrowUp: () => this.moveCaret("up", e.shiftKey),
        ArrowDown: () => this.moveCaret("down", e.shiftKey),
        Home: () => this.moveCaret("home", e.shiftKey),
        End: () => this.moveCaret("end", e.shiftKey),
        // Ctrl+Enter = quebra de página (como no app de referência)
        Enter: () => ctrl ? this.type("\f") : this.pressEnter(),
        Backspace: () => this.pressBackspace(),
        Delete: () => this.pressDelete()
      };
      const fn = nav[k];
      if (fn) {
        e.preventDefault();
        fn();
        this.onSelectionChange?.();
        this.chromeSync?.();
      }
    });
  }
  startCaret() {
    window.clearInterval(this.caretTimer);
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.paint();
    }, 530);
  }
  // ───────────────────────── layout ─────────────────────────
  sect() {
    return this.model.sectPr;
  }
  contentWidthTwips() {
    const s = this.sect();
    if (this.view === "web") {
      return Math.max(2e3, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }
  /** docDefaults do DOCUMENTO (fonte/tamanho/espaçamentos de quem não tem
   *  estilo). Sem documento carregado: defaults do nosso template. */
  docDefaults() {
    return this.fullDoc?.styles.get("docDefaults") ?? { para: {}, run: {} };
  }
  /** Há styles.xml? Então os defaults do WORD valem (after=0, line=240). */
  hasDocStyles() {
    return (this.fullDoc?.styles.size ?? 0) > 0;
  }
  /** Estilos de PARÁGRAFO do documento (id + nome de exibição), para a lista
   *  de estilos da barra. Vazio se não há styles.xml (documento novo). */
  paragraphStyles() {
    const styles = this.fullDoc?.styles;
    if (!styles) return [];
    const out = [];
    styles.forEach((v, id) => {
      if (id === "docDefaults") return;
      if (v.type && v.type !== "paragraph") return;
      out.push({ id, name: v.name ?? id });
    });
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }
  styleOf(p) {
    if (!p.props.styleId) return void 0;
    const docStyle = this.fullDoc?.styles.get(p.props.styleId);
    if (docStyle) {
      return {
        sizePt: docStyle.run.szHalfPt !== void 0 ? docStyle.run.szHalfPt / 2 : 11,
        bold: docStyle.run.bold ?? false,
        color: docStyle.run.color,
        spaceBeforeTwips: docStyle.para.spaceBeforeTwips ?? 0,
        italic: docStyle.run.italic ?? false,
        alignment: docStyle.para.alignment,
        spaceAfterTwips: docStyle.para.spaceAfterTwips,
        lineTwentieths: docStyle.para.lineTwentieths,
        fontAscii: docStyle.run.fontAscii,
        underline: docStyle.run.underline,
        strike: docStyle.run.strike,
        allCaps: docStyle.run.allCaps,
        smallCaps: docStyle.run.smallCaps,
        borders: docStyle.para.borders,
        shadingHex: docStyle.para.shadingHex,
        indentLeftTwips: docStyle.para.indentLeftTwips,
        indentRightTwips: docStyle.para.indentRightTwips
      };
    }
    return STYLES[p.props.styleId];
  }
  /** Escala das minúsculas em small caps (versaletes). ~0.8 do tamanho, como o
   *  Word: a maiúscula reduzida fica um pouco menor que a maiúscula cheia. */
  static SMALL_CAPS_SCALE = 0.8;
  /** Quebra o texto de um run com small caps em spans por caixa: maiúsculas/
   *  símbolos em tamanho cheio; minúsculas → MAIÚSCULAS em ~0.8 do tamanho.
   *  Preserva o nº de caracteres (offset do caret) — se maiúscula mudar o
   *  comprimento (ex.: ß→SS), mantém o char original. */
  smallCapsSpans(text, family, variant, size, ls, runIndex) {
    const isLower = (c) => c.toLowerCase() === c && c.toUpperCase() !== c;
    const out = [];
    let i = 0;
    while (i < text.length) {
      const lower = isLower(text[i]);
      let j = i;
      while (j < text.length && isLower(text[j]) === lower) j++;
      const seg = text.slice(i, j);
      let t = seg;
      let sz = size;
      if (lower) {
        const up = seg.toUpperCase();
        t = up.length === seg.length ? up : seg;
        sz = size * _UniversalWriteElement.SMALL_CAPS_SCALE;
      }
      out.push({ text: t, family, variant, sizePt: sz, letterSpacingTwips: ls, runIndex });
      i = j;
    }
    return out.length ? out : [{ text: "", family, variant, sizePt: size, runIndex }];
  }
  buildSpans(p, opts) {
    const st = this.styleOf(p);
    const spans = p.runs.flatMap((r, ri) => {
      const dd = this.docDefaults();
      const base = r.props.szHalfPt !== void 0 ? r.props.szHalfPt / 2 : st?.sizePt ?? (dd.run.szHalfPt !== void 0 ? dd.run.szHalfPt / 2 : 11);
      const size = r.props.vertAlign ? base * 0.65 : base;
      const bold = r.props.bold || (st?.bold ?? false);
      const italic = r.props.italic || (st?.italic ?? false);
      const variant = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
      const family = r.props.fontAscii ?? st?.fontAscii ?? dd.run.fontAscii;
      if (r.textbox) {
        return { text: "", family, variant, sizePt: size, runIndex: ri };
      }
      if (r.image) {
        if (opts?.skipFloating && r.image.floating) {
          return { text: "", family, variant, sizePt: size, runIndex: ri };
        }
        return {
          text: r.text || "\uFFFC",
          family,
          variant,
          sizePt: size,
          imageWidthTwips: r.image.widthTwips,
          imageHeightTwips: r.image.heightTwips,
          runIndex: ri
        };
      }
      if (r.custom) {
        const font = this.fonts.resolve(family, variant);
        const measureText = (text2) => {
          const chars = Array.from(text2);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i].codePointAt(0);
            width += font.advanceTwips(cp, size);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== void 0) width += font.kernTwips(cp, next, size);
          }
          return width;
        };
        const renderer = this.inlineRenderers.get(r.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(r.custom.data) ?? r.custom.fallbackText;
        const measured = renderer?.measure?.({
          data: r.custom.data,
          fallbackText,
          props: r.props,
          sizePt: size,
          measureText
        });
        return {
          text: "\uFFFC",
          family,
          variant,
          sizePt: size,
          imageWidthTwips: Math.max(1, measured?.widthTwips ?? measureText(fallbackText)),
          imageHeightTwips: measured?.heightTwips ?? size * TWIPS_PER_PT,
          runIndex: ri
        };
      }
      const ls = r.props.charSpacingTwips;
      const allCaps = r.props.allCaps || st?.allCaps;
      const smallCaps = r.props.smallCaps || st?.smallCaps;
      if (smallCaps && !allCaps) {
        return this.smallCapsSpans(r.text, family, variant, size, ls, ri);
      }
      const text = allCaps || smallCaps ? r.text.toUpperCase() : r.text;
      return { text, family, variant, sizePt: size, letterSpacingTwips: ls, runIndex: ri };
    });
    if (spans.length === 0) spans.push({ text: "", variant: "regular", sizePt: st?.sizePt ?? 11 });
    return spans;
  }
  /** Seção vigente para o parágrafo pi. */
  sectionIndexForPara(pi) {
    let idx = 0;
    for (let i = 0; i < this.sectionStarts.length; i++) {
      if (pi >= this.sectionStarts[i].startPara) idx = i;
    }
    return idx;
  }
  sectPrAt(sectionIdx) {
    const s = this.sectionStarts[sectionIdx]?.section.sectPr;
    return s ?? this.model.sectPr;
  }
  /** Layout do modo de edição de HF: PRESERVA a paginação do corpo (mesmo
   *  nº de páginas/panes) e posiciona o HF apenas na banda da página ativa. */
  layoutHfEdit() {
    const sb = this.savedBody;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const marginL = sp.marginLeftTwips;
    const contentW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
    const topY = this.hfEdit.kind === "header" ? sp.headerDistanceTwips ?? 720 : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(this.model.paragraphs, contentW);
    this.hfRegionTopTwips = topY;
    const font = this.fonts.resolve(void 0, "regular");
    let y = topY;
    this.model.paragraphs.forEach((p, pi) => {
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts, {
        availableTwips: contentW,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: contentW / 2, align: "center" },
          { posTwips: contentW, align: "right" }
        ]
      });
      const spanCharStart = [];
      let acc = 0;
      for (const span of spans) {
        spanCharStart.push(acc);
        acc += span.text.length;
      }
      const laid = [];
      lines.forEach((rich) => {
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
        let x = marginL;
        let justifyExtra = 0;
        const align = p.props.alignment;
        if (align === "center") x += (contentW - rich.widthTwips) / 2;
        else if (align === "right") x += contentW - rich.widthTwips;
        laid.push({
          para: pi,
          rich,
          page: this.hfActivePage,
          xTwips: x,
          yTwips: y,
          heightTwips: lh,
          baselineTwips: y + lh * 0.8,
          justifyExtraPerSpace: justifyExtra
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
    this.hfRegionHeightTwips = Math.max(y - topY, 240);
  }
  /** Layout do conteúdo INTERNO de uma caixa de texto em edição: posiciona os
   *  parágrafos no retângulo ancorado da caixa, preservando a paginação salva.
   *  Espelha a matemática de linha do paintHf p/ o conteúdo não "pular". */
  layoutTextboxEdit() {
    const tb = this.tbEdit;
    const sb = this.savedForTb;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    const box = tb.hostRun.textbox;
    const ins = box ? this.tbInsets(box) : { l: 0, t: 0, r: 0, b: 0 };
    const originX = tb.rectTwips.x + ins.l;
    const width = Math.max(tb.rectTwips.w - ins.l - ins.r, 240);
    const font = this.fonts.resolve(void 0, "regular");
    let y = tb.rectTwips.y + ins.t;
    this.model.paragraphs.forEach((p, pi) => {
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts, {
        availableTwips: width,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: width / 2, align: "center" },
          { posTwips: width, align: "right" }
        ]
      });
      const spanCharStart = [];
      let acc = 0;
      for (const span of spans) {
        spanCharStart.push(acc);
        acc += span.text.length;
      }
      const laid = [];
      lines.forEach((rich) => {
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
        let x = originX;
        const align = p.props.alignment;
        if (align === "center") x += (width - rich.widthTwips) / 2;
        else if (align === "right") x += width - rich.widthTwips;
        laid.push({
          para: pi,
          rich,
          page: tb.pageIdx,
          xTwips: x,
          yTwips: y,
          heightTwips: lh,
          baselineTwips: y + lh * 0.8,
          justifyExtraPerSpace: 0
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
  }
  /** start da numeração do documento (1ª seção). Padrão 1 (Word). */
  docPgNumStart() {
    return this.fullDoc?.sections[0]?.sectPr.pgNumStart ?? this.sectionStarts[0]?.section.sectPr.pgNumStart ?? this.savedBody?.sectionStarts[0]?.section.sectPr.pgNumStart ?? 1;
  }
  /** Valor do campo NUMPAGES respeitando o start: total = número da ÚLTIMA
   *  página = start + (páginas − 1). Para docs normais (start=1) = pageCount;
   *  com capa start=0, a capa não conta (ex.: 2 folhas → "1"). */
  numPagesFor() {
    return Math.max(1, this.pageCount + this.docPgNumStart() - 1);
  }
  /** Número de página do campo PAGE em Word: pgNumType/@start (padrão 1) +
   *  deslocamento da página DENTRO da sua seção. Respeita start=0 (capa = 0). */
  pageNumberFor(pageIdx) {
    const ps = this.pageSections;
    const sIdx = ps[pageIdx] ?? 0;
    let firstPage = pageIdx;
    for (let i = 0; i <= pageIdx; i++) {
      if ((ps[i] ?? 0) === sIdx) {
        firstPage = i;
        break;
      }
    }
    const sp = this.savedBody ? this.savedBody.sectionStarts[sIdx]?.section.sectPr ?? this.sect() : this.sectionStarts.length ? this.sectPrAt(sIdx) : this.sect();
    const start = sp.pgNumStart ?? 1;
    return start + (pageIdx - firstPage);
  }
  /** Parágrafos do header/footer que valem na página pg (first se capa+titlePg,
   *  senão default). Vindos do fullDoc — a parte FOCADA é o mesmo array de
   *  this.model, então reflete edições ao vivo. */
  hfPartParas(kind, pg) {
    const fd = this.fullDoc;
    if (!fd) return void 0;
    const ps = this.savedBody?.pageSections ?? this.pageSections;
    const sIdx = ps[pg] ?? 0;
    const section = this.savedBody?.sectionStarts[sIdx]?.section ?? fd.sections[sIdx] ?? fd.sections[0];
    if (!section) return void 0;
    const sp = this.sectPrForSavedPage(pg);
    const set = kind === "header" ? section.headers : section.footers;
    const part = pg === 0 && sp.titlePg ? set.first : set.default;
    return part?.length ? part : void 0;
  }
  /** topo (twips) da região do HF: header a headerDistance; footer ancorado pela
   *  base (footerDistance + altura do conteúdo). */
  hfTopY(kind, paras, sp, colW) {
    return kind === "header" ? sp.headerDistanceTwips ?? 720 : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(paras, colW);
  }
  /** Composição da edição de HF: imagem behindDoc ATRÁS, corpo esmaecido, header
   *  E footer em foco (o ativo destacado), como o modo "Header & Footer" do Word.
   *  Corrige (a) conteúdo sumindo sob a capa e (b) header/footer ativos juntos. */
  paintHfEditCompose(ctxs, scales, dpr) {
    if (!this.hfEdit || this.tbEdit) return;
    const inkBright = this.pageDark ? "#1f1f1f" : "#1f1f1f";
    const inkDim = this.pageDark ? "#9aa0a6" : "#666";
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg];
      const sp = this.sectPrForSavedPage(pg);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      const isActivePage = pg === this.hfActivePage;
      const headerParas = this.hfPartParas("header", pg);
      const footerParas = this.hfPartParas("footer", pg);
      const kinds = ["header", "footer"];
      for (const kind of kinds) {
        const paras = kind === "header" ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, inkBright, sp, "behind");
      }
      const snap = this.hfBodySnapshots[pg];
      if ((snap?.width ?? 0) > 1) {
        ctx.save();
        ctx.globalAlpha = HF_DIM_ALPHA;
        ctx.drawImage(snap, 0, 0);
        ctx.restore();
      }
      for (const kind of kinds) {
        const paras = kind === "header" ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        const isFocused = isActivePage && kind === this.hfEdit.kind;
        if (isFocused) {
          this.model.paragraphs.forEach((p, pi) => {
            const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? topY;
            this.drawHfFloats(ctx, scale, p.runs, sp.marginLeftTwips, paraTop, colW, pg, inkBright, sp, "front");
          });
        } else {
          ctx.save();
          if (!isActivePage) ctx.globalAlpha = HF_DIM_ALPHA;
          this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, isActivePage ? inkBright : inkDim, sp, "front");
          ctx.restore();
        }
      }
      if (isActivePage) this.paintHfBands(ctx, scale, sp, dpr);
    }
  }
  /** Bandas realçadas de header e footer na página ativa + linhas separadoras no
   *  limite com o corpo (base da margem sup. / topo da margem inf.), como o Word. */
  paintHfBands(ctx, scale, sp, dpr, pg) {
    const activeKind = this.hfEdit.kind;
    const drawBand = (kind) => {
      const band = this.eng && pg !== void 0 ? this.hfBand(pg, kind) : null;
      const lineY = band ? kind === "header" ? band.bottom : band.top : kind === "header" ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
      const bandTop = kind === "header" ? 0 : lineY;
      const bandBot = kind === "header" ? lineY : sp.pageHeightTwips;
      const active = kind === activeKind;
      ctx.save();
      ctx.fillStyle = active ? this.pageDark ? "rgba(80,130,200,0.16)" : "rgba(43,87,154,0.09)" : this.pageDark ? "rgba(120,120,120,0.10)" : "rgba(120,120,120,0.06)";
      ctx.fillRect(0, bandTop * scale, sp.pageWidthTwips * scale, (bandBot - bandTop) * scale);
      ctx.strokeStyle = active ? this.pageDark ? "#5b8def" : "#2b579a" : this.pageDark ? "#777" : "#9aa0a6";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(sp.marginLeftTwips * scale, lineY * scale);
      ctx.lineTo((sp.pageWidthTwips - sp.marginRightTwips) * scale, lineY * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `600 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = active ? this.pageDark ? "#9bc0ff" : "#2b579a" : this.pageDark ? "#9aa0a6" : "#9aa0a6";
      const label = kind === "header" ? "Header" : "Footer";
      const ly = (kind === "header" ? lineY - 60 : lineY + 190) * scale;
      ctx.fillText(label, sp.marginLeftTwips * scale, ly);
      ctx.restore();
    };
    drawBand("header");
    drawBand("footer");
  }
  /** sectPr da página i segundo a estrutura SALVA do corpo (modo HF edit). */
  sectPrForSavedPage(pageIdx) {
    const sb = this.savedBody;
    const sIdx = sb?.pageSections[pageIdx] ?? 0;
    return sb?.sectionStarts[sIdx]?.section.sectPr ?? this.sect();
  }
  layout() {
    if (!this.model || !this.fonts) return;
    if (this.engineActive()) {
      if (this.fastHint && this.tryFastLayout()) return;
      if (this.fastTable && this.tryFastTable()) return;
      this.fastHint = null;
      this.fastTable = null;
      window.clearTimeout(this.idleRelayout);
      this.idleRelayout = 0;
      if (this.layoutEngine()) return;
    }
    this.fastHint = null;
    this.eng = null;
    this.engPageCache.clear();
    this.syncRunRPr(this.model.paragraphs);
    if (this.tbEdit && this.view === "print" && this.savedForTb) {
      this.layoutTextboxEdit();
      return;
    }
    if (this.hfEdit && this.view === "print" && this.savedBody) {
      this.layoutHfEdit();
      return;
    }
    const isPaged = this.view === "print" || this.view === "read";
    let sectIdx = 0;
    let s = isPaged && this.sectionStarts.length ? this.sectPrAt(0) : this.sect();
    let contentW = this.contentWidthForSect(s);
    let marginL = isPaged ? s.marginLeftTwips : 600;
    let marginT = isPaged ? s.marginTopTwips : 600;
    let contentBottom = s.pageHeightTwips - s.marginBottomTwips;
    let nCols = 1, colSpace = 0, colW = contentW;
    let col = 0;
    const applyColGeom = () => {
      nCols = isPaged && s.cols ? Math.max(1, s.cols.count) : 1;
      colSpace = s.cols?.spaceTwips ?? 0;
      colW = nCols > 1 ? (contentW - colSpace * (nCols - 1)) / nCols : contentW;
    };
    applyColGeom();
    const colX = () => marginL + col * (colW + colSpace);
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.pageSections = [0];
    let pendingDropCap = null;
    let page = 0;
    let y = marginT;
    const CONT_TILE_PX = 4e3;
    const tileTwips = isPaged ? Infinity : CONT_TILE_PX / (PX_PER_TWIP * this.zoom);
    const tileBottoms = [];
    const contTileBreak = (need) => {
      if (!isPaged && y > (page === 0 ? marginT : 0) && y + need > tileTwips) {
        page++;
        y = 0;
      }
    };
    const listCounters = [0, 0, 0];
    let prevWasList = false;
    const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    const ALPHA = "abcdefghijklmnopqrstuvwxyz";
    const FN_LINE = 260, FN_SEP = 120;
    let fnReserved = 0;
    let pageHadNotes = false;
    const newPage = () => {
      page++;
      y = marginT;
      col = 0;
      this.pageSections[page] = sectIdx;
      fnReserved = 0;
      pageHadNotes = false;
    };
    const breakColumn = () => {
      if (col < nCols - 1) {
        col++;
        y = marginT;
      } else newPage();
    };
    this.model.paragraphs.forEach((p, pi) => {
      if (isPaged && this.sectionStarts.length > 0) {
        const si = this.sectionIndexForPara(pi);
        if (si !== sectIdx) {
          sectIdx = si;
          s = this.sectPrAt(si);
          contentW = this.contentWidthForSect(s);
          marginL = s.marginLeftTwips;
          marginT = s.marginTopTwips;
          contentBottom = s.pageHeightTwips - s.marginBottomTwips;
          applyColGeom();
          newPage();
        }
      }
      for (const anchor of this.tableAnchors) {
        if (anchor.beforePara !== pi) continue;
        const tl = this.layoutTable(anchor.table, marginL, contentW);
        if (isPaged && y + tl.heightTwips > contentBottom && tl.heightTwips < contentBottom - marginT) {
          newPage();
        }
        contTileBreak(tl.heightTwips);
        tl.page = page;
        tl.yTwips = y;
        this.tableLayouts.push(tl);
        y += tl.heightTwips + 160;
        tileBottoms[page] = y;
      }
      const st = this.styleOf(p);
      const outlineIndent = this.view === "outline" ? st ? 0 : 720 : 0;
      const indent = (p.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0) + outlineIndent;
      const indentRight = p.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
      const firstDelta = p.props.indentFirstLineTwips ?? 0;
      const avail = Math.max(500, colW - indent - indentRight);
      const availFirst = Math.max(500, avail - firstDelta);
      if (p.props.tocInstr && p.runs.every((r) => r.text.trim() === "")) {
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      if (p.props.dropCap && p.runs.length > 0) {
        const run = p.runs[0];
        const sizePt = (run.props.szHalfPt ?? 22) / 2;
        const letterFont = this.fonts.resolve(run.props.fontAscii, run.props.bold ? "bold" : "regular");
        pendingDropCap = {
          text: run.text,
          sizePt,
          bold: run.props.bold,
          italic: run.props.italic,
          color: run.props.color,
          widthTwips: [...run.text].reduce((w, ch) => w + letterFont.advanceTwips(ch.codePointAt(0), sizePt), 0)
        };
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      const dropCap = pendingDropCap;
      pendingDropCap = null;
      const dropIndent = dropCap ? dropCap.widthTwips + 120 : 0;
      const spans = this.buildSpans(p, { skipFloating: true });
      const lineRulePre = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? 259,
        lineRule: "auto"
      };
      const pitchPre = Math.round(
        lineHeightPt(this.fonts.resolve(void 0, "regular"), spans[0]?.sizePt ?? 11, lineRulePre) * TWIPS_PER_PT / 2.4
      ) * 2.4;
      const dropK = dropCap ? Math.max(2, Math.round(deviceEmPt(dropCap.sizePt) * TWIPS_PER_PT / pitchPre)) : 0;
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts, {
        availableTwips: avail,
        firstLineAvailableTwips: availFirst,
        tabOriginOffsetTwips: indent,
        firstLineTabOriginOffsetTwips: indent + firstDelta,
        tabStops: p.props.tabStops,
        indentFirstKLines: dropCap ? { k: dropK, indentTwips: dropIndent } : void 0
      });
      const spanCharStart = [];
      let acc = 0;
      for (const sp of spans) {
        spanCharStart.push(acc);
        acc += sp.text.length;
      }
      let marker;
      if (p.props.numbering) {
        const lvl = Math.min(p.props.numbering.ilvl, 2);
        if (!prevWasList) listCounters.fill(0);
        if (p.props.numbering.kind === "decimal") {
          listCounters[lvl] = (listCounters[lvl] ?? 0) + 1;
          for (let d = lvl + 1; d < 3; d++) listCounters[d] = 0;
          const n = listCounters[lvl];
          marker = lvl === 0 ? `${n}.` : lvl === 1 ? `${ALPHA[(n - 1) % 26]}.` : `${ROMANS[(n - 1) % 10]}.`;
        } else {
          marker = ["\u2022", "o", "\u25AA"][lvl];
        }
        prevWasList = true;
      } else {
        prevWasList = false;
        listCounters.fill(0);
      }
      const dd = this.docDefaults();
      const hasStyles = this.hasDocStyles();
      const lineRule = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? dd.para.lineTwentieths ?? (hasStyles ? 240 : 259),
        lineRule: "auto"
      };
      const qDev = (tw) => Math.round(tw / 2.4) * 2.4;
      const spaceBefore = qDev(p.props.spaceBeforeTwips ?? st?.spaceBeforeTwips ?? dd.para.spaceBeforeTwips ?? 0);
      const spaceAfter = qDev(p.props.spaceAfterTwips ?? st?.spaceAfterTwips ?? dd.para.spaceAfterTwips ?? (hasStyles ? 0 : 160));
      if (isPaged && p.props.pageBreakBefore && y > marginT) newPage();
      y += spaceBefore;
      let noteCount = 0;
      if (this.fullDoc) {
        for (const r of p.runs) if (r.noteRef?.kind === "footnote") noteCount++;
      }
      const laid = [];
      lines.forEach((rich, li) => {
        const font = this.fonts.resolve(void 0, "regular");
        const sizeForHeight = Math.max(rich.maxSizePt, 1);
        const descTwips = Math.abs(font.metrics.descender) / font.metrics.unitsPerEm * deviceEmPt(sizeForHeight) * TWIPS_PER_PT;
        const lh = qDev(Math.max(
          lineHeightPt(font, sizeForHeight, lineRule) * TWIPS_PER_PT,
          rich.maxAscTwips + descTwips
        ));
        const asc = qDev(Math.max(
          font.metrics.ascender / font.metrics.unitsPerEm * deviceEmPt(sizeForHeight) * TWIPS_PER_PT,
          rich.maxAscTwips
        ));
        if (li === 0 && noteCount > 0) {
          fnReserved += noteCount * FN_LINE + (pageHadNotes ? 0 : FN_SEP);
          pageHadNotes = true;
        }
        contTileBreak(lh);
        if (isPaged && y + lh > contentBottom - fnReserved) {
          breakColumn();
          const onNewPage = col === 0;
          if (onNewPage && li === 0 && noteCount > 0) {
            fnReserved = noteCount * FN_LINE + FN_SEP;
            pageHadNotes = true;
          }
          if (nCols === 1) {
            if (li === 1 && laid.length === 1) {
              const first = laid[0];
              const delta = y - first.yTwips;
              first.page = page;
              first.yTwips += delta;
              first.baselineTwips += delta;
              y += first.heightTwips;
            } else if (li === lines.length - 1 && laid.length >= 2) {
              const prev = laid[laid.length - 1];
              if (prev.page !== page) {
                const delta = y - prev.yTwips;
                prev.page = page;
                prev.yTwips += delta;
                prev.baselineTwips += delta;
                y += prev.heightTwips;
              }
            }
          }
        }
        const inDropZone = dropCap !== null && li < dropK;
        const lineIndentX = indent + (li === 0 ? firstDelta : 0) + (inDropZone ? dropIndent : 0);
        const lineAvail = (li === 0 ? availFirst : avail) - (inDropZone ? dropIndent : 0);
        let x = colX() + lineIndentX;
        if (dropCap && li === 0) {
          this.dropCapFloats.push({
            ...dropCap,
            page,
            xTwips: colX() + indent,
            yTopTwips: y,
            kPitch: pitchPre * dropK
          });
        }
        let justifyExtra = 0;
        const align = p.props.alignment ?? st?.alignment;
        if (align === "center") x += (lineAvail - rich.widthTwips) / 2;
        else if (align === "right") x += lineAvail - rich.widthTwips;
        else if (align === "both" && li < lines.length - 1) {
          const text = spans.map((sp) => sp.text).join("").slice(rich.start, rich.end).trimEnd();
          const spaces = (text.match(/ /g) ?? []).length;
          if (spaces > 0) justifyExtra = (lineAvail - rich.widthTwips) / spaces;
        }
        laid.push({
          para: pi,
          rich,
          page,
          xTwips: x,
          yTwips: y,
          heightTwips: lh,
          baselineTwips: y + asc,
          marker: li === 0 && marker !== void 0 ? { text: marker, xTwips: colX() + indent - 360, sizePt: 11 } : void 0,
          justifyExtraPerSpace: justifyExtra
        });
        y += lh;
        if (!isPaged) tileBottoms[page] = y;
        const fullText = spans.map((sp) => sp.text).join("");
        if (isPaged && rich.end > 0 && fullText[rich.end - 1] === "\f") {
          newPage();
        }
      });
      y += spaceAfter;
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
    for (const anchor of this.tableAnchors) {
      if (anchor.beforePara < this.model.paragraphs.length) continue;
      const tl = this.layoutTable(anchor.table, marginL, contentW);
      if (isPaged && y + tl.heightTwips > contentBottom) newPage();
      tl.page = page;
      tl.yTwips = y;
      this.tableLayouts.push(tl);
      y += tl.heightTwips + 160;
    }
    this.footnoteHits = [];
    if (this.fullDoc) {
      this.layoutCache.forEach((pl, pi) => {
        const para = this.model.paragraphs[pi];
        for (const run of para.runs) {
          if (run.noteRef?.kind === "footnote") {
            const pg = pl.lines[0]?.page ?? 0;
            this.footnoteHits.push({ page: pg, id: run.noteRef.id });
          }
        }
      });
    }
    this.pageCount = isPaged ? page + 1 : 1;
    if (!isPaged) {
      this.continuousHeight = y + 600;
      tileBottoms[page] = y;
      this.tileHeights = tileBottoms.map((b, i) => (b ?? 0) + (i === page ? 600 : 0));
    } else {
      this.tileHeights = [];
    }
  }
  /** Substitui PAGE/NUMPAGES no texto de header/footer. */
  substField(text, pageIdx) {
    return text.replace(/\bNUMPAGES\b/g, String(this.numPagesFor())).replace(/\bPAGE\b/g, String(this.pageNumberFor(pageIdx)));
  }
  /** Renderiza cabeçalho/rodapé com layout real: runs formatados, alinhamento
   *  do parágrafo, tabs centro/direita (default do app de referência) e campos por página. */
  /** Altura total (twips) do conteúdo fluído de um cabeçalho/rodapé — usada
   *  para ancorar o rodapé pela BASE (o Word coloca o rodapé com a base a
   *  footerDistance da borda inferior, não o topo). */
  /** margens internas (twips) da caixa; padrão do Word se ausentes. */
  tbInsets(tb) {
    return tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  }
  /** Origem/largura do TEXTO dentro da caixa: recuado pelas margens internas
   *  (lIns/tIns/rIns) como o Word — o texto começa em (x+lIns, y+tIns) e quebra
   *  em (w−lIns−rIns). Usado em todo lugar que pinta os parágrafos da caixa. */
  tbInner(tb, x, y, w) {
    const ins = this.tbInsets(tb);
    return { x: x + ins.l, y: y + ins.t, w: Math.max(w - ins.l - ins.r, 120) };
  }
  /** Altura EFETIVA da caixa de texto: se spAutoFit, ajusta ao conteúdo (o cy
   *  declarado é ignorado pelo Word); senão usa a altura declarada. Assim o alvo
   *  de seleção/edição respeita o tamanho real da caixa. */
  effectiveTbHeight(tb) {
    if (!tb.autoFit) return tb.heightTwips || 240;
    const ins = this.tbInsets(tb);
    const cw = Math.max(tb.widthTwips || 240, 240);
    return Math.max(this.measureHfHeight(tb.paras, cw) + ins.t + ins.b, 240);
  }
  measureHfHeight(paras, widthTwips) {
    if (!this.fonts) return 0;
    const font = this.fonts.resolve(void 0, "regular");
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    let h = 0;
    for (const p of paras) {
      const spans = this.buildSpans({ runs: p.runs, props: p.props }, { skipFloating: true });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs
      });
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        h += lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
      }
    }
    return h;
  }
  /** Posição page-absolute (twips) de um objeto flutuante âncorado, respeitando
   *  wp:positionH/V relativeFrom. originX = margem esquerda; paraTop = topo do
   *  parágrafo âncora (banda do HF); sp = geometria da seção. */
  anchoredPos(a, originXTwips, paraTopTwips, sp) {
    const ox = a.offsetXTwips ?? 0;
    const oy = a.offsetYTwips ?? 0;
    const x = a.relH === "page" ? ox : originXTwips + ox;
    let y;
    if (a.relV === "page") y = oy;
    else if (a.relV === "margin" || a.relV === "topMargin") y = sp.marginTopTwips + oy;
    else if (a.relV === "bottomMargin") y = sp.pageHeightTwips - sp.marginBottomTwips + oy;
    else y = paraTopTwips + oy;
    return { x, y };
  }
  /** Desenha os objetos FLUTUANTES (caixas de texto / imagens ancoradas) dos
   *  runs de um parágrafo de HF, na posição ancorada. Usado tanto no render
   *  normal (paintHf) quanto na EDIÇÃO de HF (senão os flutuantes somem). */
  drawHfFloats(ctx, scale, runs, originXTwips, paraTopTwips, widthTwips, pageIdx, color, sp, floatMode = "all") {
    const pageArea = sp.pageWidthTwips * sp.pageHeightTwips;
    const isBg = (o) => !!o.behindDoc || pageArea > 0 && o.widthTwips * o.heightTwips >= 0.4 * pageArea;
    for (const r of runs) {
      const obj = r.textbox ?? r.image;
      if (!obj) continue;
      if (r === this.tbSnapshotSuppress) continue;
      if (floatMode === "behind" && !isBg(obj)) continue;
      if (floatMode === "front" && isBg(obj)) continue;
      if (r.textbox) {
        const tb = r.textbox;
        const { x: tx, y: ty } = tb.floating ? this.anchoredPos(tb, originXTwips, paraTopTwips, sp) : { x: originXTwips, y: paraTopTwips };
        {
          const iw = this.tbInner(tb, tx, ty, tb.widthTwips || widthTwips);
          this.paintHf(ctx, scale, tb.paras, iw.x, iw.y, iw.w, pageIdx, color, sp);
        }
        continue;
      }
      const bmp = this.bitmapFor(r.image);
      if (!bmp) continue;
      const img = r.image;
      const { x: ix, y: iy } = img.floating ? this.anchoredPos(img, originXTwips, paraTopTwips, sp) : { x: originXTwips, y: paraTopTwips };
      ctx.drawImage(bmp, ix * scale, iy * scale, img.widthTwips * scale, img.heightTwips * scale);
    }
  }
  /** Família CSS a usar no canvas: a fonte EMBEDADA real (ex.: "Lato", "Lato
   *  Black"); senão a que o resolvedor de fontes escolheu (do SO, instalada,
   *  substituta); senão a base embutida; senão o padrão (Liberation Sans). */
  familyFor(family) {
    if (family) {
      if (this.loadedFamilyNames.has(family)) return family;
      this.applyResolvedFont(family);
      const r = this.appliedFonts.has(family) ? this.fontResolver.getWithFile(family) : void 0;
      if (r && r.source !== "default") return r.cssFamily;
      const base = family.split(" ")[0];
      if (this.loadedFamilyNames.has(base)) return base;
    }
    return DEFAULT_FONT;
  }
  paintHf(ctx, scale, paras, originXTwips, topYTwips, widthTwips, pageIdx, color, sp, floatMode = "all") {
    if (!this.fonts) return;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    const stroke = (e, ax, ay, bx, by) => {
      if (!e) return;
      ctx.strokeStyle = this.inkColor(e.color);
      ctx.lineWidth = Math.max(1, e.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
      if (e.style === "dashed") ctx.setLineDash([8, 5]);
      else if (e.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    let y = topYTwips;
    for (const p of paras) {
      const runs = p.runs.map(
        (r) => r.field ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor()) : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text } : r
      );
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      const stColor = this.styleOf(p)?.color;
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs
      });
      this.drawHfFloats(ctx, scale, runs, originXTwips, y, widthTwips, pageIdx, color, sp, floatMode);
      const font = this.fonts.resolve(void 0, "regular");
      const fallback = p.props.boxBorder && !p.props.borders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
      const bd = p.props.borders ?? (fallback ? { top: fallback, bottom: fallback, left: fallback, right: fallback } : void 0);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
        if (p.props.shadingHex) {
          ctx.fillStyle = this.inkColor(p.props.shadingHex);
          ctx.fillRect(originXTwips * scale, y * scale, widthTwips * scale, lh * scale);
        }
        let x = originXTwips;
        const align = p.props.alignment;
        if (align === "center") x += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") x += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
          const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          const fam = this.familyFor(span.family);
          const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
          const v = span.variant;
          ctx.font = `${v === "italic" || v === "boldItalic" ? "italic " : ""}${v === "bold" || v === "boldItalic" ? "700" : "400"} ${fontPx}px ${fam}`;
          const runColor = run?.props.color ?? stColor;
          ctx.fillStyle = runColor ? this.inkColor(runColor) : color;
          ctx.fillText(txt, (x + seg.xTwips) * scale, baseline * scale);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * TWIPS_PER_PT;
          const spR = (bd.right?.spacePt ?? 0) * TWIPS_PER_PT;
          const spT = (bd.top?.spacePt ?? 0) * TWIPS_PER_PT;
          const spB = (bd.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
          const x0 = (originXTwips - spL) * scale;
          const x1 = (originXTwips + widthTwips + spR) * scale;
          const y0 = (y - (isFirst ? spT : 0)) * scale;
          const y1 = (y + lh + (isLast ? spB : 0)) * scale;
          stroke(bd.left, x0, y0, x0, y1);
          stroke(bd.right, x1, y0, x1, y1);
          if (isFirst) stroke(bd.top, x0, y0, x1, y0);
          if (isLast) stroke(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }
  contentWidthForSect(s) {
    if (this.view === "web") {
      return Math.max(2e3, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }
  /** Layout de tabela: colunas do tblGrid, linhas com altura do conteúdo. */
  layoutTable(table, xTwips, availW) {
    const PAD = 108;
    const font = this.fonts.resolve(void 0, "regular");
    let cols = table.gridColsTwips.length ? [...table.gridColsTwips] : [availW];
    const total = cols.reduce((a, b) => a + b, 0);
    if (total > availW) cols = cols.map((c) => c * availW / total);
    const colXs = [0];
    for (const c of cols) colXs.push(colXs[colXs.length - 1] + c);
    const tl = {
      table,
      page: 0,
      xTwips,
      yTwips: 0,
      heightTwips: 0,
      colXs,
      rowYs: [0],
      cellLines: [],
      cellShades: [],
      cellRects: []
    };
    let yAcc = 0;
    const nRows = table.rows.length;
    table.rows.forEach((row, ri) => {
      let rowH = 240;
      let col = 0;
      const pending2 = [];
      for (const cell of row.cells) {
        const x0 = colXs[Math.min(col, colXs.length - 1)];
        const x1 = colXs[Math.min(col + cell.gridSpan, colXs.length - 1)];
        const cellW = Math.max(300, x1 - x0 - PAD * 2);
        let cy = PAD;
        const paras = [
          ...cell.paragraphs,
          ...cell.tables.flatMap((nt) => nt.rows.flatMap((r) => r.cells.flatMap((c) => c.paragraphs)))
        ];
        for (const p of paras) {
          const st = this.styleOf(p);
          const spans = this.buildSpans(p);
          const spanCharStart = [];
          let accSp = 0;
          for (const sp of spans) {
            spanCharStart.push(accSp);
            accSp += sp.text.length;
          }
          const { lines } = breakRich(spans, this.fonts, { availableTwips: cellW });
          const align = p.props.alignment ?? st?.alignment;
          for (const line of lines) {
            const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
            const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
            let startX = x0 + PAD;
            if (align === "center") startX += (cellW - line.widthTwips) / 2;
            else if (align === "right") startX += cellW - line.widthTwips;
            const baseY = cy + lh * 0.8;
            for (const seg of line.segments) {
              const span = spans[seg.spanIndex];
              const run = p.runs[span.runIndex ?? seg.spanIndex];
              const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
              const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
              if (!txt) continue;
              pending2.push({
                row: ri,
                col,
                xTwips: startX + seg.xTwips,
                yTwips: baseY,
                text: txt,
                sizePt: span.sizePt,
                bold: span.variant === "bold" || span.variant === "boldItalic",
                italic: span.variant === "italic" || span.variant === "boldItalic",
                color: run?.props.color ?? st?.color,
                family: this.familyFor(span.family),
                underline: run?.props.underline,
                strike: run?.props.strike
              });
            }
            cy += lh;
          }
        }
        rowH = Math.max(rowH, cy + PAD);
        if (cell.shadingHex) {
          tl.cellShades.push({ xTwips: x0, yTwips: yAcc, wTwips: x1 - x0, hTwips: 0, hex: cell.shadingHex });
        }
        const tb = table.borders;
        const isFirstRow = ri === 0;
        const isLastRow = ri === nRows - 1;
        const isFirstCol = col === 0;
        const isLastCol = col + cell.gridSpan >= cols.length;
        tl.cellRects.push({
          x0,
          y0: yAcc,
          x1,
          y1: -1,
          edges: {
            top: cell.borders?.top ?? (isFirstRow ? tb?.top : tb?.insideH),
            bottom: cell.borders?.bottom ?? (isLastRow ? tb?.bottom : tb?.insideH),
            left: cell.borders?.left ?? (isFirstCol ? tb?.left : tb?.insideV),
            right: cell.borders?.right ?? (isLastCol ? tb?.right : tb?.insideV)
          }
        });
        col += cell.gridSpan;
      }
      for (const sh of tl.cellShades) if (sh.yTwips === yAcc && sh.hTwips === 0) sh.hTwips = rowH;
      for (const cr of tl.cellRects) if (cr.y1 === -1) cr.y1 = yAcc + rowH;
      for (const cl of pending2) tl.cellLines.push({ ...cl, yTwips: cl.yTwips + yAcc });
      yAcc += rowH;
      tl.rowYs.push(yAcc);
    });
    tl.heightTwips = yAcc;
    return tl;
  }
  continuousHeight = 0;
  /** Altura (twips) de cada tile no modo contínuo (Web/Rascunho). */
  tileHeights = [];
  dropCapFloats = [];
  /** topo (twips) da banda do HF em edição — usado p/ desenhar o rótulo/borda. */
  hfRegionTopTwips = 0;
  /** altura (twips) do conteúdo do HF em edição — p/ dimensionar a banda. */
  hfRegionHeightTwips = 0;
  /** Ao capturar o snapshot de fundo (entrar em edição de HF): renderiza os HF
   *  CHEIOS, mas suprime o HF ATIVO (que será pintado por cima, em foco). Assim
   *  o fundo esmaecido contém corpo + o OUTRO HF (como o Word). Null fora disso. */
  hfSnapshotActive = null;
  /** Capturando o snapshot de CORPO da edição HF: suprime AMBOS header e footer
   *  (eles são repintados na composição) e usa fundo TRANSPARENTE, para o corpo
   *  compor por cima da imagem behindDoc (capa) sem veladura branca. */
  hfCapturing = false;
  /** última zona de HF sob o mouse (p/ não repetir o evento de hover). */
  lastHoverHf = null;
  /** Em qual zona de HF (margem sup/inf) e PÁGINA o mouse caiu, se alguma. */
  hfZoneAt(e) {
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg].getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const yT = (e.clientY - rect.top) / scale;
      if (this.eng) {
        if (yT < this.hfBand(pg, "header").bottom) return { kind: "header", page: pg };
        if (yT > this.hfBand(pg, "footer").top) return { kind: "footer", page: pg };
        return null;
      }
      const sp = this.sectionStarts.length ? this.sectPrAt(this.pageSections[pg] ?? 0) : this.sect();
      if (yT < sp.marginTopTwips) return { kind: "header", page: pg };
      if (yT > sp.pageHeightTwips - sp.marginBottomTwips) return { kind: "footer", page: pg };
      return null;
    }
    return null;
  }
  /** true se o ponteiro está dentro da faixa ativa (header/footer) da página em edição. */
  hfClickInActiveBand(e) {
    if (!this.hfEdit) return false;
    const cv = this.canvases[Math.min(this.hfActivePage, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    if (e.clientX < rect.left || e.clientX > rect.right) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const yT = (e.clientY - rect.top) / scale;
    const isHeader = this.hfEdit.kind === "header";
    if (this.eng) {
      const band = this.hfBand(this.hfActivePage, this.hfEdit.kind);
      return yT >= band.top && yT <= band.bottom;
    }
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const lineY = isHeader ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
    const bandTop = isHeader ? 0 : lineY;
    const bandBot = isHeader ? lineY : sp.pageHeightTwips;
    return yT >= bandTop && yT <= bandBot;
  }
  /** Região de HF (header/footer) sob o clique, ou null (corpo). Usado no modo
   *  HF p/ trocar o foco entre header e footer (ambos ativos, como no Word). */
  hfRegionAtClick(e) {
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const cv = this.canvases[pg];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const yT = (e.clientY - rect.top) / scale;
      if (this.eng) {
        if (yT <= this.hfBand(pg, "header").bottom) return { kind: "header", page: pg };
        if (yT >= this.hfBand(pg, "footer").top) return { kind: "footer", page: pg };
        return null;
      }
      const sp = this.sectPrForSavedPage(pg);
      if (yT <= sp.marginTopTwips) return { kind: "header", page: pg };
      if (yT >= sp.pageHeightTwips - sp.marginBottomTwips) return { kind: "footer", page: pg };
      return null;
    }
    return null;
  }
  /** Troca o foco de edição entre header e footer (ou de página) sem sair do
   *  modo HF. As edições da parte anterior persistem (mesmas refs no fullDoc). */
  switchHfFocus(kind, page) {
    if (!this.hfEdit) return;
    if (this.hfEdit.kind === kind && this.hfActivePage === page) return;
    this.exitHeaderFooter();
    this.enterHeaderFooter(kind, page);
  }
  /** Geometria das colunas numa página + quais têm conteúdo (p/ o separador). */
  colContentOnPage(pg, sp) {
    if (!sp.cols || sp.cols.count < 2) return null;
    const n = sp.cols.count, gap = sp.cols.spaceTwips;
    const cw = (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips - gap * (n - 1)) / n;
    const origin = (c) => sp.marginLeftTwips + c * (cw + gap);
    const hasContent = new Array(n).fill(false);
    let maxBottom = sp.marginTopTwips;
    for (const pl of this.layoutCache) for (const ln of pl.lines) {
      if (ln.page !== pg) continue;
      maxBottom = Math.max(maxBottom, ln.yTwips + ln.heightTwips);
      let best = 0;
      for (let c = 1; c < n; c++) {
        if (Math.abs(ln.xTwips - origin(c)) < Math.abs(ln.xTwips - origin(best))) best = c;
      }
      hasContent[best] = true;
    }
    maxBottom = Math.min(maxBottom, sp.pageHeightTwips - sp.marginBottomTwips);
    return { n, gap, origin, hasContent, maxBottom };
  }
  /** snapshot do corpo (por página) p/ mostrar esmaecido durante a edição de HF. */
  hfBodySnapshots = [];
  allLines() {
    return this.layoutCache.flatMap((p) => p.lines);
  }
  lineOf(pos) {
    const pl = this.layoutCache[pos.para];
    if (!pl) return null;
    for (const l of pl.lines) {
      if (pos.offset >= l.rich.start && pos.offset <= l.rich.end) {
        if (pos.offset === l.rich.end && l !== pl.lines[pl.lines.length - 1]) continue;
        return l;
      }
    }
    return pl.lines[pl.lines.length - 1] ?? null;
  }
  caretX(pos, line) {
    if (line.eng) return caretXIn(line.eng, pos.offset);
    const pl = this.layoutCache[pos.para];
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join("");
    for (let i = line.rich.start; i < pos.offset && i < pl.charAdvances.length; i++) {
      x += pl.charAdvances[i];
      if (line.justifyExtraPerSpace && text[i] === " ") x += line.justifyExtraPerSpace;
    }
    return x;
  }
  hitLineX(line, xTwips) {
    if (line.eng) return Math.max(line.rich.start, Math.min(line.rich.end, offsetAtX(line.eng, xTwips, line.rich.end)));
    const pl = this.layoutCache[line.para];
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join("");
    for (let i = line.rich.start; i < line.rich.end; i++) {
      let a = pl.charAdvances[i];
      if (line.justifyExtraPerSpace && text[i] === " ") a += line.justifyExtraPerSpace;
      if (xTwips < x + a / 2) return i;
      x += a;
    }
    return line.rich.end;
  }
  /** Localiza uma caixa de texto flutuante sob o ponteiro (corpo OU HF ativo).
   *  Retorna o run que a carrega, seu retângulo ancorado (twips) e a página. */
  hitTextbox(e) {
    if (!this.model) return null;
    const inHf = !!this.hfEdit;
    const scale = PX_PER_TWIP * this.zoom;
    const paras = this.model.paragraphs;
    for (let pi = 0; pi < paras.length; pi++) {
      for (const r of paras[pi].runs) {
        if (!r.textbox) continue;
        const tb = r.textbox;
        let page, sp, originX, paraTop;
        const er = this.eng ? this.engObjectOf(r, inHf ? this.hfActivePage : void 0) : null;
        if (this.eng && !er) continue;
        if (inHf) {
          page = this.hfActivePage;
          sp = this.sectPrForSavedPage(page);
          originX = sp.marginLeftTwips;
          paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        } else {
          const first = this.layoutCache[pi]?.lines[0];
          if (!first) continue;
          page = first.page;
          sp = this.sectPrAt(this.pageSections[page] ?? 0);
          originX = sp.marginLeftTwips;
          paraTop = first.yTwips;
        }
        let { x, y } = tb.floating ? this.anchoredPos(tb, originX, paraTop, sp) : { x: originX, y: paraTop };
        let w = tb.widthTwips || sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        let h = this.effectiveTbHeight(tb);
        if (er) ({ page, x, y, w, h } = er);
        const cv = this.canvases[page];
        if (!cv) continue;
        const rect = cv.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        if (e.clientX < rect.left || e.clientX > rect.right) continue;
        const xT = (e.clientX - rect.left) / scale;
        const yT = (e.clientY - rect.top) / scale;
        if (xT >= x && xT <= x + w && yT >= y && yT <= y + h) {
          return { hostRun: r, rect: { x, y, w, h }, page };
        }
      }
    }
    return null;
  }
  /** true se o ponteiro está dentro da caixa em edição (com pequena tolerância). */
  pointInTbRect(e) {
    if (!this.tbEdit) return false;
    const cv = this.canvases[Math.min(this.tbEdit.pageIdx, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const xT = (e.clientX - rect.left) / scale;
    const yT = (e.clientY - rect.top) / scale;
    const r = this.tbEdit.rectTwips;
    const tol = 30;
    return xT >= r.x - tol && xT <= r.x + r.w + tol && yT >= r.y - tol && yT <= r.y + r.h + tol;
  }
  // ─────────── objetos flutuantes: enumeração / hit-test / handles ───────────
  static FLOAT_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  /** Todos os objetos flutuantes visíveis no contexto atual (corpo OU HF ativo),
   *  com o retângulo EXATAMENTE como são pintados. Vazio durante edição de texto
   *  de caixa (tbEdit). */
  enumFloats() {
    if (this.tbEdit || !this.model) return [];
    const out = [];
    if (this.eng) {
      const onPage = this.hfEdit ? this.hfActivePage : void 0;
      for (const p of this.model.paragraphs) {
        for (const r of p.runs) {
          const obj = r.image?.floating ? r.image : r.textbox;
          if (!obj) continue;
          const er = this.engObjectOf(r, onPage);
          if (er) out.push({ run: r, obj, kind: r.textbox ? "textbox" : "image", page: er.page, rect: { x: er.x, y: er.y, w: er.w, h: er.h } });
        }
      }
      return out;
    }
    if (this.hfEdit) {
      const sp = this.sectPrForSavedPage(this.hfActivePage);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      this.model.paragraphs.forEach((p, pi) => {
        const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        for (const r of p.runs) {
          const obj = r.textbox ?? r.image;
          if (!obj) continue;
          const { x, y } = obj.floating ? this.anchoredPos(obj, sp.marginLeftTwips, paraTop, sp) : { x: sp.marginLeftTwips, y: paraTop };
          out.push({
            run: r,
            obj,
            kind: r.textbox ? "textbox" : "image",
            page: this.hfActivePage,
            rect: { x, y, w: obj.widthTwips || colW, h: r.textbox ? this.effectiveTbHeight(r.textbox) : obj.heightTwips || 240 }
          });
        }
      });
      return out;
    }
    for (const f of this.floatImages) {
      const first = this.layoutCache[f.para]?.lines[0];
      if (!first || !f.run.image) continue;
      const img = f.run.image;
      out.push({
        run: f.run,
        obj: img,
        kind: "image",
        page: first.page,
        rect: {
          x: first.xTwips + (img.offsetXTwips ?? 0),
          y: first.yTwips + (img.offsetYTwips ?? 0),
          w: img.widthTwips,
          h: img.heightTwips
        }
      });
    }
    this.model.paragraphs.forEach((p, pi) => {
      const first = this.layoutCache[pi]?.lines[0];
      if (!first) return;
      const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      for (const r of p.runs) {
        if (!r.textbox) continue;
        const { x, y } = r.textbox.floating ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp) : { x: sp.marginLeftTwips, y: first.yTwips };
        out.push({
          run: r,
          obj: r.textbox,
          kind: "textbox",
          page: first.page,
          rect: { x, y, w: r.textbox.widthTwips || colW, h: this.effectiveTbHeight(r.textbox) }
        });
      }
    });
    return out;
  }
  /** Handle atual do objeto selecionado (retângulo vivo, recomputado). */
  selectedFloat() {
    if (!this.floatSel) return null;
    return this.enumFloats().find((h) => h.run === this.floatSel) ?? null;
  }
  /** Float ATIVO para handles/resize: a caixa em EDIÇÃO (tbEdit) OU a imagem
   *  selecionada (floatSel). Assim o redimensionamento coexiste com a edição. */
  activeFloat() {
    if (this.tbEdit) {
      const tb = this.tbEdit.hostRun.textbox;
      if (!tb) return null;
      return {
        run: this.tbEdit.hostRun,
        obj: tb,
        kind: "textbox",
        page: this.tbEdit.pageIdx,
        rect: { ...this.tbEdit.rectTwips }
      };
    }
    return this.selectedFloat();
  }
  /** Objeto flutuante sob o ponteiro (o de cima = último pintado = mais à frente). */
  hitFloat(e, kind) {
    const scale = PX_PER_TWIP * this.zoom;
    let best = null;
    for (const h of this.enumFloats()) {
      if (kind && h.kind !== kind) continue;
      const cv = this.canvases[h.page];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      const pageW = rect.width / scale, pageH = rect.height / scale;
      if (h.rect.w * h.rect.h >= 0.55 * pageW * pageH) continue;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      if (xT >= h.rect.x && xT <= h.rect.x + h.rect.w && yT >= h.rect.y && yT <= h.rect.y + h.rect.h) {
        best = h;
      }
    }
    return best;
  }
  /** Centro (client px) de cada handle do objeto selecionado. */
  handleCenters(h) {
    const cv = this.canvases[h.page];
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const scale = PX_PER_TWIP * this.zoom;
    const left = rect.left + h.rect.x * scale;
    const top = rect.top + h.rect.y * scale;
    const right = left + h.rect.w * scale;
    const bottom = top + h.rect.h * scale;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return {
      nw: { cx: left, cy: top },
      n: { cx: midX, cy: top },
      ne: { cx: right, cy: top },
      e: { cx: right, cy: midY },
      se: { cx: right, cy: bottom },
      s: { cx: midX, cy: bottom },
      sw: { cx: left, cy: bottom },
      w: { cx: left, cy: midY }
    };
  }
  /** Nome do handle sob o ponteiro (ou null). */
  handleAt(e) {
    const h = this.activeFloat();
    if (!h) return null;
    const centers = this.handleCenters(h);
    if (!centers) return null;
    const R = 7 * (window.devicePixelRatio || 1);
    for (const name of _UniversalWriteElement.FLOAT_HANDLES) {
      const c = centers[name];
      if (Math.abs(e.clientX - c.cx) <= R && Math.abs(e.clientY - c.cy) <= R) return name;
    }
    return null;
  }
  cursorForHandle(hn) {
    if (hn === "nw" || hn === "se") return "nwse-resize";
    if (hn === "ne" || hn === "sw") return "nesw-resize";
    if (hn === "n" || hn === "s") return "ns-resize";
    return "ew-resize";
  }
  /** Inicia arrasto de mover (handle='') ou redimensionar. Snapshot p/ undo. */
  startFloatDrag(e, mode, handle) {
    const h = this.activeFloat();
    if (!h) return;
    e.preventDefault();
    const scale = PX_PER_TWIP * this.zoom;
    this.snapshot();
    const obj = h.obj;
    const editingTb = this.tbEdit && obj === this.tbEdit.hostRun.textbox ? this.tbEdit : null;
    const startRect = editingTb ? { ...editingTb.rectTwips } : null;
    if (mode === "resize" && editingTb) obj.autoFit = false;
    const startW = editingTb ? editingTb.rectTwips.w : obj.widthTwips;
    const startH = editingTb ? editingTb.rectTwips.h : obj.heightTwips;
    const d = {
      mode,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW,
      startH,
      startOX: obj.offsetXTwips ?? 0,
      startOY: obj.offsetYTwips ?? 0,
      aspect: startH ? startW / startH : 1,
      page: h.page,
      moved: false
    };
    this.floatDrag = d;
    const engStart = this.eng && !editingTb ? { x: h.rect.x, y: h.rect.y } : null;
    const move = (ev) => {
      if (!this.floatDrag) return;
      const dxT = (ev.clientX - d.startClientX) / scale;
      const dyT = (ev.clientY - d.startClientY) / scale;
      if (Math.abs(ev.clientX - d.startClientX) + Math.abs(ev.clientY - d.startClientY) > 2) d.moved = true;
      if (d.mode === "move") {
        obj.offsetXTwips = Math.round(d.startOX + dxT);
        obj.offsetYTwips = Math.round(d.startOY + dyT);
      } else {
        this.applyResize(obj, d, dxT, dyT, h.kind === "image");
      }
      if (engStart) this.moveAnchorTo(obj, engStart.x + (obj.offsetXTwips ?? 0) - d.startOX, engStart.y + (obj.offsetYTwips ?? 0) - d.startOY);
      if (editingTb && startRect) {
        editingTb.rectTwips = {
          x: startRect.x + ((obj.offsetXTwips ?? 0) - d.startOX),
          y: startRect.y + ((obj.offsetYTwips ?? 0) - d.startOY),
          w: obj.widthTwips,
          h: obj.heightTwips
        };
      }
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (this.floatDrag) this.refresh();
      });
    };
    let frame = 0;
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      cancelAnimationFrame(frame);
      frame = 0;
      const moved = this.floatDrag?.moved;
      this.floatDrag = null;
      if (!moved) this.undoStack.pop();
      else {
        this.dispatchEvent(new CustomEvent("uw-change"));
      }
      this.onSelectionChange?.();
      this.chromeSync?.();
      this.refresh();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  applyResize(obj, d, dxT, dyT, lockAspect) {
    const MIN = 120;
    const hn = d.handle;
    let w = d.startW, h = d.startH, ox = d.startOX, oy = d.startOY;
    if (hn.includes("e")) w = d.startW + dxT;
    if (hn.includes("w")) {
      w = d.startW - dxT;
      ox = d.startOX + dxT;
    }
    if (hn.includes("s")) h = d.startH + dyT;
    if (hn.includes("n")) {
      h = d.startH - dyT;
      oy = d.startOY + dyT;
    }
    if (lockAspect && hn.length === 2 && d.startW > 0 && d.startH > 0) {
      const rw = w / d.startW, rh = h / d.startH;
      const r = Math.abs(rw - 1) >= Math.abs(rh - 1) ? rw : rh;
      const nw = d.startW * r, nh = d.startH * r;
      if (hn.includes("w")) ox = d.startOX + (d.startW - nw);
      if (hn.includes("n")) oy = d.startOY + (d.startH - nh);
      w = nw;
      h = nh;
    }
    obj.widthTwips = Math.max(MIN, Math.round(w));
    obj.heightTwips = Math.max(MIN, Math.round(h));
    obj.offsetXTwips = Math.round(ox);
    obj.offsetYTwips = Math.round(oy);
  }
  deleteSelectedFloat() {
    const run = this.floatSel;
    if (!run || !this.model) return;
    this.snapshot();
    for (const p of this.model.paragraphs) {
      const idx = p.runs.indexOf(run);
      if (idx >= 0) {
        p.runs.splice(idx, 1);
        break;
      }
    }
    this.floatImages = this.floatImages.filter((f) => f.run !== run);
    this.floatSel = null;
    this.refresh();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  hitTest(e) {
    if (!this.model) return null;
    let order = [...this.canvases.keys()];
    order.sort((a, b) => {
      const ra = this.canvases[a].getBoundingClientRect();
      const rb = this.canvases[b].getBoundingClientRect();
      const da = Math.max(0, ra.left - e.clientX, e.clientX - ra.right);
      const db = Math.max(0, rb.left - e.clientX, e.clientX - rb.right);
      return da - db;
    });
    for (const pg of order) {
      const canvas = this.canvases[pg];
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      let best = null;
      if (this.eng) {
        let bestD = Infinity;
        for (const line of this.allLines()) {
          if (line.page !== pg) continue;
          const l = line.eng;
          const x0 = l?.x ?? line.xTwips, x1 = x0 + (l?.width ?? 0);
          const dy = yT < line.yTwips ? line.yTwips - yT : yT > line.yTwips + line.heightTwips ? yT - line.yTwips - line.heightTwips : 0;
          const dx = xT < x0 ? x0 - xT : xT > x1 ? xT - x1 : 0;
          const d = dy * 4 + dx;
          if (d < bestD) {
            bestD = d;
            best = line;
          }
        }
      } else {
        for (const line of this.allLines()) {
          if (line.page !== pg) continue;
          if (yT >= line.yTwips && yT <= line.yTwips + line.heightTwips) {
            best = line;
            break;
          }
          if (!best || Math.abs(line.yTwips + line.heightTwips / 2 - yT) < Math.abs(best.yTwips + best.heightTwips / 2 - yT)) best = line;
        }
      }
      if (!best) return { para: 0, offset: 0 };
      return { para: best.para, offset: this.hitLineX(best, xT) };
    }
    return null;
  }
  /** Rola até o caret APENAS se ele estiver fora da tela ou cortado.
   *  Animação suave, exceto se o SO pedir movimento reduzido. */
  scrollCaretIntoView() {
    const line = this.lineOf(this.selection.focus);
    if (!line) return;
    const canvas = this.canvases[line.page];
    if (!canvas) return;
    const scale = PX_PER_TWIP * this.zoom;
    const caretTop = canvas.offsetTop + line.yTwips * scale;
    const caretBottom = caretTop + line.heightTwips * scale;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop;
    const viewBottom = viewTop + viewH;
    const MARGIN = 8;
    if (caretTop >= viewTop + MARGIN && caretBottom <= viewBottom - MARGIN) return;
    const target = caretTop < viewTop + MARGIN ? caretTop - MARGIN - 32 : caretBottom - viewH + MARGIN + 32;
    this.animateScrollTo(Math.max(0, target));
  }
  /** Scroll animado próprio (rAF + easeOutCubic) — 'smooth' nativo é no-op em
   *  alguns Chromium; instantâneo quando o SO pede movimento reduzido. */
  scrollAnim = 0;
  animateScrollTo(target) {
    cancelAnimationFrame(this.scrollAnim);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.scrollTop = target;
      return;
    }
    const start = this.scrollTop;
    const dist = target - start;
    if (Math.abs(dist) < 2) {
      this.scrollTop = target;
      return;
    }
    const DURATION = 220;
    const t0 = performance.now();
    let started = false;
    const step = (now) => {
      started = true;
      const t = Math.min(1, (now - t0) / DURATION);
      const ease = 1 - Math.pow(1 - t, 3);
      this.scrollTop = start + dist * ease;
      if (t < 1) this.scrollAnim = requestAnimationFrame(step);
    };
    this.scrollAnim = requestAnimationFrame(step);
    window.setTimeout(() => {
      if (!started) {
        cancelAnimationFrame(this.scrollAnim);
        this.scrollTop = target;
      }
    }, 80);
  }
  // ───────────────── motor de layout no canvas (visão de impressão) ─────────────────
  // O canvas pinta a MESMA árvore de layout do PDF (@universal-office/docx-layout,
  // validada contra os PDFs do Word). O motor recebe o estado VIVO (parágrafos
  // do modelo + tabelas ancoradas + seções), sem serializar; o cursor, a
  // seleção e o clique saem dos caracteres de cada linha (LaidOutLine.chars).
  // Visões web/rascunho/estrutura, a edição de cabeçalho/rodapé e de caixa de
  // texto continuam no layout legado (compõem sobre o instantâneo do corpo
  // pintado pelo motor). layout="legacy" desliga o motor; se ele lançar
  // exceção, o editor volta ao legado sozinho (console.warn).
  /** layout="legacy": o layout antigo do canvas (o motor é o padrão). */
  legacyRequested() {
    return (this.getAttribute("layout") ?? "").toLowerCase() === "legacy";
  }
  /** O motor diagrama e pinta o canvas agora? */
  engineActive() {
    return !this.legacyRequested() && !this.engineFailed && this.forceLegacy === 0 && !!this.model && !!this.fonts && (this.view === "print" || this.view === "read") && !this.tbEdit;
  }
  /** Exportações que leem o layout legado (XPS, PDF de reserva) o refazem
   *  durante a chamada e devolvem o motor depois. */
  forceLegacy = 0;
  withLegacyLayout(fn) {
    if (!this.eng) return fn();
    if (this.cellEdit) this.exitCell();
    this.forceLegacy++;
    try {
      this.layout();
      return fn();
    } finally {
      this.forceLegacy--;
      this.refresh();
    }
  }
  resetEngineState() {
    this.eng = null;
    this.engineFailed = false;
    this.engPageCache.clear();
    this.bookmarkParas = /* @__PURE__ */ new Map();
    this.cellEdit = null;
    this.engMissing.clear();
    this.engFontsAttempted.clear();
  }
  /** Estado do CORPO — na edição de célula o modelo é o da célula. */
  bodyModel() {
    return this.bodyState().model;
  }
  /** Corpo do documento em qualquer modo de edição (célula, cabeçalho/rodapé,
   *  caixa de texto guardam o corpo enquanto o modelo é o deles). */
  bodyState() {
    if (this.savedBody) return this.savedBody;
    if (this.savedForTb) return this.savedForTb;
    if (this.cellEdit) return { model: this.cellEdit.saved.model, tableAnchors: this.tableAnchors, sectionStarts: this.sectionStarts };
    return { model: this.model, tableAnchors: this.tableAnchors, sectionStarts: this.sectionStarts };
  }
  /** Documento do motor a partir do estado VIVO (sem serializar). */
  liveEngineDoc() {
    const b = this.bodyState();
    if (this.cellEdit?.cell.blocks) this.cellEdit.cell.blocks = reconcileBlocks(this.cellEdit.cell.blocks, this.cellEdit.cell.paragraphs, false);
    const tb = this.tbEdit?.hostRun.textbox;
    if (tb?.blocks) tb.blocks = reconcileBlocks(tb.blocks, tb.paras, true);
    return buildEngineDoc({
      fullDoc: this.fullDoc,
      paragraphs: b.model.paragraphs,
      tableAnchors: b.tableAnchors,
      sectionStarts: b.sectionStarts,
      sectPr: b.model.sectPr,
      bookmarkParas: this.bookmarkParas
    });
  }
  /** Guarda nas props de cada run uma referência ao w:rPr ORIGINAL e, nos runs
   *  que a edição recriou sem ele (docx-core divide/refaz runs sem o rPr), o
   *  devolve — o motor lê a formatação do rPr (estilo de caractere, fontes de
   *  tema…) com as props como edições por cima (directRPr). Texto digitado
   *  herda as props do vizinho e, com elas, o rPr dele. */
  syncRunRPr(paras) {
    for (const p of paras) {
      for (const r of p.runs) {
        const props = r.props;
        if (r.rpr) {
          if (props[RPR_REF] !== r.rpr) props[RPR_REF] = r.rpr;
        } else if (props[RPR_REF]) r.rpr = props[RPR_REF];
        if (r.textbox) this.syncRunRPr(r.textbox.paras);
      }
    }
  }
  syncTableRPr(t) {
    for (const row of t.rows) for (const c of row.cells) {
      this.syncRunRPr(c.paragraphs);
      c.tables.forEach((n) => this.syncTableRPr(n));
    }
  }
  /** Provedor do motor para o canvas: as MESMAS faces do PDF (arquivo da fonte;
   *  sem licença de incorporação, a substituta métrico-compatível), com cache
   *  enquanto o Registry não muda. */
  liveFontProvider() {
    const v = this.fonts.version;
    if (v !== this.engFaceCacheVersion) {
      this.engFaceCache = /* @__PURE__ */ new Map();
      this.engFaceCacheVersion = v;
    }
    return this.engineFontProvider(this.engMissing, this.engFaceCache);
  }
  /** Carrega em 2º plano os padrões de hifenização dos idiomas do documento (o
   *  layout é síncrono e sem eles não hifeniza); chegando, refaz o layout. */
  scheduleHyphenation(full) {
    const want = hyphenationLangs(full).filter((l) => {
      const id = hyphenationPatternId(l);
      return !!id && !hyphenatorFor(l) && !this.hyphAttempted.has(id);
    });
    if (!want.length) return;
    for (const l of want) this.hyphAttempted.add(hyphenationPatternId(l));
    void loadHyphenation(want).then(
      () => {
        if (this.model) this.queueRefresh();
      },
      () => {
      }
    );
  }
  /** Resolve em 2º plano as famílias/variantes que o motor pediu e não tinha;
   *  chegando algo, refaz o layout. Cada família|variante é tentada uma vez
   *  (o onChange do resolvedor cobre as que mudarem depois). */
  scheduleEngineFonts() {
    if (this.engFontLoad || !this.engMissing.size) return;
    const want = /* @__PURE__ */ new Map();
    for (const [f, vs] of this.engMissing) {
      for (const v of vs) {
        const k = `${f.toLowerCase()}|${v}`;
        if (this.engFontsAttempted.has(k)) continue;
        this.engFontsAttempted.add(k);
        let s = want.get(f);
        if (!s) want.set(f, s = /* @__PURE__ */ new Set());
        s.add(v);
      }
    }
    this.engMissing.clear();
    if (!want.size) return;
    this.engFontLoad = (async () => {
      let changed = false;
      try {
        changed = await this.loadEngineFonts(want);
        const before = this.fonts?.version;
        await this.preparePdfFonts();
        if (this.fonts?.version !== before) changed = true;
      } catch {
      }
      this.engFontLoad = null;
      if (changed && this.model) this.queueRefresh();
    })();
  }
  /** Faz o layout pelo motor; false se ele falhar (o chamador cai no legado). */
  layoutEngine() {
    try {
      const t0 = performance.now();
      this.syncRunRPr(this.model.paragraphs);
      const doc = this.liveEngineDoc();
      const t1 = performance.now();
      const result = layoutDocument(doc.full, this.liveFontProvider(), ENGINE_LAYOUT_OPTS);
      const t2 = performance.now();
      this.installEngineResult(doc, result);
      this.engineStats = { ...this.engineStats, buildMs: t1 - t0, layoutMs: t2 - t1, pages: result.pages.length, mode: "full" };
      this.scheduleEngineFonts();
      this.scheduleHyphenation(doc.full);
      return true;
    } catch (e) {
      console.warn("[universal-write] motor de layout falhou no canvas; usando o layout legado", e);
      this.engineFailed = true;
      this.eng = null;
      if (this.cellEdit) this.exitCell();
      return false;
    }
  }
  // ── layout incremental: edição confinada a UM parágrafo do corpo ──
  // O parágrafo é diagramado sozinho (documento sintético com a mesma
  // formatação/geometria). Antes da edição confere-se que esse layout isolado
  // reproduz EXATAMENTE as linhas e os itens do parágrafo na página (senão o
  // contexto importa: numeração, flutuantes, borda agrupada, campos…). Depois
  // da edição, se o nº de linhas e as alturas não mudaram, o resto do
  // documento não muda: só os itens do parágrafo são trocados na página.
  // Senão (ou na dúvida) o layout completo.
  /** dica da edição em curso (definida ANTES de mexer no modelo) */
  fastHint = null;
  /** relayout completo adiado depois de edições incrementais */
  idleRelayout = 0;
  /** Marca que a próxima mudança do modelo fica no parágrafo `pi`. */
  noteParaEdit(pi) {
    this.fastHint = null;
    this.fastTable = null;
    if (!this.eng || !this.model || this.forceLegacy || this.hfEdit) return;
    try {
      if (this.cellEdit) this.fastTable = { anchor: this.cellEdit.anchor, before: this.fastBeforeTable(this.cellEdit.anchor) };
      else this.fastHint = { para: pi, before: this.fastBefore(pi) };
    } catch {
      this.fastHint = null;
      this.fastTable = null;
    }
  }
  /** dica da edição dentro de uma célula (ver fastBeforeTable) */
  fastTable = null;
  /** Tabela do corpo conferida (antes da edição na célula): o layout isolado
   *  reproduz as linhas e os itens dela, e ela cabe inteira numa página. */
  fastBeforeTable(anchor) {
    const eng = this.eng;
    const t = this.tableAnchors[anchor]?.table;
    if (!t) return null;
    const els = eng.lines.filter((el) => el.loc.kind === "cell" && el.loc.anchor === anchor);
    if (!els.length) return null;
    const pg = els[0].page;
    if (els.some((el) => el.page !== pg)) return null;
    const page = eng.result.pages[pg];
    const synth = this.synthLayout(t, this.pageSections[pg] ?? 0);
    if (!synth || synth.pages.length !== 1) return null;
    const sp = synth.pages[0];
    if (sp.lines.length !== els.length) return null;
    const dx = els[0].line.x - sp.lines[0].x, dy = els[0].line.y - sp.lines[0].y;
    const eq2 = (a, b) => Math.abs(a - b) < 0.01;
    const tail = (ref) => ref.slice(ref.indexOf("/"));
    for (let i = 0; i < els.length; i++) {
      const a = els[i].line, b = sp.lines[i];
      if (tail(a.ref) !== tail(b.ref) || a.start !== b.start || a.end !== b.end || !eq2(a.height, b.height) || !eq2(a.x, b.x + dx) || !eq2(a.y, b.y + dy)) return null;
      const ca = a.chars ?? [], cb = b.chars ?? [];
      if (ca.length !== cb.length || ca.some((c, k) => c.o !== cb[k].o || !eq2(c.x, cb[k].x + dx) || !eq2(c.w, cb[k].w))) return null;
    }
    const want = sp.items.map((it) => shiftPageItem(it, dx, dy));
    const start = findItems(page.items, want, eng.hfItems[pg] ?? 0);
    const lineAt = page.lines.indexOf(els[0].line);
    if (start < 0 || lineAt < 0 || els.some((el, i) => page.lines[lineAt + i] !== el.line)) return null;
    return { page: pg, dx, dy, start, count: want.length, lineAt, lineCount: els.length, bottom: itemsBottom(sp), root: els[0].line.ref.split("/")[0] };
  }
  /** Edição numa célula: troca só os itens/linhas da tabela se a altura dela
   *  (e portanto o resto do documento) não mudou. */
  tryFastTable() {
    const h = this.fastTable;
    this.fastTable = null;
    const eng = this.eng;
    const b = h?.before;
    const ce = this.cellEdit;
    if (!h || !b || !eng || !ce || ce.anchor !== h.anchor || !this.model) return false;
    const t0 = performance.now();
    const t = this.tableAnchors[h.anchor]?.table;
    if (!t) return false;
    this.syncRunRPr(this.model.paragraphs);
    if (ce.cell.blocks) ce.cell.blocks = reconcileBlocks(ce.cell.blocks, ce.cell.paragraphs, false);
    const synth = this.synthLayout(t, this.pageSections[b.page] ?? 0);
    if (!synth || synth.pages.length !== 1) return false;
    const sp = synth.pages[0];
    if (Math.abs(itemsBottom(sp) - b.bottom) > 0.01) return false;
    const page = eng.result.pages[b.page];
    const items = sp.items.map((it) => shiftPageItem(it, b.dx, b.dy));
    page.items.splice(b.start, b.count, ...items);
    const lines = sp.lines.map((l) => ({
      ...l,
      ref: b.root + l.ref.slice(l.ref.indexOf("/")),
      x: l.x + b.dx,
      y: l.y + b.dy,
      baseline: l.baseline + b.dy,
      ...l.chars ? { chars: l.chars.map((c) => ({ o: c.o, x: c.x + b.dx, w: c.w })) } : {}
    }));
    page.lines.splice(b.lineAt, b.lineCount, ...lines);
    const k = eng.lines.findIndex((el) => el.page === b.page && el.loc.kind === "cell" && el.loc.anchor === h.anchor);
    if (k < 0) return false;
    const sec = eng.result.pages[b.page].section;
    eng.lines.splice(k, b.lineCount, ...lines.map((line) => {
      const loc = locateRef(line.ref, eng.doc.origins);
      return { line, page: b.page, loc, para: this.lineParagraph(loc, eng.doc, sec) };
    }));
    eng.pageVersion[b.page] = (eng.pageVersion[b.page] ?? 0) + 1;
    this.rebuildEditLines();
    this.engineStats = { ...this.engineStats, buildMs: 0, layoutMs: performance.now() - t0, mode: "fast" };
    window.clearTimeout(this.idleRelayout);
    this.idleRelayout = window.setTimeout(() => {
      this.idleRelayout = 0;
      if (this.eng && this.model && !this.fastHint && !this.fastTable) this.refresh();
    }, 1500);
    return true;
  }
  /** Parágrafo (ou tabela) sozinho num documento sintético (página alta, sem HF). */
  synthLayout(block, sectIdx) {
    const sec = this.sectionStarts[sectIdx]?.section;
    const sp = sec?.sectPr ?? this.bodyModel().sectPr;
    if ((sp.cols?.count ?? 1) > 1 || sec?.sect?.lnNumType) return null;
    const base = this.fullDoc ?? { footnotes: /* @__PURE__ */ new Map(), endnotes: /* @__PURE__ */ new Map(), comments: [], styles: /* @__PURE__ */ new Map() };
    const full = {
      ...base,
      blocks: ["runs" in block ? { type: "paragraph", paragraph: block } : block],
      sections: [{
        sectPr: { ...sp, pageHeightTwips: 2e6, titlePg: false },
        ...sec?.sect ? { sect: { ...sec.sect, vAlign: void 0 } } : {},
        blockStart: 0,
        blockEnd: 0,
        headers: {},
        footers: {},
        headerRefs: [],
        footerRefs: [],
        headerBlocks: {},
        footerBlocks: {}
      }],
      bookmarks: /* @__PURE__ */ new Map()
    };
    return layoutDocument(full, this.liveFontProvider(), ENGINE_LAYOUT_OPTS);
  }
  /** Confere (antes da edição) que o parágrafo isolado reproduz o layout real. */
  fastBefore(pi) {
    const eng = this.eng;
    const ls = this.layoutCache[pi]?.lines ?? [];
    const first = ls[0]?.eng;
    if (!first || ls.some((l) => l.page !== ls[0].page || !l.eng)) return null;
    const pg = ls[0].page;
    const page = eng.result.pages[pg];
    const para = this.model.paragraphs[pi];
    const synth = this.synthLayout(para, this.pageSections[pg] ?? 0);
    if (!synth || synth.pages.length !== 1) return null;
    const sp = synth.pages[0];
    if (sp.lines.length !== ls.length) return null;
    const dx = first.x - sp.lines[0].x, dy = first.y - sp.lines[0].y;
    const eq2 = (a, b) => Math.abs(a - b) < 0.01;
    for (let i = 0; i < ls.length; i++) {
      const a = ls[i].eng, b = sp.lines[i];
      if (a.start !== b.start || a.end !== b.end || !eq2(a.height, b.height) || !eq2(a.x, b.x + dx) || !eq2(a.y, b.y + dy)) return null;
      const ca = a.chars ?? [], cb = b.chars ?? [];
      if (ca.length !== cb.length || ca.some((c, k) => c.o !== cb[k].o || !eq2(c.x, cb[k].x + dx) || !eq2(c.w, cb[k].w))) return null;
    }
    const want = sp.items.map((it) => shiftPageItem(it, dx, dy));
    const start = want.length ? findItems(page.items, want, eng.hfItems[pg] ?? 0) : this.emptyParaSlot(pi, pg);
    if (start < 0) return null;
    const lineAt = page.lines.indexOf(first);
    if (lineAt < 0) return null;
    return { page: pg, ref: first.ref, dx, dy, start, count: want.length, lineAt, heights: sp.lines.map((l) => l.height) };
  }
  /** Parágrafo sem itens (vazio): os itens novos entram logo depois dos da
   *  última linha do parágrafo anterior na mesma página (glifos + sublinhados);
   *  -1 se não dá para saber (tabela entre eles, outra página, linha vazia). */
  emptyParaSlot(pi, pg) {
    if (pi === 0 || this.tableAnchors.some((a) => a.beforePara === pi)) return -1;
    const prev = this.layoutCache[pi - 1]?.lines;
    const last = prev?.[prev.length - 1]?.eng;
    if (!last || prev[prev.length - 1].page !== pg) return -1;
    const items = this.eng.result.pages[pg].items;
    let k = -1;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.t === "glyphs" && Math.abs(it.y - last.baseline) < 1 && it.glyphs.length && it.glyphs[0].x >= last.x - 1 && it.glyphs[0].x <= last.x + last.width + 1) {
        k = i;
        break;
      }
    }
    if (k < 0) return -1;
    while (k + 1 < items.length) {
      const n = items[k + 1];
      if (n.t === "line" && Math.abs(n.y1 - n.y2) < 0.01 && Math.abs(n.y1 - last.baseline) < 400 && n.x1 >= last.x - 1 && n.x2 <= last.x + last.width + 1) k++;
      else break;
    }
    return k + 1;
  }
  /** Aplica a edição incremental; false = precisa do layout completo. */
  tryFastLayout() {
    const h = this.fastHint;
    this.fastHint = null;
    const eng = this.eng;
    const b = h?.before;
    if (!h || !b || !eng || this.cellEdit || !this.model) return false;
    const t0 = performance.now();
    const para = this.model.paragraphs[h.para];
    if (!para) return false;
    this.syncRunRPr([para]);
    const synth = this.synthLayout(para, this.pageSections[b.page] ?? 0);
    if (!synth || synth.pages.length !== 1) return false;
    const sp = synth.pages[0];
    if (sp.lines.length !== b.heights.length || sp.lines.some((l, i) => Math.abs(l.height - b.heights[i]) > 0.01)) return false;
    const page = eng.result.pages[b.page];
    const items = sp.items.map((it) => shiftPageItem(it, b.dx, b.dy));
    page.items.splice(b.start, b.count, ...items);
    const lines = sp.lines.map((l) => ({
      ...l,
      ref: b.ref,
      x: l.x + b.dx,
      y: l.y + b.dy,
      baseline: l.baseline + b.dy,
      ...l.chars ? { chars: l.chars.map((c) => ({ o: c.o, x: c.x + b.dx, w: c.w })) } : {}
    }));
    if (para.runs.some((r) => r.custom)) for (const l of lines) collapseCustomChars(l, para);
    page.lines.splice(b.lineAt, lines.length, ...lines);
    const loc = { kind: "body", para: h.para };
    let k = eng.lines.findIndex((el) => el.page === b.page && el.line.ref === b.ref);
    if (k >= 0) eng.lines.splice(k, lines.length, ...lines.map((line) => ({ line, page: b.page, loc, para })));
    const len = paraLength(para);
    this.layoutCache[h.para] = {
      spans: [],
      charAdvances: [],
      spanCharStart: [],
      lines: lines.map((l, i) => ({
        para: h.para,
        rich: { start: i === 0 ? 0 : Math.min(len, l.start), end: i === lines.length - 1 ? len : Math.min(len, l.end), widthTwips: l.width, segments: [], maxSizePt: 0, maxAscTwips: 0 },
        page: b.page,
        xTwips: l.x,
        yTwips: l.y,
        heightTwips: l.height,
        baselineTwips: l.baseline,
        justifyExtraPerSpace: 0,
        eng: l
      }))
    };
    eng.pageVersion[b.page] = (eng.pageVersion[b.page] ?? 0) + 1;
    this.engineStats = { ...this.engineStats, buildMs: 0, layoutMs: performance.now() - t0, mode: "fast" };
    window.clearTimeout(this.idleRelayout);
    this.idleRelayout = window.setTimeout(() => {
      this.idleRelayout = 0;
      if (this.eng && this.model && !this.fastHint) this.refresh();
    }, 1500);
    return true;
  }
  /** Linhas dos parágrafos do modelo em EDIÇÃO (corpo, ou a célula ativa) a
   *  partir das linhas do motor — layoutCache (cursor, seleção, setas). */
  rebuildEditLines() {
    if (!this.eng || !this.model) return;
    const paras = this.model.paragraphs;
    this.layoutCache = paras.map(() => ({ spans: [], charAdvances: [], lines: [], spanCharStart: [] }));
    const ce = this.cellEdit;
    const blocksOfCell = ce ? cellBlocks(ce.cell) : [];
    const hfWhich = this.hfEdit ? this.hfEdit.kind === "header" ? "hdr" : "ftr" : null;
    let hfPage = this.hfActivePage;
    if (hfWhich) {
      const shows = (pg) => this.eng.lines.some((el) => el.page === pg && el.loc.kind === "hf" && el.loc.which === hfWhich && !!el.para && paras.includes(el.para));
      if (!shows(hfPage)) {
        const other = this.eng.lines.find((el) => el.loc.kind === "hf" && el.loc.which === hfWhich && !!el.para && paras.includes(el.para));
        if (other) this.hfActivePage = hfPage = other.page;
      }
    }
    for (const el of this.eng.lines) {
      let pi = -1;
      if (hfWhich) {
        if (el.page === hfPage && el.loc.kind === "hf" && el.loc.which === hfWhich && el.para) pi = paras.indexOf(el.para);
      } else if (!ce) {
        if (el.loc.kind === "body") pi = el.loc.para;
      } else if (el.loc.kind === "cell" && el.loc.anchor === ce.anchor && sameHops(el.loc.hops, ce.hops)) {
        const blk = blocksOfCell[el.loc.block];
        if (blk?.type === "paragraph") pi = paras.indexOf(blk.paragraph);
      }
      const pl = pi >= 0 ? this.layoutCache[pi] : void 0;
      if (!pl) continue;
      const l = el.line;
      if (pl.lines.some((x) => x.rich.start === l.start && x.rich.end === l.end)) continue;
      const len = paraLength(paras[pi]);
      const clamp = (o) => Math.max(0, Math.min(len, o));
      pl.lines.push({
        para: pi,
        rich: { start: clamp(l.start), end: clamp(l.end), widthTwips: l.width, segments: [], maxSizePt: 0, maxAscTwips: 0 },
        page: el.page,
        xTwips: l.x,
        yTwips: l.y,
        heightTwips: l.height,
        baselineTwips: l.baseline,
        justifyExtraPerSpace: 0,
        eng: l
      });
    }
    paras.forEach((p, pi) => {
      const ls = this.layoutCache[pi].lines;
      if (!ls.length) return;
      ls[0].rich.start = 0;
      ls[ls.length - 1].rich.end = paraLength(p);
    });
  }
  /** Instala o resultado: páginas, linhas do modelo em edição, camadas de HF. */
  installEngineResult(doc, result) {
    const pages = result.pages;
    this.pageCount = Math.max(1, pages.length);
    this.pageSections = pages.map((p) => doc.sectionMap[p.section] ?? 0);
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.footnoteHits = [];
    this.tileHeights = [];
    const lines = [];
    pages.forEach((p, pg) => {
      for (const l of p.lines) {
        const loc = locateRef(l.ref, doc.origins);
        const para = this.lineParagraph(loc, doc, p.section);
        if (para?.runs.some((r) => r.custom)) collapseCustomChars(l, para);
        lines.push({ line: l, page: pg, loc, para });
      }
    });
    const hfItems = pages.map((p) => Math.min(p.hfItems ?? 0, p.items.length));
    this.eng = { result, doc, lines, hfItems, version: ++this.engVersion, pageVersion: pages.map(() => 0) };
    this.rebuildEditLines();
  }
  /** Parágrafo do editor de uma linha do motor (corpo, célula ou cabeçalho/rodapé). */
  lineParagraph(loc, doc, section) {
    if (loc.kind === "body") return this.bodyState().model.paragraphs[loc.para] ?? null;
    if (loc.kind === "cell") {
      const t = this.bodyState().tableAnchors[loc.anchor]?.table;
      const cell = t ? resolveCell(t, loc.hops) : null;
      const blk = cell ? cellBlocks(cell)[loc.block] : void 0;
      return blk?.type === "paragraph" ? blk.paragraph : null;
    }
    if (loc.kind === "hf") {
      const src = hfBlocksFor(doc.full, section, loc.which, loc.part);
      return src ? paragraphAtPath(src.blocks, loc.path) : null;
    }
    return null;
  }
  /** Objeto flutuante como o motor o posicionou (na página dada, ou o 1º). */
  engObjectOf(run, page) {
    const pages = this.eng?.result.pages ?? [];
    const scan = (pg) => pages[pg]?.objects?.find((o) => o.run === run);
    if (page !== void 0) {
      const o = scan(page);
      return o ? { page, x: o.x, y: o.y, w: o.w, h: o.h } : null;
    }
    for (let pg = 0; pg < pages.length; pg++) {
      const o = scan(pg);
      if (o) return { page: pg, x: o.x, y: o.y, w: o.w, h: o.h };
    }
    return null;
  }
  /** Família/variante CSS de cada face (fonte carregada na página). */
  enginePaintEnv() {
    return {
      fontOf: (face) => this.engFaceCss.get(face) ?? {
        family: `${cssFamily(face.family)}, ${DEFAULT_FONT_CSS}`,
        weight: face.bold && !face.synthBold ? 700 : 400,
        italic: face.italic && !face.synthItalic
      },
      image: (img) => this.bitmapFor(img),
      color: (hex) => this.inkColor(hex)
    };
  }
  /** Página do motor (fundo + itens) num canvas em cache: o caret pisca e a
   *  seleção muda sem repintar os glifos. */
  engineBase(pg, page, w, h, scale) {
    const sup = this.tbSnapshotSuppress;
    const hfMode = !!this.hfEdit;
    const key = `${this.eng.version}.${this.eng.pageVersion[pg] ?? 0}|${w}x${h}|${scale.toFixed(6)}|${this.printRender ? 1 : 0}|${this.pageDark ? 1 : 0}|${this.hfCapturing ? 1 : 0}|${sup ? 1 : 0}|${hfMode ? 1 : 0}|${this.imagesVersion}`;
    const hit = this.engPageCache.get(pg);
    if (hit && hit.key === key) return hit.canvas;
    const off = hit?.canvas ?? document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (!this.hfCapturing) {
      ctx.fillStyle = page.background ? `#${page.background}` : this.pageDark ? "#1e1e1e" : "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const env = this.enginePaintEnv();
    const n = page.items.length;
    const hf = Math.min(this.eng.hfItems[pg] ?? 0, n);
    const dim = this.printRender ? 1 : HF_DIM_ALPHA;
    const layers = [
      ...this.hfCapturing ? [] : [[0, hf, hfMode ? 1 : dim]],
      [hf, n, hfMode ? dim : 1]
    ];
    const skip = sup ? this.textboxItemRange(pg, page, sup) : null;
    for (const [from, to, alpha] of layers) {
      if (from >= to) continue;
      if (skip && skip[0] < to && skip[1] > from) {
        paintItems(ctx, page.items, env, { from, to: Math.max(from, skip[0]), alpha });
        paintItems(ctx, page.items, env, { from: Math.min(to, skip[1]), to, alpha });
      } else paintItems(ctx, page.items, env, { from, to, alpha });
    }
    this.engPageCache.set(pg, { key, canvas: off });
    return off;
  }
  /** Itens do CONTEÚDO de uma caixa de texto: o recorte (push…pop) no
   *  retângulo em que o motor a posicionou — [início, fim) ou null. */
  textboxItemRange(pg, page, run) {
    const o = page.objects?.find((x) => x.run === run);
    if (!o) return null;
    const items = page.items;
    const near2 = (a, b) => a !== void 0 && Math.abs(a - b) < 0.5;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.t !== "clip" || it.op !== "push" || !near2(it.x, o.x) || !near2(it.y, o.y) || !near2(it.w, o.w) || !near2(it.h, o.h)) continue;
      let depth = 0;
      for (let j = i; j < items.length; j++) {
        const x = items[j];
        if (x.t === "clip" || x.t === "xform") {
          depth += x.op === "push" ? 1 : -1;
          if (depth === 0) return [i, j + 1];
        }
      }
      return null;
    }
    void pg;
    return null;
  }
  /** Pinta as páginas do motor + adornos de tela (seleção, campos, comentários,
   *  alças de objeto, caret). */
  paintEngine(active) {
    const eng = this.eng;
    const t0 = performance.now();
    const dpr = window.devicePixelRatio || 1;
    const sel = normalizeRange(this.range());
    const hasSel = this.hasSelection();
    const scales = [];
    const ctxs = this.canvases.map((c, i) => {
      const page = eng.result.pages[i];
      if (!active.has(i) || c.width <= 1 || !page) {
        scales.push(0);
        return null;
      }
      const bs = c.width / (parseFloat(c.style.width) || c.width);
      const scale = PX_PER_TWIP * this.zoom * bs;
      scales.push(scale);
      const ctx = c.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(this.engineBase(i, page, c.width, c.height, scale), 0, 0);
      if (this.inlineRenderers.size && !this.hfCapturing) this.paintEngineInlines(ctx, i, scale);
      if (!this.printRender && !this.hfCapturing) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        this.paintEngineMarks(ctx, i);
        this.paintEngineSpelling(ctx, i);
        if (hasSel) this.paintEngineSelection(ctx, i, sel);
        ctx.restore();
      }
      return ctx;
    });
    for (const k of [...this.engPageCache.keys()]) if (!this.allocatedPages.has(k) && !active.has(k)) this.engPageCache.delete(k);
    const hp = this.hfActivePage;
    if (this.hfEdit && !this.printRender && ctxs[hp]) {
      const sp = this.sectionOfPage(hp)?.sectPr ?? this.bodyState().model.sectPr;
      this.paintHfBands(ctxs[hp], scales[hp], sp, dpr, hp);
    }
    this.paintFloatAndCaret(ctxs, scales, dpr, hasSel);
    this.engineStats.paintMs = performance.now() - t0;
  }
  /** Sombreamento de campo e realce de comentário (adornos de tela do Word);
   *  com "mostrar marcas", · nos espaços, → nos tabs e ¶ no fim do parágrafo. */
  paintEngineMarks(ctx, pg) {
    const eng = this.eng;
    if (this.showMarks && this.model) {
      ctx.fillStyle = this.pageDark ? "#9aa0a6" : "#888";
      ctx.textAlign = "center";
      this.layoutCache.forEach((pl, pi) => {
        const text = paraText(this.model.paragraphs[pi]);
        pl.lines.forEach((line, li) => {
          if (line.page !== pg || !line.eng) return;
          const fs = Math.max(160, line.heightTwips * 0.6);
          ctx.font = `400 ${fs}px ${DEFAULT_FONT_CSS}`;
          for (const c of line.eng.chars ?? []) {
            const ch = text[c.o];
            if (ch === " " || ch === "\xA0") ctx.fillText(ch === " " ? "\xB7" : "\xB0", c.x + c.w / 2, line.baselineTwips);
            else if (ch === "	") ctx.fillText("\u2192", c.x + c.w / 2, line.baselineTwips);
          }
          if (li === pl.lines.length - 1) {
            ctx.textAlign = "left";
            const x = this.caretX({ para: pi, offset: paraLength(this.model.paragraphs[pi]) }, line);
            ctx.fillText("\xB6", x + 20, line.baselineTwips);
            ctx.textAlign = "center";
          }
        });
      });
      ctx.textAlign = "left";
    }
    for (const el of eng.lines) {
      if (el.page !== pg || el.loc.kind === "other") continue;
      const para = el.para;
      if (!para) continue;
      let acc = 0;
      for (const run of para.runs) {
        const a = acc;
        acc += run.text.length;
        const field = !!run.field || !!run.fieldResult;
        const comment = !!run.props.commentIds?.length;
        if (!field && !comment) continue;
        let x1 = Infinity, x2 = -Infinity;
        for (const c of el.line.chars ?? []) {
          if (c.o < a || c.o >= acc) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        ctx.fillStyle = comment ? "rgba(255, 187, 0, 0.28)" : this.pageDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
        ctx.fillRect(x1, el.line.y, x2 - x1, el.line.height);
      }
    }
  }
  // ───────────────────────── revisão ortográfica ─────────────────────────
  /** A revisão vale agora? (atributo nospellcheck, menu, Modo Protegido, leitura) */
  spellActive() {
    return !this.spellOff && !this.hasAttribute("nospellcheck") && !this.protectedMode && this.view !== "read";
  }
  /** Idioma/noProof efetivos: os estilos do documento aberto (refeito a cada documento). */
  spellLangResolver() {
    const sheet = this.fullDoc?.formatting?.styles;
    if (!this.spellLangs || this.spellLangs.sheet !== sheet) this.spellLangs = new LangResolver(sheet);
    return this.spellLangs;
  }
  /** O motor sob demanda: o import (chunk) só acontece na 1ª pintura com texto. */
  ensureSpell() {
    if (this.spell || this.spellLoading) return this.spell;
    this.spellLoading = true;
    void import("./chunks/src-IYIFV3PZ.js").then(({ SpellChecker }) => {
      if (!this.isConnected) return;
      const engine = SpellChecker.shared();
      this.spellEngine = engine;
      this.spell = new ParagraphSpell(engine, () => this.spellLangResolver(), () => this.queueSpellRepaint());
      this.queueSpellRepaint();
    }).catch(() => {
    }).finally(() => {
      this.spellLoading = false;
    });
    return null;
  }
  queueSpellRepaint() {
    if (this.spellRepaint) return;
    this.spellRepaint = requestAnimationFrame(() => {
      this.spellRepaint = 0;
      if (this.eng && this.isConnected) this.paint();
    });
  }
  /** Sublinhado ondulado vermelho nas palavras erradas (adorno de tela: não vai
   *  para o PDF, a impressão nem o viewer). */
  paintEngineSpelling(ctx, pg) {
    if (!this.spellActive()) return;
    const spell = this.ensureSpell();
    if (!spell) return;
    ctx.save();
    ctx.strokeStyle = this.pageDark ? "#ff6b6b" : "#e81123";
    ctx.lineWidth = 11;
    for (const el of this.eng.lines) {
      if (el.page !== pg || el.loc.kind === "other" || !el.para) continue;
      const list = spell.get(el.para);
      if (!list?.length) continue;
      const chars = el.line.chars ?? [];
      for (const m of list) {
        let x1 = Infinity, x2 = -Infinity;
        for (const c of chars) {
          if (c.o < m.start || c.o >= m.end) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        wavePath(ctx, x1, x2, el.line.baseline + 50);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  /** A revisão ortográfica está ligada (menu "Verificar ortografia ao digitar"). */
  spellCheckEnabled() {
    return !this.spellOff && !this.hasAttribute("nospellcheck");
  }
  /** Liga/desliga a revisão nesta sessão (o atributo nospellcheck desliga de vez). */
  toggleSpellCheck(on) {
    this.spellOff = on === void 0 ? !this.spellOff : !on;
    this.paint();
    this.chromeSync?.();
  }
  /** Palavra errada no cursor (do que já foi revisado; null = nenhuma / ainda não revisado). */
  spellingAtCaret() {
    if (!this.model || !this.spellActive()) return null;
    const pos = this.selection.focus;
    const para = this.model.paragraphs[pos.para];
    const m = para && misspellingAt(this.ensureSpell()?.get(para), pos.offset);
    return m ? { ...m, para: pos.para } : null;
  }
  /** Sugestões do Hunspell para a palavra (até `limit`, como o menu do Word). */
  async spellingSuggestions(m, limit = 5) {
    if (!this.spellEngine) return [];
    return (await this.spellEngine.suggest(m.word, m.lang)).slice(0, limit);
  }
  /** Troca a palavra errada (se ela ainda está lá) — desfazível. */
  replaceSpelling(m, text) {
    if (!this.model || this.locked()) return false;
    const para = this.model.paragraphs[m.para];
    if (!para || paraText(para).slice(m.start, m.end) !== m.word) return false;
    this.snapshot();
    const pos = deleteRange2(this.model, { start: { para: m.para, offset: m.start }, end: { para: m.para, offset: m.end } });
    const end = insertText2(this.model, pos, text);
    this.selection = { anchor: end, focus: end };
    this.refresh();
    return true;
  }
  /** "Ignorar tudo" (nesta sessão, em todos os documentos). */
  ignoreSpelling(word) {
    this.spellEngine?.ignore(word);
  }
  /** "Adicionar ao dicionário" do usuário (persistido pelo motor). */
  async addToDictionary(word) {
    await this.spellEngine?.add(word);
  }
  /**
   * Próxima palavra errada a partir do cursor (diálogo Ortografia): revisa os
   * parágrafos na hora, seleciona a palavra e a traz para a vista. `skip`: as
   * "ignorar uma vez" do diálogo. null = nada mais (dá a volta no documento).
   */
  async nextMisspelling(skip = /* @__PURE__ */ new Set()) {
    if (!this.model) return null;
    this.ensureSpell();
    for (let i = 0; i < 100 && !this.spell; i++) await new Promise((r) => setTimeout(r, 30));
    const spell = this.spell;
    if (!spell) return null;
    const paras = this.model.paragraphs;
    const startP = Math.min(this.selection.focus.para, paras.length - 1);
    const startO = normalizeRange(this.range()).end.offset;
    for (let k = 0; k <= paras.length; k++) {
      const pi = (startP + k) % paras.length;
      const list = await spell.check(paras[pi]);
      if (this.model?.paragraphs !== paras) return null;
      const m = list.find((x) => (k > 0 || pi !== startP || x.start >= startO) && !skip.has(`${pi}:${x.start}:${x.word}`));
      if (m) {
        this.selection = { anchor: { para: pi, offset: m.start }, focus: { para: pi, offset: m.end } };
        this.refreshSelection();
        this.scrollCaretIntoView();
        return { ...m, para: pi };
      }
    }
    return null;
  }
  /** Inlines de plugin com desenho próprio: na caixa do texto de reserva que o
   *  motor diagramou (o motor não conhece a medida do plugin). */
  paintEngineInlines(ctx, pg, scale) {
    const page = this.eng.result.pages[pg];
    for (const el of this.eng.lines) {
      if (el.page !== pg || el.loc.kind === "other") continue;
      const para = el.para;
      if (!para?.runs.some((r) => r.custom)) continue;
      let acc = 0;
      for (const run of para.runs) {
        const a = acc;
        acc += run.text.length;
        if (!run.custom) continue;
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const c = el.line.chars?.find((k) => k.o === a);
        if (!renderer?.draw || !c) continue;
        const gr = page.items.find((it) => it.t === "glyphs" && Math.abs(it.y - el.line.baseline) < 400 && it.glyphs.some((g) => Math.abs(g.x - c.x) < 0.5));
        const run0 = gr?.t === "glyphs" ? gr : null;
        const sizePt = run0?.sizePt ?? (run.props.szHalfPt ?? 22) / 2;
        const css = run0 ? this.enginePaintEnv().fontOf(run0.face) : { family: DEFAULT_FONT_CSS, weight: 400, italic: false };
        const font = run0?.face.font ?? this.fonts.resolve(void 0, "regular");
        const measureText = (text) => {
          let w = 0;
          for (const ch of text) w += font.advanceWidth(font.glyphId(ch.codePointAt(0))) * sizePt * 20 / (font.metrics.unitsPerEm || 1e3);
          return w;
        };
        const fallbackText = renderer.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const ink = this.inkColor(run0?.color ?? run.props.color);
        ctx.save();
        ctx.fillStyle = this.pageDark ? "#1e1e1e" : "#ffffff";
        ctx.fillRect(c.x * scale, el.line.y * scale, c.w * scale, el.line.height * scale);
        ctx.font = `${css.italic ? "italic " : ""}${css.weight} ${sizePt * TWIPS_PER_PT * scale}px ${css.family}`;
        ctx.fillStyle = ink;
        renderer.draw({
          data: run.custom.data,
          fallbackText,
          props: run.props,
          sizePt,
          measureText,
          ctx,
          xTwips: c.x,
          yTwips: el.line.y,
          baselineTwips: el.line.baseline,
          widthTwips: c.w,
          heightTwips: el.line.height,
          scale,
          dark: this.pageDark,
          color: ink
        });
        ctx.restore();
      }
    }
  }
  /** Fundo da seleção nas linhas do modelo em edição. */
  paintEngineSelection(ctx, pg, sel) {
    ctx.fillStyle = "rgba(58,114,196,0.35)";
    for (let pi = sel.start.para; pi <= sel.end.para; pi++) {
      for (const line of this.layoutCache[pi]?.lines ?? []) {
        if (line.page !== pg) continue;
        const from = Math.max(line.rich.start, pi === sel.start.para ? sel.start.offset : 0);
        const to = Math.min(line.rich.end, pi === sel.end.para ? sel.end.offset : line.rich.end);
        const past = pi < sel.end.para && line === this.layoutCache[pi].lines[this.layoutCache[pi].lines.length - 1];
        if (to <= from && !past) continue;
        const x1 = this.caretX({ para: pi, offset: from }, line);
        const x2 = this.caretX({ para: pi, offset: to }, line) + (past ? 80 : 0);
        ctx.fillRect(x1, line.yTwips, Math.max(0, x2 - x1), line.heightTwips);
      }
    }
  }
  /** Fim da linha para End: numa linha quebrada, antes do espaço final (o
   *  offset do fim é o início da próxima linha). */
  lineEndOffset(line) {
    const pl = this.layoutCache[line.para];
    const last = !pl || pl.lines[pl.lines.length - 1] === line;
    if (last || !line.eng || !this.model) return line.rich.end;
    const text = paraText(this.model.paragraphs[line.para]);
    let e = line.rich.end;
    while (e > line.rich.start && /\s/.test(text[e - 1] ?? "")) e--;
    return e;
  }
  // ───────────── cabeçalho/rodapé no motor ─────────────
  /** Seção (do editor) da página. */
  sectionOfPage(pg) {
    const b = this.bodyState();
    const i = this.pageSections[pg] ?? 0;
    return b.sectionStarts[i]?.section ?? this.fullDoc?.sections[i] ?? this.fullDoc?.sections[0];
  }
  /**
   * Parte de cabeçalho/rodapé que a página `pg` mostra no layout do motor: a
   * variante (primeira/par/padrão — a das linhas da página, senão a regra do
   * Word) e a seção que a define (herança das anteriores). Sem parte definida,
   * a seção da própria página (o editor cria a parte nela).
   */
  hfPartOfPage(kind, pg) {
    const eng = this.eng;
    const page = eng?.result.pages[pg];
    if (!eng || !page) return null;
    const which = kind === "header" ? "hdr" : "ftr";
    let type;
    for (const el of eng.lines) if (el.page === pg && el.loc.kind === "hf" && el.loc.which === which) {
      type = el.loc.part;
      break;
    }
    if (!type) {
      let sectPage = 0;
      for (let i = pg - 1; i >= 0 && eng.result.pages[i].section === page.section; i--) sectPage++;
      const sp = this.sectionOfPage(pg)?.sectPr;
      const evenOdd = !!this.fullDoc?.formatting?.settings.evenAndOddHeaders;
      type = sectPage === 0 && sp?.titlePg ? "first" : evenOdd && page.number % 2 === 0 ? "even" : "default";
    }
    const src = hfBlocksFor(eng.doc.full, page.section, which, type);
    const b = this.bodyState();
    const definer = src ? eng.doc.sectionMap[src.definer] : void 0;
    const section = (definer !== void 0 ? b.sectionStarts[definer]?.section ?? this.fullDoc?.sections[definer] : void 0) ?? this.sectionOfPage(pg);
    return section ? { section, type } : null;
  }
  /** Faixa vertical (twips) do cabeçalho/rodapé na página: a margem ou o que
   *  o conteúdo do motor ocupa, o que for maior. */
  hfBand(pg, kind) {
    const page = this.eng?.result.pages[pg];
    const sp = this.sectionOfPage(pg)?.sectPr ?? this.bodyState().model.sectPr;
    const pageH = page?.heightTw ?? sp.pageHeightTwips;
    const which = kind === "header" ? "hdr" : "ftr";
    let top = kind === "header" ? 0 : pageH - sp.marginBottomTwips;
    let bottom = kind === "header" ? sp.marginTopTwips : pageH;
    for (const el of this.eng?.lines ?? []) {
      if (el.page !== pg || el.loc.kind !== "hf" || el.loc.which !== which) continue;
      if (kind === "header") bottom = Math.max(bottom, el.line.y + el.line.height);
      else top = Math.min(top, el.line.y);
    }
    return { top, bottom };
  }
  // ───────────── edição de célula de tabela (motor) ─────────────
  /** Linha do motor sob o ponteiro numa página (qualquer contexto). */
  engLineAt(e) {
    const eng = this.eng;
    if (!eng) return null;
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg].getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) continue;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      let best = null;
      let bestD = Infinity;
      for (const el of eng.lines) {
        if (el.page !== pg || el.loc.kind === "other") continue;
        const l = el.line;
        const dy = yT < l.y ? l.y - yT : yT > l.y + l.height ? yT - (l.y + l.height) : 0;
        const dx = xT < l.x ? l.x - xT : xT > l.x + l.width ? xT - (l.x + l.width) : 0;
        const d = dy * 4 + dx;
        if (d < bestD) {
          bestD = d;
          best = el;
        }
      }
      return best;
    }
    return null;
  }
  /** Clique na visão do motor: entra/sai da edição de célula conforme a linha
   *  clicada (o hitTest depois acha o offset nas linhas do modelo em edição). */
  routeEngineClick(e) {
    if (!this.eng || this.hfEdit || this.tbEdit || this.locked()) return;
    const el = this.engLineAt(e);
    if (!el) return;
    if (el.loc.kind === "cell") {
      const ce = this.cellEdit;
      if (ce && ce.anchor === el.loc.anchor && sameHops(ce.hops, el.loc.hops)) return;
      this.enterCell(el.loc.anchor, el.loc.hops);
    } else if (el.loc.kind === "body" && this.cellEdit) {
      this.exitCell();
      this.refreshSelection();
    }
  }
  /** Entra na edição da célula (o modelo passa a ser os parágrafos dela). */
  enterCell(anchor, hops, caret) {
    const t = this.tableAnchors[anchor]?.table;
    const cell = t ? resolveCell(t, hops) : null;
    if (!cell || !this.model) return false;
    if (this.cellEdit) this.exitCell();
    if (!cell.paragraphs.length) {
      const p = { runs: [], props: {} };
      cell.paragraphs.push(p);
      if (cell.blocks) cell.blocks.push({ type: "paragraph", paragraph: p });
    }
    this.floatSel = null;
    this.cellEdit = {
      anchor,
      hops: hops.map((h) => ({ ...h })),
      cell,
      saved: { model: this.model, selection: this.selection, undoStack: this.undoStack, redoStack: this.redoStack }
    };
    this.model = { paragraphs: cell.paragraphs, sectPr: this.model.sectPr };
    const start = caret ?? { para: 0, offset: 0 };
    this.selection = { anchor: start, focus: start };
    this.pendingProps = null;
    this.undoStack = [];
    this.redoStack = [];
    if (this.eng) {
      this.rebuildEditLines();
      this.refreshSelection();
    } else this.refresh();
    this.dispatchEvent(new CustomEvent("uw-cellmode", { detail: { active: true } }));
    return true;
  }
  /** Sai da edição de célula (sem refazer o layout — o chamador refaz). */
  exitCell() {
    const ce = this.cellEdit;
    if (!ce) return;
    if (ce.cell.blocks) ce.cell.blocks = reconcileBlocks(ce.cell.blocks, ce.cell.paragraphs, false);
    this.cellEdit = null;
    this.model = ce.saved.model;
    this.selection = ce.saved.selection;
    this.undoStack = ce.saved.undoStack;
    this.redoStack = ce.saved.redoStack;
    this.pendingProps = null;
    this.rebuildEditLines();
    this.dispatchEvent(new CustomEvent("uw-cellmode", { detail: { active: false } }));
  }
  /** Editando uma célula de tabela? */
  editingTableCell() {
    return this.cellEdit !== null;
  }
  /** Tab/Shift+Tab: próxima/anterior célula da mesma tabela (como o Word). */
  moveCell(dir) {
    const ce = this.cellEdit;
    if (!ce || !this.eng) return false;
    const prefix = ce.hops.slice(0, -1);
    const seen = [];
    for (const el of this.eng.lines) {
      if (el.loc.kind !== "cell" || el.loc.anchor !== ce.anchor || el.loc.hops.length !== ce.hops.length) continue;
      if (!sameHops(el.loc.hops.slice(0, -1), prefix)) continue;
      const h = el.loc.hops[el.loc.hops.length - 1];
      if (!seen.some((s) => s.r === h.r && s.c === h.c)) seen.push(h);
    }
    seen.sort((a, b) => a.r - b.r || a.c - b.c);
    const me = ce.hops[ce.hops.length - 1];
    const idx = seen.findIndex((s) => s.r === me.r && s.c === me.c);
    const next = seen[idx + dir];
    if (idx < 0 || !next) return false;
    const hops = [...prefix.map((h) => ({ ...h })), { r: next.r, c: next.c }];
    if (!this.enterCell(ce.anchor, hops)) return false;
    const ps = this.model.paragraphs;
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: ps.length - 1, offset: paraLength(ps[ps.length - 1]) } };
    this.refreshSelection();
    return true;
  }
  /** Mudou só a apresentação (zoom, tema, marcas, proteção): com o motor o
   *  layout continua válido — refaz canvases e pintura, sem diagramar. */
  refreshView() {
    if (!this.eng || !this.engineActive()) {
      this.refresh();
      return;
    }
    this.rebuildCanvases();
    if (this.view === "read") this.applyReadSpread();
    else for (const c of this.canvases) if (c.style.display === "none") c.style.display = "";
    this.engPageCache.clear();
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Só a seleção/caret mudou: repinta sem refazer o layout (o do motor custa). */
  refreshSelection() {
    if (!this.eng) {
      this.refresh();
      return;
    }
    this.paint();
    this.positionProxy();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Arrastar/redimensionar objeto no layout do motor: a âncora passa a ser
   *  relativa à PÁGINA com a posição exibida (o motor lê wp:positionH/V). */
  moveAnchorTo(obj, x, y) {
    const a = obj.anchor;
    if (!a) return;
    if (a.simplePos) {
      a.simplePos = { x: Math.round(x), y: Math.round(y) };
      return;
    }
    a.posH = { relativeFrom: "page", offset: Math.round(x) };
    a.posV = { relativeFrom: "page", offset: Math.round(y) };
  }
  // ───────────────────────── pintura ─────────────────────────
  refresh() {
    this.layout();
    this.rebuildCanvases();
    if (this.view === "read") this.applyReadSpread();
    else for (const c of this.canvases) if (c.style.display === "none") c.style.display = "";
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Mantém a textarea-proxy JUNTO AO CARET: o browser rola o elemento
   *  focado para a vista ao digitar — se a proxy ficasse no fim do
   *  documento, digitar saltava a rolagem para o final. De quebra, o
   *  popup de IME aparece na posição certa. */
  positionProxy() {
    const line = this.lineOf(this.selection.focus);
    const canvas = line ? this.canvases[line.page] : void 0;
    if (!line || !canvas) {
      this.input.style.top = "0px";
      this.input.style.left = "0px";
      return;
    }
    const scale = PX_PER_TWIP * this.zoom;
    const x = canvas.offsetLeft + this.caretX(this.selection.focus, line) * scale;
    const y = canvas.offsetTop + line.yTwips * scale;
    this.input.style.left = `${Math.round(x)}px`;
    this.input.style.top = `${Math.round(y)}px`;
    this.input.style.height = `${Math.max(8, Math.round(line.heightTwips * scale))}px`;
  }
  rebuildCanvases() {
    if (!this.model) return;
    const s = this.sect();
    const dpr = window.devicePixelRatio || 1;
    const cssScale = PX_PER_TWIP * this.zoom;
    const isPaged = this.view === "print" || this.view === "read";
    const widthT = this.view === "web" ? this.contentWidthTwips() + 1200 : s.pageWidthTwips;
    const heightT = isPaged ? s.pageHeightTwips : Math.max(this.continuousHeight, 3e3);
    const count = isPaged ? this.pageCount : this.tileHeights.length;
    const cssOf = (i) => {
      let w = widthT, h = heightT;
      const ep = this.eng?.result.pages[i];
      if (!isPaged) {
        h = this.tileHeights[i] ?? heightT;
      } else if (ep) {
        w = ep.widthTw;
        h = ep.heightTw;
      } else if (isPaged && this.hfEdit && this.savedBody) {
        const sp = this.sectPrForSavedPage(i);
        w = sp.pageWidthTwips;
        h = sp.pageHeightTwips;
      } else if (isPaged && this.sectionStarts.length > 0) {
        const sp = this.sectPrAt(this.pageSections[i] ?? 0);
        w = sp.pageWidthTwips;
        h = sp.pageHeightTwips;
      }
      return { wPx: `${Math.round(w * cssScale)}px`, hPx: `${Math.round(h * cssScale)}px` };
    };
    const sameCount = this.canvases.length === count;
    const sameSizes = sameCount && this.canvases.every((c, i) => {
      const { wPx, hPx } = cssOf(i);
      return c.style.width === wPx && c.style.height === hPx;
    });
    if (sameCount && sameSizes) {
      for (const i of this.allocatedPages) {
        const c = this.canvases[i];
        if (c) {
          c.width = 1;
          c.height = 1;
        }
      }
      this.allocatedPages.clear();
      void dpr;
      return;
    }
    this.container.replaceChildren();
    this.canvases = [];
    this.allocatedPages.clear();
    this.engPageCache.clear();
    for (let i = 0; i < count; i++) {
      const { wPx, hPx } = cssOf(i);
      const c = document.createElement("canvas");
      c.className = "page";
      c.width = 1;
      c.height = 1;
      c.style.width = wPx;
      c.style.height = hPx;
      this.container.append(c);
      this.canvases.push(c);
    }
    void dpr;
  }
  /** Páginas com buffer alocado e pintado (virtualização para zoom alto). */
  allocatedPages = /* @__PURE__ */ new Set();
  scrollPaintQueued = false;
  /** Fator de buffer: dpr, limitado para o canvas não passar de 4096px. */
  bufferScaleFor(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = parseFloat(canvas.style.width) || 794;
    const cssH = parseFloat(canvas.style.height) || 1123;
    const MAX_DIM = 16384, MAX_AREA = 16384 * 16384;
    return Math.min(dpr, MAX_DIM / cssW, MAX_DIM / cssH, Math.sqrt(MAX_AREA / (cssW * cssH)));
  }
  /** Pinta a CAMADA de header/footer/notas — chamada ANTES do corpo, para que
   *  conteúdo behindDoc (capa full-bleed, barras) fique ATRÁS do texto e os
   *  campos do corpo por cima. O HF que não está em foco fica esmaecido. */
  paintHfLayer(ctxs, scales, dpr) {
    const fullDoc = this.fullDoc;
    if (!(this.view === "print" && fullDoc && !this.hfEdit)) return;
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg];
      const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
      const section = this.sectionStarts[sIdx]?.section ?? fullDoc.sections[0];
      const sp = this.sectPrAt(sIdx);
      const grey = this.pageDark ? "#9aa0a6" : "#555";
      if (section) {
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        const header2 = pg === 0 && sp.titlePg ? section.headers.first : section.headers.default;
        if (header2?.length && !this.hfCapturing) {
          ctx.save();
          ctx.globalAlpha = this.printRender ? 1 : HF_DIM_ALPHA;
          this.paintHf(ctx, scale, header2, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, grey, sp);
          ctx.restore();
        }
        const footer2 = pg === 0 && sp.titlePg ? section.footers.first : section.footers.default;
        if (footer2?.length && !this.hfCapturing) {
          const fTop = sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(footer2, colW);
          ctx.save();
          ctx.globalAlpha = this.printRender ? 1 : HF_DIM_ALPHA;
          this.paintHf(ctx, scale, footer2, sp.marginLeftTwips, fTop, colW, pg, grey, sp);
          ctx.restore();
        }
      }
      if (sp.cols?.sep && sp.cols.count > 1) {
        const cc = this.colContentOnPage(pg, sp);
        if (cc) {
          ctx.strokeStyle = this.pageDark ? "#5f6368" : "#bdbdbd";
          ctx.lineWidth = Math.max(1, dpr * 0.75);
          for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(xs, sp.marginTopTwips * scale);
            ctx.lineTo(xs, cc.maxBottom * scale);
            ctx.stroke();
          }
        }
      }
      const hits = this.footnoteHits.filter((h) => h.page === pg);
      if (hits.length && fullDoc.footnotes.size) {
        let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
        ctx.strokeStyle = grey;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.beginPath();
        ctx.moveTo(sp.marginLeftTwips * scale, fy * scale);
        ctx.lineTo((sp.marginLeftTwips + 2880) * scale, fy * scale);
        ctx.stroke();
        fy += 220;
        ctx.font = `400 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
        ctx.fillStyle = this.pageDark ? "#c0c4c9" : "#333";
        for (const h of hits) {
          const paras = fullDoc.footnotes.get(h.id);
          const text = paras?.map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim() ?? "";
          ctx.fillText(`${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips * scale, fy * scale);
          fy += 240;
        }
      }
    }
  }
  /** Garante buffer+pintura das páginas visíveis (e vizinhas); libera longe. */
  ensureVisiblePainted() {
    if (this.canvases.length === 0) return;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop - viewH;
    const viewBottom = this.scrollTop + viewH * 2;
    const need = /* @__PURE__ */ new Set();
    this.canvases.forEach((c, i) => {
      if (c.style.display === "none") return;
      const top = c.offsetTop;
      const bottom = top + c.offsetHeight;
      if (bottom >= viewTop && top <= viewBottom) need.add(i);
    });
    let dirty = false;
    for (const i of need) {
      if (!this.allocatedPages.has(i)) {
        const c = this.canvases[i];
        const bs = this.bufferScaleFor(c);
        c.width = Math.round(parseFloat(c.style.width) * bs);
        c.height = Math.round(parseFloat(c.style.height) * bs);
        this.allocatedPages.add(i);
        dirty = true;
      }
    }
    for (const i of [...this.allocatedPages]) {
      if (!need.has(i)) {
        const c = this.canvases[i];
        const top = c.offsetTop;
        if (top > viewBottom + viewH * 3 || top + c.offsetHeight < viewTop - viewH * 3) {
          c.width = 1;
          c.height = 1;
          this.allocatedPages.delete(i);
        }
      }
    }
    if (dirty) this.paint(need);
  }
  paint(filter) {
    if (!this.model || this.canvases.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const active = filter ?? this.allocatedPages;
    if (active.size === 0) return;
    if (this.eng) {
      this.paintEngine(active);
      return;
    }
    const sel = normalizeRange(this.range());
    const hasSel = this.hasSelection();
    const pageBg = this.pageDark ? "#1e1e1e" : "#ffffff";
    const scales = [];
    const ctxs = this.canvases.map((c, i) => {
      if (!active.has(i) || c.width <= 1) {
        scales.push(0);
        return null;
      }
      const bs = c.width / (parseFloat(c.style.width) || c.width);
      scales.push(PX_PER_TWIP * this.zoom * bs);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, c.width, c.height);
      if (!this.hfCapturing) {
        ctx.fillStyle = pageBg;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      if (this.tbEdit && (this.tbBgSnapshots[i]?.width ?? 0) > 1) {
        ctx.save();
        ctx.globalAlpha = HF_DIM_ALPHA;
        ctx.drawImage(this.tbBgSnapshots[i], 0, 0);
        ctx.restore();
      }
      return ctx;
    });
    const pgOf = (p) => Math.min(p, ctxs.length - 1);
    if (this.tbEdit) {
      const tp = pgOf(this.tbEdit.pageIdx);
      const ctxT = ctxs[tp];
      const snap = this.tbBgSnapshots[tp];
      if (ctxT) {
        const scale = scales[tp];
        const r = this.tbEdit.rectTwips;
        const pad2 = 3 * dpr;
        const bx = r.x * scale - pad2, by = r.y * scale - pad2;
        const bw = r.w * scale + 2 * pad2, bh = Math.max(r.h, 1) * scale + 2 * pad2;
        ctxT.save();
        ctxT.beginPath();
        ctxT.rect(bx, by, bw, bh);
        ctxT.clip();
        ctxT.fillStyle = pageBg;
        ctxT.fillRect(bx, by, bw, bh);
        if ((snap?.width ?? 0) > 1) ctxT.drawImage(snap, 0, 0);
        ctxT.restore();
      }
    }
    if (this.hfEdit && !this.tbEdit) this.paintHfEditCompose(ctxs, scales, dpr);
    if (!this.tbEdit && !this.hfEdit) this.paintHfLayer(ctxs, scales, dpr);
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const pg = pgOf(line.page);
        const ctx = ctxs[pg];
        if (ctx) this.paintLine(ctx, pl, line, scales[pg], sel, hasSel);
      }
    }
    const ink = this.pageDark ? "#e8eaed" : "#000";
    const gridColor = this.pageDark ? "#5f6368" : "#666";
    for (const tl of this.tableLayouts) {
      const tpg = pgOf(tl.page);
      const ctx = ctxs[tpg];
      if (!ctx) continue;
      const scale = scales[tpg];
      for (const sh of tl.cellShades) {
        ctx.fillStyle = this.inkColor(sh.hex);
        ctx.fillRect((tl.xTwips + sh.xTwips) * scale, (tl.yTwips + sh.yTwips) * scale, sh.wTwips * scale, sh.hTwips * scale);
      }
      const strokeEdge = (edge, ax, ay, bx, by) => {
        if (!edge) return;
        ctx.strokeStyle = edge.color ? this.inkColor(edge.color) : ink;
        ctx.lineWidth = Math.max(dpr * 0.75, edge.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
        if (edge.style === "dashed") ctx.setLineDash([6 * dpr, 4 * dpr]);
        else if (edge.style === "dotted") ctx.setLineDash([2 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo((tl.xTwips + ax) * scale, (tl.yTwips + ay) * scale);
        ctx.lineTo((tl.xTwips + bx) * scale, (tl.yTwips + by) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (const cr of tl.cellRects) {
        strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
        strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
        strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
        strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
      }
      void gridColor;
      for (const cl of tl.cellLines) {
        const fontPx = deviceEmPt(cl.sizePt) * TWIPS_PER_PT * scale;
        ctx.font = `${cl.italic ? "italic " : ""}${cl.bold ? "700" : "400"} ${fontPx}px ${cl.family ?? DEFAULT_FONT}`;
        ctx.fillStyle = cl.color ? this.inkColor(cl.color) : ink;
        const bx = (tl.xTwips + cl.xTwips) * scale;
        const by = (tl.yTwips + cl.yTwips) * scale;
        ctx.fillText(cl.text, bx, by);
        if (cl.underline || cl.strike) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(1, fontPx / 16);
          const w = ctx.measureText(cl.text).width;
          const yo = cl.underline ? fontPx * 0.12 : -fontPx * 0.28;
          ctx.beginPath();
          ctx.moveTo(bx, by + yo);
          ctx.lineTo(bx + w, by + yo);
          ctx.stroke();
        }
      }
    }
    for (const dc of this.dropCapFloats) {
      const dpg = pgOf(dc.page);
      const ctx = ctxs[dpg];
      if (!ctx) continue;
      const scale = scales[dpg];
      ctx.font = `${dc.italic ? "italic " : ""}${dc.bold ? "700" : "400"} ${deviceEmPt(dc.sizePt) * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.inkColor(dc.color);
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * TWIPS_PER_PT;
      ctx.fillText(dc.text, dc.xTwips * scale, baseline * scale);
    }
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const fpg = pgOf(first.page);
      const ctx = ctxs[fpg];
      if (!ctx) continue;
      const scale = scales[fpg];
      const img = f.run.image;
      const bmp = this.bitmapFor(img);
      const x = (first.xTwips + (img.offsetXTwips ?? 0)) * scale;
      const yPx = (first.yTwips + (img.offsetYTwips ?? 0)) * scale;
      if (bmp) ctx.drawImage(bmp, x, yPx, img.widthTwips * scale, img.heightTwips * scale);
    }
    if (!this.hfEdit && !this.tbEdit && this.model) {
      const inkTb = this.pageDark ? "#e3e3e3" : "#1f1f1f";
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const fpg = pgOf(first.page);
        const ctx = ctxs[fpg];
        if (!ctx) return;
        const scale = scales[fpg];
        const sp = this.sectPrAt(this.pageSections[fpg] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          if (r === this.tbSnapshotSuppress) continue;
          const { x, y } = r.textbox.floating ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp) : { x: sp.marginLeftTwips, y: first.yTwips };
          {
            const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.paintHf(ctx, scale, r.textbox.paras, iw.x, iw.y, iw.w, fpg, inkTb, sp);
          }
        }
      });
    }
    this.paintFloatAndCaret(ctxs, scales, dpr, hasSel);
  }
  /** Alças do objeto flutuante selecionado + caret (os dois layouts). */
  paintFloatAndCaret(ctxs, scales, dpr, hasSel) {
    const pgOf = (p) => Math.min(p, ctxs.length - 1);
    if (this.floatSel || this.tbEdit) {
      const h = this.activeFloat();
      if (h) {
        const pg = pgOf(h.page);
        const ctx = ctxs[pg];
        if (ctx) {
          const scale = scales[pg];
          const x = h.rect.x * scale, y = h.rect.y * scale;
          const w = h.rect.w * scale, hh = h.rect.h * scale;
          ctx.save();
          ctx.strokeStyle = "#2b579a";
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = Math.max(1, dpr);
          ctx.strokeRect(x, y, w, hh);
          ctx.setLineDash([]);
          const hs = 6 * dpr;
          const pts = [
            [x, y],
            [x + w / 2, y],
            [x + w, y],
            [x + w, y + hh / 2],
            [x + w, y + hh],
            [x + w / 2, y + hh],
            [x, y + hh],
            [x, y + hh / 2]
          ];
          ctx.fillStyle = "#ffffff";
          for (const [px, py] of pts) {
            ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
            ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
          }
          ctx.restore();
        }
      }
    }
    if (this.caretVisible && !this.printRender && this.view !== "read" && !hasSel) {
      const line = this.lineOf(this.selection.focus);
      if (line) {
        const cpg = pgOf(line.page);
        const ctx = ctxs[cpg];
        if (ctx) {
          const scale = scales[cpg];
          const x = this.caretX(this.selection.focus, line) * scale;
          ctx.fillStyle = this.pageDark ? "#e8eaed" : "#000";
          ctx.fillRect(x, line.yTwips * scale, Math.max(1, dpr), line.heightTwips * scale);
        }
      }
    }
  }
  paintLine(ctx, pl, line, scale, sel, hasSel) {
    const para = this.model.paragraphs[line.para];
    const st = this.styleOf(para);
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const marginL = this.view === "print" || this.view === "read" ? s.marginLeftTwips : 600;
      const colX = marginL + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      if (effShading) {
        const bd = effBorders;
        const isFirstL = line.rich.start === 0;
        const isLastL = line.rich.end === pl.charAdvances.length;
        const exL = (bd?.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const exR = (bd?.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const exT = isFirstL ? (bd?.top?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        const exB = isLastL ? (bd?.bottom?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        ctx.fillStyle = this.inkColor(effShading);
        ctx.fillRect(
          (colX - exL) * scale,
          (line.yTwips - exT) * scale,
          (colW + exL + exR) * scale,
          (line.heightTwips + exT + exB) * scale
        );
      }
      if (effBorders || para.props.boxBorder) {
        const isFirst = line.rich.start === 0;
        const isLast = line.rich.end === pl.charAdvances.length;
        const fallback = para.props.boxBorder && !effBorders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
        const b = effBorders ?? {
          top: fallback,
          bottom: fallback,
          left: fallback,
          right: fallback
        };
        const stroke = (e, ax, ay, bx, by) => {
          if (!e) return;
          ctx.strokeStyle = e.color ? `#${e.color}` : this.pageDark ? "#e8eaed" : "#000";
          ctx.lineWidth = Math.max(1, e.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
          if (e.style === "dashed") ctx.setLineDash([8, 5]);
          else if (e.style === "dotted") ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const spL = (b.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const spR = (b.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const spT = (b.top?.spacePt ?? 0) * TWIPS_PER_PT;
        const spB = (b.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
        const x0 = (colX - spL) * scale;
        const x1 = (colX + colW + spR) * scale;
        const y0 = (line.yTwips - (isFirst ? spT : 0)) * scale;
        const y1 = (line.yTwips + line.heightTwips + (isLast ? spB : 0)) * scale;
        stroke(b.left, x0, y0, x0, y1);
        stroke(b.right, x1, y0, x1, y1);
        if (isFirst) stroke(b.top, x0, y0, x1, y0);
        if (isLast) stroke(b.bottom, x0, y1, x1, y1);
      }
    }
    if (hasSel && line.para >= sel.start.para && line.para <= sel.end.para) {
      const from = Math.max(line.rich.start, line.para === sel.start.para ? sel.start.offset : 0);
      const to = Math.min(line.rich.end, line.para === sel.end.para ? sel.end.offset : line.rich.end);
      if (to > from) {
        const x1 = this.caretX({ para: line.para, offset: from }, line);
        const x2 = this.caretX({ para: line.para, offset: to }, line);
        ctx.fillStyle = "rgba(58,114,196,0.35)";
        ctx.fillRect(x1 * scale, line.yTwips * scale, (x2 - x1) * scale, line.heightTwips * scale);
      }
    }
    if (line.marker) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.pageDark ? "#e8eaed" : "#000";
      ctx.fillText(line.marker.text, line.marker.xTwips * scale, line.baselineTwips * scale);
    }
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex];
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const family2 = this.familyFor(span.family);
        const fontPx2 = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
        const variant2 = span.variant;
        ctx.font = `${variant2 === "italic" || variant2 === "boldItalic" ? "italic " : ""}${variant2 === "bold" || variant2 === "boldItalic" ? "700" : "400"} ${fontPx2}px ${family2}`;
        const ink = this.inkColor(props?.color ?? st?.color);
        ctx.fillStyle = ink;
        const globalStart2 = pl.spanCharStart[seg.spanIndex] + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart2 + i];
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const font = this.fonts.resolve(span.family, variant2);
        const measureText = (text) => {
          const chars = Array.from(text);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i].codePointAt(0);
            width += font.advanceTwips(cp, span.sizePt);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== void 0) width += font.kernTwips(cp, next, span.sizePt);
          }
          return width;
        };
        if (renderer?.draw) {
          const drawContext = {
            data: run.custom.data,
            fallbackText,
            props: run.props,
            sizePt: span.sizePt,
            measureText,
            ctx,
            xTwips: x,
            yTwips: line.yTwips,
            baselineTwips: line.baselineTwips,
            widthTwips,
            heightTwips: line.heightTwips,
            scale,
            dark: this.pageDark,
            color: ink
          };
          renderer.draw(drawContext);
        } else {
          ctx.fillText(fallbackText, x * scale, line.baselineTwips * scale);
        }
        x += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        const bmp = this.bitmapFor(img);
        const wPx = img.widthTwips * scale;
        const hPx = img.heightTwips * scale;
        const yPx = (line.baselineTwips - img.heightTwips) * scale;
        if (bmp) ctx.drawImage(bmp, x * scale, yPx, wPx, hPx);
        else {
          ctx.strokeStyle = "#bbb";
          ctx.strokeRect(x * scale, yPx, wPx, hPx);
        }
        x += img.widthTwips;
        continue;
      }
      const family = this.familyFor(span.family);
      const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
      const variant = span.variant;
      ctx.font = `${variant === "italic" || variant === "boldItalic" ? "italic " : ""}${variant === "bold" || variant === "boldItalic" ? "700" : "400"} ${fontPx}px ${family}`;
      const color = props?.color ?? st?.color;
      ctx.fillStyle = this.inkColor(color);
      const baseShift = props?.vertAlign === "superscript" ? -span.sizePt * 0.35 * TWIPS_PER_PT : props?.vertAlign === "subscript" ? span.sizePt * 0.14 * TWIPS_PER_PT : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex] + seg.start;
      const segX0 = x;
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i];
        let a = pl.charAdvances[gi];
        if (line.justifyExtraPerSpace && ch === " ") a += line.justifyExtraPerSpace;
        if (props?.highlight) {
          ctx.save();
          const hl = HIGHLIGHTS2[props.highlight] ?? "#ffff00";
          ctx.fillStyle = this.inkColor(hl.slice(1));
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (run?.field && !this.printRender) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (props?.commentIds?.length && !this.printRender) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 187, 0, 0.28)";
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (ch === "	" && pl.tabLeaders?.get(gi)) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? "#9aa0a6" : "#666";
          const dotFont = `400 ${span.sizePt * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
          ctx.font = dotFont;
          const step = 90;
          for (let dx = 60; dx < a - 40; dx += step) {
            ctx.fillText(".", (x + dx) * scale, (line.baselineTwips + baseShift) * scale);
          }
          ctx.restore();
        }
        if (ch !== " " || this.showMarks) {
          const shown = this.showMarks && ch === " " ? "\xB7" : ch;
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          ctx.fillText(shown, xSnap * scale, (line.baselineTwips + baseShift) * scale);
        }
        x += a;
      }
      const effUnderline = props?.underline || st?.underline;
      const effStrike = props?.strike || st?.strike;
      if (effUnderline || effStrike || props?.doubleStrike) {
        ctx.strokeStyle = ctx.fillStyle;
        const w = x - segX0;
        const baseW = Math.max(1, fontPx / 16);
        const drawLine = (yOff, lw, dash = []) => {
          ctx.lineWidth = lw;
          ctx.setLineDash(dash);
          ctx.beginPath();
          ctx.moveTo(segX0 * scale, (line.baselineTwips + yOff) * scale);
          ctx.lineTo((segX0 + w) * scale, (line.baselineTwips + yOff) * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const drawWave = (yOff, lw) => {
          ctx.lineWidth = lw;
          ctx.beginPath();
          const amp = 0.6 * baseW;
          const period = Math.max(4, fontPx / 6);
          for (let px = 0; px <= w * scale; px += 1) {
            const yy = (line.baselineTwips + yOff) * scale + Math.sin(px / period * Math.PI * 2) * amp;
            if (px === 0) ctx.moveTo(segX0 * scale, yy);
            else ctx.lineTo(segX0 * scale + px, yy);
          }
          ctx.stroke();
        };
        if (effUnderline) {
          ctx.strokeStyle = props?.underlineColor ? this.inkColor(props.underlineColor) : ctx.fillStyle;
          const yU = 40;
          switch (props?.underlineStyle) {
            case "double":
              drawLine(yU, baseW);
              drawLine(yU + baseW * 2.4, baseW);
              break;
            case "thick":
              drawLine(yU + baseW, baseW * 2.2);
              break;
            case "dotted":
              drawLine(yU, baseW, [baseW, baseW * 1.6]);
              break;
            case "dash":
              drawLine(yU, baseW, [baseW * 4, baseW * 2.5]);
              break;
            case "wave":
              drawWave(yU, baseW);
              break;
            default:
              drawLine(yU, baseW);
          }
          ctx.strokeStyle = ctx.fillStyle;
        }
        if (effStrike) drawLine(-span.sizePt * 0.25 * TWIPS_PER_PT, baseW);
        if (props?.doubleStrike) {
          const yS = -span.sizePt * 0.25 * TWIPS_PER_PT;
          drawLine(yS - baseW * 1.3, baseW);
          drawLine(yS + baseW * 1.3, baseW);
        }
      }
    }
    if (this.showMarks && line.rich.end === pl.charAdvances.length) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = "#888";
      ctx.fillText("\xB6", (x + 20) * scale, line.baselineTwips * scale);
    }
  }
  // ───────────────────────── exportação para PDF ─────────────────────────
  pdfImgCache = /* @__PURE__ */ new WeakMap();
  pdfColor(hex) {
    return hex ? hexColor(hex) : [0, 0, 0];
  }
  /**
   * Gera o PDF pelo motor de layout do Word (@universal-office/docx-layout —
   * o mesmo validado contra os PDFs do Word no corpus e no oráculo): o
   * documento ATUAL (com as edições) é serializado, diagramado e pintado.
   * Fontes: as que o editor já resolveu (arquivo da fonte; sem licença de
   * incorporação, a substituta métrico-compatível), embutidas no documento e as
   * que o motor pedir na 1ª passada (tema, padrão, substitutas do Word).
   * Se o motor falhar, cai no PDF do layout do canvas (exportPdfCanvas).
   */
  async exportPdf() {
    if (!this.model || !this.fonts) throw new Error("document not loaded");
    try {
      return await this.exportPdfEngine();
    } catch (e) {
      console.warn("[universal-write] motor de layout falhou no PDF; usando o layout do canvas", e);
      return this.exportPdfCanvas();
    }
  }
  async exportPdfEngine() {
    await this.settleDocumentFonts();
    await this.preparePdfFonts();
    const pristine = this.editsSinceLoad === 0 && !!this.loadedBytes;
    const pkg = pristine ? DocxPackage.load(this.loadedBytes) : this.pkg;
    if (!pristine) this.syncRunRPr(this.model.paragraphs);
    const full = pristine ? readFullDocument(pkg) : this.liveEngineDoc().full;
    let embedded = [];
    try {
      embedded = pkg ? readEmbeddedFonts(pkg) : [];
    } catch {
    }
    try {
      await loadHyphenation(hyphenationLangs(full));
    } catch {
    }
    const layout = () => {
      const prov = withEmbeddedFonts(this.engineFontProvider(missing), embedded, (b) => new SfntFont(b));
      return layoutDocument(full, prov, ENGINE_LAYOUT_OPTS);
    };
    const missing = /* @__PURE__ */ new Map();
    let res = layout();
    if (missing.size && await this.loadEngineFonts(missing)) {
      missing.clear();
      res = layout();
    }
    return renderPdf(res);
  }
  /** Provedor de faces do motor sobre o Registry do editor (só faces com ARQUIVO).
   *  Cada face guarda a família CSS (FontFace carregada) que o canvas usa. */
  engineFontProvider(missing, cache = /* @__PURE__ */ new Map()) {
    const note = (family, v) => {
      let s = missing.get(family);
      if (!s) missing.set(family, s = /* @__PURE__ */ new Set());
      s.add(v);
    };
    return {
      face: (family, bold, italic) => {
        const key = `${family}|${bold ? 1 : 0}${italic ? 1 : 0}`;
        if (cache.has(key)) return cache.get(key);
        const want = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
        let out = null;
        const set = this.fonts.get(family);
        if (!set) note(family, want);
        else {
          if (!set[want]) note(family, want);
          for (const v of [want, bold ? "bold" : "regular", italic ? "italic" : "regular", "regular"]) {
            let font = set[v];
            if (!font) continue;
            let file = this.fontFiles.get(font);
            let fam = family;
            if (!file) {
              const sub = METRIC_SUBSTITUTES[family.toLowerCase()];
              const ss = sub ? this.fonts.get(sub) : void 0;
              const f2 = ss?.[v] ?? ss?.regular;
              const file2 = f2 ? this.fontFiles.get(f2) : void 0;
              if (!f2 || !file2) {
                if (sub) note(family, v);
                continue;
              }
              font = f2;
              file = file2;
              fam = sub;
            }
            const vb = v === "bold" || v === "boldItalic", vi = v === "italic" || v === "boldItalic";
            out = {
              key: `${fam}|${v}`,
              family: fam,
              font,
              bytes: file.bytes,
              bold,
              italic,
              ...bold && !vb ? { synthBold: true } : {},
              ...italic && !vi ? { synthItalic: true } : {}
            };
            const css = file.name === DEFAULT_FONT ? DEFAULT_FONT_CSS : `${cssFamily(file.name)}, ${DEFAULT_FONT_CSS}`;
            this.engFaceCss.set(out, { family: css, weight: vb ? 700 : 400, italic: vi });
            break;
          }
        }
        cache.set(key, out);
        return out;
      }
    };
  }
  /** Resolve (com arquivo) as famílias/variantes que o motor pediu; true se algo mudou. */
  async loadEngineFonts(missing) {
    const families = [...missing.keys()].filter((f) => !this.loadedFamilyNames.has(f));
    if (!families.length) return false;
    await this.fontResolver.resolveWithFile(families);
    await Promise.all(families.flatMap((f) => {
      const r = this.fontResolver.getWithFile(f);
      return r ? [...missing.get(f)].filter((v) => !r.faces[v]).map((v) => this.fontResolver.loadFace(r, v)) : [];
    }));
    let changed = false;
    for (const f of families) {
      this.appliedFonts.delete(f);
      if (this.applyResolvedFont(f)) changed = true;
    }
    if (changed) await this.preparePdfFonts();
    return changed;
  }
  /**
   * PDF a partir do layout do CANVAS (layoutCache, tabelas, imagens) — o
   * caminho antigo, mantido como reserva do motor. Cada glifo é posicionado
   * onde o editor o desenha.
   */
  async exportPdfCanvas() {
    if (!this.eng) return this.exportPdfCanvasLegacy();
    if (this.cellEdit) this.exitCell();
    this.forceLegacy++;
    try {
      this.layout();
      return await this.exportPdfCanvasLegacy();
    } finally {
      this.forceLegacy--;
      this.refresh();
    }
  }
  async exportPdfCanvasLegacy() {
    if (!this.model || !this.fonts) throw new Error("document not loaded");
    await this.ensureImagesDecoded();
    const T2 = TWIPS_PER_PT;
    const doc = new PdfDocument({ compress: true });
    this.pdfImgCache = /* @__PURE__ */ new WeakMap();
    await this.settleDocumentFonts();
    await this.preparePdfFonts();
    const cache = /* @__PURE__ */ new Map();
    const emb = (family, variant) => {
      let sf = this.fonts.resolve(family, variant);
      let file = this.fontFiles.get(sf);
      if (!file) {
        const sub = family ? METRIC_SUBSTITUTES[family.toLowerCase()] : void 0;
        sf = this.fonts.resolve(sub && this.fonts.get(sub) ? sub : DEFAULT_FONT, variant);
        file = this.fontFiles.get(sf);
      }
      let e = cache.get(sf);
      if (!e) {
        if (!file) throw new Error("font has no bytes to embed in the PDF");
        const { name, bytes } = file;
        e = doc.embedFont(`${name}-${variant}`, bytes, {
          unitsPerEm: sf.metrics.unitsPerEm,
          ascender: sf.metrics.ascender,
          descender: sf.metrics.descender,
          glyphId: (cp) => sf.glyphId(cp),
          advanceWidth: (g) => sf.advanceWidth(g)
        });
        cache.set(sf, e);
      }
      return e;
    };
    const pages = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push(doc.addPage(sp.pageWidthTwips / T2, sp.pageHeightTwips / T2));
    }
    if (this.view === "print" && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg];
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (section) {
          const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
          const header = pg === 0 && sp.titlePg ? section.headers.first : section.headers.default;
          if (header?.length) this.pdfPaintHf(doc, page, emb, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, sp);
          const footer = pg === 0 && sp.titlePg ? section.footers.first : section.footers.default;
          if (footer?.length) this.pdfPaintHf(doc, page, emb, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg, sp);
        }
        if (sp.cols?.sep && sp.cols.count > 1) {
          const cc = this.colContentOnPage(pg, sp);
          if (cc) for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) / T2;
            page.line(xs, sp.marginTopTwips / T2, xs, cc.maxBottom / T2, [0.74, 0.74, 0.74], 0.6);
          }
        }
        const hits = this.footnoteHits.filter((h) => h.page === pg);
        if (hits.length && this.fullDoc.footnotes.size) {
          let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
          page.line(sp.marginLeftTwips / T2, fy / T2, (sp.marginLeftTwips + 2880) / T2, fy / T2, [0.33, 0.33, 0.33], 0.75);
          fy += 220;
          for (const h of hits) {
            const paras = this.fullDoc.footnotes.get(h.id);
            const text = paras?.map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim() ?? "";
            this.pdfGlyphsAt(page, emb, DEFAULT_FONT, "regular", 9, [0.2, 0.2, 0.2], `${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips, fy);
            fy += 240;
          }
        }
      }
    }
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const page = pages[line.page];
        if (page) this.pdfPaintLine(doc, page, emb, pl, line);
      }
    }
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (page) this.pdfPaintTable(doc, page, emb, tl);
    }
    for (const dc of this.dropCapFloats) {
      const page = pages[dc.page];
      if (!page) continue;
      const variant = dc.bold && dc.italic ? "boldItalic" : dc.bold ? "bold" : dc.italic ? "italic" : "regular";
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * T2;
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, variant, dc.sizePt, this.pdfColor(dc.color), dc.text, dc.xTwips, baseline);
    }
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const page = pages[first.page];
      if (!page) continue;
      const img = f.run.image;
      this.pdfImage(
        doc,
        page,
        img,
        (first.xTwips + (img.offsetXTwips ?? 0)) / T2,
        (first.yTwips + (img.offsetYTwips ?? 0)) / T2,
        img.widthTwips / T2,
        img.heightTwips / T2
      );
    }
    if (this.model) {
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const page = pages[first.page];
        if (!page) return;
        const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          const { x, y } = r.textbox.floating ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp) : { x: sp.marginLeftTwips, y: first.yTwips };
          {
            const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, first.page, sp);
          }
        }
      });
    }
    return doc.build();
  }
  /**
   * Exporta XPS reaproveitando o layout. Texto vai como <Glyphs UnicodeString>
   * (o leitor shape via CMap da fonte). Bordas/sombreado de tabela e imagens
   * ficam para uma versão futura — o foco aqui é texto + paginação corretos.
   */
  exportXps() {
    return this.withLegacyLayout(() => this.exportXpsLegacy());
  }
  exportXpsLegacy() {
    if (!this.model || !this.fonts) throw new Error("document not loaded");
    const T2 = TWIPS_PER_PT;
    const pages = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push({
        widthPt: sp.pageWidthTwips / T2,
        heightPt: sp.pageHeightTwips / T2,
        fills: [],
        lines: [],
        glyphs: []
      });
    }
    const famOf = (family) => this.fileFamilyFor(family);
    const colorOf3 = (hex) => {
      if (!hex) return [0.13, 0.13, 0.13];
      const n = parseInt(hex, 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    };
    const emitParaLine = (page, pl, line, runs) => {
      const baselinePt = line.baselineTwips / T2;
      for (const seg of line.rich.segments) {
        const span = pl.spans[seg.spanIndex];
        const run = runs[span?.runIndex ?? seg.spanIndex];
        if (!span) continue;
        const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
        const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
        if (!txt.trim()) continue;
        page.glyphs.push({
          text: txt,
          xPt: (line.xTwips + seg.xTwips) / T2,
          baselinePt,
          fontFamily: famOf(span.family),
          variant: span.variant === "boldItalic" ? "boldItalic" : span.variant === "bold" ? "bold" : span.variant === "italic" ? "italic" : "regular",
          sizePt: span.sizePt,
          colorRgb: colorOf3(run?.props.color)
        });
        if (run?.props.underline) {
          const w = Math.max(0.3, span.sizePt * 0.07);
          page.lines.push({
            ax: (line.xTwips + seg.xTwips) / T2,
            ay: baselinePt + span.sizePt * 0.13,
            bx: (line.xTwips + seg.xTwips + seg.widthTwips) / T2,
            by: baselinePt + span.sizePt * 0.13,
            widthPt: w,
            colorRgb: colorOf3(run.props.color)
          });
        }
      }
    };
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const para = this.model.paragraphs[line.para];
        if (!para) continue;
        const page = pages[line.page];
        if (page) emitParaLine(page, pl, line, para.runs);
      }
    }
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (!page) continue;
      for (const sh of tl.cellShades) {
        page.fills.push({
          xPt: (tl.xTwips + sh.xTwips) / T2,
          yPt: (tl.yTwips + sh.yTwips) / T2,
          wPt: sh.wTwips / T2,
          hPt: sh.hTwips / T2,
          colorRgb: colorOf3(sh.hex)
        });
      }
      for (const cr of tl.cellRects) {
        const x0 = (tl.xTwips + cr.x0) / T2;
        const y0 = (tl.yTwips + cr.y0) / T2;
        const x1 = (tl.xTwips + cr.x1) / T2;
        const y1 = (tl.yTwips + cr.y1) / T2;
        const e = (edge, ax, ay, bx, by) => {
          if (!edge) return;
          page.lines.push({
            ax,
            ay,
            bx,
            by,
            widthPt: Math.max(0.25, edge.sizeEighthPt / 8),
            colorRgb: colorOf3(edge.color)
          });
        };
        e(cr.edges.top, x0, y0, x1, y0);
        e(cr.edges.bottom, x0, y1, x1, y1);
        e(cr.edges.left, x0, y0, x0, y1);
        e(cr.edges.right, x1, y0, x1, y1);
      }
      for (const cl of tl.cellLines) {
        const variant = cl.bold && cl.italic ? "boldItalic" : cl.bold ? "bold" : cl.italic ? "italic" : "regular";
        page.glyphs.push({
          text: cl.text,
          xPt: (tl.xTwips + cl.xTwips) / T2,
          baselinePt: (tl.yTwips + cl.yTwips) / T2,
          fontFamily: famOf(cl.family),
          variant,
          sizePt: cl.sizePt,
          colorRgb: colorOf3(cl.color)
        });
        if (cl.underline) {
          const wEm = Math.max(0.3, cl.sizePt * 0.07);
          page.lines.push({
            ax: (tl.xTwips + cl.xTwips) / T2,
            ay: (tl.yTwips + cl.yTwips) / T2 + cl.sizePt * 0.13,
            bx: (tl.xTwips + cl.xTwips + cl.text.length * cl.sizePt * 0.5) / T2,
            by: (tl.yTwips + cl.yTwips) / T2 + cl.sizePt * 0.13,
            widthPt: wEm,
            colorRgb: colorOf3(cl.color)
          });
        }
      }
    }
    if (this.view === "print" && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg];
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (!section) continue;
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        const header = pg === 0 && sp.titlePg ? section.headers.first : section.headers.default;
        if (header?.length) this.xpsPaintHf(page, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg);
        const footer = pg === 0 && sp.titlePg ? section.footers.first : section.footers.default;
        if (footer?.length) this.xpsPaintHf(page, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg);
      }
    }
    return buildXps({ pages, fontBytes: this.fontBytes });
  }
  xpsPaintHf(page, paras, originXTwips, topYTwips, widthTwips, pageIdx) {
    if (!this.fonts) return;
    const T2 = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    const famOf = (family) => this.fileFamilyFor(family);
    let y = topYTwips;
    for (const p of paras) {
      const runs = p.runs.map((r) => r.field ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor()) : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text } : r);
      const spans = this.buildSpans({ runs, props: p.props });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs
      });
      const font = this.fonts.resolve(void 0, "regular");
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * T2;
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === "center") lx += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") lx += widthTwips - line.widthTwips;
        const baselinePt = (y + lh * 0.8) / T2;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          if (!span) continue;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
          const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          page.glyphs.push({
            text: txt,
            xPt: (lx + seg.xTwips) / T2,
            baselinePt,
            fontFamily: famOf(span.family),
            variant: span.variant === "boldItalic" ? "boldItalic" : span.variant === "bold" ? "bold" : span.variant === "italic" ? "italic" : "regular",
            sizePt: span.sizePt,
            colorRgb: [0.33, 0.33, 0.33]
          });
        }
        y += lh;
      }
    }
  }
  /** Coleta todas as imagens do documento (corpo, tabelas, cabeçalhos/rodapés). */
  collectImages() {
    const out = [];
    const fromParas = (paras) => {
      for (const p of paras) for (const r of p.runs) if (r.image) out.push(r.image);
    };
    const fromTable = (t) => {
      for (const row of t.rows) for (const c of row.cells) {
        fromParas(c.paragraphs);
        for (const nt of c.tables) fromTable(nt);
      }
    };
    if (this.model) fromParas(this.model.paragraphs);
    for (const a of this.tableAnchors) fromTable(a.table);
    if (this.fullDoc) for (const sec of this.fullDoc.sections) {
      for (const set of [sec.headers, sec.footers]) {
        for (const paras of Object.values(set)) if (Array.isArray(paras)) fromParas(paras);
      }
    }
    return out;
  }
  /** Garante que todas as imagens estejam decodificadas (createImageBitmap é async). */
  async ensureImagesDecoded() {
    await Promise.all(this.collectImages().map(async (img) => {
      const cached = this.bitmaps.get(img);
      if (cached && cached !== "loading") return;
      try {
        const copy = new Uint8Array(img.data);
        const bmp = await createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === "jpg" ? "jpeg" : img.ext}` }));
        this.bitmaps.set(img, bmp);
        this.imagesVersion++;
      } catch {
      }
    }));
  }
  /** Coloca os glifos de `text` em sequência usando NOSSOS advances (snap-free). */
  pdfGlyphsAt(page, emb, family, variant, sizePt, color, text, xTwips, baselineTwips) {
    const T2 = TWIPS_PER_PT;
    const sf = this.fonts.resolve(family, variant);
    const font = emb(family, variant);
    let x = xTwips;
    const placed = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      const a = sf.advanceTwips(cp, sizePt);
      if (ch !== " " && ch !== "	") {
        const { gid } = font.encode(cp);
        placed.push({ gid, codePoint: cp, xPt: x / T2, baselineFromTopPt: baselineTwips / T2 });
      }
      x += a;
    }
    page.glyphs(font, deviceEmPt(sizePt), color, placed);
  }
  /** Versão PDF do paintLine: texto + decorações de parágrafo/run. */
  pdfPaintLine(doc, page, emb, pl, line) {
    const T2 = TWIPS_PER_PT;
    const para = this.model.paragraphs[line.para];
    const st = this.styleOf(para);
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const colX = s.marginLeftTwips + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      const isFirst = line.rich.start === 0;
      const isLast = line.rich.end === pl.charAdvances.length;
      if (effShading) {
        const bd = effBorders;
        const exL = (bd?.left?.spacePt ?? 0) * T2;
        const exR = (bd?.right?.spacePt ?? 0) * T2;
        const exT = isFirst ? (bd?.top?.spacePt ?? 0) * T2 : 0;
        const exB = isLast ? (bd?.bottom?.spacePt ?? 0) * T2 : 0;
        page.fillRect(
          (colX - exL) / T2,
          (line.yTwips - exT) / T2,
          (colW + exL + exR) / T2,
          (line.heightTwips + exT + exB) / T2,
          hexColor(effShading)
        );
      }
      if (effBorders || para.props.boxBorder) {
        const fallback = para.props.boxBorder && !effBorders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
        const b = effBorders ?? { top: fallback, bottom: fallback, left: fallback, right: fallback };
        const spL = (b.left?.spacePt ?? 0) * T2, spR = (b.right?.spacePt ?? 0) * T2;
        const spT = (b.top?.spacePt ?? 0) * T2, spB = (b.bottom?.spacePt ?? 0) * T2;
        const x0 = colX - spL, x1 = colX + colW + spR;
        const y0 = line.yTwips - (isFirst ? spT : 0), y1 = line.yTwips + line.heightTwips + (isLast ? spB : 0);
        const edge = (e, ax, ay, bx, by) => {
          if (!e) return;
          const dash = e.style === "dashed" ? [6, 3.75] : e.style === "dotted" ? [1.5, 3] : void 0;
          page.line(ax / T2, ay / T2, bx / T2, by / T2, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
        };
        edge(b.left, x0, y0, x0, y1);
        edge(b.right, x1, y0, x1, y1);
        if (isFirst) edge(b.top, x0, y0, x1, y0);
        if (isLast) edge(b.bottom, x0, y1, x1, y1);
      }
    }
    if (line.marker) {
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, "regular", 11, [0, 0, 0], line.marker.text, line.marker.xTwips, line.baselineTwips);
    }
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex];
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const globalStart2 = pl.spanCharStart[seg.spanIndex] + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart2 + i];
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        this.pdfGlyphsAt(
          page,
          emb,
          span.family,
          span.variant,
          span.sizePt,
          this.pdfColor(props?.color ?? st?.color),
          fallbackText,
          x,
          line.baselineTwips
        );
        x += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        this.pdfImage(doc, page, img, x / T2, (line.baselineTwips - img.heightTwips) / T2, img.widthTwips / T2, img.heightTwips / T2);
        x += img.widthTwips;
        continue;
      }
      const sf = this.fonts.resolve(span.family, span.variant);
      const font = emb(span.family, span.variant);
      const col = this.pdfColor(props?.color ?? st?.color);
      const baseShift = props?.vertAlign === "superscript" ? -span.sizePt * 0.35 * T2 : props?.vertAlign === "subscript" ? span.sizePt * 0.14 * T2 : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex] + seg.start;
      const segX0 = x;
      const placed = [];
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i];
        let a = pl.charAdvances[gi];
        if (line.justifyExtraPerSpace && ch === " ") a += line.justifyExtraPerSpace;
        if (props?.highlight) {
          page.fillRect(x / T2, line.yTwips / T2, a / T2, line.heightTwips / T2, hexColor((HIGHLIGHTS2[props.highlight] ?? "#ffff00").replace("#", "")));
        }
        if (run?.field) page.fillRect(x / T2, line.yTwips / T2, a / T2, line.heightTwips / T2, [0.9, 0.9, 0.9]);
        if (props?.commentIds?.length) page.fillRect(x / T2, line.yTwips / T2, a / T2, line.heightTwips / T2, [1, 0.925, 0.72]);
        if (ch === "	" && pl.tabLeaders?.get(gi)) {
          for (let dx = 60; dx < a - 40; dx += 90) {
            const cp = ".".codePointAt(0);
            const { gid } = font.encode(cp);
            placed.push({ gid, codePoint: cp, xPt: (x + dx) / T2, baselineFromTopPt: (line.baselineTwips + baseShift) / T2 });
          }
        }
        if (ch !== " " && ch !== "	" && ch !== "\n" && ch !== "\f") {
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          const cp = ch.codePointAt(0);
          const { gid } = font.encode(cp);
          placed.push({ gid, codePoint: cp, xPt: xSnap / T2, baselineFromTopPt: (line.baselineTwips + baseShift) / T2 });
        }
        x += a;
      }
      page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
      if (props?.underline || props?.strike || props?.doubleStrike) {
        const w = x - segX0;
        const baseW = Math.max(0.5, deviceEmPt(span.sizePt) / 16);
        const drawU = (yOffTwips, lwPt, c, dash) => page.line(segX0 / T2, (line.baselineTwips + yOffTwips) / T2, (segX0 + w) / T2, (line.baselineTwips + yOffTwips) / T2, c, lwPt, dash);
        if (props.underline) {
          const uc = props.underlineColor ? hexColor(props.underlineColor) : col;
          const yU = 40;
          switch (props.underlineStyle) {
            case "double":
              drawU(yU, baseW, uc);
              drawU(yU + 12, baseW, uc);
              break;
            case "thick":
              drawU(yU + 12, baseW * 2.2, uc);
              break;
            case "dotted":
              drawU(yU, baseW, uc, [baseW, baseW * 1.6]);
              break;
            case "dash":
              drawU(yU, baseW, uc, [baseW * 4, baseW * 2.5]);
              break;
            default:
              drawU(yU, baseW, uc);
          }
        }
        if (props.strike) drawU(-span.sizePt * 0.25 * T2, baseW, col);
        if (props.doubleStrike) {
          const yS = -span.sizePt * 0.25 * T2;
          drawU(yS - 8, baseW, col);
          drawU(yS + 8, baseW, col);
        }
      }
    }
  }
  /** Versão PDF do desenho de tabela (sombreado + bordas + texto das células). */
  pdfPaintTable(doc, page, emb, tl) {
    const T2 = TWIPS_PER_PT;
    for (const sh of tl.cellShades) {
      page.fillRect((tl.xTwips + sh.xTwips) / T2, (tl.yTwips + sh.yTwips) / T2, sh.wTwips / T2, sh.hTwips / T2, hexColor(sh.hex));
    }
    const strokeEdge = (e, ax, ay, bx, by) => {
      if (!e) return;
      const dash = e.style === "dashed" ? [6, 3.75] : e.style === "dotted" ? [1.5, 3] : void 0;
      page.line(
        (tl.xTwips + ax) / T2,
        (tl.yTwips + ay) / T2,
        (tl.xTwips + bx) / T2,
        (tl.yTwips + by) / T2,
        this.pdfColor(e.color),
        Math.max(0.4, e.sizeEighthPt / 8),
        dash
      );
    };
    for (const cr of tl.cellRects) {
      strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
      strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
      strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
      strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
    }
    for (const cl of tl.cellLines) {
      const variant = cl.bold && cl.italic ? "boldItalic" : cl.bold ? "bold" : cl.italic ? "italic" : "regular";
      this.pdfGlyphsAt(page, emb, cl.family, variant, cl.sizePt, this.pdfColor(cl.color), cl.text, tl.xTwips + cl.xTwips, tl.yTwips + cl.yTwips);
    }
  }
  /** Versão PDF do paintHf (cabeçalho/rodapé) com glifos posicionados. */
  pdfPaintHf(doc, page, emb, paras, originXTwips, topYTwips, widthTwips, pageIdx, sp) {
    if (!this.fonts) return;
    const T2 = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    let y = topYTwips;
    for (const p of paras) {
      const stColor = this.styleOf(p)?.color;
      const runs = p.runs.map((r) => r.field ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor()) : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text } : r);
      for (const r of runs) {
        const obj = r.textbox ?? r.image;
        if (!obj) continue;
        const { x: fx, y: fy } = obj.floating ? this.anchoredPos(obj, originXTwips, y, sp) : { x: originXTwips, y };
        if (r.textbox) {
          {
            const iw = this.tbInner(r.textbox, fx, fy, r.textbox.widthTwips || widthTwips);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, pageIdx, sp);
          }
        } else if (r.image) {
          this.pdfImage(doc, page, r.image, fx / T2, fy / T2, r.image.widthTwips / T2, r.image.heightTwips / T2);
        }
      }
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      const { lines, charAdvances } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs
      });
      const spanStart = [];
      let acc = 0;
      for (const s of spans) {
        spanStart.push(acc);
        acc += s.text.length;
      }
      const font0 = this.fonts.resolve(void 0, "regular");
      const fallback = p.props.boxBorder && !p.props.borders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
      const bd = p.props.borders ?? (fallback ? { top: fallback, bottom: fallback, left: fallback, right: fallback } : void 0);
      const strokeEdge = (e, ax, ay, bx, by) => {
        if (!e) return;
        const dash = e.style === "dashed" ? [6, 3.75] : e.style === "dotted" ? [1.5, 3] : void 0;
        page.line(ax / T2, ay / T2, bx / T2, by / T2, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
      };
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font0, lineSize, { line: 240, lineRule: "auto" }) * T2;
        if (p.props.shadingHex) {
          page.fillRect(originXTwips / T2, y / T2, widthTwips / T2, lh / T2, hexColor(p.props.shadingHex));
        }
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === "center") lx += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") lx += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          const run = runs[span.runIndex ?? seg.spanIndex];
          const font = emb(span.family, span.variant);
          const cHex = run?.props.color ?? stColor;
          const col = cHex ? hexColor(cHex) : [0.33, 0.33, 0.33];
          const gs = spanStart[seg.spanIndex] + seg.start;
          let cx = lx + seg.xTwips;
          const placed = [];
          for (let i = 0; i < seg.end - seg.start; i++) {
            const ch = span.text[seg.start + i];
            const a = charAdvances[gs + i];
            if (ch !== " " && ch !== "	") {
              const cp = ch.codePointAt(0);
              const { gid } = font.encode(cp);
              placed.push({ gid, codePoint: cp, xPt: cx / T2, baselineFromTopPt: baseline / T2 });
            }
            cx += a;
          }
          page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * T2;
          const spR = (bd.right?.spacePt ?? 0) * T2;
          const spT = (bd.top?.spacePt ?? 0) * T2;
          const spB = (bd.bottom?.spacePt ?? 0) * T2;
          const x0 = originXTwips - spL;
          const x1 = originXTwips + widthTwips + spR;
          const y0 = y - (isFirst ? spT : 0);
          const y1 = y + lh + (isLast ? spB : 0);
          strokeEdge(bd.left, x0, y0, x0, y1);
          strokeEdge(bd.right, x1, y0, x1, y1);
          if (isFirst) strokeEdge(bd.top, x0, y0, x1, y0);
          if (isLast) strokeEdge(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }
  /**
   * Embute (cacheado) e desenha uma imagem. Reencoda como JPEG e reamostra ao
   * tamanho EXIBIDO (~150 DPI), como o app de referência faz — evita PDFs gigantes (RGBA cru
   * de fotos em 4K explodia para dezenas de MB). Alpha é achatado em branco.
   */
  pdfImage(doc, page, img, xPt, yTopPt, wPt, hPt) {
    const DPI = 150;
    let handle = this.pdfImgCache.get(img);
    if (handle === void 0) {
      const bmp = this.bitmapFor(img);
      if (!bmp) {
        handle = null;
      } else {
        const sw = Math.max(1, Math.min(Math.round(wPt * DPI / 72), bmp.width));
        const sh = Math.max(1, Math.min(Math.round(hPt * DPI / 72), bmp.height));
        const c = document.createElement("canvas");
        c.width = sw;
        c.height = sh;
        const cx = c.getContext("2d");
        cx.drawImage(bmp, 0, 0, sw, sh);
        const rgba = cx.getImageData(0, 0, sw, sh).data;
        let hasAlpha = false;
        for (let i = 3; i < rgba.length; i += 4) {
          if (rgba[i] !== 255) {
            hasAlpha = true;
            break;
          }
        }
        if (hasAlpha) {
          handle = doc.embedRgba(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.length), sw, sh);
        } else {
          cx.globalCompositeOperation = "destination-over";
          cx.fillStyle = "#fff";
          cx.fillRect(0, 0, sw, sh);
          handle = doc.embedJpeg(dataUrlToBytes(c.toDataURL("image/jpeg", 0.82)), sw, sh);
        }
      }
      this.pdfImgCache.set(img, handle);
    }
    if (handle) page.drawImage(handle, xPt, yTopPt, wPt, hPt);
    else page.fillRect(xPt, yTopPt, wPt, hPt, [0.93, 0.93, 0.93]);
  }
};
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
customElements.define("universal-write", UniversalWriteElement);

// src/mention-plugin.ts
var LABELS = {
  en: { menu: "Mention suggestions", choose: "Choose a person", empty: "No mentions found" },
  pt: { menu: "Sugest\xF5es de men\xE7\xE3o", choose: "Escolha uma pessoa", empty: "Nenhuma men\xE7\xE3o encontrada" }
};
function createMentionPlugin(options = {}) {
  const prefix = options.prefix ?? "@";
  return {
    id: "universalwrite.mention",
    inlineRenderers: [{
      type: "mention",
      toText: (data) => `${prefix}${data.label}`,
      measure: ({ fallbackText, measureText }) => ({
        widthTwips: measureText(fallbackText) + 180
      }),
      draw: (context) => drawMention(context, options)
    }],
    setup: options.source ? ({ editor }) => setupMentionAutocomplete(editor, options, prefix) : void 0
  };
}
function setupMentionAutocomplete(editor, options, prefix) {
  const source = options.source;
  const maxSuggestions = Math.max(1, options.maxSuggestions ?? 8);
  const popup = document.createElement("div");
  popup.hidden = true;
  popup.className = "wordnext-mention-menu";
  popup.setAttribute("role", "listbox");
  const labels = () => pickLabels(editor instanceof Element ? editor : null, LABELS);
  popup.setAttribute("aria-label", labels().menu);
  Object.assign(popup.style, {
    position: "fixed",
    zIndex: "2147483647",
    width: "280px",
    maxHeight: "260px",
    overflowY: "auto",
    padding: "6px",
    border: "1px solid rgba(127,127,127,.35)",
    borderRadius: "10px",
    background: "#fff",
    color: "#202124",
    boxShadow: "0 12px 32px rgba(0,0,0,.28)",
    font: "14px/1.35 system-ui, sans-serif"
  });
  document.body.append(popup);
  let active = false;
  let query = "";
  let items = [];
  let selected = 0;
  let request = 0;
  const position = () => {
    const rect = editor.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - 304, rect.left + 48));
    const top = Math.max(12, Math.min(window.innerHeight - 284, rect.top + 88));
    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  };
  const choose = (item) => {
    close();
    editor.insertCustomInline("mention", item);
    editor.focusEditor();
  };
  const render = () => {
    popup.replaceChildren();
    popup.hidden = !active;
    if (!active) return;
    const L = labels();
    popup.setAttribute("aria-label", L.menu);
    const heading = document.createElement("div");
    heading.textContent = query ? `${prefix}${query}` : L.choose;
    Object.assign(heading.style, {
      padding: "6px 10px 8px",
      color: "#5f6368",
      fontSize: "12px",
      fontWeight: "600"
    });
    popup.append(heading);
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = options.emptyLabel ?? L.empty;
      Object.assign(empty.style, { padding: "10px", color: "#6b7280" });
      popup.append(empty);
      return;
    }
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `wordnext-mention-option-${index}`;
      button.dataset.index = String(index);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === selected));
      button.textContent = `${prefix}${item.label}`;
      Object.assign(button.style, {
        display: "block",
        width: "100%",
        padding: "9px 10px",
        border: "0",
        borderRadius: "7px",
        background: index === selected ? "#e8f0fe" : "transparent",
        color: index === selected ? "#174ea6" : "#202124",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit"
      });
      button.addEventListener("mouseenter", () => {
        selected = index;
        render();
      });
      button.addEventListener("click", () => choose(item));
      popup.append(button);
    });
    popup.setAttribute("aria-activedescendant", `wordnext-mention-option-${selected}`);
  };
  const refresh = async () => {
    const current = ++request;
    let result;
    try {
      result = await source(query);
    } catch {
      result = [];
    }
    if (!active || current !== request) return;
    items = result.slice(0, maxSuggestions);
    selected = Math.min(selected, Math.max(0, items.length - 1));
    render();
  };
  function open() {
    active = true;
    query = "";
    items = [];
    selected = 0;
    position();
    render();
    void refresh();
  }
  function close() {
    active = false;
    query = "";
    items = [];
    request++;
    popup.hidden = true;
    popup.replaceChildren();
    popup.removeAttribute("aria-activedescendant");
  }
  const onBeforeInput = (raw) => {
    const event = raw;
    const text = event.detail?.text ?? "";
    if (!active) {
      if (text === prefix) {
        event.preventDefault();
        open();
      }
      return;
    }
    event.preventDefault();
    if (!text || /[\r\n\t ]/.test(text)) {
      close();
      return;
    }
    query += text;
    selected = 0;
    void refresh();
  };
  const onKeyDown = (event) => {
    if (!active) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (items.length) {
        selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        render();
      }
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = items[selected];
      if (item) choose(item);
      else close();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!query) close();
      else {
        query = query.slice(0, -1);
        selected = 0;
        void refresh();
      }
    }
  };
  const onPointerDown = (event) => {
    if (active && event.target !== editor && !popup.contains(event.target)) close();
  };
  const onLayout = () => {
    if (active) position();
  };
  editor.addEventListener("uw-before-input", onBeforeInput);
  editor.addEventListener("keydown", onKeyDown, true);
  popup.addEventListener("mousedown", (event) => event.preventDefault());
  window.addEventListener("mousedown", onPointerDown);
  window.addEventListener("resize", onLayout);
  editor.addEventListener("scroll", onLayout);
  return () => {
    editor.removeEventListener("uw-before-input", onBeforeInput);
    editor.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("mousedown", onPointerDown);
    window.removeEventListener("resize", onLayout);
    editor.removeEventListener("scroll", onLayout);
    popup.remove();
  };
}
function drawMention(context, options) {
  const { ctx, xTwips, yTwips, baselineTwips, widthTwips, heightTwips, scale } = context;
  const x = xTwips * scale;
  const y = (yTwips + 16) * scale;
  const width = widthTwips * scale;
  const height = Math.max(1, heightTwips - 32) * scale;
  const radius = Math.min(80 * scale, height / 2);
  ctx.save();
  ctx.fillStyle = options.background ?? (context.dark ? "#394b63" : "#dce8ff");
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
  ctx.fillStyle = options.color ?? (context.dark ? "#d8e6ff" : "#174ea6");
  ctx.fillText(context.fallbackText, x + 90 * scale, baselineTwips * scale);
  ctx.restore();
}

// src/index.ts
async function openDocument(el, bytes, name, opts = {}) {
  const { appFor } = await import("./chunks/chrome-app-GEQXQXK4.js");
  return appFor(el).openBytes(bytes, name, null, opts);
}

// demo/main.ts
var bridge = window.wordnext;
FontResolver.shared().configure({
  baseUrl: "./fonts",
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null
});
var wn = document.getElementById("wn");
wn.use(createMentionPlugin());
if (bridge) {
  const host = {
    openFile: () => bridge.openDocx(),
    // salvar/exportar/imprimir nativos: o shell grava direto no caminho já
    // conhecido, pergunta só no Salvar como, e imprime pelo diálogo do sistema
    saveFile: bridge.saveFile ? (data, o) => bridge.saveFile({ suggestedName: o.name, bytes: data, ...o.path ? { path: o.path } : {} }) : void 0,
    exportFile: bridge.exportFile ? async (kind, name, data) => {
      const enc2 = new TextEncoder();
      const r = await bridge.exportFile({
        suggestedName: name.replace(/\.[^.]+$/, ""),
        formats: [kind],
        bytes: async () => {
          const d = await data();
          return typeof d === "string" ? enc2.encode(d) : d;
        }
      });
      return r?.name ?? null;
    } : void 0,
    print: bridge.print ? async (o) => {
      await bridge.print(o);
    } : void 0,
    openFileForCompare: bridge.openDocxForCompare ? (t) => bridge.openDocxForCompare(t) : void 0,
    setTitleTheme: bridge.setTitleTheme ? (d) => bridge.setTitleTheme(d) : void 0,
    setDirty: bridge.setDirty ? (d, n) => bridge.setDirty(d, n) : void 0,
    onSaveBeforeClose: bridge.onSaveBeforeClose ? (cb) => bridge.onSaveBeforeClose(cb) : void 0,
    closeWindow: bridge.closeWindow ? () => bridge.closeWindow() : void 0,
    setTitle: (t) => {
      document.title = `${t} \u2014 Write`;
    },
    // janela sem moldura (titleBarOverlay): a linha de título reserva os controles
    windowControlsOverlay: true
  };
  wn.host = host;
} else {
  wn.host = { setTitle: (t) => {
    document.title = `${t} \u2014 Write`;
  } };
}
wn.addEventListener("uw-ready", async () => {
  let fromOs = false;
  if (bridge?.onOpenFile) {
    bridge.onOpenFile(async (doc) => {
      fromOs = true;
      return openDocument(wn, new Uint8Array(doc.bytes), doc.name, { motw: doc.motw, path: doc.path });
    });
    await new Promise((r) => setTimeout(r, 150));
    if (fromOs) return;
  }
  try {
    const resp = await fetch("/samples/Catalogo-Recursos-Word.docx");
    if (resp.ok) {
      await openDocument(wn, new Uint8Array(await resp.arrayBuffer()), "Catalogo-Recursos-Word.docx", {
        motw: true,
        trustKey: "url:/samples/Catalogo-Recursos-Word.docx"
      });
      return;
    }
  } catch {
  }
  wn.focusEditor();
}, { once: true });
