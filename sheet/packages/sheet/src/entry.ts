/**
 * ENTRADA de célula como o Excel 365: o texto digitado (no idioma e na região
 * do usuário) vira constante tipada, fórmula ou é recusado. Regras medidas no
 * Excel pt-BR (lab calc/ui, entry*.json; FormulaLocal/Formula2Local):
 *
 * - "" apaga; célula com formato Texto (@) guarda tudo como texto, até "=…";
 * - "'…" = texto sem o apóstrofo (prefixo de texto); "=" sozinho é texto;
 * - "=…" = fórmula: nomes de função no idioma (sem diferenciar maiúsculas nem
 *   acentos), separadores da região; fórmula inválida é RECUSADA (o Excel não
 *   aceita a entrada) — exceto quando só falta o ")" de uma função que começa
 *   logo depois do "=" e vai até o fim ("=SOMA(1;2" → =SOMA(1;2); "=1+SOMA(1",
 *   "=(1+2", "=SOMA(ABS(1" recusadas); quantidade de argumentos fora do que a
 *   função aceita é recusada (=SOMA(), =SE(1), =AGORA(1)); "=1.5" no pt-BR
 *   (ponto não é decimal) é recusada;
 * - "+…"/"-…" que não são número viram fórmula se forem fórmula válida (como a
 *   digitação no Excel: "+A1" → =+A1, "-A1" → =-A1); senão texto ("-");
 *   (o FormulaLocal do COM guarda texto aqui; a digitação na grade não);
 * - VERDADEIRO/FALSO (sem espaços em volta, qualquer caixa) = booleano; os 8
 *   erros digitáveis no idioma (#NULO! #DIV/0! #VALOR! #REF! #NOME? #NÚM! #N/D
 *   #OBTENDO_DADOS, sem diferenciar caixa nem acento) = erro; os novos
 *   (#DESPEJAR!, #CALC!, #CAMPO!) e os em inglês no pt-BR ficam texto;
 * - números: espaços nas pontas, sinal, "(5)" negativo, milhar ("1.234"),
 *   decimal da região, expoente, "%" antes/depois, moeda "R$" antes (não
 *   depois), "€" antes ou depois (sem formato), fração mista "1 1/2"; 15
 *   algarismos significativos TRUNCADOS; "1.5", "1 234", "$10" no pt-BR = texto;
 * - datas/horas pelas regras do motor (parseDateTimeParts); "a/b" numa célula
 *   que não é Geral/data/hora é a FRAÇÃO a/b (0,5), não uma data.
 * O formato que a entrada aplica está em entry-format.ts.
 */
import {
  CalcError, acceptsArgCount, catalogEntry, fromLocal, functionKind, localizeError, localizeBool,
  numberLiteralValue, parseDateTimeParts, parseFormula, printFormula, walk, FormulaSyntaxError,
  type ErrorCode, type Node, type Scalar,
} from '@universal/sheet-calc';
import { FMT, currencyHint, type FmtCategory, type NumFmtHint } from './entry-format.js';
import type { FormulaLocale } from './formula-locale.js';

export interface EntryContext {
  readonly locale: FormulaLocale;
  /** Categoria do formato atual da célula. */
  readonly current: FmtCategory;
  /** Célula (0-based): as referências relativas da fórmula valem a partir dela. */
  readonly row: number;
  readonly col: number;
  readonly date1904?: boolean;
  /** Nomes definidos da pasta (ganham da função como valor ao traduzir). */
  readonly names?: readonly string[];
  /** Tabela em que a célula está ([@Col]). */
  readonly inTable?: string;
}

export type Entry =
  | { readonly kind: 'clear' }
  | { readonly kind: 'value'; readonly value: Scalar; readonly fmt?: NumFmtHint; readonly quotePrefix?: boolean }
  /** `text` = forma de arquivo (canônica, com prefixos, sem "="); `node` = árvore (relativa à célula). */
  | { readonly kind: 'formula'; readonly text: string; readonly node: Node }
  | { readonly kind: 'invalid'; readonly message: string };

const MSG = {
  'pt-BR': {
    syntax: 'Há um problema com esta fórmula.',
    few: 'Você inseriu poucos argumentos para esta função.',
    many: 'Você inseriu muitos argumentos para esta função.',
    reserved: 'Essa função não é válida.',
  },
  'en-US': {
    syntax: "There's a problem with this formula.",
    few: "You've entered too few arguments for this function.",
    many: "You've entered too many arguments for this function.",
    reserved: "That function isn't valid.",
  },
} as const;

