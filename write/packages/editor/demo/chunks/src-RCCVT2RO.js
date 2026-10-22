import {
  DocxPackage,
  finalBlocks,
  onBrowserLangChange,
  paraText,
  pickLabels,
  readFullDocument
} from "./chunk-OY4FZEKX.js";
import "./chunk-WSFCRVEQ.js";

// ../compare/src/myers.ts
function myersDiff(n, m, eq) {
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    const out = [];
    for (let j = 0; j < m; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m === 0) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ op: "delete", aIndex: i, bIndex: -1 });
    }
    return out;
  }
  const max = n + m;
  const size = 2 * max + 1;
  const trace = [];
  const V = new Int32Array(size);
  outer: for (let d = 0; d <= max; d++) {
    trace.push(new Int32Array(V));
    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + max;
      let x2;
      if (k === -d) {
        x2 = V[kIdx + 1] ?? 0;
      } else if (k === d) {
        x2 = (V[kIdx - 1] ?? 0) + 1;
      } else {
        const down = V[kIdx + 1] ?? 0;
        const right = (V[kIdx - 1] ?? 0) + 1;
        x2 = down > right ? down : right;
      }
      let y2 = x2 - k;
      while (x2 < n && y2 < m && eq(x2, y2)) {
        x2++;
        y2++;
      }
      V[kIdx] = x2;
      if (x2 >= n && y2 >= m) {
        break outer;
      }
    }
  }
  const ops = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const Vd = trace[d];
    if (!Vd) break;
    const k = x - y;
    const kIdx = k + max;
    let prevK;
    if (k === -d) {
      prevK = k + 1;
    } else if (k === d) {
      prevK = k - 1;
    } else {
      const down = Vd[kIdx + 1] ?? 0;
      const right = Vd[kIdx - 1] ?? 0;
      prevK = down > right ? k + 1 : k - 1;
    }
    const prevX = Vd[prevK + max] ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ op: "equal", aIndex: x - 1, bIndex: y - 1 });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) {
        ops.push({ op: "insert", aIndex: -1, bIndex: y - 1 });
      } else {
        ops.push({ op: "delete", aIndex: x - 1, bIndex: -1 });
      }
      x = prevX;
      y = prevY;
    }
  }
  ops.reverse();
  return ops;
}

