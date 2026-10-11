// Espaçamento automático (beforeAutospacing/afterAutospacing, "HTML") entre itens
// de lista: o Word o suprime entre parágrafos numerados/com marcador? Só na mesma
// lista? E com o item de "antes/depois" explícito 0 ao lado de um automático?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const AUTO = '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1"/>';
const ZERO = '<w:spacing w:before="0" w:after="0"/>';
const num = (id, ilvl = 0) => `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${id}"/></w:numPr>`;
const lvl = (fmt, text) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
const numbering = `<w:abstractNum w:abstractNumId="1">${lvl('decimal', '%1)')}</w:abstractNum><w:abstractNum w:abstractNumId="2">${lvl('bullet', '•')}</w:abstractNum>`
  + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num><w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>';
const D = (body) => buildDocx({ body, numbering, defaults: docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 }) });
const it = (t, n, sp = AUTO) => p(r(t), `${sp}${n ? num(n) : ''}`);

export const cases = [];
// todos automáticos, mesma lista (numerada / marcadores), com parágrafos automáticos antes e depois
cases.push({ name: 'asl-num', docx: D(it('Antes Hxg', 0) + it('item um Hxg', 1) + it('item dois Hxg', 1) + it('item tres Hxg', 1) + it('Depois Hxg', 0)) });
cases.push({ name: 'asl-bullet', docx: D(it('Antes Hxg', 0) + it('item um Hxg', 2) + it('item dois Hxg', 2) + it('item tres Hxg', 2) + it('Depois Hxg', 0)) });
// listas diferentes lado a lado (numId 1 e 3 do mesmo abstrato; numerada × marcadores)
cases.push({ name: 'asl-two-lists', docx: D(it('item um Hxg', 1) + it('item dois Hxg', 1) + it('outra um Hxg', 3) + it('outra dois Hxg', 3)) });
cases.push({ name: 'asl-num-bullet', docx: D(it('item um Hxg', 1) + it('item dois Hxg', 1) + it('marca um Hxg', 2) + it('marca dois Hxg', 2)) });
// item com espaçamento explícito 0 seguido de item automático (e o contrário)
cases.push({ name: 'asl-zero-auto', docx: D(it('Antes Hxg', 0) + it('item um Hxg', 1, ZERO) + it('item dois Hxg', 1) + it('item tres Hxg', 1, ZERO) + it('Depois Hxg', 0)) });
// item automático de lista depois de parágrafo comum com espaçamento explícito
cases.push({ name: 'asl-plain-auto', docx: D(p(r('Antes Hxg'), '<w:spacing w:before="0" w:after="200"/>') + it('item um Hxg', 1) + it('item dois Hxg', 1) + p(r('Depois Hxg'), '<w:spacing w:before="300" w:after="0"/>')) });
