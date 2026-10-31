// Regressão do RENDER estático: pinta todo slide de todo deck de samples/
// (.pptx, .ppt de playback/ e legacy/) no <universal-slides-viewer>
// headless e grava .regress/<tag>/<deck>/slideN.png (fora do git).
//
//  - Divergência × PowerPoint quando há referência em cache
//    (results/stress/<deck>/ppt/slideN.png) — mesma métrica do compare-deck.
//  - Com --base <tag>: diff pixel a pixel nosso × nosso contra a rodada base;
//    lista todo slide que mudou (com diff PNG em .regress/<tag>/_diff/) e a
//    variação da divergência × PowerPoint. Nada muda => "sem diferença".
//
// Não toca em arquivos versionados (bundle e HTML próprios em .regress/) e usa
// porta própria (8139), servindo ESTE checkout. Sem janelas (headless).
//
// Uso: node tools/ppt-lab/regress.mjs <tag> [--base <tag>] [--only sub1,sub2]
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { PNG } from 'pngjs';
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const work = join(here, '.regress');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const baseTag = opt('base');
const only = (opt('only') ?? '').split(',').filter(Boolean);
const tag = args[0];
if (!tag) { console.error('uso: regress.mjs <tag> [--base <tag>] [--only sub1,sub2]'); process.exit(1); }
const PORT = 8139;
const TOL = 40;
const DECK_TIMEOUT_MS = 90_000;

// ── decks: samples/*.pptx + samples/playback/*.{pptx,ppt} + samples/legacy/*.ppt ──
const samples = join(slidesRoot, 'samples');
const decks = [];
for (const [dir, re] of [['', /\.pptx$/i], ['playback', /\.pptx?$/i], ['legacy', /\.ppt$/i]]) {
  const abs = join(samples, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).sort()) {
    if (!re.test(f) || !statSync(join(abs, f)).isFile()) continue;
    const rel = dir ? `${dir}/${f}` : f;
    if (only.length && !only.some((s) => rel.includes(s))) continue;
    decks.push({ rel, key: rel.replace(/[\\/]/g, '__'), stem: f.replace(/\.pptx?$/i, ''), isPptx: /\.pptx$/i.test(f), top: !dir });
  }
}

// ── harness próprio (não sobrescreve o harness.bundle.js versionado) ──
mkdirSync(work, { recursive: true });
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning',
  outfile: join(work, 'harness.bundle.js'),
  alias: {
    '@universal-office/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts'),
    '@universal-office/charts': join(slidesRoot, '..', 'shared', 'charts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(slidesRoot, '..', 'shared', 'drawingml', 'src', 'index.ts'),
  },
});
writeFileSync(join(work, 'harness.html'), readFileSync(join(here, 'harness.html'), 'utf8')
  .replace(/url\('\.\/fonts\//g, "url('/tools/ppt-lab/fonts/")
  .replace('./harness.bundle.js', '/tools/ppt-lab/.regress/harness.bundle.js'));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const rootNorm = normalize(slidesRoot + sep);
const server = createServer((req, res) => {
  let path;
  try { path = normalize(join(slidesRoot, decodeURIComponent(new URL(req.url, 'http://x').pathname))); }
  catch { res.writeHead(400).end(); return; }
  if (!path.startsWith(rootNorm)) { res.writeHead(403).end(); return; }
  try {
    statSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(path).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404).end('not found'); }
}).listen(PORT, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch({ headless: true });
let page;
let errors = [];
async function openPage() {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${PORT}/tools/ppt-lab/.regress/harness.html`, { waitUntil: 'networkidle' });
}
await openPage();

function withTimeout(p, ms, what) {
  let timer;
  const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout (${ms} ms): ${what}`)), ms); });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

function readPng(p) { return PNG.sync.read(readFileSync(p)); }
/** % de pixels com delta de canal > tol (tol = -1 conta qualquer diferença). */
function diffPct(a, b, tol, diffPath) {
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const diff = diffPath ? new PNG({ width: w, height: h }) : undefined;
  let bad = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (a.width * y + x) * 4, ib = (b.width * y + x) * 4;
      const d = Math.max(Math.abs(a.data[ia] - b.data[ib]), Math.abs(a.data[ia + 1] - b.data[ib + 1]), Math.abs(a.data[ia + 2] - b.data[ib + 2]));
      const id = (w * y + x) * 4;
      if (d > tol) {
        bad++;
        if (diff) { diff.data[id] = 255; diff.data[id + 1] = 40; diff.data[id + 2] = 40; diff.data[id + 3] = 255; }
      } else if (diff) {
        diff.data[id] = 235 + (b.data[ib] >> 4); diff.data[id + 1] = 235 + (b.data[ib + 1] >> 4); diff.data[id + 2] = 235 + (b.data[ib + 2] >> 4); diff.data[id + 3] = 255;
      }
    }
  }
  if (diff) writeFileSync(diffPath, PNG.sync.write(diff));
  const sizeMismatch = a.width !== b.width || a.height !== b.height;
  return { pct: (100 * bad) / (w * h), bad, sizeMismatch };
}

