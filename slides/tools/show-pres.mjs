import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:8097/packages/slides/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'tools/ppt-lab/results/show-editor.png' });
// modo apresentar (viewer puro)
await page.click('#play');
await page.waitForTimeout(800);
await page.screenshot({ path: 'tools/ppt-lab/results/show-present.png' });
await page.evaluate(() => document.exitFullscreen().catch(() => {}));
await page.waitForTimeout(300);
// alguns slides do showcase no editor
for (const i of [4, 6]) {
  await page.evaluate((n) => document.getElementById('us').selectSlide(n), i);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tools/ppt-lab/results/show-slide${i + 1}.png` });
}
console.log('ok');
await browser.close();
