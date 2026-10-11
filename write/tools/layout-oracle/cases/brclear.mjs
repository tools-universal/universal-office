// Quebra de linha com w:clear="all|left|right" ao lado de um flutuante com
// contorno quadrado: o texto depois da quebra desce para baixo do objeto.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 120, 30]) };
const anchored = (wPt, hPt, align) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${align}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="5" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const br = (clear) => `<w:r><w:br${clear ? ` w:type="textWrapping" w:clear="${clear}"` : ''}/></w:r>`;
export const cases = [];
for (const [name, clear, align] of [['brc-none', '', 'left'], ['brc-all', 'all', 'left'], ['brc-left', 'left', 'left'], ['brc-all-right', 'all', 'right']]) {
  const body = p(r('Antes Hxg')) + p(anchored(150, 100, align) + r('Texto ao lado Hxg') + br(clear) + r('Depois da quebra Hxg')) + p(r('Seguinte Hxg'));
  cases.push({ name, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
