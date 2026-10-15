import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { plain } from '../src/testing.js';
import { a1ToCell } from '../src/a1.js';
import type { CellInput } from '../src/workbook.js';
import { ERR, type Scalar } from '../src/values.js';

/** Pasta de uma aba a partir de {"A1": valor | "=fórmula"}. */
function book(cells: Record<string, Scalar>, more: Record<string, Record<string, Scalar>> = {}, legacy = false): Engine {
  const conv = (m: Record<string, Scalar>): [number, number, CellInput][] => Object.entries(m).map(([k, v]) => {
    const p = a1ToCell(k)!;
    if (typeof v === 'string' && v.startsWith('=')) return [p.row, p.col, { f: legacy ? { text: v.slice(1) } : { text: v.slice(1), t: 'array', dynamic: true } }];
    return [p.row, p.col, { v }];
  });
  const sheets = [{ name: 'Sheet1', cells: conv(cells) }, ...Object.entries(more).map(([name, m]) => ({ name, cells: conv(m) }))];
  const e = new Engine({ sheets });
  e.recalc();
  return e;
}
const val = (e: Engine, ref: string, sheet = 0): unknown => { const p = a1ToCell(ref)!; return plain(e.getValue(sheet, p.row, p.col)); };

describe('motor', () => {
  it('aritmética e precedência', () => {
    const e = book({ A1: 2, A2: 3, B1: '=A1+A2*2', B2: '=-A1^2', B3: '=2^3^2', B4: '=(A1+A2)%', B5: '="x"&A1&TRUE', B6: '=1/0', B7: '=A9', B8: '="a"="A"', B9: '=1<"a"' });
    expect([val(e, 'B1'), val(e, 'B2'), val(e, 'B3'), val(e, 'B4'), val(e, 'B5'), val(e, 'B6'), val(e, 'B7'), val(e, 'B8'), val(e, 'B9')])
      .toEqual([8, 4, 64, 0.05, 'x2TRUE', '#DIV/0!', 0, true, true]);
  });
  it('cadeia longa sem estourar a pilha', () => {
    const cells: Record<string, Scalar> = { A1: 1 };
    for (let i = 2; i <= 20000; i++) cells[`A${i}`] = `=A${i - 1}+1`;
    const e = book(cells);
    expect(val(e, 'A20000')).toBe(20000);
  });
  it('derrama e bloqueia', () => {
    const e = book({ A1: '={1;2;3}', B1: '=A1#*10', C1: '=ROWS(A1#)' });
    expect([val(e, 'A2'), val(e, 'A3'), val(e, 'B3'), val(e, 'C1')]).toEqual([2, 3, 30, 3]);
    const f = book({ A1: '={1;2;3}', A3: 'x' });
    expect(val(f, 'A1')).toBe('#SPILL!');
  });
  it('legado: interseção implícita', () => {
    const e = book({ A1: 1, A2: 2, A3: 3, B2: '=A1:A3*10', B5: '=A1:A3*10' }, {}, true);
    expect([val(e, 'B2'), val(e, 'B5')]).toEqual([20, '#VALUE!']);
  });
  it('IF, LET, LAMBDA, MAP', () => {
    const e = book({
      A1: 1, A2: 5, A3: 10,
      B1: '=IF(A1>2,"big","small")', B2: '=IF(A1:A3>2,"big","small")',
      C1: '=LET(x,A2*2,y,x+1,x*y)', C2: '=LAMBDA(a,b,a*b)(3,4)', C3: '=MAP(A1:A3,LAMBDA(v,v*v))',
      D1: '=IFERROR(1/0,"err")', D2: '=CHOOSE(2,"a","b","c")', D3: '=AND(A1:A3)', D4: '=OR(A1>5,A2>5)',
      E1: '=REDUCE(0,A1:A3,LAMBDA(a,v,a+v))', E2: '=SCAN(0,A1:A3,LAMBDA(a,v,a+v))', E5: '=MAKEARRAY(2,2,LAMBDA(r,c,r*10+c))',
    });
    expect([val(e, 'B1'), val(e, 'B2'), val(e, 'B3'), val(e, 'C1'), val(e, 'C2'), val(e, 'C3'), val(e, 'C5')]).toEqual(['small', 'small', 'big', 110, 12, 1, 100]);
    expect([val(e, 'D1'), val(e, 'D2'), val(e, 'D3'), val(e, 'D4'), val(e, 'E1'), val(e, 'E4'), val(e, 'F6')]).toEqual(['err', 'b', true, false, 16, 16, 22]);
  });
  it('INDEX, OFFSET, INDIRECT, ROW/COLUMN', () => {
    const e = book({
      A1: 1, A2: 2, A3: 3, B1: 4, B2: 5, B3: 6,
      C1: '=INDEX(A1:B3,2,2)', C2: '=ROWS(INDEX(A1:B3,0,1))', C3: '=OFFSET(A1,2,1)', C4: '=INDIRECT("B"&2)', C5: '=INDIRECT("R3C1",FALSE)',
      C6: '=ROW()', C7: '=COLUMN(B9)', C8: '=SHEET(Plan2!A1)', C9: '=Plan2!A1*2',
    }, { Plan2: { A1: 21 } });
    expect([val(e, 'C1'), val(e, 'C2'), val(e, 'C3'), val(e, 'C4'), val(e, 'C5'), val(e, 'C6'), val(e, 'C7'), val(e, 'C8'), val(e, 'C9')])
      .toEqual([5, 3, 6, 5, 3, 6, 2, 2, 42]);
  });
  it('edição incremental', () => {
    const e = book({ A1: 1, B1: '=A1*2', C1: '=B1+1', D1: 7 });
    expect(val(e, 'C1')).toBe(3);
    e.setCell(0, 0, 0, { v: 10 });
    e.calculate();
    expect(val(e, 'C1')).toBe(21);
    e.setCell(0, 0, 1, { f: { text: 'D1*3', t: 'array', dynamic: true } });
    e.calculate();
    expect(val(e, 'C1')).toBe(22);
  });
  it('referência circular: sem iterativo ficam os valores anteriores (0)', () => {
    const e = book({ A1: '=B1+1', B1: '=A1+1', C1: '=A1*2' });
    expect(e.circular.size).toBe(2);
    expect([val(e, 'A1'), val(e, 'B1'), val(e, 'C1')]).toEqual([0, 0, 0]);
    void ERR;
  });
  it('ciclo só estático (ramo de IF não escolhido) não é circular', () => {
    const e = book({ A1: '=IF(FALSE,B1,5)', B1: '=A1+1', C1: '=IF(B1>100,C1,7)' });
    expect([val(e, 'A1'), val(e, 'B1'), val(e, 'C1')]).toEqual([5, 6, 7]);
    expect(e.circular.size).toBe(0);
  });
  it('cálculo iterativo', () => {
    const e = new Engine({ sheets: [{ name: 'S', cells: [[0, 0, { f: { text: 'B1/2+1' } }], [0, 1, { f: { text: 'A1' } }]] }], calc: { iterate: true, iterateCount: 100, iterateDelta: 1e-9 } });
    e.recalc();
    expect(e.getValue(0, 0, 0)).toBeCloseTo(2, 6);
  });
  it('mudanças para a UI e texto de tela', () => {
    const e = book({ A1: 1, B1: '={1;2}*A1', C1: '=_xlfn.SINGLE(A1:A3)' });
    e.takeChanges();
    e.setCell(0, 0, 0, { v: 5 });
    e.calculate();
    const ch = e.takeChanges().map((c) => `${c.row},${c.col}`).sort();
    expect(ch).toEqual(['0,0', '0,1', '0,2', '1,1']);
    expect(e.formulaDisplay(0, 0, 2)).toBe('=@A1:A3');
    expect(e.spillOf(0, 0, 1)).toEqual({ sheet: 0, r1: 0, c1: 1, r2: 1, c2: 1 });
  });
});
