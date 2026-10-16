/**
 * Ponte componente × motor de cálculo (sheet-calc.ts) sobre o modelo do
 * sheet-core montado à mão: edição → recálculo → valores de volta no modelo
 * (todas as abas), idioma, derramamento, formatos aplicados e styles.xml.
 */
import { describe, expect, it } from 'vitest';
import { refToRowCol, type Cell, type Row, type Styles, type Workbook, type Worksheet } from '@universal-office/sheet-core';
import { SheetCalc, XfPool, type CalcView, type SheetCalcHost } from '../src/sheet-calc.js';
import { formulaLocale } from '../src/formula-locale.js';

type Spec = Record<string, Partial<Cell>>;

function makeBook(sheets: Record<string, Spec>, extra: Partial<Workbook> = {}): { calc: SheetCalc; views: CalcView[]; styles: Styles; cell: (s: number, ref: string) => Cell | undefined; touched: Set<number> } {
  const names = Object.keys(sheets);
  const wb: Workbook = { sheets: names.map((name, i) => ({ name, sheetId: String(i + 1), rId: `rId${i + 1}`, target: `xl/worksheets/sheet${i + 1}.xml` })), ...extra };
  const views: CalcView[] = names.map((n) => {
    const rows = new Map<number, Row>();
    for (const [ref, c] of Object.entries(sheets[n]!)) {
      const { row } = refToRowCol(ref);
      let r = rows.get(row);
      if (!r) { r = { r: row, cells: [] }; rows.set(row, r); }
      r.cells.push({ ref, ...c });
    }
    const ws: Worksheet = { rows: [...rows.values()].sort((a, b) => a.r - b.r) };
    for (const r of ws.rows) r.cells.sort((a, b) => refToRowCol(a.ref).col - refToRowCol(b.ref).col);
    return { worksheet: ws, rowXf: new Map(), colXf: new Map(), maxRow: 30, maxCol: 26 };
  });
  const styles: Styles = {
    numFmts: new Map(), fonts: [{}], fills: [], borders: [], dxfs: [],
    cellXfs: [{ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 }, { numFmtId: 49, fontId: 0, fillId: 0, borderId: 0, xfId: 0, applyNumberFormat: true }],
  };
  const caches = new Map<number, Map<number, Map<number, Cell>>>();
  const touched = new Set<number>();
  const host: SheetCalcHost = {
    workbook: wb, views, shared: [], styles,
    cellIndex(view) {
      let m = caches.get(view);
      if (!m) {
        m = new Map();
        for (const r of views[view]!.worksheet.rows) {
          const cm = new Map<number, Cell>();
          for (const c of r.cells) cm.set(refToRowCol(c.ref).col, c);
          m.set(r.r, cm);
        }
        caches.set(view, m);
      }
      return m;
    },
    touched: (v) => { touched.add(v); },
  };
  const calc = new SheetCalc(host, formulaLocale('pt-BR'));
  calc.reset();
  const cell = (s: number, ref: string): Cell | undefined => {
    const { row, col } = refToRowCol(ref);
    // pelo modelo (linhas), não pelo cache: confere que as duas visões batem
    const c = views[s]!.worksheet.rows.find((r) => r.r === row)?.cells.find((x) => refToRowCol(x.ref).col === col);
    expect(c).toBe(host.cellIndex(s).get(row)?.get(col));
    return c;
  };
  return { calc, views, styles, cell, touched };
}

const ed = (calc: SheetCalc, ref: string, text: string, view = 0) => {
  const { row, col } = refToRowCol(ref);
  return calc.edit(view, col, row, text);
};
const bar = (calc: SheetCalc, ref: string, view = 0) => {
  const { row, col } = refToRowCol(ref);
  return calc.barText(view, col, row);
};

