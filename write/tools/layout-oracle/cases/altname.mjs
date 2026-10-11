// Fonte ausente COM w:altName no fontTable: o Word usa a alternativa (se instalada)
// antes da sua substituição própria? Arial Unicode MS (ausente no Windows atual;
// sem altName o Word usa Arial — oráculo fontsub2) com altName Yu Gothic / Meiryo
// (ausente) / Calibri; e uma família inventada com altName.
import { buildDocx, docDefaults, font, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const ft = (entries) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts ${W_NS}>${entries}</w:fonts>`);
const entry = (name, alt, charset = '80', fam = 'swiss') => `<w:font w:name="${name}">${alt ? `<w:altName w:val="${alt}"/>` : ''}<w:panose1 w:val="${fam === 'roman' ? '02020603050405020304' : '020B0604020202020204'}"/><w:charset w:val="${charset}"/><w:family w:val="${fam}"/><w:pitch w:val="variable"/></w:font>`;
export const cases = [];
const body = (f) => p(r('Antes Hxg')) + p(r('Texto com a fonte Hxg', font(f) + '<w:sz w:val="26"/>'), '<w:spacing w:line="360" w:lineRule="auto"/>')
  + p(r(' ', font(f) + '<w:sz w:val="26"/>'), '<w:spacing w:line="360" w:lineRule="auto"/>') + p(r('Depois Hxg'));
for (const [tag, fam, alt, cs, family = 'swiss'] of [
  ['auni-yugothic', 'Arial Unicode MS', 'Yu Gothic', '80'],
  ['auni-meiryo', 'Arial Unicode MS', 'Meiryo', '80'],
  ['auni-calibri', 'Arial Unicode MS', 'Calibri', '00'],
  ['auni-none', 'Arial Unicode MS', '', '80'],
  ['inventada-yugothic', 'Fonte Inventada Sans', 'Yu Gothic', '00'],
  // conjunto de caracteres do Leste Asiático sem altName: a fonte padrão da escrita?
  ['auni-msgothic', 'Arial Unicode MS', 'MS Gothic', '80'],
  ['inventada-00-tnr', 'Fonte Inventada Sans', 'Times New Roman', '00'],
  ['auni-81', 'Arial Unicode MS', '', '81'],
  ['auni-86', 'Arial Unicode MS', '', '86'],
  ['auni-88', 'Arial Unicode MS', '', '88'],
  ['inventada-80', 'Fonte Inventada Sans', '', '80'],
  ['inventada-00', 'Fonte Inventada Sans', '', '00'],
  ['inventada-80-roman', 'Fonte Inventada Serif', '', '80', 'roman'],
  ['inventada-81-roman', 'Fonte Inventada Serif', '', '81', 'roman'],
  ['inventada-86-roman', 'Fonte Inventada Serif', '', '86', 'roman'],
  ['inventada-88-roman', 'Fonte Inventada Serif', '', '88', 'roman'],
]) {
  cases.push({ name: `alt-${tag}`, docx: buildDocx({ body: body(fam), defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/fontTable.xml': ft(entry(fam, alt, cs, family)) } }) });
}
