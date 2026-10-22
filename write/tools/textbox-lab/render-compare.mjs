// Compara a pintura da caixa de texto: o PDF do Word (.out/<exp>.pdf, run.mjs --pdf) com
// o NOSSO (motor + renderPdf, o mesmo .docx), rasterizados a 96 ppp na região das formas.
// Grava .out/cmp/<exp>.png (Word | nosso | diferença) e imprime o erro médio por canal.
//
//   npm run build:write && node tools/textbox-lab/render-compare.mjs <exp…>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const provider = await createNodeFontProvider();
const out = join(here, '.out', 'cmp');
mkdirSync(out, { recursive: true });

for (const name of process.argv.slice(2)) {
  const docx = join(here, '.out', `${name}.docx`), wordPdf = join(here, '.out', `${name}.pdf`);
  if (!existsSync(docx) || !existsSync(wordPdf)) { console.log(name, 'sem .docx/.pdf do Word (run.mjs --pdf)'); continue; }
  const full = core.readFullDocument(core.DocxPackage.load(new Uint8Array(readFileSync(docx))));
  const res = eng.layoutDocument(full, provider);
  const ours = join(out, `${name}.ours.pdf`);
  writeFileSync(ours, eng.renderPdf(res));
  // região: as formas da 1ª página (objetos posicionados), com folga
  const objs = res.pages[0]?.objects ?? [];
  const box = objs.length
    ? [Math.min(...objs.map((o) => o.x)) / 20 - 30, Math.min(...objs.map((o) => o.y)) / 20 - 30, Math.max(...objs.map((o) => o.x + o.w)) / 20 + 30, Math.max(...objs.map((o) => o.y + o.h)) / 20 + 60]
    : [0, 0, 300, 300];
  const r = execFileSync('python', ['-I', join(here, 'render-compare.py'), wordPdf, ours, join(out, `${name}.png`), ...box.map(String)], { encoding: 'utf8', windowsHide: true });
  console.log(name, r.trim());
}
