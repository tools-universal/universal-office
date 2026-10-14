/**
 * Resolução gravada no arquivo de imagem (pontos por polegada). O Office mede
 * o "tamanho natural" de uma imagem por ela — o ladrilho (`a:tile`) de um
 * preenchimento de imagem tem esse tamanho (medido no PowerPoint: textura de
 * 128 px gravada a 75 dpi ladrilha a cada 122,88 pt, não a 96 pt).
 *
 * PNG: `pHYs` (unidade metro); JPEG: JFIF APP0 (1 = dpi, 2 = dpcm) e, sem
 * unidade no JFIF, a XResolution/YResolution do EXIF; BMP: biX/YPelsPerMeter.
 * Sem informação (ou valores absurdos) = undefined — o chamador usa 96 dpi.
 */
export function imageDpi(b: Uint8Array): { x: number; y: number } | undefined {
  try {
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return sane(pngDpi(b));
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) return sane(jpegDpi(b));
    if (b.length > 46 && b[0] === 0x42 && b[1] === 0x4d) {
      const x = i32le(b, 38), y = i32le(b, 42);
      return x > 0 && y > 0 ? sane({ x: x * 0.0254, y: y * 0.0254 }) : undefined;
    }
  } catch { /* arquivo truncado: sem resolução */ }
  return undefined;
}

function sane(d: { x: number; y: number } | undefined): { x: number; y: number } | undefined {
  return d && d.x >= 1 && d.y >= 1 && d.x <= 100000 && d.y <= 100000 ? d : undefined;
}

const u16be = (b: Uint8Array, i: number): number => (b[i]! << 8) | b[i + 1]!;
const u32be = (b: Uint8Array, i: number): number => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
const i32le = (b: Uint8Array, i: number): number => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24);

function pngDpi(b: Uint8Array): { x: number; y: number } | undefined {
  let p = 8;
  while (p + 12 <= b.length) {
    const len = u32be(b, p);
    const type = String.fromCharCode(b[p + 4]!, b[p + 5]!, b[p + 6]!, b[p + 7]!);
    if (type === 'pHYs' && len >= 9) {
      const x = u32be(b, p + 8), y = u32be(b, p + 12), unit = b[p + 16];
      return unit === 1 ? { x: x * 0.0254, y: y * 0.0254 } : undefined;
    }
    if (type === 'IDAT' || type === 'IEND') return undefined;
    p += 12 + len;
  }
  return undefined;
}

function jpegDpi(b: Uint8Array): { x: number; y: number } | undefined {
  let p = 2;
  let exif: { x: number; y: number } | undefined;
  while (p + 4 <= b.length && b[p] === 0xff) {
    const m = b[p + 1]!;
    if (m === 0xff) { p++; continue; }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { p += 2; continue; }
    if (m === 0xda || m === 0xd9) break;
    const len = u16be(b, p + 2);
    const d = p + 4;
    if (m === 0xe0 && len >= 14 && b[d] === 0x4a && b[d + 1] === 0x46 && b[d + 2] === 0x49 && b[d + 3] === 0x46 && b[d + 4] === 0) {
      const unit = b[d + 7], x = u16be(b, d + 8), y = u16be(b, d + 10);
      if (unit === 1) return { x, y };
      if (unit === 2) return { x: x * 2.54, y: y * 2.54 };
    } else if (m === 0xe1 && len >= 16 && b[d] === 0x45 && b[d + 1] === 0x78 && b[d + 2] === 0x69 && b[d + 3] === 0x66) {
      exif = exifDpi(b, d + 6, Math.min(b.length, p + 2 + len));
    }
    p += 2 + len;
  }
  return exif;
}

/** XResolution/YResolution/ResolutionUnit do IFD0 de um bloco TIFF (EXIF). */
function exifDpi(b: Uint8Array, t: number, end: number): { x: number; y: number } | undefined {
  if (t + 8 > end) return undefined;
  const le = b[t] === 0x49;
  const u16 = (i: number): number => (le ? b[i]! | (b[i + 1]! << 8) : u16be(b, i));
  const u32 = (i: number): number => (le ? (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0 : u32be(b, i));
  const ifd = t + u32(t + 4);
  if (ifd + 2 > end) return undefined;
  const n = u16(ifd);
  let x: number | undefined, y: number | undefined, unit = 2;
  const rational = (off: number): number | undefined => {
    const at = t + off;
    if (at + 8 > end) return undefined;
    const den = u32(at + 4);
    return den ? u32(at) / den : undefined;
  };
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + 12 * k;
    if (e + 12 > end) break;
    const tag = u16(e);
    if (tag === 0x011a) x = rational(u32(e + 8));
    else if (tag === 0x011b) y = rational(u32(e + 8));
    else if (tag === 0x0128) unit = u16(e + 8);
  }
  if (!x || !y || (unit !== 2 && unit !== 3)) return undefined;
  return unit === 3 ? { x: x * 2.54, y: y * 2.54 } : { x, y };
}
