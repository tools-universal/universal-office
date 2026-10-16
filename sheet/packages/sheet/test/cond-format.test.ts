import { describe, expect, it } from 'vitest';
import type { CondFormat, Dxf } from '@universal-office/sheet-core';
import { CfEngine, lerpTrunc, parseSqref, type CfSheetAccess } from '../src/cond-format.js';
import { evalFormula, FErr, type FCtx, type FScalar } from '../src/cf-formula.js';

/** Aba de teste: grade esparsa (col,row) → valor. */
function sheet(cells: Record<string, FScalar>, dxfs: Dxf[] = []): CfSheetAccess {
  const m = new Map<string, FScalar>(Object.entries(cells));
  const pos = (k: string): [number, number] => { const [c, r] = k.split(',').map(Number); return [c!, r!]; };
  return {
    value: (c, r) => m.get(`${c},${r}`) ?? null,
    each: (c1, r1, c2, r2, fn) => { for (const [k, v] of m) { const [c, r] = pos(k); if (c >= c1 && c <= c2 && r >= r1 && r <= r2) fn(v, c, r); } },
    dxfs, today: 46310,
  };
}

describe('sqref', () => {
  it('células, intervalos e colunas inteiras', () => {
    expect(parseSqref('A1:B3 D5')).toEqual([{ c1: 1, r1: 1, c2: 2, r2: 3 }, { c1: 4, r1: 5, c2: 4, r2: 5 }]);
    expect(parseSqref('A1:A1048576')[0]).toEqual({ c1: 1, r1: 1, c2: 1, r2: 1048576 });
  });
});

describe('escala de cor (medida no Excel, t-cf)', () => {
  it('canal = a + trunc((b − a)·t)', () => {
    expect(lerpTrunc('#FF0000', '#0000FF', 0.1)).toBe('#e60019');
    expect(lerpTrunc('#FF0000', '#0000FF', 0.3)).toBe('#b3004c');
  });
  it('casos de borda medidos (t-cs2): meio preso, mín = máx, pontos invertidos', () => {
    const sc = (vals: number[], stops: { type: string; value?: number; color: string }[]): (string | undefined)[] => {
      const cells: Record<string, FScalar> = {};
      vals.forEach((v, i) => { cells[`1,${i + 1}`] = v; });
      const eng = new CfEngine([{ sqref: 'A1:A9', rules: [{ type: 'colorScale', priority: 1, stops }] }], sheet(cells));
      return vals.map((_, i) => eng.at(1, i + 1)?.fill?.fgColor?.toLowerCase());
    };
    const R = '#ff0000', Y = '#ffff00', G = '#00ff00', B = '#0000ff';
    expect(sc([1, 2, 2], [{ type: 'min', color: R }, { type: 'percentile', value: 50, color: Y }, { type: 'max', color: G }])).toEqual([R, G, G]);
    expect(sc([1, 2, 3], [{ type: 'min', color: R }, { type: 'num', value: 5, color: Y }, { type: 'max', color: G }])).toEqual([R, '#ff7f00', Y]);
    expect(sc([1, 2, 3], [{ type: 'min', color: R }, { type: 'num', value: 0, color: Y }, { type: 'max', color: G }])).toEqual([Y, '#80ff00', G]);
    expect(sc([5, 5, 5], [{ type: 'min', color: R }, { type: 'max', color: B }])).toEqual([B, B, B]);
    expect(sc([1, 2, 3, 4], [{ type: 'num', value: 3, color: R }, { type: 'num', value: 2, color: B }])).toEqual([R, R, B, B]);
  });
  it('2 cores min→max sobre as células existentes da coluna inteira', () => {
    const cells: Record<string, FScalar> = {};
    for (let i = 0; i <= 10; i++) cells[`1,${i + 1}`] = i;
    const cf: CondFormat[] = [{ sqref: 'A1:A1048576', rules: [{ type: 'colorScale', priority: 1, stops: [{ type: 'min', color: '#FF0000' }, { type: 'max', color: '#0000FF' }] }] }];
    const eng = new CfEngine(cf, sheet(cells));
    expect(eng.at(1, 6)?.fill?.fgColor).toBe('#80007f');
    expect(eng.at(1, 1)?.fill?.fgColor?.toLowerCase()).toBe('#ff0000');
    expect(eng.at(1, 500)).toBeUndefined(); // vazia: escala não pinta
  });
});

