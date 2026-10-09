/**
 * Engine de gráfico DrawingML — parse de `<c:chartSpace>` + paint em canvas.
 *
 * Cobre os tipos do showcase do usuário (1:1 onde possível):
 *   - barChart (col/bar, clustered/stacked)
 *   - lineChart
 *   - pieChart / doughnutChart
 *   - scatterChart (placeholder — eixo de valor em X)
 *   - radarChart (placeholder)
 *
 * Princípio 1:1: o XML é o oráculo. Cores explícitas em `<c:ser><c:spPr><a:solidFill>` têm
 * prioridade sobre paleta default. Categorias e valores vêm dos `<c:numCache>` /
 * `<c:strCache>` (o XML guarda os valores pré-computados pelo Excel real — não
 * precisamos reavaliar a fórmula).
 */

import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { Theme } from './model.js';

export type ChartType = 'bar-col' | 'bar-row' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'area' | 'unknown';

export interface ChartSeries {
  name: string;
  values: number[];
  /** Cor explícita (`<c:spPr><a:solidFill>...`); ausente → paleta default. */
  color?: string;
  /** Marcadores visíveis (line/scatter): `<c:marker><c:symbol val>` != none. */
  marker?: boolean;
  /** Preenchimento da série resolvido com o tema (`<c:spPr>`): null = sem preenchimento. */
  fill?: string | null;
  /** Linha da série (`<c:spPr><a:ln>`): null = sem linha. */
  line?: string | null;
}

/** Texto de eixo/legenda (`<c:txPr>…<a:defRPr sz>`), resolvido com o tema. */
export interface ChartTextStyle { sizePt?: number; color?: string; font?: string }

/** Eixo (`<c:valAx>`/`<c:catAx>`): escala explícita, grade, exclusão e texto. */
export interface ChartAxis {
  min?: number;
  max?: number;
  majorUnit?: number;
  /** `<c:scaling><c:logBase val>`: escala LOGARÍTMICA nessa base (2..1000). */
  logBase?: number;
  /** `<c:majorGridlines>` presente. */
  grid: boolean;
  /** `<c:delete val="1">`: eixo oculto (sem rótulos). */
  deleted: boolean;
  text?: ChartTextStyle;
}

export interface ChartModel {
  title?: string;
  /** Tipo principal — em combos (bar+line no mesmo plotArea) vence o primeiro. */
  type: ChartType;
  /** Para combos: outros tipos por série (mesmo índice de `series`). */
  perSeriesType?: ChartType[];
  series: ChartSeries[];
  categories: string[];
  /** Paleta efetiva (accents do TEMA da apresentação; setada pelo caller). */
  palette?: string[];
  /** `<c:holeSize val>` do doughnut, fração 0..1 (default 0.75). */
  holeSize?: number;
  /** `<c:gapWidth val>` (%) do barChart (default 219 no app de referência). */
  gapWidth?: number;
  /** `<c:overlap val>` (%) do barChart (default -27). */
  overlap?: number;
  /** `<c:legend>` presente → posição (`b`, `r`, `t`, `l`; default b). */
  legendPos?: string;
  /** `<c:radarStyle val>`: standard (linhas) | filled | marker. */
  radarStyle?: string;
  /** Fundo da área do gráfico: null = sem preenchimento; ausente = branco (setado pelo caller). */
  bg?: string | null;
  /** Eixos lidos do XML (ausentes = comportamento default calibrado). */
  valAx?: ChartAxis;
  catAx?: ChartAxis;
  /** Texto da legenda (`<c:legend><c:txPr>`). */
  legendText?: ChartTextStyle;
}

/** Paleta de fallback (Office padrão). Usada quando a série não traz spPr. */
const DEFAULT_PALETTE = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B',
];

/** Parse de `<c:chartSpace>` → ChartModel. */
export function parseChart(xml: string, theme?: Theme): ChartModel {
  const root = parseXml(xml);
  const chart = firstChild(root, 'c:chart');
  if (!chart) return { type: 'unknown', series: [], categories: [] };

  const out: ChartModel = { type: 'unknown', series: [], categories: [] };

  // título: <c:title><c:tx><c:rich> ... <a:r><a:t>...</a:t></a:r>
  const titleEl = firstChild(chart, 'c:title');
  if (titleEl) {
    const rich = deepFind(titleEl, 'c:rich');
    if (rich) {
      const t: string[] = [];
      walkText(rich, t);
      const title = t.join('');
      if (title) out.title = title;
    }
  }

  const plot = firstChild(chart, 'c:plotArea');
  if (!plot) return out;

  // legenda: presença + posição
  const legend = firstChild(chart, 'c:legend');
  if (legend) {
    const pos = firstChild(legend, 'c:legendPos');
    out.legendPos = pos?.attrs['val'] ?? 'b';
  }

  // Itera por todos os blocos *Chart no plotArea (suporta combo).
  const perSeriesTypes: ChartType[] = [];
  for (const block of childElements(plot)) {
    const t = chartTypeForBlock(block.name);
    if (t === 'unknown') continue;
    if (out.type === 'unknown') out.type = t;
    // parâmetros de layout do bloco
    const hole = firstChild(block, 'c:holeSize');
    if (hole?.attrs['val']) out.holeSize = parseInt(hole.attrs['val'], 10) / 100;
    const rs = firstChild(block, 'c:radarStyle');
    if (rs?.attrs['val']) out.radarStyle = rs.attrs['val'];
    const gap = firstChild(block, 'c:gapWidth');
    if (gap?.attrs['val']) out.gapWidth = parseInt(gap.attrs['val'], 10);
    const ov = firstChild(block, 'c:overlap');
    if (ov?.attrs['val']) out.overlap = parseInt(ov.attrs['val'], 10);
    for (const ser of childElements(block, 'c:ser')) {
      const series = parseSeries(ser, theme);
      if (series.values.length === 0) continue;
      out.series.push(series);
      perSeriesTypes.push(t);
      // categorias compartilhadas (1ª série que trouxer): cat OU xVal
      if (out.categories.length === 0) {
        const cats = readCategories(ser);
        if (cats.length) out.categories = cats;
      }
    }
  }
  // se há mais de um tipo de bloco → combo (anota perSeriesType)
  const uniqueTypes = new Set(perSeriesTypes);
  if (uniqueTypes.size > 1) out.perSeriesType = perSeriesTypes;
  // eixos e texto da legenda (escala/grade/rótulos do XML, com o tema)
  const valAx = firstChild(plot, 'c:valAx');
  const catAx = firstChild(plot, 'c:catAx') ?? firstChild(plot, 'c:dateAx');
  if (valAx) out.valAx = readAxis(valAx, theme);
  if (catAx) out.catAx = readAxis(catAx, theme);
  if (legend) {
    const lt = readTextStyle(firstChild(legend, 'c:txPr'), theme);
    if (lt) out.legendText = lt;
  }
  return out;
}

