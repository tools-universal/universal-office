import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:8097/packages/slides/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('#play');
await page.waitForTimeout(500);
console.log('fullscreenElement:', await page.evaluate(() => document.fullscreenElement?.tagName ?? null));
// simula saída de fullscreen programática (equivalente ao Esc nativo)
await page.evaluate(() => document.exitFullscreen());
await page.waitForTimeout(400);
console.log('overlay fechado após exitFullscreen:', await page.evaluate(() => !document.querySelector('universal-slides-viewer')));
console.log('editor voltou ao slide:', await page.evaluate(() => document.getElementById('us')?.getSlideIndex()));
await browser.close();
