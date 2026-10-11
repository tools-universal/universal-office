// Imagem flutuante no cabeçalho com contorno (quadrado / superior e inferior)
// que desce além da margem superior: o texto do corpo desvia dela?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const anchored = (wPt, hPt, offYtw, wrap, relV = 'paragraph') => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  const wrapEl = wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : wrap === 'tb' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${Math.round(offYtw * 635)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="5" name="logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const body = Array.from({ length: 8 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
export const cases = [];
// imagem de 590pt (mais larga que a página) x 90pt, ancorada no parágrafo do cabeçalho
for (const [name, h, off, wrap] of [
  ['sq-below', 88, -700, 'square'],   // base em ~88pt, margem 90pt
  ['sq-deep', 108, -700, 'square'],   // base em ~108pt (passa da margem)
  ['tb-deep', 108, -700, 'tb'],
  ['none-deep', 108, -700, 'none'],
  ['sq-narrow', 108, -700, 'square-narrow'],
]) {
  const w = name === 'sq-narrow' ? 200 : 588;
  const hdr = p(anchored(w, h, off, wrap === 'square-narrow' ? 'square' : wrap) + r('Cab Hxg'));
  cases.push({ name: `hff-${name}`, docx: buildDocx({ body, headers: { default: hdr }, sect: sectPr({ top: 1800, header: 708 }), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// parágrafo VAZIO (só a âncora) no cabeçalho/rodapé: ele desce para baixo da
// própria imagem e empurra o corpo? E o que vem depois dele? (imagem de fundo no cabeçalho/rodapé)
{
  const longBody = Array.from({ length: 70 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
  const emptyAnchor = (w, h, off, wrap) => p(anchored(w, h, off, wrap));
  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r('Tabela Hxg'))}</w:tc></w:tr></w:tbl>`;
  for (const [name, hdr, ftr] of [
    ['hff-empty-hdr', emptyAnchor(588, 88, -700, 'square'), null],
    ['hff-empty-hdr-text2', emptyAnchor(588, 88, -700, 'square') + p(r('Cab Hxg')), null],
    ['hff-empty-ftr', null, emptyAnchor(588, 70, -460, 'square')],
    ['hff-empty-ftr-text2', null, emptyAnchor(588, 70, -460, 'square') + p(r('Rod Hxg'))],
    ['hff-empty-ftr-tbl', null, emptyAnchor(588, 30, 0, 'square') + tbl],
  ]) {
    cases.push({ name, docx: buildDocx({
      body: longBody,
      ...(hdr ? { headers: { default: hdr } } : {}),
      ...(ftr ? { footers: { default: ftr } } : {}),
      sect: sectPr({ top: 1800, header: 708, bottom: 1680, footer: 708 }),
      defaults: docDefaults({ font: 'Arial', size: 11 }), media,
    }) });
  }
}
// os mesmos em modo de compatibilidade 14 (Word 2010)
{
  const longBody = Array.from({ length: 70 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
  const emptyAnchor = (w, h, off, wrap) => p(anchored(w, h, off, wrap));
  for (const [name, hdr, ftr] of [
    ['hff14-empty-hdr', emptyAnchor(588, 88, -700, 'square'), null],
    ['hff14-text-hdr', p(anchored(588, 88, -700, 'square') + r('Cab Hxg')), null],
    ['hff14-empty-ftr', null, emptyAnchor(588, 70, -460, 'square')],
  ]) {
    cases.push({ name, docx: buildDocx({
      body: longBody, compat: 14,
      ...(hdr ? { headers: { default: hdr } } : {}),
      ...(ftr ? { footers: { default: ftr } } : {}),
      sect: sectPr({ top: 1800, header: 708, bottom: 1680, footer: 708 }),
      defaults: docDefaults({ font: 'Arial', size: 11 }), media,
    }) });
  }
}
