import type { CondFormat, CondRule, Cfvo, Dxf, Fill, Border, Cell } from '@universal/sheet-core';
import { FErr, evalFormula, compare, toStr, serialOf, dateOf, type FCtx, type FScalar } from './cf-formula.js';

/**
 * Motor de FORMATAÇÃO CONDICIONAL: avalia as regras (clássicas + x14) de
 * uma aba e dá, por célula, a camada a aplicar SOBRE a formatação direta.
 *
 * Regras medidas no oráculo (pasta sintética t-cf):
 *  - prioridade global (menor número primeiro); cada propriedade do dxf
 *    (fundo, cor/negrito/itálico/sublinhado/tachado da fonte, cada lado da
 *    borda, formato numérico) fica com a regra MAIS prioritária que a define;
 *    regras que não conflitam somam; `stopIfTrue` corta as seguintes;
 *  - célula vazia entra nas comparações como 0/"" (cellIs "< 4" pinta as
 *    vazias); duplicados/únicos e texto sem diferenciar maiúsculas;
 *  - escala de cor: posições pelo cfvo (min/max/num/percent/percentile/
 *    formula) e interpolação sRGB truncada em direção à cor de partida
 *    (c = a + trunc((b − a)·t), com t calculado como o Excel —
 *    (v − min)/(max − min) relativo às posições dos pontos);
 *  - barra de dados 2007 (sem x14): 10..90% de (largura − 3) px a partir de
 *    x+2, degradê cor → branco; x14: 0..100%, borda, negativos com eixo
 *    tracejado; altura = linha − 4 a partir de y+2;
 *  - ícones 16×16 a x+2, rente à base (ver cf-icons.ts).
 * Estatísticas (min/max/percentis/médias/top N/duplicados) só sobre as
 * células EXISTENTES do intervalo, calculadas uma vez por regra (nunca sobre
 * as 1M linhas nominais de "A1:A1048576").
 */

export interface Rect { c1: number; r1: number; c2: number; r2: number }

/** Resultado por célula. */
export interface CfResult {
  fill?: Fill;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  border?: Border;
  numFmtCode?: string;
  numFmtId?: number;
  bar?: BarPaint;
  icon?: { set: string; index: number };
  hideValue?: boolean;
}

export interface BarPaint {
  /** Fração ocupada (0..1) do comprimento útil, a partir do eixo; < 0 = negativa. */
  from: number; to: number;
  color: string;
  gradient: boolean;
  border?: string;
  /** Posição do eixo (0..1) quando há negativos; undefined = sem eixo. */
  axis?: number;
  axisColor?: string;
  /** Barra de 2007 (sem x14): começa em x+2. */
  legacy: boolean;
  negative: boolean;
}

/** Acesso às células da aba (e de outras, pelo nome). */
export interface CfSheetAccess {
  /** Valor em cache da célula (null = vazia). */
  value(col: number, row: number): FScalar;
  /** Células existentes do retângulo. */
  each(c1: number, r1: number, c2: number, r2: number, fn: (v: FScalar, col: number, row: number) => void): void;
  /** Outra aba pelo nome (fórmulas com Aba!A1). */
  other?(name: string): Pick<CfSheetAccess, 'value' | 'each'> | undefined;
  dxfs: Dxf[];
  today: number;
  date1904?: boolean;
}

interface RuleCtx {
  rule: CondRule;
  ranges: Rect[];
  bbox: Rect;
  base: { col: number; row: number };
  stats?: Stats;
}
interface Stats {
  nums: number[];        // numéricos ordenados
  min: number; max: number;
  mean: number; sd: number;
  counts?: Map<string, number>; // duplicados: chave normalizada → contagem
}

const MAXR = 1048576, MAXC = 16384;

