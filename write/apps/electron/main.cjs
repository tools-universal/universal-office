// Shell Electron do UniversalWrite — v1: embarca o demo do <universal-write> servindo a
// raiz do repositório por um servidor estático interno (fetch de docx/fontes
// não funciona via file://).
const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const http = require('node:http');
const { createReadStream, statSync, readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, normalize, extname, basename } = require('node:path');

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

// Fontes do SO por família: Windows\Fonts + fontes do usuário + cache
// CloudFonts do Office (invisível ao queryLocalFonts). Empacotado, o módulo
// vem em resources (ver "extraResources" no package.json).
const { warmFontIndex, listFontFamilies, resolveFonts } = require(app.isPackaged
  ? join(process.resourcesPath, 'system-fonts.cjs')
  : '../../../shared/fonts/node/system-fonts.cjs');
ipcMain.handle('wn:resolve-fonts', (_e, families) => resolveFonts(families));
ipcMain.handle('wn:list-fonts', () => listFontFamilies());

ipcMain.handle('wn:open-docx', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Abrir documento',
    filters: [{ name: 'Documento do Word', extensions: ['docx'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const bytes = readFileSync(filePath);
  return {
    name: basename(filePath),
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    motw: hasMarkOfTheWeb(filePath),
  };
});

// Segundo documento para a comparação ("Comparar com…"). Sem MOTW: o diff é
// somente leitura, não passa pelo Modo Protegido.
ipcMain.handle('wn:open-docx-compare', async (e, title) => {
  const result = await dialog.showOpenDialog({
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

app.whenReady().then(async () => {
  // Em dev, renderiza o SVG → PNG para o ícone da janela. Empacotado, o ícone
  // já vem embutido no executável/bundle pelo electron-builder (e o asar é
  // somente-leitura, então não dá para gravar icon.png em runtime).
  const iconPath = app.isPackaged
    ? undefined
    : await ensureIconPng().catch((err) => {
        console.warn('[wn] não foi possível gerar icon.png:', err?.message);
        return undefined;
      });
  // macOS usa o dock; demais SOs usam icon: na janela
  if (iconPath && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }
  const port = await serve();
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
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
  await win.loadURL(`http://127.0.0.1:${port}/packages/editor/demo/index.html`);
  warmFontIndex(); // índice das fontes do SO pronto antes do 1º documento pedir
});

app.on('window-all-closed', () => app.quit());
