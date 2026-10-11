// Parágrafo com a MARCA excluída (revisão rastreada, w:pPr/w:rPr/w:del) e texto
// visível: no PDF (revisões aplicadas) o texto se junta ao parágrafo SEGUINTE, que
// fica com as propriedades dele — a marca que sobra: estilo (corpo da fonte dos
// runs sem formatação direta), recuos, alinhamento, espaçamento e numeração; o
// número do parágrafo excluído não é consumido. Em cadeia, vale a última marca.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const DELMARK = '<w:rPr><w:del w:id="1" w:author="Autor" w:date="2024-01-01T00:00:00Z"/></w:rPr>';
const styles = `<w:style w:type="paragraph" w:styleId="Grande"><w:name w:val="Grande"/><w:pPr><w:spacing w:before="240" w:after="240"/><w:ind w:left="1134"/><w:jc w:val="right"/></w:pPr><w:rPr><w:sz w:val="32"/></w:rPr></w:style>`
  + `<w:style w:type="paragraph" w:styleId="Pequeno"><w:name w:val="Pequeno"/><w:pPr><w:ind w:left="567" w:right="2000"/></w:pPr><w:rPr><w:sz w:val="16"/><w:i/></w:rPr></w:style>`;
const numbering = `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>`;
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';

let body = '';
body += p(r('Primeiro excluido pequeno. '), `<w:pStyle w:val="Pequeno"/>${DELMARK}`) + p(r('Segundo grande.'), '<w:pStyle w:val="Grande"/>');
body += p(r('Separador normal.'));
body += p(r('Primeiro grande excluido. '), `<w:pStyle w:val="Grande"/>${DELMARK}`) + p(r('Segundo pequeno.'), '<w:pStyle w:val="Pequeno"/>');
body += p(r('Separador normal.'));
body += p(r('Numerado excluido. '), `${NUM}${DELMARK}`) + p(r('Sem numero.'));
body += p(r('Sem numero excluido. '), DELMARK) + p(r('Numerado.'), NUM);
body += p(r('Numerado normal.'), NUM);
body += p(r('Cadeia um. '), `<w:jc w:val="center"/>${DELMARK}`) + p(r('Cadeia dois. '), `<w:jc w:val="right"/>${DELMARK}`) + p(r('Cadeia tres.'), '<w:jc w:val="left"/><w:ind w:left="2268"/>');
body += p(r(lorem(30, 3) + ' '), `<w:jc w:val="both"/>${DELMARK}`) + p(r(lorem(30, 4)), '<w:jc w:val="both"/><w:ind w:left="1701"/>');
// numa célula de tabela também
const cell = (inner) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
body += `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid><w:tr>`
  + cell(p(r(lorem(12, 7) + ' '), DELMARK) + p(r(lorem(12, 8)), '<w:pStyle w:val="Pequeno"/>'))
  + cell(p(r('Excluido na celula. '), `<w:pStyle w:val="Grande"/>${DELMARK}`) + p(r('Fica na celula.'), '<w:jc w:val="center"/>'))
  + `</w:tr></w:tbl>`;
body += p(r('Depois da tabela.'));

export const cases = [{ name: 'dm-juncao', docx: buildDocx({ body, styles, numbering, defaults: docDefaults({ font: 'Arial', size: 11 }) }) }];
