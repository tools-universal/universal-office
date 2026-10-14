/**
 * Texto com DEFORMAÇÃO (WordArt: `<a:bodyPr><a:prstTxWarp prst>`), com as regras
 * medidas no PowerPoint (decks sintéticos syn-b-e1…e7, 2026-10-14):
 *
 *  - a geometria de cada preset (os caminhos de presetTextWarpDefinitions) usa a
 *    caixa INTEIRA da forma — os insets do bodyPr não entram;
 *  - presets de ENVELOPE (dois caminhos: plain, inflar, ondas, inclinações,
 *    chevron, "pour"…): o retângulo do bloco de texto é mapeado entre o caminho
 *    de cima e o de baixo, qualquer que seja o tamanho da fonte. Vertical = TINTA
 *    dos glifos (topo do "H"/"x" até a base ou o descendente); horizontal = tinta,
 *    mas espaços no começo/fim contam pelo avanço. Cada caminho é parametrizado
 *    pelo COMPRIMENTO DE ARCO; ponto = topo(u) + v·(base(u) − topo(u)). Presets
 *    de 4/6 caminhos (DeflateInflate, DeflateInflateDeflate, ButtonPour) dividem
 *    as linhas entre as faixas (⌈restantes/faixas⌉ por faixa);
 *  - presets de CAMINHO ÚNICO (archUp/archDown/circle/button): o texto segue o
 *    caminho no tamanho NATURAL, posicionado pelo alinhamento do parágrafo
 *    (centro = meio do caminho), com a baseline da ÚLTIMA linha 0,154 em abaixo
 *    do caminho (as anteriores empilham para "cima"); a quebra de linha não se
 *    aplica e o texto que excede o arco segue pela elipse. Com fromWordArt="1"
 *    (WordArt legado) o bloco é escalado por igual até a linha mais larga cobrir o
 *    caminho inteiro;
 *  - a sombra do texto (do run ou da forma sem preenchimento) é a silhueta
 *    deformada deslocada — fica a cargo de quem chama (camada).
 */

type Ctx = CanvasRenderingContext2D;
type Cv = HTMLCanvasElement | OffscreenCanvas;

import { patternRows } from './patterns.js';

/** Trecho de texto já posicionado pelo layout (pt, relativos ao canto da caixa). */
export interface WarpRun {
  text: string;
  /** Fonte CSS para um fator px/pt (`layoutFontStr(f, k)`). */
  font: (pxPerPt: number) => string;
  x: number;
  color: string;
  /** Contorno das letras: cor + espessura em pt. */
  stroke?: { color: string; width: number };
  /** Preenchimento de padrão 8×8 (`<a:pattFill>` das letras). */
  pattern?: { prst: string; fg: string; bg: string };
  /** Espaçamento extra entre caracteres (pt, `spc`). */
  spc?: number;
  /** Preenchimento (degradê/imagem) na caixa (px do raster) `[x, y, w, h]`; `k` = px do raster por pt. */
  paint?: (c: Ctx, box: [number, number, number, number], k: number) => CanvasGradient | CanvasPattern | null;
  /** Opacidade do preenchimento das letras (0 = só o contorno). */
  alpha?: number;
}

/** `letterSpacing` do canvas (Chromium/Firefox recentes); sem suporte, ignora. */
function setSpacing(c: Ctx, px: number): void {
  const l = c as unknown as { letterSpacing?: string };
  if (l.letterSpacing !== undefined) l.letterSpacing = `${px}px`;
}

/** Linha do layout. */
export interface WarpLine {
  runs: WarpRun[];
  /** Baseline (pt, relativa ao topo da caixa). */
  baseline: number;
  /** Maior tamanho de fonte da linha (pt). */
  sizePt: number;
  /** Altura da linha no layout (pt) — passo entre linhas. */
  height?: number;
  /** Entrelinha do parágrafo como fração do simples (spcPct, ou spcPts convertido); ausente = simples. */
  lnPct?: number;
  /** Alinhamento do parágrafo (l | ctr | r | just…). */
  align: string;
  /** Largura (pt) dos espaços no FIM do parágrafo — o layout os descarta, a deformação os conta. */
  trailing?: number;
}

// ---------------------------------------------------------------------------
// Geometria dos presets (caminhos amostrados em px, origem no canto da caixa)
// ---------------------------------------------------------------------------

/** Caminho amostrado: pontos (x,y) intercalados e comprimento acumulado. */
interface WarpPath {
  pts: number[];
  cum: number[];
  len: number;
  /** Arco: a elipse INTEIRA a partir do mesmo início/sentido (o texto além do fim segue por ela). */
  full?: WarpPath;
}

