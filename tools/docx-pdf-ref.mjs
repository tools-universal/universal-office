// Referência JS do DocxToPdf v1 (fase 2 do projeto .NET) — MESMO algoritmo
// pragmático portado em dotnet/src/OfficeNext.Export/DocxPdf.cs:
// parágrafos com quebra por palavra (advances hmtx + kern legada formato 0),
// página/margens do sectPr, bold/italic/size/cor por run (styles.xml),
// headings, listas com marcador e tabelas como grade simples de linha atômica.
// Usado por gen-parity-pdf.mjs (paridade estrutural) e bench-export-pdf.mjs.
//
// Divergências conhecidas vs o pipeline canvas do write: ver comentário no
// DocxPdf.cs (kern-only, entrelinha 1.2×sz, sem tabs/imagens/headers etc.).
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url).href;
const { DocxPackage, readFullDocument } = await import(new URL('write/packages/docx-core/dist/index.js', root).href);
const { PdfDocument, hexColor } = await import(new URL('write/packages/pdf/dist/index.js', root).href);
const { TtfProgram } = await import(new URL('sheet/packages/export/dist/sfnt.js', root).href);

const LINE_FACTOR = 1.2;
const MARKER_HANG = 18;
const CELL_PAD = 4;

/** Pares da tabela kern legada (formato 0, horizontal) — espelho do C#. */
function parseKern(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numTables = v.getUint16(4);
  let kern = -1;
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
    if (tag === 'kern') { kern = v.getUint32(p + 8); break; }
  }
  const pairs = new Map();
  if (kern < 0) return pairs;
  try {
    const n = v.getUint16(kern + 2);
    let p = kern + 4;
    for (let t = 0; t < n; t++) {
      const length = v.getUint16(p + 2);
      const coverage = v.getUint16(p + 4);
      const fmt = coverage >> 8;
      const horizontal = (coverage & 0x1) !== 0;
      const crossStream = (coverage & 0x4) !== 0;
      if (fmt === 0 && horizontal && !crossStream) {
        const nPairs = v.getUint16(p + 6);
        let q = p + 14;
        for (let i = 0; i < nPairs; i++, q += 6) {
          pairs.set(v.getUint16(q) * 65536 + v.getUint16(q + 2), v.getInt16(q + 4));
        }
      }
      p += length;
    }
  } catch {
    pairs.clear();
  }
  return pairs;
}

const HEADING_RE = /(?:heading|t[íi]tulo|titulo)\s*([1-9])/i;
const H_RE = /^h([1-6])$/i;
const TITLE_RE = /^(title|t[íi]tulo)$/i;

function headingLevel(p) {
  const id = p.props.styleId ?? '';
  let m = HEADING_RE.exec(id);
  if (m) return Math.min(6, parseInt(m[1], 10));
  m = H_RE.exec(id);
  if (m) return parseInt(m[1], 10);
  if (TITLE_RE.test(id)) return 1;
  return 0;
}

function headingDefaultSz(level) {
  return level === 1 ? 17 : level === 2 ? 14 : level === 3 ? 13 : 12;
}

/** docxToPdf v1 — fonts: [{bytes, bold?, italic?, name?}]. */
export function docxToPdfRef(bytes, fonts) {
  if (!fonts || !fonts.length) throw new Error('docxToPdfRef: fonts é obrigatório');
  const pkg = DocxPackage.load(bytes);
  const full = readFullDocument(pkg);

  const doc = new PdfDocument();
  const variants = fonts.map((f, i) => {
    const program = new TtfProgram(f.bytes);
    return {
      bold: !!f.bold, italic: !!f.italic, program,
      kern: parseKern(f.bytes),
      embedded: doc.embedFont(f.name ?? `Font${i}`, f.bytes, program),
    };
  });
  const pick = (bold, italic) =>
    variants.find((v) => v.bold === bold && v.italic === italic) ??
    variants.find((v) => !v.bold && !v.italic) ?? variants[0];

  const sect = full.sections[0]?.sectPr ?? {
    pageWidthTwips: 11906, pageHeightTwips: 16838,
    marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417,
  };
  const cx = {
    doc, pick, full,
    page: null,
    pageW: sect.pageWidthTwips / 20, pageH: sect.pageHeightTwips / 20,
    marL: sect.marginLeftTwips / 20, marR: sect.marginRightTwips / 20,
    marT: sect.marginTopTwips / 20, marB: sect.marginBottomTwips / 20,
    y: 0,
    decimalCounters: new Array(9).fill(0),
  };
  cx.contentW = cx.pageW - cx.marL - cx.marR;
  cx.pageBottom = cx.pageH - cx.marB;
  cx.newPage = () => { cx.page = doc.addPage(cx.pageW, cx.pageH); cx.y = cx.marT; };
  cx.newPage();

  for (const block of full.blocks) {
    if (block.type === 'paragraph') renderParagraph(cx, block.paragraph);
    else if (block.type === 'table') renderTable(cx, block);
  }
  return doc.build();
}

