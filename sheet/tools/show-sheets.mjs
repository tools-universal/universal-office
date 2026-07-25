import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const sel = async (name) => {
  await page.evaluate((n) => {
    const us = document.getElementById('us');
    us.selectSheet(us.getSheetNames().indexOf(n));
  }, name);
  await page.waitForTimeout(400);
};
await page.screenshot({ path: 'tools/excel-lab/results/show-app.png' });
await sel('Tabela');
await page.screenshot({ path: 'tools/excel-lab/results/show-tabela.png' });
await sel('Graficos');
await page.screenshot({ path: 'tools/excel-lab/results/show-graficos.png' });
await sel('CondFormat');
await page.screenshot({ path: 'tools/excel-lab/results/show-condformat.png' });
console.log('ok');
await browser.close();
