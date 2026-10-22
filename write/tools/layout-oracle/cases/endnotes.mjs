// Notas de FIM: onde o Word as põe (fim do documento × fim da seção), o separador, a
// continuação na página seguinte, numeração (romanos minúsculos por padrão, início,
// reinício por seção), seção que as suprime (w:noEndnote) e seção em colunas.
// Arial 11; nota em 10 pt (estilo "endnote text" como o Word grava).
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="EndnoteText"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="EndnoteReference"><w:name w:val="endnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const eref = (id) => `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="${id}"/></w:r>`;
const fref = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const enote = (id, text, extra = '') => `<w:endnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="EndnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p>${extra}</w:endnote>`;
const fnote = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const SEPS = (tag) => `<w:${tag} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:${tag}><w:${tag} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:${tag}>`;
const part = (root, tag, notes) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${root} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${SEPS(tag)}${notes}</w:${root}>`);
const fill = (n, w = 'enchimento') => Array.from({ length: n }, (_, k) => p(r(`${w} ${k + 1} Hxg`))).join('');
const longText = (n) => Array.from({ length: n }, (_, k) => `linha ${k + 1} da nota de fim longa com texto que ocupa a largura toda do corpo`).join(' ');

/** settings como o Word grava (separadores) + opções extras do documento */
const settings = ({ fnPr = '', enPr = '' } = {}) => `<w:footnotePr>${fnPr}<w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr>${enPr}<w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr>`;
const D = ({ body, sect, ends = '', foots = '', set = {} }) => buildDocx({
  body, sect, styles, defaults: docDefaults({ font: 'Arial', size: 11 }),
  settings: settings(set),
  extraParts: { 'word/footnotes.xml': part('footnotes', 'footnote', foots), 'word/endnotes.xml': part('endnotes', 'endnote', ends) },
});
/** quebra de seção (sectPr no último parágrafo da seção) */
const secBreak = (text, { type = 'nextPage', extra = '', noEnd = false } = {}) => p(r(text), sectPr({ extra: `${extra}<w:type w:val="${type}"/>` }).replace('<w:docGrid', noEnd ? '<w:noEndnote/><w:docGrid' : '<w:docGrid'));

export const cases = [];
// fim do documento, numeração padrão (i, ii)
cases.push({ name: 'en-doc', docx: D({
  body: p(r('Primeira referencia') + eref(1) + r(' no texto Hxg')) + fill(2) + p(r('Segunda') + eref(2) + r(' referencia Hxg')) + p(r('Ultimo Hxg')),
  ends: enote(1, 'Nota de fim um.') + enote(2, 'Nota de fim dois com texto mais longo que deve ocupar mais de uma linha no fim do documento para medir a entrelinha.'),
}) });
// notas de rodapé e de fim no mesmo documento
cases.push({ name: 'en-with-fn', docx: D({
  body: p(r('Rodape') + fref(1) + r(' e fim') + eref(1) + r(' Hxg')) + fill(3) + p(r('Fim') + eref(2) + r(' Hxg')),
  ends: enote(1, 'Nota de fim um.') + enote(2, 'Nota de fim dois.'),
  foots: fnote(1, 'Nota de rodape um.'),
}) });
// nota de fim de dois parágrafos
cases.push({ name: 'en-paras', docx: D({
  body: p(r('Texto') + eref(1) + r(' Hxg')) + fill(2),
  ends: enote(1, 'Primeiro paragrafo da nota.', '<w:p><w:pPr><w:pStyle w:val="EndnoteText"/></w:pPr><w:r><w:t>Segundo paragrafo da nota.</w:t></w:r></w:p>'),
}) });
// o corpo enche a página: as notas começam na seguinte; nota longa que continua
for (const n of [50, 53, 55]) {
  cases.push({ name: `en-fill${n}`, docx: D({
    body: p(r('Referencia') + eref(1) + r(' Hxg')) + p(r('Outra') + eref(2) + r(' Hxg')) + fill(n),
    ends: enote(1, 'Nota curta.') + enote(2, longText(8)),
  }) });
}
// fim da SEÇÃO (settings), duas seções página seguinte
cases.push({ name: 'en-sect-np', docx: D({
  body: p(r('Secao um') + eref(1) + r(' Hxg')) + fill(2) + secBreak('fim secao um Hxg') + p(r('Secao dois') + eref(2) + r(' Hxg')) + fill(2),
  ends: enote(1, 'Nota da secao um.') + enote(2, 'Nota da secao dois.'),
  set: { enPr: '<w:pos w:val="sectEnd"/>' },
}) });
// fim da seção com quebra contínua
cases.push({ name: 'en-sect-cont', docx: D({
  body: p(r('Secao um') + eref(1) + r(' Hxg')) + fill(2) + secBreak('fim secao um Hxg', { type: 'continuous' }) + p(r('Secao dois') + eref(2) + r(' Hxg')) + fill(2),
  ends: enote(1, 'Nota da secao um.') + enote(2, 'Nota da secao dois.'),
  set: { enPr: '<w:pos w:val="sectEnd"/>' },
  sect: sectPr({ extra: '<w:type w:val="continuous"/>' }),
}) });
// seção um suprime as notas de fim (vão para o fim da seção dois)
cases.push({ name: 'en-noend', docx: D({
  body: p(r('Secao um') + eref(1) + r(' Hxg')) + secBreak('fim secao um Hxg', { noEnd: true }) + p(r('Secao dois') + eref(2) + r(' Hxg')) + secBreak('fim secao dois Hxg') + p(r('Secao tres Hxg')),
  ends: enote(1, 'Nota da secao um.') + enote(2, 'Nota da secao dois.'),
  set: { enPr: '<w:pos w:val="sectEnd"/>' },
}) });
// fim do documento, reinício por seção (i, ii | i)
cases.push({ name: 'en-restart', docx: D({
  body: p(r('Um') + eref(1) + r(' dois') + eref(2) + r(' Hxg')) + secBreak('fim secao um Hxg', { extra: '<w:endnotePr><w:numRestart w:val="eachSect"/></w:endnotePr>' }) + p(r('Tres') + eref(3) + r(' Hxg')),
  ends: enote(1, 'Nota um.') + enote(2, 'Nota dois.') + enote(3, 'Nota tres.'),
  set: { enPr: '<w:numRestart w:val="eachSect"/>' },
  sect: sectPr({ extra: '<w:endnotePr><w:numRestart w:val="eachSect"/></w:endnotePr>' }),
}) });
// formato decimal começando em 4
cases.push({ name: 'en-decimal4', docx: D({
  body: p(r('Um') + eref(1) + r(' dois') + eref(2) + r(' Hxg')),
  ends: enote(1, 'Nota um.') + enote(2, 'Nota dois.'),
  set: { enPr: '<w:numFmt w:val="decimal"/><w:numStart w:val="4"/>' },
  sect: sectPr({ extra: '<w:endnotePr><w:numFmt w:val="decimal"/><w:numStart w:val="4"/></w:endnotePr>' }),
}) });
// última seção em duas colunas: as notas seguem as colunas?
cases.push({ name: 'en-cols', docx: D({
  body: p(r('Texto') + eref(1) + r(' Hxg')) + fill(6) + p(r('Mais') + eref(2) + r(' Hxg')),
  ends: enote(1, longText(3)) + enote(2, 'Nota curta dois.'),
  sect: sectPr().replace('<w:cols w:space="708"/>', '<w:cols w:num="2" w:space="708"/>'),
}) });
// nota de fim que se parte entre páginas (o separador de continuação)
cases.push({ name: 'en-split', docx: D({ body: p(r('Referencia') + eref(1) + r(' Hxg')) + fill(46), ends: enote(1, longText(14)) }) });
// "depois" do Normal (10 pt, 1,15): o separador vem depois dele? e a 1ª nota?
cases.push({ name: 'en-after', docx: buildDocx({
  body: p(r('Texto') + eref(1) + r(' Hxg')) + fill(2) + p(r('Ultimo Hxg')),
  styles, defaults: docDefaults({ font: 'Arial', size: 11, after: 200, line: 276 }), settings: settings(),
  extraParts: { 'word/footnotes.xml': part('footnotes', 'footnote', ''), 'word/endnotes.xml': part('endnotes', 'endnote', enote(1, 'Nota de fim um.') + enote(2, 'x')) },
}) });
// geometria do separador com outras fontes no Normal (Calibri 11, Times 14)
for (const [nm, f, size] of [['sep-calibri', 'Calibri', 11], ['sep-times14', 'Times New Roman', 14]]) {
  cases.push({ name: nm, docx: buildDocx({
    body: p(r('Texto') + eref(1) + r(' rodape') + fref(1) + r(' Hxg')) + fill(2),
    styles, defaults: docDefaults({ font: f, size }), settings: settings(),
    extraParts: { 'word/footnotes.xml': part('footnotes', 'footnote', fnote(1, 'Nota de rodape.')), 'word/endnotes.xml': part('endnotes', 'endnote', enote(1, 'Nota de fim.')) },
  }) });
}
