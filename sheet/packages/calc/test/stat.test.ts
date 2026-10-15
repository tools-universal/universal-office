/**
 * Estatística (FN-STAT): o que o oráculo não cobre — colunas inteiras sem
 * materializar o intervalo, e a ordem de textos do Excel.
 */
import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { compareText } from '../src/collate.js';
import { callFn, mockContext, plain } from '../src/testing.js';
import type { FnContext } from '../src/fn.js';

/** Contexto que falha se alguém pedir os valores de uma área grande (coluna inteira). */
function guarded(cells: Record<string, unknown>): FnContext {
  const ctx = mockContext({ sheets: { S: cells as never } });
  return {
    ...ctx,
    values(ref, area = 0) {
      const a = ref.areas[area]!;
      if ((a.r2 - a.r1 + 1) * (a.c2 - a.c1 + 1) > 100000) throw new Error('materializou coluna inteira');
      return ctx.values(ref, area);
    },
  };
}

describe('colunas inteiras sem materializar', () => {
  const cells: Record<string, unknown> = {};
  for (let i = 1; i <= 200; i++) { cells[`A${i}`] = i % 7; cells[`B${i}`] = i * 1.5; cells[`C${i}`] = i % 3 ? 'x' : 'y'; }
  const ctx = guarded(cells);
  const A = { ref: 'A:A' }, B = { ref: 'B:B' }, C = { ref: 'C:C' };
  it('agregações, critérios, ordem, regressão e banco de dados', () => {
    expect(callFn('AVERAGE', [A], ctx)).toBeCloseTo(600 / 200, 0);
    expect(callFn('COUNT', [A], ctx)).toBe(200);
    expect(callFn('COUNTA', [C], ctx)).toBe(200);
    expect(callFn('COUNTBLANK', [A], ctx)).toBe(1048576 - 200);
    expect(callFn('COUNTIF', [A, '>3'], ctx)).toBe(85);
    expect(callFn('COUNTIF', [A, ''], ctx)).toBe(1048576 - 200);
    expect(callFn('COUNTIFS', [A, '<>1', C, 'y'], ctx)).toBe(57);
    expect(callFn('SUMIFS', [B, C, 'y', A, '>0'], ctx)).toBeGreaterThan(0);
    expect(callFn('MAXIFS', [B, C, 'x'], ctx)).toBe(300);
    expect(callFn('LARGE', [B, 2], ctx)).toBe(298.5);
    expect(callFn('MEDIAN', [B], ctx)).toBe(150.75);
    expect(callFn('RANK', [6, A], ctx)).toBe(1);
    let sumA = 0;
    for (let i = 1; i <= 200; i++) sumA += i % 7;
    expect(callFn('SUBTOTAL', [9, A], ctx)).toBe(sumA);
    expect(typeof callFn('CORREL', [A, B], ctx)).toBe('number');
    expect(typeof callFn('SLOPE', [B, A], ctx)).toBe('number');
    expect(plain(callFn('FREQUENCY', [A, [[2], [4]]], ctx))).toEqual([[86], [58], [56]]);
  });
});

describe('ordem de textos do Excel', () => {
  it('bate com o =SORT medido', () => {
    const words = ['ab', 'a-b', "a'b", 'a b', 'a_b', 'a.b', 'ab-', '-ab', 'a-c', 'abc', 'a~c', 'a*c', 'a?c', 'a1', 'a10', 'a2', 'A', 'a', 'Á', 'á', 'b', 'ä', 'ae', 'æ', 'ss', 'ß', 'co-op', 'coop', 'co op', "co'op"];
    // ordem medida (SORT estável: iguais ficam na ordem de entrada)
    const excel = ['A', 'a', 'Á', 'á', 'ä', 'a b', 'a*c', 'a.b', 'a?c', 'a_b', 'a~c', 'a1', 'a10', 'a2', 'ab', 'ab-', "a'b", 'a-b', '-ab', 'abc', 'a-c', 'ae', 'æ', 'b', 'co op', 'coop', "co'op", 'co-op', 'ss', 'ß'];
    expect([...words].sort(compareText)).toEqual(excel);
    expect(compareText('ß', 'ss')).toBe(0);
    expect(compareText('A', 'a')).toBe(0);
    expect(compareText('a', 'á')).toBe(-1);
  });
});
