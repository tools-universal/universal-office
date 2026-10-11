// "Manter com o próximo": o espaço DEPOIS do título (colapsado com o "antes" do
// seguinte, e zerado pelo espaçamento contextual) conta para saber se a 1ª linha
// do seguinte cabe na página? Arial 11: 12,65 pt por linha, 55 linhas na página A4
// (sobram 0,45 pt); depois de 53 linhas de enchimento sobram 29,75 pt.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');
const KN = '<w:keepNext/>';
const sp = (b, a) => `<w:spacing w:before="${b}" w:after="${a}"/>`;
const tbl = (cell) => `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
const styles = '<w:style w:type="paragraph" w:styleId="Corpo"><w:name w:val="Corpo"/><w:pPr><w:contextualSpacing/></w:pPr></w:style>';

export const cases = [];
for (const compat of [14, 15]) {
  const D = (body) => buildDocx({ body, compat, styles, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const s = compat === 15 ? '' : `-c${compat}`;
  // o seguinte tem UMA linha (sem a exigência de viúvas/órfãs)
  cases.push({ name: `kg-after240${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN + sp(0, 240)) + p(r('uma linha Hxg')) + filler(2)) });
  cases.push({ name: `kg-after60${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN + sp(0, 60)) + p(r('uma linha Hxg')) + filler(2)) });
  cases.push({ name: `kg-before240${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN) + p(r('uma linha Hxg'), sp(240, 0)) + filler(2)) });
  // título e seguinte no mesmo estilo com espaçamento contextual: o "depois" some
  cases.push({ name: `kg-ctx${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), `<w:pStyle w:val="Corpo"/>${KN}${sp(0, 240)}`) + p(r('uma linha Hxg'), '<w:pStyle w:val="Corpo"/>') + filler(2)) });
  // título antes de tabela
  cases.push({ name: `kg-table${s}`, docx: D(filler(53) + p(r('Titulo Hxg'), KN + sp(0, 240)) + tbl(p(r('celula Hxg'))) + filler(2)) });
}
