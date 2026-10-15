/**
 * Pesquisa (VLOOKUP, HLOOKUP, LOOKUP, MATCH, XLOOKUP, XMATCH, ADDRESS, TRANSPOSE, HYPERLINK, GETPIVOTDATA, RTD).
 * Dono: agente FN-TEXT-DATE-LOOKUP. (INDEX, OFFSET, INDIRECT, CHOOSE, ROW(S), COLUMN(S)… são do CORE.)
 *
 * Algoritmos de busca medidos no Excel 365 pt-BR com ~16 mil buscas em vetores
 * aleatórios desordenados e de tipos misturados (lab calc/tdl/bs; 100% iguais):
 * - MATCH 1 / VLOOKUP e HLOOKUP aproximados / LOOKUP: busca BINÁRIA (meio =
 *   piso); se o meio não é do tipo do valor procurado (número/texto/booleano;
 *   vazio e erro nunca são), anda para a frente até o 1º do mesmo tipo dentro
 *   de [lo, hi] (nenhum → hi = meio−1); igual → devolve, avançando enquanto o
 *   seguinte for igual; menor → guarda e lo = k+1; maior → hi = k−1;
 * - MATCH −1: LINEAR — ignora outros tipos, para no 1º igual, ou no 1º menor
 *   (devolve o anterior);
 * - MATCH 0 / VLOOKUP FALSO: linear, 1º igual, curingas * ? ~ ("~" torna literal
 *   qualquer caractere; "~" no fim some); texto sem caixa, "ß" ≠ "ss"; número
 *   sem tolerância (0,1+0,2 ≠ 0,3); valor procurado vazio = 0;
 * - XLOOKUP/XMATCH comparam ENTRE tipos: número < texto < booleano < erro <
 *   vazio; linear (1/−1): exato no 1º (último) encontrado, senão o maior menor /
 *   menor maior (empate: o 1º encontrado); binária 2 = "mais à esquerda" nos
 *   iguais; −2 = descendente "mais à direita"; procurado vazio casa célula vazia;
 *   curinga (2) e regex (3) só com busca linear (binária → #VALUE!).
 * - XLOOKUP devolve REFERÊNCIA quando o retorno é referência (ISREF = VERDADEIRO);
 *   VLOOKUP/HLOOKUP/LOOKUP devolvem o valor (célula vazia: ISBLANK = VERDADEIRO).
 */
import { register, type FnContext, type ValueLocale } from '../fn.js';
import { implicitIntersection } from '../apply.js';
import { compareText } from '../collation.js';
import { sameTextCI, toBool, toNumber, toText } from '../coerce.js';
import { ArrayValue, CalcError, ERR, LambdaValue, MAX_COL, MAX_ROW, RefValue, type Area, type Scalar, type Value } from '../values.js';
import { asArray, txt } from './tdl-util.js';
import { compilePcre } from './regex.js';

// ───────────────────────────── vetores ─────────────────────────────

/**
 * Vetor de pesquisa (linha ou coluna) de matriz ou referência. Referências são
 * lidas só nas células existentes (colunas inteiras A:A não custam 1 milhão de
 * leituras): `idx`/`val` ordenados.
 */
class Vec {
  private constructor(
    readonly n: number,
    private readonly dense: readonly Scalar[] | undefined,
    private readonly idx: number[],
    private readonly val: Scalar[],
  ) {}

  static ofArray(xs: readonly Scalar[]): Vec {
    return new Vec(xs.length, xs, [], []);
  }

  /** Índice da igualdade exata (MATCH 0/VLOOKUP FALSO sem curinga): chave → 1º índice. */
  private exactIndex?: Map<string, number>;

  /** 1º índice igual a x (sem curinga), por índice em hash (montado na 1ª busca). */
  exactFirst(x: Scalar): number {
    const k = exactKey(x);
    if (k === undefined) return -1;
    if (!this.exactIndex) {
      const m = new Map<string, number>();
      this.scan(0, this.n - 1, (i, v) => { const kv = exactKey(v); if (kv !== undefined && !m.has(kv)) m.set(kv, i); });
      this.exactIndex = m;
    }
    return this.exactIndex.get(k) ?? -1;
  }

