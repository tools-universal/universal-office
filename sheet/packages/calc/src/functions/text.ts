/**
 * Texto (CONCATENATE, CONCAT, TEXTJOIN, LEFT/RIGHT/MID(B), LEN(B), FIND/SEARCH(B), SUBSTITUTE, REPLACE(B), TEXT, VALUE, NUMBERVALUE, FIXED, DOLLAR, USDOLLAR, TRIM, CLEAN, PROPER, UPPER/LOWER, REPT, CHAR/CODE/UNICHAR/UNICODE, EXACT, TEXTBEFORE/AFTER, TEXTSPLIT, VALUETOTEXT, ARRAYTOTEXT, ASC/DBCS, BAHTTEXT, PHONETIC, ENCODEURL, WEBSERVICE, TRANSLATE, DETECTLANGUAGE).
 * Dono: agente FN-TEXT-DATE-LOOKUP. (T está em info.ts; REGEX* em regex.ts; TEXT em text-format.ts.)
 *
 * Regras medidas no Excel 365 pt-BR (text.cases.json; lab calc/tdl):
 * - posições contam CARACTERES (pontos de código): LEN("😀") = 1, LEFT("😀";1) = "😀";
 * - LENB/LEFTB… = LEN/LEFT… num idioma sem DBCS (pt-BR: LENB("中a") = 2);
 * - UPPER/LOWER sem expansão: UPPER("straße") = "STRAßE", UPPER("ﬁ") = "ﬁ",
 *   LOWER("İ") = "i", sigma final ("ΣΑΣ" → "σας"); PROPER põe maiúscula na letra
 *   depois de qualquer não letra ("O'Neil", "2Nd", "X_Y");
 * - TRIM só mexe no espaço ASCII; CLEAN tira 0–31 e 129, 141, 143, 144, 157 (não 127);
 * - CHAR/CODE na página 1252 (CHAR(128) = "€", CODE("中") = 63); UNICHAR de
 *   substituto/não-caractere (U+FFFE, U+FFFF, U+10FFFF) → #N/A; 0 ou > U+10FFFF → #VALUE!;
 * - FIXED arredonda e perde o sinal do zero ("0,00"); DOLLAR mantém ("-R$ 0,00");
 *   casas > 127 → #VALUE!; texto com mais de 255 caracteres → #VALUE!;
 * - ENCODEURL: UTF-8, só A–Z a–z 0–9 - _ . ficam ("~" vira %7E);
 * - VALUETOTEXT/ARRAYTOTEXT escrevem erros e booleanos no idioma ("#N/D",
 *   "VERDADEIRO"); ARRAYTOTEXT usa o separador de lista ("1; 2") e as chaves do
 *   idioma ("{1\2;3\4}");
 * - ASC/DBCS não mudam nada num idioma sem DBCS; PHONETIC sem leitura → #N/A;
 * - WEBSERVICE sem rede → #VALUE!; TRANSLATE/DETECTLANGUAGE (serviço online) → #CONNECT!.
 */
import { register, type FnContext, type ValueLocale } from '../fn.js';
import { getLanguage } from '../i18n/languages.js';
import { numberToText, parseNumberText, toBool } from '../coerce.js';
import { ArrayValue, CalcError, ERR, RefValue, type Scalar, type Value } from '../values.js';
import { checkLen, fixedDigits, formatForText, translateFormatCode } from './text-format.js';
import { asArray, existingScalars, num, scalarsOf, SPARSE_CELLS, txt } from './tdl-util.js';
import './regex.js';
import './filterxml.js';
import './regional.js';

// ───────────────────────────── caracteres ─────────────────────────────

const SURR = /[\uD800-\uDFFF]/;

/** Caracteres (pontos de código) de um texto. */
function chars(s: string): string[] | undefined {
  return SURR.test(s) ? Array.from(s) : undefined;
}
function cpLen(s: string): number {
  const c = chars(s);
  return c ? c.length : s.length;
}
function cpSlice(s: string, start: number, end?: number): string {
  const c = chars(s);
  return c ? c.slice(start, end).join('') : s.slice(start, end);
}
/** Índice em pontos de código → índice em unidades UTF-16. */
function unitIndex(s: string, cp: number): number {
  const c = chars(s);
  if (!c) return cp;
  let u = 0;
  for (let i = 0; i < cp && i < c.length; i++) u += c[i]!.length;
  return u;
}
/** Índice em unidades UTF-16 → pontos de código. */
function cpIndex(s: string, unit: number): number {
  return SURR.test(s) ? Array.from(s.slice(0, unit)).length : unit;
}

/** Idioma com DBCS (as funções …B contam bytes). */
function isDbcs(locale: ValueLocale): boolean {
  return /^(ja|zh|ko)\b/i.test(locale.id);
}
/** Bytes de um caractere na página DBCS (aproximação: ASCII e katakana de meia largura = 1). */
function charBytes(ch: string): number {
  const c = ch.codePointAt(0)!;
  return c < 0x80 || (c >= 0xff61 && c <= 0xff9f) ? 1 : 2;
}
/** Converte posição/contagem em bytes para caracteres (início em bytes, 0-based). */
function byteRange(s: string, startByte: number, nBytes: number): [number, number] {
  const c = Array.from(s);
  let b = 0, i = 0;
  while (i < c.length && b + charBytes(c[i]!) <= startByte) { b += charBytes(c[i]!); i++; }
  const from = i;
  let taken = 0;
  while (i < c.length && taken + charBytes(c[i]!) <= nBytes) { taken += charBytes(c[i]!); i++; }
  return [from, i];
}

