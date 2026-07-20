// Renderiza cada slide de samples/reference.pptx no <universal-slides> headless.
// Requer o dev-server em :8125 e o bundle do demo construido.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'results', 'ours');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 620 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:8125/packages/slides/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const count = await page.evaluate(() => document.getElementById('us')?.getSlideCount?.() ?? 0);
console.log('slides:', count, 'errors:', errors.length);

const canvas = await page.evaluateHandle(() => document.getElementById('us')?.shadowRoot?.querySelector('canvas') ?? null);
for (let i = 0; i < count; i++) {
  await page.evaluate((n) => document.getElementById('us')?.selectSlide?.(n), i);
  await page.waitForTimeout(300);
  const buf = await canvas.asElement().screenshot();
  writeFileSync(join(outDir, `slide${i + 1}.png`), buf);
}
for (const e of errors.slice(0, 10)) console.log('  ', e);
await browser.close();
console.log('OK ->', outDir);
