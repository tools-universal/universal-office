/**
 * Formas OfficeArt → elementos do spTree (`<p:sp>`, `<p:pic>`, `<p:cxnSp>`,
 * `<p:grpSp>`), com as propriedades do FOPT traduzidas para DrawingML:
 * posição (âncora + rotação/espelhamento), geometria (preset/custom),
 * preenchimento, contorno, sombra, texto e placeholder.
 *
 * Tudo é escrito explicitamente; com round-trip, a aparência gravada pelo
 * PowerPoint 2007+ no metroBlob (shapexml) sobrepõe a do binário.
 */
import { FSP, type OAShape, type OAProp } from './officeart.js';
import { RT, children, readRec, ByteReader, type Rec, utf16 } from './records.js';
import { readClientTextbox, readStyleTextProp9, type TextBlock } from './text.js';
import { presetFor, isConnectorType, isWordArtType, type RawAdjust } from './preset-map.js';
import { paragraphsXml, emu, hex3 } from './textconv.js';
import { metroVisual, metroTextBody } from './roundtrip.js';
import { DEFAULT_SCHEME, type ConvCtx, type PartCtx } from './context.js';
import { el, escText } from './xmlw.js';

// ───────────────────────────── propriedades ─────────────────────────────

const prop = (sh: OAShape, id: number): number | undefined => sh.props.get(id)?.value;
const propS = (sh: OAShape, id: number): number | undefined => {
  const v = sh.props.get(id)?.value;
  return v === undefined ? undefined : v | 0;
};

/**
 * Booleano de um conjunto de flags (0x..BF/FF): bit `bit` = valor, bit+16 =
 * "fUse" (valor especificado). Escritores antigos não gravam os fUse: sem
 * nenhum fUse no conjunto, o valor vale como está.
 */
function boolProp(sh: OAShape, id: number, bit: number, dflt: boolean): boolean {
  const p = sh.props.get(id);
  if (!p) return dflt;
  const v = p.value;
  if (v & (1 << (bit + 16))) return (v & (1 << bit)) !== 0;
  if ((v >>> 16) === 0) return (v & (1 << bit)) !== 0;
  return dflt;
}

/** 16.16 fixo com sinal → número. */
const fixed = (v: number | undefined, dflt = 0): number => v === undefined ? dflt : (v | 0) / 65536;

/** String UTF-16 de uma propriedade complexa (sem o terminador). */
function propString(p: OAProp | undefined): string | undefined {
  if (!p?.complex || p.complex.length < 2) return undefined;
  const r = new ByteReader(p.complex);
  let s = utf16(r, 0, p.complex.length);
  const z = s.indexOf('\0');
  if (z >= 0) s = s.slice(0, z);
  return s || undefined;
}

/** IMsoArray (nElems, nElemsAlloc, cbElem + dados) → elementos crus. */
function msoArray(p: OAProp | undefined): { n: number; size: number; r: ByteReader; off: number } | undefined {
  if (!p?.complex || p.complex.length < 6) return undefined;
  const r = new ByteReader(p.complex);
  const n = r.u16(0);
  let size = r.u16(4);
  if (size === 0xfff0) size = 4;
  if (size === 0) return undefined;
  return { n: Math.min(n, Math.floor((p.complex.length - 6) / size)), size, r, off: 6 };
}

// ───────────────────────────── cores ─────────────────────────────

/** Cores de sistema (GetSysColor) com os valores padrão do Windows. */
const SYS_COLORS = [
  'C8C8C8', '000000', '99B4D1', 'BFCDDB', 'F0F0F0', 'FFFFFF', '646464', '000000', '000000', '000000',
  'B4B4B4', 'F4F7FC', 'ABABAB', '3399FF', 'FFFFFF', 'F0F0F0', 'A0A0A0', '6D6D6D', '000000', '434E54',
  'FFFFFF', '696969', 'E3E3E3', '000000', 'FFFFE1',
];

/**
 * OfficeArtCOLORREF → 'RRGGBB'. Byte alto: 0x08 = índice no esquema (byte
 * vermelho), 0x10 = cor de sistema/especial (0xF0 = cor do preenchimento,
 * 0xF2 = da linha… + função de clarear/escurecer no 2º byte e parâmetro no 3º).
 */
