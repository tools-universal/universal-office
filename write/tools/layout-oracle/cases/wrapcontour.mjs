// Contorno justo/através com polígono NÃO retangular (losango, círculo do Word,
// triângulo, U): o texto segue o contorno linha a linha? Como Justo × Através
// tratam a concavidade (U aberto para cima)? E os lados (ambos, esquerda,
// direita, maior)? A imagem é sólida (o que vale é o polígono do arquivo).
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const poly = (pts) => `<wp:wrapPolygon edited="1"><wp:start x="${pts[0][0]}" y="${pts[0][1]}"/>${pts.slice(1).concat([pts[0]]).map(([x, y]) => `<wp:lineTo x="${x}" y="${y}"/>`).join('')}</wp:wrapPolygon>`;
const S = 21600, H = S / 2;
const SHAPES = {
  diamond: [[H, 0], [0, H], [H, S], [S, H]],
  tri: [[0, 0], [0, S], [S, S]],
  // o polígono que o Word gerou para um círculo (alpha.png, image-lab alpha-tight)
  circle: [[8775, 1575], [6975, 2475], [3150, 4950], [1575, 9000], [1800, 12825], [3600, 16425], [3600, 16875], [7875, 19350], [8775, 19800], [12600, 19800], [13500, 19350], [17775, 16875], [19575, 12825], [19800, 9225], [18450, 5850], [18450, 4950], [14400, 2475], [12600, 1575]],
  // U aberto para cima: concavidade de 30%..70% em x, de 0 a 70% em y
  u: [[0, 0], [0, S], [S, S], [S, 0], [Math.round(S * 0.7), 0], [Math.round(S * 0.7), Math.round(S * 0.7)], [Math.round(S * 0.3), Math.round(S * 0.7)], [Math.round(S * 0.3), 0]],
};
const pic = (kind, shape, { align, wrapText = 'bothSides', dist = 0, w = 120, h = 120 } = {}) => {
  const cx = w * 12700, cy = h * 12700;
  const posH = align ? `<wp:align>${align}</wp:align>` : '<wp:posOffset>0</wp:posOffset>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="${dist}" distR="${dist}" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column">${posH}</wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:${kind} wrapText="${wrapText}">${poly(SHAPES[shape])}</wp:${kind}><wp:docPr id="5" name="obj"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="5" name="obj"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
const defaults = docDefaults({ font: 'Arial', size: 11 });
const doc = (run) => buildDocx({ body: p(r('Antes Hxg')) + p(run + r(lorem(140, 7))) + p(r('Depois Hxg')), defaults, media });
export const cases = [];
for (const shape of Object.keys(SHAPES)) {
  for (const kind of ['wrapTight', 'wrapThrough']) {
    const k = kind === 'wrapTight' ? 'tight' : 'through';
    cases.push({ name: `ct-${shape}-${k}-left`, docx: doc(pic(kind, shape)) });
    cases.push({ name: `ct-${shape}-${k}-center`, docx: doc(pic(kind, shape, { align: 'center' })) });
  }
  cases.push({ name: `ct-${shape}-tight-right`, docx: doc(pic('wrapTight', shape, { align: 'right' })) });
}
for (const wt of ['left', 'right', 'largest']) cases.push({ name: `ct-diamond-tight-center-${wt}`, docx: doc(pic('wrapTight', 'diamond', { align: 'center', wrapText: wt })) });
cases.push({ name: 'ct-diamond-tight-left-dist', docx: doc(pic('wrapTight', 'diamond', { dist: 228600 })) });
cases.push({ name: 'ct-circle-tight-center-small', docx: doc(pic('wrapTight', 'circle', { align: 'center', w: 60, h: 60 })) });
