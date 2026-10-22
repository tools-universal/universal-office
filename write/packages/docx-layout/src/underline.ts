// Sublinhados (w:u) como o Word os desenha no PDF — medido na sonda de
// write/tools/home-lab (gen-ul*-probe.mjs; memória word-underline-facts):
// tudo em pixels de 600 dpi (2,4 twips) a partir da baseline; retângulos para os
// traços cheios e tracejados, curvas cúbicas traçadas para as ondas.
import type { PlacedGlyph } from './lines.js';
import type { PageItem, PathCmdTw } from './tree.js';
import { faceMetrics, type FontFace } from './fonts.js';

/** twips por pixel de 600 dpi */
const PX = 2.4;

/** Posição do topo (P), espessura (T) e limite de descida (L) do sublinhado, em px. */
export interface UlMetrics { P: number; T: number; L: number }

/**
 * Métricas do sublinhado da face no corpo: em = round(corpo·600/72) px; P e T da
 * tabela post arredondados no em; L = descendente que o GDI dá à fonte realizada
 * (VDMX 1:1 se houver esse em; senão usWinDescent no em, arredondado).
 */
export function ulMetrics(face: FontFace, sizePt: number): UlMetrics {
  const f = face.font, fm = f.metrics, m = faceMetrics(f);
  const upm = fm.unitsPerEm || 1000;
  const em = Math.round((sizePt * 600) / 72);
  const P = Math.round(m.underlinePos * em);
  const T = Math.max(1, Math.round(m.underlineThick * em));
  const vd = f.vdmx?.(em);
  const desc = fm.usWinDescent > 0 ? fm.usWinDescent : Math.max(0, -fm.descender);
  const L = vd ? -vd.yMin : Math.round((desc * em) / upm);
  return { P, T, L };
}

/** Geometria derivada (px): simples [P, P+T]; dupla [top1, top1+Td] e [top2, top2+Td];
 *  grossa/Heavy [top1, top2]; ondas com a linha central entre top1 e B. */
export interface UlGeom { P: number; T: number; Td: number; top1: number; top2: number; B: number }

export function ulGeometry({ P: P0, T, L }: UlMetrics): UlGeom {
  const P = P0 + T > L ? Math.max(0, L - T) : P0;
  let Td = Math.floor(T / 2 + 0.5);
  let top1 = Math.ceil(P / 2);
  // vão mínimo de 8 px entre as duas linhas; a de baixo não passa da descendente
  let top2 = Math.max(P + T - Td, top1 + Td + 8);
  const over = top2 + Td - L;
  if (over > 0) { top1 -= over; top2 -= over; }
  if (top1 < 0) {
    top1 = 0;
    Td = Math.max(1, Math.min(Td, Math.floor((L - 8) / 2)));
    top2 = L - Td;
  }
  const B = Math.floor((top1 + top2 + Td) / 2) - 1;
  return { P, T, Td, top1, top2, B };
}

/** Padrão dos tracejados (px de 600 dpi: traço, vão, …) — fixo, não escala com o corpo. */
const PATTERNS: Record<string, readonly number[]> = {
  dotted: [12, 12], dottedHeavy: [12, 12],
  dash: [33, 16], dashedHeavy: [33, 16],
  dashLong: [66, 33], dashLongHeavy: [66, 33],
  dotDash: [25, 8, 8, 8], dashDotHeavy: [25, 8, 8, 8],
  dotDotDash: [18, 6, 6, 6, 6, 6], dashDotDotHeavy: [18, 6, 6, 6, 6, 6],
};
const HEAVY = new Set(['thick', 'dottedHeavy', 'dashedHeavy', 'dashLongHeavy', 'dashDotHeavy', 'dashDotDotHeavy']);
/** meia-onda: 1,2 pt (picos a cada 2,4 pt a partir da borda esquerda da página) */
const HALF_WAVE = 24;

type Seg = { x0: number; x1: number; color: string };

/**
 * Sublinhados de uma linha. Trecho contínuo com o mesmo estilo tem UMA geometria:
 * média de P/T/L ponderada pela largura dos glifos que estão na baseline do trecho
 * (rebaixados — subscrito, position < 0 — formam trecho próprio; elevados entram no
 * trecho da linha sem pesar, ou, sozinhos, ficam na própria baseline). A cor só
 * divide o desenho (e o padrão recomeça).
 */
