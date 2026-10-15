import { describe, expect, it } from 'vitest';
import '../src/index.js';
import { Engine } from '../src/engine.js';
import { fromSheetCore, type SheetCoreBook } from '../src/from-sheet-core.js';
import { plain } from '../src/testing.js';
import { a1ToCell } from '../src/a1.js';

const book: SheetCoreBook = {
  workbook: {
    sheets: [{ name: 'Plan1' }, { name: 'Dados' }],
    definedNames: [{ name: 'taxa', formula: 'Plan1!$A$1' }, { name: 'local', formula: 'Dados!$A$1', localSheetId: 1 }],
    externalLinks: [{ sheetNames: ['Ext'], definedNames: [], sheetData: [{ sheetId: 0, cells: [{ ref: 'B2', v: '7' }, { ref: 'C2', t: 'str', v: 'oi' }] }] }],
    dynamicArrayCm: [1],
  },
  worksheets: [
    {
      rows: [
        { r: 1, cells: [{ ref: 'A1', value: '2' }, { ref: 'B1', formula: 'A1*10', formulaAttrs: { t: 'shared', ref: 'B1:B3', si: 0 }, value: '0' },
          { ref: 'C1', formula: 'A1:A3*2', formulaAttrs: { t: 'array', ref: 'C1:C3' }, value: '0' },
          { ref: 'D1', formula: '_xlfn.ANCHORARRAY(E1)', formulaAttrs: { t: 'array', ref: 'D1:D2' }, cm: 1, value: '0' },
          { ref: 'E1', formula: 'A1:A2+1', formulaAttrs: { t: 'array', ref: 'E1:E2' }, cm: 1, value: '0' },
          { ref: 'F1', formula: 'taxa+[1]Ext!B2', value: '0' }, { ref: 'G1', formula: '[1]Ext!C2&Dados!local', value: '' }] },
        { r: 2, cells: [{ ref: 'A2', value: '3' }, { ref: 'B2', formula: '', formulaAttrs: { t: 'shared', si: 0 } }, { ref: 'C2', value: '99' }, { ref: 'D2', value: '9' }, { ref: 'E2', value: '9' }] },
        { r: 3, hidden: true, cells: [{ ref: 'A3', type: 's', value: '0' }, { ref: 'B3', formula: '', formulaAttrs: { t: 'shared', si: 0 } }, { ref: 'C3', value: '1' },
          { ref: 'H3', formula: 'Vendas[[#This Row],[Valor]]*2', value: '0' }] },
        { r: 4, cells: [{ ref: 'J1', formula: 'SUMX', value: '0' }] },
      ],
      tables: [{ ref: 'F2:G4', displayName: 'Vendas', columns: [{ name: 'Item' }, { name: 'Valor' }] }],
    },
    { rows: [{ r: 1, cells: [{ ref: 'A1', value: '5' }] }] },
  ],
  sharedStrings: [{ text: 'x' }],
};

describe('adaptador sheet-core → motor', () => {
  it('compartilhadas, CSE, dinâmicas, nomes, externas, tabelas', () => {
    const e = new Engine(fromSheetCore(book), { ignoreCache: true });
    e.recalc();
    const v = (ref: string, s = 0): unknown => { const p = a1ToCell(ref)!; return plain(e.getValue(s, p.row, p.col)); };
    expect([v('B1'), v('B2'), v('B3')]).toEqual([20, 30, '#VALUE!']);
    expect([v('C1'), v('C2'), v('C3')]).toEqual([4, 6, '#VALUE!']);
    expect([v('E1'), v('E2'), v('D1'), v('D2')]).toEqual([3, 4, 3, 4]);
    expect([v('F1'), v('G1')]).toEqual([9, 'oi5']);
    expect(e.rowHidden(0, 2)).toBe(true);
    expect(v('H3')).toBe(0);
    expect(v('J1')).toBe('#NAME?');
  });
});
