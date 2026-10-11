// Tabela de 1 célula (título em caixa) cuja linha o Word deixa ~11pt mais alta
// que o conteúdo: qual propriedade causa? (altura mínima + margens da célula)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const tblXml = ({ style = true, trh = true, tcmar = true, indR = true, line240 = true, borders = true } = {}) =>
  `<w:tbl><w:tblPr>${style ? '<w:tblStyle w:val="TabelaTeste"/>' : ''}<w:tblW w:w="8800" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="0600" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="8800"/></w:tblGrid>`
  + `<w:tr>${trh ? '<w:trPr><w:trHeight w:val="520"/></w:trPr>' : ''}<w:tc><w:tcPr><w:tcW w:w="8800" w:type="dxa"/>`
  + (borders ? '<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>' : '')
  + (tcmar ? '<w:tcMar><w:top w:w="110" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar>' : '')
  + `</w:tcPr><w:p><w:pPr>${line240 ? '<w:spacing w:line="240" w:lineRule="auto"/>' : ''}${indR ? '<w:ind w:right="-30"/>' : ''}<w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:pPr>${r('TITULO DE TESTE EM CAIXA Hxg', '<w:b/><w:sz w:val="24"/>')}</w:p></w:tc></w:tr></w:tbl>`;
const styleA = '<w:style w:type="table" w:customStyle="1" w:styleId="TabelaTeste"><w:name w:val="Tabela Teste"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblStyleRowBandSize w:val="1"/><w:tblStyleColBandSize w:val="1"/><w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>';
const body = (o) => p('') + tblXml(o) + p(r('Depois Hxg'));
const defaults = docDefaults({ font: 'Arial', size: 11, line: 276 });
export const cases = [];
for (const [name, o] of [
  ['tc-full', {}],
  ['tc-nostyle', { style: false }],
  ['tc-notrh', { trh: false }],
  ['tc-notcmar', { tcmar: false }],
  ['tc-noindr', { indR: false }],
  ['tc-noline', { line240: false }],
  ['tc-noborders', { borders: false }],
]) cases.push({ name, docx: buildDocx({ body: body(o), defaults, styles: styleA }) });
// altura mínima × margens da célula: o Word compara trHeight com o conteúdo SEM
// as margens e soma as margens depois? (variando margens e regra)
{
  const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
  const t = (trh, mar, rule = '') => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="${trh}"${rule ? ` w:hRule="${rule}"` : ''}/></w:trPr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/><w:tcMar><w:top w:w="${mar}" w:type="dxa"/><w:bottom w:w="${mar}" w:type="dxa"/></w:tcMar></w:tcPr>${p(r('Celula Hxg'))}</w:tc></w:tr></w:tbl>`;
  for (const [name, trh, mar, rule] of [
    ['tcm-520-0', 520, 0, ''], ['tcm-520-100', 520, 100, ''], ['tcm-520-200', 520, 200, ''],
    ['tcm-200-100', 200, 100, ''], ['tcm-400-100', 400, 100, ''],
    ['tcm-520-100-exact', 520, 100, 'exact'], ['tcm-0-100', 0, 100, ''],
  ]) cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + t(trh, mar, rule) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
// regra exata × margens (e margem só em cima / só embaixo)
{
  const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
  const t = (trh, top, bottom, rule = '') => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="${trh}"${rule ? ` w:hRule="${rule}"` : ''}/></w:trPr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/><w:tcMar><w:top w:w="${top}" w:type="dxa"/><w:bottom w:w="${bottom}" w:type="dxa"/></w:tcMar></w:tcPr>${p(r('Celula Hxg'))}</w:tc></w:tr></w:tbl>`;
  for (const [name, trh, top, bottom, rule] of [
    ['tcx-520-0-0', 520, 0, 0, 'exact'], ['tcx-520-200-200', 520, 200, 200, 'exact'], ['tcx-800-100-100', 800, 100, 100, 'exact'],
    ['tcx-520-200-0', 520, 200, 0, 'exact'], ['tcx-520-0-200', 520, 0, 200, 'exact'],
    ['tcm-520-200-0', 520, 200, 0, ''], ['tcm-520-0-200', 520, 0, 200, ''],
  ]) cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + t(trh, top, bottom, rule) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
