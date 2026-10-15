import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { fromSheetCore, type SheetCoreBook, type SheetCoreCell } from '../src/from-sheet-core.js';
import { applyOpenRecalc, hasVolatileFunction, shouldRecalcOnOpen } from '../src/open-recalc.js';
import { a1ToCell } from '../src/a1.js';

type CalcPr = { calcId?: number; calcMode?: string; fullCalcOnLoad?: boolean; forceFullCalc?: boolean };

/** Pasta de uma aba: A1=1, A2=2, B1=A1+A2 com cache errado (99) e as células extras. */
function book(calcPr: CalcPr | undefined, extra: SheetCoreCell[] = []): SheetCoreBook & { workbook: { calcPr?: CalcPr; appName?: string } } {
  return {
    workbook: { sheets: [{ name: 'S' }], appName: 'xl', ...(calcPr ? { calcPr } : {}) },
    worksheets: [{
      rows: [
        { r: 1, cells: [{ ref: 'A1', value: '1' }, { ref: 'B1', formula: 'A1+A2', value: '99' }] },
        { r: 2, cells: [{ ref: 'A2', value: '2' }, ...extra] },
      ],
    }],
    sharedStrings: [],
  };
}

const OK = { calcId: 191029 };

describe('recálculo ao abrir (regra medida no Excel 365)', () => {
  it('calcId: ausente ou < 191028 → completo; ≥ 191028 → confia no cache', () => {
    expect(shouldRecalcOnOpen(book(undefined)).reason).toBe('noCalcId');
    expect(shouldRecalcOnOpen(book({})).reason).toBe('noCalcId');
    expect(shouldRecalcOnOpen(book({ calcId: 191027 })).mode).toBe('full');
    expect(shouldRecalcOnOpen(book({ calcId: 124519 })).reason).toBe('oldCalcId');
    for (const id of [191028, 191029, 191030, 999999]) expect(shouldRecalcOnOpen(book({ calcId: id })).mode).toBe('none');
  });

  it('pasta que não foi gravada pelo Excel (fileVersion appName ≠ "xl") → completo', () => {
    const b = book(OK);
    expect(shouldRecalcOnOpen(b).mode).toBe('none');
    b.workbook.appName = 'Calc';
    expect(shouldRecalcOnOpen(b).reason).toBe('notExcel');
    delete b.workbook.appName;
    expect(shouldRecalcOnOpen(b).reason).toBe('notExcel');
  });

  it('fullCalcOnLoad/forceFullCalc → completo; manual → nada (nem com fullCalcOnLoad)', () => {
    expect(shouldRecalcOnOpen(book({ ...OK, fullCalcOnLoad: true })).reason).toBe('fullCalcOnLoad');
    expect(shouldRecalcOnOpen(book({ ...OK, forceFullCalc: true })).reason).toBe('forceFullCalc');
    expect(shouldRecalcOnOpen(book({ calcId: 124519, calcMode: 'manual', fullCalcOnLoad: true })).mode).toBe('none');
  });

  it('volátil sem ca="1" → completo; com ca → só ela', () => {
    expect(shouldRecalcOnOpen(book(OK, [{ ref: 'C2', formula: 'IF(FALSE,NOW(),1)', value: '1' }])).reason).toBe('volatileWithoutCa');
    expect(shouldRecalcOnOpen(book(OK, [{ ref: 'C2', formula: '_xlfn.LET(_xlpm.x,OFFSET(A1,0,0),1)', value: '1' }])).mode).toBe('full');
    const p = shouldRecalcOnOpen(book(OK, [{ ref: 'C2', formula: 'RAND()', formulaAttrs: { ca: true }, value: '0.5' }]));
    expect(p.mode).toBe('partial');
    expect(p.cells).toEqual([[0, 1, 2]]);
    // dentro de texto não conta; SUMIF/INDEX não são voláteis
    expect(hasVolatileFunction('"NOW()"&A1')).toBe(false);
    expect(hasVolatileFunction('SUMIF(A1:A2,">1")+INDEX(A1:A2,1)')).toBe(false);
    expect(hasVolatileFunction('cell("row",A1)')).toBe(true);
  });

  it('filha de compartilhada volátil sem ca → completo', () => {
    const b = book(OK, [{ ref: 'C2', formula: 'NOW()', formulaAttrs: { t: 'shared', ref: 'C2:D2', si: 0, ca: true }, value: '1' },
      { ref: 'D2', formula: '', formulaAttrs: { t: 'shared', si: 0 }, value: '1' }]);
    expect(shouldRecalcOnOpen(b).mode).toBe('full');
  });

  it('parcial: calcula ca e sem <v>, sem sujar dependentes', () => {
    const b = book(OK, [
      { ref: 'C2', formula: 'A1*10' }, // sem <v>
      { ref: 'D2', formula: 'C2+1', value: '99' }, // dependente: fica o cache
      { ref: 'E2', formula: 'A1+5', formulaAttrs: { ca: true }, value: '99' },
    ]);
    const plan = shouldRecalcOnOpen(b);
    expect(plan.mode).toBe('partial');
    const e = new Engine(fromSheetCore(b));
    const changed = applyOpenRecalc(e, plan);
    const v = (ref: string): unknown => { const q = a1ToCell(ref)!; return e.getValue(0, q.row, q.col); };
    expect([v('B1'), v('C2'), v('D2'), v('E2')]).toEqual([99, 10, 99, 6]);
    expect(changed.length).toBe(2);
  });

  it('completo: tudo, inclusive o cache errado', () => {
    const b = book(undefined);
    const e = new Engine(fromSheetCore(b));
    applyOpenRecalc(e, shouldRecalcOnOpen(b));
    expect(e.getValue(0, 0, 1)).toBe(3);
  });
});
