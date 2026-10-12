// Imagem flutuante do cabeçalho (quadrado / superior e inferior, largura da página) que passa
// um pouco da margem superior. Modo ≤ 14: ela fica presa no canto da FOLHA (não sobe nem sai
// pela esquerda além da borda) e empurra a 1ª linha do corpo de cada página para baixo dela,
// com o "antes" do parágrafo valendo lá (também no topo de página por quebra natural); o texto
// do próprio cabeçalho não a contorna. Modo 15: o cabeçalho cresce (controle). Corpus t191.
// Verdana 10, conteúdo inventado.
import { buildDocx, docDefaults, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const V = '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/><w:sz w:val="20"/>';
const img = (hPt, posV, wrap) => {
  const cy = Math.round(hPt * 12700);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251655168" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${posV}</wp:posOffset></wp:positionV><wp:extent cx="7571740" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="3" name="Img"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="i"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="7571740" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const WRAP = { sq: '<wp:wrapSquare wrapText="bothSides"/>', tb: '<wp:wrapTopAndBottom/>', none: '<wp:wrapNone/>' };
const para = (t, before) => `<w:p><w:pPr><w:spacing w:before="${before}" w:after="0" w:line="360" w:lineRule="auto"/><w:rPr>${V}</w:rPr></w:pPr>${r(t, V)}</w:p>`;
const media = { 'image1.png': solidPng(40, 20, [200, 200, 230]) };
const sect = sectPr({ w: 11906, h: 16838, top: 1843, right: 1701, bottom: 1702, left: 1701, header: 708, footer: 708 });
export const cases = [];
for (const [mode, wn, h, before, posV] of [
  [14, 'sq', 92.5, 128, -459105], [14, 'sq', 100, 0, -459105], [14, 'sq', 100, 128, -459105], [14, 'sq', 90, 128, -459105],
  [14, 'sq', 92.5, 128, -300000], [14, 'tb', 92.5, 128, -459105], [14, 'tb', 100, 0, -459105], [14, 'none', 100, 128, -459105],
  [15, 'sq', 92.5, 128, -459105], [15, 'tb', 100, 0, -459105],
]) {
  let body = '';
  for (let k = 0; k < 40; k++) body += para(`Linha${k} Hxg`, before);
  const hdr = `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${img(h, posV, WRAP[wn])}${r('Cab')}</w:p>`;
  cases.push({ name: `hw${mode}-${wn}-${String(h).replace('.', '')}-${before}${posV === -300000 ? '-low' : ''}`, docx: buildDocx({ body, compat: mode, headers: { default: hdr }, media, defaults: docDefaults({ font: 'Calibri', size: 11, after: 200, line: 276 }), sect }) });
}
