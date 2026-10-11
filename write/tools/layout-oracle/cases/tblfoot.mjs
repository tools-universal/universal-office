// Imagem com quebra "quadrado" do RODAPÉ que sobe para dentro do corpo (largura
// total): o texto do corpo para acima dela; uma linha de tabela que a cruza parte no
// topo da imagem (o resto vai para a próxima página) ou desce até a margem por cima
// dela? Uma linha com 8 parágrafos, linhas de 1 parágrafo e o controle sem tabela.
// Arial 11: 12,65 pt por linha; imagem do rodapé de ~734pt até o pé.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [200, 200, 230]) };
const img = (wPt, hPt, offPt) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offPt * 12700)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="5" name="obj"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const ftr = p(img(595, 72, -60) + r('Rodape Hxg'));
const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const fill = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const tc = (xml) => `<w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${xml}</w:tc>`;
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>${rows.map((x) => `<w:tr>${tc(x)}</w:tr>`).join('')}</w:tbl>`;
const paras = (tag, n) => Array.from({ length: n }, (_, k) => p(r(`${tag} ${k + 1} Hxg`))).join('');
const D = (body) => buildDocx({ body, footers: { default: ftr }, sect: sectPr({}), defaults: docDefaults({ font: 'Arial', size: 11 }), media });
export const cases = [];
cases.push({ name: 'tbf-row-multi', docx: D(fill(48) + tbl([paras('celula', 8)]) + p(r('Depois Hxg'))) });
cases.push({ name: 'tbf-rows', docx: D(fill(48) + tbl(Array.from({ length: 8 }, (_, k) => p(r(`linha ${k + 1} Hxg`)))) + p(r('Depois Hxg'))) });
cases.push({ name: 'tbf-text', docx: D(fill(48) + paras('texto', 8) + p(r('Depois Hxg'))) });
