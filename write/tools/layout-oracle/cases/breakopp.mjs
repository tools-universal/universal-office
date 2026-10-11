// Oportunidades de quebra em hífens e travessões: o caractere seguinte pode estar
// em OUTRO run (w:r) — o Word decide pelo texto do parágrafo, não pelo run.
// Cada parágrafo repete um padrão "palavra<sep>palavra" com larguras variadas,
// para as quebras caírem em muitos pontos diferentes.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const J = '<w:jc w:val="both"/>';
const words = lorem(80, 7).split(/\s+/);
// [nome, separador, como dividir os runs]
const PATTERNS = [
  ['hif-run-proprio', '-', 'own'], // "abc" | "-" | "def "
  ['hif-fim-run', '-', 'end'], // "abc-" | "def "
  ['hif-inicio-run', '-', 'start'], // "abc" | "-def "
  ['hif-mesmo-run', '-', 'same'], // "abc-def "
  ['hif-digito', '-', 'digit'], // "abc-" | "123 "
  ['endash-run', '–', 'end'],
  ['emdash-run', '—', 'end'],
  ['barra-run', '/', 'end'],
  ['hif-maiusc', '-', 'upper'], // "E-" | "MAIL "
];
function para(sep, mode, k0, jc) {
  let runs = '';
  for (let k = 0; k < 36; k++) {
    const a = words[(k0 + 2 * k) % words.length], b = words[(k0 + 2 * k + 1) % words.length];
    if (mode === 'own') runs += r(a) + r(sep) + r(b + ' ');
    else if (mode === 'end') runs += r(a + sep) + r(b + ' ');
    else if (mode === 'start') runs += r(a) + r(sep + b + ' ');
    else if (mode === 'same') runs += r(a + sep + b + ' ');
    else if (mode === 'digit') runs += r(a + sep) + r(String(100 + 37 * k) + ' ');
    else if (mode === 'upper') runs += r(a.slice(0, 1).toUpperCase() + sep) + r(b.toUpperCase() + ' ');
  }
  return p(runs, jc);
}
export const cases = [];
for (const [name, sep, mode] of PATTERNS) {
  const body = para(sep, mode, 0, '') + para(sep, mode, 5, J) + para(sep, mode, 11, '');
  cases.push({ name, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after: 160 }) }) });
}