/** `<c:txPr>` → tamanho (pt), cor e fonte do 1º `<a:defRPr>` (fonte de tema resolvida). */
function readTextStyle(txPr: XmlElement | undefined, theme?: Theme): ChartTextStyle | undefined {
  const rpr = txPr ? deepFind(txPr, 'a:defRPr') : undefined;
  if (!rpr) return undefined;
  const st: ChartTextStyle = {};
  const sz = rpr.attrs['sz'];
  if (sz && /^\d+$/.test(sz)) st.sizePt = parseInt(sz, 10) / 100;
  const sf = firstChild(rpr, 'a:solidFill');
  const c = sf ? colorFromDml(childElements(sf)[0], theme ?? { colors: {} }) : undefined;
  if (c) st.color = c;
  let face = firstChild(rpr, 'a:latin')?.attrs['typeface'];
  if (face === '+mn-lt') face = theme?.fonts?.minor;
  else if (face === '+mj-lt') face = theme?.fonts?.major;
  if (face && !face.startsWith('+')) st.font = face;
  return st;
}

function readAxis(ax: XmlElement, theme?: Theme): ChartAxis {
  const num = (el: XmlElement | undefined, name: string): number | undefined => {
    const v = el ? firstChild(el, name)?.attrs['val'] : undefined;
    const n = v !== undefined ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  const del = firstChild(ax, 'c:delete')?.attrs['val'];
  const a: ChartAxis = { grid: !!firstChild(ax, 'c:majorGridlines'), deleted: del === '1' || del === 'true' };
  const sc = firstChild(ax, 'c:scaling');
  const min = num(sc, 'c:min'), max = num(sc, 'c:max'), unit = num(ax, 'c:majorUnit');
  if (min !== undefined) a.min = min;
  if (max !== undefined) a.max = max;
  if (unit !== undefined && unit > 0) a.majorUnit = unit;
  const lb = num(sc, 'c:logBase');
  if (lb !== undefined && lb >= 2 && lb <= 1000) a.logBase = lb;
  const t = readTextStyle(firstChild(ax, 'c:txPr'), theme);
  if (t) a.text = t;
  return a;
}

function chartTypeForBlock(name: string): ChartType {
  switch (name) {
    case 'c:barChart': return 'bar-col'; // refinado abaixo via barDir
    case 'c:lineChart': return 'line';
    case 'c:pieChart': return 'pie';
    case 'c:doughnutChart': return 'doughnut';
    case 'c:scatterChart': return 'scatter';
    case 'c:radarChart': return 'radar';
    case 'c:areaChart': return 'area';
    default: return 'unknown';
  }
}

function parseSeries(ser: XmlElement, theme?: Theme): ChartSeries {
  // nome: <c:tx><c:strRef><c:strCache><c:pt><c:v>NOME</c:v></c:pt></c:strCache></c:strRef></c:tx>
  let name = '';
  const tx = firstChild(ser, 'c:tx');
  if (tx) {
    const strRef = firstChild(tx, 'c:strRef');
    const cache = strRef ? firstChild(strRef, 'c:strCache') : undefined;
    if (cache) {
      const pt = firstChild(cache, 'c:pt');
      const v = pt ? firstChild(pt, 'c:v') : undefined;
      if (v) name = textContent(v).trim();
    } else {
      // <c:tx><c:v>NOME</c:v></c:tx>
      const v = firstChild(tx, 'c:v');
      if (v) name = textContent(v).trim();
    }
  }

  // valores: <c:val><c:numRef><c:numCache><c:pt idx><c:v>N</c:v></c:pt>...
  const values: number[] = [];
  const valBlock = firstChild(ser, 'c:val') ?? firstChild(ser, 'c:yVal');
  if (valBlock) collectNumPts(valBlock, values);

  // cor: <c:spPr><a:solidFill><a:srgbClr val="HEX"/></a:solidFill></c:spPr>
  let color: string | undefined;
  const spPr = firstChild(ser, 'c:spPr');
  if (spPr) {
    const fill = firstChild(spPr, 'a:solidFill');
    const clr = fill ? firstChild(fill, 'a:srgbClr') : undefined;
    if (clr?.attrs['val']) color = '#' + clr.attrs['val'];
  }

  const out: ChartSeries = { name, values };
  if (color) out.color = color;
  // cores de TEMA (schemeClr…) e "sem preenchimento"/"sem linha" explícitos
  if (spPr) {
    const th = theme ?? { colors: {} };
    if (firstChild(spPr, 'a:noFill')) out.fill = null;
    else {
      const sf = firstChild(spPr, 'a:solidFill');
      const c = sf ? colorFromDml(childElements(sf)[0], th) : undefined;
      if (c) { out.fill = c; out.color = c; }
    }
    const ln = firstChild(spPr, 'a:ln');
    if (ln) {
      if (firstChild(ln, 'a:noFill')) out.line = null;
      else {
        const lf = firstChild(ln, 'a:solidFill');
        const c = lf ? colorFromDml(childElements(lf)[0], th) : undefined;
        if (c) out.line = c;
      }
    }
  }
  // marcadores (line/scatter): <c:marker><c:symbol val="none"/> desliga
  const marker = firstChild(ser, 'c:marker');
  if (marker) {
    const sym = firstChild(marker, 'c:symbol');
    out.marker = sym?.attrs['val'] !== 'none';
  }
  return out;
}

/** Teto de pontos por série/categorias (o Excel atual vai a ~1M; um gráfico de slide, centenas). */
const MAX_POINTS = 100_000;

/**
 * Índice válido de um `<c:pt idx>`: dentro do `<c:ptCount>` declarado (ou do
 * teto). `idx="100000000"` preenchia um array denso de 10⁸ e pintava 10⁸ barras.
 */
function ptLimit(cache: XmlElement): number {
  const n = parseInt(firstChild(cache, 'c:ptCount')?.attrs['val'] ?? '', 10);
  // ptCount ausente/errado (0 com pontos) não pode apagar dados reais: vale o maior
  const pts = childElements(cache, 'c:pt').length;
  return Math.min(MAX_POINTS, Math.max(pts, Number.isFinite(n) && n >= 0 ? n : 0));
}

function collectNumPts(block: XmlElement, out: number[]): void {
  const cache = deepFind(block, 'c:numCache');
  if (!cache) return;
  // pts vêm com `idx` — preencher por índice
  const limit = ptLimit(cache);
  const indexed: number[] = [];
  for (const pt of childElements(cache, 'c:pt')) {
    const idx = parseInt(pt.attrs['idx'] ?? '0', 10);
    if (!(idx >= 0 && idx < limit)) continue;
    const v = firstChild(pt, 'c:v');
    indexed[idx] = v ? parseFloat(textContent(v)) : NaN;
  }
  for (let i = 0; i < indexed.length; i++) out.push(Number.isFinite(indexed[i]!) ? indexed[i]! : 0);
}

function readCategories(ser: XmlElement): string[] {
  const cat = firstChild(ser, 'c:cat') ?? firstChild(ser, 'c:xVal');
  if (!cat) return [];
  const out: string[] = [];
  const strCache = deepFind(cat, 'c:strCache');
  if (strCache) {
    const limit = ptLimit(strCache);
    const indexed: string[] = [];
    for (const pt of childElements(strCache, 'c:pt')) {
      const idx = parseInt(pt.attrs['idx'] ?? '0', 10);
      if (!(idx >= 0 && idx < limit)) continue;
      const v = firstChild(pt, 'c:v');
      indexed[idx] = v ? textContent(v) : '';
    }
    for (let i = 0; i < indexed.length; i++) out.push(indexed[i] ?? '');
    return out;
  }
  // numérico (eixo numérico)
  const nums: number[] = [];
  collectNumPts(cat, nums);
  return nums.map((n) => String(n));
}

function deepFind(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === name) return c;
    const f = deepFind(c, name);
    if (f) return f;
  }
  return undefined;
}

