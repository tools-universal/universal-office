import {
  xlsxToPdf as convertXlsxToPdf,
  type XlsxPdfOptions,
} from '@tools-universal/office-converter';
import type { SheetExportInput } from './model.js';

export type SheetPdfOptions = XlsxPdfOptions;
export type PdfFontSource = NonNullable<XlsxPdfOptions['fonts']>[number];

/** Compatibility adapter. The implementation lives in office-converter. */
export function xlsxToPdf(input: SheetExportInput, opts: SheetPdfOptions = {}): Uint8Array {
  return convertXlsxToPdf(input as Parameters<typeof convertXlsxToPdf>[0], opts);
}
