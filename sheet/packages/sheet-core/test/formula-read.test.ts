import { describe, expect, it } from 'vitest';
import { XlsxPackage, readWorkbook, readWorksheet, serializeSheetData } from '../src/index.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Pasta mínima com o que o cálculo precisa: nomes, calcPr, link externo, metadados XLDAPR, tabela. */
function pkg(): XlsxPackage {
  const parts = new Map<string, Uint8Array>();
  parts.set('xl/workbook.xml', enc(`<workbook ${NS}><workbookPr date1904="1"/><sheets><sheet name="Plan1" sheetId="1" r:id="rId1"/></sheets>`
    + '<externalReferences><externalReference r:id="rId3"/></externalReferences>'
    + '<definedNames><definedName name="taxa">Plan1!$A$1</definedName><definedName name="_xlnm.Print_Area" localSheetId="0" hidden="1">Plan1!$A$1:$C$3</definedName></definedNames>'
    + '<calcPr calcId="191029" iterate="1" iterateCount="50" iterateDelta="0.01" fullCalcOnLoad="1"/></workbook>'));
  parts.set('xl/_rels/workbook.xml.rels', enc(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>`
    + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata" Target="metadata.xml"/>`
    + `<Relationship Id="rId3" Type="${REL}/externalLink" Target="externalLinks/externalLink1.xml"/></Relationships>`));
  parts.set('xl/metadata.xml', enc('<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">'
    + '<metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000"/></metadataTypes>'
    + '<futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata>'
    + '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>'));
  parts.set('xl/externalLinks/externalLink1.xml', enc(`<externalLink ${NS}><externalBook r:id="rId1"><sheetNames><sheetName val="Dados"/></sheetNames>`
    + '<definedNames><definedName name="ext" refersTo="=Dados!$B$2"/></definedNames>'
    + '<sheetDataSet><sheetData sheetId="0"><row r="2"><cell r="B2"><v>7</v></cell><cell r="C2" t="str"><v>oi</v></cell></row></sheetData></sheetDataSet></externalBook></externalLink>'));
  parts.set('xl/externalLinks/_rels/externalLink1.xml.rels', enc(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/externalLinkPath" Target="file:///C:/x/Outra.xlsx" TargetMode="External"/></Relationships>`));
  parts.set('xl/worksheets/sheet1.xml', enc(`<worksheet ${NS}><sheetData>`
    + '<row r="1"><c r="A1"><v>2</v></c><c r="B1"><f t="shared" ref="B1:B3" si="0">A1*2</f><v>4</v></c><c r="C1" cm="1"><f t="array" ref="C1:C2">SEQUENCE(2)</f><v>1</v></c></row>'
    + '<row r="2"><c r="B2"><f t="shared" si="0"/><v>0</v></c><c r="C2"><v>2</v></c></row>'
    + '<row r="3"><c r="B3" vm="1"><f t="shared" si="0"/><v>0</v></c><c r="D3"><f t="dataTable" ref="D3:D4" dt2D="0" dtr="1" r1="A1"/><v>5</v></c></row>'
    + '</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>'));
  parts.set('xl/worksheets/_rels/sheet1.xml.rels', enc(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/table" Target="../tables/table1.xml"/></Relationships>`));
  parts.set('xl/tables/table1.xml', enc('<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Tabela1" displayName="Vendas" ref="F1:G4" totalsRowCount="1">'
    + '<tableColumns count="2"><tableColumn id="1" name="Item" totalsRowLabel="Total"/><tableColumn id="2" name="Valor" totalsRowFunction="sum"><calculatedColumnFormula>[@Item]*2</calculatedColumnFormula></tableColumn></tableColumns></table>'));
  return XlsxPackage.fromParts(parts);
}

describe('leitura para o cálculo', () => {
  it('pasta: nomes, calcPr, link externo, matrizes dinâmicas', () => {
    const wb = readWorkbook(pkg());
    expect(wb.date1904).toBe(true);
    expect(wb.definedNames).toEqual([
      { name: 'taxa', formula: 'Plan1!$A$1' },
      { name: '_xlnm.Print_Area', formula: 'Plan1!$A$1:$C$3', localSheetId: 0, hidden: true },
    ]);
    expect(wb.calcPr).toEqual({ calcId: 191029, iterate: true, iterateCount: 50, iterateDelta: 0.01, fullCalcOnLoad: true });
    expect(wb.externalLinks).toEqual([{
      target: 'file:///C:/x/Outra.xlsx', sheetNames: ['Dados'], definedNames: [{ name: 'ext', refersTo: '=Dados!$B$2' }],
      sheetData: [{ sheetId: 0, cells: [{ ref: 'B2', v: '7' }, { ref: 'C2', t: 'str', v: 'oi' }] }],
    }]);
    expect(wb.dynamicArrayCm).toEqual([1]);
  });

  it('célula: atributos do <f>, cm/vm; tabela com colunas; e grava de volta', () => {
    const ws = readWorksheet(pkg(), 'xl/worksheets/sheet1.xml');
    const cells = ws.rows.flatMap((r) => r.cells);
    const at = (ref: string) => cells.find((c) => c.ref === ref)!;
    expect(at('B1')).toMatchObject({ formula: 'A1*2', formulaAttrs: { t: 'shared', ref: 'B1:B3', si: 0 } });
    expect(at('B2')).toMatchObject({ formula: '', formulaAttrs: { t: 'shared', si: 0 } });
    expect(at('C1')).toMatchObject({ formula: 'SEQUENCE(2)', formulaAttrs: { t: 'array', ref: 'C1:C2' }, cm: 1 });
    expect(at('B3').vm).toBe(1);
    expect(at('D3').formulaAttrs).toEqual({ t: 'dataTable', ref: 'D3:D4', dtr: true, r1: 'A1' });
    expect(ws.tables?.[0]).toMatchObject({
      name: 'Tabela1', displayName: 'Vendas', totalsRowCount: 1,
      columns: [{ name: 'Item', totalsRowLabel: 'Total' }, { name: 'Valor', totalsRowFunction: 'sum', calculatedColumnFormula: '[@Item]*2' }],
    });
    const xml = serializeSheetData(ws.rows);
    expect(xml).toContain('<c r="B1"><f t="shared" ref="B1:B3" si="0">A1*2</f><v>4</v></c>');
    expect(xml).toContain('<c r="B2"><f t="shared" si="0"/><v>0</v></c>');
    expect(xml).toContain('<c r="C1" cm="1"><f t="array" ref="C1:C2">SEQUENCE(2)</f><v>1</v></c>');
    expect(xml).toContain('<c r="B3" vm="1">');
    expect(xml).toContain('<f t="dataTable" ref="D3:D4" dtr="1" r1="A1"/>');
  });
});
