// Folha de estilos do <universal-write>: a parte word/styles.xml é a fonte
// única (cada operação troca só os w:style envolvidos — docx-core/style-sheet);
// daqui saem a lista da galeria/painel, a formatação EFETIVA de cada estilo
// (miniaturas, diálogo, descrição) e as transformações de criar, modificar,
// renomear, excluir e mostrar na galeria. Regras do Word medidas no oráculo
// (write/tools/styles-oracle; memória word-styles-oracle-facts).
import {
  BLANK_STYLES_XML, builtinDisplayName, builtinStyle, builtinStyles, builtinXml, dropStyle, newStyleXml, patchStylePPr,
  patchStyleRPr, patchStyleXml, putStyle, readStyleIndex, readStyleSheet, setLatentQFormat, styleIdFromName, styleKid,
  styleRaw, hasParaChanges, hasRunChanges,
  type LatentMeta, type PPr, type RPr, type StyleFormat, type StyleMeta, type StyleSheet, type Theme,
} from '@universal-office/docx-core';
import { StyleResolver, cascadeRPr, emptyFormatting, fontOfSlot, mergePPr, resolveColor } from '@universal-office/docx-layout';

export type StyleKind = 'paragraph' | 'character' | 'linked';
/** Filtros do painel (como as opções do painel de estilos). */
export type StyleFilter = 'gallery' | 'recommended' | 'inUse' | 'document' | 'all';

/** Um estilo como a interface o mostra. */
export interface StyleInfo {
  /** styleId (latente: o id que ele terá ao ser usado) */
  id: string;
  /** nome na língua da interface (built-in traduzido; personalizado como gravado) */
  name: string;
  /** w:name gravado */
  rawName: string;
  kind: StyleKind;
  builtIn: boolean;
  /** já definido no styles.xml (false = latente) */
  defined: boolean;
  /** na galeria de estilos (w:qFormat) */
  quick: boolean;
  /** oculto (w:semiHidden / w:hidden) */
  hidden: boolean;
  priority: number;
  inUse: boolean;
  isDefault: boolean;
  basedOn?: string;
  next?: string;
  /** par de caractere de um vinculado */
  link?: string;
  autoUpdate: boolean;
}

