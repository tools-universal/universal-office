/**
 * Modelo de idioma das fórmulas. Duas coisas independentes decidem como uma
 * fórmula aparece para o usuário (medido no Excel 365):
 *  - o IDIOMA do Excel: nomes de funções, erros, booleanos, letras do R1C1,
 *    palavras-chave das referências estruturadas, separadores de constante de
 *    matriz, letras dos códigos de formato do TEXT e o nome do "Geral";
 *  - as configurações REGIONAIS (Windows/navegador): separador decimal e de lista.
 * O tradutor (translate.ts) recebe os dois como opções separadas.
 */
import type { ErrorCode } from '../values.js';

/** Palavras-chave das referências estruturadas (Tabela1[[#All],[Col]]). */
export interface TableKeywords {
  readonly all: string;
  readonly data: string;
  readonly headers: string;
  readonly totals: string;
  readonly thisRow: string;
}

/** Letras dos códigos de formato (TEXT/formatos) e nome do "Geral" no idioma. */
export interface FormatCodes {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
  readonly general: string;
}

/** Tabela de um idioma do Excel. Campos ausentes = iguais ao canônico (inglês). */
export interface FormulaLanguage {
  /** BCP-47 ("pt-BR", "de-DE"…). */
  readonly id: string;
  /** LCID do Windows/Office (1046 = pt-BR). */
  readonly lcid?: number;
  /** Nome do idioma no próprio idioma. */
  readonly name: string;
  /**
   * Nome local de cada função, só as que mudam (canônico SEM prefixo → local).
   * Idiomas cujo Excel usa os nomes em inglês têm a tabela vazia.
   */
  readonly functions: Readonly<Record<string, string>>;
  /** Nome local dos erros (só os que mudam). */
  readonly errors?: Readonly<Partial<Record<ErrorCode, string>>>;
  /** VERDADEIRO/FALSO no idioma (constantes e funções TRUE()/FALSE()). */
  readonly bools?: readonly [string, string];
  /** Letras do R1C1 (pt-BR: L e C → "L[-1]C2") e colchetes do relativo (xlLeftBracket/xlRightBracket). */
  readonly r1c1?: { readonly row: string; readonly col: string; readonly open?: string; readonly close?: string };
  /** Palavras-chave das referências estruturadas. */
  readonly table?: Partial<TableKeywords>;
  /**
   * Separadores das constantes de matriz no idioma: coluna, linha e o
   * alternativo que o Excel usa quando o de coluna coincide com o decimal
   * (Application.International: xlColumnSeparator, xlRowSeparator, xlAlternateArraySeparator).
   */
  readonly array?: { readonly col: string; readonly row: string; readonly alt?: string };
  readonly format?: Partial<FormatCodes>;
  /** Configuração regional típica de quem usa o idioma (padrão do tradutor). */
  readonly regional?: { readonly decimal: string; readonly list: string };
  /** De onde vêm os dados ("oráculo Excel 16.0.xxxxx", "importado de …"). */
  readonly source: string;
}

/** Opções de sintaxe do tradutor canônico ↔ local. */
export interface SyntaxOptions {
  /** Idioma do Excel (id ou tabela). Padrão "en-US". */
  readonly lang?: string | FormulaLanguage;
  /** Separador decimal (regional). Padrão: o regional típico do idioma. */
  readonly decimal?: string;
  /** Separador de lista (regional). Padrão: ";" se o decimal for ",", senão ",". */
  readonly list?: string;
  /** Separador de coluna das constantes de matriz. Padrão: o do idioma (ou o alternativo, se coincidir com o decimal). */
  readonly arrayCol?: string;
  /** Separador de linha das constantes de matriz. Padrão: o do idioma. */
  readonly arrayRow?: string;
  /** Fórmula em notação R1C1 (letras do idioma ↔ R/C). */
  readonly r1c1?: boolean;
  /**
   * Só para `fromLocal`: grava os prefixos de arquivo (`_xlfn.`, `_xlfn._xlws.`)
   * como no OOXML. Padrão false (texto canônico como o Formula2 do Excel).
   */
  readonly filePrefixes?: boolean;
}
