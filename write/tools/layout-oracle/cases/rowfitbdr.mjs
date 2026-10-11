// Linha de tabela que termina rente ao pé do corpo: a borda inferior desenhada na
// quebra (0,5 pt) conta para caber? Espaçador de altura exata variando de 4 em 4
// twips; 20 linhas de altura mínima 600 tw, uma coluna; com bordas simples e sem.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bdr = (on) => on ? '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>' : '';
const tbl = (on, n = 20) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/>${bdr(on)}<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
  + Array.from({ length: n }, (_, k) => `<w:tr><w:trPr><w:trHeight w:val="600"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r(`Linha ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
for (const on of [true, false]) {
  for (let L = 1770; L <= 1830; L += 4) {
    const spacer = p(r('Espaco Hxg'), `<w:spacing w:line="${L}" w:lineRule="exact"/>`);
    cases.push({ name: `rfb-${on ? 'b' : 'n'}-${L}`, docx: buildDocx({ body: spacer + tbl(on) + p(r('Depois Hxg')), defaults }) });
  }
}
// a mesma linha no MEIO da tabela (30 linhas): a borda desenhada na quebra conta?
for (let L = 1770; L <= 1830; L += 4) {
  const spacer = p(r('Espaco Hxg'), `<w:spacing w:line="${L}" w:lineRule="exact"/>`);
  cases.push({ name: `rfb-m-${L}`, docx: buildDocx({ body: spacer + tbl(true, 30) + p(r('Depois Hxg')), defaults }) });
}
