// Controle de alterações. fin-*: o PDF normal do Word (visão final — o texto
// excluído some, a marca excluída junta o parágrafo ao seguinte, vale a
// formatação nova); mk-*: o PDF "com marcação" (word-export.ps1 exporta assim
// os casos mk-; sem revisão de formatação não há área de balões) — o texto
// excluído aparece tachado e ocupa a linha, inserção sublinhada, barras na margem.
// (Lista na marcação: o Word mostra o número antigo tachado ao lado do novo —
// "3.2." — e o item excluído com o número dele; ainda não fazemos: sem caso mk-list.)
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const D = 'w:date="2024-03-05T10:20:00Z"';
let id = 1;
const ins = (a, inner) => `<w:ins w:id="${id++}" w:author="${a}" ${D}>${inner}</w:ins>`;
const del = (a, text, rpr = '') => `<w:del w:id="${id++}" w:author="${a}" ${D}><w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:delText xml:space="preserve">${text}</w:delText></w:r></w:del>`;
const markDel = (a) => `<w:rPr><w:del w:id="${id++}" w:author="${a}" ${D}/></w:rPr>`;
const markIns = (a) => `<w:rPr><w:ins w:id="${id++}" w:author="${a}" ${D}/></w:rPr>`;
const defaults = docDefaults({ font: 'Arial', size: 11 });
const numbering = '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>';
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';

/** Texto com exclusões e inserções que mudam onde as linhas quebram. */
function textBody() {
  let b = '';
  b += p(del('Ana', 'Inicio excluido ') + r(lorem(30, 1)) + ins('Bruno', r(' trecho inserido no meio do paragrafo')) + r(` ${lorem(20, 2)}`));
  b += p(r(lorem(25, 3)) + del('Ana', ` ${lorem(18, 4)}`) + r(` ${lorem(22, 5)}`), '<w:jc w:val="both"/>');
  b += p(r(lorem(12, 6)) + del('Carla', ' palavras finais excluidas no fim do paragrafo'));
  b += p(r('Antes ') + del('Ana', 'X') + ins('Ana', r('Y')) + r(' depois ') + del('Bruno', 'troca') + ins('Bruno', r('substituicao')) + r('.'));
  b += p(del('Davi', 'Paragrafo inteiro excluido mas com a marca de paragrafo mantida.'));
  return b;
}

/** Marcas de parágrafo inseridas/excluídas (com e sem texto). */
function marksBody() {
  let b = '';
  b += p(r('Primeiro com marca excluida e texto que vai para o seguinte. '), `<w:jc w:val="center"/>${markDel('Ana')}`) + p(r('Seguinte ao da marca excluida.'), '<w:jc w:val="right"/>');
  b += p(r('Separador.'));
  b += p(del('Bruno', 'Todo excluido com a marca.'), markDel('Bruno')) + p(r('Depois do paragrafo todo excluido.'));
  b += p(r('Marca inserida aqui'), markIns('Carla')) + p(ins('Carla', r('Paragrafo novo inserido.')), markIns('Carla')) + p(r('Volta ao texto comum.'));
  return b;
}

/** Lista numerada com item excluído e item inserido. */
function listBody() {
  let b = '';
  b += p(r('Item um.'), NUM);
  b += p(del('Ana', 'Item dois excluido.'), `${NUM}${markDel('Ana')}`);
  b += p(r('Item tres.'), NUM);
  b += p(ins('Bruno', r('Item novo inserido.')), `${NUM}${markIns('Bruno')}`);
  b += p(r('Item quatro.'), NUM);
  return b;
}

/** Tabela com revisões nas células. */
function tableBody() {
  const cell = (inner) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
  return p(r('Antes da tabela.'))
    + '<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>'
    + `<w:tr>${cell(p(r(lorem(10, 7)) + del('Ana', ` ${lorem(8, 8)}`)))}${cell(p(ins('Bruno', r(lorem(12, 9)))))}</w:tr>`
    + `<w:tr>${cell(p(r('Celula com marca excluida '), markDel('Ana')) + p(r('e o seguinte.')))}${cell(p(r('Comum.')))}</w:tr></w:tbl>`
    + p(r('Depois da tabela.'));
}

/** Formatação controlada: a final é a nova (o PDF do Word sem marcação). */
function fmtBody() {
  return p(r('Texto ') + `<w:r><w:rPr><w:b/><w:sz w:val="32"/><w:rPrChange w:id="${id++}" w:author="Ana" ${D}><w:rPr><w:i/></w:rPr></w:rPrChange></w:rPr><w:t>formatado</w:t></w:r>` + r(' depois.'))
    + p(r(lorem(20, 10)), `<w:jc w:val="center"/><w:ind w:left="1440"/><w:pPrChange w:id="${id++}" w:author="Bruno" ${D}><w:pPr><w:jc w:val="right"/></w:pPr></w:pPrChange>`);
}

/** Movimentação (origem tachada dupla, destino sublinhado duplo). */
function moveBody() {
  return p(`<w:moveFromRangeStart w:id="${id++}" w:author="Davi" ${D} w:name="m1"/><w:moveFrom w:id="${id++}" w:author="Davi" ${D}><w:r><w:t>Frase que mudou de lugar.</w:t></w:r></w:moveFrom><w:moveFromRangeEnd w:id="${id - 2}"/>` + r(' Resto do primeiro.'))
    + p(r('Destino: ') + `<w:moveToRangeStart w:id="${id++}" w:author="Davi" ${D} w:name="m1"/><w:moveTo w:id="${id++}" w:author="Davi" ${D}><w:r><w:t>Frase que mudou de lugar.</w:t></w:r></w:moveTo><w:moveToRangeEnd w:id="${id - 2}"/>`);
}

const doc = (body, extra = {}) => buildDocx({ body, defaults, ...extra });
export const cases = [
  { name: 'fin-text', docx: doc(textBody()) },
  { name: 'fin-marks', docx: doc(marksBody()) },
  { name: 'fin-list', docx: doc(listBody(), { numbering }) },
  { name: 'fin-table', docx: doc(tableBody()) },
  { name: 'fin-fmt', docx: doc(fmtBody()) },
  { name: 'fin-move', docx: doc(moveBody()) },
  { name: 'mk-text', docx: doc(textBody()) },
  { name: 'mk-marks', docx: doc(marksBody()) },
  { name: 'mk-table', docx: doc(tableBody()) },
  { name: 'mk-move', docx: doc(moveBody()) },
];
