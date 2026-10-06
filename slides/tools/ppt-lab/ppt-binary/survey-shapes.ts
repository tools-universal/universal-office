// Levantamento do corpus: tipos de forma (msospt) e propriedades FOPT usadas,
// com contagem — orienta o mapeamento msospt → prstGeom e FOPT → DrawingML.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/survey-shapes.ts [arq.ppt…] [--shapes]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readPptDocument, type PptSlide } from '../../../packages/slides-core/src/ppt/ppt-reader.js';
import type { OAShape } from '../../../packages/slides-core/src/ppt/officeart.js';

let files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const listShapes = process.argv.includes('--shapes');
if (!files.length) {
  const dir = join(process.cwd(), 'samples', 'playback');
  files = readdirSync(dir).filter((f) => f.endsWith('.ppt')).map((f) => join(dir, f));
}
const types = new Map<number, number>();
const props = new Map<number, number>();
const visit = (sh: OAShape, where: string, depth: number): void => {
  types.set(sh.type, (types.get(sh.type) ?? 0) + 1);
  for (const id of sh.props.keys()) props.set(id, (props.get(id) ?? 0) + 1);
  if (listShapes) {
    const p = [...sh.props.values()].map((x) => `${x.id.toString(16)}=${x.complex ? `[${x.complex.length}b]` : x.value.toString(16)}`).join(' ');
    console.log(`${'  '.repeat(depth)}${where} spid=${sh.spid} type=${sh.type} flags=${sh.flags.toString(16)} anchor=${JSON.stringify(sh.anchor)}${sh.groupRect ? ' grp=' + JSON.stringify(sh.groupRect) : ''} ${p}`);
  }
  for (const c of sh.children ?? []) visit(c, where, depth + 1);
};
for (const f of files) {
  const d = readPptDocument(new Uint8Array(readFileSync(f)));
  const name = f.split(/[\\/]/).pop()!;
  const all: [string, PptSlide][] = [
    ...d.masters.map((m, i): [string, PptSlide] => [`${name} M${i + 1}`, m]),
    ...d.slides.map((s, i): [string, PptSlide] => [`${name} S${i + 1}`, s]),
  ];
  for (const [where, s] of all) {
    for (const c of s.drawing.root?.children ?? []) visit(c, where, 0);
    if (s.drawing.background) visit(s.drawing.background, where + ' BG', 0);
  }
}
console.log('tipos:', [...types].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
console.log('props:', [...props].sort((a, b) => a[0] - b[0]).map(([k, v]) => `0x${k.toString(16)}:${v}`).join(' '));
