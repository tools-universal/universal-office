// Shell Electron do Universal Slides — embarca o demo do <universal-slides>
// servindo os assets por um servidor estático interno (fetch de .pptx + fontes
// não funciona via file://). Em dev serve a raiz do projeto; empacotado, a
// cópia em resources (ver "extraResources" no package.json).
//
// Integração com o SO (como o shell do Write): instância única, abrir pela
// linha de comando / associação de arquivo / open-file (macOS), recentes do
// SO, Salvar/Salvar como/Exportar nativos, impressão com o diálogo do sistema
// e confirmação ao fechar com alterações. A janela é SEM MOLDURA: a barra do
// próprio <universal-slides> (atributo topbar, `appHost.windowControlsOverlay`)
// é a barra de título e reserva a área dos controles do SO (titleBarOverlay).
// A superfície exposta ao renderer está documentada em preload.cjs.
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, session, shell } = require('electron');
const http = require('node:http');
const {
  createReadStream, statSync, readFileSync, writeFileSync, existsSync,
  appendFileSync, renameSync, unlinkSync, mkdtempSync, rmSync,
} = require('node:fs');
const { join, normalize, extname, basename, dirname, resolve, sep } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');

const PKG = require('./package.json');
const APP_ID = 'com.tools-universal.universal-slides'; // = build.appId (package.json)
// Nome exibido com o canal ("Universal Slides (Beta)", versão "0.0.1 beta");
// productName (pasta de instalação, perfil, appId) fica estável para a versão
// final atualizar no lugar.
const DISPLAY_NAME = PKG.displayName || PKG.productName || 'Universal Slides';
const DISPLAY_VERSION = PKG.releaseChannel ? `${PKG.version} ${PKG.releaseChannel}` : PKG.version;

// ── Modo de teste (smoke) — só fora do app empacotado ──
// Mesmas variáveis do shell do Write: WN_USER_DATA isola o perfil (e o lock de
// instância única), WN_SMOKE_LOG grava os eventos em JSON por linha e deixa as
// janelas ocultas.
const DEV = !app.isPackaged;
const devEnv = (name) => (DEV ? process.env[name] || '' : '');
if (devEnv('WN_USER_DATA')) app.setPath('userData', devEnv('WN_USER_DATA'));
const SMOKE_LOG = devEnv('WN_SMOKE_LOG');
const SMOKE = !!SMOKE_LOG;
function smokeLog(event, data = {}) {
  if (!SMOKE) return;
  appendFileSync(SMOKE_LOG, JSON.stringify({ t: Date.now(), pid: process.pid, event, ...data }) + '\n');
}

// ── Instância única ──
// A 2ª execução (duplo clique num .pptx com o app aberto) entrega argv + cwd à
// 1ª por additionalData e sai.
const DOC_EXTS = new Set(['.pptx', '.ppt']);
if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd() })) {
  smokeLog('forwarded', { argv: process.argv.slice(1) });
  app.quit();
  return; // (CommonJS: return no topo encerra o módulo)
}

/** Apresentações pedidas na linha de comando (caminhos relativos ao cwd de quem chamou). */
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

// Em dev serve a raiz do projeto; empacotado serve os assets copiados para resources.
const repoRoot = app.isPackaged ? process.resourcesPath : join(__dirname, '..', '..');
const DEMO_PATH = '/packages/slides/demo';

// Fontes do SO por família: Windows\Fonts + fontes do usuário + cache
// CloudFonts do Office (invisível ao queryLocalFonts) — ver
// shared/fonts/node/system-fonts.cjs. Empacotado, o módulo vem em resources.
const { warmFontIndex, listFontFamilies, resolveFonts } = require(app.isPackaged
  ? join(process.resourcesPath, 'system-fonts.cjs')
  : '../../../shared/fonts/node/system-fonts.cjs');

// ── Origem do app e guarda do IPC ──
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
  ipcMain.on(channel, (e, ...args) => {
    if (!fromApp(e)) return;
    fn(e, ...args);
  });
}

handle('us:resolve-fonts', (_e, families) => resolveFonts(families));
handle('us:list-fonts', () => listFontFamilies());

// ── Estado da apresentação por janela ──
// docPath: arquivo atual (Salvar grava nele); known: caminhos que o main
// entregou a esta janela — o renderer só grava sem diálogo num deles.
// Arquivos abertos pelo SO: queue (esperando o renderer assinar onOpenFile,
// ready) → inflight (enviados, esperando o renderer confirmar que abriu,
// us:file-opened) → só então a janela vira dona do arquivo (adoptPath).
const docState = new WeakMap();
const docStateOf = (win) => {
  let st = docState.get(win);
  if (!st) docState.set(win, (st = { docPath: null, known: new Set(), ready: false, queue: [], inflight: new Map(), exports: new Map() }));
  return st;
};
const pathKey = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));

