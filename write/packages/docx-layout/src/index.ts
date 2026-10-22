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
  PathItem, PathCmdTw, XformItem, PlacedObject, ObjectFrame, PlacedCell, PictureLook,
} from './tree.js';
export { documentHyphenationLanguages } from './hyphenate.js';
export { paintItems, paintPageBackground, type EnginePaintEnv } from './canvas.js';
export { resolvePageFill, gradientTileRgba, patternRgba, pageFillTileTw, fillParam, imagePixelInfo, type PageFillPaint } from './page-fill.js';
export { paintPicture } from './canvas-picture.js';
export { pictureLook, applyBlipFx } from './picture.js';
export { applyImageEffects, applyPictureAdjust } from './images.js';
export { paragraphAtPath, cellAtGrid, cellBlocks } from './refs.js';
export { AUTHOR_PALETTE, MOVE_COLOR, RevisionDisplay, authorColor, type RevisionMode, type RevisionView } from './revisions.js';
export { documentOutline, outlineLevelOf, headingText, numberedItems, outlineParagraphs, type OutlineHeading, type NumberedItem, type OutlineParagraph } from './outline.js';
export { inheritedPPr, effectivePPr } from './paraformat.js';
export { formatWordDate, dateFieldValue } from './datefmt.js';
