/**
 * Apoio aos testes das bibliotecas de funções sem o avaliador: um FnContext de
 * mentira sobre um mapa de células e `callFn`, que aplica os modos de
 * argumento como o avaliador (via `applyFn`). Não é usado em produção.
 */
import { applyFn, type RawArg } from './apply.js';
import { EN_US, lookupFn, type FnContext, type Thunk, type ValueLocale } from './fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Area, type Scalar, type Value } from './values.js';

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
    isSubtotalCell: (s, r, c) => /^\s*(_xlfn\.)?(SUBTOTAL|AGGREGATE)\s*\(/i.test(formulas.get(`${s},${r},${c}`) ?? ''),
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

/** Argumento de teste: escalar, matriz literal, referência ("A1:B2" na aba 0) ou thunk. */
export type TestArg = Scalar | Scalar[][] | { ref: string; sheet?: number } | { lazy: Value } | { omitted: true } | LambdaValue;

/** Lambda de teste implementada em JS. */
export function jsLambda(params: string[], f: (...a: readonly Value[]) => Value): LambdaValue {
  return new LambdaValue(params, f, undefined);
}

function toRaw(a: TestArg): RawArg {
  if (a === null || typeof a !== 'object' || a instanceof CalcError || a instanceof LambdaValue) return a;
  if (Array.isArray(a)) return ArrayValue.of(a);
  if ('ref' in a) return new RefValue([parseA1Area(a.ref, a.sheet ?? 0)]);
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
  return applyFn(def, raw, ctx, { arrayContext });
}

/** Valor → forma comparável em testes (matriz vira Scalar[][], erro vira o código). */
export function plain(v: Value): unknown {
  if (v instanceof CalcError) return v.code;
  if (v instanceof ArrayValue) return Array.from({ length: v.rows }, (_, r) => Array.from({ length: v.cols }, (_, c) => plain(v.get(r, c))));
  if (v instanceof RefValue) return { ref: v.areas };
  if (v instanceof LambdaValue) return 'LAMBDA';
  return v;
}
