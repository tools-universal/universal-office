// Notas de rodapé: separador, numeração, posição no pé da página, nota que
// empurra a linha da referência para a próxima página.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const ref = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const footnotesXml = (notes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${notes}</w:footnotes>`;

function withNotes(docx, notes) {
  // injeta footnotes.xml no pacote gerado (rel + content type)
  return { docx, notes };
}
void withNotes; void sz;

export const cases = [];
{
  const body = p(r('Primeira referencia') + ref(1) + r(' no texto Hxg'))
    + p(r('Segunda') + ref(2) + r(' e terceira') + ref(3) + r(' referencias Hxg'))
    + Array.from({ length: 5 }, (_, k) => p(r(`corpo ${k + 1} Hxg`))).join('');
  const notes = note(1, 'Nota um curta.') + note(2, 'Nota dois com um texto mais longo que deve ocupar mais de uma linha no pe da pagina para medir a quebra e a entrelinha da nota de rodape.') + note(3, 'Nota tres.');
  cases.push({ name: 'fn-basic', docx: buildDocx({ body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(notes)) } }) });
}
{
  // referência perto do fim da página: a nota não cabe → linha desce
  const body = Array.from({ length: 53 }, (_, k) => p(r(`enchimento ${k + 1} Hxg`)))
    .join('') + p(r('Referencia tardia') + ref(1) + r(' Hxg')) + Array.from({ length: 4 }, (_, k) => p(r(`depois ${k + 1} Hxg`))).join('');
  const notes = note(1, 'Nota longa '.repeat(30));
  cases.push({ name: 'fn-late', docx: buildDocx({ body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(notes)) } }) });
}
