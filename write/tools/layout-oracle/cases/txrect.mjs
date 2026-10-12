// Texto dentro de forma que não é retângulo (wps com prstGeom): o Word põe o texto no
// RETÂNGULO DE TEXTO da forma (txRect da definição da forma predefinida), não na caixa
// toda? Triângulo, losango, elipse, retângulo arredondado; âncora no topo e no centro;
// margens internas 0 e padrão. (corpus t70: "2" num triângulo de um .doc.) Arial 11,
// conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = 12700;
const shape = ({ i, prst, anchor = 't', ins = 0, w = 120, h = 80 }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + i}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="page"><wp:posOffset>${(100 + (i % 2) * 200) * E}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${(120 + Math.floor(i / 2) * 110) * E}</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${w * E}" cy="${h * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${10 + i}" name="forma ${i}"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/>`
  + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w * E}" cy="${h * E}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${p(r(`Forma ${i} com texto de prova Hxg`))}</w:txbxContent></wps:txbx>`
  + `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="${ins}" tIns="${ins / 2}" rIns="${ins}" bIns="${ins / 2}" anchor="${anchor}" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const D = (shapes) => buildDocx({ body: p(shapes + r('Ancora Hxg')) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
for (const prst of ['rect', 'triangle', 'diamond', 'ellipse', 'roundRect']) {
  cases.push({ name: `tr-${prst}`, docx: D(shape({ i: 0, prst }) + shape({ i: 1, prst, anchor: 'ctr' }) + shape({ i: 2, prst, ins: 91440 }) + shape({ i: 3, prst, anchor: 'b' })) });
}
