// Universal Office (Beta) — UM app desktop (Electron) para os três editores:
// Universal Write (.docx/.doc/.odt), Universal Sheet (.xlsx/.xlsm/.xls) e
// Universal Slides (.pptx/.ppt). Uma janela por documento; cada janela carrega
// a página do seu editor (o demo do componente), servida por um servidor
// estático interno (fetch de documentos e fontes não funciona via file://).
// Em dev serve as pastas dos produtos no repositório; empacotado, a cópia em
// resources (ver "extraResources" no package.json).
//
// O que muda de um editor para o outro está em editors.cjs (dados); tudo o
// mais é uma vez só: instância única (a extensão decide o editor), abrir pela
// linha de comando / associação de arquivo / open-file (macOS), recentes e
// Jump List, Abrir/Salvar/Salvar como/Exportar nativos, impressão com o
// diálogo do sistema, confirmação ao fechar com alterações, janela sem moldura
// com os controles do SO sobrepostos e na cor do tema, guardas de navegação e
// de IPC, fontes do SO. A superfície exposta às páginas está em preload.cjs.
//
// Linha de comando: universal-office [--editor=write|sheet|slides] [--new-window] [arquivos…]
//   com arquivos, cada um abre no editor da sua extensão; só --editor, a janela de
//   boas-vindas desse editor (novo, abrir, recentes, idioma); --new-window, um
//   documento novo; sem nada, as boas-vindas do último editor usado.
//
// Idioma da interface (pt-BR, en-US, es): escolhido nas boas-vindas ou no menu
// Idioma de cada editor, guardado no perfil (settings.json); o padrão é o
// idioma da revisão ortográfica, que vem do idioma do sistema. Vale para o
// shell (boas-vindas, diálogos, avisos, Jump List) e para o `lang` dos
// editores, na hora, sem reiniciar.
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, session, shell } = require('electron');
const http = require('node:http');
const {
  createReadStream, statSync, readFileSync, writeFileSync, existsSync,
  appendFileSync, renameSync, unlinkSync, mkdtempSync, rmSync,
} = require('node:fs');
const { join, normalize, extname, basename, dirname, resolve, sep } = require('node:path');
const { tmpdir, userInfo } = require('node:os');
const { pathToFileURL } = require('node:url');
const { SUITE, EDITORS, FORMATS, KINDS, aumidOf, kindOfPath } = require('./editors.cjs');
const { LANGS, LANG_NAMES, langFromLocale, normalizeLang, messages, fill } = require('./i18n.cjs');

const PKG = require('./package.json');
// Nome exibido com o canal ("Universal Office (Beta)", versão "0.9.2 beta");
// productName (pasta de instalação, perfil) e os AppUserModelIDs ficam estáveis
// para a versão final atualizar no lugar.
const CHANNEL = PKG.releaseChannel ? ` (${PKG.releaseChannel[0].toUpperCase()}${PKG.releaseChannel.slice(1)})` : '';
const SUITE_NAME = PKG.displayName || `${SUITE.name}${CHANNEL}`;
const DISPLAY_VERSION = PKG.releaseChannel ? `${PKG.version} ${PKG.releaseChannel}` : PKG.version;
const displayName = (kind) => (EDITORS[kind] ? `${EDITORS[kind].name}${CHANNEL}` : SUITE_NAME);

// ── Modo de teste (smoke) — só fora do app empacotado ──
// UO_USER_DATA isola o perfil (e com ele o lock de instância única) do app do
// usuário; UO_SMOKE_LOG grava os eventos em JSON por linha, as janelas não
// aparecem (nada de roubar o foco) e os recentes/Jump List do SO não são
// tocados; UO_SMOKE_RENDERER é um script injetado em cada janela depois de
// carregar (console.log '[smoke] …' do renderer vai para o log).
const DEV = !app.isPackaged;
const devEnv = (name) => (DEV ? process.env[name] || '' : '');
if (devEnv('UO_USER_DATA')) app.setPath('userData', devEnv('UO_USER_DATA'));
const SMOKE_LOG = devEnv('UO_SMOKE_LOG');
const SMOKE_RENDERER = devEnv('UO_SMOKE_RENDERER');
const SMOKE = !!SMOKE_LOG;
function smokeLog(event, data = {}) {
  if (!SMOKE) return;
  appendFileSync(SMOKE_LOG, JSON.stringify({ t: Date.now(), pid: process.pid, event, ...data }) + '\n');
}

// ── Instância única ──
// A 2ª execução (duplo clique num documento com o app aberto, atalho de outro
// editor, Jump List…) entrega argv + cwd à 1ª por additionalData (no Windows o
// argv do evento pode vir com switches do Chromium inseridos) e sai.
// UO_APP: o editor pedido pelo ambiente (os lançadores do snap, onde o snapd não
// aceita "=" no comando); vai junto para a 1ª instância.
const ENV_APP = EDITORS[String(process.env.UO_APP || '').toLowerCase()] ? String(process.env.UO_APP).toLowerCase() : null;
if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd(), app: ENV_APP })) {
  smokeLog('forwarded', { argv: process.argv.slice(1) });
  app.quit();
  return; // (CommonJS: return no topo encerra o módulo)
}

// ── Preferências e recentes (no perfil do usuário) ──
// settings.json: { lang, lastEditor }; recents.json: { write: [{ path, opened }], … }
// (os recentes do SO continuam: addRecentDocument, por editor no Windows).
const RECENTS_MAX = 50;
const jsonFile = (name) => join(app.getPath('userData'), name);
function readJson(name, fallback) {
  try { return JSON.parse(readFileSync(jsonFile(name), 'utf8')); } catch { return fallback; }
}
function writeJson(name, value) {
  try { writeFileSync(jsonFile(name), JSON.stringify(value, null, 2)); } catch (err) { console.warn(`[uo] ${name}:`, err?.message); }
}
const settings = readJson('settings.json', {});
const recentsStore = readJson('recents.json', {});
/** Idioma da revisão ortográfica = o do sistema (pt* → pt-BR, es* → es, o resto → en-US). */
function systemLang() {
  let tags = [];
  try { tags = app.getPreferredSystemLanguages(); } catch { /* antigo */ }
  return langFromLocale(tags[0] || app.getSystemLocale?.() || app.getLocale());
}
/** Idioma da interface: o escolhido pelo usuário ou, sem escolha, o da revisão ortográfica. */
const uiLang = () => normalizeLang(settings.lang) ?? systemLang();
const L = () => messages(uiLang());
const lastEditor = () => (EDITORS[settings.lastEditor] ? settings.lastEditor : 'write');
function setLastEditor(kind) {
  if (!EDITORS[kind] || settings.lastEditor === kind) return;
  settings.lastEditor = kind;
  writeJson('settings.json', settings);
}

/** Documentos pedidos na linha de comando: caminhos (relativos ao cwd de quem
 *  chamou) de arquivos existentes com extensão de um dos editores. */