// ───────────────────────────── página 1252 ─────────────────────────────

const CP1252_HI = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
function cp1252Char(n: number): string {
  return n >= 128 && n < 160 ? CP1252_HI[n - 128]! : String.fromCharCode(n);
}
function cp1252Code(ch: string): number {
  const c = ch.codePointAt(0)!;
  if (c < 128 || (c >= 160 && c < 256)) return c;
  const i = CP1252_HI.indexOf(ch);
  return i >= 0 ? 128 + i : 63;
}

// ───────────────────────────── caixa ─────────────────────────────

function upper(s: string): string {
  let out = '';
  for (const ch of s) {
    const u = ch.toUpperCase();
    out += [...u].length === 1 ? u : ch;
  }
  return out;
}
function lower(s: string): string {
  return s.replace(/İ/g, 'I').toLowerCase();
}
/** PROPER: tudo minúsculo (sigma final, "İ" → "i") e maiúscula na letra depois de não letra. */
function proper(s: string): string {
  let out = '', prevLetter = false;
  for (const ch of lower(s)) {
    const isLetter = /\p{L}/u.test(ch);
    out += isLetter && !prevLetter ? upper(ch) : ch;
    prevLetter = isLetter;
  }
  return out;
}

/**
 * Curinga do SEARCH (medido): "*" e "?" como no COUNTIF, mas "~" torna literal
 * QUALQUER caractere seguinte ("~a" = "a") e um "~" no fim some.
 */
function searchRegExp(pattern: string): RegExp {
  let src = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === '~') {
      if (i + 1 < pattern.length) src += pattern[++i]!.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      continue;
    }
    if (ch === '*') src += '[\\s\\S]*';
    else if (ch === '?') src += '[\\s\\S]';
    else src += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(src, 'i');
}

// ───────────────────────────── idioma ─────────────────────────────

/** Nome do erro no idioma (VALUETOTEXT/ARRAYTOTEXT: "#N/D" no pt-BR) — tabela da camada i18n. */
export function errorText(e: CalcError, locale: ValueLocale): string {
  return getLanguage(locale.id)?.errors?.[e.code] ?? e.code;
}
/** Separador de lista da região (ARRAYTOTEXT conciso: "1; 2" no pt-BR). */
function listSep(locale: ValueLocale): string {
  return getLanguage(locale.id)?.regional?.list ?? (locale.decimal === ',' ? ';' : ',');
}
/** Separadores de coluna/linha das constantes matriciais no idioma (contrabarra e ponto e vírgula no pt-BR). */
function arraySeps(locale: ValueLocale): [string, string] {
  const arr = getLanguage(locale.id)?.array;
  const col = arr?.col ?? ',', row = arr?.row ?? ';';
  return [col === locale.decimal && arr?.alt ? arr.alt : col, row];
}

/** Escalar → texto do VALUETOTEXT/ARRAYTOTEXT (strict: texto entre aspas). */
function valueText(v: Scalar, strict: boolean, locale: ValueLocale): string {
  if (v === null) return '';
  if (v instanceof CalcError) return errorText(v, locale);
  if (typeof v === 'string') return strict ? `"${v.replace(/"/g, '""')}"` : v;
  if (typeof v === 'boolean') return v ? locale.trueText : locale.falseText;
  return numberToText(v, locale);
}

// ───────────────────────────── busca ─────────────────────────────

/** Índice (unidades) da n-ésima ocorrência (n > 0 do início, n < 0 do fim; sem sobreposição). */
function nthIndex(text: string, delims: string[], n: number, ci: boolean): { at: number; len: number } | undefined {
  const hay = ci ? lower(text) : text;
  const ds = delims.map((d) => (ci ? lower(d) : d));
  const hits: { at: number; len: number }[] = [];
  if (n > 0) {
    let pos = 0;
    while (pos <= hay.length) {
      let best: { at: number; len: number } | undefined;
      for (const d of ds) {
        const i = hay.indexOf(d, pos);
        if (i >= 0 && (!best || i < best.at || (i === best.at && d.length > best.len))) best = { at: i, len: d.length };
      }
      if (!best) break;
      hits.push(best);
      if (hits.length === n) return best;
      pos = best.at + Math.max(best.len, 1);
      if (best.len === 0 && pos > hay.length) break;
    }
    return undefined;
  }
  let end = hay.length;
  while (end >= 0) {
    let best: { at: number; len: number } | undefined;
    for (const d of ds) {
      const i = hay.lastIndexOf(d, end - d.length);
      if (i >= 0 && i + d.length <= end && (!best || i > best.at)) best = { at: i, len: d.length };
    }
    if (!best) break;
    hits.push(best);
    if (hits.length === -n) return best;
    end = best.at - (best.len === 0 ? 1 : 0);
    if (best.len === 0 && end < 0) break;
  }
  return undefined;
}

