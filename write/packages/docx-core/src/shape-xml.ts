/**
 * Forma e CAIXA DE TEXTO (wps:wsp num w:drawing) como o Word as grava: leitura
 * tipada e edição CIRÚRGICA do XML cru (como picture-xml.ts, cujas partes comuns —
 * âncora, quebra, posição, tamanho, docPr, xfrm, contorno, efeitos, 3D — valem
 * aqui também). Medido no oráculo (write/tools/textbox-lab, results/*.xml):
 * - caixa nova (Desenhar Caixa de Texto): wp:anchor dist 0/0/114300/114300,
 *   wrapNone, docPr "Caixa de Texto N" (em inglês "Text Box N"), wps:cNvSpPr
 *   txBox="1", preenchimento lt1 e contorno 6350 prstClr black, bodyPr completo
 *   (rot 0, spcFirstLastPara 0, vertOverflow/horzOverflow overflow, vert horz, wrap
 *   square, margens 91440/45720, numCol 1, spcCol 0, rtlCol 0, fromWordArt 0, anchor
 *   t, anchorCtr 0, forceAA 0, compatLnSpc 1) + a:prstTxWarp textNoShape +
 *   a:noAutofit; dentro de mc:AlternateContent com o VML de reserva;
 * - sem contorno: a:ln com a:noFill e o a14:hiddenLine (a linha anterior) no a:extLst
 *   do spPr (oráculo line-none);
 * - Estilos de Forma: wps:style (lnRef/fillRef/effectRef/fontRef) e o spPr sem
 *   preenchimento e com <a:ln/> (1–42) ou com o preenchimento/contorno explícito
 *   (predefinições 43–77);
 * - vínculo: 1ª wps:txbx id="N", seguintes wps:linkedTxbx id="N" seq="1…" (sem
 *   conteúdo); quebrar: todas voltam a wps:txbx sem id e a seguinte ganha <w:p/>;
 * - VML de reserva: refeito a partir do wps a cada edição (vmlFallback), como o
 *   Word faz ao salvar; o o:gfxdata (zip com checksum) não é gravado.
 */
import { childElements, firstChild, type XmlElement } from './xml.js';
import {
  XmlPatch, escAttr, partsOf, readDmlColor, dmlColorXml, patchPicture, readPictureFormat,
  SPPR_ORDER, type DmlColor, type PicLine, type PictureChange, type PictureFormat,
} from './picture-xml.js';

// ───────────────────────── tipos ─────────────────────────

/** Preenchimento do wps:spPr. `style` = nenhum declarado (vale o fillRef do wps:style). */
export type ShapeFill =
  | { kind: 'none' }
  | { kind: 'style' }
  | { kind: 'solid'; color: DmlColor }
  | { kind: 'gradient'; stops: { pos: number; color: DmlColor }[]; lin?: { ang: number; scaled: boolean }; path?: { path: string; fillToRect?: { l: number; t: number; r: number; b: number } }; rotWithShape?: boolean; flip?: string; tileRect?: boolean }
  | { kind: 'pattern'; prst: string; fg: DmlColor; bg: DmlColor }
  | { kind: 'picture'; embed: string; tile?: { tx: number; ty: number; sx: number; sy: number; flip: string; algn: string }; alpha?: number }
  /** outro (a:grpFill, blipFill exótico…): cru */
  | { kind: 'raw'; xml: string };

/** wps:style — referências ao tema (Estilos de Forma). */
export interface ShapeStyleRefs {
  ln: { idx: number; color: DmlColor | null };
  fill: { idx: number; color: DmlColor | null };
  effect: { idx: number; color: DmlColor | null };
  font: { idx: 'minor' | 'major' | 'none'; color: DmlColor | null };
}

/** wps:bodyPr da caixa de texto (margens em EMU). */
export interface TextboxBody {
  lIns: number; tIns: number; rIns: number; bIns: number;
  anchor: 't' | 'ctr' | 'b';
  anchorCtr: boolean;
  /** horz | vert | vert270 | eaVert | mongolianVert | wordArtVert | wordArtVertRtl */
  vert: string;
  wrap: 'square' | 'none';
  /** a:noAutofit | a:spAutoFit (Redimensionar a forma para ajustar o texto) | a:normAutofit */
  autofit: 'none' | 'shape' | 'norm';
  /** Não girar o texto (com a forma) */
  upright: boolean;
  rot: number;
}

export interface ShapeFormat extends Omit<PictureFormat, 'blip' | 'srcRect' | 'embed'> {
  fill: ShapeFill;
  style?: ShapeStyleRefs;
  /** wps:cNvSpPr txBox="1" */
  textbox: boolean;
  /** caixa de texto: o bodyPr */
  body?: TextboxBody;
  /** história da caixa: wps:txbx (id da cadeia, se vinculada) ou wps:linkedTxbx */
  story?: { kind: 'txbx'; id?: number } | { kind: 'linked'; id: number; seq: number };
  /** wps:wsp normalEastAsianFlow (texto horizontal girado — Leste Asiático) */
  normalEastAsianFlow?: boolean;
}

