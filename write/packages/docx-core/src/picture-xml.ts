/**
 * Imagem (pic:pic dentro de um w:drawing) como o Word a grava: leitura tipada da
 * formatação e edição CIRÚRGICA do XML cru — só os elementos tocados mudam, o
 * resto sai byte a byte (salvamento sem perdas). Toda forma do XML novo segue o
 * que o Word grava, medido no oráculo (write/tools/image-lab, resultados em
 * results/*.xml):
 * - em linha → flutuante (Quebra Automática): wp:anchor distL/R 114300, distT/B 0,
 *   simplePos 0 (0,0), relativeHeight novo, locked 0, layoutInCell 1,
 *   allowOverlap 1; positionH column / positionV paragraph com o deslocamento
 *   ATUAL; wrapSquare/wrapTight(+polígono)/…; wp14:sizeRelH/V page 0 no fim;
 *   Comprimido e Através gravam behindDoc="1" (sic) e o retângulo 0..21300 ×
 *   0..21375 no polígono (edited 0);
 * - flutuante → em linha: wp:inline com dist 0, extent/effectExtent/docPr/
 *   cNvGraphicFramePr/graphic do anchor;
 * - texto alt: descr/title no wp:docPr E no pic:cNvPr (que ganha o name);
 *   decorativa: a:extLst {C183D7F6-…} com adec:decorative val=1 nos dois;
 * - contorno: a:ln w (EMU) + preenchimento + a:prstDash; o wp:effectExtent cresce
 *   a largura INTEIRA (a borda fica toda do lado de fora da imagem);
 * - giro: a:xfrm rot (60000 avos de grau) e flipH/flipV.
 */
import { childElements, firstChild, parseXml, textContent, type XmlElement } from './xml.js';
import { anchorChild } from './drawing.js';

export const EMU_PER_PT = 12700;
export const EMU_PER_TW = 635;

// ───────────────────────── edição cirúrgica ─────────────────────────

/** Trocas por posição no XML cru (parseXml com positions). Aplicadas do fim
 *  para o começo — as posições lidas continuam válidas até o apply(). */
export class XmlPatch {
  private edits: { s: number; e: number; text: string }[] = [];
  constructor(readonly src: string) {}
  /** fim da tag de abertura (posição logo depois do '>'). */
  static openEnd(el: XmlElement): number { return el.cs ?? el.e!; }
  replace(el: XmlElement, text: string): void { this.edits.push({ s: el.s!, e: el.e!, text }); }
  remove(el: XmlElement): void { this.replace(el, ''); }
  insertAt(at: number, text: string): void { this.edits.push({ s: at, e: at, text }); }
  /** troca a tag de abertura (atributos novos, valores escapados). */
  setAttrs(el: XmlElement, set: Record<string, string | number | undefined>): void {
    const end = XmlPatch.openEnd(el);
    const selfClose = el.cs === el.e;
    let tag = this.src.slice(el.s!, end);
    for (const [k, v] of Object.entries(set)) {
      const re = new RegExp(`\\s${k.replace(/[:.]/g, '\\$&')}="[^"]*"`);
      if (v === undefined) { tag = tag.replace(re, ''); continue; }
      const a = ` ${k}="${escAttr(String(v))}"`;
      if (re.test(tag)) tag = tag.replace(re, () => a);
      else tag = tag.replace(selfClose ? /\s*\/>$/ : />$/, (m) => `${a}${m.trim() === '/>' ? '/>' : '>'}`);
    }
    this.edits.push({ s: el.s!, e: end, text: tag });
  }
  /** conteúdo inteiro de um elemento (vira <x ...>conteúdo</x>). */
  setContent(el: XmlElement, inner: string): void {
    if (el.cs === el.e) {
      // auto-fechado: reescreve como abre/fecha
      const tag = this.src.slice(el.s!, el.e!).replace(/\s*\/>$/, '>');
      const name = /^<([^\s/>]+)/.exec(tag)![1];
      this.edits.push({ s: el.s!, e: el.e!, text: `${tag}${inner}</${name}>` });
    } else this.edits.push({ s: el.cs!, e: el.ce!, text: inner });
  }
  /** insere `xml` como filho de `parent` na posição da ordem do esquema. */
  insertChild(parent: XmlElement, name: string, xml: string, order: readonly string[]): void {
    const rank = order.indexOf(name);
    const kids = childElements(parent);
    const after = kids.filter((k) => order.indexOf(k.name) >= 0 && order.indexOf(k.name) <= rank).pop();
    if (after) { this.insertAt(after.e!, xml); return; }
    if (parent.cs === parent.e) { this.setContent(parent, xml); return; }
    this.insertAt(parent.cs!, xml);
  }
  /** troca (ou insere, ou remove com xml vazio) o filho `name` de `parent`. */
  putChild(parent: XmlElement, name: string, xml: string, order: readonly string[]): void {
    const cur = firstChild(parent, name);
    if (cur) { this.replace(cur, xml); return; }
    if (xml) this.insertChild(parent, name, xml, order);
  }
  apply(): string {
    const ed = [...this.edits].sort((a, b) => b.s - a.s || b.e - a.e);
    let out = this.src;
    for (const x of ed) out = out.slice(0, x.s) + x.text + out.slice(x.e);
    return out;
  }
}

export function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Ordens do esquema (CT_Anchor, CT_Inline, CT_ShapeProperties, …). */
export const ANCHOR_ORDER = ['wp:simplePos', 'wp:positionH', 'wp:positionV', 'wp:extent', 'wp:effectExtent', 'wp:wrapNone', 'wp:wrapSquare', 'wp:wrapTight', 'wp:wrapThrough', 'wp:wrapTopAndBottom', 'wp:docPr', 'wp:cNvGraphicFramePr', 'a:graphic', 'wp14:sizeRelH', 'wp14:sizeRelV'] as const;
const INLINE_ORDER = ['wp:extent', 'wp:effectExtent', 'wp:docPr', 'wp:cNvGraphicFramePr', 'a:graphic'] as const;
export const SPPR_ORDER = ['a:xfrm', 'a:custGeom', 'a:prstGeom', 'a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:grpFill', 'a:ln', 'a:effectLst', 'a:effectDag', 'a:scene3d', 'a:sp3d', 'a:extLst'] as const;
const EFFECT_ORDER = ['a:blur', 'a:fillOverlay', 'a:glow', 'a:innerShdw', 'a:outerShdw', 'a:prstShdw', 'a:reflection', 'a:softEdge'] as const;
const BLIPFILL_ORDER = ['a:blip', 'a:srcRect', 'a:tile', 'a:stretch'] as const;
const WRAP_NAMES = ['wp:wrapNone', 'wp:wrapSquare', 'wp:wrapTight', 'wp:wrapThrough', 'wp:wrapTopAndBottom'];
/** filhos do a:blip na ordem em que o Word os grava (medido) — os efeitos de cor
 *  antes do a:extLst */
const BLIP_ORDER = ['a:alphaBiLevel', 'a:alphaCeiling', 'a:alphaFloor', 'a:alphaInv', 'a:alphaMod', 'a:alphaRepl', 'a:clrChange', 'a:clrRepl', 'a:duotone', 'a:grayscl', 'a:biLevel', 'a:blur', 'a:fillOverlay', 'a:hsl', 'a:tint', 'a:lum', 'a:alphaModFix', 'a:extLst'] as const;

// ───────────────────────── cores ─────────────────────────

export interface DmlColor {
  kind: 'srgbClr' | 'schemeClr' | 'prstClr' | 'sysClr';
  val: string;
  /** sysClr: última cor */
  lastClr?: string;
  /** modificadores na ordem do arquivo (alpha incluso): [nome sem prefixo, val] */
  mods?: [string, number][];
}

const COLOR_NAMES = ['a:srgbClr', 'a:schemeClr', 'a:prstClr', 'a:sysClr', 'a:scrgbClr', 'a:hslClr'];

