/**
 * Referência (INDEX, OFFSET, INDIRECT, ROW, ROWS, COLUMN, COLUMNS, AREAS, CELL, INFO, SHEET, SHEETS, FORMULATEXT, ISREF, ISFORMULA; SINGLE interno).
 * ANCHORARRAY (A1#) e _TRO_* (A1:.A10) são operadores, não funções de célula: formas especiais do avaliador.
 * Dono: agente CORE.
 */
import { register, type FnContext } from '../fn.js';
import { toNumber, toText } from '../coerce.js';
import { implicitIntersection } from '../apply.js';
import { cellToA1 } from '../a1.js';
import { toLocal } from '../i18n/translate.js';
import { ArrayValue, CalcError, ERR, LambdaValue, MAX_COL, MAX_ROW, RefValue, type Area, type Scalar, type Value } from '../values.js';

/** Argumento cru → escalar (referência de uma célula → valor; várias → interseção implícita). */
function scalarArg(v: Value, ctx: FnContext): Scalar {
  if (v instanceof RefValue) {
    const a = v.single;
    if (a && a.r1 === a.r2 && a.c1 === a.c2) return ctx.cell(a.sheet, a.r1, a.c1);
    return implicitIntersection(v, ctx);
  }
  if (v instanceof ArrayValue) return v.rows && v.cols ? v.get(0, 0) : ERR.VALUE;
  if (v instanceof LambdaValue) return ERR.CALC;
  return v;
}

/**
 * OFFSET/INDIRECT com argumento matricial (ou intervalo no contexto de matriz):
 * cada elemento seria uma referência, que não cabe numa matriz → #VALUE! em
 * cada posição (medido: INDIRETO({"A1";"A2"}) → {#VALOR!;#VALOR!}).
 */
function arrayOfRefs(args: readonly (Value | undefined)[], ctx: FnContext): ArrayValue | undefined {
  let rows = 0, cols = 0;
  for (const v of args) {
    let r = 0, c = 0;
    if (v instanceof ArrayValue) { r = v.rows; c = v.cols; }
    else if (v instanceof RefValue && ctx.arrayContext !== false) {
      const a = v.single;
      if (a && (a.r1 !== a.r2 || a.c1 !== a.c2)) { r = a.r2 - a.r1 + 1; c = a.c2 - a.c1 + 1; }
    }
    rows = Math.max(rows, r); cols = Math.max(cols, c);
  }
  return rows ? ArrayValue.fill(rows, cols, () => ERR.VALUE) : undefined;
}

/** Número inteiro de argumento (trunca); erro do Excel se não for número. */
function intArg(v: Scalar, ctx: FnContext): number | CalcError {
  if (v instanceof CalcError) return v;
  const n = toNumber(v, ctx.locale);
  return n instanceof CalcError ? n : Math.trunc(n);
}

const isCell = (a: Area): boolean => a.r1 === a.r2 && a.c1 === a.c2;

/** Matriz de uma função "por célula" quando a referência tem várias células (ROW(A1:A3) → {1;2;3}). */
function perCell(a: Area, f: (r: number, c: number) => Scalar): Scalar | ArrayValue {
  if (isCell(a)) return f(a.r1, a.c1);
  return ArrayValue.fill(a.r2 - a.r1 + 1, a.c2 - a.c1 + 1, (r, c) => f(a.r1 + r, a.c1 + c));
}

/** INDEX sobre uma área: devolve referência (linha/coluna 0 = inteira). */
function indexArea(a: Area, row: number, col: number, colGiven: boolean): Value {
  const rows = a.r2 - a.r1 + 1, cols = a.c2 - a.c1 + 1;
  if (!colGiven) {
    // um único índice: vetor de uma linha usa-o como coluna; área 2D → #REF! (medido)
    if (rows === 1 && cols > 1) { col = row; row = 1; }
    else if (cols === 1) col = 1;
    else return ERR.REF;
  }
  if (row < 0 || col < 0) return ERR.VALUE;
  if (row > rows || col > cols) return ERR.REF;
  const r1 = row ? a.r1 + row - 1 : a.r1, r2 = row ? r1 : a.r2;
  const c1 = col ? a.c1 + col - 1 : a.c1, c2 = col ? c1 : a.c2;
  return new RefValue([{ sheet: a.sheet, r1, c1, r2, c2 }]);
}

