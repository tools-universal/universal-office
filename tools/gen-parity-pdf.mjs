// Gera as fixtures de paridade PDF do projeto .NET (fase 2):
// roda os exports PDF JS sobre showcase.xlsx, reference.pptx, gaps-smoke.pptx
// e synthetic.docx (fixtures/input, gerado por gen-parity-fixtures.mjs) e
// grava em dotnet/tests/fixtures/expected/<nome>.pdf.meta.json:
//   { pages, mediaBoxes: [[w,h]...], tjCount, bytes }
// extraídos por regex do PDF JS (page dicts ficam sem compressão; os content
// streams são descomprimidos p/ contar Tj). Os PDFs em si vão para
// fixtures/.out/<nome>.js.pdf (IGNORADO pelo git), só para inspeção manual:
// eles embutem subconjuntos das fontes usadas (Aptos — proprietária), e PDF com
// fonte proprietária não entra no repositório (CLAUDE.md; tools/fonts/check-fonts.mjs).
// Regenerável: `node tools/gen-parity-pdf.mjs` (dist dos projetos já buildado).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { docxToPdfRef } from './docx-pdf-ref.mjs';

const { unzlibSync } = await import(
  new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtures = join(root, 'dotnet', 'tests', 'fixtures');
const expectedDir = join(fixtures, 'expected');
const inputDir = join(fixtures, 'input');
const inspectDir = join(fixtures, '.out');

const sheetExport = await import(
  new URL('../sheet/packages/export/dist/index.js', import.meta.url).href);
const slidesExport = await import(
  new URL('../slides/packages/export/dist/index.js', import.meta.url).href);

const font = (p, opts = {}) => ({ bytes: new Uint8Array(readFileSync(join(root, p))), ...opts });

// mesmas fontes usadas nos testes .NET (PdfParityTests)
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

/** Extrai {pages, mediaBoxes, tjCount} de um PDF gerado pelo nosso writer. */
export function pdfMeta(bytes) {
  const latin1 = Buffer.from(bytes).toString('latin1');
  // MediaBox por página, na ordem dos objetos /Type /Page
  const mediaBoxes = [];
  const pageRe = /\/Type \/Page(?!s)[^>]*?\/MediaBox \[0 0 ([0-9.]+) ([0-9.]+)\]/g;
  let m;
  while ((m = pageRe.exec(latin1)) !== null) mediaBoxes.push([parseFloat(m[1]), parseFloat(m[2])]);
  const countM = /\/Type \/Pages \/Count (\d+)/.exec(latin1);
  const pages = countM ? parseInt(countM[1], 10) : mediaBoxes.length;

  // conta operadores de texto Tj e TJ (corridas do docx-layout) nos content streams
  // (descomprimindo FlateDecode)
  let tjCount = 0;
  const streamRe = /<<([^>]*)>>\nstream\n/g;
  while ((m = streamRe.exec(latin1)) !== null) {
    const dict = m[1];
    const lenM = /\/Length (\d+)/.exec(dict);
    if (!lenM) continue;
    const start = m.index + m[0].length;
    const len = parseInt(lenM[1], 10);
    let data = bytes.subarray(start, start + len);
    if (dict.includes('/FlateDecode')) {
      try { data = unzlibSync(data); } catch { continue; }
    }
    if (dict.includes('/Image') || dict.includes('/Length1')) continue; // imagem/fonte
    const text = Buffer.from(data).toString('latin1');
    tjCount += (text.match(/(?:> Tj|\] TJ)\n/g) ?? []).length;
  }
  return { pages, mediaBoxes, tjCount };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const jobs = [
    ['showcase.xlsx', (b) => sheetExport.xlsxToPdf(b, { fonts: narrowFonts })],
    ['reference.pptx', (b) => slidesExport.pptxToPdf(b, { fonts: aptosFonts })],
    ['gaps-smoke.pptx', (b) => slidesExport.pptxToPdf(b, { fonts: aptosFonts })],
    ['synthetic.docx', (b) => docxToPdfRef(b, aptosFonts)],
  ];
  for (const [name, run] of jobs) {
    const src = join(inputDir, name);
    if (!existsSync(src)) {
      console.error(`AVISO: ${src} não existe — rode tools/gen-parity-fixtures.mjs antes.`);
      continue;
    }
    const bytes = new Uint8Array(readFileSync(src));
    const pdf = run(bytes);
    const meta = { ...pdfMeta(pdf), bytes: pdf.length };
    writeFileSync(join(expectedDir, `${name}.pdf.meta.json`), JSON.stringify(meta, null, 2) + '\n');
    mkdirSync(inspectDir, { recursive: true });
    writeFileSync(join(inspectDir, `${name}.js.pdf`), pdf);
    console.log(`expected/${name}.pdf.meta.json → pages=${meta.pages} tj=${meta.tjCount} (${pdf.length} bytes)`);
  }
  console.log('OK — fixtures de paridade PDF geradas.');
}