/** Ajustes padrão do app (medidos quando o avLst vem vazio). */
const DEFAULTS: Record<string, number[]> = {
  textPlain: [50000], textStop: [25000], textTriangle: [50000], textTriangleInverted: [50000],
  textChevron: [25000], textChevronInverted: [75000], textRingInside: [60000], textRingOutside: [60000],
  textArchUp: [10800000], textArchDown: [0], textCircle: [10800000], textButton: [10800000],
  textArchUpPour: [10800000, 50000], textArchDownPour: [0, 25000], textCirclePour: [10800000, 50000], textButtonPour: [10800000, 50000],
  textCurveUp: [45977], textCurveDown: [45977], textCascadeUp: [44444], textCascadeDown: [44444],
  textWave1: [12500, 0], textWave2: [12500, 0], textDoubleWave1: [6250, 0], textWave4: [6250, 0],
  textInflate: [18750], textDeflate: [18750], textInflateBottom: [60000], textDeflateBottom: [50000],
  textInflateTop: [40000], textDeflateTop: [50000], textDeflateInflate: [35000], textDeflateInflateDeflate: [25000],
  textFadeRight: [33333], textFadeLeft: [33333], textFadeUp: [33333], textFadeDown: [33333],
  textSlantUp: [55556], textSlantDown: [44444], textCanUp: [85714], textCanDown: [14286],
};

const SINGLE = new Set(['textArchUp', 'textArchDown', 'textCircle', 'textButton']);

/** Construtor de caminho amostrado. */
class PathB {
  pts: number[] = [];
  full?: WarpPath;
  private x = 0; private y = 0;
  move(x: number, y: number): this { this.pts.push(x, y); this.x = x; this.y = y; return this; }
  line(x: number, y: number): this { return this.move(x, y); }
  quad(cx: number, cy: number, x: number, y: number): this {
    const x0 = this.x, y0 = this.y;
    for (let i = 1; i <= 48; i++) { const t = i / 48, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; this.pts.push(a * x0 + b * cx + c * x, a * y0 + b * cy + c * y); }
    this.x = x; this.y = y; return this;
  }
  cubic(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    const x0 = this.x, y0 = this.y;
    for (let i = 1; i <= 64; i++) {
      const t = i / 64, m = 1 - t, a = m * m * m, b = 3 * t * m * m, c = 3 * t * t * m, d = t * t * t;
      this.pts.push(a * x0 + b * c1x + c * c2x + d * x, a * y0 + b * c1y + c * c2y + d * y);
    }
    this.x = x; this.y = y; return this;
  }
  /**
   * Arco de elipse (centro cx,cy) do ângulo st por sw graus (positivo = horário na
   * tela). Os ângulos são PARAMÉTRICOS (x = rx·cos t, y = ry·sin t) — medido no
   * archUp com ajuste 210° e fromWordArt: o texto cobre o arco paramétrico.
   */
  arc(cx: number, cy: number, rx: number, ry: number, stDeg: number, swDeg: number): this {
    const t0 = (stDeg * Math.PI) / 180, t1 = ((stDeg + swDeg) * Math.PI) / 180;
    const n = Math.max(8, Math.ceil((Math.abs(t1 - t0) * 180) / Math.PI) * 2);
    if (!this.pts.length) this.pts.push(cx + rx * Math.cos(t0), cy + ry * Math.sin(t0));
    for (let i = 1; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n; this.pts.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t)); }
    // a elipse inteira no mesmo sentido (o texto que passa do fim do arco continua por ela)
    const f: number[] = [], dir = t1 >= t0 ? 1 : -1;
    for (let i = 0; i <= 720; i++) { const t = t0 + (dir * i * 2 * Math.PI) / 720; f.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t)); }
    this.full = sampled(f);
    this.x = cx + rx * Math.cos(t1); this.y = cy + ry * Math.sin(t1);
    return this;
  }
  done(): WarpPath {
    const p = sampled(this.pts);
    return this.full ? { ...p, full: this.full } : p;
  }
}

function sampled(pts: number[]): WarpPath {
  const cum = [0];
  for (let i = 2; i < pts.length; i += 2) cum.push(cum[cum.length - 1]! + Math.hypot(pts[i]! - pts[i - 2]!, pts[i + 1]! - pts[i - 1]!));
  return { pts, cum, len: cum[cum.length - 1]! };
}

