// Smoke do shell da suíte (dev): instância única, abrir por argv, 2ª instância
// encaminhando o arquivo e ROTEANDO pela extensão (.docx → Write, .xlsx →
// Sheet, .pptx → Slides), ponte de cada editor, MOTW (lido e preservado ao
// salvar), ack do onOpenFile (recusa e reload), Salvar nativo no caminho
// conhecido, recusa de caminho desconhecido, janela de impressão isolada,
// bloqueio de navegação, --editor=<editor> (boas-vindas do editor, com os
// recentes dele), --new-window, o idioma da interface (troca nas boas-vindas
// chegando ao `lang` dos editores abertos e ao menu Idioma injetado) e, sem
// argumentos, as boas-vindas do Write com "Novo documento".
// Roda o Electron em dev e em modo de teste (UO_SMOKE_LOG): janelas ocultas,
// perfil isolado, recentes/Jump List do SO intocados. As variáveis de teste
// são ignoradas no app empacotado. Uso: npm run smoke
// (UO_ELECTRON=<electron.exe> se o electron não estiver em node_modules).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(appDir, '..');
const electron = process.env.UO_ELECTRON || createRequire(import.meta.url)('electron');
const FIXTURES = {
  docx: join(repo, 'write', 'packages', 'docx-core', 'test', 'fixtures', 'doc', 'estilos.word.docx'),
  xlsx: join(repo, 'sheet', 'samples', 'showcase.xlsx'),
  pptx: join(repo, 'slides', 'samples', 'reference.pptx'),
};
const WIN = process.platform === 'win32';

const T = mkdtempSync(join(tmpdir(), 'uo-smoke-'));
const log = join(T, 'events.jsonl');
for (const n of ['a', 'b', 'r', 'q']) copyFileSync(FIXTURES.docx, join(T, `${n}.docx`));
copyFileSync(FIXTURES.xlsx, join(T, 'c.xlsx'));
copyFileSync(FIXTURES.pptx, join(T, 'd.pptx'));
// b.docx "baixado da internet": Zone.Identifier com ZoneId=3 (só NTFS)
if (WIN) writeFileSync(join(T, 'b.docx:Zone.Identifier'), '[ZoneTransfer]\r\nZoneId=3\r\n');
const sizeA = statSync(join(T, 'a.docx')).size;

