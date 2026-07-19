/**
 * Parser mínimo de GPOS para kerning de pares (lookup type 2 / PairPos,
 * formatos 1 e 2, incl. extensão type 9). O app de referência moderno (DirectWrite)
 * aplica a feature 'kern' por padrão — sem isso os advances divergem
 * ±0.2-0.6 unidades de 1/600" por par (visto no word-lab).
 *
 * Retorna um mapa de ajuste de xAdvance (unidades da fonte) por par de gids.
 */

export type KernMap = Map<number, number>; // (g1<<16|g2) -> xAdvance units

export function parseGposKern(view: DataView, gposOffset: number): KernMap {
  const kern: KernMap = new Map();
  const u16 = (o: number) => view.getUint16(o);
  const i16 = (o: number) => view.getInt16(o);

  const scriptListOff = gposOffset + u16(gposOffset + 4);
  const featureListOff = gposOffset + u16(gposOffset + 6);
  const lookupListOff = gposOffset + u16(gposOffset + 8);

  // 1. coleta índices de feature 'kern' (qualquer script/lang — união)
  const kernFeatures = new Set<number>();
  const featureCount = u16(featureListOff);
  for (let i = 0; i < featureCount; i++) {
    const rec = featureListOff + 2 + i * 6;
    const tag = String.fromCharCode(
      view.getUint8(rec), view.getUint8(rec + 1), view.getUint8(rec + 2), view.getUint8(rec + 3),
    );
    if (tag === 'kern') kernFeatures.add(i);
  }
  if (kernFeatures.size === 0) return kern;
  void scriptListOff; // união de todas as features kern, sem filtrar script

  // 2. lookups referenciados
  const lookupIdx = new Set<number>();
  for (const fi of kernFeatures) {
    const featOff = featureListOff + u16(featureListOff + 2 + fi * 6 + 4);
    const n = u16(featOff + 2);
    for (let k = 0; k < n; k++) lookupIdx.add(u16(featOff + 4 + k * 2));
  }

  const lookupCount = u16(lookupListOff);
  for (const li of lookupIdx) {
    if (li >= lookupCount) continue;
    const lookupOff = lookupListOff + u16(lookupListOff + 2 + li * 2);
    let type = u16(lookupOff);
    const subCount = u16(lookupOff + 4);
    for (let s = 0; s < subCount; s++) {
      let subOff = lookupOff + u16(lookupOff + 6 + s * 2);
      let t = type;
      if (t === 9) { // extensão
        t = u16(subOff + 2);
        subOff = subOff + view.getUint32(subOff + 4);
      }
      if (t !== 2) continue;
      parsePairPos(subOff);
    }
  }
  return kern;

  function readCoverage(off: number): number[] {
    const fmt = u16(off);
    const out: number[] = [];
    if (fmt === 1) {
      const n = u16(off + 2);
      for (let i = 0; i < n; i++) out.push(u16(off + 4 + i * 2));
    } else if (fmt === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const start = u16(off + 4 + r * 6);
        const end = u16(off + 6 + r * 6);
        for (let g = start; g <= end; g++) out.push(g);
      }
    }
    return out;
  }

  function readClassDef(off: number): Map<number, number> {
    const map = new Map<number, number>();
    const fmt = u16(off);
    if (fmt === 1) {
      const start = u16(off + 2);
      const n = u16(off + 4);
      for (let i = 0; i < n; i++) map.set(start + i, u16(off + 6 + i * 2));
    } else if (fmt === 2) {
      const n = u16(off + 2);
      for (let r = 0; r < n; r++) {
        const s = u16(off + 4 + r * 6);
        const e = u16(off + 6 + r * 6);
        const c = u16(off + 8 + r * 6);
        for (let g = s; g <= e; g++) map.set(g, c);
      }
    }
    return map;
  }

  function valueSize(format: number): number {
    let n = 0;
    for (let b = 0; b < 16; b++) if (format & (1 << b)) n++;
    return n * 2;
  }
  /** lê xAdvance de um ValueRecord no formato dado (0x0004 = XAdvance). */
  function readXAdvance(off: number, format: number): number {
    let p = off;
    if (format & 0x0001) p += 2; // XPlacement
    if (format & 0x0002) p += 2; // YPlacement
    if (format & 0x0004) return i16(p);
    return 0;
  }

  function parsePairPos(off: number): void {
    const fmt = u16(off);
    const coverage = readCoverage(off + u16(off + 2));
    const vf1 = u16(off + 4);
    const vf2 = u16(off + 6);
    const size1 = valueSize(vf1);
    const size2 = valueSize(vf2);
    if (fmt === 1) {
      const pairSetCount = u16(off + 8);
      for (let i = 0; i < Math.min(pairSetCount, coverage.length); i++) {
        const ps = off + u16(off + 10 + i * 2);
        const n = u16(ps);
        const recSize = 2 + size1 + size2;
        for (let r = 0; r < n; r++) {
          const rec = ps + 2 + r * recSize;
          const g2 = u16(rec);
          const adv = readXAdvance(rec + 2, vf1);
          if (adv !== 0) {
            const key = (coverage[i]! << 16) | g2;
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    } else if (fmt === 2) {
      const cd1 = readClassDef(off + u16(off + 8));
      const cd2 = readClassDef(off + u16(off + 10));
      const c1n = u16(off + 12);
      const c2n = u16(off + 14);
      const recSize = size1 + size2;
      // pré-calcula advance por par de classes
      const classAdv: number[][] = [];
      for (let c1 = 0; c1 < c1n; c1++) {
        classAdv.push([]);
        for (let c2 = 0; c2 < c2n; c2++) {
          const rec = off + 16 + (c1 * c2n + c2) * recSize;
          classAdv[c1]!.push(readXAdvance(rec, vf1));
        }
      }
      // classe de cada glifo coberto (classe 0 = default)
      const class1 = new Map<number, number>();
      for (const g of coverage) class1.set(g, cd1.get(g) ?? 0);
      // segunda classe: todos os glifos com classe ≠ 0 + os de classe 0 ficam de fora
      for (const [g1, c1] of class1) {
        for (const [g2, c2] of cd2) {
          const adv = classAdv[c1]?.[c2] ?? 0;
          if (adv !== 0) {
            const key = (g1 << 16) | g2;
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    }
  }
}
