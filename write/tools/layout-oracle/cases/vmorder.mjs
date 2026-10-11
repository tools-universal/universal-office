// Ordem do texto de uma célula mesclada na vertical (vMerge) no PDF do Word: ela sai
// na 1ª linha da mescla, na ordem das colunas (antes das células à direita da 1ª
// linha), ou depois da última linha da mescla? Com o texto da mescla na mesma
// baseline da 1ª linha, o extrator junta as duas numa linha só quando a ordem é a
// da 1ª linha. Mescla na 1ª e na 2ª coluna, centralizada, de 3 linhas, com fundo.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tc = (xml, vm = '', extra = '') => `<w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/>${vm === 'r' ? '<w:vMerge w:val="restart"/>' : vm === 'c' ? '<w:vMerge/>' : ''}${extra}</w:tcPr>${xml}</w:tc>`;
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="7500" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>`
  + rows.map((cells) => `<w:tr>${cells.join('')}</w:tr>`).join('') + '</w:tbl>';
const T = (s) => p(r(s));
const D = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
const SHD = '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>';

export const cases = [];
// mescla na 1ª coluna (2 linhas)
cases.push({ name: 'vmo-col0', docx: D(tbl([[tc(T('Mescla Hxg'), 'r'), tc(T('um b Hxg')), tc(T('um c Hxg'))], [tc(p(''), 'c'), tc(T('dois b Hxg')), tc(T('dois c Hxg'))]])) });
// mescla na 2ª coluna
cases.push({ name: 'vmo-col1', docx: D(tbl([[tc(T('um a Hxg')), tc(T('Mescla Hxg'), 'r'), tc(T('um c Hxg'))], [tc(T('dois a Hxg')), tc(p(''), 'c'), tc(T('dois c Hxg'))]])) });
// 3 linhas, mescla na 1ª coluna
cases.push({ name: 'vmo-3rows', docx: D(tbl([[tc(T('Mescla Hxg'), 'r'), tc(T('um b Hxg')), tc(T('um c Hxg'))], [tc(p(''), 'c'), tc(T('dois b Hxg')), tc(T('dois c Hxg'))], [tc(p(''), 'c'), tc(T('tres b Hxg')), tc(T('tres c Hxg'))]])) });
// continuação com fundo próprio (o texto da mescla fica por cima do fundo?)
cases.push({ name: 'vmo-fill', docx: D(tbl([[tc(T('Mescla Hxg'), 'r'), tc(T('um b Hxg')), tc(T('um c Hxg'))], [tc(p(''), 'c', SHD), tc(T('dois b Hxg')), tc(T('dois c Hxg'))]])) });
// duas mesclas VIZINHAS na mesma linha (2ª e 3ª colunas)
cases.push({ name: 'vmo-adjacent', docx: D(tbl([[tc(T('um a Hxg')), tc(T('Mescla Hxg'), 'r'), tc(T('Outra Hxg'), 'r')], [tc(T('dois a Hxg')), tc(p(''), 'c'), tc(p(''), 'c')]])) });
// duas mesclas na mesma linha (1ª e 3ª colunas)
cases.push({ name: 'vmo-two', docx: D(tbl([[tc(T('Mescla Hxg'), 'r'), tc(T('um b Hxg')), tc(T('Outra Hxg'), 'r')], [tc(p(''), 'c'), tc(T('dois b Hxg')), tc(p(''), 'c')]])) });
