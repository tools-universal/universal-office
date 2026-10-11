// Espaçamento automático (beforeAutospacing/afterAutospacing, "HTML") com e sem
// contextualSpacing, antes de tabelas e no início do documento.
// (Normal com auto 14pt + contextual: o Word não põe o "depois" antes da tabela)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [40, 120, 40]) };
const AUTO = '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"/>';
const normal = (ctx, spacing = AUTO) => `<w:pPr>${spacing}${ctx ? '<w:contextualSpacing/>' : ''}</w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr>`;
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (cells) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>`
  + cells.map((c) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${c}</w:tc></w:tr>`).join('') + '</w:tbl>';
const anchorImg = () => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>4826000</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-457200</wp:posOffset></wp:positionV><wp:extent cx="1270000" cy="508000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="10" name="logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="10" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1270000" cy="508000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const title = p(r('Titulo Hxg', '<w:b/><w:sz w:val="32"/>'));
const after = p(r('Depois Hxg'));
export const cases = [];
for (const [name, body, norm] of [
  ['as-p-p', p(r('Primeiro Hxg')) + p(r('Segundo Hxg')) + after, normal(true)],
  ['as-p-p-noctx', p(r('Primeiro Hxg')) + p(r('Segundo Hxg')) + after, normal(false)],
  ['as-p-tbl', p(r('Antes Hxg')) + tbl([p(r('Celula Hxg'))]) + after, normal(true)],
  ['as-p-tbl-noctx', p(r('Antes Hxg')) + tbl([p(r('Celula Hxg'))]) + after, normal(false)],
  ['as-empty-tbl', p(r('Antes Hxg')) + p('') + tbl([p(r('Celula Hxg'))]) + p('') + tbl([p(r('Outra Hxg'))]) + after, normal(true)],
  ['as-first-anchor', p(anchorImg() + r(' ')) + title + p('') + tbl([p(r('Celula Hxg'))]) + after, normal(true)],
  ['as-first-text', p(r('Primeira Hxg')) + title + after, normal(true)],
]) {
  cases.push({ name, docx: buildDocx({ body, normal: norm, defaults: docDefaults({ font: 'Calibri', size: 11 }), media }) });
}
// cabeçalho com espaçamento automático: o "depois" do último parágrafo (e o
// "antes" do primeiro) entram na altura do cabeçalho?
import { sectPr } from '../docx-builder.mjs';
for (const [name, hdr] of [
  ['as-hdr-one', p(r('Cab Hxg'))],
  ['as-hdr-empty', p('')],
  ['as-hdr-two', p(r('Cab 1 Hxg')) + p(r('Cab 2 Hxg'))],
]) {
  cases.push({ name, docx: buildDocx({
    body: p(r('Corpo 1 Hxg')) + p(r('Corpo 2 Hxg')), headers: { default: hdr }, normal: normal(true),
    sect: sectPr({ top: 1134, header: 708 }), defaults: docDefaults({ font: 'Calibri', size: 11 }), media,
  }) });
}
