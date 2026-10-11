// Balanceamento de colunas: seção de 2/3 colunas encerrada por quebra de seção
// CONTÍNUA — o Word equilibra as colunas (a seção seguinte começa logo abaixo da
// coluna mais alta). Parágrafos vazios, linhas curtas, parágrafos longos; a última
// seção do documento (sem quebra depois) não equilibra?
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pg = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const s1 = (cont) => `<w:sectPr>${cont ? '<w:type w:val="continuous"/>' : ''}${pg}<w:cols w:space="708"/></w:sectPr>`;
const sN = (n) => `<w:sectPr><w:type w:val="continuous"/>${pg}<w:cols w:num="${n}" w:space="708"/></w:sectPr>`;
const endWith = (sect) => p('', sect);
const defaults = docDefaults({ font: 'Arial', size: 9 });
export const cases = [];
const mk = (name, inner, n = 2, last = false) => {
  // seção 1 (1 coluna) | seção 2 (n colunas, contínua) | seção 3 (1 coluna, contínua)
  const body = p(r('Antes Hxg')) + endWith(s1(false)) + inner + (last ? '' : endWith(sN(n)) + p(r('Depois Hxg')) + p(r('Fim Hxg')));
  const sect = last ? sN(n) : s1(true);
  cases.push({ name, docx: buildDocx({ body, sect, defaults }) });
};
const empties = (k) => Array.from({ length: k }, () => p('')).join('');
const shorts = (k) => Array.from({ length: k }, (_, i) => p(r(`Item ${i + 1} Hxg`))).join('');
for (const k of [1, 2, 3, 4, 5, 7]) mk(`cb-empty-${k}`, empties(k));
for (const k of [2, 3, 5, 6, 9]) mk(`cb-short-${k}`, shorts(k));
mk('cb-long-1', p(r(lorem(120, 2))));
mk('cb-long-2', p(r(lorem(90, 3))) + p(r(lorem(40, 4))));
mk('cb-3col-short-7', shorts(7), 3);
mk('cb-3col-long', p(r(lorem(150, 5))), 3);
mk('cb-last-short-6', shorts(6), 2, true);
