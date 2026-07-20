/**
 * Motor de formatação numérica/data fiel ao oráculo (numFmt formatCode).
 *
 * Replicar o app de referência 1:1 exige tratar: General (limite de ~11 caracteres + virada
 * para notação científica), seções `pos;neg;zero;texto`, agrupamento e separador
 * decimal LOCALIZADOS (pt-BR: milhar "." e decimal ","), porcentagem, notação
 * científica `E+`, frações `?/?`, texto `@`, literais (`"..."`, `\x`), espaçador
 * `_x`, preenchimento `*x`, cores entre colchetes (`[Red]`) e tempo decorrido
 * (`[h]`/`[m]`/`[s]`). Cada regra é fixada pelo oráculo real do app de referência em
 * tools/excel-lab/results/oracle-format.json (app de referência 16.0 pt-BR).
 *
 * Este módulo é PURO (sem DOM) — vive no core para ser testável e reutilizável
 * pelo renderer e por exportadores.
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
   * Overrides dos builtins dependentes de locale (ids 14–22 no app de
   * referência) — consultados ANTES de BUILTIN_FORMATS. Capturado do oráculo
   * pt-BR: um xlsx com xf numFmtId=14 exibe `17/06/2026`, não `6/17/2026`.
   */
  builtins?: Record<number, string>;
}

/** Locale padrão pt-BR (app de referência 16.0 pt-BR usa nomes minúsculos). */
export const PT_BR: FormatLocale = {
  decimal: ',',
  group: '.',
  monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  monthsLong: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  daysShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  daysLong: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  ampm: ['AM', 'PM'],
  // Oráculo COM 2026-07-01 (builtin-probe.xlsx): NumberFormatLocal por id —
  // 14 dd/mm/aaaa · 15 dd/mmm/aa · 16 dd/mmm · 17 mmm/aa · 20 hh:mm ·
  // 21 hh:mm:ss · 22 dd/mm/aaaa hh:mm (18/19 iguais ao en-US)
  builtins: {
    14: 'dd/mm/yyyy', 15: 'dd/mmm/yy', 16: 'dd/mmm', 17: 'mmm/yy',
    20: 'hh:mm', 21: 'hh:mm:ss', 22: 'dd/mm/yyyy hh:mm',
  },
};

export interface FormatResult {
  /** Texto exibido (já localizado). */
  text: string;
  /** Cor pedida por código `[Red]`/`[Blue]`… em #RRGGBB, se houver. */
  color?: string;
}

export interface FormatOptions {
  locale?: FormatLocale;
  /** Largura da coluna em caracteres — habilita o preenchimento `*x` (raro). */
  colWidthChars?: number;
  /** Sistema de data 1904 (Mac legacy): epoch em 1904-01-01 (serial +1462). */
  date1904?: boolean;
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
 * (ids 14–22 são dependentes de locale no app de referência).
 */
export function builtinFormatCode(id: number, locale: FormatLocale = PT_BR): string | undefined {
  return locale.builtins?.[id] ?? BUILTIN_FORMATS[id];
}

const COLOR_NAMES: Record<string, string> = {
  black: '#000000', blue: '#0000FF', cyan: '#00FFFF', green: '#008000',
  magenta: '#FF00FF', red: '#FF0000', white: '#FFFFFF', yellow: '#FFFF00',
};

/** Arredonda `a` para `d` casas como o app de referência (metade para longe de zero). */
function excelRound(a: number, d: number): number {
  if (!isFinite(a) || a === 0) return a;
  const neg = a < 0;
  const f = Math.pow(10, d);
  // toPrecision(15) remove o ruído binário (ex.: 0.005*100 = 0.5000…01 → 0.5),
  // garantindo o arredondamento "metade para cima" do app de referência (0.005→0.01).
  const scaled = Number((Math.abs(a) * f).toPrecision(15));
  return (neg ? -1 : 1) * Math.round(scaled) / f;
}

/** Insere separador de milhar em uma string de dígitos inteiros (sem sinal). */
function groupInt(digits: string, sep: string): string {
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += sep;
    out += digits[i];
  }
  return out;
}

// ──────────────────────────── General ────────────────────────────

