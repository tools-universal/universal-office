// Imagem no CABEÇALHO pela API do Formato da Imagem (Chromium headless, sem
// janela): insere uma imagem no cabeçalho, grava, reabre, seleciona-a na edição do
// cabeçalho, aplica sombra/texto alt/giro, grava e confere o XML do cabeçalho e o
// desfazer único (corpo + cabeçalho). Servidor do demo na porta 8099.
//
//   node tools/image-lab/hf-picture-check.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'pt-BR' });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.stack ?? e)));
await page.goto('http://localhost:8099/packages/editor/demo/index.html?lang=pt');
await page.waitForFunction(() => document.title.includes('Catalogo'), null, { timeout: 30000 });
const b64 = await page.evaluate(async () => {
  const wn = document.querySelector('universal-write');
  const r = await fetch('/tools/image-lab/.out/inline.docx');
  await wn.loadDocx(new Uint8Array(await r.arrayBuffer()), { protected: false });
  const img = new Uint8Array(await (await fetch('/tools/image-lab/.out/img/pattern.png')).arrayBuffer());
  wn.enterHeaderFooter('header');
  await wn.insertImage(img, 'png');
  wn.exitHeaderFooter();
  const one = wn.saveDocx();
  await wn.loadDocx(one, { protected: false });
  await new Promise((ok) => setTimeout(ok, 800));
  wn.enterHeaderFooter('header');
  await new Promise((ok) => setTimeout(ok, 400));
  // a imagem do cabeçalho na página 1: clique no meio dela
  const pg = wn.eng.result.pages[0];
  const it = pg.items.slice(0, pg.hfItems ?? 0).find((i) => i.t === 'image');
  if (!it) return 'sem imagem no cabeçalho';
  const cv = wn.canvases[0], b = cv.getBoundingClientRect(), sc = 96 / 1440 * wn.zoom;
  const x = b.left + (it.x + it.w / 2) * sc, y = b.top + (it.y + it.h / 2) * sc;
  wn.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  if (!wn.selectedImage()) return 'imagem do cabeçalho não selecionou';
  wn.setImageEffect('shadow', 'outer-br');
  wn.setImageAltText({ text: 'Logo no cabeçalho' });
  wn.setImageRotation(10);
  wn.exitHeaderFooter();
  const two = wn.saveDocx();
  // desfazer único: três passos voltam o cabeçalho
  wn.undo(); wn.undo(); wn.undo();
  const three = wn.saveDocx();
  const enc = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  return [enc(two), enc(three)];
});
if (typeof b64 === 'string') { console.log('FALHA:', b64); process.exitCode = 1; } else {
  const hdr = (b) => {
    const parts = unzipSync(Buffer.from(b, 'base64'));
    return Object.keys(parts).filter((k) => /^word\/header\d*\.xml$/.test(k)).map((k) => strFromU8(parts[k])).join('');
  };
  const h2 = hdr(b64[0]), h3 = hdr(b64[1]);
  const ok = (c, m) => console.log(c ? 'ok  ' : 'FALHA', m);
  ok(h2.includes('<a:outerShdw'), 'sombra gravada no cabeçalho');
  ok(h2.includes('descr="Logo no cabeçalho"'), 'texto alt no cabeçalho');
  ok(/<a:xfrm rot="600000"/.test(h2), 'giro de 10° no cabeçalho');
  ok(!h3.includes('<a:outerShdw') && !h3.includes('Logo no cabeçalho'), 'desfazer volta o cabeçalho');
}
if (errs.length) console.log('ERROS:\n' + errs.join('\n'));
await browser.close();
