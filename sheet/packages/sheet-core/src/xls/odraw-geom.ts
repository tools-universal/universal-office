/**
 * Geometria das formas OfficeArt binárias ([MS-ODRAW]) → DrawingML: tipo
 * MSOSPT → `<a:prstGeom>` com a conversão dos ajustes, forma livre
 * (pVertices/pSegmentInfo) → `<a:custGeom>`, arco legado e deformações do
 * WordArt clássico.
 *
 * CÓPIA focada do leitor .ppt do Slides (slides-core/src/ppt/preset-map.ts e
 * shapeconv.ts: custGeomXml, arcGeomXml, warpAdjust) — as fórmulas foram
 * conferidas lá contra a conversão do próprio PowerPoint; o sheet-core não
 * depende do slides-core. Correção de regra vale para os dois.
 */

/** Ajustes do binário (índice 0 = adjustValue) — undefined = padrão da forma. */
export type RawAdjust = (number | undefined)[];

interface PresetDef {
  prst: string;
  /** Converte ajustes binários → avLst (valores ×100000, na ordem adj1, adj2…). */
  adj?: (a: RawAdjust, w: number, h: number) => (number | undefined)[];
  /** Padrões binários (quando diferem dos do DrawingML, o ajuste é sempre emitido). */
  binDefaults?: number[];
  /** A geometria binária é espelhada verticalmente em relação à preset. */
  flipV?: boolean;
}

const K = 100000 / 21600;
const ratio = (w: number, h: number, horiz: boolean): number => {
  const ss = Math.min(w, h) || 1;
  return (horiz ? w : h) / ss;
};
const lin = (i: number) => (a: RawAdjust): (number | undefined)[] => [a[i] === undefined ? undefined : a[i]! * K];
const offW = (a: RawAdjust, w: number, h: number): (number | undefined)[] => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, true)];
const tipW = (a: RawAdjust, w: number, h: number): (number | undefined)[] => [a[0] === undefined ? undefined : (21600 - a[0]) * K * ratio(w, h, true)];
const seal = (a: RawAdjust): (number | undefined)[] => [a[0] === undefined ? undefined : ((10800 - a[0]) / 10800) * 50000];
const arrowH = (headAtStart: boolean) => (a: RawAdjust, w: number, h: number): (number | undefined)[] => [
  a[1] === undefined ? undefined : ((21600 - 2 * a[1]) / 21600) * 100000,
  a[0] === undefined ? undefined : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, true),
];
const arrowV = (headAtStart: boolean) => (a: RawAdjust, w: number, h: number): (number | undefined)[] => [
  a[1] === undefined ? undefined : ((21600 - 2 * a[1]) / 21600) * 100000,
  a[0] === undefined ? undefined : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, false),
];
const wedge = (a: RawAdjust): (number | undefined)[] => [
  a[0] === undefined ? undefined : (a[0] - 10800) * K,
  a[1] === undefined ? undefined : (a[1] - 10800) * K,
];
const vert = (a: RawAdjust, w: number, h: number): (number | undefined)[] => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false)];

