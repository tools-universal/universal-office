// Operações de EDIÇÃO do <universal-slides> sobre o pacote (.pptx): slides
// (novo a partir de um layout, duplicar, excluir, mover, ocultar, layout,
// fundo, transição), formas (texto, formatação do texto, inserir caixa de
// texto/forma/imagem, posição e tamanho, preenchimento, contorno, ordem,
// excluir, hiperlink), anotações, propriedades e "Configurar apresentação".
//
// Funções PURAS sobre o PptxPackage: cada uma troca só as partes que muda, e
// só o trecho editado de cada parte (xml-edit.ts) — o resto do arquivo segue
// byte a byte, como a regra do pacote. O elemento relê o modelo depois
// (readSlide/readPresentation): o que se desenha é sempre o que se grava.
import type { PptxPackage } from '@universal-office/slides-core';
import { notesMaster as blankNotesMaster, theme as officeTheme } from './blank-deck.js';
import {
  childRanges, elementName, escapeAttr, escapeText, findAllElements, findElement, findElements, getAttr, innerXml, insertChild,
  setAttr, setAttrInTag, setInner, splice, unescapeXml, type XmlRange,
} from './xml-edit.js';

const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
export const REL = {
  slide: `${NS_REL}/slide`,
  slideLayout: `${NS_REL}/slideLayout`,
  slideMaster: `${NS_REL}/slideMaster`,
  notesSlide: `${NS_REL}/notesSlide`,
  notesMaster: `${NS_REL}/notesMaster`,
  image: `${NS_REL}/image`,
  hyperlink: `${NS_REL}/hyperlink`,
  presProps: `${NS_REL}/presProps`,
  theme: `${NS_REL}/theme`,
  coreProps: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
} as const;
const CT = {
  slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  notesSlide: 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml',
  notesMaster: 'application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml',
  theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
  presProps: 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml',
  coreProps: 'application/vnd.openxmlformats-package.core-properties+xml',
} as const;
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_DECL = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

/** Posição e tamanho em EMU. */
export interface Frame { x: number; y: number; cx: number; cy: number }

// ───────────────────────── partes, relações e tipos ─────────────────────────

/** `.rels` de uma parte; `''` = as relações do pacote (`_rels/.rels`). */
export function relsPathOf(part: string): string {
  if (part === '') return '_rels/.rels';
  const i = part.lastIndexOf('/');
  return i < 0 ? `_rels/${part}.rels` : `${part.slice(0, i)}/_rels/${part.slice(i + 1)}.rels`;
}

export interface Rel { id: string; type: string; target: string; external: boolean }

/** Relações de uma parte (alvo CRU, como está no .rels). */
export function readRelList(pkg: PptxPackage, part: string): Rel[] {
  const xml = pkg.getPartText(relsPathOf(part));
  if (xml === undefined) return [];
  return findElements(xml, 'Relationship').map((r) => ({
    id: getAttr(xml, r, 'Id') ?? '',
    type: getAttr(xml, r, 'Type') ?? '',
    target: getAttr(xml, r, 'Target') ?? '',
    external: getAttr(xml, r, 'TargetMode') === 'External',
  }));
}

/** Caminho absoluto (no pacote) do alvo de uma relação interna. */
export function resolveTarget(pkg: PptxPackage, part: string, target: string): string {
  return pkg.resolveRelTarget(part, target);
}

