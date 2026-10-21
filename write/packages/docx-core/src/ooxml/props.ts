import { childElements, firstChild, type XmlElement } from '../xml.js';

/**
 * Propriedades OOXML de run/parágrafo/tabela em forma ESPARSA e TIPADA —
 * exatamente o que o XML declara (campo ausente = não especificado, herda).
 * É a entrada do motor de layout (`@universal-office/docx-layout`), que faz a
 * cascata completa do Word: docDefaults → estilo de tabela → estilo de
 * parágrafo (basedOn) → numeração → estilo de caractere → formatação direta.
 *
 * Diferente de RunProps/ParaProps (modelo de EDIÇÃO, booleanos "achatados"),
 * aqui `b: false` significa `<w:b w:val="0"/>` explícito — necessário para as
 * propriedades alternáveis (toggle) do Word e para desligar herança.
 * Os objetos são JSON puros (entram nos snapshots de desfazer do editor).
 */

export interface ColorSpec {
  /** RRGGBB ou 'auto'. */
  val?: string;
  themeColor?: string;
  /** 00-FF em hex (fração do tint/shade). */
  themeTint?: string;
  themeShade?: string;
}

export interface RFonts {
  ascii?: string;
  hAnsi?: string;
  eastAsia?: string;
  cs?: string;
  asciiTheme?: string;
  hAnsiTheme?: string;
  eastAsiaTheme?: string;
  cstheme?: string;
  hint?: string;
}

export interface BorderSpec {
  /** w:val (single, double, dashed, dotted, thick, nil, none…). */
  val: string;
  /** oitavos de ponto. */
  sz?: number;
  /** pontos. */
  space?: number;
  color?: string;
  themeColor?: string;
  themeTint?: string;
  themeShade?: string;
  shadow?: boolean;
  frame?: boolean;
}

export interface ShadingSpec {
  /** padrão (clear, solid, pct10…, horzStripe…, nil). */
  val?: string;
  color?: string;
  fill?: string;
  themeFill?: string;
  themeFillTint?: string;
  themeFillShade?: string;
  themeColor?: string;
}

export interface UnderlineSpec {
  val: string;
  color?: string;
  themeColor?: string;
}

export interface RPr {
  rStyle?: string;
  rFonts?: RFonts;
  b?: boolean;
  bCs?: boolean;
  i?: boolean;
  iCs?: boolean;
  caps?: boolean;
  smallCaps?: boolean;
  strike?: boolean;
  dstrike?: boolean;
  outline?: boolean;
  shadow?: boolean;
  emboss?: boolean;
  imprint?: boolean;
  vanish?: boolean;
  specVanish?: boolean;
  webHidden?: boolean;
  noProof?: boolean;
  snapToGrid?: boolean;
  color?: ColorSpec;
  /** w:spacing — espaçamento entre caracteres (twips, pode ser negativo). */
  spacing?: number;
  /** w:w — escala horizontal (%). */
  w?: number;
  /** w:kern — tamanho mínimo (half-points) para aplicar kerning. */
  kern?: number;
  /** w:position — deslocamento vertical (half-points, + sobe). */
  position?: number;
  /** half-points */
  sz?: number;
  szCs?: number;
  highlight?: string;
  u?: UnderlineSpec;
  effect?: string;
  bdr?: BorderSpec;
  shd?: ShadingSpec;
  vertAlign?: 'superscript' | 'subscript' | 'baseline';
  rtl?: boolean;
  cs?: boolean;
  em?: string;
  lang?: { val?: string; eastAsia?: string; bidi?: string };
  /** w14:textFill (Word 2010+): cor sólida e OPACIDADE (0..1) do texto —
   *  w14:alpha é transparência (100000 = invisível) */
  textFill?: { color?: string; themeColor?: string; alpha?: number };
  /** w14:textOutline com preenchimento (contorno visível do texto) */
  textOutline?: boolean;
  /** w14:shadow (sombra do texto, Word 2010+): desfoque e deslocamento em pt, direção em
   *  graus (0 = direita, 90 = para baixo) — a sombra aumenta a altura da linha */
  textShadow?: { blur: number; dist: number; dir: number };
  /** w14:ligatures (Word 2010+): ligaduras OpenType — standard, contextual, historical,
   *  discretional, combinações ou all; none = desligadas */
  ligatures?: string;
}

