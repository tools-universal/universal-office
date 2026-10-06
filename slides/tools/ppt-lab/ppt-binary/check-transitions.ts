// Confere as transições convertidas (SSSlideInfoAtom → <p:transition>) contra
// (1) o .pptx gêmeo — ramo Fallback do mc:AlternateContent, que é o que o
//     PowerPoint grava para leitores sem p14/p15 (transições 2010+ → fade) — e
// (2) o manifesto COM do PowerPoint lendo o .ppt (efeito, duração, intervalo).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/check-transitions.ts [deck…]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseXml, childElements, firstChild, type XmlElement } from '../../../packages/slides-core/src/xml.js';
import { convertPptToPptx } from '../../../packages/slides-core/src/ppt/index.js';

const lab = process.env['LAB_DIR']!;
const slidesRoot = join(lab, '..', '..', '..');
let decks = process.argv.slice(2);
if (!decks.length) decks = readdirSync(join(slidesRoot, 'samples', 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => f.slice(0, -4));

/** Transição normalizada: "efeito[attrs] spd advTm advClick". */
function norm(sld: XmlElement): string {
  let tr = firstChild(sld, 'p:transition');
  for (const ac of childElements(sld, 'mc:AlternateContent')) {
    const fb = firstChild(ac, 'mc:Fallback');
    const t = fb ? firstChild(fb, 'p:transition') : undefined;
    if (t) tr = t;
  }
  if (!tr) return 'none';
  const fx = childElements(tr).find((c) => !c.name.endsWith('sndAc') && c.name !== 'p:extLst');
  const DEF: Record<string, Record<string, string>> = {
    'p:push': { dir: 'l' }, 'p:wipe': { dir: 'l' }, 'p:cover': { dir: 'l' }, 'p:pull': { dir: 'l' },
    'p:split': { orient: 'horz', dir: 'out' }, 'p:blinds': { dir: 'horz' }, 'p:checker': { dir: 'horz' },
    'p:comb': { dir: 'horz' }, 'p:randomBar': { dir: 'vert' }, 'p:strips': { dir: 'lu' }, 'p:zoom': { dir: 'out' },
    'p:wheel': { spokes: '4' }, 'p:cut': { thruBlk: '0' }, 'p:fade': { thruBlk: '0' },
  };
  const attrs = fx ? Object.entries({ ...(DEF[fx.name] ?? {}), ...fx.attrs }).map(([k, v]) => `${k}=${v === 'true' ? '1' : v === 'false' ? '0' : v}`).sort().join(',') : '';
  return `${fx?.name ?? '-'}[${attrs}] spd=${tr.attrs['spd'] ?? 'fast'} advTm=${tr.attrs['advTm'] ?? '-'} advClick=${tr.attrs['advClick'] ?? '1'}`;
}

function slidesOf(zip: Uint8Array): XmlElement[] {
  const parts = unzipSync(zip);
  const out: XmlElement[] = [];
  for (let i = 1; parts[`ppt/slides/slide${i}.xml`]; i++) out.push(parseXml(strFromU8(parts[`ppt/slides/slide${i}.xml`]!)));
  return out;
}

let bad = 0, total = 0;
for (const deck of decks) {
  const ppt = join(slidesRoot, 'samples', 'playback', `${deck}.ppt`);
  const twin = [join(slidesRoot, 'samples', 'playback', `${deck}.pptx`), join(slidesRoot, 'samples', `${deck}.pptx`)].find(existsSync);
  const conv = slidesOf(convertPptToPptx(new Uint8Array(readFileSync(ppt))));
  const tw = twin ? slidesOf(new Uint8Array(readFileSync(twin))) : [];
  const manPath = join(lab, '..', 'results', 'ppt-binary', deck, 'ppt', 'manifest.json');
  // manifestos antigos trazem `Infinity` (duração indefinida) — inválido em JSON
  const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8').replace(/^﻿/, '').replace(/:\s*-?Infinity/g, ': null')) : undefined;
  conv.forEach((s, i) => {
    total++;
    const a = norm(s), b = tw[i] ? norm(tw[i]!) : '?';
    const m = man?.slides[i]?.transition;
    // COM: duração 0,5/0,75/1 s ↔ fast/med/slow; advanceTime em segundos
    const comSpd = m ? (m.duration >= 1 ? 'slow' : m.duration >= 0.75 ? 'med' : 'fast') : undefined;
    const comAdv = m ? (m.advanceOnTime ? String(Math.round(m.advanceTime * 1000)) : '-') : undefined;
    const hiddenOk = m ? (s.attrs['show'] === '0') === !!man.slides[i].hidden : true;
    const okTwin = a === b;
    const okCom = !m || (a.includes(`spd=${comSpd}`) && a.includes(`advTm=${comAdv}`) && hiddenOk);
    if (!okTwin || !okCom) {
      bad++;
      console.log(`${deck} #${i + 1}\n  nosso: ${a}\n  gêmeo: ${b}\n  COM:   ${m ? `${m.effectName} spd=${comSpd} advTm=${comAdv} click=${m.advanceOnClick} hidden=${man.slides[i].hidden}` : '-'}`);
    }
  });
}
console.log(`transições: ${total - bad}/${total} conferem (gêmeo Fallback + COM)`);
