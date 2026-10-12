// Caixa de texto ANCORADA DENTRO de uma célula (layoutInCell): o texto da célula a
// contorna (quadrado, superior e inferior, nenhuma)? Posição horizontal relativa à
// célula (coluna, margem direita). Tabela automática: a coluna alarga para caber uma
// caixa que se ajusta ao texto (wrap=none + spAutoFit)? Modos 15 e 14.
// (corpus t15/t43: selo de classificação no rodapé.) Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = 12700;
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const WRAP = { square: '<wp:wrapSquare wrapText="bothSides"/>', tb: '<wp:wrapTopAndBottom/>', none: '<wp:wrapNone/>' };
/** caixa ancorada: largura/altura (pt), quebra, referência horizontal, texto, autoajuste */
const box = ({ w = 80, h = 30, wrap = 'square', relH = 'column', text = 'Caixa Hxg', fit = false }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251660000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="${relH}"><wp:align>right</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${w * E}" cy="${h * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${WRAP[wrap]}<wp:docPr id="7" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/>`
  + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w * E}" cy="${h * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${p(r(text))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="${fit ? 'none' : 'square'}" lIns="0" tIns="0" rIns="${fit ? 63500 : 0}" bIns="0" anchor="t" anchorCtr="0">${fit ? '<a:spAutoFit/>' : '<a:noAutofit/>'}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const TEXT = 'Texto inventado da celula que quebra em varias linhas ao lado da caixa ancorada nela mesma';
/** tabela de duas colunas; fixa (larguras dadas) ou automática (grade pequena) */
const tbl = (cell1, { auto = false, pct = false } = {}) => `<w:tbl><w:tblPr><w:tblW w:w="${pct ? 5000 : auto ? 0 : 8000}" w:type="${pct ? 'pct' : auto ? 'auto' : 'dxa'}"/>${bd}${auto || pct ? '' : '<w:tblLayout w:type="fixed"/>'}</w:tblPr>`
  + `<w:tblGrid><w:gridCol w:w="${auto || pct ? 900 : 4000}"/><w:gridCol w:w="${auto || pct ? 7000 : 4000}"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="${auto || pct ? 900 : 4000}" w:type="dxa"/></w:tcPr>${cell1}</w:tc><w:tc><w:tcPr><w:tcW w:w="${auto || pct ? 7000 : 4000}" w:type="dxa"/></w:tcPr>${p(r('Outra coluna Hxg'))}</w:tc></w:tr></w:tbl>`;

export const cases = [];
for (const compat of [15, 14]) {
  const D = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const add = (name, body) => cases.push({ name: `cw-${name}-c${compat}`, docx: D(body) });
  add('square', tbl(p(box({}) + r(TEXT))));
  add('square-rmargin', tbl(p(box({ relH: 'rightMargin' }) + r(TEXT))));
  add('tb', tbl(p(box({ wrap: 'tb' }) + r(TEXT))));
  add('none', tbl(p(box({ wrap: 'none' }) + r(TEXT))));
  // caixa que se ajusta ao texto (mais largo que a extensão) na 1ª coluna estreita
  add('auto-fit-square', tbl(p(box({ w: 35, h: 35, fit: true, relH: 'rightMargin', text: 'Selo de classificacao inventado' }) + r('Codigo')), { auto: true }));
  add('auto-fit-none', tbl(p(box({ w: 35, h: 35, fit: true, wrap: 'none', relH: 'rightMargin', text: 'Selo de classificacao inventado' }) + r('Codigo')), { auto: true }));
  add('pct-fit-square', tbl(p(box({ w: 35, h: 35, fit: true, relH: 'rightMargin', text: 'Selo de classificacao inventado' }) + r('Codigo')), { pct: true }));
  // caixa fixa larga (sem autoajuste) na coluna estreita automática
  add('auto-wide-square', tbl(p(box({ w: 150, h: 20 }) + r('Codigo')), { auto: true }));
  // linha alta (mínima 60 pt) com a célula centralizada/embaixo: o objeto ancorado (40 pt)
  // conta na altura do conteúdo que é centralizado? (corpus t15/t119: logotipo no cabeçalho)
  const tall = (cell1, vAlign) => tbl(cell1).replace('<w:tr>', '<w:tr><w:trPr><w:trHeight w:val="1200"/></w:trPr>').replace('<w:tcW w:w="4000" w:type="dxa"/></w:tcPr>', `<w:tcW w:w="4000" w:type="dxa"/><w:vAlign w:val="${vAlign}"/></w:tcPr>`);
  add('vc-none', tall(p(box({ wrap: 'none', w: 60, h: 40 }) + r('Meio Hxg')), 'center'));
  add('vc-square', tall(p(box({ w: 60, h: 40 }) + r('Meio Hxg')), 'center'));
  add('vb-none', tall(p(box({ wrap: 'none', w: 60, h: 40 }) + r('Base Hxg')), 'bottom'));
  // sem altura mínima: a linha cresce até o fim do objeto (40 pt)?
  add('grow-none', tbl(p(box({ wrap: 'none', w: 60, h: 40 }) + r('Curta Hxg'))));
  add('grow-square', tbl(p(box({ w: 60, h: 40 }) + r('Curta Hxg'))));
}
