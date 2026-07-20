// Renderiza samples/merge-smoke.xlsx em 3 estados de seleção (B2, C5 dentro de
// mescla A5:D5, C8 dentro de mescla B7:C8) para verificação visual.
// Requer dev-server em :8124.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'results', 'merge-smoke');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 520 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const bytes = readFileSync(join(here, '../../samples/merge-smoke.xlsx'));
await page.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const el = document.getElementById('us');
  el.loadXlsx(bin);
  el.setZoom(1.8);
  try { await document.fonts.ready; } catch {}
}, Buffer.from(bytes).toString('base64'));

// helper para selecionar uma célula (simulando teclado, que cobre o caminho de mescla)
async function selectAndShoot(name, ref) {
  await page.evaluate((r) => document.getElementById('us')?.goToRef?.(r), ref);
  await page.waitForTimeout(300);
  const buf = await page.locator('#us').screenshot();
  writeFileSync(join(outDir, name + '.png'), buf);
  console.log('saved', name);
}

await selectAndShoot('sel-B2', 'B2');
await selectAndShoot('sel-inside-A5D5', 'C5');   // C5 está coberta pela mescla A5:D5
await selectAndShoot('sel-inside-B7C8', 'C8');   // C8 está coberta pela mescla B7:C8

for (const e of errors.slice(0, 10)) console.log('  err:', e);
await browser.close();
console.log('OK ->', outDir);
