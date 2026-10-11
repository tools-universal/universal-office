// Largura de LAYOUT (a que decide a quebra): palavra única maior que a linha,
// recuo direito escolhido para a área útil A ficar em ceil(W)−1 e ceil(W) twips,
// onde W = largura linear (avanços hmtx × tamanho NOMINAL) dos n primeiros
// caracteres. O Word põe os n caracteres na 1ª linha sse W ≤ A — sem hinting,
// sem a grade de 600 dpi (essas só aparecem nas posições do PDF).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const MIX = 'Loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididunt'.repeat(4);
const STRS = { a: 'a'.repeat(300), i: 'i'.repeat(500), m: 'm'.repeat(200), mix: MIX };
export const cases = [];
for (const fam of ['Arial', 'Calibri', 'Times New Roman']) {
  const f = prov.face(fam, false, false)?.font;
  if (!f) continue;
  const lin = (ch, size) => (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * size * 20) / f.metrics.unitsPerEm;
  let body = '';
  for (const size of [9, 10, 11, 12]) for (const s of Object.values(STRS)) {
    let w = 0, n = 0;
    while (n < s.length && w + lin(s[n], size) <= TEXTW - 400) { w += lin(s[n], size); n++; }
    for (const A of [Math.ceil(w - 1e-6) - 1, Math.ceil(w - 1e-6)]) {
      body += p(r(s.slice(0, n + 6), sz(size)), `<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  cases.push({ name: `fit-${fam.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: 11 }) }) });
}