function docPathsFromArgv(argv, cwd) {
  const out = [];
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    const p = resolve(cwd || process.cwd(), arg);
    if (!kindOfPath(p)) continue;
    try { if (statSync(p).isFile()) out.push(p); } catch { /* não existe */ }
  }
  return out;
}
/** --editor=<editor> da linha de comando (atalhos do instalador, Jump List,
 *  lançadores do Linux) ou, sem ele, UO_APP. `--app=` vale como apelido, mas
 *  nenhum lançador o usa: é o nome de um switch do Chrome (modo app). */
function appArg(argv, envApp = ENV_APP) {
  const a = argv.find((x) => typeof x === 'string' && /^--(editor|app)=/.test(x));
  const kind = a ? a.slice(a.indexOf('=') + 1).toLowerCase() : '';
  return EDITORS[kind] ? kind : (EDITORS[envApp] ? envApp : null);
}
const wantsNewWindow = (argv) => argv.includes('--new-window');

// ── Origem do app e guarda do IPC ──
// As páginas são servidas em http://127.0.0.1:<porta>; só frames dessa origem
// falam com o main (um iframe/pop-up de outra origem não chega à ponte).
let port = 0;
const appOrigin = () => `http://127.0.0.1:${port}`;
const isAppUrl = (url) => port !== 0 && typeof url === 'string' && url.startsWith(appOrigin() + '/');
const fromApp = (e) => isAppUrl(e.senderFrame?.url);
function handle(channel, fn) {
  ipcMain.handle(channel, (e, ...args) => {
    if (!fromApp(e)) throw new Error(`IPC ${channel} recusado: origem ${e.senderFrame?.url ?? '?'}`);
    return fn(e, ...args);
  });
}
function on(channel, fn) {
  ipcMain.on(channel, (e, ...args) => { if (fromApp(e)) fn(e, ...args); });
}

// Editor de cada janela ('welcome' = boas-vindas; o editor dela em welcomeKind)
const winKind = new WeakMap();
const welcomeKind = new WeakMap();
const kindOfWin = (win) => (win && !win.isDestroyed() ? winKind.get(win) ?? null : null);
const senderWin = (e) => BrowserWindow.fromWebContents(e.sender);
/** Perfil do editor da janela que chamou; IPC de outra janela é recusado. */
function editorOf(e) {
  const p = EDITORS[kindOfWin(senderWin(e))];
  if (!p) throw new Error('IPC de uma janela que não é de editor');
  return p;
}

// Mark-of-the-Web: stream alternativo NTFS "Zone.Identifier" com ZoneId>=3
// (Internet/Untrusted) — exatamente o critério do Word p/ Modo Protegido.
function hasMarkOfTheWeb(filePath) {
  try {
    const zone = readFileSync(filePath + ':Zone.Identifier', 'utf8');
    const m = zone.match(/ZoneId\s*=\s*(\d+)/i);
    return m ? parseInt(m[1], 10) >= 3 : false;
  } catch {
    return false; // sem stream = arquivo local confiável
  }
}

/** Lê o documento no formato entregue ao renderer: { name, path, bytes, motw }. */
function readDocument(filePath) {
  const bytes = readFileSync(filePath);
  return {
    name: basename(filePath),
    path: filePath,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    motw: hasMarkOfTheWeb(filePath),
  };
}

// Fontes do SO por família: Windows\Fonts + fontes do usuário + cache
// CloudFonts do Office (invisível ao queryLocalFonts). Empacotado, o módulo
// vem em resources (ver "extraResources" no package.json).
const { warmFontIndex, listFontFamilies, resolveFonts } = require(app.isPackaged
  ? join(process.resourcesPath, 'system-fonts.cjs')
  : '../shared/fonts/node/system-fonts.cjs');
handle('uo:resolve-fonts', (_e, families) => resolveFonts(families));
handle('uo:list-fonts', () => listFontFamilies());

// ── Estado do documento por janela ──
// docPath: arquivo atual (Salvar grava nele); known: caminhos que o main
// entregou a esta janela — o renderer só grava sem diálogo num deles.
// Arquivos abertos pelo SO: queue (esperando o renderer assinar onOpenFile,
// ready) → inflight (enviados, esperando o renderer confirmar que carregou,
// uo:file-opened) → só então a janela vira dona do arquivo (adoptPath).
const docState = new WeakMap();
const docStateOf = (win) => {
  let st = docState.get(win);
  if (!st) {
    docState.set(win, (st = {
      docPath: null, known: new Set(), ready: false, queue: [], inflight: new Map(), exports: new Map(),
    }));
  }
  return st;
};
const pathKey = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));

/** Faz `fn` com o AppUserModelID do editor como o do processo (Windows): os
 *  recentes e a Jump List do SO são por AUMID, e cada editor tem o seu. */
function asEditor(kind, fn) {
  if (process.platform !== 'win32' || !EDITORS[kind]) return fn();
  app.setAppUserModelId(aumidOf(kind));
  try { return fn(); } finally { app.setAppUserModelId(SUITE.id); }
}

/** Recentes do SO: lista "Recentes" do Windows (e a categoria da Jump List do
 *  editor), menu Abrir Recente / Dock do macOS. Em dev não polui a lista do electron.exe. */
function addRecent(win, filePath) {
  const kind = kindOfWin(win);
  smokeLog('recent', { path: filePath, kind });
  // a lista do editor (boas-vindas): mais recente primeiro, sem repetir
  if (EDITORS[kind]) {
    const list = (recentsStore[kind] ?? []).filter((r) => pathKey(r.path) !== pathKey(filePath));
    recentsStore[kind] = [{ path: filePath, opened: Date.now() }, ...list].slice(0, RECENTS_MAX);
    writeJson('recents.json', recentsStore);
    broadcastRecents(kind);
  }
  if (!app.isPackaged) return;
  try { asEditor(kind, () => app.addRecentDocument(filePath)); } catch (err) { console.warn('[uo] addRecentDocument:', err?.message); }
}
/** Recentes do editor para as boas-vindas: nome, pasta, quando, se ainda existe. */
function recentsOf(kind) {
  return (recentsStore[kind] ?? []).map((r) => ({
    path: r.path, name: basename(r.path), folder: dirname(r.path), opened: r.opened, exists: existsSync(r.path),
  }));
}
function removeRecent(kind, filePath) {
  recentsStore[kind] = (recentsStore[kind] ?? []).filter((r) => pathKey(r.path) !== pathKey(filePath));
  writeJson('recents.json', recentsStore);
  broadcastRecents(kind);
}
function clearRecents(kind) {
  recentsStore[kind] = [];
  writeJson('recents.json', recentsStore);
  broadcastRecents(kind);
}
function broadcastRecents(kind) {
  for (const w of welcomeWindows(kind)) w.webContents.send('uo:recents-changed');
}

/** A janela passa a ser dona do arquivo: Salvar grava nele, entra nos recentes. */
function adoptPath(win, filePath) {
  if (!win || win.isDestroyed()) return;
  const st = docStateOf(win);
  st.docPath = filePath;
  st.known.add(pathKey(filePath));
  if (process.platform === 'darwin') win.setRepresentedFilename(filePath);
  addRecent(win, filePath);
}

