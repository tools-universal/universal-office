// Tabela flutuante (âncora texto, tblpY positivo, largura quase total): os parágrafos
// depois da âncora cabem ACIMA da tabela quando a linha cabe mas o "depois" do
// parágrafo passa do topo dela? (Linha de 12,65 pt, Arial 11.) Modos 15 e 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const fp = (y) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${y}"/>`;
const tbl = (y) => `<w:tbl><w:tblPr>${fp(y)}<w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="8000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="8000" w:type="dxa"/></w:tcPr>${p(r('tabela Hxg', '<w:sz w:val="16"/>'))}</w:tc></w:tr></w:tbl>`;
const media = { 'image1.png': solidPng(20, 20, [200, 40, 40]) };
const D = (body, after, compat, line = 240) => buildDocx({ body, compat, media, defaults: docDefaults({ font: 'Arial', size: 11, after, line }) });
/** imagem ancorada no parágrafo (largura total, 20 pt de altura), deslocada offYtw para baixo */
const img = (wrap, offYtw) => {
  const cx = 425 * 12700, cy = 20 * 12700;
  const wrapEl = wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : '<wp:wrapTopAndBottom/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>left</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offYtw * 635)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const tail = p(r('ancora Hxg')) + p(r('segundo Hxg')) + p(r('Depois Hxg'));

export const cases = [];
for (const [compat, s] of [[15, ''], [11, '-c11']]) {
  // depois 8 pt: a linha do 2º cabe (33,3 < 35 pt), com o "depois" não (41,3)
  cases.push({ name: `fta-a8-y35${s}`, docx: D(filler(10) + tbl(700) + tail, 160, compat) });
  // controle: depois 8 pt, linha + depois cabem (41,3 < 43)
  cases.push({ name: `fta-a8-y43${s}`, docx: D(filler(10) + tbl(860) + tail, 160, compat) });
  // controle: sem "depois", a linha cabe (25,3 < 27)
  cases.push({ name: `fta-a0-y27${s}`, docx: D(filler(10) + tbl(540) + tail, 0, compat) });
  // imagem de largura total ancorada na âncora (quadrado / superior e inferior), mesma geometria de a8-y35
  for (const w of ['square', 'tb']) cases.push({ name: `fta-img-${w}${s}`, docx: D(filler(10) + p(r('ancora Hxg') + img(w, 700)) + p(r('segundo Hxg')) + p(r('Depois Hxg')), 160, compat) });
  // entrelinha 1,5 (18,97 pt, texto 12,65) e depois 8 pt: conta a linha inteira ou só o
  // texto? y50: texto + depois cabe (47,6), linha + depois não (53,9); y46: só a linha cabe (45,9)
  cases.push({ name: `fta-l15-y50${s}`, docx: D(filler(10) + tbl(1000) + tail, 160, compat, 360) });
  cases.push({ name: `fta-l15-y46${s}`, docx: D(filler(10) + tbl(920) + tail, 160, compat, 360) });
}
