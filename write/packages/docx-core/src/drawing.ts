import { childElements, firstChild, type XmlElement } from './xml.js';

/**
 * Geometria/posicionamento de objetos de desenho (DrawingML wp:anchor e VML
 * position:absolute) normalizados para TWIPS — o que o motor de layout precisa
 * para posicionar e contornar (wrap) o objeto como o Word.
 */

export type WrapType = 'inline' | 'none' | 'square' | 'tight' | 'through' | 'topAndBottom';

export interface AnchorPos {
  /** page | margin | column | character | paragraph | line | leftMargin |
   *  rightMargin | insideMargin | outsideMargin | topMargin | bottomMargin */
  relativeFrom: string;
  /** left | center | right | inside | outside | top | bottom */
  align?: string;
  /** deslocamento em twips (posOffset). */
  offset?: number;
  /** wp14:pctPosHOffset/pctPosVOffset (milésimos de %). */
  pct?: number;
}

export interface DrawingAnchor {
  wrap: WrapType;
  wrapText?: 'bothSides' | 'left' | 'right' | 'largest';
  behindDoc?: boolean;
  /** distâncias do texto (twips). */
  distT?: number;
  distB?: number;
  distL?: number;
  distR?: number;
  /** wp:simplePos (twips, relativo à página) quando simplePos="1". */
  simplePos?: { x: number; y: number };
  posH: AnchorPos;
  posV: AnchorPos;
  relativeHeight?: number;
  layoutInCell?: boolean;
  allowOverlap?: boolean;
  /** wp:effectExtent (twips) — sombra/brilho fora do extent. */
  effectExtent?: { l: number; t: number; r: number; b: number };
}

/** Aparência de uma forma (preenchimento/contorno). */
export interface ShapeStyle {
  /** preset geometry (rect, roundRect, ellipse, line, …) ou 'custom'. */
  geom: string;
  /** RRGGBB; undefined = sem preenchimento. */
  fill?: string;
  fillAlpha?: number;
  /** contorno; undefined = sem linha. */
  line?: { color: string; widthPt: number; dash?: string; alpha?: number };
  /** graus, horário. */
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** gradiente simplificado (1ª e última paradas) quando há a:gradFill. */
  gradient?: { from: string; to: string; angleDeg: number };
}

export const EMU_PER_TWIP_D = 635;

const emuTw = (v: string | undefined): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n / EMU_PER_TWIP_D : undefined;
};

function findDeep(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const f = findDeep(c, name);
    if (f) return f;
  }
  return undefined;
}

function textOf(el: XmlElement): string {
  let s = '';
  for (const c of el.children) s += typeof c === 'string' ? c : textOf(c);
  return s;
}

function readPos(el: XmlElement | undefined, defFrom: string): AnchorPos {
  const pos: AnchorPos = { relativeFrom: el?.attrs['relativeFrom'] ?? defFrom };
  if (!el) return pos;
  const align = firstChild(el, 'wp:align');
  if (align) pos.align = textOf(align).trim();
  const off = firstChild(el, 'wp:posOffset');
  if (off) pos.offset = (parseInt(textOf(off).trim(), 10) || 0) / EMU_PER_TWIP_D;
  const pct = firstChild(el, 'wp14:pctPosHOffset') ?? firstChild(el, 'wp14:pctPosVOffset');
  if (pct) pos.pct = parseInt(textOf(pct).trim(), 10) || 0;
  return pos;
}

