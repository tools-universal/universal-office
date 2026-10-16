import { formatGeneral, formatValue } from '@universal-office/sheet-core';

/**
 * Avaliador de fórmulas MÍNIMO para a formatação condicional (cellIs,
 * expression, containsText…): números, textos, booleanos, erros, referências
 * relativas/absolutas (deslocadas a partir da 1ª célula do sqref, como o
 * Excel grava), intervalos (inclusive de outra aba), operadores e as funções
 * mais usadas em regras. Não é um motor de cálculo — usa os valores em cache
 * das células; o que não souber avaliar vira erro (a regra não casa).
 */

export class FErr { constructor(public code: string) {} }
export interface FRange { kind: 'range'; sheet?: string; c1: number; r1: number; c2: number; r2: number }
export type FScalar = number | string | boolean | null | FErr;
export type FVal = FScalar | FRange;

export interface FCtx {
  /** Valor em cache de (col,row) da aba `sheet` (undefined = a própria). */
  cell(sheet: string | undefined, col: number, row: number): FScalar;
  /** Células EXISTENTES do retângulo (para agregações sobre colunas inteiras). */
  each(sheet: string | undefined, c1: number, r1: number, c2: number, r2: number, fn: (v: FScalar, col: number, row: number) => void): void;
  /** Célula avaliada e deslocamento das referências relativas. */
  col: number; row: number; dc: number; dr: number;
  /** Hoje (serial do Excel). */
  today: number;
  date1904?: boolean;
}

type Node =
  | { t: 'n'; v: number } | { t: 's'; v: string } | { t: 'b'; v: boolean } | { t: 'e'; v: string }
  | { t: 'ref'; sheet?: string; c: number; r: number; ac: boolean; ar: boolean }
  | { t: 'rng'; sheet?: string; a: Node & { t: 'ref' }; b: Node & { t: 'ref' } }
  | { t: 'un'; op: string; x: Node } | { t: 'pct'; x: Node }
  | { t: 'bin'; op: string; a: Node; b: Node } | { t: 'fn'; name: string; args: Node[] };

const MAXR = 1048576, MAXC = 16384;
/** Referência relativa deslocada para fora da planilha dá a volta, como no Excel. */
const wrapC = (c: number): number => ((((c - 1) % MAXC) + MAXC) % MAXC) + 1;
const wrapR = (r: number): number => ((((r - 1) % MAXR) + MAXR) % MAXR) + 1;
const colNum = (s: string): number => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };

// ───────────────────────── tokenização + parser ─────────────────────────

interface Tok { k: string; v: string }
const REF_RE = /^(?:('(?:[^']|'')+'|[A-Za-z_\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*)!)?(\$?[A-Za-z]{1,3}\$?\d+|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}|\$?\d+:\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?/;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src.replace(/_xlfn\.|_xlws\./g, '');
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') { i++; continue; }
    if (ch === '"') {
      let j = i + 1, v = '';
      while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } break; } v += s[j++]; }
      out.push({ k: 's', v }); i = j + 1; continue;
    }
    if (ch === '#') {
      const m = /^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA)/i.exec(s.slice(i));
      if (m) { out.push({ k: 'e', v: m[0].toUpperCase() }); i += m[0].length; continue; }
    }
    const rest = s.slice(i);
    const num = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(rest);
    // referência antes de número (1:1 é linha inteira)
    const ref = REF_RE.exec(rest);
    if (ref && !/^\s*[A-Za-z_\d.(]/.test(rest.slice(ref[0].length)) && !(num && num[0].length >= ref[0].length && !ref[0].includes(':'))) {
      out.push({ k: 'r', v: ref[0] }); i += ref[0].length; continue;
    }
    if (num) { out.push({ k: 'n', v: num[0] }); i += num[0].length; continue; }
    const id = /^[A-Za-z_\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*/.exec(rest);
    if (id) { out.push({ k: 'i', v: id[0] }); i += id[0].length; continue; }
    const two = rest.slice(0, 2);
    if (two === '<>' || two === '<=' || two === '>=') { out.push({ k: 'o', v: two }); i += 2; continue; }
    if ('+-*/^&=<>%(),;:{}'.includes(ch)) { out.push({ k: 'o', v: ch === ';' ? ',' : ch }); i++; continue; }
    throw new Error('token');
  }
  return out;
}

