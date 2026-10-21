/**
 * Campo de fórmula de tabela (= …) como o Word 365 pt-BR o calcula (medido em
 * write/tools/table-lab, experimentos fx-*): ABOVE/LEFT/BELOW/RIGHT param na
 * primeira célula VAZIA ou sem número; o número do início do texto vale
 * ("10 itens" = 10, "R$ 10,00" = 10 e passa a moeda ao resultado); números e
 * separador de lista do pt-BR (1.000,5; ROUND(x;1)); resultado sem formato com
 * as casas necessárias até max(2, casas das origens) e milhar se alguma origem
 * tinha; \# com # = algarismo ou espaço; erros em pt-BR.
 */
import type { TableBlock, TableCell } from './fulldoc.js';
import { mapTable, cellAt, cellContent, vMergeOf, type TableMap } from './table-ops.js';

/** Número lido de uma célula, com o formato que ele passa ao resultado. */
export interface CellNumber { n: number; decimals: number; thousands: boolean; prefix?: string; suffix?: string }

export const cellText = (cell: TableCell): string =>
  cellContent(cell).map((b) => (b.type === 'paragraph' ? b.paragraph.runs.map((r) => r.text).join('') : '')).join('\n');

/** Número no INÍCIO do texto da célula (pt-BR); null = vazia ou sem número. */
export function parseCellNumber(text: string): CellNumber | null {
  const m = /^\s*(R\$|US\$|\$|€|£)?\s*(\(?)([-+]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(\)?)\s*(%?)/.exec(text);
  if (!m) return null;
  const int = m[4]!.replace(/\./g, '');
  const dec = m[5] ?? '';
  let n = parseFloat(`${int}${dec ? '.' + dec : ''}`);
  if (m[3] === '-' || (m[2] === '(' && m[6] === ')')) n = -n;
  return { n, decimals: dec.length, thousands: m[4]!.includes('.'), ...(m[1] ? { prefix: m[1] + ' ' } : {}), ...(m[7] ? { suffix: '%' } : {}) };
}

export interface FormulaEnv {
  table: TableBlock;
  /** linha e coluna da GRADE da célula do campo */
  r: number;
  c: number;
  /** indicadores com número (DEFINED/valor) */
  bookmarks?: Map<string, number>;
}

type Val = { kind: 'num'; v: number } | { kind: 'list'; v: number[] };
class FxError extends Error {}

/** Erros como o Word pt-BR os mostra. */
export const FORMULA_ERRORS = {
  divZero: '!Divisão por zero',
  unexpectedEnd: '!Fim imprevisto da fórmula',
  syntax: '!Erro de sintaxe',
  missingOperator: '!Operador ausente',
  undefinedBookmark: '!Indicador não definido',
} as const;

const FUNCS = ['ABS', 'AND', 'AVERAGE', 'COUNT', 'DEFINED', 'FALSE', 'IF', 'INT', 'MAX', 'MIN', 'MOD', 'NOT', 'OR', 'PRODUCT', 'ROUND', 'SIGN', 'SUM', 'TRUE'] as const;
export const FORMULA_FUNCTIONS: readonly string[] = FUNCS;

/** Avalia `=…` na célula do ambiente. Devolve o número e o formato herdado, ou o erro. */
export function evaluateFormula(formula: string, env: FormulaEnv): { value: number; fmt: CellNumber } | { error: string } {
  const src = formula.replace(/^\s*=/, '');
  const m = mapTable(env.table);
  // formato herdado das células lidas
  const fmt: CellNumber = { n: 0, decimals: 0, thousands: false };
  const seen = (x: CellNumber): number => {
    fmt.decimals = Math.max(fmt.decimals, x.decimals);
    fmt.thousands ||= x.thousands;
    if (x.prefix && !fmt.prefix) fmt.prefix = x.prefix;
    if (x.suffix && !fmt.suffix) fmt.suffix = x.suffix;
    return x.n;
  };
  const toks = tokenize(src);
  let i = 0;
  const peek = (): string | undefined => toks[i];
  const next = (): string => { const t = toks[i++]; if (t === undefined) throw new FxError(FORMULA_ERRORS.unexpectedEnd); return t; };
  const expect = (t: string): void => { if (next() !== t) throw new FxError(FORMULA_ERRORS.syntax); };
  const num = (v: Val): number => {
    if (v.kind === 'num') return v.v;
    if (v.v.length !== 1) throw new FxError(FORMULA_ERRORS.syntax);
    return v.v[0]!;
  };
  const flat = (vs: Val[]): number[] => vs.flatMap((v) => (v.kind === 'num' ? [v.v] : v.v));

  const comparison = (): Val => {
    let a = additive();
    const op = peek();
    if (op && ['=', '<', '>', '<=', '>=', '<>'].includes(op)) {
      i++;
      const b = num(additive()), x = num(a);
      const r = op === '=' ? x === b : op === '<' ? x < b : op === '>' ? x > b : op === '<=' ? x <= b : op === '>=' ? x >= b : x !== b;
      a = { kind: 'num', v: r ? 1 : 0 };
    }
    return a;
  };
  const additive = (): Val => {
    let a = term();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const b = num(term());
      a = { kind: 'num', v: op === '+' ? num(a) + b : num(a) - b };
    }
    return a;
  };
  const term = (): Val => {
    let a = power();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const b = num(power());
      if (op === '/' && b === 0) throw new FxError(FORMULA_ERRORS.divZero);
      a = { kind: 'num', v: op === '*' ? num(a) * b : num(a) / b };
    }
    return a;
  };
  const power = (): Val => {
    let a = unary();
    while (peek() === '^') { next(); a = { kind: 'num', v: Math.pow(num(a), num(unary())) }; }
    return a;
  };
  const unary = (): Val => {
    if (peek() === '-') { next(); return { kind: 'num', v: -num(unary()) }; }
    if (peek() === '+') { next(); return unary(); }
    let v = primary();
    while (peek() === '%') { next(); v = { kind: 'num', v: num(v) / 100 }; }
    return v;
  };
  const primary = (): Val => {
    const t = next();
    if (t === '(') { const v = comparison(); expect(')'); return v; }
    if (/^\d/.test(t)) return { kind: 'num', v: parseFloat(t.replace(/\./g, '').replace(',', '.')) };
    const up = t.toUpperCase();
    if (up === 'TRUE') return { kind: 'num', v: 1 };
    if (up === 'FALSE') return { kind: 'num', v: 0 };
    if (['ABOVE', 'BELOW', 'LEFT', 'RIGHT'].includes(up)) return { kind: 'list', v: directional(m, env, up as 'ABOVE').map(seen) };
    if ((FUNCS as readonly string[]).includes(up) && peek() === '(') {
      next();
      const args: Val[] = [];
      if (peek() !== ')') {
        args.push(comparison());
        while (peek() === ';') { next(); args.push(comparison()); }
      }
      expect(')');
      return { kind: 'num', v: call(up, args) };
    }
    // referência A1 ou A1:B2
    const ref = /^([A-Za-z]{1,2})(\d+)$/.exec(t);
    if (ref) {
      let r2 = ref;
      if (peek() === ':') {
        next();
        const t2 = next();
        const m2 = /^([A-Za-z]{1,2})(\d+)$/.exec(t2);
        if (!m2) throw new FxError(FORMULA_ERRORS.syntax);
        r2 = m2;
      }
      const c1 = colIndex(ref[1]!), c2 = colIndex(r2[1]!), w1 = +ref[2]! - 1, w2 = +r2[2]! - 1;
      const vals: number[] = [];
      for (let row = Math.min(w1, w2); row <= Math.max(w1, w2); row++) {
        for (let ci = Math.min(c1, c2); ci <= Math.max(c1, c2); ci++) {
          const cell = env.table.rows[row]?.cells[ci];
          const x = cell ? parseCellNumber(cellText(cell)) : null;
          if (x) vals.push(seen(x));
          else if (ref === r2) vals.push(0);
        }
      }
      return ref === r2 ? { kind: 'num', v: vals[0] ?? 0 } : { kind: 'list', v: vals };
    }
    // indicador
    if (env.bookmarks?.has(t)) return { kind: 'num', v: env.bookmarks.get(t)! };
    throw new FxError(env.bookmarks ? FORMULA_ERRORS.undefinedBookmark : FORMULA_ERRORS.syntax);
  };
  const call = (f: string, args: Val[]): number => {
    const xs = flat(args);
    const one = (k: number): number => num(args[k] ?? { kind: 'num', v: 0 });
    switch (f) {
      case 'ABS': return Math.abs(one(0));
      case 'AND': return one(0) && one(1) ? 1 : 0;
      case 'OR': return one(0) || one(1) ? 1 : 0;
      case 'NOT': return one(0) ? 0 : 1;
      case 'AVERAGE': if (!xs.length) throw new FxError(FORMULA_ERRORS.divZero); return xs.reduce((a, b) => a + b, 0) / xs.length;
      case 'COUNT': return xs.length;
      case 'DEFINED': return 1;
      case 'IF': return one(0) ? one(1) : one(2);
      case 'INT': return Math.trunc(one(0));
      case 'MAX': return xs.length ? Math.max(...xs) : 0;
      case 'MIN': return xs.length ? Math.min(...xs) : 0;
      case 'MOD': { const b = one(1); if (b === 0) throw new FxError(FORMULA_ERRORS.divZero); return one(0) % b; }
      case 'PRODUCT': return xs.reduce((a, b) => a * b, 1);
      case 'ROUND': { const d = Math.trunc(one(1)); const p = Math.pow(10, d); const v = one(0) * p; return (Math.sign(v) * Math.round(Math.abs(v))) / p; }
      case 'SIGN': return Math.sign(one(0));
      case 'SUM': return xs.reduce((a, b) => a + b, 0);
      case 'TRUE': return 1;
      case 'FALSE': return 0;
    }
    throw new FxError(FORMULA_ERRORS.syntax);
  };
  try {
    if (!toks.length) throw new FxError(FORMULA_ERRORS.unexpectedEnd);
    const v = comparison();
    if (i < toks.length) throw new FxError(FORMULA_ERRORS.missingOperator);
    const value = v.kind === 'num' ? v.v : v.v.reduce((a, b) => a + b, 0);
    return { value, fmt };
  } catch (e) {
    if (e instanceof FxError) return { error: e.message };
    throw e;
  }
}

