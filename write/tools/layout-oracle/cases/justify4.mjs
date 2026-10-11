// Varredura do limiar de compressão: n espaços × largura da palavra final.
// Linha: "aaa"×(n) separadas por espaço + palavra final "m"×k; recuo direito
// varrido em passos de 2 twips cobrindo 0..45% de compressão.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
export const sweep = [];
for (const n of [2, 4, 8, 16]) for (const k of [1, 2, 4, 8]) sweep.push({ font: 'Arial', size: 11, n, k });
export function lineOf({ n, k }) {
  // palavras de preenchimento "nnnnnnnn" com largura fixa
  const fill = Array.from({ length: n }, () => 'n'.repeat(Math.max(1, Math.floor(32 / n)))).join(' ');
  return { head: fill, next: 'm'.repeat(k) };
}
export const cases = [];
for (const cfg of sweep) {
  const face = prov.face(cfg.font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * cfg.size * 20) / u, 0);
  const { head, next } = lineOf(cfg);
  const first = `${head} ${next}`;
  const nat = W(first), sp = W(' ');
  // recuo à esquerda grande para a linha caber na largura (o texto é curto)
  const indL = Math.max(0, Math.round(TEXT_W - nat - 400));
  const avail0 = TEXT_W - indL;
  let body = '';
  const steps = Math.ceil((0.45 * cfg.n * sp + 0.6 * W(next)) / 2) + 4;
  for (let s = 0; s <= steps; s++) {
    const indR = Math.round(avail0 - nat + 0.02 * cfg.n * sp) + s * 2 - 4;
    body += p(r(`${first} segunda linha continua`, sz(cfg.size)), `<w:jc w:val="both"/><w:ind w:left="${indL}" w:right="${Math.max(0, indR)}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `sw-${cfg.n}-${cfg.k}`, docx: buildDocx({ body, defaults: docDefaults({ font: cfg.font, size: 11 }) }) });
}
