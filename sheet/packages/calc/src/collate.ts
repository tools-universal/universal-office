/**
 * Ordem de textos do Excel (operadores < > =, critérios, SORT/MATCH…). A
 * implementação é UMA só, em collation.ts (agente FN-TEXT-DATE-LOOKUP): medida
 * com o =SORT de 172 textos (ASCII, Latin-1, sobrescritos, ligaduras, kana) e
 * com a lista de palavras do FN-STAT (test/stat.test.ts) — as duas batem.
 * Este módulo mantém os nomes usados pelos critérios (FN-STAT).
 */
export { compareText, textCollateEqual as textEquals } from './collation.js';

/** Número arredondado a 15 algarismos significativos (como o Excel compara). */
export function round15(x: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  return Number(x.toPrecision(15));
}

/**
 * Compara números como os operadores do Excel: iguais quando coincidem com 15
 * algarismos significativos (=0,1+0,2=0,3 → VERDADEIRO; =1E+15+5>1E+15 →
 * VERDADEIRO, mas +4 → FALSO; medido pelo CORE). Dono desta parte: CORE.
 */
export function compareNumbers(a: number, b: number): number {
  if (a === b) return 0;
  const m = Math.max(Math.abs(a), Math.abs(b));
  if (Math.abs(a - b) > m * 1e-13) return a < b ? -1 : 1;
  const x = round15(a), y = round15(b);
  return x === y ? 0 : x < y ? -1 : 1;
}