function indexArray(m: ArrayValue, row: number, col: number, colGiven: boolean): Value {
  if (!colGiven) {
    if (m.rows === 1 && m.cols > 1) { col = row; row = 1; }
    else col = m.cols === 1 ? 1 : 0;
  }
  if (row < 0 || col < 0) return ERR.VALUE;
  if (row > m.rows || col > m.cols) return ERR.REF;
  if (row && col) return m.get(row - 1, col - 1);
  if (row) return ArrayValue.fill(1, m.cols, (_r, c) => m.get(row - 1, c));
  if (col) return ArrayValue.fill(m.rows, 1, (r) => m.get(r, col - 1));
  return m;
}

/** Texto do CELL("address"). */
function address(ctx: FnContext, a: Area, absolute = true): string {
  const own = a.sheet === ctx.sheet ? '' : `${quoteName(ctx.sheetName(a.sheet))}!`;
  return own + cellToA1(a.r1, a.c1, absolute, absolute);
}
function quoteName(n: string): string {
  return /^[\p{L}_][\p{L}\p{N}_.]*$/u.test(n) && !/^[A-Za-z]{1,3}\d+$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`;
}

register(
  {
    name: 'INDEX', minArgs: 2, maxArgs: 4, args: (i) => (i === 0 ? 'ref' : 'value'), lift: true, returnsRef: true,
    call: ([arr, r, c, ar]: [Value, Scalar, Scalar?, Scalar?], ctx) => {
      if (arr instanceof CalcError) return arr;
      const row = r === null ? 0 : intArg(r!, ctx);
      if (row instanceof CalcError) return row;
      const colGiven = c !== undefined;
      const col = c === undefined || c === null ? 0 : intArg(c, ctx);
      if (col instanceof CalcError) return col;
      if (arr instanceof RefValue) {
        const k = ar === undefined || ar === null ? 1 : intArg(ar, ctx);
        if (k instanceof CalcError) return k;
        if (k < 1) return ERR.VALUE;
        const a = arr.areas[k - 1];
        if (!a) return ERR.REF;
        return indexArea(a, row, col, colGiven);
      }
      if (ar !== undefined && ar !== null) {
        const k = intArg(ar, ctx);
        if (k instanceof CalcError) return k;
        if (k !== 1) return ERR.REF;
      }
      if (arr instanceof LambdaValue) return ERR.VALUE;
      const m = arr instanceof ArrayValue ? arr : new ArrayValue(1, 1, [arr as Scalar]);
      return indexArray(m, row, col, colGiven);
    },
  },
  {
    name: 'OFFSET', minArgs: 3, maxArgs: 5, args: (i) => (i === 0 ? 'ref' : 'any'), returnsRef: true, volatile: true,
    call: (raw: [Value, Value, Value, Value?, Value?], ctx) => {
      const arr = arrayOfRefs(raw.slice(1), ctx);
      if (arr) return arr;
      const [ref, dr, dc, h, w] = raw.map((v, i) => (i === 0 ? v : scalarArg(v!, ctx))) as [Value, Scalar, Scalar, Scalar?, Scalar?];
      if (ref instanceof CalcError) return ref;
      if (!(ref instanceof RefValue)) return ERR.VALUE;
      const a = ref.single;
      if (!a) return ERR.VALUE;
      const rows = intArg(dr, ctx), cols = intArg(dc, ctx);
      if (rows instanceof CalcError) return rows;
      if (cols instanceof CalcError) return cols;
      let height = h === undefined || h === null ? a.r2 - a.r1 + 1 : intArg(h, ctx);
      let width = w === undefined || w === null ? a.c2 - a.c1 + 1 : intArg(w, ctx);
      if (height instanceof CalcError) return height;
      if (width instanceof CalcError) return width;
      if (height === 0 || width === 0) return ERR.REF;
      let r1 = a.r1 + rows, c1 = a.c1 + cols;
      let r2 = r1 + height - 1, c2 = c1 + width - 1;
      if (height < 0) { r2 = r1; r1 = r1 + height + 1; }
      if (width < 0) { c2 = c1; c1 = c1 + width + 1; }
      if (r1 < 0 || c1 < 0 || r2 > MAX_ROW || c2 > MAX_COL) return ERR.REF;
      void height; void width;
      return new RefValue([{ sheet: a.sheet, r1, c1, r2, c2 }]);
    },
  },
  {
    name: 'INDIRECT', minArgs: 1, maxArgs: 2, args: 'any', returnsRef: true, volatile: true,
    call: (raw: [Value, Value?], ctx) => {
      const arr = arrayOfRefs(raw, ctx);
      if (arr) return arr;
      const [t, a1] = raw.map((v) => scalarArg(v!, ctx)) as [Scalar, Scalar?];
      if (t instanceof CalcError) return t;
      const text = toText(t!, ctx.locale);
      if (text instanceof CalcError) return text;
      let isA1 = true;
      if (a1 !== undefined && a1 !== null) {
        if (a1 instanceof CalcError) return a1;
        const n = typeof a1 === 'boolean' ? a1 : typeof a1 === 'number' ? a1 !== 0 : undefined;
        if (n === undefined) return ERR.VALUE;
        isA1 = n;
      }
      // sem aparar e sem "=" (medido: INDIRETO(" A1 ") e INDIRETO("=A1") → #REF!)
      if (!text || text.startsWith('=') || text !== text.trim()) return ERR.REF;
      return ctx.parseRef(text, isA1);
    },
  },
  {
    name: 'ROW', minArgs: 0, maxArgs: 1, args: 'ref',
    call: ([ref]: [Value?], ctx) => {
      if (ref === undefined || ref === null) return ctx.row + 1;
      if (ref instanceof CalcError) return ref;
      if (!(ref instanceof RefValue)) return ERR.VALUE;
      const a = ref.single;
      if (!a) return ERR.REF;
      if (a.r1 === a.r2) return a.r1 + 1;
      return ArrayValue.fill(a.r2 - a.r1 + 1, 1, (r) => a.r1 + r + 1);
    },
  },
  {
    name: 'COLUMN', minArgs: 0, maxArgs: 1, args: 'ref',
    call: ([ref]: [Value?], ctx) => {
      if (ref === undefined || ref === null) return ctx.col + 1;
      if (ref instanceof CalcError) return ref;
      if (!(ref instanceof RefValue)) return ERR.VALUE;
      const a = ref.single;
      if (!a) return ERR.REF;
      if (a.c1 === a.c2) return a.c1 + 1;
      return ArrayValue.fill(1, a.c2 - a.c1 + 1, (_r, c) => a.c1 + c + 1);
    },
  },
  {
    name: 'ROWS', minArgs: 1, maxArgs: 1, args: 'ref',
    call: ([v]: [Value]) => {
      if (v instanceof CalcError) return v;
      if (v instanceof RefValue) { const a = v.single; return a ? a.r2 - a.r1 + 1 : ERR.REF; }
      if (v instanceof ArrayValue) return v.rows;
      if (v instanceof LambdaValue) return ERR.VALUE;
      return 1;
    },
  },
  {
    name: 'COLUMNS', minArgs: 1, maxArgs: 1, args: 'ref',
    call: ([v]: [Value]) => {
      if (v instanceof CalcError) return v;
      if (v instanceof RefValue) { const a = v.single; return a ? a.c2 - a.c1 + 1 : ERR.REF; }
      if (v instanceof ArrayValue) return v.cols;
      if (v instanceof LambdaValue) return ERR.VALUE;
      return 1;
    },
  },
  {
    name: 'AREAS', minArgs: 1, maxArgs: 1, args: 'ref',
    call: ([v]: [Value]) => {
      if (v instanceof CalcError) return v;
      // referência 3D (várias abas) não é aceita (medido: #VALUE!)
      if (v instanceof RefValue) return v.areas.some((a) => a.sheet !== v.areas[0]!.sheet) ? ERR.VALUE : v.areas.length;
      return ERR.VALUE;
    },
  },
  {
    name: 'SHEET', prefix: '_xlfn.', minArgs: 0, maxArgs: 1, args: 'ref',
    call: ([v]: [Value?], ctx) => {
      if (v === undefined || v === null) return ctx.sheet + 1;
      if (v instanceof CalcError) return v;
      if (v instanceof RefValue) return (v.areas[0]?.sheet ?? ctx.sheet) + 1;
      if (v instanceof ArrayValue || v instanceof LambdaValue) return ERR.NA;
      if (typeof v === 'string') { const i = ctx.sheetIndex(v); return i === undefined ? ERR.NA : i + 1; }
      return ERR.NA;
    },
  },
  {
    name: 'SHEETS', prefix: '_xlfn.', minArgs: 0, maxArgs: 1, args: 'ref',
    call: ([v]: [Value?], ctx) => {
      if (v === undefined || v === null) return ctx.sheetCount();
      if (v instanceof CalcError) return v;
      if (v instanceof RefValue) return new Set(v.areas.map((a) => a.sheet)).size;
      return ERR.NA;
    },
  },
  {
    name: 'FORMULATEXT', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, args: 'ref',
    call: ([v]: [Value], ctx) => {
      if (v instanceof CalcError) return v;
      if (!(v instanceof RefValue)) return ERR.NA;
      const a = v.areas[0]!;
      // no idioma de quem calcula, como a barra de fórmulas (Excel pt-BR: "=SOMA(A1:A3)")
      const one = (r: number, c: number): Scalar => {
        const f = ctx.formulaAt(a.sheet, r, c);
        if (f === undefined) return ERR.NA;
        try { return toLocal(`=${f}`, { lang: ctx.locale.id, decimal: ctx.locale.decimal }); } catch { return `=${f}`; }
      };
      if (ctx.arrayContext === false || v.areas.length > 1) return one(a.r1, a.c1);
      return perCell(a, one);
    },
  },
  {
    name: 'ISREF', minArgs: 1, maxArgs: 1, args: 'any', acceptsErrors: true,
    call: ([v]: [Value]) => v instanceof RefValue,
  },
  {
    name: 'ISFORMULA', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, args: 'ref', acceptsErrors: true,
    call: ([v]: [Value], ctx) => {
      if (v instanceof CalcError) return v;
      if (!(v instanceof RefValue)) return ERR.VALUE;
      const a = v.areas[0]!;
      const one = (r: number, c: number): Scalar => ctx.formulaAt(a.sheet, r, c) !== undefined;
      if (ctx.arrayContext === false || v.areas.length > 1) return one(a.r1, a.c1);
      return perCell(a, one);
    },
  },
  {
    name: 'CELL', minArgs: 1, maxArgs: 2, args: (i) => (i === 0 ? 'value' : 'ref'), volatile: true,
    call: ([info, ref]: [Scalar, Value?], ctx) => {
      if (info instanceof CalcError) return info;
      if (typeof info !== 'string') return ERR.VALUE;
      let a: Area;
      if (ref === undefined || ref === null) a = { sheet: ctx.sheet, r1: ctx.row, c1: ctx.col, r2: ctx.row, c2: ctx.col };
      else if (ref instanceof CalcError) return ref;
      else if (ref instanceof RefValue) a = ref.areas[0]!;
      else return ERR.VALUE;
      const kind = info.trim().toLowerCase();
      const v = (): Scalar => ctx.cell(a.sheet, a.r1, a.c1);
      switch (kind) {
        case 'address': {
          if (a.sheet === ctx.sheet) return address(ctx, a);
          // outra aba: o Excel inclui a pasta ("[Pasta1]Plan2!$A$1"), se o hospedeiro souber o nome
          const book = ctx.cellInfo?.(a.sheet, a.r1, a.c1, 'bookname');
          if (typeof book !== 'string') return address(ctx, a);
          const body = `[${book}]${ctx.sheetName(a.sheet)}`;
          return `${/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(ctx.sheetName(a.sheet)) ? body : `'${body.replace(/'/g, "''")}'`}!${cellToA1(a.r1, a.c1, true, true)}`;
        }
        case 'col': return a.c1 + 1;
        case 'row': return a.r1 + 1;
        case 'contents': { const x = v(); return x === null ? 0 : x; }
        case 'type': { const x = v(); return x === null ? 'b' : typeof x === 'string' ? 'l' : 'v'; }
        case 'filename': return ctx.cellInfo?.(a.sheet, a.r1, a.c1, 'filename') ?? '';
        case 'format': case 'color': case 'parentheses': case 'prefix': case 'protect': case 'width': {
          const x = ctx.cellInfo?.(a.sheet, a.r1, a.c1, kind);
          if (x !== undefined) return x;
          // padrão de uma célula sem formatação (estilo Normal)
          switch (kind) {
            case 'format': return 'G';
            case 'color': return 0;
            case 'parentheses': return 0;
            case 'prefix': { const y = v(); return typeof y === 'string' ? "'" : ''; }
            case 'protect': return 1;
            // 365: {largura; é a largura padrão?} (medido)
            case 'width': return ArrayValue.of([[8, true]]);
          }
          return ERR.VALUE;
        }
        default: return ERR.VALUE;
      }
    },
  },
  {
    name: 'INFO', minArgs: 1, maxArgs: 1, args: 'value', volatile: true,
    call: ([t]: [Scalar], ctx) => {
      if (t instanceof CalcError) return t;
      if (typeof t !== 'string') return ERR.VALUE;
      switch (t.trim().toLowerCase()) {
        case 'directory': return ctx.cellInfo?.(ctx.sheet, 0, 0, 'directory') ?? ERR.NA;
        case 'numfile': return ctx.sheetCount();
        case 'origin': return `$A:${cellToA1(0, 0, true, true)}`;
        case 'osversion': return 'Windows (64-bit) NT 10.00';
        case 'recalc': return ctx.locale.id === 'pt-BR' ? 'Automático' : 'Automatic';
        case 'release': return '16.0';
        case 'system': return 'pcdos';
        default: return ERR.VALUE;
      }
    },
  },
  {
    // @x: interseção implícita (gravada como _xlfn.SINGLE)
    name: 'SINGLE', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, args: 'any', acceptsErrors: true, returnsRef: true,
    call: ([v]: [Value], ctx) => {
      if (v instanceof RefValue) {
        const a = v.single;
        if (!a) return ERR.VALUE;
        if (isCell(a)) return v;
        const x = implicitIntersection(v, ctx);
        if (x instanceof CalcError && x === ERR.VALUE) return x;
        const r = a.r1 === a.r2 ? a.r1 : ctx.row, c = a.c1 === a.c2 ? a.c1 : ctx.col;
        return new RefValue([{ sheet: a.sheet, r1: r, c1: c, r2: r, c2: c }]);
      }
      if (v instanceof ArrayValue) return v.rows && v.cols ? v.get(0, 0) : ERR.VALUE;
      if (v instanceof LambdaValue) return ERR.CALC;
      return v;
    },
  },
);
