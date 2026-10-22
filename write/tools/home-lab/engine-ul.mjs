// Compara os sublinhados do MOTOR com os do Word: monta cada .docx de uma sonda
// (.out/<sonda>/*.docx) no docx-layout com as fontes instaladas e mede, por linha,
// os retângulos e as ondas logo abaixo da baseline em px de 600 dpi — o mesmo formato
// de fit-ul.mjs (bandas "topo+altura" ou "topo..fundo" da linha central da onda).
//   node engine-ul.mjs <pasta .out/sonda> [word.tsv para comparar]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '../../packages/docx-core/dist/index.js';
import { layoutDocument } from '../../packages/docx-layout/dist/index.js';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const dir = process.argv[2];
const provider = await createNodeFontProvider();
const SIZES = [6, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72];
const rows = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.docx')).sort()) {
  const [font, style] = f.slice(0, -5).split('__');
  const full = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(join(dir, f)))));
  const res = layoutDocument(full, provider, {});
  let li = 0;
  for (const p of res.pages) {
    // baselines das linhas (runs de glifos), na ordem
    const bases = [...new Set(p.items.filter((it) => it.t === 'glyphs').map((it) => it.y))].sort((a, b) => a - b);
    for (const by of bases) {
      const px = (v) => Math.round((v - by) / 2.4);
      const sz = SIZES[li++];
      const near = (y) => y > by - 20 && y < by + (sz ?? 24) * 10;
      const rects = p.items.filter((it) => it.t === 'rect' && near(it.y));
      const waves = p.items.filter((it) => it.t === 'path' && it.stroke && near(it.cmds[0].y));
      let bands;
      if (waves.length) {
        bands = [...new Set(waves.map((w) => { const ys = w.cmds.filter((c) => c.op === 'C').map((c) => c.y); return `${px(Math.min(...ys))}..${px(Math.max(...ys))}`; }))].join(' ');
      } else {
        bands = [...new Set(rects.map((r) => `${px(r.y)}+${Math.round(r.h / 2.4)}`))].sort((a, b) => parseInt(a) - parseInt(b)).join(' ');
      }
      rows.push({ key: `${font}\t${style}\t${sz}`, bands, w: waves[0]?.stroke.widthPt });
    }
  }
}
if (process.argv[3]) {
  const word = new Map(readFileSync(process.argv[3], 'utf8').trim().split('\n').slice(1).map((l) => { const c = l.split('\t'); return [`${c[0]}\t${c[1]}\t${c[2]}`, c[5]]; }));
  let ok = 0, bad = 0;
  for (const r of rows) {
    const w = word.get(r.key);
    if (w === undefined) continue;
    const norm = (s) => s.split(' ').filter((x) => !/^(\d+)\.\.\1$/.test(x)).slice(0, 2).join(' ');
    if (norm(w) === r.bands || w === r.bands) ok++; else { bad++; if (bad <= 40) console.log('DIF', r.key.replace(/\t/g, ' '), 'word', w, 'motor', r.bands); }
  }
  console.log('iguais', ok, 'diferentes', bad);
} else for (const r of rows) console.log(r.key, r.bands, r.w ?? '');
