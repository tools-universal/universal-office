import { describe, it, expect } from 'vitest';
import { excelRowPx, excelMdw, colWidthToPx, defaultColPx, rowPtToPx, measuredFamily } from '../src/grid-metrics.js';

// Valores MEDIDOS no Excel 365 (lab do corpus, pastas sintéticas a 96 dpi).
describe('geometria do grid (Excel)', () => {
  it('altura de linha auto-ajustada por fonte', () => {
    expect(excelRowPx('Calibri', 11)).toBe(20);
    expect(excelRowPx('Calibri', 14)).toBe(25);
    expect(excelRowPx('Arial', 10)).toBe(17);
    expect(excelRowPx('Arial', 20)).toBe(34);
    expect(excelRowPx('Aptos Narrow', 11)).toBe(20);
    expect(excelRowPx('Courier New', 12, true)).toBe(22); // negrito difere
  });
  it('fonte ausente usa a Arial; nomes localizados viram a família medida', () => {
    expect(excelRowPx('Frutiger 45 Light', 10)).toBe(excelRowPx('Arial', 10));
    expect(measuredFamily('宋体')).toBe('simsun');
    expect(measuredFamily('ＭＳ Ｐゴシック')).toBe('ms pgothic');
    expect(measuredFamily('Helvetica')).toBe('arial');
  });
  it('largura do dígito máximo da fonte Normal', () => {
    expect(excelMdw('Calibri', 11)).toBe(7);
    expect(excelMdw('Calibri', 12)).toBe(8);
    expect(excelMdw('Arial', 10)).toBe(7);
    expect(excelMdw('Arial', 12)).toBe(9);
    expect(excelMdw('Verdana', 10)).toBe(8);
  });
  it('larguras de coluna em px', () => {
    expect(colWidthToPx(10, 7)).toBe(70);
    expect(colWidthToPx(9.140625, 7)).toBe(64);
    expect(colWidthToPx(10, 13)).toBe(130);
    expect(defaultColPx(7)).toBe(64);
    expect(defaultColPx(7, undefined, 10)).toBe(80);
    expect(defaultColPx(13)).toBe(120);
    expect(defaultColPx(7, 20)).toBe(140);
  });
  it('altura gravada trunca ao pixel', () => {
    expect(rowPtToPx(20)).toBe(26);
    expect(rowPtToPx(15.6)).toBe(20);
    expect(rowPtToPx(26.25)).toBe(35);
  });
});
