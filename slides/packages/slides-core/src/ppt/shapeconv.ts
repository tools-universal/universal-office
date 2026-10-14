/**
 * Formas OfficeArt → elementos do spTree (`<p:sp>`, `<p:pic>`, `<p:cxnSp>`,
 * `<p:grpSp>`), com as propriedades do FOPT traduzidas para DrawingML:
 * posição (âncora + rotação/espelhamento), geometria (preset/custom),
 * preenchimento, contorno, sombra, texto e placeholder.
 *
 * Tudo é escrito explicitamente; com round-trip, a aparência gravada pelo
 * PowerPoint 2007+ no metroBlob (shapexml) sobrepõe a do binário.
 */
import { FSP, decodeBlip, type OAShape, type OAProp } from './officeart.js';
import { RT, children, readRec, ByteReader, type Rec, utf16 } from './records.js';
import { readClientTextbox, readStyleTextProp9, type TextBlock } from './text.js';
import { presetFor, isConnectorType, isWordArtType, type RawAdjust } from './preset-map.js';
import { paragraphsXml, emu, hex3 } from './textconv.js';
import { strFromU8, strToU8 } from 'fflate';
import { metroVisual, metroTextBody, metroShape, metroDiagram, serializeXml, zipPartText } from './roundtrip.js';
import { DEFAULT_SCHEME, type ConvCtx, type PartCtx } from './context.js';
import { el, escText, escAttr, XML_DECL, NS } from './xmlw.js';
import { firstChild, parseXml, type XmlElement } from '../xml.js';
import { PRESET_PATTERNS } from '../patterns.js';
import { recolorMetafile } from '../metafile.js';

// ───────────────────────────── propriedades ─────────────────────────────

const prop = (sh: OAShape, id: number): number | undefined => sh.props.get(id)?.value;
/** Propriedade COM SINAL (int32: margens de texto podem ser negativas — lidas sem sinal viravam ~4,29e9). */
const sprop = (sh: OAShape, id: number): number | undefined => { const v = prop(sh, id); return v === undefined ? undefined : v | 0; };
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

/** Booleano do conjunto com estado: true/false especificado (fUse, ou escritor sem fUse), undefined = não especificado. */
function boolPropOpt(sh: OAShape, id: number, bit: number): boolean | undefined {
  const p = sh.props.get(id);
  if (!p) return undefined;
  const v = p.value;
  if (v & (1 << (bit + 16))) return (v & (1 << bit)) !== 0;
  if ((v >>> 16) === 0) return (v & (1 << bit)) !== 0;
  return undefined;
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
        // escurecer/clarear no sRGB (a conversão do app grava <a:gamma/><a:shade|tint/><a:invGamma/>:
        // o gamma tira o shade/tint do espaço linear — o app desenha assim, mais escuro)
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
  const blip = conv.doc.blip(pib);
  if (!blip) return undefined;
  const path = `ppt/media/image${conv.media.size + 1}.${blip.ext}`;
  conv.media.set(pib, path);
  conv.parts.set(path, blip.bytes);
  conv.mediaExts.add(blip.ext);
  return path;
}

/**
 * Preenchimento de PADRÃO do binário: o fillBlip é um BMP 1 bpp 8×8. Casa o
 * bitmap (pixel CLARO da paleta = cor de frente/fillColor — conferido no app
 * de referência: fundo branco com linhas finas) com os padrões predefinidos do
 * DrawingML, em qualquer fase (deslocamento cíclico); sem casamento → undefined.
 */
function patternPrst(conv: ConvCtx, pib: number): string | undefined {
  const b = conv.doc.blip(pib)?.bytes;
  if (!b || b.length < 62 || b[0] !== 0x42 || b[1] !== 0x4d) return undefined;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true), hdr = dv.getUint32(14, true);
  const w = dv.getInt32(18, true), h = dv.getInt32(22, true), bpp = dv.getUint16(28, true);
  if (w !== 8 || Math.abs(h) !== 8 || bpp !== 1) return undefined;
  const pal = [0, 1].map((i) => { const o = 14 + hdr + i * 4; return (b[o] ?? 0) + (b[o + 1] ?? 0) + (b[o + 2] ?? 0); });
  const lightBit = pal[1]! > pal[0]! ? 1 : 0;
  const rows: number[] = [];
  for (let r = 0; r < 8; r++) {
    const v = b[off + (h > 0 ? 7 - r : r) * 4] ?? 0;
    rows.push(lightBit ? v : ~v & 0xff);
  }
  const rot = (v: number, n: number): number => ((v << n) | (v >>> (8 - n))) & 0xff;
  for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) {
    let hex = '';
    for (let r = 0; r < 8; r++) hex += rot(rows[(r + dy) % 8]!, dx).toString(16).padStart(2, '0');
    for (const [k, pat] of Object.entries(PRESET_PATTERNS)) if (pat === hex) return k;
  }
  return undefined;
}

