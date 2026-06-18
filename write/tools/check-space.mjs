import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const z = unzipSync(new Uint8Array(readFileSync('D:/Projects/OfficeNext/WordNext/tools/word-lab/results/advance-table/calib-aptos-bold.xps')));
const k = Object.keys(z).find((k) => /Pages\/1\.fpage/.test(k));
const f = new TextDecoder('utf-16le').decode(z[k]);
const els = [...f.matchAll(/<Glyphs[^>]*UnicodeString="([^"]*)"[^>]*Indices="([^"]*)"/gs)];
console.log('elementos:', els.length);
for (const m of els.slice(0, 6)) console.log(JSON.stringify(m[1].slice(0, 36)), '|idx|', m[2].slice(0, 44));
const withSpace = els.filter((m) => m[1].includes(' '));
console.log('com espaço:', withSpace.length, '— exemplo idx do espaço:');
if (withSpace[0]) {
  const text = withSpace[0][1];
  const i = text.indexOf(' ');
  console.log('pos', i, 'de', text.length, 'entry:', withSpace[0][2].split(';')[i]);
}
