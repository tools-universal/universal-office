// Gera um .xlsx com formatCodes OOXML CANÔNICOS (locale-independentes) — um por
// célula — para servir de oráculo de renderização: o Excel abre e lê Range.Text
// (display localizado pt-BR), sem a contaminação do setter COM .NumberFormat.
//
// Saída: results/oracle-src.xlsx (+ results/oracle-cases.json com o gabarito).
import { zipSync, strToU8 } from '../../node_modules/fflate/esm/browser.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });

// Cada caso: { v: número|string, fmt: formatCode OOXML, text?: boolean, note? }
const cases = [
  // General
  { v: 0, fmt: 'General' }, { v: 42, fmt: 'General' }, { v: -42, fmt: 'General' },
  { v: 3.14159, fmt: 'General' }, { v: 1234567.89, fmt: 'General' },
  { v: 0.000123, fmt: 'General' }, { v: 123456789012, fmt: 'General' },
  { v: 1234567890123456, fmt: 'General' }, { v: 0.1, fmt: 'General' },
  { v: 1e-10, fmt: 'General' }, { v: 1e20, fmt: 'General' },
  { v: 0.6666666666666666, fmt: 'General' }, { v: -0.5, fmt: 'General' },
  { v: 100000000, fmt: 'General' }, { v: 999999999999, fmt: 'General' },
  // inteiros / decimais fixos
  { v: 1234.5, fmt: '0' }, { v: 1234.5, fmt: '0.00' }, { v: 1234.567, fmt: '0.00' },
  { v: 0.5, fmt: '0' }, { v: 2.5, fmt: '0' }, { v: 3.5, fmt: '0' },
  { v: -1234.567, fmt: '0.00' }, { v: 1234567.891, fmt: '#,##0' },
  { v: 1234567.891, fmt: '#,##0.00' }, { v: -1234567.891, fmt: '#,##0.00' },
  { v: 0, fmt: '#,##0.00' }, { v: 0.005, fmt: '0.00' }, { v: 0.004, fmt: '0.00' },
  { v: 1234.5, fmt: '#,##0.00' },
  // percentuais
  { v: 0.1234, fmt: '0%' }, { v: 0.1234, fmt: '0.00%' }, { v: 1, fmt: '0%' },
  { v: -0.05, fmt: '0.0%' },
  // moeda / contábil
  { v: 1234.5, fmt: '"R$"#,##0.00' }, { v: 1234.5, fmt: '$#,##0.00' },
  { v: -1234.5, fmt: '$#,##0.00' },
  { v: 1234.5, fmt: '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-' },
  // multi-seção positivo;negativo;zero;texto
  { v: 100, fmt: '0.00;[Red]-0.00' }, { v: -100, fmt: '0.00;[Red]-0.00' },
  { v: 5, fmt: '#,##0;(#,##0)' }, { v: -5, fmt: '#,##0;(#,##0)' },
  { v: 0, fmt: '"pos";"neg";"zero"', note: 'secao zero literal' },
  { v: -7, fmt: '"pos";"neg";"zero"' },
  { v: 0, fmt: '0.0;-0.0;"--"' },
  // científico
  { v: 12345.678, fmt: '0.00E+00' }, { v: 0.00012345, fmt: '0.00E+00' },
  { v: 12345.678, fmt: '##0.0E+0' },
  // frações
  { v: 0.5, fmt: '# ?/?' }, { v: 2.25, fmt: '# ?/?' }, { v: 0.333, fmt: '# ??/??' },
  // texto
  { v: 'hello', fmt: 'General', text: true }, { v: 'hello', fmt: '@', text: true },
  { v: 42, fmt: '@', note: 'numero com formato texto' },
  // placeholders de espaço / preenchimento
  { v: 12.3, fmt: '0.00_);(0.00)' }, { v: 5, fmt: '0"x"' },
  // datas (serial)
  { v: 45838, fmt: 'm/d/yyyy' }, { v: 45838, fmt: 'd/m/yyyy' },
  { v: 45838, fmt: 'dd/mm/yyyy' }, { v: 45838, fmt: 'mmm' }, { v: 45838, fmt: 'mmmm' },
  { v: 45838, fmt: 'ddd' }, { v: 45838, fmt: 'dddd' }, { v: 45838, fmt: 'd-mmm-yy' },
  { v: 45838, fmt: 'yyyy-mm-dd' }, { v: 45838, fmt: 'mmm-yy' }, { v: 45838, fmt: 'd-mmm' },
  { v: 45838.5, fmt: 'h:mm' }, { v: 45838.5, fmt: 'h:mm:ss' },
  { v: 45838.776389, fmt: 'h:mm AM/PM' }, { v: 45838.776389, fmt: 'hh:mm:ss AM/PM' },
  { v: 45838.776389, fmt: 'm/d/yyyy h:mm' }, { v: 1.5, fmt: '[h]:mm', note: 'elapsed' },
  { v: 45838.25, fmt: 'mm/dd/yyyy hh:mm:ss' }, { v: 0.7510, fmt: 'h:mm:ss AM/PM' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// styles.xml: numFmt id 164+ por caso (exceto General/@ → builtin 0/49)
let numFmtEntries = '';
const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']; // 0 = default
let nextId = 164;
cases.forEach((c) => {
  let numFmtId;
  if (c.fmt === 'General') numFmtId = 0;
  else if (c.fmt === '@') numFmtId = 49;
  else { numFmtId = nextId++; numFmtEntries += `<numFmt numFmtId="${numFmtId}" formatCode="${esc(c.fmt)}"/>`; }
  xfs.push(`<xf numFmtId="${numFmtId}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`);
});

const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  (numFmtEntries ? `<numFmts count="${nextId - 164}">${numFmtEntries}</numFmts>` : '') +
  '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
  '</styleSheet>';

// sheet1.xml: 1 caso por linha, coluna A larga p/ evitar ####
let rows = '';
cases.forEach((c, i) => {
  const r = i + 1;
  const s = i + 1; // índice no cellXfs
  let cell;
  if (c.text) cell = `<c r="A${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
  else cell = `<c r="A${r}" s="${s}"><v>${c.v}</v></c>`;
  rows += `<row r="${r}">${cell}</row>`;
});
const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<cols><col min="1" max="1" width="40" customWidth="1"/></cols>' +
  `<sheetData>${rows}</sheetData></worksheet>`;

const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';
const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';
const wbXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="Oracle" sheetId="1" r:id="rId1"/></sheets></workbook>';
const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

const zip = zipSync({
  '[Content_Types].xml': strToU8(ct),
  '_rels/.rels': strToU8(rels),
  'xl/workbook.xml': strToU8(wbXml),
  'xl/_rels/workbook.xml.rels': strToU8(wbRels),
  'xl/styles.xml': strToU8(stylesXml),
  'xl/worksheets/sheet1.xml': strToU8(sheetXml),
}, { level: 6 });

writeFileSync(join(outDir, 'oracle-src.xlsx'), zip);
writeFileSync(join(outDir, 'oracle-cases.json'), JSON.stringify(cases, null, 2));
console.log(`OK oracle-src.xlsx (${cases.length} casos)`);
