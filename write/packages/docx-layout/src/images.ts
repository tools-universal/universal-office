import { unzlibSync } from 'fflate';
import type { ImageEffects } from '@universal-office/docx-core';

/**
 * Decodificação de imagens SEM DOM (Node, worker, .NET port): PNG (todas as
 * profundidades/tipos, Adam7), GIF (1º quadro), BMP; JPEG só tem o cabeçalho
 * lido (o PDF embute o JPEG direto via DCTDecode).
 */

export interface Rgba {
  width: number;
  height: number;
  /** RGBA 8 bits, linha a linha */
  data: Uint8Array;
}

export interface JpegInfo {
  width: number;
  height: number;
  components: number;
  /** marcador APP14 da Adobe (CMYK invertido) */
  adobe: boolean;
}

export function jpegInfo(b: Uint8Array): JpegInfo | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  let adobe = false;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1]!;
    // 0xFF repetido = preenchimento antes do marcador
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (m === 0xee && b[i + 4] === 0x41 && b[i + 5] === 0x64) adobe = true; // "Adobe"
    if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (i + 9 >= b.length) return null; // SOF truncado
      const height = (b[i + 5]! << 8) | b[i + 6]!;
      const width = (b[i + 7]! << 8) | b[i + 8]!;
      const components = b[i + 9]!;
      return { width, height, components, adobe };
    }
    i += 2 + len;
  }
  return null;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function decodePng(b: Uint8Array): Rgba | null {
  for (let k = 0; k < 8; k++) if (b[k] !== PNG_SIG[k]) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 8;
  let width = 0, height = 0, depth = 8, ctype = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= b.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4]!, b[pos + 5]!, b[pos + 6]!, b[pos + 7]!);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = dv.getUint32(pos + 8); height = dv.getUint32(pos + 12);
      depth = b[pos + 16]!; ctype = b[pos + 17]!; interlace = b[pos + 20]!;
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!width || !height) return null;
  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  let o = 0;
  for (const c of idat) { z.set(c, o); o += c.length; }
  let raw: Uint8Array;
  try { raw = unzlibSync(z); } catch { return null; }
  const channels = ctype === 0 ? 1 : ctype === 2 ? 3 : ctype === 3 ? 1 : ctype === 4 ? 2 : 4;
  const bitsPP = channels * depth;
  const bpp = Math.max(1, bitsPP >> 3);
  const out = new Uint8Array(width * height * 4);

  const pass = (rp: number, w: number, h: number, put: (x: number, y: number, rgba: [number, number, number, number]) => void): number => {
    if (w === 0 || h === 0) return rp;
    const stride = Math.ceil((w * bitsPP) / 8);
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const ft = raw[rp++]!;
      const line = raw.slice(rp, rp + stride);
      rp += stride;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp]! : 0;
        const up = prev[i]!;
        const c = i >= bpp ? prev[i - bpp]! : 0;
        let v = line[i]!;
        if (ft === 1) v += a;
        else if (ft === 2) v += up;
        else if (ft === 3) v += (a + up) >> 1;
        else if (ft === 4) {
          const pp = a + up - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
        }
        line[i] = v & 0xff;
      }
      for (let x = 0; x < w; x++) {
        /** valor cru da amostra (16 bits inteiros; < 8 bits sem escala) — chave do tRNS */
        const rawSample = (ch: number): number => {
          if (depth === 8) return line[x * channels + ch]!;
          if (depth === 16) { const i = (x * channels + ch) * 2; return (line[i]! << 8) | line[i + 1]!; }
          const bit = (x * channels + ch) * depth;
          const byte = line[bit >> 3]!;
          const shift = 8 - depth - (bit & 7);
          return (byte >> shift) & ((1 << depth) - 1);
        };
        const sample = (ch: number): number => {
          if (depth === 8) return line[x * channels + ch]!;
          if (depth === 16) return line[(x * channels + ch) * 2]!;
          const v = rawSample(ch);
          return ctype === 3 ? v : Math.round((v * 255) / ((1 << depth) - 1));
        };
        const key = (k: number) => (trns![k * 2]! << 8) | trns![k * 2 + 1]!;
        let px: [number, number, number, number];
        if (ctype === 0) {
          const g = sample(0);
          const transparent = !!trns && trns.length >= 2 && key(0) === rawSample(0);
          px = [g, g, g, transparent ? 0 : 255];
        } else if (ctype === 2) {
          const transparent = !!trns && trns.length >= 6 && key(0) === rawSample(0) && key(1) === rawSample(1) && key(2) === rawSample(2);
          px = [sample(0), sample(1), sample(2), transparent ? 0 : 255];
        }
        else if (ctype === 3) {
          const i = sample(0);
          px = palette ? [palette[i * 3] ?? 0, palette[i * 3 + 1] ?? 0, palette[i * 3 + 2] ?? 0, trns && i < trns.length ? trns[i]! : 255] : [0, 0, 0, 255];
        } else if (ctype === 4) { const g = sample(0); px = [g, g, g, sample(1)]; }
        else px = [sample(0), sample(1), sample(2), sample(3)];
        put(x, y, px);
      }
      prev = line;
    }
    return rp;
  };
  const putAt = (ox: number, oy: number, dx: number, dy: number) => (x: number, y: number, px: [number, number, number, number]) => {
    const X = ox + x * dx, Y = oy + y * dy;
    const k = (Y * width + X) * 4;
    out[k] = px[0]; out[k + 1] = px[1]; out[k + 2] = px[2]; out[k + 3] = px[3];
  };
  if (!interlace) pass(0, width, height, putAt(0, 0, 1, 1));
  else {
    const passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] as const;
    let rp = 0;
    for (const [ox, oy, dx, dy] of passes) {
      const w = Math.ceil((width - ox) / dx), h = Math.ceil((height - oy) / dy);
      rp = pass(rp, w > 0 ? w : 0, h > 0 ? h : 0, putAt(ox, oy, dx, dy));
    }
  }
  return { width, height, data: out };
}