/** Alvo relativo de `from` para `to` (ex.: slides/slide1.xml → ../slideLayouts/slideLayout2.xml). */
export function relativeTarget(from: string, to: string): string {
  const a = from.split('/').slice(0, -1);
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

function nextRelId(rels: readonly Rel[]): string {
  let max = 0;
  for (const r of rels) { const m = /^rId(\d+)$/.exec(r.id); if (m) max = Math.max(max, Number(m[1])); }
  return `rId${max + 1}`;
}

/** Acrescenta uma relação à parte (cria o .rels se preciso); devolve o Id. */
export function addRel(pkg: PptxPackage, part: string, type: string, target: string, external = false): string {
  const path = relsPathOf(part);
  const xml = pkg.getPartText(path) ?? `${XML_DECL}<Relationships xmlns="${NS_PKG_REL}"></Relationships>`;
  const id = nextRelId(readRelList(pkg, part));
  const el = `<Relationship Id="${id}" Type="${type}" Target="${escapeAttr(target)}"${external ? ' TargetMode="External"' : ''}/>`;
  const root = findElement(xml, 'Relationships')!;
  pkg.setPartText(path, insertChild(xml, root, el));
  return id;
}

/** Tira relações da parte pelo Id. */
export function removeRels(pkg: PptxPackage, part: string, ids: ReadonlySet<string>): void {
  const path = relsPathOf(part);
  let xml = pkg.getPartText(path);
  if (xml === undefined) return;
  for (const r of findElements(xml, 'Relationship').reverse()) {
    if (ids.has(getAttr(xml, r, 'Id') ?? '')) xml = splice(xml, r.start, r.end, '');
  }
  pkg.setPartText(path, xml);
}

/** Troca o alvo de uma relação. */
function setRelTarget(pkg: PptxPackage, part: string, id: string, target: string): void {
  const path = relsPathOf(part);
  const xml = pkg.getPartText(path);
  if (xml === undefined) return;
  const r = findElements(xml, 'Relationship').find((x) => getAttr(xml, x, 'Id') === id);
  if (r) pkg.setPartText(path, setAttr(xml, r, 'Target', target));
}

const CT_PATH = '[Content_Types].xml';

function overrideOf(pkg: PptxPackage, part: string): string | undefined {
  const xml = pkg.getPartText(CT_PATH);
  if (xml === undefined) return undefined;
  const o = findElements(xml, 'Override').find((r) => getAttr(xml, r, 'PartName') === `/${part}`);
  return o ? getAttr(xml, o, 'ContentType') ?? undefined : undefined;
}

function contentTypeOf(pkg: PptxPackage, part: string): string | undefined {
  const xml = pkg.getPartText(CT_PATH);
  if (xml === undefined) return undefined;
  const o = findElements(xml, 'Override').find((r) => getAttr(xml, r, 'PartName') === `/${part}`);
  if (o) return getAttr(xml, o, 'ContentType') ?? undefined;
  const ext = part.slice(part.lastIndexOf('.') + 1).toLowerCase();
  const d = findElements(xml, 'Default').find((r) => (getAttr(xml, r, 'Extension') ?? '').toLowerCase() === ext);
  return d ? getAttr(xml, d, 'ContentType') ?? undefined : undefined;
}

export function addOverride(pkg: PptxPackage, part: string, type: string): void {
  const xml = pkg.getPartText(CT_PATH);
  if (xml === undefined) return;
  if (findElements(xml, 'Override').some((r) => getAttr(xml, r, 'PartName') === `/${part}`)) return;
  const root = findElement(xml, 'Types')!;
  pkg.setPartText(CT_PATH, insertChild(xml, root, `<Override PartName="/${escapeAttr(part)}" ContentType="${escapeAttr(type)}"/>`));
}

function removeOverride(pkg: PptxPackage, part: string): void {
  const xml = pkg.getPartText(CT_PATH);
  if (xml === undefined) return;
  const o = findElements(xml, 'Override').find((r) => getAttr(xml, r, 'PartName') === `/${part}`);
  if (o) pkg.setPartText(CT_PATH, splice(xml, o.start, o.end, ''));
}

function ensureDefault(pkg: PptxPackage, ext: string, type: string): void {
  const xml = pkg.getPartText(CT_PATH);
  if (xml === undefined) return;
  if (findElements(xml, 'Default').some((r) => (getAttr(xml, r, 'Extension') ?? '').toLowerCase() === ext)) return;
  const root = findElement(xml, 'Types')!;
  // os Default vêm antes dos Override
  const first = findElement(xml, 'Override', root.openEnd);
  const el = `<Default Extension="${ext}" ContentType="${type}"/>`;
  pkg.setPartText(CT_PATH, first ? splice(xml, first.start, first.start, el) : insertChild(xml, root, el));
}

/** Próximo nome livre `dir/base{N}.ext` (N = maior existente + 1). */
export function nextPartName(pkg: PptxPackage, dir: string, base: string, ext: string, taken: ReadonlySet<string> = new Set()): string {
  const re = new RegExp(`^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${base}(\\d+)\\.${ext}$`, 'i');
  let max = 0;
  for (const n of [...pkg.partNames(), ...taken]) { const m = re.exec(n); if (m) max = Math.max(max, Number(m[1])); }
  return `${dir}/${base}${max + 1}.${ext}`;
}

/** Remove a parte, o .rels dela e o Override do tipo. */
function removePartFully(pkg: PptxPackage, part: string): void {
  pkg.removePart(part);
  pkg.removePart(relsPathOf(part));
  removeOverride(pkg, part);
}

// ───────────────────────── lista de slides ─────────────────────────

const PRES = 'ppt/presentation.xml';

export interface SlideEntry { id: string; rId: string; path: string }

/** Slides na ordem da apresentação (só os que têm parte). */
export function slideEntries(pkg: PptxPackage): SlideEntry[] {
  const xml = pkg.presentationXml();
  const rels = readRelList(pkg, PRES);
  const lst = findElement(xml, 'p:sldIdLst');
  if (!lst) return [];
  const out: SlideEntry[] = [];
  for (const s of findElements(xml, 'p:sldId', lst.openEnd, lst.end)) {
    const rId = getAttr(xml, s, 'r:id') ?? '';
    const rel = rels.find((r) => r.id === rId);
    if (!rel) continue;
    out.push({ id: getAttr(xml, s, 'id') ?? '', rId, path: resolveTarget(pkg, PRES, rel.target) });
  }
  return out;
}

/** Põe o slide `path` na posição `at` da lista (rel + sldId). */
function insertSlideEntry(pkg: PptxPackage, at: number, path: string): void {
  const rId = addRel(pkg, PRES, REL.slide, relativeTarget(PRES, path));
  let xml = pkg.presentationXml();
  let maxId = 255;
  for (const s of findElements(xml, 'p:sldId')) maxId = Math.max(maxId, Number(getAttr(xml, s, 'id')) || 0);
  const el = `<p:sldId id="${maxId + 1}" r:id="${rId}"/>`;
  let lst = findElement(xml, 'p:sldIdLst');
  if (!lst) {
    const root = findElement(xml, 'p:presentation')!;
    xml = insertChild(xml, root, '<p:sldIdLst></p:sldIdLst>', ['p:sldSz', 'p:notesSz', 'p:smartTags', 'p:embeddedFontLst', 'p:custShowLst', 'p:photoAlbum', 'p:custDataLst', 'p:kinsoku', 'p:defaultTextStyle', 'p:modifyVerifier', 'p:extLst']);
    lst = findElement(xml, 'p:sldIdLst')!;
  }
  const items = findElements(xml, 'p:sldId', lst.openEnd, lst.end);
  const pos = at < items.length ? items[Math.max(0, at)]!.start : (lst.selfClosing ? -1 : lst.end - '</p:sldIdLst>'.length);
  xml = pos < 0 ? setInner(xml, lst, el) : splice(xml, pos, pos, el);
  pkg.setPartText(PRES, xml);
}

// ───────────────────────── layouts ─────────────────────────

export interface LayoutInfo { path: string; name: string; type: string; master: string }

/** Layouts de todos os masters, na ordem do sldLayoutIdLst. */
export function listLayouts(pkg: PptxPackage): LayoutInfo[] {
  const out: LayoutInfo[] = [];
  const pxml = pkg.presentationXml();
  const prels = readRelList(pkg, PRES);
  const mlst = findElement(pxml, 'p:sldMasterIdLst');
  const masters = mlst ? findElements(pxml, 'p:sldMasterId', mlst.openEnd, mlst.end)
    .map((m) => prels.find((r) => r.id === getAttr(pxml, m, 'r:id')))
    .filter((r): r is Rel => !!r).map((r) => resolveTarget(pkg, PRES, r.target)) : [];
  for (const master of masters) {
    const mxml = pkg.getPartText(master);
    if (mxml === undefined) continue;
    const mrels = readRelList(pkg, master);
    const llst = findElement(mxml, 'p:sldLayoutIdLst');
    const ids = llst ? findElements(mxml, 'p:sldLayoutId', llst.openEnd, llst.end).map((l) => getAttr(mxml, l, 'r:id')) : [];
    for (const id of ids) {
      const rel = mrels.find((r) => r.id === id);
      if (!rel) continue;
      const path = resolveTarget(pkg, master, rel.target);
      const lxml = pkg.getPartText(path);
      if (lxml === undefined) continue;
      const root = findElement(lxml, 'p:sldLayout');
      const csld = findElement(lxml, 'p:cSld');
      out.push({
        path, master,
        name: (csld && getAttr(lxml, csld, 'name')) || path.split('/').pop()!.replace(/\.xml$/, ''),
        type: (root && getAttr(lxml, root, 'type')) || 'cust',
      });
    }
  }
  return out;
}

/** Layout de um slide (pelo .rels). */
export function layoutOf(pkg: PptxPackage, slidePath: string): string | undefined {
  const rel = readRelList(pkg, slidePath).find((r) => r.type === REL.slideLayout);
  return rel ? resolveTarget(pkg, slidePath, rel.target) : undefined;
}

/** Placeholders que o slide novo recebe do layout (os de rodapé ficam no layout, como no app). */
const TEXT_PH = new Set(['', 'title', 'ctrTitle', 'subTitle', 'body', 'obj']);
const SKIP_PH = new Set(['dt', 'ftr', 'sldNum', 'hdr', 'sldImg']);

/** XML do slide novo: os placeholders do layout, vazios (o texto de aviso é só da tela). */
function slideFromLayout(pkg: PptxPackage, layoutPath: string, lang: string): string {
  const lxml = pkg.getPartText(layoutPath) ?? '';
  const tree = findElement(lxml, 'p:spTree');
  let shapes = '';
  let id = 2;
  if (tree) {
    for (const sp of findElements(lxml, 'p:sp', tree.openEnd, tree.end)) {
      const ph = findElement(lxml, 'p:ph', sp.start, sp.end);
      if (!ph) continue;
      const type = getAttr(lxml, ph, 'type') ?? '';
      if (SKIP_PH.has(type)) continue;
      const cnv = findElement(lxml, 'p:cNvPr', sp.start, sp.end);
      const name = (cnv && getAttr(lxml, cnv, 'name')) || `Placeholder ${id - 1}`;
      // o <p:ph> do layout com type/idx/orient/sz (sem hasCustomPrompt: o aviso fica no layout)
      const phTag = setAttrInTag(lxml.slice(ph.start, ph.openEnd).replace(/\s*\/?>$/, '/>'), 'hasCustomPrompt', null);
      const text = TEXT_PH.has(type) ? `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody>` : '';
      shapes += `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeAttr(name)}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>${phTag}</p:nvPr></p:nvSpPr><p:spPr/>${text}</p:sp>`;
      id++;
    }
  }
  return `${XML_DECL}<p:sld ${NS_DECL}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>`
    + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    + `${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

/** Slide novo a partir do layout, na posição `at`. Devolve o caminho da parte. */
export function addSlide(pkg: PptxPackage, at: number, layoutPath: string, lang = 'en-US'): string {
  const path = nextPartName(pkg, 'ppt/slides', 'slide', 'xml');
  pkg.setPartText(path, slideFromLayout(pkg, layoutPath, lang));
  addRel(pkg, path, REL.slideLayout, relativeTarget(path, layoutPath));
  addOverride(pkg, path, CT.slide);
  insertSlideEntry(pkg, at, path);
  return path;
}

/** Relações cujo alvo pode ser COMPARTILHADO entre o original e a cópia (o resto é copiado). */
const SHARED_REL = /\/(image|media|video|audio|hyperlink|slideLayout|slideMaster|slide|notesMaster|tags|font)$/;

/** Copia uma parte e (recursivamente) as que só ela usa; devolve o caminho novo. */
function copyPartDeep(pkg: PptxPackage, part: string, taken: Set<string>, rename?: string): string {
  const dir = part.slice(0, part.lastIndexOf('/'));
  const file = part.slice(part.lastIndexOf('/') + 1);
  const m = /^(.*?)(\d*)\.(\w+)$/.exec(file);
  const copy = rename ?? nextPartName(pkg, dir, m?.[1] || 'part', m?.[3] ?? 'xml', taken);
  taken.add(copy);
  const data = pkg.getPart(part);
  if (data) pkg.setPart(copy, data);
  // tipo: Override como o da original (as que usam um Default pela extensão já valem)
  const ov = overrideOf(pkg, part);
  if (ov) addOverride(pkg, copy, ov);
  else if (contentTypeOf(pkg, part) !== contentTypeOf(pkg, copy)) addOverride(pkg, copy, contentTypeOf(pkg, part)!);
  const rels = readRelList(pkg, part);
  if (!rels.length) return copy;
  const relsXml = pkg.getPartText(relsPathOf(part))!;
  let out = relsXml;
  for (const r of findElements(relsXml, 'Relationship').reverse()) {
    const type = getAttr(relsXml, r, 'Type') ?? '';
    const external = getAttr(relsXml, r, 'TargetMode') === 'External';
    const target = getAttr(relsXml, r, 'Target') ?? '';
    let t = target;
    if (!external && !SHARED_REL.test(type)) {
      const abs = resolveTarget(pkg, part, target);
      if (pkg.getPart(abs)) t = relativeTarget(copy, copyPartDeep(pkg, abs, taken));
    } else if (!external) {
      t = relativeTarget(copy, resolveTarget(pkg, part, target));
    }
    if (t !== target) out = splice(out, r.start, r.end, setAttrInTag(relsXml.slice(r.start, r.end), 'Target', t));
  }
  pkg.setPartText(relsPathOf(copy), out);
  return copy;
}

/** Id de criação novo (p14:creationId): a cópia não pode se passar pelo original. */
function freshCreationId(xml: string): string {
  return xml.replace(/(<p14:creationId\b[^>]*\bval=")\d+(")/, (_, a: string, b: string) => `${a}${Math.floor(Math.random() * 0xfffffffe) + 1}${b}`);
}

/** Duplica o slide `index` (com as anotações) logo depois dele. Devolve o caminho novo. */
export function duplicateSlide(pkg: PptxPackage, index: number): string {
  const e = slideEntries(pkg)[index];
  if (!e) throw new Error(`slide ${index} inexistente`);
  const copy = copyPartDeep(pkg, e.path, new Set());
  pkg.setPartText(copy, freshCreationId(pkg.getPartText(copy)!));
  // a página de anotações foi copiada junto: passa a apontar para a cópia
  const notes = readRelList(pkg, copy).find((r) => r.type === REL.notesSlide);
  const notesPath = notes ? resolveTarget(pkg, copy, notes.target) : undefined;
  if (notesPath && notesPath !== resolveTarget(pkg, e.path, readRelList(pkg, e.path).find((r) => r.type === REL.notesSlide)?.target ?? '')) {
    pkg.setPartText(notesPath, freshCreationId(pkg.getPartText(notesPath) ?? ''));
    const back = readRelList(pkg, notesPath).find((x) => x.type === REL.slide);
    if (back) setRelTarget(pkg, notesPath, back.id, relativeTarget(notesPath, copy));
  }
  insertSlideEntry(pkg, index + 1, copy);
  return copy;
}

/** Exclui o slide `index`: some da lista, a parte e as anotações saem do pacote. */
export function deleteSlide(pkg: PptxPackage, index: number): void {
  const entries = slideEntries(pkg);
  const e = entries[index];
  if (!e) return;
  // lista + rel da apresentação
  let xml = pkg.presentationXml();
  const lst = findElement(xml, 'p:sldIdLst')!;
  const item = findElements(xml, 'p:sldId', lst.openEnd, lst.end).find((s) => getAttr(xml, s, 'r:id') === e.rId);
  if (item) xml = splice(xml, item.start, item.end, '');
  // apresentações personalizadas que citam o slide (<p:sld r:id> só existe no custShowLst)
  for (const s of findElements(xml, 'p:sld').reverse()) {
    if (getAttr(xml, s, 'r:id') === e.rId) xml = splice(xml, s.start, s.end, '');
  }
  pkg.setPartText(PRES, xml);
  removeRels(pkg, PRES, new Set([e.rId]));
  // anotações do slide
  const notes = readRelList(pkg, e.path).find((r) => r.type === REL.notesSlide);
  if (notes) {
    const np = resolveTarget(pkg, e.path, notes.target);
    if (pkg.getPart(np)) removePartFully(pkg, np);
  }
  // links de outros slides para este: o vínculo e o hiperlink saem juntos
  for (const other of entries) {
    if (other.path === e.path) continue;
    const dangling = readRelList(pkg, other.path).filter((r) => !r.external && r.type === REL.slide && resolveTarget(pkg, other.path, r.target) === e.path);
    if (!dangling.length) continue;
    const ids = new Set(dangling.map((r) => r.id));
    let sx = pkg.getPartText(other.path) ?? '';
    for (const tag of ['a:hlinkClick', 'a:hlinkMouseOver']) {
      for (const h of findElements(sx, tag).reverse()) if (ids.has(getAttr(sx, h, 'r:id') ?? '')) sx = splice(sx, h.start, h.end, '');
    }
    pkg.setPartText(other.path, sx);
    removeRels(pkg, other.path, ids);
  }
  removePartFully(pkg, e.path);
}

/** Move o slide de `from` para `to` (índices da lista). */
export function moveSlide(pkg: PptxPackage, from: number, to: number): void {
  let xml = pkg.presentationXml();
  const lst = findElement(xml, 'p:sldIdLst');
  if (!lst) return;
  const items = findElements(xml, 'p:sldId', lst.openEnd, lst.end);
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return;
  const texts = items.map((r) => xml.slice(r.start, r.end));
  const [moved] = texts.splice(from, 1);
  texts.splice(to, 0, moved!);
  xml = splice(xml, items[0]!.start, items[items.length - 1]!.end, texts.join(''));
  pkg.setPartText(PRES, xml);
}

// ───────────────────────── propriedades do slide ─────────────────────────

function rootRange(xml: string): XmlRange | undefined {
  return findElement(xml, 'p:sld');
}

/** `<p:sld show="0">`: oculto na apresentação. */
export function setSlideHidden(pkg: PptxPackage, slidePath: string, hidden: boolean): void {
  const xml = pkg.getPartText(slidePath);
  const root = xml !== undefined ? rootRange(xml) : undefined;
  if (!xml || !root) return;
  pkg.setPartText(slidePath, setAttr(xml, root, 'show', hidden ? '0' : null));
}

/** Troca o layout do slide (os placeholders casam por tipo/índice, como no app). */
export function setSlideLayout(pkg: PptxPackage, slidePath: string, layoutPath: string): void {
  const rel = readRelList(pkg, slidePath).find((r) => r.type === REL.slideLayout);
  if (rel) setRelTarget(pkg, slidePath, rel.id, relativeTarget(slidePath, layoutPath));
  else addRel(pkg, slidePath, REL.slideLayout, relativeTarget(slidePath, layoutPath));
}

/** Fundo sólido do slide (`null` = volta a herdar do layout/master). */
export function setSlideBackground(pkg: PptxPackage, slidePath: string, color: string | null): void {
  let xml = pkg.getPartText(slidePath);
  if (!xml) return;
  const csld = findElement(xml, 'p:cSld');
  if (!csld) return;
  const bg = findElement(xml, 'p:bg', csld.openEnd, csld.end);
  if (bg) xml = splice(xml, bg.start, bg.end, '');
  if (color) {
    const c = findElement(xml, 'p:cSld')!;
    xml = splice(xml, c.openEnd, c.openEnd, `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`);
  }
  pkg.setPartText(slidePath, xml);
}

/** Transição de entrada do slide, gravada no namespace `p:` (abre em qualquer versão do app). */
export interface TransitionSpec {
  /** fade, push, wipe, split, cover, pull, randomBar, circle, diamond, plus, wedge, wheel, zoom, dissolve, newsflash, blinds, checker, strips, comb, cut; 'none' = sem efeito */
  type: string;
  /** direção (push/wipe/cover/pull: l|r|u|d; split: in|out) */
  dir?: string;
  /** velocidade (`spd`) */
  speed?: 'fast' | 'med' | 'slow';
  /** avança no clique (padrão true) */
  advanceOnClick?: boolean;
  /** avança sozinho depois de N ms */
  advanceAfterMs?: number;
}

/** Os efeitos que este editor grava (todos desenhados pelo motor de transições). */
export const TRANSITION_TYPES = ['none', 'fade', 'push', 'wipe', 'split', 'cover', 'pull', 'randomBar', 'circle', 'diamond', 'plus', 'wedge', 'wheel', 'zoom', 'dissolve', 'newsflash', 'blinds', 'checker', 'strips', 'comb', 'cut'] as const;
const DIR_TRANSITIONS = new Set(['push', 'wipe', 'cover', 'pull']);

function transitionXml(t: TransitionSpec): string {
  let attrs = '';
  if (t.speed && t.speed !== 'fast') attrs += ` spd="${t.speed}"`;
  if (t.advanceOnClick === false) attrs += ' advClick="0"';
  if (t.advanceAfterMs !== undefined && t.advanceAfterMs >= 0) attrs += ` advTm="${Math.round(t.advanceAfterMs)}"`;
  let effect = '';
  if (t.type !== 'none') {
    let ea = '';
    if (DIR_TRANSITIONS.has(t.type) && t.dir) ea = ` dir="${t.dir}"`;
    else if (t.type === 'split') ea = ` orient="vert" dir="${t.dir === 'in' ? 'in' : 'out'}"`;
    else if ((t.type === 'blinds' || t.type === 'checker' || t.type === 'comb' || t.type === 'randomBar') && t.dir) ea = ` dir="${t.dir}"`;
    else if (t.type === 'wheel') ea = ' spokes="1"';
    effect = `<p:${t.type}${ea}/>`;
  }
  return `<p:transition${attrs}>${effect}</p:transition>`;
}

/** Grava (ou tira, com `null`) a transição de entrada do slide. */
export function setSlideTransition(pkg: PptxPackage, slidePath: string, t: TransitionSpec | null): void {
  let xml = pkg.getPartText(slidePath);
  const root = xml !== undefined ? rootRange(xml) : undefined;
  if (!xml || !root) return;
  // tira a atual: <p:transition> direto ou dentro de um mc:AlternateContent (p14/p15)
  for (const k of childRanges(xml, root).reverse()) {
    if (k.name === 'p:transition' || (k.name === 'mc:AlternateContent' && xml.slice(k.start, k.end).includes('<p:transition'))) {
      xml = splice(xml, k.start, k.end, '');
    }
  }
  if (t) xml = insertChild(xml, rootRange(xml)!, transitionXml(t), ['p:timing', 'p:extLst']);
  pkg.setPartText(slidePath, xml);
}

// ───────────────────────── formas ─────────────────────────

const SHAPE_TAGS = ['p:sp', 'p:pic', 'p:cxnSp', 'p:graphicFrame'] as const;

/** Trechos do elemento da forma `id` no slide (mais de um dentro de mc:AlternateContent). */
export function shapeRanges(xml: string, id: string): XmlRange[] {
  const tree = findElement(xml, 'p:spTree');
  if (!tree) return [];
  const out: XmlRange[] = [];
  for (const tag of SHAPE_TAGS) {
    for (const r of findElements(xml, tag, tree.openEnd, tree.end)) {
      const c = findElement(xml, 'p:cNvPr', r.start, r.end);
      if (c && getAttr(xml, c, 'id') === id) out.push(r);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** O que sai/entra/move ao mexer na forma: ela, ou o mc:AlternateContent que a envolve. */
function outerRange(xml: string, r: XmlRange): XmlRange {
  const tree = findElement(xml, 'p:spTree')!;
  for (const ac of findElements(xml, 'mc:AlternateContent', tree.openEnd, tree.end)) {
    if (ac.start < r.start && ac.end > r.end) return ac;
  }
  return r;
}

/** A forma é filha direta da árvore do slide (não está num grupo)? */
export function isTopLevel(xml: string, id: string): boolean {
  const r = shapeRanges(xml, id)[0];
  if (!r) return false;
  const o = outerRange(xml, r);
  const tree = findElement(xml, 'p:spTree')!;
  return childRanges(xml, tree).some((k) => k.start === o.start);
}

/** Aplica `fn` ao texto de cada cópia da forma (de trás para frente: os índices não andam). */
function editShape(pkg: PptxPackage, slidePath: string, id: string, fn: (xml: string, r: XmlRange) => string): boolean {
  let xml = pkg.getPartText(slidePath);
  if (!xml) return false;
  const rs = shapeRanges(xml, id);
  if (!rs.length) return false;
  for (const r of [...rs].reverse()) xml = fn(xml, r);
  pkg.setPartText(slidePath, xml);
  return true;
}

/** Maior `id` de `<p:cNvPr>` no slide (o próximo é +1). */
function maxShapeId(xml: string): number {
  let max = 1;
  for (const m of xml.matchAll(/<p:cNvPr\b[^>]*?\sid="(\d+)"/g)) max = Math.max(max, Number(m[1]));
  return max;
}

/** Insere o XML de uma forma no fim da árvore (fica por cima de tudo). */
function appendShape(xml: string, shape: string): string {
  const tree = findElement(xml, 'p:spTree')!;
  return insertChild(xml, tree, shape, ['p:extLst']);
}

const hex = (c: string): string => c.replace(/^#/, '').toUpperCase().slice(0, 6).padStart(6, '0');

const xfrmXml = (f: Frame, tag = 'a:xfrm', attrs = ''): string =>
  `<${tag}${attrs}><a:off x="${Math.round(f.x)}" y="${Math.round(f.y)}"/><a:ext cx="${Math.max(0, Math.round(f.cx))}" cy="${Math.max(0, Math.round(f.cy))}"/></${tag}>`;

/** Estilo das formas novas (o do app: preenchimento accent1, contorno accent1 mais escuro, texto lt1). */
const SHAPE_STYLE = '<p:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="50000"/></a:schemeClr></a:lnRef>'
  + '<a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>'
  + '<a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style>';

function paragraphsXml(lines: readonly string[], lang: string, rPrAttrs = ''): string {
  return lines.map((l) => (l
    ? `<a:p><a:r><a:rPr lang="${lang}"${rPrAttrs} dirty="0"/><a:t>${escapeText(l)}</a:t></a:r></a:p>`
    : `<a:p><a:endParaRPr lang="${lang}"${rPrAttrs} dirty="0"/></a:p>`)).join('');
}

/** Caixa de texto nova. Devolve o id da forma. */
export function insertTextBox(pkg: PptxPackage, slidePath: string, frame: Frame, text: string, lang = 'en-US'): string {
  const xml = pkg.getPartText(slidePath)!;
  const id = maxShapeId(xml) + 1;
  const sp = `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="TextBox ${id - 1}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr>${xfrmXml(frame)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>`
    + `<p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${paragraphsXml(text.split('\n'), lang)}</p:txBody></p:sp>`;
  pkg.setPartText(slidePath, appendShape(xml, sp));
  return String(id);
}

/** Formas que o editor insere (geometrias predefinidas do Office). */
export const INSERTABLE_SHAPES = ['rect', 'roundRect', 'ellipse', 'triangle', 'rtTriangle', 'diamond', 'pentagon', 'hexagon', 'parallelogram', 'trapezoid',
  'rightArrow', 'leftArrow', 'upArrow', 'downArrow', 'leftRightArrow', 'chevron', 'homePlate', 'star5', 'star6', 'heart', 'cloud', 'lightningBolt',
  'wedgeRectCallout', 'wedgeEllipseCallout', 'plus', 'donut', 'smileyFace', 'line'] as const;

/** Forma predefinida nova (com o estilo do tema). Devolve o id. */
export function insertShape(pkg: PptxPackage, slidePath: string, prst: string, frame: Frame, lang = 'en-US'): string {
  const xml = pkg.getPartText(slidePath)!;
  const id = maxShapeId(xml) + 1;
  let sp: string;
  if (prst === 'line') {
    // conector reto (o "Linha" das formas)
    sp = `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Straight Connector ${id - 1}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>`
      + `<p:spPr>${xfrmXml(frame)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom></p:spPr>`
      + '<p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>'
      + '<a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></p:style></p:cxnSp>';
  } else {
    sp = `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeAttr(prst)} ${id - 1}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`
      + `<p:spPr>${xfrmXml(frame)}<a:prstGeom prst="${escapeAttr(prst)}"><a:avLst/></a:prstGeom></p:spPr>${SHAPE_STYLE}`
      + `<p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody></p:sp>`;
  }
  pkg.setPartText(slidePath, appendShape(xml, sp));
  return String(id);
}

const IMAGE_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

/** Imagem nova (a parte vai para ppt/media). Devolve { id, part }. */
export function insertImage(pkg: PptxPackage, slidePath: string, bytes: Uint8Array, mime: string, frame: Frame, name = 'Picture'): { id: string; part: string } {
  const ext = IMAGE_EXT[mime] ?? 'png';
  const part = nextPartName(pkg, 'ppt/media', 'image', ext);
  pkg.setPart(part, bytes);
  ensureDefault(pkg, ext, mime === 'image/jpeg' ? 'image/jpeg' : mime);
  const rId = addRel(pkg, slidePath, REL.image, relativeTarget(slidePath, part));
  const xml = pkg.getPartText(slidePath)!;
  const id = maxShapeId(xml) + 1;
  const pic = `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${escapeAttr(name)} ${id - 1}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>`
    + `<p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
    + `<p:spPr>${xfrmXml(frame)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
  pkg.setPartText(slidePath, appendShape(xml, pic));
  return { id: String(id), part };
}

/** Posição/tamanho da forma (cria o `xfrm` de um placeholder que herdava a geometria). */
export function setShapeFrame(pkg: PptxPackage, slidePath: string, id: string, f: Frame): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    if (elementName(xml, r) === 'p:graphicFrame') {
      const x = findElement(xml, 'p:xfrm', r.start, r.end);
      if (x) return splice(xml, x.start, x.end, xfrmXml(f, 'p:xfrm'));
      const nv = findElement(xml, 'p:nvGraphicFramePr', r.start, r.end)!;
      return splice(xml, nv.end, nv.end, xfrmXml(f, 'p:xfrm'));
    }
    const sp = findElement(xml, 'p:spPr', r.start, r.end);
    if (!sp) return xml;
    const x = findElement(xml, 'a:xfrm', sp.openEnd, sp.end);
    if (x) {
      // mantém rot/flipH/flipV da tag
      const open = xml.slice(x.start, x.openEnd).replace(/\s*\/?>$/, '').replace(/^<a:xfrm/, '');
      return splice(xml, x.start, x.end, xfrmXml(f, 'a:xfrm', open));
    }
    return sp.selfClosing ? setInner(xml, sp, xfrmXml(f)) : splice(xml, sp.openEnd, sp.openEnd, xfrmXml(f));
  });
}

