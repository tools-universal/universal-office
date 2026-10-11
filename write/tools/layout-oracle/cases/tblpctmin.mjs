// Tabela em pct (tblW e tcW em pct, autoajuste) cuja palavra sem quebra não cabe na largura
// pedida e não há outra coluna em pct que ceda: a coluna cresce até o mínimo do conteúdo e a
// TABELA passa do pedido — até a área de texto se o pedido é ≤ 100% (depois disso a palavra
// quebra); com pedido > 100%, sem limite (passa da página). O alinhamento (jc) usa a largura
// nova. Duas colunas: a outra cede até o mínimo dela e a tabela cresce o que faltar.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (tblW, jc, cells) => `<w:tbl><w:tblPr><w:tblW w:w="${tblW}" w:type="pct"/>${jc ? `<w:jc w:val="${jc}"/>` : ''}${bd}</w:tblPr><w:tblGrid>${cells.map(() => '<w:gridCol w:w="2000"/>').join('')}</w:tblGrid>`
  + `<w:tr>${cells.map(([w, t]) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/></w:tcPr>${p(r(t))}</w:tc>`).join('')}</w:tr></w:tbl>` + p('');
const U = (n) => '_'.repeat(n);
// área de texto 8504 twips; sublinhado Arial 11 = 122,2 twips; margens da célula 216
export const cases = [];
for (const jc of ['left', 'center']) {
  let body = '';
  for (const tw of [3000, 4800, 5000, 5200, 5487, 6000]) for (const n of [60, 66, 70, 76, 82, 90]) body += tbl(tw, jc, [[5000, U(n)]]);
  cases.push({ name: `tpm-${jc}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
{
  let body = '';
  for (const [tw, n] of [[4000, 50], [3000, 40], [4000, 56]]) body += tbl(tw, 'center', [[2500, U(n)], [2500, 'curto texto']]);
  cases.push({ name: 'tpm-duas', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
