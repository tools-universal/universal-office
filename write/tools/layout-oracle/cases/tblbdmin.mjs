// exploração: a borda da célula entra na largura mínima da coluna no autoajuste? Tabela em
// pct (100%, colunas 20/40/40%) cuja 1ª coluna tem uma "palavra" (sublinhados) maior que a
// fração: a coluna cresce até o mínimo. Bordas de espessuras diferentes em todas as células
// e só de um lado, com as margens da célula padrão, zero e 2 pt; o x do texto e as bordas
// medem a largura da 1ª. Arial 11.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const side = (s, sz) => (sz ? `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="000000"/>` : `<w:${s} w:val="nil"/>`);
const bdr = (l, rr) => `<w:tcBorders>${side('top', 0)}${side('left', l)}${side('bottom', 0)}${side('right', rr)}</w:tcBorders>`;
const cell = (w, b, t) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/>${b}</w:tcPr>${p(r(t))}</w:tc>`;
const tbl = (bs, n, mar) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${mar !== undefined ? `<w:tblCellMar><w:left w:w="${mar}" w:type="dxa"/><w:right w:w="${mar}" w:type="dxa"/></w:tblCellMar>` : ''}<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="nil"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="1700"/><w:gridCol w:w="3400"/><w:gridCol w:w="3400"/></w:tblGrid>`
  + `<w:tr>${cell(1000, bs[0], '_'.repeat(n))}${cell(2000, bs[1], 'Bcoluna')}${cell(2000, bs[2], 'Ccoluna')}</w:tr></w:tbl>` + p('');
export const cases = [];
const V = [
  ['nenhuma', [bdr(0, 0), bdr(0, 0), bdr(0, 0)]],
  ['todas4', [bdr(4, 4), bdr(4, 4), bdr(4, 4)]],
  ['todas24', [bdr(24, 24), bdr(24, 24), bdr(24, 24)]],
  ['todas48', [bdr(48, 48), bdr(48, 48), bdr(48, 48)]],
  ['esq48', [bdr(48, 0), bdr(0, 0), bdr(0, 0)]],
  ['dir48', [bdr(0, 48), bdr(0, 0), bdr(0, 0)]],
  ['prox48', [bdr(0, 0), bdr(48, 0), bdr(0, 0)]],
];
for (const mar of [undefined, 0, 40]) {
  let body = '';
  for (const [, bs] of V) for (const n of [20, 24]) body += tbl(bs, n, mar);
  cases.push({ name: `tbm-pct${mar === undefined ? '' : `-m${mar}`}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