export function oaColor(value: number, sh: OAShape, pc: PartCtx, depth = 0): string {
  const flags = (value >>> 24) & 0xff;
  const r = value & 0xff, g = (value >>> 8) & 0xff, b = (value >>> 16) & 0xff;
  if (flags & 0x08) return pc.scheme[r] ?? DEFAULT_SCHEME[r] ?? '000000';
  if (flags & 0x10) {
    const idx = value & 0xff;
    const fn = (value >>> 8) & 0x0f;
    const invert = ((value >>> 8) & 0x20) !== 0;
    const param = (value >>> 16) & 0xff;
    let base: string;
    const sub = (id: number, d: number): string => depth > 2 ? '000000' : oaColor(prop(sh, id) ?? d, sh, pc, depth + 1);
    switch (idx) {
      case 0xf0: base = sub(0x181, 0xffffff); break;
      case 0xf1: base = boolProp(sh, 0x1ff, 3, true) ? sub(0x1c0, 0) : sub(0x181, 0xffffff); break;
      case 0xf2: base = sub(0x1c0, 0); break;
      case 0xf3: base = sub(0x201, 0x808080); break;
      case 0xf5: base = sub(0x183, 0xffffff); break;
      case 0xf6: base = sub(0x1c2, 0xffffff); break;
      case 0xf7: base = boolProp(sh, 0x1bf, 4, true) ? sub(0x181, 0xffffff) : sub(0x1c0, 0); break;
      default: base = SYS_COLORS[idx] ?? '000000';
    }
    let [cr, cg, cb] = [0, 2, 4].map((i) => parseInt(base.slice(i, i + 2), 16)) as [number, number, number];
    const f = (c: number): number => {
      switch (fn) {
        case 1: return (c * param) / 255;                 // escurecer
        case 2: return 255 - ((255 - c) * param) / 255;   // clarear
        case 3: return c + param;                         // somar cinza
        case 4: return c - param;                         // subtrair cinza
        case 5: return param - c;                         // subtração reversa
        case 6: return c < param ? 0 : 255;               // limiar
        default: return c;
      }
    };
    [cr, cg, cb] = [f(cr), f(cg), f(cb)];
    if (invert) [cr, cg, cb] = [255 - cr, 255 - cg, 255 - cb];
    const clamp = (c: number): number => Math.max(0, Math.min(255, Math.round(c)));
    return hex3(clamp(cr), clamp(cg), clamp(cb));
  }
  return hex3(r, g, b);
}

function srgb(val: string, alpha?: number): string {
  return alpha !== undefined && alpha < 1
    ? el('a:srgbClr', { val }, el('a:alpha', { val: Math.round(alpha * 100000) }))
    : el('a:srgbClr', { val });
}

// ───────────────────────────── mídia ─────────────────────────────

/** Garante a parte de mídia do BLIP `pib` (1-based); devolve o caminho. */
function mediaFor(conv: ConvCtx, pib: number): string | undefined {
  const hit = conv.media.get(pib);
  if (hit) return hit;
  const blip = conv.doc.blips[pib - 1];
  if (!blip) return undefined;
  const path = `ppt/media/image${conv.media.size + 1}.${blip.ext}`;
  conv.media.set(pib, path);
  conv.parts.set(path, blip.bytes);
  conv.mediaExts.add(blip.ext);
  return path;
}

/** Relação de imagem da parte atual → rId (ou undefined sem imagem). */
function imageRel(pc: PartCtx, pib: number): string | undefined {
  const path = mediaFor(pc.conv, pib);
  if (!path) return undefined;
  return pc.rels.add('image', '../media/' + path.slice('ppt/media/'.length));
}

// ───────────────────────────── preenchimento / linha / sombra ─────────────────────────────

/**
 * Paradas do gradiente ao longo do vetor "início → fim". No binário o
 * gradiente vai da cor de preenchimento (início) à cor de fundo (fim); o foco
 * (−100..100 %) é a posição da cor de preenchimento: 0 = normal, 100 =
 * invertido, 50 = espelhado (preenchimento no meio). fillShadeColors, quando
 * presente, lista paradas explícitas (cor + posição 16.16).
 */
function gradientStops(sh: OAShape, pc: PartCtx, fill: string, back: string, fillA?: number, backA?: number): string {
  const arr = msoArray(sh.props.get(0x197));
  const stops: { pos: number; color: string; alpha?: number }[] = [];
  if (arr && arr.size === 8 && arr.n >= 2) {
    for (let i = 0; i < arr.n; i++) {
      const o = arr.off + i * 8;
      stops.push({ color: oaColor(arr.r.u32(o), sh, pc), pos: fixed(arr.r.u32(o + 4)) });
    }
  } else {
    const focus = propS(sh, 0x18c) ?? 0;
    const f = { color: fill, alpha: fillA }, b = { color: back, alpha: backA };
    if (focus === 0) stops.push({ pos: 0, ...f }, { pos: 1, ...b });
    else if (focus >= 100 || focus <= -100) stops.push({ pos: 0, ...b }, { pos: 1, ...f });
    else if (focus > 0) stops.push({ pos: 0, ...b }, { pos: focus / 100, ...f }, { pos: 1, ...b });
    else stops.push({ pos: 0, ...f }, { pos: 1 + focus / 100, ...b }, { pos: 1, ...f });
  }
  stops.sort((x, y) => x.pos - y.pos);
  return el('a:gsLst', {}, stops.map((s) =>
    el('a:gs', { pos: Math.round(Math.max(0, Math.min(1, s.pos)) * 100000) }, srgb(s.color, s.alpha))).join(''));
}

