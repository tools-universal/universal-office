// Negrito SINTÉTICO (fonte sem face negrita instalada: Calibri Light, Segoe UI
// Light): a largura de layout muda? Limiar de quebra (como fitwidth) com a área
// útil em ceil(W)−k … ceil(W)+k twips, W = largura linear do texto regular.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
export const cases = [];
for (const fam of ['Calibri Light', 'Segoe UI Light']) {
  const f = prov.face(fam, false, false)?.font;
  if (!f) continue;
  const lin = (ch, size) => (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * size * 20) / f.metrics.unitsPerEm;
  let body = '';
  for (const size of [10, 11, 12]) for (const s of ['a'.repeat(300), 'Mixedtextwithoutspacesfortheboldsyntheticwidthtest'.repeat(6)]) {
    let w = 0, n = 0;
    while (n < s.length && w + lin(s[n], size) <= TEXTW - 600) { w += lin(s[n], size); n++; }
    // n glifos × 1/2048 em: o limiar cai entre +7 e +10 twips
    for (const d of [5, 7, 8, 9, 10, 11, 12]) {
      const A = Math.ceil(w) + d;
      body += p(r(s.slice(0, n + 6), '<w:b/>' + sz(size)), `<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  cases.push({ name: `sb-${fam.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: 11 }) }) });
}