export type TabAlign = 'left' | 'center' | 'right' | 'decimal' | 'bar' | 'clear' | 'num';

export interface TabSpec {
  val: TabAlign;
  /** twips (pode ser negativo). */
  pos: number;
  leader?: 'none' | 'dot' | 'hyphen' | 'underscore' | 'heavy' | 'middleDot';
}

export interface SpacingSpec {
  before?: number;
  beforeLines?: number;
  beforeAutospacing?: boolean;
  after?: number;
  afterLines?: number;
  afterAutospacing?: boolean;
  line?: number;
  lineRule?: 'auto' | 'exact' | 'atLeast';
}

export interface IndSpec {
  left?: number;
  right?: number;
  hanging?: number;
  firstLine?: number;
  leftChars?: number;
  rightChars?: number;
  hangingChars?: number;
  firstLineChars?: number;
}

export interface FramePr {
  dropCap?: 'none' | 'drop' | 'margin';
  lines?: number;
  w?: number;
  h?: number;
  hRule?: 'auto' | 'exact' | 'atLeast';
  hSpace?: number;
  vSpace?: number;
  wrap?: string;
  hAnchor?: string;
  vAnchor?: string;
  x?: number;
  y?: number;
  xAlign?: string;
  yAlign?: string;
  anchorLock?: boolean;
}

export interface PBdr {
  top?: BorderSpec;
  left?: BorderSpec;
  bottom?: BorderSpec;
  right?: BorderSpec;
  between?: BorderSpec;
  bar?: BorderSpec;
}

export interface PPr {
  pStyle?: string;
  keepNext?: boolean;
  keepLines?: boolean;
  pageBreakBefore?: boolean;
  framePr?: FramePr;
  widowControl?: boolean;
  /** numId 0 = remove a numeração herdada. */
  numPr?: { numId?: number; ilvl?: number };
  suppressLineNumbers?: boolean;
  pBdr?: PBdr;
  shd?: ShadingSpec;
  tabs?: TabSpec[];
  suppressAutoHyphens?: boolean;
  kinsoku?: boolean;
  wordWrap?: boolean;
  overflowPunct?: boolean;
  autoSpaceDE?: boolean;
  autoSpaceDN?: boolean;
  bidi?: boolean;
  adjustRightInd?: boolean;
  snapToGrid?: boolean;
  spacing?: SpacingSpec;
  ind?: IndSpec;
  contextualSpacing?: boolean;
  mirrorIndents?: boolean;
  suppressOverlap?: boolean;
  jc?: string;
  textAlignment?: string;
  outlineLvl?: number;
  /** rPr da MARCA de parágrafo (¶) — define a altura de parágrafo vazio. */
  rPr?: RPr;
  /** marca de parágrafo excluída em revisão (w:rPr/w:del ou w:moveFrom): na
   *  visão final o parágrafo se junta ao seguinte. */
  markDeleted?: boolean;
}

export interface WidthSpec {
  w: number;
  /** dxa (twips) | pct (50ºs de % — ou "50%") | auto | nil */
  type: 'dxa' | 'pct' | 'auto' | 'nil';
}

export interface TblBorders {
  top?: BorderSpec;
  left?: BorderSpec;
  bottom?: BorderSpec;
  right?: BorderSpec;
  insideH?: BorderSpec;
  insideV?: BorderSpec;
}

export interface CellMargins {
  top?: WidthSpec;
  left?: WidthSpec;
  bottom?: WidthSpec;
  right?: WidthSpec;
}

export interface TblLook {
  firstRow?: boolean;
  lastRow?: boolean;
  firstColumn?: boolean;
  lastColumn?: boolean;
  noHBand?: boolean;
  noVBand?: boolean;
}

export interface TblpPr {
  leftFromText?: number;
  rightFromText?: number;
  topFromText?: number;
  bottomFromText?: number;
  vertAnchor?: 'text' | 'margin' | 'page';
  horzAnchor?: 'text' | 'margin' | 'page';
  tblpXSpec?: string;
  tblpX?: number;
  tblpYSpec?: string;
  tblpY?: number;
}

