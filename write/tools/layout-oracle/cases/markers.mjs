// Marcador de lista maior que o texto (Symbol 16pt com texto 11pt): como entra
// na altura da linha com entrelinha múltipla (259 = 1,08), simples e 1,5.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const numbering = (sz, font) => `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/><w:sz w:val="${sz}"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>`;
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
export const cases = [];
for (const [font, size] of [['Calibri', 11], ['Arial', 11]]) {
  for (const [mfont, msz] of [['Symbol', 32], ['Symbol', 22], ['Wingdings', 32]]) {
    for (const line of [240, 259, 360]) {
      const sp = `<w:spacing w:after="0" w:line="${line}" w:lineRule="auto"/>`;
      const body = p(r('Antes Hxg'), sp) + [1, 2, 3, 4].map((k) => p(r(`item ${k} Hxg`), NUM + sp)).join('') + p(r('Depois Hxg'), sp);
      cases.push({ name: `mk-${font.toLowerCase()}-${mfont.toLowerCase()}${msz}-l${line}`, docx: buildDocx({ body, numbering: numbering(msz, mfont), defaults: docDefaults({ font, size }) }) });
    }
  }
}
