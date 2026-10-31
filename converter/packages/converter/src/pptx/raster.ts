/**
 * Decodificação mínima de rasters para o export PDF:
 *
 * - `decodePng`: PNG → RGBA cru via fflate (inflate dos IDAT + unfilter das
 *   scanlines). Suporta bit depth 8 nos color types 0 (gray), 2 (RGB),
 *   3 (paleta, com tRNS), 4 (gray+alpha) e 6 (RGBA), sem entrelaçamento
 *   (Adam7 → null, vira placeholder no PDF).
 * - `jpegSize`: varre os marcadores SOFn de um JPEG baseline/progressive para
 *   obter largura/altura (o JPEG em si embute direto via DCTDecode).
 */
import { unzlibSync } from 'fflate';

export interface DecodedPng {
  width: number;
  height: number;
  /** Pixels RGBA (4 bytes por pixel, linha a linha). */
  rgba: Uint8Array;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Decodifica um PNG para RGBA. `null` quando o formato não é suportado. */
export function decodePng(bytes: Uint8Array): DecodedPng | null {
  if (bytes.length < 8 || PNG_SIG.some((b, i) => bytes[i] !== b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  let p = 8;
  while (p + 8 <= bytes.length) {
    const len = v.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!);
    const dataStart = p + 8;
    if (dataStart + len > bytes.length) return null;
    if (type === 'IHDR') {
      width = v.getUint32(dataStart);
      height = v.getUint32(dataStart + 4);
      bitDepth = bytes[dataStart + 8]!;
      colorType = bytes[dataStart + 9]!;
      interlace = bytes[dataStart + 12]!;
    } else if (type === 'PLTE') {
      palette = bytes.subarray(dataStart, dataStart + len);
    } else if (type === 'tRNS') {
      trns = bytes.subarray(dataStart, dataStart + len);
    } else if (type === 'IDAT') {
      idat.push(bytes.subarray(dataStart, dataStart + len));
    } else if (type === 'IEND') {
      break;
    }
    p = dataStart + len + 4; // pula CRC
  }
  if (!width || !height || interlace !== 0 || bitDepth !== 8) return null;

  // canais por color type (8 bits cada)
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0) return null;
  if (colorType === 3 && !palette) return null;

  // concatena IDAT e inflate
  let total = 0;
  for (const c of idat) total += c.length;
  const zdata = new Uint8Array(total);
  let off = 0;
  for (const c of idat) { zdata.set(c, off); off += c.length; }
  let raw: Uint8Array;
  try { raw = unzlibSync(zdata); } catch { return null; } // IDAT é zlib (RFC 1950)

  const bpp = channels; // bytes por pixel (bit depth 8)
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height) return null;

  // unfilter das scanlines (filtros 0..4 do PNG)
  const img = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const rawB = raw[src + x]!;
      const a = x >= bpp ? img[dst + x - bpp]! : 0;          // esquerda
      const b = y > 0 ? img[prev + x]! : 0;                  // cima
      const c = y > 0 && x >= bpp ? img[prev + x - bpp]! : 0; // diagonal
      let val: number;
      switch (filter) {
        case 0: val = rawB; break;
        case 1: val = rawB + a; break;
        case 2: val = rawB + b; break;
        case 3: val = rawB + ((a + b) >> 1); break;
        case 4: { // Paeth
          const pp = a + b - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          val = rawB + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: return null;
      }
      img[dst + x] = val & 0xff;
    }
  }

  // expande para RGBA
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, o = 0; i < width * height; i++, o += 4) {
    const s = i * bpp;
    switch (colorType) {
      case 0: { const g = img[s]!; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = 255; break; }
      case 2: rgba[o] = img[s]!; rgba[o + 1] = img[s + 1]!; rgba[o + 2] = img[s + 2]!; rgba[o + 3] = 255; break;
      case 3: {
        const idx = img[s]!;
        rgba[o] = palette![idx * 3] ?? 0;
        rgba[o + 1] = palette![idx * 3 + 1] ?? 0;
        rgba[o + 2] = palette![idx * 3 + 2] ?? 0;
        rgba[o + 3] = trns ? (trns[idx] ?? 255) : 255;
        break;
      }
      case 4: { const g = img[s]!; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = img[s + 1]!; break; }
      default: rgba[o] = img[s]!; rgba[o + 1] = img[s + 1]!; rgba[o + 2] = img[s + 2]!; rgba[o + 3] = img[s + 3]!;
    }
  }
  return { width, height, rgba };
}

/** Largura/altura de um JPEG (marcadores SOF0..SOF15, exceto DHT/JPG/DAC). */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 2;
  while (p + 4 <= bytes.length) {
    if (bytes[p] !== 0xff) { p++; continue; }
    const marker = bytes[p + 1]!;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { p += 2; continue; }
    const len = v.getUint16(p + 2);
    // SOF0..SOF15 exceto DHT (C4), JPG (C8) e DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (p + 9 > bytes.length) return null;
      return { height: v.getUint16(p + 5), width: v.getUint16(p + 7) };
    }
    p += 2 + len;
  }
  return null;
}
