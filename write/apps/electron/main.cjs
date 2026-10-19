// Shell Electron do UniversalWrite — v1: embarca o demo do <universal-write> servindo a
// raiz do repositório por um servidor estático interno (fetch de docx/fontes
// não funciona via file://).
//
// Integração com o SO (como o Word): instância única, abrir pela linha de
// comando / associação de arquivo / open-file (macOS), recentes do SO e Jump
// List, Salvar/Salvar como/Exportar nativos e impressão com o diálogo do
// sistema. A superfície exposta ao renderer está documentada em preload.cjs.
const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const http = require('node:http');
const {
  createReadStream, statSync, readFileSync, writeFileSync, existsSync,
  appendFileSync, renameSync, unlinkSync, mkdtempSync, rmSync,
} = require('node:fs');
const { join, normalize, extname, basename, dirname, resolve } = require('node:path');
const { tmpdir } = require('node:os');

const APP_ID = 'com.tools-universal.universal-write'; // = build.appId (package.json)

// ── Modo de teste (smoke) ──
// WN_USER_DATA isola o perfil (e com ele o lock de instância única) do app do
// usuário; WN_SMOKE_LOG grava os eventos em JSON por linha, as janelas não
// aparecem (nada de roubar o foco) e os recentes/Jump List do SO não são
// tocados; WN_SMOKE_RENDERER é um script injetado em cada janela depois de
// carregar (console.log '[smoke] …' do renderer vai para o log).
if (process.env.WN_USER_DATA) app.setPath('userData', process.env.WN_USER_DATA);
const SMOKE_LOG = process.env.WN_SMOKE_LOG || '';
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
ipcMain.handle('wn:resolve-fonts', (_e, families) => resolveFonts(families));
ipcMain.handle('wn:list-fonts', () => listFontFamilies());

// ── Estado do documento por janela ──
// docPath: arquivo atual (Salvar grava nele); known: caminhos que o main
// entregou a esta janela — o renderer só grava sem diálogo num deles;
// ready/queue: arquivos abertos pelo SO esperam o renderer assinar onOpenFile.
const docState = new WeakMap();
const docStateOf = (win) => {
  let st = docState.get(win);
  if (!st) docState.set(win, (st = { docPath: null, known: new Set(), ready: false, queue: [], exports: new Map() }));
  return st;
};
const pathKey = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));

/** Recentes do SO: lista "Recentes" do Windows (e a categoria da Jump List),
 *  menu Abrir Recente / Dock do macOS. */
function addRecent(filePath) {
  if (SMOKE) { smokeLog('recent', { path: filePath }); return; }
  try { app.addRecentDocument(filePath); } catch (err) { console.warn('[wn] addRecentDocument:', err?.message); }
}

/** Associa o arquivo à janela: Salvar passa a gravar nele, entra nos recentes. */
function adoptPath(win, filePath) {
  const st = docStateOf(win);
  st.docPath = filePath;
  st.known.add(pathKey(filePath));
  if (process.platform === 'darwin') win.setRepresentedFilename(filePath);
  addRecent(filePath);
}

