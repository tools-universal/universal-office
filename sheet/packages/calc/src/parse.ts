/**
 * Lexer + parser da fórmula CANÔNICA (como gravada no OOXML: nomes em inglês,
 * "," separador de argumentos, "." decimal, `;` separa linhas de constante de
 * matriz) em A1 ou R1C1. A forma "de tela" também é aceita: `@x` (vira
 * SINGLE), `A1#` (vira ANCHORARRAY), `[@Col]`, nomes sem `_xlfn.`.
 *
 * Precedência do Excel (da mais forte para a mais fraca): `:` → espaço
 * (interseção) → `,` (união, só entre parênteses) → negação → `%` → `^` →
 * `* /` → `+ -` → `&` → comparações. Por isso =-2^2 = 4 e `^` associa à
 * esquerda (=2^3^2 = 64).
 * Dono: agente CORE.
 */
import { colFromLetters } from './a1.js';
import type { BinOp, Node, RefPart, SheetSpec, TableItem } from './ast.js';
import { CalcError, MAX_COL, MAX_ROW, type ErrorCode, type Scalar } from './values.js';

export class FormulaSyntaxError extends Error {
  constructor(msg: string, readonly pos: number) { super(msg); }
}

export interface ParseOptions {
  /** Referências em R1C1 (INDIRECT(…;FALSO), UI em modo R1C1). */
  readonly r1c1?: boolean;
  /** Letras do R1C1 (padrão R e C; Excel pt-BR usa L e C no INDIRECT). */
  readonly r1c1Letters?: { readonly row: string; readonly col: string };
  /** Célula da fórmula (0-based): referências A1 relativas viram deslocamentos a partir dela. */
  readonly row?: number;
  readonly col?: number;
}

type Tok =
  | { k: 'num'; v: number; raw: string; p: number }
  | { k: 'str'; v: string; p: number }
  | { k: 'err'; v: ErrorCode; p: number }
  | { k: 'ident'; v: string; p: number }
  | { k: 'func'; v: string; p: number }
  | { k: 'ref'; node: Node; p: number }
  | { k: 'sheet'; spec: SheetSpec; p: number }
  | { k: 'table'; node: Node; p: number }
  | { k: 'op'; v: string; p: number }
  | { k: 'ws'; p: number }
  | { k: 'eof'; p: number };

const ERROR_CODES: readonly ErrorCode[] = [
  '#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA', '#SPILL!',
  '#CALC!', '#FIELD!', '#BLOCKED!', '#CONNECT!', '#UNKNOWN!', '#BUSY!', '#PYTHON!',
];

