// Sobrescrito/subscrito: tamanho e deslocamento vertical por fonte e corpo.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

export const cases = [];
for (const font of ['Arial', 'Calibri', 'Times New Roman']) {
  let body = '';
  for (const s of [8, 9, 10, 11, 12, 14, 18, 24, 36]) {
    body += p(r('Base', sz(s)) + r('SUP', sz(s) + '<w:vertAlign w:val="superscript"/>') + r(' meio ', sz(s)) + r('SUB', sz(s) + '<w:vertAlign w:val="subscript"/>') + r(' fim', sz(s)));
  }
  // w:position (half-points)
  body += p(r('pos ') + r('MAIS6', '<w:position w:val="6"/>') + r(' e ') + r('MENOS6', '<w:position w:val="-6"/>') + r(' fim'));
  cases.push({ name: `va-${font.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font, size: 11 }) }) });
}
