/**
 * Motor de formatação numérica/data fiel ao Excel (numFmt formatCode), um só
 * para Sheet e gráficos.
 *
 * O formatCode é TOKENIZADO (cache por código) e cada seção é emitida token a
 * token, como o Excel: literais entre placeholders sempre aparecem (`#\ ###\ ##0`
 * c/ 62 → "  62"), dígitos são distribuídos da direita para a esquerda (os que
 * sobram vão para o 1º placeholder), `?` vira espaço, `,` agrupa entre
 * placeholders e escala ÷1000 depois do último, só 15 algarismos
 * significativos, `_x`/`*x` (espaço da largura de x / preenchimento) ficam como
 * PARTES para quem conhece a largura da coluna, condições `[<=100]`, locale
 * `[$-409]` (nomes de mês/dia), moeda `[$€-2]`, sistema `[$-F800]`, datas com
 * arredondamento ao segundo, frações de segundo e o bug de 1900.
 * Regras MEDIDAS no Excel 365 pt-BR (Range.Text) com pastas sintéticas — lab
 * do corpus do Sheet (E:\UniversalSheetTest\_lab\syn\f).
 *
 * Este módulo é PURO (sem DOM).
 */

export interface FormatLocale {
  decimal: string;      // separador decimal (pt-BR ",")
  group: string;        // separador de milhar (pt-BR ".")
  monthsShort: string[];
  monthsLong: string[];
  daysShort: string[];
  daysLong: string[];
  ampm: [string, string];
  /**
   * Overrides dos builtins dependentes de locale (ids 14–22 no Excel) —
   * consultados ANTES de BUILTIN_FORMATS. Oráculo pt-BR: um xlsx com xf
   * numFmtId=14 exibe `17/06/2026`, não `6/17/2026`.
   */
  builtins?: Record<number, string>;
  /** Data longa do sistema (`[$-F800]`) e hora do sistema (`[$-F400]`). */
  sysDate?: string;
  sysTime?: string;
}

/** Locale padrão pt-BR (Excel 16.0 pt-BR usa nomes minúsculos). */
export const PT_BR: FormatLocale = {
  decimal: ',',
  group: '.',
  monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  monthsLong: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  daysShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  daysLong: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  ampm: ['AM', 'PM'],
  // numFmtId builtin SEM <numFmt> no arquivo → o formato do locale. Medido no
  // Excel 365 pt-BR (NumberFormat + Range.Text de cada id 0..81, lab e9):
  // moeda R$ com "-" (não parênteses), 37–40 com "-", contábeis 41–44 com R$,
  // 23–36/50–58/71–81 datas/horas do locale, 59–70 = 1–13 (tailandês no en-US).
  builtins: {
    5: '"R$ "#,##0;\\-"R$ "#,##0', 6: '"R$ "#,##0;[Red]\\-"R$ "#,##0',
    7: '"R$ "#,##0.00;\\-"R$ "#,##0.00', 8: '"R$ "#,##0.00;[Red]\\-"R$ "#,##0.00',
    14: 'dd/mm/yyyy', 15: 'dd/mmm/yy', 16: 'dd/mmm', 17: 'mmm/yy',
    20: 'hh:mm', 21: 'hh:mm:ss', 22: 'dd/mm/yyyy hh:mm',
    23: 'General', 24: 'General', 25: 'General', 26: 'General',
    27: 'dd/mm/yyyy', 28: 'dd/mm/yyyy', 29: 'dd/mm/yyyy', 30: 'dd/mm/yyyy', 31: 'dd/mm/yyyy',
    32: 'hh:mm:ss', 33: 'hh:mm:ss', 34: 'hh:mm:ss', 35: 'hh:mm:ss', 36: 'dd/mm/yyyy',
    37: '#,##0;\\-#,##0', 38: '#,##0;[Red]\\-#,##0', 39: '#,##0.00;\\-#,##0.00', 40: '#,##0.00;[Red]\\-#,##0.00',
    41: '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-',
    42: '_-"R$ "* #,##0_-;\\-"R$ "* #,##0_-;_-"R$ "* "-"_-;_-@_-',
    43: '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-',
    44: '_-"R$ "* #,##0.00_-;\\-"R$ "* #,##0.00_-;_-"R$ "* "-"??_-;_-@_-',
    50: 'dd/mm/yyyy', 51: 'dd/mm/yyyy', 52: 'dd/mm/yyyy', 53: 'dd/mm/yyyy', 54: 'dd/mm/yyyy',
    55: 'dd/mm/yyyy', 56: 'dd/mm/yyyy', 57: 'dd/mm/yyyy', 58: 'dd/mm/yyyy',
    59: '0', 60: '0.00', 61: '#,##0', 62: '#,##0.00',
    63: '"R$ "#,##0;\\-"R$ "#,##0', 64: '"R$ "#,##0;[Red]\\-"R$ "#,##0',
    65: '"R$ "#,##0.00;\\-"R$ "#,##0.00', 66: '"R$ "#,##0.00;[Red]\\-"R$ "#,##0.00',
    67: '0%', 68: '0.00%', 69: '# ?/?', 70: '# ??/??', 71: 'dd/mm/yyyy', 72: 'dd/mm/yyyy',
    73: 'dd/mmm/yy', 74: 'dd/mmm', 75: 'mmm/yy', 76: 'hh:mm', 77: 'hh:mm:ss',
    78: 'dd/mm/yyyy hh:mm', 79: 'mm:ss', 80: '[h]:mm:ss', 81: 'mm:ss.0',
  },
  // medido: [$-F800] → "quarta-feira, 1 de março de 2023"; [$-F400] → "18:00:00"
  sysDate: 'dddd, d" de "mmmm" de "yyyy',
  sysTime: 'hh:mm:ss',
};