/** Imagem embutida nos dados complexos da propriedade (registro OfficeArtBlip) → rId. */
function complexImageRel(pc: PartCtx, p: OAProp): string | undefined {
  const r = p.complex!;
  const cache = ((pc.conv as unknown as { complexMedia?: Map<string, string> }).complexMedia ??= new Map());
  let key = String(r.length) + ':';
  for (let i = 0; i < Math.min(r.length, 64); i++) key += r[i]!.toString(16);
  let path = cache.get(key);
  if (!path) {
    const rec = readRec(new ByteReader(r), 0);
    let blip;
    try { blip = rec ? decodeBlip(rec) : undefined; } catch { blip = undefined; }
    if (!blip) return undefined;
    path = `ppt/media/image${pc.conv.media.size + cache.size + 1}c.${blip.ext}`;
    cache.set(key, path);
    pc.conv.parts.set(path, blip.bytes);
    pc.conv.mediaExts.add(blip.ext);
  }
  return pc.rels.add('image', '../media/' + path.slice('ppt/media/'.length));
}

/**
 * "Recolorir imagem" do PowerPoint 97: o RecolorInfoAtom (0x0FE7) do ClientData
 * troca cores do METARQUIVO. Entradas de 44 bytes após 12 de cabeçalho (nº de
 * cores em +2); cada uma: bit 0 = trocada, cor nova (16 bits/canal), índice,
 * cor original. Índice < 8 = cor do ESQUEMA do slide — a gravada é só o
 * retrato de quando foi escolhida (gd-084485: preto → texto branco do esquema
 * atual). A lista de "preenchimentos" não vale por cima (gd-665775: bordas
 * PATCOPY pretas saem brancas, não na cor de preenchimento gravada).
 * → rId de uma cópia recolorida da mídia, ou undefined.
 */
function recolorRel(sh: OAShape, pc: PartCtx, pib: number): string | undefined {
  const rec = sh.clientData ? children(sh.clientData).find((c) => c.type === 0x0fe7) : undefined;
  if (!rec) return undefined;
  const d = rec.r.sub(rec.start, rec.end);
  if (d.length < 12) return undefined;
  const u16 = (o: number): number => d[o]! | (d[o + 1]! << 8);
  const map = new Map<number, number>();
  for (let k = 0, nG = u16(2); k < nG && 12 + k * 44 + 18 <= d.length; k++) {
    const o = 12 + k * 44;
    if (!(u16(o) & 1)) continue;
    const idx = u16(o + 8);
    const from = d[o + 13]! | (d[o + 15]! << 8) | (d[o + 17]! << 16);
    let to = d[o + 3]! | (d[o + 5]! << 8) | (d[o + 7]! << 16);
    const sch = idx < 8 ? pc.scheme[idx] ?? DEFAULT_SCHEME[idx] : undefined;
    if (sch) { const v = parseInt(sch, 16); to = ((v >> 16) & 0xff) | (v & 0xff00) | ((v & 0xff) << 16); }
    if (to !== from) map.set(from, to);
  }
  const blip = map.size ? pc.conv.doc.blip(pib) : undefined;
  if (!blip || (blip.ext !== 'emf' && blip.ext !== 'wmf')) return undefined;
  const cache = ((pc.conv as unknown as { recolorMedia?: Map<string, string> }).recolorMedia ??= new Map());
  const key = `${pib}:${[...map].join(';')}`;
  let path = cache.get(key);
  if (!path) {
    const bytes = recolorMetafile(blip.bytes, map);
    if (!bytes) return undefined;
    path = `ppt/media/image${cache.size + 1}r.${blip.ext}`;
    cache.set(key, path);
    pc.conv.parts.set(path, bytes);
    pc.conv.mediaExts.add(blip.ext);
  }
  return pc.rels.add('image', '../media/' + path.slice('ppt/media/'.length));
}

