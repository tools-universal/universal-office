// EMF: BITBLT SEM bitmap de origem (só padrão e destino) por cima de um bloco já pintado,
// com o pincel padrão (branco) ou o preto de estoque. Medido no PDF do Word: só PATCOPY,
// BLACKNESS e WHITENESS pintam — os três com a cor do pincel atual (BLACKNESS com pincel branco
// sai branco); D puro, PATINVERT, DSTINVERT e NOTPATCOPY deixam o bloco intacto. (Corpus t15:
// logotipo coberto por um BITBLT D puro no fim do EMF.) A verificação é visual; aqui no teste
// vale o texto, e o drawing.test.ts confere os retângulos. Rótulos inventados.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';
import { emf, pic } from './emfrop.mjs';

const SRCCOPY = 0x00cc0020, GREEN = [40, 160, 40];
/** SELECTOBJECT do pincel de estoque `stock` logo antes do último registro BITBLT */
function withBrush(b, stock) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = -1;
  for (let pos = 0; pos < b.length; pos += dv.getUint32(pos + 4, true)) if (dv.getUint32(pos, true) === 76) at = pos;
  const sel = new Uint8Array(12), sv = new DataView(sel.buffer);
  sv.setUint32(0, 37, true); sv.setUint32(4, 12, true); sv.setUint32(8, (0x80000000 | stock) >>> 0, true);
  const out = new Uint8Array(b.length + 12);
  out.set(b.subarray(0, at)); out.set(sel, at); out.set(b.subarray(at), at + 12);
  const hv = new DataView(out.buffer);
  hv.setUint32(48, out.length, true); hv.setUint32(52, hv.getUint32(52, true) + 1, true);
  return out;
}
/** bloco verde (SRCCOPY) + BITBLT sem origem com `rop` (e o pincel de estoque `stock`) */
export const emfOf = (rop, stock) => { const e = emf([[SRCCOPY, GREEN], [rop, null]]); return stock === undefined ? e : withBrush(e, stock); };
const doc = (rop, stock) => {
  const d = buildDocx({ body: p(r('Antes Hxg')) + p(pic(1)), defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'image1.emf': emfOf(rop, stock) } });
  const files = unzipSync(d);
  files['[Content_Types].xml'] = strToU8(strFromU8(files['[Content_Types].xml']).replace('<Default Extension="png"', '<Default Extension="emf" ContentType="image/x-emf"/><Default Extension="png"'));
  return zipSync(files);
};
export const cases = [
  { name: 'ep-dnop', docx: doc(0x00aa0029) },
  { name: 'ep-patcopy', docx: doc(0x00f00021) },
  { name: 'ep-patinvert', docx: doc(0x005a0049) },
  { name: 'ep-dstinvert', docx: doc(0x00550009) },
  { name: 'ep-white', docx: doc(0x00ff0062) },
  { name: 'ep-black', docx: doc(0x00000042) },
  { name: 'ep-notpat', docx: doc(0x000f0001) },
  // pincel preto de estoque (BLACK_BRUSH = 4)
  { name: 'ep-patcopy-pp', docx: doc(0x00f00021, 4) },
  { name: 'ep-black-pp', docx: doc(0x00000042, 4) },
  { name: 'ep-white-pp', docx: doc(0x00ff0062, 4) },
  { name: 'ep-notpat-pp', docx: doc(0x000f0001, 4) },
  { name: 'ep-dnop-pp', docx: doc(0x00aa0029, 4) },
];
