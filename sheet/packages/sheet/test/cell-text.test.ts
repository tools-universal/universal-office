import { describe, expect, it } from 'vitest';
import { layoutCellText, cellMarginPx, isoToSerial, localizeError, type FontMetrics } from '../src/cell-text.js';

/**
 * Range.Text MEDIDO no Excel 365 pt-BR (lab do Sheet, e2/e5/e7) para a Calibri
 * 11 (15 ppem): larguras GDI dígito 7, "," "." 4, "-" 5, espaço 3, "#" 7…
 */
const W: Record<string, number> = {
  '0': 7, '1': 7, '2': 7, '3': 7, '4': 7, '5': 7, '6': 7, '7': 7, '8': 7, '9': 7,
  ',': 4, '.': 4, '-': 5, '+': 7, E: 7, '#': 7, x: 7, ' ': 3, '(': 5, ')': 5, a: 7, b: 8, c: 6, R: 8, $: 7,
};
const calibri11: FontMetrics = { ppem: 15, adv: (ch) => W[ch] ?? 7 };
const num = (v: number, code: string | undefined, px: number): string => layoutCellText({ kind: 'number', num: v, code }, calibri11, px).text;

describe('margem do Excel por ppem', () => {
  it('5 px até 16 ppem, 7 até 24, 9 até 32', () => {
    expect(cellMarginPx(15)).toBe(5);
    expect(cellMarginPx(16)).toBe(5);
    expect(cellMarginPx(17)).toBe(7);
    expect(cellMarginPx(24)).toBe(7);
    expect(cellMarginPx(25)).toBe(9);
  });
});

describe('Geral na largura da coluna', () => {
  it('reduz casas pelas vagas de dígito', () => {
    expect(num(7.26126896, 'General', 24)).toBe('7');
    expect(num(7.26126896, 'General', 28)).toBe('7,3');
    expect(num(7.26126896, 'General', 70)).toBe('7,261269');
    expect(num(7.26126896, 'General', 77)).toBe('7,26126896');
    expect(num(-7.26126896, 'General', 31)).toBe('-7,3');
  });
  it('científico e #### pela largura real', () => {
    expect(num(1234567.891, 'General', 42)).toBe('1E+06');
    expect(num(1234567.891, 'General', 38)).toBe('####');
    expect(num(0.000123456, 'General', 42)).toBe('1E-04');
    expect(num(0.000123456, 'General', 49)).toBe('0,0001');
  });
  it('coluna de largura 0: 1 dígito arredondado ou "#"', () => {
    expect(num(2, 'General', 0)).toBe('2');
    expect(num(42, 'General', 0)).toBe('#');
    expect(num(0.5, 'General', 3)).toBe('1');
  });
});

describe('#### e preenchimento *x', () => {
  it('número formatado que não cabe vira # × ⌊(coluna − 5)/7⌋', () => {
    expect(num(1234.5, '0.00', 49)).toBe('######');
    expect(num(1234.5, '0.00', 56)).toBe('1234,50');
    expect(num(1234.5, '0.00', 7)).toBe('');
  });
  it('*x repete até a coluna; _x conta um espaço', () => {
    expect(num(1234.5, '0* ', 42)).toBe('1235   ');
    expect(num(1234.5, '* 0', 49)).toBe('     1235');
    expect(num(1234.5, '0*x', 63)).toBe('1235xxxx');
    expect(num(1234.5, '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)', 63)).toBe(' 1.234,50 ');
    expect(num(1234.5, '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)', 70)).toBe('    1.234,50 ');
    expect(num(1234.5, '0_W', 42)).toBe('1235 ');
  });
  it('texto com *x também vira ####', () => {
    const t = (px: number): string => layoutCellText({ kind: 'text', str: 'abc', code: '@*.' }, calibri11, px).text;
    expect(t(35)).toBe('abc..');
    expect(t(21)).toBe('##');
  });
  it('recuo tira largura útil', () => {
    const r = layoutCellText({ kind: 'number', num: 100, code: '_-* #,##0.0_-;_-* #,##0.0\\-;_-* "-"??_-;_-@_-', indentPx: 9 }, calibri11, 55).text;
    const r0 = layoutCellText({ kind: 'number', num: 100, code: '_-* #,##0.0_-;_-* #,##0.0\\-;_-* "-"??_-;_-@_-' }, calibri11, 55).text;
    expect(r0.length - r.length).toBe(3);
  });
});

describe('valores', () => {
  it('erros em pt-BR', () => {
    expect(localizeError('#VALUE!')).toBe('#VALOR!');
    expect(localizeError('#N/A')).toBe('#N/D');
    expect(localizeError('#NUM!')).toBe('#NÚM!');
    expect(localizeError('#NAME?')).toBe('#NOME?');
    expect(localizeError('#NULL!')).toBe('#NULO!');
  });
  it('data ISO (t="d") → serial', () => {
    expect(isoToSerial('2025-06-30')).toBe(45838);
    expect(isoToSerial('2025-06-30T12:00:00')).toBe(45838.5);
    expect(isoToSerial('1900-01-01')).toBe(1);
  });
  it('showZeros=0 esconde o zero sem seção própria', () => {
    expect(layoutCellText({ kind: 'number', num: 0, code: 'General', showZeros: false }, calibri11, 64).text).toBe('');
    expect(layoutCellText({ kind: 'number', num: 0, code: '0;-0;"zero"', showZeros: false }, calibri11, 64).text).toBe('zero');
  });
});
