import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { XlsxPackage, readWorkbook, readWorksheet, parseChart, chartModelFor, chartFileFormat } from '../src/index.js';

const NS_X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = (items: [string, string, string][]) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, t, tg]) => `<Relationship Id="${id}" Type="${REL}/${t}" Target="${tg}"/>`).join('')}</Relationships>`;
const frame = (name: string, rid: string, xfrm = '', uri = 'chart', el = `<c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="${rid}"/>`) =>
  `<xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${name}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>${xfrm}<a:graphic><a:graphicData uri="${uri}">${el}</a:graphicData></a:graphic></xdr:graphicFrame>`;
const chartXml = `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}"><c:chart><c:plotArea><c:barChart><c:barDir val="col"/><c:ser><c:idx val="0"/><c:order val="0"/><c:val><c:numRef><c:numCache><c:ptCount val="1"/><c:pt idx="0"><c:v>3</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`;

function book(): XlsxPackage {
  const drawing1 = `<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}">`
    // uma célula + ext
    + `<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>9525</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="952500" cy="476250"/>${frame('Um', 'rId1')}<xdr:clientData/></xdr:oneCellAnchor>`
    // grupo: dois gráficos lado a lado no espaço filho 0..200 × 0..100
    + `<xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>10</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
    + `<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="9" name="G"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="5" y="5"/><a:ext cx="200" cy="100"/><a:chOff x="0" y="0"/><a:chExt cx="200" cy="100"/></a:xfrm></xdr:grpSpPr>`
    + frame('Esq', 'rId1', '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></xdr:xfrm>')
    + frame('Dir', 'rId1', '<xdr:xfrm><a:off x="100" y="50"/><a:ext cx="100" cy="50"/></xdr:xfrm>')
    + `</xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor>`
    // chartex no Choice, caixa de texto no Fallback
    + `<xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
    + `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" Requires="cx1">`
    + frame('Cascata', 'rId2', '', 'cx', `<cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="${NS_R}" r:id="rId2"/>`)
    + `</mc:Choice><mc:Fallback><xdr:sp><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp></mc:Fallback></mc:AlternateContent><xdr:clientData/></xdr:twoCellAnchor>`
    + '</xdr:wsDr>';
  // aba de gráfico: âncora absoluta, desenho com namespace DEFAULT (sem prefixo)
  const drawing2 = `<wsDr xmlns="${NS_XDR}"><absoluteAnchor><pos x="9525" y="19050"/><ext cx="95250" cy="47625"/><graphicFrame><nvGraphicFramePr><cNvPr id="1" name="Chart 1"/><cNvGraphicFramePr/></nvGraphicFramePr><xfrm/><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="c"><c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId1"/></a:graphicData></a:graphic></graphicFrame><clientData/></absoluteAnchor></wsDr>`;
  const parts: Record<string, Uint8Array> = {
    'xl/workbook.xml': strToU8(`<workbook xmlns="${NS_X}" xmlns:r="${NS_R}"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/><sheet name="Graf" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(rels([['rId1', 'worksheet', 'worksheets/Sheet1.xml'], ['rId2', 'chartsheet', 'chartsheets/sheet1.xml']])),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet xmlns="${NS_X}" xmlns:r="${NS_R}"><sheetData/><drawing r:id="rId1"/></worksheet>`),
    // rels em minúsculas para a parte gravada "Sheet1.xml" (OPC não distingue)
    'xl/worksheets/_rels/sheet1.xml.rels': strToU8(rels([['rId1', 'drawing', '../drawings/drawing1.xml']])),
    'xl/drawings/drawing1.xml': strToU8(drawing1),
    'xl/drawings/_rels/drawing1.xml.rels': strToU8(rels([['rId1', 'chart', '../charts/chart1.xml'], ['rId2', 'chartEx', '../charts/chartEx1.xml']])),
    'xl/charts/chart1.xml': strToU8(chartXml),
    'xl/charts/chartEx1.xml': strToU8('<cx:chartSpace xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"/>'),
    'xl/chartsheets/sheet1.xml': strToU8(`<chartsheet xmlns="${NS_X}" xmlns:r="${NS_R}"><sheetViews><sheetView zoomScale="84" workbookViewId="0" zoomToFit="1"/></sheetViews><drawing r:id="rId1"/></chartsheet>`),
    'xl/chartsheets/_rels/sheet1.xml.rels': strToU8(rels([['rId1', 'drawing', '../drawings/drawing2.xml']])),
    'xl/drawings/drawing2.xml': strToU8(drawing2),
    'xl/drawings/_rels/drawing2.xml.rels': strToU8(rels([['rId1', 'chart', '../charts/chart1.xml']])),
  };
  return XlsxPackage.load(zipSync(parts));
}

