// Mínimos de letras do Word, iguais em pt-BR, en e es: 2 antes do hífen; depois, 3 no
// modo 15 ("ci-dade", "sa-pato" — "cida-de" não) e 2 nos ≤ 14 ("ci-da-de"). Uma linha
// por (palavra, posição j): "<id>" + 8 espaços (vão sempre ≥ 421) + palavra, com o
// espaço depois dos brancos entre o que o ponto j precisa e o que o ponto j+1
// precisaria — o Word escolhe o maior ponto ≤ j.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';
import { withHyphenation, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const GAP = ' '.repeat(8);

function probes(words, lang, compat) {
  let body = '';
  let id = 10;
  const need = (ch, j) => (compat >= 15 ? W(ch.slice(0, j).join('') + '-') : Math.max(W(ch.slice(0, j).join('') + '-'), W(ch.slice(0, j + 1).join(''))));
  for (const w of words) {
    const ch = [...w];
    for (let j = 2; j < ch.length - 1; j++) {
      const lo = need(ch, j), hi = Math.min(need(ch, j + 1), W(w));
      if (hi - lo < 4) continue;
      const A = Math.round(W(String(id) + GAP) + (lo + hi) / 2);
      body += p(r(String(id++) + GAP) + r(w, `<w:lang w:val="${lang}"/>`), `<w:spacing w:after="40"/><w:ind w:left="0" w:right="${NARROW_TEXTW - A}"/>`);
    }
  }
  return withHyphenation(buildDocx({ body, sect: NARROW_SECT, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }), { zone: 1 });
}

const PT = ['cidade', 'sapato', 'abacate', 'carro', 'chave', 'filho', 'ninho', 'guerra', 'pássaro', 'exceção', 'psicologia', 'advogado', 'probabilidade', 'organização'];
const EN = ['contradictory', 'exceptionally', 'unconditional', 'participation', 'technological'];
const ES = ['preparándose', 'divinamente', 'observadora', 'administrador', 'declaraciones'];
export const cases = [
  { name: 'hm-pt15', docx: probes(PT, 'pt-BR', 15) },
  { name: 'hm-pt14', docx: probes(PT, 'pt-BR', 14) },
  { name: 'hm-en15', docx: probes(EN, 'en-US', 15) },
  { name: 'hm-en14', docx: probes(EN, 'en-US', 14) },
  { name: 'hm-es15', docx: probes(ES, 'es-ES', 15) },
  { name: 'hm-es14', docx: probes(ES, 'es-ES', 14) },
];
