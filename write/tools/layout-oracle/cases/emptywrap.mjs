// Parágrafo VAZIO (só a marca) cuja linha cruzaria um flutuante quadrado de largura
// total ancorado no parágrafo anterior: desce para baixo dele como o texto, ou fica
// (sobreposto)? Texto × vazio × vazio com marca grande; modos 15 e 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (offPt, hPt) => `<w:r><w:drawing><wp:anchor distT="45720" distB="45720" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${600 * 12700}" cy="${hPt * 12700}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${600 * 12700}" cy="${hPt * 12700}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const compat of [15, 11]) {
  for (const [tag, next] of [
    ['text', p(r('Seguinte com texto Hxg'))],
    ['empty', p('')],
    ['empty36', p('', '<w:rPr><w:sz w:val="72"/></w:rPr>')],
  ]) {
    // a imagem começa 30pt abaixo do topo do âncora: a linha do parágrafo seguinte a cruza
    const body = p(r('Antes Hxg')) + p(img(30, 60) + r('Ancora Hxg')) + next + p(r('Marcador Hxg')) + p(r('Depois Hxg'));
    cases.push({ name: `ew-c${compat}-${tag}`, docx: buildDocx({ body, defaults, media, compat }) });
  }
}
