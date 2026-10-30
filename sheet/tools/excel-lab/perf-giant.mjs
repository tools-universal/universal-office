// Mede performance/RAM do <universal-sheet> com as planilhas gigantes:
//   - tempo de loadXlsx (parse + montagem das views)
//   - tempo médio de paint (repaint completo)
//   - tempo médio de scroll (wheel → paint)
//   - heap JS usado (Performance.getMetrics do CDP) antes/depois
// Requer dev-server em :8124 e samples/giant-*.xlsx gerados (gen-giant.mjs).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['giant-200k.xlsx', 'giant-1m.xlsx'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const heapMB = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  return { used: (m.JSHeapUsedSize / 1048576).toFixed(1), total: (m.JSHeapTotalSize / 1048576).toFixed(1) };
};

await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html?bare', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

for (const f of files) {
  const bytes = readFileSync(join(here, '..', '..', 'samples', f));
  const before = await heapMB();
  const res = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const us = document.getElementById('us');
    const t0 = performance.now();
    us.loadXlsx(bin);
    const tLoad = performance.now() - t0;
    // paint completo ×10
    const t1 = performance.now();
    for (let i = 0; i < 10; i++) us.paint();
    const tPaint = (performance.now() - t1) / 10;
    // scroll (wheel) ×30
    const canvas = us.shadowRoot.querySelector('canvas');
    const t2 = performance.now();
    for (let i = 0; i < 30; i++) {
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }));
    }
    const tScroll = (performance.now() - t2) / 30;
    return { tLoad: tLoad.toFixed(0), tPaint: tPaint.toFixed(1), tScroll: tScroll.toFixed(1) };
  }, Buffer.from(bytes).toString('base64'));
  // força GC (quando exposto) para heap estável
  try { await cdp.send('HeapProfiler.collectGarbage'); } catch {}
  await page.waitForTimeout(300);
  const after = await heapMB();
  console.log(`${f}: load ${res.tLoad}ms | paint ${res.tPaint}ms | scroll ${res.tScroll}ms | heap ${before.used} → ${after.used} MB (total ${after.total} MB)`);
}
await browser.close();
