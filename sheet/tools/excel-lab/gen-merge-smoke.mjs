// Gera samples/merge-smoke.xlsx com mesclas para verificar visualmente:
// - clique no meio de uma mescla → sel = origem
// - paintSelection cobre a mescla inteira (borda do acento)
// - cabeçalhos da coluna/linha do range destacados (BG, não texto)
import { zipSync, strToU8 } from '../../node_modules/fflate/esm/browser.js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../samples/merge-smoke.xlsx');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const istr = (r, c, t) => `<c r="${c}${r}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
const num = (r, c, v) => `<c r="${c}${r}"><v>${v}</v></c>`;

const rows =
  `<row r="1">${['A','B','C','D','E'].map((c,i)=>istr(1,c,'col '+c)).join('')}</row>` +
  `<row r="2">${num(2,'A',1)}${num(2,'B',2)}${num(2,'C',3)}${num(2,'D',4)}${num(2,'E',5)}</row>` +
  `<row r="5">${istr(5,'A','MERGE HORIZ (A5:D5)')}</row>` +
  `<row r="7">${istr(7,'B','MERGE 2x2 (B7:C8)')}</row>`;

const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  `<sheetData>${rows}</sheetData>` +
  '<mergeCells count="2"><mergeCell ref="A5:D5"/><mergeCell ref="B7:C8"/></mergeCells>' +
  '</worksheet>';
const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
  '</styleSheet>';
const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Merge" sheetId="1" r:id="rId1"/></sheets></workbook>';
const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';

writeFileSync(out, zipSync({
  '[Content_Types].xml': strToU8(ct), '_rels/.rels': strToU8(rels),
  'xl/workbook.xml': strToU8(wb), 'xl/_rels/workbook.xml.rels': strToU8(wbRels),
  'xl/styles.xml': strToU8(styles), 'xl/worksheets/sheet1.xml': strToU8(sheet),
}, { level: 6 }));
console.log('OK samples/merge-smoke.xlsx');
