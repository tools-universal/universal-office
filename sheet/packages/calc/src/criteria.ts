/**
 * Critérios no estilo COUNTIF/SUMIF/AVERAGEIFS/D-funções e curingas (* ? ~)
 * usados também por MATCH/XLOOKUP/SEARCH. Primeira versão do contrato: o dono
 * (FN-STAT) mede as regras finas no oráculo e ajusta aqui, mantendo as assinaturas.
 */
import { CalcError, type Scalar } from './values.js';
import { EN_US, type ValueLocale } from './fn.js';
import { compareScalars, parseNumberText, toBool } from './coerce.js';

/** Predicado sobre o valor de uma célula. */
export type Criterion = (v: Scalar) => boolean;

/** Curinga do Excel → RegExp (sem diferenciar maiúsculas; `~*` `~?` `~~` literais). */
export function wildcardRegExp(pattern: string, whole = true): RegExp {
  let src = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === '~' && i + 1 < pattern.length && '*?~'.includes(pattern[i + 1]!)) {
      src += '\\' + pattern[++i];
    } else if (ch === '*') src += '[\\s\\S]*';
    else if (ch === '?') src += '[\\s\\S]';
    else src += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
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

/**
 * Critério de COUNTIF a partir do argumento (número, booleano, erro ou texto com
 * operador opcional "=", "<>", "<", "<=", ">", ">=").
 */
export function parseCriterion(crit: Scalar, locale: ValueLocale = EN_US): Criterion {
  if (crit === null) crit = '';
  if (typeof crit === 'number') return (v) => numericOf(v, locale) === crit;
  if (typeof crit === 'boolean') return (v) => v === crit;
  if (crit instanceof CalcError) return (v) => v === crit;
  const m = /^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(crit)!;
  const op = m[1] ?? '';
  const rest = m[2]!;
  // vazio
  if (rest === '') {
    if (op === '') return (v) => v === null || v === '';
    if (op === '=') return (v) => v === null;
    if (op === '<>') return (v) => v !== null;
    return () => false;
  }
  // número (no idioma de quem calcula)
  const n = parseNumberText(rest, locale);
  if (n !== undefined) {
    const cmp = (v: Scalar): number | undefined => {
      const x = numericOf(v, locale);
      return x === undefined ? undefined : x < n ? -1 : x > n ? 1 : 0;
    };
    return opPredicate(op, cmp, true);
  }
  // booleano
  const b = /^(TRUE|FALSE)$/i.test(rest) || rest.toUpperCase() === locale.trueText.toUpperCase() || rest.toUpperCase() === locale.falseText.toUpperCase()
    ? toBool(rest, locale) : undefined;
  if (typeof b === 'boolean') {
    return opPredicate(op, (v) => (typeof v === 'boolean' ? compareScalars(v, b) : undefined), true);
  }
  // erro
  if (/^#/.test(rest)) {
    const code = rest.toUpperCase();
    return opPredicate(op, (v) => (v instanceof CalcError ? (v.code === code ? 0 : 1) : undefined), true);
  }
  // texto: = e <> com curingas; < > comparam só com textos
  if (op === '' || op === '=' || op === '<>') {
    const re = wildcardRegExp(rest);
    const eq = (v: Scalar): boolean => typeof v === 'string' && re.test(v);
    return op === '<>' ? (v) => !eq(v) : eq;
  }
  return opPredicate(op, (v) => (typeof v === 'string' ? compareScalars(v, rest) : undefined), false);
}

function numericOf(v: Scalar, locale: ValueLocale): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseNumberText(v, locale);
  return undefined;
}

/** Predicado a partir do operador e da comparação (undefined = tipos incomparáveis). */
function opPredicate(op: string, cmp: (v: Scalar) => number | undefined, neMatchesOthers: boolean): Criterion {
  return (v) => {
    const c = cmp(v);
    if (c === undefined) return op === '<>' && neMatchesOthers;
    switch (op) {
      case '': case '=': return c === 0;
      case '<>': return c !== 0;
      case '<': return c < 0;
      case '<=': return c <= 0;
      case '>': return c > 0;
      case '>=': return c >= 0;
    }
    return false;
  };
}
