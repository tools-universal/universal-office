/**
 * Avaliador: AST → Value. Resolve referências (A1 relativo à célula, abas, 3D,
 * externas, nomes, tabelas), aplica operadores com difusão de matrizes e a
 * interseção implícita das fórmulas legadas, chama as funções pelo `applyFn`
 * (modos de argumento, levantamento, erros) e implementa LET/LAMBDA.
 *
 * Contexto de matriz: fórmula dinâmica (365) ou CSE avalia tudo como matriz;
 * fórmula legada faz interseção implícita nas referências de várias células
 * usadas como valor — exceto dentro de argumentos de classe "matriz"
 * (SUMPRODUCT, MMULT, LOOKUP…), que avaliam a subexpressão como matriz.
 * Dono: agente CORE.
 */
import { MAX_COL, MAX_ROW, ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Area, type Scalar, type Value } from './values.js';
import { argMode, lookupFn, type FnContext, type FnDef, type Thunk, type ValueLocale } from './fn.js';
import { applyFn, implicitIntersection, type RawArg } from './apply.js';
import { boundingArea, intersectAreas, wrapCol, wrapRow } from './a1.js';
import type { Node, RefPart, SheetSpec, TableItem } from './ast.js';
import { arith, broadcast2, compare, concat, map1, negate, percent, type ArithOp, type CmpOp } from './ops.js';
import { parseFormula, FormulaSyntaxError } from './parse.js';

/** Tabela (ListObject) já resolvida em coordenadas. */
export interface TableDef {
  readonly name: string;
  readonly sheet: number;
  /** Área inteira (cabeçalho + dados + total). */
  readonly area: Area;
  readonly headerRows: number;
  readonly totalsRows: number;
  readonly columns: readonly string[];
}

/** O que o avaliador precisa da pasta de trabalho (o Engine implementa). */
export interface EvalHost {
  readonly locale: ValueLocale;
  readonly date1904: boolean;
  sheetCount(): number;
  sheetName(i: number): string;
  sheetIndex(name: string): number | undefined;
  /** Aba externa `[ext]Nome` → índice de aba (≥ EXTERNAL_BASE) ou undefined. */
  externalSheet(ext: number, name: string): number | undefined;
  cell(sheet: number, row: number, col: number): Scalar;
  values(area: Area): ArrayValue;
  forEachCell(area: Area, fn: (v: Scalar, row: number, col: number) => void): void;
  formulaText(sheet: number, row: number, col: number): string | undefined;
  isSubtotalCell(sheet: number, row: number, col: number): boolean;
  rowHidden(sheet: number, row: number): boolean;
  rowFiltered(sheet: number, row: number): boolean;
  now(): number;
  random(): number;
  /** Nome definido visto da aba `sheet` (escopo da aba primeiro, depois a pasta). */
  definedName(name: string, sheet: number, explicitSheet?: boolean): Node | undefined;
  table(name: string): TableDef | undefined;
  tableAt(sheet: number, row: number, col: number): TableDef | undefined;
  /** Área derramada pela âncora (sheet,row,col), se for âncora de matriz dinâmica. */
  spillArea(sheet: number, row: number, col: number): Area | undefined;
  /** Informação de formatação/estilo para CELL (opcional). */
  cellInfo?(sheet: number, row: number, col: number, what: string): Scalar | undefined;
}

/** Valor de parâmetro de LAMBDA omitido (ISOMITTED). */
const OMITTED: unique symbol = Symbol('omitted');
type Binding = Value | typeof OMITTED;

/** Ambiente léxico de LET/LAMBDA (nomes em MAIÚSCULAS). */
export class Env {
  constructor(readonly parent: Env | undefined, readonly vars: Map<string, Binding>) {}
  lookup(name: string): Binding | undefined {
    for (let e: Env | undefined = this; e; e = e.parent) {
      const v = e.vars.get(name);
      if (v !== undefined) return v;
    }
    return undefined;
  }
}

interface Closure { readonly env: Env | undefined }

interface Scope {
  /** Contexto da célula no modo certo (`ctx.arrayContext === arr`). */
  readonly ctx: CellCtx;
  /** Avaliação como matriz (fórmula dinâmica/CSE ou argumento de classe matriz). */
  readonly arr: boolean;
  readonly env: Env | undefined;
}

/** Limite de profundidade (LAMBDA recursiva, nomes que se referem a si mesmos). */
const MAX_DEPTH = 300;

