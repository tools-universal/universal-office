/**
 * XML das revisões geradas ao salvar (w:ins, w:del, w:rPrChange, w:pPrChange,
 * marcas de parágrafo): w:id únicos acima dos que o pacote já usa, autor, data
 * (w:date como o Word grava — hora local com Z) e w16du:dateUtc. Quem usa o
 * w16du precisa declarar o namespace na raiz da parte (ensureRevisionNamespaces).
 */
import type { RevisionInfo } from './ooxml/props.js';
import { partByRelType } from './ooxml/parts.js';
import { parseXml, childElements } from './xml.js';
import type { DocxPackage } from './package.js';

/** Elementos de CT_Settings que vêm ANTES de w:trackRevisions. */
const BEFORE_TRACK = new Set([
  'w:writeProtection', 'w:view', 'w:zoom', 'w:removePersonalInformation', 'w:removeDateAndTime',
  'w:doNotDisplayPageBoundaries', 'w:displayBackgroundShape', 'w:printPostScriptOverText',
  'w:printFractionalCharacterWidth', 'w:printFormsData', 'w:embedTrueTypeFonts', 'w:embedSystemFonts',
  'w:saveSubsetFonts', 'w:saveFormsData', 'w:mirrorMargins', 'w:alignBordersAndEdges',
  'w:bordersDoNotSurroundHeader', 'w:bordersDoNotSurroundFooter', 'w:gutterAtTop', 'w:hideSpellingErrors',
  'w:hideGrammaticalErrors', 'w:activeWritingStyle', 'w:proofState', 'w:formsDesign', 'w:attachedTemplate',
  'w:linkStyles', 'w:stylePaneFormatFilter', 'w:stylePaneSortMethod', 'w:documentType', 'w:mailMerge',
  'w:revisionView',
]);

/** O documento grava o controle de alterações LIGADO (w:settings/w:trackRevisions)? */
export function readTrackRevisions(pkg: DocxPackage): boolean {
  const xml = pkg.getPartText(partByRelType(pkg, 'settings', 'word/settings.xml')) ?? '';
  const m = /<w:trackRevisions\b([^>]*?)\/?>/.exec(xml);
  return !!m && !/w:val="(?:false|0|off)"/.test(m[1]!);
}

/** Grava o estado do controle de alterações no settings.xml (cria a parte se faltar). */
export function writeTrackRevisions(pkg: DocxPackage, on: boolean): void {
  if (readTrackRevisions(pkg) === on) return;
  let path = partByRelType(pkg, 'settings', '');
  let xml = path ? pkg.getPartText(path) : undefined;
  if (!xml) {
    if (!on) return;
    path = 'word/settings.xml';
    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>';
    const relsPath = 'word/_rels/document.xml.rels';
    const rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    pkg.setPartText(relsPath, rels.replace('</Relationships>', () => '<Relationship Id="rIdWnSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'));
    const ct = pkg.getPartText('[Content_Types].xml');
    if (ct && !ct.includes('/word/settings.xml')) {
      pkg.setPartText('[Content_Types].xml', ct.replace('</Types>', () => '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'));
    }
  }
  // tira o que houver e, ligado, põe na posição do schema
  xml = xml.replace(/<w:trackRevisions\b[^>]*?(?:\/>|>[\s\S]*?<\/w:trackRevisions>)/g, '');
  if (on) {
    const root = parseXml(xml, { positions: true });
    let at = -1;
    if (root.cs === root.e) {
      // <w:settings …/> vazio
      const open = xml.slice(root.s, root.e).replace(/\s*\/>$/, '>');
      xml = xml.slice(0, root.s) + open + '<w:trackRevisions/></w:settings>' + xml.slice(root.e);
    } else {
      at = root.cs!;
      for (const k of childElements(root)) if (BEFORE_TRACK.has(k.name)) at = Math.max(at, k.e!);
      xml = xml.slice(0, at) + '<w:trackRevisions/>' + xml.slice(at);
    }
  }
  pkg.setPartText(path, xml);
}

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
