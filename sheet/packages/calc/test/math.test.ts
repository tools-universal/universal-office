/**
 * Regras numéricas finas de matemática medidas no Excel 365 com doubles exatos
 * (sonda do lab com bits IEEE — o banco do oráculo só aceita literais de 15
 * dígitos, porque o Excel trunca o resto ao ler a fórmula). Os valores esperados
 * abaixo são os que o Excel devolveu (Value2), não contas à mão.
 */
import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { callFn, mockContext, plain } from '../src/testing.js';
import { excelPower, snapAdd } from '../src/functions/math-util.js';

const prev = (x: number, n: number): number => {
  const b = new Float64Array([x]);
  const u = new BigInt64Array(b.buffer);
  u[0] = u[0]! - BigInt(n);
  return b[0]!;
};
const cell = (v: number) => mockContext({ sheets: { S: { A1: v } } });

describe('matemática — regras medidas com doubles exatos', () => {
  it('SIN/COS/TAN reduzem pelo π de 64 bits do x87', () => {
    expect(callFn('SIN', [1e8])).toBe(0.93163902711030622);
    expect(callFn('COS', [Math.PI / 2])).toBe(6.1257422745431001e-17);
    expect(callFn('TAN', [Math.PI / 2])).toBe(16324552277619072);
    expect(callFn('SIN', [Math.PI])).toBe(1.22514845490862e-16);
    expect(callFn('SIN', [1e6 * Math.PI])).toBe(-2.232413837122138e-10);
    expect(callFn('SIN', [134217727])).toBe(-0.95599332877267063);
    expect(plain(callFn('SIN', [134217728]))).toBe('#NUM!');
  });
  it('SUM: só a última adição tem o cancelamento (8 ulps do maior operando)', () => {
    expect(snapAdd(1, -0.99999999999999833)).toBe(0);
    expect(snapAdd(1, -0.99999999999999822)).toBe(1.7763568394002505e-15);
    expect(snapAdd(1000, -prev(1000, 4))).toBe(0);
    expect(snapAdd(1000, -prev(1000, 8))).toBe(9.0949470177292824e-13);
    expect(callFn('SUM', [0.1, 0.2, -0.3])).toBe(0);
    expect(callFn('SUM', [0.1, 0.2, -0.3, 1e-20])).toBe(5.5521151231257826e-17);
  });
  it('POWER: inteiro por quadrados sucessivos; base 10 exata; raiz ímpar', () => {
    expect(excelPower(1.1, 700)).toBe(9.4379921276728615e+28);
    expect(excelPower(1.0000001, 1e9)).toBe(2.6881038432119620e+43);
    expect(excelPower(1.1, -700)).toBe(1.0595473978707073e-29);
    expect(excelPower(10, 300)).toBe(1e300);
    expect(excelPower(10, -23)).toBe(1.0000000000000001e-23);
    expect(excelPower(-8, 1 / 3)).toBe(-1.9999999999999998);
    expect(excelPower(1.1, 700.5)).toBe(9.8986496524635402e+28);
    expect(excelPower(-1, 4294967296)).toMatchObject({ code: '#NUM!' });
    expect(excelPower(2, -1023)).toBe(0);
  });
  it('INT/FLOOR/CEILING olham 15 dígitos; EVEN/ODD/QUOTIENT não', () => {
    expect(callFn('INT', [{ ref: 'A1' }], cell(2.9999999999999996))).toBe(3);
    expect(callFn('INT', [{ ref: 'A1' }], cell(prev(100, 3)))).toBe(100);
    expect(callFn('INT', [{ ref: 'A1' }], cell(prev(100, 10)))).toBe(99);
    expect(callFn('FLOOR', [{ ref: 'A1' }, 1], cell(prev(1e6, 3)))).toBe(1e6);
    expect(callFn('EVEN', [{ ref: 'A1' }], cell(100.00000000000001))).toBe(102);
    expect(callFn('QUOTIENT', [{ ref: 'A1' }, 1], cell(2.9999999999999996))).toBe(2);
  });
  it('MROUND sobe com parte fracionária ≥ 0,5 − 5E-15', () => {
    expect(callFn('MROUND', [{ ref: 'A1' }, 1], cell(1.4999999999999951))).toBe(2);
    expect(callFn('MROUND', [{ ref: 'A1' }, 1], cell(1.4999999999999949))).toBe(1);
    expect(callFn('MROUND', [6.05, 0.1])).toBe(6);
    expect(callFn('MROUND', [0.15, 0.1])).toBe(0.2);
  });
  it('ROUND* usam o número com 15 dígitos', () => {
    expect(callFn('ROUND', [2.675, 2])).toBe(2.68);
    expect(callFn('ROUNDDOWN', [{ ref: 'A1' }, 14], cell(1.2345678901234567))).toBe(1.23456789012346);
    expect(callFn('ROUNDUP', [0.30000000000000004, 16])).toBe(0.3);
    expect(callFn('ROUND', [1.5, 2147483647])).toBe(0);
  });
});
