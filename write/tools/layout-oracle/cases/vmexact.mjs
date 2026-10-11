// Mescla vertical (vMerge) cujo conteúdo é mais alto que as linhas que ela cobre:
// a última linha da mescla cresce para caber? Com altura EXATA (hRule exact) nas
// linhas cobertas, só na última, só na primeira, e com altura mínima / sem altura.
// A célula mesclada só tem parágrafos VAZIOS: o recorte não some com texto, e o texto
// dela sairia no PDF fora da ordem das linhas (ver rowpitch).
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tr = (h, cells) => `<w:tr>${h ? `<w:trPr>${h}</w:trPr>` : ''}${cells}</w:tr>`;
const tc = (w, xml, vm = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${vm === 'r' ? '<w:vMerge w:val="restart"/>' : vm === 'c' ? '<w:vMerge/>' : ''}</w:tcPr>${xml}</w:tc>`;
const EX = (tw) => `<w:trHeight w:hRule="exact" w:val="${tw}"/>`;
const AL = (tw) => `<w:trHeight w:val="${tw}"/>`;
// célula mesclada: n + 1 parágrafos vazios (Arial 11: 12,65 pt cada)
const tall = (n) => p('').repeat(n + 1);
/** hs: trPr de cada linha coberta pela mescla; depois uma linha comum */
const tbl = (hs, n = 5) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="3500"/></w:tblGrid>`
  + hs.map((h, k) => tr(h, tc(2500, k === 0 ? tall(n) : p(''), k === 0 ? 'r' : 'c') + tc(3500, p(r(`linha ${k + 1} Hxg`))))).join('')
  + tr('', tc(2500, p(r('baixo Hxg'))) + tc(3500, p(r('depois Hxg'))))
  + '</w:tbl>';
const D = (o) => buildDocx({ defaults: docDefaults({ font: 'Arial', size: 11 }), ...o });
const body = (t) => p(r('Antes Hxg')) + t + p(r('Fim Hxg'));

export const cases = [];
cases.push({ name: 'vme-exact-both', docx: D({ body: body(tbl([EX(400), EX(400)])) }) });
cases.push({ name: 'vme-exact-last', docx: D({ body: body(tbl(['', EX(400)])) }) });
cases.push({ name: 'vme-exact-first', docx: D({ body: body(tbl([EX(400), ''])) }) });
cases.push({ name: 'vme-exact-mid', docx: D({ body: body(tbl([EX(400), '', EX(400)], 7)) }) });
cases.push({ name: 'vme-atleast-both', docx: D({ body: body(tbl([AL(400), AL(400)])) }) });
cases.push({ name: 'vme-none', docx: D({ body: body(tbl(['', ''])) }) });
// no cabeçalho (o corpo começa abaixo da tabela)
cases.push({ name: 'vme-hdr-exact-both', docx: D({ body: p(r('corpo Hxg')), headers: { default: tbl([EX(400), EX(400)]) + p('') }, sect: sectPr({ top: 567, header: 284 }) }) });
