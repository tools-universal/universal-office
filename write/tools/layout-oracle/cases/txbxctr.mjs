// Caixa de texto flutuante (wps) alinhada (centro/esquerda/direita, relativa à margem ou à
// página): o Word alinha a caixa JUNTO com a margem de efeitos (wp:effectExtent — sombra,
// brilho): centralizada, o conjunto extent + efeitos fica no meio; à direita, os efeitos da
// direita encostam na referência; à esquerda, os da esquerda. Caixa mais estreita e mais
// larga que a área de texto, com e sem contorno; alinhamento vertical idem (t/b).
import { buildDocx, p, r, docDefaults, sectPr } from '../docx-builder.mjs';

const E = 12700;
const box = (i, wPt, align, rel, line, ee = [0, 0, 0, 0], vAlign) => `<w:r><w:drawing><wp:anchor distT="45720" distB="45720" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + i}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${rel}"><wp:align>${align}</wp:align></wp:positionH>${vAlign ? `<wp:positionV relativeFrom="margin"><wp:align>${vAlign}</wp:align></wp:positionV>` : `<wp:positionV relativeFrom="page"><wp:posOffset>${Math.round((60 + i * 70) * E)}</wp:posOffset></wp:positionV>`}<wp:extent cx="${Math.round(wPt * E)}" cy="${50 * E}"/><wp:effectExtent l="${ee[0]}" t="${ee[1]}" r="${ee[2]}" b="${ee[3]}"/><wp:wrapNone/><wp:docPr id="${10 + i}" name="caixa ${i}"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(wPt * E)}" cy="${50 * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>${line ? '<a:ln w="9525"><a:solidFill><a:srgbClr val="999999"/></a:solidFill></a:ln>' : '<a:ln><a:noFill/></a:ln>'}</wps:spPr><wps:txbx><w:txbxContent>${p(r(`Caixa ${i} com texto que corre ate o fim da linha e quebra mais adiante quando a largura acaba de vez`))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
let body = '';
let i = 0;
const EE = [0, 0, 28575, 28575];
const EL = [127000, 0, 0, 0];
for (const [wPt, align, rel, line, ee, vAlign] of [[552.75, 'center', 'margin', true], [552.75, 'center', 'margin', true, EE], [300, 'center', 'margin', true, EE], [300, 'center', 'page', true, EL],
  [300, 'left', 'margin', true, EL], [300, 'right', 'margin', true, EE], [300, 'center', 'margin', false, [63500, 63500, 63500, 254000], 'bottom']]) {
  body += p(box(i, wPt, align, rel, line, ee, vAlign) + r(`Ancora ${i}`));
  i++;
}
const sect = sectPr({ w: 11900, h: 16840, left: 1134, right: 1134, top: 400, bottom: 400 });
export const cases = [15, 11].map((compat) => ({ name: `tc-c${compat}`, docx: buildDocx({ body, sect, compat, defaults: docDefaults({ font: 'Calibri Light', size: 12 }) }) }));
