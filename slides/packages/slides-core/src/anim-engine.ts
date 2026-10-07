import { evalFormula, type FormulaVars } from './anim-formula.js';
import type { ChartSel } from './chart-engine.js';
import { beginOffset, type TimeNode } from './timing.js';
import type { PlacedEffect } from './playback.js';

/**
 * MOTOR DE ANIMAÇÃO — interpreta os COMPORTAMENTOS SMIL gravados pelo app de
 * referência em `<p:timing>` (set / anim com quadros-chave e fórmulas /
 * animEffect / animScale / animRot / animMotion / animClr) e devolve, para um
 * instante, o ESTADO visual de cada parte animada de uma forma. Não há tabela
 * de presets: cada efeito (entrada, ênfase, saída, trajetória) toca a partir da
 * própria definição no arquivo — é o que garante fidelidade a presets novos.
 *
 * Tempo de cada nó (SMIL 2.0): tempo LOCAL → (spd) → repetição → auto-reverter
 * → accel/decel → `tmFilter` (mapeamento por partes do PowerPoint) → progresso.
 * Depois do fim ativo, `fill="hold"` congela o último valor; sem ele o
 * comportamento deixa de valer (ex.: animEffect sem fill some ao terminar).
 *
 * Camadas de uma forma (o app anima o fundo e o texto separadamente):
 *  - `all`: efeitos sobre a forma inteira (transforma fundo + texto);
 *  - `bg`:  só o fundo (`<p:bg/>`, ou a 1ª unidade de um efeito por
 *           letra/palavra quando `<p:bldP animBg="1">`);
 *  - parágrafo: efeitos com `<p:txEl><p:pRg>` (por parágrafo);
 *  - unidade: efeitos com `<p:iterate>` (por letra/palavra), escalonados.
 * A geometria-base de parágrafos/unidades vem do layout de texto — por isso a
 * avaliação é preguiçosa (`ShapeAnimHooks`): quem pinta passa a caixa.
 */

/** Geometria-base de uma parte: centro (x,y) e tamanho (w,h) em FRAÇÃO do slide. */
export interface AnimBase {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotação própria (graus) — variável `#ppt_r`. */
  rot?: number;
  /** Cores de partida (animClr sem `from`). */
  fill?: string;
  line?: string;
  text?: string;
}

/** Filtro de transição ativo (`animEffect`), com progresso 0..1. */
export interface AnimFilter {
  filter: string;
  transition: string;
  p: number;
}

/** Estado animado de uma parte num instante. */
export interface PartState {
  visible: boolean;
  /** Multiplicador de opacidade (style.opacity). */
  opacity: number;
  /** Centro e tamanho resultantes (fração do slide). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotação adicional (graus, horário). */
  rot: number;
  /** Escala adicional (animScale). */
  sx: number;
  sy: number;
  /** Deslocamento de trajetória (fração do slide). */
  mx: number;
  my: number;
  filters: AnimFilter[];
  fillColor?: string;
  lineColor?: string;
  textColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  /** Escala do tamanho da fonte (style.fontSize). */
  fontScale?: number;
  fontFamily?: string;
}

/** Ganchos preguiçosos de uma forma animada (a pintura chama com a caixa de cada parte). */
export interface ShapeAnimHooks {
  /** Forma inteira (fundo + texto). */
  all(base: AnimBase): PartState;
  /** Só o fundo (preenchimento/contorno/imagem) — por cima de `all`. */
  bg?: (base: AnimBase) => PartState;
  /** Texto do parágrafo `i` (relativo à caixa do parágrafo) — por cima de `all`. */
  para?: (i: number, base: AnimBase) => PartState | null;
  /** Unidades de texto (letra/palavra). */
  unit?: {
    type: 'wd' | 'lt';
    state: (u: UnitRef, base: AnimBase) => PartState | null;
  };
  /**
   * Gráfico animado POR PARTES (`<a:chart bldStep>`): fundo e marcas de dados
   * em camadas, cada uma com o próprio estado (null = estática).
   */
  chartParts?: { sel: ChartSel; state: ((base: AnimBase) => PartState | null) | null }[];
}

