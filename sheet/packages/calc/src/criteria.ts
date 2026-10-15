/**
 * Critérios no estilo COUNTIF/SUMIF/AVERAGEIFS/D-funções e curingas (* ? ~)
 * usados também por MATCH/XLOOKUP/SEARCH. Dono: FN-STAT.
 *
 * Regras medidas no Excel 365 pt-BR (SUMIF com potências de 2 revela quais
 * células casam; 100 critérios × 30 tipos de célula):
 * - operador opcional no início: "=", "<>", "<", "<=", ">", ">=" ("==1" e "=<1" são
 *   texto); o resto vazio: "" casa vazia e texto ""; "=" só vazia; "<>" toda não vazia
 *   (inclusive ""); "<", ">"… sem nada não casam;
 * - resto que é número NO IDIOMA ("1", " 1", "+1", "1E0", "(1)" = −1, "R$ 1", "50%",
 *   "2,5", datas "01/01/2024", "1/1/2024", "2024-01-01"): "=" casa números iguais e
 *   TEXTOS que convertem nele ("1", " 1", "01/01/2024"); "<>" exclui só os números
 *   iguais (texto "1" fica); "<", ">"… só números de verdade;
 * - booleano só pelo nome do idioma ("VERDADEIRO"; "TRUE" no pt-BR é texto) e só casa
 *   booleanos; erro só pelo nome do idioma ("#DIV/0!", "#N/D"; "#N/A" no pt-BR é texto);
 * - texto: "=" sem * ou ? compara o texto inteiro (sem maiúsculas; ~ é literal); com *
 *   ou ? usa curingas (~ escapa); só casa células de texto ("*" casa o texto "");
 *   "<>" é o complemento; "<", ">"… comparam só textos, na ordem do Excel (collate.ts),
 *   com * e ? literais;
 * - critério número/booleano/erro (não texto) = "=" daquele valor; vazio/omitido = 0.
 */
import { CalcError, type ErrorCode, type Scalar } from './values.js';
import { EN_US, type ValueLocale } from './fn.js';
import { parseNumberText } from './coerce.js';
import { compareText, textEquals } from './collate.js';

/** Variações do critério. */
export interface CriterionOptions {
  /** Critério de banco de dados (D-funções, filtro avançado): texto sem operador casa o início. */
  readonly prefix?: boolean;
}

/** Predicado sobre o valor de uma célula; `blank` = casa célula vazia (colunas inteiras). */
export interface Criterion {
  (v: Scalar): boolean;
  readonly blank: boolean;
}

/**
 * Curinga do Excel → RegExp (sem diferenciar maiúsculas). O til tira o sentido
 * especial do caractere seguinte, qualquer que seja (medido: "~a*" = "a*"; `~*` `~?`
 * `~~` literais); til no fim fica literal.
 */
export function wildcardRegExp(pattern: string, whole = true): RegExp {
  const lit = (c: string): string => c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  let src = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === '~' && i + 1 < pattern.length) src += lit(pattern[++i]!);
    else if (ch === '*') src += '[\\s\\S]*';
    else if (ch === '?') src += '[\\s\\S]';
    else src += lit(ch);
  }
  return new RegExp(whole ? `^${src}$` : src, 'i');
}

/** O texto tem curinga (sem escape)? */
export function hasWildcard(pattern: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === '~') { i++; continue; }
    if (ch === '*' || ch === '?') return true;
  }
  return false;
}

/** Nomes de erro do pt-BR (o critério em texto usa os nomes do idioma de quem calcula). */
const PT_BR_ERRORS: Record<string, ErrorCode> = {
  '#NULO!': '#NULL!', '#DIV/0!': '#DIV/0!', '#VALOR!': '#VALUE!', '#REF!': '#REF!',
  '#NOME?': '#NAME?', '#NÚM!': '#NUM!', '#N/D': '#N/A',
};
const CANON_ERRORS: readonly ErrorCode[] = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA', '#SPILL!', '#CALC!', '#FIELD!', '#BLOCKED!', '#CONNECT!', '#UNKNOWN!', '#BUSY!', '#PYTHON!'];

/** Código canônico de um nome de erro escrito no idioma (ou undefined). */
export function localeErrorCode(text: string, locale: ValueLocale): ErrorCode | undefined {
  const u = text.trim().toUpperCase();
  if (locale.id === 'pt-BR') return PT_BR_ERRORS[u];
  return CANON_ERRORS.find((c) => c === u);
}

