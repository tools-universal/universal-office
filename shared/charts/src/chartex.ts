/**
 * Gráficos do Office 2016 (`cx:chartSpace`, "chartex"): cascata, funil,
 * histograma, Pareto, caixa estreita, mapa de árvore e explosão solar.
 * Convertidos no modelo do motor: os de eixos viram grupos de barras/linhas
 * (pilha com base invisível na cascata e no funil, compartimentos calculados
 * no histograma, linha acumulada no eixo secundário no Pareto); caixa
 * estreita, mapa de árvore e explosão solar viram grupos próprios ('box',
 * 'treemap', 'sunburst') pintados pelo renderizador.
 * Defaults medidos no Excel (lab de gráficos do Sheet, pastas lo-*): texto
 * #595959 (tx1 65%), eixos/rótulos 9 pt, título 14 pt regular, grade e linha
 * do eixo de categorias #D9D9D9, sem tiques; cascata: Aumento/Diminuição/Total
 * = accent1/2/3.
 */
import { childElements, firstChild, textContent, descend, type XmlNode } from './xml.js';
import type {
  ChartSpace, Group, Series, Axis, ShapeProps, TextProps, ChartTitle, Legend, DLbls, RichPara, Paint,
} from './model.js';
import { formatValue, PT_BR } from './numfmt.js';

/** O que o conversor usa do parser de `c:` (mesma leitura de spPr/txPr/cores). */
export interface ExParser {
  shape(el: XmlNode | undefined): ShapeProps;
  textProps(el: XmlNode | undefined): TextProps;
  rich(el: XmlNode): RichPara[];
  color(el: XmlNode | undefined): string | undefined;
}

interface ExData { cats?: string[][]; val?: (number | null)[]; size?: (number | null)[]; fmt?: string }

const GRAY = '#595959';
const LIGHT = '#D9D9D9';
const num = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : undefined;
};

/** `cx:data` → dimensões (níveis de categoria do interno ao externo). */
function readData(root: XmlNode): Map<string, ExData> {
  const out = new Map<string, ExData>();
  for (const d of childElements(firstChild(root, 'cx:chartData') ?? { name: '', attrs: {}, children: [] }, 'cx:data')) {
    const e: ExData = {};
    for (const dim of childElements(d)) {
      const type = dim.attrs['type'] ?? '';
      const lvls = childElements(dim, 'cx:lvl');
      if (dim.name === 'cx:strDim' && type === 'cat') {
        e.cats = lvls.map((l) => {
          const n = Math.min(100000, parseInt(l.attrs['ptCount'] ?? '0', 10) || 0);
          const a: string[] = new Array(n).fill('');
          for (const p of childElements(l, 'cx:pt')) { const i = parseInt(p.attrs['idx'] ?? '-1', 10); if (i >= 0 && i < 100000) a[i] = textContent(p); }
          return a;
        });
      } else if (dim.name === 'cx:numDim') {
        const l = lvls[0];
        if (!l) continue;
        const n = Math.min(100000, parseInt(l.attrs['ptCount'] ?? '0', 10) || 0);
        const a: (number | null)[] = new Array(n).fill(null);
        for (const p of childElements(l, 'cx:pt')) { const i = parseInt(p.attrs['idx'] ?? '-1', 10); const v = num(textContent(p)); if (i >= 0 && i < 100000 && v !== undefined) a[i] = v; }
        if (type === 'val' || type === 'y') { e.val = a; if (l.attrs['formatCode']) e.fmt = l.attrs['formatCode']; }
        else if (type === 'size') e.size = a;
        else if (type === 'cat' || type === 'x') e.cats = [a.map((v) => (v === null ? '' : formatValue(v, l.attrs['formatCode'] ?? 'General', { locale: PT_BR }).text))];
      }
    }
    out.set(d.attrs['id'] ?? String(out.size), e);
  }
  return out;
}

