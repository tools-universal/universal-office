/**
 * Avaliador das FÓRMULAS de animação do PresentationML (`<p:tav fmla>`,
 * `<p:strVal val="1+#ppt_w/2">`, atributos `from/to/by` de `<p:anim>`).
 *
 * Gramática (a que o app de referência grava nos presets):
 *   expr   := term (('+'|'-') term)*
 *   term   := power (('*'|'/') power)*
 *   power  := unary ('^' unary)*
 *   unary  := ('-'|'+') unary | atom
 *   atom   := número | variável | função '(' args ')' | '(' expr ')'
 * Variáveis: `#ppt_x #ppt_y #ppt_w #ppt_h` (centro e tamanho da forma em
 * fração do slide), `#ppt_r` (rotação), `$` (valor interpolado do tav),
 * `pi`, `e`. Funções: sin cos tan asin acos atan sinh cosh tanh deg rad sqrt
 * abs ln exp max min floor ceil rand. Variável/função desconhecida ou
 * operando faltando ⇒ NaN (o valor não é fórmula — ex.: "hidden").
 *
 * As árvores são memoizadas por texto (cada preset repete as mesmas fórmulas).
 */

export type FormulaVars = Record<string, number>;

type Node =
  | { k: 'n'; v: number }
  | { k: 'v'; name: string }
  | { k: 'u'; op: '-'; a: Node }
  | { k: 'b'; op: string; a: Node; b: Node }
  | { k: 'f'; name: string; args: Node[] };

const cache = new Map<string, Node | null>();

function tokenize(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j++;
      // notação científica (raro): 1e-3
      if (j < s.length && /[eE]/.test(s[j]!) && /[-+0-9]/.test(s[j + 1] ?? '')) {
        j += 2;
        while (j < s.length && /[0-9]/.test(s[j]!)) j++;
      }
      out.push(s.slice(i, j)); i = j; continue;
    }
    if (c === '#' || c === '$' || /[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_.]/.test(s[j]!)) j++;
      out.push(s.slice(i, j)); i = j; continue;
    }
    out.push(c); i++;
  }
  return out;
}

function parse(src: string): Node | null {
  const t = tokenize(src);
  let p = 0;
  const peek = (): string | undefined => t[p];
  const next = (): string | undefined => t[p++];
  function expr(): Node {
    let a = term();
    while (peek() === '+' || peek() === '-') { const op = next()!; a = { k: 'b', op, a, b: term() }; }
    return a;
  }
  function term(): Node {
    let a = power();
    while (peek() === '*' || peek() === '/') { const op = next()!; a = { k: 'b', op, a, b: power() }; }
    return a;
  }
  function power(): Node {
    let a = unary();
    while (peek() === '^') { next(); a = { k: 'b', op: '^', a, b: unary() }; }
    return a;
  }
  function unary(): Node {
    if (peek() === '-') { next(); return { k: 'u', op: '-', a: unary() }; }
    if (peek() === '+') { next(); return unary(); }
    return atom();
  }
  function atom(): Node {
    const tok = next();
    if (tok === undefined) throw new Error('fim inesperado');
    if (tok === '(') { const e = expr(); if (next() !== ')') throw new Error(') esperado'); return e; }
    if (/^[0-9.]/.test(tok)) {
      const v = Number(tok);
      if (!Number.isFinite(v)) throw new Error(`número inválido ${tok}`);
      return { k: 'n', v };
    }
    // operador/pontuação no lugar de um operando ("2*)", "#ppt_x + *") é erro, não variável
    if (!/^[#$A-Za-z_]/.test(tok)) throw new Error(`operando esperado, veio ${tok}`);
    if (peek() === '(') {
      next();
      const args: Node[] = [];
      if (peek() !== ')') {
        args.push(expr());
        while (peek() === ',') { next(); args.push(expr()); }
      }
      if (next() !== ')') throw new Error(') esperado');
      return { k: 'f', name: tok.toLowerCase(), args };
    }
    return { k: 'v', name: tok };
  }
  try {
    const n = expr();
    return p === t.length ? n : null;
  } catch {
    return null;
  }
}

function ev(n: Node, vars: FormulaVars): number {
  switch (n.k) {
    case 'n': return n.v;
    case 'v': {
      const key = n.name.toLowerCase();
      if (key === 'pi') return Math.PI;
      if (key === 'e') return Math.E;
      // variável desconhecida = NÃO é fórmula (ex.: "hidden", "bold" de um
      // anim de texto) — NaN, para quem chama tratar como valor textual
      return vars[n.name] ?? vars[key] ?? NaN;
    }
    case 'u': return -ev(n.a, vars);
    case 'b': {
      const a = ev(n.a, vars), b = ev(n.b, vars);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 0 : a / b;
        case '^': return Math.pow(a, b);
      }
      return 0;
    }
    case 'f': {
      const x = n.args.map((a) => ev(a, vars));
      const a0 = x[0] ?? 0;
      switch (n.name) {
        case 'sin': return Math.sin(a0);
        case 'cos': return Math.cos(a0);
        case 'tan': return Math.tan(a0);
        case 'asin': return Math.asin(a0);
        case 'acos': return Math.acos(a0);
        case 'atan': return Math.atan(a0);
        case 'sinh': return Math.sinh(a0);
        case 'cosh': return Math.cosh(a0);
        case 'tanh': return Math.tanh(a0);
        case 'deg': return (a0 * 180) / Math.PI;
        case 'rad': return (a0 * Math.PI) / 180;
        case 'sqrt': return Math.sqrt(Math.max(0, a0));
        case 'abs': return Math.abs(a0);
        case 'ln': return a0 > 0 ? Math.log(a0) : 0;
        case 'exp': return Math.exp(a0);
        case 'max': return Math.max(...x);
        case 'min': return Math.min(...x);
        case 'floor': return Math.floor(a0);
        case 'ceil': return Math.ceil(a0);
        // rand(x): o app usa aleatório; determinístico aqui (meio do intervalo)
        case 'rand': return a0 / 2;
      }
      return NaN; // função desconhecida: fórmula inválida
    }
  }
}

/** Avalia uma fórmula; texto numérico puro é o próprio número. NaN se inválida. */
export function evalFormula(src: string, vars: FormulaVars): number {
  const s = src.trim();
  if (/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return parseFloat(s);
  let n = cache.get(s);
  if (n === undefined) { n = parse(s); cache.set(s, n); }
  if (!n) return NaN;
  const v = ev(n, vars);
  return Number.isFinite(v) ? v : NaN;
}
