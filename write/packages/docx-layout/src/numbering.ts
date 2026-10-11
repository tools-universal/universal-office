import type { Numbering, NumLevel, StyleDef } from '@universal-office/docx-core';
import { own } from './resolve.js';

/**
 * Numeração do Word: contadores por lista, reinício de níveis, lvlText com
 * %1..%9 (cada nível no SEU formato; isLgl força decimal) e formatos.
 */

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
  [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
];

function roman(n: number): string {
  if (n <= 0) return String(n);
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

function letters(n: number): string {
  if (n <= 0) return String(n);
  // Word: a..z, aa..zz, aaa… (repete a letra)
  const ch = String.fromCharCode(97 + ((n - 1) % 26));
  return ch.repeat(Math.floor((n - 1) / 26) + 1);
}

const UNITS_PT = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS_PT = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];

function cardinalPt(n: number): string {
  if (n < 20) return UNITS_PT[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return TENS_PT[t]! + (u ? ` e ${UNITS_PT[u]}` : '');
  }
  return String(n);
}

export function formatNumber(n: number, fmt: string | undefined, lang = 'pt-BR'): string {
  switch (fmt) {
    case undefined:
    case 'decimal': return String(n);
    case 'decimalZero': return n < 10 && n >= 0 ? `0${n}` : String(n);
    case 'upperRoman': return roman(n).toUpperCase();
    case 'lowerRoman': return roman(n);
    case 'upperLetter': return letters(n).toUpperCase();
    case 'lowerLetter': return letters(n);
    case 'ordinal': return lang.startsWith('pt') ? `${n}º` : `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;
    case 'cardinalText': {
      const s = cardinalPt(n);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case 'ordinalText': return `${n}º`;
    case 'hex': return n.toString(16).toUpperCase();
    case 'decimalEnclosedCircle': return n >= 1 && n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : String(n);
    case 'decimalEnclosedParen': return `(${n})`;
    case 'decimalEnclosedFullstop': return `${n}.`;
    case 'none': return '';
    case 'bullet': return '';
    default: return String(n);
  }
}

export interface NumberMarker {
  text: string;
  level: NumLevel;
  numId: number;
  ilvl: number;
  /** id da lista (contador) — p/ depuração. */
  listKey: string;
}

export class NumberingState {
  private counters = new Map<string, (number | undefined)[]>();
  private seenNums = new Set<number>();

  constructor(
    private numbering: Numbering,
    private styles: Record<string, StyleDef>,
    private lang = 'pt-BR',
  ) {}

  /** Cópia independente dos contadores (medições sem efeito colateral). */
  clone(): NumberingState {
    const c = new NumberingState(this.numbering, this.styles, this.lang);
    for (const [k, v] of this.counters) c.counters.set(k, [...v]);
    for (const n of this.seenNums) c.seenNums.add(n);
    return c;
  }

  /** abstractNum efetivo (segue numStyleLink → estilo de numeração → numId). */
  private abstractFor(numId: number, depth = 0): { absId: number } | null {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const abs = this.numbering.abstractNums[inst.abstractNumId];
    if (!abs) return null;
    if (abs.numStyleLink && depth < 4) {
      const st = own(this.styles, abs.numStyleLink);
      const linked = st?.pPr?.numPr?.numId;
      if (linked !== undefined && linked !== numId) {
        const r = this.abstractFor(linked, depth + 1);
        if (r) return r;
      }
    }
    return { absId: abs.abstractNumId };
  }

  /** Nível efetivo (override da instância > abstractNum). */
  level(numId: number, ilvl: number): NumLevel | null {
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const ov = inst.overrides[ilvl]?.lvl;
    if (ov && (ov.lvlText !== undefined || ov.numFmt !== undefined)) return ov;
    const a = this.abstractFor(numId);
    const abs = a ? this.numbering.abstractNums[a.absId] : undefined;
    return abs?.levels[ilvl] ?? null;
  }

  /** Avança o contador e devolve o marcador do parágrafo (null = sem numeração). */
  next(numId: number, ilvl: number): NumberMarker | null {
    if (!numId) return null;
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const a = this.abstractFor(numId);
    if (!a) return null;
    ilvl = Math.max(0, Math.min(8, ilvl));
    const lvl = this.level(numId, ilvl);
    if (!lvl) return null;
    const hasOverride = Object.values(inst.overrides).some((o) => o.startOverride !== undefined);
    const key = hasOverride ? `n${numId}` : `a${a.absId}`;
    let c = this.counters.get(key);
    if (!c) { c = []; this.counters.set(key, c); }
    if (hasOverride && !this.seenNums.has(numId)) {
      this.seenNums.add(numId);
      for (const [lv, o] of Object.entries(inst.overrides)) {
        if (o.startOverride !== undefined) c[Number(lv)] = o.startOverride - 1;
      }
    }
    const startOf = (l: number): number => {
      const ov = inst.overrides[l];
      if (ov?.startOverride !== undefined) return ov.startOverride;
      return this.level(numId, l)?.start ?? 0;
    };
    c[ilvl] = c[ilvl] === undefined ? startOf(ilvl) : c[ilvl]! + 1;
    // níveis mais fundos reiniciam (salvo lvlRestart)
    for (let d = ilvl + 1; d < 9; d++) {
      const r = this.level(numId, d)?.lvlRestart;
      if (r === 0) continue;
      if (r === undefined || ilvl < r) c[d] = undefined;
    }
    const lvlText = lvl.lvlTextNull ? '' : (lvl.lvlText ?? '');
    let text: string;
    if (lvl.numFmt === 'bullet') text = lvlText;
    else {
      text = lvlText.replace(/%([1-9])/g, (_, k: string) => {
        const l = parseInt(k, 10) - 1;
        const v = c![l] ?? startOf(l);
        const fmt = lvl.isLgl && l !== ilvl ? 'decimal' : (this.level(numId, l)?.numFmt ?? 'decimal');
        return formatNumber(v, fmt === 'bullet' ? 'decimal' : fmt, this.lang);
      });
    }
    return { text, level: lvl, numId, ilvl, listKey: key };
  }
}
