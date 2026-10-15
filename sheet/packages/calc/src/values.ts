/**
 * Valores do motor de cálculo — o MESMO modelo do Excel, independente de idioma.
 *
 * Por dentro tudo é canônico: números IEEE-754 (como o Excel), textos, booleanos,
 * erros, vazio (`null`), matrizes, referências e funções LAMBDA. Nomes de erro
 * canônicos ("#VALUE!") são os do arquivo; a tradução para o idioma do usuário
 * ("#VALOR!") é só da camada de idioma (i18n), nunca daqui.
 */

/** Códigos de erro canônicos (como gravados no OOXML/BIFF). */
export type ErrorCode =
  | '#NULL!' | '#DIV/0!' | '#VALUE!' | '#REF!' | '#NAME?' | '#NUM!' | '#N/A'
  | '#GETTING_DATA' | '#SPILL!' | '#CALC!' | '#FIELD!' | '#BLOCKED!' | '#CONNECT!'
  | '#UNKNOWN!' | '#BUSY!' | '#PYTHON!';

/** Erro do Excel. Instâncias únicas por código (comparar com `===` ou pelo `code`). */
export class CalcError {
  private static readonly cache = new Map<ErrorCode, CalcError>();
  private constructor(readonly code: ErrorCode) {}
  static of(code: ErrorCode): CalcError {
    let e = CalcError.cache.get(code);
    if (!e) { e = new CalcError(code); CalcError.cache.set(code, e); }
    return e;
  }
  toString(): string { return this.code; }
}

/** Atalhos dos erros mais usados. */
export const ERR = {
  NULL: CalcError.of('#NULL!'),
  DIV0: CalcError.of('#DIV/0!'),
  VALUE: CalcError.of('#VALUE!'),
  REF: CalcError.of('#REF!'),
  NAME: CalcError.of('#NAME?'),
  NUM: CalcError.of('#NUM!'),
  NA: CalcError.of('#N/A'),
  SPILL: CalcError.of('#SPILL!'),
  CALC: CalcError.of('#CALC!'),
  FIELD: CalcError.of('#FIELD!'),
  GETTING_DATA: CalcError.of('#GETTING_DATA'),
} as const;

/** Número do ERROR.TYPE de cada erro (1–8 clássicos; os novos seguem o Excel 365). */
export const ERROR_TYPE: Readonly<Record<ErrorCode, number>> = {
  '#NULL!': 1, '#DIV/0!': 2, '#VALUE!': 3, '#REF!': 4, '#NAME?': 5, '#NUM!': 6, '#N/A': 7,
  '#GETTING_DATA': 8, '#SPILL!': 9, '#CONNECT!': 10, '#BLOCKED!': 11, '#UNKNOWN!': 12,
  '#FIELD!': 13, '#CALC!': 14, '#BUSY!': 15, '#PYTHON!': 16,
};

/** Valor escalar: número, texto, booleano, erro ou vazio (`null` = célula vazia / argumento omitido). */
export type Scalar = number | string | boolean | CalcError | null;

/**
 * Retângulo de células (0-based, inclusivo). `sheet` = índice da aba no
 * workbook; `r2`/`c2` podem ser a última linha/coluna da planilha
 * (1048575/16383) em referências de coluna/linha inteira.
 */
export interface Area {
  readonly sheet: number;
  readonly r1: number; readonly c1: number;
  readonly r2: number; readonly c2: number;
}

/** Referência (uma ou mais áreas — união `(A1,B2:C3)`). */
export class RefValue {
  constructor(readonly areas: readonly Area[]) {}
  get single(): Area | undefined { return this.areas.length === 1 ? this.areas[0] : undefined; }
}

/** Matriz retangular de escalares (linha a linha). Imutável por convenção. */
export class ArrayValue {
  constructor(readonly rows: number, readonly cols: number, readonly data: readonly Scalar[]) {
    if (data.length !== rows * cols) throw new Error('ArrayValue: tamanho incoerente');
  }
  get(r: number, c: number): Scalar { return this.data[r * this.cols + c] ?? null; }
  static of(rows: Scalar[][]): ArrayValue {
    const r = rows.length, c = r ? Math.max(...rows.map((x) => x.length)) : 0;
    const data: Scalar[] = [];
    for (const row of rows) for (let j = 0; j < c; j++) data.push(j < row.length ? row[j]! : ERR.NA);
    return new ArrayValue(r, c, data);
  }
  static fill(rows: number, cols: number, f: (r: number, c: number) => Scalar): ArrayValue {
    const data: Scalar[] = new Array(rows * cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) data[r * cols + c] = f(r, c);
    return new ArrayValue(rows, cols, data);
  }
}

/** Função LAMBDA (opaca fora do avaliador; chamada por `FnContext.callLambda`). */
export class LambdaValue {
  constructor(readonly params: readonly string[], readonly body: unknown, readonly closure: unknown) {}
}

/** Qualquer valor produzido por uma expressão. */
export type Value = Scalar | ArrayValue | RefValue | LambdaValue;

export const isError = (v: unknown): v is CalcError => v instanceof CalcError;
export const isArray = (v: unknown): v is ArrayValue => v instanceof ArrayValue;
export const isRef = (v: unknown): v is RefValue => v instanceof RefValue;
export const isLambda = (v: unknown): v is LambdaValue => v instanceof LambdaValue;
export const isScalar = (v: Value): v is Scalar => !(v instanceof ArrayValue || v instanceof RefValue || v instanceof LambdaValue);

/** Limites da planilha do Excel (0-based). */
export const MAX_ROW = 1048575;
export const MAX_COL = 16383;
