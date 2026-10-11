// Modos < 15 (oráculo ftafter): a última linha do parágrafo + o "depois" têm de ficar
// fora do flutuante — a distância do texto (distT) do flutuante conta? Imagem quadrada
// de largura total, distT 0 ou 3,6pt, deslocamento variando de 1 em 1pt; o parágrafo
// seguinte (depois de 6pt) fica acima dela ou desce?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (offPt, distT) => `<w:r><w:drawing><wp:anchor distT="${distT}" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${600 * 12700}" cy="${40 * 12700}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${600 * 12700}" cy="${40 * 12700}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const defaults = docDefaults({ font: 'Arial', size: 11 });
const sp = '<w:spacing w:before="120" w:after="120"/>';
export const cases = [];
for (const compat of [11, 15]) {
  for (const distT of [0, 45720]) {
    // âncora: linha de 12,65pt + 6 depois; seguinte: 6 antes (máx 6) + 12,65 + 6 depois
    // fim da linha do seguinte + depois ≈ 18,65 + 12,65 + 6 = 37,3pt do topo do âncora
    for (const off of [34, 36, 37, 38, 39, 40, 41, 42]) {
      const body = p(r('Antes Hxg'), sp) + p(img(off, distT) + r('Ancora Hxg'), sp) + p(r('Seguinte Hxg'), sp) + p(r('Depois Hxg'), sp);
      cases.push({ name: `fad-c${compat}-d${distT ? 36 : 0}-o${off}`, docx: buildDocx({ body, defaults, media, compat }) });
    }
  }
}
// como o corpus t20 (documento antigo): espaçamento somado (doNotUseHTMLParagraphAutoSpacing)
// e entrelinha 1,15 — a linha inteira + o "depois" (ftafter) ou só o texto?
{
  const sp2 = '<w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/>';
  for (const off of [40, 42, 44, 45, 46, 47, 48, 50]) {
    const body = p(r('Antes Hxg'), sp2) + p(img(off, 45720) + r('Ancora Hxg'), sp2) + p(r('Seguinte Hxg'), sp2) + p(r('Depois Hxg'), sp2);
    cases.push({ name: `fad-html-o${off}`, docx: buildDocx({ body, defaults, media, compat: 11, extraCompat: '<w:doNotUseHTMLParagraphAutoSpacing/>' }) });
  }
}
// empurrado para baixo do flutuante com espaçamento somado: quanto do vão volta lá?
{
  for (const [a, b] of [[120, 360], [360, 120], [0, 240], [240, 0]]) {
    const body = p(r('Antes Hxg')) + p(img(10, 0) + r('Ancora Hxg'), `<w:spacing w:after="${a}"/>`) + p(r('Seguinte Hxg'), `<w:spacing w:before="${b}"/>`) + p(r('Depois Hxg'));
    cases.push({ name: `fad-push-html-a${a}-b${b}`, docx: buildDocx({ body, defaults, media, compat: 11, extraCompat: '<w:doNotUseHTMLParagraphAutoSpacing/>' }) });
    cases.push({ name: `fad-push-max-a${a}-b${b}`, docx: buildDocx({ body, defaults, media, compat: 11 }) });
  }
}
// parágrafo VAZIO (só a marca) na mesma situação (corpus t20): a regra do "depois" vale?
{
  const sp2 = '<w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/>';
  for (const off of [44, 46, 48, 50]) {
    const body = p(r('Antes Hxg'), sp2) + p(img(off, 45720) + r('Ancora Hxg'), sp2) + p('', sp2) + p(r('Seguinte Hxg'), sp2) + p(r('Depois Hxg'), sp2);
    cases.push({ name: `fad-empty-o${off}`, docx: buildDocx({ body, defaults, media, compat: 11, extraCompat: '<w:doNotUseHTMLParagraphAutoSpacing/>' }) });
  }
}
