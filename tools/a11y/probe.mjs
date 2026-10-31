// Sondagens dirigidas (o que o axe não cobre): Tab com a barra visível,
// setas em menu/slider, conteúdo com noselect, cabeçalhos no texto, leitura do
// documento inteiro (virtualização). Uso: node tools/a11y/probe.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');

const deepFocus = () => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  if (!el || el === document.body) return '∅';
  const vis = getComputedStyle(el).visibility !== 'hidden' && !el.closest?.('.uoc-hidden');
  return `${el.getAttribute('part') ?? el.tagName.toLowerCase()}${vis ? '' : '(invisível)'}`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

for (const [name, url, tag, ready] of [
  ['slides', 'http://localhost:8097/packages/viewer/demo/controls.html', 'universal-slides-viewer', 'us-loaded'],
  ['doc', 'http://localhost:8099/packages/viewer/demo/', 'universal-document-viewer', 'udv-loaded'],
]) {
  await page.goto(url);
  await page.evaluate(({ tag, ready }) => new Promise((r) => { document.querySelector(tag).addEventListener(ready, () => setTimeout(r, 500), { once: true }); setTimeout(r, 8000); }), { tag, ready });
  const box = await page.locator(tag).boundingBox();
  console.log(`\n== ${name}`);

  // Tab com a barra VISÍVEL (mouse em cima do viewer)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.evaluate((tag) => { const sr = document.querySelector(tag).shadowRoot; (sr.querySelector('canvas[tabindex], .udv-scroll'))?.focus(); }, tag);
  const order = [await page.evaluate(deepFocus)];
  for (let i = 0; i < 16; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(deepFocus)); if (!order.at(-1).startsWith('button') && !order.at(-1).startsWith('canvas') && order.at(-1) !== 'pages' && i > 0 && !order.at(-1).includes('progress')) break; }
  console.log('Tab (barra visível):', order.join(' → '));

  // slider de progresso: alcançável? reage a setas?
  const slider = await page.evaluate((tag) => {
    const s = document.querySelector(tag).shadowRoot.querySelector('[role="slider"]');
    return s ? { tabindex: s.getAttribute('tabindex'), valuenow: s.getAttribute('aria-valuenow'), valuetext: s.getAttribute('aria-valuetext') } : null;
  }, tag);
  console.log('slider:', JSON.stringify(slider));

  if (name === 'doc') {
    // menu: setas movem o foco entre as opções?
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 3);
    await page.evaluate((tag) => document.querySelector(tag).shadowRoot.querySelector('[part~="button-view"]').click(), tag);
    const f1 = await page.evaluate(() => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e?.textContent; });
    await page.keyboard.press('ArrowDown');
    const f2 = await page.evaluate(() => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e?.textContent; });
    console.log(`menu: foco ao abrir "${f1}", após ↓ "${f2}"`, f1 === f2 ? '(SETAS NÃO NAVEGAM)' : '');
    await page.keyboard.press('Escape');

    // estrutura do texto: títulos marcados?
    const struct = await page.evaluate((tag) => {
      const sr = document.querySelector(tag).shadowRoot;
      return {
        headings: sr.querySelectorAll('.udv-text [role="heading"], .udv-text h1, .udv-text h2').length,
        pagesLabelled: [...sr.querySelectorAll('.udv-page')].filter((p) => p.getAttribute('aria-label') || p.getAttribute('role')).length,
        pages: sr.querySelectorAll('.udv-page').length,
        pagesWithText: [...sr.querySelectorAll('.udv-page')].filter((p) => p.querySelector('.udv-text > *')).length,
      };
    }, tag);
    console.log('estrutura:', JSON.stringify(struct));

    // noselect: o leitor de tela ainda recebe o texto?
    await page.evaluate((tag) => document.querySelector(tag).setAttribute('noselect', ''), tag);
    await page.waitForTimeout(400);
    const snap = await page.locator(tag).ariaSnapshot();
    console.log('noselect → texto na árvore:', /Relatório de exemplo/.test(snap) ? 'sim' : 'NÃO (conteúdo some para o leitor de tela)');
    await page.evaluate((tag) => document.querySelector(tag).removeAttribute('noselect'), tag);
  } else {
    // conteúdo do slide e anúncio ao trocar
    const info = await page.evaluate(async (tag) => {
      const host = document.querySelector(tag), sr = host.shadowRoot;
      const cv = sr.querySelector('canvas');
      const before = sr.textContent.length;
      host.next();
      await new Promise((r) => setTimeout(r, 500));
      return { canvasRole: cv.getAttribute('role'), canvasLabel: cv.getAttribute('aria-label'), live: sr.querySelectorAll('[aria-live]').length, textChars: before };
    }, tag);
    console.log('slide:', JSON.stringify(info));
  }
}
await browser.close();
