/**
 * `<c:chartSpace>` (árvore já parseada pelo hospedeiro) → ChartSpace.
 * Cores via `host.color` (o mesmo resolvedor DrawingML que o app usa para as
 * formas — clrMap e modificadores do jeito do app hospedeiro).
 */
import { childElements, firstChild, textContent, descend, node, valNum, valBool, valStr, type XmlNode } from './xml.js';
import type {
  ChartSpace, ChartTitle, TextProps, Paint, LineProps, ShapeProps, ManualLayout, RichPara, NumFmt, DLbls,
  Marker, DataPoint, Series, Group, GroupKind, Axis, Legend, GradStop,
} from './model.js';

export interface ChartHost {
  /** Elemento de cor DrawingML (`a:srgbClr`, `a:schemeClr`… com modificadores) → `#RRGGBB`. */
  color(el: XmlNode): string | undefined;
  /** Fontes do tema (`+mj-lt`/`+mn-lt`). */
  fonts?: { major?: string; minor?: string };
}

const COLOR_TAGS = new Set(['a:srgbClr', 'a:schemeClr', 'a:sysClr', 'a:prstClr', 'a:scrgbClr', 'a:hslClr']);

function colorChild(el: XmlNode | undefined): XmlNode | undefined {
  if (!el) return undefined;
  return childElements(el).find((c) => COLOR_TAGS.has(c.name));
}

function alphaOf(clr: XmlNode | undefined): number | undefined {
  const a = clr ? firstChild(clr, 'a:alpha')?.attrs['val'] : undefined;
  return a !== undefined ? Math.max(0, Math.min(1, parseInt(a, 10) / 100000)) : undefined;
}

class Parser {
  constructor(private host: ChartHost) {}

  color(clr: XmlNode | undefined): string | undefined {
    return clr ? this.host.color(clr) : undefined;
  }

  /** Preenchimento escolhido entre os filhos de `el` (spPr, ln, rPr…). */
  paint(el: XmlNode | undefined): Paint | undefined {
    if (!el) return undefined;
    for (const c of childElements(el)) {
      switch (c.name) {
        case 'a:noFill': return { kind: 'none' };
        case 'a:solidFill': {
          const clr = colorChild(c);
          const col = this.color(clr);
          if (!col) return undefined;
          const a = alphaOf(clr);
          return a !== undefined && a < 1 ? { kind: 'solid', color: col, alpha: a } : { kind: 'solid', color: col };
        }
        case 'a:gradFill': {
          const stops: GradStop[] = [];
          const gs = firstChild(c, 'a:gsLst');
          for (const s of gs ? childElements(gs, 'a:gs') : []) {
            const clr = colorChild(s);
            const col = this.color(clr);
            if (!col) continue;
            const a = alphaOf(clr);
            stops.push({ pos: parseInt(s.attrs['pos'] ?? '0', 10) / 100000, color: col, ...(a !== undefined && a < 1 ? { alpha: a } : {}) });
          }
          if (!stops.length) return undefined;
          stops.sort((a, b) => a.pos - b.pos);
          const lin = firstChild(c, 'a:lin');
          const path = firstChild(c, 'a:path')?.attrs['path'] as 'circle' | 'rect' | 'shape' | undefined;
          return { kind: 'grad', stops, angle: lin ? parseInt(lin.attrs['ang'] ?? '0', 10) / 60000 : 90, ...(path ? { path } : {}) };
        }
        case 'a:pattFill': {
          const fg = this.color(colorChild(firstChild(c, 'a:fgClr'))) ?? '#000000';
          const bg = this.color(colorChild(firstChild(c, 'a:bgClr'))) ?? '#FFFFFF';
          return { kind: 'patt', fg, bg, prst: c.attrs['prst'] ?? 'pct50' };
        }
        case 'a:blipFill': return undefined;
        default: break;
      }
    }
    return undefined;
  }