/** Título: `cx:tx` (txData/rich) ou o texto dos runs do próprio `cx:txPr` (o Excel grava lá). */
function exTitle(P: ExParser, el: XmlNode | undefined, def: TextProps): ChartTitle | undefined {
  if (!el) return undefined;
  const txPr = firstChild(el, 'cx:txPr');
  const t: ChartTitle = { overlay: el.attrs['overlay'] === '1', sp: P.shape(firstChild(el, 'cx:spPr')), txPr: { ...def, ...P.textProps(txPr) } };
  const tx = firstChild(el, 'cx:tx');
  const rich = firstChild(tx, 'cx:rich');
  const v = descend(firstChild(tx, 'cx:txData'), 'cx:v');
  if (rich) t.paras = P.rich(rich);
  else if (v) t.text = textContent(v);
  else if (txPr && descend(txPr, 'a:t')) t.paras = P.rich(txPr);
  return t;
}

function exAxis(P: ExParser, el: XmlNode, id: string, kind: 'cat' | 'val', pos: Axis['pos'], def: TextProps): Axis {
  const txPr = P.textProps(firstChild(el, 'cx:txPr'));
  const sp = P.shape(firstChild(el, 'cx:spPr'));
  const a: Axis = {
    id, kind, pos, deleted: el.attrs['hidden'] === '1', reversed: false, crosses: 'autoZero',
    majorTick: (firstChild(el, 'cx:majorTickMarks')?.attrs['type'] as Axis['majorTick']) ?? 'none',
    minorTick: (firstChild(el, 'cx:minorTickMarks')?.attrs['type'] as Axis['minorTick']) ?? 'none',
    tickLblPos: firstChild(el, 'cx:tickLabels') ? 'nextTo' : 'none',
    txPr: { ...def, ...txPr },
    // linha do eixo de categorias clara; a de valores, nenhuma
    sp: { ...(kind === 'cat' ? { line: { paint: { kind: 'solid', color: LIGHT }, w: 0.75 } } : { line: { paint: { kind: 'none' } } }), ...sp },
    lblOffset: 100, noMultiLvlLbl: false, crossBetween: 'between',
  };
  const mg = firstChild(el, 'cx:majorGridlines');
  if (mg) a.majorGrid = { line: { paint: { kind: 'solid', color: LIGHT }, w: 0.75 }, ...P.shape(firstChild(mg, 'cx:spPr')) };
  const vs = firstChild(el, 'cx:valScaling');
  if (vs) {
    const mn = num(vs.attrs['min']), mx = num(vs.attrs['max']), mu = num(vs.attrs['majorUnit']);
    if (mn !== undefined) a.min = mn;
    if (mx !== undefined) a.max = mx;
    if (mu !== undefined && mu > 0) a.majorUnit = mu;
  }
  const nf = firstChild(el, 'cx:numFmt');
  if (nf) a.numFmt = { code: nf.attrs['formatCode'] ?? 'General', linked: nf.attrs['sourceLinked'] === '1' };
  const tt = exTitle(P, firstChild(el, 'cx:title'), { ...def, sz: 10 });
  if (tt) a.title = tt;
  return a;
}

function exLabels(P: ExParser, el: XmlNode | undefined, def: TextProps, fmt?: string): DLbls | undefined {
  if (!el) return undefined;
  const vis = firstChild(el, 'cx:visibility');
  const on = (k: string, d: boolean) => (vis?.attrs[k] === undefined ? d : vis.attrs[k] === '1' || vis.attrs[k] === 'true');
  const d: DLbls = {
    showVal: on('value', true), showCat: on('categoryName', false), showSer: on('seriesName', false),
    txPr: { ...def, ...P.textProps(firstChild(el, 'cx:txPr')) }, sp: P.shape(firstChild(el, 'cx:spPr')),
  };
  if (el.attrs['pos']) d.pos = el.attrs['pos'];
  const nf = firstChild(el, 'cx:numFmt');
  if (nf) d.numFmt = { code: nf.attrs['formatCode'] ?? 'General', linked: nf.attrs['sourceLinked'] === '1' };
  else if (fmt) d.numFmt = { code: fmt, linked: true };
  if (el.attrs['pos'] === undefined) d.pos = 'ctr';
  return d;
}