export interface TblPr {
  tblStyle?: string;
  tblpPr?: TblpPr;
  tblOverlap?: string;
  bidiVisual?: boolean;
  tblStyleRowBandSize?: number;
  tblStyleColBandSize?: number;
  tblW?: WidthSpec;
  jc?: string;
  tblCellSpacing?: WidthSpec;
  tblInd?: WidthSpec;
  tblBorders?: TblBorders;
  shd?: ShadingSpec;
  tblLayout?: 'fixed' | 'autofit';
  tblCellMar?: CellMargins;
  tblLook?: TblLook;
  /** Texto Alt: título e descrição. */
  tblCaption?: string;
  tblDescription?: string;
}

export interface TrPr {
  cnfStyle?: string;
  gridBefore?: number;
  gridAfter?: number;
  wBefore?: WidthSpec;
  wAfter?: WidthSpec;
  cantSplit?: boolean;
  trHeight?: { val: number; hRule: 'auto' | 'exact' | 'atLeast' };
  tblHeader?: boolean;
  tblCellSpacing?: WidthSpec;
  jc?: string;
  hidden?: boolean;
}

export interface TcBorders extends TblBorders {
  tl2br?: BorderSpec;
  tr2bl?: BorderSpec;
}

export interface TcPr {
  cnfStyle?: string;
  tcW?: WidthSpec;
  gridSpan?: number;
  hMerge?: 'restart' | 'continue';
  vMerge?: 'restart' | 'continue';
  tcBorders?: TcBorders;
  shd?: ShadingSpec;
  noWrap?: boolean;
  tcMar?: CellMargins;
  textDirection?: string;
  tcFitText?: boolean;
  vAlign?: 'top' | 'center' | 'bottom' | 'both';
  hideMark?: boolean;
}

// ───────────────────────── leitura ─────────────────────────

const int = (v: string | undefined): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

/** Medida de "universal measure" (twips por padrão; aceita "12pt", "1in"…). */
export function measureTwips(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const m = /^(-?[0-9.]+)(mm|cm|in|pt|pc|pi)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  switch (m[2]) {
    case 'mm': return Math.round((n / 25.4) * 1440);
    case 'cm': return Math.round((n / 2.54) * 1440);
    case 'in': return Math.round(n * 1440);
    case 'pt': return Math.round(n * 20);
    case 'pc': case 'pi': return Math.round(n * 240);
    default: return Math.round(n);
  }
}

/** ST_OnOff: ausência de w:val = true; "0"/"false"/"off" = false. */
export function onOffVal(el: XmlElement): boolean {
  const v = el.attrs['w:val'];
  return !(v === '0' || v === 'false' || v === 'off' || v === 'none');
}

function colorOf(el: XmlElement): ColorSpec {
  const c: ColorSpec = {};
  if (el.attrs['w:val'] !== undefined) c.val = el.attrs['w:val'];
  if (el.attrs['w:themeColor']) c.themeColor = el.attrs['w:themeColor'];
  if (el.attrs['w:themeTint']) c.themeTint = el.attrs['w:themeTint'];
  if (el.attrs['w:themeShade']) c.themeShade = el.attrs['w:themeShade'];
  return c;
}

export function readBorder(el: XmlElement | undefined): BorderSpec | undefined {
  if (!el) return undefined;
  const b: BorderSpec = { val: el.attrs['w:val'] ?? 'single' };
  const sz = int(el.attrs['w:sz']);
  if (sz !== undefined) b.sz = sz;
  const space = int(el.attrs['w:space']);
  if (space !== undefined) b.space = space;
  if (el.attrs['w:color']) b.color = el.attrs['w:color'];
  if (el.attrs['w:themeColor']) b.themeColor = el.attrs['w:themeColor'];
  if (el.attrs['w:themeTint']) b.themeTint = el.attrs['w:themeTint'];
  if (el.attrs['w:themeShade']) b.themeShade = el.attrs['w:themeShade'];
  if (el.attrs['w:shadow'] !== undefined) b.shadow = onOffAttr(el.attrs['w:shadow']);
  if (el.attrs['w:frame'] !== undefined) b.frame = onOffAttr(el.attrs['w:frame']);
  return b;
}

