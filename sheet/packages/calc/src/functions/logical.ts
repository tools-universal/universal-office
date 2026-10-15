/**
 * Lógicas e LAMBDA (IF, IFS, IFERROR, IFNA, SWITCH, CHOOSE, AND, OR, XOR, NOT, TRUE, FALSE, LET, LAMBDA, MAP, REDUCE, SCAN, BYROW, BYCOL, MAKEARRAY, ISOMITTED).
 * Dono: agente CORE.
 *
 * LET, LAMBDA e ISOMITTED são formas especiais do avaliador (precisam do
 * ambiente léxico): os FnDef daqui servem ao catálogo/aridade.
 */
import { register, type FnContext, type Thunk } from '../fn.js';
import { compareScalars } from '../coerce.js';
import { implicitIntersection, topLeft } from '../apply.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';

/** Valor cru → escalar ou matriz (referência: célula, matriz no contexto de matriz, senão interseção). */
export function scalarOrArray(v: Value, ctx: FnContext): Scalar | ArrayValue {
  if (v instanceof RefValue) {
    const a = v.single;
    if (a && a.r1 === a.r2 && a.c1 === a.c2) return ctx.cell(a.sheet, a.r1, a.c1);
    if (ctx.arrayContext === false) return implicitIntersection(v, ctx);
    if (!a) return ERR.VALUE;
    return ctx.values(v);
  }
  if (v instanceof LambdaValue) return ERR.CALC;
  return v;
}

/** Difusão de vários valores (matriz ou escalar) num tamanho comum; fora → #N/A. */
function dims(xs: readonly (Scalar | ArrayValue)[]): { rows: number; cols: number } {
  let rows = 1, cols = 1;
  for (const x of xs) if (x instanceof ArrayValue) { rows = Math.max(rows, x.rows); cols = Math.max(cols, x.cols); }
  return { rows, cols };
}
function at(x: Scalar | ArrayValue, r: number, c: number): Scalar {
  if (!(x instanceof ArrayValue)) return x;
  const rr = x.rows === 1 ? 0 : r, cc = x.cols === 1 ? 0 : c;
  if (rr >= x.rows || cc >= x.cols) return ERR.NA;
  return x.get(rr, cc);
}

/**
 * Texto → booleano como o IF/NOT/AND aceitam: só o nome do booleano NO IDIOMA
 * de quem calcula, sem caixa e sem aparar (Excel pt-BR: "VERDADEIRO" sim,
 * "TRUE"/"1" → #VALUE!; medido).
 */
export function textToBool(s: string, ctx: FnContext): boolean | undefined {
  const u = s.toUpperCase();
  if (u === ctx.locale.trueText.toUpperCase()) return true;
  if (u === ctx.locale.falseText.toUpperCase()) return false;
  return undefined;
}

/** Booleano de um escalar para IF/IFS/NOT (texto: só o nome do idioma). */
export function boolOf(v: Scalar, ctx: FnContext): boolean | CalcError {
  if (v instanceof CalcError) return v;
  if (typeof v === 'string') return textToBool(v, ctx) ?? ERR.VALUE;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'boolean') return v;
  return false;
}

const cond = boolOf;

const ofThunk = (t: Thunk | undefined, missingValue: Value): Value => (!t ? missingValue : t.omitted ? 0 : t());

/** IF/IFS com condição matricial: avalia cada ramo uma vez e escolhe elemento a elemento. */
function pickArray(c: ArrayValue, branches: (() => Scalar | ArrayValue)[], ctx: FnContext): ArrayValue {
  const vals: (Scalar | ArrayValue | undefined)[] = branches.map(() => undefined);
  const get = (i: number): Scalar | ArrayValue => (vals[i] ??= branches[i]!());
  // tamanho: condição difundida com os ramos usados
  const used = new Set<number>();
  for (const v of c.data) { const b = cond(v ?? null, ctx); if (typeof b === 'boolean') used.add(b ? 0 : 1); }
  const { rows, cols } = dims([c, ...[...used].map(get)]);
  return ArrayValue.fill(rows, cols, (r, cc) => {
    const b = cond(at(c, r, cc), ctx);
    if (b instanceof CalcError) return b;
    return at(get(b ? 0 : 1), r, cc);
  });
}

