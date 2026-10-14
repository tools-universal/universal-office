/**
 * Layout + pintura de um ChartSpace em canvas 2D, como o Office (Excel e
 * PowerPoint usam o MESMO motor de gráfico). Constantes medidas no oráculo
 * (PowerPoint 365 pt-BR exportando PNG): margens da área do gráfico, distância
 * rótulo↔eixo, passo da legenda, escala automática, cores automáticas.
 */
import type {
  ChartSpace, TextProps, Paint, LineProps, ShapeProps, Series, Group, Axis, DLbls, ManualLayout, RichPara, Marker,
} from './model.js';
import { autoScale, tickValues, frac, type Scale } from './scale.js';
import { adjustLum, rgba, chartShadeTint, tintLinear } from './color.js';
import { formatValue as fmtRaw, builtinFormatCode, PT_BR, type FormatLocale } from './numfmt.js';

/** formatValue com os formatos de data do sistema trocados pelo do locale. */
function formatValue(v: number, code: string, o: { locale: FormatLocale }): { text: string } {
  return fmtRaw(v, localeFmt(code, o.locale), o);
}

/** Seleção de PARTES (animação por série/categoria): `bg` = fundo/eixos/legenda; `data(s, c)` = marca da série s, categoria c. */
export interface ChartSel {
  bg: boolean;
  data: ((s: number, c: number) => boolean) | null;
  key?: string;
}

export interface RenderOptions {
  /** px por ponto tipográfico no destino. */
  pxPerPt: number;
  /** Preenchimento da área do gráfico sem `spPr`: o PowerPoint deixa transparente, o Excel pinta bg1. */
  defaultAreaFill?: 'none' | 'bg1';
  /** Moldura sem `spPr/a:ln` (o Excel desenha — 'auto' = cor das linhas default; o PowerPoint não). */
  defaultAreaLine?: string;
  /** Família CSS para um nome de fonte (o hospedeiro sabe as substitutas). */
  cssFont?: (family: string, bold?: boolean, italic?: boolean) => string;
  locale?: FormatLocale;
  sel?: ChartSel;
}

type Ctx = CanvasRenderingContext2D;
interface Rect { x: number; y: number; w: number; h: number }

// ───────────── constantes medidas (pt) ─────────────
/** Margem interna da área do gráfico. */
const PAD = { t: 5, b: 7.2, l: 6, r: 7.5 };
/** Tique principal "out"/"cross" (comprimento para fora). */
const TICK = 3.75;
const MINOR_TICK = 2.6;
/** Título: deslocamento extra do topo e distância até a área de plotagem. */
const TITLE_TOP = 3.75;
const TITLE_GAP = 6.25;
/** Marcadores automáticos por série. */
const AUTO_SYMBOLS = ['diamond', 'square', 'triangle', 'x', 'star', 'circle', 'plus', 'dot', 'dash'];

interface ResolvedText { sz: number; b: boolean; i: boolean; u: boolean; color: string; alpha: number; font: string; rot?: number; vert?: string }

interface AxisInfo {
  ax: Axis;
  /** Eixo cruzado. */
  cross?: Axis;
  /** Orientação geométrica: 'h' = ao longo do X da tela. */
  dir: 'h' | 'v';
  scale?: Scale;
  /** Categorias (eixo de categorias). */
  cats?: string[];
  catLevels?: string[][];
  nCats?: number;
  /** Pontos nas marcas (midCat) em vez de no meio das faixas. */
  onTicks?: boolean;
  fmt: string;
  groups: Group[];
  /** Rótulos visíveis. */
  showLabels: boolean;
  /** Espaço reservado pelos rótulos+título (px), calculado no layout. */
  extent: number;
  labelRot: number;
  labelLines: string[][];
  labelSkip: number;
  secondary: boolean;
}

export function paintChartSpace(ctx: Ctx, cs: ChartSpace, x: number, y: number, w: number, h: number, o: RenderOptions): void {
  if (!(w > 2 && h > 2)) return;
  new Renderer(ctx, cs, { x, y, w, h }, o).paint();
}

class Renderer {
  private S: number;
  private loc: FormatLocale;
  private sel: ChartSel;
  private base: ResolvedText;
  private seriesIndex = new Map<Series, number>();
  private totalSeries = 0;

  constructor(private ctx: Ctx, private cs: ChartSpace, private area: Rect, private o: RenderOptions) {
    this.S = o.pxPerPt;
    this.loc = o.locale ?? PT_BR;
    this.sel = o.sel ?? { bg: true, data: () => true };
    const dark = cs.style >= 41;
    const t = cs.txPr;
    this.base = {
      sz: t.sz ?? 10, b: t.b ?? false, i: t.i ?? false, u: t.u ?? false,
      color: t.color ?? (dark ? cs.bg1 : cs.tx1), alpha: t.alpha ?? 1,
      font: t.font ?? cs.minorFont ?? 'Calibri',
      ...(t.rot !== undefined ? { rot: t.rot } : {}),
    };
    let k = 0;
    for (const g of cs.groups) for (const s of g.series) this.seriesIndex.set(s, k++);
    this.totalSeries = k;
  }

  private showBg(): boolean { return this.sel.bg; }
  private showData(s: number, c: number): boolean { return !!this.sel.data && this.sel.data(s, c); }

  // ───────────── texto ─────────────
  private text(...layers: (TextProps | undefined)[]): ResolvedText {
    const r: ResolvedText = { ...this.base };
    delete r.rot;
    for (const l of layers) {
      if (!l) continue;
      if (l.sz !== undefined) r.sz = l.sz;
      if (l.b !== undefined) r.b = l.b;
      if (l.i !== undefined) r.i = l.i;
      if (l.u !== undefined) r.u = l.u;
      if (l.color !== undefined) { r.color = l.color; r.alpha = l.alpha ?? 1; }
      if (l.font !== undefined) r.font = l.font;
      if (l.rot !== undefined) r.rot = l.rot;
      if (l.vert !== undefined) r.vert = l.vert;
    }
    return r;
  }

  private font(t: ResolvedText): string {
    const fam = this.o.cssFont ? this.o.cssFont(t.font, t.b, t.i) : `"${t.font}", sans-serif`;
    return `${t.i ? 'italic ' : ''}${t.b ? 'bold ' : ''}${(t.sz * this.S).toFixed(2)}px ${fam}`;
  }

  private measure(s: string, t: ResolvedText): number {
    this.ctx.font = this.font(t);
    return this.ctx.measureText(s).width;
  }

  private lineH(t: ResolvedText): number { return t.sz * this.S * 1.2; }

  /** Quebra em palavras para caber em `maxW` (linhas explícitas '\n' respeitadas). */
  private wrap(s: string, t: ResolvedText, maxW: number): string[] {
    const out: string[] = [];
    for (const para of s.split('\n')) {
      const words = para.split(/(\s+|(?<=-))/).filter((x) => x && x.length);
      let cur = '';
      for (const wd of words) {
        const cand = cur + wd;
        if (cur && /\S/.test(wd) && this.measure(cand.trimEnd(), t) > maxW) { out.push(cur.trimEnd()); cur = wd.trimStart(); }
        else cur = cand;
      }
      out.push(cur.trimEnd());
    }
    return out;
  }

