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

/** URI de namespace → prefixo canônico usado pelo motor (e pelos leitores dos hospedeiros). */
const CANONICAL: Record<string, string> = {
  'http://schemas.openxmlformats.org/drawingml/2006/chart': 'c',
  'http://purl.oclc.org/ooxml/drawingml/chart': 'c',
  'http://schemas.openxmlformats.org/drawingml/2006/main': 'a',
  'http://purl.oclc.org/ooxml/drawingml/main': 'a',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships': 'r',
  'http://purl.oclc.org/ooxml/officeDocument/relationships': 'r',
  'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing': 'xdr',
  'http://purl.oclc.org/ooxml/drawingml/spreadsheetDrawing': 'xdr',
  'http://schemas.openxmlformats.org/drawingml/2006/chartDrawing': 'cdr',
  'http://purl.oclc.org/ooxml/drawingml/chartDrawing': 'cdr',
  'http://schemas.openxmlformats.org/markup-compatibility/2006': 'mc',
  'http://schemas.microsoft.com/office/drawing/2007/8/2/chart': 'c14',
  'http://schemas.microsoft.com/office/drawing/2012/chart': 'c15',
  'http://schemas.microsoft.com/office/drawing/2014/chart': 'c16',
  'http://schemas.microsoft.com/office/drawing/2017/03/chart': 'c16r3',
  'http://schemas.microsoft.com/office/drawing/2014/chartex': 'cx',
  'http://schemas.microsoft.com/office/drawing/2015/9/8/chartex': 'cx1',
  'http://schemas.microsoft.com/office/drawing/2015/10/21/chartex': 'cx2',
  'http://schemas.microsoft.com/office/drawing/2016/5/9/chartex': 'cx3',
  'http://schemas.microsoft.com/office/drawing/2016/5/10/chartex': 'cx4',
  'http://schemas.microsoft.com/office/drawing/2016/5/11/chartex': 'cx5',
  'http://schemas.microsoft.com/office/drawing/2016/5/12/chartex': 'cx6',
  'http://schemas.microsoft.com/office/drawing/2016/5/13/chartex': 'cx7',
  'http://schemas.microsoft.com/office/drawing/2016/5/14/chartex': 'cx8',
  'http://schemas.microsoft.com/office/drawing/2010/main': 'a14',
};

/**
 * Renomeia elementos e atributos prefixados para os prefixos CANÔNICOS (`c:`,
 * `a:`, `r:`, `xdr:`, `cx:`…) pelos URIs declarados — o motor casa nomes
 * literalmente, e há geradores com namespace default (`<chartSpace xmlns=…>`),
 * prefixos próprios (`<ns0:barChart>`) ou o OOXML Strict (purl.oclc.org).
 * Árvore já canônica volta intacta (o mesmo objeto).
 */
export function canonicalNs<T extends XmlNode>(root: T): T {
  const needs = (el: XmlNode): boolean => {
    for (const k in el.attrs) {
      const v = el.attrs[k]!;
      if (k === 'xmlns') { if (CANONICAL[v]) return true; }
      else if (k.startsWith('xmlns:')) { const c = CANONICAL[v]; if (c && c !== k.slice(6)) return true; }
    }
    for (const c of el.children) if (typeof c !== 'string' && needs(c)) return true;
    return false;
  };
  if (!needs(root)) return root;
  const walk = (el: XmlNode, scope: Map<string, string>): XmlNode => {
    let sc = scope;
    for (const k in el.attrs) {
      if (k === 'xmlns' || k.startsWith('xmlns:')) {
        if (sc === scope) sc = new Map(scope);
        sc.set(k === 'xmlns' ? '' : k.slice(6), el.attrs[k]!);
      }
    }
    const rename = (name: string, isAttr: boolean): string => {
      if (name === 'xmlns' || name.startsWith('xmlns:')) return name;
      const i = name.indexOf(':');
      if (i < 0 && isAttr) return name; // atributo sem prefixo não tem namespace
      const uri = sc.get(i < 0 ? '' : name.slice(0, i));
      const canon = uri !== undefined ? CANONICAL[uri] : undefined;
      return canon === undefined ? name : `${canon}:${i < 0 ? name : name.slice(i + 1)}`;
    };
    const attrs: Record<string, string> = {};
    for (const k in el.attrs) attrs[rename(k, true)] = el.attrs[k]!;
    return { name: rename(el.name, false), attrs, children: el.children.map((c) => (typeof c === 'string' ? c : walk(c, sc))) };
  };
  return walk(root, new Map()) as T;
}
