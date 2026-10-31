// Renderiza os .ppt CONVERTIDOS (convert.ts → .work/conv/<deck>.pptx) e os
// .pptx GÊMEOS com o <universal-slides-viewer> headless (1280 px, via o
// harness do lab) e compara pixel a pixel com o PowerPoint:
//
//   A  nosso(.ppt convertido)  × PowerPoint(.ppt)    ← divergência principal
//   B  nosso(.pptx gêmeo)      × PowerPoint(.pptx)   ← linha de base do renderer
//   C  nosso(.ppt convertido)  × nosso(.pptx gêmeo)  ← só o erro do conversor
//
// Referências do PowerPoint: results/ppt-binary/<deck>/{ppt,pptx}/ref/slideN.png
// (import-refs.mjs). Saída: results/ppt-binary/<deck>/{conv,twin}/slideN.png,
// diffs, report.html por deck e results/ppt-binary/summary.json.
//
// Usa porta própria (8137) e serve ESTE checkout (a 8125 pode ser de outro).
// Uso: node tools/ppt-lab/ppt-binary/render-compare.mjs [deck…] [--no-twin]
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { PNG } from 'pngjs';
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');
const work = join(here, '.work');
const resRoot = join(here, '..', 'results', 'ppt-binary');
const args = process.argv.slice(2);
const noTwin = args.includes('--no-twin');
// --bin: compara a variante só-binário (convert.ts --no-roundtrip → .work/conv-bin)
const convDir = args.includes('--bin') ? 'conv-bin' : 'conv';
let decks = args.filter((a) => !a.startsWith('--'));
if (!decks.length) decks = readdirSync(join(work, convDir)).filter((f) => f.endsWith('.pptx')).map((f) => f.slice(0, -5));
const PORT = 8137;
const TOL = 40;

