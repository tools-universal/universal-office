import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://127.0.0.1:8097/packages/slides/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const count = await page.evaluate(() => document.getElementById('us')?.getSlideCount?.() ?? 0);
console.log('demo slides:', count, 'errors:', errors.length);
await page.screenshot({ path: 'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/demo-editor.png' });
// modo apresentar: dispara o botão play → overlay <universal-presentation-viewer>
await page.click('#play');
await page.waitForTimeout(800);
const pvInfo = await page.evaluate(() => {
  const pv = document.querySelector('universal-presentation-viewer');
  return pv ? { present: true, slides: pv.getSlideCount(), idx: pv.getSlideIndex() } : { present: false };
});
console.log('viewer overlay:', JSON.stringify(pvInfo));
await page.screenshot({ path: 'D:/Projects/OfficeNext/slides/tools/ppt-lab/results/demo-present.png' });
// navega no viewer (seta direita) e confirma o evento
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const idx2 = await page.evaluate(() => document.querySelector('universal-presentation-viewer')?.getSlideIndex());
console.log('após ArrowRight, slide idx:', idx2);
// Esc fecha o overlay (sem fullscreen headless)
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const gone = await page.evaluate(() => !document.querySelector('universal-presentation-viewer'));
console.log('overlay fechado após Esc:', gone);
for (const e of errors.slice(0, 5)) console.log('ERR', e);
await browser.close();
