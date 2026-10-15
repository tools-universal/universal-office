/**
 * REGEXTEST, REGEXEXTRACT, REGEXREPLACE. O Excel usa PCRE2 (UTF, \w/\d
 * Unicode); aqui o padrão PCRE é traduzido para RegExp do JS (flag u).
 * Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR (text.cases.json; lab calc/tdl):
 * - sem multilinha/dotall por padrão; (?i) (?m) (?s) (?x), (?i:…) e (?i) no meio
 *   valem; \A \z \Z, \Q…\E, \x{78}, octal \170, (?P<n>…)/(?P=n), (?>…), a++,
 *   [[:alpha:]], \p{L}; \w casa "é"; maiúsculas/minúsculas Unicode ("É" ~ "é");
 * - REGEXEXTRACT: modo 0 = 1ª ocorrência; 1 = todas numa LINHA; 2 = grupos da 1ª
 *   numa linha (grupo que não participou → #N/A; padrão sem grupo → #VALUE!);
 *   sem ocorrência → #N/A; casa vazio ("a*" em "aaa" → "aaa", "");
 * - REGEXREPLACE: ocorrência 0 = todas, n = n-ésima, -n = n-ésima do fim, além
 *   do total = texto igual; substituição com $1 ${2} ${nome} $0 $& $$ \1 \n;
 *   grupo inexistente ($10) → #VALUE!;
 * - modo/caixa fora de 0–2 / 0–1 → #VALUE!; padrão inválido → #VALUE!.
 */
import { register, type FnContext } from '../fn.js';
import { ArrayValue, CalcError, ERR, type Scalar } from '../values.js';
import { checkLen } from './text-format.js';
import { num, txt } from './tdl-util.js';

const WORD = '\\p{L}\\p{N}_';
const POSIX: Record<string, string> = {
  alpha: '\\p{L}', digit: '0-9', alnum: '\\p{L}\\p{N}', space: '\\s', upper: '\\p{Lu}', lower: '\\p{Ll}',
  punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', word: WORD, blank: ' \\t', cntrl: '\\x00-\\x1f\\x7f',
  print: '\\x20-\\x7e\\u00a0-\\uffff', graph: '\\x21-\\x7e\\u00a1-\\uffff', ascii: '\\x00-\\x7f',
};
const SYNTAX = '^$\\.*+?()[]{}|/';

const hex = (cp: number): string => `\\u{${cp.toString(16)}}`;

interface Compiled { re: RegExp; groups: number; names: Map<string, number> }

