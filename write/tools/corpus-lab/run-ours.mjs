// Roda o <universal-write> (headless, Playwright) sobre o corpus e grava, por
// documento, em LAB_DIR/ours/<id>/:
//   canvas-p<N>.png  — página N do canvas a 96 dpi
//   js.pdf           — exportPdf() (mesmo layout do canvas)
//   info.json        — páginas, fontes resolvidas (origem), tempos, erros
//
// Fontes do SO pela ponte do host (system-fonts.cjs), como no shell Electron.
// Sem janelas: Chromium headless.
//
// Uso: node tools/corpus-lab/run-ours.mjs [--only id,id] [--tenant N] [--limit N]
//        [--from N] [--workers 4] [--no-canvas] [--no-pdf] [--force] [--tag nome]
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, selectDocs, LAB_DIR } from './corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const repoRoot = join(writeRoot, '..');
const require = createRequire(join(repoRoot, 'slides', 'package.json'));
const { chromium } = require('playwright');
const { resolveFonts, listFontFamilies } = require(join(repoRoot, 'shared', 'fonts', 'node', 'system-fonts.cjs'));

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const WORKERS = Number(opt('workers', 4));
const TAG = opt('tag', 'ours');
const DOC_TIMEOUT = Number(opt('timeout', 180_000));
const outRoot = join(LAB_DIR, TAG);

// ── bundle do harness ──
const buildDir = join(LAB_DIR, '.harness');
mkdirSync(buildDir, { recursive: true });
const ed = join(writeRoot, 'packages');
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning', sourcemap: 'inline',
  outfile: join(buildDir, 'harness.bundle.js'),
  alias: {
    '@universal-office/docx-core': join(ed, 'docx-core', 'src', 'index.ts'),
    '@universal-office/layout': join(ed, 'layout', 'src', 'index.ts'),
    '@universal-office/pdf': join(ed, 'pdf', 'src', 'index.ts'),
    '@universal-office/docx-layout': join(ed, 'docx-layout', 'src', 'index.ts'),
    '@universal-office/fonts': join(repoRoot, 'shared', 'fonts', 'src', 'index.ts'),
    '@universal-office/export': join(ed, 'export', 'src', 'index.ts'),
    '@universal-office/odf': join(ed, 'odf', 'src', 'index.ts'),
    '@universal-office/compare': join(ed, 'compare', 'src', 'index.ts'),
  },
});
writeFileSync(join(buildDir, 'harness.html'),
  '<!doctype html><meta charset="utf-8"><body style="margin:0"></body><script type="module" src="/__lab/harness.bundle.js"></script>');