function parseRef(text: string): Node {
  const bang = text.lastIndexOf('!');
  let sheet: string | undefined;
  let body = text;
  if (bang >= 0) { sheet = text.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'"); body = text.slice(bang + 1); }
  const one = (p: string, end: boolean): Node & { t: 'ref' } => {
    const m = /^(\$?)([A-Za-z]{1,3})?(\$?)(\d+)?$/.exec(p);
    if (!m) throw new Error('ref');
    const c = m[2] ? colNum(m[2]) : end ? MAXC : 1;
    const r = m[4] ? parseInt(m[4], 10) : end ? MAXR : 1;
    return { t: 'ref', sheet, c, r, ac: !!m[1] || !m[2], ar: !!m[3] || !m[4] || (!!m[1] && !m[2]) };
  };
  const parts = body.split(':');
  if (parts.length === 1) return one(parts[0]!, false);
  const isCol = /^\$?[A-Za-z]{1,3}$/.test(parts[0]!), isRow = /^\$?\d+$/.test(parts[0]!);
  const a = isRow ? { ...one('A' + parts[0]!.replace('$', ''), false), ar: parts[0]!.startsWith('$'), ac: true } : one(parts[0]!, false);
  const b = isRow ? { ...one('XFD' + parts[1]!.replace('$', ''), true), ar: parts[1]!.startsWith('$'), ac: true, c: MAXC } : one(parts[1]!, isCol);
  if (isCol) { a.r = 1; a.ar = true; b.r = MAXR; b.ar = true; }
  return { t: 'rng', sheet, a, b };
}

class Parser {
  i = 0;
  constructor(private toks: Tok[]) {}
  peek(): Tok | undefined { return this.toks[this.i]; }
  eat(v?: string): Tok { const t = this.toks[this.i++]; if (!t || (v !== undefined && t.v !== v)) throw new Error('parse'); return t; }
  parse(): Node { const n = this.cmp(); if (this.i < this.toks.length) throw new Error('trailing'); return n; }
  cmp(): Node {
    let a = this.cat();
    for (let t = this.peek(); t && t.k === 'o' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v); t = this.peek()) { this.i++; a = { t: 'bin', op: t.v, a, b: this.cat() }; }
    return a;
  }
  cat(): Node { let a = this.add(); while (this.peek()?.v === '&' && this.peek()?.k === 'o') { this.i++; a = { t: 'bin', op: '&', a, b: this.add() }; } return a; }
  add(): Node {
    let a = this.mul();
    for (let t = this.peek(); t && t.k === 'o' && (t.v === '+' || t.v === '-'); t = this.peek()) { this.i++; a = { t: 'bin', op: t.v, a, b: this.mul() }; }
    return a;
  }
  mul(): Node {
    let a = this.pow();
    for (let t = this.peek(); t && t.k === 'o' && (t.v === '*' || t.v === '/'); t = this.peek()) { this.i++; a = { t: 'bin', op: t.v, a, b: this.pow() }; }
    return a;
  }
  pow(): Node { let a = this.unary(); while (this.peek()?.v === '^' && this.peek()?.k === 'o') { this.i++; a = { t: 'bin', op: '^', a, b: this.unary() }; } return a; }
  unary(): Node {
    const t = this.peek();
    if (t && t.k === 'o' && (t.v === '-' || t.v === '+')) { this.i++; return { t: 'un', op: t.v, x: this.unary() }; }
    let x = this.prim();
    while (this.peek()?.v === '%' && this.peek()?.k === 'o') { this.i++; x = { t: 'pct', x }; }
    return x;
  }
  prim(): Node {
    const t = this.eat();
    if (t.k === 'n') return { t: 'n', v: parseFloat(t.v) };
    if (t.k === 's') return { t: 's', v: t.v };
    if (t.k === 'e') return { t: 'e', v: t.v };
    if (t.k === 'r') return parseRef(t.v);
    if (t.k === 'i') {
      const up = t.v.toUpperCase();
      if (this.peek()?.v === '(') {
        this.i++;
        const args: Node[] = [];
        if (this.peek()?.v !== ')') {
          for (;;) {
            if (this.peek()?.v === ',' ) { args.push({ t: 's', v: '' }); this.i++; continue; }
            args.push(this.cmp());
            if (this.peek()?.v === ',') { this.i++; continue; }
            break;
          }
        }
        this.eat(')');
        return { t: 'fn', name: up, args };
      }
      if (up === 'TRUE' || up === 'FALSE') return { t: 'b', v: up === 'TRUE' };
      return { t: 'e', v: '#NAME?' };
    }
    if (t.v === '(') { const n = this.cmp(); this.eat(')'); return n; }
    throw new Error('prim');
  }
}

