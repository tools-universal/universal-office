/**
 * Parser mínimo de fontes TrueType (SFNT) — só o que o @universal-office/pdf pede via
 * a interface estrutural `FontProgram`: unitsPerEm, cmap (formats 4 e 12),
 * hmtx (advance por glifo), bbox/ascender/descender/italicAngle p/ o
 * FontDescriptor. Sem GPOS/kerning. (Mesma implementação do
 * @universal-office/sheet-export — copiada para manter os pacotes independentes.)
 */

interface CmapRange {
  start: number;
  end: number;
  mapper: (c: number) => number;
}

export class TtfProgram {
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number; // negativo
  readonly fontBBox: [number, number, number, number];
  readonly italicAngle: number;

  private view: DataView;
  private numberOfHMetrics: number;
  private hmtxOffset: number;
  private cmapRanges: CmapRange[] = [];
  private advanceCache = new Map<number, number>();

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const tables = new Map<string, number>();
    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      tables.set(tag, v.getUint32(p + 8));
    }
    const req = (tag: string): number => {
      const off = tables.get(tag);
      if (off === undefined) throw new Error(`Fonte TTF sem a tabela ${tag}`);
      return off;
    };

    const head = req('head');
    const hhea = req('hhea');
    this.unitsPerEm = v.getUint16(head + 18);
    this.fontBBox = [v.getInt16(head + 36), v.getInt16(head + 38), v.getInt16(head + 40), v.getInt16(head + 42)];
    this.ascender = v.getInt16(hhea + 4);
    this.descender = v.getInt16(hhea + 6);
    this.numberOfHMetrics = v.getUint16(hhea + 34);
    this.hmtxOffset = req('hmtx');
    const post = tables.get('post');
    this.italicAngle = post !== undefined ? v.getInt32(post + 4) / 65536 : 0;

    this.parseCmap(req('cmap'));
  }

  private parseCmap(cmap: number): void {
    const v = this.view;
    const n = v.getUint16(cmap + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = cmap + 4 + i * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode
      const score =
        platform === 3 && encoding === 10 ? 3 :
        platform === 3 && encoding === 1 ? 2 :
        platform === 0 ? 1 : 0;
      if (score > bestScore) { bestScore = score; best = cmap + offset; }
    }
    if (best < 0) throw new Error('Fonte TTF: cmap sem subtabela utilizável');

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
                const g = v.getUint16(idP + rangeOffset + (c - start) * 2);
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
      throw new Error(`Fonte TTF: cmap format ${format} não suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }

  /** glyph id de um code point (0 = .notdef). */
  glyphId(codePoint: number): number {
    let lo = 0;
    let hi = this.cmapRanges.length - 1;
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
}
