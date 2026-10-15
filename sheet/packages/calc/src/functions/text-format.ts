/**
 * TEXT/FIXED/DOLLAR sobre o motor de formatação numérica compartilhado
 * (`@universal-office/charts`, formatValueParts). O código de formato do TEXT
 * vem no idioma de QUEM CALCULA (pt-BR: "dd/mm/aaaa", "#.##0,00", "Geral",
 * "[Vermelho]") e é traduzido aqui para o canônico do arquivo.
 * Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR (lab calc/tdl, text.cases.json):
 * - letras: a/A = ano ("a"/"aa" = 2 dígitos, 3+ = 4), e = ano, b = ano budista,
 *   g/G = era (vazio), d/m/h/s como no inglês; y/Y e as demais letras ASCII são
 *   literais; n/N, B, E (fora de "E+"/"E-") e letras acentuadas com base a/e/n
 *   (á, ã, é, ñ…) → #VALUE!; "General" → #VALUE! (tem "n"); "Geral" em qualquer caixa;
 * - "," é o decimal e "." o milhar nas seções numéricas ("0.00" → "45.659",
 *   "#.##0," escala ÷1000); nas de data/hora são literais, exceto ",0" depois dos
 *   segundos (fração: "ss,00");
 * - cores e condições no idioma: [Vermelho], [Cor10] ([Red]/[Color10] → #VALUE!),
 *   [Cor57] e colchete desconhecido → #VALUE!; [$-409], [DBNum1] passam;
 * - mais de 4 seções, "_"/"*" no fim, "@" junto de dígitos, "0/" → #VALUE!;
 * - "*x" não repete nada (TEXT não conhece a largura), "_x" vira um espaço;
 * - data negativa ou além de 31/12/9999 → #VALUE!.
 */
import { decimalDigits, formatGeneral, formatValueParts, PT_BR as FMT_PT_BR, type FormatLocale } from '@universal-office/charts';
import type { ValueLocale } from '../fn.js';
import { CalcError, ERR } from '../values.js';

const fmtLocaleCache = new Map<string, FormatLocale>();

/** FormatLocale do motor compartilhado a partir das convenções de valor do idioma. */
export function formatLocaleOf(locale: ValueLocale): FormatLocale {
  let f = fmtLocaleCache.get(locale.id);
  if (f) return f;
  const base = locale.id === 'pt-BR' ? FMT_PT_BR : undefined;
  f = {
    ...(base ?? {}),
    decimal: locale.decimal, group: locale.group,
    monthsShort: [...locale.monthAbbr], monthsLong: [...locale.monthNames],
    daysShort: [...locale.dayAbbr], daysLong: [...locale.dayNames],
    ampm: [locale.am, locale.pm],
  };
  fmtLocaleCache.set(locale.id, f);
  return f;
}

/** Etiquetas BCP 47 aceitas em [$-pt-BR] → LCID (as de nomes de mês medidos). */
const LCID: Record<string, string> = {
  'en-us': '409', 'en-gb': '809', 'pt-br': '416', 'pt-pt': '816', 'es-es': 'C0A', 'es-mx': '80A', 'fr-fr': '40C',
  'de-de': '407', 'it-it': '410', 'ja-jp': '411', 'zh-cn': '804', 'ko-kr': '412', 'th-th': '41E',
};

/** Formato da data longa / hora do sistema no idioma (canônico). */
function sysFormat(locale: ValueLocale, kind: 'date' | 'time'): string {
  const f = formatLocaleOf(locale);
  return kind === 'date' ? f.sysDate ?? 'dddd, mmmm d, yyyy' : f.sysTime ?? 'h:mm:ss AM/PM';
}

/** Nomes de cor dos códigos de formato por idioma (minúsculas) → canônico. */
const COLOR_NAMES: Record<string, Record<string, string>> = {
  'pt-BR': { preto: 'Black', azul: 'Blue', ciano: 'Cyan', verde: 'Green', magenta: 'Magenta', vermelho: 'Red', branco: 'White', amarelo: 'Yellow' },
};
const COLOR_EN: Record<string, string> = { black: 'Black', blue: 'Blue', cyan: 'Cyan', green: 'Green', magenta: 'Magenta', red: 'Red', white: 'White', yellow: 'Yellow' };
const COLOR_WORD: Record<string, string> = { 'pt-BR': 'cor' };