/** Página nova (reload, navegação) ou renderer morto: a página que carregou o
 *  documento acabou. O que foi enviado e não confirmado volta para a fila e
 *  espera um novo onOpenFile; a janela deixa de ser dona do arquivo. */
function resetPage(win, why) {
  const st = docStateOf(win);
  st.ready = false;
  st.queue.unshift(...st.inflight.values());
  st.inflight.clear();
  st.docPath = null;
  st.known.clear();
  st.exports.clear();
  smokeLog('page-reset', { window: win.id, why, queued: st.queue.length });
}

const defaultDir = (win) => {
  const p = win ? docStateOf(win).docPath : null;
  return p ? dirname(p) : app.getPath('documents');
};

// Abrir pelo próprio editor (menu Arquivo → Abrir): os tipos dele
handle('uo:open', async (e) => {
  const ed = editorOf(e);
  const win = senderWin(e);
  const result = await dialog.showOpenDialog(win, {
    title: L().openTitle[ed.kind],
    defaultPath: defaultDir(win),
    filters: [{ name: L().openFilter[ed.kind], extensions: ed.exts }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const doc = readDocument(result.filePaths[0]);
  adoptPath(win, doc.path); // o renderer pediu o arquivo: abrir é a resposta
  return doc;
});

// Write: o outro lado de "Comparar com…". Sem MOTW: o diff é somente leitura,
// não passa pelo Modo Protegido.
handle('uo:open-compare', async (e, title) => {
  if (editorOf(e).kind !== 'write') throw new Error('comparação só no Write');
  const result = await dialog.showOpenDialog(senderWin(e), {
    title: title || L().compareWith,
    filters: [{ name: L().formats.docx, extensions: ['docx'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const bytes = readFileSync(filePath);
  return { name: basename(filePath), bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
});

// ── Arquivos abertos pelo SO (argv, 2ª instância, open-file do macOS) ──
let deliverySeq = 0;
function flushOpenQueue(win) {
  const st = docStateOf(win);
  if (!st.ready || win.isDestroyed()) return;
  for (const doc of st.queue.splice(0)) {
    st.inflight.set(doc.id, doc);
    win.webContents.send('uo:open-file', doc);
    smokeLog('open-file-sent', { window: win.id, kind: kindOfWin(win), id: doc.id, name: doc.name, path: doc.path, size: doc.bytes.byteLength, motw: doc.motw });
  }
}
// O renderer assinou onOpenFile: entrega o que chegou antes dele.
on('uo:open-file-ready', (e) => {
  const win = senderWin(e);
  if (!win) return;
  docStateOf(win).ready = true;
  flushOpenQueue(win);
});
// O renderer carregou (ok) ou recusou o documento entregue.
on('uo:file-opened', (e, id, ok) => {
  const win = senderWin(e);
  if (!win) return;
  const st = docStateOf(win);
  const doc = st.inflight.get(id);
  if (!doc) return; // ack repetido (mais de um assinante) ou de outra página
  st.inflight.delete(id);
  smokeLog('file-opened', { window: win.id, kind: kindOfWin(win), id, ok: !!ok, path: doc.path });
  if (ok) adoptPath(win, doc.path);
});

/** Pode receber um documento no lugar: janela do mesmo editor, renderer
 *  pronto, sem arquivo, sem alterações e nada em trânsito (o "Documento1"
 *  intocado que o Word substitui). */
function isReusable(win, kind) {
  if (kindOfWin(win) !== kind) return false;
  const st = docStateOf(win);
  return st.ready && !st.docPath && st.queue.length === 0 && st.inflight.size === 0 && !closeStateOf(win).dirty;
}

function deliverPath(win, filePath) {
  let doc;
  try { doc = readDocument(filePath); } catch (err) {
    dialog.showErrorBox(displayName(kindOfWin(win)), `${fill(L().openError, { path: filePath })}\n${err?.message ?? err}`);
    return;
  }
  doc.id = ++deliverySeq;
  docStateOf(win).queue.push(doc);
  smokeLog('open-file-queued', { window: win.id, kind: kindOfWin(win), id: doc.id, path: filePath });
  flushOpenQueue(win);
}

const editorWindows = () => BrowserWindow.getAllWindows().filter((w) => EDITORS[kindOfWin(w)]);
const welcomeWindows = (kind) => BrowserWindow.getAllWindows()
  .filter((w) => kindOfWin(w) === 'welcome' && (!kind || welcomeKind.get(w) === kind));
/** Fecha as boas-vindas do editor (ou todas): um documento dele abriu. */
const closeWelcome = (kind) => { for (const w of welcomeWindows(kind)) w.close(); };

/** Abre documentos vindos do SO, cada um no editor da sua extensão: o 1º vai
 *  para a janela focada se ela for do mesmo editor e estiver livre; os demais
 *  (ou se ela tiver documento) abrem em janelas novas. */
async function openPaths(paths) {
  const focused = BrowserWindow.getFocusedWindow();
  let candidate = EDITORS[kindOfWin(focused)] ? focused : editorWindows().at(-1);
  for (const p of paths) {
    const kind = kindOfPath(p);
    if (!kind) continue;
    const win = isReusable(candidate, kind) ? candidate : await createEditorWindow(kind);
    candidate = null;
    deliverPath(win, p);
    if (!SMOKE) focusWindow(win);
    closeWelcome(kind);
  }
}

/** Documento novo no editor: reaproveita uma janela vazia dele, senão abre outra. */
async function openEditor(kind, { newWindow = false } = {}) {
  const free = newWindow ? null : editorWindows().reverse().find((w) => isReusable(w, kind));
  const win = free ?? await createEditorWindow(kind);
  if (!SMOKE) focusWindow(win);
  closeWelcome(kind);
  return win;
}

/** Boas-vindas do editor: reaproveita a que já está aberta. */
async function openWelcome(kind) {
  const open = welcomeWindows(kind)[0];
  if (open) { if (!SMOKE) focusWindow(open); return open; }
  return createWelcomeWindow(kind);
}

function focusWindow(win) {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// Antes do ready (macOS: duplo clique no Finder com o app fechado) os
// caminhos esperam a 1ª janela.
let appReady = false;
const pendingPaths = [];
app.on('open-file', (e, filePath) => {
  e.preventDefault();
  smokeLog('open-file-event', { path: filePath });
  if (appReady) void openPaths([filePath]);
  else pendingPaths.push(filePath);
});

app.on('second-instance', (_e, argv, workingDirectory, additionalData) => {
  const args = Array.isArray(additionalData?.argv) ? additionalData.argv : argv;
  const cwd = typeof additionalData?.cwd === 'string' ? additionalData.cwd : workingDirectory;
  const paths = docPathsFromArgv(args, cwd);
  const kind = appArg(args, typeof additionalData?.app === 'string' ? additionalData.app : null);
  smokeLog('second-instance', { paths, kind });
  if (!appReady) { pendingPaths.push(...paths); return; }
  if (paths.length) void openPaths(paths);
  else if (wantsNewWindow(args)) void openEditor(kind ?? lastEditor(), { newWindow: true });
  else if (kind) void openWelcome(kind);
  else {
    const win = BrowserWindow.getAllWindows().at(-1);
    if (win && !SMOKE) focusWindow(win);
  }
});

// ── Salvar / Salvar como nativos ──
const formatOfPath = (p) => {
  const ext = extname(p).slice(1).toLowerCase();
  return Object.keys(FORMATS).find((k) => FORMATS[k].extensions.includes(ext)) ?? null;
};

function toBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (ArrayBuffer.isView(bytes)) return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TypeError('bytes deve ser ArrayBuffer ou Uint8Array');
}

/** Grava num temporário ao lado e renomeia por cima: uma falha no meio não
 *  deixa o documento truncado. O Mark-of-the-Web (ADS Zone.Identifier) do
 *  original é copiado para o novo — baixado da internet continua marcado.
 *  Arquivo com hard links (nlink > 1) é gravado no lugar, para não separar os
 *  links. Limite conhecido: o rename troca o arquivo, então ACL explícita do
 *  original não passa (o novo herda a da pasta), nem outros ADS além do MOTW. */
function writeFileAtomic(target, buf) {
  let st = null;
  try { st = statSync(target); } catch { /* arquivo novo */ }
  if (st && st.nlink > 1) { writeFileSync(target, buf); return; }
  const tmp = join(dirname(target), `~$${basename(target)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, buf);
    if (st && process.platform === 'win32') {
      // (copyFileSync para um ADS dá EINVAL; ler + gravar o stream funciona)
      let zone = null;
      try { zone = readFileSync(target + ':Zone.Identifier'); } catch { /* sem MOTW */ }
      if (zone) writeFileSync(tmp + ':Zone.Identifier', zone);
    }
    renameSync(tmp, target);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* não chegou a existir */ }
    if (err?.code === 'EPERM' || err?.code === 'EXDEV') writeFileSync(target, buf); // rename barrado (antivírus, outro volume)
    else throw err;
  }
}

handle('uo:save-file', async (e, opts = {}) => {
  const ed = editorOf(e);
  const win = senderWin(e);
  const st = docStateOf(win);
  const buf = toBuffer(opts.bytes);
  const suggestedName = basename(String(opts.suggestedName || `${L().untitled[ed.kind]}.${ed.saveFormats[0]}`));
  // o formato do nome sugerido, se o editor salva nele; senão o padrão do editor
  const named = formatOfPath(suggestedName);
  const fmt = ed.saveFormats.includes(named) ? named : ed.saveFormats[0];
  let target = null;
  if (opts.path) {
    const p = resolve(String(opts.path));
    // só grava sem perguntar num arquivo que o próprio main entregou à janela
    if (!st.known.has(pathKey(p))) throw new Error(`caminho não autorizado para esta janela: ${p}`);
    // .doc/.xls/.ppt aberto e salvo no formato novo: o formato mudou → pergunta onde
    if (formatOfPath(p) === fmt) target = p;
  }
  if (!target) {
    const base = opts.path ? join(dirname(String(opts.path)), suggestedName) : join(defaultDir(win), suggestedName);
    target = await pickSavePath(win, { title: opts.title || L().saveAs, defaultPath: base, formats: [fmt] });
    if (!target) return null;
  }
  writeFileAtomic(target, buf);
  adoptPath(win, target);
  smokeLog('saved', { window: win.id, kind: ed.kind, path: target, size: buf.byteLength });
  return { path: target, name: basename(target) };
});

/** Diálogo Salvar com a extensão garantida. Se o nome digitado não tem uma
 *  extensão dos filtros, o SO confirmou a sobrescrita de OUTRO nome: com a
 *  extensão acrescentada e o arquivo existente, confirma de novo (Não →
 *  reabre o diálogo). Nunca sobrescreve em silêncio. */
async function pickSavePath(win, { title, defaultPath, formats }) {
  for (;;) {
    const r = await dialog.showSaveDialog(win, {
      title, defaultPath,
      filters: formats.map((f) => ({ name: L().formats[f] ?? f.toUpperCase(), extensions: FORMATS[f].extensions })),
      properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (r.canceled || !r.filePath) return null;
    const fmt = formatOfPath(r.filePath);
    if (fmt && formats.includes(fmt)) return r.filePath;
    const filePath = `${r.filePath}.${FORMATS[formats[0]].extensions[0]}`;
    if (!existsSync(filePath)) return filePath;
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title,
      message: fill(L().exists, { name: basename(filePath) }),
      buttons: [L().replace, L().no],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0) return filePath;
    defaultPath = filePath;
  }
}

// ── Exportar ──
// Em duas etapas: o usuário escolhe destino e formato; só então o renderer
// gera os bytes daquele formato. O token amarra a gravação ao destino escolhido.
let exportSeq = 0;
handle('uo:export-pick', async (e, opts = {}) => {
  const ed = editorOf(e);
  const win = senderWin(e);
  const asked = Array.isArray(opts.formats) && opts.formats.length ? opts.formats : ed.defaultExport;
  const formats = asked.map((f) => String(f).toLowerCase()).filter((f) => ed.exportFormats.includes(f));
  if (!formats.length) throw new Error(`formato de exportação inválido: ${asked.join(', ')}`);
  const stem = basename(String(opts.suggestedName || L().untitled[ed.kind])).replace(/\.[^.]+$/, '');
  const filePath = await pickSavePath(win, {
    title: opts.title || L().export,
    defaultPath: join(defaultDir(win), `${stem}.${FORMATS[formats[0]].extensions[0]}`),
    formats,
  });
  if (!filePath) return null;
  const format = formatOfPath(filePath);
  const token = `x${++exportSeq}`;
  docStateOf(win).exports.set(token, { path: filePath, format });
  return { token, path: filePath, name: basename(filePath), format };
});
handle('uo:export-write', (e, token, bytes) => {
  const win = senderWin(e);
  const st = docStateOf(win);
  const pick = st.exports.get(token);
  if (!pick) throw new Error('exportação desconhecida ou já gravada');
  st.exports.delete(token);
  if (bytes == null) return null; // renderer desistiu (falha ao gerar)
  const buf = toBuffer(bytes);
  writeFileAtomic(pick.path, buf);
  smokeLog('exported', { window: win.id, kind: kindOfWin(win), path: pick.path, format: pick.format, size: buf.byteLength });
  return { path: pick.path, name: basename(pick.path), format: pick.format };
});

// ── Imprimir com o diálogo do sistema ──
// Write: sem conteúdo, imprime a própria página; com `html` ou `pages`
// (imagens das páginas "como impressas") imprime-o numa janela oculta. Slides:
// as páginas (um slide por folha, paisagem). Sempre com o diálogo do SO; as
// opções só pré-preenchem. silent/deviceName só existem no smoke.
const PRINT_KEYS = ['copies', 'pageRanges', 'landscape', 'color', 'collate',
  'duplexMode', 'pageSize', 'margins', 'scaleFactor', 'pagesPerSheet', 'dpi', 'header', 'footer',
  ...(SMOKE ? ['silent', 'deviceName'] : [])];
function printContents(wc, opts) {
  return new Promise((done) => {
    wc.print(opts, (success, failureReason) => done({ success, failureReason: success ? undefined : failureReason }));
  });
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function pagesHtml(pages, title, margin) {
  const imgs = pages.map((src) => `<img src="${escapeHtml(src)}">`).join('');
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title || SUITE_NAME)}</title>`
    + `<style>@page{margin:${margin}}html,body{margin:0}img{display:block;width:100%;height:auto;break-after:page}img:last-child{break-after:auto}</style>`
    + `<body>${imgs}</body>`;
}
// Sessão própria da janela de impressão: o HTML vem do renderer e vai para um
// arquivo temporário (data: URL tem limite de ~2 MB e páginas em PNG passam
// disso). Fora o próprio arquivo, nada de file:// nem rede — só data:/blob:.
const printFiles = new Set();
let printSession = null;
function getPrintSession() {
  if (printSession) return printSession;
  printSession = session.fromPartition('uo-print'); // sem "persist:": só em memória
  printSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    const ok = u.startsWith('data:') || u.startsWith('blob:') || u === 'about:blank' || printFiles.has(u);
    if (!ok) smokeLog('print-blocked', { url: u });
    cb({ cancel: !ok });
  });
  return printSession;
}
handle('uo:print', async (e, opts = {}) => {
  const ed = editorOf(e);
  if (!ed.print) throw new Error(`${ed.name}: imprime pelo PDF`);
  const win = senderWin(e);
  const printOpts = { printBackground: true };
  for (const k of PRINT_KEYS) if (opts[k] !== undefined) printOpts[k] = opts[k];
  if (ed.print.landscape !== undefined) printOpts.landscape = opts.landscape !== undefined ? !!opts.landscape : ed.print.landscape;
  printOpts.silent = SMOKE ? !!opts.silent : false;
  let pages = Array.isArray(opts.pages) ? opts.pages.map(String) : null;
  if (ed.print.pagesOnly) {
    pages = (pages ?? []).filter((p) => p.startsWith('data:image/'));
    if (!pages.length) return { success: false, failureReason: 'nothing to print' };
  }
  const html = !ed.print.pagesOnly && typeof opts.html === 'string' ? opts.html
    : pages ? pagesHtml(pages, opts.title, ed.print.margin) : null;
  if (html == null) return printContents(e.sender, printOpts);
  const dir = mkdtempSync(join(tmpdir(), 'uo-print-'));
  const file = join(dir, 'print.html');
  const fileUrl = pathToFileURL(file).href;
  writeFileSync(file, html);
  printFiles.add(fileUrl);
  const pw = new BrowserWindow({
    show: false, parent: win ?? undefined,
    webPreferences: { javascript: false, sandbox: true, session: getPrintSession() },
  });
  try {
    await pw.loadURL(fileUrl); // resolve no load: imagens já decodificadas
    const r = await printContents(pw.webContents, printOpts);
    smokeLog('printed', { window: win?.id, kind: ed.kind, ...r });
    return r;
  } finally {
    printFiles.delete(fileUrl);
    pw.destroy();
    rmSync(dir, { recursive: true, force: true });
  }
});
handle('uo:list-printers', (e) => e.sender.getPrintersAsync());

on('uo:clear-recents', (e) => {
  if (app.isPackaged) asEditor(kindOfWin(senderWin(e)), () => app.clearRecentDocuments());
});

// Usuário do sistema: autor das revisões e dos comentários (o Word usa o nome do Office)
handle('uo:user-name', () => { try { return userInfo().username; } catch { return ''; } });

// ── Confirmação ao fechar com alterações não salvas (como o Office) ──
// O renderer informa o estado (uo:set-dirty — no Slides inclusive uma
// anotação ainda não gravada). No 'close' da janela, se houver alterações:
// Salvar / Não salvar / Cancelar. "Salvar" pede ao renderer
// (uo:save-before-close), que salva e fecha via uo:close-window se gravou;
// cancelou o diálogo de salvar → a janela fica aberta.
const closeState = new WeakMap(); // BrowserWindow → { dirty, name, allowClose, asking }
const closeStateOf = (win) => {
  let st = closeState.get(win);
  if (!st) closeState.set(win, (st = { dirty: false, name: '', allowClose: false, asking: false }));
  return st;
};
on('uo:set-dirty', (e, dirty, name) => {
  const win = senderWin(e);
  if (!win) return;
  const st = closeStateOf(win);
  st.dirty = !!dirty;
  st.name = String(name || '');
  if (process.platform === 'darwin') win.setDocumentEdited(st.dirty);
});
on('uo:close-window', (e) => {
  const win = senderWin(e);
  if (!win) return;
  closeStateOf(win).allowClose = true;
  win.close();
});
function confirmCloseWhenDirty(win) {
  win.on('close', (e) => {
    const st = closeStateOf(win);
    // renderer travado/morto não tem como salvar: não prende a janela
    if (!st.dirty || st.allowClose || win.webContents.isCrashed()) return;
    e.preventDefault();
    if (st.asking) return; // diálogo já aberto (clique duplo no X)
    st.asking = true;
    const kind = kindOfWin(win);
    dialog.showMessageBox(win, {
      type: 'warning',
      title: displayName(kind),
      message: fill(L().savePrompt, { name: st.name || L().untitled[kind] || 'Documento' }),
      detail: L().savePromptDetail,
      buttons: [L().save, L().dontSave, L().cancel],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    }).then(({ response }) => {
      st.asking = false;
      if (response === 1) { st.allowClose = true; win.close(); }
      else if (response === 0) win.webContents.send('uo:save-before-close');
    }, () => { st.asking = false; });
  });
}

// ── Tema claro/escuro ──
// A janela nasce nas cores do tema do SO (nativeTheme, themeSource 'system'),
// na cor da barra do seu editor: sem clarão branco nem barra de título clara
// num SO escuro. A página assume quando informa o tema (uo:title-theme, a cada
// troca — inclusive no modo automático, quando o SO muda); até lá a janela
// acompanha o SO. O Sheet manda também a cor da própria barra (#RRGGBB).
const TITLE_BAR_HEIGHT = 48;
const WELCOME_BAR_HEIGHT = 40;
const WELCOME_THEME = { light: '#FCFCFC', dark: '#131314' }; // = fundo da página de boas-vindas
function themeColors(kind, dark) {
  const t = EDITORS[kind]?.theme ?? WELCOME_THEME;
  const background = dark ? t.dark : t.light;
  return { background, overlay: background, symbol: dark ? '#e3e3e3' : '#1f1f1f' };
}
const appWindows = new Set(); // janelas com titleBarOverlay (não as de impressão/PDF)
const themeFromPage = new WeakSet();
function applyWindowTheme(win, dark, bar) {
  const c = themeColors(kindOfWin(win), dark);
  const own = typeof bar === 'string' && /^#[0-9a-f]{6}$/i.test(bar) ? bar : null;
  const height = kindOfWin(win) === 'welcome' ? WELCOME_BAR_HEIGHT : TITLE_BAR_HEIGHT;
  win.setTitleBarOverlay({ color: own ?? c.overlay, symbolColor: c.symbol, height });
  win.setBackgroundColor(own ?? c.background);
}
nativeTheme.on('updated', () => {
  for (const win of appWindows) {
    if (!win.isDestroyed() && !themeFromPage.has(win)) applyWindowTheme(win, nativeTheme.shouldUseDarkColors);
  }
});
handle('uo:title-theme', (e, dark, bar) => {
  const win = senderWin(e);
  if (!win || !appWindows.has(win)) return;
  themeFromPage.add(win);
  applyWindowTheme(win, !!dark, bar);
});

// ── Navegação e pop-ups ──
// Nenhum conteúdo navega para fora da origem do app. Pop-ups por editor:
// Write — só about:blank e a própria origem (a janela de impressão do demo);
// Sheet e Slides — o PDF de "Imprimir" (blob: da origem) numa janela do app, e
// links http(s)/mailto no navegador do sistema (nunca numa janela Electron).
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (ev, url) => {
    const target = typeof url === 'string' ? url : ev.url;
    if (!isAppUrl(target)) { ev.preventDefault(); smokeLog('navigation-blocked', { url: target }); }
  });
  contents.setWindowOpenHandler(({ url }) => {
    const ed = EDITORS[kindOfWin(BrowserWindow.fromWebContents(contents))];
    if (ed?.popups === 'same-origin' && (url === 'about:blank' || url === '' || isAppUrl(url))) {
      return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { sandbox: true, contextIsolation: true } } };
    }
    if (ed?.popups === 'blob-pdf') {
      if (url.startsWith(`blob:${appOrigin()}/`)) {
        return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { sandbox: true, contextIsolation: true, plugins: true } } };
      }
      if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    }
    smokeLog('window-open-blocked', { url });
    return { action: 'deny' };
  });
});

// ── Servidor das páginas ──
// Empacotado: resources/ (packages/<editor>/demo, welcome, icons, fonts). Em dev:
// as pastas dos produtos no repositório. As fontes abertas vão UMA vez só
// (resources/fonts) e atendem os três editores: /packages/<editor>/demo/fonts/x.
const REPO = join(__dirname, '..');
const ROOT = app.isPackaged ? process.resourcesPath : REPO;
const FONTS_DIR = app.isPackaged ? join(process.resourcesPath, 'fonts') : join(REPO, 'shared', 'fonts', 'files');
const ICONS_DIR = app.isPackaged ? join(process.resourcesPath, 'icons') : join(__dirname, 'build', 'editor-icons');
const ROUTES = app.isPackaged
  ? { '/packages/editor/': 'packages/editor/', '/packages/sheet/': 'packages/sheet/', '/packages/slides/': 'packages/slides/', '/welcome/': 'welcome/', '/icons/': 'icons/' }
  : { '/packages/editor/': 'write/packages/editor/', '/packages/sheet/': 'sheet/packages/sheet/', '/packages/slides/': 'slides/packages/slides/', '/welcome/': 'desktop/welcome/', '/icons/': 'desktop/build/editor-icons/' };
const FONT_URL = /^\/packages\/(editor|sheet|slides)\/demo\/fonts\/(.+)$/;
const KIND_OF_DEMO = { editor: 'write', sheet: 'sheet', slides: 'slides' };

/** Arquivo dentro de `base` (nada de ../ para fora), ou null. */
function inside(base, rel) {
  const root = normalize(base + sep);
  const p = normalize(join(base, rel));
  return p.startsWith(root) ? p : null;
}
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

/** URL → arquivo existente (índice de pasta = index.html), ou null. */
function fileForUrl(pathname, referer) {
  const font = FONT_URL.exec(pathname);
  const candidates = [];
  const route = Object.keys(ROUTES).find((r) => pathname.startsWith(r));
  if (route) candidates.push(inside(join(ROOT, ROUTES[route]), pathname.slice(route.length)));
  if (font) candidates.push(inside(FONTS_DIR, font[2]));
  // dev: /samples/… é a pasta samples do produto da página que pediu
  if (!app.isPackaged && pathname.startsWith('/samples/') && !skipSamples) {
    const m = /^\/packages\/(editor|sheet|slides)\//.exec(referer);
    if (m) candidates.push(inside(join(REPO, EDITORS[KIND_OF_DEMO[m[1]]].devRoot, 'samples'), pathname.slice(9)));
  }
  for (const c of candidates) {
    if (!c) continue;
    try {
      const st = statSync(c);
      const file = st.isDirectory() ? join(c, 'index.html') : c;
      if (isFile(file)) return file;
    } catch { /* próximo */ }
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
};

// Fontes proprietárias que as páginas do Sheet e do Slides referenciam por
// arquivo (aptos-*.ttf, fonts/os/arial-*…) não vêm no app — a licença não
// permite redistribuir o arquivo. Pedido de uma delas: a fonte instalada no SO
// com esse nome (lida em tempo de execução, nunca copiada) ou, sem ela, a
// substituta aberta Liberation Sans. (No Write o 404 é o sinal para a página
// usar as substitutas métricas do catálogo — não há essa troca.)
const FONT_STYLES = { regular: [false, false], bold: [true, false], italic: [false, true], bolditalic: [true, true] };
async function osFontFallback(demo, path) {
  const m = /^([a-z0-9-]+?)-(regular|bold|italic|bolditalic)\.ttf$/.exec(basename(path).toLowerCase());
  if (!m) return null;
  const [bold, italic] = FONT_STYLES[m[2]];
  const family = m[1].replace(/-/g, ' ');
  try {
    const faces = await resolveFonts([family]);
    const face = faces.find((f) => !!f.bold === bold && (f.style === 'italic') === italic)
      ?? faces.find((f) => (f.style === 'italic') === italic) ?? faces[0];
    if (face) return Buffer.from(face.bytes);
  } catch { /* índice das fontes do SO indisponível */ }
  const liberation = fileForUrl(`/packages/${demo}/demo/fonts/liberationsans-${m[2]}.ttf`, '');
  try { return liberation ? readFileSync(liberation) : null; } catch { return null; }
}

// Arquivo pedido pelo SO na abertura: as páginas não carregam o documento de
// exemplo (/samples, só existe em dev) por cima dele.
let skipSamples = false;

function serve() {
  return new Promise((done) => {
    const server = http.createServer(async (req, res) => {
      // só o próprio app: Host diferente = outra origem (DNS rebinding)
      const host = req.headers.host ?? '';
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
      let pathname;
      let referer = '';
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (req.headers.referer) referer = new URL(req.headers.referer).pathname;
      } catch { res.writeHead(400).end(); return; } // %-escape inválido etc.
      const headers = (file) => ({
        'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      const file = fileForUrl(pathname, referer);
      if (file) {
        res.writeHead(200, headers(file));
        createReadStream(file).on('error', () => res.destroy()).pipe(res);
        return;
      }
      const font = FONT_URL.exec(pathname);
      const ed = font ? EDITORS[KIND_OF_DEMO[font[1]]] : null;
      const bytes = ed?.osFontFallback ? await osFontFallback(font[1], pathname) : null;
      if (bytes) res.writeHead(200, headers(pathname)).end(bytes);
      else res.writeHead(404).end('not found');
    });
    // porta FIXA preferida: o localStorage/IndexedDB das páginas é por origem —
    // com porta aleatória, dicionário do usuário, Documentos Confiáveis,
    // recentes e preferências sumiriam a cada execução. Ocupada: a próxima; por
    // fim, qualquer.
    const ports = [...Array.from({ length: 10 }, (_, i) => PREFERRED_PORT + i), 0];
    const tryNext = () => {
      const p = ports.shift();
      server.once('error', (err) => { if (err.code === 'EADDRINUSE' && ports.length) tryNext(); else throw err; });
      server.listen(p, '127.0.0.1', () => { server.removeAllListeners('error'); port = server.address().port; done(port); });
    };
    tryNext();
  });
}
const PREFERRED_PORT = 47810;

// ── Janelas ──
const iconFile = (kind, ext) => {
  const p = join(ICONS_DIR, `${kind}.${ext}`);
  return existsSync(p) ? p : undefined;
};
/** Linha de comando que reabre o editor (atalho fixado na barra de tarefas). */
function relaunchCommand(kind) {
  const exe = `"${process.execPath}"`;
  return app.isPackaged ? `${exe} --editor=${kind}` : `${exe} "${app.getAppPath()}" --editor=${kind}`;
}

/** Windows: cada editor com o seu AppUserModelID — ícone, nome e grupo próprios
 *  na barra de tarefas (as boas-vindas agrupam com o editor delas); fixar a
 *  janela relança o mesmo editor. */
function applyIdentity(win, kind) {
  if (process.platform !== 'win32') return;
  win.setAppDetails({
    appId: aumidOf(kind),
    appIconPath: iconFile(kind, 'ico') ?? process.execPath,
    appIconIndex: 0,
    relaunchCommand: relaunchCommand(kind),
    relaunchDisplayName: displayName(kind),
  });
}

/** Título da janela: "<documento> — Universal Write (Beta)" (o demo põe "— Write"). */
function windowTitle(kind, pageTitle) {
  const word = EDITORS[kind].word;
  const doc = String(pageTitle || '').replace(new RegExp(`\\s+[—-]\\s+(Universal\\s*)?${word}$`, 'i'), '').trim();
  return doc && !new RegExp(`^(Universal\\s*)?${word}$`, 'i').test(doc) ? `${doc} — ${displayName(kind)}` : displayName(kind);
}

async function createEditorWindow(kind) {
  const ed = EDITORS[kind];
  const initial = themeColors(kind, nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    ...ed.size,
    show: false,
    title: displayName(kind),
    backgroundColor: initial.background,
    icon: iconFile(kind, process.platform === 'win32' ? 'ico' : 'png'), // macOS usa o do bundle
    // Barra de título mesclada: a janela é frameless e a linha de título da
    // barra do editor vira a barra da janela (região arrastável .uo-wco, ligada
    // pela página com windowControlsOverlay). Os controles do SO ficam
    // sobrepostos via titleBarOverlay.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: initial.overlay, symbolColor: initial.symbol, height: TITLE_BAR_HEIGHT },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: ed.chromiumSpellcheck,
    },
  });
  winKind.set(win, kind);
  applyIdentity(win, kind);
  setLastEditor(kind);
  win.on('focus', () => setLastEditor(kind));
  win.removeMenu();
  appWindows.add(win);
  win.on('closed', () => appWindows.delete(win));
  win.on('page-title-updated', (e, title) => { e.preventDefault(); win.setTitle(windowTitle(kind, title)); });
  confirmCloseWhenDirty(win);
  docStateOf(win);
  win.webContents.on('did-start-navigation', (ev, _url, isInPlace, isMainFrame) => {
    const main = ev?.isMainFrame ?? isMainFrame;
    const sameDoc = ev?.isSameDocument ?? isInPlace;
    if (main && !sameDoc) resetPage(win, 'navigation');
  });
  win.webContents.on('render-process-gone', (_ev, details) => resetPage(win, `render-process-gone:${details?.reason}`));
  // menu Idioma do editor (a cada carga da página)
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(languageMenuScript(kind))
      .then((ok) => smokeLog('language-menu', { window: win.id, kind, ok }))
      .catch((err) => smokeLog('language-menu-error', { window: win.id, msg: String(err) }));
  });
  instrument(win);
  smokeLog('window-created', { window: win.id, kind });
  if (!SMOKE) win.show();
  await win.loadURL(`${appOrigin()}${ed.demo}`);
  return win;
}