// ── servidor: repo (fontes abertas), harness, documentos e fontes do SO ──
const docs = selectDocs(loadManifest(), argv);
const byId = new Map(docs.map((d) => [d.id, d]));
const fontBlobs = new Map(); // id → Buffer
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (body, type = 'application/octet-stream') => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  try {
    if (url.pathname.startsWith('/__lab/')) {
      const f = join(buildDir, url.pathname.slice(7));
      return send(readFileSync(f), MIME[extname(f)]);
    }
    if (url.pathname.startsWith('/__doc/')) {
      const d = byId.get(decodeURIComponent(url.pathname.slice(7)));
      if (!d) { res.writeHead(404).end(); return; }
      return send(readFileSync(d.path));
    }
    if (url.pathname.startsWith('/__font/')) {
      const b = fontBlobs.get(url.pathname.slice(8));
      if (!b) { res.writeHead(404).end(); return; }
      return send(b, 'font/ttf');
    }
    const path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
    if (!path.startsWith(repoRoot) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(res);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ── ponte de fontes (mesma resposta do main.cjs do Electron; bytes via URL) ──
const faceCache = new Map(); // família(lc) → refs
let nextFont = 0;
async function resolveRefs(families) {
  const out = [];
  for (const fam of families) {
    const key = String(fam).toLowerCase();
    if (!faceCache.has(key)) {
      const faces = await resolveFonts([fam]);
      faceCache.set(key, faces.map(({ bytes, ...f }) => {
        const id = String(nextFont++);
        fontBlobs.set(id, Buffer.from(bytes));
        return { ...f, url: `/__font/${id}` };
      }));
    }
    out.push(...faceCache.get(key).map((f) => ({ ...f, family: String(fam) })));
  }
  return out;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu-sandbox'] });
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1500, height: 1100 } });
await context.exposeFunction('__labListFonts', () => listFontFamilies());
await context.exposeFunction('__labResolveFonts', (families) => resolveRefs(families));

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${what}`)), ms))]);

async function newPage() {
  const page = await context.newPage();
  page.on('pageerror', (e) => { page.__errors?.push(String(e).slice(0, 300)); });
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') page.__errors?.push(`[${m.type()}] ${m.text()}`.slice(0, 600)); });
  await page.goto(`${base}/__lab/harness.html`);
  await page.waitForFunction(() => !!window.lab);
  return page;
}

let done = 0;
const t0 = Date.now();
const queue = [...docs];
async function worker() {
  let page = await newPage();
  for (;;) {
    const d = queue.shift();
    if (!d) break;
    const dir = join(outRoot, d.id);
    if (!flag('force') && existsSync(join(dir, 'info.json'))) { done++; continue; }
    mkdirSync(dir, { recursive: true });
    const info = { id: d.id, rel: d.rel, container: d.container };
    {
      page.__errors = [];
      const ts = Date.now();
      try {
        const r = await withTimeout(page.evaluate((u) => window.lab.open(u), `/__doc/${encodeURIComponent(d.id)}`), DOC_TIMEOUT, 'open');
        Object.assign(info, { pages: r.pages, fonts: r.fonts, openMs: r.ms });
        if (!flag('no-canvas')) {
          const tc = Date.now();
          for (let i = 0; i < r.pages; i++) {
            const url = await withTimeout(page.evaluate((n) => window.lab.page(n), i), DOC_TIMEOUT, `page ${i}`);
            writeFileSync(join(dir, `canvas-p${i + 1}.png`), Buffer.from(url.split(',')[1], 'base64'));
          }
          info.canvasMs = Date.now() - tc;
        }
        if (!flag('no-pdf')) {
          const tp = Date.now();
          try {
            const b64 = await withTimeout(page.evaluate(() => window.lab.pdf()), DOC_TIMEOUT, 'pdf');
            writeFileSync(join(dir, 'js.pdf'), Buffer.from(b64, 'base64'));
            info.pdfMs = Date.now() - tp;
          } catch (e) {
            info.pdfError = String(e?.message ?? e).slice(0, 500);
          }
        }
        info.status = 'ok';
      } catch (e) {
        info.status = 'error';
        info.error = String(e?.message ?? e).slice(0, 800);
        // página pode ter travado/morrido: recria
        try { await page.close(); } catch { /* já morta */ }
        page = await newPage();
      }
      info.totalMs = Date.now() - ts;
      if (page.__errors?.length) info.pageErrors = [...new Set(page.__errors)].slice(0, 20);
    }
    writeFileSync(join(dir, 'info.json'), JSON.stringify(info, null, 1));
    done++;
    if (done % 10 === 0 || info.status !== 'ok') {
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`[${done}/${docs.length} ${el}s] ${d.id} ${info.status}${info.error ? ' — ' + info.error.slice(0, 160) : ''}`);
    }
  }
  await page.close().catch(() => {});
}

await Promise.all(Array.from({ length: Math.min(WORKERS, docs.length) }, worker));
await browser.close();
server.closeAllConnections?.();
server.close();
console.log(`fim: ${done} documentos em ${((Date.now() - t0) / 1000).toFixed(0)}s → ${outRoot}`);
process.exit(0);
