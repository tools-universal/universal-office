// @wordnext/export — exportadores do modelo WordNext para formatos legíveis.
// HTML e Markdown trabalham direto sobre o modelo (não paginados, "melhores que
// o Word" para a web). A exportação paginada (PDF/XPS) reaproveita o layout do
// editor e vive no componente <word-next>.
export { toHtml, type HtmlOptions } from './html.js';
export { toMarkdown, type MarkdownOptions } from './markdown.js';
export {
  type ExportDoc,
  type OrderedBlock,
  orderedBlocks,
  headingLevel,
  paraPlainText,
} from './model.js';
