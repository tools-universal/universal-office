/**
 * Entrada de célula × Excel 365 pt-BR (fixtures/entry-ptbr.json: o que o Excel
 * guardou para cada texto digitado via FormulaLocal/Formula2Local, em célula
 * Geral e em células já formatadas — gerado no lab _lab/calc/ui, nunca à mão).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CalcError, parseFormula } from '@universal-office/sheet-calc';
import { parseEntry, autoClose } from '../src/entry.js';
import { formatCategory, inferFormulaFormat, shouldApplyFormat, type FmtCategory } from '../src/entry-format.js';
import { editText, numberEditText } from '../src/edit-text.js';
import { formulaLocale } from '../src/formula-locale.js';

interface Case { input: string; current: FmtCategory; kind: 'value' | 'formula' | 'invalid'; v?: unknown; fmt?: number | string | null }
const fx = JSON.parse(readFileSync(new URL('./fixtures/entry-ptbr.json', import.meta.url), 'utf8')) as { cases: Case[] };
const PT = formulaLocale('pt-BR');
const EN = formulaLocale('en-US');

/**
 * Divergência aceita: o COM (FormulaLocal) guarda "+A1"/"-A1" como TEXTO; a
 * digitação na grade do Excel faz a fórmula =+A1/=-A1 (o "#NOME?" de "- texto"
 * é a queixa clássica) — seguimos a digitação.
 */
const KNOWN = new Set(['+A1', '-A1', '+5+1', '-5-1', '--5', '+-5', '- abc']);
/** Datas sem ano: o valor é do ano corrente (medido em 2026) — só o formato é comparado. */
const NO_YEAR = /^(\d+\/\d+|\d+-jan)$/;

