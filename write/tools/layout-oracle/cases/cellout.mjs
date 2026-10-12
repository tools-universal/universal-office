// Caixa de texto ancorada num parágrafo de célula com layoutInCell="0" (desenho fora da
// célula): a posição horizontal relativa à coluna é a da COLUNA DA PÁGINA (margem) ou a da
// célula? E a vertical relativa ao parágrafo? Tabela com recuo (tblInd) e margem de célula
// grandes para separar as referências; modos de compatibilidade 15, 14 e 11; layoutInCell="1"
// de referência. (Corpus t70: formulário de .doc com moldura ancorada na 1ª célula.)
// Rótulos inventados; o teste compara o x das linhas (Δx).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const E = 12700;
const bdOf = (top = 4) => '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="${s === 'top' ? top : 4}" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const box = ({ lic, relH = 'column', relV = 'paragraph', x = 20, y = 30 }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251660000" behindDoc="0" locked="0" layoutInCell="${lic}" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="${relH}"><wp:posOffset>${x * E}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${y * E}</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${150 * E}" cy="${30 * E}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="7" name="caixa"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/>`
  + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${150 * E}" cy="${30 * E}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${p(r('Caixa Hxg'))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
/** tabela de 2 colunas com recuo de 40 pt e margem de célula de 15 pt; a caixa na 2ª célula
 *  (`r2`: numa 2ª linha; `p2`: no 2º parágrafo da célula) */
const tbl = (o) => {
  const cells = (a, b) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${a}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${b}</w:tc></w:tr>`;
  const withBox = o.p2 ? p(r('Celula Hxg')) + p(r('Segundo Hxg') + box(o)) + p('') + p('') : p(r('Celula Hxg') + box(o)) + p('') + p('') + p('');
  return `<w:tbl><w:tblPr><w:tblW w:w="7000" w:type="dxa"/><w:tblInd w:w="800" w:type="dxa"/>${bdOf(o.top)}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="300" w:type="dxa"/><w:right w:w="300" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + '<w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="4000"/></w:tblGrid>'
    + (o.r2 ? cells(p(r('Linha um Hxg')) + p(r('mais Hxg')), p(r('Vizinha Hxg'))) : '')
    + cells(p(r('Esquerda Hxg')), withBox) + '</w:tbl>';
};
const D = (o, compat) => buildDocx({ body: p(r('Antes Hxg')) + tbl(o) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }), compat });

export const cases = [];
for (const compat of [15, 14, 11]) {
  cases.push({ name: `co${compat}-out`, docx: D({ lic: 0 }, compat) });
  cases.push({ name: `co${compat}-in`, docx: D({ lic: 1 }, compat) });
  cases.push({ name: `co${compat}-out-mrg`, docx: D({ lic: 0, relH: 'margin' }, compat) });
}
// borda de cima de 3 pt: a referência vertical (parágrafo) muda com ela?
for (const lic of [0, 1]) cases.push({ name: `co14-${lic ? 'in' : 'out'}-b3`, docx: D({ lic, top: 24 }, 14) });
// relativa à página DENTRO da célula (modo 14): também conta do topo da célula
cases.push({ name: 'co14-in-pg', docx: D({ lic: 1, relV: 'page', y: 200 }, 14) });
// a caixa numa 2ª linha da tabela e no 2º parágrafo da célula
for (const lic of [0, 1]) {
  cases.push({ name: `co14-${lic ? 'in' : 'out'}-r2`, docx: D({ lic, r2: true }, 14) });
  cases.push({ name: `co14-${lic ? 'in' : 'out'}-p2`, docx: D({ lic, p2: true }, 14) });
}
