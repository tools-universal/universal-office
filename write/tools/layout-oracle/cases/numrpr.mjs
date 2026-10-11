// Número da lista com espaçamento de caracteres (w:spacing) e escala (w:w) no rPr do
// NÍVEL: a largura do número muda — e com ela a parada de tabulação que o texto usa
// (custom em 426; a seguinte, além da margem). Calibri Light 11; "10.1." tem ~22 pt
// sem ajustes e ~21 pt com espaçamento -0,25 pt e escala 102%.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const lvl0 = '<w:lvl w:ilvl="0"><w:start w:val="10"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl>';
const lvl1 = (rPr) => `<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="721" w:hanging="721"/></w:pPr><w:rPr>${rPr}</w:rPr></w:lvl>`;
const NUM = (ilvl) => `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr>`;
const PPR = '<w:tabs><w:tab w:val="left" w:pos="426"/><w:tab w:val="left" w:pos="11057"/></w:tabs><w:ind w:left="0" w:right="-1" w:firstLine="0"/><w:jc w:val="both"/>';
const D = (rPr) => buildDocx({
  body: p(r('Titulo Hxg'), NUM(0)) + p(r('A ' + lorem(30, 3)), NUM(1) + PPR) + p(r('A ' + lorem(30, 4)), NUM(1) + PPR) + p(r('Fim Hxg')),
  numbering: `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="multilevel"/>${lvl0}${lvl1(rPr)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>`,
  defaults: docDefaults({ font: 'Calibri Light', size: 11 }),
});

export const cases = [];
cases.push({ name: 'nr-plain', docx: D('') });
cases.push({ name: 'nr-spacing-w', docx: D('<w:spacing w:val="-5"/><w:w w:val="102"/>') });
cases.push({ name: 'nr-spacing', docx: D('<w:spacing w:val="-5"/>') });
cases.push({ name: 'nr-w90', docx: D('<w:w w:val="90"/>') });
// varredura: o número literal "10.1." com (w, espaçamento) e uma parada custom em
// 400..454 twips (e a seguinte além da margem): a partir de qual parada o texto
// passa a caber na 1ª linha — a largura efetiva do número no Word
{
  const lvlLit = (rPr) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="10.1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="721" w:hanging="721"/></w:pPr><w:rPr>${rPr}</w:rPr></w:lvl>`;
  for (const [tag, rPr] of [['w102sp5', '<w:spacing w:val="-5"/><w:w w:val="102"/>'], ['w102', '<w:w w:val="102"/>'], ['sp5', '<w:spacing w:val="-5"/>'], ['plain', '']]) {
    let body = '';
    for (let pos = 400; pos <= 454; pos += 3) body += p(r(`A ${pos} ` + lorem(12, pos)), `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:tabs><w:tab w:val="left" w:pos="${pos}"/><w:tab w:val="left" w:pos="11057"/></w:tabs><w:ind w:left="0" w:firstLine="0"/>`);
    cases.push({ name: `nrs-${tag}`, docx: buildDocx({ body, numbering: `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>${lvlLit(rPr)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>`, defaults: docDefaults({ font: 'Calibri Light', size: 11 }) }) });
  }
}
