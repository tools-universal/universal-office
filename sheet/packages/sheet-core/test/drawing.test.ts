import { describe, expect, it } from 'vitest';
import { XlsxPackage, readDrawing, readWorksheet } from '../src/index.js';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const cell = (tag: string, c: number, co: number, r: number, ro: number): string =>
  `<xdr:${tag}><xdr:col>${c}</xdr:col><xdr:colOff>${co}</xdr:colOff><xdr:row>${r}</xdr:row><xdr:rowOff>${ro}</xdr:rowOff></xdr:${tag}>`;
const sp = (name: string): string => `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="2" name="${name}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp>`;
const chartFrame = '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="3" name="G"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdC"/></a:graphicData></a:graphic></xdr:graphicFrame>';

function pkgWith(drawing: string): XlsxPackage {
  const pkg = XlsxPackage.empty();
  pkg.setPartText('xl/drawings/drawing1.xml', `${XML}<xdr:wsDr ${NS}>${drawing}</xdr:wsDr>`);
  pkg.setPartText('xl/drawings/_rels/drawing1.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdC" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`);
  pkg.setPartText('xl/charts/chart1.xml', `${XML}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"/>`);
  return pkg;
}

describe('readDrawing (xl/drawings/drawingN.xml)', () => {
  it('lê as três âncoras e intercala gráficos e formas na ordem do arquivo', () => {
    const pkg = pkgWith(
      `<xdr:twoCellAnchor editAs="oneCell">${cell('from', 1, 100, 2, 200)}${cell('to', 4, 300, 9, 400)}${sp('A')}<xdr:clientData/></xdr:twoCellAnchor>`
      + `<xdr:twoCellAnchor>${cell('from', 0, 0, 0, 0)}${cell('to', 5, 0, 10, 0)}${chartFrame}<xdr:clientData/></xdr:twoCellAnchor>`
      + `<xdr:oneCellAnchor>${cell('from', 2, 10, 3, 20)}<xdr:ext cx="914400" cy="457200"/>${sp('B')}<xdr:clientData/></xdr:oneCellAnchor>`
      + `<xdr:absoluteAnchor><xdr:pos x="12700" y="25400"/><xdr:ext cx="100" cy="200"/>${sp('C')}<xdr:clientData/></xdr:absoluteAnchor>`,
    );
    const d = readDrawing(pkg, 'xl/drawings/drawing1.xml');
    expect(d.charts).toHaveLength(1);
    expect(d.charts[0]!.order).toBe(1);
    expect(d.objects.map((o) => o.order)).toEqual([0, 2, 3]);
    const [a, b, c] = d.objects;
    expect(a!.anchor).toEqual({ from: { col: 1, row: 2, colOff: 100, rowOff: 200 }, to: { col: 4, row: 9, colOff: 300, rowOff: 400 }, editAs: 'oneCell' });
    expect(b!.anchor.kind).toBe('oneCell');
    expect(b!.anchor.ext).toEqual({ cx: 914400, cy: 457200 });
    expect(c!.anchor.kind).toBe('absolute');
    expect(c!.anchor.pos).toEqual({ x: 12700, y: 25400 });
    expect(a!.el.name).toBe('xdr:sp');
    expect(a!.part).toBe('xl/drawings/drawing1.xml');
  });

  it('mc:AlternateContent: a14 usa o Choice; gráfico estendido (cx) não desenha nem o aviso do Fallback', () => {
    const pkg = pkgWith(
      `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14"><xdr:twoCellAnchor>${cell('from', 0, 0, 0, 0)}${cell('to', 1, 0, 1, 0)}${sp('Controle')}<xdr:clientData/></xdr:twoCellAnchor></mc:Choice><mc:Fallback/></mc:AlternateContent>`
      + `<xdr:twoCellAnchor>${cell('from', 0, 0, 0, 0)}${cell('to', 1, 0, 1, 0)}<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" Requires="cx1"><xdr:graphicFrame/></mc:Choice><mc:Fallback>${sp('Aviso')}</mc:Fallback></mc:AlternateContent><xdr:clientData/></xdr:twoCellAnchor>`,
    );
    const d = readDrawing(pkg, 'xl/drawings/drawing1.xml');
    expect(d.objects).toHaveLength(1);
    expect(d.objects[0]!.el.name).toBe('xdr:sp');
  });

  it('prefixo do SpreadsheetDrawing diferente de xdr: é normalizado', () => {
    const pkg = XlsxPackage.empty();
    pkg.setPartText('xl/drawings/drawing1.xml', `${XML}<s:wsDr xmlns:s="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><s:oneCellAnchor><s:from><s:col>3</s:col><s:colOff>0</s:colOff><s:row>4</s:row><s:rowOff>0</s:rowOff></s:from><s:ext cx="1" cy="2"/><s:sp><s:nvSpPr><s:cNvPr id="2" name="X"/><s:cNvSpPr/></s:nvSpPr><s:spPr/></s:sp><s:clientData/></s:oneCellAnchor></s:wsDr>`);
    const d = readDrawing(pkg, 'xl/drawings/drawing1.xml');
    expect(d.objects).toHaveLength(1);
    expect(d.objects[0]!.el.name).toBe('xdr:sp');
    expect(d.objects[0]!.anchor.from).toEqual({ col: 3, row: 4, colOff: 0, rowOff: 0 });
  });

  it('OLE (objectPr) vira imagem da prévia e controle de formulário vira a forma do rótulo, na ordem da forma oculta', () => {
    const host = (spid: number): string => `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${spid}" name="H" hidden="1"><a:extLst><a:ext uri="{63B3BB69-23CF-44E3-9099-C40C66FF867C}"><a14:compatExt xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" spid="_x0000_s${spid}"/></a:ext></a:extLst></xdr:cNvPr><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp>`;
    const pkg = pkgWith(
      `<xdr:twoCellAnchor>${cell('from', 0, 0, 0, 0)}${cell('to', 1, 0, 1, 0)}${host(1025)}<xdr:clientData/></xdr:twoCellAnchor>`
      + `<xdr:twoCellAnchor>${cell('from', 0, 0, 2, 0)}${cell('to', 1, 0, 3, 0)}${host(1026)}<xdr:clientData/></xdr:twoCellAnchor>`
      + `<xdr:twoCellAnchor>${cell('from', 0, 0, 4, 0)}${cell('to', 1, 0, 5, 0)}${sp('Depois')}<xdr:clientData/></xdr:twoCellAnchor>`,
    );
    const MC = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';
    const anchor = `<anchor moveWithCells="1"><from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></from><to><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></to></anchor>`;
    pkg.setPartText('xl/worksheets/sheet1.xml', `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"><sheetData/><drawing r:id="rId1"/>`
      + `<mc:AlternateContent ${MC}><mc:Choice Requires="x14"><controls><mc:AlternateContent ${MC}><mc:Choice Requires="x14"><control shapeId="1026" r:id="rId3" name="Check Box 1"><controlPr defaultSize="0">${anchor}</controlPr></control></mc:Choice></mc:AlternateContent></controls></mc:Choice></mc:AlternateContent>`
      + `<oleObjects><mc:AlternateContent ${MC}><mc:Choice Requires="x14"><oleObject progId="Package" shapeId="1025" r:id="rId4"><objectPr defaultSize="0" r:id="rId2">${anchor}</objectPr></oleObject></mc:Choice></mc:AlternateContent></oleObjects></worksheet>`);
    pkg.setPartText('xl/worksheets/_rels/sheet1.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.emf"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/ctrlProp" Target="../ctrlProps/ctrlProp1.xml"/></Relationships>`);
    pkg.setPartText('xl/ctrlProps/ctrlProp1.xml', `${XML}<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="CheckBox" checked="Checked" lockText="1"/>`);
    const ws = readWorksheet(pkg, 'xl/worksheets/sheet1.xml');
    const objs = [...(ws.drawings ?? [])].sort((a, b) => a.order - b.order);
    expect(objs.map((o) => o.el.name)).toEqual(['xdr:sp', 'xdr:pic', 'xdr:sp', 'xdr:sp', 'xdr:sp']);
    const ole = objs[1]!;
    expect(ole.part).toBe('xl/worksheets/sheet1.xml');
    expect(ole.anchor.from).toEqual({ col: 2, row: 3, colOff: 0, rowOff: 0 });
    expect(JSON.stringify(ole.el)).toContain('"r:embed":"rId2"');
    const ctl = objs[3]!;
    expect(ctl.control).toEqual({ type: 'CheckBox', checked: 'Checked' });
    expect(JSON.stringify(ctl.el)).not.toContain('hidden');
  });

  it('a aba acha o desenho mesmo com maiúsculas divergentes (Sheet1.xml × _rels/sheet1.xml.rels)', () => {
    const pkg = pkgWith(`<xdr:twoCellAnchor>${cell('from', 0, 0, 0, 0)}${cell('to', 1, 0, 1, 0)}${sp('A')}<xdr:clientData/></xdr:twoCellAnchor>`);
    pkg.setPartText('xl/worksheets/Sheet9.xml', `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><drawing r:id="rId1"/></worksheet>`);
    pkg.setPartText('xl/worksheets/_rels/sheet9.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
    const ws = readWorksheet(pkg, 'xl/worksheets/Sheet9.xml');
    expect(ws.drawings).toHaveLength(1);
  });
});
