/**
 * Classificar (linhas de tabela e parágrafos) como o Word 365 pt-BR (medido em
 * write/tools/table-lab, experimentos sort-*):
 * - texto: a colação do Windows ("(a)" < "_x" < "10" < "9" < "a" < "Á" < "aá");
 *   sem diferenciar maiúsculas, as iguais ficam na ordem original (estável); com
 *   diferenciar, a minúscula vem antes ("a" < "A" < "á" < "Á"); vazio primeiro;
 * - número: o número do início do texto ("2 itens" = 2, "R$ 3" = 3, "(4)" = −4,
 *   "5%" = 0,05, "1.000" = 1000); o que não é número vem ANTES na crescente e
 *   DEPOIS na decrescente, sempre na ordem original;
 * - data: dd/mm/aaaa, d/m/aa (aa → 1930–2029) e aaaa-mm-dd; "1 de março de 2020"
 *   não é data; mesma regra para o que não é data;
 * - decrescente = comparação invertida, estável (vazio por último);
 * - a linha leva toda a formatação (trPr, tcPr, runs); linha de cabeçalho fica;
 * - tabela com células mescladas: o Word recusa ("Não é possível classificar
 *   uma tabela que contém células mescladas.").
 * A comparação de texto é injetável (o editor passa a colação do Windows de
 * sheet-calc); sem ela, Intl.Collator pt-BR.
 */
import type { Paragraph } from './document.js';
import type { TableBlock, TableRow } from './fulldoc.js';
import { mapTable, spanOf, vMergeOf } from './table-ops.js';
import { cellText, parseCellNumber } from './table-formula.js';

export type SortType = 'text' | 'number' | 'date';

export interface SortKey {
  /** coluna da grade (tabela) ou campo (parágrafos com separador; 0 = parágrafo inteiro) */
  col: number;
  type: SortType;
  desc?: boolean;
}

export interface SortOptions {
  keys: SortKey[];
  /** diferenciar maiúsculas de minúsculas */
  caseSensitive?: boolean;
  /** comparação de texto SEM caixa (-1/0/1); padrão: Intl.Collator pt-BR */
  compare?: (a: string, b: string) => number;
  /** separador de campos dos parágrafos (padrão: tabulação) */
  separator?: 'tab' | 'comma' | { char: string };
}

/** Mensagem do Word para tabela com mesclagem. */
export const SORT_MERGED_ERROR = { en: 'Cannot sort a table that contains merged cells.', pt: 'Não é possível classificar uma tabela que contém células mescladas.' };

let defaultCollator: Intl.Collator | null = null;
const intlCompare = (a: string, b: string): number => {
  defaultCollator ??= new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false });
  return defaultCollator.compare(a, b);
};

/** Desempate de caixa (diferenciar maiúsculas): a minúscula antes, caractere a caractere. */
function caseCompare(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i]!, y = b[i]!;
    if (x === y) continue;
    const xl = x === x.toLowerCase() && x !== x.toUpperCase();
    const yl = y === y.toLowerCase() && y !== y.toUpperCase();
    if (xl !== yl && x.toLowerCase() === y.toLowerCase()) return xl ? -1 : 1;
  }
  return 0;
}

/** Data de um texto (dia, mês, ano) → número comparável; null = não é data. */
export function parseSortDate(text: string): number | null {
  const s = text.trim();
  let d: number, m: number, y: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (r) { y = +r[1]!; m = +r[2]!; d = +r[3]!; } else {
    r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
    if (!r) return null;
    d = +r[1]!; m = +r[2]!; y = +r[3]!;
    if (r[3]!.length === 2) y += y < 30 ? 2000 : 1900;
  }
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return Date.UTC(y, m - 1, d);
}

/** Número de um texto para classificar (o do início; "5%" = 0,05); null = não é número. */
export function parseSortNumber(text: string): number | null {
  const x = parseCellNumber(text);
  if (!x) return null;
  return x.suffix === '%' ? x.n / 100 : x.n;
}

type Val = { s: string; v: number | null };

function keyValue(text: string, type: SortType): Val {
  if (type === 'number') return { s: text, v: parseSortNumber(text) };
  if (type === 'date') return { s: text, v: parseSortDate(text) };
  return { s: text, v: null };
}

/** Ordena índices pelas chaves (estável). `fields(i)` = textos das chaves do item i. */
function order(n: number, fields: (i: number) => string[], o: SortOptions): number[] {
  const cmp = o.compare ?? intlCompare;
  const vals = Array.from({ length: n }, (_, i) => fields(i).map((t, k) => keyValue(t, o.keys[k]!.type)));
  const idx = Array.from({ length: n }, (_, i) => i);
  const one = (a: Val, b: Val, key: SortKey): number => {
    if (key.type === 'text') {
      // vazio primeiro na crescente (e por último na decrescente, pela inversão)
      const ea = a.s.trim() === '', eb = b.s.trim() === '';
      let c = ea || eb ? (ea === eb ? 0 : ea ? -1 : 1) : cmp(a.s, b.s);
      if (!c && o.caseSensitive) c = caseCompare(a.s, b.s);
      return key.desc ? -c : c;
    }
    // o que não é número/data: antes na crescente, depois na decrescente — na ordem original
    if (a.v === null || b.v === null) {
      if (a.v === null && b.v === null) return 0;
      return (a.v === null) !== !!key.desc ? -1 : 1;
    }
    const c = a.v === b.v ? 0 : a.v < b.v ? -1 : 1;
    return key.desc ? -c : c;
  };
  idx.sort((i, j) => {
    for (let k = 0; k < o.keys.length; k++) {
      const c = one(vals[i]![k]!, vals[j]![k]!, o.keys[k]!);
      if (c) return c;
    }
    return i - j;
  });
  return idx;
}

/** A tabela pode ser classificada (sem células mescladas). */
export function canSortTable(t: TableBlock): boolean {
  return t.rows.every((row) => row.cells.every((c) => spanOf(c) === 1 && !vMergeOf(c) && !c.tcPr?.hMerge));
}

/** Classifica as linhas r1..r2 (as linhas inteiras, com a formatação). false = mesclagem. */
export function sortTable(t: TableBlock, r1: number, r2: number, o: SortOptions): boolean {
  if (!canSortTable(t) || !o.keys.length) return false;
  const m = mapTable(t);
  const rows: TableRow[] = t.rows.slice(r1, r2 + 1);
  const text = (ri: number, col: number): string => {
    const g = m.rows[r1 + ri]?.find((x) => x.col <= col && col < x.col + x.span);
    return g ? cellText(g.cell).replace(/\n/g, ' ') : '';
  };
  const idx = order(rows.length, (i) => o.keys.map((k) => text(i, k.col)), o);
  const sorted = idx.map((i) => rows[i]!);
  t.rows.splice(r1, rows.length, ...sorted);
  return true;
}

const plain = (p: Paragraph): string => p.runs.map((r) => r.text).join('');

/** Ordem dos parágrafos (índices) pelas chaves; campo 0 = o parágrafo inteiro. */
export function sortParagraphsOrder(paras: readonly Paragraph[], o: SortOptions): number[] {
  const sep = o.separator ?? 'tab';
  const ch = sep === 'tab' ? '\t' : sep === 'comma' ? ',' : sep.char || '\t';
  return order(paras.length, (i) => {
    const s = plain(paras[i]!);
    const parts = s.split(ch);
    return o.keys.map((k) => (k.col <= 0 ? s : (parts[k.col - 1] ?? '').trim()));
  }, o);
}