/** Preenchimento da forma → XML DrawingML (`<a:noFill/>`, solid, grad, blip). */
function fillXml(sh: OAShape, pc: PartCtx, isBackground = false): string {
  if (!isBackground && !boolProp(sh, 0x1bf, 4, true)) return '<a:noFill/>';
  const type = prop(sh, 0x180) ?? 0;
  const color = oaColor(prop(sh, 0x181) ?? 0xffffff, sh, pc);
  const opacity = fixed(prop(sh, 0x182), 1);
  const back = oaColor(prop(sh, 0x183) ?? 0xffffff, sh, pc);
  const backOpacity = fixed(prop(sh, 0x184), 1);
  switch (type) {
    case 2: case 3: {
      const pib = prop(sh, 0x186);
      const rid = pib ? imageRel(pc, pib) : undefined;
      if (!rid) return el('a:solidFill', {}, srgb(color, opacity));
      return el('a:blipFill', { dpi: 0, rotWithShape: 1 },
        el('a:blip', { 'r:embed': rid }) + '<a:srcRect/>' + (type === 2 ? '<a:tile tx="0" ty="0" sx="100000" sy="100000" flip="none" algn="tl"/>' : '<a:stretch><a:fillRect/></a:stretch>'));
    }
    case 4: case 5: case 6: case 7: case 8: {
      if (type === 4 || type === 7 || type === 8) {
        // [MS-ODRAW] fillAngle: 0° = vetor vertical de baixo para cima (início
        // embaixo), girando no sentido horário → DrawingML ang = 270° + θ
        // (conferido com os decks gravados pelo LibreOffice: 0° e ±90°)
        const ang = ((270 + fixed(prop(sh, 0x18b))) % 360 + 360) % 360;
        const gs = gradientStops(sh, pc, color, back, opacity, backOpacity);
        return el('a:gradFill', { flip: 'none', rotWithShape: 1 }, gs + el('a:lin', { ang: Math.round(ang * 60000) % 21600000, scaled: type === 7 ? 1 : 0 }));
      }
      // radial (shadeCenter/shadeShape): cor de fundo no foco (fillTo*), de preenchimento na borda
      const gs = gradientStops(sh, pc, back, color, backOpacity, opacity);
      const l = fixed(prop(sh, 0x18d)), t = fixed(prop(sh, 0x18e)), r = fixed(prop(sh, 0x18f)), b = fixed(prop(sh, 0x190));
      return el('a:gradFill', { flip: 'none', rotWithShape: 1 }, gs + el('a:path', { path: type === 6 ? 'shape' : 'rect' },
        el('a:fillToRect', { l: Math.round(l * 100000), t: Math.round(t * 100000), r: Math.round((1 - r) * 100000), b: Math.round((1 - b) * 100000) })));
    }
    case 9:
      return pc.bgColor ? el('a:solidFill', {}, srgb(pc.bgColor)) : '<a:noFill/>';
    case 1: // padrão (bitmap 8×8): aproximado pela cor de frente
    default:
      return el('a:solidFill', {}, srgb(color, opacity));
  }
}

const DASH = ['solid', 'sysDash', 'sysDot', 'sysDashDot', 'sysDashDotDot', 'dot', 'dash', 'lgDash', 'dashDot', 'lgDashDot', 'lgDashDotDot'];
const ARROW = ['none', 'triangle', 'stealth', 'diamond', 'oval', 'arrow'];
const ARROW_SZ = ['sm', 'med', 'lg'];

function arrowEnd(tag: string, sh: OAShape, typeId: number, wId: number, lenId: number): string {
  const t = prop(sh, typeId) ?? 0;
  if (!t) return '';
  const w = prop(sh, wId), len = prop(sh, lenId);
  return el(tag, {
    type: ARROW[t] ?? 'triangle',
    w: w !== undefined && w !== 1 ? ARROW_SZ[w] : undefined,
    len: len !== undefined && len !== 1 ? ARROW_SZ[len] : undefined,
  });
}

/** Contorno → `<a:ln>`. */
function lineXml(sh: OAShape, pc: PartCtx, dfltOn: boolean): string {
  if (!boolProp(sh, 0x1ff, 3, dfltOn)) return '<a:ln><a:noFill/></a:ln>';
  const w = prop(sh, 0x1cb) ?? 9525;
  const color = oaColor(prop(sh, 0x1c0) ?? 0, sh, pc);
  const alpha = fixed(prop(sh, 0x1c1), 1);
  const dash = prop(sh, 0x1ce) ?? 0;
  const cap = prop(sh, 0x1d7);
  const cmpd = prop(sh, 0x1cd);
  const join = prop(sh, 0x1d6);
  let kids = el('a:solidFill', {}, srgb(color, alpha));
  kids += el('a:prstDash', { val: DASH[dash] ?? 'solid' });
  if (join === 0) kids += '<a:bevel/>';
  else if (join === 1) kids += '<a:miter lim="800000"/>';
  else kids += '<a:round/>';
  kids += arrowEnd('a:headEnd', sh, 0x1d0, 0x1d2, 0x1d3);
  kids += arrowEnd('a:tailEnd', sh, 0x1d1, 0x1d4, 0x1d5);
  return el('a:ln', {
    w,
    cap: cap === 0 ? 'rnd' : cap === 1 ? 'sq' : undefined,
    cmpd: cmpd ? ['sng', 'dbl', 'thickThin', 'thinThick', 'tri'][cmpd] : undefined,
  }, kids);
}

