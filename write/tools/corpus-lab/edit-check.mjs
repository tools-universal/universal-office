// Confere a EDIÇÃO do <universal-write> sobre o motor de layout num Chromium
// headless (sem janelas): digitar, selecionar, negrito, desfazer, setas,
// IME, células de tabela, cabeçalho, comentários, visões, fallback legado,
// exportações — e que o cursor cai exatamente nos glifos que o motor
// desenhou. Usa só documentos do repositório (amostras e fixtures sintéticas).
//
// Uso: node tools/corpus-lab/edit-check.mjs [--perf] [--perf-file caminho.docx]
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, normalize, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const repoRoot = join(writeRoot, '..');
const require = createRequire(join(repoRoot, 'slides', 'package.json'));
const { chromium } = require('playwright');
const { resolveFonts, listFontFamilies } = require(join(repoRoot, 'shared', 'fonts', 'node', 'system-fonts.cjs'));

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);

const buildDir = join(tmpdir(), 'uw-edit-check');
mkdirSync(buildDir, { recursive: true });
const ed = join(writeRoot, 'packages');
await build({
  entryPoints: [join(here, 'edit-harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning', sourcemap: 'inline',
  outfile: join(buildDir, 'harness.bundle.js'),
  alias: {
    '@universal-office/docx-core': join(ed, 'docx-core', 'src', 'index.ts'),
    '@universal-office/docx-layout': join(ed, 'docx-layout', 'src', 'index.ts'),
    '@universal-office/fonts': join(repoRoot, 'shared', 'fonts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(repoRoot, 'shared', 'drawingml', 'src', 'index.ts'),
    '@universal-office/ui': join(repoRoot, 'shared', 'ui', 'src', 'index.ts'),
    '@universal-office/collation': join(repoRoot, 'sheet', 'packages', 'calc', 'src', 'collation.ts'),
    '@universal-office/compare': join(ed, 'compare', 'src', 'index.ts'),
  },
});
writeFileSync(join(buildDir, 'harness.html'),
  '<!doctype html><meta charset="utf-8"><body style="margin:0"></body><script type="module" src="/__lab/harness.bundle.js"></script>');

const extraFiles = new Map(); // /__file/<n> → caminho absoluto (medição com arquivo externo)
if (opt('doc')) extraFiles.set('doc', resolve(opt('doc'))); // --doc caminho → /__file/doc (depuração)
if (opt('perf-file')) extraFiles.set('x', resolve(opt('perf-file')));
if (opt('doc-id')) { // documento do corpus (fora do repositório) pelo id do manifesto — só leitura local
  const lab = process.env.LAB_DIR ?? 'E:/UniversalWriteTest/_lab';
  const d = JSON.parse(readFileSync(join(lab, 'manifest.json'), 'utf8')).find((m) => m.id === opt('doc-id'));
  if (d) extraFiles.set('doc', d.path);
}
const fontBlobs = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (body, type = 'application/octet-stream') => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  try {
    if (url.pathname.startsWith('/__lab/')) return send(readFileSync(join(buildDir, url.pathname.slice(7))), MIME[extname(url.pathname)]);
    if (url.pathname.startsWith('/__font/')) {
      const b = fontBlobs.get(url.pathname.slice(8));
      if (!b) { res.writeHead(404).end(); return; }
      return send(b, 'font/ttf');
    }
    if (url.pathname.startsWith('/__file/')) {
      const p = extraFiles.get(url.pathname.slice(8));
      if (!p) { res.writeHead(404).end(); return; }
      return send(readFileSync(p));
    }
    const path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
    if (!path.startsWith(repoRoot) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(res);
  } catch (e) { res.writeHead(500).end(String(e)); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const faceCache = new Map();
let nextFont = 0;
async function resolveRefs(families) {
  const out = [];
  for (const fam of families) {
    const key = String(fam).toLowerCase();
    if (!faceCache.has(key)) {
      const faces = await resolveFonts([fam]);
      faceCache.set(key, faces.map(({ bytes, ...f }) => {
        const id = String(nextFont++);
        fontBlobs.set(id, Buffer.from(bytes));
        return { ...f, url: `/__font/${id}` };
      }));
    }
    out.push(...faceCache.get(key).map((f) => ({ ...f, family: String(fam) })));
  }
  return out;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu-sandbox'] });
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1300, height: 1000 } });
await context.exposeFunction('__labListFonts', () => listFontFamilies());
await context.exposeFunction('__labResolveFonts', (families) => resolveRefs(families));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') { const t = m.text(); if (!/Failed to load resource/.test(t)) errors.push(`[${m.type()}] ${t}`.slice(0, 400)); } });
await page.goto(`${base}/__lab/harness.html`);
await page.waitForFunction(() => !!window.ed);

const ev = (fn, ...args) => page.evaluate(({ fn, args }) => window.ed[fn](...args), { fn, args });
const call = (name, ...args) => page.evaluate(({ name, args }) => window.ed.call(name, ...args), { name, args });
const results = [];
function check(name, ok, info) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : ''}`);
}
const st = () => ev('state');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const groups = (opt('only', 'body,table,fields,hf,hfopts,fuzz,sections,notes,nav,refs,toc,page,textbox,textlayout,home,perf')).split(',');
const want = (g) => groups.includes(g);
if (want('body')) {
  // ───────────── corpo: demo.docx ─────────────
  let r = await ev('open', '/write/samples/demo.docx');
  check('demo.docx abre com o motor', r.engine && r.pages > 1, r);
  let cg = await ev('caretVsGlyphs');
  check('cursor = x dos glifos (todas as linhas do corpo)', cg.checked > 500 && cg.bad.length === 0, cg);

  // clique no meio do parágrafo 1 → caret ali
  let p = await ev('clientAt', 1, 12);
  await page.mouse.click(p.x, p.y);
  let s = await st();
  check('clique posiciona o caret no parágrafo', s.sel.focus.para === 1 && Math.abs(s.sel.focus.offset - 12) <= 1, s.sel);
  let c = await ev('caret');
  check('caret sobre um glifo desenhado', c?.glyphAt, c);

  // digitar
  const before1 = await ev('text', 1);
  const off = s.sel.focus.offset;
  await page.keyboard.type('XYZ');
  let after1 = await ev('text', 1);
  check('digitar insere no modelo', after1 === before1.slice(0, off) + 'XYZ' + before1.slice(off), { off, sample: after1.slice(off - 3, off + 6) });
  check('o texto digitado é desenhado pelo motor', (await ev('drawnText', 1, 0)).includes('XYZ') || (await ev('drawnText', 1, 1)).includes('XYZ'));
  c = await ev('caret');
  s = await st();
  check('caret após a digitação (offset + glifo)', s.sel.focus.offset === off + 3 && c?.glyphAt, { sel: s.sel.focus, c });
  cg = await ev('caretVsGlyphs', 1);
  check('cursor = glifos no parágrafo editado', cg.bad.length === 0 && cg.checked > 10, cg);
  const fe = await ev('fastEqualsFull');
  check('layout incremental = layout completo', fe.mode === 'fast' && fe.equal, fe);

  // seleção com Shift+←
  await page.keyboard.down('Shift');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  s = await st();
  check('Shift+← seleciona 3 caracteres', s.sel.anchor.offset - s.sel.focus.offset === 3, s.sel);

  // negrito
  await page.keyboard.press('Control+b');
  let faces = await ev('facesAt', 1, off, off + 3);
  check('Ctrl+B: os glifos selecionados saem em negrito', faces.length === 3 && faces.every((f) => f.bold), faces);
  let neighbor = await ev('facesAt', 1, off + 3, off + 6);
  check('vizinhos continuam sem negrito', neighbor.length > 0 && neighbor.every((f) => !f.bold), neighbor);
  // cor/tamanho via API de formatação
  await call('setFontSize', 20);
  faces = await ev('facesAt', 1, off, off + 3);
  check('tamanho 20pt aplicado aos glifos', faces.length === 3 && faces.every((f) => f.sizePt === 20), faces);

  // desfazer
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  faces = await ev('facesAt', 1, off, off + 3);
  check('Ctrl+Z desfaz tamanho e negrito', faces.length === 3 && faces.every((f) => !f.bold && f.sizePt !== 20), faces);
  // cada tecla é um passo de desfazer (como antes da integração)
  for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z');
  after1 = await ev('text', 1);
  check('Ctrl+Z desfaz a digitação', after1 === before1, after1.slice(0, 40));
  await page.keyboard.press('Control+y');
  check('Ctrl+Y refaz', (await ev('text', 1)).includes('X') && (await ev('drawnText', 1, 0)).includes('menX'));
  await page.keyboard.press('Control+z');
  check('desfeito de novo', (await ev('text', 1)) === before1);

  // setas / Home / End
  p = await ev('clientAt', 1, 5);
  await page.mouse.click(p.x, p.y);
  const l0 = await ev('line', 1, 0);
  const l1 = await ev('line', 1, 1);
  await page.keyboard.press('End');
  s = await st();
  check('End vai ao fim da linha (antes do espaço final)', s.sel.focus.offset <= l0.rich.end && s.sel.focus.offset >= l0.rich.end - 2, { focus: s.sel.focus, line: l0.rich });
  await page.keyboard.press('Home');
  s = await st();
  check('Home vai ao início da linha', s.sel.focus.offset === l0.rich.start, s.sel.focus);
  await page.keyboard.press('ArrowDown');
  s = await st();
  check('↓ vai para a linha seguinte', l1 ? s.sel.focus.para === 1 && s.sel.focus.offset >= l1.rich.start && s.sel.focus.offset <= l1.rich.end : s.sel.focus.para === 2, { focus: s.sel.focus, l1: l1?.rich });
  c = await ev('caret');
  check('↓: caret alinhado a um glifo', c?.glyphAt, c);
  await page.keyboard.press('ArrowUp');
  s = await st();
  check('↑ volta à 1ª linha', s.sel.focus.para === 1 && s.sel.focus.offset <= l0.rich.end, s.sel.focus);

  // Enter / Backspace / Delete
  const paras0 = (await st()).paras;
  await page.keyboard.press('Enter');
  check('Enter divide o parágrafo', (await st()).paras === paras0 + 1);
  await page.keyboard.press('Backspace');
  check('Backspace junta de volta', (await st()).paras === paras0 && (await ev('text', 1)) === before1);
  await page.keyboard.press('Delete');
  check('Delete apaga um caractere', (await ev('text', 1)).length === before1.length - 1);
  await page.keyboard.press('Control+z');

  // IME (composição)
  await page.evaluate(() => {
    const ta = document.querySelector('universal-write').shadowRoot.querySelector('textarea');
    ta.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    ta.value = 'ção';
    ta.dispatchEvent(new InputEvent('input', { data: 'ção', isComposing: true }));
    ta.dispatchEvent(new CompositionEvent('compositionend', { data: 'ção' }));
  });
  check('IME: o texto composto entra uma vez', (await ev('text', 1)).split('ção').length - 1 === before1.split('ção').length, (await ev('text', 1)).slice(0, 30));
  await page.keyboard.press('Control+z');

  // seleção por arrasto
  const a = await ev('clientAt', 2, 2);
  const b = await ev('clientAt', 2, 20);
  if (a && b) {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await page.mouse.up();
    s = await st();
    check('arrastar seleciona', s.sel.anchor.para === 2 && s.sel.focus.para === 2 && Math.abs(s.sel.focus.offset - s.sel.anchor.offset) >= 15, s.sel);
    // seleção pintada: pixel azulado no meio do trecho
    const mid = await page.evaluate(() => {
      const e = document.querySelector('universal-write');
      const ln = e.lineOf(e.selection.focus);
      const x0 = e.caretX(e.selection.anchor, ln), x1 = e.caretX(e.selection.focus, ln);
      return { page: ln.page, x: (x0 + x1) / 2, y: ln.yTwips + 15 };
    });
    const px = await ev('pixel', mid.page, mid.x, mid.y);
    check('seleção pintada (fundo azul)', px[2] > px[0] + 20, px);
  }

  // comentário
  const id = await call('addComment', 'nota de teste', 'QA');
  const anchor = await call('commentAnchorPx', id);
  check('comentário: âncora na linha comentada', id !== null && anchor && anchor.heightPx > 0, { id, anchor });
  await page.keyboard.press('ArrowRight');
  const cm = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    for (let pi = 0; pi < e.model.paragraphs.length; pi++) {
      let acc = 0;
      for (const r of e.model.paragraphs[pi].runs) {
        if (r.props.commentIds?.length) {
          const ln = e.lineOf({ para: pi, offset: acc });
          const x0 = e.caretX({ para: pi, offset: acc }, ln), x1 = e.caretX({ para: pi, offset: acc + r.text.length }, ln);
          return { page: ln.page, x: (x0 + x1) / 2, y: ln.yTwips + 15 };
        }
        acc += r.text.length;
      }
    }
    return null;
  });
  const cpx = cm ? await ev('pixel', cm.page, cm.x, cm.y) : [0, 0, 0, 0];
  check('comentário realçado (âmbar)', cm && cpx[0] > cpx[2] + 20, cpx);

  // estilo de caractere (w:rStyle "Strong") sobrevive a digitar/apagar no run
  const strong = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const ps = e.model.paragraphs;
    for (let pi = 0; pi < ps.length; pi++) {
      let acc = 0;
      for (const r of ps[pi].runs) {
        if (r.rpr?.rStyle === 'Strong' && r.text.length > 6) return { pi, off: acc + 3 };
        acc += r.text.length;
      }
    }
    return null;
  });
  if (strong) {
    const ref = await ev('facesAt', strong.pi, strong.off - 1, strong.off);
    await page.evaluate(({ pi, off }) => { const e = document.querySelector('universal-write'); e.selection = { anchor: { para: pi, offset: off }, focus: { para: pi, offset: off } }; }, strong);
    await page.keyboard.type('Q');
    let got = await ev('facesAt', strong.pi, strong.off, strong.off + 1);
    check('digitar dentro de run com estilo de caractere herda o estilo (negrito "Strong")', ref.length && got.length && got[0].bold === ref[0].bold && got[0].bold, { ref, got });
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    got = await ev('facesAt', strong.pi, strong.off - 2, strong.off);
    check('apagar no run mantém o estilo nos restos do run', got.length === 2 && got.every((f) => f.bold), got);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    // Limpar Formatação tira o estilo de caractere (o motor lê o rPr); desfazer volta
    const cl = await page.evaluate(({ pi, off }) => {
      const e = document.querySelector('universal-write');
      e.selection = { anchor: { para: pi, offset: off - 3 }, focus: { para: pi, offset: off + 2 } };
      e.clearFormatting();
      const after = window.ed.facesAt(pi, off - 3, off + 2).map((f) => f.bold);
      e.undo();
      const undone = window.ed.facesAt(pi, off - 3, off + 2).map((f) => f.bold);
      return { after, undone };
    }, strong);
    check('Limpar Formatação tira o estilo de caractere; desfazer devolve', cl.after.length && cl.after.every((b) => !b) && cl.undone.every((b) => b), cl);
  }

  // imagem flutuante: arrastar move pelo retângulo do motor
  const fl = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const h = e.enumFloats().find((x) => x.kind === 'image' && x.rect.w * x.rect.h < 0.3 * 12240 * 15840);
    return h ? { page: h.page, x: h.rect.x, y: h.rect.y, w: h.rect.w, h: h.rect.h } : null;
  });
  if (fl) {
    const from = await ev('client', fl.page, fl.x + fl.w / 2, fl.y + fl.h / 2);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 30, { steps: 6 });
    await page.mouse.up();
    await sleep(30);
    const moved = await page.evaluate(() => {
      const e = document.querySelector('universal-write');
      const h = e.enumFloats().find((x) => x.run === e.floatSel);
      return h ? { page: h.page, x: h.rect.x, y: h.rect.y } : null;
    });
    const dxTw = 40 * 15, dyTw = 30 * 15;
    check('arrastar imagem flutuante move o desenho do motor (+40px, +30px)', moved && Math.abs(moved.x - fl.x - dxTw) < 20 && Math.abs(moved.y - fl.y - dyTw) < 20, { fl, moved });
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Escape');
  }

  // visões
  for (const v of ['web', 'draft', 'outline', 'read', 'print']) {
    await call('setView', v);
    s = await st();
    check(`visão ${v}: ${v === 'print' || v === 'read' ? 'motor' : 'layout legado'}`, s.engine === (v === 'print' || v === 'read'), { engine: s.engine, pages: s.pages });
  }
  cg = await ev('caretVsGlyphs');
  check('de volta à impressão: cursor = glifos', cg.bad.length === 0, cg);

  // layout="legacy" e volta
  await page.evaluate(() => document.querySelector('universal-write').setAttribute('layout', 'legacy'));
  check('layout="legacy" desliga o motor', !(await st()).engine);
  await page.evaluate(() => document.querySelector('universal-write').removeAttribute('layout'));
  check('sem o atributo o motor volta', (await st()).engine);

  // exportações depois de editar
  await page.keyboard.type('Q');
  const pdfInfo = await page.evaluate(async () => {
    const e = document.querySelector('universal-write');
    const pdf = await e.exportPdf();
    const txt = new TextDecoder('latin1').decode(pdf);
    return { len: pdf.length, pages: (txt.match(/\/Type\s*\/Page\b/g) ?? []).length, canvas: e.pageCount };
  });
  check('exportPdf depois de editar (estado vivo; mesmas páginas do canvas)', pdfInfo.len > 1000 && pdfInfo.pages === pdfInfo.canvas, pdfInfo);
  const xpsLen = await page.evaluate(() => document.querySelector('universal-write').exportXps().length);
  check('exportXps (layout legado durante a chamada) e o motor volta', xpsLen > 1000 && (await st()).engine, xpsLen);
  // ODT: exporta e reabre (sem formatação do Word: o motor usa a formatação vazia)
  const odt = await page.evaluate(async () => {
    const e = document.querySelector('universal-write');
    const bytes = e.exportOdt();
    e.load(bytes, 'odt', { protected: false });
    await new Promise((r) => setTimeout(r, 50));
    return { engine: !!e.eng, pages: e.pageCount, len: bytes.length };
  });
  check('documento ODT abre com o motor', odt.engine && odt.pages > 0, odt);
  cg = await ev('caretVsGlyphs');
  check('ODT: cursor = glifos', cg.bad.length === 0 && cg.checked > 100, cg);
  // documento novo
  await call('newDocument');
  await page.keyboard.type('abc');
  check('documento novo com o motor', (await st()).engine && (await ev('text', 0)) === 'abc' && (await ev('drawnText', 0, 0)) === 'abc');
  // inline de plugin (mention): caractere atômico + desenho do plugin
  await ev('mention', 'Ana');
  await page.keyboard.type('z');
  const mt = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const line = e.lineOf({ para: 0, offset: 3 });
    const chip = line.eng.chars.find((c) => c.o === 3);
    const z = line.eng.chars.find((c) => c.o === 4);
    return { chip, z, caretAfter: e.caretX({ para: 0, offset: 4 }, line), y: line.yTwips + line.heightTwips / 2, page: line.page };
  });
  check('mention: um caractere atômico; o "z" depois dele', mt.chip && mt.z && Math.abs(mt.z.x - (mt.chip.x + mt.chip.w)) < 0.5 && Math.abs(mt.caretAfter - mt.z.x) < 0.01, mt);
  const mpx = await ev('pixel', mt.page, mt.chip.x + 30, mt.y);
  check('mention: o plugin desenha o chip', mpx[2] > mpx[0] + 15, mpx);

}
if (want('table')) {
  // ───────────── tabela ─────────────
  let s, c, cg, p;
  let r = await ev('open', '/write/packages/docx-layout/test/oracle/tables/tb-cellmar.docx');
  check('tabela abre com o motor', r.engine, r);
  let cellPt = await ev('clientOfRef', /^b\d+\/r0\/c0\/b0$/);
  await page.mouse.click(cellPt.x, cellPt.y);
  s = await st();
  check('clique na célula entra na edição da célula', s.cell, { ref: cellPt.ref, s: s.sel });
  const cellBefore = await ev('text', 0);
  await page.keyboard.type('ABC');
  const cellAfter = await ev('text', 0);
  check('digitar na célula altera o texto dela', cellAfter.length === cellBefore.length + 3 && cellAfter.includes('ABC'), cellAfter);
  check('o motor desenha o texto da célula', (await ev('drawnText', 0, 0)).includes('ABC'), await ev('drawnText', 0, 0));
  c = await ev('caret');
  check('caret na célula sobre glifo', c?.glyphAt, c);
  cg = await ev('caretVsGlyphs');
  check('cursor = glifos na célula', cg.bad.length === 0 && cg.checked > 0, cg);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z');
  check('Ctrl+Z na célula', (await ev('text', 0)) === cellBefore && !(await ev('drawnText', 0, 0)).includes('A'), await ev('text', 0));
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Tab');
  s = await st();
  check('Tab vai para a próxima célula (seleciona o conteúdo)', s.cell && (s.sel.anchor.offset !== s.sel.focus.offset || s.sel.focus.offset === 0), s.sel);
  await page.keyboard.type('Z');
  check('digitar substitui o conteúdo selecionado da célula', (await ev('text', 0)) === 'Z', await ev('text', 0));
  await page.keyboard.press('Escape');
  check('Esc sai da célula', !(await st()).cell);
  // corpo depois da tabela
  p = await ev('clientAt', (await st()).paras - 1, 1);
  await page.mouse.click(p.x, p.y);
  check('clique no corpo depois da tabela: fora da célula', !(await st()).cell);

}
if (want('fields')) {
  // ───────────── campos: sombreamento de tela ─────────────
  await ev('open', '/write/packages/docx-layout/test/oracle/fields/fld-pageref.docx');
  const f = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    for (const el of e.eng.lines) {
      const p = el.para;
      if (!p) continue;
      let acc = 0;
      for (const r of p.runs) {
        if ((r.field || r.fieldResult) && r.text.length && el.line.start <= acc && acc < el.line.end) {
          const x = e.constructor.prototype ? null : null;
          void x;
          return { page: el.page, start: acc, end: acc + r.text.length, line: el.line };
        }
        acc += r.text.length;
      }
    }
    return null;
  });
  if (f) {
    const xs = await page.evaluate(({ f }) => {
      const cs = f.line.chars.filter((c) => c.o >= f.start && c.o < f.end);
      return cs.length ? { x: (cs[0].x + cs[cs.length - 1].x + cs[cs.length - 1].w) / 2, y: f.line.y + 8 } : null;
    }, { f });
    const px = xs ? await ev('pixel', f.page, xs.x, xs.y) : [255, 255, 255, 255];
    check('campo sombreado na tela (cinza)', xs && px[0] < 245 && Math.abs(px[0] - px[2]) < 12, { px, f: { start: f.start, end: f.end } });
    await page.evaluate(() => { const e = document.querySelector('universal-write'); e.printRender = true; e.paint(); });
    const px2 = xs ? await ev('pixel', f.page, xs.x, xs.y) : [0, 0, 0, 0];
    check('impressão: sem sombreamento de campo', px2[0] > px[0], px2);
    await page.evaluate(() => { const e = document.querySelector('universal-write'); e.printRender = false; e.paint(); });
  } else check('campo encontrado no fixture', false);
}

if (want('hf')) {
  // ───────────── cabeçalho/rodapé (linhas hdr:/ftr: do motor) ─────────────
  let s;
  const r = await ev('open', '/write/packages/docx-layout/test/oracle/hf/hdr-text-short-1417.docx');
  check('cabeçalho: documento abre com o motor', r.engine, r);
  const hfDim = await page.evaluate(() => document.querySelector('universal-write').eng.hfItems[0]);
  check('itens do cabeçalho (page.hfItems) esmaecidos na tela', hfDim > 0, hfDim);
  // linha do cabeçalho e do corpo na página 0 (tinta antes/depois de entrar)
  const geo = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const h = e.eng.lines.find((l) => l.loc.kind === 'hf' && l.page === 0).line;
    const b = e.eng.lines.find((l) => l.loc.kind === 'body' && l.page === 0).line;
    return { h: { x: h.x, y: h.y, w: Math.min(h.width, 1500), hh: h.height }, b: { x: b.x, y: b.y, w: Math.min(b.width, 1500), hh: b.height } };
  });
  const inkBodyBefore = await ev('inkMin', 0, geo.b.x, geo.b.y, geo.b.w, geo.b.hh);
  const inkHdrBefore = await ev('inkMin', 0, geo.h.x, geo.h.y, geo.h.w, geo.h.hh);
  const hp = await ev('client', 0, geo.h.x + 200, geo.h.y + geo.h.hh / 2);
  await page.mouse.dblclick(hp.x, hp.y);
  s = await st();
  check('duplo clique no cabeçalho entra na edição dele, no motor', s.hf && s.engine, { hf: s.hf, engine: s.engine });
  const inkBodyIn = await ev('inkMin', 0, geo.b.x, geo.b.y, geo.b.w, geo.b.hh);
  const inkHdrIn = await ev('inkMin', 0, geo.h.x, geo.h.y, geo.h.w, geo.h.hh);
  check('na edição: cabeçalho em foco, corpo esmaecido (o inverso da visão normal)', inkHdrBefore > inkHdrIn + 40 && inkBodyIn > inkBodyBefore + 40, { inkHdrBefore, inkHdrIn, inkBodyBefore, inkBodyIn });
  let c = await ev('caret');
  check('caret do cabeçalho sobre glifo do motor', c?.glyphAt && c.y < 1417, c);
  let cg = await ev('caretVsGlyphs');
  check('cursor = glifos no cabeçalho', cg.bad.length === 0 && cg.checked > 3, cg);
  await page.keyboard.press('End');
  await page.keyboard.type(' HDRX');
  check('digitar no cabeçalho: o motor desenha', (await ev('hfText', 'hdr'))[0].includes('HDRX'), await ev('hfText', 'hdr'));
  c = await ev('caret');
  check('caret depois do texto digitado no cabeçalho', c?.glyphAt, c);
  await page.keyboard.down('Shift');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Control+b');
  const hb = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const len = e.model.paragraphs[0].runs.reduce((a, r) => a + r.text.length, 0);
    return window.ed.facesAt(0, len - 4, len).map((f) => f.bold);
  });
  check('negrito no cabeçalho', hb.length === 4 && hb.every(Boolean), hb);
  await page.keyboard.press('Control+z');
  check('desfazer no cabeçalho', (await page.evaluate(() => { const e = document.querySelector('universal-write'); const len = e.model.paragraphs[0].runs.reduce((a, r) => a + r.text.length, 0); return window.ed.facesAt(0, len - 4, len).every((f) => !f.bold); })));
  await page.keyboard.press('Escape');
  s = await st();
  check('Esc sai; o motor desenha o cabeçalho editado no corpo', !s.hf && s.engine && (await ev('hfText', 'hdr'))[0].includes('HDRX'));

  // herança: a 2ª seção usa o cabeçalho da 1ª — editar a parte que DEFINE
  await ev('open', '/write/packages/docx-layout/test/oracle/hf/hf-inherit.docx');
  const g1 = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const h = e.eng.lines.find((l) => l.loc.kind === 'hf' && l.loc.which === 'hdr' && l.page === 1).line;
    return { x: h.x + 100, y: h.y + h.height / 2 };
  });
  const p1 = await ev('client', 1, g1.x, g1.y);
  await page.mouse.dblclick(p1.x, p1.y);
  s = await st();
  check('cabeçalho herdado (página 2) entra em edição', s.hf && s.engine, s.sel);
  await page.keyboard.press('Home');
  await page.keyboard.type('INH ');
  await page.keyboard.press('Escape');
  const inh = await ev('hfText', 'hdr');
  check('edição do cabeçalho herdado vale em todas as seções', inh.length >= 3 && inh.every((t) => t.includes('INH')), inh);
  // rodapé: clique simples no rodapé troca o foco
  await page.mouse.dblclick(p1.x, p1.y);
  const fpt = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const f = e.eng.lines.find((l) => l.loc.kind === 'hf' && l.loc.which === 'ftr' && l.page === 1).line;
    return { x: f.x + 100, y: f.y + f.height / 2 };
  });
  const fp = await ev('client', 1, fpt.x, fpt.y);
  await page.mouse.click(fp.x, fp.y);
  s = await st();
  check('clique no rodapé troca o foco para o rodapé', s.hf && (await page.evaluate(() => document.querySelector('universal-write').hfEdit.kind)) === 'footer', s.sel);
  await page.keyboard.type('FTZ');
  await page.keyboard.press('Escape');
  check('o motor desenha o rodapé editado', (await ev('hfText', 'ftr')).some((t) => t.includes('FTZ')), await ev('hfText', 'ftr'));

  // rodapé mais alto que a margem: a faixa vem das linhas do motor
  await ev('open', '/write/packages/docx-layout/test/oracle/hf/ftr-tall.docx');
  const tall = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const ls = e.eng.lines.filter((l) => l.loc.kind === 'hf' && l.page === 0).map((l) => l.line);
    const sp = e.sectionOfPage(0).sectPr;
    const top = ls[0];
    return { x: top.x + 50, y: top.y + top.height / 2, marginLine: sp.pageHeightTwips - sp.marginBottomTwips };
  });
  const tp = await ev('client', 0, tall.x, tall.y);
  await page.mouse.dblclick(tp.x, tp.y);
  s = await st();
  check('rodapé alto (acima da margem inferior) entra em edição pelo clique no texto dele', s.hf && tall.y < tall.marginLine, { hf: s.hf, y: tall.y, margem: tall.marginLine });
  await page.keyboard.press('Escape');

  // imprimir logo depois de abrir: a figura dentro de um GRUPO no cabeçalho não é
  // run.image do modelo — printPages decodifica o que o motor desenha (antes saía
  // sem ela; varredura do editor no corpus, 2026-10-22). Abrir e imprimir na mesma
  // avaliação: a decodificação disparada pela 1ª pintura ainda está em curso.
  const { cases: hgCases } = await import(new URL('../layout-oracle/cases/hfgroup.mjs', import.meta.url).href);
  const hg = hgCases.find((c) => c.name === 'hg-notitle');
  const blue = await page.evaluate(async (b64) => {
    await window.ed.openBase64(b64);
    const [url] = await document.querySelector('universal-write').printPages();
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    // faixa do grupo: 595 × 93,75 pt no topo da página, imagem sólida (20, 20, 160)
    const d = x.getImageData(0, 0, img.width, Math.round(img.height * 0.1)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] > 120) n++;
    return { n, of: d.length / 4 };
  }, Buffer.from(hg.docx).toString('base64'));
  check('imprimir logo depois de abrir leva a figura do grupo do cabeçalho', blue.n > blue.of * 0.5, blue);

  // imagem TIFF (o Chromium não decodifica): o canvas usa o decodificador do motor, o
  // mesmo do PDF — antes ficava em branco na tela e na impressão (corpus t43-fac9b9ad)
  const { buildDocx, docDefaults: dd, p: pp, r: rr } = await import(new URL('../layout-oracle/docx-builder.mjs', import.meta.url).href);
  const le16 = (v) => [v & 0xff, v >> 8], le32 = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24];
  const tiffRgb = (w, h, [R, G, B]) => {
    // II*, IFD com 9 entradas logo depois do cabeçalho; BitsPerSample (3 × 8) e os pixels depois
    const tags = [[256, 3, w], [257, 3, h], [258, 3, 0], [259, 3, 1], [262, 3, 2], [273, 4, 0], [277, 3, 3], [278, 3, h], [279, 4, w * h * 3]];
    const ifd = 8, bpsOff = ifd + 2 + tags.length * 12 + 4, pixOff = bpsOff + 6;
    const out = [0x49, 0x49, 42, 0, ...le32(ifd), ...le16(tags.length)];
    for (const [tag, type, v] of tags) {
      const val = tag === 258 ? bpsOff : tag === 273 ? pixOff : v;
      out.push(...le16(tag), ...le16(type), ...le32(tag === 258 ? 3 : 1), ...(type === 3 && tag !== 258 ? [...le16(val), 0, 0] : le32(val)));
    }
    out.push(0, 0, 0, 0, ...le16(8), ...le16(8), ...le16(8));
    for (let i = 0; i < w * h; i++) out.push(R, G, B);
    return new Uint8Array(out);
  };
  const EMU = 12700 * 200;
  const tifPic = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${EMU}" cy="${EMU}"/><wp:docPr id="1" name="tif"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="tif"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${EMU}" cy="${EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const tifDocx = buildDocx({ body: pp(rr('Antes')) + pp(tifPic) + pp(rr('Depois')), defaults: dd(), media: { 'image1.tiff': tiffRgb(8, 8, [200, 30, 30]) } });
  const red = await page.evaluate(async (b64) => {
    await window.ed.openBase64(b64);
    const [url] = await document.querySelector('universal-write').printPages();
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i + 1] < 70 && d[i + 2] < 70) n++;
    return n;
  }, Buffer.from(tifDocx).toString('base64'));
  // 200 × 200 pt a 96 dpi ≈ 266² px
  check('imagem TIFF aparece na página (decodificador do motor)', red > 60000, red);
}

// ───────────── cabeçalho e rodapé: opções, vincular, modelos (frente Cabeçalho e rodapé) ─────────────
if (want('hfopts')) {
  const E = 'document.querySelector("universal-write")';
  const js = (body) => page.evaluate(`(() => { const e = ${E}; ${body} })()`);
  // 2 seções; a 2ª com titlePg e parte própria só no padrão (a "first" herdada)
  await ev('open', '/write/packages/docx-layout/test/oracle/hfopts/ln-own-default.docx');
  let hdr = await ev('hfText', 'hdr');
  check('hfopts: o documento abre com o cabeçalho de cada página (capa herdada na seção 2)', hdr.length >= 4 && hdr[2].includes('S1primeira') && hdr[3].includes('S2proprio'), hdr);
  // seção 2, página 3 (capa da seção): cabeçalho "first" herdado → vinculado
  await js('e.enterHeaderFooter("header", 2);');
  let o = await js('return e.getHeaderFooterOptions();');
  check('hfopts: na capa da seção 2 a parte é a "first" e está vinculada', o.section === 1 && o.part?.type === 'first' && o.linkToPrevious === true && o.differentFirstPage, o);
  await js('e.setLinkToPrevious(false); e.type("NOVO ");');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: desvincular copia a capa herdada e a edição vale só na seção 2', hdr[2].startsWith('NOVO') && hdr[0].includes('S1primeira') && !hdr[0].includes('NOVO'), hdr);
  o = await js('return e.getHeaderFooterOptions();');
  check('hfopts: depois de desvincular, Vincular ao Anterior desligado', o.linkToPrevious === false, o);
  let xml = await page.evaluate(() => window.ed.savedParts(['word/document.xml', 'word/_rels/document.xml.rels']));
  const lastSect = (x) => x.slice(x.lastIndexOf('<w:sectPr'));
  check('hfopts: o sectPr da seção 2 ganha a ref "first", a parte nova entra nas rels e o modo cabeçalho continua depois de salvar',
    /<w:headerReference w:type="first" r:id="rId\d+"\/>/.test(lastSect(xml['word/document.xml'])) && /Target="header\d+\.xml"/.test(xml['word/_rels/document.xml.rels'])
    && (await js('return e.editingHeaderFooter();')) === 'header', null);
  // desfazer (Ctrl+Z) volta o texto e depois o vínculo, no modo cabeçalho
  await js('e.undo(); e.undo();');
  o = await js('return e.getHeaderFooterOptions();');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: desfazer volta o texto e o vínculo (pilha única)', o.linkToPrevious === true && !hdr[2].includes('NOVO') && hdr[2].includes('S1primeira'), { o, hdr: hdr[2] });
  await js('e.redo(); e.redo();');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: refazer devolve a parte desvinculada com o texto', hdr[2].startsWith('NOVO'), hdr[2]);
  // vincular de novo: a parte da seção sai
  await js('e.setLinkToPrevious(true);');
  hdr = await ev('hfText', 'hdr');
  xml = await page.evaluate(() => window.ed.savedParts(['word/document.xml']));
  check('hfopts: vincular volta a capa da seção 1 e tira a ref', hdr[2].includes('S1primeira') && !/<w:headerReference w:type="first"/.test(lastSect(xml['word/document.xml'])), hdr[2]);
  // Anterior/Próximo pela ordem do Word
  await js('e.exitHeaderFooter(); e.enterHeaderFooter("header", 0);');
  const seq = await js(`const out = [];
    for (let i = 0; i < 5; i++) { const x = e.getHeaderFooterOptions(); out.push(x.section + ':' + x.part.type); e.nextHeaderFooter(); }
    return out;`);
  check('hfopts: Próximo na ordem do Word (capa → padrão, por seção) e para no fim', seq.join(',') === '0:first,0:default,1:first,1:default,1:default', seq);
  await js('e.exitHeaderFooter();');

  // Primeira Página Diferente, Pares e Ímpares, distâncias e número de página num documento novo
  await ev('blank');
  await js('for (let i = 0; i < 3; i++) { e.type("Pagina " + (i + 1)); e.insertPageBreak(); } e.type("Pagina 4");');
  await js('e.enterHeaderFooter("header", 0); e.type("CAB");');
  await js('e.setDifferentFirstPage(true);');
  o = await js('return e.getHeaderFooterOptions();');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: Primeira Página Diferente — a capa fica sem cabeçalho e o cursor vai para a parte dela', o.differentFirstPage && o.part.type === 'first' && hdr[0] === '' && hdr[1].includes('CAB'), { o: o.part, hdr });
  await js('e.exitHeaderFooter(); e.enterHeaderFooter("header", 1); e.setDifferentOddEven(true);');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: Pares e Ímpares — a página par (2) fica sem cabeçalho, a ímpar (3) mantém', hdr[1] === '' && hdr[2].includes('CAB'), hdr);
  xml = await page.evaluate(() => window.ed.savedParts(['word/document.xml', 'word/settings.xml']));
  check('hfopts: XML como o Word — <w:titlePg/> no sectPr e <w:evenAndOddHeaders/> nas settings', xml['word/document.xml'].includes('<w:titlePg/>') && xml['word/settings.xml'].includes('<w:evenAndOddHeaders/>'), null);
  await js('e.setHeaderFooterDistance({ header: 1134, footer: 850 });');
  const hy = await js('const l = e.eng.lines.find((x) => x.loc.kind === "hf" && x.loc.which === "hdr" && x.page === 2); return l ? l.line.y : -1;');
  check('hfopts: distância do cabeçalho de 2 cm (1134 tw) move o cabeçalho', hy >= 1134 && hy < 1134 + 300, hy);
  // número de página da galeria + formato
  await js('e.exitHeaderFooter(); e.insertHeaderFooterTemplate("pageBottom", "plainCenter");');
  let ftr = await ev('hfText', 'ftr');
  check('hfopts: Fim da Página › Número simples — o rodapé mostra o número de cada página', ftr[1] === '2' && ftr[3] === '4', ftr);
  await js('e.setPageNumberFormat({ format: "lowerRoman", start: 3 });');
  ftr = await ev('hfText', 'ftr');
  check('hfopts: Formatar Números de Página (i, ii… a partir de 3; capa e pares sem rodapé)', ftr[1] === 'iv' && ftr[3] === 'vi', ftr);
  xml = await page.evaluate(() => window.ed.savedParts(['word/document.xml']));
  check('hfopts: pgNumType como o Word', xml['word/document.xml'].includes('<w:pgNumType w:fmt="lowerRoman" w:start="3"/>'), null);
  await js('e.removePageNumbers();');
  ftr = await ev('hfText', 'ftr');
  check('hfopts: Remover Números de Página tira o número da galeria', ftr.every((t) => t === ''), ftr);
  // desfazer no CORPO volta o rodapé sem entrar nele (Word)
  await js('e.exitHeaderFooter(); e.undo();');
  ftr = await ev('hfText', 'ftr');
  const mode = await js('return e.editingHeaderFooter();');
  check('hfopts: desfazer no corpo volta o número de página e fica no corpo', mode === null && ftr[1] === 'iv', { mode, ftr });
  // Remover Cabeçalho e Mostrar Texto do Documento
  await js('e.enterHeaderFooter("header", 2); e.removeHeaderFooter("header");');
  hdr = await ev('hfText', 'hdr');
  check('hfopts: Remover Cabeçalho esvazia a parte da página', hdr[2] === '', hdr);
  await js('e.showDocumentText(false);');
  check('hfopts: Mostrar Texto do Documento desligado', (await js('return e.documentTextShown();')) === false, null);
  await js('e.showDocumentText(true); e.exitHeaderFooter();');
}

// depuração: --eval arquivo.js (corpo de função async; recebe `ed`, `el` e `page`)
if (opt('eval')) {
  const src = readFileSync(opt('eval'), 'utf8');
  const fn = new Function('page', 'ev', 'call', `return (async () => { ${src} })();`);
  console.log(JSON.stringify(await fn(page, ev, call), null, 1));
}

// ───────────── incremental × completo (edições aleatórias) ─────────────
if (want('fuzz')) {
  for (const doc of ['/write/samples/demo.docx', '/write/packages/docx-layout/test/oracle/tables/tb-styles-c15.docx', '/write/packages/docx-layout/test/oracle/hf/hdr-img-60-600.docx']) {
    await ev('open', doc);
    let fast = 0, full = 0, bad = 0;
    const errs = [];
    let seed = 7;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let it = 0; it < 40; it++) {
      const r = await page.evaluate(({ a, b, c }) => {
        const e = document.querySelector('universal-write');
        const ps = e.model.paragraphs;
        const pi = a % ps.length;
        const len = ps[pi].runs.reduce((s, r) => s + r.text.length, 0);
        const off = len ? b % (len + 1) : 0;
        e.selection = { anchor: { para: pi, offset: off }, focus: { para: pi, offset: off } };
        if (c % 4 === 0 && off > 0) e.pressBackspace();
        else if (c % 7 === 0) { e.selection = { anchor: { para: pi, offset: Math.max(0, off - 3) }, focus: { para: pi, offset: off } }; e.toggleRunProp('bold'); }
        else e.type(c % 5 === 0 ? ' ' : String.fromCharCode(97 + (c % 26)));
        return e.engineStats.mode;
      }, { a: rnd(1000), b: rnd(1000), c: rnd(1000) });
      if (r === 'fast') {
        fast++;
        const fe = await ev('fastEqualsFull');
        if (!fe.equal) { bad++; if (errs.length < 2) errs.push(fe.diff); }
      } else full++;
    }
    check(`incremental = completo em 40 edições aleatórias (${doc.split("/").pop()})`, bad === 0 && fast > 5, { fast, full, bad });
    for (const x of errs) console.log("   diff:", x);
  }
}

if (want('fuzz')) {
  // células: digitar/apagar em células aleatórias de tabelas de uma página
  for (const doc of ['/write/packages/docx-layout/test/oracle/tables/tb-styles-c15.docx', '/write/samples/demo.docx']) {
    await ev('open', doc);
    let fast = 0, full = 0, bad = 0;
    const errs = [];
    let seed = 11;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const nCells = await page.evaluate(() => document.querySelector('universal-write').eng.lines.filter((l) => l.loc.kind === 'cell').length);
    for (let it = 0; it < Math.min(30, nCells * 3); it++) {
      const k = rnd(nCells), c = rnd(1000);
      const r = await page.evaluate(({ k, c }) => {
        const e = document.querySelector('universal-write');
        if (e.cellEdit) { e.exitCell(); e.refreshSelection(); }
        const el = e.eng.lines.filter((l) => l.loc.kind === 'cell')[k];
        if (!e.enterCell(el.loc.anchor, el.loc.hops)) return 'skip';
        const ps = e.model.paragraphs;
        const pi = c % ps.length;
        const len = ps[pi].runs.reduce((s, r) => s + r.text.length, 0);
        const off = len ? c % (len + 1) : 0;
        e.selection = { anchor: { para: pi, offset: off }, focus: { para: pi, offset: off } };
        if (c % 3 === 0 && off > 0) e.pressBackspace(); else e.type(String.fromCharCode(97 + (c % 26)));
        return e.engineStats.mode;
      }, { k, c });
      if (r === 'fast') {
        fast++;
        const fe = await ev('fastEqualsFull');
        if (!fe.equal) { bad++; if (errs.length < 2) errs.push(fe.diff); }
      } else if (r !== 'skip') full++;
    }
    check(`células: incremental = completo (${doc.split('/').pop()})`, bad === 0 && fast > 3, { fast, full, bad });
    for (const x of errs) console.log('   diff:', x);
  }
}

// ───────────── seções e colunas (documento sintético) ─────────────
if (want('sections')) {
  await ev('synthetic', 14, 70);
  const S = () => page.evaluate(() => {
    const e = document.querySelector('universal-write');
    return { secs: e.sectionStarts.map((s) => [s.startPara, s.section.sectPr.type ?? 'nextPage', s.section.sectPr.cols?.count ?? 1]), paras: e.model.paragraphs.length, sel: e.selection.focus };
  });
  const at = (para, offset = 0) => page.evaluate(({ para, offset }) => { document.querySelector('universal-write').selection = { anchor: { para, offset }, focus: { para, offset } }; }, { para, offset });
  await at(3, 10);
  await call('insertSectionBreak', 'continuous');
  let s = await S();
  check('quebra contínua no meio do parágrafo: divide e abre a 2ª seção', s.paras === 15 && s.secs.length === 2 && s.secs[1][0] === 4 && s.secs[1][1] === 'continuous' && s.sel.para === 4 && s.sel.offset === 0, s);
  await call('setColumns', 'two');
  s = await S();
  check('Duas colunas na seção do cursor', s.secs[1][2] === 2 && s.secs[0][2] === 1, s);
  // linhas da 2ª seção em duas colunas: x à esquerda e à direita
  const xs = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const set = new Set();
    for (let pi = 4; pi < e.model.paragraphs.length; pi++) for (const l of e.layoutCache[pi].lines) if (l.page === 0) set.add(Math.round(l.xTwips / 100));
    return [...set].sort((a, b) => a - b);
  });
  check('o texto da seção flui em duas colunas', xs.length >= 2 && xs[xs.length - 1] - xs[0] > 30, xs);
  let cg = await ev('caretVsGlyphs');
  check('cursor = glifos nas colunas', cg.bad.length === 0 && cg.checked > 100, cg);
  // clique na 2ª coluna posiciona o caret lá
  const target = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    for (let pi = 4; pi < e.model.paragraphs.length; pi++) for (const l of e.layoutCache[pi].lines) if (l.page === 0 && l.xTwips > 5000) return { pi, x: l.xTwips + 300, y: l.yTwips + l.heightTwips / 2, start: l.rich.start, end: l.rich.end };
    return null;
  });
  if (target) {
    const p = await ev('client', 0, target.x, target.y);
    await page.mouse.click(p.x, p.y);
    s = await S();
    check('clique na 2ª coluna leva o caret à linha clicada', s.sel.para === target.pi && s.sel.offset >= target.start && s.sel.offset <= target.end, { sel: s.sel, target });
    const before = await ev('text', target.pi);
    await page.keyboard.type('ZQ');
    const after = await ev('text', target.pi);
    check('digitar na 2ª coluna insere e redesenha', after.length === before.length + 2 && (await ev('caretVsGlyphs', target.pi)).bad.length === 0, { len: [before.length, after.length] });
    await page.keyboard.press('Control+z');
  }
  // ↓ no fim da 1ª coluna vai para o topo da 2ª (ordem do texto)
  const lastCol1 = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    let best = null;
    for (let pi = 4; pi < e.model.paragraphs.length; pi++) for (const l of e.layoutCache[pi].lines) if (l.page === 0 && l.xTwips < 5000 && (!best || l.yTwips > best.y)) best = { pi, o: l.rich.start, y: l.yTwips };
    return best;
  });
  if (lastCol1) {
    await at(lastCol1.pi, lastCol1.o);
    await page.keyboard.press('ArrowDown');
    const c = await ev('caret');
    check('↓ na última linha da 1ª coluna vai para a 2ª', c && c.x > 5000 * (96 / 1440) * 0.5, c);
  }
  // Ctrl+Shift+Enter: quebra de coluna (divide o parágrafo; a quebra abre o seguinte)
  await at(6, 15);
  const p0 = (await S()).paras;
  await page.keyboard.press('Control+Shift+Enter');
  s = await S();
  const cbText = await ev('text', 7);
  check('Ctrl+Shift+Enter insere a quebra de coluna como o Word', s.paras === p0 + 1 && cbText.startsWith('\u000B') && s.sel.para === 7 && s.sel.offset === 1, { paras: [p0, s.paras], sel: s.sel, head: cbText.slice(0, 3) });
  // Ctrl+Enter: quebra de página num parágrafo próprio (Word, oráculo pb-*)
  {
    await at(9, 12);
    const before = await ev('text', 9);
    const p1 = (await S()).paras;
    await page.keyboard.press('Control+Enter');
    const r = await page.evaluate(() => {
      const e = document.querySelector('universal-write');
      const t = (i) => e.model.paragraphs[i].runs.map((x) => x.text).join('');
      return { a: t(9), b: t(10), c: t(11), sel: e.selection.focus, paras: e.model.paragraphs.length, page: e.lineOf(e.selection.focus)?.page, pageOfA: e.layoutCache[9].lines.at(-1)?.page, props: e.model.paragraphs[10].props };
    });
    check('Ctrl+Enter: quebra de página num parágrafo próprio entre as metades', r.paras === p1 + 2 && r.a === before.slice(0, 12) && r.b === '\f' && r.c === before.slice(12) && r.sel.para === 11 && r.sel.offset === 0 && !Object.keys(r.props).length, r);
    check('o texto depois da quebra de página vai para a página seguinte', r.page === r.pageOfA + 1, { page: r.page, pageOfA: r.pageOfA });
    await page.keyboard.press('Control+z');
    check('desfazer a quebra de página num passo', (await S()).paras === p1 && (await ev('text', 9)) === before);
    // com o controle de alterações ligado, a quebra entra como inserção (marca e run)
    const tr = await page.evaluate(() => {
      const e = document.querySelector('universal-write');
      e.toggleTrackChanges(true);
      e.selection = { anchor: { para: 9, offset: 12 }, focus: { para: 9, offset: 12 } };
      e.insertPageBreak();
      const ps = e.model.paragraphs;
      const r = { firstMark: !!ps[9].props.markIns, pbMark: !!ps[10].props.markIns, pbRun: !!ps[10].runs[0]?.props.ins };
      e.undo();
      e.toggleTrackChanges(false);
      return r;
    });
    check('quebra de página com o controle ligado: marcas e run como inserção', tr.firstMark && tr.pbMark && tr.pbRun, tr);
  }
  // Backspace logo depois da quebra de seção não a apaga (apaga o caractere antes dela)
  const t3 = await ev('text', 3);
  await at(4, 0);
  await page.keyboard.press('Backspace');
  s = await S();
  check('Backspace depois da quebra de seção mantém a quebra (Word)', s.secs.length === 2 && (await ev('text', 3)) === t3.slice(0, -1) && s.sel.para === 3, { secs: s.secs, sel: s.sel });
  // Delete antes da marca apaga a quebra: fica a seção de depois
  await at(3, (await ev('text', 3)).length);
  await page.keyboard.press('Delete');
  s = await S();
  check('Delete na marca da quebra funde as seções', s.secs.length === 1 && s.secs[0][2] === 2, s.secs);
  // desfazer tudo volta a uma seção sem colunas
  for (let k = 0; k < 6; k++) await page.keyboard.press('Control+z');
  s = await S();
  check('desfazer volta ao documento de uma seção', s.secs.length === 1 && s.secs[0][2] === 1 && s.paras === 14, s);
  for (let k = 0; k < 2; k++) await page.keyboard.press('Control+y');
  s = await S();
  check('refazer: quebra e colunas de volta', s.secs.length === 2 && s.secs[1][2] === 2, s.secs);
  // marcas de formatação (quebras desenhadas) e o .docx salvo
  await call('toggleMarks');
  await sleep(30);
  const saved = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const b = e.saveDocx();
    return { len: b.length, n: b[0] };
  });
  await call('toggleMarks');
  check('salva o .docx com seções', saved.len > 1000, saved);
  // por seção: orientação só na seção do cursor (girando as margens)
  await at(10, 0);
  await call('setPageSetup', { orientation: 'landscape' });
  const geo = await page.evaluate(() => document.querySelector('universal-write').sectionStarts.map((x) => [x.section.sectPr.pageWidthTwips > x.section.sectPr.pageHeightTwips, x.section.sectPr.marginTopTwips]));
  check('Orientação vale só para a seção do cursor e gira as margens', geo.length === 2 && !geo[0][0] && geo[1][0] && geo[1][1] === 1701, geo);
  const pages = (await st()).pages;
  check('contínua para outra orientação começa página nova (Word)', pages >= 2, pages);
}

// ───────────── notas de rodapé e de fim (documento sintético) ─────────────
if (want('notes')) {
  await ev('synthetic', 6, 40);
  const N = () => page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const refs = e.eng.lines.filter((l) => /^(fn|en)\d+/.test(l.line.ref)).map((l) => l.line.ref);
    return { note: e.editingNote(), sel: e.selection.focus, fn: e.noteCount('footnote'), en: e.noteCount('endnote'), refs, body: e.bodyModel().paragraphs.map((p) => p.runs.map((r) => r.text).join('')) };
  });
  const at = (para, offset = 0) => page.evaluate(({ para, offset }) => { document.querySelector('universal-write').selection = { anchor: { para, offset }, focus: { para, offset } }; }, { para, offset });
  // clique para o foco ir ao documento; o cursor fica depois de 'lorem ipsu'
  let p0 = await ev('clientAt', 0, 11);
  await page.mouse.click(p0.x, p0.y);
  await at(0, 11);
  await page.keyboard.press('Control+Alt+f');
  await page.keyboard.type('Primeira nota');
  let s = await N();
  check('Ctrl+Alt+F insere a nota e o cursor vai para o texto dela', s.note?.kind === 'footnote' && s.fn === 1 && s.refs.some((r) => /^fn1\//.test(r)) && s.sel.offset === 15, s);
  let cg = await ev('caretVsGlyphs');
  check('cursor = glifos na área de notas', cg.bad.length === 0 && cg.checked >= 10, cg);
  // a marca da nota e o espaço vêm antes do texto (como o Word grava)
  const txt = await ev('text', 0);
  check('nota nova: marca + espaço + texto', txt === '￼ Primeira nota', txt);
  // a contagem de palavras da barra de status, na nota, é a do texto do documento
  const wc = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const body = e.bodyModel().paragraphs.map((p) => p.runs.filter((r) => !r.noteRef).map((r) => r.text).join('')).join(' ');
    return { stats: e.stats().words, body: (body.match(/\S+/g) ?? []).length };
  });
  check('na nota, a contagem de palavras é a do documento', wc.stats === wc.body, wc);
  // clique no corpo sai da nota; clique na nota volta
  let p = await ev('clientOfRef', /^b2$/);
  await page.mouse.click(p.x, p.y);
  s = await N();
  check('clique no corpo sai da nota', !s.note && s.sel.para === 2, s.sel);
  p = await ev('clientOfRef', /^fn1\//);
  await page.mouse.click(p.x, p.y);
  s = await N();
  check('clique na área de notas entra na nota', s.note?.id === 1, s.note);
  // desfazer único (corpo + nota): no corpo, Ctrl+Z desfaz a digitação da nota
  p = await ev('clientOfRef', /^b2$/);
  await page.mouse.click(p.x, p.y);
  // (cada tecla é um passo de desfazer)
  for (let k = 0; k < 'Primeira nota'.length; k++) await page.keyboard.press('Control+z');
  s = await N();
  check('desfazer no corpo volta à nota e desfaz o texto dela', s.note?.id === 1 && (await ev('text', 0)) === '￼ ', { note: s.note, t: await ev('text', 0) });
  await page.keyboard.press('Control+z');
  s = await N();
  check('desfazer de novo tira a nota (cursor no corpo)', !s.note && s.fn === 0 && s.sel.para === 0 && s.sel.offset === 11, s);
  for (let k = 0; k <= 'Primeira nota'.length; k++) await page.keyboard.press('Control+y');
  s = await N();
  check('refazer devolve a nota com o texto', s.fn === 1 && s.note?.id === 1 && (await ev('text', 0)) === '￼ Primeira nota', s);
  // Esc volta à referência (cursor depois dela)
  await page.keyboard.press('Escape');
  s = await N();
  check('Esc na nota volta para depois da referência', !s.note && s.sel.para === 0 && s.sel.offset === 12, s.sel);
  // digitar logo depois da referência não leva o estilo de referência
  await page.keyboard.type('Z');
  const runs = (await ev('paras'))[0].runs;
  const z = runs.find((r) => r.text.includes('Z'));
  check('texto digitado depois da referência sem o estilo dela', z && !z.charStyle, runs.slice(0, 4));
  await page.keyboard.press('Control+z');
  // Backspace logo depois da referência: o 1º seleciona, o 2º apaga a nota
  await at(0, 12);
  await page.keyboard.press('Backspace');
  s = await N();
  const selA = await page.evaluate(() => document.querySelector('universal-write').selection.anchor);
  check('1º Backspace depois da referência só a seleciona', s.fn === 1 && selA.offset === 11 && s.sel.offset === 12, { selA, sel: s.sel });
  await page.keyboard.press('Backspace');
  s = await N();
  check('2º Backspace apaga a referência e a nota', s.fn === 0 && !s.refs.length, s);
  await page.keyboard.press('Control+z');
  s = await N();
  check('desfazer traz a nota de volta', s.fn === 1, s);
  // nota de fim: no fim do documento, numeração i, ii
  await at(3, 6);
  await page.keyboard.press('Control+Alt+d');
  await page.keyboard.type('Nota de fim');
  s = await N();
  check('Ctrl+Alt+D insere nota de fim (fim do documento)', s.note?.kind === 'endnote' && s.en === 1 && s.refs.some((r) => /^en1\//.test(r)), s);
  const enMark = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    const pg = e.eng.result.pages[e.eng.result.pages.length - 1];
    return pg.items.filter((i) => i.t === 'glyphs').map((i) => i.glyphs.map((g) => String.fromCodePoint(g.cp)).join('')).join('|');
  });
  check('nota de fim numerada i (romanos minúsculos por padrão)', /\|i\|/.test(`|${enMark}|`), enMark.slice(-80));
  // Próxima / Anterior e Mostrar Notas
  await page.keyboard.press('Escape');
  await at(0, 0);
  await call('nextNote', 'footnote', 1);
  s = await N();
  check('Próxima nota de rodapé: cursor antes da referência', !s.note && s.sel.para === 0 && s.sel.offset === 11, s.sel);
  await call('nextNote', 'endnote', 1);
  s = await N();
  check('Próxima nota de fim', s.sel.para === 3 && s.sel.offset === 6, s.sel);
  await at(0, 12);
  await call('showNotes', 'footnote');
  s = await N();
  check('Mostrar Notas vai da referência à nota', s.note?.kind === 'footnote' && s.note.id === 1, s.note);
  await call('showNotes');
  s = await N();
  check('Mostrar Notas na nota volta à referência', !s.note && s.sel.offset === 12, s.sel);
  // duplo clique na referência abre a nota
  p = await ev('clientAt', 0, 11);
  await page.mouse.dblclick(p.x + 2, p.y);
  s = await N();
  check('duplo clique na referência abre a nota', s.note?.kind === 'footnote', s.note);
  await page.keyboard.press('Escape');
  // opções: romanos no rodapé, documento inteiro
  await call('setNoteOptions', 'footnote', { numberFormat: 'upperRoman', startAt: 3 });
  const fnMark = await page.evaluate(() => {
    const e = document.querySelector('universal-write');
    return e.eng.result.pages[0].items.filter((i) => i.t === 'glyphs').map((i) => i.glyphs.map((g) => String.fromCodePoint(g.cp)).join('')).join('|');
  });
  check('Formato I, II e início 3 na nota de rodapé', /\|III\|/.test(`|${fnMark}|`), fnMark.slice(0, 120));
  // converter: a nota de rodapé vira de fim
  const n = await call('convertNotes', 'toEndnotes');
  s = await N();
  check('Converter rodapé → fim', n === 1 && s.fn === 0 && s.en === 2, s);
  await page.keyboard.press('Control+z');
  s = await N();
  check('desfazer a conversão', s.fn === 1 && s.en === 1, s);
  // copiar/colar a referência cria uma nota nova com o mesmo texto
  await page.evaluate(() => { const e = document.querySelector('universal-write'); e.selection = { anchor: { para: 0, offset: 11 }, focus: { para: 0, offset: 12 } }; });
  await call('copy');
  await at(4, 3);
  await page.evaluate(() => { const e = document.querySelector('universal-write'); e.insertRich(e.richClip); });
  s = await N();
  const texts = await page.evaluate(() => [...document.querySelector('universal-write').fullDoc.footnotes.entries()].map(([k, ps]) => [k, ps.map((pp) => pp.runs.map((r) => r.text).join('')).join('')]));
  check('colar a referência cria nota nova com cópia do texto', s.fn === 2 && texts.filter(([, t]) => t.includes('Primeira nota')).length === 2, texts);
  // salvar e reabrir: notas, estilos e opções voltam
  const b64 = await ev('saveBase64');
  await ev('openBase64', b64);
  s = await N();
  const opts = await call('getNoteOptions', 'footnote');
  check('salvar e reabrir mantém as notas e as opções', s.fn === 2 && s.en === 1 && opts.numberFormat === 'upperRoman' && opts.startAt === 3, { s, opts });
  // controle de alterações: a referência e a marca + texto da nota entram em w:ins;
  // apagar a referência controlada a deixa em w:del e a nota fica (oráculo notes-lab, trk-*)
  await call('toggleTrackChanges', true);
  // (o documento foi reaberto: clique para o foco voltar a ele)
  p = await ev('clientOfRef', /^b2$/);
  await page.mouse.click(p.x, p.y);
  await at(2, 5);
  await call('insertFootnote');
  await page.keyboard.type('Rev');
  await page.keyboard.press('Escape');
  let xml = await ev('savedParts', ['word/document.xml', 'word/footnotes.xml']);
  const lastFn = (xml['word/footnotes.xml'] ?? '').split('<w:footnote ').pop();
  check('controle ligado: referência e nota inseridas como w:ins',
    /<w:ins [^>]*w16du:dateUtc[^>]*><w:r><w:rPr><w:rStyle [^>]*\/><\/w:rPr><w:footnoteReference w:id="\d+"\/><\/w:r><\/w:ins>/.test(xml['word/document.xml'] ?? '') &&
    /<w:ins [^>]*><w:r><w:rPr><w:rStyle [^>]*\/><\/w:rPr><w:footnoteRef\/><\/w:r><w:r><w:t xml:space="preserve"> Rev<\/w:t><\/w:r><\/w:ins><\/w:p>/.test(lastFn) &&
    /<w:footnotes [^>]*xmlns:w16du=/.test(xml['word/footnotes.xml'] ?? ''), { lastFn, doc: (xml['word/document.xml'] ?? '').match(/.{300}<w:footnoteReference w:id="3"\/>.{100}/)?.[0] });
  await call('toggleTrackChanges', false);
  await call('acceptAllChanges');
  await call('toggleTrackChanges', true);
  await at(2, 6);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  s = await N();
  xml = await ev('savedParts', ['word/document.xml', 'word/footnotes.xml']);
  check('controle ligado: apagar a referência a deixa em w:del e a nota fica',
    s.fn === 3 && /<w:del [^>]*><w:r><w:rPr><w:rStyle [^>]*\/><\/w:rPr><w:footnoteReference w:id="\d+"\/><\/w:r><\/w:del>/.test(xml['word/document.xml'] ?? '') && (xml['word/footnotes.xml'] ?? '').includes('> Rev<'), s);
  await call('toggleTrackChanges', false);
  // controle de conteúdo de texto sem formatação (ou data, caixa de combinação, lista
  // suspensa): o Word recusa a nota ali (oráculo notes-lab, cc-*); rich text aceita
  const ccSdt = (pr, content) => `<w:sdt><w:sdtPr><w:id w:val="7"/>${pr}</w:sdtPr><w:sdtContent>${content}</w:sdtContent></w:sdt>`;
  const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
  const ccPkg = core.blankDocxPackage();
  ccPkg.setPartText('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    ccSdt('<w:text/>', '<w:p><w:r><w:t>Titulo da capa</w:t></w:r></w:p>') +
    `<w:p><w:r><w:t xml:space="preserve">Antes </w:t></w:r>${ccSdt('<w:date/>', '<w:r><w:t>21/10/2026</w:t></w:r>')}${ccSdt('', '<w:r><w:t>rico</w:t></w:r>')}<w:r><w:t xml:space="preserve"> depois</w:t></w:r></w:p>` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  await ev('openBase64', Buffer.from(ccPkg.save()).toString('base64'));
  const canAt = async (para, offset) => { await at(para, offset); return call('canInsertNote'); };
  const cc = { bloco: await canAt(0, 4), data: await canAt(1, 9), rico: await canAt(1, 18), fora: await canAt(1, 3) };
  check('nota recusada em controle de texto sem formatação/data; aceita em rich text e fora', !cc.bloco && !cc.data && cc.rico && cc.fora, cc);
  await at(0, 4);
  const none = await call('insertFootnote');
  check('insertFootnote no controle de texto sem formatação não faz nada', none === null && (await N()).fn === 0, none);
}

// ───────────── navegação: títulos, régua (recuos/tabulações), busca, miniaturas ─────────────
if (want('nav')) {
  await ev('open', '/write/samples/Catalogo-Recursos-Word.docx');
  const E = (fn) => page.evaluate(fn);
  const heads = await call('getHeadings');
  check('Títulos: os do catálogo (Título 1/2 sem w:outlineLvl valem pelo nome, como no Word)', heads.length === 24 && heads[3].level === 2 && heads[3].text === '2.1 Alinhamento' && heads.every((h) => h.page >= 0), heads.slice(0, 4));
  // régua no parágrafo de recuo deslocado
  const pd = await E(() => { const e = document.querySelector('universal-write'); return e.model.paragraphs.findIndex((p) => p.runs.map((r) => r.text).join('').startsWith('Recuo deslocado')); });
  await ev('select', pd, 3);
  let ri = await call('getRulerInfo');
  check('régua: margens, quadro e recuo deslocado do parágrafo', ri && ri.margins.left === 1440 && ri.frame.x0 === 1440 && ri.indents.left === 720 && ri.indents.firstLine === -360 && ri.where === 'body', ri && { m: ri.margins, f: ri.frame, i: ri.indents });
  // arrastar o recuo esquerdo (o deslocado acompanha) → só o atributo mudado vai para o w:ind
  await call('setParagraphIndents', { left: 1134 });
  const pXml = async () => {
    const d = await ev('savedPart', 'word/document.xml');
    const i = d.indexOf('Recuo deslocado');
    const ps = Math.max(d.lastIndexOf('<w:p ', i), d.lastIndexOf('<w:p>', i));
    return d.slice(ps, i).match(/<w:ind [^>]*\/>/)?.[0] ?? null;
  };
  let ind = await pXml();
  check('recuo esquerdo: w:left novo, deslocamento mantido', /w:left="1134"/.test(ind ?? '') && /w:hanging="360"/.test(ind ?? ''), ind);
  await call('setParagraphIndents', { left: 0, firstLine: 0 });
  ind = await pXml();
  check('recuo igual ao herdado sai do XML (o Word tira o w:ind)', ind === null, ind);
  await call('undo'); await call('undo');
  ri = await call('getRulerInfo');
  check('desfazer volta os recuos (um passo por arrasto)', ri.indents.left === 720 && ri.indents.firstLine === -360, ri.indents);
  // tabulações: marcar centralizada e decimal com preenchimento, mover e remover
  await call('setTabStops', [], { add: [{ pos: 2835, align: 'center' }, { pos: 5669, align: 'decimal', leader: 'dot' }] });
  let tabs = (await call('getTabStops')).tabs;
  const tabsXml = async () => { const d = await ev('savedPart', 'word/document.xml'); const i = d.indexOf('Recuo deslocado'); const ps = Math.max(d.lastIndexOf('<w:p ', i), d.lastIndexOf('<w:p>', i)); return d.slice(ps, i).match(/<w:tabs>.*?<\/w:tabs>/)?.[0] ?? null; };
  let tx = await tabsXml();
  check('tabulações centralizada e decimal pontilhada no w:tabs (ordem de posição)', tabs.length === 2 && tx === '<w:tabs><w:tab w:val="center" w:pos="2835"/><w:tab w:val="decimal" w:leader="dot" w:pos="5669"/></w:tabs>', { tabs, tx });
  await call('setTabStops', [], { remove: [2835], add: [{ pos: 3402, align: 'center' }] });
  await call('setTabStops', [], { remove: [5669] });
  tx = await tabsXml();
  check('mover e remover tabulação', tx === '<w:tabs><w:tab w:val="center" w:pos="3402"/></w:tabs>', tx);
  await call('setDefaultTabStop', 567);
  const st1 = await ev('savedPart', 'word/settings.xml');
  check('tabulação padrão → w:defaultTabStop no settings', /<w:defaultTabStop w:val="567"\/>/.test(st1), st1.match(/<w:defaultTabStop[^>]*>/)?.[0]);
  await call('undo');
  check('desfazer a tabulação padrão', (await call('getDefaultTabStop')) !== 567);
  for (let k = 0; k < 3; k++) await call('undo');
  check('desfazer as tabulações', (await call('getTabStops')).tabs.length === 0);
  // mover a seção "3. Listas" para antes de "2. Formatacao de Paragrafo"
  const n0 = (await st()).paras;
  const i3 = heads.findIndex((h) => h.text.startsWith('3. Listas'));
  const i2 = heads.findIndex((h) => h.text.startsWith('2. Formatacao'));
  const moved = await call('moveHeading', i3, i2);
  let h2 = await call('getHeadings');
  check('arrastar título move a seção inteira (com os subtítulos)', moved && h2[i2].text.startsWith('3. Listas') && h2[i2 + 1].text.startsWith('3.1') && h2[i2 + 3].text.startsWith('2. Formatacao') && (await st()).paras === n0, h2.slice(i2, i2 + 4).map((h) => h.text));
  const tablesKept = await E(() => document.querySelector('universal-write').tableAnchors.length);
  await call('undo');
  h2 = await call('getHeadings');
  check('desfazer o arrasto num passo', h2[i2].text.startsWith('2. Formatacao') && h2.length === heads.length, h2.slice(i2, i2 + 2).map((h) => h.text));
  // mover "4. Tabelas" (com a tabela) para o fim: a tabela vai junto
  const i4 = heads.findIndex((h) => h.text.startsWith('4. Tabelas'));
  await call('moveHeading', i4, heads.length);
  const tAfter = await E(() => { const e = document.querySelector('universal-write'); const hs = e.getHeadings(); const last = hs[hs.length - 1]; return { last: last.text, anchors: e.tableAnchors.map((a) => a.beforePara), lastPara: last.para, n: e.model.paragraphs.length }; });
  check('seção com tabela vai para o fim com a tabela', tAfter.last.startsWith('4. Tabelas') && tAfter.anchors.some((b) => b > tAfter.lastPara), tAfter);
  await call('undo');
  // rebaixar/promover, novo título e excluir
  await call('demoteHeading', 3);
  check('Rebaixar: Título 2 → Título 3', (await call('getHeadings'))[3].level === 3);
  await call('undo');
  await call('insertHeading', 3, 'after');
  h2 = await call('getHeadings');
  const sel = (await st()).sel.focus;
  check('Novo Título Depois: parágrafo de título vazio (não aparece até ter texto) e o cursor nele', (await st()).paras === n0 + 1 && h2.length === heads.length && sel.offset === 0, { sel, n: (await st()).paras });
  await E(() => document.querySelector('universal-write').type('Novo'));
  h2 = await call('getHeadings');
  check('o título novo entra na árvore depois da seção', h2.length === heads.length + 1 && h2[4].text === 'Novo' && h2[4].level === 2, h2.slice(3, 6).map((h) => h.text));
  for (let k = 0; k < 8 && (await st()).paras !== n0; k++) await call('undo');
  await call('deleteHeading', i3);
  h2 = await call('getHeadings');
  check('Excluir apaga o título e o conteúdo', !h2.some((h) => h.text.startsWith('3.1')) && h2.length === heads.length - 3, h2.length);
  await call('undo');
  check('desfazer a exclusão', (await call('getHeadings')).length === heads.length && tablesKept > 0);
  // busca: corpo e tabela, realce, ir até o resultado (célula)
  const res = await call('search', 'recuo');
  check('busca: ocorrências do corpo com trecho e título', res.length === 7 && res[0].match.toLowerCase() === 'recuo' && res.every((r) => r.page >= 0), res.length);
  const rt = await call('search', 'Cabecalho', { matchCase: true });
  const kt = rt.findIndex((r) => r.inTable);
  const went = kt >= 0 && (await call('goToSearchResult', kt));
  const s2 = await E(() => { const e = document.querySelector('universal-write'); return { cell: !!e.cellEdit, sel: e.selection, text: e.selectedText() }; });
  check('ir até o resultado na tabela entra na célula e seleciona', went && s2.cell && s2.text === 'Cabecalho', s2);
  check('palavra inteira e maiúsculas', (await call('search', 'recu', { wholeWord: true })).length === 0 && (await call('search', 'RECUO', { matchCase: true })).length === 0);
  await call('clearSearch');
  // miniatura e ir para a página
  const thumb = await E(() => { const e = document.querySelector('universal-write'); const c = document.createElement('canvas'); const ok = e.paintPageThumbnail(1, c, 120); return { ok, w: c.width, h: c.height }; });
  check('miniatura da página (Páginas)', thumb.ok && thumb.w >= 120 && thumb.h > thumb.w, thumb);
  // régua numa célula: divisas da tabela e redimensionar pela régua
  ri = await call('getRulerInfo');
  check('régua na célula: divisas e linhas da tabela', ri.where === 'cell' && ri.table && ri.table.cols.length >= 2 && ri.table.rows.length >= 1, ri.table);
  const g0 = await E(() => { const e = document.querySelector('universal-write'); return e.tableAnchors[e.cellEdit.anchor].table.gridColsTwips.slice(); });
  await call('resizeTableColumn', 1, 300);
  const g1 = await E(() => { const e = document.querySelector('universal-write'); return e.tableAnchors[e.cellEdit.anchor].table.gridColsTwips.slice(); });
  check('divisa da tabela pela régua: as colunas vizinhas trocam largura', g1[0] === g0[0] + 300 && g1[1] === g0[1] - 300, { g0, g1 });
  await call('undo');
  // visões e grade
  await call('showGridlines', true);
  check('Linhas de Grade liga/desliga', (await call('gridlinesShown')) === true);
  await call('showGridlines', false);
  await call('setView', 'outline');
  check('Estrutura de Tópicos sem régua (como o Word)', (await call('getRulerInfo')) === null);
  await call('setView', 'draft');
  ri = await call('getRulerInfo');
  check('Rascunho: régua horizontal com o quadro do texto', ri && ri.frame.x1 > ri.frame.x0, ri && ri.frame);
  await call('setView', 'print');
}

// ───────────── links e referências (frente Links e referências) ─────────────
if (want('refs')) {
  await ev('blank');
  const W = (fn, ...a) => page.evaluate(({ fn, a }) => { const e = document.querySelector('universal-write'); return e[fn](...a); }, { fn, a });
  const docXml = () => ev('savedPart', 'word/document.xml');
  await W('type', 'Introdução'); await W('applyStyle', 'Ttulo1'); await W('pressEnter');
  await W('type', 'Alfa beta gama.'); await W('pressEnter');
  await W('type', 'Fim.');
  // ── indicador
  await ev('select', 1, 5, 1, 9);
  check('nome inválido recusado (começa com dígito / tem hífen)', !(await call('insertBookmark', '1abc')) && !(await call('insertBookmark', 'a-b')));
  check('Adicionar indicador na seleção', await call('insertBookmark', 'marca'));
  let bms = await call('getBookmarks');
  check('lista: nome e trecho', bms.length === 1 && bms[0].name === 'marca' && bms[0].text === 'beta', bms);
  let xml = await docXml();
  check('XML: bookmarkStart/End em volta do trecho, como o Word', /<w:bookmarkStart w:id="\d+" w:name="marca"\/><w:r><w:t>beta<\/w:t><\/w:r><w:bookmarkEnd w:id="\d+"\/>/.test(xml), xml.match(/<w:p>.{0,40}Alfa.{0,200}/)?.[0]);
  await ev('select', 1, 5); await W('type', 'XY');
  check('digitar no começo do indicador entra nele (oráculo bm-type-start)', (await call('getBookmarks'))[0].text === 'XYbeta');
  await ev('select', 1, 11); await W('type', 'Z');
  check('digitar no fim fica fora (bm-type-end)', (await call('getBookmarks'))[0].text === 'XYbeta');
  await call('undo'); await call('undo');
  await ev('select', 1, 5, 1, 9); await W('pressBackspace');
  check('apagar exatamente o trecho apaga o indicador (bm-del-exact)', (await call('getBookmarks')).length === 0);
  await call('undo');
  check('desfazer devolve o indicador', (await call('getBookmarks'))[0]?.text === 'beta');
  await ev('select', 2, 0);
  await call('goToBookmark', 'MARCA');
  let s = await st();
  check('Ir para (nome sem caixa) seleciona o trecho', s.sel.anchor.para === 1 && s.sel.anchor.offset === 5 && s.sel.focus.offset === 9, s.sel);
  await ev('select', 2, 0);
  await call('insertBookmark', 'Marca');
  bms = await call('getBookmarks', { sort: 'location' });
  check('nome repetido (outra caixa) move o indicador; ponto', bms.length === 1 && bms[0].name === 'Marca' && bms[0].text === '', bms);
  check('Mostrar indicadores alterna', (await call('showBookmarks', true)) === true && (await call('bookmarksShown')) === true);
  await call('showBookmarks', false);
  // ── referência cruzada ao título
  await ev('select', 2, 4);
  const items = await call('getCrossReferenceItems', 'heading');
  check('itens: títulos', items.length === 1 && items[0].text === 'Introdução', items);
  check('inserir referência (texto do título)', await call('insertCrossReference', { type: 'heading', item: items[0].id, kind: 'text' }));
  check('o resultado no texto', (await ev('text', 2)) === 'Fim.Introdução', await ev('text', 2));
  check('o motor desenha o resultado', (await ev('drawnText', 2, 0)).includes('Fim.Introdução'), await ev('drawnText', 2, 0));
  xml = await docXml();
  const ref = xml.match(/_Ref\d{9}/)?.[0];
  check('_Ref oculto em volta do texto do título', !!ref && new RegExp(`<w:bookmarkStart w:id="\\d+" w:name="${ref}"/><w:r><w:t>Introdução</w:t></w:r><w:bookmarkEnd`).test(xml), xml.slice(xml.indexOf('<w:body>'), xml.indexOf('<w:body>') + 400));
  check('REF \\h complexo (begin/instr/separate/resultado/end)', new RegExp(`<w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> REF ${ref} \\\\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Introdução</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/>`).test(xml), xml.match(/.{0,200}REF _Ref.{0,300}/)?.[0]);
  await W('type', ' p. ');
  await call('insertCrossReference', { type: 'heading', item: items[0].id, kind: 'page' });
  xml = await docXml();
  check('2ª referência reaproveita o _Ref; PAGEREF com noProof', (xml.match(/_Ref\d{9}" ?\/>/g) ?? []).length <= 1 && new RegExp(`PAGEREF ${ref} \\\\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:noProof/></w:rPr><w:t>1</w:t>`).test(xml), (xml.match(/_Ref\d{9}/g) ?? []).length);
  await call('insertCrossReference', { type: 'heading', item: items[0].id, kind: 'position', hyperlink: false });
  check('acima/abaixo sem hiperlink → REF \\p em w:fldSimple', /<w:fldSimple w:instr=" REF _Ref\d{9} \\p "><w:r><w:t>acima<\/w:t>/.test(await docXml()));
  // mudar o título e atualizar com F9 na referência
  await ev('select', 0, 0); await W('type', 'Nova ');
  await ev('select', 2, 6);
  const n = await call('updateFields', 'selection');
  check('F9 na referência: o resultado acompanha o título', n >= 1 && (await ev('text', 2)).startsWith('Fim.Nova Introdução'), await ev('text', 2));
  // ── legenda sem objeto (no cursor; o parágrafo vira Legenda) e numeração
  const endOf = async () => { const l = (await st()).paras - 1; await ev('select', l, (await ev('text', l)).length); return l; };
  await endOf(); await W('pressEnter');
  check('Inserir Legenda no cursor', await call('insertCaption', { label: 'Figura', title: ': Primeira' }));
  let ps = await ev('paras');
  let cap = ps.length - 1;
  check('legenda: "Figura 1: Primeira" no parágrafo, estilo Legenda', ps[cap].text === 'Figura 1: Primeira' && ps[cap].style === 'Legenda', ps[cap]);
  await ev('select', 1, 0); await W('pressEnter'); await ev('select', 1, 0);
  await call('insertCaption', { label: 'Figura' });
  ps = await ev('paras');
  check('legenda antes renumera as seguintes (cap-renum)', ps[1].text === 'Figura 1' && ps[cap + 1].text === 'Figura 2: Primeira', [ps[1].text, ps[cap + 1]?.text]);
  xml = await docXml();
  check('SEQ como o Word: fldSimple com noProof', /<w:fldSimple w:instr=" SEQ Figura \\\* ARABIC "><w:r><w:rPr><w:noProof\/><\/w:rPr><w:t>2<\/w:t>/.test(xml));
  // ── índice de ilustrações no fim
  await endOf(); await W('pressEnter');
  check('Inserir Índice de Ilustrações', await call('insertTableOfFigures', { label: 'Figura' }));
  xml = await docXml();
  check('campo TOC \\h \\z \\c "Figura" com 2 entradas e _Toc nas legendas', /<w:instrText xml:space="preserve"> TOC \\h \\z \\c "Figura" <\/w:instrText>/.test(xml) && (xml.match(/<w:hyperlink w:anchor="_Toc\d{9}" w:history="1">/g) ?? []).length === 2 && (xml.match(/w:name="_Toc\d{9}"/g) ?? []).length === 2, (xml.match(/_Toc\d{9}/g) ?? []).length);
  check('entradas no estilo Índice de ilustrações com tabulação direita pontilhada', /<w:pStyle w:val="ndicedeilustraes"\/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="\d+"\/><\/w:tabs>/.test(xml));
  check('fim do campo no parágrafo seguinte às entradas', /<w:p><w:r><w:fldChar w:fldCharType="end"\/><\/w:r><\/w:p>/.test(xml));
  await ev('select', 1, 0); await W('pressEnter'); await ev('select', 1, 0);
  await call('insertCaption', { label: 'Figura', title: ' nova' });
  check('Atualizar Tabela refaz as entradas', await call('updateTableOfFigures'));
  xml = await docXml();
  check('3 entradas, _Toc recriados (os velhos somem)', (xml.match(/<w:hyperlink w:anchor="_Toc/g) ?? []).length === 3 && (xml.match(/w:name="_Toc/g) ?? []).length === 3);
  // ── hiperlink
  const p2 = (await ev('paras')).findIndex((p) => p.text.startsWith('Alfa'));
  await ev('select', p2, 0, p2, 4);
  check('Inserir hiperlink com Dica de Tela', await call('insertHyperlink', { address: 'https://exemplo.com/a', tip: 'Dica' }));
  xml = await docXml();
  check('w:hyperlink r:id + w:tooltip, runs com o estilo Hyperlink', /<w:hyperlink r:id="[^"]+" w:tooltip="Dica" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"\/><\/w:rPr><w:t>Alfa<\/w:t>/.test(xml), xml.match(/<w:hyperlink[^>]*>.{0,120}/)?.[0]);
  const li = await call('getLink');
  check('getLink: endereço, dica e texto', li?.address === 'https://exemplo.com/a' && li.tip === 'Dica' && li.text === 'Alfa', li);
  await ev('select', p2, 2);
  check('Remover hiperlink tira o link e o estilo', await call('removeLink'));
  xml = await docXml();
  check('sem w:hyperlink nem rStyle Hyperlink no parágrafo', !/w:tooltip="Dica"/.test(xml));
  await ev('select', p2, 0);
  await call('insertHyperlink', { anchor: 'p:0', text: 'Ver título' });
  xml = await docXml();
  check('link para título: _Toc oculto nele e w:anchor', /<w:hyperlink w:anchor="_Toc\d{9}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"\/><\/w:rPr><w:t>Ver título<\/w:t>/.test(xml));
  // ── controle de conteúdo de texto sem formatação (texto, data…): campo e hiperlink
  // ali deixam o arquivo "corrompido" no Word (corpus: lossless-check --refs ×
  // word-open-check -Refs) — o editor recusa, como a nota (canInsertNote)
  const ccSdt = (pr, content) => `<w:sdt><w:sdtPr><w:id w:val="7"/>${pr}</w:sdtPr><w:sdtContent>${content}</w:sdtContent></w:sdt>`;
  const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
  const ccPkg = core.blankDocxPackage();
  ccPkg.setPartText('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    ccSdt('<w:text/>', '<w:p><w:r><w:t>Titulo da capa</w:t></w:r></w:p>') +
    `<w:p><w:r><w:t xml:space="preserve">Antes </w:t></w:r>${ccSdt('<w:date/>', '<w:r><w:t>21/10/2026</w:t></w:r>')}${ccSdt('', '<w:r><w:t>rico</w:t></w:r>')}<w:r><w:t xml:space="preserve"> depois</w:t></w:r></w:p>` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  await ev('openBase64', Buffer.from(ccPkg.save()).toString('base64'));
  await call('enableEditing');
  const canAt = async (para, offset) => { await ev('select', para, offset); return call('canInsertField'); };
  const cf = { bloco: await canAt(0, 4), data: await canAt(1, 9), rico: await canAt(1, 18), fora: await canAt(1, 3) };
  check('campo/hiperlink recusados em controle de texto sem formatação/data; aceitos em rich text e fora', !cf.bloco && !cf.data && cf.rico && cf.fora, cf);
  await ev('select', 0, 4);
  const refused = [
    await call('insertCrossReference', { type: 'heading', item: 'p:1', kind: 'text' }),
    await call('insertHyperlink', { address: 'https://exemplo.com/cc' }),
    await call('insertCaption', { label: 'Figura' }),
    await call('insertTableOfFigures', { label: 'Figura' }),
  ];
  xml = await docXml();
  check('no controle de texto: referência, hiperlink, legenda e índice não fazem nada', refused.every((x) => x === false) && !/fldChar|fldSimple|w:hyperlink/.test(xml), refused);
}

if (want('textbox')) {
  // ───────────── caixa de texto: editar o texto no lugar (motor), vinculadas, desfazer ─────────────
  const LK = '/write/packages/docx-layout/test/oracle/txbxlink/lk-basic.docx';
  let r = await ev('open', LK);
  let objs = await ev('objects');
  const ia = objs.findIndex((o) => o.kind === 'textbox' && o.story !== undefined);
  const ib = objs.findIndex((o) => o.kind === 'textbox' && o.link !== undefined);
  check('caixas vinculadas: a 1ª e a seguinte com linhas de conteúdo', r.engine && ia >= 0 && ib >= 0 && objs[ia].lines > 0 && objs[ib].lines > 0, objs.map((o) => ({ k: o.kind, s: o.story, l: o.link, n: o.lines })));
  // clique no meio da 1ª caixa → edição do texto, caret no ponto
  let p = await ev('objectClient', ia, 0.5, 0.3);
  await page.mouse.click(p.x, p.y);
  let s = await st();
  check('clique na caixa entra na edição do texto', s.tb && s.paras >= 3, { tb: s.tb, paras: s.paras, sel: s.sel });
  let cg = await ev('caretVsGlyphs');
  check('caixa: cursor = x dos glifos (as duas caixas da cadeia)', cg.checked > 100 && cg.bad.length === 0, cg);
  let c = await ev('caret');
  check('caixa: caret sobre um glifo desenhado', c?.glyphAt, c);
  const t0 = await ev('text', s.sel.focus.para);
  const off = s.sel.focus.offset;
  await page.keyboard.type('XYZ');
  const t1 = await ev('text', s.sel.focus.para);
  check('caixa: digitar insere no texto da caixa', t1 === t0.slice(0, off) + 'XYZ' + t0.slice(off), t1.slice(Math.max(0, off - 5), off + 8));
  objs = await ev('objects');
  check('caixa: o texto digitado está no modelo da 1ª caixa', objs[ia].text.includes('XYZ'));
  cg = await ev('caretVsGlyphs');
  check('caixa: cursor = glifos depois da digitação', cg.bad.length === 0, cg);
  // clique na caixa seguinte: mesma história, cursor no texto que continua nela
  p = await ev('objectClient', ib, 0.5, 0.2);
  await page.mouse.click(p.x, p.y);
  s = await st();
  c = await ev('caret');
  const objsB = await ev('objects');
  check('clique na caixa vinculada: mesma história, caret na caixa seguinte', s.tb && c && c.y >= objsB[ib].y - 20 && c.y <= objsB[ib].y + objsB[ib].h, { tb: s.tb, c, box: objsB[ib] });
  // desfazer dentro da caixa volta o texto e fica nela
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  s = await st();
  check('Ctrl+Z na caixa desfaz a digitação e continua editando a caixa', s.tb && !(await ev('objects'))[ia].text.includes('X'), { tb: s.tb });
  await page.keyboard.press('Escape');
  s = await st();
  check('Esc sai da caixa', !s.tb, { tb: s.tb });
  await page.keyboard.press('Control+y');
  s = await st();
  check('Ctrl+Y fora da caixa refaz e volta a ela', s.tb && (await ev('objects'))[ia].text.includes('X'), { tb: s.tb });
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Escape');
  let xml = await ev('savedPart', 'word/document.xml');
  const txbx = xml.match(/<wps:txbx[\s\S]*?<\/wps:txbx>/g) ?? [];
  check('salvar: o texto editado vai no wps:txbx da 1ª caixa', txbx.length === 1 && txbx[0].includes('XYZ') && /<wps:txbx id="1">/.test(txbx[0]), txbx.map((x) => x.length));
  check('salvar: a seguinte continua vinculada (linkedTxbx sem conteúdo)', /<wps:linkedTxbx id="1" seq="1"\/>/.test(xml));

  // caixa com texto vertical: digitar entra no texto (o desenho é girado)
  r = await ev('open', '/write/packages/docx-layout/test/oracle/txbxvert/tv-vert.docx');
  objs = await ev('objects');
  const iv = objs.findIndex((o) => o.kind === 'textbox');
  p = await ev('objectClient', iv, 0.5, 0.5);
  await page.mouse.click(p.x, p.y);
  s = await st();
  await page.keyboard.type('Q');
  objs = await ev('objects');
  check('caixa vertical: clique entra e digitar vai para o texto', s.tb && objs[iv].text.includes('Q'), { tb: s.tb });
  await page.keyboard.press('Control+z');
  objs = await ev('objects');
  check('caixa vertical: desfazer', !objs[iv].text.includes('Q'));

  // ───────────── Inserir › Caixa de Texto, Formato da Forma, desenhar, vincular ─────────────
  r = await ev('blank');
  await page.keyboard.type('Primeiro paragrafo do documento.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Segundo paragrafo.');
  let ok = await call('insertTextbox', 'simple');
  s = await st();
  let sel = await call('selectedShape');
  check('inserir caixa (modelo simples): fica editando com o texto de exemplo selecionado', ok && s.tb && sel?.kind === 'textbox' && sel.editingText && s.sel.focus.offset > 20 && s.sel.anchor.offset === 0, { tb: s.tb, sel: s.sel });
  await page.keyboard.type('Ola caixa');
  objs = await ev('objects');
  const it = objs.findIndex((o) => o.kind === 'textbox');
  check('digitar troca o texto de exemplo', objs[it]?.text === 'Ola caixa', objs[it]?.text);
  await page.keyboard.press('Escape');
  s = await st();
  sel = await call('selectedShape');
  check('Esc no texto seleciona a forma (Formato da Forma)', !s.tb && sel?.kind === 'textbox' && !sel.editingText, { tb: s.tb, sel: sel && { kind: sel.kind, editing: sel.editingText } });
  await call('setShapeFill', { kind: 'schemeClr', val: 'accent2' });
  await call('setShapeOutline', { color: null });
  await call('setTextboxOptions', { anchor: 'ctr', marginsPt: { l: 10 } });
  await call('changeShape', 'roundRect');
  sel = await call('selectedShape');
  check('Formato da Forma: preenchimento, sem contorno, alinhamento, margem, forma', sel.format.fill?.color?.val === 'accent2' && sel.format.line?.fill === null && sel.text.anchor === 'ctr' && Math.abs(sel.text.marginsPt.l - 10) < 0.01 && sel.geometry === 'roundRect', { fill: sel.format.fill, line: sel.format.line, text: sel.text, g: sel.geometry });
  await call('setShapeStyle', 16);
  sel = await call('selectedShape');
  check('Estilos de Forma: o estilo 16 reconhecido', sel.styleIndex === 16, sel.styleIndex);
  await page.keyboard.press('Control+z');
  sel = await call('selectedShape');
  check('desfazer o estilo volta o preenchimento', sel?.styleIndex === 0 && sel.format.fill?.color?.val === 'accent2', sel && { st: sel.styleIndex, fill: sel.format.fill });
  // digitar com a forma selecionada entra no texto (no fim)
  await page.keyboard.type('!');
  objs = await ev('objects');
  s = await st();
  check('digitar com a caixa selecionada acrescenta no fim do texto', s.tb && objs[it].text === 'Ola caixa!', { tb: s.tb, t: objs[it].text });
  await page.keyboard.press('Escape');
  xml = await ev('savedPart', 'word/document.xml');
  check('salvar: caixa nova em mc:AlternateContent (wps + VML de reserva) com o texto', /<mc:Choice Requires="wps">[\s\S]*Ola caixa![\s\S]*<mc:Fallback>[\s\S]*<v:textbox[\s\S]*Ola caixa!/.test(xml));
  check('salvar: forma, alinhamento, margem e preenchimento no XML', /prst="roundRect"/.test(xml) && /anchor="ctr"/.test(xml) && /lIns="127000"/.test(xml) && /<a:schemeClr val="accent2"\/>/.test(xml) && /a14:hiddenLine/.test(xml));
  check('salvar: nome "Text Box N"/"Caixa de Texto N" e noProof no run', /<wp:docPr id="(\d+)" name="(Text Box|Caixa de Texto) \1"/.test(xml) && /<w:noProof\/><\/w:rPr><mc:AlternateContent>/.test(xml));
  // a borda seleciona a forma; o miolo edita
  objs = await ev('objects');
  const tbx = (o) => o.kind === 'textbox';
  const ob = objs.find(tbx);
  const near = (list, o) => list.find((q) => tbx(q) && Math.abs(q.x - o.x) < 60 && Math.abs(q.y - o.y) < 60);
  p = await ev('client', ob.page, ob.x + ob.w / 2, ob.y + 2);
  await page.mouse.click(p.x, p.y);
  s = await st();
  sel = await call('selectedShape');
  check('clique na borda seleciona a forma', !s.tb && sel?.kind === 'textbox', { tb: s.tb, sel: !!sel, ob });
  p = await ev('client', ob.page, ob.x + ob.w / 2, ob.y + ob.h / 2);
  await page.mouse.click(p.x, p.y);
  s = await st();
  check('clique no miolo edita o texto', s.tb);
  await page.keyboard.press('Escape');
  // arrastar a borda move (posição no XML)
  const x0 = /<wp:positionH relativeFrom="margin"><wp:align>center<\/wp:align>/.test(xml);
  p = await ev('client', ob.page, ob.x + 2, ob.y + ob.h / 2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 40, p.y + 30, { steps: 4 });
  await page.mouse.up();
  objs = await ev('objects');
  const moved = objs.find(tbx);
  xml = await ev('savedPart', 'word/document.xml');
  check('arrastar a borda move a caixa (posição relativa à margem vira deslocamento)', x0 && Math.abs(moved.x - ob.x - 40 * 15) < 40 && /<wp:positionH relativeFrom="margin"><wp:posOffset>/.test(xml), { dx: moved.x - ob.x });
  const A = moved;

  // Desenhar Caixa de Texto: arrasto na página
  await call('drawTextbox');
  p = await ev('client', 0, 1800, 9000);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 150, p.y + 60, { steps: 4 });
  await page.mouse.up();
  s = await st();
  objs = await ev('objects');
  const B = near(objs, { x: 1800, y: 9000 });
  check('desenhar caixa: arrasto cria a caixa (no tamanho) e fica editando', s.tb && B && Math.abs(B.w - 150 * 15) < 30 && Math.abs(B.h - 60 * 15) < 30, B);
  await page.keyboard.type('B');
  await page.keyboard.press('Escape');
  await call('drawTextbox');
  p = await ev('client', 0, 6000, 9000);
  await page.mouse.click(p.x, p.y);
  objs = await ev('objects');
  const C = near(objs, { x: 6000, y: 9000 });
  check('desenhar caixa: um clique faz 1 pol × 1 pol', C && Math.abs(C.w - 1440) < 2 && Math.abs(C.h - 1440) < 2, C);
  await page.keyboard.press('Escape');
  // Criar Vínculo: da 1ª para a caixa vazia (a com texto é recusada)
  const clickBorder = async (o) => { const q = await ev('client', o.page, o.x + o.w / 2, o.y + 2); await page.mouse.click(q.x, q.y); };
  const clickIn = async (o) => { const q = await ev('client', o.page, o.x + o.w / 2, o.y + o.h / 2); await page.mouse.click(q.x, q.y); };
  await clickBorder(A);
  ok = await call('createTextboxLink');
  const blockedP = page.evaluate(() => new Promise((res) => { document.querySelector('universal-write').addEventListener('uw-blocked', (e) => res(e.detail.reason), { once: true }); setTimeout(() => res(null), 2000); }));
  await clickIn(B);
  check('Criar Vínculo: caixa com texto recusada (aviso)', ok && (await blockedP) === 'linkTargetNotEmpty', { ok });
  await clickBorder(A);
  await call('createTextboxLink');
  await clickIn(C);
  xml = await ev('savedPart', 'word/document.xml');
  check('Criar Vínculo: a 1ª vira wps:txbx id e a vazia linkedTxbx (VML mso-next-textbox)', /<wps:txbx id="1">/.test(xml) && /<wps:linkedTxbx id="1" seq="1"\/>/.test(xml) && /mso-next-textbox:#/.test(xml));
  await clickBorder(A);
  sel = await call('selectedShape');
  ok = await call('breakTextboxLink');
  xml = await ev('savedPart', 'word/document.xml');
  check('Quebrar Vínculo: as duas voltam a wps:txbx sem id', sel?.link?.next && ok && !/<wps:txbx id=/.test(xml) && !/linkedTxbx/.test(xml), { link: sel?.link, ok });
  // Painel de Seleção: as caixas aparecem; ocultar/renomear
  let items = await call('selectionPaneItems');
  check('Painel de Seleção lista as caixas de texto', items.filter((i) => i.kind === 'textbox').length === 3, items);
  await call('renamePaneItem', items[0].key, 'Minha caixa');
  await call('setPaneItemHidden', items[0].key, true);
  items = await call('selectionPaneItems');
  objs = await ev('objects');
  check('Painel de Seleção: renomear e ocultar (oculta sai da página)', items.some((i) => i.name === 'Minha caixa' && i.hidden) && objs.filter((o) => o.kind === 'textbox').length === 2, items);
  // Delete na forma selecionada e desfazer
  await call('setPaneItemHidden', null, false);
  objs = await ev('objects');
  const nBefore = objs.length;
  await clickBorder(objs.find(tbx));
  await page.keyboard.press('Delete');
  const nDel = (await ev('objects')).length;
  await page.keyboard.press('Control+z');
  check('Delete exclui a forma e desfazer volta', nDel === nBefore - 1 && (await ev('objects')).length === nBefore, { nBefore, nDel });
  // Ctrl+C na forma selecionada e colar: uma cópia nova (id de desenho novo), selecionada
  objs = await ev('objects');
  await clickBorder(objs.find(tbx));
  await page.keyboard.press('Control+c');
  await page.evaluate(() => { const ed = document.querySelector('universal-write'); ed.input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true })); });
  await sleep(200);
  const nPaste = (await ev('objects')).length;
  sel = await call('selectedShape');
  xml = await ev('savedPart', 'word/document.xml');
  const ids = [...xml.matchAll(/<wp:docPr id="(\d+)"/g)].map((m) => m[1]);
  check('copiar e colar a forma: uma cópia nova, selecionada, ids de desenho únicos', nPaste === nBefore + 1 && sel?.kind === 'textbox' && new Set(ids).size === ids.length, { nBefore, nPaste, ids });
  // Salvar Seleção na Galeria de Caixas de Texto e inserir o item do usuário
  ok = await call('saveSelectionToTextboxGallery', 'Minha caixa da galeria');
  const tpl = (await call('textboxTemplates')).find((t) => t.user && t.name === 'Minha caixa da galeria');
  const textOf = (await ev('objects')).find(tbx)?.text;
  await page.keyboard.press('Escape');
  const nG = (await ev('objects')).length;
  ok = ok && tpl && await call('insertTextbox', tpl.id);
  objs = await ev('objects');
  check('galeria do usuário: salvar a caixa e inserir de novo (o texto vem junto)', ok && objs.length === nG + 1 && objs.filter((o) => o.text === textOf).length >= 2, { tpl, nG, n: objs.length });
  if (tpl) await call('removeTextboxGalleryItem', tpl.id);

  // caixa de texto no cabeçalho: inserir, digitar, sair e gravar na parte do cabeçalho
  r = await ev('blank');
  await page.evaluate(() => { const e = document.querySelector('universal-write'); e.enterHeaderFooter('header', 0); });
  ok = await call('insertTextbox', 'simple');
  await page.keyboard.type('Caixa do cabecalho');
  s = await st();
  const inHf = s.tb && s.hf;
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const e = document.querySelector('universal-write'); if (e.editingHeaderFooter()) e.exitHeaderFooter(); });
  const parts = await ev('savedParts', ['word/header1.xml', 'word/header2.xml', 'word/document.xml']);
  const hx = Object.entries(parts).filter(([k]) => k.includes('header')).map(([, v]) => v ?? '').join('');
  objs = await ev('objects');
  check('caixa no cabeçalho: edita no lugar e grava na parte do cabeçalho (wps + VML)', ok && inHf && /<wps:txbx>[\s\S]*Caixa do cabecalho/.test(hx) && /<v:textbox[\s\S]*Caixa do cabecalho/.test(hx) && !(parts['word/document.xml'] ?? '').includes('Caixa do cabecalho') && objs.some((o) => o.hf && o.text === 'Caixa do cabecalho'), { ok, inHf, hx: hx.length });
}

// ───────────── Sumário: galeria, personalizado, atualizar, remover, Adicionar Texto, TC (frente Sumário) ─────────────
// Fatos do Word em write/tools/toc-lab (memória word-toc-oracle-facts).
if (want('toc')) {
  // --save-toc <pasta>: grava os .docx intermediários (conferência no Word: write/tools/toc-lab/open-check.ps1)
  const saveDir = opt('save-toc');
  const saveDoc = async (name) => { if (!saveDir) return; mkdirSync(saveDir, { recursive: true }); writeFileSync(join(saveDir, `${name}.docx`), Buffer.from(await ev('saveBase64'), 'base64')); };
  const W = (fn, ...a) => page.evaluate(({ fn, a }) => { const e = document.querySelector('universal-write'); return e[fn](...a); }, { fn, a });
  const docXml = () => ev('savedPart', 'word/document.xml');
  const sdtCount = (x) => (x.match(/<w:docPartGallery w:val="Table of Contents"\/>/g) ?? []).length;
  const tocInstrs = (x) => [...x.matchAll(/<w:instrText[^>]*>( TOC [^<]*)<\/w:instrText>/g)].map((m) => m[1]);
  const tocMarks = (x) => [...x.matchAll(/w:name="(_Toc\d+)"/g)].map((m) => m[1]);
  await ev('blank');
  await W('type', 'Antes'); await W('pressEnter');
  await W('pressEnter');
  await W('type', 'Um'); await W('applyStyle', 'Ttulo1'); await W('pressEnter');
  await W('type', 'Texto.'); await W('pressEnter');
  await W('type', 'Dois'); await W('applyStyle', 'Ttulo2'); await W('pressEnter');
  await W('type', 'Fim.');
  // ── galeria: Sumário Automático no parágrafo vazio (fica no lugar dele — oráculo bb-1)
  await ev('select', 1, 0);
  check('galeria: insertTocTemplate("auto2")', await call('insertTocTemplate', 'auto2'));
  let xml = await docXml();
  let body = xml.slice(xml.indexOf('<w:body>'));
  check('XML: controle de conteúdo do sumário (docPartObj, docPartGallery, docPartUnique) como o Word',
    sdtCount(xml) === 1 && /<w:sdt><w:sdtPr><w:id w:val="-?\d+"\/><w:docPartObj><w:docPartGallery w:val="Table of Contents"\/><w:docPartUnique\/><\/w:docPartObj><\/w:sdtPr><w:sdtContent>/.test(xml),
    body.slice(0, 400));
  const inSdt = body.slice(body.indexOf('<w:sdtContent>'), body.indexOf('</w:sdtContent>'));
  check('título no estilo Cabeçalho do Sumário (TOCHeading) e o campo dentro do controle',
    /<w:pStyle w:val="CabealhodoSumrio"\/>/.test(inSdt) && tocInstrs(inSdt).join() === ' TOC \\o "1-3" \\h \\z \\u ' && /w:fldCharType="end"/.test(inSdt), inSdt.slice(0, 600));
  const sty = await ev('savedPart', 'word/styles.xml');
  check('estilos TOC Heading e toc 1/toc 2 gravados', /w:name w:val="TOC Heading"/.test(sty) && /w:name w:val="toc 1"/.test(sty) && /w:name w:val="toc 2"/.test(sty));
  check('entradas: hiperlink para _Toc nos títulos, tab direita com pontilhado, PAGEREF',
    /<w:hyperlink w:anchor="_Toc\d+" w:history="1">/.test(inSdt) && /<w:tab w:val="right" w:leader="dot" w:pos="\d+"\/>/.test(inSdt) && /PAGEREF _Toc\d+ \\h/.test(inSdt) && tocMarks(xml).length === 2);
  check('o parágrafo vazio deu lugar ao sumário; o texto segue depois', /<\/w:sdt><w:p><w:pPr><w:pStyle w:val="Ttulo1"\/>/.test(body), body.slice(body.indexOf('</w:sdt>'), body.indexOf('</w:sdt>') + 120));
  check('hasTableOfContents', await call('hasTableOfContents'));
  let ps = await ev('paras');
  const head = ps.findIndex((p) => p.style === 'CabealhodoSumrio');
  await ev('select', head, 1);
  check('cursor no título: inTableOfContents (controle)', await call('inTableOfContents'));
  // ── outro modelo da galeria SUBSTITUI (docPartUnique)
  check('galeria de novo: substitui (Automático 1)', await call('insertTocTemplate', 'auto1'));
  xml = await docXml();
  check('um controle só, com o título do modelo 1', sdtCount(xml) === 1 && /CabealhodoSumrio"\/><\/w:pPr><w:r><w:t>(Conteúdo|Contents)<\/w:t>/.test(xml));
  await saveDoc('toc-gallery');
  // ── atualizar só os números: o texto editado fica, o título novo não entra, os _Toc são os mesmos
  ps = await ev('paras');
  let e1 = ps.findIndex((p) => p.text.startsWith('Um') && p.style === 'Sumrio1');
  await ev('select', e1, 1); await W('type', 'X');
  const marks0 = tocMarks(await docXml());
  const dois = (await ev('paras')).findIndex((p) => p.style === 'Ttulo2');
  await ev('select', dois, 0); await call('insertPageBreak');
  const fim = (await ev('paras')).length - 1;
  await ev('select', fim, 4); await W('pressEnter'); await W('type', 'Tres'); await W('applyStyle', 'Ttulo1');
  check('Atualizar Sumário: só os números', await call('updateToc', 'pages'));
  ps = await ev('paras');
  const entries = ps.filter((p) => /^Sumrio/.test(p.style ?? ''));
  check('só números: texto editado mantido, sem a entrada nova, página do Dois = 2',
    entries.some((p) => p.text.startsWith('UXm')) && !entries.some((p) => p.text.includes('Tres')) && entries.some((p) => /^Dois\t2$/.test(p.text)), entries.map((p) => p.text));
  check('só números: os mesmos _Toc', JSON.stringify(tocMarks(await docXml())) === JSON.stringify(marks0));
  check('Atualizar Sumário: o índice inteiro', await call('updateToc', 'all'));
  ps = await ev('paras');
  const ent2 = ps.filter((p) => /^Sumrio/.test(p.style ?? '')).map((p) => p.text);
  check('inteiro: entradas refeitas (sem o X, com Tres) e _Toc novos', !ent2.some((t) => t.startsWith('UXm')) && ent2.some((t) => t.startsWith('Tres')) && !tocMarks(await docXml()).some((m) => marks0.includes(m)), ent2);
  check('ainda dentro do controle', sdtCount(await docXml()) === 1);
  // ── Adicionar Texto
  const txt = ps.findIndex((p) => p.text === 'Texto.');
  await ev('select', txt, 2);
  check('Adicionar Texto: parágrafo Normal = Não Mostrar (0)', (await call('getTocLevel')) === 0);
  await call('setTocLevel', 2);
  ps = await ev('paras');
  check('Nível 2 num parágrafo Normal aplica o Título 2', ps[txt].style === 'Ttulo2' && (await call('getTocLevel')) === 2, ps[txt]);
  await call('setTocLevel', 0);
  ps = await ev('paras');
  check('Não Mostrar num título volta para Normal', !ps[txt].style || ps[txt].style === 'Normal', ps[txt]);
  // ── Marcar Entrada de Sumário (TC)
  const last = ps.length - 1;
  await ev('select', last, (await ev('text', last)).length);
  check('Marcar Entrada de Sumário (TC)', await call('markTocEntry', { text: 'Entrada TC', level: 2 }));
  xml = await docXml();
  check('TC como o Word grava: begin/instr/end, sem separate (oráculo tc-mark)',
    /<w:fldChar w:fldCharType="begin"\/><\/w:r><w:r><w:instrText xml:space="preserve"> TC "Entrada TC" \\f C \\l "2" <\/w:instrText><\/w:r><w:r><w:fldChar w:fldCharType="end"\/>/.test(xml), xml.match(/.{0,120}TC "Entrada.{0,160}/)?.[0]);
  // ── Sumário Personalizado: substitui, com os campos TC
  await ev('select', head + 2, 1);
  check('Sumário Personalizado com campos TC (\\f), substituindo', await call('insertTableOfContents', { fields: true, levels: 3 }, true));
  xml = await docXml();
  check('instrução \\o "1-3" \\f \\h \\z \\u e a entrada do TC', tocInstrs(xml).join() === ' TOC \\o "1-3" \\f \\h \\z \\u ' && (await ev('paras')).some((p) => /^Sumrio2/.test(p.style ?? '') && p.text.startsWith('Entrada TC')), tocInstrs(xml));
  const opts0 = await call('getTableOfContentsOptions');
  check('getTableOfContentsOptions lê o campo', opts0 && opts0.fields === true && opts0.levels === 3 && opts0.hyperlinks === true && opts0.leader === 'dot', opts0);
  await call('insertTableOfContents', { pageNumbers: false, hyperlinks: false, levels: 2, leader: 'hyphen' }, true);
  xml = await docXml();
  check('sem números (\\n), sem hiperlinks, 2 níveis, preenchimento hífen',
    tocInstrs(xml).join() === ' TOC \\o "1-2" \\n \\z \\u ' && !/<w:hyperlink w:anchor="_Toc/.test(xml) && /w:leader="hyphen"/.test(xml), tocInstrs(xml));
  await call('insertTableOfContents', { rightAlign: false, format: 'classic' }, true);
  xml = await docXml();
  const sty2 = await ev('savedPart', 'word/styles.xml');
  check('sem alinhar à direita (\\p " ") e formato Clássico nos estilos toc',
    tocInstrs(xml).join() === ' TOC \\o "1-3" \\p " " \\h \\z \\u ' && /w:name w:val="toc 1"\/>[\s\S]*?<w:caps\/>[\s\S]*?<\/w:style>/.test(sty2.slice(sty2.indexOf('w:name w:val="toc 1"') - 80, sty2.indexOf('w:name w:val="toc 2"'))), tocInstrs(xml));
  await saveDoc('toc-custom');
  // ── Remover Sumário: o controle inteiro (com o título) e os _Toc
  check('Remover Sumário', await call('removeTableOfContents'));
  xml = await docXml();
  check('removido: sem controle, sem campo TOC, sem _Toc', sdtCount(xml) === 0 && tocInstrs(xml).length === 0 && tocMarks(xml).length === 0 && !/CabealhodoSumrio/.test(xml.slice(xml.indexOf('<w:body>'))));
  await call('undo');
  check('desfazer volta o sumário (um passo)', sdtCount(await docXml()) === 1);
  // ── Sumário Manual e sumário vazio
  await ev('blank');
  await W('type', 'Sem titulos.'); await W('pressEnter');
  check('galeria num documento sem títulos', await call('insertTocTemplate', 'auto2'));
  xml = await docXml();
  check('sem títulos: o aviso num parágrafo só, o campo começa e acaba nele (oráculo bb-1-empty)',
    /<w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u <\/w:instrText><\/w:r><w:r><w:fldChar w:fldCharType="separate"\/><\/w:r><w:r><w:rPr><w:b\/><w:noProof\/><\/w:rPr><w:t>(Nenhuma entrada de sumário foi encontrada\.|No table of contents entries found\.)<\/w:t><\/w:r><w:r><w:fldChar w:fldCharType="end"\/><\/w:r><\/w:p><\/w:sdtContent>/.test(xml),
    xml.match(/.{0,200}TOC \\o.{0,500}/)?.[0]);
  check('Sumário Manual substitui', await call('insertTocTemplate', 'manual'));
  xml = await docXml();
  check('Manual: 6 entradas com w:ptab (alinhamento à direita, pontilhado), sem campo', sdtCount(xml) === 1 && (xml.match(/<w:ptab w:relativeTo="margin" w:alignment="right" w:leader="dot"\/>/g) ?? []).length === 6 && !tocInstrs(xml).length, (xml.match(/w:ptab/g) ?? []).length);
  await saveDoc('toc-manual');
  // ── reabrir: o controle continua (lido pela fonte), Enter no fim fica dentro, atualizar mantém
  await ev('openBase64', await ev('saveBase64'));
  ps = await ev('paras');
  const lastIn = ps.map((p) => !!p.props.blockSdt).lastIndexOf(true);
  await ev('select', lastIn, (await ev('text', lastIn)).length); await W('pressEnter'); await W('type', 'Dentro');
  xml = await docXml();
  check('reaberto: Enter no último parágrafo do controle fica dentro dele', sdtCount(xml) === 1 && /Dentro<\/w:t><\/w:r><\/w:p><\/w:sdtContent><\/w:sdt>/.test(xml), xml.match(/.{0,200}<\/w:sdtContent>/)?.[0]);
}

// ───────────── sumários do corpus atualizados pelo editor (fora do padrão) ─────────────
// --only toccorpus [--toc-limit N] [--toc-out pasta]: abre documentos do corpus com
// campo TOC, atualiza (updateToc — o motor de TOC único), confere o XML e grava os
// salvos + manifest.tsv para o word-open-check -Toc (o Word atualiza o mesmo sumário
// e compara as entradas).
if (want('toccorpus')) {
  const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
  const CORPUS = process.env.CORPUS_ROOT ?? 'E:/UniversalWriteTest';
  const lim = Number(opt('toc-limit', 40));
  const outDir = opt('toc-out');
  const files = [];
  const walkDir = function* (dir) {
    for (const e of (require('node:fs').readdirSync(dir, { withFileTypes: true }))) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '_lab') yield* walkDir(p); } else if (/\.docx$/i.test(e.name)) yield p;
    }
  };
  for (const f of walkDir(join(CORPUS, 'Documents'))) {
    if (files.length >= lim) break;
    try {
      const b = readFileSync(f);
      if (b[0] !== 0x50) continue;
      const x = core.DocxPackage.load(new Uint8Array(b)).documentXml();
      if (/<w:instrText[^>]*>\s*TOC\s+\\[ocu]/.test(x)) files.push(f);
    } catch { /* não abre: fora */ }
  }
  const manifest = [];
  let k = 0;
  for (const f of files) {
    k++;
    extraFiles.set('doc', f);
    try {
      await ev('open', '/__file/doc');
      await page.evaluate(() => document.querySelector('universal-write').enableEditing?.());
      const ok = await call('updateToc');
      const xml = await ev('savedPart', 'word/document.xml');
      const begins = (xml.match(/w:fldCharType="begin"/g) ?? []).length, ends = (xml.match(/w:fldCharType="end"/g) ?? []).length;
      const anchors = [...xml.matchAll(/<w:hyperlink w:anchor="(_Toc\d+)"/g)].map((m) => m[1]);
      const missing = anchors.filter((a) => !xml.includes(`w:name="${a}"`));
      const pass = ok && begins === ends && missing.length === 0;
      check(`TOC do corpus ${k}: atualiza, campos balanceados, _Toc existem`, pass, { file: f.slice(CORPUS.length + 1).slice(-60), ok, begins, ends, entries: anchors.length, missing: missing.slice(0, 3) });
      if (outDir && pass) {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, `${k}.docx`), Buffer.from(await ev('saveBase64'), 'base64'));
        manifest.push(`${k}.docx\t${f}`);
      }
    } catch (e) {
      check(`TOC do corpus ${k}: abre e atualiza`, false, { file: f.slice(-60), err: String(e).slice(0, 200) });
    }
  }
  if (outDir) writeFileSync(join(outDir, 'manifest.tsv'), manifest.join('\n'), 'utf8');
}

// ───────────── desempenho ─────────────
const perf = [];
async function perfDoc(label, opener) {
  const r = await opener();
  const lines = await page.evaluate(() => document.querySelector('universal-write').layoutCache.length);
  const mid = Math.max(0, Math.floor(lines / 2));
  const t = await ev('timeTyping', mid, 12);
  const sorted = [...t.ms].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const last = t.stats[t.stats.length - 1];
  const tc = await ev('timeCellTyping', 10);
  if (tc) { const so = [...tc.ms].sort((a, b) => a - b); console.log(`perf ${label} (célula): mediana ${so[Math.floor(so.length / 2)]} ms [${tc.ms.join(' ')}] modos ${tc.modes}`); }
  perf.push({ label, pages: r.pages, medianMs: median, maxMs: sorted[sorted.length - 1], layoutMs: Math.round(last.layoutMs), buildMs: Math.round(last.buildMs * 10) / 10, paintMs: Math.round(last.paintMs), mode: last.mode });
  console.log(`perf ${label}: ${r.pages} pág., digitação mediana ${median} ms (máx ${sorted[sorted.length - 1]}), layout ${Math.round(last.layoutMs)} ms, pintura ${Math.round(last.paintMs)} ms [${t.ms.join(' ')}] modos ${t.stats.map((x) => x.mode[0]).join('')}`);
}
// ───────────── Página: Cor da Página, marca-d'água, folha de rosto, página em branco (frente Página) ─────────────
if (want('home')) {
  // ───────────── Página Inicial (write/tools/home-lab; memórias word-underline-facts e word-home-font-facts) ─────────────
  const saveDir = opt('save-home');
  const saveDoc = async (name) => { if (!saveDir) return; mkdirSync(saveDir, { recursive: true }); writeFileSync(join(saveDir, `${name}.docx`), Buffer.from(await ev('saveBase64'), 'base64')); };
  const E = 'document.querySelector("universal-write")';
  const js = (body) => page.evaluate(`(async () => { const e = ${E}; ${body} })()`);
  const doc = async () => (await page.evaluate((n) => window.ed.savedParts(n), ['word/document.xml']))['word/document.xml'];
  const items = (filter) => js(`return e.eng.result.pages[0].items.filter((i) => ${filter}).length;`);
  await ev('blank');
  await js('e.type("Alfa beta gama delta"); e.pressEnter(); e.type("Segundo paragrafo"); e.pressEnter(); e.type("Terceiro paragrafo"); e.pressEnter(); e.type("Quarto");');

  // sublinhado com estilo: o XML do Word e o desenho (traços do pontilhado = vários retângulos)
  await js('e.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 4 }); e.setUnderline("dotted");');
  let x = await doc();
  check('home: sublinhado pontilhado grava <w:u w:val="dotted"/>', /<w:r><w:rPr><w:u w:val="dotted"\/><\/w:rPr><w:t>Alfa<\/w:t>/.test(x), x.slice(0, 300));
  check('home: o motor desenha o pontilhado em traços (retângulos de 1,44 pt)', (await items('i.t === "rect" && Math.abs(i.w - 28.8) < 0.01')) >= 5, null);
  check('home: o estilo escolhido vira o do botão Sublinhado', (await js('return e.underlineButtonStyle();')) === 'dotted', null);
  // botão (Ctrl+U) sobre o estilo do botão: tira; sobre outro (duplo): troca pelo do botão (medido)
  await js('e.toggleUnderline();');
  x = await doc();
  check('home: Ctrl+U sobre o estilo do botão tira o sublinhado', !/<w:u /.test(x.match(/<w:t>Alfa/) ? x.split('<w:t>Alfa')[0].slice(-80) : x), null);
  await js('e.setUnderline("single"); e.toggleUnderline("double"); e.toggleUnderline();');
  x = await doc();
  check('home: o botão Sublinhado sobre duplo aplica o simples (como o Word)', /<w:u w:val="single"\/><\/w:rPr><w:t>Alfa/.test(x), null);
  // cor do sublinhado do tema (accent2, 25% mais escura) e cor da fonte do tema
  await js('e.setUnderlineColor({ themeColor: "accent2", shade: 0.25 }); e.setColor({ themeColor: "accent1" });');
  x = await doc();
  check('home: cor do sublinhado do tema grava w:color + w:themeColor + w:themeShade="BF"', /<w:u w:val="single" w:color="[0-9A-F]{6}" w:themeColor="accent2" w:themeShade="BF"\/>/.test(x), x.match(/<w:u [^>]*>/)?.[0]);
  check('home: cor da fonte do tema grava w:color + w:themeColor', /<w:color w:val="[0-9A-F]{6}" w:themeColor="accent1"\/>/.test(x), x.match(/<w:color [^>]*>/)?.[0]);
  // diálogo Fonte: tudo num passo (oculto, escala, espaçamento, posição, kerning)
  await js('e.setSelection({ para: 0, offset: 5 }, { para: 0, offset: 9 }); e.setFontFormat({ hidden: true, scalePct: 150, spacingTwips: 20, positionHalfPt: 6, kernMinHalfPt: 24, doubleStrike: true });');
  x = await doc();
  check('home: setFontFormat grava dstrike/vanish/spacing/w/kern/position na ordem do CT_RPr',
    /<w:rPr><w:dstrike\/><w:vanish\/><w:spacing w:val="20"\/><w:w w:val="150"\/><w:kern w:val="24"\/><w:position w:val="6"\/><\/w:rPr><w:t>beta<\/w:t>/.test(x), x.match(/<w:r><w:rPr><w:dstrike[\s\S]*?<\/w:r>/)?.[0]);
  await js('e.undo();');
  x = await doc();
  check('home: um desfazer volta toda a formatação do diálogo', !/<w:vanish\/>|<w:dstrike\/>/.test(x), null);
  // Maiúsculas e Minúsculas
  await js('e.setSelection({ para: 1, offset: 0 }, { para: 1, offset: 17 }); e.changeCase("upper");');
  check('home: MAIÚSCULAS', (await ev('text', 1)) === 'SEGUNDO PARAGRAFO', await ev('text', 1));
  await js('e.changeCase("next");');
  check('home: Shift+F3 depois de MAIÚSCULAS → minúsculas', (await ev('text', 1)) === 'segundo paragrafo', await ev('text', 1));
  await js('e.changeCase("next");');
  check('home: Shift+F3 sobre minúsculas sem ponto → Colocar Cada Palavra', (await ev('text', 1)) === 'Segundo Paragrafo', await ev('text', 1));
  await js('e.changeCase("toggle");');
  check('home: aLTERNAR', (await ev('text', 1)) === 'sEGUNDO pARAGRAFO', await ev('text', 1));
  await js('e.changeCase("sentence");');
  check('home: Primeira letra da frase', (await ev('text', 1)) === 'Segundo paragrafo', await ev('text', 1));
  // atalhos do Word pela tecla física: Ctrl+Shift+D (duplo)
  await js('e.setSelection({ para: 2, offset: 0 }, { para: 2, offset: 8 }); e.focusEditor();');
  await page.keyboard.press('Control+Shift+KeyD');
  x = await doc();
  check('home: Ctrl+Shift+D aplica o sublinhado duplo', /<w:u w:val="double"\/><\/w:rPr><w:t>Terceiro<\/w:t>/.test(x), null);
  // Bordas: Externas em 2 parágrafos (cada um com a caixa; o Word junta), alterna; Linha Horizontal
  await js('e.setSelection({ para: 1, offset: 0 }, { para: 2, offset: 3 }); e.paragraphBorderPreset("outside");');
  x = await doc();
  const box = '<w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="4" w:color="auto"/></w:pBdr>';
  check('home: Bordas Externas gravam o w:pBdr do Word nos dois parágrafos', x.split(box).length === 3, null);
  const lat = await js('const r = e.eng.result.pages[0].items.filter((i) => i.t === "rect" && i.w < 12 && i.h > 100).sort((a, b) => a.y - b.y); return r.length >= 4 ? Math.abs(r[2].y - (r[0].y + r[0].h)) : -1;');
  check('home: as laterais do grupo seguem pelo espaço entre os parágrafos', lat >= 0 && lat < 1, lat);
  await js('e.paragraphBorderPreset("outside");');
  x = await doc();
  check('home: Bordas Externas de novo tiram as bordas', !/<w:pBdr>/.test(x), null);
  await js('e.paragraphBorderPreset("inside"); e.paragraphBorderPreset("insideV");');
  x = await doc();
  check('home: Bordas Internas = w:between; Interna Vertical = w:bar (sem w:space)', /<w:between w:val="single" w:sz="4" w:space="1" w:color="auto"\/><w:bar w:val="single" w:sz="4" w:color="auto"\/>/.test(x), null);
  await js('e.paragraphBorderPreset("none"); e.setSelection({ para: 3, offset: 6 }); e.insertHorizontalLine();');
  x = await doc();
  check('home: Linha Horizontal grava o v:rect o:hr do Word num parágrafo próprio',
    /<w:p><w:r><w:pict><v:rect id="_x0000_i1025" style="width:0;height:1\.5pt" o:hralign="center" o:hrstd="t" o:hr="t" fillcolor="#a0a0a0" stroked="f"\/><\/w:pict><\/w:r><\/w:p>/.test(x), null);
  check('home: o motor desenha a linha (retângulo cinza com relevo)', (await items('i.t === "rect" && i.fill === "A0A0A0"')) >= 3, null);
  // Pincel de Formatação: duplo clique trava (dois trechos), Esc solta; não copia a origem do run
  await js('e.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 2 }); e.copyFormat(true);');
  check('home: pincel travado fica ativo', (await js('return e.painterSticky();')) === true, null);
  await js('e.cancelFormatPainter();');
  check('home: Esc/cancelar solta o pincel', (await js('return e.painterActive();')) === false, null);
  // Definir como Padrão: a fonte vai para o rPr do estilo Normal (medido), não para o w:docDefaults
  await js('e.setDefaultFont({ fontFamily: "Georgia", sizePt: 14 });');
  const sx = (await page.evaluate((n) => window.ed.savedParts(n), ['word/styles.xml']))['word/styles.xml'] ?? '';
  const normal = /<w:style w:type="paragraph" w:default="1"[^>]*>[\s\S]*?<\/w:style>/.exec(sx)?.[0] ?? '';
  check('home: Definir como Padrão grava fonte e tamanho no Normal', /<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"\/>/.test(normal) && /<w:sz w:val="28"\/>/.test(normal), normal.slice(0, 300));
  await saveDoc('home-font');

  // ───── listas (write/tools/home-lab exp-lists/listkeys/listcmds/liststyle; memória word-lists-facts) ─────
  const parts = async (...n) => page.evaluate((ns) => window.ed.savedParts(ns), n);
  const numx = async () => (await parts('word/numbering.xml'))['word/numbering.xml'] ?? '';
  const pPrOf = (xml, text) => { const m = new RegExp(`<w:p>(?:(?!<w:p>)[\\s\\S])*?<w:t>${text}</w:t>`).exec(xml); return m ? (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(m[0])?.[0] ?? '') : null; };
  const item = (n) => `<w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${n}"/></w:numPr></w:pPr>`;
  await ev('blank');
  await js('e.type("Um"); e.pressEnter(); e.type("Dois"); e.pressEnter(); e.type("Texto"); e.pressEnter(); e.type("Tres");');
  await js('e.setSelection({ para: 0, offset: 0 }, { para: 1, offset: 2 }); e.applyListLibrary("number", 0);');
  x = await doc();
  let nx = await numx();
  check('lista: Numeração grava Parágrafo da Lista + numPr (sem recuo direto), como o Word', pPrOf(x, 'Um') === item(1) && pPrOf(x, 'Dois') === item(1), pPrOf(x, 'Um'));
  check('lista: abstractNum hybridMultilevel com nsid/tmpl, w15 e os níveis sem uso tentativos',
    /<w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="[0-9A-F]{8}"\/><w:multiLevelType w:val="hybridMultilevel"\/><w:tmpl w:val="[0-9A-F]{8}"\/><w:lvl w:ilvl="0" w:tplc="0[0-9A-F]{3}000F"><w:start w:val="1"\/><w:numFmt w:val="decimal"\/><w:lvlText w:val="%1\."\/>/.test(nx)
      && (nx.match(/w:tentative="1"/g) ?? []).length === 8 && /<w:num w:numId="1"><w:abstractNumId w:val="0"\/><\/w:num>/.test(nx), nx.slice(0, 400));
  check('lista: o motor desenha "1." e "2."', (await items('i.t === "glyphs" && (i.text.startsWith("1.") || i.text.startsWith("2."))')) === 2,
    await js('return e.eng.result.pages[0].items.filter((i) => i.t === "glyphs").map((i) => i.text);'));
  // a lista anterior com o mesmo formato continua, mesmo com texto no meio (two-lists-gap)
  await js('e.setSelection({ para: 3, offset: 1 }); e.applyListLibrary("number", 0);');
  x = await doc();
  check('lista: Numeração depois de texto continua a lista anterior (mesmo numId)', pPrOf(x, 'Tres') === item(1), pPrOf(x, 'Tres'));
  check('lista: o 3º item é "3."', (await items('i.t === "glyphs" && i.text.startsWith("3.")')) === 1, null);
  // Tab no início de um item (não o 1º): nível 2; Shift+Tab volta
  await js('e.setSelection({ para: 1, offset: 0 }); e.focusEditor();');
  await page.keyboard.press('Tab');
  x = await doc();
  check('lista: Tab no início do item desce um nível (ilvl 1)', /<w:ilvl w:val="1"\/>/.test(pPrOf(x, 'Dois') ?? ''), pPrOf(x, 'Dois'));
  await page.keyboard.press('Shift+Tab');
  x = await doc();
  check('lista: Shift+Tab sobe o nível', pPrOf(x, 'Dois') === item(1), pPrOf(x, 'Dois'));
  // Tab no 1º item: a lista inteira vai para a próxima tabulação padrão (720 → 1068)
  await js('e.setSelection({ para: 0, offset: 0 }); e.focusEditor();');
  await page.keyboard.press('Tab');
  nx = await numx();
  check('lista: Tab no 1º item desloca a lista toda (w:left 720→1068, 1440→1788)', /<w:ind w:left="1068" w:hanging="360"\/>/.test(nx) && /<w:ind w:left="1788" w:hanging="360"\/>/.test(nx), nx.match(/<w:ind [^>]*>/g)?.slice(0, 2));
  await js('e.undo();');
  nx = await numx();
  check('lista: desfazer volta a numeração', /<w:ind w:left="720" w:hanging="360"\/>/.test(nx) && !/1068/.test(nx), null);
  // Reiniciar em 1 / Continuar Numeração (NumberingRestart: cópia com tplc FFFFFFFF + w:num novo)
  await js('e.setSelection({ para: 3, offset: 0 }); e.restartNumbering();');
  x = await doc(); nx = await numx();
  check('lista: Reiniciar em 1 = abstractNum copiado (tplc FFFFFFFF) + w:num novo do item em diante',
    pPrOf(x, 'Tres') === item(2) && /<w:abstractNum w:abstractNumId="1"[^>]*><w:nsid w:val="[0-9A-F]{8}"\/><w:multiLevelType w:val="hybridMultilevel"\/><w:tmpl w:val="[0-9A-F]{8}"\/><w:lvl w:ilvl="0" w:tplc="FFFFFFFF">/.test(nx), pPrOf(x, 'Tres'));
  check('lista: depois de reiniciar o item é "1." de novo', (await items('i.t === "glyphs" && i.text.startsWith("1.")')) === 2, null);
  await js('e.continueNumbering();');
  x = await doc();
  check('lista: Continuar Numeração volta à lista anterior', pPrOf(x, 'Tres') === item(1), pPrOf(x, 'Tres'));
  await js('e.setNumberingValue({ mode: "new", value: 5 });');
  check('lista: Definir Valor de Numeração (nova lista em 5) → "5."', (await items('i.t === "glyphs" && i.text.startsWith("5.")')) === 1 && (await js('return e.numberingValueInfo().value;')) === 5, null);
  // Enter num item vazio sai da lista (Normal); Backspace no início: sai o número, depois o estilo (recuo 360), depois o recuo
  await js('e.setSelection({ para: 1, offset: 4 }); e.pressEnter();');
  x = await doc();
  check('lista: Enter no fim de um item cria outro item', (await js('return e.listInfo()?.numId;')) === 1, null);
  await js('e.pressEnter();');
  x = await doc();
  check('lista: Enter num item vazio do nível 1 tira da lista (parágrafo Normal)', /<w:t>Dois<\/w:t><\/w:r><\/w:p><w:p(?:\/>|><\/w:p>)/.test(x), x.slice(x.indexOf('Dois') - 20, x.indexOf('Dois') + 80));
  await js('e.undo(); e.undo(); e.setSelection({ para: 1, offset: 0 }); e.focusEditor();');
  await page.keyboard.press('Backspace');
  x = await doc();
  check('lista: Backspace no início tira o número e mantém o Parágrafo da Lista', pPrOf(x, 'Dois') === '<w:pPr><w:pStyle w:val="PargrafodaLista"/></w:pPr>', pPrOf(x, 'Dois'));
  await page.keyboard.press('Backspace');
  x = await doc();
  check('lista: 2º Backspace → Normal com recuo de 360', pPrOf(x, 'Dois') === '<w:pPr><w:ind w:left="360"/></w:pPr>', pPrOf(x, 'Dois'));
  await page.keyboard.press('Backspace');
  x = await doc();
  check('lista: 3º Backspace tira o recuo (o texto continua no parágrafo)', pPrOf(x, 'Dois') === '' && /<w:t>Um<\/w:t>/.test(x), pPrOf(x, 'Dois'));
  // marcadores: Definir Novo Marcador (Wingdings, sem tplc); o botão tira a lista
  await js('e.setSelection({ para: 2, offset: 0 }); e.applyListLibrary("bullet", 0);');
  nx = await numx();
  check('lista: Marcadores grava o • da Symbol (F0B7) com tplc', /<w:lvl w:ilvl="0" w:tplc="0[0-9A-F]{3}0001"><w:start w:val="1"\/><w:numFmt w:val="bullet"\/><w:lvlText w:val="\uF0B7"\/>/.test(nx), null);
  await js('e.defineListLevel({ bullet: "\\uF076", font: "Wingdings" });');
  nx = await numx();
  check('lista: Definir Novo Marcador grava o caractere e a fonte, sem tplc',
    /<w:lvl w:ilvl="0"><w:start w:val="1"\/><w:numFmt w:val="bullet"\/><w:lvlText w:val="\uF076"\/><w:lvlJc w:val="left"\/><w:pPr><w:ind w:left="720" w:hanging="360"\/><\/w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"\/><\/w:rPr><\/w:lvl>/.test(nx), null);
  await js('e.toggleList("bullet");');
  x = await doc();
  check('lista: o botão Marcadores de novo tira a lista e o estilo', pPrOf(x, 'Texto') === '', pPrOf(x, 'Texto'));
  // vários níveis ligados aos títulos: o w:numPr vai para os estilos Título 1–9 (como o Word)
  await js('e.setSelection({ para: 0, offset: 0 }); e.applyMultilevelLibrary(4);');
  x = await doc();
  const sx2 = (await parts('word/styles.xml'))['word/styles.xml'] ?? '';
  const t1 = /<w:style [^>]*w:styleId="Ttulo1"[^>]*>[\s\S]*?<\/w:style>/.exec(sx2)?.[0] ?? '';
  const t2 = /<w:style [^>]*w:styleId="Ttulo2"[^>]*>[\s\S]*?<\/w:style>/.exec(sx2)?.[0] ?? '';
  check('lista: vários níveis "1 Título 1" põe o parágrafo no Título 1 (sem numPr direto)', pPrOf(x, 'Um') === '<w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr>', pPrOf(x, 'Um'));
  check('lista: Título 1 ganha <w:numPr><w:numId/>; Título 2 o ilvl 1', /<w:numPr><w:numId w:val="\d+"\/><\/w:numPr>/.test(t1) && /<w:numPr><w:ilvl w:val="1"\/><w:numId w:val="\d+"\/><\/w:numPr>/.test(t2), t1.slice(0, 300));
  // estilo de lista: w:style numbering + styleLink; aplicado = abstractNum com numStyleLink (ls-apply-template)
  await js('e.setSelection({ para: 2, offset: 0 }); e.createListStyle("Minha Lista");');
  nx = await numx();
  const sx3 = (await parts('word/styles.xml'))['word/styles.xml'] ?? '';
  check('lista: Definir Novo Estilo de Lista grava o w:style numbering (Sem Lista + numPr) e o styleLink',
    /<w:style w:type="numbering" w:customStyle="1" w:styleId="MinhaLista"><w:name w:val="Minha Lista"\/><w:basedOn w:val="Semlista"\/><w:pPr><w:numPr><w:numId w:val="\d+"\/><\/w:numPr><\/w:pPr><\/w:style>/.test(sx3)
      && /<w:styleLink w:val="MinhaLista"\/><w:lvl w:ilvl="0"><w:start w:val="1"\/><w:numFmt w:val="decimal"\/><w:lvlText w:val="%1\)"\/>/.test(nx), /<w:style w:type="numbering"[\s\S]*?<\/w:style>/.exec(sx3)?.[0]);
  check('lista: o estilo aplicado = abstractNum só com numStyleLink + w:num novo', /<w:multiLevelType w:val="multilevel"\/><w:tmpl w:val="[0-9A-F]{8}"\/><w:numStyleLink w:val="MinhaLista"\/><\/w:abstractNum>/.test(nx), null);
  check('lista: o motor numera pelo estilo de lista ("1)")', (await items('i.t === "glyphs" && i.text.startsWith("1)")')) === 1, null);
  await saveDoc('home-lists');

  // ───── colar (write/tools/home-lab exp-paste.ps1; memória word-paste-facts) ─────
  const bodyOf = (xml) => xml.slice(xml.indexOf('<w:body>') + 8, xml.lastIndexOf('<w:sectPr'));
  const paraXml = (xml) => bodyOf(xml).match(/<w:p>[\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  const base = `e.type("Titulo origem"); e.pressEnter(); e.type("Texto negrito fim"); e.pressEnter(); e.type("Destino:"); e.pressEnter(); e.type("Fim");
    e.setSelection({ para: 0, offset: 0 }); e.applyStyle(e.listStyles("all").find((s) => s.rawName === "heading 1").id);
    e.setSelection({ para: 1, offset: 0 }, { para: 1, offset: 17 }); e.setFontFormat({ fontFamily: "Georgia", sizePt: 14, color: "FF0000" });
    e.setSelection({ para: 1, offset: 6 }, { para: 1, offset: 13 }); e.setFontFormat({ bold: true });
    e.setSelection({ para: 2, offset: 0 }, { para: 3, offset: 3 }); e.setFontFormat({ fontFamily: "Verdana", sizePt: 10 });`;
  await ev('blank');
  await js(base);
  // os dois primeiros parágrafos (com as marcas) copiados e colados no começo de "Fim"
  await js('e.setSelection({ para: 0, offset: 0 }, { para: 2, offset: 0 }); await e.copy(); e.setSelection({ para: 3, offset: 0 }); await e.paste("keep");');
  x = await doc();
  let ps = paraXml(x);
  check('colar: Manter Formatação Original leva o estilo da marca (Título 1) e a formatação dos trechos',
    ps.length === 6 && /<w:pStyle w:val="Ttulo1"\/>/.test(ps[3]) && /Georgia[^>]*\/><w:b\/>(?:(?!<\/w:rPr>)[\s\S])*<w:color w:val="FF0000"\/>(?:(?!<\/w:rPr>)[\s\S])*<w:sz w:val="28"\/>[\s\S]*?<w:t>negrito/.test(ps[4]) && /<w:t>Fim<\/w:t>/.test(ps[5]), ps.slice(3));
  check('colar: o botão Opções de Colagem oferece K, M, U, T', JSON.stringify((await js('return e.pasteOptions();')).modes) === '["keep","merge","picture","text"]', await js('return e.pasteOptions();'));
  await js('e.repaste("merge");');
  x = await doc(); ps = paraXml(x);
  check('colar: Mesclar dá a formatação do destino (Verdana 10, sem Título 1) e mantém o negrito',
    ps.length === 6 && !/pStyle/.test(ps[3]) && /Verdana[^>]*\/><w:b\/>(?:(?!<\/w:rPr>)[\s\S])*<w:sz w:val="20"\/>[\s\S]*?<w:t>negrito/.test(ps[4]) && !/Georgia|FF0000/.test(ps[3] + ps[4]), ps.slice(3));
  await js('e.repaste("text");');
  x = await doc(); ps = paraXml(x);
  check('colar: Manter Somente Texto — o último pedaço entra no parágrafo do destino (5 parágrafos)',
    ps.length === 5 && /<w:t>Titulo origem<\/w:t>/.test(ps[3]) && /<w:t>Texto negrito fimFim<\/w:t>/.test(ps[4]) && !/<w:b\/>|Georgia/.test(ps[3] + ps[4]), ps.slice(3));
  // uma palavra (sem marca) depois de "Destino:" ganha o espaço (recortar e colar inteligente)
  await js('e.undo(); e.setSelection({ para: 1, offset: 6 }, { para: 1, offset: 13 }); await e.copy(); e.setSelection({ para: 2, offset: 8 }); await e.paste("keep");');
  check('colar: palavra colada depois de "Destino:" ganha o espaço entre as palavras', (await ev('text', 2)) === 'Destino: negrito', await ev('text', 2));
  // HTML de outro programa: o padrão usa Título 1, Normal (Web), listas e Hyperlink (html-0)
  const HTML = '<h1>Titulo HTML</h1><p>Um <b>negrito</b> <i>italico</i> <u>sublinhado</u> <span style="color:#c00000;font-family:Georgia;font-size:14pt">vermelho</span> <a href="https://example.com/">link</a></p><ul><li>item A</li><li>item B</li></ul><ol><li>um</li><li>dois</li></ol><p style="text-align:center">centro</p>';
  await ev('blank');
  await js(`e.pasteData({ text: "Titulo HTML", html: ${JSON.stringify(HTML)} });`);
  x = await doc(); ps = paraXml(x);
  const sx4 = (await parts('word/styles.xml'))['word/styles.xml'] ?? '';
  await saveDoc('home-paste-html');
  check('colar HTML (padrão): h1 → Título 1, p → Normal (Web), link com o estilo Hyperlink',
    /<w:pStyle w:val="Ttulo1"\/>[\s\S]*<w:t>Titulo HTML/.test(ps[0]) && /<w:pStyle w:val="NormalWeb"\/>/.test(ps[1]) && /<w:rStyle w:val="Hyperlink"\/>/.test(x) && /w:styleId="NormalWeb"/.test(sx4), ps.slice(0, 2));
  check('colar HTML (padrão): span com cor/fonte/tamanho vira formatação direta; centro = w:jc',
    /Georgia[^>]*\/><w:color w:val="C00000"\/><w:sz w:val="28"\/>[\s\S]*?<w:t>vermelho/.test(x) && /<w:pStyle w:val="NormalWeb"\/><w:jc w:val="center"\/><\/w:pPr><w:r><w:t>centro/.test(x), null);
  nx = await numx();
  check('colar HTML: ul e ol viram duas listas de vários níveis (tabulação no número, como o Word)',
    (x.match(/<w:numId w:val="1"\/>/g) ?? []).length === 2 && (x.match(/<w:numId w:val="2"\/>/g) ?? []).length === 2 && /<w:multiLevelType w:val="multilevel"\/>[\s\S]*?<w:tabs><w:tab w:val="num" w:pos="720"\/><\/w:tabs><w:ind w:left="720" w:hanging="360"\/>/.test(nx), null);
  await js('e.repaste("keep");');
  x = await doc(); ps = paraXml(x);
  check('colar HTML (Manter): Times New Roman 12, h1 24 pt negrito com nível de tópico, espaçamento automático',
    /<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"\/>/.test(ps[0]) && /<w:outlineLvl w:val="0"\/>/.test(ps[0])
      && /Times New Roman[^>]*\/><w:b\/>(?:(?!<\/w:rPr>)[\s\S])*<w:sz w:val="48"\/>[\s\S]*?<w:t>Titulo HTML/.test(ps[0]), ps[0]);
  await js('e.repaste("merge");');
  x = await doc(); ps = paraXml(x);
  check('colar HTML (Mesclar): sem estilos nem fontes; h1 só negrito; listas ficam', !/pStyle|Times|Georgia/.test(ps.slice(0, 3).join('')) && /<w:b\/><\/w:rPr><w:t>Titulo HTML/.test(ps[0]) && /<w:numPr>/.test(x), ps.slice(0, 2));
  // listas: colar itens depois de texto = Nova Lista (cópia do abstractNum); Continuar Lista junta
  await ev('blank');
  await js('e.type("Um"); e.pressEnter(); e.type("Dois"); e.pressEnter(); e.type("Texto"); e.pressEnter(); e.setSelection({ para: 0, offset: 0 }, { para: 1, offset: 4 }); e.applyListLibrary("number", 0);');
  await js('e.setSelection({ para: 0, offset: 0 }, { para: 2, offset: 0 }); await e.copy(); e.setSelection({ para: 3, offset: 0 }); await e.paste("keep");');
  x = await doc(); nx = await numx();
  check('colar lista depois de texto: Nova Lista (w:num 2, abstractNum copiado com tplc FFFFFFFF) — "1." de novo',
    pPrOf(x.split('<w:t>Texto</w:t>')[1] ?? '', 'Um') === item(2) && /<w:abstractNum w:abstractNumId="1"[^>]*>[\s\S]*?<w:lvl w:ilvl="0" w:tplc="FFFFFFFF">/.test(nx) && (await items('i.t === "glyphs" && i.text.startsWith("1.")')) === 2, pPrOf(x.split('<w:t>Texto</w:t>')[1] ?? '', 'Um'));
  check('colar lista: as opções são Continuar Lista e Nova Lista', JSON.stringify((await js('return e.pasteOptions();')).list) === '["continue","new"]', null);
  await js('e.repaste("keep", "continue");');
  x = await doc();
  check('colar lista: Continuar Lista junta à anterior ("3.", "4.")', pPrOf(x.split('<w:t>Texto</w:t>')[1] ?? '', 'Um') === item(1) && (await items('i.t === "glyphs" && (i.text.startsWith("3.") || i.text.startsWith("4."))')) === 2, null);
  await js('e.repaste("text");');
  x = await doc();
  check('colar lista como texto: o número vira texto + tabulação ("1.\\tUm")', /<w:t>1\.<\/w:t>[\s\S]{0,80}<w:tab\/><w:t>Um<\/w:t>|<w:t xml:space="preserve">1\.<\/w:t><w:tab\/><w:t>Um|1\.<\/w:t><\/w:r><w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:tab\/>/.test(x), (x.split('<w:t>Texto</w:t>')[1] ?? '').slice(0, 300));
  // como imagem: o motor desenha o trecho num PNG em linha
  await js('e.undo(); e.setSelection({ para: 3, offset: 0 }); e.repaste?.("picture"); await e.paste("picture"); await new Promise((r) => setTimeout(r, 300));');
  x = await doc();
  check('colar como Imagem: PNG em linha (w:drawing wp:inline)', /<wp:inline\b[\s\S]*?<pic:pic\b/.test(x), null);
  // Área de Transferência do Office e Colar Vínculo
  check('área de transferência: os itens copiados ficam no painel', (await js('return e.clipboardItems().length;')) >= 3, await js('return e.clipboardItems().map((i) => i.text);'));
  await js('e.documentPath = "C:\\\\Docs\\\\origem.docx"; e.setSelection({ para: 2, offset: 0 }, { para: 2, offset: 5 }); await e.copy(); e.setSelection({ para: 3, offset: 0 }); await e.pasteSpecialFormats(); await e.pasteSpecial("rtf", { link: true });');
  x = await doc();
  check('Colar Vínculo: campo LINK Word.Document.12 com o caminho e o indicador OLE_LINK1 na origem',
    /<w:instrText xml:space="preserve"> LINK Word\.Document\.12 "C:\\\\Docs\\\\origem\.docx" "OLE_LINK1" \\a \\r <\/w:instrText>/.test(x) && /<w:bookmarkStart w:id="\d+" w:name="OLE_LINK1"\/>/.test(x), (x.match(/<w:instrText[^>]*>[^<]*/) ?? [])[0]);
  await saveDoc('home-paste');
}

if (want('page')) {
  // --save-page <pasta>: grava os .docx intermediários (conferência no Word: write/tools/page-lab/open-check.ps1)
  const saveDir = opt('save-page');
  const saveDoc = async (name) => { if (!saveDir) return; mkdirSync(saveDir, { recursive: true }); writeFileSync(join(saveDir, `${name}.docx`), Buffer.from(await ev('saveBase64'), 'base64')); };
  const E = 'document.querySelector("universal-write")';
  const js = (body) => page.evaluate(`(async () => { const e = ${E}; ${body} })()`);
  const parts = (names) => page.evaluate((n) => window.ed.savedParts(n), names);
  await ev('blank');
  await js('e.type("Primeiro paragrafo"); e.pressEnter(); e.type("Segundo paragrafo"); e.pressEnter(); e.type("Terceiro");');

  // Cor da Página sólida: w:background + displayBackgroundShape; a tela pinta a cor
  await js('e.setPageColor("FFFF00");');
  let x = await parts(['word/document.xml', 'word/settings.xml']);
  check('page: Cor da Página grava <w:background w:color="FFFF00"/> e liga displayBackgroundShape',
    /<w:document\b[^>]*><w:background w:color="FFFF00"\/><w:body>/.test(x['word/document.xml']) && /<w:displayBackgroundShape\/>/.test(x['word/settings.xml']), null);
  let px = await ev('pixel', 0, 300, 300);
  check('page: a página aparece amarela na tela', px[0] > 240 && px[1] > 240 && px[2] < 30, px);
  await js('e.undo();');
  x = await parts(['word/document.xml']);
  px = await ev('pixel', 0, 300, 300);
  check('page: desfazer tira a cor (XML e tela)', !/<w:background/.test(x['word/document.xml']) && px[2] > 240, px);
  // cor do tema com tom (paleta): accent2 mais claro 80% (oráculo pc-theme-5-0.8: FAE2D5 / 33)
  await js('e.setPageColor({ themeColor: "accent2", tint: 0.8 });');
  x = await parts(['word/document.xml']);
  // o hex é cosmético (o Word recalcula pelo tema ao desenhar): ±1 por canal do medido (FAE2D5)
  const tbg = /<w:background w:color="([0-9A-F]{6})" w:themeColor="accent2" w:themeTint="33"\/>/.exec(x['word/document.xml']);
  check('page: cor do tema grava themeColor/themeTint e o hex do tom (accent2 +80% ≈ FAE2D5)',
    !!tbg && [0, 2, 4].every((i) => Math.abs(parseInt(tbg[1].slice(i, i + 2), 16) - parseInt('FAE2D5'.slice(i, i + 2), 16)) <= 1), tbg?.[0]);
  // gradiente de duas cores (Horizontal, variante 1) e padrão
  await js('e.setPageFill({ type: "gradient", colors: "two", color: "FF0000", color2: "0000FF", style: "horizontal", variant: 1 });');
  x = await parts(['word/document.xml']);
  check('page: gradiente grava v:background/v:fill como o Word', /<v:background id="_x0000_s1025" o:bwmode="white" fillcolor="red" o:targetscreensize="1024,768"><v:fill color2="#0000ff" focus="100%" type="gradient"\/><\/v:background>/.test(x['word/document.xml']), null);
  const bg = await js('const p = e.eng.result.pages[0]; return { t: p.backgroundFill?.type, show: p.backgroundShow };');
  check('page: o motor recebe o efeito e a tela o mostra', bg.t === 'gradient' && bg.show === true, bg);
  px = await ev('pixel', 0, 30, 30);
  check('page: o ladrilho começa vermelho no topo da página', px[0] > 200 && px[2] < 60, px);
  await saveDoc('pg-gradient');
  await js('e.setPageFill({ type: "pattern", pattern: "openDmnd", color: "C80000", background: "FFFFC8" });');
  await saveDoc('pg-pattern');
  x = await parts(['word/document.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml']);
  const rid = /<v:fill r:id="(rId\d+)" o:title="[^"]*" color2="#ffffc8" type="pattern"\/>/.exec(x['word/document.xml'])?.[1];
  check('page: padrão grava o GIF com relação e tipo de conteúdo', !!rid && new RegExp(`Id="${rid}"[^>]*Target="media/image\\d+\\.gif"`).test(x['word/_rels/document.xml.rels']) && /Extension="gif"/.test(x['[Content_Types].xml']), rid);
  await js('e.setPageColor(null);');
  x = await parts(['word/document.xml']);
  check('page: Sem Cor tira o w:background', !/<w:background/.test(x['word/document.xml']), null);

  // marca-d'água da galeria: nos 3 cabeçalhos da seção
  await js('e.setWatermark("confidential1");');
  await saveDoc('wm-gallery');
  x = await parts(['word/document.xml']);
  const refs = [...x['word/document.xml'].matchAll(/<w:headerReference w:type="(\w+)" r:id="(rId\d+)"\/>/g)].map((m) => m[1]).sort();
  check('page: marca-d\'água cria os 3 cabeçalhos da seção (even/default/first)', refs.join(',') === 'default,even,first', refs);
  const rels = (await parts(['word/_rels/document.xml.rels']))['word/_rels/document.xml.rels'];
  const hdrs = [...rels.matchAll(/Target="(header\d+\.xml)"/g)].map((m) => `word/${m[1]}`);
  const hx = await parts(hdrs);
  check('page: cada cabeçalho tem a PowerPlusWaterMarkObject no 1º run (VML do diálogo, girada, prateada, 50%)',
    hdrs.length === 3 && hdrs.every((h) => /<w:p\b[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?<w:r><w:rPr><w:noProof\/><\/w:rPr><w:pict w14:anchorId="[0-9A-F]{8}"><v:shapetype id="_x0000_t136"[\s\S]*?<v:shape id="PowerPlusWaterMarkObject\d+" o:spid="_x0000_s\d+" type="#_x0000_t136" alt="" style="position:absolute;margin-left:0;margin-top:0;width:527\.85pt;height:131\.95pt;rotation:315;/.test(hx[h]) && /fillcolor="silver" stroked="f"><v:fill opacity="\.5"\/>/.test(hx[h])), null);
  let wm = await js('return e.watermark();');
  check('page: watermark() lê a marca atual', wm?.kind === 'text' && wm.layout === 'diagonal' && wm.semitransparent && /CONFIDEN/.test(wm.text), wm);
  const items = await js('return e.eng.result.pages[0].items.filter((i) => i.t === "glyphs" && i.asPath && i.alpha !== undefined).length;');
  check('page: o motor desenha a marca (curvas com alfa real)', items > 0, items);
  // a galeria grava font-family "calibri" (minúsculas): o nome não diferencia maiúsculas,
  // então a face é a da Calibri (ou a Carlito), não a substituta de família ausente (Cambria)
  let wmFace = null;
  for (let i = 0; i < 25 && !/calibri|carlito/i.test(wmFace ?? ''); i++) {
    wmFace = await js('const g = e.eng.result.pages[0].items.find((i) => i.t === "glyphs" && i.asPath && i.alpha !== undefined); return g ? g.face.key : null;');
    if (!/calibri|carlito/i.test(wmFace ?? '')) await page.waitForTimeout(200);
  }
  check('page: marca da galeria ("calibri") usa a Calibri/Carlito', /calibri|carlito/i.test(wmFace ?? ''), wmFace);
  // personalizada: texto 72 pt horizontal opaco, vermelho
  await js('e.setWatermark({ kind: "text", text: "RASCUNHO", font: "Carlito", sizePt: 72, color: "C00000", semitransparent: false, layout: "horizontal" });');
  const hx2 = await parts(hdrs);
  const one = hx2[hdrs[0]];
  check('page: personalizada troca a marca (uma só, 72 pt, sem giro, opaca, vermelha)',
    (one.match(/PowerPlusWaterMarkObject/g) ?? []).length === 1 && /font-size:72pt/.test(one) && !/rotation:/.test(one) && !/opacity=/.test(one) && /fillcolor="#c00000"/.test(one), null);
  // imagem desbotada
  const png = (await import(new URL('../image-lab/test-image.mjs', import.meta.url).href)).patternPng();
  await page.evaluate(({ b64 }) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); document.querySelector('universal-write').setWatermark({ kind: 'picture', data: u, ext: 'png', title: 'logo', washout: true }); }, { b64: Buffer.from(png).toString('base64') });
  const hx3 = await parts([...hdrs, ...hdrs.map((h) => h.replace('word/', 'word/_rels/') + '.rels')]);
  const prid = /<v:imagedata r:id="(rId\d+)" o:title="logo" gain="19661f" blacklevel="22938f"\/>/.exec(hx3[hdrs[0]])?.[1];
  check('page: marca de imagem desbotada (WordPictureWatermark com gain/blacklevel e a relação na parte)',
    /WordPictureWatermark\d+/.test(hx3[hdrs[0]]) && !!prid && new RegExp(`Id="${prid}"[^>]*Target="media/image\\d+\\.png"`).test(hx3[hdrs[0].replace('word/', 'word/_rels/') + '.rels']), prid);
  await saveDoc('wm-picture');
  await js('e.removeWatermark();');
  const hx4 = await parts(hdrs);
  check('page: Remover Marca-d\'Água tira de todos os cabeçalhos', hdrs.every((h) => !/WaterMark|Watermark/.test(hx4[h] ?? '')), null);
  await js('e.undo();');
  wm = await js('return e.watermark();');
  check('page: desfazer devolve a marca (um passo)', wm?.kind === 'picture', wm?.kind);

  // folha de rosto
  await js('e.insertCoverPage("band");');
  await saveDoc('cover-band');
  x = await parts(['word/document.xml']);
  const d = x['word/document.xml'];
  check('page: folha de rosto no INÍCIO do corpo, num sdt "Cover Pages" com a quebra de página dentro, e titlePg',
    /<w:body><w:sdt><w:sdtPr><w:id w:val="\d+"\/><w:docPartObj><w:docPartGallery w:val="Cover Pages"\/><w:docPartUnique\/><\/w:docPartObj><\/w:sdtPr><w:sdtContent>[\s\S]*<w:br w:type="page"\/><\/w:r><\/w:p><\/w:sdtContent><\/w:sdt>/.test(d) && /<w:titlePg\/>/.test(d), d.slice(d.indexOf('<w:body>'), d.indexOf('<w:body>') + 300));
  let st0 = await st();
  check('page: o título (espaço reservado) fica selecionado', st0.sel.anchor.offset === 0 && st0.sel.focus.offset > 5, st0.sel);
  const pg1 = await js('const p = e.eng.result.pages[0]; return { shapes: p.items.filter((i) => i.t === "shape").length, pages: e.eng.result.pages.length };');
  check('page: a capa ocupa a 1ª página com as formas do modelo', pg1.shapes >= 1 && pg1.pages >= 2, pg1);
  await js('e.insertCoverPage("minimal");');
  x = await parts(['word/document.xml']);
  check('page: outra folha de rosto troca a atual (um só sdt)', (x['word/document.xml'].match(/Cover Pages/g) ?? []).length === 1, null);
  check('page: removeCoverPage tira o sdt', (await js('return e.removeCoverPage();')) === true && !/Cover Pages/.test((await parts(['word/document.xml']))['word/document.xml']), null);
  await js('e.undo();');
  check('page: desfazer devolve a folha de rosto', await js('return e.hasCoverPage();'), null);
  await js('e.removeCoverPage();');

  // página em branco no meio do parágrafo: [quebra, ¶ vazio (cursor), quebra]
  const pBefore = await js('return e.eng.result.pages.length;');
  const idx = (await ev('paras')).findIndex((p) => p.text === 'Segundo paragrafo');
  await ev('select', idx, 6);
  await js('e.insertBlankPage();');
  await saveDoc('blank-page');
  const ps = (await ev('paras')).map((p) => p.text);
  st0 = await st();
  check('page: Página em Branco divide o ¶ e põe quebra, ¶ vazio e quebra (cursor no vazio)',
    ps[idx] === 'Segund' && ps[idx + 1] === '\f' && ps[idx + 2] === '' && ps[idx + 3] === '\f' && ps[idx + 4] === 'o paragrafo' && st0.sel.focus.para === idx + 2, { ps, sel: st0.sel.focus });
  check('page: +2 páginas', (await js('return e.eng.result.pages.length;')) === pBefore + 2, null);
  await js('e.undo();');
  check('page: desfazer em um passo', (await ev('paras')).some((p) => p.text === 'Segundo paragrafo'), null);

  // conferência no Word: cada modelo de folha de rosto, textura, imagem e marca de texto 72 pt
  if (saveDir) {
    const covers = await js('return e.coverPages().map((c) => c.id);');
    for (const id of covers) {
      await ev('blank');
      await js(`e.type("Corpo do documento"); e.setWatermark("draft2"); e.insertCoverPage("${id}");`);
      await saveDoc(`cover-${id}`);
    }
    const b64 = Buffer.from(png).toString('base64');
    for (const kind of ['picture', 'texture']) {
      await ev('blank');
      await page.evaluate(({ b64, kind }) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const e = document.querySelector('universal-write'); e.type('Corpo'); e.setPageFill({ type: kind, data: u, ext: 'png', name: 'padrao.png' }); }, { b64, kind });
      await saveDoc(`pg-${kind}`);
    }
    await ev('blank');
    await js('e.type("Corpo"); e.setWatermark({ kind: "text", text: "URGENTE", font: "Arial", sizePt: 72, color: "C00000", semitransparent: true, layout: "diagonal" }); e.setPageFill({ type: "gradient", colors: "one", color: "1F4E79", degree: 0.75, style: "fromCorner", variant: 4 });');
    await saveDoc('wm-text72');
  }
}

if (want('textlayout')) {
  // ───────────── layout do texto: hifenização, números de linha, quebras do parágrafo, Recuar/Espaçamento ─────────────
  // (regras do Word em write/tools/textlayout-lab)
  await ev('open', '/write/samples/Catalogo-Recursos-Word.docx');
  const E = (fn, arg) => page.evaluate(fn, arg);
  const doc = () => ev('savedPart', 'word/document.xml');
  const set = () => ev('savedPart', 'word/settings.xml');
  const paraIdx = (start) => E((s) => document.querySelector('universal-write').model.paragraphs.findIndex((p) => p.runs.map((r) => r.text).join('').startsWith(s)), start);
  const paraXml = async (start) => { const d = await doc(); const i = d.indexOf(start); const ps = Math.max(d.lastIndexOf('<w:p ', i), d.lastIndexOf('<w:p>', i)); return d.slice(ps, i); };
  // hifenização do documento (settings.xml): Automática, opções e desfazer
  await call('setHyphenation', 'auto');
  let s = await set();
  check('Hifenização › Automático grava <w:autoHyphenation/>', (await call('getHyphenation')).auto && /<w:autoHyphenation\/>/.test(s), s.match(/<w:(autoHyphenation|hyphenationZone)[^>]*>/g));
  await sleep(1500); // padrões carregados → relayout com hífens
  const hyphLines = await E(() => document.querySelector('universal-write').eng.result.pages.reduce((n, p) => n + p.lines.filter((l) => l.hyph !== undefined).length, 0));
  await call('setHyphenationOptions', { caps: false, limit: 2, zoneTwips: 567 });
  s = await set();
  check('Opções de Hifenização: limite, zona e MAIÚSCULAS na ordem do schema', /<w:autoHyphenation\/><w:consecutiveHyphenLimit w:val="2"\/><w:hyphenationZone w:val="567"\/><w:doNotHyphenateCaps\/>/.test(s), s.match(/<w:(auto|consec|hyphenationZone|doNotHyph)[^>]*>/g));
  await call('undo'); await call('undo');
  s = await set();
  check('desfazer as duas mudanças (Nenhuma = sem o elemento; a zona volta à do arquivo)', !(await call('getHyphenation')).auto && !/autoHyphenation/.test(s) && !/consecutiveHyphenLimit/.test(s) && !/w:val="567"/.test(s), s.match(/<w:hyphenationZone[^>]*>/g));
  check('hifenização automática desenha linhas com hífen (motor)', hyphLines > 0, hyphLines);
  // Hifenização Manual: a palavra proposta, Sim grava o hífen opcional (w:softHyphen), Não pula
  const m1 = await call('nextManualHyphenation');
  check('Hifenização Manual propõe uma palavra com pontos e o limite da linha', !!m1 && m1.points.includes(m1.suggested) && m1.suggested <= m1.limit && m1.word.length > 3, m1);
  const before = (await st()).sel;
  await call('applyManualHyphenation', m1.suggested);
  const soft = await E((p) => document.querySelector('universal-write').model.paragraphs[p].runs.map((r) => r.text).join('').includes('\u00AD'), before.focus.para);
  const m2 = await call('nextManualHyphenation');
  check('Sim insere o hífen opcional e segue para a próxima palavra', soft && (!m2 || m2.word !== m1.word || true), { soft, next: m2?.word });
  if (m2) await call('skipManualHyphenation');
  await call('endManualHyphenation');
  const dSoft = await doc();
  check('o hífen opcional sai como <w:softHyphen/>', /<w:softHyphen\/>/.test(dSoft));
  await call('undo');
  const soft2 = await E((p) => document.querySelector('universal-write').model.paragraphs[p].runs.map((r) => r.text).join('').includes('\u00AD'), before.focus.para);
  check('desfazer tira o hífen opcional (um passo por Sim)', !soft2);
  // números de linha: menu, estilo, desenho, diálogo, desligar e desfazer
  const p0 = await paraIdx('Demonstracao abrangente');
  await ev('select', Math.max(0, p0), 0);
  await call('setLineNumbering', 'continuous');
  let d = await doc();
  let lnDrawn = await E(() => document.querySelector('universal-write').eng.result.pages.reduce((n, p) => n + p.items.filter((it) => it.lineNum).length, 0));
  const sty = await ev('savedPart', 'word/styles.xml');
  check('Números de Linha › Contínuo: <w:lnNumType w:countBy="1" w:restart="continuous"/>', /<w:lnNumType w:countBy="1" w:restart="continuous"\/>/.test(d), d.match(/<w:lnNumType[^>]*>/g));
  check('o estilo "Número de linha" entra no styles.xml (como o Word)', /w:styleId="Nmerodelinha"[\s\S]*?<w:name w:val="line number"\/>/.test(sty));
  check('os números são desenhados pelo motor', lnDrawn > 20, lnDrawn);
  check('getLineNumbering', (await call('getLineNumbering')).mode === 'continuous');
  await call('setLineNumbering', 'page');
  d = await doc();
  check('Reiniciar Cada Página = sem w:restart', /<w:lnNumType w:countBy="1"\/>/.test(d), d.match(/<w:lnNumType[^>]*>/g));
  await call('setPageSetup', { lineNumbering: { on: true, startAt: 3, countBy: 5, distanceTwips: 567, restart: 'section' } });
  d = await doc();
  check('diálogo Números de Linha: countBy, start (−1), distance, restart nessa ordem', /<w:lnNumType w:countBy="5" w:start="2" w:distance="567" w:restart="newSection"\/>/.test(d), d.match(/<w:lnNumType[^>]*>/g));
  await call('setLineNumbering', 'none');
  d = await doc();
  check('Nenhum tira o elemento', !/lnNumType/.test(d));
  await call('setLineNumbering', 'continuous');
  d = await doc();
  check('ligar de novo lembra início e distância; contar por volta a 1 (como o Word)', /<w:lnNumType w:countBy="1" w:start="2" w:distance="567" w:restart="continuous"\/>/.test(d), d.match(/<w:lnNumType[^>]*>/g));
  for (let k = 0; k < 5; k++) await call('undo');
  d = await doc();
  check('desfazer volta sem numeração (o estilo fica, como no Word)', !/lnNumType/.test(d) && /Nmerodelinha/.test(await ev('savedPart', 'word/styles.xml')));
  // Suprimir no Parágrafo Atual (alterna) — também com a numeração desligada
  await call('toggleLineNumberSuppression');
  let px = await paraXml('Demonstracao abrangente');
  check('Suprimir no Parágrafo Atual grava <w:suppressLineNumbers/>', /<w:suppressLineNumbers\/>/.test(px) && await call('lineNumbersSuppressed'), px.slice(0, 200));
  await call('toggleLineNumberSuppression');
  px = await paraXml('Demonstracao abrangente');
  check('de novo tira', !/suppressLineNumbers/.test(px));
  // Quebras de linha e de página: herdado × direto
  const h1 = await paraIdx('1. Formatacao de Caracteres');
  await ev('select', h1, 0);
  const f0 = await call('getParagraphFlow');
  check('Quebras de linha e de página: valores efetivos (órfãs/viúvas ligado sem elemento)', f0 && f0.widowControl === true && typeof f0.keepNext === 'boolean', f0);
  await call('setParagraphFlow', { keepNext: !f0.keepNext, widowControl: false, suppressAutoHyphens: true });
  px = await paraXml('1. Formatacao de Caracteres');
  const kn = f0.keepNext ? '<w:keepNext w:val="0"/>' : '<w:keepNext/>';
  check('flags diretas na ordem do schema (órfãs/viúvas desligado = w:val="0")', px.includes(`${kn}<w:widowControl w:val="0"/>`) && /<w:suppressAutoHyphens\/>/.test(px), px.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0]);
  await call('setParagraphFlow', { keepNext: f0.keepNext, widowControl: true });
  px = await paraXml('1. Formatacao de Caracteres');
  check('voltar ao herdado tira os elementos', !/keepNext|widowControl/.test(px) && /<w:suppressAutoHyphens\/>/.test(px));
  await call('undo'); await call('undo');
  // Recuar/Espaçamento (caixas numéricas): igual ao herdado não grava, Automático
  const pb = await paraIdx('Negrito');
  await ev('select', pb, 0);
  const lay0 = await call('getParagraphLayout');
  await call('setParagraphLayout', { left: 567, before: 'auto' });
  px = await paraXml('Negrito');
  check('caixas: recuo esquerdo e espaçamento antes Automático', /<w:spacing[^>]*w:beforeAutospacing="1"/.test(px) && /<w:ind w:left="567"/.test(px), px.match(/<w:(spacing|ind)[^>]*>/g));
  check('getParagraphLayout com Automático', (await call('getParagraphLayout')).before === 'auto');
  await call('setParagraphLayout', { left: lay0.left, before: lay0.before });
  px = await paraXml('Negrito');
  check('voltar ao herdado tira o w:ind e o Automático', !/<w:ind /.test(px) && !/beforeAutospacing/.test(px), px.match(/<w:(spacing|ind)[^>]*>/g));
  // Configurar Página › Layout: alinhamento vertical e início da seção
  // (só nos w:sectPr — as células de tabela também têm w:vAlign)
  const sectVAlign = async () => (await doc()).match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)?.map((x) => x.match(/<w:vAlign[^>]*>/)?.[0] ?? '').join('|');
  await call('setVerticalAlignment', 'center');
  let va = await sectVAlign();
  check('alinhamento vertical centralizado → <w:vAlign w:val="center"/> no w:sectPr', /<w:vAlign w:val="center"\/>/.test(va ?? ''), va);
  await call('undo');
  va = await sectVAlign();
  check('desfazer o alinhamento vertical', !/vAlign/.test(va ?? '') && (await call('getSection')).verticalAlignment === 'top', va);
  // hífen opcional pelo atalho (Ctrl+-)
  const pc = await paraIdx('Negrito');
  const pt = await ev('clientAt', pc, 3);
  await page.mouse.click(pt.x, pt.y);
  await ev('select', pc, 3);
  const t0 = await ev('text', pc);
  await page.keyboard.press('Control+Minus');
  const t1 = await ev('text', pc);
  check('Ctrl+- insere o hífen opcional', t1 === t0.slice(0, 3) + '\u00AD' + t0.slice(3), { t1: t1.slice(0, 12) });
  await call('undo');
}

if (want('perf')) {
await perfDoc('sintético 20 pág.', () => ev('synthetic', 220, 60));
await perfDoc('demo.docx', () => ev('open', '/write/samples/demo.docx'));
}
if (flag('perf')) {
  for (const f of ['Catalogo-Recursos-Word.docx', '15-MB-docx-file-download.docx']) {
    await perfDoc(f, () => ev('open', `/write/samples/${f}`));
  }
  if (opt('doc-id')) await perfDoc(`corpus ${opt('doc-id')}`, () => ev('open', '/__file/doc'));
  const extra = opt('perf-file');
  if (extra) {
    extraFiles.set('x', resolve(extra));
    await perfDoc('arquivo externo', () => ev('open', '/__file/x'));
  }
}

if (errors.length) console.log('erros da página:', [...new Set(errors)].slice(0, 10));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK${failed.length ? ' — falhas: ' + failed.map((f) => f.name).join('; ') : ''}`);
console.log('desempenho:', JSON.stringify(perf));
await browser.close();
server.closeAllConnections?.();
server.close();
process.exit(failed.length ? 1 : 0);
