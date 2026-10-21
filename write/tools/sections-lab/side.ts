// Linhas do Word (oráculo) × motor, lado a lado, de um caso do layout-oracle:
//   npx vite-node tools/sections-lab/side.ts -- <grupo> <caso>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '../../packages/docx-core/src/index.js';
import { layoutDocument } from '../../packages/docx-layout/src/index.js';
import { engineLines } from '../../packages/docx-layout/test/oracle-compare.js';
// @ts-expect-error módulo JS do lab
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const [group, name] = process.argv.slice(2).filter((a) => a !== '--');
const dir = join(__dirname, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', group!);
const word = JSON.parse(readFileSync(join(dir, `${name}.word.json`), 'utf8'));
const provider = await createNodeFontProvider();
const full = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(join(dir, `${name}.docx`)))));
const ours = engineLines(layoutDocument(full, provider));
const fmt = (l: { x0: number; y: number; text: string } | undefined) => (l ? `${l.x0.toFixed(1).padStart(6)} ${l.y.toFixed(2).padStart(7)} ${l.text.slice(0, 28).padEnd(28)}` : ''.padEnd(43));
const n = Math.max(word.pages.length, ours.pages.length);
for (let pg = 0; pg < n; pg++) {
  const a = word.pages[pg]?.lines ?? [], b = ours.pages[pg]?.lines ?? [];
  console.log(`--- página ${pg + 1} (Word ${a.length} | motor ${b.length})`);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = a[i] && b[i] ? (b[i].y - a[i].y).toFixed(2) : '';
    console.log(`${fmt(a[i])} | ${fmt(b[i])} ${d}`);
  }
}
