/**
 * Catálogo de funções do Excel 365 (medido — catalog-data.ts é gerado pelo
 * oráculo). Serve ao parser (função conhecida mas não implementada ≠ nome
 * inexistente; quantidade de argumentos que o Excel recusa ao digitar), ao
 * autocompletar e à tradução de idioma.
 */
import { FILE_PREFIXES, OPERATOR_FUNCTIONS, RESERVED_FUNCTIONS, SHEET_FUNCTIONS, UNAVAILABLE_FUNCTIONS } from './catalog-data.js';

export { EXCEL_BUILD } from './catalog-data.js';

export interface CatalogEntry {
  /** Nome canônico (inglês, sem prefixo). */
  readonly name: string;
  /** Número interno do Excel (0–367 = Ftab do BIFF8). */
  readonly id: number;
  /** Prefixo com que o Excel grava no arquivo: '', '_xlfn.' ou '_xlfn._xlws.'. */
  readonly prefix: string;
  readonly minArgs: number;
  /** Máximo aceito pelo parser do Excel (255 = limite geral). */
  readonly maxArgs: number;
  /** 2 = as quantidades válidas pulam de 2 em 2 (pares critério/valor: SUMIFS, IFS, LET…). */
  readonly argStep: number;
  /** Quantidades aceitas até 12 quando não seguem (mín, passo) — GETPIVOTDATA, SORTBY. */
  readonly smallCounts?: readonly number[];
  /** Mostrada como operador na tela (SINGLE ↔ "@"). */
  readonly operator?: string;
}

const ENTRIES: CatalogEntry[] = SHEET_FUNCTIONS.map(([name, id, p, minArgs, maxArgs, argStep = 1, smallCounts]) => ({
  name, id, prefix: FILE_PREFIXES[p] ?? '', minArgs, maxArgs, argStep,
  ...(smallCounts ? { smallCounts } : {}),
  ...(OPERATOR_FUNCTIONS[name] ? { operator: OPERATOR_FUNCTIONS[name] } : {}),
}));
const BY_NAME = new Map(ENTRIES.map((e) => [e.name, e]));
const RESERVED = new Set(RESERVED_FUNCTIONS);
const UNAVAILABLE = new Set(UNAVAILABLE_FUNCTIONS);

/** Tira os prefixos de arquivo (`_xlfn.`, `_xlws.`, `_xlfn._xlws.`) e põe em maiúsculas. */
export function stripFilePrefix(name: string): string {
  return name.toUpperCase().replace(/^(_XLFN\.)?(_XLWS\.)?/, '');
}

/** Função de planilha conhecida pelo Excel (aceita com ou sem prefixo, qualquer caixa). */
export function catalogEntry(name: string): CatalogEntry | undefined {
  return BY_NAME.get(stripFilePrefix(name));
}

/** Todas as funções de planilha do catálogo (ordem do número interno). */
export function catalog(): readonly CatalogEntry[] {
  return ENTRIES;
}

/**
 * Como o Excel trata o nome numa fórmula de célula:
 * - 'sheet': função de planilha;
 * - 'reserved': nome da tabela do Excel recusado em célula (função de macro
 *   XLM como GET.CELL, ou interna) — digitar dá erro de fórmula;
 * - 'unknown': desconhecido (UDF, nome não liberado neste build) → #NAME?.
 */
export function functionKind(name: string): 'sheet' | 'reserved' | 'unknown' {
  const k = stripFilePrefix(name);
  if (BY_NAME.has(k)) return 'sheet';
  if (RESERVED.has(k)) return 'reserved';
  return 'unknown';
}

/** Nome na tabela do Excel mas sem efeito neste build (#NAME?). */
export function isUnavailableFunction(name: string): boolean {
  return UNAVAILABLE.has(stripFilePrefix(name));
}

/** O parser do Excel aceita a função com `n` argumentos? */
export function acceptsArgCount(e: CatalogEntry, n: number): boolean {
  if (n < e.minArgs || n > e.maxArgs) return false;
  if (n <= 12 && e.smallCounts) return e.smallCounts.includes(n);
  if (e.argStep === 1) return true;
  return (e.maxArgs - n) % 2 === 0;
}

/** Nome com o prefixo de arquivo (o serializador grava assim no OOXML). */
export function withFilePrefix(name: string): string {
  const e = catalogEntry(name);
  return e ? e.prefix + e.name : name;
}
