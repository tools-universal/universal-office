// Palavra = trecho de LETRAS: dígitos, apóstrofo, hífen da palavra, barra, sublinhado e
// pontuação separam trechos hifenizados cada um com os seus mínimos
// ("res-pon2sa-bi-li-dade", "d'ad-mi-nis-tra-ção", "guarda-res-pon-sa-bi-li-dade",
// "www.res-pon-sa-bi-li-dade.com"); pontuação colada não muda os pontos.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';
import { withHyphenation, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
// "<id>" + 8 espaços (vão sempre ≥ 421) + palavra; espaço entre o que o ponto j precisa
// e o que o j+1 precisaria
const GAP = ' '.repeat(8);
const WORDS = ['responsabilidade123', '123responsabilidade', 'respon2sabilidade', 'd\'administração', 'd’administração', 'guarda-responsabilidade',
  'responsabilidade-administração', 'responsabilidade,', '(responsabilidade)', '“responsabilidade”', 'www.responsabilidade.com',
  'responsabilidade/administração', 'responsabilidade_administração'];
let body = '';
let id = 10;
for (const w of WORDS) {
  const ch = [...w];
  for (let j = 2; j < ch.length - 1; j++) {
    const lo = W(ch.slice(0, j).join('') + '-'), hi = Math.min(W(ch.slice(0, j + 1).join('') + '-'), W(w));
    if (hi - lo < 4) continue;
    const A = Math.round(W(String(id) + GAP) + (lo + hi) / 2);
    body += p(r(`${id++}${GAP}${w}`), `<w:spacing w:after="40"/><w:ind w:left="0" w:right="${NARROW_TEXTW - A}"/>`);
  }
}
export const cases = [
  { name: 'hx-mix', docx: withHyphenation(buildDocx({ body, sect: NARROW_SECT, defaults: docDefaults({ font: 'Arial', size: 11 }) }), { zone: 1 }) },
];
