import {
  pptxToHtml as convertPptxToHtml,
  type PptxHtmlOptions,
} from '@universal-office/converter';

export type HtmlOptions = PptxHtmlOptions;

/** Compatibility adapter. The implementation lives in @universal-office/converter. */
export function pptxToHtml(bytes: Uint8Array, opts: HtmlOptions = {}): string {
  return convertPptxToHtml(bytes, opts);
}
