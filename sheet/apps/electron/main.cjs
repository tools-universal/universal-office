// Shell Electron do Universal Sheet — embarca o demo do <universal-sheet>
// servindo a raiz do projeto via servidor estatico interno (fetch de .xlsx +
// fontes nao funciona via file://). Espelha o padrao do slides/apps/electron.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const http = require('node:http');
const { createReadStream, statSync, readFileSync, writeFileSync } = require('node:fs');
const { join, normalize, extname, basename } = require('node:path');

const repoRoot = join(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
      if (!path.startsWith(repoRoot)) { res.writeHead(403).end(); return; }
      try {
        const st = statSync(path);
        const file = st.isDirectory() ? join(path, 'index.html') : path;
        statSync(file);
        res.writeHead(200, {
          'content-type': MIME[extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        createReadStream(file).pipe(res);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

ipcMain.handle('us:open-xlsx', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Abrir planilha',
    filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }],
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

ipcMain.handle('us:save-xlsx', async (_e, bytesBuffer, suggestedName) => {
  const result = await dialog.showSaveDialog({
    title: 'Salvar planilha',
    defaultPath: suggestedName || 'planilha.xlsx',
    filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }],
  });
  if (result.canceled || !result.filePath) return null;
  writeFileSync(result.filePath, Buffer.from(bytesBuffer));
  return result.filePath;
});

// Salvar genérico (Salvar como multi-formato: csv/tsv/md/html/pdf/ods/xml…)
ipcMain.handle('us:save-file', async (_e, bytesBuffer, defaultName, filterName, ext) => {
  const result = await dialog.showSaveDialog({
    title: 'Salvar como',
    defaultPath: defaultName || `arquivo.${ext || 'dat'}`,
    filters: [{ name: filterName || 'Arquivo', extensions: [ext || '*'] }],
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
    title: 'Universal Sheet',
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
  await win.loadURL(`http://127.0.0.1:${port}/packages/sheet/demo/index.html`);
});

app.on('window-all-closed', () => app.quit());
