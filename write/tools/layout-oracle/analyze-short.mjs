import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const { sweep, lineOf } = await import(pathToFileURL(join(here, 'cases', 'justify5.mjs')).href);
const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
sweep.forEach((cfg, ci) => {
  const face = prov.face(cfg.font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * cfg.size * 20) / u, 0);
  const first = `${lineOf(cfg)} ${cfg.next}`;
  const nat = W(first), sp = W(' '), nw = W(cfg.next);
  const indL = Math.max(0, Math.round(TEXT_W - nat - 400));
  const avail0 = TEXT_W - indL;
  const steps = Math.ceil((1.05 * nw) / 2) + 4;
  const word = JSON.parse(readFileSync(join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'justify5', `sh-${ci}.word.json`), 'utf8'));
  const lines = word.pages.flatMap((p) => p.lines);
  const target = first.replace(/\s/g, '');
  let li = 0, lastFit = null, firstRej = null;
  for (let s = 0; s <= steps; s++) {
    const indR = Math.max(0, Math.round(avail0 - nat) + s * 2 - 4);
    const fits = lines[li]?.text === target;
    while (li < lines.length && !lines[li].text.endsWith('continua')) li++;
    li++;
    const ov = nat - (avail0 - indR);
    if (fits) lastFit = ov; else if (firstRej === null) firstRej = ov;
  }
  const T = ((lastFit ?? NaN) + (firstRej ?? NaN)) / 2;
  const chars = [...cfg.next].map((c) => (W(c) / 20).toFixed(2)).join('+');
  console.log(`${cfg.font.padEnd(8)} "${cfg.next}".padEnd(6) NW ${(nw / 20).toFixed(2)} (${chars})  limiar ${(T / 20).toFixed(2)}pt = ${(T / nw * 100).toFixed(1)}% da palavra; NW-limiar ${((nw - T) / 20).toFixed(2)}`);
});