export interface ShapeChange extends PictureChange {
  fill?: ShapeFill;
  /** contorno da forma (null = Sem Contorno, como o Word: noFill + a14:hiddenLine) — no
   *  lugar do `line` da imagem */
  outline?: PicLine | null;
  /** troca o wps:style (null tira) */
  style?: ShapeStyleRefs | null;
  body?: Partial<TextboxBody>;
  /** vínculo: a caixa vira a 1ª da cadeia (id) ou uma seguinte (linkedTxbx), ou
   *  volta a ter conteúdo próprio (null: wps:txbx sem id com `content`) */
  story?: { kind: 'txbx'; id?: number; content?: string } | { kind: 'linked'; id: number; seq: number };
  /** Estilos de Forma: os filhos do spPr depois da geometria (preenchimento e contorno,
   *  como o Word grava o estilo) e o wps:style — SHAPE_STYLE_PRESETS do drawingml */
  stylePreset?: { spPr: string; style: string };
}

const int = (v: string | undefined, d = 0): number => {
  if (v === undefined) return d;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: string | undefined, d = false): boolean => (v === undefined ? d : v === '1' || v === 'true' || v === 'on');

/** Os padrões do bodyPr de uma caixa nova (medidos). */
export const DEFAULT_TEXTBOX_BODY: TextboxBody = {
  lIns: 91440, tIns: 45720, rIns: 91440, bIns: 45720, anchor: 't', anchorCtr: false, vert: 'horz', wrap: 'square', autofit: 'none', upright: false, rot: 0,
};

// ───────────────────────── leitura ─────────────────────────

function readFill(spPr: XmlElement | undefined, raw: string): ShapeFill {
  if (!spPr) return { kind: 'style' };
  for (const k of childElements(spPr)) {
    switch (k.name) {
      case 'a:noFill': return { kind: 'none' };
      case 'a:solidFill': return { kind: 'solid', color: readDmlColor(k) ?? { kind: 'srgbClr', val: '000000' } };
      case 'a:gradFill': {
        const gs = firstChild(k, 'a:gsLst');
        const lin = firstChild(k, 'a:lin'), path = firstChild(k, 'a:path');
        const ftr = path && firstChild(path, 'a:fillToRect');
        return {
          kind: 'gradient',
          stops: (gs ? childElements(gs, 'a:gs') : []).map((g) => ({ pos: int(g.attrs['pos']), color: readDmlColor(g) ?? { kind: 'srgbClr', val: '000000' } })),
          ...(lin ? { lin: { ang: int(lin.attrs['ang']), scaled: bool(lin.attrs['scaled']) } } : {}),
          ...(path ? { path: { path: path.attrs['path'] ?? 'circle', ...(ftr ? { fillToRect: { l: int(ftr.attrs['l']), t: int(ftr.attrs['t']), r: int(ftr.attrs['r']), b: int(ftr.attrs['b']) } } : {}) } } : {}),
          ...(k.attrs['rotWithShape'] !== undefined ? { rotWithShape: bool(k.attrs['rotWithShape']) } : {}),
          ...(k.attrs['flip'] ? { flip: k.attrs['flip'] } : {}),
          ...(firstChild(k, 'a:tileRect') ? { tileRect: true } : {}),
        };
      }
      case 'a:pattFill':
        return { kind: 'pattern', prst: k.attrs['prst'] ?? 'pct5', fg: readDmlColor(firstChild(k, 'a:fgClr')) ?? { kind: 'srgbClr', val: '000000' }, bg: readDmlColor(firstChild(k, 'a:bgClr')) ?? { kind: 'srgbClr', val: 'FFFFFF' } };
      case 'a:blipFill': {
        const blip = firstChild(k, 'a:blip');
        const tile = firstChild(k, 'a:tile');
        const amf = blip && firstChild(blip, 'a:alphaModFix');
        if (!blip?.attrs['r:embed']) return { kind: 'raw', xml: raw.slice(k.s!, k.e!) };
        return {
          kind: 'picture', embed: blip.attrs['r:embed'],
          ...(tile ? { tile: { tx: int(tile.attrs['tx']), ty: int(tile.attrs['ty']), sx: int(tile.attrs['sx'], 100000), sy: int(tile.attrs['sy'], 100000), flip: tile.attrs['flip'] ?? 'none', algn: tile.attrs['algn'] ?? 'tl' } } : {}),
          ...(amf ? { alpha: int(amf.attrs['amt'], 100000) } : {}),
        };
      }
      case 'a:grpFill': return { kind: 'raw', xml: raw.slice(k.s!, k.e!) };
    }
  }
  return { kind: 'style' };
}

function readStyleRefs(st: XmlElement | undefined): ShapeStyleRefs | undefined {
  if (!st) return undefined;
  const ref = (n: string) => { const e = firstChild(st, n); return { idx: int(e?.attrs['idx']), color: readDmlColor(e) ?? null }; };
  const fr = firstChild(st, 'a:fontRef');
  return {
    ln: ref('a:lnRef'), fill: ref('a:fillRef'), effect: ref('a:effectRef'),
    font: { idx: (fr?.attrs['idx'] as 'minor' | 'major' | 'none') ?? 'minor', color: readDmlColor(fr) ?? null },
  };
}

function readBody(b: XmlElement | undefined): TextboxBody | undefined {
  if (!b) return undefined;
  const a = b.attrs;
  const anc = a['anchor'];
  return {
    lIns: int(a['lIns'], 91440), tIns: int(a['tIns'], 45720), rIns: int(a['rIns'], 91440), bIns: int(a['bIns'], 45720),
    anchor: anc === 'ctr' || anc === 'b' ? anc : 't',
    anchorCtr: bool(a['anchorCtr']),
    vert: a['vert'] ?? 'horz',
    wrap: a['wrap'] === 'none' ? 'none' : 'square',
    autofit: firstChild(b, 'a:spAutoFit') ? 'shape' : firstChild(b, 'a:normAutofit') ? 'norm' : 'none',
    upright: bool(a['upright']),
    rot: int(a['rot']),
  };
}