const FILL_TAGS = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:grpFill'];

/** Troca o preenchimento DIRETO de um elemento (spPr, ln ou rPr), respeitando a ordem do esquema. */
function replaceFill(xml: string, el: XmlRange, fill: string, before: readonly string[]): string {
  const name = elementName(xml, el);
  for (const k of childRanges(xml, el).reverse()) if (FILL_TAGS.includes(k.name)) xml = splice(xml, k.start, k.end, '');
  // o trecho do elemento encolheu: acha de novo antes de inserir
  return insertChild(xml, findElement(xml, name, el.start)!, fill, before);
}

const solid = (color: string): string => `<a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill>`;

/** Preenchimento da forma (`null` = sem preenchimento). */
export function setShapeFill(pkg: PptxPackage, slidePath: string, id: string, color: string | null): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    let sp = findElement(xml, 'p:spPr', r.start, r.end);
    if (!sp) return xml;
    if (sp.selfClosing) { xml = setInner(xml, sp, ''); sp = findElement(xml, 'p:spPr', r.start)!; }
    return replaceFill(xml, sp, color ? solid(color) : '<a:noFill/>', ['a:ln', 'a:effectLst', 'a:effectDag', 'a:scene3d', 'a:sp3d', 'a:extLst']);
  });
}

/** Contorno da forma (`null` = sem contorno). */
export function setShapeOutline(pkg: PptxPackage, slidePath: string, id: string, color: string | null): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    let sp = findElement(xml, 'p:spPr', r.start, r.end);
    if (!sp) return xml;
    if (sp.selfClosing) { xml = setInner(xml, sp, ''); sp = findElement(xml, 'p:spPr', r.start)!; }
    let ln = findElement(xml, 'a:ln', sp.openEnd, sp.end);
    if (!ln) {
      xml = insertChild(xml, sp, color ? '<a:ln w="12700"></a:ln>' : '<a:ln></a:ln>', ['a:effectLst', 'a:effectDag', 'a:scene3d', 'a:sp3d', 'a:extLst']);
      sp = findElement(xml, 'p:spPr', r.start)!;
      ln = findElement(xml, 'a:ln', sp.openEnd, sp.end)!;
    } else if (ln.selfClosing) {
      xml = setInner(xml, ln, '');
      ln = findElement(xml, 'a:ln', sp.openEnd)!;
    }
    return replaceFill(xml, ln, color ? solid(color) : '<a:noFill/>', ['a:prstDash', 'a:custDash', 'a:round', 'a:bevel', 'a:miter', 'a:headEnd', 'a:tailEnd', 'a:extLst']);
  });
}

