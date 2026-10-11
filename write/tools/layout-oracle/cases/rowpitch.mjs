// Altura de linha de tabela com altura mínima (trHeight atLeast) maior que o
// conteúdo: o passo entre linhas soma as bordas? Com vAlign centro, hideMark,
// bordas de célula (tcBorders) de espessuras diferentes e bordas nil em cima.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const sz8 = (side, sz = 8) => `<w:${side} w:val="single" w:sz="${sz}" w:space="0" w:color="auto"/>`;
const cell = (txt, tcExtra = '') => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/>${tcExtra}</w:tcPr>${p(r(txt, '<w:sz w:val="16"/>'))}</w:tc>`;
const row = (cells, h) => `<w:tr>${h ? `<w:trPr><w:trHeight w:val="${h}"/></w:trPr>` : ''}${cells}</w:tr>`;
const tbl = (rows, tblPr = '') => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${tblPr}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>${rows}</w:tbl>`;
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const N = 8;

export const cases = [];
for (const [name, tc, h] of [
  ['rp-min-bd8', `<w:tcBorders>${sz8('top')}${sz8('bottom')}</w:tcBorders>`, 315],
  ['rp-min-bd8-center', `<w:tcBorders>${sz8('top')}${sz8('bottom')}</w:tcBorders><w:vAlign w:val="center"/>`, 315],
  ['rp-min-bd8-hidemark', `<w:tcBorders>${sz8('top')}${sz8('bottom')}</w:tcBorders><w:vAlign w:val="center"/><w:hideMark/>`, 315],
  ['rp-min-topnil', `<w:tcBorders><w:top w:val="nil"/>${sz8('bottom')}</w:tcBorders>`, 315],
  ['rp-min-bd4', `<w:tcBorders>${sz8('top', 4)}${sz8('bottom', 4)}</w:tcBorders>`, 315],
  ['rp-min-bd12', `<w:tcBorders>${sz8('top', 12)}${sz8('bottom', 12)}</w:tcBorders>`, 315],
  ['rp-min-nobd', '', 315],
  ['rp-auto-bd8', `<w:tcBorders>${sz8('top')}${sz8('bottom')}</w:tcBorders>`, 0],
]) {
  const rows = Array.from({ length: N }, (_, k) => row(cell(`r${k} a Hxg`, tc) + cell(`r${k} b Hxg`, tc) + cell(`r${k} c Hxg`, tc), h)).join('');
  cases.push({ name, docx: D(p(r('Antes Hxg')) + tbl(rows) + p(r('Depois Hxg'))) });
}
// réplica de grade de cronograma: 6 colunas, 1ª coluna mesclada na vertical (vMerge)
// com bordas nil em cima/embaixo, demais com só a borda de baixo; cabeçalho com as duas
{
  const B = (t, l, b, rr) => `<w:tcBorders>${t ? sz8('top') : '<w:top w:val="nil"/>'}${l ? sz8('left') : '<w:left w:val="nil"/>'}${b ? sz8('bottom') : '<w:bottom w:val="nil"/>'}${rr ? sz8('right') : '<w:right w:val="nil"/>'}</w:tcBorders>`;
  const C = (w, txt, tc) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${tc}<w:vAlign w:val="center"/><w:hideMark/></w:tcPr>${p(r(txt, '<w:b/><w:sz w:val="16"/>'), '<w:jc w:val="center"/>')}</w:tc>`;
  const grid = '<w:tblGrid><w:gridCol w:w="1020"/>' + '<w:gridCol w:w="1540"/>'.repeat(5) + '</w:tblGrid>';
  const hdr = `<w:tr><w:trPr><w:trHeight w:val="315"/></w:trPr>${C(1020, ' ', B(1, 1, 1, 1))}${[1, 2, 3, 4, 5].map((k) => C(1540, `Coluna ${k}`, B(1, 0, 1, 1))).join('')}</w:tr>`;
  const body = (first, mergeTxt, txt) => `<w:tr><w:trPr><w:trHeight w:val="315"/></w:trPr>${C(1020, first ? mergeTxt : '', (first ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') + B(0, 1, 0, 1))}${[1, 2, 3, 4, 5].map((k) => C(1540, `${txt} ${k}`, B(0, 0, 1, 1))).join('')}</w:tr>`;
  const rows = hdr + body(true, 'Bloco', 'item') + body(false, '', 'outro') + body(false, '', 'mais') + body(true, 'Outro', 'fim') + body(false, '', 'ultimo');
  const tblx = `<w:tbl><w:tblPr><w:tblW w:w="8720" w:type="dxa"/><w:tblInd w:w="872" w:type="dxa"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr>${grid}${rows}</w:tbl>`;
  // (com a mescla vertical as posições batem, mas o texto da célula mesclada sai em outra
  // ordem no PDF — caso fora do oráculo)
  cases.push({ name: 'rp-sched-nomerge', docx: D(p(r('Antes Hxg')) + tblx.replaceAll('<w:vMerge w:val="restart"/>', '').replaceAll('<w:vMerge/>', '') + p(r('Depois Hxg'))) });
}