const P: Record<number, PresetDef> = {
  1: { prst: 'rect' }, 2: { prst: 'roundRect', adj: lin(0) }, 3: { prst: 'ellipse' }, 4: { prst: 'diamond' },
  5: { prst: 'triangle', adj: lin(0) }, 6: { prst: 'rtTriangle' }, 7: { prst: 'parallelogram', adj: offW },
  8: { prst: 'trapezoid', adj: offW, flipV: true }, 9: { prst: 'hexagon', adj: offW }, 10: { prst: 'octagon', adj: lin(0) },
  11: { prst: 'plus', adj: lin(0) }, 12: { prst: 'star5' }, 13: { prst: 'rightArrow', adj: arrowH(false) },
  14: { prst: 'rightArrow', adj: arrowH(false) }, 15: { prst: 'homePlate', adj: tipW }, 16: { prst: 'cube', adj: lin(0) },
  17: { prst: 'wedgeRoundRectCallout', adj: wedge, binDefaults: [1350, 25920] }, 18: { prst: 'star16', adj: seal },
  19: { prst: 'arc' }, 20: { prst: 'line' }, 21: { prst: 'plaque', adj: lin(0) }, 22: { prst: 'can', adj: vert },
  23: { prst: 'donut', adj: lin(0) },
  32: { prst: 'straightConnector1' }, 33: { prst: 'bentConnector2' }, 34: { prst: 'bentConnector3' }, 35: { prst: 'bentConnector4' },
  36: { prst: 'bentConnector5' }, 37: { prst: 'curvedConnector2' }, 38: { prst: 'curvedConnector3' }, 39: { prst: 'curvedConnector4' },
  40: { prst: 'curvedConnector5' }, 41: { prst: 'callout1' }, 42: { prst: 'callout2' }, 43: { prst: 'callout3' },
  44: { prst: 'accentCallout1' }, 45: { prst: 'accentCallout2' }, 46: { prst: 'accentCallout3' }, 47: { prst: 'borderCallout1' },
  48: { prst: 'borderCallout2' }, 49: { prst: 'borderCallout3' }, 50: { prst: 'accentBorderCallout1' },
  51: { prst: 'accentBorderCallout2' }, 52: { prst: 'accentBorderCallout3' }, 53: { prst: 'ribbon' }, 54: { prst: 'ribbon2' },
  55: { prst: 'chevron', adj: tipW }, 56: { prst: 'pentagon' }, 57: { prst: 'noSmoking' }, 58: { prst: 'star8', adj: seal },
  59: { prst: 'star16', adj: seal }, 60: { prst: 'star32', adj: seal },
  61: { prst: 'wedgeRectCallout', adj: wedge, binDefaults: [1350, 25920] },
  62: { prst: 'wedgeRoundRectCallout', adj: wedge, binDefaults: [1350, 25920] },
  63: { prst: 'wedgeEllipseCallout', adj: wedge, binDefaults: [1350, 25920] },
  64: { prst: 'wave' }, 65: { prst: 'foldedCorner' }, 66: { prst: 'leftArrow', adj: arrowH(true) },
  67: { prst: 'downArrow', adj: arrowV(false) }, 68: { prst: 'upArrow', adj: arrowV(true) },
  69: { prst: 'leftRightArrow', adj: arrowH(true) }, 70: { prst: 'upDownArrow', adj: arrowV(true) },
  71: { prst: 'irregularSeal1' }, 72: { prst: 'irregularSeal2' }, 73: { prst: 'lightningBolt' }, 74: { prst: 'heart' },
  75: { prst: 'rect' }, 76: { prst: 'quadArrow' }, 77: { prst: 'leftArrowCallout' }, 78: { prst: 'rightArrowCallout' },
  79: { prst: 'upArrowCallout' }, 80: { prst: 'downArrowCallout' }, 81: { prst: 'leftRightArrowCallout' },
  82: { prst: 'upDownArrowCallout' }, 83: { prst: 'quadArrowCallout' }, 84: { prst: 'bevel', adj: lin(0) },
  85: { prst: 'leftBracket', adj: vert }, 86: { prst: 'rightBracket', adj: vert },
  87: { prst: 'leftBrace', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false), a[1] === undefined ? undefined : a[1] * K] },
  88: { prst: 'rightBrace', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false), a[1] === undefined ? undefined : a[1] * K] },
  89: { prst: 'leftUpArrow' }, 90: { prst: 'bentUpArrow' }, 91: { prst: 'bentArrow' }, 92: { prst: 'star24', adj: seal },
  93: { prst: 'stripedRightArrow', adj: arrowH(false) }, 94: { prst: 'notchedRightArrow', adj: arrowH(false) },
  95: { prst: 'blockArc' }, 96: { prst: 'smileyFace', adj: (a) => [a[0] === undefined ? undefined : ((a[0] - 16515) / (17520 - 16515)) * 4653] },
  97: { prst: 'verticalScroll' }, 98: { prst: 'horizontalScroll' }, 99: { prst: 'circularArrow' }, 100: { prst: 'circularArrow' },
  101: { prst: 'uturnArrow' }, 102: { prst: 'curvedRightArrow' }, 103: { prst: 'curvedLeftArrow' }, 104: { prst: 'curvedUpArrow' },
  105: { prst: 'curvedDownArrow' }, 106: { prst: 'cloudCallout', adj: wedge, binDefaults: [1350, 25920] },
  107: { prst: 'ellipseRibbon' }, 108: { prst: 'ellipseRibbon2' }, 109: { prst: 'flowChartProcess' }, 110: { prst: 'flowChartDecision' },
  111: { prst: 'flowChartInputOutput' }, 112: { prst: 'flowChartPredefinedProcess' }, 113: { prst: 'flowChartInternalStorage' },
  114: { prst: 'flowChartDocument' }, 115: { prst: 'flowChartMultidocument' }, 116: { prst: 'flowChartTerminator' },
  117: { prst: 'flowChartPreparation' }, 118: { prst: 'flowChartManualInput' }, 119: { prst: 'flowChartManualOperation' },
  120: { prst: 'flowChartConnector' }, 121: { prst: 'flowChartPunchedCard' }, 122: { prst: 'flowChartPunchedTape' },
  123: { prst: 'flowChartSummingJunction' }, 124: { prst: 'flowChartOr' }, 125: { prst: 'flowChartCollate' },
  126: { prst: 'flowChartSort' }, 127: { prst: 'flowChartExtract' }, 128: { prst: 'flowChartMerge' },
  129: { prst: 'flowChartOfflineStorage' }, 130: { prst: 'flowChartOnlineStorage' }, 131: { prst: 'flowChartMagneticTape' },
  132: { prst: 'flowChartMagneticDisk' }, 133: { prst: 'flowChartMagneticDrum' }, 134: { prst: 'flowChartDisplay' },
  135: { prst: 'flowChartDelay' }, 176: { prst: 'flowChartAlternateProcess' }, 177: { prst: 'flowChartOffpageConnector' },
  178: { prst: 'callout1' }, 179: { prst: 'accentCallout1' }, 180: { prst: 'borderCallout1' }, 181: { prst: 'accentBorderCallout1' },
  182: { prst: 'leftRightUpArrow' }, 183: { prst: 'sun', adj: lin(0) }, 184: { prst: 'moon', adj: lin(0) },
  185: { prst: 'bracketPair' }, 186: { prst: 'bracePair' }, 187: { prst: 'star4', adj: seal }, 188: { prst: 'doubleWave' },
  189: { prst: 'actionButtonBlank' }, 190: { prst: 'actionButtonHome' }, 191: { prst: 'actionButtonHelp' },
  192: { prst: 'actionButtonInformation' }, 193: { prst: 'actionButtonForwardNext' }, 194: { prst: 'actionButtonBackPrevious' },
  195: { prst: 'actionButtonEnd' }, 196: { prst: 'actionButtonBeginning' }, 197: { prst: 'actionButtonReturn' },
  198: { prst: 'actionButtonDocument' }, 199: { prst: 'actionButtonSound' }, 200: { prst: 'actionButtonMovie' },
  201: { prst: 'rect' }, 202: { prst: 'rect' },
};

