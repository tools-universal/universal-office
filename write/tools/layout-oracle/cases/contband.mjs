// Linha de tabela que começa a página seguinte (a tabela parte ENTRE linhas): a faixa
// de borda acima do texto dela é a borda compartilhada com a linha anterior (que ficou
// na outra página) ou só a borda de cima da própria linha? Bordas de 3pt para medir.
// Tabela no fluxo e flutuante (âncora no texto). Arial 11: 12,65 pt por linha.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const B = (s, sz = 24) => `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="auto"/>`;
const N = (s) => `<w:${s} w:val="nil"/>`;
const fpText = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="199"/>';
/** tabela de 1 coluna; cada célula com as bordas `tc` e a tabela com `tbl` */
const tbl = (rows, tc, tblB, fp = '') => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="6000" w:type="dxa"/>${tblB ? `<w:tblBorders>${tblB}</w:tblBorders>` : ''}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/>${tc ? `<w:tcBorders>${tc}</w:tcBorders>` : ''}</w:tcPr>${p(r(`linha ${k + 1} Hxg`))}</w:tc></w:tr>`).join('')
  + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const kinds = {
  // só a borda de baixo das células (a de cima nula)
  bottom: [B('bottom') + N('top'), ''],
  // só a de cima das células
  top: [B('top') + N('bottom'), ''],
  // bordas internas da tabela (insideH), sem bordas de célula
  inside: ['', B('top') + B('bottom') + B('insideH')],
};
export const cases = [];
for (const [k, [tc, tb]] of Object.entries(kinds)) {
  cases.push({ name: `cb-flow-${k}`, docx: D(filler(48) + tbl(10, tc, tb) + p(r('Fim Hxg'))) });
  cases.push({ name: `cb-float-${k}`, docx: D(filler(48) + tbl(10, tc, tb, fpText) + p(r('Ancora Hxg')) + p(r('Fim Hxg'))) });
}
