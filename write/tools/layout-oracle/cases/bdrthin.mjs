// Borda de célula fina (w:sz 1, 2, 3 = 1/8, 2/8, 3/8 pt): quanto a divisa ocupa entre as
// linhas da tabela? 12 linhas de uma linha de texto, margens de célula 0; Arial 10.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const tcB = (sz) => '<w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="CCCCCC"/>`).join('') + '</w:tcBorders>';
const tbl = (sz) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>`
  + Array.from({ length: 12 }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/>${tcB(sz)}</w:tcPr>${p(r(`linha ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 10 }) });
export const cases = [];
for (const sz of [1, 2, 3, 4]) cases.push({ name: `bt-sz${sz}`, docx: D(p(r('Antes Hxg')) + tbl(sz) + p(r('Fim Hxg'))) });
