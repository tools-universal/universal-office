// Classificar contra o ORÁCULO (write/tools/table-lab/results, sort-*): mesma
// tabela/parágrafos, mesmas chaves → a mesma ordem que o Word gravou.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tableOps as T, sortTable, sortParagraphsOrder, canSortTable, type SortOptions, type TableBlock, type Paragraph,
} from '../src/index.js';
// a colação do Windows (a mesma do Sheet) — o editor a injeta do mesmo arquivo
import { compareText } from '../../../../sheet/packages/calc/src/collation.js';

const RESULTS = join(__dirname, '../../../tools/table-lab/results');

/** Texto das linhas (células por ";") da tabela gravada pelo Word, ou dos parágrafos. */
function oracle(name: string): string[] {
  const xml = readFileSync(join(RESULTS, `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
  const txt = (s: string): string => [...s.matchAll(/<w:p(?:\/>|>([\s\S]*?)<\/w:p>)/g)]
    .map((p) => [...(p[1] ?? '').matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')).join(' ');
  const tbl = /<w:tbl>([\s\S]*?)<\/w:tbl>/.exec(xml);
  if (!tbl) {
    const body = /<w:body>([\s\S]*)<\/w:body>/.exec(xml)![1]!.replace(/<w:sectPr>[\s\S]*<\/w:sectPr>/, '');
    return [...body.matchAll(/<w:p(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((p) => txt(`<w:p>${p[1] ?? ''}</w:p>`));
  }
  return [...tbl[1]!.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)].map((r) =>
    [...r[1]!.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((c) => txt(c[1]!)).join(';'));
}

function table(spec: string): TableBlock {
  const rows = spec.split('|').map((r) => r.split(';'));
  const t = T.newTable(rows.length, rows[0]!.length, { availTwips: 8504 });
  rows.forEach((row, r) => row.forEach((s, c) => {
    if (s) T.setCellContent(t.rows[r]!.cells[c]!, [{ type: 'paragraph', paragraph: { runs: [{ text: s, props: {} }], props: {} } }]);
  }));
  return t;
}
const rowsOf = (t: TableBlock): string[] => t.rows.map((r) => r.cells.map((c) => c.paragraphs.map((p) => p.runs.map((x) => x.text).join('')).join(' ')).join(';'));

const TXT = 'b|B|aá|a|Á|c|ç|10|9||Zeta|ábaco|abacate|_x|(a)';
const CASES: [string, string, boolean, SortOptions][] = [
  ['sort-text', TXT, false, { keys: [{ col: 0, type: 'text' }] }],
  ['sort-text-case', 'b|B|a|A|á|Á|bb|Bb', false, { keys: [{ col: 0, type: 'text' }], caseSensitive: true }],
  ['sort-text-desc', 'b|a|c||10|9', false, { keys: [{ col: 0, type: 'text', desc: true }] }],
  ['sort-num', '10|9|1,5|abc|-2|R$ 3||1.000|2 itens|(4)|5%|x7', false, { keys: [{ col: 0, type: 'number' }] }],
  ['sort-num-desc', '10|9|abc||-2|3', false, { keys: [{ col: 0, type: 'number', desc: true }] }],
  ['sort-date', '15/01/2020|01/02/2020|2019-12-31|x||31/12/2019|1 de março de 2020|02/01/20|3/1/2020', false, { keys: [{ col: 0, type: 'date' }] }],
  ['sort-header', 'Nome|pera|banana|abacaxi', true, { keys: [{ col: 0, type: 'text' }] }],
  ['sort-noheader', 'Nome|pera|banana|abacaxi', false, { keys: [{ col: 0, type: 'text' }] }],
  ['sort-multi', 'b;2|a;3|b;1|a;1|a;2', false, { keys: [{ col: 0, type: 'text' }, { col: 1, type: 'number' }] }],
  ['sort-stable', 'x;1|y;2|x;3|y;4|x;5', false, { keys: [{ col: 0, type: 'text' }] }],
  ['sort-col2', 'k1;c|k2;a|k3;b', false, { keys: [{ col: 1, type: 'text' }] }],
];

describe('classificar tabela (oráculo)', () => {
  for (const [name, spec, header, o] of CASES) {
    it(name, () => {
      const t = table(spec);
      expect(sortTable(t, header ? 1 : 0, t.rows.length - 1, { ...o, compare: compareText })).toBe(true);
      expect(rowsOf(t)).toEqual(oracle(name));
    });
  }
  it('a linha leva a formatação (altura, sombreamento, negrito)', () => {
    const t = table('c|a|b');
    T.setRowHeight(t, 0, 0, 600, 'atLeast');
    T.setShading(t, { r1: 0, c1: 0, r2: 0, c2: 0 }, { val: 'clear', color: 'auto', fill: 'FFFF00' });
    const moved = t.rows[0]!;
    sortTable(t, 0, 2, { keys: [{ col: 0, type: 'text' }], compare: compareText });
    expect(rowsOf(t)).toEqual(oracle('sort-format'));
    expect(t.rows[2]).toBe(moved);
  });
  it('só as linhas selecionadas', () => {
    const t = table('d|c|b|a');
    sortTable(t, 1, 2, { keys: [{ col: 0, type: 'text' }], compare: compareText });
    expect(rowsOf(t)).toEqual(oracle('sort-partial'));
  });
  it('mesclagem: recusa', () => {
    const t = table('c;1|b;2|a;3');
    T.mergeCells(t, { r1: 0, c1: 1, r2: 1, c2: 1 });
    expect(canSortTable(t)).toBe(false);
    expect(sortTable(t, 0, 2, { keys: [{ col: 0, type: 'text' }] })).toBe(false);
  });
});

describe('classificar parágrafos (oráculo)', () => {
  const paras = (xs: string[]): Paragraph[] => xs.map((s) => ({ runs: s ? [{ text: s, props: {} }] : [], props: {} } as Paragraph));
  it('texto', () => {
    const ps = paras(['pera', 'banana', 'Abacaxi', '', 'maça', '10', '9']);
    const idx = sortParagraphsOrder(ps, { keys: [{ col: 0, type: 'text' }], compare: compareText });
    expect(idx.map((i) => ps[i]!.runs.map((r) => r.text).join(''))).toEqual(oracle('sort-paras'));
  });
  it('número', () => {
    const ps = paras(['10 itens', '9', 'abc', '1,5']);
    const idx = sortParagraphsOrder(ps, { keys: [{ col: 0, type: 'number' }], compare: compareText });
    expect(idx.map((i) => ps[i]!.runs.map((r) => r.text).join(''))).toEqual(oracle('sort-paras-num'));
  });
});
