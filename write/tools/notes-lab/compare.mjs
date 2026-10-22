// Motor × Word num caso do oráculo de layout: as linhas lado a lado (pt), página a
// página — depuração das notas.
//   node write/tools/notes-lab/compare.mjs <grupo> <caso>
// (usa os dist/ do docx-core e do docx-layout: rode o build antes)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const [group, name] = process.argv.slice(2);
const core = await import(pathToFileURL(join(root, 'packages', 'docx-core', 'dist', 'index.js')).href);
const layout = await import(pathToFileURL(join(root, 'packages', 'docx-layout', 'dist', 'index.js')).href);
const { createNodeFontProvider } = await import(pathToFileURL(join(root, 'tools', 'corpus-lab', 'node-fonts.mjs')).href);
const dir = join(root, 'packages', 'docx-layout', 'test', 'oracle', group);
const word = JSON.parse(readFileSync(join(dir, `${name}.word.json`), 'utf8'));
const pkg = core.DocxPackage.load(new Uint8Array(readFileSync(join(dir, `${name}.docx`))));
const res = layout.layoutDocument(core.readFullDocument(pkg), await createNodeFontProvider());
const n = Math.max(word.pages.length, res.pages.length);
for (let i = 0; i < n; i++) {
  console.log(`p${i + 1}`);
  const w = word.pages[i]?.lines ?? [];
  // linhas do motor pelos glifos (como a extração do PDF)
  const o = [];
  for (const it of res.pages[i]?.items ?? []) {
    if (it.t === 'glyphs') {
      const t = it.glyphs.map((g) => String.fromCodePoint(g.cp)).join('').replace(/\s/g, '');
      if (t) o.push({ y: it.y / 20, x: it.glyphs[0].x / 20, t, sz: it.sizePt });
    } else if (it.t === 'rect' && it.h < 40) o.push({ y: it.y / 20, x: it.x / 20, t: `[rect w=${(it.w / 20).toFixed(2)} h=${(it.h / 20).toFixed(2)}]` });
  }
  console.log('  WORD:'); for (const l of w) console.log(`    ${l.y.toFixed(2).padStart(7)} ${l.x0.toFixed(2).padStart(7)} ${l.text}`);
  console.log('  MOTOR:'); for (const l of o) console.log(`    ${l.y.toFixed(2).padStart(7)} ${l.x.toFixed(2).padStart(7)} ${l.t}`);
}