/** Posição de uma unidade de texto: índice global (no txBody) e dentro do parágrafo. */
export interface UnitRef {
  para: number;
  k: number;
  count: number;
  kPara: number;
  countPara: number;
}

// ───────────────────────── tempo ─────────────────────────

/** Accel/decel do SMIL 2.0 sobre a fração `f` do tempo simples. */
export function accelDecel(f: number, a: number, d: number): number {
  if (!a && !d) return f;
  if (a + d > 1) { const k = 1 / (a + d); a *= k; d *= k; }
  const r = 1 / (1 - a / 2 - d / 2);
  if (f < a) return (r * f * f) / (2 * a);
  if (f <= 1 - d) return r * (f - a / 2);
  const td = 1 - f;
  return 1 - (r * td * td) / (2 * d);
}

/** `tmFilter`: mapeamento linear por partes [[x,y]…] (x crescente). */
function tmFilterMap(f: number, pts: [number, number][]): number {
  if (f <= pts[0]![0]) return pts[0]![1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[i + 1]!;
    if (f <= x1) return x1 > x0 ? y0 + ((y1 - y0) * (f - x0)) / (x1 - x0) : y1;
  }
  return pts[pts.length - 1]![1];
}

/** Duração simples SEM a expansão de `<p:iterate>` (uma unidade). */
function simpleDurOf(n: TimeNode): number {
  if (n.dur !== undefined) return n.dur;
  if (n.tag === 'seq') {
    let t = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      t += b + activeDurOf(c);
    }
    return t;
  }
  let m = 0;
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    m = Math.max(m, b + activeDurOf(c));
  }
  return m;
}

function activeDurOf(n: TimeNode): number {
  let d = simpleDurOf(n) * (n.autoRev ? 2 : 1);
  if (n.repeat !== undefined) d = n.repeat === Infinity ? Infinity : d * n.repeat;
  return d / (n.spd ?? 1);
}

/**
 * Tempo LOCAL (ms desde o início do nó) → fração 0..1 do tempo simples, com
 * repetição, auto-reverter, accel/decel e tmFilter. `null` = já terminou sem
 * segurar (`fill` ≠ hold/freeze). Duração indefinida → 0 (início).
 */
function progressOf(n: TimeNode, local: number, simple: number): number | null {
  if (!Number.isFinite(simple)) return 0;
  const t = local * (n.spd ?? 1);
  const period = simple * (n.autoRev ? 2 : 1);
  const reps = n.repeat ?? 1;
  const active = reps === Infinity ? Infinity : period * reps;
  let it: number;
  if (t >= active) {
    if (n.fill !== 'hold' && n.fill !== 'freeze') return null;
    const frac = reps - Math.floor(reps);
    it = frac > 1e-9 ? frac * period : period;
  } else {
    it = period > 0 ? t % period : 0;
  }
  const s = n.autoRev && it > simple ? 2 * simple - it : Math.min(it, simple);
  let f = simple > 0 ? s / simple : 1;
  f = accelDecel(f, n.accel ?? 0, n.decel ?? 0);
  if (n.tmFilter) f = tmFilterMap(f, n.tmFilter);
  return f;
}

