// Grava/remove fontes incorporadas nos pacotes OOXML (.docx e .pptx) — os
// apps só montam o plano (embedding.ts) e chamam daqui. Formatos medidos nos
// arquivos que o Word e o PowerPoint desta máquina geram:
//  - .docx: word/fonts/fontN.odttf (TTF ofuscado: XOR dos 32 primeiros bytes
//    com o GUID de w:fontKey), relação `font` a partir do fontTable,
//    <w:embedRegular r:id w:fontKey [w:subsetted="1"]/> no fim do <w:font>, e no
//    settings <w:embedTrueTypeFonts/> [<w:embedSystemFonts/>] [<w:saveSubsetFonts/>].
//  - .pptx: ppt/fonts/fontN.fntdata (EOT), relação `font` a partir do
//    presentation.xml, <p:embeddedFontLst> e embedTrueTypeFonts/saveSubsetFonts
//    no <p:presentation>.
// Regra de edição: com a opção LIGADA, o que já veio incorporado fica como está
// (o PowerPoint/Word gravam EOT com compressão que não refazemos) e só se
// acrescentam as famílias que faltam; DESLIGADA, tudo sai — como no Office.
import { sfntToEot } from './eot.js';
import type { EmbeddingPlan, FaceToEmbed, FontEmbeddingSettings } from './embedding.js';
import type { FontVariant } from './types.js';

/** O mínimo de um pacote OPC que a gravação precisa (DocxPackage/PptxPackage). */
export interface OpcPackage {
  partNames(): string[];
  getPart(path: string): Uint8Array | undefined;
  getPartText(path: string): string | undefined;
  setPart(path: string, data: Uint8Array): void;
  setPartText(path: string, text: string): void;
  removePart(path: string): void;
}

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL_FONT = `${REL}/font`;
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const CT_ODTTF = 'application/vnd.openxmlformats-officedocument.obfuscatedFont';
const CT_FNTDATA = 'application/x-fontdata';
const VARIANT_ORDER: readonly FontVariant[] = ['regular', 'bold', 'italic', 'boldItalic'];
const W_EMBED: Record<FontVariant, string> = {
  regular: 'w:embedRegular', bold: 'w:embedBold', italic: 'w:embedItalic', boldItalic: 'w:embedBoldItalic',
};
const P_EMBED: Record<FontVariant, string> = {
  regular: 'p:regular', bold: 'p:bold', italic: 'p:italic', boldItalic: 'p:boldItalic',
};

// ───────────────────────── utilidades OPC ─────────────────────────

const escAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescAttr = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function relsPathOf(part: string): string {
  const i = part.lastIndexOf('/');
  return `${part.slice(0, i + 1)}_rels/${part.slice(i + 1)}.rels`;
}

