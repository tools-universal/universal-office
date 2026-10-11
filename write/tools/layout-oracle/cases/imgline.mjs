// Linha só com uma imagem em linha: a descendente da fonte (do run da imagem e da
// marca de parágrafo) entra na altura? Corpo 11/22/36 no run, na marca ou nos dois,
// entrelinha simples e 1,08 (padrão do Word 2013+).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (rpr) => inlineImage(1, 200, 120).replace('<w:r><w:drawing>', `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:drawing>`);
const sz = (hp) => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
export const cases = [];
for (const [line, after] of [[240, 0], [259, 160]]) {
  const defaults = docDefaults({ font: 'Arial', size: 11, line, after });
  for (const hp of [22, 44, 72]) {
    for (const where of ['both', 'run', 'mark']) {
      const runR = where !== 'mark' ? sz(hp) : '';
      const markR = where !== 'run' ? `<w:rPr>${sz(hp)}</w:rPr>` : '';
      const body = p(r('Antes Hxg')) + p(img(runR), markR) + p(r('Depois Hxg')) + p(img(runR), markR) + p(r('Fim Hxg'));
      cases.push({ name: `il-l${line}-${hp}-${where}`, docx: buildDocx({ body, defaults, media }) });
    }
  }
}
