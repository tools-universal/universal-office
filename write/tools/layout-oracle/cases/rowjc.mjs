// exploração: tabela centralizada com gridBefore/wBefore nas linhas (como o Word grava o .doc
// convertido) e w:jc na linha (trPr). O vão antes da linha entra na centralização? A linha
// centraliza sozinha? Com w:alignTablesRowByRow? Larguras fixas; o x do texto da 1ª célula
// de cada linha mede.
// Arial 10; textos inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const cell = (w, t) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(t))}</w:tc>`;
// linhas: [gridBefore?, jc da linha, células]
const tbl = (tblJc, tblW, grid, rows) => `<w:tbl><w:tblPr><w:tblW w:w="${tblW}" w:type="dxa"/>${tblJc ? `<w:jc w:val="${tblJc}"/>` : ''}${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>`
  + rows.map(([gb, wb, rjc, cells]) => `<w:tr><w:trPr>${gb ? `<w:gridBefore w:val="${gb}"/><w:wBefore w:w="${wb}" w:type="dxa"/>` : ''}${rjc ? `<w:jc w:val="${rjc}"/>` : ''}</w:trPr>${cells.map(([w, t]) => cell(w, t)).join('')}</w:tr>`).join('') + '</w:tbl>' + p('');
const rowsGB = (rjc) => [[1, 3000, rjc, [[4000, 'Linha um com vao'], [3000, 'Fim um']]], [1, 3000, rjc, [[4000, 'Linha dois com vao'], [3000, 'Fim dois']]], [0, 0, rjc, [[3000, 'Linha tres sem vao'], [4000, 'Coluna larga'], [3000, 'Fim tres']]]];
let body = '';
for (const [tjc, rjc] of [['center', 'center'], ['center', null], [null, 'center'], [null, null], ['right', 'right']]) {
  body += p(r(`Tabela jc ${tjc ?? 'nenhum'} linha ${rjc ?? 'nenhum'}`));
  body += tbl(tjc, 10000, [3000, 4000, 3000], rowsGB(rjc));
}
// tabela mais larga que a área de texto (como o .doc): vão grande antes
body += p(r('Tabela larga com vao grande'));
body += tbl('center', 14000, [5000, 6000, 3000], [[1, 5000, 'center', [[6000, 'Larga um com vao'], [3000, 'Fim larga']]], [0, 0, 'center', [[5000, 'Larga dois sem vao'], [6000, 'Meio dois larga'], [3000, 'Fim dois larga']]]]);
export const cases = [{ name: 'rj-grid', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 10 }) }) }];
// w:alignTablesRowByRow (compatibilidade): cada linha alinha sozinha — nos modos 11 e 15
for (const compat of [11, 15]) cases.push({ name: `rj-rowbyrow-c${compat}`, docx: buildDocx({ body, compat, extraCompat: '<w:alignTablesRowByRow/>', defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
