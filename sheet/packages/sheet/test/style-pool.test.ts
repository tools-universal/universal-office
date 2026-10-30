// Formatação das barras no styles.xml: o XfPool acrescenta fontes,
// preenchimentos, bordas e xfs COPIADOS dos de origem (o resto do arquivo fica
// byte a byte), reaproveita o que já existe e não duplica ao gravar de novo; e
// os códigos dos formatos de número/casas decimais.
import { describe, expect, it } from 'vitest';
import type { Styles } from '@universal-office/sheet-core';
import { XfPool } from '../src/sheet-calc.js';
import { adjustDecimals, numberFormatFor } from '../src/number-formats.js';

const XML = '<?xml version="1.0"?><styleSheet xmlns="x">'
  + '<fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><protection locked="0"/></xf></cellXfs>'
  + '</styleSheet>';

const styles = (): Styles => ({
  numFmts: new Map(), dxfs: [],
  fonts: [{ size: 11, name: 'Aptos Narrow', color: '#000000' }, { bold: true, size: 11, name: 'Arial' }],
  fills: [{ pattern: 'none' }, { pattern: 'gray125' }],
  borders: [{}],
  cellXfs: [{ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 }, { numFmtId: 0, fontId: 1, fillId: 0, borderId: 0, xfId: 0, applyFont: true }],
});

describe('XfPool.apply + patch', () => {
  it('fonte nova pelo molde (cor do tema e esquema ficam se não mudam); reaproveita a igual', () => {
    const st = styles();
    const pool = new XfPool(st);
    const a = pool.apply(0, { font: { bold: true, size: 14 } });
    expect(a).toBe(2);
    expect(st.fonts[2]).toMatchObject({ bold: true, size: 14, name: 'Aptos Narrow' });
    expect(pool.apply(0, { font: { bold: true, size: 14 } })).toBe(2);
    // a fonte 1 (Arial negrito 11, sem cor) é igual ao resultado: o xf novo aponta para ela
    const b = pool.apply(0, { font: { bold: true, name: 'Arial', color: null } });
    expect(st.cellXfs[b]!.fontId).toBe(1);
    const out = pool.patch(XML);
    expect(out).toContain('<fonts count="3">');
    expect(out).toContain('<font><b/><sz val="14"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font></fonts>');
    expect(out).toContain('<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>');
    expect(pool.patch(out)).toBe(out);
  });

  it('nome novo tira o <scheme>; cor nova em ARGB', () => {
    const st = styles();
    const pool = new XfPool(st);
    pool.apply(0, { font: { name: 'Calibri', color: '#ff0000' } });
    const out = pool.patch(XML);
    expect(out).toContain('<font><color rgb="FFFF0000"/><name val="Calibri"/><sz val="11"/><family val="2"/></font>');
  });

  it('preenchimento sólido, bordas e alinhamento no xf (a proteção do de origem fica)', () => {
    const st = styles();
    const pool = new XfPool(st);
    const x = pool.apply(1, {
      fill: '#FFFF00',
      border: { top: { style: 'thin', color: '#000000' }, bottom: { style: 'medium', color: '#FF0000' } },
      align: { horizontal: 'center', vertical: 'top', wrapText: true },
    });
    expect(st.cellXfs[x]).toMatchObject({ fillId: 2, borderId: 1, horizontal: 'center', vertical: 'top', wrapText: true });
    const out = pool.patch(XML);
    expect(out).toContain('<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill></fills>');
    expect(out).toContain('<border><left/><right/><top style="thin"><color rgb="FF000000"/></top><bottom style="medium"><color rgb="FFFF0000"/></bottom><diagonal/></border></borders>');
    expect(out).toContain('<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/><protection locked="0"/></xf>');
    // voltar ao padrão (sem preenchimento, sem bordas, Geral/Inferior): a própria origem
    expect(pool.apply(x, { fill: null, border: null, align: { horizontal: null, vertical: null, wrapText: false } })).toBe(1);
  });

  it('formato novo (id ≥ 164) e o mesmo código reaproveita o id', () => {
    const st = styles();
    const pool = new XfPool(st);
    const id = pool.formatId('0.000');
    expect(id).toBe(164);
    expect(pool.formatId('0.000')).toBe(164);
    expect(pool.formatId('0.00')).toBe(2);
    pool.apply(0, { numFmt: { id, code: '0.000' } });
    expect(pool.patch(XML)).toContain('<numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts><fonts');
  });

  it('styles.xml sem <fonts>/<fills>/<borders>: os blocos entram na ordem do schema', () => {
    const st: Styles = { numFmts: new Map(), dxfs: [], fonts: [], fills: [], borders: [], cellXfs: [{ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 }] };
    const pool = new XfPool(st);
    pool.apply(0, { font: { bold: true }, fill: '#00FF00', border: { left: { style: 'thin' } } });
    const out = pool.patch('<styleSheet xmlns="x"><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>');
    expect(out).toMatch(/^<styleSheet xmlns="x"><fonts count="2"><font><sz val="11"\/><name val="Calibri"\/><\/font><font>.*<\/font><\/fonts><fills count="3">.*<\/fills><borders count="2">.*<\/borders><cellXfs count="2">/);
  });
});

describe('formatos de número das barras', () => {
  it('itens da lista nos dois idiomas', () => {
    expect(numberFormatFor('percent', 'en-US')).toEqual({ id: 10, code: '0.00%' });
    expect(numberFormatFor('shortDate', 'pt-BR')).toEqual({ id: 14, code: 'dd/mm/yyyy' });
    expect(numberFormatFor('currency', 'pt-BR').code).toBe('"R$"\\ #,##0.00;[Red]\\-"R$"\\ #,##0.00');
    expect(numberFormatFor('currency', 'en-US').code).toBe('"$"#,##0.00_);[Red]\\("$"#,##0.00\\)');
    expect(numberFormatFor('time', 'en-US')).toEqual({ id: 19, code: 'h:mm:ss AM/PM' });
  });
  it('aumentar/diminuir casas decimais em todas as seções', () => {
    expect(adjustDecimals('General', 1)).toBe('0.0');
    expect(adjustDecimals('0', 1)).toBe('0.0');
    expect(adjustDecimals('0.00', 1)).toBe('0.000');
    expect(adjustDecimals('0.00', -1)).toBe('0.0');
    expect(adjustDecimals('0.0', -1)).toBe('0');
    expect(adjustDecimals('0%', 1)).toBe('0.0%');
    expect(adjustDecimals('#,##0', 1)).toBe('#,##0.0');
    expect(adjustDecimals('0.00E+00', -1)).toBe('0.0E+00');
    expect(adjustDecimals('"R$"\\ #,##0.00;[Red]\\-"R$"\\ #,##0.00', 1)).toBe('"R$"\\ #,##0.000;[Red]\\-"R$"\\ #,##0.000');
    expect(adjustDecimals('@', 1)).toBe('@');
    expect(adjustDecimals('# ?/?', 1)).toBe('# ?/?');
  });
});
