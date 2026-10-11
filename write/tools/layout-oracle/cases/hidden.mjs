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
// fim do documento: tabela e depois DOIS parágrafos vazios de marca oculta (o
// último é a marca final do documento) — sobra página em branco?
{
  const t = tbl([row(p(r('L1 Hxg'))), row(p(r('L2 Hxg')))]);
  // a tabela termina a 0–3 linhas do fim da página
  for (const n of [49, 50, 51, 52]) {
    const fill = Array.from({ length: n }, (_, k) => p(r(`Linha ${k + 1} Hxg`))).join('');
    for (const [name, tail] of [['two', hp('') + hp('')], ['one', hp('')], ['bold', p('', `<w:rPr><w:b/>${V}<w:sz w:val="28"/></w:rPr>`) + hp('')]]) {
      cases.push({ name: `hid-end-${name}-${n}`, docx: buildDocx({ body: fill + t + tail, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
    }
  }
}
// fim do documento como num modelo de formulário: parágrafo vazio VISÍVEL com
// espaço depois, parágrafo de marca e texto ocultos, tabela de linhas ocultas e dois
// parágrafos de marca oculta (o último é o fim do documento) — 1 ou 2 páginas?
{
  const t = tbl([row(p(r('L1 Hxg'))), row(p(r('L2 Hxg')))]);
  const th = tbl([row(hp(hr('Oculta 1')), '<w:hidden/>'), row(hp(hr('Oculta 2')), '<w:hidden/>')]);
  for (const n of [51, 52, 53, 54]) {
    const fill = Array.from({ length: n }, (_, k) => p(r(`Linha ${k + 1} Hxg`))).join('');
    const tail = p('', '<w:spacing w:after="160"/>') + hp(hr('Titulo oculto')) + th + hp('') + hp('');
    cases.push({ name: `hid-form-end-${n}`, docx: buildDocx({ body: fill + t + tail, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
  }
}
