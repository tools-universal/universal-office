/**
 * @universal/slides-export — exportadores do slides (spec 05, SEM vídeo):
 * .pptx (bytes) → Markdown, HTML estático, PDF vetorial e PNGs por slide.
 * Browser + node (sem fs/DOM obrigatórios; canvas injetável no node).
 */
export { pptxToMarkdown, type MarkdownOptions } from './markdown.js';
export { pptxToHtml, type HtmlOptions } from './html.js';
export { pptxToPdf, type SlidesPdfOptions, type PdfFontSource } from './pdf.js';
export {
  pptxToImages,
  type SlidesImagesOptions, type CanvasLike, type CanvasFactory, type ImageDecoder,
} from './images.js';
export { loadDeck, readNotes, slideTitle, dataUri, base64, type Deck, type DeckSlide } from './model.js';
export { decodePng, jpegSize, type DecodedPng } from './raster.js';
export { TtfProgram } from './sfnt.js';