const pin = (lo: number, v: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Ângulos (visuais, graus) do arco "para cima" a partir do ajuste — fórmula do archUp. */
function archUpAngles(adj: number): [number, number] {
  const a = pin(0, adj, 21599999) / 60000;
  const v1 = 180 - a, v2 = 540 - a, end = v1 > 0 ? v1 : v2;
  const w1 = 90 - a, w2 = 270 - a, d1 = end - a, d2 = 360 + d1;
  const c2 = w2 > 0 ? d1 : d2, c1 = v1 > 0 ? d2 : c2, c0 = w1 > 0 ? d1 : c1;
  return [a, adj > 0 ? c0 : 360];
}
/** Arco "para baixo": do ângulo espelhado ao ajuste, no sentido anti-horário (texto da esquerda p/ a direita por baixo). */
function archDownAngles(adj: number): [number, number] {
  const a = pin(0, adj, 21599999) / 60000;
  let st = 180 - a; if (st <= 0) st += 360;
  let sw = (st - a) % 360; if (sw <= 0) sw += 360;
  return [st, -sw];
}

/** Caminhos do preset na caixa w×h (px). */
function warpGeometry(prst: string, adjIn: number[] | undefined, w: number, h: number): WarpPath[] {
  const def = DEFAULTS[prst] ?? [];
  const adj = (i: number): number => adjIn?.[i] ?? def[i] ?? 0;
  const hc = w / 2, vc = h / 2, wd2 = w / 2, hd2 = h / 2;
  const P = (): PathB => new PathB();
  const flat = (y0: number, y1 = y0, x0 = 0, x1 = w): WarpPath => P().move(x0, y0).line(x1, y1).done();
  switch (prst) {
    case 'textPlain': {
      const a = pin(30000, adj(0), 70000) / 100000, mid = a * w, dir = mid - hc;
      const dx = dir > 0 ? 2 * (w - mid) : 2 * mid, xr = dx, xl = w - dx;
      return [flat(0, 0, dir > 0 ? 0 : xl, dir > 0 ? xr : w), flat(h, h, dir > 0 ? xl : 0, dir > 0 ? w : xr)];
    }
    case 'textStop': {
      const dy = (pin(14286, adj(0), 50000) / 100000) * h, dx = w / 3;
      return [P().move(0, dy).line(dx, 0).line(w - dx, 0).line(w, dy).done(), P().move(0, h - dy).line(dx, h).line(w - dx, h).line(w, h - dy).done()];
    }
    case 'textTriangle': { const y = (pin(0, adj(0), 100000) / 100000) * h; return [P().move(0, y).line(hc, 0).line(w, y).done(), flat(h)]; }
    case 'textTriangleInverted': { const y = (pin(0, adj(0), 100000) / 100000) * h; return [flat(0), P().move(0, y).line(hc, h).line(w, y).done()]; }
    case 'textChevron': {
      const y = (pin(0, adj(0), 50000) / 100000) * h;
      return [P().move(0, y).line(hc, 0).line(w, y).done(), P().move(0, h).line(hc, h - y).line(w, h).done()];
    }
    case 'textChevronInverted': {
      const y = (pin(50000, adj(0), 100000) / 100000) * h;
      return [P().move(0, 0).line(hc, h - y).line(w, 0).done(), P().move(0, y).line(hc, h).line(w, y).done()];
    }
    case 'textRingInside': case 'textRingOutside': {
      const r = ((pin(50000, adj(0), 99000) / 100000) * h) / 2, sw = prst === 'textRingInside' ? 360 : -360;
      return [P().arc(hc, r, wd2, r, 180, sw).done(), P().arc(hc, h - r, wd2, r, 180, sw).done()];
    }
    case 'textArchUp': { const [st, sw] = archUpAngles(adj(0)); return [P().arc(hc, vc, wd2, hd2, st, sw).done()]; }
    case 'textArchDown': { const [st, sw] = archDownAngles(adj(0)); return [P().arc(hc, vc, wd2, hd2, st, sw).done()]; }
    case 'textCircle': {
      const a = pin(0, adj(0), 21599999) / 60000;
      const sw = a === 180 ? 360 : 360 - 2 * Math.abs(a - 180);
      return [P().arc(hc, vc, wd2, hd2, a, sw > 0 ? sw : 360).done()];
    }
    case 'textButton': {
      // arco de baixo = espelho vertical do de cima (anti-horário, por baixo)
      const [st, sw] = archUpAngles(adj(0));
      return [P().arc(hc, vc, wd2, hd2, st, sw).done(), flat(vc), P().arc(hc, vc, wd2, hd2, 360 - st, -sw).done()];
    }
    case 'textArchUpPour': case 'textCirclePour': case 'textButtonPour': case 'textArchDownPour': {
      const k = pin(0, adj(1), 99000) / 100000, iw = wd2 * k, ih = hd2 * k;
      if (prst === 'textArchDownPour') { const [st, sw] = archDownAngles(adj(0)); return [P().arc(hc, vc, iw, ih, st, sw).done(), P().arc(hc, vc, wd2, hd2, st, sw).done()]; }
      if (prst === 'textCirclePour') { const a = pin(0, adj(0), 21599999) / 60000; return [P().arc(hc, vc, wd2, hd2, a, 360).done(), P().arc(hc, vc, iw, ih, a, 360).done()]; }
      const [st, sw] = archUpAngles(adj(0));
      const up = [P().arc(hc, vc, wd2, hd2, st, sw).done(), P().arc(hc, vc, iw, ih, st, sw).done()];
      if (prst === 'textArchUpPour') return up;
      return [...up, P().arc(hc, vc, iw, ih, 360 - st, -sw).done(), P().arc(hc, vc, wd2, hd2, 360 - st, -sw).done()];
    }
    case 'textCurveUp': case 'textCurveDown': {
      const y = (pin(0, adj(0), 56338) / 100000) * h, bot = P().move(0, h - (3 * y) / 8).cubic(w / 3, h + y / 8, (2 * w) / 3, h + y / 8, w, h - (3 * y) / 8).done();
      return prst === 'textCurveUp'
        ? [P().move(0, y).cubic(w / 3, 1.25 * y, (2 * w) / 3, 0.75 * y, w, 0).done(), bot]
        : [P().move(0, 0).cubic(w / 3, 0.75 * y, (2 * w) / 3, 1.25 * y, w, y).done(), bot];
    }
    case 'textCascadeUp': case 'textCascadeDown': {
      const dy = (pin(28570, adj(0), 100000) / 100000) * h, dy3 = (h - dy) / 4;
      return prst === 'textCascadeUp' ? [flat(dy3, 0), flat(h, dy)] : [flat(0, dy3), flat(dy, h)];
    }
    case 'textWave1': case 'textWave2': case 'textDoubleWave1': case 'textWave4': {
      const dbl = prst === 'textDoubleWave1' || prst === 'textWave4';
      const y1 = (pin(0, adj(0), dbl ? 12500 : 20000) / 100000) * h, dy2 = (y1 * 10) / 3;
      const up = prst === 'textWave1' || prst === 'textDoubleWave1';
      const ya = up ? -dy2 : dy2; // 1º controle: acima (onda 1) ou abaixo (onda 2)
      const of2 = (pin(-10000, adj(1), 10000) / 50000) * w;
      const xs = of2 > 0 ? 0 : -of2, xe = of2 > 0 ? w - of2 : w;     // de cima
      const bs = of2 > 0 ? of2 : 0, be = of2 > 0 ? w : w + of2;       // de baixo
      const wave = (x0: number, x1: number, yb: number): WarpPath => {
        const p = P().move(x0, yb);
        const n = dbl ? 2 : 1, seg = (x1 - x0) / n;
        for (let i = 0; i < n; i++) { const s = x0 + i * seg; p.cubic(s + seg / 3, yb + ya, s + (2 * seg) / 3, yb - ya, s + seg, yb); }
        return p.done();
      };
      return [wave(xs, xe, y1), wave(bs, be, h - y1)];
    }
    case 'textInflate': { const dy = (pin(0, adj(0), 20000) / 100000) * h; return [P().move(0, dy).quad(hc, -dy, w, dy).done(), P().move(0, h - dy).quad(hc, h + dy, w, h - dy).done()]; }
    case 'textDeflate': { const dy = (pin(0, adj(0), 37500) / 100000) * h; return [P().move(0, 0).quad(hc, 2 * dy, w, 0).done(), P().move(0, h).quad(hc, h - 2 * dy, w, h).done()]; }
    case 'textInflateBottom': { const dy = (pin(6250, adj(0), 100000) / 100000) * h; return [flat(0), P().move(0, dy).quad(hc, h, w, dy).done()]; }
    case 'textInflateTop': { const dy = (pin(0, adj(0), 93750) / 100000) * h; return [P().move(0, dy).quad(hc, 0, w, dy).done(), flat(h)]; }
    case 'textDeflateBottom': { const dy = (pin(6250, adj(0), 100000) / 100000) * h; return [flat(0), P().move(0, h).quad(hc, 2 * dy - h, w, h).done()]; }
    case 'textDeflateTop': { const dy = (pin(0, adj(0), 93750) / 100000) * h; return [P().move(0, 0).quad(hc, 2 * dy, w, 0).done(), flat(h)]; }
    case 'textDeflateInflate': {
      // faixa de cima desinflada, a de baixo inflada; curvas centrais paralelas a 2·h/20
      const dy = (pin(5000, adj(0), 95000) / 100000) * h, del = h / 20, e = vc - del, c = 2 * (dy - del) - e;
      return [flat(0), P().move(0, e).quad(hc, c, w, e).done(), P().move(0, e + 2 * del).quad(hc, c + 2 * del, w, e + 2 * del).done(), flat(h)];
    }
    case 'textDeflateInflateDeflate': {
      const dy = (pin(1000, adj(0), 33333) / 100000) * h, del = h / 30, e = h / 3 - del, c = 2 * (dy - del) - e;
      const q = (ye: number, yc: number): WarpPath => P().move(0, ye).quad(hc, yc, w, ye).done();
      return [flat(0), q(e, c), q(e + 2 * del, c + 2 * del), q(h - e - 2 * del, h - c - 2 * del), q(h - e, h - c), flat(h)];
    }
    case 'textFadeRight': { const dy = (pin(0, adj(0), 49999) / 100000) * h; return [flat(0, dy), flat(h, h - dy)]; }
    case 'textFadeLeft': { const dy = (pin(0, adj(0), 49999) / 100000) * h; return [flat(dy, 0), flat(h - dy, h)]; }
    case 'textFadeUp': { const dx = (pin(0, adj(0), 49999) / 100000) * w; return [flat(0, 0, dx, w - dx), flat(h)]; }
    case 'textFadeDown': { const dx = (pin(0, adj(0), 49999) / 100000) * w; return [flat(0), flat(h, h, dx, w - dx)]; }
    case 'textSlantUp': { const dy = (pin(0, adj(0), 100000) / 100000) * h; return [flat(dy, 0), flat(h, h - dy)]; }
    case 'textSlantDown': { const dy = (pin(0, adj(0), 100000) / 100000) * h; return [flat(0, h - dy), flat(dy, h)]; }
    case 'textCanUp': {
      const y = h - (pin(50000, adj(0), 100000) / 100000) * h;
      return [P().arc(hc, y, wd2, y, 180, 180).done(), P().arc(hc, h, wd2, y, 180, 180).done()];
    }
    case 'textCanDown': {
      const y = (pin(0, adj(0), 50000) / 100000) * h;
      return [P().arc(hc, 0, wd2, y, 180, -180).done(), P().arc(hc, h - y, wd2, y, 180, -180).done()];
    }
    default: return [flat(0), flat(h)]; // textNoShape/desconhecido: preenche a caixa
  }
}

/** Ponto e tangente unitária a uma distância `s` ao longo do caminho (extrapola/contorna fora de [0, len]). */
function pathAt(p: WarpPath, s: number): [number, number, number, number] {
  const n = p.cum.length;
  if (n < 2 || p.len <= 0) return [p.pts[0] ?? 0, p.pts[1] ?? 0, 1, 0];
  // arco: além das pontas o texto continua pela elipse
  if (p.full && (s < 0 || s > p.len) && p.full.len > 0) return pathAt(p.full, ((s % p.full.len) + p.full.len) % p.full.len);
  if (s <= 0 || s >= p.len) {
    const i = s <= 0 ? 0 : n - 2;
    const x0 = p.pts[2 * i]!, y0 = p.pts[2 * i + 1]!, x1 = p.pts[2 * i + 2]!, y1 = p.pts[2 * i + 3]!;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, tx = (x1 - x0) / L, ty = (y1 - y0) / L;
    const bx = s <= 0 ? x0 : x1, by = s <= 0 ? y0 : y1, d = s <= 0 ? s : s - p.len;
    return [bx + tx * d, by + ty * d, tx, ty];
  }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.cum[m]! <= s) lo = m; else hi = m; }
  const seg = p.cum[hi]! - p.cum[lo]! || 1, f = (s - p.cum[lo]!) / seg;
  const x0 = p.pts[2 * lo]!, y0 = p.pts[2 * lo + 1]!, x1 = p.pts[2 * hi]!, y1 = p.pts[2 * hi + 1]!;
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, (x1 - x0) / L, (y1 - y0) / L];
}

