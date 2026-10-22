// Conferência da interface da frente Página num Chromium headless (sem janela):
// empacota o demo do editor numa pasta temporária (não toca nos bundles
// versionados), serve o repositório e roda um cenário pelas barras — guia Design
// (Marca-d'Água, Cor da Página, Efeitos de Preenchimento), Inserir › Folha de
// Rosto / Página em Branco e os menus da barra compacta. Capturas em
// %TEMP%/page-shots.
//
//   node tools/page-lab/ui-shot.mjs [design|fill|watermark|cover|compact|all] [--lang en|pt] [--width 1440]
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] && !args[0].startsWith('--') ? args[0] : 'all';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const out = path.join(tmpdir(), 'page-shots');
mkdirSync(out, { recursive: true });

// demo empacotado à parte
const bdir = path.join(tmpdir(), 'uw-page-ui');
const ed = path.join(ROOT, 'write', 'packages');
await build({
  entryPoints: [path.join(ed, 'editor', 'demo', 'main.ts')],
  bundle: true, format: 'esm', splitting: true, logLevel: 'warning', outdir: bdir,
  entryNames: 'bundle', chunkNames: 'chunks/[name]-[hash]',
  alias: {
    '@universal-office/docx-core': path.join(ed, 'docx-core', 'src', 'index.ts'),
    '@universal-office/docx-layout': path.join(ed, 'docx-layout', 'src', 'index.ts'),
    '@universal-office/drawingml': path.join(ROOT, 'shared', 'drawingml', 'src', 'index.ts'),
    '@universal-office/fonts': path.join(ROOT, 'shared', 'fonts', 'src', 'index.ts'),
    '@universal-office/ui': path.join(ROOT, 'shared', 'ui', 'src', 'index.ts'),
    '@universal-office/collation': path.join(ROOT, 'sheet', 'packages', 'calc', 'src', 'collation.ts'),
    '@universal-office/compare': path.join(ed, 'compare', 'src', 'index.ts'),
    '@universal-office/spell': path.join(ROOT, 'shared', 'spell', 'src', 'index.ts'),
  },
});
const DEMO = '/write/packages/editor/demo/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  let file = path.normalize(path.join(ROOT, p));
  if (p.startsWith(DEMO) && (p.endsWith('/bundle.js') || p.includes('/chunks/'))) file = path.join(bdir, p.slice(DEMO.length));
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
const shot = async (name) => {
  const f = path.join(out, `${name}-${lang}-${width}.png`);
  await page.screenshot({ path: f });
  console.log(f);
};
const run = (js) => page.evaluate(`(async () => { const ed = document.querySelector("universal-write"); const $ = (s) => ed.shadowRoot.querySelector(s); const $$ = (s) => [...ed.shadowRoot.querySelectorAll(s)]; ${js} })()`);
const wait = (ms) => page.waitForTimeout(ms);
const open = async (toolbar) => {
  await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
  await page.goto(`${base}${DEMO}index.html?lang=${lang}`);
  await page.waitForFunction(() => !!document.querySelector('universal-write')?.shadowRoot, null, { timeout: 30000 });
  await wait(2500);
  await run(`ed.enableEditing(); ed.setAttribute("lang", ${JSON.stringify(lang)}); ed.setAttribute("toolbar", ${JSON.stringify(toolbar)});`);
  await wait(800);
};
const tab = (id) => run(`$('[data-tab="${id}"]')?.click();`);
const click = (a) => run(`const b = $('[data-a="${a}"]'); if (!b) throw new Error('sem ${a}'); b.click();`);