/** Delimitadores de TEXTBEFORE/AFTER/SPLIT (texto ou matriz de textos). */
function delimList(v: Value, ctx: FnContext): string[] | CalcError {
  const xs = scalarsOf(v, ctx);
  if (xs instanceof CalcError) return xs;
  const out: string[] = [];
  for (const x of xs) {
    const t = txt(x, ctx);
    if (t instanceof CalcError) return t;
    out.push(t);
  }
  return out;
}

/** Argumento inteiro opcional (omitido/vazio = padrão). */
function optInt(v: Scalar | undefined, def: number, ctx: FnContext): number | CalcError {
  if (v === undefined || v === null) return def;
  const n = num(v, ctx);
  return n instanceof CalcError ? n : Math.trunc(n);
}

/** Argumento booleano opcional. */
function optBool(v: Scalar | undefined, def: boolean, ctx: FnContext): boolean | CalcError {
  if (v === undefined || v === null) return def;
  return toBool(v, ctx.locale); // texto-número ("1") → #VALUE! (medido no TEXTJOIN)
}

function textBeforeAfter(after: boolean, args: readonly Value[], ctx: FnContext): Value {
  const [tv, dv, nv, mv, ev, nf] = args as [Scalar, Value, Scalar?, Scalar?, Scalar?, Value?];
  if (tv instanceof CalcError) return tv;
  const text = txt(tv, ctx);
  if (text instanceof CalcError) return text;
  const ds = delimList(dv, ctx);
  if (ds instanceof CalcError) return ds;
  const n = optInt(nv, 1, ctx);
  if (n instanceof CalcError) return n;
  const mode = optInt(mv, 0, ctx);
  if (mode instanceof CalcError) return mode;
  const end = optInt(ev, 0, ctx);
  if (end instanceof CalcError) return end;
  if (n === 0 || (mode !== 0 && mode !== 1) || (end !== 0 && end !== 1)) return ERR.VALUE;
  if (text === '') return end === 1 ? ERR.VALUE : notFound(nf, ctx);
  // delimitador vazio casa sempre no começo (n > 0) ou no fim (n < 0)
  if (ds.some((d) => d === '')) return n > 0 === after ? text : '';
  // instância além do que cabe no texto → #VALUE! (medido: "abcd","bc",4; "ab","ab",2)
  if (Math.abs(n) > text.length - Math.min(...ds.map((d) => d.length)) + 1) return ERR.VALUE;
  let hit = nthIndex(text, ds, n, mode === 1);
  if (!hit && end === 1) {
    // o fim (ou o começo, contando de trás) do texto vale como delimitador
    const count = countHits(text, ds, mode === 1);
    if (n > 0 && n === count + 1) hit = { at: text.length, len: 0 };
    else if (n < 0 && -n === count + 1) hit = { at: 0, len: 0 };
  }
  if (!hit) return notFound(nf, ctx);
  return after ? text.slice(hit.at + hit.len) : text.slice(0, hit.at);
}

/** if_not_found: vira texto (TRUE → "VERDADEIRO", 1,5 → "1,5", vazio → ""); erro passa. */
function notFound(nf: Value | undefined, ctx: FnContext): Value {
  if (nf === undefined) return ERR.NA;
  let v: Value = nf;
  if (v instanceof RefValue) { const a = v.areas[0]!; v = ctx.cell(a.sheet, a.r1, a.c1); }
  if (v instanceof ArrayValue) v = v.get(0, 0);
  if (v instanceof CalcError || typeof v === 'string') return v;
  return txt(v as Scalar, ctx);
}

function countHits(text: string, ds: string[], ci: boolean): number {
  let k = 0;
  while (nthIndex(text, ds, k + 1, ci)) k++;
  return k;
}

// ───────────────────────────── BAHTTEXT ─────────────────────────────

const TH_DIGIT = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_UNIT = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** Inteiro < 1 000 000 em tailandês ("เอ็ด" para o 1 final depois de dezena, "ยี่สิบ"). */
function thaiBelowMillion(n: number, hasHigher: boolean): string {
  const ds = String(n).split('').map(Number);
  let out = '';
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i]!, pos = ds.length - 1 - i;
    if (d === 0) continue;
    if (pos === 1) out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : TH_DIGIT[d] + 'สิบ';
    else if (pos === 0) out += d === 1 && (ds.length > 1 || hasHigher) ? 'เอ็ด' : TH_DIGIT[d];
    else out += TH_DIGIT[d]! + TH_UNIT[pos]!;
  }
  return out;
}

function thaiNumber(n: number): string {
  if (n === 0) return '';
  const groups: number[] = [];
  let x = n;
  while (x > 0) { groups.unshift(x % 1000000); x = Math.floor(x / 1000000); }
  let out = '';
  groups.forEach((g, i) => {
    out += thaiBelowMillion(g, i > 0);
    if (i < groups.length - 1) out += 'ล้าน';
  });
  return out;
}

function bahtText(x: number): string {
  const neg = x < 0;
  const [ip, fp] = fixedDigits(Math.abs(x), 2, { decimal: '.', group: '' } as ValueLocale, false)[1].split('.') as [string, string];
  const baht = Number(ip), satang = Number(fp);
  let out = '';
  if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน';
  if (baht > 0) out += thaiNumber(baht) + 'บาท';
  out += satang > 0 ? thaiBelowMillion(satang, false) + 'สตางค์' : 'ถ้วน';
  return (neg ? 'ลบ' : '') + out;
}

