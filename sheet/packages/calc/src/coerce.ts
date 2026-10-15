/**
 * Conversões implícitas do Excel (número ↔ texto ↔ booleano) e ordenação de
 * valores. Regras medidas no Excel 365 pt-BR (VALUE, ""&x, "x"+0; lab
 * calc/tdl) e generalizadas pelo idioma (decimal, milhar, moeda, ordem da data,
 * nomes de mês do `ValueLocale`).
 *
 * Texto → número (VALUE e conversão implícita aceitam o mesmo):
 * - só espaços ASCII nas pontas são ignorados (tab, NBSP → #VALUE!);
 * - milhar só com 3+ dígitos depois de cada separador ("1.2345.678" vale;
 *   "1.23", "1.0", "1." não); decimal pode abrir ou fechar (",5", "1,");
 * - moeda do idioma só ANTES ("R$ 1", "-R$1", "R$ -1", "R$(1)", "(R$ 1)"),
 *   parênteses = negativo mas sem sinal dentro ("(-1)", "-(1)" não), "%" antes ou
 *   depois (um só, e não junto com a moeda); expoente "1,5e2"; |x| ≥ 1E+308 não;
 * - fração mista "1 1/2" = 1,5 (denominador 0 não); dígitos arábico-índicos valem;
 * - datas e horas: ver `parseDateTimeParts`.
 *
 * Número → texto (""&x): 15 algarismos significativos; notação decimal se
 * couber em 20 caracteres (sem o sinal), senão científica com expoente de 2+
 * dígitos ("1234567890123450000", "0,000000000000000001", "1,5E+20", "1E-19").
 */
import { CalcError, ERR, type Scalar } from './values.js';
import { EN_US, type ValueLocale } from './fn.js';
import { daysInMonth, maxSerial, ymdToSerial } from './dates.js';
import { compareText } from './collation.js';

/** Número de um escalar (soma, operadores aritméticos…). Texto que não é número → #VALUE!. */
export function toNumber(v: Scalar, locale: ValueLocale = EN_US, date1904 = false): number | CalcError {
  if (typeof v === 'number') return v;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof CalcError) return v;
  const n = parseNumberText(v, locale, date1904);
  return n === undefined ? ERR.VALUE : n;
}

/** Texto de um escalar (&, funções de texto). Número no formato "Geral" do idioma, booleano no nome do idioma. */
export function toText(v: Scalar, locale: ValueLocale = EN_US): string | CalcError {
  if (typeof v === 'string') return v;
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? locale.trueText : locale.falseText;
  if (v instanceof CalcError) return v;
  return numberToText(v, locale);
}

/** Booleano de um escalar (AND, IF…). Texto só se for o nome do booleano (canônico ou do idioma). */
export function toBool(v: Scalar, locale: ValueLocale = EN_US): boolean | CalcError {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  if (v instanceof CalcError) return v;
  const u = v.trim().toUpperCase();
  if (u === 'TRUE' || u === locale.trueText.toUpperCase()) return true;
  if (u === 'FALSE' || u === locale.falseText.toUpperCase()) return false;
  return ERR.VALUE;
}

/**
 * Número → texto como o Excel faz na conversão implícita (=""&x): até 15
 * algarismos significativos, sem zeros finais, decimal do idioma; notação
 * decimal se tiver até 20 caracteres (sem o sinal), senão científica
 * ("1,23456789012346E+17", "1E-19").
 */
