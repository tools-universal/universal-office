// Objeto flutuante ancorado DEPOIS do texto que ele cobre (posição relativa à
// página/margem, ou deslocamento negativo relativo ao parágrafo): o Word refaz o
// texto de antes para contornar o objeto? No cabeçalho (tabela + parágrafo com o
// logo, distância do cabeçalho 0) e no corpo.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const anchored = (wPt, hPt, offYpt, wrap, relV, alignH = 'center') => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  const wrapEl = wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : wrap === 'tb' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>${alignH}</wp:align></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${Math.round(offYpt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="5" name="logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r('Tabela A Hxg'))}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r('Tabela B Hxg'))}</w:tc></w:tr>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r('Tabela C Hxg'))}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r('Tabela D Hxg'))}</w:tc></w:tr></w:tbl>`;
const body = Array.from({ length: 10 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
export const cases = [];
// cabeçalho: tabela e DEPOIS o parágrafo com o logo (relativo à página)
for (const [name, hdr] of [
  ['lf-hdr-tbl-tb', tbl + p(anchored(73, 34, 12, 'tb', 'page'))],
  ['lf-hdr-par-tb', p(r('Cabecalho Hxg')) + p(anchored(73, 34, 4, 'tb', 'page'))],
  ['lf-hdr-tbl-sq', tbl + p(anchored(73, 34, 12, 'square', 'page', 'left'))],
]) {
  cases.push({ name, docx: buildDocx({ body, headers: { default: hdr }, sect: sectPr({ top: 826, header: 0 }), defaults: docDefaults({ font: 'Arial', size: 10 }), media }) });
}
// corpo: objeto ancorado no 5º parágrafo, posicionado sobre o 4º (relativo ao
// parágrafo com deslocamento negativo o Word itera de outro jeito — não modelado)
for (const [name, anc] of [
  ['lf-body-page-tb', anchored(150, 40, 110, 'tb', 'page')],
  ['lf-body-page-sq', anchored(150, 40, 110, 'square', 'page', 'left')],
]) {
  const b = Array.from({ length: 10 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`) + (k === 4 ? anc : ''))).join('');
  cases.push({ name, docx: buildDocx({ body: b, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
