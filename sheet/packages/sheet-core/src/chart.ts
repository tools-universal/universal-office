/**
 * Gráficos do Sheet: o motor é o compartilhado (`@universal-office/charts`, o
 * mesmo do Slides). Aqui só a ponte — XML pelo parser do sheet-core, cores
 * DrawingML pelo tema do workbook — e um resumo do modelo (tipo/título/séries).
 */
import { parseChartSpace, parsePaint, paintChartSpace, dmlColor, canonicalNs, type ChartSpace, type XmlNode } from '@universal-office/charts';
import { parseXml, type XmlElement } from './xml.js';
import type { Theme } from './theme.js';
import type { XlsxPackage } from './package.js';

export type ChartType = 'bar-col' | 'bar-row' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'area' | 'unknown';

export interface ChartSeries { name: string; values: number[]; color?: string }

export interface ChartModel {
  space: ChartSpace;
  type: ChartType;
  title?: string;
  series: ChartSeries[];
  categories: string[];
}

/** Tema Office padrão (workbook sem theme1.xml). */
const FALLBACK: Record<string, string> = {
  dk1: '#000000', lt1: '#FFFFFF', dk2: '#44546A', lt2: '#E7E6E6',
  accent1: '#4472C4', accent2: '#ED7D31', accent3: '#A5A5A5', accent4: '#FFC000', accent5: '#5B9BD5', accent6: '#70AD47',
  hlink: '#0563C1', folHlink: '#954F72',
};

/**
 * `fileFormat`: quem gravou a pasta (`chartFileFormat`) — muda o sentido de
 * elementos ausentes (ver `ChartHost.fileFormat`).
 */
export function parseChart(xml: string, theme?: Theme, fileFormat?: 'mso2007' | 'modern'): ChartModel {
  let root: XmlElement;
  try { root = canonicalNs(parseXml(xml) as XmlNode) as XmlElement; } catch { root = { name: 'c:chartSpace', attrs: {}, children: [] }; }
  const scheme = { ...FALLBACK, ...(theme?.byName ?? {}) };
  const space = parseChartSpace(root as XmlNode, {
    ...(fileFormat ? { fileFormat } : {}),
    color: (el) => dmlColor(el, scheme),
    fonts: { ...(theme?.fonts?.minor ? { minor: theme.fonts.minor } : { minor: 'Calibri' }), ...(theme?.fonts?.major ? { major: theme.fonts.major } : {}) },
    fillStyle: (idx, ph) => {
      const el = theme?.fillStyles?.[idx - 1];
      if (!el) return undefined;
      const sc = { ...scheme, phClr: ph };
      return parsePaint({ name: 'w', attrs: {}, children: [el] } as unknown as XmlNode, (e) => dmlColor(e, sc));
    },
  });
  const g0 = space.groups[0];
  const type: ChartType = !g0 ? 'unknown' : g0.kind === 'bar' ? (g0.dir === 'bar' ? 'bar-row' : 'bar-col')
    : g0.kind === 'line' || g0.kind === 'stock' ? 'line' : g0.kind === 'ofPie' ? 'pie'
      : (['pie', 'doughnut', 'scatter', 'radar', 'area'] as string[]).includes(g0.kind) ? (g0.kind as ChartType) : 'unknown';
  const series: ChartSeries[] = [];
  let categories: string[] = [];
  for (const g of space.groups) for (const s of g.series) {
    const cs: ChartSeries = { name: s.name, values: s.values.map((v) => v ?? 0) };
    const f = s.sp.fill, l = s.sp.line?.paint;
    if (f?.kind === 'solid') cs.color = f.color; else if (l?.kind === 'solid') cs.color = l.color;
    series.push(cs);
    if (!categories.length) categories = s.cats ?? (s.catNums ?? []).map((v) => (v === null ? '' : String(v)));
  }
  const title = space.title?.paras?.map((p) => p.runs.map((r) => r.text).join('')).join('\n') || space.title?.text;
  return { space, type, series, categories, ...(title ? { title } : {}) };
}

/** Modelo de um gráfico ancorado da pasta (o que o `<universal-sheet>` pinta). */
export function chartModelFor(pkg: XlsxPackage, ch: { chartXml: string; part?: string }, theme?: Theme): ChartModel {
  return parseChart(ch.chartXml, theme, chartFileFormat(pkg));
}

const formatCache = new WeakMap<XlsxPackage, 'mso2007' | 'modern'>();

/**
 * Pasta gravada pelo Excel 2007 (`docProps/app.xml`: Application "Microsoft…"
 * e AppVersion 12.x) ou posterior/outro gerador — o Office lê os gráficos do
 * 2007 com o sentido antigo de elementos ausentes e booleanos sem val.
 */
export function chartFileFormat(pkg: XlsxPackage): 'mso2007' | 'modern' {
  let f = formatCache.get(pkg);
  if (!f) {
    const app = pkg.getPartText('docProps/app.xml') ?? '';
    const name = /<Application>([^<]*)</.exec(app)?.[1]?.trim() ?? '';
    const ver = /<AppVersion>([^<]*)</.exec(app)?.[1]?.trim() ?? '';
    f = /^Microsoft/i.test(name) && /^12\./.test(ver) ? 'mso2007' : 'modern';
    formatCache.set(pkg, f);
  }
  return f;
}

/**
 * Desenha o gráfico: o Excel pinta a área do gráfico sem `spPr` de branco com
 * moldura #898989 (tx1 75%) — mesmo sem c14:style, com a grade preta (medido).
 */
export function paintChart(ctx: CanvasRenderingContext2D, chart: ChartModel, x: number, y: number, w: number, h: number, pxPerPt: number, frameBorder?: string, cssFont?: (family: string, bold?: boolean, italic?: boolean) => string): void {
  paintChartSpace(ctx, chart.space, x, y, w, h, {
    pxPerPt,
    defaultAreaFill: 'bg1',
    // moldura do Excel: a cor das linhas default do gráfico ('auto'), ou a pedida
    defaultAreaLine: frameBorder ?? 'auto2010',
    cssFont: cssFont ?? ((f) => `'${f}', Calibri, 'Liberation Sans', Arial, sans-serif`),
  });
}