/** Formatação efetiva de um estilo (cascata docDefaults → basedOn → estilo). */
export interface StyleLook {
  fontFamily: string;
  sizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  allCaps: boolean;
  smallCaps: boolean;
  /** RRGGBB; undefined = automática */
  color?: string;
  charSpacingTwips: number;
  alignment: 'left' | 'center' | 'right' | 'both';
  spaceBeforeTwips: number;
  spaceAfterTwips: number;
  /** entrelinhas "múltiplos" (240 = simples); undefined = exata/pelo menos */
  lineTwentieths?: number;
  indentLeftTwips: number;
  indentRightTwips: number;
  /** >0 primeira linha, <0 deslocamento */
  indentFirstLineTwips: number;
  shadingHex?: string;
  borderTop?: string;
  borderBottom?: string;
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const EMPTY_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="${W_NS}"></w:styles>`;

type Index = ReturnType<typeof readStyleIndex>;
let blankLatent: Map<string, LatentMeta> | null = null;
function blankLatentOf(name: string): LatentMeta | undefined {
  blankLatent ??= new Map(readStyleIndex(BLANK_STYLES_XML).latent.items.map((l) => [l.name.toLowerCase(), l]));
  return blankLatent.get(name.toLowerCase());
}

/** Versões do styles.xml (desfazer guarda só o índice). */
export class DocStyles {
  private versions: (string | null)[];
  private v = 0;
  private memo: { xml: string | null; index: Index; sheet: StyleSheet } | null = null;

  constructor(xml: string | null) { this.versions = [xml]; }

  get xml(): string | null { return this.versions[this.v] ?? null; }
  get version(): number { return this.v; }
  /** mudou desde a carga (o salvar regrava a parte) */
  get dirty(): boolean { return this.xml !== this.versions[0]; }

  commit(xml: string): void {
    if (xml === this.xml) return;
    this.versions.push(xml);
    this.v = this.versions.length - 1;
  }
  /** volta a uma versão (desfazer/refazer); true se mudou */
  restore(v: number): boolean {
    if (v === this.v || v < 0 || v >= this.versions.length) return false;
    this.v = v;
    return true;
  }

  private get m() {
    const xml = this.xml;
    if (!this.memo || this.memo.xml !== xml) {
      this.memo = {
        xml,
        index: xml ? readStyleIndex(xml) : { styles: [], latent: { defaults: { uiPriority: 99, semiHidden: false, unhideWhenUsed: false, qFormat: false }, items: [] } },
        sheet: readStyleSheet(xml ?? undefined),
      };
    }
    return this.memo;
  }
  index(): Index { return this.m.index; }
  sheet(): StyleSheet { return this.m.sheet; }
  /** base para editar (documento sem styles.xml ganha uma parte mínima) */
  base(): string { return this.xml ?? EMPTY_STYLES; }

  meta(id: string | undefined): (StyleMeta & { start: number; end: number }) | undefined {
    return id === undefined ? undefined : this.index().styles.find((s) => s.id === id);
  }
  /** estilo definido pelo w:name (sem diferenciar maiúsculas) */
  byName(name: string): (StyleMeta & { start: number; end: number }) | undefined {
    const k = name.toLowerCase();
    return this.index().styles.find((s) => s.name.toLowerCase() === k);
  }
  /** estilo de parágrafo padrão (w:default) — "Normal" */
  defaultParagraph(): string {
    return this.index().styles.find((s) => s.type === 'paragraph' && s.isDefault)?.id ?? 'Normal';
  }
  defaultCharacter(): string {
    return this.index().styles.find((s) => s.type === 'character' && s.isDefault)?.id ?? 'Fontepargpadro';
  }
  ids(): Set<string> { return new Set(this.index().styles.map((s) => s.id)); }
}

/** É o par de caractere de um vinculado (não aparece nas listas). */
function isTwin(ds: DocStyles, m: StyleMeta): boolean {
  if (m.type !== 'character' || !m.link) return false;
  return ds.meta(m.link)?.type === 'paragraph';
}

export function displayName(m: { name: string; custom: boolean; aliases?: string }, lang: 'en' | 'pt'): string {
  const base = m.custom ? m.name : builtinDisplayName(m.name, lang) ?? m.name;
  return m.aliases ? `${base},${m.aliases}` : base;
}

function kindOf(ds: DocStyles, m: { type: string; link?: string }): StyleKind {
  if (m.type === 'character') return 'character';
  return m.link && ds.meta(m.link)?.type === 'character' ? 'linked' : 'paragraph';
}

const latentOf = (ds: DocStyles, name: string): LatentMeta | undefined => {
  const k = name.toLowerCase();
  return ds.index().latent.items.find((l) => l.name.toLowerCase() === k) ?? blankLatentOf(name);
};

/** Lista de estilos de parágrafo/caractere (definidos + latentes built-in). */
export function listStyles(ds: DocStyles, lang: 'en' | 'pt', inUse: ReadonlySet<string>, filter: StyleFilter = 'recommended'): StyleInfo[] {
  const out: StyleInfo[] = [];
  const names = new Set<string>();
  const defPara = ds.defaultParagraph();
  for (const m of ds.index().styles) {
    if (m.type !== 'paragraph' && m.type !== 'character') continue;
    names.add(m.name.toLowerCase());
    if (isTwin(ds, m)) continue;
    // estilo de caractere padrão (Fonte parág. padrão) não se aplica pela galeria
    if (m.type === 'character' && m.isDefault) continue;
    const kind = kindOf(ds, m);
    out.push({
      id: m.id, name: displayName(m, lang), rawName: m.name, kind, builtIn: !m.custom, defined: true,
      quick: m.qFormat, hidden: m.semiHidden || m.hidden, priority: m.uiPriority,
      inUse: inUse.has(m.id) || (m.id === defPara) || (!!m.link && inUse.has(m.link)),
      isDefault: m.isDefault, basedOn: m.basedOn, next: m.next, link: kind === 'linked' ? m.link : undefined, autoUpdate: m.autoRedefine,
    });
  }
  // latentes: built-ins que o documento ainda não define
  const taken = ds.ids();
  for (const b of builtinStyles()) {
    if (names.has(b.name.toLowerCase())) continue;
    const id = b.xml.match(/w:styleId="([^"]*)"/)![1]!;
    if (taken.has(id)) continue;
    const l = latentOf(ds, b.name);
    const type = /w:type="character"/.test(b.xml) ? 'character' : 'paragraph';
    const link = b.twin?.match(/w:styleId="([^"]*)"/)?.[1];
    out.push({
      id, name: builtinDisplayName(b.name, lang) ?? b.name, rawName: b.name,
      kind: type === 'character' ? 'character' : link ? 'linked' : 'paragraph',
      builtIn: true, defined: false, quick: l?.qFormat ?? false, hidden: l?.semiHidden ?? false,
      priority: l?.uiPriority ?? 99, inUse: false, isDefault: false,
      basedOn: b.xml.match(/<w:basedOn w:val="([^"]*)"/)?.[1], next: b.xml.match(/<w:next w:val="([^"]*)"/)?.[1], link,
      autoUpdate: false,
    });
  }
  const headingInUse = (n: number): boolean => out.some((s) => s.rawName.toLowerCase() === `heading ${n}` && s.inUse);
  // como no Word: o título N+1 aparece (galeria e painel) quando o N está em uso
  const nextHeading = (s: StyleInfo): boolean => {
    const h = /^heading (\d)$/.exec(s.rawName.toLowerCase());
    return !!h && +h[1]! > 1 && headingInUse(+h[1]! - 1);
  };
  const keep = (s: StyleInfo): boolean => {
    switch (filter) {
      case 'gallery': return s.quick && (!s.hidden || nextHeading(s));
      case 'recommended': return !s.hidden || s.inUse || nextHeading(s);
      case 'inUse': return s.inUse;
      case 'document': return s.defined;
      case 'all': return true;
    }
  };
  const coll = new Intl.Collator(lang === 'pt' ? 'pt-BR' : 'en');
  return out.filter(keep).sort((a, b) => a.priority - b.priority || coll.compare(a.name, b.name));
}

/** Definições dos latentes que a cadeia de `id` precisa (para resolver sem gravar). */
function withLatent(ds: DocStyles, id: string): StyleSheet {
  const sheet = ds.sheet();
  if (sheet.styles[id]) return sheet;
  const extra: string[] = [];
  const seen = new Set<string>();
  const add = (sid: string | undefined): void => {
    if (!sid || seen.has(sid) || sheet.styles[sid]) return;
    seen.add(sid);
    const b = builtinStyles().find((x) => x.xml.includes(`w:styleId="${sid}"`) || x.twin?.includes(`w:styleId="${sid}"`));
    if (!b) return;
    extra.push(b.xml, b.twin ?? '');
    add(b.xml.match(/<w:basedOn w:val="([^"]*)"/)?.[1]);
  };
  add(id);
  if (!extra.length) return sheet;
  const more = readStyleSheet(`<w:styles xmlns:w="${W_NS}">${extra.join('')}</w:styles>`);
  return { ...sheet, styles: { ...more.styles, ...sheet.styles } };
}

const borderCss = (b: { val: string; sz?: number; color?: string; themeColor?: string; themeTint?: string; themeShade?: string } | undefined, theme: Theme): string | undefined => {
  if (!b || b.val === 'nil' || b.val === 'none') return undefined;
  const c = resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, theme) ?? '000000';
  return `${Math.max(1, Math.round(((b.sz ?? 4) / 8) * 4 / 3))}px ${b.val === 'double' ? 'double' : b.val === 'dotted' ? 'dotted' : b.val === 'dashed' ? 'dashed' : 'solid'} #${c}`;
};