/** Linha w="0" (fio de cabelo): o chartex do Excel não desenha (medido, lo-funnel1). */
const noHairline = (sp: ShapeProps): ShapeProps => (sp.line && sp.line.w === 0 ? { ...sp, line: { paint: { kind: 'none' } } } : sp);

const blankSeries = (idx: number, name: string, values: (number | null)[], cats: string[], sp: ShapeProps): Series => ({
  idx, order: idx, name, values, cats, sp, dPts: new Map(), trendlines: [],
});

const baseGroup = (kind: Group['kind'], index: number, axIds: string[], over: Partial<Group> = {}): Group => ({
  kind, threeD: false, index, dir: 'col', grouping: 'clustered', varyColors: false, gapWidth: 150, overlap: 0, holeSize: 10,
  firstSliceAng: 0, showMarker: false, series: [], axIds, ...over,
});

/** Compartimentos do histograma (regra de Scott quando o arquivo não fixa nº/largura). */
export function histogramBins(vals: number[], lp: XmlNode | undefined, fmt = 'General'): { labels: string[]; counts: number[]; edges: number[] } {
  const b = firstChild(lp, 'cx:binning');
  const v = vals.filter((x) => Number.isFinite(x)).sort((a, c) => a - c);
  if (!v.length) return { labels: [], counts: [], edges: [] };
  const closedR = (b?.attrs['intervalClosed'] ?? 'r') === 'r';
  let lo = v[0]!, hi = v[v.length - 1]!;
  const under = num(b?.attrs['underflow']), over = num(b?.attrs['overflow']);
  const inLo = under !== undefined ? under : lo, inHi = over !== undefined ? over : hi;
  const n = v.length;
  let width = num(firstChild(b, 'cx:binSize')?.attrs['val']);
  const count = num(firstChild(b, 'cx:binCount')?.attrs['val']);
  if (count !== undefined && count > 0) width = (inHi - inLo) / count || 1;
  if (width === undefined || !(width > 0)) {
    const mean = v.reduce((a, x) => a + x, 0) / n;
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, n - 1));
    // regra de Scott com 2 algarismos significativos (medido: 3,937 → 3,9; 3,478 → 3,5)
    width = Number((3.5 * sd / Math.cbrt(n)).toPrecision(2)) || 1;
  }
  const k = Math.max(1, count ?? Math.ceil((inHi - inLo) / width - 1e-9));
  const edges = Array.from({ length: k + 1 }, (_, i) => inLo + i * width!);
  const counts = new Array<number>(k).fill(0);
  let uc = 0, oc = 0;
  for (const x of v) {
    if (under !== undefined && (closedR ? x <= under : x < under)) { uc++; continue; }
    if (over !== undefined && (closedR ? x > over : x >= over)) { oc++; continue; }
    let i = closedR ? Math.ceil((x - inLo) / width - 1e-9) - 1 : Math.floor((x - inLo) / width + 1e-9);
    i = Math.max(0, Math.min(k - 1, i));
    counts[i]!++;
  }
  const f = (x: number) => formatValue(Math.round(x * 1e9) / 1e9, fmt, { locale: PT_BR }).text;
  const labels = counts.map((_, i) => {
    const a = f(edges[i]!), c = f(edges[i + 1]!);
    if (closedR) return i === 0 && under === undefined ? `[${a}, ${c}]` : `(${a}, ${c}]`;
    return i === k - 1 && over === undefined ? `[${a}, ${c}]` : `[${a}, ${c})`;
  });
  void lo; void hi;
  if (under !== undefined) { labels.unshift(`≤${f(under)}`); counts.unshift(uc); }
  if (over !== undefined) { labels.push(`>${f(over)}`); counts.push(oc); }
  return { labels, counts, edges };
}

