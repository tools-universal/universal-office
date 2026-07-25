import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const us = document.getElementById('us');
  us.selectSheet(us.getSheetNames().indexOf('Comentarios'));
});
await page.waitForTimeout(300);
// hover sobre A1 (célula com comentário): headers ~24px, célula A1 ~ (70, 30)
const canvas = await page.evaluateHandle(() => document.getElementById('us').shadowRoot.querySelector('canvas'));
const box = await canvas.asElement().boundingBox();
await page.mouse.move(box.x + 70, box.y + 30);
await page.waitForTimeout(400);
const tip = await page.evaluate(() => {
  const us = document.getElementById('us');
  const div = [...us.shadowRoot.querySelectorAll('div')].find((d) => d.style.background.includes('255, 255, 225') || d.style.backgroundColor === 'rgb(255, 255, 225)');
  return div && div.style.display !== 'none' ? div.textContent : null;
});
console.log('tooltip:', JSON.stringify(tip));
const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: 600, height: 300 } });
writeFileSync('D:/Projects/OfficeNext/sheet/tools/excel-lab/results/comment-tip.png', shot);
await browser.close();
