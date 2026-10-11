// Linha de tabela com altura mínima (trHeight atLeast) que não cabe no pé da
// página: ela parte (como sem altura mínima) ou desce inteira? Conteúdo de 2
// linhas sem viúvas/órfãs; o espaço livre fica um pouco abaixo de 2 linhas.
// Arial 11: 12,65 pt por linha, 55 linhas na página A4 (sobram 0,45 pt).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const OFF = '<w:widowControl w:val="0"/>';
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (trPr, tcPr, cell, borders = true) => `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/>${borders ? bd : ''}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>`
  + `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/>${tcPr}</w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
const two = p(r('linha um Hxg\nlinha dois Hxg'), OFF);
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
// 53 linhas de enchimento: sobram 25,75 pt (2 linhas = 25,3 + bordas 1,0 = 26,3 não cabe)
const H = (tw) => `<w:trHeight w:val="${tw}"/>`;

export const cases = [];
cases.push({ name: 'rm-none', docx: D(filler(53) + tbl('', '', two) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-none-nobd', docx: D(filler(53) + p(r('meia'), '<w:spacing w:line="120" w:lineRule="exact"/>') + tbl('', '', two, false) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-min-just', docx: D(filler(53) + tbl(H(540), '', two) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-min-center', docx: D(filler(53) + tbl(H(540), '<w:vAlign w:val="center"/>', two) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-min-small', docx: D(filler(53) + tbl(H(300), '', two) + p(r('Fim Hxg'))) });
// três linhas de conteúdo, altura mínima de 3 linhas e meia, cabem 2 linhas e pouco
cases.push({ name: 'rm-min-3', docx: D(filler(52) + tbl(H(880), '', p(r('linha um Hxg\nlinha dois Hxg\nlinha tres Hxg'), OFF)) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-none-3', docx: D(filler(52) + tbl('', '', p(r('linha um Hxg\nlinha dois Hxg\nlinha tres Hxg'), OFF)) + p(r('Fim Hxg'))) });
// altura mínima MAIOR que o espaço livre: com conteúdo menor que a mínima
// (que também não cabe), maior que ela, e mínima menor que o espaço livre
{
  const L = (n) => p(r(Array.from({ length: n }, (_, k) => `linha ${k + 1} Hxg`).join('\n')), OFF);
  // 53 linhas de enchimento: sobram 25,75 pt (≈ 2 linhas)
  cases.push({ name: 'rm2-min4-c3', docx: D(filler(53) + tbl(H(1012), '', L(3)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm2-min4-c6', docx: D(filler(53) + tbl(H(1012), '', L(6)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm2-min1-c4', docx: D(filler(53) + tbl(H(253), '', L(4)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm2-none-c4', docx: D(filler(53) + tbl('', '', L(4)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm2-min4-c3-nobd', docx: D(filler(53) + tbl(H(1012), '', L(3), false) + p(r('Fim Hxg'))) });
  const C14 = (body) => buildDocx({ body, compat: 14, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  cases.push({ name: 'rm2-min4-c6-c14', docx: C14(filler(53) + tbl(H(1012), '', L(6)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm2-min1-c4-c14', docx: C14(filler(53) + tbl(H(253), '', L(4)) + p(r('Fim Hxg'))) });
  // a altura mínima cabe por pouco (2 linhas de espaço, mínima de 1,9 linha) e o conteúdo não
  cases.push({ name: 'rm2-minfits-c4', docx: D(filler(53) + tbl(H(460), '', L(4)) + p(r('Fim Hxg'))) });
}
// a continuação (resto da linha partida na página seguinte) também tem a altura mínima?
{
  const L = (n) => p(r(Array.from({ length: n }, (_, k) => `linha ${k + 1} Hxg`).join('\n')), OFF);
  cases.push({ name: 'rm3-cont-min', docx: D(filler(51) + tbl(H(760), '', L(6)) + p(r('Fim Hxg'))) });
  cases.push({ name: 'rm3-cont-none', docx: D(filler(51) + tbl('', '', L(6)) + p(r('Fim Hxg'))) });
}
