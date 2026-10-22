// Conferência da frente Navegação no navegador (Chromium headless, sem janela):
// abre o demo do editor (servidor do demo já no ar, porta 8099 — launch.json
// "write-demo"), roda um cenário e grava capturas em %TEMP%/nav-shots.
//
//   node tools/nav-lab/ui-shot.mjs <cenário> [--lang en|pt] [--width 1440] [--toolbar ribbon|compact]
//
// Cenários: ruler, search, pages, table, outline, gridlines, drag.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const scenario = args[0] ?? 'ruler';
const lang = opt('--lang', 'pt');
const width = Number(opt('--width', 1440));
const toolbar = opt('--toolbar', 'ribbon');
const out = path.join(tmpdir(), 'nav-shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: args.includes('--hd') ? 2 : 1, locale: lang === 'pt' ? 'pt-BR' : 'en-US' });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push(String(e.stack ?? e)));
await page.addInitScript(([tb]) => {
  localStorage.setItem('uw:write-demo:toolbar', tb);
  localStorage.setItem('uw:write-demo:ruler', '1');
  localStorage.setItem('uw:write-demo:navPane', '1');
}, [toolbar]);
await page.goto(`http://localhost:8099/packages/editor/demo/index.html?lang=${lang}`);
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
const clip = opt('--clip');
const shot = async (name) => {
  const f = path.join(out, `${scenario}-${name}-${lang}-${width}${clip ? '-clip' : ''}.png`);
  const [x, y, w, h] = (clip ?? '').split(',').map(Number);
  await page.screenshot({ path: f, ...(clip ? { clip: { x, y, width: w, height: h } } : {}) });
  console.log(f);
};
const ed = 'document.querySelector("universal-write")';
const run = (js) => page.evaluate(`(async () => { const ed = ${ed}; ${js} })()`);
await run('ed.enableEditing(); ed.setAttribute("lang", ' + JSON.stringify(lang) + '); ed.setAttribute("toolbar", ' + JSON.stringify(toolbar) + ');');
await page.waitForTimeout(800);
// guia Exibir na ribbon
if (toolbar === 'ribbon') await run('[...ed.shadowRoot.querySelectorAll(".uo-tab")].find((t) => t.textContent === "Exibir" || t.textContent === "View")?.click();');
await page.waitForTimeout(300);

if (scenario === 'ruler') {
  await run('ed.search("Recuo deslocado", { highlight: false }); ed.goToSearchResult(0); ed.clearSearch();');
  await page.waitForTimeout(600);
  await shot('hanging');
  await run('ed.goToHeading(0);');
  await page.waitForTimeout(400);
} else if (scenario === 'search') {
  await run('const i = ed.shadowRoot.querySelector("[data-a=\\"nav:search\\"]"); i.value = "recuo"; i.dispatchEvent(new Event("input"));');
  await page.waitForTimeout(800);
  await run('ed.shadowRoot.querySelector("[data-a=\\"nav:tab:results\\"]").click();');
  await page.waitForTimeout(400);
  await shot('results');
  await run('ed.shadowRoot.querySelector("[data-a=\\"nav:next\\"]").click();');
  await page.waitForTimeout(400);
  await run('ed.shadowRoot.querySelector("[data-a=\\"nav:tab:headings\\"]").click();');
  await page.waitForTimeout(400);
  await shot('headings-hit');
} else if (scenario === 'pages') {
  await run('ed.shadowRoot.querySelector("[data-a=\\"nav:tab:pages\\"]").click();');
  await page.waitForTimeout(1500);
  await shot('thumbs');
} else if (scenario === 'table') {
  await run('const r = ed.search("Cabecalho"); const k = r.findIndex((x) => x.inTable); ed.goToSearchResult(Math.max(0, k)); ed.clearSearch();');
  await page.waitForTimeout(600);
  await shot('cell');
} else if (scenario === 'outline') {
  await run('ed.setView("outline");');
  await page.waitForTimeout(600);
  await shot('outline');
  await run('ed.setView("draft");');
  await page.waitForTimeout(600);
  await shot('draft');
} else if (scenario === 'drag') {
  // arrastos reais na régua (mouse do Playwright) e o que vai para o .docx
  await run('ed.search("Paragrafo alinhado a esquerda", { highlight: false }); ed.goToSearchResult(0); ed.clearSearch();');
  await page.waitForTimeout(500);
  const geo = () => run(`const info = ed.getRulerInfo(); const pg = ed.shadowRoot.querySelectorAll('canvas.page')[info.page].getBoundingClientRect();
    const s = pg.width / info.pageWidthTwips; const hr = ed.shadowRoot.querySelector('.uw-hruler .uo-ruler-canvas').getBoundingClientRect();
    return { info, x: (tw) => 0, left: pg.left, s, top: hr.top, h: hr.height, scrollTop: ed.scrollTop };`);
  const g0 = await geo();
  const px = (g, tw) => g.left + tw * g.s;
  const drag = async (x0, y0, x1, y1) => { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(400); };
  const cm = 1440 / 2.54;
  // recuo esquerdo (quadradinho): +1,25 cm
  const lx = px(g0, g0.info.frame.x0 + g0.info.indents.left);
  await drag(lx, g0.top + g0.h * 0.86, lx + 1.25 * cm * g0.s, g0.top + g0.h * 0.86);
  const r1 = await run('return ed.getRulerInfo().indents;');
  await shot('indent');
  // primeira linha: +0,5 cm a partir do recuo
  const g1 = await geo();
  const fx = px(g1, g1.info.frame.x0 + g1.info.indents.left + g1.info.indents.firstLine);
  await drag(fx, g1.top + g1.h * 0.25, fx + 0.5 * cm * g1.s, g1.top + g1.h * 0.25);
  const r2 = await run('return ed.getRulerInfo().indents;');
  // clique na área do texto: tabulação esquerda em 8 cm
  const tx = px(g1, g1.info.frame.x0 + 8 * cm);
  await page.mouse.click(tx, g1.top + g1.h * 0.5);
  await page.waitForTimeout(400);
  const r3 = await run('return ed.getRulerInfo().tabs;');
  // arrastar a tabulação para 9 cm
  await drag(tx, g1.top + g1.h * 0.6, px(g1, g1.info.frame.x0 + 9 * cm), g1.top + g1.h * 0.6);
  const r4 = await run('return ed.getRulerInfo().tabs;');
  await shot('tab');
  // margem direita: -1 cm (borda entre o branco e o cinza)
  const mx = px(g1, g1.info.pageWidthTwips - g1.info.margins.right);
  await drag(mx, g1.top + g1.h * 0.25, mx - 1 * cm * g1.s, g1.top + g1.h * 0.25);
  const r5 = await run('return ed.getRulerInfo().margins;');
  // puxar a tabulação para fora (abaixo da régua): remove
  const g2 = await geo();
  const t9 = px(g2, g2.info.frame.x0 + (r4[0]?.pos ?? 0));
  await drag(t9, g2.top + g2.h * 0.6, t9, g2.top + g2.h + 60);
  const r6 = await run('return ed.getRulerInfo().tabs;');
  // desfazer volta a tabulação
  await run('ed.undo();');
  await page.waitForTimeout(300);
  const r7 = await run('return ed.getRulerInfo().tabs;');
  await run('ed.redo();');
  const xml = await run(`const b = ed.saveDocx(); const z = await import('https://esm.sh/fflate@0.8.2'); const p = z.unzipSync(b); const d = new TextDecoder().decode(p['word/document.xml']);
    const i = d.indexOf('Paragrafo alinhado a esquerda'); const ps = d.lastIndexOf('<w:p ', i); const ppr = d.slice(ps, d.indexOf('</w:pPr>', ps) + 8);
    const sect = (d.match(/<w:pgMar [^>]*>/g) ?? []).join(' ');
    return { ppr: ppr.replace(/ w:rsid\\w*="[^"]*"/g, '').replace(/ w14:\\w+="[^"]*"/g, ''), sect };`).catch((e) => String(e));
  console.log(JSON.stringify({ indent: r1, firstLine: r2, tabAdd: r3, tabMove: r4, margins: r5, tabRemoved: r6, undo: r7, xml }, null, 1));
} else if (scenario === 'dialogs') {
  // Parágrafo (recuos + Tabulação…) e Tabulação, pela guia Página Inicial
  await run('ed.search("Recuo deslocado", { highlight: false }); ed.goToSearchResult(0); ed.clearSearch(); ed.setTabStops([], { add: [{ pos: 2835, align: "center" }, { pos: 5669, align: "decimal", leader: "dot" }] });');
  await page.waitForTimeout(400);
  await run('[...ed.shadowRoot.querySelectorAll(".uo-tab")].find((t) => /Página Inicial|Home/.test(t.textContent))?.click();');
  await page.waitForTimeout(300);
  await run('[...ed.shadowRoot.querySelectorAll("[data-a]")].find((b) => b.dataset.a.includes("dlg:paragraph"))?.click();');
  await page.waitForTimeout(600);
  await shot('paragraph');
  await run('[...ed.shadowRoot.querySelectorAll("dialog button")].find((b) => /Tabulação|Tabs/.test(b.textContent))?.click();');
  await page.waitForTimeout(600);
  await shot('tabs');
} else if (scenario === 'navdrag') {
  // arrastar "3. Listas" para cima de "2. Formatacao…" na aba Títulos (HTML5 DnD de verdade)
  const rows = await run('return [...ed.shadowRoot.querySelectorAll(".uw-nav-row")].map((r) => { const b = r.getBoundingClientRect(); return { t: r.textContent, x: b.left + 40, y: b.top + 4, h: b.height }; });');
  const from = rows.find((r) => r.t.startsWith('3. Listas')), to = rows.find((r) => r.t.startsWith('2. Formatacao'));
  const ev = 'ed.shadowRoot';
  await page.evaluate(`(async () => {
    const ed = document.querySelector('universal-write');
    const rows = [...${ev}.querySelectorAll('.uw-nav-row')];
    const src = rows.find((r) => r.textContent.startsWith('3. Listas')), dst = rows.find((r) => r.textContent.startsWith('2. Formatacao'));
    const dt = new DataTransfer();
    const b = dst.getBoundingClientRect();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true, dataTransfer: dt, clientX: b.left + 30, clientY: b.top + 3 }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, cancelable: true, dataTransfer: dt, clientX: b.left + 30, clientY: b.top + 3 }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }));
  })()`);
  await page.waitForTimeout(600);
  const after = await run('return ed.getHeadings().slice(0, 6).map((h) => h.text);');
  console.log(JSON.stringify({ from: from?.t, to: to?.t, after }));
  await shot('moved');
} else if (scenario === 'gridlines') {
  await run('ed.showGridlines(true); ed.goToHeading(1);');
  await page.waitForTimeout(600);
  await shot('grid');
}
await page.waitForTimeout(200);
if (logs.length) console.log('ERROS:\n' + logs.join('\n'));
await browser.close();
