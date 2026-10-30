// Campo de fórmula (= …) recalculado na diagramação: aritmética sobre os campos de
// página aninhados — { = { NUMPAGES } - 1 }, o "total sem a capa". Medido no Word
// 365 pt-BR (lab numpages: capa + 3 páginas, titlePg, start=0): no cabeçalho/
// rodapé o Word recalcula toda fórmula a cada página; no corpo, só a que tem campo
// aninhado (a fórmula sem campo fica com o resultado em cache). Resultado sem
// formato: casas até 2 com vírgula ("1,33"); \# "00" = imagem numérica; \* roman
// etc. = formato de número. A avaliação é segura e pequena de propósito: números,
// + - * /, parênteses e sinal — nada de funções, indicadores ou células (o que não
// cabe nisso mantém o resultado em cache, como antes).
import { formatFormulaResult, formatPicture } from '@universal-office/docx-core';
import { formatNumber } from './numbering.js';

/** Valor de um campo aninhado (o mesmo `ParaEnv.field` do parágrafo). */
export type FieldValue = (name: string, instr: string) => string | undefined;

/** Formatos gerais (\* …) aceitos no resultado da fórmula. */
const GENERAL: Record<string, string> = {
  ARABIC: 'decimal', ROMAN: 'upperRoman', roman: 'lowerRoman', ALPHABETIC: 'upperLetter', alphabetic: 'lowerLetter',
};

/** Nome do campo (1ª palavra, maiúscula); "=4-1" → "=". */
export const fieldName = (instr: string): string => {
  const t = instr.trim();
  return t.startsWith('=') ? '=' : (t.split(/\s+/)[0] ?? '').toUpperCase();
};

/** O código tem campo aninhado (fieldCode com chaves)? */
export const hasNestedField = (code: string | undefined): boolean => !!code && /\{[^{}]*\}/.test(code);

/**
 * Resultado de uma fórmula `= …` (código com os campos aninhados entre chaves,
 * `Run.fieldCode`, ou a instrução simples). undefined = não dá para calcular
 * (campo aninhado sem valor numérico, função, indicador, erro de sintaxe ou
 * divisão por zero) — quem chama mantém o resultado em cache.
 */
export function evaluateFieldFormula(code: string, value: FieldValue, lang?: string): string | undefined {
  const flat = substituteNested(code, value, lang, 0);
  if (flat === undefined) return undefined;
  const m = /^\s*=([^\\]*)((?:\\[\s\S]*)?)$/.exec(flat);
  if (!m) return undefined;
  const parsed = parseArithmetic(m[1]!);
  if (!parsed) return undefined;
  const { value: v, decimals } = parsed;
  const switches = m[2] ?? '';
  const picture = /\\#\s*(?:"([^"]*)"|(\S+))/.exec(switches);
  if (picture) return formatPicture(v, picture[1] ?? picture[2]!);
  const general = [...switches.matchAll(/\\\*\s*(\w+)/g)].map((x) => x[1]!).find((f) => f.toUpperCase() !== 'MERGEFORMAT' && f.toUpperCase() !== 'CHARFORMAT');
  if (general) {
    const fmt = GENERAL[general] ?? GENERAL[general.toUpperCase()];
    // o Word só converte inteiro positivo; o resto fica como número
    if (fmt && Number.isInteger(v) && v > 0) return formatNumber(v, fmt, lang);
  }
  return formatFormulaResult(v, { n: v, decimals, thousands: false });
}

/** Troca cada campo aninhado { … } (do mais interno para fora) pelo valor numérico. */
function substituteNested(code: string, value: FieldValue, lang: string | undefined, depth: number): string | undefined {
  if (depth > 20) return undefined;
  let out = code;
  for (let guard = 0; guard < 200; guard++) {
    const m = /\{([^{}]*)\}/.exec(out);
    if (!m) return out;
    const inner = m[1]!;
    const name = fieldName(inner);
    const v = name === '=' ? evaluateFieldFormula(inner, value, lang) : value(name, ` ${inner.trim()} `);
    if (v === undefined) return undefined;
    const n = parseNumber(v.trim());
    if (n === undefined) return undefined;
    // o número entra na fórmula na notação do pt-BR (vírgula decimal)
    out = out.slice(0, m.index) + ` ${String(n).replace('.', ',')} ` + out.slice(m.index + m[0].length);
  }
  return undefined;
}

/** Número exibido por um campo ("4", "-2", "1,5", "1.000"). */
function parseNumber(s: string): number | undefined {
  const m = /^([-+]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/.exec(s);
  if (!m) return undefined;
  const n = parseFloat(`${m[2]!.replace(/\./g, '')}${m[3] ? '.' + m[3] : ''}`);
  return m[1] === '-' ? -n : n;
}

/** Aritmética: números (pt-BR), + - * /, parênteses e sinal. Casas = as dos literais. */
function parseArithmetic(src: string): { value: number; decimals: number } | undefined {
  const toks: string[] = [];
  const re = /\s*(\d[\d.]*(?:,\d+)?|[-+*/()])/y;
  let at = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) { toks.push(m[1]!); at = re.lastIndex; }
  if (src.slice(at).trim() || !toks.length) return undefined;
  let i = 0, decimals = 0;
  const fail = (): never => { throw new SyntaxError(); };
  const expr = (): number => {
    let a = term();
    while (toks[i] === '+' || toks[i] === '-') { const op = toks[i++]; const b = term(); a = op === '+' ? a + b : a - b; }
    return a;
  };
  const term = (): number => {
    let a = unary();
    while (toks[i] === '*' || toks[i] === '/') {
      const op = toks[i++];
      const b = unary();
      if (op === '/' && b === 0) fail();
      a = op === '*' ? a * b : a / b;
    }
    return a;
  };
  const unary = (): number => {
    if (toks[i] === '-') { i++; return -unary(); }
    if (toks[i] === '+') { i++; return unary(); }
    return primary();
  };
  const primary = (): number => {
    const t = toks[i++];
    if (t === undefined) return fail();
    if (t === '(') { const v = expr(); if (toks[i++] !== ')') fail(); return v; }
    const n = parseNumber(t);
    if (n === undefined) return fail();
    decimals = Math.max(decimals, /,(\d+)$/.exec(t)?.[1]?.length ?? 0);
    return n;
  };
  try {
    const value = expr();
    if (i !== toks.length || !Number.isFinite(value)) return undefined;
    return { value, decimals };
  } catch (e) {
    if (e instanceof SyntaxError) return undefined;
    throw e;
  }
}