// nomes aceitam também símbolos não ASCII (medido: nomes "“" e "”" valem no Excel)
const IDENT_START = /[\p{L}_\\]|[^\x00-\x7f\s\u00a0\u3000]/u;
const IDENT_RE = /(?:[\p{L}_\\]|[^\x00-\x7f\s\u00a0\u3000])(?:[\p{L}\p{N}_.\\?]|[^\x00-\x7f\s\u00a0\u3000])*/uy;
const IDENT_CHAR = /[\p{L}\p{N}_.\\?]|[^\x00-\x7f\s\u00a0\u3000]/u;
/** Caracteres de nome de aba sem aspas. */
const SHEET_RE = /(\[(\d+)\])?(?:([^\s'"!:;,(){}[\]+\-*/^&=<>%@#]+)(?::([^\s'"!:;,(){}[\]+\-*/^&=<>%@#]+))?)?!/uy;
const NUM_RE = /(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
const ROWS_RE = /(\$?)(\d{1,7}):(\$?)(\d{1,7})(?![\p{L}\p{N}_.\\?(])/uy;
const COLS_RE = /(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![\p{L}\p{N}_\\?(!]|\.(?!:))/uy;
const CELL_RE = /(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![\p{L}\p{N}_\\?([!]|\.(?!:))/uy;
/** Expressões do R1C1 para um par de letras (R/C, L/C…). */
function r1c1Res(row: string, col: string): { cell: RegExp; rows: RegExp; cols: RegExp } {
  const R = `[${row.toUpperCase()}${row.toLowerCase()}]`, C = `[${col.toUpperCase()}${col.toLowerCase()}]`;
  const N = '(\\[-?\\d+\\]|\\d+)?', END = '(?![\\p{L}\\p{N}_.\\\\?([!])';
  return {
    cell: new RegExp(`(${R})${N}(${C})${N}${END}`, 'uy'),
    rows: new RegExp(`(${R})${N}(?:(:)(${R})${N})?${END}`, 'uy'),
    cols: new RegExp(`(${C})${N}(?:(:)(${C})${N})?${END}`, 'uy'),
  };
}
const R1C1_STD = r1c1Res('R', 'C');

/**
 * Valor de um literal numérico como o Excel o lê: TRUNCADO a 15 algarismos
 * significativos (=1,99999999999999999 → 1,99999999999999; medido pelo FN-STAT
 * e no oráculo: 0,1234567890123456 → 0,123456789012345); subnormal (1E-310) ou
 * estouro são recusados (o Excel não aceita a fórmula). undefined = recusado.
 */
export function numberLiteralValue(raw: string): { v: number; truncated: boolean } | undefined {
  const m = /^(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m) return undefined;
  let digits = m[1]! + m[2]!;
  let point = m[1]!.length + (m[3] ? parseInt(m[3], 10) : 0);
  const lead = /^0*/.exec(digits)![0].length;
  digits = digits.slice(lead); point -= lead;
  digits = digits.replace(/0+$/, '');
  let v: number, truncated = false;
  if (!digits) v = 0;
  else if (digits.length > 15) { v = Number(`0.${digits.slice(0, 15)}e${point}`); truncated = true; }
  else v = Number(raw);
  if (!Number.isFinite(v) || (v !== 0 && v < 2.2250738585072014e-308)) return undefined;
  return { v, truncated };
}

function sticky(re: RegExp, s: string, at: number): RegExpExecArray | null {
  re.lastIndex = at;
  return re.exec(s);
}

/** Separa "[1]Plan1:Plan3" (conteúdo do prefixo de aba) em SheetSpec. */
function sheetSpecOf(content: string): SheetSpec {
  let ext: number | undefined;
  const m = /^\[(\d+)\]/.exec(content);
  if (m) { ext = +m[1]!; content = content.slice(m[0].length); }
  const colon = content.indexOf(':');
  const spec: { sheet: string; sheet2?: string; ext?: number } = { sheet: colon < 0 ? content : content.slice(0, colon) };
  if (colon >= 0) spec.sheet2 = content.slice(colon + 1);
  if (ext !== undefined) spec.ext = ext;
  return spec;
}

class Lexer {
  readonly toks: Tok[] = [];
  constructor(private readonly s: string, private readonly o: ParseOptions) {
    let i = 0;
    while (i < s.length) i = this.next(i);
    this.toks.push({ k: 'eof', p: s.length });
  }

  private fail(msg: string, p: number): never { throw new FormulaSyntaxError(msg, p); }

  private next(i: number): number {
    const s = this.s, ch = s[i]!;
    // espaço/quebra de linha: preservado como token (interseção)
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === ' ') {
      let j = i + 1;
      while (j < s.length && ' \n\r\t '.includes(s[j]!)) j++;
      this.toks.push({ k: 'ws', p: i });
      return j;
    }
    if (ch === '"') {
      let j = i + 1, v = '';
      for (;;) {
        if (j >= s.length) this.fail('texto sem fim', i);
        if (s[j] === '"') {
          if (s[j + 1] === '"') { v += '"'; j += 2; continue; }
          j++; break;
        }
        v += s[j++];
      }
      this.toks.push({ k: 'str', v, p: i });
      return j;
    }
    if (ch === "'") {
      let j = i + 1, v = '';
      for (;;) {
        if (j >= s.length) this.fail('aba entre aspas sem fim', i);
        if (s[j] === "'") {
          if (s[j + 1] === "'") { v += "'"; j += 2; continue; }
          j++; break;
        }
        v += s[j++];
      }
      if (s[j] !== '!') this.fail('aba entre aspas sem "!"', j);
      this.toks.push({ k: 'sheet', spec: sheetSpecOf(v), p: i });
      return j + 1;
    }
    if (ch === '#') {
      const up = s.slice(i, i + 14).toUpperCase();
      const code = ERROR_CODES.find((c) => up.startsWith(c));
      if (code) { this.toks.push({ k: 'err', v: code, p: i }); return i + code.length; }
      this.toks.push({ k: 'op', v: '#', p: i });
      return i + 1;
    }
    if (ch === '[') {
      // [1]Plan1!A1 / [1]!Nome (externa) ou referência estruturada sem tabela ([@Col])
      const m = sticky(SHEET_RE, s, i);
      if (m && m[1]) { this.toks.push({ k: 'sheet', spec: sheetSpecOf(m[0].slice(0, -1)), p: i }); return i + m[0].length; }
      return this.table('', i);
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(s[i + 1] ?? '')) || (ch === '$' && /\d/.test(s[i + 1] ?? ''))) {
      if (!this.o.r1c1) {
        const rr = sticky(ROWS_RE, s, i);
        if (rr) {
          const r1 = +rr[2]! - 1, r2 = +rr[4]! - 1;
          if (r1 <= MAX_ROW && r2 <= MAX_ROW && r1 >= 0 && r2 >= 0) {
            this.toks.push({ k: 'ref', node: { t: 'area', r1: this.rowPart(r1, !!rr[1]), r2: this.rowPart(r2, !!rr[3]) }, p: i });
            return i + rr[0].length;
          }
        }
      }
      if (ch === '$') this.fail('referência inválida', i);
      const m = sticky(NUM_RE, s, i)!;
      const lit = numberLiteralValue(m[0]);
      if (lit === undefined) this.fail('número fora do intervalo do Excel', i);
      this.toks.push(lit.truncated ? { k: 'num', v: lit.v, raw: '', p: i } : { k: 'num', v: lit.v, raw: m[0], p: i });
      return i + m[0].length;
    }
    if (ch === '$' || IDENT_START.test(ch)) {
      // prefixo de aba (Plan1! / Plan1:Plan3!)
      if (ch !== '$') {
        const m = sticky(SHEET_RE, s, i);
        if (m && m[3]) { this.toks.push({ k: 'sheet', spec: sheetSpecOf(m[0].slice(0, -1)), p: i }); return i + m[0].length; }
      }
      const ref = this.o.r1c1 ? this.r1c1Ref(i) : this.a1Ref(i);
      if (ref) { this.toks.push({ k: 'ref', node: ref.node, p: i }); return ref.end; }
      if (ch === '$') this.fail('referência inválida', i);
      const m = sticky(IDENT_RE, s, i)!;
      const name = m[0];
      const j = i + name.length;
      if (s[j] === '(') { this.toks.push({ k: 'func', v: name, p: i }); return j + 1; }
      if (s[j] === '[') return this.table(name, j);
      this.toks.push({ k: 'ident', v: name, p: i });
      return j;
    }
    const two = s.slice(i, i + 2);
    if (two === '<>' || two === '<=' || two === '>=') { this.toks.push({ k: 'op', v: two, p: i }); return i + 2; }
    // operadores de corte (TRIMRANGE): A1:.A10, A1.:A10, A1.:.A10
    if (s.startsWith('.:.', i)) { this.toks.push({ k: 'op', v: '.:.', p: i }); return i + 3; }
    if (two === '.:' || two === ':.') { this.toks.push({ k: 'op', v: two, p: i }); return i + 2; }
    if ('+-*/^&=<>%:,;(){}@!'.includes(ch)) { this.toks.push({ k: 'op', v: ch, p: i }); return i + 1; }
    this.fail(`caractere inesperado "${ch}"`, i);
  }

  private rowPart(r: number, abs: boolean): RefPart { return abs ? { n: r, abs } : { n: r - (this.o.row ?? 0), abs }; }
  private colPart(c: number, abs: boolean): RefPart { return abs ? { n: c, abs } : { n: c - (this.o.col ?? 0), abs }; }

  private a1Ref(i: number): { node: Node; end: number } | undefined {
    const s = this.s;
    const cc = sticky(COLS_RE, s, i);
    if (cc) {
      const c1 = colFromLetters(cc[2]!), c2 = colFromLetters(cc[4]!);
      if (c1 !== undefined && c2 !== undefined) {
        return { node: { t: 'area', c1: this.colPart(c1, !!cc[1]), c2: this.colPart(c2, !!cc[3]) }, end: i + cc[0].length };
      }
    }
    const m = sticky(CELL_RE, s, i);
    if (m) {
      const col = colFromLetters(m[2]!), row = +m[4]! - 1;
      if (col !== undefined && row >= 0 && row <= MAX_ROW) {
        return { node: { t: 'cell', row: this.rowPart(row, !!m[3]), col: this.colPart(col, !!m[1]) }, end: i + m[0].length };
      }
    }
    return undefined;
  }

  private r1c1Part(x: string | undefined, max: number): RefPart | undefined {
    if (x === undefined) return { n: 0, abs: false };
    if (x.startsWith('[')) return { n: +x.slice(1, -1), abs: false };
    const n = +x - 1;
    return n >= 0 && n <= max ? { n, abs: true } : undefined;
  }

  private r1c1Ref(i: number): { node: Node; end: number } | undefined {
    const s = this.s;
    const L = this.o.r1c1Letters;
    const res = L && (L.row.toUpperCase() !== 'R' || L.col.toUpperCase() !== 'C') ? r1c1Res(L.row, L.col) : R1C1_STD;
    const m = sticky(res.cell, s, i);
    if (m) {
      const row = this.r1c1Part(m[2], MAX_ROW), col = this.r1c1Part(m[4], MAX_COL);
      if (row && col) return { node: { t: 'cell', row, col }, end: i + m[0].length };
    }
    const r = sticky(res.rows, s, i);
    if (r) {
      const r1 = this.r1c1Part(r[2], MAX_ROW), r2 = r[3] ? this.r1c1Part(r[5], MAX_ROW) : r1;
      if (r1 && r2) return { node: { t: 'area', r1, r2 }, end: i + r[0].length };
    }
    const c = sticky(res.cols, s, i);
    if (c) {
      const c1 = this.r1c1Part(c[2], MAX_COL), c2 = c[3] ? this.r1c1Part(c[5], MAX_COL) : c1;
      if (c1 && c2) return { node: { t: 'area', c1, c2 }, end: i + c[0].length };
    }
    return undefined;
  }

  /** Referência estruturada a partir do "[" em `i`. */
  private table(name: string, i: number): number {
    const s = this.s;
    let j = i, depth = 0;
    for (; j < s.length; j++) {
      const ch = s[j];
      if (ch === "'") { j++; continue; }
      if (ch === '[') depth++;
      else if (ch === ']' && --depth === 0) break;
    }
    if (depth !== 0 || j >= s.length) this.fail('referência estruturada sem "]"', i);
    const inner = s.slice(i + 1, j);
    this.toks.push({ k: 'table', node: parseTableSpec(name, inner, i), p: i });
    return j + 1;
  }
}

const ITEMS: Record<string, TableItem> = { '#ALL': '#All', '#DATA': '#Data', '#HEADERS': '#Headers', '#TOTALS': '#Totals', '#THIS ROW': '#This Row' };

/** Nome de coluna com escapes `'` removidos e espaços das pontas aparados. */
function unescapeCol(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'" && i + 1 < s.length) { out += s[++i]; continue; }
    out += s[i];
  }
  return out;
}

function parseTableSpec(table: string, inner: string, pos: number): Node {
  let ext: number | undefined;
  const items: TableItem[] = [];
  let col1: string | undefined, col2: string | undefined;
  const fail = (): never => { throw new FormulaSyntaxError(`referência estruturada inválida "[${inner}]"`, pos); };
  // divide "[a],[b]:[c]" em grupos de colchetes de 1º nível (com escapes ')
  const groups = (s: string): string[] | undefined => {
    const out: string[] = [];
    let i = 0;
    while (i < s.length) {
      while (s[i] === ' ' || s[i] === ',' || s[i] === ':') {
        if (s[i] === ':') out.push(':');
        i++;
      }
      if (i >= s.length) break;
      if (s[i] !== '[') return undefined;
      let j = i + 1, depth = 1;
      for (; j < s.length; j++) {
        if (s[j] === "'") { j++; continue; }
        if (s[j] === '[') depth++;
        else if (s[j] === ']' && --depth === 0) break;
      }
      if (depth) return undefined;
      out.push(s.slice(i + 1, j));
      i = j + 1;
    }
    return out;
  };
  const addCols = (parts: string[]): void => {
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k]!;
      if (p === ':') continue;
      const kw = ITEMS[p.trim().toUpperCase()];
      if (kw) { items.push(kw); continue; }
      const name = unescapeCol(p);
      if (col1 === undefined) col1 = name;
      else if (parts[k - 1] === ':' && col2 === undefined) col2 = name;
      else fail();
    }
  };
  const t = inner.trim();
  if (t === '') { /* Tabela[] = dados */ }
  else if (t.startsWith('@')) {
    items.push('#This Row');
    const rest = t.slice(1).trim();
    if (rest.startsWith('[')) { const g = groups(rest); if (!g) fail(); addCols(g!); }
    else if (rest) col1 = unescapeCol(rest);
  } else if (t.startsWith('[')) {
    const g = groups(t);
    if (!g) fail();
    addCols(g!);
  } else {
    const kw = ITEMS[t.toUpperCase()];
    if (kw) items.push(kw);
    else col1 = unescapeCol(inner);
  }
  const node: { t: 'table'; table: string; items: TableItem[]; col1?: string; col2?: string; ext?: number } = { t: 'table', table, items };
  if (col1 !== undefined) node.col1 = col1;
  if (col2 !== undefined) node.col2 = col2;
  if (ext !== undefined) node.ext = ext;
  return node;
}

/** Ordem: maior = mais forte. */
const BIN_PREC: Record<string, number> = {
  '=': 1, '<>': 1, '<': 1, '<=': 1, '>': 1, '>=': 1,
  '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5, '%': 6,
  ',': 8, ' ': 9, ':': 10, ':.': 10, '.:': 10, '.:.': 10,
};
const PREC_UNARY = 7;
const PREC_SINGLE = 8;

class Parser {
  private i = 0;
  constructor(private readonly toks: Tok[], private readonly src: string, private readonly hostCol = 0) {}

  private peek(): Tok { return this.toks[this.i]!; }
  private take(): Tok { return this.toks[this.i++]!; }
  private skipWs(): void { while (this.peek().k === 'ws') this.i++; }
  private fail(msg: string, t: Tok = this.peek()): never { throw new FormulaSyntaxError(`${msg} em "${this.src}"`, t.p); }
  private isOp(t: Tok, v: string): boolean { return t.k === 'op' && t.v === v; }

  parseAll(): Node {
    this.skipWs();
    // "=" inicial opcional
    if (this.isOp(this.peek(), '=')) { this.i++; this.skipWs(); }
    const e = this.expr(0, false);
    this.skipWs();
    if (this.peek().k !== 'eof') this.fail('sobra na fórmula');
    return e;
  }

  /** Operador binário/pós-fixo à frente (trata espaço = interseção). */
  private peekOp(inParens: boolean): { op: string; next: number } | undefined {
    let j = this.i, ws = false;
    while (this.toks[j]!.k === 'ws') { j++; ws = true; }
    const t = this.toks[j]!;
    if (t.k === 'op') {
      if (t.v === ',' ) return inParens ? { op: ',', next: j + 1 } : undefined;
      if (t.v in BIN_PREC) return { op: t.v, next: j + 1 };
      if (ws && (t.v === '(' || t.v === '@')) return { op: ' ', next: j };
      return undefined;
    }
    if (ws && (t.k === 'ref' || t.k === 'sheet' || t.k === 'ident' || t.k === 'func' || t.k === 'table')) return { op: ' ', next: j };
    return undefined;
  }

  private expr(minPrec: number, inParens: boolean): Node {
    let left = this.prefix(inParens);
    for (;;) {
      const o = this.peekOp(inParens);
      if (!o) break;
      const prec = BIN_PREC[o.op]!;
      if (prec < minPrec) break;
      this.i = o.next;
      if (o.op === '%') { left = { t: 'unary', op: '%', e: left }; continue; }
      if (o.op === ':.' || o.op === '.:' || o.op === '.:.') {
        const right = this.expr(prec + 1, inParens);
        const name = o.op === ':.' ? '_TRO_TRAILING' : o.op === '.:' ? '_TRO_LEADING' : '_TRO_ALL';
        left = { t: 'fn', name, prefix: '_xlfn.', args: [makeBin(':', left, right, this.hostCol)] };
        continue;
      }
      const right = this.expr(prec + 1, inParens);
      left = makeBin(o.op as BinOp, left, right, this.hostCol);
    }
    return left;
  }

  private prefix(inParens: boolean): Node {
    this.skipWs();
    const t = this.take();
    switch (t.k) {
      case 'num': return { t: 'num', v: t.v, raw: t.raw };
      case 'str': return { t: 'str', v: t.v };
      case 'err': return { t: 'err', v: t.v };
      case 'ref': return this.postfix(at(t.node, t.p));
      case 'table': return this.postfix(at(t.node, t.p));
      case 'sheet': {
        const n = this.take();
        if (n.k === 'ref') return this.postfix(at(withSheet(n.node, t.spec), t.p));
        if (n.k === 'err' && n.v === '#REF!') return { t: 'referr', sheet: t.spec };
        if (n.k === 'ident') return this.postfix(at({ t: 'name', name: n.v, sheet: t.spec }, t.p));
        if (n.k === 'func') return this.call({ t: 'fn', ...fnName(n.v), args: [] }, t.spec);
        if (n.k === 'num' && /^\d+$/.test(n.raw)) {
          // Plan1!1:3 sem lexer de linhas (já tratado) — número solto após aba é erro
          this.fail('referência inválida após a aba', n);
        }
        this.fail('referência inválida após a aba', n);
        break;
      }
      case 'ident': {
        const u = t.v.toUpperCase();
        if (u === 'TRUE' || u === 'FALSE') return { t: 'bool', v: u === 'TRUE' };
        if (/^_XLPM\./.test(u)) return { t: 'name', name: t.v.slice(6), param: true };
        // parâmetro opcional de LAMBDA ([b] na tela) e função usada como valor
        if (/^_XLOP\./.test(u)) return { t: 'name', name: t.v.slice(6), param: true, optional: true };
        if (/^_XLETA\./.test(u)) return { t: 'name', name: t.v.slice(7).toUpperCase(), eta: true };
        return this.postfix(at({ t: 'name', name: t.v }, t.p));
      }
      case 'func':
        // _xlpm.f(…): chamada de LAMBDA guardada em nome de LET/LAMBDA
        if (/^_xlpm\./i.test(t.v)) return this.postfix({ t: 'call', fn: { t: 'name', name: t.v.slice(6), param: true }, args: this.args() });
        return this.call(at({ t: 'fn', ...fnName(t.v), args: [] as Node[] }, t.p));
      case 'op':
        switch (t.v) {
          case '-': case '+': return { t: 'unary', op: t.v, e: this.expr(PREC_UNARY, inParens) };
          case '@': return { t: 'fn', name: 'SINGLE', prefix: '_xlfn.', args: [this.expr(PREC_SINGLE, inParens)] };
          case '(': {
            const e = this.expr(0, true);
            this.skipWs();
            if (!this.isOp(this.take(), ')')) this.fail('falta ")"');
            return this.postfix(at({ t: 'paren', e }, t.p));
          }
          case '{': return this.arrayConst();
          case '!': {
            // !A1 = a aba onde a fórmula (ou o nome) é avaliada
            const n = this.take();
            const spec: SheetSpec = { sheet: '' };
            if (n.k === 'ref') return this.postfix(at(withSheet(n.node, spec), t.p));
            if (n.k === 'ident') return this.postfix(at({ t: 'name', name: n.v, sheet: spec }, t.p));
            this.fail('referência inválida após "!"', n);
          }
        }
    }
    this.fail('operando esperado', t);
  }

  /** `#` (derramamento) e `(…)` (chamada de LAMBDA) após um operando. */
  private postfix(n: Node): Node {
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '#') && (n.t === 'cell' || n.t === 'name' || n.t === 'area' || n.t === 'fn' || n.t === 'paren')) {
        this.i++;
        n = { t: 'fn', name: 'ANCHORARRAY', prefix: '_xlfn.', args: [n] };
        continue;
      }
      if (this.isOp(t, '(') && (n.t === 'paren' || n.t === 'call' || n.t === 'fn')) {
        this.i++;
        n = { t: 'call', fn: n, args: this.args() };
        continue;
      }
      return n;
    }
  }

  private args(): Node[] {
    const args: Node[] = [];
    this.skipWs();
    if (this.isOp(this.peek(), ')')) { this.i++; return args; }
    for (;;) {
      this.skipWs();
      const t = this.peek();
      if (this.isOp(t, ',') || this.isOp(t, ')')) args.push({ t: 'missing' });
      else args.push(this.expr(0, false));
      this.skipWs();
      const sep = this.take();
      if (this.isOp(sep, ')')) return args;
      if (!this.isOp(sep, ',')) this.fail('esperado "," ou ")"', sep);
    }
  }

  private call(f: { t: 'fn'; name: string; prefix?: string; args: Node[] }, sheet?: SheetSpec): Node {
    f.args = this.args();
    if (sheet) {
      // Plan1!FUNC( só existe para nomes de LAMBDA com escopo de aba
      return this.postfix({ t: 'call', fn: { t: 'name', name: f.name, sheet }, args: f.args });
    }
    return this.postfix(f);
  }

  private arrayConst(): Node {
    const rows: Scalar[][] = [[]];
    for (;;) {
      this.skipWs();
      let t = this.take();
      let sign = 1;
      while (t.k === 'op' && (t.v === '-' || t.v === '+')) { if (t.v === '-') sign = -sign; this.skipWs(); t = this.take(); }
      let v: Scalar;
      if (t.k === 'num') v = sign * t.v;
      else if (sign !== 1) this.fail('constante de matriz inválida', t);
      else if (t.k === 'str') v = t.v;
      else if (t.k === 'err') v = CalcError.of(t.v);
      else if (t.k === 'ident' && /^(TRUE|FALSE)$/i.test(t.v)) v = t.v.toUpperCase() === 'TRUE';
      else this.fail('constante de matriz inválida', t);
      rows[rows.length - 1]!.push(v!);
      this.skipWs();
      const sep = this.take();
      if (this.isOp(sep, '}')) break;
      if (this.isOp(sep, ',')) continue;
      if (this.isOp(sep, ';')) { rows.push([]); continue; }
      this.fail('constante de matriz inválida', sep);
    }
    const w = rows[0]!.length;
    if (rows.some((r) => r.length !== w)) this.fail('linhas de tamanhos diferentes na constante de matriz');
    return { t: 'arr', rows };
  }
}