/** Sombra (fShadow) → `<a:effectLst><a:outerShdw>`. */
function shadowXml(sh: OAShape, pc: PartCtx): string {
  if (!boolProp(sh, 0x23f, 1, false)) return '';
  const color = oaColor(prop(sh, 0x201) ?? 0x808080, sh, pc);
  const alpha = fixed(prop(sh, 0x204), 1);
  const ox = propS(sh, 0x205) ?? 25400;
  const oy = propS(sh, 0x206) ?? 25400;
  const dist = Math.round(Math.hypot(ox, oy));
  let dir = Math.round((Math.atan2(oy, ox) * 180 / Math.PI) * 60000);
  if (dir < 0) dir += 21600000;
  const blur = prop(sh, 0x21c) ?? 0;
  // origem (shadowOriginX/Y: −0,5..0,5) → alinhamento
  const oxr = fixed(prop(sh, 0x210)), oyr = fixed(prop(sh, 0x211));
  const algn = (oyr < -0.25 ? 't' : oyr > 0.25 ? 'b' : '') + (oxr < -0.25 ? 'l' : oxr > 0.25 ? 'r' : '');
  const sx = prop(sh, 0x209), sy = prop(sh, 0x20c);
  return el('a:effectLst', {}, el('a:outerShdw', {
    blurRad: blur || undefined, dist, dir,
    sx: sx !== undefined && sx !== 0x10000 ? Math.round(fixed(sx) * 100000) : undefined,
    sy: sy !== undefined && sy !== 0x10000 ? Math.round(fixed(sy) * 100000) : undefined,
    algn: algn || 'ctr', rotWithShape: 0,
  }, srgb(color, alpha)));
}

// ───────────────────────────── geometria ─────────────────────────────

interface Xf { x: number; y: number; cx: number; cy: number; rot: number; flipH: boolean; flipV: boolean }

/** Rotação (graus, normalizada 0..360) do FOPT 0x0004 (16.16). */
function rotationDeg(sh: OAShape): number {
  const r = fixed(prop(sh, 0x0004));
  return ((r % 360) + 360) % 360;
}

/**
 * Âncora → xfrm. No binário, formas giradas entre 45° e 135° (e 225°–315°)
 * guardam a âncora já "deitada" (largura/altura trocadas em torno do centro).
 */
function anchorXf(sh: OAShape): Xf | undefined {
  const a = sh.anchor;
  if (!a) return undefined;
  let x = Math.min(a.l, a.r), y = Math.min(a.t, a.b);
  let w = Math.abs(a.r - a.l), h = Math.abs(a.b - a.t);
  const rot = rotationDeg(sh);
  if ((rot >= 45 && rot < 135) || (rot >= 225 && rot < 315)) {
    const cx = x + w / 2, cy = y + h / 2;
    [w, h] = [h, w];
    x = cx - w / 2; y = cy - h / 2;
  }
  return {
    x: emu(x), y: emu(y), cx: emu(w), cy: emu(h), rot,
    flipH: (sh.flags & FSP.flipH) !== 0, flipV: (sh.flags & FSP.flipV) !== 0,
  };
}

function xfrmXml(xf: Xf, tag = 'a:xfrm', inner = ''): string {
  const rot = Math.round(xf.rot * 60000) % 21600000;
  return el(tag, { rot: rot || undefined, flipH: xf.flipH || undefined, flipV: xf.flipV || undefined },
    el('a:off', { x: xf.x, y: xf.y }) + el('a:ext', { cx: xf.cx, cy: xf.cy }) + inner);
}

/** Ajustes do FOPT (0x147..0x150). */
function rawAdjust(sh: OAShape): RawAdjust {
  const out: RawAdjust = [];
  for (let i = 0; i < 10; i++) {
    const v = sh.props.get(0x147 + i)?.value;
    out.push(v === undefined ? undefined : v | 0);
  }
  return out;
}

