// Motor × Word, linha a linha, num caso do oráculo de layout (números de linha):
//   node tools/textlayout-lab/ln-diff.mjs <grupo> <caso> [página]
// Mostra lado a lado x0/baseline/texto do Word e do motor (usa os dist/ compilados).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const [group, name, pageArg] = process.argv.slice(2);
const dir = join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle', group);
const out = join(here, '.out', 'oracle-compare.mjs');
await build({ entryPoints: [join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle-compare.ts')], bundle: false, format: 'esm', outfile: out, logLevel: 'error' });
const { engineLines } = await import(new URL(`file:///${out.replace(/\\/g, '/')}`).href);
const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const provider = await createNodeFontProvider();
const word = JSON.parse(readFileSync(join(dir, `${name}.word.json`), 'utf8'));
const full = core.readFullDocument(core.DocxPackage.load(new Uint8Array(readFileSync(join(dir, `${name}.docx`)))));
const ours = engineLines(eng.layoutDocument(full, provider, {}));
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const n = Math.max(word.pages.length, ours.pages.length);
for (let p = 0; p < n; p++) {
  if (pageArg && Number(pageArg) !== p + 1) continue;
  console.log(`--- página ${p + 1}`);
  const W = word.pages[p]?.lines ?? [], O = ours.pages[p]?.lines ?? [];
  for (let i = 0; i < Math.max(W.length, O.length); i++) {
    const w = W[i], o = O[i];
    const mark = w && o && w.text === o.text && Math.abs(w.x0 - o.x0) <= 0.6 && Math.abs(w.y - o.y) <= 0.3 ? ' ' : '*';
    console.log(`${mark} W ${w ? `${pad(w.x0.toFixed(1), 6)} ${pad(w.y.toFixed(1), 6)} ${pad(w.text, 26)}` : pad('', 41)} | O ${o ? `${pad(o.x0.toFixed(1), 6)} ${pad(o.y.toFixed(1), 6)} ${o.text}` : ''}`);
  }
}
