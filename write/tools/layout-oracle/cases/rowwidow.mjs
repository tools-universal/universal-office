// Linha de tabela que quebra no pé da página: viúvas/órfãs dentro da célula
// (só modo 15), célula que não consegue pôr nem a 1ª linha (a linha inteira
// desce), espaço depois do parágrafo que tem de caber com a última linha dele,
// espaço entre parágrafos no corte e 1ª linha da tabela sozinha no pé.
// Arial 11 sem espaçamento: 12,65 pt por linha, 55 linhas na página A4.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const tbl = (rows, cols = 1, tblPr = '') => `<w:tbl><w:tblPr><w:tblW w:w="${4000 * cols}" w:type="dxa"/>${tblPr}</w:tblPr><w:tblGrid>${'<w:gridCol w:w="4000"/>'.repeat(cols)}</w:tblGrid>${rows}</w:tbl>`;
const tr = (cells, trPr = '') => `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${c}</w:tc>`).join('')}</w:tr>`;
const WC = { def: '', on: '<w:widowControl/>', off: '<w:widowControl w:val="0"/>' };
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
// 1) célula única, parágrafo de 5 linhas; k linhas cabem na página 1
for (const [wc, ppr] of Object.entries(WC)) {
  for (const k of [1, 2, 3, 4]) {
    cases.push({ name: `rw-1c-k${k}-${wc}`, docx: D(filler(55 - k) + tbl(tr([p(r(lines(5, 'cel')), ppr)])) + p(r('Fim Hxg'))) });
  }
}
// 1b) célula com dois parágrafos: 2 linhas soltas + parágrafo de 3 linhas (k = linhas que cabem)
for (const k of [3, 4]) {
  cases.push({ name: `rw-1c2p-k${k}`, docx: D(filler(55 - k) + tbl(tr([p(r('solta a Hxg')) + p(r('solta b Hxg')) + p(r(lines(3, 'tres')))])) + p(r('Fim Hxg'))) });
}
// 2) duas células: a 2ª fica com a órfã (nada na página 1) — a linha inteira desce
cases.push({ name: 'rw-2c-orph1', docx: D(filler(54) + tbl(tr([p(r('so uma Hxg')), p(r(lines(5, 'dir')))]), 2) + p(r('Fim Hxg'))) });
cases.push({ name: 'rw-2c-orph3', docx: D(filler(54) + tbl(tr([p(r('a1 Hxg')) + p(r('a2 Hxg')) + p(r('a3 Hxg')), p(r(lines(5, 'dir')))]), 2) + p(r('Fim Hxg'))) });
// 2b) a 2ª célula tem uma linha alta (fonte grande) que não cabe; a 1ª cabe
cases.push({ name: 'rw-2c-tall', docx: D(filler(53) + tbl(tr([p(r('a1 Hxg')) + p(r('a2 Hxg')) + p(r('a3 Hxg')), p(r('Alta Hxg', '<w:sz w:val="56"/>'))]), 2) + p(r('Fim Hxg'))) });
// 2c) as duas partem bem (3 + 2 linhas de cada lado)
cases.push({ name: 'rw-2c-both', docx: D(filler(52) + tbl(tr([p(r(lines(5, 'esq'))), p(r(lines(5, 'dir')))]), 2) + p(r('Fim Hxg'))) });
// 2d) a 1ª célula parte bem (3 | 2); na 2ª, dois parágrafos soltos cabem e o de 4 linhas desce inteiro
cases.push({ name: 'rw-2c-mixed', docx: D(filler(52) + tbl(tr([p(r(lines(5, 'esq'))), p(r('topo dir Hxg')) + p(r('meio dir Hxg')) + p(r(lines(4, 'dir')))]), 2) + p(r('Fim Hxg'))) });
// 3) todas as linhas cabem, só o espaço depois (ou a margem inferior da célula) não
for (const after of [120, 480]) {
  cases.push({ name: `rw-after${after}`, docx: D(filler(53) + tbl(tr([p(r(lines(2, 'cel')), `<w:spacing w:after="${after}"/>`)])) + p(r('Fim Hxg'))) });
}
cases.push({ name: 'rw-marb', docx: D(filler(53) + tbl(tr([p(r(lines(2, 'cel')))])).replace('</w:tblPr>', '<w:tblCellMar><w:bottom w:w="200" w:type="dxa"/></w:tblCellMar></w:tblPr>') + p(r('Fim Hxg'))) });
// 4) 1ª linha da tabela sozinha no pé (a 2ª não põe nem uma linha): fica
cases.push({ name: 'rw-first-alone', docx: D(filler(54) + tbl(tr([p(r('linha zero Hxg'))]) + tr([p(r(lines(5, 'seg')), WC.off)])) + p(r('Fim Hxg'))) });
cases.push({ name: 'rw-mid-alone', docx: D(filler(52) + tbl(tr([p(r('r0 Hxg'))]) + tr([p(r('r1 Hxg'))]) + tr([p(r('r2 Hxg'))]) + tr([p(r(lines(5, 'seg')), WC.off)])) + p(r('Fim Hxg'))) });
// 5) modos antigos: sem viúvas/órfãs na célula (no corpo, sim)
for (const compat of [11, 14]) {
  const C = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  for (const [wc, ppr] of [['def', WC.def], ['on', WC.on]]) {
    cases.push({ name: `rw-c${compat}-k1-${wc}`, docx: C(filler(54) + tbl(tr([p(r(lines(5, 'cel')), ppr)])) + p(r('Fim Hxg'))) });
    cases.push({ name: `rw-c${compat}-k4-${wc}`, docx: C(filler(51) + tbl(tr([p(r(lines(5, 'cel')), ppr)])) + p(r('Fim Hxg'))) });
    cases.push({ name: `bw-c${compat}-k4-${wc}`, docx: C(filler(51) + p(r(lines(5, 'corpo')), ppr) + p(r('Fim Hxg'))) });
  }
  cases.push({ name: `rw-c${compat}-after120`, docx: C(filler(53) + tbl(tr([p(r(lines(2, 'cel')), '<w:spacing w:after="120"/>')])) + p(r('Fim Hxg'))) });
  cases.push({ name: `rw-c${compat}-orph3`, docx: C(filler(54) + tbl(tr([p(r('a1 Hxg')) + p(r('a2 Hxg')) + p(r('a3 Hxg')), p(r(lines(5, 'dir')), WC.on)]), 2) + p(r('Fim Hxg'))) });
}
// 6) o espaço depois do parágrafo tem de caber junto com a última linha dele (o do
//    último da célula e o de um do meio); linha alta nos modos antigos
for (const compat of [11, 14, 15]) {
  const C = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  cases.push({ name: `rw-c${compat}-after5`, docx: C(filler(50) + tbl(tr([p(r(lines(5, 'cel')), '<w:spacing w:after="120"/>')])) + p(r('Fim Hxg'))) });
  cases.push({ name: `rw-c${compat}-midafter`, docx: C(filler(53) + tbl(tr([p(r(lines(2, 'pa')), `<w:spacing w:after="240"/>${WC.off}`) + p(r(lines(3, 'pb')), WC.off)])) + p(r('Fim Hxg'))) });
  if (compat !== 15) cases.push({ name: `rw-c${compat}-tall`, docx: C(filler(53) + tbl(tr([p(r('a1 Hxg')) + p(r('a2 Hxg')) + p(r('a3 Hxg')), p(r('Alta Hxg', '<w:sz w:val="56"/>'))]), 2) + p(r('Fim Hxg'))) });
}
// 7) espaço entre parágrafos no corte: o "depois" do de cima fica na página 1; a
//    continuação começa só com o resto do espaço até o seguinte
for (const compat of [14, 15]) {
  const C = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const sp = '<w:spacing w:before="240" w:after="120"/>';
  const cell = Array.from({ length: 8 }, (_, k) => p(r(`par ${k + 1} Hxg`), sp)).join('');
  cases.push({ name: `rw-c${compat}-gapcut`, docx: C(filler(48) + tbl(tr([cell])) + p(r('Fim Hxg'))) });
  cases.push({ name: `rw-c${compat}-gapwidow`, docx: C(filler(50) + tbl(tr([p(r('solta Hxg')) + p(r(lines(3, 'tres')), sp)])) + p(r('Fim Hxg'))) });
}
