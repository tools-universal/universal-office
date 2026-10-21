// Linha entre colunas: retângulos do motor × caminhos do PDF do Word (objs do .word.json)
//   npx vite-node tools/sections-lab/seps.ts -- <caso> [<caso>…]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '../../packages/docx-core/src/index.js';
import { layoutDocument } from '../../packages/docx-layout/src/index.js';
// @ts-expect-error módulo JS do lab
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const dir = join(__dirname, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'sections');
const provider = await createNodeFontProvider();
for (const name of process.argv.slice(2).filter((a) => a !== '--')) {
  const word = JSON.parse(readFileSync(join(dir, `${name}.word.json`), 'utf8'));
  const res = layoutDocument(readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(join(dir, `${name}.docx`))))), provider);
  res.pages.forEach((p, i) => {
    const ours = p.items.filter((it) => it.t === 'rect' && it.w < 20).map((it) => it.t === 'rect' ? `${(it.x / 20).toFixed(2)}..${((it.x + it.w) / 20).toFixed(2)} y=${(it.y / 20).toFixed(2)}..${((it.y + it.h) / 20).toFixed(2)}` : '');
    const theirs = (word.pages[i]?.objs ?? []).map((o: { x0: number; x1: number; y0: number; y1: number }) => `${o.x0.toFixed(2)}..${o.x1.toFixed(2)} y=${o.y0.toFixed(2)}..${o.y1.toFixed(2)}`);
    console.log(`${name} p${i + 1}\n  Word : ${theirs.join(' | ')}\n  motor: ${ours.join(' | ')}`);
  });
}
