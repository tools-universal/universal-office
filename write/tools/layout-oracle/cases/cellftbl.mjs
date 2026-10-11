// Tabela FLUTUANTE (w:tblpPr) aninhada numa célula: onde fica (âncora no texto =
// parágrafo seguinte, margem = célula?), o texto da célula a contorna, a célula
// cresce? Variações de âncora horizontal/vertical e de deslocamento.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const inner = (tblpPr) => `<w:tbl><w:tblPr>${tblpPr}<w:tblW w:w="3600" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/></w:tblGrid>`
  + [1, 2, 3].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr>${p(r(`Int ${k} Hxg`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr>${p(r('Val Hxg'))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const outer = (cell) => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="9000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="9000" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
const fp = (attrs) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" ${attrs}/>`;
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const [tag, attrs] of [
  ['text-margin-right-425', 'w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="right" w:tblpY="425"'],
  ['text-margin-left-0', 'w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="left" w:tblpY="0"'],
  ['text-text-x500-200', 'w:vertAnchor="text" w:horzAnchor="text" w:tblpX="500" w:tblpY="200"'],
  ['text-page-x5000-300', 'w:vertAnchor="text" w:horzAnchor="page" w:tblpX="5000" w:tblpY="300"'],
]) {
  // (x500-200 com âncora vazia: o "Fim" fica 0,9pt acima do nosso e o PDF o junta à
  // 1ª linha da tabela — fora até medir à parte)
  for (const anchorText of tag === 'text-text-x500-200' ? [true] : [true, false]) {
    const cell = p(r('Antes na celula Hxg')) + inner(fp(attrs)) + p(anchorText ? r(lorem(70, 4)) : '') + p(r('Fim da celula Hxg'));
    cases.push({ name: `cft-${tag}${anchorText ? '' : '-empty'}`, docx: buildDocx({ body: p(r('Antes Hxg')) + outer(cell) + p(r('Depois Hxg')), defaults }) });
  }
}
