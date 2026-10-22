// Conferência da frente Cabeçalho e rodapé no navegador (Chromium headless, sem
// janela): abre o demo do editor (servidor do demo no ar — launch.json
// "write-demo-hf", porta 8131, ou --port), roda um cenário e grava capturas em
// %TEMP%/hf-shots. Cenários:
//   api      — opções, vincular, modelos, remover, desfazer (imprime JSON)
//   tab      — guia contextual e as etiquetas das faixas
//   gallery  — menu Cabeçalho com as miniaturas
//   pgnum    — Número de Página › Fim da Página
//   dialogs  — Formatar Números de Página, Data e Hora, Tabulação de Alinhamento
//   compact  — menu Inserir › Cabeçalhos e rodapés (barra compacta)
//
//   node tools/hf-lab/ui-shot.mjs <cenário> [--lang en|pt] [--width 1440] [--toolbar ribbon|compact] [--port 8131]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] ?? 'api';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', scenario === 'compact' ? 'compact' : 'ribbon');
const port = opt('--port', '8131');
const out = path.join(tmpdir(), 'hf-shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => { localStorage.setItem('uw:write-demo:toolbar', tb); }, [toolbar]);
await page.goto(`http://localhost:${port}/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
await page.waitForTimeout(1200);
const shot = async (name, clip) => {
  const f = path.join(out, `${scenario}-${name}-${lang}-${toolbar}.png`);
  await page.screenshot({ path: f, ...(clip ? { clip } : {}) });
  console.log(f);
};
const ed = 'document.querySelector("universal-write")';
const run = (js) => page.evaluate(`(async () => { const ed = ${ed}; ${js} })()`);
await run(`ed.enableEditing(); ed.setAttribute("lang", ${JSON.stringify(lang)}); ed.setAttribute("toolbar", ${JSON.stringify(toolbar)});`);
await page.waitForTimeout(600);
const clickText = async (texts) => {
  const ok = await run(`const want = ${JSON.stringify(texts)};
    const all = [...ed.shadowRoot.querySelectorAll('button, .uo-tab, [role="menuitem"], .uo-menu-item')];
    const b = all.find((x) => want.includes((x.getAttribute('aria-label') || x.textContent || '').trim()));
    if (!b) return false; b.click(); return true;`);
  await page.waitForTimeout(500);
  return ok;
};

if (scenario === 'api') {
  const r = await run(`
    const out = {};
    ed.newDocument();
    await new Promise((r) => setTimeout(r, 300));
    ed.pasteText('Texto do corpo');
    ed.enterHeaderFooter('header', 0);
    out.mode = ed.editingHeaderFooter();
    out.opts0 = ed.getHeaderFooterOptions();
    ed.pasteText('CAB');
    ed.setDifferentFirstPage(true);
    out.opts1 = ed.getHeaderFooterOptions();
    out.mode1 = ed.editingHeaderFooter();
    ed.undo();
    out.afterUndo = ed.getHeaderFooterOptions();
    ed.undo();
    out.hdrAfterUndo2 = ed.model.paragraphs.map((p) => p.runs.map((x) => x.text).join(''));
    ed.redo(); ed.redo();
    out.afterRedo = ed.getHeaderFooterOptions();
    ed.setDifferentFirstPage(false);
    ed.setHeaderFooterDistance({ header: 1134, footer: 850 });
    out.dist = [ed.getHeaderFooterOptions().headerDistance, ed.getHeaderFooterOptions().footerDistance];
    ed.insertHeaderFooterTemplate('header', 'blank3');
    out.tpl = ed.model.paragraphs.map((p) => p.runs.map((x) => x.ptab ? '<TAB>' : x.text).join(''));
    out.sel = ed.selectedText();
    ed.insertHeaderFooterTemplate('pageBottom', 'pageXofY');
    out.ftr = { mode: ed.editingHeaderFooter(), text: ed.model.paragraphs.map((p) => p.runs.map((x) => x.field ? '{' + x.field.trim() + '}' : x.text).join('')) };
    ed.removePageNumbers();
    out.ftrAfterRemove = ed.model.paragraphs.map((p) => p.runs.map((x) => x.text).join(''));
    ed.undo();
    out.ftrAfterUndo = ed.model.paragraphs.map((p) => p.runs.map((x) => x.field ? '{' + x.field.trim() + '}' : x.text).join(''));
    ed.goToHeaderFooter('header');
    ed.removeHeaderFooter('header');
    out.hdrRemoved = ed.model.paragraphs.map((p) => p.runs.map((x) => x.text).join(''));
    ed.setPageNumberFormat({ format: 'lowerRoman', start: 3 });
    out.pgfmt = ed.getPageNumberFormat();
    out.dates = ed.dateTimeFormats('pt').slice(0, 3);
    ed.exitHeaderFooter();
    const bytes = ed.saveDocx();
    out.saved = bytes.length;
    return out;`);
  console.log(JSON.stringify(r, null, 1));
} else if (scenario === 'tab') {
  await run('ed.enterHeaderFooter("header", 0);');
  await page.waitForTimeout(800);
  await shot('tab');
} else if (scenario === 'gallery' || scenario === 'pgnum') {
  await run('ed.enterHeaderFooter("header", 0);');
  await page.waitForTimeout(600);
  await clickText(scenario === 'gallery' ? ['Cabeçalho', 'Header'] : ['Número de Página', 'Page Number']);
  if (scenario === 'pgnum') await clickText(['Fim da Página', 'Bottom of Page']);
  await page.waitForTimeout(1500);
  await shot('menu');
} else if (scenario === 'dialogs') {
  await run('ed.enterHeaderFooter("footer", 0);');
  await page.waitForTimeout(600);
  // (largura de 1800 px: a guia contextual sem grupos recolhidos)
  for (const [cmd, name] of [['dlg:pageNumberFormat', 'pgfmt'], ['dlg:dateTime', 'date'], ['dlg:alignTab', 'aligntab']]) {
    if (cmd === 'dlg:pageNumberFormat') {
      await clickText(['Número de Página', 'Page Number']);
      await clickText(['Formatar Números de Página…', 'Format Page Numbers…']);
    } else await run(`ed.shadowRoot.querySelector('[data-a="${cmd}"]')?.click();`);
    await page.waitForTimeout(700);
    await shot(name);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
} else if (scenario === 'compact') {
  await clickText(['Inserir', 'Insert']);
  await clickText(['Cabeçalhos e rodapés', 'Headers & footers']);
  await page.waitForTimeout(500);
  await shot('menu');
}
if (logs.length) console.log('ERROS:\n' + logs.join('\n'));
await browser.close();