export function readDmlColor(parent: XmlElement | undefined): DmlColor | undefined {
  if (!parent) return undefined;
  const c = childElements(parent).find((k) => COLOR_NAMES.includes(k.name));
  if (!c) return undefined;
  const kind = c.name.slice(2) as DmlColor['kind'];
  if (kind !== 'srgbClr' && kind !== 'schemeClr' && kind !== 'prstClr' && kind !== 'sysClr') return { kind: 'srgbClr', val: '000000' };
  const out: DmlColor = { kind, val: c.attrs['val'] ?? '000000' };
  if (c.attrs['lastClr']) out.lastClr = c.attrs['lastClr'];
  const mods = childElements(c).map((m): [string, number] => [m.name.slice(2), parseInt(m.attrs['val'] ?? '0', 10) || 0]);
  if (mods.length) out.mods = mods;
  return out;
}

export function dmlColorXml(c: DmlColor): string {
  const attrs = ` val="${escAttr(c.val)}"${c.lastClr ? ` lastClr="${c.lastClr}"` : ''}`;
  const mods = (c.mods ?? []).map(([n, v]) => (n === 'gray' || n === 'comp' || n === 'inv' || n === 'gamma' || n === 'invGamma' ? `<a:${n}/>` : `<a:${n} val="${v}"/>`)).join('');
  return mods ? `<a:${c.kind}${attrs}>${mods}</a:${c.kind}>` : `<a:${c.kind}${attrs}/>`;
}

const PRST_RGB: Record<string, string> = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080' };
const SCHEME_ALIAS: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };

/** Cor no formato do motor de layout ("RRGGBB|mod=v,…" ou "@accent1|…") + alfa 0..1. */
export function dmlColorSpec(c: DmlColor): { spec: string; alpha: number } {
  let head = c.kind === 'srgbClr' ? c.val.toUpperCase()
    : c.kind === 'schemeClr' ? `@${SCHEME_ALIAS[c.val] ?? c.val}`
      : c.kind === 'prstClr' ? PRST_RGB[c.val] ?? '000000'
        : c.lastClr ?? (c.val === 'window' ? 'FFFFFF' : '000000');
  let alpha = 1;
  const mods: string[] = [];
  for (const [n, v] of c.mods ?? []) {
    if (n === 'alpha') alpha = v / 100000;
    else mods.push(`${n}=${v}`);
  }
  if (mods.length) head += `|${mods.join(',')}`;
  return { spec: head, alpha };
}

// ───────────────────────── tipos da formatação ─────────────────────────

export interface PicLine {
  /** espessura em EMU (ausente = 9525, a padrão do DrawingML) */
  w?: number;
  cap?: 'rnd' | 'sq' | 'flat';
  cmpd?: 'sng' | 'dbl' | 'thickThin' | 'thinThick' | 'tri';
  algn?: 'ctr' | 'in';
  /** preenchimento: cor, null = a:noFill; undefined = sem preenchimento declarado */
  fill?: DmlColor | null;
  /** gradiente/padrão do contorno: XML cru preservado */
  fillRaw?: string;
  dash?: string;
  join?: 'round' | 'bevel' | 'miter';
  miterLim?: number;
  /** a:headEnd/a:tailEnd e extLst crus (preservados) */
  tailRaw?: string;
}

export interface PicShadow {
  kind: 'outer' | 'inner' | 'prst';
  blurRad?: number;
  dist?: number;
  /** direção em 60000 avos de grau */
  dir?: number;
  sx?: number; sy?: number; kx?: number; ky?: number;
  algn?: string;
  rotWithShape?: boolean;
  /** prstShdw: shdw1…shdw20 */
  prst?: string;
  color: DmlColor;
}

export interface PicReflection {
  blurRad?: number; stA?: number; stPos?: number; endA?: number; endPos?: number;
  dist?: number; dir?: number; fadeDir?: number;
  sx?: number; sy?: number; kx?: number; ky?: number;
  algn?: string; rotWithShape?: boolean;
}

export interface PicEffects {
  shadow?: PicShadow;
  reflection?: PicReflection;
  glow?: { rad: number; color: DmlColor };
  softEdge?: number;
  /** a:blur / a:fillOverlay (preservados crus) */
  otherRaw?: string[];
}

export interface Pic3D {
  camera?: { prst: string; fov?: number; zoom?: number; rot?: { lat: number; lon: number; rev: number } };
  lightRig?: { rig: string; dir: string; rot?: { lat: number; lon: number; rev: number } };
  bevelT?: { w?: number; h?: number; prst?: string };
  bevelB?: { w?: number; h?: number; prst?: string };
  extrusionH?: number;
  contourW?: number;
  z?: number;
  prstMaterial?: string;
  extrusionClr?: DmlColor;
  contourClr?: DmlColor;
}

/** Ajustes da imagem gravados no a:blip. */
export interface PicBlipFx {
  /** opacidade (a:alphaModFix amt, 0..100000) */
  alphaModFix?: number;
  lum?: { bright?: number; contrast?: number };
  grayscl?: boolean;
  biLevel?: number;
  duotone?: [DmlColor, DmlColor];
  clrChange?: { from: DmlColor; to: DmlColor; useA?: boolean };
  /** Office 2010 (a14:imgProps): a imagem do a:blip JÁ vem processada; o original
   *  fica na camada (r:embed da a14:imgLayer, HD Photo). */
  a14?: {
    layerRid?: string;
    saturation?: number;
    colorTemp?: number;
    sharpen?: number;
    bright?: number;
    contrast?: number;
    /** efeitos artísticos / remoção de fundo (preservados crus) */
    otherRaw?: string[];
  };
}

export type PicWrapKind = 'inline' | 'square' | 'tight' | 'through' | 'topAndBottom' | 'behind' | 'front';

/** Posição do wp:anchor. `pct` (milésimos de %) sai em mc:AlternateContent com a
 *  posição absoluta na página (`fallback`, EMU) no mc:Fallback, como o Word. */
export interface PicPos { relativeFrom: string; align?: string; offset?: number; pct?: number; fallback?: number }

/** Formatação completa de uma imagem num w:drawing (EMU, como no XML). */
export interface PictureFormat {
  inline: boolean;
  wrap: PicWrapKind;
  wrapText: 'bothSides' | 'left' | 'right' | 'largest';
  dist: { t: number; b: number; l: number; r: number };
  posH?: PicPos;
  posV?: PicPos;
  cx: number; cy: number;
  sizeRelH?: { relativeFrom: string; pct: number };
  sizeRelV?: { relativeFrom: string; pct: number };
  effectExtent: { l: number; t: number; r: number; b: number };
  locked: boolean; layoutInCell: boolean; allowOverlap: boolean; behindDoc: boolean;
  relativeHeight?: number;
  /** polígono do contorno (21600 avos), Comprimido/Através */
  polygon?: { edited: boolean; pts: [number, number][] };
  docPr: { id?: string; name?: string; descr?: string; title?: string; hidden?: boolean; decorative?: boolean };
  noChangeAspect: boolean;
  rot: number; flipH: boolean; flipV: boolean;
  /** a:srcRect em milésimos de % (pode ser negativo: Ajustar) */
  srcRect: { l: number; t: number; r: number; b: number };
  geom: string;
  adj?: Record<string, number>;
  /** a:custGeom presente (cru) */
  custGeom?: boolean;
  line?: PicLine | null;
  effects: PicEffects;
  threeD?: Pic3D;
  blip: PicBlipFx;
  /** r:embed do a:blip */
  embed?: string;
}

// ───────────────────────── leitura ─────────────────────────

const int = (v: string | undefined, d = 0): number => {
  if (v === undefined) return d;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: string | undefined, d = false): boolean => (v === undefined ? d : v === '1' || v === 'true' || v === 'on');

export function findDeep(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const f = findDeep(c, name);
    if (f) return f;
  }
  return undefined;
}

export interface Parts {
  root: XmlElement;
  container: XmlElement;
  pic: XmlElement | undefined;
  /** forma/caixa de texto (wps:wsp) — o spPr dela faz o papel do pic:spPr */
  wsp: XmlElement | undefined;
  spPr: XmlElement | undefined;
  blipFill: XmlElement | undefined;
  blip: XmlElement | undefined;
}

/** Partes de um w:drawing cru (lido com posições — XmlPatch). */
export function partsOf(raw: string): Parts {
  const root = parseXml(raw, { positions: true });
  const container = firstChild(root, 'wp:anchor') ?? firstChild(root, 'wp:inline');
  if (!container) throw new Error('w:drawing sem wp:inline/wp:anchor');
  const gd = findDeep(container, 'a:graphicData');
  const pic = gd && firstChild(gd, 'pic:pic');
  const wsp = !pic && gd ? firstChild(gd, 'wps:wsp') : undefined;
  const spPr = pic ? firstChild(pic, 'pic:spPr') : wsp && firstChild(wsp, 'wps:spPr');
  const blipFill = pic && firstChild(pic, 'pic:blipFill');
  const blip = blipFill && firstChild(blipFill, 'a:blip');
  return { root, container, pic, wsp, spPr, blipFill, blip };
}