// ───────────────────────────── largura (ASC/DBCS) ─────────────────────────────

function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
}
function toFullWidth(s: string): string {
  return s.replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/ /g, '　');
}

// ───────────────────────────── registro ─────────────────────────────

const lift = { args: 'value' as const, lift: true };

/** Corpo comum de LEFT/RIGHT (n em caracteres ou bytes). */
/**
 * Unidade de posição: caracteres (pontos de código) nas funções normais; nas
 * …B, bytes num idioma DBCS e unidades UTF-16 nos demais (medido no pt-BR:
 * LENB("é😀z") = 4, MIDB("é😀z";1;2) = "é" + meio emoji).
 */
type Unit = 'cp' | 'u16' | 'byte';
function unitOf(bytes: boolean, ctx: FnContext): Unit {
  return !bytes ? 'cp' : isDbcs(ctx.locale) ? 'byte' : 'u16';
}
function lenIn(s: string, u: Unit): number {
  return u === 'cp' ? cpLen(s) : u === 'u16' ? s.length : Array.from(s).reduce((b, c) => b + charBytes(c), 0);
}
/** Fatia [start, start+n) na unidade (0-based). */
function sliceIn(s: string, u: Unit, start: number, n: number): string {
  if (u === 'u16') return s.slice(start, start + n);
  if (u === 'cp') return cpSlice(s, start, start + n);
  const [f, e] = byteRange(s, start, n);
  return Array.from(s).slice(f, e).join('');
}

function leftRight(right: boolean, bytes: boolean, args: readonly Scalar[], ctx: FnContext): Scalar {
  const s = txt(args[0]!, ctx);
  if (s instanceof CalcError) return s;
  let n = 1;
  if (args.length > 1) {
    const k = num(args[1]!, ctx);
    if (k instanceof CalcError) return k;
    n = Math.trunc(k);
  }
  if (n < 0) return ERR.VALUE;
  // LEFTB/RIGHTB num idioma sem DBCS contam caracteres (medido: LEFTB("é😀z";2) = "é😀"),
  // ao contrário de MIDB/LENB/FINDB/REPLACEB (unidades UTF-16)
  const u0 = unitOf(bytes, ctx);
  const u: Unit = u0 === 'u16' ? 'cp' : u0;
  if (u === 'byte' && right) {
    const c = Array.from(s);
    let b = 0, i = c.length;
    while (i > 0 && b + charBytes(c[i - 1]!) <= n) { b += charBytes(c[i - 1]!); i--; }
    return c.slice(i).join('');
  }
  const len = lenIn(s, u);
  return right ? sliceIn(s, u, Math.max(0, len - n), n) : sliceIn(s, u, 0, n);
}

function mid(bytes: boolean, [tv, sv, nv]: readonly Scalar[], ctx: FnContext): Scalar {
  const s = txt(tv!, ctx);
  if (s instanceof CalcError) return s;
  const a = num(sv!, ctx);
  if (a instanceof CalcError) return a;
  const b = num(nv!, ctx);
  if (b instanceof CalcError) return b;
  const start = Math.trunc(a), n = Math.trunc(b);
  if (start < 1 || n < 0) return ERR.VALUE;
  return sliceIn(s, unitOf(bytes, ctx), start - 1, n);
}

/**
 * FIND (diferencia maiúsculas, sem curinga) e SEARCH (curingas, sem
 * diferenciar). Medido: FIND aceita início até LEN+1 (FIND("";"abc";4) = 4);
 * SEARCH só até LEN (SEARCH("";"abc";4) e SEARCH("";"";1) → #VALUE!).
 */
function find(ci: boolean, bytes: boolean, args: readonly Scalar[], ctx: FnContext): Scalar {
  const f = txt(args[0]!, ctx);
  if (f instanceof CalcError) return f;
  const s = txt(args[1]!, ctx);
  if (s instanceof CalcError) return s;
  let start = 1;
  if (args.length > 2) {
    const k = num(args[2]!, ctx);
    if (k instanceof CalcError) return k;
    start = Math.trunc(k);
  }
  const u = unitOf(bytes, ctx);
  const len = lenIn(s, u);
  if (start < 1 || start > len + (ci ? 0 : 1)) return ERR.VALUE;
  if (f === '') return start;
  // início em unidades UTF-16
  const from = u === 'u16' ? start - 1 : u === 'cp' ? unitIndex(s, start - 1) : sliceIn(s, 'byte', 0, start - 1).length;
  let at: number;
  if (ci) {
    const m = searchRegExp(f).exec(s.slice(from));
    at = m ? from + m.index : -1;
  } else at = s.indexOf(f, from);
  if (at < 0) return ERR.VALUE;
  if (u === 'u16') return at + 1;
  if (u === 'cp') return cpIndex(s, at) + 1;
  return lenIn(s.slice(0, at), 'byte') + 1;
}

