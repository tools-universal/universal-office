import type { BinaryInput } from '../binary.js';
import { pdfToMarkdown, type PdfMarkdownOptions } from './markdown.js';

export type PdfHtmlOptions = PdfMarkdownOptions;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Produces a readable standalone HTML document from PDF text extraction. */
export async function pdfToHtml(input: BinaryInput, options: PdfHtmlOptions = {}): Promise<string> {
  const text = await pdfToMarkdown(input, { ...options, inferHeadings: false, pageHeadings: false });
  return '<!doctype html>\n<html><head><meta charset="utf-8"><title>PDF</title>' +
    '<style>body{max-width:72rem;margin:2rem auto;padding:0 1rem;font:16px/1.55 system-ui,sans-serif;white-space:pre-wrap}</style>' +
    `</head><body>${escapeHtml(text.trim())}</body></html>\n`;
}
