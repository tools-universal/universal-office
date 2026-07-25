// Tour de gaps: renderiza abas-chave do showcase.xlsx no <universal-sheet>
// headless (com scroll para testar frozen panes) e salva screenshots.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'results', 'gap-tour');
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://127.0.0.1:8124/packages/sheet/demo/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const names = await page.evaluate(() => document.getElementById('us').getSheetNames?.() ?? []);
console.log('abas:', JSON.stringify(names));
const canvas = await page.evaluateHandle(() => document.getElementById('us')?.shadowRoot?.querySelector('canvas'));
const shot = async (label) => {
  const buf = await canvas.asElement().screenshot();
  writeFileSync(join(outDir, label + '.png'), buf);
};
const tabs = ['Congelar', 'Tabela', 'Validacao', 'Graficos', 'CondFormat'];
for (const t of tabs) {
  const i = names.indexOf(t);
  if (i < 0) { console.log('aba ausente:', t); continue; }
  await page.evaluate((n) => document.getElementById('us').selectSheet(n), i);
  await page.waitForTimeout(400);
  await shot(t);
  if (t === 'Congelar') {
    // rola para baixo: a linha 1 congelada deve permanecer visível no topo
    await page.evaluate(() => {
      const us = document.getElementById('us');
      const c = us.shadowRoot.querySelector('canvas');
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, bubbles: true }));
    });
    await page.waitForTimeout(300);
    await shot('Congelar-scrolled');
  }
}
console.log('errors:', errors.length);
for (const e of errors.slice(0, 6)) console.log(' ', e);
await browser.close();
console.log('OK ->', outDir);
