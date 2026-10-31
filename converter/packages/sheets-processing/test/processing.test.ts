import { readFileSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; import { describe, expect, it } from 'vitest';
import { XlsxPackage, readWorkbook } from '../src/index.js';
describe('XLSX processing', () => { it('loads a workbook', () => { const bytes=readFileSync(fileURLToPath(new URL('./fixtures/showcase.xlsx', import.meta.url))); expect(readWorkbook(XlsxPackage.load(bytes)).sheets.length).toBeGreaterThan(0); }); });
