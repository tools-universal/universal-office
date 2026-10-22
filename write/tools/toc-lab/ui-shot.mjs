// Conferência da interface da frente Sumário no Chromium headless (sem janela):
// serve write/ num servidor próprio (porta livre), abre o demo do editor
// (demo/bundle.js recompilado por `npm run build:demo`, que NÃO se commita),
// roda um cenário e grava capturas em %TEMP%/toc-shots.
//
//   node write/tools/toc-lab/ui-shot.mjs <cenário> [--lang en|pt] [--width 1440] [--toolbar ribbon|compact]
//
// Cenários: ribbon, gallery, control, custom, options, update, addtext, mark, menu.
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
const out = path.join(tmpdir(), 'toc-shots');
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
const click = async (sel) => { await run(`ed.shadowRoot.querySelector(${JSON.stringify(sel)})?.click();`); await page.waitForTimeout(600); };
// sumário no começo do documento (galeria) e o cursor no título dele
const insertToc = async (id = 'auto2') => {
  await run(`ed.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } }; ed.insertTocTemplate(${JSON.stringify(id)}); ed.selection = { anchor: { para: 0, offset: 2 }, focus: { para: 0, offset: 2 } }; ed.paint();`);
  await page.waitForTimeout(800);
};

if (scenario === 'ribbon') {
  await tab('References', 'Referências'); await shot('referencias');
} else if (scenario === 'gallery') {
  await tab('References', 'Referências'); await click('[data-a="toc:menu"]'); await page.waitForTimeout(800); await shot('galeria');
} else if (scenario === 'control') {
  await insertToc();
  await run('ed.scrollTo?.(0, 0);');
  await page.waitForTimeout(500);
  await shot('controle');
} else if (scenario === 'control-click' || scenario === 'control-menu') {
  // clique na aba do controle (o botão Atualizar Sumário… ou o do menu da galeria)
  await insertToc();
  const at = await run('const g = ed.tocTabGeom(); const rc = ed.canvases[g.pg].getBoundingClientRect(); const k = 96 / 1440 * ed.zoom; const r = ' + (scenario === 'control-click' ? 'g.update' : 'g.menu') + '; return { x: rc.left + (r[0] + r[2] / 2) * k, y: rc.top + (r[1] + r[3] / 2) * k };');
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(900); await shot('clique');
} else if (scenario === 'custom') {
  await tab('References', 'Referências'); await click('[data-a="toc:menu"]');
  await run('[...document.querySelectorAll(".uo-menu-item"), ...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /Personalizado|Custom/.test(b.textContent))?.click();');
  await page.waitForTimeout(800); await shot('dialogo');
} else if (scenario === 'options') {
  await tab('References', 'Referências'); await click('[data-a="toc:menu"]');
  await run('[...document.querySelectorAll(".uo-menu-item"), ...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /Personalizado|Custom/.test(b.textContent))?.click();');
  await page.waitForTimeout(600);
  await run('[...ed.shadowRoot.querySelectorAll("button"), ...document.querySelectorAll("button")].find((b) => /^(Opções…|Options…)$/.test(b.textContent))?.click();');
  await page.waitForTimeout(800); await shot('opcoes');
} else if (scenario === 'update') {
  await insertToc();
  await tab('References', 'Referências'); await click('[data-a="toc"]'); await shot('pergunta');
} else if (scenario === 'addtext') {
  await tab('References', 'Referências'); await click('[data-a="toc:addText"]'); await page.waitForTimeout(500); await shot('menu');
} else if (scenario === 'mark') {
  await page.keyboard.press('Alt+Shift+O'); await page.waitForTimeout(800); await shot('dialogo');
} else if (scenario === 'mark-mac') {
  // Mac: Option+Shift+O gera 'Ø' em event.key; o atalho casa pela tecla física (event.code)
  await run('const t = ed.shadowRoot.activeElement ?? ed; t.dispatchEvent(new KeyboardEvent("keydown", { key: "Ø", code: "KeyO", altKey: true, shiftKey: true, bubbles: true, composed: true, cancelable: true }));');
  await page.waitForTimeout(800); await shot('dialogo');
} else if (scenario === 'menu') {
  await run('[...ed.shadowRoot.querySelectorAll(".uo-mbtn")].find((b) => /^(Insert|Inserir)$/.test(b.textContent.trim()))?.click();');
  await page.waitForTimeout(400);
  await run('[...document.querySelectorAll(".uo-menu-item"), ...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /^(Sumário|Table of contents)$/.test(b.querySelector(".lb")?.textContent.trim() ?? ""))?.click();');
  await page.waitForTimeout(900); await shot('inserir');
}
if (logs.length) console.log('ERROS:', logs.slice(0, 5).join('\n'));
await browser.close();
server.close();
