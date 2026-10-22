export { DocxPackage } from './package.js';
export { readEmbeddedFonts, deobfuscateFont, type EmbeddedFont } from './fonts.js';
export { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
export {
  readDocument,
  syncImageFromXml,
  DEFAULT_RUN_PROPS,
  type DocumentModel,
  type Paragraph,
  type Run,
  type RunProps,
  type ParaProps,
  type ParaTabStop,
  type TabLeader,
  type NumberingProps,
  type SectPr,
  type PageBorders,
  type SectionType,
  type ChapterSeparator,
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
  revInfo,
  type FormatChange,
  type ParaFormatChange,
  isMarkRun,
  type BookmarkMark,
} from './document.js';
export * from './ooxml/props.js';
export * from './ooxml/parts.js';
export type { DrawingAnchor, AnchorPos, ShapeStyle, WrapType, CustPath, CustCmd } from './drawing.js';
export {
  readFullDocument,
  readHeaderFooterPart,
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
  noteRefIds,
} from './fulldoc.js';
export { SourceStore, runSig, type ParaSource, type RunSource, type TableSource, type StorySource, type StoryGroup, type SegSource, type NotesPartSource } from './source.js';
export {
  NOTE_STYLES, NOTE_REF_TEXT, ensureNoteParts, emptyNotesPart, patchSettingsNotes, notePropsXml, sameNoteProps, noteRefRun,
  newNoteParagraphs, noteMarkField, type NoteKind,
} from './notes.js';
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
  withoutRevisions,
  insertIndex,
  splitAt,
} from './model-ops.js';
export {
  sectionRanges, sectionIndexAt, sectionSectPr, sectionRefs, insertSectionBreak, insertPageBreakParagraph, columnsFor, presetColumns,
  columnsPresetOf, columnWidths, contentWidth, maxColumns, setOrientation, COLUMN_SPACE_DEFAULT, COLUMN_MIN_WIDTH,
  type SectionRange, type InsertSectionBreakOptions, type ColumnSpec, type ColumnPreset,
} from './section-ops.js';
export {
  newRevision,
  runFormatting,
  paraFormatting,
  isDeletedRun,
  finalRuns,
  finalParagraphs,
  finalBlocks,
  paragraphHasRevisions,
  collectRevisions,
  revisionAt,
  spanScope,
  acceptRevisions,
  rejectRevisions,
  trackInsertText,
  trackInsertRun,
  trackSplitParagraph,
  trackDelete,
  trackApplyRunProps,
  trackApplyParaProps,
  revisionAuthors,
  type RevisionKind,
  type RevisionSpan,
  type RevisionScope,
  type TrackedDelete,
} from './revisions.js';
export { readTrackRevisions, writeTrackRevisions } from './rev-xml.js';
export { writeDefaultTabStop, writeEvenAndOddHeaders } from './settings-xml.js';
export { copyHfPartXml, hfPartXml, pageNumberGroupIds, dropUnusedHfParts, HF_NS } from './hf-ops.js';
export {
  serializeDocument,
  serializeBlocks,
  tableXml,
  writeDocument,
  serializeHfPart,
  type HfPartInfo,
  type WriteOptions,
  type CommentOut,
  type NotesOut,
} from './serialize.js';
export { readStyles, readStylesXml, type StylesMap, type ResolvedStyle } from './styles.js';
export { blankDocxPackage, BLANK_STYLES_XML } from './blank.js';
export {
  readStyleIndex, styleRaw, putStyle, dropStyle, setLatentQFormat, styleIdFromName, newStyleXml, patchStyleXml, styleKid,
  patchStyleRPr, patchStylePPr, hasRunChanges, hasParaChanges, builtinStyle, builtinStyles, builtinDisplayName, builtinXml, STYLE_ORDER,
  type StyleMeta, type LatentMeta, type StyleType, type NewStyle, type StyleHead, type StyleFormat, type Change, type BuiltinStyle,
} from './style-sheet.js';
export { isWordBinary, convertDocToDocx, DocFormatError } from './doc/index.js';
export {
  readPictureFormat, patchPicture, newPictureXml, readDmlColor, dmlColorXml, dmlColorSpec, picLineXml, shadowXml, reflectionXml,
  effectLstXml, scene3dXml, sp3dXml, readPicLine, DEFAULT_WRAP_POLYGON, EMU_PER_PT, EMU_PER_TW,
  type PictureFormat, type PictureChange, type PicWrapKind, type PicPos, type PicLine, type PicShadow, type PicReflection,
  type PicEffects, type Pic3D, type PicBlipFx, type DmlColor,
} from './picture-xml.js';
export * as tableOps from './table-ops.js';
export type { CellRect, GridCell, TableMap, NewTableOptions, BorderKind, TextSeparator, MergeOptions, SplitOptions } from './table-ops.js';
export { tblPrXml, trPrXml, tcPrXml as tcPrTypedXml, patchTblPr, patchTrPr, patchTcPr, deepEq } from './table-xml.js';
export {
  evaluateFormula, formatFormulaResult, formatPicture, parseCellNumber, defaultFormula, formulaInstr, parseFormulaInstr,
  formulaResultText, cellText, FORMULA_ERRORS, FORMULA_FUNCTIONS, type CellNumber, type FormulaEnv,
} from './table-formula.js';
export {
  sortTable, sortParagraphsOrder, canSortTable, parseSortDate, parseSortNumber, SORT_MERGED_ERROR,
  type SortKey, type SortOptions, type SortType,
} from './table-sort.js';
export {
  TABLE_STYLE_CONDS, patchTableStyleXml, newTableStyleXml, retitleTableStyleXml,
  type TableStyleCond, type TableCondFormat, type TableStyleSide,
} from './table-style-edit.js';
export { CORE_TABLE_STYLES, ensureTableStyle, addStylesXml, localStyleId, styleDefOf, styleIdByName, loadBuiltinTableStyles, materializeStyleXml, themeHex, type BuiltinTableStyle } from './table-styles.js';