  /** Vetor de uma área, memorizado no recálculo (ctx.cache) quando houver. */
  static ofAreaCached(a: Area, ctx: FnContext): Vec {
    const c = ctx.cache;
    if (!c) return Vec.ofArea(a, ctx);
    const key = `tdl:vec:${a.sheet}:${a.r1}:${a.c1}:${a.r2}:${a.c2}`;
    let v = c.get(key) as Vec | undefined;
    if (!v) { v = Vec.ofArea(a, ctx); c.set(key, v); }
    return v;
  }

  static ofArea(a: Area, ctx: FnContext): Vec {
    const horiz = a.r1 === a.r2 && a.c1 !== a.c2;
    const idx: number[] = [], val: Scalar[] = [];
    ctx.forEachCell(a, (v, r, c) => {
      if (v === null) return;
      idx.push(horiz ? c - a.c1 : r - a.r1);
      val.push(v);
    });
    const n = horiz ? a.c2 - a.c1 + 1 : a.r2 - a.r1 + 1;
    return new Vec(n, undefined, idx, val);
  }

  /** Posição k na lista de existentes do 1º índice ≥ i. */
  private lower(i: number): number {
    let lo = 0, hi = this.idx.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.idx[m]! < i) lo = m + 1; else hi = m; }
    return lo;
  }

  get(i: number): Scalar {
    if (this.dense) return this.dense[i] ?? null;
    const k = this.lower(i);
    return k < this.idx.length && this.idx[k] === i ? this.val[k]! : null;
  }

  /** Percorre os valores NÃO vazios de [from, to] em ordem (ou ao contrário). Parar: devolver true. */
  scan(from: number, to: number, f: (i: number, v: Scalar) => boolean | void, reverse = false): void {
    if (this.dense) {
      if (!reverse) { for (let i = from; i <= to; i++) { const v = this.dense[i]!; if (v !== null && f(i, v)) return; } }
      else for (let i = to; i >= from; i--) { const v = this.dense[i]!; if (v !== null && f(i, v)) return; }
      return;
    }
    if (!reverse) {
      for (let k = this.lower(from); k < this.idx.length && this.idx[k]! <= to; k++) if (f(this.idx[k]!, this.val[k]!)) return;
    } else {
      for (let k = this.lower(to + 1) - 1; k >= 0 && this.idx[k]! >= from; k--) if (f(this.idx[k]!, this.val[k]!)) return;
    }
  }

  /** 1º (ou último) índice vazio, ou -1. */
  blank(reverse: boolean): number {
    if (this.dense) {
      if (!reverse) { for (let i = 0; i < this.n; i++) if (this.dense[i] === null) return i; }
      else for (let i = this.n - 1; i >= 0; i--) if (this.dense[i] === null) return i;
      return -1;
    }
    if (!reverse) { for (let i = 0, k = 0; i < this.n; i++, k++) if (this.idx[k] !== i) return i; return -1; }
    for (let i = this.n - 1, k = this.idx.length - 1; i >= 0; i--, k--) if (this.idx[k] !== i) return i;
    return -1;
  }
}

/** Forma (linhas × colunas) de um valor matricial ou referência de uma área. */
interface Shape { rows: number; cols: number }
function shapeOf(v: Value): Shape | CalcError {
  if (v instanceof RefValue) { const a = v.single; return a ? { rows: a.r2 - a.r1 + 1, cols: a.c2 - a.c1 + 1 } : ERR.VALUE; }
  if (v instanceof ArrayValue) return { rows: v.rows, cols: v.cols };
  if (v instanceof LambdaValue) return ERR.CALC;
  return { rows: 1, cols: 1 };
}

