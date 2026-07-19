import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage } from '../src/index.js';

// Usa os .docx gerados pelo app de referência no word-lab como corpus de teste.
const resultsDir = join(__dirname, '../../../tools/word-lab/results');

function corpus(): string[] {
  if (!existsSync(resultsDir)) return [];
  const files: string[] = [];
  for (const exp of readdirSync(resultsDir)) {
    for (const name of ['before.docx', 'after.docx']) {
      const p = join(resultsDir, exp, name);
      if (existsSync(p)) files.push(p);
    }
  }
  return files;
}

describe('DocxPackage round-trip sem perdas', () => {
  const files = corpus();
  it('corpus do word-lab existe', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`preserva todas as partes byte a byte: ${file.split(/[\\/]/).slice(-2).join('/')}`, () => {
      const original = new Uint8Array(readFileSync(file));
      const pkg = DocxPackage.load(original);
      const saved = pkg.save();

      const reloaded = DocxPackage.load(saved);
      expect(reloaded.partNames()).toEqual(pkg.partNames());
      for (const name of pkg.partNames()) {
        expect(reloaded.getPart(name)).toEqual(pkg.getPart(name));
      }
      // E o app de referência deve conseguir reabrir: o pacote relido contém document.xml válido
      expect(reloaded.documentXml()).toContain('<w:document');
    });
  }
});
