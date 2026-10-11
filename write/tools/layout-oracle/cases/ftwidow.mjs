// Linha de tabela FLUTUANTE que parte no pé da página com um parágrafo de 4 linhas
// na célula: viúvas/órfãs como no fluxo (3 cabem → 2 + 2)? E o resto da linha vai
// todo para a página seguinte (não volta a partir na mesma página)? Espaçador de
// altura exata posiciona a linha; Arial 10 (≈ 230 tw por linha), sem bordas.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const fp = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="1"/>';
const words = 'texto corrido da celula para quebrar em quatro linhas inteiras sem enfeite algum'.split(' ');
const four = Array.from({ length: 34 }, (_, k) => words[k % words.length]).join(' ');
const tbl = (float) => `<w:tbl><w:tblPr>${float ? fp : ''}<w:tblW w:w="5000" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(four))}${p(r('Segue Hxg'))}</w:tc></w:tr></w:tbl>`;
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const L of [13200, 13430, 13660]) {
  const spacer = p(r('Espaco Hxg'), `<w:spacing w:line="${L}" w:lineRule="exact"/>`);
  cases.push({ name: `fw-float-${L}`, docx: buildDocx({ body: spacer + tbl(true) + p(r('Ancora Hxg')) + p(r('Depois Hxg')), defaults }) });
  cases.push({ name: `fw-flow-${L}`, docx: buildDocx({ body: spacer + tbl(false) + p(r('Depois Hxg')), defaults }) });
}