/** Nomes de mês/dia por idioma primário do LCID (`[$-409]` → inglês). Medidos no Excel. */
const LANG_NAMES: Record<number, Pick<FormatLocale, 'monthsShort' | 'monthsLong' | 'daysShort' | 'daysLong'> & { ampm?: [string, string] }> = {
  0x09: { // inglês — "September 11, 2006", "01-Mar-2023", "Wed Mar"
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  0x16: PT_BR,
  0x0c: { // francês — "mercredi mars"
    monthsShort: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
    monthsLong: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    daysShort: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
    daysLong: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  },
  0x07: { // alemão — "Mittwoch März"
    monthsShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    monthsLong: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    daysShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    daysLong: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  },
  0x0a: { // espanhol — "miércoles marzo"
    monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    monthsLong: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    daysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    daysLong: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  },
  0x10: { // italiano
    monthsShort: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
    monthsLong: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    daysShort: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
    daysLong: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
  },
  0x11: { // japonês — "水曜日 3月"
    monthsShort: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    monthsLong: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    daysShort: ['日', '月', '火', '水', '木', '金', '土'],
    daysLong: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    ampm: ['午前', '午後'],
  },
};

export interface FormatResult {
  /** Texto exibido (já localizado). */
  text: string;
  /** Cor pedida por código `[Red]`/`[Color12]`… em #RRGGBB, se houver. */
  color?: string;
}

export interface FormatOptions {
  locale?: FormatLocale;
  /** Largura da coluna em caracteres — `*x` repete x até completá-la (sem ela, 1 vez). */
  colWidthChars?: number;
  /** Sistema de data 1904 (Mac legacy): epoch em 1904-01-01 (serial +1462). */
  date1904?: boolean;
  /** `<sheetView showZeros="0">`: zero sem seção própria de zero sai vazio. */
  showZeros?: boolean;
}

/**
 * Pedaço do texto formatado. `skip` (`_x`) ocupa a largura de x; `fill` (`*x`)
 * repete x até preencher a coluna; `general` é um número no formato Geral cuja
 * precisão depende da largura (o chamador que conhece a coluna o reduz).
 */
export type FmtPart =
  | { t: 'text'; s: string }
  | { t: 'skip'; ch: string }
  | { t: 'fill'; ch: string }
  | { t: 'general'; v: number };

export interface FormatParts {
  parts: FmtPart[];
  color?: string;
  /** Sem seção aplicável / data fora da faixa: o Excel mostra "####". */
  overflow?: boolean;
}

/** Built-ins (numFmtId → formatCode) presentes em todo styles.xml. */
export const BUILTIN_FORMATS: Record<number, string> = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00',
  5: '"$"#,##0_);("$"#,##0)', 6: '"$"#,##0_);[Red]("$"#,##0)',
  7: '"$"#,##0.00_);("$"#,##0.00)', 8: '"$"#,##0.00_);[Red]("$"#,##0.00)',
  9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
  14: 'm/d/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy',
  18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss',
  22: 'm/d/yyyy h:mm',
  37: '#,##0_);(#,##0)', 38: '#,##0_);[Red](#,##0)',
  39: '#,##0.00_);(#,##0.00)', 40: '#,##0.00_);[Red](#,##0.00)',
  45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};

/**
 * Resolve o formatCode de um numFmtId builtin honrando o locale
 * (ids 14–22 são dependentes de locale no Excel).
 */
export function builtinFormatCode(id: number, locale: FormatLocale = PT_BR): string | undefined {
  return locale.builtins?.[id] ?? BUILTIN_FORMATS[id];
}

const COLOR_NAMES: Record<string, string> = {
  black: '#000000', blue: '#0000FF', cyan: '#00FFFF', green: '#00FF00',
  magenta: '#FF00FF', red: '#FF0000', white: '#FFFFFF', yellow: '#FFFF00',
};
/** `[ColorN]` (1..56) = paleta indexada padrão do Excel (índices 8..63). */
const COLOR_N = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '800000', '008000', '000080', '808000',
  '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99',
  '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99', '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
];

// ──────────────────────────── Dígitos ────────────────────────────

/**
 * Dígitos de `v` (≥ 0) com `nFrac` casas, como o Excel: só 15 algarismos
 * significativos (o resto vira 0) e arredondamento decimal "metade para longe
 * de zero" sobre essa representação (0,005 → 0,01; 2,5 → 3). Devolve a parte
 * inteira SEM zeros à esquerda ('' para 0) e a fracionária com nFrac dígitos.
 */
export function decimalDigits(v: number, nFrac: number): [string, string] {
  if (!(v > 0) || !isFinite(v)) return ['', '0'.repeat(nFrac)];
  const s = v.toPrecision(15);
  const ei = s.indexOf('e');
  const mant = ei >= 0 ? s.slice(0, ei) : s;
  const exp = ei >= 0 ? parseInt(s.slice(ei + 1), 10) : 0;
  const dot = mant.indexOf('.');
  let digits = dot >= 0 ? mant.slice(0, dot) + mant.slice(dot + 1) : mant;
  // valor = 0.d1d2… × 10^point
  let point = (dot >= 0 ? dot : mant.length) + exp;
  let lead = 0;
  while (lead < digits.length - 1 && digits[lead] === '0') lead++;
  digits = digits.slice(lead);
  point -= lead;
  const cut = point + nFrac;
  if (cut < 0) return ['', '0'.repeat(nFrac)];
  if (cut < digits.length) {
    const up = digits.charCodeAt(cut) >= 53; // '5'
    digits = digits.slice(0, cut);
    if (up) {
      let i = digits.length - 1;
      const arr = digits.split('');
      while (i >= 0 && arr[i] === '9') { arr[i] = '0'; i--; }
      if (i >= 0) arr[i] = String.fromCharCode(arr[i]!.charCodeAt(0) + 1);
      else { arr.unshift('1'); point++; }
      digits = arr.join('');
    }
  }
  const total = point + nFrac;
  if (digits.length < total) digits = digits.padEnd(total, '0');
  let intStr: string, fracStr: string;
  if (point > 0) { intStr = digits.slice(0, point); fracStr = digits.slice(point, point + nFrac); }
  else { intStr = ''; fracStr = ('0'.repeat(-point) + digits).slice(0, nFrac); }
  intStr = intStr.replace(/^0+/, '');
  return [intStr, fracStr.padEnd(nFrac, '0')];
}


// ──────────────────────────── General ────────────────────────────

/**
 * Formato Geral do Excel com `budget` caracteres (sinal não conta; 11 numa
 * coluna larga). Estoura para científico quando o inteiro não cabe ou o
 * decimal arredondaria a zero. Oráculo: 0.6666…→"0,666666667", 1234567.89→
 * "1234567,89", 123456789012→"1,23457E+11", 999999999999→"1E+12", 1e-10→"1E-10".
 * Numa coluna estreita o chamador passa as casas que cabem (ver cell-text do
 * Sheet); devolve '' quando nem o científico mínimo cabe.
 */
export function formatGeneral(x: number, loc: FormatLocale = PT_BR, budget = 11): string {
  if (x === 0) return '0';
  if (!isFinite(x)) return '';
  const neg = x < 0;
  const a = Math.abs(x);
  const body = generalBody(a, loc, budget);
  return body === '' ? '' : (neg ? '-' : '') + body;
}