function styleOf(cx, p) {
  return p.props.styleId ? cx.full.styles.get(p.props.styleId) : undefined;
}

function effectiveRuns(p, style, heading) {
  const baseSz = style?.run?.szHalfPt !== undefined ? style.run.szHalfPt / 2
    : heading > 0 ? headingDefaultSz(heading) : 11;
  const baseBold = style?.run?.bold ?? heading > 0;
  const baseItalic = style?.run?.italic ?? false;
  const baseColor = style?.run?.color ?? '000000';
  const baseUnderline = style?.run?.underline ?? false;

  const out = [];
  for (const r of p.runs) {
    if (r.image) continue; // v1: imagens fora do escopo
    if (!r.text.length) continue;
    out.push({
      text: r.text,
      szPt: r.props.szHalfPt !== undefined ? r.props.szHalfPt / 2 : baseSz,
      bold: !!r.props.bold || baseBold,
      italic: !!r.props.italic || baseItalic,
      underline: !!r.props.underline || baseUnderline,
      color: r.props.color ?? baseColor,
    });
  }
  if (!out.length) out.push({ text: '', szPt: baseSz, bold: baseBold, italic: baseItalic, underline: false, color: baseColor });
  return out;
}

function buildChars(cx, runs) {
  const chars = [];
  for (let ri = 0; ri < runs.length; ri++) {
    const r = runs[ri];
    const v = cx.pick(r.bold, r.italic);
    const prog = v.program;
    const scale = r.szPt / prog.unitsPerEm;
    const cps = [...r.text].map((ch) => ch.codePointAt(0));
    for (let i = 0; i < cps.length; i++) {
      const cp = cps[i];
      if (cp === 10 || cp === 12) { // \n \f
        chars.push({ cp, runIndex: ri, advance: 0, isGap: false, isBreak: true });
        continue;
      }
      const gid = prog.glyphId(cp);
      let adv = prog.advanceWidth(gid) * scale;
      const next = cps[i + 1];
      if (next !== undefined && cp !== 32 && next !== 32 && next !== 10 && next !== 12) {
        const k = v.kern.get(gid * 65536 + prog.glyphId(next));
        if (k !== undefined) adv += k * scale;
      }
      chars.push({ cp, runIndex: ri, advance: adv, isGap: cp === 32, isBreak: false });
    }
  }
  return chars;
}

function breakLines(chars, availOf) {
  const lines = [];
  let lineStart = 0;
  let width = 0;
  let pendingGap = 0;
  let i = 0;

  const emergency = (wordStart, wordEnd, initialWidth) => {
    if (initialWidth <= availOf(lines.length)) return initialWidth;
    let start = wordStart;
    let w = 0;
    for (let k = wordStart; k < wordEnd; k++) {
      const a = chars[k].advance;
      if (w + a > availOf(lines.length) && k > start) {
        lines.push({ start, end: k, width: w });
        start = k;
        w = a;
      } else w += a;
    }
    lineStart = start;
    return w;
  };

  while (i < chars.length) {
    const c = chars[i];
    if (c.isBreak) {
      lines.push({ start: lineStart, end: i + 1, width: width + pendingGap });
      lineStart = i + 1;
      width = 0;
      pendingGap = 0;
      i++;
      continue;
    }
    if (c.isGap) {
      pendingGap += c.advance;
      i++;
      continue;
    }
    const wordStart = i;
    let wordWidth = 0;
    while (i < chars.length && !chars[i].isGap && !chars[i].isBreak) {
      wordWidth += chars[i].advance;
      i++;
    }
    const avail = availOf(lines.length);
    if (wordStart > lineStart && width + pendingGap + wordWidth > avail) {
      lines.push({ start: lineStart, end: wordStart, width });
      lineStart = wordStart;
      pendingGap = 0;
      width = emergency(wordStart, i, wordWidth);
    } else if (wordStart === lineStart && wordWidth > avail) {
      width = emergency(wordStart, i, wordWidth);
      pendingGap = 0;
    } else {
      width += pendingGap + wordWidth;
      pendingGap = 0;
    }
  }
  if (lineStart < chars.length || lines.length === 0) {
    lines.push({ start: lineStart, end: chars.length, width });
  }
  return lines;
}