const onOffAttr = (v: string | undefined): boolean => !(v === '0' || v === 'false' || v === 'off');

export function readShading(el: XmlElement | undefined): ShadingSpec | undefined {
  if (!el) return undefined;
  const s: ShadingSpec = {};
  for (const k of ['val', 'color', 'fill', 'themeFill', 'themeFillTint', 'themeFillShade', 'themeColor'] as const) {
    const v = el.attrs[`w:${k}`];
    if (v !== undefined) s[k] = v;
  }
  return s;
}

function readWidth(el: XmlElement | undefined): WidthSpec | undefined {
  if (!el) return undefined;
  const type = (el.attrs['w:type'] ?? 'dxa') as WidthSpec['type'];
  const raw = el.attrs['w:w'] ?? '0';
  let w: number;
  if (raw.endsWith('%')) w = Math.round(parseFloat(raw) * 50); // "50%" → 2500 (50ºs de %)
  else w = type === 'dxa' ? (measureTwips(raw) ?? 0) : (int(raw) ?? 0);
  return { w, type: type === 'pct' || type === 'auto' || type === 'nil' ? type : 'dxa' };
}

export function readRPr(rPr: XmlElement | undefined): RPr | undefined {
  if (!rPr) return undefined;
  const p: RPr = {};
  for (const el of childElements(rPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:rStyle': if (val) p.rStyle = val; break;
      case 'w:rFonts': {
        const f: RFonts = {};
        for (const k of ['ascii', 'hAnsi', 'eastAsia', 'cs', 'asciiTheme', 'hAnsiTheme', 'eastAsiaTheme', 'cstheme', 'hint'] as const) {
          const v = el.attrs[`w:${k}`];
          if (v !== undefined) f[k] = v;
        }
        p.rFonts = f;
        break;
      }
      case 'w:b': p.b = onOffVal(el); break;
      case 'w:bCs': p.bCs = onOffVal(el); break;
      case 'w:i': p.i = onOffVal(el); break;
      case 'w:iCs': p.iCs = onOffVal(el); break;
      case 'w:caps': p.caps = onOffVal(el); break;
      case 'w:smallCaps': p.smallCaps = onOffVal(el); break;
      case 'w:strike': p.strike = onOffVal(el); break;
      case 'w:dstrike': p.dstrike = onOffVal(el); break;
      case 'w:outline': p.outline = onOffVal(el); break;
      case 'w:shadow': p.shadow = onOffVal(el); break;
      case 'w:emboss': p.emboss = onOffVal(el); break;
      case 'w:imprint': p.imprint = onOffVal(el); break;
      case 'w:vanish': p.vanish = onOffVal(el); break;
      case 'w:specVanish': p.specVanish = onOffVal(el); break;
      case 'w:webHidden': p.webHidden = onOffVal(el); break;
      case 'w:noProof': p.noProof = onOffVal(el); break;
      case 'w:snapToGrid': p.snapToGrid = onOffVal(el); break;
      case 'w:rtl': p.rtl = onOffVal(el); break;
      case 'w:cs': p.cs = onOffVal(el); break;
      case 'w:color': p.color = colorOf(el); break;
      case 'w14:textFill': {
        const solid = firstChild(el, 'w14:solidFill');
        const clr = solid && (firstChild(solid, 'w14:srgbClr') ?? firstChild(solid, 'w14:schemeClr'));
        if (clr) {
          const tf: NonNullable<RPr['textFill']> = {};
          const v = clr.attrs['w14:val'];
          if (clr.name === 'w14:srgbClr' && v) tf.color = v.toUpperCase();
          else if (v) tf.themeColor = v;
          const a = firstChild(clr, 'w14:alpha')?.attrs['w14:val'];
          if (a !== undefined) tf.alpha = Math.max(0, 1 - (parseInt(a, 10) || 0) / 100000);
          p.textFill = tf;
        } else if (firstChild(el, 'w14:noFill')) p.textFill = { alpha: 0 };
        break;
      }
      case 'w14:ligatures':
        p.ligatures = el.attrs['w14:val'] ?? 'standard';
        break;
      case 'w14:shadow': {
        const emu = (k: string) => (parseInt(el.attrs[k] ?? '0', 10) || 0) / 12700;
        p.textShadow = { blur: emu('w14:blurRad'), dist: emu('w14:dist'), dir: (parseInt(el.attrs['w14:dir'] ?? '0', 10) || 0) / 60000 };
        break;
      }
      case 'w14:textOutline':
        p.textOutline = !firstChild(el, 'w14:noFill') && !!(firstChild(el, 'w14:solidFill') ?? firstChild(el, 'w14:gradFill'));
        break;
      case 'w:spacing': { const n = measureTwips(val); if (n !== undefined) p.spacing = n; break; }
      case 'w:w': { const n = int(val?.replace('%', '')); if (n !== undefined) p.w = n; break; }
      case 'w:kern': { const n = int(val); if (n !== undefined) p.kern = n; break; }
      case 'w:position': { const n = int(val); if (n !== undefined) p.position = n; break; }
      case 'w:sz': { const n = int(val); if (n !== undefined) p.sz = n; break; }
      case 'w:szCs': { const n = int(val); if (n !== undefined) p.szCs = n; break; }
      case 'w:highlight': if (val) p.highlight = val; break;
      case 'w:u': {
        const u: UnderlineSpec = { val: val ?? 'single' };
        if (el.attrs['w:color']) u.color = el.attrs['w:color'];
        if (el.attrs['w:themeColor']) u.themeColor = el.attrs['w:themeColor'];
        p.u = u;
        break;
      }
      case 'w:effect': if (val) p.effect = val; break;
      case 'w:bdr': p.bdr = readBorder(el); break;
      case 'w:shd': p.shd = readShading(el); break;
      case 'w:vertAlign':
        if (val === 'superscript' || val === 'subscript' || val === 'baseline') p.vertAlign = val;
        break;
      case 'w:em': if (val) p.em = val; break;
      case 'w:lang': {
        const l: RPr['lang'] = {};
        if (el.attrs['w:val']) l.val = el.attrs['w:val'];
        if (el.attrs['w:eastAsia']) l.eastAsia = el.attrs['w:eastAsia'];
        if (el.attrs['w:bidi']) l.bidi = el.attrs['w:bidi'];
        p.lang = l;
        break;
      }
    }
  }
  return p;
}

