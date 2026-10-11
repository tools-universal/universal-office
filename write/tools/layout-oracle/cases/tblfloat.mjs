// Tabela comum (não flutuante) diante de um flutuante com contorno: a tabela não
// contorna — desce para baixo dele? Flutuante do cabeçalho que invade o corpo
// (quadrado, atrás do texto ou não) e do corpo (âncora no parágrafo anterior);
// tabela de largura total × estreita que não cruza o objeto; modos 15 e 14.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const anchored = ({ wPt, hPt, offYtw, wrap = 'square', relV = 'paragraph', behind = false }) => {
  const cx = Math.round(wPt * 12700), cy = Math.round(hPt * 12700);
  const wrapEl = wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : wrap === 'tb' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${Math.round(offYtw * 635)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapEl}<wp:docPr id="5" name="obj"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (w) => `<w:tbl><w:tblPr><w:tblW w:w="${w}" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="${w / 2}"/><w:gridCol w:w="${w / 2}"/></w:tblGrid>`
  + [1, 2, 3].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w / 2}" w:type="dxa"/></w:tcPr>${p(r(`Linha ${k} Hxg`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="${w / 2}" w:type="dxa"/></w:tcPr>${p(r('Celula Hxg'))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const compat of [15, 14]) {
  const c = compat === 15 ? '' : '-c14';
  // cabeçalho: imagem à direita (120 x 110 pt) que desce ~40pt para dentro do corpo
  for (const behind of [false, true]) {
    const hdr = p(anchored({ wPt: 120, hPt: 110, offYtw: -700, behind }) + r('Cab Hxg'));
    const b = behind ? '-behind' : '';
    for (const [t, body] of [
      ['tbl', tbl(8500) + p(r('Depois Hxg'))],
      ['txt-tbl', p(r('Curto Hxg')) + tbl(8500) + p(r('Depois Hxg'))],
      ['narrow', tbl(4000) + p(r('Depois Hxg'))],
    ]) {
      cases.push({ name: `tf-hdr${b}-${t}${c}`, docx: buildDocx({ body, headers: { default: hdr }, sect: sectPr({ top: 1417, header: 708 }), defaults, media, compat }) });
    }
  }
  // corpo: imagem (120 x 80 pt) ancorada no parágrafo anterior à tabela
  for (const wrap of ['square', 'tb', 'none']) {
    const body = p(r('Antes Hxg')) + p(anchored({ wPt: 120, hPt: 80, offYtw: 0, wrap }) + r('Ancora Hxg')) + tbl(8500) + p(r('Depois Hxg'));
    cases.push({ name: `tf-body-${wrap}${c}`, docx: buildDocx({ body, defaults, media, compat }) });
  }
}