function generalBody(a: number, loc: FormatLocale, budget: number): string {
  const [ip] = decimalDigits(a, 0);
  const intLen = Math.max(1, ip.length);
  if (intLen > budget) return sciGeneral(a, loc, budget);
  const avail = budget - intLen;              // espaço p/ "," + casas
  const decimals = avail > 1 ? avail - 1 : 0;
  const [i, f] = decimalDigits(a, decimals);
  const frac = f.replace(/0+$/, '');
  if ((i === '' || i === '0') && frac === '') {
    // arredondou a zero mas o valor não é zero → científico (se couber)
    const sci = sciGeneral(a, loc, budget);
    return sci !== '' ? sci : '0';
  }
  if (i.length > budget) return sciGeneral(a, loc, budget); // 9999…,5 → 1E+n
  const dec = (i || '0') + (frac ? loc.decimal + frac : '');
  if (a < 1) {
    // coluna estreita: o científico vence se representa o valor MELHOR que o
    // decimal arredondado (0,00009 em 6 vagas → "9E-05", não "0,0001"; medido)
    const sci = sciGeneral(a, loc, budget);
    if (sci) {
      // empate: abaixo de 0,0001 o Excel fica com o científico (9,9E-05 em 6 vagas → "1E-04")
      const err = (s: string): number => Math.abs(Number(s.replace(loc.decimal, '.')) - a);
      const es = err(sci), ed = err(dec);
      if (es < ed * (1 - 1e-9) || (a < 1e-4 && ed > a * 1e-12 && es <= ed * (1 + 1e-9))) return sci;
    }
  }
  return dec;
}

function sciGeneral(a: number, loc: FormatLocale, budget: number): string {
  let e = Math.floor(Math.log10(a));
  for (let pass = 0; pass < 2; pass++) {
    const expStr = 'E' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    const room = budget - expStr.length;     // dígitos da mantissa + ","
    if (room < 1) return '';
    const dec = room >= 3 ? room - 2 : 0;
    const [i, f] = decimalDigits(a / Math.pow(10, e), dec);
    if (i.length > 1) { e++; continue; }      // 9,99… arredondou para 10
    const frac = f.replace(/0+$/, '');
    return (i || '0') + (frac ? loc.decimal + frac : '') + expStr;
  }
  return '';
}

// ──────────────────────────── Parse ────────────────────────────

type CondOp = '<' | '>' | '=' | '<=' | '>=' | '<>';
interface Cond { op: CondOp; v: number }

type Tok =
  | { k: 'lit'; s: string }
  | { k: 'dig'; c: '0' | '#' | '?' }
  | { k: 'pt' } | { k: 'comma' } | { k: 'pct' } | { k: 'slash' } | { k: 'at' } | { k: 'gen' }
  | { k: 'exp'; plus: boolean }
  | { k: 'skip'; c: string } | { k: 'fill'; c: string }
  /** data/hora: c = y|M|d|h|m|s|e|g|b|a (M = mês ou minuto, resolvido depois), n = repetições */
  | { k: 'dt'; c: string; n: number }
  | { k: 'el'; c: 'h' | 'm' | 's'; n: number }  // [h] [mm] [ss]
  | { k: 'ampm'; full: boolean; lower: boolean; upper: boolean }
  | { k: 'subsec'; n: number };                  // .0 .00 .000 depois dos segundos

interface Section {
  toks: Tok[];
  cond?: Cond;
  color?: string;
  lcid?: number;
  kind: 'num' | 'date' | 'gen' | 'text' | 'lit' | 'empty';
  // análise numérica
  scale: number;   // multiplicador (% e vírgulas de escala)
  group: boolean;
  nInt: number; nFrac: number;
  frac?: { numIdx: number[]; denIdx: number[]; fixedDen: number; intIdx: number[] };
  exp: boolean;
}

interface Parsed { secs: Section[]; text?: Section; nums: Section[]; hasCond: boolean }

const cache = new Map<string, Parsed>();

