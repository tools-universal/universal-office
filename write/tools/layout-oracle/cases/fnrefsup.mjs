// Marca de referência de nota de rodapé (w:footnoteReference): sobe (sobrescrito)
// sempre, ou segue a formatação — estilo de caractere com/sem w:vertAlign, sem estilo,
// sobrescrito direto? A marca dentro da nota (w:footnoteRef) idem. Arial 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = (sup) => '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + `<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/>${sup ? '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>' : ''}</w:style>`;
const ref = (rPr) => `<w:r><w:rPr>${rPr}</w:rPr><w:footnoteReference w:id="1"/></w:r>`;
const notes = (rPr) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`
  + `<w:footnote w:id="1"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Nota.</w:t></w:r></w:p></w:footnote></w:footnotes>`;
const D = (sup, rPr) => buildDocx({ body: p(r('Antes') + ref(rPr) + r(' Hxg')) + p(r('Fim Hxg')), styles: styles(sup), defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(notes(rPr)) } });
const RS = '<w:rStyle w:val="FootnoteReference"/>';

export const cases = [
  { name: 'frs-style-nosup', docx: D(false, RS) },
  { name: 'frs-nostyle', docx: D(false, '') },
  { name: 'frs-style-sup', docx: D(true, RS) },
  { name: 'frs-direct-sup', docx: D(false, '<w:vertAlign w:val="superscript"/>') },
];
