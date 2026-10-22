// Imagem oculta pelo Painel de Seleção (wp:docPr hidden="1"): some do desenho?
// E da diagramação — o texto ainda contorna a flutuante? A em linha ainda ocupa
// espaço na linha?
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const graphic = (cx, cy) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
const anchor = (hidden) => {
  const cx = 120 * 12700, cy = 90 * 12700;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="5" name="obj"${hidden ? ' hidden="1"' : ''}/>${graphic(cx, cy)}</wp:anchor></w:drawing></w:r>`;
};
const inline = (hidden) => {
  const cx = 120 * 12700, cy = 90 * 12700;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="5" name="obj"${hidden ? ' hidden="1"' : ''}/>${graphic(cx, cy)}</wp:inline></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 11 });
const doc = (run) => buildDocx({ body: p(r('Antes Hxg')) + p(run + r(lorem(90, 5))) + p(r('Depois Hxg')), defaults, media });
export const cases = [
  { name: 'ph-anchor-visible', docx: doc(anchor(false)) },
  { name: 'ph-anchor-hidden', docx: doc(anchor(true)) },
  { name: 'ph-inline-visible', docx: doc(inline(false)) },
  { name: 'ph-inline-hidden', docx: doc(inline(true)) },
];
