import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { parseFormula } from '../src/parse.js';
import { toFileFormula } from '../src/file-form.js';
import { fromLocal } from '../src/i18n/translate.js';

/**
 * Fórmulas digitadas (Formula2) e como o Excel 365 as GRAVOU no .xlsx
 * (`_lab/calc/io/out/make1/w-dyn.xlsx`, w-names): [digitada, <f>, dinâmica (cm)].
 * Coluna da célula = a do arquivo medido (referências relativas).
 */
const CASES: [string, string, string, boolean][] = [
  ['C1', 'A1:A3', 'A1:A3', true],
  ['D1', '@A1:A3', 'A1:A3', false],
  ['E1', 'SUM(A1:A3)', 'SUM(A1:A3)', false],
  ['F1', 'SEQUENCE(3)', '_xlfn.SEQUENCE(3)', true],
  ['G1', 'SEQUENCE(1)', '_xlfn.SEQUENCE(1)', true],
  ['H1', 'A1:A3*2', 'A1:A3*2', true],
  ['I1', 'SUM(A1:A3*2)', 'SUM(A1:A3*2)', true],
  ['J1', 'INDEX(A1:A3,2)', 'INDEX(A1:A3,2)', false],
  ['K1', 'VLOOKUP(2,A1:B3,2,0)', 'VLOOKUP(2,A1:B3,2,0)', false],
  ['L1', 'VLOOKUP(A1:A2,A1:B3,2,0)', 'VLOOKUP(A1:A2,A1:B3,2,0)', true],
  ['M1', 'TRANSPOSE(A1:A3)', 'TRANSPOSE(A1:A3)', true],
  ['M3', 'ROW(A1:A3)', 'ROW(A1:A3)', true],
  ['N3', 'ROW()', 'ROW()', false],
  ['O3', 'IF(A1:A3>1,1,0)', 'IF(A1:A3>1,1,0)', true],
  ['P1', 'LET(x,1,x+1)', '_xlfn.LET(_xlpm.x,1,_xlpm.x+1)', false],
  ['Q1', 'LAMBDA(x,x+1)(1)', '_xlfn.LAMBDA(_xlpm.x,_xlpm.x+1)(1)', true],
  ['R1', 'C1#', '_xlfn.ANCHORARRAY(C1)', true],
  ['S1', 'UNIQUE(A1:A3)', '_xlfn.UNIQUE(A1:A3)', true],
  ['T1', 'SUM(C1#)', 'SUM(_xlfn.ANCHORARRAY(C1))', false],
  ['U1', 'TEXT(A1,"0")&"x"', 'TEXT(A1,"0")&"x"', false],
  ['V1', 'A1>1', 'A1>1', false],
  ['X1', 'NOW()', 'NOW()', false],
  ['AB1', 'INDIRECT("A1")', 'INDIRECT("A1")', true],
  ['AC1', 'OFFSET(A1,0,0)', 'OFFSET(A1,0,0)', false],
  ['AD1', 'SUMIF(A1:A3,">1")', 'SUMIF(A1:A3,">1")', false],
  ['AE1', 'XLOOKUP(2,A1:A3,B1:B3)', '_xlfn.XLOOKUP(2,A1:A3,B1:B3)', false],
  ['AF1', 'A1:A3+B1', 'A1:A3+B1', true],
  ['AG1', 'MMULT(A1:A3,TRANSPOSE(A1:A3))', 'MMULT(A1:A3,TRANSPOSE(A1:A3))', true],
  ['AK1', 'FILTER(A1:A3,A1:A3>5)', '_xlfn._xlws.FILTER(A1:A3,A1:A3>5)', true],
  ['AL1', '""', '""', false],
  ['AP1', '@INDEX(A1:A3,0)', 'INDEX(A1:A3,0)', false],
  ['AU1', 'IFERROR(1/0,"e")', 'IFERROR(1/0,"e")', false],
  ['AV1', 'CONCAT(A1:A3)', '_xlfn.CONCAT(A1:A3)', false],
  ['AW1', 'TEXTJOIN(",",TRUE,A1:A3)', '_xlfn.TEXTJOIN(",",TRUE,A1:A3)', false],
  ['AX1', 'SUM(A:A)', 'SUM(A:A)', false],
  ['AY1', 'MAX(INDEX(A1:A3,0)*1)', 'MAX(INDEX(A1:A3,0)*1)', true],
  ['AZ1', 'A1:A3=2', 'A1:A3=2', true],
  ['BA1', 'UPPER({"a";"b"})', 'UPPER({"a";"b"})', true],
  ['BB1', 'SEQUENCE(2)=1', '_xlfn.SEQUENCE(2)=1', true],
  ['BC1', 'IF(SEQUENCE(2)=1,NA(),"t")', 'IF(_xlfn.SEQUENCE(2)=1,NA(),"t")', true],
];

const NAMES: Record<string, boolean> = { TAXA: false, DADOS: true, DOBRO: true, AGORA: true };
const NAME_CASES: [string, string, string, boolean][] = [
  ['B1', 'Taxa*100', 'Taxa*100', false],
  // o Excel grava com a grafia do nome definido; o parser põe em maiúsculas (o Excel aceita igual)
  ['B3', 'Dobro(4)', 'DOBRO(4)', true],
  ['C1', 'Dados', 'Dados', true],
  ['D1', 'Agora*0+1', 'Agora*0+1', true],
  ['E1', '@Dados', 'Dados', false],
];

function at(ref: string): { row: number; col: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
  const col = [...m[1]!].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: +m[2]! - 1, col };
}

describe('forma de gravação (legada × matriz dinâmica), medida no Excel', () => {
  it.each(CASES)('%s =%s', (ref, typed, file, dynamic) => {
    const { row, col } = at(ref);
    // como a barra de fórmulas entrega: texto no idioma → canônico com prefixos de arquivo
    const canon = fromLocal('=' + typed, { filePrefixes: true }).slice(1);
    const r = toFileFormula(parseFormula(canon, { row, col }), row, col);
    expect(r).toEqual({ text: file, dynamic });
  });
  it.each(NAME_CASES)('nomes: %s =%s', (ref, typed, file, dynamic) => {
    const { row, col } = at(ref);
    const r = toFileFormula(parseFormula(typed, { row, col }), row, col, {
      nameIsMulti: (n) => NAMES[n.toUpperCase()] ?? true,
      isName: (n) => n.toUpperCase() in NAMES,
    });
    expect(r).toEqual({ text: file, dynamic });
  });
});
