// Imagem flutuante relativa ao PARÁGRAFO (deslocamento 0 e 10pt) num parágrafo com
// espaço antes de 20pt: a referência é o topo do parágrafo antes ou depois do espaço?
// No corpo, 1º parágrafo da célula e 2º parágrafo da célula.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const img = (offPt) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${300 * 12700}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${60 * 12700}" cy="${20 * 12700}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${60 * 12700}" cy="${20 * 12700}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const cell = (content) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="8000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="8000" w:type="dxa"/></w:tcPr>${content}</w:tc></w:tr></w:tbl>`;
const anchorP = (off) => p(img(off) + r('Ancora Hxg'), '<w:spacing w:before="400"/>');
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const off of [0, 10]) {
  cases.push({ name: `ab-body-${off}`, docx: buildDocx({ body: p(r('Antes Hxg')) + anchorP(off) + p(r('Depois Hxg')), defaults, media }) });
  cases.push({ name: `ab-cell1-${off}`, docx: buildDocx({ body: p(r('Antes Hxg')) + cell(anchorP(off) + p(r('Fim Hxg'))) + p(r('Depois Hxg')), defaults, media }) });
  cases.push({ name: `ab-cell2-${off}`, docx: buildDocx({ body: p(r('Antes Hxg')) + cell(p(r('Primeiro Hxg')) + anchorP(off) + p(r('Fim Hxg'))) + p(r('Depois Hxg')), defaults, media }) });
}
// o anterior com espaço depois (10pt) e o âncora com antes 20pt / 5pt: a referência
// fica no fim do "depois" do anterior ou antes dele?
for (const before of [400, 100]) {
  const a = p(img(0) + r('Ancora Hxg'), `<w:spacing w:before="${before}"/>`);
  cases.push({ name: `ab-after-b${before}`, docx: buildDocx({ body: p(r('Antes Hxg'), '<w:spacing w:after="200"/>') + a + p(r('Depois Hxg')), defaults, media }) });
  cases.push({ name: `ab-cell2-after-b${before}`, docx: buildDocx({ body: p(r('Antes Hxg')) + cell(p(r('Primeiro Hxg'), '<w:spacing w:after="200"/>') + a + p(r('Fim Hxg'))) + p(r('Depois Hxg')), defaults, media }) });
}
// modos de compatibilidade 11 e 14 (documentos antigos): a mesma referência?
for (const compat of [11, 14]) {
  cases.push({ name: `ab-c${compat}-body-0`, docx: buildDocx({ body: p(r('Antes Hxg')) + anchorP(0) + p(r('Depois Hxg')), defaults, media, compat }) });
  const a = p(img(0) + r('Ancora Hxg'), '<w:spacing w:before="400"/>');
  cases.push({ name: `ab-c${compat}-after-b400`, docx: buildDocx({ body: p(r('Antes Hxg'), '<w:spacing w:after="200"/>') + a + p(r('Depois Hxg')), defaults, media, compat }) });
  cases.push({ name: `ab-c${compat}-cell2-0`, docx: buildDocx({ body: p(r('Antes Hxg')) + cell(p(r('Primeiro Hxg')) + anchorP(0) + p(r('Fim Hxg'))) + p(r('Depois Hxg')), defaults, media, compat }) });
}