/** Linha r (horizontal) ou coluna c (vertical) de uma matriz/referência como vetor. */
function lineOf(v: Value, ctx: FnContext, horizontal: boolean, k: number): Vec {
  if (v instanceof RefValue) {
    const a = v.single!;
    return Vec.ofAreaCached(horizontal ? { sheet: a.sheet, r1: a.r1 + k, r2: a.r1 + k, c1: a.c1, c2: a.c2 } : { sheet: a.sheet, r1: a.r1, r2: a.r2, c1: a.c1 + k, c2: a.c1 + k }, ctx);
  }
  const arr = v instanceof ArrayValue ? v : new ArrayValue(1, 1, [v as Scalar]);
  return Vec.ofArray(horizontal ? Array.from({ length: arr.cols }, (_, c) => arr.get(k, c)) : Array.from({ length: arr.rows }, (_, r) => arr.get(r, k)));
}

/** Valor da posição (r, c) de matriz/referência (vazio = null). */
function cellOf(v: Value, ctx: FnContext, r: number, c: number): Scalar {
  if (v instanceof RefValue) { const a = v.single!; return ctx.cell(a.sheet, a.r1 + r, a.c1 + c); }
  if (v instanceof ArrayValue) return v.get(r, c);
  return v as Scalar;
}

// ───────────────────────────── comparações ─────────────────────────────

type Kind = 'n' | 's' | 'b' | 'x';
const kind = (v: Scalar): Kind => (typeof v === 'number' ? 'n' : typeof v === 'string' ? 's' : typeof v === 'boolean' ? 'b' : 'x');

/** Comparação do mesmo tipo (texto pela colação do Excel). */
function cmpSame(a: Scalar, b: Scalar): number {
  if (typeof a === 'number') return a < (b as number) ? -1 : a > (b as number) ? 1 : 0;
  if (typeof a === 'string') return compareText(a, b as string);
  return a === b ? 0 : a ? 1 : -1;
}

/** Ordem total do XLOOKUP: número < texto < booleano < erro < vazio. */
const xrank = (v: Scalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : v === null ? 4 : 3);
function cmpTotal(a: Scalar, b: Scalar): number {
  const ra = xrank(a), rb = xrank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  return ra >= 3 ? 0 : cmpSame(a, b);
}

/** Curinga do Excel (MATCH/VLOOKUP/XLOOKUP 2): "~" torna literal qualquer caractere; "~" no fim some. */
export function lookupRegExp(pattern: string): RegExp {
  let src = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === '~') { if (i + 1 < pattern.length) src += pattern[++i]!.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); continue; }
    if (ch === '*') src += '[\\s\\S]*';
    else if (ch === '?') src += '[\\s\\S]';
    else src += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(`^${src}$`, 'i');
}

/**
 * Predicado de igualdade exata (com curingas quando pedido e o texto os tem).
 * MATCH/VLOOKUP: "ß" ≠ "ss"; XLOOKUP/XMATCH (collate): igualdade da colação ("ß" = "ss").
 */
function exactPred(x: Scalar, wildcard: boolean, collate = false): (v: Scalar) => boolean {
  if (typeof x === 'string') {
    if (wildcard && /[*?~]/.test(x)) { const re = lookupRegExp(x); return (v) => typeof v === 'string' && re.test(v); }
    if (collate) return (v) => typeof v === 'string' && compareText(v, x) === 0;
    return (v) => typeof v === 'string' && sameTextCI(v, x);
  }
  if (typeof x === 'number') return (v) => v === x;
  if (typeof x === 'boolean') return (v) => v === x;
  return () => false;
}

// ───────────────────────────── buscas ─────────────────────────────

/** MATCH 0 / VLOOKUP exato: 1º igual (índice 0-based ou -1). */
/** Chave do índice exato (texto sem caixa, como sameTextCI); undefined = não indexável. */
function exactKey(v: Scalar): string | undefined {
  if (typeof v === 'number') return 'n' + v;
  if (typeof v === 'string') return 's' + v.toLowerCase();
  if (typeof v === 'boolean') return v ? 'bT' : 'bF';
  return undefined;
}

function findExact(vec: Vec, x: Scalar, wildcard: boolean): number {
  if (!(wildcard && typeof x === 'string' && /[*?~]/.test(x))) return vec.exactFirst(x);
  const p = exactPred(x, wildcard);
  let hit = -1;
  vec.scan(0, vec.n - 1, (i, v) => { if (p(v)) { hit = i; return true; } });
  return hit;
}

