// Tabela de layout fixo com colunas da grade mais estreitas que as margens da célula (como
// a exportação do Google Docs grava: larguras fracionárias, colunas de ~58 twips no fim):
// a coluna estreita cresce até as margens? Quanto, e de quem sai? Margens 100/0/200,
// células finais vazias ou com texto, corpo 11 e 20. Arial; textos inventados.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const mar = (m) => `<w:tcMar><w:left w:w="${m}" w:type="dxa"/><w:right w:w="${m}" w:type="dxa"/></w:tcMar>`;
const tbl = (m, grid, tblW, row, rp) => `<w:tbl><w:tblPr><w:tblW w:w="${tblW}" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>`
  + `<w:tr>${row.map(([span, t]) => `<w:tc><w:tcPr>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${mar(m)}</w:tcPr>${p(t ? r(t, rp) : '', rp ? `<w:rPr>${rp}</w:rPr>` : '')}</w:tc>`).join('')}</w:tr></w:tbl>` + p('');
const G = ['2904.747345130857', '57.64116985376807', '5720.764465892766', '57.64116985376807', '57.64116985376807', '57.64116985376807', '57.64116985376807', '57.64116985376807', '57.64116985376807'];
const GI = [2905, 58, 5721, 58, 58, 58, 58, 58, 58];
let body = '';
for (const m of [100, 0, 200]) for (const [grid, gname] of [[G, 'frac'], [GI, 'int']]) for (const rp of ['', sz(20)]) {
  body += p(r(`Margem ${m} grade ${gname} ${rp ? 'corpo 20' : 'corpo 11'}`));
  body += tbl(m, grid, '9029.0', [[6, 'Celula larga com texto que ocupa varias linhas para medir a largura util da primeira celula'], [1, ''], [1, ''], [1, '']], rp);
  body += tbl(m, grid, '9029.0', [[6, 'Outra celula larga com texto que ocupa varias linhas para medir a largura'], [1, 'a'], [1, ''], [1, 'b']], rp);
}
export const cases = [{ name: 'tmc-fixa', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) }];
