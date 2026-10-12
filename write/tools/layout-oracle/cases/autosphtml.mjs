// Espaçamento automático (beforeAutospacing/afterAutospacing) com
// w:doNotUseHTMLParagraphAutoSpacing: valem os 14 pt "HTML" ou os valores explícitos
// (w:before/w:after) do próprio parágrafo? Parágrafos seguidos com e sem o automático,
// valores explícitos diferentes de 14 pt; modos 15 e 11. Calibri 11; textos inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const sp = (b, a, auto) => `<w:spacing w:before="${b}"${auto ? ' w:beforeAutospacing="1"' : ''} w:after="${a}"${auto ? ' w:afterAutospacing="1"' : ''}/>`;
let body = p(r('Inicio do teste'), sp(0, 0, false));
for (const [b, a] of [[100, 100], [60, 200], [0, 0], [300, 40]]) {
  body += p(r(`Automatico antes ${b} depois ${a}`), sp(b, a, true));
  body += p(r(`Outro automatico ${b} ${a}`), sp(b, a, true));
  body += p(r('Paragrafo comum sem espaco'), sp(0, 0, false));
}
body += p(r('Fim do teste'));
export const cases = [];
for (const compat of [15, 11]) for (const html of [false, true]) {
  cases.push({ name: `ash-c${compat}${html ? '-html' : ''}`, docx: buildDocx({ body, compat, extraCompat: html ? '<w:doNotUseHTMLParagraphAutoSpacing/>' : '', defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
}
