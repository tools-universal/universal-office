import { describe, expect, it } from 'vitest';
import { parseXml, type DrawingAnchor } from '@universal/sheet-core';
import { PptxPackage, readDrawingElements, readTheme } from '@universal/slides-core';
import { anchorRect, placeElement, swapsBox, EMU_PER_PX } from '../src/drawings.js';

// grade de colunas de 64 px e linhas de 20 px; a coluna 3 (0-based) oculta
const colW = [64, 64, 64, 0, 64, 64, 64, 64];
const edgeX = (i: number): number => colW.slice(0, i).reduce((s, w) => s + w, 0) + Math.max(0, i - colW.length) * 64;
const edgeY = (i: number): number => i * 20;
const at = (col: number, colOff: number, row: number, rowOff: number) => ({ col, colOff, row, rowOff });

describe('anchorRect (âncora → px, medido no Excel com syn-d-anchor)', () => {
  it('twoCellAnchor: bordas das células + offsets EMU', () => {
    const a: DrawingAnchor = { from: at(1, 10 * EMU_PER_PX, 2, 5 * EMU_PER_PX), to: at(2, 20 * EMU_PER_PX, 4, 0) };
    expect(anchorRect(a, edgeX, edgeY, 1)).toEqual({ x: 74, y: 45, w: 74, h: 35 });
    // zoom escala tudo
    expect(anchorRect(a, (i) => edgeX(i) * 2, (i) => edgeY(i) * 2, 2)).toEqual({ x: 148, y: 90, w: 148, h: 70 });
  });
  it('offset maior que a célula para na borda dela; em coluna oculta vale 0', () => {
    const a: DrawingAnchor = { from: at(1, 3 * 609600, 0, 0), to: at(1, 3 * 609600 + 200000, 1, 0) };
    expect(anchorRect(a, edgeX, edgeY, 1)).toMatchObject({ x: 128, w: 0 });
    const hid: DrawingAnchor = { from: at(3, 300000, 0, 0), to: at(5, 0, 1, 0) };
    expect(anchorRect(hid, edgeX, edgeY, 1).x).toBe(192);
  });
  it('oneCellAnchor (from + ext) e absoluteAnchor (pos + ext)', () => {
    const one: DrawingAnchor = { kind: 'oneCell', from: at(2, 0, 1, 0), to: at(2, 0, 1, 0), ext: { cx: 952500, cy: 190500 } };
    expect(anchorRect(one, edgeX, edgeY, 1)).toEqual({ x: 128, y: 20, w: 100, h: 20 });
    const abs: DrawingAnchor = { kind: 'absolute', from: at(0, 0, 0, 0), to: at(0, 0, 0, 0), pos: { x: 95250, y: 190500 }, ext: { cx: 9525, cy: 19050 } };
    expect(anchorRect(abs, edgeX, edgeY, 1)).toEqual({ x: 10, y: 20, w: 1, h: 2 });
  });
});

describe('swapsBox (giro entre 45° e 135°/225°–315°: âncora = caixa girada)', () => {
  it('limites medidos no Excel: 45° troca, 44° não', () => {
    expect(swapsBox(45 * 60000)).toBe(true);
    expect(swapsBox(44 * 60000)).toBe(false);
    expect(swapsBox(90 * 60000)).toBe(true);
    expect(swapsBox(135 * 60000)).toBe(false);
    expect(swapsBox(240 * 60000)).toBe(true);
    expect(swapsBox(-90 * 60000)).toBe(true);
  });
});

describe('placeElement + leitor do slides-core', () => {
  const pkg = PptxPackage.fromParts(new Map());
  const theme = readTheme(pkg, 'xl/theme/theme1.xml');
  const NS = 'xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
  const sp = (id: number, x: number, y: number, cx: number, cy: number, hidden = false): string =>
    `<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="${id}" name="s${id}"${hidden ? ' hidden="1"' : ''}/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:sp>`;

  it('forma simples: a âncora manda (o xfrm gravado diverge)', () => {
    const el = parseXml(`<r ${NS}>${sp(2, 0, 0, 4000000, 300000)}</r>`).children[0] as never;
    const [shapes] = readDrawingElements(pkg, 'xl/drawings/drawing1.xml', [placeElement(el, { x: 100, y: 200, w: 300, h: 400 })], theme);
    expect(shapes![0]!.xfrm).toMatchObject({ x: 100, y: 200, cx: 300, cy: 400 });
  });

  it('grupo sem chOff/chExt: o espaço gravado vai para a âncora; ocultas ficam de fora', () => {
    const grp = `<xdr:grpSp ${NS}><xdr:nvGrpSpPr><xdr:cNvPr id="1" name="G"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="1000" y="1000"/><a:ext cx="2000" cy="1000"/></a:xfrm></xdr:grpSpPr>${sp(2, 1000, 1000, 1000, 1000)}${sp(3, 2000, 1000, 1000, 1000)}${sp(4, 1000, 1000, 10, 10, true)}</xdr:grpSp>`;
    const [shapes] = readDrawingElements(pkg, 'xl/drawings/drawing1.xml', [placeElement(parseXml(grp) as never, { x: 0, y: 0, w: 4000, h: 1000 })], theme);
    expect(shapes).toHaveLength(2);
    expect(shapes![0]!.xfrm).toMatchObject({ x: 0, y: 0, cx: 2000, cy: 1000 });
    expect(shapes![1]!.xfrm).toMatchObject({ x: 2000, y: 0, cx: 2000, cy: 1000 });
  });
});
