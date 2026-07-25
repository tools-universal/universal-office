import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const us = document.getElementById('us');
  us.selectSheet(us.getSheetNames().indexOf('Validacao'));
});
await page.waitForTimeout(300);
// seleciona B1 (célula com validação de lista)
await page.evaluate(() => {
  const us = document.getElementById('us');
  us.setSelection ? us.setSelection(2, 1) : null;
});
// fallback: clique na célula B1 (~x=headerW+col1w+20, y=headerH+10)
const canvas = await page.evaluateHandle(() => document.getElementById('us').shadowRoot.querySelector('canvas'));
const box = await canvas.asElement().boundingBox();
await page.mouse.click(box.x + 160, box.y + 30);
await page.waitForTimeout(300);
const buf = await canvas.asElement().screenshot();
import('node:fs').then((fs) => fs.writeFileSync('D:/Projects/OfficeNext/sheet/tools/excel-lab/results/validation-arrow.png', buf));
await page.waitForTimeout(200);
console.log('ok');
await browser.close();