/** Cascata do estilo: pPr/rPr efetivos (docDefaults → basedOn → estilo). */
export function styleProps(ds: DocStyles, theme: Theme, id: string): { pPr: PPr; rPr: RPr; kind: StyleKind } {
  const sheet = withLatent(ds, id);
  const res = new StyleResolver({ ...emptyFormatting(), styles: sheet, theme });
  const def = sheet.styles[id];
  const dd = sheet.docDefaults;
  if (def?.type === 'character') {
    const para = res.paraStyle(undefined);
    return { pPr: mergePPr(dd.pPr, para.pPr), rPr: cascadeRPr(dd.rPr, [para.rPr, res.charStyle(id)], undefined), kind: 'character' };
  }
  const ps = res.paraStyle(id);
  const kind: StyleKind = def?.link && sheet.styles[def.link]?.type === 'character' ? 'linked' : 'paragraph';
  return { pPr: mergePPr(dd.pPr, ps.pPr), rPr: cascadeRPr(dd.rPr, [ps.rPr], undefined), kind };
}

export function lookOf(pPr: PPr, rPr: RPr, theme: Theme, dd: RPr | undefined): StyleLook {
  const jc = pPr.jc;
  const sp = pPr.spacing ?? {};
  const ind = pPr.ind ?? {};
  return {
    fontFamily: fontOfSlot(rPr.rFonts, 'ascii', theme) ?? fontOfSlot(rPr.rFonts, 'hAnsi', theme) ?? fontOfSlot(dd?.rFonts, 'ascii', theme) ?? theme.minor.latin ?? 'Times New Roman',
    sizePt: (rPr.sz ?? 20) / 2,
    bold: !!rPr.b, italic: !!rPr.i,
    underline: !!rPr.u && rPr.u.val !== 'none',
    strike: !!rPr.strike, allCaps: !!rPr.caps, smallCaps: !!rPr.smallCaps,
    color: resolveColor(rPr.color, theme),
    charSpacingTwips: rPr.spacing ?? 0,
    alignment: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : jc === 'both' || jc === 'distribute' ? 'both' : 'left',
    spaceBeforeTwips: sp.before ?? 0,
    spaceAfterTwips: sp.after ?? 0,
    lineTwentieths: sp.lineRule === 'exact' || sp.lineRule === 'atLeast' ? undefined : sp.line ?? 240,
    indentLeftTwips: ind.left ?? 0,
    indentRightTwips: ind.right ?? 0,
    indentFirstLineTwips: ind.hanging ? -ind.hanging : ind.firstLine ?? 0,
    shadingHex: pPr.shd?.fill && pPr.shd.fill !== 'auto' ? pPr.shd.fill : undefined,
    borderTop: borderCss(pPr.pBdr?.top, theme),
    borderBottom: borderCss(pPr.pBdr?.bottom, theme),
  };
}

