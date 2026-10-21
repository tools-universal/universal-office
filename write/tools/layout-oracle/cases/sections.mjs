// Frente Seções e colunas: paginação dos tipos de quebra de seção (próxima
// página, contínua, par, ímpar, PRÓXIMA COLUNA), colunas iguais/desiguais e
// quebra de coluna — no XML que o Word grava ao inserir pelo menu (oráculo de
// edição em tools/sections-lab). nextColumn: a seção seguinte começa na
// próxima coluna da mesma página? E quando a geometria de colunas muda?
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pg = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
/** sectPr com tipo (undefined = próxima página) e w:cols */
const sect = (type, cols = '<w:cols w:space="708"/>') => `<w:sectPr>${type ? `<w:type w:val="${type}"/>` : ''}${pg}${cols}<w:docGrid w:linePitch="360"/></w:sectPr>`;
const cols = (n, extra = '') => `<w:cols w:num="${n}"${extra} w:space="708"/>`;
/** parágrafo que ENCERRA a seção (sectPr no pPr), com texto */
const endSect = (text, sp) => `<w:p><w:pPr>${sp}</w:pPr>${r(text)}</w:p>`;
const para = (words, seed) => p(r(lorem(words, seed)));
const many = (n, words, seed) => Array.from({ length: n }, (_, i) => para(words, seed + i)).join('');
const defaults = docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 });
const doc = (body, last) => buildDocx({ body, sect: last, defaults });

export const cases = [
  // tipos de quebra (1 coluna)
  { name: 'sb-next', docx: doc(para(30, 1) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect(undefined)) },
  { name: 'sb-cont', docx: doc(para(30, 1) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect('continuous')) },
  { name: 'sb-even', docx: doc(para(30, 1) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect('evenPage')) },
  { name: 'sb-odd', docx: doc(para(30, 1) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect('oddPage')) },
  // seção 1 com 2 páginas: ímpar → página 3 sem página em branco; par → página em branco
  { name: 'sb-odd-2pg', docx: doc(many(14, 60, 3) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect('oddPage')) },
  { name: 'sb-even-2pg', docx: doc(many(14, 60, 3) + endSect('Fim da primeira Hxg', sect(undefined)) + para(30, 2), sect('evenPage')) },
  // colunas iguais (fluxo para a 2ª/3ª coluna e página seguinte), com linha
  { name: 'cols2-flow', docx: doc(many(16, 70, 5), sect(undefined, cols(2))) },
  { name: 'cols3-sep', docx: doc(many(16, 70, 7), sect(undefined, cols(3, ' w:sep="1"'))) },
  // desiguais (predefinições Esquerda/Direita: grade de 3 — 2362 | 708 | 5434)
  { name: 'cols-left', docx: doc(many(12, 70, 9), sect(undefined, '<w:cols w:num="2" w:space="708" w:equalWidth="0"><w:col w:w="2362" w:space="708"/><w:col w:w="5434" w:space="708"/></w:cols>')) },
  { name: 'cols-right', docx: doc(many(12, 70, 9), sect(undefined, '<w:cols w:num="2" w:space="708" w:equalWidth="0"><w:col w:w="5434" w:space="708"/><w:col w:w="2362" w:space="708"/></w:cols>')) },
  // quebra de coluna como o Word a grava (abre o parágrafo seguinte)
  { name: 'cb-2col', docx: doc(para(40, 11) + p('<w:r><w:br w:type="column"/><w:t xml:space="preserve">Depois da quebra Hxg</w:t></w:r>') + para(40, 12), sect(undefined, cols(2))) },
  // parte do texto em 2 colunas (texto selecionado → duas quebras contínuas)
  { name: 'cont-mid-2col', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + many(3, 60, 14) + endSect('Fim das colunas Hxg', sect('continuous', cols(2))) + para(40, 17), sect('continuous')) },
  // PRÓXIMA COLUNA: 2 → 2 com a 1ª coluna pela metade
  { name: 'nc-2to2', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(2, 60, 22), sect('nextColumn', cols(2))) },
  // … terminando na 2ª coluna: a seção seguinte vai para a página seguinte
  { name: 'nc-2to2-col2', docx: doc(many(12, 70, 24) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(2, 60, 22), sect('nextColumn', cols(2))) },
  // geometria de colunas diferente
  { name: 'nc-2to3', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(3, 60, 22), sect('nextColumn', cols(3))) },
  { name: 'nc-2to1', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(2, 60, 22), sect('nextColumn')) },
  { name: 'nc-1to2', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined)) + many(2, 60, 22), sect('nextColumn', cols(2))) },
  { name: 'nc-1to1', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined)) + many(2, 60, 22), sect('nextColumn')) },
  // seção A contínua de 2 colunas no meio da página e B nextColumn
  { name: 'nc-after-cont', docx: doc(para(40, 30) + endSect('Antes Hxg', sect(undefined)) + many(2, 50, 31) + endSect('Fim da secao A Hxg', sect('continuous', cols(2))) + many(2, 50, 33), sect('nextColumn', cols(2))) },
  // mesma contagem, espaçamento/margem diferentes; "antes" no 1º parágrafo da coluna
  { name: 'nc-2to2-space', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(2, 60, 22), sect('nextColumn', '<w:cols w:num="2" w:space="1416"/>')) },
  { name: 'nc-2to2-margin', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + many(2, 60, 22), sect('nextColumn', cols(2)).replace('w:left="1701"', 'w:left="2268"')) },
  { name: 'nc-2to2-before', docx: doc(many(2, 60, 20) + endSect('Fim da secao A Hxg', sect(undefined, cols(2))) + p(r(lorem(60, 22)), '<w:spacing w:before="480"/>') + para(60, 23), sect('nextColumn', cols(2))) },
];

