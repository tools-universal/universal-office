// Smoke do app EMPACOTADO da suíte (dist/win-unpacked, dist/linux-unpacked,
// um AppImage extraído, um .deb extraído…): roda o executável com um .docx na
// linha de comando, conecta pelo DevTools Protocol (--remote-debugging-port) e,
// com o app aberto, entrega um .xlsx e um .pptx como 2ª instância (como o duplo
// clique com o app aberto): cada um tem de abrir na janela do SEU editor, no
// mesmo processo. Em cada janela confere que o arquivo chegou e abriu com os
// assets de resources, que as fontes abertas (embarcadas uma vez só) respondem,
// a barra do componente (título acima dos menus, menu Arquivo, barra de status;
// com os controles do SO sobrepostos, a área de arrasto e as ações da direita
// fora da área deles) e — no Write — a revisão ortográfica pt-BR e en-US
// offline. Grava um PNG de cada janela (Page.captureScreenshot).
//
// Depois, com os três abertos, --editor=sheet como 2ª instância (o atalho do
// Sheet): as boas-vindas do Sheet (ícone, nome, "Nova planilha", os recentes
// DELE — a planilha aberta acima —, idiomas, licenças) e a troca de idioma
// para es nelas, que chega na hora às boas-vindas e ao `lang` dos três editores
// (menu Idioma presente nos três). Com --es, também a interface dos editores
// em espanhol (menu Archivo), a revisão ortográfica es no Write e, no Write,
// o `spellcheck-default-lang="es-ES"` e um documento NOVO (--editor=write
// --new-window, o "Nuevo documento") que nasce em es: o texto digitado nele é
// revisado com o dicionário es (nextMisspelling).
//
// Uso (Node 22+, que tem WebSocket global):
//   node smoke-packaged.mjs [--app write|sheet|slides] [--exe <executável>]
//        [--out <pasta>] [--extra "<args do app>"] [--es] [--keep]
// Sem --app: os três (Write por argv, Sheet e Slides por 2ª instância); com
// --app, só aquele editor, por argv.
// (--extra "--no-sandbox": Linux sem o chrome-sandbox setuid, como num AppImage
// ou .deb só extraído, ou com userns restrito pelo AppArmor do Ubuntu 24.04)
// Sem --exe usa o dist/<plataforma>-unpacked. O perfil fica numa pasta
// temporária (--user-data-dir); o processo iniciado aqui é encerrado no fim.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(appDir, '..');
const EDITORS = {
  write: {
    demo: 'editor', bridge: 'wordnext', status: '.uw-status-bar',
    file: join(repo, 'write', 'packages', 'docx-core', 'test', 'fixtures', 'doc', 'estilos.word.docx'),
    fonts: ['carlito-regular.ttf', 'caladea-regular.ttf', 'liberationsans-regular.ttf', 'liberationserif-regular.ttf', 'poppins-400.woff2'],
  },
  sheet: {
    demo: 'sheet', bridge: 'universalSheet', status: '.us-bottombar',
    file: join(repo, 'sheet', 'samples', 'showcase.xlsx'),
    // aptos-narrow: proprietária, fora do pacote → fonte do SO ou Liberation Sans (servidor do shell)
    fonts: ['carlito-regular.ttf', 'liberationsans-regular.ttf', 'poppins-400.woff2', 'aptos-narrow-regular.ttf'],
  },
  slides: {
    demo: 'slides', bridge: 'universalSlides', status: '.us-bottom',
    file: join(repo, 'slides', 'samples', 'reference.pptx'),
    fonts: ['carlito-regular.ttf', 'liberationsans-regular.ttf', 'os/amatic-sc-regular.ttf', 'aptos-regular.ttf'],
  },
};
const only = opt('app', null);
if (only && !EDITORS[only]) throw new Error(`--app deve ser ${Object.keys(EDITORS).join('|')}`);
const kinds = only ? [only] : ['write', 'sheet', 'slides'];