function walkText(el: XmlElement, out: string[]): void {
  for (const c of el.children) {
    if (typeof c === 'string') { out.push(c); continue; }
    if (c.name === 'a:t') { out.push(textContent(c)); continue; }
    walkText(c, out);
  }
}

// ─────────────────────────── PAINT ───────────────────────────

/**
 * Desenha `chart` dentro do retângulo `(x, y, w, h)`. Branco no fundo. Título no
 * topo (se houver). Plot area = retângulo restante com margens internas.
 */
/**
 * Seleção de PARTES (animação de gráfico por série/categoria/elemento):
 * `bg` = fundo, título, grade, eixos e legenda; `data(s, c)` = marca da série
 * `s`, categoria `c` (null = nenhuma).
 */
export interface ChartSel {
  bg: boolean;
  data: ((s: number, c: number) => boolean) | null;
  /** Identidade estável da parte (cache da caixa entre quadros). */
  key?: string;
}
const ALL: ChartSel = { bg: true, data: () => true };

export interface ChartBox { x: number; y: number; w: number; h: number }
const boundsCache = new WeakMap<ChartModel, Map<string, ChartBox | null>>();

/**
 * Caixa (px) do que a seleção `sel` desenha — a área de uma PARTE do gráfico
 * animado por partes (o app revela/move cada parte na caixa das próprias
 * marcas). Mede pintando num contexto que só registra limites. null = a
 * seleção não desenha nada.
 */
