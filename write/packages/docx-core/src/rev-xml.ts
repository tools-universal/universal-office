/**
 * XML das revisões geradas ao salvar (w:ins, w:del, w:rPrChange, w:pPrChange,
 * marcas de parágrafo): w:id únicos acima dos que o pacote já usa, autor, data
 * (w:date como o Word grava — hora local com Z) e w16du:dateUtc. Quem usa o
 * w16du precisa declarar o namespace na raiz da parte (ensureRevisionNamespaces).
 */
import type { RevisionInfo } from './ooxml/props.js';

export const W16DU_NS = 'http://schemas.microsoft.com/office/word/2023/wordml/word16du';
const MC_NS = 'http://schemas.openxmlformats.org/markup-compatibility/2006';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let nextId = 1;
let usedUtc = false;

/** Começo de um salvamento: ids novos acima do maior w:id dos textos dados. */
export function beginRevisionIds(...xmls: (string | undefined)[]): void {
  let max = 0;
  for (const x of xmls) {
    if (!x) continue;
    for (const m of x.matchAll(/\bw:id="(-?\d+)"/g)) max = Math.max(max, Number(m[1]));
  }
  nextId = max + 1;
  usedUtc = false;
}

/** Algum w16du:dateUtc foi gerado desde o começo da parte? (e zera) */
export function takeUsedDateUtc(): boolean {
  const u = usedUtc;
  usedUtc = false;
  return u;
}

/** Atributos de uma revisão nova: w:id, w:author, w:date, w16du:dateUtc. */
export function revisionAttrs(r: RevisionInfo): string {
  let a = ` w:id="${nextId++}" w:author="${esc(r.author)}"`;
  if (r.date) a += ` w:date="${esc(r.date)}"`;
  if (r.dateUtc) { a += ` w16du:dateUtc="${esc(r.dateUtc)}"`; usedUtc = true; }
  return a;
}

/** Elemento de revisão vazio (marca de parágrafo): <w:ins …/>, <w:del …/>, moveFrom/To. */
export function markRevisionXml(kind: 'ins' | 'del', r: RevisionInfo): string {
  const tag = r.move ? (kind === 'ins' ? 'w:moveTo' : 'w:moveFrom') : `w:${kind}`;
  return `<${tag}${revisionAttrs(r)}/>`;
}

/** Envoltório de runs: abertura e fecho de w:ins/w:del (ou moveTo/moveFrom). */
export function wrapRevision(kind: 'ins' | 'del', r: RevisionInfo, inner: string): string {
  const tag = r.move ? (kind === 'ins' ? 'w:moveTo' : 'w:moveFrom') : `w:${kind}`;
  return `<${tag}${revisionAttrs(r)}>${inner}</${tag}>`;
}

/** Declara w16du (e mc:Ignorable) na tag raiz de uma parte. */
export function ensureRevisionNamespaces(open: string, rootName: string): string {
  const at = open.indexOf(`<${rootName}`);
  if (at < 0) return open;
  const end = open.indexOf('>', at);
  let tag = open.slice(at, end);
  if (!/\sxmlns:w16du=/.test(tag)) tag += ` xmlns:w16du="${W16DU_NS}"`;
  if (!/\sxmlns:mc=/.test(tag)) tag += ` xmlns:mc="${MC_NS}"`;
  const ign = /\smc:Ignorable="([^"]*)"/.exec(tag);
  if (!ign) tag += ' mc:Ignorable="w16du"';
  else if (!ign[1]!.split(/\s+/).includes('w16du')) tag = tag.replace(ign[0], () => ` mc:Ignorable="${ign[1] ? `${ign[1]} ` : ''}w16du"`);
  return open.slice(0, at) + tag + open.slice(end);
}
