// Grupo de desenho (wpg) e caixa de texto (wps) EM LINHA (wp:inline): o Word desenha as
// formas e o texto das caixas do grupo no lugar do objeto na linha. Arial 11; textos
// inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = (pt) => Math.round(pt * 12700);
const WPG = 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup';
const txbx = (text) => `<wps:txbx><w:txbxContent><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:txbxContent></wps:txbx>`;
const sp = (id, x, y, w, h, fill, text) => `<wps:wsp><wps:cNvPr id="${id}" name="f${id}"/><wps:cNvSpPr${text ? ' txBox="1"' : ''}/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}<a:ln><a:noFill/></a:ln></wps:spPr>${text ? txbx(text) : ''}<wps:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"/></wps:wsp>`;
const group = (w, h, kids) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="grupo"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${WPG}"><wpg:wgp xmlns:wpg="${WPG}"><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/><a:chOff x="0" y="0"/><a:chExt cx="${E(w)}" cy="${E(h)}"/></a:xfrm></wpg:grpSpPr>${kids}</wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const inlineTb = (w, h, text) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="2" name="caixa"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${sp(3, 0, 0, w, h, 'DDEEFF', text).replace('<a:off x="0" y="0"/>', '<a:off x="0" y="0"/>')}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
cases.push({ name: 'ig-group', docx: D(p(r('Antes Hxg')) + p(group(200, 100, sp(4, 0, 0, 200, 100, 'EEEEEE') + sp(5, 20, 20, 160, 30, null, 'Caixa um Hxg') + sp(6, 20, 60, 160, 30, null, 'Caixa dois Hxg'))) + p(r('Depois Hxg'))) });
cases.push({ name: 'ig-textbox', docx: D(p(r('Antes Hxg')) + p(inlineTb(200, 50, 'Caixa sozinha Hxg')) + p(r('Depois Hxg'))) });
