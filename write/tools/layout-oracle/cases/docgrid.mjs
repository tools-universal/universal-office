// Grade do documento (w:docGrid type="lines"): a altura das linhas encaixa em
// múltiplos de linePitch? Como ficam entrelinha múltipla/exata/mínima, corpos
// maiores que a grade, espaço antes/depois, snapToGrid=0, tabelas e a posição
// da baseline dentro da célula da grade. Modos 11 e 15.
import { buildDocx, docDefaults, p, r, sz, lorem } from '../docx-builder.mjs';

const sect = (grid) => `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/>${grid}</w:sectPr>`;
const tbl = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>'
  + ['A', 'B'].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(`celula ${k} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';

const body = p(r('Inicio Hxg'))
  + p(r(lorem(60, 2)))
  + p(r('Grande 20pt Hxg', sz(20)))
  + p(r('Grande 28pt Hxg', sz(28)))
  + p(r(lorem(40, 3)), '<w:spacing w:line="360" w:lineRule="auto"/>')
  + p(r('Exata 15pt Hxg'), '<w:spacing w:line="300" w:lineRule="exact"/>')
  + p(r('Exata 15pt b Hxg'), '<w:spacing w:line="300" w:lineRule="exact"/>')
  + p(r('Minima 10pt Hxg'), '<w:spacing w:line="200" w:lineRule="atLeast"/>')
  + p(r('Minima 25pt Hxg'), '<w:spacing w:line="500" w:lineRule="atLeast"/>')
  + p(r('Antes 6 depois 9 Hxg'), '<w:spacing w:before="120" w:after="180"/>')
  + p(r('Sem grade Hxg'), '<w:snapToGrid w:val="0"/>')
  + p(r('Sem grade b Hxg'), '<w:snapToGrid w:val="0"/>')
  + tbl
  + p(r('Pequeno 8pt Hxg', sz(8)))
  + p(r('Fim Hxg'));

export const cases = [];
for (const compat of [15, 11]) {
  for (const [name, grid] of [
    ['lines360', '<w:docGrid w:type="lines" w:linePitch="360"/>'],
    ['lines312', '<w:docGrid w:type="lines" w:linePitch="312"/>'],
    ['chars360', '<w:docGrid w:type="linesAndChars" w:linePitch="360" w:charSpace="0"/>'],
  ]) {
    // linesAndChars no modo 11 também encaixa a LARGURA dos caracteres latinos na
    // grade de caracteres (as quebras mudam) — não implementado
    if (compat === 11 && name === 'chars360') continue;
    cases.push({ name: `grid-${name}-c${compat}`, docx: buildDocx({ body, sect: sect(grid), compat, defaults: docDefaults({ font: 'Arial', size: 11, after: 0 }) }) });
  }
}
// Calibri (altura natural 13,4pt para 11pt) e espaço depois padrão
cases.push({ name: 'grid-calibri-after', docx: buildDocx({ body, sect: sect('<w:docGrid w:type="lines" w:linePitch="360"/>'), defaults: docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 }) }) });