/** Curva paralela a `d` px para "cima" do texto (esquerda do sentido do caminho). */
function offsetPath(p: WarpPath, d: number): WarpPath {
  const n = p.pts.length / 2, out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const dx = p.pts[2 * b]! - p.pts[2 * a]!, dy = p.pts[2 * b + 1]! - p.pts[2 * a + 1]!, l = Math.hypot(dx, dy) || 1;
    out.push(p.pts[2 * i]! + (dy / l) * d, p.pts[2 * i + 1]! - (dx / l) * d);
  }
  const q = sampled(out);
  return p.full ? { ...q, full: offsetPath(p.full, d) } : q;
}

// ---------------------------------------------------------------------------
// Texto: métricas de tinta e raster das linhas
// ---------------------------------------------------------------------------

interface LineInfo {
  line: WarpLine;
  visible: boolean;
  /** Extensão horizontal para o mapeamento (pt): tinta, espaços das pontas pelo avanço. */
  extL: number; extR: number;
  /** Tinta acima/abaixo da baseline (pt). */
  inkAsc: number; inkDesc: number;
  /** Retângulo do raster (pt, relativo à caixa). */
  rx0: number; rx1: number; ry0: number; ry1: number;
  /** Avanço da linha (pt): início da 1ª letra e fim da última, sem os espaços finais. */
  penL: number; penR: number;
  /** Células de avanço dos caracteres visíveis (pt) — os arcos posicionam glifo a glifo. */
  cells: [number, number][];
}