// ───────────────────────── cores ─────────────────────────

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgbHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}
function hslHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function mixColor(a: string, b: string, f: number, n: TimeNode): string {
  if (n.clrSpc === 'hsl') {
    const [h1, s1, l1] = rgbHsl(hexRgb(a)), [h2, s2, l2] = rgbHsl(hexRgb(b));
    let dh = h2 - h1;
    if (n.clrDir === 'ccw') { if (dh > 0) dh -= 360; } else if (dh < 0) dh += 360;
    return hslHex(h1 + dh * f, s1 + (s2 - s1) * f, l1 + (l2 - l1) * f);
  }
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

// ───────────────────────── trajetórias ─────────────────────────

interface MotionPath { pts: [number, number][]; cum: number[]; total: number }
const pathCache = new Map<string, MotionPath>();

/**
 * Amostra o path de `animMotion` (fração do slide) p/ ritmo constante. Como no
 * SVG, maiúsculas são absolutas e minúsculas RELATIVAS ao ponto corrente (o
 * app grava "quicar", "escada" etc. com `c`/`l` relativos).
 */
function motionPath(src: string): MotionPath {
  let mp = pathCache.get(src);
  if (mp) return mp;
  const tok = src.match(/[MLCZEmlcze]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pts: [number, number][] = [];
  let i = 0, cmd = 'M', rel = false;
  let cur: [number, number] = [0, 0], start: [number, number] = [0, 0];
  const n = (): number => parseFloat(tok[i++] ?? '0');
  const pt = (o: [number, number]): [number, number] => {
    const x = n(), y = n();
    return rel ? [o[0] + x, o[1] + y] : [x, y];
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i]!)) { const c = tok[i++]!; cmd = c.toUpperCase(); rel = c !== cmd; }
    if (cmd === 'Z') { pts.push([...start]); cur = [...start]; continue; }
    if (cmd === 'E') break;
    if (cmd === 'M') { cur = pt(cur); start = [...cur]; pts.push([...cur]); cmd = 'L'; continue; }
    if (cmd === 'L') { cur = pt(cur); pts.push([...cur]); continue; }
    if (cmd === 'C') {
      const p0 = cur;
      const p1 = pt(p0), p2 = pt(p0), p3 = pt(p0);
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        pts.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
      cur = p3;
      continue;
    }
    i++; // token desconhecido
  }
  if (!pts.length) pts.push([0, 0]);
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1]! + Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]));
  mp = { pts, cum, total: cum[cum.length - 1]! };
  pathCache.set(src, mp);
  return mp;
}

