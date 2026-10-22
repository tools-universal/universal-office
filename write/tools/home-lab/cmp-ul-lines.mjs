// Sublinhados linha a linha, motor × Word, para sondas livres (ul, ulmix): por
// linha (baseline), os retângulos únicos "topo+altura" em px de 600 dpi e, por grupo,
// o x inicial/final (pt) — o mesmo cálculo dos dois lados.
//   node cmp-ul-lines.mjs <pasta .out/sonda> <.out/sonda.json> [estilo]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '../../packages/docx-core/dist/index.js';
import { layoutDocument } from '../../packages/docx-layout/dist/index.js';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const [dir, wordJson, only] = process.argv.slice(2);
const provider = await createNodeFontProvider();
const word = JSON.parse(readFileSync(wordJson, 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

/** linhas → bandas: [{y, desc}] */
function summarize(lines, rects) {
  const out = [];
  for (const ln of lines) {
    const mine = rects.filter((r) => !r.used && r.y0 >= ln.y - 1 && r.y0 <= ln.y + ln.size * 0.6);
    mine.forEach((r) => { r.used = true; });
    const groups = new Map();
    for (const r of mine) {
      const k = `${Math.round((r.y0 - ln.y) / 0.12)}+${Math.round((r.y1 - r.y0) / 0.12)}${r.fill && r.fill !== '000000' ? ':' + r.fill : ''}`;
      const g = groups.get(k) ?? { x0: Infinity, x1: -Infinity, n: 0 };
      g.x0 = Math.min(g.x0, r.x0); g.x1 = Math.max(g.x1, r.x1); g.n++;
      groups.set(k, g);
    }
    out.push([...groups].sort().map(([k, g]) => `${k}[${r1(g.x0)}-${r1(g.x1)}]`).join(' '));
  }
  return out;
}

for (const f of readdirSync(dir).filter((x) => x.endsWith('.docx')).sort()) {
  const name = f.slice(0, -5);
  if (only && name !== only) continue;
  const res = layoutDocument(readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(join(dir, f))))), provider, {});
  const p = res.pages[0];
  const eLines = [...new Set(p.items.filter((it) => it.t === 'glyphs').map((it) => it.y))].sort((a, b) => a - b)
    .map((y) => ({ y: y / 20, size: Math.max(...p.items.filter((it) => it.t === 'glyphs' && it.y === y).map((it) => it.sizePt)) }));
  const eRects = p.items.filter((it) => it.t === 'rect').map((it) => ({ x0: it.x / 20, x1: (it.x + it.w) / 20, y0: it.y / 20, y1: (it.y + it.h) / 20, fill: it.fill }));
  const wp = word[name][0];
  const wRects = wp.objs.filter((o) => o.t === 'path' && o.fill && o.segs.length === 5).map((o) => {
    const xs = o.segs.map((s) => s[1]), ys = o.segs.map((s) => s[2]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), fill: o.fill };
  });
  // as linhas do Word vêm da extração de texto (pode partir a linha): baseline única
  const wLines = [...new Map(wp.lines.map((l) => [l.y, l])).values()].sort((a, b) => a.y - b.y);
  const e = summarize(eLines, eRects), w = summarize(wLines, wRects);
  console.log(`== ${name}`);
  const n = Math.max(e.length, w.length);
  for (let i = 0; i < n; i++) {
    const same = e[i] === w[i];
    console.log(`${same ? '  ' : '≠ '}${i}: W ${w[i] ?? '-'}${same ? '' : `\n      M ${e[i] ?? '-'}`}`);
  }
}
