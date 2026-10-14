import { describe, expect, it } from 'vitest';
import { drawMetafile } from '../src/metafile.js';
import { scanEmfPlus } from '../src/emfplus.js';

/**
 * EMF+ "dual" — medido no app de referência com decks sintéticos (_lab
 * syn-c-emfplus*, fundo azul, reserva GDI verde): o app toca os registros EMF+
 * e IGNORA os GDI de reserva (GDI só depois de um GetDC).
 */

/** EMF mínimo: cabeçalho + registros (tipo, palavras de 32 bits) + EOF. */
function emf(records: [number, number[]][]): Uint8Array {
  const body: number[][] = records.map(([t, p]) => [t, 8 + p.length * 4, ...p]);
  body.push([14, 20, 0, 16, 20]);
  const size = 108 + body.reduce((s, r) => s + r.length * 4, 0);
  const b = new Uint8Array(size);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, 1, true); dv.setUint32(4, 108, true);
  dv.setInt32(32, 1000, true); dv.setInt32(36, 1000, true); // quadro 10 × 10 mm
  dv.setUint32(40, 0x464d4520, true); dv.setUint32(48, size, true);
  dv.setInt32(72, 1000, true); dv.setInt32(76, 1000, true); dv.setInt32(80, 100, true); dv.setInt32(84, 100, true);
  let o = 108;
  for (const r of body) for (const v of r) { dv.setUint32(o, v >>> 0, true); o += 4; }
  return b;
}
const f32w = (v: number): number => new Uint32Array(new Float32Array([v]).buffer)[0]!;

/** EMF com EMF+ (cabeçalho + registros dados) e reserva GDI (retângulo verde). */
function dualEmf(plusRecs: number[][], dual = true): Uint8Array {
  const plus: number[] = [0x4001 | ((dual ? 1 : 0) << 16), 28, 16, 0xdbc01002, 1, 96, 96, ...plusRecs.flat(), 0x4002, 12, 0];
  return emf([
    [70, [4 + plus.length * 4, 0x2b464d45, ...plus]],
    [39, [1, 0, 0x0000ff00, 0]], [37, [1]], [37, [0x80000008]], [43, [0, 0, 100, 100]],
  ]);
}
/** FillRects com cor ARGB vermelha */
const fillRectRed = [0x400a | (0x8000 << 16), 36, 24, 0xffff0000, 1, f32w(10), f32w(10), f32w(50), f32w(50)];

/** Contexto 2D falso: registra a cor de cada preenchimento. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; fills: string[] } {
  const fills: string[] = [];
  let style = '';
  const ctx = new Proxy({}, {
    get: (_t, k) => {
      if (k === 'fillStyle') return style;
      if (k === 'fill' || k === 'fillRect') return () => { fills.push(style); };
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'canvas') return { width: 100, height: 100 };
      if (k === 'measureText') return () => ({ width: 1 });
      return () => undefined;
    },
    set: (_t, k, v) => { if (k === 'fillStyle') style = String(v); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills };
}

describe('EMF+ "dual"', () => {
  it('reconhece o EMF+ e o que dá para desenhar', () => {
    expect(scanEmfPlus(dualEmf([fillRectRed])).kind).toBe('dual');
    expect(scanEmfPlus(dualEmf([fillRectRed])).ok).toBe(true);
    expect(scanEmfPlus(dualEmf([fillRectRed], false)).kind).toBe('only');
    // texto EMF+ (DrawString) não é desenhado: o "dual" fica com a reserva GDI
    expect(scanEmfPlus(dualEmf([[0x401c, 12, 0]])).ok).toBe(false);
    expect(scanEmfPlus(emf([[43, [0, 0, 1, 1]]])).kind).toBe('none');
  });
  it('desenha o FillRects do EMF+ e não o retângulo GDI de reserva', () => {
    const { ctx, fills } = fakeCtx();
    drawMetafile(ctx, dualEmf([fillRectRed]), 0, 0, 100, 100);
    expect(fills.some((c) => c.startsWith('rgba(255,0,0'))).toBe(true);
    expect(fills).not.toContain('#00ff00');
  });
  it('com registro EMF+ sem desenho (texto), toca a reserva GDI', () => {
    const { ctx, fills } = fakeCtx();
    drawMetafile(ctx, dualEmf([[0x401c, 12, 0]]), 0, 0, 100, 100);
    expect(fills).toContain('#00ff00');
  });
});
