import type { DocxPackage } from '../package.js';
import { parseXml, childElements, firstChild, type XmlElement } from '../xml.js';
import {
  readPPr, readRPr, readTblPr, readTrPr, readTcPr, onOffVal, measureTwips,
  type PPr, type RPr, type TblPr, type TrPr, type TcPr,
} from './props.js';

/**
 * Partes de documento que definem a FORMATAÇÃO (não o conteúdo): estilos,
 * numeração, tema, configurações e tabela de fontes. Lidas cruas (sem
 * resolver herança) — a cascata é feita pelo motor de layout.
 * Tudo em objetos JSON puros (Record, não Map) para portar 1:1 ao .NET.
 */

// ───────────────────────── estilos ─────────────────────────

export type TblStyleType =
  | 'wholeTable' | 'firstRow' | 'lastRow' | 'firstCol' | 'lastCol'
  | 'band1Vert' | 'band2Vert' | 'band1Horz' | 'band2Horz'
  | 'neCell' | 'nwCell' | 'seCell' | 'swCell';

export interface TblStylePart {
  pPr?: PPr;
  rPr?: RPr;
  tblPr?: TblPr;
  trPr?: TrPr;
  tcPr?: TcPr;
}

export interface StyleDef {
  styleId: string;
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  name?: string;
  basedOn?: string;
  next?: string;
  link?: string;
  isDefault?: boolean;
  pPr?: PPr;
  rPr?: RPr;
  tblPr?: TblPr;
  trPr?: TrPr;
  tcPr?: TcPr;
  tblStylePr?: Partial<Record<TblStyleType, TblStylePart>>;
}

export interface StyleSheet {
  docDefaults: { rPr?: RPr; pPr?: PPr };
  styles: Record<string, StyleDef>;
  /** styleId do estilo padrão de cada tipo (w:default="1"). */
  defaults: { paragraph?: string; character?: string; table?: string; numbering?: string };
}

export function readStyleSheet(xml: string | undefined): StyleSheet {
  const sheet: StyleSheet = { docDefaults: {}, styles: {}, defaults: {} };
  if (!xml) return sheet;
  const root = parseXml(xml);
  const dd = firstChild(root, 'w:docDefaults');
  if (dd) {
    const rPr = readRPr(firstChild(firstChild(dd, 'w:rPrDefault') ?? dd, 'w:rPr'));
    const pPr = readPPr(firstChild(firstChild(dd, 'w:pPrDefault') ?? dd, 'w:pPr'));
    if (rPr) sheet.docDefaults.rPr = rPr;
    if (pPr) sheet.docDefaults.pPr = pPr;
  }
  for (const st of childElements(root, 'w:style')) {
    const id = st.attrs['w:styleId'];
    const type = st.attrs['w:type'] ?? 'paragraph';
    if (!id || (type !== 'paragraph' && type !== 'character' && type !== 'table' && type !== 'numbering')) continue;
    const def: StyleDef = { styleId: id, type };
    const val = (n: string) => firstChild(st, n)?.attrs['w:val'];
    const name = val('w:name');
    if (name !== undefined) def.name = name;
    const basedOn = val('w:basedOn');
    if (basedOn) def.basedOn = basedOn;
    const next = val('w:next');
    if (next) def.next = next;
    const link = val('w:link');
    if (link) def.link = link;
    const d = st.attrs['w:default'];
    if (d === '1' || d === 'true' || d === 'on') {
      def.isDefault = true;
      sheet.defaults[type] ??= id;
    }
    const pPr = readPPr(firstChild(st, 'w:pPr'));
    if (pPr) def.pPr = pPr;
    const rPr = readRPr(firstChild(st, 'w:rPr'));
    if (rPr) def.rPr = rPr;
    const tblPr = readTblPr(firstChild(st, 'w:tblPr'));
    if (tblPr) def.tblPr = tblPr;
    const trPr = readTrPr(firstChild(st, 'w:trPr'));
    if (trPr) def.trPr = trPr;
    const tcPr = readTcPr(firstChild(st, 'w:tcPr'));
    if (tcPr) def.tcPr = tcPr;
    for (const tsp of childElements(st, 'w:tblStylePr')) {
      const t = tsp.attrs['w:type'] as TblStyleType | undefined;
      if (!t) continue;
      const part: TblStylePart = {};
      const a = readPPr(firstChild(tsp, 'w:pPr'));
      if (a) part.pPr = a;
      const b = readRPr(firstChild(tsp, 'w:rPr'));
      if (b) part.rPr = b;
      const c = readTblPr(firstChild(tsp, 'w:tblPr'));
      if (c) part.tblPr = c;
      const e = readTrPr(firstChild(tsp, 'w:trPr'));
      if (e) part.trPr = e;
      const f = readTcPr(firstChild(tsp, 'w:tcPr'));
      if (f) part.tcPr = f;
      (def.tblStylePr ??= {})[t] = part;
    }
    // primeira definição vence (o Word ignora duplicatas posteriores)
    if (!sheet.styles[id]) sheet.styles[id] = def;
  }
  return sheet;
}

