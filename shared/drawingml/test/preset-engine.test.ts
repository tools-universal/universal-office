import { describe, expect, it } from 'vitest';
import { evalPreset } from '../src/preset-engine.js';
import { presetPath } from '../src/geometry.js';
import { PRESET_DEFS } from '../src/preset-defs.js';
import type { PathSeg } from '../src/geometry.js';

/** Pontos (x,y) de um caminho (âncoras e controles). */
function pts(subs: PathSeg[][]): [number, number][] {
  const out: [number, number][] = [];
  for (const s of subs) for (const g of s) {
    if (g.c === 'M' || g.c === 'L') out.push([g.x, g.y]);
    else if (g.c === 'C') out.push([g.x1, g.y1], [g.x2, g.y2], [g.x, g.y]);
    else if (g.c === 'Q') out.push([g.x1, g.y1], [g.x, g.y]);
  }
  return out;
}

describe('preset-engine (presetShapeDefinitions oficiais)', () => {
  it('TODAS as definições avaliam para coordenadas finitas perto da caixa', () => {
    const bad: string[] = [];
    for (const name of Object.keys(PRESET_DEFS)) {
      const g = evalPreset(name, 200, 100);
      if (!g) { bad.push(`${name}: null`); continue; }
      for (const [x, y] of pts(g.subs)) {
        // callouts apontam para fora da caixa (até ~1,2×); nada além de 3× é plausível
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < -400 || x > 600 || y < -300 || y > 400) { bad.push(`${name}: (${x}, ${y})`); break; }
      }
    }
    expect(bad).toEqual([]);
  });

  it('espaço duplo na definição ("*/ vc  vf 100000") não desloca argumentos: pentágono cabe na caixa', () => {
    for (const name of ['pentagon', 'heptagon', 'star5', 'star7']) {
      const p = pts(evalPreset(name, 100, 100)!.subs);
      const ys = p.map(([, y]) => y), xs = p.map(([x]) => x);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.5);
      expect(Math.max(...ys)).toBeLessThanOrEqual(100.5);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.5);
      expect(Math.max(...xs)).toBeLessThanOrEqual(100.5);
    }
  });

  it('ajuste por NOME: avLst só com adj2 não vira adj1', () => {
    const a = pts(evalPreset('rightArrow', 200, 100, [80000], ['adj2'])!.subs);
    const b = pts(evalPreset('rightArrow', 200, 100, [80000], ['adj1'])!.subs);
    expect(a).not.toEqual(b);
  });

  it('pin: rosca com adj > 50000 não gera raio negativo (antes derrubava a pintura)', () => {
    const d = presetPath('donut', 100, 100, [90000], ['adj']);
    expect(d.kind).toBe('path');
    if (d.kind !== 'path') return;
    for (const s of d.subs) for (const g of s) if (g.c === 'E') { expect(g.rx).toBeGreaterThanOrEqual(0); expect(g.ry).toBeGreaterThanOrEqual(0); }
  });

  it('presets desenhados à mão: sem ajuste continuam os calibrados; com ajuste, os oficiais', () => {
    expect(presetPath('pentagon', 100, 100).kind).toBe('poly'); // calibrado (fitToBox)
    expect(presetPath('pentagon', 100, 100, [105146, 110557], ['hf', 'vf']).kind).toBe('path');
    // arco ajustado (0° → 180°) passa a seguir o ajuste (antes: sempre um quarto fixo)
    const q = presetPath('arc', 100, 100);
    const half = presetPath('arc', 100, 100, [0, 10800000], ['adj1', 'adj2']);
    expect(JSON.stringify(half)).not.toEqual(JSON.stringify(q));
  });
});
