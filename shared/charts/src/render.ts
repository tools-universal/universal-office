/**
 * Layout + pintura de um ChartSpace em canvas 2D, como o Office (Excel e
 * PowerPoint usam o MESMO motor de gráfico). Constantes medidas no oráculo
 * (PowerPoint 365 pt-BR exportando PNG): margens da área do gráfico, distância
 * rótulo↔eixo, passo da legenda, escala automática, cores automáticas.
 */
import type {
  ChartSpace, TextProps, Paint, LineProps, ShapeProps, Series, Group, Axis, DLbls, ManualLayout, RichPara, Marker, UserShape, UserText,
} from './model.js';
import { autoScale, tickValues, frac, type Scale } from './scale.js';
import { adjustLum, rgba, chartShadeTint, tintLinear } from './color.js';
import { formatValue as fmtRaw, builtinFormatCode, PT_BR, type FormatLocale } from './numfmt.js';
import { tilePattern } from './image.js';

/** formatValue com os formatos de data do sistema trocados pelo do locale. */
function formatValue(v: number, code: string, o: { locale: FormatLocale }): { text: string; color?: string } {
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
  /**
   * Moldura sem `spPr/a:ln` (o Excel desenha; o PowerPoint não): 'auto' = cor das
   * linhas default do gráfico; 'auto2010' = a do Office 2010+ (tx1 75%) mesmo sem
   * c14:style — o Excel desenha assim (medido, syn basic1: #898989 com grade preta).
   */
  defaultAreaLine?: string;
  /** Família CSS para um nome de fonte (o hospedeiro sabe as substitutas). */
  cssFont?: (family: string, bold?: boolean, italic?: boolean) => string;
  locale?: FormatLocale;
  sel?: ChartSel;
  /**
   * Imagem decodificada de um preenchimento `a:blipFill` pela chave que o
   * hospedeiro deu (`ChartHost.blip`); undefined = ainda não decodificou (não
   * desenha — o hospedeiro repinta quando chegar).
   */
  image?: (ref: string) => ChartImage | undefined;
}

/**
 * Imagem pronta para o canvas: `w`/`h` em pixels da imagem; `wPt`/`hPt` =
 * tamanho natural em pt pela resolução gravada no arquivo (JFIF/pHYs). O
 * ladrilho do PowerPoint usa esse tamanho (medido: textura 128 px a 75 dpi →
 * período de 122,88 pt); sem ele, 96 dpi.
 */
export interface ChartImage { src: CanvasImageSource; w: number; h: number; wPt?: number; hPt?: number }

type Ctx = CanvasRenderingContext2D;
interface Rect { x: number; y: number; w: number; h: number }