/** Relação de imagem da parte atual → rId (ou undefined sem imagem). */
function imageRel(pc: PartCtx, pib: number): string | undefined {
  const path = mediaFor(pc.conv, pib);
  if (!path) return undefined;
  return pc.rels.add('image', '../media/' + path.slice('ppt/media/'.length));
}

// ───────────────────────────── preenchimento / linha / sombra ─────────────────────────────

/**
 * Paradas do gradiente ao longo do vetor. As cores vão do preenchimento ao
 * fundo (ou a lista explícita fillShadeColors, preenchimento → fundo) e o foco
 * decide a ordem — casado com a conversão do próprio PowerPoint (~13 mil
 * degradês do corpus, _lab/grad-shapes.ts): foco 0 = preenchimento → fundo,
 * ±100 = invertido, entre os dois = espelhado; o espelho põe o preenchimento
 * nas pontas com foco positivo e no meio com negativo — e ao contrário quando
 * o fillAngle foi gravado (≠ 0), o que o `flipMirror` indica.
 */
function gradientStops(sh: OAShape, pc: PartCtx, fill: string, back: string, fillA?: number, backA?: number, flipMirror = false): string {
  const arr = msoArray(sh.props.get(0x197));
  type Stop = { pos: number; color: string; alpha?: number };
  let list: Stop[];
  if (arr && arr.size === 8 && arr.n >= 2) {
    list = [];
    for (let i = 0; i < arr.n; i++) {
      const o = arr.off + i * 8;
      list.push({ color: oaColor(arr.r.u32(o), sh, pc), pos: fixed(arr.r.u32(o + 4)) });
    }
    list.sort((x, y) => x.pos - y.pos);
  } else list = [{ pos: 0, color: fill, alpha: fillA }, { pos: 1, color: back, alpha: backA }];
  const focus = propS(sh, 0x18c) ?? 0;
  const rev = (l: Stop[]): Stop[] => l.map((x) => ({ ...x, pos: 1 - x.pos })).reverse();
  let stops: Stop[];
  if (focus === 0) stops = list;
  else if (focus >= 100 || focus <= -100) stops = rev(list);
  else {
    const F = Math.abs(focus) / 100;
    // fillAtEnds: preenchimento nas pontas (f…b…f); senão no meio (b…f…b)
    const fillAtEnds = (focus > 0) !== flipMirror;
    const a = fillAtEnds ? list : rev(list); // trecho [0, F]
    stops = [...a.map((x) => ({ ...x, pos: x.pos * F })), ...rev(a).map((x) => ({ ...x, pos: F + x.pos * (1 - F) }))];
  }
  stops.sort((x, y) => x.pos - y.pos);
  // espelho de 2 cores: o PowerPoint grava f/b/b/f, mas no .ppt ele desenha o
  // degradê "de 2 cores com foco" (curva sigma em cada metade) — o que no .pptx
  // só sai com 3 stops de pontas iguais (medido, syn-gradmode2); 4 stops = sRGB
  stops = stops.filter((st, i) => i === 0 || st.pos !== stops[i - 1]!.pos || st.color !== stops[i - 1]!.color || st.alpha !== stops[i - 1]!.alpha);
  return el('a:gsLst', {}, stops.map((st) =>
    el('a:gs', { pos: Math.round(Math.max(0, Math.min(1, st.pos)) * 100000) }, srgb(st.color, st.alpha))).join(''));
}

