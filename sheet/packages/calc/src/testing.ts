/**
 * Apoio aos testes das bibliotecas de funções sem o avaliador: um FnContext de
 * mentira sobre um mapa de células e `callFn`, que aplica os modos de
 * argumento como o avaliador (via `applyFn`). Não é usado em produção.
 */
import { applyFn, implicitIntersection, type RawArg } from './apply.js';
import { EN_US, lookupFn, type FnContext, type Thunk, type ValueLocale } from './fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, MAX_COL, MAX_ROW, RefValue, type Area, type Scalar, type Value } from './values.js';
import { Engine } from './engine.js';
import type { CellInput, NameInput, TableInput } from './workbook.js';

/** "A1", "$B$2", "C" → índices 0-based. */
export function parseA1Cell(s: string): { row: number; col: number } | undefined {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(s);
  if (!m) return undefined;
  let col = 0;
  for (const ch of m[1]!.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: +m[2]! - 1, col: col - 1 };
}

/** "A1:B3" (ou "A1") → área na aba `sheet`. */
export function parseA1Area(s: string, sheet = 0): Area {
  // coluna(s) inteira(s) "A:C" e linha(s) inteira(s) "2:5"
  const whole = /^\$?([A-Z]{1,3}):\$?([A-Z]{1,3})$/i.exec(s) ?? /^\$?(\d+):\$?(\d+)$/.exec(s);
  if (whole) {
    const isCol = /[A-Z]/i.test(whole[1]!);
    const p = isCol ? parseA1Cell(`${whole[1]}1`)! : parseA1Cell(`A${whole[1]}`)!;
    const q = isCol ? parseA1Cell(`${whole[2]}1`)! : parseA1Cell(`A${whole[2]}`)!;
    return isCol
      ? { sheet, r1: 0, r2: MAX_ROW, c1: Math.min(p.col, q.col), c2: Math.max(p.col, q.col) }
      : { sheet, r1: Math.min(p.row, q.row), r2: Math.max(p.row, q.row), c1: 0, c2: MAX_COL };
  }
  const [a, b = a] = s.split(':') as [string, string?];
  const p = parseA1Cell(a), q = parseA1Cell(b!);
  if (!p || !q) throw new Error(`referência inválida no teste: ${s}`);
  return { sheet, r1: Math.min(p.row, q.row), c1: Math.min(p.col, q.col), r2: Math.max(p.row, q.row), c2: Math.max(p.col, q.col) };
}

export interface MockOptions {
  /** Abas: nome → { "A1": valor }. A primeira é a aba da fórmula. */
  readonly sheets?: Record<string, Record<string, Scalar>>;
  /** Fórmulas (texto canônico sem "=") por "Aba!A1" ou "A1" (aba 0). */
  readonly formulas?: Record<string, string>;
  /** Linhas ocultas / filtradas (0-based) da aba 0. */
  readonly hiddenRows?: readonly number[];
  readonly filteredRows?: readonly number[];
  /** Célula da fórmula (padrão: fora do mapa, Z1000). */
  readonly at?: string;
  readonly locale?: ValueLocale;
  readonly date1904?: boolean;
  /** Serial de "agora" (padrão: 45658.5 = 01/01/2025 12:00). */
  readonly now?: number;
  /** Semente do RAND determinístico. */
  readonly seed?: number;
  /** Fórmula dinâmica (padrão) ou legada (FnContext.arrayContext). */
  readonly arrayContext?: boolean;
}

