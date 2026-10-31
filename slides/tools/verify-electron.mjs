import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctxs = browser.contexts();
const pages = ctxs.flatMap((c) => c.pages());
console.log('pages:', pages.map((p) => p.url()));
const page = pages.find((p) => p.url().includes('demo')) ?? pages[0];
if (!page) { console.log('nenhuma page'); process.exit(1); }
await page.waitForTimeout(2500);
const count = await page.evaluate(() => document.getElementById('us')?.getSlideCount?.() ?? 0);
console.log('electron slides:', count, 'title:', await page.title());
await page.screenshot({ path: 'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/electron-app.png' });
// dispara Apresentar dentro do app real
await page.click('#play');
await page.waitForTimeout(700);
console.log('viewer no electron:', await page.evaluate(() => {
  const pv = document.querySelector('universal-slides-viewer');
  return pv ? `ok ${pv.getSlideCount()} slides` : 'AUSENTE';
}));
await page.screenshot({ path: 'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/electron-present.png' });
await page.evaluate(() => document.exitFullscreen().catch(() => {}));
await browser.close();