/** Geometria livre (pVertices/pSegmentInfo) → `<a:custGeom>`. */
function custGeomXml(sh: OAShape): string | undefined {
  const verts = msoArray(sh.props.get(0x145));
  if (!verts || verts.n === 0) return undefined;
  const pts: [number, number][] = [];
  for (let i = 0; i < verts.n; i++) {
    const o = verts.off + i * verts.size;
    if (verts.size >= 8) pts.push([verts.r.i32(o), verts.r.i32(o + 4)]);
    else pts.push([verts.r.i16(o), verts.r.i16(o + 2)]);
  }
  const gl = propS(sh, 0x140) ?? 0, gt = propS(sh, 0x141) ?? 0;
  const gr = propS(sh, 0x142) ?? 21600, gb = propS(sh, 0x143) ?? 21600;
  const w = Math.max(1, gr - gl), h = Math.max(1, gb - gt);
  const pt = (p: [number, number] | undefined): string =>
    el('a:pt', { x: Math.round((p?.[0] ?? 0) - gl), y: Math.round((p?.[1] ?? 0) - gt) });
  const segs = msoArray(sh.props.get(0x146));
  const paths: string[] = [];
  let cur = '';
  let noFill = false, noLine = false;
  const endPath = (): void => {
    if (cur) paths.push(el('a:path', { w, h, fill: noFill ? 'none' : undefined, stroke: noLine ? '0' : undefined }, cur));
    cur = ''; noFill = false; noLine = false;
  };
  let pi = 0;
  if (!segs || segs.n === 0) {
    // sem segmentos: polilinha pelos vértices (fechada para shapePath 1/3)
    cur += el('a:moveTo', {}, pt(pts[0]));
    for (pi = 1; pi < pts.length; pi++) cur += el('a:lnTo', {}, pt(pts[pi]));
    const sp = prop(sh, 0x144) ?? 1;
    if (sp === 1 || sp === 3) cur += '<a:close/>';
    endPath();
  } else {
    // segmentos consomem vértices; contagens corrompidas param quando os pontos acabam
    for (let i = 0; i < segs.n && pi <= pts.length; i++) {
      const s = segs.size >= 4 ? segs.r.u32(segs.off + i * segs.size) : segs.r.u16(segs.off + i * segs.size);
      const type = segs.size >= 4 ? (s >>> 29) & 7 : (s >>> 13) & 7;
      const count = segs.size >= 4 ? (s & 0x1fffffff) : (s & 0x1fff);
      switch (type) {
        case 0: // lineTo
          for (let k = 0; k < Math.max(1, count) && pi < pts.length; k++) cur += el('a:lnTo', {}, pt(pts[pi++]));
          break;
        case 1: // curveTo (3 pontos por segmento)
          for (let k = 0; k < Math.max(1, count) && pi + 2 < pts.length; k++) {
            cur += el('a:cubicBezTo', {}, pt(pts[pi]) + pt(pts[pi + 1]) + pt(pts[pi + 2]));
            pi += 3;
          }
          break;
        case 2: cur += el('a:moveTo', {}, pt(pts[pi++])); break;
        case 3: cur += '<a:close/>'; break;
        case 4: endPath(); break;
        case 5: { // escape
          const code = (s >>> 8) & 0x1f;
          const n = s & 0xff;
          if (code === 10) noFill = true;
          else if (code === 11) noLine = true;
          else pi += n;
          break;
        }
        default: break;
      }
    }
    endPath();
  }
  if (!paths.length) return undefined;
  return el('a:custGeom', {}, '<a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>' + el('a:pathLst', {}, paths.join('')));
}

/** Geometria da forma: preset (com avLst) ou custGeom; devolve flipV extra. */
function geometryXml(sh: OAShape, xf: Xf | undefined): { xml: string; flipV: boolean } {
  if (sh.type === 0 || !presetFor(sh.type, [], 1, 1)) {
    const cg = custGeomXml(sh);
    if (cg) return { xml: cg, flipV: false };
  }
  const pr = presetFor(sh.type, rawAdjust(sh), xf?.cx || 1, xf?.cy || 1) ?? { prst: 'rect', av: [] };
  const av = pr.av.map((g) => el('a:gd', { name: g.name, fmla: `val ${g.val}` })).join('');
  return { xml: el('a:prstGeom', { prst: pr.prst }, el('a:avLst', {}, av)), flipV: !!pr.flipV };
}

// ───────────────────────────── texto ─────────────────────────────

const ANCHOR: Record<number, [string, boolean]> = {
  0: ['t', false], 1: ['ctr', false], 2: ['b', false], 3: ['t', true], 4: ['ctr', true], 5: ['b', true],
  6: ['t', false], 7: ['b', false], 8: ['t', true], 9: ['b', true],
};