export function chartPartBounds(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt: number | undefined, sel: ChartSel): ChartBox | null {
  const ck = sel.key !== undefined ? `${sel.key}@${x.toFixed(2)},${y.toFixed(2)},${w.toFixed(2)},${h.toFixed(2)},${pxPerPt ?? ''}` : undefined;
  let cache = boundsCache.get(chart);
  if (ck !== undefined && cache?.has(ck)) return cache.get(ck)!;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let path: [number, number][] = [];
  let lw = 1;
  const add = (px: number, py: number, pad = 0): void => {
    x0 = Math.min(x0, px - pad); y0 = Math.min(y0, py - pad);
    x1 = Math.max(x1, px + pad); y1 = Math.max(y1, py + pad);
  };
  const flush = (pad: number): void => { for (const [px, py] of path) add(px, py, pad); };
  // arco: extremos + pontos cardeais dentro do intervalo
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): void => {
    let s = a0, e = a1;
    if (ccw) [s, e] = [a1, a0];
    while (e < s) e += 2 * Math.PI;
    if (e - s >= 2 * Math.PI - 1e-9) { path.push([cx - r, cy - r], [cx + r, cy + r]); return; }
    path.push([cx + r * Math.cos(s), cy + r * Math.sin(s)], [cx + r * Math.cos(e), cy + r * Math.sin(e)]);
    for (let k = Math.ceil(s / (Math.PI / 2)); k * (Math.PI / 2) <= e; k++) {
      const a = k * (Math.PI / 2);
      path.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  const text = (s: string, px: number, py: number): void => {
    const tw = ctx.measureText(s).width;
    const fs = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '10');
    const al = ctx.textAlign, bl = ctx.textBaseline;
    const left = al === 'center' ? px - tw / 2 : al === 'right' || al === 'end' ? px - tw : px;
    const top = bl === 'top' || bl === 'hanging' ? py : bl === 'middle' ? py - fs / 2 : bl === 'bottom' || bl === 'ideographic' ? py - fs : py - fs * 0.8;
    add(left, top); add(left + tw, top + fs);
  };
  const rec = new Proxy(ctx, {
    get(t, k) {
      switch (k) {
        case 'fillRect': return (a: number, b: number, c: number, d: number) => { add(a, b); add(a + c, b + d); };
        case 'strokeRect': return (a: number, b: number, c: number, d: number) => { add(a, b, lw / 2); add(a + c, b + d, lw / 2); };
        case 'beginPath': return () => { path = []; };
        case 'moveTo': case 'lineTo': return (a: number, b: number) => { path.push([a, b]); };
        case 'arc': return arc;
        case 'closePath': return () => undefined;
        case 'fill': return () => flush(0);
        case 'stroke': return () => flush(lw / 2);
        case 'fillText': return text;
        default: {
          const v = Reflect.get(t, k) as unknown;
          return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
        }
      }
    },
    set(t, k, v) {
      if (k === 'lineWidth') lw = Number(v) || 0;
      return Reflect.set(t, k, v);
    },
  });
  ctx.save();
  try { paintChart(rec, chart, x, y, w, h, pxPerPt, undefined, true, sel); } finally { ctx.restore(); }
  const box = x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  if (ck !== undefined) {
    if (!cache) boundsCache.set(chart, cache = new Map());
    cache.set(ck, box);
  }
  return box;
}
let SEL: ChartSel = ALL;
const showBg = (): boolean => SEL.bg;
const showData = (s: number, c: number): boolean => !!SEL.data && SEL.data(s, c);

export function paintChart(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt?: number, frameBorder?: string, sliceBorder = true, sel?: ChartSel): void {
  SEL = sel ?? ALL;
  CUR = chart;
  PPT = pxPerPt ?? Math.max(0.8, h / 360);
  try { paintChartInner(ctx, chart, x, y, w, h, pxPerPt, frameBorder, sliceBorder); } finally { SEL = ALL; CUR = null; }
}