function readPBdr(el: XmlElement | undefined): PBdr | undefined {
  if (!el) return undefined;
  const b: PBdr = {};
  for (const side of ['top', 'left', 'bottom', 'right', 'between', 'bar'] as const) {
    const e = readBorder(firstChild(el, `w:${side}`) ?? (side === 'left' ? firstChild(el, 'w:start') : side === 'right' ? firstChild(el, 'w:end') : undefined));
    if (e) b[side] = e;
  }
  return b;
}

const TAB_VALS = new Set(['left', 'center', 'right', 'decimal', 'bar', 'clear', 'num', 'start', 'end']);
const LEADERS = new Set(['none', 'dot', 'hyphen', 'underscore', 'heavy', 'middleDot']);

export function readPPr(pPr: XmlElement | undefined): PPr | undefined {
  if (!pPr) return undefined;
  const p: PPr = {};
  for (const el of childElements(pPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:pStyle': if (val) p.pStyle = val; break;
      case 'w:keepNext': p.keepNext = onOffVal(el); break;
      case 'w:keepLines': p.keepLines = onOffVal(el); break;
      case 'w:pageBreakBefore': p.pageBreakBefore = onOffVal(el); break;
      case 'w:widowControl': p.widowControl = onOffVal(el); break;
      case 'w:suppressLineNumbers': p.suppressLineNumbers = onOffVal(el); break;
      case 'w:suppressAutoHyphens': p.suppressAutoHyphens = onOffVal(el); break;
      case 'w:kinsoku': p.kinsoku = onOffVal(el); break;
      case 'w:wordWrap': p.wordWrap = onOffVal(el); break;
      case 'w:overflowPunct': p.overflowPunct = onOffVal(el); break;
      case 'w:autoSpaceDE': p.autoSpaceDE = onOffVal(el); break;
      case 'w:autoSpaceDN': p.autoSpaceDN = onOffVal(el); break;
      case 'w:bidi': p.bidi = onOffVal(el); break;
      case 'w:adjustRightInd': p.adjustRightInd = onOffVal(el); break;
      case 'w:snapToGrid': p.snapToGrid = onOffVal(el); break;
      case 'w:contextualSpacing': p.contextualSpacing = onOffVal(el); break;
      case 'w:mirrorIndents': p.mirrorIndents = onOffVal(el); break;
      case 'w:suppressOverlap': p.suppressOverlap = onOffVal(el); break;
      case 'w:jc': if (val) p.jc = val; break;
      case 'w:textAlignment': if (val) p.textAlignment = val; break;
      case 'w:outlineLvl': { const n = int(val); if (n !== undefined) p.outlineLvl = n; break; }
      case 'w:numPr': {
        const numPr: PPr['numPr'] = {};
        const numId = int(firstChild(el, 'w:numId')?.attrs['w:val']);
        const ilvl = int(firstChild(el, 'w:ilvl')?.attrs['w:val']);
        if (numId !== undefined) numPr.numId = numId;
        if (ilvl !== undefined) numPr.ilvl = ilvl;
        p.numPr = numPr;
        break;
      }
      case 'w:pBdr': p.pBdr = readPBdr(el); break;
      case 'w:shd': p.shd = readShading(el); break;
      case 'w:tabs': {
        const tabs: TabSpec[] = [];
        for (const t of childElements(el, 'w:tab')) {
          let v = t.attrs['w:val'] ?? 'left';
          if (v === 'start') v = 'left';
          if (v === 'end') v = 'right';
          if (!TAB_VALS.has(v)) continue;
          const pos = measureTwips(t.attrs['w:pos']);
          if (pos === undefined) continue;
          const tab: TabSpec = { val: v as TabAlign, pos };
          const leader = t.attrs['w:leader'];
          if (leader && LEADERS.has(leader)) tab.leader = leader as TabSpec['leader'];
          tabs.push(tab);
        }
        p.tabs = tabs;
        break;
      }
      case 'w:spacing': {
        const s: SpacingSpec = {};
        const a = el.attrs;
        const before = measureTwips(a['w:before']);
        if (before !== undefined) s.before = before;
        const after = measureTwips(a['w:after']);
        if (after !== undefined) s.after = after;
        const bl = int(a['w:beforeLines']);
        if (bl !== undefined) s.beforeLines = bl;
        const al = int(a['w:afterLines']);
        if (al !== undefined) s.afterLines = al;
        if (a['w:beforeAutospacing'] !== undefined) s.beforeAutospacing = onOffAttr(a['w:beforeAutospacing']);
        if (a['w:afterAutospacing'] !== undefined) s.afterAutospacing = onOffAttr(a['w:afterAutospacing']);
        const line = measureTwips(a['w:line']);
        if (line !== undefined) s.line = line;
        const rule = a['w:lineRule'];
        if (rule === 'auto' || rule === 'exact' || rule === 'atLeast') s.lineRule = rule;
        p.spacing = s;
        break;
      }
      case 'w:ind': {
        const s: IndSpec = {};
        const a = el.attrs;
        const left = measureTwips(a['w:left'] ?? a['w:start']);
        if (left !== undefined) s.left = left;
        const right = measureTwips(a['w:right'] ?? a['w:end']);
        if (right !== undefined) s.right = right;
        const hanging = measureTwips(a['w:hanging']);
        if (hanging !== undefined) s.hanging = hanging;
        const firstLine = measureTwips(a['w:firstLine']);
        if (firstLine !== undefined) s.firstLine = firstLine;
        for (const k of ['leftChars', 'rightChars', 'hangingChars', 'firstLineChars'] as const) {
          const n = int(a[`w:${k}`] ?? (k === 'leftChars' ? a['w:startChars'] : k === 'rightChars' ? a['w:endChars'] : undefined));
          if (n !== undefined) s[k] = n;
        }
        p.ind = s;
        break;
      }
      case 'w:framePr': {
        const a = el.attrs;
        const f: FramePr = {};
        const dc = a['w:dropCap'];
        if (dc === 'none' || dc === 'drop' || dc === 'margin') f.dropCap = dc;
        for (const k of ['lines', 'w', 'h', 'hSpace', 'vSpace', 'x', 'y'] as const) {
          const n = k === 'lines' ? int(a[`w:${k}`]) : measureTwips(a[`w:${k}`]);
          if (n !== undefined) f[k] = n;
        }
        const hr = a['w:hRule'];
        if (hr === 'auto' || hr === 'exact' || hr === 'atLeast') f.hRule = hr;
        for (const k of ['wrap', 'hAnchor', 'vAnchor', 'xAlign', 'yAlign'] as const) {
          if (a[`w:${k}`]) f[k] = a[`w:${k}`];
        }
        if (a['w:anchorLock'] !== undefined) f.anchorLock = onOffAttr(a['w:anchorLock']);
        p.framePr = f;
        break;
      }
      case 'w:rPr':
        p.rPr = readRPr(el);
        if (childElements(el).some((c) => c.name === 'w:del' || c.name === 'w:moveFrom')) p.markDeleted = true;
        break;
    }
  }
  return p;
}

