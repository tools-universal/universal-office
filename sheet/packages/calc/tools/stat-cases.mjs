// Gera os bancos de casos do FN-STAT (estatística e banco de dados):
//   node tools/stat-cases.mjs   → test/oracle/stat*.cases.json, db.cases.json
// Depois: node tools/oracle.mjs <área> grava a resposta do Excel (<área>.excel.json).
// Os casos são entrada (fórmula + células); o valor esperado vem SEMPRE do Excel.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = (area, cases) => {
  const ids = new Set();
  for (const c of cases) { if (ids.has(c.id)) throw new Error('id repetido: ' + c.id); ids.add(c.id); }
  writeFileSync(join(here, '..', 'test', 'oracle', `${area}.cases.json`), '[\n' + cases.map((c) => ' ' + JSON.stringify(c)).join(',\n') + '\n]\n');
  console.log(`${area}: ${cases.length} casos`);
};

const ref = (r) => ({ ref: r });
const arr = (...rows) => ({ arr: rows });
const E = (e) => ({ e });
const S = (s) => ({ s });
const OMIT = { omit: true };
/** Coluna A (a partir de A1) com os valores dados (null = vazio). */
const colA = (vals, col = 'A', start = 1) => {
  const cells = {};
  vals.forEach((v, i) => { if (v !== null && v !== undefined) cells[`${col}${start + i}`] = v; });
  return cells;
};
const merge = (...cs) => Object.assign({}, ...cs);
/** Pedaço de id legível e único para um valor de argumento. */
const slug = (v) => JSON.stringify(v).replace(/-/g, 'n').replace(/\./g, 'd').replace(/"/g, 'q').replace(/,/g, '_').replace(/[^\w]/g, '');

// ---------------------------------------------------------------------------
// stat: descritivas, contagem, ordem, SUBTOTAL, AGGREGATE
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `stat-${id}`, fn, args, ...extra });

  const D1 = colA([1, 2, 3, 4, 5, 6]);
  const MIX = colA([3, 'a', true, null, S('5'), 7.5, false, -2]);
  const ERRS = colA([1, E('#N/A'), 3, E('#DIV/0!')]);
  const TWO = { A1: 1, A2: E('#N/A'), B1: E('#DIV/0!'), B2: 2 };
  const DEC = colA([0.1, 0.7, 0.3, 1.1, 2.2, 3.3]);
  const NEG = colA([-1.5, -2.25, -3, -0.75, -4.5]);
  const ZM = colA([-2, -1, 0, 1, 2]);
  const BIG = colA([1e9 + 0.1, 1e9 + 0.2, 1e9 + 0.3, 1e9 + 0.4]);
  const SMALLV = colA([0.00415, 0.00298, 0.0084, 0.0051, 0.0062, 0.0049]);
  const DUP = colA([2, 3, 3, 5, 2, 7, 5, 5, 2]);
  const RAND = colA([0.746, 9.97, 2.1, 0.303, 5.12, 1.71, 3.38, 4.08]);
  const H2 = { A1: 1, B1: 'x', C1: 3, D1: true, E1: 5 };

  // agregações: bateria comum
  const aggs = ['AVERAGE', 'AVERAGEA', 'MAX', 'MAXA', 'MIN', 'MINA', 'MEDIAN', 'MODE', 'MODE.SNGL', 'MODE.MULT', 'STDEV', 'STDEV.S', 'STDEVA', 'STDEVP', 'STDEV.P', 'STDEVPA',
    'VAR', 'VAR.S', 'VARA', 'VARP', 'VAR.P', 'VARPA', 'DEVSQ', 'AVEDEV', 'KURT', 'SKEW', 'SKEW.P', 'GEOMEAN', 'HARMEAN', 'COUNT', 'COUNTA'];
  for (const f of aggs) {
    const k = f.toLowerCase();
    add(`${k}-ref`, f, [ref('A1:A6')], { cells: D1 });
    add(`${k}-mix`, f, [ref('A1:A8')], { cells: MIX });
    add(`${k}-err`, f, [ref('A1:A4')], { cells: ERRS });
    add(`${k}-errorder`, f, [ref('A1:B2')], { cells: TWO });
    add(`${k}-direct`, f, [2, 4, 4, 5, 9]);
    add(`${k}-dtext`, f, [S('2'), 4, 7]);
    add(`${k}-dtextpt`, f, ['2,5', 4, 7]);
    add(`${k}-dtextbad`, f, ['a', 4, 7]);
    add(`${k}-dbool`, f, [true, 4, false, 6]);
    add(`${k}-derr`, f, [1, E('#N/A'), 2]);
    add(`${k}-arr`, f, [arr([1, 'a', true, 4, 6])]);
    add(`${k}-arr2`, f, [arr([1, 'a'], [false, 4], [6, S('3')])]);
    add(`${k}-arrerr`, f, [arr([1, E('#NUM!'), 3])]);
    add(`${k}-empty`, f, [ref('A1:A3')]);
    add(`${k}-omit`, f, [3, OMIT, 5]);
    add(`${k}-union`, f, [ref('(A1:A3,C1:C3)')], { cells: merge(colA([1, 2, 3]), colA([4, 'b', 6], 'C')) });
    add(`${k}-2d`, f, [ref('A1:B3')], { cells: { A1: 1, B1: 2, A2: 3, B2: 'q', A3: 5, B3: 8 } });
    add(`${k}-single`, f, [7]);
    add(`${k}-two`, f, [7, 9]);
    add(`${k}-dec`, f, [ref('A1:A6')], { cells: DEC });
    add(`${k}-neg`, f, [ref('A1:A5')], { cells: NEG });
    add(`${k}-zm`, f, [ref('A1:A5')], { cells: ZM });
    add(`${k}-big`, f, [ref('A1:A4')], { cells: BIG });
    add(`${k}-small`, f, [ref('A1:A6')], { cells: SMALLV });
    add(`${k}-dup`, f, [ref('A1:A9')], { cells: DUP });
    add(`${k}-rand`, f, [ref('A1:A8')], { cells: RAND });
    add(`${k}-col`, f, [ref('A:A')], { cells: colA([4, 'x', 8, null, 15]) });
    add(`${k}-row`, f, [ref('A1:E1')], { cells: H2 });
    add(`${k}-mixargs`, f, [ref('A1:A3'), 10, arr([20, 30]), S('40')], { cells: colA([1, 'z', 2]) });
    add(`${k}-zeros`, f, [0, 0, 0]);
  }
  // COUNTBLANK
  add('countblank-basic', 'COUNTBLANK', [ref('A1:A6')], { cells: colA([1, null, 'a', null, 0, null]) });
  add('countblank-emptytext', 'COUNTBLANK', [ref('A1:A3')], { cells: { A1: 1 }, formulas: { A2: '=""' } });
  add('countblank-col', 'COUNTBLANK', [ref('A:A')], { cells: colA([1, null, 'a']) });
  add('countblank-2d', 'COUNTBLANK', [ref('A1:C3')], { cells: { A1: 1, B2: false, C3: E('#N/A') } });
  add('countblank-none', 'COUNTBLANK', [ref('A1:A2')], { cells: colA([1, 2]) });
  add('counta-emptytext', 'COUNTA', [ref('A1:A3')], { cells: { A1: 1, A2: '' }, formulas: { A2: '=""' } });
  add('count-emptytext', 'COUNT', [ref('A1:A3')], { cells: { A1: 1, A2: '' }, formulas: { A2: '=""' } });

  // LARGE / SMALL
  for (const f of ['LARGE', 'SMALL']) {
    const k = f.toLowerCase();
    for (const kk of [1, 2, 3, 6, 0, 7, -1, 1.5, 2.2, 5.9, S('2'), true, 'x', E('#N/A'), null, 0.5, 0.99, 4.5, 5.5, 5.01])
      add(`${k}-k${slug(kk)}`, f, [ref('A1:A6'), kk], { cells: colA([3, 9, 'a', 1, 9, 4]) });
    add(`${k}-karr`, f, [ref('A1:A6'), arr([1, 2, 3])], { cells: D1 });
    add(`${k}-arr`, f, [arr([5, 1, 'a', true, 3]), 2]);
    add(`${k}-err`, f, [ref('A1:A4'), 1], { cells: ERRS });
    add(`${k}-empty`, f, [ref('A1:A3'), 1]);
    add(`${k}-union`, f, [ref('(A1:A2,C1:C2)'), 3], { cells: { A1: 5, A2: 1, C1: 8, C2: 2 } });
    add(`${k}-scalar`, f, [5, 1]);
    add(`${k}-text`, f, [S('5'), 1]);
    add(`${k}-col`, f, [ref('A:A'), 2], { cells: colA([4, 'x', 8, null, 15]) });
  }
  // percentis e quartis
  for (const f of ['PERCENTILE', 'PERCENTILE.INC', 'PERCENTILE.EXC']) {
    const k = f.toLowerCase();
    for (const p of [0, 0.1, 0.25, 0.3, 0.5, 0.77, 0.9, 1, -0.1, 1.1, S('0,5'), true, 'x', E('#N/A'), null, 0.125, 0.875, 0.2])
      add(`${k}-p${slug(p)}`, f, [ref('A1:A6'), p], { cells: colA([3.5, 9, 'a', 1, 9.25, 4]) });
    add(`${k}-parr`, f, [ref('A1:A6'), arr([0.25, 0.5])], { cells: D1 });
    add(`${k}-one`, f, [arr([7]), 0.5]);
    add(`${k}-empty`, f, [ref('A1:A3'), 0.5]);
    add(`${k}-err`, f, [ref('A1:A4'), 0.5], { cells: ERRS });
    add(`${k}-rand`, f, [ref('A1:A8'), 0.37], { cells: RAND });
    add(`${k}-dec`, f, [ref('A1:A6'), 0.63], { cells: DEC });
  }
  for (const f of ['QUARTILE', 'QUARTILE.INC', 'QUARTILE.EXC']) {
    const k = f.toLowerCase();
    for (const q of [0, 1, 2, 3, 4, 5, -1, 1.7, 3.9, S('2'), true, 'x', null])
      add(`${k}-q${slug(q)}`, f, [ref('A1:A6'), q], { cells: colA([3.5, 9, 'a', 1, 9.25, 4]) });
    add(`${k}-rand`, f, [ref('A1:A8'), 1], { cells: RAND });
    add(`${k}-two`, f, [arr([1, 2]), 1]);
  }
  for (const f of ['PERCENTRANK', 'PERCENTRANK.INC', 'PERCENTRANK.EXC']) {
    const k = f.toLowerCase();
    for (const x of [1, 2, 3.5, 4, 9, 9.25, 0, 10, 2.75, S('4'), true, 'x', E('#N/A')])
      add(`${k}-x${slug(x)}`, f, [ref('A1:A6'), x], { cells: colA([3.5, 9, 'a', 1, 9.25, 4]) });
    for (const sg of [1, 2, 5, 15, 0, -1, 2.9, null, OMIT, 20])
      add(`${k}-sig${slug(sg)}`, f, [ref('A1:A8'), 3.1, sg], { cells: RAND });
    add(`${k}-dup`, f, [ref('A1:A9'), 5], { cells: DUP });
    add(`${k}-dup2`, f, [ref('A1:A9'), 4], { cells: DUP });
    add(`${k}-one`, f, [arr([7]), 7]);
    add(`${k}-exact3rd`, f, [arr([1, 2, 3, 4]), 2]);
    add(`${k}-rand`, f, [ref('A1:A8'), 4.5], { cells: RAND });
  }
  // RANK
  for (const f of ['RANK', 'RANK.EQ', 'RANK.AVG']) {
    const k = f.toLowerCase();
    for (const [x, o] of [[5, null], [5, 0], [5, 1], [2, OMIT], [2, 1], [7, 0], [3, 1], [4, 0], [S('5'), 0], [true, 0], ['x', 0], [5, 'x'], [5, 0.5], [5, -1], [5, true]])
      add(`${k}-${slug([x, o])}`, f, o === null ? [x, ref('A1:A9')] : [x, ref('A1:A9'), o], { cells: DUP });
    add(`${k}-mix`, f, [3, ref('A1:A8')], { cells: MIX });
    add(`${k}-err`, f, [3, ref('A1:A4')], { cells: ERRS });
    add(`${k}-union`, f, [5, ref('(A1:A2,C1:C2)')], { cells: { A1: 5, A2: 1, C1: 8, C2: 2 } });
    add(`${k}-dec`, f, [0.3, ref('A1:A6')], { cells: DEC });
  }
  // TRIMMEAN
  for (const p of [0, 0.1, 0.2, 0.25, 0.4, 0.5, 0.9, 0.99, 1, -0.1, S('0,2'), 'x'])
    add(`trimmean-p${slug(p)}`, 'TRIMMEAN', [ref('A1:A9'), p], { cells: DUP });
  add('trimmean-rand', 'TRIMMEAN', [ref('A1:A8'), 0.3], { cells: RAND });
  add('trimmean-empty', 'TRIMMEAN', [ref('A1:A3'), 0.2]);
  add('trimmean-err', 'TRIMMEAN', [ref('A1:A4'), 0.2], { cells: ERRS });
  add('trimmean-arr', 'TRIMMEAN', [arr([1, 2, 'a', 4, 100]), 0.4]);
  // FREQUENCY
  add('frequency-basic', 'FREQUENCY', [ref('A1:A9'), ref('C1:C3')], { cells: merge(DUP, colA([2, 4, 6], 'C')) });
  add('frequency-unsorted', 'FREQUENCY', [ref('A1:A9'), ref('C1:C3')], { cells: merge(DUP, colA([6, 2, 4], 'C')) });
  add('frequency-dupbins', 'FREQUENCY', [ref('A1:A9'), ref('C1:C3')], { cells: merge(DUP, colA([3, 3, 5], 'C')) });
  add('frequency-arr', 'FREQUENCY', [arr([1, 2, 3, 4, 5]), arr([2, 4])]);
  add('frequency-mix', 'FREQUENCY', [ref('A1:A8'), arr([0, 5])], { cells: MIX });
  add('frequency-emptybins-neg', 'FREQUENCY', [arr([-1, 0, 1, 2, -3]), ref('C1:C2')]);
  add('frequency-textbins', 'FREQUENCY', [arr([-1, 0, 1, 2, -3]), arr(['a', 'b'])]);
  add('frequency-emptydata', 'FREQUENCY', [ref('A1:A3'), arr([1, 2])]);
  add('frequency-emptybins', 'FREQUENCY', [ref('A1:A9'), ref('C1:C2')], { cells: DUP });
  add('frequency-scalarbin', 'FREQUENCY', [ref('A1:A9'), 4], { cells: DUP });
  add('frequency-err', 'FREQUENCY', [ref('A1:A4'), arr([2])], { cells: ERRS });
  add('frequency-binerr', 'FREQUENCY', [ref('A1:A9'), ref('C1:C2')], { cells: merge(DUP, { C1: 2, C2: E('#N/A') }) });
  add('frequency-bintext', 'FREQUENCY', [ref('A1:A9'), ref('C1:C3')], { cells: merge(DUP, colA([2, 'x', 6], 'C')) });
  // STANDARDIZE, FISHER, FISHERINV, PERMUT, PERMUTATIONA, PROB
  for (const [x, m, s] of [[5, 3, 2], [1.5, 2.5, 0.7], [5, 3, 0], [5, 3, -1], [S('5'), 3, 2], ['x', 3, 2], [true, 0, 1], [E('#N/A'), 0, 1], [5, E('#DIV/0!'), 1], [null, 1, 1]])
    add(`standardize-${slug([x, m, s])}`, 'STANDARDIZE', [x, m, s]);
  for (const x of [0, 0.5, -0.5, 0.75, 0.99, 0.999999, 1, -1, 1.5, 1e-10, S('0,3'), true, 'x', null])
    add(`fisher-${slug(x)}`, 'FISHER', [x]);
  for (const y of [0, 0.5, -0.5, 1, 2, 5, 10, 20, 30, -30, 400, 1e-10, S('0,3'), true, 'x'])
    add(`fisherinv-${slug(y)}`, 'FISHERINV', [y]);
  for (const [n, k] of [[5, 2], [10, 3], [10, 0], [0, 0], [3, 5], [-1, 0], [5, -1], [5.9, 2.9], [100, 10], [170, 170], [200, 100], [1000, 200], [S('6'), 2], [true, 1], ['x', 1], [20, 20]])
    add(`permut-${slug([n, k])}`, 'PERMUT', [n, k]);
  for (const [n, k] of [[5, 2], [10, 3], [10, 0], [0, 0], [0, 3], [3, 5], [-1, 0], [5, -1], [5.9, 2.9], [100, 10], [10, 400], [S('6'), 2], [true, 1], ['x', 1]])
    add(`permutationa-${slug([n, k])}`, 'PERMUTATIONA', [n, k]);
  const PR = merge(colA([0, 1, 2, 3]), colA([0.2, 0.3, 0.1, 0.4], 'B'));
  for (const [lo, hi] of [[2, null], [1, 3], [0, 0], [3, 1], [-1, 10], [1.5, 2.5], [S('1'), 3], [true, 3]])
    add(`prob-${slug([lo, hi])}`, 'PROB', hi === null ? [ref('A1:A4'), ref('B1:B4'), lo] : [ref('A1:A4'), ref('B1:B4'), lo, hi], { cells: PR });
  add('prob-notone', 'PROB', [ref('A1:A4'), ref('B1:B4'), 1], { cells: merge(colA([0, 1, 2, 3]), colA([0.2, 0.3, 0.1, 0.3], 'B')) });
  add('prob-neg', 'PROB', [ref('A1:A4'), ref('B1:B4'), 1], { cells: merge(colA([0, 1, 2, 3]), colA([0.2, -0.3, 0.7, 0.4], 'B')) });
  add('prob-big', 'PROB', [ref('A1:A2'), ref('B1:B2'), 0], { cells: merge(colA([0, 1]), colA([1.5, -0.5], 'B')) });
  add('prob-almost', 'PROB', [ref('A1:A2'), ref('B1:B2'), 0], { cells: merge(colA([0, 1]), colA([0.5, 0.5000001], 'B')) });
  add('prob-almost2', 'PROB', [ref('A1:A2'), ref('B1:B2'), 0], { cells: merge(colA([0, 1]), colA([0.5, 0.50000001], 'B')) });
  add('prob-zero', 'PROB', [ref('A1:A2'), ref('B1:B2'), 0], { cells: merge(colA([0, 1]), colA([0, 1], 'B')) });
  add('prob-size', 'PROB', [ref('A1:A4'), ref('B1:B3'), 1], { cells: PR });
  add('prob-text', 'PROB', [ref('A1:A4'), ref('B1:B4'), 1], { cells: merge(colA([0, 'x', 2, 3]), colA([0.2, 0.3, 0.1, 0.4], 'B')) });
  add('prob-ptext', 'PROB', [ref('A1:A4'), ref('B1:B4'), 1], { cells: merge(colA([0, 1, 2, 3]), colA([0.2, 'x', 0.1, 0.7], 'B')) });
  add('prob-arr', 'PROB', [arr([1, 2, 3]), arr([0.5, 0.25, 0.25]), 2, 3]);
  add('prob-err', 'PROB', [ref('A1:A4'), ref('B1:B4'), 1], { cells: merge(colA([0, E('#N/A'), 2, 3]), colA([0.2, 0.3, 0.1, 0.4], 'B')) });

  // SUBTOTAL
  const SUB = merge(colA([10, 20, 'x', 40, 50, 60, true, 80]), { A9: 260 });
  for (const f of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111]) {
    add(`subtotal-${f}`, 'SUBTOTAL', [f, ref('A1:A8')], { cells: SUB });
    add(`subtotal-${f}-hidden`, 'SUBTOTAL', [f, ref('A1:A8')], { cells: SUB, hiddenRows: [2, 5] });
    add(`subtotal-${f}-filtered`, 'SUBTOTAL', [f, ref('A1:A8')], { cells: SUB, filteredRows: [4, 6] });
    add(`subtotal-${f}-both`, 'SUBTOTAL', [f, ref('A1:A8')], { cells: SUB, hiddenRows: [2], filteredRows: [6] });
    add(`subtotal-${f}-nested`, 'SUBTOTAL', [f, ref('A1:A9')], { cells: SUB, formulas: { A9: '=SUBTOTAL(9,A1:A8)' } });
  }
  // linha oculta à mão dentro × fora do intervalo do AutoFiltro (filtro em AZ1:AZ5)
  add('subtotal-9-hidout', 'SUBTOTAL', [9, ref('A1:A8')], { cells: SUB, hiddenRows: [7], filteredRows: [4] });
  add('subtotal-109-hidout', 'SUBTOTAL', [109, ref('A1:A8')], { cells: SUB, hiddenRows: [7], filteredRows: [4] });
  add('subtotal-9-hidin', 'SUBTOTAL', [9, ref('A1:A8')], { cells: SUB, hiddenRows: [2], filteredRows: [4] });
  add('subtotal-9-hidedge', 'SUBTOTAL', [9, ref('A1:A8')], { cells: SUB, hiddenRows: [5], filteredRows: [4] });
  add('subtotal-9-hidnext', 'SUBTOTAL', [9, ref('A1:A8')], { cells: SUB, hiddenRows: [6], filteredRows: [4] });
  add('aggregate-9-4-hidin', 'AGGREGATE', [9, 4, ref('A1:A8')], { cells: SUB, hiddenRows: [2], filteredRows: [4] });
  add('aggregate-9-4-hidout', 'AGGREGATE', [9, 4, ref('A1:A8')], { cells: SUB, hiddenRows: [7], filteredRows: [4] });
  add('subtotal-nestedagg', 'SUBTOTAL', [9, ref('A1:A9')], { cells: merge(SUB, { A9: 260 }), formulas: { A9: '=AGGREGATE(9,0,A1:A8)' } });
  add('subtotal-nestedsum', 'SUBTOTAL', [9, ref('A1:A9')], { cells: merge(SUB, { A9: 260 }), formulas: { A9: '=SUM(A1:A8)' } });
  add('subtotal-nestedinner', 'SUBTOTAL', [9, ref('A1:A9')], { cells: merge(SUB, { A9: 261 }), formulas: { A9: '=1+SUBTOTAL(9,A1:A8)' } });
  add('subtotal-err', 'SUBTOTAL', [9, ref('A1:A4')], { cells: ERRS });
  add('subtotal-err-count', 'SUBTOTAL', [2, ref('A1:A4')], { cells: ERRS });
  add('subtotal-err-counta', 'SUBTOTAL', [3, ref('A1:A4')], { cells: ERRS });
  add('subtotal-err-hidden', 'SUBTOTAL', [109, ref('A1:A4')], { cells: ERRS, hiddenRows: [2, 4] });
  add('subtotal-multi', 'SUBTOTAL', [9, ref('A1:A3'), ref('C1:C2')], { cells: merge(colA([1, 2, 3]), colA([10, 20], 'C')) });
  add('subtotal-union', 'SUBTOTAL', [9, ref('(A1:A3,C1:C2)')], { cells: merge(colA([1, 2, 3]), colA([10, 20], 'C')) });
  for (const f of [0, 12, 100, 112, -9, 9.7, 109.5, S('9'), true, 'x', E('#N/A')])
    add(`subtotal-f${slug(f)}`, 'SUBTOTAL', [f, ref('A1:A8')], { cells: SUB });
  add('subtotal-farr', 'SUBTOTAL', [arr([9, 4, 1]), ref('A1:A8')], { cells: SUB });
  add('subtotal-arrref', 'SUBTOTAL', [9, arr([1, 2])]);
  add('subtotal-scalarref', 'SUBTOTAL', [9, 5]);
  add('subtotal-col', 'SUBTOTAL', [9, ref('A:A')], { cells: colA([1, 2, 3, 4]), hiddenRows: [2] });
  add('subtotal-col109', 'SUBTOTAL', [109, ref('A:A')], { cells: colA([1, 2, 3, 4]), hiddenRows: [2] });
  add('subtotal-row109', 'SUBTOTAL', [109, ref('A1:E1')], { cells: { A1: 1, B1: 2, C1: 3, D1: 4, E1: 5 }, hiddenRows: [1] });
  add('subtotal-empty', 'SUBTOTAL', [1, ref('A1:A3')]);
  add('subtotal-allhidden', 'SUBTOTAL', [101, ref('A1:A3')], { cells: colA([1, 2, 3]), hiddenRows: [1, 2, 3] });

  // AGGREGATE: todas as funções × opções sobre dados com erro, linha oculta e subtotal aninhado
  const AG = merge(colA([10, 20, E('#DIV/0!'), 40, 'x', 60, 70, 15]), { A9: 215 });
  for (let f = 1; f <= 19; f++) for (let o = 0; o <= 7; o++) {
    const k = f >= 14 ? [f === 16 || f === 18 ? 0.4 : f >= 17 ? 1 : 2] : [];
    add(`aggregate-${f}-${o}`, 'AGGREGATE', [f, o, ref('A1:A9'), ...k], { cells: AG, hiddenRows: [2], formulas: { A9: '=SUBTOTAL(9,A1:A2,A4:A8)' } });
  }
  for (let f = 1; f <= 19; f++) {
    const k = f >= 14 ? [f === 16 || f === 18 ? 0.4 : f >= 17 ? 1 : 2] : [];
    add(`aggregate-${f}-clean`, 'AGGREGATE', [f, 4, ref('A1:A8'), ...k], { cells: RAND });
    add(`aggregate-${f}-filtered`, 'AGGREGATE', [f, 4, ref('A1:A8'), ...k], { cells: RAND, filteredRows: [3] });
    add(`aggregate-${f}-filtered5`, 'AGGREGATE', [f, 5, ref('A1:A8'), ...k], { cells: RAND, filteredRows: [3] });
    add(`aggregate-${f}-filtered0`, 'AGGREGATE', [f, 0, ref('A1:A8'), ...k], { cells: RAND, filteredRows: [3] });
  }
  add('aggregate-arr14', 'AGGREGATE', [14, 6, arr([1, E('#N/A'), 5, 3]), 2]);
  add('aggregate-arr14-err', 'AGGREGATE', [14, 4, arr([1, E('#N/A'), 5, 3]), 2]);
  add('aggregate-arr9', 'AGGREGATE', [9, 6, arr([1, E('#N/A'), 5, 3])]);
  add('aggregate-arr15k', 'AGGREGATE', [15, 6, ref('A1:A8'), arr([1, 2])], { cells: RAND });
  add('aggregate-multi', 'AGGREGATE', [9, 4, ref('A1:A3'), ref('C1:C2')], { cells: merge(colA([1, 2, 3]), colA([10, 20], 'C')) });
  add('aggregate-14-nok', 'AGGREGATE', [14, 4, ref('A1:A8')], { cells: RAND });
  add('aggregate-9-extrak', 'AGGREGATE', [9, 4, ref('A1:A8'), ref('A1:A2')], { cells: RAND });
  for (const [f, o] of [[0, 0], [20, 0], [9, 8], [9, -1], [9.5, 1.9], [S('9'), S('4')], [true, 4], ['x', 4], [9, 'x'], [E('#N/A'), 4]])
    add(`aggregate-bad-${slug([f, o])}`, 'AGGREGATE', [f, o, ref('A1:A8')], { cells: RAND });
  add('aggregate-omitopt', 'AGGREGATE', [9, OMIT, ref('A1:A8')], { cells: RAND });
  add('aggregate-14-k0', 'AGGREGATE', [14, 4, ref('A1:A8'), 0], { cells: RAND });
  add('aggregate-16-p2', 'AGGREGATE', [16, 4, ref('A1:A8'), 2], { cells: RAND });
  add('aggregate-3-hiddenerr', 'AGGREGATE', [3, 3, ref('A1:A9')], { cells: AG, hiddenRows: [3], formulas: { A9: '=SUBTOTAL(9,A1:A2,A4:A8)' } });

  out('stat', cases);
}