/** FnContext de uma célula (o que as funções enxergam). */
export class CellCtx implements FnContext {
  private twin: CellCtx | undefined;
  constructor(readonly ev: Evaluator, readonly sheet: number, readonly row: number, readonly col: number, readonly arrayContext = true) {}
  /** O mesmo contexto no outro modo (legado ↔ matriz). */
  withArray(arr: boolean): CellCtx {
    if (arr === this.arrayContext) return this;
    return (this.twin ??= Object.assign(new CellCtx(this.ev, this.sheet, this.row, this.col, arr), { twin: this }));
  }
  get date1904(): boolean { return this.ev.host.date1904; }
  get locale(): ValueLocale { return this.ev.host.locale; }
  values(ref: RefValue, area = 0): ArrayValue {
    const a = ref.areas[area];
    return a ? this.ev.host.values(a) : new ArrayValue(0, 0, []);
  }
  cell(sheet: number, row: number, col: number): Scalar { return this.ev.host.cell(sheet, row, col); }
  forEachCell(area: Area, fn: (v: Scalar, row: number, col: number) => void): void { this.ev.host.forEachCell(area, fn); }
  formulaAt(sheet: number, row: number, col: number): string | undefined { return this.ev.host.formulaText(sheet, row, col); }
  isSubtotalCell(sheet: number, row: number, col: number): boolean { return this.ev.host.isSubtotalCell(sheet, row, col); }
  rowHidden(sheet: number, row: number): boolean { return this.ev.host.rowHidden(sheet, row); }
  rowFiltered(sheet: number, row: number): boolean { return this.ev.host.rowFiltered(sheet, row); }
  sheetCount(): number { return this.ev.host.sheetCount(); }
  sheetName(i: number): string { return this.ev.host.sheetName(i); }
  sheetIndex(name: string): number | undefined { return this.ev.host.sheetIndex(name); }
  now(): number { return this.ev.host.now(); }
  random(): number { return this.ev.host.random(); }
  callLambda(fn: LambdaValue, args: readonly Value[]): Value { return this.ev.callLambda(fn, args, this); }
  parseRef(text: string, a1: boolean): RefValue | CalcError { return this.ev.parseRef(text, a1, this); }
  resolveName(name: string): Value {
    const n = this.ev.host.definedName(name, this.sheet);
    return n ? this.ev.evalNode(n, { ctx: this.withArray(true), arr: true, env: undefined }) : ERR.NAME;
  }
  /** Área derramada da âncora (ANCHORARRAY). */
  spillRange(sheet: number, row: number, col: number): Area | undefined { return this.ev.host.spillArea(sheet, row, col); }
  /** Formatação da célula para CELL (gancho do hospedeiro). */
  cellInfo(sheet: number, row: number, col: number, what: string): Scalar | undefined { return this.ev.host.cellInfo?.(sheet, row, col, what); }
}

export class Evaluator {
  private depth = 0;
  constructor(readonly host: EvalHost) {}

  /** Contexto de uma célula. `arrayContext` = dinâmica/CSE (false = legada). */
  context(sheet: number, row: number, col: number, arrayContext = true): CellCtx {
    return new CellCtx(this, sheet, row, col, arrayContext);
  }

  /** Avalia a fórmula inteira (valor cru: referência, matriz, escalar, lambda). */
  evalFormula(n: Node, ctx: CellCtx): Value {
    const s: Scope = { ctx, arr: ctx.arrayContext, env: undefined };
    // a última operação da fórmula (+/− na raiz) tem o ajuste perto de zero
    if (n.t === 'bin' && (n.op === '+' || n.op === '-')) return this.bin(n.op, n.a, n.b, s, true);
    return this.evalNode(n, s);
  }

  evalNode(n: Node, s: Scope): Value {
    switch (n.t) {
      case 'num': return n.v;
      case 'str': return n.v;
      case 'bool': return n.v;
      case 'err': return CalcError.of(n.v);
      case 'arr': return ArrayValue.of(n.rows.map((r) => [...r]));
      case 'missing': return null;
      case 'cell': return this.refOf(n.sheet, s.ctx, n.row, n.col, n.row, n.col);
      case 'area': return this.refOf(n.sheet, s.ctx, n.r1, n.c1, n.r2, n.c2);
      case 'referr': return ERR.REF;
      case 'name': return this.name(n, s);
      case 'table': return this.tableRef(n, s.ctx);
      case 'paren': return this.evalNode(n.e, s);
      case 'fn': return this.fn(n, s);
      case 'call': {
        const f = this.evalNode(n.fn, s);
        if (f instanceof CalcError) return f;
        if (!(f instanceof LambdaValue)) return ERR.VALUE;
        return this.invoke(f, n.args, s);
      }
      case 'unary': {
        const v = this.evalNode(n.e, s);
        if (n.op === '+') return v;
        const x = this.operand(v, s);
        const loc = this.host.locale;
        return n.op === '-' ? map1(x, (a) => negate(a, loc)) : map1(x, (a) => percent(a, loc));
      }
      case 'bin': return this.bin(n.op, n.a, n.b, s);
    }
  }