export function decodeGif(b: Uint8Array): Rgba | null {
  if (b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) return null;
  const width = b[6]! | (b[7]! << 8), height = b[8]! | (b[9]! << 8);
  const flags = b[10]!;
  let pos = 13;
  let gct: Uint8Array | null = null;
  if (flags & 0x80) { const n = 3 * (1 << ((flags & 7) + 1)); gct = b.subarray(pos, pos + n); pos += n; }
  let transparent = -1;
  const out = new Uint8Array(width * height * 4);
  while (pos < b.length) {
    const t = b[pos++]!;
    if (t === 0x21) {
      const label = b[pos++]!;
      if (label === 0xf9 && (b[pos + 1]! & 1)) transparent = b[pos + 4]!;
      while (pos < b.length && b[pos]) pos += b[pos]! + 1;
      pos++;
    } else if (t === 0x2c) {
      const ix = b[pos]! | (b[pos + 1]! << 8), iy = b[pos + 2]! | (b[pos + 3]! << 8);
      const iw = b[pos + 4]! | (b[pos + 5]! << 8), ih = b[pos + 6]! | (b[pos + 7]! << 8);
      const lf = b[pos + 8]!;
      pos += 9;
      let ct = gct;
      if (lf & 0x80) { const n = 3 * (1 << ((lf & 7) + 1)); ct = b.subarray(pos, pos + n); pos += n; }
      const interlaced = !!(lf & 0x40);
      const minCode = b[pos++]!;
      // tamanho mínimo de código fora de 1..11: arquivo inválido (o dicionário teria 2^n entradas)
      if (!(minCode >= 1 && minCode <= 11)) return null;
      const chunks: number[] = [];
      while (pos < b.length && b[pos]) { const n = b[pos]!; for (let k = 1; k <= n; k++) chunks.push(b[pos + k]!); pos += n + 1; }
      pos++;
      const idx = lzw(Uint8Array.from(chunks), minCode, iw * ih);
      const rows: number[] = [];
      if (interlaced) { for (const [s, st] of [[0, 8], [4, 8], [2, 4], [1, 2]] as const) for (let r = s; r < ih; r += st) rows.push(r); }
      else for (let r = 0; r < ih; r++) rows.push(r);
      for (let r = 0; r < ih; r++) {
        const yy = iy + rows[r]!;
        if (yy >= height) continue;
        for (let x = 0; x < iw; x++) {
          if (ix + x >= width) break; // quadro maior que a tela: recorta
          const ci = idx[r * iw + x] ?? 0;
          const k = (yy * width + ix + x) * 4;
          if (ci === transparent || !ct) { out[k + 3] = 0; continue; }
          out[k] = ct[ci * 3]!; out[k + 1] = ct[ci * 3 + 1]!; out[k + 2] = ct[ci * 3 + 2]!; out[k + 3] = 255;
        }
      }
      return { width, height, data: out };
    } else break;
  }
  return null;
}

