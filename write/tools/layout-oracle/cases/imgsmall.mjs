// Linha só com uma imagem EM LINHA mais baixa que a fonte (0,5 a 20 pt; Arial 10): a
// linha fica com a altura da imagem ou, no mínimo, com a da fonte do run? Simples e 1,15.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [20, 20, 20]) };
let n = 1;
const img = (hPt) => { const id = n++; const cx = 150 * 12700, cy = Math.round(hPt * 12700); return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="img${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 10 }), media });
export const cases = [];
for (const [name, sp] of [['single', ''], ['m115', '<w:spacing w:line="276" w:lineRule="auto"/>']]) {
  const body = [0.5, 5, 9, 20].map((h) => p(r(`antes ${h} Hxg`)) + p(img(h), sp)).join('') + p(r('Fim Hxg'));
  cases.push({ name: `is-${name}`, docx: D(body) });
}