/** Ponto no path à fração `f` do COMPRIMENTO (animMotion é "paced"). */
function pointOnPath(mp: MotionPath, f: number): [number, number] {
  if (mp.total <= 0 || mp.pts.length < 2) return mp.pts[0]!;
  const d = Math.max(0, Math.min(1, f)) * mp.total;
  let k = 1;
  while (k < mp.cum.length - 1 && mp.cum[k]! < d) k++;
  const d0 = mp.cum[k - 1]!, d1 = mp.cum[k]!;
  const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
  const a = mp.pts[k - 1]!, b = mp.pts[k]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ───────────────────────── comportamentos ─────────────────────────

function vars(base: AnimBase): FormulaVars {
  // efeitos de SAÍDA gravam as variáveis sem '#': "ppt_w", "1+ppt_h/2"
  const r = base.rot ?? 0;
  return {
    '#ppt_x': base.x, '#ppt_y': base.y, '#ppt_w': base.w, '#ppt_h': base.h, '#ppt_r': r,
    ppt_x: base.x, ppt_y: base.y, ppt_w: base.w, ppt_h: base.h, ppt_r: r,
  };
}

/** Atributos numéricos (valores de `set` podem ser fórmulas: "(#ppt_y+0.4)"). */
const NUMERIC_ATTRS = new Set(['ppt_x', 'ppt_y', 'ppt_w', 'ppt_h', 'style.rotation', 'r', 'style.opacity', 'style.fontSize']);

/** Valor numérico de um quadro/atributo (fórmula ou número); NaN se texto. */
function numVal(v: string | number | undefined, vr: FormulaVars): number {
  if (v === undefined) return NaN;
  return typeof v === 'number' ? v : evalFormula(v, vr);
}

/** Valor ATUAL de um atributo (ponto de partida de anim sem `from`). */
function currentOf(attr: string, st: PartState): number | string | undefined {
  switch (attr) {
    case 'ppt_x': return st.x;
    case 'ppt_y': return st.y;
    case 'ppt_w': return st.w;
    case 'ppt_h': return st.h;
    case 'style.rotation': case 'r': return st.rot;
    case 'style.opacity': return st.opacity;
    case 'style.fontSize': return st.fontScale ?? 1;
    case 'style.visibility': return st.visible ? 'visible' : 'hidden';
  }
  return undefined;
}

/** Atribui `v` ao atributo animado. */
function assign(attr: string, v: number | string, st: PartState): void {
  const n = typeof v === 'number' ? v : parseFloat(v);
  switch (attr) {
    case 'ppt_x': if (Number.isFinite(n)) st.x = n; break;
    case 'ppt_y': if (Number.isFinite(n)) st.y = n; break;
    case 'ppt_w': if (Number.isFinite(n)) st.w = n; break;
    case 'ppt_h': if (Number.isFinite(n)) st.h = n; break;
    case 'style.rotation': case 'r': if (Number.isFinite(n)) st.rot = n; break;
    case 'style.opacity': if (Number.isFinite(n)) st.opacity = Math.max(0, Math.min(1, n)); break;
    case 'style.visibility': st.visible = String(v) !== 'hidden'; break;
    case 'style.fontSize': if (Number.isFinite(n)) st.fontScale = n; break;
    case 'style.fontWeight': st.fontWeight = String(v); break;
    case 'style.fontStyle': st.fontStyle = String(v); break;
    case 'style.textDecorationUnderline': st.underline = String(v) === 'true'; break;
    case 'style.fontFamily': st.fontFamily = String(v); break;
    case 'fillcolor': case 'fillColor': case 'fill.color': st.fillColor = String(v); break;
    case 'stroke.color': case 'strokecolor': st.lineColor = String(v); break;
    case 'style.color': st.textColor = String(v); break;
    default: break; // fill.on, fill.type, stroke.on, ppt_c… sem efeito visual próprio
  }
}

function colorOf(attr: string, st: PartState, base: AnimBase): string | undefined {
  switch (attr) {
    case 'fillcolor': case 'fillColor': case 'fill.color': return st.fillColor ?? base.fill;
    case 'stroke.color': case 'strokecolor': return st.lineColor ?? base.line;
    case 'style.color': return st.textColor ?? base.text;
  }
  return undefined;
}

/** Aplica UM comportamento em progresso `p` ao estado. */
function applyBehavior(n: TimeNode, p: number, st: PartState, base: AnimBase): void {
  const attrs = n.attrNames ?? [];
  const vr = vars(base);
  switch (n.tag) {
    case 'set': {
      for (const a of attrs) {
        if (n.toColor) assign(a, n.toColor, st);
        else if (n.setTo !== undefined) {
          const v = NUMERIC_ATTRS.has(a) ? numVal(n.setTo, vr) : NaN;
          assign(a, Number.isFinite(v) ? v : n.setTo, st);
        }
      }
      return;
    }
    case 'anim': {
      for (const a of attrs) {
        let v: number | string | undefined;
        if (n.tav && n.tav.length) {
          const tav = n.tav;
          // no fim (p ≥ último tm) fica o ÚLTIMO SEGMENTO em f=1: a fórmula
          // `fmla` mora no quadro de INÍCIO do segmento ("espiral" termina em #ppt_x)
          let i = Math.max(0, tav.length - 2);
          for (let k = 0; k < tav.length - 1; k++) { if (p < tav[k + 1]!.tm) { i = k; break; } }
          const ka = tav[i]!, kb = tav[Math.min(i + 1, tav.length - 1)]!;
          if (ka.color || kb.color) {
            const ca = ka.color ?? colorOf(a, st, base) ?? '#000000';
            const cb = kb.color ?? ca;
            const f = kb.tm > ka.tm ? (p - ka.tm) / (kb.tm - ka.tm) : 0;
            v = n.calcmode === 'discrete' ? ca : mixColor(ca, cb, Math.max(0, Math.min(1, f)), n);
          } else {
            const na = numVal(ka.val, vr), nb = numVal(kb.val, vr);
            if (!Number.isFinite(na)) {
              v = ka.val; // texto (bold/normal/visible…) é sempre discreto
            } else {
              const f = kb.tm > ka.tm ? Math.max(0, Math.min(1, (p - ka.tm) / (kb.tm - ka.tm))) : 0;
              let x = n.calcmode === 'discrete' || !Number.isFinite(nb) ? na : na + (nb - na) * f;
              if (ka.fmla) x = evalFormula(ka.fmla, { ...vr, $: x });
              v = x;
            }
          }
        } else {
          const cur = currentOf(a, st);
          const from = n.from !== undefined ? numVal(n.from, vr) : typeof cur === 'number' ? cur : NaN;
          if (n.to !== undefined) {
            const to = numVal(n.to, vr);
            v = Number.isFinite(to) && Number.isFinite(from) ? from + (to - from) * p : p > 0 ? n.to : (cur ?? n.to);
          } else if (n.by !== undefined) {
            const by = numVal(n.by, vr);
            if (Number.isFinite(by) && Number.isFinite(from)) v = from + by * p;
          }
        }
        if (v !== undefined && (typeof v === 'string' || Number.isFinite(v))) assign(a, v, st);
      }
      return;
    }
    case 'animEffect': {
      if (n.filter === 'image') {
        const m = /opacity:\s*([\d.]+)/.exec(n.prLst ?? '');
        if (m) st.opacity = Math.min(st.opacity, parseFloat(m[1]!));
        return;
      }
      if (n.filter) st.filters.push({ filter: n.filter, transition: n.transition ?? 'in', p });
      return;
    }
    case 'animScale': {
      const from = n.fromXY ?? [st.sx, st.sy];
      const to = n.toXY ?? (n.byXY ? [from[0] * n.byXY[0], from[1] * n.byXY[1]] : from);
      st.sx = from[0] + (to[0] - from[0]) * p;
      st.sy = from[1] + (to[1] - from[1]) * p;
      return;
    }
    case 'animRot': {
      if (n.rotFrom !== undefined || n.rotTo !== undefined) {
        const from = n.rotFrom ?? st.rot, to = n.rotTo ?? from;
        st.rot = from + (to - from) * p;
      } else if (n.rotBy !== undefined) {
        st.rot += n.rotBy * p;
      }
      return;
    }
    case 'animMotion': {
      if (n.path) {
        // pathEditMode relative: o path JÁ é deslocamento em relação à posição
        // original (o "arco p/ cima" termina em 0,0 — não começa)
        const mp = motionPath(n.path);
        let [px, py] = pointOnPath(mp, p);
        if (n.rAng) {
          const a = (n.rAng * Math.PI) / 180;
          [px, py] = [px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a)];
        }
        st.mx += px; st.my += py;
      } else {
        const from = n.fromXY ?? [0, 0];
        const to = n.toXY ?? (n.byXY ? [from[0] + n.byXY[0], from[1] + n.byXY[1]] : from);
        st.mx += from[0] + (to[0] - from[0]) * p;
        st.my += from[1] + (to[1] - from[1]) * p;
      }
      return;
    }
    case 'animClr': {
      for (const a of attrs) {
        const fromC = n.fromColor ?? colorOf(a, st, base) ?? '#000000';
        let v: string | undefined;
        if (n.toColor) v = mixColor(fromC, n.toColor, p, n);
        else if (n.byHsl) {
          const [h, s, l] = rgbHsl(hexRgb(fromC));
          const sign = n.clrDir === 'ccw' ? -1 : 1;
          v = hslHex(h + sign * n.byHsl[0] * p, Math.max(0, Math.min(1, s + n.byHsl[1] * p)), Math.max(0, Math.min(1, l + n.byHsl[2] * p)));
        }
        if (v) assign(a, v, st);
      }
      return;
    }
    default: return; // cmd (mídia), audio/video
  }
}

