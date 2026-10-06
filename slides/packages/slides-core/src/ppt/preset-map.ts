/**
 * Tipos de forma do OfficeArt binário (MSOSPT, [MS-ODRAW] 2.4.6) → geometrias
 * preset do DrawingML (`<a:prstGeom prst>`), com a conversão dos "adjust
 * values".
 *
 * No binário as formas vivem num espaço 21600×21600 esticado até a caixa; os
 * ajustes (adjustValue…adjust10Value) estão nesse espaço. No DrawingML os
 * ajustes são frações ×100000, quase sempre relativas a ss = min(w, h). Por isso
 * a conversão depende da proporção da caixa. Fórmulas conferidas contra os
 * .pptx gêmeos do corpus (roundRect 1329 → 6153; chevron 13800 @1037×749 →
 * 50000) e contra os padrões de ambos os formatos (seal8 2538 ↔ star8 38250…).
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
/** Fração linear no espaço 21600 → ×100000. */
const lin = (i: number) => (a: RawAdjust): (number | undefined)[] =>
  [a[i] === undefined ? undefined : a[i]! * K];
/** Deslocamento horizontal (fração de w) → relativo a ss. */
const offW = (a: RawAdjust, w: number, h: number): (number | undefined)[] =>
  [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, true)];
/** Ponta (homePlate/chevron): x do início da ponta → profundidade relativa a ss. */
const tipW = (a: RawAdjust, w: number, h: number): (number | undefined)[] =>
  [a[0] === undefined ? undefined : (21600 - a[0]) * K * ratio(w, h, true)];
/** Estrelas (seal): distância dos vértices internos ao centro → raio interno ×50000. */
const seal = (a: RawAdjust): (number | undefined)[] =>
  [a[0] === undefined ? undefined : ((10800 - a[0]) / 10800) * 50000];
/** Seta horizontal: adj1 = x da cabeça, adj2 = y do topo da haste. */
const arrowH = (headAtStart: boolean) => (a: RawAdjust, w: number, h: number): (number | undefined)[] => [
  a[1] === undefined ? undefined : ((21600 - 2 * a[1]) / 21600) * 100000,
  a[0] === undefined ? undefined : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, true),
];
/** Seta vertical: adj1 = y da cabeça, adj2 = x da esquerda da haste. */
const arrowV = (headAtStart: boolean) => (a: RawAdjust, w: number, h: number): (number | undefined)[] => [
  a[1] === undefined ? undefined : ((21600 - 2 * a[1]) / 21600) * 100000,
  a[0] === undefined ? undefined : (headAtStart ? a[0] : 21600 - a[0]) * K * ratio(w, h, false),
];
/** Balões com ponta: posição da ponta relativa ao centro (fração de w/h). */
const wedge = (a: RawAdjust): (number | undefined)[] => [
  a[0] === undefined ? undefined : (a[0] - 10800) * K,
  a[1] === undefined ? undefined : (a[1] - 10800) * K,
];

