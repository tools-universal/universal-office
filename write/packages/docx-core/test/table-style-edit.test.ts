// Novo/Modificar Estilo de Tabela: o w:style gerado/patcheado por condição.
import { describe, expect, it } from 'vitest';
import { newTableStyleXml, patchTableStyleXml, retitleTableStyleXml, readStyleSheet } from '../src/index.js';

const wrap = (style: string): string => `<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${style}</w:styles>`;

describe('estilo de tabela editado por condição', () => {
  it('novo: tabela inteira no topo, cabeçalho num tblStylePr; o motor lê', () => {
    let x = newTableStyleXml({ id: 'Meuestilo', name: 'Meu estilo', basedOn: 'Tabelanormal' });
    x = patchTableStyleXml(x, 'wholeTable', {
      szHalfPt: 20, borders: { top: { val: 'single', sz: 4, color: '000000' }, insideH: { val: 'single', sz: 4, color: '000000' } }, fill: 'F2F2F2',
    });
    x = patchTableStyleXml(x, 'firstRow', { bold: true, color: 'FFFFFF', fill: '1F3864', borders: { bottom: { val: 'double', sz: 6, color: '000000' } } });
    x = patchTableStyleXml(x, 'band1Horz', { fill: 'D9E2F3' });
    expect(x).toBe('<w:style w:type="table" w:customStyle="1" w:styleId="Meuestilo"><w:name w:val="Meu estilo"/><w:basedOn w:val="Tabelanormal"/><w:uiPriority w:val="99"/>'
      + '<w:rPr><w:sz w:val="20"/></w:rPr>'
      + '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>'
      + '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr>'
      + '<w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:tcBorders><w:bottom w:val="double" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/></w:tcPr></w:tblStylePr>'
      + '<w:tblStylePr w:type="band1Horz"><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/></w:tcPr></w:tblStylePr></w:style>');
    const st = readStyleSheet(wrap(x)).styles['Meuestilo']!;
    expect(st.tblStylePr?.firstRow?.rPr?.b).toBe(true);
    expect(st.tblStylePr?.firstRow?.tcPr?.shd?.fill).toBe('1F3864');
    expect(st.tcPr?.shd?.fill).toBe('F2F2F2');
  });
  it('modificar: só o que mudou; ordem dos tblStylePr como o Word', () => {
    const raw = '<w:style w:type="table" w:styleId="X"><w:name w:val="X"/><w:tblPr><w:tblStyleRowBandSize w:val="1"/></w:tblPr>'
      + '<w:tblStylePr w:type="lastRow"><w:rPr><w:b/></w:rPr></w:tblStylePr></w:style>';
    let x = patchTableStyleXml(raw, 'firstRow', { italic: true });
    x = patchTableStyleXml(x, 'lastRow', { bold: null, fill: 'FFFF00' });
    x = retitleTableStyleXml(x, { name: 'Y' });
    expect(x).toBe('<w:style w:type="table" w:styleId="X"><w:name w:val="Y"/><w:tblPr><w:tblStyleRowBandSize w:val="1"/></w:tblPr>'
      + '<w:tblStylePr w:type="firstRow"><w:rPr><w:i/></w:rPr></w:tblStylePr>'
      + '<w:tblStylePr w:type="lastRow"><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/></w:tcPr></w:tblStylePr></w:style>');
  });
});
