// Imagens de teste do lab de imagem (geradas aqui, sem direitos de terceiros):
//   pattern.png — 480x360 RGB: quatro quadrantes coloridos, faixa em degradê
//                 cinza e xadrez — mostra corte, giro, espelho e ajustes de cor.
//   alpha.png   — 240x240 RGBA: círculo opaco sobre fundo transparente.
//   photo.jpg   — não: o Word recomprime JPEG; os testes usam PNG.
//
//   node tools/image-lab/test-image.mjs <pasta>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zlibSync } from 'fflate';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** PNG de 8 bits (RGB ou RGBA) a partir de px(x, y) → [r, g, b(, a)]. */
export function png(w, h, ch, px) {
  const stride = 1 + w * ch;
  const raw = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = px(x, y);
      for (let k = 0; k < ch; k++) raw[y * stride + 1 + x * ch + k] = v[k];
    }
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2;
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function patternPng() {
  const W = 480, H = 360;
  return png(W, H, 3, (x, y) => {
    if (y >= 300) { const g = Math.round((x / (W - 1)) * 255); return [g, g, g]; }
    if (y >= 260) return ((x >> 4) + (y >> 4)) & 1 ? [255, 255, 255] : [0, 0, 0];
    const left = x < W / 2, top = y < 130;
    if (top && left) return [220, 40, 40];
    if (top) return [40, 160, 60];
    if (left) return [40, 80, 220];
    return [240, 200, 40];
  });
}

/** Formas sólidas sobre fundo transparente (240x240) para o contorno de quebra:
 *  star (5 pontas, côncava), lshape (L) e ring (anel, com furo). */
export function shapePng(kind) {
  const S = 240, c = S / 2;
  const inside = (x, y) => {
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    if (kind === 'ring') { const d = Math.hypot(dx, dy); return d <= 96 && d >= 48; }
    if (kind === 'lshape') return x >= 24 && x < 216 && y >= 24 && y < 216 && (x < 96 || y >= 144);
    // estrela de 5 pontas: raio externo 100, interno 40
    const a = Math.atan2(dy, dx) + Math.PI / 2, r = Math.hypot(dx, dy);
    const k = ((a % (2 * Math.PI / 5)) + 2 * Math.PI / 5) % (2 * Math.PI / 5) / (2 * Math.PI / 5);
    const t = Math.abs(k - 0.5) * 2; // 1 na ponta, 0 no vale
    return r <= 40 + (100 - 40) * t;
  };
  return png(S, S, 4, (x, y) => (inside(x, y) ? [200, 60, 30, 255] : [255, 255, 255, 0]));
}

export function alphaPng() {
  const S = 240;
  return png(S, S, 4, (x, y) => {
    const d = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5);
    return d <= S * 0.4 ? [30, 120, 200, 255] : [255, 255, 255, 0];
  });
}

if (process.argv[1] && process.argv[1].endsWith('test-image.mjs')) {
  const dir = process.argv[2] ?? '.';
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'pattern.png'), patternPng());
  writeFileSync(join(dir, 'alpha.png'), alphaPng());
  console.log(`imagens em ${dir}`);
}