/** Formatação de uma forma/caixa de texto (wps:wsp) num w:drawing cru (undefined se não for). */
export function readShapeFormat(raw: string): ShapeFormat | undefined {
  const base = readPictureFormat(raw, { anyShape: true });
  if (!base) return undefined;
  let p;
  try { p = partsOf(raw); } catch { return undefined; }
  const wsp = p.wsp;
  if (!wsp) return undefined;
  const { blip: _b, srcRect: _s, embed: _e, ...rest } = base;
  const nv = firstChild(wsp, 'wps:cNvSpPr');
  const txbx = firstChild(wsp, 'wps:txbx'), linked = firstChild(wsp, 'wps:linkedTxbx');
  const out: ShapeFormat = {
    ...rest,
    fill: readFill(p.spPr, raw),
    textbox: bool(nv?.attrs['txBox']),
  };
  const st = readStyleRefs(firstChild(wsp, 'wps:style'));
  if (st) out.style = st;
  if (txbx || linked) {
    const body = readBody(firstChild(wsp, 'wps:bodyPr'));
    out.body = body ?? { ...DEFAULT_TEXTBOX_BODY };
    out.story = linked
      ? { kind: 'linked', id: int(linked.attrs['id']), seq: int(linked.attrs['seq'], 1) }
      : { kind: 'txbx', ...(txbx!.attrs['id'] !== undefined ? { id: int(txbx!.attrs['id']) } : {}) };
  }
  if (bool(wsp.attrs['normalEastAsianFlow'])) out.normalEastAsianFlow = true;
  return out;
}

// ───────────────────────── escrita ─────────────────────────

export function shapeFillXml(f: ShapeFill): string {
  switch (f.kind) {
    case 'none': return '<a:noFill/>';
    case 'style': return '';
    case 'solid': return `<a:solidFill>${dmlColorXml(f.color)}</a:solidFill>`;
    case 'gradient': {
      const gs = f.stops.map((s) => `<a:gs pos="${Math.round(s.pos)}">${dmlColorXml(s.color)}</a:gs>`).join('');
      const shade = f.path
        ? `<a:path path="${f.path.path}">${f.path.fillToRect ? `<a:fillToRect l="${f.path.fillToRect.l}" t="${f.path.fillToRect.t}" r="${f.path.fillToRect.r}" b="${f.path.fillToRect.b}"/>` : ''}</a:path>`
        : f.lin ? `<a:lin ang="${Math.round(f.lin.ang)}" scaled="${f.lin.scaled ? 1 : 0}"/>` : '';
      return `<a:gradFill${f.flip ? ` flip="${f.flip}"` : ''}${f.rotWithShape !== undefined ? ` rotWithShape="${f.rotWithShape ? 1 : 0}"` : ''}><a:gsLst>${gs}</a:gsLst>${shade}${f.tileRect ? '<a:tileRect/>' : ''}</a:gradFill>`;
    }
    case 'pattern': return `<a:pattFill prst="${f.prst}"><a:fgClr>${dmlColorXml(f.fg)}</a:fgClr><a:bgClr>${dmlColorXml(f.bg)}</a:bgClr></a:pattFill>`;
    case 'picture': {
      const blip = f.alpha !== undefined && f.alpha < 100000 ? `<a:blip r:embed="${f.embed}"><a:alphaModFix amt="${Math.round(f.alpha)}"/></a:blip>` : `<a:blip r:embed="${f.embed}"/>`;
      const t = f.tile;
      return `<a:blipFill>${blip}${t ? `<a:tile tx="${t.tx}" ty="${t.ty}" sx="${t.sx}" sy="${t.sy}" flip="${t.flip}" algn="${t.algn}"/>` : '<a:stretch><a:fillRect/></a:stretch>'}</a:blipFill>`;
    }
    case 'raw': return f.xml;
  }
}

export function styleRefsXml(s: ShapeStyleRefs): string {
  const c = (x: DmlColor | null) => (x ? dmlColorXml(x) : '<a:scrgbClr r="0" g="0" b="0"/>');
  return `<wps:style><a:lnRef idx="${s.ln.idx}">${c(s.ln.color)}</a:lnRef><a:fillRef idx="${s.fill.idx}">${c(s.fill.color)}</a:fillRef>`
    + `<a:effectRef idx="${s.effect.idx}">${c(s.effect.color)}</a:effectRef><a:fontRef idx="${s.font.idx}">${s.font.color ? dmlColorXml(s.font.color) : ''}</a:fontRef></wps:style>`;
}

/** wps:bodyPr inteiro como o Word grava (atributos na ordem medida). */
export function bodyPrXml(b: TextboxBody): string {
  return `<wps:bodyPr rot="${b.rot}" spcFirstLastPara="0" vertOverflow="overflow" horzOverflow="overflow" vert="${b.vert}" wrap="${b.wrap}" lIns="${Math.round(b.lIns)}" tIns="${Math.round(b.tIns)}" rIns="${Math.round(b.rIns)}" bIns="${Math.round(b.bIns)}" numCol="1" spcCol="0" rtlCol="0" fromWordArt="0" anchor="${b.anchor}" anchorCtr="${b.anchorCtr ? 1 : 0}" forceAA="0"${b.upright ? ' upright="1"' : ''} compatLnSpc="1">`
    + `<a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp>${b.autofit === 'shape' ? '<a:spAutoFit/>' : b.autofit === 'norm' ? '<a:normAutofit/>' : '<a:noAutofit/>'}</wps:bodyPr>`;
}

