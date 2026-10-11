// Sobrescrito/subscrito: deslocamento vertical por fonte e corpo, de meio em meio
// ponto (6–24pt) — dados para achar a regra (posições lidas do PDF, caractere a caractere).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

export const cases = [];
const fonts = ['Calibri', 'Calibri Light', 'Arial', 'Times New Roman', 'Cambria', 'Verdana', 'Segoe UI', 'Georgia', 'Tahoma', 'Century Gothic', 'Courier New'];
for (const font of fonts) {
  let body = '';
  for (let s = 6; s <= 24; s += 0.5) {
    body += p(r('Base', sz(s)) + r('SUP', sz(s) + '<w:vertAlign w:val="superscript"/>') + r(' meio ', sz(s)) + r('SUB', sz(s) + '<w:vertAlign w:val="subscript"/>') + r(' fim', sz(s)));
  }
  cases.push({ name: `sr-${font.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font, size: 11 }) }) });
}
