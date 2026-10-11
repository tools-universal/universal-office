// Imagem em linha perto do pé da página: com quanta folga ela ainda cabe?
// (corpo 22 no run e na marca, entrelinha 1,08 + 8pt depois — padrão do Word 2013+)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const sz = '<w:sz w:val="44"/><w:szCs w:val="44"/>';
const img = (h, eb = 0) => inlineImage(1, 400, h).replace('<w:r><w:drawing>', `<w:r><w:rPr>${sz}</w:rPr><w:drawing>`).replace('</wp:extent>', '').replace(/(<wp:extent [^>]*\/>)/, `$1<wp:effectExtent l="0" t="0" r="0" b="${eb}"/>`);
const defaults = docDefaults({ font: 'Arial', size: 11, line: 259, after: 160 });
export const cases = [];
// corpo útil A4 com margens 1417: 841,9 − 2×70,85 = 700,2pt. 10 linhas de texto antes.
const filler = Array.from({ length: 10 }, (_, k) => p(r(`Linha ${k + 1} Hxg`))).join('');
for (const h of [470, 475, 480, 485, 490, 495, 500]) {
  cases.push({ name: `if-h${h}`, docx: buildDocx({ body: filler + p(img(h), `<w:rPr>${sz}</w:rPr>`) + p(r('Depois Hxg')), defaults, media }) });
}
for (const h of [480, 485, 490]) {
  cases.push({ name: `if-h${h}-eb`, docx: buildDocx({ body: filler + p(img(h, 8890), `<w:rPr>${sz}</w:rPr>`) + p(r('Depois Hxg')), defaults, media }) });
}