  /** Operando de operador: referência → matriz (contexto de matriz) ou interseção implícita. */
  private operand(v: Value, s: Scope): Scalar | ArrayValue {
    if (v instanceof RefValue) {
      const a = v.single;
      if (a && a.r1 === a.r2 && a.c1 === a.c2) return this.host.cell(a.sheet, a.r1, a.c1);
      if (!s.arr) return implicitIntersection(v, s.ctx);
      if (!a) return ERR.VALUE;
      return this.host.values(a);
    }
    if (v instanceof LambdaValue) return ERR.CALC;
    return v;
  }

  private bin(op: string, an: Node, bn: Node, s: Scope, top = false): Value {
    if (op === ':' || op === ' ' || op === ',') {
      const a = this.evalNode(an, s), b = this.evalNode(bn, s);
      if (a instanceof CalcError) return a;
      if (b instanceof CalcError) return b;
      if (!(a instanceof RefValue) || !(b instanceof RefValue)) return ERR.VALUE;
      if (op === ',') {
        const sh = a.areas[0]?.sheet;
        if ([...a.areas, ...b.areas].some((x) => x.sheet !== sh)) return ERR.VALUE;
        return new RefValue([...a.areas, ...b.areas]);
      }
      if (op === ':') {
        const all = [...a.areas, ...b.areas];
        if (all.some((x) => x.sheet !== all[0]!.sheet)) return ERR.VALUE;
        return new RefValue([all.reduce(boundingArea)]);
      }
      const out: Area[] = [];
      for (const x of a.areas) for (const y of b.areas) { const i = intersectAreas(x, y); if (i) out.push(i); }
      return out.length ? new RefValue(out) : ERR.NULL;
    }
    const x = this.operand(this.evalNode(an, s), s);
    const y = this.operand(this.evalNode(bn, s), s);
    const loc = this.host.locale;
    switch (op) {
      case '+': case '-': case '*': case '/': case '^':
        return broadcast2(x, y, (a, b) => arith(op as ArithOp, a, b, loc, top));
      case '&': return broadcast2(x, y, (a, b) => concat(a, b, loc));
      default: return broadcast2(x, y, (a, b) => compare(op as CmpOp, a, b));
    }
  }

  // ---- referências ----

  private part(p: RefPart, base: number, wrap: (x: number) => number): number {
    return p.abs ? p.n : wrap(base + p.n);
  }

  /** Abas de um prefixo (3D = várias). */
  sheetsOf(spec: SheetSpec | undefined, ctx: CellCtx): number[] | CalcError {
    if (!spec) return [ctx.sheet];
    if (spec.ext !== undefined && spec.ext !== 0) {
      const i = this.host.externalSheet(spec.ext, spec.sheet);
      return i === undefined ? ERR.REF : [i];
    }
    const a = this.host.sheetIndex(spec.sheet);
    if (a === undefined) return ERR.REF;
    if (spec.sheet2 === undefined) return [a];
    const b = this.host.sheetIndex(spec.sheet2);
    if (b === undefined) return ERR.REF;
    const out: number[] = [];
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    return out;
  }

  private refOf(spec: SheetSpec | undefined, ctx: CellCtx, r1?: RefPart, c1?: RefPart, r2?: RefPart, c2?: RefPart): Value {
    const sheets = this.sheetsOf(spec, ctx);
    if (sheets instanceof CalcError) return sheets;
    const R1 = r1 ? this.part(r1, ctx.row, wrapRow) : 0, R2 = r2 ? this.part(r2, ctx.row, wrapRow) : MAX_ROW;
    const C1 = c1 ? this.part(c1, ctx.col, wrapCol) : 0, C2 = c2 ? this.part(c2, ctx.col, wrapCol) : MAX_COL;
    const area = (sheet: number): Area => ({ sheet, r1: Math.min(R1, R2), c1: Math.min(C1, C2), r2: Math.max(R1, R2), c2: Math.max(C1, C2) });
    return new RefValue(sheets.map(area));
  }

