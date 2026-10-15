import { describe, expect, it } from 'vitest';
import { defaultColorContext, type Styles, type Worksheet } from '@universal/sheet-core';
import { winningEdge, edgeExtent, BORDER_RANK } from '../src/borders.js';
import { defaultXfMaps, xfIndexAt } from '../src/cell-format.js';
import { resolveTableStyle, tableCellFormats, applyTableLayer, type TableCellFormat } from '../src/table-styles.js';
import { BUILTIN_TABLE_STYLES } from '../src/table-styles-data.js';

const emptyStyles = (): Styles => ({ numFmts: new Map(), cellXfs: [], fonts: [], fills: [], borders: [], dxfs: [] });

describe('bordas: conflito entre vizinhas (medido no Excel, t-prec)', () => {
  it('vence a de maior peso; empate → a de baixo/da direita', () => {
    const thin = { style: 'thin', color: '#f00' }, thick = { style: 'thick', color: '#00f' };
    expect(winningEdge(thin, thick)).toBe(thick);
    expect(winningEdge(thick, thin)).toBe(thick);
    const thin2 = { style: 'thin', color: '#00f' };
    expect(winningEdge(thin, thin2)).toBe(thin2);
    expect(winningEdge(undefined, undefined)).toBeUndefined();
  });
  it('ordem: hair < dashDotDot < dashDot < dotted < dashed < thin < … < medium < thick < double', () => {
    const order = ['hair', 'dashDotDot', 'dashDot', 'dotted', 'dashed', 'thin', 'mediumDashDotDot', 'slantDashDot', 'mediumDashDot', 'mediumDashed', 'medium', 'thick', 'double'];
    for (let i = 1; i < order.length; i++) expect(BORDER_RANK[order[i]!]!).toBeGreaterThan(BORDER_RANK[order[i - 1]!]!);
  });
  it('largura em torno da fronteira', () => {
    expect(edgeExtent('thin')).toEqual([0, 0]);
    expect(edgeExtent('medium')).toEqual([1, 0]);
    expect(edgeExtent('thick')).toEqual([1, 1]);
    expect(edgeExtent('double')).toEqual([1, 1]);
  });
});

describe('estilo das células ausentes (linha customFormat > coluna)', () => {
  const ws: Worksheet = {
    rows: [
      { r: 3, style: 2, customFormat: true, cells: [] },
      { r: 5, style: 2, cells: [] },
      { r: 6, customFormat: true, cells: [] },
    ],
    cols: [{ min: 2, max: 2, style: 1 }],
  };
  const maps = defaultXfMaps(ws);
  it('linha com customFormat vence; sem customFormat é ignorada; sem s = 0', () => {
    expect(xfIndexAt(maps, undefined, 2, 3)).toBe(2);
    expect(xfIndexAt(maps, undefined, 2, 5)).toBe(1);
    expect(xfIndexAt(maps, undefined, 2, 6)).toBe(0);
    expect(xfIndexAt(maps, undefined, 4, 7)).toBe(0);
  });
  it('célula presente sem s usa o estilo 0', () => {
    expect(xfIndexAt(maps, { ref: 'B7' }, 2, 7)).toBe(0);
  });
});

describe('estilos de tabela', () => {
  const cx = defaultColorContext();
  it('tem os 60 de tabela e os 84 de dinâmica', () => {
    const names = Object.keys(BUILTIN_TABLE_STYLES);
    expect(names.filter((n) => n.startsWith('TableStyle'))).toHaveLength(60);
    expect(names.filter((n) => n.startsWith('PivotStyle'))).toHaveLength(84);
  });
  it('Medium2: cabeçalho accent1 com fonte branca em negrito, faixa accent1 +80%, total com dupla em cima', () => {
    const spec = resolveTableStyle('TableStyleMedium2', emptyStyles(), cx)!;
    const out = new Map<string, TableCellFormat>();
    tableCellFormats({ c1: 1, r1: 1, c2: 3, r2: 5, headerRows: 1, totalsRows: 1, rowStripes: true, colStripes: false, firstColumn: false, lastColumn: false }, spec, out);
    const h = out.get('2,1')!;
    expect(h.fill?.fgColor?.toUpperCase()).toBe('#156082');
    expect(h.fontColor?.toUpperCase()).toBe('#FFFFFF');
    expect(h.bold).toBe(true);
    expect(out.get('2,2')!.fill?.fgColor?.toUpperCase()).toBe('#C0E6F5'); // 1ª linha de dados = faixa 1
    expect(out.get('2,3')!.fill).toBeUndefined();
    expect(out.get('2,5')!.border?.top?.style).toBe('double');
    // contorno do wholeTable só nas bordas externas; horizontal interna entre linhas
    expect(out.get('1,3')!.border?.left?.style).toBe('thin');
    expect(out.get('2,3')!.border?.left).toBeUndefined();
    expect(out.get('2,3')!.border?.top?.style).toBe('thin');
  });
  it('estilo customizado: faixas com tamanho', () => {
    const styles = emptyStyles();
    styles.dxfs = [{ fill: { pattern: 'solid', fgColor: '#ff0000' } }, { fill: { pattern: 'solid', fgColor: '#00ff00' } }];
    styles.tableStyles = [{ name: 'X', pivot: false, table: true, elements: [{ type: 'firstRowStripe', dxfId: 0, size: 2 }, { type: 'secondRowStripe', dxfId: 1 }] }];
    const spec = resolveTableStyle('X', styles, cx)!;
    const out = new Map<string, TableCellFormat>();
    tableCellFormats({ c1: 1, r1: 1, c2: 1, r2: 7, headerRows: 1, totalsRows: 0, rowStripes: true, colStripes: false, firstColumn: false, lastColumn: false }, spec, out);
    const colors = [2, 3, 4, 5, 6, 7].map((r) => out.get(`1,${r}`)?.fill?.fgColor);
    expect(colors).toEqual(['#ff0000', '#ff0000', '#00ff00', '#ff0000', '#ff0000', '#00ff00']);
  });
  it('formatação direta vence; cor igual à da fonte Normal cede à da tabela', () => {
    const tf: TableCellFormat = { fill: { pattern: 'solid', fgColor: '#123456' }, fontColor: '#ffffff', bold: true };
    const black = applyTableLayer({ font: { color: '#000000' }, fill: undefined, border: undefined }, tf, '#000000');
    expect(black.font?.color).toBe('#ffffff');
    expect(black.font?.bold).toBe(true);
    expect(black.fill?.fgColor).toBe('#123456');
    const red = applyTableLayer({ font: { color: '#ff0000' }, fill: { pattern: 'solid', fgColor: '#ffff00' }, border: undefined }, tf, '#000000');
    expect(red.font?.color).toBe('#ff0000');
    expect(red.fill?.fgColor).toBe('#ffff00');
  });
});
