import { describe, expect, it } from 'vitest';
import { formatMeasure, parseMeasure } from './spin.js';

describe('caixa numérica: medidas', () => {
  it('interpreta número sem unidade na unidade da caixa, com vírgula ou ponto', () => {
    expect(parseMeasure('1,27', 'cm')).toBe(720);
    expect(parseMeasure('1.27', 'cm')).toBe(720);
    expect(parseMeasure('8', 'pt')).toBe(160);
    expect(parseMeasure('-0,5', 'cm')).toBe(-283);
  });
  it('converte qualquer unidade digitada', () => {
    expect(parseMeasure('12 pt', 'cm')).toBe(240);
    expect(parseMeasure('1 pol', 'cm')).toBe(1440);
    expect(parseMeasure('0,5"', 'cm')).toBe(720);
    expect(parseMeasure('10 mm', 'pt')).toBe(567);
    expect(parseMeasure('2 cm', 'in')).toBe(1134);
  });
  it('recusa o que não é medida', () => {
    expect(parseMeasure('abc', 'cm')).toBeNull();
    expect(parseMeasure('3 km', 'cm')).toBeNull();
    expect(parseMeasure('', 'pt')).toBeNull();
  });
  it('formata como o Word pt-BR e en', () => {
    expect(formatMeasure(720, 'cm', 'pt')).toBe('1,27 cm');
    expect(formatMeasure(0, 'cm', 'pt')).toBe('0 cm');
    expect(formatMeasure(160, 'pt', 'pt')).toBe('8 pt');
    expect(formatMeasure(720, 'in', 'en')).toBe('0.5"');
    expect(formatMeasure(170, 'pt', 'en')).toBe('8.5 pt');
  });
});
