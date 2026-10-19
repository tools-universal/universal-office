// Confere as notas do apresentador do .ppt convertido contra o .pptx gêmeo,
// usando o próprio leitor do exportador (packages/slides-core/src/export: readNotes).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/check-notes.ts [deck…]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { convertPptToPptx } from '../../../packages/slides-core/src/ppt/index.js';
import { PptxPackage, readPresentation } from '../../../packages/slides-core/src/index.js';
import { readNotes } from '../../../packages/slides-core/src/export/model.js';

const lab = process.env['LAB_DIR']!;
const root = join(lab, '..', '..', '..', 'samples');
let decks = process.argv.slice(2);
if (!decks.length) decks = readdirSync(join(root, 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => f.slice(0, -4));
let same = 0, total = 0;
for (const d of decks) {
  const twin = [join(root, 'playback', `${d}.pptx`), join(root, `${d}.pptx`)].find(existsSync);
  if (!twin) continue;
  const a = PptxPackage.load(convertPptToPptx(new Uint8Array(readFileSync(join(root, 'playback', `${d}.ppt`)))));
  const b = PptxPackage.load(new Uint8Array(readFileSync(twin)));
  const sa = readPresentation(a).slides, sb = readPresentation(b).slides;
  sa.forEach((s, i) => {
    const na = readNotes(a, s.target!).join('\n'), nb = sb[i] ? readNotes(b, sb[i]!.target!).join('\n') : '';
    if (!na && !nb) return;
    total++;
    if (na === nb) same++;
    else console.log(`${d} #${i + 1}\n  nosso: ${JSON.stringify(na).slice(0, 160)}\n  gêmeo: ${JSON.stringify(nb).slice(0, 160)}`);
  });
}
console.log(`notas: ${same}/${total} slides com notas idênticas ao gêmeo`);
