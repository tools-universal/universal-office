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

/**
 * Contador de um nível. `real` = algum parágrafo DESTE nível já foi numerado;
 * senão o valor só existe porque um nível mais fundo o exigiu (pai "virtual"):
 * conta para o próximo parágrafo do nível, mas aparece como o início do nível.
 */
interface LevelCount { v: number; real: boolean }

export class NumberingState {
  /** contadores por abstractNum (compartilhados por todos os w:num dele) */
  private counters = new Map<string, (LevelCount | undefined)[]>();
  /** w:num já usados (o startOverride só reinicia no 1º uso) */
  private seenNums = new Set<number>();
  /** "numId:ilvl" com startOverride adiado (nível pai ainda sem uso no 1º uso do w:num) */
  private deferred = new Set<string>();

  constructor(
    private numbering: Numbering,
    private styles: Record<string, StyleDef>,
    private lang = 'pt-BR',
  ) {}

  /** Cópia independente dos contadores (medições sem efeito colateral). */
  clone(): NumberingState {
    const c = new NumberingState(this.numbering, this.styles, this.lang);
    for (const [k, v] of this.counters) c.counters.set(k, v.map((x) => (x ? { ...x } : x)));
    for (const n of this.seenNums) c.seenNums.add(n);
    for (const d of this.deferred) c.deferred.add(d);
    return c;
  }

  /**
   * Esquece quais w:num já foram usados: o próximo parágrafo de um w:num com
   * startOverride reinicia de novo. Artefato do PDF do Word aberto e exportado
   * direto (sem repaginar): os parágrafos formatados na abertura (1ª página e
   * o bloco que transborda para a 2ª) guardam o número; o seguinte de uma lista
   * com override recomeça. Chamado pelo motor após esse bloco (oráculo
   * numbering3, pg2-*).
   */
  forgetFirstUse(): void {
    this.seenNums.clear();
  }

  /** Lista (abstractNum efetivo) de um w:num — espaçamento automático entre itens. */
  listKey(numId: number): string | undefined {
    const a = numId ? this.abstractFor(numId) : null;
    return a ? `a${a.absId}` : undefined;
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

  /**
   * Avança o contador e devolve o marcador do parágrafo (null = sem numeração).
   * Regras medidas no Word (oráculo numbering2):
   *  - o contador é do abstractNum, compartilhado por todos os w:num dele;
   *  - startOverride só age no 1º uso do w:num: os níveis com override do
   *    nível do parágrafo para baixo reiniciam (valem o override); um nível
   *    pai com override ainda sem uso fica com o valor do override (o próximo
   *    parágrafo de OUTRO w:num nele soma 1) e reinicia no 1º parágrafo deste
   *    w:num naquele nível; pai já usado ignora o override;
   *  - o início do nível de um w:num é o seu startOverride (vale nos reinícios);
   *  - nível pai nunca usado (parágrafo pulou níveis) aparece com o início do
   *    nível e passa a contar: o próximo parágrafo nele vem com início + 1.
   */
  next(numId: number, ilvl: number): NumberMarker | null {
    if (!numId) return null;
    const inst = this.numbering.nums[numId];
    if (!inst) return null;
    const a = this.abstractFor(numId);
    if (!a) return null;
    ilvl = Math.max(0, Math.min(8, ilvl));
    const lvl = this.level(numId, ilvl);
    if (!lvl) return null;
    const key = `a${a.absId}`;
    let c = this.counters.get(key);
    if (!c) { c = []; this.counters.set(key, c); }
    const ovStart = (l: number): number | undefined => inst.overrides[l]?.startOverride;
    /** início do nível (definição do nível — o que aparece no pai virtual) */
    const lvlStart = (l: number): number => this.level(numId, l)?.start ?? 0;
    /** início do nível NESTE w:num (o startOverride, se houver) */
    const startOf = (l: number): number => ovStart(l) ?? lvlStart(l);
    if (!this.seenNums.has(numId)) {
      this.seenNums.add(numId);
      for (let l = 0; l < 9; l++) {
        const s = ovStart(l);
        if (s === undefined) continue;
        if (l >= ilvl) c[l] = undefined;
        else if (!c[l]?.real) { c[l] = { v: s, real: false }; this.deferred.add(`${numId}:${l}`); }
      }
    }
    const cur = c[ilvl];
    if (this.deferred.delete(`${numId}:${ilvl}`) || !cur) c[ilvl] = { v: startOf(ilvl), real: true };
    else c[ilvl] = { v: cur.v + 1, real: true };
    // pais nunca usados passam a contar (com o início do nível)
    for (let l = 0; l < ilvl; l++) if (!c[l]) c[l] = { v: startOf(l), real: false };
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
        const n = c![l];
        const v = n?.real ? n.v : lvlStart(l);
        const fmt = lvl.isLgl && l !== ilvl ? 'decimal' : (this.level(numId, l)?.numFmt ?? 'decimal');
        return formatNumber(v, fmt === 'bullet' ? 'decimal' : fmt, this.lang);
      });
    }
    return { text, level: lvl, numId, ilvl, listKey: key };
  }
}
