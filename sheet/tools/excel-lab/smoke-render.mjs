// Renderiza samples/smoke.xlsx no <universal-sheet> headless e salva um PNG
// para inspeção visual dos comportamentos novos. Requer o dev-server em :8124.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
// carrega o smoke por cima do showcase
const bytes = readFileSync(join(here, '../../samples/smoke.xlsx'));
await page.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const el = document.getElementById('us');
  el.loadXlsx(bin);
  el.setZoom(1.6);
  try { await document.fonts.ready; } catch {}
  el.paint();
}, Buffer.from(bytes).toString('base64'));
await page.waitForTimeout(800);

const handle = await page.evaluateHandle(() => document.getElementById('us')?.shadowRoot?.querySelector('canvas') ?? null);
const buf = await handle.asElement().screenshot();
const outPng = join(here, 'results', 'smoke.png');
writeFileSync(outPng, buf);
console.log('saved', outPng, 'errors:', errors.length);
for (const e of errors.slice(0, 10)) console.log('  ', e);
await browser.close();
