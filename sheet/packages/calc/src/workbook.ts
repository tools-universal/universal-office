/**
 * Entrada do motor: a pasta de trabalho como o cálculo a enxerga (abas com
 * células valor+fórmula+atributos do `<f>`, nomes, tabelas, links externos,
 * opções de cálculo). Independente do leitor: o adaptador do sheet-core está
 * em `from-sheet-core.ts`; os testes montam isto à mão.
 * Dono: agente CORE.
 */
import type { Scalar } from './values.js';

/** Atributos do `<f>` (ECMA-376 CT_CellFormula) que mudam o cálculo. */
export interface FormulaInput {
  /** Texto canônico SEM "=" (vazio nas células filhas de fórmula compartilhada). */
  readonly text: string;
  /** normal (padrão) | shared | array (CSE ou dinâmica) | dataTable (tabela de dados). */
  readonly t?: 'normal' | 'shared' | 'array' | 'dataTable';
  /** Intervalo A1 (shared/array/dataTable). */
  readonly ref?: string;
  /** Índice da fórmula compartilhada. */
  readonly si?: number;
  /** Matriz dinâmica do 365 (`cm` → metadados XLDAPR fDynamic): derrama. */
  readonly dynamic?: boolean;
  /** Recalcular sempre (`ca`). */
  readonly ca?: boolean;
  /** Tabela de dados: 2 entradas, entrada por linha, células de entrada. */
  readonly dt2D?: boolean;
  readonly dtr?: boolean;
  readonly r1?: string;
  readonly r2?: string;
}

export interface CellInput {
  /** Valor da constante, ou valor em cache da fórmula. */
  readonly v?: Scalar;
  readonly f?: FormulaInput;
}

export interface SheetInput {
  readonly name: string;
  /** Células: [linha, coluna (0-based), conteúdo]. */
  readonly cells: Iterable<readonly [number, number, CellInput]>;
  /** Linhas ocultas (0-based) — todas, inclusive as filtradas. */
  readonly hiddenRows?: Iterable<number>;
  /** Linhas ocultas por filtro (subconjunto de hiddenRows). */
  readonly filteredRows?: Iterable<number>;
  /** Mesclagens ("A1:B2") — bloqueiam derramamento. */
  readonly merges?: readonly string[];
}

export interface NameInput {
  readonly name: string;
  /** Fórmula canônica sem "=" (referências relativas valem a partir de A1). */
  readonly formula: string;
  /** Escopo: índice da aba (localSheetId); ausente = pasta. */
  readonly sheet?: number;
}

export interface TableInput {
  readonly name: string;
  readonly sheet: number;
  /** Intervalo A1 da tabela inteira. */
  readonly ref: string;
  readonly headerRowCount: number;
  readonly totalsRowCount: number;
  readonly columns: readonly string[];
}

export interface ExternalInput {
  /** Abas da pasta externa (cache do externalLink). */
  readonly sheets: readonly { readonly name: string; readonly cells: Iterable<readonly [number, number, Scalar]> }[];
  /** Nomes definidos da pasta externa (refersTo canônico sem "="). */
  readonly names?: readonly { readonly name: string; readonly formula: string; readonly sheet?: number }[];
}

export interface CalcOptionsInput {
  readonly iterate?: boolean;
  /** Padrão do Excel: 100 iterações, variação máxima 0,001. */
  readonly iterateCount?: number;
  readonly iterateDelta?: number;
  readonly fullCalcOnLoad?: boolean;
}

export interface CalcWorkbook {
  readonly sheets: readonly SheetInput[];
  readonly names?: readonly NameInput[];
  readonly tables?: readonly TableInput[];
  readonly date1904?: boolean;
  readonly calc?: CalcOptionsInput;
  /** Links externos: índice 0 = `[1]` nas fórmulas. */
  readonly externals?: readonly ExternalInput[];
}
