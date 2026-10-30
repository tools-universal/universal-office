// Captura a renderização do NOSSO componente (canvas) por aba via Playwright
// headless. Cropa os cabeçalhos para comparar só a área de dados com o Excel.
// Uso: node tools/excel-lab/capture-ours.mjs [sheetIdx...]   (default: todas)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'results', 'pixel', 'ours');
mkdirSync(outDir, { recursive: true });
const wanted = process.argv.slice(2).map((n) => parseInt(n, 10));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html?bare', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // boot + fetch showcase
// aguarda as @font-face (Aptos Narrow) carregarem de fato
await page.evaluate(async () => {
  try { await document.fonts.load('11px "Aptos Narrow"'); await document.fonts.load('700 11px "Aptos Narrow"'); } catch {}
  try { await document.fonts.ready; } catch {}
});
const fontOk = await page.evaluate(() => { try { return document.fonts.check('11px "Aptos Narrow"'); } catch { return 'err'; } });
console.log('font Aptos Narrow pronta:', fontOk);

const count = await page.evaluate(() => document.getElementById('us')?.getSheetNames?.().length ?? 0);
// modo captura: sem seleção (igual ao CopyPicture do Excel)
await page.evaluate(() => { const el = document.getElementById('us'); if (el) { el.capture = true; el.paint(); } });
const indices = wanted.length ? wanted : Array.from({ length: count }, (_, i) => i + 1);

for (const n of indices) {
  await page.evaluate((i) => document.getElementById('us')?.selectSheet?.(i - 1), n);
  await page.waitForTimeout(450);
  // zoom 1 p/ bater com o Excel (capturado a 100%)
  await page.evaluate(() => document.getElementById('us')?.setZoom?.(1));
  await page.waitForTimeout(250);
  const rect = await page.evaluate(() => document.getElementById('us')?.getUsedRangeRect?.() ?? null);
  const handle = await page.evaluateHandle(() => document.getElementById('us')?.shadowRoot?.querySelector('canvas') ?? null);
  const buf = await handle.asElement().screenshot();
  const full = PNG.sync.read(buf);
  if (!rect || rect.w <= 0 || rect.h <= 0) {
    // sem range usado: salva inteiro
    writeFileSync(join(outDir, `page${n}.png`), PNG.sync.write(full));
    console.log(`page${n}: sem range usado (full ${full.width}x${full.height})`);
    continue;
  }
  const x = Math.round(rect.x), y = Math.round(rect.y);
  const w = Math.min(rect.w, full.width - x), h = Math.min(rect.h, full.height - y);
  const crop = new PNG({ width: w, height: h });
  PNG.bitblt(full, crop, x, y, w, h, 0, 0);
  writeFileSync(join(outDir, `page${n}.png`), PNG.sync.write(crop));
  console.log(`page${n}: ${w}x${h}px (crop de ${full.width}x${full.height})`);
}

await browser.close();
console.log('OK capture-ours');