export function styleLook(ds: DocStyles, theme: Theme, id: string): StyleLook {
  const { pPr, rPr } = styleProps(ds, theme, id);
  return lookOf(pPr, rPr, theme, ds.sheet().docDefaults.rPr);
}

// ───────────────────────── transformações do XML ─────────────────────────

const idOf = (xml: string): string => xml.match(/w:styleId="([^"]*)"/)![1]!;
const refsIn = (xml: string): string[] => [...xml.matchAll(/<w:(?:basedOn|next|link) w:val="([^"]*)"\/>/g)].map((m) => m[1]!);

/** id do estilo NO DOCUMENTO: um id de built-in (pt-BR, ex. "Ttulo2") vira o do
 *  estilo de mesmo w:name que o arquivo já tem (inglês "Heading2"…). */
export function resolveStyleId(xml: string | null, id: string): string {
  if (!xml) return id;
  const idx = readStyleIndex(xml);
  if (idx.styles.some((s) => s.id === id)) return id;
  const b = builtinStyles().find((x) => idOf(x.xml) === id || (x.twin && idOf(x.twin) === id));
  if (!b) return id;
  const twin = b.twin && idOf(b.twin) === id;
  const para = idx.styles.find((s) => s.name.toLowerCase() === b.name.toLowerCase());
  if (!para) return id;
  return twin ? para.link ?? id : para.id;
}

/** Garante que o estilo `id` (latente built-in) esteja definido — com a cadeia
 *  basedOn e o par Char. `used` tira o semiHidden (o Word faz isso ao usar). */