/** MATCH 1 / VLOOKUP / HLOOKUP / LOOKUP aproximados (binária do Excel; ver cabeçalho). */
function findApprox(vec: Vec, x: Scalar): number {
  const kx = kind(x);
  if (kx === 'x') return -1;
  let lo = 0, hi = vec.n - 1, r = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    let k = -1, kv: Scalar = null;
    const here = vec.get(mid);
    if (here !== null && kind(here) === kx) { k = mid; kv = here; }
    else vec.scan(mid, hi, (i, v) => { if (kind(v) === kx) { k = i; kv = v; return true; } });
    if (k < 0) { hi = mid - 1; continue; }
    const c = cmpSame(kv, x);
    if (c === 0) {
      while (k + 1 < vec.n) { const nx = vec.get(k + 1); if (nx === null || kind(nx) !== kx || cmpSame(nx, x) !== 0) break; k++; }
      return k;
    }
    if (c < 0) { r = k; lo = k + 1; } else hi = k - 1;
  }
  return r;
}

/** MATCH −1: linear (ver cabeçalho). */
function findDesc(vec: Vec, x: Scalar): number {
  const kx = kind(x);
  if (kx === 'x') return -1;
  let r = -1, out = -2;
  vec.scan(0, vec.n - 1, (i, v) => {
    if (kind(v) !== kx) return;
    const c = cmpSame(v, x);
    if (c === 0) { out = i; return true; }
    if (c < 0) { out = r; return true; }
    r = i;
  });
  return out === -2 ? r : out;
}

/** XLOOKUP/XMATCH: índice 0-based ou -1 (#N/A); undefined = combinação inválida (#VALUE!). */
function xfind(vec: Vec, x: Scalar, mm: number, sm: number, ctx: FnContext): number | undefined {
  if (Math.abs(sm) === 2) {
    if (mm === 2 || mm === 3) return undefined;
    return sm === 2 ? xbinAsc(vec, x, mm) : xbinDesc(vec, x, mm);
  }
  const rev = sm === -1;
  if (x === null) {
    // procurado vazio: casa a 1ª (última) célula vazia
    if (mm === 0 || mm === 2 || mm === 3) return vec.blank(rev);
  }
  if (mm === 0 || mm === 2) {
    const p = exactPred(x, mm === 2, true);
    let hit = -1;
    vec.scan(0, vec.n - 1, (i, v) => { if (p(v)) { hit = i; return true; } }, rev);
    return hit;
  }
  if (mm === 3) {
    const pat = typeof x === 'string' ? x : x === null ? '' : toText(x, ctx.locale) as string;
    const re = compilePcre(pat, false);
    if (!re) return undefined;
    let hit = -1;
    vec.scan(0, vec.n - 1, (i, v) => {
      if (v instanceof CalcError) return;
      const t = typeof v === 'string' ? v : toText(v, ctx.locale) as string;
      re.lastIndex = 0;
      if (re.test(t)) { hit = i; return true; }
    }, rev);
    return hit;
  }
  // aproximado linear: exato no 1º encontrado; senão o melhor (empate: o 1º encontrado)
  let best = -1, bestV: Scalar = null, exact = -1;
  const consider = (i: number, v: Scalar): boolean => {
    const c = cmpTotal(v, x);
    if (c === 0 && xrank(v) < 3) { exact = i; return true; }
    if (mm === -1 && c < 0 && (best < 0 || cmpTotal(v, bestV) > 0)) { best = i; bestV = v; }
    if (mm === 1 && c > 0 && (best < 0 || cmpTotal(v, bestV) < 0)) { best = i; bestV = v; }
    return false;
  };
  vec.scan(0, vec.n - 1, consider, rev);
  if (exact >= 0) return exact;
  // vazio é o maior de todos: só serve de "próximo maior" se nada mais servir
  if (mm === 1 && best < 0) return vec.blank(rev);
  return best;
}

function xbinAsc(vec: Vec, x: Scalar, mm: number): number {
  let lo = 0, hi = vec.n - 1, eq = -1, rlt = -1, rgt = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = vec.get(mid);
    const c = cmpTotal(v, x);
    if (c === 0 && xrank(v) < 3) { eq = mid; hi = mid - 1; }
    else if (c < 0) { rlt = mid; lo = mid + 1; } else { rgt = mid; hi = mid - 1; }
  }
  return eq >= 0 ? eq : mm === -1 ? rlt : mm === 1 ? rgt : -1;
}

