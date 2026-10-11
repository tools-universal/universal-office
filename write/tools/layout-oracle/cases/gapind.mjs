// Vão estreito à direita de uma imagem "quadrado" (30pt até a margem da coluna):
// parágrafos com recuo direito (que deixa só 10pt) entram ao lado dela? O vão mínimo
// de 18pt (oráculo wrapsides) conta na coluna ou no quadro já recuado do parágrafo?
// Vazios e com uma letra; controle sem recuo. Arial 11; imagem 395,2 × 100 pt.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [60, 160, 60]) };
const pic = (wPt) => {
  const cx = Math.round(wPt * 12700), cy = 100 * 12700;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${14 * 12700}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="5" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 11 });
const ind = (rTw) => rTw ? `<w:ind w:right="${rTw}"/>` : '';
export const cases = [];
for (const [name, rTw, txt] of [['gi-empty-r0', 0, ''], ['gi-empty-r20', 400, ''], ['gi-empty-r28', 560, ''], ['gi-x-r0', 0, 'x'], ['gi-x-r20', 400, 'x']]) {
  const many = Array.from({ length: 5 }, () => p(txt ? r(txt) : '', ind(rTw))).join('');
  cases.push({ name, docx: buildDocx({ body: p(pic(395.2) + r('Ancora Hxg')) + many + p(r('Fim depois do vao Hxg')), defaults, media }) });
}
