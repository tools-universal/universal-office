import { readFileSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; import { describe, expect, it } from 'vitest';
import { PptxPackage, readPresentation } from '../src/index.js';
describe('PPTX processing', () => { it('loads a presentation', () => { const bytes=readFileSync(fileURLToPath(new URL('./fixtures/reference.pptx', import.meta.url))); expect(readPresentation(PptxPackage.load(bytes)).slides.length).toBeGreaterThan(0); }); });
