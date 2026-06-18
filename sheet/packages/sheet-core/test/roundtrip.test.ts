import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  XlsxPackage,
  readWorkbook,
  readSharedStrings,
  readWorksheet,
  readStyles,
} from '../src/index.js';

// Usa os .xlsx gerados pelo Excel real no excel-lab como corpus de teste.
const resultsDir = join(__dirname, '../../../tools/excel-lab/results');
const samplesDir = join(__dirname, '../../../samples');

function corpus(): string[] {
  const files: string[] = [];
  for (const dir of [resultsDir, samplesDir]) {
    if (!existsSync(dir)) continue;
    if (existsSync(join(dir, 'showcase.xlsx'))) files.push(join(dir, 'showcase.xlsx'));
    if (existsSync(join(dir, 'demo.xlsx'))) files.push(join(dir, 'demo.xlsx'));
    if (dir === resultsDir) {
      for (const exp of readdirSync(dir)) {
        for (const name of ['before.xlsx', 'after.xlsx']) {
          const p = join(dir, exp, name);
          if (existsSync(p)) files.push(p);
        }
      }
    }
  }
  return files;
}

describe('XlsxPackage round-trip sem perdas', () => {
  const files = corpus();
  it('corpus do excel-lab existe', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`preserva todas as partes byte a byte: ${file.split(/[\\/]/).slice(-2).join('/')}`, () => {
      const original = new Uint8Array(readFileSync(file));
      const pkg = XlsxPackage.load(original);
      const saved = pkg.save();

      // load → save → load preserva o CONTEÚDO de cada parte (não o ZIP cru:
      // nível de compressão/metadata do container podem diferir do Excel).
      const reloaded = XlsxPackage.load(saved);
      expect(reloaded.partNames()).toEqual(pkg.partNames());
      for (const name of pkg.partNames()) {
        expect(reloaded.getPart(name)).toEqual(pkg.getPart(name));
      }
      expect(reloaded.workbookXml()).toContain('<workbook');
    });
  }
});

describe('Leitura do modelo sobre corpus real do Excel', () => {
  it('experimento 001: A1 é shared string "Hello world" [001-set-cell-value]', () => {
    const after = join(resultsDir, '001-set-cell-value', 'after.xlsx');
    if (!existsSync(after)) return; // corpus ainda não gerado

    const pkg = XlsxPackage.load(new Uint8Array(readFileSync(after)));

    const wb = readWorkbook(pkg);
    expect(wb.sheets.length).toBe(1);
    const sheet = wb.sheets[0]!;
    expect(sheet.name).toBe('Planilha1'); // nome localizado pt-BR [FINDINGS 001]
    expect(sheet.target).toBe('xl/worksheets/sheet1.xml');

    const shared = readSharedStrings(pkg);
    expect(shared.length).toBe(1);
    expect(shared[0]!.text).toBe('Hello world');

    const ws = readWorksheet(pkg, 'xl/worksheets/sheet1.xml');
    expect(ws.rows.length).toBe(1);
    const row = ws.rows[0]!;
    expect(row.r).toBe(1);
    expect(row.cells.length).toBe(1);
    const cell = row.cells[0]!;
    expect(cell.ref).toBe('A1');
    expect(cell.type).toBe('s'); // t="s" = shared string
    expect(cell.value).toBe('0'); // índice 0 em sharedStrings
    expect(readStyles(pkg).cellXfs.length).toBeGreaterThan(0);
  });
});
