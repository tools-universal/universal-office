/**
 * DOMParser mínimo para os testes de colar HTML (paste-html.ts) no Node, sem
 * jsdom: elementos, texto e comentários — inclusive os `<![if !supportLists]>`
 * do Word, que o navegador lê como comentários —, atributos, entidades comuns e
 * o `style` em linha como propriedades camelCase (o que o CSSStyleDeclaration
 * expõe). Só para HTML bem formado de teste; não faz a correção de árvore do
 * HTML5 (fechar <p> implícito etc.).
 */
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'col', 'wbr', 'area', 'base', 'source']);
const RAW = new Set(['script', 'style']);

const decode = (s: string): string => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');

abstract class MiniNode {
  abstract nodeType: number;
  parentNode: MiniElement | null = null;
  nodeValue: string | null = null;
  readonly childNodes: MiniNode[] = [];
  get textContent(): string { return this.nodeValue ?? this.childNodes.map((c) => (c.nodeType === 8 ? '' : c.textContent)).join(''); }
}

class MiniText extends MiniNode {
  nodeType = 3;
  constructor(v: string) { super(); this.nodeValue = v; }
}

class MiniComment extends MiniNode {
  nodeType = 8;
  constructor(v: string) { super(); this.nodeValue = v; }
  override get textContent(): string { return ''; }
}

function styleOf(attr: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of (attr ?? '').split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim().toLowerCase();
    const v = decl.slice(i + 1).trim();
    if (!k || k.startsWith('mso-')) continue; // o navegador descarta as propriedades do Office
    out[k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = v;
  }
  return out;
}

class MiniElement extends MiniNode {
  nodeType = 1;
  readonly attrs = new Map<string, string>();
  constructor(readonly tagName: string) { super(); }
  get localName(): string { return this.tagName.toLowerCase(); }
  getAttribute(n: string): string | null { return this.attrs.get(n.toLowerCase()) ?? null; }
  hasAttribute(n: string): boolean { return this.attrs.has(n.toLowerCase()); }
  get children(): MiniElement[] { return this.childNodes.filter((c): c is MiniElement => c instanceof MiniElement); }
  get style(): Record<string, string> { return styleOf(this.getAttribute('style')); }
  append(c: MiniNode): void { c.parentNode = this; this.childNodes.push(c); }
  find(tag: string): MiniElement | null {
    for (const c of this.children) {
      if (c.localName === tag) return c;
      const f = c.find(tag);
      if (f) return f;
    }
    return null;
  }
}

export function parseHtml(html: string): { body: MiniElement; documentElement: MiniElement } {
  const root = new MiniElement('#ROOT');
  const stack: MiniElement[] = [root];
  const top = (): MiniElement => stack[stack.length - 1]!;
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const e = end < 0 ? html.length : end;
      top().append(new MiniComment(html.slice(i + 4, e)));
      i = e + 3;
      continue;
    }
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      // <!doctype>, <![if …]>, <![endif]>: comentário "falso" (o conteúdo vira o texto dele)
      const end = html.indexOf('>', i);
      const body = html.slice(i + 2, end < 0 ? html.length : end);
      if (!/^doctype/i.test(body)) top().append(new MiniComment(body));
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    if (html[i] === '<' && html[i + 1] === '/') {
      const end = html.indexOf('>', i);
      const name = html.slice(i + 2, end).trim().toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k]!.localName === name) { stack.length = k; break; }
      }
      i = end + 1;
      continue;
    }
    if (html[i] === '<' && /[a-zA-Z]/.test(html[i + 1] ?? '')) {
      const m = /^<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/.exec(html.slice(i));
      if (m) {
        const el = new MiniElement(m[1]!.toUpperCase());
        const re = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let a: RegExpExecArray | null;
        while ((a = re.exec(m[2]!))) el.attrs.set(a[1]!.toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? ''));
        top().append(el);
        i += m[0].length;
        const name = el.localName;
        if (RAW.has(name)) {
          const end = html.toLowerCase().indexOf(`</${name}`, i);
          const e = end < 0 ? html.length : end;
          el.append(new MiniText(html.slice(i, e)));
          i = html.indexOf('>', e) + 1 || html.length;
          continue;
        }
        if (!VOID.has(name) && !m[3]) stack.push(el);
        continue;
      }
    }
    const next = html.indexOf('<', i + 1);
    const e = next < 0 ? html.length : next;
    top().append(new MiniText(decode(html.slice(i, e))));
    i = e;
  }
  const body = root.find('body') ?? root;
  return { body, documentElement: root };
}

/** `globalThis.DOMParser` de teste (só 'text/html'). */
export class MiniDOMParser {
  parseFromString(html: string): { body: MiniElement; documentElement: MiniElement } { return parseHtml(html); }
}
