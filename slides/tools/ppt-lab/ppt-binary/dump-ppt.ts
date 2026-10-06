// Despeja a árvore de registros de um .ppt (streams do CFB + registros
// [MS-PPT]/[MS-ODRAW] com nome, instância, tamanho e prévia dos átomos).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/dump-ppt.ts <arq.ppt> [--depth N] [--hex N] [--persist]
import { readFileSync } from 'node:fs';
import { readCfb } from '../../../packages/slides-core/src/ppt/cfb.js';
import { ByteReader, recsIn, isContainer, RT, OA, type Rec } from '../../../packages/slides-core/src/ppt/records.js';

const file = process.argv[2];
if (!file) throw new Error('uso: dump-ppt.ts <arq.ppt>');
const argv = process.argv.slice(3);
const opt = (k: string, d: number): number => { const i = argv.indexOf(k); return i >= 0 ? parseInt(argv[i + 1] ?? '', 10) : d; };
const maxDepth = opt('--depth', 99);
const hexN = opt('--hex', 24);
const only = argv.includes('--persist');

const names = new Map<number, string>();
for (const [k, v] of Object.entries(RT)) names.set(v, k);
for (const [k, v] of Object.entries(OA)) names.set(v, 'OA_' + k);

const cfb = readCfb(new Uint8Array(readFileSync(file)));
for (const e of cfb.entries) console.log(`[cfb] ${e.type.padEnd(7)} ${e.path || '(root)'} size=${e.size}`);

function hex(r: ByteReader, s: number, e: number): string {
  const out: string[] = [];
  for (let o = s; o < Math.min(e, s + hexN); o++) out.push(r.u8(o).toString(16).padStart(2, '0'));
  return out.join(' ') + (e - s > hexN ? ' …' : '');
}

function dump(rs: Rec[], depth: number): void {
  for (const rec of rs) {
    const name = names.get(rec.type) ?? `0x${rec.type.toString(16)}`;
    const pad = '  '.repeat(depth);
    let extra = '';
    if (rec.type === RT.TextCharsAtom) extra = JSON.stringify(Array.from({ length: Math.min(60, (rec.end - rec.start) / 2) }, (_, i) => String.fromCharCode(rec.r.u16(rec.start + i * 2))).join(''));
    else if (rec.type === RT.TextBytesAtom || rec.type === RT.CString) {
      extra = rec.type === RT.CString
        ? JSON.stringify(Array.from({ length: Math.min(60, (rec.end - rec.start) / 2) }, (_, i) => String.fromCharCode(rec.r.u16(rec.start + i * 2))).join(''))
        : JSON.stringify(Array.from({ length: Math.min(60, rec.end - rec.start) }, (_, i) => String.fromCharCode(rec.r.u8(rec.start + i))).join(''));
    } else if (!isContainer(rec)) extra = hex(rec.r, rec.start, rec.end);
    console.log(`${pad}${name} inst=${rec.inst} ver=${rec.ver} len=${rec.len} @${rec.hdr}${extra ? '  ' + extra : ''}`);
    if (isContainer(rec) && depth < maxDepth) dump(recsIn(rec.r, rec.start, rec.end), depth + 1);
    // o blob de etiqueta binária (PP9/PP10/PP12) contém registros
    else if (rec.type === RT.BinaryTagDataBlob && depth < maxDepth) dump(recsIn(rec.r, rec.start, rec.end), depth + 1);
  }
}

const doc = cfb.getStream('PowerPoint Document');
const cu = cfb.getStream('Current User');
if (cu) { console.log('== Current User'); dump(recsIn(new ByteReader(cu), 0, cu.length), 1); }
if (doc) {
  console.log('== PowerPoint Document');
  const r = new ByteReader(doc);
  if (!only) dump(recsIn(r, 0, doc.length), 1);
}
