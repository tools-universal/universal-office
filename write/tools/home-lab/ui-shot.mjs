// Conferência da frente Página Inicial no navegador (Chromium headless, sem janela):
// abre o demo do editor (servidor do demo no ar, porta 8099 — launch.json "write-demo"),
// roda um roteiro e grava capturas em %TEMP%/home-shots. Termina com os erros do console.
//
//   node tools/home-lab/ui-shot.mjs <roteiro> [--lang en|pt] [--toolbar ribbon|compact] [--width 1440]
//   roteiros: font (sublinhado, cor, maiúsculas, bordas, diálogo Fonte)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const script = args[0] ?? 'font';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', 'ribbon');
const out = path.join(tmpdir(), 'home-shots');
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
    const all = [...root.querySelectorAll('button, [role=menuitem], [role=option], .uo-tab, [role=tab]'), ...document.querySelectorAll('[role=menuitem]')];
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

if (script === 'font') {
  const txt = lang === 'pt' ? 'Sublinhado simples. duplo grosso pontilhado tracejado traço-ponto ondulado. o rio de janeiro É LINDO' : 'Single underline. double thick dotted dashed dot-dash wave. the quick BROWN fox';
  await run(`ed.focusEditor(); ed.pasteText(${JSON.stringify(txt + '\n' + 'Segundo parágrafo com bordas\nTerceiro parágrafo\n')});`);
  await page.waitForTimeout(400);
  // estilos de sublinhado em palavras diferentes (API) para a captura do documento
  await run(`
    const words = [['single',0,10],['double',22,27],['thick',28,33],['dotted',34,44],['dash',45,54],['dotDash',55,66],['wave',67,75]];
    for (const [st, a, b] of words) { ed.setSelection?.({ para: 0, offset: a }, { para: 0, offset: b }); ed.setUnderline(st); }
  `);
  await page.waitForTimeout(400);
  await shot('doc-underlines');
  // menu do botão Sublinhado (seta do botão dividido)
  await run(`ed.setSelection?.({ para: 0, offset: 0 }, { para: 0, offset: 10 });`);
  const opened = await click('[data-a="underline"] + .uo-split-arrow, [data-split="underline"] .uo-split-arrow, [data-a="underline:menu"]');
  if (!opened) await page.evaluate(() => { const r = document.querySelector('universal-write').shadowRoot; const b = [...r.querySelectorAll('button')].find((x) => /Sublinhado|Underline/.test(x.getAttribute('aria-label') ?? '') && x.classList.contains('uo-split-arrow')); b?.click(); });
  await page.waitForTimeout(500);
  await shot('underline-menu');
  await page.keyboard.press('Escape');
  // Maiúsculas e Minúsculas
  await run(`ed.setSelection?.({ para: 0, offset: 76 }, { para: 0, offset: ${txt.length} }); ed.changeCase('sentence');`);
  await page.waitForTimeout(300);
  // bordas: Externas no 2º e 3º parágrafos
  await run(`ed.setSelection?.({ para: 1, offset: 0 }, { para: 2, offset: 3 }); ed.paragraphBorderPreset('outside');`);
  await run(`ed.setSelection?.({ para: 3, offset: 0 }, { para: 3, offset: 0 }); ed.insertHorizontalLine();`);
  await page.waitForTimeout(500);
  await shot('doc-case-borders');
  // diálogo Fonte
  await run(`ed.setSelection?.({ para: 0, offset: 0 }, { para: 0, offset: 10 });`);
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(700);
  await shot('font-dialog');
  await clickText(['Avançado', 'Advanced']);
  await shot('font-dialog-advanced');
  await page.keyboard.press('Escape');
}

console.log(logs.length ? `ERROS:\n${logs.join('\n')}` : 'sem erros no console');
await browser.close();
