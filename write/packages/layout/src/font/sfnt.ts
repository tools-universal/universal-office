/**
 * Parser mínimo de fontes SFNT (TTF/OTF) — só o necessário para layout:
 *   head  → unitsPerEm
 *   hhea  → ascender/descender/lineGap, numberOfHMetrics
 *   hmtx  → advance width por glifo
 *   cmap  → char → glyph id (formats 4 e 12)
 *   OS/2  → usWinAscent/usWinDescent, sTypoAscender/Descender/LineGap
 *
 * O app de referência calcula altura de linha a partir dessas tabelas; qual fórmula
 * exata ele usa é validado empiricamente contra o oráculo (word-lab).
 */

export interface FontMetrics {
  unitsPerEm: number;
  /** hhea */
  ascender: number;
  descender: number; // negativo
  lineGap: number;
  /** OS/2 */
  usWinAscent: number;
  usWinDescent: number; // positivo
  sTypoAscender: number;
  sTypoDescender: number;
  sTypoLineGap: number;
  /** OS/2 fsSelection (bit 7 = USE_TYPO_METRICS). */
  fsSelection: number;
  /** post: posição (negativa = abaixo da baseline) e espessura do sublinhado. */
  underlinePosition: number;
  underlineThickness: number;
}

import { parseGposKern, kernKey, type KernMap, type KernClass0 } from './gpos.js';
import type { LayoutFont } from './layout-font.js';

export class SfntFont implements LayoutFont {
  private view: DataView;
  private tables = new Map<string, { offset: number; length: number }>();
  readonly metrics: FontMetrics;
  private numGlyphs: number;
  private numberOfHMetrics: number;
  private hmtxOffset: number;
  private cmapRanges: { start: number; end: number; mapper: (c: number) => number }[] = [];
  private advanceCache = new Map<number, number>();

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;

    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      this.tables.set(tag, { offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
    }

    const head = this.req('head');
    const hhea = this.req('hhea');
    const maxp = this.req('maxp');
    const os2 = this.req('OS/2');
    this.numGlyphs = v.getUint16(maxp.offset + 4);
    this.numberOfHMetrics = v.getUint16(hhea.offset + 34);
    this.hmtxOffset = this.req('hmtx').offset;

    this.metrics = {
      unitsPerEm: v.getUint16(head.offset + 18),
      ascender: v.getInt16(hhea.offset + 4),
      descender: v.getInt16(hhea.offset + 6),
      lineGap: v.getInt16(hhea.offset + 8),
      sTypoAscender: v.getInt16(os2.offset + 68),
      sTypoDescender: v.getInt16(os2.offset + 70),
      sTypoLineGap: v.getInt16(os2.offset + 72),
      usWinAscent: v.getUint16(os2.offset + 74),
      usWinDescent: v.getUint16(os2.offset + 76),
      fsSelection: v.getUint16(os2.offset + 62),
      underlinePosition: 0,
      underlineThickness: 0,
    };
    const post = this.tables.get('post');
    if (post && post.length >= 12) {
      this.metrics.underlinePosition = v.getInt16(post.offset + 8);
      this.metrics.underlineThickness = v.getInt16(post.offset + 10);
    }

    this.parseCmap();
    const gpos = this.tables.get('GPOS');
    if (gpos) {
      try { this.kernMap = parseGposKern(this.view, gpos.offset, this.kernClass0); }
      catch { this.kernMap = new Map(); this.kernClass0.clear(); }
    } else this.kernMap = new Map();
    // sem pares no GPOS: tabela 'kern' legada (formato 0) — Tahoma, Arial Narrow…
    const kernT = this.tables.get('kern');
    if (this.kernMap.size === 0 && kernT) {
      try { this.parseLegacyKern(kernT.offset); } catch { /* tabela inválida: sem kerning */ }
    }
  }

  private kernMap: KernMap;
  /** PairPos formato 2: ajuste contra a classe 0 do 2º glifo, por 1º glifo */
  private kernClass0: KernClass0 = new Map();

