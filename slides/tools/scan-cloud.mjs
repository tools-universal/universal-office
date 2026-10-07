import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = process.env.LOCALAPPDATA + '/Microsoft/FontCache/4/CloudFonts';
function nameOf(buf, wantId) {
  try {
    const num = buf.readUInt16BE(4);
    let nameOff = -1;
    for (let i = 0; i < num; i++) {
      const o = 12 + i * 16;
      if (buf.toString('latin1', o, o + 4) === 'name') nameOff = buf.readUInt32BE(o + 8);
    }
    if (nameOff < 0) return '?';
    const count = buf.readUInt16BE(nameOff + 2);
    const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12;
      if (buf.readUInt16BE(r) === 3 && buf.readUInt16BE(r + 6) === wantId) {
        const len = buf.readUInt16BE(r + 8), off = buf.readUInt16BE(r + 10);
        return Buffer.from(buf.subarray(strOff + off, strOff + off + len)).swap16().toString('utf16le');
      }
    }
  } catch {}
  return '?';
}
for (const dir of readdirSync(root)) {
  const d = join(root, dir);
  if (!statSync(d).isDirectory()) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.ttf')) continue;
    const b = readFileSync(join(d, f));
    const fam = nameOf(b, 1);
    if (/creepster|alegreya|amatic|roboto/i.test(fam) || /creepster|alegreya|amatic|roboto/i.test(dir)) {
      console.log(dir + '/' + f, '->', JSON.stringify(fam), JSON.stringify(nameOf(b, 2)));
    }
  }
}
console.log('dirs:', readdirSync(root).join(' | '));
