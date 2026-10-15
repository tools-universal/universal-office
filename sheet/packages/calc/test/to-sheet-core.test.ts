import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { fromSheetCore, type SheetCoreBook } from '../src/from-sheet-core.js';
import { writeValues, fileCellValue, type SyncWorksheet } from '../src/to-sheet-core.js';
import { saveFlags } from '../src/file-form.js';
import { ERR } from '../src/values.js';

function mk(): { book: SheetCoreBook; ws: SyncWorksheet } {
  const ws: SyncWorksheet = {
    rows: [
      { r: 1, cells: [{ ref: 'A1', value: '1' }, { ref: 'C1', formula: '_xlfn.SEQUENCE(A1)', formulaAttrs: { t: 'array', ref: 'C1' }, cm: 1, value: '1' },
        { ref: 'D1', formula: 'A1&"x"', type: 'str', value: '1x' }, { ref: 'E1', formula: 'A1>1', type: 'b', value: '0' },
        { ref: 'F1', formula: 'NOW()', value: '1' }, { ref: 'G1', formula: 'F1+1', value: '2' }, { ref: 'H1', formula: 'G1+1', value: '3' },
        { ref: 'I1', formula: 'A1+1', value: '2' }] },
    ],
  };
  return { ws, book: { workbook: { sheets: [{ name: 'S' }], dynamicArrayCm: [1] }, worksheets: [ws as never], sharedStrings: [] } };
}

describe('motor → modelo do sheet-core', () => {
  it('valores como o Excel grava (t/<v>)', () => {
    expect(fileCellValue(1.5)).toEqual({ value: '1.5' });
    expect(fileCellValue(1e21)).toEqual({ value: '1E+21' });
    expect(fileCellValue('')).toEqual({ type: 'str', value: '' });
    expect(fileCellValue(true)).toEqual({ type: 'b', value: '1' });
    expect(fileCellValue(ERR.NA)).toEqual({ type: 'e', value: '#N/A' });
  });

  it('derramamento cresce e encolhe: células criadas/limpas, ref da âncora', () => {
    const { book, ws } = mk();
    const e = new Engine(fromSheetCore(book));
    e.setCell(0, 0, 0, { v: 3 });
    e.calculate();
    const sheets = writeValues(e, [ws], e.takeChanges());
    expect([...sheets]).toEqual([0]);
    const cell = (ref: string) => ws.rows.flatMap((r) => r.cells).find((c) => c.ref === ref);
    expect(cell('C1')!.formulaAttrs!.ref).toBe('C1:C3');
    expect([cell('C2')?.value, cell('C3')?.value]).toEqual(['2', '3']);
    expect(ws.rows.map((r) => r.r)).toEqual([1, 2, 3]);
    expect(cell('D1')).toMatchObject({ type: 'str', value: '3x' });
    expect(cell('E1')).toMatchObject({ type: 'b', value: '1' });
    e.setCell(0, 0, 0, { v: 1 });
    e.calculate();
    writeValues(e, [ws], e.takeChanges());
    expect(cell('C1')!.formulaAttrs!.ref).toBe('C1');
    expect(cell('C2')).toBeUndefined();
  });

  it('ca: voláteis + dependentes transitivos; #SPILL! ganha ca+aca', () => {
    const { book } = mk();
    const e = new Engine(fromSheetCore(book));
    e.recalc();
    const flags = saveFlags(e);
    const at = (c: number) => flags.get(e.getFormula(0, 0, c)!);
    expect([at(5), at(6), at(7)].map((f) => f?.ca)).toEqual([true, true, true]);
    expect(at(8)).toEqual({ ca: false, aca: false });
    // bloqueia o derramamento de C1 (precisa de C1:C3)
    e.setCell(0, 0, 0, { v: 3 });
    e.setCell(0, 1, 2, { v: 'x' });
    e.calculate();
    expect(saveFlags(e).get(e.getFormula(0, 0, 2)!)).toEqual({ ca: true, aca: true });
  });
});
