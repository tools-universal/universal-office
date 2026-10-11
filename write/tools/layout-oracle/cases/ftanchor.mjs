// Parágrafos DEPOIS de uma tabela flutuante da largura toda (âncora texto, tblpY): onde
// fica o parágrafo que só tem âncoras e a quebra de página — desce para baixo da tabela
// ou fica no topo, ao lado dela? Uma caixa de texto ancorada no parágrafo (deslocamento
// de 300 pt) mostra o topo dele. Controles: com texto, sem a quebra. (corpus t43: as
// caixas do rodapé de um formulário saem na mesma página.) Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const E = 12700;
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const ftblY = (y) => `<w:tbl><w:tblPr><w:tblpPr w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${y}"/><w:tblW w:w="9000" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="9000"/></w:tblGrid>`
  + [1, 2, 3, 4].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="9000" w:type="dxa"/></w:tcPr>${p(r(`linha ${k} da tabela Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const ftbl = ftblY(435);
const box = (id, y) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251660000 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${200 * E}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${y * E}</wp:posOffset></wp:positionV><wp:extent cx="${150 * E}" cy="${24 * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="caixa ${id}"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${150 * E}" cy="${24 * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${p(r(`Marca ${id} Hxg`))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const PB = '<w:r><w:br w:type="page"/></w:r>';
const SM = '<w:rPr><w:sz w:val="11"/></w:rPr>';
const D = (body, t = ftbl) => buildDocx({ body: p(r('Antes Hxg')) + t + body + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
// vazio pequeno e depois âncoras + quebra (como no corpus)
cases.push({ name: 'fa-empty-anchors-break', docx: D(p('', SM) + p(box(1, 300) + PB, SM)) });
// só âncoras + quebra, logo depois da tabela
cases.push({ name: 'fa-anchors-break', docx: D(p(box(1, 300) + PB, SM)) });
// âncoras sem a quebra (parágrafo vazio com âncora)
cases.push({ name: 'fa-anchors-only', docx: D(p(box(1, 300), SM)) });
// controle: texto + âncora + quebra
cases.push({ name: 'fa-text-break', docx: D(p(box(1, 300) + r('Texto Hxg') + PB)) });
// a tabela começa DENTRO da 2ª linha pequena (tblpY 160 tw): ela desce para baixo da tabela?
cases.push({ name: 'fa-overlap-empty-anchors-break', docx: D(p('', SM) + p(box(1, 300) + PB, SM), ftblY(160)) });
cases.push({ name: 'fa-overlap-anchors-only', docx: D(p('', SM) + p(box(1, 300), SM), ftblY(160)) });
cases.push({ name: 'fa-overlap-text-break', docx: D(p('', SM) + p(box(1, 300) + r('Texto Hxg', SM.replace(/<\/?w:rPr>/g, '')) + PB, SM), ftblY(160)) });
// controle: o parágrafo desce por uma IMAGEM com quebra quadrada (largura toda), não por tabela
const pic = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251650000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${20 * E}</wp:posOffset></wp:positionV><wp:extent cx="${425 * E}" cy="${60 * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="40" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="40" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${425 * E}" cy="${60 * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const DP = (body) => buildDocx({ body: p(pic + r('Antes Hxg')) + body + p(r('Depois Hxg')), media: { 'image1.png': solidPng(4, 4, [200, 200, 200]) }, defaults: docDefaults({ font: 'Arial', size: 11 }) });
cases.push({ name: 'fa-pic-anchors-break', docx: DP(p('', SM) + p(box(1, 300) + PB, SM)) });
cases.push({ name: 'fa-pic-text', docx: DP(p(box(1, 300) + r('Texto Hxg'))) });