/** Boas-vindas do editor (como as das IDEs da JetBrains): ícone, nome e versão,
 *  novo documento, Abrir…, os recentes do editor (pesquisa, abrir, remover,
 *  limpar; os que sumiram aparecem indisponíveis) e o idioma. Página leve:
 *  nada do editor é carregado até abrir um documento. */
async function createWelcomeWindow(kind) {
  // sem moldura, com os controles do SO sobrepostos (como os editores): a
  // página desenha a faixa de título arrastável e segue o tema da janela
  const initial = themeColors(null, nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    width: 880,
    height: 600,
    minWidth: 640,
    minHeight: 460,
    show: false,
    title: displayName(kind),
    backgroundColor: initial.background,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: initial.overlay, symbolColor: initial.symbol, height: WELCOME_BAR_HEIGHT },
    icon: iconFile(kind, process.platform === 'win32' ? 'ico' : 'png'),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  winKind.set(win, 'welcome');
  welcomeKind.set(win, kind);
  applyIdentity(win, kind);
  setLastEditor(kind);
  win.removeMenu();
  appWindows.add(win);
  win.on('closed', () => appWindows.delete(win));
  instrument(win);
  smokeLog('window-created', { window: win.id, kind: 'welcome', editor: kind });
  if (!SMOKE) win.show();
  await win.loadURL(`${appOrigin()}/welcome/index.html?app=${kind}`);
  return win;
}

