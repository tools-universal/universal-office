export {
  diffBlocks,
  diffDocuments,
  intraWordMarks,
  DEFAULT_DOC_DIFF_OPTIONS,
  type BlockRange,
  type DocDiff,
  type DocDiffOptions,
  type DocDiffStats,
  type DocEdit,
  type DocEditKind,
  type DocIntraEdit,
  type TableRowEdit,
} from './diff.js';
export { myersDiff, type DiffOp, type EqFn } from './myers.js';
export { histogramDiff } from './histogram.js';
export {
  tokenizeBlock,
  tokenizeBlocks,
  tokensEqual,
  bytesEqual,
  fnv1a,
  type BlockToken,
} from './tokens.js';
export { UniversalWriteDiffElement } from './universal-write-diff.js';
// leitura do .docx para loadDocuments() (o mesmo modelo que o diff usa)
export { DocxPackage, readFullDocument, type FullDocument } from '@universal-office/docx-core';
