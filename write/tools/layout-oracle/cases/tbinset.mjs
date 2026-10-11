// Caixa de texto (wps) com wps:style lnRef idx=2 e a:ln sem preenchimento: o texto fica
// a lIns da borda ou a lIns + a espessura da linha do tema? Sem estilo e com linha visível
// para comparar. Caixa de 159,75 × 48,75 pt, margens padrão, ancorada ao centro.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = (pt) => Math.round(pt * 12700);
const style = '<wps:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></wps:style>';
const text = 'Texto inventado da caixa para quebrar em tres linhas com palavras curtas e longas de prova';
const tb = (ln, withStyle) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251663360" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${E(20)}</wp:posOffset></wp:positionV><wp:extent cx="${E(159.75)}" cy="${E(48.75)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="3" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(159.75)}" cy="${E(48.75)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>${ln}</wps:spPr>${withStyle ? style : ''}<wps:txbx><w:txbxContent>${p(r(text, '<w:sz w:val="16"/>'))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
cases.push({ name: 'ti-style-nofill', docx: D(p(tb('<a:ln><a:noFill/></a:ln>', true) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
cases.push({ name: 'ti-nostyle-nofill', docx: D(p(tb('<a:ln><a:noFill/></a:ln>', false) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
cases.push({ name: 'ti-style-line', docx: D(p(tb('<a:ln w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>', true) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
cases.push({ name: 'ti-style-noln', docx: D(p(tb('', true) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
// a:ln com espessura e sem preenchimento: sem estilo, com lnRef 0 e com lnRef 2 (corpus t44)
const style0 = style.replace('<a:lnRef idx="2">', '<a:lnRef idx="0">');
const wnf = '<a:ln w="25400"><a:noFill/></a:ln>';
cases.push({ name: 'ti-nostyle-wnofill', docx: D(p(tb(wnf, false) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
cases.push({ name: 'ti-style0-wnofill', docx: D(p(tb(wnf, true).replace(style, style0) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
cases.push({ name: 'ti-style2-wnofill', docx: D(p(tb(wnf, true) + r('Ancora Hxg')) + p(r('Depois Hxg'))) });
