// Compara as posições verticais das linhas de texto (bandas de tinta).
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const word = PNG.sync.read(readFileSync(process.argv[2]));
const ours = PNG.sync.read(readFileSync(process.argv[3]));
const gray = (img, x, y) => { const i = (img.width * y + x) << 2; return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; };
function bands(img) {
  const out = [];
  let s = -1;
  for (let y = 0; y < img.height; y++) {
    let ink = 0;
    for (let x = 0; x < img.width; x += 2) if (gray(img, x, y) < 128) ink++;
    const has = ink > 3;
    if (has && s < 0) s = y;
    if (!has && s >= 0) { if (y - s > 3) out.push([s, y]); s = -1; }
  }
  return out;
}
const bw = bands(word);
const bo = bands(ours);
console.log(`bandas: word=${bw.length} ours=${bo.length}`);
for (let i = 0; i < Math.max(bw.length, bo.length); i++) {
  const w = bw[i] ? `${bw[i][0]}-${bw[i][1]}` : '—';
  const o = bo[i] ? `${bo[i][0]}-${bo[i][1]}` : '—';
  const d = bw[i] && bo[i] ? bo[i][0] - bw[i][0] : '?';
  console.log(`${String(i + 1).padStart(2)} | word ${w.padEnd(9)} | ours ${o.padEnd(9)} | Δtopo ${d}`);
}
