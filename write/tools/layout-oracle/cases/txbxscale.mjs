// texto com escala horizontal (w:w) dentro de caixas de texto: o Word grava o texto no PDF
// ou desenha curvas? Corpo, caixa solta (wps), caixa num grupo (wpg) na frente e atrás do
// texto, em linha. Arial 11; textos inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = (pt) => Math.round(pt * 12700);
const WPG = 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup';
const WPS = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
const para = (text, w) => p(r(text, w ? `<w:w w:val="${w}"/>` : ''));
const txbx = (paras) => `<wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx>`;
const sp = (id, x, y, w, h, fill, paras) => `<wps:wsp><wps:cNvPr id="${id}" name="f${id}"/><wps:cNvSpPr${paras ? ' txBox="1"' : ''}/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}<a:ln><a:noFill/></a:ln></wps:spPr>${paras ? txbx(paras) : ''}<wps:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"/></wps:wsp>`;
const anchor = (id, x, y, w, h, behind, uri, inner) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${E(x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${E(y)}</wp:posOffset></wp:positionV><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="obj${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${uri}">${inner}</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const group = (w, h, kids) => `<wpg:wgp xmlns:wpg="${WPG}"><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/><a:chOff x="0" y="0"/><a:chExt cx="${E(w)}" cy="${E(h)}"/></a:xfrm></wpg:grpSpPr>${kids}</wpg:wgp>`;
const inline = (id, w, h, uri, inner) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="obj${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${uri}">${inner}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const trio = (k) => para(`Caixa ${k} escala cem normal`) + para(`Caixa ${k} escala noventa estreita`, 90) + para(`Caixa ${k} escala cento e vinte larga`, 120);

const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
// corpo + caixa solta na frente / atrás
cases.push({ name: 'ts-solta', docx: D(para('Corpo escala cem normal') + para('Corpo escala noventa estreita', 90)
  + p(anchor(10, 80, 300, 300, 60, false, WPS, sp(11, 0, 0, 300, 60, 'EEEEEE', trio('frente'))) + anchor(20, 80, 420, 300, 60, true, WPS, sp(21, 0, 0, 300, 60, 'EEEEEE', trio('atras'))) + r('Ancora das caixas'))) });
// caixa dentro de grupo na frente / atrás
cases.push({ name: 'ts-grupo', docx: D(para('Corpo do grupo')
  + p(anchor(30, 80, 300, 300, 80, false, WPG, group(300, 80, sp(31, 0, 0, 300, 80, 'EEEEEE') + sp(32, 10, 10, 280, 60, null, trio('grupo frente'))))
    + anchor(40, 80, 450, 300, 80, true, WPG, group(300, 80, sp(41, 0, 0, 300, 80, 'EEEEEE') + sp(42, 10, 10, 280, 60, null, trio('grupo atras')))) + r('Ancora dos grupos'))) });
// em linha: caixa e grupo
cases.push({ name: 'ts-linha', docx: D(para('Antes das caixas em linha')
  + p(inline(50, 300, 60, WPS, sp(51, 0, 0, 300, 60, 'EEEEEE', trio('linha'))))
  + p(inline(60, 300, 80, WPG, group(300, 80, sp(61, 0, 0, 300, 80, 'EEEEEE') + sp(62, 10, 10, 280, 60, null, trio('linha grupo')))))
  + para('Depois das caixas em linha')) });
