// Recuo da 1ª linha (w:ind firstLine/hanging) num parágrafo com quebra de
// COLUNA ou de PÁGINA: a linha que continua depois da quebra é "1ª linha"?
// (corpus t70: parágrafo que começa com a quebra de coluna, texto na 2ª coluna).
// Medido: com a quebra de COLUNA no início, a linha na coluna seguinte leva o
// recuo da 1ª linha E o número da lista; a quebra no meio, não.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const pg = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const cols2 = `<w:sectPr>${pg}<w:cols w:num="2" w:space="708"/></w:sectPr>`;
const BR = (type) => `<w:r><w:br w:type="${type}"/></w:r>`;
const FL = '<w:ind w:firstLine="720"/>';
const HG = '<w:ind w:left="720" w:hanging="360"/>';
const head = p(r('Primeira coluna Hxg')) + p(r('Outra linha Hxg'));
const NUMBERING = '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>';
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
const D = (body, sect) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 10 }), numbering: NUMBERING, ...(sect ? { sect } : {}) });

export const cases = [
  { name: 'bf-col-start', docx: D(head + p(BR('column') + r('Depois Hxg'), FL) + p(r('Seguinte Hxg'), FL), cols2) },
  { name: 'bf-col-mid', docx: D(head + p(r('Antes Hxg') + BR('column') + r('Depois Hxg'), FL) + p(r('Seguinte Hxg'), FL), cols2) },
  { name: 'bf-col-start-hang', docx: D(head + p(BR('column') + r('Depois Hxg'), HG) + p(r('Seguinte Hxg'), HG), cols2) },
  // parágrafo NUMERADO que começa com a quebra de coluna: onde fica o número e o recuo?
  { name: 'bf-col-start-num', docx: D(head + p(BR('column') + r('Depois Hxg'), NUM) + p(r('Seguinte Hxg'), NUM), cols2) },
  { name: 'bf-col-start-num-fl', docx: D(head + p(BR('column') + r('Depois Hxg'), NUM + '<w:ind w:left="0" w:firstLine="720"/>') + p(r('Seguinte Hxg'), NUM), cols2) },
  { name: 'bf-page-start', docx: D(head + p(BR('page') + r('Depois Hxg'), FL) + p(r('Seguinte Hxg'), FL)) },
  { name: 'bf-page-mid', docx: D(head + p(r('Antes Hxg') + BR('page') + r('Depois Hxg'), FL) + p(r('Seguinte Hxg'), FL)) },
  { name: 'bf-page-start-hang', docx: D(head + p(BR('page') + r('Depois Hxg'), HG) + p(r('Seguinte Hxg'), HG)) },
];
