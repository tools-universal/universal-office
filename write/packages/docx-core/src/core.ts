export { DocxPackage } from './package.js';
export { readEmbeddedFonts, deobfuscateFont, type EmbeddedFont } from './fonts.js';
export { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
export {
  readDocument,
  DEFAULT_RUN_PROPS,
  type DocumentModel,
  type Paragraph,
  type Run,
  type RunProps,
  type ParaProps,
  type NumberingProps,
  type SectPr,
  type SectionType,
  type InlineImage,
  type DrawingTextbox,
  type NoteRef,
  type CustomInline,
  type MathNode,
  type MathZone,
  type BorderEdge,
  type ParagraphBorders,
  EMU_PER_TWIP,
  type DrawingShape,
  type DrawingGroup,
  type ImageEffects,
  runPropsFromRPr,
  editBaseProps,
  paraPropsFromPPr,
} from './document.js';
export * from './ooxml/props.js';
export * from './ooxml/parts.js';
export type { DrawingAnchor, AnchorPos, ShapeStyle, WrapType, CustPath, CustCmd } from './drawing.js';
export {
  readFullDocument,
  type FullDocument,
  type Block,
  type ParagraphBlock,
  type TableBlock,
  type TableRow,
  type TableCell,
  type Section,
  type HeaderFooterSet,
  type CommentInfo,
  type HfRef,
  type TableBorders,
  type SectionProps,
  readBlocksOf,
  readSectionProps,
  blockSrc,
  markSectionBreaks,
} from './fulldoc.js';
export { SourceStore, runSig, type ParaSource, type RunSource, type TableSource, type StorySource, type StoryGroup, type SegSource } from './source.js';
export {
  insertText,
  insertRun,
  deleteRange,
  splitParagraph,
  mergeWithPrevious,
  applyRunProps,
  applyParaProps,
  propsAt,
  selectionRunProps,
  normalizeParagraph,
  clearRunFormatting,
  clearRun,
  clearParaFormatting,
  clearPara,
  paraText,
  paraLength,
  comparePos,
  normalizeRange,
  type DocPosition,
  type DocRange,
} from './model-ops.js';
export {
  sectionRanges, sectionIndexAt, sectionSectPr, sectionRefs, insertSectionBreak, columnsFor, presetColumns,
  columnsPresetOf, columnWidths, contentWidth, maxColumns, setOrientation, COLUMN_SPACE_DEFAULT, COLUMN_MIN_WIDTH,
  type SectionRange, type InsertSectionBreakOptions, type ColumnSpec, type ColumnPreset,
} from './section-ops.js';
export {
  serializeDocument,
  serializeBlocks,
  tableXml,
  writeDocument,
  serializeHfPart,
  type HfPartInfo,
  type WriteOptions,
  type CommentOut,
} from './serialize.js';
export { readStyles, readStylesXml, type StylesMap, type ResolvedStyle } from './styles.js';
export { blankDocxPackage, BLANK_STYLES_XML } from './blank.js';
export {
  readStyleIndex, styleRaw, putStyle, dropStyle, setLatentQFormat, styleIdFromName, newStyleXml, patchStyleXml, styleKid,
  patchStyleRPr, patchStylePPr, hasRunChanges, hasParaChanges, builtinStyle, builtinStyles, builtinDisplayName, builtinXml, STYLE_ORDER,
  type StyleMeta, type LatentMeta, type StyleType, type NewStyle, type StyleHead, type StyleFormat, type Change, type BuiltinStyle,
} from './style-sheet.js';
export { isWordBinary, convertDocToDocx, DocFormatError } from './doc/index.js';
export * as tableOps from './table-ops.js';
export type { CellRect, GridCell, TableMap, NewTableOptions, BorderKind, TextSeparator, MergeOptions, SplitOptions } from './table-ops.js';
export { tblPrXml, trPrXml, tcPrXml as tcPrTypedXml, patchTblPr, patchTrPr, patchTcPr, deepEq } from './table-xml.js';
