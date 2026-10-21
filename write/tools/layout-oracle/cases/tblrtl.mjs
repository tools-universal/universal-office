// Tabelas: direita para a esquerda (w:bidiVisual: a 1ª coluna à direita, recuo e
// bordas esquerda/direita espelhados), altura de linha w:hRule="auto" (o Word ignora
// o w:val: a linha fica com a altura do conteúdo), mescla horizontal antiga
// (w:hMerge restart/continue = uma célula larga) e as direções de texto vertical
// que o Word não oferece na interface (tbLrV, tbRlV, lr do estrito) — texto vertical de
// espaços sem quebra (a extração do PDF ignora brancos; o texto girado não casaria).
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const b = (side, sz, color) => `<w:${side} w:val="single" w:sz="${sz}" w:space="0" w:color="${color}"/>`;
const brd = `<w:tblBorders>${b('top', 4, 'auto')}${b('left', 24, 'FF0000')}${b('bottom', 4, 'auto')}${b('right', 8, '0000FF')}${b('insideH', 4, 'auto')}${b('insideV', 4, 'auto')}</w:tblBorders>`;
const cell = (w, text, extra = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra}</w:tcPr>${p(r(text))}</w:tc>`;
const grid = (ws) => `<w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
function tbl({ bidi = false, ind = 0, rows, ws = [1500, 2500, 3500], trPr = () => '' }) {
  const pr = `<w:tblPr>${bidi ? '<w:bidiVisual/>' : ''}<w:tblW w:w="0" w:type="auto"/>${ind ? `<w:tblInd w:w="${ind}" w:type="dxa"/>` : ''}${brd}<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0"/></w:tblPr>`;
  return `<w:tbl>${pr}${grid(ws)}${rows.map((cells, ri) => `<w:tr>${trPr(ri) ? `<w:trPr>${trPr(ri)}</w:trPr>` : ''}${cells.join('')}</w:tr>`).join('')}</w:tbl>${p(r('Separador.'))}`;
}
const row = (ri, ws = [1500, 2500, 3500]) => ws.map((w, ci) => cell(w, `L${ri + 1}C${ci + 1}`));
const doc = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [
  { name: 'rtl-basic', docx: doc(tbl({ bidi: true, ind: 720, rows: [row(0), row(1)] }) + tbl({ bidi: false, ind: 720, rows: [row(0), row(1)] })) },
  { name: 'rtl-noind', docx: doc(tbl({ bidi: true, rows: [row(0), row(1)] })) },
  { name: 'rtl-merge', docx: doc(tbl({ bidi: true, ind: 360, rows: [
    [cell(4000, 'Mesclada', '<w:gridSpan w:val="2"/>'), cell(3500, 'L1C3')],
    row(1),
  ] })) },
  { name: 'hrule-auto', docx: doc(tbl({ rows: [row(0), row(1), row(2), row(3)], trPr: (ri) => ['<w:trHeight w:val="1200" w:hRule="auto"/>', '<w:trHeight w:val="1200"/>', '<w:trHeight w:val="1200" w:hRule="exact"/>', ''][ri] })) },
  { name: 'hmerge', docx: doc(tbl({ rows: [
    [cell(1500, 'Ini', '<w:hMerge w:val="restart"/>'), cell(2500, '', '<w:hMerge/>'), cell(3500, 'Depois')],
    row(1),
  ] })) },
  { name: 'vdir-raros', docx: doc(['tbLrV', 'tbRlV', 'lr', 'rl', 'lrTbV'].map((d) => tbl({ ws: [1200, 6000], rows: [[
    cell(1200, ' '.repeat(24), `<w:textDirection w:val="${d}"/>`), cell(6000, `direcao ${d}`),
  ]], trPr: () => '<w:trHeight w:val="1500"/>' })).join('')) },
];