function splitSections(code: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') { const end = code.indexOf('"', i + 1); const j = end < 0 ? code.length : end; cur += code.slice(i, j + 1); i = j; continue; }
    if (ch === '[') { const end = code.indexOf(']', i + 1); const j = end < 0 ? code.length : end; cur += code.slice(i, j + 1); i = j; continue; }
    if (ch === '\\' || ch === '_' || ch === '*') { cur += code.slice(i, i + 2); i++; continue; }
    if (ch === ';') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parse(code: string): Parsed {
  let p = cache.get(code);
  if (p) return p;
  const raws = splitSections(code);
  const secs = raws.map(parseSection);
  // seção de texto: a 4ª; com menos seções, a que contém @
  let text: Section | undefined;
  let nums = secs.slice(0, 3);
  if (secs.length >= 4) text = secs[3];
  else {
    const ti = secs.findIndex((s) => s.kind === 'text');
    if (ti >= 0) { text = secs[ti]; nums = secs.filter((_, i) => i !== ti); }
  }
  p = { secs, text, nums, hasCond: nums.some((s) => s.cond) };
  if (cache.size > 2000) cache.clear();
  cache.set(code, p);
  return p;
}

const DATE_CH = /[ymdhsegba]/i;

function parseSection(raw: string): Section {
  const toks: Tok[] = [];
  let cond: Cond | undefined, color: string | undefined, lcid: number | undefined;
  const bare = raw.replace(/"[^"]*"|\\.|_.|\*.|\[[^\]]*\]/g, '');
  // seção de data: o ".000" depois dos segundos é fração de segundo, não placeholder
  const dateLike = /[ymdhs]|am\/pm|a\/p/i.test(bare.replace(/general/gi, '').replace(/e[+-]/gi, ''));
  const hasDigit = /[0#?]/.test(dateLike ? bare.replace(/\.0+/g, '') : bare);
  const lit = (s: string): void => {
    const last = toks[toks.length - 1];
    if (last && last.k === 'lit') last.s += s; else toks.push({ k: 'lit', s });
  };
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '"') { const end = raw.indexOf('"', i + 1); const j = end < 0 ? raw.length : end; lit(raw.slice(i + 1, j)); i = j; continue; }
    if (ch === '\\') { if (i + 1 < raw.length) lit(raw[i + 1]!); i++; continue; }
    if (ch === '_') { toks.push({ k: 'skip', c: raw[i + 1] ?? ' ' }); i++; continue; }
    if (ch === '*') { toks.push({ k: 'fill', c: raw[i + 1] ?? ' ' }); i++; continue; }
    if (ch === '[') {
      const end = raw.indexOf(']', i + 1); const j = end < 0 ? raw.length : end;
      const inner = raw.slice(i + 1, j); i = j;
      const low = inner.toLowerCase();
      let m: RegExpExecArray | null;
      if (/^(h+|m+|s+)$/.test(low)) { toks.push({ k: 'el', c: low[0] as 'h' | 'm' | 's', n: low.length }); continue; }
      if (COLOR_NAMES[low]) { color ??= COLOR_NAMES[low]; continue; }
      if ((m = /^color\s*(\d+)$/.exec(low))) { const n = +m[1]!; if (n >= 1 && n <= 56) color ??= '#' + COLOR_N[n - 1]; continue; }
      if ((m = /^(<=|>=|<>|<|>|=)\s*([-+]?[\d.]+(?:e[-+]?\d+)?)$/.exec(low))) { cond = { op: m[1] as CondOp, v: parseFloat(m[2]!) }; continue; }
      if (inner.startsWith('$')) {
        const body = inner.slice(1);
        const dash = body.lastIndexOf('-');
        const sym = dash >= 0 ? body.slice(0, dash) : body;
        const code = dash >= 0 ? body.slice(dash + 1) : '';
        if (sym) lit(sym);
        if (/^x-sysdate$/i.test(code)) lcid = 0xf800;
        else if (/^x-systime$/i.test(code)) lcid = 0xf400;
        else if (/^[0-9a-f]+$/i.test(code)) lcid = parseInt(code, 16) & 0xffff;
        continue;
      }
      continue; // [DBNum1], [natural]… ignorados
    }
    if ((ch === 'E' || ch === 'e') && (raw[i + 1] === '+' || raw[i + 1] === '-') && hasDigit) { toks.push({ k: 'exp', plus: raw[i + 1] === '+' }); i++; continue; }
    if (ch === '0' || ch === '#' || ch === '?') { toks.push({ k: 'dig', c: ch }); continue; }
    if (ch === '.') {
      // .0/.00/.000 logo após segundos = fração de segundo
      const prev = toks[toks.length - 1];
      const n = /^0+/.exec(raw.slice(i + 1))?.[0].length ?? 0;
      if (n > 0 && dateLike && prev && ((prev.k === 'dt' && prev.c.toLowerCase() === 's') || (prev.k === 'el' && prev.c === 's'))) { toks.push({ k: 'subsec', n }); i += n; continue; }
      toks.push({ k: 'pt' }); continue;
    }
    if (ch === ',') { toks.push({ k: 'comma' }); continue; }
    if (ch === '%') { toks.push({ k: 'pct' }); continue; }
    if (ch === '/') {
      toks.push({ k: 'slash' });
      // denominador fixo ("# ?/10"): os algarismos viram um literal só
      const m = /^[1-9][0-9]*/.exec(raw.slice(i + 1));
      if (m && hasDigit) { toks.push({ k: 'lit', s: m[0] }); i += m[0].length; }
      continue;
    }
    if (ch === '@') { toks.push({ k: 'at' }); continue; }
    if ((ch === 'G' || ch === 'g') && /^general/i.test(raw.slice(i, i + 7))) { toks.push({ k: 'gen' }); i += 6; continue; }
    if (/^am\/pm/i.test(raw.slice(i, i + 5))) { toks.push({ k: 'ampm', full: true, lower: false, upper: true }); i += 4; continue; }
    if (/^a\/p/i.test(raw.slice(i, i + 3))) { toks.push({ k: 'ampm', full: false, lower: ch === 'a', upper: ch === 'A' }); i += 2; continue; }
    if (DATE_CH.test(ch)) {
      const lc = ch.toLowerCase();
      let n = 1;
      while (i + n < raw.length && raw[i + n]!.toLowerCase() === lc) n++;
      if (lc === 'a' && n < 3) { lit(raw.slice(i, i + n)); i += n - 1; continue; }
      toks.push({ k: 'dt', c: lc === 'm' ? 'M' : lc, n });
      i += n - 1;
      continue;
    }
    lit(ch);
  }
  const sec: Section = { toks, cond, color, lcid, kind: 'lit', scale: 1, group: false, nInt: 0, nFrac: 0, exp: false };
  const has = (k: Tok['k']): boolean => toks.some((t) => t.k === k);
  if (toks.length === 0) {
    // só cor/condição ("[Red][<=100]") = Geral; seção vazia de verdade = nada
    if (raw.includes('[')) { toks.push({ k: 'gen' }); sec.kind = 'gen'; } else sec.kind = 'empty';
  }
  else if (has('dt') || has('el') || has('ampm') || has('subsec')) sec.kind = 'date';
  else if (has('gen')) sec.kind = 'gen';
  else if (has('dig')) { sec.kind = 'num'; analyzeNumber(sec); }
  else if (has('at')) sec.kind = 'text';
  if (sec.kind === 'date') resolveMinutes(toks);
  if (sec.kind !== 'num') {
    // fora da seção numérica, os tokens numéricos soltos são literais
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]!;
      if (t.k === 'pt' || t.k === 'comma' || t.k === 'slash' || t.k === 'pct' || t.k === 'dig' || t.k === 'exp') {
        const s = t.k === 'pt' ? '.' : t.k === 'comma' ? ',' : t.k === 'slash' ? '/' : t.k === 'pct' ? '%' : t.k === 'dig' ? t.c : t.plus ? 'E+' : 'E-';
        toks[i] = { k: 'lit', s };
      }
    }
  }
  return sec;
}

/** `m`/`mm` depois de h (ou [h]) ou antes de s = minuto (c='m'); senão mês (c='M'). */
function resolveMinutes(toks: Tok[]): void {
  let afterH = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (t.k === 'dt' && t.c === 'h') { afterH = true; continue; }
    if (t.k === 'el' && t.c === 'h') { afterH = true; continue; }
    if (t.k === 'dt' && t.c === 'M') {
      let beforeS = false;
      for (let j = i + 1; j < toks.length; j++) {
        const u = toks[j]!;
        if (u.k === 'lit' || u.k === 'skip') continue;
        beforeS = (u.k === 'dt' && u.c === 's') || (u.k === 'el' && u.c === 's');
        break;
      }
      if ((afterH || beforeS) && t.n <= 2) { t.c = 'm'; afterH = false; }
      continue;
    }
    if (t.k === 'dt' || t.k === 'ampm') afterH = false;
  }
}