export type ArrangeMode = 'front' | 'back' | 'forward' | 'backward';

/** Ordem da forma entre as irmãs da árvore do slide (forma num grupo não muda). */
export function arrangeShape(pkg: PptxPackage, slidePath: string, id: string, mode: ArrangeMode): boolean {
  let xml = pkg.getPartText(slidePath);
  if (!xml) return false;
  const r = shapeRanges(xml, id)[0];
  if (!r) return false;
  const o = outerRange(xml, r);
  const tree = findElement(xml, 'p:spTree')!;
  const kids = childRanges(xml, tree).filter((k) => !['p:nvGrpSpPr', 'p:grpSpPr', 'p:extLst'].includes(k.name));
  const i = kids.findIndex((k) => k.start === o.start);
  if (i < 0) return false;
  const j = mode === 'front' ? kids.length - 1 : mode === 'back' ? 0 : mode === 'forward' ? Math.min(kids.length - 1, i + 1) : Math.max(0, i - 1);
  if (i === j) return false;
  const texts = kids.map((k) => xml!.slice(k.start, k.end));
  const [moved] = texts.splice(i, 1);
  texts.splice(j, 0, moved!);
  // a sequência das irmãs é contígua no texto (só espaços entre elas, se houver)
  xml = splice(xml, kids[0]!.start, kids[kids.length - 1]!.end, texts.join(''));
  pkg.setPartText(slidePath, xml);
  return true;
}

