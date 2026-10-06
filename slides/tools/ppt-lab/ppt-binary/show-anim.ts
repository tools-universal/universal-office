// Despeja a árvore de animação binária (PPT10) de um slide de forma compacta:
// por nó, os campos do TimeNodeAtom, as propriedades (inst=valor), as
// condições e os átomos de comportamento crus — para casar com o XML do gêmeo.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-anim.ts <arq.ppt> <slide#>
import { readFileSync } from 'node:fs';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';
import { recsIn, isContainer, RT, type Rec } from '../../../packages/slides-core/src/ppt/records.js';

const [file, slideArg] = process.argv.slice(2);
const d = readPptDocument(new Uint8Array(readFileSync(file!)));
const slide = d.slides[parseInt(slideArg ?? '1', 10) - 1]!;
const names = new Map<number, string>();
for (const [k, v] of Object.entries(RT)) names.set(v, k);
names.set(0x2afb, 'VisualShapeAtom'); names.set(0x2b01, 'VisualPageAtom');

const hex = (r: Rec): string => Array.from(r.r.sub(r.start, r.end)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
function variant(r: Rec): string {
  const t = r.r.u8(r.start);
  if (t === 0) return String(r.r.u8(r.start + 1) !== 0);
  if (t === 1) return String(r.r.i32(r.start + 1));
  if (t === 2) return r.r.f32(r.start + 1).toFixed(4) + 'f';
  let s = '';
  for (let o = r.start + 1; o + 1 < r.end; o += 2) { const c = r.r.u16(o); if (!c) break; s += String.fromCharCode(c); }
  return JSON.stringify(s);
}
function dump(rs: Rec[], depth: number): void {
  for (const r of rs) {
    const pad = '  '.repeat(depth);
    const name = names.get(r.type) ?? `0x${r.type.toString(16)}`;
    if (r.type === RT.TimeNode) {
      const g = (o: number): number => r.r.i32(r.start + o);
      console.log(`${pad}TimeNode restart=${g(4)} type=${g(8)} fill=${g(12)} dur=${g(24)} flags=0x${g(28).toString(16)}`);
    } else if (r.type === RT.TimeVariant) console.log(`${pad}var[${r.inst}]=${variant(r)}`);
    else if (r.type === RT.TimeCondition) {
      const g = (o: number): number => r.r.i32(r.start + o);
      console.log(`${pad}Cond obj=${g(0)} evt=${g(4)} id=${g(8)} delay=${g(12)}`);
    } else if (isContainer(r)) {
      console.log(`${pad}${name}${r.inst ? ' inst=' + r.inst : ''}`);
      dump(recsIn(r.r, r.start, r.end), depth + 1);
    } else console.log(`${pad}${name}${r.inst ? ' inst=' + r.inst : ''}: ${hex(r)}`);
  }
}
const blob = slide.binaryTags.get('___PPT10');
if (blob) dump(recsIn(blob.r, blob.start, blob.end), 0);
