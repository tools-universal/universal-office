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

const groups = (opt('only', 'body,table,fields,hf,fuzz,sections,perf')).split(',');
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
