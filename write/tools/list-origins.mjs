import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const z = unzipSync(new Uint8Array(readFileSync(process.argv[2])));
const k = Object.keys(z).find((k) => /Pages\/1\.fpage/.test(k));
const f = new TextDecoder('utf-16le').decode(z[k]);
const ys = new Set();
for (const g of f.matchAll(/<Glyphs\b[^>]*>/gs)) {
  const y = g[0].match(/OriginY="([^"]*)"/)?.[1];
  const us = g[0].match(/UnicodeString="([^"]*)"/)?.[1] ?? '';
  if (y && us.trim().length > 0) ys.add(parseFloat(y));
}
const list = [...ys].sort((a, b) => a - b);
for (let i = 0; i < list.length; i++) {
  const dev = list[i] / 0.12;
  const tw = list[i] * 20;
  const prev = i > 0 ? (list[i] - list[i - 1]).toFixed(4) : '—';
  console.log(`${list[i].toFixed(4)}pt  Δ=${prev}  dev=${dev.toFixed(2)}  tw=${tw.toFixed(1)}`);
}