const all = scenario === 'all';
await open('ribbon');
if (all || scenario === 'design') {
  await tab('design'); await wait(400); await shot('design-tab');
  await click('watermark:menu'); await wait(800); await shot('watermark-gallery');
  await run(`$('[data-watermark]')?.click();`); await wait(800); await shot('watermark-applied');
  await tab('design'); await click('pageColor:menu'); await wait(500); await shot('pagecolor-menu');
  await run(`$$('.uw-page-color .uo-colors button')[24]?.click();`); await wait(800); await shot('pagecolor-applied');
}
if (all || scenario === 'fill') {
  await tab('design'); await click('pageColor:menu'); await wait(300); await click('dlg:pageFill'); await wait(600); await shot('fill-gradient');
  await run(`$('dialog[open] input[name="cmode"][value="two"]').click(); $('dialog[open] input[name="cmode"][value="two"]').dispatchEvent(new Event('change', { bubbles: true }));
    const s = $('dialog[open] input[name="gstyle"][value="fromCenter"]'); s.click(); s.dispatchEvent(new Event('change', { bubbles: true }));`);
  await wait(300); await shot('fill-gradient-center');
  await run(`$$('dialog[open] .uo-dtab')[2].click();`); await wait(300); await shot('fill-pattern');
  await run(`$$('dialog[open] .uo-dtabs-panes canvas')[0]; const cs = $$('dialog[open] .uo-dtab-pane:not(.uo-off) canvas'); cs[10]?.click();`); await wait(200);
  await run(`$('dialog[open] [data-action="ok"]').click();`); await wait(1200); await shot('fill-pattern-applied');
}
if (all || scenario === 'watermark') {
  await tab('design'); await click('watermark:menu'); await wait(500); await click('dlg:watermark'); await wait(600); await shot('watermark-dialog');
  await run(`const t = $('dialog[open] input[name="wmkind"][value="text"]'); t.click(); t.dispatchEvent(new Event('change', { bubbles: true }));
    const x = $('dialog[open] input[name="wmtext"]'); x.value = 'MODELO'; const h = $('dialog[open] input[name="wmlayout"][value="horizontal"]'); h.click();`);
  await wait(200); await shot('watermark-dialog-text');
  await run(`$('dialog[open] [data-action="ok"]').click();`); await wait(1200); await shot('watermark-custom-applied');
}
if (all || scenario === 'cover') {
  await tab('insert'); await wait(300); await shot('insert-tab');
  await click('cover:menu'); await wait(1000); await shot('cover-gallery');
  await run(`$$('[data-cover]')[1]?.click();`); await wait(1500); await shot('cover-applied');
}
if (all || scenario === 'compact') {
  await run(`ed.setAttribute("toolbar", "compact");`); await wait(800);
  await run(`$('[data-menu="format"]').click();`); await wait(400);
  await click('background'); await wait(400); await shot('compact-format-background');
  await run(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));`);
  await run(`$('[data-menu="insert"]').click();`); await wait(400); await shot('compact-insert');
}
if (scenario === 'fonts') { // fonte da marca-d'água (depuração)
  await run(`ed.setWatermark('confidential1');`); await wait(1500);
  console.log(await run(`return JSON.stringify({ wm: ed.watermark(), faces: [...document.fonts].map((f) => f.family + ':' + f.status) });`));
  console.log(await run(`const r = ed.fontResolver.getWithFile('calibri'), R = ed.fontResolver.getWithFile('Calibri');
    return JSON.stringify({ lower: r && { src: r.source, css: r.cssFamily, faces: Object.keys(r.faces) }, upper: R && { src: R.source, css: R.cssFamily, faces: Object.keys(R.faces) },
      reg: ed.fonts.families(), attempted: [...ed.engFontsAttempted], applied: [...ed.appliedFonts], loaded: [...ed.loadedFamilyNames] });`));
  await shot('fonts');
  await run(`ed.setWatermark({ kind: 'text', text: 'Calibri', font: 'Calibri', color: 'C0C0C0', semitransparent: true, layout: 'horizontal' });`); await wait(3000);
  await shot('fonts-Calibri');
  await run(`ed.setWatermark({ kind: 'text', text: 'carlito', font: 'Carlito', color: 'C0C0C0', semitransparent: true, layout: 'horizontal' });`); await wait(3000);
  await shot('fonts-Carlito');
}
console.log('erros:', logs.length ? logs.join('\n') : 'nenhum');
await browser.close();
server.close();