function readPos(el: XmlElement | undefined): PicPos | undefined {
  if (!el) return undefined;
  const p: PicPos = { relativeFrom: el.attrs['relativeFrom'] ?? 'column' };
  const al = firstChild(el, 'wp:align');
  if (al) p.align = textContent(al).trim();
  const off = firstChild(el, 'wp:posOffset');
  if (off) p.offset = int(textContent(off).trim());
  const pct = firstChild(el, 'wp14:pctPosHOffset') ?? firstChild(el, 'wp14:pctPosVOffset');
  if (pct) p.pct = int(textContent(pct).trim());
  return p;
}

export function readPicLine(ln: XmlElement | undefined): PicLine | null | undefined {
  if (!ln) return undefined;
  const out: PicLine = {};
  if (ln.attrs['w'] !== undefined) out.w = int(ln.attrs['w']);
  if (ln.attrs['cap']) out.cap = ln.attrs['cap'] as PicLine['cap'];
  if (ln.attrs['cmpd']) out.cmpd = ln.attrs['cmpd'] as PicLine['cmpd'];
  if (ln.attrs['algn']) out.algn = ln.attrs['algn'] as PicLine['algn'];
  for (const k of childElements(ln)) {
    if (k.name === 'a:noFill') out.fill = null;
    else if (k.name === 'a:solidFill') out.fill = readDmlColor(k) ?? null;
    else if (k.name === 'a:gradFill' || k.name === 'a:pattFill') out.fillRaw = rawOf(ln, k);
    else if (k.name === 'a:prstDash') out.dash = k.attrs['val'] ?? 'solid';
    else if (k.name === 'a:round' || k.name === 'a:bevel') out.join = k.name.slice(2) as PicLine['join'];
    else if (k.name === 'a:miter') { out.join = 'miter'; if (k.attrs['lim']) out.miterLim = int(k.attrs['lim']); }
    else if (k.name === 'a:headEnd' || k.name === 'a:tailEnd' || k.name === 'a:extLst') out.tailRaw = (out.tailRaw ?? '') + rawOf(ln, k);
  }
  return out;
}

/** XML cru de um elemento lido com positions (o fonte é o do pai mais alto). */
let rawSrc = '';
function rawOf(_parent: XmlElement, el: XmlElement): string { return rawSrc.slice(el.s!, el.e!); }

function readShadow(k: XmlElement): PicShadow {
  const kind = k.name === 'a:outerShdw' ? 'outer' : k.name === 'a:innerShdw' ? 'inner' : 'prst';
  const s: PicShadow = { kind, color: readDmlColor(k) ?? { kind: 'srgbClr', val: '000000' } };
  const a = k.attrs;
  if (a['blurRad'] !== undefined) s.blurRad = int(a['blurRad']);
  if (a['dist'] !== undefined) s.dist = int(a['dist']);
  if (a['dir'] !== undefined) s.dir = int(a['dir']);
  for (const n of ['sx', 'sy', 'kx', 'ky'] as const) if (a[n] !== undefined) s[n] = int(a[n]);
  if (a['algn']) s.algn = a['algn'];
  if (a['rotWithShape'] !== undefined) s.rotWithShape = bool(a['rotWithShape']);
  if (a['prst']) s.prst = a['prst'];
  return s;
}

function readEffects(el: XmlElement | undefined): PicEffects {
  const fx: PicEffects = {};
  if (!el) return fx;
  for (const k of childElements(el)) {
    if (k.name === 'a:outerShdw' || k.name === 'a:innerShdw' || k.name === 'a:prstShdw') fx.shadow = readShadow(k);
    else if (k.name === 'a:glow') fx.glow = { rad: int(k.attrs['rad']), color: readDmlColor(k) ?? { kind: 'srgbClr', val: '000000' } };
    else if (k.name === 'a:softEdge') fx.softEdge = int(k.attrs['rad']);
    else if (k.name === 'a:reflection') {
      const r: PicReflection = {};
      const a = k.attrs;
      for (const n of ['blurRad', 'stA', 'stPos', 'endA', 'endPos', 'dist', 'dir', 'fadeDir', 'sx', 'sy', 'kx', 'ky'] as const) if (a[n] !== undefined) r[n] = int(a[n]);
      if (a['algn']) r.algn = a['algn'];
      if (a['rotWithShape'] !== undefined) r.rotWithShape = bool(a['rotWithShape']);
      fx.reflection = r;
    } else (fx.otherRaw ??= []).push(rawOf(el, k));
  }
  return fx;
}

function readRot(el: XmlElement | undefined): { lat: number; lon: number; rev: number } | undefined {
  return el ? { lat: int(el.attrs['lat']), lon: int(el.attrs['lon']), rev: int(el.attrs['rev']) } : undefined;
}

function read3D(scene: XmlElement | undefined, sp3d: XmlElement | undefined): Pic3D | undefined {
  if (!scene && !sp3d) return undefined;
  const t: Pic3D = {};
  const cam = scene && firstChild(scene, 'a:camera');
  if (cam) {
    t.camera = { prst: cam.attrs['prst'] ?? 'orthographicFront' };
    if (cam.attrs['fov'] !== undefined) t.camera.fov = int(cam.attrs['fov']);
    if (cam.attrs['zoom'] !== undefined) t.camera.zoom = int(cam.attrs['zoom']);
    const r = readRot(firstChild(cam, 'a:rot'));
    if (r) t.camera.rot = r;
  }
  const lr = scene && firstChild(scene, 'a:lightRig');
  if (lr) {
    t.lightRig = { rig: lr.attrs['rig'] ?? 'threePt', dir: lr.attrs['dir'] ?? 't' };
    const r = readRot(firstChild(lr, 'a:rot'));
    if (r) t.lightRig.rot = r;
  }
  if (sp3d) {
    const bv = (b: XmlElement | undefined) => b && {
      ...(b.attrs['w'] !== undefined ? { w: int(b.attrs['w']) } : {}),
      ...(b.attrs['h'] !== undefined ? { h: int(b.attrs['h']) } : {}),
      ...(b.attrs['prst'] ? { prst: b.attrs['prst'] } : {}),
    };
    const bt = bv(firstChild(sp3d, 'a:bevelT')), bb = bv(firstChild(sp3d, 'a:bevelB'));
    if (bt) t.bevelT = bt;
    if (bb) t.bevelB = bb;
    if (sp3d.attrs['extrusionH'] !== undefined) t.extrusionH = int(sp3d.attrs['extrusionH']);
    if (sp3d.attrs['contourW'] !== undefined) t.contourW = int(sp3d.attrs['contourW']);
    if (sp3d.attrs['z'] !== undefined) t.z = int(sp3d.attrs['z']);
    if (sp3d.attrs['prstMaterial']) t.prstMaterial = sp3d.attrs['prstMaterial'];
    const ec = readDmlColor(firstChild(sp3d, 'a:extrusionClr'));
    if (ec) t.extrusionClr = ec;
    const cc = readDmlColor(firstChild(sp3d, 'a:contourClr'));
    if (cc) t.contourClr = cc;
  }
  return t;
}

