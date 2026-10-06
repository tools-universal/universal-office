// Diagnóstico POR EFEITO: média da divergência (alinhada e estrita) nos
// quadros em que cada efeito está ativo — aponta quais presets/filtros mais
// divergem do PowerPoint. Usa compare.json + ours-timeline.json do deck.
//
// Uso: node tools/ppt-lab/playback/diag-effects.mjs <deck> [ext=pptx] [top=20]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [deck, ext = 'pptx', topArg = '20'] = process.argv.slice(2);
if (!deck) { console.error('uso: diag-effects.mjs <deck> [ext] [top]'); process.exit(1); }
const dir = join(here, '..', 'results', 'playback', deck, ext);
const cmp = JSON.parse(readFileSync(join(dir, 'compare.json'), 'utf8'));
const tl = JSON.parse(readFileSync(join(dir, 'ours-timeline.json'), 'utf8'));
const man = JSON.parse(readFileSync(join(dir, 'ppt-manifest.json'), 'utf8').replace(/^﻿/, '').replace(/:\s*-?(Infinity|NaN)\b/g, ': null'));
const step = cmp.stepMs;
const rows = [];
for (const s of tl.slides) {
  const mslide = man.slides[s.index];
  s.effects.forEach((e, i) => {
    const t0 = s.animStartMs + e.t0;
    const dur = e.durMs ?? 0;
    const k0 = Math.floor(t0 / step), k1 = Math.max(k0 + 1, Math.ceil((t0 + Math.max(dur, step)) / step));
    let sa = 0, ss = 0, n = 0;
    for (let k = k0; k < k1 && k < cmp.series.aligned.length; k++) { sa += cmp.series.aligned[k]; ss += cmp.series.strict[k]; n++; }
    const mfx = mslide?.effects?.[i];
    rows.push({
      slide: s.index + 1, i: i + 1, name: mfx ? `${mfx.typeName.replace('msoAnimEffect', '')}${mfx.exit ? '(saída)' : ''}` : '?',
      preset: `${e.presetClass}:${e.presetId}/${e.presetSubtype}`, filter: e.filter ?? '', t0: (t0 / 1000).toFixed(2), dur,
      aligned: n ? sa / n : 0, strict: n ? ss / n : 0, k0, k1,
    });
  });
}
rows.sort((a, b) => b.aligned - a.aligned);
const top = Number(topArg);
console.log(`${deck}.${ext}: ${rows.length} efeitos — piores por divergência alinhada média durante o efeito`);
for (const r of rows.slice(0, top)) {
  console.log(`  s${String(r.slide).padStart(2)} #${String(r.i).padStart(2)} ${r.name.padEnd(22)} ${r.preset.padEnd(12)} ${r.filter.padEnd(22)} t=${r.t0}s dur=${r.dur}ms  alinhada ${r.aligned.toFixed(1)}%  estrita ${r.strict.toFixed(1)}%  quadros ${r.k0}-${r.k1}`);
}