describe('entrada × Excel pt-BR', () => {
  it('tipo, valor e formato aplicado', () => {
    const bad: string[] = [];
    for (const c of fx.cases) {
      if (KNOWN.has(c.input)) continue;
      const e = parseEntry(c.input, { locale: PT, current: c.current, row: 1, col: 1 });
      const tag = `${JSON.stringify(c.input)} [${c.current}]`;
      if (c.kind === 'invalid' || c.kind === 'formula') {
        if (e.kind !== c.kind) bad.push(`${tag}: ${e.kind} × Excel ${c.kind}`);
        continue;
      }
      if (e.kind !== 'value') { bad.push(`${tag}: ${e.kind} × Excel valor ${JSON.stringify(c.v)}`); continue; }
      const v = e.value;
      const exp = c.v as unknown;
      const sameV = exp !== null && typeof exp === 'object' && 'e' in exp
        ? v instanceof CalcError && v.code === (exp as { e: string }).e
        : typeof exp === 'number' && typeof v === 'number' ? Math.abs(v - exp) <= Math.abs(exp) * 1e-15
          : v === exp;
      if (!sameV && !(NO_YEAR.test(c.input.trim()) && typeof v === 'number')) bad.push(`${tag}: valor ${String(v)} × Excel ${JSON.stringify(exp)}`);
      const applied = e.fmt && shouldApplyFormat(c.current, e.fmt) ? e.fmt.id : null;
      if (applied !== c.fmt) bad.push(`${tag}: formato ${applied} × Excel ${c.fmt}`);
    }
    expect(bad).toEqual([]);
  });

  it('+/- que não é número vira fórmula (digitação na grade); "-" sozinho é texto', () => {
    expect(parseEntry('+A1', { locale: PT, current: 'general', row: 1, col: 1 })).toMatchObject({ kind: 'formula', text: '+A1' });
    expect(parseEntry('-A1*2', { locale: PT, current: 'general', row: 1, col: 1 })).toMatchObject({ kind: 'formula', text: '-A1*2' });
    expect(parseEntry('-', { locale: PT, current: 'general', row: 1, col: 1 })).toEqual({ kind: 'value', value: '-' });
  });

  it('fórmula vai para a forma de arquivo', () => {
    const f = (s: string, loc = PT) => {
      const e = parseEntry(s, { locale: loc, current: 'general', row: 1, col: 1 });
      return e.kind === 'formula' ? e.text : e.kind;
    };
    expect(f('=SOMA(A1;1,5)')).toBe('SUM(A1,1.5)');
    expect(f('=SE(A1>0;"sim";"não")')).toBe('IF(A1>0,"sim","não")');
    expect(f('=SEQUÊNCIA(3)')).toBe('_xlfn.SEQUENCE(3)');
    expect(f('=@A1:A3')).toBe('_xlfn.SINGLE(A1:A3)');
    expect(f('=A1#')).toBe('_xlfn.ANCHORARRAY(A1)');
    expect(f('=SOMA(1;2')).toBe('SUM(1,2)');
    expect(f('=SOMA(1;2;')).toBe('SUM(1,2,)');
    expect(f('=SUM(1;2)')).toBe('_xludf.SUM(1,2)');
    expect(f('=SUM(1,2)', EN)).toBe('SUM(1,2)');
    expect(f('=SOMA(1,2)', EN)).toBe('SOMA(1,2)');
    expect(f('=1.5')).toBe('invalid');
    expect(f('=1.5', EN)).toBe('1.5');
  });

  it('autocompletar o ")" só no caso medido', () => {
    expect(autoClose('=SOMA(1;2')).toBe('=SOMA(1;2)');
    expect(autoClose('=SE(VERDADEIRO;1')).toBe('=SE(VERDADEIRO;1)');
    expect(autoClose('=1+SOMA(1')).toBeUndefined();
    expect(autoClose('=(1+2')).toBeUndefined();
    expect(autoClose('=SOMA(ABS(1')).toBeUndefined();
    expect(autoClose('=SOMA(1)+(2')).toBeUndefined();
    expect(autoClose('=SOMA(1;"abc')).toBeUndefined();
  });

  it('en-US: números e booleanos da região/idioma', () => {
    const e = (s: string) => parseEntry(s, { locale: EN, current: 'general', row: 0, col: 0 });
    expect(e('1,234.5')).toMatchObject({ kind: 'value', value: 1234.5, fmt: { id: 4 } });
    expect(e('TRUE')).toEqual({ kind: 'value', value: true });
    expect(e('VERDADEIRO')).toEqual({ kind: 'value', value: 'VERDADEIRO' });
    expect(e('#N/A')).toMatchObject({ kind: 'value', value: CalcError.of('#N/A') });
    expect(e('$10')).toMatchObject({ kind: 'value', value: 10, fmt: { id: 6 } });
  });
});

describe('formato herdado pela fórmula (medido: entry2 p*)', () => {
  const fmts: Record<string, { id: number; code: string }> = {
    A1: { id: 14, code: 'dd/mm/yyyy' }, A2: { id: 14, code: 'dd/mm/yyyy' }, B1: { id: 8, code: '"R$ "#,##0.00' },
    C1: { id: 9, code: '0%' }, C2: { id: 2, code: '0.00' },
  };
  const at = (_s: string | undefined, r: number, c: number) => fmts[String.fromCharCode(65 + c) + (r + 1)];
  const inf = (f: string) => inferFormulaFormat(parseFormula(f, { row: 9, col: 9 }), 9, 9, at)?.id;
  it('referências, +/−, funções de agregação e de data', () => {
    expect(inf('A1')).toBe(14);
    expect(inf('A1+1')).toBe(14);
    expect(inf('1+A1')).toBe(14);
    expect(inf('-B1')).toBe(8);
    expect(inf('(B1)')).toBe(8);
    expect(inf('A1-A2')).toBeUndefined(); // data − data
    expect(inf('A1*2')).toBeUndefined();
    expect(inf('SUM(B1:B2)')).toBe(8);
    expect(inf('ROUND(B1,0)')).toBe(8);
    expect(inf('ABS(B1)')).toBeUndefined();
    expect(inf('IF(B1>0,B1,0)')).toBeUndefined();
    expect(inf('COUNT(B1:B2)')).toBeUndefined();
    expect(inf('Z9+C1')).toBe(9); // a 1ª referência com formato
    expect(inf('TODAY()')).toBe(14);
    expect(inf('NOW()')).toBe(22);
    expect(inf('TIME(1,2,3)')).toBe(18);
    expect(inf('DATE(2024,1,2)+B1')).toBe(14);
  });
});