const outRoot = join(work, tag);
mkdirSync(outRoot, { recursive: true });
const summary = { tag, decks: {} };
const t0 = Date.now();
for (const deck of decks) {
  errors = [];
  const refDir = deck.top ? join(here, 'results', 'stress', deck.stem, 'ppt') : undefined;
  const hasRef = refDir && existsSync(join(refDir, 'slide1.png'));
  const width = hasRef ? readPng(join(refDir, 'slide1.png')).width : 1280;
  const outDir = join(outRoot, deck.key);
  mkdirSync(outDir, { recursive: true });
  const entry = { slides: 0, error: undefined, oracle: hasRef ? [] : undefined, errors: [] };
  const ts = Date.now();
  try {
    const n = await withTimeout(page.evaluate((u) => window.harness.loadDeck(u), `/samples/${deck.rel}`), DECK_TIMEOUT_MS, `load ${deck.rel}`);
    await page.waitForFunction(() => window.harness.pendingImages() === 0, null, { timeout: 15000 }).catch(() => {});
    const canvas = await page.evaluateHandle(() => document.getElementById('cv'));
    for (let i = 0; i < n; i++) {
      await withTimeout(page.evaluate(([k, w]) => window.harness.paintSlide(k, w), [i, width]), DECK_TIMEOUT_MS, `paint ${deck.rel}#${i + 1}`);
      await page.waitForTimeout(80);
      await page.evaluate(([k, w]) => window.harness.paintSlide(k, w), [i, width]);
      const f = `slide${i + 1}.png`;
      writeFileSync(join(outDir, f), await canvas.asElement().screenshot());
      if (hasRef && existsSync(join(refDir, f))) entry.oracle.push(diffPct(readPng(join(outDir, f)), readPng(join(refDir, f)), TOL).pct);
    }
    entry.slides = n;
  } catch (e) {
    entry.error = String(e).slice(0, 300);
    await openPage(); // página pode ter travado
  }
  entry.errors = [...new Set(errors)].slice(0, 10);
  entry.ms = Date.now() - ts;
  summary.decks[deck.key] = entry;
  const orc = entry.oracle?.length ? ` · ×PPT ${(entry.oracle.reduce((s, x) => s + x, 0) / entry.oracle.length).toFixed(2)}%` : '';
  console.log(`${deck.rel}: ${entry.error ? 'ERRO ' + entry.error : entry.slides + ' slides'}${orc} (${entry.ms} ms)${entry.errors.length ? ' · ' + entry.errors.length + ' erro(s) na página' : ''}`);
}
summary.ms = Date.now() - t0;
writeFileSync(join(outRoot, 'summary.json'), JSON.stringify(summary, null, 1));
await browser.close();
server.close();

// ── comparação com a rodada base ──
if (baseTag) {
  const baseRoot = join(work, baseTag);
  const base = JSON.parse(readFileSync(join(baseRoot, 'summary.json'), 'utf8'));
  const diffDir = join(outRoot, '_diff');
  mkdirSync(diffDir, { recursive: true });
  const changed = [];
  const lines = [];
  for (const [key, cur] of Object.entries(summary.decks)) {
    const old = base.decks[key];
    if (!old) { lines.push(`  ${key}: NOVO (sem base)`); continue; }
    if ((old.error ?? '') !== (cur.error ?? '')) lines.push(`  ${key}: erro ${old.error ?? '—'} → ${cur.error ?? '—'}`);
    if (old.slides !== cur.slides) lines.push(`  ${key}: slides ${old.slides} → ${cur.slides}`);
    const newErr = cur.errors.filter((e) => !old.errors.includes(e));
    if (newErr.length) lines.push(`  ${key}: erros novos na página: ${newErr.join(' | ')}`);
    for (let i = 1; i <= Math.min(old.slides, cur.slides); i++) {
      const f = `slide${i}.png`;
      const a = join(outRoot, key, f), b = join(baseRoot, key, f);
      if (!existsSync(a) || !existsSync(b)) continue;
      const any = diffPct(readPng(a), readPng(b), 0);
      if (any.bad === 0 && !any.sizeMismatch) continue;
      const vis = diffPct(readPng(a), readPng(b), TOL, join(diffDir, `${key}__${f}`));
      const o0 = old.oracle?.[i - 1], o1 = cur.oracle?.[i - 1];
      const orc = o0 !== undefined && o1 !== undefined ? ` · ×PPT ${o0.toFixed(2)}% → ${o1.toFixed(2)}% (${o1 - o0 >= 0 ? '+' : ''}${(o1 - o0).toFixed(2)})` : '';
      changed.push(`${key}#${i}`);
      lines.push(`  ${key} slide ${i}: ${any.bad} px diferentes (${vis.bad} acima da tolerância, ${vis.pct.toFixed(3)}%)${orc}`);
    }
  }
  const avg = (s) => { const v = Object.values(s.decks).flatMap((d) => d.oracle ?? []); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN; };
  console.log(`\n== ${tag} × ${baseTag}: ${changed.length} slide(s) mudaram`);
  for (const l of lines) console.log(l);
  console.log(`divergência média × PowerPoint: ${avg(base).toFixed(3)}% → ${avg(summary).toFixed(3)}%`);
  writeFileSync(join(outRoot, 'vs-base.txt'), lines.join('\n') + '\n');
}
console.log(`regress: ${decks.length} decks em ${(summary.ms / 1000).toFixed(0)} s → ${outRoot}`);