function replace(bytes: boolean, [tv, sv, nv, rv]: readonly Scalar[], ctx: FnContext): Scalar {
  const s = txt(tv!, ctx);
  if (s instanceof CalcError) return s;
  const a = num(sv!, ctx);
  if (a instanceof CalcError) return a;
  const b = num(nv!, ctx);
  if (b instanceof CalcError) return b;
  const r = txt(rv!, ctx);
  if (r instanceof CalcError) return r;
  const start = Math.trunc(a), n = Math.trunc(b);
  if (start < 1 || n < 0) return ERR.VALUE;
  const u = unitOf(bytes, ctx);
  const len = lenIn(s, u);
  return checkLen(sliceIn(s, u, 0, start - 1) + r + sliceIn(s, u, start - 1 + n, Math.max(0, len - (start - 1 + n))));
}

register(
  {
    name: 'CONCATENATE', minArgs: 1, maxArgs: 255, ...lift,
    call: (args, ctx) => {
      let out = '';
      for (const a of args) { const t = txt(a, ctx); if (t instanceof CalcError) return t; out += t; }
      return checkLen(out);
    },
  },
  {
    name: 'CONCAT', prefix: '_xlfn.', minArgs: 1, maxArgs: 254, args: 'any',
    call: (args, ctx) => {
      let out = '';
      for (const a of args) {
        // vazio não acrescenta nada: lê só as células existentes (CONCAT(A:A))
        const e = existingScalars(a, ctx);
        if (e instanceof CalcError) return e;
        for (const x of e.xs) { const t = txt(x, ctx); if (t instanceof CalcError) return t; out += t; }
        if (out.length > 32767) return ERR.VALUE;
      }
      return out;
    },
  },
  {
    name: 'TEXTJOIN', prefix: '_xlfn.', minArgs: 3, maxArgs: 254, args: (i) => (i === 1 ? 'value' : 'any'),
    call: (args, ctx) => {
      const ds = delimList(args[0], ctx);
      if (ds instanceof CalcError) return ds;
      const ig = optBool(args[1], true, ctx);
      if (ig instanceof CalcError) return ig;
      const items: string[] = [];
      const minDelim = ds.length ? Math.min(...ds.map((d) => d.length)) : 0;
      for (let i = 2; i < args.length; i++) {
        const a = args[i];
        if (a instanceof RefValue && a.areas.some((r) => (r.r2 - r.r1 + 1) * (r.c2 - r.c1 + 1) > SPARSE_CELLS)) {
          // coluna inteira: os vazios só contam como itens se não forem ignorados
          const e = existingScalars(a, ctx);
          if (e instanceof CalcError) return e;
          for (const x of e.xs) if (x instanceof CalcError) return x;
          if (!ig && minDelim > 0 && e.total > 32767) return ERR.VALUE; // delimitadores já estouram o limite
          for (const x of e.xs) { const t = txt(x, ctx); if (t instanceof CalcError) return t; if (!(ig && t === '')) items.push(t); }
          continue;
        }
        const xs = scalarsOf(a, ctx);
        if (xs instanceof CalcError) return xs;
        for (const x of xs) {
          const t = txt(x, ctx);
          if (t instanceof CalcError) return t;
          if (ig && t === '') continue;
          items.push(t);
        }
      }
      let out = '';
      items.forEach((t, i) => { out += (i ? ds.length ? ds[(i - 1) % ds.length] : '' : '') + t; });
      return checkLen(out);
    },
  },
  { name: 'LEFT', minArgs: 1, maxArgs: 2, ...lift, call: (a, ctx) => leftRight(false, false, a, ctx) },
  { name: 'LEFTB', minArgs: 1, maxArgs: 2, ...lift, call: (a, ctx) => leftRight(false, true, a, ctx) },
  { name: 'RIGHT', minArgs: 1, maxArgs: 2, ...lift, call: (a, ctx) => leftRight(true, false, a, ctx) },
  { name: 'RIGHTB', minArgs: 1, maxArgs: 2, ...lift, call: (a, ctx) => leftRight(true, true, a, ctx) },
  { name: 'MID', minArgs: 3, maxArgs: 3, ...lift, call: (a, ctx) => mid(false, a, ctx) },
  { name: 'MIDB', minArgs: 3, maxArgs: 3, ...lift, call: (a, ctx) => mid(true, a, ctx) },
  {
    name: 'LEN', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : cpLen(s); },
  },
  {
    name: 'LENB', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const s = txt(v, ctx);
      if (s instanceof CalcError) return s;
      return lenIn(s, unitOf(true, ctx));
    },
  },
  { name: 'FIND', minArgs: 2, maxArgs: 3, ...lift, call: (a, ctx) => find(false, false, a, ctx) },
  { name: 'FINDB', minArgs: 2, maxArgs: 3, ...lift, call: (a, ctx) => find(false, true, a, ctx) },
  { name: 'SEARCH', minArgs: 2, maxArgs: 3, ...lift, call: (a, ctx) => find(true, false, a, ctx) },
  { name: 'SEARCHB', minArgs: 2, maxArgs: 3, ...lift, call: (a, ctx) => find(true, true, a, ctx) },
  { name: 'REPLACE', minArgs: 4, maxArgs: 4, ...lift, call: (a, ctx) => replace(false, a, ctx) },
  { name: 'REPLACEB', minArgs: 4, maxArgs: 4, ...lift, call: (a, ctx) => replace(true, a, ctx) },
  {
    name: 'SUBSTITUTE', minArgs: 3, maxArgs: 4, ...lift,
    call: (args, ctx) => {
      const s = txt(args[0]!, ctx);
      if (s instanceof CalcError) return s;
      const o = txt(args[1]!, ctx);
      if (o instanceof CalcError) return o;
      const r = txt(args[2]!, ctx);
      if (r instanceof CalcError) return r;
      if (args.length > 3) {
        const k = num(args[3]!, ctx);
        if (k instanceof CalcError) return k;
        const n = Math.trunc(k);
        if (n < 1) return ERR.VALUE;
        if (o === '') return s;
        let pos = -1, from = 0;
        for (let i = 0; i < n; i++) {
          pos = s.indexOf(o, from);
          if (pos < 0) return s;
          from = pos + 1; // ocorrências contadas com sobreposição (medido: "aaaa","aa","b",2 → "aba")
        }
        return checkLen(s.slice(0, pos) + r + s.slice(pos + o.length));
      }
      if (o === '') return s;
      return checkLen(s.split(o).join(r));
    },
  },
  {
    name: 'TEXT', minArgs: 2, maxArgs: 2, ...lift,
    call: ([v, f], ctx) => {
      const code = txt(f, ctx);
      if (code instanceof CalcError) return code;
      let value: number | string;
      if (typeof v === 'boolean') value = v ? ctx.locale.trueText : ctx.locale.falseText; // formatado como texto
      else if (v === null) value = 0;
      else if (typeof v === 'string') value = parseNumberText(v, ctx.locale, ctx.date1904) ?? v;
      else value = v as number;
      if (code === '') return typeof value === 'number' && value < 0 ? '-' : '';
      const canon = translateFormatCode(code, ctx.locale);
      if (canon === undefined) return ERR.VALUE;
      const out = formatForText(value, canon, ctx.locale, ctx.date1904);
      return out === undefined ? ERR.VALUE : checkLen(out);
    },
  },
  {
    name: 'VALUE', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      if (typeof v === 'number') return v;
      if (v === null) return 0;
      if (typeof v === 'boolean') return ERR.VALUE;
      const n = parseNumberText(v as string, ctx.locale, ctx.date1904);
      return n === undefined ? ERR.VALUE : n;
    },
  },
  {
    name: 'NUMBERVALUE', prefix: '_xlfn.', minArgs: 1, maxArgs: 3, ...lift,
    call: (args, ctx) => numberValue(args, ctx),
  },
  {
    name: 'FIXED', minArgs: 1, maxArgs: 3, ...lift,
    call: (args, ctx) => {
      const x = num(args[0]!, ctx);
      if (x instanceof CalcError) return x;
      const d = optIntArg(args, 1, 2, ctx);
      if (d instanceof CalcError) return d;
      const nc = args.length > 2 ? optBool(args[2], false, ctx) : false;
      if (nc instanceof CalcError) return nc;
      if (d > 127) return ERR.VALUE;
      const [neg, body] = fixedDigits(x, d, ctx.locale, !nc);
      const s = (neg ? '-' : '') + body;
      return s.length > 255 ? ERR.VALUE : s;
    },
  },
  ...['DOLLAR', 'USDOLLAR'].map((name) => ({
    name, minArgs: 1, maxArgs: 2, ...lift,
    call: (args: readonly Scalar[], ctx: FnContext): Value => {
      const x = num(args[0]!, ctx);
      if (x instanceof CalcError) return x;
      const d = optIntArg(args, 1, 2, ctx, 0);
      if (d instanceof CalcError) return d;
      if (d > 127) return ERR.VALUE;
      const [, body] = fixedDigits(x, d, ctx.locale, true);
      const s = currencyText(body, x < 0, ctx.locale);
      return s.length > 255 ? ERR.VALUE : s;
    },
  })),
  {
    name: 'TRIM', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : s.replace(/ +/g, ' ').replace(/^ | $/g, ''); },
  },
  {
    name: 'CLEAN', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : s.replace(/[\x00-\x1f\x81\x8d\x8f\x90\x9d]/g, ''); },
  },
  {
    name: 'PROPER', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : proper(s); },
  },
  {
    name: 'UPPER', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : upper(s); },
  },
  {
    name: 'LOWER', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : lower(s); },
  },
  {
    name: 'REPT', minArgs: 2, maxArgs: 2, ...lift,
    call: ([v, nv], ctx) => {
      const s = txt(v, ctx);
      if (s instanceof CalcError) return s;
      const k = num(nv, ctx);
      if (k instanceof CalcError) return k;
      const n = Math.trunc(k);
      if (n < 0 || s.length * n > 32767) return ERR.VALUE;
      return s.repeat(n);
    },
  },
  {
    name: 'CHAR', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const k = num(v, ctx);
      if (k instanceof CalcError) return k;
      const n = Math.trunc(k);
      return n < 1 || n > 255 ? ERR.VALUE : cp1252Char(n);
    },
  },
  {
    name: 'CODE', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const s = txt(v, ctx);
      if (s instanceof CalcError) return s;
      if (s === '') return ERR.VALUE;
      return cp1252Code(String.fromCodePoint(s.codePointAt(0)!));
    },
  },
  {
    name: 'UNICHAR', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const k = num(v, ctx);
      if (k instanceof CalcError) return k;
      const n = Math.trunc(k);
      if (n < 1 || n > 0x10ffff) return ERR.VALUE;
      if ((n >= 0xd800 && n <= 0xdfff) || (n & 0xfffe) === 0xfffe || (n >= 0xfdd0 && n <= 0xfdef)) return ERR.NA;
      return String.fromCodePoint(n);
    },
  },
  {
    name: 'UNICODE', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const s = txt(v, ctx);
      if (s instanceof CalcError) return s;
      return s === '' ? ERR.VALUE : s.codePointAt(0)!;
    },
  },
  {
    name: 'EXACT', minArgs: 2, maxArgs: 2, ...lift,
    call: ([a, b], ctx) => {
      const x = txt(a, ctx);
      if (x instanceof CalcError) return x;
      const y = txt(b, ctx);
      if (y instanceof CalcError) return y;
      return x === y;
    },
  },
  {
    name: 'TEXTBEFORE', prefix: '_xlfn.', minArgs: 2, maxArgs: 6,
    args: (i) => (i === 1 || i === 5 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => textBeforeAfter(false, args, ctx),
  },
  {
    name: 'TEXTAFTER', prefix: '_xlfn.', minArgs: 2, maxArgs: 6,
    args: (i) => (i === 1 || i === 5 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => textBeforeAfter(true, args, ctx),
  },
  {
    name: 'TEXTSPLIT', prefix: '_xlfn.', minArgs: 2, maxArgs: 6,
    args: (i) => (i === 1 || i === 2 || i === 5 ? 'any' : 'value'), lift: true,
    call: (args, ctx) => textSplit(args, ctx),
  },
  {
    name: 'VALUETOTEXT', prefix: '_xlfn.', minArgs: 1, maxArgs: 2, ...lift, acceptsErrors: true,
    call: ([v, f], ctx) => {
      const fmt = f === undefined ? 0 : f instanceof CalcError ? f : optInt(f, 0, ctx);
      if (fmt instanceof CalcError) return fmt;
      if (fmt !== 0 && fmt !== 1) return ERR.VALUE;
      return valueText(v ?? null, fmt === 1, ctx.locale);
    },
  },
  {
    name: 'ARRAYTOTEXT', prefix: '_xlfn.', minArgs: 1, maxArgs: 2, args: (i) => (i === 0 ? 'any' : 'value'),
    call: ([v, f], ctx) => {
      const fmt = f === undefined ? 0 : optInt(f, 0, ctx);
      if (fmt instanceof CalcError) return fmt;
      if (fmt !== 0 && fmt !== 1) return ERR.VALUE;
      if (v instanceof CalcError) return v;
      const a = asArray(v, ctx);
      if (a instanceof CalcError) return a;
      if (fmt === 0) return checkLen(a.data.map((x) => valueText(x, false, ctx.locale)).join(listSep(ctx.locale) + ' '));
      const [cs, rs] = arraySeps(ctx.locale);
      const rows: string[] = [];
      for (let r = 0; r < a.rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < a.cols; c++) row.push(valueText(a.get(r, c), true, ctx.locale));
        rows.push(row.join(cs));
      }
      return checkLen(`{${rows.join(rs)}}`);
    },
  },
  {
    name: 'ASC', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : isDbcs(ctx.locale) ? toHalfWidth(s) : s; },
  },
  {
    name: 'DBCS', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : isDbcs(ctx.locale) ? toFullWidth(s) : s; },
  },
  {
    name: 'BAHTTEXT', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const x = num(v, ctx); return x instanceof CalcError ? x : bahtText(x); },
  },
  {
    // sem a leitura fonética (rPh) da célula o Excel devolve #N/A
    name: 'PHONETIC', minArgs: 1, maxArgs: 1, args: 'ref',
    call: () => ERR.NA,
  },
  {
    name: 'ENCODEURL', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const s = txt(v, ctx);
      if (s instanceof CalcError) return s;
      let out = '';
      for (const b of new TextEncoder().encode(s)) {
        const c = String.fromCharCode(b);
        out += /[A-Za-z0-9\-_.]/.test(c) ? c : '%' + b.toString(16).toUpperCase().padStart(2, '0');
      }
      return checkLen(out);
    },
  },
  // serviços de rede: o motor não acessa a rede (WEBSERVICE como o Excel sem resposta; tradução online → #CONNECT!)
  { name: 'WEBSERVICE', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift, volatile: true, call: () => ERR.VALUE },
  { name: 'TRANSLATE', prefix: '_xlfn.', minArgs: 1, maxArgs: 3, ...lift, call: () => CalcError.of('#CONNECT!') },
  { name: 'DETECTLANGUAGE', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift, call: () => CalcError.of('#CONNECT!') },
);

