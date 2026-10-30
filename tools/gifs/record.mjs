#!/usr/bin/env node
/**
 * record — grava os GIFs da documentação (site/assets/gifs/<produto>.gif) a
 * partir dos pacotes PUBLICÁVEIS (`npm run build:pkg` antes): cada cena abre
 * uma página mínima que importa `<pacote>/publish/index.js`, como um usuário
 * faria, e roteiriza a interação pela API pública e por cliques na interface.
 *
 * Chromium HEADLESS (Playwright do workspace do Slides): sem janela, sem roubar
 * o foco. Quadros PNG → ffmpeg (paleta em duas passadas) → GIF.
 *
 * Uso: node tools/gifs/record.mjs [cena…]   (sem argumentos: todas)
 * Cenas: document-viewer, write, compare, sheet, presentation-viewer, slides
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync as read } from 'node:fs';
import { reportDocx, salesXlsx } from './samples.mjs';
import { translatePptx } from './translate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'site', 'assets', 'gifs');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');

const W = 960, H = 600, GIF_W = 800;

// ── servidor: o repositório + páginas e documentos gerados em /__gif/ ──────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.ttf': 'font/ttf', '.docx': 'application/octet-stream', '.xlsx': 'application/octet-stream', '.pptx': 'application/octet-stream', '.css': 'text/css' };
const virtual = new Map([
  ['/__gif/report.docx', reportDocx(false)],
  ['/__gif/report-v2.docx', reportDocx(true)],
  ['/__gif/sales.xlsx', salesXlsx()],
  // decks de amostra com os textos em inglês (traduzidos em memória)
  ['/__gif/showcase.pptx', translatePptx(read(path.join(ROOT, 'slides/samples/showcase_animado.pptx')))],
  ['/__gif/reference.pptx', translatePptx(read(path.join(ROOT, 'slides/samples/reference.pptx')))],
]);
const page = (title, body, script = '') => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#fff;font-family:system-ui,sans-serif}</style></head>
<body>${body}<script type="module">${script}</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const v = virtual.get(url);
  if (v !== undefined) {
    res.writeHead(200, { 'content-type': MIME[path.extname(url)] ?? 'text/html' });
    return res.end(v);
  }
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const data = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ── gravação ───────────────────────────────────────────────────────────────────
class Film {
  constructor(pg, name) { this.pg = pg; this.name = name; this.dir = mkdtempSync(path.join(tmpdir(), `uo-gif-${name}-`)); this.frames = []; }
  /** Um quadro que fica `ms` na tela. */
  async hold(ms) {
    const f = path.join(this.dir, `f${String(this.frames.length).padStart(4, '0')}.png`);
    await this.pg.screenshot({ path: f });
    this.frames.push({ f, ms });
  }
  /** Filma `ms` de animação, um quadro a cada `step` ms. */
  async roll(ms, step = 100) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const t0 = Date.now(); await this.hold(step); const left = step - (Date.now() - t0); if (left > 0) await this.pg.waitForTimeout(left); }
  }
  gif() {
    const list = path.join(this.dir, 'list.txt');
    const lines = this.frames.flatMap(({ f, ms }) => [`file '${f.replace(/\\/g, '/')}'`, `duration ${(ms / 1000).toFixed(3)}`]);
    lines.push(`file '${this.frames.at(-1).f.replace(/\\/g, '/')}'`); // o concat ignora a duração do último
    writeFileSync(list, lines.join('\n'));
    mkdirSync(OUT, { recursive: true });
    const out = path.join(OUT, `${this.name}.gif`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf',
      `fps=10,scale=${GIF_W}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      '-loop', '0', out]);
    rmSync(this.dir, { recursive: true, force: true });
    console.log(`record: ${path.relative(ROOT, out)} — ${this.frames.length} quadros, ${(statSync(out).size / 1024).toFixed(0)} KB`);
  }
}

const pub = (dir) => `/${dir}/publish`;
// as fontes abertas saíram dos produtos: vêm do pacote @universal-office/font-files
const FONTS = pub('shared/fonts/packages/font-files');
const SCENES = {};

SCENES['document-viewer'] = async (pg, film) => {
  const P = pub('write/packages/viewer');
  virtual.set('/__gif/document-viewer.html', page('viewer',
    `<universal-document-viewer id="el" lang="en" src="/__gif/report.docx" fonts="${FONTS}" style="display:block;height:100vh"></universal-document-viewer>`,
    `import '${P}/index.js'; const el = document.getElementById('el');
     window.loaded = new Promise((r) => el.addEventListener('udv-loaded', r, { once: true }));`));
  await pg.goto(`${BASE}/__gif/document-viewer.html`);
  await pg.evaluate(() => window.loaded);
  await pg.waitForTimeout(1200);
  const wake = () => pg.mouse.move(W / 2, H - 30);
  const click = async (part) => { await wake(); await pg.locator(`universal-document-viewer [part~="${part}"]`).first().click(); };
  await wake(); await film.hold(1600);
  await click('button-outline'); await film.roll(900);
  await pg.locator('universal-document-viewer [part~="outline-item"]').nth(3).click(); await film.roll(1200);
  await click('button-comments'); await film.roll(900);
  await pg.locator('universal-document-viewer [part~="comment"]').nth(1).click(); await film.roll(1400);
  await click('button-comments');
  await click('button-thumbnails'); await film.roll(1200);
  await click('button-zoom-in'); await film.roll(500); await click('button-zoom-in'); await film.roll(1000);
  await pg.evaluate(() => document.getElementById('el').setView('read')); await film.roll(1500);
};

SCENES.write = async (pg, film) => {
  const P = pub('write/packages/editor');
  virtual.set('/__gif/write.html', page('write',
    `<universal-write id="el" lang="en" fonts="${FONTS}" topbar bottombar style="display:block;height:100vh"></universal-write>`,
    `import '${P}/index.js'; const el = document.getElementById('el');
     window.ready = new Promise((r) => el.addEventListener('uw-ready', r, { once: true }));`));
  await pg.goto(`${BASE}/__gif/write.html`);
  await pg.evaluate(async () => {
    await window.ready;
    const el = document.getElementById('el');
    el.load(new Uint8Array(await (await fetch('/__gif/report.docx')).arrayBuffer()), 'auto', { protected: false });
    el.setZoom(0.9);
    el.focusEditor();
  });
  await pg.waitForTimeout(1500);
  await film.hold(1400);
  // título novo no topo: digita, seleciona a linha e aplica negrito + cor
  await pg.keyboard.press('Control+Home');
  const text = 'Prepared for the board meeting. ';
  for (let i = 0; i < text.length; i += 3) { await pg.keyboard.type(text.slice(i, i + 3)); await film.hold(90); }
  await pg.keyboard.press('Home'); await pg.keyboard.press('Shift+End'); await film.hold(600);
  await pg.locator('universal-write [data-a="bold"]').click(); await film.hold(500);
  await pg.locator('universal-write [data-a="italic"]').click(); await film.hold(700);
  // a barra compacta recolhe o grupo Parágrafo em 960 px: abre o gatilho dele (ou o "⋮")
  const center = pg.locator('universal-write [data-a="align:center"]');
  if (!(await center.isVisible())) {
    const trig = pg.locator('universal-write .uo-trig[data-g="para"]');
    await ((await trig.count()) ? trig : pg.locator('universal-write [data-a="more"]')).click();
    await film.hold(600);
  }
  await center.click(); await film.hold(900);
  await pg.keyboard.press('End');
  await pg.locator('universal-write [data-a="zoomout"]').click(); await film.hold(300);
  await pg.locator('universal-write [data-a="zoomout"]').click(); await film.hold(300);
  await pg.locator('universal-write [data-a="zoomout"]').click(); await film.hold(1200);
  await pg.locator('universal-write [data-a="view:read"]').click(); await film.roll(1500);
  await pg.locator('universal-write [data-a="view:print"]').click(); await film.roll(800);
};

SCENES.compare = async (pg, film) => {
  const P = pub('write/packages/compare');
  virtual.set('/__gif/compare.html', page('compare',
    `<universal-write-diff id="el" lang="en" left-label="Q3 report" right-label="Q3 report (revised)" style="display:flex;height:100vh"></universal-write-diff>`,
    `import '${P}/index.js'; const el = document.getElementById('el');
     const get = async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer());
     window.ready = new Promise((r) => el.addEventListener('ready', r, { once: true }));
     el.loadPair(await get('/__gif/report.docx'), await get('/__gif/report-v2.docx'));`));
  await pg.goto(`${BASE}/__gif/compare.html`);
  await pg.evaluate(() => window.ready);
  await pg.waitForTimeout(500);
  await film.hold(2000);
  const body = pg.locator('universal-write-diff .uwd-body');
  for (let i = 0; i < 6; i++) { await body.evaluate((b) => b.scrollBy(0, 110)); await film.hold(160); }
  await film.hold(1400);
  await body.evaluate((b) => b.scrollTo(0, 0));
  await pg.locator('universal-write-diff .uwd-header button').first().click(); await film.hold(2200);
};

SCENES.sheet = async (pg, film) => {
  const P = pub('sheet/packages/sheet');
  virtual.set('/__gif/sheet.html', page('sheet',
    `<universal-sheet id="el" lang="en" formula-locale="en-US" style="display:block;height:100vh"></universal-sheet>`,
    `import { FontResolver } from '${P}/index.js';
     FontResolver.shared().configure({ baseUrl: '${FONTS}' });
     const el = document.getElementById('el');
     el.loadXlsx(new Uint8Array(await (await fetch('/__gif/sales.xlsx')).arrayBuffer()));
     el.setZoom(1.6);
     await el.drawingsReady(); window.ready = true;`));
  await pg.goto(`${BASE}/__gif/sheet.html`);
  await pg.waitForFunction(() => window.ready === true);
  await pg.waitForTimeout(600);
  const go = (ref) => pg.evaluate((r) => document.getElementById('el').goToRef(r), ref);
  const type = async (t, step = 2) => { for (let i = 0; i < t.length; i += step) { await pg.keyboard.type(t.slice(i, i + step)); await film.hold(90); } };
  await pg.mouse.click(W - 60, H - 60); // foco no canvas
  await go('A1'); await film.hold(1300);
  // a linha 4 já tem a fórmula do total: digitar os dados faz o total aparecer
  await go('A4');
  for (const [t, key] of [['Keyboard', 'Tab'], ['8', 'Tab'], ['45', 'Enter']]) { await type(t); await pg.keyboard.press(key); await film.hold(350); }
  await go('D4'); await film.hold(1300);
  // mudar uma quantidade recalcula a linha e o total
  await go('B2'); await film.hold(500);
  await type('4', 1); await pg.keyboard.press('Enter'); await film.hold(300);
  await go('D6'); await film.hold(1500);
  // fórmula nova com o autocompletar de funções
  await go('F2'); await film.hold(300);
  await type('=AVE', 1); await film.hold(900);
  await type('RAGE(D2:D4)', 2); await pg.keyboard.press('Enter'); await film.hold(300);
  await go('F2'); await film.hold(2000);
};

SCENES['presentation-viewer'] = async (pg, film) => {
  const P = pub('slides/packages/viewer');
  virtual.set('/__gif/presentation-viewer.html', page('viewer',
    `<universal-presentation-viewer id="el" lang="en" src="/__gif/showcase.pptx" fonts="${FONTS}" style="display:block;height:100vh"></universal-presentation-viewer>`,
    `import '${P}/index.js'; const el = document.getElementById('el');
     window.loaded = new Promise((r) => el.addEventListener('us-loaded', r, { once: true }));`));
  await pg.goto(`${BASE}/__gif/presentation-viewer.html`);
  await pg.evaluate(async () => { await window.loaded; await document.getElementById('el').fontsReady(); });
  await pg.waitForTimeout(800);
  await pg.mouse.move(W / 2, H - 30); await film.hold(1500);
  await pg.evaluate(() => document.getElementById('el').play({ from: 0, defaultSlideMs: 1600 }));
  await film.roll(9000, 100);
  await pg.evaluate(() => document.getElementById('el').stopPlayback());
  for (const i of [3, 5, 7, 9]) { await pg.evaluate((k) => document.getElementById('el').selectSlide(k), i); await pg.waitForTimeout(400); await film.hold(1300); }
  await pg.mouse.move(W / 2, H - 30);
  await pg.locator('universal-presentation-viewer [part~="button-thumbnails"]').click(); await film.roll(1600);
};

SCENES.slides = async (pg, film) => {
  const P = pub('slides/packages/slides');
  virtual.set('/__gif/slides.html', page('slides',
    `<universal-slides id="el" lang="en" fonts="${FONTS}" style="display:block;height:100vh"></universal-slides>`,
    `import '${P}/index.js'; const el = document.getElementById('el');
     el.loadPptx(new Uint8Array(await (await fetch('/__gif/reference.pptx')).arrayBuffer()));
     await el.fontsReady(); window.ready = true;`));
  await pg.goto(`${BASE}/__gif/slides.html`);
  await pg.waitForFunction(() => window.ready === true);
  await pg.waitForTimeout(800);
  await film.hold(1500);
  const n = await pg.evaluate(() => document.getElementById('el').getSlideCount());
  for (let i = 1; i < Math.min(n, 4); i++) { await pg.evaluate((k) => document.getElementById('el').selectSlide(k), i); await film.hold(1100); }
  await pg.evaluate(() => document.getElementById('el').selectSlide(0)); await film.hold(900);
  await pg.evaluate(() => document.getElementById('el').beginEditShape(0)); await film.hold(700);
  await pg.keyboard.press('Control+A');
  const text = 'Universal Slides — edited in place';
  for (let i = 0; i < text.length; i += 3) { await pg.keyboard.type(text.slice(i, i + 3)); await film.hold(90); }
  await film.hold(600);
  await pg.keyboard.press('Enter'); await film.hold(2200);
};

// ── execução ───────────────────────────────────────────────────────────────────
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
const browser = await chromium.launch();
try {
  for (const name of names) {
    if (!SCENES[name]) throw new Error(`cena desconhecida: ${name}`);
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'en-US', deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', (e) => errors.push(String(e)));
    const film = new Film(pg, name);
    try {
      await SCENES[name](pg, film);
      film.gif();
    } catch (e) {
      console.error(`record: ${name} falhou — ${e.message.split('\n')[0]}`);
      process.exitCode = 1;
    }
    if (errors.length) console.error(`record: ${name} — erros na página:\n  ${errors.join('\n  ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