const FILL_NAMES = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:grpFill'];
const WSP_ORDER = ['wps:cNvPr', 'wps:cNvSpPr', 'wps:cNvCnPr', 'wps:nvPr', 'wps:spPr', 'wps:style', 'wps:extLst', 'wps:txbx', 'wps:linkedTxbx', 'wps:bodyPr'] as const;

/** Aplica as mudanças ao w:drawing cru de uma forma/caixa de texto. */
export function patchShape(raw: string, ch: ShapeChange): string {
  // âncora, quebra, posição, tamanho, docPr, travas, xfrm, contorno, efeitos, 3D: os da imagem
  let xml = patchPicture(raw, ch);
  if (ch.stylePreset) xml = patchStylePreset(xml, ch.stylePreset);
  if (ch.outline !== undefined) xml = patchOutline(xml, ch.outline, readPictureFormat(raw, { anyShape: true })?.line);
  if (ch.fill !== undefined) xml = patchFill(xml, ch.fill);
  if (ch.style !== undefined) xml = patchStyle(xml, ch.style);
  if (ch.body) xml = patchBody(xml, ch.body);
  if (ch.story) xml = patchStory(xml, ch.story);
  return xml;
}

function patchFill(raw: string, f: ShapeFill): string {
  const p = partsOf(raw);
  const sp = p.spPr;
  if (!sp) return raw;
  const patch = new XmlPatch(raw);
  const cur = childElements(sp).filter((k) => FILL_NAMES.includes(k.name));
  const xml = shapeFillXml(f);
  if (cur.length) {
    patch.replace(cur[0]!, xml);
    for (const k of cur.slice(1)) patch.remove(k);
  } else if (xml) patch.insertChild(sp, 'a:solidFill', xml, SPPR_ORDER);
  return patch.apply();
}

/** Estilo de Forma: troca preenchimento e contorno do spPr pelos do estilo (os efeitos
 *  e o 3D ficam) e o wps:style. */
function patchStylePreset(raw: string, sp: { spPr: string; style: string }): string {
  const p = partsOf(raw);
  if (!p.wsp || !p.spPr) return raw;
  const patch = new XmlPatch(raw);
  const kids = childElements(p.spPr);
  const old = kids.filter((k) => FILL_NAMES.includes(k.name) || k.name === 'a:ln');
  for (const k of old) patch.remove(k);
  const geom = kids.filter((k) => k.name === 'a:xfrm' || k.name === 'a:prstGeom' || k.name === 'a:custGeom').pop();
  if (geom) patch.insertAt(geom.e!, sp.spPr);
  else if (p.spPr.cs === p.spPr.e) patch.setContent(p.spPr, sp.spPr);
  else patch.insertAt(p.spPr.cs!, sp.spPr);
  patch.putChild(p.wsp, 'wps:style', sp.style, WSP_ORDER);
  return patch.apply();
}

function patchStyle(raw: string, s: ShapeStyleRefs | null): string {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const patch = new XmlPatch(raw);
  patch.putChild(p.wsp, 'wps:style', s ? styleRefsXml(s) : '', WSP_ORDER);
  return patch.apply();
}

function patchBody(raw: string, b: Partial<TextboxBody>): string {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const el = firstChild(p.wsp, 'wps:bodyPr');
  const cur = readBody(el) ?? { ...DEFAULT_TEXTBOX_BODY };
  const next = { ...cur, ...b };
  const patch = new XmlPatch(raw);
  if (!el) { patch.insertChild(p.wsp, 'wps:bodyPr', bodyPrXml(next), WSP_ORDER); return patch.apply(); }
  // só os atributos que mudaram; o autoajuste é o filho
  const set: Record<string, string | number | undefined> = {};
  const map: [keyof TextboxBody, string, (v: never) => string | number | undefined][] = [
    ['lIns', 'lIns', (v: number) => Math.round(v)], ['tIns', 'tIns', (v: number) => Math.round(v)], ['rIns', 'rIns', (v: number) => Math.round(v)], ['bIns', 'bIns', (v: number) => Math.round(v)],
    ['anchor', 'anchor', (v: string) => v], ['anchorCtr', 'anchorCtr', (v: boolean) => (v ? 1 : 0)], ['vert', 'vert', (v: string) => v], ['wrap', 'wrap', (v: string) => v],
    ['upright', 'upright', (v: boolean) => (v ? 1 : undefined)], ['rot', 'rot', (v: number) => v],
  ] as never;
  for (const [k, attr, f] of map) if (b[k] !== undefined && b[k] !== cur[k]) set[attr] = f(b[k] as never);
  if (Object.keys(set).length) patch.setAttrs(el, set);
  if (b.autofit !== undefined && b.autofit !== cur.autofit) {
    const fitXml = b.autofit === 'shape' ? '<a:spAutoFit/>' : b.autofit === 'norm' ? '<a:normAutofit/>' : '<a:noAutofit/>';
    const old = childElements(el).find((k) => k.name === 'a:spAutoFit' || k.name === 'a:noAutofit' || k.name === 'a:normAutofit');
    if (old) patch.replace(old, fitXml);
    else if (el.cs === el.e) patch.setContent(el, fitXml);
    else patch.insertAt(el.ce!, fitXml);
  }
  return patch.apply();
}

