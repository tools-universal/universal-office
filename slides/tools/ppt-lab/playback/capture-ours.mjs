// NOSSA reprodução automática, quadro a quadro: o <universal-presentation-viewer>
// em play() roda no Chromium headless sob RELÓGIO VIRTUAL (page.clock) e cada
// quadro é capturado nos MESMOS instantes dos quadros do vídeo do PowerPoint
// (o app usa passo inteiro de ms: 30 fps => 33 ms). Quadros cujo estado
// visual não mudou (assinatura do playback) reaproveitam a captura anterior.
// Saída por deck em <outRoot>/<deck>/<ext>/:
//   ours.mkv            vídeo SEM PERDAS (libx264rgb crf 0) dos quadros
//   ours-timeline.json  linha do tempo que o nosso player calculou
//   ours-status.json    ok/erro (ex.: .ppt não suportado), nº de quadros, tempos
//
// Uso (normalmente via run-playback.mjs):
//   node capture-ours.mjs --out <dir> [--fps 30] [--default-slide 3000] [--jobs 2] deck1.pptx deck2.ppt …
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename, extname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deckFamilies, syncFonts } from './fonts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');

// ── argumentos ──
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const outRoot = opt('out', join(here, '..', 'results', 'playback'));
const fps = Number(opt('fps', '30'));
const defaultSlideMs = Number(opt('default-slide', '3000'));
const jobs = Number(opt('jobs', '2'));
const W = Number(opt('width', '1280'));
const H = Number(opt('height', '720'));
const decks = argv;
if (!decks.length) { console.error('uso: capture-ours.mjs --out <dir> deck.pptx …'); process.exit(1); }

// ── fontes do SO usadas pelos decks (harness carrega ./.fonts/fonts.css) ──
// .ppt: converte com o MESMO conversor do player (src, via esbuild) antes de varrer o XML
let convertPpt = null;
if (decks.some((d) => /\.ppt$/i.test(d))) {
  const conv = join(here, '.ppt-convert.bundle.mjs');
  await build({
    entryPoints: [join(slidesRoot, 'packages', 'slides-core', 'src', 'ppt', 'index.ts')],
    bundle: true, format: 'esm', platform: 'node', outfile: conv, logLevel: 'warning',
  });
  ({ convertPptToPptx: convertPpt } = await import(pathToFileURL(conv).href));
}
const fams = new Set();
for (const d of decks) {
  let bytes = new Uint8Array(readFileSync(d));
  if (/\.ppt$/i.test(d)) { try { bytes = convertPpt(bytes); } catch { continue; } }
  for (const f of deckFamilies(bytes)) fams.add(f);
}
const fontRes = syncFonts(fams, join(here, '.fonts'));
console.log(`fontes: ${fontRes.found.length} faces; ausentes: ${fontRes.missing.join(', ') || 'nenhuma'}`);

// ── bundle do harness ──
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true,
  format: 'esm',
  outfile: join(here, 'harness.bundle.js'),
  alias: {
    '@universal-office/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts'),
    '@universal-office/charts': join(slidesRoot, '..', 'shared', 'charts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(slidesRoot, '..', 'shared', 'drawingml', 'src', 'index.ts'),
  },
  logLevel: 'warning',
});

// ── dev-server (porta 8125; reusa se já estiver de pé) ──
async function ensureServer() {
  try { if ((await fetch('http://127.0.0.1:8125/package.json')).ok) return null; } catch { /* sobe */ }
  const child = spawn(process.execPath, [join(slidesRoot, 'tools', 'dev-server.mjs')], { stdio: 'ignore', windowsHide: true });
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try { if ((await fetch('http://127.0.0.1:8125/package.json')).ok) return child; } catch { /* subindo */ }
  }
  child.kill();
  throw new Error('dev-server não subiu na 8125');
}
const serverChild = await ensureServer();

/**
 * Passo entre quadros (ms) = o do vídeo do app (passo INTEIRO: 30 fps → 33 ms).
 * Medido: a linha do tempo do app anda 33 ms por quadro; só as transições
 * contam quadros a 30/s (`transitionFps` no play()).
 */
