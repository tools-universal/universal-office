// Largura de tabela em porcentagem (tblW/tcW pct) × soma da grade: o Word usa a
// grade (gridCol) ou reescala para a % da área útil? Por modo de compatibilidade.
// Texto centralizado em cada célula (a célula k desce k linhas, para cada rótulo
// ser uma linha própria na extração): o x de cada rótulo mostra a geometria.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const C = '<w:jc w:val="center"/>';
// área útil: 11906 − 1701·2 = 8504
function tbl({ tblW, grid, tcW, layout = '', ind = '' }) {
  const cells = grid.map((g, k) => `<w:tc><w:tcPr>${tcW ? tcW(k, g) : `<w:tcW w:w="${g}" w:type="dxa"/>`}</w:tcPr>${p('').repeat(k)}${p(r('C' + (k + 1) + 'x'), C)}</w:tc>`).join('');
  return `<w:tbl><w:tblPr>${tblW}${ind}${bd}${layout}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid><w:tr>${cells}</w:tr></w:tbl>`;
}
const pct = (k, g, sum) => `<w:tcW w:w="${Math.round((g / sum) * 5000)}" w:type="pct"/>`;
const wide = [800, 700, 1000, 5500, 900, 800]; // soma 9700 > 8504
const narrow = [800, 700, 1000, 3000, 900, 800]; // soma 7200 < 8504
export const cases = [];
for (const compat of [11, 14, 15]) {
  let body = p(r('Antes Hxg'));
  for (const [nm, grid] of [['larga', wide], ['estreita', narrow]]) {
    const sum = grid.reduce((a, b) => a + b, 0);
    body += p(r(`pct ${nm}`));
    body += tbl({ tblW: '<w:tblW w:w="5000" w:type="pct"/>', grid, tcW: (k, g) => pct(k, g, sum) });
    body += p(r(`pct ${nm} tcW dxa`));
    body += tbl({ tblW: '<w:tblW w:w="5000" w:type="pct"/>', grid });
    body += p(r(`auto ${nm}`));
    body += tbl({ tblW: '<w:tblW w:w="0" w:type="auto"/>', grid, tcW: (k, g) => pct(k, g, sum) });
    body += p(r(`pct ${nm} fixed`));
    body += tbl({ tblW: '<w:tblW w:w="5000" w:type="pct"/>', grid, tcW: (k, g) => pct(k, g, sum), layout: '<w:tblLayout w:type="fixed"/>' });
  }
  body += p(r('Depois Hxg'));
  cases.push({ name: `tblpct-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 9 }) }) });
}
