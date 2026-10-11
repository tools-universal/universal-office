// Moldura (framePr, sem quebra) no rodapé ANTES de uma tabela de uma linha, posicionada
// entre a 2ª e a 3ª célula, na altura da linha: no PDF do Word o texto dela sai na
// ordem das colunas (depois das células à esquerda, antes das à direita) ou antes da
// tabela? Com a mesma baseline, o extrator junta tudo numa linha só se a ordem for a
// da linha. Moldura à esquerda da 1ª célula (controle).
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const frame = (xtw) => p(r('Num'), `<w:framePr w:wrap="none" w:vAnchor="text" w:hAnchor="page" w:x="${xtw}" w:y="0"/>`);
const tc = (t) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r(t))}</w:tc>`;
const tbl = `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>${tc('Alfa')}${tc('Beta')}${tc('fim Hxg')}</w:tr></w:tbl>`;
const D = (xtw) => buildDocx({ body: p(r('corpo Hxg')), footers: { default: frame(xtw) + tbl + p('') }, sect: sectPr({ left: 1701, right: 1134 }), defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [
  // margem 85 pt; células em 85, 235 e 385 pt; moldura em 360 pt (entre "Beta" e "fim")
  { name: 'hft-frame-mid', docx: D(7200) },
  // moldura à esquerda de tudo (40 pt)
  { name: 'hft-frame-left', docx: D(800) },
];
