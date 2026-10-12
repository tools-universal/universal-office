// Imagem ancorada (quadrado, relativa ao parágrafo, layoutInCell) numa célula com deslocamento
// vertical NEGATIVO: não sobe acima do topo da área de texto da célula (vira 0) e empurra o
// texto da célula — a linha cresce. E a altura da célula mesclada verticalmente conta as
// margens de cima/baixo da TABELA (tblCellMar), não só as da célula (corpus t55: cabeçalho
// com logotipo numa célula mesclada). Calibri 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r, font, sz, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const EMU = 12700;
const media = { 'image1.png': solidPng(40, 12, [200, 30, 30]) };
const pic = ({ cx, cy, posV, wrap = '<wp:wrapSquare wrapText="bothSides"/>' }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="1" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>179705</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${posV}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="1" name="Img 1"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="i"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const MAR = '<w:tblCellMar><w:top w:w="14" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="25" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>';
const defaults = docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 });

export const cases = [];
// 1) tabela de uma linha no corpo: deslocamento, tamanho, espaço automático e contorno
{
  let body = '';
  let i = 0;
  for (const auto of [false, true]) for (const posPt of [-30.35, -15, 0, 5]) for (const [cxPt, cyPt] of [[100.8, 30.45], [30, 20]]) {
    const ppr = `<w:pPr><w:spacing w:after="100"${auto ? ' w:afterAutospacing="1"' : ''}/><w:jc w:val="center"/></w:pPr>`;
    const cell = `<w:tc><w:tcPr><w:tcW w:w="2303" w:type="dxa"/></w:tcPr><w:p>${ppr}${pic({ cx: Math.round(cxPt * EMU), cy: Math.round(cyPt * EMU), posV: Math.round(posPt * EMU) })}</w:p></w:tc>`;
    const cell2 = `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${r('K' + i)}</w:p></w:tc>`;
    body += p(r(`Antes ${i}`), '<w:spacing w:after="0"/>');
    body += `<w:tbl><w:tblPr><w:tblW w:w="4303" w:type="dxa"/><w:tblLayout w:type="fixed"/>${MAR}<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2303"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="341"/></w:trPr>${cell}${cell2}</w:tr></w:tbl>`;
    body += p(r(`Depois ${i}`), '<w:spacing w:after="0"/>');
    i++;
    if (i % 8 === 0) { cases.push({ name: `cp-body-${i / 8}`, docx: buildDocx({ body, media, defaults }) }); body = ''; }
  }
}
// 2) cabeçalho: tabela com células mescladas verticalmente (logotipo, título) e margens da tabela
const B = '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
const tc = (w, inner, extra = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra}<w:tcBorders>${B}</w:tcBorders></w:tcPr>${inner}</w:tc>`;
function hdrTable({ logoAuto = true, image = true, contDefault = true }) {
  const p0 = (inner, ppr = '<w:spacing w:after="0"/>') => `<w:p><w:pPr>${ppr}</w:pPr>${inner}</w:p>`;
  const cont = contDefault ? '<w:p/>' : p0('');
  const logoP = `<w:p><w:pPr><w:spacing w:after="100"${logoAuto ? ' w:afterAutospacing="1"' : ''}/><w:jc w:val="center"/></w:pPr>${image ? pic({ cx: 1280160, cy: 386715, posV: -385445 }) : ''}</w:p>`;
  const vm = '<w:vMerge w:val="restart"/>', vc = '<w:vMerge/>';
  const row0 = `<w:tr><w:trPr><w:trHeight w:val="341"/></w:trPr>${tc(2303, logoP, vm + '<w:vAlign w:val="center"/>')}${tc(435, p0(''), vm)}${tc(3429, p0(r('Titulo Fixo', font('Arial') + sz(14)), '<w:spacing w:after="0"/><w:jc w:val="center"/>'), vm + '<w:vAlign w:val="center"/>')}${tc(21, p0(''), vm)}${tc(252, p0(''), vm)}${tc(3908, p0(r('Campo Alfa'), '<w:spacing w:after="0"/><w:jc w:val="center"/>'), '<w:gridSpan w:val="2"/><w:vAlign w:val="center"/>')}</w:tr>`;
  const rp = (t) => `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${r(t)}</w:p>`;
  const row1 = `<w:tr><w:trPr><w:trHeight w:val="440"/></w:trPr>${tc(2303, cont, vc)}${tc(435, cont, vc)}${tc(3429, cont, vc)}${tc(21, cont, vc)}${tc(252, cont, vc)}${tc(1498, rp('Rev 01'), '<w:vAlign w:val="center"/>')}${tc(2410, rp('Data 31/07'), '<w:vAlign w:val="center"/>')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="10348" w:type="dxa"/><w:tblInd w:w="137" w:type="dxa"/><w:tblLayout w:type="fixed"/>${MAR}</w:tblPr><w:tblGrid><w:gridCol w:w="2303"/><w:gridCol w:w="435"/><w:gridCol w:w="3429"/><w:gridCol w:w="21"/><w:gridCol w:w="252"/><w:gridCol w:w="1498"/><w:gridCol w:w="2410"/></w:tblGrid>${row0}${row1}</w:tbl><w:p/>`;
}
for (const [name, v] of [['full', {}], ['noauto', { logoAuto: false }], ['noimg', { image: false }], ['cont0', { contDefault: false }]]) {
  const body = p(r('Corpo primeira linha Hxg')) + p(r('Corpo segunda linha Hxg'));
  cases.push({ name: `cp-hdr-${name}`, docx: buildDocx({ body, headers: { default: hdrTable(v) }, media, defaults, sect: sectPr({ top: 567, right: 851, bottom: 567, left: 567, header: 709, footer: 709 }) }) });
}