/** Gráfico em pintura (eixos/texto lidos do XML) e px por ponto. */
let CUR: ChartModel | null = null;
let PPT = 1.333;
const DEFAULT_TEXT = '#595959';
/** Fonte CSS de rótulo: a do XML (se houver) antes da cadeia default. */
function labelFont(px: number, st?: ChartTextStyle): string {
  return `${px}px ${st?.font ? `"${st.font}", ` : ''}Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
}
/** Tamanho (px) do rótulo: o `sz` do XML, ou o default calibrado. */
function labelSize(st: ChartTextStyle | undefined, fallbackPx: number): number {
  return st?.sizePt ? st.sizePt * PPT : fallbackPx;
}
/** Passo {1,2,5}·10^k com ≤10 divisões numa faixa fixa. */
function niceStep(span: number): number {
  let mag = Math.pow(10, Math.floor(Math.log10(Math.max(span, 1e-9) / 10)));
  for (let k = 0; k < 6; k++, mag *= 10) for (const f of [1, 2, 5]) if (span / (f * mag) <= 10) return f * mag;
  return span / 10;
}
/** Escala de um eixo de valores: faixa + passo (linear) ou base (logarítmica). */
interface Ticks { lo: number; hi: number; step: number; log?: number }

/** Teto de marcas por eixo: `majorUnit` minúsculo (1e-6 em dados na casa dos milhares) eram bilhões de iterações. */
const MAX_TICKS = 1000;

/** Valores das marcas do eixo (no máximo MAX_TICKS). */
function tickValues(t: Ticks): number[] {
  const out: number[] = [];
  if (t.log) {
    for (let v = t.lo; v <= t.hi * (1 + 1e-9) && out.length < MAX_TICKS; v *= t.log) out.push(v);
    return out;
  }
  if (!(t.step > 0) || !Number.isFinite(t.lo) || !Number.isFinite(t.hi)) return out;
  // por índice (não `v += step`): sem acúmulo de erro nem laço sem fim
  const n = Math.min(MAX_TICKS, Math.floor((t.hi - t.lo) / t.step + 1e-9));
  for (let i = 0; i <= n; i++) out.push(t.lo + i * t.step);
  return out;
}

/** Posição 0..1 do valor no eixo (log: valores ≤ 0 ficam na base). */
function axisFrac(t: Ticks, v: number): number {
  if (t.log) {
    if (!(v > 0)) return 0;
    return (Math.log(v) - Math.log(t.lo)) / (Math.log(t.hi) - Math.log(t.lo));
  }
  return (v - t.lo) / (t.hi - t.lo);
}

/** Linha de base das barras/áreas: o ZERO (preso à faixa); no eixo log, a base. */
function axisBase(t: Ticks): number {
  return t.log ? t.lo : Math.max(t.lo, Math.min(t.hi, 0));
}

/** Ticks do eixo de valores: escala/unidade explícitas do XML vencem o automático. */
function axisTicks(min: number, max: number): Ticks {
  const t = niceTicks(min, max);
  const ax = CUR?.valAx;
  if (ax?.logBase) {
    // logarítmico: potências da base que cobrem os dados POSITIVOS (o app ignora ≤ 0)
    const b = ax.logBase;
    let pmin = Infinity, pmax = 0;
    for (const s of CUR?.series ?? []) for (const v of s.values) { if (v > 0) { pmin = Math.min(pmin, v); pmax = Math.max(pmax, v); } }
    if (!Number.isFinite(pmin)) { pmin = 1; pmax = b; }
    const lo = ax.min !== undefined && ax.min > 0 ? ax.min : b ** Math.floor(Math.log(pmin) / Math.log(b) + 1e-9);
    let hi = ax.max !== undefined && ax.max > lo ? ax.max : b ** Math.ceil(Math.log(pmax) / Math.log(b) - 1e-9);
    if (!(hi > lo)) hi = lo * b;
    return { lo, hi, step: 0, log: b };
  }
  if (!ax || (ax.min === undefined && ax.max === undefined && ax.majorUnit === undefined)) return t;
  const lo = ax.min ?? t.lo, hi = ax.max ?? t.hi;
  if (!(hi > lo)) return t;
  let step = ax.majorUnit ?? (ax.min === undefined && ax.max === undefined ? t.step : niceStep(hi - lo));
  if ((hi - lo) / step > MAX_TICKS) step = niceStep(hi - lo); // unidade absurda: escala automática
  return { lo, hi, step };
}

function paintChartInner(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt?: number, frameBorder?: string, sliceBorder = true): void {
  // fundo: branco por padrão; `<c:spPr><a:noFill>` do chartSpace = transparente.
  // Moldura: o host decide — o Excel desenha borda cinza clara em charts
  // embutidos; o PowerPoint não (frameBorder=undef).
  const bg = chart.bg === undefined ? '#ffffff' : chart.bg;
  if (bg && showBg()) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
  }
  if (frameBorder && showBg()) {
    ctx.strokeStyle = frameBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // tipografia em PONTOS do slide (título ~15.5pt, eixos/legenda 10pt no app
  // de referência). Sem pxPerPt (chamador legado), estima pela altura do frame.
  const ppt = pxPerPt ?? Math.max(0.8, h / 360);
  const u = ppt / 1.333; // fator para paddings (1pt ≈ 1.33px @96dpi)
  const titlePx = 15.5 * ppt;
  const labelPx = 10 * ppt;

  let plotY = y + 8 * u;
  let plotH = h - 16 * u;

  // título (Aptos regular #595959 centrado) — offsets MEDIDOS no app de
  // referência: topo 16u, gap até o plot 20u, margem inferior 8u.
  if (chart.title) {
    ctx.fillStyle = '#595959';
    ctx.font = `${titlePx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (showBg()) ctx.fillText(chart.title, x + w / 2, y + 16 * u);
    plotY = y + titlePx + 36 * u;
    plotH = h - (titlePx + 44 * u);
  }

  // legenda: presente quando o XML declara <c:legend>. Posições: b/t
  // (horizontal, centrada) e r (VERTICAL empilhada — default do Excel).
  const showLegend = chart.legendPos !== undefined;
  const legendRight = chart.legendPos === 'r';
  // legenda: cor/fonte do XML, tamanho calibrado (o layout do plot conta com ele)
  const legendPx = labelPx;
  const legendH = showLegend && !legendRight ? legendPx + 20 * u : 0;
  const legendTop = chart.legendPos === 't';
  const legendW = legendRight ? legendRightWidth(ctx, chart, legendPx) : 0;

  const px = x + 8 * u;
  const py = plotY + (legendTop ? legendH : 0);
  const pw = w - 16 * u - legendW;
  const ph = plotH - legendH;

  switch (chart.type) {
    case 'bar-col':
      paintBars(ctx, chart, px, py, pw, ph, 'col', labelPx);
      break;
    case 'bar-row':
      paintBars(ctx, chart, px, py, pw, ph, 'row', labelPx);
      break;
    case 'line':
      paintLines(ctx, chart, px, py, pw, ph, labelPx, false);
      break;
    case 'area':
      paintLines(ctx, chart, px, py, pw, ph, labelPx, true);
      break;
    case 'pie':
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0, sliceBorder);
      break;
    case 'doughnut':
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, chart.holeSize ?? 0.75, sliceBorder);
      break;
    case 'scatter':
      paintScatter(ctx, chart, px, py, pw, ph, labelPx);
      break;
    case 'radar':
      paintRadar(ctx, chart, px, py, pw, ph, labelPx);
      break;
    default:
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Gráfico (${chart.type}) — render em breve`, x + w / 2, y + h / 2);
  }

  if (showLegend && showBg()) {
    if (legendRight) {
      paintLegendRight(ctx, chart, px + pw + 4 * u, py, legendW, ph, legendPx);
    } else {
      const ly = legendTop ? plotY : py + ph + 6 * u;
      paintLegend(ctx, chart, px, ly, pw, legendH, legendPx);
    }
  }
}

/** Entradas da legenda: pizza/rosca listam CATEGORIAS (cor por fatia); os demais tipos, séries. */
function legendEntries(chart: ChartModel): { label: string; color: string }[] {
  const pal = paletteOf(chart);
  return chart.type === 'pie' || chart.type === 'doughnut'
    ? chart.categories.map((c, i) => ({ label: c, color: pal[i % pal.length]! }))
    : chart.series.map((s, i) => ({ label: s.name || `Série ${i + 1}`, color: colorOf(chart, i) }));
}

/** Largura necessária da legenda vertical à direita (marcador + maior rótulo). */
function legendRightWidth(ctx: CanvasRenderingContext2D, chart: ChartModel, labelPx: number): number {
  ctx.font = labelFont(labelPx, chart.legendText);
  let maxW = 0;
  for (const e of legendEntries(chart)) maxW = Math.max(maxW, ctx.measureText(e.label).width);
  return maxW + labelPx * 1.6;
}

/** Legenda VERTICAL à direita (default do Excel): entradas empilhadas, centradas. */
function paintLegendRight(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number): void {
  const entries = legendEntries(chart);
  if (!entries.length) return;
  ctx.font = labelFont(labelPx, chart.legendText);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const lineH = labelPx * 1.7;
  const sq = labelPx * 0.65;
  let cy = y + (h - entries.length * lineH) / 2 + lineH / 2;
  for (const e of entries) {
    ctx.fillStyle = e.color;
    ctx.fillRect(x, cy - sq / 2, sq, sq);
    ctx.fillStyle = chart.legendText?.color ?? DEFAULT_TEXT;
    ctx.fillText(e.label, x + sq + labelPx * 0.4, cy);
    cy += lineH;
  }
}

function paletteOf(chart: ChartModel): string[] {
  return chart.palette && chart.palette.length ? chart.palette : DEFAULT_PALETTE;
}

function colorOf(chart: ChartModel, i: number): string {
  const pal = paletteOf(chart);
  const s = chart.series[i];
  if (s && typeof s.fill === 'string') return s.fill;
  return s?.color ?? pal[i % pal.length]!;
}

function valueRange(chart: ChartModel): { min: number; max: number } {
  let min = 0, max = 0;
  for (const s of chart.series) for (const v of s.values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) max = min + 1;
  return { min, max };
}

/**
 * Ticks "bonitos" do eixo de valores com o headroom do app de referência:
 * o máximo do eixo é o primeiro tick ≥ 1.05·max (dados até 5 ⇒ eixo até 6).
 */
function niceTicks(min: number, max: number): { lo: number; hi: number; step: number } {
  // regra do app de referência: MENOR passo {1,2,5}·10^k com ≤10 divisões
  // (max 410 ⇒ passo 50/eixo 450; max 5 ⇒ passo 1/eixo 6 — ambos medidos)
  const minAdj = min < 0 ? min * 1.05 : min;
  const maxAdj = max > 0 ? max * 1.05 : max;
  const span = Math.max(maxAdj - minAdj, 1e-9);
  let mag = Math.pow(10, Math.floor(Math.log10(span / 10)));
  for (let k = 0; k < 4; k++) {
    for (const f of [1, 2, 5]) {
      const step = f * mag;
      const lo = Math.floor(minAdj / step) * step;
      const hi = Math.ceil(maxAdj / step) * step;
      if ((hi - lo) / step <= 10) return { lo, hi, step };
    }
    mag *= 10;
  }
  const step = span;
  return { lo: Math.floor(minAdj / step) * step, hi: Math.ceil(maxAdj / step) * step, step };
}

function paintBars(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, dir: 'col' | 'row', labelPx: number): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats || chart.series.length === 0) return;
  const { min, max } = valueRange(chart);
  const t = axisTicks(min, max);
  const axW = labelPx * 2.0, axH = labelPx * 2.4;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, t);
  // agrupamento com gapWidth/overlap do XML (defaults do app: 219 / -27)
  const gap = (chart.gapWidth ?? 219) / 100;
  const ov = (chart.overlap ?? (chart.series.length > 1 ? -27 : 0)) / 100;
  const nSer = chart.series.length;
  const groupW = (plotR - plotL) / cats;
  const barW = groupW / ((nSer - 1) * (1 - ov) + 1 + gap);
  const span = barW * ((nSer - 1) * (1 - ov) + 1);
  // barras partem do ZERO (negativos descem dele), não do fundo do eixo
  const yOf = (v: number): number => plotB - Math.max(0, Math.min(1, axisFrac(t, v))) * (plotB - plotT);
  const y0 = yOf(axisBase(t));
  for (let s = 0; s < nSer; s++) {
    if (chart.series[s]!.fill === null) continue; // série sem preenchimento
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    for (let i = 0; i < cats; i++) {
      if (!showData(s, i)) continue;
      const v = vals[i] ?? 0;
      const gx = plotL + i * groupW + (groupW - span) / 2;
      const xBar = gx + s * barW * (1 - ov);
      const yv = yOf(v);
      if (dir === 'col') ctx.fillRect(xBar, Math.min(yv, y0), barW, Math.abs(y0 - yv));
      else ctx.fillRect(plotL, xBar, Math.abs(y0 - yv), barW); // row (placeholder)
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}

function paintLines(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number, area: boolean): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats) return;
  const { min, max } = valueRange(chart);
  const t = axisTicks(min, max);
  const axW = labelPx * 2.0, axH = labelPx * 2.4;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, t);
  // categoria de linha: pontos CENTRADOS nas bandas (como o app de referência)
  const stepX = (plotR - plotL) / cats;
  const xAt = (i: number): number => plotL + stepX * (i + 0.5);
  const yAt = (v: number): number => plotB - axisFrac(t, v) * (plotB - plotT);
  const yBase = yAt(axisBase(t)); // área fecha no zero (com negativos, não no fundo do eixo)
  for (let s = 0; s < chart.series.length; s++) {
    const col = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    const on = Array.from({ length: cats }, (_, i) => showData(s, i));
    if (!on.some(Boolean)) continue;
    if (area) {
      ctx.fillStyle = col;
      ctx.globalAlpha = ctx.globalAlpha * 1; // área sólida (referência não usa alpha)
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(vals[0] ?? 0));
      for (let i = 1; i < cats; i++) ctx.lineTo(xAt(i), yAt(vals[i] ?? 0));
      ctx.lineTo(xAt(cats - 1), yBase);
      ctx.lineTo(xAt(0), yBase);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    const ln = chart.series[s]!.line;
    if (ln === null) continue; // série sem linha
    ctx.strokeStyle = typeof ln === 'string' ? ln : col;
    ctx.fillStyle = col;
    ctx.lineWidth = Math.max(2, labelPx / 6);
    ctx.beginPath();
    // por categoria/elemento: só os segmentos que CHEGAM às categorias da parte
    for (let i = 0; i < cats; i++) {
      if (!on[i]) continue;
      const yp = yAt(vals[i] ?? 0);
      if (i > 0) { ctx.moveTo(xAt(i - 1), yAt(vals[i - 1] ?? 0)); ctx.lineTo(xAt(i), yp); } else ctx.moveTo(xAt(i), yp);
    }
    ctx.stroke();
    if (chart.series[s]!.marker) {
      for (let i = 0; i < cats; i++) {
        if (!on[i]) continue;
        ctx.beginPath(); ctx.arc(xAt(i), yAt(vals[i] ?? 0), labelPx / 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}

function paintPieOrDoughnut(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, holeFrac: number, sliceBorder = true): void {
  const s0 = chart.series[0];
  if (!s0) return;
  const total = s0.values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return;
  const pal = paletteOf(chart);
  // centro/raio MEDIDOS no app de referência (pizza usa ~97% do plot e fica
  // ~6px acima do centro geométrico — o rótulo de eixo não existe aqui)
  const cx = x + w / 2, cy = y + h / 2 - h * 0.012;
  // gráfico pequeno com título/legenda deixa o plot NEGATIVO: arc() com raio < 0 lança
  const radius = (Math.min(w, h) / 2) * 0.97;
  if (!(radius > 0)) return;
  let a0 = -Math.PI / 2;
  for (let i = 0; i < s0.values.length; i++) {
    const v = Math.max(0, s0.values[i] ?? 0);
    if (v === 0) continue;
    const a1 = a0 + (v / total) * Math.PI * 2;
    if (!showData(0, i)) { a0 = a1; continue; }
    // pizza/rosca variam a cor POR PONTO (fatia), não por série
    ctx.fillStyle = pal[i % pal.length]!;
    ctx.beginPath();
    if (holeFrac > 0) {
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.arc(cx, cy, radius * holeFrac, a1, a0, true);
      ctx.closePath();
    } else {
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.closePath();
    }
    ctx.fill();
    // separador branco entre fatias: default do PowerPoint; o Excel NAO
    // desenha (series sem <a:ln> explicito) — controlado pelo host
    if (sliceBorder) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, radius / 90);
      ctx.stroke();
    }
    a0 = a1;
  }
}

function paintScatter(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number): void {
  // Dispersão XY real: X vem de `<c:xVal>` (categories numéricas), Y dos values.
  const xs = chart.categories.map((c) => parseFloat(c)).filter((v) => Number.isFinite(v));
  const n = chart.series[0]?.values.length ?? 0;
  if (!n) return;
  let xMin = 0, xMax = 0;
  for (const v of xs) { if (v < xMin) xMin = v; if (v > xMax) xMax = v; }
  if (xMax === xMin) xMax = xMin + 1;
  const { min, max } = valueRange(chart);
  const tx = niceTicks(xMin, xMax);
  const ty = niceTicks(min, max);
  const axW = labelPx * 2.0, axH = labelPx * 2.4;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  // grid horizontal + VERTICAL (o app de referência desenha ambos no scatter)
  paintGrid(ctx, plotL, plotT, plotR, plotB, ty);
  ctx.strokeStyle = '#D9D9D9'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of showBg() ? tickValues(tx) : []) {
    const xx = plotL + ((v - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
    ctx.moveTo(Math.round(xx) + 0.5, plotT); ctx.lineTo(Math.round(xx) + 0.5, plotB);
  }
  ctx.stroke();
  for (let s = 0; s < chart.series.length; s++) {
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    for (let i = 0; i < n; i++) {
      if (!showData(s, i)) continue;
      const xv = xs[i] ?? i;
      const xp = plotL + ((xv - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
      const yp = plotB - (((vals[i] ?? 0) - ty.lo) / (ty.hi - ty.lo)) * (plotB - plotT);
      ctx.beginPath(); ctx.arc(xp, yp, labelPx / 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // eixo X numérico
  if (!showBg()) return;
  ctx.fillStyle = '#595959';
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const v of tickValues(tx)) {
    const xx = plotL + ((v - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
    ctx.fillText(formatVal(v), xx, plotB + labelPx * 0.35);
  }
  paintValueAxis(ctx, ty, plotL - labelPx * 0.9, plotT, plotB - plotT, labelPx);
}

function paintRadar(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number): void {
  const n = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!n) return;
  const { min, max } = valueRange(chart);
  const t = niceTicks(Math.min(0, min), max);
  const cx = x + w / 2, cy = y + h / 2;
  // reserva espaço para labels de categoria em volta
  const radius = Math.min(w, h) / 2 - labelPx * 2.4;
  const angleAt = (i: number): number => -Math.PI / 2 + i * (Math.PI * 2 / n);
  const rAt = (v: number): number => ((v - t.lo) / (t.hi - t.lo)) * radius;
  // anéis nos ticks (polígonos cinza-claro, como o app de referência)
  ctx.strokeStyle = '#D9D9D9'; ctx.lineWidth = 1;
  for (const v of showBg() ? tickValues(t).slice(1) : []) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = angleAt(i);
      const px = cx + Math.cos(a) * rAt(v);
      const py = cy + Math.sin(a) * rAt(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
  // labels de valor sobem pelo eixo vertical
  ctx.fillStyle = '#595959';
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of showBg() ? tickValues(t) : []) {
    ctx.fillText(formatVal(v), cx - labelPx * 0.4, cy - rAt(v));
  }
  // labels de categoria nos vértices externos
  for (let i = 0; i < n && showBg(); i++) {
    const a = angleAt(i);
    const px = cx + Math.cos(a) * (radius + labelPx * 0.9);
    const py = cy + Math.sin(a) * (radius + labelPx * 0.9);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
    ctx.textBaseline = Math.sin(a) < -0.3 ? 'bottom' : Math.sin(a) > 0.3 ? 'top' : 'middle';
    ctx.fillText(chart.categories[i] ?? String(i + 1), px, py);
  }
  // séries: LINHAS por default (radarStyle=filled preenche com alpha)
  const filled = chart.radarStyle === 'filled';
  for (let s = 0; s < chart.series.length; s++) {
    if (!Array.from({ length: n }, (_, i) => showData(s, i)).some(Boolean)) continue;
    const c = colorOf(chart, s);
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, labelPx / 6);
    ctx.beginPath();
    const vals = chart.series[s]!.values;
    for (let i = 0; i < n; i++) {
      const a = angleAt(i);
      const px = cx + Math.cos(a) * rAt(vals[i] ?? 0);
      const py = cy + Math.sin(a) * rAt(vals[i] ?? 0);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = c.length === 7 ? c + '40' : c;
      ctx.fill();
    }
    ctx.stroke();
  }
}

function paintGrid(ctx: CanvasRenderingContext2D, l: number, t: number, r: number, b: number, ticks: Ticks): void {
  if (!showBg()) return;
  if (CUR?.valAx && !CUR.valAx.grid) return; // sem <c:majorGridlines> no XML
  ctx.strokeStyle = '#D9D9D9'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of tickValues(ticks)) {
    const y = b - axisFrac(ticks, v) * (b - t);
    ctx.moveTo(l, Math.round(y) + 0.5); ctx.lineTo(r, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

function paintCategoryAxis(ctx: CanvasRenderingContext2D, cats: string[], l: number, b: number, w: number, labelPx: number): void {
  if (cats.length === 0 || !showBg()) return;
  const ax = CUR?.catAx;
  if (ax?.deleted) return;
  ctx.fillStyle = ax?.text?.color ?? DEFAULT_TEXT;
  ctx.font = labelFont(labelSize(ax?.text, labelPx), ax?.text);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const stepX = w / cats.length;
  for (let i = 0; i < cats.length; i++) {
    const text = cats[i] ?? String(i + 1);
    ctx.fillText(text, l + stepX * (i + 0.5), b + labelPx * 0.8);
  }
}

function paintValueAxis(ctx: CanvasRenderingContext2D, ticks: Ticks, xRight: number, y: number, h: number, labelPx: number): void {
  if (!showBg()) return;
  const ax = CUR?.valAx;
  if (ax?.deleted) return;
  ctx.fillStyle = ax?.text?.color ?? DEFAULT_TEXT;
  ctx.font = labelFont(labelSize(ax?.text, labelPx), ax?.text);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of tickValues(ticks)) {
    const yy = y + h - axisFrac(ticks, v) * h;
    ctx.fillText(formatVal(v), xRight, yy);
  }
}

function formatVal(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  if (Number.isInteger(v)) return String(v);
  // decimais com vírgula (pt-BR, como o app de referência exibe "0,5")
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/**
 * Legenda inferior CENTRADA (default do app de referência). Pizza/rosca listam
 * CATEGORIAS (cores por fatia); demais tipos listam séries.
 */
function paintLegend(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number): void {
  const entries = legendEntries(chart);
  if (!entries.length) return;
  ctx.font = labelFont(labelPx, chart.legendText);
  ctx.textBaseline = 'middle';
  const sq = labelPx * 0.7;
  const gapIn = sq * 0.5, gapOut = labelPx * 1.4;
  let total = 0;
  const widths = entries.map((e) => {
    const tw = ctx.measureText(e.label).width;
    total += sq + gapIn + tw + gapOut;
    return tw;
  });
  total -= gapOut;
  let cx = x + Math.max(0, (w - total) / 2);
  const cy = y + h / 2;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    ctx.fillStyle = e.color;
    ctx.fillRect(cx, cy - sq / 2, sq, sq);
    cx += sq + gapIn;
    ctx.fillStyle = chart.legendText?.color ?? DEFAULT_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(e.label, cx, cy);
    cx += widths[i]! + gapOut;
    if (cx > x + w) break;
  }
}
