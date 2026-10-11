// Tabela flutuante com posição relativa à PÁGINA (vertAnchor page, tblpY fixo) cujo
// parágrafo âncora vem DEPOIS de texto que ocupa a área onde ela cai na página: o
// texto anterior contorna a tabela (desce para baixo dela) na mesma página, ou a
// tabela (com a âncora) vai para a página seguinte? Tabela baixa e alta, e a âncora
// no fim da página. Arial 11; largura total.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n, tag = 'texto') => Array.from({ length: n }, (_, k) => p(r(`${tag} ${k + 1} Hxg`))).join('');
const fp = (y) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="page" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${y}"/>`;
const ftbl = (y, rows) => `<w:tbl><w:tblPr>${fp(y)}<w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="8000"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="8000" w:type="dxa"/></w:tcPr>${p(r(`celula ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const tail = p(r('ancora Hxg')) + p(r('Depois Hxg'));

export const cases = [];
// página 2: 8 parágrafos de texto e a tabela a 86 pt do topo (cai em cima deles)
const page1 = filler(55, 'pagina1');
cases.push({ name: 'fpg-short', docx: D(page1 + filler(8) + ftbl(1727, 3) + tail) });
cases.push({ name: 'fpg-tall', docx: D(page1 + filler(8) + ftbl(1727, 40) + tail) });
// a âncora já está abaixo da área da tabela (20 parágrafos antes dela)
cases.push({ name: 'fpg-short-late', docx: D(page1 + filler(20) + ftbl(1727, 3) + tail) });
// tabela tão alta que o texto antes da âncora não cabe embaixo dela: a âncora desce
// para a página seguinte — a tabela vai junto?
cases.push({ name: 'fpg-overflow', docx: D(page1 + filler(8) + ftbl(1727, 50) + tail) });
// na 1ª página (nada antes da área da tabela além de 3 linhas)
cases.push({ name: 'fpg-p1-tall', docx: D(filler(3) + ftbl(1727, 40) + tail) });
