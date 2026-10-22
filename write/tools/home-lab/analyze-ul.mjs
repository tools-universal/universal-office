// Resume a sonda dos sublinhados: por estilo e por linha de texto, os objetos
// desenhados logo abaixo da linha (retângulos: deslocamento do topo em relação à
// baseline, altura, padrão de traços; caminhos e imagens).
//   node analyze-ul.mjs .out/ul.json [estilo,…]
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const only = process.argv[3]?.split(',');
const r2 = (v) => Math.round(v * 1000) / 1000;
const bbox = (o) => {
  if (o.t !== 'path') return { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 };
  const xs = o.segs.map((s) => s[1]), ys = o.segs.map((s) => s[2]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
for (const [st, pages] of Object.entries(data)) {
  if (only && !only.includes(st)) continue;
  console.log(`== ${st}`);
  const pg = pages[0];
  const objs = pg.objs.map((o) => ({ o, b: bbox(o) }));
  const used = new Set();
  for (const ln of pg.lines) {
    const mine = objs.filter((x, i) => !used.has(i) && x.b.y0 >= ln.y - 1 && x.b.y0 <= ln.y + ln.size * 0.45 && x.b.x1 >= ln.x0 - 2);
    mine.forEach((x) => used.add(objs.indexOf(x)));
    if (!mine.length) { console.log(`  y=${ln.y} sz=${ln.size} "${ln.text.slice(0, 14)}" —`); continue; }
    // agrupa por (top, h)
    const groups = new Map();
    for (const { o, b } of mine) {
      const k = o.t === 'path' && o.segs.length === 5 && o.fill
        ? `rect top=${r2(b.y0 - ln.y)} h=${r2(b.y1 - b.y0)} fill=${o.fill}`
        : `${o.t}${o.fill ? ' fill=' + o.fill : ''}${o.stroke ? ` stroke=${o.stroke} w=${o.w}${o.dash ? ' dash=' + o.dash : ''}` : ''} top=${r2(b.y0 - ln.y)} h=${r2(b.y1 - b.y0)}${o.px ? ' px=' + o.px : ''}${o.segs ? ' segs=' + o.segs.length : ''}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(b);
    }
    console.log(`  y=${ln.y} sz=${ln.size} "${ln.text.slice(0, 14)}"`);
    for (const [k, bs] of groups) {
      bs.sort((a, b) => a.x0 - b.x0);
      const lens = [...new Set(bs.map((b) => r2(b.x1 - b.x0)))].slice(0, 6);
      const gaps = [...new Set(bs.slice(1).map((b, i) => r2(b.x0 - bs[i].x1)))].slice(0, 6);
      console.log(`    ${k} n=${bs.length} x=${r2(bs[0].x0)}..${r2(bs[bs.length - 1].x1)} len=${lens} gap=${gaps}`);
    }
  }
}
