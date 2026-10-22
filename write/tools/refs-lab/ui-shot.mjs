// Conferência da interface da frente Links e referências no Chromium headless
// (sem janela): serve write/ num servidor próprio (porta livre), abre o demo do
// editor (demo/bundle.js recompilado por `npm run build:demo`, que NÃO se
// commita), roda um cenário e grava capturas em %TEMP%/refs-shots.
//
//   node tools/refs-lab/ui-shot.mjs <cenário> [--lang en|pt] [--width 1440] [--toolbar ribbon|compact]
//
// Cenários: ribbon, bookmark, crossref, caption, tof, link, marks.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WRITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = path.resolve(WRITE, '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] ?? 'ribbon';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', 'ribbon');
const out = path.join(tmpdir(), 'refs-shots');
mkdirSync(out, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = path.normalize(path.join(WRITE, decodeURIComponent(url.pathname)));
  if (!p.startsWith(WRITE) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
await page.goto(`${base}/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
const shot = async (name) => {
  const f = path.join(out, `${scenario}-${name}-${lang}-${toolbar}-${width}.png`);
  await page.screenshot({ path: f });
  console.log(f);
};
const ed = 'document.querySelector("universal-write")';
const run = (js) => page.evaluate(`(async () => { const ed = ${ed}; ${js} })()`);
await run('ed.enableEditing(); ed.setAttribute("lang", ' + JSON.stringify(lang) + '); ed.setAttribute("toolbar", ' + JSON.stringify(toolbar) + ');');
await page.waitForTimeout(800);
const tab = async (en, pt) => { await run(`[...ed.shadowRoot.querySelectorAll(".uo-tab")].find((t) => t.textContent === ${JSON.stringify(pt)} || t.textContent === ${JSON.stringify(en)})?.click();`); await page.waitForTimeout(300); };
const click = async (sel) => { await run(`ed.shadowRoot.querySelector(${JSON.stringify(sel)})?.click();`); await page.waitForTimeout(500); };
const cmd = async (id) => { await run(`ed.shadowRoot.querySelector('[data-a="${id}"]')?.click();`); await page.waitForTimeout(600); };

if (scenario === 'ribbon') {
  await tab('Insert', 'Inserir'); await shot('inserir');
  await tab('References', 'Referências'); await shot('referencias');
} else if (scenario === 'bookmark') {
  await run('ed.search("Recuo deslocado"); ed.goToSearchResult(0); ed.clearSearch(); ed.insertBookmark("Recuo"); ed.insertBookmark("Alfa");');
  await tab('Insert', 'Inserir'); await cmd('bookmark'); await shot('dialogo');
} else if (scenario === 'marks') {
  await run('ed.search("Recuo deslocado"); ed.goToSearchResult(0); ed.clearSearch(); ed.insertBookmark("Recuo"); ed.showBookmarks(true);');
  await page.waitForTimeout(600);
  await shot('colchetes');
} else if (scenario === 'crossref') {
  await tab('References', 'Referências'); await cmd('crossref'); await shot('dialogo');
} else if (scenario === 'caption') {
  await tab('References', 'Referências'); await cmd('caption'); await shot('dialogo');
} else if (scenario === 'tof') {
  await tab('References', 'Referências'); await cmd('tof'); await shot('dialogo');
} else if (scenario === 'link') {
  await tab('Insert', 'Inserir'); await cmd('link'); await shot('web');
  await run('[...ed.shadowRoot.querySelectorAll(".uo-dialog .uo-pill")].find((b) => /neste documento|this document/i.test(b.textContent))?.click();');
  await page.waitForTimeout(300); await shot('neste-doc');
}
if (logs.length) console.log('erros:', logs.slice(0, 8));
await browser.close();
server.close();
