// Cabeçalho com imagem INLINE (logo) seguida de espaços: a altura do cabeçalho
// (que empurra o corpo quando passa da margem superior) inclui a descendente do
// texto abaixo da imagem? E com a fonte da marca ausente (substituída)?
// (imagem inline no cabeçalho, margem superior pequena)
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [40, 120, 40]) };
const body = Array.from({ length: 6 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
const vb = '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:b/><w:sz w:val="20"/>';
export const cases = [];
for (const [name, hdr, font] of [
  // só a imagem
  ['hi-img', p(inlineImage(1, 96, 30)), 'Arial'],
  // imagem + espaços em Verdana negrito 10
  ['hi-img-spaces', p(inlineImage(1, 96, 30) + r('                  ', vb)), 'Arial'],
  // idem, com a fonte do Normal ausente (substituída pelo Word)
  ['hi-img-spaces-missing', p(inlineImage(1, 96, 30) + r('                  ', vb)), 'FonteAusenteTeste'],
  // imagem + texto visível
  ['hi-img-text', p(inlineImage(1, 96, 30) + r('Texto Hxg', vb)), 'Arial'],
]) {
  cases.push({ name, docx: buildDocx({
    body, headers: { default: hdr },
    sect: sectPr({ top: 500, header: 708, bottom: 1417, footer: 708 }),
    defaults: docDefaults({ font, size: 12 }), media,
  }) });
}
