// Parágrafo VAZIO que carrega a quebra de seção (sectPr no pPr) e não cabe no
// fim da página: o Word o empurra para a página seguinte (criando uma página
// só com ele) ou o deixa pendurado abaixo da margem?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const filler = (k) => p(r(`Linha ${k} Hxg`));
const fill = (n) => Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
const sectPara = (text, rpr = '') => `<w:p><w:pPr>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}${sectPr({})}</w:pPr>${text ? r(text) : ''}</w:p>`;
const after = p(r('Seção 2 Hxg')) + p(r('Seção 2 linha 2'));
const nextType = (t) => sectPr({ extra: `<w:type w:val="${t}"/>` });
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const [name, body, sect] of [
  // 55 linhas enchem a página (a 56ª não cabe)
  ['sf-empty-next', fill(55) + sectPara('') + after, nextType('nextPage')],
  ['sf-empty-small', fill(55) + sectPara('', '<w:sz w:val="9"/>') + after, nextType('nextPage')],
  ['sf-text-next', fill(55) + sectPara('Fim Hxg') + after, nextType('nextPage')],
  ['sf-empty-cont', fill(55) + sectPara('') + after, nextType('continuous')],
  ['sf-empty-plain', fill(55) + p('') + after, nextType('nextPage')],
  // duas vazias: a 1ª (sem quebra) não cabe — vai; e a da quebra?
  ['sf-two-empty', fill(55) + p('') + sectPara('') + after, nextType('nextPage')],
]) {
  cases.push({ name, docx: buildDocx({ body, sect, defaults }) });
}
// o ÚLTIMO parágrafo do documento (vazio) que não cabe: página nova ou pendurado?
{
  const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
  const tbl = (n) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
    + Array.from({ length: n }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(`cel ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
  for (const [name, body] of [
    ['sf-last-empty', fill(55) + p('')],
    ['sf-last-text', fill(55) + p(r('Fim Hxg'))],
    ['sf-last-empty-tbl', fill(2) + tbl(52) + p('')],
    ['sf-last-two-empty', fill(55) + p('') + p('')],
  ]) cases.push({ name, docx: buildDocx({ body, sect: sectPr({}), defaults }) });
}
