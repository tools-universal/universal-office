// Roda o <universal-write> (headless, Playwright) sobre o corpus e grava, por
// documento, em LAB_DIR/ours/<id>/:
//   canvas-p<N>.png  — página N do canvas a 96 dpi
//   js.pdf           — exportPdf() do documento sem edições: lê os bytes
//                      ORIGINAIS (o caminho do motor puro, run-engine)
//   live.pdf         — exportPdf() do estado VIVO (o modelo de edição → motor):
//                      o mesmo documento que o canvas pinta
//   info.json        — páginas, fontes resolvidas (origem), tempos, erros
//
// Fontes do SO pela ponte do host (system-fonts.cjs), como no shell Electron.
// Sem janelas: Chromium headless.
//
// Uso: node tools/corpus-lab/run-ours.mjs [--only id,id] [--tenant N] [--limit N]
//        [--from N] [--workers 4] [--no-canvas] [--no-pdf] [--no-live] [--force] [--tag nome]
//        [--electron]   (runtime do shell Electron, janelas ocultas)
//        [--markup none] [--probe sonda.js]
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
// --markup none|simple|all|original: modo de exibição das revisões (as referências
// do corpus são o PDF do Word "sem marcação"; o editor abre em Todas as Marcações)
const MARKUP = opt('markup', undefined);
// --probe arquivo.js: expressão avaliada na página depois de abrir (window.lab.el()
// é o elemento); o resultado vai para info.probe
const PROBE = opt('probe') ? readFileSync(opt('probe'), 'utf8') : undefined;

// ── bundle do harness ──
// (uma pasta por tag: duas rodadas em paralelo, de worktrees diferentes, não se pisam)
const buildDir = join(LAB_DIR, '.harness', TAG);
mkdirSync(buildDir, { recursive: true });
const ed = join(writeRoot, 'packages');
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning', sourcemap: 'inline',
  outfile: join(buildDir, 'harness.bundle.js'),
  alias: {
    '@universal-office/docx-core': join(ed, 'docx-core', 'src', 'index.ts'),
    '@universal-office/docx-layout': join(ed, 'docx-layout', 'src', 'index.ts'),
    '@universal-office/fonts': join(repoRoot, 'shared', 'fonts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(repoRoot, 'shared', 'drawingml', 'src', 'index.ts'),
    '@universal-office/ui': join(repoRoot, 'shared', 'ui', 'src', 'index.ts'),
    '@universal-office/collation': join(repoRoot, 'sheet', 'packages', 'calc', 'src', 'collation.ts'),
    '@universal-office/spell-sources': join(repoRoot, 'shared', 'spell', 'src', 'sources.ts'),
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

// --electron: o runtime do shell (Electron do write/apps/electron) em janelas OCULTAS;
// sem a opção, Chromium headless do Playwright
const ELECTRON = flag('electron');
let browser, context, eapp;
if (ELECTRON) {
  const { _electron } = require('playwright');
  const requireApp = createRequire(join(writeRoot, 'apps', 'electron', 'package.json'));
  eapp = await _electron.launch({ executablePath: requireApp('electron'), args: [join(here, 'electron-lab-main.cjs')] });
  context = eapp.context();
} else {
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu-sandbox'] });
  context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1500, height: 1100 } });
}
await context.exposeFunction('__labListFonts', () => listFontFamilies());
await context.exposeFunction('__labResolveFonts', (families) => resolveRefs(families));

/** janela oculta do Electron (1500×1100, escala 1) como página do Playwright — uma por
 *  vez (o evento 'window' não diz de quem é a janela) */
let windowLock = Promise.resolve();
function electronPage() {
  const p = windowLock.then(createElectronPage);
  windowLock = p.catch(() => {});
  return p;
}
async function createElectronPage() {
  const [page] = await Promise.all([
    eapp.waitForEvent('window'),
    eapp.evaluate(({ BrowserWindow }) => {
      const w = new BrowserWindow({ show: false, width: 1500, height: 1100, paintWhenInitiallyHidden: true, webPreferences: { backgroundThrottling: false, zoomFactor: 1 } });
      w.loadURL('about:blank');
    }),
  ]);
  return page;
}

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${what}`)), ms))]);

async function newPage() {
  const page = ELECTRON ? await electronPage() : await context.newPage();
  page.on('pageerror', (e) => { page.__errors?.push(String(e).slice(0, 300)); });
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') page.__errors?.push(`[${m.type()}] ${m.text()}`.slice(0, 600)); });
  // o console do 404 não diz o endereço
  page.on('response', (r) => { if (r.status() >= 400) page.__errors?.push(`[http ${r.status()}] ${r.url().replace(base, '')}`.slice(0, 300)); });
  await page.goto(`${base}/__lab/harness.html`);
  await page.waitForFunction(() => !!window.lab);
  return page;
}

/** data de criação do PDF do Word (campos DATE/TIME do documento) */
function wordPdfDate(pdfPath) {
  try {
    const head = readFileSync(pdfPath).toString('latin1');
    const m = /\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(head);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : undefined;
  } catch { return undefined; }
}

/** Grava o último PDF da página em trechos (string do V8 tem limite de ~512 MB). */
async function savePdf(page, size, path) {
  const CH = 48 << 20;
  const parts = [];
  for (let off = 0; off < size; off += CH) {
    parts.push(Buffer.from(await page.evaluate(([o, n]) => window.lab.pdfChunk(o, n), [off, CH]), 'base64'));
  }
  writeFileSync(path, Buffer.concat(parts));
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
      // campos DATE/TIME: o relógio do documento é o do PDF de referência (como no
      // run-engine) — o Word exportou naquele dia
      const when = wordPdfDate(d.pdf);
      // (Date da PÁGINA — o relógio do Playwright é do contexto, compartilhado pelos workers)
      await page.evaluate((t) => {
        const w = window;
        const Real = w.__labRealDate ?? Date;
        w.__labRealDate = Real;
        if (t === null) { w.Date = Real; return; }
        w.Date = class extends Real {
          constructor(...a) { if (a.length) super(...a); else super(t); }
          static now() { return t; }
        };
      }, when ? when.getTime() : null);
      const ts = Date.now();
      try {
        const r = await withTimeout(page.evaluate(([u, m]) => window.lab.open(u, m), [`/__doc/${encodeURIComponent(d.id)}`, MARKUP]), DOC_TIMEOUT, 'open');
        Object.assign(info, { pages: r.pages, fonts: r.fonts, openMs: r.ms });
        if (PROBE) info.probe = await withTimeout(page.evaluate(PROBE), DOC_TIMEOUT, 'probe').catch((e) => `erro: ${e?.message ?? e}`);
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
            const size = await withTimeout(page.evaluate(() => window.lab.pdf()), DOC_TIMEOUT, 'pdf');
            await savePdf(page, size, join(dir, 'js.pdf'));
            info.pdfMs = Date.now() - tp;
          } catch (e) {
            info.pdfError = String(e?.message ?? e).slice(0, 500);
          }
        }
        if (!flag('no-live')) {
          const tp = Date.now();
          try {
            const size = await withTimeout(page.evaluate(() => window.lab.livePdf()), DOC_TIMEOUT, 'live');
            await savePdf(page, size, join(dir, 'live.pdf'));
            info.liveMs = Date.now() - tp;
          } catch (e) {
            info.liveError = String(e?.message ?? e).slice(0, 500);
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
if (ELECTRON) await eapp.close(); else await browser.close();
server.closeAllConnections?.();
server.close();
console.log(`fim: ${done} documentos em ${((Date.now() - t0) / 1000).toFixed(0)}s → ${outRoot}`);
process.exit(0);
