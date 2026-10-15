/**
 * `<c:chartSpace>` (árvore já parseada pelo hospedeiro) → ChartSpace.
 * Cores via `host.color` (o mesmo resolvedor DrawingML que o app usa para as
 * formas — clrMap e modificadores do jeito do app hospedeiro).
 */
import { childElements, firstChild, textContent, descend, node, valNum, valStr, type XmlNode } from './xml.js';
import type {
  ChartSpace, ChartTitle, TextProps, Paint, LineProps, ShapeProps, ManualLayout, RichPara, NumFmt, DLbls,
  Marker, DataPoint, Series, Group, GroupKind, Axis, Legend, GradStop, UserShape, UserText, Trendline,
} from './model.js';
import { parseChartEx } from './chartex.js';

export interface ChartHost {
  /** Elemento de cor DrawingML (`a:srgbClr`, `a:schemeClr`… com modificadores) → `#RRGGBB`. */
  color(el: XmlNode): string | undefined;
  /** Fontes do tema (`+mj-lt`/`+mn-lt`). */
  fonts?: { major?: string; minor?: string };
  /**
   * Estilo de preenchimento `idx` (1–3) do fillStyleLst do tema com phClr =
   * `phClr` — os estilos 17–32 e 41–48 da galeria pintam as séries com o 3º
   * ("intenso"). Sem ele, uma aproximação do tema Office.
   */
  fillStyle?(idx: number, phClr: string): Paint | undefined;
  /**
   * `<a:blip>` de um `a:blipFill` (r:embed nos rels da PARTE do gráfico) →
   * chave opaca da imagem, devolvida decodificada na pintura por
   * `RenderOptions.image`. Sem ele (ou undefined), o preenchimento de imagem é
   * ignorado (cai no default do estilo).
   */
  blip?(blip: XmlNode): string | undefined;
  /**
   * Quem gravou o arquivo muda o sentido de elementos AUSENTES e de booleanos
   * sem `val` (medido no PowerPoint, decks syn-a-mso07/syn-a-mso16 com o MESMO
   * XML e AppVersion 12 × 16):
   * - 'mso2007' (Office 2007, AppVersion 12): `<c:x/>` sem val = FALSO; sem
   *   tiques = principal "out", secundário nenhum; sem `roundedCorners` =
   *   cantos retos; sem `smooth` = linha reta; sem `autoTitleDeleted` = título
   *   automático (série única) não apagado;
   * - 'modern' (2010+): `<c:x/>` = verdadeiro; eixo sem `<c:delete>` = APAGADO;
   *   grupo sem `varyColors` = varia; `dLbls` sem algum show* = mostra;
   * - nos dois: grupo de linhas sem `<c:marker>` mostra os marcadores.
   * Ausente = o comportamento anterior (hospedeiro que não sabe a origem).
   */
  fileFormat?: 'mso2007' | 'modern';
  /**
   * Desenho do gráfico (`c:userShapes` da parte chartDrawing ligada pelos rels
   * do gráfico), já parseado e com prefixos canônicos (`cdr:`, `a:`).
   */
  userShapes?: XmlNode;
  /**
   * Larguras (pt) do `a:lnStyleLst` do tema. O Excel deriva delas a largura
   * default das linhas de série (medido); sem elas vale a regra do PowerPoint.
   */
  themeLineWidths?: number[];
}

/** Preenchimento DrawingML (filho de `el`: noFill/solid/grad/patt) → Paint, com o resolvedor de cor dado. */
export function parsePaint(el: XmlNode, color: (el: XmlNode) => string | undefined): Paint | undefined {
  return new Parser({ color }).paint(el);
}

const COLOR_TAGS = new Set(['a:srgbClr', 'a:schemeClr', 'a:sysClr', 'a:prstClr', 'a:scrgbClr', 'a:hslClr']);

function colorChild(el: XmlNode | undefined): XmlNode | undefined {
  if (!el) return undefined;
  return childElements(el).find((c) => COLOR_TAGS.has(c.name));
}

function alphaOf(clr: XmlNode | undefined): number | undefined {
  // <a:alpha> repetido: o PowerPoint usa o ÚLTIMO (medido)
  const a = clr ? childElements(clr, 'a:alpha').pop()?.attrs['val'] : undefined;
  return a !== undefined ? Math.max(0, Math.min(1, parseInt(a, 10) / 100000)) : undefined;
}

class Parser {
  constructor(private host: ChartHost) {}

