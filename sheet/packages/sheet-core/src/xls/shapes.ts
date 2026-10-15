/**
 * Formas do OfficeArt da planilha .xls (retângulos, elipses, linhas, caixas de
 * texto, formas livres, WordArt, autoformas do Excel 2007+ salvas em .xls,
 * imagens e grupos) → objetos DrawingML (`<xdr:sp>`, `<xdr:cxnSp>`,
 * `<xdr:pic>`, `<xdr:grpSp>`), com o texto do TXO (runs de fonte) no
 * `<xdr:txBody>`.
 *
 * Propriedades do FOPT ([MS-ODRAW] 2.3): geometria (0x0140–0x017F),
 * preenchimento (0x0180–0x01BF), linha (0x01C0–0x01FF), sombra (0x0200–),
 * margens/âncora do texto (0x0081–0x0087), rotação (0x0004). Cores
 * OfficeArtCOLORREF: RGB, índice da paleta da pasta (fSchemeIndex — como o
 * Excel grava: 0x08000040 = texto da janela, 0x08000041 = fundo da janela) ou
 * cor de sistema/da própria forma (fSysIndex). A conversão segue a do leitor
 * .ppt do Slides (slides-core/src/ppt/shapeconv.ts), com os padrões do Excel.
 *
 * Excel 2007+ grava no metroBlob (0x03A9) o XML DrawingML ORIGINAL da forma
 * (`drs/shapexml.xml`: `<xdr:sp>` com estilos do tema, texto sem máscara);
 * ao abrir o .xls ele o usa se a forma não foi alterada por uma versão antiga
 * (checksums do downrev.xml). Aqui: âncora e texto do binário têm de bater
 * com os do XML — então ele vale no lugar da conversão.
 */
import { unzipSync, strFromU8 } from 'fflate';
import type { XlsGlobals } from './globals.js';
import type { ObjInfo } from './sheet.js';
import type { OARect, XlsShape } from './officeart.js';
import { fontAt, icvColor } from './styles-xml.js';
import { xmlText } from './xmlw.js';
import { parseXml, firstChild, childElements, type XmlElement } from '../xml.js';
import {
  arcGeomXml, custGeomXml, hasPreset, isConnectorType, isWordArtType, presetGeomXml, rawAdjust, warpAdjust, WARPS,
} from './odraw-geom.js';

/** O que a conversão de uma forma precisa do desenho em volta. */
export interface ShapeEnv {
  g: XlsGlobals;
  /** FOPT padrão do documento (DggContainer). */
  defaults: Map<number, number>;
  /** OBJ ligado à forma (pelo ClientData). */
  objOf(s: XlsShape): ObjInfo | undefined;
  /** Próximo cNvPr id único no desenho. */
  nextId(): number;
  /** rId da imagem `pib` (grava a mídia e o relacionamento) — undefined = sem imagem. */
  imageRel(pib: number): string | undefined;
  /** Bytes da imagem `pib` (padrões de preenchimento). */
  blipBytes(pib: number): Uint8Array | undefined;
  /** rId do gráfico do OBJ (gráfico dentro de grupo). */
  chartRel?(obj: ObjInfo): string | undefined;
  /** Preenchimento de GRÁFICO (GELFRAME): ângulo do degradê na convenção do Excel. */
  chart?: boolean;
}

/** OBJ que NÃO viram forma: notas, controles de formulário, setas de filtro/validação. */
const SKIP_OBJS = new Set([7, 0x0b, 0x0c, 0x0d, 0x0e, 0x10, 0x11, 0x12, 0x13, 0x14, 0x19]);

const prop = (s: XlsShape, id: number): number | undefined => s.props.get(id);
const sprop = (s: XlsShape, id: number): number | undefined => { const v = s.props.get(id); return v === undefined ? undefined : v | 0; };
/** 16.16 fixo com sinal → número. */
const fixed = (v: number | undefined, dflt = 0): number => (v === undefined ? dflt : (v | 0) / 65536);

/**
 * Booleano de um conjunto de flags (0x..BF/FF): bit `bit` = valor, bit+16 =
 * "fUse" (valor especificado). Sem nenhum fUse no conjunto (escritores
 * antigos), o valor vale como está.
 */
function boolOpt(props: Map<number, number>, id: number, bit: number): boolean | undefined {
  const v = props.get(id);
  if (v === undefined) return undefined;
  if (v & (1 << (bit + 16))) return (v & (1 << bit)) !== 0;
  if ((v >>> 16) === 0) return (v & (1 << bit)) !== 0;
  return undefined;
}
const boolProp = (s: XlsShape, id: number, bit: number, dflt: boolean): boolean => boolOpt(s.props, id, bit) ?? dflt;

/** Forma oculta (fHidden do conjunto de grupo 0x03BF)? */
export function isHiddenShape(s: XlsShape): boolean {
  return boolProp(s, 0x3bf, 1, false);
}

/** Tipo de objeto a gerar para a forma (undefined = fica de fora). */
export function shapeKind(s: XlsShape, obj: ObjInfo | undefined): 'group' | 'chart' | 'pic' | 'shape' | undefined {
  if (s.group) return 'group';
  if (obj?.ot === 5) return 'chart';
  if (obj && SKIP_OBJS.has(obj.ot)) return undefined;
  if (prop(s, 0x104) !== undefined) return 'pic';
  if (s.type === 75 || s.type === 201) return undefined; // moldura sem imagem / controle
  if (hasPreset(s.type) || isWordArtType(s.type) || s.complex.has(0x145)) return 'shape';
  return undefined;
}

// ───────────────────────────── cores ─────────────────────────────

