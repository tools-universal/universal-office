import { DocxPackage, readFullDocument } from '@universal-office/docs-processing';
import { PdfDocument, type PlacedGlyph } from '../pdf-writer/index.js';
import { TtfProgram } from '../xlsx/sfnt.js';
import { exportDocFromFullDocument } from './from-docx.js';
import { headingLevel, orderedBlocks } from './model.js';

export interface DocxPdfFontSource { bytes: Uint8Array; name?: string }
export interface DocxPdfOptions { fonts?: DocxPdfFontSource[]; marginPt?: number }

function textWidth(text: string, font: TtfProgram, size: number): number {
  let units = 0;
  for (const char of text) units += font.advanceWidth(font.glyphId(char.codePointAt(0)!));
  return units * size / font.unitsPerEm;
}

function wrap(text: string, width: number, font: TtfProgram, size: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, font, size) > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Basic vector DOCX→PDF path shared by Node.js and browsers. */
export function docxToPdf(bytes: Uint8Array, options: DocxPdfOptions = {}): Uint8Array {
  const source = options.fonts?.[0];
  if (!source) throw new Error('docxToPdf: options.fonts must contain at least one TrueType font');
  const program = new TtfProgram(source.bytes);
  const pdf = new PdfDocument();
  const embedded = pdf.embedFont(source.name ?? 'DocumentFont', source.bytes, program);
  const margin = options.marginPt ?? 54;
  const pageWidth = 595.276;
  const pageHeight = 841.89;
  let page = pdf.addPage(pageWidth, pageHeight);
  let y = margin;

  const draw = (text: string, size: number, gapAfter = 6): void => {
    for (const line of wrap(text, pageWidth - margin * 2, program, size)) {
      if (y + size * 1.4 > pageHeight - margin) { page = pdf.addPage(pageWidth, pageHeight); y = margin; }
      const glyphs: PlacedGlyph[] = [];
      let x = margin;
      for (const char of line) {
        const codePoint = char.codePointAt(0)!;
        const gid = program.glyphId(codePoint);
        glyphs.push({ gid, codePoint, xPt: x, baselineFromTopPt: y + size });
        x += program.advanceWidth(gid) * size / program.unitsPerEm;
      }
      page.glyphs(embedded, size, [0, 0, 0], glyphs);
      y += size * 1.35;
    }
    y += gapAfter;
  };

  const doc = exportDocFromFullDocument(readFullDocument(DocxPackage.load(bytes)));
  for (const block of orderedBlocks(doc)) {
    if (block.kind === 'table') {
      for (const row of block.t.rows) {
        draw(row.cells.map((cell) => cell.paragraphs.flatMap((p) => p.runs).map((run) => run.text).join(' ')).join(' | '), 9, 2);
      }
      y += 5;
    } else {
      const text = block.p.runs.map((run) => run.text || (run.image ? '[image]' : '')).join('').trim();
      if (!text) { y += 6; continue; }
      const level = headingLevel(block.p);
      draw(text, level ? Math.max(14, 24 - level * 2) : 11, level ? 9 : 5);
    }
  }
  return pdf.build();
}
