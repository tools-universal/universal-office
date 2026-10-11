// Tabela FLUTUANTE que parte na página com célula mesclada na vertical atravessando
// a quebra: o texto da mescla flui pelas partes como na tabela do fluxo (oráculo
// vmsplit)? Âncora relativa ao texto e à página; alinhamento topo e centro.
// Arial 11: 12,65 pt por linha.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const tc = (xml, vm = '', extra = '') => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/>${vm === 'r' ? '<w:vMerge w:val="restart"/>' : vm === 'c' ? '<w:vMerge/>' : ''}${extra}</w:tcPr>${xml}</w:tc>`;
const merged = (n) => Array.from({ length: n }, (_, k) => p(r(`mescla ${k + 1} Hxg`))).join('');
const fpText = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="199"/>';
const fpPage = (y) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="page" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${y}"/>`;
const tbl = (fp, n, rows, extra = '', w2 = 3000) => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="${3000 + w2}" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="${w2}"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr>${tc(k ? p('') : merged(n), k ? 'c' : 'r', extra)}${tc(p(r(`linha ${k + 1} Hxg`))).replace('w:w="3000"', `w:w="${w2}"`)}</w:tr>`).join('')
  + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });

export const cases = [];
// âncora no texto: 50 linhas de enchimento antes, a tabela parte depois de 2–3 linhas
cases.push({ name: 'ftvm-text-top', docx: D(filler(50) + tbl(fpText, 6, 5) + p(r('Ancora Hxg')) + p(r('Fim Hxg'))) });
cases.push({ name: 'ftvm-text-center', docx: D(filler(50) + tbl(fpText, 6, 5, '<w:vAlign w:val="center"/>') + p(r('Ancora Hxg')) + p(r('Fim Hxg'))) });
// âncora na página (posição fixa perto do pé)
cases.push({ name: 'ftvm-page-top', docx: D(filler(3) + tbl(fpPage(14400), 6, 5) + p(r('Ancora Hxg')) + p(r('Fim Hxg'))) });
cases.push({ name: 'ftvm-page-fit', docx: D(filler(3) + tbl(fpPage(14400), 2, 5) + p(r('Ancora Hxg')) + p(r('Fim Hxg'))) });
// tabela de largura total: a âncora (com "antes" de 12pt) vai para a página da
// continuação e fica abaixo dela — com o "antes"?
const anc = p(r('Ancora Hxg'), '<w:spacing w:before="240"/>');
cases.push({ name: 'ftvm-page-wide-before', docx: D(filler(3) + tbl(fpPage(14400), 6, 5, '', 5500) + anc + p(r('Fim Hxg'))) });
cases.push({ name: 'ftvm-text-wide-before', docx: D(filler(50) + tbl(fpText, 6, 5, '', 5500) + anc + p(r('Fim Hxg'))) });
