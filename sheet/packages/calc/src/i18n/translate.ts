/**
 * Tradutor de fórmulas canônico ↔ idioma do Excel (texto → texto, sem AST).
 *
 * Canônico = o texto que o motor usa por dentro: o Formula2 do Excel (nomes em
 * inglês sem prefixo, "," entre argumentos, "." decimal, erros "#VALUE!"),
 * com uma diferença medida: nome DESCONHECIDO que coincide com uma função
 * (SUM digitado no Excel pt-BR) leva `_xludf.` como no arquivo — senão viraria
 * a função. `toLocal` aceita também a forma do ARQUIVO (OOXML): tira `_xlfn.`/
 * `_xlws.`/`_xlpm.`/`_xleta.`, mostra `_xlop.b` como `[b]`, `_xlfn.SINGLE(x)`
 * como `@x`, `_xlfn.ANCHORARRAY(A1)` como `A1#`, `_xlfn._TRO_*` como `:.`/`.:`/
 * `.:.`, `T[[#This Row],[C]]` como `T[@C]` e `T[]` como `T` (como a tela do Excel).
 *
 * O idioma decide nomes, erros, booleanos, letras R1C1, palavras-chave de
 * tabela e separadores de constante de matriz; decimal e separador de lista são
 * regionais e vêm das opções (padrões do idioma).
 */
import type { ErrorCode } from '../values.js';
import { catalog, catalogEntry, stripFilePrefix } from './catalog.js';
import { OPERATOR_FUNCTIONS } from './catalog-data.js';
import { EN_US_LANG, getLanguage } from './languages.js';
import type { FormulaLanguage, SyntaxOptions, TableKeywords } from './types.js';

const ERROR_CODES: readonly ErrorCode[] = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA',
  '#SPILL!', '#CALC!', '#FIELD!', '#BLOCKED!', '#CONNECT!', '#UNKNOWN!', '#BUSY!', '#PYTHON!'];
type KwKey = keyof TableKeywords;
const KW_KEYS: readonly KwKey[] = ['all', 'data', 'headers', 'totals', 'thisRow'];

// ------------------------------------------------------------------ idioma

interface LangData {
  readonly lang: FormulaLanguage;
  readonly fold: (s: string) => string;
  /** nome local (dobrado) → canônico */
  readonly fnIn: ReadonlyMap<string, string>;
  readonly fnOut: (canon: string) => string;
  readonly errIn: readonly (readonly [string, ErrorCode])[];
  readonly errOut: (code: ErrorCode) => string;
  readonly bools: readonly [string, string];
  readonly row: string;
  readonly col: string;
  readonly open: string;
  readonly close: string;
  readonly kwIn: ReadonlyMap<string, KwKey>;
  readonly kwOut: (k: KwKey) => string;
}

const LANG_CACHE = new WeakMap<FormulaLanguage, LangData>();

function langData(lang: FormulaLanguage): LangData {
  let d = LANG_CACHE.get(lang);
  if (d) return d;
  const fold = (s: string): string => s.toLocaleUpperCase(lang.id);
  const fnIn = new Map<string, string>();
  // funções sem tradução primeiro: a tradução explícita ganha em colisão
  for (const e of catalog()) if (!lang.functions[e.name]) fnIn.set(fold(e.name), e.name);
  for (const [canon, local] of Object.entries(lang.functions)) fnIn.set(fold(local), canon);
  const errOut = (code: ErrorCode): string => lang.errors?.[code] ?? code;
  const errIn = ERROR_CODES.map((c) => [fold(errOut(c)), c] as const).sort((a, b) => b[0].length - a[0].length);
  const table = { ...EN_US_LANG.table, ...lang.table } as TableKeywords;
  const kwIn = new Map<string, KwKey>(KW_KEYS.map((k) => [fold(table[k]), k]));
  d = {
    lang, fold, fnIn,
    fnOut: (canon) => lang.functions[canon] ?? canon,
    errIn, errOut,
    bools: lang.bools ?? ['TRUE', 'FALSE'],
    row: lang.r1c1?.row ?? 'R', col: lang.r1c1?.col ?? 'C',
    open: lang.r1c1?.open ?? '[', close: lang.r1c1?.close ?? ']',
    kwIn, kwOut: (k) => table[k],
  };
  LANG_CACHE.set(lang, d);
  return d;
}

