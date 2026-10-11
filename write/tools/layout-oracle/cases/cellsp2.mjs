// Modelo de bordas separadas (tblCellSpacing): geometria HORIZONTAL e vertical
// com valores grandes (espaçamento 10pt, bordas grossas, colunas desiguais,
// recuo da tabela, margens de célula zero) para separar as hipóteses do cellsp.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const border = (val, sz) => '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="${val}" w:sz="${sz}" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = ({ spacing = 200, sz = 4, cols = [3000, 3000], rows = 3, ind = 0, mar = null, val = 'single', cellBorders = '', fixed = false }) => {
  const sp = `<w:tblCellSpacing w:w="${spacing}" w:type="dxa"/>`;
  const w = cols.reduce((a, b) => a + b, 0);
  const cm = mar === null ? '' : `<w:tblCellMar><w:top w:w="${mar}" w:type="dxa"/><w:left w:w="${mar}" w:type="dxa"/><w:bottom w:w="${mar}" w:type="dxa"/><w:right w:w="${mar}" w:type="dxa"/></w:tblCellMar>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${w}" w:type="dxa"/>${sp}${ind ? `<w:tblInd w:w="${ind}" w:type="dxa"/>` : ''}${border(val, sz)}${fixed ? '<w:tblLayout w:type="fixed"/>' : ''}${cm}</w:tblPr><w:tblGrid>${cols.map((c) => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`
    + Array.from({ length: rows }, (_, k) => `<w:tr><w:trPr>${sp}</w:trPr>${cols.map((c, ci) => `<w:tc><w:tcPr><w:tcW w:w="${c}" w:type="dxa"/>${cellBorders}</w:tcPr>${p(r(ci === 0 ? `L${k + 1} Hxg` : `C${ci}`))}</w:tc>`).join('')}</w:tr>`).join('') + '</w:tbl>';
};
const D = (t) => buildDocx({ body: p(r('Antes Hxg')) + t + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
for (const [name, o] of [
  ['cs2-200', {}],
  ['cs2-200-thick', { sz: 24 }],
  ['cs2-200-3col', { cols: [2000, 1500, 2500] }],
  ['cs2-200-nob', { val: 'nil' }],
  ['cs2-200-ind', { ind: 500 }],
  ['cs2-200-mar0', { mar: 0 }],
  ['cs2-100-thick-mar0', { spacing: 100, sz: 24, mar: 0 }],
  ['cs2-0-thick-mar0', { spacing: 0, sz: 24, mar: 0 }],
  // bordas só da célula (tabela sem bordas): a célula desenha as suas
  ['cs2-200-cellb', { val: 'nil', cellBorders: '<w:tcBorders><w:top w:val="single" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders>' }],
  // layout FIXO (sem autoajuste redistribuindo as colunas pelo conteúdo)
  ['cs2f-200', { fixed: true }],
  ['cs2f-200-3col', { fixed: true, cols: [2000, 1500, 2500] }],
  ['cs2f-200-3col-thick', { fixed: true, cols: [2000, 1500, 2500], sz: 24 }],
  ['cs2f-0-3col', { fixed: true, cols: [2000, 1500, 2500], spacing: 0 }],
  ['cs2f-40', { fixed: true, spacing: 40 }],
]) cases.push({ name, docx: D(tbl(o)) });