/** Tira do `<p:timing>` as animações que miram a forma (o app recusa animação sem alvo). */
function dropAnimationsOf(xml: string, id: string): string {
  const timing = findElement(xml, 'p:timing');
  if (!timing) return xml;
  const target = new RegExp(`<p:spTgt\\b[^>]*\\sspid="${id}"`);
  let t = xml.slice(timing.start, timing.end);
  if (!target.test(t)) return xml;
  /** remove, um por vez (do mais interno), o primeiro `tag` que satisfaz `pred` */
  const dropWhere = (tag: string, pred: (s: string) => boolean): void => {
    for (let changed = true; changed;) {
      changed = false;
      const all = findAllElements(t, tag).sort((a, b) => (a.end - a.start) - (b.end - b.start));
      for (const r of all) {
        if (pred(t.slice(r.start, r.end))) { t = splice(t, r.start, r.end, ''); changed = true; break; }
      }
    }
  };
  // efeitos (o cTn do próprio p:par tem presetClass) e nós de mídia que miram a forma
  dropWhere('p:par', (s) => /^<p:par>\s*<p:cTn\b[^>]*\spresetClass=/.test(s) && target.test(s));
  dropWhere('p:video', (s) => target.test(s));
  dropWhere('p:audio', (s) => target.test(s));
  // sequências interativas disparadas pela forma
  dropWhere('p:seq', (s) => !/nodeType="mainSeq"/.test(s) && target.test(s));
  for (const tag of ['p:bldP', 'p:bldDgm', 'p:bldOleChart', 'p:bldGraphic']) dropWhere(tag, (s) => new RegExp(`\\sspid="${id}"`).test(s));
  // contêineres que ficaram sem efeito (cliques vazios)
  dropWhere('p:par', (s) => !/presetClass=|<p:video|<p:audio|<p:cmd|nodeType="(mainSeq|tmRoot)"/.test(s));
  // sem nenhum efeito: o slide fica sem <p:timing>, como o app grava
  if (!/presetClass=|<p:video|<p:audio/.test(t)) t = '';
  return splice(xml, timing.start, timing.end, t);
}

/** Exclui a forma (e as animações dela). */
export function deleteShape(pkg: PptxPackage, slidePath: string, id: string): boolean {
  let xml = pkg.getPartText(slidePath);
  if (!xml) return false;
  const rs = shapeRanges(xml, id);
  if (!rs.length) return false;
  const outs = [...new Map(rs.map((r) => outerRange(xml!, r)).map((o) => [o.start, o])).values()].sort((a, b) => b.start - a.start);
  for (const o of outs) xml = splice(xml, o.start, o.end, '');
  xml = dropAnimationsOf(xml, id);
  pkg.setPartText(slidePath, xml);
  return true;
}

// ───────────────────────── texto da forma ─────────────────────────

/** Texto puro de um `<a:p>` (runs, campos, quebras de linha). */
function paragraphText(xml: string, p: XmlRange): string {
  let s = '';
  for (const k of childRanges(xml, p)) {
    if (k.name === 'a:r' || k.name === 'a:fld') {
      const t = findElement(xml, 'a:t', k.start, k.end);
      if (t) s += unescapeXml(innerXml(xml, t));
    } else if (k.name === 'a:br') s += '\v';
  }
  return s;
}

/**
 * Troca o texto da forma, uma linha por parágrafo. Parágrafo cujo texto não
 * mudou fica COMO ESTAVA (runs e formatação); o que mudou mantém o `pPr`
 * (nível, marcador, alinhamento) e o `rPr` do 1º run do parágrafo de mesmo
 * índice (ou do último). Formatação diferente dentro de um parágrafo editado
 * vira a do 1º run.
 */
export function setShapeText(pkg: PptxPackage, slidePath: string, id: string, text: string, lang = 'en-US'): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return editShape(pkg, slidePath, id, (xml, r) => {
    let body = findElement(xml, 'p:txBody', r.start, r.end);
    if (!body) {
      if (elementName(xml, r) !== 'p:sp') return xml;
      xml = insertChild(xml, r, '<p:txBody><a:bodyPr/><a:lstStyle/></p:txBody>', ['p:extLst']);
      body = findElement(xml, 'p:txBody', r.start)!;
    }
    const kids = childRanges(xml, body);
    const paras = kids.filter((k) => k.name === 'a:p');
    const old = paras.map((p) => ({ xml: xml.slice(p.start, p.end), text: paragraphText(xml, p).replace(/\v/g, '\n'), range: p }));
    const out: string[] = [];
    lines.forEach((line, i) => {
      const same = old[i];
      if (same && same.text === line) { out.push(same.xml); return; }
      const ref = same ?? old[old.length - 1];
      let pPr = '';
      let rPr = `<a:rPr lang="${lang}" dirty="0"/>`;
      let end = `<a:endParaRPr lang="${lang}" dirty="0"/>`;
      if (ref) {
        const pp = findElement(xml, 'a:pPr', ref.range.start, ref.range.end);
        if (pp) pPr = xml.slice(pp.start, pp.end);
        const run = findElement(xml, 'a:r', ref.range.start, ref.range.end) ?? findElement(xml, 'a:fld', ref.range.start, ref.range.end);
        const rp = run ? findElement(xml, 'a:rPr', run.start, run.end) : undefined;
        const ep = findElement(xml, 'a:endParaRPr', ref.range.start, ref.range.end);
        if (rp) rPr = stripLink(xml.slice(rp.start, rp.end));
        else if (ep) rPr = xml.slice(ep.start, ep.end).replace(/^<a:endParaRPr/, '<a:rPr').replace(/<\/a:endParaRPr>$/, '</a:rPr>');
        if (ep) end = xml.slice(ep.start, ep.end);
        else if (rp) end = rPr.replace(/^<a:rPr/, '<a:endParaRPr').replace(/<\/a:rPr>$/, '</a:endParaRPr>');
      }
      const runs = line ? `<a:r>${rPr}<a:t>${escapeText(line)}</a:t></a:r>` : '';
      out.push(`<a:p>${pPr}${runs}${end}</a:p>`);
    });
    // o conteúdo novo entra no lugar dos parágrafos antigos (bodyPr/lstStyle e extLst ficam)
    if (paras.length) return splice(xml, paras[0]!.start, paras[paras.length - 1]!.end, out.join(''));
    return insertChild(xml, body, out.join(''), ['a:extLst']);
  });
}