/** "_xlfn._xlws.SORT" → { name: "SORT", prefix: "_xlfn._xlws." }. */
function fnName(raw: string): { name: string; prefix?: string } {
  const m = /^((?:_xlfn\.|_xlws\.|_xludf\.|_xll\.)*)(.*)$/i.exec(raw)!;
  const name = m[2]!.toUpperCase();
  return m[1] ? { name, prefix: m[1] } : { name };
}

function withSheet(n: Node, sheet: SheetSpec): Node {
  if (n.t === 'cell' || n.t === 'area') return { ...n, sheet };
  return n;
}

/** Nó com a posição de início no texto. */
function at<T extends Node>(n: T, pos: number): T {
  return Object.assign(n, { pos }) as T;
}
const posOf = (n: Node): number | undefined => (n as { pos?: number }).pos;

function makeBin(op: BinOp, a: Node, b: Node, hostCol = 0): Node {
  const r = makeBin0(op, a, b, hostCol);
  const p = posOf(a);
  return p === undefined ? r : at(r, p);
}

function makeBin0(op: BinOp, a: Node, b: Node, hostCol = 0): Node {
  // A1:B2 (mesma aba) vira uma área só — é como o Excel grava e imprime
  if (op === ':' && a.t === 'cell' && b.t === 'cell' && (!b.sheet || sameSheet(a.sheet, b.sheet))) {
    return { t: 'area', ...(a.sheet ? { sheet: a.sheet } : {}), r1: a.row, c1: a.col, r2: b.row, c2: b.col };
  }
  // colunas que chegaram como nomes (A:.C — o lexer de colunas não vê o ".")
  if (op === ':' && a.t === 'name' && b.t === 'name' && !a.param && !b.param && !b.sheet) {
    const c1 = colFromLetters(a.name.replace(/\$/g, '')), c2 = colFromLetters(b.name.replace(/\$/g, ''));
    if (c1 !== undefined && c2 !== undefined && /^\$?[A-Za-z]{1,3}$/.test(a.name) && /^\$?[A-Za-z]{1,3}$/.test(b.name)) {
      const part = (nm: string, c: number): RefPart => (nm.startsWith('$') ? { n: c, abs: true } : { n: c - hostCol, abs: false });
      return { t: 'area', ...(a.sheet ? { sheet: a.sheet } : {}), c1: part(a.name, c1), c2: part(b.name, c2) };
    }
  }
  return { t: 'bin', op, a, b };
}

function sameSheet(a: SheetSpec | undefined, b: SheetSpec | undefined): boolean {
  if (!a || !b) return a === b;
  return a.sheet.toUpperCase() === b.sheet.toUpperCase() && (a.sheet2 ?? '').toUpperCase() === (b.sheet2 ?? '').toUpperCase() && (a.ext ?? 0) === (b.ext ?? 0);
}

/** Analisa a fórmula canônica (com ou sem "=" inicial). Lança FormulaSyntaxError. */
export function parseFormula(text: string, o: ParseOptions = {}): Node {
  const lx = new Lexer(text, o);
  return new Parser(lx.toks, text, o.col ?? 0).parseAll();
}

/** Como parseFormula, mas devolve undefined em vez de lançar. */
export function tryParseFormula(text: string, o: ParseOptions = {}): Node | undefined {
  try { return parseFormula(text, o); } catch (e) { if (e instanceof FormulaSyntaxError) return undefined; throw e; }
}
