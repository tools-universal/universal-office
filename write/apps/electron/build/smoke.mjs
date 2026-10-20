// Smoke do shell desktop: instância única, abrir por argv, 2ª instância
// encaminhando o arquivo, MOTW (lido e preservado ao salvar), ack do
// onOpenFile (recusa e reload), Salvar nativo no caminho conhecido, recusa de
// caminho desconhecido, janela de impressão isolada e bloqueio de navegação.
// Roda o Electron em dev e em modo de teste (WN_SMOKE_LOG): janelas ocultas,
// perfil isolado, recentes/Jump List do SO intocados. As variáveis de teste
// são ignoradas no app empacotado. Uso: npm run smoke
// (WN_ELECTRON=<electron.exe> se o electron não estiver em node_modules).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const electron = process.env.WN_ELECTRON || createRequire(import.meta.url)('electron');
const fixture = join(appDir, '..', '..', 'packages', 'docx-core', 'test', 'fixtures', 'doc', 'estilos.word.docx');
const WIN = process.platform === 'win32';

const T = mkdtempSync(join(tmpdir(), 'uw-smoke-'));
const log = join(T, 'events.jsonl');
for (const n of ['a', 'b', 'r', 'q']) copyFileSync(fixture, join(T, `${n}.docx`));
// b.docx "baixado da internet": Zone.Identifier com ZoneId=3 (só NTFS)
if (WIN) writeFileSync(join(T, 'b.docx:Zone.Identifier'), '[ZoneTransfer]\r\nZoneId=3\r\n');
const sizeA = statSync(join(T, 'a.docx')).size;

// Sonda injetada em cada carga de página. Por arquivo:
//   a.docx → salva no caminho, tenta caminho desconhecido, impressão,
//            navegação/pop-up para fora; b.docx → salva (MOTW tem de ficar);
//   r.docx → cb devolve false (recusa) e tenta salvar no caminho;
//   q.docx → recarrega a página sem confirmar; depois do reload confirma.
writeFileSync(join(T, 'probe.js'), `(() => {
  const log = (o) => console.log('[smoke] ' + JSON.stringify(o));
  const w = window.wordnext;
  const later = (fn) => setTimeout(() => fn().catch((e) => log({ error: String(e) })), 300);
  log({ api: Object.keys(w).sort() });
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

const env = { ...process.env, WN_USER_DATA: join(T, 'profile'), WN_SMOKE_LOG: log, WN_SMOKE_RENDERER: join(T, 'probe.js') };
delete env.ELECTRON_RUN_AS_NODE;
const run = (args) => spawn(electron, [appDir, ...args], { cwd: T, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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

const primary = run(['a.docx']); // caminho relativo ao cwd
primary.stderr.on('data', (d) => process.env.WN_SMOKE_VERBOSE && process.stderr.write(d));
try {
  const { api } = await waitR('api', 'API do preload');
  check(['closeWindow', 'exportFile', 'listFonts', 'onOpenFile', 'onSaveBeforeClose', 'openDocx', 'openDocxForCompare',
    'print', 'resolveFonts', 'saveFile', 'setDirty', 'setTitleTheme'].every((k) => api.includes(k)),
  'window.wordnext expõe os nomes antigos e os novos');

  // a.docx: argv, ack, save, guardas
  const gotA = await waitR('got', 'a.docx no renderer', 'a.docx');
  check(gotA.size === sizeA && gotA.motw === false && gotA.path === join(T, 'a.docx'), `argv: a.docx entregue (${gotA.size} B, motw=${gotA.motw})`);
  await waitFor((e) => e.event === 'file-opened' && e.ok && e.path === join(T, 'a.docx'), 'ack de a.docx');
  check(all((e) => e.event === 'recent').some((e) => e.path === join(T, 'a.docx')), 'recentes: a.docx entra só depois do ack');
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
  check(blocked.some((u) => u.startsWith('file:///C:/Windows')) && blocked.some((u) => u.startsWith('https://example.com')),
    'impressão de html: file:// local e rede bloqueados');
  check(popup === 'blocked' && all((e) => e.event === 'window-open-blocked').length > 0, 'pop-up para fora da origem negado');
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

  const nWin = all((e) => e.event === 'window-created').length;
  check(await exitOf(run(['--new-window'])) === 0, '--new-window (tarefa da Jump List) encaminhado');
  await waitFor(() => all((e) => e.event === 'window-created').length > nWin, 'janela nova do --new-window');
  check(true, '--new-window abriu janela');
  check(!all((e) => e.event === 'renderer').some((e) => rmsg(e).error), 'sonda sem erros');
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  primary.kill();
}
console.log(fails.length ? `\n${fails.length} falha(s). Log: ${log}` : `\ntudo ok. Log: ${log}`);
process.exit(fails.length ? 1 : 0);