register(
  {
    name: 'IF', minArgs: 2, maxArgs: 3, args: 'lazy', returnsRef: true,
    call: ([c, t, f]: Thunk[], ctx) => {
      const cv = scalarOrArray(c!(), ctx);
      const then = (): Value => (t!.omitted ? 0 : t!());
      const other = (): Value => (!f ? false : f.omitted ? 0 : f());
      if (cv instanceof ArrayValue) return pickArray(cv, [() => scalarOrArray(then(), ctx), () => scalarOrArray(other(), ctx)], ctx);
      const b = cond(cv, ctx);
      if (b instanceof CalcError) return b;
      return b ? then() : other();
    },
  },
  {
    name: 'IFS', prefix: '_xlfn.', minArgs: 2, maxArgs: 254, args: 'lazy', returnsRef: true,
    call: (args: Thunk[], ctx) => {
      if (args.length % 2) return ERR.NA;
      const conds = new Map<number, Scalar | ArrayValue>();
      const condAt = (i: number): Scalar | ArrayValue => {
        let v = conds.get(i);
        if (v === undefined) { v = args[i]!.omitted ? null : scalarOrArray(args[i]!(), ctx); conds.set(i, v); }
        return v;
      };
      // escalar: primeira condição verdadeira
      for (let i = 0; i < args.length; i += 2) {
        const cv = condAt(i);
        if (cv instanceof ArrayValue) {
          // matricial: decide elemento a elemento com as condições restantes
          const cs: (Scalar | ArrayValue)[] = [], vs: (() => Scalar | ArrayValue)[] = [];
          for (let j = i; j < args.length; j += 2) { cs.push(condAt(j)); const k = j + 1; vs.push(() => scalarOrArray(ofThunk(args[k], null), ctx)); }
          const cache: (Scalar | ArrayValue | undefined)[] = [];
          const val = (k: number): Scalar | ArrayValue => (cache[k] ??= vs[k]!());
          const { rows, cols } = dims(cs);
          return ArrayValue.fill(rows, cols, (r, c) => {
            for (let k = 0; k < cs.length; k++) {
              const b = cond(at(cs[k]!, r, c), ctx);
              if (b instanceof CalcError) return b;
              if (b) return at(val(k), r, c);
            }
            return ERR.NA;
          });
        }
        const b = cond(cv, ctx);
        if (b instanceof CalcError) return b;
        if (b) return ofThunk(args[i + 1], null);
      }
      return ERR.NA;
    },
  },
  {
    name: 'IFERROR', minArgs: 2, maxArgs: 2, args: 'lazy',
    call: ([v, alt]: Thunk[], ctx) => replaceErrors(v!, alt!, ctx, () => true),
  },
  {
    name: 'IFNA', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: 'lazy',
    call: ([v, alt]: Thunk[], ctx) => replaceErrors(v!, alt!, ctx, (e) => e.code === '#N/A'),
  },
  {
    name: 'SWITCH', prefix: '_xlfn.', minArgs: 3, maxArgs: 254, args: 'lazy', returnsRef: true,
    call: (args: Thunk[], ctx) => {
      const ev = scalarOrArray(ofThunk(args[0], null), ctx);
      const pairs = args.length - 1;
      const hasDefault = pairs % 2 === 1;
      const n = Math.floor(pairs / 2);
      const keys: (Scalar | ArrayValue | undefined)[] = [];
      const key = (i: number): Scalar | ArrayValue => (keys[i] ??= scalarOrArray(ofThunk(args[1 + 2 * i], null), ctx));
      const one = (x: Scalar): Value => {
        if (x instanceof CalcError) return x;
        for (let i = 0; i < n; i++) {
          const k = key(i);
          const kv = k instanceof ArrayValue ? (k.rows && k.cols ? k.get(0, 0) : ERR.VALUE) : k;
          if (kv instanceof CalcError) return kv;
          if (sameValue(x, kv)) return ofThunk(args[2 + 2 * i], null);
        }
        return hasDefault ? ofThunk(args[args.length - 1], null) : ERR.NA;
      };
      if (ev instanceof ArrayValue) return ArrayValue.fill(ev.rows, ev.cols, (r, c) => topLeft(one(ev.get(r, c)), ctx));
      return one(ev);
    },
  },
  {
    name: 'CHOOSE', minArgs: 2, maxArgs: 255, args: (i) => (i === 0 ? 'value' : 'lazy'), lift: true, returnsRef: true,
    call: ([idx, ...opts]: [Scalar, ...Thunk[]], ctx) => {
      const n = typeof idx === 'number' ? idx : typeof idx === 'boolean' ? (idx ? 1 : 0) : idx === null ? 0 : Number.NaN;
      let k: number;
      if (typeof idx === 'string') {
        const b = toNumberText(idx, ctx);
        if (b instanceof CalcError) return b;
        k = Math.trunc(b);
      } else k = Math.trunc(n);
      if (!(k >= 1 && k <= opts.length)) return ERR.VALUE;
      const t = opts[k - 1]!;
      return t.omitted ? 0 : t();
    },
  },
  {
    name: 'AND', minArgs: 1, maxArgs: 255, args: 'ref',
    call: (args: Value[], ctx) => logicalFold(args, ctx, (acc, b) => acc && b, true),
  },
  {
    name: 'OR', minArgs: 1, maxArgs: 255, args: 'ref',
    call: (args: Value[], ctx) => logicalFold(args, ctx, (acc, b) => acc || b, false),
  },
  {
    name: 'XOR', prefix: '_xlfn.', minArgs: 1, maxArgs: 254, args: 'ref',
    call: (args: Value[], ctx) => logicalFold(args, ctx, (acc, b) => acc !== b, false),
  },
  {
    name: 'NOT', minArgs: 1, maxArgs: 1, args: 'value', lift: true,
    call: ([x]: Scalar[], ctx) => {
      const b = boolOf(x!, ctx);
      return b instanceof CalcError ? b : !b;
    },
  },
  { name: 'TRUE', minArgs: 0, maxArgs: 0, args: 'value', call: () => true },
  { name: 'FALSE', minArgs: 0, maxArgs: 0, args: 'value', call: () => false },
  // formas especiais do avaliador (catálogo)
  { name: 'LET', prefix: '_xlfn.', minArgs: 3, maxArgs: 253, args: 'lazy', call: () => ERR.CALC },
  { name: 'LAMBDA', prefix: '_xlfn.', minArgs: 1, maxArgs: 254, args: 'lazy', call: () => ERR.CALC },
  { name: 'ISOMITTED', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, args: 'any', call: () => false },
  {
    name: 'MAP', prefix: '_xlfn.', minArgs: 2, maxArgs: 254, args: 'any',
    call: (args: Value[], ctx) => {
      const fn = args[args.length - 1];
      if (!(fn instanceof LambdaValue)) return ERR.VALUE;
      const arrs = args.slice(0, -1).map((a) => lambdaInput(a, ctx));
      for (const a of arrs) if (a instanceof CalcError) return a;
      if (fn.params.length !== arrs.length && typeof fn.body !== 'function') return ERR.VALUE;
      const xs = arrs as Input[];
      const rows = Math.max(...xs.map((x) => x.rows)), cols = Math.max(...xs.map((x) => x.cols));
      return fillLambda(rows, cols, ctx, (r, c) => {
        const vals = xs.map((x) => (x.rows === 1 && x.cols === 1 ? x.get(0, 0) : r < x.rows && c < x.cols ? x.get(r, c) : ERR.NA));
        return ctx.callLambda(fn, vals);
      });
    },
  },
  {
    name: 'REDUCE', prefix: '_xlfn.', minArgs: 2, maxArgs: 3, args: 'any',
    call: (args: Value[], ctx) => {
      const [init, arr, fn] = args.length === 3 ? args : [null, args[0], args[1]];
      if (!(fn instanceof LambdaValue)) return ERR.VALUE;
      if (fn.params.length !== 2 && typeof fn.body !== 'function') return ERR.VALUE;
      const a = lambdaInput(arr!, ctx);
      if (a instanceof CalcError) return a;
      let acc: Value = init ?? null;
      for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++) acc = ctx.callLambda(fn, [acc, a.get(r, c)]);
      return acc;
    },
  },
  {
    name: 'SCAN', prefix: '_xlfn.', minArgs: 2, maxArgs: 3, args: 'any',
    call: (args: Value[], ctx) => {
      const [init, arr, fn] = args.length === 3 ? args : [null, args[0], args[1]];
      if (!(fn instanceof LambdaValue)) return ERR.VALUE;
      if (fn.params.length !== 2 && typeof fn.body !== 'function') return ERR.VALUE;
      const a = lambdaInput(arr!, ctx);
      if (a instanceof CalcError) return a;
      let acc: Value = init ?? null;
      return fillLambda(a.rows, a.cols, ctx, (r, c) => (acc = ctx.callLambda(fn, [acc, a.get(r, c)])));
    },
  },
  {
    name: 'BYROW', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: 'any',
    call: ([arr, fn]: Value[], ctx) => byLine(arr!, fn!, ctx, true),
  },
  {
    name: 'BYCOL', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: 'any',
    call: ([arr, fn]: Value[], ctx) => byLine(arr!, fn!, ctx, false),
  },
  {
    name: 'MAKEARRAY', prefix: '_xlfn.', minArgs: 3, maxArgs: 3, args: (i) => (i < 2 ? 'value' : 'any'),
    call: ([rows, cols, fn]: [Scalar, Scalar, Value], ctx) => {
      if (!(fn instanceof LambdaValue)) return ERR.VALUE;
      const n = toInt(rows, ctx), m = toInt(cols, ctx);
      if (n instanceof CalcError) return n;
      if (m instanceof CalcError) return m;
      // não inteiro ou < 1 → #VALUE! (medido: MAKEARRAY(1,9;…) → #VALUE!)
      if (n < 1 || m < 1 || !Number.isInteger(n) || !Number.isInteger(m)) return ERR.VALUE;
      if (n * m > 1048576 * 16384) return ERR.NUM;
      return fillLambda(n, m, ctx, (r, c) => ctx.callLambda(fn, [r + 1, c + 1]));
    },
  },
);