/** Letra acentuada com base a/e/n (á, ã, é, ñ…): inválida no código (medido no pt-BR). */
function badAccented(ch: string): boolean {
  if (ch.charCodeAt(0) < 128) return false;
  const d = ch.normalize('NFD');
  return d.length > 1 && /^[aenAEN]$/.test(d[0]!);
}

interface LocalSection { raw: string; date: boolean }

/** Separa as seções do código local (respeitando aspas, colchetes e escapes). */
function splitLocal(code: string): string[] | undefined {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') {
      const end = code.indexOf('"', i + 1);
      const j = end < 0 ? code.length - 1 : end;
      cur += code.slice(i, j + 1); i = j; continue;
    }
    if (ch === '[') {
      const end = code.indexOf(']', i + 1);
      if (end < 0) return undefined;
      cur += code.slice(i, end + 1); i = end; continue;
    }
    if (ch === '\\' || ch === '_' || ch === '*') {
      if (i + 1 >= code.length) return undefined;
      cur += code.slice(i, i + 2); i++; continue;
    }
    if (ch === ';') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Código de formato no idioma de quem calcula → código canônico (en-US) do
 * motor compartilhado. undefined = código inválido (TEXT → #VALUE!).
 */
export function translateFormatCode(code: string, locale: ValueLocale): string | undefined {
  const secs = splitLocal(code);
  if (!secs || secs.length > 4) return undefined;
  const L = locale.formatLetters ?? { year: 'y', month: 'm', day: 'd', hour: 'h', minute: 'm', second: 's' };
  const yl = L.year.toLowerCase(), dl = L.day.toLowerCase(), ml = L.month.toLowerCase(), hl = L.hour.toLowerCase(), sl = L.second.toLowerCase(), mil = L.minute.toLowerCase();
  const gen = (locale.generalName ?? 'General').toLowerCase();
  const dateLetters = new Set([yl, dl, ml, hl, sl, mil, 'e', 'b', 'g']);
  const out: string[] = [];
  for (const raw of secs) {
    // [$-F800]/[$-x-sysdate] (data longa do sistema) e [$-F400]/[$-x-systime] em
    // qualquer ponto da seção a substituem inteira (medido: "x [$-F800]", "[$-F800]dd")
    if (/\[\$[^\]]*-(f800|x-sysdate)\]/i.test(raw)) { out.push(sysFormat(locale, 'date')); continue; }
    if (/\[\$[^\]]*-(f400|x-systime)\]/i.test(raw)) { out.push(sysFormat(locale, 'time')); continue; }
    // seção de data: tem letra de data/hora fora de aspas/colchetes/escapes (ou AM/PM)
    const bare = raw.replace(/"[^"]*"?|\\.|_.|\*.|\[[^\]]*\]/g, '').replace(new RegExp(gen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    const elapsed = new RegExp(`\\[(${hl}+|${ml}+|${mil}+|${sl}+)\\]`, 'i').test(raw);
    const date = elapsed || /am\/pm|a\/p/i.test(bare) || [...bare.toLowerCase()].some((c) => dateLetters.has(c) && !(c === 'e' && /e[+-]/i.test(bare)));
    const r = translateSection({ raw, date }, locale, { yl, dl, ml, hl, sl, mil, gen });
    if (r === undefined) return undefined;
    out.push(r);
  }
  return out.join(';');
}

