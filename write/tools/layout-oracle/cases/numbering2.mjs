// Contadores de lista do Word: nível pulado (o pai nunca usado vale o início
// e passa a contar), lvlOverride/startOverride (reinício só no 1º uso daquele
// w:num, contador COMPARTILHADO com os outros w:num do mesmo abstractNum) e o
// início do override como início do nível daquele w:num.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const FMT = ['decimal', 'decimal', 'decimal', 'decimal'];
/** abstractNum multinível "1.", "1.1.", "1.1.1."… (opções por nível) */
function abstractNum(id, { start = [], fmt = FMT, text } = {}) {
  let x = `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="multilevel"/>`;
  for (let i = 0; i < 9; i++) {
    const t = text?.[i] ?? Array.from({ length: i + 1 }, (_, k) => `%${k + 1}.`).join('');
    x += `<w:lvl w:ilvl="${i}"><w:start w:val="${start[i] ?? 1}"/><w:numFmt w:val="${fmt[i] ?? 'decimal'}"/>`
      + `<w:lvlText w:val="${t}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + 360 * i}" w:hanging="720"/></w:pPr></w:lvl>`;
  }
  return x + '</w:abstractNum>';
}
/** w:num com overrides { ilvl: startOverride } */
function num(numId, absId, ovr = {}) {
  const o = Object.entries(ovr).map(([l, s]) => `<w:lvlOverride w:ilvl="${l}"><w:startOverride w:val="${s}"/></w:lvlOverride>`).join('');
  return `<w:num w:numId="${numId}"><w:abstractNumId w:val="${absId}"/>${o}</w:num>`;
}
const ALL1 = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i, 1]));
const item = (k, numId, ilvl) => p(r(`Item ${k}`), `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
/** seq: [numId, ilvl][] */
const body = (seq) => p(r('Antes Hxg')) + seq.map(([n, l], k) => item(k + 1, n, l)).join('') + p(r('Depois Hxg'));

export const cases = [];
const add = (name, numbering, seq) => cases.push({ name, docx: buildDocx({ body: body(seq), numbering, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });

// nível pulado: o pai nunca usado mostra o início E passa a contar (o próximo
// parágrafo nesse nível vem com início + 1)
add('skip-parent', abstractNum(1) + num(1, 1), [[1, 1], [1, 1], [1, 0], [1, 2], [1, 1], [1, 0], [1, 3], [1, 2]]);
add('skip-start10', abstractNum(1, { start: [10] }) + num(1, 1), [[1, 1], [1, 1], [1, 0], [1, 1]]);
// o pai conta mesmo sem aparecer no lvlText do filho?
add('skip-noref', abstractNum(1, { fmt: ['decimal', 'lowerLetter'], text: ['%1.', '%2)'] }) + num(1, 1), [[1, 1], [1, 1], [1, 0], [1, 1]]);
// pai com formato "none" (lvlText vazio) e filho "%1%2." (cabeçalhos jurídicos)
add('skip-none', abstractNum(1, { fmt: ['none'], text: ['', '%1%2.', '%1%2.%3'] }) + num(1, 1) + num(2, 1, ALL1), [[1, 1], [2, 2], [1, 1], [2, 2]]);

// startOverride: reinicia no 1º uso do w:num; o contador é o do abstractNum
add('ovr-shared', abstractNum(1) + num(1, 1) + num(2, 1, ALL1), [[2, 0], [2, 0], [1, 0], [1, 0], [2, 0], [1, 0]]);
add('ovr-restart-mid', abstractNum(1) + num(1, 1) + num(2, 1, ALL1), [[1, 0], [1, 0], [1, 0], [2, 0], [2, 0], [1, 0], [1, 0]]);
add('ovr-two', abstractNum(1) + num(2, 1, ALL1) + num(3, 1, ALL1), [[2, 0], [2, 0], [3, 0], [3, 0], [2, 0], [3, 0]]);
// override só no nível 0, 1º uso num nível mais fundo
add('ovr-start5', abstractNum(1) + num(2, 1, { 0: 5 }), [[2, 1], [2, 0], [2, 1]]);
// override num nível só: os demais níveis seguem
add('ovr-level1', abstractNum(1) + num(1, 1) + num(2, 1, { 1: 3 }), [[1, 0], [1, 1], [2, 1], [2, 1], [1, 0], [1, 1]]);
// o início do override vale também nos reinícios seguintes daquele w:num
add('ovr-persist', abstractNum(1) + num(2, 1, { 1: 3 }), [[2, 0], [2, 1], [2, 1], [2, 0], [2, 1]]);
// override aplicado nível a nível (1º parágrafo daquele w:num NAQUELE nível),
// não em todos os níveis no 1º uso do w:num
add('ovr-first-deep', abstractNum(1) + num(1, 1) + num(2, 1, { 0: 5, 1: 3 }), [[1, 0], [1, 0], [1, 1], [2, 1], [2, 1], [2, 0], [2, 1]]);
// pai nunca usado: vale o início do abstractNum ou o do override?
add('ovr-parent-start', abstractNum(1, { start: [10] }) + num(2, 1, { 0: 5 }), [[2, 1], [2, 1], [2, 0], [2, 1]]);
// pai só "exibido" (nunca usado de fato) por outro w:num e depois o override
add('ovr-after-virtual', abstractNum(1) + num(1, 1) + num(2, 1, { 0: 5 }), [[1, 1], [1, 1], [2, 1], [2, 0], [2, 1]]);
// override pendente no pai e um w:num SEM override usando o nível
add('ovr-pending-other', abstractNum(1) + num(1, 1) + num(2, 1, { 0: 5 }), [[2, 1], [1, 0], [1, 1], [2, 0]]);
