// Métricas verticais de fontes do Leste Asiático e de símbolos (mesmo desenho do
// grupo vmetrics: 1º baseline − margem = ascendente; pitch de 40 linhas).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const FONTS = ['MS Gothic', 'MS PGothic', 'MS Mincho', 'MS UI Gothic', 'SimSun', 'Yu Gothic', 'Malgun Gothic', 'Microsoft YaHei', 'Segoe UI Symbol'];
const SIZES = [8, 10, 11, 12, 14, 24];
const slug = (f) => f.toLowerCase().replace(/\s+/g, '-');
const fnt = (f) => `<w:rFonts w:ascii="${f}" w:eastAsia="${f}" w:hAnsi="${f}"/>`;
export const cases = [];
for (const f of FONTS) {
  let body = '';
  SIZES.forEach((s, i) => {
    const n = s >= 24 ? 10 : 30;
    const lines = Array.from({ length: n + 1 }, (_, k) => `Hxg ${s} ${k}`).join('\n');
    body += p(r(lines, fnt(f) + sz(s)), i > 0 ? '<w:pageBreakBefore/>' : '');
  });
  cases.push({ name: `vmea-${slug(f)}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
