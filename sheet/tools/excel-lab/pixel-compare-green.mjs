// pixel-compare pelo CANAL VERDE: o CopyPicture(xlScreen) do Excel tem fringes
// ClearType nos subpixels R/B, mas o canal G é grayscale limpo (resolução nativa).
// Comparar G(excel) vs luminância(ours) remove o ruído do ClearType.
// Uso: node tools/excel-lab/pixel-compare-green.mjs <excelDir> <oursDir> <tol>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const [excelDir, oursDir, tolArg] = process.argv.slice(2);
const TOL = parseInt(tolArg ?? '48', 10);
const gOnly = (d, i) => d[i + 1];               // canal verde (limpo no ClearType)
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

function blur(fn, img, w, h) {
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = fn(img.data, (img.width * y + x) * 4);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += a[yy * w + xx]; n++; }
    }
    out[y * w + x] = s / n;
  }
  return out;
}

const pages = readdirSync(excelDir).filter((f) => /^page\d+\.png$/.test(f)).sort(
  (a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]),
);
let totalDiff = 0, totalInk = 0;
for (const name of pages) {
  let ours; try { ours = PNG.sync.read(readFileSync(join(oursDir, name))); } catch { console.log(name, 'ours ausente'); continue; }
  const excel = PNG.sync.read(readFileSync(join(excelDir, name)));
  const w = Math.min(excel.width, ours.width), h = Math.min(excel.height, ours.height);
  const be = blur(gOnly, excel, w, h), bo = blur(lum, ours, w, h);
  let nDiff = 0, nInk = 0, nDiffBlur = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ge = gOnly(excel.data, (excel.width * y + x) * 4);
    const go = lum(ours.data, (ours.width * y + x) * 4);
    if (Math.abs(be[y * w + x] - bo[y * w + x]) > TOL) nDiffBlur++;
    const isInk = ge < 200 || go < 200;
    if (isInk) nInk++;
    if (Math.abs(ge - go) > TOL) nDiff++;
  }
  totalDiff += nDiff; totalInk += nInk;
  console.log(`${name} ${w}x${h}: raw=${nInk ? Math.round(nDiff / nInk * 10000) / 100 : 0}% structural=${nInk ? Math.round(nDiffBlur / nInk * 10000) / 100 : 0}%`);
}
console.log(`TOTAL: ${totalInk ? Math.round(totalDiff / totalInk * 10000) / 100 : 0}% da tinta (raw, canal G)`);