/** Âncora de um wp:anchor (undefined para wp:inline). */
export function readWpAnchor(anchor: XmlElement | undefined): DrawingAnchor | undefined {
  if (!anchor) return undefined;
  const a = anchor.attrs;
  let wrap: WrapType = 'none';
  let wrapText: DrawingAnchor['wrapText'];
  for (const c of childElements(anchor)) {
    switch (c.name) {
      case 'wp:wrapNone': wrap = 'none'; break;
      case 'wp:wrapSquare': wrap = 'square'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; break;
      case 'wp:wrapTight': wrap = 'tight'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; break;
      case 'wp:wrapThrough': wrap = 'through'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; break;
      case 'wp:wrapTopAndBottom': wrap = 'topAndBottom'; break;
    }
  }
  const out: DrawingAnchor = {
    wrap,
    posH: readPos(firstChild(anchor, 'wp:positionH'), 'column'),
    posV: readPos(firstChild(anchor, 'wp:positionV'), 'paragraph'),
  };
  if (wrapText) out.wrapText = wrapText;
  if (a['behindDoc'] === '1' || a['behindDoc'] === 'true') out.behindDoc = true;
  for (const k of ['distT', 'distB', 'distL', 'distR'] as const) {
    const v = emuTw(a[k]);
    if (v !== undefined) out[k] = v;
  }
  if (a['simplePos'] === '1' || a['simplePos'] === 'true') {
    const sp = firstChild(anchor, 'wp:simplePos');
    out.simplePos = { x: emuTw(sp?.attrs['x']) ?? 0, y: emuTw(sp?.attrs['y']) ?? 0 };
  }
  if (a['relativeHeight']) out.relativeHeight = parseInt(a['relativeHeight'], 10) || 0;
  if (a['layoutInCell'] !== undefined) out.layoutInCell = a['layoutInCell'] === '1' || a['layoutInCell'] === 'true';
  if (a['allowOverlap'] !== undefined) out.allowOverlap = a['allowOverlap'] === '1' || a['allowOverlap'] === 'true';
  const ee = firstChild(anchor, 'wp:effectExtent');
  if (ee) {
    out.effectExtent = {
      l: emuTw(ee.attrs['l']) ?? 0, t: emuTw(ee.attrs['t']) ?? 0,
      r: emuTw(ee.attrs['r']) ?? 0, b: emuTw(ee.attrs['b']) ?? 0,
    };
  }
  return out;
}

/** Valor PRÓPRIO de um registro (nomes vindos do arquivo não herdam de Object.prototype). */
const own = <T>(rec: Record<string, T> | undefined, k: string | undefined): T | undefined =>
  rec && k !== undefined && Object.hasOwn(rec, k) ? rec[k] : undefined;

function srgbOf(el: XmlElement | undefined, theme?: Record<string, string>): { hex: string; alpha?: number } | undefined {
  if (!el) return undefined;
  const c = firstChild(el, 'a:srgbClr') ?? firstChild(el, 'a:schemeClr') ?? firstChild(el, 'a:sysClr') ?? firstChild(el, 'a:prstClr');
  if (!c) return undefined;
  let hex: string | undefined;
  if (c.name === 'a:srgbClr') hex = c.attrs['val'];
  else if (c.name === 'a:sysClr') hex = c.attrs['lastClr'] ?? (c.attrs['val'] === 'window' ? 'FFFFFF' : '000000');
  else if (c.name === 'a:schemeClr') {
    const key = c.attrs['val'] ?? '';
    const map: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
    hex = own(theme, own(map, key) ?? key) ?? `@${key}`;
  } else if (c.name === 'a:prstClr') {
    const named: Record<string, string> = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '00FF00', blue: '0000FF', yellow: 'FFFF00', gray: '808080' };
    hex = own(named, c.attrs['val'] ?? '') ?? '000000';
  }
  if (!hex) return undefined;
  const alphaEl = firstChild(c, 'a:alpha');
  const out: { hex: string; alpha?: number } = { hex: hex.toUpperCase() };
  if (alphaEl) out.alpha = (parseInt(alphaEl.attrs['val'] ?? '100000', 10) || 0) / 100000;
  // lumMod/lumOff/tint/shade ficam com o motor (precisa do tema); registramos cru
  const mods = childElements(c).filter((m) => m.name !== 'a:alpha').map((m) => `${m.name.slice(2)}=${m.attrs['val']}`);
  if (mods.length) out.hex = `${out.hex}|${mods.join(',')}`;
  return out;
}