/** Avalia um nó (container ou comportamento) no tempo local `local`. */
function evalNode(n: TimeNode, local: number, st: PartState, base: AnimBase): void {
  const container = n.tag === 'par' || n.tag === 'seq' || n.tag === 'excl';
  const simple = simpleDurOf(n);
  const f = progressOf(n, local, simple);
  if (f === null) return;
  if (!container) { applyBehavior(n, f, st, base); return; }
  const t = Number.isFinite(simple) ? f * simple : local;
  if (n.tag === 'seq') {
    let c0 = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      c0 += b;
      if (t < c0) break;
      evalNode(c, t - c0, st, base);
      c0 += activeDurOf(c);
    }
    return;
  }
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null || t < b) continue;
    evalNode(c, t - b, st, base);
  }
}

/** Parte de gráfico (`<a:chart seriesIdx categoryIdx bldStep>`) → seleção de desenho. −3 = fundo, −4/−1 = todos. */
function chartSel(c: { series: number; category: number; step: string }): ChartSel {
  const any = (v: number): boolean => v < 0;
  const key = `${c.step}|${c.series}|${c.category}`;
  switch (c.step) {
    case 'gridLegend': return { key, bg: true, data: null };
    case 'series': return { key, bg: false, data: (s) => s === c.series };
    case 'category': return { key, bg: false, data: (_s, k) => k === c.category };
    case 'ptInSeries': case 'ptInCategory':
      return { key, bg: false, data: (s, k) => (any(c.series) || s === c.series) && (any(c.category) || k === c.category) };
    default: return { key, bg: true, data: () => true }; // allPts: o gráfico inteiro
  }
}