// topo das colunas de uma seção contínua no meio da página e onde a seguinte começa
const sp = (b, a) => `<w:spacing w:before="${b}" w:after="${a}"/>`;
const longP = (seed, ppr = '') => p(r(lorem(160, seed)), ppr);
cases.push(
  // 1º parágrafo das colunas com "antes" 24 pt (maior que o "depois" 8 do anterior)
  { name: 'cont-2col-before', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + longP(40, sp(480, 160)) + endSect('Fim das colunas Hxg', sect('continuous', cols(2))) + para(40, 17), sect('continuous')) },
  // último parágrafo das colunas sem "depois"; seguinte sem "antes"
  { name: 'cont-2col-after0', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + longP(41) + `<w:p><w:pPr>${sp(0, 0)}${sect('continuous', cols(2))}</w:pPr>${r('Fim das colunas Hxg')}</w:p>` + para(40, 17), sect('continuous')) },
  // seguinte com "antes" 24 pt
  { name: 'cont-2col-nextbefore', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + longP(42) + endSect('Fim das colunas Hxg', sect('continuous', cols(2))) + p(r(lorem(40, 17)), sp(480, 160)), sect('continuous')) },
  // a 1ª coluna termina no fim de um parágrafo (o "depois" dele conta na altura?)
  { name: 'cont-2col-parend', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + many(4, 45, 43) + endSect('Fim das colunas Hxg', sect('continuous', cols(2))) + para(40, 17), sect('continuous')) },
  // três colunas
  { name: 'cont-3col', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + many(3, 70, 44) + endSect('Fim das colunas Hxg', sect('continuous', cols(3))) + para(40, 17), sect('continuous')) },
);

// linha entre colunas (w:sep): extensão vertical (página cheia, coluna vazia,
// seção contínua equilibrada) — medida pelos caminhos do PDF (tools/sections-lab/pdf-paths.py)
const sepCols = (n) => `<w:cols w:num="${n}" w:sep="1" w:space="708"/>`;
cases.push(
  { name: 'sep-2col-partial', docx: doc(many(2, 50, 50), sect(undefined, sepCols(2))) },
  { name: 'sep-3col-two', docx: doc(many(9, 70, 51), sect(undefined, sepCols(3))) },
  { name: 'sep-bottom', docx: doc(many(16, 70, 52), sect(undefined, sepCols(2)).replace('w:bottom="1417"', 'w:bottom="2835"')) },
  { name: 'sep-cont', docx: doc(para(40, 13) + endSect('Antes Hxg', sect(undefined)) + many(3, 60, 53) + endSect('Fim das colunas Hxg', sect('continuous', sepCols(2))) + para(40, 17), sect('continuous')) },
);
