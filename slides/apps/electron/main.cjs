// Shell Electron do Universal Slides — embarca o demo do <universal-slides>
// servindo a raiz do projeto via servidor estatico interno (fetch de .pptx +
// fontes nao funciona via file://). Espelha o padrao do write/apps/electron.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const http = require('node:http');
const { createReadStream, statSync, readFileSync, writeFileSync } = require('node:fs');
const { readdir, open, readFile } = require('node:fs/promises');
const { join, normalize, extname, basename, sep } = require('node:path');

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

// ── Fontes do SO por família (mesma filosofia do Universal Write) ──
// Varre C:\Windows\Fonts, fontes por usuário e o cache CloudFonts do Office
// (invisível ao queryLocalFonts) UMA vez, lendo só o cabeçalho e as tabelas
// `name`/`OS/2` de cada arquivo; responde por família da tabela `name` em
// INGLÊS (a 1ª entrada do Windows costuma ser catalã: "Negreta", "Cursiva").
// Peso/itálico pela OS/2 (usWeightClass / fsSelection). `.ttc`: face 0 (a que
// o FontFace carrega).
async function readRange(fh, pos, len) {
  const buf = Buffer.alloc(len);
  const { bytesRead } = await fh.read(buf, 0, len, pos);
  return buf.subarray(0, bytesRead);
}

async function fontInfo(path) {
  const fh = await open(path, 'r');
  try {
    let base = 0;
    const head = await readRange(fh, 0, 16);
    if (head.length < 12) return null;
    if (head.toString('latin1', 0, 4) === 'ttcf') base = head.readUInt32BE(12);
    const off = await readRange(fh, base, 12);
    if (off.length < 12) return null;
    const num = off.readUInt16BE(4);
    if (num === 0 || num > 512) return null;
    const dir = await readRange(fh, base + 12, num * 16);
    const tables = {};
    for (let i = 0; i < num; i++) {
      const o = i * 16;
      if (o + 16 > dir.length) break;
      tables[dir.toString('latin1', o, o + 4)] = { off: dir.readUInt32BE(o + 8), len: dir.readUInt32BE(o + 12) };
    }
    if (!tables.name || tables.name.len > (1 << 20)) return null;
    const name = await readRange(fh, tables.name.off, tables.name.len);
    if (name.length < 6) return null;
    const count = name.readUInt16BE(2);
    const strOff = name.readUInt16BE(4);
    const get = (id) => {
      let any;
      for (let i = 0; i < count; i++) {
        const r = 6 + i * 12;
        if (r + 12 > name.length) break;
        if (name.readUInt16BE(r) !== 3 || name.readUInt16BE(r + 6) !== id) continue;
        const len = name.readUInt16BE(r + 8), o = strOff + name.readUInt16BE(r + 10);
        if (o + len > name.length) continue;
        const s = Buffer.from(name.subarray(o, o + len)).swap16().toString('utf16le');
        if (name.readUInt16BE(r + 4) === 0x409) return s;
        any ??= s;
      }
      return any;
    };
    const family = get(1);
    if (!family) return null;
    const sub = get(2) ?? 'Regular';
    let weight = /bold|black|heavy/i.test(sub) ? 700 : /semibold|demibold/i.test(sub) ? 600 : /medium/i.test(sub) ? 500 : 400;
    let italic = /italic|oblique/i.test(sub);
    if (tables['OS/2'] && tables['OS/2'].len >= 64) {
      const os2 = await readRange(fh, tables['OS/2'].off, 64);
      if (os2.length >= 64) {
        weight = os2.readUInt16BE(4) || weight;
        italic = (os2.readUInt16BE(62) & 1) === 1 || italic;
      }
    }
    return { family, weight: Math.max(1, Math.min(1000, weight)), italic };
  } catch {
    return null;
  } finally {
    await fh.close();
  }
}

async function buildFontIndex() {
  const roots = [
    join(process.env.WINDIR ?? 'C:/Windows', 'Fonts'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft/Windows/Fonts'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft/FontCache/4/CloudFonts'),
  ];
  const idx = new Map(); // family(lc) -> [{ path, weight, italic }]
  const seen = new Set(); // family|peso|estilo: a 1ª face encontrada vence
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); } catch { continue; }
      for (const ent of entries) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) { stack.push(p); continue; }
        if (!/\.(ttf|otf|ttc)$/i.test(ent.name)) continue;
        const info = await fontInfo(p);
        if (!info) continue;
        const key = info.family.toLowerCase();
        const dedupe = `${key}|${info.weight}|${info.italic}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const list = idx.get(key) ?? [];
        list.push({ path: p, weight: info.weight, italic: info.italic });
        idx.set(key, list);
      }
    }
  }
  return idx;
}
let fontIndex = null; // Promise<Map> — montado uma vez, sob demanda (assíncrono: não trava o processo)

ipcMain.handle('us:resolve-fonts', async (_e, families) => {
  fontIndex ??= buildFontIndex();
  const idx = await fontIndex;
  const out = [];
  for (const fam of Array.isArray(families) ? families : []) {
    for (const f of idx.get(String(fam).toLowerCase()) ?? []) {
      try {
        const bytes = await readFile(f.path);
        out.push({
          family: String(fam), weight: String(f.weight), style: f.italic ? 'italic' : 'normal',
          bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        });
      } catch { /* arquivo sumiu/inacessível: segue */ }
    }
  }
  return out;
});

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
});

app.on('window-all-closed', () => app.quit());