// ───────────────────────── numeração ─────────────────────────

export interface NumLevel {
  ilvl: number;
  start?: number;
  numFmt?: string;
  /** w:numFmt w:format (formato customizado, ex.: "001, 002"). */
  numFmtCustom?: string;
  lvlRestart?: number;
  pStyle?: string;
  isLgl?: boolean;
  suff?: 'tab' | 'space' | 'nothing';
  lvlText?: string;
  /** w:lvlText w:null="1" — sem texto. */
  lvlTextNull?: boolean;
  lvlPicBulletId?: number;
  lvlJc?: string;
  pPr?: PPr;
  rPr?: RPr;
}

export interface AbstractNum {
  abstractNumId: number;
  multiLevelType?: string;
  styleLink?: string;
  numStyleLink?: string;
  levels: Record<number, NumLevel>;
}

export interface NumInstance {
  numId: number;
  abstractNumId: number;
  overrides: Record<number, { startOverride?: number; lvl?: NumLevel }>;
}

export interface PicBullet {
  id: number;
  /** r:id da imagem (v:imagedata / a:blip) na parte de numeração. */
  rid?: string;
  widthPt?: number;
  heightPt?: number;
}

export interface Numbering {
  abstractNums: Record<number, AbstractNum>;
  nums: Record<number, NumInstance>;
  picBullets: Record<number, PicBullet>;
}

function readLevel(el: XmlElement): NumLevel {
  const ilvl = parseInt(el.attrs['w:ilvl'] ?? '0', 10) || 0;
  const lvl: NumLevel = { ilvl };
  const v = (n: string) => firstChild(el, n)?.attrs['w:val'];
  const start = v('w:start');
  if (start !== undefined) lvl.start = parseInt(start, 10);
  const fmtEl = firstChild(el, 'w:numFmt');
  if (fmtEl?.attrs['w:val']) lvl.numFmt = fmtEl.attrs['w:val'];
  if (fmtEl?.attrs['w:format']) lvl.numFmtCustom = fmtEl.attrs['w:format'];
  const restart = v('w:lvlRestart');
  if (restart !== undefined) lvl.lvlRestart = parseInt(restart, 10);
  const ps = v('w:pStyle');
  if (ps) lvl.pStyle = ps;
  const isLgl = firstChild(el, 'w:isLgl');
  if (isLgl) lvl.isLgl = onOffVal(isLgl);
  const suff = v('w:suff');
  if (suff === 'tab' || suff === 'space' || suff === 'nothing') lvl.suff = suff;
  const lt = firstChild(el, 'w:lvlText');
  if (lt) {
    if (lt.attrs['w:val'] !== undefined) lvl.lvlText = lt.attrs['w:val'];
    if (lt.attrs['w:null'] === '1' || lt.attrs['w:null'] === 'true') lvl.lvlTextNull = true;
  }
  const pic = v('w:lvlPicBulletId');
  if (pic !== undefined) lvl.lvlPicBulletId = parseInt(pic, 10);
  const jc = v('w:lvlJc');
  if (jc) lvl.lvlJc = jc;
  const pPr = readPPr(firstChild(el, 'w:pPr'));
  if (pPr) lvl.pPr = pPr;
  const rPr = readRPr(firstChild(el, 'w:rPr'));
  if (rPr) lvl.rPr = rPr;
  return lvl;
}

