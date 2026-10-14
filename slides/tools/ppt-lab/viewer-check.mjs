// Verificação headless do CICLO DE VIDA do <universal-presentation-viewer>
// (sem janela): o que os testes de unidade não alcançam — DOM, FontFace,
// requestAnimationFrame, fetch de `src`, eventos. Cada caso imprime OK/FALHA.
//
//  1. fontes embutidas do deck A saem do document.fonts ao abrir o deck B
//  2. remover o viewer no meio do play(): o laço de quadros para
//  3. `src` trocado durante o download: vale o ÚLTIMO
//  4. arquivo inválido: lança e o deck atual fica intacto
//  5. fim da reprodução: isPlaying() false e a navegação sai do palco
//  6. F5 "do começo" (present('start')) pula o 1º slide oculto
//  7. reprodução com todos os slides ocultos + loop termina (não gira para sempre)
//
// Uso: node tools/ppt-lab/viewer-check.mjs
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const work = join(here, '.regress', 'viewer-check');
mkdirSync(work, { recursive: true });

// decks: um com fontes EMBUTIDAS (A), um comum (B); C = B com o 1º slide oculto
const pick = (...names) => names.map((n) => join(slidesRoot, 'samples', n)).find((p) => existsSync(p));
const deckA = pick('animated-intro.pptx', 'organic-shapes.pptx');
const deckB = pick('stress-text.pptx', 'stress-shapes.pptx', 'reference.pptx');
if (!deckA || !deckB) { console.error('faltam decks em samples/'); process.exit(1); }
const hideSlides = (bytes, which) => {
  const parts = unzipSync(bytes);
  for (const [name, data] of Object.entries(parts)) {
    const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    if (m && which(Number(m[1]))) parts[name] = strToU8(strFromU8(data).replace(/<p:sld\b/, '<p:sld show="0"'));
  }
  return zipSync(parts);
};
const bBytes = new Uint8Array(readFileSync(deckB));
writeFileSync(join(work, 'A.pptx'), readFileSync(deckA));
writeFileSync(join(work, 'B.pptx'), bBytes);
writeFileSync(join(work, 'C.pptx'), hideSlides(bBytes, (n) => n === 1));
writeFileSync(join(work, 'D.pptx'), hideSlides(bBytes, () => true));

await build({
  stdin: {
    contents: "import '../../../../packages/viewer/src/universal-presentation-viewer';",
    resolveDir: work, loader: 'ts',
  },
  bundle: true, format: 'esm', outfile: join(work, 'bundle.js'), logLevel: 'warning',
  alias: {
    '@universal/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts'),
    '@universal-office/charts': join(slidesRoot, '..', 'shared', 'charts', 'src', 'index.ts'),
  },
});
writeFileSync(join(work, 'index.html'),
  '<!DOCTYPE html><meta charset="utf-8"><body style="margin:0"><div id="host" style="width:800px;height:450px"></div><script type="module" src="./bundle.js"></script>');

