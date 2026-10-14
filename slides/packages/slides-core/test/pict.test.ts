import { describe, expect, it } from 'vitest';
import { isPict, pictSize, drawPict, fitPictFrame } from '../src/index.js';

/** PICT v2 mínimo: cabeçalho estendido + opcodes dados (big-endian, alinhados em palavra). */
function pict(frame: [number, number, number, number], ops: number[]): Uint8Array {
  const w: number[] = [];
  const u16 = (v: number): void => { w.push((v >> 8) & 0xff, v & 0xff); };
  u16(0); frame.forEach(u16);
  u16(0x0011); u16(0x02ff);
  u16(0x0c00); u16(0xfffe); u16(0); u16(0x48); u16(0); u16(0x48); u16(0); frame.forEach(u16); u16(0); u16(0);
  for (const b of ops) w.push(b);
  if (w.length & 1) w.push(0);
  u16(0x00ff);
  return new Uint8Array(w);
}

/** Contexto falso que registra as chamadas de desenho. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = new Proxy({}, {
    get: (_t, k) => k === 'measureText' ? () => ({ width: 10 }) : (...a: unknown[]) => { calls.push(`${String(k)}(${a.map((x) => typeof x === 'number' ? Math.round(x) : JSON.stringify(x)).join(',')})`); },
    set: (_t, k, v) => { calls.push(`${String(k)}=${String(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('PICT (QuickDraw)', () => {
  // RGBFgCol vermelho + paintRect (10,20)-(30,60) + LongText "Hi" em (40,5)
  const ops = [0x00, 0x1a, 0xff, 0xff, 0, 0, 0, 0, 0x00, 0x31, 0, 10, 0, 20, 0, 30, 0, 60, 0x00, 0x28, 0, 40, 0, 5, 2, 0x48, 0x69];
  const b = pict([0, 0, 50, 100], ops);

  it('detecta e mede (picFrame em pontos → px a 96 dpi)', () => {
    expect(isPict(b)).toBe(true);
    expect(isPict(new Uint8Array(40))).toBe(false);
    expect(pictSize(b)).toEqual({ w: (100 * 96) / 72, h: (50 * 96) / 72 });
  });

  it('desenha retângulo pintado na cor de frente e o texto na origem da linha de base', () => {
    const { ctx, calls } = recorder();
    drawPict(ctx, b, 0, 0, 200, 100); // 2 px por unidade
    expect(calls).toContain('fillStyle=rgb(255,0,0)');
    expect(calls).toContain('rect(40,20,80,40)');
    expect(calls).toContain('fillText("Hi",10,80)');
  });

  it('ptSize com outra proporção: escala horizontal nos dois eixos, corta embaixo', () => {
    const f = fitPictFrame(b, 100 * 12700, 40 * 12700);
    expect(pictSize(f)!.h).toBeCloseTo((40 * 96) / 72);
    expect(fitPictFrame(b, 200 * 12700, 100 * 12700)).toBe(b); // mesma proporção: intacto
  });
});