function renderParagraph(cx, p) {
  const style = styleOf(cx, p);
  const heading = headingLevel(p);
  const runs = effectiveRuns(p, style, heading);

  const pageBreakBefore = !!p.props.pageBreakBefore || !!style?.para?.pageBreakBefore;
  if (pageBreakBefore && cx.y > cx.marT) cx.newPage();

  const spaceBefore = (p.props.spaceBeforeTwips ?? style?.para?.spaceBeforeTwips ?? 0) / 20;
  const spaceAfter = (p.props.spaceAfterTwips ?? style?.para?.spaceAfterTwips ?? 0) / 20;
  const align = p.props.alignment ?? style?.para?.alignment ?? 'left';

  const num = p.props.numbering;
  const ilvl = Math.min(num?.ilvl ?? 0, 8);
  const indentLeft = (p.props.indentLeftTwips ?? style?.para?.indentLeftTwips
    ?? (num ? 720 * (ilvl + 1) : 0)) / 20;
  const firstLine = (p.props.indentFirstLineTwips ?? 0) / 20;

  let marker = null;
  if (num) {
    if (num.kind === 'decimal') {
      for (let l = ilvl + 1; l < 9; l++) cx.decimalCounters[l] = 0;
      cx.decimalCounters[ilvl]++;
      marker = `${cx.decimalCounters[ilvl]}.`;
    } else marker = '•';
  }

  cx.y += spaceBefore;
  layoutParagraph(cx, runs, marker, align, cx.marL, cx.contentW, indentLeft, firstLine, true, true, 0);
  cx.y += spaceAfter;
}

/** Layout + desenho — devolve a altura (usada na medição de células). */
function layoutParagraph(cx, runs, marker, align, x0, availTotal, indentLeft, firstLine, paginate, draw, yStart) {
  const chars = buildChars(cx, runs);
  const availOf = (lineIdx) =>
    Math.max(1, availTotal - indentLeft - (lineIdx === 0 ? Math.max(0, firstLine) : 0));
  const lines = breakLines(chars, availOf);

  const regular = cx.pick(false, false).program;
  let localY = yStart;
  let outHeight = 0;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let maxSz = 0;
    for (let k = line.start; k < line.end; k++) {
      if (chars[k].isBreak) continue;
      maxSz = Math.max(maxSz, runs[chars[k].runIndex].szPt);
    }
    if (maxSz === 0) maxSz = runs[0].szPt;
    const lineH = maxSz * LINE_FACTOR;
    const asc = (regular.ascender / regular.unitsPerEm) * maxSz;

    let lineTop;
    if (paginate) {
      if (cx.y + lineH > cx.pageBottom && cx.y > cx.marT) cx.newPage();
      lineTop = cx.y;
    } else {
      lineTop = localY;
    }
    const baseline = lineTop + asc;

    if (draw) {
      const startX = x0 + indentLeft + (li === 0 ? Math.max(0, firstLine) : 0);
      const avail = availOf(li);
      const dx = align === 'center' ? Math.max(0, (avail - line.width) / 2)
        : align === 'right' ? Math.max(0, avail - line.width) : 0;
      let penX = startX + dx;

      if (li === 0 && marker !== null) {
        const v0 = cx.pick(runs[0].bold, runs[0].italic);
        drawText(cx, v0, runs[0].szPt, runs[0].color, x0 + indentLeft - MARKER_HANG, baseline, marker);
      }

      let segStart = line.start;
      for (let k = line.start; k <= line.end; k++) {
        const boundary = k === line.end || chars[k].isBreak || chars[k].runIndex !== chars[segStart].runIndex;
        if (boundary && k > segStart) {
          const r = runs[chars[segStart].runIndex];
          const v = cx.pick(r.bold, r.italic);
          const segX = penX;
          const glyphs = [];
          for (let m = segStart; m < k; m++) {
            const ci = chars[m];
            if (!ci.isBreak) {
              glyphs.push({ gid: v.program.glyphId(ci.cp), codePoint: ci.cp, xPt: penX, baselineFromTopPt: baseline });
              v.embedded.encode(ci.cp);
              penX += ci.advance;
            }
          }
          if (glyphs.length) cx.page.glyphs(v.embedded, r.szPt, hexColor(r.color), glyphs);
          if (r.underline && penX > segX) {
            cx.page.line(segX, baseline + r.szPt * 0.12, penX, baseline + r.szPt * 0.12,
              hexColor(r.color), Math.max(0.5, r.szPt / 16));
          }
          segStart = k;
        }
        if (k < line.end && chars[k].isBreak) segStart = k + 1;
      }
    }

    if (paginate) cx.y += lineH;
    else localY += lineH;
    outHeight += lineH;
  }
  return outHeight;
}