  private name(n: Extract<Node, { t: 'name' }>, s: Scope): Value {
    if (!n.sheet && s.env) {
      const b = s.env.lookup(n.name.toUpperCase());
      if (b !== undefined) return b === OMITTED ? null : b;
    }
    if (n.param) return ERR.NAME;
    let sheet = s.ctx.sheet;
    let explicit = false;
    if (n.sheet) {
      if (n.sheet.ext !== undefined && n.sheet.ext !== 0) return ERR.REF;
      // [0]!Nome = nome da própria pasta (o Excel mostra 'Pasta.xlsx'!Nome)
      if (n.sheet.sheet) {
        const sh = this.sheetsOf(n.sheet, s.ctx);
        if (sh instanceof CalcError) return sh;
        sheet = sh[0]!;
        explicit = true;
      } else sheet = -1;
    }
    const def = this.host.definedName(n.name, sheet, explicit);
    if (!def) return ERR.NAME;
    if (++this.depth > MAX_DEPTH) { this.depth--; return ERR.NAME; }
    try {
      return this.evalNode(def, { ctx: s.ctx, arr: s.arr, env: undefined });
    } finally { this.depth--; }
  }

  private tableRef(n: Extract<Node, { t: 'table' }>, ctx: CellCtx): Value {
    const t = n.table ? this.host.table(n.table) : this.host.tableAt(ctx.sheet, ctx.row, ctx.col);
    if (!t) return n.table ? ERR.NAME : ERR.REF;
    const a = t.area;
    const dataR1 = a.r1 + t.headerRows, dataR2 = a.r2 - t.totalsRows;
    let r1: number, r2: number;
    const items = new Set<TableItem>(n.items);
    if (!items.size) items.add('#Data');
    if (items.has('#This Row')) {
      if (ctx.sheet !== t.sheet || ctx.row < dataR1 || ctx.row > dataR2) return ERR.VALUE;
      r1 = r2 = ctx.row;
    } else if (items.has('#All')) { r1 = a.r1; r2 = a.r2; }
    else {
      const h = items.has('#Headers'), d = items.has('#Data'), tt = items.has('#Totals');
      if (h && !t.headerRows) return ERR.REF;
      if (tt && !t.totalsRows) return ERR.REF;
      if (h && tt && !d) return ERR.REF;
      r1 = h ? a.r1 : d ? dataR1 : a.r2;
      r2 = tt ? a.r2 : d ? dataR2 : a.r1;
      if (r2 < r1) return ERR.REF;
    }
    let c1 = a.c1, c2 = a.c2;
    if (n.col1 !== undefined) {
      const idx = (name: string): number => t.columns.findIndex((c) => c.toUpperCase() === name.toUpperCase());
      const i1 = idx(n.col1), i2 = n.col2 !== undefined ? idx(n.col2) : i1;
      if (i1 < 0 || i2 < 0) return ERR.REF;
      c1 = a.c1 + Math.min(i1, i2); c2 = a.c1 + Math.max(i1, i2);
    }
    return new RefValue([{ sheet: t.sheet, r1, c1, r2, c2 }]);
  }

  // ---- funções ----

  private fn(n: Extract<Node, { t: 'fn' }>, s: Scope): Value {
    switch (n.name) {
      case 'LET': return this.let(n.args, s);
      case 'LAMBDA': return this.lambda(n.args, s);
      case 'ISOMITTED': {
        if (n.args.length !== 1) return ERR.VALUE;
        const a = n.args[0]!;
        if (a.t === 'name' && s.env) return s.env.lookup(a.name.toUpperCase()) === OMITTED;
        return false;
      }
    }
    // nome de LET/LAMBDA chamado como função: x(1)
    if (s.env && !n.prefix) {
      const b = s.env.lookup(n.name);
      if (b instanceof LambdaValue) return this.invoke(b, n.args, s);
      if (b !== undefined) return ERR.VALUE;
    }
    const def = /^_xludf\.|^_xll\./i.test(n.prefix ?? '') ? undefined : lookupFn(n.name);
    if (!def) {
      // LAMBDA guardada em nome definido
      const nd = this.host.definedName(n.name, s.ctx.sheet);
      if (nd) {
        const f = this.evalNode(nd, { ctx: s.ctx, arr: s.arr, env: undefined });
        if (f instanceof LambdaValue) return this.invoke(f, n.args, s);
        if (f instanceof CalcError) return f;
        return ERR.VALUE;
      }
      return ERR.NAME;
    }
    return this.apply(def, n.args, s);
  }

  private apply(def: FnDef, argNodes: readonly Node[], s: Scope): Value {
    const raw: RawArg[] = new Array(argNodes.length);
    for (let i = 0; i < argNodes.length; i++) {
      const a = argNodes[i]!;
      const mode = argMode(def, i);
      if (mode === 'lazy') {
        const omitted = a.t === 'missing';
        const t = (() => (omitted ? null : this.evalNode(a, s))) as Thunk;
        Object.defineProperty(t, 'omitted', { value: omitted });
        raw[i] = t;
        continue;
      }
      if (a.t === 'missing') { raw[i] = null; continue; }
      // legado: argumento de classe matriz avalia a subexpressão como matriz
      const sub = mode === 'array' && !s.arr ? { ...s, arr: true, ctx: s.ctx.withArray(true) } : s;
      raw[i] = this.evalNode(a, sub);
    }
    return applyFn(def, raw, s.ctx, { arrayContext: s.arr });
  }

