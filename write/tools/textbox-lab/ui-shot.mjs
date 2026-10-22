// Conferência da frente Caixa de texto no navegador (Chromium headless, sem janela):
// abre o demo do editor (servidor do demo já no ar, porta 8099 — launch.json
// "write-demo"), insere uma caixa pela galeria, formata pela guia Formato da Forma e
// grava capturas em %TEMP%/tbx-shots. Termina com o resumo (erros do console e o XML).
//
//   node tools/textbox-lab/ui-shot.mjs [--lang en|pt] [--toolbar ribbon|compact] [--width 1440]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', 'ribbon');
const out = path.join(tmpdir(), 'tbx-shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
await page.goto(`http://localhost:8099/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
const shot = async (name) => {
  const f = path.join(out, `${name}-${lang}-${toolbar}.png`);
  await page.screenshot({ path: f });
  console.log('captura', f);
};
const run = (js) => page.evaluate(`(async () => { const ed = document.querySelector("universal-write"); ${js} })()`);
const click = async (sel) => {
  const h = await page.evaluateHandle((s) => document.querySelector('universal-write').shadowRoot.querySelector(s), sel);
  const el = h.asElement();
  if (!el) { console.log('não achei', sel); return false; }
  await el.click();
  await page.waitForTimeout(350);
  return true;
};
const clickText = async (texts) => {
  const ok = await page.evaluate((ts) => {
    const root = document.querySelector('universal-write').shadowRoot;
    const all = [...root.querySelectorAll('button, [role=menuitem], .uo-tab, [role=tab]'), ...document.querySelectorAll('[role=menuitem]')];
    const b = all.find((x) => ts.includes((x.getAttribute('aria-label') ?? x.textContent ?? '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, texts);
  await page.waitForTimeout(350);
  if (!ok) console.log('não achei', texts.join(' / '));
  return ok;
};

await run(`ed.enableEditing(); ed.setAttribute("lang", ${JSON.stringify(lang)}); ed.setAttribute("toolbar", ${JSON.stringify(toolbar)}); ed.newDocument?.();`);
await page.waitForTimeout(800);
// texto no corpo para a caixa ficar ao lado
await run(`ed.focusEditor(); ed.pasteText(${JSON.stringify('Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(30))});`);
await page.waitForTimeout(500);
if (toolbar === 'ribbon') await clickText(['Inserir', 'Insert']);
await shot('insert-tab');
// galeria Caixa de Texto
if (toolbar === 'ribbon') await click('[data-a="textbox:menu"]');
await page.waitForTimeout(500);
await shot('textbox-gallery');
await page.keyboard.press('Escape');
await run('ed.insertTextbox("quote");');
await page.waitForTimeout(600);
await shot('inserted-quote');
await page.keyboard.type(lang === 'pt' ? 'Uma citação que chama a atenção.' : 'A quote that catches the eye.');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await shot('shape-selected');
// Estilos de Forma e o painel Formatar Forma
await run('ed.setShapeStyle(23);');
await page.waitForTimeout(400);
await shot('style-23');
if (toolbar === 'ribbon') {
  await click('[data-a="shp:fill"]');
  await shot('fill-menu');
  await page.keyboard.press('Escape');
  await click('[data-a="shp:effects"]');
  await shot('effects-menu');
  await page.keyboard.press('Escape');
} else {
  await click('[data-a="shp:fill"]');
  await shot('compact-fill-menu');
  await page.keyboard.press('Escape');
}
await run('ed.setTextboxOptions({ anchor: "ctr" });');
// painel Formatar Forma (o iniciador do grupo Estilos de Forma)
await run('ed.focusEditor();');
await page.evaluate(() => { const ed = document.querySelector('universal-write'); const b = [...ed.shadowRoot.querySelectorAll('[data-a="shp:format"]')][0]; b?.click(); });
await page.waitForTimeout(600);
await shot('format-pane');
await page.evaluate(() => { const ed = document.querySelector('universal-write'); ed.shadowRoot.querySelector('[data-a="pic:format:layout"]')?.click(); });
await page.waitForTimeout(400);
await shot('format-pane-layout');
await page.keyboard.press('Escape');
await run('ed.insertTextbox("sidebarRight"); ');
await page.waitForTimeout(600);
await page.keyboard.press('Escape');
await shot('sidebar');
const st = await run('return JSON.stringify(ed.selectedShape() && { kind: ed.selectedShape().kind, style: ed.selectedShape().styleIndex, text: ed.selectedShape().text })');
console.log('forma:', st);
const xml = await run('return new TextDecoder().decode(ed.saveDocx().slice(0, 0)) || "ok";');
void xml;
if (logs.length) console.log(['ERROS:', ...logs].join('\n'));
await browser.close();