/** "A1:B5 D2" → retângulos 1-based. */
export function parseSqref(sqref: string): Rect[] {
  const out: Rect[] = [];
  for (const part of sqref.split(/\s+/)) {
    if (!part) continue;
    const m = /^\$?([A-Za-z]{1,3})?\$?(\d+)?(?::\$?([A-Za-z]{1,3})?\$?(\d+)?)?$/.exec(part);
    if (!m) continue;
    const col = (s: string | undefined, d: number): number => { if (!s) return d; let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
    const c1 = col(m[1], 1), r1 = m[2] ? parseInt(m[2], 10) : 1;
    const hasEnd = part.includes(':');
    const c2 = hasEnd ? col(m[3], MAXC) : c1, r2 = hasEnd ? (m[4] ? parseInt(m[4], 10) : MAXR) : r1;
    out.push({ c1: Math.min(c1, c2), r1: Math.min(r1, r2), c2: Math.max(c1, c2), r2: Math.max(r1, r2) });
  }
  return out;
}

const inRect = (r: Rect, c: number, row: number): boolean => c >= r.c1 && c <= r.c2 && row >= r.r1 && row <= r.r2;

export class CfEngine {
  private rules: RuleCtx[] = [];
  private memo = new Map<number, CfResult | null>();

  constructor(formats: CondFormat[], private sh: CfSheetAccess) {
    for (const f of formats) {
      const ranges = parseSqref(f.sqref);
      if (!ranges.length) continue;
      const bbox = ranges.reduce((a, r) => ({ c1: Math.min(a.c1, r.c1), r1: Math.min(a.r1, r.r1), c2: Math.max(a.c2, r.c2), r2: Math.max(a.r2, r.r2) }));
      for (const rule of f.rules) this.rules.push({ rule, ranges, bbox, base: { col: ranges[0]!.c1, row: ranges[0]!.r1 } });
    }
    this.rules.sort((a, b) => a.rule.priority - b.rule.priority);
  }

  get empty(): boolean { return this.rules.length === 0; }

  /** Camada da formatação condicional em (col,row); undefined se nada se aplica. */
  at(col: number, row: number): CfResult | undefined {
    const key = row * 16385 + col;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit ?? undefined;
    const res = this.compute(col, row);
    if (this.memo.size > 200_000) this.memo.clear();
    this.memo.set(key, res ?? null);
    return res;
  }

  private compute(col: number, row: number): CfResult | undefined {
    let out: CfResult | undefined;
    let v: FScalar | undefined;
    for (const rc of this.rules) {
      if (!inRect(rc.bbox, col, row) || !rc.ranges.some((r) => inRect(r, col, row))) continue;
      v ??= this.sh.value(col, row);
      const r = rc.rule;
      let matched = false;
      switch (r.type) {
        case 'colorScale': {
          if (typeof v !== 'number') break;
          const c = this.scaleColor(rc, v);
          if (c) { matched = true; out ??= {}; if (!out.fill) out.fill = { pattern: 'solid', fgColor: c }; }
          break;
        }
        case 'dataBar': {
          if (typeof v !== 'number') break;
          const b = this.bar(rc, v);
          if (b) { matched = true; out ??= {}; if (!out.bar) { out.bar = b; if (r.showValue === false) out.hideValue = true; } }
          break;
        }
        case 'iconSet': {
          if (typeof v !== 'number') break;
          const ic = this.icon(rc, v);
          if (ic) { matched = true; out ??= {}; if (!out.icon) { if (ic.set !== 'NoIcons') out.icon = ic; if (r.showValue === false) out.hideValue = true; } }
          break;
        }
        default: {
          if (!this.test(rc, v, col, row)) break;
          matched = true;
          const d = r.dxf ?? (r.dxfId !== undefined ? this.sh.dxfs[r.dxfId] : undefined);
          if (d) out = mergeDxf(out ?? {}, d);
        }
      }
      if (matched && r.stopIfTrue) break;
    }
    return out;
  }

  // ───────────── regras de condição ─────────────

  private fctx(rc: RuleCtx, col: number, row: number): FCtx {
    const sh = this.sh;
    return {
      cell: (sheet, c, r) => {
        if (sheet) { const o = sh.other?.(sheet); return o ? o.value(c, r) : new FErr('#REF!'); }
        return sh.value(c, r);
      },
      each: (sheet, c1, r1, c2, r2, fn) => {
        if (sheet) { const o = sh.other?.(sheet); if (o) o.each(c1, r1, c2, r2, fn); return; }
        sh.each(c1, r1, c2, r2, fn);
      },
      col, row, dc: col - rc.base.col, dr: row - rc.base.row, today: sh.today, date1904: sh.date1904,
    };
  }

  private formula(rc: RuleCtx, i: number, col: number, row: number): FScalar | undefined {
    const f = rc.rule.formula?.[i];
    if (f === undefined) return undefined;
    return evalFormula(f, this.fctx(rc, col, row));
  }

  private test(rc: RuleCtx, v: FScalar, col: number, row: number): boolean {
    const r = rc.rule;
    const truthy = (x: FScalar | undefined): boolean => x === true || (typeof x === 'number' && x !== 0);
    switch (r.type) {
      case 'expression': return truthy(this.formula(rc, 0, col, row));
      case 'cellIs': {
        const a = this.formula(rc, 0, col, row);
        if (a === undefined || a instanceof FErr || v instanceof FErr) return false;
        const op = r.operator ?? 'equal';
        if (op === 'between' || op === 'notBetween') {
          const b = this.formula(rc, 1, col, row);
          if (b === undefined || b instanceof FErr) return false;
          const lo = compare(a, b) as number <= 0 ? a : b, hi = lo === a ? b : a;
          const inside = (compare(v, lo) as number) >= 0 && (compare(v, hi) as number) <= 0;
          return op === 'between' ? inside : !inside;
        }
        const c = compare(v, a);
        if (c instanceof FErr) return false;
        switch (op) {
          case 'equal': return c === 0;
          case 'notEqual': return c !== 0;
          case 'greaterThan': return c > 0;
          case 'lessThan': return c < 0;
          case 'greaterThanOrEqual': return c >= 0;
          case 'lessThanOrEqual': return c <= 0;
        }
        return false;
      }
      case 'containsText': case 'notContainsText': case 'beginsWith': case 'endsWith': {
        if (r.formula?.length) { const x = this.formula(rc, 0, col, row); if (x !== undefined && !(x instanceof FErr)) return truthy(x); }
        if (v instanceof FErr) return false;
        const s = toStr(v); if (s instanceof FErr) return false;
        const t = (r.text ?? '').toLowerCase(), ls = s.toLowerCase();
        if (r.type === 'containsText') return ls.includes(t);
        if (r.type === 'notContainsText') return !ls.includes(t);
        if (r.type === 'beginsWith') return ls.startsWith(t);
        return ls.endsWith(t);
      }
      case 'containsBlanks': return v === null || (typeof v === 'string' && v.trim() === '');
      case 'notContainsBlanks': return !(v === null || (typeof v === 'string' && v.trim() === ''));
      case 'containsErrors': return v instanceof FErr;
      case 'notContainsErrors': return !(v instanceof FErr);
      case 'timePeriod': return typeof v === 'number' && this.inPeriod(r.timePeriod ?? 'today', Math.floor(v));
      case 'top10': {
        if (typeof v !== 'number') return false;
        const st = this.stats(rc);
        const n = st.nums.length;
        if (!n) return false;
        let k = r.rank ?? 10;
        if (r.percent) k = Math.max(1, Math.floor((n * k) / 100));
        k = Math.max(1, Math.min(n, k));
        return r.bottom ? v <= st.nums[k - 1]! : v >= st.nums[n - k]!;
      }
      case 'aboveAverage': {
        if (typeof v !== 'number') return false;
        const st = this.stats(rc);
        if (!st.nums.length) return false;
        const above = r.aboveAverage !== false;
        const lim = st.mean + (r.stdDev ? (above ? 1 : -1) * r.stdDev * st.sd : 0);
        if (above) return r.equalAverage ? v >= lim : v > lim;
        return r.equalAverage ? v <= lim : v < lim;
      }
      case 'duplicateValues': case 'uniqueValues': {
        if (v === null || v === '') return false;
        const st = this.stats(rc, true);
        const n = st.counts!.get(keyOf(v)) ?? 0;
        return r.type === 'duplicateValues' ? n > 1 : n === 1;
      }
    }
    return false;
  }

  private inPeriod(p: string, d: number): boolean {
    const t = this.sh.today;
    const dt = dateOf(t, this.sh.date1904);
    const wd = dt.getUTCDay(); // domingo = 0 (semana do Excel começa no domingo)
    const sow = t - wd;
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1;
    const mStart = (yy: number, mm: number): number => serialOf(yy, mm, 1, this.sh.date1904);
    switch (p) {
      case 'today': return d === t;
      case 'yesterday': return d === t - 1;
      case 'tomorrow': return d === t + 1;
      case 'last7Days': return d >= t - 6 && d <= t;
      case 'thisWeek': return d >= sow && d <= sow + 6;
      case 'lastWeek': return d >= sow - 7 && d <= sow - 1;
      case 'nextWeek': return d >= sow + 7 && d <= sow + 13;
      case 'thisMonth': return d >= mStart(y, m) && d < mStart(y, m + 1);
      case 'lastMonth': return d >= mStart(y, m - 1) && d < mStart(y, m);
      case 'nextMonth': return d >= mStart(y, m + 1) && d < mStart(y, m + 2);
    }
    return false;
  }

  /** Estatísticas da regra sobre as células EXISTENTES do intervalo (cacheadas). */
  private stats(rc: RuleCtx, withCounts = false): Stats {
    if (rc.stats && (!withCounts || rc.stats.counts)) return rc.stats;
    const nums: number[] = [];
    const counts = withCounts ? new Map<string, number>() : undefined;
    for (const rg of rc.ranges) {
      this.sh.each(rg.c1, rg.r1, rg.c2, rg.r2, (v) => {
        if (typeof v === 'number') nums.push(v);
        if (counts && v !== null && v !== '' && !(v instanceof FErr)) { const k = keyOf(v); counts.set(k, (counts.get(k) ?? 0) + 1); }
      });
    }
    nums.sort((a, b) => a - b);
    const n = nums.length;
    const mean = n ? nums.reduce((s, x) => s + x, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(nums.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1)) : 0;
    rc.stats = { nums, min: n ? nums[0]! : 0, max: n ? nums[n - 1]! : 0, mean, sd, counts };
    return rc.stats;
  }

  // ───────────── escala de cor / barra / ícones ─────────────

  /** Valor de um ponto de controle (cfvo) sobre as estatísticas da regra. */
  private cfvoValue(rc: RuleCtx, c: { type: string; value?: number; val?: string }, isMax: boolean): number | undefined {
    const st = this.stats(rc);
    const n = st.nums.length;
    switch (c.type) {
      case 'min': case 'autoMin': return c.type === 'autoMin' ? Math.min(0, st.min) : st.min;
      case 'max': case 'autoMax': return c.type === 'autoMax' ? Math.max(0, st.max) : st.max;
      case 'num': return c.value ?? this.cfvoFormula(rc, c.val);
      case 'percent': { const p = c.value ?? this.cfvoFormula(rc, c.val); return p === undefined ? undefined : st.min + ((st.max - st.min) * p) / 100; }
      case 'percentile': {
        const p = c.value ?? this.cfvoFormula(rc, c.val);
        if (p === undefined || !n) return undefined;
        const h = ((n - 1) * Math.max(0, Math.min(100, p))) / 100;
        const lo = Math.floor(h);
        return st.nums[lo]! + (h - lo) * ((st.nums[Math.min(n - 1, lo + 1)] ?? st.nums[lo]!) - st.nums[lo]!);
      }
      case 'formula': return this.cfvoFormula(rc, c.val);
    }
    return isMax ? st.max : st.min;
  }

  private cfvoFormula(rc: RuleCtx, src: string | undefined): number | undefined {
    if (src === undefined) return undefined;
    const x = evalFormula(src, this.fctx(rc, rc.base.col, rc.base.row));
    return typeof x === 'number' ? x : undefined;
  }

  private scaleColor(rc: RuleCtx, v: number): string | undefined {
    const stops = rc.rule.stops;
    if (!stops || stops.length < 2) return undefined;
    const st = this.stats(rc);
    const vals = stops.map((s, i) => this.cfvoValue(rc, s, i === stops.length - 1));
    if (vals.some((x) => x === undefined)) return undefined;
    // pontos INTERMEDIÁRIOS são presos ao [min,max] dos valores (medido: mid
    // `formula 50` num intervalo 1..10 vira 10 e o 3º trecho nunca aparece)
    const pts = (vals as number[]).map((x, i) => (i > 0 && i < vals.length - 1 ? Math.max(st.min, Math.min(st.max, x)) : x));
    if (v <= pts[0]!) return stops[0]!.color;
    // posições relativas como o Excel (t global → t local do trecho)
    const lo = st.min, span = st.max - st.min || 1;
    const pos = (x: number): number => (x - lo) / span;
    const p = pos(v);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      if (v <= b) {
        const pa = pos(a), pb = pos(b);
        const t = pb > pa ? Math.max(0, Math.min(1, (p - pa) / (pb - pa))) : 1;
        return lerpTrunc(stops[i]!.color, stops[i + 1]!.color, t);
      }
    }
    return stops[stops.length - 1]!.color;
  }

  private bar(rc: RuleCtx, v: number): BarPaint | undefined {
    const r = rc.rule;
    const cf = r.cfvos ?? [{ type: 'min' }, { type: 'max' }];
    let lo = this.cfvoValue(rc, cf[0] ?? { type: 'min' }, false);
    let hi = this.cfvoValue(rc, cf[1] ?? { type: 'max' }, true);
    if (lo === undefined || hi === undefined) return undefined;
    if (hi < lo) [lo, hi] = [hi, lo];
    const legacy = !r.x14;
    // comprimentos: 2007 = 10..90%; x14 só respeita 0..100 (outros valores
    // gravados saem como 10..90 — medido com minLength 20/maxLength 80)
    let minL = 0.1, maxL = 0.9;
    if (!legacy && (r.barMinLen ?? 10) === 0 && (r.barMaxLen ?? 90) === 100) { minL = 0; maxL = 1; }
    const color = r.barColor ?? '#638EC6';
    const gradient = legacy ? true : r.barGradient !== false;
    const border = !legacy && r.barBorder ? (r.barBorderColor ?? color) : undefined;
    const negColor = r.barNegSame ? color : (r.barNegColor ?? '#FF0000');
    const negBorder = border ? (r.barNegBorderSame === false ? (r.barNegBorderColor ?? '#FF0000') : border) : undefined;
    const axisMode = r.barAxis ?? 'automatic';
    if (!legacy && lo < 0 && axisMode !== 'none') {
      // eixo: automático = proporção dos negativos; middle = centro
      const axis = axisMode === 'middle' ? 0.5 : Math.min(1, Math.max(0, -lo / (hi - lo || 1)));
      const scale = axisMode === 'middle' ? Math.max(-lo, hi) || 1 : hi - lo || 1;
      const unit = axisMode === 'middle' ? 0.5 / scale : 1 / scale;
      const val = Math.max(lo, Math.min(hi, v));
      if (val >= 0) return { from: axis, to: axis + val * unit, color, gradient, border, axis, axisColor: r.barAxisColor ?? '#000000', legacy, negative: false };
      return { from: axis + val * unit, to: axis, color: negColor, gradient, border: negBorder, axis, axisColor: r.barAxisColor ?? '#000000', legacy, negative: true };
    }
    const t = hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : v >= hi ? 1 : 0;
    const len = minL + (maxL - minL) * t;
    return { from: 0, to: len, color, gradient, border, legacy, negative: false };
  }

  private icon(rc: RuleCtx, v: number): { set: string; index: number } | undefined {
    const r = rc.rule;
    const set = r.iconSet ?? '3TrafficLights1';
    const n = parseInt(set, 10) || 3;
    const cf = r.cfvos ?? [];
    let idx = 0;
    for (let i = 1; i < Math.min(n, cf.length); i++) {
      const c = cf[i]!;
      const lim = this.cfvoValue(rc, c, false);
      if (lim === undefined) continue;
      if (c.gte === false ? v > lim : v >= lim) idx = i;
    }
    if (r.icons && r.icons[idx]) {
      const ci = r.icons[idx]!;
      return { set: ci.set, index: ci.id };
    }
    return { set, index: r.iconReverse ? n - 1 - idx : idx };
  }
}

