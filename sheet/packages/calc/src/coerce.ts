/**
 * Conversões implícitas do Excel (número ↔ texto ↔ booleano) e ordenação de
 * valores. Primeira versão do contrato: as regras finas (formatos de data
 * aceitos por VALUE, notação dos números grandes no texto…) são refinadas
 * contra o oráculo pelo dono de cada área, mantendo as assinaturas.
 */
import { CalcError, ERR, type Scalar } from './values.js';
import { EN_US, type ValueLocale } from './fn.js';
import { ymdToSerial } from './dates.js';

/** Número de um escalar (soma, operadores aritméticos…). Texto que não é número → #VALUE!. */
export function toNumber(v: Scalar, locale: ValueLocale = EN_US): number | CalcError {
  if (typeof v === 'number') return v;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof CalcError) return v;
  const n = parseNumberText(v, locale);
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
 * dígitos significativos, sem zeros finais, decimal do idioma; notação
 * científica fora de [1e-9, 1e15) — "1,23456789012346E+17".
 */
export function numberToText(x: number, locale: ValueLocale = EN_US): string {
  if (!Number.isFinite(x)) return ERR.NUM.code;
  if (x === 0) return '0';
  const ax = Math.abs(x);
  let s: string;
  if (ax >= 1e15 || ax < 1e-9) {
    const [m, e] = x.toExponential(14).split('e') as [string, string];
    const mant = m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
    const exp = parseInt(e, 10);
    s = `${mant}E${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  } else {
    s = String(Number(x.toPrecision(15)));
    if (/e/i.test(s)) s = Number(x.toPrecision(15)).toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
  }
  return locale.decimal === '.' ? s : s.replace('.', locale.decimal);
}

/**
 * Texto → número como o Excel aceita na conversão implícita e em VALUE: sinal,
 * separador de milhar e decimal do idioma, porcentagem, moeda, expoente,
 * parênteses (negativo), datas e horas. undefined = não é número.
 */
export function parseNumberText(text: string, locale: ValueLocale = EN_US): number | undefined {
  let s = text.trim();
  if (!s) return undefined;
  // hora/data primeiro (contêm separadores que confundiriam o número)
  const dt = parseDateTimeText(s, locale);
  if (dt !== undefined) return dt;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  let pct = 0;
  while (s.endsWith('%')) { pct++; s = s.slice(0, -1).trim(); }
  if (locale.currency && s.includes(locale.currency)) s = s.replace(locale.currency, '').trim();
  if (/^[+-]/.test(s)) { if (s[0] === '-') neg = !neg; s = s.slice(1).trim(); }
  if (locale.currency && s.startsWith(locale.currency)) s = s.slice(locale.currency.length).trim();
  if (!s) return undefined;
  const g = locale.group, d = locale.decimal;
  // separador de milhar só entre grupos de 3 dígitos antes do decimal
  const esc = (c: string): string => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(\\d{1,3}(?:${esc(g)}\\d{3})+|\\d*)(?:${esc(d)}(\\d*))?(?:[eE]([+-]?\\d+))?$`);
  const m = re.exec(s);
  if (!m || (!m[1] && !m[2])) return undefined;
  const intPart = (m[1] ?? '').split(g).join('');
  const num = Number(`${intPart || '0'}.${m[2] ?? ''}${m[3] !== undefined ? 'e' + m[3] : ''}`);
  if (!Number.isFinite(num)) return undefined;
  return (neg ? -num : num) / Math.pow(100, pct);
}

/** Datas/horas em texto ("31/12/2024", "2024-12-31", "10:30", "1/2/24 3:04 PM") → serial. */
export function parseDateTimeText(text: string, locale: ValueLocale = EN_US, date1904 = false): number | undefined {
  const s = text.trim();
  let date: number | undefined, time = 0, rest = s;
  // hora no fim (h:mm[:ss[.fff]] [AM/PM])
  const tm = new RegExp(`(?:^|\\s)(\\d{1,2})${locale.timeSep === ':' ? ':' : `[:${locale.timeSep}]`}(\\d{1,2})(?::(\\d{1,2}(?:[.,]\\d+)?))?\\s*(${locale.am}|${locale.pm}|AM|PM|A|P)?$`, 'i').exec(s);
  if (tm) {
    let h = +tm[1]!; const mi = +tm[2]!, se = tm[3] ? +tm[3].replace(',', '.') : 0;
    const ap = tm[4]?.toUpperCase();
    if (ap) { if (h > 12) return undefined; const pm = ap === locale.pm.toUpperCase() || ap === 'PM' || ap === 'P'; if (h === 12) h = 0; if (pm) h += 12; }
    if (mi > 59 || se >= 60) return undefined;
    time = (h * 3600 + mi * 60 + se) / 86400;
    rest = s.slice(0, tm.index).trim();
    if (!rest) return time;
  }
  // data: ISO ou na ordem do idioma com / - . e nomes de mês
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(rest);
  if (iso) date = ymdToSerial(+iso[1]!, +iso[2]!, +iso[3]!, date1904);
  else {
    const parts = rest.split(/[/\-.\s]+/).filter(Boolean);
    if (parts.length >= 2 && parts.length <= 3) {
      const monthOf = (p: string): number | undefined => {
        if (/^\d+$/.test(p)) return undefined;
        const u = p.toLowerCase().replace(/\.$/, '');
        let i = locale.monthNames.findIndex((n) => n.toLowerCase() === u);
        if (i < 0) i = locale.monthAbbr.findIndex((n) => n.toLowerCase() === u);
        if (i < 0) i = EN_US.monthAbbr.findIndex((n) => n.toLowerCase() === u.slice(0, 3));
        return i >= 0 ? i + 1 : undefined;
      };
      const nums = parts.map((p) => (/^\d+$/.test(p) ? +p : monthOf(p) ?? NaN));
      if (nums.some((n) => Number.isNaN(n))) return undefined;
      const named = parts.findIndex((p) => !/^\d+$/.test(p));
      let y: number, m: number, d: number;
      const thisYear = new Date().getFullYear();
      if (parts.length === 2) {
        // dia+mês (ano corrente) ou mês+ano
        const [a, b] = nums as [number, number];
        if (named === 0) { m = a; if (b > 31) { y = b; d = 1; } else { d = b; y = thisYear; } }
        else if (named === 1) { m = b; if (a > 31) { y = a; d = 1; } else { d = a; y = thisYear; } }
        else if (locale.dateOrder === 'MDY') { m = a; d = b; y = thisYear; }
        else { d = a; m = b; y = thisYear; }
      } else {
        const [a, b, c] = nums as [number, number, number];
        if (named === 1 || locale.dateOrder === 'DMY') { d = a; m = b; y = c; }
        else if (named === 0 || locale.dateOrder === 'MDY') { m = a; d = b; y = c; }
        else { y = a; m = b; d = c; }
        if (y < 100 && parts[2]!.length <= 2) y += y < 30 ? 2000 : 1900;
      }
      if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      if (d > dim) return undefined;
      date = ymdToSerial(y, m, d, date1904);
    }
  }
  if (date === undefined) return undefined;
  return date + time;
}

/**
 * Ordem do Excel para comparação (=, <, MATCH aproximado, SORT…): números <
 * textos < booleanos (FALSE < TRUE); texto sem diferenciar maiúsculas; vazio
 * = 0 contra número, "" contra texto, FALSE contra booleano. Erros não se comparam
 * (quem chama propaga o erro antes). Devolve -1, 0 ou 1.
 */
export function compareScalars(a: Scalar, b: Scalar): number {
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const rank = (v: Scalar): number => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'string' && typeof b === 'string') {
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return 0;
}
