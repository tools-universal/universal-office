// Shell Electron do Universal Sheet — embarca o demo do <universal-sheet>
// servindo os assets por um servidor estático interno (fetch de .xlsx + fontes
// não funciona via file://). Em dev serve a raiz do projeto; empacotado, a
// cópia em resources (ver "extraResources" no package.json).
//
// Integração com o SO: instância única, abrir pela linha de comando /
// associação de arquivo / open-file (macOS) e recentes do SO. As barras são do
// próprio <universal-sheet> (topbar/bottombar), numa janela SEM MOLDURA com os
// controles do SO sobrepostos (titleBarOverlay; a página reserva a área e
// arrasta a janela pela linha de título); a ponte do preload vira o `host` do
// elemento: Abrir/Salvar/Exportar nativos, alterações não salvas ao fechar,
// fontes do SO, cor dos controles e as planilhas abertas pelo SO (onOpenFile →
// openWorkbook, a API do componente — não mais um "drop" sintético).
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } = require('electron');
const http = require('node:http');
const { createReadStream, statSync, readFileSync, writeFileSync, appendFileSync, renameSync, unlinkSync, existsSync } = require('node:fs');
const { join, normalize, extname, basename, dirname, resolve, sep } = require('node:path');

const PKG = require('./package.json');
const APP_ID = 'com.tools-universal.universal-sheet'; // = build.appId (package.json)
// Nome exibido com o canal ("Universal Sheet (Beta)", versão "0.0.1 beta");
// productName (pasta de instalação, perfil, appId) fica estável para a versão
// final atualizar no lugar.
const DISPLAY_NAME = PKG.displayName || PKG.productName || 'Universal Sheet';
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
// A 2ª execução (duplo clique num .xlsx com o app aberto) entrega argv + cwd à
// 1ª por additionalData e sai.
const DOC_EXTS = new Set(['.xlsx', '.xlsm', '.xls']);
if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd() })) {
  smokeLog('forwarded', { argv: process.argv.slice(1) });
  app.quit();
  return; // (CommonJS: return no topo encerra o módulo)
}

/** Planilhas pedidas na linha de comando (caminhos relativos ao cwd de quem chamou). */
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
const DEMO_PATH = '/packages/sheet/demo';

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
  ipcMain.on(channel, (e, ...args) => { if (fromApp(e)) fn(e, ...args); });
}

handle('us:resolve-fonts', (_e, families) => resolveFonts(families));
handle('us:list-fonts', () => listFontFamilies());

function toBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (ArrayBuffer.isView(bytes)) return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  throw new TypeError('bytes deve ser ArrayBuffer ou Uint8Array');
}

// ── Caminhos que esta janela pode gravar sem perguntar ──
// Só os que o próprio main entregou a ela (Abrir, arquivo aberto pelo SO,
// Salvar como): o renderer não escolhe destino por conta própria.
const knownPaths = new WeakMap(); // BrowserWindow → Set<caminho normalizado>
const pathKey = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));
function adoptPath(win, p) {
  if (!win) return;
  let set = knownPaths.get(win);
  if (!set) knownPaths.set(win, (set = new Set()));
  set.add(pathKey(p));
  addRecent(p);
}
const knows = (win, p) => !!win && !!knownPaths.get(win)?.has(pathKey(p));
const lastDir = new WeakMap(); // BrowserWindow → pasta do último arquivo
const defaultDir = (win) => lastDir.get(win) ?? app.getPath('documents');