  /** Desenha linhas centradas em (cx, cy) com rotação (graus, negativo = anti-horário). */
  private drawLines(lines: string[], t: ResolvedText, cx: number, cy: number, align: 'left' | 'center' | 'right' = 'center', rot = 0): void {
    const c = this.ctx;
    c.save();
    c.font = this.font(t);
    c.fillStyle = rgba(t.color, t.alpha);
    c.textBaseline = 'middle';
    c.textAlign = align;
    c.translate(cx, cy);
    if (rot) c.rotate(rot * Math.PI / 180);
    const lh = this.lineH(t);
    const y0 = -((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => {
      c.fillText(ln, 0, y0 + i * lh);
      if (t.u) {
        const tw = c.measureText(ln).width;
        const x0 = align === 'center' ? -tw / 2 : align === 'right' ? -tw : 0;
        c.fillRect(x0, y0 + i * lh + t.sz * this.S * 0.45, tw, Math.max(1, t.sz * this.S / 14));
      }
    });
    c.restore();
  }

  // ───────────── pintura de formas ─────────────
  private setFill(p: Paint, r: Rect): boolean {
    const c = this.ctx;
    if (p.kind === 'none') return false;
    if (p.kind === 'solid') { c.fillStyle = rgba(p.color, p.alpha); return true; }
    if (p.kind === 'patt') { c.fillStyle = mixPattern(p.fg, p.bg, p.prst); return true; }
    // gradiente linear (ângulo DrawingML: 0 = esquerda→direita, 90 = cima→baixo)
    const a = p.angle * Math.PI / 180;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const half = (Math.abs(Math.cos(a)) * r.w + Math.abs(Math.sin(a)) * r.h) / 2;
    let g: CanvasGradient;
    if (p.path) {
      const rad = Math.hypot(r.w, r.h) / 2;
      g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rad));
    } else g = c.createLinearGradient(cx - Math.cos(a) * half, cy - Math.sin(a) * half, cx + Math.cos(a) * half, cy + Math.sin(a) * half);
    for (const s of p.stops) g.addColorStop(Math.max(0, Math.min(1, s.pos)), rgba(s.color, s.alpha));
    c.fillStyle = g;
    return true;
  }

  private setLine(l: LineProps, defW = 0.75): boolean {
    const c = this.ctx;
    const p = l.paint;
    if (!p || p.kind === 'none') return false;
    if (p.kind === 'solid') c.strokeStyle = rgba(p.color, p.alpha);
    else if (p.kind === 'grad') c.strokeStyle = rgba(p.stops[0]!.color, p.stops[0]!.alpha);
    else c.strokeStyle = p.fg;
    const w = Math.max(0.5, (l.w ?? defW) * this.S);
    c.lineWidth = w;
    c.setLineDash(dashPattern(l.dash, w));
    c.lineCap = l.cap === 'rnd' ? 'round' : l.cap === 'sq' ? 'square' : 'butt';
    return true;
  }

  /** Retângulo com spPr (fill/linha) e defaults. */
  private shapeRect(r: Rect, sp: ShapeProps, defFill?: Paint, defLine?: LineProps, radius = 0): void {
    const c = this.ctx;
    const fill = sp.fill ?? defFill;
    if (radius > 0) {
      const path = () => { c.beginPath(); c.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, radius); };
      if (fill && this.setFill(fill, r)) { path(); c.fill(); }
      const ln = mergeLine(defLine, sp.line);
      if (ln && this.setLine(ln)) { path(); c.stroke(); c.setLineDash([]); }
      return;
    }
    if (sp.shadow && fill && fill.kind !== 'none') {
      c.save();
      c.shadowColor = rgba(sp.shadow.color, sp.shadow.alpha);
      c.shadowBlur = sp.shadow.blur * this.S;
      c.shadowOffsetX = sp.shadow.dx * this.S;
      c.shadowOffsetY = sp.shadow.dy * this.S;
      if (this.setFill(fill, r)) c.fillRect(r.x, r.y, r.w, r.h);
      c.restore();
    } else if (fill && this.setFill(fill, r)) c.fillRect(r.x, r.y, r.w, r.h);
    const line = mergeLine(defLine, sp.line);
    if (line && this.setLine(line)) {
      // traço fino alinhado ao pixel (moldura/legenda nítidas como no app)
      if (c.lineWidth <= 1.5) { const x0 = Math.round(r.x) + 0.5, y0 = Math.round(r.y) + 0.5; c.strokeRect(x0, y0, Math.round(r.x + r.w) - x0 - 0.5 + 0.5 - 1, Math.round(r.y + r.h) - y0 - 1 + 0.5); } else
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.setLineDash([]);
    }
  }

  // ───────────── cores automáticas ─────────────
  /**
   * Cor automática do índice i de n pelo estilo (c:style): colorido = accents
   * em ordem, voltas além de 6 escurecem/clareiam; monocromático = um accent do
   * escuro ao claro conforme n (sombra/tinta em RGB linear, medido); cinza (estilo 1) = sequência fixa medida.
   */
  private autoColor(i: number, n: number): string {
    const st = this.cs.style;
    const acc = this.cs.accents;
    const scheme = ((st - 1) % 8 + 8) % 8;
    if (scheme === 1) {
      const base = acc[i % 6]!;
      const cycles = Math.floor((Math.max(1, n) - 1) / 6);
      if (cycles === 0) return base;
      return chartShadeTint(base, (Math.floor(i / 6) + 1) / (cycles + 2) - 0.5);
    }
    if (scheme === 0) {
      const GRAYS = ['#616161', '#B3B3B3', '#818181', '#505050', '#D0D0D0', '#999999', '#3F3F3F', '#E2E2E2'];
      return GRAYS[i % GRAYS.length]!;
    }
    const base = acc[scheme - 2]!;
    return chartShadeTint(base, (i + 1) / (Math.max(1, n) + 1) - 0.5);
  }

  /** Preenchimento default da área de plotagem (medido: 34 → #E7E7E7, 42 → #3F3F3F). */
  private plotDefault(): Paint | undefined {
    const row = this.styleRow();
    if (row === 4) return { kind: 'solid', color: adjustLum(this.cs.bg1, -0.094) };
    if (row === 5) return { kind: 'solid', color: adjustLum(this.cs.tx1, 0.25) };
    return undefined;
  }

  /** Linha da galeria de estilos (0 = 1–8 … 5 = 41–48, fundo escuro). */
  private styleRow(): number { return Math.floor((this.cs.style - 1) / 8); }

  /** Preenchimento efetivo de um ponto (série/ponto/automático). */
  private pointFill(g: Group, s: Series, i: number, nPts: number): Paint {
    const dp = s.dPts.get(i);
    if (dp?.sp.fill) return dp.sp.fill;
    if (s.sp.fill && !(g.varyColors && g.series.length === 1 && isPieLike(g))) return s.sp.fill;
    if (g.varyColors && (g.series.length === 1 || isPieLike(g))) return s.sp.fill && !isPieLike(g) ? s.sp.fill : this.styleFill(this.autoColor(i, isPieLike(g) ? g.series.reduce((a, x) => a + x.values.length, 0) : nPts));
    const k = this.seriesIndex.get(s) ?? 0;
    const p = this.styleFill(this.autoColor(k, this.totalSeries));
    return s.sp.fill ?? p;
  }

  /** Efeito do estilo (linhas 4: gradiente "intenso"). */
  private styleFill(color: string): Paint {
    const row = this.styleRow();
    if (row === 2 || row === 3 || row === 5) return { kind: 'grad', angle: 90, stops: [{ pos: 0, color: chartShadeTint(color, 0.065 / 1.41) }, { pos: 0.6, color }, { pos: 1, color: adjustLum(color, -0.08) }] };
    return { kind: 'solid', color };
  }

  private seriesColor(s: Series, g: Group): string {
    const k = this.seriesIndex.get(s) ?? 0;
    const lp = s.sp.line?.paint;
    if ((g.kind === 'line' || g.kind === 'scatter' || g.kind === 'radar') && lp?.kind === 'solid') return lp.color;
    const f = s.sp.fill;
    if (f?.kind === 'solid') return f.color;
    if (f?.kind === 'grad') return f.stops[0]!.color;
    if (lp?.kind === 'solid') return lp.color;
    return this.autoColor(k, this.totalSeries);
  }

  private defaultLine(): LineProps {
    const base = this.cs.style >= 41 ? this.cs.bg1 : this.cs.tx1;
    return { paint: { kind: 'solid', color: this.cs.office2010 ? tintLinear(base, 0.75) : base }, w: 0.75 };
  }

  // ───────────── pintura principal ─────────────
  paint(): void {
    const { ctx: c, cs, area: A } = this;
    c.save();
    try {
      // área do gráfico
      if (this.showBg()) {
        // estilos 33–40: área branca com moldura; 41–48: área tx1 (escura)
        const row = this.styleRow();
        const defFill: Paint | undefined = row === 5 ? { kind: 'solid', color: this.cs.tx1 } : this.o.defaultAreaFill === 'bg1' || row === 4 ? { kind: 'solid', color: cs.bg1 } : undefined;
        const defLine: LineProps | undefined = this.o.defaultAreaLine ? (this.o.defaultAreaLine === 'auto' ? this.defaultLine() : { paint: { kind: 'solid', color: this.o.defaultAreaLine }, w: 0.75 }) : row === 4 ? { paint: { kind: 'solid', color: adjustLum(cs.tx1, 0.7) }, w: 0.75 } : undefined;
        this.shapeRect(A, cs.sp, defFill, defLine, cs.roundedCorners ? 6 * this.o.pxPerPt : 0);
      }
      const S = this.S;
      let inner: Rect = { x: A.x + PAD.l * S, y: A.y + PAD.t * S, w: A.w - (PAD.l + PAD.r) * S, h: A.h - (PAD.t + PAD.b) * S };
      // título
      const title = this.layoutTitle(inner);
      if (title && !title.overlay) { const d = TITLE_TOP * S + title.h + TITLE_GAP * S; inner = { ...inner, y: inner.y + d, h: inner.h - d }; }
      // legenda
      const legend = this.layoutLegend(inner);
      if (legend && !legend.overlay) inner = legend.rest;
      // área de plotagem + eixos
      const pie = cs.groups.length > 0 && cs.groups.every(isPieLike);
      if (pie) this.paintPies(inner);
      else if (cs.groups.some((g) => g.kind === 'radar')) this.paintRadar(inner);
      else if (cs.groups.length) this.paintAxesChart(inner);
      if (legend && this.showBg()) this.paintLegend(legend);
      if (title && this.showBg()) this.paintTitle(title);
    } finally {
      c.restore();
    }
  }

  // ───────────── título ─────────────
  private titleText(): { paras: RichPara[] } | undefined {
    const t = this.cs.title;
    if (!t) return undefined;
    if (t.paras) return t.paras.some((p) => p.runs.some((r) => r.text.trim())) ? { paras: t.paras } : undefined;
    if (t.text) return { paras: [{ runs: [{ text: t.text, props: {} }], props: {} }] };
    // título automático: nome da série única, senão "Título do Gráfico"
    const all = this.cs.groups.flatMap((g) => g.series);
    const g0 = this.cs.groups[0];
    const name = all.length === 1 || g0 && isPieLike(g0) && all[0] ? all[0]!.name : 'Título do Gráfico';
    return { paras: [{ runs: [{ text: name, props: {} }], props: {} }] };
  }

  private layoutTitle(inner: Rect): { lines: { text: string; t: ResolvedText }[][]; x: number; y: number; w: number; h: number; overlay: boolean } | undefined {
    const t = this.cs.title;
    if (!t || this.cs.autoTitleDeleted && !t.paras && !t.text) return undefined;
    const tt = this.titleText();
    if (!tt) return undefined;
    const S = this.S;
    const maxW = inner.w * 0.8;
    const lines: { text: string; t: ResolvedText }[][] = [];
    for (const p of tt.paras) {
      // cada parágrafo: runs com estilo; quebra simples por largura (por run)
      let cur: { text: string; t: ResolvedText }[] = [];
      let curW = 0;
      for (const r of p.runs) {
        const rt = this.text({ sz: t.paras || t.text ? this.base.sz : 18, b: true }, t.txPr, p.props, r.props);
        if (r.text === '\n') { lines.push(cur); cur = []; curW = 0; continue; }
        for (const piece of r.text.split(/(\s+)/)) {
          if (!piece) continue;
          const pw = this.measure(piece, rt);
          if (curW + pw > maxW && curW > 0 && /\S/.test(piece)) { lines.push(cur); cur = []; curW = 0; if (!/\S/.test(piece)) continue; }
          cur.push({ text: piece, t: rt });
          curW += pw;
        }
      }
      lines.push(cur);
    }
    const lh = (ln: { t: ResolvedText }[]) => Math.max(...ln.map((r) => this.lineH(r.t)), this.lineH(this.text({ sz: this.base.sz }, t.txPr)));
    const h = lines.reduce((a, ln) => a + lh(ln), 0);
    const w = Math.max(...lines.map((ln) => ln.reduce((a, r) => a + this.measure(r.text, r.t), 0)));
    let x = inner.x + (inner.w - w) / 2, y = inner.y + TITLE_TOP * this.S;
    if (t.layout) {
      const A = this.area;
      if (t.layout.x !== undefined) x = A.x + t.layout.x * A.w;
      if (t.layout.y !== undefined) y = A.y + t.layout.y * A.h;
    }
    void S;
    return { lines, x, y, w, h, overlay: t.overlay };
  }

  private paintTitle(T: { lines: { text: string; t: ResolvedText }[][]; x: number; y: number; w: number; h: number }): void {
    const c = this.ctx;
    const t = this.cs.title!;
    this.shapeRect({ x: T.x - 3, y: T.y - 2, w: T.w + 6, h: T.h + 4 }, t.sp);
    let y = T.y;
    for (const ln of T.lines) {
      const lh = Math.max(...ln.map((r) => this.lineH(r.t)), 1);
      const lw = ln.reduce((a, r) => a + this.measure(r.text, r.t), 0);
      let x = T.x + (T.w - lw) / 2;
      for (const r of ln) {
        c.font = this.font(r.t);
        c.fillStyle = rgba(r.t.color, r.t.alpha);
        c.textBaseline = 'middle';
        c.textAlign = 'left';
        c.fillText(r.text, x, y + lh / 2);
        x += c.measureText(r.text).width;
      }
      y += lh;
    }
  }

  // ───────────── legenda ─────────────
  private legendEntries(): { label: string; kind: 'box' | 'line'; s: Series; g: Group; pt?: number }[] {
    const out: { label: string; kind: 'box' | 'line'; s: Series; g: Group; pt?: number }[] = [];
    const cs = this.cs;
    for (const g of cs.groups) {
      const vary = g.varyColors && (isPieLike(g) || g.series.length === 1 && g.kind !== 'line' && g.kind !== 'scatter' && g.kind !== 'area');
      if (vary && g.series[0]) {
        const s = g.series[0];
        const n = Math.max(s.values.length, s.cats?.length ?? 0);
        for (let i = 0; i < n; i++) out.push({ label: s.cats?.[i] ?? this.catNumLabel(s, i), kind: 'box', s, g, pt: i });
      } else {
        for (const s of g.series) out.push({ label: s.name || `Série${(this.seriesIndex.get(s) ?? 0) + 1}`, kind: g.kind === 'line' || g.kind === 'scatter' || g.kind === 'radar' && g.radarStyle !== 'filled' ? 'line' : 'box', s, g });
      }
    }
    const lg = cs.legend;
    const kept = out.filter((_, i) => !lg?.deleted.has(i));
    // Office lista de baixo para cima quando as séries empilham na vertical
    const vertical = !!lg && (lg.pos === 'r' || lg.pos === 'l' || lg.pos === 'tr');
    const rev = cs.groups.some((g) => g.kind === 'bar' && g.dir === 'bar') || vertical && cs.groups.some((g) => g.kind === 'bar' && g.grouping !== 'clustered' || g.kind === 'area' && g.grouping !== 'standard');
    if (rev) kept.reverse();
    return kept;
  }

  private catNumLabel(s: Series, i: number): string {
    const v = s.catNums?.[i];
    if (v === undefined || v === null) return String(i + 1);
    return formatValue(v, s.catFmt ?? 'General', { locale: this.loc }).text;
  }

  private layoutLegend(inner: Rect): { entries: ReturnType<Renderer['legendEntries']>; t: ResolvedText; rows: { x: number; y: number; e: ReturnType<Renderer['legendEntries']>[number] }[]; box: Rect; rest: Rect; overlay: boolean } | undefined {
    const lg = this.cs.legend;
    if (!lg) return undefined;
    const entries = this.legendEntries();
    if (!entries.length) return undefined;
    const t = this.text(lg.txPr);
    const S = this.S, em = t.sz * S;
    const key = (e: { kind: string }) => (e.kind === 'line' ? em * 1.9 : em * 0.52);
    const gapKey = em * 0.25;
    const pitch = this.lineH(t) + 6 * S;
    const widths = entries.map((e) => key(e) + gapKey + this.measure(e.label, t));
    const rows: { x: number; y: number; e: (typeof entries)[number] }[] = [];
    let box: Rect;
    let rest = inner;
    const vertical = lg.pos === 'r' || lg.pos === 'l' || lg.pos === 'tr';
    if (vertical) {
      const bw = Math.min(Math.max(...widths), inner.w * 0.5) + 4 * S;
      const visible = Math.max(1, Math.min(entries.length, Math.floor(inner.h / pitch)));
      const bh = visible * pitch;
      const bx = lg.pos === 'l' ? inner.x : inner.x + inner.w - bw;
      const by = lg.pos === 'tr' ? inner.y : inner.y + (inner.h - bh) / 2;
      box = { x: bx, y: by, w: bw, h: bh };
      entries.slice(0, visible).forEach((e, i) => rows.push({ x: bx + 2 * S, y: by + pitch * (i + 0.5), e }));
      const gap = 11 * S + em * 0.4;
      rest = lg.pos === 'l' ? { x: inner.x + bw + gap, y: inner.y, w: inner.w - bw - gap, h: inner.h } : { x: inner.x, y: inner.y, w: inner.w - bw - gap, h: inner.h };
    } else {
      const sp = em * 1.2;
      const lines: number[][] = [[]];
      let lw = 0;
      widths.forEach((wd, i) => {
        const cur = lines[lines.length - 1]!;
        if (cur.length && lw + sp + wd > inner.w) { lines.push([i]); lw = wd; } else { cur.push(i); lw += (cur.length > 1 ? sp : 0) + wd; }
      });
      const bh = lines.length * pitch;
      const by = lg.pos === 't' ? inner.y : inner.y + inner.h - bh;
      let maxW = 0;
      lines.forEach((ln, r) => {
        const tw = ln.reduce((a, i) => a + widths[i]!, 0) + sp * (ln.length - 1);
        maxW = Math.max(maxW, tw);
        let x = inner.x + (inner.w - tw) / 2;
        for (const i of ln) { rows.push({ x, y: by + pitch * (r + 0.5), e: entries[i]! }); x += widths[i]! + sp; }
      });
      box = { x: inner.x + (inner.w - maxW) / 2, y: by, w: maxW, h: bh };
      const gap = 4 * S;
      rest = lg.pos === 't' ? { x: inner.x, y: inner.y + bh + gap, w: inner.w, h: inner.h - bh - gap } : { x: inner.x, y: inner.y, w: inner.w, h: inner.h - bh - gap };
    }
    if (lg.layout) {
      const A = this.area;
      const dx = lg.layout.x !== undefined ? A.x + lg.layout.x * A.w - box.x : 0;
      const dy = lg.layout.y !== undefined ? A.y + lg.layout.y * A.h - box.y : 0;
      box = { ...box, x: box.x + dx, y: box.y + dy };
      for (const r of rows) { r.x += dx; r.y += dy; }
    }
    return { entries, t, rows, box, rest, overlay: lg.overlay };
  }

  private paintLegend(L: NonNullable<ReturnType<Renderer['layoutLegend']>>): void {
    const c = this.ctx;
    const S = this.S, em = L.t.sz * S;
    this.shapeRect({ x: L.box.x - 2 * S, y: L.box.y, w: L.box.w + 4 * S, h: L.box.h }, this.cs.legend!.sp);
    for (const r of L.rows) {
      const { e } = r;
      let x = r.x;
      if (e.kind === 'line') {
        const kw = em * 1.9;
        const col = this.seriesColor(e.s, e.g);
        const ln = mergeLine({ paint: { kind: 'solid', color: col }, w: e.g.kind === 'line' || e.g.kind === 'scatter' ? 2.25 : 0.75 }, e.s.sp.line);
        if (this.setLine(ln!)) { c.beginPath(); c.moveTo(x, r.y); c.lineTo(x + kw, r.y); c.stroke(); c.setLineDash([]); }
        const m = this.markerOf(e.g, e.s, -1);
        if (m) this.paintMarker(m, x + kw / 2, r.y, e.s, e.g, Math.min(m.size, 7));
        x += kw;
      } else {
        const k = em * 0.52;
        const fill = e.pt !== undefined ? this.pointFill(e.g, e.s, e.pt, e.s.values.length) : this.pointFill(e.g, e.s, -1, 1);
        const kr = { x, y: r.y - k / 2, w: k, h: k };
        if (this.setFill(fill, kr)) c.fillRect(kr.x, kr.y, kr.w, kr.h);
        const dpLine = e.pt !== undefined ? e.s.dPts.get(e.pt)?.sp.line : undefined;
        const line = mergeLine(e.s.sp.line, dpLine);
        if (line && this.setLine(line)) { c.strokeRect(kr.x, kr.y, kr.w, kr.h); c.setLineDash([]); }
        x += k;
      }
      this.drawLines([e.label], L.t, x + em * 0.25, r.y, 'left');
    }
  }

  // ───────────── gráficos com eixos ─────────────
  private axisById(id: string | undefined): Axis | undefined {
    return id === undefined ? undefined : this.cs.axes.find((a) => a.id === id);
  }

  private paintAxesChart(outer: Rect): void {
    const cs = this.cs;
    const S = this.S;
    // eixos por grupo: [cat/x, val/y]
    const infos = new Map<Axis, AxisInfo>();
    const primary = cs.groups[0]!;
    const primIds = new Set(primary.axIds);
    for (const g of cs.groups) {
      const a0 = this.axisById(g.axIds[0]), a1 = this.axisById(g.axIds[1]);
      if (!a0 || !a1) continue;
      const horizBars = g.kind === 'bar' && g.dir === 'bar';
      for (const [a, other, isCat] of [[a0, a1, true], [a1, a0, false]] as const) {
        let inf = infos.get(a);
        if (!inf) {
          const dir: 'h' | 'v' = (isCat ? !horizBars : horizBars) ? 'h' : 'v';
          inf = { ax: a, cross: other, dir, fmt: 'General', groups: [], showLabels: !a.deleted && a.tickLblPos !== 'none', extent: 0, labelRot: 0, labelLines: [], labelSkip: 1, secondary: !primIds.has(a.id) };
          infos.set(a, inf);
        }
        inf.groups.push(g);
      }
    }
    this.infosCache = [...infos.values()];
    // escalas
    const valueish = (inf: AxisInfo) => inf.ax.kind === 'val';
    for (const inf of infos.values()) {
      if (valueish(inf)) this.prepValueAxis(inf);
      else this.prepCatAxis(inf);
    }
    // layout iterativo: reserva rótulos nos lados
    let plot = this.plotRect(outer, [...infos.values()]);
    // 3D com eixos em ângulo reto (rAngAx, o padrão): projeção OBLÍQUA — a
    // profundidade sobe para a direita, D = L·(sen rotY, −sen rotX) (proporção
    // medida nos gráficos 3D do oráculo: 15°/20° → (32, −24) px), e o plano da
    // frente encolhe para caber o fundo
    this.depth = undefined;
    const g3 = cs.groups.find((g) => g.threeD && (g.kind === 'bar' || g.kind === 'line' || g.kind === 'area'));
    if (g3 && cs.view3D?.rAngAx !== false) {
      const L = 0.155 * plot.w * Math.max(0.2, (cs.view3D?.depthPercent ?? 100) / 100);
      const rx = (cs.view3D?.rotX ?? 15) * Math.PI / 180, ry = (cs.view3D?.rotY ?? 20) * Math.PI / 180;
      const dx = L * Math.sin(ry), dy = L * Math.sin(rx);
      this.depth = { dx, dy, gapDepth: 150 };
      plot = { x: plot.x, y: plot.y + dy, w: plot.w - dx, h: plot.h - dy };
      for (const inf of infos.values()) this.measureAxis(inf, plot);
    }
    // grade e área de plotagem
    if (this.showBg()) {
      this.shapeRect(plot, cs.plotSp, this.plotDefault());
      for (const inf of infos.values()) this.paintGrid(inf, plot, true);
      for (const inf of infos.values()) this.paintGrid(inf, plot, false);
    }
    // séries (ordem do plotArea; barras/áreas antes de linhas no mesmo plano como o Office)
    const order = [...cs.groups].sort((a, b) => rank(a) - rank(b) || a.index - b.index);
    for (const g of order) {
      const a0 = this.axisById(g.axIds[0]), a1 = this.axisById(g.axIds[1]);
      const ci = a0 ? infos.get(a0) : undefined, vi = a1 ? infos.get(a1) : undefined;
      if (!ci || !vi) continue;
      if (g.kind === 'bar') this.paintBars(g, ci, vi, plot);
      else if (g.kind === 'area') this.paintArea(g, ci, vi, plot);
      else if (g.kind === 'line' || g.kind === 'stock') this.paintLineGroup(g, ci, vi, plot);
      else if (g.kind === 'scatter') this.paintScatter(g, ci, vi, plot);
      else if (g.kind === 'bubble') this.paintBubbles(g, ci, vi, plot);
    }
    if (this.showBg()) { for (const inf of infos.values()) this.paintAxis(inf, plot); this.paintFloor3D(plot); }
    for (const g of order) {
      const a0 = this.axisById(g.axIds[0]), a1 = this.axisById(g.axIds[1]);
      const ci = a0 ? infos.get(a0) : undefined, vi = a1 ? infos.get(a1) : undefined;
      if (ci && vi) this.paintDataLabels(g, ci, vi, plot);
    }
    void S;
  }

  private stackedTotals(g: Group, nCats: number): { pos: number[]; neg: number[] } {
    const pos = new Array<number>(nCats).fill(0), neg = new Array<number>(nCats).fill(0);
    for (const s of g.series) for (let i = 0; i < nCats; i++) { const v = s.values[i] ?? 0; if (v >= 0) pos[i] = pos[i]! + v; else neg[i] = neg[i]! + v; }
    return { pos, neg };
  }

  private prepValueAxis(inf: AxisInfo, len?: number): void {
    let lo = Infinity, hi = -Infinity;
    let pct = false;
    const isX = inf.groups.some((g) => (g.kind === 'scatter' || g.kind === 'bubble') && this.axisById(g.axIds[0]) === inf.ax);
    for (const g of inf.groups) {
      if (isX) {
        for (const s of g.series) {
          const xs = s.xVals && s.xVals.length ? s.xVals : s.values.map((_, i) => i + 1);
          for (const v of xs) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        }
        continue;
      }
      if (g.grouping === 'percentStacked') { pct = true; lo = Math.min(lo, 0); hi = Math.max(hi, 1); const nC = Math.max(...g.series.map((s) => s.values.length)); const t = this.stackedTotals(g, nC); if (t.neg.some((v) => v < 0)) lo = -1; continue; }
      if (g.grouping === 'stacked' && (g.kind === 'bar' || g.kind === 'area' || g.kind === 'line')) {
        const nC = Math.max(...g.series.map((s) => s.values.length));
        const t = this.stackedTotals(g, nC);
        for (let i = 0; i < nC; i++) { lo = Math.min(lo, t.neg[i]!, t.pos[i]!); hi = Math.max(hi, t.pos[i]!, t.neg[i]!); }
        continue;
      }
      for (const s of g.series) for (const v of s.values) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    // 100% empilhado: só quando todos os grupos do eixo são (misturado, o app usa a escala dos outros)
    if (pct && !inf.groups.every((g) => g.grouping === 'percentStacked')) pct = false;
    const a = inf.ax;
    const L = len ?? (inf.dir === 'v' ? this.area.h * 0.75 : this.area.w * 0.75);
    const em = this.text(a.txPr).sz * this.S;
    // densidade (medida variando a altura do gráfico): vertical = ⌊(altura − 14 pt)/linha de texto⌋ − 1
    // (limiar medido com 10 e 18 pt: o PowerPoint pede 14 pt a mais que 8 linhas para 7 divisões)
    // divisões (teto 10); horizontal bem mais esparsa (≥ 72 pt ou o rótulo + 2 em)
    const lblW = this.measure(formatValue(Math.max(Math.abs(lo), Math.abs(hi)) * 1.1, pickFmt(a.numFmt, pct ? '0%' : inf.groups[0]?.series[0]?.fmt), { locale: this.loc }).text, this.text(a.txPr));
    const wide = inf.dir === 'h' ? Math.max(lblW + em * 2, 72 * this.S) : Math.max(21 * this.S, this.lineH(this.text(a.txPr)) * 1.05);
    // 3D: sem a folga de 5% e com a mesma densidade nos dois sentidos (medido no oráculo)
    const is3D = inf.groups.some((g) => g.threeD);
    const maxDiv = inf.dir === 'h' && !is3D ? Math.max(2, Math.min(10, Math.floor(L / wide))) : Math.max(1, Math.min(10, Math.floor((L - (inf.dir === 'v' ? 14 * this.S : 0)) / this.lineH(this.text(a.txPr))) - 1));
    const pctFix = pct ? { min: a.min ?? (lo < 0 ? -1 : 0), max: a.max ?? 1 } : {};
    inf.scale = autoScale(lo, hi, maxDiv, { ...pctFix, ...(a.min !== undefined ? { min: a.min } : {}), ...(a.max !== undefined ? { max: a.max } : {}), ...(a.majorUnit !== undefined ? { major: a.majorUnit } : {}), ...(a.minorUnit !== undefined ? { minor: a.minorUnit } : {}), ...(a.logBase ? { log: a.logBase } : {}) }, is3D ? 0 : 0.05);
    const firstSer = inf.groups[0]?.series[0];
    inf.fmt = pickFmt(a.numFmt, pct ? '0%' : isX ? firstSer?.catFmt : firstSer?.fmt);
  }

  private prepCatAxis(inf: AxisInfo): void {
    let n = 0;
    let cats: string[] | undefined;
    let levels: string[][] | undefined;
    let src: Series | undefined;
    for (const g of inf.groups) for (const s of g.series) {
      n = Math.max(n, s.values.length, s.cats?.length ?? 0, s.catNums?.length ?? 0);
      if (!cats && (s.cats || s.catNums)) { src = s; cats = s.cats; levels = s.catLevels; }
    }
    inf.nCats = Math.max(1, n);
    const a = inf.ax;
    const fmt = pickFmt(a.numFmt, src?.catFmt);
    inf.fmt = fmt;
    if (!cats) cats = Array.from({ length: inf.nCats }, (_, i) => (src?.catNums?.[i] !== undefined && src.catNums[i] !== null ? formatValue(src.catNums[i]!, fmt === 'General' && a.kind === 'date' ? 'dd/mm/yyyy' : fmt, { locale: this.loc }).text : String(i + 1)));
    inf.cats = cats;
    if (levels && !a.noMultiLvlLbl) inf.catLevels = levels;
    const cb = inf.cross?.crossBetween;
    // barras ocupam faixas: o Office ignora midCat quando há barras no eixo
    inf.onTicks = !inf.groups.some((g) => g.kind === 'bar') && (cb === 'midCat' || (cb === undefined && inf.groups.every((g) => g.kind === 'area' || g.kind === 'scatter')));
  }

  /** Rótulos de um eixo de valores. */
  private valueLabels(inf: AxisInfo): { v: number; s: string }[] {
    const sc = inf.scale!;
    const div = inf.ax.dispUnits ?? 1;
    return tickValues(sc).map((v) => ({ v, s: formatValue(v / div, inf.fmt, { locale: this.loc }).text }));
  }

  private tickLen(kind: Axis['majorTick']): { out: number; inn: number } {
    const L = TICK * this.S;
    return kind === 'out' ? { out: L, inn: 0 } : kind === 'in' ? { out: 0, inn: L } : kind === 'cross' ? { out: L, inn: L } : { out: 0, inn: 0 };
  }

  /** Retângulo interno de plotagem: desconta rótulos/títulos de eixo de cada lado (iterando 2×). */
  private plotRect(outer: Rect, infos: AxisInfo[]): Rect {
    const S = this.S;
    const pl = this.cs.plotLayout;
    let r = { ...outer };
    if (pl && pl.w !== undefined && pl.h !== undefined) {
      const A = this.area;
      const x = pl.xMode === 'factor' ? outer.x + (pl.x ?? 0) * A.w : A.x + (pl.x ?? 0) * A.w;
      const y = pl.yMode === 'factor' ? outer.y + (pl.y ?? 0) * A.h : A.y + (pl.y ?? 0) * A.h;
      r = { x, y, w: pl.w * A.w, h: pl.h * A.h };
      if (pl.target !== 'outer') { for (const inf of infos) this.measureAxis(inf, r); return r; }
    }
    let plot = { ...r };
    for (let it = 0; it < 3; it++) {
      const ext = { l: 0, r: 0, t: 0, b: 0 };
      for (const inf of infos) {
        this.measureAxis(inf, plot);
        const side = this.axisSide(inf);
        ext[side] = Math.max(ext[side], inf.extent);
      }
      // meia altura do rótulo extremo de um eixo vertical vaza para cima/baixo
      const vAx = infos.find((i) => i.dir === 'v' && i.showLabels);
      const halfT = vAx ? this.lineH(this.text(vAx.ax.txPr)) / 2 : 0;
      const t = Math.max(ext.t, halfT - 1 * S), b = Math.max(ext.b, ext.b === 0 ? halfT : 0);
      const hAx = infos.find((i) => i.dir === 'h' && i.showLabels && i.scale);
      const halfR = hAx ? this.measure(this.valueLabels(hAx).at(-1)?.s ?? '', this.text(hAx.ax.txPr)) / 2 : 0;
      // categorias nas marcas (área/linha midCat): o último rótulo centrado na borda direita
      const cAx = infos.find((i) => i.dir === 'h' && i.showLabels && !i.scale && i.onTicks && !i.labelRot);
      const halfC = cAx ? Math.max(0, ...(cAx.labelLines.at(-1) ?? [cAx.cats?.at(-1) ?? '']).map((l) => this.measure(l, this.text(cAx.ax.txPr)))) / 2 : 0;
      plot = { x: r.x + ext.l, y: r.y + t, w: r.w - ext.l - Math.max(ext.r, halfR, halfC), h: r.h - t - b };
      if (plot.w < 10 || plot.h < 10) { plot = { x: r.x + r.w * 0.1, y: r.y + r.h * 0.1, w: r.w * 0.8, h: r.h * 0.8 }; break; }
    }
    return plot;
  }

  private axisSide(inf: AxisInfo): 'l' | 'r' | 't' | 'b' {
    const p = inf.ax.pos;
    if (inf.dir === 'v') return p === 'r' ? 'r' : p === 'l' ? 'l' : inf.secondary ? 'r' : 'l';
    return p === 't' ? 't' : p === 'b' ? 'b' : inf.secondary ? 't' : 'b';
  }

  /** Mede rótulos (decide rotação/quebra/salto das categorias) e guarda `extent`. */
  private measureAxis(inf: AxisInfo, plot: Rect): void {
    if (inf.ax.kind === 'val') this.prepValueAxis(inf, inf.dir === 'v' ? plot.h : plot.w);
    const S = this.S;
    const a = inf.ax;
    const t = this.text(a.txPr);
    const em = t.sz * S;
    const tk = this.tickLen(a.majorTick);
    let ext = 0;
    if (inf.showLabels) {
      const gap = tk.out + em * 0.6;
      if (inf.scale) {
        const labels = this.valueLabels(inf);
        if (inf.dir === 'v') ext = Math.max(0, ...labels.map((l) => this.measure(l.s, t))) + gap;
        else ext = this.lineH(t) + tk.out + em * 0.3;
      } else {
        const n = inf.nCats ?? 1;
        const band = (inf.dir === 'h' ? plot.w : plot.h) / Math.max(1, inf.onTicks ? n - 1 || 1 : n);
        const cats = inf.cats ?? [];
        const rot = t.rot;
        inf.labelSkip = a.tickLblSkip ?? 1;
        if (inf.dir === 'h') {
          const ws = cats.map((s) => this.measure(s, t));
          const maxW = Math.max(0, ...ws);
          if (rot !== undefined && rot !== 0 && Math.abs(rot) <= 90) {
            inf.labelRot = rot;
            inf.labelLines = cats.map((s) => [s]);
            const rad = Math.abs(rot) * Math.PI / 180;
            ext = maxW * Math.sin(rad) + this.lineH(t) * Math.cos(rad) + tk.out + em * 0.3;
          } else if (maxW <= band * 0.98 || rot === 0) {
            inf.labelRot = 0;
            inf.labelLines = cats.map((s) => (rot === 0 && this.measure(s, t) > band ? this.wrap(s, t, band) : [s]));
            ext = Math.max(1, ...inf.labelLines.map((l) => l.length)) * this.lineH(t) + tk.out + em * 0.3;
          } else {
            // quebra em palavras se couber em até 3 linhas sem palavra maior que a faixa
            const wrapped = cats.map((s) => this.wrap(s, t, band * 0.98));
            const okWrap = wrapped.every((ls) => ls.length <= 3 && ls.every((l) => this.measure(l, t) <= band * 1.02));
            if (okWrap) {
              inf.labelRot = 0;
              inf.labelLines = wrapped;
              ext = Math.max(...wrapped.map((l) => l.length)) * this.lineH(t) + tk.out + em * 0.3;
            } else {
              inf.labelRot = -45;
              inf.labelLines = cats.map((s) => [s]);
              const lh = this.lineH(t);
              if (a.tickLblSkip === undefined) inf.labelSkip = Math.max(1, Math.ceil(lh * 1.05 / (band * Math.SQRT1_2)));
              ext = Math.min(maxW * Math.SQRT1_2 + lh * Math.SQRT1_2, this.area.h * 0.45) + tk.out + em * 0.3;
            }
          }
        } else {
          inf.labelLines = cats.map((s) => this.wrap(s, t, this.area.w * 0.4));
          const lh = this.lineH(t);
          if (a.tickLblSkip === undefined) inf.labelSkip = Math.max(1, Math.ceil(lh * 1.0 / Math.max(1, band)));
          ext = Math.max(0, ...inf.labelLines.flat().map((s) => this.measure(s, t))) + tk.out + em * 0.6;
        }
        if (inf.catLevels) ext += inf.catLevels.length * (this.lineH(t) + em * 0.3);
      }
    } else ext = tk.out;
    if (a.title) {
      const tt = this.text({ sz: this.base.sz, b: true }, a.title.txPr);
      const vertical = inf.dir === 'v' && (a.title.txPr.rot === undefined ? true : Math.abs(a.title.txPr.rot) === 90);
      ext += (vertical ? this.lineH(tt) : this.lineH(tt)) + 5 * S;
    }
    inf.extent = ext;
  }

  /** Posição na tela (x ou y) de um valor/categoria num eixo, dado o retângulo de plotagem. */
  private pos(inf: AxisInfo, plot: Rect, v: number, center = true): number {
    let f: number;
    if (inf.scale) f = frac(inf.scale, v);
    else {
      const n = inf.nCats ?? 1;
      f = inf.onTicks ? (n > 1 ? v / (n - 1) : 0.5) : (v + (center ? 0.5 : 0)) / n;
    }
    if (inf.ax.reversed) f = 1 - f;
    return inf.dir === 'h' ? plot.x + f * plot.w : plot.y + plot.h - f * plot.h;
  }

  /** Onde o eixo `inf` cruza o eixo perpendicular (coordenada na direção perpendicular). */
  private crossPos(inf: AxisInfo, other: AxisInfo | undefined, plot: Rect): number {
    const a = inf.ax;
    if (!other) return inf.dir === 'h' ? plot.y + plot.h : plot.x;
    const side = this.axisSide(inf);
    if (other.scale) {
      const sc = other.scale;
      let v: number;
      if (a.crossesAt !== undefined) v = a.crossesAt;
      else if (a.crosses === 'max') v = sc.hi;
      else if (a.crosses === 'min') v = sc.lo;
      else v = sc.log ? sc.lo : Math.max(sc.lo, Math.min(sc.hi, 0));
      // eixo secundário sem crosses explícito fica no lado oposto
      if (inf.secondary && a.crosses === 'autoZero' && a.crossesAt === undefined) return side === 'r' ? plot.x + plot.w : side === 't' ? plot.y : this.pos(other, plot, v);
      return this.pos(other, plot, v);
    }
    // cruza um eixo de categorias: na primeira (ou última) categoria
    const n = other.nCats ?? 1;
    const atMax = a.crosses === 'max' || (inf.secondary && a.crosses === 'autoZero');
    let edge = atMax !== other.ax.reversed;
    if (a.crossesAt !== undefined && a.crossesAt > 1) { const k = Math.min(n, a.crossesAt) - 1; return this.pos(other, plot, k, !other.onTicks); }
    return other.dir === 'h' ? (edge ? plot.x + plot.w : plot.x) : (edge ? plot.y : plot.y + plot.h);
  }

  private paintGrid(inf: AxisInfo, plot: Rect, minor: boolean): void {
    const a = inf.ax;
    const sp = minor ? a.minorGrid : a.majorGrid;
    if (!sp) return;
    const c = this.ctx;
    const line = mergeLine(this.defaultLine(), sp.line);
    if (!line || !this.setLine(line)) return;
    const pts: number[] = [];
    if (inf.scale) {
      const sc = inf.scale;
      const vals = minor ? (sc.log ? minorLog(sc) : tickValues(sc, sc.minor)) : tickValues(sc);
      for (const v of vals) pts.push(this.pos(inf, plot, v));
    } else {
      const n = inf.nCats ?? 1;
      const k = inf.onTicks ? n : n + 1;
      for (let i = 0; i < k; i++) pts.push(this.pos(inf, plot, i, false));
    }
    c.beginPath();
    const D = this.depth;
    for (const p of pts) {
      const q = Math.round(p) + (Math.round(c.lineWidth) % 2 ? 0.5 : 0);
      if (D) {
        // 3D: a grade fica na parede do fundo + o traço na parede lateral (v) ou no piso (h)
        if (inf.dir === 'v') { c.moveTo(plot.x, q); c.lineTo(plot.x + D.dx, q - D.dy); c.lineTo(plot.x + plot.w + D.dx, q - D.dy); }
        else { c.moveTo(q, plot.y + plot.h); c.lineTo(q + D.dx, plot.y + plot.h - D.dy); c.lineTo(q + D.dx, plot.y - D.dy); }
        continue;
      }
      if (inf.dir === 'v') { c.moveTo(plot.x, q); c.lineTo(plot.x + plot.w, q); } else { c.moveTo(q, plot.y); c.lineTo(q, plot.y + plot.h); }
    }
    c.stroke();
    c.setLineDash([]);
  }

  /** Arestas do piso 3D (frente já é a linha do eixo; desenha o lado direito). */
  private paintFloor3D(plot: Rect): void {
    const D = this.depth;
    if (!D || !this.showBg()) return;
    const c = this.ctx;
    const line = this.defaultLine();
    if (!this.setLine(line)) return;
    const y = plot.y + plot.h, x = plot.x + plot.w;
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x + D.dx, y - D.dy);
    c.stroke();
  }

  private paintAxis(inf: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    const a = inf.ax;
    if (a.deleted) return;
    const S = this.S;
    const other = inf.cross ? [...this.allInfos(plot)].find((i) => i.ax === inf.cross) : undefined;
    const at = this.crossPos(inf, other, plot);
    const side = this.axisSide(inf);
    const sgn = side === 'l' || side === 't' ? -1 : 1; // para fora
    // linha do eixo
    const line = mergeLine(this.defaultLine(), a.sp.line);
    const q = Math.round(at) + 0.5;
    if (line && this.setLine(line)) {
      c.beginPath();
      if (inf.dir === 'v') { c.moveTo(q, plot.y); c.lineTo(q, plot.y + plot.h); } else { c.moveTo(plot.x, q); c.lineTo(plot.x + plot.w, q); }
      c.stroke();
      c.setLineDash([]);
      // tiques
      const maj = this.tickLen(a.majorTick);
      const tickPos: number[] = [];
      const minorPos: number[] = [];
      if (inf.scale) {
        for (const v of tickValues(inf.scale)) tickPos.push(this.pos(inf, plot, v));
        if (a.minorTick !== 'none') for (const v of inf.scale.log ? minorLog(inf.scale) : tickValues(inf.scale, inf.scale.minor)) minorPos.push(this.pos(inf, plot, v));
      } else {
        const n = inf.nCats ?? 1;
        const skip = a.tickMarkSkip ?? 1;
        const k = inf.onTicks ? n : n + 1;
        for (let i = 0; i < k; i += skip) tickPos.push(this.pos(inf, plot, i, false));
      }
      const tick = (p: number, out: number, inn: number) => {
        const pp = Math.round(p) + 0.5;
        if (inf.dir === 'v') { c.moveTo(q + sgn * out, pp); c.lineTo(q - sgn * inn, pp); } else { c.moveTo(pp, q + sgn * out); c.lineTo(pp, q - sgn * inn); }
      };
      if (maj.out || maj.inn) { c.beginPath(); for (const p of tickPos) tick(p, maj.out, maj.inn); c.stroke(); }
      if (a.minorTick !== 'none' && minorPos.length) {
        const m = MINOR_TICK * S;
        const mo = a.minorTick === 'out' || a.minorTick === 'cross' ? m : 0, mi = a.minorTick === 'in' || a.minorTick === 'cross' ? m : 0;
        c.beginPath(); for (const p of minorPos) tick(p, mo, mi); c.stroke();
      }
    }
    // rótulos
    if (inf.showLabels) this.paintAxisLabels(inf, plot, at, sgn);
    if (a.title) this.paintAxisTitle(inf, plot);
  }

  private infosCache?: AxisInfo[];
  /** Profundidade 3D (px) do gráfico atual, quando há grupo 3D com eixos em ângulo reto. */
  private depth: { dx: number; dy: number; gapDepth: number } | undefined;
  private allInfos(_plot: Rect): AxisInfo[] { return this.infosCache ?? []; }

  private paintAxisLabels(inf: AxisInfo, plot: Rect, at: number, sgn: number): void {
    const a = inf.ax;
    const t = this.text(a.txPr);
    const S = this.S, em = t.sz * S;
    const tk = this.tickLen(a.majorTick);
    // tickLblPos low/high: rótulos na borda do plot e não junto do eixo
    let base = at;
    const side = this.axisSide(inf);
    if (a.tickLblPos === 'low') base = side === 'l' || side === 'r' ? (inf.dir === 'v' ? plot.x : plot.y + plot.h) : inf.dir === 'h' ? plot.y + plot.h : plot.x;
    else if (a.tickLblPos === 'high') base = inf.dir === 'v' ? plot.x + plot.w : plot.y;
    const sg = a.tickLblPos === 'high' ? -sgn : sgn;
    if (inf.scale) {
      for (const { v, s } of this.valueLabels(inf)) {
        const p = this.pos(inf, plot, v);
        if (inf.dir === 'v') {
          const x = base + sg * (tk.out + em * 0.6);
          this.drawLines([s], t, x, p, sg < 0 ? 'right' : 'left');
        } else {
          const y = base + sg * (tk.out + em * 0.3 + this.lineH(t) / 2);
          this.drawLines([s], t, p, y, 'center');
        }
      }
      return;
    }
    const n = inf.nCats ?? 1;
    const lh = this.lineH(t);
    for (let i = 0; i < n; i += inf.labelSkip) {
      const lines = inf.labelLines[i] ?? [inf.cats?.[i] ?? ''];
      if (!lines.some((l) => l)) continue;
      const p = this.pos(inf, plot, i, true);
      if (inf.dir === 'h') {
        const y0 = base + sg * (tk.out + em * 0.3);
        if (inf.labelRot) {
          // rotacionado: o FIM do texto encosta no eixo (âncora à direita)
          const c = this.ctx;
          c.save();
          c.font = this.font(t);
          c.fillStyle = rgba(t.color, t.alpha);
          c.translate(p, y0 + sg * lh * 0.25);
          c.rotate(inf.labelRot * Math.PI / 180);
          c.textAlign = inf.labelRot < 0 ? 'right' : 'left';
          c.textBaseline = 'middle';
          c.fillText(lines.join(' '), 0, 0);
          c.restore();
        } else this.drawLines(lines, t, p, y0 + sg * (lines.length * lh) / 2, 'center');
      } else {
        const x = base + sg * (tk.out + em * 0.6);
        this.drawLines(lines, t, x, p, sg < 0 ? 'right' : 'left');
      }
    }
    // níveis extras (multinível): faixas agrupando categorias iguais
    if (inf.catLevels && inf.dir === 'h') {
      let y = base + sg * (inf.extent - inf.catLevels.length * (lh + em * 0.3) - (a.title ? 0 : 0));
      for (const lvl of inf.catLevels) {
        y += sg * (lh * 0.5 + em * 0.3);
        let start = 0;
        for (let i = 1; i <= n; i++) {
          if (i < n && !lvl[i]) continue;
          const label = lvl[start] ?? '';
          if (label) this.drawLines([label], t, (this.pos(inf, plot, start, false) + this.pos(inf, plot, i, false)) / 2, y, 'center');
          start = i;
        }
        y += sg * lh * 0.5;
      }
    }
  }

  private paintAxisTitle(inf: AxisInfo, plot: Rect): void {
    const a = inf.ax;
    const at = a.title!;
    const tt = this.text({ sz: this.base.sz, b: true }, at.txPr);
    const paras = at.paras ?? [{ runs: [{ text: at.text ?? 'Título do Eixo', props: {} }], props: {} }];
    const text = paras.map((p) => p.runs.map((r) => r.text).join('')).join('\n');
    const t = this.text({ sz: this.base.sz, b: true }, at.txPr, paras[0]?.props, paras[0]?.runs[0]?.props);
    void tt;
    const side = this.axisSide(inf);
    const S = this.S;
    if (inf.dir === 'v') {
      const rot = at.txPr.rot ?? -90;
      const x = side === 'l' ? plot.x - inf.extent + this.lineH(t) / 2 : plot.x + plot.w + inf.extent - this.lineH(t) / 2;
      this.drawLines(text.split('\n'), t, x, plot.y + plot.h / 2, 'center', rot === 0 ? 0 : rot);
    } else {
      const y = side === 'b' ? plot.y + plot.h + inf.extent - this.lineH(t) / 2 : plot.y - inf.extent + this.lineH(t) / 2;
      this.drawLines(text.split('\n'), t, plot.x + plot.w / 2, y, 'center');
    }
    void S;
  }

  // ───────────── barras ─────────────
  private paintBars(g: Group, ci: AxisInfo, vi: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    const n = ci.nCats ?? 1;
    const horiz = g.dir === 'bar';
    const stacked = g.grouping !== 'clustered';
    const ns = stacked ? 1 : g.series.length;
    const ov = stacked ? 1 : Math.max(-1, Math.min(1, g.overlap / 100));
    const gap = g.gapWidth / 100;
    const bandPx = (horiz ? plot.h : plot.w) / n;
    const barW = bandPx / (1 + (ns - 1) * (1 - ov) + gap);
    const span = barW * (1 + (ns - 1) * (1 - ov));
    const tot = g.grouping === 'percentStacked' ? this.stackedTotals(g, n) : undefined;
    const base = { pos: new Array<number>(n).fill(0), neg: new Array<number>(n).fill(0) };
    const vs = vi.scale!;
    const zero = vs.log ? vs.lo : Math.max(vs.lo, Math.min(vs.hi, 0));
    // séries em ordem; nas barras horizontais a 1ª fica embaixo (ordem do eixo)
    g.series.forEach((s, si) => {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      for (let i = 0; i < n; i++) {
        const raw = s.values[i];
        if (raw === null || raw === undefined) continue;
        let v = raw;
        if (tot) { const sum = tot.pos[i]! - tot.neg[i]!; v = sum ? raw / sum : 0; }
        let v0 = zero, v1 = v;
        if (stacked) {
          if (v >= 0) { v0 = base.pos[i]!; v1 = v0 + v; base.pos[i] = v1; } else { v0 = base.neg[i]!; v1 = v0 + v; base.neg[i] = v1; }
        }
        if (!this.showData(sIdx, i)) continue;
        const bandStart = this.pos(ci, plot, i, false);
        const dirSign = ci.ax.reversed ? -1 : 1;
        let off = (bandPx - span) / 2 + (stacked ? 0 : si * barW * (1 - ov));
        let p0: number;
        if (!horiz) p0 = ci.ax.reversed ? bandStart - bandPx + off : bandStart + off;
        else p0 = ci.ax.reversed ? bandStart + off : bandStart - bandPx + (bandPx - off - barW);
        void dirSign;
        const a0 = this.pos(vi, plot, Math.max(vs.lo, Math.min(vs.hi, v0)));
        const a1 = this.pos(vi, plot, Math.max(vs.lo, Math.min(vs.hi, v1)));
        const r: Rect = horiz ? { x: Math.min(a0, a1), y: p0, w: Math.abs(a1 - a0), h: barW } : { x: p0, y: Math.min(a0, a1), w: barW, h: Math.abs(a1 - a0) };
        let fill = this.pointFill(g, s, i, n);
        const dp = s.dPts.get(i);
        const inv = dp?.invertIfNegative ?? s.invertIfNegative;
        if (inv && raw < 0 && fill.kind === 'solid') fill = { kind: 'solid', color: this.cs.bg1 };
        const sp: ShapeProps = { ...s.sp, ...(dp?.sp ?? {}) };
        const line = mergeLine(s.sp.line, dp?.sp.line);
        if (this.depth) this.box3D(r, fill, line);
        else this.shapeRect(r, { ...(sp.shadow ? { shadow: sp.shadow } : {}), ...(line ? { line } : {}) }, fill);
        off = 0;
      }
    });
    void c;
  }

  /**
   * Barra 3D (caixa): frente na fatia do meio da profundidade (folga
   * gapDepth = 150%), topo e lado direito sombreados (−25% / −45% de luz).
   */
  private box3D(r: Rect, fill: Paint, line?: LineProps): void {
    const D = this.depth!;
    const c = this.ctx;
    const f = 1 / (1 + D.gapDepth / 100);
    const g = (1 - f) / 2;
    const fx = r.x + D.dx * g, fy = r.y - D.dy * g;
    const bx = D.dx * f, by = -D.dy * f;
    const base = fill.kind === 'solid' ? fill.color : fill.kind === 'grad' ? fill.stops[Math.floor(fill.stops.length / 2)]!.color : fill.kind === 'patt' ? fill.fg : undefined;
    const face = (pts: [number, number][], color: string | undefined, p?: Paint) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      if (p) { if (this.setFill(p, { x: fx, y: fy, w: r.w, h: r.h })) c.fill(); }
      else if (color) { c.fillStyle = color; c.fill(); }
      if (line && this.setLine(line)) { c.stroke(); c.setLineDash([]); }
    };
    if (fill.kind === 'none') return;
    face([[fx + r.w, fy], [fx + r.w + bx, fy + by], [fx + r.w + bx, fy + r.h + by], [fx + r.w, fy + r.h]], base && adjustLum(base, -0.45));
    face([[fx, fy], [fx + bx, fy + by], [fx + r.w + bx, fy + by], [fx + r.w, fy]], base && adjustLum(base, -0.25));
    face([[fx, fy], [fx + r.w, fy], [fx + r.w, fy + r.h], [fx, fy + r.h]], undefined, fill);
  }

  // ───────────── linhas ─────────────
  private markerOf(g: Group, s: Series, i: number): (Marker & { size: number }) | undefined {
    const dp = i >= 0 ? s.dPts.get(i)?.marker : undefined;
    const sym = dp?.symbol ?? s.marker?.symbol ?? (g.showMarker || g.kind === 'scatter' && g.scatterStyle !== 'line' && g.scatterStyle !== 'smooth' ? 'auto' : 'none');
    if (sym === 'none') return undefined;
    const k = this.seriesIndex.get(s) ?? 0;
    const symbol = sym === 'auto' ? AUTO_SYMBOLS[k % AUTO_SYMBOLS.length]! : sym;
    return { symbol, size: dp?.size ?? s.marker?.size ?? (this.styleRow() === 0 ? 5 : 7), sp: { ...(s.marker?.sp ?? {}), ...(dp?.sp ?? {}) } };
  }

  private paintMarker(m: Marker & { size: number }, x: number, y: number, s: Series, g: Group, sizeOverride?: number): void {
    const c = this.ctx;
    const col = this.seriesColor(s, g);
    const sz = (sizeOverride ?? m.size) * this.S * 1.33;
    const r = sz / 2;
    const fill = m.sp.fill ?? { kind: 'solid', color: col };
    const line = mergeLine({ paint: { kind: 'solid', color: col }, w: 0.75 }, m.sp.line);
    c.beginPath();
    switch (m.symbol) {
      case 'circle': c.arc(x, y, r, 0, Math.PI * 2); break;
      case 'diamond': c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); break;
      case 'triangle': c.moveTo(x, y - r); c.lineTo(x + r, y + r); c.lineTo(x - r, y + r); c.closePath(); break;
      case 'square': c.rect(x - r, y - r, sz, sz); break;
      case 'dot': c.rect(x - r / 2, y - r / 2, r, r); break;
      case 'dash': c.rect(x - r, y - r / 4, sz, r / 2); break;
      case 'x': case 'star': case 'plus': {
        c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r);
        if (m.symbol === 'star') { c.moveTo(x, y - r); c.lineTo(x, y + r); }
        if (m.symbol === 'plus') { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); }
        const ln = mergeLine({ paint: { kind: 'solid', color: col }, w: 0.75 }, m.sp.line) ?? { paint: { kind: 'solid', color: col }, w: 0.75 };
        if (this.setLine(ln)) { c.stroke(); c.setLineDash([]); }
        return;
      }
      default: c.arc(x, y, r, 0, Math.PI * 2);
    }
    if (this.setFill(fill, { x: x - r, y: y - r, w: sz, h: sz })) c.fill();
    if (line && this.setLine(line)) { c.stroke(); c.setLineDash([]); }
  }

  private seriesLine(g: Group, s: Series): LineProps | undefined {
    const col = this.seriesColor(s, g);
    return mergeLine({ paint: { kind: 'solid', color: col }, w: this.styleRow() === 0 ? 2.25 : 4.5, cap: 'rnd' }, s.sp.line);
  }

  private pathThrough(pts: ({ x: number; y: number } | null)[], smooth: boolean, span: boolean): void {
    const c = this.ctx;
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    for (const p of pts) {
      if (!p) { if (!span && cur.length) { segs.push(cur); cur = []; } continue; }
      cur.push(p);
    }
    if (cur.length) segs.push(cur);
    c.beginPath();
    for (const sg of segs) {
      c.moveTo(sg[0]!.x, sg[0]!.y);
      if (!smooth || sg.length < 3) { for (let i = 1; i < sg.length; i++) c.lineTo(sg[i]!.x, sg[i]!.y); continue; }
      for (let i = 0; i < sg.length - 1; i++) {
        const p0 = sg[Math.max(0, i - 1)]!, p1 = sg[i]!, p2 = sg[i + 1]!, p3 = sg[Math.min(sg.length - 1, i + 2)]!;
        c.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
      }
    }
  }

  private paintLineGroup(g: Group, ci: AxisInfo, vi: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    const n = ci.nCats ?? 1;
    const stacked = g.grouping !== 'standard';
    const tot = g.grouping === 'percentStacked' ? this.stackedTotals(g, n) : undefined;
    const acc = new Array<number>(n).fill(0);
    const pts: ({ x: number; y: number } | null)[][] = [];
    for (const s of g.series) {
      const row: ({ x: number; y: number } | null)[] = [];
      for (let i = 0; i < n; i++) {
        const raw = s.values[i];
        if (raw === null || raw === undefined) { row.push(this.cs.dispBlanksAs === 'zero' ? this.pt(ci, vi, plot, i, stacked ? acc[i]! : 0) : null); continue; }
        let v = raw;
        if (tot) { const sum = tot.pos[i]! - tot.neg[i]!; v = sum ? raw / sum : 0; }
        if (stacked) { acc[i] = acc[i]! + v; v = acc[i]!; }
        row.push(this.pt(ci, vi, plot, i, v));
      }
      pts.push(row);
    }
    // linhas de máximo-mínimo e barras de alta/baixa (ações)
    if (g.hiLowLines && this.showBg()) {
      const line = mergeLine(this.defaultLine(), g.hiLowLines.line);
      if (line && this.setLine(line)) {
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const ys = pts.map((r) => r[i]).filter((p): p is { x: number; y: number } => !!p);
          if (ys.length < 2) continue;
          c.moveTo(ys[0]!.x, Math.min(...ys.map((p) => p.y))); c.lineTo(ys[0]!.x, Math.max(...ys.map((p) => p.y)));
        }
        c.stroke(); c.setLineDash([]);
      }
    }
    if (g.upDownBars && pts.length >= 2) {
      const bw = (plot.w / n) / (1 + g.upDownBars.gapWidth / 100);
      for (let i = 0; i < n; i++) {
        const a = pts[0]![i], b = pts[pts.length - 1]![i];
        if (!a || !b) continue;
        const up = b.y < a.y;
        this.shapeRect({ x: a.x - bw / 2, y: Math.min(a.y, b.y), w: bw, h: Math.abs(a.y - b.y) }, up ? g.upDownBars.up : g.upDownBars.down, { kind: 'solid', color: up ? this.cs.bg1 : this.cs.tx1 }, this.defaultLine());
      }
    }
    if (g.dropLines && this.showBg()) {
      const line = mergeLine(this.defaultLine(), g.dropLines.line);
      if (line && this.setLine(line)) {
        c.beginPath();
        for (const row of pts) for (const p of row) if (p) { c.moveTo(p.x, p.y); c.lineTo(p.x, plot.y + plot.h); }
        c.stroke(); c.setLineDash([]);
      }
    }
    g.series.forEach((s, si) => {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      const row = pts[si]!.map((p, i) => (p && this.showData(sIdx, i) ? p : null));
      const line = g.kind === 'stock' && !s.sp.line ? undefined : this.seriesLine(g, s);
      const smooth = s.smooth ?? true;
      if (line && this.setLine(line)) {
        c.lineJoin = 'round';
        this.pathThrough(row, smooth, this.cs.dispBlanksAs === 'span');
        c.stroke();
        c.setLineDash([]);
      }
      row.forEach((p, i) => {
        if (!p) return;
        const m = this.markerOf(g, s, i);
        if (m) this.paintMarker(m, p.x, p.y, s, g);
      });
    });
  }

  private pt(ci: AxisInfo, vi: AxisInfo, plot: Rect, i: number, v: number): { x: number; y: number } {
    const vs = vi.scale!;
    const vv = vs.log ? v : Math.max(vs.lo - (vs.hi - vs.lo), Math.min(vs.hi + (vs.hi - vs.lo), v));
    const a = this.pos(ci, plot, i, true), b = this.pos(vi, plot, vv);
    return ci.dir === 'h' ? { x: a, y: b } : { x: b, y: a };
  }

  // ───────────── áreas ─────────────
  private paintArea(g: Group, ci: AxisInfo, vi: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    const n = ci.nCats ?? 1;
    const stacked = g.grouping !== 'standard';
    const tot = g.grouping === 'percentStacked' ? this.stackedTotals(g, n) : undefined;
    let prev = new Array<number>(n).fill(0);
    const vs = vi.scale!;
    const zero = vs.log ? vs.lo : Math.max(vs.lo, Math.min(vs.hi, 0));
    g.series.forEach((s) => {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      const cur = new Array<number>(n).fill(0);
      for (let i = 0; i < n; i++) {
        let v = s.values[i] ?? 0;
        if (tot) { const sum = tot.pos[i]! - tot.neg[i]!; v = sum ? v / sum : 0; }
        cur[i] = stacked ? prev[i]! + v : v;
      }
      if ([...Array(n).keys()].some((i) => this.showData(sIdx, i))) {
        c.beginPath();
        for (let i = 0; i < n; i++) { const p = this.pt(ci, vi, plot, i, cur[i]!); if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
        for (let i = n - 1; i >= 0; i--) { const p = this.pt(ci, vi, plot, i, stacked ? prev[i]! : zero); c.lineTo(p.x, p.y); }
        c.closePath();
        const fill = this.pointFill(g, s, -1, n);
        if (this.setFill(fill, plot)) c.fill();
        const line = s.sp.line;
        if (line && this.setLine(mergeLine({ w: 0.75 }, line)!)) { c.stroke(); c.setLineDash([]); }
      }
      prev = cur;
    });
  }

  // ───────────── dispersão / bolhas ─────────────
  private xyPoints(s: Series, xi: AxisInfo, yi: AxisInfo, plot: Rect): ({ x: number; y: number } | null)[] {
    const xs = s.xVals && s.xVals.length ? s.xVals : s.values.map((_, i) => i + 1);
    return s.values.map((v, i) => {
      const xv = xs[i];
      if (v === null || v === undefined || xv === null || xv === undefined) return null;
      const px = xi.scale ? this.pos(xi, plot, xv) : this.pos(xi, plot, i, true);
      const py = this.pos(yi, plot, v);
      return xi.dir === 'h' ? { x: px, y: py } : { x: py, y: px };
    });
  }

  private paintScatter(g: Group, xi: AxisInfo, yi: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    for (const s of g.series) {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      const pts = this.xyPoints(s, xi, yi, plot).map((p, i) => (p && this.showData(sIdx, i) ? p : null));
      const noLine = g.scatterStyle === 'marker' && !s.sp.line || s.sp.line?.paint?.kind === 'none';
      const line = noLine ? undefined : this.seriesLine(g, s);
      const smooth = s.smooth ?? (g.scatterStyle === 'smooth' || g.scatterStyle === 'smoothMarker');
      if (line && this.setLine(line)) { this.pathThrough(pts, smooth, false); c.stroke(); c.setLineDash([]); }
      pts.forEach((p, i) => { if (!p) return; const m = this.markerOf(g, s, i); if (m) this.paintMarker(m, p.x, p.y, s, g); });
    }
  }

  private paintBubbles(g: Group, xi: AxisInfo, yi: AxisInfo, plot: Rect): void {
    const c = this.ctx;
    let maxB = 0;
    for (const s of g.series) for (const b of s.bubble ?? []) if (b !== null) maxB = Math.max(maxB, Math.abs(b));
    const maxR = Math.min(plot.w, plot.h) * 0.125 * (g.bubbleScale ?? 100) / 100;
    g.series.forEach((s) => {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      const pts = this.xyPoints(s, xi, yi, plot);
      pts.forEach((p, i) => {
        if (!p || !this.showData(sIdx, i)) return;
        const b = Math.abs(s.bubble?.[i] ?? 0);
        const r = maxB ? maxR * Math.sqrt(b / maxB) : 0;
        if (r <= 0) return;
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2);
        const fill = this.pointFill(g, s, i, pts.length);
        if (this.setFill(fill, { x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r })) c.fill();
        const line = mergeLine(undefined, s.dPts.get(i)?.sp.line ?? s.sp.line);
        if (line && this.setLine(line)) { c.stroke(); c.setLineDash([]); }
      });
    });
  }

  // ───────────── pizza / rosca ─────────────
  private paintPies(outer: Rect): void {
    const c = this.ctx;
    const cs = this.cs;
    // área de plotagem: quadrado centrado (ou o layout manual)
    let r = outer;
    const pl = cs.plotLayout;
    if (pl && pl.w !== undefined && pl.h !== undefined) {
      const A = this.area;
      r = { x: A.x + (pl.x ?? 0) * A.w, y: A.y + (pl.y ?? 0) * A.h, w: pl.w * A.w, h: pl.h * A.h };
    }
    const g = cs.groups[0]!;
    const hasOutside = this.pieLabelsOutside(g);
    const lt = this.text(g.series[0]?.dLbls?.txPr ?? g.dLbls?.txPr);
    const margin = hasOutside ? this.lineH(lt) * 1.6 : 0;
    // diâmetro: 97% do lado menor da área de plotagem (medido)
    const tilt = g.threeD ? Math.max(0.25, Math.sin(((cs.view3D?.rotX ?? 30) * Math.PI) / 180)) : 1;
    // 3D: a elipse achatada (tilt) + a espessura (23% do raio, medido) cabem na altura
    const d = g.threeD
      ? Math.max(4, Math.min(r.w - 2 * margin, (r.h - 2 * margin) / (tilt + 0.23)) * 0.97)
      : Math.max(4, (Math.min(r.w, r.h) - 2 * margin) * 0.97);
    const cx = r.x + r.w / 2;
    let R = d / 2;
    const cy = r.y + r.h / 2 - (g.threeD ? R * 0.115 : 0);
    const exMax = Math.max(0, ...g.series.flatMap((s) => [s.explosion ?? 0, ...[...s.dPts.values()].map((p) => p.explosion ?? 0)])) / 100;
    if (exMax > 0) R = R / (1 + exMax);
    if (this.showBg()) this.shapeRect(r, cs.plotSp);
    const depth = g.threeD ? R * 0.23 : 0;
    const rings = g.kind === 'pie' || g.kind === 'ofPie' ? g.series.slice(0, 1) : g.series;
    const hole = g.kind === 'doughnut' ? Math.max(0.1, Math.min(0.9, g.holeSize / 100)) : 0;
    const ringW = (R * (1 - hole)) / Math.max(1, rings.length);
    const slices: { s: Series; i: number; a0: number; a1: number; r0: number; r1: number; ox: number; oy: number }[] = [];
    rings.forEach((s, ri) => {
      const vals = s.values.map((v) => Math.max(0, v ?? 0));
      const total = vals.reduce((a, b) => a + b, 0);
      if (!(total > 0)) return;
      let a = (g.firstSliceAng - 90) * Math.PI / 180;
      const r1 = R - ri * ringW, r0 = g.kind === 'doughnut' ? r1 - ringW : 0;
      vals.forEach((v, i) => {
        const a1 = a + (v / total) * Math.PI * 2;
        const ex = ((s.dPts.get(i)?.explosion ?? s.explosion ?? 0) / 100) * R;
        const mid = (a + a1) / 2;
        slices.push({ s, i, a0: a, a1, r0, r1, ox: Math.cos(mid) * ex, oy: Math.sin(mid) * ex * tilt });
        a = a1;
      });
    });
    const sector = (sl: (typeof slices)[number], dy = 0) => {
      c.beginPath();
      const x0 = cx + sl.ox, y0 = cy + sl.oy + dy;
      if (sl.r0 > 0) {
        c.ellipse(x0, y0, sl.r1, sl.r1 * tilt, 0, sl.a0, sl.a1);
        c.ellipse(x0, y0, sl.r0, sl.r0 * tilt, 0, sl.a1, sl.a0, true);
      } else {
        c.moveTo(x0, y0);
        c.ellipse(x0, y0, sl.r1, sl.r1 * tilt, 0, sl.a0, sl.a1);
      }
      c.closePath();
    };
    // lateral do 3D
    if (depth > 0) {
      for (const sl of slices) {
        if (!this.showData(this.seriesIndex.get(sl.s) ?? 0, sl.i)) continue;
        const fill = this.pointFill(g, sl.s, sl.i, sl.s.values.length);
        const col = fill.kind === 'solid' ? fill.color : fill.kind === 'grad' ? fill.stops[0]!.color : '#888888';
        c.fillStyle = adjustLum(col, -0.3);
        for (let k = depth; k > 0; k -= Math.max(1, depth / 12)) { sector(sl, k); c.fill(); }
      }
    }
    for (const sl of slices) {
      if (!this.showData(this.seriesIndex.get(sl.s) ?? 0, sl.i)) continue;
      const fill = this.pointFill(g, sl.s, sl.i, sl.s.values.length);
      sector(sl);
      if (this.setFill(fill, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R })) c.fill();
      const line = mergeLine(sl.s.sp.line, sl.s.dPts.get(sl.i)?.sp.line);
      if (line && this.setLine(line)) { c.lineJoin = 'round'; c.stroke(); c.setLineDash([]); }
    }
    // rótulos
    for (const s of rings) {
      const dl = mergeDLbls(g.dLbls, s.dLbls);
      if (!dl) continue;
      const total = s.values.reduce<number>((a, v) => a + Math.max(0, v ?? 0), 0);
      for (const sl of slices.filter((x) => x.s === s)) {
        const pd = dl.points?.get(sl.i);
        const eff = pd ? { ...dl, ...stripUndef(pd) } : dl;
        if (eff.delete || !this.showData(this.seriesIndex.get(s) ?? 0, sl.i)) continue;
        const txt = pd?.text ?? this.labelText(eff, s, sl.i, total ? Math.max(0, s.values[sl.i] ?? 0) / total : 0, 'pie');
        if (!txt) continue;
        const t = this.text(dl.txPr, pd?.txPr);
        const mid = (sl.a0 + sl.a1) / 2;
        const pos = eff.pos ?? (g.kind === 'doughnut' ? 'ctr' : 'bestFit');
        const lines = txt.split('\n');
        const tw = Math.max(...lines.map((l) => this.measure(l, t))), th = lines.length * this.lineH(t);
        let rr: number;
        let outside = pos === 'outEnd';
        if (pos === 'ctr') rr = (sl.r0 + sl.r1) / 2;
        else if (pos === 'inEnd') rr = sl.r1 - Math.max(tw, th) * 0.6;
        else if (pos === 'outEnd') rr = sl.r1 + Math.max(tw, th) * 0.6 + 4 * this.S;
        else {
          // bestFit: dentro se couber na fatia, senão fora
          const arcLen = (sl.a1 - sl.a0) * sl.r1 * 0.65;
          outside = arcLen < Math.max(tw, th) * 1.1;
          rr = outside ? sl.r1 + Math.max(tw, th) * 0.6 + 4 * this.S : sl.r1 * 0.62;
        }
        const x = cx + sl.ox + Math.cos(mid) * rr, y = cy + sl.oy + Math.sin(mid) * rr * tilt;
        this.shapeRect({ x: x - tw / 2 - 2, y: y - th / 2 - 1, w: tw + 4, h: th + 2 }, eff.sp);
        this.drawLines(lines, t, x, y, 'center');
        void outside;
      }
    }
  }

  private pieLabelsOutside(g: Group): boolean {
    const dl = mergeDLbls(g.dLbls, g.series[0]?.dLbls);
    if (!dl || dl.delete) return false;
    const any = dl.showVal || dl.showPct || dl.showCat || dl.showSer;
    return !!any && (dl.pos === 'outEnd' || dl.pos === 'bestFit' || dl.pos === undefined) && g.kind !== 'doughnut';
  }

  // ───────────── radar ─────────────
  private paintRadar(outer: Rect): void {
    const c = this.ctx;
    const cs = this.cs;
    const g = cs.groups.find((x) => x.kind === 'radar')!;
    const ax = this.axisById(g.axIds[1]);
    const catAx = this.axisById(g.axIds[0]);
    const n = Math.max(1, ...g.series.map((s) => s.values.length));
    const cats = g.series[0]?.cats ?? Array.from({ length: n }, (_, i) => String(i + 1));
    const t = this.text(catAx?.txPr);
    const lh = this.lineH(t);
    const R = Math.max(4, Math.min(outer.w, outer.h) / 2 - lh * 1.8);
    const cx = outer.x + outer.w / 2, cy = outer.y + outer.h / 2;
    let lo = Infinity, hi = -Infinity;
    for (const s of g.series) for (const v of s.values) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    const sc = autoScale(lo, hi, 8, { ...(ax?.min !== undefined ? { min: ax.min } : {}), ...(ax?.max !== undefined ? { max: ax.max } : {}), ...(ax?.majorUnit ? { major: ax.majorUnit } : {}) });
    const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rad = (v: number) => Math.max(0, frac(sc, v)) * R;
    if (this.showBg()) {
      const grid = ax?.majorGrid ? mergeLine(this.defaultLine(), ax.majorGrid.line) : undefined;
      if (grid && this.setLine(grid)) {
        for (const v of tickValues(sc)) {
          c.beginPath();
          for (let i = 0; i < n; i++) { const a = ang(i), rr = rad(v); if (i) c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
          c.closePath(); c.stroke();
        }
        c.setLineDash([]);
      }
      const spoke = catAx ? mergeLine(this.defaultLine(), catAx.majorGrid?.line ?? catAx.sp.line) : this.defaultLine();
      if (spoke && this.setLine(spoke)) { c.beginPath(); for (let i = 0; i < n; i++) { c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R); } c.stroke(); c.setLineDash([]); }
      if (!catAx?.deleted) for (let i = 0; i < n; i++) {
        const a = ang(i);
        const x = cx + Math.cos(a) * (R + lh * 0.9), y = cy + Math.sin(a) * (R + lh * 0.9);
        this.drawLines([cats[i] ?? ''], t, x, y, Math.abs(Math.cos(a)) < 0.3 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right');
      }
      if (ax && !ax.deleted && ax.tickLblPos !== 'none') {
        const vt = this.text(ax.txPr);
        const fmt = pickFmt(ax.numFmt, g.series[0]?.fmt);
        for (const v of tickValues(sc)) this.drawLines([formatValue(v, fmt, { locale: this.loc }).text], vt, cx - 4 * this.S, cy - rad(v), 'right');
      }
    }
    const filled = g.radarStyle === 'filled';
    for (const s of g.series) {
      const sIdx = this.seriesIndex.get(s) ?? 0;
      c.beginPath();
      s.values.forEach((v, i) => { const a = ang(i), rr = rad(v ?? 0); if (i) c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); });
      c.closePath();
      if (![...Array(n).keys()].some((i) => this.showData(sIdx, i))) continue;
      if (filled) { const f = this.pointFill(g, s, -1, n); if (this.setFill(f, outer)) c.fill(); }
      const line = filled ? s.sp.line && mergeLine(undefined, s.sp.line) : this.seriesLine(g, s);
      if (line && this.setLine(line)) { c.stroke(); c.setLineDash([]); }
      if (g.radarStyle === 'marker') s.values.forEach((v, i) => { const m = this.markerOf(g, s, i); if (m) this.paintMarker(m, cx + Math.cos(ang(i)) * rad(v ?? 0), cy + Math.sin(ang(i)) * rad(v ?? 0), s, g); });
    }
  }

  // ───────────── rótulos de dados ─────────────
  private labelText(d: DLbls, s: Series, i: number, pct: number | undefined, kind: 'pie' | 'other', valOverride?: number): string {
    const parts: string[] = [];
    const v = valOverride ?? s.values[i];
    const fmt = pickFmt(d.numFmt, s.fmt);
    if (d.showSer) parts.push(s.name);
    if (d.showCat) parts.push(s.cats?.[i] ?? this.catNumLabel(s, i));
    if (d.showVal && v !== null && v !== undefined) parts.push(formatValue(v, fmt, { locale: this.loc }).text);
    if (d.showPct && pct !== undefined && kind === 'pie') parts.push(formatValue(pct, d.numFmt && !d.numFmt.linked && /%/.test(d.numFmt.code) ? d.numFmt.code : '0%', { locale: this.loc }).text);
    if (d.showBubble && s.bubble?.[i] !== undefined && s.bubble[i] !== null) parts.push(formatValue(s.bubble[i]!, 'General', { locale: this.loc }).text);
    const sep = d.sep ?? (this.loc.decimal === ',' ? '; ' : ', ');
    return parts.join(sep);
  }

  private paintDataLabels(g: Group, ci: AxisInfo, vi: AxisInfo, plot: Rect): void {
    const n = ci.nCats ?? 1;
    const horiz = g.kind === 'bar' && g.dir === 'bar';
    const stacked = g.grouping !== 'clustered' && g.grouping !== 'standard';
    const tot = g.grouping === 'percentStacked' ? this.stackedTotals(g, n) : undefined;
    const acc = { pos: new Array<number>(n).fill(0), neg: new Array<number>(n).fill(0) };
    const vs = vi.scale;
    const ns = g.kind === 'bar' && !stacked ? g.series.length : 1;
    const ov = stacked ? 1 : Math.max(-1, Math.min(1, g.overlap / 100));
    const bandPx = (horiz ? plot.h : plot.w) / n;
    const barW = bandPx / (1 + (ns - 1) * (1 - ov) + g.gapWidth / 100);
    const span = barW * (1 + (ns - 1) * (1 - ov));
    g.series.forEach((s, si) => {
      const dl = mergeDLbls(g.dLbls, s.dLbls);
      const sIdx = this.seriesIndex.get(s) ?? 0;
      const xyPts = g.kind === 'scatter' || g.kind === 'bubble' ? this.xyPoints(s, ci, vi, plot) : undefined;
      for (let i = 0; i < (xyPts ? xyPts.length : n); i++) {
        const raw = s.values[i];
        let v = raw ?? 0;
        if (tot) { const sum = tot.pos[i]! - tot.neg[i]!; v = sum ? v / sum : 0; }
        let v0 = 0, v1 = v;
        if (stacked && raw !== null && raw !== undefined) {
          if (v >= 0) { v0 = acc.pos[i]!; v1 = v0 + v; acc.pos[i] = v1; } else { v0 = acc.neg[i]!; v1 = v0 + v; acc.neg[i] = v1; }
        } else if (g.grouping === 'stacked' && g.kind !== 'bar') { acc.pos[i] = acc.pos[i]! + v; v1 = acc.pos[i]!; v0 = v1 - v; }
        if (!dl || raw === null || raw === undefined) continue;
        const pd = dl.points?.get(i);
        const eff = pd ? { ...dl, ...stripUndef(pd) } : dl;
        if (eff.delete || !this.showData(sIdx, i)) continue;
        const txt = pd?.text ?? this.labelText(eff, s, i, undefined, 'other');
        if (!txt) continue;
        const t = this.text(dl.txPr, pd?.txPr);
        const lines = txt.split('\n');
        const tw = Math.max(...lines.map((l) => this.measure(l, t))), th = lines.length * this.lineH(t);
        const gap = 3 * this.S;
        let x: number, y: number;
        if (xyPts) {
          const p = xyPts[i];
          if (!p) continue;
          ({ x, y } = this.besideLabel(eff.pos ?? 'r', p, tw, th, gap));
        } else if (g.kind === 'bar' && vs) {
          const bandStart = this.pos(ci, plot, i, false);
          const off = (bandPx - span) / 2 + (stacked ? 0 : si * barW * (1 - ov));
          const p0 = horiz ? (ci.ax.reversed ? bandStart + off : bandStart - bandPx + (bandPx - off - barW)) : ci.ax.reversed ? bandStart - bandPx + off : bandStart + off;
          const center = p0 + barW / 2;
          const zero = vs.log ? vs.lo : Math.max(vs.lo, Math.min(vs.hi, 0));
          const a0 = this.pos(vi, plot, stacked ? v0 : zero), a1 = this.pos(vi, plot, v1);
          const neg = (horiz ? a1 < a0 : a1 > a0);
          const pos = eff.pos ?? (stacked ? 'ctr' : 'outEnd');
          const ext = horiz ? tw : th;
          let along: number;
          const dirOut = neg ? -1 : 1; // sentido "para fora" da barra (em coordenadas de valor)
          const sgn = horiz ? dirOut : -dirOut;
          if (pos === 'ctr') along = (a0 + a1) / 2;
          else if (pos === 'inEnd') along = a1 - sgn * (ext / 2 + gap);
          else if (pos === 'inBase') along = a0 + sgn * (ext / 2 + gap);
          else along = a1 + sgn * (ext / 2 + gap);
          if (horiz) { x = along; y = center; } else { x = center; y = along; }
        } else {
          const p = this.pt(ci, vi, plot, i, g.grouping === 'standard' ? v : v1);
          ({ x, y } = g.kind === 'area' ? { x: p.x, y: (p.y + this.pt(ci, vi, plot, i, g.grouping === 'standard' ? 0 : v0).y) / 2 } : this.besideLabel(eff.pos ?? 'r', p, tw, th, gap));
        }
        this.shapeRect({ x: x - tw / 2 - 2, y: y - th / 2 - 1, w: tw + 4, h: th + 2 }, eff.sp);
        this.drawLines(lines, t, x, y, 'center');
      }
    });
  }

  private besideLabel(pos: string, p: { x: number; y: number }, tw: number, th: number, gap: number): { x: number; y: number } {
    switch (pos) {
      case 'l': return { x: p.x - gap * 2 - tw / 2, y: p.y };
      case 't': return { x: p.x, y: p.y - gap * 2 - th / 2 };
      case 'b': return { x: p.x, y: p.y + gap * 2 + th / 2 };
      case 'ctr': return p;
      default: return { x: p.x + gap * 2 + tw / 2, y: p.y };
    }
  }
}

