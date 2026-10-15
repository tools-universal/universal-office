/**
 * Contrato das funções: registro, modos de argumento e o contexto que o
 * avaliador entrega. As bibliotecas (functions/*.ts) só declaram `FnDef`s; o
 * avaliador (evaluator.ts) é quem resolve referências, faz a interseção
 * implícita, "levanta" funções escalares sobre matrizes e avalia argumentos
 * preguiçosos.
 */
import type { Area, ArrayValue, CalcError, LambdaValue, RefValue, Scalar, Value } from './values.js';

/**
 * Como o avaliador entrega cada argumento à função:
 * - `value`: escalar. Referência → valor (interseção implícita numa referência de
 *   várias células, como o Excel faz fora de contexto de matriz); matriz → se a
 *   função for `lift`, ela é aplicada elemento a elemento (difusão como no Excel:
 *   1×N com M×1 vira M×N; tamanhos diferentes → #N/A nas sobras); senão, o 1º elemento.
 * - `array`: `ArrayValue` ou escalar. Referência → todos os valores do intervalo
 *   (uma área; várias áreas → `ref`). Use para SUMPRODUCT, MMULT, critérios…
 * - `ref`: mantém a `RefValue` (ROW, COLUMN, OFFSET, INDEX, AREAS, CELL, ISREF,
 *   SUBTOTAL, SUM/COUNT de várias áreas…). Valor que não é referência chega como
 *   está (a função decide: SUM aceita número/matriz, ROW exige referência…).
 * - `any`: o valor cru (escalar, matriz, referência ou lambda).
 * - `lazy`: `Thunk` — avaliado só quando a função chamar (IF, IFS, IFERROR,
 *   CHOOSE, SWITCH, LET…). O thunk devolve o valor cru (`any`).
 */
export type ArgMode = 'value' | 'array' | 'ref' | 'any' | 'lazy';

/** Argumento preguiçoso. `omitted` = vírgula sem nada (=IF(A1,,2)). */
export interface Thunk { (): Value; readonly omitted: boolean }

/** Argumento omitido (=ROUND(1.5,)) chega como `null` nos modos value/array/any. */

export interface FnDef {
  /** Nome canônico em MAIÚSCULAS, sem prefixo (ex.: "XLOOKUP", "NORM.S.DIST", "SUM"). */
  readonly name: string;
  /**
   * Prefixo com que o OOXML grava a função (`_xlfn.` para as de 2010+, `_xlfn._xlws.`
   * para SORT/FILTER…, `_xlws.`…). O parser aceita o nome com e sem prefixo; o
   * serializador grava com ele.
   */
  readonly prefix?: string;
  readonly minArgs: number;
  /** Máximo de argumentos (255 = "até o limite do Excel"). */
  readonly maxArgs: number;
  /** Modo de cada argumento (um para todos, ou por posição 0-based). */
  readonly args: ArgMode | ((i: number) => ArgMode);
  /** Escalar aplicada elemento a elemento quando recebe matriz num argumento `value`. */
  readonly lift?: boolean;
  /** Recalcula sempre (NOW, TODAY, RAND, RANDBETWEEN, OFFSET, INDIRECT, CELL, INFO…). */
  readonly volatile?: boolean;
  /** Pode devolver referência (INDEX, OFFSET, INDIRECT, CHOOSE, IF, XLOOKUP…). */
  readonly returnsRef?: boolean;
  /**
   * Recebe erros nos argumentos `value` (ISERROR, ISNA, ERROR.TYPE, TYPE, N…). Sem
   * isto, o avaliador devolve o 1º erro (da esquerda para a direita) sem chamar a função.
   */
  readonly acceptsErrors?: boolean;
  /**
   * Implementação. `args` vem já no modo declarado (escalares, matrizes,
   * referências ou thunks). Nunca lance exceção por dado ruim: devolva o erro do
   * Excel (`ERR.VALUE`, `ERR.NUM`…).
   */
  call(args: readonly any[], ctx: FnContext): Value;
}

/** Convenções de VALOR do idioma (conversão texto↔número/data, TEXT, VALUE…). Não é a sintaxe das fórmulas. */
export interface ValueLocale {
  /** Ex.: "pt-BR", "en-US", "de-DE". */
  readonly id: string;
  readonly decimal: string;
  readonly group: string;
  /** Texto dos booleanos convertidos em texto (=""&TRUE → "VERDADEIRO" no Excel pt-BR). */
  readonly trueText: string;
  readonly falseText: string;
  readonly dateOrder: 'MDY' | 'DMY' | 'YMD';
  readonly dateSep: string;
  readonly timeSep: string;
  readonly am: string;
  readonly pm: string;
  readonly monthNames: readonly string[];
  readonly monthAbbr: readonly string[];
  readonly dayNames: readonly string[];
  readonly dayAbbr: readonly string[];
  readonly currency: string;
  /** Nome do formato Geral no idioma (TEXT(x;"Geral")). */
  readonly generalName?: string;
  /**
   * Letras dos códigos de formato de data/hora no idioma (TEXT(x;"dd/mm/aaaa") no
   * pt-BR): o TEXT interpreta o código no idioma de quem calcula, não no do arquivo.
   */
  readonly formatLetters?: { readonly year: string; readonly month: string; readonly day: string; readonly hour: string; readonly minute: string; readonly second: string };
}

