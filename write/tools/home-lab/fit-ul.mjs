// Tabela da sonda de corpos (gen-ulsize-probe.mjs): por fonte e corpo, a geometria de
// cada estilo em pixels de 600 dpi (0,12 pt) a partir da baseline, ao lado das métricas
// da fonte (post: underlinePosition/Thickness) — para tirar a regra do Word.
//   node fit-ul.mjs .out/ulsize.json [--csv saida.tsv]
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const csvIdx = process.argv.indexOf('--csv');
const SIZES = [6, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72];
const FILES = {
  Arial: 'arial.ttf', 'Arial-b': 'arialbd.ttf', 'Arial-i': 'ariali.ttf', TimesNewRoman: 'times.ttf', Calibri: 'calibri.ttf',
  CourierNew: 'cour.ttf', Verdana: 'verdana.ttf', Cambria: 'cambria.ttc', Georgia: 'georgia.ttf',
};

/** post.underlinePosition/Thickness e head.unitsPerEm (TTF ou 1ª fonte da TTC) */
function metrics(file) {
  const b = readFileSync(`C:/Windows/Fonts/${file}`);
  let off = 0;
  if (b.toString('latin1', 0, 4) === 'ttcf') off = b.readUInt32BE(12);
  const n = b.readUInt16BE(off + 4);
  const tab = {};
  for (let i = 0; i < n; i++) {
    const r = off + 12 + i * 16;
    tab[b.toString('latin1', r, r + 4)] = b.readUInt32BE(r + 8);
  }
  const upm = b.readUInt16BE(tab.head + 18);
  return { upm, pos: -b.readInt16BE(tab.post + 8), thick: b.readInt16BE(tab.post + 10), strikeSize: b.readInt16BE(tab['OS/2'] + 26), strikePos: b.readInt16BE(tab['OS/2'] + 28) };
}

const PX = 0.12;
const rows = [];
for (const [name, pages] of Object.entries(data)) {
  const [fontTag, style] = name.split('__');
  const m = metrics(FILES[fontTag]);
  const objs = pages.flatMap((pg, pi) => pg.objs.map((o) => ({ ...o, page: pi })));
  const lines = pages.flatMap((pg, pi) => pg.lines.map((l) => ({ ...l, page: pi })));
  lines.forEach((ln, i) => {
    const size = SIZES[i];
    const mine = objs.filter((o) => o.page === ln.page && o.t === 'path' && o.segs[0][2] > ln.y - 1 && o.segs[0][2] < ln.y + size * 0.5);
    const px = (v) => Math.round((v - ln.y) / PX);
    const row = { font: fontTag, style, size, upm: m.upm, pos: m.pos, thick: m.thick,
      Pexact: +(m.pos / m.upm * size / PX).toFixed(2), Texact: +(m.thick / m.upm * size / PX).toFixed(2) };
    if (style === 'wave' || style === 'wavyDouble' || style === 'wavyHeavy') {
      const bands = [];
      for (const o of mine) {
        // só as meias-ondas regulares (fim de cada cúbica, passo de 1,2 pt): o começo
        // recortado e os pedaços curtos ficam de fora
        const ends = [];
        for (let k = 1; k + 2 < o.segs.length; k += 3) ends.push(o.segs[k + 2]);
        const ys = ends.filter((e, j) => j > 0 && Math.abs(e[1] - ends[j - 1][1] - 1.2) < 0.01).map((e) => e[2]);
        if (ys.length < 4) continue;
        const b = [px(Math.min(...ys)), px(Math.max(...ys))];
        if (!bands.some((x) => x[0] === b[0] && x[1] === b[1])) bands.push(b);
      }
      bands.sort((a, b) => a[0] - b[0]);
      row.bands = bands.slice(0, 2).map((b) => b.join('..')).join(' ');
      row.w = mine[0]?.w;
    } else {
      const rects = [];
      for (const o of mine) {
        const ys = o.segs.map((s) => s[2]);
        const b = [px(Math.min(...ys)), px(Math.max(...ys))];
        if (!rects.some((x) => x[0] === b[0] && x[1] === b[1])) rects.push(b);
      }
      rects.sort((a, b) => a[0] - b[0]);
      row.bands = rects.map((b) => `${b[0]}+${b[1] - b[0]}`).join(' ');
    }
    rows.push(row);
  });
}
const cols = ['font', 'style', 'size', 'Pexact', 'Texact', 'bands', 'w'];
const lines = [cols.join('\t'), ...rows.map((r) => cols.map((c) => r[c] ?? '').join('\t'))];
if (csvIdx > 0) writeFileSync(process.argv[csvIdx + 1], lines.join('\n') + '\n');
else console.log(lines.join('\n'));