/**
 * Formato General do app de referência: cabe em ~11 caracteres (a parte numérica, sem sinal);
 * estoura para notação científica quando inteiro não cabe ou o decimal seria
 * arredondado a zero. Fixado pelo oráculo: 0.6666…→"0,666666667", 1234567.89→
 * "1234567,89", 123456789012→"1,23457E+11", 999999999999→"1E+12", 1e-10→"1E-10".
 */
export function formatGeneral(x: number, loc: FormatLocale = PT_BR): string {
  if (x === 0) return '0';
  if (!isFinite(x)) return x > 0 ? '' : '';
  const neg = x < 0;
  const a = Math.abs(x);
  const BUDGET = 11; // caracteres da parte numérica (separador conta, sinal não)
  const intLen = a >= 1 ? Math.floor(Math.log10(a)) + 1 : 1;

  let body: string;
  if (intLen > BUDGET) {
    body = sciGeneral(a, loc, BUDGET);
  } else {
    const avail = BUDGET - intLen;             // espaço p/ "."+casas
    const decimals = avail > 1 ? avail - 1 : 0;
    const rounded = excelRound(a, decimals);
    let s = rounded.toFixed(decimals);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (decimals > 0 && (s === '0' || s === '')) {
      // decimal arredondou a zero mas o valor não é zero → científico
      body = sciGeneral(a, loc, BUDGET);
    } else {
      body = s.replace('.', loc.decimal);
    }
  }
  return neg ? '-' + body : body;
}

