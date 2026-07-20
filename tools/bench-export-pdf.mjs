// Benchmark do lado node dos exports PDF (fase 2 do projeto .NET):
// mede xlsxToPdf(showcase), pptxToPdf(showcase_animado; fallback reference) e
// docxToPdfRef(synthetic) com o MESMO protocolo do OfficeNext.Benchmarks —
// warmup 3 + média de 10 runs. Saída: uma linha JSON por caso
//   {"name":"...","ms":<média>,"bytes":<tamanho do PDF>}
// (o console .NET roda este script e faz o comparativo/speedup).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { docxToPdfRef } from './docx-pdf-ref.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const sheetExport = await import(
  new URL('../sheet/packages/export/dist/index.js', import.meta.url).href);
const slidesExport = await import(
  new URL('../slides/packages/export/dist/index.js', import.meta.url).href);

const font = (p, opts = {}) => ({ bytes: new Uint8Array(readFileSync(join(root, p))), ...opts });
const narrowFonts = [
  font('sheet/packages/sheet/demo/fonts/aptos-narrow-regular.ttf'),
  font('sheet/packages/sheet/demo/fonts/aptos-narrow-bold.ttf', { bold: true }),
  font('sheet/packages/sheet/demo/fonts/aptos-narrow-italic.ttf', { italic: true }),
  font('sheet/packages/sheet/demo/fonts/aptos-narrow-bolditalic.ttf', { bold: true, italic: true }),
];
const aptosFonts = [
  font('write/tools/word-lab/fonts/aptos-regular.ttf'),
  font('write/tools/word-lab/fonts/aptos-bold.ttf', { bold: true }),
  font('write/tools/word-lab/fonts/aptos-italic.ttf', { italic: true }),
  font('write/tools/word-lab/fonts/aptos-bolditalic.ttf', { bold: true, italic: true }),
];

const WARMUP = 3;
const RUNS = 10;

function bench(name, fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  let bytes = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < RUNS; i++) bytes = fn().length;
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6 / RUNS;
  console.log(JSON.stringify({ name, ms: Math.round(ms * 1000) / 1000, bytes }));
}

const showcaseXlsx = new Uint8Array(readFileSync(join(root, 'sheet', 'samples', 'showcase.xlsx')));
const pptxPath = existsSync(join(root, 'slides', 'samples', 'showcase_animado.pptx'))
  ? join(root, 'slides', 'samples', 'showcase_animado.pptx')
  : join(root, 'slides', 'samples', 'reference.pptx');
const pptxName = pptxPath.endsWith('showcase_animado.pptx') ? 'showcase_animado.pptx' : 'reference.pptx';
const pptxBytes = new Uint8Array(readFileSync(pptxPath));
const syntheticDocx = new Uint8Array(
  readFileSync(join(root, 'dotnet', 'tests', 'fixtures', 'input', 'synthetic.docx')));

bench(`XlsxToPdf(showcase.xlsx)`, () => sheetExport.xlsxToPdf(showcaseXlsx, { fonts: narrowFonts }));
bench(`PptxToPdf(${pptxName})`, () => slidesExport.pptxToPdf(pptxBytes, { fonts: aptosFonts }));
bench(`DocxToPdf(synthetic.docx)`, () => docxToPdfRef(syntheticDocx, aptosFonts));