/** `<a:bodyPr>` a partir das propriedades de texto do FOPT. */
function bodyPrXml(sh: OAShape): string {
  const [anchor, anchorCtr] = ANCHOR[prop(sh, 0x87) ?? 0] ?? ['t', false];
  const flow = prop(sh, 0x88) ?? 0;
  const vert = flow === 1 || flow === 3 || flow === 5 ? 'vert' : flow === 2 ? 'vert270' : undefined;
  const fit = boolProp(sh, 0xbf, 1, false);
  return el('a:bodyPr', {
    vert,
    wrap: (prop(sh, 0x85) ?? 0) === 2 ? 'none' : 'square',
    lIns: prop(sh, 0x81) ?? 91440,
    tIns: prop(sh, 0x82) ?? 45720,
    rIns: prop(sh, 0x83) ?? 91440,
    bIns: prop(sh, 0x84) ?? 45720,
    anchor,
    anchorCtr: anchorCtr || undefined,
    rtlCol: 0,
  }, fit ? '<a:spAutoFit/>' : '<a:noAutofit/>');
}

/** Bloco de texto da forma (ClientTextbox ou outline do slide) + extensão PP9. */
function textBlockOf(sh: OAShape, pc: PartCtx): TextBlock | undefined {
  if (!sh.clientTextbox) return undefined;
  const ct = readClientTextbox(sh.clientTextbox);
  const block = ct.block ?? (ct.outlineRef !== undefined ? pc.outline[ct.outlineRef] : undefined);
  if (!block) return undefined;
  // StyleTextProp9Atom na etiqueta "___PPT9" do ClientData; texto de outline
  // usa o OutlineTextProps9 do documento (slideId + tipo de texto)
  const pf9 = (sh.clientData ? pp9Of(sh.clientData) : undefined) ??
    (ct.outlineRef !== undefined && pc.slideId !== undefined ? pc.conv.doc.outlinePf9.get(`${pc.slideId}:${block.textType}`) : undefined);
  return pf9 ? { ...block, pf9 } : block;
}

function pp9Of(clientData: Rec): ReturnType<typeof readStyleTextProp9> | undefined {
  for (const c of children(clientData)) {
    if (c.type !== RT.ProgTags) continue;
    for (const t of children(c)) {
      if (t.type !== RT.ProgBinaryTag) continue;
      const kids = children(t);
      const name = kids.find((k) => k.type === RT.CString);
      const blob = kids.find((k) => k.type === RT.BinaryTagDataBlob);
      if (!name || !blob || utf16(name.r, name.start, name.end) !== '___PPT9') continue;
      let o = blob.start;
      while (o + 8 <= blob.end) {
        const rec = readRec(blob.r, o, blob.end);
        if (!rec) break;
        if (rec.type === RT.StyleTextProp9Atom) return readStyleTextProp9(rec);
        o = rec.start + rec.len;
      }
    }
  }
  return undefined;
}

// ───────────────────────────── placeholders ─────────────────────────────

/** PlaceholderEnum → ST_PlaceholderType (undefined = sem `<p:ph>`). */
const PH_TYPE: Record<number, string | undefined> = {
  1: 'title', 2: 'body', 3: 'ctrTitle', 4: 'subTitle', 5: 'sldImg', 6: 'body', 7: 'dt', 8: 'sldNum',
  9: 'ftr', 10: 'hdr', 11: 'sldImg', 12: 'body', 13: 'title', 14: 'body', 15: 'ctrTitle', 16: 'subTitle',
  17: 'title', 18: 'body', 19: 'obj', 20: 'chart', 21: 'tbl', 22: 'clipArt', 23: 'dgm', 24: 'media',
  25: 'obj', 26: 'pic',
};

interface PhInfo { type: string; idx?: number; vert?: boolean }

/** OEPlaceholderAtom (position, placementId, size) → tipo/idx do `<p:ph>`. */
function placeholderOf(sh: OAShape): PhInfo | undefined {
  if (!sh.clientData) return undefined;
  for (const c of children(sh.clientData)) {
    if (c.type !== RT.PlaceholderAtom) continue;
    const position = c.r.i32(c.start);
    const id = c.r.u8(c.start + 4);
    const type = PH_TYPE[id];
    if (!type) return undefined;
    const info: PhInfo = { type };
    if (type !== 'title' && type !== 'ctrTitle' && position >= 0) info.idx = position;
    if (id === 17 || id === 18 || id === 25) info.vert = true;
    return info;
  }
  return undefined;
}

/** Tipo de placeholder (ST_PlaceholderType) da forma, se for placeholder. */
export function placeholderType(sh: OAShape): string | undefined {
  return placeholderOf(sh)?.type;
}

function phXml(ph: PhInfo | undefined): string {
  if (!ph) return '<p:nvPr/>';
  return el('p:nvPr', {}, el('p:ph', {
    type: ph.type === 'obj' ? undefined : ph.type,
    orient: ph.vert ? 'vert' : undefined,
    idx: ph.idx,
  }));
}

// ───────────────────────────── formas ─────────────────────────────

function shapeName(sh: OAShape, fallback: string): string {
  return propString(sh.props.get(0x380)) ?? `${fallback} ${sh.spid}`;
}