/**
 * Entrada de MAP/REDUCE/SCAN/BYROW/BYCOL: matriz ou intervalo. De um intervalo
 * a LAMBDA recebe REFERÊNCIAS (MAP(A1:A3;LAMBDA(x;ISREF(x))) → VERDADEIRO; medido).
 */
interface Input { readonly rows: number; readonly cols: number; get(r: number, c: number): Value; line(i: number, byRow: boolean): Value }
function lambdaInput(v: Value, ctx: FnContext): Input | CalcError {
  void ctx;
  if (v instanceof RefValue) {
    const a = v.single;
    if (!a) return ERR.VALUE;
    return {
      rows: a.r2 - a.r1 + 1, cols: a.c2 - a.c1 + 1,
      get: (r, c) => new RefValue([{ sheet: a.sheet, r1: a.r1 + r, c1: a.c1 + c, r2: a.r1 + r, c2: a.c1 + c }]),
      line: (i, byRow) => new RefValue([byRow ? { sheet: a.sheet, r1: a.r1 + i, c1: a.c1, r2: a.r1 + i, c2: a.c2 } : { sheet: a.sheet, r1: a.r1, c1: a.c1 + i, r2: a.r2, c2: a.c1 + i }]),
    };
  }
  if (v instanceof LambdaValue) return ERR.VALUE;
  const m = v instanceof ArrayValue ? v : new ArrayValue(1, 1, [v]);
  return {
    rows: m.rows, cols: m.cols, get: (r, c) => m.get(r, c),
    line: (i, byRow) => (byRow ? ArrayValue.fill(1, m.cols, (_r, c) => m.get(i, c)) : ArrayValue.fill(m.rows, 1, (r) => m.get(r, i))),
  };
}