const P: Record<number, PresetDef> = {
  1: { prst: 'rect' },
  2: { prst: 'roundRect', adj: lin(0) },
  3: { prst: 'ellipse' },
  4: { prst: 'diamond' },
  5: { prst: 'triangle', adj: lin(0) },
  6: { prst: 'rtTriangle' },
  7: { prst: 'parallelogram', adj: offW },
  8: { prst: 'trapezoid', adj: offW, flipV: true },
  9: { prst: 'hexagon', adj: offW },
  10: { prst: 'octagon', adj: lin(0) },
  11: { prst: 'plus', adj: lin(0) },
  12: { prst: 'star5' },
  13: { prst: 'rightArrow', adj: arrowH(false) },
  14: { prst: 'rightArrow', adj: arrowH(false) },
  15: { prst: 'homePlate', adj: tipW },
  16: { prst: 'cube', adj: lin(0) },
  17: { prst: 'wedgeRoundRectCallout', adj: wedge, binDefaults: [1350, 25920] },
  18: { prst: 'star16', adj: seal },
  19: { prst: 'arc' },
  20: { prst: 'line' },
  21: { prst: 'plaque', adj: lin(0) },
  22: { prst: 'can', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false)] },
  23: { prst: 'donut', adj: lin(0) },
  32: { prst: 'straightConnector1' },
  33: { prst: 'bentConnector2' },
  34: { prst: 'bentConnector3' },
  35: { prst: 'bentConnector4' },
  36: { prst: 'bentConnector5' },
  37: { prst: 'curvedConnector2' },
  38: { prst: 'curvedConnector3' },
  39: { prst: 'curvedConnector4' },
  40: { prst: 'curvedConnector5' },
  41: { prst: 'callout1' },
  42: { prst: 'callout2' },
  43: { prst: 'callout3' },
  44: { prst: 'accentCallout1' },
  45: { prst: 'accentCallout2' },
  46: { prst: 'accentCallout3' },
  47: { prst: 'borderCallout1' },
  48: { prst: 'borderCallout2' },
  49: { prst: 'borderCallout3' },
  50: { prst: 'accentBorderCallout1' },
  51: { prst: 'accentBorderCallout2' },
  52: { prst: 'accentBorderCallout3' },
  53: { prst: 'ribbon' },
  54: { prst: 'ribbon2' },
  55: { prst: 'chevron', adj: tipW },
  56: { prst: 'pentagon' },
  57: { prst: 'noSmoking' },
  58: { prst: 'star8', adj: seal },
  59: { prst: 'star16', adj: seal },
  60: { prst: 'star32', adj: seal },
  61: { prst: 'wedgeRectCallout', adj: wedge, binDefaults: [1350, 25920] },
  62: { prst: 'wedgeRoundRectCallout', adj: wedge, binDefaults: [1350, 25920] },
  63: { prst: 'wedgeEllipseCallout', adj: wedge, binDefaults: [1350, 25920] },
  64: { prst: 'wave' },
  65: { prst: 'foldedCorner' },
  66: { prst: 'leftArrow', adj: arrowH(true) },
  67: { prst: 'downArrow', adj: arrowV(false) },
  68: { prst: 'upArrow', adj: arrowV(true) },
  69: { prst: 'leftRightArrow', adj: arrowH(true) },
  70: { prst: 'upDownArrow', adj: arrowV(true) },
  71: { prst: 'irregularSeal1' },
  72: { prst: 'irregularSeal2' },
  73: { prst: 'lightningBolt' },
  74: { prst: 'heart' },
  75: { prst: 'rect' },
  76: { prst: 'quadArrow' },
  77: { prst: 'leftArrowCallout' },
  78: { prst: 'rightArrowCallout' },
  79: { prst: 'upArrowCallout' },
  80: { prst: 'downArrowCallout' },
  81: { prst: 'leftRightArrowCallout' },
  82: { prst: 'upDownArrowCallout' },
  83: { prst: 'quadArrowCallout' },
  84: { prst: 'bevel', adj: lin(0) },
  85: { prst: 'leftBracket', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false)] },
  86: { prst: 'rightBracket', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false)] },
  87: { prst: 'leftBrace', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false), a[1] === undefined ? undefined : a[1] * K] },
  88: { prst: 'rightBrace', adj: (a, w, h) => [a[0] === undefined ? undefined : a[0] * K * ratio(w, h, false), a[1] === undefined ? undefined : a[1] * K] },
  89: { prst: 'leftUpArrow' },
  90: { prst: 'bentUpArrow' },
  91: { prst: 'bentArrow' },
  92: { prst: 'star24', adj: seal },
  93: { prst: 'stripedRightArrow', adj: arrowH(false) },
  94: { prst: 'notchedRightArrow', adj: arrowH(false) },
  95: { prst: 'blockArc' },
  96: { prst: 'smileyFace', adj: (a) => [a[0] === undefined ? undefined : ((a[0] - 16515) / (17520 - 16515)) * 4653] },
  97: { prst: 'verticalScroll' },
  98: { prst: 'horizontalScroll' },
  99: { prst: 'circularArrow' },
  100: { prst: 'circularArrow' },
  101: { prst: 'uturnArrow' },
  102: { prst: 'curvedRightArrow' },
  103: { prst: 'curvedLeftArrow' },
  104: { prst: 'curvedUpArrow' },
  105: { prst: 'curvedDownArrow' },
  106: { prst: 'cloudCallout', adj: wedge, binDefaults: [1350, 25920] },
  107: { prst: 'ellipseRibbon' },
  108: { prst: 'ellipseRibbon2' },
  109: { prst: 'flowChartProcess' },
  110: { prst: 'flowChartDecision' },
  111: { prst: 'flowChartInputOutput' },
  112: { prst: 'flowChartPredefinedProcess' },
  113: { prst: 'flowChartInternalStorage' },
  114: { prst: 'flowChartDocument' },
  115: { prst: 'flowChartMultidocument' },
  116: { prst: 'flowChartTerminator' },
  117: { prst: 'flowChartPreparation' },
  118: { prst: 'flowChartManualInput' },
  119: { prst: 'flowChartManualOperation' },
  120: { prst: 'flowChartConnector' },
  121: { prst: 'flowChartPunchedCard' },
  122: { prst: 'flowChartPunchedTape' },
  123: { prst: 'flowChartSummingJunction' },
  124: { prst: 'flowChartOr' },
  125: { prst: 'flowChartCollate' },
  126: { prst: 'flowChartSort' },
  127: { prst: 'flowChartExtract' },
  128: { prst: 'flowChartMerge' },
  129: { prst: 'flowChartOfflineStorage' },
  130: { prst: 'flowChartOnlineStorage' },
  131: { prst: 'flowChartMagneticTape' },
  132: { prst: 'flowChartMagneticDisk' },
  133: { prst: 'flowChartMagneticDrum' },
  134: { prst: 'flowChartDisplay' },
  135: { prst: 'flowChartDelay' },
  176: { prst: 'flowChartAlternateProcess' },
  177: { prst: 'flowChartOffpageConnector' },
  178: { prst: 'callout1' },
  179: { prst: 'accentCallout1' },
  180: { prst: 'borderCallout1' },
  181: { prst: 'accentBorderCallout1' },
  182: { prst: 'leftRightUpArrow' },
  183: { prst: 'sun', adj: lin(0) },
  184: { prst: 'moon', adj: lin(0) },
  185: { prst: 'bracketPair' },
  186: { prst: 'bracePair' },
  187: { prst: 'star4', adj: seal },
  188: { prst: 'doubleWave' },
  189: { prst: 'actionButtonBlank' },
  190: { prst: 'actionButtonHome' },
  191: { prst: 'actionButtonHelp' },
  192: { prst: 'actionButtonInformation' },
  193: { prst: 'actionButtonForwardNext' },
  194: { prst: 'actionButtonBackPrevious' },
  195: { prst: 'actionButtonEnd' },
  196: { prst: 'actionButtonBeginning' },
  197: { prst: 'actionButtonReturn' },
  198: { prst: 'actionButtonDocument' },
  199: { prst: 'actionButtonSound' },
  200: { prst: 'actionButtonMovie' },
  201: { prst: 'rect' },
  202: { prst: 'rect' },
};

