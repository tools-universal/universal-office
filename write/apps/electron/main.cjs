// Shell Electron do UniversalWrite — v1: embarca o demo do <universal-write> servindo a
// raiz do repositório por um servidor estático interno (fetch de docx/fontes
// não funciona via file://).
//
// Integração com o SO (como o Word): instância única, abrir pela linha de
// comando / associação de arquivo / open-file (macOS), recentes do SO e Jump
// List, Salvar/Salvar como/Exportar nativos e impressão com o diálogo do
// sistema. A superfície exposta ao renderer está documentada em preload.cjs.
const { app, BrowserWindow, ipcMain, dialog, nativeImage, nativeTheme, session } = require('electron');
const http = require('node:http');
const {
  createReadStream, statSync, readFileSync, writeFileSync, existsSync,
  appendFileSync, renameSync, unlinkSync, mkdtempSync, rmSync,
} = require('node:fs');
const { join, normalize, extname, basename, dirname, resolve } = require('node:path');
const { tmpdir, userInfo } = require('node:os');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.tools-universal.universal-write'; // = build.appId (package.json)
// Nome exibido com o canal ("Universal Write (Beta)", versão "0.9.1 beta");
// productName (pasta de instalação, perfil, appId) fica estável para a versão
// final atualizar no lugar.
const PKG = require('./package.json');
const DISPLAY_NAME = PKG.displayName || PKG.productName || 'Universal Write';
const DISPLAY_VERSION = PKG.releaseChannel ? `${PKG.version} ${PKG.releaseChannel}` : PKG.version;

// ── Modo de teste (smoke) — só fora do app empacotado ──
// WN_USER_DATA isola o perfil (e com ele o lock de instância única) do app do
// usuário; WN_SMOKE_LOG grava os eventos em JSON por linha, as janelas não
// aparecem (nada de roubar o foco) e os recentes/Jump List do SO não são
// tocados; WN_SMOKE_RENDERER é um script injetado em cada janela depois de
// carregar (console.log '[smoke] …' do renderer vai para o log).
const DEV = !app.isPackaged;
const devEnv = (name) => (DEV ? process.env[name] || '' : '');
if (devEnv('WN_USER_DATA')) app.setPath('userData', devEnv('WN_USER_DATA'));
const SMOKE_LOG = devEnv('WN_SMOKE_LOG');
const SMOKE_RENDERER = devEnv('WN_SMOKE_RENDERER');
const SMOKE = !!SMOKE_LOG;
function smokeLog(event, data = {}) {
  if (!SMOKE) return;
  appendFileSync(SMOKE_LOG, JSON.stringify({ t: Date.now(), pid: process.pid, event, ...data }) + '\n');
}

// ── Instância única ──
// A 2ª execução (duplo clique num .docx com o app aberto, Jump List…) entrega
// argv + cwd à 1ª por additionalData (no Windows o argv do evento pode vir com
// switches do Chromium inseridos) e sai.
const DOC_EXTS = new Set(['.docx', '.doc', '.odt']);
if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd() })) {
  smokeLog('forwarded', { argv: process.argv.slice(1) });
  app.quit();
  return; // (CommonJS: return no topo encerra o módulo)
}

/** Documentos pedidos na linha de comando: caminhos (relativos ao cwd de quem
 *  chamou) de arquivos existentes com extensão de documento. */
function docPathsFromArgv(argv, cwd) {
  const out = [];
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    const p = resolve(cwd || process.cwd(), arg);
    if (!DOC_EXTS.has(extname(p).toLowerCase())) continue;
    try { if (statSync(p).isFile()) out.push(p); } catch { /* não existe */ }
  }
  return out;
}
const wantsNewWindow = (argv) => argv.includes('--new-window');

// ── Origem do app e guarda do IPC ──
// O renderer é servido em http://127.0.0.1:<porta>; só frames dessa origem
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
  : '../../../shared/fonts/node/system-fonts.cjs');
handle('wn:resolve-fonts', (_e, families) => resolveFonts(families));
handle('wn:list-fonts', () => listFontFamilies());

// ── Estado do documento por janela ──
// docPath: arquivo atual (Salvar grava nele); known: caminhos que o main
// entregou a esta janela — o renderer só grava sem diálogo num deles.
// Arquivos abertos pelo SO: queue (esperando o renderer assinar onOpenFile,
// ready) → inflight (enviados, esperando o renderer confirmar que carregou,
// wn:file-opened) → só então a janela vira dona do arquivo (adoptPath).
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

