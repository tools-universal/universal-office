// Quebra de página seguida SÓ de âncoras de objetos flutuantes até o fim do parágrafo: as
// âncoras ficam na linha da quebra (os objetos na página dela) e a marca de parágrafo não abre
// linha na página seguinte — o parágrafo seguinte começa no topo (corpus t43: caixa de texto do
// tamanho da página ancorada logo depois). Modos 14 e 15. Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

let id = 1;
const box = (txt, relV, offV, wrap) => `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${2000000 + id * 300000}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${offV}</wp:posOffset></wp:positionV><wp:extent cx="1200000" cy="381000"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id++}" name="Caixa"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1200000" cy="381000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${r(txt)}</w:p></w:txbxContent></wps:txbx><wps:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>`;
const NONE = '<wp:wrapNone/>';
const SQ = '<wp:wrapSquare wrapText="bothSides"/>';
const PB = '<w:r><w:br w:type="page"/></w:r>';
const tails = {
  pgnone: () => box('Pg', 'page', 9000000, NONE),
  parnone: () => box('Par', 'paragraph', 100000, NONE),
  parsq: () => box('Sq', 'paragraph', 100000, SQ),
  two: () => box('Aa', 'page', 9000000, NONE) + box('Bb', 'paragraph', 200000, NONE),
};
export const cases = [];
for (const mode of [15, 14]) for (const [name, tail] of Object.entries(tails)) {
  const body = p(r('Antes Hxg')) + p(r('Texto Hxg') + PB + tail(), '<w:spacing w:after="0"/>')
    + p(r('Depois Hxg'), '<w:spacing w:before="0" w:after="0"/>') + p(r('Mais Hxg'));
  cases.push({ name: `pa${mode}-${name}`, docx: buildDocx({ body, compat: mode, defaults: docDefaults({ font: 'Arial', size: 11, after: 0, line: 240 }), sect: sectPr({ top: 1000 }) }) });
}
