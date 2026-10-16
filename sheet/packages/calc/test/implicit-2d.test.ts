import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { plain } from '../src/testing.js';

// Medido no Excel (_lab/calc/io/make3.json, w-ii): fórmula LEGADA (Range.Formula) numa aba
// apontando para uma área 2D de outra aba — interseção implícita pela linha E pela coluna.
describe('interseção implícita com área 2D', () => {
  it('dentro das duas faixas: a célula; fora: #VALUE!', () => {
    const s1: [number, number, { v: number }][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s1.push([r, c, { v: r * 3 + c + 1 }]);
    const e = new Engine({
      sheets: [
        { name: 'S1', cells: s1 },
        { name: 'S2', cells: [[1, 1, { f: { text: 'S1!A1:C3' } }], [2, 0, { f: { text: 'S1!A1:C3+0' } }], [3, 1, { f: { text: 'S1!A1:C3*1' } }], [4, 4, { f: { text: 'S1!A1:C3' } }]] },
      ],
    });
    e.recalc();
    expect([e.getValue(1, 1, 1), e.getValue(1, 2, 0), plain(e.getValue(1, 3, 1)), plain(e.getValue(1, 4, 4))]).toEqual([5, 7, '#VALUE!', '#VALUE!']);
  });
});
