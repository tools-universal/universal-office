/**
 * FILTERXML(xml; xpath) sem rede nem DOM: analisador de XML pequeno e um
 * subconjunto de XPath 1.0 (caminhos / e //, *, @atributo, predicados [n],
 * [last()], [position() op n], [@a='v'], [filho='v'], [text()='v'], and/or, e
 * união "|"). Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR (text.cases.json):
 * - o valor de um elemento é só o texto DIRETO dele ("x<c>y</c>z" → "xz");
 *   elemento sem texto direto → #VALUE! (na lista, a posição vira #VALUE!);
 * - atributos dão o valor; text(), count(), sum(), name() → #VALUE!;
 * - nomes diferenciam maiúsculas e o prefixo conta ("p:s" ≠ "s"); xmlns padrão é ignorado;
 * - o texto vira número/data como se digitado na célula ("1,5" → 1,5 no pt-BR,
 *   " 7 " → 7, "10/01/2024" → data; "TRUE" fica texto); um resultado → escalar,
 *   vários → coluna; XML inválido ou nada encontrado → #VALUE!.
 */
import { register, type FnContext } from '../fn.js';
import { parseNumberText } from '../coerce.js';
import { ArrayValue, CalcError, ERR, type Scalar } from '../values.js';
import { txt } from './tdl-util.js';

interface XNode { name: string; attrs: Map<string, string>; children: XNode[]; text: string[]; parent?: XNode; order: number }
interface XAttr { attr: true; name: string; value: string; owner: XNode; order: number }
type Item = XNode | XAttr;

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&'; if (k === 'lt') return '<'; if (k === 'gt') return '>'; if (k === 'quot') return '"'; if (k === 'apos') return "'";
    return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });
}

/** XML → árvore (undefined = mal formado). */
function parseXml(src: string): XNode | undefined {
  let i = 0, order = 0;
  const root: XNode = { name: '#document', attrs: new Map(), children: [], text: [], order: order++ };
  let cur = root;
  const n = src.length;
  while (i < n) {
    if (src[i] !== '<') {
      const j = src.indexOf('<', i);
      const t = src.slice(i, j < 0 ? n : j);
      if (cur === root) { if (t.trim()) return undefined; } else cur.text.push(decode(t));
      i = j < 0 ? n : j;
      continue;
    }
    if (src.startsWith('<!--', i)) { const j = src.indexOf('-->', i + 4); if (j < 0) return undefined; i = j + 3; continue; }
    if (src.startsWith('<![CDATA[', i)) { const j = src.indexOf(']]>', i + 9); if (j < 0 || cur === root) return undefined; cur.text.push(src.slice(i + 9, j)); i = j + 3; continue; }
    if (src.startsWith('<?', i)) { const j = src.indexOf('?>', i + 2); if (j < 0) return undefined; i = j + 2; continue; }
    if (src.startsWith('<!', i)) { const j = src.indexOf('>', i + 2); if (j < 0) return undefined; i = j + 1; continue; }
    if (src[i + 1] === '/') {
      const j = src.indexOf('>', i);
      if (j < 0) return undefined;
      const name = src.slice(i + 2, j).trim();
      if (name !== cur.name || !cur.parent) return undefined;
      cur = cur.parent;
      i = j + 1;
      continue;
    }
    const m = /^<([A-Za-z_][\w.:-]*)/.exec(src.slice(i, i + 256));
    if (!m) return undefined;
    const el: XNode = { name: m[1]!, attrs: new Map(), children: [], text: [], parent: cur, order: order++ };
    i += m[0].length;
    for (;;) {
      while (i < n && /\s/.test(src[i]!)) i++;
      if (src.startsWith('/>', i)) { i += 2; cur.children.push(el); break; }
      if (src[i] === '>') { i++; cur.children.push(el); cur = el; break; }
      const a = /^([A-Za-z_][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(i));
      if (!a) return undefined;
      el.attrs.set(a[1]!, decode(a[3] ?? a[4] ?? ''));
      i += a[0].length;
    }
  }
  if (cur !== root || root.children.length !== 1) return undefined;
  return root;
}

// ───────────────────────────── XPath (subconjunto) ─────────────────────────────

class XPathError extends Error {}

/** Tokens: / // [ ] ( ) @ | , = != < > <= >= nomes, números, literais. */
function tokenize(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (s.startsWith('//', i)) { out.push('//'); i += 2; continue; }
    if (s.startsWith('!=', i) || s.startsWith('<=', i) || s.startsWith('>=', i) || s.startsWith('..', i)) { out.push(s.slice(i, i + 2)); i += 2; continue; }
    if ('/[]()@|,=<>*.-+'.includes(c)) { out.push(c); i++; continue; }
    if (c === '"' || c === "'") { const j = s.indexOf(c, i + 1); if (j < 0) throw new XPathError(); out.push(s.slice(i, j + 1)); i = j + 1; continue; }
    const m = /^(\d+(\.\d+)?|[A-Za-z_][\w.:-]*)/.exec(s.slice(i));
    if (!m) throw new XPathError();
    out.push(m[0]); i += m[0].length;
  }
  return out;
}