export function paintUnderlines(out: PageItem[], all: PlacedGlyph[], frameX: number, baseY: number): void {
  let lastContent = -1;
  all.forEach((pg, k) => { if (pg.g.kind !== 'space' && pg.g.kind !== 'lb' && pg.g.kind !== 'pb') lastContent = k; });
  type Group = { val: string; low: number | null; items: PlacedGlyph[] };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let curEnd = 0;
  all.forEach((pg, k) => {
    const g = pg.g, u = g.style.underline;
    const words = u?.val === 'words';
    const on = k <= lastContent && !!u && u.val !== 'none' && pg.w > 0 && g.kind !== 'lb' && g.kind !== 'pb'
      && !(words && (g.kind === 'space' || g.kind === 'tab'));
    if (!on) { cur = null; return; }
    const low = g.style.shift < 0 ? g.style.shift : null;
    const x = frameX + pg.x;
    if (cur && cur.val === u!.val && cur.low === low && Math.abs(curEnd - x) < 1) cur.items.push(pg);
    else { cur = { val: u!.val, low, items: [pg] }; groups.push(cur); }
    curEnd = x + pg.w;
  });
  for (const gr of groups) {
    // baseline do trecho e quem pesa na geometria
    let shift: number;
    let weigh: PlacedGlyph[];
    if (gr.low !== null) { shift = gr.low; weigh = gr.items; }
    else {
      const base = gr.items.filter((pg) => pg.g.style.shift === 0);
      if (base.length) { shift = 0; weigh = base; }
      else {
        shift = Math.min(...gr.items.map((pg) => pg.g.style.shift));
        weigh = gr.items.filter((pg) => pg.g.style.shift === shift);
      }
    }
    let sw = 0, sp = 0, st = 0, sl = 0;
    const cache = new Map<string, UlMetrics>();
    for (const pg of weigh) {
      const key = `${pg.g.face.key}|${pg.g.style.sizePt}`;
      let m = cache.get(key);
      if (!m) { m = ulMetrics(pg.g.face, pg.g.style.sizePt); cache.set(key, m); }
      sw += pg.w; sp += pg.w * m.P; st += pg.w * m.T; sl += pg.w * m.L;
    }
    if (sw <= 0) continue;
    const geo = ulGeometry({ P: Math.round(sp / sw), T: Math.round(st / sw), L: Math.round(sl / sw) });
    const y0 = baseY - shift;
    // pedaços por cor (o traço muda de cor; o padrão recomeça)
    const segs: Seg[] = [];
    for (const pg of gr.items) {
      const x = frameX + pg.x;
      const color = pg.g.style.underline!.color ?? pg.g.style.color;
      const last = segs[segs.length - 1];
      if (last && last.color === color && Math.abs(last.x1 - x) < 1) last.x1 = x + pg.w;
      else segs.push({ x0: x, x1: x + pg.w, color });
    }
    for (const s of segs) paintStyle(out, gr.val, geo, s, y0);
  }
}

function band(out: PageItem[], s: Seg, y0: number, top: number, h: number, pattern?: readonly number[]): void {
  const y = y0 + top * PX, hh = h * PX;
  if (!pattern) { out.push({ t: 'rect', x: s.x0, y, w: s.x1 - s.x0, h: hh, fill: s.color }); return; }
  let x = s.x0, i = 0;
  while (x < s.x1 - 0.01) {
    const len = pattern[i % pattern.length]! * PX;
    if (i % 2 === 0) out.push({ t: 'rect', x, y, w: Math.min(len, s.x1 - x), h: hh, fill: s.color });
    x += len;
    i++;
  }
}

/** Onda entre as linhas centrais yTop e yBot (twips), picos na grade da página, recortada no trecho. */
function wave(out: PageItem[], s: Seg, yTop: number, yBot: number, widthPt: number): void {
  const cmds: PathCmdTw[] = [];
  let k = Math.floor(s.x0 / (2 * HALF_WAVE)) * 2;
  let x = k * HALF_WAVE;
  cmds.push({ op: 'M', x, y: yTop });
  while (x < s.x1) {
    const up = k % 2 === 0;
    const y1 = up ? yTop : yBot, y2 = up ? yBot : yTop;
    cmds.push({ op: 'C', x1: x + HALF_WAVE / 2, y1, x2: x + HALF_WAVE / 2, y2, x: x + HALF_WAVE, y: y2 });
    x += HALF_WAVE;
    k++;
  }
  const pad = widthPt * 20;
  out.push({ t: 'clip', op: 'push', x: s.x0, y: yTop - pad - HALF_WAVE, w: s.x1 - s.x0, h: yBot - yTop + 2 * pad + 2 * HALF_WAVE });
  out.push({ t: 'path', cmds, stroke: { color: s.color, widthPt } });
  out.push({ t: 'clip', op: 'pop' });
}

function paintStyle(out: PageItem[], val: string, g: UlGeom, s: Seg, y0: number): void {
  switch (val) {
    case 'double':
      band(out, s, y0, g.top1, g.Td);
      band(out, s, y0, g.top2, g.Td);
      return;
    case 'wave':
    case 'wavyHeavy':
      wave(out, s, y0 + g.top1 * PX, y0 + g.B * PX, val === 'wavyHeavy' ? 0.96 : 0.24);
      return;
    case 'wavyDouble': {
      const a = Math.floor((g.B - g.top1) / 2) - 1;
      wave(out, s, y0 + g.top1 * PX, y0 + (g.top1 + a) * PX, 0.24);
      wave(out, s, y0 + (g.B - a) * PX, y0 + g.B * PX, 0.24);
      return;
    }
    default: {
      const heavy = HEAVY.has(val);
      const top = heavy ? g.top1 : g.P;
      const h = heavy ? g.top2 - g.top1 : g.T;
      band(out, s, y0, top, h, PATTERNS[val]);
    }
  }
}
