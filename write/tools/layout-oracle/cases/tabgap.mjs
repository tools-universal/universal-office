// Linha com TABULAÇÕES (centro e direita) ao lado de uma imagem centrada com quebra
// "justa"/"quadrado": a parada além do vão acaba a linha ali e o resto desce para baixo
// da imagem? Parágrafos vazios entre elas; controles sem tabulação e com tab à esquerda.
// Arial 10. Geometria inventada (imagem 180×40 pt; paradas 4480/8960).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [200, 120, 60]) };
const img = (wrap) => {
  const cx = 180 * 12700, cy = 40 * 12700;
  const w = wrap === 'tight' ? '<wp:wrapTight wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapTight>' : '<wp:wrapSquare wrapText="bothSides"/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251666432" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(200 * 12700)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>127000</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${w}<wp:docPr id="9" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="9" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const tabs = '<w:tabs><w:tab w:val="center" w:pos="4480"/><w:tab w:val="right" w:pos="8960"/></w:tabs>';
const sm = '<w:rPr><w:sz w:val="16"/></w:rPr>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 10 }), media });
export const cases = [];
for (const wrap of ['tight', 'square']) {
  const anchorP = p(img(wrap) + r('Ancora Hxg'), `<w:jc w:val="center"/>${tabs}`);
  const empt = p('', `<w:jc w:val="center"/>${tabs}${sm}`);
  // (justa: o Word desce a linha ~0,9 pt além do fundo da imagem — fica de fora por ora)
  if (wrap === 'square') cases.push({ name: `tg-${wrap}-tabs`, docx: D(p(r('Antes Hxg')) + anchorP + empt + empt + p(r('esq Hxg\t\tdir 10'), `<w:jc w:val="center"/>${tabs}`) + p(r('Fim Hxg'))) });
  cases.push({ name: `tg-${wrap}-plain`, docx: D(p(r('Antes Hxg')) + anchorP + empt + empt + p(r('esq Hxg dir 10'), `<w:jc w:val="center"/>${tabs}`) + p(r('Fim Hxg'))) });
  // centralizado com um tab só; à esquerda com dois tabs (este desce: só no quadrado)
  cases.push({ name: `tg-${wrap}-center1`, docx: D(p(r('Antes Hxg')) + anchorP + empt + empt + p(r('esq Hxg	dir 10'), `<w:jc w:val="center"/>${tabs}`) + p(r('Fim Hxg'))) });
  if (wrap === 'square') cases.push({ name: `tg-${wrap}-left2`, docx: D(p(r('Antes Hxg')) + anchorP + empt + empt + p(r('esq Hxg		dir 10'), tabs) + p(r('Fim Hxg'))) });
  cases.push({ name: `tg-${wrap}-lefttab`, docx: D(p(r('Antes Hxg')) + anchorP + empt + empt + p(r('esq Hxg\tdir 10'), tabs) + p(r('Fim Hxg'))) });
}
