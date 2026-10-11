// Tabela flutuante (w:tblpPr, âncora no texto) no cabeçalho/rodapé: ela conta na
// altura do rodapé (que sobe o corpo)? Os parágrafos do cabeçalho depois dela a
// contornam (descem para baixo dela) e empurram o corpo?
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const ftbl = (fp, w = 8500, rows = 2, label = 'tab') => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="${w}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>`
  + Array.from({ length: rows }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(`${label} ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const fpText = (y, xs = 'center') => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="${xs}" w:tblpY="${y}"/>`;
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`corpo ${k + 1} Hxg`))).join('');
const D = (o) => buildDocx({ defaults: docDefaults({ font: 'Arial', size: 11 }), ...o });

export const cases = [];
// rodapé: tabela flutuante ABAIXO da âncora (parágrafo vazio com antes 6 pt); distância grande
cases.push({ name: 'hft-ftr-below', docx: D({ body: filler(70), footers: { default: ftbl(fpText(1737), 8500, 2, 'rod') + p('', '<w:spacing w:before="120"/>') }, sect: sectPr({ footer: 2497 }) }) });
cases.push({ name: 'hft-ftr-below-nobefore', docx: D({ body: filler(70), footers: { default: ftbl(fpText(1737), 8500, 2, 'rod') + p(r('ancora Hxg')) }, sect: sectPr({ footer: 2497 }) }) });
// (tabela ACIMA da âncora com "antes" na âncora: o Word a põe mais um "antes" acima — não
// reproduzido; e tabela estreita com o texto ao lado: as linhas ao lado não seguem a
// entrelinha — casos fora do oráculo)
// cabeçalho: tabela flutuante de largura quase total + parágrafos depois dela
cases.push({ name: 'hft-hdr-after', docx: D({ body: filler(10), headers: { default: ftbl(fpText(182), 8500, 2, 'cab') + p(r('depois um Hxg')) + p(r('depois dois Hxg')) } }) });
// cabeçalho: parágrafos antes e depois da tabela
cases.push({ name: 'hft-hdr-mid', docx: D({ body: filler(10), headers: { default: p(r('antes Hxg')) + ftbl(fpText(100), 8500, 2, 'cab') + p(r('depois Hxg')) } }) });