/** Tipos de texto artístico (WordArt clássico) → retângulo com o texto. */
export function isWordArtType(spt: number): boolean {
  return (spt >= 24 && spt <= 31) || (spt >= 136 && spt <= 175);
}

/** É conector (vira `<p:cxnSp>`)? */
export function isConnectorType(spt: number): boolean {
  return spt >= 32 && spt <= 40;
}

export interface PresetResult {
  prst: string;
  /** avLst: pares nome/valor já arredondados (adj, adj1, adj2…). */
  av: { name: string; val: number }[];
  /** A preset precisa de flipV adicional para reproduzir o desenho binário. */
  flipV?: boolean;
}

/**
 * Mapeia tipo + ajustes para a preset. `undefined` = sem preset equivalente
 * (forma livre: use a geometria do FOPT).
 */
export function presetFor(spt: number, adjust: RawAdjust, w: number, h: number): PresetResult | undefined {
  if (isWordArtType(spt)) return { prst: 'rect', av: [] };
  const def = P[spt];
  if (!def) return undefined;
  const out: PresetResult = { prst: def.prst, av: [] };
  if (def.flipV) out.flipV = true;
  if (def.adj) {
    const a = def.binDefaults ? def.binDefaults.map((d, i) => adjust[i] ?? d) : adjust;
    const vals = def.adj(a, w, h);
    const any = vals.some((v) => v !== undefined);
    if (any) {
      // um ajuste presente obriga a listar todos (posicionais): completa com o padrão DrawingML
      const dflt = DML_DEFAULTS[def.prst] ?? [];
      vals.forEach((v, i) => {
        const val = v ?? dflt[i];
        if (val === undefined) return;
        out.av.push({ name: vals.length === 1 ? 'adj' : `adj${i + 1}`, val: Math.round(val) });
      });
    }
  }
  return out;
}

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