/** Matriz de resultados de LAMBDA: um resultado matricial (aninhado) torna o TODO #CALC! (medido). */
function fillLambda(rows: number, cols: number, ctx: FnContext, f: (r: number, c: number) => Value): Value {
  const data: Scalar[] = new Array(rows * cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = lambdaScalar(f(r, c), ctx);
    if (v === undefined) return ERR.CALC;
    data[r * cols + c] = v;
  }
  return new ArrayValue(rows, cols, data);
}

/** Resultado de uma chamada de LAMBDA posto numa célula; undefined = matriz aninhada. */
function lambdaScalar(v: Value, ctx: FnContext): Scalar | undefined {
  if (v instanceof ArrayValue) return v.rows === 1 && v.cols === 1 ? v.get(0, 0) ?? 0 : undefined;
  if (v instanceof RefValue) {
    const a = v.single;
    if (a && a.r1 === a.r2 && a.c1 === a.c2) return ctx.cell(a.sheet, a.r1, a.c1) ?? 0;
    return undefined;
  }
  if (v instanceof LambdaValue) return ERR.CALC;
  return v === null ? 0 : v;
}

function byLine(arr: Value, fn: Value, ctx: FnContext, rows: boolean): Value {
  if (!(fn instanceof LambdaValue)) return ERR.VALUE;
  if (fn.params.length !== 1 && typeof fn.body !== 'function') return ERR.VALUE;
  const a = lambdaInput(arr, ctx);
  if (a instanceof CalcError) return a;
  const n = rows ? a.rows : a.cols;
  return fillLambda(rows ? n : 1, rows ? 1 : n, ctx, (r, c) => ctx.callLambda(fn, [a.line(rows ? r : c, rows)]));
}