function frameInfo(dir) {
  const mp4 = join(dir, 'ppt.mp4');
  if (existsSync(mp4)) {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-count_packets',
      '-show_entries', 'stream=r_frame_rate,nb_read_packets', '-of', 'json', mp4], { windowsHide: true }).toString();
    const st = JSON.parse(out).streams[0];
    const [n, d] = st.r_frame_rate.split('/').map(Number);
    return { stepMs: Math.round((1000 * d) / n), pptFrames: Number(st.nb_read_packets) };
  }
  return { stepMs: Math.floor(1000 / fps), pptFrames: 0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureDeck(browser, deckPath) {
  const deck = basename(deckPath, extname(deckPath));
  const ext = extname(deckPath).slice(1).toLowerCase();
  const dir = join(outRoot, deck, ext);
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const status = { deck, ext, ok: false, fps, width: W, height: H, defaultSlideMs };
  const writeStatus = () => writeFileSync(join(dir, 'ours-status.json'), JSON.stringify(status, null, 1));
  const { stepMs, pptFrames } = frameInfo(dir);
  status.stepMs = stepMs;

  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    await page.clock.install({ time: 0 });
    await page.goto(`http://127.0.0.1:8125/tools/ppt-lab/playback/harness.html${process.env.PB_QUERY ?? ''}`, { waitUntil: 'load' });
    await page.evaluate(([w, h]) => window.pb.setSize(w, h), [W, H]);
    const url = '/' + relative(slidesRoot, deckPath).split('\\').join('/');
    const res = await page.evaluate((u) => window.pb.load(u), url);
    if (!res.ok) {
      status.error = `nosso player não abre ${ext.toUpperCase()}: ${res.error}`;
      writeStatus();
      console.log(`${deck}.${ext}: NÃO SUPORTADO — ${res.error}`);
      return;
    }
    // imagens decodificadas + fontes carregadas (tempo real; relógio ainda corre)
    for (let i = 0; i < 300 && (await page.evaluate(() => window.pb.pendingImages())) > 0; i++) await sleep(50);
    status.fontsLoaded = await page.evaluate(() => window.pb.fontsReady());
    // congela o relógio e começa a tocar em t=0
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 1000);
    // tickMs = passo do vídeo do oráculo (o app troca de fase no tick de render);
    // transições contam quadros a `fps` por segundo, cada um com tickMs
    const timeline = await page.evaluate((o) => window.pb.start(o), { defaultSlideMs, tickMs: stepMs, transitionFps: fps, media: 'seek' });
    // vídeo/GIF: antes de cada quadro, busca exata das mídias (o vídeo não toca sob relógio virtual)
    const hasMedia = await page.evaluate(() => window.pb.hasMedia());
    const mediaSig = async () => {
      if (!hasMedia) return '';
      const timeout = new Promise((r) => setTimeout(() => r('timeout'), 8000));
      return Promise.race([page.evaluate(() => window.pb.media()), timeout]);
    };
    writeFileSync(join(dir, 'ours-timeline.json'), JSON.stringify(timeline, null, 1));
    const ourFrames = Math.ceil(timeline.durationMs / stepMs) + 1;
    const total = Math.max(pptFrames, ourFrames);
    Object.assign(status, { slides: res.count, durationMs: timeline.durationMs, pptFrames, ourFrames, frames: total });

    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', `1000/${stepMs}`, '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264rgb', '-crf', '0', '-preset', 'ultrafast', '-pix_fmt', 'rgb24', join(dir, 'ours.mkv')],
    { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let ffErr = '';
    ff.stderr.on('data', (d) => { ffErr += d; });
    const ffDone = new Promise((r) => ff.on('close', r));
    const write = (buf) => new Promise((r) => { if (ff.stdin.write(buf)) r(); else ff.stdin.once('drain', r); });

    let lastSig = null, lastPng = null, shots = 0;
    // o relógio do Playwright arredonda ms fracionários p/ cima (runFor(33.3) = 34):
    // avança por diferenças INTEIRAS até o alvo ideal k·stepMs
    let clockMs = 0;
    for (let k = 0; k < total; k++) {
      const target = Math.round(k * stepMs);
      if (target > clockMs) { await page.clock.runFor(target - clockMs); clockMs = target; }
      const msig = await mediaSig();
      const sig = (await page.evaluate(() => { window.pb.paint(); return window.pb.signature(); })) + msig;
      if (sig !== lastSig || !lastPng) {
        lastPng = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, type: 'png' });
        lastSig = sig;
        shots++;
      }
      await write(lastPng);
      if (k % 300 === 0) process.stdout.write(`  ${deck}.${ext}: quadro ${k}/${total}\r`);
    }
    ff.stdin.end();
    const code = await ffDone;
    if (code !== 0) throw new Error(`ffmpeg saiu ${code}: ${ffErr}`);
    Object.assign(status, { ok: true, screenshots: shots, elapsedSec: (Date.now() - t0) / 1000, errors: errors.slice(0, 20) });
    writeStatus();
    console.log(`${deck}.${ext}: ${total} quadros (${shots} capturas) em ${status.elapsedSec.toFixed(1)}s`);
  } catch (e) {
    status.error = String(e?.stack ?? e);
    status.errors = errors.slice(0, 20);
    writeStatus();
    console.log(`${deck}.${ext}: ERRO ${e}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const queue = [...decks];
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
  for (let d = queue.shift(); d; d = queue.shift()) await captureDeck(browser, d);
}));
await browser.close();
if (serverChild) serverChild.kill();
