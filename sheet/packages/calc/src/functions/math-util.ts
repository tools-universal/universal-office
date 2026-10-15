/**
 * Apoio numérico das bibliotecas de matemática, engenharia e finanças: conversão
 * dos argumentos na ordem do Excel, arredondamentos "de 15 dígitos", soma com o
 * cancelamento do Excel, agregação (SUM/PRODUCT…) e fábricas de FnDef.
 * Dono: agente FN-MATH.
 *
 * Fatos medidos no Excel 365 (oráculo, pt-BR):
 * - Os argumentos são convertidos da esquerda para a direita e o 1º problema decide o
 *   erro: ROUND("abc";1/0) = #VALUE! (não #DIV/0!). Por isso as funções daqui recebem
 *   os erros (`acceptsErrors`) e convertem em ordem.
 * - ROUND/ROUNDUP/ROUNDDOWN/TRUNC/INT/FLOOR…/CEILING… olham o número com 15 dígitos
 *   significativos antes de decidir (INT((0,1+0,7)*10) = 8; FLOOR(0,3;0,1) = 0,3).
 * - Resultado subnormal (< 2^-1022) de POWER vira 0.
 */
import { toNumber } from '../coerce.js';
import { crLog, xlCos, xlExp, xlSin, xlTan } from './libm.js';
import type { ArgMode, FnContext, FnDef } from '../fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

export type Num = number | CalcError;

/** Número de um argumento escalar no idioma do contexto (vazio = 0; texto não numérico = #VALUE!). */
export function num(x: Scalar, ctx: FnContext): Num {
  return toNumber(x, ctx.locale);
}

/** Resultado numérico: NaN/±∞ → #NUM!; -0 → 0. */
export function fin(x: number): Num {
  if (!Number.isFinite(x)) return ERR.NUM;
  return x === 0 ? 0 : x;
}

/** Como `fin`, e resultados subnormais viram 0 (POWER do Excel). */
export function finFlush(x: number): Num {
  if (!Number.isFinite(x)) return ERR.NUM;
  return Math.abs(x) < 2.2250738585072014e-308 ? 0 : x;
}

/** Converte os argumentos na ordem; o 1º que falha decide o erro. */
export function nums(xs: readonly Scalar[], ctx: FnContext): number[] | CalcError {
  const r: number[] = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const n = toNumber(xs[i]!, ctx.locale);
    if (n instanceof CalcError) return n;
    r[i] = n;
  }
  return r;
}

/** Número com 15 dígitos significativos (a "visão" do Excel antes de truncar/arredondar). */
export function approx15(x: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  return Number(x.toPrecision(15));
}

/** Expoente binário (⌊log2|x|⌋) exato, inclusive perto das potências de 2. */
const F64 = new Float64Array(1);
const U32 = new Uint32Array(F64.buffer);
export function exponentOf(x: number): number {
  F64[0] = x;
  const e = (U32[1]! >>> 20) & 0x7ff;
  if (e === 0) return x === 0 ? -1075 : Math.floor(Math.log2(Math.abs(x)));
  return e - 1023;
}

/**
 * Soma de dois números com o cancelamento do Excel: sinais opostos e resultado
 * menor que 2^(e−49), e = expoente binário do operando da ESQUERDA (o
 * acumulador), viram 0 exato (medido: 1 − 0,99999999999999833 = 0;
 * 1 − 0,99999999999999822 = 1,78E-15; com a = 1−2^−50: a+(−1) = −8,88E-16 mas
 * (−1)+a = 0, no SUM e no operador +).
 * O SUM aplica isto só à ÚLTIMA adição (SUM(0,1;0,2;−0,3;1E-20) = 5,55E-17).
 */
export function snapAdd(a: number, b: number): number {
  const r = a + b;
  if (r === 0 || !Number.isFinite(r) || (a > 0) === (b > 0) || a === 0 || b === 0) return r;
  return Math.abs(r) < Math.pow(2, exponentOf(a) - 49) ? 0 : r;
}

/** Modo de arredondamento decimal. */
export const enum RoundMode { Half, Up, Down }

/**
 * Arredonda em `d` casas decimais (d < 0 = à esquerda da vírgula) como o
 * ROUND/ROUNDUP/ROUNDDOWN do Excel: primeiro o número com 15 dígitos
 * significativos, depois a operação sobre os dígitos decimais (meio para longe
 * do zero). ROUND(2,675;2) = 2,68. Devolve ±∞ em estouro (quem chama dá #NUM!).
 */