function lzw(data: Uint8Array, minCode: number, n: number): Uint8Array {
  const out = new Uint8Array(n);
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1;
  let dict: number[][] = [];
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[eoi] = []; size = minCode + 1; };
  reset();
  let bit = 0, o = 0;
  let prev: number[] | null = null;
  while (o < n) {
    let code = 0;
    for (let k = 0; k < size; k++) { if ((data[(bit + k) >> 3]! >> ((bit + k) & 7)) & 1) code |= 1 << k; }
    bit += size;
    if (bit > data.length * 8) break;
    if (code === clear) { reset(); prev = null; continue; }
    if (code === eoi) break;
    let entry: number[];
    if (dict[code]) entry = dict[code]!;
    else if (prev) entry = [...prev, prev[0]!];
    else break;
    for (const v of entry) { if (o < n) out[o++] = v; }
    if (prev) dict.push([...prev, entry[0]!]);
    prev = entry;
    if (dict.length >= (1 << size) && size < 12) size++;
  }
  return out;
}

export function decodeBmp(b: Uint8Array): Rgba | null {
  if (b[0] !== 0x42 || b[1] !== 0x4d) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true);
  const width = dv.getInt32(18, true);
  let height = dv.getInt32(22, true);
  const bpp = dv.getUint16(28, true);
  const comp = dv.getUint32(30, true);
  if (comp !== 0 && comp !== 3) return null;
  if (width <= 0 || height === 0) return null;
  const topDown = height < 0;
  height = Math.abs(height);
  const stride = Math.ceil((width * bpp) / 32) * 4;
  const hdr = dv.getUint32(14, true);
  const palOff = 14 + hdr;
  // 16/32 bpp: canais por máscara (BITFIELDS: depois do cabeçalho de 40 bytes ou
  // dentro do V4/V5; sem BITFIELDS: 5-5-5 / 8-8-8, sem alfa)
  let masks: [number, number, number, number] = bpp === 16 ? [0x7c00, 0x3e0, 0x1f, 0] : [0xff0000, 0xff00, 0xff, 0];
  if (comp === 3 && (bpp === 16 || bpp === 32)) masks = [dv.getUint32(54, true), dv.getUint32(58, true), dv.getUint32(62, true), hdr >= 56 ? dv.getUint32(66, true) : 0];
  const chan = (v: number, m: number, dflt: number): number => {
    if (!m) return dflt;
    let shift = 0;
    while (!((m >>> shift) & 1)) shift++;
    const bits = Math.clz32(0) - Math.clz32(m >>> shift);
    return Math.round((((v & m) >>> shift) * 255) / (2 ** bits - 1));
  };
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = off + (topDown ? y : height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      if (bpp === 24) {
        const p = row + x * 3;
        out[k] = b[p + 2]!; out[k + 1] = b[p + 1]!; out[k + 2] = b[p]!; out[k + 3] = 255;
      } else if (bpp === 16 || bpp === 32) {
        const p = row + x * (bpp / 8);
        const v = bpp === 16 ? (b[p]! | (b[p + 1]! << 8)) : (b[p]! | (b[p + 1]! << 8) | (b[p + 2]! << 16) | (b[p + 3]! << 24)) >>> 0;
        out[k] = chan(v, masks[0], 0); out[k + 1] = chan(v, masks[1], 0); out[k + 2] = chan(v, masks[2], 0); out[k + 3] = chan(v, masks[3], 255);
      } else if (bpp <= 8) {
        const bit = x * bpp;
        const v = (b[row + (bit >> 3)]! >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
        const p = palOff + v * 4;
        out[k] = b[p + 2]!; out[k + 1] = b[p + 1]!; out[k + 2] = b[p]!; out[k + 3] = 255;
      }
    }
  }
  return { width, height, data: out };
}

