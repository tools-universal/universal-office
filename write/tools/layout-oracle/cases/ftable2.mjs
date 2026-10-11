// Tabelas flutuantes (âncora texto, largura total, tblpY negativo) em sequência,
// separadas por parágrafos vazios: onde fica a 2ª tabela (e o parágrafo âncora
// que desce para baixo da 1ª)?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const fp = (y) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="${y}"/>`;
const ftbl = (y, label) => `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${fp(y)}<w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="8494"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="8494" w:type="dxa"/></w:tcPr>${p('')}${p(r(`${label} primeira Hxg`))}${p('')}${p(r(`${label} segunda Hxg`), '<w:spacing w:after="120"/>')}${p('')}</w:tc></w:tr></w:tbl>`;
const B = '<w:b/><w:sz w:val="26"/>';
const empty = p('', `<w:rPr>${B}</w:rPr>`);
const D = (body, compat = 15) => buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 }) });

export const cases = [];
for (const y of [-46, 0, 200]) {
  cases.push({ name: `ft2-two-y${y}`, docx: D(p(r('Antes Hxg')) + empty + ftbl(y, 'T1') + empty + ftbl(y, 'T2') + empty + p(r('Depois Hxg'))) });
  cases.push({ name: `ft2-one-y${y}`, docx: D(p(r('Antes Hxg')) + empty + ftbl(y, 'T1') + empty + p(r('Depois Hxg'))) });
}
// âncoras com texto (a âncora da 1ª desce para baixo dela)
cases.push({ name: 'ft2-two-text', docx: D(p(r('Antes Hxg')) + ftbl(-46, 'T1') + p(r('ancora um Hxg')) + ftbl(-46, 'T2') + p(r('ancora dois Hxg')) + p(r('Depois Hxg'))) });
// dois parágrafos vazios entre as tabelas
cases.push({ name: 'ft2-two-gap2', docx: D(p(r('Antes Hxg')) + empty + ftbl(-46, 'T1') + empty + empty + ftbl(-46, 'T2') + empty + p(r('Depois Hxg'))) });
// (modos 11/14: o parágrafo ANTES da tabela também desce para baixo dela quando o
// "depois" dele cruza a tabela — não reproduzido; casos fora do oráculo)
// o "antes" do parágrafo âncora e o "depois" do anterior: qual vale para a posição?
cases.push({ name: 'ft2-anchor-before', docx: D(p(r('Antes Hxg')) + empty + ftbl(-46, 'T1') + p('', `<w:spacing w:before="240"/><w:rPr>${B}</w:rPr>`) + p(r('Depois Hxg'))) });
cases.push({ name: 'ft2-anchor-before-small', docx: D(p(r('Antes Hxg')) + empty + ftbl(-46, 'T1') + p('', `<w:spacing w:before="60"/><w:rPr>${B}</w:rPr>`) + p(r('Depois Hxg'))) });
cases.push({ name: 'ft2-prev-text', docx: D(p(r('Antes Hxg')) + p(r('outro Hxg'), '<w:spacing w:after="300"/>') + ftbl(200, 'T1') + p(r('ancora Hxg')) + p(r('Depois Hxg'))) });
// imagem "superior e inferior" ancorada no próprio parágrafo (deslocamento 0): o
// parágrafo desce para baixo dela — com o "antes" dele de novo? e a imagem fica
// depois do "depois" do parágrafo anterior?
const media = { 'image1.png': solidPng(20, 20, [200, 40, 40]) };
const tbImg = (wPt, hPt) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapTopAndBottom/><wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const DI = (body) => buildDocx({ body, media, defaults: docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 }) });
for (const before of [0, 60, 240]) {
  cases.push({ name: `img-tb-before${before}`, docx: DI(p(r('Antes Hxg')) + p(tbImg(200, 50) + r('ancora Hxg'), `<w:spacing w:before="${before}"/>`) + p(r('Depois Hxg'))) });
}
// réplica de formulário: duas tabelas flutuantes (tblpY −46) de largura total, a 1ª
// terminando em parágrafos vazios, separadas por um parágrafo vazio em negrito 13 pt
{
  const R13 = '<w:sz w:val="26"/><w:szCs w:val="26"/>';
  const cp = (t, ppr = '') => p(t ? r(t, R13) : '', `${ppr}<w:rPr>${R13}</w:rPr>`);
  const sp = '<w:spacing w:after="120"/><w:jc w:val="both"/>';
  const cellA = cp('') + cp('Bom dia, cliente Hxg') + cp('') + cp('Texto de resposta numero um Hxg', sp) + cp('Assinatura Hxg', sp) + cp('', sp) + cp('');
  const tblF = (cell) => `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${fp(-46)}<w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="8494"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="8494" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
  const bold = (hl) => p('', `<w:rPr><w:b/>${R13}${hl ? '<w:highlight w:val="lightGray"/>' : ''}</w:rPr>`);
  const DC = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11, after: 0, line: 240 }) });
  cases.push({ name: 'ft2-form', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + bold(true) + tblF(cellA) + bold(true) + bold(true) + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft2-form-nohl', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + bold(false) + tblF(cellA) + bold(false) + bold(false) + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft2-form-one', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + bold(true) + p(r('Depois Hxg'))) });
  // variações para isolar a causa
  const cellB = cp('') + cp('Bom dia, cliente Hxg') + cp('') + cp('Texto de resposta numero um Hxg', sp) + cp('Assinatura Hxg', sp);
  cases.push({ name: 'ft2-formx-endtext', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellB) + bold(true) + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft2-formx-after160', docx: buildDocx({ body: p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + bold(true) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 }) }) });
  cases.push({ name: 'ft2-formx-arial', docx: buildDocx({ body: p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + bold(true) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11, after: 0, line: 240 }) }) });
  cases.push({ name: 'ft2-formx-plainanchor', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + bold(false) + tblF(cellA) + p('') + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft2-formx-noempty-before', docx: DC(p(r('Titulo Hxg', `<w:b/>${R13}`)) + tblF(cellA) + bold(true) + p(r('Depois Hxg'))) });
}
