// Justificação: quanto o Word comprime os espaços para caber a próxima palavra.
import { buildDocx, docDefaults, p, r, sz, lorem } from '../docx-builder.mjs';

const slug = (f) => f.toLowerCase().replace(/\s+/g, '-');
export const cases = [];
for (const f of ['Arial', 'Calibri', 'Times New Roman', 'Aptos', 'Verdana']) {
  let body = '';
  for (const s of [10, 11, 12]) {
    for (let k = 0; k < 4; k++) body += p(r(lorem(90, k * 7 + s), sz(s)), '<w:jc w:val="both"/><w:spacing w:after="120"/>');
  }
  cases.push({ name: `just-${slug(f)}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: 11 }) }) });
  // mesmo texto alinhado à esquerda (controle)
  let lb = '';
  for (const s of [10, 11, 12]) {
    for (let k = 0; k < 4; k++) lb += p(r(lorem(90, k * 7 + s), sz(s)), '<w:spacing w:after="120"/>');
  }
  cases.push({ name: `left-${slug(f)}`, docx: buildDocx({ body: lb, defaults: docDefaults({ font: f, size: 11 }) }) });
}