export function decimalRound(x: number, d: number, mode: RoundMode): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  const neg = x < 0;
  const s = Math.abs(x).toExponential(14); // 15 dígitos: "d.dddddddddddddde±X"
  const ei = s.indexOf('e');
  const digits = s[0]! + s.slice(2, ei);
  const e = parseInt(s.slice(ei + 1), 10);
  // valor = 0.d1d2…d15 × 10^(e+1); manter `keep` dígitos
  const keep = e + 1 + d;
  let out: number;
  if (keep >= 15) out = Number(digits[0] + '.' + digits.slice(1) + 'e' + e);
  else if (keep < 0) out = mode === RoundMode.Up ? Number('1e' + -d) : 0;
  else {
    const kept = digits.slice(0, keep);
    const rest = digits.slice(keep);
    const up = mode === RoundMode.Up ? /[1-9]/.test(rest) : mode === RoundMode.Half ? rest.charCodeAt(0) >= 53 : false;
    let k = kept;
    if (up) {
      // soma 1 no último dígito mantido (com vai-um)
      const a = k.split('');
      let i = a.length - 1;
      while (i >= 0) {
        if (a[i] === '9') { a[i] = '0'; i--; } else { a[i] = String.fromCharCode(a[i]!.charCodeAt(0) + 1); break; }
      }
      k = (i < 0 ? '1' : '') + a.join('');
    }
    out = k ? Number(k + 'e' + -d) : 0;
  }
  return neg ? -out : out;
}

/** Inteiro truncado em direção ao zero (como o Excel trata argumentos "inteiros"). */
export const trunc = Math.trunc;

/**
 * Percorre os números dos argumentos de agregação (SUM, PRODUCT, SUMSQ…) como o
 * Excel: argumento direto converte (texto-número, booleano; texto não numérico =
 * #VALUE!; omitido = ignorado); referência e matriz só contam números (texto,
 * booleano e vazio ignorados); erro em qualquer lugar propaga (o 1º na ordem dos
 * argumentos e, dentro do intervalo, linha a linha).
 */
export function eachNumber(args: readonly Value[], ctx: FnContext, f: (n: number) => void): CalcError | undefined {
  for (const a of args) {
    if (a instanceof RefValue) {
      for (const area of a.areas) {
        let err: CalcError | undefined;
        ctx.forEachCell(area, (v) => {
          if (err) return;
          if (typeof v === 'number') f(v);
          else if (v instanceof CalcError) err = v;
        });
        if (err) return err;
      }
    } else if (a instanceof ArrayValue) {
      for (const v of a.data) {
        if (typeof v === 'number') f(v);
        else if (v instanceof CalcError) return v;
      }
    } else if (a instanceof LambdaValue) {
      return ERR.CALC;
    } else if (a !== null) {
      const n = toNumber(a, ctx.locale);
      if (n instanceof CalcError) return n;
      f(n);
    }
  }
  return undefined;
}

/** Valores de um argumento `array` como matriz (escalar vira 1×1). */
export function asMatrix(v: Value, ctx: FnContext): ArrayValue | CalcError {
  if (v instanceof ArrayValue) return v;
  if (v instanceof RefValue) return v.single ? ctx.values(v) : ERR.VALUE;
  if (v instanceof LambdaValue) return ERR.CALC;
  return new ArrayValue(1, 1, [v]);
}

/** Opções das fábricas de funções numéricas. */
export interface NumFnOpts {
  readonly prefix?: string;
  /** Valor de cada argumento opcional AUSENTE (por posição). */
  readonly defaults?: readonly number[];
  /** Argumento vazio (=F(1;)) também usa o padrão (CEILING.MATH, FLOOR.PRECISE…). */
  readonly emptyIsDefault?: boolean;
  readonly volatile?: boolean;
}

/**
 * Função escalar numérica: argumentos `value`, levantada sobre matrizes,
 * convertidos em número na ordem; o corpo devolve número (validado com `fin`) ou erro.
 */
export function numFn(name: string, min: number, max: number, body: (a: number[], ctx: FnContext) => Num | Value, o: NumFnOpts = {}): FnDef {
  return {
    name, prefix: o.prefix, minArgs: min, maxArgs: max, args: 'value', lift: true, acceptsErrors: true, volatile: o.volatile,
    call: (args: readonly Scalar[], ctx: FnContext) => {
      const xs: number[] = [];
      for (let i = 0; i < max; i++) {
        const present = i < args.length;
        let v: Scalar | undefined = present ? args[i]! : undefined;
        if (v === null && o.emptyIsDefault && o.defaults && o.defaults[i - min] !== undefined) v = undefined;
        if (v === undefined) {
          const dv = o.defaults?.[i - min];
          if (dv === undefined) break;
          xs.push(dv);
          continue;
        }
        const n = toNumber(v, ctx.locale);
        if (n instanceof CalcError) return n;
        xs.push(n);
      }
      const r = body(xs, ctx);
      return typeof r === 'number' ? fin(r) : r;
    },
  };
}

