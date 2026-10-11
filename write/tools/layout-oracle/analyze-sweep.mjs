import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const { sweep, lineOf } = await import(pathToFileURL(join(here, 'cases', 'justify4.mjs')).href);
const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
for (const cfg of sweep) {
  const face = prov.face(cfg.font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * cfg.size * 20) / u, 0);
  const { head, next } = lineOf(cfg);
  const first = `${head} ${next}`;
  const nat = W(first), sp = W(' '), nw = W(next);
  const indL = Math.max(0, Math.round(TEXT_W - nat - 400));
  const avail0 = TEXT_W - indL;
  const steps = Math.ceil((0.45 * cfg.n * sp + 0.6 * nw) / 2) + 4;
  const word = JSON.parse(readFileSync(join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'justify4', `sw-${cfg.n}-${cfg.k}.word.json`), 'utf8'));
  const lines = word.pages.flatMap((p) => p.lines);
  const target = first.replace(/\s/g, '');
  let li = 0, lastFit = null, firstRej = null;
  for (let s = 0; s <= steps; s++) {
    const indR = Math.max(0, Math.round(avail0 - nat + 0.02 * cfg.n * sp) + s * 2 - 4);
    const fits = lines[li]?.text === target;
    while (li < lines.length && !lines[li].text.endsWith('continua')) li++;
    li++;
    const ov = nat - (avail0 - indR);
    if (process.env.RAW && `${cfg.n}-${cfg.k}` === process.env.RAW) console.log(s, indR, (ov/20).toFixed(2), fits, lines[li-1]?.text?.slice(-20));
    if (fits) lastFit = ov; else if (firstRej === null) firstRej = ov;
  }
  const T = ((lastFit ?? NaN) + (firstRej ?? NaN)) / 2;
  console.log(`n=${String(cfg.n).padStart(2)} k=${cfg.k}  NW ${(nw / 20).toFixed(2)}pt  limiar ${(T / 20).toFixed(3)}pt (±${((firstRej - lastFit) / 40).toFixed(3)})  = ${(T / (cfg.n * sp) * 100).toFixed(1)}% dos espaços | ${(T / nw * 100).toFixed(1)}% da palavra | ${(T / (nw + sp) * 100).toFixed(1)}% palavra+espaço`);
}