/** Padrões DrawingML (presetShapeDefinitions) dos ajustes que convertemos. */
const DML_DEFAULTS: Record<string, number[]> = {
  roundRect: [16667], triangle: [50000], parallelogram: [25000], trapezoid: [25000], hexagon: [25000],
  octagon: [29289], plus: [25000], rightArrow: [50000, 50000], leftArrow: [50000, 50000],
  upArrow: [50000, 50000], downArrow: [50000, 50000], leftRightArrow: [50000, 50000],
  upDownArrow: [50000, 50000], homePlate: [50000], chevron: [50000], cube: [25000], can: [25000],
  donut: [25000], plaque: [16667], bevel: [12500], sun: [25000], moon: [50000], smileyFace: [4653],
  star4: [12500], star8: [38250], star16: [37500], star24: [37500], star32: [37500],
  wedgeRectCallout: [-20833, 62500], wedgeRoundRectCallout: [-20833, 62500, 16667],
  wedgeEllipseCallout: [-20833, 62500], cloudCallout: [-20833, 62500],
  leftBracket: [8333], rightBracket: [8333], leftBrace: [8333, 50000], rightBrace: [8333, 50000],
  stripedRightArrow: [50000, 50000], notchedRightArrow: [50000, 50000],
};

/** Tipos do WordArt clássico (texto deformado). */
export function isWordArtType(spt: number): boolean {
  return (spt >= 24 && spt <= 31) || (spt >= 136 && spt <= 175);
}

