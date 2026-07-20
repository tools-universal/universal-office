import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatValue, formatGeneral, builtinFormatCode } from '../src/format.js';

/**
 * Pino de fidelidade 1:1: o motor de formatação tem que reproduzir EXATAMENTE
 * o Range.Text do app de referência (pt-BR), capturado em
 * tools/excel-lab/results/oracle-format.json pelo harness COM
 * (gen-oracle-xlsx.mjs + read-oracle-xlsx.ps1).
 */
const oraclePath = join(__dirname, '../../../tools/excel-lab/results/oracle-format.json');

interface OracleCase { v: number | string; fmt: string; text: string; halign: string; note: string; }

function loadOracle(): OracleCase[] {
  if (!existsSync(oraclePath)) return [];
  const raw = readFileSync(oraclePath, 'utf8').replace(/^﻿/, '');
  return JSON.parse(raw) as OracleCase[];
}

describe('motor de formatação vs app de referência (oracle-format.json)', () => {
  const cases = loadOracle();

  it('o oráculo existe e foi capturado', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    const value = typeof c.v === 'string' ? c.v : Number(c.v);
    // `* ` (preenchimento) é dependente da largura da coluna → compara normalizado.
    const widthDependent = c.fmt.includes('* ');
    const norm = (s: string) => (widthDependent ? s.replace(/\s+/g, ' ').trim() : s);
    it(`fmt=${JSON.stringify(c.fmt)} v=${c.v} → ${JSON.stringify(c.text)}`, () => {
      const { text } = formatValue(value, c.fmt);
      expect(norm(text)).toBe(norm(c.text));
    });
  }
});

describe('formatGeneral — limites de 11 caracteres e científico', () => {
  it('inteiros e decimais simples', () => {
    expect(formatGeneral(0)).toBe('0');
    expect(formatGeneral(42)).toBe('42');
    expect(formatGeneral(-42)).toBe('-42');
    expect(formatGeneral(0.1)).toBe('0,1');
  });
  it('vira científico quando não cabe em 11 caracteres', () => {
    expect(formatGeneral(123456789012)).toBe('1,23457E+11');
    expect(formatGeneral(1e-10)).toBe('1E-10');
    expect(formatGeneral(1e20)).toBe('1E+20');
  });
});


describe('builtins dependentes de locale + fixes do oráculo 2026-07-01', () => {
  // Oráculo COM (builtin-probe.xlsx): xf numFmtId=14..22 exibidos no Excel pt-BR
  it('builtinFormatCode honra o locale pt-BR (ids 14-22)', () => {
    expect(formatValue(46190, builtinFormatCode(14)!).text).toBe('17/06/2026');
    expect(formatValue(46190, builtinFormatCode(15)!).text).toBe('17/jun/26');
    expect(formatValue(46190, builtinFormatCode(16)!).text).toBe('17/jun');
    expect(formatValue(46190, builtinFormatCode(17)!).text).toBe('jun/26');
    expect(formatValue(46190.604861, builtinFormatCode(20)!).text).toBe('14:30');
    expect(formatValue(46190.604861, builtinFormatCode(22)!).text).toBe('17/06/2026 14:30');
  });

  it('zero insignificante em slot # decimal é suprimido mesmo com 0s depois', () => {
    // showcase TextoENumeros!B5: Excel mostra "R$ 1999,9000"
    expect(formatValue(1999.9, '"R$"\\ #.##000').text).toBe('R$ 1999,9000');
  });

  it('científico com grupo na mantissa usa passo de engenharia (#,000E+00)', () => {
    // showcase TextoENumeros!B7: Excel mostra "123E+04"
    expect(formatValue(1234567, '#,000E+00').text).toBe('123E+04');
    expect(formatValue(46190.604861, '##0.0E+0').text).toBe('46,2E+3');
  });
});