/** Preenchimento da forma → XML DrawingML (`<a:noFill/>`, solid, grad, blip). */
function fillXml(sh: OAShape, pc: PartCtx, isBackground = false): string {
  // placeholder e caixa de texto (msosptTextBox, 202) sem fFilled na cadeia
  // (forma → mestre) saem SEM preenchimento no app de referência, apesar do
  // default "preenchido" do formato (medido no corpus); idem o contorno
  if (!isBackground && !fillOn(sh, pc)) return '<a:noFill/>';
  const type = prop(sh, 0x180) ?? 0;
  const color = oaColor(prop(sh, 0x181) ?? 0xffffff, sh, pc);
  const opacity = fixed(prop(sh, 0x182), 1);
  const back = oaColor(prop(sh, 0x183) ?? 0xffffff, sh, pc);
  const backOpacity = fixed(prop(sh, 0x184), 1);
  switch (type) {
    case 2: case 3: {
      const pib = prop(sh, 0x186);
      // fillBlip COMPLEXO (OpenOffice grava a imagem dentro da forma, sem BStore)
      const rid = sh.props.get(0x186)?.complex ? complexImageRel(pc, sh.props.get(0x186)!) : pib ? imageRel(pc, pib) : undefined;
      if (!rid) return el('a:solidFill', {}, srgb(color, opacity));
      // fRecolorFillAsPicture: a imagem em duas cores (escuro = preenchimento, claro = fundo) — o app converte em
      // duotone; no FUNDO do slide o preenchimento default é a cor de fundo do esquema (bg1 na conversão do app)
      // (só sem fillBackColor e sem fillBlipFlags gravados: nos 13 fundos do corpus o app casa exatamente assim)
      const recolor = boolProp(sh, 0x1bf, 6, false) && prop(sh, 0x183) === undefined && prop(sh, 0x188) === undefined;
      const dflt = pc.conv.doc.drawingDefaults;
      const duo = recolor ? el('a:duotone', {}, srgb(oaColor(prop(sh, 0x181) ?? (isBackground ? 0x08000000 : dflt.get(0x181)?.value ?? 0xffffff), sh, pc)) + srgb(oaColor(prop(sh, 0x183) ?? 0xffffff, sh, pc))) : '';
      return el('a:blipFill', { dpi: 0, rotWithShape: 1 },
        el('a:blip', { 'r:embed': rid }, duo) + '<a:srcRect/>' + (type === 2 ? '<a:tile tx="0" ty="0" sx="100000" sy="100000" flip="none" algn="tl"/>' : '<a:stretch><a:fillRect/></a:stretch>'));
    }
    case 4: case 5: case 6: case 7: case 8: {
      if (type === 4 || type === 7 || type === 8) {
        // [MS-ODRAW] fillAngle θ → DrawingML ang = 90° − θ, com θ ausente/0 valendo
        // −180° (casado com a conversão do próprio PowerPoint em ~13 mil degradês
        // de formas/fundos do corpus: _lab/grad-shapes.ts e grad-agree.ts)
        const raw = prop(sh, 0x18b) === undefined ? 0 : fixed(prop(sh, 0x18b));
        const theta = raw === 0 ? -180 : raw;
        const ang = ((90 - theta) % 360 + 360) % 360;
        const gs = gradientStops(sh, pc, color, back, opacity, backOpacity, raw !== 0);
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
    case 1: { // padrão (bitmap 8×8) → pattFill predefinido; sem casamento, a cor de frente
      const pib = prop(sh, 0x186);
      const prst = pib ? patternPrst(pc.conv, pib) : undefined;
      if (prst) return el('a:pattFill', { prst }, el('a:fgClr', {}, srgb(color)) + el('a:bgClr', {}, srgb(back)));
      return el('a:solidFill', {}, srgb(color, opacity));
    }
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

/**
 * fFilled com DEFAULT medido no app de referência (conversão .ppt→.pptx do
 * próprio app em ~240 decks reais): sem fFilled na forma (nem no mestre), o
 * placeholder fica vazio; com fillColor DIFERENTE do padrão do documento
 * (FOPT do Dgg) a forma fica preenchida e com a cor igual ao padrão, vazia;
 * sem cor, caixa de texto segue o padrão do documento e autoforma fica vazia.
 */
function fillOn(sh: OAShape, pc: PartCtx): boolean {
  const own = boolPropOpt(sh, 0x1bf, 4);
  if (own !== undefined) return own;
  if (placeholderOf(sh)) return false;
  const fc = prop(sh, 0x181);
  const defs = pc.conv.doc.drawingDefaults;
  // cor própria ≠ a padrão do documento e ≠ a cor "preenchimento" do esquema (0x08000004):
  // 99,5% nas ~3,6 mil imagens e 99,0% nas ~35 mil autoformas convertidas pelo app
  // (_lab/pic-fill.ts, shape-fill.ts)
  if (sh.type === 75) return fc !== undefined && fc !== defs.get(0x181)?.value && fc !== 0x08000004;
  if (fc !== undefined) {
    // no MESTRE, a cor igual à padrão segue o fFilled padrão do documento (99,5% em ~2,4 mil
    // formas de mestre/layout convertidas pelo app, _lab/shape-fill-m.ts)
    if (pc.isMaster && fc === defs.get(0x181)?.value) return boolPropOpt({ props: defs } as OAShape, 0x1bf, 4) ?? true;
    return fc !== defs.get(0x181)?.value && fc !== 0x08000004;
  }
  if (sh.type === 202) return boolPropOpt({ props: defs } as OAShape, 0x1bf, 4) ?? true;
  return false;
}

/**
 * Default do fLine (mesma medição): linhas/conectores com contorno; caixa de
 * texto e placeholder sem; autoforma com contorno se a cor difere do padrão
 * do documento ou a largura foi dada, senão o padrão do documento.
 */
function lineDefault(sh: OAShape, pc: PartCtx): boolean {
  if (placeholderOf(sh) || sh.type === 202) return false;
  if (sh.type === 20 || isConnectorType(sh.type)) return true;
  const defs = pc.conv.doc.drawingDefaults;
  const lc = prop(sh, 0x1c0);
  if ((lc !== undefined && lc !== defs.get(0x1c0)?.value) || prop(sh, 0x1cb) !== undefined) return true;
  return boolPropOpt({ props: defs } as OAShape, 0x1ff, 3) ?? true;
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
    lIns: sprop(sh, 0x81) ?? 91440,
    tIns: sprop(sh, 0x82) ?? 45720,
    rIns: sprop(sh, 0x83) ?? 91440,
    bIns: sprop(sh, 0x84) ?? 45720,
    anchor,
    anchorCtr: anchorCtr || undefined,
    rtlCol: 0,
  }, fit ? '<a:spAutoFit/>' : '<a:noAutofit/>');
}

/** Bloco de texto da forma (ClientTextbox ou outline do slide) + extensão PP9. */
function textBlockOf(sh: OAShape, pc: PartCtx): TextBlock | undefined {
  if (!sh.clientTextbox) return undefined;
  const ct = readClientTextbox(sh.clientTextbox);
  const outl = ct.outlineRef !== undefined ? pc.outline[ct.outlineRef] : undefined;
  const block = ct.block ?? (outl && ct.ruler ? { ...outl, ruler: ct.ruler } : outl);
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
  // id OOXML original (round-trip): as animações guardadas em XML usam esse id
  const orig = metroCNvPrId(sh);
  if (orig !== undefined && !pc.ooxmlIds.has(orig)) pc.ooxmlIds.set(orig, id);
  return id;
}

/**
 * Id OOXML original da forma (round-trip): `drs/downrev.xml` (`<a:downRevStg
 * shapeId>` — inclusive gráficos, que não trazem shapexml) ou o `<p:cNvPr id>`
 * do shapexml.
 */
function metroCNvPrId(sh: OAShape): number | undefined {
  const dr = zipPartText(sh.props.get(0x3a9)?.complex, 'downrev.xml');
  const m = dr ? /shapeId="(\d+)"/.exec(dr) : null;
  if (m) return parseInt(m[1]!, 10);
  const root = metroShape(sh);
  if (!root) return undefined;
  const find = (x: { name: string; attrs: Record<string, string>; children: unknown[] }, depth: number): string | undefined => {
    if (x.name === 'p:cNvPr') return x.attrs['id'];
    if (depth > 3) return undefined;
    for (const c of x.children) {
      if (typeof c === 'object' && c && 'name' in c) {
        const v = find(c as typeof x, depth + 1);
        if (v !== undefined) return v;
      }
    }
    return undefined;
  };
  const v = find(root as unknown as { name: string; attrs: Record<string, string>; children: unknown[] }, 0);
  const n = v !== undefined ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

// ───────────────────────────── SmartArt (round-trip) ─────────────────────────────

const DGM_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
/** Tipo de relação → nome da parte do diagrama. */
const DGM_KIND: Record<string, string> = {
  [DGM_REL + 'diagramData']: 'data',
  [DGM_REL + 'diagramLayout']: 'layout',
  [DGM_REL + 'diagramQuickStyle']: 'quickStyle',
  [DGM_REL + 'diagramColors']: 'colors',
  'http://schemas.microsoft.com/office/2007/relationships/diagramDrawing': 'drawing',
};
const DGM_CT: Record<string, string> = {
  data: 'application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml',
  layout: 'application/vnd.openxmlformats-officedocument.drawingml.diagramLayout+xml',
  quickStyle: 'application/vnd.openxmlformats-officedocument.drawingml.diagramStyle+xml',
  colors: 'application/vnd.openxmlformats-officedocument.drawingml.diagramColors+xml',
  drawing: 'application/vnd.ms-office.drawingml.diagramDrawing+xml',
};

interface ZipRel { id: string; type: string; target: string; external: boolean; raw: string }

/** Relações de uma parte do zip interno (`pasta/_rels/nome.rels`). */
function zipRels(parts: Record<string, Uint8Array>, path: string): ZipRel[] {
  const i = path.lastIndexOf('/');
  const bytes = parts[`${path.slice(0, i)}/_rels/${path.slice(i + 1)}.rels`];
  if (!bytes) return [];
  const out: ZipRel[] = [];
  for (const m of strFromU8(bytes).matchAll(/<Relationship [^>]*>/g)) {
    // a tag é copiada CRUA para o pacote: só passa se for um elemento bem formado
    const raw = m[0];
    const closed = raw.endsWith('/>') ? raw : raw.replace(/>$/, '/>');
    if (raw.indexOf('<', 1) >= 0) continue;
    try { parseXml(closed); } catch { continue; }
    const a = (k: string): string | undefined => new RegExp(` ${k}="([^"]*)"`).exec(raw)?.[1];
    const id = a('Id'), type = a('Type'), target = a('Target');
    if (id && type && target) out.push({ id, type, target, external: a('TargetMode') === 'External', raw });
  }
  return out;
}

/** `target` relativo à pasta de `from` (caminhos do zip interno). */
function zipResolve(from: string, target: string): string {
  const segs = from.split('/').slice(0, -1);
  for (const s of target.split('/')) {
    if (s === '..') segs.pop();
    else if (s && s !== '.') segs.push(s);
  }
  return segs.join('/');
}

/**
 * Copia uma parte do diagrama para o pacote (`dst`) com as relações dela
 * (imagens de SmartArt com foto): os alvos internos vão para ppt/media e os
 * ids de relação são mantidos (o XML da parte os referencia).
 */
function copyDiagramPart(pc: PartCtx, parts: Record<string, Uint8Array>, src: string, dst: string, xml: string, k: number): void {
  const conv = pc.conv;
  conv.parts.set(dst, strToU8(xml));
  const rels = zipRels(parts, src);
  if (!rels.length) return;
  const items = rels.map((r) => {
    if (r.external) return r.raw;
    const from = zipResolve(src, r.target);
    const bytes = parts[from];
    if (!bytes) return r.raw;
    const base = from.slice(from.lastIndexOf('/') + 1);
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1).toLowerCase() : 'bin';
    const media = `ppt/media/dgm${k}_${base}`;
    conv.parts.set(media, bytes);
    if (ext !== 'xml') conv.mediaExts.add(ext);
    return r.raw.replace(/ Target="[^"]*"/, ` Target="../media/dgm${k}_${escAttr(base)}"`);
  });
  const i = dst.lastIndexOf('/');
  conv.parts.set(`${dst.slice(0, i)}/_rels/${dst.slice(i + 1)}.rels`, strToU8(
    `${XML_DECL}<Relationships xmlns="${NS.rel}">${items.map((r) => r.endsWith('/>') ? r : r.replace(/>$/, '/>')).join('')}</Relationships>`));
}

/**
 * SmartArt do round-trip: o .ppt guarda o diagrama como IMAGEM (o fallback
 * 97-2003) e, no metroBlob, o graphicFrame original com as partes do
 * diagrama. Reconstruído como `<p:graphicFrame>` real — como o PowerPoint faz
 * ao abrir o .ppt (inclusive a animação por partes: `<a:dgm id>` = modelId
 * das formas do desenho). Só vale se a imagem do binário ainda casa com o
 * quadro original + margens de efeito (forma movida num app antigo = fica a
 * imagem, que é o que o binário mostra).
 */
function diagramFrameXml(sh: OAShape, pc: PartCtx, xf: Xf, cNvPr: string): string | undefined {
  const dg = metroDiagram(sh);
  if (!dg) return undefined;
  const fxfrm = firstChild(dg.frame, 'p:xfrm');
  const off = fxfrm ? firstChild(fxfrm, 'a:off') : undefined;
  const ext = fxfrm ? firstChild(fxfrm, 'a:ext') : undefined;
  if (!fxfrm || !off || !ext) return undefined;
  const num = (e: XmlElement, k: string): number => parseInt(e.attrs[k] ?? '0', 10) || 0;
  const fx = num(off, 'x'), fy = num(off, 'y'), fcx = num(ext, 'cx'), fcy = num(ext, 'cy');
  const m = dg.effect ?? { l: 0, t: 0, r: 0, b: 0 };
  const tol = 3200;
  if (Math.abs(fx + m.l * fcx - xf.x) > tol || Math.abs(fy + m.t * fcy - xf.y) > tol ||
      Math.abs(fx + fcx + m.r * fcx - (xf.x + xf.cx)) > tol || Math.abs(fy + fcy + m.b * fcy - (xf.y + xf.cy)) > tol) return undefined;
  // partes: precisa ao menos de dados + desenho (o layout pronto que renderizamos)
  const found = zipRels(dg.parts, 'drs/e2oDoc.xml')
    .filter((r) => !r.external && DGM_KIND[r.type])
    .map((r) => ({ r, kind: DGM_KIND[r.type]!, src: zipResolve('drs/e2oDoc.xml', r.target) }))
    .filter((p) => dg.parts[p.src]);
  if (!found.some((p) => p.kind === 'data') || !found.some((p) => p.kind === 'drawing')) return undefined;
  const k = ++pc.conv.diagrams;
  const newId = new Map<string, string>();
  for (const p of found) newId.set(p.r.id, pc.rels.add(p.r.type, `../diagrams/${p.kind}${k}.xml`));
  for (const p of found) {
    const dst = `ppt/diagrams/${p.kind}${k}.xml`;
    let xml = strFromU8(dg.parts[p.src]!);
    // dados → desenho: `<dsp:dataModelExt relId>` aponta a relação da PARTE DONA (o slide)
    if (p.kind === 'data') xml = xml.replace(/(<dsp:dataModelExt [^>]*relId=")([^"]+)"/, (_s, a: string, id: string) => `${a}${newId.get(id) ?? id}"`);
    copyDiagramPart(pc, dg.parts, p.src, dst, xml, k);
    pc.conv.overrides.set(dst, dg.types.get(p.src) ?? DGM_CT[p.kind]!);
  }
  const ids = firstChild(firstChild(firstChild(dg.frame, 'a:graphic') ?? dg.frame, 'a:graphicData') ?? dg.frame, 'dgm:relIds');
  const rid = (a: string): string | undefined => { const v = ids?.attrs[a]; return v ? newId.get(v) : undefined; };
  const relIds = el('dgm:relIds', { 'xmlns:dgm': 'http://schemas.openxmlformats.org/drawingml/2006/diagram',
    'r:dm': rid('r:dm'), 'r:lo': rid('r:lo'), 'r:qs': rid('r:qs'), 'r:cs': rid('r:cs') });
  return el('p:graphicFrame', {},
    el('p:nvGraphicFramePr', {}, cNvPr + '<p:cNvGraphicFramePr/><p:nvPr/>') +
    serializeXml(fxfrm) +
    el('a:graphic', {}, el('a:graphicData', { uri: 'http://schemas.openxmlformats.org/drawingml/2006/diagram' }, relIds)));
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
    line: lineXml(sh, pc, kind !== 'pic' && lineDefault(sh, pc)),
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

/**
 * Ajustes de imagem do binário → filhos do <a:blip>, como a conversão do app
 * (medido em ~60 imagens do corpus, _lab/tmp/picprops.ts): cor transparente
 * (0x107) → clrChange para alpha 0; brilho (0x109, ±32768 = ±100%) e contraste
 * (0x108, 16.16: < 1 → (c−1), > 1 → 1 − 1/c) → <a:lum>; escala de cinza / preto
 * e branco (0x13F bits 2/1) → grayscl / biLevel.
 */
function blipAdjustXml(sh: OAShape, pc: PartCtx): string {
  let out = '';
  const tr = prop(sh, 0x107);
  if (tr !== undefined) {
    const c = oaColor(tr, sh, pc);
    out += el('a:clrChange', {}, el('a:clrFrom', {}, srgb(c)) + el('a:clrTo', {}, el('a:srgbClr', { val: c.replace('#', '').toUpperCase() }, '<a:alpha val="0"/>')));
  }
  const br = prop(sh, 0x109), ct = prop(sh, 0x108);
  const bright = br !== undefined ? Math.round(((br | 0) / 32768) * 100) * 1000 : 0;
  let contrast = 0;
  if (ct !== undefined) {
    const c = (ct >>> 0) / 65536;
    contrast = Math.round((c < 1 ? c - 1 : 1 - 1 / c) * 100) * 1000;
  }
  if (bright || contrast) out += el('a:lum', { bright: bright || undefined, contrast: contrast || undefined });
  if (boolProp(sh, 0x13f, 2, false)) out += '<a:grayscl/>';
  else if (boolProp(sh, 0x13f, 1, false)) out += '<a:biLevel thresh="50000"/>';
  return out;
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

  // SmartArt de round-trip (a imagem do binário é só o fallback 97-2003)
  if (pc.conv.useRoundTrip && sh.props.has(0x3a9)) {
    const dgm = diagramFrameXml(sh, pc, xf, cNvPr);
    if (dgm) return dgm;
  }

  // imagem (PictureFrame ou qualquer forma com pib)
  if (pib) {
    const rid = recolorRel(sh, pc, pib) ?? imageRel(pc, pib);
    if (rid) {
      const v = visualParts(sh, pc, xf, 'pic', inGroup);
      const crop = (pid: number): number => Math.round(fixed(prop(sh, pid)) * 100000);
      const t = crop(0x100), b = crop(0x101), l = crop(0x102), r = crop(0x103);
      const blipFill = el('p:blipFill', {},
        el('a:blip', { 'r:embed': rid }, blipAdjustXml(sh, pc)) +
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
    pc.conv.textBudget -= block.text.length;
    if (pc.conv.textBudget < 0) throw new Error('texto convertido excede o limite (blocos repetidos demais)');
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
  // as LETRAS levam o contorno, o preenchimento (sólido/degradê/padrão) e a sombra da forma
  // (como a conversão do próprio app: <a:ln> + pattFill + outerShdw no rPr)
  const fx = fillXml(sh, pc);
  const letterFill = /^<a:(solidFill|gradFill|pattFill)/.test(fx) ? fx : el('a:solidFill', {}, srgb(color));
  const rPr = el('a:rPr', { sz: Math.round(szPt * 100), b: bold ? 1 : 0, i: italic ? 1 : 0 },
    lineXml(sh, pc, true) + letterFill + shadowXml(sh, pc) + (font ? el('a:latin', { typeface: font }) : ''));
  const paras = lines.map((l) => `<a:p><a:pPr algn="ctr"><a:buNone/></a:pPr><a:r>${rPr}<a:t>${escText(l)}</a:t></a:r></a:p>`).join('');
  // msosptText* (136–175) ↔ prstTxWarp na MESMA ordem do DrawingML
  const warp = sh.type >= 136 && sh.type <= 175 ? WARPS[sh.type - 136] : undefined;
  const w = warp ? el('a:prstTxWarp', { prst: warp }, '<a:avLst/>') : '';
  return el('p:txBody', {}, `<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" rtlCol="0"${warp ? ' fromWordArt="1"' : ''}>${w}<a:noAutofit/></a:bodyPr><a:lstStyle/>` + paras);
}

const WARPS = ['textPlain', 'textStop', 'textTriangle', 'textTriangleInverted', 'textChevron', 'textChevronInverted', 'textRingInside', 'textRingOutside',
  'textArchUp', 'textArchDown', 'textCircle', 'textButton', 'textArchUpPour', 'textArchDownPour', 'textCirclePour', 'textButtonPour', 'textCurveUp',
  'textCurveDown', 'textCascadeUp', 'textCascadeDown', 'textWave1', 'textWave2', 'textDoubleWave1', 'textWave4', 'textInflate', 'textDeflate',
  'textInflateBottom', 'textDeflateBottom', 'textInflateTop', 'textDeflateTop', 'textDeflateInflate', 'textDeflateInflateDeflate', 'textFadeRight',
  'textFadeLeft', 'textFadeUp', 'textFadeDown', 'textSlantUp', 'textSlantDown', 'textCanUp', 'textCanDown'];

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
  // fundo "a partir do título" (msofillShadeShape no FUNDO): o app grava shadeToTitle
  // (2 de 2 decks da conversão do próprio PowerPoint)
  const toTitle = (prop(bg, 0x180) ?? 0) === 6;
  return el('p:bg', {}, el('p:bgPr', toTitle ? { shadeToTitle: 1 } : {}, fill + '<a:effectLst/>'));
}

/** Cor sólida efetiva do fundo (para fillType "background" das formas). */
export function backgroundColor(bg: OAShape | undefined, pc: PartCtx): string | undefined {
  if (!bg) return undefined;
  const type = prop(bg, 0x180) ?? 0;
  return type === 0 ? oaColor(prop(bg, 0x181) ?? 0xffffff, bg, pc) : undefined;
}
