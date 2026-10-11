// Cadeia de linhas com keepNext numa tabela: título keepNext + linha 0 (keepNext) +
// linha 1 (keepNext) + linha alta que não cabe — desce a cadeia inteira (título e
// linhas 0 e 1) ou só a linha 1? Sem título; com a linha 1 sem keepNext (controle).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const KN = '<w:keepNext/>';
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="3000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/></w:tblGrid>${rows}</w:tbl>`;
const tr = (c, trPr = '') => `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${c}</w:tc></w:tr>`;
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const tall = '<w:trHeight w:val="5000"/>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
cases.push({ name: 'kc-head-2kn', docx: D(filler(40) + p(r('Titulo Hxg'), KN) + tbl(tr(p(r('linha zero Hxg'), KN)) + tr(p(r('linha um Hxg'), KN)) + tr(p(r('linha alta Hxg')), tall)) + p(r('Fim Hxg'))) });
cases.push({ name: 'kc-nohead-2kn', docx: D(filler(40) + p(r('Solto Hxg')) + tbl(tr(p(r('linha zero Hxg'), KN)) + tr(p(r('linha um Hxg'), KN)) + tr(p(r('linha alta Hxg')), tall)) + p(r('Fim Hxg'))) });
cases.push({ name: 'kc-head-1kn', docx: D(filler(40) + p(r('Titulo Hxg'), KN) + tbl(tr(p(r('linha zero Hxg'))) + tr(p(r('linha um Hxg'), KN)) + tr(p(r('linha alta Hxg')), tall)) + p(r('Fim Hxg'))) });
cases.push({ name: 'kc-head-3kn', docx: D(filler(38) + p(r('Titulo Hxg'), KN) + tbl(tr(p(r('linha zero Hxg'), KN)) + tr(p(r('linha um Hxg'), KN)) + tr(p(r('linha dois Hxg'), KN)) + tr(p(r('linha alta Hxg')), tall)) + p(r('Fim Hxg'))) });
