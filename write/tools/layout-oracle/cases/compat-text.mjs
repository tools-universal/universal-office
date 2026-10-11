// Texto corrido justificado e à esquerda nos modos 11/14/15: as quebras de
// linha revelam como o Word mede as larguras em cada modo (o 15 usa larguras
// ideais; os antigos, larguras GDI arredondadas?).
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

export const cases = [];
for (const compat of [15, 14, 11]) {
  for (const [f, s] of [['Arial', 11], ['Times New Roman', 12], ['Calibri', 11], ['Verdana', 10]]) {
    let body = '';
    for (let k = 0; k < 8; k++) body += p(r(lorem(70, 10 + k)), '<w:jc w:val="both"/>');
    for (let k = 0; k < 4; k++) body += p(r(lorem(70, 30 + k)));
    cases.push({ name: `txt-${f.toLowerCase().replace(/\s+/g, '-')}-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: f, size: s, after: 120 }) }) });
  }
}
