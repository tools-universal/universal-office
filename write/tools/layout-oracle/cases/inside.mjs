// "Dentro"/"fora" na página PAR (número exibido): na horizontal dentro = direita e fora =
// esquerda; a margem interna/externa troca de lado; na vertical dentro = embaixo e fora = em
// cima — com ou sem margens espelhadas. Caixa de texto (wp:align) e tabela flutuante
// (tblpXSpec). Calibri 11, conteúdo inventado.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

const pg = (extra = '') => `<w:sectPr>${extra}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
const defaults = docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 });
const boxText = (n) => p(r(lorem(n, 77)));
/** n parágrafos; a caixa no início do parágrafo k */
const withBox = (boxXml, k, n = 14) => Array.from({ length: n }, (_, j) => p((j + 1 === k ? boxXml : '') + r(lorem(70, 1 + j)))).join('');
const box = (o) => tbx({ i: 1, x: 0, y: 0, w: 130, h: 70, wrap: 'wrapSquare', relH: 'margin', relV: 'paragraph', fill: '<a:solidFill><a:schemeClr val="lt1"/></a:solidFill>', content: boxText(10), ...o });
const doc = (name, body, sect = pg(), settings = '') => ({ name, docx: buildDocx({ body, sect, defaults, settings }) });
const BD = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('') + '</w:tblBorders>';
const ftbl = (spec) => `<w:tbl><w:tblPr><w:tblpPr w:leftFromText="141" w:rightFromText="141" w:vertAnchor="text" w:horzAnchor="margin" w:tblpXSpec="${spec}" w:tblpY="1"/><w:tblW w:w="2500" w:type="dxa"/>${BD}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2500"/></w:tblGrid>`
  + Array.from({ length: 3 }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr>${p(r('Flutuante ' + (k + 1)))}</w:tc></w:tr>`).join('') + '</w:tbl>';
const paras = (n, seed) => Array.from({ length: n }, (_, k) => p(r(lorem(70, seed + k)))).join('');

export const cases = [
  doc('in-h-p1', withBox(box({ alignH: 'inside' }), 2)),
  doc('in-h-p2', withBox(box({ alignH: 'inside' }), 10)),
  doc('in-h-p1-start2', withBox(box({ alignH: 'inside' }), 2), pg('<w:pgNumType w:start="2"/>')),
  doc('out-h-p2-page', withBox(box({ alignH: 'outside', relH: 'page' }), 10)),
  doc('in-margin-p2', withBox(box({ wrap: 'wrapNone', w: 60, content: boxText(4), alignH: 'center', relH: 'insideMargin' }), 10)),
  doc('out-margin-p2', withBox(box({ wrap: 'wrapNone', w: 60, content: boxText(4), alignH: 'center', relH: 'outsideMargin' }), 10)),
  doc('in-v-p2', withBox(box({ wrap: 'wrapNone', alignH: 'center', alignV: 'inside', relV: 'margin' }), 10)),
  doc('out-vmargin-p2', withBox(box({ wrap: 'wrapNone', h: 30, content: boxText(4), alignH: 'center', alignV: 'center', relV: 'outsideMargin' }), 10)),
  doc('ft-in-p2', paras(9, 1) + ftbl('inside') + paras(5, 20)),
  doc('ft-out-p2', paras(9, 1) + ftbl('outside') + paras(5, 20)),
];
