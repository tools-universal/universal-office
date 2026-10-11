// Tabela ANINHADA numa célula que parte no pé da página: viúvas/órfãs valem nos
// parágrafos da célula aninhada? Arial 11: 12,65 pt por linha, 55 linhas na página.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const inner = (c0, c1) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="4000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${c0}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${c1}</w:tc></w:tr></w:tbl>`;
const outer = (cell) => `<w:tbl><w:tblPr><w:tblW w:w="7000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="7000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="7000" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
// a célula externa: 1 linha + tabela aninhada (rótulo | parágrafo de 3 linhas) + 1 linha
// cabem k linhas da aninhada na página 1
for (const k of [1, 2]) {
  cases.push({ name: `nw-orph-k${k}`, docx: D(filler(54 - k) + outer(p(r('topo Hxg')) + inner(p(r('rotulo Hxg')), p(r(lines(3, 'aninh')))) + p(r('fim celula Hxg'))) + p(r('Fim Hxg'))) });
}
// parágrafo de 5 linhas na aninhada, cabem 4 (viúva)
cases.push({ name: 'nw-widow-k4', docx: D(filler(50) + outer(p(r('topo Hxg')) + inner(p(r('rotulo Hxg')), p(r(lines(5, 'aninh')))) + p(r('fim celula Hxg'))) + p(r('Fim Hxg'))) });
