import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  convert,
  createOfficeConverter,
  detectFormat,
  docxToMarkdown,
  pdfToMarkdown,
  pptxToMarkdown,
  xlsxToMarkdown,
} from '../src/index.js';

const fixture = (name: string): Uint8Array =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)));

function simplePdf(): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length 74 >>\nstream\nBT /F1 24 Tf 72 720 Td (PDF heading) Tj 0 -40 Td /F1 12 Tf (Hello PDF) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

describe('format detection and OOXML conversion', () => {
  it.each([
    ['synthetic.docx', 'docx'],
    ['showcase.xlsx', 'xlsx'],
    ['reference.pptx', 'pptx'],
  ] as const)('detects %s', (name, format) => {
    expect(detectFormat(fixture(name))).toBe(format);
  });

  it('converts DOCX', () => expect(docxToMarkdown(fixture('synthetic.docx'))).toContain('Documento sintético'));
  it('converts XLSX', () => expect(xlsxToMarkdown(fixture('showcase.xlsx'))).toContain('##'));
  it('converts PPTX', () => expect(pptxToMarkdown(fixture('reference.pptx'))).toContain('## Slide 1'));

  it.each(['synthetic.docx', 'showcase.xlsx', 'reference.pptx'])('converts %s to HTML through the registry', async (name) => {
    expect(await convert(fixture(name), { to: 'html' })).toMatch(/^<!doctype html>/i);
  });
});

describe('PDF conversion', () => {
  it('extracts headings and body text', async () => {
    const pdf = simplePdf();
    expect(detectFormat(pdf)).toBe('pdf');
    const markdown = await pdfToMarkdown(pdf);
    expect(markdown).toContain('PDF heading');
    expect(markdown).toContain('Hello PDF');
    expect(await convert(pdf, { to: 'markdown' })).toBe(markdown);
    expect(await convert(pdf, { to: 'html' })).toContain('<!doctype html>');
    expect(await convert(pdf, { to: 'pdf' })).toEqual(pdf);
  }, 15_000);
});

describe('extensible source/target registry', () => {
  it('registers a future target without changing the built-ins', async () => {
    const converter = createOfficeConverter().register('docx', 'text', () => 'plain text');
    expect(converter.canConvert('docx', 'text')).toBe(true);
    expect(await converter.convert(fixture('synthetic.docx'), { to: 'text' })).toBe('plain text');
  });
});
