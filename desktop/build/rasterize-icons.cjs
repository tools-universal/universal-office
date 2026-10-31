// Rasteriza os ícones REAIS dos apps (site/assets/icons/*.svg) com o Chromium do
// Electron — eles usam CSS (color-mix, currentColor, seletores em <style>), que
// o librsvg/sharp não desenha. Janela OFFSCREEN (nada aparece na tela, nada
// toma o foco), fundo transparente, cada tamanho desenhado nativamente.
// Chamado por build/gen-icons.mjs:
//   electron build/rasterize-icons.cjs <saída> <pasta dos svg> <jobs.json>
// jobs.json: [{ name, size, html }] — `html` é o corpo da página (as imagens
// referem os SVG por caminho relativo à pasta deles); grava <saída>/<name>.png.
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const [outDir, svgDir, jobsFile] = process.argv.slice(-3);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  mkdirSync(outDir, { recursive: true });
  const jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
  const win = new BrowserWindow({
    show: false, width: 1100, height: 1100, frame: false, transparent: true,
    webPreferences: { offscreen: true, javascript: true, sandbox: true },
  });
  win.webContents.setFrameRate(60);
  const page = join(outDir, '.page.html');
  try {
    for (const job of jobs) {
      writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(svgDir + '/').href}">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#c{position:absolute;left:0;top:0;width:${job.size}px;height:${job.size}px}</style></head>
<body><div id="c">${job.html}</div></body></html>`);
      await win.loadFile(page);
      await win.webContents.executeJavaScript(`Promise.all([...document.images].map((i) => i.decode().catch(() => {}))).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
      await new Promise((r) => setTimeout(r, 60));
      let img = await win.webContents.capturePage({ x: 0, y: 0, width: job.size, height: job.size });
      const { width, height } = img.getSize();
      if (width !== job.size || height !== job.size) img = img.resize({ width: job.size, height: job.size, quality: 'best' });
      writeFileSync(join(outDir, `${job.name}.png`), img.toPNG());
    }
  } finally {
    win.destroy();
  }
  app.quit();
}).catch((err) => { console.error(err); app.exit(1); });