/**
 * `cx:chartSpace` → modelo do motor. `cs` já vem com o tema/defaults do
 * hospedeiro (cores, fontes); aqui entram título, legenda, grupos e eixos.
 */
export function parseChartEx(root: XmlNode, P: ExParser, cs: ChartSpace): ChartSpace {
  cs.style = 2;
  cs.office2010 = true;
  cs.roundedCorners = false;
  // área: branca com moldura #D9D9D9 (medido nos chartex do Excel)
  const area = P.shape(firstChild(root, 'cx:spPr'));
  cs.sp = { fill: { kind: 'solid', color: cs.bg1 }, line: { paint: { kind: 'solid', color: LIGHT }, w: 0.75 }, ...area };
  const rootTx = P.textProps(firstChild(root, 'cx:txPr'));
  cs.txPr = { sz: 9, color: GRAY, ...rootTx };
  const def: TextProps = { sz: 9, color: GRAY, ...rootTx };
  const data = readData(root);
  const chart = firstChild(root, 'cx:chart');
  if (!chart) return cs;
  const t = exTitle(P, firstChild(chart, 'cx:title'), { sz: 14, b: false, color: GRAY, ...rootTx });
  if (t) cs.title = t;
  cs.autoTitleDeleted = !t;
  const lg = firstChild(chart, 'cx:legend');
  if (lg) {
    const L: Legend = { pos: (lg.attrs['pos'] as Legend['pos']) ?? 'r', overlay: lg.attrs['overlay'] === '1', deleted: new Set(), txPr: { ...def, ...P.textProps(firstChild(lg, 'cx:txPr')) }, sp: P.shape(firstChild(lg, 'cx:spPr')) };
    cs.legend = L;
  }
  const plot = firstChild(chart, 'cx:plotArea');
  const region = firstChild(plot, 'cx:plotAreaRegion');
  cs.plotSp = P.shape(firstChild(firstChild(region, 'cx:plotSurface'), 'cx:spPr'));
  const axEls = childElements(plot ?? { name: '', attrs: {}, children: [] }, 'cx:axis');
  // papéis pelos elementos de escala, não pelo id (lo-pareto-gapwidth: id 0 = valores)
  const catEl = axEls.find((a) => firstChild(a, 'cx:catScaling'));
  const valEls = axEls.filter((a) => firstChild(a, 'cx:valScaling'));
  const pctEl = valEls.find((a) => firstChild(a, 'cx:units')?.attrs['unit'] === 'percentage');
  const val1El = valEls.find((a) => a !== pctEl) ?? (pctEl ? undefined : valEls[0]);
  const sers = childElements(region ?? { name: '', attrs: {}, children: [] }, 'cx:series').filter((s) => s.attrs['hidden'] !== '1');
  if (!sers.length) return cs;
  const s0 = sers[0]!;
  const layout = s0.attrs['layoutId'] ?? 'clusteredColumn';
  const dataOf = (s: XmlNode) => data.get(firstChild(s, 'cx:dataId')?.attrs['val'] ?? '0') ?? {};
  const nameOf = (s: XmlNode, i: number) => textContent(descend(firstChild(s, 'cx:tx'), 'cx:v') ?? { name: '', attrs: {}, children: [] }) || `Série${i + 1}`;
  const gap = (d: number) => { const g = num(firstChild(catEl, 'cx:catScaling')?.attrs['gapWidth']); return g !== undefined ? g * 100 : d; };
  const catAx = (pos: Axis['pos'] = 'b') => exAxis(P, catEl ?? { name: 'cx:axis', attrs: {}, children: [{ name: 'cx:tickLabels', attrs: {}, children: [] }] }, 'c', 'cat', pos, def);
  const valAx = (pos: Axis['pos'] = 'l', el = val1El, id = 'v') => exAxis(P, el ?? { name: 'cx:axis', attrs: { hidden: '1' }, children: [] }, id, 'val', pos, def);
  const acc = (i: number) => cs.accents[i % 6]!;
  const solid = (c: string): Paint => ({ kind: 'solid', color: c });
  const leafCats = (d: ExData, n: number) => (d.cats?.[0] ?? Array.from({ length: n }, (_, i) => String(i + 1)));
  const lpOf = (s: XmlNode) => firstChild(s, 'cx:layoutPr');

  if (layout === 'waterfall') {
    const d = dataOf(s0), vals = d.val ?? [];
    const cats = leafCats(d, vals.length);
    const totals = new Set(childElements(firstChild(lpOf(s0), 'cx:subtotals') ?? { name: '', attrs: {}, children: [] }, 'cx:idx').map((x) => parseInt(x.attrs['val'] ?? '-1', 10)));
    const n = vals.length;
    const inv: (number | null)[] = [], inc: (number | null)[] = [], dec: (number | null)[] = [], tot: (number | null)[] = [];
    let run = 0;
    const dl = exLabels(P, firstChild(s0, 'cx:dataLabels'), def, d.fmt);
    const texts: Map<number, string>[] = [new Map(), new Map(), new Map()];
    for (let i = 0; i < n; i++) {
      const v = vals[i] ?? 0;
      const lbl = formatValue(v, d.fmt ?? 'General', { locale: PT_BR }).text;
      if (totals.has(i)) { inv.push(null); inc.push(null); dec.push(null); tot.push(v); run = v; texts[2]!.set(i, lbl); continue; }
      const a = run, b = run + v;
      run = b;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      // pilha: base invisível até o início da faixa (positivos sobem, negativos descem do zero)
      const piece = lo >= 0 ? hi - lo : hi <= 0 ? lo - hi : hi;
      inv.push(lo >= 0 ? lo : hi <= 0 ? hi : 0);
      (v >= 0 ? inc : dec).push(piece);
      (v >= 0 ? dec : inc).push(null);
      tot.push(null);
      texts[v >= 0 ? 0 : 1]!.set(i, lbl);
    }
    const line = P.shape(firstChild(s0, 'cx:spPr')).line;
    const mk = (i: number, name: string, vs: (number | null)[], color: string, k: number): Series => {
      const s = blankSeries(i, name, vs, cats, { fill: solid(color), ...(line ? { line } : {}) });
      if (dl && k >= 0) {
        const pts = new Map<number, DLbls & { text?: string }>();
        for (const [pi, tx] of texts[k]!) pts.set(pi, { txPr: {}, sp: {}, text: tx, ...(k === 1 ? { pos: 'outBase' } : {}) });
        s.dLbls = { ...dl, pos: dl.pos === 'ctr' ? 'ctr' : 'outEnd', points: pts };
      }
      return s;
    };
    const g = baseGroup('bar', 0, ['c', 'v'], { grouping: 'stacked', overlap: 100, gapWidth: gap(50) });
    g.series = [
      blankSeries(0, '', inv, cats, { fill: { kind: 'none' }, line: { paint: { kind: 'none' } } }),
      mk(1, 'Aumento', inc, acc(0), 0), mk(2, 'Diminuição', dec, acc(1), 1), mk(3, 'Total', tot, acc(2), 2),
    ];
    cs.groups = [g];
    cs.axes = [catAx('b'), valAx('l')];
    cs.axes[0]!.crossAx = 'v'; cs.axes[1]!.crossAx = 'c';
    cs.legend?.deleted.add(0);
    return cs;
  }

  if (layout === 'funnel') {
    const d = dataOf(s0), vals = (d.val ?? []).map((v) => v ?? 0);
    const cats = leafCats(d, vals.length);
    const mx = Math.max(0, ...vals);
    const sp = noHairline(P.shape(firstChild(s0, 'cx:spPr')));
    const g = baseGroup('bar', 0, ['c', 'v'], { dir: 'bar', grouping: 'stacked', overlap: 100, gapWidth: gap(6) });
    const vis = blankSeries(1, nameOf(s0, 0), vals, cats, { fill: solid(acc(0)), ...sp });
    for (const dp of childElements(s0, 'cx:dataPt')) vis.dPts.set(parseInt(dp.attrs['idx'] ?? '-1', 10), { sp: noHairline(P.shape(firstChild(dp, 'cx:spPr'))) });
    // rótulos dentro da barra: brancos (medido, lo-funnel1/color_funnel)
    const dl = exLabels(P, firstChild(s0, 'cx:dataLabels'), { ...def, color: '#FFFFFF' }, d.fmt);
    if (dl) vis.dLbls = { ...dl, pos: 'ctr' };
    g.series = [blankSeries(0, '', vals.map((v) => (mx - v) / 2), cats, { fill: { kind: 'none' }, line: { paint: { kind: 'none' } } }), vis];
    cs.groups = [g];
    const ca = catAx('l');
    ca.reversed = true;
    const va = valAx('b');
    va.deleted = true; va.min = 0; va.max = mx || 1;
    delete va.majorGrid;
    ca.crossAx = 'v'; va.crossAx = 'c';
    cs.axes = [ca, va];
    return cs;
  }

  if (layout === 'boxWhisker') {
    const g = baseGroup('box', 0, ['c', 'v'], { gapWidth: gap(100) });
    sers.forEach((s, i) => {
      const d = dataOf(s);
      const sr = blankSeries(i, nameOf(s, i), d.val ?? [], d.cats?.[0] ?? (d.val ?? []).map(() => '1'), { fill: solid(acc(i)), line: { paint: solid(acc(i)), w: 0.75 }, ...P.shape(firstChild(s, 'cx:spPr')) });
      const vis = firstChild(lpOf(s), 'cx:visibility');
      const st = firstChild(lpOf(s), 'cx:statistics');
      sr.box = {
        meanLine: vis?.attrs['meanLine'] === '1', meanMarker: vis?.attrs['meanMarker'] !== '0',
        outliers: vis?.attrs['outliers'] !== '0', nonoutliers: vis?.attrs['nonoutliers'] === '1',
        exclusive: (st?.attrs['quartileMethod'] ?? 'exclusive') === 'exclusive',
      };
      g.series.push(sr);
    });
    cs.groups = [g];
    cs.axes = [catAx('b'), valAx('l')];
    cs.axes[0]!.crossAx = 'v'; cs.axes[1]!.crossAx = 'c';
    return cs;
  }

  if (layout === 'treemap' || layout === 'sunburst') {
    const d = dataOf(s0);
    const vals = d.size ?? d.val ?? [];
    const lv = d.cats ?? [];
    // níveis do arquivo: do interno (folha) ao externo; nos níveis de pais a célula
    // vazia herda a de cima (a folha vazia = o nó termina num nível acima)
    const levels = lv.map((l, li) => { if (li === 0) return l; let last = ''; return l.map((x) => (x ? (last = x) : last)); });
    const s = blankSeries(0, nameOf(s0, 0), vals, levels[0] ?? [], P.shape(firstChild(s0, 'cx:spPr')));
    if (levels.length > 1) s.catLevels = levels.slice(1);
    for (const dp of childElements(s0, 'cx:dataPt')) s.dPts.set(parseInt(dp.attrs['idx'] ?? '-1', 10), { sp: P.shape(firstChild(dp, 'cx:spPr')) });
    const dl = exLabels(P, firstChild(s0, 'cx:dataLabels'), { ...def, color: '#FFFFFF' }, d.fmt);
    if (dl) s.dLbls = dl;
    const g = baseGroup(layout, 0, [], { varyColors: true, series: [s] });
    const pl = firstChild(lpOf(s0), 'cx:parentLabelLayout')?.attrs['val'];
    if (pl) g.parentLabel = pl;
    cs.groups = [g];
    return cs;
  }

  if (layout === 'regionMap') return cs; // mapa: precisa dos contornos do serviço do Bing — fica só o título

  // colunas (com ou sem compartimentos) + linha de Pareto
  const owner = sers.find((s) => s.attrs['layoutId'] !== 'paretoLine') ?? s0;
  const od = dataOf(owner);
  const binning = firstChild(lpOf(owner), 'cx:binning');
  const pareto = sers.find((s) => s.attrs['layoutId'] === 'paretoLine');
  let cats: string[], vals: number[];
  if (binning || layout === 'histogram') {
    const h = histogramBins((od.val ?? []).filter((v): v is number => v !== null), lpOf(owner), od.fmt);
    cats = h.labels; vals = h.counts;
  } else {
    vals = (od.val ?? []).map((v) => v ?? 0);
    cats = leafCats(od, vals.length);
    // categorias repetidas somam (agregação do Pareto/colunas do chartex)
    if (pareto || firstChild(lpOf(owner), 'cx:aggregation')) {
      const m = new Map<string, number>();
      cats.forEach((c, i) => m.set(c, (m.get(c) ?? 0) + (vals[i] ?? 0)));
      cats = [...m.keys()]; vals = [...m.values()];
    }
  }
  if (pareto) {
    // Pareto: barras em ordem decrescente e a linha do acumulado (%) no eixo secundário
    const idx = vals.map((_, i) => i).sort((a, b) => vals[b]! - vals[a]!);
    cats = idx.map((i) => cats[i]!); vals = idx.map((i) => vals[i]!);
  }
  const sp = P.shape(firstChild(owner, 'cx:spPr'));
  const bars = blankSeries(0, nameOf(owner, 0), vals, cats, { fill: solid(acc(0)), ...(binning ? { line: { paint: solid('#FFFFFF'), w: 0.75 } } : {}), ...sp });
  for (const dp of childElements(owner, 'cx:dataPt')) bars.dPts.set(parseInt(dp.attrs['idx'] ?? '-1', 10), { sp: P.shape(firstChild(dp, 'cx:spPr')) });
  const dl = exLabels(P, firstChild(owner, 'cx:dataLabels'), def, od.fmt);
  if (dl) bars.dLbls = { ...dl, pos: dl.pos === 'ctr' && !firstChild(owner, 'cx:dataLabels')?.attrs['pos'] ? 'outEnd' : dl.pos ?? 'outEnd' };
  const g = baseGroup('bar', 0, ['c', 'v'], { gapWidth: gap(binning ? 0 : 150), series: [bars] });
  cs.groups = [g];
  const ca = catAx('b'), va = valAx('l');
  ca.crossAx = 'v'; va.crossAx = 'c';
  cs.axes = [ca, va];
  if (pareto) {
    const total = vals.reduce((a, v) => a + v, 0) || 1;
    let accum = 0;
    const cum = vals.map((v) => (accum += v) / total);
    const line = blankSeries(1, nameOf(pareto, 1), cum, cats, { line: { paint: solid(acc(1)), w: 2.25 }, ...P.shape(firstChild(pareto, 'cx:spPr')) });
    line.marker = { symbol: 'none', sp: {} };
    line.smooth = false;
    const lg2 = baseGroup('line', 1, ['c2', 'v2'], { grouping: 'standard', series: [line] });
    cs.groups.push(lg2);
    const cb = catAx('b'); cb.id = 'c2'; cb.deleted = true; cb.crossAx = 'v2';
    const v2 = valAx('r', pctEl, 'v2'); v2.crossAx = 'c2'; v2.crosses = 'max';
    // a linha do Pareto não entra na legenda (medido, lo-pareto-gapwidth)
    cs.legend?.deleted.add(1);
    v2.min ??= 0; v2.max ??= 1;
    if (!v2.numFmt) v2.numFmt = { code: '0%', linked: false };
    cs.axes.push(cb, v2);
  }
  return cs;
}
