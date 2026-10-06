// Lista os átomos de round-trip (zip OOXML) de um .ppt: RoundTripTheme12,
// RoundTripContentMasterInfo12, RoundTripOArtTextStyles12, RoundTripColorMapping12,
// RoundTripAnimationAtom12 etc., mostrando as partes de cada zip.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-roundtrip.ts <arq.ppt> [--full]
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { readCfb } from '../../../packages/slides-core/src/ppt/cfb.js';
import { ByteReader, recsIn, isContainer, RT, recData, type Rec } from '../../../packages/slides-core/src/ppt/records.js';

const [file] = process.argv.slice(2);
const full = process.argv.includes('--full');
const cfb = readCfb(new Uint8Array(readFileSync(file!)));
const doc = cfb.getStream('PowerPoint Document')!;
const names = new Map<number, string>();
for (const [k, v] of Object.entries(RT)) names.set(v, k);
const seen = new Set<string>();
const walk = (rs: Rec[], path: string): void => {
  for (const rec of rs) {
    const name = names.get(rec.type) ?? `0x${rec.type.toString(16)}`;
    if (isContainer(rec)) { walk(recsIn(rec.r, rec.start, rec.end), `${path}/${name}`); continue; }
    const data = recData(rec);
    if (data[0] === 0x50 && data[1] === 0x4b) {
      const key = `${name}:${data.length}`;
      if (seen.has(key) && !full) continue;
      seen.add(key);
      try {
        const z = unzipSync(data);
        console.log(`== ${path}/${name} inst=${rec.inst} (${data.length} b): ${Object.keys(z).join(', ')}`);
        for (const [n, d] of Object.entries(z)) if (/\.xml$/.test(n) && !/Content_Types|rels/.test(n)) console.log(`   ${n}: ${strFromU8(d).slice(0, full ? 20000 : 600)}`);
      } catch (e) { console.log(`== ${name}: zip inválido ${(e as Error).message}`); }
    } else if (rec.type === RT.RoundTripColorMapping12Atom) {
      if (!seen.has('clrmap')) { seen.add('clrmap'); console.log(`== ${name}: ${new TextDecoder().decode(data).slice(0, 400)}`); }
    }
  }
};
walk(recsIn(new ByteReader(doc), 0, doc.length), '');
