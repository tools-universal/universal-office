// Contorno dos DOIS lados (moldura w:framePr e wp:wrapSquare bothSides): com o
// objeto no meio da linha, o texto ocupa o vão da esquerda e depois o da direita.
// Qual a largura mínima de um vão para receber texto? Vãos de 6 a 72pt à
// esquerda e à direita; e wrapText largest/left/right.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const text = (seed) => p(r(lorem(120, seed)));
const fr = (xTw) => `<w:framePr w:w="2400" w:h="760" w:hRule="exact" w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:x="${xTw}" w:y="1"/>`;
const pic = (xPt, wrapText = 'bothSides') => {
  const cx = 120 * 12700, cy = 38 * 12700;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>${Math.round(xPt * 12700)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>12700</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="${wrapText}"/><wp:docPr id="5" name="obj"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
// texto 425,2pt de largura; objeto de 120pt
for (const gap of [6, 12, 18, 24, 30, 36, 48, 72]) {
  cases.push({ name: `ws-fr-l${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Moldura Hxg'), fr(gap * 20)) + text(gap) + p(r('Fim Hxg')), defaults }) });
  const xr = 425.2 - 120 - gap;
  cases.push({ name: `ws-fr-r${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Moldura Hxg'), fr(Math.round(xr * 20))) + text(gap + 1) + p(r('Fim Hxg')), defaults }) });
  cases.push({ name: `ws-pic-l${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(gap) + r(lorem(120, gap + 2))) + p(r('Fim Hxg')), defaults, media }) });
  cases.push({ name: `ws-pic-r${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(xr) + r(lorem(120, gap + 3))) + p(r('Fim Hxg')), defaults, media }) });
}
for (const wt of ['largest', 'left', 'right']) {
  cases.push({ name: `ws-pic-mid-${wt}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(140, wt) + r(lorem(120, 9))) + p(r('Fim Hxg')), defaults, media }) });
}
// justificado com o objeto no meio
cases.push({ name: 'ws-pic-mid-just', docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(140) + r(lorem(120, 11)), '<w:jc w:val="both"/>') + p(r('Fim Hxg')), defaults, media }) });
// largura mínima do vão: texto só de "a" (6,1pt) — o vão recebe texto?
const aaa = p(r(Array.from({ length: 260 }, () => 'a').join(' ')));
for (const gap of [8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 22]) {
  cases.push({ name: `ws-a-fr-l${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Moldura Hxg'), fr(gap * 20)) + aaa + p(r('Fim Hxg')), defaults }) });
  cases.push({ name: `ws-a-fr-r${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Moldura Hxg'), fr(Math.round((425.2 - 120 - gap) * 20))) + aaa + p(r('Fim Hxg')), defaults }) });
  cases.push({ name: `ws-a-pic-l${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(gap) + r(Array.from({ length: 260 }, () => 'a').join(' '))) + p(r('Fim Hxg')), defaults, media }) });
  cases.push({ name: `ws-a-pic-r${gap}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(425.2 - 120 - gap) + r(Array.from({ length: 260 }, () => 'a').join(' '))) + p(r('Fim Hxg')), defaults, media }) });
}