/** Editor das boas-vindas que chamou; IPC de outra janela é recusado. */
function welcomeOf(e) {
  const win = senderWin(e);
  const kind = kindOfWin(win) === 'welcome' ? welcomeKind.get(win) : null;
  if (!EDITORS[kind]) throw new Error('só nas boas-vindas');
  return { win, kind };
}
handle('uo:welcome-info', (e) => {
  const { kind } = welcomeOf(e);
  const m = L();
  return {
    kind, name: displayName(kind), version: DISPLAY_VERSION, lang: uiLang(), accent: EDITORS[kind].color,
    langs: LANGS.map((id) => ({ id, name: LANG_NAMES[id] })),
    strings: { ...m.welcome, newItem: m.newItem[kind] },
    editors: KINDS.filter((k) => k !== kind).map((k) => ({ kind: k, name: displayName(k) })),
  };
});
handle('uo:welcome-recents', (e) => recentsOf(welcomeOf(e).kind));
handle('uo:welcome-new', async (e) => {
  const { win, kind } = welcomeOf(e);
  await openEditor(kind, { newWindow: true });
  if (!win.isDestroyed()) win.close();
});
handle('uo:welcome-open', async (e) => {
  const { win, kind } = welcomeOf(e);
  const m = L();
  const result = await dialog.showOpenDialog(win, {
    title: m.openTitle[kind],
    defaultPath: app.getPath('documents'),
    filters: [
      { name: m.openFilter[kind], extensions: EDITORS[kind].exts },
      { name: m.officeFiles, extensions: KINDS.flatMap((k) => EDITORS[k].exts) },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled || result.filePaths.length === 0) return false;
  await openPaths(result.filePaths);
  if (!win.isDestroyed()) win.close();
  return true;
});
handle('uo:welcome-open-recent', async (e, filePath) => {
  const { win, kind } = welcomeOf(e);
  // só um caminho da lista deste editor (a página não abre caminho qualquer)
  const entry = (recentsStore[kind] ?? []).find((r) => pathKey(r.path) === pathKey(String(filePath)));
  if (!entry || !existsSync(entry.path)) return false;
  await openPaths([entry.path]);
  if (!win.isDestroyed()) win.close();
  return true;
});
handle('uo:welcome-remove-recent', (e, filePath) => removeRecent(welcomeOf(e).kind, String(filePath)));
handle('uo:welcome-clear-recents', (e) => clearRecents(welcomeOf(e).kind));
// avisos de licença do que o app embarca (resources/licenses), no visualizador do sistema
const LICENSES_DIR = app.isPackaged ? join(process.resourcesPath, 'licenses') : join(__dirname, 'build', 'licenses');
handle('uo:welcome-licenses', async (e) => {
  welcomeOf(e);
  const err = await shell.openPath(join(LICENSES_DIR, 'THIRD-PARTY-NOTICES.txt'));
  if (err) await shell.openPath(LICENSES_DIR);
});
handle('uo:welcome-show', async (e, other) => {
  const { win } = welcomeOf(e);
  if (!EDITORS[other]) throw new Error(`editor desconhecido: ${other}`);
  await openWelcome(other);
  if (!win.isDestroyed()) win.close();
});

// ── Idioma da interface ──
// O preload pede o idioma de forma síncrona (o `lang` do editor entra antes de
// o componente montar a barra); a troca vem das boas-vindas ou do menu Idioma
// do editor e vale para todas as janelas na hora.
ipcMain.on('uo:get-lang', (e) => { e.returnValue = fromApp(e) ? uiLang() : null; });
handle('uo:set-lang', (_e, lang) => setUiLang(lang));
function setUiLang(lang) {
  const l = normalizeLang(lang);
  if (!l) throw new Error(`idioma desconhecido: ${lang}`);
  settings.lang = l;
  writeJson('settings.json', settings);
  smokeLog('language', { lang: l });
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('uo:lang', l);
  setupJumpLists();
  return l;
}

/** Menu Idioma no editor, pela API de plugins do próprio componente (`use`):
 *  na barra compacta antes de Ajuda; na ribbon, na guia Exibir. */
function languageMenuScript(kind) {
  const tag = { write: 'universal-write', sheet: 'universal-sheet', slides: 'universal-slides' }[kind];
  const label = { en: messages('en-US').menuLanguage, pt: messages('pt-BR').menuLanguage, es: messages('es').menuLanguage };
  return `(async () => {
    await customElements.whenDefined(${JSON.stringify(tag)});
    const el = document.querySelector(${JSON.stringify(tag)});
    if (!el || typeof el.use !== 'function' || el.__uoLanguageMenu) return false;
    el.__uoLanguageMenu = true;
    const bridge = window[${JSON.stringify(EDITORS[kind].bridge)}];
    const commands = ${JSON.stringify(LANGS.map((id) => [id, LANG_NAMES[id]]))}.map(([id, name]) => ({
      id: 'uo:lang-' + id, label: { en: name, pt: name, es: name },
      isChecked: () => (el.getAttribute('lang') || '') === id,
      run: () => bridge.setUiLanguage(id),
    }));
    const label = ${JSON.stringify(label)};
    el.use({ id: 'universal-office.language', toolbar: () => ({
      commands,
      compact: { menus: [{ id: 'uo-language', label, items: commands.map((c) => c.id), before: 'help' }] },
      ribbon: { groups: [{ tab: 'view', id: 'uo-language', label, cells: commands.map((c) => c.id) }] },
    }) });
    return true;
  })()`;
}

/** Smoke: mensagens '[smoke] …' do renderer no log e a sonda injetada a cada carga. */
function instrument(win) {
  if (!SMOKE) return;
  win.webContents.on('console-message', (ev) => {
    const msg = ev.message;
    if (typeof msg === 'string' && msg.startsWith('[smoke]')) smokeLog('renderer', { window: win.id, kind: kindOfWin(win), msg: msg.slice(8) });
  });
  if (SMOKE_RENDERER) {
    // reinjeta a cada carga (o smoke testa reload)
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(readFileSync(SMOKE_RENDERER, 'utf8')).catch((err) => smokeLog('probe-error', { msg: String(err) }));
    });
  }
}

