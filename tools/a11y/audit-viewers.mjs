// Auditoria de acessibilidade dos viewers (<universal-slides-viewer> e
// <universal-document-viewer>) — o que um leitor de tela recebe:
//  1. axe-core (WCAG 2.0/2.1 A/AA + boas práticas), atravessando o shadow DOM;
//  2. árvore de acessibilidade do Chromium (ariaSnapshot) do viewer;
//  3. teclado: ordem do Tab a partir do viewer, nome acessível e se o foco
//     está VISÍVEL (a barra some sozinha);
//  4. anúncios: regiões aria-live e o que muda nelas ao navegar.
// Chromium headless (não abre janela). Requer as demos servidas:
//   slides/ em :8097 e write/ em :8099 (preview "slides-demo" / "write-demo").
// Uso: node tools/a11y/audit-viewers.mjs [saida.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(path.join(ROOT, 'slides', 'package.json'));
const { chromium } = req('playwright');
const AXE = req.resolve('axe-core/axe.min.js');

const TARGETS = [
  { name: 'slides-viewer', url: 'http://localhost:8097/packages/viewer/demo/controls.html', tag: 'universal-slides-viewer', ready: 'us-loaded' },
  { name: 'document-viewer', url: 'http://localhost:8099/packages/viewer/demo/', tag: 'universal-document-viewer', ready: 'udv-loaded' },
];

/** Elemento focado atravessando shadow roots + nome/papel/visibilidade. */
const FOCUS_INFO = () => {
  let el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  let vis = cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  for (let p = el.parentElement || el.getRootNode().host; p && vis; p = p.parentElement || (p.getRootNode() instanceof ShadowRoot ? p.getRootNode().host : null)) {
    const s = getComputedStyle(p);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) vis = false;
  }
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), part: el.getAttribute('part'),
    label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || '',
    visible: vis && r.width > 0 && r.height > 0, inViewer: !!el.getRootNode().host,
  };
};