/** rPr sem o hiperlink (o texto digitado não herda o link de um run vizinho). */
function stripLink(rPr: string): string {
  return rPr.replace(/<a:hlink(Click|MouseOver)\b[^>]*?(\/>|>[\s\S]*?<\/a:hlink\1>)/g, '');
}

/** Formatação de caractere aplicada ao texto INTEIRO da forma. */
export interface RunFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** pontos */
  size?: number;
  font?: string;
  /** #RRGGBB */
  color?: string;
}

/** Ordem dos filhos do `<a:rPr>` (CT_TextCharacterProperties). */
const RPR_ORDER = ['a:ln', ...FILL_TAGS, 'a:effectLst', 'a:effectDag', 'a:highlight', 'a:uLnTx', 'a:uLn', 'a:uFillTx', 'a:uFill',
  'a:latin', 'a:ea', 'a:cs', 'a:sym', 'a:hlinkClick', 'a:hlinkMouseOver', 'a:rtl', 'a:extLst'];
const after = (tag: string): string[] => RPR_ORDER.slice(RPR_ORDER.indexOf(tag) + 1);

/** Aplica a formatação a UM rPr (texto do elemento) — devolve o texto novo. */
function formatRPr(rPr: string, f: RunFormat): string {
  let x = rPr;
  let r = findElement(x, elementName(x, { start: 0, end: x.length, openEnd: x.length, selfClosing: false }))!;
  const set = (attr: string, v: string | null): void => { x = setAttr(x, r, attr, v); r = findElement(x, elementName(x, r))!; };
  if (f.bold !== undefined) set('b', f.bold ? '1' : '0');
  if (f.italic !== undefined) set('i', f.italic ? '1' : '0');
  if (f.underline !== undefined) set('u', f.underline ? 'sng' : 'none');
  if (f.strike !== undefined) set('strike', f.strike ? 'sngStrike' : 'noStrike');
  if (f.size !== undefined) set('sz', String(Math.round(Math.max(1, Math.min(4000, f.size)) * 100)));
  if (f.color !== undefined) {
    if (r.selfClosing) { x = setInner(x, r, ''); r = findElement(x, elementName(x, r))!; }
    x = replaceFill(x, r, solid(f.color), after('a:grpFill'));
    r = findElement(x, elementName(x, r))!;
  }
  if (f.font !== undefined) {
    if (r.selfClosing) { x = setInner(x, r, ''); r = findElement(x, elementName(x, r))!; }
    for (const tag of ['a:latin', 'a:cs']) {
      const ex = childRanges(x, r).find((k) => k.name === tag);
      const el = `<${tag} typeface="${escapeAttr(f.font)}"/>`;
      x = ex ? splice(x, ex.start, ex.end, el) : insertChild(x, r, el, after(tag));
      r = findElement(x, elementName(x, r))!;
    }
  }
  return x;
}

/** Cada rPr/endParaRPr dos parágrafos da forma (e os runs sem rPr ganham um). */
function eachRunProps(xml: string, body: XmlRange, lang: string, fn: (rPr: string) => string): string {
  const paras = childRanges(xml, body).filter((k) => k.name === 'a:p').reverse();
  for (const p of paras) {
    const kids = childRanges(xml, p).reverse();
    for (const k of kids) {
      if (k.name === 'a:r' || k.name === 'a:fld' || k.name === 'a:br') {
        const rp = childRanges(xml, k).find((c) => c.name === 'a:rPr');
        if (rp) xml = splice(xml, rp.start, rp.end, fn(xml.slice(rp.start, rp.end)));
        else {
          const at = k.selfClosing ? -1 : k.openEnd;
          if (at < 0) { xml = setInner(xml, k, fn(`<a:rPr lang="${lang}" dirty="0"/>`)); continue; }
          xml = splice(xml, at, at, fn(`<a:rPr lang="${lang}" dirty="0"/>`));
        }
      } else if (k.name === 'a:endParaRPr') {
        xml = splice(xml, k.start, k.end, fn(xml.slice(k.start, k.end)));
      }
    }
    // parágrafo vazio sem endParaRPr: ganha um (o tamanho vale para o texto digitado depois)
    if (!kids.some((k) => k.name === 'a:endParaRPr' || k.name === 'a:r')) {
      const pr = findElement(xml, 'a:p', p.start)!;
      xml = insertChild(xml, pr, fn(`<a:endParaRPr lang="${lang}" dirty="0"/>`));
    }
  }
  return xml;
}

/** Formatação de caractere em TODO o texto da forma. */
export function formatShapeText(pkg: PptxPackage, slidePath: string, id: string, f: RunFormat, lang = 'en-US'): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    return body ? eachRunProps(xml, body, lang, (rp) => formatRPr(rp, f)) : xml;
  });
}

/** Tamanho do texto da forma multiplicado (aumentar/diminuir fonte): sz = base × fator, por run. */
export function scaleShapeText(pkg: PptxPackage, slidePath: string, id: string, sizes: (pt: number | undefined) => number, lang = 'en-US'): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    return body ? eachRunProps(xml, body, lang, (rp) => {
      const m = /\ssz="(\d+)"/.exec(rp.slice(0, rp.indexOf('>') + 1));
      return formatRPr(rp, { size: sizes(m ? Number(m[1]) / 100 : undefined) });
    }) : xml;
  });
}

/** Tira a formatação direta de caractere (negrito, itálico, tamanho, cor, fonte…). */
export function clearShapeFormatting(pkg: PptxPackage, slidePath: string, id: string, lang = 'en-US'): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    return body ? eachRunProps(xml, body, lang, (rp) => {
      let x = rp;
      let el = findElement(x, elementName(x, { start: 0, end: x.length, openEnd: x.length, selfClosing: false }))!;
      for (const a of ['b', 'i', 'u', 'strike', 'sz', 'spc', 'cap', 'baseline', 'kern']) { x = setAttr(x, el, a, null); el = findElement(x, elementName(x, el))!; }
      for (const k of childRanges(x, el).reverse()) if ([...FILL_TAGS, 'a:latin', 'a:ea', 'a:cs', 'a:ln', 'a:effectLst', 'a:highlight', 'a:uLn', 'a:uFill'].includes(k.name)) x = splice(x, k.start, k.end, '');
      return x;
    }) : xml;
  });
}

/** Cada `<a:pPr>` dos parágrafos da forma (cria o que falta). */
function eachParaProps(xml: string, body: XmlRange, fn: (pPr: string) => string): string {
  const paras = childRanges(xml, body).filter((k) => k.name === 'a:p').reverse();
  for (const p of paras) {
    const pp = childRanges(xml, p).find((k) => k.name === 'a:pPr');
    if (pp) xml = splice(xml, pp.start, pp.end, fn(xml.slice(pp.start, pp.end)));
    else if (p.selfClosing) xml = setInner(xml, p, fn('<a:pPr/>'));
    else xml = splice(xml, p.openEnd, p.openEnd, fn('<a:pPr/>'));
  }
  return xml;
}

/** Alinhamento dos parágrafos da forma (l | ctr | r | just). */
export function alignShapeText(pkg: PptxPackage, slidePath: string, id: string, algn: 'l' | 'ctr' | 'r' | 'just'): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    return body ? eachParaProps(xml, body, (pp) => setAttrInTag(pp.slice(0, pp.indexOf('>') + 1), 'algn', algn) + pp.slice(pp.indexOf('>') + 1)) : xml;
  });
}

const BULLET_TAGS = ['a:buFontTx', 'a:buFont', 'a:buNone', 'a:buAutoNum', 'a:buChar', 'a:buBlip'];
const PPR_AFTER_BULLET = ['a:tabLst', 'a:defRPr', 'a:extLst'];

/** Marcadores dos parágrafos da forma: com marcador (•), numerados (1.) ou sem. */
export function setShapeBullets(pkg: PptxPackage, slidePath: string, id: string, kind: 'bullet' | 'number' | 'none'): boolean {
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    if (!body) return xml;
    return eachParaProps(xml, body, (pp) => {
      let x = pp;
      let el = findElement(x, 'a:pPr')!;
      if (el.selfClosing) { x = setInner(x, el, ''); el = findElement(x, 'a:pPr')!; }
      for (const k of childRanges(x, el).reverse()) if (BULLET_TAGS.includes(k.name)) x = splice(x, k.start, k.end, '');
      el = findElement(x, 'a:pPr')!;
      const lvl = Number(getAttr(x, el, 'lvl') ?? 0) || 0;
      if (kind === 'none') {
        x = insertChild(x, el, '<a:buNone/>', PPR_AFTER_BULLET);
        el = findElement(x, 'a:pPr')!;
        x = setAttr(x, el, 'indent', '0');
        el = findElement(x, 'a:pPr')!;
        return setAttr(x, el, 'marL', String(lvl * 457200));
      }
      const bu = kind === 'bullet' ? '<a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:buChar char="•"/>'
        : '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>';
      x = insertChild(x, el, bu, PPR_AFTER_BULLET);
      el = findElement(x, 'a:pPr')!;
      // recuo do marcador (caixa de texto vem com marL=0: o marcador cobriria o texto)
      if (!(Number(getAttr(x, el, 'marL')) > 0)) {
        x = setAttr(x, el, 'marL', String(lvl * 457200 + 342900));
        el = findElement(x, 'a:pPr')!;
        x = setAttr(x, el, 'indent', '-342900');
      }
      return x;
    });
  });
}

