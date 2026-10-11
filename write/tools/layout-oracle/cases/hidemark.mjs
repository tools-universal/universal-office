// hideMark com conteúdo: célula "texto + parágrafo vazio" (a marca de fim de
// célula é a do ÚLTIMO parágrafo). O parágrafo vazio final conta na altura da
// linha? E no alinhamento vertical (vAlign center/bottom) da célula?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tc = (content, tcPr = '') => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/>${tcPr}</w:tcPr>${content}</w:tc>`;
const tbl = (cells) => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid>${'<w:gridCol w:w="3000"/>'.repeat(cells.length)}</w:tblGrid><w:tr>${cells.join('')}</w:tr></w:tbl>`;
const A = p(r('Antes Hxg')), D = p(r('Depois Hxg'));
const two = p(r('Linha um')) + p(r('Linha dois'));
const three = two + p(r('Linha tres'));
export const cases = [];
for (const [name, body] of [
  // célula alta ao lado (2 linhas); a célula testada: texto + vazio, centralizada
  ['hm-center-2', tbl([tc(two), tc(p(r('Centro Hxg')) + p(''), '<w:vAlign w:val="center"/><w:hideMark/>')])],
  ['hm-center-2-ctl', tbl([tc(two), tc(p(r('Centro Hxg')) + p(''), '<w:vAlign w:val="center"/>')])],
  ['hm-bottom-3', tbl([tc(three), tc(p(r('Baixo Hxg')) + p(''), '<w:vAlign w:val="bottom"/><w:hideMark/>')])],
  ['hm-center-3', tbl([tc(three), tc(p(r('Centro Hxg')) + p(''), '<w:vAlign w:val="center"/><w:hideMark/>')])],
  // a célula testada é a mais alta: o vazio final define a altura da linha?
  ['hm-tallest', tbl([tc(p(r('Uma Hxg'))), tc(p(r('Texto Hxg')) + p('') + p(''), '<w:hideMark/>')])],
  ['hm-tallest-ctl', tbl([tc(p(r('Uma Hxg'))), tc(p(r('Texto Hxg')) + p('') + p(''))])],
  // vazio no MEIO (não é a marca da célula)
  ['hm-mid-empty', tbl([tc(p(r('Uma Hxg'))), tc(p(r('Texto Hxg')) + p('') + p(r('Fim Hxg')), '<w:hideMark/>')])],
]) {
  cases.push({ name, docx: buildDocx({ body: A + body + D, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
