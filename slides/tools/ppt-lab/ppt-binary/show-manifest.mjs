// Mostra transição/intervalo (e opcionalmente efeitos) do manifesto COM de um
// deck, lado a lado .pptx × .ppt — o que o PowerPoint lê de cada formato.
//
// Uso: node tools/ppt-lab/ppt-binary/show-manifest.mjs <deck> [--effects]
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const deck = process.argv[2];
const withFx = process.argv.includes('--effects');
const base = join(here, '..', 'results', 'ppt-binary', deck);
const load = (fmt) => {
  const p = join(base, fmt, 'manifest.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '').replace(/:\s*-?Infinity/g, ': null')) : undefined;
};
const a = load('pptx'), b = load('ppt');
if (process.argv.includes('--count')) {
  // nº de efeitos da sequência principal por slide (o que o PowerPoint lê de cada formato)
  for (const [fmt, m] of [['pptx', a], ['ppt', b]]) console.log(fmt, m ? m.slides.map((s) => s.effects.length).join(',') : '-');
  process.exit(0);
}
const n = Math.max(a?.slides.length ?? 0, b?.slides.length ?? 0);
const tr = (s) => s ? `${s.transition.effectName}(${s.transition.effect}) dur=${s.transition.duration} spd=${s.transition.speed} click=${s.transition.advanceOnClick} time=${s.transition.advanceOnTime}:${s.transition.advanceTime}${s.hidden ? ' HIDDEN' : ''}` : '-';
for (let i = 0; i < n; i++) {
  const sa = a?.slides[i], sb = b?.slides[i];
  console.log(`${i + 1}: pptx ${tr(sa)}\n   ppt  ${tr(sb)}`);
  if (withFx && sb) for (const e of sb.effects) console.log(`     fx ${e.typeName} exit=${e.exit} trig=${e.triggerName} dur=${e.duration} delay=${e.delay} shape=${e.shapeId} ${e.displayName ?? ''}`);
}