function patchStory(raw: string, s: NonNullable<ShapeChange['story']>): string {
  const p = partsOf(raw);
  if (!p.wsp) return raw;
  const txbx = firstChild(p.wsp, 'wps:txbx'), linked = firstChild(p.wsp, 'wps:linkedTxbx');
  const cur = txbx ?? linked;
  if (!cur) return raw;
  const patch = new XmlPatch(raw);
  if (s.kind === 'linked') patch.replace(cur, `<wps:linkedTxbx id="${s.id}" seq="${s.seq}"/>`);
  else if (txbx && s.content === undefined) patch.setAttrs(txbx, { id: s.id });
  else patch.replace(cur, `<wps:txbx${s.id !== undefined ? ` id="${s.id}"` : ''}><w:txbxContent>${s.content ?? '<w:p/>'}</w:txbxContent></wps:txbx>`);
  return patch.apply();
}

// ───────────────────────── caixa nova ─────────────────────────

/** Opções da caixa de texto nova (EMU). */
export interface NewTextboxOptions {
  id: number;
  name: string;
  cx: number; cy: number;
  /** posição: deslocamento relativo à coluna/parágrafo (Desenhar) ou outra referência */
  posH?: { relativeFrom: string; offset?: number; align?: string; pct?: number; fallback?: number };
  posV?: { relativeFrom: string; offset?: number; align?: string; pct?: number; fallback?: number };
  relativeHeight: number;
  wrap?: 'none' | 'square' | 'topAndBottom';
  behindDoc?: boolean;
  dist?: { t: number; b: number; l: number; r: number };
  sizeRelH?: { relativeFrom: string; pct: number };
  sizeRelV?: { relativeFrom: string; pct: number };
  /** preenchimento/contorno/efeitos do spPr (padrão: lt1 + 6350 prstClr black) */
  fill?: ShapeFill;
  line?: PicLine | null;
  /** spPr extra (a:effectLst…) depois do contorno */
  spPrExtra?: string;
  /** os filhos do spPr depois da forma prontos (a caixa padrão do tema, a:txDef) — no
   *  lugar de fill/line/spPrExtra */
  spPrRaw?: string;
  geom?: { prst: string; adj?: Record<string, number> };
  style?: ShapeStyleRefs;
  body?: Partial<TextboxBody>;
  /** blocos do w:txbxContent */
  content: string;
  /** wps:linkedTxbx no lugar do conteúdo */
  linked?: { id: number; seq: number };
}

/** O contorno de uma caixa nova desenhada pela interface (medido no corpus). */
export const NEW_TEXTBOX_LINE: PicLine = { w: 6350, fill: { kind: 'prstClr', val: 'black' } };
export const NEW_TEXTBOX_FILL: ShapeFill = { kind: 'solid', color: { kind: 'schemeClr', val: 'lt1' } };

const posXml = (tag: string, p: NonNullable<NewTextboxOptions['posH']>): string => {
  if (p.align === undefined && p.pct !== undefined) {
    const pct = tag === 'wp:positionH' ? 'wp14:pctPosHOffset' : 'wp14:pctPosVOffset';
    return '<mc:AlternateContent><mc:Choice Requires="wp14">'
      + `<${tag} relativeFrom="${p.relativeFrom}"><${pct}>${Math.round(p.pct)}</${pct}></${tag}></mc:Choice>`
      + `<mc:Fallback><${tag} relativeFrom="page"><wp:posOffset>${Math.round(p.fallback ?? 0)}</wp:posOffset></${tag}></mc:Fallback></mc:AlternateContent>`;
  }
  return `<${tag} relativeFrom="${p.relativeFrom}">${p.align !== undefined ? `<wp:align>${p.align}</wp:align>` : `<wp:posOffset>${Math.round(p.offset ?? 0)}</wp:posOffset>`}</${tag}>`;
};