function optIntArg(args: readonly Scalar[], i: number, def: number, ctx: FnContext, nullAs = def): number | CalcError {
  if (args.length <= i) return def;
  const v = args[i];
  if (v === null) return nullAs; // omitido: FIXED(x;) = 2 casas, DOLLAR(x;) = 0 (medido)
  const n = num(v!, ctx);
  return n instanceof CalcError ? n : Math.trunc(n);
}

/** Texto de moeda do idioma (DOLLAR): pt-BR "R$ 1.234,57" / "-R$ 1.234,57"; en-US "$1,234.57" / "($1,234.57)". */
function currencyText(body: string, neg: boolean, locale: ValueLocale): string {
  if (locale.id === 'en-US') return neg ? `(${locale.currency}${body})` : `${locale.currency}${body}`;
  return `${neg ? '-' : ''}${locale.currency} ${body}`;
}

/**
 * NUMBERVALUE(texto; [decimal]; [milhar]), medido: tira TODO espaço, os "%" do
 * fim (cada um ÷100), valida (2 decimais ou milhar depois do decimal → #VALUE!),
 * remove o milhar, troca o decimal pelo do idioma e lê como VALUE (aceita
 * parênteses, moeda, datas: "1 1/2" vira "11/2" = data!). Só o decimal dado e
 * igual ao milhar do idioma → milhar vira o decimal do idioma. Vazio = 0.
 */