const cache = new Map<string, Node | null>();
/** AST da fórmula (cacheado); null = não suportada. */
export function parseFormula(src: string): Node | null {
  let n = cache.get(src);
  if (n !== undefined) return n;
  try { n = new Parser(tokenize(src.startsWith('=') ? src.slice(1) : src)).parse(); } catch { n = null; }
  if (cache.size > 5000) cache.clear();
  cache.set(src, n);
  return n;
}

// ───────────────────────── avaliação ─────────────────────────

const VALUE = new FErr('#VALUE!'), DIV0 = new FErr('#DIV/0!'), NA = new FErr('#N/A'), NUM = new FErr('#NUM!');
const isErr = (v: unknown): v is FErr => v instanceof FErr;
const isRange = (v: FVal): v is FRange => typeof v === 'object' && v !== null && !(v instanceof FErr) && (v as FRange).kind === 'range';

export function toNum(v: FScalar): number | FErr {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null) return 0;
  if (isErr(v)) return v;
  const s = v.trim();
  if (s === '') return VALUE;
  const n = Number(s.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : VALUE;
}
export function toStr(v: FScalar): string | FErr {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return formatGeneral(v);
  if (typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
  if (v === null) return '';
  return v;
}
export function toBool(v: FScalar): boolean | FErr {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  if (isErr(v)) return v;
  const u = v.toUpperCase();
  if (u === 'TRUE' || u === 'VERDADEIRO') return true;
  if (u === 'FALSE' || u === 'FALSO') return false;
  return VALUE;
}

/** Comparação do Excel: número < texto < lógico; vazio vale 0/""/FALSO; texto sem caixa. */
export function compare(a: FScalar, b: FScalar): number | FErr {
  if (isErr(a)) return a;
  if (isErr(b)) return b;
  const rank = (v: FScalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : -1);
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === 'number' ? 0 : typeof b === 'string' ? '' : false;
  if (b === null) b = typeof a === 'number' ? 0 : typeof a === 'string' ? '' : false;
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'string') { const x = a.toLowerCase(), y = (b as string).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  if (typeof a === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
}

function rangeOf(n: Node & { t: 'rng' }, cx: FCtx): FRange {
  const fix = (r: Node & { t: 'ref' }): [number, number] => [wrapC(r.ac ? r.c : r.c + cx.dc), wrapR(r.ar ? r.r : r.r + cx.dr)];
  const [c1, r1] = fix(n.a), [c2, r2] = fix(n.b);
  return { kind: 'range', sheet: n.sheet, c1: Math.min(c1, c2), r1: Math.min(r1, r2), c2: Math.max(c1, c2), r2: Math.max(r1, r2) };
}

function scalar(v: FVal, cx: FCtx): FScalar {
  if (!isRange(v)) return v;
  // interseção implícita com a linha/coluna da célula avaliada (ou 1ª célula)
  if (v.c1 === v.c2) return cx.cell(v.sheet, v.c1, v.r1 <= cx.row && cx.row <= v.r2 ? cx.row : v.r1);
  if (v.r1 === v.r2) return cx.cell(v.sheet, v.c1 <= cx.col && cx.col <= v.c2 ? cx.col : v.c1, v.r1);
  return cx.cell(v.sheet, v.c1, v.r1);
}

/** Valores de um argumento (escalares e intervalos achatados; só células existentes). */
function flat(v: FVal, cx: FCtx, out: FScalar[]): void {
  if (isRange(v)) cx.each(v.sheet, v.c1, v.r1, v.c2, v.r2, (x) => out.push(x));
  else out.push(v);
}

export function evalNode(n: Node, cx: FCtx): FVal {
  switch (n.t) {
    case 'n': return n.v;
    case 's': return n.v;
    case 'b': return n.v;
    case 'e': return new FErr(n.v);
    case 'ref': return cx.cell(n.sheet, wrapC(n.ac ? n.c : n.c + cx.dc), wrapR(n.ar ? n.r : n.r + cx.dr));
    case 'rng': return rangeOf(n, cx);
    case 'un': { const x = toNum(scalar(evalNode(n.x, cx), cx)); return isErr(x) ? x : n.op === '-' ? -x : x; }
    case 'pct': { const x = toNum(scalar(evalNode(n.x, cx), cx)); return isErr(x) ? x : x / 100; }
    case 'bin': {
      const a = scalar(evalNode(n.a, cx), cx), b = scalar(evalNode(n.b, cx), cx);
      if (n.op === '&') { const x = toStr(a), y = toStr(b); return isErr(x) ? x : isErr(y) ? y : x + y; }
      if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
        const c = compare(a, b);
        if (isErr(c)) return c;
        return n.op === '=' ? c === 0 : n.op === '<>' ? c !== 0 : n.op === '<' ? c < 0 : n.op === '>' ? c > 0 : n.op === '<=' ? c <= 0 : c >= 0;
      }
      const x = toNum(a), y = toNum(b);
      if (isErr(x)) return x;
      if (isErr(y)) return y;
      switch (n.op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': return y === 0 ? DIV0 : x / y;
        case '^': { const r = Math.pow(x, y); return Number.isFinite(r) ? r : NUM; }
      }
      return VALUE;
    }
    case 'fn': return callFn(n.name, n.args, cx);
  }
}

/** Avalia `src` na célula de contexto; undefined = fórmula não suportada. */
export function evalFormula(src: string, cx: FCtx): FScalar | undefined {
  const n = parseFormula(src);
  if (!n) return undefined;
  try { return scalar(evalNode(n, cx), cx); } catch { return VALUE; }
}

/** Critério do CONT.SE (">5", "<>x", "a*", número…). */
function criterion(crit: FScalar): (v: FScalar) => boolean {
  if (typeof crit === 'number' || typeof crit === 'boolean') return (v) => compare(v, crit) === 0 && v !== null;
  if (crit === null || isErr(crit)) return (v) => v === null || v === '';
  const m = /^(<=|>=|<>|=|<|>)?(.*)$/s.exec(crit)!;
  const op = m[1] ?? '=';
  const rhsText = m[2]!;
  const n = rhsText.trim() !== '' && Number.isFinite(Number(rhsText)) ? Number(rhsText) : undefined;
  const wild = /[*?]/.test(rhsText) ? new RegExp('^' + rhsText.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?') + '$', 'is') : undefined;
  return (v) => {
    if (n !== undefined && (op === '=' || op === '<>') && rhsText !== '') {
      const eq = typeof v === 'number' ? v === n : typeof v === 'string' && v.trim() !== '' && Number(v) === n;
      return op === '=' ? eq : !eq;
    }
    if (op === '=' || op === '<>') {
      let eq: boolean;
      if (rhsText === '') eq = v === null || v === '';
      else if (wild) eq = typeof v === 'string' && wild.test(v);
      else eq = typeof v === 'string' && v.toLowerCase() === rhsText.toLowerCase();
      return op === '=' ? eq : !eq;
    }
    if (n !== undefined) { if (typeof v !== 'number') return false; const c = v - n; return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0; }
    if (typeof v !== 'string') return false;
    const c = compare(v, rhsText) as number;
    return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
  };
}

const serialOf = (y: number, m: number, d: number, date1904?: boolean): number => {
  const t = Date.UTC(y, m - 1, d);
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return Math.round((t - base) / 86400000);
};
const dateOf = (serial: number, date1904?: boolean): Date => {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(base + Math.floor(serial) * 86400000);
};
export { serialOf, dateOf };

function callFn(name: string, args: Node[], cx: FCtx): FVal {
  const ev = (i: number): FScalar => (args[i] ? scalar(evalNode(args[i]!, cx), cx) : null);
  const num = (i: number): number | FErr => toNum(ev(i));
  const str = (i: number): string | FErr => toStr(ev(i));
  const all = (): FScalar[] => { const out: FScalar[] = []; for (const a of args) flat(evalNode(a, cx), cx, out); return out; };
  const nums = (): number[] | FErr => {
    const out: number[] = [];
    for (const a of args) {
      const v = evalNode(a, cx);
      if (isRange(v)) { let err: FErr | undefined; cx.each(v.sheet, v.c1, v.r1, v.c2, v.r2, (x) => { if (typeof x === 'number') out.push(x); else if (isErr(x)) err ??= x; }); if (err) return err; }
      else { const x = toNum(v); if (isErr(x)) return x; out.push(x); }
    }
    return out;
  };
  switch (name) {
    case 'AND': case 'OR': {
      let acc = name === 'AND', any = false;
      for (const v of all()) {
        if (v === null || typeof v === 'string') continue;
        const b = toBool(v); if (isErr(b)) return b;
        any = true; acc = name === 'AND' ? acc && b : acc || b;
      }
      return any ? acc : VALUE;
    }
    case 'NOT': { const b = toBool(ev(0)); return isErr(b) ? b : !b; }
    case 'XOR': { let x = false; for (const v of all()) { const b = toBool(v); if (isErr(b)) return b; x = x !== b; } return x; }
    case 'IF': { const c = toBool(ev(0)); if (isErr(c)) return c; return c ? (args[1] ? ev(1) : true) : (args[2] ? ev(2) : false); }
    case 'IFERROR': { const v = ev(0); return isErr(v) ? ev(1) : v; }
    case 'IFNA': { const v = ev(0); return isErr(v) && v.code === '#N/A' ? ev(1) : v; }
    case 'ISBLANK': return ev(0) === null;
    case 'ISNUMBER': return typeof ev(0) === 'number';
    case 'ISTEXT': return typeof ev(0) === 'string';
    case 'ISNONTEXT': return typeof ev(0) !== 'string';
    case 'ISLOGICAL': return typeof ev(0) === 'boolean';
    case 'ISERROR': return isErr(ev(0));
    case 'ISERR': { const v = ev(0); return isErr(v) && v.code !== '#N/A'; }
    case 'ISNA': { const v = ev(0); return isErr(v) && v.code === '#N/A'; }
    case 'ISEVEN': case 'ISODD': { const x = num(0); if (isErr(x)) return x; const odd = Math.abs(Math.trunc(x)) % 2 === 1; return name === 'ISODD' ? odd : !odd; }
    case 'NA': return NA;
    case 'TRUE': return true;
    case 'FALSE': return false;
    case 'ROW': { if (!args[0]) return cx.row; const v = evalNode(args[0], cx); return isRange(v) ? v.r1 : VALUE; }
    case 'COLUMN': { if (!args[0]) return cx.col; const v = evalNode(args[0], cx); return isRange(v) ? v.c1 : VALUE; }
    case 'ROWS': case 'COLUMNS': { const v = args[0] ? evalNode(args[0], cx) : null; if (v === null || !isRange(v)) return 1; return name === 'ROWS' ? v.r2 - v.r1 + 1 : v.c2 - v.c1 + 1; }
    case 'MOD': { const a = num(0), b = num(1); if (isErr(a)) return a; if (isErr(b)) return b; if (b === 0) return DIV0; return a - b * Math.floor(a / b); }
    case 'ABS': { const a = num(0); return isErr(a) ? a : Math.abs(a); }
    case 'INT': { const a = num(0); return isErr(a) ? a : Math.floor(a); }
    case 'TRUNC': { const a = num(0); return isErr(a) ? a : Math.trunc(a); }
    case 'SIGN': { const a = num(0); return isErr(a) ? a : Math.sign(a); }
    case 'SQRT': { const a = num(0); return isErr(a) ? a : a < 0 ? NUM : Math.sqrt(a); }
    case 'POWER': { const a = num(0), b = num(1); return isErr(a) ? a : isErr(b) ? b : Math.pow(a, b); }
    case 'ROUND': case 'ROUNDUP': case 'ROUNDDOWN': {
      const a = num(0), d = args[1] ? num(1) : 0; if (isErr(a)) return a; if (isErr(d)) return d;
      const f = Math.pow(10, Math.trunc(d)), x = a * f;
      const r = name === 'ROUND' ? Math.sign(x) * Math.round(Math.abs(x) + 1e-9) : name === 'ROUNDUP' ? Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9) : Math.trunc(x);
      return r / f;
    }
    case 'LEN': { const s = str(0); return isErr(s) ? s : s.length; }
    case 'LEFT': case 'RIGHT': { const s = str(0), k = args[1] ? num(1) : 1; if (isErr(s)) return s; if (isErr(k)) return k; return name === 'LEFT' ? s.slice(0, Math.max(0, k)) : k <= 0 ? '' : s.slice(-k); }
    case 'MID': { const s = str(0), a = num(1), k = num(2); if (isErr(s)) return s; if (isErr(a)) return a; if (isErr(k)) return k; return a < 1 ? VALUE : s.substr(a - 1, Math.max(0, k)); }
    case 'UPPER': { const s = str(0); return isErr(s) ? s : s.toUpperCase(); }
    case 'LOWER': { const s = str(0); return isErr(s) ? s : s.toLowerCase(); }
    case 'TRIM': { const s = str(0); return isErr(s) ? s : s.replace(/ +/g, ' ').trim(); }
    case 'CLEAN': { const s = str(0); return isErr(s) ? s : s.replace(/[\x00-\x1f]/g, ''); }
    case 'EXACT': { const a = str(0), b = str(1); return isErr(a) ? a : isErr(b) ? b : a === b; }
    case 'SEARCH': case 'FIND': {
      const needle = str(0), hay = str(1), start = args[2] ? num(2) : 1;
      if (isErr(needle)) return needle; if (isErr(hay)) return hay; if (isErr(start)) return start;
      let idx: number;
      if (name === 'SEARCH') {
        const re = new RegExp(needle.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?'), 'is');
        const m = re.exec(hay.slice(start - 1));
        idx = m ? m.index + start - 1 : -1;
      } else idx = hay.indexOf(needle, start - 1);
      return idx < 0 ? VALUE : idx + 1;
    }
    case 'SUBSTITUTE': { const s = str(0), a = str(1), b = str(2); if (isErr(s)) return s; if (isErr(a)) return a; if (isErr(b)) return b; return a === '' ? s : s.split(a).join(b); }
    case 'CONCATENATE': case 'CONCAT': { let s = ''; for (const v of all()) { const x = toStr(v); if (isErr(x)) return x; s += x; } return s; }
    case 'VALUE': { const v = ev(0); return typeof v === 'number' ? v : toNum(v); }
    case 'N': { const v = ev(0); return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : isErr(v) ? v : 0; }
    case 'T': { const v = ev(0); return typeof v === 'string' ? v : isErr(v) ? v : ''; }
    case 'TEXT': { const v = ev(0), f = str(1); if (isErr(f)) return f; const x = toNum(v); if (isErr(x)) return typeof v === 'string' ? v : x; return formatValue(x, f, { date1904: cx.date1904 }).text; }
    case 'TODAY': return cx.today;
    case 'NOW': { const d = new Date(); return cx.today + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; }
    case 'DATE': { const y = num(0), m = num(1), d = num(2); if (isErr(y)) return y; if (isErr(m)) return m; if (isErr(d)) return d; return serialOf(y < 1900 ? y + 1900 : y, m, d, cx.date1904); }
    case 'YEAR': case 'MONTH': case 'DAY': case 'WEEKDAY': {
      const x = num(0); if (isErr(x)) return x;
      const dt = dateOf(x, cx.date1904);
      if (name === 'YEAR') return dt.getUTCFullYear();
      if (name === 'MONTH') return dt.getUTCMonth() + 1;
      if (name === 'DAY') return dt.getUTCDate();
      const t = args[1] ? num(1) : 1; if (isErr(t)) return t;
      const wd = dt.getUTCDay();
      return t === 2 ? ((wd + 6) % 7) + 1 : t === 3 ? (wd + 6) % 7 : wd + 1;
    }
    case 'EOMONTH': case 'EDATE': {
      const x = num(0), k = num(1); if (isErr(x)) return x; if (isErr(k)) return k;
      const dt = dateOf(x, cx.date1904);
      const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + Math.trunc(k);
      if (name === 'EOMONTH') return serialOf(y, m + 2, 0, cx.date1904);
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return serialOf(y, m + 1, Math.min(dt.getUTCDate(), last), cx.date1904);
    }
    case 'SUM': { const v = nums(); return isErr(v) ? v : v.reduce((s, x) => s + x, 0); }
    case 'AVERAGE': { const v = nums(); return isErr(v) ? v : v.length ? v.reduce((s, x) => s + x, 0) / v.length : DIV0; }
    case 'MAX': { const v = nums(); return isErr(v) ? v : v.length ? Math.max(...v) : 0; }
    case 'MIN': { const v = nums(); return isErr(v) ? v : v.length ? Math.min(...v) : 0; }
    case 'MEDIAN': { const v = nums(); if (isErr(v)) return v; if (!v.length) return NUM; v.sort((a, b) => a - b); const h = v.length >> 1; return v.length % 2 ? v[h]! : (v[h - 1]! + v[h]!) / 2; }
    case 'LARGE': case 'SMALL': {
      const v: number[] = []; const a = args[0] ? evalNode(args[0], cx) : null;
      if (a !== null) flat(a, cx, v as unknown as FScalar[]);
      const ns = v.filter((x) => typeof x === 'number').sort((p, q) => (name === 'LARGE' ? q - p : p - q));
      const k = num(1); if (isErr(k)) return k;
      return k >= 1 && k <= ns.length ? ns[Math.ceil(k) - 1]! : NUM;
    }
    case 'COUNT': return all().filter((x) => typeof x === 'number').length;
    case 'COUNTA': return all().filter((x) => x !== null).length;
    case 'COUNTBLANK': {
      const v = args[0] ? evalNode(args[0], cx) : null;
      if (v === null || !isRange(v)) return 0;
      let filled = 0;
      cx.each(v.sheet, v.c1, v.r1, v.c2, v.r2, (x) => { if (x !== null && x !== '') filled++; });
      return (v.c2 - v.c1 + 1) * (v.r2 - v.r1 + 1) - filled;
    }
    case 'COUNTIF': case 'COUNTIFS': case 'SUMIF': {
      const pairs: [FVal, (v: FScalar) => boolean][] = [];
      const step = name === 'COUNTIFS' ? 2 : 2;
      for (let i = 0; i + 1 < args.length && (name !== 'SUMIF' || i === 0); i += step) pairs.push([evalNode(args[i]!, cx), criterion(ev(i + 1))]);
      const [r0, f0] = pairs[0] ?? [null, () => false];
      if (r0 === null) return 0;
      if (!isRange(r0)) return f0(r0) ? (name === 'SUMIF' ? toNum(ev(2)) : 1) : 0;
      let n = 0, s = 0;
      const sumR = name === 'SUMIF' && args[2] ? evalNode(args[2], cx) : r0;
      cx.each(r0.sheet, r0.c1, r0.r1, r0.c2, r0.r2, (v, c, r) => {
        if (!f0(v)) return;
        for (let k = 1; k < pairs.length; k++) {
          const rk = pairs[k]![0];
          if (!isRange(rk)) return;
          if (!pairs[k]![1](cx.cell(rk.sheet, rk.c1 + (c - r0.c1), rk.r1 + (r - r0.r1)))) return;
        }
        n++;
        if (name === 'SUMIF' && isRange(sumR)) { const x = cx.cell(sumR.sheet, sumR.c1 + (c - r0.c1), sumR.r1 + (r - r0.r1)); if (typeof x === 'number') s += x; }
      });
      return name === 'SUMIF' ? s : n;
    }
    case 'MATCH': {
      const key = ev(0); const rg = args[1] ? evalNode(args[1], cx) : null;
      if (rg === null || !isRange(rg)) return NA;
      let pos = -1;
      const horiz = rg.r1 === rg.r2;
      cx.each(rg.sheet, rg.c1, rg.r1, rg.c2, rg.r2, (v, c, r) => { if (pos < 0 && compare(v, key) === 0) pos = horiz ? c - rg.c1 + 1 : r - rg.r1 + 1; });
      return pos < 0 ? NA : pos;
    }
    case 'VLOOKUP': case 'HLOOKUP': {
      const key = ev(0); const rg = args[1] ? evalNode(args[1], cx) : null; const k = num(2);
      if (rg === null || !isRange(rg) || isErr(k)) return NA;
      let hit: FScalar = NA;
      let found = false;
      if (name === 'VLOOKUP') cx.each(rg.sheet, rg.c1, rg.r1, rg.c1, rg.r2, (v, _c, r) => { if (!found && compare(v, key) === 0) { found = true; hit = cx.cell(rg.sheet, rg.c1 + k - 1, r); } });
      else cx.each(rg.sheet, rg.c1, rg.r1, rg.c2, rg.r1, (v, c) => { if (!found && compare(v, key) === 0) { found = true; hit = cx.cell(rg.sheet, c, rg.r1 + k - 1); } });
      return hit;
    }
    case 'INDIRECT': case 'OFFSET': case 'CELL': case 'INFO': case 'GETPIVOTDATA':
      return new FErr('#NAME?');
  }
  return new FErr('#NAME?');
}
