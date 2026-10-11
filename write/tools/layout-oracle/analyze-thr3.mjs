import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const { configs } = await import(pathToFileURL(join(here, 'cases', 'justify3.mjs')).href);
const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
configs.forEach(([font, size, head, next, tail], ci) => {
  const face = prov.face(font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * size * 20) / u, 0);
  const first = `${head} ${next}`;
  const nat = W(first), spaces = first.split(' ').length - 1, sp = W(' ');
  const lo = TEXT_W - nat - 0.02 * spaces * sp;
  const steps = Math.ceil((0.42 * spaces * sp) / 4);
  const word = JSON.parse(readFileSync(join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'justify3', `rej-${ci}.word.json`), 'utf8'));
  const lines = word.pages.flatMap((p) => p.lines);
  const nextNs = next.replace(/\s/g, '');
  let li = 0, lastFit = null, firstRej = null;
  for (let k = 0; k <= steps; k++) {
    const ind = Math.max(0, Math.round(lo + k * 4));
    const l1 = lines[li]?.text ?? '';
    const fits = l1 === (head + next).replace(/\s/g, '') || (l1.endsWith(nextNs) && l1.length === (head + next).replace(/\s/g, '').length);
    while (li < lines.length && !lines[li].text.endsWith('continua')) li++;
    li++;
    const ov = nat - (TEXT_W - ind);
    if (fits) lastFit = { ratio: ov / (spaces * sp), ov };
    else if (!firstRej) firstRej = { ratio: ov / (spaces * sp), ov };
  }
  console.log(`rej-${ci} ${font} ${size} spaces ${spaces} sp ${(sp/20).toFixed(3)}: último que coube ${(lastFit?.ratio*100).toFixed(2)}% (${(lastFit?.ov/20).toFixed(3)}pt) 1º rejeitado ${(firstRej?.ratio*100).toFixed(2)}% (${(firstRej?.ov/20).toFixed(3)}pt)`);
});