/** FnContext sobre mapas de células. LambdaValue com `body` função JS é chamável (testes de MAP/REDUCE…). */
export function mockContext(o: MockOptions = {}): FnContext {
  const names = Object.keys(o.sheets ?? { Sheet1: {} });
  const grids = names.map((n) => {
    const g = new Map<string, Scalar>();
    for (const [k, v] of Object.entries(o.sheets?.[n] ?? {})) {
      const p = parseA1Cell(k);
      if (p) g.set(`${p.row},${p.col}`, v);
    }
    return g;
  });
  const at = parseA1Cell(o.at ?? 'Z1000')!;
  const formulas = new Map<string, string>();
  for (const [k, f] of Object.entries(o.formulas ?? {})) {
    const [sh, ref] = k.includes('!') ? (k.split('!') as [string, string]) : [names[0]!, k];
    const p = parseA1Cell(ref)!;
    formulas.set(`${names.indexOf(sh)},${p.row},${p.col}`, f);
  }
  let seed = o.seed ?? 12345;
  const cell = (sheet: number, row: number, col: number): Scalar => grids[sheet]?.get(`${row},${col}`) ?? null;
  const ctx: FnContext = {
    sheet: 0, row: at.row, col: at.col,
    date1904: o.date1904 ?? false,
    arrayContext: o.arrayContext,
    locale: o.locale ?? EN_US,
    values(ref, area = 0) {
      const a = ref.areas[area]!;
      return ArrayValue.fill(a.r2 - a.r1 + 1, a.c2 - a.c1 + 1, (r, c) => cell(a.sheet, a.r1 + r, a.c1 + c));
    },
    cell,
    forEachCell(a, fn) {
      const g = grids[a.sheet];
      if (!g) return;
      const hits: [number, number, Scalar][] = [];
      for (const [k, v] of g) {
        const [r, c] = k.split(',').map(Number) as [number, number];
        if (r >= a.r1 && r <= a.r2 && c >= a.c1 && c <= a.c2) hits.push([r, c, v]);
      }
      hits.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      for (const [r, c, v] of hits) fn(v, r, c);
    },
    formulaAt: (s, r, c) => formulas.get(`${s},${r},${c}`),
    // medido: o Excel pula qualquer fórmula que CONTENHA SUBTOTAL/AGGREGATE (=1+SUBTOTAL(…) também)
    isSubtotalCell: (s, r, c) => /(^|[^A-Z0-9_.])(_xlfn\.)?(SUBTOTAL|AGGREGATE)\s*\(/i.test(formulas.get(`${s},${r},${c}`) ?? ''),
    rowHidden: (s, r) => s === 0 && (o.hiddenRows ?? []).includes(r),
    rowFiltered: (s, r) => s === 0 && (o.filteredRows ?? []).includes(r),
    sheetCount: () => names.length,
    sheetName: (i) => names[i] ?? '',
    sheetIndex: (n) => { const i = names.findIndex((x) => x.toUpperCase() === n.toUpperCase()); return i < 0 ? undefined : i; },
    now: () => o.now ?? 45658.5,
    random: () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; },
    callLambda(fn, args) {
      return typeof fn.body === 'function' ? (fn.body as (...a: readonly Value[]) => Value)(...args) : ERR.CALC;
    },
    parseRef(text, a1) {
      if (!a1) return ERR.REF;
      const m = /^(?:'?([^'!]+)'?!)?(\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?)$/i.exec(text.trim());
      if (!m) return ERR.REF;
      const sheet = m[1] ? names.findIndex((x) => x.toUpperCase() === m[1]!.toUpperCase()) : 0;
      if (sheet < 0) return ERR.REF;
      return new RefValue([parseA1Area(m[2]!.replace(/\$/g, ''), sheet)]);
    },
  };
  return ctx;
}

/** "A1:B2" ou união "(A1:A2,C1:C3)" → referência na aba `sheet`. */
export function parseRefUnion(s: string, sheet = 0): RefValue {
  const t = s.trim().replace(/^\((.*)\)$/, '$1');
  return new RefValue(t.split(',').map((p) => parseA1Area(p.trim(), sheet)));
}

/** Argumento de teste: escalar, matriz literal, referência ("A1:B2" na aba 0) ou thunk. */
export type TestArg = Scalar | Scalar[][] | { ref: string; sheet?: number } | { lazy: Value } | { omitted: true } | LambdaValue | ArrayValue | RefValue;

/** Lambda de teste implementada em JS. */
export function jsLambda(params: string[], f: (...a: readonly Value[]) => Value): LambdaValue {
  return new LambdaValue(params, f, undefined);
}

function toRaw(a: TestArg): RawArg {
  if (a === null || typeof a !== 'object' || a instanceof CalcError || a instanceof LambdaValue || a instanceof ArrayValue || a instanceof RefValue) return a;
  if (Array.isArray(a)) return ArrayValue.of(a);
  if ('ref' in a) return parseRefUnion(a.ref, a.sheet ?? 0);
  if ('lazy' in a) { const v = a.lazy; const t = (() => v) as Thunk; Object.defineProperty(t, 'omitted', { value: false }); return t; }
  const t = (() => null) as Thunk; Object.defineProperty(t, 'omitted', { value: true }); return t;
}

/**
 * Chama a função registrada `name` como o avaliador faria numa fórmula de
 * matriz dinâmica (padrão) ou legada (`arrayContext: false`). Argumentos `lazy`
 * recebem thunks automaticamente.
 */
