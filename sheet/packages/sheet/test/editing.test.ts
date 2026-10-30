// API de edição do <universal-sheet> que as barras usam: seleção de intervalo,
// desfazer/refazer, copiar/colar com fórmulas ajustadas, preencher, limpar,
// formatar (fonte, preenchimento, bordas, alinhamento, formato de número),
// mesclar, congelar, linhas de grade, tamanhos, ocultar, localizar/substituir,
// AutoSoma, estatísticas e abas — e que tudo isso VAI para o .xlsx gravado.
// Elemento de verdade sobre o DOM falso (sem layout: as medidas são zero).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';
import type { UniversalSheetElement as Sheet } from '../src/universal-sheet.js';

let dom: FakeDom;
let Ctor: typeof Sheet;
let el: Sheet;

beforeAll(async () => {
  dom = installFakeDom();
  dom.customElements.define('u-ripple', class extends (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement {});
  Ctor = (await import('../src/universal-sheet.js')).UniversalSheetElement;
}, 60_000);
afterAll(() => { vi.unstubAllGlobals(); });

beforeEach(() => {
  (el as unknown as FakeNode | undefined)?.remove();
  el = new Ctor();
  el.setAttribute('formula-locale', 'en-US');
  dom.document.body.appendChild(el as unknown as FakeNode);
  el.newWorkbook();
});

const put = (ref: string, text: string): void => { el.selectRange(ref); expect(el.setActiveCellText(text).ok).toBe(true); };
const edit = (ref: string): string => { el.selectRange(ref); return el.activeCellEditText; };
const part = (bytes: Uint8Array, path: string): string => strFromU8(unzipSync(bytes)[path]!);
const reopen = (): void => { const b = el.saveXlsx(); el.loadXlsx(b); };

describe('seleção de intervalo', () => {
  it('selectRange com intervalo, colunas e linhas inteiras', () => {
    el.selectRange('B2:D5');
    expect(el.getSelection()).toMatchObject({ ref: 'B2', range: 'B2:D5', c1: 2, r1: 2, c2: 4, r2: 5 });
    el.selectRange('C:E');
    expect(el.getSelection().range).toBe('C:E');
    el.selectRange('3:4');
    expect(el.getSelection().range).toBe('3:4');
    expect(() => el.selectRange('nada!A1')).toThrow();
  });
  it('estatísticas da barra de status (soma, média, contagem)', () => {
    put('A1', '1'); put('A2', '2'); put('A3', 'x'); put('A4', '4');
    el.selectRange('A1:A5');
    expect(el.selectionStats()).toMatchObject({ cells: 5, count: 4, numericCount: 3, sum: 7, min: 1, max: 4 });
    expect(el.selectionStats().average).toBeCloseTo(7 / 3);
  });
});

describe('desfazer/refazer', () => {
  it('digitação, formatação e tamanho de coluna voltam e refazem', () => {
    put('A1', '10');
    put('A1', '20');
    el.selectRange('A1');
    el.setFont({ bold: true });
    expect(el.getCellFormat().bold).toBe(true);
    el.setColumnWidth(30);
    expect(el.columnWidth(1)).toBeCloseTo(30, 0);
    el.undo();
    expect(el.columnWidth(1)).toBeCloseTo(8.43, 0);
    el.undo();
    expect(el.getCellFormat().bold).toBe(false);
    el.undo();
    expect(edit('A1')).toBe('10');
    el.redo();
    expect(edit('A1')).toBe('20');
    expect(el.canUndo()).toBe(true);
    el.loadXlsx(el.saveXlsx());
    expect(el.canUndo()).toBe(false);
  });
});

describe('copiar, colar, preencher, limpar', () => {
  it('colar dentro do elemento ajusta as fórmulas e leva o formato; texto de fora vira células', () => {
    put('A1', '1'); put('A2', '2'); put('B1', '=A1*2');
    el.selectRange('B1');
    el.setFont({ italic: true });
    const text = el.copy();
    expect(text).toBe('2\r\n');
    el.selectRange('B2');
    el.paste();
    expect(edit('B2')).toBe('=A2*2');
    expect(el.getCellFormat().italic).toBe(true);
    el.selectRange('D1');
    el.paste('a\tb\r\n3\t=1+1\r\n');
    expect(edit('D1')).toBe('a');
    expect(edit('E2')).toBe('=1+1');
    el.undo();
    expect(edit('E2')).toBe('');
  });
  it('recortar move sem ajustar e limpa a origem', () => {
    put('A1', '5'); put('B1', '=A1+1');
    el.selectRange('B1');
    el.cut();
    el.selectRange('C3');
    el.paste();
    expect(edit('C3')).toBe('=A1+1');
    expect(edit('B1')).toBe('');
  });
  it('Colar Valores cola o resultado da fórmula', () => {
    put('A1', '3'); put('B1', '=A1*3');
    el.selectRange('B1');
    el.copy();
    el.selectRange('C1');
    el.paste(undefined, { valuesOnly: true });
    expect(edit('C1')).toBe('9');
  });
  it('Preencher abaixo/à direita copia a 1ª linha/coluna ajustando as fórmulas', () => {
    put('A1', '1'); put('A2', '2'); put('A3', '3'); put('B1', '=A1+1');
    el.selectRange('B1:B3');
    el.fill('down');
    expect(edit('B3')).toBe('=A3+1');
    el.selectRange('B1:D1');
    el.fill('right');
    expect(edit('D1')).toBe('=C1+1');
  });
  it('limpar conteúdo × formatos', () => {
    put('A1', '7');
    el.selectRange('A1');
    el.setFont({ bold: true });
    el.clear('contents');
    expect(edit('A1')).toBe('');
    expect(el.getCellFormat().bold).toBe(true);
    el.clear('formats');
    expect(el.getCellFormat().bold).toBe(false);
  });
});

describe('formatação gravada no .xlsx', () => {
  it('fonte, preenchimento, alinhamento, quebra e formato de número', () => {
    put('A1', '0.5');
    el.selectRange('A1:B2');
    el.setFormat({ font: { bold: true, color: '#C00000', size: 14 }, fill: '#FFFF00', align: { horizontal: 'center', wrapText: true } });
    el.selectRange('A1');
    el.setNumberFormat('percent');
    const f = el.getCellFormat();
    expect(f).toMatchObject({ bold: true, fontSize: 14, color: '#C00000', fill: '#FFFF00', horizontal: 'center', wrap: true, numFmtCode: '0.00%' });
    el.adjustDecimals(-1);
    expect(el.getCellFormat().numFmtCode).toBe('0.0%');
    const styles = part(el.saveXlsx(), 'xl/styles.xml');
    expect(styles).toMatch(/<font><b\/><sz val="14"\/><color rgb="FFC00000"\/>/);
    expect(styles).toContain('<patternFill patternType="solid"><fgColor rgb="FFFFFF00"/>');
    expect(styles).toContain('<alignment horizontal="center" wrapText="1"/>');
    expect(styles).toContain('formatCode="0.0%"');
    reopen();
    el.selectRange('B2');
    expect(el.getCellFormat()).toMatchObject({ bold: true, fill: '#FFFF00', horizontal: 'center' });
    el.selectRange('A1');
    expect(el.getCellFormat().numFmtCode).toBe('0.0%');
  });
  it('bordas externas do intervalo e "sem borda"', () => {
    el.selectRange('B2:C3');
    el.setBorders('outside');
    el.selectRange('B2');
    const xml = part(el.saveXlsx(), 'xl/styles.xml');
    expect(xml).toContain('<border><left style="thin"><color rgb="FF000000"/></left><right/><top style="thin"><color rgb="FF000000"/></top><bottom/><diagonal/></border>');
    el.selectRange('B2:C3');
    el.setBorders('none');
    el.undo();
    el.undo();
    expect(el.canUndo()).toBe(false);
  });
  it('colunas inteiras formatam o <col style>', () => {
    el.selectRange('C:C');
    el.setFont({ italic: true });
    const sheet = part(el.saveXlsx(), 'xl/worksheets/sheet1.xml');
    expect(sheet).toMatch(/<col min="3" max="3" width="[\d.]+" style="\d+"\/>/);
    el.selectRange('C20');
    expect(el.getCellFormat().italic).toBe(true);
  });
});

describe('mesclar, congelar, grade, tamanhos e ocultar', () => {
  it('Mesclar e Centralizar grava <mergeCells> e fica só o valor da superior esquerda', () => {
    put('A1', 'título'); put('B1', 'some');
    el.selectRange('A1:C1');
    expect(el.mergeLosesData()).toBe(true);
    el.merge('center');
    expect(part(el.saveXlsx(), 'xl/worksheets/sheet1.xml')).not.toContain('some');
    el.selectRange('B1');
    expect(el.getSelection().range).toBe('A1:C1');
    expect(el.getCellFormat()).toMatchObject({ merged: true, horizontal: 'center' });
    expect(part(el.saveXlsx(), 'xl/worksheets/sheet1.xml')).toContain('<mergeCells count="1"><mergeCell ref="A1:C1"/></mergeCells>');
    el.unmerge();
    expect(part(el.saveXlsx(), 'xl/worksheets/sheet1.xml')).not.toContain('mergeCells');
  });
  it('congelar painéis e linhas de grade vão para o <sheetView>', () => {
    el.selectRange('B3');
    el.freezePanes();
    expect(el.frozenPanes).toEqual({ cols: 1, rows: 2 });
    el.showGridlines = false;
    const xml = part(el.saveXlsx(), 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('showGridLines="0"');
    expect(xml).toContain('<pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/>');
    reopen();
    expect(el.frozenPanes).toEqual({ cols: 1, rows: 2 });
    expect(el.showGridlines).toBe(false);
    el.freezePanes(0, 0);
    expect(part(el.saveXlsx(), 'xl/worksheets/sheet1.xml')).not.toContain('<pane');
  });
  it('largura, altura, ocultar e reexibir', () => {
    el.selectRange('B1');
    el.setColumnWidth(20);
    el.selectRange('A2');
    el.setRowHeight(30);
    expect(el.rowHeightPt(2)).toBeCloseTo(30, 0);
    el.selectRange('C:D');
    el.setHidden('cols', true);
    const xml = part(el.saveXlsx(), 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<col min="2" max="2" width="[\d.]+" customWidth="1"\/>/);
    expect(el.columnWidth(2)).toBe(20);
    expect(xml).toMatch(/<col min="3" max="3" width="[\d.]+" hidden="1"\/>/);
    expect(xml).toMatch(/<row r="2"[^>]* ht="30" customHeight="1"/);
    el.selectRange('B:E');
    el.setHidden('cols', false);
    expect(el.columnWidth(3)).toBeGreaterThan(0);
  });
});

describe('localizar e substituir, AutoSoma, abas', () => {
  it('localizar vai para a próxima ocorrência; substituir tudo conta e desfaz de uma vez', () => {
    put('A1', 'maçã'); put('B2', 'banana'); put('C3', 'maçã verde');
    el.selectRange('A1');
    expect(el.find('maçã')).toEqual({ sheet: 0, ref: 'C3' });
    expect(el.find('maçã')).toEqual({ sheet: 0, ref: 'A1' });
    expect(el.find('MAÇÃ', { matchCase: true })).toBeNull();
    expect(el.find('maçã', { wholeCell: true })).toEqual({ sheet: 0, ref: 'A1' });
    expect(el.replaceAll('maçã', 'pera')).toBe(2);
    expect(edit('C3')).toBe('pera verde');
    el.undo();
    expect(edit('C3')).toBe('maçã verde');
  });
  it('AutoSoma de um intervalo grava a SOMA abaixo de cada coluna', () => {
    put('A1', '1'); put('A2', '2'); put('B1', '3'); put('B2', '4');
    el.selectRange('A1:B2');
    el.autoSum('SUM');
    expect(edit('A3')).toBe('=SUM(A1:A2)');
    expect(edit('B3')).toBe('=SUM(B1:B2)');
  });
  it('inserir planilha (pasta regravada e reaberta, alterações mantidas)', () => {
    put('A1', 'mantido');
    const name = el.addSheet();
    expect(name).toBe('Sheet2');
    expect(el.getSheetNames()).toEqual(['Sheet1', 'Sheet2']);
    expect(el.activeSheet).toBe(1);
    expect(el.isDirty()).toBe(true);
    el.selectSheet(0);
    expect(edit('A1')).toBe('mantido');
  });
  it('pasta nova em pt-BR: "Planilha1"; propriedades', () => {
    el.setAttribute('formula-locale', 'pt-BR');
    el.newWorkbook();
    expect(el.getSheetNames()).toEqual(['Planilha1']);
    expect(el.getProperties().sheets).toEqual(['Planilha1']);
    expect(el.isDirty()).toBe(false);
  });
});
