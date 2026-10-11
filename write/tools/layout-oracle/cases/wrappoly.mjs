// Contorno justo/através (wrapTight/wrapThrough) com polígono MENOR que a imagem:
// o texto contorna o polígono (caixa dele) ou a imagem inteira?
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const poly = (x1, y1) => `<wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="${y1}"/><wp:lineTo x="${x1}" y="${y1}"/><wp:lineTo x="${x1}" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon>`;
const pic = (kind, x1, y1, dist = 0) => {
  const cx = 150 * 12700, cy = 60 * 12700;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="${dist}" distR="${dist}" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:${kind} wrapText="bothSides">${poly(x1, y1)}</wp:${kind}><wp:docPr id="5" name="obj"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const kind of ['wrapTight', 'wrapThrough']) {
  for (const [x1, y1] of [[21600, 21600], [21600, 10800], [10800, 21600], [10800, 10800]]) {
    cases.push({ name: `wp-${kind === 'wrapTight' ? 'tight' : 'through'}-${x1 / 216}-${y1 / 216}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(kind, x1, y1) + r(lorem(80, 3))) + p(r('Depois Hxg')), defaults, media }) });
  }
}
// com distância lateral (distL/R 0,25")
cases.push({ name: 'wp-tight-50-50-dist', docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic('wrapTight', 10800, 10800, 228600) + r(lorem(80, 3))) + p(r('Depois Hxg')), defaults, media }) });