/** Recentes do SO (lista "Recentes"/Jump List do Windows, Dock do macOS). Em dev não polui a do electron.exe. */
function addRecent(filePath) {
  smokeLog('recent', { path: filePath });
  if (!app.isPackaged) return;
  try { app.addRecentDocument(filePath); } catch (err) { console.warn('[us] addRecentDocument:', err?.message); }
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

/** Página nova (reload) ou renderer morto: o que foi enviado e não confirmado volta para a fila. */
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

function readDocument(filePath) {
  const bytes = readFileSync(filePath);
  return { name: basename(filePath), path: filePath, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}

handle('us:open-pptx', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Abrir apresentação',
    filters: [{ name: 'Apresentação do PowerPoint', extensions: ['pptx', 'ppt'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const doc = readDocument(result.filePaths[0]);
  adoptPath(win, doc.path); // o renderer pediu o arquivo: abrir é a resposta
  return doc;
});

// ── Salvar / Salvar como / Exportar nativos ──
const FORMATS = {
  pptx: { name: 'Apresentação do PowerPoint', extensions: ['pptx'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  html: { name: 'Página da Web', extensions: ['html', 'htm'] },
  md: { name: 'Markdown', extensions: ['md'] },
  png: { name: 'Imagem PNG', extensions: ['png'] },
};
const formatOfPath = (p) => {
  const ext = extname(p).slice(1).toLowerCase();
  return Object.keys(FORMATS).find((k) => FORMATS[k].extensions.includes(ext)) ?? null;
};

function toBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (ArrayBuffer.isView(bytes)) return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TypeError('bytes deve ser ArrayBuffer ou Uint8Array');
}

/** Grava num temporário ao lado e renomeia por cima (uma falha no meio não deixa o arquivo truncado);
 *  o Mark-of-the-Web do original passa para o novo. */
function writeFileAtomic(target, buf) {
  let st = null;
  try { st = statSync(target); } catch { /* arquivo novo */ }
  if (st && st.nlink > 1) { writeFileSync(target, buf); return; }
  const tmp = join(dirname(target), `~$${basename(target)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, buf);
    if (st && process.platform === 'win32') {
      let zone = null;
      try { zone = readFileSync(target + ':Zone.Identifier'); } catch { /* sem MOTW */ }
      if (zone) writeFileSync(tmp + ':Zone.Identifier', zone);
    }
    renameSync(tmp, target);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* não chegou a existir */ }
    if (err?.code === 'EPERM' || err?.code === 'EXDEV') writeFileSync(target, buf);
    else throw err;
  }
}

const defaultDir = (win) => {
  const p = win ? docStateOf(win).docPath : null;
  return p ? dirname(p) : app.getPath('documents');
};

/** Diálogo Salvar com a extensão garantida; nunca sobrescreve em silêncio. */
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
      type: 'warning', title, message: `"${basename(filePath)}" já existe. Deseja substituí-lo?`,
      buttons: ['Substituir', 'Não'], defaultId: 1, cancelId: 1, noLink: true,
    });
    if (response === 0) return filePath;
    defaultPath = filePath;
  }
}

handle('us:save-file', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = docStateOf(win);
  const buf = toBuffer(opts.bytes);
  const suggestedName = basename(String(opts.suggestedName || 'Apresentação.pptx'));
  let target = null;
  if (opts.path) {
    const p = resolve(String(opts.path));
    // só grava sem perguntar num arquivo que o próprio main entregou à janela
    if (!st.known.has(pathKey(p))) throw new Error(`caminho não autorizado para esta janela: ${p}`);
    if (formatOfPath(p) === 'pptx') target = p; // .ppt aberto: o .pptx novo pergunta onde
  }
  if (!target) {
    const base = opts.path ? join(dirname(String(opts.path)), suggestedName) : join(defaultDir(win), suggestedName);
    target = await pickSavePath(win, { title: opts.title || 'Salvar como', defaultPath: base, formats: ['pptx'] });
    if (!target) return null;
  }
  writeFileAtomic(target, buf);
  adoptPath(win, target);
  smokeLog('saved', { window: win.id, path: target, size: buf.byteLength });
  return { path: target, name: basename(target) };
});

// Exportar em duas etapas: o usuário escolhe o destino; só então o renderer gera os bytes.
let exportSeq = 0;
handle('us:export-pick', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const format = String(opts.format || 'pdf').toLowerCase();
  if (!FORMATS[format] || format === 'pptx') throw new Error(`formato de exportação inválido: ${format}`);
  const stem = basename(String(opts.suggestedName || 'Apresentação')).replace(/\.[^.]+$/, '');
  const filePath = await pickSavePath(win, {
    title: opts.title || 'Exportar',
    defaultPath: join(defaultDir(win), `${stem}.${FORMATS[format].extensions[0]}`),
    formats: [format],
  });
  if (!filePath) return null;
  const token = `x${++exportSeq}`;
  docStateOf(win).exports.set(token, { path: filePath, format });
  return { token, path: filePath, name: basename(filePath), format };
});
handle('us:export-write', (e, token, bytes) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const st = docStateOf(win);
  const pick = st.exports.get(token);
  if (!pick) throw new Error('exportação desconhecida ou já gravada');
  st.exports.delete(token);
  if (bytes == null) return null; // o renderer desistiu (falha ao gerar)
  const buf = toBuffer(bytes);
  writeFileAtomic(pick.path, buf);
  smokeLog('exported', { window: win.id, path: pick.path, format: pick.format, size: buf.byteLength });
  return { path: pick.path, name: basename(pick.path), format: pick.format };
});

// ── Imprimir com o diálogo do sistema ──
// As páginas (um slide por folha, pintados pelo componente) vão para uma janela
// oculta sem JS, sem rede e sem file:// (só o próprio HTML temporário e data:).
function printContents(wc, opts) {
  return new Promise((done) => {
    wc.print(opts, (success, failureReason) => done({ success, failureReason: success ? undefined : failureReason }));
  });
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function pagesHtml(pages, title) {
  const imgs = pages.map((src) => `<img src="${escapeHtml(src)}">`).join('');
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title || DISPLAY_NAME)}</title>`
    + '<style>@page{margin:8mm}html,body{margin:0}img{display:block;width:100%;height:auto;break-after:page}img:last-child{break-after:auto}</style>'
    + `<body>${imgs}</body>`;
}
const printFiles = new Set();
let printSession = null;
function getPrintSession() {
  if (printSession) return printSession;
  printSession = session.fromPartition('us-print'); // sem "persist:": só em memória
  printSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    const ok = u.startsWith('data:') || u === 'about:blank' || printFiles.has(u);
    if (!ok) smokeLog('print-blocked', { url: u });
    cb({ cancel: !ok });
  });
  return printSession;
}
handle('us:print', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const pages = Array.isArray(opts.pages) ? opts.pages.map(String).filter((p) => p.startsWith('data:image/')) : [];
  if (!pages.length) return { success: false, failureReason: 'nothing to print' };
  const dir = mkdtempSync(join(tmpdir(), 'us-print-'));
  const file = join(dir, 'print.html');
  const fileUrl = pathToFileURL(file).href;
  writeFileSync(file, pagesHtml(pages, opts.title));
  printFiles.add(fileUrl);
  const pw = new BrowserWindow({ show: false, parent: win ?? undefined, webPreferences: { javascript: false, sandbox: true, session: getPrintSession() } });
  try {
    await pw.loadURL(fileUrl); // resolve no load: imagens já decodificadas
    const r = await printContents(pw.webContents, { printBackground: true, landscape: opts.landscape !== false, silent: false });
    smokeLog('printed', { window: win?.id, ...r });
    return r;
  } finally {
    printFiles.delete(fileUrl);
    pw.destroy();
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Confirmação ao fechar com alterações não salvas (como o PowerPoint) ──
// O renderer informa o estado (us:set-dirty). No 'close', se houver alterações:
// Salvar / Não salvar / Cancelar. "Salvar" pede ao renderer (us:save-before-close),
// que salva e fecha via us:close-window se gravou.
const closeState = new WeakMap();
const closeStateOf = (win) => {
  let st = closeState.get(win);
  if (!st) closeState.set(win, (st = { dirty: false, name: '', allowClose: false, asking: false }));
  return st;
};
on('us:set-dirty', (e, dirty, name) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const st = closeStateOf(win);
  st.dirty = !!dirty;
  st.name = String(name || '');
  if (process.platform === 'darwin') win.setDocumentEdited(st.dirty);
});
on('us:close-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  closeStateOf(win).allowClose = true;
  win.close();
});
function confirmCloseWhenDirty(win) {
  win.on('close', (e) => {
    const st = closeStateOf(win);
    if (!st.dirty || st.allowClose || win.webContents.isCrashed()) return;
    e.preventDefault();
    if (st.asking) return;
    st.asking = true;
    dialog.showMessageBox(win, {
      type: 'warning', title: DISPLAY_NAME,
      message: `Deseja salvar as alterações em "${st.name || 'Apresentação'}"?`,
      detail: 'Se você não salvar, as alterações serão perdidas.',
      buttons: ['Salvar', 'Não salvar', 'Cancelar'], defaultId: 0, cancelId: 2, noLink: true,
    }).then(({ response }) => {
      st.asking = false;
      if (response === 1) { st.allowClose = true; win.close(); }
      else if (response === 0) win.webContents.send('us:save-before-close');
    }, () => { st.asking = false; });
  });
}

// ── Tema claro/escuro ──
// A janela nasce nas cores do tema do SO (nativeTheme, themeSource 'system'):
// sem clarão branco nem barra de título clara num SO escuro. A página assume
// quando informa o tema (us:title-theme, a cada troca — inclusive no modo
// automático, quando o SO muda); até lá a janela acompanha o SO. As cores são
// as da barra do <universal-slides> (o fundo único, --us-background).
const TITLE_BAR_HEIGHT = 48;
const THEME_COLORS = {
  light: { background: '#f6f5f5', overlay: '#f6f5f5', symbol: '#1f1f1f' },
  dark: { background: '#1c1b1b', overlay: '#1c1b1b', symbol: '#e3e3e3' },
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
handle('us:title-theme', (e, dark) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !appWindows.has(win)) return;
  themeFromPage.add(win);
  applyWindowTheme(win, !!dark);
});

// ── Arquivos abertos pelo SO (argv, 2ª instância, open-file do macOS) ──
let deliverySeq = 0;
function flushOpenQueue(win) {
  const st = docStateOf(win);
  if (!st.ready || win.isDestroyed()) return;
  for (const doc of st.queue.splice(0)) {
    st.inflight.set(doc.id, doc);
    win.webContents.send('us:open-file', doc);
    smokeLog('open-file-sent', { window: win.id, id: doc.id, name: doc.name, path: doc.path, size: doc.bytes.byteLength });
  }
}
// O renderer assinou onOpenFile: entrega o que chegou antes dele.
on('us:open-file-ready', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  docStateOf(win).ready = true;
  flushOpenQueue(win);
});
// O renderer abriu (ok) ou recusou a apresentação entregue.
on('us:file-opened', (e, id, ok) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const st = docStateOf(win);
  const doc = st.inflight.get(id);
  if (!doc) return;
  st.inflight.delete(id);
  smokeLog('file-opened', { window: win.id, id, ok: !!ok, path: doc.path });
  if (ok) adoptPath(win, doc.path);
});

/** Pode receber a apresentação no lugar: renderer pronto, sem arquivo, sem alterações e nada em trânsito. */
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
/** O 1º arquivo vai para a janela focada se ela estiver livre; os demais abrem em janelas novas. */
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

let appReady = false;
const pendingPaths = [];
app.on('open-file', (e, filePath) => {
  e.preventDefault();
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
  else {
    const win = BrowserWindow.getAllWindows().at(-1);
    if (win && !SMOKE) focusWindow(win);
  }
});

// ── Servidor dos assets ──
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
  '.svg': 'image/svg+xml',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
};

