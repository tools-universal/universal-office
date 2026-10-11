// Autoajuste com larguras preferidas (tcW) que SOMAM MAIS que o espaço: qual
// coluna encolhe? Tabela de topo e aninhada numa célula; conteúdo curto/longo.
// Linha 1: rótulo por célula em degraus (o x dá a borda do texto da célula);
// linha 2: conteúdo.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const bdr = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
function tbl({ t, grid, tcW, content }) {
  const row1 = grid.map((g, k) => `<w:tc><w:tcPr><w:tcW w:w="${tcW[k]}" w:type="dxa"/></w:tcPr>${p('').repeat(k)}${p(r(`${t}c${k + 1}`))}</w:tc>`).join('');
  const row2 = grid.map((g, k) => `<w:tc><w:tcPr><w:tcW w:w="${tcW[k]}" w:type="dxa"/></w:tcPr>${p(r(content[k]))}</w:tc>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${bdr}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid><w:tr>${row1}</w:tr><w:tr>${row2}</w:tr></w:tbl>`;
}
const L = (n, s) => lorem(n, s);
const sets = [
  ['o1', [2169, 6099], [2285, 6549], ['PERIODO DE EXERCICIO', L(60, 1)]],
  ['o2', [2169, 6099], [2285, 6549], ['Curto', 'Texto curto']],
  ['o3', [3000, 7000], [3000, 7000], [L(30, 2), L(60, 3)]],
  ['o4', [4252, 4252], [5000, 5000], [L(40, 4), L(40, 5)]],
  ['o5', [2000, 3000, 5000], [2000, 3000, 5000], ['Um', 'Dois tres', L(60, 6)]],
  ['o6', [2169, 6099], [2600, 6549], ['PERIODO DE EXERCICIO', L(60, 7)]],
  ['o7', [2169, 6099], [2285, 6549], [L(20, 8), L(60, 9)]],
];
// célula com uma tabela ANINHADA de largura preferida grande (formulário de contrato)
const inner = (w, g, n) => `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="${g}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(lorem(n, 12)))}</w:tc></w:tr></w:tbl>`;
function tblIn({ t, grid, tcW, inW, inG }) {
  const row = `<w:tc><w:tcPr><w:tcW w:w="${tcW[0]}" w:type="dxa"/></w:tcPr>${p(r('PERIODO DE EXERCICIO'), '<w:jc w:val="center"/>')}${p(r('Clausula 3.1'), '<w:jc w:val="center"/>')}</w:tc>`
    + `<w:tc><w:tcPr><w:tcW w:w="${tcW[1]}" w:type="dxa"/></w:tcPr>${p(r(`${t} Inicio em NUMERO (NUMERO POR EXTENSO)`))}${inner(inW, inG, 40)}${p('')}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${bdr}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid><w:tr>${row}</w:tr></w:tbl>`;
}
const defaults = docDefaults({ font: 'Arial', size: 8 });
export const cases = [];
for (const [t, grid, tcW, content] of sets) {
  cases.push({ name: `tov-top-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + tbl({ t, grid, tcW, content }) + p(r('Depois Hxg')), defaults }) });
  // aninhada: célula única da largura do texto
  const outer = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="8504"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="8504" w:type="dxa"/></w:tcPr>${p(r('Externa Hxg'))}${tbl({ t, grid, tcW, content })}${p('')}</w:tc></w:tr></w:tbl>`;
  cases.push({ name: `tov-nest-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + outer + p(r('Depois Hxg')), defaults }) });
}
for (const [t, inW, inG] of [['n1', 6323, 5873], ['n2', 5000, 5000], ['n3', 8000, 6000]]) {
  const tb = tblIn({ t, grid: [2169, 6099], tcW: [2285, 6549], inW, inG });
  cases.push({ name: `tov-in-top-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + tb + p(r('Depois Hxg')), defaults }) });
  const outer = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${bdr}</w:tblPr><w:tblGrid><w:gridCol w:w="8504"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="8504" w:type="dxa"/></w:tcPr>${p(r('Externa Hxg'))}${tb}${p('')}</w:tc></w:tr></w:tbl>`;
  cases.push({ name: `tov-in-nest-${t}`, docx: buildDocx({ body: p(r('Antes Hxg')) + outer + p(r('Depois Hxg')), defaults }) });
}
