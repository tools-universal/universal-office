// uso: node show.mjs <docx> [--all-styles]
// estilos novos/alterados em relacao ao blank.docx + paragrafos (pPr/rPr/texto)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require('fflate');
const f = process.argv[2];
const z = unzipSync(readFileSync(f));
const blank = strFromU8(unzipSync(readFileSync(join(dirname(f), 'blank.docx')))['word/styles.xml']);
const sty = strFromU8(z['word/styles.xml']);
const map = (s) => new Map([...s.matchAll(/<w:style [^>]*w:styleId="([^"]*)"[^>]*>[\s\S]*?<\/w:style>/g)].map((m) => [m[1], m[0]]));
const strip = (x) => x.replace(/<w:rsid w:val="[^"]*"\/>/g, '');
const a = map(blank), b = map(sty);
console.log('== estilos');
for (const [id, x] of b) {
  if (!a.has(id)) console.log('NOVO', strip(x));
  else if (strip(a.get(id)) !== strip(x)) console.log('MUDOU', strip(x), '\n  ERA', strip(a.get(id)));
}
for (const id of a.keys()) if (!b.has(id)) console.log('SUMIU', id);
const dd = (s) => s.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0];
if (dd(blank) !== dd(sty)) console.log('DOCDEFAULTS', dd(sty));
const lat = (s) => s.match(/<w:latentStyles[\s\S]*?<\/w:latentStyles>/)?.[0];
if (lat(blank) !== lat(sty)) {
  const la = new Set(lat(blank).match(/<w:lsdException [^>]*\/>/g)), lb = lat(sty).match(/<w:lsdException [^>]*\/>/g);
  for (const x of lb) if (!la.has(x)) console.log('LATENT', x);
}
console.log('== paragrafos');
const doc = strFromU8(z['word/document.xml']);
for (const p of doc.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
  const x = p[0];
  const ppr = x.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? '';
  const runs = [...x.matchAll(/<w:r(?: [^>]*)?>(?:<w:rPr>([\s\S]*?)<\/w:rPr>)?[\s\S]*?<w:t(?: [^>]*)?>([^<]*)<\/w:t><\/w:r>/g)].map((r) => `[${r[2]}]${r[1] ? ' {' + r[1] + '}' : ''}`);
  console.log('P', ppr.replace(/<w:rPr>[\s\S]*<\/w:rPr>/, (m) => ' markRPr' + m.slice(7, -8)), '\n   ', runs.join('\n    '));
}
