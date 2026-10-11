// Espaços no FIM da linha em fonte maior: entram na altura da linha?
// (oráculo hfimg: logo + espaços Verdana não somam a descendente; com texto, somam)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [40, 120, 40]) };
const big = '<w:sz w:val="48"/>';
const mark = (k) => p(r(`Marca ${k} Hxg`));
export const cases = [];
for (const [name, para] of [
  // texto 11pt + espaços 24pt no fim
  ['ts-text-bigsp', p(r('Texto Hxg') + r('      ', big))],
  // espaços 24pt no MEIO (entre palavras 11pt)
  ['ts-mid-bigsp', p(r('Texto') + r('      ', big) + r('Hxg'))],
  // parágrafo só com espaços 24pt
  ['ts-only-bigsp', p(r('      ', big))],
  // imagem + espaços 24pt
  ['ts-img-bigsp', p(inlineImage(1, 60, 20) + r('      ', big))],
  // espaços 24pt no fim de uma linha quebrada (1ª linha de parágrafo longo)
  ['ts-wrap-bigsp', p(r('palavra '.repeat(11) + 'fim') + r('            ', big) + r('segunda linha Hxg'))],
  // tabulação no fim em fonte grande
  ['ts-text-bigtab', p(r('Texto Hxg') + `<w:r><w:rPr>${big}</w:rPr><w:tab/></w:r>`)],
]) {
  cases.push({ name, docx: buildDocx({ body: mark(1) + para + mark(2) + mark(3), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// modo 14 e espaço inseparável (U+00A0)
for (const [name, para, compat] of [
  ['ts-text-bigsp-c14', p(r('Texto Hxg') + r('      ', big)), 14],
  ['ts-text-bignbsp', p(r('Texto Hxg') + r('\u00a0\u00a0\u00a0', big)), 15],
  ['ts-only-bignbsp', p(r('\u00a0\u00a0\u00a0', big)), 15],
]) {
  cases.push({ name, docx: buildDocx({ body: mark(1) + para + mark(2) + mark(3), compat, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
