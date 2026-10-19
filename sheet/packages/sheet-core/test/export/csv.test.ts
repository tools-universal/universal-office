import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { xlsxToCsv, xlsxToTsv, loadModel } from '../../src/export/index.js';
import { makeXlsx, sheetXml, inlineStr, STYLES_XML } from './helpers.js';

const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/showcase.xlsx'));
const gaps = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/gaps-smoke.xlsx'));

describe('xlsxToCsv — escaping RFC 4180 e delimitador pt-BR', () => {
  const bytes = makeXlsx([{
    name: 'Escaping',
    xml: sheetXml(
      '<row r="1">' +
      inlineStr('A1', 'a;b') +          // contém o delimitador default
      inlineStr('B1', 'he said "hi"') + // contém aspas
      inlineStr('C1', 'linha1\nlinha2') + // contém quebra
      inlineStr('D1', 'normal') +
      '</row>',
    ),
  }]);

  it('aspas quando contém delimitador/aspas/quebra; aspas duplicadas', () => {
    expect(xlsxToCsv(bytes)).toBe('"a;b";"he said ""hi""";"linha1\nlinha2";normal\r\n');
  });

  it('delimiter "," não força aspas em "a;b"', () => {
    expect(xlsxToCsv(bytes, { delimiter: ',' })).toBe('a;b,"he said ""hi""","linha1\nlinha2",normal\r\n');
  });

  it('TSV mantém o mesmo esquema de quoting com tab', () => {
    const tsv = xlsxToTsv(makeXlsx([{
      name: 'S',
      xml: sheetXml('<row r="1">' + inlineStr('A1', 'com\ttab') + inlineStr('B1', 'x') + '</row>'),
    }]));
    expect(tsv).toBe('"com\ttab"\tx\r\n');
  });
});

describe('xlsxToCsv — grade densa (linhas/colunas esparsas)', () => {
  it('linhas puladas viram linhas vazias; colunas até a última usada', () => {
    const bytes = makeXlsx([{
      name: 'Esparso',
      xml: sheetXml(
        '<row r="1"><c r="A1"><v>1</v></c><c r="D1"><v>2</v></c></row>' +
        '<row r="4"><c r="C4"><v>3</v></c></row>',
      ),
    }]);
    expect(xlsxToCsv(bytes)).toBe('1;;;2\r\n;;;\r\n;;;\r\n;;3;\r\n');
  });

  it('planilha vazia → string vazia', () => {
    const bytes = makeXlsx([{ name: 'Vazia', xml: sheetXml('') }]);
    expect(xlsxToCsv(bytes)).toBe('');
  });
});

describe('xlsxToCsv — valores exibidos (pt-BR)', () => {
  it('boolean → VERDADEIRO/FALSO; erro → literal; fórmula → cache <v> formatado', () => {
    const bytes = makeXlsx([{
      name: 'Tipos',
      xml: sheetXml(
        '<row r="1">' +
        '<c r="A1" t="b"><v>1</v></c>' +
        '<c r="B1" t="b"><v>0</v></c>' +
        '<c r="C1" t="e"><f>1/0</f><v>#DIV/0!</v></c>' +
        '<c r="D1" s="1"><f>A2*2</f><v>1234.5</v></c>' +
        '</row>',
      ),
    }], STYLES_XML);
    // "1.234,50" não leva aspas: com delimitador ';' o ponto/vírgula do número
    // não conflita (é exatamente por isso que o default pt-BR é ';')
    expect(xlsxToCsv(bytes)).toBe('VERDADEIRO;FALSO;#DIV/0!;1.234,50\r\n');
    // com delimitador ',' o decimal conflita → campo entra em aspas
    expect(xlsxToCsv(bytes, { delimiter: ',' })).toBe('VERDADEIRO,FALSO,#DIV/0!,"1.234,50"\r\n');
  });

  it('número e data formatados pt-BR (decimal vírgula, milhar ponto, dd/mm/yyyy)', () => {
    const bytes = makeXlsx([{
      name: 'Formatos',
      xml: sheetXml(
        '<row r="1">' +
        '<c r="A1" s="1"><v>1234567.891</v></c>' +
        '<c r="B1" s="2"><v>45992</v></c>' + // 2025-12-01
        '<c r="C1"><v>3.14</v></c>' +
        '</row>',
      ),
    }], STYLES_XML);
    expect(xlsxToCsv(bytes)).toBe('1.234.567,89;01/12/2025;3,14\r\n');
  });
});

describe('xlsxToCsv — seleção de planilha e fixtures', () => {
  it('default = aba ativa (gaps-smoke: activeTab=0 → Dados)', () => {
    const csv = xlsxToCsv(gaps());
    expect(csv.length).toBeGreaterThan(0);
    expect(csv).toContain('\r\n');
  });

  it('sheet por nome e por índice dão o mesmo resultado', () => {
    const bytes = showcase();
    expect(xlsxToCsv(bytes, { sheet: 'TextoENumeros' })).toBe(xlsxToCsv(bytes, { sheet: 1 }));
  });

  it('showcase TextoENumeros: valores pt-BR formatados', () => {
    const csv = xlsxToCsv(showcase(), { sheet: 'TextoENumeros' });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Tipo;Exemplo');
    expect(csv).toContain('Decimal;3,14159');
    expect(csv).toContain('Booleano TRUE;VERDADEIRO');
    expect(csv).toContain('Erro;#DIV/0!');
  });

  it('nome inexistente → erro claro', () => {
    expect(() => xlsxToCsv(showcase(), { sheet: 'NãoExiste' })).toThrow(/não encontrada/);
  });

  it('aceita modelo já carregado como entrada', () => {
    const bytes = showcase();
    const model = loadModel(bytes);
    expect(xlsxToCsv(model, { sheet: 'TextoENumeros' })).toBe(xlsxToCsv(bytes, { sheet: 'TextoENumeros' }));
  });
});