/** É conector (vira `<xdr:cxnSp>`)? */
export function isConnectorType(spt: number): boolean {
  return spt >= 32 && spt <= 40;
}

/** O tipo tem preset equivalente? */
export function hasPreset(spt: number): boolean {
  return P[spt] !== undefined;
}

/** Ajustes do FOPT (0x147..0x150). */
export function rawAdjust(props: Map<number, number>): RawAdjust {
  const out: RawAdjust = [];
  for (let i = 0; i < 10; i++) {
    const v = props.get(0x147 + i);
    out.push(v === undefined ? undefined : v | 0);
  }
  return out;
}

/** `<a:prstGeom>` do tipo + ajustes (w/h = proporção da caixa); undefined = sem preset. */
export function presetGeomXml(spt: number, adjust: RawAdjust, w: number, h: number): { xml: string; flipV: boolean } | undefined {
  const def = P[spt];
  if (!def) return undefined;
  let av = '';
  if (def.adj) {
    const a = def.binDefaults ? def.binDefaults.map((d, i) => adjust[i] ?? d) : adjust;
    const vals = def.adj(a, w || 1, h || 1);
    if (vals.some((v) => v !== undefined)) {
      // um ajuste presente obriga a listar todos (posicionais): completa com o padrão DrawingML
      const dflt = DML_DEFAULTS[def.prst] ?? [];
      vals.forEach((v, i) => {
        const val = v ?? dflt[i];
        if (val !== undefined) av += `<a:gd name="${vals.length === 1 ? 'adj' : `adj${i + 1}`}" fmla="val ${Math.round(val)}"/>`;
      });
    }
  }
  return { xml: `<a:prstGeom prst="${def.prst}"><a:avLst>${av}</a:avLst></a:prstGeom>`, flipV: !!def.flipV };
}

/** IMsoArray (nElems, nElemsAlloc, cbElem + dados). */
interface MsoArray { n: number; size: number; v: DataView; off: number }
function msoArray(b: Uint8Array | undefined): MsoArray | undefined {
  if (!b || b.length < 6) return undefined;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = v.getUint16(0, true);
  let size = v.getUint16(4, true);
  if (size === 0xfff0) size = 4;
  if (size === 0) return undefined;
  return { n: Math.min(n, Math.floor((b.length - 6) / size)), size, v, off: 6 };
}

const LIMIT_PTS = 100000;

/**
 * Geometria livre (pVertices 0x145 / pSegmentInfo 0x146 no espaço
 * geoLeft..geoBottom) → `<a:custGeom>`; undefined sem vértices.
 */
