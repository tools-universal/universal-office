// "Manter com o próximo" (keepNext) num parágrafo de VÁRIAS linhas sem keepLines:
// ele pode ser partido entre páginas? Só a última linha precisa ficar com o início
// do seguinte? E quando ele termina no pé e o seguinte não cabe?
// Arial 11 sem espaçamento: 12,65 pt por linha, 55 linhas na página A4.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const KN = '<w:keepNext/>';
const KL = '<w:keepLines/>';
const OFF = '<w:widowControl w:val="0"/>';

export const cases = [];
for (const compat of [14, 15]) {
  const D = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const s = compat === 15 ? '' : `-c${compat}`;
  // parágrafo keepNext de 10 linhas; cabem k linhas dele na página 1
  for (const k of [3, 7, 9, 10]) {
    cases.push({ name: `ks-k${k}${s}`, docx: D(filler(55 - k) + p(r(lines(10, 'longo')), KN) + p(r(lines(3, 'depois'))) + filler(2)) });
  }
  // o mesmo sem viúvas/órfãs
  for (const k of [9, 10]) {
    cases.push({ name: `ks-k${k}-off${s}`, docx: D(filler(55 - k) + p(r(lines(10, 'longo')), KN + OFF) + p(r(lines(3, 'depois')), OFF) + filler(2)) });
  }
  // keepNext + keepLines: desce inteiro
  cases.push({ name: `ks-kl-k7${s}`, docx: D(filler(48) + p(r(lines(10, 'longo')), KN + KL) + p(r(lines(3, 'depois'))) + filler(2)) });
  // cadeia: título keepNext+keepLines, vazio, parágrafo longo keepNext, vazio keepNext, texto
  cases.push({ name: `ks-chain${s}`, docx: D(filler(44) + p(r('Titulo Hxg'), KN + KL) + p('') + p(r(lines(10, 'longo')), KN) + p('', KN) + p(r(lines(4, 'depois'))) + filler(2)) });
}