  line(ln: XmlNode | undefined): LineProps | undefined {
    if (!ln) return undefined;
    const out: LineProps = {};
    const p = this.paint(ln);
    if (p) out.paint = p;
    if (ln.attrs['w']) out.w = parseInt(ln.attrs['w'], 10) / 12700;
    const d = valStr(ln, 'a:prstDash');
    if (d) out.dash = d;
    if (ln.attrs['cap']) out.cap = ln.attrs['cap'];
    return out;
  }

  shape(spPr: XmlNode | undefined): ShapeProps {
    if (!spPr) return {};
    const out: ShapeProps = {};
    const f = this.paint(spPr);
    if (f) out.fill = f;
    const l = this.line(firstChild(spPr, 'a:ln'));
    if (l) out.line = l;
    const sh = descend(firstChild(spPr, 'a:effectLst'), 'a:outerShdw');
    if (sh) {
      const clr = colorChild(sh);
      const dist = parseInt(sh.attrs['dist'] ?? '0', 10) / 12700, dir = parseInt(sh.attrs['dir'] ?? '0', 10) / 60000 * Math.PI / 180;
      out.shadow = { color: this.color(clr) ?? '#000000', alpha: alphaOf(clr) ?? 1, dx: dist * Math.cos(dir), dy: dist * Math.sin(dir), blur: parseInt(sh.attrs['blurRad'] ?? '0', 10) / 12700 };
    }
    return out;
  }

  runProps(rpr: XmlNode | undefined): TextProps {
    const out: TextProps = {};
    if (!rpr) return out;
    const sz = rpr.attrs['sz'];
    if (sz && /^\d+$/.test(sz)) out.sz = parseInt(sz, 10) / 100;
    if (rpr.attrs['b'] !== undefined) out.b = rpr.attrs['b'] === '1' || rpr.attrs['b'] === 'true';
    if (rpr.attrs['i'] !== undefined) out.i = rpr.attrs['i'] === '1' || rpr.attrs['i'] === 'true';
    if (rpr.attrs['u'] !== undefined) out.u = rpr.attrs['u'] !== 'none';
    const fill = this.paint(rpr);
    if (fill?.kind === 'solid') { out.color = fill.color; if (fill.alpha !== undefined) out.alpha = fill.alpha; }
    else if (fill?.kind === 'grad') out.color = fill.stops[0]!.color;
    let face = firstChild(rpr, 'a:latin')?.attrs['typeface'];
    if (face === '+mn-lt') face = this.host.fonts?.minor;
    else if (face === '+mj-lt') face = this.host.fonts?.major;
    if (face && !face.startsWith('+')) out.font = face;
    return out;
  }

  /** `c:txPr` / `c:rich`: corpo (rotação) + 1º `a:defRPr`. */
  textProps(tx: XmlNode | undefined): TextProps {
    if (!tx) return {};
    const out: TextProps = {};
    const body = firstChild(tx, 'a:bodyPr');
    if (body?.attrs['rot'] !== undefined) out.rot = parseInt(body.attrs['rot'], 10) / 60000;
    if (body?.attrs['vert'] && body.attrs['vert'] !== 'horz') out.vert = body.attrs['vert'];
    const p = firstChild(tx, 'a:p');
    const def = p ? firstChild(firstChild(p, 'a:pPr') ?? node('x'), 'a:defRPr') : undefined;
    return { ...this.runProps(def), ...out };
  }

  rich(rich: XmlNode): RichPara[] {
    const out: RichPara[] = [];
    for (const p of childElements(rich, 'a:p')) {
      const ppr = firstChild(p, 'a:pPr');
      const para: RichPara = { runs: [], props: this.runProps(ppr ? firstChild(ppr, 'a:defRPr') : undefined) };
      if (ppr?.attrs['algn']) para.align = ppr.attrs['algn'];
      for (const r of childElements(p)) {
        if (r.name === 'a:r' || r.name === 'a:fld') {
          const t = firstChild(r, 'a:t');
          para.runs.push({ text: t ? textContent(t) : '', props: this.runProps(firstChild(r, 'a:rPr')) });
        } else if (r.name === 'a:br') para.runs.push({ text: '\n', props: this.runProps(firstChild(r, 'a:rPr')) });
      }
      out.push(para);
    }
    return out;
  }

