// Compara o ladrilho de gradiente do motor (docx-layout/page-fill, dist) com o que
// o Word grava (page-oracle7: E:\UniversalWriteTest\_lab\page\tiles\tl-*_arquivos/image001.png).
// Lê o v:fill de cada caso do results/tl-*.txt. Erro máximo/médio por canal.
//   node write/tools/page-lab/tile-compare.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '../../..');
const require = createRequire(join(root, 'write/packages/docx-layout/package.json'));
const { gradientTileRgba } = await import(`file:///${join(root, 'write/packages/docx-layout/dist/page-fill.js').replace(/\\/g, '/')}`);
const { readPageBackground, resolveColor2 } = await import(`file:///${join(root, 'write/packages/docx-core/dist/page-background.js').replace(/\\/g, '/')}`);
const { parseXml } = await import(`file:///${join(root, 'write/packages/docx-core/dist/xml.js').replace(/\\/g, '/')}`);
const { decodePng } = await import(`file:///${join(root, 'write/packages/docx-layout/dist/images.js').replace(/\\/g, '/')}`);
void require;

const TILES = 'E:/UniversalWriteTest/_lab/page/tiles';
const results = join(here, 'results');
let worst = 0;
for (const f of readdirSync(results).filter((n) => /^tl-.*\.txt$/.test(n)).sort()) {
  const name = f.replace(/\.txt$/, '');
  const txt = readFileSync(join(results, f), 'utf8');
  // o dump do lote 7 cortou o elemento no 1º "/>": fecha o que ficou aberto
  const m = /== background (<w:background.*)/.exec(txt);
  if (!m) continue;
  let bx = m[1].trim();
  if (/<o:fill/.test(bx) && !/<\/v:fill>/.test(bx)) bx += '</v:fill>';
  if (/<v:background/.test(bx) && !/<\/v:background>/.test(bx)) bx += '</v:background>';
  if (!/<\/w:background>|^<w:background[^>]*\/>$/.test(bx)) bx += '</w:background>';
  const el = parseXml(`<w:document xmlns:w="w" xmlns:v="v" xmlns:o="o">${bx}</w:document>`).children.find((c) => typeof c !== 'string');
  const bg = readPageBackground(el, () => undefined);
  const fl = bg.fill;
  const c1 = fl.color ?? bg.color;
  const paint = { type: fl.type, c1, c2: resolveColor2(fl.color2, c1), stops: fl.colors, angle: fl.angle ?? 0, focus: fl.focus ?? 0, focusPosition: fl.focusPosition, gradientCenter: fl.gradientCenter };
  const png = decodePng(readFileSync(join(TILES, `${name}_arquivos`, 'image001.png')));
  // o Word grava 1025×769 (ou 8×769 / 1025×8 para os de uma direção): amostra o mesmo grid
  const W = png.width, H = png.height;
  const ours = gradientTileRgba(paint, W === 8 ? 8 : 1025, H === 8 ? 8 : 769);
  let max = 0, sum = 0, n = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = (j * W + i) * 4;
    for (let k = 0; k < 3; k++) { const d = Math.abs(png.data[o + k] - ours[o + k]); max = Math.max(max, d); sum += d; n++; }
  }
  worst = Math.max(worst, max);
  console.log(`${name.padEnd(14)} ${W}x${H} max=${String(max).padStart(3)} mean=${(sum / n).toFixed(2)}`);
}
console.log('pior', worst);
