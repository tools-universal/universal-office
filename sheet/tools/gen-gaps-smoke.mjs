/**
 * Gera samples/gaps-smoke.xlsx — fixture sintética para os gaps da spec 02:
 *   A. panes congelados (xSplit=1, ySplit=2, state=frozen)
 *   B. rich text runs (negrito/tamanho/cor/rFont + sublinhado/tachado por run)
 *   C. tema próprio (theme1.xml com accent1 distinto) + cor de tema com tint
 *   D. pattern fills (gray125, darkTrellis) + gradiente 2 stops
 *   E. hyperlinks (externo via rels + interno via location)
 *   F. sheetFormatPr (defaultColWidth/defaultRowHeight/customHeight)
 *   G. cor indexada legada (indexed=17 → #008000)
 *
 * Uso: node tools/gen-gaps-smoke.mjs  (grava samples/gaps-smoke.xlsx)
 * Também é importado pelo teste de parse (buildGapsSmoke → bytes em memória).
 */
import { zipSync, strToU8 } from 'fflate';

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const CONTENT_TYPES = `${XML_DECL}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`;

const ROOT_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `${XML_DECL}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>
<sheet name="Dados" sheetId="1" r:id="rId1"/>
<sheet name="Alvo" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;

const WORKBOOK_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

// Tema com cores DISTINTAS da paleta Office (accent1 = #FF6600) para o teste
// provar que a paleta vem do arquivo, não do fallback hardcoded.
const THEME = `${XML_DECL}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="GapsSmoke">
<a:themeElements>
<a:clrScheme name="GapsSmoke">
<a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FEFEFE"/></a:lt1>
<a:dk2><a:srgbClr val="1F3864"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="FF6600"/></a:accent1>
<a:accent2><a:srgbClr val="2E8B57"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
<a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
<a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink>
<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="GapsSmoke">
<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="GapsSmoke">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

// fonts: 0 default | 1 bold accent1+tint | 2 indexed 17 (#008000) | 3 u+strike
// fills: 0 none | 1 gray125 (slot padrão) | 2 solid theme4 tint .6 |
//        3 darkTrellis vermelho/amarelo | 4 gradiente 90° branco→azul |
//        5 gray125 fg cinza | 6 solid rgb
const STYLES = `${XML_DECL}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color theme="4" tint="0.39997558519241921"/><name val="Calibri"/></font>
<font><sz val="11"/><color indexed="17"/><name val="Calibri"/></font>
<font><u/><strike/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor theme="4" tint="0.59999389629810485"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="darkTrellis"><fgColor rgb="FFFF0000"/><bgColor rgb="FFFFFF00"/></patternFill></fill>
<fill><gradientFill degree="90"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF4472C4"/></stop></gradientFill></fill>
<fill><patternFill patternType="gray125"><fgColor rgb="FF808080"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// si 0: plano | si 1: 3 runs ricos | si 2: texto do hyperlink externo
const SHARED_STRINGS = `${XML_DECL}
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
<si><t>Cabecalho</t></si>
<si>
<r><rPr><b/><sz val="14"/><color rgb="FFFF0000"/><rFont val="Arial"/></rPr><t>Negrito</t></r>
<r><rPr><sz val="11"/><rFont val="Calibri"/></rPr><t xml:space="preserve"> misto </t></r>
<r><rPr><u/><strike/><color theme="5"/><rFont val="Calibri"/></rPr><t>fim</t></r>
</si>
<si><t>Link externo</t></si>
</sst>`;

// Dados: pane congelado (1 col × 2 linhas), sheetFormatPr custom, fills,
// rich text em B1, hyperlinks em A4 (externo) e A5 (interno).
const SHEET1 = `${XML_DECL}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:D6"/>
<sheetViews>
<sheetView tabSelected="1" workbookViewId="0">
<pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/>
<selection pane="bottomRight" activeCell="B3" sqref="B3"/>
</sheetView>
</sheetViews>
<sheetFormatPr baseColWidth="10" defaultColWidth="12.5" defaultRowHeight="20" customHeight="1"/>
<cols><col min="1" max="1" width="16" customWidth="1"/></cols>
<sheetData>
<row r="1" spans="1:4"><c r="A1" t="s" s="1"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2" spans="1:4"><c r="A2"><v>1</v></c><c r="B2"><v>2</v></c><c r="C2"><v>3</v></c></row>
<row r="3" spans="1:4"><c r="A3" s="2"/><c r="B3" s="3"/><c r="C3" s="4"/><c r="D3" s="6"/></row>
<row r="4" spans="1:4"><c r="A4" t="s" s="5"><v>2</v></c></row>
<row r="5" spans="1:4"><c r="A5" t="inlineStr"><is><t>Ir para Alvo</t></is></c></row>
<row r="6" spans="1:4"><c r="A6"><v>99</v></c></row>
</sheetData>
<hyperlinks>
<hyperlink ref="A4" r:id="rId1" tooltip="Site de exemplo"/>
<hyperlink ref="A5" location="Alvo!B2" display="Ir para Alvo"/>
</hyperlinks>
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;

const SHEET1_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/>
</Relationships>`;

const SHEET2 = `${XML_DECL}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="B2"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<sheetData><row r="2" spans="2:2"><c r="B2"><v>42</v></c></row></sheetData>
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;

/** Monta o pacote e devolve os bytes .xlsx (usado pelos testes em memória). */
export function buildGapsSmoke() {
  /** @type {Record<string, Uint8Array>} */
  const parts = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'xl/workbook.xml': strToU8(WORKBOOK),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS),
    'xl/theme/theme1.xml': strToU8(THEME),
    'xl/styles.xml': strToU8(STYLES),
    'xl/sharedStrings.xml': strToU8(SHARED_STRINGS),
    'xl/worksheets/sheet1.xml': strToU8(SHEET1),
    'xl/worksheets/_rels/sheet1.xml.rels': strToU8(SHEET1_RELS),
    'xl/worksheets/sheet2.xml': strToU8(SHEET2),
  };
  return zipSync(parts, { level: 6 });
}

// Execução direta: grava samples/gaps-smoke.xlsx
const isMain = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, '..', 'samples', 'gaps-smoke.xlsx');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildGapsSmoke());
  console.log(`gravado: ${out}`);
}
