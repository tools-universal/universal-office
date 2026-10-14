/**
 * Decodificador TIFF baseline (o navegador não decodifica TIFF; aparece em
 * decks antigos e em imagens coladas de scanner). Cobre a 1ª imagem (IFD 0):
 * compressão nenhuma, PackBits, LZW (com predictor 2) e Deflate; 1/4/8/16 bits
 * por amostra; tons de cinza (PhotometricInterpretation 0/1), RGB(A), paleta,
 * CMYK; tiras e ladrilhos. Saída: RGBA 8 bits.
 */
import { unzlibSync, inflateSync } from 'fflate';

export function isTiff(b: Uint8Array): boolean {
  return b.length > 8 && ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 42 && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 42));
}

export interface RgbaImage { width: number; height: number; data: Uint8ClampedArray }

export function decodeTiff(b: Uint8Array): RgbaImage | undefined {
  if (!isTiff(b)) return undefined;
  const le = b[0] === 0x49;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o: number): number => dv.getUint16(o, le);
  const u32 = (o: number): number => dv.getUint32(o, le);
  const ifd = u32(4);
  if (ifd + 2 > b.length) return undefined;
  const n = u16(ifd);
  const tags = new Map<number, number[]>();
  const SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > b.length) break;
    const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
    const sz = (SIZE[type] ?? 1) * count;
    const off = sz <= 4 ? e + 8 : u32(e + 8);
    const vals: number[] = [];
    for (let k = 0; k < Math.min(count, 1 << 20); k++) {
      const o = off + k * (SIZE[type] ?? 1);
      if (o + (SIZE[type] ?? 1) > b.length) break;
      vals.push(type === 3 ? u16(o) : type === 4 ? u32(o) : type === 1 || type === 7 ? b[o]! : type === 5 ? u32(o) / (u32(o + 4) || 1) : u32(o));
    }
    tags.set(tag, vals);
  }
  const t = (k: number, d?: number): number => tags.get(k)?.[0] ?? d ?? 0;
  const w = t(256), h = t(257);
  if (!(w > 0 && h > 0) || w * h > 50_000_000) return undefined;
  const bps = tags.get(258)?.[0] ?? 1;
  const comp = t(259, 1), photo = t(262, 1), spp = t(277, 1), pred = t(317, 1), planar = t(284, 1);
  if (planar !== 1 && spp > 1) return undefined;
  const map = tags.get(320);
  const extra = tags.get(338)?.[0];
  // blocos: tiras ou ladrilhos
  const tiled = tags.has(322);
  const bw = tiled ? t(322) : w, bh = tiled ? t(323) : t(278, h);
  const offs = tags.get(tiled ? 324 : 273) ?? [], cnts = tags.get(tiled ? 325 : 279) ?? [];
  const across = Math.ceil(w / bw);
  const rowBytes = Math.ceil((bw * spp * bps) / 8);
  const out = new Uint8ClampedArray(w * h * 4);
  const decompress = (src: Uint8Array, expected: number): Uint8Array | undefined => {
    try {
      if (comp === 1) return src;
      if (comp === 32773) return packBits(src, expected);
      if (comp === 5) return lzw(src, expected);
      if (comp === 8 || comp === 32946) { try { return unzlibSync(src); } catch { return inflateSync(src); } }
    } catch { /* bloco corrompido */ }
    return undefined;
  };
  for (let bi = 0; bi < offs.length; bi++) {
    const o = offs[bi]!, c = cnts[bi] ?? (b.length - o);
    if (o >= b.length) continue;
    const raw = decompress(b.subarray(o, Math.min(b.length, o + c)), rowBytes * bh);
    if (!raw) continue;
    const bx0 = tiled ? (bi % across) * bw : 0, by0 = tiled ? Math.floor(bi / across) * bh : bi * bh;
    for (let y = 0; y < bh; y++) {
      const py = by0 + y;
      if (py >= h) break;
      const row = raw.subarray(y * rowBytes, (y + 1) * rowBytes);
      // predictor horizontal (8 bits)
      if (pred === 2 && bps === 8) for (let i = spp; i < row.length; i++) row[i] = (row[i]! + row[i - spp]!) & 255;
      for (let x = 0; x < bw; x++) {
        const px = bx0 + x;
        if (px >= w) break;
        const sample = (s: number): number => {
          const bit = (x * spp + s) * bps;
          if (bps === 8) return row[bit >> 3] ?? 0;
          if (bps === 16) return row[(bit >> 3) + (le ? 1 : 0)] ?? 0;
          const v = ((row[bit >> 3] ?? 0) >> (8 - bps - (bit & 7))) & ((1 << bps) - 1);
          return photo === 3 ? v : Math.round((v * 255) / ((1 << bps) - 1));
        };
        const d = (py * w + px) * 4;
        let r: number, g: number, bl: number, a = 255;
        if (photo === 0 || photo === 1) {
          let v = sample(0); if (photo === 0) v = 255 - v;
          r = g = bl = v;
          if (spp > 1 && extra !== undefined) a = sample(1);
        } else if (photo === 3 && map) {
          const idx = sample(0), nc = map.length / 3;
          r = (map[idx] ?? 0) >> 8; g = (map[nc + idx] ?? 0) >> 8; bl = (map[2 * nc + idx] ?? 0) >> 8;
        } else if (photo === 5) {
          const C = sample(0), M = sample(1), Y = sample(2), K = sample(3);
          r = 255 - Math.min(255, C + K); g = 255 - Math.min(255, M + K); bl = 255 - Math.min(255, Y + K);
        } else {
          r = sample(0); g = sample(1); bl = sample(2);
          if (spp > 3) a = sample(3);
        }
        out[d] = r; out[d + 1] = g; out[d + 2] = bl; out[d + 3] = a;
      }
    }
  }
  return { width: w, height: h, data: out };
}