/** Locale de valores en-US (padrão dos testes e do arquivo). */
export const EN_US: ValueLocale = {
  id: 'en-US', decimal: '.', group: ',', trueText: 'TRUE', falseText: 'FALSE',
  dateOrder: 'MDY', dateSep: '/', timeSep: ':', am: 'AM', pm: 'PM',
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthAbbr: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayAbbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  currency: '$', generalName: 'General',
  formatLetters: { year: 'y', month: 'm', day: 'd', hour: 'h', minute: 'm', second: 's' },
};

/**
 * Locale de valores pt-BR (o Excel do oráculo nesta máquina: decimal ",", VERDADEIRO).
 * Primeira versão — o agente LOCALE mantém a tabela de todos os idiomas.
 */
export const PT_BR: ValueLocale = {
  id: 'pt-BR', decimal: ',', group: '.', trueText: 'VERDADEIRO', falseText: 'FALSO',
  dateOrder: 'DMY', dateSep: '/', timeSep: ':', am: 'AM', pm: 'PM',
  monthNames: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  monthAbbr: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  dayAbbr: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  currency: 'R$', generalName: 'Geral',
  formatLetters: { year: 'a', month: 'm', day: 'd', hour: 'h', minute: 'm', second: 's' },
};

/** O que o avaliador oferece às funções. */
export interface FnContext {
  /** Aba/linha/coluna (0-based) da célula que está sendo calculada. */
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
  /** Sistema de datas 1904 (workbookPr date1904). */
  readonly date1904: boolean;
  /**
   * Fórmula de matriz dinâmica/CSE (true) ou legada com interseção implícita
   * (false). undefined = dinâmica. Para as poucas funções que recebem a
   * referência crua e decidem sozinhas (TYPE: 64 × interseção).
   */
  readonly arrayContext?: boolean;
  /** Convenções de valor do idioma em uso (texto↔número). */
  readonly locale: ValueLocale;
  /** Valores de UMA área de uma referência como matriz (vazio = null). */
  values(ref: RefValue, area?: number): ArrayValue;
  /** Valor de uma célula (vazio = null). */
  cell(sheet: number, row: number, col: number): Scalar;
  /** Percorre só as células EXISTENTES de uma área (linha a linha) — agregações sobre colunas inteiras. */
  forEachCell(area: Area, fn: (v: Scalar, row: number, col: number) => void): void;
  /** Texto canônico da fórmula da célula (sem "="), ou undefined. */
  formulaAt(sheet: number, row: number, col: number): string | undefined;
  /** A célula é resultado de SUBTOTAL/AGGREGATE (que SUBTOTAL/AGGREGATE ignoram)? */
  isSubtotalCell(sheet: number, row: number, col: number): boolean;
  /** Linha oculta manualmente / por filtro (SUBTOTAL 101–111, AGGREGATE). */
  rowHidden(sheet: number, row: number): boolean;
  rowFiltered(sheet: number, row: number): boolean;
  /** Abas. */
  sheetCount(): number;
  sheetName(sheet: number): string;
  sheetIndex(name: string): number | undefined;
  /** "Agora" (serial do Excel), congelado durante um recálculo (NOW/TODAY). */
  now(): number;
  /** Número aleatório em [0,1) (RAND, RANDBETWEEN, RANDARRAY). */
  random(): number;
  /** Chama uma LAMBDA com os argumentos (MAP, REDUCE, SCAN, BYROW…). */
  callLambda(fn: LambdaValue, args: readonly Value[]): Value;
  /** Converte texto em referência (INDIRECT, a1=false → R1C1). */
  parseRef(text: string, a1: boolean): RefValue | CalcError;
  /** Valor de um nome definido (para funções que recebem nome em texto, ex. EVALUATE). */
  resolveName?(name: string): Value;
  /**
   * Memória de UM recálculo (o avaliador cria um Map novo a cada recálculo e o
   * descarta no fim). Funções guardam aqui estruturas caras derivadas de
   * intervalos (índice de VLOOKUP/MATCH exatos…), com chave própria prefixada.
   * Opcional: sem ele as funções só não memorizam.
   */
  readonly cache?: Map<string, unknown>;
}

const REGISTRY = new Map<string, FnDef>();

/** Registra funções (as bibliotecas chamam no carregamento do módulo). */
export function register(...defs: FnDef[]): void {
  for (const d of defs) {
    const k = d.name.toUpperCase();
    if (REGISTRY.has(k)) throw new Error(`função registrada duas vezes: ${k}`);
    REGISTRY.set(k, d);
  }
}

/** Busca por nome canônico (aceita com prefixo `_xlfn.`/`_xlws.` e em qualquer caixa). */
export function lookupFn(name: string): FnDef | undefined {
  const k = name.toUpperCase().replace(/^(_XLFN\.)?(_XLWS\.)?/, '');
  return REGISTRY.get(k);
}

/** Todas as funções registradas (catálogo, autocompletar, testes de cobertura). */
export function allFns(): FnDef[] {
  return [...REGISTRY.values()];
}

/** Modo do argumento i de uma função. */
export function argMode(def: FnDef, i: number): ArgMode {
  return typeof def.args === 'function' ? def.args(i) : def.args;
}
