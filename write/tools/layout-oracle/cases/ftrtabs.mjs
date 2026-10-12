// Rodapé com logotipo de quebra "justa" (polígono, atrás do texto) ancorado num parágrafo
// vazio centralizado, dois vazios e o número de página depois de N tabulações (paradas:
// centro e direita no fim do texto; padrão 708) — corpus t20: as linhas ao lado do logotipo
// e o número de página. O rodapé cresce para cima a partir da distância do rodapé: a posição
// das linhas de cima mede a altura dele; o x do número, a distribuição das tabulações.
// Medido: na linha ao lado do logotipo que só tem tabs, a 2ª tab ainda fica (pendurada) e a
// seguinte desce; a linha só de tabs que não é a última tem a altura delas. Geometria,
// polígono e rótulos inventados; Arial.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const media = { 'image1.png': solidPng(20, 20, [200, 120, 60]) };
const E = 12700;
// octógono achatado: o fundo do contorno fica a 88% da altura
const POLY = [[3000, 0], [0, 5000], [0, 15000], [4000, 19000], [17600, 19000], [21600, 15000], [21600, 5000], [18600, 0], [3000, 0]];
const RECT = [[0, 0], [0, 21600], [21600, 21600], [21600, 0], [0, 0]];
const wrapOf = (kind) => kind === 'none' ? '<wp:wrapNone/>'
  : `<wp:wrapTight wrapText="bothSides"><wp:wrapPolygon edited="0">${(kind === 'rect' ? RECT : POLY).map(([x, y], i) => `<wp:${i ? 'lineTo' : 'start'} x="${x}" y="${y}"/>`).join('')}</wp:wrapPolygon></wp:wrapTight>`;
const logo = (kind, behind = 1) => {
  const cx = 170 * E, cy = 44 * E;
  return `<w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251666432" behindDoc="${behind}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${215 * E}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${8 * E}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapOf(kind)}<wp:docPr id="9" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="9" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
// largura do texto (A4, margens 1701): 8504 tw — centro na metade, direita no fim
const TABS = '<w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs>';
const PP = `${TABS}<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/></w:rPr>`;
const r16 = (t) => r(t, '<w:sz w:val="16"/>');
const tabOf = (sz) => `<w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:tab/></w:r>`;
const pageOf = (sz) => `<w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
const footer = ({ kind = 'poly', tabs = 6, behind = 1 }) => p(r16('Rodape linha um Hxg'), PP) + p(r16('linha dois Hxg'), PP) + p(logo(kind, behind), PP) + p('', PP) + p('', PP) + p(tabOf(20).repeat(tabs) + pageOf(20), PP);
const D = (o) => buildDocx({ body: p(r('Corpo Hxg')), footers: { default: footer(o) }, media, defaults: docDefaults({ font: 'Arial', size: 10 }) });
// no corpo: a linha que só tem tabulações (o texto foi para a linha seguinte) tem a altura
// das tabulações ou a da marca? Tabs de 20 pt, marca de 8 pt; mede o parágrafo seguinte
const B = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 10 }) });

export const cases = [
  { name: 'ft-body-tabs6', docx: B(p(tabOf(40).repeat(6) + pageOf(40), PP)) },
  { name: 'ft-body-tabs2', docx: B(p(tabOf(40).repeat(2) + pageOf(40), PP)) },
  { name: 'ft-body-tabsonly', docx: B(p(tabOf(40).repeat(6), PP)) },
  // tab grande no meio da linha, no começo dela e no fim de uma linha quebrada (não a última)
  { name: 'ft-body-midtab', docx: B(p(r('Texto') + tabOf(40) + r('Hxg'))) },
  { name: 'ft-body-tabfirst', docx: B(p(tabOf(40) + r('Hxg depois'))) },
  { name: 'ft-body-wraptab', docx: B(p(r('palavra '.repeat(11) + 'fim') + tabOf(40) + r('segunda linha Hxg'))) },
  // rodapé: polígono, retângulo, sem quebra, na frente do texto; 1 a 9 tabulações
  { name: 'ft-rect6', docx: D({ kind: 'rect' }) },
  { name: 'ft-none6', docx: D({ kind: 'none' }) },
  { name: 'ft-poly6-front', docx: D({ behind: 0 }) },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ name: `ft-poly${n}`, docx: D({ tabs: n }) })),
];