function measureLine(ctx: Ctx, line: WarpLine, withCells: boolean): LineInfo {
  let inkAsc = 0, inkDesc = 0, fAsc = 0, fDesc = 0, rx0 = Infinity, rx1 = -Infinity, extL = Infinity, extR = -Infinity, visible = false, maxStroke = 0;
  const runs = line.runs.filter((r) => r.text.length);
  // mede em escala ×10 (as caixas de tinta do canvas vêm arredondadas ao pixel)
  const M = 10;
  const meas = (r: WarpRun, text: string): { w: number; l: number; r: number; a: number; d: number; fa: number; fd: number } => {
    ctx.font = r.font(M);
    setSpacing(ctx, (r.spc ?? 0) * M);
    const m = ctx.measureText(text);
    return { w: m.width / M, l: m.actualBoundingBoxLeft / M, r: m.actualBoundingBoxRight / M, a: m.actualBoundingBoxAscent / M, d: m.actualBoundingBoxDescent / M,
      fa: (m.fontBoundingBoxAscent || m.actualBoundingBoxAscent) / M, fd: (m.fontBoundingBoxDescent || m.actualBoundingBoxDescent) / M };
  };
  const cells: [number, number][] = [];
  runs.forEach((r, i) => {
    const m = meas(r, r.text);
    const vis = /\S/.test(r.text);
    if (vis) { visible = true; inkAsc = Math.max(inkAsc, m.a); inkDesc = Math.max(inkDesc, m.d); }
    fAsc = Math.max(fAsc, m.fa);
    fDesc = Math.max(fDesc, m.fd);
    rx0 = Math.min(rx0, r.x - Math.max(0, m.l));
    rx1 = Math.max(rx1, r.x + Math.max(m.w, m.r));
    maxStroke = Math.max(maxStroke, r.stroke?.width ?? 0);
    if (i === 0) extL = /^\s/.test(r.text) || !vis ? r.x : r.x - m.l;
    if (i === runs.length - 1) extR = /\s$/.test(r.text) || !vis ? r.x + m.w : r.x + m.r;
    // células por caractere (prefixos medidos: o kerning entra)
    if (vis && withCells) {
      const chars = Array.from(r.text);
      let pre = '', x0 = r.x;
      for (const ch of chars) {
        pre += ch;
        const x1 = r.x + meas(r, pre).w;
        if (/\S/.test(ch)) {
          // marca combinante: junta com a célula anterior
          if (/\p{M}/u.test(ch) && cells.length) cells[cells.length - 1]![1] = x1;
          else cells.push([x0, x1]);
        }
        x0 = x1;
      }
    }
  });
  if (line.trailing && runs.length) { const last = runs[runs.length - 1]!; extR = Math.max(extR, last.x + meas(last, last.text).w + line.trailing); }
  const first = runs[0], lastRun = runs[runs.length - 1];
  const penL = first ? first.x : 0, penR = lastRun ? lastRun.x + meas(lastRun, lastRun.text.replace(/\s+$/, '')).w : 0;
  const pad = line.sizePt * 0.08 + maxStroke;
  return {
    line, visible, extL, extR, inkAsc, inkDesc, penL, penR, cells,
    rx0: rx0 - pad, rx1: rx1 + pad,
    ry0: line.baseline - Math.max(fAsc, inkAsc) - pad, ry1: line.baseline + Math.max(fDesc, inkDesc) + pad,
  };
}

