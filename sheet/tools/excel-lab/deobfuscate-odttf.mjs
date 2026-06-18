// Desofusca .odttf (fonte embarcada em XPS): os primeiros 32 bytes são XOR
// com os 16 bytes do GUID (do nome do arquivo) em ordem reversa, duas vezes.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
const out = process.argv[3];
// chave: 3º argumento (w:fontKey de fontTable.xml, p/ fontes embarcadas em docx)
// ou o nome do arquivo (XPS).
const guidHex = (process.argv[4] ?? basename(file).replace(/\.odttf$/i, ''))
  .replace(/[{}-]/g, '');
const key = [];
for (let i = 0; i < 16; i++) key.push(parseInt(guidHex.substr(i * 2, 2), 16));
key.reverse();

const bytes = readFileSync(file);
for (let i = 0; i < 32; i++) bytes[i] ^= key[i % 16];
writeFileSync(out, bytes);
console.log(`ok: ${out} (${bytes.length} bytes), magic: ${bytes.readUInt32BE(0).toString(16)}`);
