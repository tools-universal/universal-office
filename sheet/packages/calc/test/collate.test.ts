import { describe, expect, it } from 'vitest';
import { compareNumbers, compareText } from '../src/collate.js';

describe('ordem de textos e números do Excel', () => {
  it('ordem medida (97×97 pares em cmp.cases e o SORT de 172 textos do FN-TDL)', () => {
    // sequência estritamente crescente medida no Excel 365 pt-BR
    const asc = ["'", '-', ' ', '!', '"', '#', '_', '~', '¡', '£', '€', '+', '<', '=', '>', '±', '×', '÷', '§', '°', 'µ', '0', '01', '½', '1', '-1', '¹', '10', '1a', '2', '²',
      '9', 'a', 'a-', '-a', 'ª', 'á', 'à', 'â', 'ä', 'ã', 'å', 'a b', 'a,b', 'a.b', 'a_b', 'a1', 'a10', 'a2', 'aa', 'ab', 'ab-', "a'b", 'a-b', 'a--b', '-ab', 'ac',
      'a-c', 'æ', 'b', 'c', 'ç', 'co op', 'coop', 'co-op', 'ǆ', 'é', 'ﬁ', 'ı', 'İ', 'ñ', 'ŉ', 'ø', 'œ', 'ß', 'st', 'ÿ', 'z', 'α', 'Ω', 'я', 'ｱ', 'ア', 'あ', '😀', '中'];
    for (let i = 0; i + 1 < asc.length; i++) expect(compareText(asc[i]!, asc[i + 1]!), `${asc[i]} < ${asc[i + 1]}`).toBe(-1);
    for (const [a, b] of [['A', 'a'], ['ß', 'ss'], ['æ', 'ae'], ['ﬁ', 'fi'], ['ǆ', 'dž'], ['a­b', 'ab'], ['Ç', 'ç'], ['AB', 'ab']]) expect(compareText(a!, b!), `${a} = ${b}`).toBe(0);
    expect(compareText('a', 'Ａ')).toBe(-1);
  });
  it('números a 15 algarismos', () => {
    expect(compareNumbers(0.1 + 0.2, 0.3)).toBe(0);
    expect(compareNumbers(1 + 20 * 2 ** -52, 1)).toBe(0);
    expect(compareNumbers(1 + 24 * 2 ** -52, 1)).toBe(1);
    expect(compareNumbers(1e15 + 4, 1e15)).toBe(0);
    expect(compareNumbers(1e15 + 5, 1e15)).toBe(1);
    expect(compareNumbers(5.551115123125783e-17, 0)).toBe(1);
  });
});