function defaultExe() {
  const dist = join(appDir, 'dist');
  if (process.platform === 'win32') return join(dist, 'win-unpacked', 'Universal Office.exe');
  if (process.platform === 'darwin') {
    const mac = readdirSync(dist).find((d) => d.startsWith('mac')) ?? 'mac';
    return join(dist, mac, 'Universal Office.app', 'Contents', 'MacOS', 'Universal Office');
  }
  return join(dist, 'linux-unpacked', 'universal-office');
}
const exe = opt('exe', defaultExe());
const out = opt('out', join(appDir, 'dist', 'smoke'));
if (!existsSync(exe)) throw new Error(`executável não encontrado: ${exe} (rode "npm run dist" antes)`);
mkdirSync(out, { recursive: true });

const T = mkdtempSync(join(tmpdir(), 'uo-smoke-suite-'));
const samples = Object.fromEntries(kinds.map((k) => {
  const p = join(T, basename(EDITORS[k].file));
  copyFileSync(EDITORS[k].file, p);
  return [k, p];
}));
const stem = (k) => basename(samples[k], extname(samples[k]));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = join(T, 'profile');
const extra = opt('extra', '').split(' ').filter(Boolean);

const PROBES = {
  write: `(async () => {
    const wn = document.getElementById('wn');
    await until('documento aberto', () => document.title.includes(STEM));
    const engine = await until('motor de revisão ortográfica', () => wn.spellEngine);
    const pt = (await engine.checkText('Isto é um testee com palavrass erradas', 'pt-BR')).map((e) => e.word);
    const en = (await engine.checkText('This sentense has a mispelled word', 'en-US')).map((e) => e.word);
    return { title: document.title, bridges: bridges(), fonts: await fonts(), chrome: await chrome(), spell: { 'pt-BR': pt, 'en-US': en } };
  })()`,
  sheet: `(async () => {
    const us = document.getElementById('us');
    await until('planilha aberta', () => document.title.includes(STEM) && us.getSheetNames().length > 0);
    return { title: document.title, bridges: bridges(), sheets: us.getSheetNames(), fonts: await fonts(), chrome: await chrome() };
  })()`,
  slides: `(async () => {
    const us = document.getElementById('us');
    await until('apresentação aberta', () => document.title.includes(STEM) && us.getSlideCount() > 0);
    return { title: document.title, bridges: bridges(), slides: us.getSlideCount(), fonts: await fonts(), chrome: await chrome() };
  })()`,
};
const prelude = (kind) => `
  const STEM = ${JSON.stringify(stem(kind))};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(what, f, ms = 90000) {
    const t0 = Date.now();
    for (;;) {
      let v; try { v = await f(); } catch { /* ainda não */ }
      if (v) return v;
      if (Date.now() - t0 > ms) throw new Error('timeout: ' + what);
      await sleep(250);
    }
  }
  const bridges = () => ['wordnext', 'universalSheet', 'universalSlides', 'universalOffice'].filter((k) => k in window);
  async function fonts() {
    const r = {};
    for (const f of ${JSON.stringify(EDITORS[kind].fonts)}) {
      const res = await fetch('fonts/' + f);
      const b = new Uint8Array(await res.arrayBuffer());
      const sig = String.fromCharCode(...b.slice(0, 4));
      r[f] = res.ok ? (sig === 'wOF2' ? 'woff2' : (sig === '\\0\\x01\\0\\0' || sig === 'true' || sig === 'OTTO') ? 'sfnt ' + b.length + ' B' : 'bytes? ' + sig) : 'HTTP ' + res.status;
    }
    return r;
  }
  // barra do componente (shadow roots inclusos): geometria da linha de título,
  // dos menus, das ações à direita, da barra de status e da área dos controles do SO
  async function chrome() {
    const all = () => {
      const out = [], roots = [document];
      while (roots.length) for (const e of roots.pop().querySelectorAll('*')) { out.push(e); if (e.shadowRoot) roots.push(e.shadowRoot); }
      return out;
    };
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const els = await until('barra do app', () => { const a = all(); return a.some((e) => e.matches('.uo-menu-row .uo-mbtn') && vis(e)) && a; });
    await sleep(500);
    const one = (sel) => els.find((e) => e.matches(sel) && vis(e));
    const region = (e) => e && getComputedStyle(e).getPropertyValue('-webkit-app-region');
    const trailing = one('.uo-titlebar .uo-trailing');
    const area = navigator.windowControlsOverlay?.visible ? navigator.windowControlsOverlay.getTitlebarAreaRect() : null;
    return {
      titleRow: box(one('.uo-title-row')), menuRow: box(one('.uo-menu-row')),
      menus: els.filter((e) => e.matches('.uo-menu-row .uo-mbtn') && vis(e)).map((e) => e.textContent.trim()),
      trailing: trailing && { ...box(trailing), text: trailing.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) },
      status: box(one(${JSON.stringify(EDITORS[kind].status)})),
      wco: area && { x: Math.round(area.x), w: Math.round(area.width), h: Math.round(area.height) }, innerWidth,
      // o vazio do bloco título+menus arrasta a janela; título e menus não
      drag: { main: region(one('.uo-titlebar-main')), title: region(one('.uo-title-row > *')), menus: region(one('.uo-menubar')) },
    };
  }`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

