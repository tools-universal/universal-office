// Caixa de texto (wps, altura fixa) com MAIS texto do que cabe: o Word desenha as linhas
// que passam do fundo da caixa? Corte por linha (topo/base/baseline da linha × fundo da
// caixa ou da área interna)? Linha com imagem em linha; vertOverflow="clip"/"overflow".
// (corpus t43: caixa do tamanho da página cujas últimas linhas — imagens EMF com texto —
// ficam fora dela.) Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = 12700;
/** caixa (pt) ancorada no parágrafo, com insets padrão (7,2/3,6 pt) */
const box = ({ h, body, attrs = '' }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251660000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${20 * E}</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${200 * E}" cy="${h * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="7" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/>`
  + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${200 * E}" cy="${h * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${body}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"${attrs}><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const LINES = (n) => Array.from({ length: n }, (_, i) => p(r(`Linha ${i + 1} inventada Hxg`))).join('');

export const cases = [];
const D = (b) => buildDocx({ body: p(b + r('Ancora Hxg')) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
// linhas de 12,65 pt; área interna começa 3,6 pt abaixo do topo
for (const h of [40, 44, 48, 52, 56]) cases.push({ name: `to-lines-h${h}`, docx: D(box({ h, body: LINES(8) })) });
cases.push({ name: 'to-fits', docx: D(box({ h: 120, body: LINES(4) })) });
cases.push({ name: 'to-clipattr', docx: D(box({ h: 48, body: LINES(8), attrs: ' vertOverflow="clip"' })) });
cases.push({ name: 'to-overflowattr', docx: D(box({ h: 48, body: LINES(8), attrs: ' vertOverflow="overflow"' })) });

// figura EMF com texto (rótulo) numa linha que passa do fundo da caixa × dentro dela
import { emf, pic } from './emfrop.mjs';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';
const DE = (b) => {
  const d = buildDocx({ body: p(b + r('Ancora Hxg')) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'image1.emf': emf([]) } });
  const files = unzipSync(d);
  files['[Content_Types].xml'] = strToU8(strFromU8(files['[Content_Types].xml']).replace('<Default Extension="png"', '<Default Extension="emf" ContentType="image/x-emf"/><Default Extension="png"'));
  return zipSync(files);
};
cases.push({ name: 'to-emf-over', docx: DE(box({ h: 48, body: LINES(4) + p(pic(1)) })) });
cases.push({ name: 'to-emf-in', docx: DE(box({ h: 120, body: LINES(2) + p(pic(1)) })) });