/** Decodifica qualquer formato raster suportado (exceto JPEG, que é embutido direto). */
export function decodeRaster(b: Uint8Array): Rgba | null {
  return decodePng(b) ?? decodeGif(b) ?? decodeBmp(b) ?? decodeTiff(b);
}

// ───────────────────────── TIFF (baseline) ─────────────────────────

function tiffLzw(data: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let o = 0;
  let dict: Uint8Array[] = [];
  const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict[i] = new Uint8Array([i]); dict[256] = new Uint8Array(0); dict[257] = new Uint8Array(0); };
  reset();
  let bitPos = 0, width = 9;
  let prev: Uint8Array | null = null;
  const read = (): number => {
    let v = 0;
    for (let k = 0; k < width; k++) {
      const byte = data[(bitPos + k) >> 3];
      if (byte === undefined) return 257;
      v = (v << 1) | ((byte >> (7 - ((bitPos + k) & 7))) & 1);
    }
    bitPos += width;
    return v;
  };
  while (o < expected) {
    const code = read();
    if (code === 257) break;
    if (code === 256) { reset(); width = 9; prev = null; continue; }
    let entry: Uint8Array;
    if (code < dict.length && dict[code]) entry = dict[code]!;
    else if (prev) { entry = new Uint8Array(prev.length + 1); entry.set(prev); entry[prev.length] = prev[0]!; }
    else break;
    for (let k = 0; k < entry.length && o < expected; k++) out[o++] = entry[k]!;
    if (prev) {
      const ne = new Uint8Array(prev.length + 1);
      ne.set(prev); ne[prev.length] = entry[0]!;
      dict.push(ne);
    }
    prev = entry;
    // "early change": aumenta a largura um código antes
    if (dict.length + 1 >= (1 << width) && width < 12) width++;
  }
  return out;
}

function packBits(data: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let i = 0, o = 0;
  while (i < data.length && o < expected) {
    const n = (data[i++]! << 24) >> 24;
    if (n >= 0) { for (let k = 0; k <= n && o < expected; k++) out[o++] = data[i++]!; }
    else if (n !== -128) { const v = data[i++]!; for (let k = 0; k < 1 - n && o < expected; k++) out[o++] = v; }
  }
  return out;
}

