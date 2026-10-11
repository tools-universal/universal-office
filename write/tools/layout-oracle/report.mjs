// Relatório motor × Word sobre os casos do oráculo (packages/docx-layout/test/oracle).
//   node tools/layout-oracle/report.mjs [grupo] [--verbose]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const oracleDir = join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle');
// compila o comparador TS (do teste) para um módulo temporário
const out = join(here, '.out', 'oracle-compare.mjs');
await build({ entryPoints: [join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle-compare.ts')], bundle: false, format: 'esm', outfile: out, logLevel: 'error' });
const { engineLines, compareLines } = await import(new URL(`file:///${out.replace(/\\/g, '/')}`).href);
const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const provider = await createNodeFontProvider();

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const emIdx = args.indexOf('--em');
const advanceEm = emIdx >= 0 ? args[emIdx + 1] : 'nominal';
const groups = args.filter((a) => !a.startsWith('--') && a !== advanceEm);
let tot = 0, ok = 0;
for (const g of readdirSync(oracleDir)) {
  if (groups.length && !groups.includes(g)) continue;
  const dir = join(oracleDir, g);
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.docx')).sort()) {
    const exp = join(dir, f.replace(/\.docx$/, '.word.json'));
    if (!existsSync(exp)) continue;
    const word = JSON.parse(readFileSync(exp, 'utf8'));
    let r;
    try {
      const full = core.readFullDocument(core.DocxPackage.load(new Uint8Array(readFileSync(join(dir, f)))));
      const res = eng.layoutDocument(full, provider, { advanceEm, advanceRound: process.env.ADV_ROUND ?? 'none', ...(process.env.SHRINK ? { justifyShrink: JSON.parse(process.env.SHRINK) } : {}) });
      r = compareLines(word, engineLines(res));
    } catch (e) {
      console.log(`${g}/${f}: ERRO ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ')}`);
      tot++;
      continue;
    }
    tot++;
    const good = r.pagesW === r.pagesO && r.matched === r.linesW && r.samePage === r.matched && r.maxDy <= 0.3;
    if (good) ok++;
    if (!good || verbose) {
      console.log(`${good ? 'ok ' : 'DIF'} ${g}/${f.replace('.docx', '')}: pág ${r.pagesO}/${r.pagesW} linhas ${r.matched}/${r.linesW} mesma pág ${r.samePage} Δy máx ${r.maxDy.toFixed(2)} méd ${r.meanDy.toFixed(3)} Δx máx ${r.maxDx.toFixed(2)}${r.firstDiff ? ` — 1ª dif ${r.firstDiff}` : ''}`);
    }
  }
}
console.log(`\n${ok}/${tot} casos idênticos ao Word (Δy ≤ 0,3pt)`);