const PORT = 8141;
const rootNorm = normalize(slidesRoot + sep);
const server = createServer((req, res) => {
  let path;
  try { path = normalize(join(slidesRoot, decodeURIComponent(new URL(req.url, 'http://x').pathname))); } catch { res.writeHead(400).end(); return; }
  if (!path.startsWith(rootNorm) || !existsSync(path)) { res.writeHead(404).end(); return; }
  const slow = /[?&]slow=(\d+)/.exec(req.url)?.[1];
  const send = () => {
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript' }[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(path));
  };
  if (slow) setTimeout(send, Number(slow)); else send();
}).listen(PORT, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/tools/ppt-lab/.regress/viewer-check/index.html`);
await page.waitForFunction(() => !!customElements.get('universal-presentation-viewer'));

const base = '/tools/ppt-lab/.regress/viewer-check';
const results = await page.evaluate(async (b) => {
  const out = [];
  const ok = (name, cond, info = '') => out.push({ name, ok: !!cond, info });
  const bytes = async (n) => new Uint8Array(await (await fetch(`${b}/${n}`)).arrayBuffer());
  const host = document.getElementById('host');
  const make = () => { const pv = document.createElement('universal-presentation-viewer'); pv.style.cssText = 'display:block;width:800px;height:450px'; host.appendChild(pv); return pv; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // faces que o viewer acrescentou ao document.fonts (independe da implementação)
  const added = (before) => [...document.fonts].filter((f) => !before.has(f));

  // 1. fontes do deck A não vazam para o B
  {
    const pv = make();
    const pre = new Set(document.fonts);
    pv.loadPptx(await bytes('A.pptx'));
    await pv.fontsReady();
    await sleep(50);
    const facesA = added(pre);
    pv.loadPptx(await bytes('B.pptx'));
    await pv.fontsReady();
    const left = facesA.filter((f) => document.fonts.has(f));
    ok('fontes embutidas do deck A saem ao abrir o B', facesA.length > 0 && left.length === 0,
      `faces do A ${facesA.length} (${[...new Set(facesA.map((f) => f.family))].join(', ')}); ainda no documento ${left.length}`);
    pv.remove();
    // e ao remover o viewer
    const pv2 = make();
    const pre2 = new Set(document.fonts);
    pv2.loadPptx(await bytes('A.pptx'));
    await pv2.fontsReady();
    await sleep(50);
    const faces2 = added(pre2);
    pv2.remove();
    const left2 = faces2.filter((f) => document.fonts.has(f));
    ok('fontes embutidas saem ao remover o viewer', faces2.length > 0 && left2.length === 0, `faces ${faces2.length}; ainda no documento ${left2.length}`);
  }

  // 2. remover no meio do play(): o laço para
  {
    const pv = make();
    pv.loadPptx(await bytes('B.pptx'));
    let frames = 0;
    const raf = window.requestAnimationFrame;
    pv.play({ defaultSlideMs: 60_000 });
    await sleep(100);
    window.requestAnimationFrame = (cb) => { frames++; return raf(cb); };
    pv.remove();
    await sleep(300);
    window.requestAnimationFrame = raf;
    ok('remover durante play() para o laço de quadros', frames === 0 && !pv.isPlaying(), `quadros agendados após remover: ${frames}`);
  }

  // 3. src trocado durante o download: vale o último
  {
    const pv = make();
    const loaded = [];
    pv.addEventListener('us-loaded', (e) => loaded.push(e.detail.count));
    pv.setAttribute('src', `${b}/A.pptx?slow=400`);
    await sleep(20);
    pv.setAttribute('src', `${b}/B.pptx`);
    await sleep(900);
    const nB = (await (async () => { const t = make(); t.loadPptx(await bytes('B.pptx')); const n = t.getSlideCount(); t.remove(); return n; })());
    ok('src trocado no meio do download: vale o último', loaded.length === 1 && pv.getSlideCount() === nB, `us-loaded ${JSON.stringify(loaded)}; slides ${pv.getSlideCount()} (B=${nB})`);
    pv.remove();
  }

  // 4. arquivo inválido: lança e o deck atual fica
  {
    const pv = make();
    pv.loadPptx(await bytes('B.pptx'));
    const n = pv.getSlideCount();
    let threw = false;
    try { pv.loadPptx(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3])); } catch { threw = true; }
    let threw2 = false;
    try { pv.loadPptx(new TextEncoder().encode('não é pptx')); } catch { threw2 = true; }
    ok('arquivo inválido lança e mantém o deck atual', threw && threw2 && pv.getSlideCount() === n, `slides ${pv.getSlideCount()} (antes ${n})`);
    pv.remove();
  }

  // 5. fim da reprodução
  {
    const pv = make();
    pv.loadPptx(await bytes('B.pptx'));
    const ended = new Promise((r) => pv.addEventListener('us-playback-end', r, { once: true }));
    pv.play({ defaultSlideMs: 50, useTimings: false });
    await Promise.race([ended, sleep(15_000)]);
    const playingAfterEnd = pv.isPlaying();
    const tlKept = pv.getPlaybackTimeline() !== null;
    pv.next(); // no último slide: sai do palco
    ok('fim da reprodução: isPlaying() false; navegar sai do palco', !playingAfterEnd && tlKept && pv.getPlaybackTimeline() === null, `isPlaying ${playingAfterEnd}; timeline mantida no fim ${tlKept}`);
    pv.remove();
  }

  // 6. F5 do começo pula o 1º oculto
  {
    const pv = make();
    pv.loadPptx(await bytes('C.pptx'));
    pv.present('start', { fullscreen: false });
    const i = pv.getSlideIndex();
    pv.stopPresentation();
    pv.present(0, { fullscreen: false }); // pedido explícito do oculto: vale
    const j = pv.getSlideIndex();
    pv.stopPresentation();
    ok("present('start') começa no 1º slide visível", i === 1 && j === 0, `start → ${i}; present(0) → ${j}`);
    pv.remove();
  }

  // 7. todos ocultos + loop
  {
    const pv = make();
    pv.loadPptx(await bytes('D.pptx'));
    const ended = new Promise((r) => pv.addEventListener('us-playback-end', () => r(true), { once: true }));
    pv.play({ loop: true });
    const got = await Promise.race([ended, sleep(2000).then(() => false)]);
    ok('play() com todos ocultos + loop termina', got && !pv.isPlaying());
    pv.remove();
  }
  return out;
}, base);

let fails = 0;
for (const r of results) {
  if (!r.ok) fails++;
  console.log(`${r.ok ? 'OK   ' : 'FALHA'} ${r.name}${r.info ? ` — ${r.info}` : ''}`);
}
for (const e of errors.slice(0, 5)) console.log('  erro na página:', e);
await browser.close();
server.close();
console.log(fails ? `viewer-check: ${fails} falha(s)` : 'viewer-check: tudo OK');
process.exit(fails ? 1 : 0);
