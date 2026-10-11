// Numeração de linhas (w:lnNumType): posição (distância "auto" e explícita),
// countBy/start/restart, estilo "Line Number", parágrafos vazios, tabela e
// suppressLineNumbers.
import { buildDocx, docDefaults, p, r, sz, lorem } from '../docx-builder.mjs';

const sect = (ln, { left = 1701 } = {}) => `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="${left}" w:header="708" w:footer="708" w:gutter="0"/>${ln}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
const tbl = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
  + ['A', 'B'].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr>${p(r(`cel ${k}1 Hxg`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr>${p(r(`cel ${k}2 Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const lnStyle = '<w:style w:type="character" w:styleId="LineNumber"><w:name w:val="line number"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr><w:color w:val="C00000"/><w:sz w:val="16"/></w:rPr></w:style>';

export const cases = [];
{
  const body = p(r('Titulo grande Hxg', sz(16)))
    + p('')
    + p(r(lorem(70)))
    + tbl
    + p(r('Sem numero aqui Hxg'), '<w:suppressLineNumbers/>')
    + p(r('Depois da supressao Hxg'))
    + Array.from({ length: 50 }, (_, k) => p(r(`linha ${k + 1} Hxg`))).join('');
  cases.push({ name: 'ln-basic', docx: buildDocx({ body, sect: sect('<w:lnNumType w:countBy="1"/>'), defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
}
{
  const body = Array.from({ length: 64 }, (_, k) => p(r(`item ${k + 1} Hxg`))).join('');
  cases.push({ name: 'ln-opts', docx: buildDocx({ body, styles: lnStyle, sect: sect('<w:lnNumType w:countBy="5" w:start="3" w:distance="567" w:restart="continuous"/>', { left: 2268 }), defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
}