function xbinDesc(vec: Vec, x: Scalar, mm: number): number {
  let lo = 0, hi = vec.n - 1, eq = -1, rlt = -1, rgt = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = vec.get(mid);
    const c = cmpTotal(v, x);
    if (c === 0 && xrank(v) < 3) { eq = mid; lo = mid + 1; }
    else if (c > 0) { rgt = mid; lo = mid + 1; } else { rlt = mid; hi = mid - 1; }
  }
  return eq >= 0 ? eq : mm === -1 ? rlt : mm === 1 ? rgt : -1;
}

// ───────────────────────────── argumentos ─────────────────────────────

/** Valor procurado de MATCH/VLOOKUP/HLOOKUP/LOOKUP: vazio = 0. */
const lookupValue = (v: Scalar): Scalar => (v === null ? 0 : v);

/** range_lookup do VLOOKUP/HLOOKUP: ausente = VERDADEIRO, omitido (;) = FALSO; texto só "VERDADEIRO"/"FALSO" ("1" → #VALUE!). */
function rangeLookup(args: readonly Scalar[], i: number, ctx: FnContext): boolean | CalcError {
  if (args.length <= i) return true;
  const v = args[i]!;
  if (v === null) return false;
  return toBool(v, ctx.locale);
}

/** Inteiro truncado (texto-número aceito). */
function intArg(v: Scalar, ctx: FnContext): number | CalcError {
  const n = toNumber(v, ctx.locale, ctx.date1904);
  return n instanceof CalcError ? n : Math.trunc(n);
}

/** VLOOKUP/HLOOKUP. */
function vhlookup(horizontal: boolean, args: readonly any[], ctx: FnContext): Value {
  const [xv, table, colv] = args as [Scalar, Value, Scalar];
  const x = lookupValue(xv);
  const approx = rangeLookup(args, 3, ctx);
  if (approx instanceof CalcError) return approx;
  const k = intArg(colv, ctx);
  if (k instanceof CalcError) return k;
  if (table instanceof CalcError) return table;
  if (!(table instanceof RefValue || table instanceof ArrayValue)) return ERR.NA; // tabela escalar (medido)
  const sh = shapeOf(table);
  if (sh instanceof CalcError) return ERR.REF;
  // a busca vem antes da validação da coluna (medido: não achou → #N/A mesmo com coluna 0 ou além)
  const key = lineOf(table, ctx, horizontal, 0);
  const i = approx ? findApprox(key, x) : findExact(key, x, true);
  if (i < 0) return ERR.NA;
  if (k < 1) return ERR.VALUE;
  if (k > (horizontal ? sh.rows : sh.cols)) return ERR.REF;
  return horizontal ? cellOf(table, ctx, k - 1, i) : cellOf(table, ctx, i, k - 1);
}

/** Vetor 1-D de um argumento de MATCH/XMATCH; undefined = 2-D. */
function vector1d(v: Value, ctx: FnContext): { vec: Vec; horizontal: boolean } | undefined | CalcError {
  if (v instanceof CalcError) return v;
  const sh = shapeOf(v);
  if (sh instanceof CalcError) return sh;
  if (sh.rows > 1 && sh.cols > 1) return undefined;
  const horizontal = sh.rows === 1 && sh.cols > 1;
  return { vec: lineOf(v, ctx, horizontal, 0), horizontal };
}

/** Modo de XLOOKUP/XMATCH (inteiro); texto → #VALUE!. */
function modeArg(v: Scalar | undefined, def: number, ok: readonly number[], ctx: FnContext): number | CalcError {
  if (v === undefined || v === null) return def;
  if (typeof v === 'string') { const n = toNumber(v, ctx.locale, ctx.date1904); if (n instanceof CalcError) return ERR.VALUE; v = n; }
  const n = intArg(v, ctx);
  if (n instanceof CalcError) return n;
  return ok.includes(n) ? n : ERR.VALUE;
}

