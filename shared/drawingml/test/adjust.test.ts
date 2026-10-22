import { describe, expect, it } from 'vitest';
import { adjustBrightnessContrast, adjustSaturation, adjustSharpen, adjustTemperature } from '../src/index.js';

const px = (...rgb: number[]): Uint8ClampedArray => {
  const d = new Uint8ClampedArray((rgb.length / 3) * 4);
  for (let i = 0; i < rgb.length / 3; i++) { d.set(rgb.slice(i * 3, i * 3 + 3), i * 4); d[i * 4 + 3] = 255; }
  return d;
};

describe('ajustes a14 (medidos no Word, write/tools/image-lab pe-*)', () => {
  it('saturação 0 vira cinza do HSL e 100% não muda nada', () => {
    const d = px(220, 40, 40);
    adjustSaturation(d, 0);
    expect([...d.slice(0, 3)]).toEqual([130, 130, 130]);
    const e = px(220, 40, 40);
    adjustSaturation(e, 1);
    expect([...e.slice(0, 3)]).toEqual([220, 40, 40]);
  });

  it('temperatura 6500 K é neutra e menor que isso puxa para o azul', () => {
    const d = px(128, 128, 128);
    adjustTemperature(d, 6500);
    expect([...d.slice(0, 3)]).toEqual([128, 128, 128]);
    adjustTemperature(d, 4700);
    expect(d[2]! > d[0]!).toBe(true);
  });

  it('brilho/contraste seguem as curvas do Word (rampa de cinzas)', () => {
    const at = (b: number, c: number, v: number): number => { const d = px(v, v, v); adjustBrightnessContrast(d, b, c); return d[0]!; };
    expect(at(-0.4, 0, 128)).toBe(62);
    expect(at(0.2, 0, 128)).toBe(169);
    expect(at(0, 0.4, 64)).toBe(35);
    expect(at(0, -0.4, 64)).toBe(89);
    // composição: brilho primeiro, contraste sobre o resultado
    expect(Math.abs(at(0.2, 0.2, 128) - 181)).toBeLessThanOrEqual(1);
    expect(at(0, 1, 127)).toBe(0);
    expect(at(0, 1, 128)).toBe(255);
    expect(at(1, 0, 0)).toBe(255);
    expect(at(0, -1, 255)).toBe(128);
  });

  it('suavizar desfoca a borda ao meio e nitidez mexe na luma dos três canais', () => {
    const w = 16, h = 4, d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(x < 8 ? [220, 40, 40, 255] : [40, 160, 60, 255], (y * w + x) * 4);
    const soft = new Uint8ClampedArray(d);
    adjustSharpen(soft, w, h, -1);
    expect(soft[(1 * w + 7) * 4]! + soft[(1 * w + 8) * 4]!).toBeCloseTo(260, -1);
    const sharp = new Uint8ClampedArray(d);
    adjustSharpen(sharp, w, h, 1);
    // lado vermelho (luma menor) escurece nos três canais
    expect(sharp[(1 * w + 7) * 4]!).toBeLessThan(220);
    expect(sharp[(1 * w + 7) * 4 + 1]!).toBeLessThan(40);
  });
});