function readBorders(el: XmlElement | undefined): TcBorders | undefined {
  if (!el) return undefined;
  const b: TcBorders = {};
  const map: [keyof TcBorders, string[]][] = [
    ['top', ['w:top']], ['left', ['w:left', 'w:start']], ['bottom', ['w:bottom']],
    ['right', ['w:right', 'w:end']], ['insideH', ['w:insideH']], ['insideV', ['w:insideV']],
    ['tl2br', ['w:tl2br']], ['tr2bl', ['w:tr2bl']],
  ];
  for (const [k, names] of map) {
    for (const n of names) {
      const e = readBorder(firstChild(el, n));
      if (e) { b[k] = e; break; }
    }
  }
  return b;
}

function readCellMar(el: XmlElement | undefined): CellMargins | undefined {
  if (!el) return undefined;
  const m: CellMargins = {};
  const t = readWidth(firstChild(el, 'w:top'));
  if (t) m.top = t;
  const l = readWidth(firstChild(el, 'w:left') ?? firstChild(el, 'w:start'));
  if (l) m.left = l;
  const b = readWidth(firstChild(el, 'w:bottom'));
  if (b) m.bottom = b;
  const r = readWidth(firstChild(el, 'w:right') ?? firstChild(el, 'w:end'));
  if (r) m.right = r;
  return m;
}

