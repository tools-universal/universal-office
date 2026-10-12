// Célula CENTRALIZADA (vAlign center) numa linha cuja altura vem de OUTRA célula (vários
// parágrafos), com uma caixa ancorada nela (wrap none, layoutInCell) menor que a linha:
// o texto dela fica centralizado ou no topo? E sem a caixa, com quebra quadrada, com a
// caixa alta. Modos 11, 14 e 15. Com w:doNotVertAlignCellWithSp (o .doc do corpus tem):
// a célula com forma não alinha verticalmente — e a forma noutra célula da linha? (corpus t119: caixinha cinza ao lado das opções de um
// questionário em .doc.) Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = 12700;
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const WRAP = { square: '<wp:wrapSquare wrapText="bothSides"/>', none: '<wp:wrapNone/>' };
/** caixa ancorada (pt): deslocada x da coluna, 0,4 pt abaixo do parágrafo */
const box = ({ w = 27, h = 19, wrap = 'none', x = 120 }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251660000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="column"><wp:posOffset>${x * E}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>5080</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${w * E}" cy="${h * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${WRAP[wrap]}<wp:docPr id="7" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/>`
  + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w * E}" cy="${h * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="D8D8D8"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${p('')}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const LEFT = ['Pergunta inventada numero oito Hxg', 'linha dois Hxg', 'linha tres Hxg', 'linha quatro Hxg', 'linha cinco Hxg', 'linha seis Hxg'].map((t) => p(r(t))).join('');
const tbl = (cell2) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr>`
  + '<w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>'
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${LEFT}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${cell2}</w:tc></w:tr></w:tbl>`;

/** a mesma caixa em VML (como o Word grava a de um .doc) */
const vml = (h = 18.9) => `<w:r><w:pict><v:shape id="_x0000_s2097" type="#_x0000_t202" style="position:absolute;margin-left:122.95pt;margin-top:.4pt;width:26.95pt;height:${h}pt;z-index:251667456;visibility:visible;mso-position-horizontal-relative:text;mso-position-vertical-relative:text;mso-width-relative:margin;mso-height-relative:margin" fillcolor="#d8d8d8"><v:textbox><w:txbxContent>${p('')}</w:txbxContent></v:textbox></v:shape></w:pict></w:r>`;
/** caixa de seleção de formulário (FORMCHECKBOX) */
const chk = '<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val=""/><w:enabled/><w:calcOnExit w:val="0"/><w:checkBox><w:size w:val="16"/><w:default w:val="0"/></w:checkBox></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
const ROWPR = '<w:trPr><w:cantSplit/><w:trHeight w:val="566"/><w:jc w:val="center"/></w:trPr>';

export const cases = [];
for (const compat of [11, 14, 15]) {
  const D = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const add = (name, body) => cases.push({ name: `vf-${name}-c${compat}`, docx: D(body) });
  add('nobox', tbl(p(r('Sim Nao Hxg')) + p('') + p('')));
  add('none', tbl(p(box({}) + r('Sim Nao Hxg')) + p('') + p('')));
  add('none-1p', tbl(p(box({}) + r('Sim Nao Hxg'))));
  add('none-tall', tbl(p(box({ h: 60 }) + r('Sim Nao Hxg'))));
  add('square', tbl(p(box({ wrap: 'square' }) + r('Sim Nao Hxg')) + p('') + p('')));
  // como no .doc: caixa VML, caixas de seleção, linha cantSplit/altura mínima/centralizada
  add('vml', tbl(p(vml() + r('Sim Nao Hxg')) + p('') + p('')));
  add('chk', tbl(p(chk + r(' Nao ') + chk + r(' Sim Hxg')) + p('') + p('')));
  add('rowpr', tbl(p(r('Sim Nao Hxg')) + p('') + p('')).replace('<w:tr>', '<w:tr>' + ROWPR));
  add('vml-chk', tbl(p(vml() + chk + r(' Nao ') + chk + r(' Sim Hxg')) + p('') + p('')));
  // a linha no pé da página, com outra linha depois que vai para a página seguinte
  const two = (t) => t.replace('</w:tr></w:tbl>', '</w:tr>' + t.slice(t.indexOf('<w:tr>'), t.indexOf('</w:tbl>')) + '</w:tbl>');
  const low = (body) => buildDocx({ body: p(r('Antes Hxg'), '<w:spacing w:before="11800"/>') + body + p(r('Depois Hxg')), compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  cases.push({ name: `vf-bottom-c${compat}`, docx: low(two(tbl(p(vml() + chk + r(' Nao ') + chk + r(' Sim Hxg')) + p('') + p('')).replace(/<w:tr>/g, '<w:tr>' + ROWPR))) });
  cases.push({ name: `vf-bottom-nobox-c${compat}`, docx: low(two(tbl(p(r('Sim Nao Hxg')) + p('') + p('')))) });
  add('all', tbl(p(vml() + chk + r(' Nao ') + chk + r(' Sim Hxg')) + p('') + p('')).replace('<w:tr>', '<w:tr>' + ROWPR));
  // w:doNotVertAlignCellWithSp
  const S = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), compat, extraCompat: '<w:doNotVertAlignCellWithSp/>', defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const sp = (name, body) => cases.push({ name: `vf-sp-${name}-c${compat}`, docx: S(body) });
  sp('nobox', tbl(p(r('Sim Nao Hxg')) + p('') + p('')));
  sp('none', tbl(p(box({}) + r('Sim Nao Hxg')) + p('') + p('')));
  sp('square', tbl(p(box({ wrap: 'square' }) + r('Sim Nao Hxg')) + p('') + p('')));
  sp('vml', tbl(p(vml() + r('Sim Nao Hxg')) + p('') + p('')));
  sp('chk', tbl(p(chk + r(' Nao ') + chk + r(' Sim Hxg')) + p('') + p('')));
  // a forma na OUTRA célula (a centralizada não tem forma)
  sp('other', tbl(p(r('Sim Nao Hxg')) + p('') + p('')).replace('<w:p><w:r><w:t xml:space="preserve">Pergunta', '<w:p>' + box({ x: 20 }) + '<w:r><w:t xml:space="preserve">Pergunta'));
  // a forma no 2º parágrafo da célula
  sp('second', tbl(p(r('Sim Nao Hxg')) + p(box({})) + p('')));
}
