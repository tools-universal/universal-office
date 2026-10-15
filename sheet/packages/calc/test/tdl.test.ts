/**
 * Testes do agente FN-TEXT-DATE-LOOKUP que o banco do oráculo não cobre:
 * relógio (NOW/TODAY), datas sem ano (dependem do ano corrente), idioma en-US
 * e a ordem de textos medida com SORT no Excel.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/index.js';
import { callFn, mockContext, plain } from '../src/testing.js';
import { compareScalars, numberToText, parseDateTimeParts, parseNumberText } from '../src/coerce.js';
import { EN_US, PT_BR } from '../src/fn.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('relógio', () => {
  it('NOW/TODAY usam ctx.now()', () => {
    const ctx = mockContext({ now: 45658.75 });
    expect(callFn('NOW', [], ctx)).toBe(45658.75);
    expect(callFn('TODAY', [], ctx)).toBe(45658);
  });
});

describe('datas sem ano (ano corrente; medido em 2026)', () => {
  const d = (t: string): number | undefined => parseDateTimeParts(t, PT_BR, false, 2026)?.date;
  it('dia/mês, mês/ano e dia-mês por nome', () => {
    expect(d('1/2')).toBe(46054);
    expect(d('13/1')).toBe(46035);
    expect(d('3/2')).toBe(46056);
    expect(d('1-jan')).toBe(46023);
    expect(d('31-jan')).toBe(46053);
    expect(d('1 FEV')).toBe(46054);
    expect(d('1-fev')).toBe(46054);
    expect(d('2/24')).toBe(45323); // mês/ano
    expect(d('32-jan')).toBeUndefined();
  });
});

describe('en-US', () => {
  const ctx = mockContext({ locale: EN_US });
  it('VALUE na ordem MDY e decimal "."', () => {
    expect(parseNumberText('1/2/2024', EN_US)).toBe(45293);
    expect(parseNumberText('1,234.5', EN_US)).toBe(1234.5);
    expect(parseNumberText('$1,234.50', EN_US)).toBe(1234.5);
    expect(numberToText(1234.5, EN_US)).toBe('1234.5');
  });
  it('TEXT com o código en-US', () => {
    expect(callFn('TEXT', [45658.75, 'mm/dd/yyyy hh:mm AM/PM'], ctx)).toBe('01/01/2025 06:00 PM');
    expect(callFn('TEXT', [1234.567, '#,##0.00'], ctx)).toBe('1,234.57');
    expect(callFn('TEXT', [45658, 'General'], ctx)).toBe('45658');
    expect(callFn('DOLLAR', [-1234.567], ctx)).toBe('($1,234.57)');
    expect(callFn('FIXED', [1234.567, 1], ctx)).toBe('1,234.6');
  });
  it('booleanos e ARRAYTOTEXT no idioma', () => {
    expect(callFn('CONCATENATE', [true, 1.5], ctx)).toBe('TRUE1.5');
    expect(callFn('ARRAYTOTEXT', [[[1, 'a'], [true, 2]], 1], ctx)).toBe('{1,"a";TRUE,2}');
  });
});

describe('colação', () => {
  it('SORT de 172 textos = Excel', () => {
    const { entrada, excel } = JSON.parse(readFileSync(join(here, 'collation.sort.json'), 'utf8')) as { entrada: string[]; excel: string[] };
    const ours = entrada.map((s, i) => [s, i] as const).sort((a, b) => compareScalars(a[0], b[0]) || a[1] - b[1]).map((x) => x[0]);
    expect(ours).toEqual(excel);
  });
  it('tipos: números < textos < booleanos', () => {
    expect(plain(callFn('EXACT', ['a', 'a']))).toBe(true);
    expect(compareScalars(1, 'a')).toBe(-1);
    expect(compareScalars('z', false)).toBe(-1);
    expect(compareScalars('ß', 'ss')).toBe(0);
    expect(compareScalars('a', 'á')).toBe(-1);
  });
});