// ../compare/src/histogram.ts
function histogramDiff(n, m, eq, getKeyA, getKeyB) {
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    const out = [];
    for (let j = 0; j < m; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m === 0) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ op: "delete", aIndex: i, bIndex: -1 });
    }
    return out;
  }
  const ops = [];
  recurse(0, n, 0, m, eq, getKeyA, getKeyB, ops);
  return ops;
}
function recurse(a0, a1, b0, b1, eq, getKeyA, getKeyB, out) {
  if (a0 >= a1 && b0 >= b1) return;
  if (a0 >= a1) {
    for (let j = b0; j < b1; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return;
  }
  if (b0 >= b1) {
    for (let i = a0; i < a1; i++) {
      out.push({ op: "delete", aIndex: i, bIndex: -1 });
    }
    return;
  }
  const histA = /* @__PURE__ */ new Map();
  for (let i = a0; i < a1; i++) {
    const k = getKeyA(i);
    const bucket = histA.get(k);
    if (bucket) {
      bucket.push(i);
    } else {
      histA.set(k, [i]);
    }
  }
  let bestCount = Number.POSITIVE_INFINITY;
  let bestSpan = -1;
  let bestShift = Number.POSITIVE_INFINITY;
  let bestAL = -1;
  let bestAR = -1;
  let bestBL = -1;
  for (let j = b0; j < b1; j++) {
    const k = getKeyB(j);
    const bucket = histA.get(k);
    if (!bucket) continue;
    const count = bucket.length;
    for (const aIdx of bucket) {
      if (!eq(aIdx, j)) continue;
      let aL = aIdx;
      let bL = j;
      while (aL > a0 && bL > b0 && eq(aL - 1, bL - 1)) {
        aL--;
        bL--;
      }
      let aR = aIdx + 1;
      let bR = j + 1;
      while (aR < a1 && bR < b1 && eq(aR, bR)) {
        aR++;
        bR++;
      }
      const span = aR - aL;
      const shift = aL > bL ? aL - bL : bL - aL;
      let better = false;
      if (count < bestCount) {
        better = true;
      } else if (count === bestCount) {
        if (span > bestSpan) {
          better = true;
        } else if (span === bestSpan) {
          if (shift < bestShift) {
            better = true;
          } else if (shift === bestShift) {
            if (bL < bestBL) {
              better = true;
            } else if (bL === bestBL && aL < bestAL) {
              better = true;
            }
          }
        }
      }
      if (better) {
        bestCount = count;
        bestSpan = span;
        bestShift = shift;
        bestAL = aL;
        bestAR = aR;
        bestBL = bL;
      }
    }
  }
  if (bestAL === -1) {
    const subOps = myersDiff(a1 - a0, b1 - b0, (i, j) => eq(a0 + i, b0 + j));
    for (const op of subOps) {
      out.push({
        op: op.op,
        aIndex: op.aIndex >= 0 ? op.aIndex + a0 : -1,
        bIndex: op.bIndex >= 0 ? op.bIndex + b0 : -1
      });
    }
    return;
  }
  const bRight = bestBL + (bestAR - bestAL);
  recurse(a0, bestAL, b0, bestBL, eq, getKeyA, getKeyB, out);
  for (let off = 0; off < bestAR - bestAL; off++) {
    out.push({ op: "equal", aIndex: bestAL + off, bIndex: bestBL + off });
  }
  recurse(bestAR, a1, bRight, b1, eq, getKeyA, getKeyB, out);
}

// ../compare/src/tokens.ts
function fnv1a(bytes) {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
function bytesEqual(a, b) {
  if (a === b) return true;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
var SEP = "";
var sanitize = (s) => s.includes(SEP) ? s.split(SEP).join("") : s;
var imageContentMarker = (data) => `${SEP}img:${data.byteLength}:${fnv1a(data)}${SEP}`;
var frame = (tag, s) => `${SEP}${tag}${s.length}${SEP}${s}`;
function runPropsSig(p) {
  return [
    p.bold ? "b" : "",
    p.italic ? "i" : "",
    p.underline ? `u${p.underlineStyle ?? "single"}${p.underlineColor ?? ""}` : "",
    p.strike ? "s" : "",
    p.doubleStrike ? "ds" : "",
    p.vertAlign ?? "",
    p.szHalfPt ?? "",
    p.color ?? "",
    p.highlight ?? "",
    p.fontAscii ?? "",
    p.allCaps ? "ac" : "",
    p.smallCaps ? "sc" : "",
    p.charSpacingTwips ?? "",
    p.link ?? "",
    p.isMath ? "m" : ""
  ].join("|");
}
function paraPropsSig(p) {
  return [
    p.alignment ?? "",
    p.styleId ?? "",
    p.numbering ? `${p.numbering.kind}:${p.numbering.ilvl}` : "",
    p.indentLeftTwips ?? "",
    p.indentRightTwips ?? "",
    p.indentFirstLineTwips ?? "",
    p.lineTwentieths ?? "",
    p.spaceAfterTwips ?? "",
    p.spaceBeforeTwips ?? "",
    p.tocInstr ?? "",
    p.tocEntry ? "t" : "",
    p.tabStops ? JSON.stringify(p.tabStops) : "",
    p.shadingHex ?? "",
    p.boxBorder ? "bb" : "",
    p.borders ? JSON.stringify(p.borders) : "",
    p.pageBreakBefore ? "pb" : "",
    p.dropCap ? "dc" : "",
    p.sectionBreak ? JSON.stringify(p.sectionBreak.sectPr) : ""
  ].join("|");
}
function paragraphContentKey(p) {
  const segs = [];
  let prevField = null;
  for (const r of p.runs) {
    if (r.field !== void 0) {
      const instr = sanitize(r.field.trim());
      if (prevField !== instr) segs.push(`${SEP}fld:${instr}${SEP}`);
      prevField = instr;
      continue;
    }
    prevField = null;
    if (r.image) {
      segs.push(imageContentMarker(r.image.data));
    } else if (r.noteRef) {
      segs.push(`${SEP}note:${r.noteRef.kind}${SEP}`);
    } else if (r.custom) {
      const t = sanitize(r.custom.type);
      segs.push(`${SEP}custom:${t.length}:${t}:${sanitize(r.custom.fallbackText)}${SEP}`);
    } else {
      segs.push(sanitize(r.text));
    }
  }
  return segs.join("");
}
function paragraphFormatKey(p) {
  const segs = [];
  let curSig = "";
  let curLen = 0;
  let curImg = "";
  const flush = () => {
    if (curLen > 0 || curImg) segs.push(`${curLen}:${curSig}${curImg}`);
    curLen = 0;
    curImg = "";
  };
  for (const r of p.runs) {
    const sig = runPropsSig(r.props);
    const img = r.image ? `img[${r.image.widthTwips}x${r.image.heightTwips}${r.image.floating ? `@${r.image.offsetXTwips ?? 0},${r.image.offsetYTwips ?? 0}` : ""}]` : "";
    if (sig !== curSig || img) {
      flush();
      curSig = sig;
      curImg = img;
    }
    curLen += r.text.length;
    if (img) flush();
  }
  flush();
  return `${paraPropsSig(p.props)}${SEP}${segs.join(SEP)}`;
}
function collectParagraphImages(p, out) {
  for (const r of p.runs) {
    if (r.image) out.push(r.image.data);
  }
}
function cellContentKey(c) {
  const parts = [
    ...c.paragraphs.map((p) => frame("P", paragraphContentKey(p))),
    ...c.tables.map((t) => frame("T", tableContentKey(t)))
  ];
  return `${parts.join("")}${SEP}span${c.gridSpan}`;
}
function tableContentKey(t) {
  return t.rows.map((row) => frame("R", row.cells.map((c) => frame("C", cellContentKey(c))).join(""))).join("");
}
function cellFormatKey(c) {
  const parts = [
    ...c.paragraphs.map((p) => frame("P", paragraphFormatKey(p))),
    ...c.tables.map((t) => frame("T", tableFormatKey(t)))
  ];
  return [
    parts.join(""),
    c.widthTwips ?? "",
    c.shadingHex ?? "",
    c.borders ? JSON.stringify(c.borders) : ""
  ].join(SEP);
}
function tableFormatKey(t) {
  const rows = t.rows.map((row) => frame("R", row.cells.map((c) => frame("C", cellFormatKey(c))).join(""))).join("");
  return [
    t.gridColsTwips.join(","),
    t.borders ? JSON.stringify(t.borders) : "",
    rows
  ].join(SEP);
}
function collectTableImages(t, out) {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      for (const p of cell.paragraphs) collectParagraphImages(p, out);
      for (const nested of cell.tables) collectTableImages(nested, out);
    }
  }
}
function tokenizeBlock(block) {
  if (block.type === "paragraph") {
    const images2 = [];
    collectParagraphImages(block.paragraph, images2);
    return {
      kind: "paragraph",
      block,
      contentKey: frame("p", paragraphContentKey(block.paragraph)),
      formatKey: paragraphFormatKey(block.paragraph),
      images: images2
    };
  }
  const images = [];
  collectTableImages(block, images);
  return {
    kind: "table",
    block,
    contentKey: frame("t", tableContentKey(block)),
    formatKey: tableFormatKey(block),
    images
  };
}
function tokenizeBlocks(blocks) {
  return blocks.map(tokenizeBlock);
}
function tokensEqual(a, b) {
  if (a.contentKey !== b.contentKey) return false;
  if (a.images.length !== b.images.length) return false;
  for (let i = 0; i < a.images.length; i++) {
    if (!bytesEqual(a.images[i], b.images[i])) return false;
  }
  return true;
}
var rowContentKey = (row) => row.cells.map((c) => frame("C", cellContentKey(c))).join("");
var rowFormatKey = (row) => row.cells.map((c) => frame("C", cellFormatKey(c))).join("");

// ../compare/src/diff.ts
var DEFAULT_DOC_DIFF_OPTIONS = {
  algorithm: "histogram",
  intraWord: true
};
function opsToRuns(ops, aTokens, bTokens) {
  const tagged = ops.map((o) => {
    if (o.op === "equal" && aTokens[o.aIndex].formatKey !== bTokens[o.bIndex].formatKey) {
      return { op: "format", aIndex: o.aIndex, bIndex: o.bIndex };
    }
    return o;
  });
  const runs = [];
  let i = 0;
  let aPos = 0;
  let bPos = 0;
  while (i < tagged.length) {
    const op = tagged[i];
    let j = i + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i, j);
    const aIdxs = [];
    const bIdxs = [];
    for (const s of slice) {
      if (s.aIndex >= 0) aIdxs.push(s.aIndex);
      if (s.bIndex >= 0) bIdxs.push(s.bIndex);
    }
    runs.push({
      kind: op.op,
      aIdxs,
      bIdxs,
      aStart: aPos + 1,
      bStart: bPos + 1
    });
    aPos += aIdxs.length;
    bPos += bIdxs.length;
    i = j;
  }
  return runs;
}
function runsToEdits(runs) {
  const edits = [];
  let i = 0;
  while (i < runs.length) {
    const r = runs[i];
    const next = runs[i + 1];
    if (r.kind === "delete" && next && next.kind === "insert") {
      edits.push({
        kind: "change",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: next.bStart, end: next.bStart + next.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: next.bIdxs
      });
      i += 2;
      continue;
    }
    if (r.kind === "insert" && next && next.kind === "delete") {
      edits.push({
        kind: "change",
        a: { start: next.aStart, end: next.aStart + next.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: next.aIdxs,
        bBlocks: r.bIdxs
      });
      i += 2;
      continue;
    }
    if (r.kind === "equal" || r.kind === "format") {
      edits.push({
        kind: r.kind === "format" ? "change" : "equal",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: r.bIdxs,
        ...r.kind === "format" ? { formatOnly: true, importance: "minor" } : {}
      });
    } else if (r.kind === "delete") {
      edits.push({
        kind: "delete",
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart - 1 },
        aBlocks: r.aIdxs,
        bBlocks: []
      });
    } else {
      edits.push({
        kind: "insert",
        a: { start: r.aStart, end: r.aStart - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: [],
        bBlocks: r.bIdxs
      });
    }
    i++;
  }
  return edits;
}
function wordTokens(text) {
  const out = [];
  const re = /\S+|\s+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}
function intraWordMarks(aText, bText, pairOffset) {
  if (aText === bText) return [];
  const aToks = wordTokens(aText);
  const bToks = wordTokens(bText);
  const ops = myersDiff(
    aToks.length,
    bToks.length,
    (i, j) => aToks[i].text === bToks[j].text
  );
  const marks = [];
  let hasEqual = false;
  for (const op of ops) {
    if (op.op === "equal") {
      if (/\S/.test(aToks[op.aIndex].text)) hasEqual = true;
    } else if (op.op === "delete") {
      const t = aToks[op.aIndex];
      marks.push({ kind: "delete", side: "a", pairOffset, startCh: t.start, endCh: t.end });
    } else {
      const t = bToks[op.bIndex];
      marks.push({ kind: "insert", side: "b", pairOffset, startCh: t.start, endCh: t.end });
    }
  }
  if (!hasEqual) return [];
  const merged = [];
  for (const mk of marks) {
    const last = merged[merged.length - 1];
    if (last && last.side === mk.side && last.kind === mk.kind && last.endCh === mk.startCh) {
      last.endCh = mk.endCh;
    } else {
      merged.push(mk);
    }
  }
  return merged;
}
function tableRowDiff(a, b) {
  if (a.type !== "table" || b.type !== "table") return null;
  const aKeys = a.rows.map(rowContentKey);
  const bKeys = b.rows.map(rowContentKey);
  const ops = histogramDiff(
    a.rows.length,
    b.rows.length,
    (i2, j) => aKeys[i2] === bKeys[j],
    (i2) => aKeys[i2],
    (j) => bKeys[j]
  );
  const out = [];
  let i = 0;
  const tagged = ops.map((o) => ({
    op: o.op === "equal" && rowFormatKey(a.rows[o.aIndex]) !== rowFormatKey(b.rows[o.bIndex]) ? "format" : o.op,
    aIndex: o.aIndex,
    bIndex: o.bIndex
  }));
  while (i < tagged.length) {
    const op = tagged[i];
    let j = i + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i, j);
    const aRows = slice.filter((s) => s.aIndex >= 0).map((s) => s.aIndex);
    const bRows = slice.filter((s) => s.bIndex >= 0).map((s) => s.bIndex);
    const last = out[out.length - 1];
    if (op.op === "insert" && last && last.kind === "delete" && last.bRows.length === 0) {
      last.kind = "change";
      last.bRows = bRows;
    } else if (op.op === "delete" && last && last.kind === "insert" && last.aRows.length === 0) {
      last.kind = "change";
      last.aRows = aRows;
    } else {
      out.push({
        kind: op.op === "format" ? "change" : op.op === "equal" ? "equal" : op.op,
        aRows,
        bRows,
        ...op.op === "format" ? { formatOnly: true } : {}
      });
    }
    i = j;
  }
  return out;
}
function diffBlocks(aBlocks, bBlocks, opts = {}) {
  const o = { ...DEFAULT_DOC_DIFF_OPTIONS, ...opts };
  const aTokens = tokenizeBlocks(aBlocks);
  const bTokens = tokenizeBlocks(bBlocks);
  const eq = (i, j) => tokensEqual(aTokens[i], bTokens[j]);
  const ops = o.algorithm === "myers" ? myersDiff(aTokens.length, bTokens.length, eq) : histogramDiff(
    aTokens.length,
    bTokens.length,
    eq,
    (i) => aTokens[i].contentKey,
    (j) => bTokens[j].contentKey
  );
  const edits = runsToEdits(opsToRuns(ops, aTokens, bTokens));
  for (const e of edits) {
    if (e.kind !== "change" || e.formatOnly) continue;
    const pairs = Math.min(e.aBlocks.length, e.bBlocks.length);
    const intra = [];
    const tableRows = [];
    let anyTable = false;
    for (let p = 0; p < pairs; p++) {
      const aB = aBlocks[e.aBlocks[p]];
      const bB = bBlocks[e.bBlocks[p]];
      if (aB.type === "paragraph" && bB.type === "paragraph") {
        if (o.intraWord) {
          intra.push(...intraWordMarks(paraText(aB.paragraph), paraText(bB.paragraph), p));
        }
        tableRows.push(null);
      } else {
        const rd = tableRowDiff(aB, bB);
        tableRows.push(rd);
        if (rd) anyTable = true;
      }
    }
    if (intra.length > 0) e.intra = intra;
    if (anyTable) e.tableRows = tableRows;
  }
  const stats = { inserted: 0, deleted: 0, changed: 0, formatOnly: 0, equal: 0 };
  for (const e of edits) {
    if (e.kind === "equal") stats.equal += e.aBlocks.length;
    else if (e.kind === "insert") stats.inserted += e.bBlocks.length;
    else if (e.kind === "delete") stats.deleted += e.aBlocks.length;
    else if (e.formatOnly) stats.formatOnly += e.aBlocks.length;
    else stats.changed += Math.max(e.aBlocks.length, e.bBlocks.length);
  }
  return { edits, stats };
}
function diffDocuments(a, b, opts = {}) {
  return diffBlocks(finalBlocks(a.blocks), finalBlocks(b.blocks), opts);
}

