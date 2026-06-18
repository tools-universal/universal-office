// Extremos de tinta por linha em ambas as imagens + previsão do XPS.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const word = PNG.sync.read(readFileSync(process.argv[2]));
const ours = PNG.sync.read(readFileSync(process.argv[3]));
const gray = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};
function bands(img) {
  const rows = [];
  for (let y = 0; y < img.height; y++) {
    let ink = 0;
    for (let x = 0; x < img.width; x += 2) if (gray(img, x, y) < 128) ink++;
    rows.push(ink);
  }
  const out = [];
  let s = -1;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] > 3 && s < 0) s = y;
    if (rows[y] <= 3 && s >= 0) { if (y - s > 4) out.push([s, y]); s = -1; }
  }
  return out;
}
function extent(img, y0, y1) {
  let min = Infinity, max = -1;
  for (let x = 0; x < img.width; x++) {
    for (let y = y0; y < y1; y++) {
      if (gray(img, x, y) < 100) { if (x < min) min = x; if (x > max) max = x; break; }
    }
  }
  return [min, max];
}
const bw = bands(word);
const bo = bands(ours);
console.log('linha | word [ini,fim] | ours [ini,fim] | Δini Δfim (px)');
for (let i = 0; i < Math.min(bw.length, bo.length); i++) {
  const [w0, w1] = extent(word, ...bw[i]);
  const [o0, o1] = extent(ours, ...bo[i]);
  console.log(`${i + 1} | [${w0},${w1}] | [${o0},${o1}] | ${o0 - w0} ${o1 - w1}`);
}