// ───────────── utilidades ─────────────
function isPieLike(g: Group): boolean { return g.kind === 'pie' || g.kind === 'doughnut' || g.kind === 'ofPie'; }

/** Ordem de pintura no mesmo plot: áreas, barras, depois linhas/dispersão. */
function rank(g: Group): number { return g.kind === 'area' ? 0 : g.kind === 'bar' ? 1 : 2; }

function mergeLine(a: LineProps | undefined, b: LineProps | undefined): LineProps | undefined {
  if (!a && !b) return undefined;
  return { ...(a ?? {}), ...stripUndef(b ?? {}) };
}

function mergeDLbls(a: DLbls | undefined, b: DLbls | undefined): DLbls | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...stripUndef(b), txPr: { ...a.txPr, ...b.txPr }, sp: { ...a.sp, ...b.sp } };
}

function stripUndef<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

function dashPattern(d: string | undefined, w: number): number[] {
  switch (d) {
    case 'dash': return [4 * w, 3 * w];
    case 'sysDash': return [3 * w, w];
    case 'sysDot': return [w, w];
    case 'dot': return [w, 3 * w];
    case 'dashDot': case 'sysDashDot': return [4 * w, 3 * w, w, 3 * w];
    case 'lgDash': return [8 * w, 3 * w];
    case 'lgDashDot': return [8 * w, 3 * w, w, 3 * w];
    case 'lgDashDotDot': case 'sysDashDotDot': return [8 * w, 3 * w, w, 3 * w, w, 3 * w];
    default: return [];
  }
}

