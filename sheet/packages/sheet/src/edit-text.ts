/**
 * Texto de EDIÇÃO de uma constante (barra de fórmulas e F2), como o Excel:
 * - número: até 15 algarismos significativos, sem separador de milhar, decimal
 *   da região; posicional enquanto couber (expoente < 21 e no máximo 19 casas
 *   decimais), senão científico "1,5E+21" / "1E-20" (medido: Formula2Local de
 *   1E+20 = "100000000000000000000", 1E-19 = "0,0000000000000000001", 1E-20 =
 *   "1E-20", 1,23456789012346E-16 científico);
 * - célula com formato de porcentagem: valor × 100 com "%"; de data: a data
 *   curta da região (+ hora se houver fração); de hora: "hh:mm:ss" (abaixo de
 *   um dia) — a barra mostra a data/porcentagem, não o serial;
 * - booleanos e erros no idioma; texto como está (com o apóstrofo do prefixo).
 */
import { CalcError, localizeBool, localizeError, serialToYmd, serialToHms, type Scalar } from '@universal/sheet-calc';
import type { FmtCategory } from './entry-format.js';
import type { FormulaLocale } from './formula-locale.js';

/** Número com 15 algarismos significativos, como o texto de edição do Excel. */
export function numberEditText(v: number, decimal: string): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const neg = v < 0;
  // 15 algarismos significativos: mantissa d.dddddddddddddd e expoente decimal
  const [m, e] = Math.abs(v).toExponential(14).split('e') as [string, string];
  const digits = m.replace('.', '').replace(/0+$/, '') || '0';
  const exp = Number(e);
  const decimals = Math.max(0, digits.length - 1 - exp);
  let s: string;
  if (exp >= 21 || decimals > 19) {
    s = digits[0]! + (digits.length > 1 ? decimal + digits.slice(1) : '') + 'E' + (exp < 0 ? '-' : '+') + Math.abs(exp);
  } else if (exp >= 0) {
    const int = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, '0');
    const frac = digits.length > exp + 1 ? digits.slice(exp + 1) : '';
    s = int + (frac ? decimal + frac : '');
  } else {
    s = '0' + decimal + '0'.repeat(-exp - 1) + digits;
  }
  return neg ? '-' + s : s;
}

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** Data curta da região (pt-BR dd/mm/aaaa; en-US m/d/aaaa; ISO quando ano-mês-dia). */
function shortDate(serial: number, loc: FormulaLocale, date1904: boolean): string {
  const { y, m, d } = serialToYmd(Math.floor(serial), date1904);
  const sep = loc.values.dateSep;
  switch (loc.values.dateOrder) {
    case 'MDY': return `${m}${sep}${d}${sep}${y}`;
    case 'YMD': return `${y}-${pad(m)}-${pad(d)}`;
    default: return `${pad(d)}${sep}${pad(m)}${sep}${y}`;
  }
}

function timeOfDay(serial: number): string {
  const { h, mi, s } = serialToHms(serial - Math.floor(serial));
  return `${pad(h)}:${pad(mi)}:${pad(Math.round(s) >= 60 ? 59 : Math.round(s))}`;
}

/** Texto de edição de um valor numa célula de formato de categoria `cat`. */
export function editText(v: Scalar, cat: FmtCategory, loc: FormulaLocale, opts: { date1904?: boolean; quotePrefix?: boolean } = {}): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return localizeBool(v, loc.lang);
  if (v instanceof CalcError) return localizeError(v.code, loc.lang);
  if (typeof v === 'string') return opts.quotePrefix ? "'" + v : v;
  if (cat === 'percent') return numberEditText(v * 100, loc.decimal) + '%';
  const date1904 = !!opts.date1904;
  if ((cat === 'date' || cat === 'time') && v >= 0 && v < 2958466) {
    if (cat === 'time' && v < 1) return timeOfDay(v);
    const frac = v - Math.floor(v);
    return shortDate(v, loc, date1904) + (frac > 1e-9 ? ' ' + timeOfDay(v) : '');
  }
  return numberEditText(v, loc.decimal);
}
