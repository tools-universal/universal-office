// Linha de cabeçalho repetida (w:tblHeader) fora do caso simples: tabela
// FLUTUANTE (w:tblpPr) que passa da página e tabela ANINHADA longa dentro de
// uma célula — o Word repete o cabeçalho? (texto "Cab" no topo das páginas). A flutuante
// ocupa a largura toda (o texto de depois não a contorna — outra regra).
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const b = (side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`;
const brd = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b).join('')}</w:tblBorders>`;
const cell = (w, inner) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
function tbl({ rows, ws = [3000, 3000], tblpPr = '', hdr = 1 }) {
  return `<w:tbl><w:tblPr>${tblpPr}<w:tblW w:w="0" w:type="auto"/>${brd}<w:tblLook w:val="04A0"/></w:tblPr>`
    + `<w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
    + rows.map((cells, ri) => `<w:tr>${ri < hdr ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells.map((c, ci) => cell(ws[ci] ?? 3000, c)).join('')}</w:tr>`).join('')
    + '</w:tbl>';
}
const body = (n, tag) => [[p(r(`Cab ${tag} A`)), p(r(`Cab ${tag} B`))], ...Array.from({ length: n }, (_, i) => [p(r(`${tag} linha ${i + 1}`)), p(r('valor'))])];
const doc = (x) => buildDocx({ body: x, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [
  { name: 'hdr-float', docx: doc(p(r('Antes da tabela flutuante.'))
    + tbl({ ws: [4250, 4250], rows: body(70, 'F'), tblpPr: '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:tblpY="1"/>' })
    + p(r('Depois.'))) },
  { name: 'hdr-nested', docx: doc(p(r('Antes.'))
    + tbl({ ws: [7000], hdr: 0, rows: [[tbl({ rows: body(70, 'N') }) + p(r('fim da celula'))]] })
    + p(r('Depois.'))) },
];
