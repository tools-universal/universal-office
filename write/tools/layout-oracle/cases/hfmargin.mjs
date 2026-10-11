// Objeto do cabeçalho posicionado em relação à MARGEM, com o cabeçalho mais alto
// que a margem superior (empurra o corpo): a referência é o topo real do corpo?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const tb = (offPt) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="margin"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="1270000" cy="381000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="7" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1270000" cy="381000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></wps:spPr><wps:txbx><w:txbxContent>${p(r('Caixa Hxg'))}</w:txbxContent></wps:txbx><wps:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const hdrLines = (n) => Array.from({ length: n }, (_, k) => p(r(`Cabecalho ${k + 1} Hxg`), '<w:jc w:val="right"/>')).join('');
const body = Array.from({ length: 5 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const [name, n, off] of [['hfm-tall-neg', 5, -40], ['hfm-tall-pos', 5, 10], ['hfm-short-neg', 1, -26]]) {
  cases.push({ name, docx: buildDocx({ body, headers: { default: p(tb(off) + r('Cabecalho 0 Hxg'), '<w:jc w:val="right"/>') + hdrLines(n) }, sect: sectPr({ top: 1065, header: 483 }), defaults }) });
}