/** Número de argumento (sem truncar). */
function toInt(v: Scalar, ctx: FnContext): number | CalcError {
  if (v instanceof CalcError) return v;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null) return 0;
  return toNumberText(v, ctx);
}

function toNumberText(s: string, ctx: FnContext): number | CalcError {
  const t = s.trim();
  if (!t) return ERR.VALUE;
  const n = Number(ctx.locale.decimal === '.' ? t : t.split(ctx.locale.group).join('').replace(ctx.locale.decimal, '.'));
  return Number.isFinite(n) ? n : ERR.VALUE;
}

/** Igualdade do SWITCH: texto sem caixa, tipos diferentes nunca iguais, vazio = 0 (medido: vazio ≠ ""). */
function sameValue(a: Scalar, b: Scalar): boolean {
  if (a === null) a = 0;
  if (b === null) b = 0;
  if (typeof a !== typeof b) return false;
  return compareScalars(a, b) === 0;
}

function replaceErrors(v: Thunk, alt: Thunk, ctx: FnContext, hit: (e: CalcError) => boolean): Value {
  const x = scalarOrArray(v.omitted ? 0 : v(), ctx);
  let altV: Scalar | ArrayValue | undefined;
  const getAlt = (): Scalar | ArrayValue => (altV ??= scalarOrArray(alt.omitted ? 0 : alt(), ctx));
  if (x instanceof ArrayValue) {
    if (!x.data.some((e) => e instanceof CalcError && hit(e))) return x;
    const a = getAlt();
    const { rows, cols } = a instanceof ArrayValue ? dims([x, a]) : { rows: x.rows, cols: x.cols };
    return ArrayValue.fill(rows, cols, (r, c) => {
      const e = at(x, r, c);
      return e instanceof CalcError && hit(e) ? at(a, r, c) : e;
    });
  }
  if (x instanceof CalcError && hit(x)) {
    const a = alt.omitted ? 0 : alt();
    return a;
  }
  return x;
}

/** AND/OR/XOR: booleanos e números (texto e vazio em referência/matriz são ignorados). */
function logicalFold(args: readonly Value[], ctx: FnContext, f: (acc: boolean, b: boolean) => boolean, init: boolean): Scalar {
  let acc = init, any = false;
  let err: CalcError | undefined;
  const take = (v: Scalar, direct: boolean): void => {
    if (err) return;
    if (v instanceof CalcError) { err = v; return; }
    if (typeof v === 'boolean') { acc = f(acc, v); any = true; return; }
    if (typeof v === 'number') { acc = f(acc, v !== 0); any = true; return; }
    if (direct && typeof v === 'string') {
      // texto direto: só o nome do booleano no idioma conta; outro texto é ignorado (medido)
      const b = textToBool(v, ctx);
      if (b !== undefined) { acc = f(acc, b); any = true; }
    }
  };
  for (const a of args) {
    if (a instanceof RefValue) {
      for (const area of a.areas) ctx.forEachCell(area, (v) => take(v, false));
    } else if (a instanceof ArrayValue) {
      for (const v of a.data) take(v ?? null, false);
    } else if (a instanceof LambdaValue) {
      err ??= ERR.VALUE;
    } else if (a === null) {
      // argumento omitido (=AND(TRUE;)) conta como FALSO (medido)
      take(false, true);
    } else take(a, true);
    if (err) return err;
  }
  if (err) return err;
  return any ? acc : ERR.VALUE;
}
