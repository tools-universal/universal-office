// Numeração e local das notas de RODAPÉ: formato (romanos, letras, símbolos chicago),
// início, reinício por página e por seção, formato diferente por seção, "abaixo do
// texto" (w:pos beneathText), colunas da área de notas (w15:footnoteColumns), marca
// personalizada (w:customMarkFollows) e o separador de continuação.
// Arial 11; nota em 10 pt (estilo "footnote text" como o Word grava).
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { strToU8, unzipSync, zipSync, strFromU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const ref = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const customRef = (id, mark) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:customMarkFollows="1" w:id="${id}"/><w:t>${mark}</w:t></w:r>`;
const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const customNote = (id, mark, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:t>${mark}</w:t></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const SEPS = '<w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>';
const part = (notes) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${SEPS}${notes}</w:footnotes>`);
const ENDS = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + SEPS.replace(/footnote/g, 'endnote') + '</w:endnotes>');
const fill = (n, w = 'enchimento') => Array.from({ length: n }, (_, k) => p(r(`${w} ${k + 1} Hxg`))).join('');
const settings = (fnPr = '') => `<w:footnotePr>${fnPr}<w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr>`;
/** fnPr vai no settings e no sectPr de todas as seções ("todo o documento", como o Word) */
const D = ({ body, notes, fnPr = '', sect }) => buildDocx({
  body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), settings: settings(fnPr),
  sect: sect ?? sectPr({ extra: fnPr ? `<w:footnotePr>${fnPr}</w:footnotePr>` : '' }),
  extraParts: { 'word/footnotes.xml': part(notes), 'word/endnotes.xml': ENDS },
});
/** n referências num parágrafo cada, notas curtas */
const many = (n, fnPr, extraBody = '') => D({
  body: Array.from({ length: n }, (_, k) => p(r(`Ref ${k + 1}`) + ref(k + 1) + r(' Hxg'))).join('') + extraBody,
  notes: Array.from({ length: n }, (_, k) => note(k + 1, `Nota ${k + 1}.`)).join(''),
  fnPr,
});
const secBreak = (text, extra = '') => p(r(text), sectPr({ extra: `${extra}<w:type w:val="nextPage"/>` }));

export const cases = [];
for (const f of ['upperRoman', 'lowerRoman', 'upperLetter', 'lowerLetter', 'chicago']) {
  cases.push({ name: `fmt-${f}`, docx: many(f === 'chicago' || f.endsWith('Letter') ? 30 : 12, `<w:numFmt w:val="${f}"/>`) });
}
cases.push({ name: 'fmt-start5', docx: many(4, '<w:numStart w:val="5"/>') });
cases.push({ name: 'fmt-start99', docx: many(3, '<w:numStart w:val="99"/>') });
// reinício por página: 2 notas na pág. 1, 2 na pág. 2
cases.push({ name: 'fmt-eachpage', docx: D({
  body: p(r('Um') + ref(1) + r(' Hxg')) + p(r('Dois') + ref(2) + r(' Hxg')) + fill(52) + p(r('Tres') + ref(3) + r(' Hxg')) + p(r('Quatro') + ref(4) + r(' Hxg')),
  notes: note(1, 'Nota 1.') + note(2, 'Nota 2.') + note(3, 'Nota 3.') + note(4, 'Nota 4.'),
  fnPr: '<w:numRestart w:val="eachPage"/>',
}) });
// reinício por seção; e formato diferente só na seção dois
cases.push({ name: 'fmt-eachsect', docx: D({
  body: p(r('Um') + ref(1) + r(' dois') + ref(2) + r(' Hxg')) + secBreak('fim um Hxg', '<w:footnotePr><w:numRestart w:val="eachSect"/></w:footnotePr>') + p(r('Tres') + ref(3) + r(' Hxg')),
  notes: note(1, 'Nota 1.') + note(2, 'Nota 2.') + note(3, 'Nota 3.'),
  fnPr: '<w:numRestart w:val="eachSect"/>',
}) });
cases.push({ name: 'fmt-sect2', docx: D({
  body: p(r('Um') + ref(1) + r(' dois') + ref(2) + r(' Hxg')) + secBreak('fim um Hxg') + p(r('Tres') + ref(3) + r(' Hxg')),
  notes: note(1, 'Nota 1.') + note(2, 'Nota 2.') + note(3, 'Nota 3.'),
  sect: sectPr({ extra: '<w:footnotePr><w:numFmt w:val="lowerRoman"/></w:footnotePr>' }),
}) });
// abaixo do texto: página curta e página cheia
cases.push({ name: 'pos-beneath', docx: many(2, '<w:pos w:val="beneathText"/>', fill(3)) });
cases.push({ name: 'pos-beneath-full', docx: D({
  body: fill(20) + p(r('Ref') + ref(1) + r(' Hxg')) + fill(40),
  notes: note(1, 'Nota abaixo do texto.'),
  fnPr: '<w:pos w:val="beneathText"/>',
}) });
// marca personalizada no meio de notas numeradas
cases.push({ name: 'custom-mark', docx: D({
  body: p(r('Um') + ref(1) + r(' asterisco') + customRef(2, '*') + r(' tres') + ref(3) + r(' Hxg')),
  notes: note(1, 'Nota numerada.') + customNote(2, '*', 'Nota com marca.') + note(3, 'Outra numerada.'),
}) });
// nota longa que continua na página seguinte (separador de continuação)
const longText = Array.from({ length: 10 }, (_, k) => `linha ${k + 1} da nota longa com texto que ocupa a largura toda do corpo da pagina`).join(' ');
cases.push({ name: 'cont-sep', docx: D({ body: fill(51) + p(r('Referencia Hxg') + ref(1)) + fill(3, 'depois'), notes: note(1, longText) }) });

// colunas da área de notas (w15:footnoteColumns no fim do sectPr; precisa do namespace w15)
function withW15(bytes) {
  const files = unzipSync(bytes);
  const doc = strFromU8(files['word/document.xml'])
    .replace('<w:document ', '<w:document xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15" ')
    .replace(/<w:docGrid w:linePitch="360"\/><\/w:sectPr><\/w:body>/, '<w:docGrid w:linePitch="360"/><w15:footnoteColumns w:val="2"/></w:sectPr></w:body>');
  files['word/document.xml'] = strToU8(doc);
  return zipSync(files);
}
cases.push({ name: 'cols2', docx: withW15(D({
  body: Array.from({ length: 5 }, (_, k) => p(r(`Ref ${k + 1}`) + ref(k + 1) + r(' Hxg'))).join(''),
  notes: Array.from({ length: 5 }, (_, k) => note(k + 1, k === 2 ? 'Nota tres mais longa que vai ocupar mais de uma linha na coluna da area de notas.' : `Nota ${k + 1}.`)).join(''),
})) });
// continuação: nota partida + nota nova na página seguinte; nota que atravessa 3 páginas
cases.push({ name: 'cont-sep-two', docx: D({ body: fill(51) + p(r('Referencia Hxg') + ref(1)) + fill(3, 'depois') + p(r('Outra') + ref(2) + r(' Hxg')), notes: note(1, longText) + note(2, 'Nota curta da pagina dois.') }) });
cases.push({ name: 'cont-sep-3p', docx: D({ body: fill(48) + p(r('Referencia Hxg') + ref(1)) + fill(60, 'depois'), notes: note(1, Array.from({ length: 9 }, () => longText).join(' ')) }) });
