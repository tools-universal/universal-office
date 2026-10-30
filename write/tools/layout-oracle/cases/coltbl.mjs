// Tabela que passa de uma coluna para outra: as linhas da continuação ficam no x da coluna
// NOVA (da 2ª coluna para a 1ª da página seguinte, e da 1ª para a 2ª). Calibri 11.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pg = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const sect = `<w:sectPr>${pg}<w:cols w:num="2" w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
const defaults = docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 });
const many = (n, words, seed) => Array.from({ length: n }, (_, k) => p(r(lorem(words, seed + k)))).join('');
const BD = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('') + '</w:tblBorders>';
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${BD}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="2400"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>${p(r(`Linha ${k + 1}`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${p(r(lorem(8, k + 7)))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const doc = (body) => buildDocx({ body, sect, defaults });

export const cases = [
  // começa na 2ª coluna da página 1 e continua na 1ª da página 2
  { name: 'ct-c2-next', docx: doc(many(4, 60, 1) + tbl(18) + many(4, 60, 30)) },
  // começa na 1ª coluna e continua na 2ª
  { name: 'ct-c1-c2', docx: doc(many(1, 40, 1) + tbl(30) + many(2, 60, 30)) },
];