export function readNumbering(xml: string | undefined): Numbering {
  const out: Numbering = { abstractNums: {}, nums: {}, picBullets: {} };
  if (!xml) return out;
  const root = parseXml(xml);
  for (const pb of childElements(root, 'w:numPicBullet')) {
    const id = parseInt(pb.attrs['w:numPicBulletId'] ?? '-1', 10);
    const bullet: PicBullet = { id };
    const find = (e: XmlElement, name: string): XmlElement | undefined => {
      for (const c of childElements(e)) {
        if (c.name === name) return c;
        const f = find(c, name);
        if (f) return f;
      }
      return undefined;
    };
    const img = find(pb, 'v:imagedata');
    const blip = find(pb, 'a:blip');
    const rid = img?.attrs['r:id'] ?? blip?.attrs['r:embed'];
    if (rid) bullet.rid = rid;
    const shape = find(pb, 'v:shape');
    const style = shape?.attrs['style'] ?? '';
    const w = /width:\s*([0-9.]+)pt/.exec(style);
    const h = /height:\s*([0-9.]+)pt/.exec(style);
    if (w) bullet.widthPt = parseFloat(w[1]!);
    if (h) bullet.heightPt = parseFloat(h[1]!);
    out.picBullets[id] = bullet;
  }
  for (const an of childElements(root, 'w:abstractNum')) {
    const id = parseInt(an.attrs['w:abstractNumId'] ?? '-1', 10);
    const a: AbstractNum = { abstractNumId: id, levels: {} };
    const mlt = firstChild(an, 'w:multiLevelType')?.attrs['w:val'];
    if (mlt) a.multiLevelType = mlt;
    const sl = firstChild(an, 'w:styleLink')?.attrs['w:val'];
    if (sl) a.styleLink = sl;
    const nsl = firstChild(an, 'w:numStyleLink')?.attrs['w:val'];
    if (nsl) a.numStyleLink = nsl;
    for (const lvl of childElements(an, 'w:lvl')) {
      const l = readLevel(lvl);
      a.levels[l.ilvl] = l;
    }
    out.abstractNums[id] = a;
  }
  for (const num of childElements(root, 'w:num')) {
    const numId = parseInt(num.attrs['w:numId'] ?? '-1', 10);
    const abs = parseInt(firstChild(num, 'w:abstractNumId')?.attrs['w:val'] ?? '-1', 10);
    const inst: NumInstance = { numId, abstractNumId: abs, overrides: {} };
    for (const ov of childElements(num, 'w:lvlOverride')) {
      const ilvl = parseInt(ov.attrs['w:ilvl'] ?? '0', 10) || 0;
      const o: { startOverride?: number; lvl?: NumLevel } = {};
      const so = firstChild(ov, 'w:startOverride')?.attrs['w:val'];
      if (so !== undefined) o.startOverride = parseInt(so, 10);
      const lvl = firstChild(ov, 'w:lvl');
      if (lvl) o.lvl = readLevel(lvl);
      inst.overrides[ilvl] = o;
    }
    out.nums[numId] = inst;
  }
  return out;
}

// ───────────────────────── tema ─────────────────────────

export interface ThemeFontSet {
  latin?: string;
  ea?: string;
  cs?: string;
  /** a:font script="…" (Jpan, Hang, Arab…) */
  scripts: Record<string, string>;
}

export interface Theme {
  major: ThemeFontSet;
  minor: ThemeFontSet;
  /** dk1, lt1, dk2, lt2, accent1..6, hlink, folHlink → RRGGBB */
  colors: Record<string, string>;
  /** espessuras (pt) das linhas do a:lnStyleLst — lnRef idx 1..3 */
  lineWidthsPt?: number[];
}

export function readTheme(xml: string | undefined): Theme {
  const theme: Theme = { major: { scripts: {} }, minor: { scripts: {} }, colors: {} };
  if (!xml) return theme;
  const root = parseXml(xml);
  const find = (e: XmlElement, name: string): XmlElement | undefined => {
    for (const c of childElements(e)) {
      if (c.name === name) return c;
      const f = find(c, name);
      if (f) return f;
    }
    return undefined;
  };
  const fontScheme = find(root, 'a:fontScheme');
  for (const [key, tag] of [['major', 'a:majorFont'], ['minor', 'a:minorFont']] as const) {
    const el = fontScheme && firstChild(fontScheme, tag);
    if (!el) continue;
    const set = theme[key];
    const latin = firstChild(el, 'a:latin')?.attrs['typeface'];
    if (latin) set.latin = latin;
    const ea = firstChild(el, 'a:ea')?.attrs['typeface'];
    if (ea) set.ea = ea;
    const cs = firstChild(el, 'a:cs')?.attrs['typeface'];
    if (cs) set.cs = cs;
    for (const f of childElements(el, 'a:font')) {
      if (f.attrs['script'] && f.attrs['typeface']) set.scripts[f.attrs['script']] = f.attrs['typeface'];
    }
  }
  const lnList = find(root, 'a:lnStyleLst');
  if (lnList) theme.lineWidthsPt = childElements(lnList, 'a:ln').map((l) => (parseInt(l.attrs['w'] ?? '0', 10) || 0) / 12700);
  const clr = find(root, 'a:clrScheme');
  if (clr) {
    for (const c of childElements(clr)) {
      const key = c.name.replace(/^a:/, '');
      const srgb = firstChild(c, 'a:srgbClr')?.attrs['val'];
      const sys = firstChild(c, 'a:sysClr');
      const v = srgb ?? sys?.attrs['lastClr'] ?? (sys?.attrs['val'] === 'window' ? 'FFFFFF' : sys?.attrs['val'] === 'windowText' ? '000000' : undefined);
      if (v) theme.colors[key] = v.toUpperCase();
    }
  }
  return theme;
}