function make(pred: (v: Scalar) => boolean, blank: boolean): Criterion {
  const f = pred as Criterion;
  Object.defineProperty(f, 'blank', { value: blank });
  return f;
}

/**
 * Comparação numérica dos critérios: nos 15 dígitos significativos (medido: 1+16·2^−52
 * casa "=1", 1+24·2^−52 não; 1−4·2^−53 casa, 1−5·2^−53 não — e o mesmo para ">=", "<>").
 */
export function compare15(a: number, b: number): number {
  if (a === b) return 0;
  const d = a - b;
  if (Math.abs(d) > 1e-13 * Math.max(Math.abs(a), Math.abs(b))) return d < 0 ? -1 : 1;
  const x = Number(a.toPrecision(15)), y = Number(b.toPrecision(15));
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Número de uma célula para o "=" numérico: número, ou texto que converte no idioma. */
function eqNumberOf(v: Scalar, locale: ValueLocale): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseNumberText(v, locale);
  return undefined;
}

/**
 * Critério de COUNTIF a partir do argumento (número, booleano, erro ou texto com
 * operador opcional "=", "<>", "<", "<=", ">", ">=").
 */
export function parseCriterion(crit: Scalar, locale: ValueLocale = EN_US, opts: CriterionOptions = {}): Criterion {
  if (crit === null) crit = 0;
  if (typeof crit === 'number') return numberCriterion('=', crit, locale);
  if (typeof crit === 'boolean') { const b = crit; return make((v) => v === b, false); }
  if (crit instanceof CalcError) { const e = crit; return make((v) => v === e, false); }
  const m = /^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(crit)!;
  const op = m[1] ?? '';
  const rest = m[2]!;
  // vazio
  if (rest === '') {
    if (op === '') return make((v) => v === null || v === '', true);
    if (op === '=') return make((v) => v === null, true);
    if (op === '<>') return make((v) => v !== null, false);
    return make(() => false, false);
  }
  // número no idioma (inclui datas e horas)
  const n = parseNumberText(rest, locale);
  if (n !== undefined) return numberCriterion(op, n, locale);
  // booleano pelo nome do idioma
  const up = rest.toUpperCase();
  const b = up === locale.trueText.toUpperCase() ? true : up === locale.falseText.toUpperCase() ? false : undefined;
  if (b !== undefined) {
    return opPredicate(op, (v) => (typeof v === 'boolean' ? (v === b ? 0 : v ? 1 : -1) : undefined));
  }
  // erro pelo nome do idioma
  const code = localeErrorCode(rest, locale);
  if (code) return opPredicate(op, (v) => (v instanceof CalcError ? (v.code === code ? 0 : undefined) : undefined));
  // texto
  if (op === '' || op === '=' || op === '<>') {
    let eq: (v: Scalar) => boolean;
    if (op === '' && opts.prefix) {
      // D-funções: texto sem operador = "começa com" (medido: "Apple" casa "Applesauce")
      const re = wildcardRegExp(rest + '*');
      eq = (v) => typeof v === 'string' && re.test(v);
    } else if (/[*?]/.test(rest)) {
      const re = wildcardRegExp(rest);
      eq = (v) => typeof v === 'string' && re.test(v);
    } else {
      eq = (v) => typeof v === 'string' && textEquals(v, rest);
    }
    return op === '<>' ? make((v) => !eq(v), true) : make(eq, false);
  }
  return opPredicate(op, (v) => (typeof v === 'string' ? compareText(v, rest) : undefined));
}

/** Critério numérico: "=" aceita texto que converte; "<>" só exclui números; os demais só números. */
function numberCriterion(op: string, n: number, locale: ValueLocale): Criterion {
  if (op === '' || op === '=') return make((v) => { const x = eqNumberOf(v, locale); return x !== undefined && compare15(x, n) === 0; }, false);
  return opPredicate(op, (v) => (typeof v === 'number' ? compare15(v, n) : undefined));
}

/** Predicado a partir do operador e da comparação (undefined = tipos incomparáveis). */
function opPredicate(op: string, cmp: (v: Scalar) => number | undefined): Criterion {
  if (op === '<>') return make((v) => cmp(v) !== 0, true);
  return make((v) => {
    const c = cmp(v);
    if (c === undefined) return false;
    switch (op) {
      case '': case '=': return c === 0;
      case '<': return c < 0;
      case '<=': return c <= 0;
      case '>': return c > 0;
      case '>=': return c >= 0;
    }
    return false;
  }, false);
}
