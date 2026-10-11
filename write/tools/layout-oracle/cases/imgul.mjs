// Imagem em linha num run SUBLINHADO: o Word desenha o sublinhado sob a imagem —
// a descendente da fonte do run passa a contar na altura da linha? Corpo 11/22,
// sublinhado simples/duplo/nenhum, entrelinha simples e 1,08 + 8 pt depois.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (rpr) => inlineImage(1, 200, 120).replace('<w:r><w:drawing>', `<w:r><w:rPr>${rpr}</w:rPr><w:drawing>`);
const sz = (hp) => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
export const cases = [];
for (const font of ['Arial', 'Calibri']) {
  const f = font === 'Arial' ? 'ar' : 'ca';
  for (const [line, after] of [[240, 0], [259, 160]]) {
    const defaults = docDefaults({ font, size: 11, line, after });
    for (const hp of [22, 44]) {
      for (const u of ['none', 'single', 'double', 'thick']) {
        const rpr = sz(hp) + (u !== 'none' ? `<w:u w:val="${u}"/>` : '');
        const body = p(r('Antes Hxg')) + p(img(rpr), `<w:rPr>${rpr}</w:rPr>`) + p(r('Depois Hxg')) + p(img(rpr + '<w:b/>'), `<w:rPr>${rpr}</w:rPr>`) + p(r('Fim Hxg'));
        cases.push({ name: `iu-${f}-l${line}-${hp}-${u}`, docx: buildDocx({ body, defaults, media }) });
      }
    }
  }
}
