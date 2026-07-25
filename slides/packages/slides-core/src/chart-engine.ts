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

export type ChartType = 'bar-col' | 'bar-row' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'area' | 'unknown';

export interface ChartSeries {
  name: string;
  values: number[];
  /** Cor explícita (`<c:spPr><a:solidFill>...`); ausente → paleta default. */
  color?: string;
  /** Marcadores visíveis (line/scatter): `<c:marker><c:symbol val>` != none. */
  marker?: boolean;
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
    case 'c:areaChart': return 'area';
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
  // marcadores (line/scatter): <c:marker><c:symbol val="none"/> desliga
  const marker = firstChild(ser, 'c:marker');
  if (marker) {
    const sym = firstChild(marker, 'c:symbol');
    out.marker = sym?.attrs['val'] !== 'none';
  }
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
export function paintChart(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt?: number, frameBorder?: string): void {
  // fundo branco (chartSpace default). Moldura: o host decide — o Excel desenha
  // borda cinza clara em charts embutidos; o PowerPoint não (frameBorder=undef).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  if (frameBorder) {
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
    ctx.fillText(chart.title, x + w / 2, y + 16 * u);
    plotY = y + titlePx + 36 * u;
    plotH = h - (titlePx + 44 * u);
  }

  // legenda: presente quando o XML declara <c:legend> (default do app: bottom)
  const showLegend = chart.legendPos !== undefined;
  const legendH = showLegend ? labelPx + 20 * u : 0;
  const legendTop = chart.legendPos === 't';

  const px = x + 8 * u;
  const py = plotY + (legendTop ? legendH : 0);
  const pw = w - 16 * u;
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
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, 0);
      break;
    case 'doughnut':
      paintPieOrDoughnut(ctx, chart, px, py, pw, ph, chart.holeSize ?? 0.75);
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

  if (showLegend) {
    const ly = legendTop ? plotY : py + ph + 6 * u;
    paintLegend(ctx, chart, px, ly, pw, legendH, labelPx);
  }
}

function paletteOf(chart: ChartModel): string[] {
  return chart.palette && chart.palette.length ? chart.palette : DEFAULT_PALETTE;
}

function colorOf(chart: ChartModel, i: number): string {
  const pal = paletteOf(chart);
  return chart.series[i]?.color ?? pal[i % pal.length]!;
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
  const raw = (max - min) / 5 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = mag * (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10);
  const lo = min < 0 ? Math.floor((min * 1.05) / step) * step : Math.floor(min / step) * step;
  const hi = max > 0 ? Math.ceil((max * 1.05) / step) * step : Math.ceil(max / step) * step;
  return { lo, hi, step };
}

function paintBars(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, dir: 'col' | 'row', labelPx: number): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats || chart.series.length === 0) return;
  const { min, max } = valueRange(chart);
  const t = niceTicks(min, max);
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
  for (let s = 0; s < nSer; s++) {
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    for (let i = 0; i < cats; i++) {
      const v = vals[i] ?? 0;
      const gx = plotL + i * groupW + (groupW - span) / 2;
      const xBar = gx + s * barW * (1 - ov);
      const yTop = plotB - ((v - t.lo) / (t.hi - t.lo)) * (plotB - plotT);
      const bh = plotB - yTop;
      if (dir === 'col') ctx.fillRect(xBar, yTop, barW, bh);
      else ctx.fillRect(plotL, xBar, bh, barW); // row (placeholder)
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, x + axW - 6, plotT, plotB - plotT, labelPx);
}

