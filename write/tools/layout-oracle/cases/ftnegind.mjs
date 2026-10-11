// Tabela flutuante (âncora texto) que deixa à direita, DENTRO da coluna, menos de
// 18 pt; com recuo direito NEGATIVO o parágrafo âncora teria vão maior: ele vai ao
// lado da tabela (o recuo conta para o vão) ou desce para baixo dela?
// Arial 11; texto A4 de 425,2 pt; tabela de 400 pt + 9 pt de afastamento.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const filler = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const fp = '<w:tblpPr w:leftFromText="180" w:rightFromText="180" w:vertAnchor="text" w:horzAnchor="margin" w:tblpY="435"/>';
const tbl = (w) => `<w:tbl><w:tblPr>${fp}<w:tblW w:w="${w}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>`
  + [1, 2, 3].map((k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(`celula ${k} Hxg`))}${p(r(`segue ${k} Hxg`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
const NEG = '<w:ind w:right="-710"/>';

export const cases = [];
// a âncora fica acima da tabela; o parágrafo seguinte (com/sem recuo negativo) cai na faixa dela
cases.push({ name: 'ftni-neg-text', docx: D(filler(5) + tbl(8000) + p(r('A')) + p(r('lado'), NEG) + p(r('Depois Hxg'))) });
cases.push({ name: 'ftni-neg-empty', docx: D(filler(5) + tbl(8000) + p(r('A')) + p('', NEG) + p(r('Depois Hxg'))) });
cases.push({ name: 'ftni-noind', docx: D(filler(5) + tbl(8000) + p(r('A')) + p(r('lado')) + p(r('Depois Hxg'))) });
// controle: tabela mais estreita (vão de 36 pt dentro da coluna)
cases.push({ name: 'ftni-narrow', docx: D(filler(5) + tbl(7600) + p(r('A')) + p(r('lado')) + p(r('Depois Hxg'))) });