function analyzeNumber(sec: Section): void {
  const toks = sec.toks;
  const expAt = toks.findIndex((t) => t.k === 'exp');
  sec.exp = expAt >= 0;
  const end = sec.exp ? expAt : toks.length;
  // ponto decimal: o 1º antes do expoente; os demais são literais
  let ptAt = -1;
  for (let i = 0; i < end; i++) {
    if (toks[i]!.k !== 'pt') continue;
    if (ptAt < 0) ptAt = i; else toks[i] = { k: 'lit', s: '.' };
  }
  const intEnd = ptAt >= 0 ? ptAt : end;
  // fração: placeholders / placeholders|número
  const slashAt = !sec.exp && ptAt < 0 ? toks.findIndex((t) => t.k === 'slash') : -1;
  if (slashAt > 0) {
    const numIdx: number[] = [];
    for (let j = slashAt - 1; j >= 0 && toks[j]!.k === 'dig'; j--) numIdx.unshift(j);
    const denIdx: number[] = [];
    let fixedDen = 0;
    let j = slashAt + 1;
    for (; j < toks.length && toks[j]!.k === 'dig'; j++) denIdx.push(j);
    if (!denIdx.length && toks[j]?.k === 'lit') {
      const m = /^\d+/.exec((toks[j] as { s: string }).s);
      if (m) {
        fixedDen = parseInt(m[0], 10);
        const rest = (toks[j] as { s: string }).s.slice(m[0].length);
        toks.splice(j, 1, { k: 'lit', s: '' }, ...(rest ? [{ k: 'lit', s: rest } as Tok] : []));
        denIdx.push(j); // marca a posição do denominador fixo
      }
    }
    if (numIdx.length && denIdx.length) {
      const intIdx: number[] = [];
      for (let k = 0; k < (numIdx[0] ?? 0); k++) if (toks[k]!.k === 'dig') intIdx.push(k);
      sec.frac = { numIdx, denIdx, fixedDen, intIdx };
    } else toks[slashAt] = { k: 'lit', s: '/' };
  } else if (slashAt === 0) toks[0] = { k: 'lit', s: '/' };
  for (let i = 0; i < toks.length; i++) if (toks[i]!.k === 'slash' && i !== slashAt) toks[i] = { k: 'lit', s: '/' };
  // vírgulas: entre placeholders inteiros agrupa; logo após o último placeholder escala ÷1000
  const digAt = (from: number, to: number): boolean => { for (let k = from; k < to; k++) if (toks[k]!.k === 'dig') return true; return false; };
  let lastDig = -1;
  for (let i = 0; i < toks.length; i++) if (toks[i]!.k === 'dig' && (!sec.exp || i < expAt)) lastDig = i;
  let scale = 1;
  const kind: ('group' | 'scale' | 'drop' | 'lit')[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i]!.k !== 'comma') continue;
    if (i < intEnd && digAt(0, i) && digAt(i + 1, intEnd)) { kind[i] = 'group'; continue; }
    // vírgulas encostadas ao último dígito (antes do ponto ou do fim) escalam ÷1000 cada
    let k = i - 1;
    while (k >= 0 && toks[k]!.k === 'comma') k--;
    const afterDigit = k >= 0 && toks[k]!.k === 'dig';
    let n = i + 1;
    while (n < toks.length && toks[n]!.k === 'comma') n++;
    const nextDig = n < toks.length && toks[n]!.k === 'dig';
    if (afterDigit && !nextDig && (i > lastDig || toks[n]?.k === 'pt')) kind[i] = 'scale';
    else if (sec.exp && i < expAt) kind[i] = 'drop'; // #,000E+00: só conta placeholder
    else kind[i] = 'lit';
  }
  kind.forEach((kd, i) => {
    if (kd === 'group') sec.group = true;
    if (kd === 'scale') scale /= 1000;
    toks[i] = { k: 'lit', s: kd === 'lit' ? ',' : '' };
  });
  for (const t of toks) if (t.k === 'pct') scale *= 100;
  sec.scale = scale;
  for (let i = 0; i < (sec.exp ? expAt : toks.length); i++) {
    if (toks[i]!.k !== 'dig') continue;
    if (sec.frac && (sec.frac.numIdx.includes(i) || sec.frac.denIdx.includes(i))) continue;
    if (i < intEnd) sec.nInt++; else sec.nFrac++;
  }
}

// ──────────────────────────── Entrada ────────────────────────────

/**
 * Formata em PARTES (texto, `_x`, `*x`, Geral) — para quem conhece a largura
 * da coluna (Sheet). `value` é número (numérico/data) ou string (texto).
 */
export function formatValueParts(value: number | string, code: string | undefined, opts: FormatOptions = {}): FormatParts {
  const loc = opts.locale ?? PT_BR;
  if (typeof value === 'string') {
    if (!code || /^general$/i.test(code)) return { parts: [{ t: 'text', s: value }] };
    const p = parse(code);
    if (!p.text) return { parts: [{ t: 'text', s: value }] };
    return { parts: emitText(p.text, value), color: p.text.color };
  }
  const x = value;
  if (!isFinite(x)) return { parts: [], overflow: true };
  if (!code || /^general$/i.test(code)) {
    if (x === 0 && opts.showZeros === false) return { parts: [] };
    return { parts: [{ t: 'general', v: x }] };
  }
  const p = parse(code);
  const pick = pickSection(p, x);
  if (opts.showZeros === false && x === 0 && !(p.nums.length >= 3 && pick.sec === p.nums[2])) return { parts: [] };
  if (!pick.sec) {
    if (pick.overflow) return { parts: [], overflow: true };
    return { parts: [{ t: 'general', v: pick.general ?? x }] };
  }
  const sec = pick.sec;
  const v = pick.abs ? Math.abs(x) : x;
  const neg = v < 0;
  const out: FmtPart[] = [];
  let overflow = false;
  let nonzero = false;
  switch (sec.kind) {
    case 'empty': break;
    case 'text': out.push({ t: 'general', v }); break; // número com formato de texto: Geral
    case 'gen': emitGeneralSection(sec, v, out); break;
    case 'lit': emitLiterals(sec, out); break;
    case 'date': {
      const r = emitDate(sec, Math.abs(v), loc, !!opts.date1904, neg);
      if (r === null) overflow = true; else out.push(...r);
      break;
    }
    case 'num': nonzero = emitNumber(sec, Math.abs(v), loc, out); break;
  }
  if (overflow) return { parts: [], overflow: true, color: sec.color };
  // sinal "-" no começo da seção inteira (antes dos literais): "-a5", "-  5"; some
  // quando o valor exibido arredondou a zero ("0.00" c/ −0,0001 → "0,00")
  if (neg && sec.kind === 'num' && nonzero) out.unshift({ t: 'text', s: '-' });
  // seção ÚNICA só de literais também ganha o "-" ("x" → "-x", '""' → "-", "-" → "--"; medido)
  if (neg && (sec.kind === 'lit' || sec.kind === 'empty')) out.unshift({ t: 'text', s: '-' });
  return { parts: mergeParts(lastFillOnly(out)), color: sec.color };
}

interface SectionPick { sec?: Section; abs: boolean; overflow?: boolean; general?: number }

/** Escolhe a seção e se o valor sai sem sinal (seção "negativa"). Medido no Excel pt-BR. */
function pickSection(p: Parsed, x: number): SectionPick {
  const n = p.nums;
  if (n.length === 0) return { abs: false, general: x }; // só seção de texto: número em Geral
  if (!p.hasCond) {
    if (n.length === 1) return { sec: n[0], abs: false };
    if (n.length === 2) return x < 0 ? { sec: n[1], abs: true } : { sec: n[0], abs: false };
    return x > 0 ? { sec: n[0], abs: false } : x < 0 ? { sec: n[1], abs: true } : { sec: n[2], abs: false };
  }
  // 1ª seção sem condição (só a 2ª tem): aceita os positivos ("a"0;[<-5]"b"0 c/ 0 → ####)
  const c0 = n[0]!.cond ?? { op: '>' as CondOp, v: 0 };
  if (test(c0, x)) return { sec: n[0], abs: n[0]!.cond ? negOnly(c0) : false };
  // "senão" implícito depois de uma 1ª condição: mostra o sinal após [=t] e após
  // [>t]/[>=t] com t > 0; omite nos demais (medido, e3-sign)
  const elseSign = !!n[0]!.cond && (c0.op === '=' || ((c0.op === '>' || c0.op === '>=') && c0.v > 0));
  if (n.length === 1) return { abs: !elseSign, general: elseSign ? x : Math.abs(x) }; // [>=0]0 c/ −5 → "5"
  const c1 = n[1]!.cond;
  // 2ª seção sem condição: com 3 seções é a dos negativos (sem sinal); com 2, o "senão"
  if (c1 ? test(c1, x) : n.length === 2 || x < 0) return { sec: n[1], abs: c1 ? negOnly(c1) : n.length >= 3 || !elseSign };
  if (n.length >= 3) return { sec: n[2], abs: false };
  return { abs: false, overflow: true };
}