/** Fatia da linha/coluna i do retorno do XLOOKUP (referência quando o retorno é referência). */
function sliceAt(ret: Value, horizontal: boolean, i: number, ctx: FnContext): Value {
  if (ret instanceof RefValue) {
    const a = ret.single!;
    return new RefValue([horizontal ? { sheet: a.sheet, r1: a.r1, r2: a.r2, c1: a.c1 + i, c2: a.c1 + i } : { sheet: a.sheet, r1: a.r1 + i, r2: a.r1 + i, c1: a.c1, c2: a.c2 }]);
  }
  const arr = ret instanceof ArrayValue ? ret : new ArrayValue(1, 1, [ret as Scalar]);
  if (horizontal) return arr.rows === 1 ? arr.get(0, i) : ArrayValue.fill(arr.rows, 1, (r) => arr.get(r, i));
  return arr.cols === 1 ? arr.get(i, 0) : ArrayValue.fill(1, arr.cols, (_, c) => arr.get(i, c));
}

// ───────────────────────────── ADDRESS ─────────────────────────────

/** Letras L/C do R1C1 no idioma (pt-BR: "L1C1"). Tabela da camada LOCALE quando houver. */
function r1c1Letters(locale: ValueLocale): [string, string] {
  if (locale.id.startsWith('pt')) return ['L', 'C'];
  if (locale.id.startsWith('es')) return ['F', 'C'];
  if (locale.id.startsWith('fr')) return ['L', 'C'];
  if (locale.id.startsWith('de')) return ['Z', 'S'];
  return ['R', 'C'];
}