/**
 * Raster da linha a `k` px por pt. `strokeK` = px do raster por pt de CONTORNO: o
 * app traça o contorno DEPOIS de deformar (a espessura não estica com o texto —
 * medido, lo-tdf139618), então quem chama desconta a ampliação média.
 */
function rasterLine(li: LineInfo, k: number, makeCanvas: (w: number, h: number) => Cv | undefined, strokeK = k,
  /** Caixa (pt do layout) do degradê/imagem das letras: o bloco do envelope ou a linha do arco. */
  fillBox?: readonly [number, number, number, number]): { cv: Cv; w: number; h: number } | undefined {
  const w = Math.max(1, Math.ceil((li.rx1 - li.rx0) * k)), h = Math.max(1, Math.ceil((li.ry1 - li.ry0) * k));
  const cv = makeCanvas(w, h);
  const c2 = cv?.getContext('2d') as Ctx | null | undefined;
  if (!cv || !c2) return undefined;
  c2.textBaseline = 'alphabetic';
  const by = (li.line.baseline - li.ry0) * k;
  for (const r of li.line.runs) {
    if (!r.text.trim()) continue;
    c2.font = r.font(k);
    setSpacing(c2, (r.spc ?? 0) * k);
    c2.fillStyle = r.color;
    if (r.pattern) {
      const rows = patternRows(r.pattern.prst);
      const pc = rows ? makeCanvas(8, 8) : undefined;
      const p2 = pc?.getContext('2d') as Ctx | null | undefined;
      if (rows && pc && p2) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { p2.fillStyle = (rows[y]! >> (7 - x)) & 1 ? r.pattern.fg : r.pattern.bg; p2.fillRect(x, y, 1, 1); }
        const pat = c2.createPattern(pc as CanvasImageSource, 'repeat');
        if (pat) {
          // células de ~1/30 do tamanho da fonte (o padrão acompanha o texto deformado)
          const s = Math.max(1, (li.line.sizePt * k) / 30);
          if (typeof pat.setTransform === 'function' && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
          c2.fillStyle = pat;
        }
      }
    }
    if (r.paint && fillBox) {
      const fs = r.paint(c2, [(fillBox[0] - li.rx0) * k, (fillBox[1] - li.ry0) * k, (fillBox[2] - fillBox[0]) * k, (fillBox[3] - fillBox[1]) * k], k);
      if (fs) c2.fillStyle = fs;
    }
    const tx = (r.x - li.rx0) * k;
    if ((r.alpha ?? 1) > 0) {
      c2.globalAlpha = r.alpha ?? 1;
      c2.fillText(r.text, tx, by);
      c2.globalAlpha = 1;
    }
    if (r.stroke) { c2.strokeStyle = r.stroke.color; c2.lineWidth = Math.max(0.5, r.stroke.width * strokeK); c2.lineJoin = 'round'; c2.strokeText(r.text, tx, by); }
  }
  return { cv, w, h };
}

/**
 * Desenha a faixa vertical [c0, c1) do raster (rh linhas) pela função de destino
 * Q(coluna, linha) → px: paralelogramos (afins) por célula; a faixa é dividida na
 * vertical quando as bordas de cima e de baixo têm larguras diferentes (arcos
 * concêntricos, "fade") — senão sobrariam frestas.
 */
