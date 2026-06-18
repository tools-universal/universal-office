// Diagnóstico: estrutura de brilho das duas imagens (offset/inversão/texto ausente).
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const cell = 16; // grade NxN de blocos
for (const label of ['excel', 'ours']) {
  const p = PNG.sync.read(readFileSync(`tools/excel-lab/results/pixel/${label}/page2.png`));
  const at = (x, y) => { const i = (p.width * y + x) * 4; return 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]; };
  let sum = 0, dark = 0, minX = p.width, minY = p.height, maxX = 0, maxY = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const v = at(x, y); sum += v;
    if (v < 180) { dark++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  // grade de brilho (média por bloco) — '#' = escuro, '.' = claro
  const cols = Math.ceil(p.width / cell), rows = Math.ceil(p.height / cell);
  const grid = [];
  for (let by = 0; by < rows; by++) {
    let line = '';
    for (let bx = 0; bx < cols; bx++) {
      let s = 0, n = 0;
      for (let y = by * cell; y < Math.min(p.height, (by + 1) * cell); y++)
        for (let x = bx * cell; x < Math.min(p.width, (bx + 1) * cell); x++) { s += at(x, y); n++; }
      const avg = s / n;
      line += avg < 230 ? (avg < 180 ? '#' : '+') : '.';
    }
    grid.push(line);
  }
  console.log(`\n=== ${label} ${p.width}x${p.height} mean=${Math.round(sum / (p.width * p.height))} ink%=${Math.round(dark * 100 / (p.width * p.height))} bbox=[${minX},${minY}-${maxX},${maxY}] ===`);
  for (const l of grid) console.log(l);
}
