import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readDocument, writeDocument } from '../src/index.js';

const labDir = join(__dirname, '../../../tools/word-lab');
const src = join(labDir, 'results/image-oracle/image.docx');

describe('imagens inline', () => {
  if (!existsSync(src)) {
    it.skip('image-oracle ausente', () => {});
    return;
  }

  it('lê imagem criada pelo app de referência, re-serializa, e o modelo relido bate', () => {
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(src)));
    const model = readDocument(pkg);
    const allRuns = model.paragraphs.flatMap((p) => p.runs);
    const imgRun = allRuns.find((r) => r.image);
    expect(imgRun, 'deveria encontrar o run de imagem').toBeTruthy();
    expect(imgRun!.image!.data.length).toBeGreaterThan(1000);
    expect(imgRun!.image!.widthTwips).toBeGreaterThan(100);
    expect(imgRun!.image!.heightTwips).toBeGreaterThan(100);

    writeDocument(pkg, model);
    const bytes = pkg.save();
    const model2 = readDocument(DocxPackage.load(bytes));
    const imgRun2 = model2.paragraphs.flatMap((p) => p.runs).find((r) => r.image);
    expect(imgRun2).toBeTruthy();
    expect(imgRun2!.image!.data.length).toBe(imgRun!.image!.data.length);
    expect(Math.round(imgRun2!.image!.widthTwips)).toBe(Math.round(imgRun!.image!.widthTwips));

    writeFileSync(join(labDir, 'results/image-oracle/resaved.docx'), bytes);
  });
});
