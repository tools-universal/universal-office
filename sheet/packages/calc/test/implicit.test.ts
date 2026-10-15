import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { legacyToDynamic } from '../src/implicit.js';
import { parseFormula } from '../src/parse.js';
import { printFormula } from '../src/print.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const conv = (f: string): string => '=' + printFormula(legacyToDynamic(parseFormula(f)), { ui: true });

describe('fórmula legada → @ do Excel 365', () => {
  it('casos medidos (Range.Formula → Formula2)', () => {
    // pares medidos em core.excel.json (campo f)
    const cases: [string, string][] = [
      ['=A1:A3', '=@A1:A3'], ['=A1:A3*2', '=@A1:A3*2'], ['=-A1:A3', '=-@A1:A3'], ['=A1:A3&"x"', '=@A1:A3&"x"'],
      ['=IF(A1:A3>1,"y","n")', '=IF(@A1:A3>1,"y","n")'], ['=IF(A1:A3,1,2)', '=IF(@A1:A3,1,2)'], ['=A1:A3>1', '=@A1:A3>1'],
      ['=IFERROR(A1:A3,0)', '=IFERROR(@A1:A3,0)'], ['=NOT(A1:A3)', '=NOT(@A1:A3)'], ['=AND(A1:A3>1)', '=AND(@A1:A3>1)'],
      ['=A1:C1', '=@A1:C1'], ['=A1:A3+A1:C1', '=@A1:A3+@A1:C1'], ['=A1+1', '=A1+1'],
    ];
    for (const [f, f2] of cases) expect(conv(f), f).toBe(f2);
  });
  it('todas as sondas do catálogo (4,6 mil pares medidos)', () => {
    const { pares } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'oracle', 'implicit.f2.json'), 'utf8')) as { pares: [string, string][] };
    const norm = (x: string): string => x.replace(/^=/, '').replace(/_xlfn.|_xlws./g, '');
    const bad = pares.filter(([f, f2]) => norm(conv(f)) !== norm(f2)).map(([f, f2]) => `${f} → ${conv(f)} × Excel ${f2}`);
    expect(bad).toEqual([]);
  });
});
