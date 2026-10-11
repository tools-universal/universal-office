// Linha de tabela que parte na página com uma célula curta centrada (ou embaixo) na
// vertical e outra longa: a curta fica centrada na PARTE desta página (como a mescla
// vertical — oráculo vmsplit) ou no topo? E a continuação da longa, com o seu vAlign?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tc = (w, xml, va = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${va ? `<w:vAlign w:val="${va}"/>` : ''}</w:tcPr>${xml}</w:tc>`;
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="5000"/></w:tblGrid>${rows.map((x) => `<w:tr>${x}</w:tr>`).join('')}</w:tbl>`;
const fill = (n) => Array.from({ length: n }, (_, k) => p(r(`antes ${k + 1} Hxg`))).join('');
const long = Array.from({ length: 12 }, (_, k) => p(r(`longa ${k + 1} Hxg`))).join('');
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
for (const va of ['center', 'bottom']) {
  cases.push({ name: `sv-${va}`, docx: D(fill(48) + tbl([tc(3000, p(r('curta Hxg')), va) + tc(5000, long)]) + p(r('Fim Hxg'))) });
  // a longa também centrada: a continuação dela fica centrada na parte de lá?
  cases.push({ name: `sv-${va}-both`, docx: D(fill(48) + tbl([tc(3000, p(r('curta Hxg')), va) + tc(5000, long, va), tc(3000, p(r('baixo Hxg'))) + tc(5000, p(r('baixo B Hxg')) + p(r('baixo C Hxg')) + p(r('baixo D Hxg')))]) + p(r('Fim Hxg'))) });
}