// ───────────── constantes medidas (pt) ─────────────
/** Margem interna da área do gráfico. */
const PAD = { t: 5, b: 7.2, l: 6, r: 7.5 };
/** Folga de baixo nos gráficos com eixos (a legenda embaixo desce junto, o eixo não). */
const PAD_B_AXES = 5.7;
/** Tique principal "out"/"cross" (comprimento para fora): TICK_K·(texto do eixo, pt) + TICK_B. */
const TICK_K = 0.3;
const TICK_B = 0.75;
/** Rótulos de um eixo horizontal de valores: distância após o tique, em em (medido 6–32 pt; categorias: `catGap`). */
const H_LBL_GAP = 0.4;
/** Plotagem com eixo vertical: folga mínima no topo (rótulo extremo) e à direita sem legenda lá (pt). */
const PLOT_MIN_T = 5.5;
const PLOT_PAD_R = 3.75;
const MINOR_TICK = 2.6;
/** Título: deslocamento extra do topo e distância até a área de plotagem. */
const TITLE_TOP = 3.75;
const TITLE_GAP = 6.25;
/** Marcadores automáticos por série. */
const AUTO_SYMBOLS = ['diamond', 'square', 'triangle', 'x', 'star', 'circle', 'plus', 'dot', 'dash'];
/** Luz do 3D oblíquo (fator RGB): faces laterais e faces de cima/piso (medido, syn-a-3dobl). */
const SHADE_SIDE = 0.645;
const SHADE_TOP = 0.756;
/** Folga mínima da figura 3D oblíqua até o topo/base da moldura (pt; 19/17 px a 96 dpi). */
const MARGIN_3D = { t: 12.75, b: 12.75 };

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
  /** Parte de `extent` que é do título do eixo. */
  titleExtent?: number;
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
    if (p.kind === 'blip') return this.setBlip(p, r);
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

  /**
   * `a:blipFill` como padrão do canvas: esticada no retângulo (recuado pelo
   * `fillRect`) ou em ladrilho do tamanho natural × escala, o 1º ladrilho
   * alinhado pelo `algn` na caixa e deslocado por tx/ty (medido: textura com
   * algn="tl" começa no canto da área do gráfico).
   */
  private setBlip(p: Extract<Paint, { kind: 'blip' }>, r: Rect): boolean {
    const im = this.o.image?.(p.ref);
    if (!im || !(im.w > 0 && im.h > 0)) return false;
    const c = this.ctx;
    if (p.tile) {
      const t = p.tile, S = this.S;
      const pat = tilePattern(c, im.src, im.w, im.h, (im.wPt ?? im.w * 0.75) * S, (im.hPt ?? im.h * 0.75) * S, { ...t, tx: t.tx * S, ty: t.ty * S }, r);
      if (!pat) return false;
      c.fillStyle = pat;
      return true;
    }
    const pat = c.createPattern(im.src, 'no-repeat');
    if (!pat) return false;
    const f = p.fillRect ?? { l: 0, t: 0, r: 0, b: 0 };
    if (typeof (pat as { setTransform?: unknown }).setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
      pat.setTransform(new DOMMatrix([r.w * (1 - f.l - f.r) / im.w, 0, 0, r.h * (1 - f.t - f.b) / im.h, r.x + f.l * r.w, r.y + f.t * r.h]));
    }
    c.fillStyle = pat;
    return true;
  }

  /** Preenche com `draw` sob a opacidade própria do preenchimento (`a:alphaModFix` da imagem). */
  private withFillAlpha(p: Paint, draw: () => void): void {
    const a = p.kind === 'blip' ? p.alpha : undefined;
    if (a === undefined) { draw(); return; }
    const c = this.ctx;
    c.save();
    c.globalAlpha *= a;
    draw();
    c.restore();
  }

  private setLine(l: LineProps, defW = 0.75): boolean {
    const c = this.ctx;
    const p = l.paint;
    if (!p || p.kind === 'none') return false;
    if (p.kind === 'solid') c.strokeStyle = rgba(p.color, p.alpha);
    else if (p.kind === 'grad') c.strokeStyle = rgba(p.stops[0]!.color, p.stops[0]!.alpha);
    else if (p.kind === 'patt') c.strokeStyle = p.fg;
    else return false;
    // traço mais fino que 1 px sai com 1 px cheio (medido, gdx-545393: eixo de
    // 0,27 pt preto nítido no PowerPoint; w="0" = fio de cabelo), como nas formas
    const w = Math.max(1, (l.w ?? defW) * this.S);
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
      if (fill && this.setFill(fill, r)) { path(); this.withFillAlpha(fill, () => c.fill()); }
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
      if (this.setFill(fill, r)) this.withFillAlpha(fill, () => c.fillRect(r.x, r.y, r.w, r.h));
      c.restore();
    } else if (fill && this.setFill(fill, r)) this.withFillAlpha(fill, () => c.fillRect(r.x, r.y, r.w, r.h));
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
    // colorido e cinza: 6 cores base em blocos de 6 séries; com m = ⌊n/6⌋ + 1
    // blocos (6 séries exatas já são 2!), o bloco k sai com sombra/tinta
    // (k+1)/(m+1) − ½ (medido com 1–24 séries, syn-colpal/syn-graypal)
    if (scheme === 1 || scheme === 0) {
      // fundo escuro (41–48): os dois cinzas mais escuros viram claros (medido: F9F9F9, EDEDED)
      const GRAYS = st >= 41 ? ['#F9F9F9', '#B3B3B3', '#818181', '#EDEDED', '#959595', '#DADADA'] : ['#616161', '#B3B3B3', '#818181', '#505050', '#959595', '#DADADA'];
      const base = scheme === 1 ? acc[i % 6]! : GRAYS[i % 6]!;
      const m = Math.floor(Math.max(1, n) / 6) + 1;
      if (m === 1) return base;
      return chartShadeTint(base, (Math.floor(i / 6) + 1) / (m + 1) - 0.5);
    }
    const base = acc[scheme - 2]!;
    return chartShadeTint(base, (i + 1) / (Math.max(1, n) + 1) - 0.5);
  }

  /** Preenchimento default da área de plotagem (medido: 34 → #E7E7E7, 42 → #3F3F3F). */
  private plotDefault(): Paint | undefined {
    const row = this.styleRow();
    // 33–34: cinza; 35–40: o próprio accent do estilo (medido: 35 → accent1)
    if (row === 4) return { kind: 'solid', color: (this.cs.style - 1) % 8 >= 2 ? this.cs.accents[(this.cs.style - 1) % 8 - 2]! : adjustLum(this.cs.bg1, -0.094) };
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

  /** Efeito do estilo: 17–32 e 41–48 = 3º preenchimento do tema ("intenso", medido: idêntico nos três). */
  private styleFill(color: string): Paint {
    const row = this.styleRow();
    const th = row === 2 || row === 3 || row === 5 ? this.cs.themeFill?.(3, color) : undefined;
    if (th) return th;
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
    // linhas (grade/eixos) em tx1 mesmo nos estilos escuros 41–48 (medido: grade preta sobre o 3F3F3F)
    const base = this.cs.tx1;
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
        const defLine: LineProps | undefined = this.o.defaultAreaLine ? (this.o.defaultAreaLine === 'auto' ? this.defaultLine() : this.o.defaultAreaLine === 'auto2010' ? { paint: { kind: 'solid', color: tintLinear(cs.tx1, 0.75) }, w: 0.75 } : { paint: { kind: 'solid', color: this.o.defaultAreaLine }, w: 0.75 }) : row === 4 ? { paint: { kind: 'solid', color: adjustLum(cs.tx1, 0.7) }, w: 0.75 } : undefined;
        this.shapeRect(A, cs.sp, defFill, defLine, cs.roundedCorners ? 6 * this.o.pxPerPt : 0);
      }
      const S = this.S;
      const pie = cs.groups.length > 0 && cs.groups.every(isPieLike);
      const axes = !pie && cs.groups.length > 0 && !cs.groups.some((g) => g.kind === 'radar');
      // gráfico com eixos: a folga de baixo é menor (medido, syn-a-ticks/ticks2: eixo e
      // legenda de baixo 1,5–2,75 pt mais perto da borda que nos 7,2 pt de pizza/radar)
      const padB = axes ? PAD_B_AXES : PAD.b;
      let inner: Rect = { x: A.x + PAD.l * S, y: A.y + PAD.t * S, w: A.w - (PAD.l + PAD.r) * S, h: A.h - (PAD.t + padB) * S };
      // título
      const title = this.layoutTitle(inner);
      if (title && !title.overlay) { const d = TITLE_TOP * S + title.h + TITLE_GAP * S; inner = { ...inner, y: inner.y + d, h: inner.h - d }; }
      // legenda
      const legend = this.layoutLegend(inner, axes ? (PAD.b - PAD_B_AXES) * S : 0);
      if (legend && !legend.overlay) inner = legend.rest;
      // área de plotagem + eixos
      if (pie) this.paintPies(inner);
      else if (cs.groups.some((g) => g.kind === 'radar')) this.paintRadar(inner);
      else if (cs.groups.length) this.paintAxesChart(inner);
      if (legend && this.showBg()) this.paintLegend(legend);
      if (title && this.showBg()) this.paintTitle(title);
      if (cs.userShapes && this.showBg()) for (const u of cs.userShapes) this.paintUserShape(u);
    } finally {
      c.restore();
    }
  }

  // ───────────── desenho do gráfico (c:userShapes) ─────────────
  /** Forma do desenho do gráfico: geometria simples + texto rico na caixa (por cima de tudo). */
  private paintUserShape(u: UserShape): void {
    const c = this.ctx, A = this.area, S = this.S;
    let r: Rect = { x: A.x + u.x * A.w, y: A.y + u.y * A.h, w: u.abs ? u.w * S : u.w * A.w, h: u.abs ? u.h * S : u.h * A.h };
    if (u.sub) r = { x: r.x + u.sub.x * r.w, y: r.y + u.sub.y * r.h, w: u.sub.w * r.w, h: u.sub.h * r.h };
    c.save();
    if (u.rot) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      c.translate(cx, cy); c.rotate(u.rot * Math.PI / 180); c.translate(-cx, -cy);
    }
    // geometria: as predefinidas simples; as demais só o texto (sem chute de contorno)
    const g = u.geom;
    const path = (): boolean => {
      c.beginPath();
      if (g === 'rect' || g === 'textNoShape' || g === 'flowChartProcess') c.rect(r.x, r.y, r.w, r.h);
      else if (g === 'roundRect') c.roundRect(r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * 0.1667);
      else if (g === 'ellipse' || g === 'flowChartConnector') c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
      else if (g === 'line' || g === 'straightConnector1') {
        const x0 = u.flipH ? r.x + r.w : r.x, x1 = u.flipH ? r.x : r.x + r.w, y0 = u.flipV ? r.y + r.h : r.y, y1 = u.flipV ? r.y : r.y + r.h;
        c.moveTo(x0, y0); c.lineTo(x1, y1);
      } else return false;
      return true;
    };
    if (u.blip) {
      const im = this.o.image?.(u.blip);
      if (im) c.drawImage(im.src, r.x, r.y, r.w, r.h);
    }
    const isLine = g === 'line' || g === 'straightConnector1';
    if (!isLine && u.sp.fill && this.setFill(u.sp.fill, r) && path()) this.withFillAlpha(u.sp.fill, () => c.fill());
    if (u.sp.line && this.setLine(u.sp.line) && path()) { c.stroke(); c.setLineDash([]); }
    if (u.text) this.paintUserText(u.text, r);
    c.restore();
  }

  /** Texto rico de uma forma: quebra por palavras na largura útil, alinhamento por parágrafo, âncora vertical. */
  private paintUserText(t: UserText, box: Rect): void {
    const c = this.ctx, S = this.S;
    let r = { x: box.x + t.ins.l * S, y: box.y + t.ins.t * S, w: box.w - (t.ins.l + t.ins.r) * S, h: box.h - (t.ins.t + t.ins.b) * S };
    c.save();
    if (t.rot) {
      // texto girado: lido na caixa transposta, centrada na mesma posição
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      c.translate(cx, cy); c.rotate(t.rot * Math.PI / 180); c.translate(-cx, -cy);
      if (Math.abs(t.rot) % 180 === 90) r = { x: cx - r.h / 2, y: cy - r.w / 2, w: r.h, h: r.w };
    }
    if (t.clip) { c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip(); }
    // texto de forma: 10 pt (o tamanho do gráfico), tx1, fonte menor — sem o negrito do título
    const baseT = this.text({ sz: this.base.sz, b: false }, t.def);
    const lines: { runs: { text: string; t: ResolvedText; w: number }[]; w: number; h: number; align: string }[] = [];
    for (const p of t.paras) {
      const align = p.align ?? 'l';
      let cur: { text: string; t: ResolvedText; w: number }[] = [];
      let curW = 0;
      const flush = (force = false) => {
        if (!cur.length && !force) return;
        const h = Math.max(this.lineH(this.text({ sz: baseT.sz }, t.def, p.props)), ...cur.map((x) => this.lineH(x.t)));
        while (cur.length && !/\S/.test(cur[cur.length - 1]!.text)) { curW -= cur[cur.length - 1]!.w; cur.pop(); }
        lines.push({ runs: cur, w: curW, h, align });
        cur = []; curW = 0;
      };
      if (!p.runs.length) { flush(true); continue; }
      for (const run of p.runs) {
        const rt = this.text({ sz: baseT.sz, b: false }, t.def, p.props, run.props);
        if (run.text === '\n') { flush(true); continue; }
        for (const piece of run.text.split(/(\s+)/)) {
          if (!piece) continue;
          const pw = this.measure(piece, rt);
          if (t.wrap && curW + pw > r.w + 0.5 && curW > 0 && /\S/.test(piece)) flush();
          if (!cur.length && !/\S/.test(piece)) continue;
          cur.push({ text: piece, t: rt, w: pw });
          curW += pw;
        }
      }
      flush(true);
    }
    const total = lines.reduce((a, l) => a + l.h, 0);
    let y = t.anchor === 'ctr' ? r.y + (r.h - total) / 2 : t.anchor === 'b' ? r.y + r.h - total : r.y;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    for (const ln of lines) {
      let x = ln.align === 'ctr' ? r.x + (r.w - ln.w) / 2 : ln.align === 'r' ? r.x + r.w - ln.w : r.x;
      // linha base a ~0,8 da altura da linha (ascendente da fonte ≈ 1 em de 1,2)
      const base = y + ln.h * 0.8;
      for (const run of ln.runs) {
        c.font = this.font(run.t);
        c.fillStyle = rgba(run.t.color, run.t.alpha);
        c.fillText(run.text, x, base);
        if (run.t.u) c.fillRect(x, base + run.t.sz * S * 0.12, run.w, Math.max(1, run.t.sz * S / 14));
        x += run.w;
      }
      y += ln.h;
    }
    c.restore();
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
        // parágrafo rico SEM a:defRPr: 18,62 pt regular, sem herdar o txPr do título nem o
        // tamanho do gráfico (medido, syn-a-misc3b #7/#9–#13); com defRPr (mesmo vazio):
        // tamanho base, negrito
        const rt = t.paras && p.noDefRPr
          ? this.text({ sz: 18.62, b: false }, r.props)
          : this.text({ sz: t.paras || t.text ? this.base.sz : 18, b: true }, t.txPr, p.props, r.props);
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

  /** `extraB`: folga a mais entre a legenda de baixo e a plotagem (gráficos com eixos). */
  private layoutLegend(inner: Rect, extraB = 0): { entries: ReturnType<Renderer['legendEntries']>; t: ResolvedText; rows: { x: number; y: number; e: ReturnType<Renderer['legendEntries']>[number]; lines?: string[] }[]; box: Rect; rest: Rect; overlay: boolean } | undefined {
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
    const rows: { x: number; y: number; e: (typeof entries)[number]; lines?: string[] }[] = [];
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
      const availW = lg.layout?.w !== undefined ? lg.layout.w * this.area.w : inner.w;
      const n = widths.length;
      // cabe numa linha: fluxo centrado; senão TABELA em ordem de linhas: colunas =
      // ⌊largura ÷ (maior entrada + espaço)⌋, cada coluna com a largura da maior entrada
      // DELA (medido, syn-a-legend #1: 8 entradas em 3 colunas de larguras diferentes
      // onde caberiam 4; #5 e syn-a-legend2 #4: uma coluna só)
      let cols = n;
      let colW = widths.slice();
      if (widths.reduce((a, w) => a + w, 0) + sp * (n - 1) > availW) {
        cols = Math.max(1, Math.min(n - 1, Math.floor(availW / (Math.max(...widths) + sp))));
        colW = Array.from({ length: cols }, (_, c) => Math.max(...widths.filter((_, i) => i % cols === c)));
      }
      const nRows = Math.ceil(n / cols);
      const bh = nRows * pitch;
      const by = lg.pos === 't' ? inner.y : inner.y + inner.h - bh;
      let maxW = 0;
      if (nRows === 1) {
        maxW = widths.reduce((a, w) => a + w, 0) + sp * (n - 1);
        let x = inner.x + (inner.w - maxW) / 2;
        entries.forEach((e, i) => { rows.push({ x, y: by + pitch / 2, e }); x += widths[i]! + sp; });
      } else {
        maxW = colW.reduce((a, w) => a + w, 0) + sp * (cols - 1);
        const x0 = inner.x + (inner.w - maxW) / 2;
        const colX = colW.map((_, c) => x0 + colW.slice(0, c).reduce((a, w) => a + w + sp, 0));
        entries.forEach((e, i) => rows.push({ x: colX[i % cols]!, y: by + pitch * (Math.floor(i / cols) + 0.5), e }));
      }
      box = { x: inner.x + (inner.w - maxW) / 2, y: by, w: maxW, h: bh };
      const gap = 4 * S;
      rest = lg.pos === 't' ? { x: inner.x, y: inner.y + bh + gap, w: inner.w, h: inner.h - bh - gap } : { x: inner.x, y: inner.y, w: inner.w, h: inner.h - bh - gap - extraB };
    }
    const L = lg.layout;
    if (L && L.w !== undefined && L.h !== undefined && L.w > 0 && L.h > 0) {
      // caixa manual com tamanho (medido, syn legend1 e senado-ifi; legendPos não importa):
      // - todas cabem numa linha → uma linha, centrada na caixa;
      // - senão → UMA coluna centrada na horizontal, a entrada que não cabe quebra em
      //   palavras; faixas iguais de altura h/n, cada uma com a altura da maior entrada
      //   centrada nela (a 1ª linha do texto alinha com a chave).
      // O espaço da posição (legendPos) continua reservado.
      const A = this.area;
      const bx = L.xMode === 'factor' ? box.x + (L.x ?? 0) * A.w : A.x + (L.x ?? 0) * A.w;
      const byy = L.yMode === 'factor' ? box.y + (L.y ?? 0) * A.h : A.y + (L.y ?? 0) * A.h;
      const bw = L.w * A.w, bh = L.h * A.h;
      const sp = em * 1.2, n = widths.length;
      rows.length = 0;
      const rowW = widths.reduce((a, w) => a + w, 0) + sp * (n - 1);
      if (rowW <= bw) {
        let x = bx + (bw - rowW) / 2;
        entries.forEach((e, i) => { rows.push({ x, y: byy + bh / 2, e }); x += widths[i]! + sp; });
      } else {
        const lh = this.lineH(t);
        // quebra só a entrada maior que a caixa inteira; todas aparecem, mesmo apertadas
        // (medido, worldbank: 3 entradas de 32 pt numa caixa de 122 px)
        const lines = entries.map((e) => { const kw = key(e) + gapKey; return this.wrap(e.label, t, Math.max(lh, bw - kw)); });
        const ws = entries.map((e, i) => key(e) + gapKey + Math.max(...lines[i]!.map((l) => this.measure(l, t))));
        const colW = Math.max(...ws);
        const maxH = Math.max(...lines.map((l) => l.length)) * lh;
        const visible = n;
        const slot = bh / visible;
        const x0 = bx + (bw - colW) / 2;
        entries.slice(0, visible).forEach((e, i) => rows.push({ x: x0, y: byy + slot * i + (slot - maxH) / 2 + lh / 2, e, lines: lines[i]! }));
      }
      // fundo/moldura da legenda na caixa manual
      box = { x: bx + 2 * S, y: byy, w: bw - 4 * S, h: bh };
      return { entries, t, rows, box, rest, overlay: lg.overlay };
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
        const ln = mergeLine({ paint: { kind: 'solid', color: col }, w: e.g.kind === 'line' || e.g.kind === 'scatter' ? (this.cs.themeLn ? this.seriesLineW() : 2.25) : 0.75 }, e.s.sp.line);
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
      const ls = r.lines ?? [e.label];
      this.drawLines(ls, L.t, x + em * 0.25, r.y + (ls.length - 1) * this.lineH(L.t) / 2, 'left');
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
    // tabela de dados (c:dTable): linhas de 1,5 em embaixo da plotagem — cabeçalho com
    // as categorias (no lugar dos rótulos do eixo) e uma linha por série com chave e
    // nome numa coluna à esquerda (medido, syn-a-misc3b #1–#6)
    this.dtab = undefined;
    const catInf = this.axisById(primary.axIds[0]) ? infos.get(this.axisById(primary.axIds[0])!) : undefined;
    const is3D = cs.groups.some((g) => g.threeD);
    if (cs.dTable && catInf && !catInf.scale && catInf.dir === 'h' && !is3D) {
      const dt = cs.dTable;
      const t = this.text(dt.txPr);
      const series = catInf.groups.flatMap((g) => g.series.map((s) => ({ s, g })));
      const rowH = 1.5 * t.sz * S;
      const lineKey = (g: Group) => g.kind === 'line' || g.kind === 'scatter' || g.kind === 'radar';
      const keyW = (g: Group) => (!dt.keys ? 0 : lineKey(g) ? 21.75 * S + 2.25 * S : t.sz * S * 0.52 + 3.75 * S);
      const nameW = Math.max(0, ...series.map(({ s, g }) => 2.25 * S + keyW(g) + this.measure(s.name, t) + 3 * S));
      catInf.showLabels = false;
      this.dtab = { x: this.area.x + 16.5 * S, nameW, rowH, series, t, catInf };
      outer = { ...outer, h: outer.h - (1 + series.length) * rowH };
    }
    // layout iterativo: reserva rótulos nos lados
    let plot = this.plotRect(outer, [...infos.values()]);
    if (this.dtab && plot.x < this.dtab.x + this.dtab.nameW) {
      const dx = this.dtab.x + this.dtab.nameW - plot.x;
      plot = { ...plot, x: plot.x + dx, w: Math.max(10, plot.w - dx) };
      for (const inf of infos.values()) this.measureAxis(inf, plot);
    }
    // 3D com eixos em ângulo reto (rAngAx, o padrão): projeção OBLÍQUA — a
    // profundidade sobe para a direita, D = L·(sen rotY, −sen rotX) (proporção
    // medida nos gráficos 3D do oráculo: 15°/20° → (32, −24) px), e o plano da
    // frente encolhe para caber o fundo
    this.depth = undefined;
    const g3 = cs.groups.find((g) => g.threeD && (g.kind === 'bar' || g.kind === 'line' || g.kind === 'area'));
    if (g3 && cs.view3D?.rAngAx !== false) {
      const v = cs.view3D;
      const rx = (v?.rotX ?? 15) * Math.PI / 180, ry = (v?.rotY ?? 20) * Math.PI / 180;
      const horiz = g3.kind === 'bar' && g3.dir === 'bar';
      const a0 = this.axisById(g3.axIds[0]);
      const n = Math.max(1, (a0 ? infos.get(a0)?.nCats : undefined) ?? 1);
      // profundidade = largura da barra × (1 + gapDepth) × depthPercent, com a barra como
      // fração da faixa da categoria (medido, syn-a-3dbox2/3dobl: 1 série e gapWidth 150 →
      // uma faixa; 3 séries agrupadas → 0,56 faixa; gapDepth 500 → 2,4×; depthPercent linear)
      const clustered = g3.kind === 'bar' && g3.grouping === 'clustered';
      const ns = clustered ? g3.series.length : 1;
      const ov = clustered ? Math.max(-1, Math.min(1, g3.overlap / 100)) : 1;
      const barFrac = 1 / (1 + (ns - 1) * (1 - ov) + g3.gapWidth / 100);
      const kL = barFrac * (1 + (g3.gapDepth ?? 150) / 100) * Math.max(0.2, (v?.depthPercent ?? 100) / 100) / n;
      const sx = Math.sin(ry), sy = Math.sin(rx);
      // a face da frente mantém a proporção altura/largura do retângulo interno do gráfico
      // (moldura − 20,25/16,5/19,5/15,75 pt, sem título/legenda) e a figura (frente +
      // profundidade) é a maior que cabe na área de plotagem, centrada (medido,
      // syn-a-3dbox2 #17–#23, syn-a-3dobl: legenda embaixo achata a proporção)
      const S = this.S;
      const asp = Math.max(0.05, (outer.h + (PAD.t + PAD_B_AXES - 32.25) * S) / Math.max(1, outer.w + (PAD.l + PAD.r - 39.75) * S));
      // na vertical a figura 3D fica ≥ 14,25 pt do topo da moldura e ≥ 12,75 pt da base
      // (medido com e sem eixos, syn-a-3dobl/3dbox2); na horizontal, centrada na área livre
      const A = this.area;
      const fy0 = Math.max(plot.y, A.y + MARGIN_3D.t * S), fy1 = Math.min(plot.y + plot.h, A.y + A.h - MARGIN_3D.b * S);
      plot = { x: plot.x, y: fy0, w: plot.w, h: Math.max(4, fy1 - fy0) };
      // L = kL × comprimento do eixo de categorias na face da frente
      let W: number, H: number;
      if (!horiz) { W = Math.min(plot.w / (1 + kL * sx), plot.h / (asp + kL * sy)); H = asp * W; }
      else { H = Math.min(plot.h / (1 + kL * sy), plot.w / (1 / asp + kL * sx)); W = H / asp; }
      const L = kL * (horiz ? H : W);
      const dx = L * sx, dy = L * sy;
      this.depth = { dx, dy, gapDepth: g3.gapDepth ?? 150, horiz };
      // centrada na horizontal, encostada no topo
      const ox = (plot.w - W - dx) / 2;
      plot = { x: plot.x + ox, y: plot.y + dy, w: W, h: H };
      for (const inf of infos.values()) this.measureAxis(inf, plot);
    }
    // grade e área de plotagem
    if (this.showBg()) {
      if (this.depth) this.paintWalls3D(plot);
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
    if (this.showBg()) { for (const inf of infos.values()) this.paintAxis(inf, plot); this.paintFloor3D(plot); if (this.dtab) this.paintDataTable(plot); }
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
  private valueLabels(inf: AxisInfo): { v: number; s: string; color?: string }[] {
    const sc = inf.scale!;
    const div = inf.ax.dispUnits ?? 1;
    // cor do formato ([Red]…) pinta o rótulo (medido, lo-tdf137691: negativos em #FF0000)
    return tickValues(sc).map((v) => { const f = formatValue(v / div, inf.fmt, { locale: this.loc }); return { v, s: f.text, ...(f.color ? { color: f.color } : {}) }; });
  }

  /**
   * Comprimento do tique principal (px): cresce com o texto do PRÓPRIO eixo
   * (medido, syn-a-ticks2: 6 pt → 2,4 pt, 10 pt → 3,75 pt, 24 pt → 7,7 pt,
   * 32 pt → 9,9 pt; só o tamanho do eixo de valores muda o tique dele).
   */
  private tickSize(a: Axis): number {
    const t = this.text(a.txPr);
    return (TICK_K * t.sz + TICK_B) * this.S * this.fontK(t);
  }

  private fontKCache = new Map<string, number>();

  /**
   * Altura de linha da fonte (ascendente + descendente) ÷ a da Aptos (1,22 em):
   * o tique e as folgas dos rótulos dos eixos escalam com ela (medido,
   * syn-a-ticks3: Times New Roman ≈ 0,91 da Aptos no mesmo tamanho; Calibri,
   * 1,22 em, igual à Aptos). Sem a métrica no canvas, 1.
   */
  private fontK(t: ResolvedText): number {
    const f = this.font({ ...t, sz: 100 / this.S });
    let k = this.fontKCache.get(f);
    if (k === undefined) {
      this.ctx.font = f;
      const m = this.ctx.measureText('Hg') as Partial<TextMetrics>;
      const h = (m.fontBoundingBoxAscent ?? NaN) + (m.fontBoundingBoxDescent ?? NaN);
      k = Number.isFinite(h) && h > 0 ? Math.max(0.8, Math.min(1.25, h / 100 / 1.22)) : 1;
      this.fontKCache.set(f, k);
    }
    return k;
  }

  private tickLen(a: Axis, kind: Axis['majorTick'] = a.majorTick): { out: number; inn: number } {
    const L = this.tickSize(a);
    return kind === 'out' ? { out: L, inn: 0 } : kind === 'in' ? { out: 0, inn: L } : kind === 'cross' ? { out: L, inn: L } : { out: 0, inn: 0 };
  }

  /**
   * Distância eixo → rótulos reservada pelo tique: a MESMA com tique para
   * fora, para dentro, cruzado ou sem tique (medido: o eixo e os rótulos não
   * se mexem entre none/in/out/cross — o espaço do tique fica vazio).
   */
  private lblTick(a: Axis): number {
    return this.tickSize(a);
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
      // layoutTarget ausente = "outer" (o default do schema; medido no Excel, syn
      // layout1: x=0/w=1 sem alvo deixa os rótulos do eixo dentro). "inner" é o
      // retângulo da plotagem, mas os rótulos não saem da área do gráfico: o
      // lado que não comporta o eixo encosta nele (medido: inner x=0 → plotagem
      // a partir da largura dos rótulos, borda direita mantida)
      if (pl.target === 'inner') {
        for (const inf of infos) this.measureAxis(inf, r);
        // só os rótulos de VALORES (largura exata; os de categoria o Office ainda quebra/gira), sem o título
        const ext = { l: 0, r: 0, t: 0, b: 0 };
        for (const inf of infos) if (inf.scale && !this.crossesInside(inf, infos)) { const s = this.axisSide(inf); ext[s] = Math.max(ext[s], inf.extent - (inf.titleExtent ?? 0)); }
        const x0 = Math.max(r.x, A.x + ext.l), y0 = Math.max(r.y, A.y + ext.t);
        const x1 = Math.min(r.x + r.w, A.x + A.w - ext.r), y1 = Math.min(r.y + r.h, A.y + A.h - ext.b);
        if (x1 - x0 > 10 && y1 - y0 > 10 && (x0 !== r.x || y0 !== r.y || x1 !== r.x + r.w || y1 !== r.y + r.h)) {
          r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          for (const inf of infos) this.measureAxis(inf, r);
        }
        return r;
      }
    }
    let plot = { ...r };
    // nada à direita (legenda embaixo/em cima/sem legenda): a plotagem para
    // 3,75 pt antes (medido: 11,25 pt da borda do gráfico com texto de 10 e 18 pt)
    const lg = this.cs.legend;
    // (layout manual "outer": a caixa dada já é o limite — medido, syn layout1: grade até a borda)
    const manual = !!(pl && pl.w !== undefined && pl.h !== undefined);
    const padR = manual || lg && !lg.overlay && (lg.pos === 'r' || lg.pos === 'tr') ? 0 : PLOT_PAD_R * S;
    for (let it = 0; it < 3; it++) {
      const ext = { l: 0, r: 0, t: 0, b: 0 };
      for (const inf of infos) this.measureAxis(inf, plot);
      for (const inf of infos) {
        // eixo que cruza o outro DENTRO da plotagem (zero entre negativos e positivos):
        // os rótulos ficam junto dele, lá dentro — nada reservado na borda (medido,
        // syn-a-mso07/16 #12: barras com negativos usam a altura toda)
        if (this.crossesInside(inf, infos)) continue;
        const side = this.axisSide(inf);
        ext[side] = Math.max(ext[side], inf.extent);
      }
      // meia altura do rótulo extremo de um eixo vertical vaza para cima/baixo
      const vAx = infos.find((i) => i.dir === 'v' && i.showLabels);
      const halfT = vAx ? this.lineH(this.text(vAx.ax.txPr)) / 2 : 0;
      // (medido, syn-a-ticks2: 6–10 pt → 5,5 pt; 12/14/24/32 pt → 7/8,5/14,5/19 pt)
      const t = Math.max(ext.t, vAx ? Math.max(PLOT_MIN_T * S, halfT - 0.25 * S) : 0), b = Math.max(ext.b, ext.b === 0 ? halfT : 0);
      const hAx = infos.find((i) => i.dir === 'h' && i.showLabels && i.scale);
      const halfR = hAx ? this.measure(this.valueLabels(hAx).at(-1)?.s ?? '', this.text(hAx.ax.txPr)) / 2 : 0;
      // categorias nas marcas (área/linha midCat): o último rótulo centrado na borda direita
      const cAx = infos.find((i) => i.dir === 'h' && i.showLabels && !i.scale && i.onTicks && !i.labelRot);
      const halfC = cAx ? Math.max(0, ...(cAx.labelLines.at(-1) ?? [cAx.cats?.at(-1) ?? '']).map((l) => this.measure(l, this.text(cAx.ax.txPr)))) / 2 : 0;
      plot = { x: r.x + ext.l, y: r.y + t, w: r.w - ext.l - Math.max(ext.r, halfR, halfC, padR), h: r.h - t - b };
      if (plot.w < 10 || plot.h < 10) { plot = { x: r.x + r.w * 0.1, y: r.y + r.h * 0.1, w: r.w * 0.8, h: r.h * 0.8 }; break; }
    }
    return plot;
  }

  /**
   * Distância (em em) entre o tique e os rótulos de categoria de um eixo
   * horizontal: 0,1 em + 0,3 em × lblOffset/100 (medido, syn-a-lbloff com
   * 0/50/100/200/1000 a 16 pt, Aptos e Calibri iguais).
   */
  private catGap(a: Axis): number {
    return 0.1 + 0.3 * Math.max(0, Math.min(1000, a.lblOffset)) / 100;
  }

  /** O eixo (rótulos junto dele, sem título) cruza o eixo de valores estritamente dentro da escala? */
  private crossesInside(inf: AxisInfo, infos: AxisInfo[]): boolean {
    const a = inf.ax;
    if (a.deleted || a.title || inf.secondary || a.tickLblPos !== 'nextTo') return false;
    const sc = infos.find((i) => i.ax === inf.cross)?.scale;
    if (!sc || sc.log) return false;
    const v = a.crossesAt ?? (a.crosses === 'autoZero' ? 0 : undefined);
    return v !== undefined && v > sc.lo && v < sc.hi;
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
    // folgas em "em" escaladas pela altura de linha da fonte (fontK)
    const em = t.sz * S * this.fontK(t);
    const tk = this.tickLen(a);
    const off = this.lblTick(a);
    let ext = 0;
    if (inf.showLabels) {
      const gap = off + em * 0.6;
      if (inf.scale) {
        const labels = this.valueLabels(inf);
        if (inf.dir === 'v') ext = Math.max(0, ...labels.map((l) => this.measure(l.s, t))) + gap;
        else ext = this.lineH(t) + off + em * H_LBL_GAP;
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
            ext = maxW * Math.sin(rad) + this.lineH(t) * Math.cos(rad) + off + em * this.catGap(a);
          } else if (maxW <= band * 0.98 || rot === 0) {
            inf.labelRot = 0;
            inf.labelLines = cats.map((s) => (rot === 0 && this.measure(s, t) > band ? this.wrap(s, t, band) : [s]));
            ext = Math.max(1, ...inf.labelLines.map((l) => l.length)) * this.lineH(t) + off + em * this.catGap(a);
          } else {
            // quebra em palavras se couber em até 3 linhas sem palavra maior que a faixa
            const wrapped = cats.map((s) => this.wrap(s, t, band * 0.98));
            const okWrap = wrapped.every((ls) => ls.length <= 3 && ls.every((l) => this.measure(l, t) <= band * 1.02));
            if (okWrap) {
              inf.labelRot = 0;
              inf.labelLines = wrapped;
              ext = Math.max(...wrapped.map((l) => l.length)) * this.lineH(t) + off + em * this.catGap(a);
            } else {
              inf.labelRot = -45;
              inf.labelLines = cats.map((s) => [s]);
              const lh = this.lineH(t);
              if (a.tickLblSkip === undefined) inf.labelSkip = Math.max(1, Math.ceil(lh * 1.05 / (band * Math.SQRT1_2)));
              ext = Math.min(maxW * Math.SQRT1_2 + lh * Math.SQRT1_2, this.area.h * 0.45) + off + em * this.catGap(a);
            }
          }
        } else {
          inf.labelLines = cats.map((s) => this.wrap(s, t, this.area.w * 0.4));
          const lh = this.lineH(t);
          if (a.tickLblSkip === undefined) inf.labelSkip = Math.max(1, Math.ceil(lh * 1.0 / Math.max(1, band)));
          ext = Math.max(0, ...inf.labelLines.flat().map((s) => this.measure(s, t))) + off + em * 0.6;
        }
        if (inf.catLevels) ext += inf.catLevels.length * (this.lineH(t) + em * 0.3);
      }
    } else ext = tk.out;
    if (a.title) {
      const tt = this.text({ sz: this.base.sz, b: true }, a.title.txPr);
      const vertical = inf.dir === 'v' && (a.title.txPr.rot === undefined ? true : Math.abs(a.title.txPr.rot) === 90);
      inf.titleExtent = (vertical ? this.lineH(tt) : this.lineH(tt)) + 5 * S;
      ext += inf.titleExtent;
    } else inf.titleExtent = 0;
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
      const maj = this.tickLen(a);
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
  private depth: { dx: number; dy: number; gapDepth: number; horiz?: boolean } | undefined;
  /** Tabela de dados em curso (layout feito em paintAxesChart). */
  private dtab: { x: number; nameW: number; rowH: number; series: { s: Series; g: Group }[]; t: ResolvedText; catInf: AxisInfo } | undefined;

  /**
   * Tabela de dados: cabeçalho com as categorias alinhado às faixas do eixo,
   * uma linha por série (chave + nome à esquerda, valores no formato da
   * série, sem a cor do formato); bordas cinza 50% conforme showHorzBorder /
   * showVertBorder / showOutline (o canto de cima à esquerda fica vazio).
   */
  private paintDataTable(plot: Rect): void {
    const T = this.dtab!, dt = this.cs.dTable!;
    const c = this.ctx, S = this.S, t = T.t;
    const inf = T.catInf;
    const n = inf.nCats ?? 1;
    const y0 = plot.y + plot.h, x0 = T.x, xp = plot.x, x1 = plot.x + plot.w;
    const rows = T.series.length;
    const yb = y0 + (rows + 1) * T.rowH;
    const edges = Array.from({ length: n + 1 }, (_, i) => this.pos(inf, plot, i, false));
    // textos
    const lh = T.rowH;
    for (let i = 0; i < n; i++) {
      const cx = (edges[i]! + edges[i + 1]!) / 2;
      this.drawLines([inf.cats?.[i] ?? String(i + 1)], t, cx, y0 + lh / 2, 'center');
    }
    T.series.forEach(({ s, g }, r) => {
      const yc = y0 + (r + 1.5) * lh;
      let x = x0 + 2.25 * S;
      if (dt.keys) {
        const lineKey = g.kind === 'line' || g.kind === 'scatter' || g.kind === 'radar';
        if (lineKey) {
          const kw = 21.75 * S;
          const ln = mergeLine({ paint: { kind: 'solid', color: this.seriesColor(s, g) }, w: 2.25 }, s.sp.line);
          if (ln && this.setLine(ln)) { c.beginPath(); c.moveTo(x, yc); c.lineTo(x + kw, yc); c.stroke(); c.setLineDash([]); }
          const m = this.markerOf(g, s, -1);
          if (m) this.paintMarker(m, x + kw / 2, yc, s, g, Math.min(m.size, 7));
          x += kw + 2.25 * S;
        } else {
          const k = t.sz * S * 0.52;
          const fill = this.pointFill(g, s, -1, 1);
          if (this.setFill(fill, { x, y: yc - k / 2, w: k, h: k })) c.fillRect(x, yc - k / 2, k, k);
          x += k + 3.75 * S;
        }
      }
      this.drawLines([s.name], t, x, yc, 'left');
      for (let i = 0; i < n; i++) {
        const v = s.values[i];
        if (v === null || v === undefined) continue;
        const txt = formatValue(v, s.ptFmts?.[i] ?? s.fmt ?? 'General', { locale: this.loc }).text;
        this.drawLines([txt], t, (edges[i]! + edges[i + 1]!) / 2, yc, 'center');
      }
    });
    // bordas (cinza 50% da linha default)
    const base = this.defaultLine().paint;
    const col = base?.kind === 'solid' ? mixWhite(base.color, 0.5) : '#808080';
    c.save();
    c.strokeStyle = col;
    c.lineWidth = 1;
    c.setLineDash([]);
    c.beginPath();
    const hl = (y: number, xa: number, xb: number) => { const q = Math.round(y) + 0.5; c.moveTo(xa, q); c.lineTo(xb, q); };
    const vl = (x: number, ya: number, yb2: number) => { const q = Math.round(x) + 0.5; c.moveTo(q, ya); c.lineTo(q, yb2); };
    if (dt.horz) { hl(y0, xp, x1); for (let r = 1; r <= rows; r++) hl(y0 + r * lh, x0, x1); }
    if (dt.vert) { for (let i = 0; i <= n; i++) vl(edges[i]!, y0, yb); }
    if (dt.outline) { hl(y0, xp, x1); hl(y0 + lh, x0, xp); hl(yb, x0, x1); vl(x0, y0 + lh, yb); vl(xp, y0, yb); vl(x1, y0, yb); }
    c.stroke();
    c.restore();
  }

  /**
   * Paredes e piso do 3D oblíquo com o preenchimento do spPr deles, sombreados
   * como no PowerPoint (medido, syn-a-3dobl: fundo ×1, lateral ×0,645, piso
   * ×0,756 em RGB). Nas barras horizontais o piso fica à ESQUERDA (com o
   * sombreado da lateral) e a parede lateral embaixo (com o do piso).
   */
  private paintWalls3D(plot: Rect): void {
    const D = this.depth!;
    const cs = this.cs;
    const c = this.ctx;
    const x0 = plot.x, y0 = plot.y, x1 = plot.x + plot.w, y1 = plot.y + plot.h;
    const left: [number, number][] = [[x0, y0], [x0 + D.dx, y0 - D.dy], [x0 + D.dx, y1 - D.dy], [x0, y1]];
    const bottom: [number, number][] = [[x0, y1], [x1, y1], [x1 + D.dx, y1 - D.dy], [x0 + D.dx, y1 - D.dy]];
    const back: [number, number][] = [[x0 + D.dx, y0 - D.dy], [x1 + D.dx, y0 - D.dy], [x1 + D.dx, y1 - D.dy], [x0 + D.dx, y1 - D.dy]];
    const planes: [ShapeProps | undefined, [number, number][], number][] = [
      [cs.backWallSp, back, 1],
      [D.horiz ? cs.floorSp : cs.sideWallSp, left, SHADE_SIDE],
      [D.horiz ? cs.sideWallSp : cs.floorSp, bottom, SHADE_TOP],
    ];
    for (const [sp, pts, k] of planes) {
      const f = sp?.fill;
      if (!f || f.kind === 'none') continue;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      const p: Paint = f.kind === 'solid' && k !== 1 ? { ...f, color: scaleRgb(f.color, k) } : f;
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      if (this.setFill(p, { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) })) this.withFillAlpha(p, () => c.fill());
    }
  }
  private allInfos(_plot: Rect): AxisInfo[] { return this.infosCache ?? []; }

  private paintAxisLabels(inf: AxisInfo, plot: Rect, at: number, sgn: number): void {
    const a = inf.ax;
    const t = this.text(a.txPr);
    // folgas em "em" escaladas pela altura de linha da fonte (fontK)
    const S = this.S, em = t.sz * S * this.fontK(t);
    const tk = this.lblTick(a);
    // tickLblPos low/high: rótulos na borda do plot e não junto do eixo
    let base = at;
    const side = this.axisSide(inf);
    if (a.tickLblPos === 'low') base = side === 'l' || side === 'r' ? (inf.dir === 'v' ? plot.x : plot.y + plot.h) : inf.dir === 'h' ? plot.y + plot.h : plot.x;
    else if (a.tickLblPos === 'high') base = inf.dir === 'v' ? plot.x + plot.w : plot.y;
    const sg = a.tickLblPos === 'high' ? -sgn : sgn;
    if (inf.scale) {
      for (const { v, s, color } of this.valueLabels(inf)) {
        const p = this.pos(inf, plot, v);
        const tc = color ? { ...t, color, alpha: 1 } : t;
        if (inf.dir === 'v') {
          const x = base + sg * (tk + em * 0.6);
          this.drawLines([s], tc, x, p, sg < 0 ? 'right' : 'left');
        } else {
          const y = base + sg * (tk + em * H_LBL_GAP + this.lineH(t) / 2);
          this.drawLines([s], tc, p, y, 'center');
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
        const y0 = base + sg * (tk + em * this.catGap(a));
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
        const x = base + sg * (tk + em * 0.6);
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
        const inverted = !!inv && raw < 0 && fill.kind === 'solid';
        if (inverted) fill = { kind: 'solid', color: this.cs.bg1 };
        const sp: ShapeProps = { ...s.sp, ...(dp?.sp ?? {}) };
        // invertida sem contorno próprio: branca com o contorno das linhas default
        // (medido, syn-a-mso16 #12: preto 0,75 pt; as positivas seguem sem contorno)
        const line = mergeLine(inverted ? this.defaultLine() : undefined, mergeLine(s.sp.line, dp?.sp.line));
        if (this.depth) this.box3D(r, fill, line);
        else this.shapeRect(r, { ...(sp.shadow ? { shadow: sp.shadow } : {}), ...(line ? { line } : {}) }, fill);
        off = 0;
      }
    });
    void c;
  }

  /**
   * Barra 3D (caixa): frente na fatia do meio da profundidade (folga
   * gapDepth, default 150%), topo e lado direito sombreados (×0,756 / ×0,645).
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
    // luz medida (syn-a-3dobl): lado ×0,645 e topo ×0,756 da cor da frente, em RGB
    face([[fx + r.w, fy], [fx + r.w + bx, fy + by], [fx + r.w + bx, fy + r.h + by], [fx + r.w, fy + r.h]], base && scaleRgb(base, SHADE_SIDE));
    face([[fx, fy], [fx + bx, fy + by], [fx + r.w + bx, fy + by], [fx + r.w, fy]], base && scaleRgb(base, SHADE_TOP));
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

  /**
   * Largura default da linha de série: com a 1ª linha do tema (lnStyleLst, `themeLn`)
   * = 3× (estilos 1–8), 7× (25–32), 5× (os demais) — medido no Excel com três temas
   * (syn lw1/lw2/lw3: 0,5/2/1 pt → 1,5/6/3 pt nos 1–8); sem ela, a do PowerPoint
   * (2,25 pt nos 1–8, 4,5 pt nos demais).
   */
  private seriesLineW(): number {
    const row = this.styleRow();
    const ln1 = this.cs.themeLn?.[0];
    if (ln1 !== undefined && ln1 > 0) return ln1 * (row === 0 ? 3 : row === 3 ? 7 : 5);
    return row === 0 ? 2.25 : 4.5;
  }

  private seriesLine(g: Group, s: Series): LineProps | undefined {
    const col = this.seriesColor(s, g);
    return mergeLine({ paint: { kind: 'solid', color: col }, w: this.seriesLineW(), cap: 'rnd' }, s.sp.line);
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
  /**
   * Pizza 3D como o PowerPoint (medido, syn-a-pie3d): cilindro de raio R e
   * altura 0,236·R·hPercent, visto de cima pela elevação rotX, em PERSPECTIVA
   * (câmera a 234·R/perspective do centro; rAngAx não vale para pizza; rotY
   * gira as fatias como o firstSliceAng). A área de plotagem fica a 11,25 pt
   * da moldura; a projeção cabe em 97,7% dela, centrada — com sobra na
   * vertical, sobe 0,0019·perspective × sobra. A lateral escurece da esquerda
   * (×0,87) para a direita (×0,23).
   */
  private paintPie3D(outer: Rect): void {
    const c = this.ctx;
    const cs = this.cs;
    const S = this.S, A = this.area;
    const g = cs.groups[0]!;
    const pl = cs.plotLayout;
    let r: Rect;
    if (pl && pl.w !== undefined && pl.h !== undefined) r = { x: A.x + (pl.x ?? 0) * A.w, y: A.y + (pl.y ?? 0) * A.h, w: pl.w * A.w, h: pl.h * A.h };
    else {
      const m = 11.25 * S;
      const x0 = Math.max(outer.x, A.x + m), y0 = Math.max(outer.y, A.y + m);
      const x1 = Math.min(outer.x + outer.w, A.x + A.w - m), y1 = Math.min(outer.y + outer.h, A.y + A.h - m);
      r = { x: x0, y: y0, w: Math.max(4, x1 - x0), h: Math.max(4, y1 - y0) };
      // com rótulos de dados que podem sair da fatia, a área encolhe 1/15 de cada lado
      // (medido, syn-a-pie3db/pie3dc: 450 → 390 px no quadrado, 389×274 → 338×237)
      if (this.pieLabelsOutside(g)) r = { x: r.x + r.w / 15, y: r.y + r.h / 15, w: r.w * 13 / 15, h: r.h * 13 / 15 };
    }
    if (this.showBg()) this.shapeRect(r, cs.plotSp);
    const s = g.series[0];
    if (!s) return;
    const v = cs.view3D;
    const a = Math.max(0, Math.min(90, v?.rotX ?? 30)) * Math.PI / 180;
    const p = Math.max(0, v?.perspective ?? 30);
    const h = 0.236 * Math.max(0, (v?.hPercent ?? 100) / 100);
    const d = p > 0 ? 234 / p : Infinity;
    const exs = s.values.map((_, i) => Math.max(0, (s.dPts.get(i)?.explosion ?? s.explosion ?? 0) / 100));
    const exMax = Math.max(0, ...exs);
    const R = 1 / (1 + exMax);
    // x à direita, y para cima, z para o observador (unidades: raio total = 1)
    const proj = (x: number, y: number, z: number): [number, number] => {
      const y2 = y * Math.cos(a) - z * Math.sin(a), z2 = y * Math.sin(a) + z * Math.cos(a);
      const f = Number.isFinite(d) ? d / Math.max(0.05, d - z2) : 1;
      return [x * f, -y2 * f];
    };
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (let k = 0; k < 120; k++) {
      const t = k * Math.PI / 60;
      for (const y of [h / 2, -h / 2]) { const [u, w] = proj(Math.sin(t), y, -Math.cos(t)); bx0 = Math.min(bx0, u); bx1 = Math.max(bx1, u); by0 = Math.min(by0, w); by1 = Math.max(by1, w); }
    }
    const sc = 0.977 * Math.min(r.w / (bx1 - bx0), r.h / (by1 - by0));
    const slack = Math.max(0, 0.977 * r.h - sc * (by1 - by0));
    const cx = r.x + r.w / 2 - sc * (bx0 + bx1) / 2;
    const cy = r.y + r.h / 2 - sc * (by0 + by1) / 2 - 0.0019 * p * slack;
    const P = (x: number, y: number, z: number): [number, number] => { const [u, w] = proj(x, y, z); return [cx + sc * u, cy + sc * w]; };
    // fatias: ângulo φ no sentido horário a partir das 12 h, no plano da face de cima
    const vals = s.values.map((x) => Math.max(0, x ?? 0));
    const total = vals.reduce((x, y) => x + y, 0);
    if (!(total > 0)) return;
    const rot = ((g.firstSliceAng + (v?.rotY ?? 0)) % 360) * Math.PI / 180;
    let acc = rot;
    const sl = vals.map((val, i) => {
      const f0 = acc, f1 = acc + (val / total) * Math.PI * 2;
      acc = f1;
      const mid = (f0 + f1) / 2;
      return { i, f0, f1, ox: Math.sin(mid) * exs[i]!, oz: -Math.cos(mid) * exs[i]! };
    });
    const rim = (q: (typeof sl)[number], f: number, y: number): [number, number] => P(q.ox + R * Math.sin(f), y, q.oz - R * Math.cos(f));
    const baseColor = (i: number): string | undefined => {
      const fill = this.pointFill(g, s, i, vals.length);
      return fill.kind === 'solid' ? fill.color : fill.kind === 'grad' ? fill.stops[Math.floor(fill.stops.length / 2)]!.color : fill.kind === 'patt' ? fill.fg : undefined;
    };
    // laterais (só a metade da frente aparece), em faixas sombreadas de trás para a frente
    const strips: { z: number; pts: [number, number][]; color: string }[] = [];
    for (const q of sl) {
      if (!this.showData(this.seriesIndex.get(s) ?? 0, q.i)) continue;
      const col = baseColor(q.i);
      if (!col || vals[q.i] === 0) continue;
      const n = Math.max(2, Math.ceil((q.f1 - q.f0) / (Math.PI / 60)));
      for (let k = 0; k < n; k++) {
        const t0 = q.f0 + (q.f1 - q.f0) * k / n, t1 = q.f0 + (q.f1 - q.f0) * (k + 1) / n, tm = (t0 + t1) / 2;
        if (Math.cos(tm) > 0.02) continue; // de costas
        const xr = Math.sin(tm);
        const kk = Math.max(0.2, Math.min(1, 0.548 - 0.32 * xr));
        strips.push({ z: -Math.cos(tm), pts: [rim(q, t0, h / 2), rim(q, t1, h / 2), rim(q, t1, -h / 2), rim(q, t0, -h / 2)], color: scaleRgb(col, kk) });
      }
    }
    strips.sort((x, y) => x.z - y.z);
    for (const st of strips) {
      c.beginPath();
      st.pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fillStyle = st.color;
      c.fill();
      c.strokeStyle = st.color; c.lineWidth = 0.6; c.setLineDash([]); c.stroke(); // emenda das faixas
    }
    // faces de cima
    for (const q of sl) {
      if (!this.showData(this.seriesIndex.get(s) ?? 0, q.i) || vals[q.i] === 0) continue;
      const n = Math.max(2, Math.ceil((q.f1 - q.f0) / (Math.PI / 90)));
      c.beginPath();
      const [x0, y0] = P(q.ox, h / 2, q.oz);
      c.moveTo(x0, y0);
      for (let k = 0; k <= n; k++) { const [x, y] = rim(q, q.f0 + (q.f1 - q.f0) * k / n, h / 2); c.lineTo(x, y); }
      c.closePath();
      const fill = this.pointFill(g, s, q.i, vals.length);
      if (this.setFill(fill, { x: cx - sc, y: cy - sc, w: 2 * sc, h: 2 * sc })) this.withFillAlpha(fill, () => c.fill());
      const line = mergeLine(s.sp.line, s.dPts.get(q.i)?.sp.line);
      if (line && this.setLine(line)) { c.lineJoin = 'round'; c.stroke(); c.setLineDash([]); }
    }
    // rótulos: como na pizza 2D, no plano da face de cima projetado
    const dl = mergeDLbls(g.dLbls, s.dLbls);
    if (!dl) return;
    for (const q of sl) {
      const pd = dl.points?.get(q.i);
      const eff = pd ? { ...dl, ...stripUndef(pd) } : dl;
      if (eff.delete || !this.showData(this.seriesIndex.get(s) ?? 0, q.i)) continue;
      const txt = pd?.text ?? this.labelText(eff, s, q.i, vals[q.i]! / total, 'pie');
      if (!txt) continue;
      const t = this.text(dl.txPr, pd?.txPr);
      const lines = txt.split('\n');
      const tw = Math.max(...lines.map((l) => this.measure(l, t))), th = lines.length * this.lineH(t);
      const pos = eff.pos ?? 'bestFit';
      const Rpx = sc * R;
      let rr: number;
      if (pos === 'ctr') rr = R / 2;
      else if (pos === 'inEnd') rr = R - Math.max(tw, th) * 0.6 / sc;
      else if (pos === 'outEnd') rr = R + (Math.max(tw, th) * 0.6 + 4 * S) / sc;
      else rr = (q.f1 - q.f0) * Rpx * 0.65 < Math.max(tw, th) * 1.1 ? R + (Math.max(tw, th) * 0.6 + 4 * S) / sc : R * 0.62;
      const mid = (q.f0 + q.f1) / 2;
      const [x, y] = P(q.ox + rr * Math.sin(mid), h / 2, q.oz - rr * Math.cos(mid));
      this.shapeRect({ x: x - tw / 2 - 2, y: y - th / 2 - 1, w: tw + 4, h: th + 2 }, eff.sp);
      this.drawLines(lines, t, x, y, 'center');
    }
  }

  private paintPies(outer: Rect): void {
    const c = this.ctx;
    const cs = this.cs;
    if (cs.groups[0]?.threeD && cs.groups[0].kind === 'pie') { this.paintPie3D(outer); return; }
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
    // formato vinculado: o do PONTO (`c:pt formatCode`) vence o do cache da série
    // (gdx-545393 #12: cache "General", pontos "0%" → o PowerPoint mostra 29%)
    const fmt = pickFmt(d.numFmt, (valOverride === undefined ? s.ptFmts?.[i] : undefined) ?? s.fmt);
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

/** Mistura #RRGGBB com branco (k = fração do branco). */
function mixWhite(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Cor #RRGGBB com os canais multiplicados por k (luz das faces 3D). */
function scaleRgb(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

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
