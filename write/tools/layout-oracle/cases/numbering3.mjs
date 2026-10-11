// Numeração que depende do motor (não só do NumberingState):
//  - pg2-*: PDF do Word aberto e exportado direto (sem repaginar): a lista com
//    startOverride RECOMEÇA no 1º parágrafo dela depois do bloco que abre a
//    2ª página (os formatados na abertura guardam o número; com Repaginate()
//    antes da exportação não acontece). Sem override, nada muda.
//  - hidmark-*: parágrafo numerado com marca oculta e texto visível junta-se
//    ao seguinte — o número que aparece é o dele.
//  - hdr-*: lista no cabeçalho.
//  - ref-*: REF \r/\n/\w recalculados na exportação (o resultado guardado não vale).
//  - del-*: parágrafo de marca excluída (revisão) com o texto todo excluído some
//    e não conta na lista.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

function abstractNum(id, { fmt = [], text = [] } = {}) {
  let x = `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="multilevel"/>`;
  for (let i = 0; i < 9; i++) {
    const t = text[i] ?? Array.from({ length: i + 1 }, (_, k) => `%${k + 1}.`).join('');
    x += `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt[i] ?? 'decimal'}"/>`
      + `<w:lvlText w:val="${t}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + 360 * i}" w:hanging="720"/></w:pPr></w:lvl>`;
  }
  return x + '</w:abstractNum>';
}
const ALL1 = Array.from({ length: 9 }, (_, i) => `<w:lvlOverride w:ilvl="${i}"><w:startOverride w:val="1"/></w:lvlOverride>`).join('');
const num = (numId, absId, ovr = '') => `<w:num w:numId="${numId}"><w:abstractNumId w:val="${absId}"/>${ovr}</w:num>`;
const NUMPR = (numId, ilvl = 0) => `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`;
const item = (t, numId, ilvl = 0, extra = '') => p(r(t), NUMPR(numId, ilvl) + extra);
const DEF = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
const add = (name, opts) => cases.push({ name, docx: buildDocx({ defaults: DEF, ...opts }) });

// ── 2ª página ──
const N = 60;
const seq1 = (numId) => Array.from({ length: N }, (_, k) => item(`Item ${k + 1}`, numId)).join('');
add('pg2-restart', { body: seq1(2), numbering: abstractNum(1) + num(2, 1, ALL1) });
add('pg2-noovr', { body: seq1(1), numbering: abstractNum(1) + num(1, 1) });
// o parágrafo que transborda é texto comum dividido entre as páginas
add('pg2-split', {
  body: Array.from({ length: 52 }, (_, k) => item(`Item ${k + 1}`, 2)).join('') + p(lorem(160, 3)) + Array.from({ length: 6 }, (_, k) => item(`Item ${k + 53}`, 2)).join(''),
  numbering: abstractNum(1) + num(2, 1, ALL1),
});
// multinível: o 1º depois do bloco é de nível 1
add('pg2-level1', {
  body: Array.from({ length: N }, (_, k) => item(`Item ${k + 1}`, 2, k % 3 === 0 ? 0 : 1)).join(''),
  numbering: abstractNum(1) + num(2, 1, ALL1),
});
// quebra de página manual no fim da 1ª página
add('pg2-pagebreak', {
  body: Array.from({ length: 10 }, (_, k) => item(`Item ${k + 1}`, 2)).join('') + p(r('Fim') + '<w:r><w:br w:type="page"/></w:r>')
    + Array.from({ length: 5 }, (_, k) => item(`Item ${k + 11}`, 2)).join(''),
  numbering: abstractNum(1) + num(2, 1, ALL1),
});
// cabeçalho alto empurra o corpo: na abertura a 1ª página não o desconta e
// cabe mais (o recomeço vem mais adiante na 2ª página)
const HDR6 = Array.from({ length: 6 }, (_, k) => p(r(`Cabecalho ${k + 1}`))).join('');
add('pg2-header', { body: seq1(2), numbering: abstractNum(1) + num(2, 1, ALL1), headers: { default: HDR6 } });
add('pg2-header-noovr', { body: seq1(1), numbering: abstractNum(1) + num(1, 1), headers: { default: HDR6 } });
// dois w:num com override, ambos atravessando a quebra
add('pg2-two', {
  body: Array.from({ length: N }, (_, k) => item(`Item ${k + 1}`, k % 2 ? 3 : 2)).join(''),
  numbering: abstractNum(1) + abstractNum(4, { fmt: ['lowerLetter'], text: ['%1)'] }) + num(2, 1, ALL1) + num(3, 4, ALL1),
});