// Fontes proprietárias que o demo referencia por arquivo (aptos-*.ttf e as de
// fonts/os/: arial, calibri) não vêm no app — a licença não permite
// redistribuir o arquivo (ver CLAUDE.md). Pedido de uma delas que não existe
// no pacote: a fonte instalada no SO com esse nome (lida em tempo de execução,
// nunca copiada) ou, sem ela, a substituta aberta Liberation Sans.
const FONT_STYLES = { regular: [false, false], bold: [true, false], italic: [false, true], bolditalic: [true, true] };
async function osFontFallback(path) {
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
  try { return readFileSync(join(repoRoot, DEMO_PATH, 'fonts', `liberationsans-${m[2]}.ttf`)); } catch { return null; }
}

// Arquivo pedido pelo SO na abertura: o demo não carrega a apresentação de exemplo
// (/samples, só existe em dev) por cima dele.
let skipSamples = false;

function serve() {
  return new Promise((done) => {
    const rootPrefix = normalize(repoRoot + sep);
    const server = http.createServer(async (req, res) => {
      // só o próprio app: Host diferente = outra origem (DNS rebinding)
      const host = req.headers.host ?? '';
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
      let url;
      let path;
      try {
        url = new URL(req.url, 'http://x');
        path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
      } catch { res.writeHead(400).end(); return; } // %-escape inválido etc.
      if (path !== normalize(repoRoot) && !path.startsWith(rootPrefix)) { res.writeHead(403).end(); return; }
      if (skipSamples && url.pathname.startsWith('/samples/')) { res.writeHead(404).end('not found'); return; }
      const headers = (file) => ({
        'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      try {
        const st = statSync(path);
        const file = st.isDirectory() ? join(path, 'index.html') : path;
        statSync(file);
        res.writeHead(200, headers(file));
        createReadStream(file).on('error', () => res.destroy()).pipe(res);
      } catch {
        const font = url.pathname.startsWith(`${DEMO_PATH}/fonts/`) ? await osFontFallback(path) : null;
        if (font) res.writeHead(200, headers(path)).end(font);
        else res.writeHead(404).end('not found');
      }
    });
    // porta FIXA preferida: o localStorage do renderer (tema, preferências)
    // é por origem — com porta aleatória sumiria a cada execução. Ocupada: a
    // próxima; por fim, qualquer.
    const ports = [...Array.from({ length: 10 }, (_, i) => PREFERRED_PORT + i), 0];
    const tryNext = () => {
      const p = ports.shift();
      server.once('error', (err) => { if (err.code === 'EADDRINUSE' && ports.length) tryNext(); else throw err; });
      server.listen(p, '127.0.0.1', () => { server.removeAllListeners('error'); port = server.address().port; done(port); });
    };
    tryNext();
  });
}
const PREFERRED_PORT = 47850;

// ── Navegação e pop-ups ──
// Nada navega para fora da origem do app. Hyperlinks dos slides (window.open)
// vão para o navegador do sistema — nunca uma janela Electron; só
// http(s)/mailto (nada de file:// ou protocolos de app).
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (ev, url) => {
    const target = typeof url === 'string' ? url : ev.url;
    if (!isAppUrl(target)) { ev.preventDefault(); smokeLog('navigation-blocked', { url: target }); }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`blob:${appOrigin()}/`)) {
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { sandbox: true, contextIsolation: true, plugins: true } } };
    }
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    smokeLog('window-open-blocked', { url });
    return { action: 'deny' };
  });
});

