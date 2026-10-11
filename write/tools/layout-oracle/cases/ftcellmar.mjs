// Tabela flutuante nos modos antigos (≤ 14) com margens de célula fora do padrão
// (tblCellMar 70 / assimétricas): o alinhamento (centro/direita) usa o texto da
// 1ª célula — quanto a tabela sai pela margem? Mais larga e mais estreita que o
// texto; contorno do texto ao lado. Corpus t70 (tabela centralizada de 10123 tw).
// Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const ftbl = (spec, w, mar) => `<w:tbl><w:tblPr><w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" ${spec} w:tblpY="200"/><w:tblW w:w="${w}" w:type="dxa"/>${bd}`
  + `<w:tblCellMar><w:left w:w="${mar[0]}" w:type="dxa"/><w:right w:w="${mar[1]}" w:type="dxa"/></w:tblCellMar></w:tblPr>`
  + `<w:tblGrid><w:gridCol w:w="${w / 2}"/><w:gridCol w:w="${w / 2}"/></w:tblGrid>`
  + [1, 2].map((k) => `<w:tr>${[1, 2].map((c) => `<w:tc><w:tcPr><w:tcW w:w="${w / 2}" w:type="dxa"/></w:tcPr>${p(r(`cel ${k}${c} Hxg`))}</w:tc>`).join('')}</w:tr>`).join('') + '</w:tbl>';
const text = (seed) => p(r(lorem(70, seed)), '<w:jc w:val="left"/>');

export const cases = [];
for (const compat of [14, 11]) {
  const D = (o) => buildDocx({ body: o, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const add = (name, spec, w, mar) => cases.push({ name: `fm-${name}-c${compat}`, docx: D(p(r('Antes Hxg')) + ftbl(spec, w, mar) + text(1) + text(2)) });
  add('center-wide', 'w:tblpXSpec="center"', 10000, [70, 70]);
  add('center-narrow', 'w:tblpXSpec="center"', 4000, [70, 70]);
  add('right-narrow', 'w:tblpXSpec="right"', 4000, [70, 70]);
  add('center-asym', 'w:tblpXSpec="center"', 4000, [300, 40]);
  add('left-x', 'w:tblpX="400"', 4000, [300, 40]);
}
