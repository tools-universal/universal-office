// Alterar Forma da caixa de texto: o Word põe o texto no RETÂNGULO DE TEXTO (txRect) da
// definição da forma predefinida — aqui todas as da galeria de formas, 8 por documento
// (grade 2 × 4, 120 × 80 pt, margens internas padrão, âncora no topo). Mede o começo da
// 1ª linha (x0) e a linha de base. Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

export const PRESETS = [
  'rect', 'roundRect', 'snip1Rect', 'snip2SameRect', 'snip2DiagRect', 'snipRoundRect', 'round1Rect', 'round2SameRect', 'round2DiagRect',
  'ellipse', 'triangle', 'rtTriangle', 'parallelogram', 'trapezoid', 'diamond', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'decagon', 'dodecagon',
  'pie', 'chord', 'teardrop', 'frame', 'halfFrame', 'corner', 'diagStripe', 'plus', 'plaque', 'can', 'cube', 'bevel', 'donut', 'noSmoking',
  'blockArc', 'foldedCorner', 'smileyFace', 'heart', 'lightningBolt', 'sun', 'moon', 'cloud', 'arc', 'bracketPair', 'bracePair',
  'leftBracket', 'rightBracket', 'leftBrace', 'rightBrace',
  'rightArrow', 'leftArrow', 'upArrow', 'downArrow', 'leftRightArrow', 'upDownArrow', 'quadArrow', 'leftRightUpArrow', 'bentArrow', 'uturnArrow',
  'leftUpArrow', 'bentUpArrow', 'curvedRightArrow', 'curvedLeftArrow', 'curvedUpArrow', 'curvedDownArrow', 'stripedRightArrow', 'notchedRightArrow',
  'homePlate', 'chevron', 'rightArrowCallout', 'downArrowCallout', 'leftArrowCallout', 'upArrowCallout', 'leftRightArrowCallout', 'quadArrowCallout', 'circularArrow',
  'mathPlus', 'mathMinus', 'mathMultiply', 'mathDivide', 'mathEqual', 'mathNotEqual',
  'flowChartProcess', 'flowChartAlternateProcess', 'flowChartDecision', 'flowChartInputOutput', 'flowChartPredefinedProcess', 'flowChartInternalStorage',
  'flowChartDocument', 'flowChartMultidocument', 'flowChartTerminator', 'flowChartPreparation', 'flowChartManualInput', 'flowChartManualOperation',
  'flowChartConnector', 'flowChartOffpageConnector', 'flowChartPunchedCard', 'flowChartPunchedTape', 'flowChartSummingJunction', 'flowChartOr',
  'flowChartCollate', 'flowChartSort', 'flowChartExtract', 'flowChartMerge', 'flowChartOnlineStorage', 'flowChartDelay', 'flowChartMagneticTape',
  'flowChartMagneticDisk', 'flowChartMagneticDrum', 'flowChartDisplay',
  'irregularSeal1', 'irregularSeal2', 'star4', 'star5', 'star6', 'star7', 'star8', 'star10', 'star12', 'star16', 'star24', 'star32',
  'ribbon2', 'ribbon', 'ellipseRibbon2', 'ellipseRibbon', 'verticalScroll', 'horizontalScroll', 'wave', 'doubleWave',
  'wedgeRectCallout', 'wedgeRoundRectCallout', 'wedgeEllipseCallout', 'cloudCallout', 'borderCallout1', 'borderCallout2', 'borderCallout3',
  'accentCallout1', 'accentCallout2', 'accentCallout3', 'callout1', 'callout2', 'callout3', 'accentBorderCallout1', 'accentBorderCallout2', 'accentBorderCallout3',
];

const D = (objs) => buildDocx({ body: p(objs + r('Ancora Hxg')) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
for (let k = 0; k < PRESETS.length; k += 8) {
  const set = PRESETS.slice(k, k + 8);
  const objs = set.map((prst, i) => tbx({ i: i + 1, x: 80 + (i % 2) * 230, y: 110 + Math.floor(i / 2) * 170, w: 120, h: 80, prst, content: p(r('Ww Hxg ' + prst)) })).join('');
  cases.push({ name: `tg-${String(k / 8).padStart(2, '0')}`, docx: D(objs) });
}
