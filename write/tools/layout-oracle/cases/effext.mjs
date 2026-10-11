// wp:effectExtent de imagem EM LINHA: entra no avanço (l/r) e na altura (t/b)?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (l, t, rr, b) => inlineImage(1, 60, 40).replace(/(<wp:extent [^>]*\/>)/, `$1<wp:effectExtent l="${l * 12700}" t="${t * 12700}" r="${rr * 12700}" b="${b * 12700}"/>`);
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const [name, e] of [['ee-none', [0, 0, 0, 0]], ['ee-lr5', [5, 0, 5, 0]], ['ee-tb5', [0, 5, 0, 5]], ['ee-all3', [3, 3, 3, 3]], ['ee-b07', [0, 0, 0, 0.7]]]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Inicio ') + img(...e) + r(' depois da imagem Hxg')) + p(r('Seguinte Hxg')), defaults, media }) });
}