export function decodeTiff(b: Uint8Array): Rgba | null {
  const le = b[0] === 0x49 && b[1] === 0x49;
  const be = b[0] === 0x4d && b[1] === 0x4d;
  if (!le && !be) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o: number) => dv.getUint16(o, le);
  const u32 = (o: number) => dv.getUint32(o, le);
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  const n = u16(ifd);
  const tags = new Map<number, number[]>();
  const SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 };
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
    const size = (SIZES[type] ?? 1) * count;
    const base = size <= 4 ? e + 8 : u32(e + 8);
    const vals: number[] = [];
    for (let k = 0; k < Math.min(count, 1 << 20); k++) {
      if (type === 3) vals.push(u16(base + k * 2));
      else if (type === 4) vals.push(u32(base + k * 4));
      else if (type === 1 || type === 7) vals.push(b[base + k]!);
      else if (type === 5) vals.push(u32(base + k * 8) / (u32(base + k * 8 + 4) || 1));
    }
    tags.set(tag, vals);
  }
  const t = (k: number, d = 0) => tags.get(k)?.[0] ?? d;
  const width = t(256), height = t(257);
  const bps = tags.get(258) ?? [1];
  const comp = t(259, 1);
  const photo = t(262, 1);
  const spp = t(277, 1);
  const predictor = t(317, 1);
  const planar = t(284, 1);
  if (!width || !height || planar !== 1 || ![1, 5, 8, 32946, 32773].includes(comp)) return null;
  const bits = bps[0] ?? 8;
  const decode0 = (chunk: Uint8Array, expected: number): Uint8Array => {
    if (comp === 1) return chunk;
    if (comp === 5) return tiffLzw(chunk, expected);
    if (comp === 32773) return packBits(chunk, expected);
    try { return unzlibSync(chunk); } catch { return new Uint8Array(expected); }
  };
  // YCbCr (fotométrica 6) com subamostragem: unidades de h×v amostras de Y + Cb + Cr
  const ycc = photo === 6 && bits === 8 && spp === 3;
  const sub = tags.get(530) ?? [2, 2];
  const sh = ycc ? Math.max(1, sub[0] ?? 2) : 1, sv = ycc ? Math.max(1, sub[1] ?? 2) : 1;
  const coef = tags.get(529) ?? [0.299, 0.587, 0.114];
  const toRgb = (Y: number, cb: number, cr: number): [number, number, number] => {
    const lr = coef[0] ?? 0.299, lg = coef[1] ?? 0.587, lb = coef[2] ?? 0.114;
    const R = Y + (cr - 128) * (2 - 2 * lr), B = Y + (cb - 128) * (2 - 2 * lb);
    const G = (Y - lb * B - lr * R) / lg;
    const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return [c(R), c(G), c(B)];
  };
  if (ycc && (sh > 1 || sv > 1)) {
    if (tags.has(322)) return null; // ladrilhos YCbCr subamostrados: não suportado
    const across = Math.ceil(width / sh), unit = sh * sv + 2, blockRow = across * unit, blockRows = Math.ceil(height / sv);
    const data = new Uint8Array(blockRow * blockRows);
    const rps = t(278, height);
    let o = 0;
    (tags.get(273) ?? []).forEach((off, i) => {
      if (o >= data.length) return;
      const rows = Math.min(rps, height - i * rps);
      const exp = Math.ceil(rows / sv) * blockRow;
      const d = decode0(b.subarray(off, off + (tags.get(279)?.[i] ?? 0)), exp);
      data.set(d.subarray(0, Math.min(d.length, data.length - o)), o);
      o += exp;
    });
    const out = new Uint8Array(width * height * 4);
    for (let by = 0; by < blockRows; by++) {
      for (let bx = 0; bx < across; bx++) {
        const u = by * blockRow + bx * unit;
        const cb = data[u + sh * sv]!, cr = data[u + sh * sv + 1]!;
        for (let j = 0; j < sv; j++) {
          for (let i = 0; i < sh; i++) {
            const x = bx * sh + i, y = by * sv + j;
            if (x >= width || y >= height) continue;
            const [R, G, B] = toRgb(data[u + j * sh + i]!, cb, cr);
            const k = (y * width + x) * 4;
            out[k] = R; out[k + 1] = G; out[k + 2] = B; out[k + 3] = 255;
          }
        }
      }
    }
    return { width, height, data: out };
  }
  const rowBytes = Math.ceil((width * spp * bits) / 8);
  const raw = new Uint8Array(rowBytes * height);
  const tiled = tags.has(322);
  const offs = tags.get(tiled ? 324 : 273) ?? [];
  const counts = tags.get(tiled ? 325 : 279) ?? [];
  const decode = decode0;
  if (!tiled) {
    const rps = t(278, height);
    let o = 0;
    offs.forEach((off, i) => {
      if (o >= raw.length) return; // faixas além da imagem
      const rows = Math.min(rps, height - i * rps);
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), rows * rowBytes);
      raw.set(d.subarray(0, Math.min(d.length, raw.length - o)), o);
      o += rows * rowBytes;
    });
  } else {
    const tw = t(322), th = t(323);
    const tilesAcross = Math.ceil(width / tw);
    const tileRow = Math.ceil((tw * spp * bits) / 8);
    offs.forEach((off, i) => {
      const d = decode(b.subarray(off, off + (counts[i] ?? 0)), tileRow * th);
      const tx = (i % tilesAcross) * tw, ty = Math.floor(i / tilesAcross) * th;
      for (let y = 0; y < th && ty + y < height; y++) {
        const dst = (ty + y) * rowBytes + Math.floor((tx * spp * bits) / 8);
        const len = Math.min(tileRow, rowBytes - Math.floor((tx * spp * bits) / 8));
        raw.set(d.subarray(y * tileRow, y * tileRow + len), dst);
      }
    });
  }
  // preditor horizontal (amostras de 8 ou 16 bits, na ordem de bytes do arquivo)
  if (predictor === 2 && bits === 8) {
    for (let y = 0; y < height; y++) {
      for (let x = spp; x < width * spp; x++) raw[y * rowBytes + x] = (raw[y * rowBytes + x]! + raw[y * rowBytes + x - spp]!) & 0xff;
    }
  } else if (predictor === 2 && bits === 16) {
    const get = (o: number) => (le ? raw[o]! | (raw[o + 1]! << 8) : (raw[o]! << 8) | raw[o + 1]!);
    const set = (o: number, v: number) => { if (le) { raw[o] = v & 0xff; raw[o + 1] = v >> 8; } else { raw[o] = v >> 8; raw[o + 1] = v & 0xff; } };
    for (let y = 0; y < height; y++) {
      for (let s = spp; s < width * spp; s++) {
        const o = y * rowBytes + s * 2;
        set(o, (get(o) + get(o - spp * 2)) & 0xffff);
      }
    }
  }
  const out = new Uint8Array(width * height * 4);
  const cmap = tags.get(320);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      const sample = (c: number): number => {
        if (bits === 8) return raw[y * rowBytes + x * spp + c]!;
        if (bits === 16) return raw[y * rowBytes + (x * spp + c) * 2 + (le ? 1 : 0)]!;
        const bit = (x * spp + c) * bits;
        const v = (raw[y * rowBytes + (bit >> 3)]! >> (8 - bits - (bit & 7))) & ((1 << bits) - 1);
        return v;
      };
      if (ycc) {
        const [R, G, B] = toRgb(sample(0), sample(1), sample(2));
        out[k] = R; out[k + 1] = G; out[k + 2] = B; out[k + 3] = 255;
      } else if (photo === 2 || photo === 6) {
        out[k] = sample(0); out[k + 1] = sample(1); out[k + 2] = sample(2);
        out[k + 3] = spp >= 4 ? sample(3) : 255;
      } else if (photo === 3 && cmap) {
        const i = sample(0), nColors = 1 << bits;
        out[k] = cmap[i]! >> 8; out[k + 1] = cmap[nColors + i]! >> 8; out[k + 2] = cmap[2 * nColors + i]! >> 8; out[k + 3] = 255;
      } else if (photo === 5) {
        const c = sample(0), m = sample(1), yy = sample(2), kk = sample(3);
        out[k] = 255 - Math.min(255, c + kk); out[k + 1] = 255 - Math.min(255, m + kk); out[k + 2] = 255 - Math.min(255, yy + kk); out[k + 3] = 255;
      } else {
        const max = bits >= 8 ? 255 : (1 << bits) - 1;
        let g = Math.round((sample(0) * 255) / max);
        if (photo === 0) g = 255 - g;
        out[k] = g; out[k + 1] = g; out[k + 2] = g; out[k + 3] = spp >= 2 ? sample(1) : 255;
      }
    }
  }
  return { width, height, data: out };
}

