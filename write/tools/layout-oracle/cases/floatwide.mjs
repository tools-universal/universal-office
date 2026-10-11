// Parágrafo que começa com objetos FLUTUANTES (sem quebra de texto, âncora sem
// largura na linha) e depois uma imagem em linha mais larga que a coluna: a imagem
// fica na 1ª linha (os âncoras não contam como conteúdo) ou desce para a 2ª?
// Controles: sem os flutuantes; imagem que cabe.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==', 'base64'));
let id = 0;
const pic = (cx, cy) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
const inl = (wpt, hpt) => {
  id++;
  const cx = Math.round(wpt * 12700), cy = Math.round(hpt * 12700);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="img${id}"/>${pic(cx, cy)}</wp:inline></w:drawing></w:r>`;
};
const flt = (xpt, ypt) => {
  id++;
  const cx = 40 * 12700, cy = 12 * 12700;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${Math.round(xpt * 12700)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(ypt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="flt${id}"/>${pic(cx, cy)}</wp:anchor></w:drawing></w:r>`;
};
const D = (body) => buildDocx({ body, media: { 'image1.png': png }, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const body = (para) => p(r('Antes Hxg')) + para + p(r('Depois Hxg'));

export const cases = [];
// coluna de 425 pt; imagem de 450 x 60 pt
cases.push({ name: 'fw-floats-wide', docx: D(body(p(flt(20, 10) + flt(200, 30) + inl(450, 60)))) });
cases.push({ name: 'fw-wide', docx: D(body(p(inl(450, 60)))) });
cases.push({ name: 'fw-floats-fit', docx: D(body(p(flt(20, 10) + flt(200, 30) + inl(300, 60)))) });
// flutuante depois da imagem larga
cases.push({ name: 'fw-wide-float', docx: D(body(p(inl(450, 60) + flt(20, 10)))) });