/** Cores de sistema (GetSysColor) com os valores padrão do Windows. */
const SYS_COLORS = [
  'C8C8C8', '000000', '99B4D1', 'BFCDDB', 'F0F0F0', 'FFFFFF', '646464', '000000', '000000', '000000',
  'B4B4B4', 'F4F7FC', 'ABABAB', '3399FF', 'FFFFFF', 'F0F0F0', 'A0A0A0', '6D6D6D', '000000', '434E54',
  'FFFFFF', '696969', 'E3E3E3', '000000', 'FFFFE1',
];

const hex2 = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();

/**
 * OfficeArtCOLORREF → 'RRGGBB'. Byte alto: 0x08 = índice da paleta da pasta
 * (fSchemeIndex, como o Excel grava), 0x10 = cor de sistema/especial (0xF0 =
 * cor do preenchimento, 0xF2 = da linha… com a função de clarear/escurecer no
 * 2º byte e o parâmetro no 3º), senão RGB.
 */
export function oaColor(env: ShapeEnv, value: number, s: XlsShape, depth = 0): string {
  const flags = (value >>> 24) & 0xff;
  const r = value & 0xff, g = (value >>> 8) & 0xff, b = (value >>> 16) & 0xff;
  if (flags & 0x08 || flags & 0x01) return (icvColor(value & 0xffff, env.g.palette, 'fg') ?? '#000000').slice(1).toUpperCase();
  if (flags & 0x10) {
    const idx = value & 0xff;
    const fn = (value >>> 8) & 0x0f;
    const invert = ((value >>> 8) & 0x20) !== 0;
    const param = (value >>> 16) & 0xff;
    const sub = (id: number, d: number): string => (depth > 2 ? '000000' : oaColor(env, prop(s, id) ?? env.defaults.get(id) ?? d, s, depth + 1));
    let base: string;
    switch (idx) {
      case 0xf0: base = sub(0x181, 0xffffff); break;
      case 0xf1: base = boolProp(s, 0x1ff, 3, true) ? sub(0x1c0, 0) : sub(0x181, 0xffffff); break;
      case 0xf2: base = sub(0x1c0, 0); break;
      case 0xf3: base = sub(0x201, 0x808080); break;
      case 0xf5: base = sub(0x183, 0xffffff); break;
      case 0xf6: base = sub(0x1c2, 0xffffff); break;
      case 0xf7: base = boolProp(s, 0x1bf, 4, true) ? sub(0x181, 0xffffff) : sub(0x1c0, 0); break;
      default: base = SYS_COLORS[idx] ?? '000000';
    }
    let [cr, cg, cb] = [0, 2, 4].map((i) => parseInt(base.slice(i, i + 2), 16)) as [number, number, number];
    const f = (c: number): number => {
      switch (fn) {
        case 1: return (c * param) / 255;
        case 2: return 255 - ((255 - c) * param) / 255;
        case 3: return c + param;
        case 4: return c - param;
        case 5: return param - c;
        case 6: return c < param ? 0 : 255;
        default: return c;
      }
    };
    [cr, cg, cb] = [f(cr), f(cg), f(cb)];
    if (invert) [cr, cg, cb] = [255 - cr, 255 - cg, 255 - cb];
    return hex2(cr) + hex2(cg) + hex2(cb);
  }
  return hex2(r) + hex2(g) + hex2(b);
}

function srgb(val: string, alpha?: number): string {
  return alpha !== undefined && alpha < 1
    ? `<a:srgbClr val="${val}"><a:alpha val="${Math.round(Math.max(0, alpha) * 100000)}"/></a:srgbClr>`
    : `<a:srgbClr val="${val}"/>`;
}

/** Propriedade da forma ou, ausente, a padrão do documento. */
const withDefault = (env: ShapeEnv, s: XlsShape, id: number): number | undefined => prop(s, id) ?? env.defaults.get(id);

// ───────────────────────────── preenchimento ─────────────────────────────

/** IMsoArray de cores do degradê (fillShadeColors: cor + posição 16.16). */
function shadeColors(b: Uint8Array | undefined): { color: number; pos: number }[] | undefined {
  if (!b || b.length < 6) return undefined;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = v.getUint16(0, true), size = v.getUint16(4, true);
  if (size !== 8 || n < 2 || 6 + n * 8 > b.length) return undefined;
  const out: { color: number; pos: number }[] = [];
  for (let i = 0; i < n; i++) out.push({ color: v.getUint32(6 + i * 8, true), pos: (v.getInt32(10 + i * 8, true)) / 65536 });
  return out.sort((x, y) => x.pos - y.pos);
}

/** Paradas do degradê ao longo do vetor (foco: 0 = cor → fundo, ±100 = invertido, entre = espelhado). */
function gradientStops(env: ShapeEnv, s: XlsShape, fill: string, back: string, fillA: number, backA: number, flipMirror: boolean): string {
  type Stop = { pos: number; color: string; alpha?: number };
  const arr = shadeColors(s.complex.get(0x197));
  const list: Stop[] = arr ? arr.map((c) => ({ pos: c.pos, color: oaColor(env, c.color, s) }))
    : [{ pos: 0, color: fill, alpha: fillA }, { pos: 1, color: back, alpha: backA }];
  const focus = sprop(s, 0x18c) ?? 0;
  const rev = (l: Stop[]): Stop[] => l.map((x) => ({ ...x, pos: 1 - x.pos })).reverse();
  let stops: Stop[];
  if (focus === 0) stops = list;
  else if (focus >= 100 || focus <= -100) stops = rev(list);
  else {
    const F = Math.abs(focus) / 100;
    const fillAtEnds = (focus > 0) !== flipMirror;
    const a = fillAtEnds ? list : rev(list);
    stops = [...a.map((x) => ({ ...x, pos: x.pos * F })), ...rev(a).map((x) => ({ ...x, pos: F + x.pos * (1 - F) }))];
  }
  stops.sort((x, y) => x.pos - y.pos);
  stops = stops.filter((st, i) => i === 0 || st.pos !== stops[i - 1]!.pos || st.color !== stops[i - 1]!.color || st.alpha !== stops[i - 1]!.alpha);
  return `<a:gsLst>${stops.map((st) => `<a:gs pos="${Math.round(Math.max(0, Math.min(1, st.pos)) * 100000)}">${srgb(st.color, st.alpha)}</a:gs>`).join('')}</a:gsLst>`;
}

