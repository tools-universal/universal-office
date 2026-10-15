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
  add('subtotal-snap', 'SUBTOTAL', [9, ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
  add('subtotal-snap1', 'SUBTOTAL', [1, ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
  add('aggregate-snap', 'AGGREGATE', [9, 4, ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
  add('aggregate-snap1', 'AGGREGATE', [1, 4, ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
  add('averagea-snap', 'AVERAGEA', [ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
  add('devsq-snap', 'DEVSQ', [ref('A1:A3')], { cells: colA([0.1, 0.2, -0.3]) });
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

// ---------------------------------------------------------------------------
// stat-ifs: critérios (COUNTIF/SUMIF/…IFS). SUMIF com potências de 2 na coluna B
// revela exatamente QUAIS linhas casaram.
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `stat-ifs-${id}`, fn, args, ...extra });
  const CRIT_COL = [
    1, S('1'), true, false, 'TRUE', 'VERDADEIRO', null, '', 'abc', 'ABC',
    'a*c', 'abd', 2.5, S('2,5'), -1, 0, E('#N/A'), E('#DIV/0!'), '#N/A', 45292,
    S('01/01/2024'), ' 1', 'a?c', 'a~c', '1*', 100, 'b', '=', '<>', 0.5,
  ];
  const cells = {};
  CRIT_COL.forEach((v, i) => { if (v !== null && v !== '') cells[`A${i + 1}`] = v; cells[`B${i + 1}`] = 2 ** i; });
  const formulas = { A8: '=""' };
  cells.A8 = '';
  const crits = [
    1, S('1'), '=1', '>0', '<1', '>=1', '<=1', '<>1', true, false, 'TRUE', 'VERDADEIRO', 'FALSO', '=TRUE', '=VERDADEIRO', '<>VERDADEIRO', '>FALSO',
    '', '=', '<>', 'abc', 'ABC', 'a*', '*c', 'a?c', 'a~?c', 'a~*c', 'a~~c', '~', '*', '?', '??', '>a', '<b', '>=abc', '<>abc', '>=',
    '#N/A', E('#N/A'), '=#N/A', '<>#N/A', '#DIV/0!', '#n/a', 2.5, '2,5', '2.5', '<2,5', '>1,5', '>=2,5', '01/01/2024', '>31/12/2023', '1/1/2024', '2024-01-01', '45292',
    '50%', ' 1', '1 ', '=a*', '<>a*', '>1*', '*1*', '1*', '==1', '= 1', '<= 1', '>', '<', '<=', '=<1', '>-1', '<0,5', '0,5', '1E0', '+1', '(1)', 'R$ 1', '1.0', '=abc*', '<>*',
    0, -1, 45292, '=0', '<>0', '*a*', 'a', 'b*', '?b', 'a**', '~~', '~a', '1,0', 'R$1', '$1', '=-1', '-1', '- 1',
  ];
  crits.forEach((c, i) => {
    add(`sumif-${i}-${slug(c)}`, 'SUMIF', [ref('A1:A30'), c, ref('B1:B30')], { cells, formulas });
    add(`countif-${i}-${slug(c)}`, 'COUNTIF', [ref('A1:A30'), c], { cells, formulas });
  });
  // critério vazio (célula de critério vazia) e critério em célula
  add('countif-critcell-empty', 'COUNTIF', [ref('A1:A30'), ref('D1')], { cells, formulas });
  add('sumif-critcell-empty', 'SUMIF', [ref('A1:A30'), ref('D1'), ref('B1:B30')], { cells, formulas });
  add('countif-critcell-num', 'COUNTIF', [ref('A1:A30'), ref('D1')], { cells: merge(cells, { D1: 1 }), formulas });
  add('sumif-critcell-text', 'SUMIF', [ref('A1:A30'), ref('D1'), ref('B1:B30')], { cells: merge(cells, { D1: S('1') }), formulas });
  add('sumif-critcell-err', 'SUMIF', [ref('A1:A30'), ref('D1'), ref('B1:B30')], { cells: merge(cells, { D1: E('#N/A') }), formulas });
  add('sumif-critcell-bool', 'SUMIF', [ref('A1:A30'), ref('D1'), ref('B1:B30')], { cells: merge(cells, { D1: true }), formulas });
  add('sumif-critomit', 'SUMIF', [ref('A1:A30'), OMIT, ref('B1:B30')], { cells, formulas });
  add('countif-critomit', 'COUNTIF', [ref('A1:A30'), OMIT], { cells, formulas });
  add('countif-critarr', 'COUNTIF', [ref('A1:A30'), arr([1, 'abc', '>0'])], { cells, formulas });
  add('sumif-critarr', 'SUMIF', [ref('A1:A30'), arr([1], ['a*']), ref('B1:B30')], { cells, formulas });
  add('countif-critref', 'COUNTIF', [ref('A1:A30'), ref('D1:D3')], { cells: merge(cells, { D1: 1, D2: 'abc', D3: '>50' }), formulas });
  add('countif-critref-legacy', 'COUNTIF', [ref('A1:A30'), ref('D1:D3')], { cells: merge(cells, { D1: 1, D2: 'abc', D3: '>50' }), formulas, at: 'Z2', legacy: true });
  // colunas inteiras e vazios
  add('countif-col-blank', 'COUNTIF', [ref('A:A'), ''], { cells: colA([1, 2, 'x']) });
  add('countif-col-eq', 'COUNTIF', [ref('A:A'), '='], { cells: colA([1, 2, 'x']) });
  add('countif-col-ne', 'COUNTIF', [ref('A:A'), '<>'], { cells: colA([1, 2, 'x']) });
  add('countif-col-nex', 'COUNTIF', [ref('A:A'), '<>x'], { cells: colA([1, 2, 'x']) });
  add('countif-col-num', 'COUNTIF', [ref('A:A'), '>1'], { cells: colA([1, 2, 'x']) });
  const G = { A1: 1, B1: 2, C1: 3, A2: 4, B2: 'x', C2: 6, A3: true, C3: 9 };
  add('countif-2d', 'COUNTIF', [ref('A1:C3'), '>2'], { cells: G });
  add('countif-2d-blank', 'COUNTIF', [ref('A1:C3'), ''], { cells: G });
  add('countif-rows', 'COUNTIF', [ref('2:3'), '>2'], { cells: G });
  add('countif-union', 'COUNTIF', [ref('(A1:A3,C1:C3)'), '>2'], { cells: G });
  // texto longo (> 255) no critério
  const long = 'x'.repeat(300);
  add('countif-long', 'COUNTIF', [ref('A1:A2'), long], { cells: { A1: long, A2: 'x' } });
  add('countif-long255', 'COUNTIF', [ref('A1:A2'), 'x'.repeat(255)], { cells: { A1: 'x'.repeat(255), A2: 'x' } });
  // SUMIF: intervalo de soma de outro tamanho/forma
  const SR = merge(colA([1, 2, 3, 4, 5]), colA([10, 20, 30, 40, 50], 'B'), colA([100, 200], 'C'), { D1: 1000, E1: 2000, F1: 3000 });
  const SRT = merge(colA([1, 2, 3, 4]), colA([10, 'x', true, S('5')], 'B'));
  const SRE = merge(colA([1, 2, 3, 4]), colA([E('#N/A'), 1, 2, 3], 'B'));
  add('sumif-sr-cell', 'SUMIF', [ref('A1:A5'), '>2', ref('B1')], { cells: SR });
  add('sumif-sr-short', 'SUMIF', [ref('A1:A5'), '>2', ref('B1:B2')], { cells: SR });
  add('sumif-sr-long', 'SUMIF', [ref('A1:A3'), '>1', ref('B1:B5')], { cells: SR });
  add('sumif-sr-row', 'SUMIF', [ref('A1:A3'), '>1', ref('D1:F1')], { cells: SR });
  add('sumif-sr-offset', 'SUMIF', [ref('A1:A5'), '>2', ref('C1')], { cells: SR });
  add('sumif-nosr', 'SUMIF', [ref('A1:A5'), '>2'], { cells: SR });
  add('sumif-nosr-mix', 'SUMIF', [ref('A1:A30'), '<>abc'], { cells, formulas });
  add('sumif-srtext', 'SUMIF', [ref('A1:A4'), '>0', ref('B1:B4')], { cells: SRT });
  add('sumif-srerr', 'SUMIF', [ref('A1:A4'), '>2', ref('B1:B4')], { cells: SRE });
  add('sumif-srerr-hit', 'SUMIF', [ref('A1:A4'), '>0', ref('B1:B4')], { cells: SRE });
  add('sumif-srarr', 'SUMIF', [ref('A1:A4'), '>0', arr([1], [2], [3], [4])], { cells: colA([1, 2, 3, 4]) });
  add('sumif-snap', 'SUMIF', [ref('A1:A3'), '>0'], { cells: colA([0.1, 0.2, -0.3]) });
  add('sumif-snap2', 'SUMIF', [ref('A1:A3'), '<>z'], { cells: colA([0.1, 0.2, -0.3]) });
  add('averageif-snap2', 'AVERAGEIF', [ref('A1:A3'), '<>z'], { cells: colA([0.1, 0.2, -0.3]) });
  add('sumif-snap3', 'SUMIF', [ref('A1:A3'), '<>z', ref('B1:B3')], { cells: merge(colA(['a', 'b', 'c']), colA([0.1, 0.2, -0.3], 'B')) });
  add('countif-numeq', 'COUNTIF', [ref('A1:A2'), ref('D1')], { cells: { A1: 0.3, A2: 0.30000000000000004, D1: 0.30000000000000004 }, formulas: { A2: '=0.1+0.2', D1: '=0.1+0.2' } });
  add('countif-numeq2', 'COUNTIF', [ref('A1:A2'), 0.3], { cells: { A1: 0.3, A2: 0.30000000000000004 }, formulas: { A2: '=0.1+0.2' } });
  add('countif-numeq3', 'COUNTIF', [ref('A1:A2'), '>=0,3'], { cells: { A1: 0.3, A2: 0.30000000000000004 }, formulas: { A2: '=0.1+0.2' } });
  // tolerância da igualdade numérica: célula 1+k·2^-52 (fórmula) contra o critério 1
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 24, 32, 64, 128, 256, 1024]) {
    const v = 1 + k * 2 ** -52, w = 1 - k * 2 ** -53;
    add(`countif-tol-p${k}`, 'COUNTIF', [ref('A1'), 1], { cells: { A1: v }, formulas: { A1: `=1+${k}*2^-52` } });
    add(`countif-tol-m${k}`, 'COUNTIF', [ref('A1'), 1], { cells: { A1: w }, formulas: { A1: `=1-${k}*2^-53` } });
    add(`countif-tolge-m${k}`, 'COUNTIF', [ref('A1'), '>=1'], { cells: { A1: w }, formulas: { A1: `=1-${k}*2^-53` } });
    add(`countif-tolne-p${k}`, 'COUNTIF', [ref('A1'), '<>1'], { cells: { A1: v }, formulas: { A1: `=1+${k}*2^-52` } });
    add(`countif-toltxt-p${k}`, 'COUNTIF', [ref('A1'), ref('B1')], { cells: { A1: 1, B1: v }, formulas: { B1: `=1+${k}*2^-52` } });
  }
  add('countif-tol-big', 'COUNTIF', [ref('A1'), 123456789012345], { cells: { A1: 123456789012345.6 }, formulas: { A1: '=123456789012345+0.6' } });
  add('countif-tol-big2', 'COUNTIF', [ref('A1'), 123456789012346], { cells: { A1: 123456789012345.6 }, formulas: { A1: '=123456789012345+0.6' } });
  add('countif-wild-tilde', 'COUNTIF', [ref('A1:A4'), 'a~b*'], { cells: colA(['a~bc', 'abc', 'a~b', 'ab']) });
  add('countif-wild-tilde2', 'COUNTIF', [ref('A1:A4'), '~a*'], { cells: colA(['a~bc', 'abc', '~abc', 'ab']) });
  add('countif-wild-tilde3', 'COUNTIF', [ref('A1:A4'), '*~~*'], { cells: colA(['a~bc', 'abc', 'a~~b', 'ab']) });
  add('countif-sz', 'COUNTIF', [ref('A1:A4'), 'straße'.replace('\u00df', 'ß')], { cells: colA(['strasse', 'straße', 'STRASSE', 'strase']) });
  add('countif-accent', 'COUNTIF', [ref('A1:A4'), 'cafe'], { cells: colA(['café', 'cafe', 'CAFE', 'CAFÉ']) });
  add('countif-accent-wild', 'COUNTIF', [ref('A1:A4'), 'caf?'], { cells: colA(['café', 'cafe', 'CAFE', 'CAFÉ']) });
  add('countif-hyphen', 'COUNTIF', [ref('A1:A4'), 'coop'], { cells: colA(['co-op', 'coop', "co'op", 'CO-OP']) });
  add('countif-hyphen-gt', 'COUNTIF', [ref('A1:A4'), '>coop'], { cells: colA(['co-op', 'coop', "co'op", 'cop']) });
  add('countif-trail', 'COUNTIF', [ref('A1:A3'), 'abc'], { cells: colA(['abc ', ' abc', 'abc']) });
  add('countif-long256', 'COUNTIF', [ref('A1:A2'), 'x'.repeat(256)], { cells: { A1: 'x'.repeat(256), A2: 'x' } });
  add('sumifs-long', 'SUMIFS', [ref('B1:B2'), ref('A1:A2'), 'x'.repeat(256)], { cells: { A1: 'x'.repeat(256), A2: 'x', B1: 1, B2: 2 } });
  add('countifs-union', 'COUNTIFS', [ref('(A1:A2,C1:C2)'), '>0'], { cells: { A1: 1, A2: 2, C1: 3, C2: 4 } });
  add('countif-time', 'COUNTIF', [ref('A1:A3'), '12:00'], { cells: colA([0.5, 0.25, S('12:00')]) });
  add('countif-time2', 'COUNTIF', [ref('A1:A3'), '>06:00'], { cells: colA([0.5, 0.25, S('12:00')]) });
  // AVERAGEIF
  add('averageif-basic', 'AVERAGEIF', [ref('A1:A5'), '>2', ref('B1:B5')], { cells: SR });
  add('averageif-nosr', 'AVERAGEIF', [ref('A1:A5'), '>2'], { cells: SR });
  add('averageif-none', 'AVERAGEIF', [ref('A1:A5'), '>20'], { cells: SR });
  add('averageif-srtext', 'AVERAGEIF', [ref('A1:A4'), '>0', ref('B1:B4')], { cells: SRT });
  add('averageif-sr-cell', 'AVERAGEIF', [ref('A1:A5'), '>2', ref('B1')], { cells: SR });
  add('averageif-srerr', 'AVERAGEIF', [ref('A1:A4'), '>2', ref('B1:B4')], { cells: SRE });
  add('averageif-mix', 'AVERAGEIF', [ref('A1:A30'), '<>abc'], { cells, formulas });
  add('averageif-critarr', 'AVERAGEIF', [ref('A1:A5'), arr(['>1', '>3', '>9'])], { cells: SR });
  // COUNTIFS / SUMIFS / AVERAGEIFS / MAXIFS / MINIFS
  const T = merge(colA(['a', 'b', 'a', 'c', 'a', 'b', null, 'a']), colA([1, 5, 3, 7, 9, 2, 4, E('#N/A')], 'B'), colA([10, 20, 'x', 40, true, 60, 70, 80], 'C'));
  add('countifs-1', 'COUNTIFS', [ref('A1:A8'), 'a'], { cells: T });
  add('countifs-2', 'COUNTIFS', [ref('A1:A8'), 'a', ref('B1:B8'), '>2'], { cells: T });
  add('countifs-3', 'COUNTIFS', [ref('A1:A8'), '<>b', ref('B1:B8'), '>2', ref('C1:C8'), '>0'], { cells: T });
  add('countifs-size', 'COUNTIFS', [ref('A1:A8'), 'a', ref('B1:B7'), '>2'], { cells: T });
  add('countifs-shape', 'COUNTIFS', [ref('A1:A2'), 'a', ref('B1:C1'), '>0'], { cells: T });
  add('countifs-blank', 'COUNTIFS', [ref('A1:A8'), '', ref('B1:B8'), '>0'], { cells: T });
  add('countifs-same', 'COUNTIFS', [ref('A1:A8'), 'a', ref('A1:A8'), '<>b'], { cells: T });
  add('countifs-odd', 'COUNTIFS', [ref('A1:A8'), 'a', ref('B1:B8')], { cells: T });
  add('countifs-arr', 'COUNTIFS', [ref('A1:A8'), arr(['a', 'b', 'c'])], { cells: T });
  add('countifs-arr2', 'COUNTIFS', [ref('A1:A8'), arr(['a', 'b']), ref('B1:B8'), arr(['>2'], ['>0'])], { cells: T });
  add('countifs-col', 'COUNTIFS', [ref('A:A'), '', ref('B:B'), '']);
  add('countifs-col2', 'COUNTIFS', [ref('A:A'), 'a', ref('B:B'), '>2'], { cells: T });
  add('countifs-colblank', 'COUNTIFS', [ref('A:A'), '', ref('B:B'), '>2'], { cells: T });
  add('countifs-colblank2', 'COUNTIFS', [ref('A:A'), '', ref('C:C'), ''], { cells: T });
  add('countifs-colne', 'COUNTIFS', [ref('A:A'), '<>a', ref('B:B'), '<>9'], { cells: T });
  for (const f of ['SUMIFS', 'AVERAGEIFS', 'MAXIFS', 'MINIFS']) {
    const k = f.toLowerCase();
    add(`${k}-1`, f, [ref('B1:B8'), ref('A1:A8'), 'a'], { cells: T });
    add(`${k}-2`, f, [ref('B1:B8'), ref('A1:A8'), 'a', ref('B1:B8'), '<9'], { cells: T });
    add(`${k}-c`, f, [ref('C1:C8'), ref('A1:A8'), '<>c'], { cells: T });
    add(`${k}-none`, f, [ref('B1:B8'), ref('A1:A8'), 'zz'], { cells: T });
    add(`${k}-size`, f, [ref('B1:B7'), ref('A1:A8'), 'a'], { cells: T });
    add(`${k}-size2`, f, [ref('B1:B8'), ref('A1:A8'), 'a', ref('C1:C7'), '>0'], { cells: T });
    add(`${k}-odd`, f, [ref('B1:B8'), ref('A1:A8')], { cells: T });
    add(`${k}-arr`, f, [ref('B1:B8'), ref('A1:A8'), arr(['a', 'b'])], { cells: T });
    add(`${k}-sumarr`, f, [arr([1], [2], [3], [4], [5], [6], [7], [8]), ref('A1:A8'), 'a'], { cells: T });
    add(`${k}-col`, f, [ref('B:B'), ref('A:A'), 'b'], { cells: T });
    add(`${k}-colblank`, f, [ref('B:B'), ref('A:A'), ''], { cells: T });
    add(`${k}-errhit`, f, [ref('B1:B8'), ref('A1:A8'), 'a', ref('C1:C8'), '>50'], { cells: T });
    add(`${k}-neg`, f, [ref('B1:B3'), ref('A1:A3'), '<>z'], { cells: merge(colA(['a', 'b', 'c']), colA([-5, -2, -9], 'B')) });
    add(`${k}-snap`, f, [ref('B1:B3'), ref('A1:A3'), '<>z'], { cells: merge(colA(['a', 'b', 'c']), colA([0.1, 0.2, -0.3], 'B')) });
    add(`${k}-boolsr`, f, [ref('B1:B3'), ref('A1:A3'), '<>z'], { cells: merge(colA(['a', 'b', 'c']), colA([true, S('4'), 7], 'B')) });
  }
  out('stat-ifs', cases);
}

// ---------------------------------------------------------------------------
// db: funções de banco de dados (DSUM…). Base em A1:D9; critérios a partir de F1.
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `db-${id}`, fn, args, ...extra });
  const DB = {};
  const rows = [
    ['Tree', 'Height', 'Age', 'Yield'],
    ['Apple', 18, 20, 14],
    ['Pear', 12, 12, 10],
    ['Cherry', 13, 14, 9],
    ['Apple', 14, 15, 10],
    ['Pear', 9, 8, 8],
    ['Apple', 8, 9, 6],
    ['apple pie', 10, 'x', 7],
    ['Applesauce', 11, true, 12],
  ];
  rows.forEach((r, i) => r.forEach((v, j) => { DB[`${'ABCD'[j]}${i + 1}`] = v; }));
  /** Critérios: matriz de linhas (a 1ª é o cabeçalho) a partir de F1. */
  const crit = (grid) => {
    const c = {};
    grid.forEach((r, i) => r.forEach((v, j) => { if (v !== null) c[`${'FGHIJ'[j]}${i + 1}`] = v; }));
    return c;
  };
  const critRef = (grid) => `F1:${'FGHIJ'[grid[0].length - 1]}${grid.length}`;
  const layouts = {
    apple: [['Tree'], ['Apple']],
    eqapple: [['Tree'], ['=Apple']],
    applewild: [['Tree'], ['App*']],
    apple_or_pear: [['Tree'], ['Apple'], ['Pear']],
    apple_h10: [['Tree', 'Height'], ['Apple', '>10']],
    range: [['Height', 'Height'], ['>10', '<16']],
    or2: [['Tree', 'Height'], ['Apple', null], [null, '>12']],
    emptyrow: [['Tree'], [null]],
    headeronly: [['Tree']],
    num: [['Height'], [12]],
    numtext: [['Height'], ['12']],
    ne: [['Tree'], ['<>Apple']],
    lt: [['Tree'], ['<B']],
    gtnum: [['Age'], ['>10']],
    blankcrit: [['Age'], ['=']],
    neblank: [['Age'], ['<>']],
    caseHdr: [['tree'], ['apple']],
    badHdr: [['Nope'], ['Apple']],
    bool: [['Age'], [true]],
    booltext: [['Age'], ['VERDADEIRO']],
    multi: [['Tree', 'Age'], ['Apple', '>10'], ['Pear', '<10']],
    emptyhdr: [[null], ['Apple']],
    q: [['Tree'], ['?ear']],
    x: [['Age'], ['x']],
    eqx: [['Age'], ['=x']],
  };
  const fns = ['DSUM', 'DAVERAGE', 'DCOUNT', 'DCOUNTA', 'DGET', 'DMAX', 'DMIN', 'DPRODUCT', 'DSTDEV', 'DSTDEVP', 'DVAR', 'DVARP'];
  for (const f of fns) {
    const k = f.toLowerCase();
    for (const [name, grid] of Object.entries(layouts)) {
      add(`${k}-${name}`, f, [ref('A1:D9'), 'Yield', ref(critRef(grid))], { cells: merge(DB, crit(grid)) });
    }
    // campo: rótulo, número, fora, texto não encontrado, omitido, booleano, erro
    for (const fld of ['Height', 'height', 2, 4, 2.7, 0, 5, 'Nope', S('2'), true, E('#N/A'), OMIT, 'Tree', 'Age', -1, null])
      add(`${k}-field-${slug(fld)}`, f, [ref('A1:D9'), fld, ref('F1:F2')], { cells: merge(DB, crit(layouts.apple)) });
    add(`${k}-dbcol`, f, [ref('A:D'), 'Yield', ref('F1:F2')], { cells: merge(DB, crit(layouts.apple)) });
    add(`${k}-critcol`, f, [ref('A1:D9'), 'Yield', ref('F:F')], { cells: merge(DB, crit(layouts.apple)) });
    add(`${k}-dbarr`, f, [arr(['Tree', 'Yield'], ['Apple', 5], ['Pear', 7]), 'Yield', ref('F1:F2')], { cells: crit(layouts.apple) });
    add(`${k}-critarr`, f, [ref('A1:D9'), 'Yield', arr(['Tree'], ['Apple'])], { cells: DB });
    add(`${k}-err`, f, [ref('A1:D9'), 'Yield', ref('F1:F2')], { cells: merge(DB, { D2: E('#N/A') }, crit(layouts.apple)) });
    add(`${k}-errother`, f, [ref('A1:D9'), 'Yield', ref('F1:F2')], { cells: merge(DB, { D3: E('#N/A') }, crit(layouts.apple)) });
    add(`${k}-errcrit`, f, [ref('A1:D9'), 'Yield', ref('F1:F2')], { cells: merge(DB, { B2: E('#N/A') }, crit([['Height'], ['>10']])) });
    add(`${k}-heightfield`, f, [ref('A1:D9'), 'Height', ref('F1:F2')], { cells: merge(DB, crit([['Age'], ['>9']])) });
    add(`${k}-agefield`, f, [ref('A1:D9'), 'Age', ref('F1:F2')], { cells: merge(DB, crit([['Height'], ['>9']])) });
    add(`${k}-treefield`, f, [ref('A1:D9'), 'Tree', ref('F1:F2')], { cells: merge(DB, crit([['Height'], ['>12']])) });
    add(`${k}-dup`, f, [ref('A1:D9'), 'Yield', ref('F1:F2')], { cells: merge(DB, { C1: 'Yield' }, crit([['Yield'], ['>9']])) });
    add(`${k}-onerow`, f, [ref('A1:D1'), 'Yield', ref('F1:F2')], { cells: merge(DB, crit(layouts.apple)) });
    add(`${k}-dec`, f, [ref('A1:B7'), 'Height', ref('F1:F2')], { cells: merge({ A1: 'K', B1: 'Height', A2: 'a', B2: 0.1, A3: 'a', B3: 0.7, A4: 'a', B4: 0.3, A5: 'b', B5: 9, A6: 'a', B6: 1.1, A7: 'a', B7: 2.2 }, crit([['K'], ['a']])) });
  }
  // soma com o zero do Excel, DGET de texto/vazio, sem registros
  const SN = { A1: 'K', B1: 'V', A2: 'a', B2: 0.1, A3: 'a', B3: 0.2, A4: 'a', B4: -0.3, A5: 'b', B5: 'txt', A6: 'c' };
  for (const f of ['DSUM', 'DAVERAGE', 'DPRODUCT', 'DMAX', 'DMIN', 'DCOUNT', 'DCOUNTA', 'DSTDEV', 'DVAR', 'DGET']) {
    const k = f.toLowerCase();
    add(`${k}-snap`, f, [ref('A1:B6'), 'V', ref('F1:F2')], { cells: merge(SN, crit([['K'], ['a']])) });
    add(`${k}-none`, f, [ref('A1:B6'), 'V', ref('F1:F2')], { cells: merge(SN, crit([['K'], ['z']])) });
    add(`${k}-txt`, f, [ref('A1:B6'), 'V', ref('F1:F2')], { cells: merge(SN, crit([['K'], ['b']])) });
    add(`${k}-blank`, f, [ref('A1:B6'), 'V', ref('F1:F2')], { cells: merge(SN, crit([['K'], ['c']])) });
  }
  out('db', cases);
}

// ---------------------------------------------------------------------------
// stat-dist: distribuições e testes. Grade de parâmetros por função (centro,
// caudas, bordas) + erros e tipos em cada argumento.
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `stat-dist-${id}`, fn, args, ...extra });
  /** Casos de uma função sobre o produto cartesiano das listas de valores. */
  const grid = (fn, lists, tag = '') => {
    const rec = (i, acc) => {
      if (i === lists.length) { add(`${fn.toLowerCase()}${tag}-${acc.map(slug).join('_')}`, fn, acc); return; }
      for (const v of lists[i]) rec(i + 1, [...acc, v]);
    };
    rec(0, []);
  };
  /** Varia um argumento por vez com valores ruins, a partir de uma base válida. */
  const bad = (fn, base, values = [S('1'), 'x', true, E('#N/A'), null, -1, 0]) => {
    base.forEach((_, i) => { for (const v of values) { const a = [...base]; a[i] = v; add(`${fn.toLowerCase()}-bad${i}-${slug(v)}`, fn, a); } });
  };
  const X = [-40, -37.6, -37.5, -30, -10, -5.5, -3, -1.96, -1, -0.5, -0.1, 0, 0.1, 0.5, 1, 1.645, 2.5, 4, 6, 9, 15];
  grid('NORM.S.DIST', [X, [true, false]]);
  grid('NORMSDIST', [X]);
  grid('NORM.DIST', [[-3, 0, 1.5, 7, 42], [0, 2.5, -1], [0.5, 1, 3], [true, false]]);
  grid('NORMDIST', [[-3, 1.5, 42], [2.5], [0.5, 3], [true, false]]);
  bad('NORM.DIST', [1, 0, 1, true]);
  const P = [1e-300, 1e-100, 1e-20, 1e-10, 1e-5, 0.001, 0.01, 0.025, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.45, 0.49, 0.5, 0.51, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 0.975, 0.99, 0.999, 0.99999, 0.9999999, 0, 1, -0.1, 1.1];
  grid('NORM.S.INV', [P]);
  grid('NORMSINV', [P]);
  grid('NORM.INV', [[0.001, 0.3, 0.5, 0.9, 0.999999], [0, -2.5, 100], [0.5, 2]]);
  grid('NORMINV', [[0.3, 0.9], [100], [2]]);
  bad('NORM.INV', [0.5, 0, 1]);
  grid('GAUSS', [[-40, -5, -1, -0.1, 0, 0.1, 0.5, 1, 2, 3, 10]]);
  grid('PHI', [[-40, -5, -1, -0.1, 0, 0.1, 0.5, 1, 2, 3, 10]]);
  grid('LOGNORM.DIST', [[0.001, 0.5, 1, 2.7, 10, 1000], [0, 1.2], [0.5, 2], [true, false]]);
  grid('LOGNORMDIST', [[0.5, 2.7, 1000], [0, 1.2], [0.5, 2]]);
  bad('LOGNORM.DIST', [1, 0, 1, true]);
  grid('LOGNORM.INV', [[0.001, 0.3, 0.5, 0.9, 0.999], [0, 1.2], [0.5, 2]]);
  grid('LOGINV', [[0.3, 0.9], [1.2], [0.5]]);
  bad('LOGNORM.INV', [0.5, 0, 1]);
  grid('EXPON.DIST', [[0, 1e-10, 0.001, 0.5, 1, 3, 20, 100, 800], [0.5, 1, 10], [true, false]]);
  grid('EXPONDIST', [[0.5, 3], [1, 10], [true, false]]);
  bad('EXPON.DIST', [1, 1, true]);
  grid('WEIBULL.DIST', [[0, 0.001, 0.5, 1, 3, 20], [0.5, 1, 2.5], [1, 3.3], [true, false]]);
  grid('WEIBULL', [[0.5, 3], [2.5], [3.3], [true, false]]);
  bad('WEIBULL.DIST', [1, 1, 1, true]);
  grid('GAMMA.DIST', [[0, 0.001, 0.5, 1, 3, 10, 50, 200], [0.3, 1, 2.5, 10, 100], [0.5, 2], [true, false]]);
  grid('GAMMADIST', [[0.5, 10], [2.5], [2], [true, false]]);
  bad('GAMMA.DIST', [1, 1, 1, true]);
  grid('GAMMA.INV', [[0, 0.001, 0.05, 0.5, 0.95, 0.999999, 1], [0.3, 1, 2.5, 10, 100], [0.5, 2]]);
  grid('GAMMAINV', [[0.05, 0.95], [2.5], [2]]);
  bad('GAMMA.INV', [0.5, 1, 1]);
  grid('GAMMALN', [[0.001, 0.1, 0.5, 0.9999, 1, 1.0001, 1.5, 2, 2.5, 3, 4.5, 7.3, 10, 11.5, 12, 12.5, 33.3, 100, 170.5, 1000, 1e5, 1e10, 1e300, 0, -1, -1.5]]);
  grid('GAMMALN.PRECISE', [[0.001, 0.5, 1.5, 7.3, 100, 1e10, 0, -2.5]]);
  grid('GAMMA', [[0.001, 0.1, 0.5, 0.9999, 1, 1.5, 2, 2.5, 3, 4.5, 7.3, 10, 10.1, 33.3, 100.5, 170.5, 171, 171.2, 171.7, 172, 0, -1, -0.5, -1.5, -2.5, -170.5, -171.5, -200.5]]);
  const CX = [0, 0.001, 0.5, 1, 3.84, 10, 30, 100, 500, 1500];
  grid('CHISQ.DIST', [CX, [1, 2, 3.7, 10, 100], [true, false]]);
  grid('CHISQ.DIST.RT', [CX, [1, 2, 3.7, 10, 100]]);
  grid('CHIDIST', [[0.5, 3.84, 30, 500], [1, 10]]);
  bad('CHISQ.DIST', [1, 1, true]);
  bad('CHISQ.DIST.RT', [1, 1]);
  const CP = [0, 1e-10, 0.001, 0.05, 0.5, 0.95, 0.999, 1 - 1e-10, 1];
  grid('CHISQ.INV', [CP, [1, 2, 3.7, 10, 100]]);
  grid('CHISQ.INV.RT', [CP, [1, 2, 3.7, 10, 100]]);
  grid('CHIINV', [[0.05, 0.5, 0.999], [1, 10]]);
  bad('CHISQ.INV', [0.5, 1]);
  bad('CHISQ.INV.RT', [0.5, 1]);
  grid('BETA.DIST', [[0, 0.001, 0.2, 0.5, 0.8, 0.999, 1], [0.5, 1, 2.5, 30], [0.5, 2, 8], [true, false]]);
  grid('BETA.DIST', [[2, 3.5, 5], [2], [3], [true, false], [2], [5]], '-ab');
  grid('BETADIST', [[0.2, 0.8], [2.5], [2], [OMIT, 0], [OMIT, 1]]);
  grid('BETADIST', [[3.5], [2], [3], [2], [5]], '-ab');
  bad('BETA.DIST', [0.5, 1, 1, true]);
  add('beta.dist-xbelow', 'BETA.DIST', [1.5, 2, 3, true, 2, 5]);
  add('beta.dist-ab-eq', 'BETA.DIST', [2, 2, 3, true, 2, 2]);
  grid('BETA.INV', [[0, 0.001, 0.05, 0.5, 0.95, 0.999, 1], [0.5, 1, 2.5, 30], [0.5, 2, 8]]);
  grid('BETA.INV', [[0.3], [2], [3], [2], [5]], '-ab');
  grid('BETAINV', [[0.05, 0.95], [2.5], [2]]);
  bad('BETA.INV', [0.5, 1, 1]);
  const TX = [-40, -10, -3, -1.5, -0.5, 0, 0.5, 1, 1.96, 2.5, 4, 10, 100, 1e5];
  grid('T.DIST', [TX, [1, 2, 3.7, 10, 30, 1000], [true, false]]);
  grid('T.DIST.RT', [TX, [1, 2, 10, 1000]]);
  grid('T.DIST.2T', [TX, [1, 2, 10, 1000]]);
  grid('TDIST', [[0, 0.5, 1.96, 4, 100, -1], [1, 10], [1, 2, 3, 1.5]]);
  bad('T.DIST', [1, 1, true]);
  bad('T.DIST.2T', [1, 1]);
  const TP = [0, 1e-10, 0.001, 0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.975, 0.999, 1];
  grid('T.INV', [TP, [1, 2, 3.7, 10, 30, 1000]]);
  grid('T.INV.2T', [TP, [1, 2, 3.7, 10, 30, 1000]]);
  grid('TINV', [[0.05, 0.5, 0.001, 1], [1, 10]]);
  bad('T.INV', [0.5, 1]);
  bad('T.INV.2T', [0.5, 1]);
  const FX = [0, 0.001, 0.5, 1, 2.5, 10, 100, 1e4];
  grid('F.DIST', [FX, [1, 3, 10.5], [1, 4, 50], [true, false]]);
  grid('F.DIST.RT', [FX, [1, 3, 10.5], [1, 4, 50]]);
  grid('FDIST', [[0.5, 2.5, 100], [3], [4, 50]]);
  bad('F.DIST', [1, 1, 1, true]);
  bad('F.DIST.RT', [1, 1, 1]);
  const FP = [0, 1e-10, 0.001, 0.05, 0.5, 0.95, 0.999, 1];
  grid('F.INV', [FP, [1, 3, 10.5], [1, 4, 50]]);
  grid('F.INV.RT', [FP, [1, 3, 10.5], [1, 4, 50]]);
  grid('FINV', [[0.05, 0.5], [3], [4]]);
  bad('F.INV', [0.5, 1, 1]);
  bad('F.INV.RT', [0.5, 1, 1]);
  grid('BINOM.DIST', [[0, 1, 3, 5, 10, 2.7], [10, 10.9], [0, 0.01, 0.3, 0.5, 0.99, 1], [true, false]]);
  grid('BINOM.DIST', [[0, 10, 150, 500, 900, 1000], [1000], [0.001, 0.3, 0.5], [true, false]], '-big');
  grid('BINOMDIST', [[3, 7], [10], [0.3], [true, false]]);
  bad('BINOM.DIST', [3, 10, 0.5, true]);
  add('binom.dist-kgtn', 'BINOM.DIST', [11, 10, 0.5, true]);
  grid('BINOM.DIST.RANGE', [[10, 100], [0.3, 0.5], [0, 3, 7], [OMIT, 5, 7, 10]]);
  bad('BINOM.DIST.RANGE', [10, 0.5, 3, 5]);
  grid('BINOM.INV', [[0, 1, 10, 100, 1000], [0, 0.3, 0.5, 1], [0, 0.001, 0.5, 0.95, 1]]);
  grid('CRITBINOM', [[10, 100], [0.3], [0.5, 0.95]]);
  bad('BINOM.INV', [10, 0.5, 0.5]);
  grid('NEGBINOM.DIST', [[0, 1, 5, 20, 100], [1, 3, 10], [0.05, 0.3, 0.5, 0.9, 1], [true, false]]);
  grid('NEGBINOMDIST', [[0, 5, 20], [3], [0.3, 0.9]]);
  bad('NEGBINOM.DIST', [5, 3, 0.5, true]);
  grid('HYPGEOM.DIST', [[0, 1, 2, 4, 5], [4, 5], [5, 12], [20, 40], [true, false]]);
  grid('HYPGEOM.DIST', [[30, 50, 70], [100], [300], [600], [true, false]], '-big');
  grid('HYPGEOMDIST', [[1, 2], [4], [12], [20]]);
  bad('HYPGEOM.DIST', [1, 4, 5, 20, true]);
  add('hypgeom.dist-n0', 'HYPGEOM.DIST', [0, 0, 5, 20, true]);
  add('hypgeom.dist-low', 'HYPGEOM.DIST', [0, 18, 5, 20, false]);
  grid('POISSON.DIST', [[0, 1, 2.9, 5, 20, 100, 1000], [0, 0.001, 1, 4.5, 50, 900], [true, false]]);
  grid('POISSON', [[0, 3, 20], [4.5], [true, false]]);
  bad('POISSON.DIST', [2, 1, true]);
  grid('CONFIDENCE.NORM', [[0.001, 0.05, 0.5, 0.999], [0.5, 2.5], [1, 10, 50.9]]);
  grid('CONFIDENCE', [[0.05], [2.5], [10]]);
  grid('CONFIDENCE.T', [[0.001, 0.05, 0.5, 0.999], [0.5, 2.5], [1, 2, 10, 50.9]]);
  bad('CONFIDENCE.NORM', [0.05, 1, 10]);
  bad('CONFIDENCE.T', [0.05, 1, 10]);
  // testes
  const A1 = colA([3.1, 4.5, 2.2, 5.8, 4.4, 3.9, 6.1, 2.7]);
  const B1 = colA([2.8, 5.1, 3.3, 6.2, 4.1, 4.8, 5.9, 3.0, 4.4, 5.2], 'B');
  const AB = merge(A1, B1);
  for (const [x, s] of [[4, null], [3, null], [5, 1.5], [10, 2], [-1, 0.5], [4, 0], [4, -1], [S('4'), null], ['x', null]])
    add(`z.test-${slug([x, s])}`, 'Z.TEST', s === null ? [ref('A1:A8'), x] : [ref('A1:A8'), x, s], { cells: AB });
  add('ztest-legacy', 'ZTEST', [ref('A1:A8'), 4], { cells: AB });
  add('z.test-one', 'Z.TEST', [arr([5]), 4]);
  add('z.test-empty', 'Z.TEST', [ref('D1:D3'), 4], { cells: AB });
  add('z.test-arr', 'Z.TEST', [ref('A1:A8'), arr([3, 4, 5])], { cells: AB });
  for (const tails of [1, 2, 3, 1.9]) for (const type of [1, 2, 3, 0, 4])
    add(`t.test-${tails}-${type}`, 'T.TEST', [ref('A1:A8'), ref(type === 1 ? 'B1:B8' : 'B1:B10'), tails, type], { cells: AB });
  add('ttest-legacy', 'TTEST', [ref('A1:A8'), ref('B1:B10'), 2, 3], { cells: AB });
  add('t.test-pair-size', 'T.TEST', [ref('A1:A8'), ref('B1:B10'), 2, 1], { cells: AB });
  add('t.test-text', 'T.TEST', [ref('A1:A8'), ref('B1:B10'), 2, 2], { cells: merge(AB, { A3: 'x', B4: true }) });
  add('t.test-pair-text', 'T.TEST', [ref('A1:A8'), ref('B1:B8'), 2, 1], { cells: merge(AB, { A3: 'x' }) });
  add('t.test-err', 'T.TEST', [ref('A1:A8'), ref('B1:B10'), 2, 2], { cells: merge(AB, { A3: E('#N/A') }) });
  add('t.test-arr', 'T.TEST', [arr([1, 2, 3, 4]), arr([2, 3, 4, 6]), 2, 2]);
  add('t.test-one', 'T.TEST', [arr([1]), arr([2, 3, 4, 6]), 2, 2]);
  add('f.test', 'F.TEST', [ref('A1:A8'), ref('B1:B10')], { cells: AB });
  add('f.test-rev', 'F.TEST', [ref('B1:B10'), ref('A1:A8')], { cells: AB });
  add('ftest-legacy', 'FTEST', [ref('A1:A8'), ref('B1:B10')], { cells: AB });
  add('f.test-const', 'F.TEST', [arr([1, 1, 1]), arr([2, 3, 4])]);
  add('f.test-one', 'F.TEST', [arr([1]), arr([2, 3, 4])]);
  add('f.test-text', 'F.TEST', [ref('A1:A8'), ref('B1:B10')], { cells: merge(AB, { A3: 'x' }) });
  const CT = { A1: 58, B1: 35, A2: 11, B2: 25, A3: 10, B3: 23, D1: 45.35, E1: 47.65, D2: 17.56, E2: 18.44, D3: 16.09, E3: 16.91 };
  add('chisq.test', 'CHISQ.TEST', [ref('A1:B3'), ref('D1:E3')], { cells: CT });
  add('chitest', 'CHITEST', [ref('A1:B3'), ref('D1:E3')], { cells: CT });
  add('chisq.test-row', 'CHISQ.TEST', [ref('A1:B1'), ref('D1:E1')], { cells: CT });
  add('chisq.test-col', 'CHISQ.TEST', [ref('A1:A3'), ref('D1:D3')], { cells: CT });
  add('chisq.test-size', 'CHISQ.TEST', [ref('A1:B3'), ref('D1:E2')], { cells: CT });
  add('chisq.test-zero', 'CHISQ.TEST', [ref('A1:B3'), ref('D1:E3')], { cells: merge(CT, { D2: 0 }) });
  add('chisq.test-text', 'CHISQ.TEST', [ref('A1:B3'), ref('D1:E3')], { cells: merge(CT, { A2: 'x' }) });
  add('chisq.test-one', 'CHISQ.TEST', [ref('A1'), ref('D1')], { cells: CT });
  add('chisq.test-arr', 'CHISQ.TEST', [arr([10, 20], [30, 40]), arr([12, 18], [28, 42])]);
  out('stat-dist', cases);
}

