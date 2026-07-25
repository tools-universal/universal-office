import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes('demo'));
if (!page) { console.log('página do demo não encontrada:', pages.map(p => p.url())); process.exit(1); }
await page.waitForTimeout(1500);
// carrega a planilha de 1M células no app real
const bytes = readFileSync('D:/Projects/OfficeNext/sheet/samples/giant-1m.xlsx');
const res = await page.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const us = document.getElementById('us');
  const t0 = performance.now();
  us.loadXlsx(bin);
  const tLoad = performance.now() - t0;
  const t1 = performance.now();
  for (let i = 0; i < 10; i++) us.paint();
  const tPaint = (performance.now() - t1) / 10;
  const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : '?';
  return { tLoad: tLoad.toFixed(0), tPaint: tPaint.toFixed(1), heapMB: mem };
}, Buffer.from(bytes).toString('base64'));
console.log(`electron 1M células: load ${res.tLoad}ms | paint ${res.tPaint}ms | heap JS ${res.heapMB} MB`);
// rola até o fim (Ctrl+End equivalente: scroll bruto) e captura
await page.evaluate(() => {
  const us = document.getElementById('us');
  const c = us.shadowRoot.querySelector('canvas');
  for (let i = 0; i < 50; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: 4000, bubbles: true }));
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'D:/Projects/OfficeNext/sheet/tools/excel-lab/results/electron-giant.png' });
console.log('screenshot salvo');
await browser.close();