export function callFn(name: string, args: readonly TestArg[], ctx: FnContext = mockContext(), arrayContext = true): Value {
  const def = lookupFn(name);
  if (!def) return ERR.NAME;
  const raw = args.map((a, i) => {
    const r = toRaw(a);
    const mode = typeof def.args === 'function' ? def.args(i) : def.args;
    if (mode === 'lazy' && typeof r !== 'function') {
      const t = (() => r) as Thunk; Object.defineProperty(t, 'omitted', { value: a === null }); return t;
    }
    return r;
  });
  const omitted = args.flatMap((a, i) => (a !== null && typeof a === 'object' && 'omitted' in a ? [i] : []));
  return applyFn(def, raw, ctx, omitted.length ? { arrayContext, omitted } : { arrayContext });
}

/** Valor → forma comparável em testes (matriz vira Scalar[][], erro vira o código). */
export function plain(v: Value): unknown {
  if (v instanceof CalcError) return v.code;
  if (v instanceof ArrayValue) return Array.from({ length: v.rows }, (_, r) => Array.from({ length: v.cols }, (_, c) => plain(v.get(r, c))));
  if (v instanceof RefValue) return { ref: v.areas };
  if (v instanceof LambdaValue) return 'LAMBDA';
  return v;
}

// ---------------------------------------------------------------------------
// Casos do oráculo (Excel via _lab/calc/xl-calc.ps1). Formato JSON comum a
// todos os bancos de teste: test/oracle/<área>.cases.json (entrada, escrita por
// nós) + <área>.excel.json (saída do Excel, gerada pelo script).

/** Valor de célula/argumento em JSON: {e} = erro, {s} = texto que parece número. */
export type CaseScalar = number | string | boolean | null | { e: string } | { s: string };
export type CaseArg = CaseScalar | { omit: true } | { ref: string } | { arr: CaseScalar[][] } | { lambda: string };
/** Conteúdo de célula num caso: escalar ou fórmula canônica ({f:"=A1*2"}, matriz dinâmica). */
export type CaseCell = CaseScalar | { f: string };

export interface OracleCase {
  readonly id: string;
  /** Nome canônico da função (sem prefixo). Com `f`, só informativo (função principal do caso). */
  readonly fn: string;
  /** Argumentos (ignorados quando há `f`: use []). */
  readonly args: readonly CaseArg[];
  /**
   * Fórmula canônica INTEIRA ("=IF(A1>1,SUM(B1:B3),\"x\")"): avaliada pelo parser +
   * avaliador + motor (runCase) em vez de `fn(args)`.
   */
  readonly f?: string;
  /** Células da aba 1 ("A1": valor ou {f:"=…"}). */
  readonly cells?: Readonly<Record<string, CaseCell>>;
  /**
   * Abas extras ("Nome": células). Com elas, a aba 1 se chama "Sheet1" também no
   * Excel (sem elas, o Excel pt-BR a chama "Planilha1").
   */
  readonly sheets?: Readonly<Record<string, Readonly<Record<string, CaseCell>>>>;
  /** Nomes definidos da pasta ("Nome": "=Sheet1!$A$1"). */
  readonly names?: Readonly<Record<string, string>>;
  /** Tabelas na aba 1: intervalo A1 com cabeçalho (os nomes das colunas vêm das células). */
  readonly tables?: readonly { readonly name: string; readonly ref: string; readonly totals?: boolean }[];
  /** Célula da fórmula (padrão Z100). */
  readonly at?: string;
  /** Fórmula legada (interseção implícita) em vez de matriz dinâmica. */
  readonly legacy?: boolean;
  readonly date1904?: boolean;
  /** Linhas (1-based, como no Excel) ocultas à mão / por filtro (SUBTOTAL, AGGREGATE). */
  readonly hiddenRows?: readonly number[];
  readonly filteredRows?: readonly number[];
  /**
   * Fórmulas de células ("A3": "=SUBTOTAL(9,A1:A2)"). O Excel calcula a fórmula; o
   * nosso contexto de mentira usa o valor de `cells` para a célula e só a fórmula
   * (para isSubtotalCell/formulaAt).
   */
  readonly formulas?: Readonly<Record<string, string>>;
}

/** Resposta do Excel para um caso. */
export interface OracleResult {
  readonly id: string;
  readonly v?: CaseScalar;
  readonly spill?: CaseScalar[][];
  readonly text?: string;
  readonly f?: string;
  readonly local?: string;
  readonly err?: string;
}

