// Tabela flutuante no rodapé posicionada (relativa ao texto) além do pé da
// página: o Word a sobe até caber na página.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const ftable = (y) => `<w:tbl><w:tblPr><w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="page" w:tblpX="637" w:tblpY="${y}"/><w:tblW w:w="6000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('Codigo Hxg'))}${p(r('XY097'))}</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('Edicao Hxg'))}${p(r('Primeira'))}</w:tc></w:tr></w:tbl>`;
const body = Array.from({ length: 6 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
export const cases = [];
for (const [name, y, footer] of [['hfc-far', 1737, 15], ['hfc-mid', 600, 15], ['hfc-near', 1737, 600]]) {
  cases.push({ name, docx: buildDocx({ body, footers: { default: ftable(y) + p('') }, sect: sectPr({ bottom: 1084, footer }), defaults: docDefaults({ font: 'Arial', size: 8 }) }) });
}
