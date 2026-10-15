import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { callFn, mockContext, plain } from '../src/testing.js';
import { numberToText, parseNumberText, toBool } from '../src/coerce.js';
import { parseCriterion, wildcardRegExp } from '../src/criteria.js';
import { serialToYmd, weekday, ymdToSerial } from '../src/dates.js';
import { EN_US, type ValueLocale } from '../src/fn.js';
import { ERR } from '../src/values.js';

const PT: ValueLocale = { ...EN_US, id: 'pt-BR', decimal: ',', group: '.', trueText: 'VERDADEIRO', falseText: 'FALSO', dateOrder: 'DMY' };

describe('contrato', () => {
  it('levanta escalar sobre matriz e referência', () => {
    expect(plain(callFn('ABS', [[[-1, 2], [-3, 'x']]]))).toEqual([[1, 2], [3, '#VALUE!']]);
    const ctx = mockContext({ sheets: { S: { A1: -5, A2: 6 } }, at: 'C2' });
    expect(plain(callFn('ABS', [{ ref: 'A1:A2' }], ctx))).toEqual([[5], [6]]);
    // legado: interseção implícita com a linha da fórmula
    expect(callFn('ABS', [{ ref: 'A1:A2' }], ctx, false)).toBe(6);
    expect(callFn('ABS', [ERR.NA])).toBe(ERR.NA);
  });
  it('conversões', () => {
    expect(numberToText(0.1 + 0.2)).toBe('0.3');
    expect(numberToText(1234.5, PT)).toBe('1234,5');
    expect(numberToText(123456789012345678)).toBe('1.23456789012346E+17');
    expect(parseNumberText('1.234,5', PT)).toBe(1234.5);
    expect(parseNumberText('50%')).toBe(0.5);
    expect(parseNumberText('(3)')).toBe(-3);
    expect(parseNumberText('abc')).toBeUndefined();
    expect(toBool('verdadeiro', PT)).toBe(true);
  });
  it('datas 1900', () => {
    expect(ymdToSerial(1900, 1, 1)).toBe(1);
    expect(ymdToSerial(1900, 3, 1)).toBe(61);
    expect(ymdToSerial(2025, 1, 1)).toBe(45658);
    expect(serialToYmd(60)).toEqual({ y: 1900, m: 2, d: 29 });
    expect(serialToYmd(45658)).toEqual({ y: 2025, m: 1, d: 1 });
    expect(weekday(1)).toBe(0);
    expect(weekday(45658)).toBe(3);
    expect(parseNumberText('31/12/2024', PT)).toBe(45657);
  });
  it('critérios', () => {
    expect(parseCriterion('>=2')(3)).toBe(true);
    expect(parseCriterion('a*')('Abc')).toBe(true);
    expect(parseCriterion('<>')(null)).toBe(false);
    expect(parseCriterion('')(null)).toBe(true);
    expect(wildcardRegExp('~*').test('*')).toBe(true);
  });
});