function readBlip(blip: XmlElement | undefined): PicBlipFx {
  const fx: PicBlipFx = {};
  if (!blip) return fx;
  for (const k of childElements(blip)) {
    if (k.name === 'a:alphaModFix') fx.alphaModFix = int(k.attrs['amt'], 100000);
    else if (k.name === 'a:lum') fx.lum = { ...(k.attrs['bright'] !== undefined ? { bright: int(k.attrs['bright']) } : {}), ...(k.attrs['contrast'] !== undefined ? { contrast: int(k.attrs['contrast']) } : {}) };
    else if (k.name === 'a:grayscl') fx.grayscl = true;
    else if (k.name === 'a:biLevel') fx.biLevel = int(k.attrs['thresh'], 50000);
    else if (k.name === 'a:duotone') {
      const cs = childElements(k).filter((c) => COLOR_NAMES.includes(c.name));
      const wrap = (c: XmlElement | undefined): DmlColor => readDmlColor({ name: 'x', attrs: {}, children: c ? [c] : [] }) ?? { kind: 'srgbClr', val: '000000' };
      fx.duotone = [wrap(cs[0]), wrap(cs[1])];
    } else if (k.name === 'a:clrChange') {
      fx.clrChange = { from: readDmlColor(firstChild(k, 'a:clrFrom')) ?? { kind: 'srgbClr', val: 'FFFFFF' }, to: readDmlColor(firstChild(k, 'a:clrTo')) ?? { kind: 'srgbClr', val: 'FFFFFF' } };
      if (k.attrs['useA'] !== undefined) fx.clrChange.useA = bool(k.attrs['useA']);
    } else if (k.name === 'a:extLst') {
      const props = findDeep(k, 'a14:imgProps');
      const layer = props && firstChild(props, 'a14:imgLayer');
      if (layer) {
        const a14: NonNullable<PicBlipFx['a14']> = {};
        if (layer.attrs['r:embed']) a14.layerRid = layer.attrs['r:embed'];
        for (const ie of childElements(layer, 'a14:imgEffect')) {
          for (const e of childElements(ie)) {
            if (e.name === 'a14:saturation') a14.saturation = int(e.attrs['sat'], 100000);
            else if (e.name === 'a14:colorTemperature') a14.colorTemp = int(e.attrs['colorTemp'], 6500);
            else if (e.name === 'a14:sharpenSoften') a14.sharpen = int(e.attrs['amount']);
            else if (e.name === 'a14:brightnessContrast') { a14.bright = int(e.attrs['bright']); a14.contrast = int(e.attrs['contrast']); }
            else (a14.otherRaw ??= []).push(rawOf(blip, e));
          }
        }
        fx.a14 = a14;
      }
    }
  }
  return fx;
}

/** Formatação da imagem de um w:drawing cru (undefined se não for imagem). */
export function readPictureFormat(raw: string, opts: { anyShape?: boolean } = {}): PictureFormat | undefined {
  let p: Parts;
  try { p = partsOf(raw); } catch { return undefined; }
  // (anyShape: as partes comuns de uma forma wps — âncora, docPr, xfrm, contorno, efeitos)
  if (!p.pic && !(opts.anyShape && p.wsp)) return undefined;
  rawSrc = raw;
  const c = p.container;
  const inline = c.name === 'wp:inline';
  const ext = firstChild(c, 'wp:extent');
  const ee = firstChild(c, 'wp:effectExtent');
  const docPr = firstChild(c, 'wp:docPr');
  const a = c.attrs;
  const wrapEl = inline ? undefined : childElements(c).find((k) => WRAP_NAMES.includes(k.name));
  const behindDoc = bool(a['behindDoc']);
  let wrap: PicWrapKind = 'inline';
  if (!inline) {
    const n = wrapEl?.name ?? 'wp:wrapNone';
    wrap = n === 'wp:wrapSquare' ? 'square' : n === 'wp:wrapTight' ? 'tight' : n === 'wp:wrapThrough' ? 'through'
      : n === 'wp:wrapTopAndBottom' ? 'topAndBottom' : behindDoc ? 'behind' : 'front';
  }
  const poly = wrapEl && firstChild(wrapEl, 'wp:wrapPolygon');
  const sizeRel = (n: string, k: string) => {
    const el = firstChild(c, n);
    if (!el) return undefined;
    const v = firstChild(el, k);
    return { relativeFrom: el.attrs['relativeFrom'] ?? 'page', pct: v ? int(textContent(v).trim()) : 0 };
  };
  const spPr = p.spPr;
  const xfrm = spPr && firstChild(spPr, 'a:xfrm');
  const prst = spPr && firstChild(spPr, 'a:prstGeom');
  const adj: Record<string, number> = {};
  const av = prst && firstChild(prst, 'a:avLst');
  for (const gd of av ? childElements(av, 'a:gd') : []) {
    const m = /^val\s+(-?\d+)/.exec(gd.attrs['fmla'] ?? '');
    if (m && gd.attrs['name']) adj[gd.attrs['name']] = parseInt(m[1]!, 10);
  }
  const src = p.blipFill && firstChild(p.blipFill, 'a:srcRect');
  const decor = docPr && findDeep(docPr, 'adec:decorative');
  const locks = findDeep(c, 'a:graphicFrameLocks');
  const out: PictureFormat = {
    inline, wrap,
    wrapText: (wrapEl?.attrs['wrapText'] as PictureFormat['wrapText']) ?? 'bothSides',
    dist: { t: int(a['distT']), b: int(a['distB']), l: int(a['distL']), r: int(a['distR']) },
    cx: int(ext?.attrs['cx']), cy: int(ext?.attrs['cy']),
    effectExtent: { l: int(ee?.attrs['l']), t: int(ee?.attrs['t']), r: int(ee?.attrs['r']), b: int(ee?.attrs['b']) },
    locked: bool(a['locked']), layoutInCell: bool(a['layoutInCell'], true), allowOverlap: bool(a['allowOverlap'], true), behindDoc,
    docPr: {
      ...(docPr?.attrs['id'] ? { id: docPr.attrs['id'] } : {}),
      ...(docPr?.attrs['name'] !== undefined ? { name: docPr.attrs['name'] } : {}),
      ...(docPr?.attrs['descr'] !== undefined ? { descr: docPr.attrs['descr'] } : {}),
      ...(docPr?.attrs['title'] !== undefined ? { title: docPr.attrs['title'] } : {}),
      ...(bool(docPr?.attrs['hidden']) ? { hidden: true } : {}),
      ...(decor && bool(decor.attrs['val'], true) ? { decorative: true } : {}),
    },
    noChangeAspect: bool(locks?.attrs['noChangeAspect']),
    rot: int(xfrm?.attrs['rot']), flipH: bool(xfrm?.attrs['flipH']), flipV: bool(xfrm?.attrs['flipV']),
    srcRect: { l: int(src?.attrs['l']), t: int(src?.attrs['t']), r: int(src?.attrs['r']), b: int(src?.attrs['b']) },
    geom: prst?.attrs['prst'] ?? (spPr && firstChild(spPr, 'a:custGeom') ? 'custom' : 'rect'),
    effects: readEffects(spPr && firstChild(spPr, 'a:effectLst')),
    blip: readBlip(p.blip),
  };
  if (!inline) {
    const ph = readPos(anchorChild(c, 'wp:positionH')), pv = readPos(anchorChild(c, 'wp:positionV'));
    if (ph) out.posH = ph;
    if (pv) out.posV = pv;
    if (a['relativeHeight'] !== undefined) out.relativeHeight = int(a['relativeHeight']);
    const sh = sizeRel('wp14:sizeRelH', 'wp14:pctWidth'), sv = sizeRel('wp14:sizeRelV', 'wp14:pctHeight');
    if (sh) out.sizeRelH = sh;
    if (sv) out.sizeRelV = sv;
  }
  if (poly) {
    const pts: [number, number][] = childElements(poly).map((pt) => [int(pt.attrs['x']), int(pt.attrs['y'])]);
    out.polygon = { edited: bool(poly.attrs['edited']), pts };
  }
  if (Object.keys(adj).length) out.adj = adj;
  if (spPr && firstChild(spPr, 'a:custGeom')) out.custGeom = true;
  const ln = readPicLine(spPr && firstChild(spPr, 'a:ln'));
  if (ln !== undefined) out.line = ln;
  const t3 = read3D(spPr && firstChild(spPr, 'a:scene3d'), spPr && firstChild(spPr, 'a:sp3d'));
  if (t3) out.threeD = t3;
  if (p.blip?.attrs['r:embed']) out.embed = p.blip.attrs['r:embed'];
  rawSrc = '';
  return out;
}

// ───────────────────────── escrita ─────────────────────────

