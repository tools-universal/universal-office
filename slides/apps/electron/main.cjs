// Shell Electron do Universal Slides — embarca o demo do <universal-slides>
// servindo a raiz do projeto via servidor estatico interno (fetch de .pptx +
// fontes nao funciona via file://). Espelha o padrao do write/apps/electron.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const http = require('node:http');
const { createReadStream, statSync, readFileSync, writeFileSync } = require('node:fs');
const { join, normalize, extname, basename, sep } = require('node:path');
const { warmFontIndex, listFontFamilies, resolveFonts } = require('../../../tools/electron/system-fonts.cjs');

const repoRoot = join(__dirname, '..', '..');

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

function serve() {
  return new Promise((resolve) => {
    let port = 0;
    const rootPrefix = normalize(repoRoot + sep);
    const server = http.createServer((req, res) => {
      // só o próprio app: Host diferente = outra origem (DNS rebinding)
      const host = req.headers.host ?? '';
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
      let path;
      try { path = normalize(join(repoRoot, decodeURIComponent(new URL(req.url, 'http://x').pathname))); }
      catch { res.writeHead(400).end(); return; } // %-escape inválido etc.
      if (path !== normalize(repoRoot) && !path.startsWith(rootPrefix)) { res.writeHead(403).end(); return; }
      try {
        const st = statSync(path);
        const file = st.isDirectory() ? join(path, 'index.html') : path;
        statSync(file);
        res.writeHead(200, {
          'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        createReadStream(file).on('error', () => res.destroy()).pipe(res);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(port); });
  });
}

// ── Fontes do SO por família (módulo compartilhado dos shells Electron) ──
// Windows\Fonts + fontes do usuário + cache CloudFonts do Office (invisível ao
// queryLocalFonts) — ver tools/electron/system-fonts.cjs.
ipcMain.handle('us:resolve-fonts', (_e, families) => resolveFonts(families));
ipcMain.handle('us:list-fonts', () => listFontFamilies());

ipcMain.handle('us:open-pptx', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Abrir apresentacao',
    filters: [{ name: 'Apresentacao PowerPoint', extensions: ['pptx', 'ppt'] }],
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

ipcMain.handle('us:save-pptx', async (_e, bytesBuffer, suggestedName) => {
  const result = await dialog.showSaveDialog({
    title: 'Salvar apresentacao',
    defaultPath: suggestedName || 'apresentacao.pptx',
    filters: [{ name: 'Apresentacao PowerPoint', extensions: ['pptx'] }],
  });
  if (result.canceled || !result.filePath) return null;
  writeFileSync(result.filePath, Buffer.from(bytesBuffer));
  return result.filePath;
});

ipcMain.handle('us:title-theme', (e, dark) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  win.setTitleBarOverlay({
    color: dark ? '#131316' : '#FCFCFC',
    symbolColor: dark ? '#e3e3e3' : '#1f1f1f',
    height: 48,
  });
  win.setBackgroundColor(dark ? '#131316' : '#FCFCFC');
});

app.whenReady().then(async () => {
  const port = await serve();
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Universal Slides',
    backgroundColor: '#FCFCFC',
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
  // hyperlinks dos slides (window.open) vão para o navegador do sistema — nunca
  // uma janela Electron; só http(s)/mailto (nada de file:// ou protocolos de app)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) e.preventDefault();
  });
  await win.loadURL(`http://127.0.0.1:${port}/packages/slides/demo/index.html`);
  warmFontIndex(); // índice das fontes do SO pronto antes do 1º deck pedir
});

app.on('window-all-closed', () => app.quit());