/** FnDef com argumentos de modos mistos (atalho). */
export function def(name: string, min: number, max: number, args: ArgMode | ((i: number) => ArgMode), call: FnDef['call'], extra: Partial<FnDef> = {}): FnDef {
  return { name, minArgs: min, maxArgs: max, args, call, ...extra };
}

// ---------------------------------------------------------------------------
// Trigonometria com a redução de argumento do Excel. Medido: SIN/COS/TAN reduzem
// o argumento pelo π de 64 bits do x87 (FLDPI = 0xC90FDAA22168C235·2⁻⁶²), não pelo
// π exato: COS(PI()/2) = 6,1257422745431E-17 (e não 6,1232E-17), SIN(1E8) =
// 0,931639027110306 (o π exato dá …09726). |x| ≥ 2^27 = #NUM!.

export const TRIG_LIMIT = 134217728; // 2^27

/**
 * SIN/COS/TAN do Excel: valor exato do argumento reduzido pelo π do x87 (64 bits),
 * arredondado a double — ver libm.ts (medido bit a bit: 600/600 valores, |x| até 1000).
 */
export const sinExt = xlSin;
export const cosExt = xlCos;
export const tanExt = xlTan;

// ---------------------------------------------------------------------------
// Potência. Medido: expoente inteiro com |y| < 2^32 é calculado por quadrados
// sucessivos (da direita para a esquerda; negativo = 1/x^|y|) — bate bit a bit
// (POWER(1,1;700) = 9,4379921276728615E28, e não o pow exato …29494E28;
// POWER(1,0000001;1E9) difere do exato no 9º dígito). Base negativa com
// expoente não inteiro só se 1/y, com 15 dígitos, for inteiro ímpar
// (POWER(−8;0,333333333333333) = −1,99999999999999…; POWER(−8;0,142857142857143) = #NUM!).
// Resultado subnormal vira 0. O operador ^ é o mesmo cálculo.

/** x^n por quadrados sucessivos, n inteiro ≥ 0. */
function powInt(x: number, n: number): number {
  let r = 1, b = x;
  while (n > 0) {
    if (n % 2) r *= b;
    n = Math.floor(n / 2);
    if (n) b *= b;
  }
  return r;
}

/** POWER(x; y) / x^y do Excel. */
export function excelPower(x: number, y: number): Num {
  if (x === 0) {
    if (y === 0) return ERR.NUM;
    if (y < 0) return ERR.DIV0;
    return 0;
  }
  if (Number.isInteger(y) && Math.abs(y) < 4294967296) {
    // base 10: potência exata da tabela (POWER(10;300) = 1E300; 10^−n = 1/10^n)
    const pos = x === 10 ? Number('1e' + Math.abs(y)) : powInt(x, Math.abs(y));
    return finFlush(y < 0 ? 1 / pos : pos);
  }
  if (x < 0) {
    const t = approx15(1 / y);
    if (!Number.isInteger(t) || Math.abs(t) % 2 !== 1) return ERR.NUM;
    return finFlush(-powReal(-x, y));
  }
  return finFlush(powReal(x, y));
}

/**
 * x^y com y não inteiro, x > 0. Medido: o Excel dá exp(y·ln x) em double
 * (POWER(1,1;700,5) = 9,8986496524635402E28, o pow exato é …6228E28;
 * POWER(8;1/3) = 1,9999999999999998), exceto y = 0,5, que é a raiz exata.
 */
function powReal(x: number, y: number): number {
  // medido (bits exatos, 150/150): y < 0 → 1/x^(−y) (POWER(2;−0,5) = 1/√2); EXP do x87 e
  // ln correto (libm.ts)
  if (y < 0) return 1 / powReal(x, -y);
  return y === 0.5 ? Math.sqrt(x) : xlExp(y * crLog(x));
}

// ---------------------------------------------------------------------------
// Funções do antigo Analysis ToolPak (ATP: FACTDOUBLE, GCD, LCM, MROUND,
// MULTINOMIAL, QUOTIENT, RANDBETWEEN, SERIESSUM, SQRTPI, engenharia, boa parte
// das financeiras…). Medido: argumento omitido = #N/A; booleano (direto ou de
// célula) = #VALUE!; referência de várias células = #VALUE! mesmo em fórmula de
// matriz dinâmica e sem interseção implícita no modo legado; matriz literal ou
// calculada é levantada elemento a elemento.