export function ensureDefined(ds: DocStyles, xml: string, id: string, used: boolean): string {
  const idx = readStyleIndex(xml);
  const has = (sid: string): StyleMeta | undefined => idx.styles.find((s) => s.id === sid);
  const cur = has(id);
  if (cur) {
    if (used && cur.semiHidden && cur.unhideWhenUsed) {
      let out = putStyle(xml, id, patchStyleXml(styleRaw(xml, id)!, { semiHidden: false }));
      const tw = cur.link ? has(cur.link) : undefined;
      if (tw?.semiHidden) out = putStyle(out, tw.id, patchStyleXml(styleRaw(out, tw.id)!, { semiHidden: false }));
      return out;
    }
    return xml;
  }
  const b = builtinStyles().find((x) => idOf(x.xml) === id || (x.twin && idOf(x.twin) === id));
  if (!b) return xml;
  // ids que o documento usa para os mesmos built-ins (inglês "Heading1" × pt-BR "Ttulo1")
  const refs: Record<string, string> = {};
  let out = xml;
  for (const r of [...refsIn(b.xml), ...(b.twin ? refsIn(b.twin) : [])]) {
    if (r === idOf(b.xml) || (b.twin && r === idOf(b.twin))) continue;
    const rb = builtinStyles().find((x) => idOf(x.xml) === r || (x.twin && idOf(x.twin) === r));
    const named = rb ? readStyleIndex(out).styles.find((s) => s.name.toLowerCase() === (idOf(rb.xml) === r ? rb.name : `${rb.pt} Char`).toLowerCase()) : undefined;
    if (named) { if (named.id !== r) refs[r] = named.id; continue; }
    if (readStyleIndex(out).styles.some((s) => s.id === r)) continue;
    if (r === 'Fontepargpadro' || r === 'Normal') {
      const dflt = readStyleIndex(out).styles.find((s) => s.isDefault && s.type === (r === 'Normal' ? 'paragraph' : 'character'));
      if (dflt) { refs[r] = dflt.id; continue; }
    }
    out = ensureDefined(ds, out, r, false);
  }
  out = putStyle(out, idOf(b.xml), builtinXml(b.xml, { used, refs }));
  if (b.twin && !readStyleIndex(out).styles.some((s) => s.id === idOf(b.twin!))) out = putStyle(out, idOf(b.twin), builtinXml(b.twin, { used, refs }));
  return out;
}

/** Opções de "Criar estilo". */
export interface CreateStyleOptions {
  name: string;
  /** padrão: 'linked' (como o Word cria pela interface) */
  type?: StyleKind;
  basedOn?: string;
  next?: string;
  /** na galeria (padrão true, como a caixa "Adicionar à galeria de Estilos") */
  quick?: boolean;
  /** "Atualizar automaticamente" (w:autoRedefine) */
  autoUpdate?: boolean;
  /** formatação própria do estilo (além do basedOn) */
  format?: StyleFormat;
}

/** Cria o estilo (e o par Char, se vinculado); devolve o XML e o id. */
export function createStyleXml(ds: DocStyles, xml: string, o: CreateStyleOptions): { xml: string; id: string } {
  const type = o.type ?? 'linked';
  const taken = new Set(readStyleIndex(xml).styles.map((s) => s.id));
  const id = styleIdFromName(o.name, taken);
  taken.add(id);
  const f = o.format ?? {};
  const rPr = hasRunChanges(f) ? patchStyleRPr(undefined, f) : '';
  const pPr = type !== 'character' && hasParaChanges(f) ? patchStylePPr(undefined, f) : '';
  let out = xml;
  if (type === 'character') {
    const base = o.basedOn ?? ds.defaultCharacter();
    out = ensureDefined(ds, out, base, false);
    out = putStyle(out, id, newStyleXml({ type: 'character', custom: true, id, name: o.name, basedOn: base, qFormat: o.quick ?? true, rPr }));
    return { xml: out, id };
  }
  const base = o.basedOn ?? ds.defaultParagraph();
  out = ensureDefined(ds, out, base, false);
  const twinId = type === 'linked' ? styleIdFromName(`${id}Char`, taken) : undefined;
  out = putStyle(out, id, newStyleXml({
    type: 'paragraph', custom: true, id, name: o.name, basedOn: base, next: o.next && o.next !== id ? o.next : undefined,
    link: twinId, autoRedefine: o.autoUpdate, qFormat: o.quick ?? true, pPr, rPr,
  }));
  if (twinId) {
    const baseTwin = readStyleIndex(out).styles.find((s) => s.id === base)?.link;
    out = putStyle(out, twinId, newStyleXml({
      type: 'character', custom: true, id: twinId, name: `${o.name} Char`, basedOn: baseTwin ?? defaultCharOf(out), link: id, rPr,
    }));
  }
  return { xml: out, id };
}
const defaultCharOf = (xml: string): string =>
  readStyleIndex(xml).styles.find((s) => s.type === 'character' && s.isDefault)?.id ?? 'Fontepargpadro';

/** Opções de "Modificar estilo". undefined = não mexe. */
export interface ModifyStyleOptions {
  name?: string;
  basedOn?: string;
  /** null = próximo é ele mesmo */
  next?: string | null;
  quick?: boolean;
  autoUpdate?: boolean;
  format?: StyleFormat;
}

