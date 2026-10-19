/**
 * sheet-core/export — exportadores do sheet: CSV, TSV, Markdown, HTML e
 * PDF a partir de bytes .xlsx ou de um modelo já lido. Browser+Node (sem
 * fs/path/DOM); valores exibidos sempre via formatValue com PT_BR por default.
 */
export {
  loadModel,
  displayValue,
  buildGrid,
  selectSheets,
  colWidthPx,
  colWidthsPx,
  rowHeightsPt,
  type SheetModel,
  type SheetExportInput,
  type SheetExportOptions,
  type SheetGrid,
  type GridCell,
  type GridMerge,
  type SelectedSheet,
  type DisplayValue,
} from './model.js';
export { xlsxToCsv, xlsxToTsv, type CsvOptions } from './csv.js';
export { xlsxToMarkdown } from './markdown.js';
export { xlsxToHtml, type HtmlOptions } from './html.js';
export { xlsxToPdf, type SheetPdfOptions, type PdfFontSource } from './pdf.js';
export { xlsxToOds } from './ods.js';
export { xlsxToXml2003 } from './xml2003.js';
export { typedValue, isDateTimeCode, type TypedValue, type TypedKind } from './cellvalue.js';