describe('regras com dxf', () => {
  const red: Dxf = { fill: { pattern: 'solid', fgColor: '#ff0000' }, fontColor: '#990000' };
  const bold: Dxf = { bold: true, fontColor: '#0000ff' };
  it('vazia vale 0 em cellIs; prioridade por propriedade; stopIfTrue', () => {
    const s = sheet({ '1,1': 10, '1,2': 3 }, [red, bold]);
    const eng = new CfEngine([{ sqref: 'A1:A3', rules: [
      { type: 'cellIs', priority: 2, operator: 'greaterThan', formula: ['2'], dxfId: 1 },
      { type: 'cellIs', priority: 1, operator: 'greaterThan', formula: ['5'], dxfId: 0, stopIfTrue: true },
      { type: 'cellIs', priority: 3, operator: 'lessThan', formula: ['4'], dxfId: 0 },
    ] }], s);
    const a1 = eng.at(1, 1)!;
    expect(a1.fill?.fgColor).toBe('#ff0000');
    expect(a1.bold).toBeUndefined(); // regra 1 parou as demais
    const a2 = eng.at(1, 2)!;
    expect(a2.bold).toBe(true);
    expect(a2.fontColor).toBe('#0000ff'); // regra 2 vence a 3 na cor da fonte
    expect(a2.fill?.fgColor).toBe('#ff0000'); // fundo vem da 3 (2 não define)
    expect(eng.at(1, 3)?.fill?.fgColor).toBe('#ff0000'); // vazia < 4
  });
  it('top N, acima da média, duplicados (sem caixa), fórmula relativa', () => {
    const s = sheet({ '1,1': 1, '1,2': 9, '1,3': 5, '1,4': 7, '2,1': 'Maçã', '2,2': 'maçã', '2,3': 'uva' }, [red]);
    const eng = new CfEngine([
      { sqref: 'A1:A4', rules: [{ type: 'top10', priority: 1, rank: 2, dxfId: 0 }] },
      { sqref: 'B1:B3', rules: [{ type: 'duplicateValues', priority: 2, dxfId: 0 }] },
    ], s);
    expect(eng.at(1, 2)?.fill).toBeDefined();
    expect(eng.at(1, 4)?.fill).toBeDefined();
    expect(eng.at(1, 3)).toBeUndefined();
    expect(eng.at(2, 2)?.fill).toBeDefined();
    expect(eng.at(2, 3)).toBeUndefined();
    const avg = new CfEngine([{ sqref: 'A1:A4', rules: [{ type: 'aboveAverage', priority: 1, dxfId: 0 }] }], s);
    expect(avg.at(1, 2)?.fill).toBeDefined(); // 9 > 5,5
    expect(avg.at(1, 3)).toBeUndefined();
    const ex = new CfEngine([{ sqref: 'A1:A4', rules: [{ type: 'expression', priority: 1, formula: ['$A1>MEDIAN($A$1:$A$4)'], dxfId: 0 }] }], s);
    expect(ex.at(1, 4)?.fill).toBeDefined();
    expect(ex.at(1, 1)).toBeUndefined();
  });
  it('barra 2007: 10% a 90%; ícones pelos limites', () => {
    const s = sheet({ '1,1': 0, '1,2': 5, '1,3': 10 });
    const eng = new CfEngine([{ sqref: 'A1:A3', rules: [{ type: 'dataBar', priority: 1, barColor: '#638EC6', cfvos: [{ type: 'min' }, { type: 'max' }] }] }], s);
    expect(eng.at(1, 1)?.bar?.to).toBeCloseTo(0.1);
    expect(eng.at(1, 3)?.bar?.to).toBeCloseTo(0.9);
    const ic = new CfEngine([{ sqref: 'A1:A3', rules: [{ type: 'iconSet', priority: 1, iconSet: '3Arrows', cfvos: [{ type: 'percent', value: 0 }, { type: 'percent', value: 33 }, { type: 'percent', value: 67 }] }] }], s);
    expect(ic.at(1, 1)?.icon).toEqual({ set: '3Arrows', index: 0 });
    expect(ic.at(1, 2)?.icon).toEqual({ set: '3Arrows', index: 1 });
    expect(ic.at(1, 3)?.icon).toEqual({ set: '3Arrows', index: 2 });
  });
});

describe('fórmulas da formatação condicional', () => {
  const s = sheet({ '1,1': 4, '2,1': 'banana', '1,2': 7 });
  const cx = (col: number, row: number): FCtx => ({
    cell: (_sh, c, r) => s.value(c, r), each: (_sh, c1, r1, c2, r2, fn) => s.each(c1, r1, c2, r2, fn),
    col, row, dc: col - 1, dr: row - 1, today: 46310,
  });
  it('operadores, relativas/absolutas e funções', () => {
    expect(evalFormula('MOD(ROW(),2)=0', cx(1, 2))).toBe(true);
    expect(evalFormula('A1*2+$A$1', cx(1, 2))).toBe(18);
    expect(evalFormula('NOT(ISERROR(SEARCH("AN",B1)))', cx(1, 1))).toBe(true);
    expect(evalFormula('COUNTIF($A$1:$A$9,">5")', cx(1, 1))).toBe(1);
    expect(evalFormula('AND(A1>3,A1<5)', cx(1, 1))).toBe(true);
    expect(evalFormula('-2^2', cx(1, 1))).toBe(4);
    expect(evalFormula('1/0', cx(1, 1))).toBeInstanceOf(FErr);
  });
});
