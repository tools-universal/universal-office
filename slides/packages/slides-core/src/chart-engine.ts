/**
 * Gráficos do Slides: o motor é o compartilhado (`@universal-office/charts`,
 * o mesmo do Sheet). Aqui só a ponte — XML pelo parser do slides-core, cores
 * pelo `colorFromDml` do tema da apresentação (clrMap e modificadores do
 * PowerPoint), fontes pela pilha do componente — e um resumo do modelo para
 * quem só precisa saber tipo/título/séries.
 */
import { parseChartSpace, parsePaint, paintChartSpace, type ChartSpace, type ChartSel, type ChartImage, type XmlNode } from '@universal-office/charts';
import { parseXml, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { Theme, ImageRef } from './model.js';

export type { ChartSel, ChartImage };

export type ChartType = 'bar-col' | 'bar-row' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'area' | 'unknown';

export interface ChartSeries {
  name: string;
  values: number[];
  /** Cor da série (preenchimento sólido ou linha). */
  color?: string;
  /** Preenchimento sólido; null = sem preenchimento. */
  fill?: string | null;
  /** Linha sólida; null = sem linha. */
  line?: string | null;
}

export interface ChartTextStyle { sizePt?: number; color?: string; font?: string }
export interface ChartAxis { min?: number; max?: number; majorUnit?: number; logBase?: number; grid: boolean; deleted: boolean; text?: ChartTextStyle }

/** Gráfico parseado: o modelo completo (`space`) + resumo. */
export interface ChartModel {
  space: ChartSpace;
  type: ChartType;
  title?: string;
  series: ChartSeries[];
  categories: string[];
  legendPos?: string;
  valAx?: ChartAxis;
  catAx?: ChartAxis;
}

export interface ChartBox { x: number; y: number; w: number; h: number }

/** Tema Office padrão: gráficos sem tema (testes, XML solto). */
const FALLBACK: Record<string, string> = {
  accent1: '#4472C4', accent2: '#ED7D31', accent3: '#A5A5A5', accent4: '#FFC000', accent5: '#5B9BD5', accent6: '#70AD47',
  tx1: '#000000', bg1: '#FFFFFF', dk1: '#000000', lt1: '#FFFFFF', tx2: '#44546A', bg2: '#E7E6E6', dk2: '#44546A', lt2: '#E7E6E6',
};

/**
 * `images`: imagens dos `a:blipFill` do gráfico por r:id (`Shape.chartImages`)
 * — o modelo guarda a PARTE da imagem, que a pintura busca decodificada.
 */
export function parseChart(xml: string, theme?: Theme, images?: Record<string, ImageRef>): ChartModel {
  let root: XmlElement;
  try { root = parseXml(xml); } catch { root = { name: 'c:chartSpace', attrs: {}, children: [] }; }
  const th: Theme = { ...(theme ?? {}), colors: { ...FALLBACK, ...(theme?.colors ?? {}) } };
  const space = parseChartSpace(root as XmlNode, {
    color: (el) => colorFromDml(el as XmlElement, th),
    blip: (el) => {
      const rid = el.attrs['r:embed'] ?? el.attrs['embed'];
      return rid ? images?.[rid]?.part : undefined;
    },
    fonts: { ...(theme?.fonts?.minor ? { minor: theme.fonts.minor } : {}), ...(theme?.fonts?.major ? { major: theme.fonts.major } : {}) },
    fillStyle: (idx, ph) => {
      const el = theme?.fillStyles?.[idx - 1];
      if (!el) return undefined;
      const tp: Theme = { ...th, colors: { ...th.colors, phClr: ph } };
      return parsePaint({ name: 'w', attrs: {}, children: [el] } as unknown as XmlNode, (e) => colorFromDml(e as XmlElement, tp));
    },
  });
  return summarize(space);
}

function summarize(space: ChartSpace): ChartModel {
  const g0 = space.groups[0];
  const type: ChartType = !g0 ? 'unknown' : g0.kind === 'bar' ? (g0.dir === 'bar' ? 'bar-row' : 'bar-col')
    : g0.kind === 'line' || g0.kind === 'stock' ? 'line' : g0.kind === 'ofPie' ? 'pie'
      : (['pie', 'doughnut', 'scatter', 'radar', 'area'] as const).includes(g0.kind as 'pie') ? (g0.kind as ChartType) : 'unknown';
  const series: ChartSeries[] = [];
  let categories: string[] = [];
  for (const g of space.groups) for (const s of g.series) {
    const cs: ChartSeries = { name: s.name, values: s.values.map((v) => v ?? 0) };
    const f = s.sp.fill, l = s.sp.line?.paint;
    if (f?.kind === 'none') cs.fill = null; else if (f?.kind === 'solid') { cs.fill = f.color; cs.color = f.color; }
    if (l?.kind === 'none') cs.line = null; else if (l?.kind === 'solid') { cs.line = l.color; cs.color ??= l.color; }
    series.push(cs);
    if (!categories.length) categories = s.cats ?? (s.catNums ?? s.xVals ?? []).map((v) => (v === null ? '' : String(v)));
  }
  const title = space.title?.paras?.map((p) => p.runs.map((r) => r.text).join('')).join('\n') || space.title?.text;
  const ax = (k: 'val' | 'cat'): ChartAxis | undefined => {
    const a = space.axes.find((x) => (k === 'val' ? x.kind === 'val' : x.kind !== 'val') && !x.id.startsWith('__'));
    if (!a) return undefined;
    const out: ChartAxis = { grid: !!a.majorGrid, deleted: a.deleted };
    if (a.min !== undefined) out.min = a.min;
    if (a.max !== undefined) out.max = a.max;
    if (a.majorUnit !== undefined) out.majorUnit = a.majorUnit;
    if (a.logBase !== undefined) out.logBase = a.logBase;
    const t = a.txPr;
    if (t.sz !== undefined || t.color !== undefined || t.font !== undefined) out.text = { ...(t.sz !== undefined ? { sizePt: t.sz } : {}), ...(t.color ? { color: t.color } : {}), ...(t.font ? { font: t.font } : {}) };
    return out;
  };
  const m: ChartModel = { space, type, series, categories };
  if (title) m.title = title;
  if (space.legend) m.legendPos = space.legend.pos;
  const va = ax('val'), ca = ax('cat');
  if (va) m.valAx = va;
  if (ca) m.catAx = ca;
  return m;
}

/** Pilha CSS de fonte (o componente injeta o resolvedor dos apps). */
let chartFontStack: ((family: string, bold?: boolean, italic?: boolean) => string) | undefined;
export function setChartFontStack(f: ((family: string, bold?: boolean, italic?: boolean) => string) | undefined): void { chartFontStack = f; }

/**
 * Desenha o gráfico no retângulo. PowerPoint: área sem `spPr` transparente e
 * sem moldura. `frameBorder` (Excel) desenha a moldura default. `image`:
 * parte → imagem decodificada dos preenchimentos de imagem (`a:blipFill`).
 */
export function paintChart(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt?: number, frameBorder?: string, _sliceBorder = true, sel?: ChartSel, image?: (part: string) => ChartImage | undefined): void {
  paintChartSpace(ctx, chart.space, x, y, w, h, {
    pxPerPt: pxPerPt ?? Math.max(0.8, h / 360),
    defaultAreaFill: frameBorder ? 'bg1' : 'none',
    ...(frameBorder ? { defaultAreaLine: frameBorder } : {}),
    cssFont: chartFontStack ?? ((f) => `'${f}', 'Aptos', Calibri, 'Liberation Sans', Arial, sans-serif`),
    ...(sel ? { sel } : {}),
    ...(image ? { image } : {}),
  });
}

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
  let tx = 0, ty = 0;
  const add = (px: number, py: number, pad = 0): void => {
    px += tx; py += ty;
    x0 = Math.min(x0, px - pad); y0 = Math.min(y0, py - pad);
    x1 = Math.max(x1, px + pad); y1 = Math.max(y1, py + pad);
  };
  const flush = (pad: number): void => { for (const [px, py] of path) add(px, py, pad); };
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): void => {
    let s = a0, e = a1;
    if (ccw) [s, e] = [a1, a0];
    while (e < s) e += 2 * Math.PI;
    if (e - s >= 2 * Math.PI - 1e-9) { path.push([cx - r, cy - r], [cx + r, cy + r]); return; }
    path.push([cx + r * Math.cos(s), cy + r * Math.sin(s)], [cx + r * Math.cos(e), cy + r * Math.sin(e)]);
    for (let k = Math.ceil(s / (Math.PI / 2)); k * (Math.PI / 2) <= e; k++) path.push([cx + r * Math.cos(k * Math.PI / 2), cy + r * Math.sin(k * Math.PI / 2)]);
  };
  const stack: [number, number][] = [];
  const rec = new Proxy(ctx, {
    get(t, k) {
      switch (k) {
        case 'fillRect': return (a: number, b: number, c: number, d: number) => { add(a, b); add(a + c, b + d); };
        case 'strokeRect': return (a: number, b: number, c: number, d: number) => { add(a, b, lw / 2); add(a + c, b + d, lw / 2); };
        case 'beginPath': return () => { path = []; };
        case 'moveTo': case 'lineTo': return (a: number, b: number) => { path.push([a, b]); };
        case 'bezierCurveTo': return (_a: number, _b: number, _c: number, _d: number, e: number, f: number) => { path.push([e, f]); };
        case 'rect': return (a: number, b: number, c: number, d: number) => { path.push([a, b], [a + c, b + d]); };
        case 'arc': return arc;
        case 'ellipse': return (cx: number, cy: number, rx: number, ry: number, _r: number, a0: number, a1: number, ccw?: boolean) => { arc(cx, cy, Math.max(rx, ry), a0, a1, ccw); };
        case 'closePath': return () => undefined;
        case 'fill': return () => flush(0);
        case 'stroke': return () => flush(lw / 2);
        case 'fillText': case 'strokeText': return () => undefined;
        case 'save': return () => { stack.push([tx, ty]); (t as CanvasRenderingContext2D).save(); };
        case 'restore': return () => { const p = stack.pop(); if (p) [tx, ty] = p; (t as CanvasRenderingContext2D).restore(); };
        case 'translate': return (a: number, b: number) => { tx += a; ty += b; };
        case 'rotate': return () => undefined;
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
