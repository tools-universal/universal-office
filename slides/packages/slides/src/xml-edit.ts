// Edição de XML POR TEXTO para o editor de apresentações: localizar elementos
// (com aninhamento), trocar atributos e substituir trechos — sem reserializar
// o documento. REGRA DE OURO do pacote (round-trip sem perdas): só o trecho
// editado muda; o resto da parte segue byte a byte (prefixos, namespaces,
// extLst e mc:AlternateContent que o leitor não conhece ficam intactos).
//
// `<` nunca aparece cru em texto nem em atributo (XML exige o escape), então
// procurar `<nome` é seguro; o FIM de uma tag de abertura respeita as aspas
// (um `>` cru é permitido dentro de um valor de atributo).

/** Trecho `[start, end)` de um elemento no texto, com o fim da tag de abertura. */
export interface XmlRange {
  start: number;
  end: number;
  /** índice logo depois do `>` da tag de abertura */
  openEnd: number;
  /** `<x/>` */
  selfClosing: boolean;
}

const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Índice logo depois do `>` da tag que começa em `pos` (pula valores entre aspas). */
export function tagEnd(xml: string, pos: number): number {
  let q = '';
  for (let i = pos + 1; i < xml.length; i++) {
    const c = xml[i]!;
    if (q) { if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '>') return i + 1;
  }
  return xml.length;
}

/**
 * Elementos `name` (nome qualificado exato, ex. `p:sp`) dentro de `[from, to)`,
 * em ordem do documento. Aninhados do mesmo nome contam só pelo de fora
 * (`p:grpSp` dentro de `p:grpSp` → um trecho, o externo).
 */
export function findElements(xml: string, name: string, from = 0, to = xml.length): XmlRange[] {
  const re = new RegExp(`<(/?)${escRe(name)}(?=[\\s/>])`, 'g');
  re.lastIndex = from;
  const out: XmlRange[] = [];
  let depth = 0;
  let cur: { start: number; openEnd: number } | null = null;
  for (let m = re.exec(xml); m && m.index < to; m = re.exec(xml)) {
    const close = m[1] === '/';
    const end = tagEnd(xml, m.index);
    if (close) {
      if (depth === 0) continue; // fechamento órfão
      depth--;
      if (depth === 0 && cur) { out.push({ start: cur.start, end, openEnd: cur.openEnd, selfClosing: false }); cur = null; }
      re.lastIndex = end;
      continue;
    }
    const self = xml[end - 2] === '/';
    if (depth === 0) {
      if (self) out.push({ start: m.index, end, openEnd: end, selfClosing: true });
      else cur = { start: m.index, openEnd: end };
    }
    if (!self) depth++;
    re.lastIndex = end;
  }
  return out;
}

