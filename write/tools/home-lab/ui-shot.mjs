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
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8099' });
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

if (script === 'lists') {
  const lines = lang === 'pt' ? ['Primeiro item', 'Segundo item', 'Terceiro item', 'Texto comum', 'Quarto item'] : ['First item', 'Second item', 'Third item', 'Plain text', 'Fourth item'];
  await run(`ed.focusEditor(); ed.pasteText(${JSON.stringify(lines.join('\n'))});`);
  await page.waitForTimeout(400);
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 2, offset: 3 }); ed.applyListLibrary('number', 0); ed.setSelection({ para: 1, offset: 0 }); ed.setListLevel(1); ed.setSelection({ para: 4, offset: 0 }); ed.applyListLibrary('bullet', 4);`);
  await page.waitForTimeout(500);
  await shot('doc-lists');
  const openSplit = async (label) => page.evaluate((re) => {
    const r = document.querySelector('universal-write').shadowRoot;
    const b = [...r.querySelectorAll('button')].find((x) => new RegExp(re).test(x.getAttribute('aria-label') ?? x.title ?? '') && (x.classList.contains('uo-split-arrow') || x.getAttribute('aria-haspopup')));
    b?.click();
    return !!b;
  }, label);
  for (const [name, re] of [['bullets-menu', '^(Marcadores|Bullets)'], ['numbering-menu', '^(Numeração|Numbering)'], ['multilevel-menu', '^(Lista de Vários Níveis|Multilevel List)']]) {
    await run(`ed.setSelection({ para: 0, offset: 0 });`);
    if (!await openSplit(re)) console.log('não achei', name);
    await page.waitForTimeout(500);
    await shot(name);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // os diálogos pelos itens dos menus
  for (const [name, menu, item, para] of [
    ['dlg-bullet', '^(Marcadores|Bullets)', ['Definir Novo Marcador...', 'Define New Bullet…'], 4],
    ['dlg-number', '^(Numeração|Numbering)', ['Definir Novo Formato de Número...', 'Define New Number Format…'], 2],
    ['dlg-value', '^(Numeração|Numbering)', ['Definir Valor de Numeração...', 'Set Numbering Value…'], 2],
    ['dlg-multilevel', '^(Lista de Vários Níveis|Multilevel List)', ['Definir Nova Lista de Vários Níveis...', 'Define New Multilevel List…'], 2],
    ['dlg-style', '^(Lista de Vários Níveis|Multilevel List)', ['Definir Novo Estilo de Lista...', 'Define New List Style…'], 2],
  ]) {
    await run(`ed.setSelection({ para: ${para}, offset: 0 });`);
    if (!await openSplit(menu)) console.log('não achei', name);
    await page.waitForTimeout(400);
    await clickText(item);
    await page.waitForTimeout(600);
    await shot(name);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

if (script === 'clipboard') {
  const lines = lang === 'pt' ? ['Titulo de exemplo', 'Texto com negrito e cor', 'Destino'] : ['Sample heading', 'Text with bold and color', 'Target'];
  await run(`ed.focusEditor(); ed.pasteText(${JSON.stringify(lines.join('\n'))});`);
  await run(`ed.setSelection({ para: 1, offset: 0 }, { para: 1, offset: 9 }); ed.setFontFormat({ bold: true, color: 'C00000' });`);
  // copia o 1º e o 2º parágrafos e cola no começo do 3º: o botão Opções de Colagem aparece
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 2, offset: 0 }); await ed.copy(); ed.setSelection({ para: 2, offset: 0 }); await ed.paste();`);
  await page.waitForTimeout(500);
  await shot('paste-button');
  await page.keyboard.down('Control'); await page.keyboard.up('Control');
  await page.waitForTimeout(400);
  await shot('paste-options-menu');
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(400);
  await shot('paste-merged');
  // menu do botão Colar
  await page.evaluate(() => { const r = document.querySelector('universal-write').shadowRoot; const b = [...r.querySelectorAll('button')].find((x) => /^(Colar|Paste)$/.test(x.getAttribute('aria-label') ?? '') && x.classList.contains('uo-split-arrow')); b?.click(); });
  await page.waitForTimeout(400);
  await shot('paste-menu');
  await page.keyboard.press('Escape');
  // Colar Especial e o painel
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 6 }); await ed.copy(); ed.setSelection({ para: 4, offset: 0 });`);
  await page.keyboard.press('Control+Alt+KeyV');
  await page.waitForTimeout(700);
  await shot('paste-special');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await clickText(['Área de Transferência', 'Clipboard']);
  await page.waitForTimeout(300);
  await page.evaluate(() => { const r = document.querySelector('universal-write').shadowRoot; r.querySelector('[data-a="clipboard:pane"], .uo-launcher[data-cmd="clipboard:pane"]')?.click(); });
  await page.waitForTimeout(600);
  await shot('clipboard-pane');
}

if (script === 'effects') {
  const lines = ['Brilho Sombra Reflexo', 'Contorno Degradê', 'Galeria 0123456789'];
  await run(`ed.focusEditor(); ed.pasteText(${JSON.stringify(lines.join('\n'))});`);
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 2, offset: 18 }); ed.setFontFormat({ sizePt: 28, bold: true });`);
  await run(`
    ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 6 }); ed.setTextEffects({ glow: { rad: 101600, color: { scheme: 'accent1', mods: [['alpha', 60000]] } } });
    ed.setSelection({ para: 0, offset: 7 }, { para: 0, offset: 13 }); ed.setTextEffects({ shadow: { blurRad: 50800, dist: 38100, dir: 2700000, sx: 100000, sy: 100000, kx: 0, ky: 0, algn: 'tl', color: { rgb: '000000', mods: [['alpha', 60000]] } } });
    ed.setSelection({ para: 0, offset: 14 }, { para: 0, offset: 21 }); ed.setTextEffects({ reflection: { blurRad: 6350, stA: 55000, stPos: 0, endA: 300, endPos: 45500, dist: 0, dir: 5400000, fadeDir: 5400000, sx: 100000, sy: -100000, kx: 0, ky: 0, algn: 'bl' } });
    ed.setSelection({ para: 1, offset: 0 }, { para: 1, offset: 8 }); ed.setTextEffects({ fill: { type: 'solid', color: { scheme: 'bg1' } }, outline: { w: 12700, cap: 'flat', cmpd: 'sng', algn: 'ctr', fill: { type: 'solid', color: { scheme: 'accent2' } }, dash: 'solid', join: 'round' } });
    ed.setSelection({ para: 1, offset: 9 }, { para: 1, offset: 16 }); ed.setTextGradient({ angleDeg: 90, light: false });
    ed.setSelection({ para: 2, offset: 0 }, { para: 2, offset: 7 }); ed.applyTextEffectPreset(3);
    ed.setSelection({ para: 2, offset: 8 }, { para: 2, offset: 18 }); ed.setOpenType({ numForm: 'oldStyle' });
    ed.setSelection({ para: 2, offset: 18 });
  `);
  await page.waitForTimeout(800);
  await shot('doc-effects');
  const openMenu = async (re) => page.evaluate((r) => { const root = document.querySelector('universal-write').shadowRoot; const b = [...root.querySelectorAll('button')].find((x) => new RegExp(r).test(x.getAttribute('aria-label') ?? '')); b?.click(); return !!b; }, re);
  if (!await openMenu('^(Efeitos de Texto e Tipografia|Text Effects and Typography)$')) console.log('não achei o botão Efeitos de Texto');
  await page.waitForTimeout(500);
  await shot('effects-menu');
  await clickText(['Brilho', 'Glow']);
  await page.waitForTimeout(400);
  await shot('effects-glow-menu');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 6 });`);
  await openMenu('^(Efeitos de Texto e Tipografia|Text Effects and Typography)$');
  await page.waitForTimeout(300);
  await clickText(['Sombra', 'Shadow']);
  await page.waitForTimeout(300);
  await clickText(['Opções de Efeitos de Texto...', 'Text Effects Options…']);
  await page.waitForTimeout(600);
  await shot('effects-pane');
}

if (script === 'find') {
  await run(`ed.focusEditor(); ed.selectAll(); ed.pasteText("Alfa beta gama. Delta alfa zeta.\\nOutra linha com alfa e Alfa.");`);
  await run(`ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 4 }); ed.setFontFormat({ bold: true });`);
  // seleção não contígua (Localizar em › Documento Principal)
  await run(`ed.selectAllMatches({ text: "alfa" });`);
  await page.waitForTimeout(400);
  await shot('find-multisel');
  await clickText(['Substituir', 'Replace']);
  await page.waitForTimeout(500);
  await shot('find-replace-tab');
  await clickText(['Mais >>', 'More >>']);
  await page.waitForTimeout(300);
  await shot('find-more');
  await clickText(['Especial ▾', 'Special ▾']);
  await page.waitForTimeout(300);
  await shot('find-special');
  await page.keyboard.press('Escape');
  await clickText(['Ir para', 'Go To']);
  await page.waitForTimeout(300);
  await shot('find-goto');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const b = [...document.querySelector('universal-write').shadowRoot.querySelectorAll('button')].find((x) => /^(Selecionar|Select)$/.test(x.getAttribute('aria-label') ?? '')); b?.click(); });
  await page.waitForTimeout(400);
  await shot('find-select-menu');
}

if (script === 'objects') {
  await run(`ed.focusEditor(); ed.selectAll(); ed.pasteText("Texto do documento com duas caixas."); ed.insertTextbox("simple"); ed.exitTextbox?.(); ed.setSelection({ para: 0, offset: 0 }); ed.insertTextbox("simple"); ed.exitTextbox?.();`);
  await run(`const k = ed.selectionPaneItems().map((i) => i.key); ed.selectPaneItem(k[1]); ed.alignShape("right"); ed.selectPaneItem(k[0]); ed.alignShape("left");`);
  await page.waitForTimeout(500);
  await run(`ed.setSelectObjectsMode(true);`);
  // laço de canto a canto da página
  const box = await page.evaluate(() => { const c = document.querySelector('universal-write').shadowRoot.querySelector('canvas.page'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w / 2, box.y + box.h / 3, { steps: 5 });
  await shot('objects-lasso');
  await page.mouse.move(box.x + box.w - 20, box.y + box.h / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log('objetos selecionados:', await run('return ed.selectedObjectCount();'));
  await shot('objects-multi');
  await run('ed.alignObjects("top");');
  await page.waitForTimeout(400);
  await shot('objects-aligned');
}

console.log(logs.length ? `ERROS:\n${logs.join('\n')}` : 'sem erros no console');
await browser.close();
