/**
 * Árvore XML ESTRUTURAL: o motor não parseia XML — recebe a árvore já parseada
 * pelo app hospedeiro (o `XmlElement` do slides-core e do sheet-core têm esta
 * mesma forma), e o resolvedor de cor do hospedeiro recebe os nós como vieram.
 */
export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: (XmlNode | string)[];
}

export function childElements(el: XmlNode, name?: string): XmlNode[] {
  const out: XmlNode[] = [];
  for (const c of el.children) if (typeof c !== 'string' && (name === undefined || c.name === name)) out.push(c);
  return out;
}

export function firstChild(el: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!el) return undefined;
  for (const c of el.children) if (typeof c !== 'string' && c.name === name) return c;
  return undefined;
}

export function textContent(el: XmlNode): string {
  let s = '';
  for (const c of el.children) s += typeof c === 'string' ? c : textContent(c);
  return s;
}

/** Primeiro descendente (profundidade) com o nome. */
export function descend(el: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!el) return undefined;
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === name) return c;
    const d = descend(c, name);
    if (d) return d;
  }
  return undefined;
}

/** Nó sintético (cores default montadas pelo motor, resolvidas pelo hospedeiro). */
export function node(name: string, attrs: Record<string, string> = {}, children: XmlNode[] = []): XmlNode {
  return { name, attrs, children };
}

/** `val` numérico de um filho (`<c:x val="…"/>`). */
export function valNum(el: XmlNode | undefined, name: string): number | undefined {
  const v = firstChild(el, name)?.attrs['val'];
  if (v === undefined) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/** `val` booleano de um filho; o default do schema para `<c:x/>` sem val é true. */
export function valBool(el: XmlNode | undefined, name: string): boolean | undefined {
  const c = firstChild(el, name);
  if (!c) return undefined;
  const v = c.attrs['val'];
  return v === undefined || v === '1' || v === 'true';
}

export function valStr(el: XmlNode | undefined, name: string): string | undefined {
  return firstChild(el, name)?.attrs['val'];
}