/** Tabela do idioma pedido (id desconhecido → inglês, como um Excel sem tradução). */
export function resolveLanguage(lang: string | FormulaLanguage | undefined): FormulaLanguage {
  if (!lang) return EN_US_LANG;
  if (typeof lang !== 'string') return lang;
  return getLanguage(lang) ?? EN_US_LANG;
}

/** Separadores em vigor para as opções (o que a UI mostra/aceita). */
export interface ResolvedSyntax {
  readonly lang: FormulaLanguage;
  readonly decimal: string;
  readonly list: string;
  readonly arrayCol: string;
  readonly arrayRow: string;
  readonly r1c1: boolean;
}

/**
 * Padrões: decimal regional típico do idioma; lista ";" se o decimal for ","
 * (senão ","); separador de coluna da matriz do idioma — se coincidir com o
 * decimal, o alternativo do idioma (xlAlternateArraySeparator); en-US sem
 * alternativo medido usa "\".
 */
export function resolveSyntax(opts: SyntaxOptions = {}): ResolvedSyntax {
  const lang = resolveLanguage(opts.lang);
  const decimal = opts.decimal ?? lang.regional?.decimal ?? '.';
  const list = opts.list ?? (opts.decimal === undefined ? lang.regional?.list : undefined) ?? (decimal === ',' ? ';' : ',');
  let arrayCol = opts.arrayCol ?? lang.array?.col ?? ',';
  if (opts.arrayCol === undefined && arrayCol === decimal) arrayCol = lang.array?.alt ?? '\\';
  const arrayRow = opts.arrayRow ?? lang.array?.row ?? ';';
  return { lang, decimal, list, arrayCol, arrayRow, r1c1: !!opts.r1c1 };
}

const CANONICAL: ResolvedSyntax = { lang: EN_US_LANG, decimal: '.', list: ',', arrayCol: ',', arrayRow: ';', r1c1: false };

interface Dialect extends ResolvedSyntax {
  readonly canonical: boolean;
  readonly d: LangData;
  /** Colchetes do R1C1 relativo no idioma. */
  readonly open: string;
  readonly close: string;
}

function dialect(s: ResolvedSyntax, canonical: boolean): Dialect {
  const d = langData(s.lang);
  return { ...s, canonical, d, open: d.open, close: d.close };
}

// ------------------------------------------------------------------ tokens

interface Part { readonly abs?: string; readonly rel?: string }
type SItem = { readonly kw: KwKey } | { readonly col: string } | { readonly range: readonly [string, string] } | { readonly raw: string };
interface SBody { readonly form: 'empty' | 'simple' | 'groups'; readonly thisRow: boolean; readonly items: readonly SItem[] }

type Tok =
  | { readonly k: 'text'; readonly s: string }
  | { readonly k: 'ws'; readonly s: string }
  | { readonly k: 'num'; readonly int: string; readonly frac?: string; readonly exp: string }
  | { readonly k: 'fn'; readonly canon?: string; readonly raw: string }
  | { readonly k: 'eta'; readonly canon: string; readonly raw: string }
  | { readonly k: 'name'; readonly s: string; readonly pre?: 'pm' | 'op'; readonly quoted?: boolean }
  | { readonly k: 'bool'; readonly v: boolean }
  | { readonly k: 'err'; readonly code: ErrorCode }
  | { readonly k: 'sep'; readonly t: 'list' | 'col' | 'row' }
  | { readonly k: 'r1c1'; readonly row?: Part; readonly col?: Part }
  | { readonly k: 'sref'; readonly table: string; readonly body: SBody }
  | { readonly k: 'open' }
  | { readonly k: 'close' };

const ID_START = /[\p{L}_\\$]/u;
const ID_CHAR = /[\p{L}\p{M}\p{N}_.\\?$]/u;
const DIGIT = /[0-9]/;
const A1_CELL = /^\$?([A-Za-z]{1,3})\$?([0-9]+)$/;

function isA1Cell(s: string): boolean {
  const m = A1_CELL.exec(s);
  if (!m) return false;
  let c = 0;
  for (const ch of m[1]!.toUpperCase()) c = c * 26 + ch.charCodeAt(0) - 64;
  const r = Number(m[2]);
  return c <= 16384 && r >= 1 && r <= 1048576;
}