function shapeId(sh: OAShape, pc: PartCtx): number {
  let id = sh.spid > 0 ? sh.spid : 2;
  while (pc.usedIds.has(id)) id++;
  pc.usedIds.add(id);
  if (id === sh.spid) pc.spids.add(id);
  return id;
}

/** É forma oculta (fHidden no conjunto 0x3BF)? */
const isHidden = (sh: OAShape): boolean => boolProp(sh, 0x3bf, 1, false);

export interface ShapeOpts { skipPlaceholders?: boolean; inGroup?: boolean }

/**
 * Partes visuais do spPr (geometria, preenchimento, contorno, efeitos),
 * vindas do binário e, com round-trip, sobrepostas pelo shapexml original.
 */
function visualParts(sh: OAShape, pc: PartCtx, xf: Xf, kind: 'shape' | 'pic' | 'line', inGroup: boolean): { geom: string; fill: string; line: string; effects: string } {
  const geom = geometryXml(sh, xf);
  let flipV = geom.flipV;
  const parts = {
    geom: geom.xml,
    fill: kind === 'line' ? '<a:noFill/>' : fillXml(sh, pc),
    line: lineXml(sh, pc, kind !== 'pic'),
    effects: shadowXml(sh, pc),
  };
  const mv = pc.conv.useRoundTrip ? metroVisual(sh) : undefined;
  if (mv) {
    if (mv.geometry) { parts.geom = mv.geometry; flipV = false; }
    if (mv.fill && kind !== 'pic') parts.fill = mv.fill;
    if (mv.line) parts.line = mv.line;
    if (mv.effects !== undefined) parts.effects = mv.effects;
    // posição exata em EMU (o binário arredonda a 1/576") quando bate com a âncora
    const m = mv.xfrm;
    const tol = 1600;
    if (m && !inGroup && Math.abs(m.x - xf.x) <= tol && Math.abs(m.y - xf.y) <= tol &&
        Math.abs(m.cx - xf.cx) <= tol && Math.abs(m.cy - xf.cy) <= tol && Math.abs(((m.rot - xf.rot) % 360 + 540) % 360 - 180) < 1) {
      Object.assign(xf, { x: m.x, y: m.y, cx: m.cx, cy: m.cy, rot: m.rot, flipH: m.flipH, flipV: m.flipV });
      flipV = false;
    }
  }
  if (flipV) xf.flipV = !xf.flipV;
  return parts;
}

