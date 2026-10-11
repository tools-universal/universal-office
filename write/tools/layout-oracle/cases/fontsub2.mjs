// Substituição de fontes ausentes conhecidas (Arial Unicode MS etc.): qual o Word usa?
import { buildDocx, docDefaults, font, p, r } from '../docx-builder.mjs';

export const cases = [];
for (const f of ['Arial Unicode MS', 'MS Mincho', 'Lucida Sans Unicode', 'Century Schoolbook', 'Algerian']) {
  const body = p(r('Antes Hxg')) + p(r('Presentes: <cargo2, nome 1>; Hxg', font(f) + '<w:sz w:val="24"/>')) + p(r('Depois Hxg'));
  cases.push({ name: `fs2-${f.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
