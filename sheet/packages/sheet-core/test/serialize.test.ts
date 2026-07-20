import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  XlsxPackage, readWorkbook, readWorksheet, updateWorksheetXml,
  serializeSheetData, serializeCols,
} from '../src/index.js';
import type { Row } from '../src/model.js';

const gapsPath = join(__dirname, '../../../samples/gaps-smoke.xlsx');

describe('serializeSheetData / serializeCols', () => {
  it('célula editada (inlineStr) e número saem tipados', () => {
    const rows: Row[] = [
      { r: 1, cells: [
        { ref: 'A1', type: 'inlineStr', inlineString: { text: 'olá <mundo>' } },
        { ref: 'C1', type: 'n', value: '42', style: 3 },
      ] },
      { r: 3, cells: [{ ref: 'B3', type: 'b', value: '1' }], height: 30, customHeight: true },
    ];
    const xml = serializeSheetData(rows);
    expect(xml).toContain('<row r="1" spans="1:3">');
    expect(xml).toContain('<c r="A1" t="inlineStr"><is><t>olá &lt;mundo&gt;</t></is></c>');
    expect(xml).toContain('<c r="C1" s="3" t="n"><v>42</v></c>');
    expect(xml).toContain('ht="30"');
    expect(xml).toContain('customHeight="1"');
  });

  it('fórmula com cache emite <f> e <v>', () => {
    const rows: Row[] = [
      { r: 1, cells: [{ ref: 'A1', type: 'str', formula: 'B1&"x"', value: 'okx' }] },
    ];
    const xml = serializeSheetData(rows);
    expect(xml).toContain('<f>B1&amp;"x"</f>');
    expect(xml).toContain('<v>okx</v>');
  });

  it('cols com largura custom', () => {
    expect(serializeCols([{ min: 2, max: 2, width: 20.5, customWidth: true }]))
      .toBe('<cols><col min="2" max="2" width="20.5" customWidth="1"/></cols>');
    expect(serializeCols([])).toBe('');
    expect(serializeCols(undefined)).toBe('');
  });
});

describe('updateWorksheetXml — cirurgia preservando o resto', () => {
  it('edição persiste no save e re-load; partes fora do sheetData intactas', () => {
    const bytes = new Uint8Array(readFileSync(gapsPath));
    const pkg = XlsxPackage.load(bytes);
    const wb = readWorkbook(pkg);
    const target = wb.sheets[0]!.target!;
    const ws = readWorksheet(pkg, target);
    const originalXml = pkg.getPartText(target)!;

    // edita: valor novo em Z9 + largura custom na coluna 1
    ws.rows.push({ r: 9, cells: [{ ref: 'Z9', type: 'inlineStr', inlineString: { text: 'persistiu' } }] });
    ws.cols = [...(ws.cols ?? []), { min: 26, max: 26, width: 33, customWidth: true }];
    const updated = updateWorksheetXml(originalXml, ws);
    pkg.setPartText(target, updated);

    // re-load do pacote salvo: a edição sobrevive
    const pkg2 = XlsxPackage.load(pkg.save());
    const ws2 = readWorksheet(pkg2, target);
    const z9 = ws2.rows.find((r) => r.r === 9)?.cells.find((c) => c.ref === 'Z9');
    expect(z9?.inlineString?.text).toBe('persistiu');
    expect(ws2.cols?.some((c) => c.min === 26 && c.width === 33)).toBe(true);

    // fora de <sheetData>/<cols>, o XML segue idêntico (ex.: sheetViews/pane)
    const before = originalXml.slice(0, originalXml.search(/<sheetData[\s/>]/)).replace(/<cols[\s>].*?<\/cols>/s, '');
    const after = updated.slice(0, updated.search(/<sheetData[\s/>]/)).replace(/<cols[\s>].*?<\/cols>/s, '');
    expect(after).toBe(before);
    // o pane congelado da fixture sobrevive à cirurgia
    expect(pkg2.getPartText(target)).toContain('<pane');
  });
});