function strip(ctx: Ctx, cv: Cv, c0: number, c1: number, rh: number, Q: (c: number, r: number) => [number, number]): void {
  const sw = c1 - c0;
  if (sw <= 0 || rh <= 0) return;
  const [ax, ay] = Q(c0, 0), [bx, by] = Q(c1, 0), [cx, cy] = Q(c0, rh), [dx, dy] = Q(c1, rh);
  const lt = Math.hypot(bx - ax, by - ay), lb = Math.hypot(dx - cx, dy - cy);
  const m = Math.max(1, Math.min(48, Math.ceil(Math.abs(lb - lt) / 0.75)));
  for (let i = 0; i < m; i++) {
    const r0 = (rh * i) / m, r1 = (rh * (i + 1)) / m, rm = (r0 + r1) / 2, sh = r1 - r0;
    const [ox, oy] = m === 1 ? [ax, ay] : Q(c0, r0), [fx, fy] = m === 1 ? [cx, cy] : Q(c0, r1);
    const [lx, ly] = m === 1 ? [ax, ay] : Q(c0, rm), [rx, ry] = m === 1 ? [bx, by] : Q(c1, rm);
    const X = [(rx - lx) / sw, (ry - ly) / sw], Y = [(fx - ox) / sh, (fy - oy) / sh];
    const lx1 = Math.hypot(X[0]!, X[1]!), ly1 = Math.hypot(Y[0]!, Y[1]!);
    // sobreposição de ~0,6 px entre faixas/células (sem costuras)
    const ov = lx1 > 0 ? Math.min(1, 0.6 / lx1) : 0, ovy = m > 1 && ly1 > 0 ? Math.min(1, 0.6 / ly1) : 0;
    ctx.save();
    ctx.transform(X[0]!, X[1]!, Y[0]!, Y[1]!, ox, oy);
    ctx.drawImage(cv as CanvasImageSource, c0, r0, sw, sh, 0, 0, sw + ov, sh + ovy);
    ctx.restore();
  }
}

/**
 * Distância (em, para cima) do caminho de um arco até a baseline da linha apoiada
 * nele, pela entrelinha (medido, syn-b-e5/e8: 50% 0,0625 · 80% 0,10 · simples/100%
 * 0,15 · 120% 0,148 · 150% 0,181 · 200% 0,244).
 */
function arcLift(p: number | undefined): number {
  if (p === undefined) return 0.154;
  const T: [number, number][] = [[0.5, 0.0625], [0.8, 0.1], [1, 0.152], [1.2, 0.148], [1.5, 0.181], [2, 0.244]];
  if (p <= 0.5) return Math.max(0, 0.0625 + (p - 0.5) * 0.125);
  if (p >= 2) return 0.244 + (p - 2) * 0.125;
  for (let i = 1; i < T.length; i++) {
    const [p0, v0] = T[i - 1]!, [p1, v1] = T[i]!;
    if (p <= p1) return v0 + ((v1 - v0) * (p - p0)) / (p1 - p0);
  }
  return 0.154;
}

/** Caixa da linha (pt): avanço × altura da linha (topo a 0,8 da altura acima da baseline). */
function lineBoxOf(li: LineInfo): [number, number, number, number] {
  const h = li.line.height ?? li.line.sizePt * 1.2;
  return [li.penL, li.line.baseline - 0.8 * h, li.penR, li.line.baseline + 0.2 * h];
}

/** Linhas em grupos para as faixas (⌈restantes/faixas⌉ cada). */
function groups<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  let i = 0;
  for (let g = 0; g < n; g++) { const k = Math.ceil((items.length - i) / (n - g)); out.push(items.slice(i, i + k)); i += k; }
  return out;
}

/**
 * Desenha as linhas deformadas na caixa da forma (`bx, by, bw, bh` em px no
 * sistema de `ctx`); `pxPerPt` = px por pt; as linhas vêm do layout em pt.
 */
