// Imagem em linha seguida de quebras de linha (w:br) no mesmo parágrafo: a linha da
// imagem tem a descida da fonte abaixo dela? E a linha vazia entre duas imagens?
// Arial 12; imagens de 100 pt; espaçamento simples e "auto" (before/afterAutospacing).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [90, 140, 200]) };
let n = 1;
const img = (hPt) => { const id = n++; const cx = 200 * 12700, cy = Math.round(hPt * 12700); return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="img${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };
const br = '<w:r><w:br/></w:r>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 12 }), media });
export const cases = [];
const runs = () => img(100) + br + br + img(100) + br + br + r('texto depois Hxg');
cases.push({ name: 'ib-plain', docx: D(p(r('Antes Hxg')) + p(runs()) + p(r('Fim Hxg'))) });
cases.push({ name: 'ib-auto', docx: D(p(r('Antes Hxg')) + p(runs(), '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"/>') + p(r('Fim Hxg'))) });
// a imagem sozinha na linha, sem quebras (controle)
cases.push({ name: 'ib-alone', docx: D(p(r('Antes Hxg')) + p(img(100)) + p(r('Fim Hxg'))) });
