// Conferência da frente Layout do texto no navegador (Chromium headless, sem
// janela): abre o demo do editor (servidor do demo no ar, porta 8099 — launch.json
// "write-demo"), roda um cenário e grava capturas em %TEMP%/textlayout-shots.
//
//   node tools/textlayout-lab/ui-shot.mjs <cenário> [--lang en|pt] [--width 1440] [--toolbar ribbon|compact]
//
// Cenários: tab (guia Layout), menus (Hifenização e Números de Linha abertos),
// lnnum (numeração ligada na página), spin (caixas Recuar/Espaçamento),
// paragraph (Parágrafo › Quebras de linha e de página), page (Configurar Página ›
// Layout e Números de Linha), hyph (Opções de Hifenização e Hifenização Manual),
// compact (menu Ferramentas da barra compacta).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] ?? 'tab';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', scenario === 'compact' ? 'compact' : 'ribbon');
const out = path.join(tmpdir(), 'textlayout-shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
await page.goto(`http://localhost:8099/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
const shot = async (name, clip) => {
  const f = path.join(out, `${scenario}-${name}-${lang}-${width}.png`);
  await page.screenshot({ path: f, ...(clip ? { clip } : {}) });
  console.log(f);
};
const ed = 'document.querySelector("universal-write")';
const run = (js) => page.evaluate(`(async () => { const ed = ${ed}; ${js} })()`);
const q = (sel) => run(`return !!ed.shadowRoot.querySelector(${JSON.stringify(sel)});`);
const click = (sel) => run(`ed.shadowRoot.querySelector(${JSON.stringify(sel)})?.click();`);
await run(`ed.enableEditing(); ed.setAttribute("lang", ${JSON.stringify(lang)}); ed.setAttribute("toolbar", ${JSON.stringify(toolbar)});`);
await page.waitForTimeout(800);
const tab = async (en, pt) => { await run(`[...ed.shadowRoot.querySelectorAll(".uo-tab")].find((t) => t.textContent === ${JSON.stringify(pt)} || t.textContent === ${JSON.stringify(en)})?.click();`); await page.waitForTimeout(300); };
const TOP = { x: 0, y: 0, width, height: 200 };

if (scenario === 'tab') {
  await tab('Layout', 'Layout');
  await shot('ribbon', TOP);
  console.log(JSON.stringify(await run(`return ["lineNumbers","hyphenation","indent:left","indent:right","spacing:before","spacing:after"].map((a) => { const e = ed.shadowRoot.querySelector('[data-a="' + a + '"]'); return [a, !!e && !e.hidden, e?.querySelector?.("input")?.value ?? null]; });`)));
  await tab('Design', 'Design');
  await shot('design', TOP);
} else if (scenario === 'menus') {
  await tab('Layout', 'Layout');
  await click('[data-a="lineNumbers"]');
  await page.waitForTimeout(400);
  await shot('lnmenu', { x: 0, y: 0, width, height: 420 });
  await page.keyboard.press('Escape');
  await click('[data-a="hyphenation"]');
  await page.waitForTimeout(400);
  await shot('hyphmenu', { x: 0, y: 0, width, height: 420 });
} else if (scenario === 'lnnum') {
  await run('ed.setLineNumbering("continuous");');
  await page.waitForTimeout(1200);
  await shot('page');
  console.log(JSON.stringify(await run('return ed.getLineNumbering();')));
} else if (scenario === 'spin') {
  await tab('Layout', 'Layout');
  await click('[data-a="spacing:after"] .uo-spin-arrow');
  await page.waitForTimeout(500);
  console.log(JSON.stringify(await run('return ed.getParagraphLayout();')));
  await run('const i = ed.shadowRoot.querySelector(\'[data-a="indent:left"] input\'); i.focus(); i.value = "1,5"; i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));');
  await page.waitForTimeout(500);
  console.log(JSON.stringify(await run('return ed.getParagraphLayout();')));
  await shot('ribbon', TOP);
} else if (scenario === 'paragraph') {
  await run('ed.shadowRoot.querySelector(".uo-launch, [data-a=\\"dlg:paragraph\\"]")?.click();');
  await run('const r = ed.shadowRoot; [...r.querySelectorAll(".uo-dtab")].find((b) => /Quebras|Breaks/.test(b.textContent))?.click();');
  await page.waitForTimeout(400);
  await shot('breaks');
} else if (scenario === 'page') {
  await tab('Layout', 'Layout');
  await click('[data-a="lineNumbers"]');
  await page.waitForTimeout(300);
  await run('[...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /Op..es de Numera|Line Numbering Options/.test(b.textContent))?.click();');
  await page.waitForTimeout(500);
  await shot('setup-layout');
  await run('[...ed.shadowRoot.querySelectorAll(".uo-dialog .uo-pill")].find((b) => /N.meros de Linha|Line Numbers/.test(b.textContent))?.click();');
  await page.waitForTimeout(500);
  await shot('linenumbers');
} else if (scenario === 'hyph') {
  await tab('Layout', 'Layout');
  await click('[data-a="hyphenation"]');
  await page.waitForTimeout(300);
  await run('[...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /Op..es de Hifeniza|Hyphenation Options/.test(b.textContent))?.click();');
  await page.waitForTimeout(500);
  await shot('options');
  await run('[...ed.shadowRoot.querySelectorAll(".uo-dialog .uo-pill")].find((b) => /Manual/.test(b.textContent))?.click();');
  await page.waitForTimeout(3000);
  await shot('manual');
} else if (scenario === 'compact') {
  await run('[...ed.shadowRoot.querySelectorAll(".uo-mbtn")].find((b) => /Ferramentas|Tools/.test(b.textContent))?.click();');
  await page.waitForTimeout(300);
  await run('[...ed.shadowRoot.querySelectorAll(".uo-menu-item")].find((b) => /Hifeniza|Hyphenation/.test(b.textContent))?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));');
  await page.waitForTimeout(400);
  await shot('tools', { x: 0, y: 0, width, height: 600 });
}
if (logs.length) console.log('ERROS:\n' + logs.join('\n'));
await browser.close();