export function paintWarpedText(ctx: Ctx, prst: string, adj: number[] | undefined, fromWordArt: boolean, lines: WarpLine[],
  bx: number, by: number, bw: number, bh: number, pxPerPt: number,
  makeCanvas: (w: number, h: number) => Cv | undefined): void {
  if (!lines.length || bw <= 0 || bh <= 0) return;
  const infos = lines.map((l) => { ctx.save(); const li = measureLine(ctx, l, SINGLE.has(prst)); ctx.restore(); return li; });
  if (!infos.some((i) => i.visible)) return;
  const paths = warpGeometry(prst, adj, bw, bh);
  const cap = (k: number, li: LineInfo): number => Math.min(k, 4096 / Math.max(1e-6, li.rx1 - li.rx0), 4096 / Math.max(1e-6, li.ry1 - li.ry0));
  ctx.save();
  ctx.translate(bx, by);
  if (SINGLE.has(prst)) {
    // caminho único: cada grupo de linhas num caminho; a última linha do grupo
    // apoiada nele, as anteriores em curvas paralelas (cada uma com o próprio
    // comprimento); cada GLIFO vai rígido, girado pela tangente no seu centro
    const gs = groups(infos, paths.length);
    gs.forEach((g, gi) => {
      const base = paths[gi]!;
      const vis = g.filter((i) => i.visible);
      if (!g.length || !vis.length) return;
      const last = g[g.length - 1]!;
      const yRefLast = last.line.baseline - arcLift(last.line.lnPct) * last.line.sizePt;
      const blockL = Math.min(...vis.map((i) => i.penL)), blockR = Math.max(...vis.map((i) => i.penR));
      const wMax = Math.max(...vis.map((i) => i.penR - i.penL));
      // legado: escala única até o AVANÇO da linha mais larga cobrir o caminho; 2007+:
      // tamanho natural, encolhido por igual quando não cabe no arco (medido, syn-b-e2)
      const sc = fromWordArt ? (blockR > blockL ? base.len / pxPerPt / (blockR - blockL) : 1) : wMax > 0 ? Math.min(1, base.len / pxPerPt / wMax) : 1;
      const f = sc * pxPerPt; // px por pt do layout
      for (const li of vis) {
        const yRef = li.line.baseline - arcLift(li.line.lnPct) * li.line.sizePt;
        const delta = (yRefLast - yRef) * f;
        const path = Math.abs(delta) > 0.01 ? offsetPath(base, delta) : base;
        const k = cap(f * 1.25, li);
        const r = rasterLine(li, k, makeCanvas, (k * pxPerPt) / f, lineBoxOf(li));
        if (!r) continue;
        const pc = (li.penL + li.penR) / 2;
        const sOf = fromWordArt ? (x: number): number => (x - blockL) * f
          : li.line.align === 'r' ? (x: number): number => path.len - (li.penR - x) * f
            : li.line.align === 'ctr' ? (x: number): number => path.len / 2 + (x - pc) * f
              : (x: number): number => (x - li.penL) * f;
        const cells = li.cells;
        cells.forEach(([x0, x1], ci) => {
          const a = ci === 0 ? li.rx0 : x0, b = ci === cells.length - 1 ? li.rx1 : x1;
          const xc = (x0 + x1) / 2;
          const [px, py, tx, ty] = pathAt(path, sOf(xc));
          const nx = ty, ny = -tx; // "para cima" do texto
          const u0 = (a - xc) * f, d0 = (yRef - li.ry0) * f;
          const c0 = (a - li.rx0) * k, c1 = (b - li.rx0) * k;
          if (c1 <= c0) return;
          ctx.save();
          ctx.transform((tx * f) / k, (ty * f) / k, (-nx * f) / k, (-ny * f) / k, px + tx * u0 + nx * d0, py + ty * u0 + ny * d0);
          ctx.drawImage(r.cv as CanvasImageSource, c0, 0, c1 - c0, r.h, 0, 0, c1 - c0, r.h);
          ctx.restore();
        });
      }
    });
    ctx.restore();
    return;
  }
  // envelope: pares de caminhos (faixas); as linhas se dividem entre elas e cada
  // faixa comporta ⌈linhas/faixas⌉ — a que recebe menos usa só as primeiras
  // "vagas" (medido, DeflateInflate com 3 linhas: a 3ª ocupa a metade de cima)
  const nReg = Math.max(1, Math.floor(paths.length / 2));
  const gs = groups(infos, nReg);
  const slots = Math.ceil(infos.length / nReg);
  gs.forEach((g, gi) => {
    const T = paths[2 * gi]!, B = paths[2 * gi + 1]!;
    const vis = g.filter((i) => i.visible);
    if (!vis.length) return;
    // largura comum a TODAS as faixas (a linha mais curta não estica até a borda da sua
    // faixa — lo-tdf139618_WordArtBitmapFill, DeflateInflate "Happy"/"Birthday")
    const all = infos.filter((i) => i.visible);
    const x0 = Math.min(...all.map((i) => i.extL)), x1 = Math.max(...all.map((i) => i.extR));
    const y0 = Math.min(...vis.map((i) => i.line.baseline - i.inkAsc));
    let y1 = Math.max(...vis.map((i) => i.line.baseline + i.inkDesc));
    if (g.length < slots) {
      const pitch = g.length > 1 ? (g[g.length - 1]!.line.baseline - g[0]!.line.baseline) / (g.length - 1) : g[0]!.line.height ?? g[0]!.line.sizePt * 1.2;
      y1 += (slots - g.length) * pitch;
    }
    if (!(x1 > x0) || !(y1 > y0)) return;
    const P = (u: number, v: number): [number, number] => {
      const [tx, ty] = pathAt(T, u * T.len), [qx, qy] = pathAt(B, u * B.len);
      return [tx + (qx - tx) * v, ty + (qy - ty) * v];
    };
    const span = Math.max(T.len, B.len);
    const kx = span / (x1 - x0), ky = bh / (y1 - y0);
    // degradê/imagem das letras: no bloco todo (as linhas compartilham — medido, syn-b-e11)
    const boxes = vis.map(lineBoxOf);
    const blockBox: [number, number, number, number] = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
    for (const li of vis) {
      const k = cap(Math.max(kx, ky, pxPerPt) * 1.25, li);
      const r = rasterLine(li, k, makeCanvas, (k * pxPerPt) / Math.sqrt(kx * ky), blockBox);
      if (!r) continue;
      const outW = ((li.rx1 - li.rx0) / (x1 - x0)) * span;
      const n = Math.max(4, Math.min(1500, Math.ceil(outW / 1.5)));
      const QR = (c: number, row: number): [number, number] => P((li.rx0 + c / k - x0) / (x1 - x0), (li.ry0 + row / k - y0) / (y1 - y0));
      for (let j = 0; j < n; j++) strip(ctx, r.cv, (j * r.w) / n, ((j + 1) * r.w) / n, r.h, QR);
    }
  });
  ctx.restore();
}
