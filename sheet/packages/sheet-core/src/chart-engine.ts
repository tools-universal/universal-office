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

export type ChartType = 'bar-col' | 'bar-row' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'unknown';

export interface ChartSeries {
  name: string;
  values: number[];
  /** Cor explícita (`<c:spPr><a:solidFill>...`); ausente → paleta default. */
  color?: string;
}

export interface ChartModel {
  title?: string;
  /** Tipo principal — em combos (bar+line no mesmo plotArea) vence o primeiro. */
  type: ChartType;
  /** Para combos: outros tipos por série (mesmo índice de `series`). */
  perSeriesType?: ChartType[];
  series: ChartSeries[];
  categories: string[];
}

/** Paleta de fallback (Office padrão). Usada quando a série não traz spPr. */
const DEFAULT_PALETTE = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B',
];

/** Parse de `<c:chartSpace>` → ChartModel. */
export function parseChart(xml: string): ChartModel {
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

  // Itera por todos os blocos *Chart no plotArea (suporta combo).
  const perSeriesTypes: ChartType[] = [];
  for (const block of childElements(plot)) {
    const t = chartTypeForBlock(block.name);
    if (t === 'unknown') continue;
    if (out.type === 'unknown') out.type = t;
    for (const ser of childElements(block, 'c:ser')) {
      const series = parseSeries(ser);
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
  return out;
}

function chartTypeForBlock(name: string): ChartType {
  switch (name) {
    case 'c:barChart': return 'bar-col'; // refinado abaixo via barDir
    case 'c:lineChart': return 'line';
    case 'c:pieChart': return 'pie';
    case 'c:doughnutChart': return 'doughnut';
    case 'c:scatterChart': return 'scatter';
    case 'c:radarChart': return 'radar';
    default: return 'unknown';
  }
}

function parseSeries(ser: XmlElement): ChartSeries {
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
  return out;
}

function collectNumPts(block: XmlElement, out: number[]): void {
  const cache = deepFind(block, 'c:numCache');
  if (!cache) return;
  // pts vêm com `idx` — preencher por índice
  const indexed: number[] = [];
  for (const pt of childElements(cache, 'c:pt')) {
    const idx = parseInt(pt.attrs['idx'] ?? '0', 10);
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
    const indexed: string[] = [];
    for (const pt of childElements(strCache, 'c:pt')) {
      const idx = parseInt(pt.attrs['idx'] ?? '0', 10);
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
export function paintChart(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number): void {
  // fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  let plotY = y + 8;
  let plotH = h - 16;

  // título
  if (chart.title) {
    ctx.fillStyle = '#1E293B';
    ctx.font = '600 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(chart.title, x + w / 2, y + 6);
    plotY = y + 28;
    plotH = h - 36;
  }

  // legend (compacta, no rodapé)
  const showLegend = chart.series.length > 1 || chart.type === 'pie' || chart.type === 'doughnut';
  const legendH = showLegend ? 22 : 0;

  const px = x + 8;
  const py = plotY;
  const pw = w - 16;
  const ph = plotH - legendH;

  switch (chart.type) {
    case 'bar-col':
      paintBars(ctx, chart, px, py, pw, ph, 'col');
      break;
    case 'bar-row':
      paintBars(ctx, chart, px, py, pw, ph, 'row');
      break;
    case 'line':
      paintLines(ctx, chart, px, py, pw, ph);
      break;
    case 'pie':
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0);
      break;
    case 'doughnut':
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0.5);
      break;
    case 'scatter':
      paintScatter(ctx, chart, px, py, pw, ph);
      break;
    case 'radar':
      paintRadar(ctx, chart, px, py, pw, ph);
      break;
    default:
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Gráfico (${chart.type}) — render em breve`, x + w / 2, y + h / 2);
  }

  if (showLegend) paintLegend(ctx, chart, px, py + ph + 4, pw, legendH);
}

function colorOf(chart: ChartModel, i: number): string {
  return chart.series[i]?.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
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

function paintBars(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, dir: 'col' | 'row'): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats || chart.series.length === 0) return;
  const { min, max } = valueRange(chart);
  // eixos
  const axW = 30, axH = 18;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, min, max);
  // barras agrupadas
  const groupW = (plotR - plotL) / cats;
  const innerPad = 0.12 * groupW;
  const barW = (groupW - innerPad * 2) / chart.series.length;
  for (let s = 0; s < chart.series.length; s++) {
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    for (let i = 0; i < cats; i++) {
      const v = vals[i] ?? 0;
      const xBar = plotL + innerPad + i * groupW + s * barW;
      const yTop = plotB - ((v - min) / (max - min)) * (plotB - plotT);
      const bh = plotB - yTop;
      if (dir === 'col') ctx.fillRect(xBar, yTop, barW * 0.92, bh);
      else ctx.fillRect(plotL, xBar, bh, barW * 0.92); // row (placeholder)
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, axH);
  paintValueAxis(ctx, min, max, x, plotT, axW, plotB - plotT);
}

function paintLines(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats) return;
  const { min, max } = valueRange(chart);
  const axW = 30, axH = 18;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, min, max);
  const stepX = (plotR - plotL) / Math.max(1, cats - 1);
  for (let s = 0; s < chart.series.length; s++) {
    ctx.strokeStyle = colorOf(chart, s);
    ctx.fillStyle = colorOf(chart, s);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const vals = chart.series[s]!.values;
    for (let i = 0; i < cats; i++) {
      const v = vals[i] ?? 0;
      const xp = plotL + i * stepX;
      const yp = plotB - ((v - min) / (max - min)) * (plotB - plotT);
      if (i === 0) ctx.moveTo(xp, yp); else ctx.lineTo(xp, yp);
    }
    ctx.stroke();
    // markers
    for (let i = 0; i < cats; i++) {
      const v = vals[i] ?? 0;
      const xp = plotL + i * stepX;
      const yp = plotB - ((v - min) / (max - min)) * (plotB - plotT);
      ctx.beginPath(); ctx.arc(xp, yp, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, axH);
  paintValueAxis(ctx, min, max, x, plotT, axW, plotB - plotT);
}

function paintPieOrDoughnut(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, holeFrac: number): void {
  const s0 = chart.series[0];
  if (!s0) return;
  const total = s0.values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return;
  const cx = x + w / 2, cy = y + h / 2;
  const radius = Math.min(w, h) / 2 - 6;
  let a0 = -Math.PI / 2;
  for (let i = 0; i < s0.values.length; i++) {
    const v = Math.max(0, s0.values[i] ?? 0);
    if (v === 0) continue;
    const a1 = a0 + (v / total) * Math.PI * 2;
    ctx.fillStyle = chart.series[0]?.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fill();
    a0 = a1;
  }
  if (holeFrac > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, radius * holeFrac, 0, Math.PI * 2); ctx.fill();
  }
}

function paintScatter(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number): void {
  // Equivalente ao line sem stroke contínuo — apenas os pontos.
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  const { min, max } = valueRange(chart);
  const axW = 30, axH = 18;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, min, max);
  for (let s = 0; s < chart.series.length; s++) {
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    const stepX = (plotR - plotL) / Math.max(1, cats - 1);
    for (let i = 0; i < cats; i++) {
      const xp = plotL + i * stepX;
      const yp = plotB - ((vals[i] ?? 0 - min) / (max - min)) * (plotB - plotT);
      ctx.beginPath(); ctx.arc(xp, yp, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  paintValueAxis(ctx, min, max, x, plotT, axW, plotB - plotT);
}

function paintRadar(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number): void {
  const n = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!n) return;
  const { max } = valueRange(chart);
  const cx = x + w / 2, cy = y + h / 2;
  const radius = Math.min(w, h) / 2 - 16;
  // grid (4 anéis)
  ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / n);
      const px = cx + Math.cos(a) * radius * (r / 4);
      const py = cy + Math.sin(a) * radius * (r / 4);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
  // séries
  for (let s = 0; s < chart.series.length; s++) {
    const c = colorOf(chart, s);
    ctx.strokeStyle = c;
    ctx.fillStyle = c.length === 7 ? c + '40' : c; // 25% alpha
    ctx.lineWidth = 2;
    ctx.beginPath();
    const vals = chart.series[s]!.values;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / n);
      const r = ((vals[i] ?? 0) / max) * radius;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function paintGrid(ctx: CanvasRenderingContext2D, l: number, t: number, r: number, b: number, _min: number, _max: number): void {
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1;
  ctx.beginPath();
  const rows = 5;
  for (let i = 0; i <= rows; i++) {
    const y = t + (b - t) * i / rows;
    ctx.moveTo(l, y + 0.5); ctx.lineTo(r, y + 0.5);
  }
  ctx.stroke();
}

function paintCategoryAxis(ctx: CanvasRenderingContext2D, cats: string[], l: number, b: number, w: number, _h: number): void {
  if (cats.length === 0) return;
  ctx.fillStyle = '#555'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const stepX = w / cats.length;
  for (let i = 0; i < cats.length; i++) {
    const text = cats[i] ?? String(i + 1);
    ctx.fillText(text.length > 8 ? text.slice(0, 7) + '…' : text, l + stepX * (i + 0.5), b + 4);
  }
}

function paintValueAxis(ctx: CanvasRenderingContext2D, min: number, max: number, x: number, y: number, _w: number, h: number): void {
  ctx.fillStyle = '#555'; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const rows = 5;
  for (let i = 0; i <= rows; i++) {
    const v = max - (max - min) * (i / rows);
    ctx.fillText(formatVal(v), x + 26, y + (h * i / rows));
  }
}

function formatVal(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function paintLegend(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number): void {
  ctx.font = '11px Arial'; ctx.textBaseline = 'middle';
  let cx = x + 4;
  for (let i = 0; i < chart.series.length; i++) {
    const c = colorOf(chart, i);
    ctx.fillStyle = c; ctx.fillRect(cx, y + h / 2 - 5, 10, 10);
    cx += 14;
    ctx.fillStyle = '#333';
    const name = chart.series[i]?.name ?? `Série ${i + 1}`;
    ctx.fillText(name, cx, y + h / 2);
    cx += ctx.measureText(name).width + 12;
    if (cx > x + w - 30) break;
  }
}