describe('edição → motor → modelo', () => {
  it('constantes tipadas e fórmula no idioma; dependentes recalculam (inclusive em outra aba)', () => {
    const { calc, cell, touched } = makeBook({ Plan1: {}, Plan2: {} });
    expect(ed(calc, 'A1', '1,5')).toMatchObject({ ok: true });
    expect(ed(calc, 'A2', '2')).toMatchObject({ ok: true });
    expect(ed(calc, 'A3', '=SOMA(A1:A2)')).toMatchObject({ ok: true });
    expect(cell(0, 'A3')).toMatchObject({ formula: 'SUM(A1:A2)', value: '3.5' });
    expect(ed(calc, 'A1', '=Plan1!A3*2', 1)).toMatchObject({ ok: true });
    expect(cell(1, 'A1')?.value).toBe('7');
    touched.clear();
    const r = ed(calc, 'A1', '10');
    expect(r.ok && [...r.views].sort()).toEqual([0, 1]);
    expect(cell(0, 'A3')?.value).toBe('12');
    expect(cell(1, 'A1')?.value).toBe('24');
    expect(touched.has(1)).toBe(true);
    // texto, booleano e erro no idioma
    ed(calc, 'B1', 'abc'); ed(calc, 'B2', 'verdadeiro'); ed(calc, 'B3', '#N/D');
    expect(cell(0, 'B1')).toMatchObject({ type: 'inlineStr', inlineString: { text: 'abc' } });
    expect(cell(0, 'B2')).toMatchObject({ type: 'b', value: '1' });
    expect(cell(0, 'B3')).toMatchObject({ type: 'e', value: '#N/A' });
    expect(calc.errorText('#N/A')).toBe('#N/D');
    expect(calc.boolText(true)).toBe('VERDADEIRO');
    // apagar: a célula some (sem estilo) e o dependente volta
    ed(calc, 'A2', '');
    expect(cell(0, 'A2')).toBeUndefined();
    expect(cell(0, 'A3')?.value).toBe('10');
  });

  it('fórmula de texto, erro de fórmula e recusa como o Excel', () => {
    const { calc, cell } = makeBook({ Plan1: {} });
    expect(ed(calc, 'A1', '=SE(1>0;"sim";"não")')).toMatchObject({ ok: true });
    expect(cell(0, 'A1')).toMatchObject({ type: 'str', value: 'sim' });
    expect(ed(calc, 'A2', '=1/0')).toMatchObject({ ok: true });
    expect(cell(0, 'A2')).toMatchObject({ type: 'e', value: '#DIV/0!' });
    expect(ed(calc, 'A3', '=SOMA(1;')).toMatchObject({ ok: true });
    expect(ed(calc, 'A3', '=1+')).toEqual({ ok: false, message: 'Há um problema com esta fórmula.' });
    expect(ed(calc, 'A3', '=SOMA()')).toEqual({ ok: false, message: 'Você inseriu poucos argumentos para esta função.' });
    // recusada: a célula fica como estava
    expect(cell(0, 'A3')).toMatchObject({ formula: 'SUM(1,)', value: '1' });
    expect(ed(calc, 'A3', '=SUM(1;2)')).toMatchObject({ ok: true });
    expect(cell(0, 'A3')).toMatchObject({ formula: '_xludf.SUM(1,2)', type: 'e', value: '#NAME?' });
  });

  it('derramamento: valores, atributos, bloqueio (#DESPEJAR!) e âncora apagada', () => {
    const { calc, cell, views } = makeBook({ Plan1: { A1: { value: '1' }, A2: { value: '2' }, A3: { value: '3' } } });
    expect(ed(calc, 'B1', '=A1:A3*10')).toMatchObject({ ok: true });
    expect(cell(0, 'B1')).toMatchObject({ formula: 'A1:A3*10', value: '10', formulaAttrs: { t: 'array', ref: 'B1:B3' } });
    expect(cell(0, 'B2')).toMatchObject({ value: '20' });
    expect(cell(0, 'B3')?.formula).toBeUndefined();
    expect(calc.spillRange(0, 2, 2)).toEqual({ c1: 2, r1: 1, c2: 2, r2: 3 });
    expect(bar(calc, 'B2')).toEqual({ formula: '=A1:A3*10', edit: '', ghost: true });
    expect(bar(calc, 'B1')).toEqual({ formula: '=A1:A3*10', edit: '=A1:A3*10', ghost: false });
    // digitar dentro do derramamento bloqueia
    ed(calc, 'B3', 'x');
    expect(cell(0, 'B1')).toMatchObject({ type: 'e', value: '#SPILL!' });
    expect(cell(0, 'B2')).toBeUndefined();
    expect(calc.errorText('#SPILL!')).toBe('#DESPEJAR!');
    ed(calc, 'B3', '');
    expect(cell(0, 'B3')?.value).toBe('30');
    // derrama além da área da grade: a aba cresce
    ed(calc, 'D1', '=SEQUÊNCIA(40)');
    expect(cell(0, 'D40')?.value).toBe('40');
    expect(views[0]!.maxRow).toBe(40);
    // apagar a âncora limpa o intervalo
    ed(calc, 'B1', '');
    expect(cell(0, 'B2')).toBeUndefined();
    expect(cell(0, 'B3')).toBeUndefined();
  });

  it('voláteis recalculam a cada edição', () => {
    const { calc, cell } = makeBook({ Plan1: {} });
    ed(calc, 'A1', '=ALEATÓRIO()');
    const v1 = cell(0, 'A1')?.value;
    ed(calc, 'C9', '1');
    expect(cell(0, 'A1')?.value).not.toBe(v1);
    expect(cell(0, 'A1')?.formulaAttrs).toEqual({ ca: true });
  });

  it('idioma das fórmulas: entrada e barra em en-US ou pt-BR', () => {
    const { calc } = makeBook({ Plan1: { A1: { value: '1' }, A2: { value: '2' } } });
    calc.locale = formulaLocale('en-US');
    expect(ed(calc, 'A3', '=SUM(A1:A2,0.5)')).toMatchObject({ ok: true });
    expect(bar(calc, 'A3').formula).toBe('=SUM(A1:A2,0.5)');
    calc.locale = formulaLocale('pt-BR');
    expect(bar(calc, 'A3').formula).toBe('=SOMA(A1:A2;0,5)');
    expect(bar(calc, 'A1')).toEqual({ formula: '', edit: '1', ghost: false });
  });
});