/** Analisa o texto digitado numa célula. */
export function parseEntry(input: string, ctx: EntryContext): Entry {
  if (input === '') return { kind: 'clear' };
  if (ctx.current === 'text') return { kind: 'value', value: input };
  if (input[0] === "'") return { kind: 'value', value: input.slice(1), quotePrefix: true };
  if (input[0] === '=' && input.length > 1) return parseFormulaEntry(input, ctx);
  const c = parseConstant(input, ctx);
  if (c) return c;
  if ((input[0] === '+' || input[0] === '-') && input.length > 1) {
    const f = parseFormulaEntry('=' + input, ctx);
    if (f.kind === 'formula') return f;
  }
  return { kind: 'value', value: input };
}

// ------------------------------------------------------------------ constantes

const TYPABLE_ERRORS: readonly ErrorCode[] = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA'];
const bare = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

function parseConstant(input: string, ctx: EntryContext): Entry | undefined {
  const { lang, values } = ctx.locale;
  const up = input.toLocaleUpperCase(lang);
  if (up === localizeBool(true, lang).toLocaleUpperCase(lang)) return { kind: 'value', value: true };
  if (up === localizeBool(false, lang).toLocaleUpperCase(lang)) return { kind: 'value', value: false };
  if (input[0] === '#') {
    const b = bare(input);
    const code = TYPABLE_ERRORS.find((e) => bare(localizeError(e, lang)) === b);
    if (code) return { kind: 'value', value: CalcError.of(code) };
    return undefined;
  }
  const n = parseNumberEntry(input, ctx);
  if (n) return n;
  const s = trimSpaces(input);
  // "a/b" fora de célula Geral/data/hora: fração (medido: "1/2" em 0% → 0,5 "# ?/?")
  if (ctx.current !== 'general' && ctx.current !== 'date' && ctx.current !== 'time') {
    const fr = /^([+-]?)(\d+)\/(\d+)$/.exec(s);
    if (fr && +fr[3]! !== 0 && +fr[3]! <= 32767 && +fr[2]! <= 32767) {
      const v = +fr[2]! / +fr[3]!;
      return { kind: 'value', value: fr[1] === '-' ? -v : v, fmt: FMT.frac };
    }
  }
  const parts = parseDateTimeParts(s, values, !!ctx.date1904);
  if (parts) {
    const v = (parts.date ?? 0) + (parts.time ?? 0);
    return { kind: 'value', value: v, fmt: dateTimeFormat(s, parts, values.monthNames.concat(values.monthAbbr)) };
  }
  return undefined;
}

function trimSpaces(s: string): string {
  let a = 0, b = s.length;
  while (a < b && s.charCodeAt(a) === 32) a++;
  while (b > a && s.charCodeAt(b - 1) === 32) b--;
  return s.slice(a, b);
}