// ── marca oculta ──
const HID = '<w:rPr><w:vanish/></w:rPr>';
add('hidmark-num', {
  body: p(r('Antes Hxg')) + item('Um', 2) + p(r('Junta '), NUMPR(2) + HID) + p(r('seguinte Hxg')) + item('Tres', 2) + p(r('Depois Hxg')),
  numbering: abstractNum(1) + num(2, 1),
});
add('hidmark-num2', {
  body: p(r('Antes Hxg')) + item('Um', 2) + p(r('Junta '), NUMPR(2) + HID) + item('Dois Hxg', 2) + item('Tres', 2) + p(r('Depois Hxg')),
  numbering: abstractNum(1) + num(2, 1),
});
// recuos/alinhamento da linha juntada: de qual dos dois parágrafos?
const LONG = 'Junta ' + lorem(40, 7) + ' ';
add('hidmark-ind', {
  body: p(r('Antes Hxg')) + item('Um', 2) + p(r(LONG), NUMPR(2) + HID) + p(r('seguinte ' + lorem(30, 8)), '<w:ind w:left="2880"/><w:jc w:val="right"/>') + item('Tres', 2),
  numbering: abstractNum(1) + num(2, 1),
});
add('hidmark-ind2', {
  body: p(r('Antes Hxg')) + p(r(LONG), '<w:ind w:left="1440" w:hanging="360"/>' + HID) + p(r('seguinte ' + lorem(30, 8)), '<w:ind w:left="2880"/><w:jc w:val="right"/>') + p(r('Depois Hxg')),
});
// marca oculta SEM número juntando-se a um parágrafo numerado
add('hidmark-num3', {
  body: p(r('Antes Hxg')) + item('Um', 2) + p(r('Junta '), HID) + item('Dois Hxg', 2) + item('Tres', 2) + p(r('Depois Hxg')),
  numbering: abstractNum(1) + num(2, 1),
});

// ── cabeçalho ──
const BUL = '<w:abstractNum w:abstractNumId="9"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>';
add('hdr-list', {
  body: item('Corpo um', 2) + item('Corpo dois', 2) + p(r('Fim') + '<w:r><w:br w:type="page"/></w:r>') + item('Corpo tres', 2),
  headers: { default: p(r('Cabecalho')) + item('Marcador', 9) + item('Numero', 2) },
  numbering: abstractNum(1) + BUL + num(2, 1) + num(9, 9),
});

// ── REF ──
const fld = (instr, cached) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${r(cached)}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const bm = (id, name, runs) => `<w:bookmarkStart w:id="${id}" w:name="${name}"/>${runs}<w:bookmarkEnd w:id="${id}"/>`;
const pn = (runs, numId, ilvl) => `<w:p><w:pPr>${NUMPR(numId, ilvl)}</w:pPr>${runs}</w:p>`;
add('ref-num', {
  body: pn(r('Titulo um'), 2, 0)
    + pn(bm(1, '_Ref1', r('Alvo um')), 2, 1)
    + pn(r('Item'), 2, 2)
    + pn(bm(2, '_Ref2', r('Alvo dois')), 2, 2)
    + p(r('R ') + fld('REF _Ref1 \\r \\h', '9.9') + r(' N ') + fld('REF _Ref2 \\n \\h', '9.9') + r(' W ') + fld('REF _Ref2 \\w \\h', '9.9') + r(' X ') + fld('REF _Ref2 \\r \\h', '9.9'))
    + p(r('F ') + fld('REF _Ref3 \\r \\h', '9.9') + r(' T ') + fld('REF _Ref1 \\h', 'velho'))
    + pn(r('Titulo dois'), 2, 0)
    + pn(r('Sub'), 2, 1)
    + p(r('Em 2.1: ') + fld('REF _Ref2 \\r \\h', '9.9') + r(' / ') + fld('REF _Ref1 \\r \\h', '9.9'))
    + pn(bm(3, '_Ref3', r('Alvo tres')), 2, 1)
    + p(bm(4, '_Ref4', r('Sem numero')) + r(' Z ') + fld('REF _Ref4 \\r \\h', '9.9')),
  numbering: abstractNum(1) + num(2, 1),
});

// ── marca de parágrafo excluída (revisão) ──
const DEL = (t) => `<w:del w:id="91" w:author="Autor" w:date="2024-01-01T00:00:00Z"><w:r><w:delText xml:space="preserve">${t}</w:delText></w:r></w:del>`;
add('del-mark', {
  body: p(r('Antes Hxg')) + item('Um', 2) + item('Dois', 2)
    + `<w:p><w:pPr>${NUMPR(2)}<w:rPr><w:del w:id="90" w:author="Autor" w:date="2024-01-01T00:00:00Z"/></w:rPr></w:pPr>${DEL('Excluido')}</w:p>`
    + item('Tres', 2) + p(r('Depois Hxg')),
  numbering: abstractNum(1, { fmt: ['lowerLetter'], text: ['%1)'] }) + num(2, 1),
});