// ───────────────────────── camadas / visibilidade inicial ─────────────────────────

/** Primeiro `set style.visibility` do efeito: 'visible' (entrada) | 'hidden' (saída) | undefined. */
function firstVisibility(n: TimeNode): string | undefined {
  let best: { t: number; v: string } | undefined;
  const walk = (x: TimeNode, t0: number): void => {
    if (x.tag === 'set' && x.attrNames?.includes('style.visibility') && x.setTo) {
      if (!best || t0 < best.t) best = { t: t0, v: x.setTo };
      return;
    }
    for (const c of x.children) {
      const b = beginOffset(c);
      if (b !== null) walk(c, t0 + b);
    }
  };
  walk(n, 0);
  return best?.v;
}

/** Estado neutro de uma parte (antes de qualquer efeito). */
function neutral(base: AnimBase, visible: boolean): PartState {
  return { visible, opacity: 1, x: base.x, y: base.y, w: base.w, h: base.h, rot: 0, sx: 1, sy: 1, mx: 0, my: 0, filters: [] };
}

interface Track {
  e: PlacedEffect;
  /** Deslocamento extra de início (ms) — unidades escalonadas. */
  shift: number;
}

/** Avalia uma lista de efeitos (ordenados por início) para uma parte. */
function evalTracks(tracks: Track[], animMs: number, base: AnimBase, initiallyVisible: boolean): PartState {
  const st = neutral(base, initiallyVisible);
  for (const tr of tracks) {
    let local = animMs - tr.e.t0 - tr.shift;
    if (local < 0) continue;
    // fim forçado ("até o próximo clique"): congela no instante do fim (fill
    // remove = some de vez)
    if (tr.e.endAt !== undefined && animMs >= tr.e.endAt + tr.shift) {
      if (tr.e.fill === 'remove') continue;
      local = tr.e.endAt - tr.e.t0;
    }
    evalNode(tr.e.node, local, st, base);
  }
  return st;
}

/** Visibilidade inicial: oculta se a 1ª mudança de visibilidade (no tempo) é uma ENTRADA. */
function initialVisible(tracks: Track[]): boolean {
  const sorted = [...tracks].sort((a, b) => a.e.t0 + a.shift - (b.e.t0 + b.shift));
  for (const tr of sorted) {
    const v = firstVisibility(tr.e.node);
    if (v) return v !== 'visible';
  }
  return true;
}

export interface ShapeAnimContext {
  /** O fundo da forma é animado junto do texto em efeitos por letra/palavra (`bldP animBg`). */
  animBg?: (spid: string) => boolean;
  /** Forma do desenho de um SmartArt (`dsp:sp modelId`): efeitos `<a:dgm id>` de outras formas não valem. */
  dgmId?: string;
  /** Nº de parágrafos do txBody (para efeitos por unidade sem faixa). */
  paraCount?: number;
}

/**
 * Monta os ganchos de animação de uma forma no instante `animMs` (tempo de
 * animação do slide). `ids` = id da forma + ids dos grupos que a contêm.
 * Devolve null quando nenhum efeito do slide toca a forma.
 */