function numberValue(args: readonly Scalar[], ctx: FnContext): Scalar {
  const [tv, dv, gv] = args;
  if (typeof tv === 'number') return tv;
  if (typeof tv === 'boolean') return ERR.VALUE;
  let s = txt(tv ?? null, ctx);
  if (s instanceof CalcError) return s;
  const L = ctx.locale;
  let dec = L.decimal, grp: string | undefined;
  if (args.length > 1 && dv !== null && dv !== undefined) {
    const d = txt(dv, ctx);
    if (d instanceof CalcError) return d;
    if (d === '') return ERR.VALUE;
    dec = d[0]!;
  }
  if (args.length > 2 && gv !== null && gv !== undefined) {
    const g = txt(gv, ctx);
    if (g instanceof CalcError) return g;
    if (g === '') return ERR.VALUE;
    grp = g[0]!;
  }
  grp ??= dec === L.group ? L.decimal : L.group;
  if (dec === grp) return ERR.VALUE;
  s = s.replace(/\s+/g, '');
  let pct = 0;
  while (s.endsWith('%')) { pct++; s = s.slice(0, -1); }
  const di = s.indexOf(dec);
  if (di >= 0 && (s.indexOf(dec, di + 1) >= 0 || s.indexOf(grp, di + 1) >= 0)) return ERR.VALUE;
  s = s.split(grp).join('');
  if (di >= 0 && dec !== L.decimal) s = s.replace(dec, L.decimal);
  if (s === '') return 0;
  const n = parseNumberText(s, L, ctx.date1904);
  if (n === undefined) return ERR.VALUE;
  return n / Math.pow(100, pct);
}

