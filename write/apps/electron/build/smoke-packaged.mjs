// Smoke do app EMPACOTADO (Write, Sheet ou Slides): roda o executável do build
// (dist/win-unpacked, dist/linux-unpacked, um AppImage extraído, um .deb
// extraído…) com um arquivo de exemplo na linha de comando, conecta pelo
// DevTools Protocol (--remote-debugging-port) e confere que o arquivo chegou
// pela associação/argv e abriu com os assets de resources, que as fontes
// abertas embarcadas respondem, que a barra do componente aparece (título
// acima dos menus, menu Arquivo, barra de status; com os controles do SO
// sobrepostos, as ações da direita fora da área deles) e — no Write — que a
// revisão ortográfica pt-BR e en-US funciona offline. Grava um PNG da janela
// (Page.captureScreenshot).
//
// Uso (Node 22+, que tem WebSocket global):
//   node smoke-packaged.mjs --app write|sheet|slides [--exe <executável>]
//        [--file <arquivo>] [--out <pasta>] [--extra "<args do app>"] [--keep]
// (--extra "--no-sandbox": Linux sem o chrome-sandbox setuid, como num AppImage
// ou .deb só extraído, ou com userns restrito pelo AppArmor do Ubuntu 24.04)
// Sem --exe usa o dist/<plataforma>-unpacked do app. O perfil fica numa pasta
// temporária (--user-data-dir); o processo iniciado aqui é encerrado no fim.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const app = opt('app', 'write');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const APPS = {
  write: {
    dir: join(repo, 'write', 'apps', 'electron'), product: 'Universal Write', exe: 'universal-write', demo: 'editor', status: '.uw-status-bar',
    file: join(repo, 'write', 'packages', 'docx-core', 'test', 'fixtures', 'doc', 'estilos.word.docx'),
    fonts: ['carlito-regular.ttf', 'caladea-regular.ttf', 'liberationsans-regular.ttf', 'liberationserif-regular.ttf', 'poppins-400.woff2'],
  },
  sheet: {
    dir: join(repo, 'sheet', 'apps', 'electron'), product: 'Universal Sheet', exe: 'universal-sheet', demo: 'sheet', status: '.us-bottombar',
    file: join(repo, 'sheet', 'samples', 'showcase.xlsx'),
    // aptos-narrow: proprietária, fora do pacote → fonte do SO ou Liberation Sans (servidor do shell)
    fonts: ['carlito-regular.ttf', 'liberationsans-regular.ttf', 'poppins-400.woff2', 'aptos-narrow-regular.ttf'],
  },
  slides: {
    dir: join(repo, 'slides', 'apps', 'electron'), product: 'Universal Slides', exe: 'universal-slides', demo: 'slides', status: '.us-bottom',
    file: join(repo, 'slides', 'samples', 'reference.pptx'),
    fonts: ['carlito-regular.ttf', 'liberationsans-regular.ttf', 'os/amatic-sc-regular.ttf', 'aptos-regular.ttf'],
  },
};
const A = APPS[app];
if (!A) throw new Error(`--app deve ser ${Object.keys(APPS).join('|')}`);

function defaultExe() {
  const dist = join(A.dir, 'dist');
  if (process.platform === 'win32') return join(dist, 'win-unpacked', `${A.product}.exe`);
  if (process.platform === 'darwin') {
    const mac = readdirSync(dist).find((d) => d.startsWith('mac')) ?? 'mac';
    return join(dist, mac, `${A.product}.app`, 'Contents', 'MacOS', A.product);
  }
  return join(dist, 'linux-unpacked', A.exe);
}
const exe = opt('exe', defaultExe());
const out = opt('out', join(A.dir, 'dist', 'smoke'));
if (!existsSync(exe)) throw new Error(`executável não encontrado: ${exe} (rode "npm run dist" antes)`);
mkdirSync(out, { recursive: true });

const T = mkdtempSync(join(tmpdir(), `uo-smoke-${app}-`));
const sample = join(T, basename(opt('file', A.file)));
copyFileSync(opt('file', A.file), sample);
const stem = basename(sample, extname(sample));
const port = 9300 + Math.floor(Math.random() * 500);

const PROBES = {
  write: `(async () => {
    const wn = document.getElementById('wn');
    await until('documento aberto', () => document.title.includes(STEM));
    const engine = await until('motor de revisão ortográfica', () => wn.spellEngine);
    const pt = (await engine.checkText('Isto é um testee com palavrass erradas', 'pt-BR')).map((e) => e.word);
    const en = (await engine.checkText('This sentense has a mispelled word', 'en-US')).map((e) => e.word);
    return { title: document.title, bridge: !!window.wordnext, fonts: await fonts(), chrome: await chrome(), spell: { 'pt-BR': pt, 'en-US': en } };
  })()`,
  sheet: `(async () => {
    const us = document.getElementById('us');
    await until('planilha aberta', () => document.title.includes(STEM) && us.getSheetNames().length > 0);
    return { title: document.title, bridge: !!window.universalSheet, sheets: us.getSheetNames(), fonts: await fonts(), chrome: await chrome() };
  })()`,
  slides: `(async () => {
    const us = document.getElementById('us');
    await until('apresentação aberta', () => document.title.includes(STEM) && us.getSlideCount() > 0);
    return { title: document.title, bridge: !!window.universalSlides, slides: us.getSlideCount(), fonts: await fonts(), chrome: await chrome() };
  })()`,
};
const PRELUDE = `
  const STEM = ${JSON.stringify(stem)};
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
  async function fonts() {
    const r = {};
    for (const f of ${JSON.stringify(A.fonts)}) {
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
      status: box(one(${JSON.stringify(A.status)})),
      wco: area && { x: Math.round(area.x), w: Math.round(area.width), h: Math.round(area.height) }, innerWidth,
      // o vazio do bloco título+menus arrasta a janela; título e menus não
      drag: { main: region(one('.uo-titlebar-main')), title: region(one('.uo-title-row > *')), menus: region(one('.uo-menubar')) },
    };
  }`;