function keyOf(v: FScalar): string {
  if (typeof v === 'number') return 'n' + v;
  if (typeof v === 'string') return 's' + v.toLowerCase();
  if (typeof v === 'boolean') return 'b' + v;
  return 'x';
}

/** Interpolação sRGB do Excel: c = a + trunc((b − a)·t) por canal. */
export function lerpTrunc(a: string, b: string, t: number): string {
  const pa = rgb(a), pb = rgb(b);
  const ch = (i: number): number => Math.max(0, Math.min(255, pa[i]! + Math.trunc((pb[i]! - pa[i]!) * t)));
  return '#' + [0, 1, 2].map((i) => ch(i).toString(16).padStart(2, '0')).join('');
}
function rgb(c: string): number[] {
  const m = /^#?([0-9a-f]{6})/i.exec(c);
  const n = m ? parseInt(m[1]!, 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Junta o dxf de uma regra MENOS prioritária: só preenche o que ainda não foi definido. */
function mergeDxf(out: CfResult, d: Dxf): CfResult {
  if (d.fill && d.fill.pattern !== 'none' && !out.fill) out.fill = d.fill;
  if (d.fontColor !== undefined && out.fontColor === undefined) out.fontColor = d.fontColor;
  if (d.bold !== undefined && out.bold === undefined) out.bold = d.bold;
  if (d.italic !== undefined && out.italic === undefined) out.italic = d.italic;
  if (d.underline !== undefined && out.underline === undefined) out.underline = d.underline;
  if (d.strike !== undefined && out.strike === undefined) out.strike = d.strike;
  if (d.border) {
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      if (d.border[side] && !out.border?.[side]) (out.border ??= {})[side] = d.border[side];
    }
  }
  if ((d.numFmtCode !== undefined || d.numFmtId !== undefined) && out.numFmtCode === undefined && out.numFmtId === undefined) {
    if (d.numFmtCode !== undefined) out.numFmtCode = d.numFmtCode;
    if (d.numFmtId !== undefined) out.numFmtId = d.numFmtId;
  }
  return out;
}

/** Valor da célula para a CF (o que o Excel tem em cache). */
export function cellCfValue(cell: Cell | undefined, shared: (i: number) => string): FScalar {
  if (!cell) return null;
  const v = cell.value;
  switch (cell.type) {
    case 's': return v === undefined ? null : shared(parseInt(v, 10));
    case 'inlineStr': return cell.inlineString?.text ?? '';
    case 'str': return v ?? '';
    case 'b': return v === '1' || v === 'true';
    case 'e': return new FErr(v ?? '#N/A');
  }
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

/**
 * Barra de dados na célula (x,y,w,h) — geometria medida: comprimento útil
 * w − 3 a partir de x + 2, altura h − 4 a partir de y + 2; degradê da cor
 * (lado do eixo) até 83% rumo ao branco; borda de 1 px; eixo tracejado 3/1.
 */
export function paintDataBar(ctx: CanvasRenderingContext2D, b: BarPaint, x: number, y: number, w: number, h: number): void {
  const L = Math.max(0, Math.round(w) - 3);
  const x0 = Math.round(x) + 2, y0 = Math.round(y) + 2, bh = Math.max(1, Math.round(h) - 4);
  if (L <= 0 || bh <= 0) return;
  const ax = b.axis !== undefined ? x0 + Math.floor(b.axis * L) : undefined;
  let a = x0 + Math.round(b.from * L), e = x0 + Math.round(b.to * L);
  if (ax !== undefined) { if (b.negative) e = ax; else a = ax + 1; }
  const bw = e - a;
  if (bw > 0) {
    if (b.gradient) {
      const light = lerpLinear(b.color, '#FFFFFF', 0.83);
      const g = ctx.createLinearGradient(b.negative ? e : a, 0, b.negative ? a : e, 0);
      g.addColorStop(0, b.color);
      g.addColorStop(1, light);
      ctx.fillStyle = g;
    } else ctx.fillStyle = b.color;
    ctx.fillRect(a, y0, bw, bh);
    if (b.border) {
      ctx.fillStyle = b.border;
      ctx.fillRect(a, y0, bw, 1); ctx.fillRect(a, y0 + bh - 1, bw, 1);
      ctx.fillRect(a, y0, 1, bh); ctx.fillRect(a + bw - 1, y0, 1, bh);
    }
  }
  if (ax !== undefined) {
    ctx.fillStyle = b.axisColor ?? '#000000';
    const yt = Math.round(y), yb = Math.round(y + h);
    for (let yy = yt; yy < yb; yy++) if (((yy % 4) + 4) % 4 !== 3) ctx.fillRect(ax, yy, 1, 1);
  }
}

function lerpLinear(a: string, b: string, t: number): string {
  const pa = rgb(a), pb = rgb(b);
  return '#' + [0, 1, 2].map((i) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * t).toString(16).padStart(2, '0')).join('');
}

/** Hoje como serial do Excel (data local). */
export function todaySerial(date1904?: boolean): number {
  const d = new Date();
  return serialOf(d.getFullYear(), d.getMonth() + 1, d.getDate(), date1904);
}
