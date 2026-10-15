import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatValue, formatValueParts, formatGeneral, decimalDigits, builtinFormatCode } from './numfmt.js';

/**
 * Pino 1:1 com o Range.Text do Excel 365 pt-BR: numfmt-oracle.json foi MEDIDO
 * (pastas sintéticas do lab do Sheet, e1/e2/e3: literais entre placeholders,
 * vírgulas de escala, 15 significativos, condições/sinal, locale [$-409],
 * [$-F800], hora arredondada ao segundo, frações de segundo, bug de 1900…).
 * Ficam de fora os casos que dependem da largura da coluna (`*x`, "####").
 */
interface Case { v: number | string; fmt: string; text: string; note: string }
const cases = JSON.parse(readFileSync(join(__dirname, 'numfmt-oracle.json'), 'utf8')) as Case[];

describe('numfmt × Range.Text do Excel pt-BR (numfmt-oracle.json)', () => {
  it('tem casos', () => expect(cases.length).toBeGreaterThan(1000));
  for (const c of cases) {
    it(`${c.note} fmt=${JSON.stringify(c.fmt)} v=${JSON.stringify(c.v)} → ${JSON.stringify(c.text)}`, () => {
      // "builtin:N" = numFmtId N sem <numFmt> no arquivo (formato do locale pt-BR)
      const fmt = c.fmt.startsWith('builtin:') ? builtinFormatCode(+c.fmt.slice(8)) : c.fmt;
      expect(formatValue(c.v, fmt).text).toBe(c.text);
    });
  }
});

describe('partes para quem conhece a largura', () => {
  it('_x vira skip e *x vira fill (só o último *)', () => {
    const r = formatValueParts(1234.5, '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)');
    expect(r.parts).toEqual([{ t: 'skip', ch: '(' }, { t: 'fill', ch: ' ' }, { t: 'text', s: '1.234,50' }, { t: 'skip', ch: ')' }]);
    expect(formatValueParts(5, '*x0*y').parts).toEqual([{ t: 'text', s: '5' }, { t: 'fill', ch: 'y' }]);
  });
  it('zero da seção contábil "-"?? mantém os espaços dos ? (fill sem largura = 1 vez)', () => {
    expect(formatValue(0, '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-').text).toBe('  -   ');
  });
  it('Geral fica como parte (a largura decide as casas)', () => {
    expect(formatValueParts(7.26126896, 'General').parts).toEqual([{ t: 'general', v: 7.26126896 }]);
    expect(formatValueParts(5, 'General_)').parts).toEqual([{ t: 'general', v: 5 }, { t: 'skip', ch: ')' }]);
  });
  it('sem seção aplicável → overflow (####)', () => {
    expect(formatValueParts(25, '[<10]"a"0;[<20]"b"0').overflow).toBe(true);
    expect(formatValueParts(-1, 'dd/mm/yyyy').overflow).toBe(true);
    expect(formatValueParts(3000000, 'dd/mm/yyyy').overflow).toBe(true);
  });
  it('showZeros=0: zero sem seção de zero sai vazio', () => {
    expect(formatValueParts(0, 'General', { showZeros: false }).parts).toEqual([]);
    expect(formatValueParts(0, '0.00', { showZeros: false }).parts).toEqual([]);
    expect(formatValue(0, '0;-0;"zero"', { showZeros: false }).text).toBe('zero');
    expect(formatValue(-0.0001, '0.00', { showZeros: false }).text).toBe('0,00');
  });
});

describe('Geral com orçamento de caracteres (coluna estreita)', () => {
  it('reduz casas e passa a científico como o Excel', () => {
    expect(formatGeneral(7.26126896, undefined, 3)).toBe('7,3');
    expect(formatGeneral(7.26126896, undefined, 2)).toBe('7');
    expect(formatGeneral(1234567.891, undefined, 7)).toBe('1234568');
    expect(formatGeneral(1234567.891, undefined, 6)).toBe('1E+06');
    expect(formatGeneral(12345678901, undefined, 10)).toBe('1,2346E+10');
    expect(formatGeneral(0.000123456, undefined, 5)).toBe('1E-04');
    expect(formatGeneral(0.000123456, undefined, 6)).toBe('0,0001');
    expect(formatGeneral(99.999999, undefined, 8)).toBe('100');
  });
});

describe('dígitos decimais (15 significativos, metade p/ longe de zero)', () => {
  it('arredonda sobre a representação decimal', () => {
    expect(decimalDigits(0.005, 2)).toEqual(['', '01']);
    expect(decimalDigits(2.5, 0)).toEqual(['3', '']);
    expect(decimalDigits(347.99232604148267, 15)).toEqual(['347', '992326041483000']);
    expect(decimalDigits(9.995, 2)).toEqual(['10', '00']);
  });
});

describe('negativo em seção só de literais e tempo decorrido (medido, Range.Text = TEXT)', () => {
  const t = (v: number, code: string): string => formatValue(v, code, {}).text;
  it('seção única só de literais ganha o "-"', () => {
    expect(t(-5, '"x"')).toBe('-x');
    expect(t(-0.5, 'x')).toBe('-x');
    expect(t(-5, '""')).toBe('-');
    expect(t(-5, '\-')).toBe('--');
    expect(t(5, '"x"')).toBe('x');
    expect(t(-5, '"x";"y"')).toBe('y');
    expect(t(-5, 'x;')).toBe('');
  });
  it('um tempo decorrido sozinho aceita negativo; combinado, não', () => {
    expect(t(-5, '[h]')).toBe('-120');
    expect(t(-0.5, '[mm]')).toBe('-720');
    expect(t(-1.25, '[s]')).toBe('-108000');
    expect(t(-1.25, '[h] "x"')).toBe('-30 x');
    expect(formatValueParts(-1.25, '[h]:mm').overflow).toBe(true);
    expect(formatValueParts(-0.5, 'h:mm').overflow).toBe(true);
  });
});
