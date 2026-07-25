// Gera planilhas GIGANTES para teste de performance/RAM do <universal-sheet>.
//   giant-200k.xlsx : 2 000 linhas × 100 colunas (200k células, estilos variados)
//   giant-1m.xlsx   : 10 000 linhas × 100 colunas (1M células, números)
// Escrita direta das partes OOXML + zip via fflate (sem Excel — arquivos
// canônicos mínimos que o app de referência abre normalmente).
import { zipSync, strToU8 } from 'fflate';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'samples');

function colLetters(c) {
  let s = '';
  while (c > 0) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

function buildXlsx(rows, cols, mixed) {
  const sheetRows = [];
  for (let r = 1; r <= rows; r++) {
    const cells = [];
    for (let c = 1; c <= cols; c++) {
      const ref = colLetters(c) + r;
      if (mixed && c % 7 === 0) {
        cells.push(`<c r="${ref}" t="inlineStr" s="${(r + c) % 4}"><is><t>Texto ${r}-${c}</t></is></c>`);
      } else if (mixed && c % 11 === 0) {
        cells.push(`<c r="${ref}" s="1"><v>${(r * c % 1000) / 100}</v></c>`);
      } else {
        cells.push(`<c r="${ref}"><v>${r * 1000 + c}</v></c>`);
      }
    }
    sheetRows.push(`<row r="${r}">${cells.join('')}</row>`);
  }
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${colLetters(cols)}${rows}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData>${sheetRows.join('')}</sheetData></worksheet>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos Narrow"/></font><font><b/><sz val="11"/><color rgb="FF156082"/><name val="Aptos Narrow"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="2" borderId="0" applyFill="1"/></cellXfs></styleSheet>`;
  const parts = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Giant" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': stylesXml,
    'xl/worksheets/sheet1.xml': sheetXml,
  };
  const zippable = {};
  for (const [k, v] of Object.entries(parts)) zippable[k] = strToU8(v);
  return zipSync(zippable, { level: 6 });
}

console.time('giant-200k');
writeFileSync(join(outDir, 'giant-200k.xlsx'), buildXlsx(2000, 100, true));
console.timeEnd('giant-200k');
console.time('giant-1m');
writeFileSync(join(outDir, 'giant-1m.xlsx'), buildXlsx(10000, 100, false));
console.timeEnd('giant-1m');
console.log('OK ->', outDir);
