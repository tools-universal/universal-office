// Métricas verticais PRECISAS por fonte:
//  vm-<fonte>: uma página por tamanho; cada página começa com 1 parágrafo do
//  tamanho S (1º baseline − margem = ascent) seguido de 40 linhas (quebras
//  manuais) do mesmo tamanho (pitch = (último − primeiro)/40).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Segoe UI', 'Aptos', 'Century Gothic', 'Tahoma',
  'Georgia', 'Courier New', 'Calibri Light', 'Cambria', 'Trebuchet MS', 'Open Sans', 'Arial Nova Light', 'Arial Narrow', 'Garamond', 'Lato'];
const SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 36, 72];
const slug = (f) => f.toLowerCase().replace(/\s+/g, '-');

export const cases = [];
for (const f of FONTS) {
  let body = '';
  SIZES.forEach((s, i) => {
    const n = s >= 36 ? 8 : 40;
    const lines = Array.from({ length: n + 1 }, (_, k) => `Hxg ${s} ${k}`).join('\n');
    body += p(r(lines, sz(s)), i > 0 ? '<w:pageBreakBefore/>' : '');
  });
  cases.push({ name: `vm-${slug(f)}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: 11 }) }) });
}