/**
 * TEXTSPLIT(texto; col; [lin]; [ignorar_vazio]; [modo]; [preencher]): uma
 * varredura só, delimitador mais cedo (o mais longo no empate; coluna antes de
 * linha — mesmo delimitador nos dois = coluna); falta preenchida com #N/A.
 */
function textSplit(args: readonly Value[], ctx: FnContext): Value {
  const [tv, cv, rv, iv, mv, pv] = args as [Scalar, Value, Value?, Scalar?, Scalar?, Value?];
  const text = txt(tv, ctx);
  if (text instanceof CalcError) return text;
  const cols = cv === null ? [] : delimList(cv, ctx);
  if (cols instanceof CalcError) return cols;
  const rows = rv === undefined || rv === null ? [] : delimList(rv, ctx);
  if (rows instanceof CalcError) return rows;
  const ig = optBool(iv, false, ctx);
  if (ig instanceof CalcError) return ig;
  const mode = optInt(mv, 0, ctx);
  if (mode instanceof CalcError) return mode;
  if (mode !== 0 && mode !== 1) return ERR.VALUE;
  if (!cols.length && !rows.length) return ERR.VALUE;
  if (cols.some((d) => d === '') || rows.some((d) => d === '')) return ERR.VALUE;
  if (text === '') return ERR.VALUE;
  let pad: Scalar = ERR.NA;
  if (pv !== undefined && pv !== null) {
    if (pv instanceof ArrayValue) pad = pv.get(0, 0);
    else if (pv instanceof RefValue) { const a = pv.areas[0]!; pad = ctx.cell(a.sheet, a.r1, a.c1); }
    else pad = pv as Scalar;
  }
  const ci = mode === 1;
  const hay = ci ? lower(text) : text;
  const ds = [...cols.map((d) => ({ d: ci ? lower(d) : d, row: false })), ...rows.map((d) => ({ d: ci ? lower(d) : d, row: true }))];
  const grid: string[][] = [];
  let line: string[] = [];
  let pos = 0, last = 0;
  const pushCell = (v: string): void => { if (!(ig && v === '')) line.push(v); };
  const pushLine = (): void => { if (!(ig && line.length === 0)) grid.push(line); line = []; };
  for (;;) {
    let best = -1, blen = 0, brow = false;
    for (const { d, row } of ds) {
      const i = hay.indexOf(d, pos);
      if (i >= 0 && (best < 0 || i < best || (i === best && d.length > blen))) { best = i; blen = d.length; brow = row; }
    }
    if (best < 0) break;
    pushCell(text.slice(last, best));
    if (brow) pushLine();
    pos = last = best + blen;
  }
  pushCell(text.slice(last));
  pushLine();
  if (!grid.length) return ERR.CALC;
  const width = Math.max(...grid.map((l) => l.length));
  if (!width) return ERR.CALC;
  return ArrayValue.fill(grid.length, width, (r, c) => (c < grid[r]!.length ? grid[r]![c]! : pad));
}
