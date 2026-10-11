// Kerning (w:kern) por modo de compatibilidade: o Word 2013+ (15) usa os
// pares do GPOS; os modos antigos (GDI) usam a tabela kern legada, só pares
// ANSI (useAnsiKerningPairs) — ou não kerneiam? A largura de cada linha (x1)
// alinhada à esquerda revela a soma dos ajustes.
import { buildDocx, docDefaults, p, r, sz, font } from '../docx-builder.mjs';

const LINES = [
  'AVAVAVAVAVAVAVAV WAWAWAWAWA',
  'To To To Ta Ta Ta Yo Yo Yo',
  'LT LT LT PA PA PA FA FA FA',
  'Vo Vo We We Wa Wa Ty Ty Ty',
  'av av aw aw ay ay ov ov ow',
  'r, r. y, y. f, f. "A" “A”',
];
const kernRun = (t, f, s) => r(t, `${font(f)}<w:kern w:val="2"/>${sz(s)}`);
const plainRun = (t, f, s) => r(t, `${font(f)}${sz(s)}`);

export const cases = [];
for (const compat of [15, 14, 12, 11]) {
  let body = '';
  for (const [f, s] of [['Arial', 11], ['Arial', 24], ['Times New Roman', 14], ['Calibri', 14]]) {
    for (const t of LINES) body += p(kernRun(t, f, s)) + p(plainRun(t, f, s));
  }
  cases.push({ name: `kern-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
// modo 11 com useFELayout + useAnsiKerningPairs
{
  let body = '';
  for (const [f, s] of [['Arial', 11], ['Arial', 24]]) for (const t of LINES) body += p(kernRun(t, f, s)) + p(plainRun(t, f, s));
  cases.push({ name: 'kern-c11-ansi', docx: buildDocx({ body, compat: 11, defaults: docDefaults({ font: 'Arial', size: 11 }), extraCompat: '<w:useFELayout/><w:useAnsiKerningPairs/>' }) });
}
