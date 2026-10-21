// Campo de fórmula de tabela contra o ORÁCULO (write/tools/table-lab/results,
// experimentos formula-* e fx-*): mesma tabela, mesma fórmula e imagem → o
// mesmo texto de resultado e a mesma instrução que o Word gravou.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, writeDocument, tableOps as T, formulaResultText, formulaInstr, defaultFormula,
  evaluateFormula, formatPicture, parseCellNumber, type TableBlock, type DocumentModel,
} from '../src/index.js';

const RESULTS = join(__dirname, '../../../tools/table-lab/results');

/** Instrução e resultado do campo gravado pelo Word. */
function oracle(name: string): { instr: string; result: string } {
  const xml = readFileSync(join(RESULTS, `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
  const unesc = (s: string): string => s.replace(/&(gt|lt|quot|amp);/g, (_m, e: string) => ({ gt: '>', lt: '<', quot: '"', amp: '&' })[e]!);
  const instr = /<w:instrText[^>]*>([^<]*)<\/w:instrText>/.exec(xml)![1]!;
  const after = xml.slice(xml.indexOf('w:fldCharType="separate"'));
  const result = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/.exec(after)![1]!;
  return { instr: unesc(instr), result: unesc(result) };
}

function table(rows: string[][]): TableBlock {
  const t = T.newTable(rows.length, Math.max(...rows.map((r) => r.length)), { availTwips: 8504 });
  rows.forEach((row, r) => row.forEach((s, c) => {
    if (s) T.setCellContent(t.rows[r]!.cells[c]!, [{ type: 'paragraph', paragraph: { runs: [{ text: s, props: {} }], props: {} } }]);
  }));
  return t;
}
/** Coluna de valores com a fórmula na linha de baixo (New-Col do oráculo). */
const col = (vals: string[]): TableBlock => table([...vals.map((v) => [v, '']), ['', '']]);

const CASES: [string, TableBlock, number, number, string, string?][] = [
  ['fx-above-gap', col(['10', '', '20']), 3, 0, '=SUM(ABOVE)'],
  ['fx-above-text', col(['Total', '10', 'abc', '20']), 4, 0, '=SUM(ABOVE)'],
  ['fx-above-header', col(['Valor', '10', '20']), 3, 0, '=SUM(ABOVE)'],
  ['fx-currency', col(['R$ 10,00', '5']), 2, 0, '=SUM(ABOVE)'],
  ['fx-mixedtext', col(['10 itens', '2,5 kg']), 2, 0, '=SUM(ABOVE)'],
  ['fx-avg', col(['1', '2', '4']), 3, 0, '=AVERAGE(ABOVE)'],
  ['fx-count', col(['1', 'x', '4']), 3, 0, '=COUNT(ABOVE)'],
  ['fx-maxmin', col(['1', '9', '4']), 3, 0, '=MAX(ABOVE)-MIN(ABOVE)'],
  ['fx-product', col(['2', '3', '4']), 3, 0, '=PRODUCT(ABOVE)'],
  ['fx-if', col(['6', '7']), 2, 0, '=IF(SUM(ABOVE)>10;1;0)'],
  ['fx-neg-fmt', col(['-5', '3']), 2, 0, '=SUM(ABOVE)', '#.##0,00;(#.##0,00)'],
  ['fx-pct', col(['0,25']), 1, 0, '=A1*100', '0%'],
  ['fx-int-fmt', col(['1234,567']), 1, 0, '=A1', '0'],
  ['fx-currency-fmt', col(['1234,5']), 1, 0, '=A1', 'R$ #.##0,00'],
  ['fx-div0', col(['5', '0']), 2, 0, '=A1/A2'],
  ['fx-syntax', col(['5']), 1, 0, '=A1+'],
  ['fx-round-neg', col(['-2,5']), 1, 0, '=ROUND(A1;0)'],
  ['fx-big', col(['1234567,891']), 1, 0, '=A1'],
  ['fx-left', table([['abc', '3', '4', '']]), 0, 3, '=SUM(LEFT)'],
  ['fx-left-gap', table([['1', '', '4', '']]), 0, 3, '=SUM(LEFT)'],
  ['formula-sum-above', table([['10', ''], ['20,5', ''], ['1.000', ''], ['', '']]), 3, 0, '=SUM(ABOVE)'],
  ['formula-fmt', table([['10', ''], ['20,5', ''], ['', '']]), 2, 0, '=SUM(ABOVE)', '#.##0,00'],
  ['formula-left', table([['3', '4', '']]), 0, 2, '=SUM(LEFT)'],
  ['formula-refs', table([['3', '4', ''], ['', '', '']]), 1, 2, '=ROUND(AVERAGE(A1:B1);1)+A1*2'],
];

describe('fórmula de tabela (oráculo)', () => {
  for (const [name, t, r, c, f, pic] of CASES) {
    it(`${name}: ${f}${pic ? ` \\# ${pic}` : ''}`, () => {
      const o = oracle(name);
      const instr = formulaInstr(f, pic);
      expect(instr).toBe(o.instr);
      expect(formulaResultText(instr, { table: t, r, c })).toBe(o.result);
    });
  }
  it('fórmula sugerida: SUM(ABOVE) com números acima, senão SUM(LEFT)', () => {
    const above = table([['7', ''], ['8', ''], ['', '']]);
    expect(defaultFormula(above, 2, 0)).toBe('=SUM(ABOVE)');
    expect(oracle('formula-default').instr).toBe(formulaInstr('=SUM(ABOVE)'));
    expect(formulaResultText(formulaInstr('=SUM(ABOVE)'), { table: above, r: 2, c: 0 })).toBe(oracle('formula-default').result);
    const left = table([['1', '2', '']]);
    expect(defaultFormula(left, 0, 2)).toBe('=SUM(LEFT)');
    expect(formulaResultText(formulaInstr('=SUM(LEFT)'), { table: left, r: 0, c: 2 })).toBe(oracle('fx-default-left').result);
    expect(defaultFormula(table([['a', '']]), 0, 1)).toBe('=');
  });
});

describe('fórmula de tabela (regras)', () => {
  const t = table([['1', '2'], ['3', '']]);
  const ev = (f: string) => evaluateFormula(f, { table: t, r: 1, c: 1 });
  it('operadores e precedência', () => {
    expect(ev('=2+3*4')).toMatchObject({ value: 14 });
    expect(ev('=(2+3)*4')).toMatchObject({ value: 20 });
    expect(ev('=2^3')).toMatchObject({ value: 8 });
    expect(ev('=50%')).toMatchObject({ value: 0.5 });
    expect(ev('=-A1+B1')).toMatchObject({ value: 1 });
    expect(ev('=A1<>B1')).toMatchObject({ value: 1 });
  });
  it('funções', () => {
    expect(ev('=SUM(A1:B2)')).toMatchObject({ value: 6 });
    expect(ev('=MOD(7;3)')).toMatchObject({ value: 1 });
    expect(ev('=INT(-2,7)')).toMatchObject({ value: -2 });
    expect(ev('=SIGN(-4)')).toMatchObject({ value: -1 });
    expect(ev('=ABS(-4)')).toMatchObject({ value: 4 });
    expect(ev('=AND(1;0)')).toMatchObject({ value: 0 });
    expect(ev('=OR(1;0)')).toMatchObject({ value: 1 });
    expect(ev('=NOT(0)')).toMatchObject({ value: 1 });
    expect(ev('=ROUND(2,345;2)')).toMatchObject({ value: 2.35 });
  });
  it('erros', () => {
    expect(ev('=1/0')).toEqual({ error: '!Divisão por zero' });
    expect(ev('=')).toEqual({ error: '!Fim imprevisto da fórmula' });
    expect(ev('=SUM(')).toEqual({ error: '!Fim imprevisto da fórmula' });
  });
  it('números das células no início do texto (pt-BR)', () => {
    expect(parseCellNumber('1.234,5 kg')).toMatchObject({ n: 1234.5, decimals: 1, thousands: true });
    expect(parseCellNumber('(12)')).toMatchObject({ n: -12 });
    expect(parseCellNumber('R$ 3,00')).toMatchObject({ n: 3, prefix: 'R$ ' });
    expect(parseCellNumber('abc 3')).toBeNull();
  });
  it('imagem numérica', () => {
    expect(formatPicture(1234.5, '#.##0,00')).toBe('1.234,50');
    expect(formatPicture(0.5, '0,00')).toBe('0,50');
    expect(formatPicture(1234567, '#.##0')).toBe('1.234.567');
    expect(formatPicture(0, '#.##0,00;(#.##0,00);-')).toBe('-');
  });
});

describe('fórmula de tabela (gravação)', () => {
  it('campo complexo como o Word: instrução e resultado com noProof', () => {
    const pkg = DocxPackage.empty();
    const model: DocumentModel = {
      paragraphs: [{ runs: [{ text: '15', props: {}, field: formulaInstr('=SUM(ABOVE)') }], props: {} }],
      sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
    };
    writeDocument(pkg, model, []);
    const xml = pkg.documentXml();
    expect(xml).toContain('<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> =SUM(ABOVE) </w:instrText></w:r>' +
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:noProof/></w:rPr><w:t>15</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>');
  });
});