// Sonda injetada em cada carga de página. Write, por arquivo:
//   a.docx → salva no caminho, tenta caminho desconhecido, impressão,
//            navegação/pop-up para fora; b.docx → salva (MOTW tem de ficar);
//   r.docx → cb devolve false (recusa) e tenta salvar no caminho;
//   q.docx → recarrega a página sem confirmar; depois do reload confirma.
// Sheet/Slides: só registra a ponte (quem abre o arquivo é a própria página,
// e o ack dela aparece no log do main). Editores: o `lang` do componente, ao
// carregar e a cada troca. Boas-vindas do Sheet: recentes e troca de idioma
// para es; do Write: "Novo documento".
writeFileSync(join(T, 'probe.js'), `(() => {
  const log = (o) => console.log('[smoke] ' + JSON.stringify(o));
  const bridges = ['wordnext', 'universalSheet', 'universalSlides', 'universalOffice'].filter((k) => k in window);
  log({ path: location.pathname, bridges });
  const comp = document.querySelector('universal-write, universal-sheet, universal-slides');
  if (comp) {
    log({ lang: comp.getAttribute('lang'), tag: comp.localName });
    new MutationObserver(() => log({ langChanged: comp.getAttribute('lang'), tag: comp.localName })).observe(comp, { attributes: true, attributeFilter: ['lang'] });
  }
  if (window.universalSheet || window.universalSlides) {
    const b = window.universalSheet || window.universalSlides;
    log({ api: Object.keys(b).sort(), bridge: window.universalSheet ? 'universalSheet' : 'universalSlides' });
    return;
  }
  if (window.universalOffice) {
    const uo = window.universalOffice;
    (async () => {
      const info = await uo.info();
      const recents = await uo.recents();
      log({ welcome: info.kind, name: info.name, lang: info.lang, newLabel: info.strings.newItem, others: info.editors.map((e) => e.kind), recents: recents.map((r) => r.name) });
      if (info.kind === 'sheet') {
        uo.onLanguage(async (l) => { const again = await uo.info(); log({ welcomeLang: l, newLabel: again.strings.newItem }); });
        await uo.setLanguage('es');
      } else if (info.kind === 'write') {
        await uo.newDocument();
      }
    })().catch((e) => log({ error: String(e) }));
    return;
  }
  const w = window.wordnext;
  if (!w) return;
  const later = (fn) => setTimeout(() => fn().catch((e) => log({ error: String(e) })), 300);
  log({ api: Object.keys(w).sort(), bridge: 'wordnext' });
  w.onOpenFile((doc) => {
    log({ got: doc.name, path: doc.path, size: doc.bytes.byteLength, motw: doc.motw });
    const bytes = new Uint8Array(doc.bytes);
    if (doc.name === 'r.docx') {
      later(async () => {
        try { await w.saveFile({ suggestedName: doc.name, bytes, path: doc.path }); log({ refusedSave: 'accepted' }); }
        catch { log({ refusedSave: 'rejected' }); }
      });
      return false;
    }
    if (doc.name === 'q.docx' && !sessionStorage.getItem('reloaded')) {
      sessionStorage.setItem('reloaded', '1');
      location.reload();
      return new Promise(() => {}); // nunca confirma
    }
    if (doc.name === 'b.docx') later(async () => log({ savedB: await w.saveFile({ suggestedName: doc.name, bytes, path: doc.path }) }));
    if (doc.name !== 'a.docx') return;
    later(async () => {
      const grown = new Uint8Array(bytes.byteLength + 5);
      grown.set(bytes); grown.set([83, 77, 79, 75, 69], bytes.byteLength);
      log({ saved: await w.saveFile({ suggestedName: doc.name, bytes: grown, path: doc.path }) });
      try { await w.saveFile({ suggestedName: 'x.docx', bytes, path: doc.path.replace(/a\\.docx$/, 'evil.docx') }); log({ unauth: 'accepted' }); }
      catch { log({ unauth: 'rejected' }); }
      log({ printers: (await w.listPrinters()).length });
      const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      log({ print: await w.print({ pages: [px, px], silent: true, deviceName: '__smoke_no_printer__' }) });
      await w.print({ html: '<img src="file:///C:/Windows/win.ini"><img src="https://example.com/x.png">', silent: true, deviceName: '__smoke_no_printer__' });
      log({ popup: window.open('https://example.com/') === null ? 'blocked' : 'opened' });
      const before = location.href;
      location.href = 'https://example.com/';
      await new Promise((r) => setTimeout(r, 800));
      log({ stayed: location.href === before });
    });
  });
})();`);

