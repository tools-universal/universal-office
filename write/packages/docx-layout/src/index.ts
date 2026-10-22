// Base tipográfica (fontes TTF/OTF, quebra de linha, hifenização, layout antigo
// do canvas) e o gerador de PDF fazem parte do motor — antes eram os pacotes
// @universal-office/layout e @universal-office/pdf.
export * from './typography/index.js';
export * from './pdf-writer/index.js';
export { layoutDocument } from './engine.js';
export { DocContext, emptyFormatting, directRPr, directPPr, type LayoutOptions } from './context.js';
export { FaceResolver, faceMetrics, deviceEmPt, parsePostScriptName, withEmbeddedFonts, type FontFace, type FontProvider, type FaceMetrics, type EmbeddedFace } from './fonts.js';
export { StyleResolver, cascadeRPr, mergePPr, mergeRPr, resolveColor, resolveDrawingColor, fontOfSlot } from './resolve.js';
export { NumberingState, formatNumber } from './numbering.js';
export { renderPdf, type PdfRenderOptions } from './pdf.js';
export type {
  LayoutResult, LayoutPage, PageItem, GlyphRunItem, RectItem, LineItem, ImageItem, ShapeItem, ClipItem, LaidOutLine, LineParaFormat,
  PathItem, PathCmdTw, XformItem, PlacedObject, PlacedCell,
} from './tree.js';
export { documentHyphenationLanguages } from './hyphenate.js';
export { paintItems, type EnginePaintEnv } from './canvas.js';
export { paragraphAtPath, cellAtGrid, cellBlocks } from './refs.js';
export { AUTHOR_PALETTE, MOVE_COLOR, RevisionDisplay, authorColor, type RevisionMode, type RevisionView } from './revisions.js';
export { documentOutline, outlineLevelOf, headingText, numberedItems, type OutlineHeading, type NumberedItem } from './outline.js';
export { inheritedPPr, effectivePPr } from './paraformat.js';
export { formatWordDate, dateFieldValue } from './datefmt.js';
