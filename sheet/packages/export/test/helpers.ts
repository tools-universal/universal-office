/**
 * Fábrica de .xlsx sintéticos para os testes (esparsidade, escaping, merges) —
 * montados com o próprio XlsxPackage (fflate por baixo), sem fixtures binárias.
 */
import { XlsxPackage } from '@universal-office/sheet-core';

export interface SynthSheet {
  name: string;
  /** XML completo da parte xl/worksheets/sheetN.xml. */
  xml: string;
}

/** Monta um pacote .xlsx com as planilhas dadas (e styles.xml opcional). */
export function makeXlsx(sheets: SynthSheet[], stylesXml?: string, activeTab?: number): Uint8Array {
  const pkg = XlsxPackage.empty();
  const overrides = sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('');
  pkg.setPartText('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    overrides +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>');
  const sheetRefs = sheets
    .map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  const bookViews = activeTab !== undefined ? `<bookViews><workbookView activeTab="${activeTab}"/></bookViews>` : '';
  pkg.setPartText('xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    bookViews + `<sheets>${sheetRefs}</sheets>` +
    '</workbook>');
  const rels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  pkg.setPartText('xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>');
  sheets.forEach((s, i) => pkg.setPartText(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
  if (stylesXml) pkg.setPartText('xl/styles.xml', stylesXml);
  return pkg.save();
}

/** Worksheet XML com o conteúdo de <sheetData> (+ extras após, ex.: mergeCells). */
export function sheetXml(sheetData: string, extras = '', pre = ''): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    pre + `<sheetData>${sheetData}</sheetData>` + extras +
    '</worksheet>';
}

/** Célula de string inline (não precisa de sharedStrings.xml). */
export function inlineStr(ref: string, text: string, style?: number): string {
  const esc = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
  const s = style !== undefined ? ` s="${style}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc}</t></is></c>`;
}

/** styles.xml com xfs úteis aos testes:
 *  s=0 General; s=1 #,##0.00; s=2 dd/mm/yyyy (custom 164);
 *  s=3 negrito+fill amarelo+borda thin+centro; s=4 fonte 14 azul itálico. */
export const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>' +
  '<fonts count="3">' +
  '<font><sz val="11"/><name val="Aptos Narrow"/></font>' +
  '<font><b/><sz val="11"/><name val="Aptos Narrow"/></font>' +
  '<font><i/><sz val="14"/><color rgb="FF0000FF"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border/>' +
  '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right>' +
  '<top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border>' +
  '</borders>' +
  '<cellXfs count="5">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>' +
  '</cellXfs>' +
  '</styleSheet>';