function resolveTarget(fromPart: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = fromPart.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

interface Rel { id: string; type: string; target: string; external: boolean; xml: string }

function readRels(pkg: OpcPackage, part: string): Rel[] {
  const xml = pkg.getPartText(relsPathOf(part));
  if (!xml) return [];
  const out: Rel[] = [];
  for (const m of xml.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const a = (n: string) => new RegExp(`\\b${n}="([^"]*)"`).exec(m[0])?.[1] ?? '';
    out.push({ id: a('Id'), type: a('Type'), target: unescAttr(a('Target')), external: a('TargetMode') === 'External', xml: m[0] });
  }
  return out;
}

function addRel(pkg: OpcPackage, part: string, type: string, target: string): string {
  const path = relsPathOf(part);
  let xml = pkg.getPartText(path)
    ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const used = new Set(readRels(pkg, part).map((r) => r.id));
  let n = used.size + 1;
  while (used.has(`rId${n}`)) n++;
  const id = `rId${n}`;
  xml = xml.replace(/<Relationships\b([^>]*?)\s*\/>/, '<Relationships$1></Relationships>');
  xml = xml.replace(/<\/Relationships>\s*$/, `<Relationship Id="${id}" Type="${type}" Target="${escAttr(target)}"/></Relationships>`);
  pkg.setPartText(path, xml);
  return id;
}

/** Remove as relações do tipo (e as partes que elas apontam). Devolve os ids removidos. */
function removeRelsOfType(pkg: OpcPackage, part: string, type: string): Set<string> {
  const path = relsPathOf(part);
  const xml = pkg.getPartText(path);
  const ids = new Set<string>();
  if (!xml) return ids;
  let out = xml;
  for (const r of readRels(pkg, part)) {
    if (r.type !== type) continue;
    ids.add(r.id);
    out = out.replace(r.xml, '');
    if (!r.external) pkg.removePart(resolveTarget(part, r.target));
  }
  if (ids.size) pkg.setPartText(path, out);
  return ids;
}

function relTargetOfType(pkg: OpcPackage, part: string, type: string): string | undefined {
  const r = readRels(pkg, part).find((x) => x.type === type && !x.external);
  return r ? resolveTarget(part, r.target) : undefined;
}

function ensureDefaultContentType(pkg: OpcPackage, ext: string, ct: string): void {
  const xml = pkg.getPartText('[Content_Types].xml');
  if (!xml || new RegExp(`<Default\\b[^>]*Extension="${escRe(ext)}"`, 'i').test(xml)) return;
  pkg.setPartText('[Content_Types].xml', xml.replace(/(<Types\b[^>]*>)/, `$1<Default Extension="${ext}" ContentType="${ct}"/>`));
}

function ensureOverride(pkg: OpcPackage, part: string, ct: string): void {
  const xml = pkg.getPartText('[Content_Types].xml');
  if (!xml || xml.includes(`PartName="/${part}"`)) return;
  pkg.setPartText('[Content_Types].xml', xml.replace(/<\/Types>\s*$/, `<Override PartName="/${part}" ContentType="${ct}"/></Types>`));
}

function uniquePartName(pkg: OpcPackage, dir: string, ext: string): string {
  const names = new Set(pkg.partNames().map((n) => n.toLowerCase()));
  let n = 1;
  while (names.has(`${dir}font${n}.${ext}`.toLowerCase())) n++;
  return `${dir}font${n}.${ext}`;
}

/** Fim do elemento `<prefix:name …>` que começa em `start` (auto-fechado ou não). */
function elementEnd(xml: string, start: number, qname: string): number {
  const gt = xml.indexOf('>', start);
  if (gt < 0) return -1;
  if (xml[gt - 1] === '/') return gt + 1;
  const close = xml.indexOf(`</${qname}>`, gt);
  return close < 0 ? -1 : close + qname.length + 3;
}

function findElement(xml: string, qname: string): { start: number; end: number } | null {
  const m = new RegExp(`<${escRe(qname)}(?=[\\s/>])`).exec(xml);
  if (!m) return null;
  const end = elementEnd(xml, m.index, qname);
  return end < 0 ? null : { start: m.index, end };
}

function randomGuid(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `{${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}}`;
}

/** Ofusca (ou desofusca — é XOR) um .odttf com a chave do GUID (ECMA-376 §17.8.1). */
export function obfuscateOdttf(data: Uint8Array, fontKey: string): Uint8Array {
  const hex = fontKey.replace(/[{}-]/g, '');
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i++) key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  key.reverse();
  const out = data.slice();
  for (let i = 0; i < Math.min(32, out.length); i++) out[i] = out[i]! ^ key[i % 16]!;
  return out;
}

function groupByFamily(faces: readonly FaceToEmbed[]): Map<string, FaceToEmbed[]> {
  const m = new Map<string, FaceToEmbed[]>();
  for (const f of faces) m.set(f.family, [...(m.get(f.family) ?? []), f]);
  for (const list of m.values()) list.sort((a, b) => VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant));
  return m;
}

// ───────────────────────── .docx ─────────────────────────

const DOCX_MAIN = 'word/document.xml';
/** Elementos que vêm ANTES de w:embedTrueTypeFonts em CT_Settings. */
const SETTINGS_BEFORE = [
  'writeProtection', 'view', 'zoom', 'removePersonalInformation', 'removeDateAndTime', 'doNotDisplayPageBoundaries',
  'displayBackgroundShape', 'printPostScriptOverText', 'printFractionalCharacterWidth', 'printFormsData',
];

function docxPart(pkg: OpcPackage, type: string, fallback: string): string {
  return relTargetOfType(pkg, DOCX_MAIN, `${REL}/${type}`) ?? fallback;
}

/** Estado da opção gravado no .docx + famílias que já vieram incorporadas. */
export function readDocxEmbedding(pkg: OpcPackage): { settings: Partial<FontEmbeddingSettings>; embedded: Set<string> } {
  const settings = pkg.getPartText(docxPart(pkg, 'settings', 'word/settings.xml')) ?? '';
  const on = (name: string) => new RegExp(`<w:${name}(?![^>]*w:val="(?:false|0|off)")[\\s/>]`).test(settings);
  const embedded = new Set<string>();
  const table = pkg.getPartText(docxPart(pkg, 'fontTable', 'word/fontTable.xml')) ?? '';
  for (const m of table.matchAll(/<w:font\b[^>]*w:name="([^"]*)"[^>]*>([\s\S]*?)<\/w:font>/g)) {
    if (/<w:embed(?:Regular|Bold|Italic|BoldItalic)\b/.test(m[2]!)) embedded.add(unescAttr(m[1]!).toLowerCase());
  }
  // desligada no arquivo: só isso (os detalhes ficam com os padrões do app, como
  // o Office ao ligar a opção)
  if (!on('embedTrueTypeFonts')) return { settings: { embed: false }, embedded };
  return {
    settings: { embed: true, subset: on('saveSubsetFonts'), skipCommonFonts: !on('embedSystemFonts') },
    embedded,
  };
}

