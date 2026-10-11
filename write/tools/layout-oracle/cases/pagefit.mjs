// Quantas linhas cabem no pé da página: a entrelinha extra (auto > 1), o
// espaço depois e a regra exata/mínima contam para "caber"? Margem inferior
// escolhida para a última linha ficar no limite.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const lines = (n, pre) => Array.from({ length: n }, (_, k) => `${pre} ${k + 1} Hxg`);
export const cases = [];
// varre a margem inferior em passos pequenos: o ponto em que a última linha
// passa para a página seguinte revela o critério
for (const [name, spacing, size] of [
  ['auto259', '<w:spacing w:after="0" w:line="259" w:lineRule="auto"/>', 12],
  ['auto360', '<w:spacing w:after="0" w:line="360" w:lineRule="auto"/>', 12],
  ['exact', '<w:spacing w:after="0" w:line="300" w:lineRule="exact"/>', 12],
  ['atleast', '<w:spacing w:after="0" w:line="340" w:lineRule="atLeast"/>', 12],
  ['after', '<w:spacing w:after="200" w:line="240" w:lineRule="auto"/>', 12],
]) {
  for (const bottom of [1380, 1400, 1417, 1440, 1460]) {
    const body = lines(60, name).map((t) => p(r(t), spacing)).join('');
    cases.push({ name: `fit-${name}-b${bottom}`, docx: buildDocx({ body, sect: sectPr({ bottom }), defaults: docDefaults({ font: 'Arial', size }) }) });
  }
}
