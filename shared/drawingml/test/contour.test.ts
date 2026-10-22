import { describe, expect, it } from 'vitest';
import { wrapContour } from '../src/index.js';

/** RGBA w×h com `inside(x, y)` opaco e o resto transparente. */
const img = (w: number, h: number, inside: (x: number, y: number) => boolean): Uint8ClampedArray => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) d[(y * w + x) * 4 + 3] = 255;
  return d;
};

describe('contorno de quebra (medido no Word: image-lab alpha-tight, shape-tight-*)', () => {
  it('imagem opaca não tem contorno (fica o retângulo padrão)', () => {
    expect(wrapContour(img(48, 36, () => true), 48, 36)).toBeNull();
  });
  it('círculo: extremos nas células 7 e 88 da grade de 96 (1575 e 19800)', () => {
    const c = wrapContour(img(240, 240, (x, y) => Math.hypot(x + 0.5 - 120, y + 0.5 - 120) <= 96), 240, 240)!;
    const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
    expect(Math.min(...xs)).toBe(1575);
    expect(Math.max(...xs)).toBe(19800);
    expect(Math.min(...ys)).toBe(1575);
    expect(Math.max(...ys)).toBe(19800);
    expect(c[0]).toEqual(c[c.length - 1]);
  });
  it('L: cantos retos como o Word (7,7 · 7,88 · 88,88)', () => {
    const c = wrapContour(img(240, 240, (x, y) => x >= 24 && x < 216 && y >= 24 && y < 216 && (x < 96 || y >= 144)), 240, 240)!;
    const cells = c.map(([x, y]) => `${x / 225},${y / 225}`);
    expect(cells).toContain('7,7');
    expect(cells).toContain('7,88');
    expect(cells).toContain('88,88');
  });
});