export function picLineXml(l: PicLine): string {
  const attrs = `${l.w !== undefined ? ` w="${Math.round(l.w)}"` : ''}${l.cap ? ` cap="${l.cap}"` : ''}${l.cmpd ? ` cmpd="${l.cmpd}"` : ''}${l.algn ? ` algn="${l.algn}"` : ''}`;
  let inner = '';
  if (l.fill === null) inner += '<a:noFill/>';
  else if (l.fill) inner += `<a:solidFill>${dmlColorXml(l.fill)}</a:solidFill>`;
  else if (l.fillRaw) inner += l.fillRaw;
  if (l.dash) inner += `<a:prstDash val="${l.dash}"/>`;
  if (l.join === 'round') inner += '<a:round/>';
  else if (l.join === 'bevel') inner += '<a:bevel/>';
  else if (l.join === 'miter') inner += l.miterLim !== undefined ? `<a:miter lim="${l.miterLim}"/>` : '<a:miter/>';
  if (l.tailRaw) inner += l.tailRaw;
  return inner ? `<a:ln${attrs}>${inner}</a:ln>` : `<a:ln${attrs}/>`;
}

const num = (k: string, v: number | undefined): string => (v === undefined ? '' : ` ${k}="${Math.round(v)}"`);

export function shadowXml(s: PicShadow): string {
  const tag = s.kind === 'outer' ? 'a:outerShdw' : s.kind === 'inner' ? 'a:innerShdw' : 'a:prstShdw';
  const attrs = (s.kind === 'prst' ? ` prst="${s.prst ?? 'shdw1'}"` : num('blurRad', s.blurRad)) +
    num('dist', s.dist) + num('dir', s.dir) +
    (s.kind === 'outer' ? num('sx', s.sx) + num('sy', s.sy) + num('kx', s.kx) + num('ky', s.ky) + (s.algn ? ` algn="${s.algn}"` : '') + (s.rotWithShape !== undefined ? ` rotWithShape="${s.rotWithShape ? 1 : 0}"` : '') : '');
  return `<${tag}${attrs}>${dmlColorXml(s.color)}</${tag}>`;
}

export function reflectionXml(r: PicReflection): string {
  return `<a:reflection${num('blurRad', r.blurRad)}${num('stA', r.stA)}${num('stPos', r.stPos)}${num('endA', r.endA)}${num('endPos', r.endPos)}${num('dist', r.dist)}${num('dir', r.dir)}${num('fadeDir', r.fadeDir)}${num('sx', r.sx)}${num('sy', r.sy)}${num('kx', r.kx)}${num('ky', r.ky)}${r.algn ? ` algn="${r.algn}"` : ''}${r.rotWithShape !== undefined ? ` rotWithShape="${r.rotWithShape ? 1 : 0}"` : ''}/>`;
}

export function effectLstXml(fx: PicEffects): string {
  const kids: [string, string][] = [];
  for (const raw of fx.otherRaw ?? []) kids.push([/^<([^\s/>]+)/.exec(raw)?.[1] ?? 'a:blur', raw]);
  if (fx.glow) kids.push(['a:glow', `<a:glow rad="${Math.round(fx.glow.rad)}">${dmlColorXml(fx.glow.color)}</a:glow>`]);
  if (fx.shadow) kids.push([fx.shadow.kind === 'outer' ? 'a:outerShdw' : fx.shadow.kind === 'inner' ? 'a:innerShdw' : 'a:prstShdw', shadowXml(fx.shadow)]);
  if (fx.reflection) kids.push(['a:reflection', reflectionXml(fx.reflection)]);
  if (fx.softEdge !== undefined) kids.push(['a:softEdge', `<a:softEdge rad="${Math.round(fx.softEdge)}"/>`]);
  kids.sort((a, b) => EFFECT_ORDER.indexOf(a[0] as never) - EFFECT_ORDER.indexOf(b[0] as never));
  return kids.length ? `<a:effectLst>${kids.map((k) => k[1]).join('')}</a:effectLst>` : '';
}

const rotXml = (r: { lat: number; lon: number; rev: number } | undefined): string => (r ? `<a:rot lat="${r.lat}" lon="${r.lon}" rev="${r.rev}"/>` : '');

export function scene3dXml(t: Pic3D): string {
  if (!t.camera && !t.lightRig) return '';
  const cam = t.camera ?? { prst: 'orthographicFront' };
  const lr = t.lightRig ?? { rig: 'threePt', dir: 't' };
  const camAttrs = `prst="${cam.prst}"${num('fov', cam.fov)}${num('zoom', cam.zoom)}`;
  return `<a:scene3d>${cam.rot ? `<a:camera ${camAttrs}>${rotXml(cam.rot)}</a:camera>` : `<a:camera ${camAttrs}/>`}` +
    `${lr.rot ? `<a:lightRig rig="${lr.rig}" dir="${lr.dir}">${rotXml(lr.rot)}</a:lightRig>` : `<a:lightRig rig="${lr.rig}" dir="${lr.dir}"/>`}</a:scene3d>`;
}

export function sp3dXml(t: Pic3D): string {
  const attrs = `${num('z', t.z)}${num('extrusionH', t.extrusionH)}${num('contourW', t.contourW)}${t.prstMaterial ? ` prstMaterial="${t.prstMaterial}"` : ''}`;
  const bv = (n: string, b: Pic3D['bevelT']) => (b ? `<a:${n}${num('w', b.w)}${num('h', b.h)}${b.prst ? ` prst="${b.prst}"` : ''}/>` : '');
  const inner = bv('bevelT', t.bevelT) + bv('bevelB', t.bevelB) +
    (t.extrusionClr ? `<a:extrusionClr>${dmlColorXml(t.extrusionClr)}</a:extrusionClr>` : '') +
    (t.contourClr ? `<a:contourClr>${dmlColorXml(t.contourClr)}</a:contourClr>` : '');
  if (!attrs && !inner) return '';
  return inner ? `<a:sp3d${attrs}>${inner}</a:sp3d>` : `<a:sp3d${attrs}/>`;
}

/** Elemento novo com o mesmo prefixo de namespace do arquivo. */
const A14 = 'xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"';
const ADEC_EXT = '<a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext>';
const IMGPROPS_URI = '{BEBA8EAE-BF5A-486C-A8C5-ECC9F3942E4B}';

function a14Xml(a: NonNullable<PicBlipFx['a14']>): string {
  const fx: string[] = [];
  for (const raw of a.otherRaw ?? []) fx.push(raw);
  if (a.saturation !== undefined) fx.push(`<a14:saturation sat="${a.saturation}"/>`);
  if (a.colorTemp !== undefined) fx.push(`<a14:colorTemperature colorTemp="${a.colorTemp}"/>`);
  if (a.sharpen !== undefined) fx.push(`<a14:sharpenSoften amount="${a.sharpen}"/>`);
  if (a.bright !== undefined || a.contrast !== undefined) fx.push(`<a14:brightnessContrast${a.bright ? ` bright="${a.bright}"` : ''}${a.contrast ? ` contrast="${a.contrast}"` : ''}/>`);
  if (!fx.length) return '';
  return `<a:ext uri="${IMGPROPS_URI}"><a14:imgProps ${A14}><a14:imgLayer${a.layerRid ? ` r:embed="${a.layerRid}"` : ''}>${fx.map((f) => `<a14:imgEffect>${f}</a14:imgEffect>`).join('')}</a14:imgLayer></a14:imgProps></a:ext>`;
}

/** Filhos do a:blip (menos o extLst) para os ajustes dados. */
function blipFxKids(fx: PicBlipFx): [string, string][] {
  const out: [string, string][] = [];
  if (fx.clrChange) out.push(['a:clrChange', `<a:clrChange${fx.clrChange.useA !== undefined ? ` useA="${fx.clrChange.useA ? 1 : 0}"` : ''}><a:clrFrom>${dmlColorXml(fx.clrChange.from)}</a:clrFrom><a:clrTo>${dmlColorXml(fx.clrChange.to)}</a:clrTo></a:clrChange>`]);
  if (fx.duotone) out.push(['a:duotone', `<a:duotone>${dmlColorXml(fx.duotone[0])}${dmlColorXml(fx.duotone[1])}</a:duotone>`]);
  if (fx.grayscl) out.push(['a:grayscl', '<a:grayscl/>']);
  if (fx.biLevel !== undefined) out.push(['a:biLevel', `<a:biLevel thresh="${fx.biLevel}"/>`]);
  if (fx.lum && (fx.lum.bright || fx.lum.contrast)) out.push(['a:lum', `<a:lum${fx.lum.bright ? ` bright="${fx.lum.bright}"` : ''}${fx.lum.contrast ? ` contrast="${fx.lum.contrast}"` : ''}/>`]);
  if (fx.alphaModFix !== undefined && fx.alphaModFix < 100000) out.push(['a:alphaModFix', `<a:alphaModFix amt="${fx.alphaModFix}"/>`]);
  return out;
}