/** Padrões predefinidos do DrawingML (bitmap 8×8; cópia de slides-core/src/patterns.ts). */
const PRESET_PATTERNS: Record<string, string> = {
  pct5: '8000000008000000', pct10: '8000080080000800', pct20: '8800220088002200', pct25: '8822882288228822',
  pct30: 'aa44aa11aa44aa11', pct40: 'aa55aa51aa55aa15', pct50: 'aa55aa55aa55aa55', pct60: 'ee55bb55ee55bb55',
  pct70: '77dd77dd77dd77dd', pct75: '77ffddff77ffddff', pct80: 'effffeffeffffeff', pct90: 'fffffff7ffffff7f',
  horz: 'ff00000000000000', vert: '8080808080808080', ltHorz: 'ff000000ff000000', ltVert: '8888888888888888',
  dkHorz: 'ffff0000ffff0000', dkVert: 'cccccccccccccccc', narHorz: 'ff00ff00ff00ff00', narVert: '5555555555555555',
  dashHorz: 'f00000000f000000', dashVert: '8080808008080808', cross: 'ff80808080808080', dnDiag: '8040201008040201',
  upDiag: '0102040810204080', ltDnDiag: '8844221188442211', ltUpDiag: '1122448811224488', dkDnDiag: 'cc663399cc663399',
  dkUpDiag: '3366cc993366cc99', wdDnDiag: 'c1e070381c0e0783', wdUpDiag: '83070e1c3870e0c1', dashDnDiag: '0000884422110000',
  dashUpDiag: '0000112244880000', diagCross: '8142241818244281', smCheck: '9966669999666699', lgCheck: 'f0f0f0f00f0f0f0f',
  smGrid: 'ff888888ff888888', lgGrid: 'ff80808080808080', dotGrid: 'aa00800080008000', smConfetti: '8008400210012004',
  lgConfetti: 'b130031bd8c00c8d', horzBrick: 'ff808080ff080808', diagBrick: '0102040818244281', solidDmnd: '10387cfe7c381000',
  openDmnd: '8244281028448201', dotDmnd: '8000220008002200', plaid: 'aa55aa55f0f0f0f0', sphere: '77898f8f7798f8f8',
  weave: '8854224588142251', divot: '0010081000800180', shingle: '038448300c020101', wave: '001825c0001825c0',
  trellis: 'ff66ff99ff66ff99', zigZag: '8142241881422418',
};

/**
 * Preenchimento de PADRÃO: o fillBlip é um BMP 1 bpp 8×8 — casa o bitmap
 * (pixel claro = cor de frente) com os padrões predefinidos em qualquer fase.
 */
