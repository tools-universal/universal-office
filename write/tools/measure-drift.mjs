// Mede a deriva horizontal entre Word e WordNext: para cada linha de texto,
// acha o melhor deslocamento (cross-correlação do perfil de tinta) em janelas
// ao longo da linha. Saída: deslocamento por janela → mostra deriva cumulativa.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const word = PNG.sync.read(readFileSync(process.argv[2]));
const ours = PNG.sync.read(readFileSync(process.argv[3]));
const gray = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};

// detecta bandas de linhas de texto (linhas com tinta) na imagem do Word
const rows = [];
for (let y = 0; y < word.height; y++) {
  let ink = 0;
  for (let x = 0; x < word.width; x += 2) if (gray(word, x, y) < 128) ink++;
  rows.push(ink);
}
const bands = [];
let start = -1;
for (let y = 0; y < rows.length; y++) {
  if (rows[y] > 3 && start < 0) start = y;
  if (rows[y] <= 3 && start >= 0) { if (y - start > 4) bands.push([start, y]); start = -1; }
}

function profile(img, y0, y1, x0, x1) {
  const p = [];
  for (let x = x0; x < x1; x++) {
    let ink = 0;
    for (let y = y0; y < y1; y++) ink += Math.max(0, 200 - gray(img, x, y));
    p.push(ink);
  }
  return p;
}
function bestShift(pw, po) {
  let best = 0, bestScore = -1;
  for (let s = -8; s <= 8; s++) {
    let score = 0;
    for (let i = 0; i < pw.length; i++) {
      const j = i + s;
      if (j >= 0 && j < po.length) score += Math.min(pw[i], po[j]);
    }
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}

console.log('linha (y) | shifts por janela de 100px (ours relativo a word; + = nosso à direita)');
for (const [y0, y1] of bands.slice(0, 8)) {
  const shifts = [];
  for (let x0 = 100; x0 < word.width - 120; x0 += 100) {
    const pw = profile(word, y0, y1, x0, x0 + 100);
    const po = profile(ours, y0, y1, x0, x0 + 100);
    const ink = pw.reduce((a, b) => a + b, 0);
    shifts.push(ink > 500 ? bestShift(pw, po) : '·');
  }
  console.log(`y=${y0}-${y1} | ${shifts.join(' ')}`);
}
// também deriva vertical: melhor shift de bandas inteiras
function vprofile(img, x0, x1) {
  const p = [];
  for (let y = 0; y < img.height; y++) {
    let ink = 0;
    for (let x = x0; x < x1; x += 2) ink += Math.max(0, 200 - gray(img, x, y));
    p.push(ink);
  }
  return p;
}
const vw = vprofile(word, 100, 700);
const vo = vprofile(ours, 100, 700);
console.log('shift vertical global:', bestShift(vw, vo));