/** Estilo de forma de um wps:spPr / pic:spPr (preenchimento, contorno, geometria). */
export function readSpPr(spPr: XmlElement | undefined, styleEl?: XmlElement): ShapeStyle {
  const st: ShapeStyle = { geom: 'rect' };
  if (!spPr) return st;
  const prst = firstChild(spPr, 'a:prstGeom')?.attrs['prst'];
  if (prst) st.geom = prst;
  else if (firstChild(spPr, 'a:custGeom')) st.geom = 'custom';
  const xfrm = firstChild(spPr, 'a:xfrm');
  if (xfrm) {
    const rot = parseInt(xfrm.attrs['rot'] ?? '0', 10);
    if (rot) st.rot = rot / 60000;
    if (xfrm.attrs['flipH'] === '1') st.flipH = true;
    if (xfrm.attrs['flipV'] === '1') st.flipV = true;
  }
  if (firstChild(spPr, 'a:noFill')) { /* sem preenchimento */ }
  else if (firstChild(spPr, 'a:solidFill')) {
    const c = srgbOf(firstChild(spPr, 'a:solidFill'));
    if (c) { st.fill = c.hex; if (c.alpha !== undefined) st.fillAlpha = c.alpha; }
  } else if (firstChild(spPr, 'a:gradFill')) {
    const gs = findDeep(firstChild(spPr, 'a:gradFill')!, 'a:gsLst');
    const stops = gs ? childElements(gs, 'a:gs') : [];
    const from = srgbOf(stops[0]);
    const to = srgbOf(stops[stops.length - 1]);
    const lin = findDeep(firstChild(spPr, 'a:gradFill')!, 'a:lin');
    if (from && to) {
      st.gradient = { from: from.hex, to: to.hex, angleDeg: (parseInt(lin?.attrs['ang'] ?? '0', 10) || 0) / 60000 };
      st.fill = from.hex;
    }
  } else if (styleEl) {
    // sem fill explícito: wps:style/a:fillRef (cor do tema)
    const fillRef = firstChild(styleEl, 'a:fillRef');
    if (fillRef && fillRef.attrs['idx'] !== '0') {
      const c = srgbOf(fillRef);
      if (c) st.fill = c.hex;
    }
  }
  const ln = firstChild(spPr, 'a:ln');
  const lnRef = styleEl && firstChild(styleEl, 'a:lnRef');
  if (ln && firstChild(ln, 'a:noFill')) { /* sem linha */ }
  else if (ln && firstChild(ln, 'a:solidFill')) {
    const c = srgbOf(firstChild(ln, 'a:solidFill'));
    if (c) {
      st.line = { color: c.hex, widthPt: ln.attrs['w'] ? parseInt(ln.attrs['w'], 10) / 12700 : 0.75 };
      if (c.alpha !== undefined) st.line.alpha = c.alpha;
      const dash = firstChild(ln, 'a:prstDash')?.attrs['val'];
      if (dash && dash !== 'solid') st.line.dash = dash;
    }
  } else if (lnRef && lnRef.attrs['idx'] !== '0') {
    const c = srgbOf(lnRef);
    if (c) st.line = { color: c.hex, widthPt: ln?.attrs['w'] ? parseInt(ln.attrs['w'], 10) / 12700 : 0.75 };
  }
  return st;
}

// ───────────────────────── VML ─────────────────────────

/** Converte um comprimento CSS do VML (pt, in, px, cm, mm, em sem unidade = px). */
export function vmlLenTwips(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^(-?[0-9.]+)\s*(pt|in|px|cm|mm|pc|em)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  switch (m[2]) {
    case 'pt': return n * 20;
    case 'in': return n * 1440;
    case 'cm': return (n / 2.54) * 1440;
    case 'mm': return (n / 25.4) * 1440;
    case 'pc': return n * 240;
    case 'em': return n * 240;
    default: return n * 15; // px (96 dpi) = 15 twips
  }
}

export function parseVmlStyle(style: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of (style ?? '').split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    out[decl.slice(0, i).trim().toLowerCase()] = decl.slice(i + 1).trim();
  }
  return out;
}

