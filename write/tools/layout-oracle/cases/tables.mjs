// Tabelas: como a espessura das bordas entra na altura da linha e no x do
// texto, margens de célula, alturas exatas/mínimas, conflito de bordas
// (tabela × célula) e modo de compatibilidade 14 × 15.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = (side, val, size, color = '000000') => `<w:${side} w:val="${val}" w:sz="${size}" w:space="0" w:color="${color}"/>`;
const borders = (val, size, sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) => `<w:tblBorders>${sides.map((s) => bd(s, val, size)).join('')}</w:tblBorders>`;
const cell = (w, text, tcPr = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${tcPr}</w:tcPr>${p(r(text))}</w:tc>`;
const table = ({ tblBorders = '', cellMar = '', rows = 3, cols = 2, trPr = '', text = (i, j) => `r${i}c${j} Hxg`, tcPr = () => '', layout = '' } = {}) => {
  const w = 3000;
  let x = `<w:tbl><w:tblPr><w:tblW w:w="${w * cols}" w:type="dxa"/>${tblBorders}${layout}${cellMar}<w:tblLook w:val="04A0" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid>${'<w:gridCol w:w="3000"/>'.repeat(cols)}</w:tblGrid>`;
  for (let i = 0; i < rows; i++) {
    x += `<w:tr>${trPr ? `<w:trPr>${trPr}</w:trPr>` : ''}`;
    for (let j = 0; j < cols; j++) x += cell(w, text(i, j), tcPr(i, j));
    x += '</w:tr>';
  }
  return x + '</w:tbl>';
};
const sep = (t) => p(r(t));

export const cases = [];
for (const compat of [15, 14]) {
  // espessuras de borda simples: 0 (nenhuma), 4, 12, 24 (oitavos de ponto)
  let body = sep('Inicio Hxg');
  for (const size of [0, 4, 12, 24]) {
    body += table({ tblBorders: size ? borders('single', size) : '' }) + sep(`depois ${size} Hxg`);
  }
  cases.push({ name: `tb-borders-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });

  // estilos de borda: double, thick, dotted; só horizontais; só externas
  body = sep('Inicio Hxg')
    + table({ tblBorders: borders('double', 4) }) + sep('apos double4 Hxg')
    + table({ tblBorders: borders('double', 12) }) + sep('apos double12 Hxg')
    + table({ tblBorders: borders('thick', 12) }) + sep('apos thick12 Hxg')
    + table({ tblBorders: borders('single', 18, ['top', 'bottom', 'insideH']) }) + sep('apos so horizontais Hxg')
    + table({ tblBorders: borders('single', 18, ['top', 'left', 'bottom', 'right']) }) + sep('apos so externas Hxg');
  cases.push({ name: `tb-styles-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });

  // conflito tabela × célula: borda de célula mais grossa numa linha / coluna
  body = sep('Inicio Hxg')
    + table({ tblBorders: borders('single', 4), rows: 4, cols: 3, tcPr: (i, j) => (i === 1 ? `<w:tcBorders>${bd('bottom', 'single', 24)}</w:tcBorders>` : j === 1 ? `<w:tcBorders>${bd('left', 'single', 24)}${bd('top', 'nil', 0)}</w:tcBorders>` : '') })
    + sep('apos conflito Hxg');
  cases.push({ name: `tb-conflict-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// margens de célula e alturas de linha
{
  let body = sep('Inicio Hxg');
  body += table({ tblBorders: borders('single', 4), cellMar: '<w:tblCellMar><w:top w:w="113" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="170" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar>' }) + sep('apos margens Hxg');
  body += table({ tblBorders: borders('single', 4), trPr: '<w:trHeight w:val="600" w:hRule="exact"/>' }) + sep('apos exata Hxg');
  body += table({ tblBorders: borders('single', 12), trPr: '<w:trHeight w:val="600"/>' }) + sep('apos minima Hxg');
  body += table({ tblBorders: borders('single', 4), trPr: '<w:trHeight w:val="200"/>', text: (i, j) => (j === 0 ? `linha ${i} com texto bem mais comprido que quebra em varias linhas Hxg` : 'curto Hxg') }) + sep('apos minima pequena Hxg');
  cases.push({ name: 'tb-cellmar', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
// texto com espaçamento antes/depois dentro de células e parágrafos múltiplos
{
  const body = sep('Inicio Hxg')
    + `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${borders('single', 8)}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`
    + `<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('antes 6pt Hxg'), '<w:spacing w:before="120" w:after="0"/>')}${p(r('depois 12pt Hxg'), '<w:spacing w:before="0" w:after="240"/>')}</w:tc>`
    + `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('linha unica Hxg'))}</w:tc></w:tr>`
    + `<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(r('auto Hxg'), '<w:spacing w:beforeAutospacing="1" w:afterAutospacing="1"/>')}</w:tc>`
    + `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(r('centro Hxg'))}</w:tc></w:tr></w:tbl>`
    + sep('Fim Hxg');
  cases.push({ name: 'tb-spacing', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 }) }) });
}
// alinhamento vertical de célula: parágrafo vazio no fim conta na altura?
{
  const tc = (paras, va = 'center') => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="${va}"/></w:tcPr>${paras}</w:tc>`;
  const row = (h) => `<w:tr><w:trPr><w:trHeight w:val="${h}"/></w:trPr>`
    + tc(p(r('dois Hxg')) + p(r('paras Hxg')))
    + tc(p(r('texto Hxg')) + p(''))
    + tc(p(r('um Hxg')))
    + tc(p(r('baixo Hxg')), 'bottom')
    + '</w:tr>';
  const body = sep('Inicio Hxg')
    + `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${borders('single', 4)}</w:tblPr><w:tblGrid>${'<w:gridCol w:w="2000"/>'.repeat(4)}</w:tblGrid>${row(531)}${row(1200)}</w:tbl>`
    + sep('Fim Hxg');
  for (const compat of [15, 11]) cases.push({ name: `tb-valign-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 8 }) }) });
}
