// Lê a tabela de funções do EXCEL.EXE instalado (a mesma que o parser do
// Excel usa): registros de 0x50 bytes com ponteiro para o nome UTF-16 em +0x18,
// na ordem do número interno da função (0 COUNT, 1 IF, 2 ISNA… — de 0 a 367 é
// o Ftab do BIFF8). Serve de lista de candidatos para o oráculo do catálogo
// (xl-fns.ps1), que decide o que é função de planilha, de macro ou interna.
//   node tools/locale/exe-functions.mjs <saída.json> [caminho do EXCEL.EXE]
// Saída: [{ id, name }] (os "buracos" da tabela, nomes numéricos, ficam fora).
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2];
const exe = process.argv[3] ?? 'C:/Program Files/Microsoft Office/root/Office16/EXCEL.EXE';
if (!out) { console.error('uso: node tools/locale/exe-functions.mjs <saída.json> [EXCEL.EXE]'); process.exit(2); }
const b = readFileSync(exe);

// seções do PE (para converter endereço virtual → posição no arquivo)
const pe = b.readUInt32LE(0x3c);
const nsec = b.readUInt16LE(pe + 6), optSize = b.readUInt16LE(pe + 20);
const imageBase = b.readBigUInt64LE(pe + 24 + 24);
const secs = [];
for (let i = 0; i < nsec; i++) {
  const o = pe + 24 + optSize + i * 40;
  secs.push({ va: b.readUInt32LE(o + 12), raw: b.readUInt32LE(o + 20), rsize: b.readUInt32LE(o + 16) });
}
const va2off = (va) => {
  const rva = Number(va - imageBase);
  for (const s of secs) if (rva >= s.va && rva < s.va + s.rsize) return rva - s.va + s.raw;
  return -1;
};
const off2va = (off) => {
  for (const s of secs) if (off >= s.raw && off < s.raw + s.rsize) return BigInt(off - s.raw + s.va) + imageBase;
  return -1n;
};
const readW = (off) => {
  let s = '';
  for (let q = off; q + 1 < b.length; q += 2) {
    const c = b.readUInt16LE(q);
    if (!c) break;
    if (c < 32 || c > 126) return null;
    s += String.fromCharCode(c);
    if (s.length > 80) return null;
  }
  return s || null;
};

// âncora: o nome "ISERROR" (função 3) seguido de "ISNA"/"SUM" na tabela
const STRIDE = 0x50, NAME = 0x18;
const anchors = [];
for (let p = b.indexOf(Buffer.from('\0ISERROR\0', 'utf16le')); p >= 0; p = b.indexOf(Buffer.from('\0ISERROR\0', 'utf16le'), p + 1)) anchors.push(p + 2);
let table = -1;
for (const a of anchors) {
  const ptr = Buffer.alloc(8); ptr.writeBigUInt64LE(off2va(a));
  for (let p = b.indexOf(ptr); p >= 0; p = b.indexOf(ptr, p + 1)) {
    const rec = p - NAME;
    const nameAt = (r) => { const o = va2off(b.readBigUInt64LE(r + NAME)); return o < 0 ? null : readW(o); };
    if (nameAt(rec - STRIDE) === 'ISNA' && nameAt(rec - 3 * STRIDE) === 'COUNT') { table = rec - 3 * STRIDE; break; }
  }
  if (table >= 0) break;
}
if (table < 0) { console.error('tabela de funções não encontrada'); process.exit(1); }
const names = [];
for (let r = table; ; r += STRIDE) {
  const o = va2off(b.readBigUInt64LE(r + NAME));
  const s = o < 0 ? null : readW(o);
  if (s === null) break;
  names.push(s);
}
const list = names.map((name, id) => ({ id, name })).filter((x) => !/^\d+$/.test(x.name));
writeFileSync(out, JSON.stringify(list));
console.log(`${names.length} entradas (${list.length} nomes) → ${out}`);
