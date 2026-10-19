import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pptxToImages, type CanvasLike } from '../../src/export/index.js';

const reference = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/reference.pptx'));

/** Contexto 2d fake: grava os nomes dos métodos chamados e responde o mínimo. */
function fakeCtx(calls: string[]): unknown {
  return new Proxy({}, {
    get(_t, prop: string | symbol) {
      const name = String(prop);
      if (name === 'measureText') {
        return (text: string) => { calls.push('measureText'); return { width: text.length * 6 }; };
      }
      if (name === 'createLinearGradient') {
        return () => ({ addColorStop: (): void => {} });
      }
      // leituras de propriedade (globalAlpha etc.) devolvem função inofensiva;
      // aritmética com ela vira NaN e o set é engolido — suficiente p/ o paint.
      return (..._args: unknown[]) => { calls.push(name); };
    },
    set() { return true; },
  });
}

describe('pptxToImages', () => {
  it('node sem factory: erro claro orientando opts.canvas', async () => {
    await expect(pptxToImages(reference())).rejects.toThrow(/opts\.canvas/);
    await expect(pptxToImages(reference())).rejects.toThrow(/@napi-rs\/canvas/);
  });

  it('com factory fake: 1 PNG por slide, paint executa no contexto', async () => {
    const calls: string[] = [];
    const created: { w: number; h: number }[] = [];
    const marker = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const factory = (w: number, h: number): CanvasLike => {
      created.push({ w, h });
      return {
        width: w, height: h,
        getContext: () => fakeCtx(calls),
        toBuffer: () => marker,
      };
    };
    const out = await pptxToImages(reference(), { canvas: factory, scale: 2 });
    expect(out.length).toBe(3); // reference.pptx tem 3 slides
    expect(out.every((b) => b.length === marker.length)).toBe(true);
    // resolução: 96dpi × scale 2 (slide 16:9 default = 960×540 @96dpi)
    expect(created.length).toBe(3);
    expect(created[0]!.w).toBe(created[0]!.h * 16 / 9);
    // o pipeline de paint realmente rodou (fundo + shapes + texto)
    expect(calls).toContain('fillRect');
    expect(calls).toContain('fillText');
    expect(calls).toContain('measureText');
  });

  it('canvas sem encoder PNG conhecido: erro claro', async () => {
    const factory = (): CanvasLike => ({
      width: 1, height: 1,
      getContext: () => fakeCtx([]),
    });
    await expect(pptxToImages(reference(), { canvas: factory })).rejects.toThrow(/encoder PNG/);
  });
});
