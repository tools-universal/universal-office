import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { xlsxToMarkdown, xlsxToHtml } from '../src/index.js';
import { makeXlsx, sheetXml, inlineStr, STYLES_XML } from './helpers.js';

const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../samples/showcase.xlsx'));

/** Planilha pequena: header, números (maioria numérica na coluna B), merge A4:B4. */
function tabela(): Uint8Array {
  return makeXlsx([{
    name: 'Precos',
    xml: sheetXml(
      '<row r="1">' + inlineStr('A1', 'Item') + inlineStr('B1', 'Preco') + '</row>' +
      '<row r="2">' + inlineStr('A2', 'Cafe | torrado') + '<c r="B2" s="1"><v>19.9</v></c></row>' +
      '<row r="3">' + inlineStr('A3', 'Acucar') + '<c r="B3" s="1"><v>5.5</v></c></row>' +
      '<row r="4">' + inlineStr('A4', 'Total mesclado') + '</row>',
      '<mergeCells count="1"><mergeCell ref="A4:B4"/></mergeCells>',
    ),
  }], STYLES_XML);
}

describe('xlsxToMarkdown', () => {
  it('snapshot: ## por sheet, GFM, alinhamento numérico, merge e escaping de |', () => {
    expect(xlsxToMarkdown(tabela())).toBe([
      '## Precos',
      '',
      '| Item | Preco |',
      '| --- | ---: |',
      '| Cafe \\| torrado | 19,90 |',
      '| Acucar | 5,50 |',
      '| Total mesclado |  |',
      '',
    ].join('\n'));
  });

  it('quebra de linha vira <br>', () => {
    const bytes = makeXlsx([{
      name: 'Quebra',
      xml: sheetXml(
        '<row r="1">' + inlineStr('A1', 'h') + '</row>' +
        '<row r="2">' + inlineStr('A2', 'duas\nlinhas') + '</row>',
      ),
    }]);
    expect(xlsxToMarkdown(bytes)).toContain('| duas<br>linhas |');
  });

  it('default exporta TODAS as sheets visíveis (## por sheet)', () => {
    const md = xlsxToMarkdown(showcase());
    expect(md).toContain('## Inicio');
    expect(md).toContain('## Datas');
    expect(md).toContain('## Ocultos');
    // seleção por nome limita a uma
    const one = xlsxToMarkdown(showcase(), { sheet: 'Datas' });
    expect(one).toContain('## Datas');
    expect(one).not.toContain('## Inicio');
  });

  it('merge no showcase: valor no topo-esquerdo, absorvidas vazias', () => {
    const md = xlsxToMarkdown(showcase(), { sheet: 'Mesclar' });
    expect(md).toContain('| Titulo mesclado A1:D1 |  |  |  |');
  });
});

describe('xlsxToHtml', () => {
  it('snapshot: estilos inline, colspan de merge, largura MDW e alinhamento', () => {
    const bytes = makeXlsx([{
      name: 'Estilos',
      xml: sheetXml(
        '<row r="1" ht="24" customHeight="1">' + inlineStr('A1', 'Cabecalho', 3) + '</row>' +
        '<row r="2">' + inlineStr('A2', 'a < b') + '<c r="B2" s="1"><v>1234.5</v></c></row>',
        '<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>',
        '<cols><col min="1" max="1" width="20" customWidth="1"/></cols>',
      ),
    }], STYLES_XML);
    expect(xlsxToHtml(bytes)).toBe([
      '<table style="border-collapse:collapse;font-family:\'Aptos Narrow\',Calibri,sans-serif;font-size:11pt">',
      '<colgroup><col style="width:140px"><col style="width:64px"></colgroup>',
      '<tbody>',
      '<tr style="height:24pt"><td colspan="2" style="background-color:#FFFF00;border-top:1px solid #000000;' +
        'border-right:1px solid #000000;border-bottom:1px solid #000000;border-left:1px solid #000000;' +
        'font-weight:700;font-size:11pt;font-family:\'Aptos Narrow\';text-align:center;vertical-align:middle">Cabecalho</td></tr>',
      '<tr style="height:15pt"><td>a &lt; b</td><td style="font-size:11pt;font-family:\'Aptos Narrow\';text-align:right">1.234,50</td></tr>',
      '</tbody>',
      '</table>',
    ].join('\n'));
  });

  it('fullDocument embrulha em HTML5 com <meta charset>', () => {
    const html = xlsxToHtml(tabela(), { fullDocument: true });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('</html>');
  });

  it('múltiplas sheets ganham <h2>; rowspan em merge vertical', () => {
    const html = xlsxToHtml(showcase());
    expect(html).toContain('<h2>Inicio</h2>');
    expect(html).toContain('<h2>Mesclar</h2>');
    const mesclar = xlsxToHtml(showcase(), { sheet: 'Mesclar' });
    expect(mesclar).toContain('colspan="4"');
    expect(mesclar).toContain('rowspan=');
    expect(mesclar).not.toContain('<h2>');
  });

  it('fill sólido e cor de fonte saem como estilo inline (Formatacao)', () => {
    const html = xlsxToHtml(showcase(), { sheet: 'Formatacao' });
    expect(html).toContain('background-color:#');
    expect(html).toContain('font-weight:700');
    expect(html).toContain('color:#C00000');
  });
});
