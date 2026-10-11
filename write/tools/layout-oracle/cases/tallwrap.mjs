// Linha alta (imagem em linha) ao lado de um flutuante que a altura da fonte da
// marca não alcançaria: a linha estreita (contorna) pela altura REAL? Cabeçalho e
// corpo; parágrafo centralizado e à esquerda; flutuante quadrado à direita, abaixo
// do topo do parágrafo.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const anchored = (wPt, hPt, xPt, yPt, wrap) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  const wrapEl = wrap === 'through' ? '<wp:wrapThrough wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapThrough>' : '<wp:wrapSquare wrapText="bothSides"/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${Math.round(xPt * 12700)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(yPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="9" name="flut"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="9" name="flut"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 9 });
export const cases = [];
for (const where of ['hdr', 'body']) {
  for (const jc of ['center', 'left']) {
    for (const wrap of ['square', 'through']) {
      const para = p(r(' '.repeat(30)) + inlineImage(1, 160, 40) + anchored(130, 20, 330, 16, wrap) + r(' Texto depois Hxg'), `<w:jc w:val="${jc}"/>`);
      const name = `tw-${where}-${jc}-${wrap}`;
      if (where === 'hdr') cases.push({ name, docx: buildDocx({ body: p(r('Corpo Hxg')), headers: { default: para + p(r('Cab fim Hxg')) }, sect: sectPr({ top: 2400, header: 500 }), defaults, media }) });
      else cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + para + p(r('Depois Hxg')), defaults, media }) });
    }
  }
}