function translateSection(sec: LocalSection, locale: ValueLocale, k: { yl: string; dl: string; ml: string; hl: string; sl: string; mil: string; gen: string }): string | undefined {
  const raw = sec.raw;
  const dec = locale.decimal, grp = locale.group;
  let s = '';
  let hasDigit = false, hasAt = false, sawDec = false, sawExp = false;
  let lastTime = ''; // última letra de data/hora emitida (para ",0" depois dela)
  let subsec = false; // dentro dos dígitos da fração de segundo
  // posições dos marcadores de dígito fora de aspas/escapes/colchetes (decidem milhar × literal)
  const isDig = new Array<boolean>(raw.length).fill(false);
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!;
    if (c === '"') { const e = raw.indexOf('"', i + 1); i = e < 0 ? raw.length : e; continue; }
    if (c === '\\' || c === '_' || c === '*') { i++; continue; }
    if (c === '[') { const e = raw.indexOf(']', i + 1); i = e < 0 ? raw.length : e; continue; }
    if (c === '0' || c === '#' || c === '?') isDig[i] = true;
  }
  const digitIn = (a: number, b: number): boolean => { for (let q = Math.max(0, a); q < Math.min(b, raw.length); q++) if (isDig[q]) return true; return false; };
  const expAt = (() => { for (let q = 0; q < raw.length - 1; q++) if ((raw[q] === 'E' || raw[q] === 'e') && (raw[q + 1] === '+' || raw[q + 1] === '-')) return q; return raw.length; })();
  const firstDec = raw.indexOf(dec);
  const intEnd = Math.min(firstDec < 0 ? raw.length : firstDec, expAt);
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    const low = ch.toLowerCase();
    if (subsec && ch !== '0') subsec = false;
    if (ch === '"') {
      const end = raw.indexOf('"', i + 1);
      const j = end < 0 ? raw.length : end;
      s += '"' + raw.slice(i + 1, j) + '"'; i = j; continue;
    }
    if (ch === '\\') { s += raw.slice(i, i + 2); i++; continue; }
    if (ch === '_' || ch === '*') { s += raw.slice(i, i + 2); i++; continue; }
    if (ch === '[') {
      const end = raw.indexOf(']', i + 1);
      const inner = raw.slice(i + 1, end);
      i = end;
      const b = translateBracket(inner, locale, k);
      if (b === undefined) return undefined;
      const el = /^\[(h+|m+|s+)\]$/.exec(b);
      if (el) lastTime = el[1]![0]!;
      s += b; continue;
    }
    if (raw.slice(i, i + k.gen.length).toLowerCase() === k.gen) { s += 'General'; i += k.gen.length - 1; continue; }
    if (/^am\/pm/i.test(raw.slice(i, i + 5))) { s += raw.slice(i, i + 5); i += 4; lastTime = 'h'; continue; }
    if (/^a\/p/i.test(raw.slice(i, i + 3))) { s += raw.slice(i, i + 3); i += 2; lastTime = 'h'; continue; }
    if (ch === '0' || ch === '#' || ch === '?') {
      if (!sec.date) hasDigit = true;
      else if (ch !== '0' || !subsec) return undefined; // dígito junto de data/hora (fora da fração de segundo) → #VALUE!
      s += ch; continue;
    }
    if (ch === '@') { hasAt = true; s += '@'; continue; }
    if (ch === dec || ch === grp) {
      if (sec.date) {
        // ",0" depois de qualquer parte de data/hora = fração de segundo ("d,0" → "8,6");
        // antes de qualquer uma → #VALUE! (",0mm"); senão literal (medido)
        // (o motor compartilhado só tem fração de segundo depois de s/[s]; depois de outra parte sai literal)
        if (ch === dec && raw[i + 1] === '0') { if (!lastTime) return undefined; s += lastTime === 's' ? '.' : '\\' + ch; subsec = true; continue; }
        s += '\\' + ch; continue;
      }
      if (ch === dec) {
        // só o 1º decimal é o ponto; os seguintes são literais ("0,00,,0" → "99,99,,9", medido)
        if (sawDec || sawExp) { s += '\\' + ch; continue; }
        // decimal sem nenhum marcador de dígito: a parte inteira sai logo antes ("," → "-123,", medido)
        sawDec = true; s += digitIn(0, raw.length) ? '.' : '#.'; continue;
      }
      // milhar: entre dígitos da parte inteira agrupa; logo depois de dígito (sem dígito
      // adiante) escala ÷1000; depois do decimal some se ainda vêm dígitos; senão literal
      let pj = i - 1; while (pj >= 0 && raw[pj] === grp) pj--;
      let nj = i + 1; while (nj < raw.length && raw[nj] === grp) nj++;
      const prevDig = pj >= 0 && isDig[pj]!, nextDig = nj < raw.length && isDig[nj]!;
      if (sawDec && !sawExp) {
        // depois do decimal, colado a dígito: some se ainda vêm dígitos ("#,##0.00" no pt-BR),
        // senão escala ÷1000 ("00,00#." → "-00,123"); fora disso é literal ("?,R$.0,00")
        if (prevDig && digitIn(i + 1, expAt)) continue;
        if (prevDig) { s += ','; continue; }
        s += '\\' + ch; continue;
      }
      // antes do decimal: agrupa colado a dígito com dígitos dos dois lados; escala logo
      // depois de dígito; senão literal ("0%. 00" → "1%. 00", medido)
      if (i < intEnd && (prevDig || nextDig) && digitIn(0, i) && digitIn(i + 1, intEnd)) { s += ','; continue; }
      if (prevDig && !nextDig) { s += ','; continue; }
      s += '\\' + ch; continue;
    }
    if (ch === '.' || ch === ',') { s += '\\' + ch; continue; } // separadores que não são do idioma
    if ((ch === 'E' || ch === 'e') && (raw[i + 1] === '+' || raw[i + 1] === '-') && !sec.date) {
      // expoente precisa de marcador de dígito antes e logo depois (medido: "E+%", "0E+R$" → #VALUE!)
      if (!digitIn(0, i) || !digitIn(i + 2, raw.length)) return undefined;
      s += 'E' + raw[i + 1]; i++; sawExp = true; continue;
    }
    if (/[a-z]/i.test(ch)) {
      if (low === 'n' || ch === 'B' || ch === 'E') return undefined;
      if (low === k.yl) { s += 'y'; lastTime = 'y'; continue; }
      if (low === k.dl) { s += 'd'; lastTime = 'd'; continue; }
      if (low === k.ml || low === k.mil) { s += 'm'; lastTime = 'm'; continue; }
      if (low === k.hl) { s += 'h'; lastTime = 'h'; continue; }
      if (low === k.sl) { s += 's'; lastTime = 's'; continue; }
      if (ch === 'e') { s += 'e'; lastTime = 'y'; continue; }
      if (ch === 'b') { s += 'b'; lastTime = 'y'; continue; }
      if (low === 'g') { s += 'g'; continue; }
      s += '\\' + ch; continue; // letra sem significado no idioma = literal
    }
    if (badAccented(ch)) return undefined;
    // em seção de data: "%" e "/" antes de qualquer parte de data → #VALUE! (medido)
    if (sec.date && (ch === '%' || (ch === '/' && !lastTime))) return undefined;
    // fração: barra entre marcadores de dígito (denominador fixo vale) e sem ponto decimal (medido)
    if (ch === '/' && !sec.date && (!digitIn(0, i) || !/[0-9#?]/.test(raw[i + 1] ?? '') || firstDec >= 0)) return undefined;
    s += ch;
  }
  if (hasAt && hasDigit) return undefined;
  return s;
}

function translateBracket(inner: string, locale: ValueLocale, k: { hl: string; ml: string; mil: string; sl: string }): string | undefined {
  const low = inner.toLowerCase();
  if (inner.startsWith('$')) {
    const dash = inner.indexOf('-');
    if (dash < 0) return `[${inner}]`;
    const sym = inner.slice(1, dash), tag = inner.slice(dash + 1);
    if (/^[0-9a-f]+$/i.test(tag)) return `[${inner}]`;
    const lcid = LCID[tag.toLowerCase()];
    return lcid ? `[$${sym}-${lcid}]` : sym ? `[$${sym}]` : '';
  }
  if (/^(<=|>=|<>|<|>|=)/.test(inner)) return `[${inner.split(locale.decimal).join('.')}]`;
  // tempo decorrido [h] [mm] [ss] com as letras do idioma
  if (low && [...low].every((c) => c === low[0]) && (low[0] === k.hl || low[0] === k.ml || low[0] === k.mil || low[0] === k.sl)) {
    const c = low[0] === k.hl ? 'h' : low[0] === k.sl ? 's' : 'm';
    return `[${c.repeat(low.length)}]`;
  }
  if (/^dbnum\d$/i.test(inner) || /^natural$/i.test(inner)) return `[${inner}]`;
  const names = COLOR_NAMES[locale.id] ?? COLOR_EN;
  if (names[low]) return `[${names[low]}]`;
  const word = COLOR_WORD[locale.id] ?? 'color';
  const m = new RegExp(`^${word}\\s*(\\d+)$`, 'i').exec(inner);
  if (m) { const n = +m[1]!; return n >= 1 && n <= 56 ? `[Color${n}]` : undefined; }
  return undefined;
}

/**
 * Formata um número/texto com um código CANÔNICO como o TEXT: sem largura de
 * coluna ("*x" some, "_x" = espaço), Geral com 11 caracteres. undefined =
 * fora da faixa (data negativa/além de 9999) → #VALUE!.
 */
export function formatForText(value: number | string, canonical: string, locale: ValueLocale, date1904: boolean): string | undefined {
  const loc = formatLocaleOf(locale);
  if (typeof value === 'number' && value < 0) {
    const secs = splitLocal(canonical) ?? [];
    if (secs.length === 1) {
      const bare = secs[0]!.replace(/"[^"]*"?|\\.|_.|\*.|\[\$[^\]]*\]|\[(color\s*\d+|[a-z]+)\]/gi, '');
      // seção única só de literais: o Excel põe o "-" ("x" → "-x", "" → "-")
      if (!/[0#?@]|general|[ymdhsebg]|\[/i.test(bare)) return '-' + (formatForText(-value, canonical, locale, date1904) ?? '');
      // tempo decorrido sozinho aceita negativo ("[mm]" → "-1440")
      if (/^\[(h+|m+|s+)\]$/i.test(secs[0]!.trim())) return '-' + (formatForText(-value, canonical, locale, date1904) ?? '');
    }
  }
  const r = formatValueParts(value, canonical, { locale: loc, date1904 });
  if (r.overflow) return undefined;
  let out = '';
  for (const p of r.parts) {
    if (p.t === 'text') out += p.s;
    else if (p.t === 'skip') out += ' ';
    else if (p.t === 'general') out += formatGeneral(p.v, loc);
  }
  return out;
}

/**
 * Número com casas fixas e separador de milhar do idioma (FIXED, DOLLAR):
 * arredonda "metade para longe de zero" sobre 15 algarismos; `decimals`
 * negativo arredonda à esquerda da vírgula. Devolve [sinal-negativo, texto sem sinal].
 */
export function fixedDigits(x: number, decimals: number, locale: ValueLocale, group: boolean): [boolean, string] {
  const a = Math.abs(x);
  let intStr: string, fracStr = '';
  if (decimals >= 0) {
    [intStr, fracStr] = decimalDigits(a, decimals);
  } else {
    const p = Math.pow(10, -decimals);
    const [i] = decimalDigits(a / p, 0);
    intStr = i ? i + '0'.repeat(-decimals) : '';
  }
  if (!intStr) intStr = '0';
  if (group) intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, locale.group);
  const neg = x < 0 && (/[1-9]/.test(intStr) || /[1-9]/.test(fracStr));
  return [neg, decimals > 0 ? intStr + locale.decimal + fracStr : intStr];
}

/** Limite do texto das funções de texto do Excel. */
export const MAX_TEXT = 32767;

/** Texto longo demais → #VALUE!. */
export function checkLen(s: string): string | CalcError {
  return s.length > MAX_TEXT ? ERR.VALUE : s;
}
