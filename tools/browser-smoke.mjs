#!/usr/bin/env node
/**
 * browser-smoke — prova REAL de que os exports rodam no browser (spec 06).
 *
 * Fluxo:
 *   1. Gera os bundles browser (mesmo pipeline do check-universal).
 *   2. No node, gera um .docx sintético via writeDocument do docx-core
 *      (bundle node dedicado) e o grava em tools/dist-universal/.
 *   3. Sobe servidor estático da raiz do monorepo e uma página de teste que
 *      importa os bundles e executa cada exportação sobre as fixtures:
 *        - docxToMarkdown  (docx sintético)
 *        - xlsxToCsv / xlsxToMarkdown / xlsxToPdf  (sheet/samples/gaps-smoke.xlsx,
 *          fontes TTF do demo do sheet)
 *        - pptxToMarkdown / pptxToHtml / pptxToPdf  (slides/samples/gaps-smoke.pptx)
 *        - pptxToImages  (browser TEM canvas — precisa funcionar de verdade)
 *   4. Playwright (devDependency do projeto slides) roda a página headless e
 *      afere: strings com os marcadores esperados, PDFs começando com %PDF,
 *      PNGs com assinatura PNG. PASS/FAIL por check; exit != 0 em falha.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, BUNDLE_DIR, PACKAGES, buildBrowserBundle, esbuildFor } from './universal-packages.mjs';

const DOCX_MARKER = 'Smoke universal browser+node';

// ─────────────────────── 1. bundles browser ───────────────────────

console.log('· gerando bundles browser (esbuild platform=browser)…');
for (const pkg of PACKAGES) await buildBrowserBundle(pkg, { write: true });

// ─────────────────────── 2. .docx sintético (node) ───────────────────────

// Bundle NODE do docx-core só para gerar a fixture — o docx-core é workspace
// TS puro, então bundlamos o src para um .mjs importável daqui.
console.log('· gerando .docx sintético via writeDocument (docx-core no node)…');
const esbuild = esbuildFor('write');
const coreOut = path.join(BUNDLE_DIR, 'docx-core.node.mjs');
await mkdir(BUNDLE_DIR, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(ROOT, 'write', 'packages', 'docx-core', 'src', 'index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: coreOut,
  logLevel: 'silent',
});
const core = await import(pathToFileURL(coreOut).href);
{
  const model = {
    paragraphs: [{ runs: [], props: {} }],
    sectPr: {
      pageWidthTwips: 11906, pageHeightTwips: 16838,
      marginLeftTwips: 1701, marginRightTwips: 1701,
      marginTopTwips: 1417, marginBottomTwips: 1417,
    },
  };
  core.insertText(model, { para: 0, offset: 0 }, DOCX_MARKER);
  const pkg = core.DocxPackage.empty();
  core.writeDocument(pkg, model);
  await writeFile(path.join(BUNDLE_DIR, 'synthetic.docx'), pkg.save());
}

// ─────────────────────── 3. página de teste + servidor ───────────────────────

const PAGE = `<!doctype html>
<meta charset="utf-8">
<title>browser-smoke — exports universais</title>
<script type="module">
import * as wexport from './write-export.js';
import * as sexport from './sheet-export.js';
import * as slexport from './slides-export.js';

const results = [];
const check = (name, ok, detail = '') =>
  results.push({ name, ok: !!ok, detail: String(detail).replace(/\\s+/g, ' ').slice(0, 200) });
const bytes = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  return new Uint8Array(await r.arrayBuffer());
};
const isPdf = (b) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
const isPng = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; // \\x89PNG

try {
  // fontes TTF do demo do sheet (Aptos Narrow, 4 variantes)
  const fontDir = '/sheet/packages/sheet/demo/fonts/';
  const fonts = [
    { bytes: await bytes(fontDir + 'aptos-narrow-regular.ttf') },
    { bytes: await bytes(fontDir + 'aptos-narrow-bold.ttf'), bold: true },
    { bytes: await bytes(fontDir + 'aptos-narrow-italic.ttf'), italic: true },
    { bytes: await bytes(fontDir + 'aptos-narrow-bolditalic.ttf'), bold: true, italic: true },
  ];

  // write — docx sintético
  const docx = await bytes('./synthetic.docx');
  const dmd = wexport.docxToMarkdown(docx);
  check('write  docxToMarkdown', dmd.length > 0 && dmd.includes(${JSON.stringify(DOCX_MARKER)}), dmd.slice(0, 80));

  // sheet — gaps-smoke.xlsx
  const xlsx = await bytes('/sheet/samples/gaps-smoke.xlsx');
  const csv = sexport.xlsxToCsv(xlsx);
  check('sheet  xlsxToCsv', csv.length > 0 && csv.includes('\\r\\n'), csv.slice(0, 60));
  const smd = sexport.xlsxToMarkdown(xlsx);
  check('sheet  xlsxToMarkdown', smd.length > 0 && smd.includes('|'), smd.slice(0, 60));
  const spdf = sexport.xlsxToPdf(xlsx, { fonts });
  check('sheet  xlsxToPdf', isPdf(spdf), 'bytes=' + spdf.length);

  // slides — gaps-smoke.pptx
  const pptx = await bytes('/slides/samples/gaps-smoke.pptx');
  const pmd = slexport.pptxToMarkdown(pptx);
  check('slides pptxToMarkdown', pmd.length > 0 && pmd.includes('## Slide 1'), pmd.slice(0, 60));
  const phtml = slexport.pptxToHtml(pptx);
  check('slides pptxToHtml', phtml.length > 0 && phtml.includes('<section class="slide"'), phtml.slice(0, 60));
  const ppdf = slexport.pptxToPdf(pptx, { fonts });
  check('slides pptxToPdf', isPdf(ppdf), 'bytes=' + ppdf.length);

  // imagens — o browser TEM canvas (OffscreenCanvas): deve funcionar de verdade
  const pngs = await slexport.pptxToImages(pptx);
  check('slides pptxToImages', pngs.length > 0 && pngs.every(isPng),
    pngs.length + ' png(s), ' + pngs.map((p) => p.length).join('/') + ' bytes');
} catch (e) {
  check('exceção não tratada', false, (e && e.stack) || e);
}
window.__RESULTS__ = results;
</script>`;
await writeFile(path.join(BUNDLE_DIR, 'smoke.html'), PAGE);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ttf': 'font/ttf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Servidor estático da raiz do monorepo (leitura apenas, sem traversal). */
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

// ─────────────────────── 4. Playwright headless ───────────────────────

// Playwright já é devDependency do projeto slides — reusar de lá.
const requireSlides = createRequire(path.join(ROOT, 'slides', 'package.json'));
const { chromium } = requireSlides('playwright');

let exitCode = 0;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(`http://127.0.0.1:${port}/tools/dist-universal/smoke.html`);
  await page.waitForFunction(() => Array.isArray(window.__RESULTS__), { timeout: 60_000 });
  const results = await page.evaluate(() => window.__RESULTS__);

  console.log(`\nbrowser-smoke — resultados (chromium headless):`);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
    if (!r.ok) exitCode = 1;
  }
  if (results.length === 0) { console.log('FAIL  nenhum resultado produzido pela página'); exitCode = 1; }
  if (consoleErrors.length > 0) {
    console.log('\nerros de console da página:');
    for (const e of consoleErrors.slice(0, 10)) console.log('  ' + e);
  }
} finally {
  await browser.close();
  server.close();
}

console.log(exitCode === 0
  ? '\nbrowser-smoke: OK — todos os exports rodaram no browser.'
  : '\nbrowser-smoke: FALHOU — veja os checks acima.');
process.exit(exitCode);
