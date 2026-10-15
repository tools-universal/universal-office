/**
 * Convenções de VALOR por idioma (ValueLocale: texto ↔ número/data, TEXT,
 * =""&VERDADEIRO). pt-BR e en-US são os medidos (fn.ts, conferidos no oráculo
 * em test/i18n.test.ts); os demais saem do Intl do ambiente (CLDR) mais a
 * tabela do idioma do Excel (booleanos, "Geral", letras dos códigos de formato).
 */
import { EN_US, PT_BR, type ValueLocale } from '../fn.js';
import { EN_US_LANG, getLanguage } from './languages.js';

/** Moeda padrão da região (ISO 4217) dos idiomas do Excel — o Intl não expõe isso. */
const REGION_CURRENCY: Readonly<Record<string, string>> = {
  US: 'USD', GB: 'GBP', BR: 'BRL', PT: 'EUR', ES: 'EUR', MX: 'MXN', FR: 'EUR', CA: 'CAD', DE: 'EUR', AT: 'EUR', CH: 'CHF',
  IT: 'EUR', NL: 'EUR', BE: 'EUR', FI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR', GR: 'EUR',
  IE: 'EUR', BG: 'EUR', DK: 'DKK', NO: 'NOK', SE: 'SEK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', RS: 'RSD', RU: 'RUB',
  UA: 'UAH', KZ: 'KZT', TR: 'TRY', SA: 'SAR', IL: 'ILS', IN: 'INR', TH: 'THB', VN: 'VND', ID: 'IDR', MY: 'MYR', JP: 'JPY',
  CN: 'CNY', TW: 'TWD', KR: 'KRW', HK: 'HKD', AU: 'AUD', NZ: 'NZD', AR: 'ARS', CL: 'CLP', CO: 'COP',
};

const UTC = 'UTC';
const at = (y: number, m: number, d: number, h = 0): Date => new Date(Date.UTC(y, m, d, h));

/** ValueLocale derivado só do Intl (CLDR) + tabela do idioma do Excel, quando houver. */
export function deriveValueLocale(id: string): ValueLocale {
  const lang = getLanguage(id) ?? EN_US_LANG;
  const nf = new Intl.NumberFormat(id).formatToParts(1234567.5);
  const decimal = nf.find((p) => p.type === 'decimal')?.value ?? '.';
  const group = nf.find((p) => p.type === 'group')?.value ?? '';
  const fmt = (o: Intl.DateTimeFormatOptions, d: Date): string => new Intl.DateTimeFormat(id, { ...o, timeZone: UTC }).format(d);
  const monthNames = Array.from({ length: 12 }, (_, m) => fmt({ month: 'long' }, at(2024, m, 1)));
  const monthAbbr = Array.from({ length: 12 }, (_, m) => fmt({ month: 'short' }, at(2024, m, 1)));
  const dayNames = Array.from({ length: 7 }, (_, d) => fmt({ weekday: 'long' }, at(2024, 0, 7 + d)));
  const dayAbbr = Array.from({ length: 7 }, (_, d) => fmt({ weekday: 'short' }, at(2024, 0, 7 + d)));
  const dparts = new Intl.DateTimeFormat(id, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: UTC }).formatToParts(at(2024, 10, 23));
  const order = dparts.filter((p) => p.type === 'year' || p.type === 'month' || p.type === 'day').map((p) => p.type[0]!.toUpperCase()).join('');
  const dateOrder = order === 'MDY' || order === 'YMD' ? order : 'DMY';
  const dateSep = dparts.find((p) => p.type === 'literal')?.value.trim() || '/';
  const tparts = new Intl.DateTimeFormat(id, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: UTC }).formatToParts(at(2024, 0, 1, 13));
  const timeSep = tparts.find((p) => p.type === 'literal')?.value ?? ':';
  const period = (h: number): string => new Intl.DateTimeFormat(id, { hour: 'numeric', hour12: true, timeZone: UTC })
    .formatToParts(at(2024, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value ?? (h < 12 ? 'AM' : 'PM');
  const region = new Intl.Locale(id).maximize().region ?? 'US';
  const code = REGION_CURRENCY[region];
  const currency = code
    ? new Intl.NumberFormat(id, { style: 'currency', currency: code }).formatToParts(1).find((p) => p.type === 'currency')?.value ?? code
    : '$';
  const f = lang.format;
  return {
    id, decimal, group,
    trueText: lang.bools?.[0] ?? 'TRUE', falseText: lang.bools?.[1] ?? 'FALSE',
    dateOrder, dateSep, timeSep, am: period(1), pm: period(13),
    monthNames, monthAbbr, dayNames, dayAbbr, currency,
    generalName: f?.general ?? 'General',
    formatLetters: { year: f?.year ?? 'y', month: f?.month ?? 'm', day: f?.day ?? 'd', hour: f?.hour ?? 'h', minute: f?.minute ?? 'm', second: f?.second ?? 's' },
  };
}

const CACHE = new Map<string, ValueLocale>();

/** Convenções de valor do idioma: as medidas (pt-BR, en-US) ou derivadas do Intl. */
export function valueLocaleFor(id: string): ValueLocale {
  const k = id.toLowerCase();
  if (k === 'pt-br') return PT_BR;
  if (k === 'en-us') return EN_US;
  let v = CACHE.get(k);
  if (!v) { v = deriveValueLocale(id); CACHE.set(k, v); }
  return v;
}
