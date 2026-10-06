/**
 * Transição de slide (SSSlideInfoAtom) → `<p:transition>`.
 *
 * Tipos/direções e a escala de velocidade foram conferidos contra o manifesto
 * COM do PowerPoint lendo o .ppt e o .pptx gêmeo (corpus
 * pb-transicoes-classicas): velocidade 0 = lenta, 1 = média, 2 = rápida;
 * persianas 0 = vertical, 1 = horizontal; direções de cobrir/revelar/empurrar
 * 0..7 = l, u, r, d, lu, ru, ld, rd. Transições 2010+ chegam no .ppt já como
 * "esmaecer suave" (23) — o próprio PowerPoint as converte ao salvar.
 */
import type { PptTransition } from './ppt-reader.js';
import { el } from './xmlw.js';

const DIR8 = ['l', 'u', 'r', 'd', 'lu', 'ru', 'ld', 'rd'];

export function transitionXml(t: PptTransition | undefined): string {
  if (!t) return '';
  const d = t.effectDirection;
  let fx = '';
  switch (t.effectType) {
    case 0: fx = el('p:cut', { thruBlk: d === 1 || undefined }); break;
    case 1: fx = '<p:random/>'; break;
    case 2: fx = el('p:blinds', { dir: d === 0 ? 'vert' : undefined }); break;
    case 3: fx = el('p:checker', { dir: d === 1 ? 'vert' : undefined }); break;
    case 4: fx = el('p:cover', { dir: d === 0 ? undefined : DIR8[d] }); break;
    case 5: fx = '<p:dissolve/>'; break;
    case 6: fx = '<p:fade thruBlk="1"/>'; break;
    case 7: fx = el('p:pull', { dir: d === 0 ? undefined : DIR8[d] }); break;
    case 8: fx = el('p:randomBar', { dir: d === 1 ? 'vert' : undefined }); break;
    case 9: fx = el('p:strips', { dir: DIR8[d] && d >= 4 ? DIR8[d] : undefined }); break;
    case 10: fx = el('p:wipe', { dir: d === 0 ? undefined : DIR8[d] }); break;
    case 11: fx = el('p:zoom', { dir: d === 1 ? 'in' : undefined }); break;
    case 13: fx = el('p:split', { orient: d >= 2 ? 'vert' : undefined, dir: d === 1 || d === 3 ? 'in' : undefined }); break;
    case 17: fx = '<p:diamond/>'; break;
    case 18: fx = '<p:plus/>'; break;
    case 19: fx = '<p:wedge/>'; break;
    case 20: fx = el('p:push', { dir: d === 0 ? undefined : DIR8[d] }); break;
    case 21: fx = el('p:comb', { dir: d === 1 ? 'vert' : undefined }); break;
    case 22: fx = '<p:newsflash/>'; break;
    case 23: fx = '<p:fade/>'; break;
    case 26: fx = el('p:wheel', { spokes: d && d !== 4 ? d : undefined }); break;
    case 27: fx = '<p:circle/>'; break;
    default: fx = '';
  }
  const a = {
    spd: t.speed === 0 ? 'slow' : t.speed === 1 ? 'med' : undefined,
    advClick: t.manualAdvance ? undefined : 0,
    advTm: t.autoAdvance ? Math.max(0, t.slideTime) : undefined,
  };
  if (!fx && a.advTm === undefined && a.advClick === undefined) return '';
  return el('p:transition', a, fx);
}