export function shapeAnimHooks(effects: PlacedEffect[], ids: readonly string[], animMs: number, ctx: ShapeAnimContext = {}): ShapeAnimHooks | null {
  const mine = effects.filter((e) => e.target && ids.includes(e.target.spid)
    && (!e.target.dgm || e.target.dgm === ctx.dgmId)).sort((a, b) => a.t0 - b.t0);
  if (!mine.length) return null;
  const chart = new Map<string, { sel: ChartSel; tracks: Track[] }>();
  const all: Track[] = [];
  const bg: Track[] = [];
  const paras: { tr: Track; range: [number, number] }[] = [];
  const units: { e: PlacedEffect; range?: [number, number]; bgFirst: boolean }[] = [];
  for (const e of mine) {
    const t = e.target!;
    const it = e.node.iterate;
    if (t.chart) {
      const c = t.chart, key = `${c.step}|${c.series}|${c.category}`;
      let part = chart.get(key);
      if (!part) chart.set(key, part = { sel: chartSel(c), tracks: [] });
      part.tracks.push({ e, shift: 0 });
    } else if (t.sub === 'bg') bg.push({ e, shift: 0 });
    else if (it && (it.type === 'wd' || it.type === 'lt')) {
      const bgFirst = ctx.animBg?.(t.spid) ?? false;
      units.push({ e, ...(t.pRange ? { range: t.pRange } : {}), bgFirst });
      if (bgFirst) bg.push({ e, shift: 0 });
    } else if (t.pRange) paras.push({ tr: { e, shift: 0 }, range: t.pRange });
    else all.push({ e, shift: 0 });
  }
  const hooks: ShapeAnimHooks = {
    all: (base) => evalTracks(all, animMs, base, initialVisible(all)),
  };
  if (bg.length) {
    const vis = initialVisible(bg);
    hooks.bg = (base) => evalTracks(bg, animMs, base, vis);
  }
  if (chart.size) {
    // fundo/marcas sem efeito próprio ficam estáticos (camadas extras)
    const parts = [...chart.values()];
    const out: NonNullable<ShapeAnimHooks['chartParts']> = [];
    if (!parts.some((p) => p.sel.bg)) out.push({ sel: { bg: true, data: null }, state: null });
    const covered = (s: number, c: number): boolean => parts.some((p) => !!p.sel.data && p.sel.data(s, c));
    out.push({ sel: { bg: false, data: (s, c) => !covered(s, c) }, state: null });
    for (const p of parts) {
      const vis = initialVisible(p.tracks);
      out.push({ sel: p.sel, state: (base) => evalTracks(p.tracks, animMs, base, vis) });
    }
    hooks.chartParts = out;
  }
  if (paras.length) {
    hooks.para = (i, base) => {
      const tr = paras.filter((p) => i >= p.range[0] && i <= p.range[1]).map((p) => p.tr);
      if (!tr.length) return null;
      return evalTracks(tr, animMs, base, initialVisible(tr));
    };
  }
  if (units.length) {
    const type = units[0]!.e.node.iterate!.type as 'wd' | 'lt';
    hooks.unit = {
      type,
      state: (ref, base) => {
        const tr: Track[] = [];
        for (const u of units) {
          if (u.range && (ref.para < u.range[0] || ref.para > u.range[1])) continue;
          const it = u.e.node.iterate!;
          const simple = simpleDurOf(u.e.node);
          const gap = it.absMs ?? (it.pct ?? 0) * simple;
          // efeito restrito a UM parágrafo conta dentro dele; senão, no txBody todo
          const local = u.range !== undefined && u.range[0] === u.range[1];
          const k = local ? ref.kPara : ref.k, count = local ? ref.countPara : ref.count;
          const idx = it.backwards ? count - 1 - k : k;
          tr.push({ e: u.e, shift: idx * gap + (u.bgFirst ? simple : 0) });
        }
        if (!tr.length) return null;
        return evalTracks(tr, animMs, base, initialVisible(tr));
      },
    };
  }
  return hooks;
}