async function audit(browser, t) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const out = { name: t.name, url: t.url };
  await page.goto(t.url);
  await page.evaluate(({ tag, ready }) => new Promise((res) => {
    const el = document.querySelector(tag);
    el.addEventListener(ready, () => setTimeout(res, 600), { once: true });
    setTimeout(res, 8000);
  }), t);
  await page.waitForTimeout(500);

  // 1. axe no viewer, em vários estados (a barra visível, painéis e menus abertos)
  await page.addScriptTag({ path: AXE });
  const runAxe = () => page.evaluate(async (tag) => {
    const r = await window.axe.run({ include: [[tag]] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 6).map((n) => ({ target: n.target.flat().join(' >> '), summary: n.failureSummary?.split('\n').slice(0, 3).join(' | ') })) })),
      incomplete: r.incomplete.map((v) => ({ id: v.id, help: v.help, n: v.nodes.length })),
      passes: r.passes.length,
    };
  }, t.tag);
  const box = await page.locator(t.tag).boundingBox();
  const wake = () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + Math.random());
  const click = (part) => page.evaluate(({ tag, part }) => document.querySelector(tag).shadowRoot.querySelector(`[part~="${part}"]`)?.click(), { tag: t.tag, part });
  out.axeStates = {};
  await wake();
  out.axeStates['barra visível'] = await runAxe();
  out.ariaSnapshotBar = await page.locator(t.tag).ariaSnapshot();
  if (t.name === 'slides-viewer') {
    await wake(); await click('button-thumbnails'); await click('button-notes'); await page.waitForTimeout(300);
    out.axeStates['miniaturas + anotações'] = await runAxe();
    await click('button-thumbnails'); await click('button-notes');
  } else {
    await wake(); await click('button-outline'); await click('button-comments'); await page.waitForTimeout(300);
    out.axeStates['índice + comentários'] = await runAxe();
    out.ariaSnapshotPanels = await page.locator(t.tag).ariaSnapshot();
    await click('button-outline'); await click('button-comments');
    await wake(); await click('button-zoom-level'); await page.waitForTimeout(200);
    out.axeStates['menu de zoom'] = await runAxe();
    await page.keyboard.press('Escape');
  }
  const axe = await runAxe();
  out.axe = axe;

  // 2. árvore de acessibilidade (o que o leitor de tela lê)
  out.ariaSnapshot = await page.locator(t.tag).ariaSnapshot();

  // 3. teclado: entra no viewer e anda com Tab (sem mexer o mouse)
  await page.mouse.move(1, 1);
  await page.waitForTimeout(3000); // a barra some sozinha
  await page.evaluate((tag) => {
    const host = document.querySelector(tag);
    const first = host.shadowRoot.querySelector('[tabindex="0"], canvas[tabindex]');
    (first ?? host).focus();
  }, t.tag);
  const tabs = [await page.evaluate(FOCUS_INFO)];
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(80);
    const f = await page.evaluate(FOCUS_INFO);
    tabs.push(f);
    if (f && !f.inViewer) break;
  }
  out.tabOrder = tabs;

  // 4. anúncios: regiões vivas e mudanças ao navegar
  out.live = await page.evaluate(async ({ tag }) => {
    const host = document.querySelector(tag);
    const regions = [...host.shadowRoot.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')]
      .map((r) => ({ live: r.getAttribute('aria-live') || r.getAttribute('role'), text: r.textContent.trim().slice(0, 80) }));
    const before = regions.map((r) => r.text).join('|');
    host.next ? host.next() : host.goToPage?.(1);
    await new Promise((r) => setTimeout(r, 700));
    const after = [...host.shadowRoot.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')].map((r) => r.textContent.trim().slice(0, 80)).join('|');
    return { regions, changedOnNavigate: before !== after, after };
  }, t);

  // 5. conteúdo: o que existe de texto acessível do slide/página em cena
  out.content = await page.evaluate((tag) => {
    const host = document.querySelector(tag);
    const sr = host.shadowRoot;
    const canvas = [...sr.querySelectorAll('canvas')].filter((c) => c.width > 0 && !c.closest('[part~="thumbnail"]')).slice(0, 3)
      .map((c) => ({ role: c.getAttribute('role'), label: c.getAttribute('aria-label'), ariaHidden: c.closest('[aria-hidden="true"]') !== null, tabindex: c.getAttribute('tabindex') }));
    const textLayer = sr.querySelectorAll('.udv-text span').length;
    return { canvas, textLayerSpans: textLayer, hostRole: host.getAttribute('role'), hostLabel: host.getAttribute('aria-label') };
  }, t.tag);

  await page.close();
  return out;
}

const browser = await chromium.launch();
const results = [];
for (const t of TARGETS) {
  try { results.push(await audit(browser, t)); }
  catch (e) { results.push({ name: t.name, error: String(e) }); }
}
await browser.close();
const file = process.argv[2] ?? path.join(ROOT, 'tools', 'a11y', 'last-audit.json');
writeFileSync(file, JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`\n== ${r.name}${r.error ? ` ERRO: ${r.error}` : ''}`);
  if (r.error) continue;
  for (const [state, a] of Object.entries({ 'barra escondida': r.axe, ...r.axeStates })) {
    console.log(`axe (${state}): ${a.violations.length} violações, ${a.incomplete.length} a revisar, ${a.passes} regras ok`);
    for (const v of a.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) — ${v.nodes[0]?.target} :: ${v.nodes[0]?.summary}`);
    for (const v of a.incomplete) console.log(`  [revisar] ${v.id}: ${v.help} (${v.n})`);
  }
  console.log('Tab:', r.tabOrder.map((f) => (f ? `${f.part || f.tag}${f.visible ? '' : '(INVISÍVEL)'}:${f.label}` : '∅')).join(' → '));
  console.log('aria-live:', JSON.stringify(r.live));
  console.log('conteúdo:', JSON.stringify(r.content));
}
console.log(`\n→ ${file}`);
