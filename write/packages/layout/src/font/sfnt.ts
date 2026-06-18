/**
 * Parser mínimo de fontes SFNT (TTF/OTF) — só o necessário para layout:
 *   head  → unitsPerEm
 *   hhea  → ascender/descender/lineGap, numberOfHMetrics
 *   hmtx  → advance width por glifo
 *   cmap  → char → glyph id (formats 4 e 12)
 *   OS/2  → usWinAscent/usWinDescent, sTypoAscender/Descender/LineGap
 *
 * O Word calcula altura de linha a partir dessas tabelas; qual fórmula
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
}

import { parseGposKern, type KernMap } from './gpos.js';

export class SfntFont {
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
    };

    this.parseCmap();
    const gpos = this.tables.get('GPOS');
    if (gpos) {
      try { this.kernMap = parseGposKern(this.view, gpos.offset); }
      catch { this.kernMap = new Map(); }
    } else this.kernMap = new Map();
  }

  private kernMap: KernMap;

  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O Word (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint: number, codePoint: number, sizePt: number): number {
    const g1 = this.glyphId(prevCodePoint);
    const g2 = this.glyphId(codePoint);
    const units = this.kernMap.get((g1 << 16) | g2);
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
      // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode
      const score =
        platform === 3 && encoding === 10 ? 3 :
        platform === 3 && encoding === 1 ? 2 :
        platform === 0 ? 1 : 0;
      if (score > bestScore) { bestScore = score; best = cmap.offset + offset; }
    }
    if (best < 0) throw new Error('cmap sem subtabela utilizável');

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

  glyphId(codePoint: number): number {
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

  /** Tabela empírica de advances do Word (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  private advanceTable: Record<string, Record<string, number>> | null = null;

  setAdvanceTable(table: Record<string, Record<string, number>>): void {
    this.advanceTable = table;
  }

  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do Word; fallback: escala linear com o em
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