const esc = (c: string): string => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Número digitado (com %, moeda, milhar, expoente, fração mista) → valor + formato. */
function parseNumberEntry(input: string, ctx: EntryContext): Entry | undefined {
  const { values } = ctx.locale;
  let s = trimSpaces(input);
  if (!s) return undefined;
  let neg = false, signed = false, paren = false, pct = false, cur = false, euro = false;
  const sign = (): void => {
    if (s[0] === '+' || s[0] === '-') {
      if (signed || paren) { s = '\u0000'; return; }
      signed = true; neg = s[0] === '-'; s = trimSpaces(s.slice(1));
    }
  };
  const currency = (): void => {
    if (!cur && values.currency && s.startsWith(values.currency)) { cur = true; s = trimSpaces(s.slice(values.currency.length)); }
    else if (!euro && s[0] === '€') { euro = true; s = trimSpaces(s.slice(1)); }
  };
  const percentPrefix = (): void => { if (!pct && s[0] === '%') { pct = true; s = trimSpaces(s.slice(1)); } };
  sign(); currency(); sign(); percentPrefix();
  if (s[0] === '(' && s.endsWith(')') && !signed) {
    paren = true; neg = true; s = trimSpaces(s.slice(1, -1));
    currency(); percentPrefix();
  }
  if (s.endsWith('%') && !pct) { pct = true; s = trimSpaces(s.slice(0, -1)); }
  if (s.endsWith('€') && !euro && !cur) { euro = true; s = trimSpaces(s.slice(0, -1)); }
  if (!s || s.includes('\u0000') || (pct && (cur || euro))) return undefined;
  // fração mista "1 1/2" (numerador/denominador até 32767, como o motor)
  const mixed = /^(\d+) +(\d+)\/(\d+)$/.exec(s);
  if (mixed && !pct && !cur && !euro) {
    const den = +mixed[3]!;
    if (den === 0 || den > 32767 || +mixed[2]! > 32767) return undefined;
    const v = +mixed[1]! + +mixed[2]! / den;
    return { kind: 'value', value: neg ? -v : v, fmt: FMT.frac };
  }
  const G = esc(values.group), D = esc(values.decimal);
  const m = new RegExp(`^(\\d+(?:${G}\\d{3,})*)?(?:(${D})(\\d*))?(?:[eE]([+-]?\\d+))?$`).exec(s);
  if (!m || (!m[1] && !m[3])) return undefined;
  const grouped = !!m[1] && m[1].includes(values.group);
  const hasDec = m[2] !== undefined;
  const raw = `${(m[1] ?? '').split(values.group).join('') || '0'}${m[3] ? '.' + m[3] : ''}${m[4] !== undefined ? 'e' + m[4] : ''}`;
  const lit = numberLiteralValue(raw);
  if (!lit) return undefined;
  let v = lit.v;
  if (pct) v /= 100;
  if (neg) v = -v;
  let fmt: NumFmtHint | undefined;
  if (pct) fmt = hasDec ? FMT.pct2 : FMT.pct;
  else if (cur) fmt = currencyHint(values.currency, hasDec);
  else if (m[4] !== undefined) fmt = FMT.sci;
  else if (grouped) fmt = hasDec ? FMT.thousands2 : FMT.thousands;
  return fmt ? { kind: 'value', value: v, fmt } : { kind: 'value', value: v };
}

/** Formato da data/hora digitada pela forma do texto (ver entry-format.ts). */
function dateTimeFormat(s: string, parts: { date?: number; time?: number }, monthWords: readonly string[]): NumFmtHint {
  const timeWords = s.replace(/ *: */g, ':').split(/ +/).filter((w) => w.includes(':') || /^(AM|PM|A|P)$/i.test(w));
  if (parts.date !== undefined && parts.time !== undefined) return FMT.dateTime;
  if (parts.date === undefined) {
    const t = timeWords.find((w) => w.includes(':')) ?? '';
    if (/\b(AM|PM|A|P)$/i.test(s.trim()) || timeWords.some((w) => /^(AM|PM|A|P)$/i.test(w))) return FMT.hmAmPm;
    const segs = t.split(':');
    if (/[^\d:]/.test(t)) return FMT.msTenth; // m:s,f
    if (+segs[0]! >= 24) return FMT.elapsed;
    return segs.length >= 3 ? FMT.hms : FMT.hm;
  }
  // só data: com nome do mês ou numérica
  const words = s.toLowerCase().split(/[\s/,-]+/).filter(Boolean);
  const named = words.some((w) => monthWords.some((mw) => mw.toLowerCase() === w));
  if (named) {
    if (words.length >= 3) return FMT.dMmmYy;
    return /^\d/.test(words[0] ?? '') ? FMT.dMmm : FMT.mmmYy;
  }
  if (words.length >= 3) return FMT.date;
  // dia/mês do ano corrente → d-mmm; mês/ano → mmm-yy
  return (words[1]?.length ?? 0) >= 3 ? FMT.mmmYy : (+words[1]! >= 1 && +words[1]! <= 12 && +words[0]! <= 31 ? FMT.dMmm : FMT.mmmYy);
}

// ------------------------------------------------------------------ fórmulas