function colLetters(n: number): string {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Fim do bloco entre colchetes que começa em `i` ("'" escapa o próximo caractere). */
function matchBracket(t: string, i: number): number {
  let depth = 0;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (c === "'") { j++; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return j; }
  }
  return -1;
}

function parseStructured(inner: string, src: Dialect): SBody {
  const kw = (s: string): KwKey | undefined => src.d.kwIn.get(src.d.fold(s.trim()));
  if (inner.trim() === '') return { form: 'empty', thisRow: false, items: [] };
  const groups = (s: string): SItem[] | undefined => {
    const items: SItem[] = [];
    let i = 0;
    const one = (): string | undefined => {
      while (s[i] === ' ') i++;
      if (s[i] !== '[') return undefined;
      const e = matchBracket(s, i);
      if (e < 0) return undefined;
      const v = s.slice(i + 1, e);
      i = e + 1;
      return v;
    };
    while (i < s.length) {
      const a = one();
      if (a === undefined) return undefined;
      while (s[i] === ' ') i++;
      if (s[i] === ':') {
        i++;
        const b = one();
        if (b === undefined) return undefined;
        items.push({ range: [a, b] });
      } else {
        const k = a.startsWith('#') ? kw(a) : undefined;
        items.push(k ? { kw: k } : a.startsWith('#') ? { raw: a } : { col: a });
      }
      while (s[i] === ' ') i++;
      if (i >= s.length) break;
      if (s.startsWith(src.list, i)) { i += src.list.length; continue; }
      return undefined;
    }
    return items;
  };
  if (inner.startsWith('@')) {
    const rest = inner.slice(1);
    if (rest === '') return { form: 'simple', thisRow: true, items: [] };
    if (rest.startsWith('[')) {
      const g = groups(rest);
      if (g) return { form: 'groups', thisRow: true, items: g };
    }
    return { form: 'simple', thisRow: true, items: [{ col: rest }] };
  }
  if (inner.startsWith('[')) {
    const g = groups(inner);
    if (g) {
      const thisRow = g.some((x) => 'kw' in x && x.kw === 'thisRow');
      return { form: 'groups', thisRow, items: thisRow ? g.filter((x) => !('kw' in x && x.kw === 'thisRow')) : g };
    }
    return { form: 'simple', thisRow: false, items: [{ raw: inner }] };
  }
  if (inner.startsWith('#')) {
    const k = kw(inner);
    if (k === 'thisRow') return { form: 'simple', thisRow: true, items: [] };
    return { form: 'simple', thisRow: false, items: [k ? { kw: k } : { raw: inner }] };
  }
  return { form: 'simple', thisRow: false, items: [{ col: inner }] };
}

const PLAIN_NAME = /^[\p{L}_\\][\p{L}\p{N}_.\\]*$/u;

/** Coluna que dispensa os colchetes internos na forma "@" (T[@Col] × T[@[Col A]]). */
const SIMPLE_COL = /^[\p{L}_][\p{L}\p{N}_]*$/u;

