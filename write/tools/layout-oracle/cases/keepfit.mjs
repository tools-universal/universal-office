// "Manter com o próximo"/"manter linhas juntas": para saber se a linha que fecha o
// bloco cabe, conta a entrelinha extra (múltipla > 1, posta ABAIXO do texto) ou só
// o texto, como na colocação normal da linha (oráculo pagefit)?
// Arial 11: 12,65 pt por linha, 55 linhas na página A4 (sobram 0,45 pt).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const KN = '<w:keepNext/>';
const OFF = '<w:widowControl w:val="0"/>';
const ln = (v, rule = 'auto') => `<w:spacing w:line="${v}" w:lineRule="${rule}"/>`;

export const cases = [];
for (const compat of [14, 15]) {
  const D = (body) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const s = compat === 15 ? '' : `-c${compat}`;
  // título keepNext + 1 linha com entrelinha dupla / 1,5 / exata (sobram 29,75 pt)
  cases.push({ name: `kf-double${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN) + p(r('dupla Hxg'), ln(480)) + filler(2)) });
  cases.push({ name: `kf-onehalf${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN) + p(r('um e meio Hxg'), ln(360)) + filler(2)) });
  cases.push({ name: `kf-exact${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN) + p(r('exata Hxg'), ln(500, 'exact')) + filler(2)) });
  // controle: sobram 17,1 pt (nem o texto cabe)
  cases.push({ name: `kf-double-tight${s}`, docx: D(filler(54) + p(r('Titulo Hxg'), KN) + p(r('dupla Hxg'), ln(480)) + filler(2)) });
  // keepLines (sem keepNext): 2 linhas de entrelinha dupla com 38,4 pt livres
  cases.push({ name: `kf-keeplines${s}`, docx: D(filler(52) + p(r(lines(2, 'juntas')), `<w:keepLines/>${OFF}${ln(480)}`) + filler(2)) });
}
