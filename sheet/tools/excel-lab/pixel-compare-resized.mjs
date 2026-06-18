// pixel-compare com resize: redimensiona a imagem "excel" para as dimensões da
// "ours" (a impressão do Excel escala ~8% diferente da tela) e então aplica a
// métrica crua + estrutural (blur 3×3). Para PDF→WinRT (grayscale, sem ClearType).
// Uso: node tools/excel-lab/pixel-compare-resized.mjs <excelDir> <oursDir> <tol>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const [excelDir, oursDir, tolArg] = process.argv.slice(2);
const TOL = parseInt(tolArg ?? '48', 10);

function resize(src, w, h) {
  const out = new PNG({ width: w, height: h });
  const sx = src.width / w, sy = src.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // bilinear
    const fx = x * sx, fy = y * sy;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(src.width - 1, x0 + 1), y1 = Math.min(src.height - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const idx = (s, xx, yy) => (s.width * yy + xx) * 4;
    for (let c = 0; c < 4; c++) {
      const top = src.data[idx(src, x0, y0) + c] * (1 - tx) + src.data[idx(src, x1, y0) + c] * tx;
      const bot = src.data[idx(src, x0, y1) + c] * (1 - tx) + src.data[idx(src, x1, y1) + c] * tx;
      out.data[(w * y + x) * 4 + c] = Math.round(top * (1 - ty) + bot * ty);
    }
  }
  return out;
}
const gray = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
function blurGray(img, w, h) {
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = gray(img.data, (img.width * y + x) * 4);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += g[yy * w + xx]; n++; }
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
  let ours;
  try { ours = PNG.sync.read(readFileSync(join(oursDir, name))); }
  catch { console.log(name, 'ours ausente'); continue; }
  let excel = PNG.sync.read(readFileSync(join(excelDir, name)));
  const w = ours.width, h = ours.height;
  if (excel.width !== w || excel.height !== h) excel = resize(excel, w, h);
  const be = blurGray(excel, w, h), bo = blurGray(ours, w, h);
  let nDiff = 0, nInk = 0, nDiffBlur = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ge = gray(excel.data, (excel.width * y + x) * 4);
    const go = gray(ours.data, (ours.width * y + x) * 4);
    if (Math.abs(be[y * w + x] - bo[y * w + x]) > TOL) nDiffBlur++;
    const isInk = ge < 200 || go < 200;
    if (isInk) nInk++;
    if (Math.abs(ge - go) > TOL) nDiff++;
  }
  totalDiff += nDiff; totalInk += nInk;
  console.log(`${name} ${w}x${h}: diffPctOfInk=${nInk ? Math.round(nDiff / nInk * 10000) / 100 : 0}% structuralPctOfInk=${nInk ? Math.round(nDiffBlur / nInk * 10000) / 100 : 0}%`);
}
console.log(`TOTAL: ${totalInk ? Math.round(totalDiff / totalInk * 10000) / 100 : 0}% da tinta divergente (raw)`);