function test(c: Cond, x: number): boolean {
  switch (c.op) {
    case '<': return x < c.v;
    case '>': return x > c.v;
    case '=': return x === c.v;
    case '<=': return x <= c.v;
    case '>=': return x >= c.v;
    case '<>': return x !== c.v;
  }
}

/** Condição que só aceita negativos: o Excel omite o "-" ([<0], [<-1], [<=-1], [=-5]; não [<=0]). */
function negOnly(c: Cond): boolean {
  return (c.op === '<' && c.v <= 0) || (c.op === '<=' && c.v < 0) || (c.op === '=' && c.v < 0);
}

/** Só o ÚLTIMO `*x` vale (medido: "0*-*=" preenche com "="; "*x0*y" com "y"). */
function lastFillOnly(out: FmtPart[]): FmtPart[] {
  let last = -1;
  out.forEach((p, i) => { if (p.t === 'fill') last = i; });
  return last < 0 ? out : out.filter((p, i) => p.t !== 'fill' || i === last);
}

function mergeParts(out: FmtPart[]): FmtPart[] {
  const r: FmtPart[] = [];
  for (const p of out) {
    const prev = r[r.length - 1];
    if (p.t === 'text') { if (p.s === '') continue; if (prev?.t === 'text') { prev.s += p.s; continue; } }
    r.push(p.t === 'text' ? { t: 'text', s: p.s } : p);
  }
  return r;
}

function emitText(sec: Section, text: string): FmtPart[] {
  const out: FmtPart[] = [];
  for (const t of sec.toks) {
    if (t.k === 'at') out.push({ t: 'text', s: text });
    else pushDecor(t, out);
  }
  return mergeParts(lastFillOnly(out));
}

function pushDecor(t: Tok, out: FmtPart[]): void {
  if (t.k === 'lit') out.push({ t: 'text', s: t.s });
  else if (t.k === 'skip') out.push({ t: 'skip', ch: t.c });
  else if (t.k === 'fill') out.push({ t: 'fill', ch: t.c });
}

function emitLiterals(sec: Section, out: FmtPart[]): void {
  for (const t of sec.toks) pushDecor(t, out);
}

function emitGeneralSection(sec: Section, v: number, out: FmtPart[]): void {
  for (const t of sec.toks) {
    if (t.k === 'gen') out.push({ t: 'general', v });
    else pushDecor(t, out);
  }
}

/**
 * Formata (texto + cor). `*x` repete x até `colWidthChars` (sem ela, 1 vez) e
 * `_x` vira um espaço — como o Range.Text de uma coluna sem largura conhecida.
 */
export function formatValue(value: number | string, code: string | undefined, opts: FormatOptions = {}): FormatResult {
  const loc = opts.locale ?? PT_BR;
  const r = formatValueParts(value, code, opts);
  if (r.overflow) return { text: '#', ...(r.color ? { color: r.color } : {}) };
  let out = '';
  let fillAt = -1, fillCh = '';
  for (const p of r.parts) {
    if (p.t === 'text') out += p.s;
    else if (p.t === 'skip') out += ' ';
    else if (p.t === 'general') out += formatGeneral(p.v, loc);
    else { fillAt = out.length; fillCh = p.ch; }
  }
  if (fillAt >= 0) {
    const reps = opts.colWidthChars ? Math.max(0, opts.colWidthChars - out.length) : 1;
    out = out.slice(0, fillAt) + fillCh.repeat(reps) + out.slice(fillAt);
  }
  return r.color ? { text: out, color: r.color } : { text: out };
}

// ──────────────────────── Seção numérica ────────────────────────

/** Emite a seção numérica; devolve se o valor EXIBIDO é diferente de zero (para o sinal). */
function emitNumber(sec: Section, a: number, loc: FormatLocale, out: FmtPart[]): boolean {
  const v = a * sec.scale;
  if (sec.exp) { emitScientific(sec, v, loc, out); return v > 0; }
  if (sec.frac) return emitFraction(sec, v, loc, out);
  const [intStr, fracStr] = decimalDigits(v, sec.nFrac);
  emitDigits(sec, intStr, fracStr, loc, out, sec.toks.length);
  return intStr !== '' || /[1-9]/.test(fracStr);
}

/** Emite os tokens [0, end) com os dígitos inteiros/fracionários distribuídos nos placeholders. */
function emitDigits(sec: Section, intStr: string, fracStr: string, loc: FormatLocale, out: FmtPart[], end: number): void {
  const toks = sec.toks;
  const n = sec.nInt;
  const len = intStr.length;
  const extra = Math.max(0, len - n);
  // posição (da direita, 0 = unidade) do dígito mais à direita de cada placeholder inteiro
  let intSeen = 0, fracSeen = 0, afterPt = false;
  // último dígito fracionário significativo (zeros finais seguem a regra do placeholder)
  let lastSig = -1;
  for (let i = 0; i < fracStr.length; i++) if (fracStr[i] !== '0') lastSig = i;
  const sepAfter = (pos: number): string => (sec.group && pos > 0 && pos % 3 === 0 ? loc.group : '');
  for (let i = 0; i < end; i++) {
    const t = toks[i]!;
    if (t.k === 'pt') {
      if (n === 0 && len > 0) out.push({ t: 'text', s: intStr }); // sem placeholder inteiro: inteiro antes do ponto
      out.push({ t: 'text', s: loc.decimal });
      afterPt = true;
      continue;
    }
    if (t.k === 'dig') {
      if (!afterPt) {
        const j = intSeen++;
        const pos = n - 1 - j;              // posição do placeholder (da direita)
        let s = '';
        if (j === 0 && extra > 0) {
          // os dígitos que sobram entram no 1º placeholder
          for (let q = 0; q <= extra; q++) { const p2 = len - 1 - q; s += intStr[q]! + sepAfter(p2); }
        } else {
          const k = len - 1 - pos;           // índice em intStr
          if (k >= 0) s = intStr[k]! + sepAfter(pos);
          else if (t.c === '0') s = '0' + sepAfter(pos);
          else if (t.c === '?') s = ' ' + (sepAfter(pos) ? ' ' : '');
          else if (len === 0 && pos === 0 && sec.nFrac === 0 && !hasZeroInt(sec)) s = ''; // "#" com 0 → ""
        }
        out.push({ t: 'text', s });
      } else {
        const j = fracSeen++;
        const d = fracStr[j] ?? '0';
        out.push({ t: 'text', s: j <= lastSig ? d : t.c === '0' ? '0' : t.c === '?' ? ' ' : '' });
      }
      continue;
    }
    if (t.k === 'pct') { out.push({ t: 'text', s: '%' }); continue; }
    pushDecor(t, out);
  }
  if (n === 0 && !toks.some((t) => t.k === 'pt') && len > 0) out.push({ t: 'text', s: intStr });
}

