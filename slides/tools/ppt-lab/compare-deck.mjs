// Compara results/stress/<deck>/ours/slideN.png × ppt/slideN.png pixel a pixel.
// Gera diff PNG (vermelho onde diverge), % de divergência por slide e um
// report.html lado a lado por deck. Tolerância: delta de canal ≤ 40 ignora
// (antialiasing/subpixel de fonte difere entre GDI e canvas).
//
// Uso: node tools/ppt-lab/compare-deck.mjs [deck…]   (default: os 4 stress)
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const decks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['stress-shapes', 'stress-text', 'stress-table-chart', 'stress-media', 'stress-advanced'];

const TOL = 40; // delta máximo de canal considerado "igual" (AA/hinting)

function compareOne(oursPath, pptPath, diffPath) {
  const a = PNG.sync.read(readFileSync(oursPath));
  const b = PNG.sync.read(readFileSync(pptPath));
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  let bad = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (a.width * y + x) * 4;
      const ib = (b.width * y + x) * 4;
      const id = (w * y + x) * 4;
      const dr = Math.abs(a.data[ia] - b.data[ib]);
      const dg = Math.abs(a.data[ia + 1] - b.data[ib + 1]);
      const db = Math.abs(a.data[ia + 2] - b.data[ib + 2]);
      const delta = Math.max(dr, dg, db);
      if (delta > TOL) {
        bad++;
        diff.data[id] = 255; diff.data[id + 1] = 40; diff.data[id + 2] = 40; diff.data[id + 3] = 255;
      } else {
        // fundo: versão apagada do PPT p/ contexto
        diff.data[id] = 235 + (b.data[ib] >> 4);
        diff.data[id + 1] = 235 + (b.data[ib + 1] >> 4);
        diff.data[id + 2] = 235 + (b.data[ib + 2] >> 4);
        diff.data[id + 3] = 255;
      }
    }
  }
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { pct: (100 * bad) / (w * h), w, h };
}

let grandTotal = 0, grandCount = 0;
for (const deck of decks) {
  const base = join(here, 'results', 'stress', deck);
  const oursDir = join(base, 'ours');
  const pptDir = join(base, 'ppt');
  if (!existsSync(oursDir) || !existsSync(pptDir)) { console.log(`${deck}: faltam pastas (rode render-deck/gen-stress)`); continue; }
  const slides = readdirSync(pptDir).filter((f) => /^slide\d+\.png$/.test(f))
    .sort((x, y) => parseInt(x.slice(5)) - parseInt(y.slice(5)));
  const rows = [];
  for (const f of slides) {
    const ours = join(oursDir, f);
    if (!existsSync(ours)) { rows.push({ f, pct: 100, missing: true }); continue; }
    const { pct } = compareOne(ours, join(pptDir, f), join(base, f.replace('.png', '-diff.png')));
    rows.push({ f, pct });
    grandTotal += pct; grandCount++;
  }
  const html = [
    `<!DOCTYPE html><meta charset="utf-8"><title>${deck} — comparação</title>`,
    `<style>body{font:14px Segoe UI;background:#1e1e22;color:#eee;margin:16px}`,
    `img{width:420px;display:block;border:1px solid #444}td{vertical-align:top;padding:6px}`,
    `.pct{font-weight:700}.bad{color:#ff6b6b}.ok{color:#7bd88f}</style>`,
    `<h1>${deck}</h1><table><tr><th>slide</th><th>nosso</th><th>PowerPoint</th><th>diff</th></tr>`,
    ...rows.map((r) => `<tr><td>${r.f}<div class="pct ${r.pct > 2 ? 'bad' : 'ok'}">${r.pct.toFixed(2)}%</div></td>` +
      `<td><img src="ours/${r.f}"></td><td><img src="ppt/${r.f}"></td>` +
      `<td><img src="${r.f.replace('.png', '-diff.png')}"></td></tr>`),
    '</table>',
  ].join('\n');
  writeFileSync(join(base, 'report.html'), html);
  console.log(`${deck}:`);
  for (const r of rows) console.log(`  ${r.f}  ${r.missing ? 'FALTA RENDER' : r.pct.toFixed(2) + '%'}`);
}
if (grandCount) console.log(`média geral: ${(grandTotal / grandCount).toFixed(2)}% em ${grandCount} slides`);
