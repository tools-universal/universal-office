/**
 * Parser XML minimo para OOXML (sem dependencias, roda em browser e Node).
 * Nao resolve namespaces — nomes prefixados ("p:sld", "a:off") sao usados
 * literalmente, o que e estavel dentro de um pptx (prefixos fixos no root).
 * (Identico ao do sheet-core — mesma metodologia do monorepo.)
 */

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: (XmlElement | string)[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Ponto de código de uma referência numérica; fora do Unicode (ou NaN) vira U+FFFD em vez de lançar. */
function codePoint(cp: number): string {
  return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '�';
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e: string) => {
    if (e.startsWith('#x') || e.startsWith('#X')) return codePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return codePoint(parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? `&${e};`;
  });
}

export function parseXml(xml: string): XmlElement {
  let i = 0;
  const n = xml.length;
  function error(msg: string): never { throw new Error(`XML invalido @${i}: ${msg}`); }

  function skipMisc(): void {
    for (;;) {
      while (i < n && /\s/.test(xml[i]!)) i++;
      if (xml.startsWith('<?', i)) { i = xml.indexOf('?>', i); if (i < 0) error('?> nao fechado'); i += 2; }
      else if (xml.startsWith('<!--', i)) { i = xml.indexOf('-->', i); if (i < 0) error('--> nao fechado'); i += 3; }
      else if (xml.startsWith('<!', i)) { i = xml.indexOf('>', i); if (i < 0) error('<! nao fechado'); i += 1; }
      else break;
    }
  }

  function parseElement(): XmlElement {
    if (xml[i] !== '<') error('esperava <');
    i++;
    const nameStart = i;
    while (i < n && !/[\s/>]/.test(xml[i]!)) i++;
    const name = xml.slice(nameStart, i);
    const attrs: Record<string, string> = {};
    for (;;) {
      while (i < n && /\s/.test(xml[i]!)) i++;
      if (xml[i] === '/') { if (xml[i + 1] !== '>') error('esperava />'); i += 2; return { name, attrs, children: [] }; }
      if (xml[i] === '>') { i++; break; }
      const aStart = i;
      while (i < n && xml[i] !== '=' && !/\s/.test(xml[i]!)) i++;
      const aName = xml.slice(aStart, i);
      while (i < n && /\s/.test(xml[i]!)) i++;
      if (xml[i] !== '=') error(`atributo ${aName} sem =`);
      i++;
      while (i < n && /\s/.test(xml[i]!)) i++;
      const q = xml[i];
      if (q !== '"' && q !== "'") error('valor de atributo sem aspas');
      i++;
      const vStart = i;
      i = xml.indexOf(q, i);
      if (i < 0) error('aspas nao fechadas');
      attrs[aName] = decodeEntities(xml.slice(vStart, i));
      i++;
    }
    const children: (XmlElement | string)[] = [];
    // fechamentos ausentes são ERRO: indexOf → -1 voltaria o cursor para o
    // início do texto (laço infinito / recursão sem fim com arquivo malformado)
    const upTo = (token: string, what: string): number => {
      const end = xml.indexOf(token, i);
      if (end < 0) error(`${what} nao fechado`);
      return end;
    };
    for (;;) {
      if (i >= n) error(`</${name}> ausente`);
      if (xml.startsWith('</', i)) { i = upTo('>', `</${name}`) + 1; return { name, attrs, children }; }
      if (xml.startsWith('<!--', i)) { i = upTo('-->', '<!--') + 3; continue; }
      if (xml.startsWith('<![CDATA[', i)) { const end = upTo(']]>', '<![CDATA['); children.push(xml.slice(i + 9, end)); i = end + 3; continue; }
      if (xml.startsWith('<?', i)) { i = upTo('?>', '<?') + 2; continue; } // PI no conteúdo: ignora
      if (xml[i] === '<') { children.push(parseElement()); continue; }
      const tStart = i;
      while (i < n && xml[i] !== '<') i++;
      const text = decodeEntities(xml.slice(tStart, i));
      if (text.length > 0) children.push(text);
    }
  }

  skipMisc();
  return parseElement();
}

export function childElements(el: XmlElement, name?: string): XmlElement[] {
  return el.children.filter((c): c is XmlElement => typeof c !== 'string' && (name === undefined || c.name === name));
}

export function firstChild(el: XmlElement, name: string): XmlElement | undefined {
  return childElements(el, name)[0];
}

/** Busca o primeiro descendente (qualquer profundidade) com o nome dado. */
export function descend(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === name) return c;
    const found = descend(c, name);
    if (found) return found;
  }
  return undefined;
}

export function textContent(el: XmlElement): string {
  let out = '';
  for (const c of el.children) out += typeof c === 'string' ? c : textContent(c);
  return out;
}
