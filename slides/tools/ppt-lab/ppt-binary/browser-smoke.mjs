// Fumaça no navegador: empacota src/ppt para platform=browser (sem polyfills
// de Node) e roda convertPptToPptx DENTRO do Chromium headless sobre um .ppt
// do corpus — garante que o conversor funciona no runtime do viewer.
//
// Uso: node tools/ppt-lab/ppt-binary/browser-smoke.mjs [arq.ppt]
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');
const file = process.argv[2] ?? join(slidesRoot, 'samples', 'playback', 'pb-midia.ppt');
const out = await build({
  stdin: {
    contents: "import { isCfb, convertPptToPptx } from './packages/slides-core/src/ppt/index.ts';\n" +
      "import { PptxPackage, readPresentation, readSlide } from './packages/slides-core/src/index.ts';\n" +
      'window.smoke = (b64) => { const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));\n' +
      '  const t0 = performance.now(); const pptx = convertPptToPptx(bytes); const ms = performance.now() - t0;\n' +
      '  const pkg = PptxPackage.load(pptx); const pres = readPresentation(pkg);\n' +
      '  const shapes = pres.slides.map((s) => readSlide(pkg, s.target).shapes.length);\n' +
      '  return { cfb: isCfb(bytes), bytes: pptx.length, ms: Math.round(ms), slides: pres.slides.length, shapes }; };',
    resolveDir: slidesRoot, loader: 'ts',
  },
  bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'warning',
});
const js = out.outputFiles[0].text;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.setContent('<!DOCTYPE html><html><body></body></html>');
await page.addScriptTag({ content: js });
const res = await page.evaluate((b64) => window.smoke(b64), readFileSync(file).toString('base64'));
console.log(`navegador: ${JSON.stringify(res)} (bundle ${(js.length / 1024).toFixed(0)} KB)`);
for (const e of errors) console.log('ERR', e);
await browser.close();