type Pred = (item: Item, pos: number, size: number) => boolean;
interface Step { axis: 'child' | 'desc' | 'attr' | 'self' | 'parent'; name: string; preds: Pred[] }

class Parser {
  private i = 0;
  constructor(private readonly t: string[]) {}
  private peek(k = 0): string | undefined { return this.t[this.i + k]; }
  private next(): string { const x = this.t[this.i++]; if (x === undefined) throw new XPathError(); return x; }
  private eat(x: string): boolean { if (this.t[this.i] === x) { this.i++; return true; } return false; }
  done(): boolean { return this.i >= this.t.length; }

  union(): Step[][] {
    const paths = [this.path()];
    while (this.eat('|')) paths.push(this.path());
    return paths;
  }

  path(): Step[] {
    const steps: Step[] = [];
    let desc = false;
    if (this.eat('//')) desc = true;
    else if (!this.eat('/')) steps.push({ axis: 'self', name: '#ctx', preds: [] });
    steps.push(this.step(desc));
    for (;;) {
      if (this.eat('//')) steps.push(this.step(true));
      else if (this.eat('/')) steps.push(this.step(false));
      else break;
    }
    return steps;
  }

  step(desc: boolean): Step {
    const tok = this.peek();
    if (tok === '.') { this.next(); return { axis: 'self', name: '*', preds: [] }; }
    if (tok === '..') { this.next(); return { axis: 'parent', name: '*', preds: [] }; }
    let axis: Step['axis'] = desc ? 'desc' : 'child';
    if (this.eat('@')) axis = 'attr';
    const name = this.next();
    if (name === 'text' || name === 'node' || name === 'comment') throw new XPathError(); // text() como resultado → #VALUE!
    if (!(name === '*' || /^[A-Za-z_]/.test(name))) throw new XPathError();
    if (this.peek() === '(') throw new XPathError(); // funções (count, sum, name…) → #VALUE!
    const preds: Pred[] = [];
    while (this.eat('[')) { preds.push(this.predicate()); if (!this.eat(']')) throw new XPathError(); }
    if (axis === 'attr' && desc) return { axis: 'desc', name: '#attr:' + name, preds };
    return { axis, name, preds };
  }

  predicate(): Pred {
    const left = this.orExpr();
    return (item, pos, size) => {
      const v = left(item, pos, size);
      if (typeof v === 'number') return v === pos;
      return truthy(v);
    };
  }

  orExpr(): Ev {
    let a = this.andExpr();
    while (this.peek() === 'or') { this.next(); const l = a, r = this.andExpr(); a = (it, p, s) => truthy(l(it, p, s)) || truthy(r(it, p, s)); }
    return a;
  }

  andExpr(): Ev {
    let a = this.cmpExpr();
    while (this.peek() === 'and') { this.next(); const l = a, r = this.cmpExpr(); a = (it, p, s) => truthy(l(it, p, s)) && truthy(r(it, p, s)); }
    return a;
  }

  cmpExpr(): Ev {
    const l = this.addExpr();
    const op = this.peek();
    if (op && ['=', '!=', '<', '>', '<=', '>='].includes(op)) {
      this.next();
      const r = this.addExpr();
      return (it, p, s) => compare(l(it, p, s), r(it, p, s), op);
    }
    return l;
  }

  addExpr(): Ev {
    let a = this.primary();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.next(); const l = a, r = this.primary();
      a = (it, p, s) => { const x = num(l(it, p, s)), y = num(r(it, p, s)); return op === '+' ? x + y : x - y; };
    }
    return a;
  }

  primary(): Ev {
    const t = this.next();
    if (/^\d/.test(t)) { const v = +t; return () => v; }
    if (t[0] === '"' || t[0] === "'") { const v = t.slice(1, -1); return () => v; }
    if (t === '(') { const e = this.orExpr(); if (!this.eat(')')) throw new XPathError(); return e; }
    if (t === '@') { const n = this.next(); return (it) => (isNode(it) ? (attrOf(it, n) ?? []) : []); }
    if (t === '.') return (it) => [it];
    if ((t === 'last' || t === 'position' || t === 'text') && this.peek() === '(') {
      this.next(); if (!this.eat(')')) throw new XPathError();
      if (t === 'last') return (_, __, size) => size;
      if (t === 'position') return (_, pos) => pos;
      return (it) => (isNode(it) ? [directText(it)] : []);
    }
    if (/^[A-Za-z_]/.test(t)) return (it) => (isNode(it) ? it.children.filter((c) => match(c.name, t)) : []);
    throw new XPathError();
  }
}