function drawText(cx, v, szPt, color, x, baseline, text) {
  const glyphs = [];
  let pen = x;
  const scale = szPt / v.program.unitsPerEm;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const { gid, advanceWidth } = v.embedded.encode(cp);
    glyphs.push({ gid, codePoint: cp, xPt: pen, baselineFromTopPt: baseline });
    pen += advanceWidth * scale;
  }
  if (glyphs.length) cx.page.glyphs(v.embedded, szPt, hexColor(color), glyphs);
}

function renderTable(cx, t) {
  if (!t.rows.length) return;
  const nCols = t.gridColsTwips.length ||
    Math.max(...t.rows.map((r) => r.cells.reduce((a, c) => a + Math.max(1, c.gridSpan), 0)));
  if (!nCols) return;

  const colsPt = t.gridColsTwips.length
    ? t.gridColsTwips.map((tw) => tw / 20)
    : new Array(nCols).fill(cx.contentW / nCols);
  let totalW = colsPt.reduce((a, b) => a + b, 0);
  if (totalW > cx.contentW && totalW > 0) {
    const f = cx.contentW / totalW;
    for (let i = 0; i < colsPt.length; i++) colsPt[i] *= f;
    totalW = cx.contentW;
  }
  const colX = [cx.marL];
  for (const w of colsPt) colX.push(colX[colX.length - 1] + w);

  const borderColor = hexColor('#808080');

  for (const row of t.rows) {
    let rowH = 0;
    let col = 0;
    const cellSpans = [];
    for (const cell of row.cells) {
      let span = Math.max(1, cell.gridSpan);
      if (col + span > colsPt.length) span = Math.max(1, colsPt.length - col);
      cellSpans.push({ cell, c0: col, span });
      const cellW = colX[Math.min(col + span, colX.length - 1)] - colX[col] - 2 * CELL_PAD;
      const h = measureCell(cx, cell, cellW);
      rowH = Math.max(rowH, h + 2 * CELL_PAD);
      col += span;
    }
    if (rowH === 0) rowH = 2 * CELL_PAD + 11 * LINE_FACTOR;

    if (cx.y + rowH > cx.pageBottom && cx.y > cx.marT) cx.newPage();
    const rowTop = cx.y;

    for (const { cell, c0, span } of cellSpans) {
      const xL = colX[c0];
      const xR = colX[Math.min(c0 + span, colX.length - 1)];
      if (cell.shadingHex) cx.page.fillRect(xL, rowTop, xR - xL, rowH, hexColor(cell.shadingHex));
      cx.page.line(xL, rowTop, xR, rowTop, borderColor, 0.5);
      cx.page.line(xL, rowTop + rowH, xR, rowTop + rowH, borderColor, 0.5);
      cx.page.line(xL, rowTop, xL, rowTop + rowH, borderColor, 0.5);
      cx.page.line(xR, rowTop, xR, rowTop + rowH, borderColor, 0.5);
      drawCell(cx, cell, xL + CELL_PAD, rowTop + CELL_PAD, xR - xL - 2 * CELL_PAD);
    }
    cx.y = rowTop + rowH;
  }
}

function measureCell(cx, cell, cellW) {
  let h = 0;
  for (const p of cell.paragraphs) {
    const style = styleOf(cx, p);
    const heading = headingLevel(p);
    const runs = effectiveRuns(p, style, heading);
    h += layoutParagraph(cx, runs, null, 'left', 0, Math.max(1, cellW), 0, 0, false, false, 0);
  }
  return h;
}

function drawCell(cx, cell, x, yTop, cellW) {
  let y = yTop;
  for (const p of cell.paragraphs) {
    const style = styleOf(cx, p);
    const heading = headingLevel(p);
    const runs = effectiveRuns(p, style, heading);
    const align = p.props.alignment ?? style?.para?.alignment ?? 'left';
    y += layoutParagraph(cx, runs, null, align, x, Math.max(1, cellW), 0, 0, false, true, y);
  }
}
