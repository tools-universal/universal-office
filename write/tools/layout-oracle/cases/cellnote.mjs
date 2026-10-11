// Referência de nota de rodapé em célula DEPOIS de uma célula com gridSpan (ou de
// gridBefore): a nota vai para o pé da página e a linha da referência desce se a nota
// não couber, como nas células simples (oráculo notes, fn-cell-late)?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const styles = '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
  + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
const ref = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${text}</w:t></w:r></w:p></w:footnote>`;
const footnotesXml = (notes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${notes}</w:footnotes>`;
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const cell = (c, span = 1) => `<w:tc><w:tcPr><w:tcW w:w="${2000 * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}</w:tcPr>${c}</w:tc>`;
const tbl = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid>${'<w:gridCol w:w="2000"/>'.repeat(4)}</w:tblGrid>${rows.map((x) => `<w:tr>${x}</w:tr>`).join('')}</w:tbl>`;
const fill = (n) => Array.from({ length: n }, (_, k) => p(r(`enchimento ${k + 1} Hxg`))).join('');
const D = (body, notes) => buildDocx({ body, styles, defaults: docDefaults({ font: 'Arial', size: 11 }), extraParts: { 'word/footnotes.xml': strToU8(footnotesXml(notes)) } });
const longNote = note(1, 'Nota longa da celula depois da mesclada '.repeat(8));
export const cases = [];
// nota no meio da página: aparece no pé
const span = (k, withRef) => cell(p(r(`mesclada ${k} Hxg`)), 2) + cell(p(r(`livre ${k} Hxg`))) + cell(p(r(`nota ${k}`) + (withRef ? ref(1) : '') + r(' Hxg')));
cases.push({ name: 'cn-span-mid', docx: D(fill(5) + tbl(Array.from({ length: 6 }, (_, k) => span(k + 1, k === 2))) + p(r('Fim Hxg')), note(1, 'Nota da celula depois da mesclada.')) });
// tabela perto do fim da página: a linha com a referência desce se a nota não couber
cases.push({ name: 'cn-span-late', docx: D(fill(20) + tbl(Array.from({ length: 30 }, (_, k) => span(k + 1, k === 26))) + p(r('Fim Hxg')), longNote) });
// referência mais acima: as linhas seguintes descem para dar lugar à nota no pé
cases.push({ name: 'cn-span-room', docx: D(fill(20) + tbl(Array.from({ length: 30 }, (_, k) => span(k + 1, k === 19))) + p(r('Fim Hxg')), note(1, 'Nota media da celula depois da mesclada '.repeat(6))) });
// linha como a de formulário: 5 células com gridSpan 1/2/2/3/2 (grade de 10), centradas na
// vertical, referência na última; perto do pé da página
const grid10 = `<w:tblGrid>${'<w:gridCol w:w="800"/>'.repeat(10)}</w:tblGrid>`;
const c5 = (k, withRef) => [1, 2, 2, 3, 2].map((sp, j) => `<w:tc><w:tcPr><w:tcW w:w="${800 * sp}" w:type="dxa"/>${sp > 1 ? `<w:gridSpan w:val="${sp}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${p(r(`c${j} l${k}`) + (withRef && j === 4 ? ref(1) : '') + r(' Hxg'))}</w:tc>`).join('');
const tbl10 = (rows) => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}</w:tblPr>${grid10}${rows.map((x) => `<w:tr>${x}</w:tr>`).join('')}</w:tbl>`;
cases.push({ name: 'cn-grid10-room', docx: D(fill(20) + tbl10(Array.from({ length: 30 }, (_, k) => c5(k + 1, k === 19))) + p(r('Fim Hxg')), note(1, 'Nota media da celula de formulario '.repeat(6))) });