function sciGeneral(a: number, loc: FormatLocale, budget: number): string {
  let e = Math.floor(Math.log10(a));
  let mant = a / Math.pow(10, e);
  const expDigits = Math.max(2, String(Math.abs(e)).length);
  let expStr = 'E' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(expDigits, '0');
  let mantDecimals = Math.max(0, budget - expStr.length - 2);
  let m = mant.toFixed(mantDecimals);
  if (parseFloat(m) >= 10) {
    e += 1;
    mant = a / Math.pow(10, e);
    const ed = Math.max(2, String(Math.abs(e)).length);
    expStr = 'E' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(ed, '0');
    mantDecimals = Math.max(0, budget - expStr.length - 2);
    m = mant.toFixed(mantDecimals);
  }
  if (m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
  return m.replace('.', loc.decimal) + expStr;
}

// ──────────────────────────── Seções ────────────────────────────

/** Divide o formatCode em seções por `;` respeitando aspas/colchetes/escape. */
function splitSections(code: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') { const end = code.indexOf('"', i + 1); const j = end < 0 ? code.length : end; cur += code.slice(i, j + 1); i = j; continue; }
    if (ch === '[') { const end = code.indexOf(']', i + 1); const j = end < 0 ? code.length : end; cur += code.slice(i, j + 1); i = j; continue; }
    if (ch === '\\') { cur += code.slice(i, i + 2); i++; continue; }
    if (ch === ';') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Remove literais/escape/colchetes — sobra só a "gramática" da seção. */
function stripDecor(section: string): string {
  let out = '';
  for (let i = 0; i < section.length; i++) {
    const ch = section[i]!;
    if (ch === '"') { const end = section.indexOf('"', i + 1); i = end < 0 ? section.length : end; continue; }
    if (ch === '[') { const end = section.indexOf(']', i + 1); i = end < 0 ? section.length : end; continue; }
    if (ch === '\\') { i++; continue; }
    if (ch === '_') { i++; continue; } // _x = espaço da largura de x
    out += ch;
  }
  return out;
}

function isDateSection(section: string): boolean {
  // [h]/[m]/[s] (decorridos) e tokens y/m/d/h/s/AM-PM fora de literais.
  if (/\[(hh?|mm?|ss?)\]/i.test(section)) return true;
  const bare = stripDecor(section).replace(/AM\/PM/gi, '').replace(/A\/P/gi, '');
  return /[ymdhs]/i.test(bare);
}

// ──────────────────────────── Entrada ────────────────────────────

/**
 * Formata um valor de célula segundo um formatCode OOXML. `value` é número
 * (numérico/data) ou string (texto). Retorna texto + cor opcional.
 */
export function formatValue(
  value: number | string,
  code: string | undefined,
  opts: FormatOptions = {},
): FormatResult {
  const loc = opts.locale ?? PT_BR;
  const isText = typeof value === 'string';

  if (!code || code === 'General') {
    if (isText) return { text: value };
    return { text: formatGeneral(value as number, loc) };
  }

  const sections = splitSections(code);

  // Texto: usa a 4ª seção se existir; senão devolve cru (o app de referência ignora numéricos).
  if (isText) {
    const tsec = sections[3];
    if (tsec !== undefined && tsec.includes('@')) return applyTextSection(tsec, value as string);
    return { text: value };
  }

  const num = value as number;
  // Escolha de seção: pos / neg / zero (texto fica na 4ª).
  let section: string;
  let useAbs = false;
  if (num > 0) section = sections[0]!;
  else if (num < 0) {
    if (sections.length >= 2) { section = sections[1]!; useAbs = true; }
    else section = sections[0]!; // 1 seção → sinal automático
  } else {
    section = sections.length >= 3 ? sections[2]! : sections[0]!;
  }

  const { color, body } = extractColor(section);
  const magnitude = useAbs ? Math.abs(num) : num;

  if (isDateSection(body)) {
    return { text: formatDateSection(magnitude, body, loc, !!opts.date1904), color };
  }
  // 1 seção e negativo: prefixo "-" automático.
  const autoNeg = num < 0 && sections.length < 2;
  const r = formatNumberSection(Math.abs(num), body, loc, opts);
  return { text: (autoNeg ? '-' : '') + r, color };
}

function applyTextSection(section: string, text: string): FormatResult {
  const { color, body } = extractColor(section);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (ch === '"') { const end = body.indexOf('"', i + 1); const j = end < 0 ? body.length : end; out += body.slice(i + 1, j); i = j; continue; }
    if (ch === '\\') { out += body[i + 1] ?? ''; i++; continue; }
    if (ch === '@') { out += text; continue; }
    if (ch === '_') { out += ' '; i++; continue; }
    if (ch === '*') { i++; continue; }
    out += ch;
  }
  return { text: out, color };
}

/** Extrai a 1ª cor `[Red]`/`[Color12]` e remove TODOS os colchetes não-decorridos. */
function extractColor(section: string): { color?: string; body: string } {
  let color: string | undefined;
  let body = '';
  for (let i = 0; i < section.length; i++) {
    const ch = section[i]!;
    if (ch === '[') {
      const end = section.indexOf(']', i + 1);
      const j = end < 0 ? section.length : end;
      const inner = section.slice(i + 1, j);
      const low = inner.toLowerCase();
      if (/^(hh?|mm?|ss?)$/.test(low)) { body += section.slice(i, j + 1); i = j; continue; } // tempo decorrido: preserva
      if (COLOR_NAMES[low] && color === undefined) color = COLOR_NAMES[low];
      else if (/^color\s*\d+$/.test(low) && color === undefined) color = '#000000';
      // condições [>x]/[$-409]/locale: descartadas (escolha de seção simplificada)
      i = j; continue;
    }
    body += ch;
  }
  return { color, body };
}

// ──────────────────────── Seção numérica ────────────────────────

function formatNumberSection(a: number, section: string, loc: FormatLocale, opts: FormatOptions): string {
  // `@` numa seção numérica = valor como texto (representação General).
  if (section.includes('@')) return applyTextSection(section, formatGeneral(a, loc)).text;
  // Fração: "?/?" ou "0/0".
  if (/[?#0]+\s*\/\s*[?#0]+/.test(section) || /\/[?#0]/.test(section)) {
    return formatFraction(a, section, loc);
  }
  // Notação científica: token E+/E-.
  if (/[eE][+-]/.test(section)) {
    return formatScientificSection(a, section, loc);
  }

  // Encontra o "spec" numérico contíguo ([#0?] e companhia).
  const specMatch = section.match(/[#0?][#0?,.%]*/);
  const numSpec = specMatch ? specMatch[0] : '';
  // Seção só-literal (ex.: "zero") — sem placeholder numérico: não injeta número.
  if (!numSpec) return emitSection(section, '', '', opts);

  // Escala: porcentagem (×100 por %), vírgula final (÷1000 por vírgula trailing).
  let scaled = a;
  const pctCount = (numSpec.match(/%/g) ?? []).length;
  if (pctCount) scaled *= Math.pow(100, pctCount);
  const intSpecRaw = numSpec.split('.')[0] ?? '';
  const trailingCommas = (intSpecRaw.match(/,+$/)?.[0]?.length) ?? 0;
  if (trailingCommas) scaled /= Math.pow(1000, trailingCommas);

  const dotIdx = numSpec.indexOf('.');
  const fracSpec = dotIdx >= 0 ? numSpec.slice(dotIdx + 1).replace(/[^0#?]/g, '') : '';
  const intSpec = (dotIdx >= 0 ? numSpec.slice(0, dotIdx) : numSpec).replace(/[^0#?]/g, '');
  const grouped = /[#0?],[#0?]/.test(numSpec.split('.')[0] ?? '');

  const decimals = fracSpec.length;
  const rounded = excelRound(scaled, decimals);
  const fixed = rounded.toFixed(decimals);
  let [intDigits, fracDigits] = fixed.split('.') as [string, string?];
  intDigits = intDigits.replace('-', '');

  // Inteiro: respeita mínimo de zeros; remove zeros à esquerda (mas mantém "0"
  // quando há ao menos um `0` no spec e o inteiro é vazio/zero).
  const minInt = (intSpec.match(/0/g) ?? []).length;
  let intOut = intDigits.replace(/^0+/, '');
  if (intOut.length < minInt) intOut = intOut.padStart(minInt, '0');
  if (intOut === '' && minInt === 0 && decimals > 0) intOut = ''; // ".5" estilo
  if (intOut === '' && (minInt > 0 || decimals === 0)) intOut = '0';
  if (grouped && intOut !== '') intOut = groupInt(intOut, loc.group);

  // Fração: ronda já feita; aplica `0`/`#`/`?` da direita p/ esquerda.
  let fracOut = '';
  if (decimals > 0) {
    const fd = (fracDigits ?? '').padEnd(decimals, '0');
    const chars: string[] = [];
    let sigAfter = false; // há dígito significativo à direita desta posição?
    for (let i = decimals - 1; i >= 0; i--) {
      const ph = fracSpec[i] ?? '#';
      const dig = fd[i] ?? '0';
      if (dig !== '0') { chars.unshift(dig); sigAfter = true; }
      else if (ph === '0') chars.unshift('0');
      else if (ph === '?') chars.unshift(' ');
      else {
        // '#': zero insignificante é SUPRIMIDO mesmo com slots `0` depois
        // (oráculo: `#.##000` c/ 1999,9 → "1999,9000", não "1999,90000")
        if (sigAfter) chars.unshift('0');
      }
    }
    fracOut = chars.join('');
  }

  let numberText = intOut + (fracOut !== '' || (decimals > 0 && fracSpec.includes('0')) ? loc.decimal + fracOut : '');
  if (pctCount) numberText += '%'.repeat(pctCount); // o % é literal além de escalar

  // Reemite a seção, trocando o spec pelo número; trata literais/_/*/escape.
  return emitSection(section, numSpec, numberText, opts);
}

/** Caminha pela seção emitindo literais e injetando o número no lugar do spec. */
function emitSection(section: string, numSpec: string, numberText: string, opts: FormatOptions): string {
  let out = '';
  let emitted = false;
  for (let i = 0; i < section.length; i++) {
    const ch = section[i]!;
    if (!emitted && numSpec && section.startsWith(numSpec, i)) { out += numberText; i += numSpec.length - 1; emitted = true; continue; }
    if (ch === '"') { const end = section.indexOf('"', i + 1); const j = end < 0 ? section.length : end; out += section.slice(i + 1, j); i = j; continue; }
    if (ch === '\\') { out += section[i + 1] ?? ''; i++; continue; }
    if (ch === '_') { out += ' '; i++; continue; }              // espaço da largura de x
    if (ch === '*') {                                            // preenche col com x
      const fill = section[i + 1] ?? ' ';
      const reps = opts.colWidthChars ? Math.max(0, opts.colWidthChars - out.length) : 1;
      out += fill.repeat(reps); i++; continue;
    }
    if ('#0?,.%'.includes(ch)) continue; // restos do spec já consumidos
    if (ch === '[') { const end = section.indexOf(']', i + 1); i = end < 0 ? section.length : end; continue; }
    out += ch;
  }
  if (!emitted && numberText !== '') out += numberText;
  return out;
}

function formatScientificSection(a: number, section: string, loc: FormatLocale): string {
  // mantissa aceita separador de grupo (`#,000E+00`): o `,` não agrupa aqui,
  // só entra na CONTAGEM de placeholders inteiros que fixa o passo do expoente
  const m = section.match(/([#0?][#0?,]*(?:\.[#0?]*)?)?[eE]([+-])([0#]+)/);
  if (!m) return formatGeneral(a, loc);
  const mantSpec = m[1] ?? '0';
  const sign = m[2]!;
  const expSpec = m[3] ?? '0';
  const mantDecimals = (mantSpec.split('.')[1] ?? '').replace(/[^0#?]/g, '').length;
  const mantInt = (mantSpec.split('.')[0] ?? '0').replace(/[^0#?]/g, '');
  const intDigits = Math.max(1, mantInt.length); // #,000E+00 → engenharia (passo 4)
  const minInt = (mantInt.match(/0/g) ?? []).length;
  const padInt = (s: string): string => {
    const neg = s.startsWith('-');
    const [ip, fp] = s.replace('-', '').split('.') as [string, string?];
    const padded = ip.length < minInt ? ip.padStart(minInt, '0') : ip;
    return (neg ? '-' : '') + padded + (fp !== undefined ? '.' + fp : '');
  };

  if (a === 0) {
    const mant = padInt((0).toFixed(mantDecimals)).replace('.', loc.decimal);
    return `${mant}E${sign === '-' ? '+' : '+'}${'0'.padStart(expSpec.length, '0')}`;
  }
  let e = Math.floor(Math.log10(Math.abs(a)));
  // alinha expoente a múltiplo de intDigits (engenharia) quando intDigits>1
  let e2 = intDigits > 1 ? Math.floor(e / intDigits) * intDigits : e;
  let mant = a / Math.pow(10, e2);
  let mantStr = excelRound(mant, mantDecimals).toFixed(mantDecimals);
  // renormaliza se arredondou p/ cima passando do limite de dígitos inteiros
  if (Math.abs(parseFloat(mantStr)) >= Math.pow(10, intDigits)) {
    e2 += intDigits; mant = a / Math.pow(10, e2); mantStr = excelRound(mant, mantDecimals).toFixed(mantDecimals);
  }
  const expDigits = (expSpec.match(/0/g) ?? []).length || expSpec.length;
  const expOut = String(Math.abs(e2)).padStart(expDigits, '0');
  const expSign = e2 < 0 ? '-' : '+';
  return `${padInt(mantStr).replace('.', loc.decimal)}E${expSign}${expOut}`;
}

/** Aproxima `a` por fração com denominador limitado pelos placeholders (Stern-Brocot). */
function formatFraction(a: number, section: string, loc: FormatLocale): string {
  const m = section.match(/([#0?]+)\s*\/\s*([#0?]+|\d+)/);
  if (!m) return formatGeneral(a, loc);
  const numPh = m[1]!;
  const denPh = m[2]!;
  const whole = Math.floor(a);
  let frac = a - whole;
  const fixedDen = /^\d+$/.test(denPh) ? parseInt(denPh, 10) : 0;
  const maxDen = fixedDen || (Math.pow(10, denPh.length) - 1);

  let bestN = 0, bestD = 1, bestErr = Infinity;
  if (fixedDen) {
    bestD = fixedDen; bestN = Math.round(frac * fixedDen); bestErr = 0;
  } else {
    // Stern-Brocot: melhor aproximação com den <= maxDen.
    let lo: [number, number] = [0, 1], hi: [number, number] = [1, 1];
    for (let it = 0; it < 64; it++) {
      const med: [number, number] = [lo[0] + hi[0], lo[1] + hi[1]];
      if (med[1] > maxDen) break;
      const val = med[0] / med[1];
      if (Math.abs(val - frac) < bestErr) { bestErr = Math.abs(val - frac); bestN = med[0]; bestD = med[1]; }
      if (val < frac) lo = med; else hi = med;
    }
    for (const cand of [lo, hi]) {
      if (cand[1] <= maxDen) { const err = Math.abs(cand[0] / cand[1] - frac); if (err < bestErr) { bestErr = err; bestN = cand[0]; bestD = cand[1]; } }
    }
  }
  let wholeOut = whole;
  if (bestN >= bestD && bestD > 0) { wholeOut += Math.floor(bestN / bestD); bestN = bestN % bestD; }

  // Sem parte fracionária → mostra inteiro (com a parte inteira do template).
  const intPh = section.match(/^([#0?,]+)/)?.[1] ?? '';
  const hasWholePh = /[#0?]/.test(intPh) || section.includes(' ');
  let head = '';
  if (bestN === 0) {
    head = String(wholeOut);
    // remove a parte "/den" → mostra só inteiro
    return head;
  }
  const numStr = String(bestN).padStart(numPh.length, ' ');
  const denStr = (fixedDen ? String(fixedDen) : String(bestD)).padEnd(denPh.length, ' ');
  const wholeStr = wholeOut === 0 ? (hasWholePh ? '' : '') : String(wholeOut);
  // espaço literal entre inteiro e fração vem do próprio template "# ?/?"
  const sep = section.includes(' ') ? ' ' : '';
  return `${wholeStr}${sep}${numStr}/${denStr}`;
}

// ──────────────────────── Seção data/hora ────────────────────────

/** Serial OLE (dias desde 1899-12-30) → Date em UTC. */
export function serialToDate(serial: number): Date {
  const ms = Math.round(serial * 86400000);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}

function formatDateSection(serial: number, code: string, loc: FormatLocale, date1904 = false): string {
  // Tokens de calendário usam o epoch (deslocado +1462 no sistema 1904); os de
  // tempo decorrido ([h]/[m]/[s]) usam o serial cru (duração, sem epoch).
  const d = serialToDate(date1904 ? serial + 1462 : serial);
  const yr = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate(), wd = d.getUTCDay();
  const h24 = d.getUTCHours(), min = d.getUTCMinutes(), sec = d.getUTCSeconds();
  const has12 = /AM\/PM|A\/P/i.test(code);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  let out = '';
  let prevTime = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') { const end = code.indexOf('"', i + 1); const j = end < 0 ? code.length : end; out += code.slice(i + 1, j); i = j; continue; }
    if (ch === '\\') { out += code[i + 1] ?? ''; i++; continue; }
    if (ch === '[') {
      const end = code.indexOf(']', i + 1); const j = end < 0 ? code.length : end;
      const inner = code.slice(i + 1, j).toLowerCase(); i = j;
      if (inner[0] === 'h') out += String(Math.floor(serial * 24)).padStart(inner.length, '0');
      else if (inner[0] === 'm') out += String(Math.floor(serial * 1440)).padStart(inner.length, '0');
      else if (inner[0] === 's') out += String(Math.floor(serial * 86400)).padStart(inner.length, '0');
      prevTime = true; // após tempo decorrido, um `m` seguinte é minuto
      continue;
    }
    if (/AM\/PM/i.test(code.slice(i, i + 5))) { out += h24 < 12 ? loc.ampm[0] : loc.ampm[1]; i += 4; prevTime = false; continue; }
    if (/A\/P/i.test(code.slice(i, i + 3))) { out += (h24 < 12 ? loc.ampm[0] : loc.ampm[1]).slice(0, 1); i += 2; prevTime = false; continue; }
    if (/[ymdhs]/i.test(ch)) {
      let run = '';
      while (i < code.length && code[i]!.toLowerCase() === ch.toLowerCase()) { run += code[i]; i++; }
      i--;
      const L = run.length, lower = ch.toLowerCase();
      if (lower === 'y') out += L >= 3 ? String(yr) : String(yr).slice(-2).padStart(2, '0');
      else if (lower === 'd') {
        if (L >= 4) out += loc.daysLong[wd];
        else if (L === 3) out += loc.daysShort[wd];
        else out += L === 2 ? String(day).padStart(2, '0') : String(day);
      } else if (lower === 'h') { out += L >= 2 ? String(has12 ? h12 : h24).padStart(2, '0') : String(has12 ? h12 : h24); prevTime = true; }
      else if (lower === 's') { out += L >= 2 ? String(sec).padStart(2, '0') : String(sec); prevTime = true; }
      else if (lower === 'm') {
        // 'm' = minuto se vizinho de hora/segundo; senão mês.
        const isMinute = prevTime || /^[\s:.]*s/i.test(code.slice(i + 1));
        if (isMinute) { out += L >= 2 ? String(min).padStart(2, '0') : String(min); prevTime = false; }
        else if (L >= 4) out += loc.monthsLong[mo];
        else if (L === 3) out += loc.monthsShort[mo];
        else out += L === 2 ? String(mo + 1).padStart(2, '0') : String(mo + 1);
      }
      continue;
    }
    if (ch === '_') { out += ' '; i++; continue; }
    if (ch === '*') { i++; continue; }
    out += ch;
  }
  return out;
}
