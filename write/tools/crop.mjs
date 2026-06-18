// Recorta uma região de um PNG: node crop.mjs in.png out.png x y w h
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [inp, outp, x0, y0, w, h] = process.argv.slice(2);
const src = PNG.sync.read(readFileSync(inp));
const out = new PNG({ width: +w, height: +h });
for (let y = 0; y < +h; y++) {
  for (let x = 0; x < +w; x++) {
    const si = ((+y0 + y) * src.width + (+x0 + x)) << 2;
    const di = (y * +w + x) << 2;
    for (let k = 0; k < 4; k++) out.data[di + k] = src.data[si + k];
  }
}
writeFileSync(outp, PNG.sync.write(out));
console.log('ok', outp);