  private let(args: readonly Node[], s: Scope): Value {
    if (args.length < 3 || args.length % 2 === 0) return ERR.VALUE;
    const vars = new Map<string, Binding>();
    const env = new Env(s.env, vars);
    const inner: Scope = { ...s, env };
    for (let i = 0; i + 1 < args.length; i += 2) {
      const nm = args[i]!;
      if (nm.t !== 'name' || nm.sheet) return ERR.VALUE;
      const v = this.evalNode(args[i + 1]!, inner);
      vars.set(nm.name.toUpperCase(), v);
    }
    return this.evalNode(args[args.length - 1]!, inner);
  }

  private lambda(args: readonly Node[], s: Scope): Value {
    if (args.length < 1) return ERR.VALUE;
    const params: string[] = [];
    for (let i = 0; i < args.length - 1; i++) {
      const p = args[i]!;
      if (p.t !== 'name' || p.sheet) return ERR.VALUE;
      params.push(p.name.toUpperCase());
    }
    const closure: Closure = { env: s.env };
    return new LambdaValue(params, args[args.length - 1]!, closure);
  }

  /** Chamada de LAMBDA com argumentos ainda não avaliados. */
  private invoke(f: LambdaValue, argNodes: readonly Node[], s: Scope): Value {
    const vals: Binding[] = argNodes.map((a) => (a.t === 'missing' ? OMITTED : this.evalNode(a, s)));
    return this.callBound(f, vals, s.ctx);
  }

  callLambda(f: LambdaValue, args: readonly Value[], ctx: CellCtx): Value {
    return this.callBound(f, args, ctx);
  }

  private callBound(f: LambdaValue, args: readonly Binding[], ctx: CellCtx): Value {
    if (typeof f.body === 'function') return (f.body as (...a: readonly Value[]) => Value)(...args.map((a) => (a === OMITTED ? null : a)));
    // número de argumentos tem de ser exato (omitido explícito "(1;)" conta; medido)
    if (args.length !== f.params.length) return ERR.VALUE;
    const vars = new Map<string, Binding>();
    f.params.forEach((p, i) => vars.set(p, i < args.length ? args[i]! : OMITTED));
    const closure = f.closure as Closure | undefined;
    if (++this.depth > MAX_DEPTH) { this.depth--; return ERR.NUM; }
    try {
      return this.evalNode(f.body as Node, { ctx: ctx.withArray(true), arr: true, env: new Env(closure?.env, vars) });
    } catch (e) {
      if (e instanceof RangeError) return ERR.NUM;
      throw e;
    } finally { this.depth--; }
  }

  /** INDIRECT: texto → referência (A1 ou R1C1), relativo à célula `ctx`. */
  parseRef(text: string, a1: boolean, ctx: CellCtx): RefValue | CalcError {
    let node: Node;
    try {
      const loc = this.host.locale;
      const r1c1Letters = loc.r1c1 ?? R1C1_LETTERS[loc.id];
      node = parseFormula(text, { r1c1: !a1, row: ctx.row, col: ctx.col, ...(r1c1Letters ? { r1c1Letters } : {}) });
    } catch (e) {
      if (e instanceof FormulaSyntaxError) return ERR.REF;
      throw e;
    }
    if (!isRefNode(node)) return ERR.REF;
    const v = this.evalNode(node, { ctx: ctx.withArray(true), arr: true, env: undefined });
    return v instanceof RefValue ? v : ERR.REF;
  }
}

/** Letras do R1C1 por idioma de valores (o INDIRECT usa as do idioma; medido no pt-BR). */
const R1C1_LETTERS: Record<string, { row: string; col: string }> = {
  'pt-BR': { row: 'L', col: 'C' },
};

/** A expressão é (sintaticamente) uma referência — o que INDIRECT aceita. */
function isRefNode(n: Node): boolean {
  switch (n.t) {
    case 'cell': case 'area': case 'name': case 'table': return true;
    // sem união nem parênteses (medido: INDIRETO("(A1;B1)") → #REF!)
    case 'bin': return (n.op === ':' || n.op === ' ') && isRefNode(n.a) && isRefNode(n.b);
    default: return false;
  }
}

export { OMITTED };
