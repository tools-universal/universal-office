// Tabela ANINHADA cuja linha parte na quebra de página (dentro de uma linha da tabela de
// fora que também parte): onde começa o texto da continuação na página seguinte? Com e
// sem espaço antes/depois nos parágrafos da célula aninhada; Arial 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tc = (w, xml) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${xml}</w:tc>`;
const tbl = (cols, rows) => `<w:tbl><w:tblPr><w:tblW w:w="${cols.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid>${cols.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((cells) => `<w:tr>${cells.map((x, k) => tc(cols[k], x)).join('')}</w:tr>`).join('')}</w:tbl>`;
const fill = (n, tag = 'fora') => Array.from({ length: n }, (_, k) => p(r(`${tag} ${k + 1} Hxg`))).join('');
const long = (sp) => Array.from({ length: 12 }, (_, k) => p(r(`aninhada ${k + 1} Hxg`), sp)).join('');
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
for (const [name, sp] of [['ns-plain', ''], ['ns-space', '<w:spacing w:before="120" w:after="120"/>']]) {
  const inner = tbl([2000, 4000], [[p(r('rotulo Hxg')), long(sp)]]);
  cases.push({ name, docx: D(fill(40, 'antes') + tbl([8000], [[fill(4) + inner + fill(3, 'depois')]]) + p(r('Fim Hxg'))) });
}
// célula da esquerda com duas linhas curtas que cabem; na da direita, um parágrafo de 3
// linhas que não pode deixar só a 1ª (órfã) desce inteiro: a continuação começa nele, no
// topo — não na altura da última linha da esquerda (corpus t191)
{
  const sp30 = '<w:spacing w:before="30" w:after="30"/>', sp120 = '<w:spacing w:before="120" w:after="120"/>';
  const left = p(r('rotulo um Hxg'), sp30) + p(r('rotulo dois Hxg'), sp30);
  const right = p(r('cabeca Hxg'), sp120) + p(r('texto da direita que ocupa tres linhas inteiras nesta coluna estreita da tabela de dentro sem enfeite'), sp120);
  const inner = tbl([2000, 4000], [[left, right]]);
  cases.push({ name: 'ns-orphan', docx: D(fill(52, 'antes') + tbl([8000], [[inner + fill(3, 'depois')]]) + p(r('Fim Hxg'))) });
}