export function numberToText(x: number, locale: ValueLocale = EN_US): string {
  if (!Number.isFinite(x)) return ERR.NUM.code;
  if (x === 0) return '0';
  const neg = x < 0;
  const [m, e] = Math.abs(x).toExponential(14).split('e') as [string, string];
  const digits = m.replace('.', '').replace(/0+$/, '') || '0';
  const exp = parseInt(e, 10);
  let s: string;
  if (exp >= 0) {
    const int = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, '0');
    const frac = digits.slice(exp + 1);
    s = frac ? `${int}${locale.decimal}${frac}` : int;
  } else s = `0${locale.decimal}${'0'.repeat(-exp - 1)}${digits}`;
  if (s.length > 20) {
    s = digits[0]! + (digits.length > 1 ? locale.decimal + digits.slice(1) : '') +
      `E${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  return neg ? '-' + s : s;
}

/** Remove só espaços ASCII das pontas (o Excel não ignora tab nem NBSP). */
function trimSpaces(s: string): string {
  let a = 0, b = s.length;
  while (a < b && s.charCodeAt(a) === 32) a++;
  while (b > a && s.charCodeAt(b - 1) === 32) b--;
  return s.slice(a, b);
}

/** Dígitos arábico-índicos (٠–٩) viram ASCII (o Excel aceita em VALUE). */
function asciiDigits(s: string): string {
  return /[٠-٩]/.test(s) ? s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)) : s;
}

const esc = (c: string): string => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numReCache = new Map<string, RegExp>();

/** Núcleo numérico: milhar (3+ dígitos depois de cada separador), decimal e expoente. */
function numberCore(s: string, locale: ValueLocale): number | undefined {
  const key = locale.group + '\u0000' + locale.decimal;
  let re = numReCache.get(key);
  if (!re) {
    re = new RegExp(`^(\\d+(?:${esc(locale.group)}\\d{3,})*)?(?:${esc(locale.decimal)}(\\d*))?(?:[eE]([+-]?\\d+))?$`);
    numReCache.set(key, re);
  }
  const m = re.exec(s);
  if (!m || (!m[1] && !m[2])) return undefined;
  const int = (m[1] ?? '').split(locale.group).join('');
  const n = Number(`${truncate15(int || '0', m[2] ?? '')}${m[3] !== undefined ? 'e' + m[3] : ''}`);
  if (!Number.isFinite(n) || n >= 1e308) return undefined;
  // abaixo do menor normal o Excel recusa ("1e-400" → #VALUE!)
  if (n !== 0 ? n < 2.2250738585072014e-308 : /[1-9]/.test(int + (m[2] ?? ''))) return undefined;
  return n;
}

/**
 * Só 15 algarismos significativos, TRUNCADOS, como ao digitar
 * ("9999999999999999" → 9999999999999990; medido em VALUE).
 */
function truncate15(int: string, frac: string): string {
  const all = int + frac;
  let first = 0;
  while (first < all.length && all[first] === '0') first++;
  if (all.length - first <= 15) return `${int}.${frac}`;
  const keep = first + 15;
  const kept = all.slice(0, keep) + '0'.repeat(Math.max(0, int.length - keep));
  return `${kept.slice(0, int.length)}.${kept.slice(int.length)}`;
}

/** Número "puro" (sem data/hora): moeda, sinal, parênteses, porcentagem. */
function parsePlainNumber(text: string, locale: ValueLocale): number | undefined {
  let s = text;
  const cur = locale.currency;
  let hasCur = false, neg = false, signed = false;
  const eatCurrency = (): void => {
    if (!hasCur && cur && s.startsWith(cur)) { hasCur = true; s = s.slice(cur.length).trimStart(); }
  };
  eatCurrency();
  if (s[0] === '+' || s[0] === '-') { signed = true; neg = s[0] === '-'; s = s.slice(1).trimStart(); }
  eatCurrency();
  if (s[0] === '(') {
    if (signed || !s.endsWith(')')) return undefined;
    neg = true;
    s = trimSpaces(s.slice(1, -1));
    eatCurrency();
  }
  let pct = false;
  if (s.startsWith('%')) { pct = true; s = s.slice(1).trimStart(); }
  else if (s.endsWith('%')) { pct = true; s = s.slice(0, -1).trimEnd(); }
  if (pct && hasCur) return undefined;
  const n = numberCore(s, locale);
  if (n === undefined) return undefined;
  let v = pct ? n / 100 : n;
  if (Math.abs(v) < 2.2250738585072014e-308) v = 0; // subnormal vira 0 (medido: "2082e-310%" = 0)
  return neg ? -v : v;
}

/** Fração mista "1 1/2" (com sinal opcional). */
function parseMixedFraction(s: string): number | undefined {
  const m = /^([+-]?)(\d+) +(\d+)\/(\d+)$/.exec(s);
  if (!m) return undefined;
  const den = +m[4]!;
  // numerador e denominador em 16 bits (medido: 32767 vale, 32768 não)
  if (den === 0 || den > 32767 || +m[3]! > 32767) return undefined;
  const v = +m[2]! + +m[3]! / den;
  return m[1] === '-' ? -v : v;
}

/**
 * Texto → número como o Excel aceita na conversão implícita e em VALUE (ver o
 * cabeçalho). undefined = não é número.
 */
export function parseNumberText(text: string, locale: ValueLocale = EN_US, date1904 = false): number | undefined {
  const s = trimSpaces(asciiDigits(text));
  if (!s) return undefined;
  const n = parsePlainNumber(s, locale);
  if (n !== undefined) return n;
  const f = parseMixedFraction(s);
  if (f !== undefined) return f;
  return parseDateTimeText(s, locale, date1904);
}

/** Datas/horas em texto ("31/12/2024", "2024-12-31", "10:30", "1/2/24 3:04 PM") → serial. */
export function parseDateTimeText(text: string, locale: ValueLocale = EN_US, date1904 = false): number | undefined {
  const p = parseDateTimeParts(text, locale, date1904);
  if (!p) return undefined;
  return (p.date ?? 0) + (p.time ?? 0);
}

/** Ano corrente (datas sem ano: "1/2", "13-jan"), como o relógio do sistema do Excel. */
function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Data e/ou hora em texto → partes (série inteira da data; fração/horas da hora).
 * Regras medidas no Excel pt-BR:
 * - hora "h:m", "h:m:s", "m:s,f" (2 partes com decimal = minuto:segundo), "12:" e
 *   "h AM/PM"; AM/PM só depois de espaço e com hora ≤ 12; cada parte < 10000 e
 *   no máximo UMA fora do limite natural (h ≥ 24, m ≥ 60, s ≥ 60): "23:9999" e
 *   "1:60:00" valem, "24:60" e "0:60:60" não; fração de segundo ao milissegundo;
 * - a hora vai no fim ou no começo, separada por espaço ("10:30 1/2/2024");
 * - data numérica com "/" ou "-" (espaço não), na ordem do idioma; 1ª parte com 4
 *   dígitos = ano-mês-dia; 2 partes = dia/mês do ano corrente, senão mês/ano
 *   ("2/24", "12/24", "1-2024"); ano de 2 dígitos < 30 → 20xx, senão 19xx; 3
 *   dígitos ou < 1900 → inválido;
 * - com nome de mês do idioma (completo ou abreviado, sem diferenciar
 *   maiúsculas): "31-jan-2024", "1 fev 2024", "1 jan, 2024", "1-fev" (ano
 *   corrente), "fev-24"/"jan-45" (mês-ano; o número depois do mês é sempre o
 *   ano no pt-BR), "jan 1 2024" não; separadores "/", "-", espaço.
 */
export function parseDateTimeParts(text: string, locale: ValueLocale = EN_US, date1904 = false, year = currentYear()): { date?: number; time?: number } | undefined {
  const s = trimSpaces(asciiDigits(text));
  if (!s) return undefined;
  // espaços em volta do ":" não contam ("10 : 30" = 10:30, medido)
  const words = s.replace(/ *: */g, ':').split(/ +/);
  const n = words.length;
  let time: number | undefined, rest: string[] = words;
  const attempts: [number, number][] = []; // [início, fim) da hora
  if (n >= 2) attempts.push([n - 2, n]);
  attempts.push([n - 1, n]);
  if (n >= 3) attempts.push([0, 2]);
  if (n >= 2) attempts.push([0, 1]);
  for (const [a, b] of attempts) {
    const t = parseTimeWords(words.slice(a, b), locale);
    if (t !== undefined) { time = t; rest = [...words.slice(0, a), ...words.slice(b)]; break; }
  }
  if (!rest.length) return time === undefined ? undefined : { time };
  const date = parseDatePart(rest.join(' '), locale, date1904, year);
  if (date === undefined) return undefined;
  return time === undefined ? { date } : { date, time };
}

const AMPM_RE = /^(AM|PM|A|P)$/i;

/** Hora em 1 ou 2 palavras ("10:30", "10:30 PM", "10 PM") → dias; undefined = não é hora. */
function parseTimeWords(ws: string[], locale: ValueLocale): number | undefined {
  let ampm: 'am' | 'pm' | undefined;
  if (ws.length === 2) {
    const w = ws[1]!.toUpperCase();
    if (w === locale.am.toUpperCase() || (AMPM_RE.test(w) && w[0] === 'A')) ampm = 'am';
    else if (w === locale.pm.toUpperCase() || (AMPM_RE.test(w) && w[0] === 'P')) ampm = 'pm';
    else return undefined;
  } else if (ws.length !== 1) return undefined;
  const w = ws[0]!;
  let h: number, m = 0, sec = 0;
  const sep = esc(locale.timeSep), dec = esc(locale.decimal);
  const re = new RegExp(`^(\\d+)${sep}(\\d*)(?:${sep}(\\d*))?(?:${dec}(\\d*))?$`);
  const t = re.exec(w);
  if (t) {
    const a = +t[1]!, b = t[2] ? +t[2] : 0;
    const frac = t[4] !== undefined ? Math.round(Number(`0.${t[4] || '0'}`) * 1000) / 1000 : 0;
    if (t[3] !== undefined) { h = a; m = b; sec = (t[3] ? +t[3] : 0); }
    else if (t[4] !== undefined) { h = 0; m = a; sec = b; }
    else { h = a; m = b; }
    if (h >= 10000 || m >= 10000 || sec >= 10000) return undefined;
    const over = (h >= 24 ? 1 : 0) + (m >= 60 ? 1 : 0) + (sec >= 60 ? 1 : 0);
    if (over > 1) return undefined;
    sec += frac;
  } else if (ampm && /^\d+$/.test(w)) {
    h = +w;
  } else return undefined;
  if (ampm) {
    if (h > 12) return undefined;
    if (h === 12) h = 0;
    if (ampm === 'pm') h += 12;
  }
  return (h * 3600 + m * 60 + sec) / 86400;
}

/** Mês pelo nome (completo ou abreviado) no idioma; undefined = não é mês. */
function monthOf(word: string, locale: ValueLocale): number | undefined {
  const u = word.toLowerCase();
  let i = locale.monthNames.findIndex((n) => n.toLowerCase() === u);
  if (i < 0) i = locale.monthAbbr.findIndex((n) => n.toLowerCase() === u);
  return i >= 0 ? i + 1 : undefined;
}

/** Ano escrito na data: 1–2 dígitos (< 30 → 20xx), 4 dígitos ≥ 1900; o resto é inválido. */
function yearOf(s: string): number {
  if (s.length <= 2) { const y = +s; return y < 30 ? 2000 + y : 1900 + y; }
  if (s.length === 4 && +s >= 1900) return +s;
  return NaN;
}

function parseDatePart(text: string, locale: ValueLocale, date1904: boolean, year: number): number | undefined {
  const s = text.replace(/ *([/-]) */g, '$1');
  const parts: { num?: string; mon?: number }[] = [];
  const seps: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c >= '0' && c <= '9') {
      let j = i; while (j < s.length && s[j]! >= '0' && s[j]! <= '9') j++;
      // número colado no nome do mês vale como separado ("1jan2024", "fev1941", medido)
      if (parts.length > seps.length) { if (parts[parts.length - 1]!.mon === undefined) return undefined; seps.push(' '); }
      parts.push({ num: s.slice(i, j) }); i = j; continue;
    }
    if (c === '/' || c === '-' || c === ' ' || c === ',') {
      if (parts.length !== seps.length + 1) return undefined;
      if (c === ',') {
        // vírgula só depois do mês no meio e seguida de espaço ("1 jan, 2024"; "jan, 2024" e "mar,3412" não)
        if (parts[parts.length - 1]!.mon === undefined || parts.length < 2 || s[i + 1] !== ' ') return undefined;
        i++; while (s[i] === ' ') i++;
        seps.push(','); continue;
      }
      seps.push(c); i++; continue;
    }
    let j = i; while (j < s.length && !/[\d/\- ,]/.test(s[j]!)) j++;
    const mon = monthOf(s.slice(i, j), locale);
    if (mon === undefined) return undefined;
    if (parts.length > seps.length) { if (parts[parts.length - 1]!.num === undefined) return undefined; seps.push(' '); }
    parts.push({ mon }); i = j;
  }
  if (parts.length !== seps.length + 1 || parts.length < 2 || parts.length > 3) return undefined;
  const named = parts.findIndex((p) => p.mon !== undefined);
  if (parts.filter((p) => p.mon !== undefined).length > 1) return undefined;
  let y: number, m: number, d: number;
  const order = locale.dateOrder;
  if (named < 0) {
    if (seps.some((x) => x !== '/' && x !== '-')) return undefined;
    const nums = parts.map((p) => p.num!);
    if (nums.length === 3) {
      if (nums[0]!.length >= 3) {
        if (nums[0]!.length !== 4) return undefined;
        y = yearOf(nums[0]!); m = +nums[1]!; d = +nums[2]!;
      } else if (order === 'MDY') { m = +nums[0]!; d = +nums[1]!; y = yearOf(nums[2]!); }
      else if (order === 'YMD') { y = yearOf(nums[0]!); m = +nums[1]!; d = +nums[2]!; }
      else { d = +nums[0]!; m = +nums[1]!; y = yearOf(nums[2]!); }
    } else {
      const [a, b] = nums as [string, string];
      if (a.length >= 3) return undefined;
      const [dd, mm] = order === 'MDY' || order === 'YMD' ? [+b, +a] : [+a, +b];
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= daysInMonth(year, mm, date1904)) { y = year; m = mm; d = dd; }
      else { m = +a; y = yearOf(b); d = 1; }
    }
  } else if (parts.length === 3) {
    if (named === 1) { d = +parts[0]!.num!; m = parts[1]!.mon!; y = yearOf(parts[2]!.num!); }
    else if (named === 0 && order === 'MDY') { m = parts[0]!.mon!; d = +parts[1]!.num!; y = yearOf(parts[2]!.num!); }
    else return undefined;
  } else if (named === 1) { d = +parts[0]!.num!; m = parts[1]!.mon!; y = year; }
  else {
    m = parts[0]!.mon!;
    const b = parts[1]!.num!;
    if (order === 'MDY' && b.length <= 2 && +b >= 1 && +b <= daysInMonth(year, m, date1904)) { d = +b; y = year; }
    else { d = 1; y = yearOf(b); }
  }
  if (!(y >= 1900 && y <= 9999) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= daysInMonth(y, m, date1904))) return undefined;
  const serial = ymdToSerial(y, m, d, date1904);
  if (serial < 0 || serial > maxSerial(date1904)) return undefined;
  return serial;
}

/**
 * Ordem do Excel para comparação (=, <, MATCH aproximado, SORT…): números <
 * textos < booleanos (FALSE < TRUE); texto pela colação do Excel (sem
 * diferenciar maiúsculas; ver collation.ts); vazio = 0 contra número, "" contra
 * texto, FALSE contra booleano. Erros não se comparam (quem chama propaga o
 * erro antes). Devolve -1, 0 ou 1.
 */
export function compareScalars(a: Scalar, b: Scalar): number {
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const rank = (v: Scalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'string' && typeof b === 'string') return compareText(a, b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return 0;
}

/**
 * Igualdade de texto da correspondência EXATA de MATCH/VLOOKUP/XLOOKUP (sem
 * diferenciar maiúsculas, mas "ß" ≠ "ss" e "a" ≠ "á" — medido).
 */
export function sameTextCI(a: string, b: string): boolean {
  return a === b || a.toLowerCase() === b.toLowerCase();
}
