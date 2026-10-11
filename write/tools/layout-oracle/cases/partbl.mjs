// Parágrafo com entrelinha 1,5 logo antes de uma tabela: o vão até a tabela —
// no topo da página (empurrado por keepNext) e no meio; com/sem keepNext, com/sem
// numeração. Corpo 12 com estilo de título (keepNext/keepLines).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (n) => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>`
  + Array.from({ length: n }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>${p(r(`Celula ${k} Hxg`), '<w:spacing w:line="360" w:lineRule="auto"/>')}</w:tc><w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>${p(r('Outra Hxg'))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const numbering = `<w:abstractNum w:abstractNumId="0"><w:nsid w:val="1A2B3C4D"/><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="8"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`;
const styles = `<w:style w:type="paragraph" w:styleId="Tit2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="40"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:sz w:val="26"/></w:rPr></w:style>`;
const head = (num, keep) => p(r('Cronograma Hxg', '<w:sz w:val="24"/>'), `<w:pStyle w:val="${keep ? 'Tit2' : 'Normal'}"/>${num ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}<w:spacing w:before="0" w:line="360" w:lineRule="auto"/>`);
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const num of [false, true]) {
  for (const keep of [false, true]) {
    const t = `${num ? 'n' : 'x'}${keep ? 'k' : 'x'}`;
    // meio da página
    cases.push({ name: `pt-mid-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + head(num, keep) + tbl(3) + p(r('Depois Hxg')), defaults, styles, numbering }) });
    // topo da página (quebra de página antes)
    cases.push({ name: `pt-top-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Pagina Hxg') + '<w:r><w:br w:type="page"/></w:r>') + head(num, keep) + tbl(3) + p(r('Depois Hxg')), defaults, styles, numbering }) });
  }
}
// empurrado para a página seguinte por keepNext (texto enchendo a página)
for (const n of [44, 46, 48]) {
  const f = Array.from({ length: n }, (_, k) => p(r(`Linha ${k + 1} Hxg`))).join('');
  cases.push({ name: `pt-push-${n}`, docx: buildDocx({ body: f + head(true, true) + tbl(3) + p(r('Depois Hxg')), defaults, styles, numbering }) });
}
