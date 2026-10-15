import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { fromSheetCore, type SheetCoreBook } from '../src/from-sheet-core.js';
import { prepareForSave, unsureReasons } from '../src/save.js';
import type { SyncWorksheet } from '../src/to-sheet-core.js';

function book(cells: SyncWorksheet['rows'][number]['cells'], dyn: number[] = []): { b: SheetCoreBook; ws: SyncWorksheet } {
  const ws: SyncWorksheet = { rows: [{ r: 1, cells }] };
  return { ws, b: { workbook: { sheets: [{ name: 'S' }], dynamicArrayCm: dyn }, worksheets: [ws as never], sharedStrings: [] } };
}

describe('preparação para gravar', () => {
  it('ca nas voláteis e dependentes; ca velho sai; cm só na dinâmica', () => {
    const { b, ws } = book([
      { ref: 'A1', value: '1' },
      { ref: 'B1', formula: 'NOW()', value: '1' },
      { ref: 'C1', formula: 'B1+1', value: '1' },
      { ref: 'D1', formula: 'A1+1', formulaAttrs: { ca: true }, value: '2' },
      { ref: 'E1', formula: 'A1:A2', formulaAttrs: { t: 'array', ref: 'E1:E2' }, cm: 1, value: '1' },
      { ref: 'F1', formula: 'A1*2', cm: 1, value: '2' },
    ], [1]);
    const e = new Engine(fromSheetCore(b));
    e.recalc();
    const p = prepareForSave(e, [ws], { dynamicCms: [1], dynamicCm: () => 1 });
    const c = (ref: string) => ws.rows[0]!.cells.find((x) => x.ref === ref)!;
    expect(c('B1').formulaAttrs).toEqual({ ca: true });
    expect(c('C1').formulaAttrs).toEqual({ ca: true });
    expect(c('D1').formulaAttrs).toBeUndefined();
    expect(c('E1').cm).toBe(1);
    expect(c('F1').cm).toBeUndefined();
    expect([...p.touched]).toEqual([0]);
    expect(p.sure).toBe(true);
  });

  it('dinâmica nova ganha cm; filha de compartilhada sem âncora vira fórmula própria', () => {
    const { b, ws } = book([
      { ref: 'A1', value: '3' },
      { ref: 'B1', formula: 'A1*2', formulaAttrs: { t: 'shared', ref: 'B1:C1', si: 0 }, value: '6' },
      { ref: 'C1', formula: '', formulaAttrs: { t: 'shared', si: 0 }, value: '12' },
    ]);
    const e = new Engine(fromSheetCore(b));
    // a âncora foi trocada (edição): a filha perde a mestra
    e.setCell(0, 0, 1, { f: { text: '_xlfn.SEQUENCE(A1)', t: 'array', dynamic: true } });
    e.calculate();
    const cB = ws.rows[0]!.cells.find((x) => x.ref === 'B1')!;
    cB.formula = '_xlfn.SEQUENCE(A1)'; cB.formulaAttrs = { t: 'array', ref: 'B1' };
    let made = 0;
    prepareForSave(e, [ws], { dynamicCm: () => { made++; return 7; } });
    expect(cB.cm).toBe(7);
    expect(made).toBe(1);
    const cC = ws.rows[0]!.cells.find((x) => x.ref === 'C1')!;
    expect(cC.formula).toBe('B1*2');
    expect(cC.formulaAttrs).toBeUndefined();
  });

  it('sem certeza: função de servidor, UDF, tabela de dados', () => {
    const { b, ws } = book([
      { ref: 'A1', formula: '_xlfn.WEBSERVICE("x")', value: '1' },
      { ref: 'B1', formula: 'MINHAUDF(1)', value: '1' },
      { ref: 'C1', formula: '', formulaAttrs: { t: 'dataTable', ref: 'C1:C2', r1: 'A1' } as never, value: '1' },
    ]);
    const e = new Engine(fromSheetCore(b));
    expect(unsureReasons(e)).toEqual(['WEBSERVICE', 'desconhecida MINHAUDF']);
    const p = prepareForSave(e, [ws]);
    expect(p.sure).toBe(false);
    expect(p.unsure).toContain('tabela de dados');
  });
});
