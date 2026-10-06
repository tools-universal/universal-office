// Amostra cores de pixels de PNGs (para conferir gradientes/cores contra a
// referência sem abrir imagens).
//
// Uso: node tools/ppt-lab/ppt-binary/px.mjs <a.png> [b.png…] -- x,y x,y …
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const sep = args.indexOf('--');
const files = sep >= 0 ? args.slice(0, sep) : args.slice(0, 1);
const pts = (sep >= 0 ? args.slice(sep + 1) : args.slice(1)).map((s) => s.split(',').map(Number));
for (const f of files) {
  const p = PNG.sync.read(readFileSync(f));
  const out = pts.map(([x, y]) => {
    const i = (p.width * y + x) * 4;
    return `${x},${y}=#${[p.data[i], p.data[i + 1], p.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
  console.log(f.split(/[\\/]/).slice(-2).join('/'), out.join(' '));
}
