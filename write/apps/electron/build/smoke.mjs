// Smoke do shell desktop: instância única, abrir por argv, 2ª instância
// encaminhando o arquivo, MOTW, Salvar nativo no caminho conhecido, recusa de
// caminho desconhecido e o caminho da impressão (janela oculta). Roda o
// Electron em modo de teste (WN_SMOKE_LOG): janelas ocultas, perfil isolado,
// recentes/Jump List do SO intocados. Uso: npm run smoke
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

const T = mkdtempSync(join(tmpdir(), 'uw-smoke-'));
const log = join(T, 'events.jsonl');
copyFileSync(fixture, join(T, 'a.docx'));
copyFileSync(fixture, join(T, 'b.docx'));
// b.docx "baixado da internet": Zone.Identifier com ZoneId=3 (só NTFS)
if (process.platform === 'win32') writeFileSync(join(T, 'b.docx:Zone.Identifier'), '[ZoneTransfer]\r\nZoneId=3\r\n');
const sizeA = statSync(join(T, 'a.docx')).size;

writeFileSync(join(T, 'probe.js'), `(() => {
  const log = (o) => console.log('[smoke] ' + JSON.stringify(o));
  const w = window.wordnext;
  log({ api: Object.keys(w).sort() });
  w.onOpenFile(async (doc) => {
    log({ got: doc.name, path: doc.path, size: doc.bytes.byteLength, motw: doc.motw });
    if (doc.name !== 'a.docx') return;
    const bytes = new Uint8Array(doc.bytes.byteLength + 5);
    bytes.set(new Uint8Array(doc.bytes)); bytes.set([83, 77, 79, 75, 69], doc.bytes.byteLength);
    log({ saved: await w.saveFile({ suggestedName: doc.name, bytes, path: doc.path }) });
    try { await w.saveFile({ suggestedName: 'x.docx', bytes, path: doc.path.replace(/a\\.docx$/, 'evil.docx') }); log({ unauth: 'accepted' }); }
    catch { log({ unauth: 'rejected' }); }
    log({ printers: (await w.listPrinters()).length });
    const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    log({ print: await w.print({ pages: [px, px], silent: true, deviceName: '__smoke_no_printer__' }) });
    log({ done: true });
  });
})();`);

const env = { ...process.env, WN_USER_DATA: join(T, 'profile'), WN_SMOKE_LOG: log, WN_SMOKE_RENDERER: join(T, 'probe.js') };
delete env.ELECTRON_RUN_AS_NODE;
const run = (args) => spawn(electron, [appDir, ...args], { cwd: T, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
const events = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
async function waitFor(pred, what, ms = 60000) {
  const t0 = Date.now();
  for (;;) {
    const hit = events().find(pred);
    if (hit) return hit;
    if (Date.now() - t0 > ms) throw new Error(`timeout esperando ${what}\n${readFileSync(log, 'utf8')}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}
const exitOf = (p) => new Promise((r) => p.on('exit', (code) => r(code)));
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

const primary = run(['a.docx']); // caminho relativo ao cwd
primary.stderr.on('data', (d) => process.env.WN_SMOKE_VERBOSE && process.stderr.write(d));
try {
  const api = await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).api, 'API do preload');
  check(['closeWindow', 'exportFile', 'listFonts', 'onOpenFile', 'onSaveBeforeClose', 'openDocx', 'openDocxForCompare',
    'print', 'resolveFonts', 'saveFile', 'setDirty', 'setTitleTheme'].every((k) => JSON.parse(api.msg).api.includes(k)),
  'window.wordnext expõe os nomes antigos e os novos');
  const gotA = JSON.parse((await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).got === 'a.docx', 'a.docx no renderer')).msg);
  check(gotA.size === sizeA && gotA.motw === false && gotA.path === join(T, 'a.docx'), `argv: a.docx entregue (${gotA.size} B, motw=${gotA.motw})`);
  const saved = JSON.parse((await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).saved, 'saveFile')).msg).saved;
  check(saved.path === join(T, 'a.docx') && statSync(join(T, 'a.docx')).size === sizeA + 5
    && readFileSync(join(T, 'a.docx')).subarray(-5).toString() === 'SMOKE', 'saveFile gravou direto no caminho conhecido');
  const unauth = JSON.parse((await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).unauth, 'caminho desconhecido')).msg).unauth;
  check(unauth === 'rejected' && !existsSync(join(T, 'evil.docx')), 'saveFile recusa caminho que o main não entregou');
  const print = JSON.parse((await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).print, 'print')).msg).print;
  check(print.success === false && !!print.failureReason, `print: janela oculta carregou e imprimiu (impressora inexistente → "${print.failureReason}")`);
  check(events().filter((e) => e.event === 'recent').length >= 1, 'recentes do SO chamados ao abrir/salvar');

  const second = run(['b.docx']);
  const code = await exitOf(second);
  check(code === 0 && events().some((e) => e.event === 'forwarded'), `2ª instância encaminhou e saiu (código ${code})`);
  const gotB = await waitFor((e) => e.event === 'renderer' && JSON.parse(e.msg).got === 'b.docx', 'b.docx no renderer');
  const winA = events().find((e) => e.event === 'renderer' && JSON.parse(e.msg).got === 'a.docx').window;
  check(gotB.window !== winA, `b.docx abriu em janela nova (janela ${gotB.window}; a.docx na ${winA})`);
  if (process.platform === 'win32') check(JSON.parse(gotB.msg).motw === true, 'MOTW (ZoneId=3) lido no arquivo encaminhado');

  const nWin = events().filter((e) => e.event === 'window-created').length;
  check(await exitOf(run(['--new-window'])) === 0, '--new-window (tarefa da Jump List) encaminhado');
  await waitFor(() => events().filter((e) => e.event === 'window-created').length > nWin, 'janela nova do --new-window');
  check(true, '--new-window abriu janela');
} catch (err) {
  fails.push(err.message);
  console.error(err.message);
} finally {
  primary.kill();
}
console.log(fails.length ? `\n${fails.length} falha(s). Log: ${log}` : `\ntudo ok. Log: ${log}`);
process.exit(fails.length ? 1 : 0);