/** Modifica o estilo (e o par Char); devolve o XML e o mapa de ids renomeados. */
export function modifyStyleXml(ds: DocStyles, xml: string, id: string, o: ModifyStyleOptions): { xml: string; renamed: Record<string, string> } {
  let out = ensureDefined(ds, xml, id, false);
  const meta = readStyleIndex(out).styles.find((s) => s.id === id);
  if (!meta) return { xml, renamed: {} };
  let raw = styleRaw(out, id)!;
  const f = o.format ?? {};
  const head: Parameters<typeof patchStyleXml>[1] = {};
  if (o.basedOn !== undefined && o.basedOn !== meta.basedOn && o.basedOn !== id) {
    out = ensureDefined(ds, out, o.basedOn, false);
    head.basedOn = o.basedOn;
  }
  if (o.next !== undefined) head.next = o.next === null || o.next === id ? null : o.next;
  if (o.autoUpdate !== undefined) head.autoRedefine = o.autoUpdate;
  if (o.quick !== undefined) head.qFormat = o.quick;
  if (hasRunChanges(f)) head.rPr = patchStyleRPr(styleKid(raw, 'w:rPr'), f);
  if (meta.type === 'paragraph' && hasParaChanges(f)) head.pPr = patchStylePPr(styleKid(raw, 'w:pPr'), f);
  raw = patchStyleXml(styleRaw(out, id)!, head);
  out = putStyle(out, id, raw);
  if (o.quick !== undefined && !meta.custom) out = setLatentQFormat(out, meta.name, o.quick);
  // par Char do vinculado: o mesmo rPr (o Word atualiza os dois)
  const twin = meta.link ? readStyleIndex(out).styles.find((s) => s.id === meta.link && s.type === 'character') : undefined;
  if (twin) {
    const th: Parameters<typeof patchStyleXml>[1] = {};
    if (head.rPr !== undefined) th.rPr = head.rPr;
    if (head.basedOn) th.basedOn = readStyleIndex(out).styles.find((s) => s.id === head.basedOn)?.link ?? defaultCharOf(out);
    if (Object.keys(th).length) out = putStyle(out, twin.id, patchStyleXml(styleRaw(out, twin.id)!, th));
  }
  let renamed: Record<string, string> = {};
  if (o.name !== undefined && o.name.trim() && o.name !== displayName(meta, 'pt') && o.name !== displayName(meta, 'en') && o.name !== meta.name) {
    const r = renameStyleXml(ds, out, id, o.name.trim());
    out = r.xml;
    renamed = r.renamed;
  }
  return { xml: out, renamed };
}

/** Renomeia: personalizado troca nome E id (o documento segue); built-in ganha w:aliases. */
export function renameStyleXml(ds: DocStyles, xml: string, id: string, name: string): { xml: string; renamed: Record<string, string> } {
  let out = ensureDefined(ds, xml, id, false);
  const idx = readStyleIndex(out);
  const meta = idx.styles.find((s) => s.id === id);
  if (!meta || !name) return { xml, renamed: {} };
  const twin = meta.link ? idx.styles.find((s) => s.id === meta.link && s.type === 'character' && s.custom) : undefined;
  if (!meta.custom) {
    out = putStyle(out, id, patchStyleXml(styleRaw(out, id)!, { aliases: name }));
    if (twin) out = putStyle(out, twin.id, patchStyleXml(styleRaw(out, twin.id)!, { aliases: `${name} Char` }));
    return { xml: out, renamed: {} };
  }
  if (idx.styles.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) throw new Error(`style name in use: ${name}`);
  const taken = new Set(idx.styles.filter((s) => s.id !== id && s.id !== twin?.id).map((s) => s.id));
  const newId = styleIdFromName(name, taken);
  taken.add(newId);
  const renamed: Record<string, string> = {};
  if (newId !== id) renamed[id] = newId;
  const newTwin = twin ? styleIdFromName(`${newId}Char`, taken) : undefined;
  if (twin && newTwin !== twin.id) renamed[twin.id] = newTwin!;
  out = putStyle(out, id, patchStyleXml(styleRaw(out, id)!, { styleId: newId, name, ...(twin ? { link: newTwin } : {}) }));
  if (twin) out = putStyle(out, twin.id, patchStyleXml(styleRaw(out, twin.id)!, { styleId: newTwin, name: `${name} Char`, link: newId }));
  return { xml: retarget(out, renamed), renamed };
}

