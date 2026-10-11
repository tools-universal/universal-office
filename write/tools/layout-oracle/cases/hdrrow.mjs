// Linhas de cabeçalho da tabela (w:tblHeader, repetidas) no pé da página quando a
// 1ª linha de dados não cabe: no modo 15 descem junto (não ficam sozinhas); nos
// modos 11/14 ficam e se repetem na página seguinte.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>${rows}</w:tbl>`;
const tr = (cell, trPr = '') => `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr>`;
const OFF = '<w:widowControl w:val="0"/>';

export const cases = [];
for (const compat of [11, 14, 15]) {
  const D = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  // um cabeçalho; dois cabeçalhos; cabeçalho + dados que cabem em parte (não desce)
  cases.push({ name: `hr-one-c${compat}`, docx: D(filler(54) + tbl(tr(p(r('cabecalho Hxg')), '<w:tblHeader/>') + tr(p(r(lines(5, 'seg')), OFF))) + p(r('Fim Hxg'))) });
  cases.push({ name: `hr-two-c${compat}`, docx: D(filler(53) + tbl(tr(p(r('cab um Hxg')), '<w:tblHeader/>') + tr(p(r('cab dois Hxg')), '<w:tblHeader/>') + tr(p(r(lines(5, 'seg')), OFF))) + p(r('Fim Hxg'))) });
  cases.push({ name: `hr-fits-c${compat}`, docx: D(filler(53) + tbl(tr(p(r('cabecalho Hxg')), '<w:tblHeader/>') + tr(p(r(lines(5, 'seg')), OFF))) + p(r('Fim Hxg'))) });
}
