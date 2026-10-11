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
{
  // referência DENTRO de célula de tabela: a nota vai para o pé da página da linha
  const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
  const cell = (c) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${c}</w:tc>`;
  const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>${rows.map((r2) => `<w:tr>${r2}</w:tr>`).join('')}</w:tbl>`;
  const rows = Array.from({ length: 6 }, (_, k) => cell(p(r(`Celula ${k + 1} A`) + (k === 2 ? ref(1) : '') + r(' Hxg'))) + cell(p(r(`Celula ${k + 1} B`) + (k === 4 ? ref(2) : '') + r(' Hxg'))));
  const body = p(r('Antes Hxg')) + tbl(rows) + Array.from({ length: 4 }, (_, k) => p(r(`depois ${k + 1} Hxg`))).join('');
  const notes = note(1, 'Nota da celula tres.') + note(2, 'Nota da celula cinco, um pouco mais longa para ocupar duas linhas no pe da pagina quando a largura acabar.');
  cases.push({ name: 'fn-cell', docx: buildDocx({ body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(notes)) } }) });
  // tabela longa perto do fim da página: a linha com a referência desce se a nota não couber
  const rows2 = Array.from({ length: 30 }, (_, k) => cell(p(r(`Linha ${k + 1} Hxg`) + (k === 26 ? ref(1) : ''))) + cell(p(r(`Valor ${k + 1}`))));
  const body2 = Array.from({ length: 20 }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('') + tbl(rows2) + p(r('Fim Hxg'));
  cases.push({ name: 'fn-cell-late', docx: buildDocx({ body: body2, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(note(1, 'Nota longa '.repeat(30)))) } }) });
}