function caseScalar(x: CaseScalar): Scalar {
  if (x !== null && typeof x === 'object') return 'e' in x ? CalcError.of(x.e as never) : x.s;
  return x;
}

function scalarLiteral(x: CaseScalar): string {
  if (x === null) return '';
  if (typeof x === 'number') return String(x).toUpperCase();
  if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
  if (typeof x === 'string') return `"${x.replace(/"/g, '""')}"`;
  return 'e' in x ? x.e : `"${x.s.replace(/"/g, '""')}"`;
}

/** Fórmula canônica (en-US) do caso, para o Excel. */
export function caseFormula(c: OracleCase): string {
  if (c.f !== undefined) return c.f.startsWith('=') ? c.f : `=${c.f}`;
  const lit = (a: CaseArg): string => {
    if (a !== null && typeof a === 'object') {
      if ('omit' in a) return '';
      if ('ref' in a) return a.ref;
      if ('arr' in a) return `{${a.arr.map((row) => row.map(scalarLiteral).join(',')).join(';')}}`;
      if ('lambda' in a) return a.lambda;
    }
    return scalarLiteral(a as CaseScalar);
  };
  return `=${c.fn}(${c.args.map(lit).join(',')})`;
}

/** Entrada do xl-calc.ps1 para uma lista de casos. */
export function toOracleInput(cases: readonly OracleCase[]): unknown[] {
  return cases.map((c) => {
    let cells: Record<string, unknown> | undefined = c.cells ? { ...c.cells } : undefined;
    if (c.formulas) { cells ??= {}; for (const [k, f] of Object.entries(c.formulas)) cells[k] = { f }; }
    return { id: c.id, f: caseFormula(c), cells, at: c.at, legacy: c.legacy, date1904: c.date1904, hiddenRows: c.hiddenRows, filteredRows: c.filteredRows, sheets: c.sheets, names: c.names, tables: c.tables };
  });
}

/** Roda o caso no nosso motor (sem avaliador: callFn sobre um contexto de mentira). */
export function runCase(c: OracleCase, locale: ValueLocale, extra: Partial<MockOptions> = {}): Value {
  if (c.f !== undefined || c.sheets || c.names || c.tables || Object.values(c.cells ?? {}).some(isFormulaCell)) return runFormulaCase(c, locale, extra);
  const cells: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(c.cells ?? {})) cells[k] = caseScalar(v as CaseScalar);
  const formulas: Record<string, string> = {};
  for (const [k, f] of Object.entries(c.formulas ?? {})) formulas[k] = f.replace(/^=/, '');
  const ctx = mockContext({
    sheets: { Sheet1: cells }, at: c.at ?? 'Z100', locale, date1904: c.date1904, formulas,
    hiddenRows: c.hiddenRows?.map((r) => r - 1), arrayContext: !c.legacy,
    // medido: com a aba em modo de filtro (sheetPr filterMode), TODA linha oculta conta
    // como filtrada para SUBTOTAL 1–11 — inclusive as ocultas à mão, fora do AutoFiltro
    filteredRows: c.filteredRows?.length ? [...c.filteredRows, ...(c.hiddenRows ?? [])].map((r) => r - 1) : undefined,
    ...extra,
  });
  const args: TestArg[] = c.args.map((a) => {
    if (a !== null && typeof a === 'object') {
      if ('omit' in a) return { omitted: true };
      if ('ref' in a) return { ref: a.ref };
      if ('arr' in a) return a.arr.map((row) => row.map(caseScalar));
      // nome de função como LAMBDA (eta: GROUPBY(...; SUM)) → chama a função registrada
      if ('lambda' in a) {
        // parâmetros = argumentos obrigatórios da função (GROUPBY passa o total a PERCENTOF)
        const fn = a.lambda, n = lookupFn(fn)?.minArgs ?? 1;
        return jsLambda(Array.from({ length: n }, (_, i) => `p${i + 1}`), (...xs) => callFn(fn, xs as readonly Value[] as TestArg[], ctx));
      }
    }
    return caseScalar(a as CaseScalar);
  });
  const v = callFn(c.fn, args, ctx, !c.legacy);
  // referência como resultado (XLOOKUP, INDEX…): a célula mostra o valor, como o avaliador faz
  if (v instanceof RefValue) {
    const a = v.single;
    if (!a) return ERR.VALUE;
    if (a.r1 === a.r2 && a.c1 === a.c2) return ctx.cell(a.sheet, a.r1, a.c1);
    return c.legacy ? implicitIntersection(v, ctx) : ctx.values(v);
  }
  // fórmula legada com matriz como resultado: a célula mostra o canto superior esquerdo
  if (c.legacy && v instanceof ArrayValue) return v.rows && v.cols ? v.get(0, 0) : ERR.VALUE;
  return v;
}

