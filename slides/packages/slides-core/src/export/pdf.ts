import {
  pptxToPdf as convertPptxToPdf,
  type PptxPdfOptions,
} from '@universal-office/converter';

export type SlidesPdfOptions = PptxPdfOptions;
export type PdfFontSource = NonNullable<PptxPdfOptions['fonts']>[number];

/** Compatibility adapter. The implementation lives in @universal-office/converter. */
export function pptxToPdf(bytes: Uint8Array, opts: SlidesPdfOptions = {}): Uint8Array {
  return convertPptxToPdf(bytes, opts);
}
