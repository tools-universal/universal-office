import { describe, expect, it } from 'vitest';
import { numText } from '../src/xls/formula.js';

// Formula2 do Excel para constantes numéricas (medido: _lab/calc/io/nums.json → nums.out.json)
const MEASURED: [number, string][] = [
  [1e-1, '0.1'], [1e-7, '0.0000001'], [1e-19, '0.0000000000000000001'], [1e-20, '1E-20'], [1e-30, '1E-30'],
  [3.7e-8, '0.000000037'], [5.6e-7, '0.00000056'], [1.23456789012345e-10, '1.23456789012345E-10'], [1.5e-12, '0.0000000000015'],
  [1e10, '10000000000'], [1e20, '100000000000000000000'], [1e21, '1E+21'], [1.5e300, '1.5E+300'], [2.675, '2.675'],
  [0.333333333333333333, '0.333333333333333'], [12345678901234.5, '12345678901234.5'], [9.99999999999999e-5, '0.0000999999999999999'],
  [1.234567e-9, '0.000000001234567'],
];

describe('número no texto da fórmula do .xls (como o Excel mostra)', () => {
  it.each(MEASURED)('%s → %s', (v, s) => expect(numText(v)).toBe(s));
});
