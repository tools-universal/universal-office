/**
 * Formas do OfficeArt da planilha .xls (retângulos, elipses, linhas, caixas de
 * texto, autoformas do Excel 2007+ salvas em .xls) → `<xdr:sp>` do DrawingML,
 * com o texto do TXO (runs de fonte) no `<xdr:txBody>`.
 *
 * Propriedades do FOPT ([MS-ODRAW] 2.3): preenchimento (0x0180–0x01BF), linha
 * (0x01C0–0x01FF), margens/âncora do texto (0x0081–0x0087), rotação (0x0004).
 * Cores OfficeArtCOLORREF: RGB, ou índice da paleta da pasta (fSchemeIndex —
 * como o Excel grava: 0x08000040 = texto da janela, 0x08000009 = branco).
 */
import type { XlsGlobals } from './globals.js';
import type { ObjInfo } from './sheet.js';
import type { XlsShape } from './officeart.js';
import { fontAt, icvColor } from './styles-xml.js';
import { xmlText } from './xmlw.js';

/** MSOSPT → `a:prstGeom` (mesma tabela do leitor .ppt do Slides, sem os ajustes). */
const PRESETS: Record<number, string> = {
  1: 'rect', 2: 'roundRect', 3: 'ellipse', 4: 'diamond', 5: 'triangle', 6: 'rtTriangle', 7: 'parallelogram', 8: 'trapezoid',
  9: 'hexagon', 10: 'octagon', 11: 'plus', 12: 'star5', 13: 'rightArrow', 14: 'rightArrow', 15: 'homePlate', 16: 'cube',
  17: 'wedgeRoundRectCallout', 18: 'star16', 19: 'arc', 20: 'line', 21: 'plaque', 22: 'can', 23: 'donut',
  32: 'straightConnector1', 33: 'bentConnector2', 34: 'bentConnector3', 35: 'bentConnector4', 36: 'bentConnector5',
  37: 'curvedConnector2', 38: 'curvedConnector3', 39: 'curvedConnector4', 40: 'curvedConnector5', 41: 'callout1',
  42: 'callout2', 43: 'callout3', 44: 'accentCallout1', 45: 'accentCallout2', 46: 'accentCallout3', 47: 'borderCallout1',
  48: 'borderCallout2', 49: 'borderCallout3', 50: 'accentBorderCallout1', 51: 'accentBorderCallout2', 52: 'accentBorderCallout3',
  53: 'ribbon', 54: 'ribbon2', 55: 'chevron', 56: 'pentagon', 57: 'noSmoking', 58: 'star8', 59: 'star16', 60: 'star32',
  61: 'wedgeRectCallout', 62: 'wedgeRoundRectCallout', 63: 'wedgeEllipseCallout', 64: 'wave', 65: 'foldedCorner',
  66: 'leftArrow', 67: 'downArrow', 68: 'upArrow', 69: 'leftRightArrow', 70: 'upDownArrow', 71: 'irregularSeal1',
  72: 'irregularSeal2', 73: 'lightningBolt', 74: 'heart', 76: 'quadArrow', 77: 'leftArrowCallout', 78: 'rightArrowCallout',
  79: 'upArrowCallout', 80: 'downArrowCallout', 81: 'leftRightArrowCallout', 82: 'upDownArrowCallout', 83: 'quadArrowCallout',
  84: 'bevel', 85: 'leftBracket', 86: 'rightBracket', 87: 'leftBrace', 88: 'rightBrace', 89: 'leftUpArrow', 90: 'bentUpArrow',
  91: 'bentArrow', 92: 'star24', 93: 'stripedRightArrow', 94: 'notchedRightArrow', 95: 'blockArc', 96: 'smileyFace',
  97: 'verticalScroll', 98: 'horizontalScroll', 99: 'circularArrow', 100: 'circularArrow', 101: 'uturnArrow',
  102: 'curvedRightArrow', 103: 'curvedLeftArrow', 104: 'curvedUpArrow', 105: 'curvedDownArrow', 106: 'cloudCallout',
  107: 'ellipseRibbon', 108: 'ellipseRibbon2', 109: 'flowChartProcess', 110: 'flowChartDecision', 111: 'flowChartInputOutput',
  112: 'flowChartPredefinedProcess', 113: 'flowChartInternalStorage', 114: 'flowChartDocument', 115: 'flowChartMultidocument',
  116: 'flowChartTerminator', 117: 'flowChartPreparation', 118: 'flowChartManualInput', 119: 'flowChartManualOperation',
  120: 'flowChartConnector', 121: 'flowChartPunchedCard', 122: 'flowChartPunchedTape', 123: 'flowChartSummingJunction',
  124: 'flowChartOr', 125: 'flowChartCollate', 126: 'flowChartSort', 127: 'flowChartExtract', 128: 'flowChartMerge',
  129: 'flowChartOfflineStorage', 130: 'flowChartOnlineStorage', 131: 'flowChartMagneticTape', 132: 'flowChartMagneticDisk',
  133: 'flowChartMagneticDrum', 134: 'flowChartDisplay', 135: 'flowChartDelay', 176: 'flowChartAlternateProcess',
  177: 'flowChartOffpageConnector', 178: 'callout1', 179: 'accentCallout1', 180: 'borderCallout1', 181: 'accentBorderCallout1',
  182: 'leftRightUpArrow', 183: 'sun', 184: 'moon', 185: 'bracketPair', 186: 'bracePair', 187: 'star4', 188: 'doubleWave',
  202: 'rect',
};

