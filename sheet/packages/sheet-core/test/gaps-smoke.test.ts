import { describe, expect, it } from 'vitest';
import {
  XlsxPackage,
  readWorkbook,
  readSharedStrings,
  readWorksheet,
  readStyles,
  readTheme,
  colorContext,
  applyTint,
} from '../src/index.js';
// fixture sintética gerada em memória (mesmo código que grava samples/gaps-smoke.xlsx)
// @ts-expect-error — script .mjs sem declaração de tipos
import { buildGapsSmoke } from '../../../tools/gen-gaps-smoke.mjs';

const bytes: Uint8Array = buildGapsSmoke();

describe('gaps-smoke.xlsx — fixture sintética da spec 02', () => {
  const pkg = XlsxPackage.load(bytes);
  const cx = colorContext(pkg);
  const wb = readWorkbook(pkg);
  const ws = readWorksheet(pkg, 'xl/worksheets/sheet1.xml', cx);

  it('workbook com 2 abas (Dados, Alvo)', () => {
    expect(wb.sheets.map((s) => s.name)).toEqual(['Dados', 'Alvo']);
  });

  it('A: pane congelado xSplit=1 ySplit=2 state=frozen', () => {
    expect(ws.pane).toBeDefined();
    expect(ws.pane!.xSplit).toBe(1);
    expect(ws.pane!.ySplit).toBe(2);
    expect(ws.pane!.state).toBe('frozen');
    expect(ws.pane!.topLeftCell).toBe('B3');
  });

  it('B: rich text runs com props por run (b/sz/color/rFont/u/strike)', () => {
    const shared = readSharedStrings(pkg, cx);
    const rich = shared[1]!;
    expect(rich.text).toBe('Negrito misto fim');
    expect(rich.runs).toHaveLength(3);
    const [r0, r1, r2] = rich.runs!;
    expect(r0!.props).toMatchObject({ bold: true, size: 14, color: '#FF0000', font: 'Arial' });
    expect(r1!.props).toMatchObject({ size: 11, font: 'Calibri' });
    expect(r1!.props!.bold).toBeUndefined(); // herda da célula
    // run 3: sublinhado+tachado e cor theme=5 (accent2 do TEMA DO ARQUIVO)
    expect(r2!.props).toMatchObject({ underline: true, strike: true, color: '#2E8B57' });
  });

  it('C: readTheme lê o clrScheme real (accent1 ≠ paleta Office) e aplica tint', () => {
    const theme = readTheme(pkg);
    expect(theme.colors[4]).toBe('#FF6600'); // accent1 do arquivo
    expect(theme.colors[0]).toBe('#FEFEFE'); // lt1 via sysClr lastClr
    const styles = readStyles(pkg, cx);
    // fill sólido com <fgColor theme="4" tint="0.599…"> resolve accent1 + tint
    const fill2 = styles.fills[2]!;
    expect(fill2.pattern).toBe('solid');
    expect(fill2.fgColor).toBe(applyTint('#FF6600', 0.59999389629810485));
    // fonte 1: cor theme 4 com tint 0.4
    expect(styles.fonts[1]!.color).toBe(applyTint('#FF6600', 0.39997558519241921));
  });

  it('D: pattern fill (darkTrellis fg/bg) e gradiente 2 stops', () => {
    const styles = readStyles(pkg, cx);
    const trellis = styles.fills[3]!;
    expect(trellis.pattern).toBe('darkTrellis');
    expect(trellis.fgColor).toBe('#FF0000');
    expect(trellis.bgColor).toBe('#FFFF00');
    const grad = styles.fills[4]!;
    expect(grad.gradient).toBeDefined();
    expect(grad.gradient!.degree).toBe(90);
    expect(grad.gradient!.stops).toEqual([
      { position: 0, color: '#FFFFFF' },
      { position: 1, color: '#4472C4' },
    ]);
    // gray125 sem cores declaradas: só o nome do padrão (render usa defaults)
    expect(styles.fills[1]!.pattern).toBe('gray125');
  });

  it('E: hyperlinks externo (rels) e interno (location)', () => {
    expect(ws.hyperlinks).toHaveLength(2);
    const [ext, int] = ws.hyperlinks!;
    expect(ext).toMatchObject({ ref: 'A4', target: 'https://example.com/', tooltip: 'Site de exemplo' });
    expect(ext!.location).toBeUndefined();
    expect(int).toMatchObject({ ref: 'A5', location: 'Alvo!B2', display: 'Ir para Alvo' });
    expect(int!.target).toBeUndefined();
  });

  it('F: sheetFormatPr com defaults do grid', () => {
    expect(ws.sheetFormatPr).toEqual({
      baseColWidth: 10,
      defaultColWidth: 12.5,
      defaultRowHeight: 20,
      customHeight: true,
    });
    // sheet2 só com defaultRowHeight
    const ws2 = readWorksheet(pkg, 'xl/worksheets/sheet2.xml', cx);
    expect(ws2.sheetFormatPr).toEqual({ defaultRowHeight: 15 });
  });

  it('G: cor indexada legada resolvida (indexed=17 → #008000)', () => {
    const styles = readStyles(pkg, cx);
    expect(styles.fonts[2]!.color).toBe('#008000');
  });

  it('round-trip lossless: load→save→load preserva as partes', () => {
    const saved = XlsxPackage.load(bytes).save();
    const reloaded = XlsxPackage.load(saved);
    expect(reloaded.partNames()).toEqual(pkg.partNames());
    for (const name of pkg.partNames()) {
      expect(reloaded.getPart(name)).toEqual(pkg.getPart(name));
    }
  });
});