function hasZeroInt(sec: Section): boolean {
  let afterPt = false;
  for (const t of sec.toks) {
    if (t.k === 'pt') afterPt = true;
    else if (t.k === 'dig' && !afterPt && t.c === '0') return true;
  }
  return false;
}

function emitScientific(sec: Section, a: number, loc: FormatLocale, out: FmtPart[]): void {
  const toks = sec.toks;
  const expAt = toks.findIndex((t) => t.k === 'exp');
  const plus = (toks[expAt] as { plus: boolean }).plus;
  const nInt = Math.max(1, sec.nInt);
  let e = 0, mant = 0;
  if (a > 0) {
    e = Math.floor(Math.log10(a));
    // passo de engenharia = nº de placeholders inteiros (##0.0E+0 → múltiplos de 3)
    if (nInt > 1) e = Math.floor(e / nInt) * nInt;
    mant = a / Math.pow(10, e);
    const [ip] = decimalDigits(mant, sec.nFrac);
    if (ip.length > nInt) { e += nInt > 1 ? nInt : 1; mant = a / Math.pow(10, e); }
    else if (nInt === 1 && ip.length > 1) { e += 1; mant = a / Math.pow(10, e); }
  }
  const [intStr, fracStr] = decimalDigits(mant, sec.nFrac);
  // zero: todos os placeholders inteiros viram 0 (medido: "##0.0E+0" c/ 0 → "000,0E+0")
  emitDigits(sec, a > 0 ? intStr : '0'.repeat(Math.max(1, sec.nInt)), fracStr, loc, out, expAt);
  // E+ sempre com sinal; E- só quando o expoente é negativo ("0.0E-0" c/ 12345 → "1,2E4")
  out.push({ t: 'text', s: 'E' + (e < 0 ? '-' : plus ? '+' : '') });
  const expToks: Tok[] = toks.slice(expAt + 1);
  const minExp = expToks.filter((t) => t.k === 'dig' && t.c === '0').length;
  const es = String(Math.abs(e)).padStart(minExp, '0');
  let done = false;
  for (const t of expToks) {
    if (t.k === 'dig') { if (!done) { out.push({ t: 'text', s: es }); done = true; } continue; }
    pushDecor(t, out);
  }
}

function emitFraction(sec: Section, a: number, loc: FormatLocale, out: FmtPart[]): boolean {
  const f = sec.frac!;
  const toks = sec.toks;
  const hasInt = f.intIdx.length > 0;
  let whole = hasInt ? Math.floor(a) : 0;
  const frac = a - whole;
  const denDigits = f.fixedDen ? 0 : f.denIdx.length;
  const maxDen = f.fixedDen || Math.pow(10, denDigits) - 1;
  let bestN = 0, bestD = 1;
  if (f.fixedDen) { bestD = f.fixedDen; bestN = Math.round(frac * f.fixedDen); }
  else {
    let bestErr = Infinity;
    let lo: [number, number] = [0, 1], hi: [number, number] = [1, 0];
    // Stern–Brocot sobre a fração (frações impróprias quando não há inteiro)
    const target = frac;
    for (const cand of [[Math.floor(target), 1], [Math.ceil(target), 1]] as [number, number][]) {
      const err = Math.abs(cand[0] / cand[1] - target);
      if (err < bestErr) { bestErr = err; bestN = cand[0]; bestD = cand[1]; }
    }
    lo = [Math.floor(target), 1]; hi = [Math.floor(target) + 1, 1];
    for (let it = 0; it < 200; it++) {
      const med: [number, number] = [lo[0] + hi[0], lo[1] + hi[1]];
      if (med[1] > maxDen) break;
      const val = med[0] / med[1];
      const err = Math.abs(val - target);
      if (err < bestErr - 1e-15) { bestErr = err; bestN = med[0]; bestD = med[1]; }
      if (val < target) lo = med; else if (val > target) hi = med; else break;
    }
  }
  if (hasInt && bestN >= bestD && bestD > 0) { whole += Math.floor(bestN / bestD); bestN %= bestD; }
  const zeroFrac = bestN === 0;
  const intStr = whole > 0 ? String(whole) : '';
  const numStr = String(bestN), denStr = String(f.fixedDen || bestD);
  // parte "fração": dos literais depois do último placeholder inteiro até o denominador
  const lastInt = f.intIdx.length ? f.intIdx[f.intIdx.length - 1]! : -1;
  const fracFrom = Math.min(lastInt + 1, f.numIdx[0]!);
  const fracTo = f.denIdx[f.denIdx.length - 1]!;
  const pad = (c: string): string => (c === '0' ? '0' : c === '?' ? ' ' : '');
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (zeroFrac && hasInt && i >= fracFrom && i <= fracTo) {
      // inteiro sem fração: "?/?" e o espaço antes viram espaços da mesma largura
      // ("# ??/??" c/ 3 → "3      ")
      if (t.k === 'dig' || t.k === 'slash') out.push({ t: 'text', s: ' ' });
      else if (t.k === 'lit') out.push({ t: 'text', s: ' '.repeat(f.fixedDen && f.denIdx.includes(i) ? denStr.length : t.s.length) });
      else pushDecor(t, out);
      continue;
    }
    if (t.k === 'dig' && f.intIdx.includes(i)) {
      const j = f.intIdx.indexOf(i), n = f.intIdx.length, len = intStr.length;
      let s: string;
      if (j === 0 && len > n) s = intStr.slice(0, len - n + 1);
      else { const k = len - n + j; s = k >= 0 ? intStr[k]! : pad(t.c); }
      if (zeroFrac && whole === 0 && j === n - 1 && s === '') s = '0'; // "# ?/?" c/ 0 → "0    "
      out.push({ t: 'text', s });
      continue;
    }
    if (t.k === 'dig' && f.numIdx.includes(i)) {
      // numerador alinhado à direita
      const j = f.numIdx.indexOf(i), n = f.numIdx.length, len = numStr.length;
      let s: string;
      if (j === 0 && len > n) s = numStr.slice(0, len - n + 1);
      else { const k = len - n + j; s = k >= 0 ? numStr[k]! : pad(t.c); }
      out.push({ t: 'text', s });
      continue;
    }
    if (t.k === 'slash') { out.push({ t: 'text', s: '/' }); continue; }
    if (f.denIdx.includes(i)) {
      if (f.fixedDen) { out.push({ t: 'text', s: denStr }); continue; }
      // denominador alinhado à esquerda
      const j = f.denIdx.indexOf(i), n = f.denIdx.length;
      const s = j === n - 1 ? denStr.slice(j) || pad((t as { c: string }).c) : denStr[j] ?? pad((t as { c: string }).c);
      out.push({ t: 'text', s });
      continue;
    }
    if (t.k === 'pct') { out.push({ t: 'text', s: '%' }); continue; }
    if (t.k === 'dig') { out.push({ t: 'text', s: pad(t.c) }); continue; }
    pushDecor(t, out);
  }
  void loc;
  return whole > 0 || bestN > 0;
}

