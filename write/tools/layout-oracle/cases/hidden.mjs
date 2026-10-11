// Texto oculto (w:vanish) no PDF do Word: parágrafo com marca oculta, linhas
// de tabela ocultas (trPr/w:hidden) e hideMark (marca de célula ignorada na
// altura). (seções inteiras ocultas)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const V = '<w:vanish/>';
const hp = (runs) => p(runs, `<w:rPr>${V}</w:rPr>`); // marca de parágrafo oculta
const hr = (t) => r(t, V); // run oculto
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const row = (cell, trPr = '', tcPr = '') => `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}<w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/>${tcPr}</w:tcPr>${cell}</w:tc></w:tr>`;
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>${rows.join('')}</w:tbl>`;
const A = p(r('Antes Hxg')), D = p(r('Depois Hxg'));
export const cases = [];
for (const [name, mid] of [
  // marca oculta, sem conteúdo
  ['hid-mark-empty', hp('') + hp('') + hp('')],
  // marca oculta + conteúdo oculto
  ['hid-mark-content', hp(hr('Oculto Hxg')) + hp(hr('Oculto 2'))],
  // só o conteúdo oculto (marca visível): linha vazia continua?
  ['hid-content-only', p(hr('Oculto Hxg'))],
  // marca oculta com conteúdo VISÍVEL: junta com o parágrafo seguinte?
  ['hid-mark-visible-text', hp(r('Junta ')) + p(r('Seguinte Hxg'))],
  // linha de tabela oculta no meio
  ['hid-row-mid', tbl([row(p(r('L1 Hxg'))), row(hp(hr('L2 oculta')), '<w:hidden/>'), row(p(r('L3 Hxg')))])],
  // todas as linhas ocultas (tabela inteira some?)
  ['hid-row-all', tbl([row(hp(hr('L1')), '<w:hidden/>'), row(hp(hr('L2')), '<w:hidden/>')])],
  // linha oculta com conteúdo visível (o Word esconde mesmo assim?)
  ['hid-row-visible', tbl([row(p(r('L1 Hxg'))), row(p(r('L2 visivel')), '<w:hidden/>'), row(p(r('L3 Hxg')))])],
  // hideMark: célula só com marca vazia + altura mínima pequena
  ['hid-hidemark', tbl([row(p(r('L1 Hxg'))), row(p(''), '<w:trHeight w:val="100"/>', '<w:hideMark/>'), row(p(r('L3 Hxg')))])],
  ['hid-hidemark-ctl', tbl([row(p(r('L1 Hxg'))), row(p(''), '<w:trHeight w:val="100"/>'), row(p(r('L3 Hxg')))])],
]) {
  cases.push({ name, docx: buildDocx({ body: A + mid + D, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
// linha SEM trPr/hidden, mas com todo o conteúdo (e marcas) oculto: some?
cases.push({ name: 'hid-row-content-nohidden', docx: buildDocx({ body: A + tbl([row(p(r('L1 Hxg'))), row(hp(hr('L2 oculta'))), row(p(r('L3 Hxg')))]) + D, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