/** OBJ que viram forma: linha, retângulo, oval, arco, caixa de texto, autoforma (Excel 2007+). */
const SHAPE_OBJS = new Set([1, 2, 3, 4, 6, 0x1e]);

/** A forma/OBJ deve virar `<xdr:sp>`? (imagens, gráficos, notas e controles ficam de fora). */
export function isShapeObj(s: XlsShape, obj: ObjInfo | undefined): boolean {
  if (obj) return SHAPE_OBJS.has(obj.ot) && PRESETS[s.type] !== undefined;
  return PRESETS[s.type] !== undefined && s.type !== 75;
}

const hex = (c: string): string => c.replace('#', '').toUpperCase();

/** OfficeArtCOLORREF → "#RRGGBB" (undefined = cor de sistema não mapeada). */
function colorRef(g: XlsGlobals, v: number | undefined, fallback: string): string {
  if (v === undefined) return fallback;
  const flags = v >>> 24;
  if (flags & 0x08) return icvColor(v & 0xffff, g.palette, 'fg') ?? fallback; // índice da paleta (fSchemeIndex)
  if (flags & 0x10) return fallback; // cor de sistema
  const r = v & 0xff, gg = (v >>> 8) & 0xff, b = (v >>> 16) & 0xff;
  return '#' + [r, gg, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Booleano de um conjunto (bit + bit de uso 16 acima); ausente = padrão. */
function boolProp(s: XlsShape, id: number, bit: number, def: boolean): boolean {
  const v = s.props.get(id);
  if (v === undefined || !((v >>> 16) & bit)) return def;
  return (v & bit) !== 0;
}

const DASH = ['', 'dash', 'sysDot', 'dashDot', 'lgDashDotDot', 'sysDash', 'sysDashDot', 'sysDashDotDot', 'dash', 'lgDash', 'lgDashDot', 'lgDashDotDot'];
const ARROW = ['', 'triangle', 'stealth', 'diamond', 'oval', 'arrow'];

/** `<xdr:sp>` da forma (sem a âncora). `id` = cNvPr id único no desenho. */
export function shapeXml(g: XlsGlobals, s: XlsShape, obj: ObjInfo | undefined, id: number): string {
  const prst = PRESETS[s.type] ?? 'rect';
  const isLine = prst === 'line' || prst.includes('Connector') || obj?.ot === 1;
  const isText = s.type === 202 || obj?.ot === 6;
  // preenchimento (padrão do Excel: branco sólido) e linha (padrão: preta 0,75 pt)
  const filled = !isLine && boolProp(s, 0x1bf, 0x10, true);
  const fillType = s.props.get(0x180) ?? 0;
  const fillColor = colorRef(g, s.props.get(0x181), '#FFFFFF');
  const opacity = s.props.get(0x182);
  const alpha = opacity !== undefined && opacity < 0x10000 ? `<a:alpha val="${Math.round((opacity / 65536) * 100000)}"/>` : '';
  // sólido; degradê/padrão/textura (fillType ≥ 1) saem pela cor principal
  void fillType;
  const fill = filled ? `<a:solidFill><a:srgbClr val="${hex(fillColor)}">${alpha}</a:srgbClr></a:solidFill>` : '<a:noFill/>';
  const lined = boolProp(s, 0x1ff, 0x08, true);
  const lineColor = colorRef(g, s.props.get(0x1c0), '#000000');
  const lw = s.props.get(0x1cb) ?? 9525;
  const dash = DASH[s.props.get(0x1ce) ?? 0] ?? '';
  const head = ARROW[s.props.get(0x1d0) ?? 0] ?? '';
  const tail = ARROW[s.props.get(0x1d1) ?? 0] ?? '';
  const ln = !lined ? '<a:ln><a:noFill/></a:ln>'
    : `<a:ln w="${Math.max(0, Math.min(lw, 20 * 12700))}"><a:solidFill><a:srgbClr val="${hex(lineColor)}"/></a:solidFill>`
      + `${dash ? `<a:prstDash val="${dash}"/>` : ''}${head ? `<a:headEnd type="${head}"/>` : ''}${tail ? `<a:tailEnd type="${tail}"/>` : ''}</a:ln>`;
  const flipH = (s.flags & 0x40) !== 0, flipV = (s.flags & 0x80) !== 0;
  const rotRaw = s.props.get(0x0004);
  const rot = rotRaw ? Math.round(((rotRaw | 0) / 65536) * 60000) : 0;
  const xfrm = `<a:xfrm${rot ? ` rot="${rot}"` : ''}${flipH ? ' flipH="1"' : ''}${flipV ? ' flipV="1"' : ''}><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>`;
  const name = isText ? `Caixa de Texto ${id - 1}` : isLine ? `Conector ${id - 1}` : `Forma ${id - 1}`;
  return `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${id}" name="${xmlText(name)}"/><xdr:cNvSpPr${isText ? ' txBox="1"' : ''}/></xdr:nvSpPr>`
    + `<xdr:spPr>${xfrm}<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill}${ln}</xdr:spPr>`
    + txBody(g, s, obj) + '</xdr:sp>';
}

const H_ALIGN: Record<number, string> = { 1: 'l', 2: 'ctr', 3: 'r', 4: 'just', 7: 'dist' };
const V_ANCHOR: Record<number, string> = { 1: 't', 2: 'ctr', 3: 'b', 4: 'just', 7: 'dist' };

/** Texto do TXO → `<xdr:txBody>` (parágrafos por quebra de linha, runs pelas fontes). */
function txBody(g: XlsGlobals, s: XlsShape, obj: ObjInfo | undefined): string {
  const text = obj?.text;
  if (!text || !text.text) return '';
  const al = obj.txoAlign ?? 0;
  const algn = H_ALIGN[(al >>> 1) & 7] ?? 'l';
  const anchor = V_ANCHOR[(al >>> 4) & 7] ?? 't';
  const ins = (pid: number, def: number): number => s.props.get(pid) ?? def;
  const rot = obj.txoRot ?? 0;
  const vert = rot === 1 ? ' vert="wordArtVert"' : rot === 2 ? ' vert="vert270"' : rot === 3 ? ' vert="vert"' : '';
  const body = `<a:bodyPr vertOverflow="clip" wrap="square" lIns="${ins(0x81, 91440)}" tIns="${ins(0x82, 45720)}" rIns="${ins(0x83, 91440)}" bIns="${ins(0x84, 45720)}" anchor="${anchor}"${vert}/>`;
  // runs: [ich, ifnt] ordenados; antes do 1º run, a fonte 0
  const runs = [...(text.runs ?? [])].sort((a, b) => a.ich - b.ich);
  if (!runs.length || runs[0]!.ich > 0) runs.unshift({ ich: 0, ifnt: 0 });
  const rpr = (ifnt: number): string => {
    const f = fontAt(g, ifnt);
    const color = icvColor(f.color, g.palette, 'font') ?? '#000000';
    return `<a:rPr lang="pt-BR" sz="${Math.round((f.height / 20) * 100)}" b="${f.weight >= 600 ? 1 : 0}" i="${f.italic ? 1 : 0}"${f.underline ? ' u="sng"' : ''}${f.strike ? ' strike="sngStrike"' : ''}>`
      + `<a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill><a:latin typeface="${xmlText(f.name)}"/></a:rPr>`;
  };
  const paras: string[] = [];
  let cur = '';
  const full = text.text.replace(/\r\n?/g, '\n');
  runs.forEach((r, i) => {
    const end = i + 1 < runs.length ? runs[i + 1]!.ich : full.length;
    const seg = full.slice(r.ich, end);
    const lines = seg.split('\n');
    lines.forEach((line, k) => {
      if (k > 0) { paras.push(cur); cur = ''; }
      if (line) cur += `<a:r>${rpr(r.ifnt)}<a:t>${xmlText(line)}</a:t></a:r>`;
    });
  });
  paras.push(cur);
  const pXml = paras.map((p) => `<a:p><a:pPr algn="${algn}"/>${p}</a:p>`).join('');
  return `<xdr:txBody>${body}<a:lstStyle/>${pXml}</xdr:txBody>`;
}
