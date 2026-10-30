/**
 * Formatos de número das barras (Página Inicial › Número do Excel): os códigos
 * que o Excel grava para cada item da lista e o Aumentar/Diminuir Casas
 * Decimais. O idioma é o das FÓRMULAS (região dos números: pt-BR usa "R$" e
 * datas dd/mm/aaaa; o resto, os do en-US) — o mesmo critério da entrada de
 * células (entry-format.ts).
 */
import { currencyHint } from './entry-format.js';

export type NumberFormatKind =
  | 'general' | 'number' | 'comma' | 'currency' | 'accounting' | 'shortDate' | 'longDate' | 'time'
  | 'percent' | 'percent0' | 'fraction' | 'scientific' | 'text';

/** `id` fixo (interno do Excel) ou só o código (o pool acha/cria o id). */
export interface NumberFormatSpec { readonly id?: number; readonly code: string }

/** Código/id de um item da lista de formatos, no idioma dos números. */
export function numberFormatFor(kind: NumberFormatKind, lang: 'pt-BR' | 'en-US'): NumberFormatSpec {
  const pt = lang === 'pt-BR';
  switch (kind) {
    case 'general': return { id: 0, code: 'General' };
    case 'number': return { id: 2, code: '0.00' };
    // Separador de Milhares (estilo Vírgula): o Contábil sem símbolo
    case 'comma': return { code: pt ? '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-' : '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)' };
    case 'currency': return { code: currencyHint(pt ? 'R$' : '$', true).code! };
    case 'accounting': return {
      code: pt ? '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@_-' : '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)',
    };
    case 'shortDate': return { id: 14, code: pt ? 'dd/mm/yyyy' : 'm/d/yyyy' };
    case 'longDate': return { code: pt ? 'dddd, d" de "mmmm" de "yyyy' : 'dddd, mmmm d, yyyy' };
    case 'time': return pt ? { id: 21, code: 'hh:mm:ss' } : { id: 19, code: 'h:mm:ss AM/PM' };
    case 'percent': return { id: 10, code: '0.00%' };
    case 'percent0': return { id: 9, code: '0%' };
    case 'fraction': return { id: 12, code: '# ?/?' };
    case 'scientific': return { id: 11, code: '0.00E+00' };
    case 'text': return { id: 49, code: '@' };
  }
}

/** Seções de um código (`;` fora de aspas, colchetes e escapes). */
function sections(code: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') {
      const j = code.indexOf('"', i + 1);
      const end = j < 0 ? code.length : j + 1;
      cur += code.slice(i, end); i = end - 1; continue;
    }
    if (ch === '[') {
      const j = code.indexOf(']', i);
      const end = j < 0 ? code.length : j + 1;
      cur += code.slice(i, end); i = end - 1; continue;
    }
    if (ch === '\\' || ch === '_' || ch === '*') { cur += code.slice(i, i + 2); i++; continue; }
    if (ch === ';') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const PLACEHOLDER = /[0#?]/;

/** Uma seção com uma casa decimal a mais (+1) ou a menos (−1); sem dígitos, igual. */
function adjustSection(sec: string, delta: 1 | -1): string {
  // posições "de código" (fora de literais): onde estão os dígitos e o ponto decimal
  const code: number[] = [];
  for (let i = 0; i < sec.length; i++) {
    const ch = sec[i]!;
    if (ch === '"') { const j = sec.indexOf('"', i + 1); i = j < 0 ? sec.length : j; continue; }
    if (ch === '[') { const j = sec.indexOf(']', i); i = j < 0 ? sec.length : j; continue; }
    if (ch === '\\' || ch === '_' || ch === '*') { i++; continue; }
    code.push(i);
  }
  const digits = code.filter((i) => PLACEHOLDER.test(sec[i]!));
  // sem dígitos (texto, @) ou fração: o Excel não mexe
  if (!digits.length || code.some((i) => sec[i] === '/')) return sec;
  const dot = code.find((i) => sec[i] === '.' && digits.some((d) => d < i));
  if (dot === undefined) {
    if (delta < 0) return sec;
    // sem decimais: ".0" depois do último dígito antes do expoente (0% → 0.0%, #,##0 → #,##0.0)
    const exp = code.find((i) => /[eE]/.test(sec[i]!) && /[+-]/.test(sec[i + 1] ?? ''));
    const last = digits.filter((d) => exp === undefined || d < exp).pop() ?? digits[digits.length - 1]!;
    return sec.slice(0, last + 1) + '.0' + sec.slice(last + 1);
  }
  // decimais: a sequência de dígitos logo depois do ponto
  let k = code.indexOf(dot) + 1;
  const dec: number[] = [];
  while (k < code.length && PLACEHOLDER.test(sec[code[k]!]!) && code[k] === (dec.length ? dec[dec.length - 1]! + 1 : dot + 1)) { dec.push(code[k]!); k++; }
  if (delta > 0) {
    const at = dec.length ? dec[dec.length - 1]! + 1 : dot + 1;
    return sec.slice(0, at) + '0' + sec.slice(at);
  }
  if (dec.length <= 1) return sec.slice(0, dot) + sec.slice(dot + 1 + dec.length);
  const at = dec[dec.length - 1]!;
  return sec.slice(0, at) + sec.slice(at + 1);
}

/**
 * Aumentar (+1) / Diminuir (−1) Casas Decimais sobre o código atual, em todas as
 * seções. `General` vira "0.0" / "0" (o Excel parte das casas exibidas; aqui de
 * nenhuma); texto (@) não muda.
 */
export function adjustDecimals(code: string, delta: 1 | -1): string {
  if (!code || /^general$/i.test(code.trim())) return delta > 0 ? '0.0' : '0';
  return sections(code).map((s) => adjustSection(s, delta)).join(';');
}