export function custGeomXml(props: Map<number, number>, complex: Map<number, Uint8Array>): string | undefined {
  const verts = msoArray(complex.get(0x145));
  if (!verts || verts.n === 0) return undefined;
  const pts: [number, number][] = [];
  for (let i = 0; i < Math.min(verts.n, LIMIT_PTS); i++) {
    const o = verts.off + i * verts.size;
    if (verts.size >= 8) pts.push([verts.v.getInt32(o, true), verts.v.getInt32(o + 4, true)]);
    else pts.push([verts.v.getInt16(o, true), verts.v.getInt16(o + 2, true)]);
  }
  const sp = (id: number, d: number): number => { const v = props.get(id); return v === undefined ? d : v | 0; };
  const gl = sp(0x140, 0), gt = sp(0x141, 0), gr = sp(0x142, 21600), gb = sp(0x143, 21600);
  const w = Math.max(1, gr - gl), h = Math.max(1, gb - gt);
  const pt = (p: [number, number] | undefined): string => `<a:pt x="${Math.round((p?.[0] ?? 0) - gl)}" y="${Math.round((p?.[1] ?? 0) - gt)}"/>`;
  const segs = msoArray(complex.get(0x146));
  const paths: string[] = [];
  let cur = '';
  let noFill = false, noLine = false;
  const endPath = (): void => {
    if (cur) paths.push(`<a:path w="${w}" h="${h}"${noFill ? ' fill="none"' : ''}${noLine ? ' stroke="0"' : ''}>${cur}</a:path>`);
    cur = ''; noFill = false; noLine = false;
  };
  let pi = 0;
  if (!segs || segs.n === 0) {
    // sem segmentos: polilinha pelos vértices (fechada para shapePath 1/3)
    cur += `<a:moveTo>${pt(pts[0])}</a:moveTo>`;
    for (pi = 1; pi < pts.length; pi++) cur += `<a:lnTo>${pt(pts[pi])}</a:lnTo>`;
    const shp = props.get(0x144) ?? 1;
    if (shp === 1 || shp === 3) cur += '<a:close/>';
    endPath();
  } else {
    // segmentos consomem vértices; contagens corrompidas param quando os pontos acabam
    for (let i = 0; i < segs.n && pi <= pts.length; i++) {
      const o = segs.off + i * segs.size;
      const s = segs.size >= 4 ? segs.v.getUint32(o, true) : segs.v.getUint16(o, true);
      const type = segs.size >= 4 ? (s >>> 29) & 7 : (s >>> 13) & 7;
      const count = segs.size >= 4 ? (s & 0x1fffffff) : (s & 0x1fff);
      switch (type) {
        case 0: // lineTo
          for (let k = 0; k < Math.max(1, count) && pi < pts.length; k++) cur += `<a:lnTo>${pt(pts[pi++])}</a:lnTo>`;
          break;
        case 1: // curveTo (3 pontos por segmento)
          for (let k = 0; k < Math.max(1, count) && pi + 2 < pts.length; k++) {
            cur += `<a:cubicBezTo>${pt(pts[pi])}${pt(pts[pi + 1])}${pt(pts[pi + 2])}</a:cubicBezTo>`;
            pi += 3;
          }
          break;
        case 2: cur += `<a:moveTo>${pt(pts[pi++])}</a:moveTo>`; break;
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
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/><a:pathLst>${paths.join('')}</a:pathLst></a:custGeom>`;
}

/**
 * Arco legado (msosptArc): a caixa é a do ARCO + centro; adjust1/adjust2 =
 * ângulos inicial/final (16.16 graus, horário na tela, 270 = topo; padrão
 * 270 → 0). custGeom com o contorno (sem preenchimento) e a fatia que preenche.
 */
export function arcGeomXml(props: Map<number, number>): string {
  const deg = (v: number | undefined, d: number): number => (v === undefined ? d : (v | 0) / 65536);
  const a0 = deg(props.get(0x147), 270);
  let a1 = deg(props.get(0x148), 0);
  while (a1 <= a0) a1 += 360;
  while (a1 - a0 > 360) a1 -= 360;
  const R = 21600, Pt = (a: number): [number, number] => [R * Math.cos((a * Math.PI) / 180), R * Math.sin((a * Math.PI) / 180)];
  const pts: [number, number][] = [[0, 0], Pt(a0), Pt(a1)];
  for (let k = Math.ceil(a0 / 90) * 90; k < a1; k += 90) pts.push(Pt(k));
  const minX = Math.min(...pts.map((p) => p[0])), minY = Math.min(...pts.map((p) => p[1]));
  const w = Math.max(1, Math.round(Math.max(...pts.map((p) => p[0])) - minX)), h = Math.max(1, Math.round(Math.max(...pts.map((p) => p[1])) - minY));
  const q = (p: [number, number]): string => `<a:pt x="${Math.round(p[0] - minX)}" y="${Math.round(p[1] - minY)}"/>`;
  const n = Math.max(1, Math.ceil((a1 - a0) / 90)), step = (a1 - a0) / n, kk = (4 / 3) * Math.tan((step * Math.PI) / 720);
  let arc = `<a:moveTo>${q(Pt(a0))}</a:moveTo>`;
  for (let i = 0; i < n; i++) {
    const s = ((a0 + i * step) * Math.PI) / 180, e = ((a0 + (i + 1) * step) * Math.PI) / 180;
    const c1: [number, number] = [R * (Math.cos(s) - kk * Math.sin(s)), R * (Math.sin(s) + kk * Math.cos(s))];
    const c2: [number, number] = [R * (Math.cos(e) + kk * Math.sin(e)), R * (Math.sin(e) - kk * Math.cos(e))];
    arc += `<a:cubicBezTo>${q(c1)}${q(c2)}${q([R * Math.cos(e), R * Math.sin(e)])}</a:cubicBezTo>`;
  }
  const paths = `<a:path w="${w}" h="${h}" fill="none" extrusionOk="0">${arc}</a:path>`
    + `<a:path w="${w}" h="${h}" stroke="0" extrusionOk="0">${arc}<a:lnTo>${q([0, 0])}</a:lnTo><a:close/></a:path>`;
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/><a:pathLst>${paths}</a:pathLst></a:custGeom>`;
}

/** Deformações do WordArt (msosptText* 136–175, mesma ordem do DrawingML). */
export const WARPS = ['textPlain', 'textStop', 'textTriangle', 'textTriangleInverted', 'textChevron', 'textChevronInverted', 'textRingInside', 'textRingOutside',
  'textArchUp', 'textArchDown', 'textCircle', 'textButton', 'textArchUpPour', 'textArchDownPour', 'textCirclePour', 'textButtonPour', 'textCurveUp',
  'textCurveDown', 'textCascadeUp', 'textCascadeDown', 'textWave1', 'textWave2', 'textDoubleWave1', 'textWave4', 'textInflate', 'textDeflate',
  'textInflateBottom', 'textDeflateBottom', 'textInflateTop', 'textDeflateTop', 'textDeflateInflate', 'textDeflateInflateDeflate', 'textFadeRight',
  'textFadeLeft', 'textFadeUp', 'textFadeDown', 'textSlantUp', 'textSlantDown', 'textCanUp', 'textCanDown'];

const WARP_ANGLE = new Set(['textArchUp', 'textArchDown', 'textCircle', 'textButton', 'textArchUpPour', 'textArchDownPour', 'textCirclePour', 'textButtonPour']);
const WARP_BIN_DEFAULT: Record<string, number> = { textWave1: 2809, textWave2: 2809, textDoubleWave1: 1404, textWave4: 1404, textInflateBottom: 14706 };

/** Ajustes do WordArt legado → avLst do prstTxWarp (como a conversão do PowerPoint). */
export function warpAdjust(prst: string, raw: RawAdjust, w: number, h: number): number[] {
  if (WARP_ANGLE.has(prst)) {
    const ang = (v: number | undefined, dflt: number): number => {
      if (v === undefined) return dflt;
      const t = ((v / 65536) * Math.PI) / 180;
      let d = (Math.atan2(h * Math.sin(t), w * Math.cos(t)) * 180) / Math.PI;
      if (d < 0) d += 360;
      return Math.round(d * 60000) % 21600000;
    };
    const a1 = ang(raw[0], /Down/.test(prst) ? 0 : 10800000);
    if (!/Pour$/.test(prst)) return raw[0] === undefined ? [] : [a1];
    if (raw[0] === undefined && raw[1] === undefined) return [];
    return [a1, raw[1] === undefined ? (prst === 'textArchDownPour' ? 25000 : 50000) : Math.round(raw[1] * 2 * K)];
  }
  const a0 = raw[0] ?? WARP_BIN_DEFAULT[prst];
  if (/Wave/.test(prst)) {
    if (a0 === undefined && raw[1] === undefined) return [];
    return [Math.round((a0 ?? 0) * K), raw[1] === undefined ? 0 : Math.round((raw[1] - 10800) * K)];
  }
  return a0 === undefined ? [] : [Math.round(a0 * K)];
}
