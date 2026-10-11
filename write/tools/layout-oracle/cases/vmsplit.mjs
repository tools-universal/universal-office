// Célula mesclada na vertical (vMerge) que atravessa a quebra de página: o texto dela
// começa na parte da 1ª página (no topo da mescla) e continua no topo da parte da página
// seguinte, como uma célula que parte? Com alinhamento vertical topo e centro, e com o
// texto todo cabendo na parte da 1ª página. Arial 11: 12,65 pt por linha.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const tc = (xml, vm = '', extra = '') => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/>${vm === 'r' ? '<w:vMerge w:val="restart"/>' : vm === 'c' ? '<w:vMerge/>' : ''}${extra}</w:tcPr>${xml}</w:tc>`;
const merged = (n) => Array.from({ length: n }, (_, k) => p(r(`mescla ${k + 1} Hxg`))).join('');
const tbl = (n, rows, extra = '') => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr>${tc(k ? p('') : merged(n), k ? 'c' : 'r', extra)}${tc(p(r(`linha ${k + 1} Hxg`)))}</w:tr>`).join('')
  + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
// 52 linhas de enchimento: cabem 2 linhas da tabela (de 4) na 1ª página
cases.push({ name: 'vms-top', docx: D(filler(52) + tbl(5, 4) + p(r('Fim Hxg'))) });
cases.push({ name: 'vms-center', docx: D(filler(52) + tbl(5, 4, '<w:vAlign w:val="center"/>') + p(r('Fim Hxg'))) });
// texto da mescla cabe na parte da 1ª página (2 linhas)
cases.push({ name: 'vms-fit', docx: D(filler(52) + tbl(2, 4) + p(r('Fim Hxg'))) });
// mescla de 6 linhas, 1 na 1ª página
cases.push({ name: 'vms-one', docx: D(filler(53) + tbl(4, 6) + p(r('Fim Hxg'))) });