/** O w:drawing (mc:Choice) de uma caixa de texto nova, como o Word grava. */
export function newTextboxDrawingXml(o: NewTextboxOptions): string {
  const cx = Math.round(o.cx), cy = Math.round(o.cy);
  const d = o.dist ?? { t: 0, b: 0, l: 114300, r: 114300 };
  const wrap = o.wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : o.wrap === 'topAndBottom' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  const ln = o.line === null ? '<a:ln><a:noFill/></a:ln>' : picLineXmlLocal(o.line ?? NEW_TEXTBOX_LINE);
  const fill = shapeFillXml(o.fill ?? NEW_TEXTBOX_FILL);
  const geom = o.geom ?? { prst: 'rect' };
  const adj = Object.entries(geom.adj ?? {}).map(([n, v]) => `<a:gd name="${n}" fmla="val ${Math.round(v)}"/>`).join('');
  const story = o.linked ? `<wps:linkedTxbx id="${o.linked.id}" seq="${o.linked.seq}"/>` : `<wps:txbx><w:txbxContent>${o.content || '<w:p/>'}</w:txbxContent></wps:txbx>`;
  return '<w:drawing>'
    + `<wp:anchor distT="${d.t}" distB="${d.b}" distL="${d.l}" distR="${d.r}" simplePos="0" relativeHeight="${o.relativeHeight}" behindDoc="${o.behindDoc ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1">`
    + '<wp:simplePos x="0" y="0"/>'
    + posXml('wp:positionH', o.posH ?? { relativeFrom: 'column', offset: 0 })
    + posXml('wp:positionV', o.posV ?? { relativeFrom: 'paragraph', offset: 0 })
    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}`
    + `<wp:docPr id="${o.id}" name="${escAttr(o.name)}"/><wp:cNvGraphicFramePr/>`
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
    + '<wps:wsp><wps:cNvSpPr txBox="1"/>'
    + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${geom.prst}"><a:avLst${adj ? `>${adj}</a:avLst>` : '/>'}</a:prstGeom>${o.spPrRaw ?? `${fill}${ln}${o.spPrExtra ?? ''}`}</wps:spPr>`
    + (o.style ? styleRefsXml(o.style) : '')
    + story
    + bodyPrXml({ ...DEFAULT_TEXTBOX_BODY, ...(o.body ?? {}) })
    + '</wps:wsp></a:graphicData></a:graphic>'
    + (o.sizeRelH ? `<wp14:sizeRelH relativeFrom="${o.sizeRelH.relativeFrom}"><wp14:pctWidth>${Math.round(o.sizeRelH.pct)}</wp14:pctWidth></wp14:sizeRelH>` : '')
    + (o.sizeRelV ? `<wp14:sizeRelV relativeFrom="${o.sizeRelV.relativeFrom}"><wp14:pctHeight>${Math.round(o.sizeRelV.pct)}</wp14:pctHeight></wp14:sizeRelV>` : '')
    + '</wp:anchor></w:drawing>';
}