/** Jump List de cada editor (Windows): "Recentes" (o SO só lista os tipos
 *  registrados para o app — fileAssociations do instalador) + a tarefa
 *  "Novo …", que reentra pela instância única com --editor=<editor> --new-window. */
function setupJumpLists() {
  if (process.platform !== 'win32' || SMOKE) return;
  for (const kind of KINDS) {
    const ed = EDITORS[kind];
    const args = `${app.isPackaged ? '' : `"${app.getAppPath()}" `}--editor=${kind} --new-window`;
    const result = asEditor(kind, () => app.setJumpList([
      { type: 'recent' },
      {
        type: 'tasks',
        items: [{
          type: 'task', title: L().newItem[kind], description: fill(L().jumpDesc, { name: displayName(kind) }),
          program: process.execPath, args, iconPath: iconFile(kind, 'ico') ?? process.execPath, iconIndex: 0,
        }],
      },
    ]));
    if (result !== 'ok') console.warn(`[uo] setJumpList (${kind}):`, result);
  }
}

if (process.platform === 'win32') app.setAppUserModelId(SUITE.id);
app.setAboutPanelOptions({
  applicationName: SUITE_NAME,
  applicationVersion: DISPLAY_VERSION,
  version: '',
  copyright: 'Copyright © 2026 Eric Kono — MIT License',
  credits: 'Third-party notices: resources/licenses/THIRD-PARTY-NOTICES.txt',
  website: PKG.homepage,
});

app.whenReady().then(async () => {
  await serve();
  setupJumpLists();
  const initial = [...pendingPaths.splice(0), ...docPathsFromArgv(process.argv, process.cwd())];
  const kind = appArg(process.argv);
  skipSamples = initial.length > 0;
  smokeLog('ready', { paths: initial, kind, lang: uiLang() });
  if (initial.length) await openPaths(initial);
  else if (wantsNewWindow(process.argv)) await openEditor(kind ?? lastEditor(), { newWindow: true });
  else await openWelcome(kind ?? lastEditor());
  appReady = true;
  warmFontIndex(); // índice das fontes do SO pronto antes do 1º documento pedir
  // chegaram (2ª instância/open-file) enquanto a 1ª janela carregava
  if (pendingPaths.length) await openPaths(pendingPaths.splice(0));
});

app.on('window-all-closed', () => app.quit());
