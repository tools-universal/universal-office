/**
 * Ordem de textos do Excel (operadores < > =, critérios, SORT/MATCH…). A
 * implementação é UMA só, em collation.ts (agente FN-TEXT-DATE-LOOKUP): medida
 * com o =SORT de 172 textos (ASCII, Latin-1, sobrescritos, ligaduras, kana) e
 * com a lista de palavras do FN-STAT (test/stat.test.ts) — as duas batem.
 * Este módulo mantém os nomes usados pelos critérios (FN-STAT).
 */
export { compareText, textCollateEqual as textEquals } from './collation.js';
