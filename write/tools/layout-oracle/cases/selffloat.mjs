// Flutuante ancorado no PRÓPRIO parágrafo do corpo: o texto desse parágrafo
// (não só o dos seguintes) contorna o objeto? E se o parágrafo não cabe na
// página, o objeto vai junto para a próxima?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [200, 40, 40]) };
const anchored = (wPt, hPt, wrap, alignH = 'left', offYtw = 0, behind = false) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  const wrapEl = wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>'
    : wrap === 'tb' ? '<wp:wrapTopAndBottom/>'
      : wrap === 'tight' ? '<wp:wrapTight wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapTight>'
        : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${alignH}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offYtw * 635)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="7" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="7" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const filler = (k) => p(r(`Antes ${k} Hxg`));
const long = 'Texto longo do mesmo parágrafo que contorna o objeto ancorado nele mesmo, com palavras suficientes para quebrar em várias linhas e passar da altura da imagem. '.repeat(3);
export const cases = [];
for (const [name, wrap, alignH, w, h] of [
  ['sq-left', 'square', 'left', 120, 60],
  ['sq-right', 'square', 'right', 120, 60],
  ['tb-center', 'tb', 'center', 200, 50],
  ['tight-left', 'tight', 'left', 100, 40],
  ['none-left', 'none', 'left', 100, 40],
]) {
  const body = filler(1) + p(anchored(w, h, wrap, alignH) + r(long)) + filler(2) + filler(3);
  cases.push({ name: `self-${name}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// parágrafo com objeto no pé da página: não cabe → vai para a próxima com o objeto
// (perto do pé: o objeto não cabe abaixo da 1ª linha; no pé: nem a 1ª linha cabe)
for (const [name, n] of [['self-pb-near', 47], ['self-pb-split', 51], ['self-pb-next', 55]]) {
  const before = Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
  const body = before + p(anchored(120, 60, 'square', 'left') + r(long)) + filler(99);
  cases.push({ name, docx: buildDocx({ body, sect: sectPr({}), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// limiar: o objeto passa da margem inferior por pouco? (50 antes: topo ~703pt, margem 771pt)
for (const [name, n, h, wrap] of [
  ['self-pbt-66', 50, 66, 'square'], ['self-pbt-70', 50, 70, 'square'],
  ['self-pbt-none', 51, 60, 'none'], ['self-pbt-tb', 51, 60, 'tb'], ['self-pbt-tight', 51, 60, 'tight'],
]) {
  const before = Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
  const body = before + p(anchored(120, h, wrap, 'left') + r(long)) + filler(99);
  cases.push({ name, docx: buildDocx({ body, sect: sectPr({}), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// objeto que passa da margem inferior: o Word SOBE o objeto até a margem (sem mover o
// parágrafo) quando ele continua abaixo do topo do parágrafo? (objeto pequeno no pé da página)
for (const [name, n, off, h, wrap, text, behind] of [
  ['self-cl-off20', 50, 20, 60, 'square', true, false],
  ['self-cl-off5', 50, 5, 66, 'square', true, false],
  ['self-cl-off20-empty', 50, 20, 60, 'square', false, false],
  ['self-cl-off0-empty', 50, 0, 70, 'square', false, false],
  ['self-cl-tb-tiny', 53, 30, 6, 'tb', false, false],
  ['self-cl-tb-tiny-text', 53, 30, 6, 'tb', true, false],
  ['self-cl-behind', 50, 20, 60, 'square', true, true],
]) {
  const before = Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
  const body = before + p(anchored(120, h, wrap, 'left', off * 20, behind) + (text ? r(long) : '')) + filler(99);
  cases.push({ name, docx: buildDocx({ body, sect: sectPr({}), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
