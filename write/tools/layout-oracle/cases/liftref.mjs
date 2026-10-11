// Parágrafo com "antes" e objetos relativos a ele, um deles passando da margem
// inferior (o Word SOBE esse até a margem — oráculo selffloat): os OUTROS objetos
// continuam medidos do topo do parágrafo ANTES do espaço (oráculo anchorbefore)?
// A sonda depois do parágrafo desce para baixo do objeto de cima.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [40, 120, 200]) };
let id = 10;
const obj = (wPt, hPt, offPt, alignH, wrap) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700), n = id++;
  const wrapEl = wrap === 'tb' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + n}" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${alignH}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="${n}" name="obj${n}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="obj${n}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const filler = (k) => p(r(`Antes ${k} Hxg`));
const fill = (n) => Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
const defaults = docDefaults({ font: 'Arial', size: 11 });
const small = '<w:sz w:val="16"/>';
export const cases = [];
// objeto de cima (24pt abaixo do topo, quebra "superior e inferior") + objeto de baixo
// que passa da margem (sobe) ou não (controle); "antes" de 10pt e de 0
for (const [name, before, offB] of [['lr-lift-b10', 200, 60], ['lr-stay-b10', 200, 30], ['lr-lift-b0', 0, 60], ['lr-stay-b0', 0, 30]]) {
  const anchorP = p(obj(120, 20, 24, 'left', 'tb') + obj(60, 10, offB, 'right', 'tb'), `<w:spacing w:before="${before}"/>`);
  cases.push({ name, docx: buildDocx({ body: fill(50) + anchorP + p(r('Sonda Hxg', small)) + filler(99), sect: sectPr({}), defaults, media }) });
}
// sonda com texto de 8pt e marca de 11pt (ou 8pt): cabe acima do objeto de cima pela
// altura da LINHA (texto) ou da marca?
for (const [name, mark] of [['lr-mark11', ''], ['lr-mark8', '<w:rPr><w:sz w:val="16"/></w:rPr>']]) {
  const anchorP = p(obj(120, 20, 24, 'left', 'tb'));
  cases.push({ name, docx: buildDocx({ body: fill(50) + anchorP + p(r('Sonda Hxg', small), mark) + filler(99), sect: sectPr({}), defaults, media }) });
}
// o mesmo com a sonda pequena, um parágrafo VAZIO com a quebra de seção (próxima
// página) e a seção seguinte: a sonda cabe entre os objetos e a seção 2 começa na página 2
{
  const anchorP = p(obj(120, 20, 24, 'left', 'tb') + obj(60, 10, 60, 'right', 'tb'), '<w:spacing w:before="200"/>');
  const brk = `<w:p><w:pPr><w:rPr><w:sz w:val="16"/></w:rPr>${sectPr({})}</w:pPr></w:p>`;
  cases.push({ name: 'lr-sect', docx: buildDocx({ body: fill(50) + anchorP + p(r('Sonda Hxg', small), '<w:rPr><w:sz w:val="16"/></w:rPr>') + brk + p(r('Secao dois Hxg')), sect: sectPr({}), defaults, media }) });
}