/** Argumento cru de função ATP → escalar ou matriz (erro para referência de várias células). */
export function atpRaw(v: Value | undefined, ctx: FnContext): Scalar | ArrayValue {
  if (v === undefined || v === null) return ERR.NA;
  if (v instanceof RefValue) {
    const a = v.single;
    if (!a || a.r1 !== a.r2 || a.c1 !== a.c2) return ERR.VALUE;
    const c = ctx.cell(a.sheet, a.r1, a.c1);
    return c === null ? 0 : c;
  }
  if (v instanceof LambdaValue) return ERR.VALUE;
  return v;
}

/** Número de um escalar ATP (booleano = #VALUE!; vazio = 0). */
export function atpNum(v: Scalar, ctx: FnContext): Num {
  if (typeof v === 'boolean') return ERR.VALUE;
  return toNumber(v, ctx.locale);
}

/** Valor de uma matriz difundida em (r, c) (dimensão 1 repete; fora → #N/A). */
export function broadcastAt(a: ArrayValue, r: number, c: number): Scalar {
  const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
  if (rr >= a.rows || cc >= a.cols) return ERR.NA;
  return a.get(rr, cc);
}

/**
 * Levanta uma função escalar sobre argumentos já resolvidos (escalar ou matriz),
 * com a difusão do Excel. `f` recebe os escalares de cada posição.
 */
export function liftScalars(xs: readonly (Scalar | ArrayValue)[], f: (s: Scalar[]) => Value): Value {
  let rows = 0, cols = 0;
  for (const x of xs) if (x instanceof ArrayValue) { rows = Math.max(rows, x.rows); cols = Math.max(cols, x.cols); }
  const top = (v: Value): Scalar => (v instanceof ArrayValue ? v.get(0, 0) : v instanceof RefValue || v instanceof LambdaValue ? ERR.VALUE : v);
  if (!rows) return f(xs as Scalar[]);
  return ArrayValue.fill(rows, cols, (r, c) => top(f(xs.map((x) => (x instanceof ArrayValue ? broadcastAt(x, r, c) : x)))));
}

/** Função escalar numérica do ATP (argumentos `any`, regras ATP, levantada sobre matrizes). */
export function atpFn(name: string, min: number, max: number, body: (a: number[], ctx: FnContext) => Num | Value, o: NumFnOpts = {}): FnDef {
  return {
    name, prefix: o.prefix, minArgs: min, maxArgs: max, args: 'any', acceptsErrors: true, volatile: o.volatile,
    call: (args: readonly Value[], ctx: FnContext) => {
      const raw: (Scalar | ArrayValue)[] = [];
      const nDef: number[] = [];
      for (let i = 0; i < max; i++) {
        const dv = o.defaults?.[i - min];
        // medido: opcional omitido (DELTA(5;)) = padrão; obrigatório omitido = #N/A
        if (i < args.length && !(args[i] === null && dv !== undefined)) raw.push(atpRaw(args[i], ctx));
        else if (dv !== undefined) nDef.push(dv);
        else break;
      }
      return liftScalars(raw, (s) => {
        const xs: number[] = [];
        for (const v of s) {
          const n = atpNum(v, ctx);
          if (n instanceof CalcError) return n;
          xs.push(n);
        }
        xs.push(...nDef);
        const r = body(xs, ctx);
        return typeof r === 'number' ? fin(r) : r;
      });
    },
  };
}

/**
 * Lista de números de função ATP de lista (GCD, LCM, MULTINOMIAL): texto converte
 * em qualquer lugar (texto não numérico = #VALUE!), booleano = #VALUE!, célula
 * vazia = 0, omitido = #N/A (menos o último).
 */
export function atpList(args: readonly Value[], ctx: FnContext): number[] | CalcError {
  const out: number[] = [];
  const take = (v: Scalar): CalcError | undefined => {
    if (v === null) { out.push(0); return undefined; }
    const n = atpNum(v, ctx);
    if (n instanceof CalcError) return n;
    out.push(n);
    return undefined;
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    // medido: GCD(;6) = #N/A, mas GCD(6;) = 6 (o último vazio é ignorado)
    if (a === null) { if (i === args.length - 1 && i > 0) continue; return ERR.NA; }
    if (a instanceof RefValue) {
      for (const area of a.areas) {
        let err: CalcError | undefined, seen = 0;
        ctx.forEachCell(area, (v) => { seen++; if (!err) err = take(v); });
        if (err) return err;
        if (seen < (area.r2 - area.r1 + 1) * (area.c2 - area.c1 + 1)) out.push(0);
      }
    } else if (a instanceof ArrayValue) {
      for (const v of a.data) { const e = take(v); if (e) return e; }
    } else if (a instanceof LambdaValue) return ERR.VALUE;
    else { const e = take(a); if (e) return e; }
  }
  return out;
}