// ───────────────────────── operações ─────────────────────────

/** Mudanças numa imagem (valores em EMU, como o XML). `undefined` = não mexe. */
export interface PictureChange {
  /** quebra de texto; da linha para fora, `at` = deslocamento atual da imagem
   *  relativo à coluna (x) e ao parágrafo (y), em EMU */
  wrap?: PicWrapKind;
  at?: { x: number; y: number };
  /** relativeHeight de um objeto novo (o maior do documento + 1024) */
  newRelativeHeight?: number;
  wrapText?: PictureFormat['wrapText'];
  dist?: Partial<PictureFormat['dist']>;
  posH?: PicPos;
  posV?: PicPos;
  locked?: boolean;
  layoutInCell?: boolean;
  allowOverlap?: boolean;
  behindDoc?: boolean;
  relativeHeight?: number;
  polygon?: { edited: boolean; pts: [number, number][] } | null;
  size?: { cx: number; cy: number };
  sizeRelH?: { relativeFrom: string; pct: number } | null;
  sizeRelV?: { relativeFrom: string; pct: number } | null;
  effectExtent?: { l: number; t: number; r: number; b: number };
  name?: string;
  descr?: string;
  title?: string;
  decorative?: boolean;
  hidden?: boolean;
  noChangeAspect?: boolean;
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  srcRect?: { l: number; t: number; r: number; b: number };
  geom?: { prst: string; adj?: Record<string, number> };
  line?: PicLine | null;
  /** efeitos (cada chave presente troca só aquele efeito; null tira) */
  shadow?: PicShadow | null;
  reflection?: PicReflection | null;
  glow?: { rad: number; color: DmlColor } | null;
  softEdge?: number | null;
  threeD?: Pic3D | null;
  /** ajustes do a:blip (troca o conjunto inteiro, menos o a14) */
  blipFx?: Omit<PicBlipFx, 'a14'>;
  /** a14:imgProps (null tira a camada) */
  a14?: PicBlipFx['a14'] | null;
  /** r:embed novo do a:blip (imagem trocada/processada) */
  embed?: string;
}

/** O retângulo padrão que o Word grava no polígono do contorno (medido). */
export const DEFAULT_WRAP_POLYGON: [number, number][] = [[0, 0], [0, 21300], [21375, 21300], [21375, 0], [0, 0]];

function polygonXml(poly: { edited: boolean; pts: [number, number][] }): string {
  const [first, ...rest] = poly.pts;
  return `<wp:wrapPolygon edited="${poly.edited ? 1 : 0}"><wp:start x="${first?.[0] ?? 0}" y="${first?.[1] ?? 0}"/>${rest.map(([x, y]) => `<wp:lineTo x="${x}" y="${y}"/>`).join('')}</wp:wrapPolygon>`;
}

function wrapXml(kind: PicWrapKind, wrapText: string, polygon: { edited: boolean; pts: [number, number][] } | undefined): string {
  switch (kind) {
    case 'square': return `<wp:wrapSquare wrapText="${wrapText}"/>`;
    case 'tight': case 'through': {
      const tag = kind === 'tight' ? 'wp:wrapTight' : 'wp:wrapThrough';
      return `<${tag} wrapText="${wrapText}">${polygonXml(polygon ?? { edited: false, pts: DEFAULT_WRAP_POLYGON })}</${tag}>`;
    }
    case 'topAndBottom': return '<wp:wrapTopAndBottom/>';
    default: return '<wp:wrapNone/>';
  }
}

const posXml = (tag: 'wp:positionH' | 'wp:positionV', p: PicPos): string => {
  if (p.align === undefined && p.pct !== undefined) {
    const pct = tag === 'wp:positionH' ? 'wp14:pctPosHOffset' : 'wp14:pctPosVOffset';
    return '<mc:AlternateContent><mc:Choice Requires="wp14">' +
      `<${tag} relativeFrom="${p.relativeFrom}"><${pct}>${Math.round(p.pct)}</${pct}></${tag}></mc:Choice>` +
      `<mc:Fallback><${tag} relativeFrom="page"><wp:posOffset>${Math.round(p.fallback ?? 0)}</wp:posOffset></${tag}></mc:Fallback></mc:AlternateContent>`;
  }
  const inner = p.align !== undefined ? `<wp:align>${p.align}</wp:align>` : `<wp:posOffset>${Math.round(p.offset ?? 0)}</wp:posOffset>`;
  return `<${tag} relativeFrom="${p.relativeFrom}">${inner}</${tag}>`;
};

/** O elemento que guarda a posição (o próprio wp:positionH/V ou o mc:AlternateContent em volta). */
function posHolder(c: XmlElement, tag: string): XmlElement | undefined {
  return firstChild(c, tag) ?? childElements(c, 'mc:AlternateContent').find((ac) => findDeep(ac, tag));
}

const sizeRelXml = (tag: 'wp14:sizeRelH' | 'wp14:sizeRelV', r: { relativeFrom: string; pct: number }): string => {
  const k = tag === 'wp14:sizeRelH' ? 'wp14:pctWidth' : 'wp14:pctHeight';
  return `<${tag} relativeFrom="${r.relativeFrom}"><${k}>${Math.round(r.pct)}</${k}></${tag}>`;
};

/** Converte o contêiner (em linha ↔ flutuante) mantendo docPr/cNvGraphicFramePr/graphic crus. */
function convertContainer(raw: string, ch: PictureChange): string {
  const p = partsOf(raw);
  const c = p.container;
  const slice = (n: string) => { const el = firstChild(c, n); return el ? raw.slice(el.s!, el.e!) : ''; };
  const keep = slice('wp:extent') + slice('wp:effectExtent');
  const tail = slice('wp:docPr') + slice('wp:cNvGraphicFramePr') + slice('a:graphic');
  const head = raw.slice(0, c.s!), foot = raw.slice(c.e!);
  const pfx = /^<([^:\s>]+):/.exec(raw.slice(c.s!))?.[1] ?? 'wp';
  const fix = (s: string) => (pfx === 'wp' ? s : s.replace(/<(\/?)wp:/g, `<$1${pfx}:`));
  if (ch.wrap === 'inline') {
    return head + fix(`<wp:inline distT="0" distB="0" distL="0" distR="0">${keep}${tail}</wp:inline>`) + foot;
  }
  const kind = ch.wrap!;
  const at = ch.at ?? { x: 0, y: 0 };
  const wrapText = ch.wrapText ?? 'bothSides';
  // medido: Comprimido/Através saem com behindDoc="1"
  const behind = kind === 'behind' || kind === 'tight' || kind === 'through';
  const z = ch.newRelativeHeight ?? 251658240;
  return head + fix(`<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${z}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1">` +
    '<wp:simplePos x="0" y="0"/>' +
    posXml('wp:positionH', { relativeFrom: 'column', offset: at.x }) +
    posXml('wp:positionV', { relativeFrom: 'paragraph', offset: at.y }) +
    keep + wrapXml(kind, wrapText, undefined) + tail +
    '<wp14:sizeRelH relativeFrom="page"><wp14:pctWidth>0</wp14:pctWidth></wp14:sizeRelH>' +
    '<wp14:sizeRelV relativeFrom="page"><wp14:pctHeight>0</wp14:pctHeight></wp14:sizeRelV></wp:anchor>') + foot;
}

/** Aplica as mudanças ao w:drawing cru de uma imagem. Cada etapa relê o XML (as
 *  trocas de uma etapa nunca se sobrepõem). */
export function patchPicture(raw: string, ch: PictureChange): string {
  let xml = raw;
  // 1) contêiner: em linha ↔ flutuante, ou troca do tipo de quebra
  if (ch.wrap !== undefined) {
    const cur = readPictureFormat(xml);
    if (cur) {
      if ((ch.wrap === 'inline') !== cur.inline) xml = convertContainer(xml, ch);
      else if (!cur.inline && ch.wrap !== cur.wrap) xml = switchWrap(xml, cur, ch.wrap);
    }
  }
  // 2) atributos e filhos do contêiner; 3) nome/texto alt; 4) decorativa; 5) travas
  xml = patchContainer(xml, ch);
  xml = patchNvPr(xml, ch);
  if (ch.decorative !== undefined) xml = patchDecorative(xml, ch.decorative);
  if (ch.noChangeAspect !== undefined) xml = patchLocks(xml, ch.noChangeAspect);
  // 6) a forma da imagem (pic:spPr) e o preenchimento (pic:blipFill, a:blip)
  xml = patchPic(xml, ch);
  if (ch.embed) xml = patchBlipAttrs(xml, ch.embed);
  if (ch.blipFx) xml = patchBlipFx(xml, ch.blipFx);
  if (ch.a14 !== undefined) xml = patchA14(xml, ch.a14);
  return xml;
}