  layout(el: XmlNode | undefined): ManualLayout | undefined {
    const ml = firstChild(firstChild(el, 'c:layout'), 'c:manualLayout');
    if (!ml) return undefined;
    const out: ManualLayout = {};
    const t = valStr(ml, 'c:layoutTarget');
    if (t === 'inner' || t === 'outer') out.target = t;
    const xm = valStr(ml, 'c:xMode'), ym = valStr(ml, 'c:yMode');
    if (xm === 'edge' || xm === 'factor') out.xMode = xm;
    if (ym === 'edge' || ym === 'factor') out.yMode = ym;
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      const v = valNum(ml, `c:${k}`);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  title(el: XmlNode | undefined): ChartTitle | undefined {
    if (!el) return undefined;
    const t: ChartTitle = { overlay: valBool(el, 'c:overlay') ?? false, sp: this.shape(firstChild(el, 'c:spPr')), txPr: this.textProps(firstChild(el, 'c:txPr')) };
    const tx = firstChild(el, 'c:tx');
    const rich = firstChild(tx, 'c:rich');
    if (rich) {
      t.paras = this.rich(rich);
      // rotação/defRPr do corpo rico valem como txPr
      t.txPr = { ...this.textProps(rich), ...t.txPr };
    } else if (tx) {
      const v = descend(tx, 'c:v');
      if (v) t.text = textContent(v);
    }
    const lay = this.layout(el);
    if (lay) t.layout = lay;
    return t;
  }

  numFmt(el: XmlNode | undefined): NumFmt | undefined {
    const nf = firstChild(el, 'c:numFmt');
    if (!nf) return undefined;
    return { code: nf.attrs['formatCode'] ?? 'General', linked: nf.attrs['sourceLinked'] === '1' || nf.attrs['sourceLinked'] === 'true' };
  }

  dLbls(el: XmlNode | undefined): DLbls | undefined {
    if (!el) return undefined;
    const d = this.dLblCommon(el);
    for (const p of childElements(el, 'c:dLbl')) {
      const idx = valNum(p, 'c:idx');
      if (idx === undefined) continue;
      const pd = this.dLblCommon(p) as DLbls & { text?: string; layout?: ManualLayout };
      const rich = firstChild(firstChild(p, 'c:tx'), 'c:rich');
      if (rich) pd.text = this.rich(rich).map((pp) => pp.runs.map((r) => r.text).join('')).join('\n');
      const lay = this.layout(p);
      if (lay) pd.layout = lay;
      (d.points ??= new Map()).set(idx, pd);
    }
    return d;
  }

  private dLblCommon(el: XmlNode): DLbls {
    const d: DLbls = { txPr: this.textProps(firstChild(el, 'c:txPr')), sp: this.shape(firstChild(el, 'c:spPr')) };
    const del = valBool(el, 'c:delete');
    if (del !== undefined) d.delete = del;
    const b = (k: string) => valBool(el, k);
    const sv = b('c:showVal'), sc = b('c:showCatName'), ss = b('c:showSerName'), sp = b('c:showPercent'), sb = b('c:showBubbleSize'), sk = b('c:showLegendKey');
    if (sv !== undefined) d.showVal = sv;
    if (sc !== undefined) d.showCat = sc;
    if (ss !== undefined) d.showSer = ss;
    if (sp !== undefined) d.showPct = sp;
    if (sb !== undefined) d.showBubble = sb;
    if (sk !== undefined) d.showLegendKey = sk;
    const pos = valStr(el, 'c:dLblPos');
    if (pos) d.pos = pos;
    const sep = firstChild(el, 'c:separator');
    if (sep) d.sep = textContent(sep);
    const nf = this.numFmt(el);
    if (nf) d.numFmt = nf;
    return d;
  }

  marker(el: XmlNode | undefined): Marker | undefined {
    if (!el) return undefined;
    const m: Marker = { sp: this.shape(firstChild(el, 'c:spPr')) };
    const s = valStr(el, 'c:symbol');
    if (s) m.symbol = s;
    const z = valNum(el, 'c:size');
    if (z !== undefined) m.size = z;
    return m;
  }

  /** Cache numérico/texto de um `c:val`/`c:cat`/… (Ref ou Lit). */
  nums(el: XmlNode | undefined): { vals: (number | null)[]; fmt?: string } | undefined {
    if (!el) return undefined;
    const cache = descend(el, 'c:numCache') ?? descend(el, 'c:numLit');
    if (!cache) return undefined;
    const n = Math.min(100000, valNum(cache, 'c:ptCount') ?? 0);
    const vals: (number | null)[] = [];
    for (const pt of childElements(cache, 'c:pt')) {
      const i = parseInt(pt.attrs['idx'] ?? '-1', 10);
      if (!(i >= 0 && i < 100000)) continue;
      const v = firstChild(pt, 'c:v');
      const x = v ? parseFloat(textContent(v)) : NaN;
      while (vals.length < i) vals.push(null);
      vals[i] = Number.isFinite(x) ? x : null;
    }
    while (vals.length < n) vals.push(null);
    const fc = firstChild(cache, 'c:formatCode');
    return { vals, ...(fc ? { fmt: textContent(fc) } : {}) };
  }

  strs(el: XmlNode | undefined): string[] | undefined {
    if (!el) return undefined;
    const cache = descend(el, 'c:strCache') ?? descend(el, 'c:strLit');
    if (!cache) return undefined;
    return this.ptStrings(cache);
  }

  private ptStrings(cache: XmlNode): string[] {
    const n = Math.min(100000, valNum(cache, 'c:ptCount') ?? 0);
    const out: string[] = [];
    for (const pt of childElements(cache, 'c:pt')) {
      const i = parseInt(pt.attrs['idx'] ?? '-1', 10);
      if (!(i >= 0 && i < 100000)) continue;
      const v = firstChild(pt, 'c:v');
      while (out.length < i) out.push('');
      out[i] = v ? textContent(v) : '';
    }
    while (out.length < n) out.push('');
    return out;
  }

  series(ser: XmlNode, kind: GroupKind): Series {
    const tx = firstChild(ser, 'c:tx');
    let name = '';
    if (tx) {
      const v = descend(tx, 'c:v');
      if (v) name = textContent(v);
    }
    const s: Series = {
      idx: valNum(ser, 'c:idx') ?? 0, order: valNum(ser, 'c:order') ?? 0, name, values: [],
      sp: this.shape(firstChild(ser, 'c:spPr')), dPts: new Map(), trendlines: [],
    };
    const xy = kind === 'scatter' || kind === 'bubble';
    const val = this.nums(firstChild(ser, xy ? 'c:yVal' : 'c:val'));
    if (val) { s.values = val.vals; if (val.fmt) s.fmt = val.fmt; }
    const catEl = firstChild(ser, xy ? 'c:xVal' : 'c:cat');
    if (catEl) {
      const ml = descend(catEl, 'c:multiLvlStrCache') ?? descend(catEl, 'c:multiLvlStrLit');
      if (ml) {
        const lvls = childElements(ml, 'c:lvl').map((l) => this.ptStrings({ ...l, children: [...l.children, ...(firstChild(ml, 'c:ptCount') ? [firstChild(ml, 'c:ptCount')!] : [])] }));
        if (lvls.length) { s.cats = lvls[0]!; if (lvls.length > 1) s.catLevels = lvls.slice(1); }
      } else {
        const st = this.strs(catEl);
        const nm = st ? undefined : this.nums(catEl);
        if (st) s.cats = st;
        else if (nm) { s.catNums = nm.vals; if (nm.fmt) s.catFmt = nm.fmt; }
      }
      if (xy) {
        const nm = this.nums(catEl);
        if (nm) s.xVals = nm.vals;
      }
    }
    if (kind === 'bubble') { const b = this.nums(firstChild(ser, 'c:bubbleSize')); if (b) s.bubble = b.vals; }
    const mk = this.marker(firstChild(ser, 'c:marker'));
    if (mk) s.marker = mk;
    const sm = valBool(ser, 'c:smooth');
    if (sm !== undefined) s.smooth = sm;
    const inv = valBool(ser, 'c:invertIfNegative');
    if (inv !== undefined) s.invertIfNegative = inv;
    const ex = valNum(ser, 'c:explosion');
    if (ex !== undefined) s.explosion = ex;
    for (const dp of childElements(ser, 'c:dPt')) {
      const i = valNum(dp, 'c:idx');
      if (i === undefined) continue;
      const p: DataPoint = { sp: this.shape(firstChild(dp, 'c:spPr')) };
      const m = this.marker(firstChild(dp, 'c:marker'));
      if (m) p.marker = m;
      const e = valNum(dp, 'c:explosion');
      if (e !== undefined) p.explosion = e;
      const iv = valBool(dp, 'c:invertIfNegative');
      if (iv !== undefined) p.invertIfNegative = iv;
      s.dPts.set(i, p);
    }
    const dl = this.dLbls(firstChild(ser, 'c:dLbls'));
    if (dl) s.dLbls = dl;
    for (const tl of childElements(ser, 'c:trendline')) {
      s.trendlines.push({ kind: valStr(tl, 'c:trendlineType') ?? 'linear', sp: this.shape(firstChild(tl, 'c:spPr')), ...(valNum(tl, 'c:order') !== undefined ? { order: valNum(tl, 'c:order')! } : {}), ...(valNum(tl, 'c:period') !== undefined ? { period: valNum(tl, 'c:period')! } : {}) });
    }
    return s;
  }

  group(el: XmlNode, index: number): Group | undefined {
    const map: Record<string, [GroupKind, boolean]> = {
      'c:barChart': ['bar', false], 'c:bar3DChart': ['bar', true], 'c:lineChart': ['line', false], 'c:line3DChart': ['line', true],
      'c:areaChart': ['area', false], 'c:area3DChart': ['area', true], 'c:pieChart': ['pie', false], 'c:pie3DChart': ['pie', true],
      'c:doughnutChart': ['doughnut', false], 'c:ofPieChart': ['ofPie', false], 'c:scatterChart': ['scatter', false],
      'c:radarChart': ['radar', false], 'c:bubbleChart': ['bubble', false], 'c:stockChart': ['stock', false],
      'c:surfaceChart': ['surface', false], 'c:surface3DChart': ['surface', true],
    };
    const m = map[el.name];
    if (!m) return undefined;
    const [kind, threeD] = m;
    const grouping = (valStr(el, 'c:grouping') ?? (kind === 'bar' ? 'clustered' : 'standard')) as Group['grouping'];
    const g: Group = {
      kind, threeD, index,
      dir: valStr(el, 'c:barDir') === 'bar' ? 'bar' : 'col',
      grouping,
      varyColors: valBool(el, 'c:varyColors') ?? (kind === 'pie' || kind === 'doughnut' || kind === 'ofPie'),
      gapWidth: valNum(el, 'c:gapWidth') ?? 150,
      overlap: valNum(el, 'c:overlap') ?? (grouping === 'stacked' || grouping === 'percentStacked' ? 100 : 0),
      holeSize: valNum(el, 'c:holeSize') ?? 10,
      firstSliceAng: valNum(el, 'c:firstSliceAng') ?? 0,
      showMarker: kind === 'line' ? valBool(el, 'c:marker') ?? false : kind === 'scatter' || kind === 'radar',
      series: childElements(el, 'c:ser').map((s) => this.series(s, kind)),
      axIds: childElements(el, 'c:axId').map((a) => a.attrs['val'] ?? ''),
    };
    const ss = valStr(el, 'c:scatterStyle');
    if (ss) g.scatterStyle = ss;
    const rs = valStr(el, 'c:radarStyle');
    if (rs) g.radarStyle = rs;
    const dl = this.dLbls(firstChild(el, 'c:dLbls'));
    if (dl) g.dLbls = dl;
    const dropL = firstChild(el, 'c:dropLines');
    if (dropL) g.dropLines = this.shape(firstChild(dropL, 'c:spPr'));
    const hl = firstChild(el, 'c:hiLowLines');
    if (hl) g.hiLowLines = this.shape(firstChild(hl, 'c:spPr'));
    const sl = firstChild(el, 'c:serLines');
    if (sl) g.serLines = this.shape(firstChild(sl, 'c:spPr'));
    const ud = firstChild(el, 'c:upDownBars');
    if (ud) g.upDownBars = { gapWidth: valNum(ud, 'c:gapWidth') ?? 150, up: this.shape(firstChild(firstChild(ud, 'c:upBars'), 'c:spPr')), down: this.shape(firstChild(firstChild(ud, 'c:downBars'), 'c:spPr')) };
    const bs = valNum(el, 'c:bubbleScale');
    if (bs !== undefined) g.bubbleScale = bs;
    const sh = valStr(el, 'c:shape');
    if (sh) g.shape = sh;
    const opt = valStr(el, 'c:ofPieType');
    if (opt) g.ofPieType = opt;
    g.series.sort((a, b) => a.order - b.order);
    return g;
  }

  axis(el: XmlNode): Axis | undefined {
    const kinds: Record<string, Axis['kind']> = { 'c:catAx': 'cat', 'c:valAx': 'val', 'c:dateAx': 'date', 'c:serAx': 'ser' };
    const kind = kinds[el.name];
    if (!kind) return undefined;
    const sc = firstChild(el, 'c:scaling');
    const tick = (k: string): Axis['majorTick'] => (valStr(el, k) ?? 'cross') as Axis['majorTick'];
    const a: Axis = {
      id: valStr(el, 'c:axId') ?? '',
      kind,
      pos: (valStr(el, 'c:axPos') ?? 'b') as Axis['pos'],
      deleted: valBool(el, 'c:delete') ?? false,
      reversed: valStr(sc, 'c:orientation') === 'maxMin',
      crosses: (valStr(el, 'c:crosses') ?? 'autoZero') as Axis['crosses'],
      majorTick: tick('c:majorTickMark'),
      minorTick: tick('c:minorTickMark'),
      tickLblPos: (valStr(el, 'c:tickLblPos') ?? 'nextTo') as Axis['tickLblPos'],
      txPr: this.textProps(firstChild(el, 'c:txPr')),
      sp: this.shape(firstChild(el, 'c:spPr')),
      lblOffset: valNum(el, 'c:lblOffset') ?? 100,
      noMultiLvlLbl: valBool(el, 'c:noMultiLvlLbl') ?? false,
    };
    const mn = valNum(sc, 'c:min'), mx = valNum(sc, 'c:max'), lb = valNum(sc, 'c:logBase');
    if (mn !== undefined) a.min = mn;
    if (mx !== undefined) a.max = mx;
    if (lb !== undefined && lb >= 2 && lb <= 1000) a.logBase = lb;
    const mu = valNum(el, 'c:majorUnit'), nu = valNum(el, 'c:minorUnit');
    if (mu !== undefined && mu > 0) a.majorUnit = mu;
    if (nu !== undefined && nu > 0) a.minorUnit = nu;
    const ca = valStr(el, 'c:crossAx');
    if (ca) a.crossAx = ca;
    const cat = valNum(el, 'c:crossesAt');
    if (cat !== undefined) a.crossesAt = cat;
    const cb = valStr(el, 'c:crossBetween');
    if (cb === 'between' || cb === 'midCat') a.crossBetween = cb;
    const mg = firstChild(el, 'c:majorGridlines');
    if (mg) a.majorGrid = this.shape(firstChild(mg, 'c:spPr'));
    const ng = firstChild(el, 'c:minorGridlines');
    if (ng) a.minorGrid = this.shape(firstChild(ng, 'c:spPr'));
    const nf = this.numFmt(el);
    if (nf) a.numFmt = nf;
    const t = this.title(firstChild(el, 'c:title'));
    if (t) a.title = t;
    const ts = valNum(el, 'c:tickLblSkip'), tm = valNum(el, 'c:tickMarkSkip');
    if (ts !== undefined && ts >= 1) a.tickLblSkip = ts;
    if (tm !== undefined && tm >= 1) a.tickMarkSkip = tm;
    const du = firstChild(el, 'c:dispUnits');
    if (du) {
      const UNITS: Record<string, number> = { hundreds: 1e2, thousands: 1e3, tenThousands: 1e4, hundredThousands: 1e5, millions: 1e6, tenMillions: 1e7, hundredMillions: 1e8, billions: 1e9, trillions: 1e12 };
      const b = valStr(du, 'c:builtInUnit');
      const c = valNum(du, 'c:custUnit');
      const f = b ? UNITS[b] : c;
      if (f && f > 0) a.dispUnits = f;
    }
    const bt = valStr(el, 'c:baseTimeUnit');
    if (bt) a.baseTimeUnit = bt;
    return a;
  }

  legend(el: XmlNode | undefined): Legend | undefined {
    if (!el) return undefined;
    const lg: Legend = {
      pos: (valStr(el, 'c:legendPos') ?? 'r') as Legend['pos'],
      overlay: valBool(el, 'c:overlay') ?? false,
      deleted: new Set(),
      txPr: this.textProps(firstChild(el, 'c:txPr')),
      sp: this.shape(firstChild(el, 'c:spPr')),
    };
    for (const e of childElements(el, 'c:legendEntry')) {
      const i = valNum(e, 'c:idx');
      if (i !== undefined && valBool(e, 'c:delete')) lg.deleted.add(i);
    }
    const lay = this.layout(el);
    if (lay) lg.layout = lay;
    return lg;
  }
}

function styleOf(root: XmlNode): number {
  const st = valNum(root, 'c:style');
  if (st !== undefined) return st;
  // <mc:AlternateContent><mc:Choice Requires="c14"><c14:style val="102"/>
  for (const ac of childElements(root, 'mc:AlternateContent')) {
    const v = descend(ac, 'c14:style')?.attrs['val'] ?? descend(ac, 'c:style')?.attrs['val'];
    if (v !== undefined) { const n = parseInt(v, 10); return n > 100 ? n - 100 : n; }
  }
  return 2;
}

export function parseChartSpace(root: XmlNode, host: ChartHost): ChartSpace {
  const P = new Parser(host);
  const scheme = (v: string) => host.color(node('a:schemeClr', { val: v })) ?? '#000000';
  const cs: ChartSpace = {
    style: styleOf(root),
    // ausente = cantos arredondados (o Office desenha assim na moldura dos estilos 33–40)
    roundedCorners: valBool(root, 'c:roundedCorners') ?? true,
    autoTitleDeleted: false,
    groups: [],
    axes: [],
    plotSp: {},
    sp: P.shape(firstChild(root, 'c:spPr')),
    txPr: P.textProps(firstChild(root, 'c:txPr')),
    dispBlanksAs: 'gap',
    accents: [1, 2, 3, 4, 5, 6].map((i) => scheme(`accent${i}`)),
    tx1: scheme('tx1'),
    bg1: scheme('bg1'),
    ...(host.fonts?.minor ? { minorFont: host.fonts.minor } : {}),
    ...(host.fonts?.major ? { majorFont: host.fonts.major } : {}),
  };
  const chart = firstChild(root, 'c:chart');
  if (!chart) return cs;
  const t = P.title(firstChild(chart, 'c:title'));
  if (t) cs.title = t;
  cs.autoTitleDeleted = valBool(chart, 'c:autoTitleDeleted') ?? false;
  const v3 = firstChild(chart, 'c:view3D');
  if (v3) cs.view3D = { rotX: valNum(v3, 'c:rotX') ?? 15, rotY: valNum(v3, 'c:rotY') ?? 20, rAngAx: valBool(v3, 'c:rAngAx') ?? true, perspective: valNum(v3, 'c:perspective') ?? 30, depthPercent: valNum(v3, 'c:depthPercent') ?? 100 };
  for (const [k, f] of [['c:floor', 'floorSp'], ['c:backWall', 'backWallSp'], ['c:sideWall', 'sideWallSp']] as const) {
    const e = firstChild(chart, k);
    if (e) cs[f] = P.shape(firstChild(e, 'c:spPr'));
  }
  const plot = firstChild(chart, 'c:plotArea');
  if (plot) {
    const lay = P.layout(plot);
    if (lay) cs.plotLayout = lay;
    cs.plotSp = P.shape(firstChild(plot, 'c:spPr'));
    let gi = 0;
    for (const c of childElements(plot)) {
      const g = P.group(c, gi);
      if (g) { cs.groups.push(g); gi++; continue; }
      const a = P.axis(c);
      if (a) cs.axes.push(a);
    }
  }
  fixAxes(cs);
  const lg = P.legend(firstChild(chart, 'c:legend'));
  if (lg) cs.legend = lg;
  const db = valStr(chart, 'c:dispBlanksAs');
  if (db === 'gap' || db === 'zero' || db === 'span') cs.dispBlanksAs = db;
  return cs;
}

/**
 * Grupos com eixos ausentes/não casados (XML mínimo, geradores simples): liga ao
 * único par de eixos do plot ou cria o par default (categorias embaixo, valores
 * à esquerda com grade), como o Office faz ao abrir.
 */
function fixAxes(cs: ChartSpace): void {
  const base = (id: string, kind: Axis['kind'], pos: Axis['pos']): Axis => ({
    id, kind, pos, deleted: false, reversed: false, crosses: 'autoZero', majorTick: 'out', minorTick: 'none',
    tickLblPos: 'nextTo', txPr: {}, sp: {}, lblOffset: 100, noMultiLvlLbl: false,
    ...(kind === 'val' ? { majorGrid: {}, crossBetween: 'between' as const } : {}),
  });
  for (const g of cs.groups) {
    if (g.kind === 'pie' || g.kind === 'doughnut' || g.kind === 'ofPie') continue;
    const found = g.axIds.map((id) => cs.axes.find((a) => a.id === id)).filter(Boolean);
    if (found.length >= 2) continue;
    const xy = g.kind === 'scatter' || g.kind === 'bubble';
    const firstKind = xy ? 'val' : 'cat';
    let a0 = cs.axes.find((a) => (xy ? a.kind === 'val' && (a.pos === 'b' || a.pos === 't') : a.kind !== 'val'));
    let a1 = cs.axes.find((a) => a.kind === 'val' && a !== a0);
    if (!a0) { a0 = base('__x' + g.index, firstKind, g.dir === 'bar' ? 'l' : 'b'); cs.axes.push(a0); }
    if (!a1) { a1 = base('__y' + g.index, 'val', g.dir === 'bar' ? 'b' : 'l'); cs.axes.push(a1); }
    if (!a0.id) a0.id = '_x' + g.index;
    if (!a1.id) a1.id = '_y' + g.index;
    a0.crossAx ??= a1.id;
    a1.crossAx ??= a0.id;
    g.axIds = [a0.id, a1.id];
  }
}