const extra = opt('extra', '').split(' ').filter(Boolean);
const child = spawn(exe, [...extra, sample, `--remote-debugging-port=${port}`, `--user-data-dir=${join(T, 'profile')}`], {
  // POSIX: grupo de processos próprio — o runtime do AppImage
  // (--appimage-extract-and-run) fica no meio e o Electron sobreviveria a ele
  cwd: T, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
});
let stderr = '';
child.stderr.on('data', (d) => { stderr += d; });
child.stdout.on('data', (d) => { stderr += d; });
const exited = new Promise((r) => child.on('exit', (code) => r(code)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

async function target() {
  const t0 = Date.now();
  for (;;) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.includes(`/packages/${A.demo}/demo/index.html`));
      if (page) return page;
    } catch { /* ainda subindo */ }
    if (Date.now() - t0 > 60000) throw new Error(`a janela do app não apareceu no DevTools (porta ${port})\n${stderr}`);
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

try {
  const page = await target();
  check(page.url.startsWith('http://127.0.0.1:'), `janela carregou ${page.url}`);
  const c = cdp(page.webSocketDebuggerUrl);
  // a 1ª avaliação pode cair no documento inicial da janela, trocado quando a
  // página termina de carregar ("Execution context was destroyed"): tenta de novo
  let r;
  for (let attempt = 1; ; attempt++) {
    try {
      r = await c.send('Runtime.evaluate', {
        expression: `(() => { ${PRELUDE}\n return ${PROBES[app]}; })()`, awaitPromise: true, returnByValue: true, timeout: 120000,
      });
      break;
    } catch (err) {
      if (attempt >= 5 || !/context was destroyed|Cannot find context/i.test(err.message)) throw err;
      await sleep(1000);
    }
  }
  if (r.exceptionDetails) throw new Error(`sonda: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  const v = r.result.value;
  console.log(JSON.stringify(v, null, 2));
  check(v.title.includes(stem), `arquivo aberto pela linha de comando ("${v.title}")`);
  check(v.bridge, 'ponte do preload presente');
  for (const [f, s] of Object.entries(v.fonts)) check(/^(sfnt|woff2)/.test(s), `fonte ${f}: ${s}`);
  const ch = v.chrome;
  check(ch.titleRow && ch.menuRow && ch.titleRow.y + ch.titleRow.h <= ch.menuRow.y + 1,
    `título acima dos menus (linha de título ${JSON.stringify(ch.titleRow)}, menus ${JSON.stringify(ch.menuRow)})`);
  check(ch.menus.some((m) => /^(Arquivo|File)$/.test(m)), `menu Arquivo presente (${ch.menus.join(' | ')})`);
  check(ch.status && ch.status.h > 0 && ch.status.y > ch.menuRow.y, `barra de status ${JSON.stringify(ch.status)}`);
  if (ch.wco) check(ch.drag.main === 'drag' && ch.drag.title === 'no-drag' && ch.drag.menus === 'no-drag',
    `área de arrasto: bloco ${ch.drag.main}, título ${ch.drag.title}, menus ${ch.drag.menus}`);
  if (ch.wco && ch.trailing) {
    check(ch.trailing.x + ch.trailing.w <= ch.wco.x + ch.wco.w,
      `ações à direita ("${ch.trailing.text}", até x=${ch.trailing.x + ch.trailing.w}) fora dos controles do SO (a partir de x=${ch.wco.x + ch.wco.w})`);
  } else console.log(`(sem controles do SO sobrepostos: wco=${JSON.stringify(ch.wco)}; ações à direita ${JSON.stringify(ch.trailing)})`);
  if (app === 'write') {
    check(v.spell['pt-BR'].includes('testee') && v.spell['pt-BR'].includes('palavrass') && v.spell['pt-BR'].length === 2,
      `revisão pt-BR: ${JSON.stringify(v.spell['pt-BR'])}`);
    check(v.spell['en-US'].includes('sentense') && v.spell['en-US'].includes('mispelled') && v.spell['en-US'].length === 2,
      `revisão en-US: ${JSON.stringify(v.spell['en-US'])}`);
    // texto com erros no início do documento: o sublinhado aparece no PNG
    await c.send('Runtime.evaluate', { expression: 'document.getElementById("wn").focusEditor()' });
    await c.send('Input.insertText', { text: 'Testee de ortografia com palavrass erradas. ' });
  }
  if (app === 'slides') await sleep(1500); // miniaturas
  await sleep(2500);
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const png = join(out, `${app}-${process.platform}.png`);
  writeFileSync(png, Buffer.from(shot.data, 'base64'));
  console.log(`PNG: ${png}`);
  c.close();
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  if (!args.includes('--keep')) {
    if (process.platform === 'win32') child.kill();
    else try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
    await Promise.race([exited, sleep(5000)]);
  }
}
console.log(fails.length ? `\n${fails.length} falha(s)` : '\ntudo ok');
process.exit(fails.length ? 1 : 0);