/** Grava num temporário ao lado e renomeia por cima: uma falha no meio não deixa a planilha truncada. */
function writeFileAtomic(target, buf) {
  let st = null;
  try { st = statSync(target); } catch { /* arquivo novo */ }
  if (st && st.nlink > 1) { writeFileSync(target, buf); return; }
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

// Formatos de Salvar/Exportar (o <universal-sheet> gera os bytes)
const FORMATS = {
  xlsx: { name: 'Pasta de Trabalho do Excel', extensions: ['xlsx'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  ods: { name: 'Planilha OpenDocument', extensions: ['ods'] },
  csv: { name: 'CSV (separado por vírgulas)', extensions: ['csv'] },
  tsv: { name: 'Texto (separado por tabulações)', extensions: ['tsv'] },
  html: { name: 'Página da Web', extensions: ['html'] },
  md: { name: 'Markdown', extensions: ['md'] },
  xml: { name: 'Planilha XML 2003', extensions: ['xml'] },
};
const formatOfPath = (p) => {
  const ext = extname(p).slice(1).toLowerCase();
  return Object.keys(FORMATS).find((k) => FORMATS[k].extensions.includes(ext)) ?? null;
};

/** Diálogo Salvar com a extensão garantida; nunca sobrescreve em silêncio. */
async function pickSavePath(win, { title, defaultPath, format }) {
  for (;;) {
    const r = await dialog.showSaveDialog(win, {
      title, defaultPath, filters: [FORMATS[format]], properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (r.canceled || !r.filePath) return null;
    if (formatOfPath(r.filePath) === format) return r.filePath;
    const filePath = `${r.filePath}.${FORMATS[format].extensions[0]}`;
    if (!existsSync(filePath)) return filePath;
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning', title, message: `"${basename(filePath)}" já existe. Deseja substituí-lo?`,
      buttons: ['Substituir', 'Não'], defaultId: 1, cancelId: 1, noLink: true,
    });
    if (response === 0) return filePath;
    defaultPath = filePath;
  }
}

handle('us:open-xlsx', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Abrir planilha',
    defaultPath: defaultDir(win),
    filters: [{ name: 'Planilha do Excel', extensions: ['xlsx', 'xlsm', 'xls'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const bytes = readFileSync(filePath);
  adoptPath(win, filePath);
  lastDir.set(win, dirname(filePath));
  return {
    name: basename(filePath),
    path: filePath,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
});

// Salvar o .xlsx: com `path` (entregue pelo main a esta janela) grava direto;
// sem ele (pasta nova, Salvar como, .xls convertido) pergunta onde.
handle('us:save-file', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const buf = toBuffer(opts.bytes);
  const suggestedName = basename(String(opts.suggestedName || 'Pasta1.xlsx'));
  let target = null;
  if (opts.path) {
    const p = resolve(String(opts.path));
    if (!knows(win, p)) throw new Error(`caminho não autorizado para esta janela: ${p}`);
    if (formatOfPath(p) === 'xlsx') target = p;
  }
  if (!target) {
    const base = opts.path ? join(dirname(String(opts.path)), suggestedName) : join(defaultDir(win), suggestedName);
    target = await pickSavePath(win, { title: 'Salvar como', defaultPath: base, format: 'xlsx' });
    if (!target) return null;
  }
  writeFileAtomic(target, buf);
  adoptPath(win, target);
  lastDir.set(win, dirname(target));
  smokeLog('saved', { window: win.id, path: target, size: buf.byteLength });
  return { path: target, name: basename(target) };
});

// ── Exportar (PDF/ODS/CSV/TSV/HTML/Markdown/XML 2003) ──
// Em duas etapas: o usuário escolhe o destino; só então o renderer gera os
// bytes. O token amarra a gravação ao destino escolhido.
let exportSeq = 0;
const exportsOf = new WeakMap(); // BrowserWindow → Map<token, caminho>
handle('us:export-pick', async (e, opts = {}) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const format = String(opts.kind || '').toLowerCase();
  if (!FORMATS[format] || format === 'xlsx') throw new Error(`formato de exportação inválido: ${format}`);
  const stem = basename(String(opts.suggestedName || 'Pasta1')).replace(/\.[^.]+$/, '');
  const filePath = await pickSavePath(win, {
    title: 'Exportar', defaultPath: join(defaultDir(win), `${stem}.${FORMATS[format].extensions[0]}`), format,
  });
  if (!filePath) return null;
  const token = `x${++exportSeq}`;
  let map = exportsOf.get(win);
  if (!map) exportsOf.set(win, (map = new Map()));
  map.set(token, filePath);
  return { token, path: filePath, name: basename(filePath) };
});
handle('us:export-write', (e, token, bytes) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const map = exportsOf.get(win);
  const path = map?.get(token);
  if (!path) throw new Error('exportação desconhecida ou já gravada');
  map.delete(token);
  if (bytes == null) return null; // o renderer desistiu (falha ao gerar)
  const buf = toBuffer(bytes);
  writeFileAtomic(path, buf);
  smokeLog('exported', { window: win.id, path, size: buf.byteLength });
  return { path, name: basename(path) };
});

// ── Confirmação ao fechar com alterações não salvas (como o Excel) ──
// O renderer informa o estado (us:set-dirty). No 'close' da janela, se houver
// alterações: Salvar / Não salvar / Cancelar. "Salvar" pede ao renderer
// (us:save-before-close), que salva e fecha via us:close-window se gravou.
const closeState = new WeakMap(); // BrowserWindow → { dirty, name, allowClose, asking }
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
    // renderer travado/morto não tem como salvar: não prende a janela
    if (!st.dirty || st.allowClose || win.webContents.isCrashed()) return;
    e.preventDefault();
    if (st.asking) return;
    st.asking = true;
    dialog.showMessageBox(win, {
      type: 'warning',
      title: DISPLAY_NAME,
      message: `Deseja salvar as alterações em "${st.name || 'Pasta1'}"?`,
      detail: 'Se você não salvar, as alterações serão perdidas.',
      buttons: ['Salvar', 'Não salvar', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
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
// automático, quando o SO muda); até lá a janela acompanha o SO.
const TITLE_BAR_HEIGHT = 48;
const THEME_COLORS = {
  light: { background: '#FCFCFC', overlay: '#FCFCFC', symbol: '#1f1f1f' },
  dark: { background: '#131316', overlay: '#131316', symbol: '#e3e3e3' },
};
const themeColors = (dark) => THEME_COLORS[dark ? 'dark' : 'light'];
const appWindows = new Set(); // janelas com titleBarOverlay (não as de impressão/PDF)
const themeFromPage = new WeakSet();
function applyWindowTheme(win, dark, bar) {
  const c = themeColors(dark);
  // `bar`: a cor da barra da página (#RRGGBB), para os controles não destoarem do fundo dela
  const overlay = typeof bar === 'string' && /^#[0-9a-f]{6}$/i.test(bar) ? bar : c.overlay;
  win.setTitleBarOverlay({ color: overlay, symbolColor: c.symbol, height: TITLE_BAR_HEIGHT });
  win.setBackgroundColor(overlay);
}
nativeTheme.on('updated', () => {
  for (const win of appWindows) {
    if (!win.isDestroyed() && !themeFromPage.has(win)) applyWindowTheme(win, nativeTheme.shouldUseDarkColors);
  }
});
handle('us:title-theme', (e, dark, bar) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || !appWindows.has(win)) return;
  themeFromPage.add(win);
  applyWindowTheme(win, !!dark, bar);
});

/** Recentes do SO (lista "Recentes"/Jump List do Windows, Dock do macOS). Em dev não polui a do electron.exe. */
function addRecent(filePath) {
  smokeLog('recent', { path: filePath });
  if (!app.isPackaged) return;
  try { app.addRecentDocument(filePath); } catch (err) { console.warn('[us] addRecentDocument:', err?.message); }
}

// ── Arquivos abertos pelo SO (argv, 2ª instância, open-file do macOS) ──
// Cada janela tem uma fila: o preload avisa quando a página carregou
// (us:open-file-ready) e só então recebe os arquivos (us:open-file).
const fileQueue = new WeakMap(); // BrowserWindow → { ready, queue: doc[] }
const queueOf = (win) => {
  let st = fileQueue.get(win);
  if (!st) fileQueue.set(win, (st = { ready: false, queue: [], opened: false }));
  return st;
};
function flushOpenQueue(win) {
  const st = queueOf(win);
  if (!st.ready || win.isDestroyed()) return;
  for (const doc of st.queue.splice(0)) {
    st.opened = true;
    win.webContents.send('us:open-file', doc);
    smokeLog('open-file-sent', { window: win.id, name: doc.name, path: doc.path, size: doc.bytes.byteLength });
  }
}
on('us:open-file-ready', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  queueOf(win).ready = true;
  flushOpenQueue(win);
});
function deliverPath(win, filePath) {
  let bytes;
  try { bytes = readFileSync(filePath); } catch (err) {
    dialog.showErrorBox(DISPLAY_NAME, `Não foi possível abrir "${filePath}".\n${err?.message ?? err}`);
    return;
  }
  queueOf(win).queue.push({
    name: basename(filePath),
    path: filePath,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  adoptPath(win, filePath);
  lastDir.set(win, dirname(filePath));
  flushOpenQueue(win);
}
/** O 1º arquivo vai para a janela focada se ela ainda não recebeu nenhum; os demais abrem em janelas novas. */
async function openPaths(paths) {
  let candidate = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().at(-1);
  for (const p of paths) {
    const win = candidate && !candidate.isDestroyed() && !queueOf(candidate).opened ? candidate : await createWindow();
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
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Fontes proprietárias que o demo referencia por arquivo (aptos-narrow-*.ttf,
// para a tela e para embutir no PDF) não vêm no app — a licença não permite
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

// Arquivo pedido pelo SO na abertura: o demo não carrega a planilha de exemplo
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
    // porta FIXA preferida: o localStorage do renderer (tema, cor de destaque)
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
const PREFERRED_PORT = 47830;

// ── Navegação e pop-ups ──
// Nada navega para fora da origem do app. O PDF de "Imprimir" (blob: da
// própria origem) abre numa janela do app; links http(s)/mailto vão para o
// navegador do sistema.
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

/** Título da janela: "<planilha> — Universal Sheet (Beta)" (o demo põe "— Universal Sheet"). */
function windowTitle(pageTitle) {
  const doc = String(pageTitle || '').replace(/\s+[—-]\s+(Universal\s+)?Sheet$/i, '').trim();
  return doc && !/^(Universal\s+)?Sheet$/i.test(doc) ? `${doc} — ${DISPLAY_NAME}` : DISPLAY_NAME;
}

async function createWindow() {
  const initial = themeColors(nativeTheme.shouldUseDarkColors);
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: !SMOKE,
    title: DISPLAY_NAME,
    backgroundColor: initial.background,
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
  confirmCloseWhenDirty(win);
  appWindows.add(win);
  win.on('closed', () => appWindows.delete(win));
  queueOf(win);
  win.on('page-title-updated', (e, title) => { e.preventDefault(); win.setTitle(windowTitle(title)); });
  // página nova (reload): o que estava na fila espera o novo "ready"
  win.webContents.on('did-start-navigation', (ev, _url, isInPlace, isMainFrame) => {
    if ((ev?.isMainFrame ?? isMainFrame) && !(ev?.isSameDocument ?? isInPlace)) queueOf(win).ready = false;
  });
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
  warmFontIndex(); // índice das fontes do SO pronto antes da 1ª planilha pedir
  if (initial.length) {
    deliverPath(win, initial[0]);
    if (initial.length > 1) await openPaths(initial.slice(1));
  }
  if (pendingPaths.length) await openPaths(pendingPaths.splice(0));
});

app.on('window-all-closed', () => app.quit());
