// Título com keepNext antes de parágrafo que não pode ser partido: o seguinte só
// "começa" na página com as linhas que viúvas/órfãs exigem (2, ou todas até 3)
// ou inteiro com keepLines — senão o título desce junto.
// Arial 11 sem espaçamento: 12,65 pt por linha, 55 linhas na página A4.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const OFF = '<w:widowControl w:val="0"/>';
const KN = '<w:keepNext/>';

export const cases = [];
for (const compat of [11, 14, 15]) {
  const D = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const sfx = compat === 15 ? '' : `-c${compat}`;
  // cabem título + k linhas do seguinte de n linhas
  for (const [n, k] of [[2, 1], [3, 1], [3, 2], [4, 1], [4, 2]]) {
    cases.push({ name: `kw-n${n}-k${k}${sfx}`, docx: D(filler(54 - k) + p(r('Titulo Hxg'), KN) + p(r(lines(n, 'corpo'))) + filler(2)) });
  }
  cases.push({ name: `kw-off${sfx}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN) + p(r(lines(2, 'corpo')), OFF) + filler(2)) });
  cases.push({ name: `kw-keeplines${sfx}`, docx: D(filler(52) + p(r('Titulo Hxg'), KN) + p(r(lines(3, 'corpo')), `<w:keepLines/>${OFF}`) + filler(2)) });
}