/** Inicia o executável: a 1ª instância com o DevTools; as seguintes só entregam o arquivo. */
function launch(file, primary) {
  const flags = primary ? [`--remote-debugging-port=${port}`] : [];
  const child = spawn(exe, [...extra, ...[file].flat(), ...flags, `--user-data-dir=${profile}`], {
    // POSIX: grupo de processos próprio — o runtime do AppImage
    // (--appimage-extract-and-run) fica no meio e o Electron sobreviveria a ele
    cwd: T, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  child.output = '';
  child.stderr.on('data', (d) => { child.output += d; });
  child.stdout.on('data', (d) => { child.output += d; });
  child.exited = new Promise((r) => child.on('exit', (code) => r(code)));
  return child;
}

async function target(kind, urlPart = `/packages/${EDITORS[kind]?.demo}/demo/index.html`) {
  const t0 = Date.now();
  for (;;) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.includes(urlPart));
      if (page) return { page, pages: list.filter((t) => t.type === 'page').length };
    } catch { /* ainda subindo */ }
    if (Date.now() - t0 > 60000) throw new Error(`a janela do ${kind} não apareceu no DevTools (porta ${port})\n${primaryProc.output}`);
    await sleep(300);
  }
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)); else p.resolve(msg.result);
  });
  const open = new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  return {
    send: async (method, params = {}) => {
      await open;
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

async function checkEditor(kind) {
  const { page, pages } = await target(kind);
  check(page.url.startsWith('http://127.0.0.1:'), `[${kind}] janela carregou ${page.url} (${pages} janela(s) no processo)`);
  const c = cdp(page.webSocketDebuggerUrl);
  // a 1ª avaliação pode cair no documento inicial da janela, trocado quando a
  // página termina de carregar ("Execution context was destroyed"): tenta de novo
  let r;
  for (let attempt = 1; ; attempt++) {
    try {
      r = await c.send('Runtime.evaluate', {
        expression: `(() => { ${prelude(kind)}\n return ${PROBES[kind]}; })()`, awaitPromise: true, returnByValue: true, timeout: 120000,
      });
      break;
    } catch (err) {
      if (attempt >= 5 || !/context was destroyed|Cannot find context/i.test(err.message)) throw err;
      await sleep(1000);
    }
  }
  if (r.exceptionDetails) throw new Error(`[${kind}] sonda: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  const v = r.result.value;
  console.log(JSON.stringify({ kind, title: v.title, sheets: v.sheets, slides: v.slides, fonts: v.fonts }));
  check(v.title.includes(stem(kind)), `[${kind}] arquivo aberto ("${v.title}")`);
  check(v.bridges.length === 1 && v.bridges[0] === EDITORS[kind].bridge, `[${kind}] só a ponte do editor: ${v.bridges.join(', ')}`);
  for (const [f, s] of Object.entries(v.fonts)) check(/^(sfnt|woff2)/.test(s), `[${kind}] fonte ${f}: ${s}`);
  const ch = v.chrome;
  check(ch.titleRow && ch.menuRow && ch.titleRow.y + ch.titleRow.h <= ch.menuRow.y + 1,
    `[${kind}] título acima dos menus (linha de título ${JSON.stringify(ch.titleRow)}, menus ${JSON.stringify(ch.menuRow)})`);
  check(ch.menus.some((m) => /^(Arquivo|File)$/.test(m)), `[${kind}] menu Arquivo presente (${ch.menus.join(' | ')})`);
  check(ch.status && ch.status.h > 0 && ch.status.y > ch.menuRow.y, `[${kind}] barra de status ${JSON.stringify(ch.status)}`);
  if (ch.wco) check(ch.drag.main === 'drag' && ch.drag.title === 'no-drag' && ch.drag.menus === 'no-drag',
    `[${kind}] área de arrasto: bloco ${ch.drag.main}, título ${ch.drag.title}, menus ${ch.drag.menus}`);
  if (ch.wco && ch.trailing) {
    check(ch.trailing.x + ch.trailing.w <= ch.wco.x + ch.wco.w,
      `[${kind}] ações à direita ("${ch.trailing.text}", até x=${ch.trailing.x + ch.trailing.w}) fora dos controles do SO (a partir de x=${ch.wco.x + ch.wco.w})`);
  } else console.log(`[${kind}] (sem controles do SO sobrepostos: wco=${JSON.stringify(ch.wco)}; ações à direita ${JSON.stringify(ch.trailing)})`);
  if (kind === 'write') {
    check(v.spell['pt-BR'].includes('testee') && v.spell['pt-BR'].includes('palavrass') && v.spell['pt-BR'].length === 2,
      `[write] revisão pt-BR: ${JSON.stringify(v.spell['pt-BR'])}`);
    check(v.spell['en-US'].includes('sentense') && v.spell['en-US'].includes('mispelled') && v.spell['en-US'].length === 2,
      `[write] revisão en-US: ${JSON.stringify(v.spell['en-US'])}`);
    // texto com erros no início do documento: o sublinhado aparece no PNG
    await c.send('Runtime.evaluate', { expression: 'document.getElementById("wn").focusEditor()' });
    await c.send('Input.insertText', { text: 'Testee de ortografia com palavrass erradas. ' });
  }
  if (kind === 'slides') await sleep(1500); // miniaturas
  await sleep(2500);
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const png = join(out, `${kind}-${process.platform}.png`);
  writeFileSync(png, Buffer.from(shot.data, 'base64'));
  console.log(`PNG: ${png}`);
  c.close();
}

/** Avalia `expr` (promessa) na página. */
async function evalPage(page, expr) {
  const c = cdp(page.webSocketDebuggerUrl);
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result.value;
      } catch (err) {
        if (attempt >= 5 || !/context was destroyed|Cannot find context/i.test(err.message)) throw err;
        await sleep(1000);
      }
    }
  } finally { c.close(); }
}
const WAIT = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(what, f, ms = 30000) { const t0 = Date.now(); for (;;) { let v; try { v = await f(); } catch {} if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout: ' + what); await sleep(200); } }`;
const MENUS = `(() => { const out = [], roots = [document]; while (roots.length) for (const e of roots.pop().querySelectorAll('*')) { out.push(e); if (e.shadowRoot) roots.push(e.shadowRoot); }
  return out.filter((e) => e.matches('.uo-menu-row .uo-mbtn') && e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()); })()`;

/** Boas-vindas do Sheet e a troca de idioma (com os três editores abertos). */
async function checkWelcomeAndLanguage() {
  const second = launch(['--editor=sheet'], false);
  const code = await Promise.race([second.exited, sleep(30000).then(() => 'não saiu')]);
  check(code === 0, `[welcome] 2ª instância --editor=sheet entregue e saiu (código ${code})`);
  const { page } = await target(null, '/welcome/index.html?app=sheet');
  const w = await evalPage(page, `(async () => { ${WAIT}
    await until('boas-vindas', () => document.getElementById('name').textContent && document.querySelector('#list li'));
    const icon = document.getElementById('icon');
    await until('ícone', () => icon.complete && icon.naturalWidth > 0);
    return { name: document.getElementById('name').textContent, newLabel: document.getElementById('newLabel').textContent,
      lang: document.getElementById('lang').value, langs: [...document.getElementById('lang').options].map((o) => o.value),
      recents: [...document.querySelectorAll('#list .open .name')].map((e) => e.firstChild.textContent),
      others: [...document.querySelectorAll('.other')].map((e) => e.textContent.trim()), licenses: document.getElementById('licenses').textContent,
      icon: icon.naturalWidth };
  })()`);
  console.log(JSON.stringify({ welcome: w }));
  check(w.name === 'Universal Sheet (Beta)' && w.icon >= 256, `[welcome] boas-vindas do Sheet ("${w.name}", ícone ${w.icon}px, "${w.newLabel}")`);
  check(w.recents.includes(basename(samples.sheet ?? 'showcase.xlsx')) && w.recents.every((n) => /[.]xls[xm]?$/.test(n)), `[welcome] recentes do Sheet: ${w.recents.join(', ')}`);
  check(w.langs.join() === 'pt-BR,en-US,es' && !!w.licenses, `[welcome] idiomas ${w.langs.join(', ')} (atual ${w.lang}); link "${w.licenses}"`);
  const before = w.lang;
  const shot = await (async () => { const c = cdp(page.webSocketDebuggerUrl); try { return await c.send('Page.captureScreenshot', { format: 'png' }); } finally { c.close(); } })();
  writeFileSync(join(out, `welcome-sheet-${process.platform}.png`), Buffer.from(shot.data, 'base64'));
  // troca para es pelas boas-vindas (como escolher no seletor)
  const es = await evalPage(page, `(async () => { ${WAIT}
    const sel = document.getElementById('lang'); sel.value = 'es'; sel.dispatchEvent(new Event('change'));
    await until('textos em espanhol', () => document.getElementById('newLabel').textContent === 'Nueva hoja de cálculo');
    return { newLabel: document.getElementById('newLabel').textContent, recent: document.getElementById('recentLabel').textContent, lang: document.documentElement.lang };
  })()`);
  check(es.newLabel === 'Nueva hoja de cálculo' && es.lang === 'es', `[welcome] trocou para es na hora ("${es.newLabel}", "${es.recent}")`);
  const shotEs = await (async () => { const c = cdp(page.webSocketDebuggerUrl); try { return await c.send('Page.captureScreenshot', { format: 'png' }); } finally { c.close(); } })();
  writeFileSync(join(out, `welcome-sheet-es-${process.platform}.png`), Buffer.from(shotEs.data, 'base64'));
  for (const kind of kinds) {
    const { page: ed } = await target(kind);
    const tag = { write: 'universal-write', sheet: 'universal-sheet', slides: 'universal-slides' }[kind];
    const v = await evalPage(ed, `(async () => { ${WAIT}
      const el = document.querySelector('${tag}');
      await until('lang=es', () => el.getAttribute('lang') === 'es');
      await sleep(800);
      return { lang: el.getAttribute('lang'), menus: ${MENUS} };
    })()`);
    check(v.lang === 'es', `[${kind}] lang do editor = es depois da troca (sem recarregar)`);
    check(v.menus.some((m) => /^(Idioma|Language)$/.test(m)), `[${kind}] menu Idioma na barra (${v.menus.join(' | ')})`);
    if (args.includes('--es')) {
      check(v.menus.includes('Archivo'), `[${kind}] interface em espanhol (${v.menus.join(' | ')})`);
      if (kind === 'write') {
        const sp = await evalPage(ed, `(async () => { const engine = document.getElementById('wn').spellEngine; return (await engine.checkText('Esto es una prueva de ortografía', 'es')).map((e) => e.word); })()`);
        check(sp.includes('prueva') && sp.length === 1, `[write] revisão es: ${JSON.stringify(sp)}`);
      }
      const shotEd = await (async () => { const c = cdp(ed.webSocketDebuggerUrl); try { return await c.send('Page.captureScreenshot', { format: 'png' }); } finally { c.close(); } })();
      writeFileSync(join(out, `${kind}-es-${process.platform}.png`), Buffer.from(shotEd.data, 'base64'));
    }
  }
  console.log(`(idioma antes da troca: ${before})`);
  if (args.includes('--es') && kinds.includes('write')) await checkNewSpanishDocument();
}

/** Páginas do DevTools cuja URL contém `urlPart`. */
async function pagesOf(urlPart) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  return list.filter((t) => t.type === 'page' && t.url.includes(urlPart));
}

/** Com o idioma es: `spellcheck-default-lang="es-ES"` no Write e um documento
 *  NOVO (--editor=write --new-window, o "Nuevo documento") que nasce em es. */
async function checkNewSpanishDocument() {
  const url = `/packages/${EDITORS.write.demo}/demo/index.html`;
  const known = new Set((await pagesOf(url)).map((t) => t.id));
  const second = launch(['--editor=write', '--new-window'], false);
  const code = await Promise.race([second.exited, sleep(30000).then(() => 'não saiu')]);
  check(code === 0, `[write] 2ª instância --editor=write --new-window entregue e saiu (código ${code})`);
  let page;
  for (const t0 = Date.now(); !(page = (await pagesOf(url)).find((t) => !known.has(t.id))); await sleep(300)) {
    if (Date.now() - t0 > 60000) throw new Error('[write] a janela do documento novo não apareceu no DevTools');
  }
  const v = await evalPage(page, `(async () => { ${WAIT}
    const wn = document.getElementById('wn');
    await until('documento novo pronto', () => wn.initialized && wn.model?.paragraphs?.length > 0, 60000);
    wn.focusEditor();
    wn.setSelection({ para: 0, offset: 0 });
    return { attr: wn.getAttribute('spellcheck-default-lang'), title: document.title };
  })()`);
  const c = cdp(page.webSocketDebuggerUrl);
  try { await c.send('Input.insertText', { text: 'El ordenadr llegó tarde.' }); } finally { c.close(); }
  const m = await evalPage(page, `(async () => { ${WAIT}
    const wn = document.getElementById('wn');
    await until('texto digitado', () => wn.model.paragraphs[0].runs.map((r) => r.text).join('').includes('ordenadr'));
    wn.setSelection({ para: 0, offset: 0 });
    const r = await wn.nextMisspelling();
    return r && { word: r.word, lang: r.lang, para: r.para };
  })()`);
  console.log(JSON.stringify({ newDocument: { ...v, misspelling: m } }));
  check(v.attr === 'es-ES', `[write] spellcheck-default-lang="${v.attr}" com o idioma es`);
  check(m?.word === 'ordenadr' && m?.lang === 'es', `[write] documento novo revisa em es: ${JSON.stringify(m)}`);
  const shot = await (async () => { const c2 = cdp(page.webSocketDebuggerUrl); try { return await c2.send('Page.captureScreenshot', { format: 'png' }); } finally { c2.close(); } })();
  writeFileSync(join(out, `write-new-es-${process.platform}.png`), Buffer.from(shot.data, 'base64'));
}

const primaryProc = launch(samples[kinds[0]], true);
try {
  await checkEditor(kinds[0]);
  for (const kind of kinds.slice(1)) {
    // 2ª instância: entrega o arquivo à 1ª e sai
    const second = launch(samples[kind], false);
    const code = await Promise.race([second.exited, sleep(30000).then(() => 'não saiu')]);
    check(code === 0, `[${kind}] 2ª instância entregou ${basename(samples[kind])} ao app aberto e saiu (código ${code})`);
    await checkEditor(kind);
  }
  if (!only) await checkWelcomeAndLanguage();
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  if (!args.includes('--keep')) {
    if (process.platform === 'win32') primaryProc.kill();
    else try { process.kill(-primaryProc.pid, 'SIGTERM'); } catch { primaryProc.kill(); }
    await Promise.race([primaryProc.exited, sleep(5000)]);
  }
}
console.log(fails.length ? `\n${fails.length} falha(s)` : '\ntudo ok');
process.exit(fails.length ? 1 : 0);
