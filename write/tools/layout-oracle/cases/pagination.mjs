// Paginação: quebra natural × espaço antes no topo, controle de viúvas/órfãs
// (com/sem w:widowControl), keepNext, keepLines, quebra manual e pageBreakBefore.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1}`).join('\n');

function doc(name, body, opts = {}) {
  return { name, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, ...(opts.dd ?? {}) }), styles: opts.styles ?? '' }) };
}

// A4, margens 1417/1417 → área útil 1984 tw - ... ~ 56 linhas de Arial 11 (12.65pt)
export const cases = [];
// 1) quebra natural com espaço antes: o 1º parágrafo da página 2 tem before=240
cases.push(doc('natural-before', filler(56) + p(r('topo com antes 12pt Hxg'), '<w:spacing w:before="240"/>') + filler(3)));
// 2) quebra manual (w:br page) seguida de parágrafo com before
cases.push(doc('manual-before', filler(3) + p(r('fim pagina 1') + '<w:r><w:br w:type="page"/></w:r>') + p(r('topo apos br com antes Hxg'), '<w:spacing w:before="240"/>') + filler(2)));
// 3) parágrafo de 3 linhas no fim da página: 55 linhas de enchimento + parágrafo de 3 linhas (órfã/viúva)
for (const wc of ['', '<w:widowControl/>', '<w:widowControl w:val="0"/>']) {
  const tag = wc === '' ? 'default' : wc.includes('0') ? 'off' : 'on';
  cases.push(doc(`widow-${tag}-a`, filler(55) + p(r(lines(3, 'tres linhas')), wc) + filler(2)));
  cases.push(doc(`widow-${tag}-b`, filler(54) + p(r(lines(3, 'tres linhas')), wc) + filler(2)));
  cases.push(doc(`widow-${tag}-c`, filler(55) + p(r(lines(2, 'duas linhas')), wc) + filler(2)));
}
// 4) keepNext: título no fim da página com keepNext
cases.push(doc('keepnext', filler(55) + p(r('Titulo com keepNext'), '<w:keepNext/>') + p(r(lines(3, 'corpo'))) + filler(2)));
cases.push(doc('keepnext-chain', filler(54) + p(r('Titulo A'), '<w:keepNext/>') + p(r('Titulo B'), '<w:keepNext/>') + p(r(lines(2, 'corpo'))) + filler(2)));
// 5) keepLines: parágrafo de 4 linhas que não cabe inteiro
cases.push(doc('keeplines', filler(54) + p(r(lines(4, 'junto')), '<w:keepLines/>') + filler(2)));
// 6) pageBreakBefore + parágrafo longo quebrando
cases.push(doc('long-para', filler(40) + p(r(lorem(400, 3)), '<w:jc w:val="both"/>') + filler(2)));
// 7) estilo Normal com widowControl (como os templates do Word)
cases.push(doc('widow-style', filler(55) + p(r(lines(3, 'tres linhas'))) + filler(2), {
  styles: '',
  dd: {},
}));
