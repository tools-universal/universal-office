// Tabela flutuante (âncora texto, tblpY positivo) que não cabe no pé da página e
// continua na seguinte: onde fica o parágrafo âncora — acima dela na 1ª página
// (a linha cabe entre o texto e a tabela) ou depois do fim dela, na página seguinte?
// Controles: a mesma tabela inteira na página; tabela estreita (texto ao lado).
// Arial 11: 12,65 pt por linha, 55 linhas na página A4.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const fp = (y) => `<w:tblpPr w:leftFromText="180" w:rightFromText="180" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="${y}"/>`;
/** tabela flutuante de `rows` linhas com 2 parágrafos cada */
const ftbl = (y, rows, w = 8500) => `<w:tbl><w:tblPr>${fp(y)}<w:tblW w:w="${w}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(`celula ${k + 1} Hxg`))}${p(r(`segue ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
for (const [anchor, tag] of [[p(''), 'empty'], [p(r('ancora Hxg')), 'text']]) {
  // 44 linhas de enchimento: a tabela (8 linhas = 16 linhas de texto) passa do pé da página
  cases.push({ name: `fts-split-${tag}`, docx: D(filler(44) + ftbl(435, 8) + anchor + p(r('Depois Hxg'))) });
  // controle: a mesma tabela cabe inteira
  cases.push({ name: `fts-fit-${tag}`, docx: D(filler(20) + ftbl(435, 8) + anchor + p(r('Depois Hxg'))) });
  // deslocamento 0 (a âncora cruza a tabela)
  cases.push({ name: `fts-split0-${tag}`, docx: D(filler(44) + ftbl(0, 8) + anchor + p(r('Depois Hxg'))) });
}
// tabela estreita que parte: o texto da âncora contorna a tabela?
cases.push({ name: 'fts-split-narrow', docx: D(filler(44) + ftbl(435, 8, 3000) + p(r('ancora Hxg')) + p(r('Depois Hxg'))) });
