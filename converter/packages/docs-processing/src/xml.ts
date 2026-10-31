/**
 * Parser XML mínimo para OOXML (sem dependências, roda em browser e Node).
 * Não resolve namespaces — nomes prefixados ("w:p") são usados literalmente,
 * o que é estável dentro de um docx (prefixos fixos no root).
 */

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: (XmlElement | string)[];
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e: string) => {
    if (e.startsWith('#x') || e.startsWith('#X')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? `&${e};`;
  });
}

export function parseXml(xml: string): XmlElement {
  let i = 0;
  const n = xml.length;

  function error(msg: string): never {
    throw new Error(`XML inválido @${i}: ${msg}`);
  }

  function skipMisc(): void {
    for (;;) {
      while (i < n && /\s/.test(xml[i]!)) i++;
      if (xml.startsWith('<?', i)) {
        i = xml.indexOf('?>', i);
        if (i < 0) error('?> não fechado');
        i += 2;
      } else if (xml.startsWith('<!--', i)) {
        i = xml.indexOf('-->', i);
        if (i < 0) error('--> não fechado');
        i += 3;
      } else if (xml.startsWith('<!', i)) {
        i = xml.indexOf('>', i);
        if (i < 0) error('<! não fechado');
        i += 1;
      } else break;
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
      if (xml[i] === '/') {
        if (xml[i + 1] !== '>') error('esperava />');
        i += 2;
        return { name, attrs, children: [] };
      }
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
      if (i < 0) error('aspas não fechadas');
      attrs[aName] = decodeEntities(xml.slice(vStart, i));
      i++;
    }
    // conteúdo
    const children: (XmlElement | string)[] = [];
    for (;;) {
      if (i >= n) error(`</${name}> ausente`);
      if (xml.startsWith('</', i)) {
        const close = xml.indexOf('>', i);
        i = close + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith('<!--', i)) {
        i = xml.indexOf('-->', i) + 3;
        continue;
      }
      if (xml.startsWith('<![CDATA[', i)) {
        const end = xml.indexOf(']]>', i);
        children.push(xml.slice(i + 9, end));
        i = end + 3;
        continue;
      }
      if (xml[i] === '<') {
        children.push(parseElement());
        continue;
      }
      const tStart = i;
      while (i < n && xml[i] !== '<') i++;
      const text = decodeEntities(xml.slice(tStart, i));
      if (text.length > 0) children.push(text);
    }
  }

  skipMisc();
  const root = parseElement();
  return root;
}

export function childElements(el: XmlElement, name?: string): XmlElement[] {
  return el.children.filter(
    (c): c is XmlElement => typeof c !== 'string' && (name === undefined || c.name === name),
  );
}

export function firstChild(el: XmlElement, name: string): XmlElement | undefined {
  return childElements(el, name)[0];
}

export function textContent(el: XmlElement): string {
  let out = '';
  for (const c of el.children) {
    out += typeof c === 'string' ? c : textContent(c);
  }
  return out;
}
