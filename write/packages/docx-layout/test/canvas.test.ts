/**
 * Pintor de canvas (paintItems): retângulo fino — borda de tabela de 0,5 pt, que o
 * motor emite UMA vez por divisa — sai com largura inteira ≥ 1 px alinhada ao pixel,
 * como as linhas. Antes ficava em 2 px cinza-claros na tela (varredura do editor no
 * corpus, 2026-10-22: bordas verticais de tabela "sumindo" a 100%). E o texto
 * semitransparente (marca-d'água em curvas com alfa) com a opacidade do run, como
 * no PDF — saía opaco na tela.
 */
import { describe, it, expect } from 'vitest';
import { paintItems, snapThin, type EnginePaintEnv } from '../src/canvas.js';
import type { GlyphRunItem, PageItem } from '../src/tree.js';

/** contexto 2D falso: só o que o retângulo usa; grava os fillRect em pixels de dispositivo */
function fakeCtx(scale: number, ox = 0, oy = 0): { ctx: CanvasRenderingContext2D; rects: number[][] } {
  const rects: number[][] = [];
  const m = { a: scale, b: 0, c: 0, d: scale, e: ox, f: oy };
  const ctx = {
    globalAlpha: 1, fillStyle: '',
    save() {}, restore() {},
    getTransform: () => m,
    fillRect(x: number, y: number, w: number, h: number) { rects.push([x * m.a + m.e, y * m.d + m.f, w * m.a, h * m.d]); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
const env: EnginePaintEnv = { fontOf: () => ({ family: 'x', weight: 400, italic: false }), image: () => null, color: (h) => `#${h}` };
const near = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 6));

describe('canvas: retângulo fino', () => {
  // 96 dpi: 1 twip = 1/15 px
  const S = 1 / 15;

  it('borda vertical de 0,48 pt centrada na divisa vira 1 px inteiro', () => {
    const { ctx, rects } = fakeCtx(S);
    // x 1975,2 tw = 131,68 px; largura 9,6 tw = 0,64 px (entre dois pixels)
    paintItems(ctx, [{ t: 'rect', x: 1975.2, y: 5820, w: 9.6, h: 350, fill: '000000' } as PageItem], env);
    near(rects[0]!, [132, 388, 1, 350 * S]);
  });

  it('horizontal também; 2 px fica 2 px; largos não mudam', () => {
    const { ctx, rects } = fakeCtx(S);
    paintItems(ctx, [
      { t: 'rect', x: 1980, y: 5820.32, w: 1980, h: 9.6, fill: '000000' },
      { t: 'rect', x: 300, y: 600, w: 30, h: 40, fill: '000000' },
      { t: 'rect', x: 3000, y: 900, w: 300, h: 600, fill: 'ff0000' },
    ] as PageItem[], env);
    near(rects[0]!, [132, 388, 132, 1]);
    near(rects[1]!, [20, 40, 2, 3]); // 2 px e 2,67 px (→ 3)
    near(rects[2]!, [200, 60, 20, 40]);
  });

  it('zoom 200%: 0,64 pt → 1 px de dispositivo continua 1 px', () => {
    expect(snapThin(1975.2, 9.6, 2 * S, 0)).toEqual([264 / (2 * S), 1 / (2 * S)]);
    // ≥ 3 px de dispositivo: intacto
    expect(snapThin(100, 60, S, 0)).toEqual([100, 60]);
  });
});

describe('canvas: texto semitransparente', () => {
  it('a opacidade do run (alpha) vale no fillText e volta depois', () => {
    const alphas: number[] = [];
    const ctx = {
      globalAlpha: 1, fillStyle: '', font: '', textAlign: '', textBaseline: '',
      save() {}, restore() {},
      fillText() { alphas.push(ctx.globalAlpha); },
    };
    const font = { metrics: { unitsPerEm: 1000 }, advanceWidth: () => 500, glyphId: () => 1 };
    const run = (alpha?: number) => ({
      t: 'glyphs', face: { key: 'k', family: 'x', font, bold: false, italic: false }, sizePt: 12, color: '808080', y: 100,
      glyphs: [{ cp: 0x41, x: 0 }], text: 'A', ...(alpha !== undefined ? { alpha } : {}),
    }) as unknown as GlyphRunItem;
    paintItems(ctx as unknown as CanvasRenderingContext2D, [run(0.05), run()], env, { alpha: 0.5 });
    expect(alphas).toEqual([0.025, 0.5]);
  });
});
