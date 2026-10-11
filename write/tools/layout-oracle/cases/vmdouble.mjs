// Borda inferior DUPLA de célula (tcBorders double) numa linha, com e sem
// mesclagem vertical: quanto a linha cresce e onde fica o texto. Bordas da
// tabela simples 18, células com borda própria (formulário de checklist).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = (side, val, sz) => `<w:${side} w:val="${val}" w:sz="${sz}" w:space="0" w:color="000000"/>`;
const tblBorders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => bd(s, 'single', 18)).join('') + '</w:tblBorders>';
const tc = (w, content, { gs, vm, bottom = ['single', 8], top = ['single', 8] } = {}) =>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${gs ? `<w:gridSpan w:val="${gs}"/>` : ''}${vm ? `<w:vMerge${vm === 'restart' ? ' w:val="restart"' : ''}/>` : ''}<w:tcBorders>${bd('top', ...top)}${bd('bottom', ...bottom)}</w:tcBorders></w:tcPr>${content}</w:tc>`;
const para = (text, before) => p(text ? r(text, '<w:b/><w:sz w:val="20"/>') : '', `<w:spacing w:before="${before}"/><w:ind w:left="32"/><w:rPr><w:b/><w:sz w:val="20"/></w:rPr>`);
const emptyMerged = p('', '<w:spacing w:before="112" w:line="230" w:lineRule="atLeast"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr>');
const tiny = p('', '<w:rPr><w:sz w:val="2"/></w:rPr>');
const row = (h, cells) => `<w:tr><w:trPr><w:trHeight w:val="${h}"/></w:trPr>${cells}</w:tr>`;

function table({ merge = true, dbl1 = true, dbl2 = true }) {
  const D = ['double', 18], S = ['single', 8];
  let x = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="153" w:type="dxa"/>${tblBorders}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="7510"/><w:gridCol w:w="2445"/></w:tblGrid>`;
  x += row(402, tc(7510, para('LINHA UM:', 78)) + tc(2445, para('', 78)));
  x += row(344, tc(7510, para('QUANTIDADE:', 78)) + tc(2445, emptyMerged, { ...(merge ? { vm: 'restart' } : {}), bottom: dbl2 ? D : S }));
  x += row(339, tc(7510, para('CLIENTE OU FORNECEDOR:', 27), { bottom: dbl1 ? D : S }) + tc(2445, merge ? tiny : emptyMerged, { ...(merge ? { vm: 'cont' } : {}), top: merge ? ['nil', 0] : S, bottom: dbl2 ? D : S }));
  x += row(382, tc(7510, para('TRANSPORTADOR:', 78)) + tc(2445, para('', 78)));
  x += row(402, tc(7510, para('MOTORISTA:', 78)) + tc(2445, para('', 78)));
  return x + '</w:tbl>';
}
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const [name, o] of [
  ['vmd-merge-both', { merge: true, dbl1: true, dbl2: true }],
  ['vmd-merge-none', { merge: true, dbl1: false, dbl2: false }],
  ['vmd-merge-cell1', { merge: true, dbl1: true, dbl2: false }],
  ['vmd-merge-cell2', { merge: true, dbl1: false, dbl2: true }],
  ['vmd-plain-both', { merge: false, dbl1: true, dbl2: true }],
  ['vmd-plain-cell1', { merge: false, dbl1: true, dbl2: false }],
]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + table(o) + p(r('Depois Hxg')), defaults }) });
}
