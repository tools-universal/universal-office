import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { parseFormula } from '../src/parse.js';
import { printFormula } from '../src/print.js';

const rt = (f: string, o: { row?: number; col?: number; r1c1?: boolean } = {}): string => printFormula(parseFormula(f, o), o);

describe('parser/serializador', () => {
  it('ida e volta da forma canônica', () => {
    const cases = [
      'SUM(A1:B3)', '$A$1+B$2*$C3', 'Sheet1!A1', "'Minha aba'!A1:B2", "'O''Brien'!C3", 'Plan1:Plan3!A1',
      "'Plan 1:Plan 3'!A1", '[1]Plan1!$A$1', "'[1]Minha aba'!A1", '[1]!Nome', 'A:A', '$A:$C', '1:1', '$2:$5',
      'Sheet1!A:B', 'Sheet1!3:4', '"a""b"', '1E+20', '.5', '1.', '{1,2;3,4}', '{"a",TRUE;#N/A,-1}', '-2^2', '2^3^2',
      '50%', 'A1%^2', 'A1 B1', '(A1,B1)', 'SUM((A1,B1:B2),C1)', 'A1:B2 B1:C3', 'IF(A1,,2)', 'IF(A1,)', 'NOW()',
      '_xlfn.XLOOKUP(A1,B:B,C:C)', '_xlfn._xlws.SORT(A1:A3)', '_xlfn.SINGLE(A1:A3)', '_xlfn.ANCHORARRAY(A1)',
      '_xlfn.LET(_xlpm.x,1,_xlpm.x+1)', '_xlfn.LAMBDA(_xlpm.a,_xlpm.a*2)(3)', 'Tabela1[Col]', 'Tabela1[]', 'Tabela1[#All]',
      'Tabela1[[#Headers],[A]:[B]]', 'Tabela1[[#This Row],[Preço]]', 'Tabela1[[Col 1]]', "Tabela1[[a'#b]]", 'Sheet1!#REF!', '#REF!',
      'A1=B1', 'A1<>B1', 'A1<=B1', '"a"&"b"', '--A1', '+A1', 'LOG10(100)', 'ATAN2(1,2)', 'MeuNome', 'Plan1!MeuNome',
      'TRUE', 'FALSE', 'TRUE()', 'SUM(A1:A3)-SUM(B1)', '#DIV/0!', 'INDEX(A1:B2,1,1):B3', 'Preço*2',
    ];
    const bad: string[] = [];
    for (const f of cases) { try { const r = rt(f); if (r !== f) bad.push(`${f} → ${r}`); } catch (e) { bad.push(`${f}: ${(e as Error).message}`); } }
    expect(bad).toEqual([]);
  });
  it('relativas viram deslocamentos (fórmula compartilhada)', () => {
    const n = parseFormula('A1+$B$1+B$2', { row: 1, col: 2 });
    expect(printFormula(n, { row: 1, col: 2 })).toBe('A1+$B$1+B$2');
    expect(printFormula(n, { row: 5, col: 3 })).toBe('B5+$B$1+C$2');
    expect(printFormula(n, { r1c1: true })).toBe('R[-1]C[-2]+R1C2+R2C[-1]');
  });
  it('R1C1', () => {
    expect(rt('R1C1+R[-1]C[2]+RC', { r1c1: true })).toBe('R1C1+R[-1]C[2]+RC');
    expect(rt('SUM(R1:R3)+SUM(C2)', { r1c1: true })).toBe('SUM(R1:R3)+SUM(C2)');
    const n = parseFormula('R[-1]C', { r1c1: true });
    expect(printFormula(n, { row: 4, col: 0 })).toBe('A4');
  });
  it('forma de tela', () => {
    expect(printFormula(parseFormula('_xlfn.SINGLE(A1:A3)+_xlfn.ANCHORARRAY(B1)'), { ui: true })).toBe('@A1:A3+B1#');
    expect(printFormula(parseFormula('@A1:A3+B1#'))).toBe('_xlfn.SINGLE(A1:A3)+_xlfn.ANCHORARRAY(B1)');
    expect(printFormula(parseFormula('Tabela1[[#This Row],[Col]]'), { ui: true })).toBe('Tabela1[@Col]');
    expect(printFormula(parseFormula('[@[Col 1]]'))).toBe('[[#This Row],[Col 1]]');
  });
  it('precedência', () => {
    const p = (f: string): unknown => JSON.parse(JSON.stringify(parseFormula(f)));
    expect(p('-2^2')).toMatchObject({ t: 'bin', op: '^', a: { t: 'unary', op: '-' } });
    expect(p('1+2*3')).toMatchObject({ t: 'bin', op: '+', b: { t: 'bin', op: '*' } });
    expect(p('2^3^2')).toMatchObject({ t: 'bin', op: '^', a: { t: 'bin', op: '^' } });
    expect(p('"a"&1+2')).toMatchObject({ t: 'bin', op: '&', b: { t: 'bin', op: '+' } });
    expect(p('1=1&""')).toMatchObject({ t: 'bin', op: '=', b: { t: 'bin', op: '&' } });
    expect(p('-A1:A2')).toMatchObject({ t: 'unary', e: { t: 'area' } });
    expect(p('A1 + B1')).toMatchObject({ t: 'bin', op: '+' });
    expect(p('SUM( A1 , B1 )')).toMatchObject({ t: 'fn', args: [{ t: 'cell' }, { t: 'cell' }] });
  });
});