/** Recentes do SO: lista "Recentes" do Windows (e a categoria da Jump List),
 *  menu Abrir Recente / Dock do macOS. Em dev não polui a lista do electron.exe. */
function addRecent(filePath) {
  smokeLog('recent', { path: filePath });
  if (!app.isPackaged) return;
  try { app.addRecentDocument(filePath); } catch (err) { console.warn('[wn] addRecentDocument:', err?.message); }
}

/** A janela passa a ser dona do arquivo: Salvar grava nele, entra nos recentes. */
function adoptPath(win, filePath) {
  if (!win || win.isDestroyed()) return;
  const st = docStateOf(win);
  st.docPath = filePath;
  st.known.add(pathKey(filePath));
  if (process.platform === 'darwin') win.setRepresentedFilename(filePath);
  addRecent(filePath);
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

handle('wn:open-docx', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Abrir documento',
    filters: [{ name: 'Documentos', extensions: ['docx', 'doc', 'odt'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const doc = readDocument(result.filePaths[0]);
  adoptPath(win, doc.path); // o renderer pediu o arquivo: abrir é a resposta
  return doc;
});

// Segundo documento para a comparação ("Comparar com…"). Sem MOTW: o diff é
// somente leitura, não passa pelo Modo Protegido.
handle('wn:open-docx-compare', async (e, title) => {
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: title || 'Comparar com…',
    filters: [{ name: 'Documento do Word', extensions: ['docx'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const bytes = readFileSync(filePath);
  return {
    name: basename(filePath),
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
});

// ── Arquivos abertos pelo SO (argv, 2ª instância, open-file do macOS) ──
let deliverySeq = 0;
function flushOpenQueue(win) {
  const st = docStateOf(win);
  if (!st.ready || win.isDestroyed()) return;
  for (const doc of st.queue.splice(0)) {
    st.inflight.set(doc.id, doc);
    win.webContents.send('wn:open-file', doc);
    smokeLog('open-file-sent', { window: win.id, id: doc.id, name: doc.name, path: doc.path, size: doc.bytes.byteLength, motw: doc.motw });
  }
}
// O renderer assinou onOpenFile: entrega o que chegou antes dele.
on('wn:open-file-ready', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  docStateOf(win).ready = true;
  flushOpenQueue(win);
});
// O renderer carregou (ok) ou recusou o documento entregue.
on('wn:file-opened', (e, id, ok) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const st = docStateOf(win);
  const doc = st.inflight.get(id);
  if (!doc) return; // ack repetido (mais de um assinante) ou de outra página
  st.inflight.delete(id);
  smokeLog('file-opened', { window: win.id, id, ok: !!ok, path: doc.path });
  if (ok) adoptPath(win, doc.path);
});

/** Pode receber um documento no lugar: renderer pronto, sem arquivo, sem
 *  alterações e nada em trânsito (o "Documento1" intocado que o Word
 *  substitui). Janela sem assinante de onOpenFile não é reaproveitada. */
function isReusable(win) {
  if (!win || win.isDestroyed()) return false;
  const st = docStateOf(win);
  return st.ready && !st.docPath && st.queue.length === 0 && st.inflight.size === 0 && !closeStateOf(win).dirty;
}

function deliverPath(win, filePath) {
  let doc;
  try { doc = readDocument(filePath); } catch (err) {
    dialog.showErrorBox(DISPLAY_NAME, `Não foi possível abrir "${filePath}".\n${err?.message ?? err}`);
    return;
  }
  doc.id = ++deliverySeq;
  docStateOf(win).queue.push(doc);
  smokeLog('open-file-queued', { window: win.id, id: doc.id, path: filePath });
  flushOpenQueue(win);
}

/** Abre documentos vindos do SO: o 1º vai para a janela focada se ela estiver
 *  livre; os demais (ou se ela tiver documento) abrem em janelas novas. */
async function openPaths(paths) {
  let candidate = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().at(-1);
  for (const p of paths) {
    const win = isReusable(candidate) ? candidate : await createWindow();
    candidate = null;
    deliverPath(win, p);
    if (!SMOKE) focusWindow(win);
  }
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
  smokeLog('second-instance', { paths });
  if (!appReady) { pendingPaths.push(...paths); return; }
  if (paths.length) void openPaths(paths);
  else if (wantsNewWindow(args)) void createWindow().then((w) => { if (!SMOKE) focusWindow(w); });
  else {
    const win = BrowserWindow.getAllWindows().at(-1);
    if (win && !SMOKE) focusWindow(win);
  }
});

// ── Salvar / Salvar como nativos ──
const FORMATS = {
  docx: { name: 'Documento do Word', extensions: ['docx'] },
  doc: { name: 'Documento do Word 97-2003', extensions: ['doc'] },
  odt: { name: 'Texto OpenDocument', extensions: ['odt'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  html: { name: 'Página da Web', extensions: ['html', 'htm'] },
  xps: { name: 'Documento XPS', extensions: ['xps'] },
  rtf: { name: 'Rich Text Format', extensions: ['rtf'] },
  txt: { name: 'Texto sem formatação', extensions: ['txt'] },
};
const EXPORT_FORMATS = ['pdf', 'html', 'odt', 'xps'];
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

const defaultDir = (win) => {
  const p = win ? docStateOf(win).docPath : null;
  return p ? dirname(p) : app.getPath('documents');
};

handle('wn:save-file', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = docStateOf(win);
  const buf = toBuffer(opts.bytes);
  const suggestedName = basename(String(opts.suggestedName || 'Documento.docx'));
  const fmt = formatOfPath(suggestedName) ?? 'docx';
  let target = null;
  if (opts.path) {
    const p = resolve(String(opts.path));
    // só grava sem perguntar num arquivo que o próprio main entregou à janela
    if (!st.known.has(pathKey(p))) throw new Error(`caminho não autorizado para esta janela: ${p}`);
    // .doc aberto e salvo como .docx: o formato mudou → pergunta onde (como o Word)
    if (formatOfPath(p) === fmt) target = p;
  }
  if (!target) {
    const base = opts.path ? join(dirname(String(opts.path)), suggestedName) : join(defaultDir(win), suggestedName);
    target = await pickSavePath(win, {
      title: opts.title || 'Salvar como',
      defaultPath: base,
      formats: [fmt],
    });
    if (!target) return null;
  }
  writeFileAtomic(target, buf);
  adoptPath(win, target);
  smokeLog('saved', { window: win.id, path: target, size: buf.byteLength });
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
      filters: formats.map((f) => FORMATS[f]),
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
      message: `"${basename(filePath)}" já existe. Deseja substituí-lo?`,
      buttons: ['Substituir', 'Não'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0) return filePath;
    defaultPath = filePath;
  }
}

// ── Exportar (PDF/HTML/ODT/XPS) ──
// Em duas etapas: o usuário escolhe destino e formato; só então o renderer
// gera os bytes daquele formato. O token amarra a gravação ao destino escolhido.
let exportSeq = 0;
handle('wn:export-pick', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const formats = (Array.isArray(opts.formats) && opts.formats.length ? opts.formats : EXPORT_FORMATS)
    .map((f) => String(f).toLowerCase()).filter((f) => FORMATS[f]);
  if (!formats.length) throw new Error('nenhum formato de exportação válido');
  const stem = basename(String(opts.suggestedName || 'Documento')).replace(/\.[^.]+$/, '');
  const filePath = await pickSavePath(win, {
    title: opts.title || 'Exportar',
    defaultPath: join(defaultDir(win), `${stem}.${FORMATS[formats[0]].extensions[0]}`),
    formats,
  });
  if (!filePath) return null;
  const format = formatOfPath(filePath);
  const token = `x${++exportSeq}`;
  docStateOf(win).exports.set(token, { path: filePath, format });
  return { token, path: filePath, name: basename(filePath), format };
});
handle('wn:export-write', (e, token, bytes) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = docStateOf(win);
  const pick = st.exports.get(token);
  if (!pick) throw new Error('exportação desconhecida ou já gravada');
  st.exports.delete(token);
  if (bytes == null) return null; // renderer desistiu (falha ao gerar)
  const buf = toBuffer(bytes);
  writeFileAtomic(pick.path, buf);
  smokeLog('exported', { window: win.id, path: pick.path, format: pick.format, size: buf.byteLength });
  return { path: pick.path, name: basename(pick.path), format: pick.format };
});

// ── Imprimir com o diálogo do sistema ──
// Sem conteúdo, imprime a própria página; com `html` ou `pages` (imagens das
// páginas "como impressas"), imprime-o numa janela oculta. Sempre com o
// diálogo do SO (impressora, cópias, intervalo); as opções só pré-preenchem.
// silent/deviceName só existem no smoke (imprimir sem o usuário ver, não).
const PRINT_KEYS = ['copies', 'pageRanges', 'landscape', 'color', 'collate',
  'duplexMode', 'pageSize', 'margins', 'scaleFactor', 'pagesPerSheet', 'dpi', 'header', 'footer',
  ...(SMOKE ? ['silent', 'deviceName'] : [])];
function printContents(wc, opts) {
  return new Promise((done) => {
    wc.print(opts, (success, failureReason) => done({ success, failureReason: success ? undefined : failureReason }));
  });
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function pagesHtml(pages, title) {
  const imgs = pages.map((src) => `<img src="${escapeHtml(src)}">`).join('');
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title || 'Universal Write')}</title>`
    + '<style>@page{margin:0}html,body{margin:0}img{display:block;width:100%;break-after:page}</style>'
    + `<body>${imgs}</body>`;
}
// Sessão própria da janela de impressão: o HTML vem do renderer e vai para um
// arquivo temporário (data: URL tem limite de ~2 MB e páginas em PNG passam
// disso). Fora o próprio arquivo, nada de file:// nem rede — só data:/blob:.
const printFiles = new Set();
let printSession = null;
function getPrintSession() {
  if (printSession) return printSession;
  printSession = session.fromPartition('uw-print'); // sem "persist:": só em memória
  printSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    const ok = u.startsWith('data:') || u.startsWith('blob:') || u === 'about:blank' || printFiles.has(u);
    if (!ok) smokeLog('print-blocked', { url: u });
    cb({ cancel: !ok });
  });
  return printSession;
}
handle('wn:print', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const printOpts = { printBackground: true };
  for (const k of PRINT_KEYS) if (opts[k] !== undefined) printOpts[k] = opts[k];
  printOpts.silent = SMOKE ? !!opts.silent : false;
  const html = typeof opts.html === 'string' ? opts.html
    : Array.isArray(opts.pages) ? pagesHtml(opts.pages.map(String), opts.title) : null;
  if (html == null) return printContents(e.sender, printOpts);
  const dir = mkdtempSync(join(tmpdir(), 'uw-print-'));
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
    smokeLog('printed', { window: win?.id, ...r });
    return r;
  } finally {
    printFiles.delete(fileUrl);
    pw.destroy();
    rmSync(dir, { recursive: true, force: true });
  }
});
handle('wn:list-printers', (e) => e.sender.getPrintersAsync());

on('wn:clear-recents', () => { if (app.isPackaged) app.clearRecentDocuments(); });

// ── Confirmação ao fechar com alterações não salvas (como o Word) ──
// O renderer informa o estado (wn:set-dirty). No 'close' da janela, se houver
// alterações: Salvar / Não salvar / Cancelar. "Salvar" pede ao renderer
// (wn:save-before-close), que salva e fecha via wn:close-window se gravou;
// cancelou o diálogo de salvar → a janela fica aberta.
const closeState = new WeakMap(); // BrowserWindow → { dirty, name, allowClose, asking }
const closeStateOf = (win) => {
  let st = closeState.get(win);
  if (!st) closeState.set(win, (st = { dirty: false, name: '', allowClose: false, asking: false }));
  return st;
};
on('wn:set-dirty', (e, dirty, name) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const st = closeStateOf(win);
  st.dirty = !!dirty;
  st.name = String(name || '');
  if (process.platform === 'darwin') win.setDocumentEdited(st.dirty);
});
on('wn:close-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
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
    dialog.showMessageBox(win, {
      type: 'warning',
      title: DISPLAY_NAME,
      message: `Deseja salvar as alterações em "${st.name || 'Documento'}"?`,
      detail: 'Se você não salvar, as alterações serão perdidas.',
      buttons: ['Salvar', 'Não salvar', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    }).then(({ response }) => {
      st.asking = false;
      if (response === 1) { st.allowClose = true; win.close(); }
      else if (response === 0) win.webContents.send('wn:save-before-close');
    }, () => { st.asking = false; });
  });
}

// Usuário do sistema: autor das revisões e dos comentários (o Word usa o nome do Office)
handle('wn:user-name', () => { try { return userInfo().username; } catch { return ''; } });

// Mantém os controles de janela do SO (titleBarOverlay) em sintonia com o tema
// do app, para a barra de título "mesclar" também no modo escuro.
// ── Tema claro/escuro ──
// A janela nasce nas cores do tema do SO (nativeTheme, themeSource 'system'):
// sem clarão branco nem barra de título clara num SO escuro. A página assume
// quando informa o tema (wn:title-theme, a cada troca — inclusive no modo
// automático, quando o SO muda); até lá a janela acompanha o SO.
const TITLE_BAR_HEIGHT = 48;
const THEME_COLORS = {
  light: { background: '#FCFCFC', overlay: '#FCFCFC', symbol: '#1f1f1f' },
  dark: { background: '#131314', overlay: '#131314', symbol: '#e3e3e3' },
};
const themeColors = (dark) => THEME_COLORS[dark ? 'dark' : 'light'];
const appWindows = new Set(); // janelas com titleBarOverlay (não as de impressão/PDF)
const themeFromPage = new WeakSet();
function applyWindowTheme(win, dark) {
  const c = themeColors(dark);
  win.setTitleBarOverlay({ color: c.overlay, symbolColor: c.symbol, height: TITLE_BAR_HEIGHT });
  win.setBackgroundColor(c.background);
}
nativeTheme.on('updated', () => {
  for (const win of appWindows) {
    if (!win.isDestroyed() && !themeFromPage.has(win)) applyWindowTheme(win, nativeTheme.shouldUseDarkColors);
  }
});
handle('wn:title-theme', (e, dark) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !appWindows.has(win)) return;
  themeFromPage.add(win);
  applyWindowTheme(win, !!dark);
});

// ── Navegação e pop-ups ──
// Nenhum conteúdo navega para fora da origem do app. Pop-up só da própria
// origem ou about:blank (a janela de impressão do demo: window.open('')).
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (ev, url) => {
    const target = typeof url === 'string' ? url : ev.url;
    if (!isAppUrl(target)) { ev.preventDefault(); smokeLog('navigation-blocked', { url: target }); }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url === '' || isAppUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { sandbox: true, contextIsolation: true } } };
    }
    smokeLog('window-open-blocked', { url });
    return { action: 'deny' };
  });
});

// Em dev serve a raiz do repo; empacotado serve os assets copiados para
// resources (ver "extraResources" no package.json).
const repoRoot = app.isPackaged ? process.resourcesPath : join(__dirname, '..', '..');

/**
 * Renderiza assets/icon.html (256×256, com o SVG) numa BrowserWindow offscreen
 * e grava o PNG resultante em assets/icon.png. Cacheado: roda só uma vez por
 * instalação. Sem dependência externa (Electron já trás Chromium completo).
 */
async function ensureIconPng() {
  const iconPath = join(__dirname, 'assets', 'icon.png');
  if (existsSync(iconPath)) return iconPath;
  const off = new BrowserWindow({
    show: false, width: 256, height: 256,
    frame: false, transparent: true,
    webPreferences: { offscreen: false }, // off=true causou flicker em alguns drivers
  });
  try {
    await off.loadFile(join(__dirname, 'assets', 'icon.html'));
    // dá um respiro para o SVG renderizar gradientes+filtros completamente
    await new Promise((r) => setTimeout(r, 500));
    const img = await off.webContents.capturePage();
    writeFileSync(iconPath, img.toPNG());
  } finally {
    off.destroy();
  }
  return iconPath;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
      if (!path.startsWith(repoRoot)) { res.writeHead(403).end(); return; }
      try {
        statSync(path);
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
        createReadStream(path).pipe(res);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    // porta FIXA preferida: o localStorage/IndexedDB do renderer é por origem —
    // com porta aleatória, dicionário do usuário, Documentos Confiáveis, recentes
    // e preferências sumiriam a cada execução. Ocupada: a próxima; por fim, qualquer.
    const ports = [...Array.from({ length: 10 }, (_, i) => PREFERRED_PORT + i), 0];
    const tryNext = () => {
      const p = ports.shift();
      server.once('error', (err) => { if (err.code === 'EADDRINUSE' && ports.length) tryNext(); else throw err; });
      server.listen(p, '127.0.0.1', () => { server.removeAllListeners('error'); resolve(server.address().port); });
    };
    tryNext();
  });
}

const PREFERRED_PORT = 47810;

let iconPath;

/** Título da janela: "<documento> — Universal Write (Beta)" (o demo põe "— Write"). */
function windowTitle(pageTitle) {
  const doc = String(pageTitle || '').replace(/\s+[—-]\s+(Universal\s*)?Write$/i, '').trim();
  return doc && !/^(Universal\s*)?Write$/i.test(doc) ? `${doc} — ${DISPLAY_NAME}` : DISPLAY_NAME;
}

async function createWindow() {
  const initial = themeColors(nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    show: !SMOKE,
    title: DISPLAY_NAME,
    backgroundColor: initial.background,
    icon: iconPath, // ignorado em macOS (que usa o dock); pega Windows/Linux
    // Barra de título mesclada: a janela é frameless e o header do app vira a
    // própria barra de título (com a região arrastável -webkit-app-region). Os
    // controles de janela do SO ficam sobrepostos via titleBarOverlay.
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: initial.overlay,
      symbolColor: initial.symbol,
      height: TITLE_BAR_HEIGHT,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      // revisão ortográfica só pelo motor Hunspell do componente (shared/spell),
      // igual no navegador e no desktop — o corretor do Chromium fica desligado
      spellcheck: false,
    },
  });
  win.removeMenu();
  appWindows.add(win);
  win.on('closed', () => appWindows.delete(win));
  win.on('page-title-updated', (e, title) => { e.preventDefault(); win.setTitle(windowTitle(title)); });
  confirmCloseWhenDirty(win);
  docStateOf(win);
  win.webContents.on('did-start-navigation', (ev, _url, isInPlace, isMainFrame) => {
    const main = ev?.isMainFrame ?? isMainFrame;
    const sameDoc = ev?.isSameDocument ?? isInPlace;
    if (main && !sameDoc) resetPage(win, 'navigation');
  });
  win.webContents.on('render-process-gone', (_ev, details) => resetPage(win, `render-process-gone:${details?.reason}`));
  if (SMOKE) {
    win.webContents.on('console-message', (ev) => {
      const msg = ev.message;
      if (typeof msg === 'string' && msg.startsWith('[smoke]')) smokeLog('renderer', { window: win.id, msg: msg.slice(8) });
    });
    if (SMOKE_RENDERER) {
      // reinjeta a cada carga (o smoke testa reload)
      win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(readFileSync(SMOKE_RENDERER, 'utf8')).catch((err) => smokeLog('probe-error', { msg: String(err) }));
      });
    }
  }
  smokeLog('window-created', { window: win.id });
  await win.loadURL(`${appOrigin()}/packages/editor/demo/index.html`);
  return win;
}

/** Jump List do Windows: categoria "Recentes" (o SO só lista os tipos
 *  registrados para o app — fileAssociations do instalador) + tarefa "Novo
 *  documento", que reentra pela instância única com --new-window. */
function setupJumpList() {
  if (process.platform !== 'win32' || SMOKE) return;
  const args = app.isPackaged ? '--new-window' : `"${app.getAppPath()}" --new-window`;
  const result = app.setJumpList([
    { type: 'recent' },
    {
      type: 'tasks',
      items: [{
        type: 'task', title: 'Novo documento', description: `Abre uma nova janela do ${DISPLAY_NAME}`,
        program: process.execPath, args, iconPath: process.execPath, iconIndex: 0,
      }],
    },
  ]);
  if (result !== 'ok') console.warn('[wn] setJumpList:', result);
}

if (process.platform === 'win32' && app.isPackaged) app.setAppUserModelId(APP_ID);
app.setAboutPanelOptions({
  applicationName: DISPLAY_NAME,
  applicationVersion: DISPLAY_VERSION,
  version: '',
  copyright: 'Copyright © 2026 Eric Kono — MIT License',
  website: PKG.homepage,
});

app.whenReady().then(async () => {
  // Em dev, renderiza o SVG → PNG para o ícone da janela. Empacotado, o ícone
  // já vem embutido no executável/bundle pelo electron-builder (e o asar é
  // somente-leitura, então não dá para gravar icon.png em runtime).
  iconPath = app.isPackaged
    ? undefined
    : await ensureIconPng().catch((err) => {
        console.warn('[wn] não foi possível gerar icon.png:', err?.message);
        return undefined;
      });
  // macOS usa o dock; demais SOs usam icon: na janela
  if (iconPath && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }
  port = await serve();
  setupJumpList();
  const initial = [...pendingPaths.splice(0), ...docPathsFromArgv(process.argv, process.cwd())];
  smokeLog('ready', { paths: initial });
  const win = await createWindow();
  appReady = true;
  warmFontIndex(); // índice das fontes do SO pronto antes do 1º documento pedir
  if (initial.length) {
    deliverPath(win, initial[0]);
    if (initial.length > 1) await openPaths(initial.slice(1));
  }
  // chegaram (2ª instância/open-file) enquanto a 1ª janela carregava
  if (pendingPaths.length) await openPaths(pendingPaths.splice(0));
});

app.on('window-all-closed', () => app.quit());