// ───────────────────────── configurações ─────────────────────────

export interface Settings {
  /** twips (padrão do Word: 720; templates pt-BR costumam ter 708). */
  defaultTabStop: number;
  /** w:compatSetting compatibilityMode (11 = Word 2003, 12 = 2007, 14 = 2010, 15 = 2013+). */
  compatibilityMode: number;
  /** flags de w:compat (doNotExpandShiftReturn, …) presentes = true. */
  compat: Record<string, boolean>;
  evenAndOddHeaders: boolean;
  mirrorMargins: boolean;
  autoHyphenation: boolean;
  doNotHyphenateCaps: boolean;
  hyphenationZone?: number;
  consecutiveHyphenLimit?: number;
  /** w:characterSpacingControl (doNotCompress | compressPunctuation | …). */
  characterSpacingControl?: string;
  /** w:themeFontLang (val, eastAsia, bidi). */
  themeFontLang?: { val?: string; eastAsia?: string; bidi?: string };
  displayBackgroundShape: boolean;
  /** w:updateFields */
  updateFields: boolean;
  /** bordas de página (offsetFrom text) NÃO contornam o cabeçalho/rodapé */
  bordersDoNotSurroundHeader?: boolean;
  bordersDoNotSurroundFooter?: boolean;
}

const ROOT_COMPAT_FLAGS = new Set([
  'w:doNotUseHTMLParagraphAutoSpacing', 'w:doNotExpandShiftReturn', 'w:ulTrailSpace', 'w:spaceForUL',
  'w:balanceSingleByteDoubleByteWidth', 'w:adjustLineHeightInTable', 'w:doNotSuppressParagraphBorders',
  'w:noSpaceRaiseLower', 'w:suppressSpBfAfterPgBrk', 'w:suppressTopSpacing', 'w:doNotUseIndentAsNumberingTabStop',
]);

export function readSettings(xml: string | undefined): Settings {
  const s: Settings = {
    defaultTabStop: 720,
    compatibilityMode: xml ? 12 : 15,
    compat: {},
    evenAndOddHeaders: false,
    mirrorMargins: false,
    autoHyphenation: false,
    doNotHyphenateCaps: false,
    displayBackgroundShape: false,
    updateFields: false,
  };
  if (!xml) return s;
  const root = parseXml(xml);
  const on = (n: string) => { const e = firstChild(root, n); return e ? onOffVal(e) : false; };
  const dts = measureTwips(firstChild(root, 'w:defaultTabStop')?.attrs['w:val']);
  if (dts !== undefined && dts > 0) s.defaultTabStop = dts;
  s.evenAndOddHeaders = on('w:evenAndOddHeaders');
  s.mirrorMargins = on('w:mirrorMargins');
  s.autoHyphenation = on('w:autoHyphenation');
  s.doNotHyphenateCaps = on('w:doNotHyphenateCaps');
  s.displayBackgroundShape = on('w:displayBackgroundShape');
  s.updateFields = on('w:updateFields');
  if (on('w:bordersDoNotSurroundHeader')) s.bordersDoNotSurroundHeader = true;
  if (on('w:bordersDoNotSurroundFooter')) s.bordersDoNotSurroundFooter = true;
  const hz = measureTwips(firstChild(root, 'w:hyphenationZone')?.attrs['w:val']);
  if (hz !== undefined) s.hyphenationZone = hz;
  const chl = firstChild(root, 'w:consecutiveHyphenLimit')?.attrs['w:val'];
  if (chl !== undefined) s.consecutiveHyphenLimit = parseInt(chl, 10);
  const csc = firstChild(root, 'w:characterSpacingControl')?.attrs['w:val'];
  if (csc) s.characterSpacingControl = csc;
  const tfl = firstChild(root, 'w:themeFontLang');
  if (tfl) {
    s.themeFontLang = {};
    if (tfl.attrs['w:val']) s.themeFontLang.val = tfl.attrs['w:val'];
    if (tfl.attrs['w:eastAsia']) s.themeFontLang.eastAsia = tfl.attrs['w:eastAsia'];
    if (tfl.attrs['w:bidi']) s.themeFontLang.bidi = tfl.attrs['w:bidi'];
  }
  // flags de compatibilidade soltas na raiz de w:settings: o Word as respeita
  // (medido: doNotUseHTMLParagraphAutoSpacing fora de w:compat vale)
  for (const c of childElements(root)) {
    if (ROOT_COMPAT_FLAGS.has(c.name)) s.compat[c.name.replace(/^w:/, '')] = onOffVal(c);
  }
  const compat = firstChild(root, 'w:compat');
  if (compat) {
    // sem compatSetting: documento de versão antiga (o Word trata como modo 12)
    for (const c of childElements(compat)) {
      if (c.name === 'w:compatSetting') {
        if (c.attrs['w:name'] === 'compatibilityMode' && c.attrs['w:uri'] === 'http://schemas.microsoft.com/office/word') {
          const n = parseInt(c.attrs['w:val'] ?? '', 10);
          if (Number.isFinite(n)) s.compatibilityMode = n;
        }
        continue;
      }
      s.compat[c.name.replace(/^w:/, '')] = onOffVal(c);
    }
  }
  return s;
}

