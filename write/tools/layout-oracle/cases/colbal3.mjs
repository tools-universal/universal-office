// Equilíbrio de TRÊS colunas numa seção contínua (1 → 3 → 1 colunas): a 1ª coluna chega à média
// do conteúdo (a linha que passa da média fica nela), as do meio vão até a altura dela e a
// última leva o resto — pode passar da 1ª. Perto da página cheia o Word não iguala a 1ª às
// outras pela menor altura. Duas colunas: a menor altura em que tudo cabe (colbal). Calibri 11.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pg = (cols = '<w:cols w:space="708"/>', type = '') => `<w:sectPr>${type ? `<w:type w:val="${type}"/>` : ''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>${cols}<w:docGrid w:linePitch="360"/></w:sectPr>`;
const cols = (n) => `<w:cols w:num="${n}" w:space="708"/>`;
const defaults = docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 });
const para = (words, seed) => p(r(lorem(words, seed)));
const many = (n, words, seed) => Array.from({ length: n }, (_, k) => para(words, seed + k)).join('');
const endSect = (text, sp) => `<w:p><w:pPr>${sp}</w:pPr>${r(text)}</w:p>`;
const doc = (n, mid, k) => buildDocx({
  body: many(2, 50, 1) + endSect('Fim 1 Hxg', pg()) + many(n === 3 ? 4 : 6, 60, 10) + (k ? para(k, 14) : '') + endSect('Fim 2 Hxg', pg(cols(n), 'continuous')) + many(3, 50, 20),
  sect: pg(undefined, 'continuous'), defaults,
});
export const cases = [
  ...[0, 10, 20, 40, 50, 60, 80].map((k) => ({ name: `b3-${k}`, docx: doc(3, 0, k) })),
  ...[0, 10, 20].map((k) => ({ name: `b2-${k}`, docx: doc(2, 0, k) })),
];
