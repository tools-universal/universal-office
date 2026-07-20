// Gera samples/smoke.xlsx exercitando os comportamentos novos do renderer:
// transbordo de texto, ####, negativo [Red], números pt-BR, datas, sublinhado.
import { zipSync, strToU8 } from '../../node_modules/fflate/esm/browser.js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../samples/smoke.xlsx');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// styles: numFmts 164=#,##0.00 165=0.00;[Red]-0.00 166=0.00% 167=dddd 168=dd/mm/yyyy
const numFmts = [
  [164, '#,##0.00'], [165, '0.00;[Red]-0.00'], [166, '0.00%'], [167, 'dddd'], [168, 'dd/mm/yyyy'],
];
// fonts: 0=normal 1=bold+underline
const fonts =
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><u/><sz val="11"/><name val="Calibri"/></font>';
// xfs: 0 default; 1=#,##0.00; 2=red neg; 3=%; 4=dddd; 5=dd/mm/yyyy; 6=bold+underline
const xfs = [
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
];
const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  `<numFmts count="${numFmts.length}">${numFmts.map(([id, c]) => `<numFmt numFmtId="${id}" formatCode="${esc(c)}"/>`).join('')}</numFmts>` +
  `<fonts count="2">${fonts}</fonts>` +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs></styleSheet>`;

const istr = (r, c, s, t) => `<c r="${c}${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
const num = (r, c, s, v) => `<c r="${c}${r}" s="${s}"><v>${v}</v></c>`;
const rows = [
  `<row r="1">${istr(1, 'A', 0, 'Relatório de vendas do primeiro trimestre (transborda p/ direita)')}</row>`,
  `<row r="2">${istr(2, 'A', 0, 'Texto longo bloqueado pela vizinha →')}${istr(2, 'C', 0, 'BLOQUEIO')}</row>`,
  `<row r="4">${istr(4, 'A', 0, 'narrow #### :')}${num(4, 'B', 1, 1234567.89)}${num(4, 'D', 1, 1234567.89)}</row>`,
  `<row r="5">${istr(5, 'A', 0, 'negativo [Red] :')}${num(5, 'B', 2, -1234.5)}${num(5, 'D', 2, 1234.5)}</row>`,
  `<row r="6">${istr(6, 'A', 0, 'percentual :')}${num(6, 'B', 3, 0.1234)}</row>`,
  `<row r="7">${istr(7, 'A', 0, 'data (dddd) :')}${num(7, 'B', 4, 45838)}</row>`,
  `<row r="8">${istr(8, 'A', 0, 'data dd/mm/yyyy :')}${num(8, 'B', 5, 45838)}</row>`,
  `<row r="9">${istr(9, 'A', 6, 'negrito sublinhado')}</row>`,
  `<row r="10">${istr(10, 'A', 0, 'pt-BR milhar/decimal :')}${num(10, 'D', 1, 9876543.21)}</row>`,
].join('');

const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<cols><col min="2" max="2" width="9" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/></cols>' +
  `<sheetData>${rows}</sheetData></worksheet>`;

const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Smoke" sheetId="1" r:id="rId1"/></sheets></workbook>';
const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';

writeFileSync(out, zipSync({
  '[Content_Types].xml': strToU8(ct), '_rels/.rels': strToU8(rels),
  'xl/workbook.xml': strToU8(wb), 'xl/_rels/workbook.xml.rels': strToU8(wbRels),
  'xl/styles.xml': strToU8(styles), 'xl/worksheets/sheet1.xml': strToU8(sheet),
}, { level: 6 }));
console.log('OK samples/smoke.xlsx');
