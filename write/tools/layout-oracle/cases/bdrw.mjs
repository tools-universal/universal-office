// Espessura e posição das bordas no PDF do Word: parágrafo (top/bottom de uma
// caixa com laterais) e célula de tabela, para vários w:sz, em single, double,
// thick, dotted e dashed. O Word grava as bordas sólidas como RETÂNGULOS
// preenchidos com a espessura quantizada — o oráculo mede retângulo × traço.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const SZ = [2, 4, 6, 8, 12, 18, 24, 36, 48];
const b = (side, val, sz, space = 2) => `<w:${side} w:val="${val}" w:sz="${sz}" w:space="${space}" w:color="000000"/>`;
export const cases = [];
for (const val of ['single', 'double', 'thick', 'dotted', 'dashed']) {
  let body = p(r('Antes Hxg'));
  for (const sz of SZ) {
    body += p(r(`${val} ${sz} Hxg`), `<w:pBdr>${b('top', val, sz)}${b('left', val, sz, 4)}${b('bottom', val, sz)}${b('right', val, sz, 4)}</w:pBdr><w:spacing w:after="240"/>`);
  }
  cases.push({ name: `bdrw-p-${val}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
  // tabela: uma linha por tamanho, borda em todos os lados da célula
  let rows = '';
  for (const sz of SZ) {
    const tcb = `<w:tcBorders>${['top', 'left', 'bottom', 'right'].map((s) => b(s, val, sz, 0)).join('')}</w:tcBorders>`;
    rows += `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/>${tcb}</w:tcPr>${p(r(`${val} ${sz} Hxg`))}</w:tc></w:tr>`;
    rows += `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r('vao Hxg'))}</w:tc></w:tr>`;
  }
  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>${rows}</w:tbl>`;
  cases.push({ name: `bdrw-t-${val}`, docx: buildDocx({ body: p(r('Antes Hxg')) + tbl + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
