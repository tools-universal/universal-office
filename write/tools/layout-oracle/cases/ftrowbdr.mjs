// Tabela FLUTUANTE que parte (âncora no texto): a linha que termina rente ao pé do
// corpo também tem de caber com a borda desenhada na quebra (0,5 pt), como no fluxo
// (oráculo rowfitbdr, rfb-m-*)? Espaçador de altura exata variando de 4 em 4 twips.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const fp = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="1"/>';
const tbl = (n) => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="5000" w:type="dxa"/>${bdr}<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
  + Array.from({ length: n }, (_, k) => `<w:tr><w:trPr><w:trHeight w:val="600"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(`Linha ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (let L = 1770; L <= 1830; L += 4) {
  const spacer = p(r('Espaco Hxg'), `<w:spacing w:line="${L}" w:lineRule="exact"/>`);
  cases.push({ name: `frb-${L}`, docx: buildDocx({ body: spacer + tbl(30) + p(r('Ancora Hxg')) + p(r('Depois Hxg')), defaults }) });
}