function packBits(src: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let i = 0, o = 0;
  while (i < src.length && o < expected) {
    const n = (src[i++]! << 24) >> 24;
    if (n >= 0) { for (let k = 0; k <= n && o < expected; k++) out[o++] = src[i++] ?? 0; }
    else if (n !== -128) { const v = src[i++] ?? 0; for (let k = 0; k < 1 - n && o < expected; k++) out[o++] = v; }
  }
  return out;
}

/** LZW do TIFF (MSB primeiro, códigos 9–12 bits, "early change"). */
function lzw(src: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(Math.max(expected, 1));
  let o = 0, bitPos = 0, width = 9;
  let dict: Uint8Array[] = [];
  const reset = (): void => { dict = []; for (let i = 0; i < 256; i++) dict.push(new Uint8Array([i])); dict.push(new Uint8Array(0), new Uint8Array(0)); width = 9; };
  reset();
  let prev: Uint8Array | undefined;
  const read = (): number => {
    let v = 0;
    for (let k = 0; k < width; k++) {
      const byte = src[(bitPos + k) >> 3];
      if (byte === undefined) return 257;
      v = (v << 1) | ((byte >> (7 - ((bitPos + k) & 7))) & 1);
    }
    bitPos += width;
    return v;
  };
  const emit = (s: Uint8Array): void => { for (const c of s) { if (o >= out.length) return; out[o++] = c; } };
  for (;;) {
    const code = read();
    if (code === 257 || o >= expected) break;
    if (code === 256) { reset(); prev = undefined; continue; }
    let entry: Uint8Array;
    if (code < dict.length) entry = dict[code]!;
    else if (prev) { entry = new Uint8Array(prev.length + 1); entry.set(prev); entry[prev.length] = prev[0]!; }
    else break;
    emit(entry);
    if (prev) { const ne = new Uint8Array(prev.length + 1); ne.set(prev); ne[prev.length] = entry[0]!; dict.push(ne); }
    prev = entry;
    if (dict.length + 1 >= 1 << width && width < 12) width++;
  }
  return out;
}
