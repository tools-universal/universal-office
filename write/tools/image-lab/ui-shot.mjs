// Conferência da frente Imagem no navegador (Chromium headless, sem janela):
// abre o demo do editor (servidor do demo no ar, porta 8099 — launch.json
// "write-demo"), carrega um .docx do oráculo, roda um cenário e grava capturas
// em %TEMP%/pic-shots.
//
//   node tools/image-lab/ui-shot.mjs <cenário> [--doc inline] [--lang en|pt] [--width 1440] [--toolbar ribbon|compact]
//
// Cenários: select, wrap, rotate, resize, layout, alt, context, drag.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] ?? 'select';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', 'ribbon');
const doc = opt('--doc', 'inline');
const out = path.join(tmpdir(), 'pic-shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
await page.goto(`http://localhost:8099/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
// o documento do oráculo, fora do Modo Protegido
await page.evaluate(async (name) => {
  const wn = document.querySelector('universal-write');
  const r = await fetch(`/tools/image-lab/.out/${name}.docx`);
  await wn.loadDocx(new Uint8Array(await r.arrayBuffer()), { protected: false });
}, doc);
await page.waitForTimeout(1200);
const shot = async (name) => {
  const f = path.join(out, `${scenario}-${name}-${lang}-${toolbar}.png`);
  await page.screenshot({ path: f });
  console.log('captura', f);
};
/** Centro (px da janela) da 1ª imagem do motor (itens de imagem da página). */
const picCenter = () => page.evaluate(() => {
  const wn = document.querySelector('universal-write');
  const eng = wn.eng;
  const scale = 96 / 1440 * wn.zoom;
  for (let pg = 0; pg < eng.result.pages.length; pg++) {
    const it = eng.result.pages[pg].items.find((i) => i.t === 'image');
    if (!it) continue;
    const r = wn.canvases[pg].getBoundingClientRect();
    return { x: r.left + (it.x + it.w / 2) * scale, y: r.top + (it.y + it.h / 2) * scale, w: it.w * scale, h: it.h * scale };
  }
  return null;
});
const state = () => page.evaluate(() => {
  const s = document.querySelector('universal-write').selectedImage();
  return s && { inline: s.inline, wrap: s.wrap, w: s.widthPt, h: s.heightPt, rot: s.rotation, alt: s.altText };
});

const c = await picCenter();
if (!c) { console.log('sem imagem'); await browser.close(); process.exit(1); }
await page.mouse.click(c.x, c.y);
await page.waitForTimeout(400);
console.log('selecionada:', JSON.stringify(await state()));
if (scenario === 'select') await shot('selected');
if (scenario === 'wrap') {
  await page.evaluate(() => document.querySelector('universal-write').setImageWrap('square'));
  await page.waitForTimeout(500);
  console.log('depois:', JSON.stringify(await state()));
  await shot('square');
}
if (scenario === 'rotate') {
  // alça de girar: 22 px acima do meio da borda de cima
  const hx = c.x, hy = c.y - c.h / 2 - 22;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 60, hy + 10, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('depois:', JSON.stringify(await state()));
  await shot('rotated');
}
if (scenario === 'resize') {
  const hx = c.x + c.w / 2, hy = c.y + c.h / 2;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 50, hy + 50, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('depois:', JSON.stringify(await state()));
  await shot('resized');
}
if (scenario === 'layout') {
  await page.evaluate(() => {
    const wn = document.querySelector('universal-write');
    wn.shadowRoot.querySelector('[data-a="pic:layout"]')?.click();
  });
  await page.waitForTimeout(600);
  await shot('dialog');
}
if (scenario === 'alt') {
  await page.evaluate(() => document.querySelector('universal-write').shadowRoot.querySelector('[data-a="pic:alt"]')?.click());
  await page.waitForTimeout(600);
  await shot('pane');
}
if (scenario === 'context') {
  await page.mouse.click(c.x, c.y, { button: 'right' });
  await page.waitForTimeout(500);
  await shot('menu');
}
if (scenario === 'drag') {
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 150, c.y + 120, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('depois:', JSON.stringify(await state()));
  await shot('dragged');
}
if (scenario === 'save') {
  // várias operações e a gravação: o .docx sai em .out/ui-saved.docx (para o Word abrir)
  const b64 = await page.evaluate(() => {
    const wn = document.querySelector('universal-write');
    wn.setImageWrap('square');
    wn.setImageAltText({ text: 'Quadrantes coloridos' });
    wn.setImageRotation(15);
    wn.setImagePosition('top-right');
    const bytes = wn.saveDocx();
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const { writeFileSync } = await import('node:fs');
  const f = path.join(ROOT, 'write', 'tools', 'image-lab', '.out', 'ui-saved.docx');
  writeFileSync(f, Buffer.from(b64, 'base64'));
  console.log('gravado', f);
}
if (logs.length) console.log('ERROS:\n' + logs.join('\n'));
await browser.close();