// ───────────────────────── ajustes de cor (Word) ─────────────────────────


/** Brilho/contraste como reta por canal (0..1): x' = x·slope + off. */
export function effectLine(fx: ImageEffects): { slope: number; off: number } | null {
  if (fx.gain === undefined && !fx.bright) return null;
  const s = fx.gain ?? 1, b = fx.bright ?? 0;
  return { slope: s, off: 0.5 - 0.5 * s + (b / 2) * (1 + s) };
}

/**
 * Aplica os ajustes aos pixels (RGBA, no lugar), na ordem do Word: cinza
 * (Rec. 709), brilho/contraste, preto e branco (oráculo imgfx: o PDF do
 * Word traz a imagem já ajustada).
 */
export function applyImageEffects(rgba: Uint8Array, fx: ImageEffects): void {
  const ln = effectLine(fx);
  const map = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const y = ln ? (v / 255 * ln.slope + ln.off) * 255 : v;
    map[v] = Math.max(0, Math.min(255, fx.floor ? Math.floor(y + 1e-9) : Math.round(y)));
  }
  const thr = fx.biLevel !== undefined ? fx.biLevel * 255 : -1;
  for (let i = 0; i < rgba.length; i += 4) {
    let r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!;
    if (fx.gray) r = g = b = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    r = map[r]!; g = map[g]!; b = map[b]!;
    if (thr >= 0) r = g = b = 0.2126 * r + 0.7152 * g + 0.0722 * b >= thr ? 255 : 0;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b;
  }
}

