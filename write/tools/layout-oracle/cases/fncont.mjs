// Nota de rodapé longa perto do pé da página: a linha da referência fica e a nota
// CONTINUA na página seguinte (com o separador de continuação)? Quantas linhas da nota
// precisam caber junto da referência? Referência em parágrafo e em célula; nota nova na
// página da continuação. Arial 11 (12,65 pt por linha), nota em 10 pt (11,5 pt).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const ref = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const footnotesXml = (notes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${notes}</w:footnotes>`;
const fill = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const after = Array.from({ length: 3 }, (_, k) => p(r(`depois ${k + 1} Hxg`))).join('');
// nota de ~10 linhas
const longText = Array.from({ length: 10 }, (_, k) => `linha ${k + 1} da nota longa com texto que ocupa a largura toda do corpo da pagina`).join(' ');
const D = (body, notes) => buildDocx({ body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(notes)) } });
export const cases = [];
// referência em parágrafo; cabem 3, 2, 1, 0 linhas da nota abaixo dela
for (const n of [50, 51, 52, 53]) {
  cases.push({ name: `fc-para-${n}`, docx: D(fill(n) + p(r('Referencia Hxg') + ref(1)) + after, note(1, longText)) });
}
// referência numa linha de tabela
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>${rows.map((x) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${x}</w:tc></w:tr>`).join('')}</w:tbl>`;
cases.push({ name: 'fc-cell-50', docx: D(fill(46) + tbl(Array.from({ length: 8 }, (_, k) => p(r(`linha ${k + 1} Hxg`) + (k === 3 ? ref(1) : '')))) + after, note(1, longText)) });
// continuação e uma nota nova logo no início da página seguinte
cases.push({ name: 'fc-two', docx: D(fill(51) + p(r('Referencia Hxg') + ref(1)) + p(r('Outra Hxg') + ref(2)) + after, note(1, longText) + note(2, 'Nota curta da pagina dois.')) });