const isFormulaCell = (x: CaseCell): x is { f: string } => x !== null && typeof x === 'object' && 'f' in x;

function cellInputs(cells: Readonly<Record<string, CaseCell>>): [number, number, CellInput][] {
  const out: [number, number, CellInput][] = [];
  for (const [k, v] of Object.entries(cells)) {
    const p = parseA1Cell(k);
    if (!p) continue;
    if (isFormulaCell(v)) out.push([p.row, p.col, { f: { text: v.f.replace(/^=/, ''), t: 'array', dynamic: true } }]);
    else out.push([p.row, p.col, { v: caseScalar(v) }]);
  }
  return out;
}

/**
 * Caso com fórmula inteira: monta a pasta (aba 1 + extras, nomes, tabelas),
 * recalcula com o motor e devolve o valor da célula da fórmula (a matriz
 * inteira quando derrama).
 */
export function runFormulaCase(c: OracleCase, locale: ValueLocale, extra: Partial<MockOptions> = {}): Value {
  const at = parseA1Cell(c.at ?? 'Z100')!;
  const main = cellInputs(c.cells ?? {});
  const text = caseFormula(c).slice(1);
  main.push([at.row, at.col, { f: c.legacy ? { text } : { text, t: 'array', dynamic: true } }]);
  const sheets = [{ name: c.sheets ? 'Sheet1' : 'Planilha1', cells: main }];
  for (const [name, cells] of Object.entries(c.sheets ?? {})) sheets.push({ name, cells: cellInputs(cells) });
  const names: NameInput[] = Object.entries(c.names ?? {}).map(([name, f]) => ({ name, formula: f.replace(/^=/, '') }));
  const tables: TableInput[] = (c.tables ?? []).map((t) => {
    const a = parseA1Area(t.ref);
    const columns: string[] = [];
    for (let col = a.c1; col <= a.c2; col++) {
      const k = Object.keys(c.cells ?? {}).find((x) => { const p = parseA1Cell(x); return p && p.row === a.r1 && p.col === col; });
      const v = k !== undefined ? (c.cells ?? {})[k] : undefined;
      columns.push(v === undefined || v === null ? `Coluna${col - a.c1 + 1}` : typeof v === 'object' ? ('s' in v ? v.s : '') : String(v));
    }
    return { name: t.name, sheet: 0, ref: t.ref, headerRowCount: 1, totalsRowCount: t.totals ? 1 : 0, columns };
  });
  const eng = new Engine({ sheets, names, tables, date1904: c.date1904 }, { locale, now: () => extra.now ?? 45658.5, random: () => 0.5 });
  eng.recalc();
  const f = eng.getFormula(0, at.row, at.col);
  if (f?.area && f.dynamic) return eng.values(f.area);
  return eng.getValue(0, at.row, at.col);
}

/** Números iguais como o Excel os mostra (15 dígitos significativos). */
export function sameNumber(a: number, b: number): boolean {
  if (a === b) return true;
  return Number(a.toPrecision(15)) === Number(b.toPrecision(15));
}

function sameScalar(ours: Scalar, xl: CaseScalar): boolean {
  const x = caseScalar(xl);
  if (typeof ours === 'number' && typeof x === 'number') return sameNumber(ours, x);
  if (ours === null) return x === null || x === 0;
  return ours === x;
}

/**
 * Nosso valor bate com o do Excel? Derramamento compara a matriz inteira; a
 * célula vazia que o Excel mostra como 0 (=A1 vazio) conta como igual.
 */
export function matchesOracle(ours: Value, xl: OracleResult): boolean {
  if (xl.spill) {
    if (!(ours instanceof ArrayValue) || ours.rows !== xl.spill.length || ours.cols !== (xl.spill[0]?.length ?? 0)) return false;
    return xl.spill.every((row, r) => row.every((v, c) => sameScalar(ours.get(r, c), v)));
  }
  const v = ours instanceof ArrayValue ? (ours.rows === 1 && ours.cols === 1 ? ours.get(0, 0) : undefined) : ours;
  if (v === undefined || v instanceof RefValue || v instanceof LambdaValue) return false;
  return sameScalar(v, xl.v ?? null);
}
