// Campos da frente Links e referências na exportação: com resultado em cache
// ERRADO, o que o Word recalcula ao gerar o PDF? REF pelo trecho do indicador
// (não o parágrafo inteiro), REF \p (acima/abaixo, inclusive no mesmo
// parágrafo), REF \w/\n com lista de vários níveis, NOTEREF (nota adiante),
// STYLEREF (\s, \n, texto) e SEQ \s (reinício por capítulo). Arial 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const fld = (instr, cached) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t xml:space="preserve">${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const bs = (id, name) => `<w:bookmarkStart w:id="${id}" w:name="${name}"/>`;
const be = (id) => `<w:bookmarkEnd w:id="${id}"/>`;
const D = (body, extra = {}) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), ...extra });

export const cases = [];

// REF pelo trecho exato e REF de legenda com SEQ dentro
cases.push({ name: 'ref-range', docx: D(
  p(r('Alfa ') + bs(1, 'meio') + r('beta gama') + be(1) + r(' delta Hxg'))
  + p(bs(2, 'cap') + r('Figura ') + fld('SEQ Figura \\* ARABIC', '1') + r(' - Legenda') + be(2) + r(' resto'))
  + p(r('R1: [') + fld('REF meio \\h', 'CACHE1') + r('] R2: [') + fld('REF cap \\h', 'CACHE2') + r('] Hxg')),
) });

// REF \p: antes, no mesmo parágrafo (antes e depois do indicador) e depois
cases.push({ name: 'ref-pos', docx: D(
  p(r('Antes: ') + fld('REF alvo \\p \\h', 'XXX') + r(' Hxg'))
  + p(r('Mesmo ') + fld('REF alvo \\p \\h', 'YYY') + r(' ') + bs(1, 'alvo') + r('alvo') + be(1) + r(' ') + fld('REF alvo \\p \\h', 'ZZZ') + r(' Hxg'))
  + p(r('Depois: ') + fld('REF alvo \\p \\h', 'WWW') + r(' Hxg')),
) });

// REF \n \r \w (\d) numa lista "1." / "a)"
const numbering = '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/>'
  + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl>'
  + '<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>'
  + '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
const li = (lvl, text, bm) => `<w:p><w:pPr><w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="1"/></w:numPr></w:pPr>${bm ? bs(bm[0], bm[1]) : ''}${r(text)}${bm ? be(bm[0]) : ''}</w:p>`;
cases.push({ name: 'ref-num', docx: D(
  li(0, 'Item um') + li(0, 'Item dois') + li(1, 'Sub um') + li(1, 'Sub dois', [1, 'sub'])
  + p(r('n=') + fld('REF sub \\n \\h', 'N?') + r(' r=') + fld('REF sub \\r \\h', 'R?') + r(' w=') + fld('REF sub \\w \\h', 'W?') + r(' d=') + fld('REF sub \\w \\h \\d "-"', 'D?') + r(' Hxg')),
  { numbering },
) });

// NOTEREF para nota que vem depois e para a anterior
const notes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`
  + '<w:footnote w:id="1"><w:p><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Nota um.</w:t></w:r></w:p></w:footnote>'
  + '<w:footnote w:id="2"><w:p><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Nota dois.</w:t></w:r></w:p></w:footnote></w:footnotes>';
const fref = (id) => `<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
cases.push({ name: 'noteref', docx: D(
  p(r('Adiante: [') + fld('NOTEREF n2 \\h', '77') + r('] Hxg'))
  + p(r('Um') + bs(1, 'n1') + fref(1) + be(1) + r(' dois') + bs(2, 'n2') + fref(2) + be(2) + r(' Hxg'))
  + p(r('Antes: [') + fld('NOTEREF n1 \\h', '88') + r('] Hxg')),
  { extraParts: { 'word/footnotes.xml': strToU8(notes) } },
) });

// STYLEREF e SEQ \s com títulos numerados "Cap %1" / "%1.%2"
const hstyles = '<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="2"/></w:numPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="2"/></w:numPr><w:outlineLvl w:val="1"/></w:pPr></w:style>';
const hnum = '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="multilevel"/>'
  + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo1"/><w:lvlText w:val="Cap %1"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="0" w:firstLine="0"/></w:pPr></w:lvl>'
  + '<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo2"/><w:lvlText w:val="%1.%2"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="0" w:firstLine="0"/></w:pPr></w:lvl>'
  + '</w:abstractNum><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>';
const h = (lvl, t) => `<w:p><w:pPr><w:pStyle w:val="Ttulo${lvl}"/></w:pPr>${r(t)}</w:p>`;
cases.push({ name: 'styleref-seq', docx: D(
  p(r('Antes ') + fld('STYLEREF 1 \\s', 'S?') + r(' ') + fld('STYLEREF 1', 'T?') + r(' Hxg'))
  + h(1, 'Um')
  + p(r('a ') + fld('STYLEREF 1 \\s', 'S?') + r(' b ') + fld('STYLEREF 1 \\n', 'N?') + r(' c ') + fld('STYLEREF 1', 'T?') + r(' d ') + fld('SEQ Fig \\s 1', '9') + r(' Hxg'))
  + h(2, 'Um um')
  + p(r('e ') + fld('STYLEREF 2 \\s', 'S?') + r(' f ') + fld('SEQ Fig \\s 1', '9') + r(' g ') + fld('SEQ Fig \\s 2', '9') + r(' Hxg'))
  + h(1, 'Dois')
  + p(r('h ') + fld('STYLEREF 1 \\s', 'S?') + r(' i ') + fld('SEQ Fig \\s 1', '9') + r(' j ') + fld('SEQ Fig', '9') + r(' Hxg')),
  { styles: hstyles, numbering: hnum },
) });