  /** Tabela 'kern' (versão 0, subtabelas formato 0 horizontais). */
  private parseLegacyKern(off: number): void {
    const v = this.view;
    if (v.getUint16(off) !== 0) return;
    const n = v.getUint16(off + 2);
    let p = off + 4;
    for (let t = 0; t < n; t++) {
      const length = v.getUint16(p + 2);
      const coverage = v.getUint16(p + 4);
      const format = coverage >> 8;
      const horizontal = (coverage & 1) !== 0;
      const cross = (coverage & 4) !== 0;
      if (format === 0 && horizontal && !cross) {
        const pairs = v.getUint16(p + 6);
        for (let i = 0; i < pairs; i++) {
          const r = p + 14 + i * 6;
          const key = kernKey(v.getUint16(r), v.getUint16(r + 2));
          if (!this.kernMap.has(key)) this.kernMap.set(key, v.getInt16(r + 4));
        }
      }
      p += length;
    }
  }

  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O app de referência (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint: number, codePoint: number, sizePt: number): number {
    const g1 = this.glyphId(prevCodePoint);
    const g2 = this.glyphId(codePoint);
    // as tabelas só têm ids de 16 bits: fora disso a chave colidiria com outro par
    if (g1 > 0xffff || g2 > 0xffff) return 0;
    let units = this.kernMap.get(kernKey(g1, g2));
    if (units === undefined) {
      const c0 = this.kernClass0.get(g1);
      if (c0 && !c0.cd2.has(g2)) units = c0.adv;
    }
    if (!units) return 0;
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (units * deviceEmPt * 20) / this.metrics.unitsPerEm;
  }

  private req(tag: string) {
    const t = this.tables.get(tag);
    if (!t) throw new Error(`Tabela ${tag} ausente`);
    return t;
  }

  private parseCmap(): void {
    const v = this.view;
    const cmap = this.req('cmap');
    const n = v.getUint16(cmap.offset + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = cmap.offset + 4 + i * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode >
      // Windows Symbol (3,0: Wingdings, Symbol — códigos U+F0xx) > Mac
      const score =
        platform === 3 && encoding === 10 ? 4 :
        platform === 3 && encoding === 1 ? 3 :
        platform === 0 ? 2 :
        platform === 3 && encoding === 0 ? 1 : 0;
      if (score > bestScore) { bestScore = score; best = cmap.offset + offset; }
    }
    if (best < 0) throw new Error('cmap sem subtabela utilizável');
    this.symbolCmap = bestScore === 1;

    const format = v.getUint16(best);
    if (format === 4) {
      const segCount = v.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = v.getUint16(endP + s * 2);
        const start = v.getUint16(startP + s * 2);
        const delta = v.getInt16(deltaP + s * 2);
        const rangeOffset = v.getUint16(rangeP + s * 2);
        const idP = rangeP + s * 2;
        this.cmapRanges.push({
          start, end,
          mapper: rangeOffset === 0
            ? (c) => (c + delta) & 0xffff
            : (c) => {
                const gp = idP + rangeOffset + (c - start) * 2;
                const g = v.getUint16(gp);
                return g === 0 ? 0 : (g + delta) & 0xffff;
              },
        });
      }
    } else if (format === 12) {
      const nGroups = v.getUint32(best + 12);
      for (let g = 0; g < nGroups; g++) {
        const p = best + 16 + g * 12;
        const start = v.getUint32(p);
        const end = v.getUint32(p + 4);
        const startGlyph = v.getUint32(p + 8);
        this.cmapRanges.push({ start, end, mapper: (c) => startGlyph + (c - start) });
      }
    } else {
      throw new Error(`cmap format ${format} não suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }

  /** cmap Windows Symbol (3,0): os glifos ficam em U+F000+código */
  private symbolCmap = false;

  glyphId(codePoint: number): number {
    const g = this.lookupGlyph(codePoint);
    // fonte de símbolo: o código de 8 bits também vale (U+F000 + código)
    if (g === 0 && this.symbolCmap && codePoint < 0x100) return this.lookupGlyph(codePoint + 0xf000);
    return g;
  }

  private lookupGlyph(codePoint: number): number {
    // busca binária nos ranges
    let lo = 0, hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = this.cmapRanges[mid]!;
      if (codePoint < r.start) hi = mid - 1;
      else if (codePoint > r.end) lo = mid + 1;
      else return r.mapper(codePoint);
    }
    return 0;
  }

  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId: number): number {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== undefined) return cached;
    const i = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }

  /** Tabela empírica de advances do app de referência (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  private advanceTable: Record<string, Record<string, number>> | null = null;

  setAdvanceTable(table: Record<string, Record<string, number>>): void {
    this.advanceTable = table;
  }

  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do app de referência; fallback: escala linear com o em
   *  arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt). */
  advanceTwips(codePoint: number, sizePt: number): number {
    if (this.advanceTable) {
      const t = this.advanceTable[String(sizePt)]?.[String.fromCodePoint(codePoint)];
      if (t !== undefined) return t;
    }
    const units = this.advanceWidth(this.glyphId(codePoint));
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (units * deviceEmPt * 20) / this.metrics.unitsPerEm;
  }
}
