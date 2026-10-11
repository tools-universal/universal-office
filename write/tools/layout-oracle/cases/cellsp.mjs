// tblCellSpacing presente (mesmo 0): o Word troca para o modelo de bordas
// separadas (cada célula com a sua borda de cima e de baixo)? (tabelas
// com tblCellSpacing w=0 e bordas pontilhadas — 0,5pt a mais por linha)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const border = (val, sz) => '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="${val}" w:sz="${sz}" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = ({ spacing, rowSpacing = spacing, val = 'single', sz = 4, rows = 8 }) => {
  const sp = (v) => (v === undefined ? '' : `<w:tblCellSpacing w:w="${v}" w:type="dxa"/>`);
  return `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${sp(spacing)}${border(val, sz)}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
    + Array.from({ length: rows }, (_, k) => `<w:tr>${rowSpacing === undefined ? '' : `<w:trPr>${sp(rowSpacing)}</w:trPr>`}<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r(`L${k + 1} Hxg`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('B'))}</w:tc></w:tr>`).join('') + '</w:tbl>';
};
const D = (t) => buildDocx({ body: p(r('Antes Hxg')) + t + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
for (const [name, o] of [
  ['cs-none', {}],
  ['cs-zero', { spacing: 0 }],
  ['cs-zero-tblonly', { spacing: 0, rowSpacing: undefined }],
  ['cs-zero-rowonly', { spacing: undefined, rowSpacing: 0 }],
  ['cs-zero-dotted', { spacing: 0, val: 'dotted' }],
  ['cs-zero-thick', { spacing: 0, sz: 12 }],
  ['cs-40', { spacing: 40 }],
]) cases.push({ name, docx: D(tbl(o)) });