export function readTblPr(tblPr: XmlElement | undefined): TblPr | undefined {
  if (!tblPr) return undefined;
  const p: TblPr = {};
  for (const el of childElements(tblPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:tblStyle': if (val) p.tblStyle = val; break;
      case 'w:tblpPr': {
        const a = el.attrs;
        const t: TblpPr = {};
        for (const k of ['leftFromText', 'rightFromText', 'topFromText', 'bottomFromText', 'tblpX', 'tblpY'] as const) {
          const n = measureTwips(a[`w:${k}`]);
          if (n !== undefined) t[k] = n;
        }
        const va = a['w:vertAnchor'];
        if (va === 'text' || va === 'margin' || va === 'page') t.vertAnchor = va;
        const ha = a['w:horzAnchor'];
        if (ha === 'text' || ha === 'margin' || ha === 'page') t.horzAnchor = ha;
        if (a['w:tblpXSpec']) t.tblpXSpec = a['w:tblpXSpec'];
        if (a['w:tblpYSpec']) t.tblpYSpec = a['w:tblpYSpec'];
        p.tblpPr = t;
        break;
      }
      case 'w:tblOverlap': if (val) p.tblOverlap = val; break;
      case 'w:bidiVisual': p.bidiVisual = onOffVal(el); break;
      case 'w:tblStyleRowBandSize': { const n = int(val); if (n !== undefined) p.tblStyleRowBandSize = n; break; }
      case 'w:tblStyleColBandSize': { const n = int(val); if (n !== undefined) p.tblStyleColBandSize = n; break; }
      case 'w:tblW': p.tblW = readWidth(el); break;
      case 'w:jc': if (val) p.jc = val; break;
      case 'w:tblCellSpacing': p.tblCellSpacing = readWidth(el); break;
      case 'w:tblInd': p.tblInd = readWidth(el); break;
      case 'w:tblBorders': p.tblBorders = readBorders(el); break;
      case 'w:shd': p.shd = readShading(el); break;
      case 'w:tblLayout': p.tblLayout = el.attrs['w:type'] === 'fixed' ? 'fixed' : 'autofit'; break;
      case 'w:tblCaption': if (val !== undefined) p.tblCaption = val; break;
      case 'w:tblDescription': if (val !== undefined) p.tblDescription = val; break;
      case 'w:tblCellMar': p.tblCellMar = readCellMar(el); break;
      case 'w:tblLook': {
        const a = el.attrs;
        const look: TblLook = {};
        const hex = parseInt(a['w:val'] ?? '', 16);
        if (Number.isFinite(hex)) {
          look.firstRow = (hex & 0x20) !== 0;
          look.lastRow = (hex & 0x40) !== 0;
          look.firstColumn = (hex & 0x80) !== 0;
          look.lastColumn = (hex & 0x100) !== 0;
          look.noHBand = (hex & 0x200) !== 0;
          look.noVBand = (hex & 0x400) !== 0;
        }
        for (const k of ['firstRow', 'lastRow', 'firstColumn', 'lastColumn', 'noHBand', 'noVBand'] as const) {
          if (a[`w:${k}`] !== undefined) look[k] = onOffAttr(a[`w:${k}`]);
        }
        p.tblLook = look;
        break;
      }
    }
  }
  return p;
}

