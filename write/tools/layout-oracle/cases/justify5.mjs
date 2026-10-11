// Limiar de compressão para palavras CURTAS (o 2º limite, que não depende dos
// espaços): muitos espaços (n=16) e a palavra final variando letra a letra.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
export const sweep = [];
for (const font of ['Arial', 'Verdana']) {
  for (const next of ['i', 'e', 'm', 'W', 'ii', 'ee', 'mm', 'iiii', 'de', 'em', 'mi', 'im', 'ei', 'ie']) sweep.push({ font, size: 11, n: 16, next });
}
export function lineOf({ n }) {
  return Array.from({ length: n }, () => 'nn').join(' ');
}
export const cases = [];
sweep.forEach((cfg, ci) => {
  const face = prov.face(cfg.font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * cfg.size * 20) / u, 0);
  const first = `${lineOf(cfg)} ${cfg.next}`;
  const nat = W(first), sp = W(' ');
  const indL = Math.max(0, Math.round(TEXT_W - nat - 400));
  const avail0 = TEXT_W - indL;
  let body = '';
  const steps = Math.ceil((1.05 * W(cfg.next)) / 2) + 4;
  for (let s = 0; s <= steps; s++) {
    const indR = Math.round(avail0 - nat) + s * 2 - 4;
    body += p(r(`${first} segunda linha continua`, sz(cfg.size)), `<w:jc w:val="both"/><w:ind w:left="${indL}" w:right="${Math.max(0, indR)}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `sh-${ci}`, docx: buildDocx({ body, defaults: docDefaults({ font: cfg.font, size: 11 }) }) });
});