/** Uma forma (ou grupo) → XML do spTree. `skipPlaceholders` omite placeholders (decorações herdadas). */
export function shapeXml(sh: OAShape, pc: PartCtx, opts: ShapeOpts = {}): string {
  if (sh.flags & FSP.deleted) return '';
  if (isHidden(sh)) return '';
  if (sh.children) return groupXml(sh, pc, opts);
  const ph = placeholderOf(sh);
  if (ph && opts.skipPlaceholders) return '';
  const xf = anchorXf(sh);
  if (!xf) return '';
  const pib = prop(sh, 0x104);
  const name = shapeName(sh, pib ? 'Imagem' : 'Forma');
  const descr = propString(sh.props.get(0x381));
  const id = shapeId(sh, pc);
  const cNvPr = el('p:cNvPr', { id, name, descr });
  const inGroup = !!opts.inGroup;

  // imagem (PictureFrame ou qualquer forma com pib)
  if (pib) {
    const rid = imageRel(pc, pib);
    if (rid) {
      const v = visualParts(sh, pc, xf, 'pic', inGroup);
      const crop = (pid: number): number => Math.round(fixed(prop(sh, pid)) * 100000);
      const t = crop(0x100), b = crop(0x101), l = crop(0x102), r = crop(0x103);
      const blipFill = el('p:blipFill', {},
        el('a:blip', { 'r:embed': rid }) +
        ((t || b || l || r) ? el('a:srcRect', { l: l || undefined, t: t || undefined, r: r || undefined, b: b || undefined }) : '') +
        '<a:stretch><a:fillRect/></a:stretch>');
      const spPr = el('p:spPr', {}, xfrmXml(xf) + v.geom + v.fill + v.line + v.effects);
      return el('p:pic', {},
        el('p:nvPicPr', {}, cNvPr + el('p:cNvPicPr', {}, '<a:picLocks noChangeAspect="1"/>') + phXml(ph)) +
        blipFill + spPr);
    }
  }

  // WordArt clássico (gtext): o preenchimento é das letras, não de uma caixa
  const wordArt = isWordArtType(sh.type) ? wordArtXml(sh, pc, xf) : undefined;
  if (wordArt) {
    return el('p:sp', {}, el('p:nvSpPr', {}, cNvPr + '<p:cNvSpPr txBox="1"/>' + phXml(ph)) +
      el('p:spPr', {}, xfrmXml(xf) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>') + wordArt);
  }

  const block = textBlockOf(sh, pc);
  if (block) pc.texts.set(sh.spid, block.text);
  const isConn = isConnectorType(sh.type);
  const isLine = sh.type === 20 || isConn;
  const v = visualParts(sh, pc, xf, isLine ? 'line' : 'shape', inGroup);
  const spPr = el('p:spPr', {}, xfrmXml(xf) + v.geom + v.fill + v.line + v.effects);
  if (isConn) {
    return el('p:cxnSp', {}, el('p:nvCxnSpPr', {}, cNvPr + '<p:cNvCxnSpPr/>' + phXml(ph)) + spPr);
  }
  let txBody = '';
  if (block) {
    // round-trip: formatação do shapexml + caracteres do binário (só fora de
    // placeholders — esses herdam do layout original, que não reproduzimos)
    const metroTx = pc.conv.useRoundTrip && !ph ? metroTextBody(sh, block.text) : undefined;
    txBody = metroTx ?? el('p:txBody', {}, bodyPrXml(sh) + '<a:lstStyle/>' + paragraphsXml(block, pc.text));
  }
  const cNvSpPr = sh.type === 202 && !ph ? '<p:cNvSpPr txBox="1"/>' : '<p:cNvSpPr/>';
  return el('p:sp', {}, el('p:nvSpPr', {}, cNvPr + cNvSpPr + phXml(ph)) + spPr + txBody);
}

/**
 * Texto do WordArt clássico (gtextUNICODE/gtextFont/flags) → `<p:txBody>`:
 * centralizado, sem quebra, na cor do preenchimento. O WordArt estica o texto
 * até a caixa — aproximado por um tamanho de fonte que preenche a altura.
 */
function wordArtXml(sh: OAShape, pc: PartCtx, xf: Xf): string | undefined {
  const text = propString(sh.props.get(0xc0));
  if (!text) return undefined;
  const font = propString(sh.props.get(0xc5));
  const bold = boolProp(sh, 0xff, 5, false), italic = boolProp(sh, 0xff, 4, false);
  const color = oaColor(prop(sh, 0x181) ?? 0xffffff, sh, pc);
  const lines = text.split(/\r\n|\r|\n/);
  // cabe na altura (linhas) e na largura (linha mais longa, ~0,6 em por glifo)
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const byH = (xf.cy / 12700 / lines.length) * 0.75;
  const byW = (xf.cx / 12700) / (longest * (bold ? 0.66 : 0.6));
  const szPt = Math.max(4, Math.min(400, byH, byW));
  const rPr = el('a:rPr', { sz: Math.round(szPt * 100), b: bold ? 1 : 0, i: italic ? 1 : 0 },
    el('a:solidFill', {}, srgb(color)) + (font ? el('a:latin', { typeface: font }) : ''));
  const paras = lines.map((l) => `<a:p><a:pPr algn="ctr"><a:buNone/></a:pPr><a:r>${rPr}<a:t>${escText(l)}</a:t></a:r></a:p>`).join('');
  return el('p:txBody', {}, '<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" rtlCol="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>' + paras);
}

/** Grupo: off/ext = âncora do grupo; chOff/chExt = FSPGR (mesma escala). */
function groupXml(sh: OAShape, pc: PartCtx, opts: ShapeOpts): string {
  const kids = (sh.children ?? []).map((c) => shapeXml(c, pc, { ...opts, inGroup: true })).join('');
  if (!kids) return '';
  const xf = anchorXf(sh);
  const g = sh.groupRect;
  const id = shapeId(sh, pc);
  const name = shapeName(sh, 'Grupo');
  let xfrm = '<a:xfrm/>';
  if (xf && g) {
    xfrm = xfrmXml(xf, 'a:xfrm',
      el('a:chOff', { x: emu(Math.min(g.l, g.r)), y: emu(Math.min(g.t, g.b)) }) +
      el('a:chExt', { cx: emu(Math.abs(g.r - g.l)), cy: emu(Math.abs(g.b - g.t)) }));
  }
  return el('p:grpSp', {},
    el('p:nvGrpSpPr', {}, el('p:cNvPr', { id, name }) + '<p:cNvGrpSpPr/><p:nvPr/>') +
    el('p:grpSpPr', {}, xfrm) + kids);
}

/** Fundo (forma fBackground) → `<p:bg>`. */
export function backgroundXml(bg: OAShape | undefined, pc: PartCtx): string {
  if (!bg) return '';
  const fill = fillXml(bg, pc, true);
  if (fill === '<a:noFill/>') return '';
  return el('p:bg', {}, el('p:bgPr', {}, fill + '<a:effectLst/>'));
}

/** Cor sólida efetiva do fundo (para fillType "background" das formas). */
export function backgroundColor(bg: OAShape | undefined, pc: PartCtx): string | undefined {
  if (!bg) return undefined;
  const type = prop(bg, 0x180) ?? 0;
  return type === 0 ? oaColor(prop(bg, 0x181) ?? 0xffffff, bg, pc) : undefined;
}