// 1) bundle do harness com slides-core DESTE checkout
await build({
  entryPoints: [join(here, '..', 'harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning',
  outfile: join(work, 'harness.bundle.js'),
  alias: {
    '@universal-office/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts'),
    '@universal-office/charts': join(slidesRoot, '..', 'shared', 'charts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(slidesRoot, '..', 'shared', 'drawingml', 'src', 'index.ts'),
  },
});
const html = readFileSync(join(here, '..', 'harness.html'), 'utf8')
  .replace(/url\('\.\/fonts\//g, "url('/tools/ppt-lab/fonts/")
  .replace('./harness.bundle.js', '/tools/ppt-lab/ppt-binary/.work/harness.bundle.js');
writeFileSync(join(work, 'harness.html'), html);

// 2) servidor estático da raiz `slides/`
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = normalize(join(slidesRoot, decodeURIComponent(url.pathname)));
  if (!path.startsWith(normalize(slidesRoot))) { res.writeHead(403).end(); return; }
  try {
    statSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(path).pipe(res);
  } catch { res.writeHead(404).end('not found'); }
}).listen(PORT, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/tools/ppt-lab/ppt-binary/.work/harness.html`, { waitUntil: 'networkidle' });

async function renderDeck(url, outDir, width = 1280) {
  mkdirSync(outDir, { recursive: true });
  const count = await page.evaluate((u) => window.harness.loadDeck(u), url);
  await page.waitForFunction(() => window.harness.pendingImages() === 0, null, { timeout: 15000 }).catch(() => {});
  const canvas = await page.evaluateHandle(() => document.getElementById('cv'));
  for (let i = 0; i < count; i++) {
    await page.evaluate(([n, w]) => window.harness.paintSlide(n, w), [i, width]);
    await page.waitForTimeout(80);
    await page.evaluate(([n, w]) => window.harness.paintSlide(n, w), [i, width]);
    writeFileSync(join(outDir, `slide${i + 1}.png`), await canvas.asElement().screenshot());
  }
  return count;
}

/** Largura da referência do PowerPoint (para renderizar no mesmo tamanho). */
function refWidth(base) {
  const p = join(base, 'ppt', 'ref', 'slide1.png');
  return existsSync(p) ? PNG.sync.read(readFileSync(p)).width : 1280;
}

function compare(aPath, bPath, diffPath) {
  if (!existsSync(aPath) || !existsSync(bPath)) return undefined;
  const a = PNG.sync.read(readFileSync(aPath));
  const b = PNG.sync.read(readFileSync(bPath));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const diff = diffPath ? new PNG({ width: w, height: h }) : undefined;
  let bad = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (a.width * y + x) * 4, ib = (b.width * y + x) * 4, id = (w * y + x) * 4;
      const delta = Math.max(Math.abs(a.data[ia] - b.data[ib]), Math.abs(a.data[ia + 1] - b.data[ib + 1]), Math.abs(a.data[ia + 2] - b.data[ib + 2]));
      if (delta > TOL) {
        bad++;
        if (diff) { diff.data[id] = 255; diff.data[id + 1] = 40; diff.data[id + 2] = 40; diff.data[id + 3] = 255; }
      } else if (diff) {
        diff.data[id] = 235 + (b.data[ib] >> 4); diff.data[id + 1] = 235 + (b.data[ib + 1] >> 4); diff.data[id + 2] = 235 + (b.data[ib + 2] >> 4); diff.data[id + 3] = 255;
      }
    }
  }
  if (diff) writeFileSync(diffPath, PNG.sync.write(diff));
  return (100 * bad) / (w * h);
}

const summary = {};
for (const deck of decks) {
  const base = join(resRoot, deck);
  const width = refWidth(base);
  const n = await renderDeck(`/tools/ppt-lab/ppt-binary/.work/${convDir}/${deck}.pptx`, join(base, convDir), width);
  // gêmeo: samples/playback/<deck>.pptx, samples/<deck>.pptx ou (decks "lo-") o .pptx de origem
  const src = deck.replace(/^lo-/, '');
  const twinFile = existsSync(join(slidesRoot, 'samples', 'playback', `${src}.pptx`))
    ? `/samples/playback/${src}.pptx` : existsSync(join(slidesRoot, 'samples', `${src}.pptx`)) ? `/samples/${src}.pptx` : undefined;
  if (twinFile && !noTwin) await renderDeck(twinFile, join(base, 'twin'), width);
  const rows = [];
  const pre = convDir === 'conv' ? '' : 'bin-';
  for (let i = 1; i <= n; i++) {
    const f = `slide${i}.png`;
    rows.push({
      f,
      A: compare(join(base, convDir, f), join(base, 'ppt', 'ref', f), join(base, `${pre}A-${f}`)),
      B: compare(join(base, 'twin', f), join(base, 'pptx', 'ref', f)),
      C: compare(join(base, convDir, f), join(base, 'twin', f), join(base, `${pre}C-${f}`)),
    });
  }
  const avg = (k) => { const v = rows.map((r) => r[k]).filter((x) => x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : undefined; };
  summary[deck] = { slides: n, A: avg('A'), B: avg('B'), C: avg('C'), rows };
  const fmt = (x) => (x === undefined ? '–' : x.toFixed(2) + '%');
  const img = (p) => `<img src="${p}">`;
  writeFileSync(join(base, `${pre}report.html`), [
    `<!DOCTYPE html><meta charset="utf-8"><title>${deck} — .ppt convertido</title>`,
    '<style>body{font:14px Segoe UI;background:#1e1e22;color:#eee;margin:16px}img{width:300px;display:block;border:1px solid #444}td{vertical-align:top;padding:4px}.bad{color:#ff6b6b}.ok{color:#7bd88f}</style>',
    `<h1>${deck}</h1><p>A = nosso(.ppt convertido) × PowerPoint(.ppt): ${fmt(avg('A'))} · B = nosso(.pptx) × PowerPoint(.pptx): ${fmt(avg('B'))} · C = convertido × gêmeo (nosso): ${fmt(avg('C'))}</p>`,
    '<table><tr><th>slide</th><th>convertido (nosso)</th><th>PowerPoint (.ppt)</th><th>diff A</th><th>gêmeo .pptx (nosso)</th><th>diff C</th></tr>',
    ...rows.map((r) => `<tr><td>${r.f}<div class="${(r.A ?? 0) > 3 ? 'bad' : 'ok'}">A ${fmt(r.A)}</div><div>B ${fmt(r.B)}</div><div>C ${fmt(r.C)}</div></td>` +
      `<td>${img(convDir + '/' + r.f)}</td><td>${img('ppt/ref/' + r.f)}</td><td>${img(pre + 'A-' + r.f)}</td><td>${img('twin/' + r.f)}</td><td>${img(pre + 'C-' + r.f)}</td></tr>`),
    '</table>',
  ].join('\n'));
  console.log(`${deck.padEnd(26)} ${String(n).padStart(3)} slides  A=${fmt(avg('A')).padStart(7)}  B=${fmt(avg('B')).padStart(7)}  C=${fmt(avg('C')).padStart(7)}`);
}
writeFileSync(join(resRoot, `${convDir === 'conv' ? '' : 'bin-'}summary.json`), JSON.stringify(summary, null, 1));
for (const e of errors.slice(0, 10)) console.log('  ERR', e);
await browser.close();
server.close();
