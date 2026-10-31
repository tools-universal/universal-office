import { toUint8Array, type BinaryInput } from '../binary.js';

export interface PdfMarkdownOptions {
  /** 1-based page numbers. Default: every page. */
  pages?: number[];
  /** Adds `## Page N` headings. Default: true for multi-page PDFs. */
  pageHeadings?: boolean;
  /** Infers Markdown headings from text size. Default: true. */
  inferHeadings?: boolean;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
}

interface PositionedText {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
}

interface TextLine {
  text: string;
  y: number;
  size: number;
  bold: boolean;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}\[\]<>|])/g, '\\$1');
}

function median(values: number[]): number {
  if (!values.length) return 12;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function joinItems(items: PositionedText[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = '';
  let right = 0;
  for (const item of sorted) {
    const gap = item.x - right;
    if (out && gap > Math.max(1.2, item.size * 0.12) && !/^[,.;:!?%)\]}]/.test(item.text)) out += ' ';
    out += item.text;
    right = Math.max(right, item.x + item.width);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function makeLines(items: PositionedText[]): TextLine[] {
  const groups: PositionedText[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const group = groups.find((candidate) => {
      const y = candidate.reduce((sum, value) => sum + value.y, 0) / candidate.length;
      const size = Math.max(item.size, ...candidate.map((value) => value.size));
      return Math.abs(y - item.y) <= Math.max(1.5, size * 0.35);
    });
    if (group) group.push(item); else groups.push([item]);
  }
  return groups
    .map((group) => ({
      text: joinItems(group),
      y: group.reduce((sum, value) => sum + value.y, 0) / group.length,
      size: Math.max(...group.map((value) => value.size)),
      bold: group.filter((value) => value.bold).length * 2 >= group.length,
    }))
    .filter((line) => line.text.length > 0)
    .sort((a, b) => b.y - a.y);
}

function listLine(text: string): string | undefined {
  const bullet = text.match(/^[•●▪◦‣⁃]\s*(.*)$/u);
  if (bullet) return `- ${escapeMarkdown(bullet[1]!)}`;
  const numbered = text.match(/^(\d+)[.)]\s+(.*)$/);
  if (numbered) return `${numbered[1]}. ${escapeMarkdown(numbered[2]!)}`;
  return undefined;
}

function linesToMarkdown(lines: TextLine[], inferHeadings: boolean): string {
  if (!lines.length) return '';
  const bodySize = median(lines.map((line) => line.size).filter((size) => size > 0));
  const blocks: string[] = [];
  let paragraph = '';
  let previous: TextLine | undefined;
  const flush = (): void => {
    if (paragraph) blocks.push(paragraph);
    paragraph = '';
  };

  for (const line of lines) {
    const listed = listLine(line.text);
    const isHeading = inferHeadings && line.text.length <= 160 &&
      (line.size >= bodySize * 1.35 || (line.bold && line.size >= bodySize * 1.12));
    if (listed) {
      flush();
      if (blocks.length && /^[-\d]/.test(blocks.at(-1)!) && !blocks.at(-1)!.includes('\n\n')) {
        blocks[blocks.length - 1] += `\n${listed}`;
      } else blocks.push(listed);
    } else if (isHeading) {
      flush();
      const level = line.size >= bodySize * 1.8 ? 1 : line.size >= bodySize * 1.45 ? 2 : 3;
      blocks.push(`${'#'.repeat(level)} ${escapeMarkdown(line.text)}`);
    } else {
      const gap = previous ? previous.y - line.y : 0;
      if (paragraph && gap > Math.max(previous!.size, line.size) * 1.65) flush();
      paragraph += `${paragraph ? ' ' : ''}${escapeMarkdown(line.text)}`;
    }
    previous = line;
  }
  flush();
  return blocks.join('\n\n');
}

/** Converts PDF text to Markdown in Node.js and modern browsers via PDF.js. */
export async function pdfToMarkdown(input: BinaryInput, options: PdfMarkdownOptions = {}): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = toUint8Array(input).slice();
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  const selected = options.pages ?? Array.from({ length: document.numPages }, (_, index) => index + 1);
  const pageHeadings = options.pageHeadings ?? document.numPages > 1;
  const pages: string[] = [];

  try {
    for (const pageNumber of selected) {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document.numPages) {
        throw new RangeError(`PDF page out of range: ${pageNumber}`);
      }
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const styles = content.styles as Record<string, { fontFamily?: string }>;
      const items = (content.items as unknown[])
        .filter((item): item is PdfTextItem => typeof (item as PdfTextItem).str === 'string')
        .map((item) => {
          const family = styles[item.fontName]?.fontFamily ?? item.fontName;
          const size = Math.max(Math.abs(item.transform[0] ?? 0), Math.abs(item.transform[3] ?? 0), item.height || 0);
          return {
            text: item.str,
            x: item.transform[4] ?? 0,
            y: item.transform[5] ?? 0,
            width: item.width || 0,
            size: size || 12,
            bold: /bold|black|heavy|semibold/i.test(family),
          } satisfies PositionedText;
        })
        .filter((item) => item.text.trim().length > 0);
      const body = linesToMarkdown(makeLines(items), options.inferHeadings ?? true);
      pages.push(`${pageHeadings ? `## Page ${pageNumber}${body ? '\n\n' : ''}` : ''}${body}`.trim());
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.filter(Boolean).join('\n\n---\n\n').trim() + '\n';
}
