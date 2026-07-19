// @universal-office/export — exportadores do modelo Write para formatos legíveis.
// HTML e Markdown trabalham direto sobre o modelo (não paginados, "melhores que
// o app de referência" para a web). A exportação paginada (PDF/XPS) reaproveita o layout do
// editor e vive no componente <universal-write>.
export { toHtml, type HtmlOptions } from './html.js';
export { toMarkdown, type MarkdownOptions } from './markdown.js';
export { docxToMarkdown, docxToHtml, exportDocFromFullDocument } from './from-docx.js';
export {
  type ExportDoc,
  type OrderedBlock,
  orderedBlocks,
  headingLevel,
  paraPlainText,
} from './model.js';
