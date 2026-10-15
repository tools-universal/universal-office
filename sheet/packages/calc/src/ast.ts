/**
 * Árvore sintática das fórmulas (forma CANÔNICA, independente de idioma).
 *
 * Referências relativas guardam o DESLOCAMENTO em relação à célula da fórmula
 * (como o R1C1 do Excel), não a posição: a mesma árvore serve a todas as
 * células de uma fórmula compartilhada e a uma fórmula copiada. A posição só
 * aparece ao avaliar (célula anfitriã) e ao imprimir em A1.
 * Dono: agente CORE.
 */
import type { ErrorCode, Scalar } from './values.js';

/** Linha ou coluna de uma referência: absoluta (`$`, índice 0-based) ou relativa (deslocamento). */
export interface RefPart { readonly n: number; readonly abs: boolean }

/**
 * Aba de uma referência: `Plan1!`, `'Minha aba'!`, 3D `Plan1:Plan3!`, externa
 * `[1]Plan1!` (`ext` = índice 1-based de `<externalReferences>`; 0 = esta pasta)
 * ou só a pasta externa (`[1]!Nome`, `sheet` vazio).
 */
export interface SheetSpec { readonly sheet: string; readonly sheet2?: string; readonly ext?: number }

/** Itens especiais de referência estruturada. */
export type TableItem = '#All' | '#Data' | '#Headers' | '#Totals' | '#This Row';

export type Node =
  | { readonly t: 'num'; readonly v: number; readonly raw?: string }
  | { readonly t: 'str'; readonly v: string }
  | { readonly t: 'bool'; readonly v: boolean }
  | { readonly t: 'err'; readonly v: ErrorCode }
  /** Constante de matriz `{1,2;3,4}` (só escalares). */
  | { readonly t: 'arr'; readonly rows: readonly (readonly Scalar[])[] }
  /** Célula. */
  | { readonly t: 'cell'; readonly sheet?: SheetSpec; readonly row: RefPart; readonly col: RefPart }
  /**
   * Área A1:B2; coluna inteira (`A:C`: sem r1/r2) ou linha inteira (`1:3`: sem c1/c2).
   */
  | { readonly t: 'area'; readonly sheet?: SheetSpec; readonly r1?: RefPart; readonly c1?: RefPart; readonly r2?: RefPart; readonly c2?: RefPart }
  /** `#REF!` no lugar de uma referência (`Plan1!#REF!`). */
  | { readonly t: 'referr'; readonly sheet?: SheetSpec }
  /** Nome definido, parâmetro de LET/LAMBDA (`param` = veio com `_xlpm.`) ou nome externo. */
  | { readonly t: 'name'; readonly name: string; readonly sheet?: SheetSpec; readonly param?: boolean }
  /**
   * Referência estruturada: `Tabela1[Col]`, `Tabela1[[#Headers],[A]:[B]]`,
   * `[@Col]` (tabela vazia = a da célula). `cols` = 1ª e última coluna (ou nenhuma).
   */
  | { readonly t: 'table'; readonly table: string; readonly items: readonly TableItem[]; readonly col1?: string; readonly col2?: string; readonly ext?: number }
  /**
   * Chamada de função pelo nome (canônico, MAIÚSCULAS, sem prefixo). `prefix` =
   * prefixo como veio do arquivo (`_xlfn.`, `_xlfn._xlws.`, `_xludf.`…).
   * Argumento omitido = `{ t: 'missing' }`.
   */
  | { readonly t: 'fn'; readonly name: string; readonly prefix?: string; readonly args: readonly Node[] }
  /** Chamada de expressão: `LAMBDA(x,x+1)(2)`. */
  | { readonly t: 'call'; readonly fn: Node; readonly args: readonly Node[] }
  | { readonly t: 'missing' }
  /** `-x`, `+x`, `x%` (pós-fixo). `@x` vira fn SINGLE e `x#` vira fn ANCHORARRAY. */
  | { readonly t: 'unary'; readonly op: '-' | '+' | '%'; readonly e: Node }
  /** Operadores binários; `:` intervalo, ` ` interseção, `,` união. */
  | { readonly t: 'bin'; readonly op: BinOp; readonly a: Node; readonly b: Node }
  | { readonly t: 'paren'; readonly e: Node };

export type BinOp = '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '<=' | '>' | '>=' | ':' | ' ' | ',';

/** Visita todos os nós (pré-ordem). */
export function walk(n: Node, f: (n: Node) => void): void {
  f(n);
  switch (n.t) {
    case 'fn': for (const a of n.args) walk(a, f); break;
    case 'call': walk(n.fn, f); for (const a of n.args) walk(a, f); break;
    case 'unary': case 'paren': walk(n.e, f); break;
    case 'bin': walk(n.a, f); walk(n.b, f); break;
  }
}
