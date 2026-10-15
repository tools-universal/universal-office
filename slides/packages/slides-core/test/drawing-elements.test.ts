import { describe, expect, it } from 'vitest';
import { PptxPackage, parseXml, readDrawingElements, readTheme, layoutTextBody } from '../src/index.js';

// desenhos de planilha (xdr:) lidos pelo MESMO leitor de formas do slide
const NS = 'xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('readDrawingElements (xdr → p:)', () => {
  const parts = new Map<string, Uint8Array>([
    ['xl/drawings/_rels/drawing1.xml.rels', enc('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/Image1.PNG"/></Relationships>')],
    ['xl/media/image1.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  ]);
  const pkg = PptxPackage.fromParts(parts);
  const theme = readTheme(pkg, 'xl/theme/theme1.xml');

  it('forma com texto, imagem (rels com maiúsculas divergentes) e transbordo do bodyPr', () => {
    const sp = parseXml(`<xdr:sp ${NS}><xdr:nvSpPr><xdr:cNvPr id="2" name="T"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="10" y="20"/><a:ext cx="300" cy="400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr><xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:p><a:r><a:t>Oi</a:t></a:r></a:p></xdr:txBody></xdr:sp>`);
    const pic = parseXml(`<xdr:pic ${NS}><xdr:nvPicPr><xdr:cNvPr id="3" name="P"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:srcRect l="10000"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5" cy="5"/></a:xfrm></xdr:spPr></xdr:pic>`);
    const [a, b] = readDrawingElements(pkg, 'xl/drawings/drawing1.xml', [sp, pic], theme);
    expect(a![0]!.isTextBox).toBe(true);
    expect(a![0]!.xfrm).toMatchObject({ x: 10, y: 20, cx: 300, cy: 400 });
    expect(a![0]!.txBody?.vertOverflow).toBe('clip');
    expect(a![0]!.txBody?.horzOverflow).toBe('clip');
    expect(a![0]!.txBody?.paragraphs[0]!.runs[0]!.text).toBe('Oi');
    expect(b![0]!.image?.bytes.length).toBe(4);
    expect(b![0]!.srcRect?.l).toBeCloseTo(0.1);
  });

  it('forma oculta (cNvPr hidden) não vira forma', () => {
    const sp = parseXml(`<xdr:sp ${NS}><xdr:nvSpPr><xdr:cNvPr id="2" name="H" hidden="1"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp>`);
    expect(readDrawingElements(pkg, 'xl/drawings/drawing1.xml', [sp], theme)[0]).toEqual([]);
  });
});

describe('layoutTextBody: topo de cada linha', () => {
  it('linhas empilhadas a partir do recuo superior', () => {
    const measure = (t: string, f: { sizePt: number }): number => t.length * f.sizePt * 6350;
    const lay = layoutTextBody({ paragraphs: [{ runs: [{ text: 'a', sz: 10 }] }, { runs: [{ text: 'b', sz: 10 }] }] }, 914400, 914400, measure as never, { defaultSzPt: 10 });
    expect(lay.lines[0]!.top).toBe(45720);
    expect(lay.lines[1]!.top).toBeCloseTo(45720 + lay.lines[0]!.height);
  });
});