function paintLines(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, labelPx: number, area: boolean): void {
  const cats = chart.categories.length || chart.series[0]?.values.length || 0;
  if (!cats) return;
  const { min, max } = valueRange(chart);
  const t = niceTicks(min, max);
  const axW = labelPx * 2.0, axH = labelPx * 2.4;
  const plotL = x + axW, plotT = y, plotR = x + w, plotB = y + h - axH;
  paintGrid(ctx, plotL, plotT, plotR, plotB, t);
  // categoria de linha: pontos CENTRADOS nas bandas (como o app de referência)
  const stepX = (plotR - plotL) / cats;
  const xAt = (i: number): number => plotL + stepX * (i + 0.5);
  const yAt = (v: number): number => plotB - ((v - t.lo) / (t.hi - t.lo)) * (plotB - plotT);
  for (let s = 0; s < chart.series.length; s++) {
    const col = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    if (area) {
      ctx.fillStyle = col;
      ctx.globalAlpha = ctx.globalAlpha * 1; // área sólida (referência não usa alpha)
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(vals[0] ?? 0));
      for (let i = 1; i < cats; i++) ctx.lineTo(xAt(i), yAt(vals[i] ?? 0));
      ctx.lineTo(xAt(cats - 1), plotB);
      ctx.lineTo(xAt(0), plotB);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = Math.max(2, labelPx / 6);
    ctx.beginPath();
    for (let i = 0; i < cats; i++) {
      const yp = yAt(vals[i] ?? 0);
      if (i === 0) ctx.moveTo(xAt(i), yp); else ctx.lineTo(xAt(i), yp);
    }
    ctx.stroke();
    if (chart.series[s]!.marker) {
      for (let i = 0; i < cats; i++) {
        ctx.beginPath(); ctx.arc(xAt(i), yAt(vals[i] ?? 0), labelPx / 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  paintCategoryAxis(ctx, chart.categories, plotL, plotB, plotR - plotL, labelPx);
  paintValueAxis(ctx, t, x + axW - 6, plotT, plotB - plotT, labelPx);
}

function paintPieOrDoughnut(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, holeFrac: number): void {
  const s0 = chart.series[0];
  if (!s0) return;
  const total = s0.values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return;
  const pal = paletteOf(chart);
  // centro/raio MEDIDOS no app de referência (pizza usa ~97% do plot e fica
  // ~6px acima do centro geométrico — o rótulo de eixo não existe aqui)
  const cx = x + w / 2, cy = y + h / 2 - h * 0.012;
  const radius = (Math.min(w, h) / 2) * 0.97;
  let a0 = -Math.PI / 2;
  for (let i = 0; i < s0.values.length; i++) {
    const v = Math.max(0, s0.values[i] ?? 0);
    if (v === 0) continue;
    const a1 = a0 + (v / total) * Math.PI * 2;
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
    // separador branco entre fatias (o app de referência contorna em branco)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, radius / 90);
    ctx.stroke();
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
  for (let v = tx.lo; v <= tx.hi + 1e-9; v += tx.step) {
    const xx = plotL + ((v - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
    ctx.moveTo(Math.round(xx) + 0.5, plotT); ctx.lineTo(Math.round(xx) + 0.5, plotB);
  }
  ctx.stroke();
  for (let s = 0; s < chart.series.length; s++) {
    ctx.fillStyle = colorOf(chart, s);
    const vals = chart.series[s]!.values;
    for (let i = 0; i < n; i++) {
      const xv = xs[i] ?? i;
      const xp = plotL + ((xv - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
      const yp = plotB - (((vals[i] ?? 0) - ty.lo) / (ty.hi - ty.lo)) * (plotB - plotT);
      ctx.beginPath(); ctx.arc(xp, yp, labelPx / 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // eixo X numérico
  ctx.fillStyle = '#595959';
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = tx.lo; v <= tx.hi + 1e-9; v += tx.step) {
    const xx = plotL + ((v - tx.lo) / (tx.hi - tx.lo)) * (plotR - plotL);
    ctx.fillText(formatVal(v), xx, plotB + labelPx * 0.35);
  }
  paintValueAxis(ctx, ty, x + axW - 6, plotT, plotB - plotT, labelPx);
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
  for (let v = t.lo + t.step; v <= t.hi + 1e-9; v += t.step) {
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
  for (let v = t.lo; v <= t.hi + 1e-9; v += t.step) {
    ctx.fillText(formatVal(v), cx - labelPx * 0.4, cy - rAt(v));
  }
  // labels de categoria nos vértices externos
  for (let i = 0; i < n; i++) {
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

function paintGrid(ctx: CanvasRenderingContext2D, l: number, t: number, r: number, b: number, ticks: { lo: number; hi: number; step: number }): void {
  ctx.strokeStyle = '#D9D9D9'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let v = ticks.lo; v <= ticks.hi + 1e-9; v += ticks.step) {
    const y = b - ((v - ticks.lo) / (ticks.hi - ticks.lo)) * (b - t);
    ctx.moveTo(l, Math.round(y) + 0.5); ctx.lineTo(r, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

function paintCategoryAxis(ctx: CanvasRenderingContext2D, cats: string[], l: number, b: number, w: number, labelPx: number): void {
  if (cats.length === 0) return;
  ctx.fillStyle = '#595959';
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const stepX = w / cats.length;
  for (let i = 0; i < cats.length; i++) {
    const text = cats[i] ?? String(i + 1);
    ctx.fillText(text, l + stepX * (i + 0.5), b + labelPx * 0.35);
  }
}

function paintValueAxis(ctx: CanvasRenderingContext2D, ticks: { lo: number; hi: number; step: number }, xRight: number, y: number, h: number, labelPx: number): void {
  ctx.fillStyle = '#595959';
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = ticks.lo; v <= ticks.hi + 1e-9; v += ticks.step) {
    const yy = y + h - ((v - ticks.lo) / (ticks.hi - ticks.lo)) * h;
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
  const pal = paletteOf(chart);
  const byCategory = chart.type === 'pie' || chart.type === 'doughnut';
  const entries: { label: string; color: string }[] = byCategory
    ? chart.categories.map((c, i) => ({ label: c, color: pal[i % pal.length]! }))
    : chart.series.map((s, i) => ({ label: s.name || `Série ${i + 1}`, color: colorOf(chart, i) }));
  if (!entries.length) return;
  ctx.font = `${labelPx}px Aptos, 'Segoe UI', Calibri, Arial, sans-serif`;
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
    ctx.fillStyle = '#595959';
    ctx.textAlign = 'left';
    ctx.fillText(e.label, cx, cy);
    cx += widths[i]! + gapOut;
    if (cx > x + w) break;
  }
}