/** a:ln (o mesmo formato de picture-xml, com o a14:hiddenLine quando sem contorno). */
function picLineXmlLocal(l: PicLine): string {
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

const HIDDEN_LINE_URI = '{91240B29-F687-4F45-9708-019B960494DF}';

/** Sem contorno, como o Word grava (oráculo line-none): o a:ln com a:noFill (e a
 *  largura anterior) e, no a:extLst do spPr, o a14:hiddenLine com a linha anterior. */
export function hiddenLineXml(prev: PicLine | null | undefined): { ln: string; ext: string } {
  const w = prev?.w !== undefined ? ` w="${Math.round(prev.w)}"` : '';
  const fill = prev?.fill ? `<a:solidFill>${dmlColorXml(prev.fill)}</a:solidFill>` : '<a:solidFill><a:prstClr val="black"/></a:solidFill>';
  return {
    ln: `<a:ln${w}><a:noFill/></a:ln>`,
    ext: `<a:ext uri="${HIDDEN_LINE_URI}"><a14:hiddenLine xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"${w}>${fill}</a14:hiddenLine></a:ext>`,
  };
}

/** Contorno da forma: a linha nova (o a14:hiddenLine sai) ou "Sem Contorno" com o
 *  hiddenLine guardando a anterior. */
function patchOutline(raw: string, line: PicLine | null, prev: PicLine | null | undefined): string {
  const p = partsOf(raw);
  const sp = p.spPr;
  if (!sp) return raw;
  const patch = new XmlPatch(raw);
  const ext = firstChild(sp, 'a:extLst');
  const hid = ext && childElements(ext, 'a:ext').find((e) => e.attrs['uri'] === HIDDEN_LINE_URI);
  if (line === null) {
    const h = hiddenLineXml(prev && prev.fill !== null ? prev : { w: prev?.w ?? 6350 });
    patch.putChild(sp, 'a:ln', h.ln, SPPR_ORDER);
    if (hid) patch.replace(hid, h.ext);
    else if (ext) patch.insertAt(ext.ce!, h.ext);
    else patch.insertChild(sp, 'a:extLst', `<a:extLst>${h.ext}</a:extLst>`, SPPR_ORDER);
  } else {
    patch.putChild(sp, 'a:ln', picLineXmlLocal(line), SPPR_ORDER);
    if (hid) {
      if (childElements(ext!).length === 1) patch.remove(ext!);
      else patch.remove(hid);
    }
  }
  return patch.apply();
}

// ───────────────────────── VML de reserva ─────────────────────────

/** Número em pt como o VML do Word: sem zeros à direita, sem o 0 antes da vírgula (".5pt"), "0" sem unidade. */
export function vmlPt(emu: number): string {
  const v = Math.round((emu / 12700) * 100) / 100;
  if (v === 0) return '0';
  let s = String(v);
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = `-${s.slice(2)}`;
  return `${s}pt`;
}

const VML_NAMED: Record<string, string> = { '000000': 'black', 'FFFFFF': 'white', 'FF0000': 'red', '00FF00': 'lime', '0000FF': 'blue', 'FFFF00': 'yellow' };

/** Cor VML: nome conhecido, #rgb curto ou #rrggbb (minúsculas, como o Word). */
export function vmlColorOf(hex: string): string {
  const h = hex.toUpperCase();
  if (VML_NAMED[h]) return VML_NAMED[h]!;
  const l = h.toLowerCase();
  if (l[0] === l[1] && l[2] === l[3] && l[4] === l[5]) return `#${l[0]}${l[2]}${l[4]}`;
  return `#${l}`;
}

const H_REL: Record<string, string> = { column: 'text', page: 'page', margin: 'margin', character: 'char', leftMargin: 'left-margin-area', rightMargin: 'right-margin-area', insideMargin: 'inner-margin-area', outsideMargin: 'outer-margin-area' };
const V_REL: Record<string, string> = { paragraph: 'text', page: 'page', margin: 'margin', line: 'line', topMargin: 'top-margin-area', bottomMargin: 'bottom-margin-area', insideMargin: 'inner-margin-area', outsideMargin: 'outer-margin-area' };
const FLOW: Record<string, string> = { vert: 'layout-flow:vertical', vert270: 'layout-flow:vertical;mso-layout-flow-alt:bottom-to-top', eaVert: 'layout-flow:vertical-ideographic', mongolianVert: 'layout-flow:vertical;mso-layout-flow-alt:top-to-bottom', wordArtVert: 'layout-flow:vertical;mso-layout-flow-alt:top-to-bottom', wordArtVertRtl: 'layout-flow:vertical;mso-layout-flow-alt:top-to-bottom' };

/**
 * O mc:Fallback (VML) de uma caixa de texto a partir do w:drawing (wps), como o Word
 * o grava (oráculo textbox-lab): shapetype _x0000_t202 + v:shape com o nome do docPr
 * como id, posição/tamanho/z/quebra no style, preenchimento e contorno sólidos,
 * v:textbox com margens, direção, ajuste e o vínculo (mso-next-textbox), w10:wrap.
 * Degradê/padrão/imagem viram a cor do 1º tom (o VML de reserva é aproximado);
 * forma predefinida ≠ retângulo vira caminho próprio (o:spt 100) do contorno.
 * `color` resolve DmlColor → RRGGBB (o tema do documento); `next` = nome da caixa
 * seguinte da cadeia; `spid` = número do o:spid.
 */
export function vmlFallback(drawingXml: string, content: string, o: { color: (c: DmlColor) => string; next?: string; spid: number; outline?: (prst: string, adj: Record<string, number> | undefined, w: number, h: number) => string | null }): string {
  const f = readShapeFormat(drawingXml);
  if (!f) return '';
  const body = f.body ?? DEFAULT_TEXTBOX_BODY;
  const style: string[] = [];
  const posPart = (p: PictureFormat['posH'], axis: 'h' | 'v'): void => {
    style.push(`margin-${axis === 'h' ? 'left' : 'top'}:${p?.align !== undefined ? '0' : vmlPt(p?.offset ?? 0)}`);
  };
  if (!f.inline) {
    style.push('position:absolute');
    posPart(f.posH, 'h');
    posPart(f.posV, 'v');
  }
  style.push(`width:${vmlPt(f.cx)}`, `height:${vmlPt(f.cy)}`);
  if (f.rot) style.push(`rotation:${Math.round((f.rot / 60000) * 100) / 100}`);
  if (f.flipH || f.flipV) style.push(`flip:${[f.flipH ? 'x' : '', f.flipV ? 'y' : ''].join('')}`);
  if (!f.inline) {
    const rh = f.relativeHeight ?? 251659264;
    style.push(`z-index:${f.behindDoc ? -(rh - 2048) : rh}`);
  }
  style.push(`visibility:${f.docPr.hidden ? 'hidden' : 'visible'}`);
  style.push(`mso-wrap-style:${body.wrap}`);
  if (!f.inline) {
    style.push(`mso-wrap-distance-left:${vmlPt(f.dist.l)}`, `mso-wrap-distance-top:${vmlPt(f.dist.t)}`, `mso-wrap-distance-right:${vmlPt(f.dist.r)}`, `mso-wrap-distance-bottom:${vmlPt(f.dist.b)}`);
    const hRel = H_REL[f.posH?.relativeFrom ?? 'column'] ?? 'text', vRel = V_REL[f.posV?.relativeFrom ?? 'paragraph'] ?? 'text';
    style.push(`mso-position-horizontal:${f.posH?.align ?? 'absolute'}`, `mso-position-horizontal-relative:${hRel}`);
    style.push(`mso-position-vertical:${f.posV?.align ?? 'absolute'}`, `mso-position-vertical-relative:${vRel}`);
    if (f.sizeRelH?.pct) style.push(`mso-width-percent:${Math.round(f.sizeRelH.pct / 100)}`, `mso-width-relative:${f.sizeRelH.relativeFrom}`);
    if (f.sizeRelV?.pct) style.push(`mso-height-percent:${Math.round(f.sizeRelV.pct / 100)}`, `mso-height-relative:${f.sizeRelV.relativeFrom}`);
  }
  style.push(`v-text-anchor:${body.anchor === 'ctr' ? 'middle' : body.anchor === 'b' ? 'bottom' : 'top'}`);
  // preenchimento
  const attrs: string[] = [];
  let fillEl = '';
  const fl = f.fill;
  const color1 = fl.kind === 'solid' ? fl.color : fl.kind === 'gradient' ? fl.stops[0]?.color : fl.kind === 'pattern' ? fl.bg : undefined;
  if (fl.kind === 'none') { attrs.push('filled="f"'); fillEl = '<v:fill o:detectmouseclick="t"/>'; }
  else if (color1) {
    attrs.push(`fillcolor="${vmlColorOf(o.color(color1))}"`);
    const al = color1.mods?.find((m) => m[0] === 'alpha')?.[1];
    // alfa em 8 bits e depois 16.16 truncado (medido: 50% → 32896f)
    if (al !== undefined && al < 100000) fillEl = `<v:fill opacity="${Math.floor((Math.round((al / 100000) * 255) / 255) * 65536)}f"/>`;
  }
  // contorno
  const ln = f.line;
  let strokeEl = '';
  if (ln === null || (ln && ln.fill === null)) {
    attrs.push('stroked="f"');
    // (sem contorno a espessura da linha anterior continua — medido: line-none)
    if (ln?.w !== undefined) attrs.push(`strokeweight="${vmlPt(ln.w)}"`);
  } else if (ln) {
    if (ln.fill) {
      const c = o.color(ln.fill);
      if (c.toUpperCase() !== '000000') attrs.push(`strokecolor="${vmlColorOf(c)}"`);
    }
    attrs.push(`strokeweight="${vmlPt(ln.w ?? 9525)}"`);
    const sub: string[] = [];
    if (ln.dash && ln.dash !== 'solid') sub.push(`dashstyle="${ln.dash}"`);
    if (ln.cmpd && ln.cmpd !== 'sng') sub.push(`linestyle="${ln.cmpd}"`);
    if (sub.length) strokeEl = `<v:stroke ${sub.join(' ')}/>`;
  }
  // geometria
  const rect = f.geom === 'rect' || f.geom === 'custom';
  let typeAttr = ' type="#_x0000_t202"';
  let shapetype = rect ? '<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>' : '';
  // retângulo de cantos arredondados e elipse: os elementos próprios do VML (o Word grava
  // assim no modo de compatibilidade — oráculo c12-shape: v:roundrect arcsize)
  let tag = 'v:shape';
  if (f.geom === 'roundRect') {
    tag = 'v:roundrect';
    typeAttr = ` arcsize="${Math.round(((f.adj?.['adj'] ?? 16667) / 100000) * 65536)}f"`;
  } else if (f.geom === 'ellipse') {
    tag = 'v:oval';
    typeAttr = '';
  } else if (!rect && o.outline) {
    const cx = Math.max(1, Math.round(f.cx)), cy = Math.max(1, Math.round(f.cy));
    const path = o.outline(f.geom, f.adj, cx, cy);
    if (path) { typeAttr = ` coordsize="${cx},${cy}" o:spt="100" path="${path}"`; shapetype = ''; }
  }
  // texto
  const tbStyle: string[] = [];
  if (body.vert !== 'horz' && FLOW[body.vert]) tbStyle.push(FLOW[body.vert]!);
  if (body.autofit === 'shape') tbStyle.push('mso-fit-shape-to-text:t');
  if (o.next) tbStyle.push(`mso-next-textbox:#${o.next}`);
  const ins = [body.lIns, body.tIns, body.rIns, body.bIns];
  const defIns = ins[0] === 91440 && ins[1] === 45720 && ins[2] === 91440 && ins[3] === 45720;
  const insetAttr = defIns ? '' : ` inset="${ins.map((v) => vmlPt(v)).join(',')}"`;
  const tbAttrs = `${insetAttr}${tbStyle.length ? ` style="${tbStyle.join(';')}"` : ''}`;
  const name = f.docPr.name ?? `_x0000_s${o.spid}`;
  const alt = f.docPr.descr || f.docPr.title ? ` alt="${escAttr([f.docPr.title ? `Título: ${f.docPr.title}` : '', f.docPr.descr ? `Descrição: ${f.docPr.descr}` : ''].filter(Boolean).join(' - '))}"` : '';
  const wrapType = f.wrap === 'square' ? 'square' : f.wrap === 'tight' ? 'tight' : f.wrap === 'through' ? 'through' : f.wrap === 'topAndBottom' ? 'topAndBottom' : undefined;
  const ax = f.posH?.relativeFrom && f.posH.relativeFrom !== 'column' ? (H_REL[f.posH.relativeFrom] === 'char' ? 'char' : f.posH.relativeFrom === 'page' ? 'page' : 'margin') : undefined;
  const ay = f.posV?.relativeFrom && f.posV.relativeFrom !== 'paragraph' ? (f.posV.relativeFrom === 'line' ? 'line' : f.posV.relativeFrom === 'page' ? 'page' : 'margin') : undefined;
  const w10 = !f.inline && (wrapType || ax || ay) ? `<w10:wrap${wrapType ? ` type="${wrapType}"` : ''}${ax ? ` anchorx="${ax}"` : ''}${ay ? ` anchory="${ay}"` : ''}/>` : '';
  return `<mc:Fallback><w:pict>${shapetype}<${tag} id="${escAttr(name)}" o:spid="_x0000_s${o.spid}"${typeAttr} style="${style.join(';')}"${alt}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
    + `${fillEl}${strokeEl}<v:textbox${tbAttrs}><w:txbxContent>${content}</w:txbxContent></v:textbox>${w10}</${tag}></w:pict></mc:Fallback>`;
}

/** mc:AlternateContent completo da caixa: o wps (Choice) e o VML de reserva. */
export function textboxAlternateContent(drawingXml: string, content: string, o: Parameters<typeof vmlFallback>[2]): string {
  return `<mc:AlternateContent><mc:Choice Requires="wps">${drawingXml}</mc:Choice>${vmlFallback(drawingXml, content, o)}</mc:AlternateContent>`;
}

/** O conteúdo (blocos) do w:txbxContent de um w:drawing cru — ou '' sem caixa. */
export function txbxContentOf(drawingXml: string): string | undefined {
  const m = /<w:txbxContent\b[^>]*>([\s\S]*?)<\/w:txbxContent>/.exec(drawingXml);
  return m ? m[1] : undefined;
}

