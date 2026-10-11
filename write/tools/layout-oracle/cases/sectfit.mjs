// Parágrafo VAZIO que carrega a quebra de seção (sectPr no pPr) e não cabe no
// fim da página: o Word o empurra para a página seguinte (criando uma página
// só com ele) ou o deixa pendurado abaixo da margem?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const filler = (k) => p(r(`Linha ${k} Hxg`));
const fill = (n) => Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
const sectPara = (text, rpr = '') => `<w:p><w:pPr>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}${sectPr({})}</w:pPr>${text ? r(text) : ''}</w:p>`;
const after = p(r('Seção 2 Hxg')) + p(r('Seção 2 linha 2'));
const nextType = (t) => sectPr({ extra: `<w:type w:val="${t}"/>` });
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const [name, body, sect] of [
  // 55 linhas enchem a página (a 56ª não cabe)
  ['sf-empty-next', fill(55) + sectPara('') + after, nextType('nextPage')],
  ['sf-empty-small', fill(55) + sectPara('', '<w:sz w:val="9"/>') + after, nextType('nextPage')],
  ['sf-text-next', fill(55) + sectPara('Fim Hxg') + after, nextType('nextPage')],
  ['sf-empty-cont', fill(55) + sectPara('') + after, nextType('continuous')],
  ['sf-empty-plain', fill(55) + p('') + after, nextType('nextPage')],
  // duas vazias: a 1ª (sem quebra) não cabe — vai; e a da quebra?
  ['sf-two-empty', fill(55) + p('') + sectPara('') + after, nextType('nextPage')],
]) {
  cases.push({ name, docx: buildDocx({ body, sect, defaults }) });
}
// o ÚLTIMO parágrafo do documento (vazio) que não cabe: página nova ou pendurado?
{
  const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
  const tbl = (n) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
    + Array.from({ length: n }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(`cel ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
  for (const [name, body] of [
    ['sf-last-empty', fill(55) + p('')],
    ['sf-last-text', fill(55) + p(r('Fim Hxg'))],
    ['sf-last-empty-tbl', fill(2) + tbl(52) + p('')],
    ['sf-last-two-empty', fill(55) + p('') + p('')],
  ]) cases.push({ name, docx: buildDocx({ body, sect: sectPr({}), defaults }) });
}
// parágrafo da quebra de seção só com a âncora de um flutuante (sem texto): vazio?
{
  const { solidPng } = await import('../png.mjs');
  const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
  const anc = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${100 * 12700}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${300 * 12700}</wp:posOffset></wp:positionV><wp:extent cx="${100 * 12700}" cy="${30 * 12700}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${100 * 12700}" cy="${30 * 12700}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  const sectAnc = `<w:p><w:pPr>${sectPr({})}</w:pPr>${anc}</w:p>`;
  cases.push({ name: 'sf-anchor-only', docx: buildDocx({ body: fill(55) + sectAnc + after, sect: nextType('nextPage'), defaults, media }) });
}
