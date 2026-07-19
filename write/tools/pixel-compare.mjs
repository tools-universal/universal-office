// Compara PNGs Word×UniversalWrite em escala de cinza com tolerância de antialias.
// Uso: node tools/pixel-compare.mjs <wordDir> <oursDir> <outDir> [tolerância 0-255]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const [wordDir, oursDir, outDir, tolArg] = process.argv.slice(2);
const TOL = parseInt(tolArg ?? '48', 10);
mkdirSync(outDir, { recursive: true });

const gray = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Box blur 3x3 sobre o canal de cinza — separa estrutura de fase de antialias. */
function blurGray(img, w, h) {
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = gray(img.data, (img.width * y + x) << 2);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += g[yy * w + xx]; n++; }
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

const pages = readdirSync(wordDir).filter((f) => /^page\d+\.png$/.test(f)).sort(
  (a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10),
);
let totalDiff = 0, totalInk = 0;
const report = [];
for (const name of pages) {
  let ours;
  try { ours = PNG.sync.read(readFileSync(join(oursDir, name))); }
  catch { report.push({ page: name, error: 'nossa página ausente' }); continue; }
  const word = PNG.sync.read(readFileSync(join(wordDir, name)));
  const w = Math.min(word.width, ours.width);
  const h = Math.min(word.height, ours.height);
  const bw = blurGray(word, w, h);
  const bo = blurGray(ours, w, h);
  const diff = new PNG({ width: w, height: h });
  let nDiff = 0, nInk = 0, nDiffBlur = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const iw = (word.width * y + x) << 2;
      const io = (ours.width * y + x) << 2;
      const id = (w * y + x) << 2;
      const gw = gray(word.data, iw);
      const go = gray(ours.data, io);
      if (Math.abs(bw[y * w + x] - bo[y * w + x]) > TOL) nDiffBlur++;
      const delta = Math.abs(gw - go);
      const isInk = gw < 200 || go < 200;
      if (isInk) nInk++;
      const bad = delta > TOL;
      if (bad) nDiff++;
      // heatmap: fundo = nossa página clareada; divergência em vermelho
      diff.data[id] = bad ? 255 : 255 - (255 - go) * 0.25;
      diff.data[id + 1] = bad ? 40 : 255 - (255 - go) * 0.25;
      diff.data[id + 2] = bad ? 40 : 255 - (255 - go) * 0.25;
      diff.data[id + 3] = 255;
    }
  }
  writeFileSync(join(outDir, `diff-${name}`), PNG.sync.write(diff));
  const pct = (nDiff / (w * h)) * 100;
  const pctInk = nInk ? (nDiff / nInk) * 100 : 0;
  totalDiff += nDiff; totalInk += nInk;
  report.push({
    page: name, size: `${w}x${h}`,
    diffPixels: nDiff,
    diffPct: Math.round(pct * 1000) / 1000,
    diffPctOfInk: Math.round(pctInk * 100) / 100,
    structuralPctOfInk: nInk ? Math.round((nDiffBlur / nInk) * 10000) / 100 : 0,
  });
}
console.log(JSON.stringify(report, null, 1));
console.log(`TOTAL: ${totalDiff} px divergentes; ${totalInk ? Math.round((totalDiff / totalInk) * 10000) / 100 : 0}% da tinta`);