/** Troca referências basedOn/next/link para os ids renomeados. */
function retarget(xml: string, renamed: Record<string, string>): string {
  if (!Object.keys(renamed).length) return xml;
  return xml.replace(/(<w:(?:basedOn|next|link) w:val=")([^"]*)("\/>)/g, (m, a: string, v: string, b: string) => (renamed[v] ? a + renamed[v] + b : m));
}

/** Exclui um estilo PERSONALIZADO (e o par). Quem se baseava nele passa ao base
 *  dele; o "próximo" que apontava para ele sai. Built-in não se exclui (Word). */
export function deleteStyleXml(xml: string, id: string): { xml: string; removed: string[] } | null {
  const idx = readStyleIndex(xml);
  const meta = idx.styles.find((s) => s.id === id);
  if (!meta || !meta.custom || meta.isDefault) return null;
  const twin = meta.link ? idx.styles.find((s) => s.id === meta.link && s.custom) : undefined;
  const removed = [id, ...(twin ? [twin.id] : [])];
  let out = xml;
  for (const r of removed) out = dropStyle(out, r);
  const gone = new Set(removed);
  out = out.replace(/<w:basedOn w:val="([^"]*)"\/>/g, (m, v: string) =>
    gone.has(v) ? (v === id && meta.basedOn ? `<w:basedOn w:val="${meta.basedOn}"/>` : v === twin?.id && twin.basedOn ? `<w:basedOn w:val="${twin.basedOn}"/>` : '') : m);
  out = out.replace(/<w:(?:next|link) w:val="([^"]*)"\/>/g, (m, v: string) => (gone.has(v) ? '' : m));
  return { xml: out, removed };
}

/** Mostra/tira da galeria (latente só muda o lsdException). */
export function setQuickXml(ds: DocStyles, xml: string, id: string, on: boolean): string {
  const meta = readStyleIndex(xml).styles.find((s) => s.id === id);
  if (!meta) {
    const b = builtinStyles().find((x) => idOf(x.xml) === id);
    if (!b) return xml;
    if (!on) return setLatentQFormat(xml, b.name, false);
    const out = ensureDefined(ds, xml, id, false);
    return out === xml ? xml : setQuickXml(ds, out, id, true);
  }
  let out = putStyle(xml, id, patchStyleXml(styleRaw(xml, id)!, { qFormat: on }));
  if (!meta.custom) out = setLatentQFormat(out, meta.name, on);
  return out;
}

export { builtinStyle };

/** Caminho da parte de estilos pelo relacionamento do document.xml. */
export function stylesPartPath(pkg: { getPartText(p: string): string | undefined }): string {
  const rels = pkg.getPartText('word/_rels/document.xml.rels') ?? '';
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (!/Type="[^"]*\/styles"/.test(tag) || /TargetMode="External"/.test(tag)) continue;
    const t = tag.match(/Target="([^"]*)"/)?.[1];
    if (t) return t.startsWith('/') ? t.slice(1) : `word/${t.replace(/^\.\//, '')}`;
  }
  return 'word/styles.xml';
}

/** Grava o styles.xml no pacote (com relacionamento e tipo de conteúdo se a parte é nova). */
export function writeStylesPart(pkg: { getPartText(p: string): string | undefined; setPartText(p: string, t: string): void }, xml: string): void {
  const path = stylesPartPath(pkg);
  const existed = pkg.getPartText(path) !== undefined;
  pkg.setPartText(path, xml);
  if (existed) return;
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = pkg.getPartText(relsPath)
    ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!/Type="[^"]*\/styles"/.test(rels)) {
    const ids = new Set([...rels.matchAll(/Id="([^"]*)"/g)].map((m) => m[1]));
    let n = 1;
    while (ids.has(`rId${n}`)) n++;
    rels = rels.replace('</Relationships>', `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    pkg.setPartText(relsPath, rels);
  }
  const ct = pkg.getPartText('[Content_Types].xml');
  if (ct && !ct.includes('/word/styles.xml')) {
    pkg.setPartText('[Content_Types].xml', ct.replace('</Types>',
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'));
  }
}
