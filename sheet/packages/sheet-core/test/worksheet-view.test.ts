// Pasta em branco (Arquivo › Novo) e a regravação cirúrgica de <mergeCells> e
// do <sheetView> (linhas de grade, painéis congelados) — só quando pedida.
import { describe, expect, it } from 'vitest';
import {
  XlsxPackage, blankWorkbook, blankXlsx, readStyles, readWorkbook, readWorksheet, updateWorksheetXml, type Worksheet,
} from '../src/index.js';

const SHEET = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<dimension ref="A1:B2"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="B2" sqref="B2"/></sheetView></sheetViews>'
  + '<sheetFormatPr defaultRowHeight="15"/><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData>'
  + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';

describe('pasta em branco', () => {
  it('abre com uma aba, a fonte Normal e os blocos de estilo completos', () => {
    const pkg = XlsxPackage.load(blankXlsx({ sheetName: 'Planilha1' }));
    const wb = readWorkbook(pkg);
    expect(wb.sheets.map((s) => s.name)).toEqual(['Planilha1']);
    const st = readStyles(pkg);
    expect(st.fonts[0]).toMatchObject({ name: 'Aptos Narrow', size: 11 });
    expect(st.fills).toHaveLength(2);
    expect(st.borders).toHaveLength(1);
    expect(st.cellXfs).toHaveLength(1);
    const ws = readWorksheet(pkg, wb.sheets[0]!.target!);
    expect(ws.rows).toEqual([]);
  });
  it('nome da aba com XML especial e limite de 31 caracteres', () => {
    const pkg = blankWorkbook({ sheetName: 'A&B <teste> com nome muito longo demais' });
    expect(readWorkbook(pkg).sheets[0]!.name).toBe('A&B <teste> com nome muito long');
  });
});

describe('updateWorksheetXml: mesclas e vista', () => {
  const base = (): Worksheet => ({ rows: [{ r: 1, cells: [{ ref: 'A1', value: '1' }] }] });

  it('sem opções, <sheetView> e mesclas ficam byte a byte', () => {
    const out = updateWorksheetXml(SHEET, base());
    expect(out).toContain('<sheetView tabSelected="1" workbookViewId="0"><selection activeCell="B2" sqref="B2"/></sheetView>');
    expect(out).not.toContain('mergeCells');
  });

  it('mesclas novas entram antes de <pageMargins>; vazias tiram o bloco', () => {
    const ws = { ...base(), merges: ['A1:B2', 'C3:D3'] };
    const out = updateWorksheetXml(SHEET, ws, { merges: true });
    expect(out).toContain('</sheetData><mergeCells count="2"><mergeCell ref="A1:B2"/><mergeCell ref="C3:D3"/></mergeCells><pageMargins');
    const again = updateWorksheetXml(out, { ...ws, merges: [] }, { merges: true });
    expect(again).not.toContain('mergeCells');
  });

  it('linhas de grade ocultas e painel congelado (as seleções antigas saem)', () => {
    const ws: Worksheet = { ...base(), showGridLines: false, pane: { xSplit: 1, ySplit: 2, state: 'frozen' } };
    const out = updateWorksheetXml(SHEET, ws, { sheetView: true });
    expect(out).toContain('<sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/></sheetView>');
    // lido de volta: o mesmo modelo
    const pkg = blankWorkbook();
    pkg.setPartText('xl/worksheets/sheet1.xml', out);
    const back = readWorksheet(pkg, 'xl/worksheets/sheet1.xml');
    expect(back.showGridLines).toBe(false);
    expect(back.pane).toMatchObject({ xSplit: 1, ySplit: 2, state: 'frozen' });
    // descongelar e mostrar a grade
    const plain = updateWorksheetXml(out, { ...base() }, { sheetView: true });
    expect(plain).toContain('<sheetView tabSelected="1" workbookViewId="0"></sheetView>');
  });

  it('só a grade mudou: o pane do arquivo (e as seleções) ficam', () => {
    const frozen = SHEET.replace('<selection activeCell="B2" sqref="B2"/>', '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/>');
    const ws: Worksheet = { ...base(), showGridLines: false, pane: { xSplit: 0, ySplit: 1, state: 'frozen' } };
    const out = updateWorksheetXml(frozen, ws, { sheetView: true });
    expect(out).toContain('<sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/></sheetView>');
  });

  it('sem <sheetViews>: o bloco entra antes de <sheetFormatPr>; <sheetView/> auto-fechado vira com filho', () => {
    const bare = SHEET.replace(/<sheetViews>.*?<\/sheetViews>/, '');
    const out = updateWorksheetXml(bare, { ...base(), pane: { xSplit: 0, ySplit: 1, state: 'frozen' } }, { sheetView: true });
    expect(out).toContain('<dimension ref="A1:B2"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr');
    const self = SHEET.replace(/<sheetViews>.*?<\/sheetViews>/, '<sheetViews><sheetView workbookViewId="0"/></sheetViews>');
    const out2 = updateWorksheetXml(self, { ...base(), pane: { xSplit: 2, ySplit: 0, state: 'frozen' } }, { sheetView: true });
    expect(out2).toContain('<sheetView workbookViewId="0"><pane xSplit="2" topLeftCell="C1" activePane="topRight" state="frozen"/></sheetView>');
  });
});
