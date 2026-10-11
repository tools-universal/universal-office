// Complemento do toptbl: deslocamentos que deixam a imagem ACIMA da margem superior
// mas ainda DENTRO da página (y entre 0 e o topo do corpo) — o Word também a prende
// no topo do corpo, ou só quando ela sairia da página? (imagem "quadrado"
// ancorada com deslocamento negativo)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [200, 40, 40]) };
const img = (offYpt, wrap, offXtw = -80, hpt = 32) => {
  const cx = Math.round(150 * 12700), cy = Math.round(hpt * 12700);
  const w = wrap === 'through' ? '<wp:wrapThrough wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapThrough>'
    : wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : wrap === 'tb' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251657728" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${offXtw * 635}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offYpt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${w}<wp:docPr id="2" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="2" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + ['Linha 1 Hxg', 'Linha 2 Hxg', 'Linha 3 Hxg'].map((t) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${p(r(t))}</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('B'))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="1100" w:bottom="900" w:left="1400" w:header="0" w:footer="600" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
const tail = p(r('Depois 1 Hxg')) + p(r('Depois 2 Hxg'));
export const cases = [];
for (const [name, off, wrap] of [
  ['tt2-through-60', -60, 'through'],   // y ≈ 25 pt: acima da margem (45), dentro da página
  ['tt2-through-80', -80, 'through'],   // y ≈ 5 pt
  ['tt2-square-60', -60, 'square'],
]) cases.push({ name, docx: buildDocx({ body: tbl + p(img(off, wrap) + r('Ancora Hxg')) + tail, sect, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
// sem tabela: âncora no 2º parágrafo / no 1º
for (const [name, body] of [
  ['tt2-notbl-80', p(r('Antes Hxg')) + p(img(-80, 'through') + r('Ancora Hxg')) + tail],
  ['tt2-first-30', p(img(-30, 'through') + r('Ancora Hxg')) + tail],
]) cases.push({ name, docx: buildDocx({ body, sect, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
// modos de compatibilidade antigos (12 e 14)
for (const [name, compat] of [['tt2-c14-80', 14], ['tt2-c12-80', 12]]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + p(img(-80, 'through') + r('Ancora Hxg')) + tail, sect, defaults: docDefaults({ font: 'Arial', size: 11 }), media, compat }) });
}