describe('categoria do formato', () => {
  it('códigos comuns', () => {
    expect(formatCategory('General')).toBe('general');
    expect(formatCategory('0.00')).toBe('number');
    expect(formatCategory('#,##0')).toBe('number');
    expect(formatCategory('0%')).toBe('percent');
    expect(formatCategory('0.00E+00')).toBe('scientific');
    expect(formatCategory('# ?/?')).toBe('fraction');
    expect(formatCategory('m/d/yyyy')).toBe('date');
    expect(formatCategory('m/d/yyyy h:mm')).toBe('date');
    expect(formatCategory('mmm-yy')).toBe('date');
    expect(formatCategory('h:mm AM/PM')).toBe('time');
    expect(formatCategory('[h]:mm:ss')).toBe('time');
    expect(formatCategory('mm:ss.0')).toBe('time');
    expect(formatCategory('@')).toBe('text');
    expect(formatCategory('"R$"\\ #,##0;[Red]\\-"R$"\\ #,##0')).toBe('currency');
    expect(formatCategory('[$R$-416] #,##0.00')).toBe('currency');
    expect(formatCategory('[$-416]dd/mm/yyyy')).toBe('date');
    expect(formatCategory('_-"R$ "* #,##0.00_-;\\-"R$ "* #,##0.00_-')).toBe('currency');
  });
});

describe('texto de edição (barra de fórmulas)', () => {
  it('números com 15 algarismos (medido: Formula2Local de constantes)', () => {
    const t = (v: number) => numberEditText(v, ',');
    expect(t(0.1 + 0.2)).toBe('0,3');
    expect(t(1e20)).toBe('100000000000000000000');
    expect(t(1e21)).toBe('1E+21');
    expect(t(1.5e21)).toBe('1,5E+21');
    expect(t(1e-19)).toBe('0,0000000000000000001');
    expect(t(1e-20)).toBe('1E-20');
    expect(t(1.5e-20)).toBe('1,5E-20');
    expect(t(1.23456789012345e-5)).toBe('0,0000123456789012345');
    expect(t(123456789012345678)).toBe('123456789012346000');
    expect(t(1 / 3)).toBe('0,333333333333333');
    expect(t(1.0416666666666667)).toBe('1,04166666666667');
    expect(t(12345678901234.5)).toBe('12345678901234,5');
    expect(t(1.234567890123456e-16)).toBe('1,23456789012346E-16');
    expect(t(-1e25)).toBe('-1E+25');
    expect(t(1e300)).toBe('1E+300');
  });
  it('porcentagem, data e hora como a barra mostra', () => {
    expect(editText(0.125, 'percent', PT)).toBe('12,5%');
    expect(editText(45323, 'date', PT)).toBe('01/02/2024');
    expect(editText(45323.4375, 'date', PT)).toBe('01/02/2024 10:30:00');
    expect(editText(0.4375, 'time', PT)).toBe('10:30:00');
    expect(editText(45323, 'date', EN)).toBe('2/1/2024');
    expect(editText(true, 'general', PT)).toBe('VERDADEIRO');
    expect(editText(CalcError.of('#N/A'), 'general', PT)).toBe('#N/D');
    expect(editText('123', 'general', PT, { quotePrefix: true })).toBe("'123");
  });
});
