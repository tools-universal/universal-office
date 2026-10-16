import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { PT_BR } from '../src/fn.js';
import { plain } from '../src/testing.js';

// Medido (.xls com ATP como suplemento, Excel pt-BR via COM — _lab/calc/io/out/make4, corpus lo-iseven/lo-besselj)
describe('funções do ATP chamadas como suplemento (.xls)', () => {
  it('resolve pelo nome no idioma; nome em inglês que difere fica #NAME? com @', () => {
    const e = new Engine({ sheets: [{ name: 'S', cells: [
      [0, 0, { v: 4 }],
      [0, 1, { f: { text: '_xll.ISEVEN(A1)' } }],
      [0, 2, { f: { text: '_xll.ÉPAR(A1)' } }],
      [0, 3, { f: { text: '_xll.BESSELJ(2.5,1)' } }],
    ] }] }, { locale: PT_BR });
    e.recalc();
    expect([plain(e.getValue(0, 0, 1)), e.getValue(0, 0, 2), typeof e.getValue(0, 0, 3)]).toEqual(['#NAME?', true, 'number']);
    expect(e.formulaDisplay(0, 0, 1)).toBe('=@ISEVEN(A1)');
    expect(e.formulaDisplay(0, 0, 3)).toBe('=BESSELJ(2.5,1)');
  });
});