/** TODOS os elementos `name`, inclusive os aninhados no mesmo nome (`p:par` dentro de `p:par`). */
export function findAllElements(xml: string, name: string, from = 0, to = xml.length): XmlRange[] {
  const re = new RegExp(`<(/?)${escRe(name)}(?=[\\s/>])`, 'g');
  re.lastIndex = from;
  const out: XmlRange[] = [];
  const stack: { start: number; openEnd: number }[] = [];
  for (let m = re.exec(xml); m && m.index < to; m = re.exec(xml)) {
    const end = tagEnd(xml, m.index);
    if (m[1] === '/') {
      const o = stack.pop();
      if (o) out.push({ start: o.start, end, openEnd: o.openEnd, selfClosing: false });
    } else if (xml[end - 2] === '/') out.push({ start: m.index, end, openEnd: end, selfClosing: true });
    else stack.push({ start: m.index, openEnd: end });
    re.lastIndex = end;
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Primeiro elemento `name` dentro de `[from, to)`. */
export function findElement(xml: string, name: string, from = 0, to = xml.length): XmlRange | undefined {
  return findElements(xml, name, from, to)[0];
}

/** Filhos DIRETOS (qualquer nome) do elemento em `r`. */
export function childRanges(xml: string, r: XmlRange): (XmlRange & { name: string })[] {
  if (r.selfClosing) return [];
  const out: (XmlRange & { name: string })[] = [];
  const innerEnd = r.end - (`</${elementName(xml, r)}>`).length;
  let i = r.openEnd;
  while (i < innerEnd) {
    const lt = xml.indexOf('<', i);
    if (lt < 0 || lt >= innerEnd) break;
    const c = xml[lt + 1];
    if (c === '/') break;
    if (c === '!' || c === '?') { // comentário / CDATA / instrução
      const close = xml.startsWith('<!--', lt) ? xml.indexOf('-->', lt) + 3 : xml.startsWith('<![CDATA[', lt) ? xml.indexOf(']]>', lt) + 3 : tagEnd(xml, lt);
      i = close > lt ? close : innerEnd;
      continue;
    }
    const name = /^<([\w:.-]+)/.exec(xml.slice(lt, lt + 80))?.[1];
    if (!name) { i = lt + 1; continue; }
    const el = findElement(xml, name, lt, innerEnd);
    if (!el || el.start !== lt) { i = tagEnd(xml, lt); continue; }
    out.push({ ...el, name });
    i = el.end;
  }
  return out;
}

/** Nome qualificado do elemento em `r`. */
export function elementName(xml: string, r: XmlRange): string {
  return /^<([\w:.-]+)/.exec(xml.slice(r.start, r.start + 80))?.[1] ?? '';
}

/** Valor de um atributo da tag de abertura em `r` (desescapado), ou null. */
export function getAttr(xml: string, r: XmlRange, attr: string): string | null {
  const open = xml.slice(r.start, r.openEnd);
  const m = new RegExp(`\\s${escRe(attr)}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(open);
  return m ? unescapeXml(m[2] ?? m[3] ?? '') : null;
}

/**
 * Tag de abertura com o atributo trocado (`null` remove). Devolve o texto
 * novo da TAG (não o documento).
 */
export function setAttrInTag(tag: string, attr: string, value: string | null): string {
  const re = new RegExp(`\\s${escRe(attr)}\\s*=\\s*("[^"]*"|'[^']*')`);
  if (value === null) return tag.replace(re, '');
  const v = ` ${attr}="${escapeAttr(value)}"`;
  if (re.test(tag)) return tag.replace(re, v);
  const close = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1;
  return tag.slice(0, close).replace(/\s+$/, '') + v + tag.slice(close);
}

/** Documento com o atributo da tag de abertura de `r` trocado (`null` remove). */
export function setAttr(xml: string, r: XmlRange, attr: string, value: string | null): string {
  const tag = setAttrInTag(xml.slice(r.start, r.openEnd), attr, value);
  return xml.slice(0, r.start) + tag + xml.slice(r.openEnd);
}

/** Substitui `[start, end)` por `text`. */
export function splice(xml: string, start: number, end: number, text: string): string {
  return xml.slice(0, start) + text + xml.slice(end);
}

/** Conteúdo entre a tag de abertura e a de fechamento do elemento em `r`. */
export function innerXml(xml: string, r: XmlRange): string {
  if (r.selfClosing) return '';
  return xml.slice(r.openEnd, r.end - (`</${elementName(xml, r)}>`).length);
}

/** Troca o conteúdo do elemento (um `<x/>` vira `<x>…</x>`). */
export function setInner(xml: string, r: XmlRange, inner: string): string {
  const name = elementName(xml, r);
  if (r.selfClosing) {
    const open = xml.slice(r.start, r.openEnd).replace(/\s*\/>$/, '>');
    return splice(xml, r.start, r.end, `${open}${inner}</${name}>`);
  }
  return splice(xml, r.openEnd, r.end - (`</${name}>`).length, inner);
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()]!);
}

/**
 * Insere `text` como filho do elemento em `r`: antes do primeiro filho cujo
 * nome está em `before` (ordem do esquema), senão no fim.
 */
export function insertChild(xml: string, r: XmlRange, text: string, before: readonly string[] = []): string {
  if (r.selfClosing) return setInner(xml, r, text);
  const kids = childRanges(xml, r);
  const at = kids.find((k) => before.includes(k.name));
  const pos = at ? at.start : r.end - (`</${elementName(xml, r)}>`).length;
  return splice(xml, pos, pos, text);
}
