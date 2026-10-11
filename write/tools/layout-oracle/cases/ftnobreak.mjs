// "Não dividir tabelas com quebra automática de texto entre páginas" (w:compat
// doNotBreakWrappedTables, comum em .doc antigos): a tabela flutuante (âncora texto)
// que passa do pé da página fica inteira onde está (passando da margem), desce
// inteira para a página seguinte, ou divide mesmo assim? Modos 15 e 11; controle
// do modo 11 sem a opção. Tabelas como em ftmin (2 linhas) e ftsplit (8 linhas).
// Arial 11: 12,65 pt por linha, corpo A4 de 70,85 a 771,05 pt.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const fp = (y) => `<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${y}"/>`;
const cell = (w, t) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(r(t, '<w:sz w:val="16"/>'), '<w:jc w:val="center"/>')}</w:tc>`;
const row = (h, a, b) => `<w:tr>${h ? `<w:trPr><w:trHeight w:val="${h}"/></w:trPr>` : ''}${cell(2000, a)}${cell(6000, b)}</w:tr>`;
/** 2 linhas com altura mínima (como ftmin) */
const tbl2 = `<w:tbl><w:tblPr>${fp(960)}<w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="6000"/></w:tblGrid>`
  + row(563, 'Coluna A', 'Coluna B') + row(543, 'valor 1', 'texto inventado') + '</w:tbl>';
/** n linhas de 2 parágrafos (como ftsplit; ~26,3 pt cada) */
const tblN = (n) => `<w:tbl><w:tblPr>${fp(435)}<w:tblW w:w="8500" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="8500"/></w:tblGrid>`
  + Array.from({ length: n }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="8500" w:type="dxa"/></w:tcPr>${p(r(`celula ${k + 1} Hxg`))}${p(r(`segue ${k + 1} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const tbl8 = tblN(8);
/** 2 linhas, alturas mínimas dadas */
const tblH = (h0, h1) => `<w:tbl><w:tblPr>${fp(960)}<w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="6000"/></w:tblGrid>`
  + row(h0, 'Coluna A', 'Coluna B') + row(h1, 'valor 1', 'texto inventado') + '</w:tbl>';
const NB = '<w:doNotBreakWrappedTables/>';
const D = (body, compat, flag) => buildDocx({ body, compat, extraCompat: flag ? NB : '', defaults: docDefaults({ font: 'Arial', size: 11 }) });
const tail = p(r('ancora Hxg')) + p(r('Depois Hxg'));

export const cases = [];
for (const [compat, flag, s] of [[15, true, ''], [11, true, '-c11'], [11, false, '-c11-sem']]) {
  // 2ª linha: conteúdo cabe, altura mínima não
  cases.push({ name: `ftnb-min48${s}`, docx: D(filler(48) + tbl2 + tail, compat, flag) });
  // 2ª linha: nem o conteúdo cabe
  cases.push({ name: `ftnb-min49${s}`, docx: D(filler(49) + tbl2 + tail, compat, flag) });
  // tabela alta: metade passa do pé
  cases.push({ name: `ftnb-tall${s}`, docx: D(filler(44) + tbl8 + tail, compat, flag) });
  // nem a 1ª linha cabe (no modo 11 sem a opção o Word deixa a 1ª linha passando da
  // margem, por 2,6 pt — não reproduzido; caso fora do oráculo)
  if (s !== '-c11-sem') cases.push({ name: `ftnb-r0${s}`, docx: D(filler(51) + tbl2 + tail, compat, flag) });
}
// só com a opção (modo 11): o que decide entre ficar passando da margem e descer inteira?
// 6 linhas: 1ª cabe, fim em ~807 pt (dentro do papel)
cases.push({ name: 'ftnb-six-c11', docx: D(filler(44) + tblN(6) + tail, 11, true) });
// 2ª linha de 150 pt: fim em ~854 pt (fora do papel)
cases.push({ name: 'ftnb-r1tall-c11', docx: D(filler(44) + tblH(563, 3000) + tail, 11, true) });
// 1ª linha: conteúdo cabe, altura mínima não
cases.push({ name: 'ftnb-r0min-c11', docx: D(filler(50) + tbl2 + tail, 11, true) });
// modos 12 e 14 com a opção
cases.push({ name: 'ftnb-min48-c12', docx: D(filler(48) + tbl2 + tail, 12, true) });
cases.push({ name: 'ftnb-min48-c14', docx: D(filler(48) + tbl2 + tail, 14, true) });
cases.push({ name: 'ftnb-tall-c14', docx: D(filler(44) + tbl8 + tail, 14, true) });
// varreduras (modo 11 com a opção): 2ª linha mais alta na mesma posição de min48
for (const h of [1000, 1500, 2000]) cases.push({ name: `ftnb-r1h${h}-c11`, docx: D(filler(48) + tblH(563, h) + tail, 11, true) });
// tabelas de n linhas (~25,9 pt cada, tblpY 21,75 pt) em várias alturas
for (const [n, f] of [[2, 50], [3, 50], [6, 42], [6, 43], [4, 46], [4, 47]]) cases.push({ name: `ftnb-n${n}f${f}-c11`, docx: D(filler(f) + tblN(n) + tail, 11, true) });
// modo 11 SEM a opção, 1ª linha que não cabe: 2 linhas de texto (só a 1ª cabe) e a
// tabela inteira abaixo da margem
cases.push({ name: 'ftnb-r0b-c11-sem', docx: D(filler(52) + tblN(3) + tail, 11, false) });
cases.push({ name: 'ftnb-r0c-c11-sem', docx: D(filler(54) + tblN(3) + tail, 11, false) });
cases.push({ name: 'ftnb-r0b', docx: D(filler(52) + tblN(3) + tail, 15, false) });
