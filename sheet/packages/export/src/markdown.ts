import { xlsxToMarkdown as convertXlsxToMarkdown } from '@tools-universal/office-converter';
import type { SheetExportInput, SheetExportOptions } from './model.js';

/** Compatibility adapter. The implementation lives in office-converter. */
export function xlsxToMarkdown(input: SheetExportInput, opts: SheetExportOptions = {}): string {
  return convertXlsxToMarkdown(
    input as Parameters<typeof convertXlsxToMarkdown>[0],
    opts as Parameters<typeof convertXlsxToMarkdown>[1],
  );
}
