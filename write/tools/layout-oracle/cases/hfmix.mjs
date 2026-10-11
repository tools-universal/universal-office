// Cabeçalho com vários flutuantes num parágrafo VAZIO: imagem "superior e
// inferior" relativa à PÁGINA, duas
// caixas de texto "quadrado" relativas ao parágrafo e uma faixa atrás. O parágrafo
// desce para baixo da imagem e empurra o corpo? Variantes removem cada peça.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [40, 40, 160]) };
const E = (pt) => Math.round(pt * 12700);
const tbox = (id, xPt, yPt, wPt, hPt, text, wrap = '<wp:wrapSquare wrapText="bothSides"/>', behind = 0, dist = 45720) =>
  `<w:r><w:drawing><wp:anchor distT="${dist}" distB="${dist}" distL="114300" distR="114300" simplePos="0" relativeHeight="${251660000 + id}" behindDoc="${behind}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${E(xPt)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${E(yPt)}</wp:posOffset></wp:positionV><wp:extent cx="${E(wPt)}" cy="${E(hPt)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id}" name="tb${id}"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(wPt)}" cy="${E(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="333333"/></a:solidFill></wps:spPr><wps:txbx><w:txbxContent>${p(r(text, '<w:color w:val="FFFFFF"/>'), '<w:jc w:val="center"/>')}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const pageImg = (xPt, yPt, wPt, hPt) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251661312" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${E(xPt)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${E(yPt)}</wp:posOffset></wp:positionV><wp:extent cx="${E(wPt)}" cy="${E(hPt)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapTopAndBottom/><wp:docPr id="9" name="logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="9" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(wPt)}" cy="${E(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const T1 = tbox(1, 100, -20, 220, 50, 'Primeira caixa Hxg');
const T2 = tbox(2, 305, 1, 220, 26, 'Segunda caixa Hxg');
const IMG = pageImg(-60, 16, 120, 40);
const BAND = tbox(3, -85, -35, 640, 70, '', '<wp:wrapNone/>', 1, 0);
const body = Array.from({ length: 4 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
const sect = sectPr({ top: 1417, header: 708, left: 1701, right: 1701 });
export const cases = [];
for (const [name, runs] of [
  ['hm-all', T1 + T2 + IMG + BAND],
  ['hm-img-only', IMG],
  ['hm-tb-only', T1 + T2],
  ['hm-t1-only', T1],
  ['hm-img-band', IMG + BAND],
]) cases.push({ name, docx: buildDocx({ body, headers: { default: p(runs, '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>') }, sect, defaults: docDefaults({ font: 'Calibri', size: 11 }), media }) });
