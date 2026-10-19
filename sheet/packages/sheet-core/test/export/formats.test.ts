import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { xlsxToOds, xlsxToXml2003, isDateTimeCode } from '../../src/export/index.js';
import { makeXlsx, sheetXml, inlineStr, STYLES_XML } from './helpers.js';

const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/showcase.xlsx'));

describe('isDateTimeCode', () => {
  it('classifica data/hora/número', () => {
    expect(isDateTimeCode('dd/mm/yyyy')).toEqual({ date: true, time: false });
    expect(isDateTimeCode('dd/mm/yyyy hh:mm')).toEqual({ date: true, time: true });
    expect(isDateTimeCode('mm:ss')).toEqual({ date: false, time: true });
    expect(isDateTimeCode('[h]:mm')).toEqual({ date: false, time: true });
    expect(isDateTimeCode('#,##0.00')).toEqual({ date: false, time: false });
    expect(isDateTimeCode('"em" yyyy')).toEqual({ date: true, time: false });
    expect(isDateTimeCode('General')).toEqual({ date: false, time: false });
    // 'd' literal escapado não é data
    expect(isDateTimeCode('0.00" un"')).toEqual({ date: false, time: false });
  });
});

const TYPED_XLSX = (): Uint8Array => makeXlsx([{
  name: 'Tipos',
  xml: sheetXml(
    '<row r="1">' +
    inlineStr('A1', 'texto') +
    '<c r="B1" s="1"><v>1234.5</v></c>' +      // número #,##0.00
    '<c r="C1" s="2"><v>45992</v></c>' +       // data dd/mm/yyyy (01/12/2025)
    '<c r="D1" t="b"><v>1</v></c>' +
    '<c r="E1" t="e"><f>1/0</f><v>#DIV/0!</v></c>' +
    '</row>' +
    '<row r="2">' + inlineStr('A2', 'mesclada') + '</row>',
    '<mergeCells count="1"><mergeCell ref="A2:B2"/></mergeCells>',
  ),
}], STYLES_XML);

describe('xlsxToOds', () => {
  it('gera ZIP ODF válido: mimetype primeiro/STORED e content tipado', () => {
    const ods = xlsxToOds(TYPED_XLSX());
    // assinatura zip + "mimetype" como primeira entrada, sem compressão
    expect(ods[0]).toBe(0x50); // 'P'
    const nameLen = ods[26]! | (ods[27]! << 8);
    const method = ods[8]! | (ods[9]! << 8);
    expect(strFromU8(ods.slice(30, 30 + nameLen))).toBe('mimetype');
    expect(method).toBe(0); // STORED
    const parts = unzipSync(ods);
    expect(strFromU8(parts['mimetype']!)).toBe('application/vnd.oasis.opendocument.spreadsheet');
    const content = strFromU8(parts['content.xml']!);
    expect(content).toContain('office:value-type="float" office:value="1234.5"');
    expect(content).toContain('office:value-type="date" office:date-value="2025-12-01"');
    expect(content).toContain('office:value-type="boolean" office:boolean-value="true"');
    expect(content).toContain('<text:p>1.234,50</text:p>');   // exibição pt-BR
    expect(content).toContain('<text:p>01/12/2025</text:p>');
    expect(content).toContain('table:number-columns-spanned="2"');
    expect(content).toContain('<table:covered-table-cell/>');
    expect(parts['META-INF/manifest.xml']).toBeDefined();
    expect(parts['styles.xml']).toBeDefined();
  });

  it('showcase inteiro não explode e tem uma tabela por sheet visível', () => {
    const parts = unzipSync(xlsxToOds(showcase()));
    const content = strFromU8(parts['content.xml']!);
    expect((content.match(/<table:table /g) ?? []).length).toBeGreaterThanOrEqual(10);
  });
});

describe('xlsxToXml2003', () => {
  it('gera SpreadsheetML com tipos, estilos e merges', () => {
    const xml = xlsxToXml2003(TYPED_XLSX());
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('<Data ss:Type="Number">1234.5</Data>');
    expect(xml).toContain('<Data ss:Type="DateTime">2025-12-01T00:00:00.000</Data>');
    expect(xml).toContain('<Data ss:Type="Boolean">1</Data>');
    expect(xml).toContain('<Data ss:Type="Error">#DIV/0!</Data>');
    expect(xml).toContain('ss:MergeAcross="1"');
    expect(xml).toContain('ss:Format='); // NumberFormat de data garantido
    expect(xml).toContain('<Worksheet ss:Name="Tipos">');
  });

  it('showcase inteiro não explode', () => {
    const xml = xlsxToXml2003(showcase());
    expect(xml).toContain('</Workbook>');
    expect((xml.match(/<Worksheet /g) ?? []).length).toBeGreaterThanOrEqual(10);
  });
});