// ───────────────────────── tabela de fontes ─────────────────────────

export interface FontInfo {
  name: string;
  altName?: string;
  /** 10 bytes em hex. */
  panose1?: string;
  charset?: string;
  /** roman | swiss | modern | script | decorative | auto */
  family?: string;
  pitch?: string;
  /** usb0..3, csb0..1 */
  sig?: Record<string, string>;
}

export function readFontTable(xml: string | undefined): Record<string, FontInfo> {
  const out: Record<string, FontInfo> = {};
  if (!xml) return out;
  const root = parseXml(xml);
  for (const f of childElements(root, 'w:font')) {
    const name = f.attrs['w:name'];
    if (!name) continue;
    const info: FontInfo = { name };
    const v = (n: string) => firstChild(f, n)?.attrs['w:val'];
    const alt = v('w:altName');
    if (alt) info.altName = alt;
    const pan = v('w:panose1');
    if (pan) info.panose1 = pan;
    const cs = v('w:charset');
    if (cs) info.charset = cs;
    const fam = v('w:family');
    if (fam) info.family = fam;
    const pitch = v('w:pitch');
    if (pitch) info.pitch = pitch;
    const sig = firstChild(f, 'w:sig');
    if (sig) {
      info.sig = {};
      for (const [k, val] of Object.entries(sig.attrs)) info.sig[k.replace(/^w:/, '')] = val;
    }
    out[name] = info;
  }
  return out;
}

// ───────────────────────── agregado ─────────────────────────

/** Formatação do documento inteiro, para o motor de layout. */
export interface DocFormatting {
  styles: StyleSheet;
  numbering: Numbering;
  theme: Theme;
  settings: Settings;
  fontTable: Record<string, FontInfo>;
}

/** Caminho de uma parte pelo tipo de relacionamento do document.xml. */
function partByRelType(pkg: DocxPackage, type: string, fallback: string): string {
  const rels = pkg.getPartText('word/_rels/document.xml.rels');
  if (rels) {
    for (const rel of childElements(parseXml(rels), 'Relationship')) {
      if ((rel.attrs['Type'] ?? '').endsWith(`/${type}`) && rel.attrs['Target'] && rel.attrs['TargetMode'] !== 'External') {
        const t = rel.attrs['Target'].replace(/^\.\//, '');
        return t.startsWith('/') ? t.slice(1) : `word/${t}`;
      }
    }
  }
  return fallback;
}

export function readDocFormatting(pkg: DocxPackage): DocFormatting {
  return {
    styles: readStyleSheet(pkg.getPartText(partByRelType(pkg, 'styles', 'word/styles.xml'))),
    numbering: readNumbering(pkg.getPartText(partByRelType(pkg, 'numbering', 'word/numbering.xml'))),
    theme: readTheme(pkg.getPartText(partByRelType(pkg, 'theme', 'word/theme/theme1.xml'))),
    settings: readSettings(pkg.getPartText(partByRelType(pkg, 'settings', 'word/settings.xml'))),
    fontTable: readFontTable(pkg.getPartText(partByRelType(pkg, 'fontTable', 'word/fontTable.xml'))),
  };
}