describe('gráficos dos desenhos (nome, parte, chartex, aba de gráfico)', () => {
  const pkg = book();
  const wb = readWorkbook(pkg);
  const ws = readWorksheet(pkg, wb.sheets[0]!.target!);
  const cs = readWorksheet(pkg, wb.sheets[1]!.target!);

  it('gráficos com nome do objeto (= ChartObject.Name) e parte; chartex do mc:Choice; grupo fica com as formas', () => {
    expect(ws.charts?.map((c) => [c.name, c.kind ?? 'chart', c.part])).toEqual([['Um', 'chart', 'xl/charts/chart1.xml'], ['Cascata', 'chartex', 'xl/charts/chartEx1.xml']]);
    expect(ws.charts?.[0]?.anchor).toMatchObject({ kind: 'oneCell', ext: { cx: 952500, cy: 476250 } });
    expect(ws.drawings?.map((d) => d.el.name)).toEqual(['xdr:grpSp']);
  });

  it('aba de gráfico: âncora absoluta (namespace default), zoom da vista', () => {
    expect(cs.chartsheet).toEqual({ zoom: 84, zoomToFit: true });
    expect(cs.charts).toHaveLength(1);
    expect(cs.charts![0]!.anchor).toMatchObject({ kind: 'absolute', pos: { x: 9525, y: 19050 }, ext: { cx: 95250, cy: 47625 } });
  });

  it('gráfico com prefixos fora do padrão é canonizado', () => {
    const odd = chartXml.replace(/<(\/?)c:/g, '<$1ns0:').replace('xmlns:c=', 'xmlns:ns0=');
    const m = parseChart(odd);
    expect(m.type).toBe('bar-col');
    expect(m.series[0]?.values).toEqual([3]);
  });
});

describe('dados dos gráficos a partir das células (o Excel relê; o cache pode estar velho)', () => {
  const ser = (cat: string, val: string) => `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>Dados!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>velho</c:v></c:pt></c:strCache></c:strRef></c:tx>`
    + `<c:cat><c:strRef><c:f>${cat}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>x</c:v></c:pt></c:strCache></c:strRef></c:cat>`
    + `<c:val><c:numRef><c:f>${val}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="1"/><c:pt idx="0"><c:v>9</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>`;
  const chart = (s: string, vis = '1') => `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}"><c:chart><c:plotArea><c:barChart><c:barDir val="col"/>${s}</c:barChart></c:plotArea><c:plotVisOnly val="${vis}"/></c:chart></c:chartSpace>`;
  const book = (xml: string, app = '16.0300') => XlsxPackage.load(zipSync({
    'xl/workbook.xml': strToU8(`<workbook xmlns="${NS_X}" xmlns:r="${NS_R}"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="vals">Dados!$B$2:$B$5</definedName></definedNames></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(rels([['rId1', 'worksheet', 'worksheets/sheet1.xml']])),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet xmlns="${NS_X}" xmlns:r="${NS_R}"><sheetData>`
      + '<row r="1"><c r="B1" t="inlineStr"><is><t>Vendas</t></is></c></row>'
      + '<row r="2"><c r="A2" t="inlineStr"><is><t>jan</t></is></c><c r="B2"><v>1</v></c></row>'
      + '<row r="3" hidden="1"><c r="A3" t="inlineStr"><is><t>fev</t></is></c><c r="B3"><v>2</v></c></row>'
      + '<row r="4"><c r="A4" t="inlineStr"><is><t>mar</t></is></c><c r="B4"><v>3</v></c></row>'
      + '<row r="5"><c r="A5" t="inlineStr"><is><t>abr</t></is></c><c r="B5" t="inlineStr"><is><t>n/d</t></is></c></row>'
      + '</sheetData><drawing r:id="rId1"/></worksheet>'),
    'xl/worksheets/_rels/sheet1.xml.rels': strToU8(rels([['rId1', 'drawing', '../drawings/drawing1.xml']])),
    'xl/drawings/drawing1.xml': strToU8(`<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="952500" cy="476250"/>${frame('G', 'rId1')}<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`),
    'xl/drawings/_rels/drawing1.xml.rels': strToU8(rels([['rId1', 'chart', '../charts/chart1.xml']])),
    'xl/charts/chart1.xml': strToU8(xml),
    'docProps/app.xml': strToU8(`<Properties><Application>LibreOffice</Application><AppVersion>${app}</AppVersion></Properties>`),
  }));
  const model = (pkg: XlsxPackage) => chartModelFor(pkg, readWorksheet(pkg, 'xl/worksheets/sheet1.xml').charts![0]!);

  it('séries, categorias e nome vêm das células; oculta sai com plotVisOnly; texto em valores = 0', () => {
    const m = model(book(chart(ser('Dados!$A$2:$A$5', 'Dados!$B$2:$B$5'))));
    expect(m.series[0]).toMatchObject({ name: 'Vendas', values: [1, 3, 0] });
    expect(m.categories).toEqual(['jan', 'mar', 'abr']);
  });

  it('plotVisOnly=0 mantém as ocultas; nome definido resolve', () => {
    const m = model(book(chart(ser('Dados!$A$2:$A$5', 'vals'), '0')));
    expect(m.series[0]?.values).toEqual([1, 2, 3, 0]);
    expect(m.categories).toEqual(['jan', 'fev', 'mar', 'abr']);
  });

  it('referência a pasta externa fica com o cache', () => {
    const m = model(book(chart(ser('[1]Dados!$A$2:$A$5', '[1]Dados!$B$2:$B$5'))));
    expect(m.series[0]?.values).toEqual([9]);
  });

  it('formato do arquivo: só a versão do app conta (≤ 12 = 2007)', () => {
    expect(chartFileFormat(book(chart(''), '12.0000'))).toBe('mso2007');
    expect(chartFileFormat(book(chart(''), '3.0'))).toBe('mso2007');
    expect(chartFileFormat(book(chart(''), '15.0000'))).toBe('modern');
  });
});
