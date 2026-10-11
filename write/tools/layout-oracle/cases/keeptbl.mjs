// Manter com o próximo em tabelas: título (keepNext) antes de tabela; linha
// cujos parágrafos têm keepNext seguida de linha alta que não cabe; keepNext só
// numa das células; cantSplit.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const KN = '<w:keepNext/>';
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (rows, cols = 1) => `<w:tbl><w:tblPr><w:tblW w:w="${3000 * cols}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid>${'<w:gridCol w:w="3000"/>'.repeat(cols)}</w:tblGrid>${rows}</w:tbl>`;
const tr = (cells, trPr = '') => `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${c}</w:tc>`).join('')}</w:tr>`;
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const tall = '<w:trHeight w:val="5000"/>';

export const cases = [];
// 1: título keepNext + tabela (linha 0 keepNext) + linha alta que não cabe
cases.push({ name: 'kt-row-keepnext', docx: buildDocx({ body: filler(40) + p(r('Titulo Hxg'), KN) + tbl(tr([p(r('linha zero Hxg'), KN)]) + tr([p(r('linha alta Hxg'))], tall)) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
// 2: mesma coisa sem keepNext na linha 0
cases.push({ name: 'kt-row-plain', docx: buildDocx({ body: filler(40) + p(r('Titulo Hxg'), KN) + tbl(tr([p(r('linha zero Hxg'))]) + tr([p(r('linha alta Hxg'))], tall)) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
// 3: keepNext só na 1ª de duas células
cases.push({ name: 'kt-row-onecell', docx: buildDocx({ body: filler(40) + p(r('Titulo Hxg'), KN) + tbl(tr([p(r('zero A Hxg'), KN), p(r('zero B Hxg'))]) + tr([p(r('alta A Hxg')), p(r('alta B Hxg'))], tall), 2) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
// 4: título keepNext + tabela de linhas normais perto do fim da página
cases.push({ name: 'kt-heading-table', docx: buildDocx({ body: filler(47) + p(r('Titulo Hxg'), KN) + tbl(tr([p(r('a Hxg'))]) + tr([p(r('b Hxg'))]) + tr([p(r('c Hxg'))])) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
// 5: linha cantSplit alta perto do fim
cases.push({ name: 'kt-cantsplit', docx: buildDocx({ body: filler(30) + tbl(tr([p(r('normal Hxg'))]) + tr([filler(25)], '<w:cantSplit/>')) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