/**
 * /Decode do PDF que faz o brilho/contraste num JPEG sem decodificá-lo
 * (componentes RGB ou cinza); null se o ajuste exige os pixels (cinza,
 * preto e branco, CMYK).
 */
export function effectDecode(fx: ImageEffects, components: number): number[] | null {
  if (fx.gray || fx.biLevel !== undefined || components === 4) return null;
  const ln = effectLine(fx);
  if (!ln) return null;
  const d = [ln.off, ln.off + ln.slope];
  return components === 1 ? d : [...d, ...d, ...d];
}

/**
 * Ajustes do a:blip que o Word aplica aos pixels além de a:lum/cinza/preto e
 * branco (RGBA, no lugar): cor transparente (a:clrChange: a cor exata, com a
 * folga do arredondamento do JPEG), tom duplo (luminância Rec. 709 entre as duas
 * cores) e transparência (a:alphaModFix).
 */
export function applyPictureAdjust(
  d: Uint8Array | Uint8ClampedArray,
  o: { alpha?: number; duotone?: [string, string]; clrChange?: { from: string; to: string; toAlpha: number } },
): void {
  const hex = (s: string): [number, number, number] => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  if (o.clrChange) {
    const [fr, fg, fb] = hex(o.clrChange.from), [tr, tg, tb] = hex(o.clrChange.to);
    const ta = Math.round(o.clrChange.toAlpha * 255);
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]! - fr) <= 2 && Math.abs(d[i + 1]! - fg) <= 2 && Math.abs(d[i + 2]! - fb) <= 2) {
        d[i] = tr; d[i + 1] = tg; d[i + 2] = tb; d[i + 3] = Math.round((d[i + 3]! * ta) / 255);
      }
    }
  }
  if (o.duotone) {
    const [a, b] = [hex(o.duotone[0]), hex(o.duotone[1])];
    for (let i = 0; i < d.length; i += 4) {
      const t = (0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!) / 255;
      d[i] = Math.round(a[0] + (b[0] - a[0]) * t); d[i + 1] = Math.round(a[1] + (b[1] - a[1]) * t); d[i + 2] = Math.round(a[2] + (b[2] - a[2]) * t);
    }
  }
  if (o.alpha !== undefined) for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i]! * o.alpha);
}
