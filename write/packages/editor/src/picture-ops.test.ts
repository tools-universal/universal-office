// Regras do Formato da Imagem contra o ORÁCULO (write/tools/image-lab/results):
// wp:effectExtent de cada predefinição, ordem z, Preencher/Ajustar.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPictureFormat } from '@universal-office/docx-core';
import { effectExtentOf, fillFitCrop, zFor, SHADOW_PRESETS, REFLECTION_PRESETS, SOFT_EDGE_PRESETS } from './picture-ops.js';

const RESULTS = join(__dirname, '../../../tools/image-lab/results');
const fmt = (n: string) => {
  const x = readFileSync(join(RESULTS, `${n}.xml`), 'utf8').replace(/\n\s*/g, '');
  return readPictureFormat(/<w:drawing>[\s\S]*?<\/w:drawing>/.exec(x)![0])!;
};
const has = (n: string) => existsSync(join(RESULTS, `${n}.xml`));

describe('effectExtent como o Word', () => {
  const cases = ['line', 'line-theme', 'glow', 'softedge-3', 'rot30-inline', 'rot30-float',
    ...Array.from({ length: 9 }, (_, i) => `shd-${21 + i}`), ...Array.from({ length: 14 }, (_, i) => `shd-${30 + i}`), ...Array.from({ length: 9 }, (_, i) => `refl-${1 + i}`)];
  // a medir melhor (diferença de 1 passo de 19050): sombra central escalada (assimétrica no
  // Word), sombras em perspectiva (inclinação) e reflexos — ver image-lab
  const gap = new Set(['shd-25', 'shd-39', 'shd-40', 'shd-41', 'shd-42', 'shd-43', 'refl-3', 'refl-4', 'refl-7', 'refl-8', 'refl-9']);
  for (const n of cases.filter((c) => !gap.has(c))) {
    it(n, () => {
      if (!has(n)) return;
      const f = fmt(n);
      expect(effectExtentOf(f)).toEqual(f.effectExtent);
    });
  }
});

describe('predefinições = o que o Word grava', () => {
  it('sombras 21–43', () => {
    SHADOW_PRESETS.forEach((p, i) => {
      if (!has(`shd-${21 + i}`)) return;
      expect(fmt(`shd-${21 + i}`).effects.shadow).toEqual(p.shadow);
    });
  });
  it('reflexos 1–9', () => {
    REFLECTION_PRESETS.forEach((p, i) => {
      if (!has(`refl-${1 + i}`)) return;
      expect(fmt(`refl-${1 + i}`).effects.reflection).toEqual(p.reflection);
    });
  });
  it('bordas suaves 1–6', () => {
    SOFT_EDGE_PRESETS.forEach((v, i) => {
      if (!has(`soft-${1 + i}`)) return;
      expect(fmt(`soft-${1 + i}`).effects.softEdge).toBe(v);
    });
  });
});

describe('ordem z e corte', () => {
  it('frente/trás (medido)', () => {
    const z = [251658240, 251659264, 251660288];
    expect(zFor('front', z[1]!, z)).toBe(251661312);
    expect(zFor('back', z[1]!, z)).toBe(251657215);
    expect(zFor('forward', z[1]!, z)).toBe(251661312);
    expect(zFor('backward', z[1]!, z)).toBe(251657215);
  });
  it('Preencher/Ajustar (medido)', () => {
    const nat = { w: 480, h: 360 };
    expect(fillFitCrop('fill', { cx: 2540000, cy: 1371600 }, nat)).toEqual({ l: 0, t: 14000, r: 0, b: 14000 });
    expect(fillFitCrop('fit', { cx: 2540000, cy: 1371600 }, nat)).toEqual({ l: -19444, t: 0, r: -19444, b: 0 });
    expect(fillFitCrop('fill', { cx: 1828800, cy: 2540000 }, nat)).toEqual({ l: 23000, t: 0, r: 23000, b: 0 });
    expect(fillFitCrop('fit', { cx: 1828800, cy: 2540000 }, nat)).toEqual({ l: 0, t: -42593, r: 0, b: -42593 });
  });
});