/** Fórmula digitada → forma canônica de arquivo + árvore, ou recusa. */
function parseFormulaEntry(input: string, ctx: EntryContext): Entry {
  const msg = MSG[ctx.locale.lang];
  if (badDecimal(input, ctx.locale.decimal)) return { kind: 'invalid', message: msg.syntax };
  const opts = { ...ctx.locale.syntax, filePrefixes: true, ...(ctx.names ? { names: ctx.names } : {}), ...(ctx.inTable ? { inTable: ctx.inTable } : {}) };
  let canon = fromLocal(input, opts);
  let node = tryParse(canon, ctx);
  if (!node) {
    const closed = autoClose(input);
    if (closed) { canon = fromLocal(closed, opts); node = tryParse(canon, ctx); }
  }
  if (!node) return { kind: 'invalid', message: msg.syntax };
  let bad: string | undefined;
  walk(node, (n) => {
    // união (";" entre parênteses) só de referências: =SOMA((1;2)) e =SOMA((A1;2)) recusadas (medido)
    if (n.t === 'bin' && n.op === ',' && (isConstant(n.a) || isConstant(n.b))) { bad ??= msg.syntax; return; }
    if (bad || n.t !== 'fn' || (n.prefix && /_xludf\./i.test(n.prefix))) return;
    // operadores @, # e :. viram SINGLE/ANCHORARRAY/_TRO_* (internas: não se digitam pelo nome)
    if (OPERATOR_FNS.has(n.name)) return;
    if (functionKind(n.name) === 'reserved') { bad = msg.reserved; return; }
    const e = catalogEntry(n.name);
    if (e && !acceptsArgCount(e, n.args.length)) bad = n.args.length < e.minArgs ? msg.few : msg.many;
  });
  if (bad) return { kind: 'invalid', message: bad };
  let text = canon.replace(/^=/, '');
  // @ e # (forma de tela) → _xlfn.SINGLE/_xlfn.ANCHORARRAY: o arquivo só aceita a forma de função
  if (hasScreenOperator(text)) text = printFormula(node, { row: ctx.row, col: ctx.col });
  return { kind: 'formula', text, node };
}

const OPERATOR_FNS = new Set(['SINGLE', 'ANCHORARRAY', '_TRO_TRAILING', '_TRO_LEADING', '_TRO_ALL']);

/** Operando constante (número, texto, booleano, erro, matriz), mesmo entre parênteses. */
function isConstant(n: Node): boolean {
  while (n.t === 'paren') n = n.e;
  return n.t === 'num' || n.t === 'str' || n.t === 'bool' || n.t === 'err' || n.t === 'arr';
}

function tryParse(canon: string, ctx: EntryContext): Node | undefined {
  try {
    return parseFormula(canon, { row: ctx.row, col: ctx.col });
  } catch (e) {
    if (e instanceof FormulaSyntaxError) return undefined;
    // erro inesperado do analisador: trata como fórmula inválida (nunca derruba a edição)
    return undefined;
  }
}

/** Fora de textos e nomes entre aspas, um número com "." quando o decimal da região é outro. */
function badDecimal(text: string, decimal: string): boolean {
  if (decimal === '.') return false;
  const ID = /[\p{L}\p{N}_.\\$]/u;
  for (let i = 1; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"' || ch === "'") {
      const q = ch;
      for (i++; i < text.length; i++) if (text[i] === q) { if (text[i + 1] === q) i++; else break; }
      continue;
    }
    if (ch === '[') { const j = text.indexOf(']', i); if (j > 0) i = j; continue; }
    if (ch >= '0' && ch <= '9' && !ID.test(text[i - 1] ?? '')) {
      let j = i;
      while (j < text.length && text[j]! >= '0' && text[j]! <= '9') j++;
      if (text[j] === '.' && /[0-9]/.test(text[j + 1] ?? '')) return true;
      i = j - 1;
    }
  }
  return false;
}

/**
 * Autocompleta o ")" final como o Excel (medido): só quando a fórmula é UMA
 * chamada de função logo após o "=" cujo parêntese é o único aberto no fim.
 */
export function autoClose(local: string): string | undefined {
  const m = /^=\s*[\p{L}_\\][\p{L}\p{N}_.\\]*\(/u.exec(local);
  if (!m) return undefined;
  let depth = 0;
  for (let i = m[0].length - 1; i < local.length; i++) {
    const ch = local[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      let closed = false;
      for (i++; i < local.length; i++) if (local[i] === q) { if (local[i + 1] === q) i++; else { closed = true; break; } }
      if (!closed) return undefined;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return undefined;
  }
  return depth === 1 ? local + ')' : undefined;
}

function hasScreenOperator(text: string): boolean {
  let q = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) { if (ch === q) { if (text[i + 1] === q) i++; else q = ''; } continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '[') { const j = text.indexOf(']', i); if (j > 0) { i = j; continue; } }
    if (ch === '@' || ch === '#') {
      // "#" de erro (#REF!, #N/A…) não é o operador de derramamento
      if (ch === '#' && /^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA|SPILL!|CALC!|FIELD!|BLOCKED!|CONNECT!|UNKNOWN!|BUSY!|PYTHON!)/i.test(text.slice(i))) continue;
      return true;
    }
  }
  return false;
}