// ---------------------------------------------------------------------------
// stat-reg: correlação e regressão
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `stat-reg-${id}`, fn, args, ...extra });
  const XS = [1.5, 2.25, 3.1, 4.8, 5.05, 6.6, 7.25, 8.9];
  const YS = [2.1, 3.9, 6.2, 9.1, 9.8, 13.7, 14.2, 18.5];
  const XY = merge(colA(XS), colA(YS, 'B'));
  const XYmix = merge(colA([1, 'x', 3, 4, null, 6, true, 8]), colA([2, 4, 'y', 8, 10, 12, 14, 16], 'B'));
  const XYerr = merge(colA([1, 2, E('#N/A'), 4]), colA([2, 4, 6, 8], 'B'));
  const XYbig = merge(colA([1e9 + 1, 1e9 + 2, 1e9 + 3, 1e9 + 4.5]), colA([5, 7.1, 8.9, 12], 'B'));
  const XYconst = merge(colA([3, 3, 3, 3]), colA([1, 2, 3, 4], 'B'));
  const pairsFns = [['CORREL', 'xy'], ['PEARSON', 'xy'], ['RSQ', 'yx'], ['SLOPE', 'yx'], ['INTERCEPT', 'yx'], ['STEYX', 'yx'], ['COVAR', 'xy'], ['COVARIANCE.P', 'xy'], ['COVARIANCE.S', 'xy']];
  for (const [f, ord] of pairsFns) {
    const k = f.toLowerCase();
    const A = (x, y) => (ord === 'xy' ? [x, y] : [y, x]);
    add(`${k}-basic`, f, A(ref('A1:A8'), ref('B1:B8')), { cells: XY });
    add(`${k}-mix`, f, A(ref('A1:A8'), ref('B1:B8')), { cells: XYmix });
    add(`${k}-err`, f, A(ref('A1:A4'), ref('B1:B4')), { cells: XYerr });
    add(`${k}-big`, f, A(ref('A1:A4'), ref('B1:B4')), { cells: XYbig });
    add(`${k}-const`, f, A(ref('A1:A4'), ref('B1:B4')), { cells: XYconst });
    add(`${k}-size`, f, A(ref('A1:A8'), ref('B1:B7')), { cells: XY });
    add(`${k}-one`, f, A(ref('A1'), ref('B1')), { cells: XY });
    add(`${k}-two`, f, A(ref('A1:A2'), ref('B1:B2')), { cells: XY });
    add(`${k}-three`, f, A(ref('A1:A3'), ref('B1:B3')), { cells: XY });
    add(`${k}-arr`, f, A(arr([1, 2, 3, 4]), arr([2, 4.5, 5.9, 8.2])));
    add(`${k}-orient`, f, A(ref('A1:A4'), ref('D1:G1')), { cells: merge(XY, { D1: 2, E1: 4.5, F1: 5.9, G1: 8.2 }) });
    add(`${k}-arrtext`, f, A(arr([1, 'a', 3, true]), arr([2, 4, 6, 9])));
    add(`${k}-empty`, f, A(ref('D1:D3'), ref('E1:E3')));
    add(`${k}-scalar`, f, A(3, 4));
  }
  for (const f of ['FORECAST', 'FORECAST.LINEAR']) {
    const k = f.toLowerCase();
    for (const x0 of [0, 4.4, 10, -3.3, S('5'), true, 'x', E('#N/A'), null])
      add(`${k}-x${slug(x0)}`, f, [x0, ref('B1:B8'), ref('A1:A8')], { cells: XY });
    add(`${k}-xarr`, f, [arr([1, 2, 3]), ref('B1:B8'), ref('A1:A8')], { cells: XY });
    add(`${k}-mix`, f, [4, ref('B1:B8'), ref('A1:A8')], { cells: XYmix });
    add(`${k}-const`, f, [4, ref('B1:B4'), ref('A1:A4')], { cells: XYconst });
    add(`${k}-size`, f, [4, ref('B1:B8'), ref('A1:A7')], { cells: XY });
    add(`${k}-err`, f, [4, ref('B1:B4'), ref('A1:A4')], { cells: XYerr });
    add(`${k}-big`, f, [1e9 + 2.2, ref('B1:B4'), ref('A1:A4')], { cells: XYbig });
  }
  // LINEST / LOGEST / TREND / GROWTH
  const M = merge(colA(XS), colA([0.5, 1.7, 0.2, 2.9, 3.3, 1.1, 4.2, 2.6], 'B'), colA([3, 1, 4, 1, 5, 9, 2, 6], 'C'), colA(YS, 'D'));
  const MC = merge(M, colA(XS.map((x) => 2 * x + 1), 'E')); // E = 2A + 1 (colinear)
  for (const f of ['LINEST', 'LOGEST']) {
    const k = f.toLowerCase();
    for (const [cst, st] of [[OMIT, OMIT], [true, false], [true, true], [false, false], [false, true]]) {
      const tag = `${slug(cst)}_${slug(st)}`;
      const tail = st === OMIT ? [] : [cst, st];
      add(`${k}-simple-${tag}`, f, [ref('D1:D8'), ref('A1:A8'), ...tail], { cells: M });
      add(`${k}-two-${tag}`, f, [ref('D1:D8'), ref('A1:B8'), ...tail], { cells: M });
      add(`${k}-three-${tag}`, f, [ref('D1:D8'), ref('A1:C8'), ...tail], { cells: M });
      add(`${k}-colin-${tag}`, f, [ref('D1:D8'), ref('(A1:A8)'), ...tail], { cells: MC });
    }
    add(`${k}-colin2`, f, [ref('D1:D8'), ref('A1:E8'), true, true], { cells: MC });
    add(`${k}-colinAE`, f, [ref('D1:D8'), ref('D1:E8'), true, true], { cells: MC });
    add(`${k}-nox`, f, [ref('D1:D8')], { cells: M });
    add(`${k}-nox-stats`, f, [ref('D1:D8'), OMIT, true, true], { cells: M });
    add(`${k}-row`, f, [ref('A10:H10'), ref('A11:H11'), true, true], { cells: Object.fromEntries([...XS.map((x, i) => [`${'ABCDEFGH'[i]}11`, x]), ...YS.map((y, i) => [`${'ABCDEFGH'[i]}10`, y])]) });
    add(`${k}-text`, f, [ref('D1:D8'), ref('A1:A8')], { cells: merge(M, { D3: 'x' }) });
    add(`${k}-blank`, f, [ref('D1:D8'), ref('A1:A8')], { cells: merge(M, { D3: null }) });
    add(`${k}-size`, f, [ref('D1:D8'), ref('A1:A7')], { cells: M });
    add(`${k}-err`, f, [ref('D1:D8'), ref('A1:A8')], { cells: merge(M, { A3: E('#N/A') }) });
    add(`${k}-n2`, f, [ref('D1:D2'), ref('A1:A2'), true, true], { cells: M });
    add(`${k}-n3two`, f, [ref('D1:D3'), ref('A1:B3'), true, true], { cells: M });
    add(`${k}-perfect`, f, [arr([3], [5], [7], [9]), arr([1], [2], [3], [4]), true, true]);
    add(`${k}-arr`, f, [arr([2.5, 3.1, 4.9, 6.2]), arr([1, 2, 3, 4]), true, true]);
    add(`${k}-neg`, f, [arr([2.5, -3.1, 4.9, 6.2]), arr([1, 2, 3, 4])]);
    add(`${k}-big`, f, [ref('B1:B4'), ref('A1:A4'), true, true], { cells: XYbig });
  }
  // colinearidade de verdade: G = x, H = 2x + 1, I = z, J = x + z, K = y
  const BSv = [0.5, 1.7, 0.2, 2.9, 3.3, 1.1, 4.2, 2.6];
  const COL = merge(colA(XS, 'G'), colA(XS.map((x) => 2 * x + 1), 'H'), colA(BSv, 'I'), colA(XS.map((x, i) => x + BSv[i]), 'J'), colA(YS, 'K'));
  for (const f of ['LINEST', 'LOGEST']) {
    const k = f.toLowerCase();
    add(`${k}-col-GH`, f, [ref('K1:K8'), ref('G1:H8'), true, true], { cells: COL });
    add(`${k}-col-GH-noconst`, f, [ref('K1:K8'), ref('G1:H8'), false, true], { cells: COL });
    add(`${k}-col-GJ`, f, [ref('K1:K8'), ref('G1:J8'), true, true], { cells: COL });
    add(`${k}-col-HJ`, f, [ref('K1:K8'), ref('H1:J8'), true, true], { cells: COL });
    add(`${k}-col-GJ-noconst`, f, [ref('K1:K8'), ref('G1:J8'), false, true], { cells: COL });
    add(`${k}-col-dup`, f, [ref('K1:K8'), ref('G1:G8'), true, true], { cells: COL });
  }
  add('trend-col', 'TREND', [ref('K1:K8'), ref('G1:J8'), arr([9, 19, 1, 10])], { cells: COL });
  for (const f of ['TREND', 'GROWTH']) {
    const k = f.toLowerCase();
    add(`${k}-simple`, f, [ref('D1:D8'), ref('A1:A8')], { cells: M });
    add(`${k}-new`, f, [ref('D1:D8'), ref('A1:A8'), arr([9], [10.5], [12])], { cells: M });
    add(`${k}-newrow`, f, [ref('D1:D8'), ref('A1:A8'), arr([9, 10.5, 12])], { cells: M });
    add(`${k}-const0`, f, [ref('D1:D8'), ref('A1:A8'), arr([9], [10.5]), false], { cells: M });
    add(`${k}-two`, f, [ref('D1:D8'), ref('A1:B8'), arr([9, 1], [10, 2])], { cells: M });
    add(`${k}-nox`, f, [ref('D1:D8')], { cells: M });
    add(`${k}-nox-new`, f, [ref('D1:D8'), OMIT, arr([9], [10])], { cells: M });
    add(`${k}-text`, f, [ref('D1:D8'), ref('A1:A8')], { cells: merge(M, { D3: 'x' }) });
    add(`${k}-size`, f, [ref('D1:D8'), ref('A1:A7')], { cells: M });
    add(`${k}-newbad`, f, [ref('D1:D8'), ref('A1:B8'), arr([9, 1, 3])], { cells: M });
    add(`${k}-colin`, f, [ref('D1:D8'), ref('A1:E8'), arr([9, 1, 3, 5, 19])], { cells: MC });
  }
  out('stat-reg', cases);
}

