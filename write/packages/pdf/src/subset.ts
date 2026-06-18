/**
 * Subset de fonte TrueType mantendo os glyph ids (CID = GID, como usamos em
 * Identity-H): preserva apenas os glifos usados (e os componentes de glifos
 * compostos), esvaziando os demais, e descarta tabelas de layout pesadas
 * (GPOS/GSUB/GDEF/kern…). `numGlyphs`, `hmtx` e `cmap` ficam intactos, então os
 * índices continuam válidos sem remapear. Reduz Calibri/Aptos de ~1MB para
 * dezenas de KB. Em caso de fonte sem glyf (ex.: CFF/OTF) devolve os bytes
 * originais.
 */

// tabelas mínimas para um programa TrueType embutível renderizar
const KEEP = new Set(['head', 'hhea', 'maxp', 'hmtx', 'cmap', 'loca', 'glyf', 'OS/2', 'post', 'cvt ', 'fpgm', 'prep', 'gasp', 'name']);

interface Tbl { tag: string; offset: number; length: number; }

export function subsetTrueType(bytes: Uint8Array, usedGids: Iterable<number>): Uint8Array {
  try {
    return doSubset(bytes, usedGids);
  } catch {
    return bytes; // qualquer imprevisto: melhor a fonte inteira do que quebrada
  }
}

function doSubset(bytes: Uint8Array, usedGids: Iterable<number>): Uint8Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = v.getUint32(0);
  const numTables = v.getUint16(4);
  const dir = new Map<string, Tbl>();
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(bytes[p]!, bytes[p + 1]!, bytes[p + 2]!, bytes[p + 3]!);
    dir.set(tag, { tag, offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
  }
  const head = dir.get('head'), maxp = dir.get('maxp'), loca = dir.get('loca'), glyf = dir.get('glyf');
  if (!head || !maxp || !loca || !glyf) return bytes; // sem outlines TrueType

  const numGlyphs = v.getUint16(maxp.offset + 4);
  const longLoca = v.getUint16(head.offset + 50) === 1;
  const readLoca = (i: number): number => (longLoca ? v.getUint32(loca.offset + i * 4) : v.getUint16(loca.offset + i * 2) * 2);
  const glyphOff: number[] = [];
  for (let i = 0; i <= numGlyphs; i++) glyphOff.push(readLoca(i));

  // glifos a manter: usados + 0 (.notdef) + componentes (compostos, recursivo)
  const keep = new Set<number>([0]);
  for (const g of usedGids) if (g >= 0 && g < numGlyphs) keep.add(g);
  const work = [...keep];
  while (work.length) {
    const g = work.pop()!;
    const s = glyf.offset + glyphOff[g]!, e = glyf.offset + glyphOff[g + 1]!;
    if (e <= s) continue;
    if (v.getInt16(s) >= 0) continue; // simples: sem componentes
    let p = s + 10;
    for (;;) {
      const flags = v.getUint16(p);
      const comp = v.getUint16(p + 2);
      p += 4;
      if (!keep.has(comp)) { keep.add(comp); work.push(comp); }
      p += flags & 0x0001 ? 4 : 2;            // ARGS são words?
      if (flags & 0x0008) p += 2;             // WE_HAVE_A_SCALE
      else if (flags & 0x0040) p += 4;        // X_AND_Y_SCALE
      else if (flags & 0x0080) p += 8;        // 2x2
      if (!(flags & 0x0020)) break;           // MORE_COMPONENTS
    }
  }

  // novo glyf (só glifos mantidos) + novo loca (long), preservando os índices
  const glyfParts: Uint8Array[] = [];
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const locaView = new DataView(newLoca.buffer);
  let acc = 0;
  for (let g = 0; g < numGlyphs; g++) {
    locaView.setUint32(g * 4, acc);
    if (keep.has(g)) {
      const s = glyf.offset + glyphOff[g]!, e = glyf.offset + glyphOff[g + 1]!;
      let len = e - s;
      if (len > 0) {
        const padded = (len + 1) & ~1; // alinhamento par
        const part = new Uint8Array(padded);
        part.set(bytes.subarray(s, e));
        glyfParts.push(part);
        acc += padded;
      }
    }
  }
  locaView.setUint32(numGlyphs * 4, acc);
  const newGlyf = concat(glyfParts);

  // head com loca longo e checkSumAdjustment zerado (recalculado ao final)
  const newHead = bytes.slice(head.offset, head.offset + head.length);
  new DataView(newHead.buffer).setUint16(50, 1); // indexToLocFormat = long
  new DataView(newHead.buffer).setUint32(8, 0);   // checkSumAdjustment = 0

  const out: { tag: string; data: Uint8Array }[] = [];
  for (const [tag, t] of dir) {
    if (!KEEP.has(tag)) continue;
    if (tag === 'glyf') out.push({ tag, data: newGlyf });
    else if (tag === 'loca') out.push({ tag, data: newLoca });
    else if (tag === 'head') out.push({ tag, data: newHead });
    else out.push({ tag, data: bytes.slice(t.offset, t.offset + t.length) });
  }
  return buildSfnt(sfntVersion, out);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function checksum(buf: Uint8Array, off: number, len: number): number {
  const dv = new DataView(buf.buffer, buf.byteOffset);
  let sum = 0;
  const end = off + ((len + 3) & ~3);
  for (let i = off; i < end; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
  return sum >>> 0;
}

function buildSfnt(sfntVersion: number, tables: { tag: string; data: Uint8Array }[]): Uint8Array {
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const num = tables.length;
  const headerSize = 12 + num * 16;
  let offset = headerSize;
  const layout = tables.map((t) => {
    const o = offset;
    offset += (t.data.length + 3) & ~3;
    return { ...t, offset: o };
  });
  const out = new Uint8Array(offset);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, sfntVersion);
  dv.setUint16(4, num);
  const maxPow = Math.floor(Math.log2(num));
  const searchRange = 2 ** maxPow * 16;
  dv.setUint16(6, searchRange);
  dv.setUint16(8, maxPow);
  dv.setUint16(10, num * 16 - searchRange);
  let p = 12;
  for (const t of layout) {
    out.set(t.data, t.offset);
    for (let i = 0; i < 4; i++) out[p + i] = t.tag.charCodeAt(i) || 0x20;
    dv.setUint32(p + 4, checksum(out, t.offset, t.data.length));
    dv.setUint32(p + 8, t.offset);
    dv.setUint32(p + 12, t.data.length);
    p += 16;
  }
  const headEntry = layout.find((t) => t.tag === 'head');
  if (headEntry) {
    const fileCs = checksum(out, 0, out.length);
    dv.setUint32(headEntry.offset + 8, (0xb1b0afba - fileCs) >>> 0);
  }
  return out;
}
