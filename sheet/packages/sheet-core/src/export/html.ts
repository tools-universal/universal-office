import {
  xlsxToHtml as convertXlsxToHtml,
  type XlsxHtmlOptions,
} from '@universal-office/converter';
import type { SheetExportInput } from './model.js';

export type HtmlOptions = XlsxHtmlOptions;

/** Compatibility adapter. The implementation lives in @universal-office/converter. */
export function xlsxToHtml(input: SheetExportInput, opts: HtmlOptions = {}): string {
  return convertXlsxToHtml(input as Parameters<typeof convertXlsxToHtml>[0], opts);
}