function switchWrap(raw: string, cur: PictureFormat, kind: PicWrapKind): string {
  const p = partsOf(raw);
  const c = p.container;
  const patch = new XmlPatch(raw);
  const old = childElements(c).find((k) => WRAP_NAMES.includes(k.name));
  const xml = wrapXml(kind, cur.wrapText, cur.polygon);
  if (old) patch.replace(old, xml);
  else patch.insertChild(c, 'wp:wrapNone', xml, ANCHOR_ORDER);
  const behind = kind === 'behind' || kind === 'tight' || kind === 'through';
  if (cur.behindDoc !== behind) patch.setAttrs(c, { behindDoc: behind ? 1 : 0 });
  return patch.apply();
}

function patchContainer(raw: string, ch: PictureChange): string {
  const p = partsOf(raw);
  const c = p.container;
  const anchor = c.name !== 'wp:inline';
  const patch = new XmlPatch(raw);
  const attrs: Record<string, string | number | undefined> = {};
  if (ch.dist) for (const [k, v] of Object.entries(ch.dist)) if (v !== undefined) attrs[`dist${k.toUpperCase()}`] = Math.round(v);
  if (anchor) {
    if (ch.locked !== undefined) attrs['locked'] = ch.locked ? 1 : 0;
    if (ch.layoutInCell !== undefined) attrs['layoutInCell'] = ch.layoutInCell ? 1 : 0;
    if (ch.allowOverlap !== undefined) attrs['allowOverlap'] = ch.allowOverlap ? 1 : 0;
    if (ch.behindDoc !== undefined) attrs['behindDoc'] = ch.behindDoc ? 1 : 0;
    if (ch.relativeHeight !== undefined) attrs['relativeHeight'] = Math.round(ch.relativeHeight);
  }
  if (Object.keys(attrs).length) patch.setAttrs(c, attrs);
  const order = anchor ? ANCHOR_ORDER : INLINE_ORDER;
  if (anchor) {
    for (const [tag, pos] of [['wp:positionH', ch.posH], ['wp:positionV', ch.posV]] as const) {
      if (!pos) continue;
      const cur = posHolder(c, tag);
      if (cur) patch.replace(cur, posXml(tag, pos));
      else patch.insertChild(c, tag, posXml(tag, pos), ANCHOR_ORDER);
    }
    const wrapEl = childElements(c).find((k) => WRAP_NAMES.includes(k.name));
    if (wrapEl && wrapEl.name !== 'wp:wrapNone' && wrapEl.name !== 'wp:wrapTopAndBottom') {
      const poly = wrapEl.name === 'wp:wrapTight' || wrapEl.name === 'wp:wrapThrough';
      if (ch.polygon !== undefined && poly) {
        // a tag de abertura e o polígono juntos (uma troca só)
        const wt = ch.wrapText ?? wrapEl.attrs['wrapText'] ?? 'bothSides';
        const tag = wrapEl.name;
        patch.replace(wrapEl, `<${tag} wrapText="${wt}">${polygonXml(ch.polygon ?? { edited: false, pts: DEFAULT_WRAP_POLYGON })}</${tag}>`);
      } else if (ch.wrapText !== undefined) patch.setAttrs(wrapEl, { wrapText: ch.wrapText });
    }
    if (ch.sizeRelH !== undefined) patch.putChild(c, 'wp14:sizeRelH', ch.sizeRelH ? sizeRelXml('wp14:sizeRelH', ch.sizeRelH) : '', ANCHOR_ORDER);
    if (ch.sizeRelV !== undefined) patch.putChild(c, 'wp14:sizeRelV', ch.sizeRelV ? sizeRelXml('wp14:sizeRelV', ch.sizeRelV) : '', ANCHOR_ORDER);
  }
  if (ch.size) {
    const ext = firstChild(c, 'wp:extent');
    if (ext) patch.setAttrs(ext, { cx: Math.round(ch.size.cx), cy: Math.round(ch.size.cy) });
    else patch.insertChild(c, 'wp:extent', `<wp:extent cx="${Math.round(ch.size.cx)}" cy="${Math.round(ch.size.cy)}"/>`, order);
  }
  if (ch.effectExtent) {
    const e = ch.effectExtent;
    const ee = firstChild(c, 'wp:effectExtent');
    const vals = { l: Math.round(e.l), t: Math.round(e.t), r: Math.round(e.r), b: Math.round(e.b) };
    if (ee) patch.setAttrs(ee, vals);
    else patch.insertChild(c, 'wp:effectExtent', `<wp:effectExtent l="${vals.l}" t="${vals.t}" r="${vals.r}" b="${vals.b}"/>`, order);
  }
  return patch.apply();
}

function patchLocks(raw: string, on: boolean): string {
  const p = partsOf(raw);
  const c = p.container;
  const patch = new XmlPatch(raw);
  const locks = findDeep(c, 'a:graphicFrameLocks');
  if (locks) patch.setAttrs(locks, { noChangeAspect: on ? 1 : undefined });
  else if (on) {
    const fp = firstChild(c, 'wp:cNvGraphicFramePr');
    const lx = '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>';
    if (fp) patch.setContent(fp, lx);
    else patch.insertChild(c, 'wp:cNvGraphicFramePr', `<wp:cNvGraphicFramePr>${lx}</wp:cNvGraphicFramePr>`, c.name === 'wp:inline' ? INLINE_ORDER : ANCHOR_ORDER);
  }
  // forma (wps): o Word grava também a:spLocks no wps:cNvSpPr (oráculo textbox-lab lock-aspect)
  const nv = p.wsp && firstChild(p.wsp, 'wps:cNvSpPr');
  if (nv) {
    const sl = firstChild(nv, 'a:spLocks');
    if (sl) {
      const others = Object.keys(sl.attrs).filter((k) => k !== 'noChangeAspect');
      if (!on && !others.length && sl.cs === sl.e) patch.remove(sl);
      else patch.setAttrs(sl, { noChangeAspect: on ? 1 : undefined });
    } else if (on) {
      if (nv.cs === nv.e) patch.setContent(nv, '<a:spLocks noChangeAspect="1"/>');
      else patch.insertAt(nv.cs!, '<a:spLocks noChangeAspect="1"/>');
    }
  }
  return patch.apply();
}

/** wp:docPr e pic:cNvPr: nome, texto alt e oculto (descr/title nos dois, como o Word). */
function patchNvPr(raw: string, ch: PictureChange): string {
  const set: Record<string, string | number | undefined> = {};
  if (ch.name !== undefined) set['name'] = ch.name;
  if (ch.descr !== undefined) set['descr'] = ch.descr || undefined;
  if (ch.title !== undefined) set['title'] = ch.title || undefined;
  if (ch.hidden !== undefined) set['hidden'] = ch.hidden ? 1 : undefined;
  if (!Object.keys(set).length) return raw;
  const p = partsOf(raw);
  const docPr = firstChild(p.container, 'wp:docPr');
  if (!docPr) return raw;
  const nv = p.pic && firstChild(p.pic, 'pic:nvPicPr');
  const cNvPr = nv && firstChild(nv, 'pic:cNvPr');
  const patch = new XmlPatch(raw);
  patch.setAttrs(docPr, set);
  if (cNvPr) {
    // o Word repete descr/title no cNvPr e preenche o name dele (vazio por padrão)
    const nset: Record<string, string | number | undefined> = { ...set };
    delete nset['hidden'];
    if ((ch.descr || ch.title) && !cNvPr.attrs['name']) nset['name'] = ch.name ?? docPr.attrs['name'] ?? '';
    if (Object.keys(nset).length) patch.setAttrs(cNvPr, nset);
  }
  return patch.apply();
}