/** Título da janela: "<apresentação> — Universal Slides (Beta)" (o demo põe "— Universal Slides"). */
function windowTitle(pageTitle) {
  const doc = String(pageTitle || '').replace(/\s+[—-]\s+(Universal\s+)?Slides$/i, '').trim();
  return doc && !/^(Universal\s+)?Slides$/i.test(doc) ? `${doc} — ${DISPLAY_NAME}` : DISPLAY_NAME;
}

async function createWindow() {
  const initial = themeColors(nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: !SMOKE,
    title: DISPLAY_NAME,
    backgroundColor: initial.background,
    // Barra de título mesclada: a janela é frameless e a linha de título da barra
    // do <universal-slides> vira a barra da janela (região arrastável .uo-wco,
    // ligada pelo demo com appHost.windowControlsOverlay). Os controles do SO
    // ficam sobrepostos via titleBarOverlay.
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
    },
  });
  win.removeMenu();
  appWindows.add(win);
  win.on('closed', () => appWindows.delete(win));
  win.on('page-title-updated', (e, title) => { e.preventDefault(); win.setTitle(windowTitle(title)); });
  confirmCloseWhenDirty(win);
  docStateOf(win);
  // página nova (reload) ou renderer morto: o que estava em trânsito espera o novo "ready"
  win.webContents.on('did-start-navigation', (ev, _url, isInPlace, isMainFrame) => {
    if ((ev?.isMainFrame ?? isMainFrame) && !(ev?.isSameDocument ?? isInPlace)) resetPage(win, 'navigation');
  });
  win.webContents.on('render-process-gone', (_ev, details) => resetPage(win, `render-process-gone:${details?.reason}`));
  smokeLog('window-created', { window: win.id });
  await win.loadURL(`${appOrigin()}${DEMO_PATH}/index.html`);
  return win;
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
  await serve();
  const initial = [...pendingPaths.splice(0), ...docPathsFromArgv(process.argv, process.cwd())];
  skipSamples = initial.length > 0;
  smokeLog('ready', { paths: initial });
  const win = await createWindow();
  appReady = true;
  warmFontIndex(); // índice das fontes do SO pronto antes do 1º deck pedir
  if (initial.length) {
    deliverPath(win, initial[0]);
    if (initial.length > 1) await openPaths(initial.slice(1));
  }
  if (pendingPaths.length) await openPaths(pendingPaths.splice(0));
});

app.on('window-all-closed', () => app.quit());