/** Âncora a partir do style do VML (position:absolute + mso-position-*). */
export function vmlAnchor(style: Record<string, string>, wrapEl?: XmlElement): DrawingAnchor | undefined {
  if (style['position'] !== 'absolute') return undefined;
  const hRel = style['mso-position-horizontal-relative'] ?? 'text';
  const vRel = style['mso-position-vertical-relative'] ?? 'text';
  const relMap: Record<string, string> = {
    text: 'column', page: 'page', margin: 'margin', char: 'character', line: 'line',
    'left-margin-area': 'leftMargin', 'right-margin-area': 'rightMargin',
    'top-margin-area': 'topMargin', 'bottom-margin-area': 'bottomMargin',
    'inner-margin-area': 'insideMargin', 'outer-margin-area': 'outsideMargin',
  };
  const vRelMap: Record<string, string> = { ...relMap, text: 'paragraph' };
  const posH: AnchorPos = { relativeFrom: own(relMap, hRel) ?? 'column' };
  const posV: AnchorPos = { relativeFrom: own(vRelMap, vRel) ?? 'paragraph' };
  const hAlign = style['mso-position-horizontal'];
  if (hAlign && hAlign !== 'absolute') posH.align = hAlign;
  else posH.offset = (vmlLenTwips(style['margin-left']) ?? 0) + (vmlLenTwips(style['left']) ?? 0);
  const vAlign = style['mso-position-vertical'];
  if (vAlign && vAlign !== 'absolute') posV.align = vAlign;
  else posV.offset = (vmlLenTwips(style['margin-top']) ?? 0) + (vmlLenTwips(style['top']) ?? 0);
  const z = parseInt(style['z-index'] ?? '0', 10) || 0;
  const wrapType = wrapEl?.attrs['type'];
  const anchor: DrawingAnchor = {
    wrap: wrapType === 'square' ? 'square' : wrapType === 'tight' ? 'tight' : wrapType === 'through' ? 'through'
      : wrapType === 'topAndBottom' ? 'topAndBottom' : 'none',
    posH, posV,
    relativeHeight: z,
  };
  if (z < 0) anchor.behindDoc = true;
  for (const [k, css] of [['distL', 'mso-wrap-distance-left'], ['distR', 'mso-wrap-distance-right'], ['distT', 'mso-wrap-distance-top'], ['distB', 'mso-wrap-distance-bottom']] as const) {
    const v = vmlLenTwips(style[css]);
    if (v !== undefined) anchor[k] = v;
  }
  return anchor;
}

const VML_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00',
  gray: '808080', grey: '808080', silver: 'C0C0C0', navy: '000080', maroon: '800000', teal: '008080',
  olive: '808000', purple: '800080', fuchsia: 'FF00FF', aqua: '00FFFF', lime: '00FF00', window: 'FFFFFF',
};

/** Cor VML ("#rrggbb", "#rgb", nome, "#xxxxxx [n]") → RRGGBB. */
export function vmlColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim().split(/\s+/)[0]!.toLowerCase();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) return h.split('').map((c) => c + c).join('').toUpperCase();
    if (h.length >= 6) return h.slice(0, 6).toUpperCase();
  }
  return own(VML_COLORS, s);
}

/** Estilo de forma VML (fill/stroke por atributos e filhos v:fill / v:stroke). */
export function vmlShapeStyle(el: XmlElement, geom: string): ShapeStyle {
  const st: ShapeStyle = { geom };
  const a = el.attrs;
  const fillEl = firstChild(el, 'v:fill');
  const strokeEl = firstChild(el, 'v:stroke');
  const filled = a['filled'] ?? fillEl?.attrs['on'];
  if (filled !== 'f' && filled !== 'false') {
    const fc = vmlColor(fillEl?.attrs['color'] ?? a['fillcolor']) ?? (a['fillcolor'] === undefined && !fillEl ? 'FFFFFF' : undefined);
    if (fc) st.fill = fc;
    const op = fillEl?.attrs['opacity'];
    if (op) st.fillAlpha = op.endsWith('f') ? parseInt(op, 10) / 65536 : parseFloat(op);
  }
  const stroked = a['stroked'] ?? strokeEl?.attrs['on'];
  if (stroked !== 'f' && stroked !== 'false') {
    const sc = vmlColor(strokeEl?.attrs['color'] ?? a['strokecolor']) ?? '000000';
    const sw = a['strokeweight'] ?? strokeEl?.attrs['weight'];
    st.line = { color: sc, widthPt: sw ? (vmlLenTwips(sw.endsWith('t') || /[a-z]$/.test(sw) ? sw : `${sw}pt`) ?? 15) / 20 : 0.75 };
    const dash = strokeEl?.attrs['dashstyle'];
    if (dash && dash !== 'solid') st.line.dash = dash;
  }
  const rot = parseFloat(parseVmlStyle(a['style'])['rotation'] ?? '0');
  if (rot) st.rot = rot;
  const flip = parseVmlStyle(a['style'])['flip'] ?? '';
  if (flip.includes('x')) st.flipH = true;
  if (flip.includes('y')) st.flipV = true;
  return st;
}

export { findDeep as findDeepDrawing, textOf as textOfDrawing };
