import { unzipSync } from 'fflate';
import { toUint8Array, type BinaryInput } from './binary.js';

export type SupportedFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf';

function startsWith(bytes: Uint8Array, ascii: string): boolean {
  return ascii.length <= bytes.length && [...ascii].every((c, i) => bytes[i] === c.charCodeAt(0));
}

/** Detects PDF and OOXML formats from their contents, never from a filename. */
export function detectFormat(input: BinaryInput): SupportedFormat {
  const bytes = toUint8Array(input);
  if (startsWith(bytes, '%PDF-')) return 'pdf';
  if (!startsWith(bytes, 'PK')) throw new Error('Unsupported input: expected PDF, DOCX, XLSX, or PPTX bytes');

  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); }
  catch (cause) { throw new Error('Invalid OOXML ZIP container', { cause }); }

  const names = new Set(Object.keys(files).map((name) => name.replace(/\\/g, '/')));
  if (names.has('word/document.xml')) return 'docx';
  if (names.has('xl/workbook.xml')) return 'xlsx';
  if (names.has('ppt/presentation.xml')) return 'pptx';
  throw new Error('Unsupported ZIP container: no DOCX, XLSX, or PPTX main part found');
}