/** Padrão como a cor média (fg/bg pela densidade aproximada do preset). */
function mixPattern(fg: string, bg: string, prst: string): string {
  const m = /pct(\d+)/.exec(prst);
  const dens = m ? parseInt(m[1]!, 10) / 100 : /lt|dot/i.test(prst) ? 0.25 : /dk/i.test(prst) ? 0.6 : 0.5;
  const a = parseInt(fg.slice(1), 16), b = parseInt(bg.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * dens + ((b >> s) & 255) * (1 - dens));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function minorLog(sc: Scale): number[] {
  const out: number[] = [];
  const b = sc.log ?? 10;
  for (let v = sc.lo; v < sc.hi * (1 + 1e-9) && out.length < 2000; v *= b) for (let k = 1; k < b; k++) { const x = v * k; if (x <= sc.hi * (1 + 1e-9)) out.push(x); }
  return out;
}

/** Formato efetivo: o gravado (mesmo vinculado — é o cache do formato da origem), salvo "Geral" vinculado → o da série. */
function pickFmt(nf: { code: string; linked: boolean } | undefined, src: string | undefined): string {
  if (nf && (!nf.linked || nf.code !== 'General')) return nf.code;
  return src ?? nf?.code ?? 'General';
}

/** Data curta do sistema (id 14 do Excel) é gravada como "m/d/yyyy" mas exibida no formato do locale. */
function localeFmt(code: string, loc: FormatLocale): string {
  return /^m{1,2}\/d{1,2}\/y{2,4}$/i.test(code) ? builtinFormatCode(14, loc) ?? code : code;
}
