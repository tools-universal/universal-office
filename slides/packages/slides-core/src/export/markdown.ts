import {
  pptxToMarkdown as convertPptxToMarkdown,
  type PptxMarkdownOptions,
} from '@universal-office/converter';

export type MarkdownOptions = PptxMarkdownOptions;

/** Compatibility adapter. The implementation lives in @universal-office/converter. */
export function pptxToMarkdown(bytes: Uint8Array, opts: MarkdownOptions = {}): string {
  return convertPptxToMarkdown(bytes, opts);
}
