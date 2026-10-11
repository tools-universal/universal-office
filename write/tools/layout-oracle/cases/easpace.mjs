// Fonte do Leste Asiático AUSENTE (Arial Unicode MS, charset 80, altName Yu Gothic)
// num run só de espaço ou de texto latino: qual fonte dá a altura da linha? Variando
// os slots ascii/eastAsia e a presença do fontTable.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const ft = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts ${W_NS}><w:font w:name="Arial Unicode MS"><w:altName w:val="Yu Gothic"/><w:panose1 w:val="020B0604020202020204"/><w:charset w:val="80"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>`);
const rf = (ascii, ea) => `<w:rFonts w:ascii="${ascii}" w:eastAsia="${ea}" w:hAnsi="${ascii}" w:cs="${ascii}"/><w:sz w:val="26"/><w:szCs w:val="26"/>`;
const AU = 'Arial Unicode MS';
export const cases = [];
for (const [tag, ascii, ea, text] of [
  ['a-sp', AU, AU, ' '], ['a-txt', AU, AU, 'Hxg'],
  ['c-sp', 'Arial', AU, ' '], ['c-txt', 'Arial', AU, 'Hxg'],
  ['d-sp', 'Arial', 'Yu Gothic', ' '], ['d-txt', 'Arial', 'Yu Gothic', 'Hxg'],
  ['e-sp', AU, 'Arial', ' '], ['e-txt', AU, 'Arial', 'Hxg'],
]) {
  for (const withFt of [true, false]) {
    const body = p(r('Antes Hxg')) + p(r(text, rf(ascii, ea)), '<w:spacing w:line="360" w:lineRule="auto"/>') + p(r('Depois Hxg'));
    cases.push({ name: `eas-${tag}${withFt ? '' : '-noft'}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), ...(withFt ? { extraParts: { 'word/fontTable.xml': ft } } : {}) }) });
  }
}