/** Hiperlink em todo o texto da forma (`null` tira). */
export function setShapeLink(pkg: PptxPackage, slidePath: string, id: string, url: string | null, lang = 'en-US'): boolean {
  const xml0 = pkg.getPartText(slidePath);
  if (!xml0 || !shapeRanges(xml0, id).length) return false;
  const rId = url ? addRel(pkg, slidePath, REL.hyperlink, url, true) : '';
  return editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    if (!body) return xml;
    return eachRunProps(xml, body, lang, (rp) => {
      if (/^<a:endParaRPr/.test(rp)) return rp;
      let x = stripLink(rp);
      if (!url) return x;
      let el = findElement(x, 'a:rPr')!;
      if (el.selfClosing) { x = setInner(x, el, ''); el = findElement(x, 'a:rPr')!; }
      return insertChild(x, el, `<a:hlinkClick r:id="${rId}"/>`, after('a:hlinkClick'));
    });
  });
}

/**
 * Substitui `query` por `repl` no texto da forma, DENTRO de cada `<a:t>` (o
 * que atravessa runs de formatação diferente não casa). Devolve quantas trocas.
 */
export function replaceInShape(pkg: PptxPackage, slidePath: string, id: string, query: string, repl: string, matchCase = false): number {
  if (!query) return 0;
  let count = 0;
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
  editShape(pkg, slidePath, id, (xml, r) => {
    const body = findElement(xml, 'p:txBody', r.start, r.end);
    if (!body) return xml;
    for (const t of findElements(xml, 'a:t', body.openEnd, body.end).reverse()) {
      const text = unescapeXml(innerXml(xml, t));
      const next = text.replace(re, () => { count++; return repl; });
      if (next !== text) xml = setInner(xml, t, escapeText(next));
    }
    return xml;
  });
  return count;
}

// ───────────────────────── anotações ─────────────────────────

/** A apresentação tem um master de anotações (a página de anotações de um slide precisa dele). */
export function hasNotesMaster(pkg: PptxPackage): boolean {
  return readRelList(pkg, PRES).some((r) => r.type === REL.notesMaster && !!pkg.getPart(resolveTarget(pkg, PRES, r.target)));
}

// filhos de p:presentation que vêm DEPOIS do notesMasterIdLst / do notesSz (CT_Presentation)
const AFTER_NOTES_MASTER_LIST = ['p:handoutMasterIdLst', 'p:sldIdLst', 'p:sldSz', 'p:notesSz', 'p:smartTags', 'p:embeddedFontLst',
  'p:custShowLst', 'p:photoAlbum', 'p:custDataLst', 'p:kinsoku', 'p:defaultTextStyle', 'p:modifyVerifier', 'p:extLst'];
const AFTER_NOTES_SIZE = AFTER_NOTES_MASTER_LIST.slice(AFTER_NOTES_MASTER_LIST.indexOf('p:smartTags'));

/**
 * O master de anotações da apresentação; sem ele, cria um (o padrão do Office, com
 * tema próprio), como o PowerPoint faz na primeira anotação. Devolve o caminho.
 */
export function ensureNotesMaster(pkg: PptxPackage): string {
  const existing = readRelList(pkg, PRES).find((r) => r.type === REL.notesMaster && !!pkg.getPart(resolveTarget(pkg, PRES, r.target)));
  if (existing) return resolveTarget(pkg, PRES, existing.target);
  const themePath = nextPartName(pkg, 'ppt/theme', 'theme', 'xml');
  pkg.setPartText(themePath, officeTheme('Office Theme'));
  addOverride(pkg, themePath, CT.theme);
  const masterPath = nextPartName(pkg, 'ppt/notesMasters', 'notesMaster', 'xml');
  pkg.setPartText(masterPath, blankNotesMaster());
  addRel(pkg, masterPath, REL.theme, relativeTarget(masterPath, themePath));
  addOverride(pkg, masterPath, CT.notesMaster);
  // uma referência quebrada (lista apontando para parte ausente) dá lugar à nova
  const stale = new Set(readRelList(pkg, PRES).filter((r) => r.type === REL.notesMaster).map((r) => r.id));
  if (stale.size) removeRels(pkg, PRES, stale);
  const rId = addRel(pkg, PRES, REL.notesMaster, relativeTarget(PRES, masterPath));
  let xml = pkg.presentationXml();
  const entry = `<p:notesMasterId r:id="${rId}"/>`;
  const lst = findElement(xml, 'p:notesMasterIdLst');
  if (lst) xml = setInner(xml, lst, entry);
  else xml = insertChild(xml, findElement(xml, 'p:presentation')!, `<p:notesMasterIdLst>${entry}</p:notesMasterIdLst>`, AFTER_NOTES_MASTER_LIST);
  if (!findElement(xml, 'p:notesSz')) {
    xml = insertChild(xml, findElement(xml, 'p:presentation')!, '<p:notesSz cx="6858000" cy="9144000"/>', AFTER_NOTES_SIZE);
  }
  pkg.setPartText(PRES, xml);
  return masterPath;
}

