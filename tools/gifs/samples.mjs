// Documentos sintéticos (em inglês, sem fontes embutidas) para os GIFs da
// documentação: um relatório com títulos, comentários e tabela, e uma versão
// revisada dele para o <universal-write-diff>.
import { createRequire } from 'node:module';

// a raiz não tem node_modules: o fflate vem do workspace do Write
const { zipSync, strToU8 } = createRequire(new URL('../../write/package.json', import.meta.url))('fflate');

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const run = (t, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (t, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${run(t)}</w:p>`;
const commented = (before, text, after, id) =>
  `<w:p>${run(before)}<w:commentRangeStart w:id="${id}"/>${run(text)}<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>${run(after)}</w:p>`;
const cell = (t, bold) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p>${run(t, bold ? '<w:b/>' : '')}</w:p></w:tc>`;
const table = (rows) => `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9000" w:type="dxa"/></w:tblPr>`
  + `<w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + rows.map((r, i) => `<w:tr>${r.map((t) => cell(t, i === 0)).join('')}</w:tr>`).join('') + '</w:tbl>';

const lorem = 'This paragraph fills the page so the report runs over several pages, like a real one. '
  + 'The viewer lays it out with the same engine as the editor and the PDF export, so line and page breaks match in all three. ';
const filler = (n, text = lorem) => Array.from({ length: n }, () => para(text.repeat(3))).join('');

function body(revised) {
  return [
    para(revised ? 'Quarterly Report — Q3 (revised)' : 'Quarterly Report — Q3', 'Title'),
    para('Introduction', 'Heading1'),
    commented('This document shows the ', 'outline and comments', ' of the document viewer.', 0),
    revised
      ? para('Revenue grew 18% over the previous quarter, driven by the new enterprise plan.')
      : para('Revenue grew 12% over the previous quarter, driven by the new enterprise plan.'),
    filler(2),
    para('Results', 'Heading2'),
    table(revised
      ? [['Region', 'Q2', 'Q3'], ['North', '1,240', '1,410'], ['South', '980', '1,150'], ['West', '760', '905']]
      : [['Region', 'Q2', 'Q3'], ['North', '1,240', '1,380'], ['South', '980', '1,150']]),
    filler(2),
    para('Scope', 'Heading2'),
    commented('The scope covers ', 'viewing only', '; editing belongs to the editor.', 1),
    ...(revised ? [] : [para('Support tickets are out of scope for this report.')]),
    filler(3),
    para('Next steps', 'Heading1'),
    para(revised ? 'Ship the self-contained packages and update the documentation site.' : 'Ship the packages.'),
    filler(2),
  ].join('');
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Liberation Sans" w:hAnsi="Liberation Sans" w:cs="Liberation Sans"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:sz w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:color w:val="2F5496"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:color w:val="2F5496"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

const COMMENTS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${W}>
<w:comment w:id="0" w:author="Ana" w:initials="A" w:date="2026-10-01T10:00:00Z"><w:p>${run('Add a screenshot of the side panel here.')}</w:p></w:comment>
<w:comment w:id="1" w:author="Bruno" w:initials="B" w:date="2026-10-02T15:30:00Z"><w:p>${run('Agreed — editing is out of scope.')}</w:p></w:comment>
</w:comments>`;

/**
 * .xlsx "Sales": cabeçalho, duas linhas preenchidas, a 4ª com a fórmula à
 * espera dos dados (o GIF digita a linha) e o total — formato em US$, valores
 * em cache (abre mostrando os números, como no Excel). Formato $0, sem
 * separadores: a exibição de números do Sheet ainda segue o pt-BR.
 */
export function salesXlsx() {
  const S = (r, v, s = 0) => `<c r="${r}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t>${esc(v)}</t></is></c>`;
  const N = (r, v, s = 0) => `<c r="${r}"${s ? ` s="${s}"` : ''}><v>${v}</v></c>`;
  const F = (r, f, v, s) => `<c r="${r}" s="${s}"><f>${f}</f><v>${v}</v></c>`;
  const rows = [
    `<row r="1">${S('A1', 'Product', 1)}${S('B1', 'Qty', 1)}${S('C1', 'Unit price', 1)}${S('D1', 'Total', 1)}</row>`,
    `<row r="2">${S('A2', 'Laptop')}${N('B2', 3)}${N('C2', 1200, 2)}${F('D2', 'B2*C2', 3600, 2)}</row>`,
    `<row r="3">${S('A3', 'Monitor')}${N('B3', 5)}${N('C3', 240, 2)}${F('D3', 'B3*C3', 1200, 2)}</row>`,
    `<row r="4"><c r="C4" s="2"/>${F('D4', 'B4*C4', 0, 2)}</row>`,
    `<row r="6">${S('A6', 'Total', 1)}${F('D6', 'SUM(D2:D5)', 4800, 3)}</row>`,
  ].join('');
  const X = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  return zipSync({
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook ${X}><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="27425"/><sheets><sheet name="Sales" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet ${X}><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${X}><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="8" customWidth="1"/><col min="3" max="4" width="14" customWidth="1"/><col min="6" max="6" width="18" customWidth="1"/></cols>
<sheetData>${rows}</sheetData></worksheet>`),
  });
}

/** .docx do relatório (revised = versão revisada para o diff). */
export function reportDocx(revised = false) {
  return zipSync({
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    'word/_rels/document.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>`),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>${body(revised)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`),
    'word/styles.xml': strToU8(STYLES),
    'word/comments.xml': strToU8(COMMENTS),
  });
}