describe('fórmulas do arquivo', () => {
  it('legada com interseção implícita mostra o "@"; CSE com chaves e não se edita em parte', () => {
    const { calc, cell } = makeBook({
      Plan1: {
        A1: { value: '1' }, A2: { value: '2' },
        B1: { formula: 'A1:A2', value: '1' },
        C1: { formula: 'A1:A2*2', formulaAttrs: { t: 'array', ref: 'C1:C2' }, value: '2' }, C2: { value: '4' },
      },
    });
    expect(bar(calc, 'B1').formula).toBe('=@A1:A2');
    expect(bar(calc, 'C2')).toMatchObject({ formula: '{=A1:A2*2}', ghost: false });
    expect(ed(calc, 'C2', '5')).toEqual({ ok: false, message: 'Não é possível alterar parte de uma matriz.' });
    expect(cell(0, 'C2')?.value).toBe('4');
    // valores exibidos continuam os do arquivo até alguma edição
    expect(cell(0, 'B1')?.value).toBe('1');
  });
});

describe('formatos aplicados pela entrada', () => {
  it('data/porcentagem/moeda digitadas e =HOJE() ganham o formato; Texto guarda texto', () => {
    const { calc, cell, styles } = makeBook({ Plan1: { E1: { style: 1 } } });
    ed(calc, 'A1', '01/02/2024');
    expect(cell(0, 'A1')?.value).toBe('45323');
    expect(styles.cellXfs[cell(0, 'A1')!.style!]?.numFmtId).toBe(14);
    ed(calc, 'A2', '10%');
    expect(styles.cellXfs[cell(0, 'A2')!.style!]?.numFmtId).toBe(9);
    ed(calc, 'A3', 'R$ 10,50');
    expect(styles.cellXfs[cell(0, 'A3')!.style!]?.numFmtId).toBe(8);
    expect(styles.numFmts.get(8)).toBe('"R$"\\ #,##0.00;[Red]\\-"R$"\\ #,##0.00');
    ed(calc, 'A4', '=HOJE()');
    expect(styles.cellXfs[cell(0, 'A4')!.style!]?.numFmtId).toBe(14);
    ed(calc, 'A5', '=A1+1');
    expect(styles.cellXfs[cell(0, 'A5')!.style!]?.numFmtId).toBe(14);
    // o xf é reaproveitado
    expect(cell(0, 'A4')!.style).toBe(cell(0, 'A1')!.style);
    expect(bar(calc, 'A1').edit).toBe('01/02/2024');
    expect(bar(calc, 'A2').edit).toBe('10%');
    // célula Texto (@): até a fórmula vira texto
    ed(calc, 'E1', '=1+1');
    expect(cell(0, 'E1')).toMatchObject({ type: 'inlineStr', inlineString: { text: '=1+1' }, style: 1 });
    // apóstrofo: texto com prefixo (xf com quotePrefix)
    ed(calc, 'F1', "'123");
    expect(cell(0, 'F1')).toMatchObject({ type: 'inlineStr', inlineString: { text: '123' } });
    expect(bar(calc, 'F1').edit).toBe("'123");
    ed(calc, 'F1', '5');
    expect(cell(0, 'F1')?.style).toBeUndefined();
  });

  it('styles.xml: copia o <xf> de origem com o formato novo; gravar de novo não duplica', () => {
    const styles: Styles = {
      numFmts: new Map(), fonts: [{}], fills: [], borders: [], dxfs: [],
      cellXfs: [{ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 }, { numFmtId: 0, fontId: 1, fillId: 0, borderId: 0, xfId: 0, horizontal: 'center' }],
    };
    const pool = new XfPool(styles);
    const a = pool.derive(1, { id: 14, cat: 'date' }, false);
    const b = pool.derive(0, { id: 8, cat: 'currency', code: '"R$"\\ #,##0.00' }, false);
    const q = pool.derive(0, undefined, true);
    expect([a, b, q]).toEqual([2, 3, 4]);
    expect(pool.derive(1, { id: 14, cat: 'date' }, false)).toBe(2);
    const xml = '<?xml version="1.0"?><styleSheet xmlns="x"><fonts count="2"/><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/><protection locked="0"/></xf></cellXfs></styleSheet>';
    const out = pool.patch(xml);
    expect(out).toContain('<numFmts count="1"><numFmt numFmtId="8" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts>');
    expect(out).toContain('<cellXfs count="5">');
    expect(out).toContain('<xf numFmtId="14" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center"/><protection locked="0"/></xf>');
    expect(out).toContain('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" quotePrefix="1"/>');
    expect(pool.patch(out)).toBe(out);
  });
});