function tokenize(s: string): string[] {
  const out: string[] = [];
  const re = /\s*(<=|>=|<>|\d[\d.]*(?:,\d+)?|[A-Za-z_][A-Za-z_0-9]*|[-+*/^%()=<>;:])/y;
  let m: RegExpExecArray | null;
  while (re.lastIndex < s.length && (m = re.exec(s))) out.push(m[1]!);
  if (re.lastIndex < s.trimEnd().length) out.push('\u0000');
  return out;
}

const colIndex = (letters: string): number => {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Números de ABOVE/BELOW/LEFT/RIGHT: da célula vizinha para fora, até a 1ª vazia ou sem número. */
function directional(m: TableMap, env: FormulaEnv, dir: 'ABOVE' | 'BELOW' | 'LEFT' | 'RIGHT'): CellNumber[] {
  const out: CellNumber[] = [];
  const me = cellAt(m, env.r, env.c);
  let r = env.r, c = me?.col ?? env.c;
  for (;;) {
    if (dir === 'ABOVE') r--; else if (dir === 'BELOW') r++;
    else if (dir === 'LEFT') { const g = cellAt(m, r, c - 1); if (!g) break; c = g.col; } else { const g = cellAt(m, r, c + (cellAt(m, r, c)?.span ?? 1)); if (!g) break; c = g.col; }
    const g = cellAt(m, r, c);
    if (!g || r < 0 || r >= m.rows.length) break;
    if (vMergeOf(g.cell) === 'continue') continue;
    const x = parseCellNumber(cellText(g.cell));
    if (!x) break;
    out.push(x);
  }
  return out;
}

// ───────────────────────── formato do resultado ─────────────────────────

const group = (digits: string, sep: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** Arredonda longe do zero (o Word). */
const roundAway = (v: number, d: number): number => {
  const p = Math.pow(10, d);
  return (Math.sign(v) * Math.round(Math.abs(v) * p + 1e-9)) / p;
};

/** Resultado sem \#: casas necessárias até max(2, casas das origens), milhar e moeda herdados. */
export function formatFormulaResult(v: number, fmt: CellNumber): string {
  const cap = fmt.prefix ? Math.max(2, fmt.decimals) : Math.max(2, fmt.decimals);
  let d = 0;
  while (d < cap && Math.abs(roundAway(v, d) - v) > 1e-9) d++;
  if (fmt.prefix) d = Math.max(d, fmt.decimals);
  const r = roundAway(v, d);
  const [ip, dp] = Math.abs(r).toFixed(d).split('.');
  const body = (fmt.thousands ? group(ip!, '.') : ip!) + (dp ? ',' + dp : '');
  return `${r < 0 ? '-' : ''}${fmt.prefix ?? ''}${body}${fmt.suffix ?? ''}`;
}

/**
 * Imagem numérica \# do Word com os separadores do pt-BR ("." milhar, ","
 * decimal): 0 = algarismo, # = algarismo ou espaço, x corta, seções
 * positivo;negativo;zero, o resto é texto. O "." sem algarismo à esquerda some.
 */
export function formatPicture(v: number, picture: string): string {
  const secs = splitSections(picture);
  let pic = secs[0]!;
  let x = v;
  if (v < 0 && secs[1] !== undefined) { pic = secs[1]; x = -v; }
  else if (v === 0 && secs[2] !== undefined) pic = secs[2];
  pic = pic.replace(/^'(.*)'$/, '$1');
  const comma = pic.indexOf(',');
  const intPic = comma >= 0 ? pic.slice(0, comma) : pic;
  const decPic = comma >= 0 ? pic.slice(comma + 1) : '';
  const nDec = (decPic.match(/[0#x]/g) ?? []).length;
  const r = roundAway(Math.abs(x), nDec);
  const [ip, dp = ''] = r.toFixed(nDec).split('.');
  let digits = ip === '0' && /#/.test(intPic) && !/0/.test(intPic) ? '' : ip!;
  // inteiro: da direita para a esquerda
  const chars = [...intPic];
  const out: string[] = [];
  const firstPh = chars.findIndex((ch) => ch === '0' || ch === '#' || ch === 'x');
  const grouping = /[0#x]\.[0#x]/.test(intPic);
  for (let k = chars.length - 1; k >= 0; k--) {
    const ch = chars[k]!;
    if (ch === '0' || ch === '#' || ch === 'x') {
      const d = digits.length ? digits[digits.length - 1]! : undefined;
      digits = digits.slice(0, -1);
      // algarismos que sobram vão todos no 1º marcador (agrupados de 3 em 3 se a imagem agrupa)
      if (k === firstPh && digits.length) { const all = digits + (d ?? ''); out.unshift(grouping ? group(all, '.') : all); digits = ''; continue; }
      out.unshift(d ?? (ch === '0' ? '0' : ch === '#' ? ' ' : ''));
    } else if (ch === '.') {
      // separador de milhar: só com algarismo à esquerda
      const left = digits.length > 0;
      if (left) out.unshift('.');
    } else out.unshift(ch);
  }
  let dec = '';
  let di = 0;
  for (const ch of decPic) {
    if (ch === '0' || ch === '#' || ch === 'x') { dec += dp[di] ?? (ch === '0' ? '0' : ' '); di++; } else dec += ch;
  }
  const neg = x < 0 && secs[1] === undefined ? '-' : '';
  return neg + out.join('') + (comma >= 0 ? ',' + dec : '');
}

function splitSections(p: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (const ch of p) {
    if (ch === "'") q = !q;
    if (ch === ';' && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Fórmula sugerida pelo diálogo: SUM(ABOVE) com números acima; senão SUM(LEFT) com números à esquerda; senão "=". */
export function defaultFormula(table: TableBlock, r: number, c: number): string {
  const m = mapTable(table);
  const env = { table, r, c };
  if (directional(m, env, 'ABOVE').length) return '=SUM(ABOVE)';
  if (directional(m, env, 'LEFT').length) return '=SUM(LEFT)';
  return '=';
}

/** Instrução do campo como o Word grava: " =FÓRMULA \# "imagem" ". */
export const formulaInstr = (formula: string, picture?: string): string =>
  ` ${formula.trim()}${picture ? ` \\# "${picture}"` : ''} `;

/** Separa a instrução de um campo de fórmula: fórmula e imagem (\#). null se não for fórmula. */
export function parseFormulaInstr(instr: string): { formula: string; picture?: string } | null {
  const m = /^\s*(=[^\\]*?)\s*(?:\\#\s*"([^"]*)"|\\#\s*(\S+))?\s*$/.exec(instr);
  if (!m) return null;
  return { formula: m[1]!.trim(), ...(m[2] ?? m[3] ? { picture: m[2] ?? m[3] } : {}) };
}

/** Texto do resultado do campo (o que fica em cache no documento). */
export function formulaResultText(instr: string, env: FormulaEnv): string {
  const p = parseFormulaInstr(instr);
  if (!p) return FORMULA_ERRORS.syntax;
  const r = evaluateFormula(p.formula, env);
  if ('error' in r) return r.error;
  return p.picture ? formatPicture(r.value, p.picture) : formatFormulaResult(r.value, r.fmt);
}