/** Grava as anotações do slide (cria a página de anotações e, se faltar, o master de anotações). */
export function setSlideNotes(pkg: PptxPackage, slidePath: string, text: string, lang = 'en-US'): boolean {
  const rel = readRelList(pkg, slidePath).find((r) => r.type === REL.notesSlide);
  let notesPath = rel ? resolveTarget(pkg, slidePath, rel.target) : undefined;
  if (!notesPath || !pkg.getPart(notesPath)) {
    const masterPath = ensureNotesMaster(pkg);
    notesPath = nextPartName(pkg, 'ppt/notesSlides', 'notesSlide', 'xml');
    pkg.setPartText(notesPath, `${XML_DECL}<p:notes ${NS_DECL}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>`
      + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
      + '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>'
      + '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>'
      + `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody></p:sp>`
      + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>');
    addRel(pkg, notesPath, REL.notesMaster, relativeTarget(notesPath, masterPath));
    addRel(pkg, notesPath, REL.slide, relativeTarget(notesPath, slidePath));
    addOverride(pkg, notesPath, CT.notesSlide);
    if (rel) setRelTarget(pkg, slidePath, rel.id, relativeTarget(slidePath, notesPath));
    else addRel(pkg, slidePath, REL.notesSlide, relativeTarget(slidePath, notesPath));
  }
  let xml = pkg.getPartText(notesPath)!;
  const tree = findElement(xml, 'p:spTree');
  if (!tree) return false;
  let body = findElements(xml, 'p:sp', tree.openEnd, tree.end).find((sp) => {
    const ph = findElement(xml, 'p:ph', sp.start, sp.end);
    return ph && getAttr(xml, ph, 'type') === 'body';
  });
  if (!body) {
    const id = maxShapeId(xml) + 1;
    xml = appendShape(xml, `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Notes Placeholder ${id - 1}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody></p:sp>`);
    pkg.setPartText(notesPath, xml);
    const t2 = findElement(xml, 'p:spTree')!;
    body = findElements(xml, 'p:sp', t2.openEnd, t2.end).pop()!;
  }
  const cnv = findElement(xml, 'p:cNvPr', body.start, body.end);
  const id = cnv ? getAttr(xml, cnv, 'id') ?? '' : '';
  // a página de anotações é uma "slide" para a edição de texto (a mesma árvore p:spTree)
  return setShapeText(pkg, notesPath, id, text, lang);
}

// ───────────────────────── propriedades do documento ─────────────────────────

export interface DocProperties {
  title?: string;
  subject?: string;
  author?: string;
  keywords?: string;
  description?: string;
  lastModifiedBy?: string;
  created?: string;
  modified?: string;
}

const CORE_FIELDS: [keyof DocProperties, string][] = [
  ['title', 'dc:title'], ['subject', 'dc:subject'], ['author', 'dc:creator'], ['keywords', 'cp:keywords'],
  ['description', 'dc:description'], ['lastModifiedBy', 'cp:lastModifiedBy'], ['created', 'dcterms:created'], ['modified', 'dcterms:modified'],
];

function corePath(pkg: PptxPackage): string | undefined {
  const rel = readRelList(pkg, '').find((r) => r.type === REL.coreProps);
  return rel ? rel.target.replace(/^\//, '') : undefined;
}

/** Propriedades (docProps/core.xml). */
export function readProperties(pkg: PptxPackage): DocProperties {
  const path = corePath(pkg);
  const xml = path ? pkg.getPartText(path) : undefined;
  const out: DocProperties = {};
  if (!xml) return out;
  for (const [k, tag] of CORE_FIELDS) {
    const el = findElement(xml, tag);
    const v = el ? unescapeXml(innerXml(xml, el)).trim() : '';
    if (v) out[k] = v;
  }
  return out;
}

/** Grava as propriedades editáveis (título, assunto, autor, palavras-chave, comentários). */
export function writeProperties(pkg: PptxPackage, props: DocProperties): void {
  let path = corePath(pkg);
  if (!path) {
    path = 'docProps/core.xml';
    pkg.setPartText(path, `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>`);
    addRel(pkg, '', REL.coreProps, path);
    addOverride(pkg, path, CT.coreProps);
  }
  let xml = pkg.getPartText(path)!;
  for (const [k, tag] of CORE_FIELDS) {
    if (!(k in props) || k === 'created' || k === 'modified') continue;
    const v = props[k] ?? '';
    const el = findElement(xml, tag);
    if (el) xml = v ? setInner(xml, el, escapeText(v)) : splice(xml, el.start, el.end, '');
    else if (v) xml = insertChild(xml, findElement(xml, 'cp:coreProperties')!, `<${tag}>${escapeText(v)}</${tag}>`);
  }
  pkg.setPartText(path, xml);
}

// ───────────────────────── configurar apresentação ─────────────────────────

export interface ShowSettingsSpec {
  loop?: boolean;
  useTimings?: boolean;
  showAnimation?: boolean;
  kiosk?: boolean;
}

/** Grava o "Configurar apresentação" (`<p:showPr>` do presProps). */
export function writeShowSettings(pkg: PptxPackage, s: ShowSettingsSpec): void {
  const rel = readRelList(pkg, PRES).find((r) => r.type === REL.presProps);
  const path = rel ? resolveTarget(pkg, PRES, rel.target) : 'ppt/presProps.xml';
  if (!pkg.getPart(path)) {
    pkg.setPartText(path, `${XML_DECL}<p:presentationPr ${NS_DECL}><p:showPr showNarration="1"><p:present/><p:sldAll/><p:penClr><a:prstClr val="red"/></p:penClr></p:showPr></p:presentationPr>`);
    addOverride(pkg, path, CT.presProps);
    if (!rel) addRel(pkg, PRES, REL.presProps, relativeTarget(PRES, path));
  }
  let xml = pkg.getPartText(path)!;
  let sp = findElement(xml, 'p:showPr');
  if (!sp) {
    const root = findElement(xml, 'p:presentationPr')!;
    xml = insertChild(xml, root, '<p:showPr showNarration="1"><p:present/><p:sldAll/></p:showPr>', ['p:clrMru', 'p:extLst']);
    sp = findElement(xml, 'p:showPr')!;
  }
  const flag = (attr: string, v: boolean | undefined, def: boolean): void => {
    if (v === undefined) return;
    xml = setAttr(xml, sp!, attr, v === def ? null : v ? '1' : '0');
    sp = findElement(xml, 'p:showPr')!;
  };
  flag('loop', s.loop, false);
  flag('useTimings', s.useTimings, true);
  flag('showAnimation', s.showAnimation, true);
  if (s.kiosk !== undefined) {
    if (sp.selfClosing) { xml = setInner(xml, sp, ''); sp = findElement(xml, 'p:showPr')!; }
    for (const k of childRanges(xml, sp).reverse()) if (['p:present', 'p:browse', 'p:kiosk'].includes(k.name)) xml = splice(xml, k.start, k.end, '');
    sp = findElement(xml, 'p:showPr')!;
    xml = splice(xml, sp.openEnd, sp.openEnd, s.kiosk ? '<p:kiosk/>' : '<p:present/>');
  }
  pkg.setPartText(path, xml);
}

// ───────────────────────── área de transferência (formas) ─────────────────────────

/** Forma copiada: o XML dela e as relações que ele cita (imagens com os bytes, para colar em outra apresentação). */
export interface ShapeClip {
  xml: string;
  rels: { id: string; type: string; target: string; external: boolean; bytes?: Uint8Array; contentType?: string }[];
  /** texto da forma (vai também como texto puro para a área de transferência do sistema) */
  text: string;
  /** pacote de onde veio (colar no mesmo pacote compartilha as partes) */
  source: PptxPackage;
  slidePath: string;
}

const REL_ATTR = /\br:(embed|link|id|pict|dm|lo|qs|cs)="([^"]+)"/g;
/** Relações que dá para levar para OUTRA apresentação (copiando os bytes). */
const PORTABLE_REL = /\/(image|media|video|audio)$/;

/** Copia a forma (só as que estão direto na árvore do slide — fora de grupos). */
export function extractShape(pkg: PptxPackage, slidePath: string, id: string): ShapeClip | null {
  const xml = pkg.getPartText(slidePath);
  if (!xml || !isTopLevel(xml, id)) return null;
  const o = outerRange(xml, shapeRanges(xml, id)[0]!);
  const shapeXml = xml.slice(o.start, o.end);
  const ids = new Set([...shapeXml.matchAll(REL_ATTR)].map((m) => m[2]!));
  const rels = readRelList(pkg, slidePath).filter((r) => ids.has(r.id)).map((r) => {
    if (r.external) return { ...r };
    const abs = resolveTarget(pkg, slidePath, r.target);
    return { ...r, target: abs, bytes: pkg.getPart(abs), contentType: contentTypeOf(pkg, abs) };
  });
  const text = findAllElements(shapeXml, 'a:p').map((p) => findElements(shapeXml, 'a:t', p.start, p.end).map((t) => unescapeXml(innerXml(shapeXml, t))).join('')).join('\n');
  return { xml: shapeXml, rels, text, source: pkg, slidePath };
}

/**
 * Cola a forma no slide (por cima de tudo), com ids novos e as relações
 * refeitas; `dx/dy` (EMU) deslocam a posição. Devolve o id novo, ou null se a
 * forma depende de partes que não dá para levar a outra apresentação (gráfico,
 * SmartArt, objeto OLE).
 */
export function pasteShape(pkg: PptxPackage, slidePath: string, clip: ShapeClip, dx = 0, dy = 0): string | null {
  const same = clip.source === pkg;
  let xml = clip.xml;
  // mc:AlternateContent: o Choice usa prefixos declarados na raiz do slide de
  // origem (p14…); o Fallback é PresentationML puro e vale em qualquer slide
  if (xml.startsWith('<mc:AlternateContent')) {
    const fb = findElement(xml, 'mc:Fallback') ?? findElement(xml, 'mc:Choice');
    xml = fb ? innerXml(xml, fb).trim() : xml;
  }
  // relações: a mesma parte (mesmo pacote) ou uma cópia dos bytes (imagem/mídia em outro pacote)
  const remap = new Map<string, string>();
  for (const r of clip.rels) {
    if (r.external) { remap.set(r.id, addRel(pkg, slidePath, r.type, r.target, true)); continue; }
    if (same && pkg.getPart(r.target)) {
      const target = SHARED_REL.test(r.type) ? r.target : copyPartDeep(pkg, r.target, new Set());
      remap.set(r.id, addRel(pkg, slidePath, r.type, relativeTarget(slidePath, target)));
      continue;
    }
    if (!PORTABLE_REL.test(r.type) || !r.bytes) return null;
    const ext = r.target.slice(r.target.lastIndexOf('.') + 1).toLowerCase() || 'bin';
    const part = nextPartName(pkg, 'ppt/media', 'image', ext);
    pkg.setPart(part, r.bytes);
    if (r.contentType) ensureDefault(pkg, ext, r.contentType);
    remap.set(r.id, addRel(pkg, slidePath, r.type, relativeTarget(slidePath, part)));
  }
  xml = xml.replace(REL_ATTR, (m, kind: string, id: string) => (remap.has(id) ? `r:${kind}="${remap.get(id)}"` : m));
  // ids novos (cópias no mc:AlternateContent mantêm o MESMO id entre si)
  const target = pkg.getPartText(slidePath)!;
  let next = maxShapeId(target) + 1;
  const ids = new Map<string, number>();
  xml = xml.replace(/(<p:cNvPr\b[^>]*?\sid=")(\d+)(")/g, (_, a: string, old: string, b: string) => {
    if (!ids.has(old)) ids.set(old, next++);
    return `${a}${ids.get(old)}${b}`;
  });
  // deslocamento: o primeiro <a:off>/<p:xfrm> de cada cópia
  if (dx || dy) {
    const shift = (s: string): string => s.replace(/<a:off\b[^>]*\/>/, (off) => {
      const x = Number(/\sx="(-?\d+)"/.exec(off)?.[1] ?? 0) + dx, y = Number(/\sy="(-?\d+)"/.exec(off)?.[1] ?? 0) + dy;
      return `<a:off x="${Math.round(x)}" y="${Math.round(y)}"/>`;
    });
    xml = shift(xml);
  }
  pkg.setPartText(slidePath, appendShape(target, xml));
  return String(ids.values().next().value ?? next - 1);
}

/** Texto do `<a:t>` de cada parágrafo da forma (teste/diagnóstico). */
export function shapeParagraphs(pkg: PptxPackage, slidePath: string, id: string): string[] {
  const xml = pkg.getPartText(slidePath) ?? '';
  const r = shapeRanges(xml, id)[0];
  const body = r ? findElement(xml, 'p:txBody', r.start, r.end) : undefined;
  if (!body) return [];
  return childRanges(xml, body).filter((k) => k.name === 'a:p').map((p) => paragraphText(xml, p).replace(/\v/g, '\n'));
}
