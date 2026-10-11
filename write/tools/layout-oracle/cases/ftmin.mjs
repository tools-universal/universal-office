// Tabela flutuante (âncora texto, tblpY 48 pt) no pé da página cuja ÚLTIMA linha tem
// altura mínima (trHeight atLeast) que não cabe, mas o conteúdo (1 linha de 8 pt,
// centralizada) caberia: a linha passa da margem inferior, desce para a página
// seguinte ou parte? (No fluxo normal ela desce inteira.) Controles: sem altura
// mínima, e a linha que nem o conteúdo cabe.
// Arial 11: 12,65 pt por linha, corpo A4 de 70,85 a 771,05 pt.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const fp = '<w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="960"/>';
const cell = (w, t) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(r(t, '<w:sz w:val="16"/>'), '<w:jc w:val="center"/>')}</w:tc>`;
const row = (h, a, b) => `<w:tr>${h ? `<w:trPr><w:trHeight w:val="${h}"/></w:trPr>` : ''}${cell(2000, a)}${cell(6000, b)}</w:tr>`;
const tbl = (float, h0, h1) => `<w:tbl><w:tblPr>${float ? fp : ''}<w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="6000"/></w:tblGrid>`
  + row(h0, 'Coluna A', 'Coluna B') + row(h1, 'valor 1', 'texto inventado') + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const tail = p('') + p(r('Depois Hxg'));

export const cases = [];
// 48 linhas: tabela em 726 pt; a 2ª linha começa em ~754,7, conteúdo até ~764 (cabe), mínima até ~782 (não)
cases.push({ name: 'ftm-min48', docx: D(filler(48) + tbl(true, 563, 543) + tail) });
// 47: a tabela inteira cabe (controle de posição)
cases.push({ name: 'ftm-min47', docx: D(filler(47) + tbl(true, 563, 543) + tail) });
// 49: nem o conteúdo da 2ª linha cabe
cases.push({ name: 'ftm-min49', docx: D(filler(49) + tbl(true, 563, 543) + tail) });
// sem altura mínima, 2ª linha que não cabe (52 linhas)
cases.push({ name: 'ftm-none52', docx: D(filler(52) + tbl(true, 0, 0) + tail) });
// a mesma tabela no fluxo (não flutuante), mesma situação da 2ª linha
cases.push({ name: 'ftm-body', docx: D(filler(52) + tbl(false, 563, 543) + tail) });