export function readTrPr(trPr: XmlElement | undefined): TrPr | undefined {
  if (!trPr) return undefined;
  const p: TrPr = {};
  for (const el of childElements(trPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:cnfStyle': if (val) p.cnfStyle = val; break;
      case 'w:gridBefore': { const n = int(val); if (n !== undefined) p.gridBefore = n; break; }
      case 'w:gridAfter': { const n = int(val); if (n !== undefined) p.gridAfter = n; break; }
      case 'w:wBefore': p.wBefore = readWidth(el); break;
      case 'w:wAfter': p.wAfter = readWidth(el); break;
      case 'w:cantSplit': p.cantSplit = onOffVal(el); break;
      case 'w:trHeight': {
        const v = measureTwips(val) ?? 0;
        const r = el.attrs['w:hRule'];
        p.trHeight = { val: v, hRule: r === 'exact' || r === 'auto' ? r : 'atLeast' };
        break;
      }
      case 'w:tblHeader': p.tblHeader = onOffVal(el); break;
      case 'w:tblCellSpacing': p.tblCellSpacing = readWidth(el); break;
      case 'w:jc': if (val) p.jc = val; break;
      case 'w:hidden': p.hidden = onOffVal(el); break;
    }
  }
  return p;
}

export function readTcPr(tcPr: XmlElement | undefined): TcPr | undefined {
  if (!tcPr) return undefined;
  const p: TcPr = {};
  for (const el of childElements(tcPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:cnfStyle': if (val) p.cnfStyle = val; break;
      case 'w:tcW': p.tcW = readWidth(el); break;
      case 'w:gridSpan': { const n = int(val); if (n !== undefined) p.gridSpan = n; break; }
      case 'w:hMerge': p.hMerge = val === 'restart' ? 'restart' : 'continue'; break;
      case 'w:vMerge': p.vMerge = val === 'restart' ? 'restart' : 'continue'; break;
      case 'w:tcBorders': p.tcBorders = readBorders(el); break;
      case 'w:shd': p.shd = readShading(el); break;
      case 'w:noWrap': p.noWrap = onOffVal(el); break;
      case 'w:tcMar': p.tcMar = readCellMar(el); break;
      case 'w:textDirection': if (val) p.textDirection = val; break;
      case 'w:tcFitText': p.tcFitText = onOffVal(el); break;
      case 'w:vAlign':
        if (val === 'top' || val === 'center' || val === 'bottom' || val === 'both') p.vAlign = val;
        break;
      case 'w:hideMark': p.hideMark = onOffVal(el); break;
    }
  }
  return p;
}
