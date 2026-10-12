// Âncora de objeto flutuante DEPOIS dos espaços finais da linha: os espaços continuam
// pendurados (não contam no alinhamento à direita/centro) — corpus t265: rodapé alinhado à
// direita com texto + espaços + logotipo ancorado. Arial 10, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

let id = 1;
const anc = (wrap) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>114300</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="361950" cy="190500"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id++}" name="Img"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="i"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="361950" cy="190500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const SQ = '<wp:wrapSquare wrapText="bothSides"/>';
const NONE = '<wp:wrapNone/>';
const SP = ' '.repeat(30);
const media = { 'image1.png': solidPng(40, 20, [30, 30, 200]) };
export const cases = [];
for (const jc of ['right', 'center']) {
  let body = '';
  let i = 0;
  for (const wrap of [SQ, NONE]) {
    for (const runs of [
      (k) => r(`Linha${k} alinhada Hxg${SP}`) + anc(wrap),
      (k) => anc(wrap) + r(`Linha${k} alinhada Hxg${SP}`),
      (k) => r(`Linha${k} alinhada Hxg${SP.slice(0, 10)}`) + anc(wrap) + r(SP.slice(10)),
    ]) {
      body += p(r(`Ante${i}`), '<w:spacing w:after="0"/>')
        + p(runs(i), `<w:spacing w:after="0"/><w:jc w:val="${jc}"/>`)
        // (parágrafo vazio no meio: a imagem de 15 pt não alcança a linha medida seguinte)
        + p('', '<w:spacing w:after="0"/>') + p(r(`Depo${i}`), '<w:spacing w:after="0"/>');
      i++;
    }
  }
  // âncora no fim da 1ª linha de um parágrafo de duas
  body += p(r(`Linha${i} alinhada Hxg ` + 'palavra '.repeat(14) + SP) + anc(SQ) + r(' mais texto'), `<w:spacing w:after="0"/><w:jc w:val="${jc}"/>`);
  cases.push({ name: `at-${jc}`, docx: buildDocx({ body, media, defaults: docDefaults({ font: 'Arial', size: 10, after: 0, line: 240 }) }) });
}
