// Largura que o Word usa para cada glifo (sub-twip): uma "palavra" de n cópias do glifo num
// parágrafo cuja largura útil (recuo direito) varre ±6 twips em torno de n × avanço nominal,
// de 1 em 1 twip — o 1º parágrafo em que ela cabe inteira na linha dá n × avanço do Word com
// erro < 1 twip (< 1/n twip por glifo). Fontes e corpos dos sumários do corpus. Laboratório
// de medição (as larguras saem do texto da 1ª linha); conteúdo inventado.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';
import { readFileSync, existsSync } from 'node:fs';

const FONTS = [['cal11', 'Calibri', 11, 'C:/Windows/Fonts/calibri.ttf'], ['ari11', 'Arial', 11, 'C:/Windows/Fonts/arial.ttf'], ['tnr12', 'Times New Roman', 12, 'C:/Windows/Fonts/times.ttf']];
const GLYPHS = 'aeimnorstuACDEMOR0123456789.';
/** avanço nominal (twips) lido do hmtx da fonte instalada (só leitura; nada é copiado) */
function advances(path, sizePt) {
  const b = readFileSync(path); const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = dv.getUint16(4); const tab = {};
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tab[String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])] = dv.getUint32(o + 8); }
  const upm = dv.getUint16(tab.head + 18); const nH = dv.getUint16(tab.hhea + 34);
  // cmap formato 4 (3,1)
  const cm = tab.cmap; const nt = dv.getUint16(cm + 2); let sub = 0;
  for (let i = 0; i < nt; i++) { const pid = dv.getUint16(cm + 4 + i * 8), eid = dv.getUint16(cm + 6 + i * 8); if (pid === 3 && eid === 1) sub = cm + dv.getUint32(cm + 8 + i * 8); }
  const seg = dv.getUint16(sub + 6) / 2; const ends = sub + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
  const gid = (c) => { for (let s = 0; s < seg; s++) { if (c <= dv.getUint16(ends + s * 2)) { const st = dv.getUint16(starts + s * 2); if (c < st) return 0; const ro = dv.getUint16(ranges + s * 2); if (!ro) return (c + dv.getInt16(deltas + s * 2)) & 0xffff; const g = dv.getUint16(ranges + s * 2 + ro + (c - st) * 2); return g ? (g + dv.getInt16(deltas + s * 2)) & 0xffff : 0; } } return 0; };
  const adv = (g) => dv.getUint16(tab.hmtx + Math.min(g, nH - 1) * 4);
  return (ch) => (adv(gid(ch.charCodeAt(0))) * sizePt * 20) / upm;
}
export const cases = [];
for (const [name, f, size, path] of FONTS) {
  if (!existsSync(path)) continue;
  const advOf = advances(path, size);
  const rp = font(f) + sz(size);
  let body = '';
  for (const ch of GLYPHS) {
    const a = advOf(ch);
    const n = Math.floor(7600 / a);
    const W = n * a;
    for (let d = -6; d <= 6; d++) {
      const A = Math.round(W) + d;
      body += p(r(ch.repeat(n), rp), `<w:spacing w:after="0"/><w:ind w:right="${8504 - A}"/>`);
    }
  }
  cases.push({ name: `gw-${name}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size }) }) });
}
