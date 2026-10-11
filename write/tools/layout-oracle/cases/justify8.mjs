// characterSpacingControl=compressPunctuation (documentos de origem asiática):
// muda a medição/compressão da justificação de texto latino?
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2; // twips
export const cases = [];
const VARIANTS = [
  ['c11cp', 11, 'compressPunctuation'],
  ['c15cp', 15, 'compressPunctuation'],
  ['c14cp', 14, 'compressPunctuation'],
];
const configs = [['Arial', 11, 6, 'mmmm'], ['Times New Roman', 11, 12, 'mmmm']];
for (const [vname, compat, cs] of VARIANTS) for (const [font, size, words, w] of configs) {
  const face = prov.face(font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * size * 20) / u, 0);
  const first = Array.from({ length: words - 1 }, () => w).join(' ') + ' FIM';
  const nat = W(first);
  const spaces = words - 1;
  const sp = W(' ');
  // janela: de 2% de excesso a 40% de compressão, em passos de 4 twips
  const lo = TEXT_W - nat - 0.02 * spaces * sp;           // recuo pequeno → cabe sem comprimir
  const steps = Math.ceil((0.42 * spaces * sp) / 4);
  let body = '';
  const meta = [];
  for (let k = 0; k <= steps; k++) {
    const ind = Math.max(0, Math.round(lo + k * 4));
    meta.push(ind);
    body += p(r(`${first} segunda linha que continua`, sz(size)), `<w:jc w:val="both"/><w:ind w:right="${ind}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `${vname}-thr-${font.toLowerCase().replace(/\s+/g, '-')}-${size}-${words}-${w.length}${w[0]}`, docx: buildDocx({ body, compat, charSpacing: cs, defaults: docDefaults({ font, size: 11 }) }) });
}
