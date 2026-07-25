// Identifica família/subfamília dos TTFs do cache CloudFonts (tabela `name`).
import { readFileSync, readdirSync } from 'node:fs';

const dir = process.env.LOCALAPPDATA + '/Microsoft/FontCache/4/CloudFonts/Aptos/';

function nameOf(buf, wantId) {
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
    const platform = buf.readUInt16BE(r);
    const nameId = buf.readUInt16BE(r + 6);
    const len = buf.readUInt16BE(r + 8);
    const off = buf.readUInt16BE(r + 10);
    if (nameId === wantId && platform === 3) {
      const raw = buf.subarray(strOff + off, strOff + off + len);
      return Buffer.from(raw).swap16().toString('utf16le');
    }
  }
  return '?';
}

for (const f of readdirSync(dir)) {
  const b = readFileSync(dir + f);
  console.log(f, '->', JSON.stringify(nameOf(b, 1)), JSON.stringify(nameOf(b, 2)));
}
