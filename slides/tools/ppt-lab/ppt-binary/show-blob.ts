// Mostra o conteúdo dos blobs de round-trip do PowerPoint 2007+ gravados no
// .ppt: metroBlob (FOPT 0x3A9: DrawingML zipado da forma), RoundTripTheme12,
// RoundTripContentMasterInfo12 (layout), RoundTripAnimationAtom12 etc.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-blob.ts <arq.ppt> <slide#> [spid]
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';
import type { OAShape } from '../../../packages/slides-core/src/ppt/officeart.js';

const [file, slideArg, spidArg] = process.argv.slice(2);
const d = readPptDocument(new Uint8Array(readFileSync(file!)));
const idx = parseInt(slideArg ?? '1', 10);
const slide = idx > 0 ? d.slides[idx - 1] : d.masters[-idx - 1];
if (!slide) throw new Error('slide inexistente');
const showZip = (bytes: Uint8Array): void => {
  try {
    const z = unzipSync(bytes);
    for (const [n, data] of Object.entries(z)) console.log(`--- ${n}\n${strFromU8(data).slice(0, 4000)}`);
  } catch (e) { console.log('não é zip:', (e as Error).message); }
};
const visit = (sh: OAShape): void => {
  if (!spidArg || String(sh.spid) === spidArg) {
    const blob = sh.props.get(0x3a9);
    console.log(`== spid ${sh.spid} type ${sh.type} metroBlob=${blob?.complex?.length ?? 0}`);
    if (blob?.complex) showZip(blob.complex);
  }
  for (const c of sh.children ?? []) visit(c);
};
for (const c of slide.drawing.root?.children ?? []) visit(c);
