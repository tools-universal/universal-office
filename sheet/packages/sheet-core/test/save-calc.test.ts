import { describe, expect, it } from 'vitest';
import { XlsxPackage, readWorkbook, removeCalcChain, updateCalcPr, ensureDynamicArrayCm, updateDefinedNames, encodeXstring, serializeSheetData } from '../src/index.js';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function pkg(extra: { calcChain?: boolean; metadata?: string; workbook?: string } = {}): XlsxPackage {
  const p = XlsxPackage.empty();
  p.setPartText('xl/workbook.xml', extra.workbook ?? `<?xml version="1.0"?><workbook ${NS}><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" iterate="1"/><extLst/></workbook>`);
  let rels = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>';
  let ct = p.getPartText('[Content_Types].xml')!;
  if (extra.calcChain) {
    p.setPartText('xl/calcChain.xml', '<calcChain/>');
    rels += '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/>';
    ct = ct.replace('</Types>', '<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>');
  }
  if (extra.metadata) {
    p.setPartText('xl/metadata.xml', extra.metadata);
    rels += '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata" Target="metadata.xml"/>';
  }
  p.setPartText('xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);
  p.setPartText('[Content_Types].xml', ct);
  return p;
}

describe('partes de cálculo na gravação', () => {
  it('remove a calcChain (parte, relação, Override)', () => {
    const p = pkg({ calcChain: true });
    expect(removeCalcChain(p)).toBe(true);
    expect(p.getPart('xl/calcChain.xml')).toBeUndefined();
    expect(p.getPartText('xl/_rels/workbook.xml.rels')).not.toContain('calcChain');
    expect(p.getPartText('[Content_Types].xml')).not.toContain('calcChain');
    expect(removeCalcChain(p)).toBe(false);
  });

  it('calcPr: troca atributos sem perder os outros; cria na ordem do esquema', () => {
    const p = pkg();
    updateCalcPr(p, { fullCalcOnLoad: '1' });
    expect(p.workbookXml()).toContain('<calcPr calcId="191029" iterate="1" fullCalcOnLoad="1"/>');
    updateCalcPr(p, { fullCalcOnLoad: undefined, calcId: '124519' });
    expect(p.workbookXml()).toContain('<calcPr calcId="124519" iterate="1"/>');
    const q = pkg({ workbook: `<workbook ${NS}><sheets/><definedNames/><oleSize ref="A1"/></workbook>` });
    updateCalcPr(q, { calcId: '191029' });
    expect(q.workbookXml()).toContain('<definedNames/><calcPr calcId="191029"/><oleSize');
    expect(readWorkbook(q).calcPr?.calcId).toBe(191029);
  });

  it('cm de matriz dinâmica: cria metadata.xml; reaproveita; acrescenta a um com XLRICHVALUE', () => {
    const p = pkg();
    expect(ensureDynamicArrayCm(p)).toBe(1);
    expect(p.getPartText('xl/_rels/workbook.xml.rels')).toContain('sheetMetadata');
    expect(p.getPartText('[Content_Types].xml')).toContain('/xl/metadata.xml');
    expect(ensureDynamicArrayCm(p)).toBe(1);
    expect(readWorkbook(p).dynamicArrayCm).toEqual([1]);
    // só valueMetadata (dado de tipo/rich value): XLDAPR entra como tipo 2, cellMetadata novo
    const rich = '<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xlrd="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata">'
      + '<metadataTypes count="1"><metadataType name="XLRICHVALUE" minSupportedVersion="120000"/></metadataTypes>'
      + '<futureMetadata name="XLRICHVALUE" count="1"><bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="0"/></ext></extLst></bk></futureMetadata>'
      + '<valueMetadata count="1"><bk><rc t="1" v="0"/></bk></valueMetadata></metadata>';
    const q = pkg({ metadata: rich });
    expect(ensureDynamicArrayCm(q)).toBe(1);
    const xml = q.getPartText('xl/metadata.xml')!;
    expect(xml).toContain('<metadataTypes count="2">');
    expect(xml).toMatch(/<cellMetadata count="1"><bk><rc t="2" v="0"\/><\/bk><\/cellMetadata><valueMetadata/);
    expect(readWorkbook(q).dynamicArrayCm).toEqual([1]);
  });

  it('nomes definidos: cria, altera mantendo atributos desconhecidos, remove', () => {
    const p = pkg({ workbook: `<workbook ${NS}><sheets/><definedNames><definedName name="A" comment="c">1</definedName><definedName name="B" localSheetId="0">2</definedName></definedNames><calcPr/></workbook>` });
    updateDefinedNames(p, [{ name: 'a', formula: 'S!$A$1' }, { name: 'Novo', formula: '"x&y"' }], [{ name: 'B', localSheetId: 0 }]);
    const xml = p.workbookXml();
    expect(xml).toContain('<definedNames><definedName name="a" comment="c">S!$A$1</definedName><definedName name="Novo">"x&amp;y"</definedName></definedNames><calcPr/>');
    const q = pkg();
    updateDefinedNames(q, [{ name: 'T', formula: '0.1', localSheetId: 0 }]);
    expect(q.workbookXml()).toContain('</sheets><definedNames><definedName name="T" localSheetId="0">0.1</definedName></definedNames><calcPr');
    updateDefinedNames(q, [], [{ name: 't', localSheetId: 0 }]);
    expect(q.workbookXml()).not.toContain('definedNames');
  });

  it('texto de fórmula: escape _xHHHH_ e "" como <v></v>', () => {
    expect(encodeXstring('a\u0001b_x0041_')).toBe('a_x0001_b_x005F_x0041_');
    const xml = serializeSheetData([{ r: 1, cells: [{ ref: 'A1', formula: '""', type: 'str', value: '' }, { ref: 'B1', formula: 'A1', value: '' }] }]);
    expect(xml).toContain('<c r="A1" t="str"><f>""</f><v></v></c><c r="B1"><f>A1</f></c>');
    // espaço nas pontas: xml:space="preserve" (o Excel apara sem ele — medido: " " virava "")
    expect(serializeSheetData([{ r: 1, cells: [{ ref: 'A1', formula: '" "', type: 'str', value: ' ' }] }])).toContain('<v xml:space="preserve"> </v>');
    // erro do 365 no <v>: o Excel não abre — vai #VALUE! (a fórmula ganha ca no prepareForSave)
    expect(serializeSheetData([{ r: 1, cells: [{ ref: 'A1', formula: 'X', type: 'e', value: '#CALC!' }, { ref: 'B1', type: 'e', value: '#N/A' }] }]))
      .toContain('<c r="A1" t="e"><f>X</f><v>#VALUE!</v></c><c r="B1" t="e"><v>#N/A</v></c>');
  });
});
