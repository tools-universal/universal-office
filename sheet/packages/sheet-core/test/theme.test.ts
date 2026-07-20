import { describe, expect, it } from 'vitest';
import {
  XlsxPackage,
  readTheme,
  readIndexedColors,
  resolveColorEl,
  defaultColorContext,
  applyTint,
  DEFAULT_THEME_COLORS,
  INDEXED_COLORS_DEFAULT,
  parseXml,
} from '../src/index.js';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

describe('applyTint (fórmula HSL validada no excel-lab)', () => {
  // FINDINGS: branco −25% → #BFBFBF, −15% → #D9D9D9, −5% → #F2F2F2
  it('escurece branco por −25%/−15%/−5% como o oráculo', () => {
    expect(applyTint('#FFFFFF', -0.25).toUpperCase()).toBe('#BFBFBF');
    expect(applyTint('#FFFFFF', -0.15).toUpperCase()).toBe('#D9D9D9');
    expect(applyTint('#FFFFFF', -0.05).toUpperCase()).toBe('#F2F2F2');
  });
  it('tint 0 é identidade; positivo clareia; negativo escurece', () => {
    expect(applyTint('#4472C4', 0)).toBe('#4472C4');
    const lighter = applyTint('#4472C4', 0.6);
    const darker = applyTint('#4472C4', -0.5);
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(lum(lighter)).toBeGreaterThan(lum('#4472C4'));
    expect(lum(darker)).toBeLessThan(lum('#4472C4'));
  });
});

describe('readTheme', () => {
  it('sem theme1.xml → paleta Office padrão', () => {
    const pkg = XlsxPackage.empty();
    const theme = readTheme(pkg);
    expect(theme.colors).toEqual([...DEFAULT_THEME_COLORS]);
    expect(theme.byName['accent1']).toBe('#4472C4');
  });

  it('lê clrScheme com a troca lt1/dk1 do índice theme="N"', () => {
    const pkg = XlsxPackage.empty();
    pkg.setPartText('xl/theme/theme1.xml', `${XML}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T">
<a:themeElements><a:clrScheme name="T">
<a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FEFEFE"/></a:lt1>
<a:dk2><a:srgbClr val="1F3864"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="FF6600"/></a:accent1>
<a:accent2><a:srgbClr val="2E8B57"/></a:accent2>
<a:accent3><a:srgbClr val="A1A2A3"/></a:accent3>
<a:accent4><a:srgbClr val="B1B2B3"/></a:accent4>
<a:accent5><a:srgbClr val="C1C2C3"/></a:accent5>
<a:accent6><a:srgbClr val="D1D2D3"/></a:accent6>
<a:hlink><a:srgbClr val="0000EE"/></a:hlink>
<a:folHlink><a:srgbClr val="551A8B"/></a:folHlink>
</a:clrScheme></a:themeElements></a:theme>`);
    const theme = readTheme(pkg);
    // índice 0 = lt1 (background1), 1 = dk1 (text1) — ordem TROCADA do XML
    expect(theme.colors[0]).toBe('#FEFEFE');
    expect(theme.colors[1]).toBe('#111111');
    expect(theme.colors[2]).toBe('#EEECE1'); // lt2
    expect(theme.colors[3]).toBe('#1F3864'); // dk2
    expect(theme.colors[4]).toBe('#FF6600'); // accent1
    expect(theme.colors[5]).toBe('#2E8B57'); // accent2
    expect(theme.colors[10]).toBe('#0000EE'); // hlink
    expect(theme.byName['folHlink']).toBe('#551A8B');
  });

  it('acha o theme via rels quando fora do caminho canônico', () => {
    const pkg = XlsxPackage.empty();
    pkg.setPartText('xl/_rels/workbook.xml.rels', `${XML}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/tema.xml"/>
</Relationships>`);
    pkg.setPartText('xl/theme/tema.xml', `${XML}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T">
<a:themeElements><a:clrScheme name="T">
<a:dk1><a:srgbClr val="222222"/></a:dk1>
<a:lt1><a:srgbClr val="FDFDFD"/></a:lt1>
</a:clrScheme></a:themeElements></a:theme>`);
    const theme = readTheme(pkg);
    expect(theme.colors[1]).toBe('#222222');
    // slots ausentes mantêm o fallback Office
    expect(theme.colors[4]).toBe('#4472C4');
  });
});

describe('cores indexadas legadas', () => {
  it('tabela padrão completa (66 entradas: 0..65)', () => {
    expect(INDEXED_COLORS_DEFAULT.length).toBe(66);
    expect(INDEXED_COLORS_DEFAULT[2]).toBe('#FF0000');
    expect(INDEXED_COLORS_DEFAULT[17]).toBe('#008000');
    expect(INDEXED_COLORS_DEFAULT[22]).toBe('#C0C0C0');
    expect(INDEXED_COLORS_DEFAULT[43]).toBe('#FFFF99');
    expect(INDEXED_COLORS_DEFAULT[64]).toBe('#000000'); // system foreground
    expect(INDEXED_COLORS_DEFAULT[65]).toBe('#FFFFFF'); // system background
  });

  it('<indexedColors> em styles.xml sobrescreve a tabela', () => {
    const pkg = XlsxPackage.empty();
    pkg.setPartText('xl/styles.xml', `${XML}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<colors><indexedColors>
<rgbColor rgb="00ABCDEF"/>
<rgbColor rgb="00123456"/>
</indexedColors></colors>
</styleSheet>`);
    const idx = readIndexedColors(pkg);
    expect(idx[0]).toBe('#ABCDEF');
    expect(idx[1]).toBe('#123456');
    // além do override, mantém o restante da tabela padrão
    expect(idx[17]).toBe('#008000');
  });
});

describe('resolveColorEl', () => {
  const el = (xml: string) => parseXml(xml);
  it('rgb direto (descarta canal alfa ARGB)', () => {
    expect(resolveColorEl(el('<color rgb="FF00FF00"/>'))).toBe('#00FF00');
  });
  it('theme + tint contra o contexto', () => {
    const cx = defaultColorContext();
    expect(resolveColorEl(el('<color theme="4"/>'), cx)).toBe('#4472C4');
    expect(resolveColorEl(el('<color theme="4" tint="0.6"/>'), cx))
      .toBe(applyTint('#4472C4', 0.6));
  });
  it('indexed contra a tabela legada', () => {
    expect(resolveColorEl(el('<color indexed="17"/>'))).toBe('#008000');
  });
  it('auto → preto; sem atributos → undefined', () => {
    expect(resolveColorEl(el('<color auto="1"/>'))).toBe('#000000');
    expect(resolveColorEl(el('<color/>'))).toBeUndefined();
  });
});