function writeDocxSettings(pkg: OpcPackage, settings: FontEmbeddingSettings): void {
  let path = docxPart(pkg, 'settings', '');
  let xml = path ? pkg.getPartText(path) : undefined;
  if (!xml) {
    if (!settings.embed) return;
    path = 'word/settings.xml';
    xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="${W_NS}"></w:settings>`;
    addRel(pkg, DOCX_MAIN, `${REL}/settings`, 'settings.xml');
    ensureOverride(pkg, path, 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml');
  }
  for (const name of ['w:embedTrueTypeFonts', 'w:embedSystemFonts', 'w:saveSubsetFonts']) {
    for (let el = findElement(xml, name); el; el = findElement(xml, name)) xml = xml.slice(0, el.start) + xml.slice(el.end);
  }
  if (settings.embed) {
    const flags = '<w:embedTrueTypeFonts/>' + (settings.skipCommonFonts ? '' : '<w:embedSystemFonts/>') + (settings.subset ? '<w:saveSubsetFonts/>' : '');
    let at = -1;
    for (const n of SETTINGS_BEFORE) { const el = findElement(xml, `w:${n}`); if (el) at = Math.max(at, el.end); }
    if (at < 0) {
      const root = /<w:settings\b[^>]*>/.exec(xml)!;
      if (root[0].endsWith('/>')) xml = xml.replace(root[0], `${root[0].slice(0, -2)}></w:settings>`);
      at = /<w:settings\b[^>]*>/.exec(xml)!.index + /<w:settings\b[^>]*>/.exec(xml)![0].length;
    }
    xml = xml.slice(0, at) + flags + xml.slice(at);
  }
  pkg.setPartText(path, xml);
}

/** Aplica a opção ao .docx: grava o settings, tira (desligada) ou acrescenta (ligada) as fontes. */
export function writeDocxEmbedding(pkg: OpcPackage, plan: EmbeddingPlan, settings: FontEmbeddingSettings): void {
  writeDocxSettings(pkg, settings);
  let tablePath = docxPart(pkg, 'fontTable', '');
  let table = tablePath ? pkg.getPartText(tablePath) : undefined;

  if (!settings.embed) {
    if (!tablePath || !table) return;
    removeRelsOfType(pkg, tablePath, REL_FONT);
    pkg.setPartText(tablePath, table.replace(/<w:embed(?:Regular|Bold|Italic|BoldItalic)\b[^>]*\/>/g, ''));
    return;
  }
  if (!plan.faces.length) return;
  if (!table) {
    tablePath = 'word/fontTable.xml';
    table = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:fonts xmlns:w="${W_NS}" xmlns:r="${REL}"></w:fonts>`;
    addRel(pkg, DOCX_MAIN, `${REL}/fontTable`, 'fontTable.xml');
    ensureOverride(pkg, tablePath, 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml');
  }
  if (!/<w:fonts\b[^>]*xmlns:r=/.test(table)) table = table.replace(/<w:fonts\b/, `<w:fonts xmlns:r="${REL}"`);
  if (/<w:fonts\b[^>]*\/>/.test(table)) table = table.replace(/(<w:fonts\b[^>]*)\/>/, '$1></w:fonts>');
  ensureDefaultContentType(pkg, 'odttf', CT_ODTTF);
  const dir = tablePath.slice(0, tablePath.lastIndexOf('/') + 1) + 'fonts/';

  for (const [family, faces] of groupByFamily(plan.faces)) {
    let embeds = '';
    for (const f of faces) {
      const key = randomGuid();
      const part = uniquePartName(pkg, dir, 'odttf');
      pkg.setPart(part, obfuscateOdttf(f.bytes, key));
      const id = addRel(pkg, tablePath, REL_FONT, part.slice(tablePath.lastIndexOf('/') + 1));
      embeds += `<${W_EMBED[f.variant]} r:id="${id}"${f.subsetted ? ' w:subsetted="1"' : ''} w:fontKey="${key}"/>`;
    }
    const re = new RegExp(`<w:font\\b[^>]*w:name="${escRe(escAttr(family))}"[^>]*?(\\/>|>[\\s\\S]*?<\\/w:font>)`, 'i');
    const m = re.exec(table);
    if (m) {
      const el = m[0];
      const merged = el.endsWith('/>') ? `${el.slice(0, -2)}>${embeds}</w:font>` : el.replace(/<\/w:font>$/, `${embeds}</w:font>`);
      table = table.replace(el, merged);
    } else {
      const panose = faces[0]!.info.panose;
      table = table.replace(/<\/w:fonts>\s*$/,
        `<w:font w:name="${escAttr(family)}"><w:panose1 w:val="${panose}"/><w:charset w:val="00"/><w:family w:val="auto"/><w:pitch w:val="variable"/>${embeds}</w:font></w:fonts>`);
    }
  }
  pkg.setPartText(tablePath, table);
}

// ───────────────────────── .pptx ─────────────────────────

const PPTX_MAIN = 'ppt/presentation.xml';
/** Elementos que vêm DEPOIS de p:embeddedFontLst em CT_Presentation. */
const PRES_AFTER = ['p:custShowLst', 'p:photoAlbum', 'p:custDataLst', 'p:kinsoku', 'p:defaultTextStyle', 'p:modifyVerifier', 'p:extLst'];

export function readPptxEmbedding(pkg: OpcPackage): { settings: Partial<FontEmbeddingSettings>; embedded: Set<string> } {
  const xml = pkg.getPartText(PPTX_MAIN) ?? '';
  const root = /<p:presentation\b[^>]*>/.exec(xml)?.[0] ?? '';
  const flag = (n: string) => /^(1|true|on)$/i.test(new RegExp(`\\b${n}="([^"]*)"`).exec(root)?.[1] ?? '');
  const embedded = new Set<string>();
  for (const m of xml.matchAll(/<p:embeddedFont>\s*<p:font\b[^>]*typeface="([^"]*)"/g)) embedded.add(unescAttr(m[1]!).toLowerCase());
  if (!flag('embedTrueTypeFonts')) return { settings: { embed: false }, embedded };
  return { settings: { embed: true, subset: flag('saveSubsetFonts') }, embedded };
}

/** Aplica a opção ao .pptx: atributos do <p:presentation>, tira ou acrescenta fontes. */
export function writePptxEmbedding(pkg: OpcPackage, plan: EmbeddingPlan, settings: FontEmbeddingSettings): void {
  let xml = pkg.getPartText(PPTX_MAIN);
  if (!xml) return;
  // atributos da opção no elemento raiz
  xml = xml.replace(/<p:presentation\b[^>]*>/, (tag) => {
    let t = tag.replace(/\s(?:embedTrueTypeFonts|saveSubsetFonts)="[^"]*"/g, '');
    if (settings.embed) {
      const attrs = ' embedTrueTypeFonts="1"' + (settings.subset ? ' saveSubsetFonts="1"' : '');
      t = t.replace(/\s*(\/?>)$/, `${attrs}$1`);
    }
    return t;
  });

  if (!settings.embed) {
    removeRelsOfType(pkg, PPTX_MAIN, REL_FONT);
    const el = findElement(xml, 'p:embeddedFontLst');
    if (el) xml = xml.slice(0, el.start) + xml.slice(el.end);
    pkg.setPartText(PPTX_MAIN, xml);
    return;
  }
  if (plan.faces.length) {
    ensureDefaultContentType(pkg, 'fntdata', CT_FNTDATA);
    let entries = '';
    for (const [family, faces] of groupByFamily(plan.faces)) {
      let refs = '';
      for (const f of faces) {
        const part = uniquePartName(pkg, 'ppt/fonts/', 'fntdata');
        pkg.setPart(part, sfntToEot(f.bytes, { subsetted: f.subsetted }));
        const id = addRel(pkg, PPTX_MAIN, REL_FONT, part.slice('ppt/'.length));
        refs += `<${P_EMBED[f.variant]} r:id="${id}"/>`;
      }
      entries += `<p:embeddedFont><p:font typeface="${escAttr(family)}" panose="${faces[0]!.info.panose}" charset="0"/>${refs}</p:embeddedFont>`;
    }
    const list = findElement(xml, 'p:embeddedFontLst');
    if (list) {
      const el = xml.slice(list.start, list.end);
      const merged = el.endsWith('/>') ? `<p:embeddedFontLst>${entries}</p:embeddedFontLst>` : el.replace(/<\/p:embeddedFontLst>$/, `${entries}</p:embeddedFontLst>`);
      xml = xml.slice(0, list.start) + merged + xml.slice(list.end);
    } else {
      const block = `<p:embeddedFontLst>${entries}</p:embeddedFontLst>`;
      let at = -1;
      for (const n of PRES_AFTER) { const el = findElement(xml, n); if (el && (at < 0 || el.start < at)) at = el.start; }
      if (at < 0) at = xml.lastIndexOf('</p:presentation>');
      xml = xml.slice(0, at) + block + xml.slice(at);
    }
  }
  pkg.setPartText(PPTX_MAIN, xml);
}