const env = { ...process.env, UO_USER_DATA: join(T, 'profile'), UO_SMOKE_LOG: log, UO_SMOKE_RENDERER: join(T, 'probe.js') };
delete env.ELECTRON_RUN_AS_NODE;
const run = (args, extraEnv = {}) => spawn(electron, [appDir, ...args], { cwd: T, env: { ...env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
const events = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const rmsg = (e) => (e.event === 'renderer' ? JSON.parse(e.msg) : {});
const all = (pred) => events().filter(pred);
async function waitFor(pred, what, ms = 60000) {
  const t0 = Date.now();
  for (;;) {
    const hit = events().find(pred);
    if (hit) return hit;
    if (Date.now() - t0 > ms) throw new Error(`timeout esperando ${what}\n${readFileSync(log, 'utf8')}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}
const waitR = async (key, what, val) => rmsg(await waitFor((e) => {
  const m = rmsg(e);
  return key in m && (val === undefined || m[key] === val);
}, what));
const exitOf = (p) => new Promise((r) => p.on('exit', (code) => r(code)));
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };
const windowsOf = (kind) => all((e) => e.event === 'window-created' && e.kind === kind);

const primary = run(['a.docx']); // caminho relativo ao cwd
primary.stderr.on('data', (d) => process.env.UO_SMOKE_VERBOSE && process.stderr.write(d));
try {
  const { api } = await waitR('bridge', 'API do preload (Write)', 'wordnext');
  check(['clearRecents', 'closeWindow', 'exportFile', 'listFonts', 'listPrinters', 'onOpenFile', 'onSaveBeforeClose', 'openDocx', 'openDocxForCompare',
    'print', 'resolveFonts', 'saveFile', 'setDirty', 'setTitleTheme', 'userName'].every((k) => api.includes(k)),
  'window.wordnext expõe a superfície do Write');
  check(windowsOf('write').length === 1 && windowsOf('start').length === 0, 'argv com .docx: janela do Write (sem janela inicial)');

  // a.docx: argv, ack, save, guardas
  const gotA = await waitR('got', 'a.docx no renderer', 'a.docx');
  check(gotA.size === sizeA && gotA.motw === false && gotA.path === join(T, 'a.docx'), `argv: a.docx entregue (${gotA.size} B, motw=${gotA.motw})`);
  await waitFor((e) => e.event === 'file-opened' && e.ok && e.path === join(T, 'a.docx'), 'ack de a.docx');
  check(all((e) => e.event === 'recent').some((e) => e.path === join(T, 'a.docx') && e.kind === 'write'), 'recentes: a.docx entra só depois do ack, no Write');
  const { saved } = await waitR('saved', 'saveFile');
  check(saved.path === join(T, 'a.docx') && statSync(join(T, 'a.docx')).size === sizeA + 5
    && readFileSync(join(T, 'a.docx')).subarray(-5).toString() === 'SMOKE', 'saveFile gravou direto no caminho conhecido');
  const { unauth } = await waitR('unauth', 'caminho desconhecido');
  check(unauth === 'rejected' && !existsSync(join(T, 'evil.docx')), 'saveFile recusa caminho que o main não entregou');
  const { print } = await waitR('print', 'print');
  check(print.success === false && !!print.failureReason, `print: janela oculta carregou e imprimiu (impressora inexistente → "${print.failureReason}")`);
  const { popup } = await waitR('popup', 'pop-up externo');
  const { stayed } = await waitR('stayed', 'navegação externa');
  const blocked = all((e) => e.event === 'print-blocked').map((e) => e.url);
  check(blocked.some((u) => u.startsWith('file:///')) && blocked.some((u) => u.startsWith('https://example.com')),
    'impressão de html: file:// local e rede bloqueados');
  check(popup === 'blocked' && all((e) => e.event === 'window-open-blocked').length > 0, 'pop-up para fora da origem negado (Write)');
  check(stayed && all((e) => e.event === 'navigation-blocked').length > 0, 'navegação para fora da origem bloqueada');

  // b.docx: 2ª instância, janela nova, MOTW lido e preservado ao salvar
  const second = run(['b.docx']);
  const code = await exitOf(second);
  check(code === 0 && events().some((e) => e.event === 'forwarded'), `2ª instância encaminhou e saiu (código ${code})`);
  const gotBev = await waitFor((e) => rmsg(e).got === 'b.docx', 'b.docx no renderer');
  const winA = events().find((e) => rmsg(e).got === 'a.docx').window;
  check(gotBev.window !== winA, `b.docx abriu em janela nova (janela ${gotBev.window}; a.docx na ${winA})`);
  if (WIN) check(rmsg(gotBev).motw === true, 'MOTW (ZoneId=3) lido no arquivo encaminhado');
  await waitR('savedB', 'save de b.docx');
  if (WIN) {
    let zone = '';
    try { zone = readFileSync(join(T, 'b.docx:Zone.Identifier'), 'utf8'); } catch { /* perdeu */ }
    check(/ZoneId=3/.test(zone), 'save atômico preserva o Zone.Identifier');
  }

  // r.docx: renderer recusa → janela não vira dona
  check(await exitOf(run(['r.docx'])) === 0, '3ª instância (r.docx) encaminhou');
  await waitFor((e) => e.event === 'file-opened' && e.ok === false && e.path === join(T, 'r.docx'), 'recusa de r.docx');
  const { refusedSave } = await waitR('refusedSave', 'save de r.docx recusado');
  check(refusedSave === 'rejected' && !all((e) => e.event === 'recent').some((e) => e.path === join(T, 'r.docx')),
    'cb que devolve false: sem posse do arquivo, sem recentes');

  // q.docx: reload antes do ack → volta para a fila e chega de novo
  check(await exitOf(run(['q.docx'])) === 0, '4ª instância (q.docx) encaminhou');
  await waitFor((e) => e.event === 'file-opened' && e.ok && e.path === join(T, 'q.docx'), 'ack de q.docx depois do reload');
  const gotQ = all((e) => rmsg(e).got === 'q.docx');
  check(gotQ.length === 2 && gotQ[0].window === gotQ[1].window
    && all((e) => e.event === 'page-reset' && e.window === gotQ[0].window && e.queued >= 1).length >= 1,
  'reload sem ack: arquivo volta para a fila e é reentregue ao novo onOpenFile');

  // c.xlsx e d.pptx: a extensão decide o editor
  check(await exitOf(run(['c.xlsx'])) === 0, '2ª instância com c.xlsx encaminhou');
  const openC = await waitFor((e) => e.event === 'file-opened' && e.path === join(T, 'c.xlsx'), 'ack de c.xlsx (página do Sheet)');
  check(openC.ok && openC.kind === 'sheet' && windowsOf('sheet').length === 1, `.xlsx abriu no Sheet (janela ${openC.window}, ack ok=${openC.ok})`);
  const sheetApi = rmsg(await waitFor((e) => rmsg(e).bridge === 'universalSheet', 'ponte do Sheet')).api;
  check(['closeWindow', 'exportFile', 'listFonts', 'onOpenFile', 'onSaveBeforeClose', 'openXlsx', 'resolveFonts', 'saveFile', 'setDirty', 'setTitleTheme'].every((k) => sheetApi.includes(k))
    && !sheetApi.includes('openDocx') && !sheetApi.includes('print'), 'window.universalSheet: a superfície do Sheet, sem as do Write');
  check(all((e) => e.event === 'recent').some((e) => e.path === join(T, 'c.xlsx') && e.kind === 'sheet'), 'recentes: c.xlsx no Sheet');
  check(await exitOf(run(['d.pptx'])) === 0, '2ª instância com d.pptx encaminhou');
  const openD = await waitFor((e) => e.event === 'file-opened' && e.path === join(T, 'd.pptx'), 'ack de d.pptx (página do Slides)');
  check(openD.ok && openD.kind === 'slides' && windowsOf('slides').length === 1, `.pptx abriu no Slides (janela ${openD.window}, ack ok=${openD.ok})`);
  const slidesApi = rmsg(await waitFor((e) => rmsg(e).bridge === 'universalSlides', 'ponte do Slides')).api;
  check(['closeWindow', 'exportFile', 'listFonts', 'onOpenFile', 'onSaveBeforeClose', 'openPptx', 'print', 'resolveFonts', 'saveFile', 'setDirty', 'setTitleTheme'].every((k) => slidesApi.includes(k))
    && !slidesApi.includes('openDocx'), 'window.universalSlides: a superfície do Slides');

  // idioma inicial (perfil novo = o do sistema) no `lang` dos três editores, e o menu Idioma injetado
  const ready = events().find((e) => e.event === 'ready');
  const langs = all((e) => rmsg(e).tag && 'lang' in rmsg(e)).map((e) => rmsg(e));
  check(['universal-write', 'universal-sheet', 'universal-slides'].every((t) => langs.some((m) => m.tag === t && m.lang === ready.lang)),
    `idioma da interface (${ready.lang}, do sistema) no atributo lang dos três editores`);
  await waitFor(() => all((e) => e.event === 'language-menu' && e.ok).length >= 3, 'menu Idioma nos três editores');
  check(new Set(all((e) => e.event === 'language-menu' && e.ok).map((e) => e.kind)).size === 3, 'menu Idioma injetado pela API de plugins nos três editores');

  // --editor=sheet: as boas-vindas do Sheet, com os recentes DELE; lá, idioma → es
  check(await exitOf(run(['--editor=sheet'])) === 0, '--editor=sheet (atalho do Sheet) encaminhado');
  const wel = rmsg(await waitFor((e) => rmsg(e).welcome === 'sheet', 'boas-vindas do Sheet'));
  check(wel.recents.includes('c.xlsx') && !wel.recents.some((n) => /[.](docx|pptx)$/.test(n)), `boas-vindas do Sheet: recentes do Sheet (${wel.recents.join(', ')})`);
  check(wel.others.join() === 'write,slides', `boas-vindas do Sheet: atalhos para os outros editores (${wel.others.join(', ')})`);
  await waitFor((e) => e.event === 'language' && e.lang === 'es', 'troca de idioma para es');
  const welEs = rmsg(await waitFor((e) => rmsg(e).welcomeLang === 'es', 'boas-vindas em espanhol'));
  check(welEs.newLabel === 'Nueva hoja de cálculo', `boas-vindas trocaram para es na hora ("${welEs.newLabel}")`);
  await waitFor(() => new Set(all((e) => rmsg(e).langChanged === 'es').map((e) => rmsg(e).tag)).size === 3, 'lang=es nos três editores');
  check(true, 'troca de idioma chegou ao atributo lang dos três editores abertos, sem recarregar');
  const settingsFile = join(T, 'profile', 'settings.json');
  check(JSON.parse(readFileSync(settingsFile, 'utf8')).lang === 'es', 'idioma gravado no perfil (settings.json)');

  // --new-window (tarefa da Jump List): documento novo no editor pedido
  const nWrite = windowsOf('write').length;
  check(await exitOf(run(['--editor=write', '--new-window'])) === 0, '--editor=write --new-window (tarefa da Jump List) encaminhado');
  await waitFor(() => windowsOf('write').length > nWrite, 'janela nova do --new-window');
  check(true, '--new-window abriu janela do Write');
  check(!all((e) => e.event === 'renderer').some((e) => rmsg(e).error), 'sonda sem erros');
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  primary.kill();
}

// Sem arquivo nem --editor (perfil novo): as boas-vindas do Write; "Novo documento" abre o Write e as fecha
const startLog = join(T, 'start.jsonl');
const solo = run([], { UO_USER_DATA: join(T, 'profile-start'), UO_SMOKE_LOG: startLog });
try {
  const ev = () => (existsSync(startLog) ? readFileSync(startLog, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const until = async (pred, what) => {
    for (const t0 = Date.now(); !ev().some(pred);) { if (Date.now() - t0 > 60000) throw new Error(`timeout esperando ${what}\n${readFileSync(startLog, 'utf8')}`); await new Promise((r) => setTimeout(r, 200)); }
    return ev().find(pred);
  };
  await until((e) => e.event === 'window-created' && e.kind === 'welcome' && e.editor === 'write', 'boas-vindas do Write');
  const info = JSON.parse((await until((e) => e.event === 'renderer' && JSON.parse(e.msg).welcome, 'boas-vindas carregadas')).msg);
  check(info.welcome === 'write' && info.recents.length === 0, `sem argumentos: boas-vindas do Write (${info.name}, ${info.lang}, "${info.newLabel}", sem recentes)`);
  await until((e) => e.event === 'window-created' && e.kind === 'write', 'Write aberto por "Novo documento"');
  check(true, 'boas-vindas → "Novo documento" abriu uma janela do Write');
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  solo.kill();
}
console.log(fails.length ? `\n${fails.length} falha(s). Log: ${log}` : `\ntudo ok. Log: ${log}`);
process.exit(fails.length ? 1 : 0);
