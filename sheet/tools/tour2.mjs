import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const shot = async (name, scroll) => {
  await page.evaluate((n) => {
    const us = document.getElementById('us');
    us.selectSheet(us.getSheetNames().indexOf(n));
  }, name);
  await page.waitForTimeout(400);
  if (scroll) {
    await page.evaluate(() => {
      const c = document.getElementById('us').shadowRoot.querySelector('canvas');
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true }));
    });
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `tools/excel-lab/results/tour-${name}${scroll ? '-scroll' : ''}.png` });
};
for (const t of ['Formatacao', 'Bordas', 'CondFormat', 'Mesclar', 'TextoENumeros']) await shot(t);
await shot('Congelar', true);
console.log('ok');
await browser.close();