function colNumber(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

function colName(c: number): string {
  let s = '';
  for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Nome de aba como o Excel escreve numa referência (aspas quando precisa). */
export function sheetPrefix(name: string, locale?: ValueLocale): string {
  if (name === '') return '!';
  const m = /^(\[[^\]]+\])(.*)$/.exec(name);
  const book = m ? m[1]! : '', base = m ? m[2]! : name;
  // parece referência A1 válida (até XFD1048576) ou booleano do idioma → aspas (medido: "XFE1" sem aspas, "VERDADEIRO" com)
  const a1 = /^([A-Za-z]{1,3})(\d+)$/.exec(base);
  const isCell = !!a1 && colNumber(a1[1]!) <= MAX_COL + 1 && +a1[2]! >= 1 && +a1[2]! <= MAX_ROW + 1;
  const up = base.toUpperCase();
  const isBool = up === 'TRUE' || up === 'FALSE' || (!!locale && (up === locale.trueText.toUpperCase() || up === locale.falseText.toUpperCase()));
  const plain = /^[\p{L}_][\p{L}\p{N}_.]*$/u.test(base) && !isCell && !isBool && !/^[RrLl]\d*[Cc]\d*$/.test(base);
  return plain ? `${book}${base}!` : `'${(book + base).replace(/'/g, "''")}'!`;
}

// ───────────────────────────── registro ─────────────────────────────

register(
  {
    name: 'VLOOKUP', minArgs: 3, maxArgs: 4, args: (i) => (i === 1 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => vhlookup(false, args, ctx),
  },
  {
    name: 'HLOOKUP', minArgs: 3, maxArgs: 4, args: (i) => (i === 1 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => vhlookup(true, args, ctx),
  },
  {
    name: 'MATCH', minArgs: 2, maxArgs: 3, args: (i) => (i === 1 ? 'any' : 'value'), lift: true,
    call: ([xv, arr, tv], ctx) => {
      const x = lookupValue(xv);
      let type = 1;
      if (tv !== undefined) { const n = toNumber(tv, ctx.locale, ctx.date1904); if (n instanceof CalcError) return n; type = Math.sign(Math.trunc(n)) || (n > 0 ? 1 : n < 0 ? -1 : 0); }
      if (!(arr instanceof RefValue || arr instanceof ArrayValue)) return arr instanceof CalcError ? arr : ERR.NA; // escalar (medido)
      const v = vector1d(arr, ctx);
      if (v instanceof CalcError) return v;
      if (!v) return ERR.NA;
      const i = type === 0 ? findExact(v.vec, x, true) : type > 0 ? findApprox(v.vec, x) : findDesc(v.vec, x);
      return i < 0 ? ERR.NA : i + 1;
    },
  },
  {
    name: 'LOOKUP', minArgs: 2, maxArgs: 3, args: (i) => (i === 0 ? 'value' : 'any'), lift: true,
    call: ([xv, lv, rv], ctx) => {
      const x = lookupValue(xv);
      if (lv instanceof CalcError) return lv;
      const sh = shapeOf(lv);
      if (sh instanceof CalcError) return sh;
      if (rv === undefined) {
        // forma matricial: mais colunas que linhas → 1ª linha / última linha; senão 1ª/última coluna
        const horizontal = sh.cols > sh.rows;
        const i = findApprox(lineOf(lv, ctx, horizontal, 0), x);
        if (i < 0) return ERR.NA;
        return horizontal ? cellOf(lv, ctx, sh.rows - 1, i) : cellOf(lv, ctx, i, sh.cols - 1);
      }
      const horizontal = sh.rows === 1 && sh.cols > 1;
      const i = findApprox(lineOf(lv, ctx, horizontal, 0), x);
      if (i < 0) return ERR.NA;
      if (rv instanceof CalcError) return rv;
      // vetor de resultado: referência se estende além do fim (medido); matriz curta → #N/A
      if (rv instanceof RefValue) {
        const a = rv.single;
        if (!a) return ERR.REF;
        const rh = a.r1 === a.r2 && a.c1 !== a.c2;
        const r = rh ? a.r1 : a.r1 + i, c = rh ? a.c1 + i : a.c1;
        if (r > MAX_ROW || c > MAX_COL) return ERR.REF;
        return ctx.cell(a.sheet, r, c);
      }
      const rs = shapeOf(rv);
      if (rs instanceof CalcError) return rs;
      const rh = rs.rows === 1 && rs.cols > 1;
      if (i >= (rh ? rs.cols : rs.rows)) return ERR.NA;
      return rh ? cellOf(rv, ctx, 0, i) : cellOf(rv, ctx, i, 0);
    },
  },
  {
    name: 'XLOOKUP', prefix: '_xlfn.', minArgs: 3, maxArgs: 6, returnsRef: true,
    args: (i) => (i === 0 || i >= 4 ? 'value' : 'any'), lift: true,
    call: ([x, la, ra, nf, mv, sv], ctx) => {
      const mm = modeArg(mv, 0, [0, -1, 1, 2, 3], ctx);
      if (mm instanceof CalcError) return mm;
      const sm = modeArg(sv, 1, [1, -1, 2, -2], ctx);
      if (sm instanceof CalcError) return sm;
      const v = vector1d(la, ctx);
      if (v instanceof CalcError) return v;
      if (!v) return ERR.VALUE;
      if (ra instanceof CalcError) return ra;
      const rs = shapeOf(ra);
      if (rs instanceof CalcError) return rs;
      if ((v.horizontal ? rs.cols : rs.rows) !== v.vec.n) return ERR.VALUE;
      const i = xfind(v.vec, x as Scalar, mm, sm, ctx);
      if (i === undefined) return ERR.VALUE;
      if (i < 0) return nf === undefined || nf === null ? ERR.NA : nf;
      return sliceAt(ra, v.horizontal, i, ctx);
    },
  },
  {
    name: 'XMATCH', prefix: '_xlfn.', minArgs: 2, maxArgs: 4, args: (i) => (i === 1 ? 'any' : 'value'), lift: true,
    call: ([x, la, mv, sv], ctx) => {
      const mm = modeArg(mv, 0, [0, -1, 1, 2, 3], ctx);
      if (mm instanceof CalcError) return mm;
      const sm = modeArg(sv, 1, [1, -1, 2, -2], ctx);
      if (sm instanceof CalcError) return sm;
      const v = vector1d(la, ctx);
      if (v instanceof CalcError) return v;
      if (!v) return ERR.VALUE;
      const i = xfind(v.vec, x as Scalar, mm, sm, ctx);
      if (i === undefined) return ERR.VALUE;
      return i < 0 ? ERR.NA : i + 1;
    },
  },
  {
    name: 'ADDRESS', minArgs: 2, maxArgs: 5, args: 'value', lift: true,
    call: (args, ctx) => {
      const r = intArg(args[0]!, ctx); if (r instanceof CalcError) return r;
      const c = intArg(args[1]!, ctx); if (c instanceof CalcError) return c;
      let abs = 1;
      if (args.length > 2 && args[2] !== null) { const n = intArg(args[2]!, ctx); if (n instanceof CalcError) return n; abs = n; }
      let a1 = true;
      if (args.length > 3 && args[3] !== null) {
        const b = toBool(args[3]!, ctx.locale); if (b instanceof CalcError) return b; a1 = b;
      }
      let sheet: string | undefined;
      if (args.length > 4 && args[4] !== null) { const s = txt(args[4]!, ctx); if (s instanceof CalcError) return s; sheet = s; }
      if (r < 1 || r > MAX_ROW + 1 || c < 1 || c > MAX_COL + 1 || abs < 1 || abs > 4) return ERR.VALUE;
      const absRow = abs === 1 || abs === 2, absCol = abs === 1 || abs === 3;
      let ref: string;
      if (a1) ref = `${absCol ? '$' : ''}${colName(c)}${absRow ? '$' : ''}${r}`;
      else {
        const [R, C] = r1c1Letters(ctx.locale);
        ref = `${R}${absRow ? r : `[${r}]`}${C}${absCol ? c : `[${c}]`}`;
      }
      return sheet === undefined ? ref : sheetPrefix(sheet, ctx.locale) + ref;
    },
  },
  {
    name: 'TRANSPOSE', minArgs: 1, maxArgs: 1, args: 'any',
    call: ([v], ctx) => {
      let x: Value = v;
      // fórmula legada: o argumento de matriz sofre interseção implícita (medido: #VALUE! fora da linha/coluna)
      if (x instanceof RefValue && ctx.arrayContext === false) { const s = x.single; if (!s || s.r1 !== s.r2 || s.c1 !== s.c2) x = implicitIntersection(x, ctx); }
      if (x instanceof CalcError) return x;
      const a = asArray(x, ctx);
      if (a instanceof CalcError) return a;
      return ArrayValue.fill(a.cols, a.rows, (r, c) => a.get(c, r));
    },
  },
  {
    name: 'HYPERLINK', minArgs: 1, maxArgs: 2, args: 'value', lift: true,
    call: (args, ctx) => (args.length > 1 ? args[1]! : txt(args[0]!, ctx)),
  },
  // sem tabela dinâmica nem servidor RTD: como o Excel sem eles
  { name: 'GETPIVOTDATA', minArgs: 2, maxArgs: 254, args: 'any', call: () => ERR.REF },
  { name: 'RTD', minArgs: 3, maxArgs: 255, args: 'value', volatile: true, call: () => ERR.NA },
  // sem rede/arquivos: IMAGE de URL e IMPORTCSV/IMPORTTEXT ficam #BUSY! no Excel até
  // carregar; aqui não carregam → #CONNECT!; IMAGE de texto que não é URL → #VALUE! (medido)
  {
    name: 'IMAGE', prefix: '_xlfn.', minArgs: 1, maxArgs: 5, args: 'value', lift: true,
    call: ([src], ctx) => {
      const u = txt(src!, ctx);
      if (u instanceof CalcError) return u;
      return /^https?:\/\/\S+$/i.test(u) ? CalcError.of('#CONNECT!') : ERR.VALUE;
    },
  },
  { name: 'IMPORTCSV', prefix: '_xlfn.', minArgs: 1, maxArgs: 5, args: 'any', call: () => CalcError.of('#CONNECT!') },
  { name: 'IMPORTTEXT', prefix: '_xlfn.', minArgs: 1, maxArgs: 7, args: 'any', call: () => CalcError.of('#CONNECT!') },
  // valores comuns não têm campos (tipo de dados vinculado) → #FIELD! (medido)
  { name: 'FIELDVALUE', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: 'value', lift: true, acceptsErrors: true, call: () => ERR.FIELD },
);

