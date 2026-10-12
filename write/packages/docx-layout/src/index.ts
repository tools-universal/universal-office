export { layoutDocument } from './engine.js';
export { DocContext, emptyFormatting, directRPr, directPPr, type LayoutOptions } from './context.js';
export { FaceResolver, faceMetrics, deviceEmPt, parsePostScriptName, withEmbeddedFonts, type FontFace, type FontProvider, type FaceMetrics, type EmbeddedFace } from './fonts.js';
export { StyleResolver, cascadeRPr, mergePPr, mergeRPr, resolveColor, resolveDrawingColor, fontOfSlot } from './resolve.js';
export { NumberingState, formatNumber } from './numbering.js';
export { renderPdf, type PdfRenderOptions } from './pdf.js';
export type {
  LayoutResult, LayoutPage, PageItem, GlyphRunItem, RectItem, LineItem, ImageItem, ShapeItem, ClipItem, LaidOutLine,
  PathItem, PathCmdTw, XformItem, PlacedObject,
} from './tree.js';
export { documentHyphenationLanguages } from './hyphenate.js';