/** Marcar como decorativa: a:extLst {C183D7F6-…} no wp:docPr e no pic:cNvPr. */
function patchDecorative(raw: string, on: boolean): string {
  let xml = raw;
  if (on) {
    // como no texto alt, o name do cNvPr (vazio por padrão) recebe o do docPr
    const p = partsOf(xml);
    const docPr = firstChild(p.container, 'wp:docPr');
    const nv = p.pic && firstChild(p.pic, 'pic:nvPicPr');
    const cNvPr = nv && firstChild(nv, 'pic:cNvPr');
    if (docPr && cNvPr && !cNvPr.attrs['name'] && docPr.attrs['name']) {
      const patch = new XmlPatch(xml);
      patch.setAttrs(cNvPr, { name: docPr.attrs['name'] });
      xml = patch.apply();
    }
  }
  for (const which of ['docPr', 'cNvPr'] as const) {
    const p = partsOf(xml);
    const nv = p.pic && firstChild(p.pic, 'pic:nvPicPr');
    const el = which === 'docPr' ? firstChild(p.container, 'wp:docPr') : nv && firstChild(nv, 'pic:cNvPr');
    if (!el) continue;
    const patch = new XmlPatch(xml);
    const ext = firstChild(el, 'a:extLst');
    const decExt = ext && childElements(ext, 'a:ext').find((e) => e.attrs['uri'] === '{C183D7F6-B498-43B3-948B-1728B52AA6E4}');
    if (on) {
      if (decExt) continue;
      const nsA = which === 'docPr' ? ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' : '';
      if (ext) patch.insertAt(ext.ce!, ADEC_EXT);
      else {
        const hl = childElements(el).filter((k) => k.name === 'a:hlinkClick' || k.name === 'a:hlinkHover').pop();
        const lst = `<a:extLst${nsA}>${ADEC_EXT}</a:extLst>`;
        if (hl) patch.insertAt(hl.e!, lst);
        else if (el.cs === el.e) patch.setContent(el, lst);
        else patch.insertAt(el.ce!, lst);
      }
    } else if (decExt) {
      if (childElements(ext!).length === 1) patch.remove(ext!);
      else patch.remove(decExt);
    }
    xml = patch.apply();
  }
  return xml;
}

function patchPic(raw: string, ch: PictureChange): string {
  const p = partsOf(raw);
  if (!p.pic && !p.wsp) return raw;
  const patch = new XmlPatch(raw);
  const sp = p.spPr;
  if (sp) {
    rawSrc = raw;
    // xfrm: giro/espelho e tamanho (a:ext acompanha o wp:extent)
    const xfrm = firstChild(sp, 'a:xfrm');
    const xa: Record<string, string | number | undefined> = {};
    if (ch.rot !== undefined) xa['rot'] = ch.rot ? Math.round(ch.rot) : undefined;
    if (ch.flipH !== undefined) xa['flipH'] = ch.flipH ? 1 : undefined;
    if (ch.flipV !== undefined) xa['flipV'] = ch.flipV ? 1 : undefined;
    if (xfrm) {
      if (Object.keys(xa).length) patch.setAttrs(xfrm, xa);
      const ext = firstChild(xfrm, 'a:ext');
      if (ext && ch.size) patch.setAttrs(ext, { cx: Math.round(ch.size.cx), cy: Math.round(ch.size.cy) });
    }
    if (ch.geom) {
      const adj = Object.entries(ch.geom.adj ?? {}).map(([n, v]) => `<a:gd name="${n}" fmla="val ${Math.round(v)}"/>`).join('');
      const g = `<a:prstGeom prst="${ch.geom.prst}"><a:avLst${adj ? `>${adj}</a:avLst>` : '/>'}</a:prstGeom>`;
      const cust = firstChild(sp, 'a:custGeom');
      if (cust) patch.replace(cust, g);
      else patch.putChild(sp, 'a:prstGeom', g, SPPR_ORDER);
    }
    if (ch.line !== undefined) patch.putChild(sp, 'a:ln', ch.line ? picLineXml(ch.line) : '', SPPR_ORDER);
    if (ch.shadow !== undefined || ch.reflection !== undefined || ch.glow !== undefined || ch.softEdge !== undefined) {
      const el = firstChild(sp, 'a:effectLst');
      const fx = readEffects(el);
      if (ch.shadow !== undefined) { if (ch.shadow) fx.shadow = ch.shadow; else delete fx.shadow; }
      if (ch.reflection !== undefined) { if (ch.reflection) fx.reflection = ch.reflection; else delete fx.reflection; }
      if (ch.glow !== undefined) { if (ch.glow) fx.glow = ch.glow; else delete fx.glow; }
      if (ch.softEdge !== undefined) { if (ch.softEdge) fx.softEdge = ch.softEdge; else delete fx.softEdge; }
      patch.putChild(sp, 'a:effectLst', effectLstXml(fx), SPPR_ORDER);
    }
    if (ch.threeD !== undefined) {
      patch.putChild(sp, 'a:scene3d', ch.threeD ? scene3dXml(ch.threeD) : '', SPPR_ORDER);
      patch.putChild(sp, 'a:sp3d', ch.threeD ? sp3dXml(ch.threeD) : '', SPPR_ORDER);
    }
    rawSrc = '';
  }
  const bf = p.blipFill;
  if (bf && ch.srcRect) {
    const s = ch.srcRect;
    const attrs = `${s.l ? ` l="${Math.round(s.l)}"` : ''}${s.t ? ` t="${Math.round(s.t)}"` : ''}${s.r ? ` r="${Math.round(s.r)}"` : ''}${s.b ? ` b="${Math.round(s.b)}"` : ''}`;
    patch.putChild(bf, 'a:srcRect', `<a:srcRect${attrs}/>`, BLIPFILL_ORDER);
  }
  return patch.apply();
}

function patchBlipAttrs(raw: string, embed: string): string {
  const p = partsOf(raw);
  if (!p.blip) return raw;
  const patch = new XmlPatch(raw);
  patch.setAttrs(p.blip, { 'r:embed': embed });
  return patch.apply();
}

/** Troca o conjunto de ajustes de cor do a:blip (o extLst e o resto ficam). */
function patchBlipFx(raw: string, fx: Omit<PicBlipFx, 'a14'>): string {
  const p = partsOf(raw);
  const blip = p.blip;
  if (!blip) return raw;
  const patch = new XmlPatch(raw);
  const managed = new Set(['a:alphaModFix', 'a:lum', 'a:grayscl', 'a:biLevel', 'a:duotone', 'a:clrChange']);
  for (const k of childElements(blip)) if (managed.has(k.name)) patch.remove(k);
  const xml = blipFxKids(fx).map((k) => k[1]).join('');
  if (xml) {
    const ext = firstChild(blip, 'a:extLst');
    if (ext) patch.insertAt(ext.s!, xml);
    else if (blip.cs === blip.e) patch.setContent(blip, xml);
    else patch.insertAt(blip.ce!, xml);
  }
  return patch.apply();
}

/** a14:imgProps (camada com o original + efeitos do Office 2010). */
function patchA14(raw: string, a14: PicBlipFx['a14'] | null): string {
  const p = partsOf(raw);
  const blip = p.blip;
  if (!blip) return raw;
  const patch = new XmlPatch(raw);
  const ext = firstChild(blip, 'a:extLst');
  const props = ext && childElements(ext, 'a:ext').find((e) => e.attrs['uri'] === IMGPROPS_URI);
  const xml = a14 ? a14Xml(a14) : '';
  if (props) patch.replace(props, xml);
  else if (xml) {
    // o Word põe a camada antes do useLocalDpi
    if (ext) patch.insertAt(ext.cs!, xml);
    else if (blip.cs === blip.e) patch.setContent(blip, `<a:extLst>${xml}</a:extLst>`);
    else patch.insertAt(blip.ce!, `<a:extLst>${xml}</a:extLst>`);
  }
  return patch.apply();
}

/** w:drawing de uma imagem nova em linha, como o Word grava ao inserir. */
export function newPictureXml(o: { id: number; name: string; rid: string; cx: number; cy: number }): string {
  const cx = Math.round(o.cx), cy = Math.round(o.cy);
  return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${o.id}" name="${escAttr(o.name)}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${o.id}" name=""/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${o.rid}" cstate="print"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi ${A14} val="0"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
}
