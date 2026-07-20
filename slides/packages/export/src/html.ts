import {
  pptxToHtml as convertPptxToHtml,
  type PptxHtmlOptions,
} from '@tools-universal/office-converter';

export type HtmlOptions = PptxHtmlOptions;

/** Compatibility adapter. The implementation lives in office-converter. */
export function pptxToHtml(bytes: Uint8Array, opts: HtmlOptions = {}): string {
  return convertPptxToHtml(bytes, opts);
}
