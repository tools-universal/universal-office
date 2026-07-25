// Renderiza cada slide de um deck no <universal-presentation-viewer> headless,
// em TAMANHO EXATO (1280 px de largura), via harness.html + renderSlideToCanvas.
// Saída: results/stress/<deck>/ours/slideN.png — comparável 1:1 com os PNGs
// exportados pelo PowerPoint (results/stress/<deck>/ppt/).
//
// Uso: node tools/ppt-lab/render-deck.mjs [deck1 deck2 …]   (default: os 4 stress)
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const decks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['stress-shapes', 'stress-text', 'stress-table-chart', 'stress-media', 'stress-advanced'];

// 1) bundle do harness (viewer + glue) — sempre rebuilda (rápido)
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true,
  format: 'esm',
  outfile: join(here, 'harness.bundle.js'),
  alias: { '@universal/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts') },
});

// 2) dev-server (porta 8125). Se já estiver de pé, reusa.
async function ensureServer() {
  try {
    const res = await fetch('http://127.0.0.1:8125/package.json');
    if (res.ok) return null;
  } catch { /* não está de pé */ }
  const child = spawn(process.execPath, [join(slidesRoot, 'tools', 'dev-server.mjs')], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const res = await fetch('http://127.0.0.1:8125/package.json');
      if (res.ok) return child;
    } catch { /* ainda subindo */ }
  }
  child.kill();
  throw new Error('dev-server não subiu na 8125');
}
const serverChild = await ensureServer();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://127.0.0.1:8125/tools/ppt-lab/harness.html', { waitUntil: 'networkidle' });

for (const deck of decks) {
  const outDir = join(here, 'results', 'stress', deck, 'ours');
  mkdirSync(outDir, { recursive: true });
  const count = await page.evaluate((d) => window.harness.loadDeck(`/samples/${d}.pptx`), deck);
  // espera todas as imagens do deck decodificarem (bg + pics)
  await page.waitForFunction(() => window.harness.pendingImages() === 0, null, { timeout: 15000 }).catch(() => {});
  const canvas = await page.evaluateHandle(() => document.getElementById('cv'));
  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => window.harness.paintSlide(n, 1280), i);
    await page.waitForTimeout(120); // fontes/imagens tardias
    await page.evaluate((n) => window.harness.paintSlide(n, 1280), i); // repaint pós-decode
    const buf = await canvas.asElement().screenshot();
    writeFileSync(join(outDir, `slide${i + 1}.png`), buf);
  }
  console.log(`${deck}: ${count} slides -> ${outDir}`);
}
for (const e of errors.slice(0, 10)) console.log('  ERR', e);
await browser.close();
if (serverChild) serverChild.kill();
console.log('render-deck: OK');
