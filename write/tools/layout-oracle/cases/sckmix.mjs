// Versalete (w:smallCaps) com kerning (w:kern): o par entre uma MAIÚSCULA (corpo cheio) e uma
// minúscula (maiúscula reduzida) kerneia? E com que corpo? Linhas curtas alinhadas à
// direita com o par repetido (o x da 1ª letra acumula o kerning); referências com os dois
// glifos do mesmo tamanho. Calibri Light 11 (fonte instalada; nunca versionada).
import { buildDocx, docDefaults, p, r, font } from '../docx-builder.mjs';

const pairs = ['Pa', 'Ta', 'Va', 'Ya', 'Wa', 'To', 'Av', 'PA', 'TA', 'pa', 'ta', 'aT', 'aV'];
const rp = font('Calibri Light') + '<w:smallCaps/><w:kern w:val="2"/>';
let body = '';
const R = '<w:jc w:val="right"/>';
for (const pr of pairs) body += p(r(pr.repeat(12) + 'x', rp), R);
for (const pr of pairs) body += p(r(pr.repeat(12) + 'x', font('Calibri Light') + '<w:smallCaps/>'), R);
export const cases = [{ name: 'skm-calibril', docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri Light', size: 11 }) }) }];
