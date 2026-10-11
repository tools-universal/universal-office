// Versalete (w:smallCaps) com kerning (w:kern): o par de kerning é o dos glifos DESENHADOS —
// a minúscula seguinte também conta como a maiúscula reduzida (não o caractere original).
// Parágrafos justificados longos (com e sem w:spacing): a largura decide as quebras.
// Calibri Light 10 pt (fonte instalada; nunca versionada).
import { buildDocx, docDefaults, p, r, font, lorem } from '../docx-builder.mjs';

const doc = (rp) => {
  let body = '';
  for (let i = 0; i < 12; i++) body += p(r(lorem(70, i + 3), font('Calibri Light') + '<w:sz w:val="20"/>' + rp), '<w:jc w:val="both"/><w:spacing w:after="120"/>');
  return buildDocx({ body, defaults: docDefaults({ font: 'Calibri Light', size: 10 }) });
};
export const cases = [
  { name: 'sk2-kern', docx: doc('<w:smallCaps/><w:kern w:val="2"/>') },
  { name: 'sk2-kern-sp12', docx: doc('<w:smallCaps/><w:spacing w:val="12"/><w:kern w:val="2"/>') },
];