function tokenize(text: string, src: Dialect, names?: ReadonlySet<string>): Tok[] {
  const toks: Tok[] = [];
  const n = text.length;
  let i = 0;
  let inArray = false;
  const d = src.d;
  const r1c1Re = src.r1c1
    ? new RegExp(`^(?:(${esc(d.row)})(?:${esc(src.open)}([+-]?[0-9]+)${esc(src.close)}|([0-9]+))?)?(?:(${esc(d.col)})(?:${esc(src.open)}([+-]?[0-9]+)${esc(src.close)}|([0-9]+))?)?`, 'iu')
    : undefined;
  const absRc = new RegExp(`^${esc(d.row)}([0-9]+)${esc(d.col)}([0-9]+)$`, 'iu');
  const prevSignificant = (): Tok | undefined => toks[toks.length - 1];
  const refLike = (t: Tok | undefined): boolean => !!t && (t.k === 'name' || t.k === 'r1c1' || t.k === 'sref' || t.k === 'close');
  const prefixOf = (raw: string): { pre: string; rest: string } => {
    const m = /^((?:_xl[a-z]+\.)*)(.*)$/i.exec(raw)!;
    return { pre: m[1]!, rest: m[2]! };
  };

  while (i < n) {
    const c = text[i]!;
    // espaços (interseção) e quebras
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(text[j]!)) j++;
      toks.push({ k: 'ws', s: text.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      for (; j < n; j++) if (text[j] === '"') { if (text[j + 1] === '"') j++; else break; }
      toks.push({ k: 'text', s: text.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      for (; j < n; j++) if (text[j] === "'") { if (text[j + 1] === "'") j++; else break; }
      const q = text.slice(i, j + 1);
      if (text[j + 1] === '!') { toks.push({ k: 'text', s: q + '!' }); i = j + 2; continue; }
      toks.push({ k: 'name', s: q.slice(1, -1).replace(/''/g, "'"), quoted: true });
      i = j + 1;
      continue;
    }
    if (c === '{') { inArray = true; toks.push({ k: 'text', s: c }); i++; continue; }
    if (c === '}') { inArray = false; toks.push({ k: 'text', s: c }); i++; continue; }
    if (c === '(') { toks.push({ k: 'open' }); i++; continue; }
    if (c === ')') { toks.push({ k: 'close' }); i++; continue; }
    // números (antes dos separadores: o decimal pode ser ",")
    if (DIGIT.test(c) || (text.startsWith(src.decimal, i) && DIGIT.test(text[i + src.decimal.length] ?? ''))) {
      let j = i;
      while (j < n && DIGIT.test(text[j]!)) j++;
      const int = text.slice(i, j);
      let frac: string | undefined;
      if (text.startsWith(src.decimal, j) && !(inArray && src.decimal === src.arrayCol)) {
        let k = j + src.decimal.length;
        while (k < n && DIGIT.test(text[k]!)) k++;
        frac = text.slice(j + src.decimal.length, k);
        j = k;
      }
      const em = /^[eE][+-]?[0-9]+/.exec(text.slice(j));
      const exp = em ? em[0] : '';
      j += exp.length;
      // "1:3" (linhas) e afins: inteiros passam iguais
      toks.push({ k: 'num', int, ...(frac !== undefined ? { frac } : {}), exp });
      i = j;
      continue;
    }
    if (inArray) {
      if (text.startsWith(src.arrayCol, i)) { toks.push({ k: 'sep', t: 'col' }); i += src.arrayCol.length; continue; }
      if (text.startsWith(src.arrayRow, i)) { toks.push({ k: 'sep', t: 'row' }); i += src.arrayRow.length; continue; }
    } else if (text.startsWith(src.list, i)) { toks.push({ k: 'sep', t: 'list' }); i += src.list.length; continue; }
    // R1C1
    if (r1c1Re && ID_START.test(c)) {
      const m = r1c1Re.exec(text.slice(i));
      const after = m ? text[i + m[0].length] ?? '' : '';
      // "." só termina a referência no operador de aparar (L1C1.:L3C1)
      if (m && m[0] && (!ID_CHAR.test(after) || (after === '.' && text[i + m[0].length + 1] === ':')) && after !== '(' && after !== '!') {
        const part = (has: string | undefined, rel: string | undefined, abs: string | undefined): Part | undefined =>
          has === undefined ? undefined : rel !== undefined ? { rel } : abs !== undefined ? { abs } : {};
        toks.push({ k: 'r1c1', row: part(m[1], m[2], m[3]), col: part(m[4], m[5], m[6]) });
        i += m[0].length;
        continue;
      }
    }
    if (ID_START.test(c) && !inArray) {
      let j = i + 1;
      while (j < n && ID_CHAR.test(text[j]!)) j++;
      const word = text.slice(i, j);
      const next = text[j];
      if (next === '(') {
        const { pre, rest } = prefixOf(word);
        const preU = pre.toLowerCase();
        if (preU.includes('_xludf.')) { toks.push({ k: 'fn', raw: word.slice(pre.toLowerCase().indexOf('_xludf.') + 7) }); i = j; continue; }
        if (src.canonical) {
          const canon = stripFilePrefix(word);
          if (catalogEntry(canon) || OPERATOR_FUNCTIONS[canon]) toks.push({ k: 'fn', canon, raw: word });
          else toks.push({ k: 'fn', raw: word });
        } else {
          // o Excel tira _xlfn. e procura o nome LOCAL (_xlfn.PROCX → XLOOKUP)
          const canon = d.fnIn.get(d.fold(preU === '_xlfn.' || preU === '_xlfn._xlws.' || preU === '_xlws.' ? rest : word));
          toks.push(canon ? { k: 'fn', canon, raw: word } : { k: 'fn', raw: word });
        }
        i = j;
        continue;
      }
      if (next === '!') { toks.push({ k: 'text', s: word + '!' }); i = j + 1; continue; }
      if (next === '[') {
        const e = matchBracket(text, j);
        if (e > 0) {
          toks.push({ k: 'sref', table: word, body: parseStructured(text.slice(j + 1, e), src) });
          i = e + 1;
          continue;
        }
      }
      const prevCh = text[i - 1];
      const inRange = next === ':' || prevCh === ':';
      const lower = word.toLowerCase();
      if (lower.startsWith('_xlpm.')) { toks.push({ k: 'name', s: word.slice(6), pre: 'pm' }); i = j; continue; }
      if (lower.startsWith('_xlop.')) { toks.push({ k: 'name', s: word.slice(6), pre: 'op' }); i = j; continue; }
      if (lower.startsWith('_xleta.')) {
        const canon = stripFilePrefix(word.slice(7));
        toks.push(catalogEntry(canon) ? { k: 'eta', canon, raw: word.slice(7) } : { k: 'name', s: word });
        i = j;
        continue;
      }
      const f = d.fold(word);
      if (f === d.fold(d.bools[0]) || f === d.fold(d.bools[1])) { toks.push({ k: 'bool', v: f === d.fold(d.bools[0]) }); i = j; continue; }
      // R1C1 absoluto digitado em modo A1 (L1C1 → $A$1, medido no pt-BR)
      const rc = !src.r1c1 && !inRange ? absRc.exec(word) : null;
      if (rc && Number(rc[1]) >= 1 && Number(rc[1]) <= 1048576 && Number(rc[2]) >= 1 && Number(rc[2]) <= 16384) {
        toks.push({ k: 'name', s: `$${colLetters(Number(rc[2]))}$${rc[1]}` });
        i = j;
        continue;
      }
      // função como valor (eta: =GROUPBY(...;SOMA), =SUM)
      const prev = prevSignificant();
      if (!inRange && !isA1Cell(word) && !(prev?.k === 'text' && prev.s.endsWith('!')) && !names?.has(f)) {
        const canon = src.canonical ? (catalogEntry(word) ? stripFilePrefix(word) : undefined) : d.fnIn.get(f);
        if (canon) { toks.push({ k: 'eta', canon, raw: word }); i = j; continue; }
      }
      toks.push({ k: 'name', s: word });
      i = j;
      continue;
    }
    if (ID_START.test(c) && inArray) {
      // dentro de { } só há booleanos: só letras (o separador de coluna pode ser "\" ou ".")
      let j = i + 1;
      while (j < n && /\p{L}/u.test(text[j]!)) j++;
      const word = text.slice(i, j);
      const f = d.fold(word);
      if (f === d.fold(d.bools[0]) || f === d.fold(d.bools[1])) toks.push({ k: 'bool', v: f === d.fold(d.bools[0]) });
      else toks.push({ k: 'text', s: word });
      i = j;
      continue;
    }
    if (c === '[') {
      const e = matchBracket(text, i);
      if (e > 0) {
        const after = text[e + 1] ?? '';
        if (ID_CHAR.test(after) || after === "'" || after === '!') {
          // referência externa: [1]Plan1!A1, [Pasta.xlsx]Plan1!A1
          toks.push({ k: 'text', s: text.slice(i, e + 1) });
        } else {
          toks.push({ k: 'sref', table: '', body: parseStructured(text.slice(i + 1, e), src) });
        }
        i = e + 1;
        continue;
      }
    }
    if (c === '#') {
      const prev = prevSignificant();
      if (refLike(prev)) { toks.push({ k: 'text', s: '#' }); i++; continue; }
      const head = d.fold(text.slice(i, i + 24));
      const hit = d.errIn.find(([name]) => head.startsWith(name));
      if (hit) { toks.push({ k: 'err', code: hit[1] }); i += hit[0].length; continue; }
      toks.push({ k: 'text', s: '#' });
      i++;
      continue;
    }
    toks.push({ k: 'text', s: c });
    i++;
  }
  return toks;
}

/** Forma do arquivo → forma da tela: _xlfn.SINGLE(x) → @x, ANCHORARRAY(A1) → A1#, _TRO_* → :. .: .:. */
function rewriteOperators(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    const op = t.k === 'fn' && t.canon ? OPERATOR_FUNCTIONS[t.canon] : undefined;
    if (!op || t.k !== 'fn' || toks[i + 1]?.k !== 'open') { out.push(t); continue; }
    let depth = 0, j = i + 1;
    for (; j < toks.length; j++) {
      const x = toks[j]!;
      if (x.k === 'open') depth++;
      else if (x.k === 'close' && --depth === 0) break;
    }
    if (j >= toks.length) { out.push(t); continue; }
    const inner = rewriteOperators(toks.slice(i + 2, j));
    if (op === '@') out.push({ k: 'text', s: '@' }, ...inner);
    else if (op === '#') out.push(...inner, { k: 'text', s: '#' });
    else {
      // _TRO_*: o ":" de nível zero ganha os pontos
      let d2 = 0, colon = -1;
      inner.forEach((x, k) => { if (x.k === 'open') d2++; else if (x.k === 'close') d2--; else if (d2 === 0 && x.k === 'text' && x.s === ':') colon = k; });
      if (colon < 0) { out.push(t, ...toks.slice(i + 1, j + 1)); i = j; continue; }
      out.push(...inner.slice(0, colon), { k: 'text', s: op }, ...inner.slice(colon + 1));
    }
    i = j;
  }
  return out;
}

/**
 * Escopo de LET/LAMBDA: o nome declarado como parâmetro (e seus usos) é nome,
 * nunca função como valor (LAMBDA(taxa;taxa*2) no pt-BR: TAXA também é RATE).
 * Com `mark`, ganha _xlpm. (e _xlop. o opcional [b]) como no arquivo.
 */
function scopeParams(toks: Tok[], mark: boolean): Tok[] {
  interface Frame { fn: string; depth: number; arg: number; params: Set<string> }
  const out = toks.slice();
  const frames: Frame[] = [];
  let depth = 0;
  const visible = (s: string): boolean => frames.some((f) => f.params.has(s.toUpperCase()));
  const nextSig = (k: number): Tok | undefined => { for (let m = k + 1; m < out.length; m++) if (out[m]!.k !== 'ws') return out[m]; return undefined; };
  const prevSig = (k: number): Tok | undefined => { for (let m = k - 1; m >= 0; m--) if (out[m]!.k !== 'ws') return out[m]; return undefined; };
  const nameOf = (t: Tok): string | undefined => t.k === 'name' && !t.pre ? t.s : t.k === 'eta' ? t.canon : undefined;
  for (let k = 0; k < out.length; k++) {
    const t = out[k]!;
    if (t.k === 'open') {
      depth++;
      const p = prevSig(k);
      if (p?.k === 'fn' && (p.canon === 'LET' || p.canon === 'LAMBDA')) frames.push({ fn: p.canon, depth, arg: 0, params: new Set() });
      continue;
    }
    if (t.k === 'close') { if (frames.at(-1)?.depth === depth) frames.pop(); depth--; continue; }
    const top = frames.at(-1);
    if (t.k === 'sep' && t.t === 'list' && top?.depth === depth) { top.arg++; continue; }
    const declPos = top?.depth === depth && (prevSig(k)?.k === 'open' || prevSig(k)?.k === 'sep') && nextSig(k)?.k === 'sep';
    const declaring = !!declPos && (top!.fn === 'LAMBDA' || top!.arg % 2 === 0);
    const nm = nameOf(t);
    if (nm !== undefined) {
      const s = t.k === 'name' ? t.s : t.k === 'eta' ? t.raw : nm;
      if (declaring) { top!.params.add(s.toUpperCase()); out[k] = { k: 'name', s: t.k === 'eta' ? t.raw : s, ...(mark ? { pre: 'pm' as const } : {}) }; }
      else if (visible(s)) out[k] = { k: 'name', s: t.k === 'eta' ? t.raw : s, ...(mark ? { pre: 'pm' as const } : {}) };
    } else if (t.k === 'sref' && !t.table && declaring && top!.fn === 'LAMBDA' && t.body.form === 'simple' && !t.body.thisRow) {
      const it = t.body.items[0];
      if (it && 'col' in it) { top!.params.add(it.col.toUpperCase()); if (mark) out[k] = { k: 'name', s: it.col, pre: 'op' }; }
    }
  }
  return out;
}

interface RenderOpts { readonly filePrefixes: boolean; readonly inTable?: string }

function renderStructured(t: Extract<Tok, { k: 'sref' }>, tgt: Dialect, o: RenderOpts): string {
  const d = tgt.d;
  const item = (x: SItem): string => 'kw' in x ? `[${d.kwOut(x.kw)}]` : 'col' in x ? `[${x.col}]` : 'range' in x ? `[${x.range[0]}]:[${x.range[1]}]` : `[${x.raw}]`;
  let table = t.table;
  const b = t.body;
  if (b.thisRow) {
    if (o.filePrefixes && tgt.canonical) {
      if (!table && o.inTable) table = o.inTable;
      const kw = `[${d.kwOut('thisRow')}]`;
      return table + (b.items.length ? `[${[kw, ...b.items.map(item)].join(tgt.list)}]` : `[${d.kwOut('thisRow')}]`);
    }
    if (table && o.inTable && table.toUpperCase() === o.inTable.toUpperCase()) table = '';
    if (!b.items.length) return `${table}[@]`;
    const only = b.items[0]!;
    if (b.items.length === 1 && 'col' in only && SIMPLE_COL.test(only.col)) return `${table}[@${only.col}]`;
    return `${table}[@${b.items.map(item).join(tgt.list)}]`;
  }
  if (b.form === 'empty') return table ? (o.filePrefixes && tgt.canonical ? `${table}[]` : table) : '[]';
  if (b.form === 'simple') {
    const x = b.items[0]!;
    return `${table}[${'kw' in x ? d.kwOut(x.kw) : 'col' in x ? x.col : 'raw' in x ? x.raw : item(x)}]`;
  }
  return `${table}[${b.items.map(item).join(tgt.list)}]`;
}

function render(toks: readonly Tok[], tgt: Dialect, o: RenderOpts): string {
  const d = tgt.d;
  const boolF = [d.fold(d.bools[0]), d.fold(d.bools[1])];
  let s = '';
  for (const t of toks) {
    switch (t.k) {
      case 'text': case 'ws': s += t.s; break;
      case 'open': s += '('; break;
      case 'close': s += ')'; break;
      case 'num': s += t.int + (t.frac !== undefined ? tgt.decimal + t.frac : '') + t.exp; break;
      case 'sep': s += t.t === 'list' ? tgt.list : t.t === 'col' ? tgt.arrayCol : tgt.arrayRow; break;
      case 'bool': s += d.bools[t.v ? 0 : 1]; break;
      case 'err': s += d.errOut(t.code); break;
      case 'fn':
        if (t.canon) {
          if (tgt.canonical) s += (o.filePrefixes ? catalogEntry(t.canon)?.prefix ?? (OPERATOR_FUNCTIONS[t.canon] ? '_xlfn.' : '') : '') + t.canon;
          else s += d.fnOut(t.canon);
        } else {
          // desconhecida: no canônico, marca a que coincide com uma função (como o arquivo)
          s += tgt.canonical && catalogEntry(t.raw) ? `_xludf.${t.raw}` : t.raw;
        }
        break;
      case 'eta': s += tgt.canonical ? (o.filePrefixes ? '_xleta.' : '') + t.canon : d.fnOut(t.canon); break;
      case 'name': {
        if (t.pre === 'op') { s += tgt.canonical && o.filePrefixes ? `_xlop.${t.s}` : `[${t.s}]`; break; }
        if (t.pre === 'pm' && tgt.canonical && o.filePrefixes) { s += `_xlpm.${t.s}`; break; }
        // aspas: nome que coincide com o booleano do idioma ('TRUE' no pt-BR) ou que
        // não é identificador simples ('Aba 1':'Aba 2'!A1 escrito em partes)
        s += boolF.includes(d.fold(t.s)) || (t.quoted && !PLAIN_NAME.test(t.s)) ? `'${t.s.replace(/'/g, "''")}'` : t.s;
        break;
      }
      case 'r1c1': {
        const part = (letter: string, p: Part | undefined): string => p === undefined ? '' : letter + (p.abs ?? (p.rel !== undefined ? tgt.open + p.rel + tgt.close : ''));
        s += part(d.row, t.row) + part(d.col, t.col);
        break;
      }
      case 'sref': s += renderStructured(t, tgt, o); break;
    }
  }
  return s;
}

/** Opções extras dos tradutores. */
export interface TranslateOptions extends SyntaxOptions {
  /**
   * Tabela em que a fórmula está (a tela do Excel mostra `[@Col]` sem o nome da
   * própria tabela; o arquivo grava `Tabela[[#This Row],[Col]]`).
   */
  readonly inTable?: string;
  /**
   * Nomes definidos da pasta: ganham da função como valor (medido: com o nome
   * "Taxa" definido, =Taxa*2 no pt-BR é o nome, não a função TAXA/RATE).
   */
  readonly names?: readonly string[];
}

function nameSet(opts: TranslateOptions, d: Dialect): ReadonlySet<string> | undefined {
  return opts.names?.length ? new Set(opts.names.map((n) => d.d.fold(n))) : undefined;
}

/**
 * Canônico (ou forma do arquivo) → texto no idioma do usuário, como a barra
 * de fórmulas do Excel mostra. O "=" inicial, se houver, é mantido.
 */
export function toLocal(canonical: string, opts: TranslateOptions = {}): string {
  const src = dialect({ ...CANONICAL, r1c1: !!opts.r1c1 }, true);
  const tgt = dialect(resolveSyntax(opts), false);
  return render(scopeParams(rewriteOperators(tokenize(canonical, src, nameSet(opts, src))), false), tgt, { filePrefixes: false, inTable: opts.inTable });
}

/**
 * Texto no idioma do usuário → canônico. Como o Excel: nomes de função só no
 * idioma (o nome em inglês num Excel localizado é função desconhecida, #NAME?),
 * maiúsculas/minúsculas indiferentes, `_xlfn.` + nome local aceito.
 * `filePrefixes` grava a forma do OOXML (_xlfn., _xlfn._xlws., _xleta., _xlpm.,
 * _xlop., Tabela[[#This Row],…]); os operadores @, # e :. ficam na forma da tela.
 */
export function fromLocal(local: string, opts: TranslateOptions = {}): string {
  const src = dialect(resolveSyntax(opts), false);
  const tgt = dialect({ ...CANONICAL, r1c1: !!opts.r1c1 }, true);
  const toks = scopeParams(tokenize(local, src, nameSet(opts, src)), !!opts.filePrefixes);
  return render(toks, tgt, { filePrefixes: !!opts.filePrefixes, inTable: opts.inTable });
}

// ------------------------------------------------------------------ nomes avulsos

/** Nome da função no idioma (canônico com ou sem prefixo). */
export function localFunctionName(canonical: string, lang?: string | FormulaLanguage): string {
  const l = resolveLanguage(lang);
  const k = stripFilePrefix(canonical);
  return l.functions[k] ?? k;
}

/** Nome canônico de uma função digitada no idioma (undefined = desconhecida nesse idioma). */
export function canonicalFunctionName(local: string, lang?: string | FormulaLanguage): string | undefined {
  const d = langData(resolveLanguage(lang));
  return d.fnIn.get(d.fold(local));
}

/** Erro no idioma (#N/A → #N/D). */
export function localizeError(code: ErrorCode, lang?: string | FormulaLanguage): string {
  return resolveLanguage(lang).errors?.[code] ?? code;
}

/** Erro digitado no idioma → código canônico. */
export function canonicalError(text: string, lang?: string | FormulaLanguage): ErrorCode | undefined {
  const d = langData(resolveLanguage(lang));
  const f = d.fold(text.trim());
  return d.errIn.find(([name]) => name === f)?.[1];
}

/** VERDADEIRO/FALSO no idioma. */
export function localizeBool(b: boolean, lang?: string | FormulaLanguage): string {
  const l = resolveLanguage(lang);
  return (l.bools ?? EN_US_LANG.bools!)[b ? 0 : 1]!;
}

/** Função para o autocompletar: nome no idioma + canônico + aridade medida. */
export interface FunctionName {
  readonly name: string;
  readonly canonical: string;
  readonly minArgs: number;
  readonly maxArgs: number;
}

/** Funções de planilha no idioma, em ordem alfabética do idioma (autocompletar). */
export function functionNames(lang?: string | FormulaLanguage): FunctionName[] {
  const l = resolveLanguage(lang);
  const coll = new Intl.Collator(l.id);
  return catalog()
    .filter((e) => !e.operator)
    .map((e) => ({ name: l.functions[e.name] ?? e.name, canonical: e.name, minArgs: e.minArgs, maxArgs: e.maxArgs }))
    .sort((a, b) => coll.compare(a.name, b.name));
}