// ../compare/src/universal-write-diff.ts
var s_ = (n) => n === 1 ? "" : "s";
var LABELS = {
  en: {
    noComparison: "No comparison loaded \u2014 call loadPair(aBytes, bBytes).",
    empty: "Empty documents.",
    left: "Original",
    right: "Modified",
    identical: "Identical documents",
    onlyChanges: "Only changes",
    close: "Close comparison",
    formatting: "formatting",
    inserted: (n) => `${n} inserted`,
    deleted: (n) => `${n} deleted`,
    changed: (n) => `${n} changed`,
    formatOnly: (n) => `${n} formatting`,
    unchanged: (n) => `\u2026 ${n} unchanged block${s_(n)} \u2026`
  },
  pt: {
    noComparison: "Nenhuma compara\xE7\xE3o carregada \u2014 chame loadPair(aBytes, bBytes).",
    empty: "Documentos vazios.",
    left: "Original",
    right: "Revisado",
    identical: "Documentos id\xEAnticos",
    onlyChanges: "S\xF3 as altera\xE7\xF5es",
    close: "Fechar compara\xE7\xE3o",
    formatting: "formata\xE7\xE3o",
    inserted: (n) => `${n} inserido${s_(n)}`,
    deleted: (n) => `${n} exclu\xEDdo${s_(n)}`,
    changed: (n) => `${n} alterado${s_(n)}`,
    formatOnly: (n) => `${n} de formata\xE7\xE3o`,
    unchanged: (n) => `\u2026 ${n} bloco${s_(n)} sem altera\xE7\xE3o \u2026`
  }
};
var Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {
};
var HIGHLIGHT = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#00008b",
  darkCyan: "#008b8b",
  darkGreen: "#006400",
  darkMagenta: "#8b008b",
  darkRed: "#8b0000",
  darkYellow: "#808000",
  darkGray: "#a9a9a9",
  lightGray: "#d3d3d3",
  black: "#000000",
  white: "#ffffff"
};
var hex6 = (s) => s && /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : null;
var MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  emf: "image/emf"
};
var STYLE = (
  /* css */
  `
:host {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: system-ui, sans-serif;
  /* Conven\xE7\xF5es de cor do OpenCompare (insert verde, delete vermelho,
     change vermelho no par, minor/formata\xE7\xE3o azul). */
  --uwd-insert-bg: light-dark(rgba(63,185,80,0.15), rgba(63,185,80,0.18));
  --uwd-insert-bg-intra: light-dark(rgba(63,185,80,0.40), rgba(63,185,80,0.45));
  --uwd-delete-bg: light-dark(rgba(248,81,73,0.15), rgba(248,81,73,0.18));
  --uwd-delete-bg-intra: light-dark(rgba(248,81,73,0.40), rgba(248,81,73,0.45));
  --uwd-minor-bg: light-dark(rgba(59,130,246,0.12), rgba(59,130,246,0.16));
  --uwd-stripe-insert: #3fb950;
  --uwd-stripe-delete: #f85149;
  --uwd-stripe-minor: #3b82f6;
  --uwd-border: light-dark(#d0d7de, #3d444d);
  --uwd-text: light-dark(#1f2328, #e6edf3);
  --uwd-text-2: light-dark(#59636e, #9198a1);
  --uwd-chrome: light-dark(#f6f8fa, #151b23);
  --uwd-page: light-dark(#ffffff, #0d1117);
  color: var(--uwd-text);
  background: var(--uwd-page);
}
.uwd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--uwd-border);
  background: var(--uwd-chrome);
  font-size: 13px;
  flex: none;
}
.uwd-header .uwd-stats { display: flex; gap: 10px; color: var(--uwd-text-2); }
.uwd-stat::before { content: "\u25CF"; margin-right: 4px; font-size: 10px; }
.uwd-stat--ins::before { color: var(--uwd-stripe-insert); }
.uwd-stat--del::before { color: var(--uwd-stripe-delete); }
.uwd-stat--chg::before { color: var(--uwd-stripe-delete); }
.uwd-stat--fmt::before { color: var(--uwd-stripe-minor); }
.uwd-header .uwd-spacer { flex: 1; }
.uwd-header button {
  border: 1px solid var(--uwd-border);
  background: transparent;
  color: var(--uwd-text);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.uwd-header button[data-on="1"] { background: var(--uwd-minor-bg); border-color: var(--uwd-stripe-minor); }
.uwd-header .uwd-close { border: none; font-size: 16px; line-height: 1; padding: 2px 8px; }
.uwd-body { flex: 1; overflow: auto; min-height: 0; }
.uwd-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
}
.uwd-pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  grid-column: span 2;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-bottom: 1px solid var(--uwd-border);
}
.uwd-gutter {
  padding: 4px 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--uwd-text-2);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell {
  position: relative;
  padding: 4px 12px 4px 14px;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--stripe, transparent);
}
.uwd-cell[data-kind="insert"] { --stripe: var(--uwd-stripe-insert); background: var(--uwd-insert-bg); }
.uwd-cell[data-kind="delete"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="change"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="format"] { --stripe: var(--uwd-stripe-minor); background: var(--uwd-minor-bg); }
.uwd-cell[data-kind="pad"] {
  background:
    repeating-linear-gradient(45deg, transparent, transparent 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 8px);
}
.uwd-intra--ins { background: var(--uwd-insert-bg-intra); border-radius: 2px; }
.uwd-intra--del { background: var(--uwd-delete-bg-intra); border-radius: 2px; }
.uwd-band {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-top: 1px solid var(--uwd-border);
  border-bottom: 1px solid var(--uwd-border);
  cursor: pointer;
  user-select: none;
}
.uwd-band:hover { background: var(--uwd-minor-bg); }
.uwd-para { margin: 0; min-height: 1.2em; }
.uwd-para img { max-width: 100%; height: auto; vertical-align: bottom; }
.uwd-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  background: var(--uwd-minor-bg);
  color: var(--uwd-text-2);
  vertical-align: middle;
}
table.uwd-table { border-collapse: collapse; margin: 2px 0; width: 100%; }
table.uwd-table td {
  border: 1px solid var(--uwd-border);
  padding: 2px 6px;
  vertical-align: top;
}
tr.uwd-row--insert { background: var(--uwd-insert-bg); }
tr.uwd-row--delete { background: var(--uwd-delete-bg); }
tr.uwd-row--change { background: var(--uwd-delete-bg); }
tr.uwd-row--format { background: var(--uwd-minor-bg); }
.uwd-empty { color: var(--uwd-text-2); font-style: italic; padding: 24px; text-align: center; }
`
);
var UniversalWriteDiffElement = class extends Base {
  static get observedAttributes() {
    return ["view", "left-label", "right-label", "lang"];
  }
  _shadow;
  _aDoc = null;
  _bDoc = null;
  _diff = null;
  _blobUrls = [];
  _expandedBands = /* @__PURE__ */ new Set();
  _renderScheduled = false;
  _unsubscribeLang = null;
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
  }
  attributeChangedCallback() {
    this._schedule();
  }
  connectedCallback() {
    if (this._diff) this._schedule();
    this._unsubscribeLang ??= onBrowserLangChange(() => this._schedule());
  }
  disconnectedCallback() {
    this._revokeBlobs();
    this._unsubscribeLang?.();
    this._unsubscribeLang = null;
  }
  /** Textos no idioma da interface. */
  get _L() {
    return pickLabels(this, LABELS);
  }
  get view() {
    return this.getAttribute("view") === "diffs" ? "diffs" : "all";
  }
  set view(v) {
    this.setAttribute("view", v);
  }
  /** Carrega e compara dois .docx (bytes). */
  loadPair(aBytes, bBytes, opts = {}) {
    const aDoc = readFullDocument(DocxPackage.load(aBytes));
    const bDoc = readFullDocument(DocxPackage.load(bBytes));
    this.loadDocuments(aDoc, bDoc, opts);
  }
  /** Compara dois documentos já parseados. */
  loadDocuments(aDoc, bDoc, opts = {}) {
    aDoc = { ...aDoc, blocks: finalBlocks(aDoc.blocks) };
    bDoc = { ...bDoc, blocks: finalBlocks(bDoc.blocks) };
    this._aDoc = aDoc;
    this._bDoc = bDoc;
    if (opts.leftLabel !== void 0) this.setAttribute("left-label", opts.leftLabel);
    if (opts.rightLabel !== void 0) this.setAttribute("right-label", opts.rightLabel);
    this._diff = diffDocuments(aDoc, bDoc);
    this._expandedBands.clear();
    this._schedule();
    queueMicrotask(() => {
      this.dispatchEvent(new CustomEvent("ready", {
        detail: { stats: this._diff.stats },
        bubbles: true,
        composed: true
      }));
    });
  }
  get stats() {
    return this._diff?.stats ?? null;
  }
  _schedule() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      this._render();
    });
  }
  _revokeBlobs() {
    for (const u of this._blobUrls) URL.revokeObjectURL(u);
    this._blobUrls = [];
  }
  // ───────────────────────── render ─────────────────────────
  _render() {
    if (!this.isConnected) return;
    this._revokeBlobs();
    const doc = this.ownerDocument;
    const root = doc.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;min-height:0;height:100%;";
    const style = doc.createElement("style");
    style.textContent = STYLE;
    if (!this._diff || !this._aDoc || !this._bDoc) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.textContent = this._L.noComparison;
      root.append(empty);
      this._shadow.replaceChildren(style, root);
      return;
    }
    root.append(this._renderHeader(doc));
    const body = doc.createElement("div");
    body.className = "uwd-body";
    const grid = doc.createElement("div");
    grid.className = "uwd-grid";
    const headA = doc.createElement("div");
    headA.className = "uwd-pane-header";
    headA.textContent = this.getAttribute("left-label") ?? this._L.left;
    const headB = doc.createElement("div");
    headB.className = "uwd-pane-header";
    headB.textContent = this.getAttribute("right-label") ?? this._L.right;
    grid.append(headA, headB);
    const rows = this._buildRows();
    const showAll = this.view !== "diffs";
    let i = 0;
    while (i < rows.length) {
      const row = rows[i];
      if (!showAll && row.kind === "equal" && !this._expandedBands.has(row.editIndex)) {
        let j = i;
        while (j < rows.length && rows[j].kind === "equal" && rows[j].editIndex === row.editIndex) j++;
        grid.append(this._renderBand(doc, row.editIndex, j - i));
        i = j;
        continue;
      }
      this._renderRow(doc, grid, row);
      i++;
    }
    if (rows.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = this._L.empty;
      grid.append(empty);
    }
    body.append(grid);
    root.append(body);
    this._shadow.replaceChildren(style, root);
  }
  _renderHeader(doc) {
    const stats = this._diff.stats;
    const header = doc.createElement("div");
    header.className = "uwd-header";
    const statsBox = doc.createElement("div");
    statsBox.className = "uwd-stats";
    const L = this._L;
    const stat = (cls, label, n) => {
      if (n === 0) return;
      const s = doc.createElement("span");
      s.className = `uwd-stat uwd-stat--${cls}`;
      s.textContent = label(n);
      statsBox.append(s);
    };
    stat("ins", L.inserted, stats.inserted);
    stat("del", L.deleted, stats.deleted);
    stat("chg", L.changed, stats.changed);
    stat("fmt", L.formatOnly, stats.formatOnly);
    if (statsBox.childElementCount === 0) {
      const s = doc.createElement("span");
      s.textContent = L.identical;
      statsBox.append(s);
    }
    header.append(statsBox);
    const spacer = doc.createElement("div");
    spacer.className = "uwd-spacer";
    header.append(spacer);
    const toggle = doc.createElement("button");
    toggle.textContent = L.onlyChanges;
    toggle.dataset["on"] = this.view === "diffs" ? "1" : "0";
    toggle.addEventListener("click", () => {
      this.view = this.view === "diffs" ? "all" : "diffs";
    });
    header.append(toggle);
    const close = doc.createElement("button");
    close.className = "uwd-close";
    close.title = L.close;
    close.setAttribute("aria-label", L.close);
    close.textContent = "\u2715";
    close.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close-request", { bubbles: true, composed: true }));
    });
    header.append(close);
    return header;
  }
  _buildRows() {
    const rows = [];
    const edits = this._diff.edits;
    for (let e = 0; e < edits.length; e++) {
      const edit = edits[e];
      const kind = edit.kind === "change" && edit.formatOnly ? "format" : edit.kind;
      const n = Math.max(edit.aBlocks.length, edit.bBlocks.length);
      for (let p = 0; p < n; p++) {
        rows.push({
          kind,
          editIndex: e,
          pairOffset: p,
          aBlock: edit.aBlocks[p] ?? null,
          bBlock: edit.bBlocks[p] ?? null
        });
      }
    }
    return rows;
  }
  _renderBand(doc, editIndex, count) {
    const band = doc.createElement("div");
    band.className = "uwd-band";
    band.textContent = this._L.unchanged(count);
    band.addEventListener("click", () => {
      this._expandedBands.add(editIndex);
      this._schedule();
    });
    return band;
  }
  _renderRow(doc, grid, row) {
    const edit = this._diff.edits[row.editIndex];
    grid.append(this._gutter(doc, row.aBlock));
    grid.append(this._cell(doc, "a", row, edit));
    grid.append(this._gutter(doc, row.bBlock));
    grid.append(this._cell(doc, "b", row, edit));
  }
  _gutter(doc, blockIdx) {
    const g = doc.createElement("div");
    g.className = "uwd-gutter";
    g.textContent = blockIdx === null ? "" : String(blockIdx + 1);
    return g;
  }
  _cell(doc, side, row, edit) {
    const cell = doc.createElement("div");
    cell.className = "uwd-cell";
    const blockIdx = side === "a" ? row.aBlock : row.bBlock;
    const docModel = side === "a" ? this._aDoc : this._bDoc;
    if (blockIdx === null) {
      cell.dataset["kind"] = "pad";
      return cell;
    }
    if (row.kind !== "equal") cell.dataset["kind"] = row.kind;
    const block = docModel.blocks[blockIdx];
    const marks = row.kind === "change" ? (edit.intra ?? []).filter((m) => m.side === side && m.pairOffset === row.pairOffset) : [];
    const rowDiff = row.kind === "change" ? edit.tableRows?.[row.pairOffset] ?? null : null;
    if (block.type === "paragraph") {
      cell.append(this._renderParagraph(doc, block.paragraph, marks));
      if (row.kind === "format") {
        const badge = doc.createElement("span");
        badge.className = "uwd-badge";
        badge.textContent = this._L.formatting;
        cell.append(badge);
      }
    } else {
      cell.append(this._renderTable(doc, block, side, rowDiff));
    }
    cell.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("block-click", {
        detail: { editIndex: row.editIndex, side, blockIndex: blockIdx },
        bubbles: true,
        composed: true
      }));
    });
    return cell;
  }
  // ─────────────── blocos ───────────────
  _renderParagraph(doc, p, marks) {
    const el = doc.createElement("div");
    el.className = "uwd-para";
    const pr = p.props;
    if (pr.alignment && pr.alignment !== "left") {
      el.style.textAlign = pr.alignment === "both" ? "justify" : pr.alignment;
    }
    if (pr.indentLeftTwips) el.style.paddingLeft = `${pr.indentLeftTwips / 20}pt`;
    if (pr.indentRightTwips) el.style.paddingRight = `${pr.indentRightTwips / 20}pt`;
    if (pr.indentFirstLineTwips) el.style.textIndent = `${pr.indentFirstLineTwips / 20}pt`;
    if (pr.spaceBeforeTwips) el.style.marginTop = `${pr.spaceBeforeTwips / 20}pt`;
    if (pr.spaceAfterTwips) el.style.marginBottom = `${pr.spaceAfterTwips / 20}pt`;
    const shd = hex6(pr.shadingHex);
    if (shd) el.style.background = shd;
    if (pr.numbering) {
      const marker = doc.createElement("span");
      marker.textContent = pr.numbering.kind === "bullet" ? "\u2022 " : "# ";
      marker.style.paddingLeft = `${pr.numbering.ilvl * 18}pt`;
      el.append(marker);
    }
    let offset = 0;
    for (const r of p.runs) {
      const len = r.text.length;
      const runMarks = marks.filter((m) => m.startCh < offset + len && m.endCh > offset).map((m) => ({
        start: Math.max(0, m.startCh - offset),
        end: Math.min(len, m.endCh - offset),
        kind: m.kind
      })).sort((x, y) => x.start - y.start);
      el.append(...this._renderRun(doc, r, runMarks));
      offset += len;
    }
    return el;
  }
  _renderRun(doc, r, marks) {
    if (r.image) {
      const img = doc.createElement("img");
      const mime = MIME[r.image.ext.toLowerCase()] ?? "application/octet-stream";
      const bytes = r.image.data;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const url = URL.createObjectURL(new Blob([buf], { type: mime }));
      this._blobUrls.push(url);
      img.src = url;
      img.width = Math.round(r.image.widthTwips / 15);
      img.height = Math.round(r.image.heightTwips / 15);
      if (marks.length > 0) {
        const wrap = doc.createElement("span");
        wrap.className = marks[0].kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
        wrap.append(img);
        return [wrap];
      }
      return [img];
    }
    const base = this._styledSpan(doc, r);
    const text = r.text;
    if (marks.length === 0) {
      base.textContent = text;
      return [base];
    }
    let pos = 0;
    for (const m of marks) {
      if (m.start > pos) base.append(doc.createTextNode(text.slice(pos, m.start)));
      const mark = doc.createElement("span");
      mark.className = m.kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
      mark.textContent = text.slice(m.start, m.end);
      base.append(mark);
      pos = m.end;
    }
    if (pos < text.length) base.append(doc.createTextNode(text.slice(pos)));
    return [base];
  }
  _styledSpan(doc, r) {
    const s = doc.createElement("span");
    const p = r.props;
    if (p.bold) s.style.fontWeight = "700";
    if (p.italic || p.isMath) s.style.fontStyle = "italic";
    const deco = [];
    if (p.underline) deco.push("underline");
    if (p.strike || p.doubleStrike) deco.push("line-through");
    if (deco.length) s.style.textDecoration = deco.join(" ");
    const uc = hex6(p.underlineColor);
    if (uc) s.style.textDecorationColor = uc;
    if (p.szHalfPt) s.style.fontSize = `${p.szHalfPt / 2}pt`;
    const fg = hex6(p.color);
    if (fg) s.style.color = fg;
    if (p.highlight && HIGHLIGHT[p.highlight]) s.style.background = HIGHLIGHT[p.highlight];
    if (p.fontAscii) s.style.fontFamily = `"${p.fontAscii}", sans-serif`;
    if (p.allCaps) s.style.textTransform = "uppercase";
    if (p.smallCaps) s.style.fontVariant = "small-caps";
    if (p.vertAlign === "superscript") {
      s.style.verticalAlign = "super";
      s.style.fontSize = "smaller";
    }
    if (p.vertAlign === "subscript") {
      s.style.verticalAlign = "sub";
      s.style.fontSize = "smaller";
    }
    if (p.link) {
      s.style.color = "#0563c1";
      s.style.textDecoration = "underline";
      s.title = p.link;
    }
    return s;
  }
  _renderTable(doc, t, side, rowDiff) {
    const rowKind = /* @__PURE__ */ new Map();
    if (rowDiff) {
      for (const rd of rowDiff) {
        const idxs = side === "a" ? rd.aRows : rd.bRows;
        const kind = rd.kind === "change" && rd.formatOnly ? "format" : rd.kind === "change" ? "change" : rd.kind;
        for (const idx of idxs) {
          if (kind !== "equal") rowKind.set(idx, kind);
        }
      }
    }
    const el = doc.createElement("table");
    el.className = "uwd-table";
    for (let ri = 0; ri < t.rows.length; ri++) {
      const tr = doc.createElement("tr");
      const kind = rowKind.get(ri);
      if (kind && kind !== "equal") tr.className = `uwd-row--${kind}`;
      for (const c of t.rows[ri].cells) {
        const td = doc.createElement("td");
        if (c.gridSpan > 1) td.colSpan = c.gridSpan;
        const cellShd = hex6(c.shadingHex);
        if (cellShd) td.style.background = cellShd;
        for (const cp of c.paragraphs) td.append(this._renderParagraph(doc, cp, []));
        for (const nested of c.tables) td.append(this._renderTable(doc, nested, side, null));
        tr.append(td);
      }
      el.append(tr);
    }
    return el;
  }
};
if (typeof customElements !== "undefined" && !customElements.get("universal-write-diff")) {
  customElements.define("universal-write-diff", UniversalWriteDiffElement);
}
export {
  DEFAULT_DOC_DIFF_OPTIONS,
  DocxPackage,
  UniversalWriteDiffElement,
  bytesEqual,
  diffBlocks,
  diffDocuments,
  fnv1a,
  histogramDiff,
  intraWordMarks,
  myersDiff,
  readFullDocument,
  tokenizeBlock,
  tokenizeBlocks,
  tokensEqual
};
