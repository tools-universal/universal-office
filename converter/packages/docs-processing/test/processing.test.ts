import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocxPackage, readFullDocument } from '../src/index.js';

describe('DOCX processing', () => {
  it('loads a document without Microsoft Office', () => {
    const bytes = readFileSync(fileURLToPath(new URL('./fixtures/synthetic.docx', import.meta.url)));
    const document = readFullDocument(DocxPackage.load(bytes));
    expect(document.blocks.length).toBeGreaterThan(0);
  });
});