type EvVal = number | string | boolean | (Item | string)[];
type Ev = (item: Item, pos: number, size: number) => EvVal;

const isNode = (x: Item): x is XNode => !('attr' in x);
// nome qualificado exato ("p:s" ≠ "s", medido); o namespace padrão (xmlns="…") é ignorado
const match = (name: string, want: string): boolean => want === '*' || name === want;
const attrOf = (n: XNode, want: string): XAttr[] | undefined => {
  const out: XAttr[] = [];
  for (const [k, v] of n.attrs) if (!k.startsWith('xmlns') && match(k, want)) out.push({ attr: true, name: k, value: v, owner: n, order: n.order + 0.5 });
  return out.length ? out : undefined;
};
const directText = (n: XNode): string => n.text.join('');
const strOf = (x: Item | string): string => (typeof x === 'string' ? x : isNode(x) ? directText(x) : x.value);
const truthy = (v: EvVal): boolean => (Array.isArray(v) ? v.length > 0 : typeof v === 'number' ? v !== 0 && !Number.isNaN(v) : typeof v === 'string' ? v !== '' : v);
const num = (v: EvVal): number => (Array.isArray(v) ? (v.length ? Number(strOf(v[0]!)) : NaN) : typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : Number(v));

function compare(a: EvVal, b: EvVal, op: string): boolean {
  const la = Array.isArray(a) ? a.map(strOf) : [a], lb = Array.isArray(b) ? b.map(strOf) : [b];
  for (const x of la) for (const y of lb) {
    const numeric = typeof x === 'number' || typeof y === 'number' || (op !== '=' && op !== '!=');
    const p = numeric ? Number(x) : String(x), q = numeric ? Number(y) : String(y);
    const ok = op === '=' ? p === q : op === '!=' ? p !== q : op === '<' ? p < q : op === '>' ? p > q : op === '<=' ? p <= q : p >= q;
    if (ok) return true;
  }
  return false;
}

function descendants(n: XNode, out: XNode[]): void {
  for (const c of n.children) { out.push(c); descendants(c, out); }
}

function evalPath(root: XNode, steps: Step[]): Item[] {
  let cur: Item[] = [root];
  for (const st of steps) {
    const next: Item[] = [];
    for (const it of cur) {
      if (!isNode(it)) continue;
      let cand: Item[] = [];
      if (st.axis === 'self') cand = st.name === '#ctx' ? [it] : [it];
      else if (st.axis === 'parent') cand = it.parent ? [it.parent] : [];
      else if (st.axis === 'child') cand = it.children.filter((c) => match(c.name, st.name));
      else if (st.axis === 'attr') cand = attrOf(it, st.name) ?? [];
      else {
        const all: XNode[] = [];
        descendants(it, all);
        if (st.name.startsWith('#attr:')) { const an = st.name.slice(6); cand = [...attrOf(it, an) ?? [], ...all.flatMap((d) => attrOf(d, an) ?? [])]; }
        else cand = all.filter((c) => match(c.name, st.name));
      }
      for (const p of st.preds) cand = cand.filter((c, k) => p(c, k + 1, cand.length));
      next.push(...cand);
    }
    cur = [...new Set(next)].sort((a, b) => a.order - b.order);
  }
  return cur;
}

register({
  name: 'FILTERXML', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, args: 'value', lift: true,
  call: ([xv, pv], ctx: FnContext) => {
    const xml = txt(xv, ctx); if (xml instanceof CalcError) return xml;
    const xp = txt(pv, ctx); if (xp instanceof CalcError) return xp;
    const root = parseXml(xml);
    if (!root) return ERR.VALUE;
    let items: Item[];
    try {
      const p = new Parser(tokenize(xp));
      const paths = p.union();
      if (!p.done()) return ERR.VALUE;
      items = [...new Set(paths.flatMap((s) => evalPath(root, s)))].sort((a, b) => a.order - b.order).filter((x) => x !== root);
    } catch {
      return ERR.VALUE;
    }
    if (!items.length) return ERR.VALUE;
    const vals: Scalar[] = items.map((it) => {
      const s = isNode(it) ? directText(it) : it.value;
      if (isNode(it) && s === '') return ERR.VALUE;
      return parseNumberText(s, ctx.locale, ctx.date1904) ?? s;
    });
    return vals.length === 1 ? vals[0]! : new ArrayValue(vals.length, 1, vals);
  },
});
