// Tabelas flutuantes (w:tblpPr): posição pelas âncoras (página/margem/texto),
// alinhamentos (tblpXSpec/tblpYSpec), distâncias do texto e o contorno do texto
// em volta. Também imagem com quebra "superior e inferior".
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const ftbl = (tblpPr, w = 3000, rows = 2) => `<w:tbl><w:tblPr>${tblpPr}<w:tblW w:w="${w}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(`flut ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const text = (seed) => p(r(lorem(90, seed)), '<w:jc w:val="left"/>');

export const cases = [];
for (const compat of [15, 14]) {
  const D = (o) => buildDocx({ body: o, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  // âncora texto (padrão), à direita, com distâncias
  cases.push({ name: `ft-text-right-c${compat}`, docx: D(p(r('Antes Hxg')) + ftbl('<w:tblpPr w:leftFromText="180" w:rightFromText="180" w:topFromText="120" w:bottomFromText="120" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="right" w:tblpY="200"/>') + text(1) + text(2)) });
  // âncora página com X/Y absolutos
  cases.push({ name: `ft-page-abs-c${compat}`, docx: D(p(r('Antes Hxg')) + ftbl('<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="page" w:horzAnchor="page" w:tblpX="1440" w:tblpY="3000"/>') + text(3) + text(4)) });
  // âncora margem, centralizada, largura total (texto passa por baixo)
  cases.push({ name: `ft-margin-full-c${compat}`, docx: D(p(r('Antes Hxg')) + ftbl('<w:tblpPr w:vertAnchor="margin" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="1000"/>', 8504, 3) + text(5) + text(6)) });
}
// tabela flutuante (âncora texto, largura total) que não cabe no resto da página:
// as linhas que não cabem continuam no topo da próxima — e uma linha alta se
// divide no meio; se nem a 1ª linha cabe, a tabela vai inteira
{
  const D = (o) => buildDocx({ body: o, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const fill = (n) => Array.from({ length: n }, (_, k) => p(r(`Antes ${k + 1} Hxg`))).join('');
  const tall = (lines) => Array.from({ length: lines }, (_, k) => p(r(`alta ${k + 1} Hxg`))).join('');
  const fp = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="160"/>';
  const rowsTbl = (cells) => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="8504" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="8504"/></w:tblGrid>`
    + cells.map((c) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="8504" w:type="dxa"/></w:tcPr>${c}</w:tc></w:tr>`).join('') + '</w:tbl>';
  const rows12 = Array.from({ length: 12 }, (_, k) => p(r(`linha ${k + 1} Hxg`)));
  cases.push({ name: 'ft-split-rows', docx: D(fill(45) + rowsTbl(rows12) + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft-split-tallrow', docx: D(fill(30) + rowsTbl([p(r('topo Hxg')), tall(40)]) + p(r('Depois Hxg'))) });
  cases.push({ name: 'ft-split-firstrow', docx: D(fill(50) + rowsTbl([tall(8), p(r('fim Hxg'))]) + p(r('Depois Hxg'))) });
}
