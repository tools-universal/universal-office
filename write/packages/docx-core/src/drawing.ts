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
  /** contorno justo/através: caixa do wp:wrapPolygon em frações (0..1) do extent —
   *  o texto contorna ela, não a figura inteira (oráculo wrappoly) */
  wrapBox?: { x0: number; y0: number; x1: number; y1: number };
  /** o wp:wrapPolygon quando NÃO é um retângulo (frações 0..1 do extent): o texto
   *  segue o contorno linha a linha (oráculo wrapcontour) */
  wrapPoly?: [number, number][];
}

/** Aparência de uma forma (preenchimento/contorno). */
export interface ShapeStyle {
  /** preset geometry (rect, roundRect, ellipse, line, …) ou 'custom'. */
  geom: string;
  /** RRGGBB; undefined = sem preenchimento. */
  fill?: string;
  fillAlpha?: number;
  /** contorno; undefined = sem linha. */
  line?: { color: string; widthPt: number; dash?: string; alpha?: number; ref?: number };
  /** espessura do contorno PARA O RECUO do texto da caixa, mesmo sem preenchimento da linha:
   *  w = a:ln@w (pt); ref = índice do lnRef (largura do tema) — oráculo txbxln */
  lineInset?: { w?: number; ref?: number };
  /** graus, horário. */
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** gradiente (a:gradFill): 1ª e última paradas + todas as paradas (pos 0..1),
   *  a:lin (ângulo, scaled), rotWithShape e a:path (circle/rect/shape + fillToRect) */
  gradient?: {
    from: string; to: string; angleDeg: number;
    stops?: { pos: number; color: string }[];
    scaled?: boolean; rotWithShape?: boolean;
    path?: string; fillTo?: { l: number; t: number; r: number; b: number };
  };
  /** a:custGeom: caminhos já numéricos */
  cust?: CustPath[];
  /** ajustes da geometria predefinida (a:avLst: nome → valor de "val N") */
  adj?: Record<string, number>;
  /** sombra externa (a:outerShdw): deslocamento (twips), cor, opacidade, desfoque (twips) */
  shadow?: { dx: number; dy: number; color: string; alpha?: number; blur?: number };
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

/** Filho do wp:anchor, também dentro de mc:AlternateContent (posição relativa em
 *  %: o Word grava wp14:pctPosHOffset no mc:Choice e a posição absoluta no
 *  mc:Fallback — oráculo image-lab pct-pos). */
export function anchorChild(anchor: XmlElement, name: string): XmlElement | undefined {
  const direct = firstChild(anchor, name);
  if (direct) return direct;
  for (const ac of childElements(anchor, 'mc:AlternateContent')) {
    const choice = firstChild(ac, 'mc:Choice');
    const el = (choice && firstChild(choice, name)) ?? (() => { const fb = firstChild(ac, 'mc:Fallback'); return fb && firstChild(fb, name); })();
    if (el) return el;
  }
  return undefined;
}

/** Âncora de um wp:anchor (undefined para wp:inline). */
export function readWpAnchor(anchor: XmlElement | undefined): DrawingAnchor | undefined {
  if (!anchor) return undefined;
  const a = anchor.attrs;
  let wrap: WrapType = 'none';
  let wrapText: DrawingAnchor['wrapText'];
  let wrapBox: DrawingAnchor['wrapBox'];
  let wrapPoly: DrawingAnchor['wrapPoly'];
  const polyBox = (w: XmlElement): DrawingAnchor['wrapBox'] => {
    const poly = firstChild(w, 'wp:wrapPolygon');
    if (!poly) return undefined;
    const pts = childElements(poly).filter((e) => e.name === 'wp:start' || e.name === 'wp:lineTo')
      .map((e) => [parseInt(e.attrs['x'] ?? '0', 10) || 0, parseInt(e.attrs['y'] ?? '0', 10) || 0] as const);
    if (pts.length < 3) return undefined;
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
    // retângulo (só os 4 cantos da caixa): vale a caixa; senão, o contorno
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i]!, [bx, by] = pts[(i + 1) % pts.length]!; area += ax * by - bx * ay; }
    if (Math.abs(Math.abs(area) / 2 - (x1 - x0) * (y1 - y0)) > 1e-6 * 21600 * 21600) wrapPoly = pts.map(([x, y]) => [x / 21600, y / 21600]);
    return { x0: x0 / 21600, y0: y0 / 21600, x1: x1 / 21600, y1: y1 / 21600 };
  };
  for (const c of childElements(anchor)) {
    switch (c.name) {
      case 'wp:wrapNone': wrap = 'none'; break;
      case 'wp:wrapSquare': wrap = 'square'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; break;
      case 'wp:wrapTight': wrap = 'tight'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; wrapBox = polyBox(c); break;
      case 'wp:wrapThrough': wrap = 'through'; wrapText = c.attrs['wrapText'] as DrawingAnchor['wrapText']; wrapBox = polyBox(c); break;
      case 'wp:wrapTopAndBottom': wrap = 'topAndBottom'; break;
    }
  }
  const out: DrawingAnchor = {
    wrap,
    posH: readPos(anchorChild(anchor, 'wp:positionH'), 'column'),
    posV: readPos(anchorChild(anchor, 'wp:positionV'), 'paragraph'),
  };
  if (wrapText) out.wrapText = wrapText;
  if (wrapBox) out.wrapBox = wrapBox;
  if (wrapPoly && (wrap === 'tight' || wrap === 'through')) out.wrapPoly = wrapPoly;
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
  // referência de tema (@tx1, @accent1…) fica como está — o motor resolve pelo nome
  const out: { hex: string; alpha?: number } = { hex: hex.startsWith('@') ? hex : hex.toUpperCase() };
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
  const prstEl = firstChild(spPr, 'a:prstGeom');
  const prst = prstEl?.attrs['prst'];
  if (prst) st.geom = prst;
  const av = prstEl && firstChild(prstEl, 'a:avLst');
  for (const gd of av ? childElements(av, 'a:gd') : []) {
    const m = /^val\s+(-?\d+)/.exec(gd.attrs['fmla'] ?? '');
    if (m && gd.attrs['name']) (st.adj ??= {})[gd.attrs['name']] = parseInt(m[1]!, 10);
  }
  const cg = !prst ? firstChild(spPr, 'a:custGeom') : undefined;
  if (cg) {
    st.geom = 'custom';
    const ext = firstChild(firstChild(spPr, 'a:xfrm') ?? spPr, 'a:ext');
    const paths = readCustGeom(cg, parseInt(ext?.attrs['cx'] ?? '0', 10) || 0, parseInt(ext?.attrs['cy'] ?? '0', 10) || 0);
    if (paths.length) st.cust = paths;
  }
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
    const gf = firstChild(spPr, 'a:gradFill')!;
    const lin = findDeep(gf, 'a:lin');
    if (from && to) {
      st.gradient = { from: from.hex, to: to.hex, angleDeg: (parseInt(lin?.attrs['ang'] ?? '0', 10) || 0) / 60000 };
      const g = st.gradient;
      g.stops = stops.map((s) => ({ pos: (parseInt(s.attrs['pos'] ?? '0', 10) || 0) / 100000, color: srgbOf(s)?.hex ?? '000000' }))
        .sort((a, b) => a.pos - b.pos);
      if (lin && lin.attrs['scaled'] !== undefined) g.scaled = lin.attrs['scaled'] === '1' || lin.attrs['scaled'] === 'true';
      if (gf.attrs['rotWithShape'] !== undefined) g.rotWithShape = gf.attrs['rotWithShape'] === '1' || gf.attrs['rotWithShape'] === 'true';
      const path = firstChild(gf, 'a:path');
      if (path) {
        g.path = path.attrs['path'] ?? 'circle';
        const ft = firstChild(path, 'a:fillToRect');
        const f = (k: string) => (parseInt(ft?.attrs[k] ?? '0', 10) || 0) / 100000;
        if (ft) g.fillTo = { l: f('l'), t: f('t'), r: f('r'), b: f('b') };
      }
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
  const eff = firstChild(spPr, 'a:effectLst');
  const shd = eff && firstChild(eff, 'a:outerShdw');
  if (shd) {
    const c = srgbOf(shd);
    const dist = (parseInt(shd.attrs['dist'] ?? '0', 10) || 0) / EMU_PER_TWIP_D;
    const dir = ((parseInt(shd.attrs['dir'] ?? '0', 10) || 0) / 60000) * (Math.PI / 180);
    if (c) {
      st.shadow = { dx: dist * Math.cos(dir), dy: dist * Math.sin(dir), color: c.hex };
      if (c.alpha !== undefined) st.shadow.alpha = c.alpha;
      const blur = (parseInt(shd.attrs['blurRad'] ?? '0', 10) || 0) / EMU_PER_TWIP_D;
      if (blur) st.shadow.blur = blur;
    }
  }
  const ln = firstChild(spPr, 'a:ln');
  const lnRef = styleEl && firstChild(styleEl, 'a:lnRef');
  // o Word afasta o texto da caixa meia espessura do contorno, mesmo com a linha sem
  // preenchimento: a do a:ln@w ou, sem ela, a da linha do tema do lnRef (oráculo txbxln)
  const refIdx = lnRef ? parseInt(lnRef.attrs['idx'] ?? '0', 10) || 0 : 0;
  if (ln?.attrs['w']) st.lineInset = { w: parseInt(ln.attrs['w'], 10) / 12700 };
  else if (refIdx > 0) st.lineInset = { ref: refIdx };
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
    if (c) st.line = { color: c.hex, widthPt: ln?.attrs['w'] ? parseInt(ln.attrs['w'], 10) / 12700 : 0.75, ...(ln?.attrs['w'] ? {} : { ref: refIdx }) };
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

// ───────────────────────── a:custGeom ─────────────────────────

/** Comando de um caminho de a:custGeom já em números (unidades do caminho; ângulos em graus). */
export type CustCmd =
  | { op: 'M' | 'L'; x: number; y: number }
  | { op: 'C' | 'Q'; pts: [number, number][] }
  | { op: 'A'; wR: number; hR: number; st: number; sw: number }
  | { op: 'Z' };

/** Caminho de a:custGeom: espaço próprio (w × h; sem w/h = o da forma em EMU), preenche/contorna. */
export interface CustPath { w: number; h: number; fill: boolean; stroke: boolean; cmds: CustCmd[] }

/**
 * a:custGeom → caminhos numéricos. As guias (a:avLst/a:gdLst) são avaliadas com
 * as fórmulas do DrawingML sobre as dimensões da forma em EMU (cx × cy).
 */
export function readCustGeom(cg: XmlElement, cx: number, cy: number): CustPath[] {
  const w = cx || 1, h = cy || 1, ss = Math.min(w, h), ls = Math.max(w, h);
  const v: Record<string, number> = {
    w, h, l: 0, t: 0, r: w, b: h, hc: w / 2, vc: h / 2, ss, ls,
    cd2: 10800000, cd4: 5400000, cd8: 2700000, '3cd4': 16200000, '3cd8': 8100000, '5cd8': 13500000, '7cd8': 18900000,
  };
  for (const k of [2, 3, 4, 5, 6, 8, 10, 12, 16, 32]) { v[`wd${k}`] = w / k; v[`hd${k}`] = h / k; v[`ssd${k}`] = ss / k; }
  const num = (s: string | undefined): number => {
    if (s === undefined) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : own(v, s) ?? 0;
  };
  const rad = (a: number) => (a / 60000) * (Math.PI / 180);
  const evalGd = (f: string): number => {
    const [op, ...a] = f.trim().split(/\s+/);
    const [x = 0, y = 0, z = 0] = a.map(num);
    switch (op) {
      case '*/': return z ? (x * y) / z : 0;
      case '+-': return x + y - z;
      case '+/': return z ? (x + y) / z : 0;
      case '?:': return x > 0 ? y : z;
      case 'abs': return Math.abs(x);
      case 'at2': return (Math.atan2(y, x) * 180 / Math.PI) * 60000;
      case 'cat2': return x * Math.cos(Math.atan2(z, y));
      case 'sat2': return x * Math.sin(Math.atan2(z, y));
      case 'cos': return x * Math.cos(rad(y));
      case 'sin': return x * Math.sin(rad(y));
      case 'tan': return x * Math.tan(rad(y));
      case 'max': return Math.max(x, y);
      case 'min': return Math.min(x, y);
      case 'mod': return Math.sqrt(x * x + y * y + z * z);
      case 'pin': return y < x ? x : y > z ? z : y;
      case 'sqrt': return Math.sqrt(Math.max(0, x));
      case 'val': return x;
      default: return 0;
    }
  };
  for (const lst of ['a:avLst', 'a:gdLst']) {
    const el = firstChild(cg, lst);
    for (const gd of el ? childElements(el, 'a:gd') : []) {
      const name = gd.attrs['name'];
      if (name) v[name] = evalGd(gd.attrs['fmla'] ?? 'val 0');
    }
  }
  const out: CustPath[] = [];
  const pl = firstChild(cg, 'a:pathLst');
  for (const p of pl ? childElements(pl, 'a:path') : []) {
    const path: CustPath = {
      w: num(p.attrs['w']) || w, h: num(p.attrs['h']) || h,
      fill: p.attrs['fill'] !== 'none', stroke: p.attrs['stroke'] !== '0' && p.attrs['stroke'] !== 'false',
      cmds: [],
    };
    const pts = (el: XmlElement): [number, number][] => childElements(el, 'a:pt').map((q) => [num(q.attrs['x']), num(q.attrs['y'])]);
    for (const c of childElements(p)) {
      switch (c.name) {
        case 'a:moveTo': case 'a:lnTo': {
          const q = pts(c)[0];
          if (q) path.cmds.push({ op: c.name === 'a:moveTo' ? 'M' : 'L', x: q[0], y: q[1] });
          break;
        }
        case 'a:cubicBezTo': path.cmds.push({ op: 'C', pts: pts(c) }); break;
        case 'a:quadBezTo': path.cmds.push({ op: 'Q', pts: pts(c) }); break;
        case 'a:arcTo':
          path.cmds.push({ op: 'A', wR: num(c.attrs['wR']), hR: num(c.attrs['hR']), st: num(c.attrs['stAng']) / 60000, sw: num(c.attrs['swAng']) / 60000 });
          break;
        case 'a:close': path.cmds.push({ op: 'Z' }); break;
      }
    }
    if (path.cmds.length) out.push(path);
  }
  return out;
}

export { findDeep as findDeepDrawing, textOf as textOfDrawing };
