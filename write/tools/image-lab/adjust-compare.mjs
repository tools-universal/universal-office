// Compara os ajustes a14 do nosso motor (@universal-office/drawingml) com a
// imagem que o Word gravou já processada (lote pe-* do oráculo): erro médio e
// máximo por canal (0..255) e amostras da faixa de cinzas.
//
//   node tools/image-lab/adjust-compare.mjs [nomes…]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { unzipSync, strFromU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'package.json'));
const { PNG } = require('pngjs');
const dml = await import(pathToFileURL(join(here, '..', '..', '..', 'shared', 'drawingml', 'dist', 'index.js')).href);

const orig = PNG.sync.read(readFileSync(join(here, '.out', 'img', 'pattern.png')));
const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(here, '.out')).filter((f) => /^pe-.*\.docx$/.test(f)).map((f) => f.slice(0, -5));
for (const n of names) {
  const parts = unzipSync(readFileSync(join(here, '.out', `${n}.docx`)));
  const doc = strFromU8(parts['word/document.xml']);
  const word = PNG.sync.read(Buffer.from(parts['word/media/image1.png']));
  const fx = [...doc.matchAll(/<a14:(saturation|colorTemperature|sharpenSoften|brightnessContrast)\b([^>]*)\/>/g)];
  const d = new Uint8ClampedArray(orig.data);
  const attr = (s, k, def) => { const m = new RegExp(`${k}="(-?\\d+)"`).exec(s); return m ? Number(m[1]) : def; };
  for (const [, kind, a] of fx) {
    if (kind === 'saturation') dml.adjustSaturation(d, attr(a, 'sat', 100000) / 100000);
    else if (kind === 'colorTemperature') dml.adjustTemperature(d, attr(a, 'colorTemp', 6500));
    else if (kind === 'brightnessContrast') dml.adjustBrightnessContrast(d, attr(a, 'bright', 0) / 100000, attr(a, 'contrast', 0) / 100000);
    else if (kind === 'sharpenSoften') dml.adjustSharpen(d, orig.width, orig.height, attr(a, 'amount', 0) / 100000);
  }
  let sum = 0, max = 0;
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const e = Math.abs(d[i + c] - word.data[i + c]); sum += e; max = Math.max(max, e); }
  const ramp = [13, 64, 128, 192, 243].map((g) => {
    const x = Math.round((g / 255) * 479), i = (330 * orig.width + x) * 4;
    return `${g}:w(${word.data[i]},${word.data[i + 1]},${word.data[i + 2]})/n(${d[i]},${d[i + 1]},${d[i + 2]})`;
  }).join(' ');
  const red = (60 * orig.width + 100) * 4;
  console.log(`${n} ${fx.map((m) => m[1] + m[2].trim()).join(' ')}: erro médio ${(sum / (d.length / 4 * 3)).toFixed(2)} máx ${max} | vermelho w(${word.data[red]},${word.data[red + 1]},${word.data[red + 2]}) n(${d[red]},${d[red + 1]},${d[red + 2]}) | ${ramp}`);
}