ipcMain.handle('wn:open-docx', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Abrir documento',
    filters: [{ name: 'Documentos', extensions: ['docx', 'doc', 'odt'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const doc = readDocument(result.filePaths[0]);
  if (win) adoptPath(win, doc.path);
  return doc;
});

// Segundo documento para a comparação ("Comparar com…"). Sem MOTW: o diff é
// somente leitura, não passa pelo Modo Protegido.
ipcMain.handle('wn:open-docx-compare', async (e, title) => {
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
function flushOpenQueue(win) {
  const st = docStateOf(win);
  if (!st.ready || win.isDestroyed()) return;
  for (const doc of st.queue.splice(0)) {
    win.webContents.send('wn:open-file', doc);
    smokeLog('open-file-sent', { window: win.id, name: doc.name, path: doc.path, size: doc.bytes.byteLength, motw: doc.motw });
  }
}
// O renderer assinou onOpenFile: entrega o que chegou antes dele.
ipcMain.on('wn:open-file-ready', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  docStateOf(win).ready = true;
  flushOpenQueue(win);
});

/** Pode receber um documento no lugar: sem arquivo, sem alterações e sem
 *  nada na fila (o "Documento1" intocado que o Word substitui). */
function isReusable(win) {
  if (!win || win.isDestroyed()) return false;
  const st = docStateOf(win);
  return !st.docPath && st.queue.length === 0 && !closeStateOf(win).dirty;
}

function deliverPath(win, filePath) {
  let doc;
  try { doc = readDocument(filePath); } catch (err) {
    dialog.showErrorBox('Universal Write', `Não foi possível abrir "${filePath}".\n${err?.message ?? err}`);
    return;
  }
  const st = docStateOf(win);
  adoptPath(win, filePath);
  st.queue.push(doc);
  smokeLog('open-file-queued', { window: win.id, path: filePath });
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
 *  deixa o documento truncado. */
function writeFileAtomic(target, buf) {
  const tmp = join(dirname(target), `~$${basename(target)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, buf);
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

ipcMain.handle('wn:save-file', async (e, opts = {}) => {
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
    const r = await dialog.showSaveDialog(win, {
      title: opts.title || 'Salvar como',
      defaultPath: base,
      filters: [FORMATS[fmt]],
      properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  writeFileAtomic(target, buf);
  adoptPath(win, target);
  smokeLog('saved', { window: win.id, path: target, size: buf.byteLength });
  return { path: target, name: basename(target) };
});

// ── Exportar (PDF/HTML/ODT/XPS) ──
// Em duas etapas: o usuário escolhe destino e formato; só então o renderer
// gera os bytes daquele formato. O token amarra a gravação ao destino escolhido.
let exportSeq = 0;
ipcMain.handle('wn:export-pick', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const formats = (Array.isArray(opts.formats) && opts.formats.length ? opts.formats : EXPORT_FORMATS)
    .map((f) => String(f).toLowerCase()).filter((f) => FORMATS[f]);
  if (!formats.length) throw new Error('nenhum formato de exportação válido');
  const stem = basename(String(opts.suggestedName || 'Documento')).replace(/\.[^.]+$/, '');
  const r = await dialog.showSaveDialog(win, {
    title: opts.title || 'Exportar',
    defaultPath: join(defaultDir(win), `${stem}.${FORMATS[formats[0]].extensions[0]}`),
    filters: formats.map((f) => FORMATS[f]),
    properties: ['showOverwriteConfirmation', 'createDirectory'],
  });
  if (r.canceled || !r.filePath) return null;
  let filePath = r.filePath;
  let format = formatOfPath(filePath);
  if (!format || !formats.includes(format)) { // extensão fora da lista → 1º formato
    format = formats[0];
    filePath += `.${FORMATS[format].extensions[0]}`;
  }
  const token = `x${++exportSeq}`;
  docStateOf(win).exports.set(token, { path: filePath, format });
  return { token, path: filePath, name: basename(filePath), format };
});
ipcMain.handle('wn:export-write', (e, token, bytes) => {
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
// páginas "como impressas"), imprime-o numa janela oculta. O diálogo do SO dá
// impressora, cópias e intervalo; as opções só pré-preenchem (ou, com
// silent, imprimem direto).
const PRINT_KEYS = ['silent', 'deviceName', 'copies', 'pageRanges', 'landscape', 'color', 'collate',
  'duplexMode', 'pageSize', 'margins', 'scaleFactor', 'pagesPerSheet', 'dpi', 'header', 'footer'];
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
ipcMain.handle('wn:print', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const printOpts = { silent: false, printBackground: true };
  for (const k of PRINT_KEYS) if (opts[k] !== undefined) printOpts[k] = opts[k];
  const html = typeof opts.html === 'string' ? opts.html
    : Array.isArray(opts.pages) ? pagesHtml(opts.pages, opts.title) : null;
  if (html == null) return printContents(e.sender, printOpts);
  // arquivo temporário: data: URL tem limite de ~2 MB e páginas em PNG passam disso
  const dir = mkdtempSync(join(tmpdir(), 'uw-print-'));
  const file = join(dir, 'print.html');
  writeFileSync(file, html);
  const pw = new BrowserWindow({
    show: false, parent: win ?? undefined,
    webPreferences: { javascript: false, sandbox: true },
  });
  try {
    await pw.loadFile(file); // resolve no load: imagens já decodificadas
    const r = await printContents(pw.webContents, printOpts);
    smokeLog('printed', { window: win?.id, ...r });
    return r;
  } finally {
    pw.destroy();
    rmSync(dir, { recursive: true, force: true });
  }
});
ipcMain.handle('wn:list-printers', (e) => e.sender.getPrintersAsync());

ipcMain.on('wn:clear-recents', () => { if (!SMOKE) app.clearRecentDocuments(); });

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
ipcMain.on('wn:set-dirty', (e, dirty, name) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const st = closeStateOf(win);
  st.dirty = !!dirty;
  st.name = String(name || '');
  if (process.platform === 'darwin') win.setDocumentEdited(st.dirty);
});
ipcMain.on('wn:close-window', (e) => {
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
      title: 'Universal Write',
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

// Mantém os controles de janela do SO (titleBarOverlay) em sintonia com o tema
// do app, para a barra de título "mesclar" também no modo escuro.
ipcMain.handle('wn:title-theme', (e, dark) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  win.setTitleBarOverlay({
    color: dark ? '#131314' : '#FCFCFC',
    symbolColor: dark ? '#e3e3e3' : '#1f1f1f',
    height: 48,
  });
  win.setBackgroundColor(dark ? '#131314' : '#FCFCFC');
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
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

let port = 0;
let iconPath;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    show: !SMOKE,
    title: 'UniversalWrite',
    backgroundColor: '#ffffff',
    icon: iconPath, // ignorado em macOS (que usa o dock); pega Windows/Linux
    // Barra de título mesclada: a janela é frameless e o header do app vira a
    // própria barra de título (com a região arrastável -webkit-app-region). Os
    // controles de janela do SO ficam sobrepostos via titleBarOverlay.
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#FCFCFC',
      symbolColor: '#1f1f1f',
      height: 48,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });
  win.removeMenu();
  confirmCloseWhenDirty(win);
  docStateOf(win);
  if (SMOKE) {
    win.webContents.on('console-message', (ev) => {
      const msg = ev.message;
      if (typeof msg === 'string' && msg.startsWith('[smoke]')) smokeLog('renderer', { window: win.id, msg: msg.slice(8) });
    });
  }
  smokeLog('window-created', { window: win.id });
  await win.loadURL(`http://127.0.0.1:${port}/packages/editor/demo/index.html`);
  if (process.env.WN_SMOKE_RENDERER) {
    await win.webContents.executeJavaScript(readFileSync(process.env.WN_SMOKE_RENDERER, 'utf8'));
  }
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
        type: 'task', title: 'Novo documento', description: 'Abre uma nova janela do Universal Write',
        program: process.execPath, args, iconPath: process.execPath, iconIndex: 0,
      }],
    },
  ]);
  if (result !== 'ok') console.warn('[wn] setJumpList:', result);
}

if (process.platform === 'win32' && app.isPackaged) app.setAppUserModelId(APP_ID);

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
