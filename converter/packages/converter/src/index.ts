import { toUint8Array, type BinaryInput } from './binary.js';
import { detectFormat, type SupportedFormat } from './detect.js';
import { docxToHtml, docxToMarkdown } from './docx/from-docx.js';
import { docxToPdf } from './docx/pdf.js';
import { xlsxToHtml } from './xlsx/html.js';
import { xlsxToMarkdown } from './xlsx/markdown.js';
import { xlsxToPdf } from './xlsx/pdf.js';
import { pptxToHtml } from './pptx/html.js';
import { pptxToMarkdown } from './pptx/markdown.js';
import { pptxToPdf } from './pptx/pdf.js';
import { pdfToHtml } from './pdf/html.js';
import { pdfToMarkdown } from './pdf/markdown.js';

export type { BinaryInput, SupportedFormat };
export { detectFormat, docxToHtml, docxToMarkdown, docxToPdf, xlsxToHtml, xlsxToMarkdown, xlsxToPdf, pptxToHtml, pptxToMarkdown, pptxToPdf, pdfToHtml, pdfToMarkdown };
export type { HtmlOptions as DocxHtmlOptions } from './docx/html.js';
export type { MarkdownOptions as DocxMarkdownOptions } from './docx/markdown.js';
export type { DocxPdfOptions } from './docx/pdf.js';
export type { HtmlOptions as XlsxHtmlOptions } from './xlsx/html.js';
export type { SheetExportOptions as XlsxMarkdownOptions } from './xlsx/model.js';
export type { SheetPdfOptions as XlsxPdfOptions } from './xlsx/pdf.js';
export type { HtmlOptions as PptxHtmlOptions } from './pptx/html.js';
export type { MarkdownOptions as PptxMarkdownOptions } from './pptx/markdown.js';
export type { SlidesPdfOptions as PptxPdfOptions } from './pptx/pdf.js';
export type { PdfHtmlOptions } from './pdf/html.js';
export type { PdfMarkdownOptions } from './pdf/markdown.js';
export { toHtml as docxModelToHtml } from './docx/html.js';
export { toMarkdown as docxModelToMarkdown } from './docx/markdown.js';
export type { ExportDoc as DocxExportModel } from './docx/model.js';

/** Declaration-merging extension point for future built-in targets. */
export interface ConversionTargetMap {
  html: string;
  markdown: string;
  pdf: Uint8Array;
}

export type BuiltInTarget = keyof ConversionTargetMap;
export type ConversionOutput = string | Uint8Array;
export type ConverterHandler<T = ConversionOutput> = (input: Uint8Array, options?: unknown) => T | Promise<T>;

export interface ConversionRequest<TTarget extends string = BuiltInTarget> {
  from?: SupportedFormat | (string & {});
  to: TTarget;
  /** Passed unchanged to the selected format/target handler. */
  options?: unknown;
}

/** Registry-based converter: add source/target pairs without changing the core API. */
export class OfficeConverter {
  private readonly handlers = new Map<string, ConverterHandler>();

  register<T = ConversionOutput>(source: string, target: string, handler: ConverterHandler<T>): this {
    this.handlers.set(`${source}:${target}`, handler as ConverterHandler);
    return this;
  }

  canConvert(source: string, target: string): boolean {
    return this.handlers.has(`${source}:${target}`);
  }

  async convert<TTarget extends BuiltInTarget>(input: BinaryInput, request: ConversionRequest<TTarget>): Promise<ConversionTargetMap[TTarget]>;
  async convert(input: BinaryInput, request: ConversionRequest<string>): Promise<ConversionOutput>;
  async convert(input: BinaryInput, request: ConversionRequest<string>): Promise<ConversionOutput> {
    const bytes = toUint8Array(input);
    const source = request.from ?? detectFormat(bytes);
    const handler = this.handlers.get(`${source}:${request.to}`);
    if (!handler) throw new Error(`Unsupported conversion: ${source} -> ${request.to}`);
    return handler(bytes, request.options);
  }
}

export function createOfficeConverter(): OfficeConverter {
  return new OfficeConverter()
    .register('docx', 'html', (input, options) => docxToHtml(input, options as Parameters<typeof docxToHtml>[1]))
    .register('docx', 'markdown', (input, options) => docxToMarkdown(input, options as Parameters<typeof docxToMarkdown>[1]))
    .register('docx', 'pdf', (input, options) => docxToPdf(input, options as Parameters<typeof docxToPdf>[1]))
    .register('xlsx', 'html', (input, options) => xlsxToHtml(input, { fullDocument: true, ...(options as Parameters<typeof xlsxToHtml>[1]) }))
    .register('xlsx', 'markdown', (input, options) => xlsxToMarkdown(input, options as Parameters<typeof xlsxToMarkdown>[1]))
    .register('xlsx', 'pdf', (input, options) => xlsxToPdf(input, options as Parameters<typeof xlsxToPdf>[1]))
    .register('pptx', 'html', (input, options) => pptxToHtml(input, { fullDocument: true, ...(options as Parameters<typeof pptxToHtml>[1]) }))
    .register('pptx', 'markdown', (input, options) => pptxToMarkdown(input, options as Parameters<typeof pptxToMarkdown>[1]))
    .register('pptx', 'pdf', (input, options) => pptxToPdf(input, options as Parameters<typeof pptxToPdf>[1]))
    .register('pdf', 'html', (input, options) => pdfToHtml(input, options as Parameters<typeof pdfToHtml>[1]))
    .register('pdf', 'markdown', (input, options) => pdfToMarkdown(input, options as Parameters<typeof pdfToMarkdown>[1]))
    .register('pdf', 'pdf', (input) => input.slice());
}

export const defaultOfficeConverter = createOfficeConverter();

export function convert<TTarget extends BuiltInTarget>(input: BinaryInput, request: ConversionRequest<TTarget>): Promise<ConversionTargetMap[TTarget]>;
export function convert(input: BinaryInput, request: ConversionRequest<string>): Promise<ConversionOutput>;
export function convert(input: BinaryInput, request: ConversionRequest<string>): Promise<ConversionOutput> {
  return defaultOfficeConverter.convert(input, request);
}