/** Traduz um padrão PCRE2 para o JS. Lança SyntaxError se não der. */
function translate(p: string, flags: { i: boolean; m: boolean; s: boolean; x: boolean }, modifiers: boolean): { src: string; groups: number; names: Map<string, number> } {
  let out = '';
  let i = 0;
  let inClass = false;
  let groups = 0;
  const names = new Map<string, number>();
  // grupos abertos: quantos ")" extras fechar no fim de cada nível ((?i) no meio vira (?i:…))
  const stack: number[] = [0];
  // flags no começo do padrão
  for (;;) {
    const m = /^\(\?([imsx]+)\)/.exec(p.slice(i));
    if (!m) break;
    for (const f of m[1]!) flags[f as 'i'] = true;
    i += m[0].length;
  }
  while (i < p.length) {
    const ch = p[i]!;
    if (flags.x && !inClass) {
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '#') { while (i < p.length && p[i] !== '\n') i++; continue; }
    }
    if (ch === '\\') {
      const n = p[i + 1];
      if (n === undefined) throw new SyntaxError('\\ no fim');
      if (n === 'Q') {
        const end = p.indexOf('\\E', i + 2);
        const lit = p.slice(i + 2, end < 0 ? p.length : end);
        for (const c of lit) out += /[A-Za-z0-9]/.test(c) ? c : hex(c.codePointAt(0)!);
        i = end < 0 ? p.length : end + 2; continue;
      }
      if (n === 'E') { i += 2; continue; }
      if (!inClass) {
        if (n === 'A') { out += '(?<![\\s\\S])'; i += 2; continue; }
        if (n === 'z') { out += '(?![\\s\\S])'; i += 2; continue; }
        if (n === 'Z') { out += '(?=\\n?(?![\\s\\S]))'; i += 2; continue; }
        if (n === 'G') { i += 2; continue; }
        if (n === 'b') { out += `(?:(?<=[${WORD}])(?![${WORD}])|(?<![${WORD}])(?=[${WORD}]))`; i += 2; continue; }
        if (n === 'B') { out += `(?:(?<=[${WORD}])(?=[${WORD}])|(?<![${WORD}])(?![${WORD}]))`; i += 2; continue; }
        if (n === 'R') { out += '(?:\\r\\n|[\\n\\v\\f\\r\\u0085\\u2028\\u2029])'; i += 2; continue; }
        if (n === 'X') { out += '(?:\\P{M}\\p{M}*)'; i += 2; continue; }
        if (n === 'k') {
          const m = /^\\k(?:<([^>]+)>|'([^']+)'|\{([^}]+)\})/.exec(p.slice(i));
          if (!m) throw new SyntaxError('\\k');
          out += `\\k<${m[1] ?? m[2] ?? m[3]}>`; i += m[0].length; continue;
        }
        if (n === 'g') {
          const m = /^\\g(?:\{(-?\d+)\}|(-?\d+)|\{([A-Za-z_]\w*)\})/.exec(p.slice(i));
          if (!m) throw new SyntaxError('\\g');
          if (m[3]) out += `\\k<${m[3]}>`;
          else { let k = +(m[1] ?? m[2])!; if (k < 0) k = groups + 1 + k; out += `\\${k}`; }
          i += m[0].length; continue;
        }
      }
      if (n === 'w') { out += inClass ? WORD : `[${WORD}]`; i += 2; continue; }
      if (n === 'W') { out += inClass ? '\\W' : `[^${WORD}]`; i += 2; continue; }
      if (n === 'd') { out += '\\p{Nd}'; i += 2; continue; }
      if (n === 'D') { out += '\\P{Nd}'; i += 2; continue; }
      if (n === 'h') { const c = '\\t \\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000'; out += inClass ? c : `[${c}]`; i += 2; continue; }
      if (n === 'H') { out += inClass ? '' : '[^\\t \\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000]'; i += 2; continue; }
      if (n === 'v') { const c = '\\n\\v\\f\\r\\u0085\\u2028\\u2029'; out += inClass ? c : `[${c}]`; i += 2; continue; }
      if (n === 'e') { out += '\\x1b'; i += 2; continue; }
      if (n === 'a') { out += '\\x07'; i += 2; continue; }
      if (n === 'x') {
        const m = /^\\x(?:\{([0-9A-Fa-f]+)\}|([0-9A-Fa-f]{1,2}))/.exec(p.slice(i));
        if (!m) throw new SyntaxError('\\x');
        out += hex(parseInt(m[1] ?? m[2]!, 16)); i += m[0].length; continue;
      }
      if (n === 'p' || n === 'P') {
        if (p[i + 2] === '{') { const end = p.indexOf('}', i); out += p.slice(i, end + 1).replace(/\^/, ''); i = end + 1; continue; }
        out += `\\${n}{${p[i + 2]}}`; i += 3; continue;
      }
      if (/[0-7]/.test(n)) {
        const m = /^\\([0-7]{3}|0[0-7]{0,2})/.exec(p.slice(i));
        if (m) { out += hex(parseInt(m[1]!, 8)); i += m[0].length; continue; }
      }
      if (/[1-9]/.test(n)) { const m = /^\\(\d+)/.exec(p.slice(i))!; out += `\\${m[1]}`; i += m[0].length; continue; }
      if (/[A-Za-z0-9]/.test(n)) { out += '\\' + n; i += 2; continue; }
      // escape de pontuação: o JS (flag u) só aceita os de sintaxe
      const cp = p.codePointAt(i + 1)!;
      out += SYNTAX.includes(n) || (inClass && n === '-') ? '\\' + n : hex(cp);
      i += 1 + String.fromCodePoint(cp).length; continue;
    }
    if (inClass) {
      if (ch === '[' && p[i + 1] === ':') {
        const end = p.indexOf(':]', i + 2);
        const name = end < 0 ? '' : p.slice(i + 2, end);
        const neg = name.startsWith('^');
        const cls = POSIX[neg ? name.slice(1) : name];
        if (cls === undefined || neg) throw new SyntaxError('classe POSIX');
        out += cls; i = end + 2; continue;
      }
      if (ch === '[') { out += '\\['; i++; continue; }
      if (ch === ']') { inClass = false; out += ']'; i++; continue; }
      out += ch; i++; continue;
    }
    if (ch === '[') {
      inClass = true; out += '['; i++;
      if (p[i] === '^') { out += '^'; i++; }
      if (p[i] === ']') { out += '\\]'; i++; } // "]" logo no começo é literal no PCRE
      continue;
    }
    if (ch === '(') {
      if (p[i + 1] === '?') {
        const rest = p.slice(i);
        let m: RegExpExecArray | null;
        if ((m = /^\(\?#[^)]*\)/.exec(rest))) { i += m[0].length; continue; }
        if ((m = /^\(\?P?<([A-Za-z_]\w*)>/.exec(rest)) || (m = /^\(\?'([A-Za-z_]\w*)'/.exec(rest))) {
          groups++; names.set(m[1]!, groups); out += `(?<${m[1]}>`; i += m[0].length; stack.push(0); continue;
        }
        if ((m = /^\(\?P=([A-Za-z_]\w*)\)/.exec(rest))) { out += `\\k<${m[1]}>`; i += m[0].length; continue; }
        if (/^\(\?(P>|R\)|\d|&|\+|-\d|C|\(|\|)/.test(rest)) {
          if (rest.startsWith('(?|')) { out += '(?:'; i += 3; stack.push(0); continue; }
          throw new SyntaxError('recursão/condicional');
        }
        if (rest.startsWith('(?>')) { out += '(?:'; i += 3; stack.push(0); continue; }
        if ((m = /^\(\?([imsx]*)(?:-([imsx]*))?\)/.exec(rest)) && m[0] !== '(?)') {
          // (?i) no meio: vale até o fim do grupo atual
          const on = (m[1] ?? '').replace(/x/g, ''), off = (m[2] ?? '').replace(/x/g, '');
          if (m[1]?.includes('x')) flags.x = true;
          if (on || off) {
            if (!modifiers) { for (const f of on) flags[f as 'i'] = true; i += m[0].length; continue; }
            out += `(?${on}${off ? '-' + off : ''}:`;
            stack[stack.length - 1]!++;
          }
          i += m[0].length; continue;
        }
        if ((m = /^\(\?([imsx]*)(?:-([imsx]*))?:/.exec(rest))) {
          const on = (m[1] ?? '').replace(/x/g, ''), off = (m[2] ?? '').replace(/x/g, '');
          if (!modifiers) { for (const f of on) flags[f as 'i'] = true; out += '(?:'; }
          else out += on || off ? `(?${on}${off ? '-' + off : ''}:` : '(?:';
          i += m[0].length; stack.push(0); continue;
        }
        if (/^\(\?(=|!|<=|<!)/.test(rest)) {
          const len = rest.startsWith('(?<') ? 4 : 3;
          out += rest.slice(0, len); i += len; stack.push(0); continue;
        }
        throw new SyntaxError('grupo');
      }
      groups++; out += '('; i++; stack.push(0); continue;
    }
    if (ch === ')') {
      const extra = stack.pop() ?? 0;
      if (!stack.length) throw new SyntaxError(') sem (');
      out += ')'.repeat(extra) + ')'; i++; continue;
    }
    if ((ch === '+') && /[*+?}]/.test(p[i - 1] ?? '') && p[i - 2] !== '\\') { i++; continue; } // possessivo → guloso
    if (ch === '$' && !flags.m) { out += '(?=\\n?(?![\\s\\S]))'; i++; continue; }
    out += ch; i++;
  }
  if (inClass) throw new SyntaxError('[ sem ]');
  if (stack.length !== 1) throw new SyntaxError('( sem )');
  out += ')'.repeat(stack[0]!);
  return { src: out, groups, names };
}

const cache = new Map<string, Compiled | null>();

/** Compila o padrão PCRE (null = inválido). */
function compile(pattern: string, ci: boolean): Compiled | null {
  const key = (ci ? 'i' : 'c') + pattern;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let r: Compiled | null = null;
  for (const modifiers of [true, false]) {
    try {
      const flags = { i: ci, m: false, s: false, x: false };
      const t = translate(pattern, flags, modifiers);
      const re = new RegExp(t.src, 'gu' + (flags.i ? 'i' : '') + (flags.m ? 'm' : '') + (flags.s ? 's' : ''));
      r = { re, groups: t.groups, names: t.names };
      break;
    } catch { /* tenta sem modificadores locais */ }
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, r);
  return r;
}

/** RegExp (flag g) do padrão PCRE, ou null se inválido (XLOOKUP/XMATCH modo 3). */
export function compilePcre(pattern: string, ci: boolean): RegExp | null {
  return compile(pattern, ci)?.re ?? null;
}

/** Todas as ocorrências (como o PCRE: depois de uma vazia, avança um caractere). */
function allMatches(c: Compiled, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  c.re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = c.re.exec(text))) {
    out.push(m);
    if (m[0] === '') c.re.lastIndex += (text.codePointAt(m.index) ?? 0) > 0xffff ? 2 : 1;
    if (c.re.lastIndex > text.length) break;
  }
  return out;
}

/** Substituição PCRE2 estendida → partes (texto ou nº do grupo); undefined = grupo inexistente. */
function parseReplacement(rep: string, c: Compiled): (string | number)[] | undefined {
  const out: (string | number)[] = [];
  let lit = '';
  const flush = (): void => { if (lit) { out.push(lit); lit = ''; } };
  for (let i = 0; i < rep.length; i++) {
    const ch = rep[i]!;
    if (ch === '$') {
      const rest = rep.slice(i + 1);
      let m: RegExpExecArray | null;
      if (rest[0] === '$') { lit += '$'; i++; continue; }
      if (rest[0] === '&') { flush(); out.push(0); i++; continue; }
      if ((m = /^\{(\d+)\}|^(\d+)/.exec(rest))) {
        const k = +(m[1] ?? m[2])!;
        if (k > c.groups) return undefined;
        flush(); out.push(k); i += m[0].length; continue;
      }
      if ((m = /^\{([A-Za-z_]\w*)\}|^([A-Za-z_]\w*)/.exec(rest))) {
        const k = c.names.get(m[1] ?? m[2]!);
        if (k === undefined) return undefined;
        flush(); out.push(k); i += m[0].length; continue;
      }
      return undefined;
    }
    if (ch === '\\' && i + 1 < rep.length) {
      const n = rep[i + 1]!;
      if (/\d/.test(n)) { const k = +n; if (k > c.groups) return undefined; flush(); out.push(k); i++; continue; }
      lit += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : n === 'a' ? '\x07' : n === 'e' ? '\x1b' : n === 'f' ? '\f' : n;
      i++; continue;
    }
    lit += ch;
  }
  flush();
  return out;
}

/** 0/1 (caixa) ou 0/1/2 (modo); fora disso → #VALUE!. */
function smallInt(v: Scalar | undefined, max: number, ctx: FnContext): number | CalcError {
  if (v === undefined || v === null) return 0;
  const n = num(v, ctx);
  if (n instanceof CalcError) return n;
  const k = Math.trunc(n);
  return k < 0 || k > max ? ERR.VALUE : k;
}

register(
  {
    name: 'REGEXTEST', prefix: '_xlfn.', minArgs: 2, maxArgs: 3, args: 'value', lift: true,
    call: ([t, p, cs], ctx) => {
      const text = txt(t, ctx); if (text instanceof CalcError) return text;
      const pat = txt(p, ctx); if (pat instanceof CalcError) return pat;
      const k = smallInt(cs, 1, ctx); if (k instanceof CalcError) return k;
      const c = compile(pat, k === 1);
      if (!c) return ERR.VALUE;
      c.re.lastIndex = 0;
      return c.re.test(text);
    },
  },
  {
    name: 'REGEXEXTRACT', prefix: '_xlfn.', minArgs: 2, maxArgs: 4, args: 'value', lift: true,
    call: ([t, p, mv, cs], ctx) => {
      const text = txt(t, ctx); if (text instanceof CalcError) return text;
      const pat = txt(p, ctx); if (pat instanceof CalcError) return pat;
      const mode = smallInt(mv, 2, ctx); if (mode instanceof CalcError) return mode;
      const k = smallInt(cs, 1, ctx); if (k instanceof CalcError) return k;
      const c = compile(pat, k === 1);
      if (!c) return ERR.VALUE;
      if (mode === 2 && c.groups === 0) return ERR.VALUE;
      const ms = mode === 1 ? allMatches(c, text) : (() => { c.re.lastIndex = 0; const m = c.re.exec(text); return m ? [m] : []; })();
      if (!ms.length) return ERR.NA;
      if (mode === 0) return checkLen(ms[0]![0]);
      if (mode === 1) return new ArrayValue(1, ms.length, ms.map((m) => m[0]));
      const m = ms[0]!;
      return ArrayValue.fill(1, c.groups, (_, j) => (m[j + 1] === undefined ? ERR.NA : m[j + 1]!));
    },
  },
  {
    name: 'REGEXREPLACE', prefix: '_xlfn.', minArgs: 3, maxArgs: 5, args: 'value', lift: true,
    call: ([t, p, r, ov, cs], ctx) => {
      const text = txt(t, ctx); if (text instanceof CalcError) return text;
      const pat = txt(p, ctx); if (pat instanceof CalcError) return pat;
      const rep = txt(r, ctx); if (rep instanceof CalcError) return rep;
      let occ = 0;
      if (ov !== undefined && ov !== null) { const n = num(ov, ctx); if (n instanceof CalcError) return n; occ = Math.trunc(n); }
      const k = smallInt(cs, 1, ctx); if (k instanceof CalcError) return k;
      const c = compile(pat, k === 1);
      if (!c) return ERR.VALUE;
      const parts = parseReplacement(rep, c);
      if (!parts) return ERR.VALUE;
      const ms = allMatches(c, text);
      const pick = occ === 0 ? ms : occ > 0 ? (ms[occ - 1] ? [ms[occ - 1]!] : []) : (ms[ms.length + occ] ? [ms[ms.length + occ]!] : []);
      let out = '', last = 0;
      for (const m of pick) {
        out += text.slice(last, m.index);
        for (const q of parts) out += typeof q === 'string' ? q : m[q] ?? '';
        last = m.index + m[0].length;
      }
      return checkLen(out + text.slice(last));
    },
  },
);