// ---------------------------------------------------------------------------
// stat-ets: FORECAST.ETS* (séries exatas, ruidosas, buracos, duplicatas, erros)
{
  const cases = [];
  const add = (id, fn, args, extra = {}) => cases.push({ id: `stat-ets-${id}`, fn, args, ...extra });
  const n = 24;
  const series = {
    lin: Array.from({ length: n }, (_, i) => 2 * i + 3),
    seas: Array.from({ length: n }, (_, i) => 10 + 0.5 * i + [3, -1, -2, 0][i % 4]),
    seas6: Array.from({ length: 30 }, (_, i) => 50 + [5, 3, -2, -6, -1, 1][i % 6]),
    noisy: Array.from({ length: n }, (_, i) => +(10 + 0.5 * i + [3, -1, -2, 0][i % 4] + Math.sin(i * 7.3) * 0.8).toFixed(3)),
    flat: Array.from({ length: 12 }, () => 7),
  };
  const cellsOf = (ys, t = (i) => i + 1) => { const c = {}; ys.forEach((y, i) => { c[`A${i + 1}`] = t(i); c[`B${i + 1}`] = y; }); return c; };
  for (const [name, ys] of Object.entries(series)) {
    const cells = cellsOf(ys), R = `B1:B${ys.length}`, T = `A1:A${ys.length}`, last = ys.length;
    for (const h of [1, 2, 5, 1.5]) add(`f-${name}-${slug(h)}`, 'FORECAST.ETS', [last + h, ref(R), ref(T)], { cells });
    add(`f0-${name}`, 'FORECAST.ETS', [last + 1, ref(R), ref(T), 0], { cells });
    add(`ci-${name}`, 'FORECAST.ETS.CONFINT', [last + 1, ref(R), ref(T)], { cells });
    add(`ci3-${name}`, 'FORECAST.ETS.CONFINT', [last + 3, ref(R), ref(T), 0.9], { cells });
    add(`season-${name}`, 'FORECAST.ETS.SEASONALITY', [ref(R), ref(T)], { cells });
    for (let k = 1; k <= 8; k++) add(`stat${k}-${name}`, 'FORECAST.ETS.STAT', [ref(R), ref(T), k], { cells });
  }
  const cells = cellsOf(series.seas), R = 'B1:B24', T = 'A1:A24';
  add('past', 'FORECAST.ETS', [20, ref(R), ref(T)], { cells });
  add('atlast', 'FORECAST.ETS', [24, ref(R), ref(T)], { cells });
  add('season-explicit', 'FORECAST.ETS', [25, ref(R), ref(T), 4], { cells });
  add('season-bad', 'FORECAST.ETS', [25, ref(R), ref(T), -1], { cells });
  add('season-big', 'FORECAST.ETS', [25, ref(R), ref(T), 13], { cells });
  add('completion-bad', 'FORECAST.ETS', [25, ref(R), ref(T), 1, 2], { cells });
  add('agg-bad', 'FORECAST.ETS', [25, ref(R), ref(T), 1, 1, 8], { cells });
  add('size', 'FORECAST.ETS', [25, ref('B1:B23'), ref(T)], { cells });
  add('text-value', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { B5: 'x' }) });
  add('text-time', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { A5: 'x' }) });
  add('hole', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { B5: null }) });
  add('hole0', 'FORECAST.ETS', [25, ref(R), ref(T), 1, 0], { cells: merge(cells, { B5: null }) });
  add('unsorted', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { A1: 2, A2: 1, B1: series.seas[1], B2: series.seas[0] }) });
  add('dup-avg', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { A24: 23 }) });
  add('dup-sum', 'FORECAST.ETS', [25, ref(R), ref(T), 1, 1, 7], { cells: merge(cells, { A24: 23 }) });
  add('gap-time', 'FORECAST.ETS', [25, ref(R), ref(T)], { cells: merge(cells, { A10: 10.5 }) });
  add('step2', 'FORECAST.ETS', [50, ref(R), ref(T)], { cells: cellsOf(series.seas, (i) => 2 * i + 2) });
  add('dates', 'FORECAST.ETS', [45658 + 24, ref(R), ref(T)], { cells: cellsOf(series.seas, (i) => 45658 + i) });
  add('stat-bad', 'FORECAST.ETS.STAT', [ref(R), ref(T), 9], { cells });
  add('ci-conf-bad', 'FORECAST.ETS.CONFINT', [25, ref(R), ref(T), 1], { cells });
  add('short', 'FORECAST.ETS', [4, ref('B1:B3'), ref('A1:A3')], { cells });
  out('stat-ets', cases);
}
