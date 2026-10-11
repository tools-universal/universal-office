// Altura do SEPARADOR das notas de rodapé: vale o parágrafo do separador em
// footnotes.xml (o Word grava "depois 0, simples") ou um parágrafo Normal (aqui 1,15 +
// depois 10 pt)? A linha da referência termina numa janela de ~1,9 pt em que só cabe
// com o separador simples. Arial 11; corpo A4 de 70,85 a 771,05 pt.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const ref = `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="1"/></w:r>`;
const note = '<w:footnote w:id="1"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Nota curta.</w:t></w:r></w:p></w:footnote>';
const footnotes = (sepPPr) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p>${sepPPr}<w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p>${sepPPr}<w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${note}</w:footnotes>`;
const SEP = '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>';
/** um parágrafo de altura exata empurra a referência para `top` (pt) */
const body = (top) => p(r('topo Hxg'), `<w:spacing w:after="0" w:line="${Math.round((top - 70.85) * 20)}" w:lineRule="exact"/>`)
  + p(r('Referencia') + ref + r(' Hxg')) + p(r('Depois Hxg')) + p(r('Fim Hxg'));
const D = (top, sepPPr) => buildDocx({ body: body(top), styles, defaults: docDefaults({ font: 'Arial', size: 11, after: 200, line: 276 }), extraParts: { 'word/footnotes.xml': strToU8(footnotes(sepPPr)) } });

export const cases = [];
// linha da referência terminando em ~746 pt: cabe só com o separador simples (12,65 pt)
cases.push({ name: 'fsep-simples', docx: D(733.35, SEP) });
// separador sem pPr próprio (herda o Normal 1,15 + depois)
cases.push({ name: 'fsep-normal', docx: D(733.35, '') });
// controle: cabe com qualquer separador
cases.push({ name: 'fsep-folga', docx: D(728, SEP) });
// varredura do topo da linha da referência (pt): onde o Word passa a levá-la para a próxima
for (const top of [716, 718, 720, 722, 724, 726]) cases.push({ name: `fsep-top${top}`, docx: D(top, SEP) });
// sem "depois" no parágrafo da referência
const D0 = (top) => buildDocx({ body: p(r('topo Hxg'), `<w:spacing w:after="0" w:line="${Math.round((top - 70.85) * 20)}" w:lineRule="exact"/>`) + p(r('Referencia') + ref + r(' Hxg'), '<w:spacing w:after="0"/>') + p(r('Depois Hxg')) + p(r('Fim Hxg')), styles, defaults: docDefaults({ font: 'Arial', size: 11, after: 200, line: 276 }), extraParts: { 'word/footnotes.xml': strToU8(footnotes(SEP)) } });
for (const top of [728, 731, 733.35]) cases.push({ name: `fsep-a0-top${Math.round(top)}`, docx: D0(top) });