  /** Arquivo do Office 2007 / do 2010+ (ver `ChartHost.fileFormat`). */
  get v07(): boolean { return this.host.fileFormat === 'mso2007'; }
  get modern(): boolean { return this.host.fileFormat === 'modern'; }

  /** CT_Boolean: `<c:x/>` sem val = verdadeiro (spec, 2010+); no Office 2007 = falso (medido). */
  bool(el: XmlNode | undefined, name: string): boolean | undefined {
    const c = firstChild(el, name);
    if (!c) return undefined;
    const v = c.attrs['val'];
    if (v === undefined) return !this.v07;
    return v === '1' || v === 'true';
  }

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
        case 'a:blipFill': return this.blipFill(c);
        default: break;
      }
    }
    return undefined;
  }

  /**
   * `a:blipFill` → imagem esticada (`a:stretch`, recuada por `a:fillRect`) ou
   * em ladrilho (`a:tile`; sem nenhum dos dois o PowerPoint também ladrilha no
   * tamanho natural — mesma regra das formas, tdf#128596). A imagem em si só o
   * hospedeiro resolve (rels da parte do gráfico).
   */
  private blipFill(bf: XmlNode): Paint | undefined {
    const blip = firstChild(bf, 'a:blip');
    const ref = blip && this.host.blip ? this.host.blip(blip) : undefined;
    if (!ref) return undefined;
    const out: Extract<Paint, { kind: 'blip' }> = { kind: 'blip', ref };
    const amt = firstChild(blip, 'a:alphaModFix')?.attrs['amt'];
    if (amt !== undefined) {
      const a = parseInt(amt, 10) / 100000;
      if (Number.isFinite(a) && a < 1) out.alpha = Math.max(0, a);
    }
    const tile = firstChild(bf, 'a:tile');
    const stretch = firstChild(bf, 'a:stretch');
    if (tile || !stretch) {
      const n = (k: string, d: number): number => {
        const v = tile?.attrs[k];
        const x = v !== undefined ? parseInt(v, 10) : NaN;
        return Number.isFinite(x) ? x : d;
      };
      const fl = tile?.attrs['flip'];
      out.tile = {
        sx: n('sx', 100000) / 100000, sy: n('sy', 100000) / 100000, tx: n('tx', 0) / 12700, ty: n('ty', 0) / 12700,
        algn: tile?.attrs['algn'] ?? 'tl', ...(fl === 'x' || fl === 'y' || fl === 'xy' ? { flip: fl } : {}),
      };
    } else {
      const fr = firstChild(stretch, 'a:fillRect');
      const v = (k: string): number => {
        const x = fr?.attrs[k] !== undefined ? parseInt(fr.attrs[k]!, 10) / 100000 : 0;
        return Number.isFinite(x) ? x : 0;
      };
      if (fr && (v('l') || v('t') || v('r') || v('b'))) out.fillRect = { l: v('l'), t: v('t'), r: v('r'), b: v('b') };
    }
    return out;
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
      const def = ppr ? firstChild(ppr, 'a:defRPr') : undefined;
      const para: RichPara = { runs: [], props: this.runProps(def) };
      if (!def) para.noDefRPr = true;
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
    const t: ChartTitle = { overlay: this.bool(el, 'c:overlay') ?? false, sp: this.shape(firstChild(el, 'c:spPr')), txPr: this.textProps(firstChild(el, 'c:txPr')) };
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
    const del = this.bool(el, 'c:delete');
    if (del !== undefined) d.delete = del;
    // 2010+: show* ausente num dLbls/dLbl = mostra (medido, syn-a-mso16 #13)
    const b = (k: string) => this.bool(el, k) ?? (this.modern ? true : undefined);
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
  nums(el: XmlNode | undefined): { vals: (number | null)[]; fmt?: string; ptFmts?: (string | undefined)[] } | undefined {
    if (!el) return undefined;
    const cache = descend(el, 'c:numCache') ?? descend(el, 'c:numLit');
    if (!cache) return undefined;
    const n = Math.min(100000, valNum(cache, 'c:ptCount') ?? 0);
    const vals: (number | null)[] = [];
    let ptFmts: (string | undefined)[] | undefined;
    for (const pt of childElements(cache, 'c:pt')) {
      const i = parseInt(pt.attrs['idx'] ?? '-1', 10);
      if (!(i >= 0 && i < 100000)) continue;
      const v = firstChild(pt, 'c:v');
      const x = v ? parseFloat(textContent(v)) : NaN;
      while (vals.length < i) vals.push(null);
      vals[i] = Number.isFinite(x) ? x : null;
      const pf = pt.attrs['formatCode'];
      if (pf) (ptFmts ??= [])[i] = pf;
    }
    while (vals.length < n) vals.push(null);
    const fc = firstChild(cache, 'c:formatCode');
    return { vals, ...(fc ? { fmt: textContent(fc) } : {}), ...(ptFmts ? { ptFmts } : {}) };
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
    if (val) { s.values = val.vals; if (val.fmt) s.fmt = val.fmt; if (val.ptFmts) s.ptFmts = val.ptFmts; }
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
    // Office 2007: sem <c:smooth> = reta (2010+: suave, o default da pintura)
    const sm = this.bool(ser, 'c:smooth') ?? (this.v07 ? false : undefined);
    if (sm !== undefined) s.smooth = sm;
    // 2010+: série de barras sem <c:invertIfNegative> inverte as negativas (medido, syn-a-misc3b #2)
    const inv = this.bool(ser, 'c:invertIfNegative') ?? (this.modern && kind === 'bar' ? true : undefined);
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
      const iv = this.bool(dp, 'c:invertIfNegative');
      if (iv !== undefined) p.invertIfNegative = iv;
      s.dPts.set(i, p);
    }
    const dl = this.dLbls(firstChild(ser, 'c:dLbls'));
    if (dl) s.dLbls = dl;
    for (const tl of childElements(ser, 'c:trendline')) {
      const t: Trendline = { kind: valStr(tl, 'c:trendlineType') ?? 'linear', sp: this.shape(firstChild(tl, 'c:spPr')) };
      const nm = firstChild(tl, 'c:name');
      if (nm) t.name = textContent(nm);
      for (const k of ['order', 'period', 'forward', 'backward', 'intercept'] as const) { const v = valNum(tl, `c:${k}`); if (v !== undefined) t[k] = v; }
      // 2010+: ausentes = mostra a equação e o R² (medido, syn trend2 e lo-trendline)
      const de = this.bool(tl, 'c:dispEq') ?? this.modern, dr = this.bool(tl, 'c:dispRSqr') ?? this.modern;
      if (de) t.dispEq = true;
      if (dr) t.dispRSqr = true;
      const lb = firstChild(tl, 'c:trendlineLbl');
      if (lb) {
        t.label = { txPr: this.textProps(firstChild(lb, 'c:txPr')), sp: this.shape(firstChild(lb, 'c:spPr')) };
        const lay = this.layout(lb), nf = this.numFmt(lb);
        if (lay) t.label.layout = lay;
        if (nf) t.label.numFmt = nf;
      }
      s.trendlines.push(t);
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
      varyColors: this.bool(el, 'c:varyColors') ?? (this.modern || kind === 'pie' || kind === 'doughnut' || kind === 'ofPie'),
      gapWidth: valNum(el, 'c:gapWidth') ?? 150,
      overlap: valNum(el, 'c:overlap') ?? (grouping === 'stacked' || grouping === 'percentStacked' ? 100 : 0),
      holeSize: valNum(el, 'c:holeSize') ?? 10,
      firstSliceAng: valNum(el, 'c:firstSliceAng') ?? 0,
      showMarker: kind === 'line' ? this.bool(el, 'c:marker') ?? !!this.host.fileFormat : kind === 'scatter' || kind === 'radar',
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
    const gdp = valNum(el, 'c:gapDepth');
    if (gdp !== undefined && gdp >= 0) g.gapDepth = gdp;
    const bs = valNum(el, 'c:bubbleScale');
    if (bs !== undefined) g.bubbleScale = bs;
    const sh = valStr(el, 'c:shape');
    if (sh) g.shape = sh;
    const opt = valStr(el, 'c:ofPieType');
    if (opt) g.ofPieType = opt;
    if (kind === 'ofPie') {
      const sp = valNum(el, 'c:splitPos');
      const cust = childElements(firstChild(el, 'c:custSplit') ?? node('x'), 'c:secondPiePt').map((p) => parseInt(p.attrs['val'] ?? '-1', 10)).filter((v) => v >= 0);
      g.ofPie = { splitType: valStr(el, 'c:splitType') ?? 'auto', secondPieSize: valNum(el, 'c:secondPieSize') ?? 75, ...(sp !== undefined ? { splitPos: sp } : {}), ...(cust.length ? { custSplit: cust } : {}) };
    }
    g.series.sort((a, b) => a.order - b.order);
    return g;
  }

  axis(el: XmlNode): Axis | undefined {
    const kinds: Record<string, Axis['kind']> = { 'c:catAx': 'cat', 'c:valAx': 'val', 'c:dateAx': 'date', 'c:serAx': 'ser' };
    const kind = kinds[el.name];
    if (!kind) return undefined;
    const sc = firstChild(el, 'c:scaling');
    // ausente no Office 2007: principal "out", secundário nenhum (medido, gdx-545393 e
    // syn-a-mso07 #1); senão "cross" (o default do schema)
    const tick = (k: string): Axis['majorTick'] => (valStr(el, k) ?? (this.v07 && !firstChild(el, k) ? (k === 'c:majorTickMark' ? 'out' : 'none') : 'cross')) as Axis['majorTick'];
    const a: Axis = {
      id: valStr(el, 'c:axId') ?? '',
      kind,
      pos: (valStr(el, 'c:axPos') ?? 'b') as Axis['pos'],
      deleted: this.bool(el, 'c:delete') ?? this.modern,
      reversed: valStr(sc, 'c:orientation') === 'maxMin',
      crosses: (valStr(el, 'c:crosses') ?? 'autoZero') as Axis['crosses'],
      majorTick: tick('c:majorTickMark'),
      minorTick: tick('c:minorTickMark'),
      tickLblPos: (valStr(el, 'c:tickLblPos') ?? 'nextTo') as Axis['tickLblPos'],
      txPr: this.textProps(firstChild(el, 'c:txPr')),
      sp: this.shape(firstChild(el, 'c:spPr')),
      lblOffset: valNum(el, 'c:lblOffset') ?? 100,
      noMultiLvlLbl: this.bool(el, 'c:noMultiLvlLbl') ?? false,
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
      // 2010+: legenda sem <c:overlay> SOBREPÕE a plotagem (medido no Excel, syn ff16: plotagem até a borda)
      overlay: this.bool(el, 'c:overlay') ?? this.modern,
      deleted: new Set(),
      txPr: this.textProps(firstChild(el, 'c:txPr')),
      sp: this.shape(firstChild(el, 'c:spPr')),
    };
    for (const e of childElements(el, 'c:legendEntry')) {
      const i = valNum(e, 'c:idx');
      if (i !== undefined && this.bool(e, 'c:delete')) lg.deleted.add(i);
    }
    const lay = this.layout(el);
    if (lay) lg.layout = lay;
    return lg;
  }

  /**
   * `c:userShapes` → formas: cada âncora (`relSizeAnchor` from/to em frações,
   * `absSizeAnchor` from + ext em EMU) com sp/pic/cxnSp; grupos achatados com a
   * transformação filho → caixa da âncora (como o desenho da planilha).
   */
  userShapes(root: XmlNode): UserShape[] {
    const out: UserShape[] = [];
    const num = (el: XmlNode | undefined, name: string): number => {
      const c = firstChild(el, name);
      const v = c ? parseFloat(textContent(c)) : NaN;
      return Number.isFinite(v) ? v : 0;
    };
    const attr = (el: XmlNode | undefined, k: string): number => {
      const v = el ? parseFloat(el.attrs[k] ?? '0') : 0;
      return Number.isFinite(v) ? v : 0;
    };
    for (const an of childElements(root)) {
      const rel = an.name === 'cdr:relSizeAnchor', abs = an.name === 'cdr:absSizeAnchor';
      if (!rel && !abs) continue;
      const from = firstChild(an, 'cdr:from'), to = firstChild(an, 'cdr:to'), ext = firstChild(an, 'cdr:ext');
      const x = num(from, 'cdr:x'), y = num(from, 'cdr:y');
      const box = rel
        ? { x, y, w: num(to, 'cdr:x') - x, h: num(to, 'cdr:y') - y }
        : { x, y, w: attr(ext, 'cx') / 12700, h: attr(ext, 'cy') / 12700, abs: true as const };
      if (!(box.w > 0 && box.h > 0)) continue;
      const visit = (el: XmlNode, xf: ((px: number, py: number) => [number, number]) | undefined): void => {
        for (const c of childElements(el)) {
          if (c.name === 'cdr:grpSp') {
            const gx = firstChild(firstChild(c, 'cdr:grpSpPr'), 'a:xfrm');
            const off = firstChild(gx, 'a:off'), e = firstChild(gx, 'a:ext'), cOff = firstChild(gx, 'a:chOff'), cExt = firstChild(gx, 'a:chExt');
            const cw = attr(cExt, 'cx') || attr(e, 'cx') || 1, ch = attr(cExt, 'cy') || attr(e, 'cy') || 1;
            const ew = attr(e, 'cx') || cw, eh = attr(e, 'cy') || ch;
            const ox = attr(off, 'x'), oy = attr(off, 'y'), cx = attr(cOff, 'x'), cy = attr(cOff, 'y');
            visit(c, xf ? (px, py) => xf(ox + (px - cx) * ew / cw, oy + (py - cy) * eh / ch) : (px, py) => [(px - cx) / cw, (py - cy) / ch]);
            continue;
          }
          if (c.name !== 'cdr:sp' && c.name !== 'cdr:pic' && c.name !== 'cdr:cxnSp') continue;
          const nv = descend(c, 'cdr:cNvPr');
          if (nv?.attrs['hidden'] === '1' || nv?.attrs['hidden'] === 'true') continue;
          const spPr = firstChild(c, 'cdr:spPr');
          const xfrm = firstChild(spPr, 'a:xfrm');
          const u: UserShape = { ...box, geom: firstChild(spPr, 'a:prstGeom')?.attrs['prst'] ?? (firstChild(spPr, 'a:custGeom') ? 'custom' : 'rect'), sp: this.shape(spPr) };
          if (xf) {
            const off = firstChild(xfrm, 'a:off'), e = firstChild(xfrm, 'a:ext');
            const ox = attr(off, 'x'), oy = attr(off, 'y');
            const [x0, y0] = xf(ox, oy), [x1, y1] = xf(ox + attr(e, 'cx'), oy + attr(e, 'cy'));
            if (!(x1 > x0 && y1 > y0)) continue;
            u.sub = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          }
          const rot = attr(xfrm, 'rot') / 60000;
          if (rot) u.rot = rot;
          if (xfrm?.attrs['flipH'] === '1') u.flipH = true;
          if (xfrm?.attrs['flipV'] === '1') u.flipV = true;
          // estilo (cdr:style): lnRef/fillRef/fontRef com a cor do tema
          const st = firstChild(c, 'cdr:style');
          const ref = (k: string) => { const r = firstChild(st, k); return r ? { idx: parseInt(r.attrs['idx'] ?? '0', 10) || 0, color: this.color(colorChild(r)) } : undefined; };
          const fr = ref('a:fillRef'), lr = ref('a:lnRef'), fo = ref('a:fontRef');
          if (!u.sp.fill && fr && fr.idx > 0 && fr.color) u.sp.fill = this.host.fillStyle?.(fr.idx, fr.color) ?? { kind: 'solid', color: fr.color };
          if (lr && lr.idx > 0 && lr.color) u.sp.line = { paint: { kind: 'solid', color: lr.color }, w: [0, 0.75, 1, 1.5][Math.min(3, lr.idx)]!, ...u.sp.line };
          if (c.name === 'cdr:cxnSp' && u.geom === 'rect') u.geom = 'line';
          if (c.name === 'cdr:pic') {
            const blip = descend(firstChild(c, 'cdr:blipFill'), 'a:blip');
            const k = blip && this.host.blip ? this.host.blip(blip) : undefined;
            if (k) u.blip = k;
          }
          const tb = firstChild(c, 'cdr:txBody');
          if (tb && childElements(tb, 'a:p').some((p) => descend(p, 'a:t') && textContent(descend(p, 'a:t')!).length)) {
            const body = firstChild(tb, 'a:bodyPr');
            const ins = (k: string, d: number) => (body?.attrs[k] !== undefined ? attr(body, k) / 12700 : d);
            const def = this.runProps(descend(firstChild(firstChild(tb, 'a:lstStyle'), 'a:lvl1pPr'), 'a:defRPr'));
            if (def.color === undefined && fo?.color) def.color = fo.color;
            const vert = body?.attrs['vert'];
            const t: UserText = {
              paras: this.rich(tb),
              ins: { l: ins('lIns', 7.2), t: ins('tIns', 3.6), r: ins('rIns', 7.2), b: ins('bIns', 3.6) },
              anchor: body?.attrs['anchor'] === 'ctr' ? 'ctr' : body?.attrs['anchor'] === 'b' ? 'b' : 't',
              wrap: body?.attrs['wrap'] !== 'none',
              clip: body?.attrs['vertOverflow'] === 'clip',
              def,
            };
            const tr = (vert === 'vert' || vert === 'eaVert' ? 90 : vert === 'vert270' ? -90 : 0) + attr(body, 'rot') / 60000;
            if (tr) t.rot = tr;
            u.text = t;
          }
          out.push(u);
        }
      };
      visit(an, undefined);
    }
    return out;
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
    // linhas default cinza (tx1 75%): gráfico com c14:style OU deck do Office 2007
    // (medido, syn-a-mso07/ticks07: grade #898989 onde o deck 2016 sem c14 pinta preto)
    office2010: P.v07 || childElements(root, 'mc:AlternateContent').some((ac) => !!descend(ac, 'c14:style')),
    // ausente = cantos arredondados (o Office desenha assim na moldura dos estilos 33–40);
    // no Office 2007, ausente = retos (medido, syn-a-mso07 #3)
    roundedCorners: P.bool(root, 'c:roundedCorners') ?? !P.v07,
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
    ...(host.fillStyle ? { themeFill: (idx: number, ph: string) => host.fillStyle!(idx, ph) } : {}),
    ...(host.themeLineWidths?.length ? { themeLn: host.themeLineWidths } : {}),
  };
  // gráfico do Office 2016 (cx:): convertido no modelo do motor
  if (root.name === 'cx:chartSpace') return parseChartEx(root, P, cs);
  const chart = firstChild(root, 'c:chart');
  if (!chart) return cs;
  const t = P.title(firstChild(chart, 'c:title'));
  if (t) cs.title = t;
  cs.autoTitleDeleted = P.bool(chart, 'c:autoTitleDeleted') ?? false;
  const v3 = firstChild(chart, 'c:view3D');
  if (v3) {
    cs.view3D = { rAngAx: P.bool(v3, 'c:rAngAx') ?? true, perspective: valNum(v3, 'c:perspective') ?? 30, depthPercent: valNum(v3, 'c:depthPercent') ?? 100 };
    const rx = valNum(v3, 'c:rotX'), ry = valNum(v3, 'c:rotY'), hp = valNum(v3, 'c:hPercent');
    if (rx !== undefined) cs.view3D.rotX = rx;
    if (ry !== undefined) cs.view3D.rotY = ry;
    if (hp !== undefined) cs.view3D.hPercent = hp;
  }
  for (const [k, f] of [['c:floor', 'floorSp'], ['c:backWall', 'backWallSp'], ['c:sideWall', 'sideWallSp']] as const) {
    const e = firstChild(chart, k);
    if (e) cs[f] = P.shape(firstChild(e, 'c:spPr'));
  }
  const plot = firstChild(chart, 'c:plotArea');
  if (plot) {
    const lay = P.layout(plot);
    if (lay) cs.plotLayout = lay;
    cs.plotSp = P.shape(firstChild(plot, 'c:spPr'));
    const dt = firstChild(plot, 'c:dTable');
    if (dt) {
      cs.dTable = {
        horz: P.bool(dt, 'c:showHorzBorder') ?? false, vert: P.bool(dt, 'c:showVertBorder') ?? false,
        outline: P.bool(dt, 'c:showOutline') ?? false, keys: P.bool(dt, 'c:showKeys') ?? false,
        txPr: P.textProps(firstChild(dt, 'c:txPr')),
      };
    }
    let gi = 0;
    for (const c of childElements(plot)) {
      const g = P.group(c, gi);
      if (g) { cs.groups.push(g); gi++; continue; }
      const a = P.axis(c);
      if (a) cs.axes.push(a);
    }
  }
  fixAxes(cs);
  // Office 2007: série única sem <c:title> e título automático não apagado = título
  // com o nome da série (medido, syn-a-mso07 #10; no 2010+ só com <c:title>)
  if (P.v07 && !cs.title && !cs.autoTitleDeleted && cs.groups.reduce((n, g) => n + g.series.length, 0) === 1) {
    cs.title = { overlay: false, sp: {}, txPr: {} };
  }
  const lg = P.legend(firstChild(chart, 'c:legend'));
  if (lg) cs.legend = lg;
  const db = valStr(chart, 'c:dispBlanksAs');
  if (db === 'gap' || db === 'zero' || db === 'span') cs.dispBlanksAs = db;
  if (host.userShapes) {
    const us = P.userShapes(host.userShapes);
    if (us.length) cs.userShapes = us;
  }
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