// ──────────────────────── Seção data/hora ────────────────────────

/** Serial OLE (dias desde 1899-12-30) → Date em UTC. */
export function serialToDate(serial: number): Date {
  const ms = Math.round(serial * 86400000);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}

/** Último serial válido do Excel (31/12/9999). */
const MAX_SERIAL = 2958465;

function localeFor(sec: Section, loc: FormatLocale): FormatLocale {
  if (sec.lcid === undefined) return loc;
  const names = LANG_NAMES[sec.lcid & 0x3ff];
  if (!names || names === loc) return loc;
  return { ...loc, ...names, ampm: names.ampm ?? loc.ampm };
}

/** null = fora da faixa (data negativa ou além de 9999) → "####". */
function emitDate(sec0: Section, serial: number, loc0: FormatLocale, date1904: boolean, neg: boolean): FmtPart[] | null {
  let sec = sec0;
  if (sec.lcid === 0xf800 || sec.lcid === 0xf400) {
    // data longa / hora do sistema substituem a seção inteira
    const sys = sec.lcid === 0xf800 ? loc0.sysDate ?? 'dddd, mmmm d, yyyy' : loc0.sysTime ?? 'h:mm:ss AM/PM';
    sec = { ...parseSection(sys), color: sec.color };
  }
  const loc = localeFor(sec, loc0);
  if (neg) {
    // negativo só com UM tempo decorrido sozinho ([h], [mm], [s] + literais):
    // "-120" com [h] e −5; "[h]:mm", "h:mm"… → #### (medido, lab calc/lead)
    const tt = sec.toks.filter((t) => t.k === 'dt' || t.k === 'el' || t.k === 'ampm' || t.k === 'subsec');
    if (tt.length !== 1 || tt[0]!.k !== 'el') return null;
    const r = emitDate(sec0, serial, loc0, date1904, false);
    return r && [{ t: 'text', s: '-' }, ...r];
  }
  // precisão: fração de segundo pedida (.0/.00/.000) ou segundo inteiro
  let sub = 0;
  for (const t of sec.toks) if (t.k === 'subsec') sub = Math.max(sub, Math.min(3, t.n));
  const unit = Math.pow(10, sub);
  // arredonda o serial ao segundo (ou à fração pedida): 23:59:59,9 → 00:00 do dia seguinte
  // (sobre 15 algarismos: 0,4999971064814 d = 43199,75 s → ",8", não ",7" do binário)
  const ticks = Number(decimalDigits(serial * 86400 * unit, 0)[0] || '0');
  const dayN = Math.floor(ticks / (86400 * unit));
  const sodTicks = ticks - dayN * 86400 * unit;
  if (dayN > MAX_SERIAL + (date1904 ? -1462 : 0) || serial < 0) return null;
  // calendário (o bug de 1900: 60 = 29/02/1900; serial 0 = 00/01/1900)
  let yr: number, mo: number, day: number, wd: number;
  if (date1904) {
    const d = new Date(Date.UTC(1904, 0, 1) + dayN * 86400000);
    yr = d.getUTCFullYear(); mo = d.getUTCMonth(); day = d.getUTCDate(); wd = d.getUTCDay();
  } else if (dayN === 0) { yr = 1900; mo = 0; day = 0; wd = 6; }
  else if (dayN === 60) { yr = 1900; mo = 1; day = 29; wd = 3; }
  else {
    const d = new Date(Date.UTC(1899, 11, dayN < 60 ? 31 : 30) + dayN * 86400000);
    yr = d.getUTCFullYear(); mo = d.getUTCMonth(); day = d.getUTCDate(); wd = d.getUTCDay();
    if (dayN < 60) wd = (wd + 6) % 7; // antes do dia fictício o dia da semana do Excel está 1 atrás
  }
  const sod = Math.floor(sodTicks / unit);
  const subVal = sodTicks - sod * unit;
  const h24 = Math.floor(sod / 3600), min = Math.floor((sod % 3600) / 60), sec2 = sod % 60;
  const has12 = sec.toks.some((t) => t.k === 'ampm');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const totalSec = Math.floor(ticks / unit);
  const pad = (v: number, n: number): string => String(v).padStart(n, '0');
  const out: FmtPart[] = [];
  for (const t of sec.toks) {
    switch (t.k) {
      case 'dt': {
        const n = t.n;
        switch (t.c) {
          case 'y': out.push({ t: 'text', s: n <= 2 ? pad(yr % 100, 2) : String(yr) }); break;
          case 'e': out.push({ t: 'text', s: String(yr) }); break;
          case 'g': break; // era (calendário gregoriano: vazio)
          case 'b': out.push({ t: 'text', s: n <= 2 ? pad((yr + 543) % 100, 2) : String(yr + 543) }); break;
          case 'M':
            out.push({ t: 'text', s: n === 1 ? String(mo + 1) : n === 2 ? pad(mo + 1, 2) : n === 3 ? loc.monthsShort[mo]! : n === 4 ? loc.monthsLong[mo]! : loc.monthsLong[mo]!.slice(0, 1) });
            break;
          case 'm': out.push({ t: 'text', s: n >= 2 ? pad(min, 2) : String(min) }); break;
          case 'd': out.push({ t: 'text', s: n === 1 ? String(day) : n === 2 ? pad(day, 2) : n === 3 ? loc.daysShort[wd]! : loc.daysLong[wd]! }); break;
          case 'a': out.push({ t: 'text', s: n === 3 ? loc.daysShort[wd]! : loc.daysLong[wd]! }); break;
          case 'h': { const hv = has12 ? h12 : h24; out.push({ t: 'text', s: n >= 2 ? pad(hv, 2) : String(hv) }); break; }
          case 's': out.push({ t: 'text', s: n >= 2 ? pad(sec2, 2) : String(sec2) }); break;
        }
        break;
      }
      case 'el': {
        const val = t.c === 'h' ? Math.floor(totalSec / 3600) : t.c === 'm' ? Math.floor(totalSec / 60) : totalSec;
        out.push({ t: 'text', s: pad(val, t.n) });
        break;
      }
      case 'subsec': {
        const digits = pad(subVal, sub).slice(0, t.n).padEnd(t.n, '0');
        out.push({ t: 'text', s: loc.decimal + digits });
        break;
      }
      case 'ampm': {
        const s = h24 < 12 ? loc.ampm[0] : loc.ampm[1];
        out.push({ t: 'text', s: t.full ? s : t.lower ? s[0]!.toLowerCase() : s[0]!.toUpperCase() });
        break;
      }
      default: pushDecor(t, out);
    }
  }
  return out;
}