function patternPrst(b: Uint8Array | undefined): string | undefined {
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

/** Preenchimento → `<a:noFill/>`, sólido, degradê, padrão ou imagem. */
function fillXml(env: ShapeEnv, s: XlsShape, on: boolean): string {
  if (!on) return '<a:noFill/>';
  const type = prop(s, 0x180) ?? 0;
  const color = oaColor(env, withDefault(env, s, 0x181) ?? 0xffffff, s);
  const opacity = fixed(prop(s, 0x182), 1);
  const back = oaColor(env, withDefault(env, s, 0x183) ?? 0xffffff, s);
  const backOpacity = fixed(prop(s, 0x184), 1);
  const solid = `<a:solidFill>${srgb(color, opacity)}</a:solidFill>`;
  switch (type) {
    case 2: case 3: {
      const pib = prop(s, 0x186);
      const rid = pib ? env.imageRel(pib) : undefined;
      if (!rid) return solid;
      return `<a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${rid}"/><a:srcRect/>`
        + (type === 2 ? '<a:tile tx="0" ty="0" sx="100000" sy="100000" flip="none" algn="tl"/>' : '<a:stretch><a:fillRect/></a:stretch>') + '</a:blipFill>';
    }
    case 4: case 5: case 6: case 7: case 8: {
      if (type === 4 || type === 7 || type === 8) {
        // [MS-ODRAW] fillAngle θ → ang = 90° − θ, θ ausente/0 valendo −180° (medido no Slides);
        // no GELFRAME dos gráficos do Excel, ang = 270° − θ (o degradê do tema 2007 — escuro embaixo —
        // vem com θ = 180° e foco 100: medido no oráculo, poi-WithTwoCharts/poi-48180)
        const raw = prop(s, 0x18b) === undefined ? 0 : fixed(prop(s, 0x18b));
        const theta = raw === 0 ? -180 : raw;
        const ang = env.chart ? ((270 - raw) % 360 + 360) % 360 : ((90 - theta) % 360 + 360) % 360;
        return `<a:gradFill flip="none" rotWithShape="1">${gradientStops(env, s, color, back, opacity, backOpacity, raw !== 0)}`
          + `<a:lin ang="${Math.round(ang * 60000) % 21600000}" scaled="${type === 7 ? 1 : 0}"/></a:gradFill>`;
      }
      // radial (shadeCenter/shadeShape): fundo no foco (fillTo*), cor de preenchimento na borda
      const l = fixed(prop(s, 0x18d)), t = fixed(prop(s, 0x18e)), r = fixed(prop(s, 0x18f)), b = fixed(prop(s, 0x190));
      return `<a:gradFill flip="none" rotWithShape="1">${gradientStops(env, s, back, color, backOpacity, opacity, false)}`
        + `<a:path path="${type === 6 ? 'shape' : 'rect'}"><a:fillToRect l="${Math.round(l * 100000)}" t="${Math.round(t * 100000)}" r="${Math.round((1 - r) * 100000)}" b="${Math.round((1 - b) * 100000)}"/></a:path></a:gradFill>`;
    }
    case 1: { // padrão (bitmap 8×8) → pattFill predefinido; sem casamento, a cor de frente
      const pib = prop(s, 0x186);
      const prst = pib ? patternPrst(env.blipBytes(pib)) : undefined;
      if (prst) return `<a:pattFill prst="${prst}"><a:fgClr>${srgb(color)}</a:fgClr><a:bgClr>${srgb(back)}</a:bgClr></a:pattFill>`;
      return solid;
    }
    case 9: return '<a:noFill/>'; // fundo (msofillBackground): a célula aparece
    default: return solid;
  }
}

/**
 * Preenchimento a partir de propriedades soltas do FOPT (GELFRAME dos
 * gráficos): sólido, degradê (fillShadeColors/ângulo/foco) ou padrão; sem
 * imagens. undefined = fFilled desligado.
 */
export function foptFillXml(g: XlsGlobals, props: Map<number, number>, complex: Map<number, Uint8Array>): string | undefined {
  const s: XlsShape = { spid: 0, type: 1, flags: 0, props, complex, group: false };
  const env: ShapeEnv = {
    g, defaults: new Map(), objOf: () => undefined, nextId: () => 0, imageRel: () => undefined, blipBytes: () => undefined, chart: true,
  };
  if (!boolProp(s, 0x1bf, 4, true)) return undefined;
  return fillXml(env, s, true);
}

// ───────────────────────────── contorno, sombra ─────────────────────────────

const DASH = ['solid', 'sysDash', 'sysDot', 'sysDashDot', 'sysDashDotDot', 'dot', 'dash', 'lgDash', 'dashDot', 'lgDashDot', 'lgDashDotDot'];
const ARROW = ['none', 'triangle', 'stealth', 'diamond', 'oval', 'arrow'];
const ARROW_SZ = ['sm', 'med', 'lg'];

function arrowEnd(tag: string, s: XlsShape, typeId: number, wId: number, lenId: number): string {
  const t = prop(s, typeId) ?? 0;
  if (!t) return '';
  const w = prop(s, wId), len = prop(s, lenId);
  return `<${tag} type="${ARROW[t] ?? 'triangle'}"${w !== undefined && w !== 1 && ARROW_SZ[w] ? ` w="${ARROW_SZ[w]}"` : ''}`
    + `${len !== undefined && len !== 1 && ARROW_SZ[len] ? ` len="${ARROW_SZ[len]}"` : ''}/>`;
}

/** Contorno → `<a:ln>` (padrão do Excel: preto 0,75 pt). */
function lineXml(env: ShapeEnv, s: XlsShape, on: boolean): string {
  if (!on) return '<a:ln><a:noFill/></a:ln>';
  const w = Math.max(0, Math.min(prop(s, 0x1cb) ?? 9525, 20 * 12700));
  const color = oaColor(env, withDefault(env, s, 0x1c0) ?? 0, s);
  const alpha = fixed(prop(s, 0x1c1), 1);
  const dash = prop(s, 0x1ce) ?? 0;
  const cap = prop(s, 0x1d7);
  const cmpd = prop(s, 0x1cd);
  const join = prop(s, 0x1d6);
  let kids = `<a:solidFill>${srgb(color, alpha)}</a:solidFill><a:prstDash val="${DASH[dash] ?? 'solid'}"/>`;
  kids += join === 0 ? '<a:bevel/>' : join === 1 ? '<a:miter lim="800000"/>' : '<a:round/>';
  kids += arrowEnd('a:headEnd', s, 0x1d0, 0x1d2, 0x1d3) + arrowEnd('a:tailEnd', s, 0x1d1, 0x1d4, 0x1d5);
  const capA = cap === 0 ? ' cap="rnd"' : cap === 1 ? ' cap="sq"' : '';
  const cmpdA = cmpd ? ` cmpd="${['sng', 'dbl', 'thickThin', 'thinThick', 'tri'][cmpd] ?? 'sng'}"` : '';
  return `<a:ln w="${w}"${capA}${cmpdA}>${kids}</a:ln>`;
}

/** Sombra (fShadow) → `<a:effectLst><a:outerShdw>`. */
function shadowXml(env: ShapeEnv, s: XlsShape): string {
  if (!boolProp(s, 0x23f, 1, false)) return '';
  const color = oaColor(env, prop(s, 0x201) ?? 0x808080, s);
  const alpha = fixed(prop(s, 0x204), 1);
  const ox = sprop(s, 0x205) ?? 25400, oy = sprop(s, 0x206) ?? 25400;
  const dist = Math.round(Math.hypot(ox, oy));
  let dir = Math.round((Math.atan2(oy, ox) * 180 / Math.PI) * 60000);
  if (dir < 0) dir += 21600000;
  const blur = prop(s, 0x21c) ?? 0;
  return `<a:effectLst><a:outerShdw${blur ? ` blurRad="${blur}"` : ''} dist="${dist}" dir="${dir}" algn="ctr" rotWithShape="0">${srgb(color, alpha)}</a:outerShdw></a:effectLst>`;
}

// ───────────────────────────── geometria, posição ─────────────────────────────

/** Caixa no espaço do pai: off/ext + giro/espelho. `box` undefined = forma de nível superior (a âncora manda). */
interface Box { x: number; y: number; w: number; h: number }

function rotationDeg(s: XlsShape): number {
  const r = fixed(prop(s, 0x0004));
  return ((r % 360) + 360) % 360;
}

/**
 * Caixa de uma forma DENTRO de grupo: a ChildAnchor; giradas entre 45° e 135°
 * (e 225°–315°) guardam a caixa já "deitada" (largura/altura trocadas em
 * torno do centro) — no nível superior quem desfaz isso é o renderizador.
 */
function childBox(s: XlsShape): Box | undefined {
  const a = s.childAnchor;
  if (!a) return undefined;
  let x = Math.min(a.l, a.r), y = Math.min(a.t, a.b);
  let w = Math.abs(a.r - a.l), h = Math.abs(a.b - a.t);
  const rot = rotationDeg(s);
  if ((rot >= 45 && rot < 135) || (rot >= 225 && rot < 315)) {
    const cx = x + w / 2, cy = y + h / 2;
    [w, h] = [h, w];
    x = cx - w / 2; y = cy - h / 2;
  }
  return { x, y, w, h };
}

function xfrmXml(s: XlsShape, box: Box | undefined, extraFlipV = false, inner = ''): string {
  const rot = Math.round(rotationDeg(s) * 60000) % 21600000;
  const flipH = (s.flags & 0x40) !== 0, flipV = ((s.flags & 0x80) !== 0) !== extraFlipV;
  const b = box ?? { x: 0, y: 0, w: 0, h: 0 };
  return `<a:xfrm${rot ? ` rot="${rot}"` : ''}${flipH ? ' flipH="1"' : ''}${flipV ? ' flipV="1"' : ''}>`
    + `<a:off x="${Math.round(b.x)}" y="${Math.round(b.y)}"/><a:ext cx="${Math.round(b.w)}" cy="${Math.round(b.h)}"/>${inner}</a:xfrm>`;
}

/** Geometria: arco, forma livre ou preset (com os ajustes); devolve o flipV extra das presets espelhadas. */
function geometryXml(s: XlsShape, w: number, h: number): { xml: string; flipV: boolean } {
  if (s.type === 19) return { xml: arcGeomXml(s.props), flipV: false };
  if (!hasPreset(s.type) || s.type === 0) {
    const cg = custGeomXml(s.props, s.complex);
    if (cg) return { xml: cg, flipV: false };
  }
  return presetGeomXml(s.type, rawAdjust(s.props), w, h) ?? { xml: '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>', flipV: false };
}

// ───────────────────────────── texto ─────────────────────────────

const H_ALIGN: Record<number, string> = { 1: 'l', 2: 'ctr', 3: 'r', 4: 'just', 7: 'dist' };
const V_ANCHOR: Record<number, string> = { 1: 't', 2: 'ctr', 3: 'b', 4: 'just', 7: 'dist' };

/** Texto do TXO → `<xdr:txBody>` (parágrafos por quebra de linha, runs pelas fontes). */
function txBody(env: ShapeEnv, s: XlsShape, obj: ObjInfo | undefined): string {
  const text = obj?.text;
  if (!text || !text.text) return '';
  const g = env.g;
  const al = obj.txoAlign ?? 0;
  const algn = H_ALIGN[(al >>> 1) & 7] ?? 'l';
  const anchor = V_ANCHOR[(al >>> 4) & 7] ?? 't';
  // fAutoTextMargin (textBool bit 3): margens automáticas — as que o Excel grava ao converter
  // a caixa de texto legada para DrawingML (0,03" à esquerda, 0,025" em cima, 0 nos outros lados)
  const auto = boolProp(s, 0xbf, 3, false);
  const ins = (pid: number, def: number, autoV: number): number => (auto ? autoV : sprop(s, pid) ?? def);
  const rot = obj.txoRot ?? 0;
  const vert = rot === 1 ? ' vert="wordArtVert"' : rot === 2 ? ' vert="vert270"' : rot === 3 ? ' vert="vert"' : '';
  const wrap = (prop(s, 0x85) ?? 0) === 2 ? 'none' : 'square';
  const body = `<a:bodyPr vertOverflow="clip" wrap="${wrap}" lIns="${ins(0x81, 91440, 27432)}" tIns="${ins(0x82, 45720, 22860)}" rIns="${ins(0x83, 91440, 0)}" bIns="${ins(0x84, 45720, 0)}" anchor="${anchor}"${vert}/>`;
  // runs: [ich, ifnt] ordenados; antes do 1º run, a fonte 0
  const runs = [...(text.runs ?? [])].sort((a, b) => a.ich - b.ich);
  if (!runs.length || runs[0]!.ich > 0) runs.unshift({ ich: 0, ifnt: 0 });
  const rpr = (ifnt: number, tag = 'a:rPr'): string => {
    const f = fontAt(g, ifnt);
    const color = icvColor(f.color, g.palette, 'font') ?? '#000000';
    const u = f.underline === 2 || f.underline === 0x22 ? ' u="dbl"' : f.underline ? ' u="sng"' : '';
    const base = f.script === 1 ? ' baseline="30000"' : f.script === 2 ? ' baseline="-25000"' : '';
    return `<${tag} lang="pt-BR" sz="${Math.round((f.height / 20) * 100)}" b="${f.weight >= 600 ? 1 : 0}" i="${f.italic ? 1 : 0}"${u}${f.strike ? ' strike="sngStrike"' : ''}${base}>`
      + `<a:solidFill><a:srgbClr val="${color.replace('#', '').toUpperCase()}"/></a:solidFill><a:latin typeface="${xmlText(f.name)}"/><a:cs typeface="${xmlText(f.name)}"/></${tag}>`;
  };
  const paras: { xml: string; ifnt: number }[] = [];
  let cur = '';
  let curFont = runs[0]!.ifnt;
  const full = text.text.replace(/\r\n?/g, '\n');
  runs.forEach((r, i) => {
    const end = i + 1 < runs.length ? runs[i + 1]!.ich : full.length;
    const seg = full.slice(r.ich, end);
    const lines = seg.split('\n');
    lines.forEach((line, k) => {
      if (k > 0) { paras.push({ xml: cur, ifnt: curFont }); cur = ''; }
      curFont = r.ifnt;
      if (line) cur += `<a:r>${rpr(r.ifnt)}<a:t>${xmlText(line)}</a:t></a:r>`;
    });
  });
  paras.push({ xml: cur, ifnt: curFont });
  // parágrafo vazio leva a altura da fonte do ponto (endParaRPr)
  const pXml = paras.map((p) => `<a:p><a:pPr algn="${algn}"/>${p.xml}${p.xml ? '' : rpr(p.ifnt, 'a:endParaRPr')}</a:p>`).join('');
  return `<xdr:txBody>${body}<a:lstStyle/>${pXml}</xdr:txBody>`;
}

/** String UTF-16 de uma propriedade complexa (sem o terminador). */
function propString(b: Uint8Array | undefined): string | undefined {
  if (!b || b.length < 2) return undefined;
  let t = '';
  for (let i = 0; i + 1 < b.length; i += 2) {
    const c = b[i]! | (b[i + 1]! << 8);
    if (!c) break;
    t += String.fromCharCode(c);
  }
  return t || undefined;
}

/**
 * WordArt clássico (gtextUNICODE 0xC0, gtextFont 0xC5, gtextSize 0xC3) →
 * texto com prstTxWarp; as LETRAS levam o preenchimento, o contorno e a
 * sombra da forma (como a conversão do Office).
 */
function wordArtBody(env: ShapeEnv, s: XlsShape, w: number, h: number): string | undefined {
  const text = propString(s.complex.get(0xc0));
  if (!text) return undefined;
  const font = propString(s.complex.get(0xc5));
  const bold = boolProp(s, 0xff, 5, false), italic = boolProp(s, 0xff, 4, false);
  const lines = text.split(/\r\n|\r|\n/);
  const warp = s.type >= 136 && s.type <= 175 ? WARPS[s.type - 136] : undefined;
  let szPt: number;
  if (warp) szPt = fixed(prop(s, 0xc3), 36) || 36;
  else {
    const longest = Math.max(1, ...lines.map((l) => l.length));
    szPt = Math.max(4, Math.min(400, (h / 12700 / lines.length) * 0.75, (w / 12700) / (longest * (bold ? 0.66 : 0.6))));
  }
  const fx = fillXml(env, s, boolProp(s, 0x1bf, 4, true));
  const letterFill = /^<a:(solidFill|gradFill|pattFill)/.test(fx) ? fx : `<a:solidFill>${srgb(oaColor(env, withDefault(env, s, 0x181) ?? 0xffffff, s))}</a:solidFill>`;
  const rPr = `<a:rPr lang="pt-BR" sz="${Math.round(szPt * 100)}" b="${bold ? 1 : 0}" i="${italic ? 1 : 0}">`
    + lineXml(env, s, boolProp(s, 0x1ff, 3, true)) + letterFill + shadowXml(env, s) + (font ? `<a:latin typeface="${xmlText(font)}"/>` : '') + '</a:rPr>';
  const paras = lines.map((l) => `<a:p><a:pPr algn="ctr"/><a:r>${rPr}<a:t>${xmlText(l)}</a:t></a:r></a:p>`).join('');
  const av = warp ? warpAdjust(warp, rawAdjust(s.props), w, h) : [];
  const wx = warp ? `<a:prstTxWarp prst="${warp}"><a:avLst>${av.map((v, i) => `<a:gd name="${av.length > 1 ? `adj${i + 1}` : 'adj'}" fmla="val ${v}"/>`).join('')}</a:avLst></a:prstTxWarp>` : '';
  const vert = warp && boolProp(s, 0xff, 13, false) ? ' vert="wordArtVert"' : '';
  return `<xdr:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" rtlCol="0"${vert}${warp ? ' fromWordArt="1"' : ''}>${wx}<a:noAutofit/></a:bodyPr><a:lstStyle/>${paras}</xdr:txBody>`;
}

// ───────────────────────────── metroBlob (Excel 2007+) ─────────────────────────────

/** Teto das partes do zip do metroBlob (XML de forma: KB). */
const MAX_METRO_PART = 4 * 1024 * 1024;
const METRO_OBJECTS = new Set(['xdr:sp', 'xdr:cxnSp', 'xdr:grpSp', 'xdr:pic']);
const XML_NAME = /^[A-Za-z_][\w.:-]*$/;

function serializeXml(e: XmlElement): string {
  if (!XML_NAME.test(e.name)) return '';
  let out = `<${e.name}`;
  for (const [k, v] of Object.entries(e.attrs)) if (XML_NAME.test(k)) out += ` ${k}="${xmlText(v)}"`;
  if (!e.children.length) return out + '/>';
  out += '>';
  for (const c of e.children) out += typeof c === 'string' ? xmlText(c) : serializeXml(c);
  return out + `</${e.name}>`;
}

/** Texto de todos os `a:t` da árvore. */
function allText(e: XmlElement): string {
  let t = '';
  for (const c of e.children) {
    if (typeof c === 'string') continue;
    if (c.name === 'a:t') t += c.children.filter((x): x is string => typeof x === 'string').join('');
    else t += allText(c);
  }
  return t;
}

/** Cópia sem os hiperlinks (`a:hlinkClick`/`a:hlinkHover` apontam para rels do zip interno). */
function dropLinks(e: XmlElement): XmlElement {
  return { name: e.name, attrs: e.attrs, children: e.children.filter((c) => typeof c === 'string' || !/^a:hlink(Click|Hover)$/.test(c.name)).map((c) => (typeof c === 'string' ? c : dropLinks(c))) };
}

/**
 * Objeto DrawingML original do metroBlob (Excel 2007+), validado contra o
 * binário: mesma âncora de células (downrev.xml) e mesmo texto do TXO. Objetos
 * com imagens do zip interno ficam com a conversão do binário.
 */
function metroObject(s: XlsShape, obj: ObjInfo | undefined, id: number): string | undefined {
  const blob = s.complex.get(0x3a9);
  if (!blob || blob.length < 4 || blob[0] !== 0x50 || blob[1] !== 0x4b || !s.anchor) return undefined;
  let parts: Record<string, Uint8Array>;
  try {
    parts = unzipSync(blob, { filter: (f) => /^drs\/(shapexml|connectorxml|downrev)\.xml$/.test(f.name) && f.originalSize <= MAX_METRO_PART && f.originalSize <= Math.max(1 << 20, f.size * 1100) });
  } catch { return undefined; }
  const main = parts['drs/shapexml.xml'] ?? parts['drs/connectorxml.xml'];
  const down = parts['drs/downrev.xml'];
  if (!main || !down) return undefined;
  let root: XmlElement, dr: XmlElement;
  try { root = parseXml(strFromU8(main)); dr = parseXml(strFromU8(down)); } catch { return undefined; }
  // âncora gravada com o XML = a do binário (forma não movida por versão antiga)
  const xa = firstChild(dr, 'a:xlAnchor');
  const from = xa ? firstChild(xa, 'a:from') : undefined, to = xa ? firstChild(xa, 'a:to') : undefined;
  const a = s.anchor;
  const n = (e: XmlElement | undefined, k: string): number => Number(e?.attrs[k] ?? NaN);
  if (!from || !to || n(from, 'col') !== a.c1 || n(from, 'row') !== a.r1 || n(to, 'col') !== a.c2 || n(to, 'row') !== a.r2) return undefined;
  const anchorEl = childElements(root).find((c) => /Anchor$/.test(c.name));
  const o = anchorEl ? childElements(anchorEl).find((c) => METRO_OBJECTS.has(c.name)) : undefined;
  if (!o) return undefined;
  // texto: o do binário (TXO) tem de ser o mesmo (sem as quebras de linha)
  const norm = (t: string): string => t.replace(/[\r\n\v\s]+/g, '');
  if (norm(allText(o)) !== norm(obj?.text?.text ?? '')) return undefined;
  const xml = serializeXml(dropLinks(o));
  if (/\br:(id|embed|link|pict)=/.test(xml)) return undefined;
  // id único no desenho
  return xml.replace(/(<xdr:cNvPr\b[^>]*?\bid=")\d+(")/, `$1${id}$2`);
}

// ───────────────────────────── objetos ─────────────────────────────

/**
 * Ajustes de imagem → filhos do `<a:blip>` (como a conversão do Office):
 * cor transparente (0x107), brilho (0x109, ±32768 = ±100%) e contraste
 * (0x108, 16.16) → `<a:lum>`; escala de cinza / preto e branco (0x13F).
 */
function blipAdjustXml(env: ShapeEnv, s: XlsShape): string {
  let out = '';
  const tr = prop(s, 0x107);
  if (tr !== undefined) {
    const c = oaColor(env, tr, s);
    out += `<a:clrChange><a:clrFrom>${srgb(c)}</a:clrFrom><a:clrTo><a:srgbClr val="${c}"><a:alpha val="0"/></a:srgbClr></a:clrTo></a:clrChange>`;
  }
  const br = prop(s, 0x109), ct = prop(s, 0x108);
  const bright = br !== undefined ? Math.round(((br | 0) / 32768) * 100) * 1000 : 0;
  let contrast = 0;
  if (ct !== undefined) {
    const c = (ct >>> 0) / 65536;
    contrast = Math.round((c < 1 ? c - 1 : 1 - 1 / c) * 100) * 1000;
  }
  if (bright || contrast) out += `<a:lum${bright ? ` bright="${bright}"` : ''}${contrast ? ` contrast="${contrast}"` : ''}/>`;
  if (boolProp(s, 0x13f, 2, false)) out += '<a:grayscl/>';
  else if (boolProp(s, 0x13f, 1, false)) out += '<a:biLevel thresh="50000"/>';
  return out;
}

/** Recorte (16.16, fração da imagem; negativo = margem) → `a:srcRect`. */
function srcRectXml(s: XlsShape): string {
  const v = (id: number): number => Math.round(fixed(prop(s, id)) * 100000);
  const t = v(0x100), b = v(0x101), l = v(0x102), r = v(0x103);
  if (!t && !b && !l && !r) return '';
  return `<a:srcRect${l ? ` l="${l}"` : ''}${t ? ` t="${t}"` : ''}${r ? ` r="${r}"` : ''}${b ? ` b="${b}"` : ''}/>`;
}

const shapeName = (s: XlsShape, fallback: string): string => propString(s.complex.get(0x380)) ?? fallback;

/**
 * Objeto DrawingML da forma (sem a âncora). `size` = tamanho em EMU da caixa
 * no nível superior (proporção para os ajustes); dentro de grupo, a caixa
 * vem da ChildAnchor. '' = nada a desenhar.
 */
export function objectXml(env: ShapeEnv, s: XlsShape, size: { w: number; h: number }, inGroup = false): string {
  if (isHiddenShape(s)) return '';
  const obj = env.objOf(s);
  const kind = shapeKind(s, obj);
  if (!kind) return '';
  const box = inGroup ? childBox(s) : undefined;
  if (inGroup && !box) return '';
  const w = box?.w ?? size.w, h = box?.h ?? size.h;
  const id = env.nextId();
  if (!inGroup) {
    const m = metroObject(s, obj, id);
    if (m) return m;
  }
  switch (kind) {
    case 'group': return groupXml(env, s, box, id);
    case 'chart': {
      const rid = inGroup && obj ? env.chartRel?.(obj) : undefined;
      if (!rid || !box) return '';
      return `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${xmlText(shapeName(s, `Gráfico ${id - 1}`))}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`
        + `<xdr:xfrm><a:off x="${Math.round(box.x)}" y="${Math.round(box.y)}"/><a:ext cx="${Math.round(box.w)}" cy="${Math.round(box.h)}"/></xdr:xfrm>`
        + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
        + `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></xdr:graphicFrame>`;
    }
    case 'pic': {
      const rid = env.imageRel(prop(s, 0x104)!);
      if (!rid) return '';
      const geom = geometryXml(s, w, h);
      // imagem: sem contorno salvo o fLine explícito
      const ln = boolOpt(s.props, 0x1ff, 3) ? lineXml(env, s, true) : '';
      return `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${xmlText(shapeName(s, `Imagem ${id - 1}`))}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
        + `<xdr:blipFill><a:blip r:embed="${rid}">${blipAdjustXml(env, s)}</a:blip>${srcRectXml(s)}<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
        + `<xdr:spPr>${xfrmXml(s, box, geom.flipV)}${geom.xml}${ln}${shadowXml(env, s)}</xdr:spPr></xdr:pic>`;
    }
    default: return spXml(env, s, obj, box, w, h, id);
  }
}

function spXml(env: ShapeEnv, s: XlsShape, obj: ObjInfo | undefined, box: Box | undefined, w: number, h: number, id: number): string {
  const conn = isConnectorType(s.type);
  const isLine = s.type === 20 || conn || obj?.ot === 1;
  const isText = s.type === 202 || obj?.ot === 6;
  const wordArt = isWordArtType(s.type) ? wordArtBody(env, s, w, h) : undefined;
  const geom = wordArt ? { xml: '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>', flipV: false } : geometryXml(s, w, h);
  const fill = wordArt ? '<a:noFill/>' : isLine ? '<a:noFill/>' : fillXml(env, s, boolProp(s, 0x1bf, 4, true));
  const ln = wordArt ? '<a:ln><a:noFill/></a:ln>' : lineXml(env, s, boolProp(s, 0x1ff, 3, true));
  const effects = wordArt ? '' : shadowXml(env, s);
  const name = shapeName(s, isText ? `Caixa de Texto ${id - 1}` : isLine ? `Conector ${id - 1}` : `Forma ${id - 1}`);
  const spPr = `<xdr:spPr>${xfrmXml(s, box, geom.flipV)}${geom.xml}${fill}${ln}${effects}</xdr:spPr>`;
  if (conn) {
    return `<xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="${id}" name="${xmlText(name)}"/><xdr:cNvCxnSpPr/></xdr:nvCxnSpPr>${spPr}</xdr:cxnSp>`;
  }
  return `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${id}" name="${xmlText(name)}"/><xdr:cNvSpPr${isText || wordArt ? ' txBox="1"' : ''}/></xdr:nvSpPr>`
    + spPr + (wordArt ?? txBody(env, s, obj)) + '</xdr:sp>';
}

/** Grupo: off/ext = caixa no pai (nível superior: a âncora manda); chOff/chExt = FSPGR. */
function groupXml(env: ShapeEnv, s: XlsShape, box: Box | undefined, id: number): string {
  const kids = (s.children ?? []).map((c) => objectXml(env, c, { w: 0, h: 0 }, true)).join('');
  if (!kids) return '';
  const gr: OARect = s.groupRect ?? { l: 0, t: 0, r: 1, b: 1 };
  const ch = `<a:chOff x="${Math.min(gr.l, gr.r)}" y="${Math.min(gr.t, gr.b)}"/><a:chExt cx="${Math.abs(gr.r - gr.l)}" cy="${Math.abs(gr.b - gr.t)}"/>`;
  return `<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="${id}" name="${xmlText(shapeName(s, `Grupo ${id - 1}`))}"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr>`
    + `<xdr:grpSpPr>${xfrmXml(s, box ?? { x: Math.min(gr.l, gr.r), y: Math.min(gr.t, gr.b), w: Math.abs(gr.r - gr.l), h: Math.abs(gr.b - gr.t) }, false, ch)}</xdr:grpSpPr>${kids}</xdr:grpSp>`;
}
