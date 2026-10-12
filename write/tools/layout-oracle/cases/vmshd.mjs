// Fundo (w:shd) de célula mesclada na vertical (vMerge) que atravessa a quebra de página:
// o Word pinta o fundo da célula inicial também na parte da página seguinte? E quando as
// células de continuação têm fundo próprio (outra cor) ou só elas têm fundo? Medido: o fundo
// da inicial vale para a mescla inteira, em cada página (do topo ao pé da parte); o das
// continuações é ignorado. A verificação do fundo é visual (PDF do Word × o nosso); no teste
// vale o texto. Arial 11: 12,65 pt por linha. Cores e rótulos inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const shd = (c) => (c ? `<w:shd w:val="clear" w:color="auto" w:fill="${c}"/>` : '');
const tc = (xml, vm, fill) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/>${vm === 'r' ? '<w:vMerge w:val="restart"/>' : vm === 'c' ? '<w:vMerge/>' : ''}${shd(fill)}</w:tcPr>${xml}</w:tc>`;
/** mescla de `rows` linhas na 1ª coluna: fundo `a` na inicial, `b` nas continuações */
const tbl = (rows, a, b) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr>${tc(k ? p('') : p(r('mescla Hxg')), k ? 'c' : 'r', k ? b : a)}${tc(p(r(`linha ${k + 1} Hxg`)))}</w:tr>`).join('')
  + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const A = '2E5C8A', B = 'C04040';

export const cases = [];
// 52 linhas de enchimento: cabem 3 linhas da tabela (de 6) na 1ª página
cases.push({ name: 'vmsh-ini', docx: D(filler(52) + tbl(6, A) + p(r('Fim Hxg'))) });
cases.push({ name: 'vmsh-cont', docx: D(filler(52) + tbl(6, A, B) + p(r('Fim Hxg'))) });
cases.push({ name: 'vmsh-socont', docx: D(filler(52) + tbl(6, '', B) + p(r('Fim Hxg'))) });
// a mescla inteira na mesma página, com continuações de outra cor
cases.push({ name: 'vmsh-cont1', docx: D(filler(2) + tbl(4, A, B) + p(r('Fim Hxg'))) });
