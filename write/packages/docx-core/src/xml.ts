/**
 * Parser XML mínimo para OOXML (sem dependências, roda em browser e Node).
 * Nomes prefixados ("w:p") são usados literalmente — o que é estável dentro de
 * um docx do Word — EXCETO quando o arquivo liga um namespace conhecido a OUTRO
 * prefixo (ex.: xmlns:ve="…/markup-compatibility/2006" de geradores antigos do
 * Open XML SDK): aí o nome é reescrito para o prefixo canônico (ve:Choice →
 * mc:Choice). O Word resolve pelo namespace, não pelo prefixo (oráculo hidetext).
 */

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: (XmlElement | string)[];
  /** Fatia CRUA do fonte para este elemento (só populada em elementos que
   *  precisamos reemitir byte-a-byte, ex.: w:drawing — formas/caixas de texto
   *  que não reconstruímos). Ver RAW_CAPTURE. */
  raw?: string;
  /** Posições no fonte (só com `positions`): início da tag, início/fim do
   *  conteúdo e fim do elemento — base do salvamento sem perdas (source.ts). */
  s?: number;
  cs?: number;
  ce?: number;
  e?: number;
}

export interface ParseOptions {
  /** Grava s/cs/ce/e em cada elemento (fatias cruas do fonte). */
  positions?: boolean;
}

/** Nomes de elementos cujo XML cru preservamos para reemissão fiel. */
const RAW_CAPTURE = new Set(['w:drawing']);

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

/** Namespace → prefixo canônico (o que o resto do leitor espera). */
const CANONICAL_PREFIX: Record<string, string> = {
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main': 'w',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships': 'r',
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing': 'wp',
  'http://schemas.openxmlformats.org/drawingml/2006/main': 'a',
  'http://schemas.openxmlformats.org/drawingml/2006/picture': 'pic',
  'http://schemas.openxmlformats.org/officeDocument/2006/math': 'm',
  'http://schemas.openxmlformats.org/markup-compatibility/2006': 'mc',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingShape': 'wps',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup': 'wpg',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas': 'wpc',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing': 'wp14',
  'http://schemas.microsoft.com/office/word/2010/wordml': 'w14',
  'http://schemas.microsoft.com/office/word/2012/wordml': 'w15',
  'urn:schemas-microsoft-com:vml': 'v',
  'urn:schemas-microsoft-com:office:office': 'o',
  'urn:schemas-microsoft-com:office:word': 'w10',
};

/** Renomeações de prefixo em vigor (prefixo do arquivo → canônico). */
type Renames = ReadonlyMap<string, string>;
const NO_RENAMES: Renames = new Map();

function renamed(name: string, ren: Renames): string {
  if (ren.size === 0) return name;
  const c = name.indexOf(':');
  if (c <= 0) return name;
  const to = ren.get(name.slice(0, c));
  return to === undefined ? name : `${to}${name.slice(c)}`;
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_, e: string) => {
    if (e.startsWith('#x') || e.startsWith('#X')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return (Object.hasOwn(ENTITIES, e) ? ENTITIES[e] : undefined) ?? `&${e};`;
  });
}

export function parseXml(xml: string, opts: ParseOptions = {}): XmlElement {
  const pos = opts.positions === true;
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

  function parseElement(parentRen: Renames): XmlElement {
    if (xml[i] !== '<') error('esperava <');
    const elStart = i;
    i++;
    const nameStart = i;
    while (i < n && !/[\s/>]/.test(xml[i]!)) i++;
    let name = xml.slice(nameStart, i);
    let attrs: Record<string, string> = {};
    let ren = parentRen;
    let declares = false;
    /** declarações xmlns:* deste elemento: prefixos fora do padrão viram o canônico */
    const scope = (): void => {
      let own: Map<string, string> | null = null;
      for (const k in declares ? attrs : {}) {
        if (!k.startsWith('xmlns:')) continue;
        const pfx = k.slice(6);
        const uri = attrs[k]!;
        const canon = Object.hasOwn(CANONICAL_PREFIX, uri) ? CANONICAL_PREFIX[uri] : undefined;
        if ((canon === undefined || canon === pfx) && !ren.has(pfx)) continue;
        own ??= new Map(ren);
        if (canon === undefined || canon === pfx) own.delete(pfx);
        else own.set(pfx, canon);
      }
      if (own) ren = own;
      if (ren.size === 0) return;
      name = renamed(name, ren);
      const out: Record<string, string> = {};
      for (const k in attrs) out[k.startsWith('xmlns:') ? k : renamed(k, ren)] = attrs[k]!;
      attrs = out;
    };
    for (;;) {
      while (i < n && /\s/.test(xml[i]!)) i++;
      if (xml[i] === '/') {
        if (xml[i + 1] !== '>') error('esperava />');
        i += 2;
        scope();
        const el: XmlElement = { name, attrs, children: [] };
        if (RAW_CAPTURE.has(name)) el.raw = xml.slice(elStart, i);
        if (pos) { el.s = elStart; el.cs = i; el.ce = i; el.e = i; }
        return el;
      }
      if (xml[i] === '>') { i++; scope(); break; }
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
      if (aName.startsWith('xmlns:')) declares = true;
      i++;
    }
    // conteúdo
    const contentStart = i;
    const children: (XmlElement | string)[] = [];
    for (;;) {
      if (i >= n) error(`</${name}> ausente`);
      if (xml.startsWith('</', i)) {
        const contentEnd = i;
        const close = xml.indexOf('>', i);
        i = close + 1;
        const el: XmlElement = { name, attrs, children };
        if (RAW_CAPTURE.has(name)) el.raw = xml.slice(elStart, i);
        if (pos) { el.s = elStart; el.cs = contentStart; el.ce = contentEnd; el.e = i; }
        return el;
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
        children.push(parseElement(ren));
        continue;
      }
      const tStart = i;
      while (i < n && xml[i] !== '<') i++;
      const text = decodeEntities(xml.slice(tStart, i));
      if (text.length > 0) children.push(text);
    }
  }

  skipMisc();
  const root = parseElement(NO_RENAMES);
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
